import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoader,src,fakeGL,turns,microtasks,declarationText,evaluateDeclaration} from './support/core-solar-program-modules.mjs';

// Held page-ledger waits of program demands (a ProgramPreparationBudgetWait
// whose onAvailable wake the owner holds):
// - createSolarShadowPreparationBudget: a demand answered by a held wait gives
//   the visit's one compile slot back, so the next demand still gets its
//   attempt; the visit still starts at most one compile. delegated500's own
//   capture loops (their real declarations, evaluated in a scope over the real
//   owner) stay safe: every visit either asks for a frame or leaves a held wake.
// - the program owner: a cancel that withdraws a held wake requests one frame
//   once the call returns, so a still map re-judges and holds a new wake;
//   dispose and context loss request none, and drop the frame an earlier cancel
//   of the same turn queued, while a later withdrawal still queues its own.
// Real owner, page ledger, store and scheduler on a fake context.
const load=createLoader();
const programPath=src('safety','render-runtime','program-preparation.ts');
const core=load(programPath),solar=load(src('safety','solar-shadow-preparation.ts'));
const {createResourceBudget}=load(src('safety','render-runtime','resource-budget.ts'));
const {createChunkResourceStore,bindChunkResourceContext}=load(src('safety','render-runtime','chunk-resource-store.ts'));
const {createProgramPreparationOwner,isProgramPreparationPending,isProgramPreparationBudgetWait,ProgramPreparationPending,ProgramPreparationBudgetWait,ProgramPreparationFailure}=core;
const delegatedRenderer=src('painted','delegated500','safety','building-mesh-renderer.ts');

function fixture(limitBytes=4096){
 const budget=createResourceBudget({limitBytes,recentLimitBytes:0}),store=createChunkResourceStore({budget}),{gl,linked}=fakeGL();bindChunkResourceContext(gl,store);
 return{budget,store,gl,linked,block:free=>budget.reserve({category:'construction',bytes:budget.stats.availableBytes-free,precision:'exact',label:'fixture ledger pressure'})};
}
// A recipe's claim is its source bound plus a 128 B linked-program allowance.
const recipe=(resource,bytes=256)=>({resource,priority:'capture',inputs:['input:'+resource],budget:{sourceBytesUpperBound:bytes,submittedAllowanceBytes:128},build:()=>({vertex:'vertex '+resource,fragment:'fragment '+resource,attributes:['a_position']})});
const pending=fn=>assert.throws(fn,error=>isProgramPreparationPending(error)&&!isProgramPreparationBudgetWait(error));

test('a held ledger wait gives the visit its one compile slot back; ready, ordinary pending, unheld waits and failures keep it',()=>{
 const outcomes={
  ready:()=>'program',
  pending:()=>{throw new ProgramPreparationPending();},
  cancelled:()=>{throw new ProgramPreparationPending('cancelled');},
  unheld:()=>{throw new ProgramPreparationBudgetWait(undefined,false);},
  failed:()=>{throw new ProgramPreparationFailure({source:'test',resource:'failed',epoch:0,status:'failed',phase:'link-status',reason:'fixture failure'});},
 };
 for(const [name,work]of Object.entries(outcomes)){
  const events=[],budget=solar.createSolarShadowPreparationBudget(event=>events.push(event.result));let runs=0;
  // Two held waits first: neither takes the slot.
  for(const key of ['held-a','held-b'])assert.throws(()=>budget.compile(key,'1',()=>{runs++;throw new ProgramPreparationBudgetWait(undefined,true);}),isProgramPreparationBudgetWait);
  try{const result=budget.compile(name,'1',()=>{runs++;return work();});assert.deepEqual(result,{status:'ready',value:'program'},name);}catch(error){assert.notEqual(name,'ready',String(error));}
  assert.deepEqual(budget.compile('after-'+name,'1',()=>{runs++;return 'second';}),{status:'pending'},name+' keeps the slot: the visit starts no second compile');
  assert.equal(runs,3,name);
  assert.deepEqual(events.slice(0,4),['started','pending','started','pending'],'held waits are still observed as pending demands');
 }
});

test('the slot reset reads the wait structurally, so a provider double that only exports isProgramPreparationPending still loads and behaves the same',()=>{
 class DoublePending extends Error{constructor(waiting){super('double pending');this.status='pending';this.waiting=waiting;}}
 const doubled=createLoader(new Map([[programPath,{isProgramPreparationPending:error=>error instanceof DoublePending}]]))(src('safety','solar-shadow-preparation.ts'));
 const budget=doubled.createSolarShadowPreparationBudget();let runs=0;
 assert.throws(()=>budget.compile('held','1',()=>{runs++;throw new DoublePending(true);}),DoublePending);
 assert.throws(()=>budget.compile('plain','1',()=>{runs++;throw new DoublePending(undefined);}),DoublePending);
 assert.deepEqual(budget.compile('third','1',()=>{runs++;return 1;}),{status:'pending'});assert.equal(runs,2);
});

