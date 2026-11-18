import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCaptureChain,captureTimers,createLedger,programPreparer,depthRecipe} from './support/capture-chain-gl.mjs';

// Wave 3 capture chain, item 1 (renderer-delegated500 review I1; solar-reflection-
// wait CDR 3): both planar reflection group merges carry each provider's held
// ledger waits (budgetWaiting) and pass them to solarShadowPreparation, so a
// production-shaped tree (outer dedicated+painted group -> required painted
// provider group -> providers) still reads as held-only when every pending demand
// is a held wait. The solar layer and the reflection core then request no frame;
// the program owner's wake repaints exactly once and the next visit retries once.
// A required provider not yet created, or any ordinary pending, still needs the
// caller's frames. Every chain case has a single demand per visit that reaches the
// visit's one compile slot (or one already compiling), so it holds whether or not
// a held wait spends that slot (ROOT R2, core-solar-program).
const m=await loadCaptureChain();
const prep=(ready,pending,failed=0,budgetWaiting)=>({status:failed?'failed':pending?'pending':'ready',ready,pending,failed,...(budgetWaiting===undefined?{}:{budgetWaiting})});
const scripted=(id,result,plan={plannedTriangles:0,plannedDraws:0})=>({getPlanarReflectionRevision:()=>id,prepareSolarShadow:()=>result(),preparePlanarReflection:()=>({...result(),...plan}),renderPlanarReflection:()=>({triangles:0,draws:0,complete:true})});
const pass={gl:{},mainMatrix:new Float64Array(16),clipPlaneWorldZ:0,maxTriangles:40000,maxDraws:48};

test('both merges add each provider\'s held waits through nested groups; ordinary pending or a missing required provider still needs a frame',()=>{
 let extra;
 const a=scripted('a',()=>prep(0,2,0,2)),b=scripted('b',()=>prep(1,0)),c=scripted('c',()=>prep(0,1,0,1));
 const painted=m.planarReflectionGroup(()=>[a,b,extra],{labels:['root500','city','bremen']}),outer=m.planarReflectionGroup(()=>[c,painted],{labels:['dedicated','painted']});
 for(const run of [()=>outer.prepareSolarShadow(),()=>outer.preparePlanarReflection(pass)]){
  extra=undefined;const held=run();
  assert.equal(held.status,'pending');assert.equal(held.ready,1);assert.equal(held.pending,3);assert.equal(held.budgetWaiting,3,'held waits survive both group levels');
  assert.equal(m.solarShadowPreparationHeldWait(held),true);assert.equal(m.solarShadowPreparationNeedsFrame(held),false);
  // Beside a held wait, one ordinary pending keeps the caller's frames.
  extra=scripted('ordinary',()=>prep(0,1));const mixed=run();
  assert.equal(mixed.pending,4);assert.equal(mixed.budgetWaiting,3);assert.equal(m.solarShadowPreparationNeedsFrame(mixed),true);assert.equal(m.solarShadowPreparationHeldWait(mixed),false);
 }
 // A required provider that does not exist yet has no wake: plain pending only.
 const required=m.planarReflectionGroup(()=>[a,undefined],{labels:['root500','delegated500'],requireAll:true}),top=m.planarReflectionGroup(()=>[undefined,required]);
 for(const result of [top.prepareSolarShadow(),top.preparePlanarReflection(pass)]){assert.equal(result.pending,3);assert.equal(result.budgetWaiting,2);assert.equal(m.solarShadowPreparationNeedsFrame(result),true);}
 // Without any held wait the result keeps its previous shape exactly.
 assert.deepEqual(m.planarReflectionGroup(()=>[b,scripted('o',()=>prep(0,1))]).prepareSolarShadow(),{status:'pending',ready:1,pending:1,failed:0});
});

