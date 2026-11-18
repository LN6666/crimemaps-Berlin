import {resourceContentKey} from './resource-content-key';
import type {ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';

export type RendererChunkSpan<T>={chunk:T;firstIndex:number;indexCount:number;localFirstIndex:number};
/** Compress only adjacent mappings of the same buffer. Component identities,
 * visibility and material runs remain separate; gaps and publication order are
 * preserved. A later clipped draw therefore addresses the identical indices. */
export function appendContiguousRendererSpan<T>(spans:RendererChunkSpan<T>[],row:RendererChunkSpan<T>):void{
 const previous=spans.at(-1);
 if(previous&&previous.chunk===row.chunk&&previous.indexCount>0&&row.indexCount>0&&
    previous.firstIndex+previous.indexCount===row.firstIndex&&
    previous.localFirstIndex+previous.indexCount===row.localFirstIndex&&
    Number.isSafeInteger(previous.indexCount+row.indexCount))previous.indexCount+=row.indexCount;
 else spans.push({...row});
}

/** A producer/source-selected frame. Origin is longitude/latitude; unit is
 * metres per Mercator world unit. It is content-derived, never camera-derived. */
export interface RendererChunkFrame{
 readonly origin:readonly[number,number];
 readonly unit:number;
 readonly authority:string;
}

/** Source identity is supplied by ingress after validating the actual selected
 * descriptor. Component identifiers only join rows to this authority; they are
 * never a substitute for the descriptor/content key. */
export interface RendererSourceGroup<T>{
 readonly contentKey:string;
 readonly components:readonly T[];
 readonly parents:readonly ChunkResourceLease<unknown>[];
 readonly frame:RendererChunkFrame;
 readonly cohortKeys:readonly string[];
 readonly materialAuthority:string;
 readonly recipeAuthority:string;
 readonly selectedLOD:number|string;
 /** Ingress members covered by a concrete derived/coalesced packing group. */
 readonly sourceKeys?:readonly string[];
 /** Verified recipes already incorporated into this authority. Preparation and
  * final packing may bind the same recipe without nesting its key again. */
 readonly derivationAuthorities?:readonly string[];
 /** Flat ingress metadata, without leases or previously serialized derived keys. */
 readonly derivationBaseAuthorities?:readonly RendererDerivationBaseAuthority[];
}

export interface RendererDerivationBaseAuthority{
 readonly contentKey:string;
 readonly frame:RendererChunkFrame;
 readonly materialAuthority:string;
 readonly recipeAuthority:string;
 readonly selectedLOD:number|string;
}

export interface RendererSourceCohort{
 readonly key:string;
 readonly members:readonly string[];
 readonly authority:string;
}

/** One request's selected bindings. Renderer production retains independent
 * dependency leases; cancellation of the manager's roles cannot retire a
 * published main/pick/capture consumer. Store itself is page-owned/injected. */
export interface RendererChunkInput<T>{
 readonly store:ChunkResourceStore;
 readonly groups:readonly RendererSourceGroup<T>[];
 readonly cohorts:readonly RendererSourceCohort[];
}

export interface RetainedRendererChunkInput<T> extends RendererChunkInput<T>{release():void;}

/** Keep each complete resource authority once. Repeating a packed key for every
 * row multiplies the source recipe by the row count again, before the resource
 * budget can admit anything. Index references preserve both identity and order
 * without hashing, truncating, or retaining a separate global key cache. */
export function indexedResourceKey<T>(namespace:string,rows:Iterable<T>,reference:(row:T)=>readonly[string,unknown]|undefined):string{
 const authorities:string[]=[],indices=new Map<string,number>(),references:unknown[]=[];
 for(const row of rows){
  const value=reference(row);if(!value){references.push(null);continue;}
  let index=indices.get(value[0]);if(index===undefined){index=authorities.length;indices.set(value[0],index);authorities.push(value[0]);}
  references.push([index,value[1]]);
 }
 return resourceContentKey('indexed-resource-v2',namespace,authorities,references);
}

/** Build the row-to-source join once per packing plan, rather than scanning and
 * materializing every source row again for each accepted component. */
export function rendererChunkRowOrigins<T extends {objectId:string;partId:string}>(groups:readonly Pick<RendererSourceGroup<T>,'contentKey'|'components'>[]):Map<string,readonly[string,number]>{
 const origins=new Map<string,readonly[string,number]>();
 for(const group of groups)group.components.forEach((row,index)=>{const key=row.objectId+'|'+row.partId;if(!origins.has(key))origins.set(key,[group.contentKey,index]);});
 return origins;
}

/** A receipt and a renderer hold different roles. No returned closure captures
 * the caller's input/scene; release drops component containers as well as pins. */
export function retainRendererChunkInput<T>(input:RendererChunkInput<T>|undefined):RetainedRendererChunkInput<T>|undefined{
 if(!input)return undefined;
 const store=input.store,pins:ChunkResourceLease<unknown>[]=[];
 let groups:RendererSourceGroup<T>[]=[],cohorts:RendererSourceCohort[]=[],live=true;
 try{
  groups=input.groups.map(group=>{
   if(!group.contentKey||!group.frame.authority||!group.frame.origin.every(Number.isFinite)||!Number.isFinite(group.frame.unit)||group.frame.unit<=0)throw Error('Invalid authoritative renderer source group');
   const parents=[...new Set(group.parents)].map(parent=>{const lease=parent.retain('dependency');pins.push(lease);return lease;});
   return{...group,parents,frame:{...group.frame,origin:[...group.frame.origin]as[number,number]},cohortKeys:[...group.cohortKeys],sourceKeys:group.sourceKeys?[...group.sourceKeys]:[group.contentKey]};
  });
  cohorts=input.cohorts.map(cohort=>({...cohort,members:[...cohort.members]}));
 }catch(error){for(const pin of pins)pin.release();throw error;}
 return{store,get groups(){return groups;},get cohorts(){return cohorts;},release(){if(!live)return;live=false;for(const pin of pins)pin.release();pins.length=0;groups=[];cohorts=[];}};
}

/** This is the existing renderer Mercator scale, not a new geometry unit. */
export function rendererChunkFrame(origin:readonly[number,number],authority:string):RendererChunkFrame{
 if(!origin.every(Number.isFinite)||Math.abs(origin[0])>180||Math.abs(origin[1])>=85.051129||!authority)throw Error('Invalid canonical chunk frame');
 return{origin:[origin[0],origin[1]],unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority};
}

export interface RendererChunkLineage<T>{
 /** Exact source rows named by an already verified reconstruction certificate. */
 readonly sources:readonly T[];
 readonly authority:string;
}

type ChunkIdentity={objectId:string;partId:string};
/** A producer's verified DISPLAY result. Witnesses are admission dependencies,
 * not native ancestors of the displayed object. Neither kind changes SOURCE
 * getters: this contract only owns packing resources and display visibility. */
export interface RendererChunkDerivation<T extends ChunkIdentity>{
 readonly authority:string;
 readonly components:readonly T[];
 readonly sources:readonly ChunkIdentity[];
 readonly witnesses?:readonly ChunkIdentity[];
 readonly parents:readonly ChunkResourceLease<unknown>[];
 readonly frame:RendererChunkFrame;
 readonly explicitVisibility?:boolean;
 readonly visibility?:readonly{identity:ChunkIdentity;sources:readonly ChunkIdentity[]}[];
}

/** Bind complete verified dependencies before rendererChunkGroups joins DISPLAY
 * rows. The returned input owns independent pins; callers return their temporary
 * recipe leases after this function succeeds or throws. */
export function bindRendererChunkDerivations<T extends ChunkIdentity>(input:RendererChunkInput<T>,derivations:readonly RendererChunkDerivation<T>[]):RetainedRendererChunkInput<T>{
 const key=(row:ChunkIdentity)=>row.objectId+'|'+row.partId,owners=new Map<string,number>(),nativeOwners=new Map<string,number>(),nodes:number[]=input.groups.map((_,index)=>index),added=new Map<number,T>();
 const find=(index:number):number=>nodes[index]===index?index:(nodes[index]=find(nodes[index]));
 const join=(members:readonly number[])=>{const first=find(members[0]);for(const member of members)nodes[find(member)]=first;};
 input.groups.forEach((group,index)=>{for(const row of group.components){const identity=key(row);if(owners.has(identity))throw Error('Ambiguous renderer source authority: '+identity);owners.set(identity,index);nativeOwners.set(identity,index);}});
 // Allocate all DISPLAY identities first. A later recipe may transform an
 // earlier recipe's row (Market cap), without making that row native SOURCE.
 for(const proof of derivations){
  if(!proof.authority||!proof.components.length||new Set(proof.components.map(key)).size!==proof.components.length)throw Error('Invalid verified DISPLAY recipe');
  if(new Set(proof.sources.map(key)).size!==proof.sources.length||new Set((proof.witnesses??[]).map(key)).size!==(proof.witnesses??[]).length)throw Error('Duplicate verified DISPLAY dependency');
  for(const source of [...proof.sources,...(proof.witnesses??[])])if(!nativeOwners.has(key(source)))throw Error('Verified DISPLAY dependency is not complete: '+key(source));
  if(!proof.sources.length&&!proof.witnesses?.length&&!proof.parents.length&&proof.components.every(row=>!nativeOwners.has(key(row))))throw Error('Source-absent DISPLAY has no resource authority');
  for(const row of proof.components)if(!owners.has(key(row))){const index=nodes.length;nodes.push(index);owners.set(key(row),index);added.set(index,row);}
 }
 for(const proof of derivations)join([...proof.sources,...(proof.witnesses??[]),...proof.components].map(row=>owners.get(key(row))!));
 const sets=new Map<number,{groups:RendererSourceGroup<T>[];added:T[];proofs:RendererChunkDerivation<T>[]}>();
 const set=(index:number)=>{const root=find(index);let value=sets.get(root);if(!value){value={groups:[],added:[],proofs:[]};sets.set(root,value);}return value;};
 input.groups.forEach((group,index)=>set(index).groups.push(group));for(const [index,row]of added)set(index).added.push(row);for(const proof of derivations)set(owners.get(key(proof.components[0]))!).proofs.push(proof);
 const cohorts=new Map(input.cohorts.map(cohort=>[cohort.key,cohort]));
 const groups=[...sets.values()].map(({groups,added,proofs}):RendererSourceGroup<T>=>{
  if(!proofs.length&&groups.length===1)return groups[0];
  // The existing group-key order selects a geometry frame. Keep group keys and
  // their ordering inputs in the legacy format until that semantic choice is
  // independent of serialization; only identities after that choice are opaque.
  const bases=[...new Map(groups.flatMap(group=>group.derivationBaseAuthorities??[{contentKey:group.contentKey,frame:group.frame,materialAuthority:group.materialAuthority,recipeAuthority:group.recipeAuthority,selectedLOD:group.selectedLOD}]).map(base=>[base.contentKey,base])).values()].sort((a,b)=>a.contentKey.localeCompare(b.contentKey));
  const authorities=[...new Set([...groups.flatMap(group=>group.derivationAuthorities??[]),...proofs.map(proof=>proof.authority)])].sort();
  const sourceKeys=new Set(groups.flatMap(group=>group.sourceKeys??[group.contentKey])),cohortKeys=new Set(groups.flatMap(group=>group.cohortKeys));
  for(const proof of proofs){const ingress=resourceContentKey('verified-display-authority-source-v2',proof.authority),cohortKey=resourceContentKey('verified-display-publication-v2',proof.authority);sourceKeys.add(ingress);cohortKeys.add(cohortKey);cohorts.set(cohortKey,{key:cohortKey,members:[ingress],authority:proof.authority});}
  const frame=bases[0]?.frame??[...groups.map(group=>group.frame),...proofs.map(proof=>proof.frame)].sort((a,b)=>a.authority.localeCompare(b.authority))[0];
  return{contentKey:JSON.stringify(['verified-display-source-group-v2',bases.map(base=>base.contentKey),authorities]),components:[...groups.flatMap(group=>group.components),...added],parents:[...new Map([...groups.flatMap(group=>group.parents),...proofs.flatMap(proof=>proof.parents)].map(parent=>[parent.contentKey,parent])).values()],frame,cohortKeys:[...cohortKeys],sourceKeys:[...sourceKeys],derivationAuthorities:authorities,derivationBaseAuthorities:bases,materialAuthority:resourceContentKey('verified-display-material-v2',bases.map(base=>base.materialAuthority),authorities),recipeAuthority:resourceContentKey('verified-display-recipe-v2',bases.map(base=>base.recipeAuthority),authorities),selectedLOD:bases.length?resourceContentKey('verified-display-lod-v2',bases.map(base=>base.selectedLOD)):'explicit-verified-display'};
 });
 return retainRendererChunkInput({...input,groups,cohorts:[...cohorts.values()]})!;
}

/** Keep requested SOURCE order. Existing same-identity DISPLAY retains its rank;
 * added rows inherit their actual carrier/witness rank, or the producer's
 * explicit source-absent admission. No viewport enters a resource content key. */
export function rendererDerivedDisplayKeys<T extends ChunkIdentity>(requested:readonly T[],display:readonly T[],receipts:readonly(ChunkIdentity&{sourcePartId?:string;sourceCarrier?:{objectId:string}})[],derivations:readonly RendererChunkDerivation<T>[],explicit:(row:T)=>boolean=()=>false,native:readonly T[]=requested):string[]{
 const key=(row:ChunkIdentity)=>row.objectId+'|'+row.partId,order=new Map(requested.map((row,index)=>[key(row),index])),nativeKeys=new Set(native.map(key)),parents=new Map<string,string[]>(),admitted=new Set<string>();
 for(const receipt of receipts)if(receipt.sourcePartId)parents.set(key(receipt),[(receipt.sourceCarrier?.objectId??receipt.objectId)+'|'+receipt.sourcePartId]);
 for(const proof of derivations)for(const row of proof.components){const identity=key(row),sources=proof.visibility?.find(value=>key(value.identity)===identity)?.sources??[...proof.sources,...(proof.witnesses??[])];parents.set(identity,sources.map(key));if(proof.explicitVisibility)admitted.add(identity);}
 // A complete native group may contain cycles. Propagate each requested rank
 // once, in source order, instead of enumerating every path through that group.
 // Direct requested identities keep their own rank and stop ancestor traversal.
 const ranks=new Map(order),dependents=new Map<string,string[]>();
 for(const [identity,sources]of parents){if(order.has(identity))continue;for(const parent of sources){let rows=dependents.get(parent);if(!rows){rows=[];dependents.set(parent,rows);}rows.push(identity);}}
 for(let index=0;index<requested.length;index++){
  const identity=key(requested[index]);if(order.get(identity)!==index)continue;
  const queue=[identity];for(let cursor=0;cursor<queue.length;cursor++)for(const child of dependents.get(queue[cursor])??[]){if(ranks.has(child))continue;ranks.set(child,index);queue.push(child);}
 }
 return display.map((row,index)=>({row,index,rank:ranks.get(key(row))})).filter(({row,rank})=>rank!==undefined||admitted.has(key(row))||!nativeKeys.has(key(row))&&explicit(row)).sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||a.index-b.index).map(({row})=>key(row));
}

