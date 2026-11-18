export type ResourceBudgetProfile='desktop'|'mobile';
export type ResourceBudgetCategory='read'|'inflate'|'normalize'|'decoded'|'metadata'|'construction'|'packed'|'gpu-buffer'|'gpu-vertex-array'|'texture'|'mask'|'shadow'|'program'|'program-source'|'program-submitted'|'program-retiring'|'recent'|'unmeasured-driver'|'unmeasured-browser';
export type ResourceBudgetCost=Readonly<{
 category:ResourceBudgetCategory;
 /** Complete logical cost of one underlying allocation, never a view's slice. */
 bytes:number;
 precision:'exact'|'estimate';
 /** Different allocations need different identities, even for equal content. */
 identity?:object|string;
 label?:string;
}>;
export type ResourceBudgetOptions={profile?:ResourceBudgetProfile;limitBytes?:number;recentLimitBytes?:number};
/** evict:false is a quiet admission: a refusal neither runs the onPressure
 * listeners (no eviction, no entry-count trimming of other owners) nor counts
 * as a pressure event or replaces stats.lastPressure. Default true. */
export type ResourceBudgetAdmissionOptions={evict?:boolean};
export type ResourceBudgetReserveOptions={label?:string;recent?:boolean}&ResourceBudgetAdmissionOptions;
/** Stable code of the TypeErrors that the ledger, the chunk resource store and
 * the page byte transport throw when a caller breaks their contract (a
 * programming error, never a network or transient failure). The error type
 * and message are unchanged; consumers that classify failures test this code. */
export const RESOURCE_CONTRACT_VIOLATION='RESOURCE_CONTRACT_VIOLATION';
export type ResourceContractViolation=TypeError&{readonly code:typeof RESOURCE_CONTRACT_VIOLATION};
/** Marks a contract TypeError with RESOURCE_CONTRACT_VIOLATION and returns it. */
export function resourceContractViolation(error:TypeError):ResourceContractViolation{
 Object.defineProperty(error,'code',{value:RESOURCE_CONTRACT_VIOLATION,enumerable:true,configurable:true,writable:false});
 return error as ResourceContractViolation;
}
/** Also true for a bounded copy (an Error named TypeError) that kept the code. */
export function isResourceContractViolation(error:unknown):boolean{
 return error instanceof Error&&error.name==='TypeError'&&(error as {code?:unknown}).code===RESOURCE_CONTRACT_VIOLATION;
}
export type ResourceBudgetCategoryStats=Readonly<{bytes:number;exactBytes:number;estimatedBytes:number}>;
export type ResourceBudgetPressure=Readonly<{
 capacity:number;required:number;current:number;
 recentCapacity:number;recentRequired:number;recentCurrent:number;
 shortfallBytes:number;recentShortfallBytes:number;additionalBytes:number;
 constraint:'total'|'recent'|'total-and-recent';label?:string;
 /** Largest four costs of the proposed reservation, before page-wide identity
  * deduplication. These are gross costs, not additionalBytes or heap readings.
  * Scalar copies only: allocation identities and payloads never escape here. */
 requestedCostCount?:number;
 requestedCosts?:readonly Readonly<{category:ResourceBudgetCategory;bytes:number;precision:'exact'|'estimate';label?:string}>[];
}>;
export class ResourceBudgetExceededError extends Error{
 readonly capacity:number;readonly required:number;readonly current:number;
 readonly capacityBytes:number;readonly requiredBytes:number;readonly currentBytes:number;
 readonly recentCapacity:number;readonly recentRequired:number;readonly recentCurrent:number;
 readonly shortfallBytes:number;readonly recentShortfallBytes:number;readonly additionalBytes:number;
 readonly constraint:ResourceBudgetPressure['constraint'];readonly label:string|undefined;
 constructor(readonly details:ResourceBudgetPressure){
  super('Resource budget requires '+details.required+' bytes with capacity '+details.capacity+'; recent requires '+details.recentRequired+' with capacity '+details.recentCapacity);
  this.name='ResourceBudgetExceededError';
  this.capacity=this.capacityBytes=details.capacity;this.required=this.requiredBytes=details.required;this.current=this.currentBytes=details.current;
  this.recentCapacity=details.recentCapacity;this.recentRequired=details.recentRequired;this.recentCurrent=details.recentCurrent;
  this.shortfallBytes=details.shortfallBytes;this.recentShortfallBytes=details.recentShortfallBytes;this.additionalBytes=details.additionalBytes;this.constraint=details.constraint;this.label=details.label;
 }
}
export interface ResourceBudgetReservation{
 /** Atomic replacement: a rejected adjustment keeps the prior costs.
  * options.evict:false refuses quietly instead of running pressure listeners. */
 adjust(cost:ResourceBudgetCost|readonly ResourceBudgetCost[],options?:ResourceBudgetAdmissionOptions):boolean;
 release():void;
 setRecent(value:boolean,options?:ResourceBudgetAdmissionOptions):boolean;
 /** Retiring allocations remain charged until their actual owner releases. */
 markRetiring():void;
 setRetiring(value:boolean):void;
 readonly active:boolean;
 /** This reservation's deduplicated claim; shared claims are not additive. */
 readonly bytes:number;
 readonly recent:boolean;
}
export type ResourceBudgetTryReserveResult={ok:true;reservation:ResourceBudgetReservation}|{ok:false;error:ResourceBudgetExceededError};
export type ResourceBudgetStats=Readonly<{
 profile:ResourceBudgetProfile;limitBytes:number;recentLimitBytes:number;
 bytes:number;totalBytes:number;exactBytes:number;estimatedBytes:number;recentBytes:number;retiringBytes:number;
 reservations:number;allocations:number;pressureEvents:number;evictionAttempts:number;evictionFailures:number;
 availableBytes:number;recentAvailableBytes:number;availabilityListeners:number;availabilityEvents:number;availabilityNotifications:number;availabilityFailures:number;
 /** Wake waves sent without a byte drop, when charged bytes became reclaimable. */
 reclaimableEvents:number;
 /** Reclaimable events raised inside a running wave, each sent as a following wave. */
 reclaimableFollowUpWaves:number;
 /** Following waves beyond the per-dispatch bound (a listener re-raising them). */
 reclaimableFollowUpDrops:number;
 categories:Readonly<Partial<Record<ResourceBudgetCategory,ResourceBudgetCategoryStats>>>;
 lastPressure:ResourceBudgetPressure|undefined;
 /** Most recent eviction-triggering proposal, including one that subsequently fitted. */
 lastPressureAttempt:ResourceBudgetPressure|undefined;
 accounting:'logical-controlled-resource-bytes';physicalMemory:'unmeasured';
 unmeasured:readonly Readonly<{category:'unmeasured-driver'|'unmeasured-browser';reason:string}>[];
}>;
/** One row of ResourceBudget.holders(): what the ledger charges right now for
 * one holder label and one allocation category. */
export type ResourceBudgetHolder=Readonly<{
 /** The charging reservation's label. An unlabelled reservation is listed
  * under its cost's own label (labelSource 'cost'), else under undefined. */
 label:string|undefined;labelSource:'reservation'|'cost'|'none';
 category:ResourceBudgetCategory;
 /** Charged bytes, with the ledger's own identity deduplication: each
  * allocation once, at its larger cost, in the row of the reservation whose
  * cost the ledger counts. Over all rows they sum to stats.bytes, and
  * recentBytes and retiringBytes to stats.recentBytes and stats.retiringBytes. */
 bytes:number;exactBytes:number;estimatedBytes:number;recentBytes:number;retiringBytes:number;
 /** Reservations charging at least one allocation of this row. */
 count:number;
 /** Allocations charged in this row. */
 allocations:number;
 /** 'mixed' when the row charges exact and estimated allocations. */
 precision:'exact'|'estimate'|'mixed';
}>;
/** holders() rows by default, and the most one call returns. */
export const RESOURCE_BUDGET_HOLDERS_DEFAULT=16,RESOURCE_BUDGET_HOLDERS_MAX=64;
/** Bounded exact logical availability state; allocation identities stay private. */
export interface ResourceAvailabilityTracker{
 capture():string;
 onChange(notify:()=>void,signal?:AbortSignal):()=>void;
 release():void;
}
/** Compressed representation caps are NOT raw ledger caps. Scans have separate
 * finite work bounds: the ledger itself can contain zero-byte allocations. */
