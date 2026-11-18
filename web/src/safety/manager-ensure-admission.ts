import {ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {tryAdmitSolarShadowBoundary,currentSolarShadowBoundary,onSolarShadowBoundaryCached,solarShadowBoundaryIndexBytes,SOLAR_BOUNDARY_INDEX_MODEL,type PreparedSolarBoundary,type SolarShadowBoundary} from './solar-shadow-admission';

/*
 * Ingress admission shared by the painted 3D managers of one page.
 *
 * Every manager of a page reads the same index.json and city boundary. They are
 * read and parsed once per page ledger and key (city): the first waiting manager
 * runs the production, later managers join it, and the parsed pair stays charged
 * once until the last manager returns its lease. No manager holds a claim while
 * it waits for that production, so managers never wait on one another.
 *
 * Each stage of the production, and every partition page a manager reads under
 * retryManagerAdmission, is admitted at once. A refusal that could fit once other
 * holders release throws ManagerAdmissionRetry; the work returns every claim it
 * holds and then waits holding nothing. Work nobody waits for any longer is
 * cancelled and returns its claims. A claim that cannot fit beside the work's own
 * held claims inside the page capacity is reported as not fitting at once.
 * Waiting uses ledger availability, the solar index cache's insertion hint and the
 * caller's AbortSignal only: there is no timer, polling loop or deadline. (A
 * manager's readAsset is caller-admitted and never runs here: its caller holds the
 * parse working set while it reads.)
 */

/** A one-shot admission was refused while other holders occupy the page ledger.
 * The work that asked returns every claim it holds before this reaches a retry
 * loop, which then waits holding nothing for `requiredBytes`: the refused claim
 * plus the claims the work held beside it. `admissionBytes` is the refused claim
 * alone, which is all that needs room when other holders keep the rest charged. */
export class ManagerAdmissionRetry extends Error{
 readonly code='MANAGER_ADMISSION_RETRY';
 readonly requiredBytes:number;readonly admissionBytes:number;readonly label:string;
 constructor(requiredBytes:number,label:string,admissionBytes=requiredBytes){
  super(('Page ledger admission of '+requiredBytes+' logical bytes waits for capacity: '+label).slice(0,512));
  this.name='ManagerAdmissionRetry';this.requiredBytes=requiredBytes;this.admissionBytes=Math.min(requiredBytes,admissionBytes);this.label=label.slice(0,256);
 }
}
const abortReason=(signal:AbortSignal)=>signal.reason??new DOMException('Aborted','AbortError');
const usableBudget=(budget:unknown):budget is ResourceBudget=>!!budget&&typeof (budget as ResourceBudget).tryReserve==='function'&&typeof (budget as ResourceBudget).onAvailable==='function';
let capacityWaits=0,capacityWakeups=0,registrationWakeups=0,deferredWakeups=0,admissionRetries=0;

export type ManagerCapacityWait=Readonly<{
 /** Ends the wait as well, checked with the capacity, e.g. "the solar index is cached". */
 satisfied?:()=>boolean;
 /** Whether room already present when the wait registers ends it (default true).
  * A retry loop whose previous wait ended so and was refused again passes false,
  * so a refusal that free plus reclaimable bytes do not explain waits for a wave. */
 checkAtRegistration?:boolean;
 /** Subscribes a wake-up for a change that ends `satisfied` without a ledger wave
  * (e.g. onSolarShadowBoundaryCached: a hand-off or tryAdmit caches the index and
  * moves no byte); it returns the unsubscribe and ends with the wait's signal too.
  * A wake-up ends the wait only once `satisfied` holds. */
 wakeWhen?:(wake:()=>void,signal:AbortSignal)=>()=>void;
}>;
/** Waits holding nothing until the page ledger's free plus reclaimable bytes can
 * hold `requiredBytes` (or `satisfied` holds), or the signal aborts. It resolves
 * 'registration' when room was already present as it registered, otherwise 'wave'.
 * One availability registration per wait and one deferred check per wake-up wave,
 * plus `wakeWhen`'s one subscription when `satisfied` is given; no timer, polling
 * or deadline. */
export function awaitManagerCapacity(budget:ResourceBudget,requiredBytes:number,signal:AbortSignal,options:ManagerCapacityWait={}):Promise<'registration'|'wave'>{
 if(!usableBudget(budget))return Promise.reject(new TypeError('Manager admission requires the page resource budget'));
 if(!Number.isSafeInteger(requiredBytes)||requiredBytes<0)return Promise.reject(new RangeError('Invalid manager admission requirement'));
 if(signal.aborted)return Promise.reject(abortReason(signal));
 const satisfied=options.satisfied;
 // Free bytes plus the recent bytes a refused admission's pressure evicts: the
 // same test as every other page waiter's, at a wave and at registration.
 const room=()=>{if(satisfied?.())return true;const stats=budget.stats;return stats.availableBytes+stats.recentBytes>=requiredBytes;};
 return new Promise<'registration'|'wave'>((resolve,reject)=>{
  let done=false,queued=false,stop:(()=>void)|undefined,stopWake:(()=>void)|undefined;
  const finish=(error?:unknown,how:'registration'|'wave'='wave')=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const off=stop,offWake=stopWake;stop=stopWake=undefined;off?.();offWake?.();if(error===undefined)resolve(how);else reject(error);};
  const abort=()=>finish(abortReason(signal));
  signal.addEventListener('abort',abort,{once:true});capacityWaits++;
  // Availability is a wake-up hint. A wave whose free plus reclaimable bytes still
  // cannot hold the work keeps this one registration.
  stop=budget.onAvailable(()=>{
   if(done||queued)return;queued=true;
   queueMicrotask(()=>{queued=false;if(done)return;if(room()){capacityWakeups++;finish();}else deferredWakeups++;});
  },signal);
  // A change that satisfies the wait without moving a byte (the same solar index
  // handed off or admitted by another caller) runs no ledger wave: its own hint
  // ends the wait, in a microtask, once `satisfied` holds.
  if(!done&&satisfied&&options.wakeWhen){try{stopWake=options.wakeWhen(()=>{if(!done&&satisfied()){capacityWakeups++;finish();}},signal);}catch(error){finish(error);return;}}
  // Room another holder freed, or made reclaimable, while the refused work was
  // still unwinding came before this registration and no later wave reports it:
  // it is checked once here.
  if(!done&&options.checkAtRegistration!==false&&room()){registrationWakeups++;finish(undefined,'registration');}
 });
}

