import type {ChunkResourceLease,ChunkResourceStore,ChunkProductionContext} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError,type ResourceBudgetCost} from './render-runtime/resource-budget';
import type {ResourceByteAcquireOptions} from './resource-byte-transport';
import {environmentJsonReadCosts,environmentDecodedCost,environmentRetainedEstimate,createEnvironmentReadEnvelopes,waitForEnvironmentLease} from './environment-resource-budget';
import {inspectEnvironmentHardSurfaceMesh,decodeEnvironmentHardSurfaceMesh,validateHardSurfaceMeshBoundary,environmentHardSurfaceMeshEncodedRetainedBytes,environmentHardSurfaceMeshPublicationBound,type HardSurfaceMeshExpectedBinding,type ValidatedEnvironmentHardSurfaceMesh,type DecodedEnvironmentHardSurfaceMesh} from './environment-hard-surface-mesh';
import type {PreparedSolarBoundary} from './solar-shadow-admission';

export type RegionalAsset=import('./environment-ground-regional.mjs').Asset;
export type VerifiedRegionalJSON=Readonly<{value:unknown;identity:RegionalAsset}>;
export type RegionalJSONRead=(asset:RegionalAsset,signal:AbortSignal,max:number,admission:ResourceByteAcquireOptions)=>Promise<VerifiedRegionalJSON>;
export type ProductVerifiedAssetRead=(asset:RegionalAsset,signal:AbortSignal,max:number,admission:ResourceByteAcquireOptions)=>Promise<unknown>;
const FIELDS=['path','sha256','bytes','compression','uncompressed_bytes','uncompressed_sha256'] as const;
const MIB=1024**2,SHA=/^[a-f0-9]{64}$/;
function checkedAsset(asset:RegionalAsset):RegionalAsset{
 if(!asset||!/^\/safety\/environment\/[a-z-]+\/[A-Za-z0-9_.-]+$/.test(asset.path)||['.','..'].includes(asset.path.split('/').at(-1)??'')||!SHA.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>MIB||
  (asset.compression!==undefined&&asset.compression!=='gzip')||
  (asset.compression==='gzip'?(!Number.isSafeInteger(asset.uncompressed_bytes)||asset.uncompressed_bytes!<1||asset.uncompressed_bytes!>MIB||!SHA.test(asset.uncompressed_sha256??'')):
    asset.uncompressed_bytes!==undefined||asset.uncompressed_sha256!==undefined))throw Error('Invalid regional source asset');
 return Object.freeze(Object.fromEntries(FIELDS.filter(k=>asset[k]!==undefined).map(k=>[k,asset[k]]))) as RegionalAsset;
}
function sameAsset(a:RegionalAsset,b:RegionalAsset){return FIELDS.every(k=>a[k]===b[k]);}

/** Adapt only the product readAsset descriptor contract. That implementation
 * verifies actual physical size/SHA and bounded decompression/raw SHA before
 * returning parsed JSON (painted/city/safety/three-dimensional-map.ts).
 * This receipt is issued only after that verified read succeeds, never before
 * the read or for a bare path. It must not wrap a generic unchecked JSON fetch.
 */
export function hardSurfaceReadFromVerifiedProduct(read:ProductVerifiedAssetRead):RegionalJSONRead{
 return async(asset,signal,max,admission)=>{
  const identity=checkedAsset(asset);signal.throwIfAborted();
  const value=await read(identity,signal,Math.min(max,identity.bytes),admission);
  signal.throwIfAborted();return Object.freeze({value,identity});
 };
}

type MetadataValue={value:unknown;identity:RegionalAsset};
type EncodedValue={mesh:ValidatedEnvironmentHardSurfaceMesh;identity:RegionalAsset};
export type HardSurfaceDecodedValue=Readonly<{mesh:DecodedEnvironmentHardSurfaceMesh;identity:RegionalAsset;binding:Readonly<{city:string;sourceSHA256:string;boundarySHA256:string;snapshot:string}>}>;
export type RegionalSourceBorrow<T>=Readonly<{value:T;release:()=>void;transferOwnership:()=>void}>;
export type HardSurfaceChunkRequest=Readonly<{asset:RegionalAsset;expected:HardSurfaceMeshExpectedBinding;sourceFeatureIds:readonly string[];vertices:number;indexCount:number}>;

/** Source/read/decode ownership for the existing page store. An iterator keeps
 * metadata borrows only until its next()/return() ACK. A coverage target owns
 * a decoded borrow after accepting it and releases it only after GPU retirement.
 * No independent cache, read queue, timer, renderer or publication lives here.
 */
