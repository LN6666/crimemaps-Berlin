import {normalizeBuildingShard} from './building-mesh-codec';
import {inflateBounded3DGzip,type ThreeDCompressionDescriptor} from './bounded-3d-gzip';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkProductionContext,ChunkResourceCosts,ChunkResourceLease,ChunkResourceRequest,ChunkResourceRole,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {resourceByteAdmittedEnvelope,resourceByteReadEnvelope,type ResourceByteDeliveryRefusedError,type ResourceBytesAcquire,type ResourceBytesLease} from './resource-byte-transport';
import {ResourceAvailabilityStateError,ResourceBudgetExceededError,ResourceBudgetHintUnsupportedError,checkedAvailabilitySequence,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure} from './render-runtime/resource-budget';
import {PRESSURE_AVAILABILITY_LIMITS,registerPressureAvailability,type PressureAvailabilityRegistration,type PressureSnapshotWriter} from './render-runtime/pressure-availability';

export type NativeSourceDescriptor=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
type SourceValue={schema_version:1;city:string;components:BuildingComponent[];decodedPayloadCost:ReturnType<typeof normalizeBuildingShard>['decodedPayloadCost']};
import type {BuildingComponent} from './building-mesh-types';
type ShadowHeader={shadow_profile?:unknown;shadow_admitted_component_indices?:unknown};
export type NativeSourceValue={raw:SourceValue;verified:ShadowHeader;physicalBytes:number};
/** A lease outlives the request which acquired it. Retain/transfer roles before
 * handing arrays to a renderer, pick, capture or published transaction. */
export interface NativeSourceResult{
 readonly contentKey:string;
 readonly role:ChunkResourceRole;
 readonly raw:SourceValue;
 readonly verified:ShadowHeader;
 readonly physicalBytes:number;
 readonly released:boolean;
 /** Scalar reacquisition footprint; never pins a decoded payload. */
 readonly reacquireCost?:{readonly key:string;readonly privateBytes:number;readonly canonicalBytes:number};
 borrow<R>(read:(value:NativeSourceValue)=>R):R;
 retain(role?:ChunkResourceRole):NativeSourceResult;
 /** Independent opaque parent token for the shared CPU allocation graph. */
 retainResource(role?:ChunkResourceRole):ChunkResourceLease<unknown>;
 transfer(role:ChunkResourceRole):void;
 release():void;
}
/** Admit the consumer's preparation metadata while its private source is still
 * owned by acquisition. On refusal both source leases are returned before waiting.
 * costs must be synchronous and must not retain the borrowed value. */
export type NativeSourceAdmission={context:ChunkProductionContext;costs:(value:NativeSourceValue)=>ChunkResourceCosts};
export type NativeSourceClient={
 readonly ownerKey:string;
 readonly resources:ChunkResourceStore;
 /** Stable provider-derived resources use the same store/ledger as ingress.
  * The complete derived content key remains the caller's authority. */
 acquireResource:<T>(request:ChunkResourceRequest<T>)=>ChunkResourceLease<T>;
 contentKey:(asset:NativeSourceDescriptor)=>string;
 /** Current canonical charge, including recent, or undefined after disposal. */
 residentSourceBytes?:(key:string)=>number|undefined;
 acquire:(asset:NativeSourceDescriptor,signal:AbortSignal,vertexCap:number,role?:ChunkResourceRole,admission?:NativeSourceAdmission)=>Promise<NativeSourceResult>;
 /** Transitional alias; returned lease is never tied to a settled signal. */
 read:(asset:NativeSourceDescriptor,signal:AbortSignal,vertexCap:number)=>Promise<NativeSourceResult>;
 /** Legacy cache-role reconciliation only. No values, LRU or recent pool. */
 setCached:(rows:readonly(readonly BuildingComponent[])[])=>void;
 destroy:()=>void;
 /** The bytes this asset's pending canonical source waits to admit while it is
  * parked on a page-ledger availability wake (its production's refused working
  * set, or a refused entry estimate of one of this client's acquisitions);
  * undefined while it is queued, reading, decoding, ready or not wanted. */
 parkedNeed?:(asset:NativeSourceDescriptor)=>number|undefined;
 /** One manager request's atomic source cohort (IA-R1); see NativeSourceCohort.
  * `demand` registers the cohort's wait for capacity as parked manager demand. */
 cohort?:(demand?:NativeSourceDemandPark)=>NativeSourceCohort;
 /** Subscribes to the end of any parked state in this pool (a parked canonical
  * source woke up, or a cohort wait ended), coalesced into one call per
  * microtask; returns the removal. A hint only: the listener re-reads what it
  * reported (a manager whose detailDemandHeld was true repaints once when it no
  * longer holds). Removed with the client. */
 onUnparked?:(listener:()=>void)=>()=>void;
};
/** A manager's register of parked detail demand: park() adds one parked state
 * (its probe answers whether it is still parked) and returns its removal. */
export type NativeSourceDemandPark={park(parked:()=>boolean):()=>void};
/** What a manager's cohort attempt reports of its selected sources: the page
 * bytes its ready, unpublished sources hold (an estimate that only this cohort's
 * release returns; 0 when none), and the sources it still waits for, each with
 * the manager's own page-store key of it as an extra refusal label. An item
 * without `asset` (a building-detail source, not read through this client) is
 * recognized by its label only and never counted as parked here. */
export type NativeSourceCohortProbe={readonly metadataHintSafe?:true;readonly metadataHintMaxPending?:number;held():number;/** Recomputed after returning the batch; excludes shared parents still resident. *//** Completed source count, bounded by metadataHintMaxPending; only new high-water progress may bypass an old margin. */retryProgress?():number;retryHeld?():number;pending():readonly {asset?:NativeSourceDescriptor;label?:string}[]};
/** One read of a cohort's sources. `signal` follows the request's signal and is
 * aborted with a NativeSourceCohortYield when the cohort returns its whole batch
 * (or with the ledger's ResourceBudgetExceededError when the batch can never fit
 * the page). The manager reads its sources under it, calls check() whenever the
 * probe's held bytes or pending sources change, close() once all are ready or
 * the read ends, and after a yield
 * returns every source role of the batch before the read settles. */
export type NativeSourceCohortAttempt={readonly signal:AbortSignal;readonly yielded:boolean;check():void;close():void};
/** A manager request's atomic cohort across its reads (it keeps one page age).
 * retry(error) is undefined unless `error` is this cohort's yield; otherwise it
 * waits holding nothing (no timer, no polling, ended by the signal) until the
 * page can hold the returned batch, after which the manager reads again.
 * `waiting` is true for exactly that wait. */
export type NativeSourceCohort={readonly age:number;readonly waiting:boolean;attempt(probe:NativeSourceCohortProbe,signal:AbortSignal):NativeSourceCohortAttempt;retry(error:unknown,signal:AbortSignal):Promise<void>|undefined};
type ProviderValue={view:NativeSourceValue|undefined;parent:ChunkResourceLease<NativeSourceValue>|undefined;metadataBytes:number};
const MAX=1024**2,VERTICES=200000;
/** The largest typed output one canonical read can make per vertex of the
 * consumer cap: positions 12 + normals 12 + Uint32 indices (checkCap allows at
 * most 6 per vertex) 24. VERTICES times this bounds every decoded buffer the
 * normalize step allocates, whatever the shard. */
