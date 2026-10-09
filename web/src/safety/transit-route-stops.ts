import type {PublicTransitMode} from './public-transit-controls';
export type StopDescriptor={path:string;sha256:string;bytes:number};
export type TransitStop={stop_id:string;sequence:number;name:string|null;coordinates:[number,number]|null;city_scope:'in_city'|'out_of_city'|'uncertain';source_url?:string;source_member_refs?:unknown[]};
export type StopVariant={variant_id:string;direction:string|null;complete:boolean;source:{name:string;url:string;sha256:string;license_url?:string};reference_date:string;start_stop_id:string|null;end_stop_id:string|null;stops:TransitStop[];coverage_note?:Record<'zh'|'en'|'de',string>;shape_ids?:string[]};
export type RouteStopRoster={schema_version:1;city:string;mode:PublicTransitMode;route_id:string;variants:StopVariant[]};
export const STOP_BYTE_LIMIT=1024*1024,STOP_LIMIT=2048;
const HASH=/^[a-f0-9]{64}$/;
const text=(v:unknown,max=400):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function stopURL(v:unknown):v is string {if(typeof v!=='string')return false;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function stopDescriptor(v:unknown):v is StopDescriptor {const d=v as StopDescriptor;return !!d&&typeof d.path==='string'&&d.path.length<=512&&/^\/safety\/transit\/[A-Za-z0-9_./-]+\.json$/.test(d.path)&&!d.path.split('/').some(x=>x==='.'||x==='..')&&HASH.test(d.sha256)&&Number.isInteger(d.bytes)&&d.bytes>0&&d.bytes<=STOP_BYTE_LIMIT;}
export function parseStopIndex(v:any,city:string,mode:PublicTransitMode):{schema_version:1;city:string;mode:PublicTransitMode;routes:({route_id:string}&StopDescriptor)[]}{
 if(!v||v.schema_version!==1||v.city!==city||v.mode!==mode||!Array.isArray(v.routes)||v.routes.length>8192)throw Error('Invalid stop index identity');
 const ids=new Set();for(const r of v.routes){const id=r?.route_id;if(!text(id,512)||ids.has(id)||!stopDescriptor(r))throw Error('Invalid stop index route');ids.add(id);}return v;
}
export function parseStopRoster(v:any,city:string,mode:PublicTransitMode,routeId:string):RouteStopRoster{
 if(!v||v.schema_version!==1||v.city!==city||v.mode!==mode||v.route_id!==routeId||!Array.isArray(v.variants)||!v.variants.length||v.variants.length>32)throw Error('Invalid stop roster identity');
 const variants=new Set();let total=0;
 for(const variant of v.variants){
  if(!text(variant?.variant_id,512)||variants.has(variant.variant_id)||!(variant.direction===null||text(variant.direction))||typeof variant.complete!=='boolean'||!text(variant.reference_date)||!text(variant.source?.name)||!stopURL(variant.source?.url)||!HASH.test(variant.source.sha256)||!Array.isArray(variant.stops))throw Error('Invalid stop variant');
  variants.add(variant.variant_id);let last=-1;const ids=new Set();
  if(variant.source.license_url!==undefined&&!stopURL(variant.source.license_url))throw Error('Invalid stop licence URL');
  if(variant.coverage_note!==undefined&&!['zh','en','de'].every(l=>text(variant.coverage_note[l],5000)))throw Error('Invalid stop coverage');
  if(variant.shape_ids!==undefined&&(!Array.isArray(variant.shape_ids)||!variant.shape_ids.length||variant.shape_ids.some((id:unknown)=>!text(id,512))))throw Error('Invalid variant geometry selectors');
  for(const stop of variant.stops){
   if(!text(stop?.stop_id,512)||!Number.isInteger(stop.sequence)||stop.sequence<0||stop.sequence<=last||!(stop.name===null||text(stop.name))||!['in_city','out_of_city','uncertain'].includes(stop.city_scope)||++total>STOP_LIMIT)throw Error('Invalid stop occurrence');
   last=stop.sequence;ids.add(stop.stop_id);
   if(stop.source_url!==undefined&&!stopURL(stop.source_url))throw Error('Invalid stop source URL');
   if(stop.coordinates!==null&&(!Array.isArray(stop.coordinates)||stop.coordinates.length!==2||!stop.coordinates.every(Number.isFinite)||Math.abs(stop.coordinates[0])>180||Math.abs(stop.coordinates[1])>90))throw Error('Invalid source stop coordinate');
  }
  for(const id of [variant.start_stop_id,variant.end_stop_id])if(id!==null&&(!text(id,512)||!ids.has(id)))throw Error('Orphan stop endpoint');
 }
 return v;
}
/** Two small indexes and two selected-route rosters only; no full-city station download. */
export function createTransitStopLoader(fetchBytes:(path:string,signal:AbortSignal,maxBytes:number)=>Promise<Uint8Array>){
 const indexes=new Map<string,any>(),rosters=new Map<string,RouteStopRoster>();
 const aborted=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');};
 const remember=(cache:Map<string,any>,key:string,data:any)=>{cache.delete(key);while(cache.size>=2)cache.delete(cache.keys().next().value!);cache.set(key,data);};
 async function read(d:StopDescriptor,signal:AbortSignal){
  if(!stopDescriptor(d))throw Error('Invalid stop descriptor');aborted(signal);const b=await fetchBytes(d.path,signal,d.bytes);aborted(signal);
  if(!(b instanceof Uint8Array)||b.byteLength!==d.bytes||b.byteLength>STOP_BYTE_LIMIT)throw Error('Stop size mismatch');
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(b).buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');aborted(signal);if(sha!==d.sha256)throw Error('Stop hash mismatch');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
 }
 return {async load(city:string,mode:PublicTransitMode,routeId:string,d:StopDescriptor,signal:AbortSignal):Promise<RouteStopRoster|undefined>{
  if(!stopDescriptor(d))throw Error('Invalid stop descriptor');const key=city+'/'+mode+'/'+d.path+'/'+d.sha256+'/'+d.bytes;let index=indexes.get(key);if(!index){index=parseStopIndex(await read(d,signal),city,mode);aborted(signal);remember(indexes,key,index);}aborted(signal);
  const ref=index.routes.find((r:{route_id:string})=>r.route_id===routeId);if(!ref)return undefined;
  const rosterKey=key+'/'+routeId+'/'+ref.path+'/'+ref.sha256+'/'+ref.bytes;let roster=rosters.get(rosterKey);if(!roster){roster=parseStopRoster(await read(ref,signal),city,mode,routeId);aborted(signal);remember(rosters,rosterKey,roster);}aborted(signal);return roster;
 },clear(){indexes.clear();rosters.clear();},stats(){return{indexes:indexes.size,rosters:rosters.size,maxBytes:4*STOP_BYTE_LIMIT};}};
}
