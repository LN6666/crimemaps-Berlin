import type {GroupComponent} from './s434-aggregate-display';
import {FRANKFURT_COHORTS as GROUPS} from './frankfurt-cohort-constants';
import {viewportQueryBounds,viewportBoxesOverlap} from './three-dimensional-viewport';
import type {ComponentViewportBox,ComponentViewportCamera} from './three-dimensional-viewport';
import {nativePaintSignature} from './progressive-native-signature';
type Shard={id:string;path:string;sha256:string;bytes:number;vertices:number;lod:number};
type Component={city?:string;objectId:string;partId:string};
/** Exact finite real SOURCE cohorts. No synthetic source and no global cap change. */
export function prepareFrankfurtCohortSelection<T extends Shard>(base:readonly T[],catalog:readonly T[],ctx:{city:string;bounds:ComponentViewportBox;camera:ComponentViewportCamera;maxVisible:number;maxBytes:number;vertexCap:number;retainedCap:number;lod:number}){
 const accepted:typeof GROUPS=[];const rejected:{name:string;reason:string}[]=[];const descriptors=new Map<string,T>();let vertices=0,retained=0;
 if(ctx.city==='frankfurt')for(const group of GROUPS){
  if(!group.members.some(m=>{const q=viewportQueryBounds(ctx.bounds,m.max_height_m,ctx.camera);return !q||viewportBoxesOverlap([...m.bbox] as ComponentViewportBox,q);}))continue;
  const pending=new Map(descriptors);let reason='';
  for(const leaf of group.leaves){const e=leaf.descriptor,matches=catalog.filter(s=>s.id===e.id&&s.lod===ctx.lod);const distinct=new Map(matches.map(s=>[s.sha256+'|'+s.path,s]));const s=distinct.size?[...distinct.values()][0]:e as unknown as T;
   if(distinct.size>1||s.sha256!==e.sha256||s.path!==e.path||s.bytes!==e.bytes||s.vertices!==e.vertices||s.lod!==e.lod){reason='catalog-mismatch:'+e.id;break;}pending.set(e.id,s);
  }
  // Leave at least half of every original budget to ordinary visible source rows.
  if(!reason&&(vertices+group.minVertices>ctx.vertexCap*.5||retained+group.minRetainedBytes>ctx.retainedCap*.5||pending.size>ctx.maxVisible*.5||[...pending.values()].reduce((n,s)=>n+s.bytes,0)>ctx.maxBytes*.5))reason='bounded-cohort-budget-insufficient';
  if(reason){rejected.push({name:group.name,reason});continue;}
  accepted.push(group);vertices+=group.minVertices;retained+=group.minRetainedBytes;for(const [id,s]of pending)descriptors.set(id,s);
 }
 const members=accepted.flatMap(g=>g.members),member=(c:Component)=>c.city==='frankfurt'&&members.some(m=>m.objectId===c.objectId&&m.partId===c.partId&&nativePaintSignature(c as any)===m.signature);
 const stageCounts:Record<string,number[]>={};
 const counts=(rows:readonly Component[])=>members.map(m=>rows.filter(c=>c.city==='frankfurt'&&c.objectId===m.objectId&&c.partId===m.partId&&nativePaintSignature(c as any)===m.signature).length);
 return{candidates:[...descriptors.values(),...base.filter(s=>!descriptors.has(s.id))],
  priority(a:Component,b:Component){return Number(member(b))-Number(member(a));},
  viewportRows<C extends GroupComponent>(raw:readonly C[],visible:readonly C[]):C[]{const set=new Set(visible);return raw.filter(c=>set.has(c)||member(c));},
  reserveAfter(chosen:readonly Shard[],index:number){const future=new Set(chosen.slice(index+1).map(s=>s.id));return members.reduce((a,m)=>future.has(m.leafId)?{vertices:a.vertices+m.vertices,bytes:a.bytes+m.retainedEstimateBytes}:a,{vertices:0,bytes:0});},
  note(stage:string,slot:number,rows:readonly Component[]){stageCounts[stage+':'+slot]=counts(rows);},
  diagnostic(rows:readonly Component[]){return{accepted:accepted.map(g=>g.name),rejected,reservedVertices:vertices,reservedRetainedBytes:retained,ordinaryBudgetFloor:.5,requiredLeafIds:[...descriptors.keys()],counts:counts(rows),identities:members.map(m=>({objectId:m.objectId,partId:m.partId,signature:m.signature})),stageCounts};}
 };
}
