import {validateSharedDisplayDomain,sharedDisplayMetadataBytes,type DisplayDomain} from './environment-shared-display-contract.mjs';
import {GREEN_GROUND_MATERIAL_GLSL} from './environment-green-ground';
import {ENVIRONMENT_SURFACE_LIGHT_GLSL,type SceneLightUniforms} from './scene-surface-light';
import {projectedShadowDepthPlane} from './projected-shadow-plane';
import {environmentProgramAllowanceCosts} from './environment-resource-budget';
import type {ChunkResourceStore,ChunkResourceLease} from './render-runtime/chunk-resource-types';
import type {ResourceBudgetReservation,ResourceBudgetCost} from './render-runtime/resource-budget';

/** Source triangles are accumulated privately; this is NOT a source polygon
 * simplifier, a global geometry resident, or the shared shadow-mask scratch.
 * The published R8 role texture survives until a complete successor commits.
 */
export const GREEN_COVERAGE_LIMITS=Object.freeze({vertices:20000,indices:60000,maxPixels:1024**2,maxDimension:2048,idleMs:17000});
const SHA=/^[a-f0-9]{64}$/,RAD=Math.PI/180,R=6378137;
const COVER_VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;layout(location=1) in float a_role;
uniform mat4 u_matrix;flat out float v_role;
void main(){v_role=a_role;gl_Position=u_matrix*vec4(a_position.x,.01,a_position.z,1.);}`;
const COVER_FRAGMENT=`#version 300 es
precision highp float;flat in float v_role;out vec4 colour;
void main(){colour=vec4(v_role/255.,0.,0.,1.);gl_FragDepth=v_role==3.? .75:.25;}`;
const SHARED_DISPLAY_VERTEX=`#version 300 es
precision highp float;layout(location=0) in vec3 a_position;uniform mat4 u_matrix;uniform bool u_screen;
void main(){if(u_screen){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}else gl_Position=u_matrix*vec4(a_position.x,.01,a_position.z,1.);}`;
const SHARED_DISPLAY_FRAGMENT=`#version 300 es
precision highp float;uniform float u_role;out vec4 colour;void main(){colour=vec4(u_role/255.,0.,0.,1.);gl_FragDepth=u_role==3.? .75:.25;}`;
const COMPOSITE_VERTEX=`#version 300 es
precision highp float;out vec2 v_uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));v_uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const GREEN_COVERAGE_COMPOSITE_GLSL=`#version 300 es
precision highp float;
in vec2 v_uv;uniform sampler2D u_mask;uniform mat4 u_inverse;uniform mat4 u_capture_matrix;
uniform vec3 u_plane;uniform vec2 u_depth_range;out vec4 colour;
${ENVIRONMENT_SURFACE_LIGHT_GLSL}
${GREEN_GROUND_MATERIAL_GLSL}
void main(){vec2 ndc=v_uv*2.-1.;float z=dot(u_plane,vec3(ndc,1.));if(z< -1.||z>1.)discard;
 vec4 p=u_inverse*vec4(ndc,z,1.);if(abs(p.w)<1.e-12)discard;
 vec3 position=p.xyz/p.w;position.y=.01;
 vec4 captured=u_capture_matrix*vec4(position,1.);if(captured.w<=0.)discard;
 vec2 uv=captured.xy/captured.w*.5+.5;if(any(lessThan(uv,vec2(0.)))||any(greaterThanEqual(uv,vec2(1.))))discard;
 float role=floor(texture(u_mask,uv).r*255.+.5);if(role<3.||role>6.)discard;
 colour=greenGroundColor(position,vec3(0.,1.,0.),role);
 gl_FragDepth=mix(u_depth_range.x,u_depth_range.y,z*.5+.5);}`;

export type CoverageBinding=Readonly<{city:string;sourceSHA256:string;boundarySHA256:string;snapshot:string;origin:readonly[number,number]}>;
export type CoverageBegin=Readonly<{generation:string;streamId:string;sourcePartitionProofSHA256:string;binding:CoverageBinding;
 matrix:ArrayLike<number>;viewport:readonly[number,number,number,number];displaySupplement?:Readonly<{contract:DisplayDomain['contract'];catalogSHA256:string;inputBundleSHA256:string}>}>;
export type CoverageDecoded=Readonly<{positions:Float32Array;indices:Uint32Array;vertexCount:number;indexCount:number;
 origin:readonly[number,number];boundarySHA256:string;sourceFeatureIds?:readonly string[]}>;
export type CoverageChunk=Readonly<{ordinal:number;key:string;binding:CoverageBinding;decoded:CoverageDecoded;
 /** Ack the stream only after this chunk's submitted GPU work has retired. */
 release():void;displayDomain?:DisplayDomain}>;
export type CoverageTerminal=Readonly<{closed:true;streamId:string;sourcePartitionProofSHA256:string;chunkCount:number;
 status:'complete'|'partial-source-held';coverageComplete:boolean;sourceHeldGreen:number;displaySupplementCatalogSHA256?:string}>;
type Target={texture:WebGLTexture;framebuffer:WebGLFramebuffer;depth:WebGLRenderbuffer|undefined;
 claim:ResourceBudgetReservation;width:number;height:number;epoch:number;maskIdentity:object;depthIdentity:object;retired?:boolean};
