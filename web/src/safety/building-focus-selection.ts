import {acquireBuildingFocusClosure,type BuildingFocusLocatedLeaf} from './building-focus-closure';
import {projectBuildingFocusCohort,planBuildingFocusAdmission,type BuildingFocusAdmission,type BuildingFocusCost,type BuildingFocusPlan,type BuildingFocusUnit} from './building-focus-admission';
import type {createBuildingFocusIndexResolver} from './building-focus-catalog';
import {buildingFocusRegion,type BuildingFocusRect} from './building-focus-window';
import type {BuildingDetailComponent} from './building-detail-demand';
import type {ModelViewProjectionSnapshot} from './model-view-projection';
type Leaf=Readonly<{id:string;sha256:string}>;
const key=(leaf:Leaf)=>JSON.stringify([leaf.id,leaf.sha256]);
/** A native part an owner-authorized reconstruction displaces at display time
 * (its sourcePartId, or an explicit replacesNative row bound to one leaf). */
export type BuildingFocusReplacement=Readonly<{objectId:string;partId:string;nativeLeafSHA256?:string}>;
/** Representations the provider can really acquire for one leaf now:
 * `detail` is its ordinary demand selection, `coarse` the cheapest real level
 * for the periphery, `retained` the exact previous representation when it is
 * still loadable although neither of the other two. */
export type BuildingFocusRepresentations=Readonly<{detail:BuildingFocusCost;coarse?:BuildingFocusCost;retained?:BuildingFocusCost}>;
/** Implementation assumptions, not owner decisions: the periphery may spend at
 * most this share of the provider's allowance, only from what core left. */
export const BUILDING_FOCUS_PERIPHERAL_SHARE=Object.freeze({budget:.2,paintedUnits:.05});
export type BuildingFocusSelection<T>=Readonly<{
 plan:BuildingFocusPlan;
 sources:readonly Readonly<{leaf:T;resourceKey:string;region:'core'|'peripheral';cost:BuildingFocusCost;detail:BuildingFocusCost;held:boolean}>[];
 /** True only when something that belongs to the view is missing: a core (or
  * unknown-projection) cohort left out for lack of allowance, an unresolved
  * dependency member or a blocked recipe partner. The thinned periphery and
  * off-screen candidates are the intended result, not an incomplete one. */
 partial:boolean;
 /** Core or unknown-projection cohorts left out for lack of allowance. */
 deferredCore:number;
 /** Metadata-located dependency members, and those left without a descriptor. */
 located:number;unresolved:number;
 /** Leaves deferred because a recipe partner is outside this closure. */
 blocked:number;
}>;
/** Actual source decisions, made before geometry acquisition. The provider
 * supplies resource keys and costs for representations it can really load. */
