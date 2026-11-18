import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export * from './scene-solar-shadow'; export * from './planar-reflection-group';",resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {SCENE_SOLAR_SHADOW_GLSL,sceneSolarShadowProjection,sceneSolarReceiverMatrix,createSceneSolarShadow,withSceneSolarShadowReceiver,uploadSceneSolarShadowReceiver,planarReflectionGroup}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const preparationBuilt=await build({stdin:{contents:"export {createSolarShadowPreparationBudget} from './solar-shadow-preparation';export {ProgramPreparationPending} from './render-runtime/program-preparation';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {createSolarShadowPreparationBudget,ProgramPreparationPending}=await import('data:text/javascript;base64,'+Buffer.from(preparationBuilt.outputFiles[0].text).toString('base64'));
test('depth preparation observations preserve pending/cancelled/lost and never call them compile failures',()=>{
 for(const status of ['pending','cancelled','lost']){
  const events=[],budget=createSolarShadowPreparationBudget(event=>events.push(event)),pending=new ProgramPreparationPending(status);
  assert.throws(()=>budget.compile('family','epoch',()=>{throw pending;}),error=>error===pending);
  assert.deepEqual(events.map(event=>event.result),['started',status]);
  assert(events.every(event=>event.scope==='preparation-call'&&event.elapsed>=0));
  let called=false;assert.deepEqual(budget.compile('second','epoch',()=>{called=true;}),{status:'pending'});assert.equal(called,false);
 }
 const events=[],budget=createSolarShadowPreparationBudget(event=>events.push(event)),failure=new Error('actual link failure');
 assert.throws(()=>budget.compile('family','epoch',()=>{throw failure;}),error=>error===failure);
 assert.deepEqual(events.map(event=>event.result),['started','failed']);
});
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const transform=(m,p)=>Array.from({length:4},(_,r)=>p.reduce((sum,v,c)=>sum+m[c*4+r]*v,0));
const close=(a,b,eps=2e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function fakeGL(){
 let id=1000,active,read={id:'old-read'},draw={id:'old-draw'},lost=false,complete=true;
 const g={},values=new Map(),textures=new Map(),samplers=new Map(),enabled=new Set(),allocations=[],deleted=[],clears=[],uniforms=new Map(),calls=[];
 const keys=['ACTIVE_TEXTURE','TEXTURE0','TEXTURE_BINDING_2D','TEXTURE_2D','SAMPLER_BINDING','READ_FRAMEBUFFER_BINDING','DRAW_FRAMEBUFFER_BINDING','READ_FRAMEBUFFER','DRAW_FRAMEBUFFER','FRAMEBUFFER','RENDERBUFFER_BINDING','RENDERBUFFER','CURRENT_PROGRAM','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ARRAY_BUFFER','VIEWPORT','SCISSOR_BOX','DEPTH_CLEAR_VALUE','COLOR_WRITEMASK','DEPTH_WRITEMASK','DEPTH_FUNC','DEPTH_RANGE','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','CULL_FACE_MODE','FRONT_FACE','DEPTH_TEST','BLEND','CULL_FACE','SCISSOR_TEST','STENCIL_TEST','POLYGON_OFFSET_FILL','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','TEXTURE_COMPARE_MODE','NEAREST','CLAMP_TO_EDGE','DEPTH_COMPONENT24','DEPTH_COMPONENT','UNSIGNED_INT','DEPTH_ATTACHMENT','FRAMEBUFFER_COMPLETE','MAX_TEXTURE_SIZE','MAX_COMBINED_TEXTURE_IMAGE_UNITS','LEQUAL','DEPTH_BUFFER_BIT','NONE'];
 for(const key of keys)g[key]=id++;
 active=g.TEXTURE0+3;
 for(let i=0;i<32;i++){textures.set(g.TEXTURE0+i,i===0?{id:'source-atlas'}:i===15?{id:'foreign-slot15'}:null);samplers.set(i,i===15?{id:'foreign-sampler15'}:null);}
 for(const[key,value]of [['RENDERBUFFER_BINDING',{id:'old-rb'}],['CURRENT_PROGRAM',{id:'old-program'}],['VERTEX_ARRAY_BINDING',{id:'old-vao'}],['ARRAY_BUFFER_BINDING',{id:'old-array'}],['VIEWPORT',[23,47,995,467]],['SCISSOR_BOX',[1,2,22,33]],['DEPTH_CLEAR_VALUE',.8],['COLOR_WRITEMASK',[true,false,true,false]],['DEPTH_WRITEMASK',false],['DEPTH_FUNC',23],['DEPTH_RANGE',[.13,.91]],['BLEND_SRC_RGB',11],['BLEND_DST_RGB',12],['BLEND_SRC_ALPHA',13],['BLEND_DST_ALPHA',14],['BLEND_EQUATION_RGB',15],['BLEND_EQUATION_ALPHA',16],['CULL_FACE_MODE',17],['FRONT_FACE',18],['MAX_TEXTURE_SIZE',4096],['MAX_COMBINED_TEXTURE_IMAGE_UNITS',32]])values.set(g[key],value);
 for(const cap of [g.BLEND,g.CULL_FACE,g.SCISSOR_TEST,g.STENCIL_TEST,g.POLYGON_OFFSET_FILL])enabled.add(cap);
 const put=(key,value)=>values.set(g[key],value),object=kind=>({kind,id:id++});
 Object.assign(g,{allocations,deleted,clears,uniforms,calls,textures,samplers,getParameter(key){if(key===g.ACTIVE_TEXTURE)return active;if(key===g.TEXTURE_BINDING_2D)return textures.get(active)??null;if(key===g.SAMPLER_BINDING)return samplers.get(active-g.TEXTURE0)??null;if(key===g.READ_FRAMEBUFFER_BINDING)return read;if(key===g.DRAW_FRAMEBUFFER_BINDING)return draw;const v=values.get(key);return Array.isArray(v)?v.slice():v;},activeTexture:u=>active=u,bindTexture:(_t,t)=>textures.set(active,t),bindSampler:(u,s)=>samplers.set(u,s),bindFramebuffer:(target,f)=>{if(target!==g.DRAW_FRAMEBUFFER)read=f;if(target!==g.READ_FRAMEBUFFER)draw=f;},bindRenderbuffer:(_t,v)=>put('RENDERBUFFER_BINDING',v),useProgram:p=>put('CURRENT_PROGRAM',p),bindVertexArray:v=>put('VERTEX_ARRAY_BINDING',v),bindBuffer:(_t,b)=>put('ARRAY_BUFFER_BINDING',b),viewport:(...v)=>put('VIEWPORT',v),scissor:(...v)=>put('SCISSOR_BOX',v),clearDepth:v=>put('DEPTH_CLEAR_VALUE',v),colorMask:(...v)=>put('COLOR_WRITEMASK',v),depthMask:v=>put('DEPTH_WRITEMASK',v),depthFunc:v=>put('DEPTH_FUNC',v),depthRange:(...v)=>put('DEPTH_RANGE',v),blendFuncSeparate:(a,b,c,d)=>{put('BLEND_SRC_RGB',a);put('BLEND_DST_RGB',b);put('BLEND_SRC_ALPHA',c);put('BLEND_DST_ALPHA',d);},blendEquationSeparate:(a,b)=>{put('BLEND_EQUATION_RGB',a);put('BLEND_EQUATION_ALPHA',b);},cullFace:v=>put('CULL_FACE_MODE',v),frontFace:v=>put('FRONT_FACE',v),isEnabled:cap=>enabled.has(cap),enable:cap=>enabled.add(cap),disable:cap=>enabled.delete(cap),createTexture:()=>object('texture'),createFramebuffer:()=>object('fbo'),deleteTexture:o=>deleted.push(o),deleteFramebuffer:o=>deleted.push(o),texParameteri(){},texImage2D:(_t,_level,format,w,h,_border,type,storage,data)=>allocations.push({format,w,h,type,storage,data}),framebufferTexture2D:(...v)=>calls.push(['attachment',...v]),drawBuffers:v=>calls.push(['drawBuffers',v]),readBuffer:v=>calls.push(['readBuffer',v]),checkFramebufferStatus:()=>complete?g.FRAMEBUFFER_COMPLETE:-1,clear:mask=>clears.push(mask),isContextLost:()=>lost,setLost:v=>lost=v,setComplete:v=>complete=v,getUniformLocation:(_p,n)=>n,uniform1i:(n,v)=>uniforms.set(n,v),uniform1f:(n,v)=>uniforms.set(n,v),uniform2f:(n,...v)=>uniforms.set(n,v),uniform2fv:(n,v)=>uniforms.set(n,Array.from(v)),uniform4fv:(n,v)=>uniforms.set(n,Array.from(v)),uniformMatrix4fv:(n,_transpose,v)=>uniforms.set(n,Array.from(v)),snapshot:()=>JSON.stringify({active,read,draw,values:[...values.entries()],textures:[...textures.entries()],samplers:[...samplers.entries()],enabled:[...enabled].sort((a,b)=>a-b)})});
 return g;
}
function fixture(options){
 const gl=fakeGL(),core=createSceneSolarShadow(options),demands=[];let revision='resident/1',viewRevision=1,calls=0;
 const coverage={bounds:[.537,.328,0,.5371,.3281,.00001],triangles:180,draws:3,complete:true};
 const source={setCaptureDemand:change=>demands.push({...change,state:gl.snapshot()}),getSolarShadowRevision:()=>revision,getPlanarReflectionRevision:()=>revision+'/view/'+viewRevision,getSolarShadowCoverage:()=>coverage,renderPlanarReflection(pass){calls++;assert.equal(pass.purpose,'solar-depth');assert.equal(pass.maxTriangles,coverage.triangles);assert.equal(pass.maxDraws,coverage.draws);assert.deepEqual(gl.getParameter(gl.VIEWPORT),[0,0,core.stats.size,core.stats.size]);return{triangles:coverage.triangles,draws:coverage.draws,complete:true};}};
 core.setSource(source);return{gl,core,source,coverage,demands,args:{direction:[.5,Math.sqrt(.75),0],enabled:true,quality:'balanced'},get calls(){return calls;},revision:v=>revision=v,view:v=>viewRevision=v};
}

test('publication proof comes from a successful capture and is revoked before pending, failure and reset',()=>{
 for(const ending of ['pending','failure','reset','disabled','lost','destroy']){
  const f=fixture(),receipts=[];f.source.setSolarShadowPublication=value=>receipts.push(value);
  assert.equal(f.core.capture(f.gl,f.args),'ready');
  const proof=receipts.at(-1);assert.equal(proof.sourceRevision,'resident/1');
  assert.deepEqual(proof.bounds,f.coverage.bounds);assert.notEqual(proof.bounds,f.coverage.bounds);
  assert.deepEqual(proof.direction,f.args.direction);assert.equal(proof.targetSize,512);assert.equal(proof.complete,true);
  assert(Object.isFrozen(proof)&&Object.isFrozen(proof.bounds)&&Object.isFrozen(proof.direction));
  const count=receipts.length;f.core.capture(f.gl,f.args);assert.equal(receipts.length,count,'cache hit preserves the same publication');
  if(ending==='reset')f.core.resetGPU();
  else if(ending==='destroy')f.core.destroy();
  else{
   f.revision('resident/2');
   if(ending==='pending')f.source.prepareSolarShadow=()=>({status:'pending',ready:0,pending:1,failed:0});
   if(ending==='failure')f.source.renderPlanarReflection=()=>{throw Error('source failed');};
   if(ending==='disabled')f.args.enabled=false;
   if(ending==='lost')f.gl.setLost(true);
   f.core.capture(f.gl,f.args);
  }
  assert.equal(receipts.at(-1),undefined,ending);assert.equal(f.core.stats.published,false,ending);
  assert.equal(receipts.filter(Boolean).length,1,'no incomplete capture publishes a witness');
 }
});

test('real depth capture publication passes through nested groups only after publication and clears on loss',()=>{
 const f=fixture(),receipts=[];
 f.source.setSolarShadowPublication=value=>{if(value)assert.equal(f.core.stats.published,true);receipts.push(value);};
 f.core.setSource(planarReflectionGroup(()=>[planarReflectionGroup(()=>[f.source],{requireAll:true})],{requireAll:true}));
 assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(receipts.at(-1).sourceRevision,'resident/1');
 assert.deepEqual(receipts.at(-1).bounds,f.coverage.bounds);assert.equal(receipts.filter(Boolean).length,1);
 f.gl.setLost(true);f.core.capture(f.gl,f.args);assert.equal(receipts.at(-1),undefined);
 assert.equal(f.core.stats.published,false);
});

test('a content revision changing inside a depth draw cannot publish a stale witness',()=>{
 const f=fixture(),receipts=[],draw=f.source.renderPlanarReflection;
 f.source.setSolarShadowPublication=value=>receipts.push(value);
 f.source.renderPlanarReflection=pass=>{const result=draw(pass);f.revision('resident/changed');return result;};
 assert.equal(f.core.capture(f.gl,f.args),'failed');assert.match(f.core.stats.lastError,/revision changed during capture/);
 assert.equal(f.core.stats.published,false);assert.equal(receipts.filter(Boolean).length,0);
});

test('solar projection contains every resident corner and places the sunward surface closer in depth',()=>{
 const bounds=[.537,.328,0,.5372,.32815,.000013];
 for(const direction of [[1,.01,0],[.2,.7,-.4],[0,1,0]]){
  const {matrix,bias}=sceneSolarShadowProjection(bounds,direction,1024);
  for(const x of [bounds[0],bounds[3]])for(const y of [bounds[1],bounds[4]])for(const z of [bounds[2],bounds[5]])for(const v of transform(matrix,[x,y,z,1]).slice(0,3))assert.ok(Math.abs(v)<1);
  const center=[.5371,.328075,.0000065,1],sunward=[center[0]+direction[0]*1e-6,center[1]-direction[2]*1e-6,center[2]+direction[1]*1e-6,1];assert.ok(transform(matrix,sunward)[2]<transform(matrix,center)[2]);assert.ok(bias>0&&bias<.1);
 }
 assert.throws(()=>sceneSolarShadowProjection([2,0,0,1,1,1],[0,1,0],1024));
 assert.equal(sceneSolarReceiverMatrix(I,new Array(16).fill(0)),undefined);
});

test('actual world to camera to fragment to solar oracle uses viewport offsets, nonunit depth range and mirrored perspective',()=>{
 const solar=sceneSolarShadowProjection([.53,.32,0,.55,.34,.005],[.3,.9,-.2],1024).matrix;
 // Independent projective camera rows; world Mercator offsets, perspective w,
 // and a genuine mirror in world z. This is deliberately not an identity MVP.
 const base=[80,0,0,0, 0,70,0,0, 10,20,-50,-2, -43.2,-23.1,.1,1];
 const viewport=[23,47,995,467],range=[.13,.91];
 for(const mirror of [false,true]){
  const camera=base.slice();if(mirror)for(let r=0;r<4;r++)camera[8+r]=-camera[8+r];
  const receiver=sceneSolarReceiverMatrix(solar,camera);assert.ok(receiver);
  for(const p of [[.54,.33,.001,1],[.535,.326,.003,1],[.543,.334,.0002,1]]){
   const clip=transform(camera,p),ndc=clip.slice(0,3).map(v=>v/clip[3]);
   const frag=[viewport[0]+(ndc[0]+1)*viewport[2]/2,viewport[1]+(ndc[1]+1)*viewport[3]/2,range[0]+(ndc[2]+1)*(range[1]-range[0])/2];
   const reconstructed=[(frag[0]-viewport[0])/viewport[2]*2-1,(frag[1]-viewport[1])/viewport[3]*2-1,(frag[2]-range[0])/(range[1]-range[0])*2-1,1];
   const actual=transform(receiver,reconstructed),expected=transform(solar,p);for(let i=0;i<3;i++)close(actual[i]/actual[3],expected[i]/expected[3]);
  }
 }
});

test('one depth-only target captures complete resident geometry once and reuses it across camera-only revision changes',()=>{
 const f=fixture(),before=f.gl.snapshot();f.core.capture(f.gl,f.args);
 assert.equal(f.core.stats.status,'ready');assert.equal(f.calls,1);assert.equal(f.gl.snapshot(),before);assert.equal(f.gl.allocations.length,1);
 assert.deepEqual(f.gl.allocations[0],{format:f.gl.DEPTH_COMPONENT24,w:512,h:512,type:f.gl.DEPTH_COMPONENT,storage:f.gl.UNSIGNED_INT,data:null});
 assert.deepEqual(f.gl.calls.filter(v=>v[0]==='drawBuffers'),[['drawBuffers',[f.gl.NONE]]]);assert.deepEqual(f.gl.clears,[f.gl.DEPTH_BUFFER_BIT]);
 f.view(2);f.core.capture(f.gl,f.args);assert.equal(f.calls,1);assert.equal(f.core.stats.cacheHits,1);
 f.revision('resident/2');f.core.capture(f.gl,f.args);assert.equal(f.calls,2);assert.equal(f.gl.allocations.length,1);assert.equal(f.core.stats.allocatedGPUBytes,4*512*512);
});

test('receiver restores texture/sampler/active unit and nested scopes, including a disabled caster with sampler on 15',()=>{
 const f=fixture();f.core.capture(f.gl,f.args);const before=f.gl.snapshot(),p={};
 const answer=withSceneSolarShadowReceiver(f.gl,I,()=>{
  uploadSceneSolarShadowReceiver(f.gl,p);assert.equal(f.gl.uniforms.get('u_scene_shadow_enabled'),1);assert.equal(f.gl.uniforms.get('u_scene_shadow_map'),15);
  assert.deepEqual(f.gl.uniforms.get('u_scene_shadow_viewport'),[23,47,995,467]);f.gl.uniforms.get('u_scene_shadow_depth_range').forEach((v,i)=>close(v,[.13,.91][i]));
  const receiverTexture=f.gl.textures.get(f.gl.TEXTURE0+15);assert.equal(receiverTexture.kind,'texture');assert.equal(f.gl.samplers.get(15),null);
  withSceneSolarShadowReceiver(f.gl,I,()=>{uploadSceneSolarShadowReceiver(f.gl,p);assert.equal(f.gl.uniforms.get('u_scene_shadow_enabled'),0);assert.equal(f.gl.uniforms.get('u_scene_shadow_map'),15);assert.equal(f.gl.textures.get(f.gl.TEXTURE0+15),null);},true);
  assert.equal(f.gl.textures.get(f.gl.TEXTURE0+15),receiverTexture);uploadSceneSolarShadowReceiver(f.gl,p);assert.equal(f.gl.uniforms.get('u_scene_shadow_enabled'),1);return 42;
 });assert.equal(answer,42);assert.equal(f.gl.snapshot(),before);
 assert.throws(()=>withSceneSolarShadowReceiver(f.gl,I,()=>{throw Error('actual material error');}),/actual material/);assert.equal(f.gl.snapshot(),before);
 uploadSceneSolarShadowReceiver(f.gl,p);assert.equal(f.gl.uniforms.get('u_scene_shadow_enabled'),0);assert.equal(f.gl.uniforms.get('u_scene_shadow_map'),15);
});

test('capture detaches its texture from every source sampler slot, then restores bindings without framebuffer feedback',()=>{
 const f=fixture();f.core.capture(f.gl,f.args);let texture;
 withSceneSolarShadowReceiver(f.gl,I,()=>{texture=f.gl.textures.get(f.gl.TEXTURE0+15);});
 f.gl.activeTexture(f.gl.TEXTURE0+4);f.gl.bindTexture(f.gl.TEXTURE_2D,texture);f.gl.bindSampler(4,{id:'external-depth-sampler'});const before=f.gl.snapshot();
 f.source.renderPlanarReflection=()=>{for(const value of f.gl.textures.values())assert.notEqual(value,texture);uploadSceneSolarShadowReceiver(f.gl,{});assert.equal(f.gl.uniforms.get('u_scene_shadow_map'),15);assert.equal(f.gl.uniforms.get('u_scene_shadow_enabled'),0);return{triangles:180,draws:3,complete:true};};
 f.revision('resident/2');f.core.capture(f.gl,f.args);assert.equal(f.core.stats.status,'ready');assert.equal(f.gl.snapshot(),before);
});

test('incomplete coverage and source failure are unpublished and suppressed until a relevant key changes',()=>{
 const f=fixture();f.coverage.complete=false;f.core.capture(f.gl,f.args);assert.equal(f.calls,0);assert.equal(f.core.stats.published,false);assert.equal(f.gl.allocations.length,0);
 f.coverage.complete=true;f.core.capture(f.gl,f.args);assert.equal(f.calls,0,'same incomplete revision stays suppressed');f.revision('resident/ready');f.core.capture(f.gl,f.args);assert.equal(f.calls,1);
 f.source.renderPlanarReflection=()=>{throw Error('source material incomplete');};f.revision('resident/failed');const before=f.gl.snapshot();f.core.capture(f.gl,f.args);assert.equal(f.core.stats.status,'capture-failed');assert.equal(f.core.stats.published,false);assert.equal(f.gl.snapshot(),before);assert.equal(f.demands.at(-1).active,false);assert.equal(f.demands.at(-1).state,before,'failed drawing releases capture demand only after GL restoration');
 for(let i=0;i<20;i++)f.core.capture(f.gl,f.args);assert.equal(f.core.stats.failures,1);
 f.core.capture(f.gl,{...f.args,direction:[.6,.8,0]});assert.equal(f.core.stats.failures,2);
 f.source.renderPlanarReflection=()=>({triangles:181,draws:3,complete:true});f.revision('resident/overbudget');f.core.capture(f.gl,f.args);assert.equal(f.core.stats.published,false);
});

test('quality/mobile bounds, disabled/night/source switches, reset and destruction keep one owned target',()=>{
 for(const mobile of [false,true]){const f=fixture({mobile}),hold=label=>{f.revision(label);f.source.prepareSolarShadow=()=>({status:'pending',ready:0,pending:1,failed:0});assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.demands.at(-1).active,true);},retired=()=>{assert.equal(f.demands.at(-1).active,false);delete f.source.prepareSolarShadow;};
  // The target is a page-store GPU allocation keyed by size: a resize admits
  // the new target, then retires the previous objects (no in-place realloc).
  const created=[],live=()=>created.filter(value=>!f.gl.deleted.includes(value));
  for(const name of ['createTexture','createFramebuffer']){const create=f.gl[name];f.gl[name]=(...args)=>{const value=create(...args);created.push(value);return value;};}
  let previousSize=0;for(const [quality,size]of [['economy',512],['balanced',512],['detail',512]]){const before=live();f.core.capture(f.gl,{...f.args,quality});assert.equal(f.core.stats.size,size);assert.equal(f.core.stats.depthTextureObjects,1);assert.equal(f.core.stats.framebufferObjects,1);
   assert.deepEqual(live().map(value=>value.kind).sort(),['fbo','texture'],'exactly one owned target is live');
   if(size===previousSize)assert.deepEqual(live(),before,'an unchanged size keeps the same target objects');else assert.ok(before.every(value=>f.gl.deleted.includes(value)),'a resize retires the previous target objects');previousSize=size;}
  const replaced=f.gl.deleted.length;assert.equal(replaced,0);
  // Pending preparation never holds an unpublished target of another size; an equal-size target stays for the retry.
  hold('pending-disabled');assert.equal(live().length,2);
  f.core.capture(f.gl,{...f.args,enabled:false});retired();assert.equal(f.core.stats.allocatedGPUBytes,0);assert.equal(f.gl.deleted.length,replaced+2);assert.deepEqual(live(),[]);f.core.capture(f.gl,f.args);hold('pending-night');f.core.capture(f.gl,{...f.args,direction:[1,-.1,0]});retired();assert.equal(f.gl.deleted.length,replaced+4);assert.deepEqual(live(),[]);
  f.core.capture(f.gl,f.args);hold('pending-reset');f.core.resetGPU();retired();assert.equal(f.gl.deleted.length,replaced+6);assert.deepEqual(live(),[]);f.core.capture(f.gl,f.args);hold('pending-source');f.core.setSource(undefined);retired();assert.equal(f.gl.deleted.length,replaced+8);assert.deepEqual(live(),[]);f.core.setSource(f.source);f.core.capture(f.gl,f.args);hold('pending-destroy');f.core.destroy();retired();f.core.destroy();assert.equal(f.gl.deleted.length,replaced+10);assert.equal(new Set(f.gl.deleted).size,replaced+10);
  assert.deepEqual(new Set(f.gl.deleted),new Set(created),'every created target object is deleted exactly once');const calls=f.calls;f.core.capture(f.gl,f.args);assert.equal(f.calls,calls);assert.equal(f.core.stats.status,'destroyed');
 }
});

