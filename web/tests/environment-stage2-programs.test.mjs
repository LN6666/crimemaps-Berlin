import {environmentLedgerGL,projectionMatrix} from './support/environment-ledger-webgl.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MiB,loadStage2Modules,road,vehicleScenery} from './support/environment-stage2-fixtures.mjs';

// Stage 2: the constant shader program allowance of the environment renderer
// and the decorative vehicles (DECISIONS 2026-11-02 03:25: a policy estimate,
// about 128 KiB and 20 KiB with VAOs, driver-side unmeasured; not
// ProgramPreparation), and the projected shadow mask's loss withdrawal of every
// owner's pending admission. Logical ledger and fake-GL checks only: no GPU.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const m=await loadStage2Modules(safety,{stubRenderers:false,entry:[
 "export {createEnvironmentSceneRenderer} from './environment-scene-renderer';",
 "export {createAnimatedVehicles} from './animated-vehicles';",
 "export {createProjectedShadowMask} from './projected-shadow-mask';",
 "export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';",
 "export {createResourceBudget} from './render-runtime/resource-budget';",
 "export * from './environment-resource-budget';",
 "export {environmentRendererFixedCosts} from './environment-resource-publication';",
 "export {vehicleFixedCosts} from './environment-resource-vehicles';",
 "export {ENVIRONMENT_SCENE_VERTEX_GLSL,ENVIRONMENT_SCENE_FRAGMENT_GLSL} from './environment-scene-shaders';",
 "export {GREEN_GROUND_VERTEX_GLSL,GREEN_GROUND_FRAGMENT_GLSL} from './environment-green-ground';",
].join('')});
const sum=costs=>costs.reduce((n,c)=>n+c.bytes,0);
const turn=()=>new Promise(resolve=>setImmediate(resolve));

// Allocation-only WebGL2 fake: programs, VAOs and buffers are counted; a
// used for vehicle allocation and retirement independently of environment drawing.
function fakeGL(){
 let n=1,lost=false;const sources=[],counts={programs:0,vaos:0,buffers:0};const g={};
 for(const key of ['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','TIMEOUT_EXPIRED','WAIT_FAILED'])g[key]=n++;
 Object.assign(g,{sources,counts,canvas:{clientWidth:1280,clientHeight:800},setLost(v){lost=v;},isContextLost:()=>lost,
  createShader:()=>({id:n++}),shaderSource:(_s,text)=>sources.push(text),compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',attachShader(){},detachShader(){},deleteShader(){},
  createProgram:()=>{counts.programs++;return{id:n++};},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',bindAttribLocation(){},deleteProgram(){},
  getAttribLocation:(_p,name)=>({a_position:0,a_normal:1,a_role:2,a_tree:3,a_instance:4}[name]??-1),getUniformLocation:(_p,name)=>name,
  createVertexArray:()=>{counts.vaos++;return{id:n++};},createBuffer:()=>{counts.buffers++;return{id:n++};},deleteBuffer(){},deleteVertexArray(){},
  bindVertexArray(){},bindBuffer(){},bufferData(){},bufferSubData(){},enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},
  getParameter:()=>null,fenceSync:()=>({id:n++}),flush(){},deleteSync(){},clientWaitSync:()=>g.ALREADY_SIGNALED});
 return g;
}
function ledger(limitBytes=64*MiB){const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)});return{budget,store:m.createChunkResourceStore({budget})};}
const environmentPrograms=()=>m.environmentProgramAllowanceCosts([{vertex:m.ENVIRONMENT_SCENE_VERTEX_GLSL,fragment:m.ENVIRONMENT_SCENE_FRAGMENT_GLSL,attributes:['a_position','a_normal','a_role','a_tree']},{vertex:m.GREEN_GROUND_VERTEX_GLSL,fragment:m.GREEN_GROUND_FRAGMENT_GLSL,attributes:['a_position','a_normal','a_role']}],{count:4,attributes:4},'environment');

