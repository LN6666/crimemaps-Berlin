import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build,transform} from 'esbuild';

// Drives every building renderer's actual drawProjectedShadows source (extracted
// and type-stripped) against the shared R8 mask, the page store and its ledger
// on a mock WebGL2 context. An admitted mask receives every chunk's coverage in
// its own target before one composite on the scene framebuffer. A refused mask
// is a no-op frame: nothing throws, no storage is specified, no coverage is
// drawn, and the mask waits for one ledger wake-up.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),safety=path.join(web,'src/safety');
const entry=`export {createProjectedShadowMask} from './projected-shadow-mask';export {chunkUniforms} from './render-runtime/resident-draw-range';export {createResidentTriangleDrawBatch,drawResidentTriangles} from './render-runtime/resident-index-convention';export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';`;
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n//# sourceURL=resident-shadow-hooks-under-test.mjs').toString('base64'));
const FAMILIES=['city','delegated500','root500','church','infill','bremen','tier300'],topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1],MiB=1024*1024;

function mockGL(){
 const names='VIEWPORT DRAW_FRAMEBUFFER_BINDING CURRENT_PROGRAM VERTEX_ARRAY_BINDING ACTIVE_TEXTURE DEPTH_WRITEMASK DEPTH_FUNC DEPTH_RANGE STENCIL_WRITEMASK STENCIL_BACK_WRITEMASK BLEND_SRC_RGB BLEND_DST_RGB BLEND_SRC_ALPHA BLEND_DST_ALPHA BLEND_EQUATION_RGB BLEND_EQUATION_ALPHA COLOR_WRITEMASK TEXTURE_BINDING_2D SAMPLER_BINDING MAX_TEXTURE_SIZE DRAW_FRAMEBUFFER TEXTURE_2D TEXTURE0 DEPTH_TEST STENCIL_TEST SCISSOR_TEST CULL_FACE BLEND LEQUAL FUNC_ADD MAX ONE SRC_ALPHA ONE_MINUS_SRC_ALPHA VERTEX_SHADER FRAGMENT_SHADER COMPILE_STATUS LINK_STATUS FRAMEBUFFER_COMPLETE R8 RED UNSIGNED_BYTE UNSIGNED_INT TEXTURE_MIN_FILTER TEXTURE_MAG_FILTER TEXTURE_WRAP_S TEXTURE_WRAP_T NEAREST CLAMP_TO_EDGE COLOR_ATTACHMENT0 COLOR TRIANGLES FRONT BACK SYNC_GPU_COMMANDS_COMPLETE ALREADY_SIGNALED CONDITION_SATISFIED TIMEOUT_EXPIRED WAIT_FAILED'.split(' ');
 const gl=Object.fromEntries(names.map((n,i)=>[n,i+1])),values=new Map(),enabled=new Set([gl.DEPTH_TEST,gl.BLEND]),textures=new Map(),samplers=new Map(),scene={scene:true};let serial=0;
 values.set(gl.VIEWPORT,[0,0,640,480]);values.set(gl.DRAW_FRAMEBUFFER_BINDING,scene);values.set(gl.CURRENT_PROGRAM,{scene:true});values.set(gl.VERTEX_ARRAY_BINDING,{scene:true});values.set(gl.ACTIVE_TEXTURE,gl.TEXTURE0+2);values.set(gl.DEPTH_WRITEMASK,true);values.set(gl.DEPTH_FUNC,gl.LEQUAL);values.set(gl.DEPTH_RANGE,[0,1]);values.set(gl.STENCIL_WRITEMASK,255);values.set(gl.STENCIL_BACK_WRITEMASK,255);
 values.set(gl.BLEND_SRC_RGB,gl.SRC_ALPHA);values.set(gl.BLEND_DST_RGB,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_SRC_ALPHA,gl.ONE);values.set(gl.BLEND_DST_ALPHA,gl.ONE_MINUS_SRC_ALPHA);values.set(gl.BLEND_EQUATION_RGB,gl.FUNC_ADD);values.set(gl.BLEND_EQUATION_ALPHA,gl.FUNC_ADD);values.set(gl.COLOR_WRITEMASK,[true,true,true,true]);values.set(gl.MAX_TEXTURE_SIZE,8192);
 const deleted=[],storage=[],elements=[],composites=[],resource=kind=>({id:++serial,kind});
 Object.assign(gl,{scene,deleted,storage,elements,composites,lost:false,signaled:false,
  getParameter(k){if(k===gl.TEXTURE_BINDING_2D)return textures.get(values.get(gl.ACTIVE_TEXTURE))??null;if(k===gl.SAMPLER_BINDING)return samplers.get(values.get(gl.ACTIVE_TEXTURE))??null;return values.get(k);},
  isContextLost:()=>gl.lost,isEnabled:k=>enabled.has(k),enable:k=>enabled.add(k),disable:k=>enabled.delete(k),activeTexture:k=>values.set(gl.ACTIVE_TEXTURE,k),bindTexture:(_t,v)=>textures.set(values.get(gl.ACTIVE_TEXTURE),v),bindSampler:(unit,v)=>samplers.set(gl.TEXTURE0+unit,v),
  createProgram:()=>resource('program'),createShader:()=>resource('shader'),createFramebuffer:()=>resource('framebuffer'),createTexture:()=>resource('texture'),createVertexArray:()=>resource('vao'),isProgram:v=>v?.kind==='program'&&!deleted.includes(v),
  deleteProgram:v=>deleted.push(v),deleteShader:v=>deleted.push(v),deleteFramebuffer:v=>deleted.push(v),deleteTexture:v=>deleted.push(v),deleteVertexArray:v=>deleted.push(v),
  shaderSource(){},compileShader(){},attachShader(){},detachShader(){},linkProgram(){},getShaderParameter:()=>true,getProgramParameter:()=>true,getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',
  bindFramebuffer:(_t,v)=>values.set(gl.DRAW_FRAMEBUFFER_BINDING,v),texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,clearBufferfv(){},
  viewport:(...v)=>values.set(gl.VIEWPORT,v),depthMask:v=>values.set(gl.DEPTH_WRITEMASK,v),depthFunc:v=>values.set(gl.DEPTH_FUNC,v),colorMask:(...v)=>values.set(gl.COLOR_WRITEMASK,v),
  stencilMaskSeparate:(face,mask)=>values.set(face===gl.FRONT?gl.STENCIL_WRITEMASK:gl.STENCIL_BACK_WRITEMASK,mask),
  blendEquationSeparate:(a,b)=>{values.set(gl.BLEND_EQUATION_RGB,a);values.set(gl.BLEND_EQUATION_ALPHA,b);},blendFuncSeparate:(a,b,c,d)=>{for(const [k,v]of [[gl.BLEND_SRC_RGB,a],[gl.BLEND_DST_RGB,b],[gl.BLEND_SRC_ALPHA,c],[gl.BLEND_DST_ALPHA,d]])values.set(k,v);},
  useProgram:v=>values.set(gl.CURRENT_PROGRAM,v),bindVertexArray:v=>values.set(gl.VERTEX_ARRAY_BINDING,v),getUniformLocation:(_p,name)=>name,uniform1i(){},uniform1f(){},uniform2f(){},uniform3fv(){},uniform3f(){},uniform2fv(){},uniformMatrix4fv(){},
  drawElements:(mode,count,type,offset)=>elements.push({mode,count,type,offset,framebuffer:values.get(gl.DRAW_FRAMEBUFFER_BINDING),vao:values.get(gl.VERTEX_ARRAY_BINDING)}),
  drawArrays:()=>composites.push(values.get(gl.DRAW_FRAMEBUFFER_BINDING)),
  texImage2D:(...args)=>{storage.push({width:args[3],height:args[4],observed:gl.observe?.()});},
  fenceSync:()=>({id:++serial}),flush(){},deleteSync(){},clientWaitSync:()=>gl.signaled?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED,
 });
 return gl;
}
function fixture(limitBytes=64*MiB){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,MiB)}),store=m.createChunkResourceStore({budget}),gl=mockGL();
 m.bindChunkResourceContext(gl,store);gl.observe=()=>budget.stats.categories.texture?.exactBytes??0;
 return {budget,store,gl};
}
function functionSource(source,needle){
 const start=source.indexOf(needle);assert.ok(start>=0,needle);
 let end=source.indexOf('{',source.indexOf(')',start))+1,depth=1;
 for(;depth&&end<source.length;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 return source.slice(start,end);
}
// Every chunk shape the seven renderers read: shadow index counts or arrays,
// shadow VAOs, packed anchors/frames, chunk anchors/units and source frames.
const chunk=id=>({shadowIndexCount:3,shadowIndices:new Uint32Array(3),shadow:{value:{vao:{chunkVAO:id}}},cpu:{value:{anchor:[0,0],frame:{unit:1}}},anchor:[0,0],unit:1,source:{frame:{unit:1}}});
async function rendererHook(family){
 const source=await fs.readFile(path.join(web,`src/painted/${family}/safety/building-mesh-renderer.ts`),'utf8');
 assert.ok(source.includes('shadowMask=createProjectedShadowMask(')&&source.includes('shadowMask.release()'),family+' creates and releases the shared mask');
 const js=(await transform(functionSource(source,'function drawProjectedShadows('),{loader:'ts'})).code;
 return new Function('createResidentTriangleDrawBatch','drawResidentTriangles','chunkUniforms','env',`const {gl,shadowMask,matrix,projection,sceneChunks}=env;
  const shadowProgram={shadowProgram:true},mainWorldProjection=projection,mainWorldMatrix=projection,candidateMainMatrix=projection,candidateMainProjection=projection,shadowUploadPending=false;
  const sceneSun={shadowVector:[-2,1]},paintMode=()=>2,anchorUnit=1,geometryOwner={scene:{version:1}},shadowGeometryOwner={scene:{version:1}};
  const multiply=(a,b)=>Array.from({length:16},(_,i)=>{const r=i%4,c=Math.floor(i/4);let n=0;for(let k=0;k<4;k++)n+=a[k*4+r]*b[c*4+k];return n;});
  let shadowDraws=0;
  ${js}
  drawProjectedShadows(env.alpha);
  return shadowDraws;`).bind(undefined,m.createResidentTriangleDrawBatch,m.drawResidentTriangles,m.chunkUniforms);
}

for(const family of FAMILIES)test(family+' drawProjectedShadows draws one admitted coverage union and treats a refused mask as a waiting no-op frame',async()=>{
 const run=await rendererHook(family),bytes=640*480;
 {
  const {budget,store,gl}=fixture(),mask=m.createProjectedShadowMask(),env={gl,shadowMask:mask,matrix:topDown,projection:topDown,sceneChunks:[chunk(1),chunk(2)],alpha:.08};
  assert.equal(run(env),1,'one shadow draw');
  assert.deepEqual(gl.storage,[{width:640,height:480,observed:bytes}],'the exact R8 claim exists before texImage2D');
  assert.equal(gl.elements.length,2,'every chunk contributes coverage');
  assert.ok(gl.elements.every(row=>row.mode===gl.TRIANGLES&&row.count===3&&row.type===gl.UNSIGNED_INT&&row.offset===0&&row.framebuffer?.kind==='framebuffer'),'coverage goes to the mask target, not the scene');
  assert.deepEqual(gl.elements.map(row=>row.vao.chunkVAO),[1,2]);
  assert.equal(gl.composites.length,1,'one union composite');assert.equal(gl.composites[0],gl.scene,'composited onto the scene framebuffer');
  assert.equal(run(env),1);assert.equal(gl.elements.length,4);assert.equal(gl.composites.length,2);
  assert.equal(gl.storage.length,1,'an unchanged size is never specified again');assert.equal(budget.stats.reservations,1);
  mask.release();assert.equal(gl.deleted.filter(row=>row.kind==='texture').length,1);gl.signaled=true;store.collectRetired();assert.equal(budget.stats.bytes,0);
 }
 {
  const {budget,gl}=fixture(MiB);let repaints=0;
  const mask=m.createProjectedShadowMask({requestRepaint:()=>repaints++}),blocker=budget.reserve({category:'texture',bytes:MiB-100000,precision:'exact'});
  const env={gl,shadowMask:mask,matrix:topDown,projection:topDown,sceneChunks:[chunk(1),chunk(2)],alpha:.08};
  assert.equal(run(env),0,'a refused mask is a no-op frame and throws nothing');
  assert.equal(gl.storage.length,0);assert.equal(gl.elements.length,0,'no coverage without an admitted target');assert.equal(gl.composites.length,0);
  assert.equal(mask.stats.admission,'pending');assert.equal(budget.stats.availabilityListeners,1);
  assert.equal(run(env),0);assert.equal(budget.stats.availabilityListeners,1,'later frames do not re-ask the ledger');
  blocker.release();assert.equal(repaints,1,'one ledger wake-up');
  assert.equal(run(env),1);assert.equal(gl.elements.length,2);assert.equal(gl.composites.length,1);
  mask.release();
 }
});
