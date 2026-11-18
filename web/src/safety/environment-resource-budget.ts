import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {resourceByteAdmittedEnvelope,ResourceByteDeliveryRefusedError,type ResourceByteEnvelope} from './resource-byte-transport';

/** Environment/vehicle admission onto the ONE page ResourceBudget.
 * This module owns no scheduler, timer, queue or decoded cache. Decoded source
 * values live in the page ChunkResourceStore; per-instance CPU/GPU storage is
 * charged by direct reservations that the owning renderer releases. All bytes
 * here are logical ledger bytes: typed arrays are exact, JS containers and
 * decode working sets are documented estimates, never physical memory. */

export class EnvironmentResourcePendingError extends Error{
 readonly code='ENVIRONMENT_RESOURCE_PENDING';
 readonly retryable=true;
 /** label is the admission phase; subject is the ledger's own claim label. */
 constructor(readonly label:string,readonly requiredBytes:number,readonly pressure:ResourceBudgetPressure|undefined,readonly subject?:string){
  super(('Environment resource '+label+' waits for '+requiredBytes+' logical bytes on the page budget').slice(0,1024));
  this.name='EnvironmentResourcePendingError';
 }
}
/** A claim larger than the whole page limit can never be admitted by waiting. */
export class EnvironmentResourceUnfitError extends Error{
 readonly code='ENVIRONMENT_RESOURCE_UNFIT';
 readonly retryable=false;
 constructor(readonly label:string,readonly requiredBytes:number,readonly limitBytes:number,readonly recent:boolean,readonly subject?:string){
  super(('Environment resource '+label+' requires '+requiredBytes+' logical bytes, above the page '+(recent?'recent ':'')+'budget limit '+limitBytes).slice(0,1024));
  this.name='EnvironmentResourceUnfitError';
 }
}
/** A caller-admitted read whose delivery was refused again after its one
 * retry with the larger envelope the first refusal named: as final as unfit
 * (never retried or awaited again), but its retry claim may be within the page
 * limit, so the message says what happened instead of claiming an excess. */
export class EnvironmentResourceRefusedAgainError extends EnvironmentResourceUnfitError{
 constructor(label:string,requiredBytes:number,limitBytes:number,readonly envelopeBytes:number,subject?:string){
  super(label,requiredBytes,limitBytes,false,subject);
  this.message=('Environment resource '+label+' was refused again after its retry with the named '+envelopeBytes+'-byte envelope (that retry claim: '+requiredBytes+' logical bytes; page budget limit '+limitBytes+')').slice(0,1024);
  this.name='EnvironmentResourceRefusedAgainError';
 }
}

const abortError=()=>new DOMException('Environment resource demand superseded','AbortError');
const shortLabel=(label:string)=>label.slice(0,256);
const subjectOf=(label:string|undefined)=>label===undefined?undefined:label.slice(0,512);

/** The first page owner configures the profile; a later mismatch reuses it. */
export function environmentResourceStore(mobile?:boolean,store?:ChunkResourceStore):ChunkResourceStore{
 if(store)return store;
 try{return getPageChunkResourceStore(mobile===undefined?{}:{profile:mobile?'mobile':'desktop'});}
 catch{return getPageChunkResourceStore();}
}

/** Bytes of one claim with the same identity de-duplication as the ledger. */
export function environmentClaimBytes(costs:readonly ResourceBudgetCost[]):number{
 let anonymous=0;const shared=new Map<object|string,number>();
 for(const cost of costs){
  const bytes=Math.ceil(cost.bytes);
  if(cost.identity===undefined)anonymous+=bytes;else shared.set(cost.identity,Math.max(bytes,shared.get(cost.identity)??0));
 }
 let total=anonymous;for(const bytes of shared.values())total+=bytes;return total;
}

/** Classify ledger refusal: a claim whose own additional bytes exceed the
 * capacity is unfit; anything else waits for an actual release. */
export function environmentAdmissionError(error:unknown,label:string):EnvironmentResourcePendingError|EnvironmentResourceUnfitError|undefined{
 if(error instanceof EnvironmentResourcePendingError||error instanceof EnvironmentResourceUnfitError)return error;
 if(!(error instanceof ResourceBudgetExceededError))return undefined;
 const details=error.details,total=details.additionalBytes>details.capacity,recentAdditional=Math.max(0,details.recentRequired-details.recentCurrent),recent=details.constraint!=='total'&&recentAdditional>details.recentCapacity;
 if(total||recent)return new EnvironmentResourceUnfitError(label,total?details.additionalBytes:recentAdditional,total?details.capacity:details.recentCapacity,!total,subjectOf(details.label));
 return new EnvironmentResourcePendingError(label,details.additionalBytes,details,subjectOf(details.label));
}

