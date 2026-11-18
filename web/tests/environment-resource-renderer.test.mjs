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

// WebGL2 fake with real fence/loss semantics and allocation counters. GL
// state answers follow the existing environment renderer fixtures.
function fakeGL(){
 let n=1,boundArray=null,boundElement=null,vao=null,program=null,texture=null,framebuffer=null,lost=false,signaled=true;
 const enabled=new Set(),uniforms=new Map(),writes=[],draws=[],sources=[],counts={buffers:0,vaos:0,deletedBuffers:0,fences:0};const g={};
 for(const key of ['DRAW_FRAMEBUFFER_BINDING','DRAW_FRAMEBUFFER','FRAMEBUFFER_COMPLETE','MAX_TEXTURE_SIZE','SAMPLER_BINDING','DEPTH_RANGE','STENCIL_WRITEMASK','STENCIL_BACK_WRITEMASK','STENCIL_TEST','SCISSOR_TEST','COLOR_WRITEMASK','FRONT','BACK','R8','RED','RGBA8','RGBA','UNSIGNED_BYTE','COLOR','MAX','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','NEAREST','CLAMP_TO_EDGE','COLOR_ATTACHMENT0','ACTIVE_TEXTURE','TEXTURE0','TEXTURE_BINDING_2D','TEXTURE_2D','VIEWPORT','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','CURRENT_PROGRAM','DEPTH_TEST','BLEND','CULL_FACE','DEPTH_WRITEMASK','DEPTH_FUNC','LINE_WIDTH','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','FUNC_ADD','FUNC_SUBTRACT','FUNC_REVERSE_SUBTRACT','MIN','ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','STATIC_DRAW','DYNAMIC_DRAW','VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','FLOAT','LEQUAL','LESS','TRIANGLES','LINES','UNSIGNED_INT','UNSIGNED_SHORT','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','TIMEOUT_EXPIRED','WAIT_FAILED'])g[key]=n++;
 const equations=[g.FUNC_ADD,g.FUNC_ADD],blend=[1,0,1,0];let depthFunction=g.LEQUAL,depthWrite=true;
 Object.assign(g,{writes,draws,sources,counts,canvas:{clientWidth:1280,clientHeight:800},setLost(v){lost=v;},setSignaled(v){signaled=v;},
  activeTexture(){},bindTexture:(_t,v)=>texture=v,bindSampler(){},createTexture:()=>({id:n++}),deleteTexture(){},createFramebuffer:()=>({id:n++}),deleteFramebuffer(){},bindFramebuffer:(_t,v)=>framebuffer=v,texImage2D(){},texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>g.FRAMEBUFFER_COMPLETE,clearBufferfv(){},viewport(){},colorMask(){},stencilMaskSeparate(){},
  createVertexArray:()=>{counts.vaos++;return{id:n++};},createBuffer:()=>{counts.buffers++;return{id:n++};},createProgram:()=>({id:n++}),createShader:()=>({id:n++}),shaderSource:(_s,text)=>sources.push(text),compileShader(){},getShaderParameter:()=>true,attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(){},getProgramParameter:()=>true,deleteShader(){},deleteBuffer:()=>counts.deletedBuffers++,deleteVertexArray(){},deleteProgram(){},
  bindVertexArray:v=>vao=v,bindBuffer:(target,b)=>{if(target===g.ARRAY_BUFFER)boundArray=b;else boundElement=b;},bufferData:(target,data)=>writes.push({target,buffer:target===g.ARRAY_BUFFER?boundArray:boundElement,bytes:typeof data==='number'?data:data.byteLength}),bufferSubData:(target,offset,data)=>writes.push({target,buffer:target===g.ARRAY_BUFFER?boundArray:boundElement,offset,bytes:data.byteLength,sub:true}),
  getAttribLocation:(_p,name)=>({a_position:0,a_normal:1,a_role:2,a_tree:3}[name]??-1),enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},getUniformLocation:(_p,name)=>name,uniform1f:(k,v)=>uniforms.set(k,v),uniform1i:(k,v)=>uniforms.set(k,v),uniform2f:(k,...v)=>uniforms.set(k,v),uniform2fv:(k,v)=>uniforms.set(k,v),uniform3fv:(k,v)=>uniforms.set(k,v),uniform4fv:(k,v)=>uniforms.set(k,v),uniform3f:(k,...v)=>uniforms.set(k,v),uniformMatrix4fv:(k,_t,v)=>uniforms.set(k,Array.from(v)),
  useProgram:p=>program=p,enable:key=>enabled.add(key),disable:key=>enabled.delete(key),isEnabled:key=>enabled.has(key),depthFunc:v=>depthFunction=v,depthMask:v=>depthWrite=v,lineWidth(){},isContextLost:()=>lost,blendEquationSeparate:(rgb,alpha)=>equations.splice(0,2,rgb,alpha),blendFuncSeparate:(...v)=>blend.splice(0,4,...v),
  drawArrays:(mode,_f,count)=>draws.push({mode,count}),drawElementsInstanced:(mode,count,type,offset,instances)=>draws.push({mode,count,type,offset,instances}),
  fenceSync:()=>{counts.fences++;return{id:n++};},flush(){},deleteSync(){},clientWaitSync:()=>signaled?g.ALREADY_SIGNALED:g.TIMEOUT_EXPIRED,
  getParameter:key=>key===g.BLEND_EQUATION_RGB?equations[0]:key===g.BLEND_EQUATION_ALPHA?equations[1]:key===g.MAX_TEXTURE_SIZE?8192:key===g.DRAW_FRAMEBUFFER_BINDING?framebuffer:key===g.SAMPLER_BINDING?null:key===g.COLOR_WRITEMASK?[true,true,true,true]:key===g.DEPTH_RANGE?[0,1]:key===g.STENCIL_WRITEMASK||key===g.STENCIL_BACK_WRITEMASK?255:key===g.VIEWPORT?[0,0,1280,800]:key===g.ACTIVE_TEXTURE?g.TEXTURE0:key===g.TEXTURE_BINDING_2D?texture:key===g.VERTEX_ARRAY_BINDING?vao:key===g.ARRAY_BUFFER_BINDING?boundArray:key===g.CURRENT_PROGRAM?program:key===g.DEPTH_FUNC?depthFunction:key===g.DEPTH_WRITEMASK?depthWrite:key===g.LINE_WIDTH?1:key===g.BLEND_SRC_RGB?blend[0]:key===g.BLEND_DST_RGB?blend[1]:key===g.BLEND_SRC_ALPHA?blend[2]:key===g.BLEND_DST_ALPHA?blend[3]:g.LEQUAL,
 });
 return g;
}
function setup(limitBytes=64*MiB){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=m.createChunkResourceStore({budget});let repaints=0,frames=0;
 const map={triggerRepaint(){repaints++;}};
 const create=()=>m.createEnvironmentSceneRenderer(map,{origin:[13.4,52.5],resourceStore:store,onFrameNeeded(){frames++;}});
 return{budget,store,map,create,get repaints(){return repaints;},get frames(){return frames;}};
}
const lastWrite=(gl,buffer)=>gl.writes.filter(w=>w.buffer===buffer&&!w.sub).at(-1)?.bytes;
const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const ledger=f=>({pressure:f.budget.stats.pressureEvents,evictions:f.budget.stats.evictionAttempts,wakeups:f.budget.stats.availabilityEvents});
const turns=async(count=1)=>{for(let i=0;i<count;i++)await new Promise(resolve=>setImmediate(resolve));};
// sha256 of the four GLSL texts bundled from `git show HEAD:` sources (every
// transitive import read from HEAD), independent of this renderer's constants.
const HEAD_GLSL_SHA256=['b7f1761dfa8fe7bd1c49a2740aba619932f9ad100b5dec037ee4c39d2e5cd5c9','fd95b8f8498e797f4825dfa8d8eb705299f5db0e76b6c23e50ac14cd6ce7a815','ecca04f80d5c0e689eedae69ea9fba119560a4bd56d5e776e37b93e8cc207986','1218e3e525365904d85a2175e25160629c104cf54630138f894a10306bbbc005'];
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
 assert.deepEqual(gl.sources.map(text=>crypto.createHash('sha256').update(text).digest('hex')),HEAD_GLSL_SHA256,'the submitted shader texts are byte-identical to git HEAD');
 assert.equal(gl.counts.buffers,7);assert.equal(gl.counts.vaos,4);
 const allocated=gl.writes.filter(w=>!w.sub).reduce((sum,w)=>sum+w.bytes,0),claims=r.stats.resources.gpu.claims;
 assert.equal(claims.fixed+claims.water,allocated,'ledger claim equals the actual bufferData storage');
 // +131452: the constant program allowance admitted in the same GPU decision
 // (DECISIONS 2026-11-02 03:25 policy estimate: 2 programs x (3 UTF-16 copies of
 // source and attribute names + 16 KiB) + 4 VAOs x (256 + 4 x 64) bytes).
 assert.equal(f.budget.stats.bytes,fixed+allocated+131452);
 r.destroy();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0,'destroy returns fixed, publication and fenced GPU claims');f.store.destroy();
});