export const NATIVE_SOURCE_VERTEX_BYTES=48;
/** Per raw (inflated) byte, charged on top of the exact read and inflate
 * buffers and the fixed VERTICES*NATIVE_SOURCE_VERTEX_BYTES (9.6 MB) term:
 * what one canonical read holds while it decodes, parses, normalizes and
 * settles (UTF-8 text, the parsed JSON tree, normalized metadata, transient
 * arrays and GC lag). Calibrated (calibrate-native, 2026-11-02, Node 22 cold
 * processes, the real pool with the real byte transport, page store and
 * ledger) on the real 4caae82 city3D leaves: 29 shards x 3 runs (9 cities:
 * the largest raw, the most components per raw byte and in total, the highest
 * model-ranked, roof and flat) plus a 30-shard single-run sweep, 56 distinct
 * shards in 11 cities. k = (physical high-water - read P - inflate d -
 * VERTICES*48) / d is at most 31.16 (stuttgart flat-00401, the leaf with the
 * most components); ceil(31.16 x 1.25 + 1 decoded copy for a Blink
 * TextDecoder) = 40. This k is a residual after the fixed 9.6 MB term, not a
 * per-raw-byte expansion: deducting only the typed buffers really made gives
 * 31-62 on flat leaves above 200 kB and up to 107 on small ones. The
 * high-water follows components and vertices more than raw bytes, so 40 is
 * calibrated for leaves shaped like the 4caae82 producer's (at most 16,000
 * vertices and 725 components per leaf); a producer change (vertex or
 * component density per leaf) needs a new measurement. The consumer caps
 * (transport and raw <= 1 MiB, VERTICES) bound what the ledger admits per
 * read (two-copy envelope, inflate, normalize: at most 52.2 MiB); that is
 * ledger arithmetic, not a physical guarantee for a leaf denser or larger
 * than the measured ones. */
export const NATIVE_SOURCE_EXPANSION=40;
/** The normalize claim of one canonical read of `rawBytes` inflated bytes. */
const nativeNormalizeBytes=(rawBytes:number)=>rawBytes*NATIVE_SOURCE_EXPANSION+VERTICES*NATIVE_SOURCE_VERTEX_BYTES;
let nextNativeClient=0;
const aborted=()=>new DOMException('Aborted','AbortError');
type CapacityWake={readonly promise:Promise<void>;cancel():void};
/** A refused admission whose production waits for page capacity holding only
 * its queued estimate, outside the ingress slot. The wake-up was subscribed in
 * the refusal's synchronous segment, after the production returned what it
 * held, so no later release is missed and its own release never wakes it. */
class CapacityWait extends Error{
 /** `bytes`: the working set the refused admission waits to take. */
 constructor(readonly wake:CapacityWake,readonly bytes=0){super('Native source ingress waits for page capacity');this.name='NativeCapacityWait';}
}
/** A manager cohort returns its whole batch and waits holding nothing for
 * `requiredBytes` (the shape of ManagerAdmissionRetry, which retryManagerAdmission
 * also accepts). `reclaimed`: another admission took the batch back. */
export class NativeSourceCohortYield extends Error{
 readonly code='MANAGER_ADMISSION_RETRY';
 readonly requiredBytes:number;readonly admissionBytes:number;readonly label:string;readonly reclaimed:boolean;
 constructor(requiredBytes:number,label:string,reclaimed:boolean){
  super(('Native source cohort returns its batch and waits for '+requiredBytes+' logical bytes: '+label).slice(0,512));
  this.name='NativeSourceCohortYield';this.requiredBytes=this.admissionBytes=requiredBytes;this.label=label.slice(0,256);this.reclaimed=reclaimed;
 }
}
/** One wake-up on the next availability wave, or a rejection when signal
 * aborts. A hint only, no timer: the waiter retries its exact admission. */
function capacityWake(budget:ResourceBudget,signal:AbortSignal):CapacityWake{
 let off:(()=>void)|undefined,done=false,settle!:(error?:unknown)=>void;
 const promise=new Promise<void>((resolve,reject)=>{settle=error=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const stop=off;off=undefined;stop?.();if(error===undefined)resolve();else reject(error);};});
 void promise.catch(()=>{});
 const abort=()=>settle(signal.reason??aborted());
 if(signal.aborted)abort();else{signal.addEventListener('abort',abort,{once:true});off=budget.onAvailable(()=>settle(),signal);}
 return{promise,cancel:()=>settle(aborted())};
}
/** A bounded hint for retrying the participant admission itself. The budget
 * permits this only while every pressure callback has the audited capability. */
function metadataHintWake(budget:ResourceBudget,signal:AbortSignal):CapacityWake{
 if(!budget.supportsMetadataHintRetry())throw new ResourceBudgetHintUnsupportedError();
 let off:()=>void=()=>{},done=false,settle!:(error?:unknown)=>void;
 const promise=new Promise<void>((resolve,reject)=>{settle=error=>{if(done)return;done=true;signal.removeEventListener('abort',abort);off();error===undefined?resolve():reject(error);};});
 void promise.catch(()=>{});const abort=()=>settle(signal.reason??aborted());
 if(signal.aborted)abort();else{
  signal.addEventListener('abort',abort,{once:true});
  try{off=budget.onAvailabilityStateChange(()=>settle(),signal);if(done)off();else if(signal.aborted)abort();}
  catch(error){settle(error);throw error;}
 }
 return{promise,cancel:()=>settle(aborted())};
}
/** An admission that cannot fit even on an empty page: reported, never waited for. */
function unfitError(budget:ResourceBudget,bytes:number,label:string):ResourceBudgetExceededError{
 const stats=budget.stats;
 return new ResourceBudgetExceededError(Object.freeze({capacity:stats.limitBytes,required:bytes,current:stats.bytes,recentCapacity:stats.recentLimitBytes,recentRequired:stats.recentBytes,recentCurrent:stats.recentBytes,shortfallBytes:Math.max(0,bytes-stats.limitBytes),recentShortfallBytes:0,additionalBytes:bytes,constraint:'total' as const,label:label.slice(0,256)}));
}
/** A refused caller-admitted delivery, by its stable code and fields. */
function deliveryRefusal(error:unknown):ResourceByteDeliveryRefusedError|undefined{
 const refused=error as Partial<ResourceByteDeliveryRefusedError>|null;
 return refused?.code==='RESOURCE_BYTE_DELIVERY_REFUSED'&&Number.isSafeInteger(refused.envelopeBytes)&&Number.isSafeInteger(refused.retryBytes)&&typeof refused.unfit==='boolean'?refused as ResourceByteDeliveryRefusedError:undefined;
}
const costBytes=(costs:readonly ResourceBudgetCost[])=>costs.reduce((bytes,cost)=>bytes+cost.bytes,0);
/** The queued estimate of a canonical source before its ingress admits a read. */
const QUEUED_SOURCE:ResourceBudgetCost={category:'metadata',bytes:512,precision:'estimate',label:'queued native source descriptor'};
/** A contract check of the page transport, ledger or chunk store: by its stable
 * code, else (until every contract error carries that code) by the same message
 * test as the managers' bounded reads. Never a network failure. */
