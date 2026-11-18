import {drawResidentTriangles} from './resident-index-convention';
import {planResidentReflectionChunks,residentSolarShadowChunkCoverage,residentReflectionClipPlane,type ResidentReflectionComponent,type ResidentReflectionRun,type ResidentReflectionChunk,type ResidentPlanarReflectionPass,type ResidentPlanarReflectionResult} from '../resident-planar-reflection';
import type {SolarShadowCoverage} from '../planar-building-reflection';
import {withSceneSolarShadowReceiver} from '../scene-solar-shadow';
import type {ChunkResourceLease} from './chunk-resource-types';

export type ResidentCaptureRole='solar'|'reflection';
export type ResidentCaptureRetention={
 readonly version?:number|string;readonly leases?:readonly ChunkResourceLease<unknown>[];
 /** A mixed binding (program grants/masks plus chunk leases) clones its own
  * frozen holds, rather than looking up a later main publication. */
 retain?(role:ResidentCaptureRole):ResidentCaptureRetention;
 release():void;
};
export type ResidentCaptureOwnership={
 publicationVersion?:number|string;
 /** Retain this exact snapshot version, not the scene's subsequently published version. */
 retain?(role:ResidentCaptureRole):ResidentCaptureRetention;
 leases?:readonly ChunkResourceLease<unknown>[];
 /** Optional ownership transferred by an adapter's scene.capture(role). */
 release?():void;
};

/** One snapshot owns its source scope, geometry, programs and masks together.
 * Register each acquisition before starting the next one; a partial snapshot
 * rolls back, and retained executions keep this exact publication alive. */
export function createResidentCaptureOwnership<T extends {version:number|string;release():void}>(acquireGeometry:()=>T,scope?:{retain():()=>void}){
 const releases:(()=>void)[]=[];let geometry:T;
 try{
  const releaseScope=scope?.retain();if(releaseScope)releases.push(releaseScope);
  geometry=acquireGeometry();releases.push(()=>geometry.release());
 }catch(error){try{releaseAll(releases);}finally{throw error;}}
 let references=1,baseReleased=false;
 const drop=()=>{if(--references)return;const cleanup=releases.splice(0);releaseAll(cleanup);};
 const retain=():ResidentCaptureRetention=>{
  if(!references)throw Error('Capture snapshot retired');references++;let released=false;
  return{version:geometry.version,retain,release(){if(released)return;released=true;drop();}};
 };
 return{
  geometry,retain,
  addRelease(release:()=>void){releases.push(release);},
  release(){if(baseReleased)return;baseReleased=true;drop();},
 };
}
type SourceRow={program:WebGLProgram;firstIndex:number;indexCount:number};
export type ResidentCaptureMasks={prepare(gl:WebGL2RenderingContext,programs:readonly WebGLProgram[]):{ready:boolean;reason?:string};isResident(gl:WebGL2RenderingContext,program:WebGLProgram):boolean;withResidentMasks(gl:WebGL2RenderingContext,program:WebGLProgram,draw:()=>void):boolean;readonly residentRevision:string};
/** Every range is local to this VAO. Components carry original publication
 * order when a scene's accepted rows are interleaved between chunks. */
