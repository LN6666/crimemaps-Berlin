import {prepareFamilyPaintSource,specializePreparedFamilyPaintSource,type PreparedFamilyPaintSource} from './family-paint-program';
import type {PreparedSourceOwner,PreparedSourceRecipe,PreparedSourceResult,PreparedSourceStats} from './prepared-source-contract';
import {estimateShaderSourceWorkspace,normalizeShaderSourceBounds,shaderSourceWorkspaceCosts,validateShaderSourceSyntax,type ShaderSourceBounds,type ShaderSourceBudgetIdentities,type ShaderSourceWorkspaceEstimate} from './render-runtime/shader-source-budget';
import {ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import type {ProgramPreparationBudget} from './render-runtime/program-preparation';
import {registerPressureAvailability,PressureAvailabilityBudgetError,type PressureAvailabilityRegistration,type PressureSnapshotWriter,type PressureAdmissionProbe} from './render-runtime/pressure-availability';

export type PreparedSourceWorkspaceOptions={
 build:(recipe:PreparedSourceRecipe)=>string;current:()=>boolean;clear?:()=>void;
 budget?:ResourceBudget;bounds?:(recipe:PreparedSourceRecipe)=>ShaderSourceBounds;
 /** Only a caller that has audited its clear callback may opt into bounded
  * metadata-hint retries. Unmarked public callers remain unsupported. */
 metadataHintSafe?:true;
 /** Preserve provider-specific transforms; no generic base parser is retained.
  * Its transient allowance is the current-paint-program phase model (analysis
  * 'custom' in shader-source-budget): analyses one after another, holding at
  * most one earlier fragment, and none without a family value. Another
  * transform needs its own envelope. */
 specialize?:(source:string,families:readonly number[])=>PreparedSourceResult;
};
export type PreparedSourceWorkspace=PreparedSourceOwner&{programBudget(recipe:PreparedSourceRecipe,vertexSource:string,attributes:readonly string[],families?:readonly number[]):ProgramPreparationBudget};
type Claim={reservation:ResourceBudgetReservation|undefined;identities:ShaderSourceBudgetIdentities;bounds:ShaderSourceBounds;estimate:ShaderSourceWorkspaceEstimate;costs:readonly ResourceBudgetCost[];inputValues:number;users:number;specializers:number;retired:boolean;reclaimOnIdle:boolean};
type ScratchUse={reservation:ResourceBudgetReservation;costs:readonly ResourceBudgetCost[];claim:Claim};
type Entry={sourceKey:string;inputs:readonly unknown[];source:string;analysis:PreparedFamilyPaintSource|undefined;claim:Claim|undefined};
type Attempt={claim:Claim|undefined;version:number;sourceKey:string;scratchDirty:boolean;slot:ShaderSourceBudgetIdentities};
const newIdentities=():ShaderSourceBudgetIdentities=>Object.freeze({text:{},metadata:{},scratch:{}});

/** One reusable base source/analysis and its real workspace claim. Family
 * outputs remain owned by their program tickets; this stores no result cache. */
export function createPreparedSourceWorkspace(options:PreparedSourceWorkspaceOptions):PreparedSourceWorkspace{
 return createWorkspace(options.build,options.current,options.clear,options.budget,options.bounds,options.specialize,options.metadataHintSafe===true);
}
function createWorkspace(build:PreparedSourceWorkspaceOptions['build']|undefined,current:PreparedSourceWorkspaceOptions['current']|undefined,clear:PreparedSourceWorkspaceOptions['clear'],budget:ResourceBudget|undefined,bounds:PreparedSourceWorkspaceOptions['bounds'],customSpecialize:PreparedSourceWorkspaceOptions['specialize'],metadataHintSafe:boolean):PreparedSourceWorkspace{
 let entry:Entry|undefined,building:Attempt|undefined,released=false,revision=0,identities=newIdentities();
 let builds=0,analyses=0,hits=0,replacements=0,clears=0;
 const metered=!!budget,analysisKind=customSpecialize?'custom':'family',claims=new Set<Claim>(),scratchUses=new Set<ScratchUse>(),retiring=new Set<Claim>(),abort=()=>new DOMException('Prepared source workspace is no longer current','AbortError');
 const budgetWait=(error:unknown)=>error instanceof Error&&error.name==='ResourceBudgetExceededError';
 let pressureAvailability:PressureAvailabilityRegistration|undefined,stopPressure:(()=>void)|undefined,registeringPressure=false;
 const notifyPressure=()=>pressureAvailability?.notify();
 const claimState=(writer:PressureSnapshotWriter,claim:Claim|undefined)=>{
  if(!claim){writer.value(null);return;}writer.open();writer.value(claim.users);writer.value(claim.specializers);writer.value(claim.retired);writer.value(claim.reclaimOnIdle);writer.value(claim.inputValues);writer.value(claim.estimate.sourceBytesEstimate);writer.value(claim.reservation?.active??false);writer.value(claim.reservation?.bytes??0);writer.value(claim.reservation?.recent??false);
  writer.open();for(const cost of claim.costs){writer.open();writer.value(cost.category);writer.value(cost.bytes);writer.value(cost.precision);writer.value(cost.label??null);writer.close();}writer.close();writer.close();
 };
 const pressureState=(writer:PressureSnapshotWriter)=>{
  writer.open();if(entry){writer.open();writer.value(entry.sourceKey);writer.value(entry.inputs.length);claimState(writer,entry.claim);writer.close();}else writer.value(null);
  if(building){writer.open();writer.value(building.sourceKey);writer.value(building.scratchDirty);claimState(writer,building.claim);writer.close();}else writer.value(null);
  writer.value(retiring.size);writer.value(scratchUses.size);writer.close();
 };
 // Describing another queued recipe must not evict this reusable base. A real
 // refused admission may reclaim it, including the old-slot or larger-base
 // excess which would otherwise make the workspace wait for its own bytes.
 function admissionProbe(pageBudget:ResourceBudget):PressureAdmissionProbe{
  let admitted:PressureAvailabilityRegistration|undefined;
  return Object.freeze({safe:metadataHintSafe,budget:pageBudget,probe(){
   if(released||budget!==pageBudget)return{status:'stale' as const};
   let valid=false;try{valid=!!current?.();}catch{/* A failed guard is not a current demand. */}if(!valid)return{status:'stale' as const};
   if(pressureAvailability)return{status:'ready' as const};
   try{ensurePressure(false);admitted=pressureAvailability;return{status:admitted?'ready' as const:'stale' as const};}
   catch(error){if(error instanceof ResourceBudgetExceededError)return error.details.additionalBytes>error.details.capacity?{status:'unfit' as const,error}:{status:'pending' as const};if(error instanceof DOMException&&error.name==='AbortError')return{status:'stale' as const};throw error;}
  },rollback(){
   if(!admitted||pressureAvailability!==admitted||entry||building)return;
   const registration=pressureAvailability,off=stopPressure;pressureAvailability=undefined;stopPressure=undefined;admitted=undefined;
   try{off?.();}finally{registration.release();}
  }});
 }
 function ensurePressure(wrapRefusal=true){
  if(!budget||pressureAvailability)return;if(registeringPressure)throw abort();
  const pageBudget=budget;let registration:PressureAvailabilityRegistration|undefined,off:(()=>void)|undefined;registeringPressure=true;
  try{
   registration=registerPressureAvailability(pageBudget,'prepared-source',pressureState);
   if(released||budget!==pageBudget)throw abort();
   off=pageBudget.onPressure(pressure=>{
    const claim=entry?.claim??building?.claim;
    if(released||!claim||claim.retired||!budget||pressure.constraint==='recent')return;
    if(budget.stats.bytes+pressure.additionalBytes<=pressure.capacity)return;
    if(building||claim.users){if(!claim.reclaimOnIdle){claim.reclaimOnIdle=true;notifyPressure();}return;}
    replacements++;clearPreparedSource();
   },metadataHintSafe?'metadata-hint-v1':undefined);
   if(released||budget!==pageBudget)throw abort();
   pressureAvailability=registration;stopPressure=off;
  }catch(error){off?.();registration?.release();if(wrapRefusal&&error instanceof ResourceBudgetExceededError)throw new PressureAvailabilityBudgetError(error,admissionProbe(pageBudget));throw error;}finally{registeringPressure=false;}
 }
 function releaseClaim(claim:Claim){const reservation=claim.reservation;claim.reservation=undefined;claim.costs=[];claims.delete(claim);retiring.delete(claim);notifyPressure();reservation?.release();}
 function retireClaim(claim:Claim|undefined){
  if(!claim||claim.retired)return;claim.retired=true;notifyPressure();
  if(claim.users){retiring.add(claim);notifyPressure();if(identities===claim.identities)identities=newIdentities();claim.reservation?.markRetiring();for(const use of scratchUses)if(use.claim===claim)use.reservation.markRetiring();}
  else releaseClaim(claim);
 }
 function retainBaseClaim(claim:Claim){
  const reservation=claim.reservation;if(!reservation||claim.retired)return;
  const previous=claim.costs,costs=shaderSourceWorkspaceCosts(claim.bounds,claim.identities,{sourceCharacters:claim.estimate.sourceBytesEstimate/2,inputValues:claim.inputValues,analysis:analysisKind,retained:true});
  claim.costs=costs;if(!reservation.adjust(costs)&&claim.reservation===reservation)claim.costs=previous;notifyPressure();
 }
 function finishUse(claim:Claim|undefined){
  if(!claim)return;claim.users--;notifyPressure();if(claim.users)return;if(claim.retired){releaseClaim(claim);return;}
  if(!claim.reservation)return;
  const wake=claim.reclaimOnIdle;claim.reclaimOnIdle=false;notifyPressure();
  retainBaseClaim(claim);
  // A waiter may have arrived while this entry was on a producer's stack.
  // Only the last use makes it reclaimable; ticket polling never sends wakes.
  if(wake&&entry?.claim===claim&&!building&&!claim.retired)budget?.notifyReclaimable?.();
 }
 function detach(){
  const previous=entry,attempt=building,claims=new Set<Claim>();revision++;
  // Rotate before invoking facade cleanup or capacity callbacks. An older
  // build/specializer may still own stack-local source while they re-enter.
  if(previous?.claim?.users&&identities===previous.claim.identities||attempt&&identities===attempt.slot)identities=newIdentities();
  if(previous||attempt)clears++;entry=undefined;building=undefined;notifyPressure();
  if(previous){if(previous.claim)claims.add(previous.claim);previous.claim=undefined;previous.source='';previous.analysis=undefined;previous.inputs=[];}
  if(attempt?.claim){claims.add(attempt.claim);attempt.claim=undefined;}
  return claims;
 }
 function clearState(cleanupScratch:boolean){
  const oldClaims=detach(),cleanup=cleanupScratch?clear:undefined;
  // Clear old facade scratch before releasing capacity: availability callbacks
  // may synchronously construct a newer workspace, which this clear must keep.
  try{cleanup?.();}finally{for(const claim of oldClaims)retireClaim(claim);}
 }
 function clearPreparedSource(){if(!released)clearState(true);}
 function checkCurrent(version?:number){
  let valid=false;try{valid=!released&&!!current?.();}catch{/* A failed guard is not a current demand. */}
  if(!valid||released){if(version===undefined||version===revision)try{clearPreparedSource();}finally{throw abort();}throw abort();}
  if(version!==undefined&&version!==revision)throw abort();
 }
 function sourceBounds(recipe:PreparedSourceRecipe){const value=recipe.sourceBounds??bounds?.(recipe);if(!value)throw new Error('Prepared source requires a pre-build source/assembly bound');return normalizeShaderSourceBounds(value);}
 function sameRecipe(recipe:PreparedSourceRecipe,value:Entry){return value.sourceKey===recipe.sourceKey&&value.inputs.length===recipe.inputs.length&&value.inputs.every((input,index)=>Object.is(input,recipe.inputs[index]));}
 function specialize(value:Entry,families:readonly number[],version:number):PreparedSourceResult{
  const claim=value.claim,transform=customSpecialize;let analysis=value.analysis,source=value.source,use:ScratchUse|undefined;
  if(claim){claim.users++;claim.specializers++;notifyPressure();}
  try{
   if(claim&&budget){
    // A nested invocation shares immutable base text/analysis, but owns its
    // own temporary bodies/maps. Never alias two simultaneously active stacks.
    const slot=claim.specializers>1?Object.freeze({...claim.identities,scratch:{}}):claim.identities;
    const costs=shaderSourceWorkspaceCosts(claim.bounds,slot,{sourceCharacters:source.length,inputValues:claim.inputValues,analysis:analysisKind,familyValues:families.length,prepared:true});
    const reservation=budget.reserve(costs,{label:'prepared source specialization'});use={reservation,costs,claim};scratchUses.add(use);notifyPressure();
   }
   checkCurrent(version);const result=transform?transform(source,families):specializePreparedFamilyPaintSource(analysis!,families);
   if(claim&&result.fragment.length>claim.bounds.sourceCharactersUpperBound)throw new RangeError('Specialized source exceeded its declared program source bound');
   analysis=undefined;source='';checkCurrent(version);return result;
  }catch(error){
   // A valid base survives backpressure; the program owner retries admission.
   if(!budgetWait(error)&&revision===version&&entry===value)try{clearState(false);}catch{/* Preserve the original family error. */}throw error;
  }finally{
   analysis=undefined;source='';if(claim){claim.specializers--;notifyPressure();}
   if(use){scratchUses.delete(use);notifyPressure();use.reservation.release();}finishUse(claim);
  }
 }
 function programBudget(recipe:PreparedSourceRecipe,vertexSource:string,attributes:readonly string[],families:readonly number[]=[]):ProgramPreparationBudget{
  checkCurrent();if(!budget)throw new Error('Prepared source program preflight requires the page ResourceBudget');
  const version=revision,description=sourceBounds(recipe);checkCurrent(version);
  // This is only a description. Keep the current base/analysis for other
  // families until production actually switches recipe or capacity is needed.
  const matching=entry&&sameRecipe(recipe,entry)?entry.claim:undefined;
  const active=[entry?.claim,building?.claim].find(claim=>claim?.users&&claim.identities===identities);
  if(active&&!matching)identities=newIdentities();
  const slot=matching?matching.specializers?Object.freeze({...matching.identities,scratch:{}}):matching.identities:identities;
  const sourceBytesUpperBound=2*(description.sourceCharactersUpperBound+vertexSource.length+attributes.reduce((sum,name)=>sum+name.length,0));
  if(!Number.isSafeInteger(sourceBytesUpperBound))throw new RangeError('Program source bound exceeds the safe integer range');
  return Object.freeze({sourceBytesUpperBound,workspaceCosts:shaderSourceWorkspaceCosts(matching?.bounds??description,slot,{...(matching?{sourceCharacters:entry!.source.length,prepared:true}:{}),analysis:analysisKind,inputValues:recipe.inputs.length,familyValues:families.length})});
 }
 return{
  programBudget,
  prepareSource(recipe:PreparedSourceRecipe,families:readonly number[]):PreparedSourceResult{
   checkCurrent();ensurePressure();checkCurrent();if(entry&&sameRecipe(recipe,entry)){hits++;return specialize(entry,families,revision);}
   if(entry||building){if(entry)replacements++;clearPreparedSource();checkCurrent();if(entry||building)throw abort();}
   const version=revision,sourceKey=recipe.sourceKey,attempt:Attempt={version,sourceKey,claim:undefined,scratchDirty:false,slot:identities},inputs=Object.freeze([...recipe.inputs]);building=attempt;notifyPressure();
   let source:string|undefined,analysis:PreparedFamilyPaintSource|undefined,next:Entry|undefined,claim:Claim|undefined,paintSource:string|undefined;
   try{
    const description=budget?sourceBounds(recipe):undefined;checkCurrent(version);
    if(budget&&description){
     const slot=attempt.slot,costs=shaderSourceWorkspaceCosts(description,slot,{analysis:analysisKind,inputValues:inputs.length,familyValues:families.length}),reservation=budget.reserve(costs,{label:'prepared source '+sourceKey.slice(0,128)});
     claim={reservation,identities:slot,bounds:description,estimate:estimateShaderSourceWorkspace(description,description.sourceCharactersUpperBound,{analysis:analysisKind,inputValues:inputs.length,familyValues:families.length}),costs,inputValues:inputs.length,users:1,specializers:0,retired:false,reclaimOnIdle:false};claims.add(claim);
     if(building!==attempt||revision!==version){retireClaim(claim);throw abort();}attempt.claim=claim;notifyPressure();
    }
    try{
     builds++;attempt.scratchDirty=true;notifyPressure();paintSource=build!(recipe);checkCurrent(version);
     if(description&&paintSource.length>description.paintSourceCharactersUpperBound)throw new RangeError('Paint source exceeded its pre-build bound');
     source=recipe.assemble(paintSource);paintSource=undefined;checkCurrent(version);
     if(description&&source.length>description.sourceCharactersUpperBound)throw new RangeError('Assembled source exceeded its pre-build bound');
    }finally{paintSource=undefined;if(building===attempt&&revision===version){attempt.scratchDirty=false;notifyPressure();clear?.();}}
    checkCurrent(version);if(source===undefined)throw new Error('Prepared source builder did not return an assembled source');
    if(description){
     const observed=validateShaderSourceSyntax(source,description.syntaxUpperBound);
     // The pre-build envelope still admits the complete producer. After its
     // exact output is known, charge the parser for that output's syntax rather
     // than retaining the much larger unpruned assembly envelope indefinitely.
     // Keep all text/assembly bounds and the original container policy intact.
     if(claim)claim.bounds=Object.freeze({...description,syntaxUpperBound:observed});
    }
    if(!customSpecialize){analyses++;analysis=prepareFamilyPaintSource(source);}checkCurrent(version);
    next={sourceKey,inputs,source,analysis,claim};entry=next;building=undefined;attempt.claim=undefined;source=undefined;analysis=undefined;notifyPressure();
    if(claim){
     claim.estimate=estimateShaderSourceWorkspace(claim.bounds,next.source.length,{analysis:analysisKind,inputValues:inputs.length,familyValues:families.length});notifyPressure();
     // Assembly and generic parsing have returned and their temporary values
     // are gone. Keep the immutable base pinned, but end that scratch claim
     // before specialization acquires its own independently owned workspace.
     retainBaseClaim(claim);checkCurrent(version);
    }
    return specialize(next,families,version);
   }catch(error){
    const keepBase=budgetWait(error)&&next!==undefined&&entry===next;
    if(!keepBase&&(building===attempt||entry===next&&next!==undefined))try{clearState(attempt.scratchDirty);}catch{/* Preserve the originating failure. */}
    if(!keepBase&&claim&&!claim.retired)retireClaim(claim);throw error;
   }finally{paintSource=undefined;source=undefined;analysis=undefined;next=undefined;finishUse(claim);}
  },
  clearPreparedSource,
  get preparedSourceStats():PreparedSourceStats{
   const active=entry?.claim??building?.claim,allocations=new Map<object|string,ResourceBudgetCost>(),retiredAllocations=new Map<object|string,ResourceBudgetCost>();
   const include=(costs:readonly ResourceBudgetCost[],retired:boolean)=>{for(const cost of costs){const id=cost.identity??cost,previous=allocations.get(id);if(!previous||cost.bytes>previous.bytes)allocations.set(id,cost);if(retired){const old=retiredAllocations.get(id);if(!old||cost.bytes>old.bytes)retiredAllocations.set(id,cost);}}};
   for(const claim of claims)include(claim.costs,claim.retired);for(const use of scratchUses)include(use.costs,use.claim.retired);
   const values=[...allocations.values()],sum=(category:ResourceBudgetCost['category'])=>values.filter(value=>value.category===category).reduce((total,value)=>total+value.bytes,0),sourceBytesEstimate=sum('program-source'),scratchBytesEstimate=sum('construction'),owned=values.reduce((total,value)=>total+value.bytes,0),analysisBytesEstimate=[...claims].reduce((total,value)=>total+value.estimate.analysisBytesEstimate,0),entryMetadataBytesEstimate=[...claims].reduce((total,value)=>total+value.estimate.entryMetadataBytesEstimate,0),authority=active?.bounds.authorityTrace??[];
   return Object.freeze({builds,analyses,hits,replacements,clears,sourceCharacters:entry?.source.length??0,released,budget:Object.freeze({accounting:metered?'logical-shader-workspace-estimate':'unmetered',physicalMemory:'unmeasured',ownedBytesEstimate:metered?owned:null,sourceBytesEstimate:metered?sourceBytesEstimate:null,entryMetadataBytesEstimate:metered?entryMetadataBytesEstimate:null,analysisBytesEstimate:metered?analysisBytesEstimate:null,scratchBytesEstimate:metered?scratchBytesEstimate:null,retiringBytesEstimate:[...retiredAllocations.values()].reduce((total,value)=>total+value.bytes,0),policy:active?.estimate.policy??null,authorityTrace:Object.freeze(authority.slice(0,32).map(value=>value.slice(0,256))),authorityTraceTruncated:authority.length>32})});
  },
  release(){
   if(released)return;released=true;stopPressure?.();stopPressure=undefined;const oldClaims=detach(),cleanup=clear;pressureAvailability?.release();pressureAvailability=undefined;build=undefined;current=undefined;clear=undefined;bounds=undefined;budget=undefined;customSpecialize=undefined;
   try{cleanup?.();}finally{for(const claim of oldClaims)retireClaim(claim);}
  },
 };
}