test('the program allowance policy is a labelled estimate from the real shader sources',()=>{
 const costs=environmentPrograms();
 assert.equal(sum(costs),134548,'environment: about 131 KiB with its four VAOs');
 assert.deepEqual(costs.map(c=>[c.category,c.precision]),[['program','estimate'],['gpu-vertex-array','estimate']]);
 assert.ok(costs.every(c=>/driver-side unmeasured/.test(c.label)&&typeof c.identity==='object'),'labels say the driver side is unmeasured');
 const M=m.ENVIRONMENT_PROGRAM_MODEL,chars=m.ENVIRONMENT_SCENE_VERTEX_GLSL.length+m.ENVIRONMENT_SCENE_FRAGMENT_GLSL.length+'a_positiona_normala_rolea_tree'.length+m.GREEN_GROUND_VERTEX_GLSL.length+m.GREEN_GROUND_FRAGMENT_GLSL.length+'a_positiona_normala_role'.length;
 assert.equal(costs[0].bytes,M.sourceCopies*M.bytesPerCharacter*chars+2*M.programRecordBytes);assert.equal(costs[1].bytes,4*(M.vertexArrayBytes+4*M.vertexArrayAttributeBytes));
});

test('environment renderer: the program allowance joins the one GPU decision before any shader exists; refused, nothing compiles until one ledger wake-up',async()=>{
 const programs=environmentPrograms(),allowance=sum(programs);
 {
  const {budget,store}=ledger(),r=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5],resourceStore:store}),gl=environmentLedgerGL();
  r.layer.onAdd({},gl);
  assert.equal(gl.sources.length,4);assert.equal(r.stats.resources.gpu.claims.programs,allowance);assert.equal(r.stats.resources.programAllowanceBytes,allowance);
  assert.equal(budget.stats.categories.program.bytes,programs[0].bytes);assert.equal(budget.stats.categories['gpu-vertex-array'].bytes,programs[1].bytes);
  const before=budget.stats.bytes,gpu=r.stats.resources.gpuBytes;assert.ok(gpu>allowance);
  gl.setLost(true);r.layer.onRemove();
  assert.equal(budget.stats.bytes,before-gpu,'context loss returns the allowance with the buffers at once');assert.equal(budget.stats.retiringBytes,0);assert.equal(r.stats.resources.programAllowanceBytes,0);
  r.destroy();assert.equal(budget.stats.bytes,0);store.destroy();
 }
 const {budget,store}=ledger();let repaints=0,frames=0;
 const r=m.createEnvironmentSceneRenderer({triggerRepaint(){repaints++;}},{origin:[13.4,52.5],resourceStore:store,onFrameNeeded(){frames++;}}),gl=environmentLedgerGL();
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(allowance-1),precision:'exact'});
 const before={bytes:budget.stats.bytes,events:budget.stats.availabilityEvents,reservations:budget.stats.reservations};
 try{
  r.layer.onAdd({},gl);
  assert.deepEqual(gl.sources,[],'no shader is compiled before its allowance is admitted');assert.deepEqual([gl.counts.programs,gl.counts.vaos,gl.counts.buffers],[0,0,0]);
  assert.deepEqual([budget.stats.bytes,budget.stats.availabilityEvents,budget.stats.reservations],[before.bytes,before.events,before.reservations],'the refused decision reserves and releases nothing');
  const pending=r.stats.resources;assert.equal(pending.gpuDeferred,true);assert.match(pending.gpuPending.label,/^environment-scene programs\+fixed\+water$/,'one keyed claim set: programs, fixed and water');assert.ok(pending.gpuPending.requiredBytes>=allowance);
  assert.equal(budget.stats.availabilityListeners,1,'one ledger wait, with an AbortSignal');
  r.setEnabled(true);assert.equal(r.stats.animationActive,false,'a deferred renderer requests no animation frames');
  const pressure=budget.stats.pressureEvents;for(let i=0;i<4;i++)r.layer.render({},projectionMatrix);
  assert.equal(budget.stats.pressureEvents,pressure,'frames before the wake-up retry nothing');assert.deepEqual(gl.sources,[]);
  const repaintsBefore=repaints,framesBefore=frames;blocker.release();await turn();
  assert.equal(budget.stats.availabilityListeners,0);assert.equal(repaints,repaintsBefore+1,'the wake-up repaints once');assert.equal(frames-framesBefore,1,'and wakes the frame owner once');
  r.layer.render({},projectionMatrix);
  assert.equal(gl.sources.length,4,'the first frame after the wake-up compiles both programs');assert.deepEqual([gl.counts.programs,gl.counts.vaos,gl.counts.buffers],[2,4,7]);
  assert.equal(r.stats.resources.gpuDeferred,false);assert.equal(r.stats.resources.programAllowanceBytes,allowance);
 }finally{r.destroy();store.collectRetired();blocker.release();}
 assert.equal(budget.stats.bytes,0,'destroy returns the allowance');store.destroy();
});

