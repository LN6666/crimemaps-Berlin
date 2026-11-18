import {getChunkResourceStoreForContext} from './render-runtime/chunk-resource-store';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBudget,ResourceBudgetReservation} from './render-runtime/resource-budget';
import {projectedShadowDepthPlane} from './projected-shadow-plane';

/** One viewport-sized R8 scratch target on the existing WebGL2 context. Projected
 * mesh triangles contribute their maximum opacity; the union is blended once.
 * No scene stencil bits or scene depth pixels are changed. */
const VERTEX=`#version 300 es
precision highp float;
out vec2 v_uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));v_uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D u_mask;uniform vec3 u_shadow_colour;uniform vec3 u_plane;uniform vec2 u_depth_range;
in vec2 v_uv;out vec4 colour;
void main(){float a=texture(u_mask,v_uv).r;if(a<=0.)discard;float z=dot(u_plane,vec3(v_uv*2.-1.,1.));if(z< -1.||z>1.)discard;gl_FragDepth=mix(u_depth_range.x,u_depth_range.y,z*.5+.5);colour=vec4(u_shadow_colour,a);}`;

/** The y=height depth plane lives in the dependency-free projected-shadow-plane
 * module; it is re-exported here for existing importers of this module. */
export {projectedShadowDepthPlane};

/** Logical texel storage of one R8 mask target (width x height x 1 byte). Driver
 * row padding, FBO/VAO/program objects and allocator overhead stay unmeasured. */
export const projectedShadowMaskBytes=(width:number,height:number)=>width*height;
type StorageClaim={reservation:ResourceBudgetReservation;width:number;height:number};
/** One shared target per context. Its storage claim lives on the context's page
 * ResourceBudget: admitted before texImage2D, never repeated for an unchanged
 * size, retired behind the page store's GPU fence when storage is replaced or
 * the last owner leaves, and released immediately once the context is lost. */
/** waiters: each owner's withdrawal of its pending admission for this target;
 * a loss withdraws them all, so no later ledger wave repaints for a lost target. */
type Resource={refs:number;framebuffer:WebGLFramebuffer;texture:WebGLTexture;program:WebGLProgram;vao:WebGLVertexArrayObject;width:number;height:number;limit:number;
 store:ChunkResourceStore;epoch:number;claim:StorageClaim|undefined;lost:boolean;unwatch:(()=>void)|undefined;waiters:Set<()=>void>};
const resources=new WeakMap<WebGL2RenderingContext,Resource>();
function destroy(gl:WebGL2RenderingContext,r:Resource){gl.deleteFramebuffer(r.framebuffer);gl.deleteTexture(r.texture);gl.deleteProgram(r.program);gl.deleteVertexArray(r.vao);}
function allocate(gl:WebGL2RenderingContext,store:ChunkResourceStore):Resource{
 const shaders:WebGLShader[]=[],epoch=store.contextEpoch(gl);let framebuffer:WebGLFramebuffer|null=null,texture:WebGLTexture|null=null,program:WebGLProgram|null=null,vao:WebGLVertexArrayObject|null=null;
 try{program=gl.createProgram();if(!program)throw Error('Shadow mask program allocation');for(const [type,text]of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]as const){const shader=gl.createShader(type);if(!shader)throw Error('Shadow mask shader allocation');shaders.push(shader);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Shadow mask shader: '+gl.getShaderInfoLog(shader));gl.attachShader(program,shader);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shadow mask link: '+gl.getProgramInfoLog(program));for(const shader of shaders)gl.detachShader(program,shader);framebuffer=gl.createFramebuffer();texture=gl.createTexture();vao=gl.createVertexArray();if(!framebuffer||!texture||!vao)throw Error('Shadow mask target allocation');return{refs:0,framebuffer,texture,program,vao,width:0,height:0,limit:gl.getParameter(gl.MAX_TEXTURE_SIZE),store,epoch,claim:undefined,lost:false,unwatch:undefined,waiters:new Set()};}
 catch(error){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
}
const contextLost=(gl:WebGL2RenderingContext)=>{try{return gl.isContextLost();}catch{return true;}};
/** A target from a lost (or store-invalidated) incarnation is never reused. */
const stale=(gl:WebGL2RenderingContext,r:Resource)=>r.lost||r.epoch!==r.store.contextEpoch(gl);
/** Whether the target's handles still belong to the current, unlost incarnation.
 * A moved store epoch alone does not prove a loss: an owner may invalidate a live
 * context (for example from its restore handler). isProgram is false, and raises
 * no error, for an object of a lost incarnation. */