/** A refusal the work has already returned its claims for: a ManagerAdmissionRetry,
 * or any error of its shape (its code and a whole requiredBytes), such as a
 * native source cohort returning its whole batch (NativeSourceCohortYield, IA-R1).
 * Checked by shape, so it holds across module copies of the class. */
export function isManagerAdmissionRetry(error:unknown):error is Readonly<{code:'MANAGER_ADMISSION_RETRY';requiredBytes:number}>{
 const value=error as {code?:unknown;requiredBytes?:unknown}|null;
 return !!value&&typeof value==='object'&&value.code==='MANAGER_ADMISSION_RETRY'&&Number.isSafeInteger(value.requiredBytes)&&(value.requiredBytes as number)>=0;
}

/** Runs `work` to completion. Each admission retry it throws (isManagerAdmissionRetry),
 * after it has returned its own claims (a cohort its whole batch), waits holding
 * nothing and starts the work again; any other outcome, including the caller's
 * abort, settles the call. */
export async function retryManagerAdmission<T>(budget:ResourceBudget,signal:AbortSignal,work:()=>Promise<T>):Promise<T>{
 let checkAtRegistration=true;
 for(;;){
  signal.throwIfAborted();
  try{return await work();}
  catch(error){
   if(!isManagerAdmissionRetry(error))throw error;
   if(signal.aborted)throw abortReason(signal);
   admissionRetries++;checkAtRegistration=await awaitManagerCapacity(budget,error.requiredBytes,signal,{checkAtRegistration})==='wave';
  }
 }
}

/** A verified boundary's solar index is admitted synchronously and strictly
 * (tryAdmitSolarShadowBoundary): a cached index is returned as it is; otherwise
 * the exact index is reserved on the page ledger and built in this turn, so no
 * placeholder is returned in between and no availability wave can hand its bytes
 * to another reserver, and the solar module registers no wait of its own. A
 * refusal allocates and caches nothing: it throws ManagerAdmissionRetry, after
 * which the caller returns every claim it holds and waits holding nothing; an
 * index that can never fit beside `heldBytes` rethrows the ledger's error, and
 * one larger than the whole ledger throws SolarShadowBoundaryUnfitError. Both of
 * those fail at once, without a retry. */