export async function selectBuildingFocusSources<T extends Leaf>(options:{
 resolver:ReturnType<typeof createBuildingFocusIndexResolver>;
 candidates:readonly T[];canonicalLeaves:readonly T[];
 /** Explicit source-bound owner reconstructions absent from the canonical index.
  * Bounds must include their full height; unknown bounds retain prior demand.
  * A reconstruction REQUIRES every closure leaf holding a native part it
  * displaces (`replaces`); the native leaf may still be shown alone (it is the
  * unpatched building), never the reconstruction without it. A native leaf
  * bound by SHA is pulled into the closure. Reconstructions of one `objectId`
  * are one atomic cohort. */
 externalSources?:readonly {leaf:T;bounds:BuildingFocusRect;replaces?:readonly BuildingFocusReplacement[];objectId?:string}[];
 /** Owner-protected cohorts: atomic and admitted first within the original allowance. */
 ownerCohorts:readonly (readonly T[])[];
 /** Display-integrity cohorts (for example a relation outline and the leaves
  * of its parts): atomic, but without owner priority. */
 atomicCohorts?:readonly (readonly T[])[];
 ownerObjects?:readonly (readonly {objectId:string;partId?:string}[])[];
 /** Bounded, on-demand real descriptors for metadata-located members outside
  * the current catalogue window, through the provider's own validated index
  * reader. A member it cannot supply keeps its whole cohort deferred. */
 resolveDescriptors?(requests:readonly BuildingFocusLocatedLeaf[],signal:AbortSignal):Promise<ReadonlyMap<string,T>>;
 frame:ModelViewProjectionSnapshot;
 /** `components` are the leaf's producer-bound component boxes (absent for an
  * external source): the provider charges only the share of the leaf that its
  * own display admission would count as in view. */
 describe(leaf:T,previous?:BuildingFocusCost,components?:readonly Pick<BuildingDetailComponent,'origin'|'box'>[]):Promise<BuildingFocusRepresentations>;
 previous?:readonly BuildingFocusAdmission[];
 maxVisible:number;maxBytes:number;maxVertices:number;
 coverageRatio:number;signal:AbortSignal;
 /** Monotonic time and display grace for still-visible displayed cohorts. */
 now?:number;holdMs?:number;
 /** Keep this plan's leaf metadata leased after a successful plan: called once
  * with the function that releases it. The next plan of the same view then
  * finds the documents still held instead of reading them again. Without it,
  * or when the plan fails, the metadata is released before this returns. */
 retainMetadata?(release:()=>void):void;
}):Promise<BuildingFocusSelection<T>>{
 if(!options.frame.buildingFocus)throw Error('Missing building focus projection window');
 if(![options.maxVisible,options.maxBytes,options.maxVertices].every(value=>Number.isSafeInteger(value)&&value>=0)||options.maxVisible<1||!Number.isFinite(options.coverageRatio)||options.coverageRatio<=0)throw Error('Invalid building focus source budget');
 const external=new Map((options.externalSources??[]).map(row=>[key(row.leaf),row]));
 if(external.size!==(options.externalSources??[]).length)throw Error('Duplicate focus external source');
 const known=new Map([...options.canonicalLeaves,...(options.externalSources??[]).map(row=>row.leaf)].map(leaf=>[key(leaf),leaf]));
 // A native leaf named by SHA in a candidate reconstruction's replacesNative
 // rows is part of what that reconstruction needs: read its metadata too.
 const candidateKeys=new Set(options.candidates.map(key)),bySHA=new Map(options.canonicalLeaves.map(leaf=>[leaf.sha256,leaf]));
 const pulled=(options.externalSources??[]).filter(row=>candidateKeys.has(key(row.leaf))).flatMap(row=>(row.replaces??[]).flatMap(r=>{const leaf=r.nativeLeafSHA256?bySHA.get(r.nativeLeafSHA256):undefined;return leaf&&!candidateKeys.has(key(leaf))?[leaf]:[];}));
 const closure=await acquireBuildingFocusClosure({resolver:options.resolver,candidates:[...options.candidates,...new Map(pulled.map(leaf=>[key(leaf),leaf])).values()],canonicalLeaves:options.canonicalLeaves,externalLeaves:(options.externalSources??[]).map(row=>row.leaf),ownerCohorts:[...options.ownerCohorts,...(options.atomicCohorts??[])],maxLeaves:Math.max(256,options.maxVisible*2),signal:options.signal,retain:!!options.retainMetadata});
 let retained=false;
 try{
  const documents=closure.documents,dependencies:string[][]=closure.dependencies.map(group=>[...group]),blocked=new Set<string>();
  for(const queries of options.ownerObjects??[]){
   const matches=queries.map(query=>documents.filter(doc=>doc.components.some(c=>c.objectId===query.objectId&&(query.partId===undefined||c.partId===query.partId))).map(doc=>doc.leaf.key));
   if(matches.every(rows=>!rows.length))continue;
   // A recipe partner outside this closure cannot be named by leaf: the matched
   // leaves wait as one deferred cohort instead of failing the whole layer.
   if(matches.some(rows=>!rows.length)){for(const row of matches.flat())blocked.add(row);continue;}
   dependencies.push([...new Set(matches.flat())]);
  }
  // Owner reconstruction -> displaced native part: a one-way display
  // requirement. Reconstructions of one object form one atomic cohort.
  const requires:[string,string[]][]=[],siblings=new Map<string,string[]>();
  for(const leaf of closure.externalLeaves){
   const row=external.get(key(leaf)),replaces=row?.replaces??[];
   if(row?.objectId){const group=siblings.get(row.objectId)??[];group.push(key(leaf));siblings.set(row.objectId,group);}
   const natives=documents.filter(doc=>doc.components.some(c=>replaces.some(r=>r.objectId===c.objectId&&r.partId===c.partId&&(r.nativeLeafSHA256===undefined||r.nativeLeafSHA256===doc.leaf.sha256)))).map(doc=>doc.leaf.key);
   if(natives.length)requires.push([key(leaf),[...new Set(natives)]]);
  }
  for(const group of siblings.values())if(group.length>1)dependencies.push(group);
  const located=closure.located;
  if(located.length&&options.resolveDescriptors){
   const resolved=await options.resolveDescriptors(located,options.signal);options.signal.throwIfAborted();
   for(const [binding,leaf] of resolved){
    const request=located.find(row=>row.key===binding);
    if(!request||key(leaf)!==binding||leaf.id!==request.id||leaf.sha256!==request.sha256)throw Error('Focus located descriptor mismatch');
    if(!known.has(binding))known.set(binding,leaf);
   }
  }
  const previous=new Map((options.previous??[]).map(row=>[row.key,row]));
  const units:(BuildingFocusUnit&{retained?:BuildingFocusCost})[]=[];
  const missing={left:NaN,top:NaN,right:NaN,bottom:NaN};
  for(const doc of documents){
   options.signal.throwIfAborted();const leaf=known.get(doc.leaf.key),bounds=projectBuildingFocusCohort(options.frame,doc.components)??missing;
   if(!leaf||blocked.has(doc.leaf.key)){
    // Verified metadata names it, but no validated descriptor fits this plan,
    // or its recipe partner is outside this closure.
    if(!leaf&&!located.some(row=>row.key===doc.leaf.key))throw Error('Focus closure source descriptor missing');
    units.push({key:doc.leaf.key,bounds,detail:{resourceKey:'focus-unavailable:'+doc.leaf.key,bytes:0,vertices:0,painted:false},unavailable:true});continue;
   }
   const costs=await options.describe(leaf,previous.get(doc.leaf.key)?.cost,doc.components);options.signal.throwIfAborted();
   units.push({key:doc.leaf.key,bounds,...costs});
  }
  for(const leaf of closure.externalLeaves){
   options.signal.throwIfAborted();const row=external.get(key(leaf));if(!row)throw Error('Focus external source descriptor missing');
   const costs=await options.describe(row.leaf,previous.get(key(leaf))?.cost);options.signal.throwIfAborted();
   units.push({key:key(leaf),bounds:row.bounds,...costs});
  }
  const unitByKey=new Map(units.map(unit=>[unit.key,unit]));
  const loadable=(unit:typeof units[number]|undefined,resourceKey:string)=>!!unit&&!unit.unavailable&&[unit.detail,unit.coarse,unit.retained].some(cost=>cost?.resourceKey===resourceKey);
  // A previous representation is reused only if the provider confirms it can
  // still acquire exactly that resource; otherwise the hold is cancelled.
  // It is charged at this view's cost of that same representation: the share
  // of a leaf that is in view changes with the camera.
  const fullPrevious=options.previous??[],stillLoadable=fullPrevious.filter(row=>loadable(unitByKey.get(row.key),row.cost.resourceKey)).map(row=>{
   const unit=unitByKey.get(row.key)!,cost=[unit.detail,unit.coarse,unit.retained].find(candidate=>candidate?.resourceKey===row.cost.resourceKey)!;
   return{...row,cost};
  });
  const w=options.frame.buildingFocus;
  // Resizing must not steal the already available central detail allowance.
  // Peripheral content spends only the remaining shared limit, never extra RAM.
  const core={bytes:options.maxBytes,vertices:options.maxVertices,units:options.maxVisible,paintedUnits:options.maxVisible};
  const share=BUILDING_FOCUS_PERIPHERAL_SHARE;
  const outer={bytes:Math.floor(options.maxBytes*share.budget),vertices:Math.floor(options.maxVertices*share.budget),units:Math.floor(options.maxVisible*share.budget),paintedUnits:Math.max(1,Math.floor(options.maxVisible*share.paintedUnits))};
  const priority=[...new Set(options.ownerCohorts.flat().map(key))].filter(id=>unitByKey.has(id));
  const planned=planBuildingFocusAdmission({window:w,units,dependencies,requires,priority,core,peripheral:outer,total:core,coverageRatio:options.coverageRatio,previous:stillLoadable,now:options.now,holdMs:options.holdMs});
  const next=new Map(planned.admitted.map(row=>[row.key,row]));
  for(const row of planned.admitted)if(!loadable(unitByKey.get(row.key),row.cost.resourceKey)||!known.has(row.key))throw Error('Focus retained representation is no longer available');
  // Retirement is relative to everything displayed before, including holds
  // cancelled because their representation is no longer loadable.
  const plan:BuildingFocusPlan=Object.freeze({...planned,retired:fullPrevious.filter(row=>next.get(row.key)?.cost.resourceKey!==row.cost.resourceKey)});
  const unresolved=located.filter(row=>!known.has(row.key)).length;
  const deferredCore=units.filter(unit=>{if(unit.unavailable||next.has(unit.key))return false;const region=buildingFocusRegion(w,unit.bounds);return region==='core'||region==='unknown';}).length;
  // The provider loads and trims in this order. A peripheral sample is admitted
  // after the grace holds when it is new and before them once it is resident,
  // so the admission order of one unchanged view differed between its first
  // and its second plan (a re-pack, and a different leaf trimmed first). The
  // order handed out is therefore fixed: what was admitted on merit near the
  // centre, then holds, then peripheral samples by key.
  const rank=(row:BuildingFocusAdmission)=>row.grace?1:row.region==='peripheral'?2:0;
  const ordered=plan.admitted.map((row,at)=>({row,at})).sort((a,b)=>rank(a.row)-rank(b.row)||(rank(a.row)===2?(a.row.key<b.row.key?-1:a.row.key>b.row.key?1:0):a.at-b.at)).map(entry=>entry.row);
  const result={plan,sources:ordered.map(row=>({leaf:known.get(row.key)!,resourceKey:row.cost.resourceKey,region:row.region,cost:row.cost,detail:unitByKey.get(row.key)!.detail,held:!!row.grace})),
   partial:deferredCore>0||unresolved>0||blocked.size>0,deferredCore,located:located.length,unresolved,blocked:blocked.size};
  // Nothing can fail after this point: the caller now owns the metadata.
  if(options.retainMetadata){options.retainMetadata(closure.release);retained=true;}
  return result;
 }finally{if(!retained)closure.release();}
}