function vehicles(budget,store){
 const subscriptions=new Set();let repaints=0;
 const v=m.createAnimatedVehicles({triggerRepaint(){repaints++;}},'berlin',{clock:()=>0,frameClock:{subscribe(s){subscriptions.add(s);return()=>subscriptions.delete(s);},wake(){}},resourceStore:store});
 return{v,subscriptions,get repaints(){return repaints;}};
}
test('vehicles: the program allowance is admitted with the fixed storage; a released one is admitted again before a later compile, deferred under pressure',async()=>{
 const fixed=sum(m.vehicleFixedCosts(2048,Math.ceil(Math.ceil(2048/3)*.6))),{budget,store}=ledger();
 const f=vehicles(budget,store),allowance=f.v.stats.resources.programAllowanceBytes;
 assert.equal(allowance,20738,'about 20 KiB with its VAO');assert.equal(budget.stats.bytes,fixed+allowance);assert.equal(f.v.stats.resources.fixedCPUBytes,fixed,'the fixed CPU claim is unchanged');
 const gl=fakeGL();f.v.setRoads(vehicleScenery([road(1,[[13,52],[13.002,52.002]])]),[12,51,14,53]);f.v.setEnabled(true);
 let blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-16,precision:'exact'});
 f.v.layer.onAdd({},gl);
 assert.equal(gl.sources.length,2,'the program compiles on the allowance admitted at construction while the buffers wait');
 const M=m.ENVIRONMENT_PROGRAM_MODEL;assert.equal(allowance,M.sourceCopies*M.bytesPerCharacter*(gl.sources[0].length+gl.sources[1].length+'a_positiona_normala_instance'.length)+M.programRecordBytes+M.vertexArrayBytes+3*M.vertexArrayAttributeBytes,'the estimate is computed from the submitted sources');
 assert.equal(f.v.stats.resources.gpuDeferred,true);blocker.release();await turn();f.v.layer.render({},[]);assert.equal(gl.counts.buffers,3);
 // A removal returns the allowance; the next onAdd admits it again first.
 f.v.layer.onRemove();store.collectRetired();assert.equal(f.v.stats.resources.programAllowanceBytes,0);assert.equal(budget.stats.categories.program?.bytes??0,0);
 const again=fakeGL();blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(allowance-1),precision:'exact'});
 const listeners=budget.stats.availabilityListeners;
 f.v.layer.onAdd({},again);
 assert.deepEqual(again.sources,[],'refused, nothing is compiled');assert.equal(again.counts.programs,0);
 assert.equal(f.v.stats.resources.gpuDeferred,true);assert.equal(f.v.stats.inactiveReason,'gpu-budget-deferred');assert.equal(f.v.stats.resources.gpuPending.label,'vehicle shader program');
 assert.equal(budget.stats.availabilityListeners,listeners+1);assert.equal([...f.subscriptions][0].active(),false,'deferred vehicles request no frames');
 const pressure=budget.stats.pressureEvents;for(let i=0;i<4;i++)f.v.layer.render({},[]);assert.equal(budget.stats.pressureEvents,pressure,'no retry before the wake-up');
 const repaints=f.repaints;blocker.release();await turn();assert.equal(f.repaints,repaints+1,'one wake-up repaints');
 f.v.layer.render({},[]);
 assert.equal(again.sources.length,2,'the first frame after the wake-up compiles');assert.equal(again.counts.buffers,3);assert.equal(f.v.stats.resources.gpuDeferred,false);assert.equal(f.v.stats.resources.programAllowanceBytes,allowance);
 f.v.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0,'destroy returns the allowance');
 // Construction is one decision: refused, it reserves and releases nothing.
 const hold=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(fixed+allowance-1),precision:'exact'}),events=budget.stats.availabilityEvents;
 assert.throws(()=>vehicles(budget,store),m.EnvironmentResourcePendingError);
 assert.deepEqual([budget.stats.bytes,budget.stats.availabilityEvents],[hold.bytes,events],'nothing was reserved or released, so nobody was woken');
 hold.release();store.destroy();
 const tiny=ledger(fixed+allowance-1);assert.throws(()=>vehicles(tiny.budget,tiny.store),m.EnvironmentResourceUnfitError,'above the whole ledger: unfit, never a wait');tiny.store.destroy();
});