test('a provider\'s held waits never cover another provider\'s pending; invalid counts are ignored',()=>{
 for(const claimed of [5,1.5,-1,'2',Number.NaN]){
  const odd=scripted('odd',()=>({status:'pending',ready:0,pending:1,failed:0,budgetWaiting:claimed})),ordinary=scripted('ordinary',()=>prep(0,1));
  const group=m.planarReflectionGroup(()=>[odd,ordinary]);
  for(const result of [group.prepareSolarShadow(),group.preparePlanarReflection(pass)]){
   assert.equal(result.pending,2,String(claimed));assert.equal(result.budgetWaiting??0,claimed===5?1:0,String(claimed));
   assert.equal(m.solarShadowPreparationNeedsFrame(result),true,String(claimed)+': the ordinary pending still asks for frames');
  }
 }
 // Planned reflection costs and the dedicated reservation are unchanged.
 const planned=m.planarReflectionGroup(()=>[scripted('p',()=>prep(0,1,0,1),{plannedTriangles:900,plannedDraws:7})]).preparePlanarReflection(pass);
 assert.deepEqual(planned,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1,plannedTriangles:900,plannedDraws:7});
});

const ORDER=['root500','delegated500','tier300','church','city','bremen','infill'];
const coverage={bounds:[.537,.328,0,.5371,.3281,.00001],triangles:30,draws:2,complete:true};
const initial={instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:false,quality:'balanced'};
// Leaves: providers with their own program owners (held or compiling demands)
// or ready ones; each draws its coverage exactly. The required painted group
// sits under the main.ts outer group with a dedicated source.
function providerTree(gl,owners,{missing}={}){
 const leaves=new Map(),visits={prepare:0,reflectionPrepare:0,renders:0};
 const leaf=(id,programs)=>({getPlanarReflectionRevision:()=>'resident/'+id,getSolarShadowRevision:()=>'solar/'+id,getSolarShadowCoverage:()=>coverage,setCaptureDemand(){},setPlanarReflectionProjection(){},setPlanarReflectionState(){},
  prepareSolarShadow(budget){visits.prepare++;return programs?programs.prepare(budget):m.solarShadowPreparation(1,0,0);},
  preparePlanarReflection(_pass,budget){visits.reflectionPrepare++;return{...(programs?programs.prepare(budget):m.solarShadowPreparation(1,0,0)),plannedTriangles:coverage.triangles,plannedDraws:coverage.draws};},
  renderPlanarReflection(p){visits.renders++;return{triangles:Math.min(coverage.triangles,p.maxTriangles),draws:Math.min(coverage.draws,p.maxDraws),complete:p.maxTriangles>=coverage.triangles&&p.maxDraws>=coverage.draws};}});
 const programs=new Map();
 for(const id of ORDER){const owner=owners[id];if(owner){programs.set(id,programPreparer(m,gl,owner,['depth:'+id]));}if(id!==missing)leaves.set(id,leaf(id,programs.get(id)));}
 const dedicated={getPlanarReflectionRevision:()=>'dedicated',getSolarShadowCoverage:()=>coverage,getPlanarReflectionCost:()=>({triangles:coverage.triangles,draws:coverage.draws}),renderPlanarReflection:p=>({triangles:Math.min(coverage.triangles,p.maxTriangles),draws:Math.min(coverage.draws,p.maxDraws),complete:true})};
 const painted=m.planarReflectionGroup(()=>ORDER.map(id=>leaves.get(id)),{labels:ORDER,requireAll:true});
 const outer=m.planarReflectionGroup(()=>[dedicated,painted],{labels:['dedicated','painted']});
 return{outer,painted,leaves,programs,visits,addMissing(){leaves.set(missing,leaf(missing));},release(){for(const p of programs.values())p.release();}};
}