/** Synchronous admission before an allocation. Throws Pending/Unfit, never a
 * partial reservation, and never mutates the caller's state. */
export function reserveEnvironmentCosts(budget:ResourceBudget,costs:readonly ResourceBudgetCost[],label:string,options:{recent?:boolean}={}):ResourceBudgetReservation{
 const required=environmentClaimBytes(costs),stats=budget.stats;
 if(required>stats.limitBytes)throw new EnvironmentResourceUnfitError(label,required,stats.limitBytes,false);
 if(options.recent&&required>stats.recentLimitBytes)throw new EnvironmentResourceUnfitError(label,required,stats.recentLimitBytes,true);
 const result=budget.tryReserve(costs,{label:shortLabel(label),recent:options.recent});
 if(result.ok)return result.reservation;
 throw environmentAdmissionError(result.error,label)??result.error;
}

/** One availability wake-up from the ledger, or the caller's abort. No timer. */
export function waitForEnvironmentBudget(budget:ResourceBudget,signal:AbortSignal):Promise<void>{
 return new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(signal.reason??abortError());return;}
  let done=false,off:(()=>void)|undefined;
  const finish=(error?:unknown)=>{
   if(done)return;done=true;signal.removeEventListener('abort',abort);
   const stop=off;off=undefined;stop?.();
   if(error===undefined)resolve();else reject(error);
  };
  const abort=()=>finish(signal.reason??abortError());
  signal.addEventListener('abort',abort,{once:true});
  off=budget.onAvailable(()=>finish(),signal);
 });
}

export type EnvironmentAdmissionObserver={
 pending(phase:string,error:EnvironmentResourcePendingError):void;
 settled(phase:string):void;
 unfit(phase:string,error:EnvironmentResourceUnfitError):void;
};
/** Observable queue reason/owner/phase/bytes instead of an opaque incomplete flag.
 * committed (optional) returns the bytes of completed items the owner keeps
 * while a wait for its next item registers. Such a wait is an allowed exception
 * (DECISIONS 2026-11-02 03:25: what is kept is finished work, not work in
 * flight); it is counted in committedHoldWaits, with the phase and the kept
 * bytes of the latest one, so acceptance can see how often it occurs. Only
 * items the owner committed in its own 3D lifetime count: a page-lifetime value
 * a caller handed over at install (the water profile) is not one.
 * inFlight (optional) returns how many productions the owner keeps in flight
 * (preparing, not finished) while such a wait registers. That is not the
 * allowed exception; it is counted apart in inFlightHoldWaits, with the phase
 * and the count of the latest one, never mixed into committedHoldWaits. */
export function createEnvironmentAdmissionStats(owner:string,committed?:()=>number,inFlight?:()=>number):EnvironmentAdmissionObserver&{readonly stats:Readonly<Record<string,unknown>>;reset():void}{
 let waits=0,unfit=0,active=0,committedHoldWaits=0,lastCommittedHold:{phase:string;heldBytes:number}|undefined,inFlightHoldWaits=0,lastInFlightHold:{phase:string;heldProductions:number}|undefined,pending:{owner:string;phase:string;label:string;subject:string|undefined;requiredBytes:number;shortfallBytes:number;constraint:string;sinceMs:number}|undefined,lastUnfit:string|undefined;
 const held=()=>{try{const bytes=committed?.()??0;return Number.isFinite(bytes)&&bytes>0?Math.ceil(bytes):0;}catch{return 0;}};
 const flying=()=>{try{const count=inFlight?.()??0;return Number.isSafeInteger(count)&&count>0?count:0;}catch{return 0;}};
 return{
  pending(phase,error){waits++;active++;const kept=held(),preparing=flying();if(kept>0){committedHoldWaits++;lastCommittedHold={phase:phase.slice(0,256),heldBytes:kept};}if(preparing>0){inFlightHoldWaits++;lastInFlightHold={phase:phase.slice(0,256),heldProductions:preparing};}pending={owner,phase,label:error.label.slice(0,256),subject:error.subject?.slice(0,256),requiredBytes:error.requiredBytes,shortfallBytes:error.pressure?Math.max(error.pressure.shortfallBytes,error.pressure.recentShortfallBytes):0,constraint:error.pressure?.constraint??'total',sinceMs:performance.now()};},
  settled(){active=Math.max(0,active-1);if(!active)pending=undefined;},
  unfit(_phase,error){unfit++;lastUnfit=error.message;},
  reset(){active=0;pending=undefined;},
  get stats(){return Object.freeze({owner,waits,activeWaits:active,unfitAdmissions:unfit,committedHoldWaits,lastCommittedHold:lastCommittedHold?Object.freeze({...lastCommittedHold}):undefined,inFlightHoldWaits,lastInFlightHold:lastInFlightHold?Object.freeze({...lastInFlightHold}):undefined,pending:pending?Object.freeze({...pending}):undefined,lastUnfit});},
 };
}