/** Join accepted rows through verified ancestry. Component identifiers are only
 * lookup keys; allocation equality continues to come from source and recipe
 * authorities. A derived row without a descriptor or ancestry is an error. */
export function rendererChunkGroups<T extends {objectId:string;partId:string}>(input:RendererChunkInput<T>,accepted:readonly T[],lineage?:(component:T)=>RendererChunkLineage<T>|undefined):RendererSourceGroup<T>[] {
 const identity=(component:T)=>component.objectId+'|'+component.partId;
 const owner=new Map<string,RendererSourceGroup<T>>(),rows=new Map<RendererSourceGroup<T>,T[]>(),proofs=new Map<RendererSourceGroup<T>,Set<string>>();
 for(const group of input.groups)for(const component of group.components){const key=identity(component);if(owner.has(key))throw Error('Ambiguous renderer source authority: '+key);owner.set(key,group);}
 for(const component of accepted){
  let group=owner.get(identity(component));
  const proof=lineage?.(component);
  if(!group||proof){
   if(!proof?.authority||!proof.sources.length)throw Error('Accepted display row has no authoritative chunk ancestry: '+identity(component));
   const parents=new Set(proof.sources.map(source=>owner.get(identity(source))));
   if(parents.has(undefined)||parents.size!==1)throw Error('Derived display requires an explicit complete multi-source packing group: '+identity(component));
   group=[...parents][0]!;let values=proofs.get(group);if(!values){values=new Set();proofs.set(group,values);}values.add(proof.authority);
  }
  let members=rows.get(group);if(!members){members=[];rows.set(group,members);}members.push(component);
 }
 return input.groups.flatMap(group=>{const components=rows.get(group);if(!components?.length)return[];const authority=[...(proofs.get(group)??[])].sort();return[{...group,components,sourceKeys:group.sourceKeys??[group.contentKey],contentKey:authority.length?JSON.stringify(['verified-derived-group-v1',group.contentKey,authority]):group.contentKey}];});
}