// Allocation-only fake for the shared R8 mask target.
function maskGL(canvas){
 let n=1;const g={lost:false,canvas};
 for(const key of ['VIEWPORT','MAX_TEXTURE_SIZE','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','TIMEOUT_EXPIRED','WAIT_FAILED'])g[key]=n++;
 Object.assign(g,{isContextLost:()=>g.lost,getParameter:k=>g.lost?null:k===g.VIEWPORT?[0,0,640,480]:k===g.MAX_TEXTURE_SIZE?8192:null,
  createProgram:()=>({kind:'program',id:n++}),createShader:()=>({id:n++}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,attachShader(){},detachShader(){},linkProgram(){},getProgramParameter:()=>true,getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',
  createFramebuffer:()=>({id:n++}),createTexture:()=>({id:n++}),createVertexArray:()=>({id:n++}),deleteShader(){},deleteProgram(){},deleteFramebuffer(){},deleteTexture(){},deleteVertexArray(){},isProgram:()=>false,
  fenceSync:()=>({id:n++}),flush(){},deleteSync(){},clientWaitSync:()=>g.ALREADY_SIGNALED});
 return g;
}
test('a context loss withdraws every owner\'s pending mask admission, so no later ledger wave repaints for the lost target',()=>{
 const {budget,store}=ledger(MiB),canvas=new EventTarget(),gl=maskGL(canvas);m.bindChunkResourceContext(gl,store);
 let repaints=0;const masks=[0,1].map(()=>m.createProjectedShadowMask({requestRepaint:()=>repaints++})),topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];
 const blocker=budget.reserve({category:'texture',bytes:MiB-1000,precision:'exact'});
 for(const mask of masks){assert.equal(mask.draw(gl,topDown,.03,()=>{}),false);assert.equal(mask.stats.waiting,true);assert.equal(mask.stats.admission,'pending');}
 assert.equal(budget.stats.availabilityListeners,2,'both owners of the one target wait');
 gl.lost=true;canvas.dispatchEvent(new Event('webglcontextlost'));
 for(const mask of masks){assert.equal(mask.stats.waiting,false);assert.equal(mask.stats.admission,'idle');assert.equal(mask.stats.lossWithdrawals,1);assert.equal(mask.stats.cancellations,1,'counted as a withdrawn admission');}
 assert.equal(budget.stats.availabilityListeners,0,'the loss removed both ledger listeners');
 blocker.release();assert.equal(repaints,0,'a withdrawn admission is never woken');
 for(const mask of masks){assert.equal(mask.cancelPending(),false,'nothing is left to cancel');mask.release();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('vehicles: a linked program on a live context retires its allowance behind the page fence, like the buffers; a lost context or a never-compiled program releases it at once',()=>{
 const {budget,store}=ledger(),programBytes=()=>budget.stats.categories.program?.bytes??0;
 {
  const f=vehicles(budget,store),gl=fakeGL();let signaled=false;gl.clientWaitSync=()=>signaled?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED;
  f.v.setRoads(vehicleScenery([road(1,[[13,52],[13.002,52.002]])]),[12,51,14,53]);f.v.setEnabled(true);
  f.v.layer.onAdd({},gl);const allowance=f.v.stats.resources.programAllowanceBytes,program=programBytes();assert.equal(allowance,20738);assert.ok(program>0);
  f.v.layer.onRemove();
  assert.equal(f.v.stats.resources.programAllowanceBytes,0,'the owner no longer holds it');
  assert.equal(programBytes(),program,'the deleted program stays charged until its fence');assert.equal(budget.stats.retiringBytes,allowance+f.v.stats.logicalGPUBufferBytes,'retiring with the buffers');
  store.collectRetired();assert.equal(programBytes(),program,'an unsignaled fence keeps it');
  signaled=true;store.collectRetired();assert.equal(programBytes(),0);assert.equal(budget.stats.retiringBytes,0);
  f.v.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0);
 }
 {
  const f=vehicles(budget,store),gl=fakeGL();gl.clientWaitSync=()=>gl.TIMEOUT_EXPIRED;
  f.v.setRoads(vehicleScenery([road(1,[[13,52],[13.002,52.002]])]),[12,51,14,53]);f.v.setEnabled(true);
  f.v.layer.onAdd({},gl);gl.setLost(true);f.v.layer.onRemove();
  assert.equal(programBytes(),0,'a lost context releases the allowance at once');assert.equal(budget.stats.retiringBytes,0);
  f.v.destroy();assert.equal(budget.stats.bytes,0);
 }
 {
  const f=vehicles(budget,store);assert.ok(programBytes()>0,'admitted at construction');
  f.v.destroy();assert.equal(programBytes(),0,'never added to a map: released at once');assert.equal(budget.stats.retiringBytes,0);assert.equal(budget.stats.bytes,0);
 }
 store.destroy();
});

test('mobile environment renderer: a ledger that fits its fixed CPU storage but not its one GPU decision fails explicitly at onAdd, never waits',()=>{
 const {budget,store}=ledger(100000),r=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{mobile:true,origin:[13.4,52.5],resourceStore:store}),gl=environmentLedgerGL();
 try{
  const fixed=r.stats.resources.fixedCPUBytes;assert.ok(fixed<100000,'fixture: the constructor fits');
  assert.ok(sum(environmentPrograms())+fixed>100000,'fixture: the GPU decision beside it cannot');
  const before={bytes:budget.stats.bytes,events:budget.stats.availabilityEvents};
  assert.throws(()=>r.layer.onAdd({},gl),error=>error instanceof m.EnvironmentResourceUnfitError&&/environment/.test(error.message));
  assert.deepEqual(gl.sources,[],'nothing compiled');assert.deepEqual([gl.counts.programs,gl.counts.vaos,gl.counts.buffers],[0,0,0]);
  assert.equal(budget.stats.availabilityListeners,0,'no wait was registered');assert.equal(r.stats.resources.gpuDeferred,false);
  assert.deepEqual([budget.stats.bytes,budget.stats.availabilityEvents],[before.bytes,before.events],'the refused decision reserved and released nothing');
 }finally{r.destroy();store.collectRetired();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('environment renderer: a compile that fails in the deferred frame is retried once at the next enable, never per frame',async()=>{
 const programs=environmentPrograms(),allowance=sum(programs),{budget,store}=ledger();let failures=0;
 const r=m.createEnvironmentSceneRenderer({triggerRepaint(){}},{origin:[13.4,52.5],resourceStore:store,onRenderError(){failures++;}}),gl=environmentLedgerGL();
 let failCompile=true;gl.getShaderParameter=()=>!failCompile;gl.getShaderInfoLog=()=>'fixture compile failure';
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(allowance-1),precision:'exact'});
 const error=console.error;console.error=()=>{};
 try{
  r.layer.onAdd({},gl);r.setEnabled(true);assert.equal(r.stats.resources.gpuDeferred,true);
  blocker.release();await turn();
  r.layer.render({},projectionMatrix);
  assert.equal(failures,1,'the deferred compile failed once');const attempts=gl.sources.length;assert.ok(attempts>0);
  for(let i=0;i<4;i++)r.layer.render({},projectionMatrix);
  assert.equal(gl.sources.length,attempts,'no frame retries a failed compile');assert.equal(r.stats.resources.gpuDeferred,false);
  assert.equal(budget.stats.availabilityListeners,0);
  failCompile=false;r.setEnabled(false);r.setEnabled(true);
  assert.equal(r.stats.resources.gpuDeferred,true,'the next enable re-arms one attempt');
  r.layer.render({},projectionMatrix);
  assert.equal(gl.sources.length,attempts+4,'one attempt compiles both programs');assert.equal(r.stats.resources.gpuDeferred,false);assert.equal(r.stats.resources.programAllowanceBytes,allowance);
  for(let i=0;i<3;i++)r.layer.render({},projectionMatrix);assert.equal(gl.sources.length,attempts+4);assert.equal(failures,1);
 }finally{console.error=error;r.destroy();store.collectRetired();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});
