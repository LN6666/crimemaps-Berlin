import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The shared R8 projected-shadow mask (environment + every building renderer)
// admits its viewport-sized storage on the page ResourceBudget BEFORE
// texImage2D, keeps one claim per context, retires replaced/final storage behind
// the page store fence and returns the claim at once on context loss.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=`export {createProjectedShadowMask,projectedShadowMaskBytes} from './projected-shadow-mask';export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';`;
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1],MiB=1024*1024;

function mockGL({canvas}={}){
 const names='VIEWPORT DRAW_FRAMEBUFFER_BINDING CURRENT_PROGRAM VERTEX_ARRAY_BINDING ACTIVE_TEXTURE DEPTH_WRITEMASK DEPTH_FUNC DEPTH_RANGE STENCIL_WRITEMASK STENCIL_BACK_WRITEMASK BLEND_SRC_RGB BLEND_DST_RGB BLEND_SRC_ALPHA BLEND_DST_ALPHA BLEND_EQUATION_RGB BLEND_EQUATION_ALPHA COLOR_WRITEMASK TEXTURE_BINDING_2D SAMPLER_BINDING MAX_TEXTURE_SIZE DRAW_FRAMEBUFFER TEXTURE_2D TEXTURE0 DEPTH_TEST STENCIL_TEST SCISSOR_TEST CULL_FACE BLEND LEQUAL FUNC_ADD MAX ONE SRC_ALPHA ONE_MINUS_SRC_ALPHA VERTEX_SHADER FRAGMENT_SHADER COMPILE_STATUS LINK_STATUS FRAMEBUFFER_COMPLETE R8 RED UNSIGNED_BYTE TEXTURE_MIN_FILTER TEXTURE_MAG_FILTER TEXTURE_WRAP_S TEXTURE_WRAP_T NEAREST CLAMP_TO_EDGE COLOR_ATTACHMENT0 COLOR TRIANGLES FRONT BACK SYNC_GPU_COMMANDS_COMPLETE ALREADY_SIGNALED CONDITION_SATISFIED TIMEOUT_EXPIRED WAIT_FAILED'.split(' ');
 const gl=Object.fromEntries(names.map((n,i)=>[n,i+1])),values=new Map(),enabled=new Set([gl.DEPTH_TEST,gl.BLEND]),textures=new Map(),samplers=new Map();let serial=0;
 values.set(gl.VIEWPORT,[0,0,640,480]);values.set(gl.DRAW_FRAMEBUFFER_BINDING,{scene:true});values.set(gl.CURRENT_PROGRAM,{scene:true});values.set(gl.VERTEX_ARRAY_BINDING,{scene:true});values.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+2);values.set(gl.DEPTH_WRITEMASK,true);values.set(gl.DEPTH_FUNC,gl.LEQUAL);values.set(gl.DEPTH_RANGE,[0,1]);values.set(gl.STENCIL_WRITEMASK,255);values.set(gl.STENCIL_BACK_WRITEMASK,255);
 values.set(gl.BLEND_SRC_RGB,gl.SRC_ALPHA);values.set(gl.BLEND_DST_RGB,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_SRC_ALPHA,gl.ONE);values.set(gl.BLEND_DST_ALPHA,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_EQUATION_RGB,gl.FUNC_ADD);values.set(gl.BLEND_EQUATION_ALPHA,gl.FUNC_ADD);values.set(gl.COLOR_WRITEMASK,[true,true,true,true]);values.set(gl.MAX_TEXTURE_SIZE,8192);
 const created=[],deleted=[],storage=[],fences=[],resource=kind=>{const v={id:++serial,kind,incarnation:gl.incarnation};created.push(v);return v;};
 Object.assign(gl,{created,deleted,storage,fences,lost:false,incarnation:0,signaled:false,draws:0,canvas,
  isProgram:v=>!gl.lost&&v?.kind==='program'&&v.incarnation===gl.incarnation&&!deleted.includes(v),
  getParameter(k){if(gl.lost)return null;if(k===gl.TEXTURE_BINDING_2D)return textures.get(values.get(gl.ACTIVE_TEXTURE))??null;if(k===gl.SAMPLER_BINDING)return samplers.get(values.get(gl.ACTIVE_TEXTURE))??null;return values.get(k);},
  isContextLost:()=>gl.lost,isEnabled:k=>enabled.has(k),enable:k=>enabled.add(k),disable:k=>enabled.delete(k),activeTexture:k=>values.set(gl.ACTIVE_TEXTURE,k),bindTexture:(_t,v)=>textures.set(values.get(gl.ACTIVE_TEXTURE),v),bindSampler:(unit,v)=>samplers.set(gl.TEXTURE0+unit,v),
  createProgram:()=>resource('program'),createShader:()=>resource('shader'),createFramebuffer:()=>resource('framebuffer'),createTexture:()=>resource('texture'),createVertexArray:()=>resource('vao'),
  deleteProgram:v=>deleted.push(v),deleteShader:v=>deleted.push(v),deleteFramebuffer:v=>deleted.push(v),deleteTexture:v=>deleted.push(v),deleteVertexArray:v=>deleted.push(v),
  shaderSource(){},compileShader(){},attachShader(){},detachShader(){},linkProgram(){},getShaderParameter:()=>true,getProgramParameter:()=>true,getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',
  bindFramebuffer:(_t,v)=>values.set(gl.DRAW_FRAMEBUFFER_BINDING,v),texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,clearBufferfv(){},
  viewport:(...v)=>values.set(gl.VIEWPORT,v),depthMask:v=>values.set(gl.DEPTH_WRITEMASK,v),depthFunc:v=>values.set(gl.DEPTH_FUNC,v),colorMask:(...v)=>values.set(gl.COLOR_WRITEMASK,v),
  stencilMaskSeparate:(face,mask)=>values.set(face===gl.FRONT?gl.STENCIL_WRITEMASK:gl.STENCIL_BACK_WRITEMASK,mask),
  blendEquationSeparate:(a,b)=>{values.set(gl.BLEND_EQUATION_RGB,a);values.set(gl.BLEND_EQUATION_ALPHA,b);},blendFuncSeparate:(a,b,c,d)=>{for(const [k,v]of [[gl.BLEND_SRC_RGB,a],[gl.BLEND_DST_RGB,b],[gl.BLEND_SRC_ALPHA,c],[gl.BLEND_DST_ALPHA,d]])values.set(k,v);},
  useProgram:v=>values.set(gl.CURRENT_PROGRAM,v),bindVertexArray:v=>values.set(gl.VERTEX_ARRAY_BINDING,v),getUniformLocation:(_p,name)=>name,uniform1i(){},uniform3fv(){},uniform3f(){},uniform2fv(){},drawArrays:()=>{gl.draws++;},
  texImage2D:(...args)=>{storage.push({width:args[3],height:args[4],observed:gl.observe?.()});},
  fenceSync:()=>{const fence={id:++serial};fences.push(fence);return fence;},flush(){},deleteSync(){},clientWaitSync:()=>gl.signaled?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED,
  snapshot:()=>JSON.stringify({values:[...values],enabled:[...enabled].sort(),textures:[...textures],samplers:[...samplers]}),
 });
 return gl;
}
function fixture({limitBytes=64*MiB,canvas}={}){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,MiB)}),store=m.createChunkResourceStore({budget}),gl=mockGL({canvas});
 m.bindChunkResourceContext(gl,store);
 return {budget,store,gl,draw:(mask,coverage=()=>{})=>mask.draw(gl,topDown,.03,coverage)};
}
const textureBytes=budget=>budget.stats.categories.texture?.bytes??0;