function solarChain(options){
 const ledger=createLedger(m),{budget,store,gl}=ledger,layers=new Map(),events=new Map();let repaints=0;
 const map={isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer(layer){layers.set(layer.id,layer);layer.onAdd?.();},removeLayer(id){const layer=layers.get(id);layers.delete(id);layer?.onRemove?.();},
  on(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},off(name,fn){events.get(name)?.delete(fn);},triggerRepaint(){repaints++;}};
 const owners=Object.fromEntries((options.owned??['root500']).map(id=>[id,m.createProgramPreparationOwner('capture-chain '+id,()=>map.triggerRepaint())]));
 const tree=providerTree(gl,owners,options),light=m.sceneSolarLight(13.4,52.5,initial.instantISO);
 const solar=m.installSceneSolarShadowLayer({map,source:tree.outer,initial,solarLight:()=>light,available:()=>true});
 return{...ledger,owners,tree,solar,get repaints(){return repaints;},get core(){return solar.stats.core;},
  // One map frame: the capture layer's prerender, then the existing 'render' collector.
  frame(){const layer=layers.get('scene-solar-shadow-capture');assert.ok(layer,'the capture layer is installed');layer.prerender(gl);store.collectRetired();},
  dispose(){solar.destroy();tree.release();for(const owner of Object.values(owners))owner.dispose();store.collectRetired();store.destroy();}};
}

test('production-shaped solar chain: two groups and the solar layer request no frame for a held-only wait; the owner wake repaints once and the next frame retries once',()=>{
 const timers=captureTimers(),f=solarChain({owned:['root500']});
 try{
  const blocker=f.block();f.solar.setMode(true);const base=f.repaints,owner=f.owners.root500;
  f.frame();
  assert.equal(owner.waitingForBudget,true,'the root500 program owner holds the wake');
  assert.equal(f.repaints,base,'the layer requests no frame for a held-only wait');
  assert.deepEqual(f.core.preparation,{status:'pending',ready:6,pending:1,failed:0,budgetWaiting:1},'the held wait reaches the solar core through both groups');
  assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,true);
  const listeners=f.budget.stats.availabilityListeners,visits=f.tree.visits.prepare;
  for(let i=0;i<5;i++)f.frame();
  assert.equal(f.repaints,base,'no frame during the whole wait');assert.equal(f.tree.visits.prepare,visits+5*ORDER.length,'frames drawn by others retry cheaply');
  assert.equal(f.budget.stats.availabilityListeners,listeners,'one held wake, not one per frame');assert.equal(timers.queue.length,0,'no timer');
  assert.equal(f.core.published,false);assert.equal(f.tree.visits.renders,0);
  blocker.release();
  assert.equal(f.repaints,base+1,'the owner wake repaints exactly once');assert.equal(owner.waitingForBudget,false);
  const compiles=f.tree.programs.get('root500').compiles;f.frame();
  assert.equal(f.tree.programs.get('root500').compiles,compiles+1,'that frame retries the compile once');
  assert.equal(f.core.preparationWaitingForBudget,false);assert.equal(f.repaints,base+2,'the admitted, scheduled compile is ordinary pending and keeps its frames');
  for(let n=0;f.core.status!=='ready';n++){assert.ok(n<8,'the capture settles');timers.all();f.frame();}
  assert.equal(f.core.published,true);assert.equal(f.core.captureResult.complete,true);
  const settled=f.repaints;for(let i=0;i<3;i++)f.frame();assert.equal(f.repaints,settled,'a settled capture is static');
 }finally{f.dispose();timers.all();timers.restore();}
});

test('solar chain: a held wait beside a compiling demand of another provider still requests every frame',()=>{
 const timers=captureTimers(),f=solarChain({owned:['root500','city']});
 try{
  // city's depth program is admitted and compiling before the ledger is blocked;
  // root500 then waits on a held wake. Whether city's visit reaches its owner or
  // the visit's compile slot defers it, it is ordinary pending.
  assert.throws(()=>f.owners.city.compile(f.gl,depthRecipe('depth:city')),error=>m.isProgramPreparationPending(error));
  const blocker=f.block();f.solar.setMode(true);let repaints=f.repaints;
  for(let i=0;i<4;i++){f.frame();assert.equal(f.repaints,repaints+1,'each pending frame requests the next one');repaints=f.repaints;}
  assert.deepEqual(f.core.preparation,{status:'pending',ready:5,pending:2,failed:0,budgetWaiting:1});
  assert.equal(f.core.preparationWaitingForBudget,false);
  blocker.release();
 }finally{f.dispose();timers.all();timers.restore();}
});

