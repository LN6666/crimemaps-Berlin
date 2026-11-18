import {resourceContentKey} from '../../../safety/resource-content-key';
import {retainRendererChunkInput,type RendererChunkInput,type RendererSourceGroup,type RetainedRendererChunkInput} from '../../../safety/renderer-chunk-input';
import type {ChunkProductionContext,ChunkResourceCosts,ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import {createIndexedPickBlocks70} from './indexed-pick-blocks70';
import type {RathausProxyMaskRecipe} from '../../../safety/facade-rathaus-proxy-mask';

export type ChunkComponentIdentity={objectId:string;partId:string};
export type PackedChunkRow=ChunkComponentIdentity&{box:number[];start:number;end:number;firstVertex:number;lastVertex:number;progressivePainted:boolean};
export type PackedBuildingChunk={
 readonly vertices:Float32Array;readonly indices:Uint32Array;readonly paint:Float32Array;readonly progressive:Float32Array;readonly initialState:Float32Array;
 readonly rows:readonly PackedChunkRow[];readonly styles:readonly number[];readonly landmarkVisible:boolean;
 readonly sourceRowCount:number;
 readonly indexedPick?:{bounds:Float64Array;ranges:ReadonlyMap<string,{offset:number;blocks:number}>;blockTriangles:number;blockCount:number;typedBytes:number;rangeCount:number};
 readonly maskRecipe?:RathausProxyMaskRecipe;
};
export type ChunkMesh={positions:ArrayLike<number>;normals:ArrayLike<number>;indices:ArrayLike<number>;color:ArrayLike<number>;faceRole?:'wall'|'roof'|'mixed'};
export type ChunkGeometryComponent=ChunkComponentIdentity&{origin:readonly[number,number];batches:readonly ChunkMesh[]};

/** Only this group's positions are materialized. Subtract the producer frame
 * in double precision before writing a Float32 vertex. */
export function packChunkGeometry<T extends ChunkGeometryComponent>(components:readonly T[],frame:{origin:readonly[number,number];unit:number},paint:Float32Array,progressive:Float32Array,options:{merc(origin:readonly[number,number]):readonly[number,number];unit(latitude:number):number;included(component:T,batch:number):boolean;style(component:T,batch:ChunkMesh,vertex:number):number;progressivePainted(component:T):boolean;landmark(component:T):boolean;indexedPick?:boolean}):PackedBuildingChunk{
 let count=0,indexCount=0;for(const c of components)for(const [i,b]of c.batches.entries()){count+=b.positions.length/3;if(options.included(c,i))indexCount+=b.indices.length;}
 if(paint.length!==count*5||progressive.length&&progressive.length!==count*4)throw Error('Chunk paint metadata count mismatch');
 const anchor=options.merc(frame.origin),vertices=new Float32Array(count*9),indices=new Uint32Array(indexCount),initialState=new Float32Array(count),rows:PackedChunkRow[]=[],styles=new Set<number>();let vi=0,ii=0,landmarkVisible=false;
 for(const c of components){const q=options.merc(c.origin),ratio=frame.unit/options.unit(c.origin[1]),dx=(q[0]-anchor[0])*frame.unit,dz=-(q[1]-anchor[1])*frame.unit,box=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity],firstVertex=vi,start=ii,landmark=options.landmark(c);landmarkVisible||=landmark;
  for(const [batchIndex,b]of c.batches.entries()){const included=options.included(c,batchIndex),offset=vi;for(let j=0;j<b.positions.length;j+=3){const x=dx+b.positions[j]*ratio,y=b.positions[j+1]*ratio,z=dz+b.positions[j+2]*ratio;for(let k=0;k<3;k++){const coordinate=k===0?x:k===1?y:z;if(included){box[k]=Math.min(box[k],coordinate);box[k+3]=Math.max(box[k+3],coordinate);}vertices[vi*9+k]=coordinate;vertices[vi*9+3+k]=b.normals[j+k];vertices[vi*9+6+k]=b.color[k];}const style=options.style(c,b,j);initialState[vi]=style*4+1;if(landmark)styles.add(style);vi++;}if(included)for(let j=0;j<b.indices.length;j++)indices[ii++]=offset+b.indices[j];}
  if(ii>start)rows.push({objectId:c.objectId,partId:c.partId,box,start,end:ii,firstVertex,lastVertex:vi,progressivePainted:options.progressivePainted(c)});
 }
 const pick=options.indexedPick?createIndexedPickBlocks70(vertices,indices,rows,9):undefined,indexedPick=pick?{...pick,ranges:new Map([...pick.ranges].map(([row,range])=>[row.objectId+'|'+row.partId,range]))}:undefined;
 return{vertices,indices,paint,progressive,initialState,rows,sourceRowCount:components.length,styles:[...styles],landmarkVisible,indexedPick};
}
export type PreparedChunkBindings<T>=RetainedRendererChunkInput<T>;