export type ResidentCaptureChunk={
 contentKey?:string;vao:WebGLVertexArrayObject;
 components:readonly ResidentReflectionComponent[];runs:readonly ResidentReflectionRun<WebGLProgram>[];indexCount:number;
 anchor:readonly number[];unit:number;opacity:number;cull:boolean;skipMasks:boolean;masks:ResidentCaptureMasks;
 planFailureReason?:string;bindingRevision():string;bindingsReady():boolean;
 extra?:{component:ResidentReflectionComponent;rows:readonly SourceRow[]};
 matrix(main:Float64Array):Float64Array;
 uniforms(program:WebGLProgram,matrix:Float64Array,plane:Float32Array|undefined,viewport:Int32Array):void;
 resetClip(program:WebGLProgram):void;
 bind(program:WebGLProgram,draw:()=>void,unavailable:()=>void):void;
 leases?:readonly ChunkResourceLease<unknown>[];
 retain?(role:ResidentCaptureRole):ResidentCaptureRetention;
};
/** Legacy single-block callers are normalized into exactly one chunk. */
export type ResidentCaptureSnapshot={status:'active';gl:WebGL2RenderingContext;publicationVersion:number|string}&ResidentCaptureChunk&ResidentCaptureOwnership;
export type ResidentCaptureChunkSnapshot={status:'active';gl:WebGL2RenderingContext;publicationVersion:number|string;chunks:readonly ResidentCaptureChunk[]}&ResidentCaptureOwnership;
export type ResidentCaptureRow=SourceRow&{chunk:ResidentCaptureChunk;matrix?:Float64Array;order?:number};
type Snapshot=ResidentCaptureSnapshot|ResidentCaptureChunkSnapshot|{status:'inactive'}|{status:'blocked';reason:string;pending?:boolean};
export type ResidentCaptureAdapter={revision():string;/** Include scene publicationVersion in revision, or supply this lightweight getter. */publicationVersion?():number|string;snapshot(solar:boolean):Snapshot};
type NormalizedSnapshot=ResidentCaptureOwnership&{gl:WebGL2RenderingContext;chunks:readonly ResidentCaptureChunk[];chunkOwnership:boolean};
type ResourceHold={leases:readonly ChunkResourceLease<unknown>[];direct:readonly ChunkResourceLease<unknown>[];repeat:readonly((role:ResidentCaptureRole)=>ResidentCaptureRetention)[];live():boolean;release():void};
type OwnedSnapshot={snapshot:NormalizedSnapshot;hold:ResourceHold;release():void};
type Plan={owner:OwnedSnapshot;snapshot:NormalizedSnapshot;rows:readonly ResidentCaptureRow[];extra:readonly ResidentCaptureRow[];triangles:number;draws:number;complete:boolean;reason?:string;pending?:boolean};
type SolarPlan={revision:string;snapshot:Snapshot;plan?:Plan;owner?:OwnedSnapshot;coverage?:SolarShadowCoverage;ready:boolean;geometryComplete?:boolean;preparationFailure?:string;bindingRevision?:string;reason?:string};
const zero=(reason?:string,pending=false):ResidentPlanarReflectionResult=>({triangles:0,draws:0,complete:!reason,...(reason?{reason:reason.slice(0,512)}:{}),...(pending?{pending:true}:{})});