test('context loss in the source abandons owned objects and avoids invalid state restoration, then rebuilds once',()=>{
 const f=fixture(),original=f.source.renderPlanarReflection;let afterLossCalls=0;
 for(const name of Object.keys(f.gl)){if(typeof f.gl[name]!=='function'||['isContextLost','setLost','snapshot'].includes(name))continue;const old=f.gl[name];f.gl[name]=(...args)=>{if(f.gl.isContextLost())afterLossCalls++;return old(...args);};}
 f.source.renderPlanarReflection=()=>{f.gl.setLost(true);return{triangles:180,draws:3,complete:true};};f.core.capture(f.gl,f.args);assert.equal(f.core.stats.status,'context-lost');assert.equal(f.core.stats.published,false);assert.equal(f.demands.at(-1).active,false);assert.equal(afterLossCalls,0);assert.equal(f.core.stats.allocatedGPUBytes,0);
 f.gl.setLost(false);f.source.renderPlanarReflection=original;f.core.capture(f.gl,f.args);assert.equal(f.core.stats.status,'ready');assert.equal(f.gl.allocations.length,2);f.core.capture(f.gl,f.args);assert.equal(f.calls,1);
 const calls=f.calls;f.gl.setLost(true);assert.equal(withSceneSolarShadowReceiver(f.gl,I,()=>assert.fail('lost draw')),undefined);f.core.capture(f.gl,f.args);assert.equal(f.calls,calls);
});