const contractViolation=(error:unknown)=>{const value=error as {code?:unknown;message?:unknown}|null;return value?.code==='RESOURCE_CONTRACT_VIOLATION'||typeof value?.message==='string'&&/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(value.message);};
// A store failure keeps only the error name: retry transport TypeErrors by name,
// except a contract check, which reading again would only mask.
const transientTransportError=(error:unknown)=>(error as {name?:unknown}|null)?.name==='TypeError'&&!contractViolation(error);
const sha=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(n=>n.toString(16).padStart(2,'0')).join('');
function validate(asset:NativeSourceDescriptor){
 if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>MAX||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('Invalid shared native source descriptor');
 if(asset.compression!==undefined&&(asset.compression!=='gzip'||!Number.isSafeInteger(asset.uncompressed_bytes)||asset.uncompressed_bytes!<1||asset.uncompressed_bytes!>MAX||asset.uncompressed_sha256!==undefined&&!/^[a-f0-9]{64}$/.test(asset.uncompressed_sha256)))throw Error('Invalid bounded native compression descriptor');
}
/** Transport/path, provider and view/request generation are not decoded identity. */
export function nativeSourceContentKey(city:string,asset:NativeSourceDescriptor){
 validate(asset);if(!city)throw Error('Invalid native source city');
 // Published native gzip indexes may omit the raw hash. Such sources share
 // only their verified compressed identity, never an undefined decoded key.
 // When the raw hash is declared, retain cross-transport decoded reuse below.
 if(asset.compression==='gzip'&&asset.uncompressed_sha256===undefined)return JSON.stringify(['native-source-gzip-v1',city,asset.sha256,asset.bytes,asset.uncompressed_bytes]);
 return JSON.stringify(['native-source-v2',city,asset.compression==='gzip'?asset.uncompressed_sha256:asset.sha256,asset.compression==='gzip'?asset.uncompressed_bytes:asset.bytes]);
}
function providerView(value:NativeSourceValue):NativeSourceValue{
 const components=value.raw.components.map(c=>{
  const {origin,componentGeometry,sourceFeature,batches,displayEstimates,...metadata}=c;
  const {geometry,properties,...featureMetadata}=sourceFeature;
  return {...c,...structuredClone(metadata),origin:[...origin] as [number,number],componentGeometry,
   sourceFeature:{...sourceFeature,...structuredClone(featureMetadata),geometry,properties:structuredClone(properties)},
   batches:batches.map(b=>({...b,color:b.color.slice()})),
   ...(displayEstimates===undefined?{}:{displayEstimates:structuredClone(displayEstimates)})} as BuildingComponent;
 });
 return{physicalBytes:value.physicalBytes,verified:structuredClone(value.verified),raw:{...value.raw,components}};
}
function privateMetadataBytes(view:NativeSourceValue){
 return estimateRetainedBuildingPayload(view.raw.components.map(c=>{
  const {componentGeometry,sourceFeature,batches,...metadata}=c;const {geometry,...feature}=sourceFeature;
  return {...metadata,sourceFeature:feature,batches:batches.map(({positions,normals,indices,...row})=>row)};
 })).retainedPayloadEstimateBytes+estimateRetainedBuildingPayload(view.verified).retainedPayloadEstimateBytes;
}
function checkCap(value:NativeSourceValue,cap:number){
 let vertices=0,indices=0,positions=0;const geometries=new Set<object>();
 const geometry=(value:unknown)=>{if(!value||typeof value!=='object'||geometries.has(value))return;geometries.add(value);const coordinates=(value as {coordinates?:unknown}).coordinates;const count=(row:unknown):void=>{if(!Array.isArray(row))return;if(typeof row[0]==='number'){positions++;return;}for(const child of row)count(child);};count(coordinates);};
 for(const c of value.raw.components){geometry(c.componentGeometry);geometry(c.sourceFeature.geometry);for(const b of c.batches){vertices+=b.positions.length/3;indices+=b.indices.length;}}
 if(vertices>cap||indices>cap*6||positions>cap)throw Error('Native source consumer mesh/source geometry budget exceeded');
}

/** One existing page ingress; values/recent/reservations live in the ONE page
 * ChunkResourceStore. Only scalar diagnostics and lease tokens live here.
 * acquireBytes must forward its 4th argument (a caller-admitted read) to the
 * page byte transport on the same ledger. */
