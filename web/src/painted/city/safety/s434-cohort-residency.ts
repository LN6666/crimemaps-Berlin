import {S434_COHORT as E} from './s434-cohort-constants';
import {viewportQueryBounds,viewportBoxesOverlap} from './three-dimensional-viewport';
import type {ComponentViewportBox,ComponentViewportCamera} from './three-dimensional-viewport';
import type {GroupComponent} from './s434-aggregate-display';
type Shard={id:string;path:string;sha256:string;bytes:number;vertices:number;lod:number};
export type CohortIdentityDiagnostic={objectId:string;partId:string;rawCandidate:number;viewportEligible:number;afterCohortViewport:number;packingBeforeFilters:number;packingAfterFilters?:number};
export type S434CohortDiagnostic={triggered:boolean;enabled:boolean;reason:string;minVertices:number;reservedRetainedBytes:number;requiredLeafIds:readonly string[];identities:CohortIdentityDiagnostic[]};
export function s434CohortMember(c:GroupComponent){return c.city==='frankfurt'&&E.members.some(e=>e.objectId===c.objectId&&e.partId===c.partId);}
export function prepareS434CohortSelection<T extends Shard>(base:readonly T[],catalog:readonly T[],ctx:{city:string;bounds:ComponentViewportBox;camera:ComponentViewportCamera;maxVisible:number;maxBytes:number;vertexCap:number;retainedCap:number;lod:number}){
 const triggered=ctx.city==='frankfurt'&&E.members.some(m=>{const query=viewportQueryBounds(ctx.bounds,m.max_height_m,ctx.camera);return !query||viewportBoxesOverlap([...m.bbox]as ComponentViewportBox,query);});let reason=triggered?'ready':'outside-cohort',enabled=false;const selected:T[]=[];
 if(triggered){for(const wanted of E.leaves){const matches=catalog.filter(s=>s.id===wanted.descriptor.id&&s.lod===ctx.lod);const unique=new Map(matches.map(s=>[s.sha256+'|'+s.path,s]));const row=[...unique.values()][0],e=wanted.descriptor;if(unique.size!==1||!row||row.sha256!==e.sha256||row.path!==e.path||row.bytes!==e.bytes||row.vertices!==e.vertices||row.lod!==e.lod){reason='current-catalog-leaf-missing-or-mismatch:'+e.id;break;}selected.push(row);}
  if(selected.length===E.leaves.length){if(selected.length>ctx.maxVisible||selected.reduce((n,s)=>n+s.bytes,0)>ctx.maxBytes)reason='request-budget-insufficient';else if(E.minVertices>ctx.vertexCap||E.minRetainedBytes>ctx.retainedCap)reason='cohort-minimum-budget-insufficient';else enabled=true;}
 }
 const required=new Set(selected.map(s=>s.id)),candidates=enabled?[...selected,...base.filter(s=>!required.has(s.id))]:[...base];
 const stages={rawCandidate:new Map<number,number[]>(),viewportEligible:new Map<number,number[]>(),afterCohortViewport:new Map<number,number[]>()};
 const counts=(rows:readonly GroupComponent[])=>E.members.map(e=>rows.filter(c=>c.city==='frankfurt'&&c.objectId===e.objectId&&c.partId===e.partId).length);
 return {triggered,enabled,reason,candidates,
  note(stage:keyof typeof stages,slot:number,rows:readonly GroupComponent[]){if(triggered)stages[stage].set(slot,counts(rows));},
  priority(a:GroupComponent,b:GroupComponent){return enabled?Number(s434CohortMember(b))-Number(s434CohortMember(a)):0;},
  viewportRows<TC extends GroupComponent>(raw:readonly TC[],visible:readonly TC[]):TC[]{if(!enabled)return [...visible];const set=new Set(visible);return raw.filter(c=>set.has(c)||s434CohortMember(c));},
  reserveAfter(chosen:readonly Shard[],index:number){if(!enabled)return{vertices:0,bytes:0};const future=new Set(chosen.slice(index+1).map(s=>s.id));return E.leaves.reduce((n,l)=>future.has(l.descriptor.id)?{vertices:n.vertices+l.groupVertices,bytes:n.bytes+l.reservedRetainedBytes}:n,{vertices:0,bytes:0});},
  diagnostic(rows:readonly GroupComponent[]):S434CohortDiagnostic{const before=counts(rows),sum=(stage:keyof typeof stages,i:number)=>[...stages[stage].values()].reduce((n,c)=>n+c[i],0);return{triggered,enabled,reason,minVertices:E.minVertices,reservedRetainedBytes:E.minRetainedBytes,requiredLeafIds:E.leaves.map(l=>l.descriptor.id),identities:E.members.map((e,i)=>({objectId:e.objectId,partId:e.partId,rawCandidate:sum('rawCandidate',i),viewportEligible:sum('viewportEligible',i),afterCohortViewport:sum('afterCohortViewport',i),packingBeforeFilters:before[i]}))};}
 };
}