test('allocation-stage loss stops before subsequent GL operations and an incomplete FBO never publishes',()=>{
 const f=fixture();let afterLoss=0;
 for(const name of Object.keys(f.gl)){if(typeof f.gl[name]!=='function'||['isContextLost','setLost','snapshot'].includes(name))continue;const old=f.gl[name];f.gl[name]=(...args)=>{if(f.gl.isContextLost())afterLoss++;const result=old(...args);if(name==='texImage2D')f.gl.setLost(true);return result;};}
 f.core.capture(f.gl,f.args);assert.equal(afterLoss,0);assert.equal(f.calls,0);assert.equal(f.core.stats.status,'context-lost');assert.equal(f.core.stats.depthTextureObjects,0);
 const invalid=fixture(),before=invalid.gl.snapshot();invalid.gl.setComplete(false);invalid.core.capture(invalid.gl,invalid.args);assert.equal(invalid.calls,0);assert.equal(invalid.core.stats.published,false);assert.equal(invalid.gl.snapshot(),before);invalid.core.capture(invalid.gl,invalid.args);assert.equal(invalid.core.stats.failures,1);invalid.core.destroy();assert.equal(invalid.gl.deleted.length,2);
});

test('PCF bias covers tap offset plus nearest-texel quantization on every sloped plane orientation',()=>{
 // Execute the production scalar expressions, then compare with independently
 // computed sampled-plane depths. No GPU threshold or witness is weakened.
 const expressions=SCENE_SOLAR_SHADOW_GLSL.match(/float slope=([^;]+);\s*float bias=([^;]+);/);assert.ok(expressions);
 const actualBias=new Function('facing','u_scene_shadow_bias','sqrt','max',`const slope=${expressions[1]};return ${expressions[2]};`);
 let oldViolations=0;
 const phases=[.001,.125,.499,.5,.500001,.501,.875,.999],taps=[-.5,.5];
 for(const bounds of [[-20,-20,0,20,20,23],[-25,-5,0,25,5,12]]){
  const p=sceneSolarShadowProjection(bounds,[-1/Math.sqrt(2.01),1/Math.sqrt(2.01),.1/Math.sqrt(2.01)],2048);
  const radii=[0,1,2].map(r=>1/Math.hypot(p.matrix[r],p.matrix[4+r],p.matrix[8+r]));
  for(const facing of [.05,.1,.2,.5,1/Math.sqrt(2.01),.9,1])for(let heading=0;heading<360;heading+=15){
   const slope=Math.sqrt(1-facing*facing)/facing,angle=heading*Math.PI/180,gx=slope*Math.cos(angle),gy=slope*Math.sin(angle);
   const bias=actualBias(facing,p.bias,Math.sqrt,Math.max),old=p.bias*(1+Math.min(4,Math.sqrt(1-facing*facing)/Math.max(facing,.15)));
   for(const px of phases)for(const py of phases)for(const tx of taps)for(const ty of taps){
    const dx=Math.floor(px+tx)+.5-px,dy=Math.floor(py+ty)+.5-py;
    const sampledDepthDelta=(gx*dx*radii[0]+gy*dy*radii[1])/(2048*radii[2]);
    assert.ok(bias+sampledDepthDelta>=0,'unoccluded sloped plane must not shadow itself');
    if(old+sampledDepthDelta<0)oldViolations++;
   }
  }
  // The real witness fixture's cuboid causes metre-scale separation. Even the
  // conservative new filter bias stays below its known wall and roof blockers.
  const facing=1/Math.sqrt(2.01),bias=actualBias(facing,p.bias,Math.sqrt,Math.max),sun=[-1,.1,1].map(v=>v/Math.sqrt(2.01));
  for(const [point,hit] of [[[10,0,10],[4,.6,16]],[[8,0,5],[4,.4,9]]]){
   const depthGap=hit.reduce((sum,v,i)=>sum+(v-point[i])*sun[i],0)/(2*radii[2]);assert.ok(depthGap>bias*10,'actual occluder remains beyond the self-shadow bias');
  }
 }
 assert.ok(oldViolations>0,'previous expression is a negative control for this regression');
});