/** Run a synchronous allocation attempt; wait only for a Pending refusal. */
export async function retryEnvironmentAdmission<T>(budget:ResourceBudget,signal:AbortSignal,phase:string,attempt:()=>T,observer?:EnvironmentAdmissionObserver):Promise<T>{
 for(;;){
  signal.throwIfAborted();
  let refusal:EnvironmentResourcePendingError|EnvironmentResourceUnfitError;
  try{return attempt();}
  catch(error){const classified=environmentAdmissionError(error,phase);if(!classified)throw error;refusal=classified;}
  if(refusal instanceof EnvironmentResourceUnfitError){observer?.unfit(phase,refusal);throw refusal;}
  observer?.pending(phase,refusal);
  try{await waitForEnvironmentBudget(budget,signal);}finally{observer?.settled(phase);}
 }
}
export function admitEnvironmentCosts(budget:ResourceBudget,costs:readonly ResourceBudgetCost[],label:string,signal:AbortSignal,observer?:EnvironmentAdmissionObserver):Promise<ResourceBudgetReservation>{
 return retryEnvironmentAdmission(budget,signal,label,()=>reserveEnvironmentCosts(budget,costs,label),observer);
}
/** Same as retryEnvironmentAdmission, but an admitted first attempt completes
 * synchronously so the caller keeps its original ordering and timing. */
export function attemptEnvironmentAdmission<T>(budget:ResourceBudget,signal:AbortSignal,phase:string,attempt:()=>T,observer?:EnvironmentAdmissionObserver):{admitted:true;value:T}|{admitted:false;pending:Promise<T>}{
 signal.throwIfAborted();
 try{return{admitted:true,value:attempt()};}
 catch(error){
  const refusal=environmentAdmissionError(error,phase);
  if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)observer?.unfit(phase,refusal);throw refusal??error;}
  observer?.pending(phase,refusal);
  const pending=waitForEnvironmentBudget(budget,signal).finally(()=>observer?.settled(phase)).then(()=>retryEnvironmentAdmission(budget,signal,phase,attempt,observer));
  return{admitted:false,pending};
 }
}

/** A revocable, low-priority cache role may enter the page recent subset only
 * when it fits there with no pressure: neither a byte nor an entry-count
 * eviction of another owner's recent entry is ever triggered on its behalf.
 * Total bytes are unchanged by the recent flag, so only the subset is checked. */
export function environmentRecentFits(store:ChunkResourceStore,bytes:number):boolean{
 if(store.budget.stats.recentAvailableBytes<Math.ceil(bytes))return false;
 // An unknown entry count is treated as full: skipping a warm copy is safe.
 const {recent,recentMaxEntries}=store.stats as {recent?:unknown;recentMaxEntries?:unknown};
 return typeof recent==='number'&&typeof recentMaxEntries==='number'&&recent<recentMaxEntries;
}

/** Completion of a shared store production for one consumer. The lease's
 * own release (not this wait) decides whether the production is cancelled. */
export function waitForEnvironmentLease(lease:ChunkResourceLease<unknown>,signal:AbortSignal):Promise<void>{
 return new Promise<void>((resolve,reject)=>{
  if(signal.aborted){reject(signal.reason??abortError());return;}
  let done=false;
  const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);if(error===undefined)resolve();else reject(error);};
  const abort=()=>finish(signal.reason??abortError());
  signal.addEventListener('abort',abort,{once:true});
  lease.ready.then(()=>finish(),error=>finish(error));
 });
}