type Programs={cover:WebGLProgram;sharedDisplay:WebGLProgram;composite:WebGLProgram;vao:WebGLVertexArrayObject;claim:ResourceBudgetReservation;epoch:number};
type Transaction={spec:CoverageBegin;matrix:Float32Array;inverse:Float32Array;plane:Float32Array;target:Target;chunks:number;displayChunks:number;terminal?:CoverageTerminal;
 main?:ChunkResourceLease<Target>;cache?:ChunkResourceLease<Target>};
type Current={input:CoverageChunk;tx:Transaction;claim:ResourceBudgetReservation;state:'granting'|'queued'|'retiring';releaseStarted?:boolean;vao?:WebGLVertexArrayObject;vertex?:WebGLBuffer;index?:WebGLBuffer};
let nextOwner=1;
const finite=(v:ArrayLike<number>,n:number)=>v.length===n&&Array.from(v).every(Number.isFinite);
function require(ok:unknown,message:string):asserts ok{if(!ok)throw Error('Green coverage target: '+message);}
function origin(v:readonly[number,number]){return finite(v,2)&&Math.abs(v[0])<=180&&Math.abs(v[1])<=85;}
function validBinding(b:CoverageBinding){return !!b&&/^[a-z][a-z0-9-]*$/.test(b.city)&&SHA.test(b.sourceSHA256)&&SHA.test(b.boundarySHA256)&&!!b.snapshot&&b.snapshot.length<=128&&origin(b.origin);}
function equalBinding(a:CoverageBinding,b:CoverageBinding){return a.city===b.city&&a.sourceSHA256===b.sourceSHA256&&a.boundarySHA256===b.boundarySHA256&&a.snapshot===b.snapshot;}
function inverse(matrix:ArrayLike<number>){
 const rows=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>matrix[c*4+r]),...Array.from({length:4},(_,c)=>Number(c===r))]);
 for(let c=0;c<4;c++){let p=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;
  require(Math.abs(rows[p][c])>1.e-25,'singular camera');[rows[p],rows[c]]=[rows[c],rows[p]];const d=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=d;
  for(let r=0;r<4;r++)if(r!==c){const f=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=f*rows[c][k];}}
 return new Float32Array(Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]));
}
function sourceFrame(from:readonly[number,number],to:readonly[number,number]){
 const scale=R*Math.cos(to[1]*RAD),merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*RAD/2));
 return[(from[0]-to[0])*RAD*scale,(merc(from[1])-merc(to[1]))*scale,Math.cos(to[1]*RAD)/Math.cos(from[1]*RAD)];
}
/** Combine in CPU double precision before the single Float32 clip upload.
 * Adding a small source-local polygon to a kilometre-scale city offset in the
 * vertex shader loses narrow source turns a second time. This matrix preserves
 * the same original origin/scale/ground plane without rewriting packed vertices.
 * Capture/composite remain in the transaction's original reference frame. */
export function greenCoverageChunkClipMatrix(capture:ArrayLike<number>,from:readonly[number,number],to:readonly[number,number]){
 require(finite(capture,16)&&origin(from)&&origin(to),'chunk capture matrix/origin');
 const [x,z,scale]=sourceFrame(from,to),result=new Float32Array(16);
 for(let row=0;row<4;row++){
  result[row]=capture[row]*scale;
  result[row+4]=capture[row+4];
  result[row+8]=capture[row+8]*scale;
  result[row+12]=capture[row]*x+capture[row+8]*z+capture[row+12];
 }
 require(finite(result,16),'nonfinite chunk capture transform');return result;
}
/** All state changed by upload, offscreen coverage and final composite is local
 * to this call. READ_FRAMEBUFFER and scene stencil pixels are never touched. */
