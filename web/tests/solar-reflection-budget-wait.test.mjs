import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createWaitGL,captureTimers} from './support/solar-reflection-wait-gl.mjs';

// F-1: a solar-depth or planar-reflection preparation whose pending demands are
// all page-ledger waits with a held onAvailable wake (budgetWaiting covers
// pending) requests no frame of its own. The program owner's wake repaints once
// and the next frame retries once; mixed pending still retries every frame. The
// shared projected-shadow mask's ledger wake reaches the environment owner's
// frame clock and the map, and an admission nobody will draw is withdrawn.
// Real capture owners, program preparation owner, ledger and store run in one
// module graph on a fake WebGL2 context: no GPU, browser, visual or physical
// memory evidence. Providers follow the ROOT convention for budgetWaiting
// (read owner.budgetWaits before the attempt, then owner.needsFrameAfter).
// Neither capture keeps an undisplayed target while its programs wait; once the
// programs are ready, a target that does not fit waits on the capture's own held
// ledger wake. Mixed cases pair the held wait with a demand already compiling,
// so they hold whether or not a held wait spends the visit's compile slot.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=[
 "export {createSceneSolarShadow} from './scene-solar-shadow';",
 "export {installSceneSolarShadowLayer} from './scene-solar-shadow-layer';",
 "export {sceneSolarLight} from './scene-solar-light';",
 "export {createPlanarBuildingReflection} from './planar-building-reflection';",
 "export {createEnvironmentSceneRenderer} from './environment-scene-renderer';",
 "export {createDedicatedReichstagLayer} from './dedicated-reichstag-mesh';",
 "export {prepareSolarShadowBoundary} from './solar-shadow-admission';",
 "export {solarShadowPreparation} from './solar-shadow-preparation';",
 "export {createProgramPreparationOwner,isProgramPreparationPending} from './render-runtime/program-preparation';",
 "export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('');
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true});
// facade-paint-controls reads location.search once at module evaluation.
const previousLocation=globalThis.location;globalThis.location={search:''};
let m;try{m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));}
finally{if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;}

const MiB=1024*1024,solarSize=512,solarBytes=solarSize*solarSize*4,identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const initial={instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:false,quality:'economy'};
const coverage={bounds:[.537,.328,0,.5371,.3281,.00001],triangles:180,draws:3,complete:true};
const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const sha='5'.repeat(64),reichstagSHA='a'.repeat(64);
m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
m.prepareSolarShadowBoundary({boundarySHA256:reichstagSHA,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
const props={source_boundary_sha256:sha,source_pbf_sha256:'e'.repeat(64),source_snapshot:'fixture',displayClip:false,osmTags:{height:'12'},tree_crown_display_5m_guard:true};
const tree={type:'Feature',id:'osm/node/1',geometry:{type:'Point',coordinates:[13.4,52.5]},properties:{...props,kind:'tree'}};
const water={type:'Feature',id:'osm/way/2',geometry:{type:'Polygon',coordinates:[square(13.4001,52.5001,13.4005,52.5005)]},properties:{...props,kind:'water'}};
const bounds=[13.3,52.4,13.5,52.6];
const recipe=resource=>({resource,priority:'visible',inputs:['input:'+resource],budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128},build:()=>({vertex:'vertex '+resource,fragment:'fragment '+resource,attributes:['a_position']})});

function ledger(limitBytes=16*MiB){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:0}),store=m.createChunkResourceStore({budget}),gl=createWaitGL();
 m.bindChunkResourceContext(gl,store);
 return{budget,store,gl,block:(leave=64)=>budget.reserve({category:'construction',bytes:budget.stats.availableBytes-leave,precision:'exact',label:'fixture blocker'})};
}
// One program per resource through the real owner; the visit budget admits one
// compile per capture-tree visit, exactly like production providers.
function programPreparer(gl,owner,resources){
 const programs=new Map();let compiles=0;
 return{
  get compiles(){return compiles;},
  prepare(budget){
   let ready=0,pending=0,failed=0,waiting=0;
   for(const resource of resources){
    if(programs.has(resource)){ready++;continue;}
    const before=owner.budgetWaits;
    try{const result=budget.compile(resource,'fixture-epoch',()=>{compiles++;return owner.compile(gl,recipe(resource));});if(result.status==='pending'){pending++;continue;}programs.set(resource,result.value);ready++;}
    catch(error){if(!m.isProgramPreparationPending(error))throw error;pending++;if(!owner.needsFrameAfter(before))waiting++;}
   }
   return m.solarShadowPreparation(ready,pending,failed,waiting);
  },
  release(){for(const program of programs.values())owner.releaseProgram(gl,program);programs.clear();},
 };
}