test('solar chain: a required painted provider not yet created keeps per-frame retries beside a held wait',()=>{
 const timers=captureTimers(),f=solarChain({owned:['root500'],missing:'bremen'});
 try{
  const blocker=f.block();f.solar.setMode(true);let repaints=f.repaints;
  for(let i=0;i<3;i++){f.frame();assert.equal(f.repaints,repaints+1,'no wake exists for a provider that does not exist');repaints=f.repaints;}
  assert.deepEqual(f.core.preparation,{status:'pending',ready:5,pending:2,failed:0,budgetWaiting:1});
  f.tree.addMissing();f.frame();
  assert.deepEqual(f.core.preparation,{status:'pending',ready:6,pending:1,failed:0,budgetWaiting:1});assert.equal(f.repaints,repaints,'once it exists, the held-only wait sleeps');
  blocker.release();assert.equal(f.repaints,repaints+1);
 }finally{f.dispose();timers.all();timers.restore();}
});

test('reflection chain: two groups feed the reflection core a held-only wait; neither needsFrame nor the shared clock polls until the owner wake',()=>{
 const timers=captureTimers(),{budget,store,gl,block}=createLedger(m);let time=1000,repaints=0;
 const owner=m.createProgramPreparationOwner('capture-chain reflection root500',()=>{repaints++;}),tree=providerTree(gl,{root500:owner});
 const r=m.createPlanarBuildingReflection({now:()=>time,requestRepaint:()=>{repaints++;}}),identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const args={mainMatrix:identity,viewportWidth:1280,viewportHeight:800,planeWorldZ:.02/25000000,quality:'balanced',appearanceKey:'sun/1'};
 try{
  r.setSource(tree.outer);const blocker=block();
  for(let i=1;i<=4;i++){assert.equal(r.capture(gl,args),undefined);time+=100;}
  assert.equal(tree.visits.reflectionPrepare,4*ORDER.length);
  assert.equal(r.needsFrame,false,'no caller frame for a held wait through both groups');assert.equal(r.frame(time+1e9),false,'and no shared-clock refresh');assert.equal(repaints,0);
  assert.equal(r.stats.mode,'preparing');assert.equal(r.stats.waitingForPreparationBudget,true);assert.equal(r.stats.preparationBudgetWaits,4);
  blocker.release();assert.equal(repaints,1,'the owner wake repaints exactly once');
  const compiles=tree.programs.get('root500').compiles;assert.equal(r.capture(gl,args),undefined);
  assert.equal(tree.programs.get('root500').compiles,compiles+1,'the woken frame retries once');
  assert.equal(r.stats.waitingForPreparationBudget,false);assert.equal(r.needsFrame,true,'an ordinary pending compile keeps the frame clock');
  timers.all();const shown=r.capture(gl,args);assert.ok(shown?.texture);assert.equal(r.stats.mode,'captured');assert.equal(r.needsFrame,false);
  assert.equal(tree.visits.renders,ORDER.length,'one capture drew every provider once');
 }finally{r.destroy();tree.release();owner.dispose();timers.all();timers.restore();store.collectRetired();store.destroy();}
 assert.equal(budget.stats.bytes,0);
});

