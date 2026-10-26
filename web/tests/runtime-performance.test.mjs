import {nullCityDataProfilePlugin} from './city-profile-test-plugin.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
async function module(name,plugins=[]){const result=await build({entryPoints:[new URL('../src/safety/'+name,import.meta.url).pathname],bundle:true,platform:'node',format:'esm',write:false,plugins:[nullCityDataProfilePlugin,...plugins]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {createFrozenTableStore,frozenPaintTableSelection}=await module('frozen-paint-tables.ts');
const {inflateBounded3DGzip}=await module('bounded-3d-gzip.ts');
const {createDisplayFrameClock}=await module('display-frame-clock.ts');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(text){const bytes=new TextEncoder().encode(text),sha=hash(bytes);return{bytes,d:{path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:bytes.length}};}
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(r=>setImmediate(r));

test('only selected import graph is read, each initializer stays independent and consumed raw buffers disappear',async()=>{
 const a=fixture('{"x":[-0,0.1234567890123456]}'),b=fixture('{"x":[2]}'),store=createFrozenTableStore([a.d,b.d]);let reads=0;
 const selection={tables:[a.d.sha256],initializers:{[a.d.sha256]:{'module-a':1,'module-b':1}}};
 const release=await store.prepare(async(path)=>{reads++;assert.equal(path,a.d.path);return a.bytes;},signal(),selection);
 assert.equal(store.stats.retainedBytes,a.bytes.length);const first=store.read(a.d.sha256);first.x[1]=0;assert.equal(store.stats.retainedTables,1);
 const second=store.read(a.d.sha256);assert(Object.is(second.x[0],-0));assert.equal(second.x[1],0.1234567890123456);assert.equal(store.stats.retainedBytes,0);release();
 const repeat=await store.prepare(async()=>{throw Error('already consumed initializers re-read');},signal(),selection);repeat();assert.equal(reads,1);
 const extra=await store.prepare(async()=>{reads++;return a.bytes;},signal(),{tables:[a.d.sha256],initializers:{[a.d.sha256]:{'module-c':1}}});assert.equal(store.read(a.d.sha256).x[1],0.1234567890123456);extra();assert.equal(reads,2);assert.equal(store.stats.retainedBytes,0);
 assert.throws(()=>store.read(b.d.sha256),/not been verified/);
});

test('overlapping prepare deduplicates reads and one aborted subscriber cannot cancel a live subscriber',async()=>{
 const a=fixture('{"ok":true}'),store=createFrozenTableStore([a.d]);let reads=0,finish;
 const reader=async(_p,s)=>{reads++;await new Promise((resolve,reject)=>{finish=resolve;s.addEventListener('abort',()=>reject(s.reason),{once:true});});return a.bytes;};
 const canceled=new AbortController(),first=store.prepare(reader,canceled.signal),second=store.prepare(reader,signal());const rejected=assert.rejects(first,/abort/i);await tick();canceled.abort();finish();await rejected;const release=await second;assert.equal(reads,1);assert.deepEqual(store.read(a.d.sha256),{ok:true});release();assert.equal(store.stats.leases,0);assert.equal(store.stats.retainedBytes,0);
});

test('whole table verification is limited to two workers and abort removes unfinished work',async()=>{
 const fixtures=Array.from({length:8},(_,i)=>fixture(JSON.stringify({n:i}))),store=createFrozenTableStore(fixtures.map(f=>f.d));let active=0,peak=0,reads=0;
 const release=await store.prepare(async(path,s)=>{reads++;active++;peak=Math.max(peak,active);await tick();s.throwIfAborted();active--;return fixtures.find(f=>f.d.path===path).bytes;},signal());assert.equal(reads,8);assert.equal(peak,2);release();assert.equal(store.stats.retainedBytes,0);
 const c=new AbortController();c.abort();await assert.rejects(store.prepare(async()=>{throw Error('should not read');},c.signal),/abort/i);assert.equal(store.stats.queued,0);
});

test('physical gzip and raw content hashes are independently required; default shard cap stays one MiB',async()=>{
 const a=fixture('{"x":[-0,0.1234567890123456]}'),compressed=gzipSync(a.bytes,{mtime:0}),sha=hash(compressed);
 const d={...a.d,transport:{path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json.gz`,sha256:sha,bytes:compressed.length,encoding:'gzip'}};
 const store=createFrozenTableStore([d]);const release=await store.prepare(async(path,_s,max)=>{assert.equal(path,d.transport.path);assert.equal(max,compressed.length);return compressed;},signal());assert(Object.is(store.read(a.d.sha256).x[0],-0));release();
 const corrupt=createFrozenTableStore([d]);await assert.rejects(corrupt.prepare(async()=>new Uint8Array(compressed.length),signal()),/hash mismatch/);
 const wrongRaw={...d,sha256:'0'.repeat(64),path:`/safety/buildings3d/painted-tables/00/${'0'.repeat(64)}.json`};await assert.rejects(createFrozenTableStore([wrongRaw]).prepare(async()=>compressed,signal()),/gzip hash mismatch/);
 const large=new TextEncoder().encode(' '.repeat(1024*1024+1));await assert.rejects(inflateBounded3DGzip(gzipSync(large),large.length,signal(),hash(large)),/descriptor/);assert.equal((await inflateBounded3DGzip(gzipSync(large),large.length,signal(),hash(large),64*1024**2)).length,large.length);
});

test('provider combinations retain the full selected main graph and omit unrelated providers',()=>{
 const base=['root500','delegated500','tier300','church','city'],normal=frozenPaintTableSelection(base),infill=frozenPaintTableSelection([...base,'infill']),bremen=frozenPaintTableSelection([...base,'bremen']);
 assert(normal.tables.length>0);assert(normal.tables.every(s=>infill.tables.includes(s)));assert(normal.tables.every(s=>bremen.tables.includes(s)));assert(infill.tables.length>normal.tables.length);assert(bremen.tables.length>normal.tables.length);assert.throws(()=>frozenPaintTableSelection(['unknown']),/provider/);
});

test('display subscriptions share one timer/repaint and idle, hidden, unsubscribed and destroyed states have no timer',()=>{
 let time=0,id=0,repaints=0,active=true;const timers=new Map();
 const clock=createDisplayFrameClock({clock:()=>time,requestRepaint:()=>repaints++,setTimer:(fn,delay)=>{const current=++id;timers.set(current,{fn,at:time+delay});return current;},clearTimer:id=>timers.delete(id)});
 const run=at=>{time=at;const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];assert(entry);timers.delete(entry[0]);entry[1].fn();};
 let a=0,b=0;const offA=clock.subscribe({fps:10,active:()=>active,frame:()=>{a++;return true;}}),offB=clock.subscribe({fps:5,active:()=>active,frame:()=>{b++;return true;}});assert.equal(timers.size,1);run(0);assert.equal(a,1);assert.equal(b,1);assert.equal(repaints,1);run(100);assert.equal(a,2);assert.equal(b,1);assert.equal(timers.size,1);
 active=false;clock.wake();assert.equal(timers.size,0);active=true;clock.wake();assert.equal(timers.size,1);clock.setPageHidden(true);assert.equal(timers.size,0);time=10000;clock.setPageHidden(false);run(10000);assert.equal(a,3);assert.equal(b,2);offA();offB();assert.equal(timers.size,0);clock.destroy();assert.throws(()=>clock.subscribe({fps:10,active:()=>true,frame:()=>false}),/destroyed/);
});

const {installThreeDimensionalScenery}=await module('three-dimensional-scenery.ts',[{name:'scenery-vehicle-lifecycle',setup(build){
 build.onResolve({filter:/^\.\/animated-vehicles$/},()=>({path:'vehicles',namespace:'scenery-test'}));
 build.onLoad({filter:/.*/,namespace:'scenery-test'},()=>({contents:'export const createAnimatedVehicles=(...args)=>globalThis.__runtimeVehicleFactory(...args);',loader:'js'}));
}}]);
test('scenery cancels pending settles in 2D, hidden, reduced, offscreen and suspended states, and forwards the shared clock',async t=>{
 const saved={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,factory:globalThis.__runtimeVehicleFactory};
 const timers=new Map(),events=new Map(),layers=new Map();let id=0,enabled=false,visible=true,reduced=false,destroyed=0,zoom=18,reads=0;
 globalThis.document={hidden:false,createElement:()=>({setAttribute(){},remove(){}})};
 globalThis.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};globalThis.clearTimeout=id=>timers.delete(id);
 t.after(()=>{globalThis.document=saved.document;globalThis.setTimeout=saved.setTimeout;globalThis.clearTimeout=saved.clearTimeout;globalThis.__runtimeVehicleFactory=saved.factory;});
 const sharedClock={subscribe(){throw Error('vehicle double owns no frame timer');},wake(){}};
 globalThis.__runtimeVehicleFactory=(_map,_city,options)=>{assert.equal(options.frameClock,sharedClock);return{layer:{id:'cars'},setEnabled:v=>enabled=v,setVisible:v=>visible=v,setReducedMotion:v=>reduced=v,setZoom(){},setRoads(){},setFrameLoad(){},get positionSamples(){return[];},get stats(){return{allocatedVehicles:1};},destroy(){destroyed++;}};};
 const roads={schema_version:1,city:'berlin',source_snapshot:'test',source_pbf_sha256:'a'.repeat(64),source_url:'https://www.openstreetmap.org',city_boundary_sha256:'b'.repeat(64),role:'decorative-schematic',partial:true,roads:[{id:'osm/way/1/clip/0',source_way_id:1,coordinates:[[13,52],[13.002,52.002]],direction:1,source_tags:{highway:'residential'},source_url:'https://www.openstreetmap.org/way/1'}]};
 const map={on:(name,fn)=>events.set(name,fn),off:name=>events.delete(name),getZoom:()=>zoom,getBounds:()=>({getWest:()=>12,getSouth:()=>51,getEast:()=>14,getNorth:()=>53}),getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),removeLayer:id=>layers.delete(id)};
 const scenery=installThreeDimensionalScenery({map,city:'berlin',locale:'en',host:{append(){}},buildingLayer:()=>undefined,frameClock:sharedClock,read:async()=>++reads===1?{schema_version:1,city:'berlin',role:'decorative-schematic',partial:true,snapshot:'test',source_pbf_sha256:'a'.repeat(64),data:{path:'/safety/buildings3d/roads.json',bytes:100,sha256:'b'.repeat(64)}}:roads});
 const ready=async()=>{for(let i=0;i<10&&scenery.stats.state!=='ready';i++)await tick();assert.equal(scenery.stats.state,'ready');assert(enabled);};
 const settle=()=>{events.get('moveend')();assert.equal(timers.size,1);assert(scenery.stats.settlePending);};
 events.get('moveend')();assert.equal(timers.size,0);scenery.setMode(true);await ready();
 settle();scenery.setVisible(false);assert.equal(timers.size,0);assert(!enabled&&!visible);events.get('moveend')();assert.equal(timers.size,0);scenery.setVisible(true);await ready();
 settle();scenery.setReducedMotion(true);assert.equal(timers.size,0);assert(!enabled&&reduced);events.get('moveend')();assert.equal(timers.size,0);scenery.setReducedMotion(false);await ready();
 settle();scenery.setViewportVisible(false);assert.equal(timers.size,0);assert(!enabled&&!visible);events.get('moveend')();assert.equal(timers.size,0);scenery.setViewportVisible(true);await ready();
 settle();scenery.suspend();assert.equal(timers.size,0);assert(!enabled);scenery.resume();await ready();
 zoom=10;events.get('moveend')();assert.equal(timers.size,0);zoom=18;settle();scenery.setMode(false);assert.equal(timers.size,0);assert.equal(destroyed,1);assert.equal(layers.size,0);scenery.destroy();assert.equal(events.size,0);assert.equal(timers.size,0);
});

const {createAnimatedVehicles,compactCarMesh,writeVehicleInstances,createVehiclePositionScratch}=await module('animated-vehicles.ts');
const {allocateVehicleSlots}=await module('vehicle-density-policy.ts');
test('retained white car shell and deterministic full-path cohort keep one batch, cached uniforms and bounded lifecycle',()=>{
 const mesh=compactCarMesh();assert.equal(mesh.vertices,44);assert.equal(mesh.triangles,22);
 let next=0,uniformQueries=0,parameterQueries=0,batches=0,deletedBuffers=0,deletedVaos=0,deletedPrograms=0,time=0;
 const subscriptions=new Set(),frameClock={subscribe(s){subscriptions.add(s);return()=>subscriptions.delete(s);},wake(){}};
 const gl={createVertexArray:()=>({id:++next}),createBuffer:()=>({id:++next}),createShader:()=>({id:++next}),createProgram:()=>({id:++next}),getShaderParameter:()=>true,getProgramParameter:()=>true,getParameter:()=>{parameterQueries++;return null;},getUniformLocation:()=>{uniformQueries++;return{};},getAttribLocation:()=>0,isContextLost:()=>false,drawElementsInstanced:()=>batches++,deleteBuffer:()=>deletedBuffers++,deleteVertexArray:()=>deletedVaos++,deleteProgram:()=>deletedPrograms++};
 for(const name of ['shaderSource','compileShader','attachShader','linkProgram','deleteShader','bindVertexArray','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','vertexAttribDivisor','bufferSubData','useProgram','enable','depthFunc','depthMask','disable','uniformMatrix4fv'])gl[name]=()=>{};
 for(const [i,key]of ['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','DEPTH_TEST','LEQUAL','BLEND','CULL_FACE','TRIANGLES','UNSIGNED_SHORT'].entries())gl[key]=i+1;
 const vehicles=createAnimatedVehicles({triggerRepaint(){}},'berlin',{clock:()=>time,frameClock});
 const roads={schema_version:1,city:'berlin',source_snapshot:'test',source_pbf_sha256:'a'.repeat(64),source_url:'https://www.openstreetmap.org',city_boundary_sha256:'b'.repeat(64),role:'decorative-schematic',partial:true,roads:[{id:'osm/way/1/clip/0',source_way_id:1,coordinates:[[13,52],[13.002,52.002]],direction:1,source_tags:{highway:'residential'},source_url:'https://www.openstreetmap.org/way/1'}]};
 vehicles.setRoads(roads);vehicles.setEnabled(true);vehicles.layer.onAdd({},gl);assert.equal(subscriptions.size,1);
 const matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);vehicles.layer.render(gl,matrix);time=100;vehicles.layer.render(gl,matrix);assert.equal(uniformQueries,1);assert.equal(parameterQueries,2);assert(batches>0);assert.equal(vehicles.stats.drawBatchesPerFrame,1);assert.equal(vehicles.stats.logicalGPUBufferBytes,mesh.vertexData.byteLength+mesh.indices.byteLength+vehicles.stats.allocatedInstanceBytes);assert.equal(vehicles.stats.meshTrianglesPerVehicle,22);assert.equal(vehicles.stats.thinningFactor,5);
 vehicles.setVisible(false);assert.equal(subscriptions.size,0);vehicles.setVisible(true);assert.equal(subscriptions.size,1);vehicles.setReducedMotion(true);assert.equal(subscriptions.size,0);vehicles.setReducedMotion(false);vehicles.layer.onRemove();assert.equal(subscriptions.size,0);assert.equal(deletedBuffers,3);assert.equal(deletedVaos,1);assert.equal(deletedPrograms,1);vehicles.destroy();
});

test('fixed vehicle instances use deterministic source paths and reject coincident centres',()=>{
 const paths=[{key:'one',points:[[0,0],[100,0]],lengths:[0,100],length:100,visibleLength:100}];const slots=allocateVehicleSlots(paths,128,64),out=new Float32Array(64*3),scratch=createVehiclePositionScratch(128,1);const count=writeVehicleInstances(paths,slots,3,out,scratch);assert(count>0);const expected=out.slice(0,count*3);assert.equal(writeVehicleInstances(paths,slots,3,out,scratch),count);assert.deepEqual(out.slice(0,count*3),expected);assert.equal(scratch.duplicateRejected,0);
 const duplicate=[slots[0],slots[0]];assert.equal(writeVehicleInstances(paths,duplicate,3,out,scratch),1);assert.equal(scratch.duplicateRejected,1);
});
