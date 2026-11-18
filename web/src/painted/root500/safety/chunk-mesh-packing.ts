import {retainRendererChunkInput,type RendererChunkFrame,type RendererChunkInput,type RendererSourceGroup} from '../../../safety/renderer-chunk-input';
import {resourceContentKey} from '../../../safety/resource-content-key';
import type {ChunkProductionContext,ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError,type ResourceBudgetCost} from '../../../safety/render-runtime/resource-budget';
import type {FamilyPaintRun} from '../../../safety/family-paint-program';

export type ChunkMeshComponent={
 objectId:string;partId:string;origin:[number,number];
 batches:readonly {positions:ArrayLike<number>;normals:ArrayLike<number>;indices:ArrayLike<number>;color:ArrayLike<number>;faceRole?:'wall'|'roof'|'mixed'}[];
};
export type ChunkMeshRow<T>={readonly component:T;readonly progressivePainted:boolean;readonly box:readonly number[];readonly firstVertex:number;readonly lastVertex:number;readonly start:number;readonly end:number};
export type PackedMeshChunk<T,Aux=undefined>={
 readonly contentKey:string;readonly sourceKey:string;readonly frame:RendererChunkFrame;readonly anchor:readonly[number,number];
 readonly vertices:Float32Array;readonly indices:Uint32Array;readonly paint:Float32Array;readonly progressive:Float32Array;
 /** Style and initial full growth only. Selection/growth never mutate this payload. */
 readonly baseState:Float32Array;readonly rows:readonly ChunkMeshRow<T>[];readonly runs:readonly FamilyPaintRun[];
 readonly metadataBytes:number;readonly styles:readonly number[];readonly auxiliary:Aux;readonly auxiliaryCosts:readonly ResourceBudgetCost[];readonly releaseAuxiliary?:()=>void;readonly dependencies:readonly ChunkResourceLease<unknown>[];
};
export type ChunkMeshMaterials<Aux=undefined>={
 paint:Float32Array;progressive:Float32Array;auxiliary:Aux;release?():void;
 /** Construction-only geometry overrides retain the admitted source row for
  * material proofs/readback. This map is never stored in the packed payload. */
 geometry?:ReadonlyMap<string,{origin:[number,number];batches:ChunkMeshComponent['batches']}>;
};
/** All work runs on the resource's existing context scheduler. A callback owns
 * its provider scope only synchronously; never leave a current scope installed
 * across the returned promise. Await every submitted step before returning the
 * materials, and release incomplete sidecars if that promise rejects. */
export type ChunkMeshWorkContext={
 readonly signal:AbortSignal;
 run<T>(work:()=>T,label?:string):Promise<T>;
 /** true completes the job; false resumes it under the same scheduler budget. */
 steps(step:()=>boolean,label?:string):Promise<void>;
};
export type ChunkMeshPackOptions<T extends ChunkMeshComponent,Aux=undefined>={
 group:RendererSourceGroup<T>;components:readonly T[];provider:string;
 /** Existing semantic admission has already resolved complete cohorts. */
 batchIncluded(component:T,index:number):boolean;
 materials(components:readonly T[],signal:AbortSignal,work:ChunkMeshWorkContext):ChunkMeshMaterials<Aux>|Promise<ChunkMeshMaterials<Aux>>;
 /** Reserve additional sidecars before materials expands them; actual costs
  * use complete underlying buffers as identities, not each typed view. */
 auxiliaryEstimate?:readonly ResourceBudgetCost[];
 auxiliaryCosts?(auxiliary:Aux):readonly ResourceBudgetCost[];
 styles(component:T):{wall:number;roof:number;landmark:boolean;sourceGlassRoof:boolean};
 /** A contiguous triangle window with global vertex indices. Returned run
  * offsets are local to that window; equal adjacent keys are joined afterwards. */
 runs(indices:Uint32Array,paint:Float32Array):readonly FamilyPaintRun[];
 progressivePainted?(component:T):boolean;
 sourceCurrent():void;
 retainSource?():()=>void;
};
const circumference=2*Math.PI*6378137;
const sourceUnit=(lat:number)=>circumference*Math.cos(lat*Math.PI/180);
const mercator=(origin:readonly[number,number]):[number,number]=>[(origin[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+origin[1]*Math.PI/360))/Math.PI)/2];
// Work-unit bounds, not another timer/scheduler: one existing PreparationJob
// repeats these steps under its unchanged 2ms / 16-step dispatch policy.
const meshStepUnits=2048,runWindowIndices=512*3;
export const CHUNK_MESH_PACKING_ABI='source9/paint5/progressive4/state1/stable-source-frame:v1';
export type RetainedChunkInput<T>={readonly input:RendererChunkInput<T>;release():void};
export type PreparedChunkReceipt<T>={chunkInput?:RendererChunkInput<T>;releaseChunkDependencies():void;release():void};
/** Every identity field comes from selected source/recipe authority, never a view
 * generation or component ID. IDs are used only to join local rows afterwards. */