function releaseAll(releases:readonly(()=>void)[]){let error:unknown;for(let i=releases.length-1;i>=0;i--)try{releases[i]();}catch(value){error??=value;}if(error!==undefined)throw error;}
function normalize(snapshot:ResidentCaptureSnapshot|ResidentCaptureChunkSnapshot):NormalizedSnapshot{
 return{gl:snapshot.gl,chunks:'chunks'in snapshot?[...snapshot.chunks]:[snapshot],chunkOwnership:'chunks'in snapshot,publicationVersion:snapshot.publicationVersion,retain:snapshot.retain?role=>snapshot.retain!(role):undefined,leases:snapshot.leases,release:snapshot.release?()=>snapshot.release!():undefined};
}
function holdResources(initial:NormalizedSnapshot,role:ResidentCaptureRole,parent?:ResourceHold):ResourceHold{
 const leases:ChunkResourceLease<unknown>[]=[],direct:ChunkResourceLease<unknown>[]=[],repeat:((role:ResidentCaptureRole)=>ResidentCaptureRetention)[]=[],releases:(()=>void)[]=[],seen=new Set<ChunkResourceLease<unknown>>();
 let snapshot:NormalizedSnapshot|undefined=initial,context:WebGL2RenderingContext|undefined=initial.gl;
 const publicationVersion=initial.publicationVersion;
 const source=()=>{if(!snapshot)throw Error('Capture hold released');return snapshot;};
 const retainLease=(lease:ChunkResourceLease<unknown>)=>{if(seen.has(lease))return;seen.add(lease);const retained=lease.retain(role);leases.push(retained);direct.push(retained);releases.push(()=>retained.release());};
 const retain=(read:(role:ResidentCaptureRole)=>ResidentCaptureRetention)=>{
  const value=read(role);releases.push(()=>value.release());
  if(value.version!==undefined&&publicationVersion!==undefined&&value.version!==publicationVersion)throw Error('Capture publication version changed');
  if(value.leases?.length){leases.push(...value.leases);if(!value.retain)direct.push(...value.leases);}
  if(value.retain)repeat.push(nextRole=>value.retain!(nextRole));else if(!value.leases?.length)repeat.push(read);
 };
 try{
  if(parent){for(const lease of parent.direct)retainLease(lease);for(const read of parent.repeat)retain(read);}
  else{
   if(snapshot.retain)retain(role=>source().retain!(role));
   for(const lease of snapshot.leases??[])retainLease(lease);
   if(snapshot.chunkOwnership)for(const chunk of snapshot.chunks){if(chunk.retain)retain(role=>chunk.retain!(role));for(const lease of chunk.leases??[])retainLease(lease);}
  }
 }catch(error){releaseAll(releases);throw error;}
 let released=false;
 return{get leases(){return leases;},get direct(){return direct;},get repeat(){return repeat;},live:()=>!released&&leases.every(lease=>!lease.released&&!['preparing','failed','lost','released'].includes(lease.state)&&(!lease.context||lease.context===context)),release(){if(released)return;released=true;const cleanup=releases.splice(0);leases.length=0;direct.length=0;repeat.length=0;seen.clear();context=undefined;snapshot=undefined;try{releaseAll(cleanup);}finally{cleanup.length=0;}}};
}
function ownSnapshot(value:ResidentCaptureSnapshot|ResidentCaptureChunkSnapshot,role:ResidentCaptureRole):OwnedSnapshot{
 const snapshot=normalize(value);let hold:ResourceHold|undefined;
 try{
  if(value.publicationVersion===undefined)throw Error('Capture requires a publication version');
  if(snapshot.gl.isContextLost())throw Error('Capture context lost');
  if(snapshot.chunks.length&&!value.retain&&!value.leases?.length&&!(snapshot.chunkOwnership&&snapshot.chunks.every(chunk=>chunk.retain||chunk.leases?.length)))throw Error('Capture requires publication leases');
  hold=holdResources(snapshot,role);if(!hold.live())throw Error('Capture resource unavailable');
 }catch(error){try{hold?.release();}finally{snapshot.release?.();}throw error;}
 const retained=hold!;
 let released=false;return{snapshot,hold:retained,release(){if(released)return;released=true;try{retained.release();}finally{snapshot.release?.();}}};
}
function bindingRevision(snapshot:NormalizedSnapshot){return JSON.stringify([snapshot.publicationVersion??null,...snapshot.chunks.map(chunk=>chunk.bindingRevision())]);}

/** One pass-wide selection reserves ties and missing programs before selecting
 * later components. No chunk receives a fresh copy of the pass budget. */