function solarScene({resources=['depth:berlin'],scripted}={}){
 const {budget,store,gl,block}=ledger(),layers=new Map(),events=new Map();let repaints=0,prepares=0,renders=0,coverageReads=0,revision='resident/1';
 const map={isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer(layer){layers.set(layer.id,layer);layer.onAdd?.();},removeLayer(id){const layer=layers.get(id);layers.delete(id);layer?.onRemove?.();},
  on(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},off(name,fn){events.get(name)?.delete(fn);},triggerRepaint(){repaints++;}};
 const owner=m.createProgramPreparationOwner('solar budget wait fixture',()=>map.triggerRepaint()),programs=programPreparer(gl,owner,resources);
 const source={setCaptureDemand(){},getSolarShadowRevision:()=>revision,getPlanarReflectionRevision:()=>revision,getSolarShadowCoverage(){coverageReads++;return coverage;},
  prepareSolarShadow(budget){prepares++;return scripted?scripted():programs.prepare(budget);},
  renderPlanarReflection(pass){renders++;assert.equal(pass.purpose,'solar-depth');assert.equal(pass.maxTriangles,coverage.triangles);assert.equal(pass.maxDraws,coverage.draws);return{triangles:coverage.triangles,draws:coverage.draws,complete:true};}};
 let light=m.sceneSolarLight(13.4,52.5,initial.instantISO);
 const solar=m.installSceneSolarShadowLayer({map,source,initial,solarLight:()=>light,available:()=>true});
 return{budget,store,gl,block,owner,programs,solar,setRevision:v=>{revision=v;},
  setInstant(instantISO){light=m.sceneSolarLight(13.4,52.5,instantISO);solar.setSceneEnvironment({...initial,instantISO});},
  get repaints(){return repaints;},get prepares(){return prepares;},get renders(){return renders;},get coverageReads(){return coverageReads;},get core(){return solar.stats.core;},
  // One map frame: the custom layer's prerender, then the existing 'render' collector.
  frame(){const layer=layers.get('scene-solar-shadow-capture');assert.ok(layer,'the capture layer is installed');layer.prerender(gl);store.collectRetired();},
  dispose(){solar.destroy();programs.release();owner.dispose();store.collectRetired();store.destroy();}};
}

test('solar depth: a held ledger wait requests no frame; the owner wake repaints once and the next frame retries once',()=>{
 const timers=captureTimers(),f=solarScene();
 try{
  const blocker=f.block();f.solar.setMode(true);const base=f.repaints;
  f.frame();
  assert.equal(f.prepares,1);assert.equal(f.owner.waitingForBudget,true,'the program owner holds the wake');
  assert.equal(f.core.status,'preparing','diagnostics still report preparation');
  assert.deepEqual(f.core.coverage,{complete:false,triangles:undefined,draws:undefined,reason:'depth-preparation-pending'});
  assert.equal(f.coverageReads,0,'pending preparation never borrows a resident coverage snapshot');
  assert.deepEqual(f.core.preparation,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
  assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.core.preparationBudgetWaits,1);
  assert.equal(f.repaints,base,'the waiting capture requests no frame');
  // Frames that another owner draws meanwhile retry cheaply: no repaint, no new
  // admission, no second subscription and no timer.
  const listeners=f.budget.stats.availabilityListeners,pressure=f.budget.stats.pressureEvents;
  for(let i=0;i<6;i++)f.frame();
  assert.equal(f.repaints,base,'no frame is requested during the whole wait');assert.equal(f.prepares,7);assert.equal(f.core.preparationBudgetWaits,7);
  assert.equal(f.budget.stats.availabilityListeners,listeners);assert.equal(f.budget.stats.pressureEvents,pressure);assert.equal(timers.queue.length,0);
  assert.equal(f.renders,0);assert.equal(f.coverageReads,0);assert.equal(f.core.allocatedGPUBytes,0);assert.equal(f.core.published,false);
  blocker.release();
  assert.equal(f.repaints,base+1,'the owner wake requests exactly one repaint');assert.equal(f.owner.waitingForBudget,false);
  f.frame();
  assert.equal(f.prepares,8,'that frame retries the preparation once');
  // The retried compile is admitted and scheduled: ordinary pending keeps its frames.
  assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,false);assert.equal(f.repaints,base+2);
  for(let n=0;f.core.status!=='ready';n++){assert.ok(n<8,'the capture settles');timers.all();f.frame();}
  assert.equal(f.core.published,true);assert.equal(f.renders,1);assert.equal(f.core.size,solarSize);assert.equal(f.core.allocatedGPUBytes,solarBytes);
  assert.deepEqual(f.core.coverage,{complete:true,triangles:180,draws:3,reason:undefined},'capture coverage is unchanged');
  assert.equal(f.coverageReads,1,'ready preparation borrows coverage once');
  const settled=f.repaints;for(let i=0;i<3;i++)f.frame();assert.equal(f.repaints,settled);assert.equal(f.renders,1);assert.equal(f.core.cacheHits,3);assert.equal(f.coverageReads,1);
 }finally{f.dispose();timers.all();timers.restore();}
});