function withState<T>(gl:WebGL2RenderingContext,work:()=>T):T{
 const s={fb:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),rb:gl.getParameter(gl.RENDERBUFFER_BINDING),program:gl.getParameter(gl.CURRENT_PROGRAM),
  vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),array:gl.getParameter(gl.ARRAY_BUFFER_BINDING),viewport:gl.getParameter(gl.VIEWPORT),
  active:gl.getParameter(gl.ACTIVE_TEXTURE),depth:gl.isEnabled(gl.DEPTH_TEST),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),range:gl.getParameter(gl.DEPTH_RANGE),
  dither:gl.isEnabled(gl.DITHER),sampleAlpha:gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE),sampleCoverage:gl.isEnabled(gl.SAMPLE_COVERAGE),discard:gl.isEnabled(gl.RASTERIZER_DISCARD),stencil:gl.isEnabled(gl.STENCIL_TEST),stencilFront:[gl.getParameter(gl.STENCIL_WRITEMASK),gl.getParameter(gl.STENCIL_FUNC),gl.getParameter(gl.STENCIL_REF),gl.getParameter(gl.STENCIL_VALUE_MASK),gl.getParameter(gl.STENCIL_FAIL),gl.getParameter(gl.STENCIL_PASS_DEPTH_FAIL),gl.getParameter(gl.STENCIL_PASS_DEPTH_PASS)],stencilBack:[gl.getParameter(gl.STENCIL_BACK_WRITEMASK),gl.getParameter(gl.STENCIL_BACK_FUNC),gl.getParameter(gl.STENCIL_BACK_REF),gl.getParameter(gl.STENCIL_BACK_VALUE_MASK),gl.getParameter(gl.STENCIL_BACK_FAIL),gl.getParameter(gl.STENCIL_BACK_PASS_DEPTH_FAIL),gl.getParameter(gl.STENCIL_BACK_PASS_DEPTH_PASS)],scissor:gl.isEnabled(gl.SCISSOR_TEST),cull:gl.isEnabled(gl.CULL_FACE),blend:gl.isEnabled(gl.BLEND),colour:gl.getParameter(gl.COLOR_WRITEMASK),
  eq:gl.getParameter(gl.BLEND_EQUATION_RGB),eqA:gl.getParameter(gl.BLEND_EQUATION_ALPHA),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};
 require(!gl.isContextLost()&&s.viewport?.length===4&&s.range?.length===2&&s.colour?.length===4,'context lost during state capture');
 gl.activeTexture(gl.TEXTURE0);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),sampler=gl.getParameter(gl.SAMPLER_BINDING);
 try{return work();}finally{if(!gl.isContextLost()){
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,s.fb);gl.bindRenderbuffer(gl.RENDERBUFFER,s.rb);gl.useProgram(s.program);gl.bindVertexArray(s.vao);gl.bindBuffer(gl.ARRAY_BUFFER,s.array);
  for(const [face,v]of [[gl.FRONT,s.stencilFront],[gl.BACK,s.stencilBack]]as const){gl.stencilMaskSeparate(face,v[0]);gl.stencilFuncSeparate(face,v[1],v[2],v[3]);gl.stencilOpSeparate(face,v[4],v[5],v[6]);}
  gl.viewport(s.viewport[0],s.viewport[1],s.viewport[2],s.viewport[3]);gl.depthMask(s.depthMask);gl.depthFunc(s.depthFunc);gl.depthRange(s.range[0],s.range[1]);gl.colorMask(s.colour[0],s.colour[1],s.colour[2],s.colour[3]);
  gl.blendEquationSeparate(s.eq,s.eqA);gl.blendFuncSeparate(s.src,s.dst,s.srcA,s.dstA);
  for(const [cap,on]of [[gl.DITHER,s.dither],[gl.SAMPLE_ALPHA_TO_COVERAGE,s.sampleAlpha],[gl.SAMPLE_COVERAGE,s.sampleCoverage],[gl.RASTERIZER_DISCARD,s.discard],[gl.DEPTH_TEST,s.depth],[gl.STENCIL_TEST,s.stencil],[gl.SCISSOR_TEST,s.scissor],[gl.CULL_FACE,s.cull],[gl.BLEND,s.blend]]as const)on?gl.enable(cap):gl.disable(cap);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.bindSampler(0,sampler);gl.activeTexture(s.active);
 }}
}
function compile(gl:WebGL2RenderingContext,vertex:string,fragment:string){
 const p=gl.createProgram(),shaders:WebGLShader[]=[];require(p,'program allocation');
 try{for(const [type,text]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]as const){const s=gl.createShader(type);require(s,'shader allocation');shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);require(gl.getShaderParameter(s,gl.COMPILE_STATUS),'shader compile');gl.attachShader(p,s);}
  gl.linkProgram(p);require(gl.getProgramParameter(p,gl.LINK_STATUS),'program link');return p;
 }catch(e){gl.deleteProgram(p);throw e;}finally{for(const s of shaders){gl.detachShader(p,s);gl.deleteShader(s);}}
}