function plan(owner:OwnedSnapshot,matrix:Float64Array,triangles:number,draws:number,solar:boolean):Plan{
 const snapshot=owner.snapshot,reserved=snapshot.chunks.reduce((n,chunk)=>n+(chunk.extra?.rows.reduce((m,row)=>m+row.indexCount/3,0)??0),0),reservedDraws=snapshot.chunks.reduce((n,chunk)=>n+(chunk.extra?.rows.length??0),0);
 type ChunkPlan=ResidentReflectionChunk<WebGLProgram>&{capture:ResidentCaptureChunk};
 const chunks:ChunkPlan[]=snapshot.chunks.map(capture=>({capture,components:capture.components,runs:capture.runs,matrix:solar?[]:capture.matrix(matrix),indexCount:capture.indexCount,cull:!solar&&capture.cull}));
 const selected=planResidentReflectionChunks<WebGLProgram,ChunkPlan>(chunks,triangles-reserved,draws-reservedDraws);
 const rows:ResidentCaptureRow[]=[];
 for(const item of selected.plan){
  const row:ResidentCaptureRow={program:item.program,firstIndex:item.firstIndex,indexCount:item.indexCount,chunk:item.chunk.capture,...(!solar?{matrix:item.chunk.matrix as Float64Array}:{})},previous=rows.at(-1);
  // Solar selection already retained every admitted component. Consecutive
  // indices with identical chunk/program bindings can share one depth draw;
  // preserve publication order, gaps, masks and the separate tie-bias pass.
  // Reflection selection and its draw-budget policy are unchanged.
  if(solar&&previous?.chunk===row.chunk&&previous.program===row.program&&previous.firstIndex+previous.indexCount===row.firstIndex)previous.indexCount+=row.indexCount;
  else rows.push(row);
 }
 const extra:ResidentCaptureRow[]=[];
 for(const chunk of chunks)if(chunk.capture.extra&&selected.components.some(row=>row.chunk===chunk&&row.component===chunk.capture.extra!.component))for(const row of chunk.capture.extra.rows)extra.push({...row,chunk:chunk.capture,order:chunk.capture.extra.component.order,...(!solar?{matrix:chunk.matrix as Float64Array}:{})});
 extra.sort((a,b)=>a.order!==undefined&&b.order!==undefined?a.order-b.order:0);
 return{owner,snapshot,rows,extra,triangles:selected.triangles+extra.reduce((n,row)=>n+row.indexCount/3,0),draws:rows.length+extra.length,complete:selected.complete,...(!selected.complete?{reason:snapshot.chunks.find(chunk=>chunk.planFailureReason)?.planFailureReason??selected.reason??'incomplete'}:{}),...(selected.pending?{pending:true}:{})};
}
function programGroups(value:Plan){const groups=new Map<ResidentCaptureChunk,Set<WebGLProgram>>();for(const row of [...value.rows,...value.extra]){let programs=groups.get(row.chunk);if(!programs){programs=new Set();groups.set(row.chunk,programs);}programs.add(row.program);}return groups;}
function resident(value:Plan){return[...programGroups(value)].every(([chunk,programs])=>chunk.skipMasks||[...programs].every(program=>chunk.masks.isResident(value.snapshot.gl,program)));}
function bindingsReady(snapshot:NormalizedSnapshot){return snapshot.chunks.every(chunk=>chunk.bindingsReady());}