test('with the real owner, a refused key no longer holds the visit: the next key starts its compile in the same visit, and the visit starts one compile',()=>{
 const t=turns(),f=fixture(),owner=createProgramPreparationOwner('held slot fixture',()=>{});
 try{
  // 1000 B free: a 384 B recipe fits, a 3128 B one is refused.
  const blocker=f.block(1000),sizes={big:3000,'small-a':256,'small-b':256},budget=solar.createSolarShadowPreparationBudget();
  let budgetWaiting=0,pendingCount=0;
  const outcomes=Object.keys(sizes).map(key=>{
   const before=owner.budgetWaits;
   try{return budget.compile(key,'1',()=>owner.compile(f.gl,recipe(key,sizes[key]))).status==='pending'?(pendingCount++,'slot-blocked'):'ready';}
   catch(error){assert.ok(isProgramPreparationPending(error),String(error));pendingCount++;if(owner.needsFrameAfter(before)===false){budgetWaiting++;return 'held';}return 'started';}
  });
  assert.deepEqual(outcomes,['held','started','slot-blocked']);
  assert.equal(owner.waitingForBudget,true,'the refused key holds its wake');
  assert.equal(owner.stats.budget.budgetedRecipes,1,'exactly one recipe was admitted and queued in this visit');assert.equal(t.queue.length>0,true);
  const result=solar.solarShadowPreparation(0,pendingCount,0,budgetWaiting);
  assert.equal(solar.solarShadowPreparationNeedsFrame(result),true,'the started compile and the blocked key still ask for a frame');
  blocker.release();assert.equal(owner.waitingForBudget,false);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

// delegated500 counts a key the visit slot blocked as budget waiting once a held
// wait was seen in that visit. After the reset only a non-held start can take
// the slot, so a blocked key waits behind ready or started work, not behind the
// wake; these cases pin what that rule still guarantees.
function delegatedScope(f,owner,keys,sizes){
 const state={
  createSolarShadowPreparationBudget:solar.createSolarShadowPreparationBudget,solarShadowPreparation:solar.solarShadowPreparation,isProgramPreparationPending,
  pruneProgramPreparation(){},solarCaptureToken:'core-held-wait',currentFamilyPrograms:false,legacySolarPartitions:true,paintMode:()=>2,destroyed:false,pageHidden:false,enabled:true,sceneIndexCount:()=>3,opacityContext:'default',opacity:1,needsBirth:false,birth:new Set(),
  gl:f.gl,gpuReady:()=>true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[.5,.5]},baseSurfaceFragment:'helper',surfaceFragment:'helper',diffuseFragment:'diffuse',solarDepthHelper:'helper',releaseSolarDepth(){},berlinCurrent:false,
  prepareFamilyCasters(){throw Error('the family caster path is not under test');},compileGeometryProgram(){throw Error('the whole-city program is not under test');},
  trimSolarCasterState:()=>keys,partitionPrograms:new Map(),casterFailures:new Map(),programPreparation:owner,BERLIN_FULL_CURRENT_CAPTURE_KEY:'berlin-full-current',
  compilePartitionProgram:(helper,key)=>owner.compile(f.gl,recipe(key,sizes[key])),materialRecipeRevision:1,solarDepthRevision:0,
  // reflection
  selectPhysicalReflection:()=>({plan:keys.map(program=>({program})),triangles:3*keys.length,draws:keys.length}),activeCaptureProgramKeys:()=>new Set(),retireCapturePrograms(){},reflectionDemandKeys:new Set(),reflectionDemandPlanned:false,reflectionCaptureToken:'core-held-wait',geometryUploadPending:false,
  reflectionKeyProgram:key=>state.partitionPrograms.get(key),reflectionProgramFailures:new Map(),reflectionResidentRevision:0,repaints:0,map:{triggerRepaint(){state.repaints++;}},prepareChunkMasks:()=>({ready:true}),sceneChunks:[],residentCaptureAdapter:()=>({snapshot:()=>({status:'active',bindingsReady:()=>true})}),
 };
 state.prepareSolarPrograms=evaluateDeclaration(declarationText(delegatedRenderer,'prepareSolarPrograms'),state);
 state.preparePlanarReflection=evaluateDeclaration(declarationText(delegatedRenderer,'preparePlanarReflection'),state);
 return state;
}
const visits={
 solar:S=>S.prepareSolarPrograms(),
 // The renderer requests its own frame when pending exceeds budgetWaiting.
 reflection:S=>{const repaints=S.repaints,result=S.preparePlanarReflection({gl:S.gl});return{...result,rendererFrame:S.repaints>repaints};},
};
for(const [kind,visit]of Object.entries(visits))for(const slot of ['started','ready'])test(`delegated500 ${kind}: behind a held wait, a slot taken by ${slot==='started'?'a started compile':'an already linked program'} leaves the visit with a frame or a held wake, and the capture completes after the release`,t0=>{
 const t=turns(),f=fixture();let frames=0;
 const owner=createProgramPreparationOwner('delegated500 held wait fixture',()=>{frames++;}),sizes={big:3000,'small-a':256,'small-b':256},S=delegatedScope(f,owner,Object.keys(sizes),sizes);
 try{
  if(slot==='ready'){pending(()=>owner.compile(f.gl,recipe('small-a',256)));t.all();}
  const blocker=f.block(1000),admitted=owner.stats.budget.budgetedRecipes;frames=0;
  const result=visit(S),needsFrame=solar.solarShadowPreparationNeedsFrame(result)||result.rendererFrame===true;
  assert.equal(result.status,'pending');assert.equal(owner.waitingForBudget,true,'the big key holds its wake');
  assert.ok(needsFrame||owner.waitingForBudget,'never neither a frame nor a held wake');
  if(slot==='started'){
   assert.equal(owner.stats.budget.budgetedRecipes,admitted+1,'the key after the held one started its compile in the same visit, and only that one');
   assert.equal(result.pending,3);assert.ok((result.budgetWaiting??0)<result.pending,'a started compile is no held wait');assert.equal(needsFrame,true,'a started compile keeps the frame request');
  }else{
   assert.equal(S.partitionPrograms.has('small-a'),true,'the key after the held one took its linked program in the same visit');
   assert.deepEqual([result.ready,result.pending],[1,2]);assert.equal(owner.stats.budget.budgetedRecipes,admitted,'no compile was started in this visit');
  }
  // delegated500 counts a slot-blocked key as budget waiting once it saw a held
  // wait. Behind a linked program that key then waits for the held key's wake
  // instead of the next frame: later, never lost (the loop below).
  t0.diagnostic(`${kind}/${slot}: budgetWaiting ${result.budgetWaiting??0} of ${result.pending} pending; frame requested: ${needsFrame}`);
  blocker.release();assert.equal(owner.waitingForBudget,false);assert.ok(frames>0,'the wake repaints');
  // A still map: a visit runs only for a requested frame or a repaint.
  let last=result;
  for(let n=0;last.status!=='ready';n++){
   assert.ok(n<24,'the capture settles: '+JSON.stringify(last));
   t.all();const asked=frames>0||solar.solarShadowPreparationNeedsFrame(last)||last.rendererFrame===true;frames=0;
   assert.ok(asked||owner.waitingForBudget,'a pending capture is never left without a frame or a held wake');
   if(!asked)break;last=visit(S);
  }
  assert.equal(last.status,'ready');assert.deepEqual([...S.partitionPrograms.keys()].sort(),['big','small-a','small-b']);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

// A still map: a frame runs only when one was requested; the provider asks for
// one itself only when the owner's needsFrameAfter says so.
function stillMap(f,source='still map'){
 const map={requested:0,status:'idle',program:undefined};
 const owner=createProgramPreparationOwner(source,()=>{map.requested++;});
 map.owner=owner;
 map.frame=(r=recipe('still'),context=f.gl)=>{map.requested=0;const before=owner.budgetWaits;try{map.program=owner.compile(context,r);map.status='ready';}catch(error){if(!isProgramPreparationPending(error))throw error;map.status='preparing';if(owner.needsFrameAfter(before))map.requested++;}};
 return map;
}

test('a cancel that withdraws a held wake requests one frame once it returns: the still map re-judges, holds a new wake and reaches ready after the release',async()=>{
 const t=turns(),f=fixture(),map=stillMap(f),{owner}=map;
 try{
  const blocker=f.block(100);
  map.frame();assert.equal(map.status,'preparing');assert.equal(owner.waitingForBudget,true);assert.equal(map.requested,0,'a held wait needs no polling frame');
  owner.cancel();
  assert.equal(owner.waitingForBudget,false);assert.equal(f.budget.stats.availabilityListeners,0,'the wake is withdrawn');
  assert.equal(map.requested,0,'the retry is requested after the withdrawing call returns');
  await microtasks();assert.equal(map.requested,1,'one retry frame instead of the withdrawn wake');
  map.frame();assert.equal(map.status,'preparing');assert.equal(owner.waitingForBudget,true,'the retry holds a new wake');assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(map.requested,0);
  await microtasks();assert.equal(map.requested,0,'nothing polls while the new wake is held');
  blocker.release();assert.equal(map.requested,1,'the new wake repaints');
  for(let n=0;map.status!=='ready';n++){assert.ok(n<8,'the demand settles');t.all();assert.ok(map.requested>0,'never preparing without a frame request');map.frame();}
  assert.equal(map.status,'ready');assert.equal(f.linked.length,1);
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

test('dispose and context loss withdraw a held wake without a retry frame',async()=>{
 for(const way of ['dispose','contextLost']){
  const t=turns(),f=fixture(),map=stillMap(f,way),{owner}=map;
  try{
   const blocker=f.block(100);map.frame();assert.equal(owner.waitingForBudget,true,way);
   owner[way]();assert.equal(owner.waitingForBudget,false,way);assert.equal(f.budget.stats.availabilityListeners,0,way);
   await microtasks();assert.equal(map.requested,0,way+' requests no frame');
   blocker.release();assert.equal(map.requested,0,way+': the withdrawn wake never repaints');
  }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
 }
});

test('the retry frame is skipped without a withdrawn wake, after a same-turn retry that holds a new wake, and is requested once for several cancels',async()=>{
 const t=turns(),f=fixture(),map=stillMap(f),{owner}=map;
 try{
  owner.cancel();await microtasks();assert.equal(map.requested,0,'no held wake: nothing to retry');
  const blocker=f.block(100);
  map.frame();owner.cancel();map.frame();assert.equal(owner.waitingForBudget,true,'a retry in the same turn holds a new wake');
  await microtasks();assert.equal(map.requested,0,'the new wake repaints; the retry frame is not needed');
  owner.cancel();map.frame();owner.cancel();await microtasks();assert.equal(map.requested,1,'two withdrawals in one turn: one retry frame');
  blocker.release();assert.equal(map.requested,1,'the withdrawn wakes never repaint');
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

test('a rebind to another context that withdraws a held wake also leaves one retry frame',async()=>{
 const t=turns(),f=fixture(),map=stillMap(f),{owner}=map,other=fakeGL().gl;bindChunkResourceContext(other,f.store);
 try{
  const blocker=f.block(100);map.frame();assert.equal(owner.waitingForBudget,true);
  // The owner's next demand arrives on another context: binding it cancels the old one.
  assert.equal(owner.work(other,{resource:'rebind',revision:1,current:()=>true,work(){}}),false);
  assert.equal(owner.waitingForBudget,false,'the rebind withdrew the wake');assert.equal(map.requested,0);
  await microtasks();assert.equal(map.requested,1,'one retry frame');
  blocker.release();assert.equal(map.requested,1,'the withdrawn wake never repaints');
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});

test('context loss or dispose after a cancel in the same turn drops its retry frame; a withdrawal after the context loss still leaves its own',async()=>{
 for(const way of ['contextLost','dispose']){
  const t=turns(),f=fixture(),map=stillMap(f,'cancel then '+way),{owner}=map;
  try{
   const blocker=f.block(100);map.frame();assert.equal(owner.waitingForBudget,true,way);
   owner.cancel();owner[way]();
   await microtasks();assert.equal(map.requested,0,'cancel then '+way+': no retry frame after the '+way);
   blocker.release();assert.equal(map.requested,0,way+': the withdrawn wake never repaints');
  }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
 }
 const t=turns(),f=fixture(),map=stillMap(f,'withdrawal after a context loss'),{owner}=map,restored=fakeGL().gl;bindChunkResourceContext(restored,f.store);
 try{
  const blocker=f.block(100);map.frame();owner.cancel();owner.contextLost();
  // The provider's next context: its first demand holds a new wake, which a
  // lifecycle cancel of the same turn withdraws again.
  map.frame(recipe('still'),restored);assert.equal(map.status,'preparing');assert.equal(owner.waitingForBudget,true,'the demand on the new context holds a wake');
  owner.cancel();
  await microtasks();assert.equal(map.requested,1,'that withdrawal leaves exactly one retry frame');
  blocker.release();assert.equal(map.requested,1,'the withdrawn wakes never repaint');
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});
