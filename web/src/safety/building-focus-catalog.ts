import type {BuildingDetailAsset,BuildingDetailComponent} from './building-detail-demand';
import type {ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {ResourceBytesLease} from './resource-byte-transport';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';
import {inflateBounded3DGzip} from './bounded-3d-gzip';
/** Index partition that lists a canonical leaf; null for a flat manifest. */
export type BuildingFocusPartitionLocator=string|null;
export type BuildingFocusLeafDocument={
 schema:'crimemaps-building-focus-leaf-v2';schemaVersion:2;city:string;canonicalIndexSHA256:string;
 leaf:{key:string;id:string;sha256:string;partition:BuildingFocusPartitionLocator};components:readonly Pick<BuildingDetailComponent,'objectId'|'partId'|'origin'|'box'>[];
 sourceObjectDependencies:readonly {objectId:string;leafKeys:readonly string[]}[];
 /** Exactly one locator for every member of every dependency row above. */
 dependencyLocators:readonly {key:string;partition:BuildingFocusPartitionLocator}[];
 requiresRuntimeOwnerCohorts:true;
};
const sha=/^[a-f0-9]{64}$/,partitionId=/^[A-Za-z0-9_.:\/-]{1,256}$/;
const requireValue=(ok:unknown,label:string):void=>{if(!ok)throw Error('Invalid building focus '+label);};
const validPartition=(value:unknown)=>value===null||typeof value==='string'&&partitionId.test(value);
/** The providers' own rule for a 3D asset read (their bounded fetch): a network
 * failure surfaces as a TypeError and is tried once more; a resource-contract
 * violation is also a TypeError and never is. */
const transientReadFailure=(error:unknown)=>error instanceof Error&&error.name==='TypeError'&&(error as {code?:unknown}).code!=='RESOURCE_CONTRACT_VIOLATION'&&!/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(error.message);
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(x=>x.toString(16).padStart(2,'0')).join('');
/** The existing page store owns every parsed value. This resolver keeps only
 * source identity/descriptors, not fulfilled payload promises or decoded maps. */
export function createBuildingFocusIndexResolver(options:{city:string;canonicalIndexSHA256:string;root:BuildingDetailAsset;resourceStore:ChunkResourceStore;acquireBytes(path:string,signal:AbortSignal,max:number):Promise<ResourceBytesLease>;
 /** Called after a document was read and parsed: the transport may drop the
  * raw bytes it would otherwise keep idle in the page's recent cache. */
 discardBytes?(path:string):void}){
 requireValue(/^[a-z][a-z-]+$/.test(options.city)&&sha.test(options.canonicalIndexSHA256),'source identity');
 const prefix=`/safety/buildings3d/focus/${options.city}/${options.canonicalIndexSHA256}/`;
 /** Plain JSON for the root and lookup pages; a leaf document may be physical
  * gzip with an independent uncompressed size/SHA, both within `cap`. */
 function descriptor(asset:BuildingDetailAsset,cap:number,gzip=false){
  const plain=asset?.compression===undefined;
  requireValue(asset&&typeof asset.path==='string'&&asset.path.startsWith(prefix)&&sha.test(asset.sha256)&&Number.isSafeInteger(asset.bytes)&&asset.bytes>0&&asset.bytes<=cap&&
   (plain?asset.path===prefix+asset.sha256+'.json'&&asset.uncompressed_bytes===undefined&&asset.uncompressed_sha256===undefined:
    gzip&&asset.compression==='gzip'&&asset.path===prefix+asset.sha256+'.json.gz'&&Number.isSafeInteger(asset.uncompressed_bytes)&&asset.uncompressed_bytes!>0&&asset.uncompressed_bytes!<=cap&&sha.test(asset.uncompressed_sha256??'')),'asset binding');
 }
 function context(value:any,kind:string){requireValue(value&&value.schema===`crimemaps-building-focus-${kind}-v2`&&value.schemaVersion===2&&value.city===options.city&&value.canonicalIndexSHA256===options.canonicalIndexSHA256,'document context');}
 /** Focus metadata never enters the page's shared recent cache (allowRecent
  * false): one plan reads about two documents per candidate leaf, which would
  * push idle geometry (the exit-grace cache) and other layers out of that
  * count-bounded cache on every plan. A document lives exactly as long as a
  * lease holds it. A `retain` lease is not bound to the request signal: the
  * caller releases it explicitly, so the planning manager can keep the
  * current view's leaf documents between plans instead of re-reading them. */
 async function acquire<T>(asset:BuildingDetailAsset,cap:number,kind:string,signal:AbortSignal,parse:(v:any)=>T,retain=false):Promise<ChunkResourceLease<T>>{
  descriptor(asset,cap,kind==='leaf');signal.throwIfAborted();
  const lease=options.resourceStore.acquire<T>({contentKey:JSON.stringify(['building-focus-metadata-v2',options.city,options.canonicalIndexSHA256,kind,asset.sha256]),role:'source',allowRecent:false,cacheRetention:'refetch',signal:retain?undefined:signal,
   estimate:{category:'metadata',bytes:(asset.uncompressed_bytes??asset.bytes)*40,precision:'estimate'},
   async produce(ctx){let bytes:ResourceBytesLease|undefined;try{
    // One plan reads a document or two per candidate leaf before any geometry,
    // and a single failed read fails the whole plan (3D entry falls back to 2D):
    // a dropped connection gets the same second attempt a geometry read gets.
    for(let attempt=0;;attempt++){
     try{bytes=await options.acquireBytes(asset.path,ctx.signal,asset.bytes);break;}
     catch(error){if(ctx.signal.aborted||attempt===1||!transientReadFailure(error))throw error;}
    }
    ctx.signal.throwIfAborted();
    requireValue(bytes.bytes.byteLength===asset.bytes&&await digest(bytes.bytes)===asset.sha256,'asset bytes/hash');ctx.signal.throwIfAborted();
    // The inflated copy is bounded by the declared size and bound by its own SHA.
    const raw=asset.compression==='gzip'?await inflateBounded3DGzip(bytes.bytes,asset.uncompressed_bytes!,ctx.signal,asset.uncompressed_sha256,cap):bytes.bytes;ctx.signal.throwIfAborted();
    const value=parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));
    const cost=estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes;
    if(!ctx.adjust({category:'metadata',bytes:cost,precision:'estimate',identity:value as object}))throw ctx.budget.stats.lastPressure?new ResourceBudgetExceededError(ctx.budget.stats.lastPressure):Error('Focus metadata budget exceeded');
    return value;
    // Success, failure or cancellation: the raw bytes take no idle cache slot.
   }finally{if(bytes){bytes.release();options.discardBytes?.(asset.path);}}},
  });
  try{
   // A retained lease does not end with the request, so the wait must.
   if(retain)await new Promise<void>((resolve,reject)=>{const stop=()=>reject(signal.reason??new DOMException('Aborted','AbortError'));signal.addEventListener('abort',stop,{once:true});void lease.ready.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));});
   else await lease.ready;
   signal.throwIfAborted();if(lease.value===undefined)throw Error('Focus metadata released before read');return lease;
  }
  catch(error){lease.release();throw error;}
 }
 descriptor(options.root,100000);
 /** Verified source descriptors only, never a payload: the catalog's page
  * list and the asset of every leaf listed by a page this resolver has read.
  * A re-plan then needs no root or page read for a known leaf. Each row was
  * validated when its page was parsed and its bytes are still SHA-checked on
  * every read. Bounded; a dropped row is simply looked up again. */
 const ASSET_MEMO=4096,assets=new Map<string,BuildingDetailAsset>();let pages:ReadonlyMap<string,BuildingDetailAsset>|undefined;
 const own=(asset:BuildingDetailAsset):BuildingDetailAsset=>Object.freeze(asset.compression===undefined?{path:asset.path,sha256:asset.sha256,bytes:asset.bytes}:{path:asset.path,sha256:asset.sha256,bytes:asset.bytes,compression:asset.compression,uncompressed_bytes:asset.uncompressed_bytes,uncompressed_sha256:asset.uncompressed_sha256});
 const identity=(leaf:{id:string;sha256:string})=>JSON.stringify([leaf.id,leaf.sha256]);
 return{get knownLeafDescriptors(){return assets.size;},
  async acquireLeaf(leaf:{id:string;sha256:string},signal:AbortSignal,settings?:{retain?:boolean}):Promise<ChunkResourceLease<BuildingFocusLeafDocument>>{
  requireValue(typeof leaf.id==='string'&&leaf.id.length>0&&leaf.id.length<=512&&sha.test(leaf.sha256),'requested leaf');
  let asset=assets.get(identity(leaf));
  if(!asset){
   const bucket=(await digest(new TextEncoder().encode(JSON.stringify([options.canonicalIndexSHA256,leaf.sha256,leaf.id])))).slice(0,2);signal.throwIfAborted();
   if(!pages){
    const root=await acquire(options.root,100000,'catalog',signal,value=>{
     context(value,'catalog');requireValue(value.requiresRuntimeOwnerCohorts===true&&Number.isSafeInteger(value.leafCount)&&value.leafCount>0&&Array.isArray(value.pages)&&value.pages.length>0&&value.pages.length<=Math.min(256,value.leafCount),'catalog');
     const prefixes=new Set();for(const p of value.pages){requireValue(/^[a-f0-9]{2}$/.test(p.prefix)&&!prefixes.has(p.prefix),'catalog prefix');prefixes.add(p.prefix);descriptor(p.asset,100000);}return value as {pages:{prefix:string;asset:BuildingDetailAsset}[]};
    });
    try{pages=new Map(root.value!.pages.map(p=>[p.prefix,own(p.asset)]));}finally{root.release();}
   }
   const pageAsset=pages.get(bucket);requireValue(pageAsset,'missing source page');
   const page=await acquire(pageAsset!,100000,'page',signal,value=>{context(value,'page');requireValue(Array.isArray(value.entries)&&value.entries.length>0,'page entries');const ids=new Set();for(const entry of value.entries){requireValue(typeof entry.id==='string'&&entry.id.length>0&&entry.id.length<=512&&sha.test(entry.sha256)&&!ids.has(entry.id),'page identity');ids.add(entry.id);descriptor(entry.asset,500000,true);}return value as {entries:{id:string;sha256:string;asset:BuildingDetailAsset}[]};});
   try{
    for(const entry of page.value!.entries){const id=identity(entry);if(assets.has(id))continue;if(assets.size>=ASSET_MEMO)assets.delete(assets.keys().next().value!);assets.set(id,own(entry.asset));}
    asset=assets.get(identity(leaf));requireValue(asset,'missing source leaf');
   }finally{page.release();}
  }
  const result=await acquire(asset!,500000,'leaf',signal,value=>{
   context(value,'leaf');requireValue(value.requiresRuntimeOwnerCohorts===true&&value.leaf&&value.leaf.key===JSON.stringify([value.leaf.id,value.leaf.sha256])&&typeof value.leaf.id==='string'&&sha.test(value.leaf.sha256)&&validPartition(value.leaf.partition)&&Array.isArray(value.components)&&value.components.length>0&&value.components.length<=20000,'leaf');
   const parts=new Set();for(const c of value.components){const key=JSON.stringify([c.objectId,c.partId]);requireValue(/^osm\/(node|way|relation)\/[1-9]\d*$/.test(c.objectId)&&typeof c.partId==='string'&&c.partId.length>0&&!parts.has(key),'component identity');parts.add(key);requireValue(Array.isArray(c.origin)&&c.origin.length===2&&c.origin.every(Number.isFinite)&&Math.abs(c.origin[0])<=180&&Math.abs(c.origin[1])<90&&Array.isArray(c.box)&&c.box.length===6&&c.box.every(Number.isFinite)&&c.box.slice(0,3).every((n:number,i:number)=>n<=c.box[i+3]),'component bounds');}
   requireValue(Array.isArray(value.sourceObjectDependencies)&&Array.isArray(value.dependencyLocators),'source dependencies');
   const objects=new Set(value.components.map((c:BuildingFocusLeafDocument['components'][number])=>c.objectId)),groups=new Set<string>(),referenced=new Set<string>();
   for(const group of value.sourceObjectDependencies){
    // One object may recur in separate LOD families: (objectId, members) is the row identity.
    const identity=JSON.stringify([group.objectId,group.leafKeys]);
    requireValue(objects.has(group.objectId)&&!groups.has(identity)&&Array.isArray(group.leafKeys)&&group.leafKeys.length>1&&group.leafKeys.includes(value.leaf.key),'source dependency membership');groups.add(identity);
    const members=new Set<string>(),memberIds=new Set<string>();
    for(const key of group.leafKeys){
     requireValue(typeof key==='string'&&!members.has(key),'duplicate source dependency key');members.add(key);referenced.add(key);
     const binding=JSON.parse(key);requireValue(Array.isArray(binding)&&binding.length===2&&typeof binding[0]==='string'&&binding[0].length>0&&binding[0].length<=512&&!memberIds.has(binding[0])&&sha.test(binding[1])&&JSON.stringify(binding)===key,'source dependency key');memberIds.add(binding[0]);
    }
   }
   const located=new Set<string>();
   for(const row of value.dependencyLocators){
    requireValue(row&&typeof row.key==='string'&&referenced.has(row.key)&&!located.has(row.key)&&validPartition(row.partition)&&Object.keys(row).every(k=>k==='key'||k==='partition'),'dependency locator');located.add(row.key);
    if(row.key===value.leaf.key)requireValue(row.partition===value.leaf.partition,'self dependency locator');
   }
   requireValue(located.size===referenced.size,'incomplete dependency locators');
   return value as BuildingFocusLeafDocument;
  },settings?.retain===true);
  if(result.value!.leaf.id!==leaf.id||result.value!.leaf.sha256!==leaf.sha256){result.release();throw Error('Focus metadata selected leaf mismatch');}
  return result;
 }};
}
