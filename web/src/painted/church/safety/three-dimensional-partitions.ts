import {modelHeightQuery,validModelHeight} from './three-dimensional-query';
import type {ComponentViewportCamera} from './three-dimensional-viewport';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import type {ThreeDCompressionDescriptor} from './bounded-3d-gzip';
export type ThreeDIndexAsset=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
export type ThreeDIndexBox=[number,number,number,number];
export type ThreeDPartition=ThreeDIndexAsset&{id:string;bbox:ThreeDIndexBox;max_height_m?:number};
export type ThreeDPartitionLeaf=ThreeDIndexAsset&{id:string;tile_key:string;bbox:ThreeDIndexBox;vertices:number;lod:1|2|3;max_height_m?:number};
const overlap=(a:ThreeDIndexBox,b:ThreeDIndexBox)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
/** Viewport-only metadata pages; uses the owner's existing verified request queue. */
export function installThreeDimensionalPartitions(options:{city:string;sourceHash:string;boundaryHash:string;partitions:ThreeDPartition[];mobile:boolean;read:(asset:ThreeDIndexAsset,signal:AbortSignal)=>Promise<unknown>;validateLeaf:(leaf:ThreeDPartitionLeaf)=>boolean}){
 const cache=new Map<string,{rows:ThreeDPartitionLeaf[];cost:number;physical:number;raw:number}>(),cap=options.mobile?6:12,budget=options.mobile?4*1024**2:8*1024**2;
 let used=0,loads=0,lastQueryRetainedEstimateBytes=0,queryCoverageVerified=false,queryModes:Record<string,number>={};
 async function page(part:ThreeDPartition,signal:AbortSignal){
  signal.throwIfAborted();const hit=cache.get(part.id);if(hit){cache.delete(part.id);cache.set(part.id,hit);return hit.rows;}
  const raw=await options.read(part,signal) as any;signal.throwIfAborted();if(!raw||raw.schema_version!==1||raw.city!==options.city||raw.source_pbf_sha256!==options.sourceHash||raw.city_boundary_sha256!==options.boundaryHash||raw.bbox_kind!=='compiled-mesh-ground-envelope'||(raw.max_height_m!==undefined&&!validModelHeight(raw.max_height_m))||(part.max_height_m!==undefined&&raw.max_height_m!==part.max_height_m)||!Array.isArray(raw.shards)||raw.shards.length>5000)throw Error('Invalid3D partition binding');
  const ids=new Set<string>(),rows:ThreeDPartitionLeaf[]=[];
  for(const leaf of raw.shards){const lod=leaf.lod??(JSON.stringify(leaf.supported_lods)==='[1,2,3]'&&leaf.actual_geometry_lod===1?1:undefined),value={...leaf,lod};if(!options.validateLeaf(value)||(value.max_height_m!==undefined&&!validModelHeight(value.max_height_m))||(part.max_height_m!==undefined&&value.max_height_m!==undefined&&value.max_height_m>part.max_height_m)||(raw.max_height_m!==undefined&&value.max_height_m!==undefined&&value.max_height_m>raw.max_height_m)||ids.has(value.id)||value.bbox[0]<part.bbox[0]||value.bbox[1]<part.bbox[1]||value.bbox[2]>part.bbox[2]||value.bbox[3]>part.bbox[3])throw Error('Invalid3D partition leaf');ids.add(value.id);rows.push(value);}
  const cost=estimateRetainedBuildingPayload(rows).retainedPayloadEstimateBytes;if(cost>budget)throw Error('3D metadata page exceeds retained budget');signal.throwIfAborted();loads++;cache.set(part.id,{rows,cost,physical:part.bytes,raw:part.uncompressed_bytes??part.bytes});used+=cost;while(cache.size>cap||used>budget){const key=cache.keys().next().value!;used-=cache.get(key)!.cost;cache.delete(key);}return rows;
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
  get stats(){return {pages:cache.size,retainedPayloadEstimateBytes:used,lastQueryRetainedEstimateBytes,queryCoverageVerified,queryModes,physicalBytes:[...cache.values()].reduce((n,r)=>n+r.physical,0),inflatedJSONBytes:[...cache.values()].reduce((n,r)=>n+r.raw,0),loads,measurement:'payload-estimate-not-heap'};},
  clear(){cache.clear();used=0;lastQueryRetainedEstimateBytes=0;queryCoverageVerified=false;queryModes={};}
 };
}
