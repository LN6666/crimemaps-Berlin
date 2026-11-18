import {modelHeightQuery,validModelHeight} from './three-dimensional-query';
import type {ComponentViewportCamera} from './three-dimensional-viewport';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import type {ThreeDCompressionDescriptor} from './bounded-3d-gzip';
import type {ResourceBudgetCost} from '../../../safety/render-runtime/resource-budget';
export type ThreeDIndexAsset=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
export type ThreeDIndexBox=[number,number,number,number];
export type ThreeDPartition=ThreeDIndexAsset&{id:string;bbox:ThreeDIndexBox;max_height_m?:number};
export type ThreeDPartitionLeaf=ThreeDIndexAsset&{id:string;tile_key:string;bbox:ThreeDIndexBox;vertices:number;lod:1|2|3;max_height_m?:number};
/** A read page with the page-ledger claim that holds its parse working set. The
 * partition owner takes the claim: once the page's rows exist it becomes their
 * retained estimate (identity: the rows array), released when the page leaves the
 * cache or the cache is cleared. A rejected or superseded page returns it at once. */
export type ThreeDPartitionPageClaim={adjust(cost:ResourceBudgetCost|readonly ResourceBudgetCost[]):boolean;release():void};
export type ThreeDPartitionPageRead={value:unknown;claim:ThreeDPartitionPageClaim};
const overlap=(a:ThreeDIndexBox,b:ThreeDIndexBox)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
/** Viewport-only metadata pages; uses the owner's existing verified request queue. */
export function installThreeDimensionalPartitions(options:{city:string;sourceHash:string;boundaryHash:string;partitions:ThreeDPartition[];mobile:boolean;read:(asset:ThreeDIndexAsset,signal:AbortSignal)=>Promise<ThreeDPartitionPageRead>;validateLeaf:(leaf:ThreeDPartitionLeaf)=>boolean}){
 const cache=new Map<string,{rows:ThreeDPartitionLeaf[];cost:number;physical:number;raw:number;claim:ThreeDPartitionPageClaim}>(),cap=options.mobile?6:12,budget=options.mobile?4*1024**2:8*1024**2;
 let used=0,loads=0,lastQueryRetainedEstimateBytes=0,queryCoverageVerified=false,queryModes:Record<string,number>={},epoch=0;
 const evict=(key:string)=>{const entry=cache.get(key);if(!entry)return;cache.delete(key);used-=entry.cost;entry.claim.release();};
 async function page(part:ThreeDPartition,signal:AbortSignal){
  signal.throwIfAborted();const hit=cache.get(part.id);if(hit){cache.delete(part.id);cache.set(part.id,hit);return hit.rows;}
  const started=epoch,read=await options.read(part,signal),claim=read.claim;let rows:ThreeDPartitionLeaf[],cost:number;
  try{
   const raw=read.value as any;signal.throwIfAborted();if(!raw||raw.schema_version!==1||raw.city!==options.city||raw.source_pbf_sha256!==options.sourceHash||raw.city_boundary_sha256!==options.boundaryHash||raw.bbox_kind!=='compiled-mesh-ground-envelope'||(raw.max_height_m!==undefined&&!validModelHeight(raw.max_height_m))||(part.max_height_m!==undefined&&raw.max_height_m!==part.max_height_m)||!Array.isArray(raw.shards)||raw.shards.length>5000)throw Error('Invalid3D partition binding');
   const ids=new Set<string>();rows=[];
   for(const leaf of raw.shards){const lod=leaf.lod??(JSON.stringify(leaf.supported_lods)==='[1,2,3]'&&leaf.actual_geometry_lod===1?1:undefined),value={...leaf,lod};if(!options.validateLeaf(value)||(value.max_height_m!==undefined&&!validModelHeight(value.max_height_m))||(part.max_height_m!==undefined&&value.max_height_m!==undefined&&value.max_height_m>part.max_height_m)||(raw.max_height_m!==undefined&&value.max_height_m!==undefined&&value.max_height_m>raw.max_height_m)||ids.has(value.id)||value.bbox[0]<part.bbox[0]||value.bbox[1]<part.bbox[1]||value.bbox[2]>part.bbox[2]||value.bbox[3]>part.bbox[3])throw Error('Invalid3D partition leaf');ids.add(value.id);rows.push(value);}
   cost=estimateRetainedBuildingPayload(rows).retainedPayloadEstimateBytes;if(cost>budget)throw Error('3D metadata page exceeds retained budget');signal.throwIfAborted();
   // The parse working set becomes the rows' retained estimate; the parsed page is no longer reachable.
   if(!claim.adjust({category:'metadata',bytes:cost,precision:'estimate',identity:rows,label:'3D metadata page '+part.id.slice(0,64)+' retained rows'}))throw Error('3D metadata page retained estimate no longer fits the page budget');
  }catch(error){claim.release();throw error;}
  loads++;
  // A clear() during the read invalidated this cache generation: the rows serve
  // only their caller and their claim is returned now.
  if(started!==epoch){claim.release();return rows;}
  evict(part.id);cache.set(part.id,{rows,cost,physical:part.bytes,raw:part.uncompressed_bytes??part.bytes,claim});used+=cost;while(cache.size>cap||used>budget)evict(cache.keys().next().value!);return rows;
 }
 return {
  async resolve(bounds:ThreeDIndexBox,signal:AbortSignal,camera?:ComponentViewportCamera,cityHeightFallback?:number){
   const modes:Record<string,number>={},centre=[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];let verified=true,partial=false;
   const match=(item:{bbox:ThreeDIndexBox;max_height_m?:number})=>{const q=modelHeightQuery(item,bounds,camera,cityHeightFallback);modes[q.mode]=(modes[q.mode]??0)+1;if(!q.verified)verified=false;return q.matches;};
   const all=options.partitions.filter(match).sort((a,b)=>Math.hypot((a.bbox[0]+a.bbox[2])/2-centre[0],(a.bbox[1]+a.bbox[3])/2-centre[1])-Math.hypot((b.bbox[0]+b.bbox[2])/2-centre[0],(b.bbox[1]+b.bbox[3])/2-centre[1])||a.id.localeCompare(b.id)),selected:ThreeDPartition[]=[],results:ThreeDPartitionLeaf[][]=[];
   let physical=0,inflated=0;for(const p of all){const raw=p.uncompressed_bytes??p.bytes;if(selected.length>=cap||physical+p.bytes>budget||inflated+raw>budget){partial=true;continue;}selected.push(p);physical+=p.bytes;inflated+=raw;}
   let index=0,staging=0;await Promise.all([0,1].map(async()=>{while(index<selected.length){signal.throwIfAborted();const at=index++,rows=(await page(selected[at],signal)).filter(match);signal.throwIfAborted();const cost=estimateRetainedBuildingPayload(rows).retainedPayloadEstimateBytes;if(staging+cost>budget){partial=true;results[at]=[];}else{staging+=cost;results[at]=rows;}}}));signal.throwIfAborted();
   const rows=results.flat(),ids=new Set<string>();for(const row of rows){if(ids.has(row.id))throw Error('Duplicate3D paged leaf');ids.add(row.id);}queryModes=modes;queryCoverageVerified=verified;lastQueryRetainedEstimateBytes=staging;return {shards:rows,partial:partial||!verified,queryCoverageVerified:verified,queryModes:modes};
  },
  /** Real descriptors of named leaves (for example focus dependency members in
   * a partition outside the viewport query), read by exact partition id with
   * the same page validation (validateLeaf, bindings, bounds), page-ledger
   * claim and cache as a viewport query. One call spends at most one viewport
   * query's page/byte allowance; members beyond it stay unresolved. An absent
   * partition id or a page entry that does not match the requested SHA is a
   * source contract failure, never a silent substitute. */
  async resolveLeaves(requests:readonly {id:string;sha256:string;partition:string|null}[],signal:AbortSignal):Promise<{leaves:ThreeDPartitionLeaf[];unresolved:number}>{
   const byPartition=new Map<string,{id:string;sha256:string}[]>();let unresolved=0;
   for(const request of requests){if(request.partition===null){unresolved++;continue;}const rows=byPartition.get(request.partition)??[];rows.push(request);byPartition.set(request.partition,rows);}
   const leaves:ThreeDPartitionLeaf[]=[];let pages=0,physical=0,inflated=0;
   for(const [id,wanted] of [...byPartition].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    signal.throwIfAborted();const part=options.partitions.find(p=>p.id===id);if(!part)throw Error('3D dependency names an absent partition');
    const raw=part.uncompressed_bytes??part.bytes;if(pages>=cap||physical+part.bytes>budget||inflated+raw>budget){unresolved+=wanted.length;continue;}
    pages++;physical+=part.bytes;inflated+=raw;const rows=await page(part,signal);signal.throwIfAborted();
    for(const request of wanted){const row=rows.find(leaf=>leaf.id===request.id);if(!row||row.sha256!==request.sha256)throw Error('3D dependency leaf is absent from its partition or stale');leaves.push(row);}
   }
   return {leaves,unresolved};
  },
  get stats(){return {pages:cache.size,retainedPayloadEstimateBytes:used,lastQueryRetainedEstimateBytes,queryCoverageVerified,queryModes,physicalBytes:[...cache.values()].reduce((n,r)=>n+r.physical,0),inflatedJSONBytes:[...cache.values()].reduce((n,r)=>n+r.raw,0),loads,measurement:'payload-estimate-not-heap'};},
  clear(){epoch++;const entries=[...cache.values()];cache.clear();used=0;lastQueryRetainedEstimateBytes=0;queryCoverageVerified=false;queryModes={};for(const entry of entries)entry.claim.release();}
 };
}
