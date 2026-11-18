import {validateBuildingDetailGroupMetadataAsset, type BuildingDetailAsset} from './building-detail-demand';
import type {BuildingDetailLease} from './building-detail-residency';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkResourceLease, ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBytesLease} from './resource-byte-transport';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';

type Entry = Readonly<{canonicalIndexSHA256:string;canonicalLeafSHA256:string;leafId:string;demandIndex:BuildingDetailAsset;groupMetadata?:BuildingDetailAsset}>;
export type BuildingDetailCatalog = Readonly<{schema:'crimemaps-building-detail-catalog-v1';schemaVersion:1;city:string;entries:readonly Entry[]}> |
 Readonly<{schema:'crimemaps-building-detail-catalog-v2';schemaVersion:2;city:string;entryCount:number;pages:readonly Readonly<{prefix:string;asset:BuildingDetailAsset}>[]}>;
export type BuildingDetailIndexLease = BuildingDetailLease<unknown> & {readonly groupMetadata?: BuildingDetailAsset};
export type BuildingDetailIndexResolver = ((indexSHA256:string,leaf:{id:string;sha256:string},signal:AbortSignal)=>Promise<unknown|undefined>) & {
 acquire?(indexSHA256:string,leaf:{id:string;sha256:string},signal:AbortSignal):Promise<BuildingDetailIndexLease|undefined>;
};
const SHA=/^[a-f0-9]{64}$/;
const key=(index:string,leaf:string,id:string)=>JSON.stringify([index,leaf,id]);
async function digest(bytes:Uint8Array) {
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>));
 return [...hash].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function descriptor(asset:BuildingDetailAsset,cap:number) {
 if(!asset||!/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+\.json$/.test(asset.path)||asset.path.slice(1).split('/').some(v=>!v||v==='.'||v==='..')||
  !SHA.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>cap||asset.compression!==undefined||asset.uncompressed_bytes!==undefined||asset.uncompressed_sha256!==undefined)
  throw Error('Invalid building detail metadata descriptor');
}
function entry(value:unknown):Entry {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid building detail catalogue entry');
 const v=value as Entry;
 if(!SHA.test(v.canonicalIndexSHA256)||!SHA.test(v.canonicalLeafSHA256)||typeof v.leafId!=='string'||!v.leafId||v.leafId.length>512)throw Error('Invalid building detail catalogue binding');
 descriptor(v.demandIndex,500000);if(v.groupMetadata)validateBuildingDetailGroupMetadataAsset(v.groupMetadata);
 return v;
}
function wrap<T>(value:ChunkResourceLease<T>):BuildingDetailLease<T> {
 let held:ChunkResourceLease<T>|undefined=value;
 return {get value(){const value=held?.value;if(value===undefined)throw Error('Detail metadata lease released');return value;},
  retain(role: import('./render-runtime/chunk-resource-types').ChunkResourceRole='dependency'){if(!held)throw Error('Detail metadata lease released');return wrap(held.retain(role));},
  release(){const old=held;held=undefined;old?.release();}};
}
async function wait<T>(lease:ChunkResourceLease<T>,signal:AbortSignal) {
 let abort=()=>{};
 try {
  await new Promise<void>((resolve,reject)=>{abort=()=>{lease.release();reject(signal.reason);};signal.addEventListener('abort',abort,{once:true});void lease.ready.then(resolve,reject);if(signal.aborted)abort();});
  signal.throwIfAborted();if(lease.value===undefined)throw Error('Detail metadata retired before acquisition');return wrap(lease);
 }catch(error){lease.release();throw error;}finally{signal.removeEventListener('abort',abort);}
}
/** Hash-selected catalogue pages and demand metadata share the page store.
 * The resolver has no second decoded Map/WeakMap or fulfilled payload promise. */