/** The receipt owns source roles independently from the manager/session. The
 * immutable packed value contains no producer closure or source scope. */
export function retainChunkBindings<T>(input:RendererChunkInput<T>):PreparedChunkBindings<T>{
 const retained=retainRendererChunkInput(input);if(!retained)throw Error('Missing renderer chunk input');return retained;
}

/** Visible rows activate existing source groups; packingComponents contains
 * their complete display-filtered source rows, in stable producer order. The
 * visible subset never changes the physical content key or packed membership.
 * Identity only joins rows to ingress authority, never establishes equality. */
export function selectedChunkGroups<T extends ChunkComponentIdentity>(components:readonly T[],input:RendererChunkInput<T>,packingComponents:readonly T[]=components){
 const owners=new Map<string,RendererSourceGroup<T>>(),byGroup=new Map<RendererSourceGroup<T>,T[]>();
 for(const group of input.groups){
  if(!group.contentKey||!group.frame.authority||!group.materialAuthority||!group.recipeAuthority||!Number.isFinite(group.frame.unit)||group.frame.unit<=0||group.frame.origin.some(value=>!Number.isFinite(value)))throw Error('Invalid renderer chunk authority/frame');
  for(const component of group.components){const key=component.objectId+'|'+component.partId;if(owners.has(key))throw Error('Component belongs to multiple renderer source groups: '+key);owners.set(key,group);}
 }
 const selected=new Set<RendererSourceGroup<T>>();
 for(const component of components){const key=component.objectId+'|'+component.partId,group=owners.get(key);if(!group)throw Error('Accepted component has no renderer chunk authority: '+key);selected.add(group);}
 for(const component of packingComponents){const key=component.objectId+'|'+component.partId,group=owners.get(key);if(!group)throw Error('Packed component has no renderer chunk authority: '+key);let rows=byGroup.get(group);if(!rows){rows=[];byGroup.set(group,rows);}rows.push(component);}
 return input.groups.flatMap(group=>{const rows=byGroup.get(group);return selected.has(group)&&rows?.length?[{source:group,components:rows}]:[];});
}

export function packedChunkContentKey<T>(provider:string,group:RendererSourceGroup<T>,layout:string){
 return resourceContentKey('packed-chunk-v3',provider,group.contentKey,group.recipeAuthority,group.materialAuthority,group.frame.authority,group.frame.origin,group.frame.unit,layout);
}
export function validateChunkCohorts<T>(input:RendererChunkInput<T>){
 const keys=new Set(input.groups.map(group=>group.contentKey));
 if(keys.size!==input.groups.length)throw Error('Duplicate renderer source content key');
 for(const cohort of input.cohorts)for(const member of cohort.members)if(!keys.has(member))throw Error('Incomplete renderer publication cohort '+cohort.key+': '+member);
}
/** Publication takes unsignalled role grants before retiring the candidate's
 * roles. A later viewport abort can release only the preparation receipt. */
export function adoptPackedChunkRoles<T extends PackedBuildingChunk>(chunks:readonly{cpu:ChunkResourceLease<T>;dynamic:ChunkResourceLease<Float32Array>}[]){
 const grants:{chunk:typeof chunks[number];cpu:ChunkResourceLease<T>;dynamic:ChunkResourceLease<Float32Array>}[]=[];
 try{for(const chunk of chunks){if(chunk.cpu.role==='main'&&chunk.dynamic.role==='main')continue;const cpu=chunk.cpu.retain('main');try{grants.push({chunk,cpu,dynamic:chunk.dynamic.retain('main')});}catch(error){cpu.release();throw error;}}}
 catch(error){for(const grant of grants){grant.cpu.release();grant.dynamic.release();}throw error;}
 for(const grant of grants){const {cpu,dynamic}=grant.chunk;grant.chunk.cpu=grant.cpu;grant.chunk.dynamic=grant.dynamic;cpu.release();dynamic.release();}
}
/** Split existing ordered pass rows at actual allocation spans. Adjacent rows
 * merge only when their program and local element range are identical state. */