test('mask storage is admitted before texImage2D and an unchanged size is never reserved again',()=>{
 const {budget,store,gl,draw}=fixture(),a=m.createProjectedShadowMask(),b=m.createProjectedShadowMask(),bytes=m.projectedShadowMaskBytes(640,480);
 gl.observe=()=>({texture:textureBytes(budget),reservations:budget.stats.reservations});
 assert.equal(draw(a),true);
 assert.deepEqual(gl.storage,[{width:640,height:480,observed:{texture:bytes,reservations:1}}],'the exact R8 claim exists before texImage2D');
 for(let i=0;i<3;i++){assert.equal(draw(a),true);assert.equal(draw(b),true);}
 assert.equal(gl.storage.length,1,'one storage specification');
 assert.equal(budget.stats.reservations,1,'same size and second owner never reserve again');
 assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.exactBytes,bytes);assert.equal(budget.stats.allocations,1,'two owners share one deduplicated claim');
 assert.equal(a.stats.claimedBytes,bytes);assert.equal(b.stats.claimedBytes,bytes);assert.equal(a.stats.admission,'admitted');assert.equal(a.stats.bytes,bytes);
 a.release();assert.equal(budget.stats.bytes,bytes,'another owner still uses the storage');
 b.release();store.collectRetired();gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,0);
});

