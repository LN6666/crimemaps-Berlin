import type {ChunkProductionContext,ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {createResourceBudget,ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure,type RESOURCE_CONTRACT_VIOLATION} from './render-runtime/resource-budget';

// The ledger's stable code for this transport's contract TypeErrors, kept as a
// local literal so a harness that substitutes the ledger module cannot change
// the error type or message. Network and transient failures never carry it.
const CONTRACT_CODE:typeof RESOURCE_CONTRACT_VIOLATION='RESOURCE_CONTRACT_VIOLATION';
function contractViolation(error:TypeError):TypeError{Object.defineProperty(error,'code',{value:CONTRACT_CODE,enumerable:true,configurable:true,writable:false});return error;}

export interface ResourceBytesLease {
  readonly bytes:Uint8Array;
  /** Caller-admitted reads only: the exact cost that delivery placed on the
   * caller's claim, under the delivered ArrayBuffer's identity. */
  readonly cost?:ResourceBudgetCost;
  release():void;
}

/** The bounded readers keep every network body chunk alive until they copy them
 * into one contiguous Uint8Array (lossless physical reads hold the compressed
 * body beside its exact output instead). Both caller-bounded copies coexist, so
 * both are admitted before the request is queued; completion keeps only the
 * exact contiguous buffer. Browser network buffers remain unmeasured. */
export const RESOURCE_BYTE_READ_COPIES=2;
export function resourceByteReadEnvelope(path:string,max:number):readonly ResourceBudgetCost[]{
  return[{category:'read',bytes:max,precision:'estimate',label:path},
    {category:'read',bytes:max,precision:'estimate',label:'network body chunks before contiguous copy'}];
}
/** Delivered bytes charge their whole underlying buffer under that buffer's
 * identity: the caller's claim, the page-store entry and its recent copy may
 * all list one delivery, and the ledger counts it once. */
export function resourceByteDeliveredCost(bytes:Uint8Array,label:string):ResourceBudgetCost{
  return{category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer,label};
}
const validLimit=(max:number)=>Number.isSafeInteger(max)&&max>0&&Number.isSafeInteger(max*RESOURCE_BYTE_READ_COPIES);

declare const resourceByteEnvelopeBrand:unique symbol;
/** The envelope of one caller-admitted read: resourceByteReadEnvelope's costs
 * under fresh identities. The caller's claim lists it and the read's page-store
 * entry reserves the same identities, so the ledger counts it once, and the
 * entry keeps it charged until the read settles, after every consumer left. */
export type ResourceByteEnvelope=readonly ResourceBudgetCost[]&{readonly [resourceByteEnvelopeBrand]:true};
type MintedEnvelope={readonly bytes:number;readonly identities:ReadonlySet<object>};
const mintedEnvelopes=new WeakMap<object,MintedEnvelope>();
/** Mints the envelope for one caller-admitted read of at most max bytes; one
 * envelope covers one acquireBytes call. minimumBytes (a refused delivery's
 * envelopeBytes) adds the delivered buffer beyond the standard 2×max. */
export function resourceByteAdmittedEnvelope(path:string,max:number,minimumBytes=0):ResourceByteEnvelope{
  if(!validLimit(max))throw new RangeError('Invalid resource byte limit');
  if(!Number.isSafeInteger(minimumBytes)||minimumBytes<0)throw new RangeError('Invalid resource byte envelope size');
  const costs:ResourceBudgetCost[]=resourceByteReadEnvelope(path,max).map(cost=>Object.freeze({...cost,identity:{}}));
  const standard=max*RESOURCE_BYTE_READ_COPIES,beyond=Math.max(0,minimumBytes-standard);
  if(beyond)costs.push(Object.freeze({category:'read',bytes:beyond,precision:'estimate',identity:{},label:'delivered buffer beyond the read envelope'}));
  const envelope=Object.freeze(costs);
  mintedEnvelopes.set(envelope,{bytes:standard+beyond,identities:new Set(costs.map(cost=>cost.identity as object))});
  return envelope as unknown as ResourceByteEnvelope;
}

/** The caller's claim on the transport's page ledger, listing the read's
 * envelope beside the caller's own costs: a ResourceBudgetReservation admitted
 * at once as [...own costs, ...envelope], or the production context of a
 * page-store entry whose estimate lists them. */
export type ResourceByteAdmittedClaim={
  /** Atomic in-place replacement; false keeps the prior costs. */
  adjust(cost:ResourceBudgetCost|readonly ResourceBudgetCost[]):boolean;
  readonly active?:boolean;
  readonly bytes?:number;
  readonly budget?:ResourceBudget;
};
/** admitted: the claim that lists envelope. envelope: minted for this read.
 * keep: the caller's costs that stay on the claim beside the delivered bytes
 * (default none). */
export type ResourceByteAcquireOptions=Readonly<{admitted:ResourceByteAdmittedClaim;envelope:ResourceByteEnvelope;keep?:readonly ResourceBudgetCost[]}>;
export type ResourceBytesAcquire=(path:string,signal:AbortSignal,max:number,options?:ResourceByteAcquireOptions)=>Promise<ResourceBytesLease>;

/** The claim could not take [...keep, delivered bytes] without growth the page
 * ledger refused. The claim keeps its prior costs and the transport holds
 * nothing: release everything, then, holding nothing, wait until retryBytes
 * (plus the rest of the working set) can be admitted and admit
 * [...keep, ...resourceByteAdmittedEnvelope(path,max,envelopeBytes)] at once.
 * unfit: retryBytes alone exceed the ledger, so report not fitting instead.
 * Its name stays ResourceBudgetExceededError for name-based budget checks. */
export class ResourceByteDeliveryRefusedError extends ResourceBudgetExceededError{
  readonly code='RESOURCE_BYTE_DELIVERY_REFUSED';
  /** keep plus the delivered buffer: what the claim lists after a delivery. */
  readonly claimBytes:number;
  readonly deliveredBytes:number;
  /** The envelope a retry mints: the standard 2×max, or the delivered buffer if larger. */
  readonly envelopeBytes:number;
  /** envelopeBytes beyond the standard 2×max envelope; 0 when only keep grew. */
  readonly beyondEnvelopeBytes:number;
  /** The one claim a retry admits at once: keep plus envelopeBytes. */
  readonly retryBytes:number;
  readonly unfit:boolean;
  constructor(details:ResourceBudgetPressure,sizes:Readonly<{keepBytes:number;deliveredBytes:number;max:number;limitBytes:number}>){
    super(details);
    const standard=sizes.max*RESOURCE_BYTE_READ_COPIES;
    this.deliveredBytes=sizes.deliveredBytes;this.claimBytes=sizes.keepBytes+sizes.deliveredBytes;
    this.envelopeBytes=Math.max(standard,sizes.deliveredBytes);this.beyondEnvelopeBytes=this.envelopeBytes-standard;
    this.retryBytes=sizes.keepBytes+this.envelopeBytes;this.unfit=this.retryBytes>sizes.limitBytes;
  }
}

type NetworkJob={signal:AbortSignal;run:()=>void;cancel:()=>void};
type Options={
  namespace:string;
  resourceStore:ChunkResourceStore;
  read:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
};
/** A production a caller-admitted read started on a store miss. Its entry
 * reserves the owner's envelope until it settles; owner delivers to the call
 * whose claim lists that envelope, until that call leaves. */
type OwnedProduction={readonly context:ChunkProductionContext;readonly covered:boolean;inFlight:boolean;
  owner:((bytes:Uint8Array,cost:ResourceBudgetCost)=>boolean)|undefined};
type CheckedAdmission={claim:ResourceByteAdmittedClaim;envelope:ResourceByteEnvelope;keep:readonly ResourceBudgetCost[]};

/** The bytes these costs carry, deduplicated by identity. */
function costBytes(costs:readonly ResourceBudgetCost[]){
  const identified=new Map<object|string,number>();let total=0;
  for(const cost of costs){const bytes=Math.ceil(cost.bytes);if(cost.identity===undefined)total+=bytes;else identified.set(cost.identity,Math.max(bytes,identified.get(cost.identity)??0));}
  for(const bytes of identified.values())total+=bytes;
  return total;
}
let costValidator:ResourceBudget|undefined;
/** A frozen copy of caller costs, checked by the ledger's own rules on a
 * private ledger before anything is read, so a later mutation or an invalid
 * cost can no longer fail a finished read. */
function checkedCosts(input:unknown,what:string):readonly ResourceBudgetCost[]{
  if(!Array.isArray(input))throw contractViolation(new TypeError(what+' must be an array'));
  const copy=Object.freeze(input.map((cost:unknown)=>{
    if(!cost||typeof cost!=='object')throw contractViolation(new TypeError('Invalid resource budget cost'));
    const {category,bytes,precision,identity,label}=cost as ResourceBudgetCost;
    return Object.freeze({category,bytes,precision,...(identity!==undefined?{identity}:{}),...(label!==undefined?{label}:{})}) as ResourceBudgetCost;
  }));
  (costValidator??=createResourceBudget({limitBytes:Number.MAX_SAFE_INTEGER})).reserve(copy).release();
  return copy;
}
// One claim and one envelope carry one read at a time, across transports.
const claimsInUse=new WeakSet<object>();
/** Envelope → its holder: the call that received it, and that call's
 * production until the store has released or replaced the envelope. */
const envelopeHolders=new WeakMap<object,object>();
function checkedAdmission(admission:unknown,max:number,budget:ResourceBudget):CheckedAdmission{
  if(!admission||typeof admission!=='object')throw contractViolation(new TypeError('A caller-admitted read takes {admitted, envelope, keep?}'));
  const {admitted:claim,envelope,keep:rawKeep=[]}=admission as ResourceByteAcquireOptions;
  if(!claim||(typeof claim!=='object'&&typeof claim!=='function')||typeof claim.adjust!=='function')throw contractViolation(new TypeError('A caller-admitted read needs the claim that lists its read envelope'));
  const minted=envelope&&typeof envelope==='object'?mintedEnvelopes.get(envelope):undefined;
  if(!minted)throw contractViolation(new TypeError('A caller-admitted read needs an envelope minted by resourceByteAdmittedEnvelope'));
  if(minted.bytes<max*RESOURCE_BYTE_READ_COPIES)throw new RangeError('The read envelope carries '+minted.bytes+' bytes; a '+max+'-byte read needs '+max*RESOURCE_BYTE_READ_COPIES);
  const keep=checkedCosts(rawKeep,'Caller-admitted keep costs');
  if(keep.some(cost=>typeof cost.identity==='object'&&minted.identities.has(cost.identity)))throw contractViolation(new TypeError('Caller-admitted keep costs must not list the read envelope'));
  if(claim.active===false)throw new Error('The caller-admitted claim is no longer active');
  if(claim.budget!==undefined&&claim.budget!==budget)throw contractViolation(new TypeError('The caller-admitted claim belongs to another page ledger'));
  if(typeof claim.bytes==='number'&&claim.bytes<minted.bytes)throw new RangeError('The caller-admitted claim does not carry its '+minted.bytes+'-byte read envelope');
  if(claimsInUse.has(claim))throw contractViolation(new TypeError('The caller-admitted claim already carries another read'));
  if(envelopeHolders.has(envelope))throw contractViolation(new TypeError('This read envelope already covers another read; mint one per read'));
  return{claim,envelope,keep};
}
const uncovered=(path:string)=>'The caller-admitted claim does not list this read envelope; admit [...own costs, ...envelope] in one claim first: '+path;
// Store entries keep only this disposer, never a consumer's claim or callbacks.
const forgetValue=(values:Map<object,number>,identity:object)=>()=>{values.delete(identity);};

/** Transport owns no decoded cache. Physical bytes, consumers and bounded recent
 * reuse belong to the same page store as the downstream resource producers. */
export function createResourceByteTransport(options:Options){
  const store=options.resourceStore,queue:NetworkJob[]=[],consumers=new Set<()=>void>();
  const liveValues=new Map<object,number>();
  const productionLimits=new WeakMap<Promise<void>,number>();
  const ownedProductions=new Set<OwnedProduction>();
  let active=0,peakConcurrency=0,reads=0,destroyed=false;
  let admittedReads=0,admittedDeliveries=0,admittedRefusals=0,admittedAbandoned=0;
  const aborted=()=>new DOMException('Resource byte consumer cancelled','AbortError');
  function pump(){
    while(active<2&&queue.length){
      const job=queue.shift()!;
      if(job.signal.aborted)job.cancel();else job.run();
    }
  }
  function network(path:string,signal:AbortSignal,max:number):Promise<Uint8Array>{
    signal.throwIfAborted();
    return new Promise((resolve,reject)=>{
      let started=false,finished=false;
      const detach=()=>signal.removeEventListener('abort',cancel);
      const cancel=()=>{
        if(started||finished)return;
        finished=true;detach();
        const at=queue.indexOf(job);if(at>=0)queue.splice(at,1);
        reject(signal.reason??aborted());
      };
      const job:NetworkJob={signal,cancel,run(){
        if(finished)return;
        if(signal.aborted){cancel();return;}
        started=true;detach();active++;reads++;peakConcurrency=Math.max(peakConcurrency,active);
        Promise.resolve().then(()=>options.read(path,signal,max)).then(resolve,reject).finally(()=>{
          finished=true;active--;pump();
        });
      }};
      signal.addEventListener('abort',cancel,{once:true});
      if(signal.aborted)cancel();else{queue.push(job);pump();}
    });
  }
  function acquireBytes(path:string,signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions):Promise<ResourceBytesLease>{
    if(admission!==undefined)return acquireAdmitted(path,signal,max,admission);
    signal.throwIfAborted();
    if(destroyed)return Promise.reject(aborted());
    if(!Number.isSafeInteger(max)||max<=0||!Number.isSafeInteger(max*RESOURCE_BYTE_READ_COPIES))return Promise.reject(new RangeError('Invalid resource byte limit'));
    // A caller's read ceiling is not part of the immutable asset identity.
    const contentKey=JSON.stringify(['transport-v1',options.namespace,path]);
    return new Promise((resolve,reject)=>{
      let resource:ChunkResourceLease<Uint8Array>|undefined,settled=false,released=false,wakeQueued=false;
      let failedProductionLimit=0;
      let stopAvailable:(()=>void)|undefined;
      const detach=()=>{signal.removeEventListener('abort',cancel);stopAvailable?.();stopAvailable=undefined;};
      const release=()=>{
        if(released)return;
        released=true;detach();consumers.delete(cancel);
        const old=resource;resource=undefined;old?.release();
      };
      const fail=(error:unknown)=>{if(!settled){settled=true;reject(error);}release();};
      const cancel=()=>fail(signal.reason??aborted());
      function awaitCapacity(){
        if(stopAvailable)return;
        stopAvailable=store.budget.onAvailable(()=>{
          if(wakeQueued||released||settled)return;
          wakeQueued=true;
          queueMicrotask(()=>{
            wakeQueued=false;
            if(!released&&!settled){stopAvailable?.();stopAvailable=undefined;admit();}
          });
        },signal);
      }
      function admit(){
        if(released||settled)return;
        if(signal.aborted||destroyed){cancel();return;}
        const valueIdentity={};
        try{
          resource=store.acquire<Uint8Array>({
            contentKey,role:'source',signal,allowRecent:max<=1024**2,cacheRetention:'refetch',
            estimate:resourceByteReadEnvelope(path,max),
            produce:async({signal:productionSignal})=>{
              const bytes=await network(path,productionSignal,max);
              productionSignal.throwIfAborted();
              if(bytes.byteLength>max)throw new Error('Resource byte limit exceeded: '+path);
              liveValues.set(valueIdentity,bytes.buffer.byteLength);
              return bytes;
            },
            costs:bytes=>({category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer,label:path}),
            dispose:()=>{liveValues.delete(valueIdentity);},
          });
        }catch(error){
          // A wake wave inside acquire may have cancelled this consumer before
          // the refusal: it must not register a capacity listener any more.
          if(released)return;
          // Only a working set that can fit the whole page ledger waits; a larger
          // read is reported as not fitting instead of queueing forever.
          if(error instanceof ResourceBudgetExceededError&&max*RESOURCE_BYTE_READ_COPIES<=store.budget.stats.limitBytes){
            awaitCapacity();return;
          }
          fail(error);return;
        }
        // A wake wave inside acquire (a recent hit) may have cancelled this
        // consumer before its lease existed: return that lease now.
        if(released){const handed=resource;resource=undefined;handed?.release();return;}
        const pending=resource,productionLimit=productionLimits.get(pending.ready)??max;
        productionLimits.set(pending.ready,productionLimit);
        pending.ready.then(()=>{
          if(settled||released)return;
          if(signal.aborted||destroyed||!resource?.value){cancel();return;}
          if(resource.value.byteLength>max){fail(new Error('Resource byte consumer limit exceeded: '+path));return;}
          const owned=resource.retain('source');resource.release();resource=owned;
          settled=true;
          // Completion transfers this consumer's explicit ownership to its
          // caller. A later viewport abort cannot invalidate a live decode.
          detach();
          resolve({
            get bytes(){const value=resource?.value;if(released||!value)throw new Error('Resource bytes were released');return value;},
            release,
          });
        },error=>{
          // An earlier consumer may have started a stricter bounded read. A
          // larger consumer can retry after that failed production retires;
          // equal/smaller ceilings never retry or create parallel downloads.
          if(!released&&!settled&&!signal.aborted&&!destroyed&&productionLimit<max&&productionLimit>failedProductionLimit&&
            !(error instanceof DOMException&&error.name==='AbortError')){
            failedProductionLimit=productionLimit;
            resource=undefined;pending.release();admit();
          }else fail(error);
        });
      }
      consumers.add(cancel);signal.addEventListener('abort',cancel,{once:true});
      if(signal.aborted)cancel();else admit();
    });
  }
  async function produceAdmitted(path:string,max:number,production:OwnedProduction,valueIdentity:object):Promise<Uint8Array>{
    const context=production.context;
    const bytes=await network(path,context.signal,max);
    context.signal.throwIfAborted();
    if(bytes.byteLength>max)throw new Error('Resource byte limit exceeded: '+path);
    const cost=resourceByteDeliveredCost(bytes,path),owner=production.owner;
    let listed=owner!==undefined&&owner(bytes,cost);
    context.signal.throwIfAborted();
    if(!listed){
      // The owner left or was refused while other consumers hold this entry:
      // the entry lists the buffer in place of its envelope. Once the departed
      // owner's claim no longer lists that envelope, this frees bytes.
      const before=store.budget.stats.lastPressure;
      if(!context.adjust(cost)){
        const pressure=store.budget.stats.lastPressure;
        throw pressure&&pressure!==before?new ResourceBudgetExceededError(pressure):new Error('Caller-admitted bytes could not be charged to their page-store entry: '+path);
      }
    }
    liveValues.set(valueIdentity,bytes.buffer.byteLength);
    return bytes;
  }
  /** Caller-admitted read: the caller's claim lists this read's minted
   * envelope, and on a store miss the read's entry reserves the same
   * identities for no additional byte, so the transport never waits for
   * capacity and the read stays charged until it settles, whoever leaves. The
   * claim stays the caller's: the transport adjusts it once, in place, to
   * [...keep, delivered bytes] at delivery, and never releases it. Any
   * rejection leaves the claim as it was. */
  function acquireAdmitted(path:string,signal:AbortSignal,max:number,admission:ResourceByteAcquireOptions):Promise<ResourceBytesLease>{
    signal.throwIfAborted();
    if(destroyed)return Promise.reject(aborted());
    if(!validLimit(max))return Promise.reject(new RangeError('Invalid resource byte limit'));
    const budget=store.budget;
    let checked:CheckedAdmission;
    try{checked=checkedAdmission(admission,max,budget);}catch(error){return Promise.reject(error);}
    const {claim,envelope,keep}=checked,contentKey=JSON.stringify(['transport-v1',options.namespace,path]);
    const holder={};let holds=1;
    const dropHold=()=>{if(--holds===0&&envelopeHolders.get(envelope)===holder)envelopeHolders.delete(envelope);};
    claimsInUse.add(claim);envelopeHolders.set(envelope,holder);admittedReads++;
    return new Promise((resolve,reject)=>{
      let resource:ChunkResourceLease<Uint8Array>|undefined,settled=false,released=false;
      let delivered:ResourceBudgetCost|undefined,production:OwnedProduction|undefined;
      const detach=()=>signal.removeEventListener('abort',cancel);
      const release=()=>{
        if(released)return;
        released=true;detach();consumers.delete(cancel);
        const old=resource;resource=undefined;old?.release();
      };
      /** Settles this call: the claim is back with its caller, never adjusted again. */
      const finish=()=>{settled=true;claimsInUse.delete(claim);dropHold();if(production)production.owner=undefined;};
      const fail=(error:unknown)=>{if(!settled){finish();reject(error);}release();};
      const cancel=()=>{if(!settled&&production?.inFlight&&!delivered)admittedAbandoned++;fail(signal.reason??aborted());};
      /** false: refused (a new pressure tells growth from an inactive claim);
       * undefined: it threw, and this consumer has failed with that error. */
      function adjustClaim(next:readonly ResourceBudgetCost[]):boolean|undefined{
        try{return claim.adjust(next);}catch(error){fail(error);return undefined;}
      }
      const pressureSince=(before:ResourceBudgetPressure|undefined)=>{const pressure=budget.stats.lastPressure;return pressure&&pressure!==before?pressure:undefined;};
      function refuse(pressure:ResourceBudgetPressure|undefined,cost:ResourceBudgetCost){
        admittedRefusals++;
        fail(pressure?new ResourceByteDeliveryRefusedError(pressure,{keepBytes:costBytes(keep),deliveredBytes:cost.bytes,max,limitBytes:budget.stats.limitBytes})
          :new Error('The caller-admitted claim could not take its delivered bytes: '+path));
      }
      /** Delivery to the claim whose envelope its entry also lists, in three
       * in-place steps of which only the second moves bytes:
       * 1. the entry drops the envelope the claim also lists;
       * 2. the claim lists [...keep, buffer] in place of its costs, freeing
       *    what the read no longer needs and waking waiters;
       * 3. the entry lists the buffer the claim already charges.
       * Returns whether the entry lists the buffer. */
      function deliverAsOwner(bytes:Uint8Array,cost:ResourceBudgetCost,context:ChunkProductionContext):boolean{
        if(settled||released)return false;
        // Released early, the claim no longer lists the envelope: the entry
        // keeps it, and the remaining consumers are served without this one.
        if(claim.active===false){fail(new Error('The caller-admitted claim was released before delivery: '+path));return false;}
        if(!context.adjust([]))return false;
        const before=budget.stats.lastPressure;
        // Marked first: the next step's wake wave may cancel this consumer after
        // its claim already lists the buffer, which its caller then releases.
        delivered=cost;
        const listed=adjustClaim([...keep,cost]);
        if(!listed){
          // The claim is unchanged and still lists the envelope, so the entry
          // takes it back for no byte.
          delivered=undefined;
          const pressure=listed===false?pressureSince(before):undefined;
          context.adjust(envelope);
          if(listed===false)refuse(pressure,cost);
          return false;
        }
        admittedDeliveries++;
        return context.adjust(cost);
      }
      /** Delivery of a buffer its entry already charges: one in-place adjust. */
      function deliverShared(value:Uint8Array):boolean{
        if(value.byteLength>max){fail(new Error('Resource byte consumer limit exceeded: '+path));return false;}
        const cost=resourceByteDeliveredCost(value,path),before=budget.stats.lastPressure;
        const listed=adjustClaim([...keep,cost]);
        if(listed===undefined)return false;
        if(!listed){refuse(pressureSince(before),cost);return false;}
        delivered=cost;admittedDeliveries++;return true;
      }
      function complete(){
        if(settled||released)return;
        const value=resource?.value;
        if(signal.aborted||destroyed||!value){cancel();return;}
        if(!delivered&&!deliverShared(value))return;
        if(settled||released)return;
        const held=resource!;let owned:ChunkResourceLease<Uint8Array>;
        try{owned=held.retain('source');}catch(error){fail(error);return;}
        held.release();resource=owned;
        // Completion transfers this consumer's explicit ownership to its caller.
        finish();detach();
        resolve({
          get bytes(){const bytes=resource?.value;if(released||!bytes)throw new Error('Resource bytes were released');return bytes;},
          cost:delivered,release,
        });
      }
      function start(){
        if(released||settled)return;
        if(signal.aborted||destroyed){cancel();return;}
        const valueIdentity={},before=budget.stats.bytes;
        // Assigned only inside produce, which a store miss runs synchronously.
        let created=undefined as OwnedProduction|undefined,producing=undefined as Promise<Uint8Array>|undefined;
        try{
          resource=store.acquire<Uint8Array>({
            contentKey,role:'source',signal,allowRecent:max<=1024**2,cacheRetention:'refetch',
            // The claim lists these identities, so this reservation adds no byte.
            estimate:envelope,
            produce:context=>{
              created={context,covered:budget.stats.bytes<=before,inFlight:true,owner:(bytes,cost)=>deliverAsOwner(bytes,cost,context)};
              // A reservation that grew the ledger proves the claim does not
              // list this envelope: fail before anything is read.
              if(!created.covered)throw contractViolation(new TypeError(uncovered(path)));
              return producing=produceAdmitted(path,max,created,valueIdentity);
            },
            dispose:forgetValue(liveValues,valueIdentity),
          });
        }catch(error){
          // Refused only when no claim lists the envelope: nothing waits here.
          fail(error instanceof ResourceBudgetExceededError?contractViolation(new TypeError(uncovered(path))):error);return;
        }
        const lease=resource;
        if(created&&producing){
          const owned:OwnedProduction=created;production=owned;holds++;ownedProductions.add(owned);
          // Registered after the store's own result handler, which has released
          // the entry's envelope or replaced it by the delivered buffer.
          const settle=()=>{owned.inFlight=false;owned.owner=undefined;ownedProductions.delete(owned);dropHold();};
          void producing.then(settle,settle);producing=undefined;
        }
        // A wake wave inside acquire (a recent hit) may have cancelled this
        // consumer before its lease existed: return that lease now.
        if(released){resource=undefined;lease.release();return;}
        if(created&&!created.covered){resource=undefined;lease.release();fail(contractViolation(new TypeError(uncovered(path))));return;}
        if(lease.value!==undefined){complete();return;}
        lease.ready.then(complete,fail);
      }
      consumers.add(cancel);signal.addEventListener('abort',cancel,{once:true});
      if(signal.aborted)cancel();else start();
    });
  }
  /** Compatibility readers must retain their own input/parse reservation.
   * New consumers use acquireBytes and release after the last raw-byte use. */
  async function readBytes(path:string,signal:AbortSignal,max:number):Promise<Uint8Array>{
    const lease=await acquireBytes(path,signal,max);
    try{return lease.bytes;}finally{lease.release();}
  }
  return{
    acquireBytes,readBytes,
    clear(){store.evictRecent();},
    /** Give up one path's idle cached bytes now. For a consumer that keeps its
     * own decoded value and reads many small files in one step (building focus
     * metadata): their raw bytes must not fill the page's count-bounded recent
     * cache. A path still leased by anyone is untouched. */
    discardIdle(path:string){if(!destroyed)store.evictRecent([JSON.stringify(['transport-v1',options.namespace,path])]);},
    destroy(){
      if(destroyed)return;
      destroyed=true;
      for(const cancel of [...consumers])cancel();
      store.evictRecent();pump();
    },
    get idle(){return active===0&&queue.length===0&&consumers.size===0;},
    get stats(){return{active,peakConcurrency,reads,queued:queue.length,consumers:consumers.size,
      retainedByteResources:liveValues.size,retainedLogicalBytes:[...liveValues.values()].reduce((n,bytes)=>n+bytes,0),
      admittedReads,admittedDeliveries,admittedRefusals,admittedAbandoned,admittedProductions:ownedProductions.size,
      cacheOwner:'page-chunk-resource-store',measurement:'transport-owned-logical-array-buffer-bytes-not-process-memory'};},
  };
}