export function createResidentCaptureRuntime(adapter:ResidentCaptureAdapter){
 let solar:SolarPlan|undefined,plans=0,preparations=0,destroyed=false;
 function replaceSolar(next:SolarPlan|undefined){const previous=solar;solar=next;previous?.owner?.release();return next;}
 function solarPlan(preparing=false):SolarPlan{
  if(destroyed)return{revision:'destroyed',snapshot:{status:'inactive'},ready:true};
  const revision=adapter.revision();
  // Uploads and program links can finish without changing the scene's content
  // revision. Only the preparation pass may retry their provisional snapshot.
  if(solar?.revision===revision){
   const retry=preparing&&!solar.preparationFailure&&(
    solar.snapshot.status==='blocked'&&solar.snapshot.pending!==false||solar.plan?.pending===true
   );
   if(!retry){
    try{
     if(solar.snapshot.status!=='active')return solar;
     const snapshot=solar.plan?.snapshot;
     if(snapshot&&solar.owner?.hold.live()&&!snapshot.gl.isContextLost()&&
        solar.bindingRevision===bindingRevision(snapshot)&&
        (adapter.publicationVersion===undefined||adapter.publicationVersion()===snapshot.publicationVersion))return solar;
    }catch{/* Acquire a new snapshot before retiring this one. */}
   }
  }
  let owner:OwnedSnapshot|undefined,next:SolarPlan;
  try{
   const snapshot=adapter.snapshot(true);plans++;
   if(snapshot.status==='inactive')next={revision,snapshot,ready:true};
   else if(snapshot.status==='blocked')next={revision,snapshot,ready:false,reason:snapshot.reason,coverage:{bounds:[0,0,0,0,0,0],triangles:0,draws:0,complete:false,reason:snapshot.reason}};
   else{
    owner=ownSnapshot(snapshot,'solar');const selected=plan(owner,new Float64Array(),Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,true),masksReady=resident(selected),texturesReady=bindingsReady(owner.snapshot),ready=selected.complete&&masksReady&&texturesReady,reason=!selected.complete?'plan:'+selected.reason:!masksReady?'mask-unavailable':!texturesReady?'texture-unavailable':undefined;
    const geometry=residentSolarShadowChunkCoverage(owner.snapshot.chunks,selected.triangles,selected.draws,selected.complete,selected.reason),coverage={...geometry,complete:geometry.complete&&ready,...(geometry.reason||reason?{reason:geometry.reason??reason}:{})};
    next={revision,snapshot,owner,plan:selected,geometryComplete:geometry.complete,bindingRevision:bindingRevision(owner.snapshot),ready:coverage.complete,coverage,reason:coverage.reason};
   }
  }catch(error){owner?.release();const reason='snapshot-exception:'+String(error).slice(0,256);next={revision,snapshot:{status:'blocked',reason},ready:false,preparationFailure:reason,reason,coverage:{bounds:[0,0,0,0,0,0],triangles:0,draws:0,complete:false,reason}};}
  replaceSolar(next);return next;
 }
 return{
  prepareSolar():{status:'ready'|'pending'|'failed';reason?:string}{
   const value=solarPlan(true);preparations++;
   if(value.snapshot.status==='inactive')return{status:'ready'};
   if(value.preparationFailure)return{status:'failed',reason:value.preparationFailure};
   if(value.snapshot.status==='blocked')return{status:value.snapshot.pending===false?'failed':'pending',reason:value.reason};
   if(!value.plan?.complete)return{status:value.plan?.pending?'pending':'failed',reason:value.reason};
   if(!value.geometryComplete)return{status:'failed',reason:value.reason??'invalid-geometry'};
   const snapshot=value.plan.snapshot;let execution:ResourceHold|undefined;
   try{
    execution=holdResources(snapshot,'solar',value.plan.owner.hold);if(!execution.live())throw Error('Capture resource unavailable');
    let result:{ready:boolean;reason?:string}={ready:true};
    for(const [chunk,programs]of programGroups(value.plan))if(!chunk.skipMasks){const prepared=chunk.masks.prepare(snapshot.gl,[...programs]);if(!prepared.ready)result={ready:false,reason:result.reason??prepared.reason};}
    if(solar!==value)return{status:'pending',reason:'publication-changed'};
    value.revision=adapter.revision();value.bindingRevision=bindingRevision(snapshot);const masksReady=result.ready&&resident(value.plan),texturesReady=bindingsReady(snapshot);value.ready=value.geometryComplete===true&&masksReady&&texturesReady;value.reason=value.ready?undefined:!masksReady?result.reason??'mask-unavailable':'texture-unavailable';
    if(!masksReady)value.preparationFailure=value.reason;
    value.coverage={...value.coverage!,complete:value.ready,...(value.reason?{reason:value.reason}:{reason:undefined})};
    if(!masksReady)replaceSolar({revision:value.revision,snapshot:{status:'blocked',reason:value.reason??'mask-unavailable'},ready:false,preparationFailure:value.reason,reason:value.reason,coverage:value.coverage});
    return value.ready?{status:'ready'}:{status:masksReady?'pending':'failed',reason:value.reason};
   }catch(error){const reason='mask-prepare-exception:'+String(error).slice(0,256);value.ready=false;value.preparationFailure=reason;value.reason=reason;if(value.coverage)value.coverage={...value.coverage,complete:false,reason};if(solar===value)replaceSolar(undefined);return{status:'failed',reason};}
   finally{execution?.release();}
  },
  coverage(){const value=solarPlan();return value.coverage?{...value.coverage,bounds:[...value.coverage.bounds] as SolarShadowCoverage['bounds']}:undefined;},
  render(pass:ResidentPlanarReflectionPass):ResidentPlanarReflectionResult{
   if(destroyed)return zero();
   const isSolar=pass.purpose==='solar-depth';let owner:OwnedSnapshot|undefined,execution:ResourceHold|undefined;
   try{
    let selected:Plan;
    if(isSolar){const value=solarPlan();if(value.snapshot.status==='inactive')return zero();if(!value.ready||!value.plan)return zero('coverage:'+(value.reason??'capture-plan-unready'));selected=value.plan;
     if(selected.triangles>pass.maxTriangles||selected.draws>(pass.maxDraws??64))return zero('plan:capture-budget');
    }else{const value=adapter.snapshot(false);if(value.status==='inactive')return zero();if(value.status==='blocked')return zero(value.reason,value.pending===true);owner=ownSnapshot(value,'reflection');selected=plan(owner,pass.mainMatrix,pass.maxTriangles,pass.maxDraws??64,false);}
    const snapshot=selected.snapshot;if(pass.gl!==snapshot.gl||snapshot.gl.isContextLost()){if(isSolar)replaceSolar(undefined);return zero(pass.gl!==snapshot.gl?'gpu:context-mismatch':'gpu:context-lost');}
    execution=holdResources(snapshot,isSolar?'solar':'reflection',selected.owner.hold);if(!execution.live()){if(isSolar)replaceSolar(undefined);return zero('gpu:resource-unavailable');}
    if(isSolar&&!resident(selected))return zero('mask-unavailable');
    if(isSolar&&!bindingsReady(snapshot))return zero('texture-unavailable');
    const result=withSceneSolarShadowReceiver(pass.gl,pass.mainMatrix,()=>execute(selected,pass,execution!),isSolar)??zero('receiver-unavailable');
    if(isSolar&&!result.complete&&(result.reason?.startsWith('exception:')||result.reason?.startsWith('gpu:')))replaceSolar(undefined);
    return result;
   }catch(error){if(isSolar)replaceSolar(undefined);return zero('capture-exception:'+String(error).slice(0,256));}
   finally{try{execution?.release();}finally{owner?.release();}}
  },
  invalidate(){replaceSolar(undefined);},
  destroy(){destroyed=true;replaceSolar(undefined);},
  get stats(){return{plans,preparations,borrowedPrograms:true,planRevision:solar?.revision,publicationVersion:solar?.plan?.snapshot.publicationVersion,ready:solar?.ready,reason:solar?.reason,triangles:solar?.plan?.triangles,draws:solar?.plan?.draws};},
 };
}

