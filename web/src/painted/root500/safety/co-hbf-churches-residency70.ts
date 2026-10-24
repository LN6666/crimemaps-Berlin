import {CO_HBF_CHURCHES_SOURCE32 as E} from './co-hbf-churches-source32';
import {viewportBoxesOverlap} from './three-dimensional-viewport';
import type {ComponentViewportBox} from './three-dimensional-viewport';
import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
type Shard={id:string;tile_key:string;path:string;sha256:string;bytes:number;vertices:number;lod:number};
type Limits={maxVisible:number;maxBytes:number;vertexCap:number;retainedCap:number;maxCache:number;maxCacheBytes:number;cacheRetainedCap:number};
type Pin=(c:BuildingComponent)=>string|undefined;
const key=(c:{objectId:string;partId:string})=>c.objectId+'|'+c.partId;
const members=new Map(E.members.map(m=>[key(m),m]));
const isMember=(c:BuildingComponent)=>c.city===E.city&&members.has(key(c));
/** Ordinary Cologne Hbf-area source dependencies. No QA number, URL or target list. */
export function prepareCOHbfChurchesResidency70<T extends Shard>(base:readonly T[],catalog:readonly T[],ctx:Limits&{city:string;sourcePBF:string;boundarySHA:string;sourceSnapshot:string;bounds:ComponentViewportBox;lod:number;otherProtectedCacheKeys:readonly string[]}){
 const lineage=ctx.city===E.city&&ctx.sourcePBF===E.sourcePBF&&ctx.boundarySHA===E.boundarySHA&&ctx.sourceSnapshot===E.sourceSnapshot;
 const triggered=lineage&&viewportBoxesOverlap([...E.triggerBBox] as ComponentViewportBox,ctx.bounds);
 let enabled=false,reason=triggered?'ready':lineage?'outside-Hbf-region':'different-city-or-source';const selected:T[]=[];
 if(triggered){for(const wanted of E.leaves){const e=wanted.descriptor,found=catalog.filter(s=>s.id===e.id&&s.lod===ctx.lod),unique=new Map(found.map(s=>[s.sha256+'|'+s.path,s])),row=[...unique.values()][0];if(unique.size!==1||!row||found.some(s=>s.tile_key!==e.tile_key||s.path!==e.path||s.sha256!==e.sha256||s.bytes!==e.bytes||s.vertices!==e.vertices||s.lod!==e.lod)){reason='exact-source-leaf-missing-or-mismatch:'+e.id;break;}selected.push(row);}enabled=selected.length===E.leaves.length;}
 const budgets:Limits=enabled?{maxVisible:ctx.maxVisible+E.leaves.length,maxBytes:ctx.maxBytes+E.serializedBytes,vertexCap:ctx.vertexCap,retainedCap:ctx.retainedCap+E.minRetainedBytes,maxCache:ctx.maxCache+E.leaves.length,maxCacheBytes:ctx.maxCacheBytes+E.serializedBytes,cacheRetainedCap:ctx.cacheRetainedCap+E.rawRetainedBytes}:{maxVisible:ctx.maxVisible,maxBytes:ctx.maxBytes,vertexCap:ctx.vertexCap,retainedCap:ctx.retainedCap,maxCache:ctx.maxCache,maxCacheBytes:ctx.maxCacheBytes,cacheRetainedCap:ctx.cacheRetainedCap};
 const requiredIds=new Set(selected.map(s=>s.id)),requiredKeys=new Set(enabled?selected.map(s=>s.tile_key):[]),otherKeys=new Set(ctx.otherProtectedCacheKeys);
 return {triggered,enabled,reason,budgets,candidates:enabled?[...selected,...base.filter(s=>!requiredIds.has(s.id))]:[...base],
  priority(a:BuildingComponent,b:BuildingComponent){return enabled?Number(isMember(b))-Number(isMember(a)):0;},
  viewportRows<TC extends BuildingComponent>(raw:readonly TC[],visible:readonly TC[]):TC[]{if(!enabled)return [...visible];const set=new Set(visible);return raw.filter(c=>set.has(c)||isMember(c));},
  reserveAfter(chosen:readonly Shard[],index:number){if(!enabled)return{vertices:0,bytes:0};const future=new Set(chosen.slice(index+1).map(s=>s.id));return E.leaves.reduce((n,l)=>future.has(l.descriptor.id)?{vertices:n.vertices+l.groupVertices,bytes:n.bytes+l.reservedRetainedBytes}:n,{vertices:0,bytes:0});},
  /** Preserve both this cohort and already protected bridge/station dependencies. */
  cacheEvictionKey(keys:readonly string[]){return keys.find(k=>!requiredKeys.has(k)&&!otherKeys.has(k))??keys[0];},
  diagnostic(rows:readonly BuildingComponent[],leaf:Pin){const counts=E.members.map(m=>{const found=rows.filter(c=>c.city===m.city&&key(c)===key(m));return{group:m.group,objectId:m.objectId,partId:m.partId,count:found.length,exact:found.length===1&&leaf(found[0])===m.sha256&&JSON.stringify(found[0].origin)===JSON.stringify(m.origin)&&nativePaintSignature(found[0])===m.geometrySignature};});return{schema:E.schema,triggered,enabled,reason,budgets,nativeVerticesReservedInsideExistingCap:E.minVertices,serializedBytes:E.serializedBytes,selectedRetainedAllowanceBytes:E.minRetainedBytes,rawCacheAllowanceBytes:E.rawRetainedBytes,requiredSources:32,requiredLeaves:E.leaves.length,residentExact:counts.filter(x=>x.exact).length,groups:[122,123,126].map(group=>({group,required:counts.filter(x=>x.group===group).length,exact:counts.filter(x=>x.group===group&&x.exact).length})),missingOrChanged:counts.filter(x=>!x.exact),noPaintProgramChanged:true,measurement:'finite source reservation; native upload cap unchanged; existing per-building atomic reconstruction guards remain authoritative'};}
 };
}