/** Coalesce only concrete, already admitted semantic dependencies. Publication
 * cohorts for a whole request must never be supplied as physical dependencies. */
export function coalesceRendererChunkGroups<T extends {objectId:string;partId:string}>(groups:readonly RendererSourceGroup<T>[],dependencies:readonly{members:readonly{objectId:string;partId:string}[];authority:string}[]):RendererSourceGroup<T>[] {
 const key=(component:{objectId:string;partId:string})=>component.objectId+'|'+component.partId,owners=new Map<string,number>(),parent=groups.map((_,i)=>i),proofs=new Map<number,Set<string>>();
 groups.forEach((group,i)=>group.components.forEach(component=>owners.set(key(component),i)));
 const find=(i:number):number=>parent[i]===i?i:(parent[i]=find(parent[i]));
 for(const dependency of dependencies){
  if(!dependency.authority||!dependency.members.length)continue;
  const members=[...new Set(dependency.members.map(component=>owners.get(key(component))))];
  if(members.includes(undefined))throw Error('Admitted semantic packing dependency is not complete');
  const first=find(members[0]!);for(const member of members)parent[find(member!)]=first;
  let values=proofs.get(first);if(!values){values=new Set();proofs.set(first,values);}values.add(dependency.authority);
 }
 const sets=new Map<number,number[]>();groups.forEach((_,i)=>{const root=find(i),members=sets.get(root)??[];members.push(i);sets.set(root,members);});
 return [...sets.values()].map(members=>{
  const sources=members.map(i=>groups[i]),ordered=[...sources].sort((a,b)=>a.contentKey.localeCompare(b.contentKey)),authority=[...new Set([...proofs].flatMap(([i,values])=>find(i)===find(members[0])?[...values]:[]))].sort();
  if(sources.length===1&&!authority.length)return sources[0];
  return{contentKey:JSON.stringify(['semantic-packing-dependencies-v1',ordered.map(group=>group.contentKey),authority]),components:ordered.flatMap(group=>group.components),parents:[...new Set(sources.flatMap(group=>group.parents))],sourceKeys:[...new Set(sources.flatMap(group=>group.sourceKeys??[group.contentKey]))],derivationAuthorities:[...new Set([...sources.flatMap(group=>group.derivationAuthorities??[]),...authority])],derivationBaseAuthorities:sources.some(group=>group.derivationBaseAuthorities)?sources.flatMap(group=>group.derivationBaseAuthorities??[{contentKey:group.contentKey,frame:group.frame,materialAuthority:group.materialAuthority,recipeAuthority:group.recipeAuthority,selectedLOD:group.selectedLOD}]):undefined,frame:ordered[0].frame,cohortKeys:[...new Set(sources.flatMap(group=>group.cohortKeys))],materialAuthority:resourceContentKey('semantic-packing-material-v2',ordered.map(group=>group.materialAuthority)),recipeAuthority:resourceContentKey('semantic-packing-recipe-v2',ordered.map(group=>group.recipeAuthority),authority),selectedLOD:resourceContentKey('semantic-packing-lod-v2',ordered.map(group=>group.selectedLOD))};
 });
}

/** A hidden source member may have no draw allocation, but its verified source
 * must still be present before its semantic publication cohort can commit. */
export function rendererChunkPublicationCohorts<T>(input:RendererChunkInput<T>,allocations:readonly{source:RendererSourceGroup<T>;contentKey:string}[]){
 const available=new Set(input.groups.flatMap(group=>[group.contentKey,...(group.sourceKeys??[])]));
 return input.cohorts.map(cohort=>{
  if(!cohort.authority||cohort.members.some(member=>!available.has(member)))throw Error('Incomplete renderer publication source cohort: '+cohort.key);
  const wanted=new Set(cohort.members),members=allocations.filter(row=>(row.source.sourceKeys??[row.source.contentKey]).some(key=>wanted.has(key))).map(row=>row.contentKey);
  return{key:cohort.key,members:[...new Set(members)]};
 }).filter(cohort=>cohort.members.length);
}
