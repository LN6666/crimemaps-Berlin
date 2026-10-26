import type {SceneQuality} from './scene-environment-quality';
/** Only actual resident surface draws are permitted. Providers reuse their VAOs,
 * paint/material programs and current visibility, without advancing growth,
 * repacking/uploading geometry or invoking shadow/pick/outline passes. Clip the
 * ORIGINAL world Mercator z below clipPlaneWorldZ, before its camera reflection.
 * Providers preserve touched texture/sampler bindings and do not bind another FBO
 * or change the viewport. Each enforces both budgets BEFORE submitting a draw. */
export type PlanarReflectionPass={gl:WebGL2RenderingContext;mainMatrix:Float64Array;clipPlaneWorldZ:number;maxTriangles:number;maxDraws:number};
export type PlanarReflectionResult={triangles:number;draws:number;complete:boolean};
export type PlanarReflectionSource={
 getPlanarReflectionRevision():string;
 renderPlanarReflection(pass:PlanarReflectionPass):PlanarReflectionResult;
};
export type PlanarReflectionSnapshot={texture:WebGLTexture;mainMatrix:Float64Array;width:number;height:number;sourceRevision:string;complete:boolean};
export function mirrorMercatorProjection(matrix:ArrayLike<number>,planeWorldZ:number,out=new Float64Array(16)){
 if(matrix.length!==16||!Number.isFinite(planeWorldZ)||Math.abs(planeWorldZ)>1||!Array.from(matrix).every(Number.isFinite))throw Error('Invalid planar reflection projection');
 for(let i=0;i<16;i++)out[i]=matrix[i];
 for(let row=0;row<4;row++){out[8+row]=-matrix[8+row];out[12+row]=matrix[12+row]+2*planeWorldZ*matrix[8+row];}
 return out;
}
export function planarReflectionBudget(quality:SceneQuality,mobile=false){
 const pixels=mobile?(quality==='economy'?16384:32768):quality==='economy'?32768:quality==='balanced'?65536:131072;
 return{pixels,maxDimension:mobile?256:512,maxTriangles:mobile?30000:quality==='detail'?60000:quality==='balanced'?40000:15000,maxDraws:mobile?24:quality==='detail'?64:quality==='balanced'?48:24,fps:quality==='economy'?2:quality==='balanced'?4:8};
}
export function planarReflectionSize(width:number,height:number,pixels:number,maxDimension:number){
 if(![width,height,pixels,maxDimension].every(Number.isFinite)||width<=0||height<=0||pixels<1||maxDimension<1)throw Error('Invalid planar reflection size');
 const scale=Math.min(1,maxDimension/width,maxDimension/height,Math.sqrt(pixels/(width*height)));
 return[Math.max(1,Math.floor(width*scale)),Math.max(1,Math.floor(height*scale))]as const;
}
const sameMatrix=(a:ArrayLike<number>,b:ArrayLike<number>)=>{if(a.length!==16||b.length!==16)return false;for(let i=0;i<16;i++)if(a[i]!==b[i])return false;return true;};
/** One bounded FBO in the existing context. Static camera/source/material state
 * reuses its capture. Water normal animation alone never dirties this cache.
 * Throttled refreshes use the owner's shared frame clock, never a new timer. */