test('solar depth: one held wait beside an ordinary pending demand still retries every frame',()=>{
 const timers=captureTimers(),f=solarScene({resources:['depth:a','depth:b']});
 try{
  // depth:b is admitted and compiling before the ledger is blocked; depth:a then
  // waits on a held wake. Whether the visit budget defers depth:b or lets it
  // reach its owner, it is an ordinary pending beside the held wait.
  assert.throws(()=>f.owner.compile(f.gl,recipe('depth:b')),error=>m.isProgramPreparationPending(error));
  const blocker=f.block();f.solar.setMode(true);let repaints=f.repaints;
  for(let i=1;i<=4;i++){f.frame();assert.equal(f.repaints,repaints+1,'each pending frame requests the next one');repaints=f.repaints;assert.equal(f.prepares,i);}
  assert.deepEqual(f.core.preparation,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:1},'one held wait, one ordinary pending');
  assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,false);assert.equal(f.core.preparationBudgetWaits,0);
  blocker.release();
 }finally{f.dispose();timers.all();timers.restore();}
});

for(const change of ['source revision','sun direction'])test(`solar depth (${change}): a held wait returns the unpublished economy target, takes only bounded collection frames, then sleeps`,()=>{
 let waiting=false;const f=solarScene({scripted:()=>waiting?m.solarShadowPreparation(0,1,0,1):m.solarShadowPreparation(1,0,0)});
 try{
  f.solar.setMode(true);f.frame();assert.equal(f.core.status,'ready');assert.equal(f.core.size,solarSize);
  const shadowBytes=()=>f.budget.stats.categories.shadow?.bytes??0;assert.equal(shadowBytes(),solarBytes);
  waiting=true;if(change==='source revision')f.setRevision('resident/2');else f.setInstant('2026-06-21T13:00:00+02:00');const base=f.repaints;
  f.frame();assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.core.published,false);
  // Never hold one part of a capture (its depth target) while waiting for another (its programs).
  assert.equal(f.core.allocatedGPUBytes,0,'the unpublished target is returned while the programs wait');assert.equal(shadowBytes(),0,'its fence was collected at the frame boundary');
  let requested=f.repaints-base;
  for(let i=0;i<40&&f.core.retirementFrames>0;i++){const before=f.repaints;f.frame();requested+=f.repaints-before;}
  assert.ok(requested>0&&requested<=16,'only a bounded number of collection frames: '+requested);assert.equal(f.core.retirementFrames,0);
  const idle=f.repaints;for(let i=0;i<5;i++)f.frame();assert.equal(f.repaints,idle,'then the wait sleeps on the held wake');
  waiting=false;f.frame();assert.equal(f.core.status,'ready');assert.equal(f.core.size,solarSize);assert.equal(f.renders,2);
  assert.equal(shadowBytes(),solarBytes,'exactly one economy target is charged again');
 }finally{f.dispose();}
});
// An ordinary pending preparation (async compile, no held wake) keeps the
// same-size target for its next-frame retry, as before.
test('solar depth: an ordinary pending preparation keeps its same-size target and its per-frame retry',()=>{
 let pending=false;const f=solarScene({scripted:()=>pending?m.solarShadowPreparation(0,1,0):m.solarShadowPreparation(1,0,0)});
 try{
  f.solar.setMode(true);f.frame();assert.equal(f.core.size,solarSize);
  pending=true;f.setRevision('resident/2');let repaints=f.repaints;
  for(let i=0;i<3;i++){f.frame();assert.equal(f.repaints,repaints+1);repaints=f.repaints;}
  assert.equal(f.core.status,'preparing');assert.equal(f.core.allocatedGPUBytes,solarBytes,'the same-size target stays for retry');assert.equal(f.core.preparationWaitingForBudget,false);
  pending=false;f.frame();assert.equal(f.core.status,'ready');assert.equal(f.renders,2);assert.equal(f.core.size,solarSize);
 }finally{f.dispose();}
});

