import {KO_RAIL_COHORT70 as E} from './ko-rail-connection-budget70';
import {viewportQueryBounds,viewportBoxesOverlap} from './three-dimensional-viewport';
import type {ComponentViewportBox,ComponentViewportCamera} from './three-dimensional-viewport';
import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
type Shard={id:string;tile_key:string;path:string;sha256:string;bytes:number;vertices:number;lod:number};
type Limits={maxVisible:number;maxBytes:number;vertexCap:number;retainedCap:number;maxCache:number;maxCacheBytes:number;cacheRetainedCap:number};
type Pin=(c:BuildingComponent)=>string|undefined;
const key=(c:{objectId:string;partId:string})=>c.objectId+'|'+c.partId;
const memberByKey=new Map<string,typeof E.members[number]>(E.members.map(m=>[key(m),m]));
const isMember=(c:BuildingComponent)=>c.city==='cologne'&&memberByKey.has(key(c));
/** Ordinary runtime dependency reservation. No URL, QA-number or browser-mode exception. */
export function prepareKORailConnectionResidency70<T extends Shard>(base:readonly T[],catalog:readonly T[],ctx:Limits&{city:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;bounds:ComponentViewportBox;camera:ComponentViewportCamera;lod:number}){
 const lineage=ctx.city===E.city&&ctx.sourcePBF===E.sourcePBF&&ctx.boundarySHA===E.boundarySHA&&ctx.sourceSnapshot===E.sourceSnapshot;
 const triggered=lineage&&viewportBoxesOverlap([...E.triggerBBox]as ComponentViewportBox,ctx.bounds)&&E.members.some(m=>{const query=viewportQueryBounds(ctx.bounds,m.max_height_m,ctx.camera);return !query||viewportBoxesOverlap([...m.bbox]as ComponentViewportBox,query);});
 let enabled=false,reason=triggered?'ready':lineage?'outside-cohort':'different-city-or-source';const selected:T[]=[];
 if(triggered){for(const wanted of E.leaves){const e=wanted.descriptor,matches=catalog.filter(s=>s.id===e.id&&s.lod===ctx.lod),unique=new Map(matches.map(s=>[s.sha256+'|'+s.path,s]));const row=[...unique.values()][0];if(unique.size!==1||!row||row.tile_key!==e.tile_key||row.path!==e.path||row.sha256!==e.sha256||row.bytes!==e.bytes||row.vertices!==e.vertices||row.lod!==e.lod){reason='exact-dependency-missing-or-mismatch:'+e.id;break;}selected.push(row);}enabled=selected.length===E.leaves.length;}
 const budgets:Limits=enabled?{maxVisible:ctx.maxVisible+E.leaves.length,maxBytes:ctx.maxBytes+E.serializedBytes,vertexCap:ctx.vertexCap+E.minVertices,retainedCap:ctx.retainedCap+E.minRetainedBytes,maxCache:ctx.maxCache+E.leaves.length,maxCacheBytes:ctx.maxCacheBytes+E.serializedBytes,cacheRetainedCap:ctx.cacheRetainedCap+E.rawRetainedBytes}:{maxVisible:ctx.maxVisible,maxBytes:ctx.maxBytes,vertexCap:ctx.vertexCap,retainedCap:ctx.retainedCap,maxCache:ctx.maxCache,maxCacheBytes:ctx.maxCacheBytes,cacheRetainedCap:ctx.cacheRetainedCap};
 const required=new Set(selected.map(s=>s.id)),requiredKeys=new Set(selected.map(s=>s.tile_key));
 const candidates=enabled?[...selected,...base.filter(s=>!required.has(s.id))]:[...base];
 const complete=(rows:readonly BuildingComponent[],leaf:Pin,owner:Pin)=>enabled&&E.members.every(m=>rows.filter(c=>c.city===m.city&&key(c)===key(m)).length===1)&&E.members.every(m=>rows.some(c=>key(c)===key(m)&&c.city===m.city&&(m.owner?owner(c):leaf(c))===m.sha256&&nativePaintSignature(c)===m.geometrySignature));
 return {triggered,enabled,reason,candidates,budgets,requiredLeafIds:enabled?selected.map(s=>s.id):[],
  priority(a:BuildingComponent,b:BuildingComponent){return enabled?Number(isMember(b))-Number(isMember(a)):0;},
  viewportRows<TC extends BuildingComponent>(raw:readonly TC[],visible:readonly TC[]):TC[]{if(!enabled)return [...visible];const set=new Set(visible);return raw.filter(c=>set.has(c)||isMember(c));},
  reserveAfter(chosen:readonly Shard[],index:number){if(!enabled)return{vertices:0,bytes:0};const future=new Set(chosen.slice(index+1).map(s=>s.id));return E.leaves.reduce((n,l)=>future.has(l.descriptor.id)?{vertices:n.vertices+l.groupVertices,bytes:n.bytes+l.reservedRetainedBytes}:n,{vertices:0,bytes:0});},
  /** Run before generic display replacement and metadata: incomplete group keeps original191, no partial owner cohort. */
  atomicRows<TC extends BuildingComponent>(rows:readonly TC[],leaf:Pin,owner:Pin):TC[]{if(!triggered||complete(rows,leaf,owner))return [...rows];return rows.filter(c=>!memberByKey.get(key(c))?.connectionOwner||c.city!=='cologne');},
  /** Prefer evicting background keys; all164 pinned dependencies fit the exact added cache envelope. */
  cacheEvictionKey(keys:readonly string[]){return enabled?keys.find(k=>!requiredKeys.has(k))??keys[0]:keys[0];},
  diagnostic(rows:readonly BuildingComponent[]){const counts=E.members.map(m=>({objectId:m.objectId,partId:m.partId,owner:m.owner,count:rows.filter(c=>c.city===m.city&&key(c)===key(m)).length}));return{schema:E.schema,triggered,enabled,reason,budgets,minVertices:E.minVertices,minRetainedBytes:E.minRetainedBytes,rawRetainedBytes:E.rawRetainedBytes,serializedBytes:E.serializedBytes,requiredLeaves:E.leaves.length,requiredOwners:E.members.filter(m=>m.owner).length,residentMembers:counts.filter(x=>x.count===1).length,missing:counts.filter(x=>x.count!==1),measurement:'finite fixed appearance allowance plus unchanged ordinary-scene caps; not process heap'};}
 };
}