function handlesLive(gl:WebGL2RenderingContext,r:Resource){
 if(r.lost||contextLost(gl))return false;
 if(r.epoch===r.store.contextEpoch(gl))return true;
 try{return typeof gl.isProgram==='function'&&gl.isProgram(r.program)===true;}catch{return false;}
}
/** Loss: no fence can complete, so the claim is returned at once, and every
 * owner's pending admission for this target is withdrawn (its ledger listener
 * removed, never woken): an owner draws, and admits, again after a restore.
 * The handles of a lost incarnation are deleted (a no-op) only by the last
 * owner's release. */
function abandon(gl:WebGL2RenderingContext,r:Resource){
 if(r.lost)return;
 r.lost=true;if(resources.get(gl)===r)resources.delete(gl);
 const unwatch=r.unwatch;r.unwatch=undefined;unwatch?.();
 const waiters=[...r.waiters];r.waiters.clear();for(const withdraw of waiters)withdraw();
 const claim=r.claim;r.claim=undefined;claim?.reservation.release();
}
/** Transfers an existing claim to the page store; true when the store now owns
 * dispose. A lost context or incarnation and a destroyed store release at once.
 * Live handles retire behind a fence of the incarnation that owns them now. */
function retireClaim(gl:WebGL2RenderingContext,r:Resource,claim:StorageClaim,dispose:()=>void,label:string):boolean{
 if(!claim.reservation.active)return false;
 if(r.store.destroyed||!handlesLive(gl,r)){claim.reservation.release();return false;}
 try{r.store.retireGpu({context:gl,epoch:r.store.contextEpoch(gl),reservation:claim.reservation,dispose,label});return true;}
 catch{claim.reservation.release();return false;}
}
function finalize(gl:WebGL2RenderingContext,r:Resource){
 if(resources.get(gl)===r)resources.delete(gl);
 const unwatch=r.unwatch;r.unwatch=undefined;unwatch?.();
 const claim=r.claim;r.claim=undefined;
 if(contextLost(gl)){claim?.reservation.release();destroy(gl,r);return;}
 // A restored context invalidated these handles; deleting them would only warn.
 if(!handlesLive(gl,r)){claim?.reservation.release();return;}
 if(claim&&retireClaim(gl,r,claim,()=>destroy(gl,r),'projected shadow mask R8 target'))return;
 destroy(gl,r);
}
/** A shared target this incarnation must not reuse. A lost one returns its claim
 * at once. Live handles that merely outlived a store epoch keep their claim,
 * leave the shared slot, and are retired behind the fence by their last owner. */
function retireStale(gl:WebGL2RenderingContext,r:Resource){
 if(!handlesLive(gl,r)){abandon(gl,r);return;}
 if(resources.get(gl)===r)resources.delete(gl);
 if(r.refs<=0)finalize(gl,r);
}
/** Free bytes plus bytes a pressure eviction could reclaim (recent cache). */
function reclaimableFits(budget:ResourceBudget,bytes:number){const stats=budget.stats;return stats.availableBytes+stats.recentBytes>=bytes;}
/** The canvas loss event returns the claim even before any owner draws again. */
function watchLoss(gl:WebGL2RenderingContext,r:Resource){
 const canvas=(gl as unknown as {canvas?:{addEventListener?:unknown;removeEventListener?:unknown}}).canvas;
 if(!canvas||typeof canvas.addEventListener!=='function'||typeof canvas.removeEventListener!=='function')return;
 const target=canvas as unknown as EventTarget,lost=()=>abandon(gl,r);
 target.addEventListener('webglcontextlost',lost);r.unwatch=()=>target.removeEventListener('webglcontextlost',lost);
}
export type ProjectedShadowMaskAdmission='idle'|'admitted'|'pending'|'unfit';
/** requestRepaint is woken once by the page ledger after a pending admission,
 * at the first availability wave whose free plus reclaimable bytes can hold the
 * size; there is no polling timer, and a waiting owner never re-asks the ledger
 * for the same size before that wake-up (or before its own size changes). */