export function createSharedNativeSourcePool(options:{read:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;acquireBytes?:ResourceBytesAcquire;resourceStore?:ChunkResourceStore}){
 const resources=options.resourceStore??getPageChunkResourceStore();
 const clients=new Set<NativeSourceClient>(),costs=new Map<string,{typed:number;estimated:number}>();
 const queue:{signal:AbortSignal;start:(()=>void)|undefined;cancel:(()=>void)|undefined}[]=[];
 let active=0,peak=0,reads=0,decodes=0,hits=0,transportAttempts=0,destroyed=false,holders=0;
 let capacityWaits=0,unfit=0,deliveryRefusals=0,unadmittedDeliveries=0;
 function pump(){if(active)return;const task=queue.shift();if(!task)return;if(task.signal.aborted){task.cancel?.();pump();return;}active++;peak=Math.max(peak,active);task.start?.();}
 function ingress<T>(signal:AbortSignal,work:()=>Promise<T>):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
   const task:{signal:AbortSignal;start:(()=>void)|undefined;cancel:(()=>void)|undefined}={signal,start:undefined,cancel:undefined};let running=false,done=false;
   const clear=()=>{signal.removeEventListener('abort',cancel);task.start=task.cancel=undefined;};
   const cancel=()=>{if(done||running)return;done=true;const at=queue.indexOf(task);if(at>=0)queue.splice(at,1);clear();reject(signal.reason??aborted());};task.cancel=cancel;
   task.start=()=>{running=true;signal.removeEventListener('abort',cancel);void work().then(resolve,reject).finally(()=>{done=true;clear();active--;pump();});};
   signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();else{queue.push(task);pump();}
  });
 }
 type CanonicalRetry={envelopeBytes:number;readBytes:number};
 /** One verified read of a canonical source inside the ingress slot. The whole
  * working set is admitted at once on the production's claim: inflate and
  * normalize plus the read, as an envelope minted for this read and handed with
  * the claim to the byte transport's caller-admitted read (which charges it
  * once with its own entry, never waits for capacity and shrinks the claim in
  * place to [inflate, normalize, response] at delivery), or, without a
  * transport, the two-copy read envelope shrunk to the delivered buffer's exact
  * identity after the read. A refused admission returns everything beyond the
  * queued estimate and waits for capacity outside the slot (CapacityWait); one
  * that cannot fit the page alone is reported as not fitting; a delivery the
  * claim could not take is retried once with an envelope that covers it. */
 async function readCanonical(city:string,asset:NativeSourceDescriptor,rawBytes:number,context:ChunkProductionContext,retry:CanonicalRetry):Promise<NativeSourceValue>{
  const {signal,adjust,budget}=context,gzip=asset.compression==='gzip',transport=options.acquireBytes;
  const keep:readonly ResourceBudgetCost[]=[{category:'inflate',bytes:gzip?rawBytes:0,precision:'exact'},{category:'normalize',bytes:nativeNormalizeBytes(rawBytes),precision:'estimate',label:'native parse/normalize working set'}];
  /** Refused: return what this production holds beyond its queued estimate,
   * then report not fitting or wait holding only that estimate, subscribed in
   * this synchronous segment. */
  function refuse(workingBytes:number,what:string):never{
   adjust(QUEUED_SOURCE);
   if(workingBytes>budget.stats.limitBytes){unfit++;throw unfitError(budget,workingBytes,'native source '+what+' does not fit the page: '+asset.path);}
   capacityWaits++;throw new CapacityWait(capacityWake(budget,signal),workingBytes);
  }
  function notFitting(workingBytes:number,what:string):never{adjust(QUEUED_SOURCE);unfit++;throw unfitError(budget,workingBytes,'native source '+what+' does not fit the page: '+asset.path);}
  signal.throwIfAborted();
  const envelope=transport?resourceByteAdmittedEnvelope(asset.path,asset.bytes,retry.envelopeBytes):undefined;
  const readCosts:readonly ResourceBudgetCost[]=envelope??resourceByteReadEnvelope(asset.path,Math.max(asset.bytes,retry.readBytes));
  if(!adjust([...keep,...readCosts]))refuse(costBytes(keep)+costBytes(readCosts),'working set');
  reads++;let bytes:Uint8Array|undefined,raw:Uint8Array|undefined,byteLease:ResourceBytesLease|undefined;
  try{
  // The validated descriptor size (<= MAX) is the read ceiling, not MAX. A
  // failed caller-admitted read leaves the claim and its envelope reusable.
  for(let attempt=0;attempt<2;attempt++)try{transportAttempts++;if(transport&&envelope){byteLease=await transport(asset.path,signal,asset.bytes,{admitted:context,envelope,keep});bytes=byteLease.bytes;}else bytes=await options.read(asset.path,signal,asset.bytes);break;}catch(error){
   if(signal.aborted)throw error;
   const refused=deliveryRefusal(error);
   if(refused){
    // The response buffer exceeded the envelope; the claim is unchanged.
    deliveryRefusals++;
    if(refused.unfit||retry.envelopeBytes>0)notFitting(refused.retryBytes,'delivery');
    retry.envelopeBytes=refused.envelopeBytes;refuse(refused.retryBytes,'delivery');
   }
   if(!transientTransportError(error)||attempt===1)throw Error('3D asset '+asset.path+': '+String(error));
  }
  signal.throwIfAborted();if(!bytes||bytes.byteLength!==asset.bytes||await sha(bytes)!==asset.sha256)throw Error('Shared native source hash/size mismatch');signal.throwIfAborted();
  const delivered:ResourceBudgetCost={category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer};
  if(byteLease?.cost===undefined){
   // Without a caller-admitted delivery (no transport, or one that ignored the
   // 4th argument) the claim still lists the read envelope: list the
   // delivered buffer's own identity in its place.
   if(transport)unadmittedDeliveries++;
   if(!adjust([delivered,...keep])){
    if((transport?retry.envelopeBytes:retry.readBytes)>0)notFitting(costBytes(keep)+delivered.bytes,'delivery');
    if(transport)retry.envelopeBytes=Math.max(costBytes(readCosts),delivered.bytes);else retry.readBytes=delivered.bytes;
    refuse(costBytes(keep)+Math.max(costBytes(readCosts),delivered.bytes),'delivery');
   }
  }
  if(asset.compression===undefined&&(asset.uncompressed_bytes!==undefined||asset.uncompressed_sha256!==undefined))throw Error('Inflated metadata requires city3D gzip compression');
  raw=gzip?await inflateBounded3DGzip(bytes,rawBytes,signal,asset.uncompressed_sha256):bytes;
  const parse:readonly ResourceBudgetCost[]=[delivered,...(gzip?[{category:'inflate' as const,bytes:raw.buffer.byteLength,precision:'exact' as const,identity:raw.buffer}]:[]),{category:'normalize',bytes:nativeNormalizeBytes(rawBytes),precision:'estimate'}];
  if(!adjust(parse))refuse(costBytes(parse),'inflated working set');
  signal.throwIfAborted();let parsed:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));const physicalBytes=bytes.byteLength;raw=undefined;bytes=undefined;
  const normalized=normalizeBuildingShard(parsed,city,VERTICES,VERTICES);signal.throwIfAborted();decodes++;
  const header=parsed as ShadowHeader,verified={shadow_profile:structuredClone(header.shadow_profile),shadow_admitted_component_indices:structuredClone(header.shadow_admitted_component_indices)};parsed=undefined;
  return{physicalBytes,verified,raw:{schema_version:1 as const,city:normalized.city,components:normalized.components,decodedPayloadCost:normalized.decodedPayloadCost}};
  }finally{raw=undefined;bytes=undefined;byteLease?.release();byteLease=undefined;}
 }
 /** A canonical production: reads inside the ingress slot and, whenever its
  * admission is refused, waits for page capacity outside it holding only its
  * queued estimate, then reads again. */
 async function produceCanonical(city:string,asset:NativeSourceDescriptor,rawBytes:number,context:ChunkProductionContext,key:string):Promise<NativeSourceValue>{
  const retry:CanonicalRetry={envelopeBytes:0,readBytes:0};
  for(;;){
   try{return await ingress(context.signal,()=>readCanonical(city,asset,rawBytes,context,retry));}
   catch(error){if(!(error instanceof CapacityWait))throw error;const unpark=park(parked,key,error.bytes);try{await error.wake.promise;}finally{unpark();}}
  }
 }
 function canonical(city:string,asset:NativeSourceDescriptor,role:ChunkResourceRole,consumer?:AbortSignal){
  const key=nativeSourceContentKey(city,asset),rawBytes=asset.compression==='gzip'?asset.uncompressed_bytes!:asset.bytes;
  // Queued descriptors do not own every future working set. The original
  // ingress admits expansion just before its physical read starts.
  // A consumer-bound role leaves synchronously with that consumer, so a
  // production nobody still waits for is cancelled and refunded at once
  // instead of retrying its transport read for a released request.
  return resources.acquire<NativeSourceValue>({contentKey:key,role,allowRecent:true,cacheRetention:'redecode',signal:consumer,
   estimate:QUEUED_SOURCE,
   produce:context=>produceCanonical(city,asset,rawBytes,context,key),
   costs(value){const cost=value.raw.decodedPayloadCost,header=estimateRetainedBuildingPayload(value.verified).retainedPayloadEstimateBytes,buffers=new Set<ArrayBufferLike>();for(const c of value.raw.components)for(const b of c.batches)for(const a of [b.positions,b.normals,b.indices])if(ArrayBuffer.isView(a))buffers.add(a.buffer);costs.set(key,{typed:cost.typedBufferBytes,estimated:cost.estimatedJsContainerBytes+header});return[...[...buffers].map(buffer=>({category:'decoded' as const,bytes:buffer.byteLength,precision:'exact' as const,identity:buffer})),{category:'metadata',bytes:cost.estimatedJsContainerBytes,precision:'estimate',identity:value.raw.components},{category:'metadata',bytes:header,precision:'estimate',identity:value.verified}];},
   dispose(value){value.raw.components=[];value.verified={};costs.delete(key);},
  });
 }
 async function wait(lease:ChunkResourceLease<unknown>,signal:AbortSignal){
  signal.throwIfAborted();await new Promise<void>((resolve,reject)=>{
   let done=false;const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);error===undefined?resolve():reject(error);};const cancel=()=>finish(signal.reason??aborted());
   signal.addEventListener('abort',cancel,{once:true});lease.ready.then(()=>finish(),error=>finish(error));if(signal.aborted)cancel();
  });signal.throwIfAborted();
 }
 /** A refused entry estimate: report not fitting when `need` exceeds the whole
  * page, otherwise wait holding nothing for the next availability wave,
  * subscribed in the caller's synchronous segment right after the refusal. */
 async function capacityFor(need:number,what:string,signal:AbortSignal,rows?:ParkedRows,key?:string,canonicalBytes=0){
  if(need>resources.budget.stats.limitBytes){unfit++;throw unfitError(resources.budget,need,what+' does not fit the page');}
  capacityWaits++;const unpark=rows&&key!==undefined?park(rows,key,need,canonicalBytes):undefined;
  try{await capacityWake(resources.budget,signal).promise;}finally{unpark?.();}signal.throwIfAborted();
 }
 // Pending canonical sources parked on a page-ledger wake, by content key: the
 // shared productions' refused working sets here, a client's refused entry
 // estimates in its own rows. Each park also checks the manager cohorts once.
 type ParkedRows=Map<string,{bytes:number;count:number;canonicalBytes:number}>;
 const parked:ParkedRows=new Map();let parkCheck=false;
 function park(rows:ParkedRows,key:string,bytes:number,canonicalBytes=0){
  const row=rows.get(key);if(row){row.count++;row.bytes=Math.max(row.bytes,bytes);row.canonicalBytes=Math.min(row.canonicalBytes,canonicalBytes);}else rows.set(key,{bytes,count:1,canonicalBytes});
  notifyCohorts();
  if(!parkCheck){parkCheck=true;queueMicrotask(()=>{parkCheck=false;for(const cohort of [...cohorts])if(cohorts.has(cohort))returnOwnBatch(cohort);});}
  let done=false;return()=>{if(done)return;done=true;const current=rows.get(key);if(current&&--current.count<=0)rows.delete(key);notifyCohorts();unparked();};
 }
 // Listeners of every client, told once per microtask that some parked state ended.
 const unparkListeners=new Set<()=>void>();let unparkQueued=false;
 function unparked(){
  if(unparkQueued||!unparkListeners.size)return;unparkQueued=true;
  queueMicrotask(()=>{unparkQueued=false;for(const listener of [...unparkListeners])if(unparkListeners.has(listener))try{listener();}catch{}});
 }
 // IA-R1 (DECISIONS 2026-11-02 07:49 (b)): a manager request reads its selected
 // sources as one atomic cohort and holds the ready ones until all are ready.
 // Those ready, unpublished sources are page-level reclaimable in the age order
 // of the lease store's partition compositions (reclaimComposedParts): a refused
 // admission that no cohort waits for, or one a younger cohort waits for, takes
 // the batches of the youngest cohorts back first, and only when what they hold
 // covers its shortfall; the oldest cohort the refusal serves is never reclaimed
 // by another. A cohort that holds ready sources while one of its own sources is
 // refused (and the refusal took nothing back) or parked on a page-ledger wake
 // returns its whole batch and waits holding nothing until the page can hold the
 // ready bytes plus that need, then reads again: it never holds part of its
 // batch while waiting for the rest. A batch that cannot fit even on an empty
 // page is reported as not fitting (the ledger's ResourceBudgetExceededError).
 // A cohort whose sources are all ready is settled: it is about to publish, so it
 // leaves the registry when next seen (settled() closes it) and is never reclaimed.
 type CohortRow={readonly age:number;readonly metadataHintSafe:boolean;complete:boolean;held():number;serves(label:string):boolean;parkedNeed():number;settled():boolean;snapshot(writer:PressureSnapshotWriter):void;yieldBatch(required:number,reclaimed:boolean,parkedBatch?:boolean):void;cancel(error:unknown):void;fail(error:unknown):void};
 type CohortTicket={cell:{row:CohortRow|undefined};availability:PressureAvailabilityRegistration;useSignal(signal:AbortSignal):void;release():void};
 const cohorts=new Set<CohortRow>();let cohortPressureOff:(()=>void)|undefined,cohortPressureSafe:boolean|undefined,nextCohortAge=0;
 const snapshotOverflow=()=>new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Native cohort pressure state exceeds its construction bound');
 const snapshotAmbiguous=()=>new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Native cohort probe has no valid certified pending bound');
 const notifyCohorts=()=>{if(cohorts.size)resources.budget.notifyAvailabilityStateChange();};
 let cohortYields=0,cohortReclaims=0,cohortReturnedBytes=0,cohortWaits=0,cohortUnfit=0;
 // Bounded scalar witnesses only; never retain a source, retry callback or lease.
 // Reading diagnostics does not re-evaluate demand or schedule any work.
 type RetryDiagnostic={city:string;ownerKey:string;age:number;originalRequiredBytes:number;requiredBytes:number;availableWithRecentBytes:number;aboveLevel:number|null;aboveMargin:number|null;observedAtMs:number;checks:number;sequence:number;completedSources:number|null;highestCompletedSources:number;progressAdvanced:boolean;reclaimed:boolean;beforeReleaseBytes:number|null;beforeReleaseAvailableBytes:number|null;returnedEstimateBytes:number|null;afterReleaseBytes:number;afterReleaseAvailableBytes:number;priorRegisteredLevel:number|null;priorRegisteredMargin:number|null;state:'waiting'|'resumed'|'aborted'|'failed';resumeKind:'registration'|'wave'|null;finishedAtMs:number|null};
 const retryWaitDiagnostics=new Set<RetryDiagnostic>();
 // Last sixteen scalar-only attempts, including completed ones. No source,
 // lease, probe or callback is retained; reading never schedules a retry.
 const retryAttemptHistory:RetryDiagnostic[]=[];let retryAttemptHistoryDropped=0;
 let retryWaitingCount=0;
 function reclaimCohorts(pressure:ResourceBudgetPressure){
  for(const row of [...cohorts])row.settled();
  const stats=resources.budget.stats,label=pressure.label;
  let origin:CohortRow|undefined;
  if(label!==undefined)for(const row of cohorts)if(!row.complete&&row.serves(label)&&(!origin||row.age<origin.age))origin=row;
  if(origin&&origin.held()+pressure.additionalBytes>stats.limitBytes){origin.fail(unfitError(resources.budget,origin.held()+pressure.additionalBytes,'native source cohort does not fit the page beside its ready sources'));return;}
  // Ready sources are not in the recent subset, and an admission above the page never fits.
  if(stats.recentBytes+Math.max(0,pressure.recentRequired-pressure.recentCurrent)>stats.recentLimitBytes||pressure.additionalBytes>stats.limitBytes)return;
  let lacking=stats.bytes+pressure.additionalBytes-stats.limitBytes;if(lacking<=0)return;
  const eligible=[...cohorts].filter(row=>!row.complete&&row!==origin&&(!origin||row.age>origin.age)&&row.held()>0).sort((a,b)=>b.age-a.age);
  if(eligible.reduce((bytes,row)=>bytes+row.held(),0)>=lacking){for(const row of eligible){if(lacking<=0)break;const bytes=row.held();row.yieldBatch(bytes,true);lacking-=bytes;}return;}
  const held=origin?.held()??0;
  if(origin&&held>0)origin.yieldBatch(held+pressure.additionalBytes,false);
 }
 /** Outside a refusal: a cohort holding ready sources while one of its own is
  * parked returns its batch for the ready bytes plus the parked need. */
 function returnOwnBatch(row:CohortRow){
  if(row.complete||row.settled())return;const held=row.held();if(held<=0)return;const need=row.parkedNeed();if(need<=0)return;
  if(held+need>resources.budget.stats.limitBytes){row.fail(unfitError(resources.budget,held+need,'native source cohort does not fit the page beside its ready sources'));return;}
  row.yieldBatch(held+need,false,true);
 }
 function syncCohortPressure(){
  if(!cohorts.size){const off=cohortPressureOff;cohortPressureOff=undefined;cohortPressureSafe=undefined;off?.();return;}
  const safe=[...cohorts].every(row=>row.metadataHintSafe);
  if(cohortPressureOff&&cohortPressureSafe===safe)return;
  // Install the replacement before removing the old listener, keeping the
  // aggregate capability conservative throughout a synchronous transition.
  const next=resources.budget.onPressure(reclaimCohorts,safe?'metadata-hint-v1':undefined),previous=cohortPressureOff;
  cohortPressureOff=next;cohortPressureSafe=safe;previous?.();
 }
 function registerCohort(row:CohortRow,ticket:CohortTicket){
  ticket.cell.row=row;
  try{
   cohorts.add(row);syncCohortPressure();
   ticket.availability.notify();
  }catch(error){cohorts.delete(row);ticket.release();throw error;}
  return()=>{
   if(!cohorts.delete(row))return;
   try{syncCohortPressure();}finally{ticket.release();}
  };
 }
 /** Waits holding nothing until free plus recent bytes can hold `required`, or
  * the signal aborts: one availability registration and one deferred check per
  * wave, no timer, polling or deadline. Room present as it registers ends the
  * wait at once ('registration', with the level then seen): the batch's own
  * release, and the release wave a reclaiming admission was served by, came
  * before this registration and no later wave reports them. Only `above` (the
  * level a previous registration ended at, when the batch was refused again
  * right after it) requires that level to have risen at registration too, so a
  * batch whose estimate is short waits for a wave instead of reading again in a
  * loop; a level that rose means another holder freed bytes it never reported. */
 function awaitCohortRoom(input:number|(()=>number),signal:AbortSignal,above?:number,aboveMargin?:number,observe?:(required:number,level:number)=>void):Promise<{how:'registration'|'wave';level:number;requiredBytes:number}>{
  const budget=resources.budget;
  const need=()=>{const value=typeof input==='function'?input():input;if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid native cohort retry footprint');return value;};
  let required:number;try{required=need();}catch(error){return Promise.reject(error);}
  if(required>budget.stats.limitBytes){cohortUnfit++;return Promise.reject(unfitError(budget,required,'native source cohort does not fit the page'));}
  if(signal.aborted)return Promise.reject(signal.reason??aborted());
  const level=()=>{const stats=budget.stats;return stats.availableBytes+stats.recentBytes;},room=()=>{required=need();const available=level();observe?.(required,available);return available>=required&&(aboveMargin===undefined||available-required>aboveMargin);};
  return new Promise((resolve,reject)=>{
   let done=false,queued=false,off:(()=>void)|undefined;
   const finish=(error?:unknown,how:'registration'|'wave'='wave')=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const stop=off;off=undefined;stop?.();if(error===undefined)resolve({how,level:level(),requiredBytes:required});else reject(error);};
   const abort=()=>finish(signal.reason??aborted());
   signal.addEventListener('abort',abort,{once:true});
   off=budget.onAvailable(()=>{if(done||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!done)try{if(room())finish();}catch(error){finish(error);}});},signal);
   try{if(!done&&room()&&(above===undefined||level()>above))finish(undefined,'registration');}catch(error){finish(error);}
  });
 }
 /** What a canonical source value charges (see its costs). */
 function sourceCharge(value:NativeSourceValue){
  const cost=value.raw.decodedPayloadCost;
  return cost.typedBufferBytes+cost.estimatedJsContainerBytes+estimateRetainedBuildingPayload(value.verified).retainedPayloadEstimateBytes;
 }
 function client(city:string,resolvePath:(path:string)=>string=(path=>path)):NativeSourceClient{
  const ownerKey='native-source-client:'+ ++nextNativeClient,pending=new Set<()=>void>(),cachePins=new Map<string,NativeSourceResult>(),waiting:ParkedRows=new Map();
  const views=new WeakMap<readonly BuildingComponent[],string>(),liveResults=new Map<string,Set<NativeSourceResult>>(),listeners=new Set<()=>void>();let closed=false;
  function onUnparked(listener:()=>void){
   if(closed||destroyed)return()=>{};const own=()=>listener();listeners.add(own);unparkListeners.add(own);
   return()=>{listeners.delete(own);unparkListeners.delete(own);};
  }
  function wrap(lease:ChunkResourceLease<ProviderValue>|undefined,key:string):NativeSourceResult{
   let savedRole=lease!.role;holders++;
   const current=()=>{if(!lease||lease.released||!lease.value?.view)throw Error('Native source lease was released');return lease.value.view;};
   const release=()=>{if(!lease)return;const old=lease;lease=undefined;const values=liveResults.get(key);values?.delete(result);if(!values?.size)liveResults.delete(key);holders--;old.release();};
   const result:NativeSourceResult={contentKey:key,get role(){return lease?.role??savedRole;},get released(){return!lease||lease.released;},get raw(){return current().raw;},get verified(){return current().verified;},get physicalBytes(){return current().physicalBytes;},get reacquireCost(){const value=current();return{key,privateBytes:lease!.value!.metadataBytes,canonicalBytes:sourceCharge(value)};},borrow(read){current();const held=lease!.borrowReady('dependency');try{if(!held.value?.view)throw aborted();return read(held.value.view);}finally{held.release();}},retain(role=savedRole){current();return wrap(lease!.retain(role),key);},retainResource(role='dependency'){current();return lease!.retain(role);},transfer(role){current();const next=lease!.retain(role),old=lease!;lease=next;savedRole=role;old.release();},release};
   let values=liveResults.get(key);if(!values)liveResults.set(key,values=new Set());values.add(result);return result;
  }
  async function acquire(asset:NativeSourceDescriptor,signal:AbortSignal,vertexCap:number,role:ChunkResourceRole='source',admission?:NativeSourceAdmission):Promise<NativeSourceResult>{
   signal.throwIfAborted();if(closed||destroyed)throw aborted();if(!Number.isSafeInteger(vertexCap)||vertexCap<1||vertexCap>VERTICES)throw Error('Invalid native source consumer budget');
   if(admission&&admission.context.budget!==resources.budget)throw Error('Native consumer admission belongs to another page budget');
   const key=nativeSourceContentKey(city,asset),controller=new AbortController(),cancel=()=>controller.abort(signal.reason??aborted());pending.add(cancel);signal.addEventListener('abort',cancel,{once:true});
   let base:ChunkResourceLease<NativeSourceValue>|undefined,view:ChunkResourceLease<ProviderValue>|undefined;
   try{
    const resolvedAsset={...asset,path:resolvePath(asset.path)};
    for(;;){
     try{base=canonical(city,resolvedAsset,role,controller.signal);}
     catch(error){
      // The canonical source's queued estimate was refused: wait holding nothing.
      if(!(error instanceof ResourceBudgetExceededError))throw error;
      await capacityFor(QUEUED_SOURCE.bytes,'native source descriptor',controller.signal,waiting,key);continue;
     }
     if(base.value)hits++;await wait(base,controller.signal);if(closed||destroyed||!base.value)throw aborted();checkCap(base.value,vertexCap);
     const canonicalValue=base.value,estimate=(canonicalValue.raw.decodedPayloadCost.estimatedJsContainerBytes+estimateRetainedBuildingPayload(canonicalValue.verified).retainedPayloadEstimateBytes)*2+4096;
     try{view=resources.acquire<ProviderValue>({contentKey:JSON.stringify(['native-private-v2',ownerKey,key]),role,parents:[base],allowRecent:false,estimate:{category:'metadata',bytes:estimate,precision:'estimate',label:city+' private source view'},produce(context){context.signal.throwIfAborted();const value=providerView(canonicalValue);return{view:value,parent:undefined,metadataBytes:privateMetadataBytes(value)};},costs:value=>({category:'metadata',bytes:value.metadataBytes,precision:'estimate',identity:value}),dispose(value){value.view=undefined;value.parent?.release();value.parent=undefined;}});}
     catch(error){
      // The private view's estimate was refused: return the shared source too
      // (it may stay recent and evictable) and wait holding nothing; the view
      // needs room beside it.
      if(!(error instanceof ResourceBudgetExceededError))throw error;
      const canonicalBytes=sourceCharge(base.value),need=canonicalBytes+estimate,held=base;base=undefined;held.release();
      await capacityFor(need,'native private source view',controller.signal,waiting,key,canonicalBytes);continue;
     }
     await wait(view,controller.signal);if(closed||destroyed||!view.value?.view)throw aborted();
     if(admission){
      admission.context.signal.throwIfAborted();
      const requested=admission.costs(view.value.view);
      if(!admission.context.adjust(requested)){
       const canonicalBytes=sourceCharge(base.value),need=canonicalBytes+view.value.metadataBytes+costBytes(Array.isArray(requested)?requested:[requested as ResourceBudgetCost]);
       // No production parent has been attached yet. Release both roles before
       // parking, including the private view's internal canonical parent.
       const heldView=view,heldBase=base;view=undefined;base=undefined;
       try{heldView.release();}finally{heldBase.release();}
       await capacityFor(need,'native consumer preparation',controller.signal,waiting,key,canonicalBytes);continue;
      }
      admission.context.signal.throwIfAborted();
     }
     views.set(view.value.view.raw.components,key);const result=wrap(view,key);view=undefined;return result;
    }
   }finally{signal.removeEventListener('abort',cancel);pending.delete(cancel);view?.release();base?.release();}
  }
  function setCached(rows:readonly(readonly BuildingComponent[])[]){
   if(closed)return;const wanted=new Set(rows.map(row=>views.get(row)).filter((key):key is string=>!!key));
   for(const [key,lease]of cachePins)if(!wanted.has(key)){cachePins.delete(key);lease.release();}
   // Legacy publication happens before releasing its read handle. Reconcile
   // cache roles against the live view lease, never store another raw array map.
   for(const key of wanted)if(!cachePins.has(key)){
    // A role token can be retained only from a currently owned result.
    const live=[...(liveResults.get(key)??[])].find(value=>!value.released);if(live)cachePins.set(key,live.retain('cache'));
   }
  }
  function parkedBytes(key:string){const shared=parked.get(key)?.bytes,own=waiting.get(key)?.bytes;return shared===undefined&&own===undefined?undefined:Math.max(shared??0,own??0);}
  // Manifest leaves are stable objects: their content keys are derived once.
  const keys=new WeakMap<object,string>();
  function keyOf(asset:NativeSourceDescriptor){let key=keys.get(asset);if(key===undefined){key=nativeSourceContentKey(city,asset);keys.set(asset,key);}return key;}
  function parkedNeed(asset:NativeSourceDescriptor){return parkedBytes(keyOf(asset));}
  /** IA-R1: see NativeSourceCohort and the pool's cohort registry. */
  function cohort(demand?:NativeSourceDemandPark):NativeSourceCohort{
   const age=nextCohortAge=checkedAvailabilitySequence(nextCohortAge),yields=new WeakMap<object,NativeSourceCohortYield>(),metadataYields=new WeakSet<object>(),retryFootprints=new WeakMap<object,()=>number>(),retryProgress=new WeakMap<object,number>(),retryReleaseSnapshots=new WeakMap<object,{bytes:number;available:number;returned:number}>();
   let highestRetryProgress=0;
   let waitingForRoom=false,registeredLevel:number|undefined,registeredMargin:number|undefined,prepaid:CohortTicket|undefined;
   function ticket(signal:AbortSignal):CohortTicket{
    const cell:{row:CohortRow|undefined}={row:undefined};
    const availability=registerPressureAvailability(resources.budget,'native-cohort',writer=>{if(cell.row)cell.row.snapshot(writer);else{writer.open();writer.close();}});
    let active=true,currentSignal=signal,result!:CohortTicket;
    const cancel=()=>{const row=cell.row;if(row&&!row.complete)row.cancel(currentSignal.reason??aborted());else result.release();};
    const release=()=>{if(!active)return;active=false;currentSignal.removeEventListener('abort',cancel);pending.delete(cancel);if(prepaid===result)prepaid=undefined;cell.row=undefined;availability.release();};
    result={cell,availability,release,useSignal(next){
     if(!active)throw aborted();if(next===currentSignal)return;
     currentSignal.removeEventListener('abort',cancel);currentSignal=next;next.addEventListener('abort',cancel,{once:true});if(next.aborted)cancel();
    }};
    pending.add(cancel);signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted||closed||destroyed){cancel();throw signal.reason??aborted();}
    return result;
   }
   async function prepay(signal:AbortSignal){
    const budget=resources.budget;
    for(;;){
     signal.throwIfAborted();if(closed||destroyed)throw aborted();
     // A hint never starts a source. It merely permits this same fixed-fee
     // reservation to be attempted once, holding no prior claim on failure.
     const wake=metadataHintWake(budget,signal),cancel=()=>wake.cancel();pending.add(cancel);
     try{
      if(!budget.supportsMetadataHintRetry())throw new ResourceBudgetHintUnsupportedError();
      const admitted=ticket(signal);
      if(!budget.supportsMetadataHintRetry()){admitted.release();throw new ResourceBudgetHintUnsupportedError();}
      prepaid?.release();prepaid=admitted;return;
     }catch(error){
      if(!(error instanceof ResourceBudgetExceededError))throw error;
      if(!budget.supportsMetadataHintRetry())throw new ResourceBudgetHintUnsupportedError();
      const minimum=PRESSURE_AVAILABILITY_LIMITS.registryBytes+PRESSURE_AVAILABILITY_LIMITS.participantBytes;
      if(minimum>budget.stats.limitBytes){cohortUnfit++;throw unfitError(budget,minimum,'native cohort pressure participant does not fit the page');}
      await wake.promise;
     }finally{pending.delete(cancel);wake.cancel();}
    }
   }
   return{age,get waiting(){return waitingForRoom;},
    attempt(probe,signal){
     // A request that ends leaves the registry at once: nothing aborted is reclaimed.
     const own=new AbortController(),stop=()=>{close();own.abort(signal.reason??aborted());};let yielded=false,off:(()=>void)|undefined;
     const declared=probe.metadataHintMaxPending;
     const certified=probe.metadataHintSafe===true&&typeof declared==='number'&&Number.isSafeInteger(declared)&&declared>=0&&declared<=PRESSURE_AVAILABILITY_LIMITS.nodes;
     const pendingKeys=()=>probe.pending().map(item=>{if(!item.asset)return[undefined,undefined,item.label] as const;const key=keyOf(item.asset);return[key,JSON.stringify(['native-private-v2',ownerKey,key]),item.label] as const;});
     const close=()=>{if(row.complete)return;row.complete=true;signal.removeEventListener('abort',stop);const unregister=off;off=undefined;unregister?.();};
     const row:CohortRow={age,metadataHintSafe:certified,complete:false,
      held:()=>Math.max(0,probe.held()),
      serves:label=>pendingKeys().some(keys=>keys.some(key=>key!==undefined&&key.slice(0,256)===label)),
      parkedNeed(){let need=0;for(const [key]of pendingKeys())if(key!==undefined)need+=parkedBytes(key)??0;return need;},
      settled(){if(row.complete)return true;if(probe.pending().length)return false;close();return true;},
      snapshot(writer){
       // Built-in probes promise a chosen.length upper bound before flatMap
       // constructs its result. Unknown probes fail before that callback runs.
       if(!certified)throw snapshotAmbiguous();
       // Logical scratch estimate for flatMap's returned array, one record
       // per candidate, and one live intermediate; it is not a heap reading.
       const count=declared as number,pendingBytes=1024+count*512;
       if(!Number.isSafeInteger(pendingBytes))throw snapshotOverflow();
       const dropPending=writer.reserveTemp(pendingBytes);
       try{
        const pending=probe.pending();if(!Array.isArray(pending)||pending.length>count)throw snapshotAmbiguous();
        // A JSON string can expand to six UTF-16 units per source unit. Bound
        // the complete intermediate keys before constructing either one.
        const keyChars=256+6*city.length,privateChars=256+6*(ownerKey.length+keyChars);
        const keyBytes=1024+2*keyChars,privateBytes=1024+2*privateChars;
        if(!Number.isSafeInteger(keyBytes)||!Number.isSafeInteger(privateBytes))throw snapshotOverflow();
        writer.open();writer.value(age);writer.value(row.complete);writer.value(Math.max(0,probe.held()));writer.value(pending.length);
        let parked=0;
        for(const item of pending)if(item.asset){
         const dropKey=writer.reserveTemp(keyBytes);try{parked+=parkedBytes(nativeSourceContentKey(city,item.asset))??0;}finally{dropKey();}
        }
        writer.value(parked);writer.open();
        for(const item of pending){
         if(item.asset){
          const dropKey=writer.reserveTemp(keyBytes);
          try{
           const key=nativeSourceContentKey(city,item.asset);writer.value(key.slice(0,256));
           const dropPrivate=writer.reserveTemp(privateBytes);
           try{writer.value(JSON.stringify(['native-private-v2',ownerKey,key]).slice(0,256));}finally{dropPrivate();}
          }finally{dropKey();}
         }
         if(item.label!==undefined){const dropLabel=writer.reserveTemp(1024);try{writer.value(item.label.slice(0,256));}finally{dropLabel();}}
        }
        writer.close();writer.close();
       }finally{dropPending();}
      },
      yieldBatch(required,reclaimed,parkedBatch=false){
       if(row.settled())return;
       // Snapshot only scalar wait costs before cancellation removes the rows.
       // A private/consumer wait includes its canonical parent, which may still
       // be independently resident after this batch returns. Recheck residency
       // on every availability wave; never subtract a disposed parent.
       const pendingCosts=parkedBatch&&probe.retryHeld?pendingKeys().flatMap(([key])=>{if(key===undefined)return[];const own=waiting.get(key);return[{key,sharedBytes:parked.get(key)?.bytes??0,ownBytes:own?.bytes??0,canonicalBytes:own?.canonicalBytes??0}];}):undefined;
       const progress=probe.retryProgress?.();
       if(progress!==undefined&&(!certified||!Number.isSafeInteger(progress)||progress<0||progress>declared!))throw snapshotAmbiguous();
       const returned=row.held(),releaseSnapshot={bytes:resources.budget.stats.bytes,available:resources.budget.stats.availableBytes,returned};close();yielded=true;cohortYields++;if(reclaimed)cohortReclaims++;cohortReturnedBytes+=returned;
       const reason=new NativeSourceCohortYield(required,city+' cohort '+age+(reclaimed?' reclaimed by a page admission':' waits for its own source'),reclaimed);yields.set(reason,reason);retryReleaseSnapshots.set(reason,releaseSnapshot);if(progress!==undefined)retryProgress.set(reason,progress);
       // The manager has not released yet. Evaluate its scalar footprint only
       // in retry(), after its finally has returned every unpublished role.
       if(probe.retryHeld)retryFootprints.set(reason,()=> (pendingCosts?pendingCosts.reduce((sum,cost)=>sum+Math.max(cost.sharedBytes,cost.ownBytes-(costs.has(cost.key)?cost.canonicalBytes:0)),0):Math.max(0,required-returned))+probe.retryHeld!());
       own.abort(reason);
      },
      cancel(error){if(row.complete)return;close();own.abort(error);},
      fail(error){if(row.complete)return;close();cohortUnfit++;own.abort(error);}};
     signal.addEventListener('abort',stop,{once:true});
     if(signal.aborted)stop();else try{
      const admitted=prepaid??ticket(signal);if(prepaid===admitted)prepaid=undefined;admitted.useSignal(signal);
      if(row.complete||signal.aborted||closed||destroyed){admitted.release();if(!row.complete)stop();}
      else{
      const unregister=registerCohort(row,admitted);
      // The admission can synchronously run pressure callbacks. Cancellation
      // or owner disposal in those callbacks must not leave a stale cohort.
      if(row.complete||signal.aborted||closed||destroyed){unregister();if(!row.complete)stop();}else off=unregister;
      }
     }catch(error){
      if(!row.complete){
       close();
       const minimum=PRESSURE_AVAILABILITY_LIMITS.registryBytes+PRESSURE_AVAILABILITY_LIMITS.participantBytes;
       if(error instanceof ResourceBudgetExceededError&&minimum<=resources.budget.stats.limitBytes){
        // Return an aborted attempt rather than throwing here: the existing
        // manager finally then returns all its wanted/candidate source roles.
        yielded=true;cohortYields++;
        const reason=new NativeSourceCohortYield(minimum,city+' cohort '+age+' waits for pressure metadata',false);
        yields.set(reason,reason);metadataYields.add(reason);own.abort(reason);
       }else{
        if(error instanceof ResourceBudgetExceededError){cohortUnfit++;error=unfitError(resources.budget,minimum,'native cohort pressure participant does not fit the page');}
        own.abort(error);
       }
      }
     }
     // check() after its last source is ready settles the cohort in that same
     // step (returnOwnBatch closes it), and reclaimCohorts settles any cohort
     // whose sources are all ready before choosing: a batch about to publish is
     // never reclaimed in the turns before the manager's close().
     return{signal:own.signal,get yielded(){return yielded;},check(){if(cohorts.has(row)){returnOwnBatch(row);notifyCohorts();}},close};
    },
    retry(error,signal){
     const reason=error&&typeof error==='object'?yields.get(error):undefined;
     if(!reason||signal.aborted){prepaid?.release();return undefined;}
     yields.delete(reason);cohortWaits++;waitingForRoom=true;const unpark=demand?.park(()=>waitingForRoom);
     if(metadataYields.has(reason)){
      metadataYields.delete(reason);
      return prepay(signal).finally(()=>{waitingForRoom=false;unpark?.();unparked();});
     }
     // Room present at registration ends the wait: a reclaimed batch's reclaimer
     // subscribed in its refusal and was served by the batch's release wave
     // before this registration. A batch refused for its own source right after
     // a wait that ended at registration reads again at registration only when
     // the level rose since (see awaitCohortRoom); a reclaimed one always may,
     // its refusal was another admission's.
     const above=reason.reclaimed?undefined:registeredLevel;
     const progress=retryProgress.get(reason);retryProgress.delete(reason);
     const advanced=progress!==undefined&&progress>highestRetryProgress;
     if(advanced)highestRetryProgress=progress;
     const margin=reason.reclaimed||advanced?undefined:registeredMargin;
     const footprint=retryFootprints.get(reason);retryFootprints.delete(reason);
     // Source-sharing-aware estimates may change as canonical parents settle or
     // disappear. Re-evaluate on each wave. After an immediate retry, require
     // more headroom (free minus required), including on late self-release
     // waves, so an insufficient estimate cannot spin on its own cleanup.
     // A strictly higher completed-source count proves bounded forward progress.
     // Repeated/equal counts retain the margin guard; at most the certified
     // source bound can advance, so this cannot create an unbounded retry loop.
     // A foreign reclaim is not evidence that our own estimate was insufficient;
     // it starts a new admission attempt without the preceding margin barrier.
     // Ordinary live admission still checks every actual allocation.
     const released=retryReleaseSnapshots.get(reason);retryReleaseSnapshots.delete(reason);
     const diagnostic:RetryDiagnostic|undefined=retryWaitDiagnostics.size<16?{city,ownerKey,age,originalRequiredBytes:reason.requiredBytes,requiredBytes:reason.requiredBytes,availableWithRecentBytes:0,aboveLevel:footprint?null:above??null,aboveMargin:footprint?margin??null:null,observedAtMs:performance.now(),checks:0,sequence:cohortWaits,completedSources:progress??null,highestCompletedSources:highestRetryProgress,progressAdvanced:advanced,reclaimed:reason.reclaimed,beforeReleaseBytes:released?.bytes??null,beforeReleaseAvailableBytes:released?.available??null,returnedEstimateBytes:released?.returned??null,afterReleaseBytes:resources.budget.stats.bytes,afterReleaseAvailableBytes:resources.budget.stats.availableBytes,priorRegisteredLevel:registeredLevel??null,priorRegisteredMargin:registeredMargin??null,state:'waiting',resumeKind:null,finishedAtMs:null}:undefined;
     if(diagnostic){if(retryAttemptHistory.length===16){retryAttemptHistory.shift();retryAttemptHistoryDropped++;}retryAttemptHistory.push(diagnostic);}
     retryWaitingCount++;if(diagnostic)retryWaitDiagnostics.add(diagnostic);
     return awaitCohortRoom(footprint??reason.requiredBytes,signal,footprint?undefined:above,footprint?margin:undefined,diagnostic?(required,available)=>{diagnostic.requiredBytes=required;diagnostic.availableWithRecentBytes=available;diagnostic.observedAtMs=performance.now();diagnostic.checks++;}:undefined).then(({how,level,requiredBytes})=>{if(diagnostic){diagnostic.state='resumed';diagnostic.resumeKind=how;}registeredLevel=how==='registration'?level:undefined;if(footprint)registeredMargin=level-requiredBytes;}).finally(()=>{retryWaitingCount--;if(diagnostic){if(diagnostic.state==='waiting')diagnostic.state=signal.aborted?'aborted':'failed';diagnostic.finishedAtMs=performance.now();retryWaitDiagnostics.delete(diagnostic);}waitingForRoom=false;unpark?.();unparked();});
    }};
  }
  const result:NativeSourceClient={ownerKey,resources,residentSourceBytes(key){const cost=costs.get(key);return cost?cost.typed+cost.estimated:undefined;},parkedNeed,cohort,onUnparked,acquireResource<T>(request:ChunkResourceRequest<T>){if(closed||destroyed)throw aborted();return resources.acquire(request);},contentKey:asset=>nativeSourceContentKey(city,asset),acquire,read:(a,s,c)=>acquire(a,s,c),setCached,destroy(){if(closed)return;setCached([]);closed=true;for(const listener of listeners)unparkListeners.delete(listener);listeners.clear();for(const cancel of [...pending])cancel();pending.clear();for(const values of [...liveResults.values()])for(const value of [...values])if(value.role==='source'||value.role==='cache')value.release();clients.delete(result);}};
  clients.add(result);return result;
 }
 return{client,resources,get stats(){let typed=0,estimated=0;for(const c of costs.values()){typed+=c.typed;estimated+=c.estimated;}return{entries:costs.size,holders,active,peakConcurrency:peak,queued:queue.length,reads,decodes,hits,transportAttempts,capacityWaits,unfit,deliveryRefusals,unadmittedDeliveries,parkedSources:parked.size,cohorts:cohorts.size,cohortYields,cohortReclaims,cohortReturnedBytes,cohortWaits,cohortUnfit,retryWaitingCount,retryWaitDiagnostics:[...retryWaitDiagnostics].map(row=>({...row})),retryWaitDiagnosticsTruncated:retryWaitingCount>retryWaitDiagnostics.size,retryAttemptHistory:retryAttemptHistory.map(row=>({...row})),retryAttemptHistoryDropped,uniqueTypedBufferBytes:typed,uniqueSourcePayloadEstimateBytes:typed+estimated,providerPrivateMetadataExcluded:true,rendererStagingAndPreparedComponentsExcluded:true,measurement:'page-store-native-source-subset-not-whole-page-or-heap'};},destroy(){if(destroyed)return;destroyed=true;for(const c of [...clients])c.destroy();for(const task of [...queue])if(task.signal.aborted)task.cancel?.();resources.evictRecent();pump();}};
}