export function createHardSurfaceDisplaySource(options:{store:ChunkResourceStore;readVerifiedJSON:RegionalJSONRead;boundary?:PreparedSolarBoundary}){
 const {store,readVerifiedJSON,boundary}=options,envelopes=createEnvironmentReadEnvelopes();
 const live=new Set<ChunkResourceLease<unknown>>();let destroyed=false,metadataReads=0,meshReads=0,decodes=0,transferred=0;
 const active=()=>{if(destroyed)throw new DOMException('Hard surface display source destroyed','AbortError');};
 function failAdjustment(context:ChunkProductionContext,label:string):never{const pressure=context.budget.stats.lastPressure;throw pressure?new ResourceBudgetExceededError(pressure):Error(label+' no longer fits the page resource budget');}
 async function read(asset:RegionalAsset,context:ChunkProductionContext,keep:readonly ResourceBudgetCost[],envelope:ReturnType<typeof envelopes.mint>){
  try{
   const result=await readVerifiedJSON(asset,context.signal,asset.bytes,{admitted:context,envelope,keep});
   context.signal.throwIfAborted();
   if(!result||!sameAsset(asset,result.identity))throw Error('Regional reader returned another actual asset identity');
   envelopes.delivered(asset.path);return result;
  }catch(error){
   if(context.signal.aborted)throw error;
   const failed=envelopes.failure(asset.path,'hard surface display source read',error);
   throw failed.retry?error:failed.error;
  }
 }
 function tracked<T>(lease:ChunkResourceLease<T>):ChunkResourceLease<T>{live.add(lease as ChunkResourceLease<unknown>);return lease;}
 async function borrow<T>(lease:ChunkResourceLease<T>,signal:AbortSignal):Promise<RegionalSourceBorrow<T>>{
  let owned=true,moved=false;
  const release=()=>{if(!owned)return;owned=false;if(moved)transferred--;live.delete(lease as ChunkResourceLease<unknown>);lease.release();};
  // A target that accepted this payload must retain its claim through the GPU
  // fence even when the manager/source is destroyed. Move, never clone, that
  // cleanup responsibility; the target's release callback remains idempotent.
  const transferOwnership=()=>{if(!owned||lease.released)throw Error('Regional source was already released');if(!moved){moved=true;transferred++;live.delete(lease as ChunkResourceLease<unknown>);}};
  try{await waitForEnvironmentLease(lease,signal);active();signal.throwIfAborted();const value=lease.value;if(value===undefined)throw new DOMException('Regional source lease released','AbortError');return Object.freeze({value,release,transferOwnership});}
  catch(error){release();throw error;}
 }
 function metadataCosts(value:MetadataValue){return [environmentDecodedCost(environmentRetainedEstimate(value),value,'hard surface display metadata','metadata')];}
 async function metadata(input:RegionalAsset,signal:AbortSignal){
  active();const asset=checkedAsset(input),keep=environmentJsonReadCosts(asset,'hard surface display metadata'),envelope=envelopes.mint(asset.path,asset.bytes);
  const lease=tracked(store.acquire<MetadataValue>({contentKey:JSON.stringify(['environment-hard-surface-metadata-v1',asset]),role:'source',allowRecent:false,cacheRetention:'reupload',estimate:[...keep,...envelope],produce:async context=>{
   const result=await read(asset,context,keep,envelope),value={value:result.value,identity:result.identity};
   if(!context.adjust(metadataCosts(value)))failAdjustment(context,'Regional metadata');metadataReads++;return value;
  },costs:metadataCosts}));
  const held=await borrow(lease,signal);return Object.freeze({...held.value,release:held.release});
 }
 function encodedCosts(value:EncodedValue){return [environmentDecodedCost(environmentHardSurfaceMeshEncodedRetainedBytes(value.identity.uncompressed_bytes??value.identity.bytes),value,'hard surface display encoded source')];}
 function decodedCosts(value:HardSurfaceDecodedValue):ResourceBudgetCost[]{
  return [{category:'packed',bytes:value.mesh.positions.buffer.byteLength,precision:'exact',identity:value.mesh.positions.buffer,label:'hard surface display decoded vertex source'},
   {category:'packed',bytes:value.mesh.indices.buffer.byteLength,precision:'exact',identity:value.mesh.indices.buffer,label:'hard surface display decoded index source'},
   environmentDecodedCost(environmentRetainedEstimate({ids:value.mesh.sourceFeatureIds,origin:value.mesh.origin,binding:value.binding,identity:value.identity}),value,'hard surface display decoded source identity','metadata')];
 }
 function meshLease(request:HardSurfaceChunkRequest,decoded:boolean){
  active();const asset=checkedAsset(request.asset),input=request.expected;
  if(!input||typeof input.city!=='string'||!asset.path.startsWith('/safety/environment/'+input.city+'/')||
   !Array.isArray(input.canonicalNativeTiles)||!input.canonicalNativeTiles.length||input.canonicalNativeTiles.length>32||
   !Array.isArray(request.sourceFeatureIds)||request.sourceFeatureIds.length!==1||input.sourceFeatureCount!==1||request.sourceFeatureIds[0]!==input.sourceID||
   !Number.isSafeInteger(request.vertices)||request.vertices<3||request.vertices>20000||!Number.isSafeInteger(request.indexCount)||request.indexCount<3||request.indexCount>60000||request.indexCount%3)throw Error('Hard surface source city/ID/count contract differs');
  // Capture the complete expected contract before an async read or a shared
  // store lookup. A caller cannot mutate validation fields after choosing a key.
  const e=Object.freeze({...input,canonicalNativeTiles:Object.freeze(input.canonicalNativeTiles.map(t=>Object.freeze({...t})))});
  const ids=Object.freeze([...request.sourceFeatureIds]),vertices=request.vertices,indexCount=request.indexCount;
  if(decoded&&(!boundary||boundary.boundarySHA256!==e.boundarySHA256))throw Error('Regional streamed decode requires the verified municipal boundary');
  const keep=environmentJsonReadCosts(asset,'hard surface display mesh source'),envelope=envelopes.mint(asset.path,asset.bytes);
  // Reserve the declared complete decoder working set BEFORE the physical read.
  // The actual mesh must match those metadata counts before decode; work never gets
  // ahead of its page claim. This does not raise the 20k/60k geometry limits.
  const decodeIdentity={},decodeBound:ResourceBudgetCost={category:'construction',bytes:decoded?4*(vertices*16+12+indexCount*4):0,precision:'estimate',identity:decodeIdentity,label:'hard surface display source decode working set'};
  const costs=decoded?[...keep,decodeBound]:keep;
  // Store entries are shared while leased. Every field checked by the mesh
  // inspector must therefore participate in the key; otherwise a concurrent
  // request with another source/geometry/surface expectation can reuse a value
  // validated for the first request without invoking the inspector at all.
  return tracked(store.acquire<EncodedValue|HardSurfaceDecodedValue>({contentKey:JSON.stringify(['environment-hard-surface-mesh-source-v2',decoded?'decoded':'encoded',asset,e.city,e.sourceSHA256,e.boundarySHA256,e.snapshot,e.canonicalNativeTiles,e.sourceFeatureCount,e.sourceID,e.sourceFeatureSHA256,e.geometrySHA256,e.surface,ids,vertices,indexCount]),role:'source',allowRecent:false,cacheRetention:'reupload',estimate:[...costs,...envelope],produce:async context=>{
   const result=await read(asset,context,costs,envelope);
   const mesh=inspectEnvironmentHardSurfaceMesh(result.value,e);
   // Cohort metadata declares the canonical upper bound. The verified packed
   // proof may remove identical vertices/triangles without changing attributes.
   // Check that exact canonical binding before shrinking the prepaid decoder
   // claim to the actual storage size; never treat packed counts as the bound.
   if(mesh.data.proof.canonical_vertices!==vertices||mesh.data.proof.canonical_indices!==indexCount||mesh.vertexCount>vertices||mesh.indexCount>indexCount)throw Error('Regional mesh differs from admitted cohort geometry counts');
   if(mesh.sourceFeatureIds.length!==ids.length||mesh.sourceFeatureIds.some((id,i)=>id!==ids[i]))throw Error('Regional mesh differs from the complete cohort source IDs');
   const encodedValue={mesh,identity:result.identity},retained=encodedCosts(encodedValue);
   if(!decoded){if(!context.adjust(retained))failAdjustment(context,'Regional encoded source');meshReads++;return encodedValue;}
   const bound=environmentHardSurfaceMeshPublicationBound(mesh);
   const preciseDecode={...decodeBound,bytes:bound.constructionBytes};
   if(!context.adjust([...retained,preciseDecode]))failAdjustment(context,'Regional decode construction');
   context.signal.throwIfAborted();const geometry=decodeEnvironmentHardSurfaceMesh(mesh);decodes++;
   context.signal.throwIfAborted();
   if(!validateHardSurfaceMeshBoundary(geometry,boundary!))throw Error('Regional decoded triangles leave the verified municipal boundary');
   const value:HardSurfaceDecodedValue=Object.freeze({mesh:geometry,identity:result.identity,binding:Object.freeze({city:mesh.city,sourceSHA256:mesh.sourceSHA256,boundarySHA256:mesh.boundarySHA256,snapshot:mesh.snapshot})});
   if(!context.adjust(decodedCosts(value)))failAdjustment(context,'Regional decoded source');meshReads++;return value;
  },costs:value=>'binding'in value?decodedCosts(value):encodedCosts(value)}));
 }
 return {metadata,
  async encoded(request:HardSurfaceChunkRequest,signal:AbortSignal){return borrow(meshLease(request,false) as ChunkResourceLease<EncodedValue>,signal);},
  async decoded(request:HardSurfaceChunkRequest,signal:AbortSignal){return borrow(meshLease(request,true) as ChunkResourceLease<HardSurfaceDecodedValue>,signal);},
  get stats(){return {metadataReads,meshReads,decodes,liveBorrows:live.size,transferredBorrows:transferred,decodedIdleTierMs:17000,physicalMemory:'unmeasured' as const};},
  destroy(){if(destroyed)return;destroyed=true;for(const lease of live)lease.release();live.clear();}
 };
}