// After the held wait, the programs become ready while the target no longer fits
// (another consumer took the returned bytes): the capture then holds its own
// ledger wake, keeps no target, takes only bounded collection frames and sleeps.
test('solar depth: programs that become ready while the target cannot fit wait on the capture wake, then capture once',()=>{
 const timers=captureTimers(),resources=['depth:1'],f=solarScene({resources});
 try{
  f.solar.setMode(true);f.frame();
  for(let n=0;f.core.status!=='ready';n++){assert.ok(n<8,'the first capture settles');timers.all();f.frame();}
  const shadowBytes=()=>f.budget.stats.categories.shadow?.bytes??0;assert.equal(shadowBytes(),solarBytes);
  // The next revision needs a depth program the blocked ledger cannot admit.
  resources[0]='depth:2';f.setRevision('resident/2');const blocker=f.block();
  f.frame();assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.core.allocatedGPUBytes,0,'the unpublished target is returned');
  assert.equal(shadowBytes(),0,'its fence is collected at that frame boundary');assert.equal(f.owner.waitingForBudget,false,'and the returned bytes wake the program owner');
  f.frame();assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,false,'the woken retry admits the program');
  const squeeze=f.block(64);
  for(let n=0;f.core.status==='preparing';n++){assert.ok(n<8,'the program compiles');timers.all();f.frame();}
  assert.equal(f.core.status,'resource-budget-pending');assert.equal(f.core.allocatedGPUBytes,0,'no target is held while it waits');assert.equal(f.core.published,false);
  const listeners=f.budget.stats.availabilityListeners;
  for(let i=0;i<40&&f.core.retirementFrames>0;i++)f.frame();assert.equal(f.core.retirementFrames,0);
  const idle=f.repaints;for(let i=0;i<5;i++)f.frame();
  assert.equal(f.repaints,idle,'the wait sleeps on its held wake, no polling');assert.equal(f.budget.stats.availabilityListeners,listeners,'one registration, not one per frame');assert.equal(timers.queue.length,0);
  blocker.release();assert.equal(f.repaints,idle+1,'the ledger wake repaints exactly once');
  f.frame();assert.equal(f.core.status,'ready');assert.equal(f.renders,2);assert.equal(shadowBytes(),solarBytes,'exactly one charged economy target');
  squeeze.release();
 }finally{f.dispose();timers.all();timers.restore();}
});

// The held-wait reading lasts until the next visit. A provider that withdraws
// its owner's wake (here an owner cancel) must request one frame: that visit
// re-reads the preparation and holds a new wake, and nothing polls meanwhile.
test('solar depth: after a provider withdraws a held wake, one frame re-reads the preparation and holds a new wake',()=>{
 const timers=captureTimers(),f=solarScene();
 try{
  const blocker=f.block();f.solar.setMode(true);f.frame();
  assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.owner.waitingForBudget,true);
  const listeners=f.budget.stats.availabilityListeners,prepares=f.prepares;
  f.owner.cancel();assert.equal(f.owner.waitingForBudget,false);assert.equal(f.budget.stats.availabilityListeners,listeners-1,'the withdrawn wake is gone');
  const repaints=f.repaints;f.frame();
  assert.equal(f.prepares,prepares+1,'the requested frame retries the preparation');assert.equal(f.owner.waitingForBudget,true,'which registers a new held wake');
  assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.budget.stats.availabilityListeners,listeners);assert.equal(f.repaints,repaints,'and requests no frame of its own');
  blocker.release();assert.equal(f.repaints,repaints+1,'the new wake repaints once');
  for(let n=0;f.core.status!=='ready';n++){assert.ok(n<8,'the capture settles');timers.all();f.frame();}
  assert.equal(f.core.published,true);assert.equal(f.renders,1);
 }finally{f.dispose();timers.all();timers.restore();}
});