// Review F1: the merge passes each provider's budgetWaiting on, so it is only as
// right as the providers' counts. After R2 a held wait gives the visit's compile
// slot back; a key the slot skipped (because a later key took it, e.g. with a
// READY) was never attempted and is ordinary pending. A provider counting as
// below keeps the solar layer's frames until every key has had its attempt.
test('R2 slot convention through both groups and the solar layer: a key the visit slot skipped after a READY stays ordinary pending and gets its frame',()=>{
 const timers=captureTimers(),{budget,store,gl}=createLedger(m),layers=new Map();let repaints=0;
 const map={isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer(layer){layers.set(layer.id,layer);},removeLayer(id){layers.delete(id);},on(){},off(){},triggerRepaint(){repaints++;}};
 const owner=m.createProgramPreparationOwner('capture-chain r2 slot',()=>map.triggerRepaint());
 const recipe=(key,sourceBytes)=>({...depthRecipe('depth:'+key),budget:{sourceBytesUpperBound:sourceBytes,submittedAllowanceBytes:128}});
 const recipes={k1:recipe('k1',65536),k2:recipe('k2',512),k3:recipe('k3',512)},attempts={k1:0,k2:0,k3:0},programs=new Map();
 const provider={getPlanarReflectionRevision:()=>'r2',getSolarShadowRevision:()=>'r2',getSolarShadowCoverage:()=>coverage,setCaptureDemand(){},setPlanarReflectionProjection(){},setPlanarReflectionState(){},
  renderPlanarReflection:p=>({triangles:Math.min(coverage.triangles,p.maxTriangles),draws:Math.min(coverage.draws,p.maxDraws),complete:p.maxTriangles>=coverage.triangles&&p.maxDraws>=coverage.draws}),
  prepareSolarShadow(visit){
   let ready=0,pending=0,waiting=0;
   for(const key of ['k1','k2','k3']){
    if(programs.has(key)){ready++;continue;}
    const before=owner.budgetWaits;
    try{const result=visit.compile('r2:'+key,'r2-epoch',()=>{attempts[key]++;return owner.compile(gl,recipes[key]);});if(result.status==='pending'){pending++;continue;}programs.set(key,result.value);ready++;}
    catch(error){if(!m.isProgramPreparationPending(error))throw error;pending++;if(!owner.needsFrameAfter(before))waiting++;}
   }
   return m.solarShadowPreparation(ready,pending,0,waiting);
  }};
 const painted=m.planarReflectionGroup(()=>[provider],{labels:['delegated500'],requireAll:true}),outer=m.planarReflectionGroup(()=>[undefined,painted],{labels:['dedicated','painted']});
 const light=m.sceneSolarLight(13.4,52.5,initial.instantISO),solar=m.installSceneSolarShadowLayer({map,source:outer,initial,solarLight:()=>light,available:()=>true});
 const frame=()=>{const layer=layers.get('scene-solar-shadow-capture');assert.ok(layer,'the capture layer is installed');layer.prerender(gl);store.collectRetired();return solar.stats.core.preparation;};
 try{
  // Room for k2 and k3, not for k1.
  const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-8192,precision:'exact',label:'capture-chain r2 blocker'});
  solar.setMode(true);let base=repaints;
  // Visit A: k1 waits on the ledger (held; its slot comes back), k2 is admitted and scheduled (slot spent), k3 is skipped.
  assert.deepEqual(frame(),{status:'pending',ready:0,pending:3,failed:0,budgetWaiting:1});assert.equal(owner.waitingForBudget,true);assert.equal(repaints,base+1,'ordinary pending keeps its frame');
  timers.all();base=repaints;
  // Visit B: k1 held again, k2 comes back READY (slot spent), k3 skipped once more.
  assert.deepEqual(frame(),{status:'pending',ready:1,pending:2,failed:0,budgetWaiting:1},'the skipped key is not a held wait');
  assert.equal(repaints,base+1,'so the layer asks for the frame that key needs');assert.equal(attempts.k3,0);
  // Visit C: k3 gets the slot and is admitted.
  base=repaints;frame();assert.equal(attempts.k3,1,'the next visit attempts it');assert.equal(repaints,base+1);
  timers.all();base=repaints;
  // Visit D: only k1's held wait is left: held-only, nothing asks for frames until its wake.
  assert.deepEqual(frame(),{status:'pending',ready:2,pending:1,failed:0,budgetWaiting:1});assert.equal(repaints,base,'a held-only wait asks for no frame');
  for(let i=0;i<3;i++)frame();assert.equal(repaints,base,'frames drawn by others retry without asking for more');
  blocker.release();assert.equal(repaints,base+1,'the owner wake repaints once');
  for(let n=0;solar.stats.core.status!=='ready';n++){assert.ok(n<8,'the capture settles');timers.all();frame();}
  assert.equal(solar.stats.core.published,true);assert.deepEqual(attempts,{k1:attempts.k1,k2:2,k3:2});
 }finally{solar.destroy();for(const program of programs.values())owner.releaseProgram(gl,program);owner.dispose();store.collectRetired();store.destroy();timers.all();timers.restore();}
 assert.equal(budget.stats.bytes,0);
});