export function createBuildingDetailIndexResolver(options:{city:string;catalog:BuildingDetailCatalog|undefined;
 readBytes:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;resourceStore?:ChunkResourceStore;
 acquireBytes?:(path:string,signal:AbortSignal,max:number)=>Promise<ResourceBytesLease>;
}):BuildingDetailIndexResolver {
 const resources=options.resourceStore??getPageChunkResourceStore(),catalog=options.catalog;
 const entries=new Map<string,Entry>(),pages=new Map<string,BuildingDetailAsset>();
 if(catalog?.city===options.city) {
  if(catalog.schema==='crimemaps-building-detail-catalog-v1'&&catalog.schemaVersion===1)for(const value of catalog.entries){const v=entry(value),id=key(v.canonicalIndexSHA256,v.canonicalLeafSHA256,v.leafId);if(entries.has(id))throw Error('Duplicate detail catalogue binding');entries.set(id,v);}
  else if(catalog.schema==='crimemaps-building-detail-catalog-v2'&&catalog.schemaVersion===2){
   if(!Number.isSafeInteger(catalog.entryCount)||catalog.entryCount<0||!Array.isArray(catalog.pages)||catalog.pages.length>256)throw Error('Invalid detail catalogue root');
   for(const page of catalog.pages){if(!/^[a-f0-9]{2}$/.test(page.prefix)||pages.has(page.prefix))throw Error('Invalid detail catalogue prefix');descriptor(page.asset,100000);pages.set(page.prefix,page.asset);}
  }else throw Error('Invalid detail catalogue schema');
 }
 function acquireJSON(asset:BuildingDetailAsset,signal:AbortSignal,kind:string,cap:number) {
  descriptor(asset,cap);
  return wait(resources.acquire<unknown>({contentKey:JSON.stringify(['detail-metadata-v2',options.city,kind,asset.sha256,asset.bytes]),role:'source',allowRecent:true,cacheRetention:'refetch',
   estimate:[{category:'read',bytes:options.acquireBytes?0:asset.bytes,precision:'exact'},{category:'metadata',bytes:asset.bytes*40,precision:'estimate'}],
   async produce(context){let readLease:ResourceBytesLease|undefined;
    try{if(options.acquireBytes)readLease=await options.acquireBytes(asset.path,context.signal,asset.bytes);
     const bytes=readLease?.bytes??await options.readBytes(asset.path,context.signal,asset.bytes);context.signal.throwIfAborted();if(bytes.byteLength!==asset.bytes)throw Error('Detail metadata size mismatch');
     if(await digest(bytes)!==asset.sha256)throw Error('Detail metadata SHA256 mismatch');context.signal.throwIfAborted();
     if(!context.adjust([{category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer as object},{category:'metadata',bytes:asset.bytes*40,precision:'estimate'}]))throw context.budget.stats.lastPressure ? new ResourceBudgetExceededError(context.budget.stats.lastPressure) : Error('Detail metadata parse exceeds page budget');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;
    }finally{readLease?.release();}},
   costs:value=>({category:'metadata',bytes:estimateRetainedBuildingPayload(value).estimatedJsContainerBytes,precision:'estimate',identity:value as object}),
  }),signal);
 }
 async function acquire(indexSHA256:string,leaf:{id:string;sha256:string},signal:AbortSignal):Promise<BuildingDetailIndexLease|undefined> {
  signal.throwIfAborted();if(!SHA.test(indexSHA256)||!SHA.test(leaf.sha256))throw Error('Invalid detail catalogue lookup');
  const id=key(indexSHA256,leaf.sha256,leaf.id);let found=entries.get(id);
  if(pages.size){
   const prefix=(await digest(new TextEncoder().encode(id))).slice(0,2);signal.throwIfAborted();const asset=pages.get(prefix);if(!asset)return;
   const page=await acquireJSON(asset,signal,'catalogue-page',100000);
   try {
    const raw=page.value as {schema?:unknown;schemaVersion?:unknown;city?:unknown;prefix?:unknown;entries?:unknown};
    if(!raw||raw.schema!=='crimemaps-building-detail-catalog-page-v1'||raw.schemaVersion!==1||raw.city!==options.city||raw.prefix!==prefix||!Array.isArray(raw.entries))throw Error('Invalid detail catalogue page');
    const seen=new Set<string>();for(const value of raw.entries){const v=entry(value),candidate=key(v.canonicalIndexSHA256,v.canonicalLeafSHA256,v.leafId);if(seen.has(candidate))throw Error('Duplicate detail catalogue page entry');seen.add(candidate);if(candidate===id)found=v;}
   }finally{page.release();}
  }
  if(!found)return;
  const groupMetadata = found.groupMetadata;
  const demand = await acquireJSON(found.demandIndex,signal,'demand',500000);
  const bind = (lease:BuildingDetailLease<unknown>):BuildingDetailIndexLease => ({
   get value(){return lease.value;},groupMetadata,
   retain(role){if(!lease.retain)throw Error('Detail metadata cannot retain');return bind(lease.retain(role));},
   release(){lease.release();},
  });
  return bind(demand);
 }
 const resolve:BuildingDetailIndexResolver=async(index,leaf,signal)=>{
  const lease=await acquire(index,leaf,signal);if(!lease)return;
  // Compatibility callers bind their metadata borrow to the current request.
  const release=()=>{signal.removeEventListener('abort',release);lease.release();};
  signal.addEventListener('abort',release,{once:true});if(signal.aborted){release();signal.throwIfAborted();}return lease.value;
 };
 resolve.acquire=acquire;return resolve;
}
