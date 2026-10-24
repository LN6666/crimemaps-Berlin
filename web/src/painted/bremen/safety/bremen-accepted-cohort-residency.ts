import{BREMEN_CANDIDATE_COHORTS}from'./bremen-candidate-cohort-constants';
import{F274_COHORT}from'./f274-cohort-constants';
import {BREMEN_ACCEPTED_COHORT as ACCEPTED} from './bremen-accepted-cohort-constants';
import {viewportQueryBounds,viewportBoxesOverlap} from './three-dimensional-viewport';
import type {ComponentViewportBox,ComponentViewportCamera} from './three-dimensional-viewport';
import type {GroupComponent} from './s434-aggregate-display';
type Shard={id:string;path:string;sha256:string;bytes:number;vertices:number;lod:number};
type FiniteMember={city:string;objectId:string;partId:string;leafId:string;bbox:readonly number[];max_height_m:number;vertices:number;retainedEstimateBytes:number};
type FiniteLeaf={descriptor:Shard;groupVertices:number;reservedRetainedBytes:number};
type FiniteCohort={members:readonly FiniteMember[];leaves:readonly FiniteLeaf[];minVertices:number;minRetainedBytes:number};
export type CohortIdentityDiagnostic={objectId:string;partId:string;rawCandidate:number;viewportEligible:number;afterCohortViewport:number;packingBeforeFilters:number;packingAfterFilters?:number};
export type BremenAcceptedCohortDiagnostic={triggered:boolean;enabled:boolean;reason:string;minVertices:number;reservedRetainedBytes:number;requiredLeafIds:readonly string[];identities:CohortIdentityDiagnostic[]};
export function bremenAcceptedCohortMember(c:GroupComponent){return c.city==='bremen'&&[...ACCEPTED.members,...F274_COHORT.members,...(BREMEN_CANDIDATE_COHORTS as readonly FiniteCohort[]).flatMap(g=>g.members)].some(e=>e.objectId===c.objectId&&e.partId===c.partId);}
export function prepareBremenAcceptedCohortSelection<T extends Shard>(base:readonly T[],catalog:readonly T[],ctx:{city:string;bounds:ComponentViewportBox;camera:ComponentViewportCamera;maxVisible:number;maxBytes:number;vertexCap:number;retainedCap:number;lod:number}){
 const allGroups:readonly(FiniteCohort&{group:string})[]=[{...ACCEPTED,group:'unchanged-accepted-F257-F259'},{...F274_COHORT,group:'unchanged-accepted-F274'},...BREMEN_CANDIDATE_COHORTS];
 const active=ctx.city==='bremen'?allGroups.filter(g=>g.members.some((m:any)=>{const q=viewportQueryBounds(ctx.bounds,m.max_height_m,ctx.camera);return !q||viewportBoxesOverlap([...m.bbox]as ComponentViewportBox,q);})):[];
 const members:any[]=[...new Map(active.flatMap(g=>g.members).map((m:any)=>[m.objectId+'|'+m.partId,m])).values()];const leaves:any[]=[];
 for(const g of active)for(const l of g.leaves){const old=leaves.find(l2=>l2.descriptor.id===l.descriptor.id);if(old){if(JSON.stringify(old.descriptor)!==JSON.stringify(l.descriptor))throw Error('Finite Bremen cohort descriptor disagreement');}else leaves.push({descriptor:l.descriptor,groupVertices:0,reservedRetainedBytes:0});}
 for(const m of members){const l=leaves.find(l=>l.descriptor.id===m.leafId);if(!l)throw Error('Finite Bremen cohort member leaf missing');l.groupVertices+=m.vertices;l.reservedRetainedBytes+=m.retainedEstimateBytes;}
 const E:FiniteCohort=active.length===1&&active[0].group==='unchanged-accepted-F257-F259'?ACCEPTED:{members,leaves,minVertices:members.reduce((n,m)=>n+m.vertices,0),minRetainedBytes:leaves.reduce((n,l)=>n+l.reservedRetainedBytes,0)};
 const activeMember=(c:GroupComponent)=>c.city==='bremen'&&E.members.some((e:any)=>e.objectId===c.objectId&&e.partId===c.partId);
 const triggered=ctx.city==='bremen'&&E.members.some(m=>{const query=viewportQueryBounds(ctx.bounds,m.max_height_m,ctx.camera);return !query||viewportBoxesOverlap([...m.bbox]as ComponentViewportBox,query);});let reason=triggered?'ready':'outside-cohort',enabled=false;const selected:T[]=[];
 if(triggered){for(const wanted of E.leaves){const present=catalog.filter(s=>s.id===wanted.descriptor.id&&s.lod===ctx.lod);const matches=present.length?present:[wanted.descriptor as unknown as T];const unique=new Map(matches.map(s=>[s.sha256+'|'+s.path,s]));const row=[...unique.values()][0],e=wanted.descriptor;if(unique.size!==1||!row||row.sha256!==e.sha256||row.path!==e.path||row.bytes!==e.bytes||row.vertices!==e.vertices||row.lod!==e.lod){reason='current-catalog-leaf-missing-or-mismatch:'+e.id;break;}selected.push(row);}
  if(selected.length===E.leaves.length){if(selected.length>ctx.maxVisible||selected.reduce((n,s)=>n+s.bytes,0)>ctx.maxBytes)reason='request-budget-insufficient';else if(E.minVertices>ctx.vertexCap||E.minRetainedBytes>ctx.retainedCap)reason='cohort-minimum-budget-insufficient';else enabled=true;}
 }
 const required=new Set(selected.map(s=>s.id)),candidates=enabled?[...selected,...base.filter(s=>!required.has(s.id))]:[...base];
 const stages={rawCandidate:new Map<number,number[]>(),viewportEligible:new Map<number,number[]>(),afterCohortViewport:new Map<number,number[]>()};
 const counts=(rows:readonly GroupComponent[])=>E.members.map(e=>rows.filter(c=>c.city==='bremen'&&c.objectId===e.objectId&&c.partId===e.partId).length);
 return {triggered,enabled,reason,candidates,
  note(stage:keyof typeof stages,slot:number,rows:readonly GroupComponent[]){if(triggered)stages[stage].set(slot,counts(rows));},
  priority(a:GroupComponent,b:GroupComponent){return enabled?Number(activeMember(b))-Number(activeMember(a)):0;},
  viewportRows<TC extends GroupComponent>(raw:readonly TC[],visible:readonly TC[]):TC[]{if(!enabled)return [...visible];const set=new Set(visible);return raw.filter(c=>set.has(c)||activeMember(c));},
  reserveAfter(chosen:readonly Shard[],index:number){if(!enabled)return{vertices:0,bytes:0};const future=new Set(chosen.slice(index+1).map(s=>s.id));return E.leaves.reduce((n,l)=>future.has(l.descriptor.id)?{vertices:n.vertices+l.groupVertices,bytes:n.bytes+l.reservedRetainedBytes}:n,{vertices:0,bytes:0});},
  diagnostic(rows:readonly GroupComponent[]):BremenAcceptedCohortDiagnostic{const before=counts(rows),sum=(stage:keyof typeof stages,i:number)=>[...stages[stage].values()].reduce((n,c)=>n+c[i],0);return{triggered,enabled,reason,minVertices:E.minVertices,reservedRetainedBytes:E.minRetainedBytes,requiredLeafIds:E.leaves.map(l=>l.descriptor.id),identities:E.members.map((e,i)=>({objectId:e.objectId,partId:e.partId,rawCandidate:sum('rawCandidate',i),viewportEligible:sum('viewportEligible',i),afterCohortViewport:sum('afterCohortViewport',i),packingBeforeFilters:before[i]}))};}
 };
}