export const AVAILABILITY_STATE_LIMITS=Object.freeze({owners:512,termGroups:2048,allocationGroups:512,encodedEdges:2048,storeEntries:512,storeLeaseEdges:2048,providers:16,chars:65536,trackerBytes:4*1024*1024,structuralScratchBytes:1536*1024,rememberedStatesPerController:4,scanAllocations:32768,scanClaims:131072,scanCosts:131072,scanStoreKeyChars:262144,longTextGroups:2048,textChunkGroups:2048,textChunkRefs:8192,scanTextChars:262144});
export function checkedAvailabilitySequence(value:number):number{
 if(!Number.isSafeInteger(value)||value<0||value>=Number.MAX_SAFE_INTEGER)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Availability identity sequence exhausted');
 return value+1;
}
export class ResourceAvailabilityStateError extends Error{
 readonly code:string;
 constructor(code:'GROUND_AVAILABILITY_STATE_OVERFLOW'|'GROUND_AVAILABILITY_STATE_AMBIGUOUS'|'GROUND_AVAILABILITY_STATE_REENTRANT',message:string){super(message);this.name='ResourceAvailabilityStateError';this.code=code;}
}
/** A metadata waiter cannot assume unreviewed pressure callbacks make bounded
 * progress. This is distinct from a resource that is merely pending. */
export class ResourceBudgetHintUnsupportedError extends Error{
 readonly code='RESOURCE_BUDGET_HINT_UNSUPPORTED';
 constructor(){super('Metadata hint retry has an uncertified pressure listener');this.name='ResourceBudgetHintUnsupportedError';}
}
export type AvailabilityJSON=string|number|boolean|null|readonly AvailabilityJSON[];
/** Structured store state is an internal bounded provider value. Generic
 * providers continue returning strings. Keys are whole original identities. */
export type AvailabilityStoreState=readonly ['store-v2',readonly (readonly [string,number|null,string])[],readonly AvailabilityJSON[]];
export type ResourceAvailabilityProviderValue=string|AvailabilityStoreState;
/** The remaining shared per-capture store allowance. Structured providers
 * must check it before constructing keys, rows, roles or parent tuples. */
export type ResourceAvailabilityProviderLimits=Readonly<{storeEntries:number;storeLeaseEdges:number;storeKeyChars:number}>;
export type ResourceAvailabilityProviderOptions=Readonly<{transientScratchBytes?:number}>;
/** Measure the actual JSON UTF-16 length before constructing any output. All
 * call sites supply bounded arrays of primitives, never objects or toJSON hooks.
 * The store and ledger share this encoder so nested escapes are counted at
 * every layer, including JSON.stringify's treatment of lone surrogates. */
export function encodeAvailabilityJSON(value:AvailabilityJSON,maxChars:number):string{
 const overflow=()=>new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Availability JSON encoding bound exceeded');
 if(!Number.isSafeInteger(maxChars)||maxChars<0||maxChars>AVAILABILITY_STATE_LIMITS.chars)throw overflow();
 let length=0;
 const add=(count:number)=>{if(count>maxChars-length)throw overflow();length+=count;};
 const measure=(item:AvailabilityJSON):void=>{
  if(item===null){add(4);return;}
  if(typeof item==='boolean'){add(item?4:5);return;}
  if(typeof item==='number'){
   if(!Number.isFinite(item))throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Invalid availability number');
   add(String(item).length);return;
  }
  if(typeof item==='string'){
   add(2);
   for(let i=0;i<item.length;i++){
    const c=item.charCodeAt(i);
    if(c===34||c===92||c===8||c===9||c===10||c===12||c===13)add(2);
    else if(c<32)add(6);
    else if(c>=0xd800&&c<=0xdbff){const next=item.charCodeAt(i+1);if(next>=0xdc00&&next<=0xdfff){add(2);i++;}else add(6);}
    else if(c>=0xdc00&&c<=0xdfff)add(6);
    else add(1);
   }
   return;
  }
  if(!Array.isArray(item))throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Invalid availability JSON value');
  add(2);let first=true;for(const child of item){if(!first)add(1);first=false;measure(child);}
 };
 measure(value);
 const result=JSON.stringify(value);
 if(result.length!==length)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Availability JSON length mismatch');
 return result;
}
export interface ResourceBudget{
 reserve(cost:ResourceBudgetCost|readonly ResourceBudgetCost[],options?:ResourceBudgetReserveOptions):ResourceBudgetReservation;
 tryReserve(cost:ResourceBudgetCost|readonly ResourceBudgetCost[],options?:ResourceBudgetReserveOptions):ResourceBudgetTryReserveResult;
 /** Callbacks may synchronously release idle reservations; no retry loop runs.
  * Each receives the refused admission's pressure, so an evictor can release
  * only what that admission still lacks (ignoring it keeps the old contract). */
 onPressure(evict:(pressure:ResourceBudgetPressure)=>void,capability?:'metadata-hint-v1'):()=>void;
 /** True only while every current pressure listener has the reviewed, bounded
  * metadata-hint contract. Recheck before and after each pressure admission. */
 supportsMetadataHintRetry():boolean;
 /** Availability is a wake-up hint, not a promise to admit an arbitrary cost. */
 onAvailable(notify:()=>void,signal?:AbortSignal):()=>void;
 /** Coalesced state hints, no capture, history, tracker claim or immediate
  * callback. Shares the bounded observer slots used by trackers. */
 onAvailabilityStateChange(notify:()=>void,signal?:AbortSignal):()=>void;
 /** Internal store registration; providers must return bounded exact state. */
 /** A semantic key names one page-wide provider across unregister/rebuild.
  * A caller choosing one must guarantee that distinct live or future entities
  * never share it; concurrently registered duplicates are rejected. A string
  * provider that constructs temporary data declares its estimated peak bytes;
  * the tracker reserves that credit from its existing structural scratch
  * before calling, and returns it after the callback. Undeclared temporary
  * work must already be covered by the provider's own existing reservation. */
 registerAvailabilityStateProvider(provider:(limits:ResourceAvailabilityProviderLimits)=>ResourceAvailabilityProviderValue,semanticKey?:string,options?:ResourceAvailabilityProviderOptions):()=>void;
 notifyAvailabilityStateChange():void;
 createAvailabilityTracker():ResourceAvailabilityTracker;
 /** One availability wave without a byte drop: charged bytes just became
  * reclaimable by pressure (a released lease entered the recent cache). A
  * woken waiter retries, and its refused admission's pressure path evicts.
  * Returns whether a wave reaches the current listeners: false only when none
  * waits. Called inside another wave, its own wave runs right after that one,
  * so a listener subscribed during the running wave still receives it. */
 notifyReclaimable?():boolean;
 /** Read-only diagnostics: the largest current holders, one row per holder
  * label and category, most charged bytes first (equal bytes in a fixed
  * order), at most min(limit, RESOURCE_BUDGET_HOLDERS_MAX) rows; limit
  * defaults to RESOURCE_BUDGET_HOLDERS_DEFAULT. The live allocation index
  * maintains the charged rows; reads reuse a bounded scalar projection until
  * the next commit, and reserve, release, evict and notify nothing. Bytes held
  * beyond the returned rows are stats.bytes minus their sum. */
 holders?(limit?:number):readonly ResourceBudgetHolder[];
 readonly stats:ResourceBudgetStats;
}