test('GPU refusal creates no VAO or buffer and waits for one ledger wake-up before allocating in render',async()=>{
 const f=setup(2*MiB),r=f.create(),gl=fakeGL();
 const blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-1024,precision:'exact'});
 r.layer.onAdd({},gl);
 assert.equal(gl.counts.buffers,0,'no buffer before admission');assert.equal(gl.counts.vaos,0);assert.equal(gl.writes.length,0);
 assert.equal(r.stats.resources.gpuDeferred,true);assert.ok(r.stats.resources.gpuPending.requiredBytes>1024);assert.equal(f.budget.stats.availabilityListeners,1);
 r.setEnabled(true);assert.equal(r.stats.animationActive,false,'a deferred renderer requests no animation frames');
 const repaints=f.repaints,waiting=ledger(f);
 for(let i=0;i<5;i++)r.layer.render({},identity);
 assert.equal(gl.counts.buffers,0,'render does not poll the ledger while waiting');
 assert.deepEqual(ledger(f),waiting,'frames before the wake-up run no admission, pressure eviction or wake-up');
 // A wake-up whose retry is still refused costs exactly one admission attempt.
 blocker.release();const second=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-1024,precision:'exact'});await turns();
 assert.ok(f.repaints>repaints,'availability repaints through the map');assert.equal(f.frames,1,'and wakes the shared frame owner once');
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