export function meshChunkContentKey<T>(provider:string,group:RendererSourceGroup<T>){
 return resourceContentKey('packed-mesh-v2',provider,CHUNK_MESH_PACKING_ABI,group.contentKey,group.selectedLOD,group.frame.authority,group.frame.origin,group.frame.unit,group.materialAuthority,group.recipeAuthority);
}

/** A preparation receipt owns its source roles independently of the manager.
 * Copies are metadata-only; source arrays are neither copied nor decoded. */
export function retainChunkInput<T>(input:RendererChunkInput<T>|undefined):RetainedChunkInput<T>|undefined{
 const held=retainRendererChunkInput(input);return held?{input:held,release:()=>held.release()}:undefined;
}

function dimensions<T extends ChunkMeshComponent,Aux>(options:ChunkMeshPackOptions<T,Aux>){
 let vertices=0,indices=0;for(const component of options.components)for(const[index,batch]of component.batches.entries()){
  vertices+=batch.positions.length/3;if(options.batchIncluded(component,index))indices+=batch.indices.length;
 }
 return{vertices,indices};
}
function packedCosts<T,Aux>(value:PackedMeshChunk<T,Aux>):readonly ResourceBudgetCost[]{
 return[value.vertices,value.indices,value.paint,value.progressive,value.baseState].map(data=>({category:'packed',bytes:data.buffer.byteLength,precision:'exact',identity:data.buffer} as const));
}
/** The store keeps an entry's dispose and costs for the entry's whole life,
 * recent included. Both are module functions of the produced value alone, so
 * an entry never reaches the packing options or a renderer's finish scope. */
function packedMeshChunkCosts<T,Aux>(value:PackedMeshChunk<T,Aux>):readonly ResourceBudgetCost[]{
 return[...packedCosts(value),...value.auxiliaryCosts,{category:'metadata',bytes:value.metadataBytes,precision:'estimate'}];
}
function disposePackedMeshChunk<T,Aux>(value:PackedMeshChunk<T,Aux>){value.releaseAuxiliary?.();}
type MeshChunkProduction<T extends ChunkMeshComponent,Aux>={options:ChunkMeshPackOptions<T,Aux>;context:WebGL2RenderingContext;contentKey:string;size:{vertices:number;indices:number};identityBytes:number;releaseSource:(()=>void)|undefined};
function chunkMeshWork(production:ChunkProductionContext,context:WebGL2RenderingContext,sourceCurrent:()=>void){
 let active:{production:ChunkProductionContext;context:WebGL2RenderingContext;sourceCurrent:()=>void}|undefined={production,context,sourceCurrent};
 const current=()=>{const held=active;if(!held)throw Error('Chunk mesh production has settled');held.production.signal.throwIfAborted();held.sourceCurrent();return held;};
 const work:ChunkMeshWorkContext={signal:production.signal,
  run<T>(callback:()=>T,label?:string){const held=current();return held.production.schedule(held.context,()=>{current();return callback();},{phase:'source-build',priority:'visible',label});},
  steps(step:()=>boolean,label?:string){const held=current();return held.production.scheduleSteps(held.context,()=>{current();return step();},{phase:'source-build',priority:'visible',label});},
 };
 return{work,close(){active=undefined;}};
}