/** Parse working-set bounds derived from the actual asset descriptor.
 * estimateRetainedBuildingPayload charges at most 24 bytes per JSON source
 * byte plus 16 for one parsed value: by induction a number/boolean/null costs
 * <=8, a string of n bytes <=24+2n, an array or object (64 + 16 per key) is
 * paid by its brackets, separators and keys at <=24 bytes each. Whitespace and
 * escapes only add source bytes. The decoded string is at most two bytes per
 * UTF-8 source byte. Reader copies cover the integrity digest (two copies of the
 * physical input, the SHA-256 input copy model of the 3D bootstrap parse) and
 * gzip input/output/chunks. Transport-owned response bytes are charged by the
 * page byte transport under their own identity, or, for a caller-admitted read,
 * by the caller's claim at delivery, and are not repeated here. */
export const ENVIRONMENT_JSON_DECODE_MODEL=Object.freeze({decodedBytesPerSourceByte:24,decodedConstantBytes:16,textBytesPerSourceByte:2,gzipWorkingCopies:3,integrityCopies:2});
export type EnvironmentJsonDescriptor={bytes:number;compression?:'gzip';uncompressed_bytes?:number};
export function environmentJsonReadCosts(descriptor:EnvironmentJsonDescriptor,label:string):ResourceBudgetCost[]{
 const model=ENVIRONMENT_JSON_DECODE_MODEL,physical=Math.max(0,Math.ceil(descriptor.bytes)),text=descriptor.compression==='gzip'?Math.max(0,Math.ceil(descriptor.uncompressed_bytes??0)):physical;
 if(!Number.isSafeInteger(physical)||!Number.isSafeInteger(text))throw new RangeError('Invalid environment JSON descriptor');
 const costs:ResourceBudgetCost[]=[{category:'read',bytes:physical*model.integrityCopies,precision:'estimate',identity:{},label:shortLabel(label+' reader integrity copies')}];
 if(descriptor.compression==='gzip')costs.push({category:'inflate',bytes:physical+text*model.gzipWorkingCopies,precision:'estimate',identity:{},label:shortLabel(label+' gzip input, output, chunks and digest copy')});
 costs.push({category:'normalize',bytes:text*model.textBytesPerSourceByte,precision:'estimate',identity:{},label:shortLabel(label+' decoded JSON text')});
 costs.push({category:'decoded',bytes:text*model.decodedBytesPerSourceByte+model.decodedConstantBytes,precision:'estimate',identity:{},label:shortLabel(label+' parsed JSON upper bound')});
 return costs;
}
/** Final retained decoded value under the same estimator as the old cache. */
export function environmentRetainedEstimate(value:unknown):number{return estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes;}
export function environmentDecodedCost(bytes:number,identity:object,label:string,category:'decoded'|'metadata'='decoded'):ResourceBudgetCost{
 return{category,bytes:Math.max(0,Math.ceil(bytes)),precision:'estimate',identity,label:shortLabel(label)};
}
export const ENVIRONMENT_WATER_PROFILE_LABEL='environment water admission profile';
/** The retained water-admission profile under the profile object's own
 * identity. The environment manager charges exactly this cost from install
 * until destroy; a caller whose claim lists the same cost (its read claim
 * shrunk in place to it) is counted once with it, so the install adds no byte. */
export function environmentWaterProfileCost(profile:object):ResourceBudgetCost{
 return environmentDecodedCost(environmentRetainedEstimate(profile),profile,ENVIRONMENT_WATER_PROFILE_LABEL,'metadata');
}

/** Caller-admitted reads (the page byte transport's 4th read argument): each
 * read mints its own envelope, which the caller's one claim lists beside the
 * costs it keeps after delivery. A refused delivery (a delivered buffer beyond
 * the envelope) is retried, holding nothing, with the larger envelope the
 * refusal names; the same path refused again after that retry, or a retry
 * that alone exceeds the ledger, is reported unfit instead of looping. */