test('coverage diagnostics copy only the existing query scalars without retaining or rescanning source geometry',()=>{
 const f=fixture();let queries=0;
 const coverage={...f.coverage,complete:false,reason:'source:3:missing-program'};
 f.source.getSolarShadowCoverage=()=>{queries++;return coverage;};
 f.core.capture(f.gl,f.args);assert.equal(queries,1);
 assert.deepEqual(f.core.stats.coverage,{complete:false,triangles:180,draws:3,reason:'source:3:missing-program'});
 assert.deepEqual(Object.keys(f.core.stats.coverage).sort(),['complete','draws','reason','triangles']);
 coverage.reason='mutated after query';coverage.bounds[0]=999;f.core.stats.coverage.reason='external stats mutation';
 for(let i=0;i<4;i++)f.core.capture(f.gl,f.args);
 assert.equal(queries,1);assert.equal(f.core.stats.coverage.reason,'source:3:missing-program');assert.equal(f.gl.allocations.length,0);
 coverage.reason='x'.repeat(2048);f.revision('new-incomplete');f.core.capture(f.gl,f.args);assert.equal(queries,2);assert.equal(f.core.stats.coverage.reason.length,1024);
 f.core.resetGPU();assert.equal(f.core.stats.coverage,undefined);f.core.capture(f.gl,f.args);assert.equal(queries,3);f.core.setSource(undefined);assert.equal(f.core.stats.coverage,undefined);
});

