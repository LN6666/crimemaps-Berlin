import type {SceneQuality} from './scene-environment-quality';
import type {SolarShadowPreparationBudget,SolarShadowPreparationResult} from './solar-shadow-preparation';
import {createSolarShadowPreparationBudget,solarShadowPreparationHeldWait as heldBudgetWait} from './solar-shadow-preparation';
import {createCaptureResourceDemand,type CaptureDemandChange} from './capture-resource-demand';
import {getChunkResourceStoreForContext} from './render-runtime/chunk-resource-store';
import type {ChunkResourceLease} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';
export type {CaptureDemandChange} from './capture-resource-demand';
/** Only actual resident surface draws are permitted. Providers reuse their VAOs,
 * paint/material programs and current visibility, without advancing growth,
 * repacking/uploading geometry or invoking shadow/pick/outline passes. Clip the
 * ORIGINAL world Mercator z below clipPlaneWorldZ, before its camera reflection.
 * Providers preserve touched texture/sampler bindings and do not bind another FBO
 * or change the viewport. Each enforces both budgets BEFORE submitting a draw. */
export type PlanarReflectionPass={purpose?:'solar-depth';gl:WebGL2RenderingContext;mainMatrix:Float64Array;clipPlaneWorldZ:number;maxTriangles:number;maxDraws:number};
export type PlanarReflectionResult={triangles:number;draws:number;complete:boolean;reason?:string;pending?:boolean};
export type PlanarReflectionPreparationResult=SolarShadowPreparationResult&{plannedTriangles:number;plannedDraws:number};
export type PlanarReflectionProjection={mainMatrix:ArrayLike<number>;sourceMainMatrix:ArrayLike<number>;width:number;height:number;planeWorldZ?:number};
export type SolarShadowCoverage={bounds:readonly [number,number,number,number,number,number];triangles:number;draws:number;complete:boolean;reason?:string};
/** Issued only after a complete depth capture was published. It contains no GL
 * resources. An undefined receipt revokes the previous publication. */
export type SolarShadowPublication=Readonly<{sourceRevision:string;bounds:SolarShadowCoverage['bounds'];direction:readonly [number,number,number];targetSize:number;complete:true}>;
export type PlanarReflectionSource={
 setSolarShadowPublication?(publication:SolarShadowPublication|undefined):void;
 setPlanarReflectionState?(state:{enabled:boolean;planeWorldZ:number}|undefined):void;
 setPlanarReflectionProjection?(projection:PlanarReflectionProjection|undefined):void;
 setCaptureDemand?(change:CaptureDemandChange):void;
 preparePlanarReflection?(pass:PlanarReflectionPass,budget:SolarShadowPreparationBudget):PlanarReflectionPreparationResult;
 getPlanarReflectionCost?():{triangles:number;draws:number}|undefined;
 prepareSolarShadow?(budget:SolarShadowPreparationBudget):SolarShadowPreparationResult;
 getSolarShadowCoverage?():SolarShadowCoverage|undefined;
 getSolarShadowRevision?():string;
 getPlanarReflectionRevision():string;
 renderPlanarReflection(pass:PlanarReflectionPass):PlanarReflectionResult;
};
/** Whole components one provider skipped because the fixed per-pass capture
 * budget (planarReflectionBudget: balanced 48 draws / 40000 triangles, mobile
 * 24 / 30000) could not hold them. Selection runs before any draw and is fixed
 * for a fixed view and source, so a partial with pending=false is the designed
 * steady state, not a transient failure: nothing retries or fills it later.
 * `source` uses the same labels as `reason`. Diagnostic only. A planar
 * reflection group reports them on its result as budgetOmissions. */
export type ReflectionBudgetOmission={source:string;components:number;triangles:number;draws:number};
/** budgetOmissions: a bounded copy of the capture result's rows (diagnostic only). */
export type PlanarReflectionSnapshot={texture:WebGLTexture;mainMatrix:Float64Array;width:number;height:number;sourceRevision:string;complete:boolean;reason?:string;pending?:boolean;budgetOmissions?:readonly ReflectionBudgetOmission[]};
const MAX_BUDGET_OMISSION_ROWS=16;
const BUDGET_OMISSIONS_MEANING='capture-budget partial with pending=false is the designed steady state under the fixed per-pass limit; diagnostic only';
const omissionCount=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>=0;
/** At most 16 valid rows of the result's budgetOmissions (a group's result is
 * already bounded); never part of the capture decision. */