export function splitChunkRuns<Program,Chunk>(spans:readonly{chunk:Chunk;firstIndex:number;indexCount:number;localFirstIndex:number}[],chunk:Chunk,runs:readonly{program:Program|undefined;firstIndex:number;indexCount:number}[]){
 const result:{program:Program|undefined;firstIndex:number;indexCount:number}[]=[];
 for(const span of spans){if(span.chunk!==chunk)continue;for(const run of runs){const first=Math.max(span.firstIndex,run.firstIndex),end=Math.min(span.firstIndex+span.indexCount,run.firstIndex+run.indexCount);if(end<=first)continue;const local=span.localFirstIndex+first-span.firstIndex,previous=result.at(-1);if(previous&&previous.program===run.program&&previous.firstIndex+previous.indexCount===local)previous.indexCount+=end-first;else result.push({program:run.program,firstIndex:local,indexCount:end-first});}}
 return result;
}
/** The store keeps an entry's dispose and costs for the entry's whole life,
 * recent included. Both are module functions of the packed value alone, so an
 * entry never reaches the producer callback or the renderer scope it closes over. */
function packedChunkCosts(packed:PackedBuildingChunk):ChunkResourceCosts{
 return[...[packed.vertices,packed.indices,packed.paint,packed.progressive,packed.initialState,...(packed.indexedPick?[packed.indexedPick.bounds]:[])].map(array=>({category:'packed' as const,bytes:array.byteLength,precision:'exact' as const,identity:array.buffer})),{category:'metadata',bytes:512+packed.sourceRowCount*256,precision:'estimate',identity:packed.rows},...(packed.maskRecipe?.costs??[])];
}
function disposePackedChunk(packed:PackedBuildingChunk){packed.maskRecipe?.release();}
type PackedChunkProduction<T>={produce:(context:ChunkProductionContext)=>T;gl:WebGL2RenderingContext|undefined;retainProduction:(()=>()=>void)|undefined};
/** The request hands the producer to the production when the store starts it;
 * without a production (a store hit or a refusal) it is dropped right here,
 * which only matters to a wrapper that keeps requests: the store keeps none.
 * The store calls produce at most once, synchronously inside acquire; any other
 * call throws instead of packing, so a deferred start needs a new hand-over. */
export function acquirePackedChunk<T extends PackedBuildingChunk>(store:ChunkResourceStore,contentKey:string,estimate:number,produce:(context:ChunkProductionContext)=>T,signal?:AbortSignal,gl?:WebGL2RenderingContext,retainProduction?:()=>()=>void,metadataRows=0,parents:readonly ChunkResourceLease<unknown>[]=[]){
 let job:PackedChunkProduction<T>|undefined={produce,gl,retainProduction};
 try{return store.acquire<T>({contentKey,role:'candidate',parents,estimate:[{category:'packed',bytes:estimate,precision:'estimate'},{category:'mask',bytes:2048,precision:'exact'},{category:'metadata',bytes:512+metadataRows*256,precision:'estimate'}],signal,produce(context){const held=job;job=undefined;if(!held)throw Error('Packed chunk produce called more than once or after acquire returned');return producePackedChunk(held,context);},dispose:disposePackedChunk,costs:packedChunkCosts,allowRecent:true});}
 finally{job=undefined;}
}
/** One production of missing content. Its frame and scheduled work alone hold
 * the producer and its production role, both gone once production settles. */
function producePackedChunk<T>({produce,gl,retainProduction}:PackedChunkProduction<T>,context:ChunkProductionContext):T|Promise<T>{
 context.signal.throwIfAborted();let retained=retainProduction?.();const release=()=>{const held=retained;retained=undefined;held?.();};try{if(gl)return context.schedule(gl,()=>produce(context),{phase:'source-build',priority:'visible'}).finally(release);try{return produce(context);}finally{release();}}catch(error){release();throw error;}
}