export function handOffSolarShadowBoundary(budget:ResourceBudget,value:SolarShadowBoundary,signal:AbortSignal,heldBytes=0):Promise<PreparedSolarBoundary>{
 signal.throwIfAborted();
 try{return Promise.resolve(tryAdmitSolarShadowBoundary(value,{budget}));}
 catch(error){
  if(!(error instanceof ResourceBudgetExceededError))throw error;
  const bytes=solarShadowBoundaryIndexBytes(value)+SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,label='verified solar boundary '+value.boundarySHA256.slice(0,12)+' hand-off';
  if(heldBytes+bytes>budget.stats.limitBytes)throw error;
  throw new ManagerAdmissionRetry(heldBytes+bytes,label,bytes);
 }
}

export type ManagerBootstrapProduct<V>=Readonly<{value:V;claim:ResourceBudgetReservation}>;
/** One manager's hold on the page's shared bootstrap value. Release it only when
 * that manager no longer reads the value; the last release returns the claim. */
export type ManagerBootstrapLease<V>=Readonly<{readonly value:V;readonly bytes:number;readonly released:boolean;release():void}>;
export type ManagerBootstrapOptions<V>={
 budget:ResourceBudget;
 /** Identity of the shared value inside one page ledger, e.g. its city and index path. */
 key:string;
 signal:AbortSignal;
 /** Runs the production under the attempt's signal and returns the value with the
  * claim that keeps it charged. Its own admissions throw ManagerAdmissionRetry
  * after returning their claims, never wait beside them. A later waiter's
  * production replaces it when its manager leaves. */
 produce:(signal:AbortSignal)=>Promise<ManagerBootstrapProduct<V>>;
 /** The verified boundary whose solar index is admitted before the lease returns. */
 solarBoundary?:(value:V)=>SolarShadowBoundary;
 owner?:string;
};
type Waiter<V>={produce:ManagerBootstrapOptions<V>['produce'];owner:string|undefined;signal:AbortSignal;resolve:(lease:ManagerBootstrapLease<V>)=>void;reject:(error:unknown)=>void;abort:()=>void};
type EntryState='producing'|'waiting'|'ready'|'failed'|'cancelled'|'released';
type Entry<V>={
 budget:ResourceBudget;key:string;state:EntryState;waiters:Set<Waiter<V>>;
 producer:Waiter<V>|undefined;attempt:AbortController|undefined;cancel:AbortController;
 value:V|undefined;claim:ResourceBudgetReservation|undefined;leases:number;owners:Map<string,number>;
 attempts:number;relays:number;retries:number;waitingForBytes:number|undefined;
};
// One entry per page ledger and key. Entries hold no claim before their value is
// produced, and leave the registry when cancelled, failed or finally released.
const registries=new WeakMap<ResourceBudget,Map<string,Entry<unknown>>>();
const ownerLabel=(owner:unknown)=>typeof owner==='string'&&owner?owner.slice(0,128):undefined;
function unregister(entry:Entry<unknown>){const entries=registries.get(entry.budget);if(entries?.get(entry.key)===entry)entries.delete(entry.key);if(entries&&!entries.size)registries.delete(entry.budget);}
function detach<V>(waiter:Waiter<V>){waiter.signal.removeEventListener('abort',waiter.abort);}
function cancel<V>(entry:Entry<V>,reason?:unknown){
 if(entry.state!=='producing'&&entry.state!=='waiting')return;
 entry.state='cancelled';unregister(entry as Entry<unknown>);entry.cancel.abort(reason);entry.attempt?.abort(reason);
}
function fail<V>(entry:Entry<V>,error:unknown){
 if(entry.state!=='producing'&&entry.state!=='waiting')return;
 entry.state='failed';unregister(entry as Entry<unknown>);entry.cancel.abort(error);entry.attempt?.abort(error);
 const waiters=[...entry.waiters];entry.waiters.clear();for(const waiter of waiters){detach(waiter);waiter.reject(error);}
}
function drop<V>(entry:Entry<V>){
 entry.state='released';unregister(entry as Entry<unknown>);entry.value=undefined;
 const claim=entry.claim;entry.claim=undefined;claim?.release();
}
function grant<V>(entry:Entry<V>,owner:string|undefined):ManagerBootstrapLease<V>{
 entry.leases++;if(owner)entry.owners.set(owner,(entry.owners.get(owner)??0)+1);
 let released=false;
 return Object.freeze({
  get value(){if(released||entry.state!=='ready')throw Error('Manager bootstrap lease was released');return entry.value as V;},
  get bytes(){return released?0:entry.claim?.bytes??0;},
  get released(){return released;},
  release(){
   if(released)return;released=true;
   if(owner){const remaining=(entry.owners.get(owner)??1)-1;if(remaining>0)entry.owners.set(owner,remaining);else entry.owners.delete(owner);}
   if(--entry.leases===0)drop(entry);
  },
 });
}
function ready<V>(entry:Entry<V>,product:ManagerBootstrapProduct<V>){
 entry.state='ready';entry.value=product.value;entry.claim=product.claim;
 const waiters=[...entry.waiters];entry.waiters.clear();
 const leases=waiters.map(waiter=>{detach(waiter);return grant(entry,waiter.owner);});
 waiters.forEach((waiter,i)=>waiter.resolve(leases[i]));
}
function leave<V>(entry:Entry<V>,waiter:Waiter<V>){
 if(!entry.waiters.delete(waiter))return;detach(waiter);const reason=abortReason(waiter.signal);waiter.reject(reason);
 if(entry.state!=='producing'&&entry.state!=='waiting')return;
 if(!entry.waiters.size){cancel(entry,reason);return;}
 // The leaving manager's production is abandoned; the next waiter produces.
 if(entry.producer===waiter)entry.attempt?.abort(reason);
}
async function run<V>(entry:Entry<V>){
 let checkAtRegistration=true;
 try{
  while(entry.state==='producing'){
   const producer=entry.waiters.values().next().value as Waiter<V>|undefined;
   if(!producer){cancel(entry);return;}
   const attempt=new AbortController();entry.attempt=attempt;entry.producer=producer;entry.attempts++;
   let product:ManagerBootstrapProduct<V>;
   try{product=await producer.produce(attempt.signal);}
   catch(error){
    entry.attempt=undefined;entry.producer=undefined;
    if(entry.state!=='producing')return;
    if(error instanceof ManagerAdmissionRetry){
     // The production returned its claims; the entry waits holding nothing.
     entry.retries++;entry.state='waiting';entry.waitingForBytes=error.requiredBytes;
     try{checkAtRegistration=await awaitManagerCapacity(entry.budget,error.requiredBytes,entry.cancel.signal,{checkAtRegistration})==='wave';}catch(waitError){fail(entry,waitError);return;}finally{entry.waitingForBytes=undefined;}
     if(entry.state!=='waiting')return;
     entry.state='producing';continue;
    }
    if(attempt.signal.aborted&&entry.waiters.size){entry.relays++;continue;}
    fail(entry,error);return;
   }
   entry.attempt=undefined;entry.producer=undefined;
   // A value completed for nobody returns its claim at once.
   if(entry.state!=='producing'||!entry.waiters.size){product.claim.release();cancel(entry);return;}
   ready(entry,product);return;
  }
 }catch(error){fail(entry,error);}
}
function join<V>(options:ManagerBootstrapOptions<V>,owner:string|undefined):Promise<ManagerBootstrapLease<V>>{
 const {budget,key,signal,produce}=options;
 let entries=registries.get(budget),entry=entries?.get(key) as Entry<V>|undefined;
 if(entry?.state==='ready')return Promise.resolve(grant(entry,owner));
 let created=false;
 if(!entry){
  entry={budget,key,state:'producing',waiters:new Set(),producer:undefined,attempt:undefined,cancel:new AbortController(),value:undefined,claim:undefined,leases:0,owners:new Map(),attempts:0,relays:0,retries:0,waitingForBytes:undefined};
  if(!entries){entries=new Map();registries.set(budget,entries);}
  entries.set(key,entry as Entry<unknown>);created=true;
 }
 const pending=entry;
 return new Promise<ManagerBootstrapLease<V>>((resolve,reject)=>{
  const waiter:Waiter<V>={produce,owner,signal,resolve,reject,abort:()=>leave(pending,waiter)};
  signal.addEventListener('abort',waiter.abort,{once:true});pending.waiters.add(waiter);
  if(created)void run(pending);
 });
}
/**
 * Leases the page's one shared bootstrap value for `key`, produced at most once
 * per page ledger while anyone waits for it. Waiting managers hold no claim; the
 * value's claim stays charged once until its last lease is released. When
 * `solarBoundary` is given, that boundary's solar index is admitted (or found
 * cached) before the lease returns, so the caller's own admitSolarShadowBoundary
 * and its renderer's synchronous preparation reach the charged index; a refused
 * index releases this lease and waits holding nothing: for the index alone while
 * other leases keep the shared value charged, else for the value and the index,
 * and no longer once another manager has cached that index. A caller that finds
 * the index evicted again before it commits releases its lease and calls again.
 */