export function createPlanarBuildingReflection({mobile=false,now=()=>performance.now()}:{mobile?:boolean;now?:()=>number}={}){
 let source:PlanarReflectionSource|undefined,gl:WebGL2RenderingContext|undefined,texture:WebGLTexture|undefined,depth:WebGLRenderbuffer|undefined,fbo:WebGLFramebuffer|undefined;
 let width=0,height=0,mode='awaiting-resident-source',destroyed=false,pending=false,captures=0,failures=0,lastCapture=-Infinity,nextFrame=-Infinity,triangles=0,draws=0,complete=false,lastKey='',failedKey='',failedMessage='';
 let maxTextureSize:number|undefined;
 const mirror=new Float64Array(16),capturedMatrix=new Float64Array(16),failedMatrix=new Float64Array(16);let snapshot:PlanarReflectionSnapshot|undefined;
 const release=(deleteObjects=true)=>{if(gl&&deleteObjects&&!gl.isContextLost()){if(texture)gl.deleteTexture(texture);if(depth)gl.deleteRenderbuffer(depth);if(fbo)gl.deleteFramebuffer(fbo);}texture=depth=fbo=undefined;width=height=0;snapshot=undefined;lastKey='';pending=false;triangles=draws=0;complete=false;};
 const lostCapture=Symbol('lost planar reflection context');
 function requireLive(g:WebGL2RenderingContext){if(g.isContextLost())throw lostCapture;}
 function abandonLost(){release(false);gl=undefined;maxTextureSize=undefined;lastCapture=nextFrame=-Infinity;failedKey='';failedMessage='';mode='context-lost';}
 function save(g:WebGL2RenderingContext){
  // A partial snapshot can contain null enum/array values after loss. Never restore it.
  const get=(parameter:number)=>{const value=g.getParameter(parameter);requireLive(g);return value;};
  const active=get(g.ACTIVE_TEXTURE);g.activeTexture(g.TEXTURE0);requireLive(g);const texture0=get(g.TEXTURE_BINDING_2D);g.activeTexture(active);requireLive(g);return{
  read:get(g.READ_FRAMEBUFFER_BINDING),draw:get(g.DRAW_FRAMEBUFFER_BINDING),renderbuffer:get(g.RENDERBUFFER_BINDING),program:get(g.CURRENT_PROGRAM),vao:get(g.VERTEX_ARRAY_BINDING),array:get(g.ARRAY_BUFFER_BINDING),viewport:get(g.VIEWPORT),scissor:get(g.SCISSOR_BOX),clearColor:get(g.COLOR_CLEAR_VALUE),clearDepth:get(g.DEPTH_CLEAR_VALUE),colorMask:get(g.COLOR_WRITEMASK),depthMask:get(g.DEPTH_WRITEMASK),depthFunc:get(g.DEPTH_FUNC),depthRange:get(g.DEPTH_RANGE),src:get(g.BLEND_SRC_RGB),dst:get(g.BLEND_DST_RGB),srcA:get(g.BLEND_SRC_ALPHA),dstA:get(g.BLEND_DST_ALPHA),eq:get(g.BLEND_EQUATION_RGB),eqA:get(g.BLEND_EQUATION_ALPHA),cullFace:get(g.CULL_FACE_MODE),frontFace:get(g.FRONT_FACE),active,texture0,
  caps:[g.DEPTH_TEST,g.BLEND,g.CULL_FACE,g.SCISSOR_TEST,g.STENCIL_TEST,g.POLYGON_OFFSET_FILL].map(cap=>{const enabled=g.isEnabled(cap);requireLive(g);return[cap,enabled]as const;})};}
 function restore(g:WebGL2RenderingContext,s:ReturnType<typeof save>){g.bindFramebuffer(g.READ_FRAMEBUFFER,s.read);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,s.draw);g.bindRenderbuffer(g.RENDERBUFFER,s.renderbuffer);g.useProgram(s.program);g.bindVertexArray(s.vao);g.bindBuffer(g.ARRAY_BUFFER,s.array);g.viewport(s.viewport[0],s.viewport[1],s.viewport[2],s.viewport[3]);g.scissor(s.scissor[0],s.scissor[1],s.scissor[2],s.scissor[3]);g.clearColor(s.clearColor[0],s.clearColor[1],s.clearColor[2],s.clearColor[3]);g.clearDepth(s.clearDepth);g.colorMask(s.colorMask[0],s.colorMask[1],s.colorMask[2],s.colorMask[3]);g.depthMask(s.depthMask);g.depthFunc(s.depthFunc);g.depthRange(s.depthRange[0],s.depthRange[1]);g.blendFuncSeparate(s.src,s.dst,s.srcA,s.dstA);g.blendEquationSeparate(s.eq,s.eqA);g.cullFace(s.cullFace);g.frontFace(s.frontFace);for(const[cap,on]of s.caps)on?g.enable(cap):g.disable(cap);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,s.texture0);g.activeTexture(s.active);}
 function allocate(g:WebGL2RenderingContext,w:number,h:number){
  if(texture&&depth&&fbo&&width===w&&height===h)return;
  release();requireLive(g);texture=g.createTexture()??undefined;requireLive(g);depth=g.createRenderbuffer()??undefined;requireLive(g);fbo=g.createFramebuffer()??undefined;requireLive(g);if(!texture||!depth||!fbo)throw Error('Planar reflection allocation failed');
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);
  requireLive(g);g.bindRenderbuffer(g.RENDERBUFFER,depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,w,h);requireLive(g);g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,depth);const status=g.checkFramebufferStatus(g.FRAMEBUFFER);requireLive(g);if(status!==g.FRAMEBUFFER_COMPLETE)throw Error('Planar reflection framebuffer incomplete');width=w;height=h;
 }
 return{
  setSource(value:PlanarReflectionSource|undefined){if(destroyed)return;if(value&&(typeof value.getPlanarReflectionRevision!=='function'||typeof value.renderPlanarReflection!=='function'))throw Error('Invalid resident reflection source');if(source===value)return;source=value;release();failedKey='';lastCapture=-Infinity;mode=value?'awaiting-capture':'awaiting-resident-source';},
  capture(context:WebGL2RenderingContext,args:{mainMatrix:ArrayLike<number>;viewportWidth:number;viewportHeight:number;planeWorldZ:number;quality:SceneQuality;appearanceKey:string;enabled?:boolean}){
   if(destroyed||args.enabled===false||!source)return undefined;
   if(context.isContextLost()){abandonLost();return undefined;}
   if(gl!==context){release();gl=context;maxTextureSize=undefined;lastCapture=-Infinity;failedKey='';}
   const g=context,budget=planarReflectionBudget(args.quality,mobile);let revision:string,w:number,h:number,key:string;
   try{revision=source.getPlanarReflectionRevision();requireLive(g);if(typeof revision!=='string'||!revision||revision.length>4096)throw Error('Invalid resident reflection revision');mirrorMercatorProjection(args.mainMatrix,args.planeWorldZ,mirror);if(maxTextureSize===undefined){const limit:unknown=g.getParameter(g.MAX_TEXTURE_SIZE);requireLive(g);if(typeof limit!=='number'||!Number.isInteger(limit)||limit<=0)throw Error('Invalid reflection texture limit');maxTextureSize=limit;}[w,h]=planarReflectionSize(args.viewportWidth,args.viewportHeight,budget.pixels,Math.min(budget.maxDimension,maxTextureSize));key=revision+'|'+args.planeWorldZ+'|'+w+','+h+'|'+args.quality+'|'+args.appearanceKey;}catch(error){if(g.isContextLost()){abandonLost();return undefined;}mode='invalid-capture-input';failedMessage=String(error);pending=false;return undefined;}
   if(snapshot&&key===lastKey&&sameMatrix(capturedMatrix,args.mainMatrix)){pending=false;mode=complete?'captured':'captured-partial';return snapshot;}
   if(key===failedKey&&sameMatrix(failedMatrix,args.mainMatrix)){pending=false;return undefined;}
   if(width*height>budget.pixels)release();
   const time=now(),deadline=lastCapture+1000/budget.fps;
   if(time<deadline){pending=true;nextFrame=deadline;mode='awaiting-budgeted-refresh';return snapshot?.sourceRevision===revision?snapshot:undefined;}
   pending=false;lastCapture=time;let state:ReturnType<typeof save>|undefined,captured=false;
   try{
    state=save(g);
    allocate(g,w,h);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,null);g.bindFramebuffer(g.FRAMEBUFFER,fbo!);g.viewport(0,0,w,h);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.disable(g.STENCIL_TEST);g.disable(g.POLYGON_OFFSET_FILL);g.blendEquationSeparate(g.FUNC_ADD,g.FUNC_ADD);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthRange(0,1);g.depthMask(true);g.colorMask(true,true,true,true);g.clearColor(0,0,0,0);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
    requireLive(g);const result=source.renderPlanarReflection({gl:g,mainMatrix:mirror,clipPlaneWorldZ:args.planeWorldZ,maxTriangles:budget.maxTriangles,maxDraws:budget.maxDraws});requireLive(g);
    const target=g.getParameter(g.DRAW_FRAMEBUFFER_BINDING);requireLive(g);if(target!==fbo)throw Error('Resident reflection provider changed its target framebuffer');
    if(!result||!Number.isSafeInteger(result.triangles)||result.triangles<0||result.triangles>budget.maxTriangles||!Number.isSafeInteger(result.draws)||result.draws<0||result.draws>budget.maxDraws||typeof result.complete!=='boolean')throw Error('Resident reflection provider exceeded or omitted its declared draw budget');
    triangles=result.triangles;draws=result.draws;complete=result.complete;capturedMatrix.set(Array.from(args.mainMatrix));snapshot={texture:texture!,mainMatrix:capturedMatrix,width:w,height:h,sourceRevision:revision,complete};lastKey=key;failedKey='';failedMessage='';captured=true;
   }catch(error){if(g.isContextLost())abandonLost();else{failures++;failedKey=key;failedMatrix.set(Array.from(args.mainMatrix));failedMessage=String(error);release();mode='capture-failed';}}finally{if(!g.isContextLost()&&state)restore(g,state);if(g.isContextLost())abandonLost();}
   if(captured&&snapshot){captures++;mode=complete?'captured':'captured-partial';return snapshot;}
   return undefined;
  },
  frame(time=now()){return pending&&time>=nextFrame;},
  get needsFrame(){return pending;},
  get stats(){return{mode,captures,failures,triangles,draws,complete,width,height,pixels:width*height,allocatedGPUBytes:width*height*6,pending,sourceInstalled:!!source,failedMessage,role:'actual-resident-building-planar-reflection',measurement:'RGBA8+DEPTH16 logical texture storage; excludes driver/object overhead',noNewContext:true,noNewTimer:true};},
  resetGPU(){if(destroyed)return;release();gl=undefined;maxTextureSize=undefined;lastCapture=-Infinity;failedKey='';mode=source?'awaiting-capture':'awaiting-resident-source';},
  destroy(){if(destroyed)return;destroyed=true;release();source=undefined;gl=undefined;maxTextureSize=undefined;mode='destroyed';}
 };
}
