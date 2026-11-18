import {environmentLedgerGL as fakeGL,projectionMatrix as identity} from './support/environment-ledger-webgl.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=`export {createEnvironmentSceneRenderer} from './environment-scene-renderer';export {prepareSolarShadowBoundary} from './solar-shadow-admission';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';export * from './environment-resource-budget';export * from './environment-resource-publication';export {ENVIRONMENT_SCENE_VERTEX_GLSL,ENVIRONMENT_SCENE_FRAGMENT_GLSL} from './environment-scene-shaders';export {GREEN_GROUND_VERTEX_GLSL,GREEN_GROUND_FRAGMENT_GLSL} from './environment-green-ground';`;
// Delegates to the real motion state unless a test injects a failure that
// happens after the renderer's fixed CPU admission (construction-failure exit).
const constructionProbe={name:'construction-failure-probe',setup(b){b.onResolve({filter:/^\.\/environment-motion$/},()=>({path:'environment-motion-probe',namespace:'probe'}));b.onLoad({filter:/.*/,namespace:'probe'},()=>({contents:`import {createEnvironmentMotion as actual} from ${JSON.stringify(path.join(safety,'environment-motion.ts'))};export function createEnvironmentMotion(...args){if(globalThis.__environmentResourceConstructionFailure)throw Error('injected construction failure');return actual(...args);}`,loader:'js',resolveDir:safety}));}};
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022',preserveSymlinks:true,plugins:[constructionProbe]});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const MiB=1024*1024,sha='d'.repeat(64);
const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
m.prepareSolarShadowBoundary({boundarySHA256:sha,geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6)]}});
const props={source_boundary_sha256:sha,source_pbf_sha256:'e'.repeat(64),source_snapshot:'fixture',displayClip:false,osmTags:{height:'12'},tree_crown_display_5m_guard:true};
const feature=(id,kind,geometry)=>({type:'Feature',id,geometry,properties:{...props,kind}});
const point=feature('osm/node/1','tree',{type:'Point',coordinates:[13.4,52.5]});
const water=feature('osm/way/2','water',{type:'Polygon',coordinates:[square(13.4001,52.5001,13.4005,52.5005),square(13.4002,52.5002,13.4003,52.5003)]});
const bounds=[13.3,52.4,13.5,52.6];

function setup(limitBytes=64*MiB){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=m.createChunkResourceStore({budget});let repaints=0,frames=0;
 const map={triggerRepaint(){repaints++;}};
 const create=()=>m.createEnvironmentSceneRenderer(map,{origin:[13.4,52.5],resourceStore:store,onFrameNeeded(){frames++;}});
 return{budget,store,map,create,get repaints(){return repaints;},get frames(){return frames;}};
}
const lastWrite=(gl,buffer)=>gl.writes.filter(w=>w.buffer===buffer&&!w.sub).at(-1)?.bytes;

const ledger=f=>({pressure:f.budget.stats.pressureEvents,evictions:f.budget.stats.evictionAttempts,wakeups:f.budget.stats.availabilityEvents});
const turns=async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>setImmediate(resolve));};
// Pinned outputs for the reviewed environment and green-ground shader sources.
const EXPECTED_GLSL_SHA256=['b7f1761dfa8fe7bd1c49a2740aba619932f9ad100b5dec037ee4c39d2e5cd5c9','78c219ca239a6616993e90b8f3095d2851cd55442e98e5e839b024dfbab131dc','ecca04f80d5c0e689eedae69ea9fba119560a4bd56d5e776e37b93e8cc207986','3df2bc46ca55e361ae0cab174367ed63c1f0a2f0cc67abb7eef129bf40efdb91'];
// Fixed GPU storage of one renderer (2048 trees), measured from an actual onAdd.
function fixedGpuBytes(){const f=setup(),r=f.create();r.layer.onAdd({},fakeGL());const bytes=r.stats.resources.gpu.claims.fixed;r.destroy();f.store.destroy();return bytes;}
// Budget left so that the fixed buffers alone fit, but fixed + current water do not.
function deferGpu(f,r){
 const evidence=r.waterAdmissionEvidence,water=evidence.positions.byteLength+evidence.indices.byteLength,fixed=fixedGpuBytes();
 assert.ok(water>0&&fixed>0);return f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-fixed-Math.floor(water/2),precision:'exact'});
}
const ring=(i)=>feature('osm/way/'+(100+i),'water',{type:'Polygon',coordinates:[Array.from({length:401},(_,k)=>{const a=k%400/400*2*Math.PI;return[13.4+.001*Math.cos(a)+i*.002,52.5+.001*Math.sin(a)];})]});

test('onAdd submits the unchanged shader constants and charges exactly the GPU storage it then allocates',()=>{
 const f=setup(),r=f.create(),gl=fakeGL(),fixed=m.environmentRendererFixedCosts(2048).reduce((n,c)=>n+c.bytes,0);
 assert.equal(f.budget.stats.bytes,fixed,'fixed tree storage is charged at construction');assert.equal(r.stats.resources.fixedCPUBytes,fixed);
 r.layer.onAdd({},gl);
 assert.deepEqual(gl.sources,[m.ENVIRONMENT_SCENE_VERTEX_GLSL,m.ENVIRONMENT_SCENE_FRAGMENT_GLSL,m.GREEN_GROUND_VERTEX_GLSL,m.GREEN_GROUND_FRAGMENT_GLSL],'budget admission must not alter shader output');
 assert.deepEqual(gl.sources.map(text=>crypto.createHash('sha256').update(text).digest('hex')),EXPECTED_GLSL_SHA256,'the submitted shader texts match the reviewed sources');
 assert.equal(gl.counts.buffers,7);assert.equal(gl.counts.vaos,4);
 const allocated=gl.writes.filter(w=>!w.sub).reduce((sum,w)=>sum+w.bytes,0),claims=r.stats.resources.gpu.claims;
 assert.equal(claims.fixed+claims.water,allocated,'ledger claim equals the actual bufferData storage');
 // +134548: the constant program allowance admitted in the same GPU decision
 // (DECISIONS 2026-11-02 03:25 policy estimate: 2 programs x (3 UTF-16 copies of
 // source and attribute names + 16 KiB) + 4 VAOs x (256 + 4 x 64) bytes).
 assert.equal(f.budget.stats.bytes,fixed+allocated+134548);
 r.destroy();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0,'destroy returns fixed, publication and fenced GPU claims');f.store.destroy();
});

test('GPU refusal creates no VAO or buffer and waits for one ledger wake-up before allocating in render',async()=>{
 const f=setup(2*MiB),r=f.create(),gl=fakeGL();
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-1024,precision:'exact'});
 r.layer.onAdd({},gl);
 assert.equal(gl.counts.buffers,0,'no buffer before admission');assert.equal(gl.counts.vaos,0);assert.equal(gl.writes.length,0);
 assert.equal(r.stats.resources.gpuDeferred,true);assert.ok(r.stats.resources.gpuPending.requiredBytes>1024);assert.equal(f.budget.stats.availabilityListeners,1);
 r.setEnabled(true);assert.equal(r.stats.animationActive,false,'a deferred renderer requests no animation frames');
 const repaints=f.repaints,frames=f.frames,waiting=ledger(f);
 for(let i=0;i<5;i++)r.layer.render({},identity);
 assert.equal(gl.counts.buffers,0,'render does not poll the ledger while waiting');
 assert.deepEqual(ledger(f),waiting,'frames before the wake-up run no admission, pressure eviction or wake-up');
 // A wake-up whose retry is still refused costs exactly one admission attempt.
 blocker.release();const second=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-1024,precision:'exact'});await turns();
 assert.ok(f.repaints>repaints,'availability repaints through the map');assert.equal(f.frames-frames,1,'and wakes the shared frame owner once');
 const woken=ledger(f);for(let i=0;i<5;i++)r.layer.render({},identity);
 assert.equal(f.budget.stats.pressureEvents,woken.pressure+1,'one retry per wake-up, then it waits again');assert.equal(f.budget.stats.availabilityEvents,woken.wakeups,'the refused retry releases nothing');
 assert.equal(gl.counts.buffers,0);assert.equal(f.budget.stats.availabilityListeners,1);
 second.release();await turns();assert.equal(f.budget.stats.availabilityListeners,0);
 r.layer.render({},identity);
 assert.equal(gl.counts.buffers,7);assert.equal(gl.counts.vaos,4);assert.equal(r.stats.resources.gpuDeferred,false);assert.ok(r.stats.resources.gpuBytes>0);
 r.destroy();f.store.destroy();
});

test('a refused fixed+water GPU admission neither leaves nor releases a claim, so it wakes no waiter',()=>{
 const f=setup(16*MiB),r=f.create();r.setFeatures([point,water],bounds,new Set([water]));
 const blocker=deferGpu(f,r),before={bytes:f.budget.stats.bytes,reservations:f.budget.stats.reservations,wakeups:f.budget.stats.availabilityEvents};
 const gl=fakeGL();r.layer.onAdd({},gl);
 assert.equal(r.stats.resources.gpuDeferred,true,'the fixed buffers alone would fit; fixed plus water does not');
 assert.equal(gl.counts.buffers,0);assert.deepEqual(r.stats.resources.gpu.claims,{},'no keyed claim is left behind');
 assert.equal(f.budget.stats.bytes,before.bytes);assert.equal(f.budget.stats.reservations,before.reservations);
 assert.equal(f.budget.stats.availabilityEvents,before.wakeups,'nothing was reserved and released, so nobody is woken');
 blocker.release();r.destroy();f.store.destroy();
});

test('a deferred renderer and a waiting publication stay idle until a real release: no self-sustaining repaint',async()=>{
 const f=setup(16*MiB),r=f.create();r.setFeatures([point,water],bounds,new Set([water]));
 const blocker=deferGpu(f,r),gl=fakeGL();r.layer.onAdd({},gl);r.setEnabled(true);assert.equal(r.stats.resources.gpuDeferred,true);
 const huge=Array.from({length:40},(_,i)=>ring(i)),abort=new AbortController();
 const pending=m.retryEnvironmentAdmission(f.budget,abort.signal,'environment publication',()=>r.setFeatures(huge,bounds,new Set(huge)));pending.catch(()=>{});
 assert.equal(r.stats.resources.refusedPublications,1);
 const start=ledger(f);let seen=f.repaints,frames=1;r.layer.render({},identity); // one external frame only
 for(let i=0;i<40;i++){await turns();if(f.repaints>seen){seen=f.repaints;r.layer.render({},identity);frames++;}}
 assert.equal(frames,1,'no repaint is requested without a real release');assert.deepEqual(ledger(f),start,'neither waiter retried, evicted or woke anyone');
 assert.equal(r.stats.resources.refusedPublications,1);assert.equal(f.budget.stats.availabilityListeners,2,'both wait on the ledger');
 blocker.release();await pending;for(let i=0;i<4&&r.stats.resources.gpuDeferred;i++){await turns();if(f.repaints>seen){seen=f.repaints;r.layer.render({},identity);frames++;}}
 assert.equal(r.stats.resources.gpuDeferred,false,'one real release admits both');assert.equal(frames,2);assert.equal(r.stats.resources.admittedPublications,2);
 assert.equal(r.stats.resources.gpu.claims.water,r.waterAdmissionEvidence.positions.byteLength+r.waterAdmissionEvidence.indices.byteLength);
 abort.abort();r.destroy();f.store.destroy();
});

test('a construction failure after the fixed CPU admission returns that claim before rethrowing',t=>{
 const f=setup();t.after(()=>{delete globalThis.__environmentResourceConstructionFailure;});
 globalThis.__environmentResourceConstructionFailure=true;
 assert.throws(()=>f.create(),/injected construction failure/);
 assert.equal(f.budget.stats.bytes,0,'the fixed CPU claim is not leaked');assert.equal(f.budget.stats.reservations,0);
 delete globalThis.__environmentResourceConstructionFailure;
 const r=f.create();assert.equal(f.budget.stats.bytes,m.environmentRendererFixedCosts(2048).reduce((n,c)=>n+c.bytes,0));r.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('a refused publication keeps the previous CPU arrays, GPU contents and evidence; unfit input is explicit',()=>{
 const f=setup(),r=f.create(),gl=fakeGL();r.layer.onAdd({},gl);r.setSceneEnvironment({instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'balanced'});
 r.setFeatures([point,water],bounds,new Set([water]));
 const evidence=r.waterAdmissionEvidence,trees=r.stats.trees,writes=gl.writes.length,claim=r.stats.resources.publicationBytes;
 assert.ok(claim>0);assert.equal(r.stats.resources.admittedPublications,1);
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes,precision:'exact'});
 const larger=feature('osm/way/3','water',{type:'Polygon',coordinates:[square(13.41,52.51,13.42,52.52)]});
 assert.throws(()=>r.setFeatures([point,water,larger],bounds,new Set([water,larger])),m.EnvironmentResourcePendingError);
 assert.deepEqual(r.waterAdmissionEvidence,evidence,'refusal happens before any construction');assert.equal(r.stats.trees,trees);assert.equal(gl.writes.length,writes,'no upload');
 assert.equal(r.stats.resources.publicationBytes,claim);assert.equal(r.stats.resources.refusedPublications,1);
 blocker.release();r.setFeatures([point,water,larger],bounds,new Set([water,larger]));assert.ok(r.waterAdmissionEvidence.triangleIndexCount>evidence.triangleIndexCount);
 r.destroy();
 const small=setup(m.environmentRendererFixedCosts(2048).reduce((n,c)=>n+c.bytes,0)+64*1024),tiny=small.create(),huge=Array.from({length:40},(_,i)=>feature('osm/way/'+(100+i),'water',{type:'Polygon',coordinates:[Array.from({length:401},(_,k)=>{const a=k%400/400*2*Math.PI;return[13.4+.001*Math.cos(a)+i*.002,52.5+.001*Math.sin(a)];})]}));
 assert.throws(()=>tiny.setFeatures(huge,bounds,new Set(huge)),m.EnvironmentResourceUnfitError,'a publication above the whole page limit never waits forever');
 tiny.destroy();f.store.destroy();small.store.destroy();
});

test('the publication bound is a strict upper bound of packed arrays and water GPU storage',()=>{
 const holes=[square(13.41,52.51,13.43,52.53),square(13.415,52.515,13.417,52.517),square(13.42,52.52,13.422,52.522)];
 const ring=(cx,cy,r,count)=>{const p=Array.from({length:count},(_,k)=>{const a=k/count*2*Math.PI;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];});p.push(p[0]);return p;};
 const features=[point,water,
  feature('osm/way/10','water',{type:'MultiPolygon',coordinates:[holes,[ring(13.45,52.55,.003,57)]]}),
  feature('osm/way/11','water_line',{type:'MultiLineString',coordinates:[[[13.40,52.50],[13.41,52.51],[13.42,52.50]],[[13.43,52.53],[13.44,52.54]]]}),
  feature('osm/way/12','green',{type:'Polygon',coordinates:[ring(13.36,52.46,.004,33),ring(13.36,52.46,.001,9)]}),
  feature('osm/way/13','green',{type:'MultiPolygon',coordinates:[[square(13.31,52.41,13.33,52.43)],[ring(13.38,52.48,.002,21)]]}),
  feature('osm/way/14','water',{type:'Polygon',coordinates:[ring(13.47,52.47,.002,40)]})];
 const admitted=new Set(features.filter(f=>f.properties.kind!=='green'&&f.id!=='osm/way/14'));
 for(const detail of ['full','ground']){
  const f=setup(),r=f.create(),gl=fakeGL();r.layer.onAdd({},gl);
  const input=detail==='ground'?features.filter(f=>f.properties.kind==='green'):features,bound=m.environmentPublicationBound(input,admitted,detail,2048);
  r.setFeatures(input,bounds,admitted,undefined,detail);
  const waterBytes=r.stats.resources.gpu.claims.water;
  assert.ok(waterBytes>0,detail+' publishes geometry');assert.ok(bound.packedBytes>=waterBytes,detail+' packed bound '+bound.packedBytes+' >= '+waterBytes);
  assert.equal(waterBytes,r.stats.waterVertices*28+r.stats.greenGround.vertices*28+(r.stats.waterTriangles*3+r.stats.unknownWidthWaterLineSegments*2+r.stats.greenGround.triangles*3)*4,'water claim is the exact packed upload');
  assert.ok(r.stats.resources.publicationBytes>=waterBytes,'retained CPU arrays stay charged after upload');
  assert.ok(bound.constructionBytes>0);
  r.destroy();f.store.destroy();
 }
 assert.equal(m.environmentPublicationBound([],undefined,'full',2048).constructionBytes,0,'an empty clear needs no admission');
});

test('context loss releases GPU claims at once, keeps the packed payload and restores it without rebuilding',()=>{
 const f=setup(),r=f.create(),gl=fakeGL();r.layer.onAdd({},gl);r.setFeatures([point,water],bounds,new Set([water]));
 const evidence=r.waterAdmissionEvidence,publication=r.stats.resources.publicationBytes,waterClaim=r.stats.resources.gpu.claims.water,gpu=r.stats.resources.gpuBytes,total=f.budget.stats.bytes;
 gl.setLost(true);r.layer.onRemove();
 assert.equal(r.stats.resources.gpuBytes,0);assert.equal(f.budget.stats.bytes,total-gpu,'lost GPU storage is not fenced or kept');assert.equal(f.budget.stats.retiringBytes,0);
 assert.equal(r.stats.resources.publicationBytes,publication,'packed CPU payload survives for restoration');
 gl.setLost(false);const before=gl.writes.length;r.layer.onAdd({},gl);
 assert.equal(r.stats.resources.gpu.claims.water,waterClaim);assert.deepEqual(r.waterAdmissionEvidence,evidence,'no re-decode or rebuild');
 const restored=gl.writes.slice(before).filter(w=>!w.sub).map(w=>w.bytes);assert.ok(restored.includes(evidence.positions.byteLength)&&restored.includes(evidence.indices.byteLength),'the retained water vertex and index arrays are uploaded again');
 assert.equal(f.budget.stats.bytes,total);
 gl.setSignaled(false);r.layer.onRemove();assert.equal(f.budget.stats.retiringBytes,gpu,'live removal keeps storage charged until its fence');
 f.store.collectRetired();assert.equal(f.budget.stats.retiringBytes,gpu);gl.setSignaled(true);f.store.collectRetired();assert.equal(f.budget.stats.retiringBytes,0);
 r.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});
