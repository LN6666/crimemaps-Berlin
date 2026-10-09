import {areaMetrics,type AreaMetric} from './area-metrics';
import {comparisonKey,metricComparisonIndex,type ComparisonIndex} from './metric-visualization';
export type MetricShardReference={path:string;sha256?:string};
export type MetricShardManifest={schema_version:1|2;city:string;level:string;source_sha256:string;geometry_sha256?:string;generation_sha256?:string;whole_bytes:number;coverage:unknown;native_ids:string[];areas:Record<string,{path:string;sha256:string;bytes:number}>};
export type LoadedAreaMetrics={metrics:AreaMetric[];comparisons:ComparisonIndex;coverage:unknown;mode:'shard'|'legacy';geometrySha256?:string};
type FetchBytes=(path:string,signal:AbortSignal)=>Promise<Uint8Array>;
class Bounded<T>{private items=new Map<string,{value:T;bytes:number}>();bytes=0;private max:number;private limit:number;constructor(max:number,limit:number){this.max=max;this.limit=limit;}get(key:string){const e=this.items.get(key);if(e){this.items.delete(key);this.items.set(key,e);}return e?.value;}set(key:string,value:T,bytes:number){if(bytes>this.limit)return;const old=this.items.get(key);if(old){this.bytes-=old.bytes;this.items.delete(key);}this.items.set(key,{value,bytes});this.bytes+=bytes;while(this.items.size>this.max||this.bytes>this.limit){const k=this.items.keys().next().value!;this.bytes-=this.items.get(k)!.bytes;this.items.delete(k);}}get size(){return this.items.size;}}
function error():never{throw Error('Invalid metric shard');}
function hash(v:unknown):v is string{return typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);}
function prefix(level:string,source:string){if(!/^[a-z][a-z0-9_-]{0,39}$/.test(level)||!hash(source))error();return `/safety/geography/metric-shards/${level}/${source}/`;}
function local(path:string){return typeof path==='string'&&/^\/safety\/geography\/metric-shards\/[a-z][a-z0-9_-]{0,39}\/[a-f0-9]{64}\/(?:manifest|[a-f0-9]{64})\.json$/.test(path);}
function decode(bytes:Uint8Array){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export function parseMetricShardManifest(value:any,city:string,level:string):MetricShardManifest{
 if((value?.schema_version!==1&&value?.schema_version!==2)||value.city!==city||value.level!==level||!hash(value.source_sha256)||!Number.isSafeInteger(value.whole_bytes)||value.whole_bytes<0||!Array.isArray(value.native_ids)||value.native_ids.length>2048||!value.areas||Array.isArray(value.areas)||typeof value.areas!=='object')error();
 if(value.geometry_sha256!==undefined&&!hash(value.geometry_sha256))error();
 const ids=new Set<string>();for(const id of value.native_ids){if(typeof id!=='string'||!id||id.length>200||ids.has(id))error();ids.add(id);}if(Object.keys(value.areas).length>2048)error();
 if((value.generation_sha256!==undefined&&!hash(value.generation_sha256))||(value.schema_version===2&&!hash(value.generation_sha256)))error();const root=prefix(level,value.generation_sha256??value.source_sha256);for(const [id,asset] of Object.entries(value.areas)as [string,any][]){if(!ids.has(id)||!asset||!hash(asset.sha256)||asset.path!==root+asset.sha256+'.json'||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>4*1024*1024)error();}return value;
}
export function parseMetricAreaShard(value:any,manifest:MetricShardManifest,areaId:string):LoadedAreaMetrics{
 if(manifest.geometry_sha256!==undefined&&!hash(manifest.geometry_sha256))error();
 if(value?.schema_version!==manifest.schema_version||value.city!==manifest.city||value.level!==manifest.level||value.area_id!==areaId||value.source_sha256!==manifest.source_sha256||value.generation_sha256!==manifest.generation_sha256||!Array.isArray(value.raw?.areas)||value.raw.areas.length!==1||value.raw.areas[0]?.id!==areaId||!Array.isArray(value.comparisons)||value.comparisons.length>128)error();
 const parsed=areaMetrics(value.raw,manifest.city,manifest.level),metrics=parsed[areaId];if(!metrics||metrics.length!==value.raw.areas[0].metrics.length)error();
 const expected=metricComparisonIndex({[areaId]:metrics}),native=new Set(manifest.native_ids),index:ComparisonIndex=new Map();
 for(const row of value.comparisons){if(typeof row?.key!=='string'||row.key.length>12000||index.has(row.key)||!expected.has(row.key)||!Array.isArray(row.values)||row.values.length>2048)error();const values=new Map<string,number|null>();
  for(const pair of row.values){if(!Array.isArray(pair)||pair.length!==2||!native.has(pair[0])||values.has(pair[0])||(pair[1]!==null&&(typeof pair[1]!=='number'||!Number.isFinite(pair[1]))))error();values.set(pair[0],pair[1]);}
  if(!values.has(areaId)||values.get(areaId)!==expected.get(row.key)!.get(areaId))error();index.set(row.key,values);
 }
 if(index.size!==expected.size||metrics.some(m=>comparisonKey(m)&&!index.has(comparisonKey(m)!)))error();return {metrics,comparisons:index,coverage:manifest.coverage,mode:'shard',geometrySha256:manifest.geometry_sha256};
}
export class MetricShardLoader{
 private manifests=new Bounded<MetricShardManifest>(2,1024*1024);private areas=new Bounded<LoadedAreaMetrics>(8,4*1024*1024);
 private options:{fetchBytes:FetchBytes;legacy?:(city:string,level:string,signal:AbortSignal)=>Promise<unknown>};constructor(options:{fetchBytes:FetchBytes;legacy?:(city:string,level:string,signal:AbortSignal)=>Promise<unknown>}){this.options=options;}
 private async read(path:string,signal:AbortSignal,limit:number,expected?:string){if(!local(path)||expected!==undefined&&!hash(expected))error();signal.throwIfAborted();const bytes=await this.options.fetchBytes(path,signal);signal.throwIfAborted();if(bytes.byteLength>limit)error();if(expected){const digest=await crypto.subtle.digest('SHA-256',bytes.slice().buffer);signal.throwIfAborted();if([...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')!==expected)error();}return {value:decode(bytes),bytes:bytes.byteLength};}
 async load(options:{city:string;level:string;areaId:string;manifest?:MetricShardReference;signal:AbortSignal}):Promise<LoadedAreaMetrics>{const {city,level,areaId,signal}=options;signal.throwIfAborted();
  if(!options.manifest){if(!this.options.legacy)error();const value=await this.options.legacy(city,level,signal);signal.throwIfAborted();const all=areaMetrics(value,city,level);return {metrics:all[areaId]??[],comparisons:metricComparisonIndex(all),coverage:undefined,mode:'legacy'};}
  const ref=options.manifest;if(!local(ref.path)||!ref.path.endsWith('/manifest.json'))error();const key=city+'|'+level+'|'+ref.path+'|'+(ref.sha256??'');let manifest=this.manifests.get(key);
  if(!manifest){const result=await this.read(ref.path,signal,1024*1024,ref.sha256);manifest=parseMetricShardManifest(result.value,city,level);if(ref.path!==prefix(level,manifest.generation_sha256??manifest.source_sha256)+'manifest.json')error();signal.throwIfAborted();this.manifests.set(key,manifest,result.bytes);}
  if(!manifest.native_ids.includes(areaId))error();const asset=Object.hasOwn(manifest.areas,areaId)?manifest.areas[areaId]:undefined;if(!asset)return {metrics:[],comparisons:new Map(),coverage:manifest.coverage,mode:'shard',geometrySha256:manifest.geometry_sha256};
  const areaKey=key+'|'+areaId+'|'+asset.sha256,cached=this.areas.get(areaKey);signal.throwIfAborted();if(cached)return cached;const result=await this.read(asset.path,signal,4*1024*1024,asset.sha256);if(result.bytes!==asset.bytes)error();const loaded=parseMetricAreaShard(result.value,manifest,areaId);signal.throwIfAborted();this.areas.set(areaKey,loaded,result.bytes);return loaded;
 }
 get cacheStats(){return {areas:this.areas.size,areaBytes:this.areas.bytes,manifests:this.manifests.size,manifestBytes:this.manifests.bytes};}
}