function reflectionSource(gl,owner,resources,revision=()=> 'resident/reflection/1'){
 const programs=programPreparer(gl,owner,resources);let prepares=0,renders=0;
 return{programs,get prepares(){return prepares;},get renders(){return renders;},
  getPlanarReflectionRevision:revision,setPlanarReflectionProjection(){},setPlanarReflectionState(){},setCaptureDemand(){},
  preparePlanarReflection(_pass,budget){prepares++;return{...programs.prepare(budget),plannedTriangles:12,plannedDraws:1};},
  renderPlanarReflection(){renders++;return{triangles:12,draws:1,complete:true};}};
}
test('reflection core: a held wait neither needs a frame nor arms the frame clock; mixed pending keeps both',()=>{
 const timers=captureTimers(),{budget,store,gl,block}=ledger();let time=1000,repaints=0;
 const owner=m.createProgramPreparationOwner('reflection budget wait fixture',()=>{repaints++;});
 const single=reflectionSource(gl,owner,['reflection:a']),r=m.createPlanarBuildingReflection({now:()=>time,requestRepaint:()=>{repaints++;}});
 const args={mainMatrix:identity,viewportWidth:1280,viewportHeight:800,planeWorldZ:.02/25000000,quality:'balanced',appearanceKey:'sun/1'};
 try{
  r.setSource(single);const blocker=block();
  for(let i=1;i<=4;i++){assert.equal(r.capture(gl,args),undefined);time+=100;assert.equal(single.prepares,i);}
  assert.equal(r.stats.mode,'preparing');assert.equal(r.stats.pending,true);assert.equal(r.stats.waitingForPreparationBudget,true);assert.equal(r.stats.preparationBudgetWaits,4);
  assert.equal(r.needsFrame,false,'no caller frame for a held wait');assert.equal(r.frame(time+1e9),false,'and no shared-clock refresh');assert.equal(repaints,0);
  blocker.release();assert.equal(repaints,1,'the owner wake repaints exactly once');
  assert.equal(r.capture(gl,args),undefined);assert.equal(single.prepares,5,'the woken frame retries once');
  assert.equal(r.stats.waitingForPreparationBudget,false);assert.equal(r.needsFrame,true,'an ordinary pending compile keeps the frame clock');assert.equal(r.frame(time),true);
  timers.all();const captured=r.capture(gl,args);assert.ok(captured?.texture);assert.equal(single.renders,1);assert.equal(r.stats.mode,'captured');assert.equal(r.needsFrame,false);
  // Mixed: one held wait beside a demand already admitted and compiling.
  const mixed=reflectionSource(gl,owner,['reflection:b','reflection:c']);r.setSource(mixed);
  assert.throws(()=>owner.compile(gl,recipe('reflection:c')),error=>m.isProgramPreparationPending(error));const second=block();
  for(let i=1;i<=3;i++){time+=1000;r.capture(gl,args);assert.equal(r.needsFrame,true);assert.equal(r.frame(time),true);assert.equal(mixed.prepares,i);}
  assert.equal(r.stats.waitingForPreparationBudget,false);second.release();
  single.programs.release();mixed.programs.release();
 }finally{r.destroy();owner.dispose();timers.all();timers.restore();store.collectRetired();store.destroy();}
 assert.equal(budget.stats.bytes,0);
});