function copyBudgetOmissions(result:PlanarReflectionResult):ReflectionBudgetOmission[]{
 const rows=(result as PlanarReflectionResult&{budgetOmissions?:unknown}).budgetOmissions;
 if(!Array.isArray(rows))return[];
 const copy:ReflectionBudgetOmission[]=[];
 for(const row of rows.slice(0,MAX_BUDGET_OMISSION_ROWS))if(row&&typeof row.source==='string'&&omissionCount(row.components)&&row.components>0&&omissionCount(row.triangles)&&omissionCount(row.draws))copy.push({source:row.source.slice(0,1024),components:row.components,triangles:row.triangles,draws:row.draws});
 return copy;
}
export function mirrorMercatorProjection(matrix:ArrayLike<number>,planeWorldZ:number,out=new Float64Array(16)){
 if(matrix.length!==16||!Number.isFinite(planeWorldZ)||Math.abs(planeWorldZ)>1||!Array.from(matrix).every(Number.isFinite))throw Error('Invalid planar reflection projection');
 for(let i=0;i<16;i++)out[i]=matrix[i];
 for(let row=0;row<4;row++){out[8+row]=-matrix[8+row];out[12+row]=matrix[12+row]+2*planeWorldZ*matrix[8+row];}
 return out;
}
export function planarReflectionBudget(quality:SceneQuality,mobile=false){
 const pixels=mobile?16384:32768;
 return{pixels,maxDimension:mobile?256:512,maxTriangles:mobile?30000:15000,maxDraws:24,fps:2};
}
export function planarReflectionSize(width:number,height:number,pixels:number,maxDimension:number){
 if(![width,height,pixels,maxDimension].every(Number.isFinite)||width<=0||height<=0||pixels<1||maxDimension<1)throw Error('Invalid planar reflection size');
 const scale=Math.min(1,maxDimension/width,maxDimension/height,Math.sqrt(pixels/(width*height)));
 return[Math.max(1,Math.floor(width*scale)),Math.max(1,Math.floor(height*scale))]as const;
}
const sameMatrix=(a:ArrayLike<number>,b:ArrayLike<number>)=>{if(a.length!==16||b.length!==16)return false;for(let i=0;i<16;i++)if(a[i]!==b[i])return false;return true;};
type ReflectionTarget={texture:WebGLTexture;depth:WebGLRenderbuffer;fbo:WebGLFramebuffer;width:number;height:number};
// heldBudgetWait (solarShadowPreparationHeldWait): every pending demand is a
// held page-ledger wait; otherwise the caller's frame clock still retries.
let nextReflectionOwner=0;
/** One bounded FBO in the existing context. Static camera/source/material state
 * reuses its capture. Water normal animation alone never dirties this cache.
 * Throttled refreshes use the owner's shared frame clock, never a new timer. */