/** The store runs this producer only for missing content. Semantic selection is
 * complete before acquisition; no whole-scene packed array exists to split.
 * The request hands the options to the production when the store starts it;
 * without a production (a store hit or a refusal) the source role ends here.
 * The store calls produce at most once, synchronously inside acquire; any other
 * call throws instead of packing, so a deferred start needs a new hand-over. */
export function acquirePackedMeshChunk<T extends ChunkMeshComponent,Aux>(store:ChunkResourceStore,context:WebGL2RenderingContext,options:ChunkMeshPackOptions<T,Aux>,signal:AbortSignal|undefined,onChange:()=>void):ChunkResourceLease<PackedMeshChunk<T,Aux>>{
 signal?.throwIfAborted();const contentKey=meshChunkContentKey(options.provider,options.group),size=dimensions(options),estimate=size.vertices*(9+5+4+1)*4+size.indices*4;
 const identityBytes=2*(contentKey.length+options.group.contentKey.length+options.group.frame.authority.length),metadataBase=options.components.length*256+identityBytes;
 let job:MeshChunkProduction<T,Aux>|undefined={options,context,contentKey,size,identityBytes,releaseSource:options.retainSource?.()};
 const unstarted=()=>{const held=job;job=undefined;held?.releaseSource?.();};
 try{const lease=store.acquire<PackedMeshChunk<T,Aux>>({contentKey,role:'candidate',signal,onChange,allowRecent:true,parents:options.group.parents,
  estimate:[{category:'packed',bytes:estimate,precision:'exact'},{category:'metadata',bytes:metadataBase+Math.floor(size.indices/3)*48,precision:'estimate'},
   // The old run adapter returns one bounded window before its rows are joined
   // into the retained run list. Its temporary metadata is admitted up front.
   {category:'construction',bytes:128+Math.min(Math.floor(size.indices/3),runWindowIndices/3)*48,precision:'estimate'},...(options.auxiliaryEstimate??[])],
  produce(production){const held=job;job=undefined;if(!held)throw Error('Chunk mesh produce called more than once or after acquire returned');return produceMeshChunk(held,production);},
  costs:packedMeshChunkCosts,dispose:disposePackedMeshChunk,
 });
 unstarted();return lease;
 }catch(error){unstarted();throw error;}
}
/** One production of missing content. Only its frame and its scheduled work
 * hold the options, so they are unreachable once production settles. */