// A captured reflection core whose source can change revision and programs.
function reflectionTargetScene(){
 const timers=captureTimers(),{budget,store,gl,block}=ledger();let time=1000,repaints=0,revision='resident/reflection/1';
 const owner=m.createProgramPreparationOwner('reflection target fixture',()=>{repaints++;}),resources=['reflection:1'];
 const source=reflectionSource(gl,owner,resources,()=>revision),r=m.createPlanarBuildingReflection({now:()=>time,requestRepaint:()=>{repaints++;}});
 const args={mainMatrix:identity,viewportWidth:1280,viewportHeight:800,planeWorldZ:.02/25000000,quality:'balanced',appearanceKey:'sun/1'};
 const capture=(extra={})=>{time+=1000;return r.capture(gl,{...args,...extra});};
 r.setSource(source);assert.equal(capture(),undefined,'the first program compiles');timers.all();
 const first=capture();assert.ok(first?.texture);assert.equal(r.stats.mode,'captured');
 return{timers,budget,store,gl,block,owner,resources,source,r,first,capture,get time(){return time;},get repaints(){return repaints;},setRevision(value){revision=value;},
  textureBytes:()=>budget.stats.categories.texture?.bytes??0,
  dispose(){source.programs.release();r.destroy();owner.dispose();timers.all();timers.restore();store.collectRetired();store.destroy();}};
}
test('reflection core: a held wait keeps the target of the snapshot it still displays',()=>{
 const f=reflectionTargetScene();
 try{
  const bytes=f.r.stats.allocatedGPUBytes;assert.ok(bytes>0);assert.equal(f.textureBytes(),bytes);
  // Same source revision, new appearance, and a program the blocked ledger cannot admit.
  f.resources[0]='reflection:1b';const blocker=f.block();
  assert.equal(f.capture({appearanceKey:'sun/2'}),f.first,'the current-revision snapshot stays on screen');
  assert.equal(f.r.stats.waitingForPreparationBudget,true);assert.equal(f.r.needsFrame,false);
  f.store.collectRetired();assert.equal(f.r.stats.allocatedGPUBytes,bytes,'a displayed target is in use, not held for the wait');assert.equal(f.textureBytes(),bytes);
  blocker.release();
 }finally{f.dispose();}
 assert.equal(f.budget.stats.bytes,0);
});
test('reflection core: a held wait returns an undisplayed target; the waiting owner collects it and its wake retries',()=>{
 const f=reflectionTargetScene();
 try{
  const bytes=f.r.stats.allocatedGPUBytes;
  // A new source revision needs a program the blocked ledger cannot admit.
  f.setRevision('resident/reflection/2');f.resources[0]='reflection:2';const blocker=f.block(),base=f.repaints;
  assert.equal(f.capture(),undefined,'the previous revision is not displayed');
  assert.equal(f.r.stats.mode,'preparing');assert.equal(f.r.stats.waitingForPreparationBudget,true);assert.equal(f.owner.waitingForBudget,true);
  // Never hold one part of a capture (its target) while waiting for another (its programs).
  assert.equal(f.r.stats.allocatedGPUBytes,0,'the undisplayed target is returned while its programs wait');
  assert.equal(f.r.needsFrame,false);assert.equal(f.r.frame(f.time+1e9),false);
  assert.ok(f.repaints>base,'the waiting program owner requests the retirement follow-up frame');
  f.store.collectRetired();
  assert.equal(f.textureBytes(),0,'that frame boundary collects its fence');assert.equal(f.owner.waitingForBudget,false,'the returned bytes wake the program owner');
  assert.equal(f.capture(),undefined);assert.equal(f.r.stats.waitingForPreparationBudget,false,'the woken retry admits the program');assert.equal(f.r.needsFrame,true);
  // Another consumer takes the returned bytes before the target is allocated.
  const squeeze=f.block(64);f.timers.all();const listeners=f.budget.stats.availabilityListeners;
  assert.equal(f.capture(),undefined);assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.r.stats.allocatedGPUBytes,0);
  assert.equal(f.budget.stats.availabilityListeners,listeners+1,'the capture holds its own ledger wake');
  const idle=f.repaints;for(let i=0;i<3;i++){assert.equal(f.capture(),undefined);assert.equal(f.r.needsFrame,false);assert.equal(f.r.frame(f.time+1e9),false);}
  assert.equal(f.repaints,idle,'no polling while the target waits');assert.equal(f.budget.stats.availabilityListeners,listeners+1);assert.equal(f.timers.queue.length,0);
  blocker.release();assert.equal(f.repaints,idle+1,'the ledger wake repaints once');
  assert.ok(f.capture()?.texture);assert.equal(f.r.stats.mode,'captured');assert.equal(f.source.renders,2);
  assert.equal(f.textureBytes(),bytes,'exactly one charged target again');
  squeeze.release();
 }finally{f.dispose();}
 assert.equal(f.budget.stats.bytes,0);
});