test('a resize keeps the replaced storage charged until the fence; the last owner retires the target behind the fence',()=>{
 const {budget,store,gl,draw}=fixture(),mask=m.createProjectedShadowMask(),first=640*480,second=800*600;
 assert.equal(draw(mask),true);gl.viewport(0,0,800,600);assert.equal(draw(mask),true);
 assert.deepEqual(gl.storage.map(s=>[s.width,s.height]),[[640,480],[800,600]]);
 assert.equal(budget.stats.bytes,first+second,'replaced storage is not assumed reclaimed by texImage2D');assert.equal(budget.stats.retiringBytes,first);
 store.collectRetired();assert.equal(budget.stats.bytes,first+second,'an unsignaled fence keeps the charge');
 gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,second);assert.equal(budget.stats.retiringBytes,0);
 gl.signaled=false;gl.viewport(0,0,800,600);assert.equal(draw(mask),true);assert.equal(gl.storage.length,2,'unchanged size reuses storage');
 mask.release();
 assert.equal(gl.deleted.filter(v=>v.kind==='texture').length,1,'handles are deleted when the target retires');
 assert.equal(budget.stats.bytes,second,'deletion is a request: the charge waits for the fence');assert.equal(budget.stats.retiringBytes,second);
 gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(mask.stats.bytes,0);assert.equal(mask.stats.claimedBytes,0);
});

test('context loss returns the shared claim immediately, from a draw, the canvas event, or the last release',()=>{
 {
  const {budget,gl,draw}=fixture(),mask=m.createProjectedShadowMask();
  assert.equal(draw(mask),true);gl.lost=true;
  assert.equal(draw(mask),false);assert.equal(budget.stats.bytes,0,'no fence wait for a lost context');assert.equal(mask.stats.bytes,0);
  mask.release();assert.equal(gl.deleted.filter(v=>v.kind==='texture').length,1);assert.equal(budget.stats.bytes,0);
 }
 {
  const canvas=new EventTarget(),{budget,gl,draw}=fixture({canvas}),a=m.createProjectedShadowMask(),b=m.createProjectedShadowMask();
  assert.equal(draw(a),true);assert.equal(draw(b),true);assert.equal(budget.stats.bytes,640*480);
  gl.lost=true;canvas.dispatchEvent(new Event('webglcontextlost'));
  assert.equal(budget.stats.bytes,0,'the loss event releases before any owner draws or releases');
  gl.lost=false;gl.incarnation++;// restored incarnation: stale handles are neither reused nor deleted
  assert.equal(draw(a),true);assert.equal(gl.created.filter(v=>v.kind==='texture').length,2);assert.equal(budget.stats.bytes,640*480);
  assert.equal(draw(b),true);assert.equal(gl.created.filter(v=>v.kind==='texture').length,2,'second owner joins the new target');
  assert.equal(gl.deleted.filter(v=>v.kind==='texture').length,0,'lost-incarnation handles are not deleted on the restored context');
  assert.equal(budget.stats.reservations,1);
  a.release();b.release();gl.signaled=true;
 }
 {
  const {budget,gl,draw}=fixture(),mask=m.createProjectedShadowMask();
  assert.equal(draw(mask),true);gl.lost=true;mask.release();
  assert.equal(budget.stats.bytes,0,'last release on a lost context does not wait for a fence');assert.equal(gl.fences.length,0);
 }
});