export function createPlanarBuildingReflection({mobile=false,now=()=>performance.now(),requestRepaint}:{mobile?:boolean;now?:()=>number;requestRepaint?:()=>void}={}){
 const demand=createCaptureResourceDemand('reflection');
 let source:PlanarReflectionSource|undefined,gl:WebGL2RenderingContext|undefined,texture:WebGLTexture|undefined,depth:WebGLRenderbuffer|undefined,fbo:WebGLFramebuffer|undefined;
 let width=0,height=0,mode='awaiting-resident-source',destroyed=false,pending=false,captures=0,failures=0,lastCapture=-Infinity,nextFrame=-Infinity,triangles=0,draws=0,complete=false,lastKey='',failedKey='',failedMessage='';
 let maxTextureSize:number|undefined;
 const resourceOwner=++nextReflectionOwner;
 let target:ChunkResourceLease<ReflectionTarget>|undefined,stopAvailable:(()=>void)|undefined,budgetKey='';
 let preparationWoken=false,preparationBudgetWaits=0,targetBudgetWaits=0;
 const mirror=new Float64Array(16),capturedMatrix=new Float64Array(16),failedMatrix=new Float64Array(16);let snapshot:PlanarReflectionSnapshot|undefined;
 const stopWaiting=()=>{stopAvailable?.();stopAvailable=undefined;budgetKey='';};
 // A dropped snapshot takes its capture's diagnostics (triangles, draws,
 // complete, reason, omission rows) with it, so stats never describe a capture
 // that is no longer displayed.
 const dropSnapshot=()=>{snapshot=undefined;lastKey='';triangles=draws=0;complete=false;};
 // Returns the target alone; its snapshot goes with it. (Outside capture: its
 // try block declares its own 'target' binding.)
 const releaseTarget=()=>{const old=target;target=undefined;texture=depth=fbo=undefined;width=height=0;dropSnapshot();old?.release();};
 const release=()=>{stopWaiting();pending=false;preparationWoken=false;releaseTarget();};
 // Returns only a target whose snapshot is not displayed for this revision;
 // demand, pending state, mode and wait counters stay. While its programs wait on
 // held ledger wakes, a capture never keeps an undisplayed target (one part of
 // a capture held while waiting for another). The waiting program owner's
 // retirement follow-up frames collect its fence.
 const releaseUndisplayedTarget=(revision:string)=>{if(target&&snapshot?.sourceRevision!==revision)releaseTarget();};
 /** resource-budget-pending: the ledger's onAvailable wake repaints once and
  * the next render retries. A retired target (this capture's previous size, or
  * anyone's) stays charged until a frame boundary collects its fence, so while
  * it waits this capture also takes the page store's bounded retirement
  * follow-up frames; a still map reaches that boundary whether or not the
  * compositor registered. Every end of the wait (wake, another key, invalid
  * input, release, loss, destroy) revokes both through one signal. No timer. */
 function waitForCapacity(g:WebGL2RenderingContext,key:string){
  const store=getChunkResourceStoreForContext(g),wait=new AbortController();
  budgetKey=key;stopAvailable=()=>wait.abort();targetBudgetWaits++;
  store.budget.onAvailable(()=>{stopWaiting();if(!destroyed){nextFrame=-Infinity;requestRepaint?.();}},wait.signal);
  store.onRetirementPending?.(()=>{if(!destroyed)requestRepaint?.();},wait.signal);
 }
 const lostCapture=Symbol('lost planar reflection context');
 function requireLive(g:WebGL2RenderingContext){if(g.isContextLost())throw lostCapture;}
 function abandonLost(){source?.setPlanarReflectionProjection?.(undefined);demand.clear();release();gl=undefined;maxTextureSize=undefined;lastCapture=nextFrame=-Infinity;failedKey='';failedMessage='';mode='context-lost';}
 function save(g:WebGL2RenderingContext){
  // A partial snapshot can contain null enum/array values after loss. Never restore it.
  const get=(parameter:number)=>{const value=g.getParameter(parameter);requireLive(g);return value;};
  const active=get(g.ACTIVE_TEXTURE);g.activeTexture(g.TEXTURE0);requireLive(g);const texture0=get(g.TEXTURE_BINDING_2D);g.activeTexture(active);requireLive(g);return{
  read:get(g.READ_FRAMEBUFFER_BINDING),draw:get(g.DRAW_FRAMEBUFFER_BINDING),renderbuffer:get(g.RENDERBUFFER_BINDING),program:get(g.CURRENT_PROGRAM),vao:get(g.VERTEX_ARRAY_BINDING),array:get(g.ARRAY_BUFFER_BINDING),viewport:get(g.VIEWPORT),scissor:get(g.SCISSOR_BOX),clearColor:get(g.COLOR_CLEAR_VALUE),clearDepth:get(g.DEPTH_CLEAR_VALUE),colorMask:get(g.COLOR_WRITEMASK),depthMask:get(g.DEPTH_WRITEMASK),depthFunc:get(g.DEPTH_FUNC),depthRange:get(g.DEPTH_RANGE),src:get(g.BLEND_SRC_RGB),dst:get(g.BLEND_DST_RGB),srcA:get(g.BLEND_SRC_ALPHA),dstA:get(g.BLEND_DST_ALPHA),eq:get(g.BLEND_EQUATION_RGB),eqA:get(g.BLEND_EQUATION_ALPHA),cullFace:get(g.CULL_FACE_MODE),frontFace:get(g.FRONT_FACE),active,texture0,
  caps:[g.DEPTH_TEST,g.BLEND,g.CULL_FACE,g.SCISSOR_TEST,g.STENCIL_TEST,g.POLYGON_OFFSET_FILL].map(cap=>{const enabled=g.isEnabled(cap);requireLive(g);return[cap,enabled]as const;})};}
 function restore(g:WebGL2RenderingContext,s:ReturnType<typeof save>){g.bindFramebuffer(g.READ_FRAMEBUFFER,s.read);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,s.draw);g.bindRenderbuffer(g.RENDERBUFFER,s.renderbuffer);g.useProgram(s.program);g.bindVertexArray(s.vao);g.bindBuffer(g.ARRAY_BUFFER,s.array);g.viewport(s.viewport[0],s.viewport[1],s.viewport[2],s.viewport[3]);g.scissor(s.scissor[0],s.scissor[1],s.scissor[2],s.scissor[3]);g.clearColor(s.clearColor[0],s.clearColor[1],s.clearColor[2],s.clearColor[3]);g.clearDepth(s.clearDepth);g.colorMask(s.colorMask[0],s.colorMask[1],s.colorMask[2],s.colorMask[3]);g.depthMask(s.depthMask);g.depthFunc(s.depthFunc);g.depthRange(s.depthRange[0],s.depthRange[1]);g.blendFuncSeparate(s.src,s.dst,s.srcA,s.dstA);g.blendEquationSeparate(s.eq,s.eqA);g.cullFace(s.cullFace);g.frontFace(s.frontFace);for(const[cap,on]of s.caps)on?g.enable(cap):g.disable(cap);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,s.texture0);g.activeTexture(s.active);}
 function allocate(g:WebGL2RenderingContext,w:number,h:number){
  if(target?.value&&width===w&&height===h)return;
  requireLive(g);const store=getChunkResourceStoreForContext(g);
  const next=store.acquireGpu<ReflectionTarget>({contentKey:`reflection-target:${resourceOwner}:${w}:${h}`,context:g,epoch:store.contextEpoch(g),role:'reflection',
   estimate:{category:'texture',bytes:w*h*6,precision:'exact',label:'RGBA8 + DEPTH16 reflection target'},
   create(){
    let texture:WebGLTexture|undefined,depth:WebGLRenderbuffer|undefined,fbo:WebGLFramebuffer|undefined;
    try{
     texture=g.createTexture()??undefined;requireLive(g);depth=g.createRenderbuffer()??undefined;requireLive(g);fbo=g.createFramebuffer()??undefined;requireLive(g);
     if(!texture||!depth||!fbo)throw Error('Planar reflection allocation failed');
     g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);
     requireLive(g);g.bindRenderbuffer(g.RENDERBUFFER,depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,w,h);requireLive(g);g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,depth);
     const status=g.checkFramebufferStatus(g.FRAMEBUFFER);requireLive(g);if(status!==g.FRAMEBUFFER_COMPLETE)throw Error('Planar reflection framebuffer incomplete');return{texture,depth,fbo,width:w,height:h};
    }catch(error){if(!g.isContextLost()){if(texture)g.deleteTexture(texture);if(depth)g.deleteRenderbuffer(depth);if(fbo)g.deleteFramebuffer(fbo);}throw error;}
   },dispose(value){g.deleteTexture(value.texture);g.deleteRenderbuffer(value.depth);g.deleteFramebuffer(value.fbo);},
  });
  const previous=target;target=next;({texture,depth,fbo,width,height}=next.value!);previous?.release();snapshot=undefined;lastKey='';
 }
 return{
  setSource(value:PlanarReflectionSource|undefined){if(destroyed)return;if(value&&(typeof value.getPlanarReflectionRevision!=='function'||typeof value.renderPlanarReflection!=='function'))throw Error('Invalid resident reflection source');if(source===value)return;source?.setPlanarReflectionState?.(undefined);source?.setPlanarReflectionProjection?.(undefined);demand.clear();source=value;release();failedKey='';lastCapture=-Infinity;mode=value?'awaiting-capture':'awaiting-resident-source';},
  capture(context:WebGL2RenderingContext,args:{mainMatrix:ArrayLike<number>;viewportWidth:number;viewportHeight:number;planeWorldZ:number;quality:SceneQuality;appearanceKey:string;enabled?:boolean}){
   if(!destroyed)source?.setPlanarReflectionState?.({enabled:args.enabled!==false,planeWorldZ:args.planeWorldZ});
   if(destroyed||args.enabled===false||!source){source?.setPlanarReflectionProjection?.(undefined);demand.clear();release();nextFrame=-Infinity;return undefined;}
   if(context.isContextLost()){abandonLost();return undefined;}
   if(gl!==context){source.setPlanarReflectionProjection?.(undefined);demand.clear();release();gl=context;maxTextureSize=undefined;lastCapture=-Infinity;failedKey='';}
   const g=context,budget=planarReflectionBudget(args.quality,mobile);let revision:string,w:number,h:number,key:string;
   try{revision=source.getPlanarReflectionRevision();requireLive(g);if(typeof revision!=='string'||!revision||revision.length>4096)throw Error('Invalid resident reflection revision');mirrorMercatorProjection(args.mainMatrix,args.planeWorldZ,mirror);if(maxTextureSize===undefined){const limit:unknown=g.getParameter(g.MAX_TEXTURE_SIZE);requireLive(g);if(typeof limit!=='number'||!Number.isInteger(limit)||limit<=0)throw Error('Invalid reflection texture limit');maxTextureSize=limit;}[w,h]=planarReflectionSize(args.viewportWidth,args.viewportHeight,budget.pixels,Math.min(budget.maxDimension,maxTextureSize));key=revision+'|'+args.planeWorldZ+'|'+w+','+h+'|economy|'+args.appearanceKey;}catch(error){if(g.isContextLost()){abandonLost();return undefined;}stopWaiting();source.setPlanarReflectionProjection?.(undefined);demand.clear();mode='invalid-capture-input';failedMessage=String(error);pending=false;return undefined;}
   source.setPlanarReflectionProjection?.({mainMatrix:mirror,sourceMainMatrix:args.mainMatrix,width:w,height:h,planeWorldZ:args.planeWorldZ});
   if(stopAvailable){if(budgetKey===key){pending=true;return snapshot?.sourceRevision===revision?snapshot:undefined;}stopWaiting();}
   if(snapshot&&!snapshot.pending&&key===lastKey&&sameMatrix(capturedMatrix,args.mainMatrix)){demand.clear();pending=false;mode=complete?'captured':'captured-partial';return snapshot;}
   if(key===failedKey&&sameMatrix(failedMatrix,args.mainMatrix)){demand.clear();pending=false;return undefined;}
   if(width*height>budget.pixels)release();
   const time=now(),deadline=lastCapture+1000/budget.fps;
   pending=false;preparationWoken=false;let state:ReturnType<typeof save>|undefined,captured=false,keepDemand=false,returnTarget=false,cleared=false;
   try{
    const pass:PlanarReflectionPass={gl:g,mainMatrix:mirror,clipPlaneWorldZ:args.planeWorldZ,maxTriangles:budget.maxTriangles,maxDraws:budget.maxDraws};
    demand.activate(source,key+'|'+Array.from(args.mainMatrix).join(','));
    // Keep demand alive across the refresh interval. Camera changes acquire
    // the new requirements before retiring the previous token.
    if(time<deadline){keepDemand=true;pending=true;nextFrame=deadline;mode='awaiting-budgeted-refresh';return snapshot?.sourceRevision===revision?snapshot:undefined;}
    const preparation=source.preparePlanarReflection?.(pass,createSolarShadowPreparationBudget());requireLive(g);
    // Held ledger waits only: each owner's onAvailable wake repaints and the next
    // render retries here, so neither needsFrame nor the shared clock polls.
    // A displayed snapshot (same source revision) keeps its target.
    if(preparation?.status==='pending'){keepDemand=true;pending=true;preparationWoken=heldBudgetWait(preparation);if(preparationWoken){preparationBudgetWaits++;releaseUndisplayedTarget(revision);}nextFrame=preparationWoken?Infinity:time;mode='preparing';return snapshot?.sourceRevision===revision?snapshot:undefined;}
    if(preparation?.status==='failed')throw Error('Resident reflection preparation failed');
    // Waiting for programs consumes no capture interval or framebuffer work.
    state=save(g);
    allocate(g,w,h);lastCapture=time;g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,null);g.bindFramebuffer(g.FRAMEBUFFER,fbo!);g.viewport(0,0,w,h);g.disable(g.SCISSOR_TEST);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.disable(g.STENCIL_TEST);g.disable(g.POLYGON_OFFSET_FILL);g.blendEquationSeparate(g.FUNC_ADD,g.FUNC_ADD);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthRange(0,1);g.depthMask(true);g.colorMask(true,true,true,true);g.clearColor(0,0,0,0);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
    cleared=true;requireLive(g);const result=source.renderPlanarReflection(pass);requireLive(g);
    const target=g.getParameter(g.DRAW_FRAMEBUFFER_BINDING);requireLive(g);if(target!==fbo)throw Error('Resident reflection provider changed its target framebuffer');
    if(!result||!Number.isSafeInteger(result.triangles)||result.triangles<0||result.triangles>budget.maxTriangles||!Number.isSafeInteger(result.draws)||result.draws<0||result.draws>budget.maxDraws||typeof result.complete!=='boolean')throw Error('Resident reflection provider exceeded or omitted its declared draw budget');
    triangles=result.triangles;draws=result.draws;complete=result.complete;keepDemand=!complete&&result.pending===true;pending=keepDemand;nextFrame=keepDemand?time+1000/budget.fps:-Infinity;
    const omissions=copyBudgetOmissions(result);
    capturedMatrix.set(Array.from(args.mainMatrix));snapshot={texture:texture!,mainMatrix:capturedMatrix,width:w,height:h,sourceRevision:revision,complete,...(!complete?{reason:result.reason?.slice(0,1024)??'capture-incomplete'}:{}),...(keepDemand?{pending:true}:{}),...(omissions.length?{budgetOmissions:omissions}:{})};lastKey=key;failedKey='';failedMessage='';captured=true;
   }catch(error){if(g.isContextLost())abandonLost();else if(error instanceof ResourceBudgetExceededError){
    mode='resource-budget-pending';failedMessage=error.message;keepDemand=pending=true;nextFrame=Infinity;
    // The previous size's target is returned (once the caller's GL state is
    // restored; this wait's frames collect its fence) when its snapshot is not
    // displayed for this revision (R1), or when its bytes alone cover the
    // refused shortfall: holding it would block the capacity its replacement
    // needs. Otherwise its displayed snapshot is in use, not held for the wait,
    // and stays shown; every later refusal decides again. A same-size target
    // stays for the retry: returning it would wake this capture with its own
    // bytes, which the retry takes again before the provider is reached.
    const oldBytes=target&&(width!==w||height!==h)?width*height*6:0;
    returnTarget=oldBytes>0&&(snapshot?.sourceRevision!==revision||(oldBytes>=error.shortfallBytes&&error.recentShortfallBytes===0));
    // This attempt already cleared the target: its previous image is gone.
    if(cleared)dropSnapshot();
    waitForCapacity(g,key);
   }else{failures++;failedKey=key;failedMatrix.set(Array.from(args.mainMatrix));failedMessage=String(error);release();mode='capture-failed';}}finally{try{if(!g.isContextLost()&&state)restore(g,state);}finally{if(g.isContextLost())abandonLost();else if(returnTarget)releaseTarget();if(!keepDemand)demand.clear();}}
   if(captured&&snapshot){captures++;mode=complete?'captured':'captured-partial';return snapshot;}
   return undefined;
  },
  frame(time=now()){return pending&&time>=nextFrame;},
  get needsFrame(){return pending&&!stopAvailable&&!preparationWoken;},
  getProofSettlementKey(){return [mode,complete,pending,preparationWoken,!!stopAvailable,!!source,failedMessage,snapshot?.sourceRevision,snapshot?.reason] as const;},
  get stats(){return{mode,captures,failures,triangles,draws,complete,reason:snapshot?.reason,budgetOmissions:snapshot?.budgetOmissions?.map(row=>({...row}))??[],budgetOmissionsMeaning:BUDGET_OMISSIONS_MEANING,width,height,pixels:width*height,allocatedGPUBytes:width*height*6,pending,preparationBudgetWaits,waitingForPreparationBudget:pending&&preparationWoken,targetBudgetWaits,waitingForTargetBudget:!!stopAvailable,sourceInstalled:!!source,failedMessage,role:'actual-resident-building-planar-reflection',measurement:'RGBA8+DEPTH16 logical texture storage; excludes driver/object overhead',noNewContext:true,noNewTimer:true};},
  resetGPU(){if(destroyed)return;source?.setPlanarReflectionProjection?.(undefined);demand.clear();release();gl=undefined;maxTextureSize=undefined;lastCapture=-Infinity;failedKey='';mode=source?'awaiting-capture':'awaiting-resident-source';},
  destroy(){if(destroyed)return;destroyed=true;source?.setPlanarReflectionState?.(undefined);source?.setPlanarReflectionProjection?.(undefined);demand.clear();release();source=undefined;gl=undefined;maxTextureSize=undefined;mode='destroyed';}
 };
}