/** Shared executor: every row binds only its own chunk VAO, coordinate matrix,
 * masks and material bindings. Execution leases outlive all GL restoration. */
function execute(plan:Plan,pass:ResidentPlanarReflectionPass,resources:ResourceHold):ResidentPlanarReflectionResult{
 const snapshot=plan.snapshot,g=snapshot.gl,solar=pass.purpose==='solar-depth',plane=solar?undefined:residentReflectionClipPlane(pass.mainMatrix,pass.clipPlaneWorldZ);
 if(!solar&&!plane)return zero('clip-plane-unavailable');
 const viewport=g.getParameter(g.VIEWPORT) as Int32Array,touched=new Map<WebGLProgram,{matrix:Float32Array|null;resetClip:(program:WebGLProgram)=>void}>(),matrices=new Map<ResidentCaptureChunk,Float64Array>();
 const old={program:g.getParameter(g.CURRENT_PROGRAM),vao:g.getParameter(g.VERTEX_ARRAY_BINDING),depth:g.isEnabled(g.DEPTH_TEST),blend:g.isEnabled(g.BLEND),cull:g.isEnabled(g.CULL_FACE),mask:g.getParameter(g.DEPTH_WRITEMASK),depthFunc:g.getParameter(g.DEPTH_FUNC),src:g.getParameter(g.BLEND_SRC_RGB),dst:g.getParameter(g.BLEND_DST_RGB),srcA:g.getParameter(g.BLEND_SRC_ALPHA),dstA:g.getParameter(g.BLEND_DST_ALPHA)};
 let complete=plan.complete,pending=plan.pending===true,triangles=0,draws=0,reason=plan.reason?'plan:'+plan.reason:undefined,phase='state',current:ResidentCaptureRow|undefined;
 const fail=(value:string,waiting=false)=>{complete=false;pending||=waiting;reason??=value.slice(0,512);};
 const uniforms=(row:ResidentCaptureRow)=>{
  if(!resources.live()||g.isContextLost())throw Error('Capture resource unavailable');const chunk=row.chunk,p=row.program;g.bindVertexArray(chunk.vao);g.depthMask(solar||chunk.opacity>=.99);g.useProgram(p);
  if(!touched.has(p)){const location=g.getUniformLocation(p,'u_matrix');if(location===null)throw Error('Resident reflection matrix uniform unavailable');touched.set(p,{matrix:g.getUniform(p,location) as Float32Array|null,resetClip:program=>chunk.resetClip(program)});}
  let matrix=row.matrix??matrices.get(chunk);if(!matrix){matrix=chunk.matrix(pass.mainMatrix);matrices.set(chunk,matrix);}chunk.uniforms(p,matrix,plane,viewport);
 };
 const body=(row:ResidentCaptureRow)=>{phase='draw';if(!resources.live())throw Error('Capture resource unavailable');const maxTriangles=Number.isFinite(pass.maxTriangles)?Math.max(0,Math.floor(pass.maxTriangles)):0,maxDraws=Number.isFinite(pass.maxDraws??64)?Math.max(0,Math.floor(pass.maxDraws??64)):0;if(triangles+row.indexCount/3>maxTriangles||draws+1>maxDraws){fail('plan:capture-budget');return;}drawResidentTriangles(g,row.chunk.vao,row.indexCount,row.firstIndex*4);if(g.isContextLost()){fail('gpu:context-lost');throw Error('Capture context lost');}triangles+=row.indexCount/3;draws++;};
 const masked=(row:ResidentCaptureRow)=>{phase='mask';if(row.chunk.skipMasks)body(row);else if(!row.chunk.masks.withResidentMasks(g,row.program,()=>body(row)))fail(`mask-unavailable:${row.firstIndex}+${row.indexCount}`,true);};
 try{
  g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);if(solar)g.disable(g.BLEND);else g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
  for(const row of plan.rows){current=row;phase='uniforms';uniforms(row);phase='texture';row.chunk.bind(row.program,()=>masked(row),()=>fail(`texture-unavailable:${row.firstIndex}+${row.indexCount}`,true));}
  for(const row of plan.extra){current=row;phase='tie-uniforms';uniforms(row);const location=g.getUniformLocation(row.program,'u_c290_depth_bias');if(!location){fail(`tie-bias-uniform-unavailable:${row.firstIndex}+${row.indexCount}`);continue;}const previous=Number(g.getUniform(row.program,location));g.uniform1f(location,1e-6);try{masked(row);}finally{if(!g.isContextLost()&&resources.live())g.uniform1f(location,previous);}}
 }catch(error){complete=false;pending=false;reason=`exception:${phase}:${current?.firstIndex??'none'}+${current?.indexCount??'none'}:${String(error).slice(0,256)}`;}
 finally{if(!g.isContextLost()&&resources.live())try{for(const[p,value]of touched){g.useProgram(p);try{value.resetClip(p);}finally{if(value.matrix?.length===16)g.uniformMatrix4fv(g.getUniformLocation(p,'u_matrix'),false,value.matrix);}}}finally{g.bindVertexArray(old.vao);g.useProgram(old.program);old.depth?g.enable(g.DEPTH_TEST):g.disable(g.DEPTH_TEST);old.blend?g.enable(g.BLEND):g.disable(g.BLEND);old.cull?g.enable(g.CULL_FACE):g.disable(g.CULL_FACE);g.depthMask(old.mask);g.depthFunc(old.depthFunc);g.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);}}
 if(g.isContextLost()){complete=false;pending=false;reason='gpu:context-lost';}
 return{triangles,draws,complete,...(reason?{reason}:{}),...(pending?{pending:true}:{})};
}