test('failed capture diagnostics retain actual counts and nested reason across the failed-key latch',()=>{
 const f=fixture();let renders=0;
 const result={triangles:177,draws:2,complete:false,reason:'source[1]:source[4]:resident-mask-unready'},expected={...result};
 f.source.renderPlanarReflection=()=>{renders++;return result;};
 assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.core.stats.status,'capture-failed');assert.equal(f.core.stats.published,false);
 assert.deepEqual(f.core.stats.captureResult,expected);assert.deepEqual(Object.keys(f.core.stats.captureResult).sort(),['complete','draws','reason','triangles']);
 assert.match(f.core.stats.lastError,/Solar source capture incomplete or plan-count mismatch/);assert(f.core.stats.lastError.includes(expected.reason));
 for(const count of [177,2,180,3])assert.match(f.core.stats.lastError,new RegExp('(?:^|\\D)'+count+'(?:\\D|$)'));
 result.triangles=0;result.reason='changed source object';f.core.stats.captureResult.reason='changed stats snapshot';
 for(let i=0;i<4;i++)assert.equal(f.core.capture(f.gl,f.args),'failed');
 assert.equal(renders,1);assert.equal(f.core.stats.failures,1);assert.deepEqual(f.core.stats.captureResult,expected);
});

test('capture result reasons are bounded and cleared by reset or a new attempt that never renders',()=>{
 const f=fixture();let renders=0;
 f.source.renderPlanarReflection=()=>{renders++;return{triangles:177,draws:2,complete:false,reason:'source[1]:resident-mask-unready:'+('x'.repeat(3000))};};
 f.core.capture(f.gl,f.args);assert.match(f.core.stats.captureResult.reason,/^source\[1\]:resident-mask-unready:/);assert(f.core.stats.captureResult.reason.length<=1024);
 f.core.resetGPU();assert.equal(f.core.stats.captureResult,undefined);
 f.core.capture(f.gl,f.args);assert.equal(renders,2);assert.equal(f.core.stats.captureResult.triangles,177);
 f.revision('resident/new-incomplete');f.coverage.complete=false;f.core.capture(f.gl,f.args);
 assert.equal(f.core.stats.status,'incomplete-coverage');assert.equal(renders,2);assert.equal(f.core.stats.captureResult,undefined);
});