const MiB=1024*1024;
/** Following reclaimable waves one dispatch may send before it stops. */
const MAX_RECLAIMABLE_FOLLOW_UP_WAVES=64;
const categories=new Set<ResourceBudgetCategory>(['read','inflate','normalize','decoded','metadata','construction','packed','gpu-buffer','gpu-vertex-array','texture','mask','shadow','program','program-source','program-submitted','program-retiring','recent','unmeasured-driver','unmeasured-browser']);
const unmeasured=Object.freeze([
 Object.freeze({category:'unmeasured-driver' as const,reason:'Driver allocation, allocator overhead and delayed physical reclamation are not measured by this logical ledger.'}),
 Object.freeze({category:'unmeasured-browser' as const,reason:'Browser, engine, garbage collector and other page memory are not measured; this budget is not a physical-memory cap.'}),
]);
type AllocationIdentity=object|string|symbol;
type Cost=Readonly<{category:ResourceBudgetCategory;bytes:number;precision:'exact'|'estimate';identity:AllocationIdentity;label?:string}>;
type State={active:boolean;costs:readonly Cost[];recent:boolean;retiring:boolean;label?:string;order?:bigint};
type Charge={cost:Cost;state:State;recentClaims:number;retiringClaims:number};
type Allocation=Charge&{claims:Map<State,Cost>};
type Amount={bytes:number;recentBytes:number};
type CategoryUsage={bytes:number;exactBytes:number;estimatedBytes:number;allocations:number};
type Usage=Amount&{exactBytes:number;estimatedBytes:number;retiringBytes:number;categories:Partial<Record<ResourceBudgetCategory,CategoryUsage>>};
type Change={identity:AllocationIdentity;previous:Allocation|undefined;cost:Cost|undefined;next:Charge|undefined};
type Proposal=Amount&{state:State;costs:readonly Cost[];recent:boolean;retiring:boolean;changes:readonly Change[]};
type AvailabilityListener={notify:(()=>void)|undefined;signal:AbortSignal|undefined;abort:(()=>void)|undefined};
type PressureListener={evict:(pressure:ResourceBudgetPressure)=>void;capability?:'metadata-hint-v1'};
type HolderRow={key:string;label:string|undefined;labelSource:ResourceBudgetHolder['labelSource'];category:ResourceBudgetCategory;bytes:number;exactBytes:number;estimatedBytes:number;recentBytes:number;retiringBytes:number;exact:number;estimated:number;reservations:Map<State,number>};
const noAvailabilitySubscription=()=>{};
const shortLabel=(label:string|undefined)=>label===undefined?undefined:label.slice(0,256);
function byteCount(value:number,label:string){
 if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)throw new RangeError(label+' must be a finite nonnegative byte count');
 return Math.ceil(value);
}
function evictOption(options:ResourceBudgetAdmissionOptions|undefined):boolean{
 if(options===undefined||options.evict===undefined)return true;
 if(typeof options.evict!=='boolean')throw resourceContractViolation(new TypeError('Resource admission evict flag must be boolean'));
 return options.evict;
}
function addBytes(a:number,b:number){const result=a+b;if(!Number.isSafeInteger(result))throw new RangeError('Resource byte total exceeds the safe integer range');return result;}
function holderLimit(value:number|undefined){
 if(value===undefined)return RESOURCE_BUDGET_HOLDERS_DEFAULT;
 if(typeof value!=='number'||Number.isNaN(value)||value<0)throw new RangeError('Resource budget holder limit must be a nonnegative number');
 return Math.min(RESOURCE_BUDGET_HOLDERS_MAX,Math.floor(value));
}
// A smaller exact observation never cancels a larger outstanding estimate.
function larger(cost:Cost,previous:Cost){return cost.bytes>previous.bytes||(cost.bytes===previous.bytes&&cost.precision==='exact'&&previous.precision==='estimate');}
function normalize(input:ResourceBudgetCost|readonly ResourceBudgetCost[]):readonly Cost[]{
 const costs:readonly ResourceBudgetCost[]=Array.isArray(input)?input:[input as ResourceBudgetCost],allocations=new Map<AllocationIdentity,Cost>();
 for(const cost of costs){
  if(!cost||!categories.has(cost.category)||(cost.precision!=='exact'&&cost.precision!=='estimate'))throw resourceContractViolation(new TypeError('Invalid resource budget cost'));
  if(cost.identity!==undefined&&(cost.identity===null||(typeof cost.identity!=='object'&&typeof cost.identity!=='function'&&typeof cost.identity!=='string')))throw resourceContractViolation(new TypeError('Resource allocation identity must be an object or string'));
  if(cost.label!==undefined&&typeof cost.label!=='string')throw resourceContractViolation(new TypeError('Resource cost label must be a string'));
  const bytes=byteCount(cost.bytes,'Resource cost');
  if((cost.category==='unmeasured-driver'||cost.category==='unmeasured-browser')&&(cost.precision!=='estimate'||bytes===0))throw resourceContractViolation(new TypeError('An unmeasured resource can only carry an explicit positive estimate; unknown size is not zero'));
  const identity=cost.identity??Symbol('anonymous resource allocation'),value:Cost=Object.freeze({category:cost.category,bytes,precision:cost.precision,identity,label:shortLabel(cost.label)}),previous=allocations.get(identity);
  if(!previous||larger(value,previous))allocations.set(identity,value);
 }
 return Object.freeze([...allocations.values()]);
}
function policy(options:ResourceBudgetOptions={}){
 const profile=options.profile??'desktop';if(profile!=='desktop'&&profile!=='mobile')throw resourceContractViolation(new TypeError('Unknown resource budget profile'));
 // Desktop default 1.5 GB (owner decision 2026-11-12); mobile remains 256 MiB.
 // This limits logical resource accounting, not physical process memory.
 const limitBytes=byteCount(options.limitBytes??(profile==='mobile'?256*MiB:1_500_000_000),'Resource budget limit');
 const recentLimitBytes=byteCount(options.recentLimitBytes??Math.min(limitBytes,(profile==='mobile'?16:32)*MiB),'Recent resource budget limit');
 if(recentLimitBytes>limitBytes)throw new RangeError('Recent resource budget must be a subset of the total limit');
 return{profile,limitBytes,recentLimitBytes};
}