async function produceMeshChunk<T extends ChunkMeshComponent,Aux>({options,context,contentKey,size,identityBytes,releaseSource}:MeshChunkProduction<T,Aux>,production:ChunkProductionContext):Promise<PackedMeshChunk<T,Aux>>{
 const dependencies:readonly ChunkResourceLease<unknown>[]=[],scheduled=chunkMeshWork(production,context,()=>options.sourceCurrent()),work=scheduled.work;
 let failedAuxiliary:(()=>void)|undefined;
 try{
  const frame=options.group.frame;let anchor!:[number,number];
  // Invoking even a legacy synchronous material provider belongs to the same
  // scheduler. An asynchronous provider's entire promise remains part of this
  // store production, although each synchronous step releases its scope.
  const {paint,progressive,auxiliary,release,geometry}=await work.run(()=>{
   if(!Number.isFinite(frame.unit)||frame.unit<=0||!frame.origin.every(Number.isFinite))throw Error('Invalid authoritative chunk frame');
   anchor=mercator(frame.origin);return options.materials(options.components,production.signal,work);
  },'mesh-materials');
  failedAuxiliary=release;
  const {vertices,indices,baseState}=await work.run(()=>{
   if(paint.length!==size.vertices*5||progressive.length!==size.vertices*4)throw Error('Chunk material metadata count mismatch');
   const vertices=new Float32Array(size.vertices*9),indices=new Uint32Array(size.indices),baseState=new Float32Array(size.vertices);
   return{vertices,indices,baseState};
  },'mesh-arrays');
  const rows:ChunkMeshRow<T>[]=[],styles=new Set<number>(),styleValues:number[]=[];let vi=0,ii=0,componentIndex=0;
  type RowWork={component:T;render:Pick<ChunkMeshComponent,'origin'|'batches'>;ratio:number;dx:number;dz:number;box:number[];firstVertex:number;start:number;style:ReturnType<ChunkMeshPackOptions<T,Aux>['styles']>;batchIndex:number};
  type BatchWork={batch:ChunkMeshComponent['batches'][number];included:boolean;offset:number;position:number;index:number};
  let row:RowWork|undefined,batchWork:BatchWork|undefined;
  await work.steps(()=>{
   let remaining=meshStepUnits;
   while(remaining>0){
    if(!row){
     if(componentIndex===options.components.length)return true;
     const component=options.components[componentIndex++],render=geometry?.get(component.objectId+'|'+component.partId)??component;
     if(render.batches.length!==component.batches.length)throw Error('Chunk projected geometry batch layout changed');
     const q=mercator(render.origin),ratio=frame.unit/sourceUnit(render.origin[1]);
     row={component,render,ratio,dx:(q[0]-anchor[0])*frame.unit,dz:-(q[1]-anchor[1])*frame.unit,box:[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity],firstVertex:vi,start:ii,style:options.styles(component),batchIndex:0};remaining--;
    }
    if(row.batchIndex===row.render.batches.length){
     if(ii>row.start)rows.push({component:row.component,progressivePainted:options.progressivePainted?.(row.component)??false,box:row.box,firstVertex:row.firstVertex,lastVertex:vi,start:row.start,end:ii});
     row=undefined;remaining--;continue;
    }
    if(!batchWork){
     const batch=row.render.batches[row.batchIndex],source=row.component.batches[row.batchIndex];
     if(batch.positions.length!==source.positions.length||batch.normals.length!==source.normals.length||batch.indices.length!==source.indices.length||batch.color.length!==source.color.length)throw Error('Chunk projected geometry layout changed');
     batchWork={batch,included:options.batchIncluded(row.component,row.batchIndex),offset:vi,position:0,index:0};remaining--;
    }
    const {batch,included,offset}=batchWork,{ratio,dx,dz,box,style}=row;
    const positionEnd=Math.min(batch.positions.length,batchWork.position+Math.max(0,remaining)*3);
    for(;batchWork.position<positionEnd;batchWork.position+=3,remaining--){
     const j=batchWork.position;
     for(let k=0;k<3;k++){
      // Preserve the original double-precision origin subtraction and every
      // Float32 write; only the loop's resumable boundary changes.
      const position=k===1?batch.positions[j+k]*ratio:(k===0?dx:dz)+batch.positions[j+k]*ratio;
      if(included){box[k]=Math.min(box[k],position);box[k+3]=Math.max(box[k+3],position);}
      vertices[vi*9+k]=position;vertices[vi*9+3+k]=batch.normals[j+k];vertices[vi*9+6+k]=batch.color[k];
     }
     const value=style.sourceGlassRoof||batch.faceRole==='roof'||batch.faceRole!=='wall'&&Math.abs(batch.normals[j+1])>.2?style.roof:style.wall;
     if(style.landmark&&!style.sourceGlassRoof&&!styles.has(value)){styles.add(value);styleValues.push(value);}baseState[vi++]=value*4+1;
    }
    if(batchWork.position<batch.positions.length)return false;
    if(included){
     const indexEnd=Math.min(batch.indices.length,batchWork.index+Math.max(0,remaining));
     for(;batchWork.index<indexEnd;batchWork.index++,remaining--)indices[ii++]=offset+batch.indices[batchWork.index];
     if(batchWork.index<batch.indices.length)return false;
    }
    batchWork=undefined;row.batchIndex++;remaining--;
   }
   return false;
  },'mesh-geometry');
  const runs:FamilyPaintRun[]=[];let runAt=0,packed:PackedMeshChunk<T,Aux>|undefined;
  await work.steps(()=>{
   const start=runAt,end=Math.min(indices.length,start+runWindowIndices);
   // subarray is a bounded view of the sole admitted index allocation. The
   // unchanged adapter still sees global vertex indices and the full paint.
   const local=options.runs(start===0&&end===indices.length?indices:indices.subarray(start,end),paint);
   for(let i=0;i<local.length;i++){
    const run=local[i],firstIndex=start+run.firstIndex,previous=i===0?runs.at(-1):undefined;
    if(previous?.key===run.key&&previous.firstIndex+previous.indexCount===firstIndex)previous.indexCount+=run.indexCount;
    else runs.push({key:run.key,firstIndex,indexCount:run.indexCount});
   }
   runAt=end;if(runAt<indices.length)return false;
   const auxiliaryCosts=options.auxiliaryCosts?.(auxiliary)??[],metadataBytes=rows.length*256+identityBytes+runs.length*48;
   const value:PackedMeshChunk<T,Aux>={contentKey,sourceKey:options.group.contentKey,frame:{...frame,origin:[...frame.origin]},anchor,vertices,indices,paint,progressive,baseState,rows,runs,metadataBytes,styles:styleValues,auxiliary,auxiliaryCosts,releaseAuxiliary:release,dependencies};
   if(!production.adjust([...packedCosts(value),...auxiliaryCosts,{category:'metadata',bytes:value.metadataBytes,precision:'estimate'}])){
    const pressure=production.budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Chunk packed resource admission was cancelled');
   }
   // Finish in the final synchronous step. A reentrant cancellation after
   // this point must deliver the late value to the store's existing disposer.
   packed=value;return true;
  },'mesh-runs');
  if(!packed)throw Error('Chunk mesh steps completed without a packed value');
  failedAuxiliary=undefined;return packed;
 }catch(error){failedAuxiliary?.();throw error;}finally{scheduled.close();releaseSource?.();}
}