test('dedicated depth preparation runs only for dirty enabled captures and its resulting revision keys the capture',()=>{
 const f=fixture(),before=f.gl.snapshot();let preparations=0,ready=false;
 f.source.prepareSolarShadow=()=>{preparations++;ready=true;f.revision('resident/depth-ready');};
 f.source.getSolarShadowCoverage=()=>({...f.coverage,complete:ready,reason:ready?undefined:'missing-depth-program'});
 void f.core.stats;f.core.capture(f.gl,{...f.args,enabled:false});f.core.capture(f.gl,{...f.args,direction:[1,-.2,0]});assert.equal(preparations,0);
 f.core.capture(f.gl,f.args);assert.equal(preparations,1);assert.equal(f.core.stats.status,'ready');assert.equal(f.calls,1);assert.deepEqual(f.demands.map(change=>change.active),[true,true,false,false],'a changed content revision acquires its next token before retiring the old token');assert.equal(f.demands[0].token,f.demands[2].token);assert.equal(f.demands[1].token,f.demands[3].token);assert.notEqual(f.demands[0].token,f.demands[1].token);assert.equal(f.demands.at(-1).state,before,'success retires the final demand after caller GL restoration');const changes=f.demands.length;
 f.core.capture(f.gl,f.args);assert.equal(f.demands.length,changes,'a cached capture does not reactivate or prepare demand');assert.equal(preparations,1);assert.equal(f.calls,1);assert.equal(f.core.stats.cacheHits,1);
 f.core.resetGPU();ready=false;f.revision('restored/no-depth');f.core.capture(f.gl,f.args);assert.equal(preparations,2);assert.equal(f.calls,2);
});