/** Page-owned logical admission only. Backpressure and waiting stay with callers. */
export function createResourceBudget(options:ResourceBudgetOptions={}):ResourceBudget{
 const {profile,limitBytes,recentLimitBytes}=policy(options),states=new Set<State>(),evictors=new Set<PressureListener>(),availabilityListeners=new Set<AvailabilityListener>();
 let pressuring=false,notifyingAvailable=false,pressureEvents=0,evictionAttempts=0,evictionFailures=0,availabilityEvents=0,availabilityNotifications=0,availabilityFailures=0,reclaimableEvents=0,lastPressure:ResourceBudgetPressure|undefined,lastPressureAttempt:ResourceBudgetPressure|undefined;
 let reclaimableFollowUp=false,reclaimableFollowUpWaves=0,reclaimableFollowUpDrops=0;
 const allocations=new Map<AllocationIdentity,Allocation>(),holderRows=new Map<string,HolderRow>();
 const usage:Usage={bytes:0,exactBytes:0,estimatedBytes:0,recentBytes:0,retiringBytes:0,categories:{}};
 let order=0n,holderSnapshot:readonly ResourceBudgetHolder[]|undefined;
 const stateProviders=new Map<string,{provider:(limits:ResourceAvailabilityProviderLimits)=>ResourceAvailabilityProviderValue;transientScratchBytes:number}>(),stateObservers=new Set<()=>void>();
 let nextProvider=0,nextTracker=0,stateNotificationQueued=false,stateRevision=0n;
 const signalAvailabilityState=()=>{
  stateRevision++;
  if(stateNotificationQueued||!stateObservers.size)return;stateNotificationQueued=true;
  queueMicrotask(()=>{stateNotificationQueued=false;for(const notify of [...stateObservers])try{notify();}catch{/* Independent observers cannot stop this wave. */}});
 };
 const stateError=(kind:'overflow'|'ambiguous'|'reentrant',message:string)=>new ResourceAvailabilityStateError(kind==='overflow'?'GROUND_AVAILABILITY_STATE_OVERFLOW':kind==='ambiguous'?'GROUND_AVAILABILITY_STATE_AMBIGUOUS':'GROUND_AVAILABILITY_STATE_REENTRANT',message);
 function subscribeState(notify:()=>void,signal?:AbortSignal,local?:Set<()=>void>):()=>void{
  if(typeof notify!=='function')throw new TypeError('Availability observer required');
  if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean'))throw new TypeError('Availability observer signal must be an AbortSignal');
  if(signal?.aborted)return noAvailabilitySubscription;if(stateObservers.size>=64)throw stateError('overflow','Availability observer bound exceeded');
  let listening=true;const wrapped=()=>{if(listening)notify();};
  const off=()=>{if(!listening)return;listening=false;stateObservers.delete(wrapped);local?.delete(off);signal?.removeEventListener('abort',off);};
  stateObservers.add(wrapped);local?.add(off);signal?.addEventListener('abort',off,{once:true});if(signal?.aborted)off();return off;
 }
 function exactAvailabilityState():string{
  const L=AVAILABILITY_STATE_LIMITS,startRevision=stateRevision;
  if(allocations.size>L.scanAllocations||states.size>L.owners||stateProviders.size>L.providers)throw stateError('overflow','Availability scan/owner bound exceeded');
  // The 4 MiB claim is a logical estimate, not a V8/driver memory reading. Its
  // bounded model reserves 1 MiB for two four-state histories, 0.5 MiB for one
  // store provider, 0.75 MiB for bounded JSON strings and 1.5 MiB for the
  // scratch structures and declared transient provider credits below, leaving
  // 0.25 MiB margin. Charge estimates BEFORE construction/callback invocation.
  const scratchLimit=L.structuralScratchBytes;let scratchBytes=0;
  const scratch=(bytes:number)=>{if(!Number.isSafeInteger(bytes)||bytes<0||bytes>scratchLimit-scratchBytes)throw stateError('overflow','Availability scratch structure bound exceeded');scratchBytes+=bytes;};
  type Term={value:readonly [string,number,string,string|null];key:string;id:number};
  type LabelTerms=Map<string|null,Term>;type PrecisionTerms=Map<string,LabelTerms>;type ByteTerms=Map<number,PrecisionTerms>;
  type OwnerValue=readonly [string|null,boolean,boolean,readonly (readonly [number,number])[]];
  type OwnerGroup={key:string;value:OwnerValue;count:number;id:number};
  type Owner={state:State;counts:Map<Term,number>;group?:OwnerGroup};
  type Row={winner:number;recent:number;retiring:number;flat:number[];count:number};
  scratch(192);const categories=new Map<string,ByteTerms>();
  scratch(384);const terms:Term[]=[],owners:Owner[]=[],stateOwners=new Map<State,Owner>();let termChars=0,ownerChars=0,scannedCosts=0,scannedClaims=0,edges=0;
  const addEdge=()=>{if(++edges>L.encodedEdges)throw stateError('overflow','Availability encoded edge bound exceeded');};
  function termFor(cost:Cost,create:boolean):Term{
   let byBytes=categories.get(cost.category);
   if(!byBytes){if(!create)throw stateError('ambiguous','Availability cost category absent');scratch(256);byBytes=new Map();categories.set(cost.category,byBytes);}
   let byPrecision=byBytes.get(cost.bytes);
   if(!byPrecision){if(!create)throw stateError('ambiguous','Availability cost bytes absent');scratch(256);byPrecision=new Map();byBytes.set(cost.bytes,byPrecision);}
   let byLabel=byPrecision.get(cost.precision);
   if(!byLabel){if(!create)throw stateError('ambiguous','Availability cost precision absent');scratch(256);byLabel=new Map();byPrecision.set(cost.precision,byLabel);}
   const label=cost.label??null;let term=byLabel.get(label);
   if(!term){
    if(!create)throw stateError('ambiguous','Availability cost term absent');
    if(terms.length>=L.termGroups)throw stateError('overflow','Availability cost term bound exceeded');
    scratch(256);const value=[cost.category,cost.bytes,cost.precision,label] as const,key=encodeAvailabilityJSON(value,L.chars-termChars);termChars+=key.length;
    term={value,key,id:-1};byLabel.set(label,term);terms.push(term);
   }
   return term;
  }
  // Costs are read in place: the 11k+ ledger allocations/claims are never
  // copied to arrays. Only distinct terms and owner-term edges are retained.
  for(const state of states){
   if(state.costs.length>L.scanCosts-scannedCosts)throw stateError('overflow','Availability owner cost scan bound exceeded');scannedCosts+=state.costs.length;
   if(!state.costs.length)continue; // No allocation row can refer to this owner.
   scratch(320);const owner:Owner={state,counts:new Map()};owners.push(owner);stateOwners.set(state,owner);
   for(const cost of state.costs){const term=termFor(cost,true),count=owner.counts.get(term);
    if(count===undefined){addEdge();scratch(64);owner.counts.set(term,1);}else owner.counts.set(term,count+1);
   }
  }
  terms.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);terms.forEach((term,id)=>{term.id=id;});
  scratch(192);const ownerGroups=new Map<string,OwnerGroup>();
  for(const owner of owners){
   scratch(owner.counts.size*96+96);const counts:(readonly [number,number])[]=[];
   for(const [term,count] of owner.counts)counts.push([term.id,count]);counts.sort((a,b)=>a[0]-b[0]);
   const value=[owner.state.label??null,owner.state.recent,owner.state.retiring,counts] as const,key=encodeAvailabilityJSON(value,L.chars-ownerChars);ownerChars+=key.length;
   let group=ownerGroups.get(key);if(!group){scratch(160);group={key,value,count:0,id:-1};ownerGroups.set(key,group);}group.count++;owner.group=group;
  }
  scratch(ownerGroups.size*16);const sortedOwners=[...ownerGroups.values()].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);sortedOwners.forEach((group,id)=>{group.id=id;});
  // One reusable bounded typed scratch array; only a previously unseen row is
  // copied. Identical rows increment a count, with no per-allocation strings.
  scratch(L.owners*8);const pairScratch=new Uint32Array(L.owners*2),rows:Row[]=[];
  function compare(row:Row,winner:number,recent:number,retiring:number,pairs:number){
   if(row.winner!==winner)return row.winner-winner;if(row.recent!==recent)return row.recent-recent;if(row.retiring!==retiring)return row.retiring-retiring;
   const size=pairs*2,n=Math.min(row.flat.length,size);for(let i=0;i<n;i++)if(row.flat[i]!==pairScratch[i])return row.flat[i]-pairScratch[i];return row.flat.length-size;
  }
  for(const allocation of allocations.values()){
   if(allocation.claims.size>L.scanClaims-scannedClaims)throw stateError('overflow','Availability allocation claim scan bound exceeded');scannedClaims+=allocation.claims.size;
   if(allocation.claims.size>L.owners)throw stateError('overflow','Availability per-allocation owner bound exceeded');
   let pairs=0;
   for(const [state,cost] of allocation.claims){
    const group=stateOwners.get(state)?.group;if(!group)throw stateError('ambiguous','Availability claim owner absent');
    if(allocation.claims.size>1&&group.count>1)throw stateError('ambiguous','Shared allocation has indistinguishable semantic owners');
    const owner=group.id,term=termFor(cost,false).id;let at=pairs;
    while(at>0&&(pairScratch[(at-1)*2]>owner||(pairScratch[(at-1)*2]===owner&&pairScratch[(at-1)*2+1]>term))){pairScratch[at*2]=pairScratch[(at-1)*2];pairScratch[at*2+1]=pairScratch[(at-1)*2+1];at--;}
    pairScratch[at*2]=owner;pairScratch[at*2+1]=term;pairs++;
   }
   const winner=termFor(allocation.cost,false).id;let low=0,high=rows.length;
   while(low<high){const mid=(low+high)>>>1;if(compare(rows[mid],winner,allocation.recentClaims,allocation.retiringClaims,pairs)<0)low=mid+1;else high=mid;}
   const old=rows[low];
   if(old&&compare(old,winner,allocation.recentClaims,allocation.retiringClaims,pairs)===0){old.count++;continue;}
   if(rows.length>=L.allocationGroups||pairs>L.encodedEdges-edges)throw stateError('overflow','Availability allocation group/edge bound exceeded');edges+=pairs;
   scratch(160+pairs*16);const flat=Array.from(pairScratch.subarray(0,pairs*2));rows.splice(low,0,{winner,recent:allocation.recentClaims,retiring:allocation.retiringClaims,flat,count:1});
  }
  scratch(128);const providers:[string,ResourceAvailabilityProviderValue][]=[];let providerChars=0,storeEntries=0,storeLeaseEdges=0,storeKeyChars=0;
  for(const [id,registered] of stateProviders){
   // These limits are shared by all stores on this page and are supplied
   // before a provider allocates its bounded structured state.
   scratch(96);const limits:ResourceAvailabilityProviderLimits=Object.freeze({storeEntries:L.storeEntries-storeEntries,storeLeaseEdges:L.storeLeaseEdges-storeLeaseEdges,storeKeyChars:L.scanStoreKeyChars-storeKeyChars});
   // A credited callback may return only a string, so no transient tree can
   // remain in the retained provider list after this credit is returned.
   const credit=registered.transientScratchBytes;scratch(credit);let value:ResourceAvailabilityProviderValue;
   try{value=registered.provider(limits);if(credit&&typeof value!=='string')throw stateError('ambiguous','Structured provider cannot return transient credited state');}
   finally{scratchBytes-=credit;}
   if(typeof value==='string'){
    if(value.length>L.chars)throw stateError('overflow','Availability provider encoding bound exceeded');
    const encoded=encodeAvailabilityJSON([id,value],L.chars-providerChars);providerChars+=encoded.length;
   }else{
    if(!Array.isArray(value)||value.length!==3||value[0]!=='store-v2'||!Array.isArray(value[1])||!Array.isArray(value[2])||value[1].length>limits.storeEntries||value[2].length!==value[1].length)throw stateError('overflow','Availability structured provider entry bound exceeded');
    let chars=0,leases=0;
    for(const key of value[1]){
     if(!Array.isArray(key)||key.length!==3||!['cpu','gpu'].includes(key[0])||(key[1]!==null&&(!Number.isSafeInteger(key[1])||key[1]<0))||typeof key[2]!=='string'||key[2].length>L.chars||key[2].length>limits.storeKeyChars-chars)throw stateError('overflow','Availability structured provider key bound exceeded');chars+=key[2].length;
    }
    for(let i=0;i<value[2].length;i++){
     const row=value[2][i];
     if(!Array.isArray(row)||row.length!==6||row[0]!==i||!Number.isInteger(row[1])||row[1]<0||row[1]>6||!Number.isInteger(row[2])||row[2]<0||row[2]>31||!Number.isSafeInteger(row[3])||row[3]<0||!Array.isArray(row[4])||!Array.isArray(row[5]))throw stateError('ambiguous','Availability structured provider row invalid');
     const size=row[4].length+row[5].length;if(size>limits.storeLeaseEdges-leases)throw stateError('overflow','Availability structured provider lease bound exceeded');leases+=size;
     for(const role of row[4])if(!Number.isInteger(role)||role<0||role>9)throw stateError('ambiguous','Availability structured provider role invalid');
     for(const parent of row[5])if(!Array.isArray(parent)||parent.length!==2||!Number.isInteger(parent[0])||parent[0]<0||parent[0]>=value[1].length||!Number.isInteger(parent[1])||parent[1]<0||parent[1]>9)throw stateError('ambiguous','Availability structured provider parent invalid');
    }
    storeEntries+=value[1].length;storeLeaseEdges+=leases;storeKeyChars+=chars;
    const encodedId=encodeAvailabilityJSON(id,L.chars-providerChars);providerChars+=encodedId.length;
   }
   scratch(64);providers.push([id,value]);
  }
  providers.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  // Long content identities and truncated reservation labels frequently share
  // exact prefixes. A deterministic 64-code-unit chunk dictionary shares those
  // bytes across the whole snapshot. Chunks and reconstructed strings are
  // compared exactly; no digest, approximate fingerprint or truncation is used.
  type TextChunk={value:string;id:number};type Text={value:string;parts:TextChunk[];id:number};
  scratch(384);const chunkByValue=new Map<string,TextChunk>(),textByValue=new Map<string,Text>();let textScan=0,chunkChars=0,textRefs=0;
  function collectText(value:string|null){
   if(value===null||value.length<64||textByValue.has(value))return;
   if(textByValue.size>=L.longTextGroups||value.length>L.scanTextChars-textScan)throw stateError('overflow','Availability text scan/group bound exceeded');textScan+=value.length;
   scratch(128);const text:Text={value,parts:[],id:-1};textByValue.set(value,text);
   for(let at=0;at<value.length;at+=64){
    if(++textRefs>L.textChunkRefs)throw stateError('overflow','Availability text reference bound exceeded');
    const piece=value.slice(at,at+64);let chunk=chunkByValue.get(piece);
    if(!chunk){
     if(chunkByValue.size>=L.textChunkGroups)throw stateError('overflow','Availability text chunk bound exceeded');
     scratch(192);const encoded=encodeAvailabilityJSON(piece,L.chars-chunkChars);chunkChars+=encoded.length;
     chunk={value:piece,id:-1};chunkByValue.set(piece,chunk);
    }
    scratch(8);text.parts.push(chunk);
   }
  }
  for(const term of terms)collectText(term.value[3]);for(const owner of sortedOwners)collectText(owner.value[0]);
  for(const [,value] of providers)if(typeof value!=='string'){
   let keyChars=0;for(const key of value[1]){
    if(!Array.isArray(key)||key.length!==3||typeof key[2]!=='string'||key[2].length>L.chars||key[2].length>L.scanStoreKeyChars-keyChars)throw stateError('overflow','Availability store identity bound exceeded');
    keyChars+=key[2].length;collectText(key[2]);
   }
  }
  scratch(chunkByValue.size*16+textByValue.size*16);const chunks=[...chunkByValue.values()].sort((a,b)=>a.value<b.value?-1:a.value>b.value?1:0),texts=[...textByValue.values()].sort((a,b)=>a.value<b.value?-1:a.value>b.value?1:0);
  chunks.forEach((chunk,id)=>{chunk.id=id;});texts.forEach((text,id)=>{text.id=id;});
  const compactText=(value:string|null):string|null|readonly [number]=>value===null||value.length<64?value:[textByValue.get(value)!.id];
  scratch(256+terms.length*64+sortedOwners.length*64+rows.length*80+chunks.length*8+texts.length*40+textRefs*8+providers.length*32+storeEntries*80);
  const compactTerms=terms.map(({value})=>[value[0],value[1],value[2],compactText(value[3])]);
  const compactOwners=sortedOwners.map(({value})=>[compactText(value[0]),value[1],value[2],value[3]]);
  const compactProviders=providers.map(([id,value])=>[id,typeof value==='string'?value:['store-v2',value[1].map(key=>[key[0],key[1],compactText(key[2])]),value[2]]]);
  const result=encodeAvailabilityJSON(['availability-v3',limitBytes,recentLimitBytes,chunks.map(chunk=>chunk.value),texts.map(text=>text.parts.map(chunk=>chunk.id)),compactTerms,compactOwners,rows.map(row=>[row.winner,row.recent,row.retiring,row.flat,row.count]),compactProviders],L.chars);
  if(startRevision!==stateRevision)throw stateError('reentrant','Availability state changed during capture');
  return result;
 }
 function makeAvailabilityTracker():ResourceAvailabilityTracker{
  // One fixed claim pays for two controllers' up-to-four retained 65,536-char
  // states each, plus one bounded construction/sort working set. Estimate only.
  nextTracker=checkedAvailabilitySequence(nextTracker);
  const claim=reserve({category:'metadata',bytes:AVAILABILITY_STATE_LIMITS.trackerBytes,precision:'estimate',identity:{},label:'availability tracker state and scratch'},{label:'availability-tracker:'+nextTracker,evict:true});
  let active=true,capturing=false;const local=new Set<()=>void>();
  return Object.freeze({
   capture(){if(!active)throw new Error('Availability tracker released');if(capturing)throw stateError('reentrant','Availability capture reentered');capturing=true;try{return exactAvailabilityState();}finally{capturing=false;}},
   onChange(notify:()=>void,signal?:AbortSignal){if(!active)throw new Error('Availability tracker released');return subscribeState(notify,signal,local);},
   release(){if(!active)return;active=false;for(const off of [...local])off();claim.release();},
  });
 }
 // Order belongs to an admitted reservation, not to the latest adjustment or
 // its Map insertion. Reentrant reservations admitted during pressure precede
 // the outer reservation, exactly as in the original live Set reduction.
 function wins(cost:Cost,state:State,previous:Cost,winner:State){
  return larger(cost,previous)||!larger(previous,cost)&&state.order!==undefined&&(winner.order===undefined||state.order<winner.order);
 }
 function replacement(previous:Allocation|undefined,state:State,cost:Cost|undefined,recent:boolean,retiring:boolean):Charge|undefined{
  let winner:State|undefined,value:Cost|undefined;
  if(previous){
   if(previous.state!==state){winner=previous.state;value=previous.cost;}
   else for(const [other,claim]of previous.claims)if(other!==state&&(!value||wins(claim,other,value,winner!))){winner=other;value=claim;}
  }
  if(cost&&(!value||wins(cost,state,value,winner!))){winner=state;value=cost;}
  if(!value)return;
  const owned=previous?.claims.has(state)??false;
  // Recent/retiring are the OR of all claims, including smaller observations.
  // Removing a normal live claim cannot expose previously uncharged recent bytes.
  return{cost:value,state:winner!,recentClaims:(previous?.recentClaims??0)-Number(owned&&state.recent)+Number(!!cost&&recent),retiringClaims:(previous?.retiringClaims??0)-Number(owned&&state.retiring)+Number(!!cost&&retiring)};
 }
 function propose(state:State,costs:readonly Cost[],recent:boolean,retiring:boolean):Proposal{
  const changed=new Map<AllocationIdentity,Cost|undefined>();
  // A pressure callback may have released the state being adjusted. Such a
  // proposal has no live effect and the caller will return false after admission.
  if(state.active){for(const cost of state.costs)changed.set(cost.identity,undefined);for(const cost of costs)changed.set(cost.identity,cost);}
  const changes:Change[]=[];let bytes=usage.bytes,recentBytes=usage.recentBytes;
  for(const [identity,cost]of changed){
   const previous=allocations.get(identity),next=replacement(previous,state,cost,recent,retiring);
   changes.push({identity,previous,cost,next});
   if(previous){bytes-=previous.cost.bytes;if(previous.recentClaims)recentBytes-=previous.cost.bytes;}
  }
  // Remove every replaced charge before adding any new charge: a valid swap
  // near MAX_SAFE_INTEGER must not overflow just because its additions came first.
  for(const {next}of changes)if(next){bytes=addBytes(bytes,next.cost.bytes);if(next.recentClaims)recentBytes=addBytes(recentBytes,next.cost.bytes);}
  return{state,costs,recent,retiring,changes,bytes,recentBytes};
 }
 function charge(value:Charge,direction:1|-1){
  const{cost,state}=value,bytes=direction*cost.bytes,exact=cost.precision==='exact';
  usage.bytes+=bytes;if(value.recentClaims)usage.recentBytes+=bytes;if(value.retiringClaims)usage.retiringBytes+=bytes;
  if(exact)usage.exactBytes+=bytes;else usage.estimatedBytes+=bytes;
  const category=usage.categories[cost.category]??(usage.categories[cost.category]={bytes:0,exactBytes:0,estimatedBytes:0,allocations:0});
  category.bytes+=bytes;if(exact)category.exactBytes+=bytes;else category.estimatedBytes+=bytes;category.allocations+=direction;
  if(!category.allocations)delete usage.categories[cost.category];
  const labelSource=state.label!==undefined?'reservation':cost.label!==undefined?'cost':'none',label=state.label??cost.label,key=labelSource+':'+cost.category+':'+(label??'');
  let row=holderRows.get(key);
  if(!row){row={key,label,labelSource,category:cost.category,bytes:0,exactBytes:0,estimatedBytes:0,recentBytes:0,retiringBytes:0,exact:0,estimated:0,reservations:new Map()};holderRows.set(key,row);}
  row.bytes+=bytes;if(value.recentClaims)row.recentBytes+=bytes;if(value.retiringClaims)row.retiringBytes+=bytes;
  if(exact){row.exactBytes+=bytes;row.exact+=direction;}else{row.estimatedBytes+=bytes;row.estimated+=direction;}
  const count=(row.reservations.get(state)??0)+direction;if(count)row.reservations.set(state,count);else row.reservations.delete(state);
  if(!row.exact&&!row.estimated)holderRows.delete(key);
 }
 function commit(proposal:Proposal,active=true){
  const{state,costs,recent,retiring,changes}=proposal;
  // No callbacks run between removing the old charges and publishing the new
  // index. Proposal totals are safe integers; admission also checked capacity.
  holderSnapshot=undefined;
  for(const {previous,next}of changes)if(previous){
   if(sameChargeOwner(previous,next)){if(changedChargeFlags(previous,next!))chargeFlags(previous,-1);}
   else charge(previous,-1);
  }
  if(active&&state.order===undefined){state.order=++order;states.add(state);}
  for(const {identity,previous,cost,next}of changes){
   if(!next){allocations.delete(identity);continue;}
   const stableOwner=sameChargeOwner(previous,next),changedFlags=stableOwner&&changedChargeFlags(previous!,next);
   const claims=previous?.claims??new Map<State,Cost>();
   if(cost)claims.set(state,cost);else claims.delete(state);
   const allocation:Allocation=previous??{...next,claims};
   allocation.cost=next.cost;allocation.state=next.state;allocation.recentClaims=next.recentClaims;allocation.retiringClaims=next.retiringClaims;
   allocations.set(identity,allocation);
   if(stableOwner){if(changedFlags)chargeFlags(allocation,1);}else charge(allocation,1);
  }
  state.costs=costs;state.recent=recent;state.retiring=retiring;
  if(!active){state.active=false;states.delete(state);state.label=undefined;}
  signalAvailabilityState();
 }
 // Role changes do not alter the winning allocation or holder membership.
 // Keep those indexes intact instead of deleting and recreating their rows.
 function sameChargeOwner(previous:Charge|undefined,next:Charge|undefined){return !!previous&&!!next&&previous.state===next.state&&previous.cost===next.cost;}
 function changedChargeFlags(previous:Charge,next:Charge){return !!previous.recentClaims!==!!next.recentClaims||!!previous.retiringClaims!==!!next.retiringClaims;}
 function chargeFlags(value:Charge,direction:1|-1){
  const {cost,state}=value,bytes=direction*cost.bytes;
  const labelSource=state.label!==undefined?'reservation':cost.label!==undefined?'cost':'none',label=state.label??cost.label;
  const row=holderRows.get(labelSource+':'+cost.category+':'+(label??''))!;
  if(value.recentClaims){usage.recentBytes+=bytes;row.recentBytes+=bytes;}
  if(value.retiringClaims){usage.retiringBytes+=bytes;row.retiringBytes+=bytes;}
 }
 const amount=():Amount=>({bytes:usage.bytes,recentBytes:usage.recentBytes});
 function notifyAvailable(before:Amount){
  if(usage.bytes>=before.bytes&&usage.recentBytes>=before.recentBytes)return;
  availabilityEvents++;dispatchAvailable();
 }
 function wave(){
  for(const listener of [...availabilityListeners]){
   const notify=listener.notify;if(!notify)continue;availabilityNotifications++;
   try{notify();}catch{availabilityFailures++;}
  }
 }
 function dispatchAvailable(){
  // A callback may release another claim. Existing repaint/work queues receive
  // one synchronous wave and observe the final capacity when they next run;
  // the ledger never recursively dispatches or creates a production queue.
  // A reclaimable event raised inside a wave is its own event: it is sent as
  // one following wave after this one (never nested), so a listener that
  // subscribed during this wave also learns of it. The chunk store raises at
  // most one per entry and frame; the bound below only stops a listener that
  // re-raises one from every notification.
  if(notifyingAvailable)return;notifyingAvailable=true;
  try{
   wave();
   for(let followUps=0;reclaimableFollowUp;followUps++){
    reclaimableFollowUp=false;
    if(followUps>=MAX_RECLAIMABLE_FOLLOW_UP_WAVES){reclaimableFollowUpDrops++;break;}
    reclaimableFollowUpWaves++;wave();
   }
  }finally{notifyingAvailable=false;reclaimableFollowUp=false;}
 }
 const fits=(value:Amount)=>value.bytes<=limitBytes&&value.recentBytes<=recentLimitBytes;
 function pressureDetails(required:Amount,label?:string,costs:readonly Cost[]=[]):ResourceBudgetPressure{
  const current=usage,total=required.bytes>limitBytes,recent=required.recentBytes>recentLimitBytes;
  const top:Cost[]=[];
  for(const cost of costs){let at=0;while(at<top.length&&top[at].bytes>=cost.bytes)at++;if(at>=4)continue;top.splice(at,0,cost);if(top.length>4)top.pop();}
  const requestedCosts=Object.freeze(top.map(cost=>Object.freeze({category:cost.category,bytes:cost.bytes,precision:cost.precision,label:cost.label})));
  return Object.freeze({capacity:limitBytes,required:required.bytes,current:current.bytes,recentCapacity:recentLimitBytes,recentRequired:required.recentBytes,recentCurrent:current.recentBytes,shortfallBytes:Math.max(0,required.bytes-limitBytes),recentShortfallBytes:Math.max(0,required.recentBytes-recentLimitBytes),additionalBytes:Math.max(0,required.bytes-current.bytes),constraint:total&&recent?'total-and-recent':recent?'recent':'total',label,requestedCostCount:costs.length,requestedCosts});
 }
 function admit(proposed:()=>Proposal,label:string|undefined,evict:boolean,requested:()=>readonly Cost[]):Proposal|ResourceBudgetExceededError{
  let required=proposed();if(fits(required))return required;
  // A quiet admission refuses with the same details, without any side effect.
  if(!evict)return new ResourceBudgetExceededError(pressureDetails(required,label,requested()));
  pressureEvents++;lastPressureAttempt=pressureDetails(required,label,requested());
  if(!pressuring&&evictors.size){
   pressuring=true;
   // One snapshot before any listener runs; listeners see the same refusal.
   const pressure=lastPressureAttempt;
   try{for(const listener of [...evictors])if(evictors.has(listener)){evictionAttempts++;try{listener.evict(pressure);}catch{evictionFailures++;}}}
   finally{pressuring=false;}
  }
  // Pressure callbacks can reserve, adjust or release any involved claim.
  // Rebuild only this proposal's affected identities against the live index.
  required=proposed();if(fits(required))return required;
  lastPressure=pressureDetails(required,label,requested());return new ResourceBudgetExceededError(lastPressure);
 }
 function reserve(input:ResourceBudgetCost|readonly ResourceBudgetCost[],reserveOptions:ResourceBudgetReserveOptions={}):ResourceBudgetReservation{
  if(reserveOptions.label!==undefined&&typeof reserveOptions.label!=='string')throw resourceContractViolation(new TypeError('Resource reservation label must be a string'));
  if(reserveOptions.recent!==undefined&&typeof reserveOptions.recent!=='boolean')throw resourceContractViolation(new TypeError('Recent reservation flag must be boolean'));
  const evict=evictOption(reserveOptions);
  const state:State={active:true,costs:normalize(input),recent:reserveOptions.recent??false,retiring:false,label:shortLabel(reserveOptions.label)};
  const admitted=admit(()=>propose(state,state.costs,state.recent,state.retiring),state.label,evict,()=>state.costs);if(admitted instanceof ResourceBudgetExceededError)throw admitted;commit(admitted);
  return reservation(state);
 }
 // Handles retain only their own state, never the reserve input or a proposal
 // containing another allocation's previous winner and claim Map.
 function reservation(state:State):ResourceBudgetReservation{
  const setRetiring=(value:boolean)=>{if(typeof value!=='boolean')throw resourceContractViolation(new TypeError('Retiring reservation flag must be boolean'));if(!state.active||state.retiring===value)return;const before=amount();commit(propose(state,state.costs,value?false:state.recent,value));notifyAvailable(before);};
  return{
   adjust(next,options){
    if(!state.active)return false;const costs=normalize(next),admitted=admit(()=>propose(state,costs,state.recent,state.retiring),state.label,evictOption(options),()=>costs);
    if(admitted instanceof ResourceBudgetExceededError||!state.active)return false;const before=amount();commit(admitted);notifyAvailable(before);return true;
   },
   release(){if(!state.active)return;const before=amount();commit(propose(state,[],false,false),false);notifyAvailable(before);},
   setRecent(value,options){
    if(typeof value!=='boolean')throw resourceContractViolation(new TypeError('Recent reservation flag must be boolean'));
    const evict=evictOption(options);
    if(!state.active||(value&&state.retiring))return false;if(value===state.recent)return true;
    const admitted=admit(()=>propose(state,state.costs,value,state.retiring),state.label,evict,()=>state.costs);if(admitted instanceof ResourceBudgetExceededError||!state.active||(value&&state.retiring))return false;const before=amount();commit(admitted);notifyAvailable(before);return true;
   },
   markRetiring(){setRetiring(true);},setRetiring,
   get active(){return state.active;},
   get bytes(){return state.costs.reduce((total,cost)=>addBytes(total,cost.bytes),0);},
   get recent(){return state.active&&state.recent;},
  };
 }
 return{
  reserve,
  registerAvailabilityStateProvider(provider,semanticKey,options){
   if(typeof provider!=='function')throw new TypeError('Availability state provider required');
   if(semanticKey!==undefined&&(typeof semanticKey!=='string'||semanticKey.length===0||semanticKey.length>256))throw new TypeError('Availability semantic provider key must be 1 to 256 UTF-16 characters');
   if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))throw new TypeError('Availability provider options must be an object');
   const requestedScratchBytes=options?.transientScratchBytes,transientScratchBytes=requestedScratchBytes===undefined?0:requestedScratchBytes;
   if(!Number.isSafeInteger(transientScratchBytes)||transientScratchBytes<0||transientScratchBytes>AVAILABILITY_STATE_LIMITS.structuralScratchBytes)throw new RangeError('Invalid transient availability provider scratch estimate');
   let id:string;
   if(semanticKey===undefined){nextProvider=checkedAvailabilitySequence(nextProvider);id='n:'+nextProvider;}
   else id='s:'+semanticKey;
   if(stateProviders.has(id))throw stateError('ambiguous','Availability semantic provider key already active');
   stateProviders.set(id,{provider,transientScratchBytes});signalAvailabilityState();let active=true;
   return()=>{if(!active)return;active=false;stateProviders.delete(id);signalAvailabilityState();};
  },
  notifyAvailabilityStateChange:signalAvailabilityState,
  createAvailabilityTracker:makeAvailabilityTracker,
  tryReserve(cost,reserveOptions):ResourceBudgetTryReserveResult{try{return{ok:true,reservation:reserve(cost,reserveOptions)};}catch(error){if(error instanceof ResourceBudgetExceededError)return{ok:false,error};throw error;}},
  onPressure(evict,capability){
   if(typeof evict!=='function')throw resourceContractViolation(new TypeError('Resource eviction callback must be a function'));
   if(capability!==undefined&&capability!=='metadata-hint-v1')throw resourceContractViolation(new TypeError('Invalid metadata hint capability'));
   const listener:PressureListener={evict,capability};evictors.add(listener);signalAvailabilityState();
   return()=>{if(evictors.delete(listener))signalAvailabilityState();};
  },
  supportsMetadataHintRetry(){for(const listener of evictors)if(listener.capability!=='metadata-hint-v1')return false;return true;},
  onAvailabilityStateChange:(notify,signal)=>subscribeState(notify,signal),
  notifyReclaimable(){
   // A tracker is an availability observer in its own right. An owner may
   // become reclaimable without a byte change after the last onAvailable
   // listener removed itself in a preceding wave. Also advance the revision
   // during capture even when no observer is currently installed.
   const tracked=stateObservers.size>0;signalAvailabilityState();
   if(!availabilityListeners.size&&!tracked)return false;reclaimableEvents++;
   if(!availabilityListeners.size)return true;
   // Inside a running wave the event is delivered by its following wave.
   if(notifyingAvailable){reclaimableFollowUp=true;return true;}
   dispatchAvailable();return true;
  },
  onAvailable(notify,signal){
   if(typeof notify!=='function')throw resourceContractViolation(new TypeError('Resource availability callback must be a function'));
   if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean'))throw resourceContractViolation(new TypeError('Resource availability signal must be an AbortSignal'));
   if(signal?.aborted)return noAvailabilitySubscription;
   const listener:AvailabilityListener={notify,signal,abort:undefined};
   const unsubscribe=()=>{availabilityListeners.delete(listener);if(listener.signal&&listener.abort)listener.signal.removeEventListener('abort',listener.abort);listener.notify=undefined;listener.signal=undefined;listener.abort=undefined;};
   availabilityListeners.add(listener);
   if(signal){listener.abort=unsubscribe;signal.addEventListener('abort',unsubscribe,{once:true});if(signal.aborted)unsubscribe();}
   return unsubscribe;
  },
  holders(limit){
   const size=holderLimit(limit);if(!size)return Object.freeze([]);
   if(!holderSnapshot){
    // Rows are already aggregated by committed winners. Only the bounded
    // scalar result is cached: no State, Cost or allocation identity escapes
    // into it, and repeated reads never traverse the live claims again.
    const top:HolderRow[]=[],before=(a:HolderRow,b:HolderRow)=>a.bytes>b.bytes||(a.bytes===b.bytes&&a.key<b.key);
    for(const row of holderRows.values()){
     if(top.length===RESOURCE_BUDGET_HOLDERS_MAX&&!before(row,top[RESOURCE_BUDGET_HOLDERS_MAX-1]))continue;
     let at=top.length;while(at>0&&before(row,top[at-1]))at--;
     top.splice(at,0,row);if(top.length>RESOURCE_BUDGET_HOLDERS_MAX)top.pop();
    }
    holderSnapshot=Object.freeze(top.map((row):ResourceBudgetHolder=>Object.freeze({label:row.label,labelSource:row.labelSource,category:row.category,bytes:row.bytes,exactBytes:row.exactBytes,estimatedBytes:row.estimatedBytes,recentBytes:row.recentBytes,retiringBytes:row.retiringBytes,count:row.reservations.size,allocations:row.exact+row.estimated,precision:row.exact&&row.estimated?'mixed':row.exact?'exact':'estimate'})));
   }
   return size>=holderSnapshot.length?holderSnapshot:Object.freeze(holderSnapshot.slice(0,size));
  },
  get stats(){
   const categoryStats:Partial<Record<ResourceBudgetCategory,ResourceBudgetCategoryStats>>={};
   for(const [category,cost]of Object.entries(usage.categories))categoryStats[category as ResourceBudgetCategory]=Object.freeze({bytes:cost.bytes,exactBytes:cost.exactBytes,estimatedBytes:cost.estimatedBytes});
   return Object.freeze({profile,limitBytes,recentLimitBytes,bytes:usage.bytes,totalBytes:usage.bytes,exactBytes:usage.exactBytes,estimatedBytes:usage.estimatedBytes,recentBytes:usage.recentBytes,retiringBytes:usage.retiringBytes,reservations:states.size,allocations:allocations.size,pressureEvents,evictionAttempts,evictionFailures,availableBytes:Math.max(0,limitBytes-usage.bytes),recentAvailableBytes:Math.max(0,recentLimitBytes-usage.recentBytes),availabilityListeners:availabilityListeners.size,availabilityEvents,availabilityNotifications,availabilityFailures,reclaimableEvents,reclaimableFollowUpWaves,reclaimableFollowUpDrops,categories:Object.freeze(categoryStats),lastPressure,lastPressureAttempt,accounting:'logical-controlled-resource-bytes' as const,physicalMemory:'unmeasured' as const,unmeasured});
  },
 };
}

const pageBudgets=new WeakMap<object,ResourceBudget>();
/** The first caller configures this page; later callers share the same ledger. */
export function getPageResourceBudget(options?:ResourceBudgetOptions,pageOwner:object=globalThis):ResourceBudget{
 if(pageOwner===null||(typeof pageOwner!=='object'&&typeof pageOwner!=='function'))throw resourceContractViolation(new TypeError('Page resource budget owner must be an object'));
 const existing=pageBudgets.get(pageOwner);
 if(existing){
  const stats=existing.stats;
  if((options?.profile!==undefined&&options.profile!==stats.profile)||(options?.limitBytes!==undefined&&byteCount(options.limitBytes,'Resource budget limit')!==stats.limitBytes)||(options?.recentLimitBytes!==undefined&&byteCount(options.recentLimitBytes,'Recent resource budget limit')!==stats.recentLimitBytes))throw new Error('Page resource budget has already been configured with different limits');
  return existing;
 }
 const budget=createResourceBudget(options);pageBudgets.set(pageOwner,budget);return budget;
}