export type ChunkSceneRow<T,Aux=undefined>={readonly chunk:PackedMeshChunk<T,Aux>;readonly row:ChunkMeshRow<T>};
export type ChunkSceneSpan<T,Aux=undefined>={readonly chunk:PackedMeshChunk<T,Aux>;readonly key:string;readonly firstIndex:number;indexCount:number};
/** Preserve old component/run order while replacing global offsets by exact
 * local spans. A span never repeats the complete scene for another chunk. */
export function indexMeshChunkScene<T extends ChunkMeshComponent,Aux>(chunks:readonly PackedMeshChunk<T,Aux>[],orderedComponents:readonly T[]){
 const local=new Map<string,ChunkSceneRow<T,Aux>>(),rows:ChunkSceneRow<T,Aux>[]=[],spans:ChunkSceneSpan<T,Aux>[]=[];
 for(const chunk of chunks)for(const row of chunk.rows){const key=row.component.objectId+'|'+row.component.partId;if(local.has(key))throw Error('Component belongs to more than one packed authority group');local.set(key,{chunk,row});}
 for(const component of orderedComponents){
  const value=local.get(component.objectId+'|'+component.partId);if(!value)continue;rows.push(value);
  for(const run of value.chunk.runs){
   const firstIndex=Math.max(run.firstIndex,value.row.start),end=Math.min(run.firstIndex+run.indexCount,value.row.end);if(end<=firstIndex)continue;
   const previous=spans.at(-1);if(previous?.chunk===value.chunk&&previous.key===run.key&&previous.firstIndex+previous.indexCount===firstIndex)previous.indexCount+=end-firstIndex;
   else spans.push({chunk:value.chunk,key:run.key,firstIndex,indexCount:end-firstIndex});
  }
 }
 return{rows,spans,vertices:chunks.reduce((sum,chunk)=>sum+chunk.vertices.length/9,0),indices:rows.reduce((sum,value)=>sum+value.row.end-value.row.start,0)};
}

/** Do not normalize again per chunk: triangle t remains the same world-ray
 * parameter across every frame, even when their Mercator scales differ. */
export function worldRayInMeshChunk<T,Aux>(chunk:PackedMeshChunk<T,Aux>,origin:readonly number[],direction:readonly number[]){
 const scale=chunk.frame.unit;return{origin:[(origin[0]-chunk.anchor[0])*scale,origin[2]*scale,-(origin[1]-chunk.anchor[1])*scale],direction:[direction[0]*scale,direction[2]*scale,-direction[1]*scale]};
}