test('a store-invalidated live target is retired behind the fence and a lost incarnation is dropped with its claim; neither is reused',()=>{
 {
  // An owner invalidated the current epoch while the context stayed live: the
  // old handles still exist and still hold storage, so they are deleted and
  // stay charged until the fence passes (never leaked, never under-charged).
  const {budget,store,gl,draw}=fixture(),mask=m.createProjectedShadowMask(),bytes=640*480;
  assert.equal(draw(mask),true);store.invalidateContext(gl,store.contextEpoch(gl));
  assert.equal(draw(mask),true);
  assert.equal(gl.created.filter(v=>v.kind==='texture').length,2,'a fresh target belongs to the new epoch');
  assert.deepEqual(gl.deleted.filter(v=>v.kind!=='shader').map(v=>v.kind).sort(),['framebuffer','program','texture','vao'],'the live handles of the stale target are deleted');
  assert.equal(budget.stats.bytes,2*bytes,'its storage stays charged until the fence passes');assert.equal(budget.stats.retiringBytes,bytes);
  gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.reservations,1);
  mask.release();store.collectRetired();assert.equal(budget.stats.bytes,0);
 }
 {
  // Loss and restore happened without an event or draw reaching the mask.
  const {budget,store,gl,draw}=fixture(),mask=m.createProjectedShadowMask();
  assert.equal(draw(mask),true);gl.lost=true;gl.lost=false;gl.incarnation++;store.invalidateContext(gl,store.contextEpoch(gl));
  assert.equal(draw(mask),true);
  assert.equal(gl.created.filter(v=>v.kind==='texture').length,2,'a fresh target belongs to the new epoch');
  assert.equal(gl.deleted.filter(v=>v.kind!=='shader').length,0,'lost-incarnation handles are not deleted on the restored context');
  assert.equal(budget.stats.bytes,640*480,'the stale claim was returned, one live claim remains');assert.equal(budget.stats.reservations,1);
  mask.release();gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,0);
 }
});

test('a shared live target outliving a store epoch stays charged for its remaining owner and retires when that owner leaves',()=>{
 const {budget,store,gl,draw}=fixture(),a=m.createProjectedShadowMask(),b=m.createProjectedShadowMask(),bytes=640*480;
 assert.equal(draw(a),true);assert.equal(draw(b),true);store.invalidateContext(gl,store.contextEpoch(gl));
 assert.equal(draw(a),true,'the first owner moves to a fresh target');
 assert.equal(gl.created.filter(v=>v.kind==='texture').length,2);assert.equal(gl.deleted.filter(v=>v.kind!=='shader').length,0,'the second owner still uses the old target');
 assert.equal(budget.stats.bytes,2*bytes,'both existing storages are charged');assert.equal(budget.stats.retiringBytes,0);
 assert.equal(draw(b),true,'the second owner leaves the old target and joins the fresh one');
 assert.equal(gl.created.filter(v=>v.kind==='texture').length,2);assert.equal(gl.deleted.filter(v=>v.kind==='texture').length,1,'the old target is deleted by its last owner');
 assert.equal(budget.stats.retiringBytes,bytes);gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.reservations,1);
 a.release();b.release();store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(gl.deleted.filter(v=>v.kind==='texture').length,2);
});

test('a refused mask waits for one ledger wake-up without polling, and a cancelled wait is removed',()=>{
 const limit=MiB,{budget,gl,draw}=fixture({limitBytes:limit});let repaints=0;
 const mask=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),blocker=budget.reserve({category:'texture',bytes:limit-100000,precision:'exact'});
 const before=gl.snapshot();
 assert.equal(draw(mask),false);
 assert.equal(gl.storage.length,0,'no storage without admission');assert.equal(gl.snapshot(),before,'a refusal changes no GL state');
 assert.equal(mask.stats.admission,'pending');assert.equal(mask.stats.waiting,true);assert.ok(mask.stats.shortfallBytes>0);assert.equal(mask.stats.requiredBytes,640*480);
 assert.equal(budget.stats.availabilityListeners,1);
 const pressure=budget.stats.pressureEvents;
 for(let i=0;i<5;i++)assert.equal(draw(mask),false);
 assert.equal(budget.stats.pressureEvents,pressure,'frames do not poll the ledger while waiting');assert.equal(budget.stats.availabilityListeners,1);
 blocker.release();
 assert.equal(repaints,1,'one wake-up requests one repaint');assert.equal(budget.stats.availabilityListeners,0);assert.equal(mask.stats.waiting,false);assert.equal(mask.stats.wakeups,1);
 assert.equal(draw(mask),true);assert.equal(gl.storage.length,1);assert.equal(budget.stats.bytes,640*480);
 mask.release();
 // Cancellation: a released owner leaves no listener and is never woken.
 const second=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),again=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-1000,precision:'exact'});
 gl.viewport(0,0,320,240);
 assert.equal(draw(second),false);assert.equal(budget.stats.availabilityListeners,1);second.release();assert.equal(budget.stats.availabilityListeners,0);
 again.release();assert.equal(repaints,1,'cancelled work is not woken');
 // A superseded size cancels its wait and is admitted for the new size at once.
 const third=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),hold=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-100000,precision:'exact'});
 gl.viewport(0,0,640,480);assert.equal(draw(third),false);assert.equal(budget.stats.availabilityListeners,1);
 gl.viewport(0,0,200,150);assert.equal(draw(third),true,'the smaller current size fits');assert.equal(budget.stats.availabilityListeners,0);
 assert.equal(third.stats.admission,'admitted');third.release();hold.release();
});