function environmentScene(limitBytes=64*MiB){
 const {budget,store,gl,block}=ledger(limitBytes);let repaints=0,frames=0;
 const map={triggerRepaint(){repaints++;}};
 const r=m.createEnvironmentSceneRenderer(map,{origin:[13.4,52.5],resourceStore:store,onFrameNeeded(){frames++;}});
 r.layer.onAdd({},gl);
 return{budget,store,gl,block,map,r,get repaints(){return repaints;},get frames(){return frames;},render(){r.layer.render({},identity);}};
}
test('environment: a held reflection wait asks the shared clock for nothing until the owner wake, which retries once',()=>{
 const timers=captureTimers(),f=environmentScene(),owner=m.createProgramPreparationOwner('environment reflection fixture',()=>f.map.triggerRepaint());
 const source=reflectionSource(f.gl,owner,['reflection:env']);
 try{
  f.r.setSceneEnvironment(initial);f.r.setFeatures([water],bounds,new Set([water]));f.r.setEnabled(true);f.r.setReflectionSource(source);
  const blocker=f.block(),frames=f.frames,repaints=f.repaints;
  for(let i=0;i<5;i++){f.render();assert.deepEqual(f.r.animationFrame(1000+i*100),{active:false,changed:false},'the paused clock stays idle');}
  assert.equal(source.prepares,5);assert.equal(f.r.stats.buildingReflection.waitingForPreparationBudget,true);assert.equal(f.r.stats.buildingReflection.mode,'preparing');
  assert.equal(f.frames,frames,'render never wakes the frame owner for a held wait');assert.equal(f.repaints,repaints);
  blocker.release();assert.equal(f.repaints,repaints+1,'the owner wake repaints the map once');assert.equal(f.frames,frames);
  f.render();assert.equal(source.prepares,6,'the woken frame retries once');assert.equal(f.frames,frames+1,'ordinary pending wakes the clock as before');
  timers.all();f.render();assert.equal(source.renders,1);assert.equal(f.r.stats.buildingReflection.mode,'captured');
  source.programs.release();
 }finally{f.r.destroy();owner.dispose();timers.all();timers.restore();f.store.collectRetired();f.store.destroy();}
});

test('environment: the shared mask wake reaches the frame owner and the map once; unwanted admissions are withdrawn',()=>{
 const f=environmentScene(),maskBytes=1280*800,mask=()=>f.r.stats.shadowMask;
 try{
  f.r.setSceneEnvironment(initial);f.r.setFeatures([tree],bounds,new Set());f.r.setEnabled(true);assert.ok(f.r.stats.trees>0);
  let blocker=f.block(512*1024);f.render();
  assert.equal(mask().admission,'pending');assert.equal(mask().waiting,true);assert.equal(mask().requiredBytes,maskBytes);
  const frames=f.frames,repaints=f.repaints,listeners=f.budget.stats.availabilityListeners,pressure=f.budget.stats.pressureEvents;
  for(let i=0;i<4;i++)f.render();
  assert.equal(f.frames,frames);assert.equal(f.repaints,repaints);assert.equal(f.budget.stats.pressureEvents,pressure,'no futile admission while waiting');assert.equal(mask().waits,1);
  blocker.release();
  assert.equal(f.frames,frames+1,'the wake reaches the frame owner once');assert.equal(f.repaints,repaints+1,'and the map once');assert.equal(mask().wakeups,1);
  assert.equal(f.budget.stats.availabilityListeners,listeners-1);
  f.render();assert.equal(mask().admission,'admitted');assert.equal(mask().bytes,maskBytes);
  f.r.destroy();assert.equal(mask().waiting,false);
 }finally{f.r.destroy();f.store.collectRetired();f.store.destroy();}
 // Each way of no longer drawing the mask withdraws a pending admission, which a
 // later ledger wave then never wakes.
 // A loss before the frame, or one that a draw inside the frame observes, also
 // withdraws it: the mask's own loss handling returns storage, not the wait.
 const loseAfterFirstBind=g=>{const bind=g.gl.bindVertexArray;let first=true;g.gl.bindVertexArray=value=>{bind(value);if(first){first=false;g.gl.setLost(true);}};};
 const exits=[['shadows off',r=>r.setSceneEnvironment({...initial,shadows:false})],['hidden',r=>r.setVisible(false)],['offscreen',r=>r.setOffscreen(true)],['disabled',r=>r.setEnabled(false)],['no tree',(r,g)=>{r.setFeatures([],bounds,new Set());g.render();}],
  ['context lost',(_r,g)=>{g.gl.setLost(true);g.render();}],['context lost inside the frame',(_r,g)=>{loseAfterFirstBind(g);g.render();}]];
 for(const [name,exit] of exits){
  const g=environmentScene();
  try{
   g.r.setSceneEnvironment(initial);g.r.setFeatures([tree],bounds,new Set());g.r.setEnabled(true);const blocker=g.block(512*1024);g.render();
   assert.equal(g.r.stats.shadowMask.waiting,true,name);const listeners=g.budget.stats.availabilityListeners;
   exit(g.r,g);
   assert.equal(g.r.stats.shadowMask.waiting,false,name);assert.equal(g.r.stats.shadowMask.cancellations,1,name);assert.equal(g.budget.stats.availabilityListeners,listeners-1,name);
   const frames=g.frames,repaints=g.repaints;blocker.release();
   assert.equal(g.r.stats.shadowMask.wakeups,0,name);assert.equal(g.frames,frames,name);assert.equal(g.repaints,repaints,name+': a withdrawn admission is never woken');
  }finally{g.r.destroy();g.store.collectRetired();g.store.destroy();}
 }
});