/** Complete only the physical source groups ingress has already activated.
 * Request rows remain a separate viewport ordering/selection receipt. */
export function completeChunkSourceRows<T extends {objectId:string;partId:string}>(input:RendererChunkInput<T>|undefined,requested:readonly T[]):T[]{
 const rows:T[]=[],seen=new Set<string>(),requestKeys=new Set<string>();
 for(const row of requested){const identity=row.objectId+'|'+row.partId;if(requestKeys.has(identity))throw Error('Duplicate component identity');requestKeys.add(identity);}
 for(const row of [...(input?.groups.flatMap(group=>group.components)??[]),...requested]){const identity=row.objectId+'|'+row.partId;if(!seen.has(identity)){seen.add(identity);rows.push(row);}}
 return rows;
}

/** Display descendants inherit visibility from verified owner ancestry. Explicit
 * source-absent displays have their own already checked admission predicate. */
export function visibleChunkDisplayKeys<T extends {objectId:string;partId:string}>(requested:readonly T[],source:readonly T[],display:readonly T[],receipts:readonly{objectId:string;partId:string;sourcePartId?:string;sourceCarrier?:{objectId:string}}[],explicit:(row:T)=>boolean):string[]{
 const key=(row:{objectId:string;partId:string})=>row.objectId+'|'+row.partId,order=new Map(requested.map((row,index)=>[key(row),index])),sourceKeys=new Set(source.map(key)),parents=new Map(receipts.filter(row=>row.sourcePartId).map(row=>[key(row),(row.sourceCarrier?.objectId??row.objectId)+'|'+row.sourcePartId]));
 const rank=(identity:string):number|undefined=>{const seen=new Set<string>();for(let at:string|undefined=identity;at&&!seen.has(at);at=parents.get(at)){seen.add(at);const value=order.get(at);if(value!==undefined)return value;}return undefined;};
 return display.map((row,index)=>({row,index,rank:rank(key(row))})).filter(({row,rank})=>rank!==undefined||!sourceKeys.has(key(row))&&explicit(row)).sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||a.index-b.index).map(({row})=>key(row));
}

/** Publication filters/order never enter physical chunk identity or production. */
export function orderVisibleChunkRows<T extends {objectId:string;partId:string}>(rows:readonly T[],identities:readonly string[]|undefined):T[]{
 if(!identities)return [...rows];const byKey=new Map(rows.map(row=>[row.objectId+'|'+row.partId,row]));return identities.flatMap(identity=>{const row=byKey.get(identity);return row?[row]:[];});
}

type ChunkMaskBinding={destroy():void};
type ChunkMaskRecipe<T extends ChunkMaskBinding>={readonly wordMasks:readonly{preferred:{objectId:string;partId:string}}[];createBinding(visible?:readonly{objectId:string;partId:string}[]):T};
const chunkMaskBindingOwners=new WeakMap<object,Map<string,{binding:ChunkMaskBinding;users:number}>>();
/** Adjacent publications borrow the same binding when their preferred-mask
 * activity is equal. Each publication owns one release, independent of captures.
 * Entries exist only while current/candidate owners hold them; no recent cache. */
export function retainChunkMaskBinding<T extends ChunkMaskBinding>(recipe:ChunkMaskRecipe<T>,visible:readonly{objectId:string;partId:string}[],owner:string):T{
 const identities=new Set(visible.map(row=>row.objectId+'|'+row.partId)),signature=JSON.stringify([owner,recipe.wordMasks.map(mask=>Number(identities.has(mask.preferred.objectId+'|'+mask.preferred.partId))).join('')]);
 let variants=chunkMaskBindingOwners.get(recipe);if(!variants){variants=new Map();chunkMaskBindingOwners.set(recipe,variants);}
 let shared=variants.get(signature);if(!shared){shared={binding:recipe.createBinding(visible),users:0};variants.set(signature,shared);}shared.users++;
 const held=shared,owners=variants;let live=true;
 return new Proxy(held.binding as T,{get(target,name){if(name==='destroy')return()=>{if(!live)return;live=false;if(--held.users)return;owners.delete(signature);held.binding.destroy();};return Reflect.get(target,name);}});
}