test('a mask larger than the whole page budget reports unfit and never waits',()=>{
 const {budget,gl,draw}=fixture({limitBytes:100000}),mask=m.createProjectedShadowMask();
 assert.equal(draw(mask),false);
 assert.equal(mask.stats.admission,'unfit');assert.equal(mask.stats.unfitAdmissions,1);assert.match(mask.stats.lastUnfit,/above the page budget limit 100000/);
 assert.equal(budget.stats.availabilityListeners,0,'unfit work does not queue');assert.equal(budget.stats.pressureEvents,0,'nothing was asked of the ledger');
 for(let i=0;i<3;i++)assert.equal(draw(mask),false);
 assert.equal(mask.stats.unfitAdmissions,1,'the same unfit size is not re-evaluated every frame');assert.equal(gl.storage.length,0);
 gl.viewport(0,0,200,100);assert.equal(draw(mask),true);assert.equal(budget.stats.bytes,20000);assert.equal(mask.stats.admission,'admitted');
 mask.release();
});

test('a refused mask ignores wake-ups that cannot hold it, and a cancelled pending admission is never woken',()=>{
 const limit=MiB,{budget,gl,draw}=fixture({limitBytes:limit});let repaints=0;
 const mask=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),blocker=budget.reserve({category:'texture',bytes:limit-100000,precision:'exact'});
 assert.equal(draw(mask),false);const pressure=budget.stats.pressureEvents;
 assert.equal(blocker.adjust({category:'texture',bytes:blocker.bytes-1000,precision:'exact'}),true);
 assert.equal(repaints,0,'a wave that cannot hold 640x480 requests no repaint');assert.equal(mask.stats.deferredWakeups,1);
 assert.equal(mask.stats.waiting,true);assert.equal(budget.stats.availabilityListeners,1,'the same registration keeps waiting');
 assert.equal(draw(mask),false);assert.equal(budget.stats.pressureEvents,pressure,'no futile reserve runs the pressure evictors');
 assert.equal(mask.cancelPending(),true);assert.equal(budget.stats.availabilityListeners,0);assert.equal(mask.stats.admission,'idle');assert.equal(mask.stats.cancellations,1);
 blocker.release();assert.equal(repaints,0,'a cancelled admission is not woken');assert.equal(mask.cancelPending(),false);
 assert.equal(draw(mask),true,'the next wanted draw admits afresh');assert.equal(budget.stats.bytes,640*480);
 mask.release();
});

test('a waiting mask counts pressure-reclaimable recent bytes, so a reclaimable wave lets its retry evict',()=>{
 const limit=MiB,{budget,gl,draw}=fixture({limitBytes:limit});let repaints=0;
 const mask=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),idle=budget.reserve({category:'texture',bytes:400000,precision:'exact'},{recent:true});
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-100000,precision:'exact'});
 assert.equal(draw(mask),false);assert.equal(budget.stats.availabilityListeners,1);
 const off=budget.onPressure(()=>idle.release());
 assert.equal(budget.notifyReclaimable(),true,'an idle lease became reclaimable without a byte drop');
 assert.equal(repaints,1,'free plus reclaimable bytes can hold the mask: one repaint');
 assert.equal(draw(mask),true,'the retry evicts the idle recent claim and is admitted');assert.equal(idle.active,false);off();
 mask.release();blocker.release();
});