function reichstagScene(){
 const {budget,store,gl,block}=ledger(64*MiB);let repaints=0;
 const vertex=new ArrayBuffer(3*24),view=new DataView(vertex);
 for(let i=0;i<3;i++){view.setFloat32(i*24,i,true);view.setFloat32(i*24+4,i?10:0,true);view.setFloat32(i*24+8,i===2?1:0,true);view.setInt16(i*24+14,32767,true);for(let k=18;k<22;k++)view.setUint8(i*24+k,255);}
 const mesh={origin:[13.3761,52.5186],vertex,index:new Uint16Array([0,1,2]),vertices:3,triangles:1,identity:{objectId:'osm/relation/8990774',partId:'osm/relation/8990774/component/35b9af608ec3d7abc1c1'},sourceCommit:'cca429f4e72a1b1b962de4d944ec83fed96869e8',boundarySHA:reichstagSHA};
 const r=m.createDedicatedReichstagLayer({triggerRepaint(){repaints++;}},mesh);r.layer.onAdd({},gl);r.setEnabled(true);r.setSceneEnvironment(initial);
 return{budget,store,gl,block,r,get repaints(){return repaints;},render(){r.layer.render(gl,identity);},mask:()=>r.stats.solarShadow.mask};
}
test('dedicated Reichstag: its mask wake repaints the map once; hidden, disabled, shadow-off, undrawn or lost masks withdraw',()=>{
 const f=reichstagScene();
 try{
  const blocker=f.block(512*1024);f.render();
  assert.equal(f.r.stats.solarShadow.mode,'solar-projected');assert.equal(f.mask().admission,'pending');assert.equal(f.mask().waiting,true);
  const repaints=f.repaints;for(let i=0;i<3;i++)f.render();assert.equal(f.repaints,repaints);assert.equal(f.mask().waits,1);
  blocker.release();assert.equal(f.repaints,repaints+1,'the mask wake repaints exactly once');assert.equal(f.mask().wakeups,1);
  f.render();assert.equal(f.mask().admission,'admitted');assert.equal(f.r.stats.solarShadow.draws,1);
 }finally{f.r.destroy();f.store.collectRetired();f.store.destroy();}
 const loseAfterFirstBind=g=>{const bind=g.gl.bindVertexArray;let first=true;g.gl.bindVertexArray=value=>{bind(value);if(first){first=false;g.gl.setLost(true);}};};
 const exits=[['hidden',g=>g.r.setPageHidden(true)],['disabled',g=>g.r.setEnabled(false)],['shadows off',g=>g.r.setSceneEnvironment({...initial,shadows:false})],['fading',g=>{g.r.setOpacity(.5);g.render();}],['growing',g=>{g.r.setGrowth(0);g.render();}],
  ['context lost',g=>{g.gl.setLost(true);g.render();}],['context lost inside the frame',g=>{loseAfterFirstBind(g);g.render();}]];
 for(const [name,exit] of exits){
  const g=reichstagScene();
  try{
   const blocker=g.block(512*1024);g.render();assert.equal(g.mask().waiting,true,name);const listeners=g.budget.stats.availabilityListeners;
   exit(g);
   assert.equal(g.mask().waiting,false,name);assert.equal(g.mask().cancellations,1,name);assert.equal(g.budget.stats.availabilityListeners,listeners-1,name);
   const repaints=g.repaints;blocker.release();assert.equal(g.repaints,repaints,name+': a withdrawn admission is never woken');assert.equal(g.mask().wakeups,0,name);
  }finally{g.r.destroy();g.store.collectRetired();g.store.destroy();}
 }
});