export function createEnvironmentReadEnvelopes(){
 const floors=new Map<string,number>();
 return{
  mint(path:string,max:number):ResourceByteEnvelope{return resourceByteAdmittedEnvelope(path,max,floors.get(path)??0);},
  /** The largest buffer a delivery of path can bring within its envelope. */
  deliverable(path:string,max:number){return Math.max(max,floors.get(path)??0);},
  delivered(path:string){floors.delete(path);},
  /** A failed caller-admitted read of path: retry when its refused delivery
   * may be repeated once, holding nothing, with the larger envelope it named
   * (mint uses it from now on); otherwise the error to rethrow: Unfit when the
   * retry alone exceeds the ledger, RefusedAgain (an Unfit subclass whose
   * message claims no excess) when the path was refused again after it. */
  failure(path:string,label:string,error:unknown):{retry:true}|{retry:false;error:unknown}{
   if(!(error instanceof ResourceByteDeliveryRefusedError))return{retry:false,error};
   if(error.unfit){floors.delete(path);return{retry:false,error:new EnvironmentResourceUnfitError(label,error.retryBytes,error.capacity,false,subjectOf(error.label))};}
   if((floors.get(path)??0)>=error.envelopeBytes){floors.delete(path);return{retry:false,error:new EnvironmentResourceRefusedAgainError(label,error.retryBytes,error.capacity,error.envelopeBytes,subjectOf(error.label))};}
   floors.set(path,error.envelopeBytes);return{retry:true};
  },
  get pendingRetries(){return floors.size;},
 };
}
export type EnvironmentReadEnvelopes=ReturnType<typeof createEnvironmentReadEnvelopes>;

/** V8-oriented container sizes. They multiply ACTUAL input counts; they are
 * logical estimates, not heap measurements or fixed whole-scene guesses. */
export const ENVIRONMENT_CONSTRUCTION_MODEL=Object.freeze({
 numberSlotBytes:8,
 /** Pushed arrays grow by ~1.5x; the old and new element stores overlap. */
 arrayGrowthPeakFactor:2.5,
 earcutNodeBytes:128,
 pointArrayBytes:64,
 gridEntryBytes:96,
 setEntryBytes:40,
 objectBytes:96,
 candidateBytes:256,
 bucketBytes:96,
 evidenceBytes:192,
 rowSourceBytes:256,
 rowVertexBytes:96,
 polygonBytes:256,
 slotObjectBytes:72,
});

/** Several claims as ONE ledger decision before anything is allocated: a
 * refusal reserves and releases nothing, so it can never emit an availability
 * wake-up. Each claim reuses the admitted allocation identities, so splitting
 * adds no byte and dropping the combined claim leaves usage unchanged. */
export function reserveEnvironmentClaims(budget:ResourceBudget,rows:readonly (readonly [string,readonly ResourceBudgetCost[]])[]):ResourceBudgetReservation[]{
 const keyed=rows.map(([label,costs])=>[label,costs.map(cost=>cost.identity===undefined?{...cost,identity:{}}:cost)] as const);
 const combined=reserveEnvironmentCosts(budget,keyed.flatMap(([,costs])=>costs),keyed.map(([label])=>label).join(' + '));
 const admitted:ResourceBudgetReservation[]=[];
 try{for(const [label,costs]of keyed)admitted.push(budget.reserve(costs,{label:shortLabel(label)}));}
 catch(error){for(const reservation of admitted)reservation.release();combined.release();throw error;}
 combined.release();return admitted;
}

/** Constant shader programs and vertex arrays of one environment or vehicle
 * renderer: a policy estimate admitted before compile (DECISIONS 2026-11-02
 * 03:25: about 128 KiB environment, about 20 KiB vehicles, VAOs included),
 * never a driver measurement; fixed-candidate acceptance calibrates it. Per
 * program three UTF-16 copies of its source text and attribute names
 * (shader-object source, translated backend source, executable/reflection)
 * plus a 16 KiB program record; per vertex array 256 bytes plus 64 per enabled
 * attribute. */
export const ENVIRONMENT_PROGRAM_MODEL=Object.freeze({sourceCopies:3,bytesPerCharacter:2,programRecordBytes:16384,vertexArrayBytes:256,vertexArrayAttributeBytes:64});
export type EnvironmentProgramSource=Readonly<{vertex:string;fragment:string;attributes:readonly string[]}>;
export function environmentProgramAllowanceCosts(programs:readonly EnvironmentProgramSource[],vertexArrays:Readonly<{count:number;attributes:number}>,label:string):ResourceBudgetCost[]{
 const M=ENVIRONMENT_PROGRAM_MODEL;let program=0;
 for(const p of programs)program+=M.sourceCopies*M.bytesPerCharacter*(p.vertex.length+p.fragment.length+p.attributes.join('').length)+M.programRecordBytes;
 const arrays=vertexArrays.count*(M.vertexArrayBytes+M.vertexArrayAttributeBytes*vertexArrays.attributes);
 return[{category:'program',bytes:program,precision:'estimate',identity:{},label:shortLabel(label+' shader programs: constant policy estimate, driver-side unmeasured')},
  {category:'gpu-vertex-array',bytes:arrays,precision:'estimate',identity:{},label:shortLabel(label+' vertex arrays: constant policy estimate, driver-side unmeasured')}];
}

