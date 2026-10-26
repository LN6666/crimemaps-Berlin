import {normalizeBuildingShard} from './building-mesh-codec';
import {decodeBounded3DAssetJSON,type ThreeDCompressionDescriptor} from './bounded-3d-gzip';
import type {BuildingComponent} from './building-mesh-renderer';

export type NativeSourceDescriptor=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
type SourceValue={schema_version:1;city:string;components:BuildingComponent[];decodedPayloadCost:ReturnType<typeof normalizeBuildingShard>['decodedPayloadCost']};
type ShadowHeader={shadow_profile?:unknown;shadow_admitted_component_indices?:unknown};
type NativeSourceValue={raw:SourceValue;verified:ShadowHeader;physicalBytes:number};
export type NativeSourceResult=NativeSourceValue&{release:()=>void};
export type NativeSourceClient={
 read:(asset:NativeSourceDescriptor,signal:AbortSignal,vertexCap:number)=>Promise<NativeSourceResult>;
 setCached:(rows:readonly(readonly BuildingComponent[])[])=>void;
 destroy:()=>void;
};
type Entry={key:string;id:number;asset:NativeSourceDescriptor;city:string;vertexCap:number;controller:AbortController;holders:Set<object>;ready:Promise<void>;resolve:()=>void;reject:(error:unknown)=>void;value?:NativeSourceValue};
const aborted=()=>new DOMException('Aborted','AbortError');
const sha=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(n=>n.toString(16).padStart(2,'0')).join('');

/** Source-preserving builders share only geometry and mesh arrays. Component,
 * batch, origin, colour and metadata containers remain provider-private. */
function providerView(value:NativeSourceValue):NativeSourceValue{
 const components=value.raw.components.map(c=>{
  const {origin,componentGeometry,sourceFeature,batches,displayEstimates,...metadata}=c;
  const {geometry,properties,...featureMetadata}=sourceFeature;
  return {...c,...structuredClone(metadata),origin:[...origin] as [number,number],componentGeometry,
   sourceFeature:{...sourceFeature,...structuredClone(featureMetadata),geometry,properties:structuredClone(properties)},
   batches:batches.map(b=>({...b,color:b.color.slice()})),
   ...(displayEstimates===undefined?{}:{displayEstimates:structuredClone(displayEstimates)})} as BuildingComponent;
 });
 return{physicalBytes:value.physicalBytes,verified:structuredClone(value.verified),raw:{...value.raw,components}};
}

/** One page-owned verified ingress. Strong canonical sharing lasts only while
 * a full-leaf read or an existing provider full-leaf cache needs that leaf.
 * Renderers and preparations retain their actual component arrays naturally;
 * a single visible component never pins the leaf's unused neighbours here.
 * There is no idle LRU, and eviction may require a later verified re-decode.
 * The ingress slot ends before owner/material initialization begins. */