test('throwing or context-lost preparation cannot retry indefinitely or publish a partial target',()=>{
 const f=fixture(),before=f.gl.snapshot();let attempts=0;
 f.source.prepareSolarShadow=()=>{attempts++;throw Error('depth program compile failed');};
 for(let i=0;i<8;i++)f.core.capture(f.gl,f.args);assert.equal(attempts,1);assert.equal(f.core.stats.failures,1);assert.equal(f.gl.allocations.length,0);assert.equal(f.demands.at(-1).active,false);assert.equal(f.demands.at(-1).state,before,'throwing preparation retires after restoring its caller state');
 f.revision('different-material');f.core.capture(f.gl,f.args);assert.equal(attempts,2);
 f.core.resetGPU();f.source.prepareSolarShadow=()=>{attempts++;f.gl.setLost(true);};f.core.capture(f.gl,f.args);assert.equal(attempts,3);assert.equal(f.core.stats.status,'context-lost');assert.equal(f.core.stats.published,false);assert.equal(f.gl.allocations.length,0);assert.equal(f.demands.at(-1).active,false,'a lost preparation cannot retain its old-context demand');
});

test('depth scheduling regression: pending preparation never locks the unchanged capture key',()=>{
 const f=fixture(),before=f.gl.snapshot();let attempts=0;
 f.source.prepareSolarShadow=()=>{attempts++;return{status:attempts===1?'pending':'ready',ready:attempts,pending:attempts===1?1:0,failed:0};};
 f.source.getSolarShadowCoverage=()=>({...f.coverage,complete:attempts>1});
 f.core.capture(f.gl,f.args);assert.equal(f.core.stats.published,false);assert.equal(f.gl.allocations.length,0);assert.equal(f.gl.clears.length,0);assert.deepEqual(f.demands.map(change=>change.active),[true],'pending preparation retains its one demand without framebuffer work');
 f.core.capture(f.gl,f.args);assert.equal(attempts,2);assert.equal(f.core.stats.published,true);assert.equal(f.calls,1);assert.deepEqual(f.demands.map(change=>change.active),[true,true,false]);assert.equal(new Set(f.demands.map(change=>change.token)).size,1,'pending refresh keeps the unchanged token live');assert.equal(f.demands.at(-1).state,before);const changes=f.demands.length;f.core.capture(f.gl,f.args);assert.equal(attempts,2);assert.equal(f.demands.length,changes);
});
test('pending overrides optimistic coverage, unpublishes the old target, and a failure still latches',()=>{
 const f=fixture();f.core.capture(f.gl,f.args);assert.equal(f.core.stats.published,true);f.revision('new-source');let attempts=0;
 f.source.prepareSolarShadow=()=>{attempts++;return{status:'pending',ready:1,pending:1,failed:0};};
 assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.coverage.complete,false);assert.equal(f.core.stats.published,false);assert.equal(f.calls,1);assert.equal(f.demands.at(-1).active,true);
 f.source.prepareSolarShadow=()=>{attempts++;return{status:'failed',ready:1,pending:1,failed:1};};
 assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.demands.at(-1).active,false);const retiredChanges=f.demands.length;assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.demands.length,retiredChanges,'a failed-key latch cannot rehold resources');assert.equal(attempts,2);assert.equal(f.calls,1);
 f.revision('replacement-source');f.source.prepareSolarShadow=()=>({status:'ready',ready:2,pending:0,failed:0});assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.calls,2);
});
test('depth diagnostics retain only 32 start/elapsed outcomes, expose in-flight keys, and distinguish context epochs',()=>{
 const f=fixture();let n=0;const epochs=[];
 f.source.prepareSolarShadow=budget=>{
  const result=budget.compile('owner-'+n,'source-generation-'+n,()=>{const row=f.core.stats.depthPreparation.history.at(-1);assert.equal(row.result,'started');assert.equal(row.phase,'depth');epochs.push(row.contextEpoch);return{};});
  assert.equal(result.status,'ready');assert.equal(budget.compile('must-defer','x',()=>assert.fail('second compile')).status,'pending');
  return{status:'ready',ready:1,pending:0,failed:0};
 };
 for(n=0;n<35;n++){f.revision('revision-'+n);assert.equal(f.core.capture(f.gl,f.args),'ready');}
 const before=f.core.stats.depthPreparation;assert.equal(before.history.length,32);assert.equal(before.history[0].key,'owner-3');assert(before.history.every(row=>row.result==='ready'&&row.elapsed>=0&&Number.isFinite(row.start)));
 before.history[0].key='external mutation';assert.equal(f.core.stats.depthPreparation.history[0].key,'owner-3');
 f.core.resetGPU();f.revision('restored');f.core.capture(f.gl,f.args);assert(epochs.at(-1)>epochs[0]);
 f.core.setSource({...f.source});f.revision('replaced');f.core.capture(f.gl,f.args);assert(epochs.at(-1)>epochs.at(-2));
});


test('complete=true cannot publish a capture that omitted planned triangles or draws',()=>{
 for(const returned of [{triangles:177,draws:3,complete:true},{triangles:180,draws:2,complete:true}]){
  const f=fixture();f.source.renderPlanarReflection=()=>returned;
  assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.core.stats.published,false);
  assert.equal(f.core.stats.status,'capture-failed');assert.match(f.core.stats.lastError,/plan-count mismatch/);
  assert.deepEqual(f.core.stats.captureResult,returned);
 }
});