/** Per-owner GPU storage claims. A claim is admitted before the allocation
 * call; a replaced or deleted claim retires behind the page store's fence and
 * a lost context releases immediately. Same-size re-specification keeps its
 * claim; driver orphaning is outside this logical ledger. */
export function createEnvironmentGpuLedger(owner:string){
 type Claim={reservation:ResourceBudgetReservation;context:WebGL2RenderingContext;epoch:number;store:ChunkResourceStore};
 const claims=new Map<string,Claim>();let retirements=0,lostReleases=0,admissions=0;
 function retire(key:string,claim:Claim){
  if(!claim.reservation.active)return;
  let lost=true;try{lost=claim.context.isContextLost();}catch{lost=true;}
  if(lost||claim.store.destroyed||claim.epoch!==claim.store.contextEpoch(claim.context)){claim.reservation.release();lostReleases++;return;}
  try{claim.store.retireGpu({context:claim.context,epoch:claim.epoch,reservation:claim.reservation,dispose(){},label:shortLabel(owner+' '+key)});retirements++;}
  catch{claim.reservation.release();lostReleases++;}
 }
 function install(key:string,reservation:ResourceBudgetReservation,context:WebGL2RenderingContext,epoch:number,store:ChunkResourceStore){
  const previous=claims.get(key);claims.set(key,{reservation,context,epoch,store});admissions++;
  if(previous)retire(key,previous);
 }
 return{
  /** Throws Pending/Unfit before any GL call; previous storage for key retires. */
  replace(store:ChunkResourceStore,context:WebGL2RenderingContext,key:string,costs:readonly ResourceBudgetCost[]){
   const epoch=store.contextEpoch(context),reservation=reserveEnvironmentCosts(store.budget,costs,owner+' '+key);
   install(key,reservation,context,epoch,store);
  },
  /** Several keyed claims as ONE ledger decision. A refusal reserves nothing
   * and releases nothing, so it can never emit an availability wake-up. The
   * keyed claims reuse the admitted allocation identities: each adds zero
   * bytes while the combined claim exists, and dropping the combined claim
   * leaves usage unchanged. Previous storage retires only after all admit. */
  replaceAll(store:ChunkResourceStore,context:WebGL2RenderingContext,rows:readonly (readonly [string,readonly ResourceBudgetCost[]])[]){
   const epoch=store.contextEpoch(context),keyed=rows.map(([key,costs])=>[key,costs.map(cost=>cost.identity===undefined?{...cost,identity:{}}:cost)] as const);
   const combined=reserveEnvironmentCosts(store.budget,keyed.flatMap(([,costs])=>costs),owner+' '+keyed.map(([key])=>key).join('+'));
   const admitted:[string,ResourceBudgetReservation][]=[];
   try{for(const [key,costs]of keyed)admitted.push([key,store.budget.reserve(costs,{label:shortLabel(owner+' '+key)})]);}
   catch(error){for(const [,reservation]of admitted)reservation.release();combined.release();throw error;}
   combined.release();
   for(const [key,reservation]of admitted)install(key,reservation,context,epoch,store);
  },
  has(key:string){return claims.get(key)?.reservation.active===true;},
  /** Drop claims whose storage was never created. Multi-claim admission uses
   * replaceAll instead, so a refusal never has partial claims to drop. */
  abandon(){for(const [key,claim]of [...claims]){claims.delete(key);claim.reservation.release();}},
  release(){for(const [key,claim]of [...claims]){claims.delete(key);retire(key,claim);}},
  get bytes(){let bytes=0;for(const claim of claims.values())if(claim.reservation.active)bytes+=claim.reservation.bytes;return bytes;},
  get stats(){const rows:Record<string,number>={};for(const [key,claim]of claims)if(claim.reservation.active)rows[key]=claim.reservation.bytes;return Object.freeze({owner,claims:Object.freeze(rows),admissions,retirements,lostReleases,measurement:'logical GPU buffer storage admitted before bufferData; retirement waits for the page store fence'});},
 };
}
export type EnvironmentGpuLedger=ReturnType<typeof createEnvironmentGpuLedger>;
export const gpuBufferCost=(bytes:number,identity:object,label:string,precision:'exact'|'estimate'='exact'):ResourceBudgetCost=>({category:'gpu-buffer',bytes:Math.max(0,Math.ceil(bytes)),precision,identity,label:shortLabel(label)});