export function createGreenCoverageTarget(options:{gl:WebGL2RenderingContext;store:ChunkResourceStore;requestFrame:()=>void;now?:()=>number}){
 const {gl,store,requestFrame}=options,now=options.now??(()=>performance.now()),owner=nextOwner++;let epoch=store.contextEpoch(gl),programs:Programs|undefined,retention=0;
 let staging:Transaction|undefined,published:Transaction|undefined,current:Current|undefined,pending:CoverageBegin|undefined;
 let active=true,inactiveSince:number|undefined,destroyed=false,state='idle',error:string|undefined,retiring=0,commits=0,chunkDraws=0,viewportPixels=0;
 let wait:AbortController|undefined,offRetire:(()=>void)|undefined;
 const stopWait=()=>{wait?.abort();wait=undefined;};
 const watch=()=>{if(!offRetire)offRetire=store.onRetirementPending?.(requestFrame);};
 const doneWatch=()=>{if(destroyed&&!retiring){offRetire?.();offRetire=undefined;}};
 function retire(claim:ResourceBudgetReservation,dispose:()=>void,label:string,allocationEpoch=epoch){
  if(!claim.active){dispose();return;}
  let done=false;const finish=()=>{if(done)return;done=true;claim.release();try{dispose();}finally{retiring--;doneWatch();}};retiring++;
  if(gl.isContextLost()||store.destroyed||allocationEpoch!==store.contextEpoch(gl)){finish();return;}
  // retireGpu.dispose is a PRE-fence deletion request, not a completion signal.
  // Forward the actual page reservation; its release is the store's post-fence
  // boundary. Keep handles and CPU arrays charged until that boundary, then
  // delete/ACK exactly once. No private fence or retirement timer is introduced.
  const transfer:ResourceBudgetReservation={adjust:(cost,options)=>claim.adjust(cost,options),release:finish,
   setRecent:(value,options)=>claim.setRecent(value,options),markRetiring:()=>claim.markRetiring(),setRetiring:value=>claim.setRetiring(value),
   get active(){return claim.active;},get bytes(){return claim.bytes;},get recent(){return claim.recent;}};
  watch();try{store.retireGpu({context:gl,epoch:allocationEpoch,reservation:transfer,dispose:()=>{},label});}
  catch(e){finish();throw e;}
 }
 function deleteTarget(t:Target){gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture);if(t.depth)gl.deleteRenderbuffer(t.depth);}
 function dropTarget(t:Target){if(t.retired)return;t.retired=true;retire(t.claim,()=>deleteTarget(t),'green coverage R8/depth target',t.epoch);}
 function releasePublished(tx:Transaction){const main=tx.main,cache=tx.cache;tx.main=tx.cache=undefined;main?.release();cache?.release();}
 function retainPublished(tx:Transaction){
  // A functional main role pins the current target. ONLY an explicit cache
  // role enters the existing store's 17s reupload expiry collector. allowRecent
  // stays false so clear/destroy's last release cannot create an idle orphan.
  tx.main=store.acquire({contentKey:`green-coverage-target:${owner}:${++retention}`,role:'main',
   estimate:{category:'texture',bytes:tx.target.width*tx.target.height,precision:'exact',identity:tx.target.maskIdentity,label:'green coverage retained target'},
   produce:()=>tx.target,dispose:()=>{if(published===tx){published=undefined;state='idle';}
    dropTarget(tx.target);if(!published&&!staging&&!current)dropPrograms();},allowRecent:false,cacheRetention:'reupload'});
  require(tx.main.state==='ready','target retention entry not ready');
 }
 function dropPrograms(){const p=programs;programs=undefined;if(p)retire(p.claim,()=>{gl.deleteProgram(p.cover);gl.deleteProgram(p.sharedDisplay);gl.deleteProgram(p.composite);gl.deleteVertexArray(p.vao);},'green coverage shader programs/VAO',p.epoch);}
 function releaseCurrent(c:Current){
  if(c.releaseStarted)return;c.releaseStarted=true;
  const dispose=()=>{try{if(c.vao)gl.deleteVertexArray(c.vao);if(c.vertex)gl.deleteBuffer(c.vertex);if(c.index)gl.deleteBuffer(c.index);}
   finally{if(current===c)current=undefined;try{c.input.release();}finally{requestFrame();}}};
  if(c.state==='queued'||c.state==='granting'){c.claim.release();dispose();}else retire(c.claim,dispose,'green coverage one chunk CPU/GPU',c.tx.target.epoch);
 }
 function discardStaging(){const tx=staging;staging=undefined;if(tx)dropTarget(tx.target);if(current?.state==='queued'||current?.state==='granting')releaseCurrent(current);}
 function cancel(reason='cancelled'){stopWait();pending=undefined;discardStaging();state=published?'published':'idle';error=reason;}
 function clear(){cancel('cleared');const old=published;published=undefined;if(old)releasePublished(old);dropPrograms();state='idle';}
 function lost(){if(!gl.isContextLost())return;stopWait();pending=undefined;discardStaging();const c=current;if(c?.state==='retiring'){
   // Current submitted work has already been transferred to the page store.
   // Its loss invalidation below calls the one dispose/ack.
  }
  const old=published;published=undefined;if(old)releasePublished(old);dropPrograms();store.invalidateContext(gl,epoch);state='lost';error='context-lost';
 }
 const canvas=gl.canvas as unknown as EventTarget|undefined;
 canvas?.addEventListener?.('webglcontextlost',lost);
 function waitForBudget(){if(wait)return;const control=wait=new AbortController();store.budget.onAvailable(()=>{if(wait!==control)return;stopWait();requestFrame();},control.signal);}
 function ensurePrograms(){
  if(programs?.epoch===store.contextEpoch(gl))return true;if(programs)dropPrograms();
  const costs=environmentProgramAllowanceCosts([{vertex:COVER_VERTEX,fragment:COVER_FRAGMENT,attributes:['a_position','a_role']},
   {vertex:COMPOSITE_VERTEX,fragment:GREEN_COVERAGE_COMPOSITE_GLSL,attributes:[]},{vertex:SHARED_DISPLAY_VERTEX,fragment:SHARED_DISPLAY_FRAGMENT,attributes:['a_position']}],{count:1,attributes:0},'green coverage');
  costs.push({category:'metadata',bytes:16384,precision:'estimate',identity:{},label:'green coverage bounded owner/matrix/GL-state working set'});
  const admitted=store.budget.tryReserve(costs,{label:'green coverage programs and bounded owner',evict:false});if(!admitted.ok){waitForBudget();return false;}
  let cover:WebGLProgram|undefined,sharedDisplay:WebGLProgram|undefined,composite:WebGLProgram|undefined,vao:WebGLVertexArrayObject|undefined;
  try{cover=compile(gl,COVER_VERTEX,COVER_FRAGMENT);sharedDisplay=compile(gl,SHARED_DISPLAY_VERTEX,SHARED_DISPLAY_FRAGMENT);composite=compile(gl,COMPOSITE_VERTEX,GREEN_COVERAGE_COMPOSITE_GLSL);vao=gl.createVertexArray()??undefined;require(vao&&!gl.isContextLost(),'program/VAO context');
   programs={cover,sharedDisplay,composite,vao,claim:admitted.reservation,epoch:store.contextEpoch(gl)};return true;
  }catch(e){if(cover)gl.deleteProgram(cover);if(sharedDisplay)gl.deleteProgram(sharedDisplay);if(composite)gl.deleteProgram(composite);if(vao)gl.deleteVertexArray(vao);admitted.reservation.release();throw e;}
 }
 function allocateTarget(spec:CoverageBegin):Target|undefined{
  const actual=gl.getParameter(gl.VIEWPORT) as ArrayLike<number>;
  require(actual?.length===4&&actual[2]>=spec.viewport[2]&&actual[3]>=spec.viewport[3]&&
   gl.drawingBufferWidth>=spec.viewport[2]&&gl.drawingBufferHeight>=spec.viewport[3],'target exceeds actual drawing viewport');
  const max=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,limit=GREEN_COVERAGE_LIMITS;
  const ratio=Math.min(1,max/spec.viewport[2],max/spec.viewport[3],limit.maxDimension/spec.viewport[2],limit.maxDimension/spec.viewport[3],Math.sqrt(limit.maxPixels/(spec.viewport[2]*spec.viewport[3])));
  let width=Math.max(1,Math.floor(spec.viewport[2]*ratio)),height=Math.max(1,Math.floor(spec.viewport[3]*ratio));
  for(;;){const pixels=width*height,maskIdentity={},depthIdentity={};const costs:ResourceBudgetCost[]=[
    {category:'texture',bytes:pixels,precision:'exact',identity:maskIdentity,label:'green persistent R8 material roles'},
    {category:'mask',bytes:pixels*4,precision:'estimate',identity:depthIdentity,label:'green internal DEPTH24_STENCIL8 conservative 4 bytes/texel'}];
   const admitted=store.budget.tryReserve(costs,{label:'green coverage private target',evict:false});
   if(admitted.ok){let texture:WebGLTexture|undefined,framebuffer:WebGLFramebuffer|undefined,depth:WebGLRenderbuffer|undefined;
    try{texture=gl.createTexture()??undefined;framebuffer=gl.createFramebuffer()??undefined;depth=gl.createRenderbuffer()??undefined;require(texture&&framebuffer&&depth,'target object allocation');
     withState(gl,()=>{gl.bindTexture(gl.TEXTURE_2D,texture!);gl.bindSampler(0,null);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,width,height,0,gl.RED,gl.UNSIGNED_BYTE,null);
      for(const [name,value]of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,name,value);
      gl.bindRenderbuffer(gl.RENDERBUFFER,depth!);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH24_STENCIL8,width,height);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,framebuffer!);
      gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture!,0);gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER,gl.DEPTH_STENCIL_ATTACHMENT,gl.RENDERBUFFER,depth!);
      require(gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&!gl.isContextLost(),'framebuffer incomplete/lost');
      gl.viewport(0,0,width,height);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.depthMask(true);gl.clearBufferfv(gl.COLOR,0,new Float32Array(4));gl.clearBufferfv(gl.DEPTH,0,new Float32Array([1]));});
     return{texture,framebuffer,depth,claim:admitted.reservation,width,height,epoch:store.contextEpoch(gl),maskIdentity,depthIdentity};
    }catch(e){if(texture)gl.deleteTexture(texture);if(framebuffer)gl.deleteFramebuffer(framebuffer);if(depth)gl.deleteRenderbuffer(depth);admitted.reservation.release();throw e;}
   }
   if(width===1&&height===1){waitForBudget();return undefined;}width=Math.max(1,Math.floor(width/2));height=Math.max(1,Math.floor(height/2));
  }
 }
 function start(spec:CoverageBegin){
  if(current){state='pending-chunk-retirement';requestFrame();return false;}if(gl.isContextLost()){lost();return false;}
  epoch=store.contextEpoch(gl);const matrix=new Float32Array(Array.from(spec.matrix)),inv=inverse(matrix),plane=new Float32Array(projectedShadowDepthPlane(matrix,Math.fround(.01)));
  if(!ensurePrograms()){state='pending-budget';return false;}const target=allocateTarget(spec);if(!target){state='pending-budget';return false;}
  const tx:Transaction={spec,matrix,inverse:inv,plane,target,chunks:0,displayChunks:0};
  staging=tx;pending=undefined;stopWait();state='building';viewportPixels=target.width*target.height;error=undefined;requestFrame();return true;
 }
 function begin(spec:CoverageBegin){
  require(!destroyed,'destroyed');require(validBinding(spec.binding)&&SHA.test(spec.streamId)&&SHA.test(spec.sourcePartitionProofSHA256)&&!!spec.generation&&spec.generation.length<=256,'begin binding');
  require(finite(spec.matrix,16)&&finite(spec.viewport,4)&&spec.viewport[2]>0&&spec.viewport[3]>0,'camera/viewport');
  if(spec.displaySupplement)require(spec.displaySupplement.contract==='approved-source-municipal-shared-display-v1'&&SHA.test(spec.displaySupplement.catalogSHA256)&&SHA.test(spec.displaySupplement.inputBundleSHA256),'explicit supplement catalog');
  // Compute before allocation so an invalid camera never strands new storage.
  inverse(spec.matrix);projectedShadowDepthPlane(spec.matrix,Math.fround(.01));cancel('superseded');
  const copy:CoverageBegin={...spec,binding:{...spec.binding,origin:[...spec.binding.origin]},matrix:Array.from(spec.matrix),viewport:[...spec.viewport],displaySupplement:spec.displaySupplement?{...spec.displaySupplement}:undefined};pending=copy;
  try{return start(copy);}catch(e){cancel(String(e));if(gl.isContextLost())lost();throw e;}
 }
 function enqueue(input:CoverageChunk){
  require(!destroyed&&!!staging,'no active transaction');const tx=staging;
  require(!current&&!tx.terminal,'one resident chunk; no enqueue after stream terminal');
  try{require(Number.isSafeInteger(input.ordinal)&&input.ordinal===tx.chunks&&!!input.key&&input.key.length<=256&&typeof input.release==='function','stable catalog ordinal/key/ack');
   require(validBinding(input.binding)&&equalBinding(input.binding,tx.spec.binding),'chunk source binding');const d=input.decoded;
   require(d&&origin(d.origin)&&d.origin[0]===input.binding.origin[0]&&d.origin[1]===input.binding.origin[1]&&d.boundarySHA256===tx.spec.binding.boundarySHA256&&d.positions instanceof Float32Array&&d.indices instanceof Uint32Array&&
    Number.isSafeInteger(d.vertexCount)&&d.vertexCount>=3&&d.vertexCount<=20000&&Number.isSafeInteger(d.indexCount)&&d.indexCount>=(input.displayDomain?0:3)&&d.indexCount<=60000&&d.indexCount%3===0&&
    d.positions.length===d.vertexCount*4+3&&d.indices.length===d.indexCount&&d.positions.byteOffset===0&&d.indices.byteOffset===0&&
    d.positions.byteLength===d.positions.buffer.byteLength&&d.indices.byteLength===d.indices.buffer.byteLength,'decoded chunk cap/layout');
   for(let i=0;i<d.vertexCount;i++){const at=i*4,role=d.positions[at+3];require(Number.isFinite(d.positions[at])&&Number.isFinite(d.positions[at+2])&&Object.is(d.positions[at+1],Math.fround(.01))&&Number.isInteger(role)&&role>=3&&role<=6,'source vertex/role/plane');}
   require(d.positions.at(-3)===0&&d.positions.at(-2)===1&&d.positions.at(-1)===0,'constant UP tail');
   for(let i=0;i<d.indexCount;i+=3){const a=d.indices[i],b=d.indices[i+1],c=d.indices[i+2];require(a<d.vertexCount&&b<d.vertexCount&&c<d.vertexCount&&a!==b&&b!==c&&a!==c&&d.positions[a*4+3]===d.positions[b*4+3]&&d.positions[a*4+3]===d.positions[c*4+3],'source triangle/role');}
   if(input.displayDomain){require(!!tx.spec.displaySupplement&&tx.spec.displaySupplement.inputBundleSHA256===input.displayDomain.inputBundleSHA256,'ring chunk must bind explicit supplemental catalog');validateSharedDisplayDomain(input.displayDomain,d,input.binding);}
   const costs:ResourceBudgetCost[]=[{category:'packed',bytes:d.positions.byteLength,precision:'exact',identity:d.positions.buffer,label:'green one decoded vertex array'},
    {category:'packed',bytes:d.indices.byteLength,precision:'exact',identity:d.indices.buffer,label:'green one decoded index array'},
    {category:'gpu-buffer',bytes:d.positions.byteLength,precision:'exact',identity:{},label:'green one chunk vertex GPU'},
    {category:'gpu-buffer',bytes:d.indices.byteLength,precision:'exact',identity:{},label:'green one chunk index GPU'},
    {category:'gpu-vertex-array',bytes:384,precision:'estimate',identity:{},label:'green one chunk VAO'}];
   if(input.displayDomain)costs.push({category:'metadata',bytes:sharedDisplayMetadataBytes(input.displayDomain),precision:'estimate',identity:{},label:'shared display bounded validation working set'});
   // The decoded lease and shared permit remain held during one bounded
   // pressure admission: only reclaimable cache entries may be evicted.
   // Pressure callbacks are synchronous and may cancel/destroy/supersede us.
   const admitted=store.budget.tryReserve(costs,{label:'green coverage current chunk',evict:true});
   if(destroyed||staging!==tx||current||tx.terminal||gl.isContextLost()){
    if(admitted.ok)admitted.reservation.release();
    if(gl.isContextLost())lost();
    throw new DOMException('Green coverage transaction changed during budget admission','AbortError');
   }
   if(!admitted.ok){state='pending-budget';waitForBudget();return false;}
   // No GPU submission may occur before enqueue returns and the controller
   // transfers its source lease. A reentrant frame sees 'granting' and waits.
   stopWait();const queued:Current={input,tx,claim:admitted.reservation,state:'granting'};current=queued;state='building';
   try{queueMicrotask(()=>{
    if(destroyed||staging!==tx||current!==queued||gl.isContextLost()){if(current===queued)releaseCurrent(queued);return;}
    queued.state='queued';
    try{requestFrame();}catch(error){if(current===queued)releaseCurrent(queued);if(staging===tx&&!destroyed)cancel(String(error));}
   });}catch(error){if(current===queued)releaseCurrent(queued);throw error;}
   return true;
  }catch(e){if(!destroyed&&staging===tx&&!current&&!tx.terminal)cancel(String(e));throw e;}
 }
 function finish(terminal:CoverageTerminal){
  require(!!staging,'no active transaction');const tx=staging;
  try{if(tx.spec.displaySupplement)require(terminal.displaySupplementCatalogSHA256===tx.spec.displaySupplement.catalogSHA256,'supplement terminal catalog identity');require(terminal.closed===true&&terminal.streamId===tx.spec.streamId&&terminal.sourcePartitionProofSHA256===tx.spec.sourcePartitionProofSHA256&&
   Number.isSafeInteger(terminal.chunkCount)&&terminal.chunkCount===tx.chunks+(current?.tx===tx&&(current.state==='queued'||current.state==='granting')?1:0)&&
   ['complete','partial-source-held'].includes(terminal.status)&&Number.isSafeInteger(terminal.sourceHeldGreen)&&terminal.sourceHeldGreen>=0&&
   (terminal.status==='complete'?terminal.coverageComplete===true&&terminal.sourceHeldGreen===0:terminal.coverageComplete===false&&terminal.sourceHeldGreen>0),'unclosed/mismatched stream terminal');
   tx.terminal={...terminal};requestFrame();
  }catch(e){cancel(String(e));throw e;}
 }
 function step(time=now()){
  if(destroyed&&retiring===0)return;store.collectRetired();if(gl.isContextLost()){lost();return;}
  if(!active)return; // Existing ChunkResourceStore expiry owns idle 17s, no local timer.
  if(pending&&!current){try{start(pending);}catch(e){cancel(String(e));throw e;}}
  const c=current;
  if(c?.state==='queued'){
   try{const p=programs;require(p&&staging===c.tx&&p.epoch===store.contextEpoch(gl),'stale chunk transaction');const d=c.input.decoded;
    c.state='retiring'; // Any submitted allocation/upload must fence on failure too.
    withState(gl,()=>{c.vao=gl.createVertexArray()??undefined;c.vertex=gl.createBuffer()??undefined;c.index=gl.createBuffer()??undefined;require(c.vao&&c.vertex&&c.index,'chunk GPU allocation');
     gl.bindVertexArray(c.vao);gl.bindBuffer(gl.ARRAY_BUFFER,c.vertex);gl.bufferData(gl.ARRAY_BUFFER,d.positions,gl.STATIC_DRAW);require(gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE)===d.positions.byteLength,'GPU buffer vertex allocation');gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,16,12);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,d.indices,gl.STATIC_DRAW);require(gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER,gl.BUFFER_SIZE)===d.indices.byteLength,'GPU buffer index allocation');
     gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,c.tx.target.framebuffer);gl.viewport(0,0,c.tx.target.width,c.tx.target.height);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.depthRange(0,1);gl.colorMask(true,true,true,true);
     // Never sample the texture attached as the coverage draw target.
     gl.bindTexture(gl.TEXTURE_2D,null);gl.bindSampler(0,null);gl.useProgram(p.cover);gl.uniformMatrix4fv(gl.getUniformLocation(p.cover,'u_matrix'),false,greenCoverageChunkClipMatrix(c.tx.matrix,d.origin,c.tx.spec.binding.origin));
     if(c.input.displayDomain){
      const domain=c.input.displayDomain,program=p.sharedDisplay;gl.disable(gl.DITHER);gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.disable(gl.SAMPLE_COVERAGE);gl.disable(gl.RASTERIZER_DISCARD);validateSharedDisplayDomain(domain,d,c.input.binding);
      require(gl.getError()===gl.NO_ERROR&&!gl.isContextLost(),'preexisting GL error before shared display');
      gl.useProgram(program);gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,greenCoverageChunkClipMatrix(c.tx.matrix,d.origin,c.tx.spec.binding.origin));
      gl.uniform1f(gl.getUniformLocation(program,'u_role'),domain.role);const screen=gl.getUniformLocation(program,'u_screen');
      gl.enable(gl.STENCIL_TEST);gl.stencilMask(255);gl.clearBufferiv(gl.STENCIL,0,new Int32Array([0]));gl.colorMask(false,false,false,false);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
      const union=(components:DisplayDomain['sourcePolygons'],bit:number)=>{for(const poly of components){
       gl.stencilMask(1);gl.clearBufferiv(gl.STENCIL,0,new Int32Array([0]));gl.stencilFunc(gl.ALWAYS,0,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.INVERT);gl.uniform1i(screen,0);
       for(const ring of poly)gl.drawArrays(gl.TRIANGLE_FAN,ring.first,ring.count);
       gl.stencilMask(bit);gl.stencilFunc(gl.EQUAL,bit|1,1);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.uniform1i(screen,1);gl.drawArrays(gl.TRIANGLES,0,3);
      }};
      union(domain.municipalityPolygons,2);union(domain.sourcePolygons,4);
      gl.stencilMask(0);gl.stencilFunc(gl.EQUAL,6,6);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);gl.colorMask(true,true,true,true);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.uniform1i(screen,1);gl.drawArrays(gl.TRIANGLES,0,3);
      require(gl.getError()===gl.NO_ERROR&&!gl.isContextLost(),'shared display GL error/loss');c.tx.displayChunks++;
     }else gl.drawElements(gl.TRIANGLES,d.indexCount,gl.UNSIGNED_INT,0);require(!gl.isContextLost(),'context lost after coverage draw');});
    chunkDraws++;c.tx.chunks++;c.state='retiring';releaseCurrent(c);state='waiting-chunk-fence';return;
   }catch(e){releaseCurrent(c);cancel(String(e));if(gl.isContextLost())lost();throw e;}
  }
  if(current)return;
  const tx=staging;if(tx?.terminal){
   // Last chunk's actual retirement has completed before this branch.
   require(tx.terminal.chunkCount===tx.chunks,'terminal chunk mismatch');
   if(tx.target.depth){withState(gl,()=>{gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,tx.target.framebuffer);gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER,gl.DEPTH_STENCIL_ATTACHMENT,gl.RENDERBUFFER,null);});
    gl.deleteRenderbuffer(tx.target.depth);tx.target.depth=undefined;
    require(tx.target.claim.adjust({category:'texture',bytes:tx.target.width*tx.target.height,precision:'exact',identity:tx.target.maskIdentity,label:'published green R8 material roles'},{evict:false}),'decreasing target claim');}
   try{retainPublished(tx);}catch(e){releasePublished(tx);cancel(String(e));throw e;}
   const old=published;published=tx;staging=undefined;if(old)releasePublished(old);commits++;state='published';error=undefined;requestFrame();
  }
 }
 function draw(matrix:ArrayLike<number>,light:SceneLightUniforms){
  if(!active||!published||!programs||gl.isContextLost())return false;const tx=published,p=programs;
  if(tx.target.epoch!==store.contextEpoch(gl)){clear();return false;}
  try{return withState(gl,()=>{const viewport=gl.getParameter(gl.VIEWPORT) as number[],range=gl.getParameter(gl.DEPTH_RANGE) as number[];
   if(!viewport||viewport.length!==4||!finite(matrix,16))return false;
   const currentMatrix=new Float32Array(Array.from(matrix)),currentInverse=inverse(currentMatrix),currentPlane=new Float32Array(projectedShadowDepthPlane(currentMatrix,Math.fround(.01)));
   gl.useProgram(p.composite);gl.bindVertexArray(p.vao);gl.bindTexture(gl.TEXTURE_2D,tx.target.texture);gl.bindSampler(0,null);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);
   gl.enable(gl.BLEND);gl.blendEquationSeparate(gl.FUNC_ADD,gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.uniform1i(gl.getUniformLocation(p.composite,'u_mask'),0);gl.uniformMatrix4fv(gl.getUniformLocation(p.composite,'u_inverse'),false,currentInverse);gl.uniformMatrix4fv(gl.getUniformLocation(p.composite,'u_capture_matrix'),false,tx.matrix);gl.uniform3fv(gl.getUniformLocation(p.composite,'u_plane'),currentPlane);gl.uniform2fv(gl.getUniformLocation(p.composite,'u_depth_range'),range);
   gl.uniform3f(gl.getUniformLocation(p.composite,'u_scene_sun_direction'),light.direction[0],light.direction[1],light.direction[2]);gl.uniform1f(gl.getUniformLocation(p.composite,'u_scene_daylight'),light.daylight);gl.uniform1f(gl.getUniformLocation(p.composite,'u_scene_light_enabled'),light.enabled===false?0:1);
   gl.drawArrays(gl.TRIANGLES,0,3);return!gl.isContextLost();});
  }finally{if(gl.isContextLost())lost();}
 }
 function setActive(value:boolean,time=now()){if(active===value)return;active=value;if(value){inactiveSince=undefined;
   if(published?.cache&&!published.cache.released){published.main=published.cache.retain('main');published.cache.release();published.cache=undefined;}requestFrame();}
  else{inactiveSince=time;cancel('inactive');if(published?.main){const tx=published;
    try{tx.cache=tx.main!.retain('cache');}catch{published=undefined;releasePublished(tx);return;}
    const main=tx.main;tx.main=undefined;main?.release();}}}
 function destroy(){if(destroyed)return;destroyed=true;clear();canvas?.removeEventListener?.('webglcontextlost',lost);doneWatch();}
 return{begin,enqueue,enqueueSharedDisplay(input:CoverageChunk){require(!!input.displayDomain,'explicit shared-display chunk');return enqueue(input);},finish,step,draw,cancel,clear,destroy,setActive,contextLost:lost,
  get stats(){return{state,error,active,generation:published?.spec.generation,pendingGeneration:staging?.spec.generation??pending?.generation,
   coverageComplete:published?.terminal?.coverageComplete??false,sourceHeldGreen:published?.terminal?.sourceHeldGreen,
   targetWidth:published?.target.width??staging?.target.width??0,targetHeight:published?.target.height??staging?.target.height??0,
   viewportPixels,commits,chunkDraws,sharedDisplayChunks:published?.displayChunks??staging?.displayChunks??0,sharedDisplayContract:'approved-source-municipal-shared-display-v1',displaySupplementCatalogSHA256:published?.spec.displaySupplement?.catalogSHA256??staging?.spec.displaySupplement?.catalogSHA256,sourceHeldCleared:false,currentViewDifferenceAudit:'not inferred from prior128px fixtures',currentChunk:!!current,retiring,ownedLiveBytes:(programs?.claim.bytes??0)+(published?.target.claim.bytes??0)+(staging?.target.claim.bytes??0)+(current?.state==='queued'||current?.state==='granting'?current.claim.bytes:0),
   idleDeadline:inactiveSince===undefined?undefined:inactiveSince+17000,physicalMemory:'unmeasured' as const,
   admission:'page ResourceBudget; current chunk <=20k/60k; one persistent R8 + transient depth; no timer/RAF'};}};
}