export async function acquireManagerBootstrap<V>(options:ManagerBootstrapOptions<V>):Promise<ManagerBootstrapLease<V>>{
 const {budget,signal}=options,owner=ownerLabel(options.owner);
 if(!usableBudget(budget))throw new TypeError('Manager bootstrap requires the page resource budget');
 if(typeof options.key!=='string'||!options.key||options.key.length>1024)throw new TypeError('Manager bootstrap requires a bounded key');
 if(typeof options.produce!=='function')throw new TypeError('Manager bootstrap requires a production');
 let checkAtRegistration=true;
 for(;;){
  signal.throwIfAborted();
  const lease=await join(options,owner);
  let indexSHA:string|undefined;
  try{
   signal.throwIfAborted();
   const boundary=options.solarBoundary?.(lease.value);indexSHA=boundary?.boundarySHA256;
   if(boundary){await handOffSolarShadowBoundary(budget,boundary,signal,lease.bytes);signal.throwIfAborted();}
   return lease;
  }catch(error){
   lease.release();
   if(!(error instanceof ManagerAdmissionRetry)||signal.aborted)throw signal.aborted?abortReason(signal):error;
   admissionRetries++;
   // Released after the refusal: a value other leases still hold stays charged,
   // so only the refused index needs room; a dropped value is produced again.
   // Another manager's hand-off of the same index moves no byte and runs no ledger
   // wave, so the cache's own insertion hint also ends this wait.
   const shared=registries.get(budget)?.get(options.key)?.state==='ready',sha=indexSHA;
   checkAtRegistration=await awaitManagerCapacity(budget,shared?error.admissionBytes:error.requiredBytes,signal,{checkAtRegistration,satisfied:sha?()=>!!currentSolarShadowBoundary(sha):undefined,wakeWhen:sha?(wake,wakeSignal)=>onSolarShadowBoundaryCached(sha,wake,wakeSignal):undefined})==='wave';
  }
 }
}

export type ManagerBootstrapEntryStats=Readonly<{key:string;state:EntryState;waiters:number;leases:number;owners:readonly string[];producing:boolean;waitingForBytes:number|undefined;claimedBytes:number;attempts:number;relays:number;retries:number}>;
/** Logical accounting of one page ledger's shared bootstraps plus process-wide wait counts. */
export function managerBootstrapStats(budget?:ResourceBudget){
 const rows=budget?[...(registries.get(budget)?.values()??[])]:[];
 return Object.freeze({
  entries:Object.freeze(rows.map((entry):ManagerBootstrapEntryStats=>Object.freeze({key:entry.key,state:entry.state,waiters:entry.waiters.size,leases:entry.leases,owners:Object.freeze([...entry.owners.keys()]),producing:!!entry.attempt,waitingForBytes:entry.waitingForBytes,claimedBytes:entry.claim?.bytes??0,attempts:entry.attempts,relays:entry.relays,retries:entry.retries}))),
  waits:Object.freeze({capacityWaits,capacityWakeups,registrationWakeups,deferredWakeups,admissionRetries}),
  accounting:'logical-page-ledger-bytes-not-physical-memory' as const,
 });
}
