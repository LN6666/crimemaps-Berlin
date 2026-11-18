import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const load=async(contents,plugins=[])=>{const r=await build({stdin:{contents,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',preserveSymlinks:true,plugins});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));};
const ledger=`export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';export * from './environment-resource-budget';export * from './environment-resource-vehicles';`;
// Delegates to the real motion state unless a test injects a failure that
// happens after the vehicles' fixed CPU admission (construction-failure exit).
const constructionProbe={name:'construction-failure-probe',setup(b){b.onResolve({filter:/^\.\/environment-motion$/},()=>({path:'environment-motion-probe',namespace:'probe'}));b.onLoad({filter:/.*/,namespace:'probe'},()=>({contents:`import {createEnvironmentMotion as actual} from ${JSON.stringify(path.join(safety,'environment-motion.ts'))};export function createEnvironmentMotion(...args){if(globalThis.__environmentResourceConstructionFailure)throw Error('injected construction failure');return actual(...args);}`,loader:'js',resolveDir:safety}));}};
const v=await load(`export {createAnimatedVehicles,compactCarMesh} from './animated-vehicles';${ledger}`,[constructionProbe]);
const s=await load(`export {installThreeDimensionalScenery} from './three-dimensional-scenery';${ledger}`,[{name:'scenery-vehicle-fixture',setup(b){b.onResolve({filter:/^\.\/animated-vehicles$/},()=>({path:'vehicles',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createAnimatedVehicles=(...args)=>globalThis.__environmentResourceVehicleFactory(...args);',loader:'js'}));}}]);
const MiB=1024*1024;
const road=(id,coordinates)=>({id:'osm/way/'+id+'/clip/0',source_way_id:id,coordinates,direction:1,source_tags:{highway:'residential'},source_url:'https://www.openstreetmap.org/way/'+id});
const scenery=roads=>({schema_version:1,city:'berlin',source_snapshot:'test',source_pbf_sha256:'a'.repeat(64),source_url:'https://www.openstreetmap.org',city_boundary_sha256:'b'.repeat(64),role:'decorative-schematic',partial:true,roads});
const one=scenery([road(1,[[13,52],[13.002,52.002]])]),two=scenery([road(1,[[13,52],[13.002,52.002]]),road(2,[[13.001,52],[13.003,52.002]])]);
const sum=costs=>costs.reduce((n,c)=>n+c.bytes,0);
function vehicleGL(){
 let lost=false,signaled=true,buffers=0;const sources=[];
 const gl={sources,get buffers(){return buffers;},setLost(value){lost=value;},setSignaled(value){signaled=value;},createVertexArray:()=>({}),createBuffer:()=>{buffers++;return{};},createShader:()=>({}),createProgram:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getParameter:()=>null,getUniformLocation:()=>({}),getAttribLocation:()=>0,isContextLost:()=>lost,shaderSource:(_s,text)=>sources.push(text),
  fenceSync:()=>({}),flush(){},deleteSync(){},clientWaitSync:()=>signaled?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED};
 for(const key of ['compileShader','attachShader','detachShader','linkProgram','deleteShader','bindVertexArray','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','vertexAttribDivisor','bufferSubData','useProgram','enable','depthFunc','depthMask','disable','uniformMatrix4fv','drawElementsInstanced','deleteBuffer','deleteVertexArray','deleteProgram'])gl[key]=()=>{};
 for(const [i,key]of ['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','DEPTH_TEST','LEQUAL','BLEND','CULL_FACE','TRIANGLES','UNSIGNED_SHORT','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','TIMEOUT_EXPIRED','WAIT_FAILED'].entries())gl[key]=i+1;
 return gl;
}
function vehicleSetup(limitBytes=64*MiB){
 const budget=v.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=v.createChunkResourceStore({budget}),subscriptions=new Set();let repaints=0;
 const frameClock={subscribe(s){subscriptions.add(s);return()=>subscriptions.delete(s);},wake(){}};
 const create=()=>v.createAnimatedVehicles({triggerRepaint(){repaints++;}},'berlin',{clock:()=>0,frameClock,resourceStore:store});
 return{budget,store,subscriptions,frameClock,create,get repaints(){return repaints;}};
}
const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const ledgerState=f=>({pressure:f.budget.stats.pressureEvents,evictions:f.budget.stats.evictionAttempts,wakeups:f.budget.stats.availabilityEvents});

test('vehicle fixed storage is admitted before allocation and equals the typed arrays then allocated',()=>{
 const f=vehicleSetup(),vehicles=f.create(),fixed=sum(v.vehicleFixedCosts(2048,Math.ceil(Math.ceil(2048/3)*.6)));
 // +20738: the constant program allowance admitted with the fixed storage
 // (DECISIONS 2026-11-02 03:25 policy estimate: 1 program x (3 UTF-16 copies of
 // source and attribute names + 16 KiB) + 1 VAO x (256 + 3 x 64) bytes).
 assert.equal(vehicles.stats.resources.fixedCPUBytes,fixed);assert.equal(f.budget.stats.bytes,fixed+20738);
 assert.equal(fixed,vehicles.stats.cpuPositionScratchBytes+vehicles.stats.sharedStaticMeshBytes,'the pre-allocation size is the real staging, scratch and mesh storage');
 const mesh=v.compactCarMesh();assert.equal(v.vehicleMeshBytes(),mesh.vertexData.byteLength+mesh.indices.byteLength);
 vehicles.destroy();assert.equal(f.budget.stats.bytes,0);
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-1024,precision:'exact'});
 assert.throws(()=>f.create(),v.EnvironmentResourcePendingError);assert.equal(f.budget.stats.bytes,blocker.bytes,'a refused renderer reserves nothing');blocker.release();
 const tiny=vehicleSetup(fixed-1);assert.throws(()=>tiny.create(),v.EnvironmentResourceUnfitError);
 f.store.destroy();tiny.store.destroy();
});

test('a refused road commit keeps the previous roads and claim; an admitted commit replaces it once',()=>{
 const f=vehicleSetup(),vehicles=f.create();vehicles.setRoads(one);
 const roads=vehicles.stats.roads,loaded=vehicles.stats.loadedSourceRoads,claim=vehicles.stats.resources.roadBytes;
 assert.equal(loaded,1);assert.ok(claim>0);
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes,precision:'exact'});
 assert.throws(()=>vehicles.setRoads(two),v.EnvironmentResourcePendingError);
 assert.equal(vehicles.stats.roads,roads);assert.equal(vehicles.stats.loadedSourceRoads,1,'refusal happens before the old roads are cleared');assert.equal(vehicles.stats.resources.roadBytes,claim);
 blocker.release();const before=f.budget.stats.bytes;vehicles.setRoads(two);
 assert.equal(vehicles.stats.loadedSourceRoads,2);const after=vehicles.stats.resources.roadBytes;assert.ok(after>claim);
 assert.equal(f.budget.stats.bytes,before-claim+after,'the previous road claim is released exactly once');
 vehicles.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('vehicle GPU buffers wait for one ledger wake-up while the shared clock stays idle; shaders are unchanged',async()=>{
 const f=vehicleSetup(),vehicles=f.create(),gl=vehicleGL();vehicles.setRoads(one);vehicles.setEnabled(true);
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-16,precision:'exact'});
 vehicles.layer.onAdd({},gl);
 assert.deepEqual(gl.sources.map(text=>crypto.createHash('sha256').update(text).digest('hex')),['7e7390fd080ac98446f60e4dd89f0ece6f73358cbc81cd78ddd5e48990f2c54e','2947d87a2c93f9194ef1863aae6630ab62607108296eb4018df922a662ee3d0e'],'vehicle shader text is byte-identical to the previous implementation');
 assert.equal(gl.buffers,0,'no GPU buffer before admission');assert.equal(vehicles.stats.resources.gpuDeferred,true);
 assert.equal(f.subscriptions.size,1);assert.equal([...f.subscriptions][0].active(),false,'deferred vehicles request no frames');
 const repaints=f.repaints,waiting=ledgerState(f);for(let i=0;i<5;i++)vehicles.layer.render({},identity);assert.equal(gl.buffers,0);
 assert.deepEqual(ledgerState(f),waiting,'frames before the wake-up run no admission, pressure eviction or wake-up');
 // A wake-up whose retry is still refused costs exactly one admission attempt.
 blocker.release();const second=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-16,precision:'exact'});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.repaints,repaints+1,'one availability wake-up repaints');
 const woken=ledgerState(f);for(let i=0;i<5;i++)vehicles.layer.render({},identity);
 assert.equal(f.budget.stats.pressureEvents,woken.pressure+1,'one retry per wake-up, then it waits again');assert.equal(f.budget.stats.availabilityEvents,woken.wakeups);assert.equal(gl.buffers,0);
 const again=f.repaints;second.release();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.repaints,again+1);
 vehicles.layer.render({},identity);assert.equal(gl.buffers,3);assert.equal(vehicles.stats.resources.gpuDeferred,false);assert.equal([...f.subscriptions][0].active(),true);
 assert.equal(vehicles.stats.resources.gpuBytes,vehicles.stats.logicalGPUBufferBytes,'the GPU claim equals the logical buffer storage');
 gl.setSignaled(false);vehicles.destroy();
 // Expected value only: +20738 B, the vehicle shader program allowance (DECISIONS
 // 2026-11-02 03:25, stage-2 constant estimate), which since environment-fix2
 // (review ENV2-R5) retires behind the same page fence as the buffers.
 assert.equal(f.budget.stats.retiringBytes,vehicles.stats.logicalGPUBufferBytes+20738,'deleted buffers stay charged until their fence');
 gl.setSignaled(true);f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

function sceneryFixture(t,limitBytes=64*MiB,gpu){
 const saved={document:Object.getOwnPropertyDescriptor(globalThis,'document'),factory:globalThis.__environmentResourceVehicleFactory},status={setAttribute(){},remove(){},textContent:''},created=[];
 globalThis.document={hidden:false,createElement:()=>status};
 // gpu (optional) drives the fake renderer's deferred-GPU report.
 globalThis.__environmentResourceVehicleFactory=(_map,_city,options)=>{const vehicles={options,layer:{id:'cars'},setEnabled(){},setVisible(){},setReducedMotion(){},setZoom(){},setFrameLoad(){},setRoads(){},get positionSamples(){return[];},get stats(){return gpu?{allocatedVehicles:1,resources:{gpuDeferred:gpu.deferred,gpuPending:gpu.deferred?{...gpu.pending}:undefined}}:{allocatedVehicles:1};},destroy(){}};created.push(vehicles);return vehicles;};
 t.after(()=>{if(saved.document)Object.defineProperty(globalThis,'document',saved.document);else delete globalThis.document;globalThis.__environmentResourceVehicleFactory=saved.factory;});
 const budget=s.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=s.createChunkResourceStore({budget}),reads=[],events=new Map(),layers=new Map();
 const index={schema_version:1,city:'berlin',role:'decorative-schematic',partial:true,snapshot:'test',source_pbf_sha256:'a'.repeat(64),data:{path:'/safety/buildings3d/roads.json',bytes:4096,sha256:'b'.repeat(64)}};
 const map={on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),getZoom:()=>18,getBounds:()=>({getWest:()=>12,getSouth:()=>51,getEast:()=>14,getNorth:()=>53}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id)};
 const scenery=s.installThreeDimensionalScenery({map,city:'berlin',locale:'en',host:{append(){}},buildingLayer:()=>undefined,resourceStore:store,read:async(asset,signal)=>{reads.push({asset,signal});return typeof asset==='string'?index:one;}});
 t.after(()=>scenery.destroy());
 return{scenery,budget,store,reads,status,created,async ready(){for(let i=0;i<20&&scenery.stats.state!=='ready';i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(scenery.stats.state,'ready');}};
}

test('scenery roads are one page-store source lease, kept through warm pauses and released on explicit 2D',async t=>{
 const f=sceneryFixture(t);f.scenery.setMode(true);await f.ready();
 const held=f.budget.stats.bytes;assert.ok(held>0,'decoded roads are charged');assert.equal(f.scenery.stats.resources.sourceLease,'ready');
 assert.ok(f.scenery.stats.resources.sourceRetainedEstimateBytes>0);assert.equal(f.reads.length,2);
 for(const [pause,resume]of [[()=>f.scenery.setVisible(false),()=>f.scenery.setVisible(true)],[()=>f.scenery.suspend(),()=>f.scenery.resume()]]){pause();assert.equal(f.budget.stats.bytes,held);resume();await f.ready();}
 assert.equal(f.reads.length,2,'warm resume reuses the leased roads');assert.equal(f.budget.stats.bytes,held);
 f.scenery.setMode(false);assert.equal(f.budget.stats.bytes,0,'explicit 2D returns the decoded roads');assert.equal(f.scenery.stats.resources.sourceLease,undefined);
 f.scenery.setMode(true);await f.ready();assert.equal(f.reads.length,4);f.scenery.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('scenery reads wait for their admitted working set and never start under pressure',async t=>{
 const f=sceneryFixture(t,8*MiB),blocker=f.budget.reserve({category:'texture',bytes:7*MiB,precision:'exact'});
 f.scenery.setMode(true);for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.reads.length,0,'the index read waits for its parse bound');assert.equal(f.scenery.stats.state,'loading');
 assert.equal(f.scenery.stats.resources.admission.pending.phase,'vehicle scenery index');assert.equal(f.budget.stats.availabilityListeners,1);
 blocker.release();await f.ready();assert.equal(f.reads.length,2);f.scenery.setMode(false);assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('a vehicle construction failure after the fixed CPU admission returns that claim before rethrowing',t=>{
 const f=vehicleSetup();t.after(()=>{delete globalThis.__environmentResourceConstructionFailure;});
 globalThis.__environmentResourceConstructionFailure=true;
 assert.throws(()=>f.create(),/injected construction failure/);
 assert.equal(f.budget.stats.bytes,0,'the fixed CPU claim is not leaked');assert.equal(f.budget.stats.reservations,0);
 delete globalThis.__environmentResourceConstructionFailure;
 const vehicles=f.create();assert.equal(f.budget.stats.bytes,vehicles.stats.resources.fixedCPUBytes+20738,'+20738: the constant program allowance (see the first test)');vehicles.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('an invalid viewport is refused before the committed roads, slots or road claim change',()=>{
 const f=vehicleSetup(),vehicles=f.create(),gl=vehicleGL();vehicles.setRoads(one,[12,51,14,53]);vehicles.layer.onAdd({},gl);vehicles.setEnabled(true);
 const roads=vehicles.stats.roads,slots=vehicles.stats.candidateSlots,claim=vehicles.stats.resources.roadBytes,bytes=f.budget.stats.bytes;assert.ok(roads>0&&slots>0&&claim>0);
 for(const bad of [[14,51,12,53],[12,51,14,Number.NaN],[-200,51,14,53]]){
  assert.throws(()=>vehicles.setViewport(bad),/Invalid vehicle viewport/);
  assert.throws(()=>vehicles.setRoads(two,bad),/Invalid vehicle viewport/);
 }
 assert.equal(vehicles.stats.roads,roads);assert.equal(vehicles.stats.candidateSlots,slots);assert.equal(vehicles.stats.loadedSourceRoads,1,'the source roads were not replaced');
 assert.equal(vehicles.stats.resources.roadBytes,claim,'the road claim still describes the kept roads');assert.equal(f.budget.stats.bytes,bytes,'no refused attempt kept a claim');
 vehicles.layer.render({},identity);assert.equal(vehicles.stats.renderFailure,undefined,'the kept roads and slots still render together');
 vehicles.destroy();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('scenery reports waiting-gpu-budget and withholds the ready copy while the cars wait for GPU storage',async t=>{
 const gpu={deferred:true,pending:{label:'vehicle GPU buffers',requiredBytes:6108}},f=sceneryFixture(t,64*MiB,gpu);f.scenery.setMode(true);
 for(let i=0;i<20&&!['waiting-gpu-budget','ready','error'].includes(f.scenery.stats.state);i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.scenery.stats.state,'waiting-gpu-budget','committed roads that cannot draw are not reported ready');
 assert.deepEqual(f.scenery.stats.resources.gpuWaiting,{phase:'vehicle GPU buffers',label:'vehicle GPU buffers',requiredBytes:6108,publishedState:'ready'});
 assert.equal(f.status.textContent,'Loading mapped roads for the car animation…','the ready copy is not announced while nothing is drawn');
 const vehicles=f.created.at(-1);assert.equal(typeof vehicles.options.onGpuStateChange,'function');
 gpu.deferred=false;vehicles.options.onGpuStateChange(false);
 assert.equal(f.scenery.stats.state,'ready');assert.equal(f.scenery.stats.resources.gpuWaiting,undefined);assert.equal(f.status.textContent,'Car animation follows a subset of mapped roads. test');
 gpu.deferred=true;vehicles.options.onGpuStateChange(true);
 assert.equal(f.scenery.stats.state,'waiting-gpu-budget','a later deferral (e.g. a restore under pressure) withdraws ready again');assert.equal(f.status.textContent,'Loading mapped roads for the car animation…');
 f.scenery.setMode(false);vehicles.options.onGpuStateChange(false);assert.equal(f.status.textContent,'','an idle scenery ignores late renderer reports');
 f.scenery.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});