export function createSharedNativeSourcePool(options:{read:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>}){
 const entries=new Map<string,Entry>(),queue:Entry[]=[];
 // Scalar bindings cannot keep an evicted Entry, its Promise or its leaf alive.
 const views=new WeakMap<readonly BuildingComponent[],{key:string;id:number}>();
 const clients=new Set<NativeSourceClient>();let active=0,peak=0,reads=0,decodes=0,hits=0,transportAttempts=0,nextID=0,destroyed=false;
 function release(entry:Entry,token:object){
  entry.holders.delete(token);if(entry.holders.size)return;
  if(entries.get(entry.key)===entry)entries.delete(entry.key);
  entry.value=undefined;entry.controller.abort();entry.reject(aborted());
 }
 function pump(){
  if(destroyed||active)return;
  let entry:Entry|undefined;
  while((entry=queue.shift())){if(!entry.controller.signal.aborted&&entry.holders.size)break;entry.reject(aborted());}
  if(!entry)return;
  const current=entry;active++;peak=Math.max(peak,active);
  void(async()=>{
   const signal=current.controller.signal,a=current.asset;reads++;
   let bytes!:Uint8Array;for(let attempt=0;attempt<2;attempt++){try{transportAttempts++;bytes=await options.read(a.path,signal,1024**2);break;}catch(error){if(signal.aborted)throw error;if(!(error instanceof TypeError)||attempt===1)throw new Error('3D asset '+a.path+': '+String(error));}}signal.throwIfAborted();
   if(bytes.byteLength!==a.bytes||await sha(bytes)!==a.sha256)throw Error('Shared native source hash/size mismatch');signal.throwIfAborted();
   const parsed=await decodeBounded3DAssetJSON(bytes,a,signal);
   const normalized=normalizeBuildingShard(parsed,current.city,current.vertexCap,current.vertexCap);signal.throwIfAborted();decodes++;
   const header=parsed as ShadowHeader;
   // Drop the redundant parsed top-level representation before downstream awaits;
   // required source geometry/properties intentionally remain in components.
   const value:NativeSourceValue={physicalBytes:bytes.byteLength,verified:{shadow_profile:structuredClone(header.shadow_profile),shadow_admitted_component_indices:structuredClone(header.shadow_admitted_component_indices)},raw:{schema_version:1,city:normalized.city,components:normalized.components,decodedPayloadCost:normalized.decodedPayloadCost}};
   if(destroyed||!current.holders.size)throw aborted();current.value=value;current.resolve();
  })().catch(error=>{if(entries.get(current.key)===current)entries.delete(current.key);current.value=undefined;current.reject(error);}).finally(()=>{active--;pump();});
 }
 function obtain(city:string,asset:NativeSourceDescriptor,vertexCap:number){
  if(destroyed)throw aborted();
  if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>1024**2||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(vertexCap)||vertexCap<1||vertexCap>200000)throw Error('Invalid shared native source descriptor');
  const key=JSON.stringify([city,'native-codec-v1',asset.sha256,asset.bytes,asset.compression??null,asset.uncompressed_sha256??null,asset.uncompressed_bytes??null,vertexCap]);
  const existing=entries.get(key);if(existing&&!existing.controller.signal.aborted){hits++;return existing;}
  let resolve!:Entry['resolve'],reject!:Entry['reject'];const ready=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});void ready.catch(()=>{});
  const entry:Entry={key,id:++nextID,asset,city,vertexCap,controller:new AbortController(),holders:new Set(),ready,resolve,reject};entries.set(key,entry);queue.push(entry);return entry;
 }
 function client(city:string,resolvePath:(path:string)=>string=(path=>path)):NativeSourceClient{
  const readers=new Set<()=>void>(),cacheToken={};let cached=new Set<Entry>(),closed=false;
  function setCached(rows:readonly(readonly BuildingComponent[])[]){
   if(closed)return;const next=new Set<Entry>();for(const row of rows){const binding=views.get(row),entry=binding?entries.get(binding.key):undefined;if(entry&&entry.id===binding!.id)next.add(entry);}
   for(const entry of next)if(!cached.has(entry))entry.holders.add(cacheToken);
   for(const entry of cached)if(!next.has(entry))release(entry,cacheToken);cached=next;
  }
  const result:NativeSourceClient={
   async read(asset,signal,vertexCap){
    signal.throwIfAborted();if(closed)throw aborted();const entry=obtain(city,{...asset,path:resolvePath(asset.path)},vertexCap),token={};entry.holders.add(token);
    let released=false;const cancelled=()=>relinquish();const relinquish=()=>{if(released)return;released=true;signal.removeEventListener('abort',cancelled);readers.delete(relinquish);release(entry,token);};readers.add(relinquish);signal.addEventListener('abort',cancelled,{once:true});if(signal.aborted)relinquish();pump();
    try{
     await new Promise<void>((resolve,reject)=>{const cancel=()=>{cleanup();reject(aborted());},cleanup=()=>signal.removeEventListener('abort',cancel);signal.addEventListener('abort',cancel,{once:true});entry.ready.then(()=>{cleanup();signal.aborted?reject(aborted()):resolve();},error=>{cleanup();reject(error);});if(signal.aborted)cancel();});
     signal.throwIfAborted();if(closed||!entry.value)throw aborted();const view=providerView(entry.value);views.set(view.raw.components,{key:entry.key,id:entry.id});return{...view,release:relinquish};
    }catch(error){relinquish();throw error;}
   },
   setCached,
   destroy(){if(closed)return;setCached([]);closed=true;for(const relinquish of [...readers])relinquish();clients.delete(result);}
  };clients.add(result);return result;
 }
 return{client,get stats(){const buffers=new Set<ArrayBufferLike>();let retained=0,holders=0;for(const e of entries.values()){holders+=e.holders.size;if(e.value){retained+=e.value.raw.decodedPayloadCost.retainedPayloadEstimateBytes;for(const c of e.value.raw.components)for(const b of c.batches)for(const a of [b.positions,b.normals,b.indices])if(ArrayBuffer.isView(a))buffers.add(a.buffer);}}return{entries:entries.size,holders,active,peakConcurrency:peak,queued:queue.filter(e=>!e.controller.signal.aborted).length,reads,decodes,hits,transportAttempts,uniqueTypedBufferBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0),uniqueSourcePayloadEstimateBytes:retained,providerPrivateMetadataExcluded:true,rendererStagingAndPreparedComponentsExcluded:true,measurement:'canonical-full-leaf-pool-only-not-whole-page-or-heap'};},destroy(){if(destroyed)return;destroyed=true;for(const c of [...clients])c.destroy();for(const e of queue.splice(0)){e.controller.abort();e.reject(aborted());}for(const e of entries.values()){e.value=undefined;e.controller.abort();e.reject(aborted());}entries.clear();}};
}
