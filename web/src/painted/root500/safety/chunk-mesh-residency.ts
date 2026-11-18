import type {ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import type {ResourceBudgetCost} from '../../../safety/render-runtime/resource-budget';
import {createResidentGeometryOwner,type ResidentGeometryLease,type ResidentGeometryAttribute} from '../../../safety/render-runtime/resident-geometry';
import type {PackedMeshChunk} from './chunk-mesh-packing';

export type ChunkMeshDynamicLease=ChunkResourceLease<Float32Array>;
export type ChunkMeshExtraBuffer={readonly key:string;readonly data:Float32Array;readonly attributes:readonly ResidentGeometryAttribute[]};
/** Lengths delimit every complete string, including the namespace. Parent keys
 * remain verbatim instead of escaping their already serialized authority again. */
function derivedChunkMeshKey(namespace:string,...parts:string[]):string{
 let key=namespace.length+':'+namespace;for(const part of parts)key+=part.length+':'+part;return key;
}
export const chunkMeshViewKey=(owner:string,contentKey:string,viewABI='source9/state1/paint5/progressive4:v1')=>derivedChunkMeshKey('source-mesh-view:v2',owner,contentKey,viewABI);
const chunkMeshStateKey=(owner:string,contentKey:string)=>derivedChunkMeshKey('source-mesh-state1:v2',owner,contentKey);
// This callback captures only its allocation descriptor, never the source
// lease/value or the state producer's scope.
function stateCosts(identity:ResourceBudgetCost){return(data:Float32Array):readonly ResourceBudgetCost[]=>[
 {category:'packed',bytes:data.buffer.byteLength,precision:'exact',identity:data.buffer},identity,
];}

/** Only the scene's dynamic state is owner-specific. Static source bytes and
 * GPU buffers retain their content identity across requests and views. */
export function acquireChunkMeshState<T,Aux>(store:ChunkResourceStore,context:WebGL2RenderingContext,owner:string,source:ChunkResourceLease<PackedMeshChunk<T,Aux>>,signal:AbortSignal|undefined,onChange:()=>void):ChunkMeshDynamicLease{
 signal?.throwIfAborted();const value=source.value;if(!value)throw Error('Chunk CPU production has not completed');
 const contentKey=chunkMeshStateKey(owner,source.contentKey),identity:ResourceBudgetCost={category:'metadata',bytes:contentKey.length*2,precision:'estimate',identity:{},label:'chunk state identity UTF16 logical payload'};
 return store.acquire({contentKey,role:'candidate',signal,onChange,parents:[source],
  estimate:[{category:'packed',bytes:value.baseState.byteLength,precision:'exact'},identity],
  produce:production=>production.schedule(context,()=>{production.signal.throwIfAborted();return value.baseState.slice();},{phase:'source-build',priority:'visible'}),
  costs:stateCosts(identity),
 });
}

/** Called once per missing group from the existing upload work. The current
 * predicate describes the group's live consumer union, never one view token. */
export function allocateChunkMeshView<T,Aux>(options:{
 context:WebGL2RenderingContext;program:WebGLProgram;owner:string;
 source:ChunkResourceLease<PackedMeshChunk<T,Aux>>;state:ChunkMeshDynamicLease;
 staticGeometry:ReturnType<typeof createResidentGeometryOwner>;geometry:ReturnType<typeof createResidentGeometryOwner>;
 /** All static sidecars are supplied in every mode. Only viewABI changes when
  * a different active vertex/hook ABI binds those same stored buffers. */
 extraBuffers?:readonly ChunkMeshExtraBuffer[];viewABI?:string;colorRequired?:boolean;
 current:()=>boolean;
}):ResidentGeometryLease{
 const{context,program,source,state,staticGeometry,geometry}=options,cpu=source.value,dynamic=state.value;
 if(!cpu||!dynamic||state.released||source.released)throw Error('Chunk geometry dependencies are not ready');
 const extras=options.extraBuffers??[],extraKeys=new Set<string>();
 for(const spec of extras){if(['vertex','state','paint','progressive'].includes(spec.key)||extraKeys.has(spec.key))throw Error('Duplicate static chunk buffer key: '+spec.key);extraKeys.add(spec.key);}
 const shared=staticGeometry.allocate(context,program,{
  revision:0,contentKey:derivedChunkMeshKey('source-mesh-static:v2',source.contentKey,...[...extraKeys].sort()),parents:[source],current:options.current,indices:cpu.indices,
  buffers:[
   {key:'vertex',data:cpu.vertices,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24,required:options.colorRequired??true}]},
   {key:'paint',data:cpu.paint,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]},
   {key:'progressive',data:cpu.progressive,attributes:[{name:'a_progressive_color',size:4,stride:16,offset:0,required:false}]},
   ...extras,
  ],
 });
 try{
  const fixed=shared.value;if(!fixed)throw Error('Chunk static geometry allocation is not ready');
  return geometry.allocate(context,program,{
   revision:0,contentKey:chunkMeshViewKey(options.owner,source.contentKey,options.viewABI),parents:[shared,state],current:options.current,indexBuffer:fixed.indexBuffer,indices:cpu.indices,
   buffers:[
    {key:'vertex',buffer:fixed.buffers.get('vertex')!,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24,required:options.colorRequired??true}]},
    {key:'state',data:dynamic,dynamic:true,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]},
    {key:'paint',buffer:fixed.buffers.get('paint')!,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]},
    {key:'progressive',buffer:fixed.buffers.get('progressive')!,attributes:[{name:'a_progressive_color',size:4,stride:16,offset:0,required:false}]},
    ...extras.map(spec=>({key:spec.key,buffer:fixed.buffers.get(spec.key)!,attributes:spec.attributes})),
   ],
  });
 }finally{shared.release();}
}

/** Dynamic writes preserve every immutable buffer and target only this view's
 * state sidecar. An unchanged selection/growth pass issues no bufferSubData. */
export function uploadChunkMeshState(context:WebGL2RenderingContext,lease:ResidentGeometryLease,state:ChunkMeshDynamicLease){
 const geometry=lease.value,value=state.value;
 if(!geometry||!value||lease.context!==context||context.isContextLost())return false;
 const buffer=geometry.buffers.get('state');if(!buffer)return false;
 const previous=context.getParameter(context.ARRAY_BUFFER_BINDING);
 try{context.bindBuffer(context.ARRAY_BUFFER,buffer);context.bufferSubData(context.ARRAY_BUFFER,0,value);return !context.isContextLost();}
 finally{if(!context.isContextLost())context.bindBuffer(context.ARRAY_BUFFER,previous);}
}