export function createProjectedShadowMask(options:{requestRepaint?:()=>void}={}){
 let context:WebGL2RenderingContext|undefined,resident:Resource|undefined;
 let waiting:{key:string;controller:AbortController;target:Resource;withdraw:()=>void}|undefined,unfitKey:string|undefined;
 let admission:ProjectedShadowMaskAdmission='idle',requiredBytes=0,shortfallBytes=0,waits=0,wakeups=0,deferredWakeups=0,cancellations=0,lossWithdrawals=0,unfitAdmissions=0,lastUnfit:string|undefined;
 const stopWaiting=()=>{const current=waiting;waiting=undefined;if(!current)return;current.target.waiters.delete(current.withdraw);current.controller.abort();};
 function release(){stopWaiting();unfitKey=undefined;admission='idle';if(context&&resident&&--resident.refs===0)finalize(context,resident);context=undefined;resident=undefined;}
 /** Withdraws a pending admission that is no longer wanted (for example after
  * shadows were switched off): its ledger listener is removed and it is never
  * woken. The resident target and its claim are kept. */
 function cancelPending(){if(!waiting)return false;stopWaiting();if(admission==='pending')admission='idle';cancellations++;return true;}
 function lose(gl:WebGL2RenderingContext){const r=context===gl&&resident?resident:resources.get(gl);if(r)abandon(gl,r);}
 /** Reserve the replacement storage before any GL state or texImage2D call. */
 function admit(r:Resource,width:number,height:number):StorageClaim|undefined{
  const key=width+'x'+height,bytes=projectedShadowMaskBytes(width,height),budget=r.store.budget;
  if(waiting){if(waiting.key===key)return undefined;stopWaiting();}
  if(unfitKey===key)return undefined;
  unfitKey=undefined;requiredBytes=bytes;
  const limit=budget.stats.limitBytes;
  if(bytes>limit){unfitKey=key;admission='unfit';unfitAdmissions++;shortfallBytes=bytes-limit;lastUnfit=('Projected shadow mask '+key+' requires '+bytes+' logical bytes, above the page budget limit '+limit).slice(0,512);return undefined;}
  const result=budget.tryReserve({category:'texture',bytes,precision:'exact',identity:{},label:'projected shadow mask R8 '+key},{label:'projected shadow mask R8 '+key});
  if(result.ok){admission='admitted';shortfallBytes=0;return{reservation:result.reservation,width,height};}
  admission='pending';waits++;shortfallBytes=result.error.shortfallBytes;
  // A loss withdraws it like cancelPending (counted in cancellations, and in
  // lossWithdrawals): the canvas loss event reaches this owner even when no
  // frame draws again, so no later ledger wave repaints for the lost target.
  const controller=new AbortController(),withdraw=()=>{if(waiting?.controller!==controller)return;stopWaiting();if(admission==='pending')admission='idle';cancellations++;lossWithdrawals++;};
  waiting={key,controller,target:r,withdraw};r.waiters.add(withdraw);
  // A wave that cannot hold this size keeps the registration: no repaint and no
  // futile reserve, which would run every pressure evictor for nothing.
  budget.onAvailable(()=>{if(waiting?.controller!==controller)return;if(!reclaimableFits(budget,bytes)){deferredWakeups++;return;}stopWaiting();wakeups++;options.requestRepaint?.();},controller.signal);
  return undefined;
 }
 return{release,cancelPending,draw(gl:WebGL2RenderingContext,matrix:ArrayLike<number>,height:number,drawCoverage:()=>void,shadowColour:readonly[number,number,number]=[.12,.14,.16]){
  if(gl.isContextLost()){lose(gl);return false;}
  const plane=projectedShadowDepthPlane(matrix,height),viewport=gl.getParameter(gl.VIEWPORT) as Int32Array;
  if(gl.isContextLost()||!viewport||viewport.length!==4||viewport[2]<=0||viewport[3]<=0){if(gl.isContextLost())lose(gl);return false;}
  if(context===gl&&resident&&stale(gl,resident))release();
  if(context!==gl){
   release();let next=resources.get(gl);
   if(next&&stale(gl,next)){retireStale(gl,next);next=undefined;}
   if(!next){
    const store=getChunkResourceStoreForContext(gl);
    try{next=allocate(gl,store);}catch(error){if(gl.isContextLost())return false;throw error;}
    if(gl.isContextLost()){destroy(gl,next);return false;}
    watchLoss(gl,next);
   }
   context=gl;resident=next;resources.set(gl,next);next.refs++;
  }
  const r=resident!;
  // Match the bounded scene viewport; never allocate a second depth/stencil buffer.
  const ratio=Math.min(1,r.limit/viewport[2],r.limit/viewport[3],Math.sqrt(12000000/(viewport[2]*viewport[3]))),width=Math.max(1,Math.floor(viewport[2]*ratio)),heightPixels=Math.max(1,Math.floor(viewport[3]*ratio));
  let admitted:StorageClaim|undefined;
  if((r.width!==width||r.height!==heightPixels)&&!(r.claim&&r.claim.width===width&&r.claim.height===heightPixels)){admitted=admit(r,width,heightPixels);if(!admitted)return false;}
  else{stopWaiting();admission='admitted';}
  try{
  const old={framebuffer:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),activeTexture:gl.getParameter(gl.ACTIVE_TEXTURE),depth:gl.isEnabled(gl.DEPTH_TEST),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),depthRange:gl.getParameter(gl.DEPTH_RANGE),stencil:gl.isEnabled(gl.STENCIL_TEST),stencilMask:gl.getParameter(gl.STENCIL_WRITEMASK),stencilBackMask:gl.getParameter(gl.STENCIL_BACK_WRITEMASK),scissor:gl.isEnabled(gl.SCISSOR_TEST),cull:gl.isEnabled(gl.CULL_FACE),blend:gl.isEnabled(gl.BLEND),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA),equation:gl.getParameter(gl.BLEND_EQUATION_RGB),equationA:gl.getParameter(gl.BLEND_EQUATION_ALPHA),colour:gl.getParameter(gl.COLOR_WRITEMASK)};
  // Loss can happen during driver allocation or any state query, before its
  // DOM event reaches the layer owner. Never replay a partial/null snapshot.
  const equationValid=(value:unknown)=>typeof value==='number'&&(value===gl.FUNC_ADD||value===gl.FUNC_SUBTRACT||value===gl.FUNC_REVERSE_SUBTRACT||value===gl.MIN||value===gl.MAX);
  if(gl.isContextLost()||!equationValid(old.equation)||!equationValid(old.equationA)||old.colour?.length!==4||old.depthRange?.length!==2||typeof old.depthMask!=='boolean'||![old.activeTexture,old.depthFunc,old.stencilMask,old.stencilBackMask,old.src,old.dst,old.srcA,old.dstA].every(Number.isInteger))return false;
  gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),sampler=gl.getParameter(gl.SAMPLER_BINDING);
  if(gl.isContextLost())return false;
  let completed=false;
  try{
   gl.bindTexture(gl.TEXTURE_2D,r.texture);gl.bindSampler(0,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,r.framebuffer);
   if(r.width!==width||r.height!==heightPixels){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,width,heightPixels,0,gl.RED,gl.UNSIGNED_BYTE,null);
    // The re-specified storage now carries the admitted claim; the replaced
    // storage stays charged until submitted work passes the page store fence.
    if(admitted){const previous=r.claim;r.claim=admitted;admitted=undefined;if(previous)retireClaim(gl,r,previous,()=>{},'projected shadow mask replaced R8 storage');}
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,r.texture,0);const status=gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);if(gl.isContextLost())return false;if(status!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow mask framebuffer incomplete');r.width=width;r.height=heightPixels;
   }
   if(gl.isContextLost())return false;
   gl.viewport(0,0,width,heightPixels);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.colorMask(true,true,true,true);gl.clearBufferfv(gl.COLOR,0,new Float32Array(4));gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.MAX,gl.MAX);gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE);
   // Some shared surface programs retain active samplers even in their shadow branch.
   // Never leave the attached mask bound to a sampler during the coverage draw.
   gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(0,sampler);drawCoverage();
   if(gl.isContextLost())return false;
   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.framebuffer);gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3]);old.scissor?gl.enable(gl.SCISSOR_TEST):gl.disable(gl.SCISSOR_TEST);old.stencil?gl.enable(gl.STENCIL_TEST):gl.disable(gl.STENCIL_TEST);gl.stencilMaskSeparate(gl.FRONT,0);gl.stencilMaskSeparate(gl.BACK,0);gl.colorMask(old.colour[0],old.colour[1],old.colour[2],old.colour[3]);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);gl.depthFunc(old.depthFunc);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,r.texture);gl.bindSampler(0,null);gl.useProgram(r.program);gl.bindVertexArray(r.vao);gl.uniform1i(gl.getUniformLocation(r.program,'u_mask'),0);gl.uniform3fv(gl.getUniformLocation(r.program,'u_plane'),plane);gl.uniform3f(gl.getUniformLocation(r.program,'u_shadow_colour'),...shadowColour);gl.uniform2fv(gl.getUniformLocation(r.program,'u_depth_range'),old.depthRange);if(gl.isContextLost())return false;gl.drawArrays(gl.TRIANGLES,0,3);completed=true;
  }catch(error){if(gl.isContextLost())return false;throw error;}finally{
   if(!gl.isContextLost()){
   gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.framebuffer);gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3]);gl.useProgram(old.program);gl.bindVertexArray(old.vao);gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(0,sampler);gl.activeTexture(old.activeTexture);
   for(const [cap,on]of [[gl.DEPTH_TEST,old.depth],[gl.STENCIL_TEST,old.stencil],[gl.SCISSOR_TEST,old.scissor],[gl.CULL_FACE,old.cull],[gl.BLEND,old.blend]]as const)on?gl.enable(cap):gl.disable(cap);gl.stencilMaskSeparate(gl.FRONT,old.stencilMask);gl.stencilMaskSeparate(gl.BACK,old.stencilBackMask);gl.depthFunc(old.depthFunc);gl.depthMask(old.depthMask);gl.blendEquationSeparate(old.equation,old.equationA);gl.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);gl.colorMask(old.colour[0],old.colour[1],old.colour[2],old.colour[3]);
   }
  }
  return completed&&!gl.isContextLost();
  }finally{
   // An admitted claim that never reached texImage2D is refunded; loss observed
   // anywhere in this draw returns the shared claim without waiting for a fence.
   if(admitted)admitted.reservation.release();
   if(contextLost(gl))lose(gl);
  }
 },get stats(){const live=resident&&!resident.lost?resident:undefined,claim=live?.claim;return{contexts:resident?1:0,textures:resident?1:0,framebuffers:resident?1:0,bytes:live?live.width*live.height:0,
  claimedBytes:claim?.reservation.active?claim.reservation.bytes:0,admission,requiredBytes,shortfallBytes,waits,wakeups,deferredWakeups,cancellations,lossWithdrawals,unfitAdmissions,lastUnfit,waiting:waiting!==undefined,
  measurement:'logical R8 texel storage admitted on the page ResourceBudget before texImage2D; one shared claim per context; program, VAO/FBO objects and driver padding are unmeasured'};}};
}
