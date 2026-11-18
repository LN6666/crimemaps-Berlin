import {inflateBounded3DGzip} from './bounded-3d-gzip';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {cloneFrozenJSON} from './clone-frozen-json';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkProductionContext,ChunkResourceLease,ChunkResourceRole,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {resourceByteAdmittedEnvelope,type ResourceByteDeliveryRefusedError,type ResourceBytesAcquire,type ResourceBytesLease} from './resource-byte-transport';
import {ResourceBudgetExceededError,ResourceBudgetHintUnsupportedError,checkedAvailabilitySequence,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {PRESSURE_AVAILABILITY_LIMITS,registerPressureAvailability,type PressureSnapshotWriter} from './render-runtime/pressure-availability';

export type FrozenDataDescriptor={path:string;sha256:string;bytes:number;transport?:{path:string;sha256:string;bytes:number;encoding:'gzip'}};
export type FrozenDataPart={descriptor:FrozenDataDescriptor;keys:readonly string[];rowIndices?:readonly number[];oversizedAtomic?:true};
export type FrozenDataPartition={schemaVersion:1;kind:'object-rows'|'record-keys';parts:readonly FrozenDataPart[]}|{
 schemaVersion:1;kind:'model-envelope'|'group-envelope';parts:readonly FrozenDataPart[];envelope:Record<string,unknown>;
 /** Offline canonical-byte verification only; never contains model bodies. */
 sourceLayout:{prefix:string;suffix:string;separators:readonly string[]};
};
export type FrozenDataRef={canonicalSHA256:string;file:string;occurrence:number;codec:'json'};
export type FrozenDataIdentity=Readonly<FrozenDataRef&{city:string;profileSHA256:string|null;resolvedRawSHA256:string}>;
export type FrozenDataSelection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
export type FrozenDataReader=(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
export interface DataLease<T>{readonly identity:FrozenDataIdentity;readonly contentKey?:string;readonly logicalBytes?:number;borrow<R>(read:(value:T)=>R):R;retain(role?:ChunkResourceRole):DataLease<T>;retainResource(role:ChunkResourceRole):ChunkResourceLease<unknown>;release():void;}
export interface FrozenDataClient{readonly resources?:ChunkResourceStore;acquire<T=any>(ref:FrozenDataRef,signal:AbortSignal,keys?:readonly string[],role?:ChunkResourceRole):Promise<DataLease<T>>;dispose():void;}
/** acquireBytes must forward its 4th argument (a caller-admitted read) to the
 * page byte transport on the same page ledger as resourceStore. */
type ClientOptions={city:string;profileSHA256:string|null;provider:string;selection:FrozenDataSelection;resolve:(sha:string,file:string,occurrence:number)=>string;partition?:(sha:string,file:string,occurrence:number)=>FrozenDataPartition|undefined;read:FrozenDataReader;acquireBytes?:ResourceBytesAcquire};
type ValueCell={value:unknown;parents?:{release():void}[];metadataBytes?:number};
type Diagnostic={key:string;logicalBytes:number;ready:boolean;waiters:number;leases:number};
type Ingress={signal:AbortSignal;start:(()=>void)|undefined;cancel:(()=>void)|undefined};
const MAX=64*1024**2,shaPattern=/^[a-f0-9]{64}$/;
let nextFrozenClient=0,nextFrozenStore=0;
const aborted=()=>new DOMException('Frozen data demand was released','AbortError');
const isAbort=(error:unknown)=>(error as {name?:unknown}|null)?.name==='AbortError';
/** Verified table ingress is page-wide: maps that acquire one raw descriptor on
 * one page store concurrently share one read, one parse and one charge,
 * whichever map's lease store asked first. The entry keeps no recent copy: once
 * no map waits for it, a later acquisition reads again. */
const decodedKey=(descriptor:FrozenDataDescriptor)=>JSON.stringify(['frozen-json-v2',descriptor.sha256,descriptor.bytes]);
/** What a queued page-wide ingress holds: its entry estimate, never a read's
 * working set. A relayed read, and one waiting for capacity, starts again from it. */
const QUEUED_DECODED:ResourceBudgetCost={category:'metadata',bytes:512,precision:'estimate',label:'queued frozen descriptor'};
/** What a queued binding (one map's private value) holds before its clone. */
const QUEUED_BINDING:ResourceBudgetCost={category:'metadata',bytes:256,precision:'estimate',label:'queued frozen binding descriptor'};
/** Decoded-text plus JSON value expansion of one verified table read, per raw
 * byte (provisional; calibrate-40x, 2026-11-02). It is charged from admission
 * until the decoded value settles. While JSON.parse and the decoded costs() walk
 * run, the claim holds only [inflate d (exact), normalize]: the transport lease
 * and its read envelope are already returned, so this alone covers the physical
 * high-water above 256 + d. Measured on the real lease-store path (Node 22) with
 * schema-matched proxies, not the real tables: at most 9.23 d (admission rows),
 * 6.66 d (DISPLAY), 6.46 d (low-office); value-density stress variants at most
 * 10.29 d. ceil(9.23 x 1.25 + 1 decoded copy for a Blink TextDecoder) = 13.
 * It does not cover the later binding structuredClone, whose physical high-water
 * exceeds the 2E the ledger holds by up to 8.78 d (9.61 d stressed); the clone
 * hold below covers that. */
export const FROZEN_NORMALIZE_EXPANSION=13;
/** Clone phase, scheme H (DECISIONS 2026-11-02 22:19): what the clone hold keeps
 * per raw byte from the decoded value's settle until the last binding holding it
 * as its parent has cloned (or let it go), in place of the read's normalize
 * claim (which stays FROZEN_NORMALIZE_EXPANSION through the read and parse).
 * Measured (calibrate-40x, real lease-store path, Node 22, schema-matched
 * proxies): the physical high-water while a binding clones exceeds the 2E the
 * ledger then holds (shared value + private clone) by at most 8.78 d, 9.61 d on
 * the stressed variants; physical use at the settle is below that same
 * high-water, so 10 d also covers the settle. The margin is thin (about 4 % over
 * the stressed measurement); it is verified by the cm-er9 Frankfurt infill z17
 * reading, and an excess goes back to the owner (ledger at least 798 MiB, or a
 * registered exception). Frankfurt low-office bulk70 (d 48,529,632, P 4,421,743,
 * E 102,625,806): read 256 + 14 d + 2P, settle 256 + 10 d + 2E and clone 2E + 10 d
 * (690,547,932 B) all fit the 704 MiB desktop ledger, one binding at a time: a
 * second map's private clone beside a live first one needs 3E + 10 d
 * (793,173,738 B) and waits on the ledger for the first to be released. */
export const FROZEN_CLONE_HOLD_EXPANSION=10;
/** State one page-wide decoded production keeps across its read attempts. */
type DecodedProduction={
 /** After a refused delivery: the envelope bytes the next read mints (0 when none). */
 retryEnvelopeBytes:number;
 /** After a legacy read delivered a buffer larger than its pre-charge. */
 retryReadBytes:number;
 /** Scheme H: the bytes the claim needs when the decoded value settles beside
  * its clone hold, S = [held normalize 10 d, settled value E, first-clone room
  * E] (0 until one attempt parsed, or the page's remembered need, see
  * settleNeeds). A later attempt admits that settle with its read (see
  * verifiedRead), so its claim never grows after the read and a refused settle
  * costs one read again at most; the first binding's clone then takes its room
  * from the hold without growing (takeCloneRoom), so it is never refused
  * either. Condition: the page fits that read's admission, 256 + S beside the
  * envelope's second copy (+ P with a byte transport, nothing more with a
  * legacy reader). Below it the headroom is capped and the claim grows again
  * after the read; a page below 256 + S itself is reported as not fitting. */
 settleBytes:number;
};
/** The costs one read attempt last placed on the shared claim. Each carries an
 * identity of that attempt (or of its buffer), so an abandoned attempt can keep
 * exactly what it may still hold without adding a byte. */
type AttemptCharge={costs:readonly ResourceBudgetCost[];readonly production:DecodedProduction;
 /** Identities of the read envelope minted for this attempt (caller-admitted reads only). */
 minted?:ReadonlySet<object>;
 /** Identity of this attempt's settle headroom (scheme H retry): parse-time
  * room, never a buffer, so an abandoned attempt does not keep it. */
 headroom?:object;
 /** Identity of this attempt's first-clone room (scheme H): never a buffer. */
 room?:object;
 /** After a settle beside the clone hold: what the hold keeps, [held
  * normalize, first-clone room], under this claim's own identities. */
 hold?:readonly ResourceBudgetCost[]};
type CapacityWake={readonly promise:Promise<void>;cancel():void};
/** A refused admission whose production waits for page capacity holding only its
 * queued estimate. Its wake-up was subscribed in the refusal's own synchronous
 * segment, after everything the production held was returned, so no later
 * release is missed and its own release never wakes it. It never leaves the
 * lease store: the decoded production catches it and waits. */
class CapacityWait extends Error{
 /** need: the refused admission's bytes in place of the production's queued estimate. */
 constructor(readonly wake:CapacityWake,readonly need:number){super('Frozen ingress waits for page capacity');this.name='FrozenCapacityWait';}
}
/** A binding steps back holding nothing so that an older waiting decoded
 * production can be admitted (see breakWaiterDeadlock); never leaves the lease
 * store: its acquisition waits for the next availability wave and binds again. */
class FrozenYield extends Error{
 constructor(){super('Frozen binding steps back for an older waiting ingress');this.name='FrozenYield';}
}
/** A decoded production waiting for page capacity (CapacityWait), per page store. */
type CapacityWaiter={readonly age:number;readonly key:string;readonly need:number;
 /** Marks this waiter's production as served: younger bindings that stepped
  * back for it bind again only once it ends (see pageTurns). */
 serve():void};
const capacityWaiters=new WeakMap<ChunkResourceStore,Set<CapacityWaiter>>();
/** Per page store: the productions now served by a step-back, each settled
 * when that production ends (value, failure or abort). A binding that stepped
 * back waits for these before binding again, so it cannot take back the bytes
 * it returned while the older read is still settling. */
const pageTurns=new WeakMap<ChunkResourceStore,Set<Promise<void>>>();
let nextDecodedAge=0;
/** Bytes a waiting decoded production holds: its queued estimate and the queued
 * estimate of each binding waiting for it on this page store. */
const waiterHeld=(resources:ChunkResourceStore,key:string)=>QUEUED_DECODED.bytes+QUEUED_BINDING.bytes*(cloneHolds.get(resources)?.get(key)?.holders.size??0);
/** The step-backs of the bindings (of any map) waiting for key's decoded
 * production beside its first holder: what that production does not need to
 * run, settle and serve its first clone (the frozen admissions' own fit and
 * not-fitting checks count one binding). */
function siblingStepBacks(resources:ChunkResourceStore,key:string):(()=>void)[]{
 const hold=cloneHolds.get(resources)?.get(key);if(!hold)return[];
 const steps:(()=>void)[]=[];let first=true;
 for(const token of hold.holders){if(first){first=false;continue;}const step=hold.yields.get(token);if(step)steps.push(step);}
 return steps;
}
/** Waiting decoded productions hold their queued estimates (a few hundred bytes
 * each), and so does every binding waiting for one. On a page within those
 * bytes of an acquisition's need, every one of them could wait for another's
 * estimate with nothing left to free them: a permanent silent wait. This
 * includes one production alone, blocked by the estimates of its own bindings
 * from other maps (k bindings need 256 k beside the read or settle, while the
 * admission's own checks, the not-fitting report and the capped settle
 * headroom, count one: R4 review R4S1-1/R4S1-2). FIFO by production age: the
 * oldest waiter whose refused admission fits once every younger waiter and
 * every binding of its own beyond its first holder steps back is served; those
 * bindings let go of everything (FrozenYield) and bind again only once the
 * served production ended (pageTurns). Synchronous, after the refusal that
 * queued the newest waiter (its own wake-up is already subscribed, so the
 * step-back's release wakes it). Only a waiter blocked by those estimates alone
 * is served this way; one blocked by other holders waits for them as before.
 * Returns the bindings asked to step back. */
function breakWaiterDeadlock(resources:ChunkResourceStore):number{
 const rows=[...capacityWaiters.get(resources)??[]].sort((a,b)=>a.age-b.age);
 const budget=resources.budget,stats=budget.stats;
 for(let i=0;i<rows.length;i++){
  const oldest=rows[i],younger=rows.slice(i+1);
  const now=stats.bytes-QUEUED_DECODED.bytes+oldest.need;
  if(now<=stats.limitBytes)continue;// it fits already: its wake-up is pending
  const siblings=siblingStepBacks(resources,oldest.key);
  const freed=younger.reduce((bytes,row)=>bytes+waiterHeld(resources,row.key),QUEUED_BINDING.bytes*siblings.length);
  if(!freed||now-freed>stats.limitBytes)continue;
  let asked=0;oldest.serve();
  for(const step of siblings){asked++;step();}
  for(const row of younger)for(const step of [...cloneHolds.get(resources)?.get(row.key)?.yields.values()??[]]){asked++;step();}
  return asked;
 }
 return 0;
}
/** One wake-up on the next availability wave, or a rejection when signal
 * aborts. A hint only, no timer: the waiter then retries its exact admission. */
function capacityWake(budget:ResourceBudget,signal:AbortSignal):CapacityWake{
 let off:(()=>void)|undefined,done=false,settle!:(error?:unknown)=>void;
 const promise=new Promise<void>((resolve,reject)=>{settle=error=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const stop=off;off=undefined;stop?.();if(error===undefined)resolve();else reject(error);};});
 void promise.catch(()=>{});
 const abort=()=>settle(signal.reason??aborted());
 if(signal.aborted)abort();else{signal.addEventListener('abort',abort,{once:true});off=budget.onAvailable(()=>settle(),signal);}
 return{promise,cancel:()=>settle(aborted())};
}
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
/** Synchronous refusal of a page-ledger admission (an entry's queued estimate). */
const refusedNow=(error:unknown)=>error instanceof ResourceBudgetExceededError;
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
/** A partition composition still taking its parts. Until every selected part is
 * ready at once and the composition takes them, the parts it holds are
 * reclaimable by page pressure, so a composition never holds part of its
 * working set while another part waits for capacity. */
type ComposeState={
 readonly age:number;
 /** Whether an admission refused under this page-ledger label serves this
  * composition: its composition entry, or the binding or decoded entry of a
  * part it does not hold now. A decoded label is page-wide, so a part this
  * composition already holds may be read again for another one; that
  * refusal does not serve it. */
 serves(label:string):boolean;
 complete:boolean;
 /** Bytes of ready parts held only by this composition. */
 heldBytes():number;
 snapshot(writer:PressureSnapshotWriter):void;
 /** Releases ready parts held only by it, up to `lacking`; they are taken again later. */
 reclaim(lacking:number):number;
 fail(error:unknown):void;
};
type ComposeRegistry={budget:ResourceBudget;states:Set<ComposeState>;off:(()=>void)|undefined};
// Compositions per page store: page pressure from any map reclaims their parts.
const composeRegistries=new WeakMap<ChunkResourceStore,ComposeRegistry>();
let nextComposeAge=0;
/** One page-pressure listener for every composition still taking parts. A
 * refusal reclaims ready parts of compositions younger than the oldest one it
 * serves (all of them for any other admission), youngest first, only when what
 * they can return covers the shortfall. The oldest unfinished composition is
 * never reclaimed by another composition, so it always progresses. A
 * composition that cannot hold its parts beside an admission it waits for even
 * on an empty page is reported as not fitting. Any refused page admission
 * reclaims, including an optional one (a parsed-value charge, a renderer's
 * tentative reservation): parts are only ever taken back for a real refusal,
 * and composeReclaims/composeReclaimedBytes count every one. */
function reclaimComposedParts(registry:ComposeRegistry,pressure:ResourceBudgetPressure){
 const stats=registry.budget.stats,label=pressure.label;
 let origin:ComposeState|undefined;
 if(label!==undefined)for(const state of registry.states)if(!state.complete&&state.serves(label)&&(!origin||state.age<origin.age))origin=state;
 if(origin&&origin.heldBytes()+pressure.additionalBytes>stats.limitBytes){origin.fail(unfitError(registry.budget,origin.heldBytes()+pressure.additionalBytes,'frozen partition composition does not fit the page beside its parts'));return;}
 // Parts are not in the recent subset, and an admission above the page never fits.
 if(stats.recentBytes+Math.max(0,pressure.recentRequired-pressure.recentCurrent)>stats.recentLimitBytes||pressure.additionalBytes>stats.limitBytes)return;
 let lacking=stats.bytes+pressure.additionalBytes-stats.limitBytes;if(lacking<=0)return;
 const eligible=[...registry.states].filter(state=>!state.complete&&state!==origin&&(!origin||state.age>origin.age)).sort((a,b)=>b.age-a.age);
 if(eligible.reduce((bytes,state)=>bytes+state.heldBytes(),0)<lacking)return;
 for(const state of eligible){if(lacking<=0)return;lacking-=state.reclaim(lacking);}
}
function registerCompose(resources:ChunkResourceStore,state:ComposeState){
 const availability=registerPressureAvailability(resources.budget,'frozen-composition',writer=>state.snapshot(writer));
 let registry=composeRegistries.get(resources);
 if(!registry){registry={budget:resources.budget,states:new Set(),off:undefined};composeRegistries.set(resources,registry);}
 const rows=registry;
 try{
  rows.states.add(state);if(!rows.off)rows.off=resources.budget.onPressure(pressure=>reclaimComposedParts(rows,pressure),'metadata-hint-v1');availability.notify();
 }catch(error){rows.states.delete(state);availability.release();throw error;}
 return()=>{
  if(!rows.states.delete(state))return;
  if(!rows.states.size){const off=rows.off;rows.off=undefined;off?.();}
  availability.release();
 };
}
/** One waiter on a page-wide verified ingress: the binding production of one
 * lease store (one map) that needs the decoded value, with that map's reader. */
type DecodedReader={
 /** One verified read with this map's reader, queued on its own ingress. */
 read(signal:AbortSignal,context:ChunkProductionContext,charge:AttemptCharge):Promise<ValueCell>;
 /** False once this map's lease store is destroyed. */
 usable():boolean;
 /** This map's reader took over a read another map abandoned. */
 relayed():void;
 /** Abandons the attempt this reader currently runs, if any. */
 abandon:((reason:unknown)=>void)|undefined;
 /** Set when this reader was torn down beneath its waiters (e.g. its byte transport). */
 failure:unknown;
 left:boolean;
};
// Waiters per page store and decoded key. A waiter joins before it acquires the
// shared entry and leaves when its binding production stops waiting, so every
// live production can find a reader whose map still wants the value.
const decodedReaders=new WeakMap<ChunkResourceStore,Map<string,Set<DecodedReader>>>();
function joinDecodedReaders(resources:ChunkResourceStore,key:string,reader:DecodedReader){
 let byKey=decodedReaders.get(resources);if(!byKey){byKey=new Map();decodedReaders.set(resources,byKey);}
 let readers=byKey.get(key);if(!readers){readers=new Set();byKey.set(key,readers);}
 const rows=byKey,set=readers;set.add(reader);
 return()=>{
  if(reader.left)return;reader.left=true;set.delete(reader);if(!set.size&&rows.get(key)===set)rows.delete(key);
  // A producing map that leaves abandons its attempt; a remaining waiter reads.
  const abandon=reader.abandon;reader.abandon=undefined;abandon?.(aborted());
 };
}
/** Clone phase, scheme H (DECISIONS 2026-11-02 08:56 and 22:19): a decoded
 * read settles its value beside [held normalize (FROZEN_CLONE_HOLD_EXPANSION d),
 * first-clone room (E)], and those two stay charged after the value settles,
 * until every binding that holds that decoded value as its parent has finished
 * its private structuredClone (or let the parent go). The settled entry's claim
 * shrinks to the value's estimate; the held normalize covers the clone's
 * physical high-water above the 2E the ledger then holds (measured up to 8.78 d,
 * 9.61 d stressed). The first binding to clone takes the room as its own clone
 * charge under the room's identity, so its clone never grows the page ledger
 * and cannot be refused, and in the same synchronous step the hold puts it down
 * (takeCloneRoom). A later binding's clone grows the ledger by E - 256 and may
 * be refused. Per page store and decoded key: the bindings holding the parent
 * now, and the held claim. A binding drops its hold in the same synchronous
 * step that releases its parent, including a refused clone before it waits for
 * capacity, so no waiter keeps it (no hold-and-wait); the last one returns the
 * claim. It reuses the settle claim's own identities, so taking it never adds a
 * byte and cannot be refused. */
type CloneHold={readonly holders:Set<object>;readonly yields:Map<object,()=>void>;reservation:ResourceBudgetReservation|undefined;
 /** The held claim's costs: [held normalize] and, until a clone takes it, the first-clone room. */
 costs:readonly ResourceBudgetCost[];room:ResourceBudgetCost|undefined};
const cloneHolds=new WeakMap<ChunkResourceStore,Map<string,CloneHold>>();
/** Per page store and decoded key: the settle need S (see DecodedProduction)
 * after a refused settle or a refused clone of that table. A later production
 * of the same table (its value was let go meanwhile) starts from it, so its
 * first read already admits the settle and the first clone's room: a table
 * whose clone was refused reads again at most once more before that clone is
 * served (the alternating re-read livelock, R3 src-r3a CDR[1]). Bytes only,
 * never a value; it only grows, and dies with the page store. */
const settleNeeds=new WeakMap<ChunkResourceStore,Map<string,number>>();
function rememberSettleNeed(resources:ChunkResourceStore,key:string,bytes:number){
 let byKey=settleNeeds.get(resources);if(!byKey){byKey=new Map();settleNeeds.set(resources,byKey);}
 if(bytes>(byKey.get(key)??0))byKey.set(key,bytes);
}
/** Per page store: held claims the ledger refused (stats.cloneHoldMisses). The
 * hold reuses the claim's own normalize identity and the page limit is fixed,
 * so this stays 0; a nonzero count means a clone ran without its held claim. */
const cloneHoldMisses=new WeakMap<ChunkResourceStore,number>();
/** A binding now holds the decoded parent of key; the returned drop is idempotent. */
function holdDecodedParent(resources:ChunkResourceStore,key:string,stepBack?:()=>void):()=>void{
 let byKey=cloneHolds.get(resources);if(!byKey){byKey=new Map();cloneHolds.set(resources,byKey);}
 let hold=byKey.get(key);if(!hold){hold={holders:new Set(),yields:new Map(),reservation:undefined,costs:[],room:undefined};byKey.set(key,hold);}
 const rows=byKey,row=hold,token={};row.holders.add(token);if(stepBack)row.yields.set(token,stepBack);
 return()=>{
  row.yields.delete(token);
  if(!row.holders.delete(token)||row.holders.size)return;
  if(rows.get(key)===row)rows.delete(key);
  const held=row.reservation;row.reservation=undefined;row.costs=[];row.room=undefined;held?.release();
 };
}
/** The first binding to clone takes the hold's first-clone room: charge(room)
 * moves the room's cost onto that binding's own claim (same identity, so it
 * never adds a byte), and in the same synchronous step the hold puts it down,
 * which returns nothing to the page either. undefined when no room is held (a
 * later binding, or a value settled without one): that clone grows the ledger. */
function takeCloneRoom(resources:ChunkResourceStore,key:string,charge:(room:ResourceBudgetCost)=>boolean):boolean{
 const hold=cloneHolds.get(resources)?.get(key),room=hold?.room;
 if(!hold||!room||!hold.reservation)return false;
 if(!charge(room))return false;
 const kept=hold.costs.filter(cost=>cost!==room);hold.room=undefined;hold.costs=kept;
 // A smaller replacement: never refused.
 if(kept.length)hold.reservation.adjust(kept);else{const held=hold.reservation;hold.reservation=undefined;held.release();}
 return true;
}
/** Whether bindings hold the decoded parent of key now (scheme H applies). */
function cloneHoldWanted(resources:ChunkResourceStore,key:string){return(cloneHolds.get(resources)?.get(key)?.holders.size??0)>0;}
/** A decoded value's settled cost. The walk runs once per cell: a cost taken
 * before the value returns (scheme H) is the one the page store settles. */
function decodedValueCost(cell:ValueCell):ResourceBudgetCost{
 if(cell.metadataBytes===undefined)cell.metadataBytes=estimateRetainedBuildingPayload(cell.value).retainedPayloadEstimateBytes;
 return{category:'metadata',bytes:cell.metadataBytes,precision:'estimate',identity:cell.value&&typeof cell.value==='object'?cell.value as object:cell,label:'verified frozen JSON value'};
}
/** Called as a decoded production returns its value, before the page store
 * settles its claim: keeps that read's held normalize and first-clone room
 * (charge.hold) charged for the bindings holding the parent now (none: nothing
 * to keep). */
function keepNormalizeThroughClones(resources:ChunkResourceStore,key:string,context:ChunkProductionContext,charge:AttemptCharge){
 const hold=cloneHolds.get(resources)?.get(key);if(!hold?.holders.size)return;
 const costs=(charge.hold??[]).filter(cost=>cost.bytes>0&&cost.identity!==undefined);if(!costs.length)return;
 const previous=hold.reservation;hold.reservation=undefined;hold.costs=[];hold.room=undefined;
 const held=context.budget.tryReserve(costs,{label:'frozen normalize held through binding clones'});
 // Same identities as the claim: this cannot add a byte, so it cannot be refused.
 // Were it refused, the clones would run uncovered: counted, never silent.
 if(held.ok){hold.reservation=held.reservation;hold.costs=costs;hold.room=costs.find(cost=>cost.identity===charge.room);}
 else cloneHoldMisses.set(resources,(cloneHoldMisses.get(resources)??0)+1);
 previous?.release();
}
/** An abandoned attempt may still hold its delivered or inflated buffer (or, on
 * a legacy reader, receive its bytes) until it settles. Those costs move from
 * the shared claim to their own reservation, released when that attempt
 * settles. The identities are the claim's own, so this admits nothing new; the
 * parse expansion is dropped, since an aborted attempt never parses. After a
 * caller-admitted delivery the claim lists the delivered response (D) under its
 * buffer identity, so D is kept. A minted read envelope is never kept: until
 * delivery the transport entry charges it under the same identities until its
 * read settles, and from the delivery's first step on the entry has put it down
 * and the claim no longer lists it, so keeping it then would add bytes (an
 * abort inside the delivery's own wake wave, before charge.costs follows). */
function keepAbandoned(context:ChunkProductionContext,charge:AttemptCharge,reading:Promise<unknown>){
 const minted=charge.minted,headroom=charge.headroom,room=charge.room;
 const live=charge.costs.filter(cost=>cost.category!=='normalize'&&cost.bytes>0&&cost.identity!==undefined&&cost.identity!==headroom&&cost.identity!==room&&!minted?.has(cost.identity as object));charge.costs=[];charge.hold=undefined;
 if(!live.length)return;
 const held=context.budget.tryReserve(live,{label:'abandoned frozen ingress until it settles'});
 // Same identities as the claim: this cannot add a byte, so it cannot be refused.
 if(!held.ok)return;
 const release=()=>held.reservation.release();void reading.then(release,release);
}
/** The page-wide verified ingress for every waiting map. The first waiting
 * map's reader reads. If that map leaves while another still waits, the next
 * waiter's reader reads again: a waiter never receives an abort its own map did
 * not cause. A relayed read starts from the queued estimate: while it waits for
 * a slot on the relaying map's ingress it holds no working set, and its first
 * step admits one again (or rejects, like every refused frozen admission).
 * When nobody waits, the page store retires the entry, aborts this production
 * and returns its claim. A read whose admission is refused returns everything
 * beyond the queued estimate and waits for page capacity holding only that
 * estimate, outside its ingress slot, then reads again (relayed if its map
 * left meanwhile); one that cannot fit the page even alone is reported as not
 * fitting. A verification, size, parse or unfit failure rejects every waiter as
 * before. No timer: each step waits on a read, an availability wave, a waiter
 * leaving or the production's own signal. */
async function produceDecoded(resources:ChunkResourceStore,key:string,context:ChunkProductionContext):Promise<ValueCell>{
 let relay=false,readerFailure:unknown;
 // A table whose settle or clone this page refused before starts with that need.
 const production:DecodedProduction={retryEnvelopeBytes:0,retryReadBytes:0,settleBytes:settleNeeds.get(resources)?.get(key)??0},age=++nextDecodedAge;
 // Set while this production is served by a step-back; ended with it.
 let turnEnd:(()=>void)|undefined;
 const serve=()=>{
  if(turnEnd)return;let turns=pageTurns.get(resources);if(!turns){turns=new Set();pageTurns.set(resources,turns);}
  const rows=turns;let end!:()=>void;const turn=new Promise<void>(resolve=>{end=resolve;});rows.add(turn);
  turnEnd=()=>{turnEnd=undefined;rows.delete(turn);if(!rows.size&&pageTurns.get(resources)===rows)pageTurns.delete(resources);end();};
 };
 try{
 for(;;){
  context.signal.throwIfAborted();
  let reader:DecodedReader|undefined;
  for(const row of decodedReaders.get(resources)?.get(key)??[])if(!row.left&&row.failure===undefined&&row.usable()){reader=row;break;}
  if(!reader)throw readerFailure??aborted();
  // One relay per reader change: a capacity retry by the same reader is not another.
  if(relay){reader.relayed();relay=false;}
  const attempt=new AbortController(),stop=()=>attempt.abort(context.signal.reason??aborted()),charge:AttemptCharge={costs:[],production};
  let abandoned!:(reason:unknown)=>void;const left=new Promise<never>((_resolve,reject)=>{abandoned=reject;});void left.catch(()=>{});
  reader.abandon=reason=>{attempt.abort(reason);abandoned(reason);};
  context.signal.addEventListener('abort',stop,{once:true});
  let reading:Promise<ValueCell>|undefined;
  try{
   // A reader that ignores its abort keeps its own ingress slot until it
   // settles, but never holds the remaining waiters behind it.
   reading=reader.read(attempt.signal,context,charge);
   const cell=await Promise.race([reading,left]);
   keepNormalizeThroughClones(resources,key,context,charge);
   return cell;
  }catch(error){
   if(attempt.signal.aborted&&reading)keepAbandoned(context,charge,reading);
   if(context.signal.aborted){if(error instanceof CapacityWait)error.wake.cancel();throw error;}
   // Return the claim to the queued estimate before the next reader queues.
   if(attempt.signal.aborted){if(error instanceof CapacityWait)error.wake.cancel();context.adjust(QUEUED_DECODED);relay=true;continue;}
   if(error instanceof CapacityWait){
    // Holding only the queued estimate: wait for capacity, this reader's map
    // leaving (which aborts the attempt and so the wake-up) or the production's
    // end, then admit again. Registered as a page waiter meanwhile, so an older
    // waiter blocked only by younger waiters' estimates is served first.
    let waiters=capacityWaiters.get(resources);if(!waiters){waiters=new Set();capacityWaiters.set(resources,waiters);}
    const rows=waiters,waiter:CapacityWaiter={age,key,need:error.need,serve};rows.add(waiter);
    try{breakWaiterDeadlock(resources);await error.wake.promise;}
    catch(reason){if(context.signal.aborted)throw reason;relay=true;}
    finally{rows.delete(waiter);if(!rows.size&&capacityWaiters.get(resources)===rows)capacityWaiters.delete(resources);}
    continue;
   }
   // This map's reader was torn down beneath a waiting map: another reads.
   if(isAbort(error)){reader.failure=error;readerFailure=error;context.adjust(QUEUED_DECODED);relay=true;continue;}
   throw error;
  }finally{context.signal.removeEventListener('abort',stop);reader.abandon=undefined;}
 }
 }finally{turnEnd?.();}
}
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(n=>n.toString(16).padStart(2,'0')).join('');
function sameEnvelopeValue(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>,keys=Object.keys(left);
 return keys.length===Object.keys(right).length&&keys.every(key=>Object.hasOwn(right,key)&&sameEnvelopeValue(left[key],right[key]));
}

/** Descriptor/allowlist ownership stays here; decoded cells, metadata and every
 * pre-expansion reservation live in the one injected page resource store.
 * Native values and provenance are unchanged. All stored ready promises are void.
 * Each lease store (one per map) owns its mutable initializer bindings under its
 * own store key; only the verified, read-only table ingress is page-wide. */
export function createFrozenDataLeaseStore(descriptors:readonly FrozenDataDescriptor[],options:{resourceStore?:ChunkResourceStore}={}){
 const resources=options.resourceStore??getPageChunkResourceStore(),registry=new Map<string,FrozenDataDescriptor>(),entries=new Map<string,Diagnostic>(),queue:Ingress[]=[],clients=new Set<FrozenDataClient>();
 const storeKey='frozen-store:'+ ++nextFrozenStore;
 let total=0,active=0,peakConcurrency=0,destroyed=false,reads=0,parses=0,releasedValues=0,acquisitions=0,cumulativeLogicalJSONBytes=0,relayedReads=0;
 let capacityWaits=0,waiterYields=0,unfit=0,deliveryRefusals=0,unadmittedDeliveries=0,composeReclaims=0,composeReclaimedBytes=0;
 for(const d of descriptors){
  if(!shaPattern.test(d.sha256)||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>MAX||!d.path.endsWith('/'+d.sha256+'.json')||!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json$/.test(d.path)||registry.has(d.sha256))throw Error('Invalid frozen data descriptor');
  const t=d.transport;if(t&&(!shaPattern.test(t.sha256)||t.encoding!=='gzip'||!Number.isSafeInteger(t.bytes)||t.bytes<1||t.bytes>MAX||!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json\.gz$/.test(t.path)||!t.path.endsWith('/'+t.sha256+'.json.gz')))throw Error('Invalid frozen data transport');
  registry.set(d.sha256,d);total+=d.bytes;
 }
 if(total>900*1024**2)throw Error('Frozen data descriptor budget exceeded');
 function unused(record:Diagnostic){if(record.waiters||record.leases)return;if(entries.get(record.key)===record)entries.delete(record.key);if(record.ready)releasedValues++;}
 function pump(){
  while(active<2&&queue.length){const task=queue.shift()!;if(task.signal.aborted){task.cancel?.();continue;}active++;peakConcurrency=Math.max(peakConcurrency,active);task.start?.();}
 }
 function ingress<T>(signal:AbortSignal,work:()=>Promise<T>):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
   const task:Ingress={signal,start:undefined,cancel:undefined};let running=false,done=false;
   const clear=()=>{signal.removeEventListener('abort',cancel);task.start=task.cancel=undefined;};
   const cancel=()=>{if(done||running)return;done=true;const at=queue.indexOf(task);if(at>=0)queue.splice(at,1);clear();reject(signal.reason??aborted());};task.cancel=cancel;
   task.start=()=>{running=true;signal.removeEventListener('abort',cancel);void work().then(resolve,reject).finally(()=>{done=true;clear();active--;pump();});};
   signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();else{queue.push(task);pump();}
  });
 }
 /** One verified read of a page-wide decoded value through this map's reader.
  * `signal` is the attempt's: the shared production's own signal, or this map
  * abandoning the attempt. The read's whole working set is admitted on the
  * shared claim at once: the decoded expansion and, with a byte transport, a
  * read envelope minted for this read, handed with the claim to the transport's
  * caller-admitted read, which charges it once with its own entry, never waits
  * for capacity and shrinks the claim in place to [expansion, response] at
  * delivery. A legacy reader is pre-charged its physical bytes instead. A
  * refused admission returns everything beyond the queued estimate and waits
  * for capacity (CapacityWait); one that cannot fit beside its binding even on
  * an empty page is reported as not fitting. A delivery the claim could not
  * take is retried once with an envelope that covers it. */
 async function verifiedRead(descriptor:FrozenDataDescriptor,config:ClientOptions,signal:AbortSignal,context:ChunkProductionContext,charge:AttemptCharge):Promise<ValueCell>{
  const physical=descriptor.transport??descriptor,inflated=descriptor.transport?descriptor.bytes:0,budget=context.budget,production=charge.production;
  // This attempt's own identities; see keepAbandoned.
  const id={read:{},inflate:{},normalize:{},headroom:{},room:{}};charge.room=id.room;charge.hold=undefined;
  const normalize:ResourceBudgetCost={category:'normalize',bytes:descriptor.bytes*FROZEN_NORMALIZE_EXPANSION,precision:'estimate',identity:id.normalize,label:'frozen UTF8/JSON/container expansion'};
  const inflate:ResourceBudgetCost={category:'inflate',bytes:inflated,precision:'exact',identity:id.inflate};
  // An aborted attempt never touches the shared claim again.
  const adjust=(costs:readonly ResourceBudgetCost[])=>{signal.throwIfAborted();if(!context.adjust(costs))return false;charge.costs=costs;return true;};
  /** Refused: return what the claim holds beyond its queued estimate, then
   * either report not fitting (this working set beside the waiting binding's
   * estimate exceeds the whole page) or wait holding only the queued estimate,
   * subscribed in this synchronous segment. One binding's estimate: bindings of
   * other maps beyond the first step back when only they block it (see
   * breakWaiterDeadlock). */
  function refuse(workingBytes:number,what:string):never{
   charge.costs=[];context.adjust(QUEUED_DECODED);
   if(QUEUED_BINDING.bytes+workingBytes>budget.stats.limitBytes){unfit++;throw unfitError(budget,QUEUED_BINDING.bytes+workingBytes,'frozen ingress '+what+' does not fit the page: '+descriptor.sha256);}
   capacityWaits++;throw new CapacityWait(capacityWake(budget,signal),workingBytes);
  }
  /** Scheme H retry: room for the settle a previous attempt of this production
   * needed ([normalize, settled value], production.settleBytes), held beside
   * the expansion from admission until the settle replaces it, so this
   * attempt's claim never has to grow after its read. `buffers` are the bytes
   * the claim lists beside normalize at that step. 0 on a first attempt. */
  const headroomBytes=(buffers:number)=>Math.max(0,production.settleBytes-normalize.bytes-buffers);
  const headroom=(bytes:number):readonly ResourceBudgetCost[]=>bytes>0?[{category:'metadata',bytes,precision:'estimate',identity:id.headroom,label:'frozen settle headroom beside the clone hold'}]:[];
  const transport=config.acquireBytes,base:readonly ResourceBudgetCost[]=[inflate,normalize];
  const envelope=transport?resourceByteAdmittedEnvelope(physical.path,physical.bytes,production.retryEnvelopeBytes):undefined;
  if(envelope)charge.minted=new Set(envelope.map(cost=>cost.identity as object));
  const readCost:ResourceBudgetCost={category:'read',bytes:Math.max(physical.bytes,production.retryReadBytes),precision:'exact',identity:id.read};
  // After delivery the claim lists [inflate, normalize, headroom, response P]:
  // the headroom tops that up to the settle need. Never above the page beside
  // the waiting binding (a transport read admits the envelope's second copy P
  // beside it, so this caps only when the page is below 256 + S + P): then the
  // inflate/parse step below grows the claim again (its room is not capped) and
  // the settle may be refused again; it is reported as not fitting when the
  // settle or the private clone cannot fit the page (see DecodedProduction).
  // One binding, also when bindings of other maps wait for this read: capped
  // to the page, the admission beside k bindings is refused before any network
  // read, and the other k - 1 step back for it (breakWaiterDeadlock), so it is
  // admitted whole beside its first holder rather than read short and settled
  // again (R4S1-2).
  const unheaded=costBytes(envelope?[...base,...envelope]:[readCost,...base]);
  const firstHeadroom=Math.min(headroomBytes(inflated+physical.bytes),Math.max(0,budget.stats.limitBytes-QUEUED_BINDING.bytes-unheaded));
  // Always this attempt's headroom identity, also when the first step admits
  // none: a later step's room uses it, and keepAbandoned must never keep it.
  charge.headroom=id.headroom;
  const keep:readonly ResourceBudgetCost[]=[...base,...headroom(firstHeadroom)];
  const working:readonly ResourceBudgetCost[]=envelope?[...keep,...envelope]:[readCost,...keep];
  if(!adjust(working))refuse(costBytes(working),'working set');
  reads++;let bytes:Uint8Array|undefined,raw:Uint8Array|undefined,byteLease:ResourceBytesLease|undefined;
  try{
  if(transport&&envelope){
   try{byteLease=await transport(physical.path,signal,physical.bytes,{admitted:context,envelope,keep});}
   catch(error){
    const refused=deliveryRefusal(error);
    if(!refused||signal.aborted)throw error;
    // The response buffer exceeded the envelope; the claim is unchanged.
    deliveryRefusals++;
    if(refused.unfit||production.retryEnvelopeBytes>0){charge.costs=[];context.adjust(QUEUED_DECODED);unfit++;throw unfitError(budget,QUEUED_BINDING.bytes+refused.retryBytes,'frozen ingress delivery does not fit the page: '+descriptor.sha256);}
    production.retryEnvelopeBytes=refused.envelopeBytes;refuse(refused.retryBytes,'delivery');
   }
   bytes=byteLease.bytes;
   // The transport shrank the claim in place to [...keep, response].
   if(byteLease.cost)charge.costs=[...keep,byteLease.cost];
   else{
    // A transport that ignored the caller's admission (no 4th argument) left
    // the envelope on the claim: list the response in its place.
    unadmittedDeliveries++;
    const delivered:ResourceBudgetCost={category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer};
    if(!adjust([delivered,...keep])){
     if(production.retryEnvelopeBytes>0){charge.costs=[];context.adjust(QUEUED_DECODED);unfit++;throw unfitError(budget,QUEUED_BINDING.bytes+costBytes(keep)+delivered.bytes,'frozen ingress delivery does not fit the page: '+descriptor.sha256);}
     production.retryEnvelopeBytes=Math.max(costBytes(envelope),delivered.bytes);refuse(costBytes(keep)+production.retryEnvelopeBytes,'delivery');
    }
   }
  }else bytes=await config.read(physical.path,signal,physical.bytes);
  signal.throwIfAborted();
  if(bytes.byteLength!==physical.bytes)throw Error('Frozen data physical byte count mismatch');
  if(await digest(bytes)!==physical.sha256)throw Error('Frozen data physical hash mismatch');
  if(!transport){
   // The legacy pre-charge becomes the delivered buffer's own identity.
   const delivered:ResourceBudgetCost={category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer};
   if(!adjust([delivered,...keep])){
    if(production.retryReadBytes>0){charge.costs=[];context.adjust(QUEUED_DECODED);unfit++;throw unfitError(budget,QUEUED_BINDING.bytes+costBytes(keep)+delivered.bytes,'frozen ingress legacy read does not fit the page: '+descriptor.sha256);}
    production.retryReadBytes=delivered.bytes;refuse(costBytes(keep)+delivered.bytes,'legacy read');
   }
  }
  raw=descriptor.transport?await inflateBounded3DGzip(bytes,descriptor.bytes,signal,descriptor.sha256,MAX):bytes;signal.throwIfAborted();
  if(descriptor.transport){
   // The compressed response has no use after inflation: return its lease and
   // drop its identity from this claim before the JSON text/value expansion.
   const response=byteLease;byteLease=undefined;bytes=undefined;response?.release();
   const room=headroom(headroomBytes(raw.buffer.byteLength));
   if(!adjust([{category:'inflate',bytes:raw.buffer.byteLength,precision:'exact',identity:raw.buffer},normalize,...room]))refuse(raw.buffer.byteLength+normalize.bytes+costBytes(room),'inflated working set');
  }else{
   const room=headroom(headroomBytes(bytes.buffer.byteLength));
   if(!adjust([{category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer},normalize,...room]))refuse(bytes.buffer.byteLength+normalize.bytes+costBytes(room),'parse working set');
  }
  bytes=undefined;
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));parses++;cumulativeLogicalJSONBytes+=raw.byteLength;raw=undefined;signal.throwIfAborted();
  const cell:ValueCell={value};
  // Scheme H: while bindings hold this value as their parent, the claim takes
  // the settled value beside the clone hold, [held normalize 10 d (this
  // claim's normalize identity, down from the parse's 13 d: the parse and the
  // costs() walk are done), first-clone room E], before it returns (the parsed
  // buffer is gone), so the page store's settle only shrinks the claim while
  // produceDecoded keeps the hold charged through the clones and the first
  // clone takes its room without growing. The growth over the parse claim is
  // admitted here; refused, everything returns and the read waits for capacity
  // holding only its queued estimate. A refused settle records what it needed
  // first (also for the page, settleNeeds), so the next attempt admits it with
  // its read (headroom above).
  // A value whose private clone cannot fit even on an empty page (the bindings'
  // own check: 2E + 10d, the shared value, its copy and the held normalize) is
  // reported now, before its settle: no waiter could ever take it, so it never
  // waits or reads again for it.
  const key=decodedKey(descriptor);
  if(cloneHoldWanted(resources,key)){
   const settled=decodedValueCost(cell),held:ResourceBudgetCost={category:'normalize',bytes:descriptor.bytes*FROZEN_CLONE_HOLD_EXPANSION,precision:'estimate',identity:id.normalize,label:'frozen normalize held through binding clones'};
   const room:ResourceBudgetCost={category:'metadata',bytes:settled.bytes,precision:'estimate',identity:id.room,label:'frozen first private clone room'};
   const cloneNeed=2*settled.bytes+held.bytes;
   if(cloneNeed>budget.stats.limitBytes){charge.costs=[];context.adjust(QUEUED_DECODED);unfit++;throw unfitError(budget,cloneNeed,'frozen private clone does not fit the page beside its shared value: '+descriptor.sha256);}
   production.settleBytes=Math.max(production.settleBytes,held.bytes+settled.bytes+room.bytes);
   if(!adjust([held,settled,room])){rememberSettleNeed(resources,key,production.settleBytes);refuse(held.bytes+settled.bytes+room.bytes,'decoded value beside its clone hold');}
   charge.hold=[held,room];
  }
  return cell;
  }finally{raw=undefined;bytes=undefined;byteLease?.release();byteLease=undefined;}
 }
 /** This map's waiter on the page-wide ingress: its reader under its own queue. */
 function decodedReader(descriptor:FrozenDataDescriptor,config:ClientOptions):DecodedReader{
  return{read:(signal,context,charge)=>ingress(signal,()=>verifiedRead(descriptor,config,signal,context,charge)),usable:()=>!destroyed,relayed(){relayedReads++;},abandon:undefined,failure:undefined,left:false};
 }
 /** The page-wide decoded entry. Only a binding acquires it, and that binding
  * calls holdDecodedParent for the same key in the same synchronous step
  * (scheme H): while the entry lives some binding holds it, so a later
  * binding's clone always finds the held normalize claim. A consumer that
  * acquires it without a hold must not keep it past its settle. */
 function decoded(descriptor:FrozenDataDescriptor,role:ChunkResourceRole){
  const key=decodedKey(descriptor);
  return resources.acquire<ValueCell>({contentKey:key,role,allowRecent:false,
   estimate:QUEUED_DECODED,
   // The first waiting map's reader reads; a later waiter relays if it leaves.
   produce:context=>produceDecoded(resources,key,context),
   costs:decodedValueCost,
   dispose(cell){cell.value=undefined;},
  });
 }
 function client(config:ClientOptions):FrozenDataClient{
  if(destroyed)throw aborted();
  if(!config.city||!config.provider||config.profileSHA256!==null&&!shaPattern.test(config.profileSHA256))throw Error('Invalid frozen data scope');
  const ownerKey='frozen-client:'+ ++nextFrozenClient,allowed=new Map<string,Map<string,number>>();
  for(const sha of config.selection.tables){
   if(!registry.has(sha))throw Error('Unknown frozen data selection');
   const refs=config.selection.initializers?.[sha];if(!refs)throw Error('Missing frozen data initializer bindings');
   const row=new Map<string,number>();for(const [file,count]of Object.entries(refs)){if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid frozen data initializer count');row.set(file,count);}allowed.set(sha,row);
  }
  let closed=false;const waiting=new Set<()=>void>(),owned=new Map<()=>void,()=>ChunkResourceRole>();
  // A data lease's current grant and diagnostic record, for composition reclaims.
  const grants=new WeakMap<DataLease<unknown>,()=>{grant:ChunkResourceLease<ValueCell>|undefined;record:Diagnostic|undefined}>();
  const notifyCompositions=()=>{if(composeRegistries.get(resources)?.states.size)resources.budget.notifyAvailabilityStateChange();};
  function lease<T>(identity:FrozenDataIdentity,grant:ChunkResourceLease<ValueCell>|undefined,record?:Diagnostic,logicalBytes=record?.logicalBytes??0):DataLease<T>{
   const contentKey=grant!.contentKey;if(record){record.leases++;notifyCompositions();}
   const check=()=>{if(!grant||grant.released||!grant.value)throw Error('Frozen data lease was released');return grant.value;};
   const release=()=>{if(!grant)return;const old=grant;grant=undefined;owned.delete(release);if(record){record.leases--;unused(record);notifyCompositions();}old.release();};owned.set(release,()=>grant!.role);
   const result:DataLease<T>={identity,contentKey,logicalBytes,borrow<R>(read:(value:T)=>R){check();const held=grant!.borrowReady('dependency');try{if(!held.value)throw aborted();return read(held.value.value as T);}finally{held.release();}},retain(role='source'){check();return lease<T>(identity,grant!.retain(role),record,logicalBytes);},retainResource(role){check();return grant!.retain(role);},release};
   grants.set(result as DataLease<unknown>,()=>({grant,record}));
   return result;
  }
  /** The page-ledger bytes releasing this lease returns: its binding's charge
   * when no other data lease holds that binding, otherwise nothing. */
  function exclusiveBytes(item:DataLease<unknown>|undefined){
   const held=item&&grants.get(item)?.();
   if(!held?.grant||held.grant.released||(held.record?.leases??1)>1)return 0;
   return held.grant.value?.metadataBytes??0;
  }
  async function wait(grant:ChunkResourceLease<ValueCell>,signal:AbortSignal){
   await new Promise<void>((resolve,reject)=>{
    let done=false;const finish=(error?:unknown)=>{if(done)return;done=true;waiting.delete(cancel);signal.removeEventListener('abort',cancel);error===undefined?resolve():reject(error);};
    const cancel=()=>finish(signal.reason??aborted());waiting.add(cancel);signal.addEventListener('abort',cancel,{once:true});grant.ready.then(()=>finish(),error=>finish(error));if(signal.aborted)cancel();
    // Disposed or destroyed re-entrantly before this wait registered (inside
    // the acquisition's own synchronous chain): end now, as dispose would have.
    else if(closed||destroyed)finish(aborted());
   });signal.throwIfAborted();if(closed||destroyed)throw aborted();
  }
  /** Waits holding nothing for the next availability wave (subscribed in the
   * caller's synchronous segment, right after its refusal); disposal of this
   * client or the request's signal ends it. */
  async function capacity(signal:AbortSignal){
   // Disposed or destroyed re-entrantly inside the refusal that led here (its
   // pressure wave): dispose already ended every registered wait, so end now.
   signal.throwIfAborted();if(closed||destroyed)throw aborted();
   capacityWaits++;const wake=capacityWake(resources.budget,signal),cancel=()=>wake.cancel();waiting.add(cancel);
   try{await wake.promise;}finally{waiting.delete(cancel);}
   signal.throwIfAborted();if(closed||destroyed)throw aborted();
  }
  /** After a step-back: waits holding nothing until every production now
   * served by a step-back on this page store has ended (each one does: it
   * completes, fails or is aborted when its last waiter leaves); disposal of
   * this client or the request's signal ends it. Then the acquisition binds
   * again, admitting its queued estimate or waiting for capacity as usual. */
  async function servedTurns(signal:AbortSignal){
   signal.throwIfAborted();if(closed||destroyed)throw aborted();
   const turns=[...pageTurns.get(resources)??[]];
   if(turns.length)await new Promise<void>((resolve,reject)=>{
    let done=false;const finish=(error?:unknown)=>{if(done)return;done=true;waiting.delete(cancel);signal.removeEventListener('abort',cancel);error===undefined?resolve():reject(error);};
    const cancel=()=>finish(signal.reason??aborted());waiting.add(cancel);signal.addEventListener('abort',cancel,{once:true});
    void Promise.all(turns).then(()=>finish());
   });
   signal.throwIfAborted();if(closed||destroyed)throw aborted();
  }
  // The store key keeps two maps on one page store from sharing a mutable
  // private value: a binding belongs to its lease store (its map).
  const bindingKey=(identity:FrozenDataIdentity,descriptor:FrozenDataDescriptor)=>JSON.stringify(['frozen-binding-v2',storeKey,identity.city,identity.profileSHA256,identity.canonicalSHA256,descriptor.sha256,identity.file,identity.occurrence,identity.codec]);
  function binding(identity:FrozenDataIdentity,descriptor:FrozenDataDescriptor,role:ChunkResourceRole){
   // JSON bindings own private containers: immutable scalars can be reused
   // without structuredClone's serialization; no typed buffer is shared here.
   // Drop the ingress parent as soon as cloning ends rather than retaining a
   // redundant canonical table for the lifetime of this material binding.
   return resources.acquire<ValueCell>({contentKey:bindingKey(identity,descriptor),role,allowRecent:false,estimate:QUEUED_BINDING,
    async produce(context){
     // This map's reader joins the page-wide ingress before acquiring it, and
     // leaves when this binding stops waiting for it.
     const leave=joinDecodedReaders(resources,decodedKey(descriptor),decodedReader(descriptor,config));let parent:ChunkResourceLease<ValueCell>|undefined,dropHold:(()=>void)|undefined;
     // Asked to step back for an older waiting ingress (breakWaiterDeadlock):
     // ends this production holding nothing; its acquisition binds again later.
     let stepBack:(()=>void)|undefined;
     // Releases the parent and, in the same step, this binding's clone hold (scheme H).
     const dropParent=()=>{const held=parent;parent=undefined;const drop=dropHold;dropHold=undefined;held?.release();drop?.();};
     const cancel=()=>{leave();dropParent();};context.signal.addEventListener('abort',cancel,{once:true});
     const budget=context.budget;
     try{
      for(;;){
       context.signal.throwIfAborted();
       const stepped=new Promise<never>((_resolve,reject)=>{stepBack=()=>reject(new FrozenYield());});void stepped.catch(()=>{});
       try{parent=decoded(descriptor,'dependency');dropHold=holdDecodedParent(resources,decodedKey(descriptor),()=>stepBack?.());}
       catch(error){
        // The shared entry's queued estimate was refused: wait holding only
        // this binding's queued estimate.
        if(!refusedNow(error))throw error;
        if(QUEUED_BINDING.bytes+QUEUED_DECODED.bytes>budget.stats.limitBytes){unfit++;throw unfitError(budget,QUEUED_BINDING.bytes+QUEUED_DECODED.bytes,'frozen ingress does not fit the page: '+descriptor.sha256);}
        capacityWaits++;await capacityWake(budget,context.signal).promise;continue;
       }
       await Promise.race([parent.ready,stepped]);stepBack=undefined;context.signal.throwIfAborted();if(!parent.value)throw aborted();
       // The shared value's settled estimate (the same walk, cached on the cell):
       // never a raw-byte multiple.
       const shared=decodedValueCost(parent.value).bytes,key=decodedKey(descriptor);
       // The first clone takes the room its decoded read settled beside (same
       // identity: never refused); a later one grows the ledger by E - 256.
       const roomed=shared>0&&takeCloneRoom(resources,key,room=>room.bytes===shared&&context.adjust(room));
       if(roomed||context.adjust({category:'metadata',bytes:shared,precision:'estimate',label:'private frozen initializer clone'}))return{value:cloneFrozenJSON(parent.value.value)};
       // The clone was refused: return the shared value too, and wait holding
       // only this binding's queued estimate; the clone needs room beside it.
       dropParent();
       // On an empty page the clone still needs the shared value, its own copy and
       // the normalize held through the clone (scheme H, FROZEN_CLONE_HOLD_EXPANSION).
       const holdBytes=descriptor.bytes*FROZEN_CLONE_HOLD_EXPANSION,cloneNeed=2*shared+holdBytes;
       if(cloneNeed>budget.stats.limitBytes){unfit++;throw unfitError(budget,cloneNeed,'frozen private clone does not fit the page beside its shared value: '+descriptor.sha256);}
       // The next read of this table (its value may be let go meanwhile) admits
       // its settle and a first-clone room for this binding with the read.
       rememberSettleNeed(resources,key,holdBytes+2*shared);
       capacityWaits++;await capacityWake(budget,context.signal).promise;
      }
     }
     finally{context.signal.removeEventListener('abort',cancel);leave();dropParent();}
    },
    costs(cell){cell.metadataBytes=estimateRetainedBuildingPayload(cell.value).retainedPayloadEstimateBytes;return{category:'metadata',bytes:cell.metadataBytes,precision:'estimate',identity:cell.value&&typeof cell.value==='object'?cell.value as object:cell};},
    dispose(cell){cell.value=undefined;for(const parent of cell.parents??[])parent.release();cell.parents=undefined;},
   });
  }
  async function acquireEntry<T>(identity:FrozenDataIdentity,descriptor:FrozenDataDescriptor,signal:AbortSignal,role:ChunkResourceRole):Promise<DataLease<T>>{
   signal.throwIfAborted();if(closed||destroyed)throw aborted();
   // Preserve the original mutable initializer/material authority. Distinct
   // bindings share verified ingress, never a mutable provider value.
   const key=bindingKey(identity,descriptor);let record=entries.get(key);
   if(!record){record={key,logicalBytes:descriptor.bytes,ready:false,waiters:0,leases:0};entries.set(key,record);}record.waiters++;acquisitions++;
   let grant:ChunkResourceLease<ValueCell>|undefined;
   try{
    for(;;){
     for(;;){
      try{grant=binding(identity,descriptor,role);break;}
      catch(error){
       // The binding's queued estimate itself was refused: wait holding nothing.
       if(!refusedNow(error))throw error;
       if(QUEUED_BINDING.bytes>resources.budget.stats.limitBytes){unfit++;throw unfitError(resources.budget,QUEUED_BINDING.bytes,'frozen binding does not fit the page: '+descriptor.sha256);}
       await capacity(signal);
      }
     }
     try{await wait(grant,signal);}
     catch(error){
      // The binding stepped back for an older waiting ingress (it crossed the
      // page store, so by name): it holds nothing now; bind again on the next
      // availability wave, after the older one was served.
      if((error as {name?:unknown}|null)?.name!=='FrozenYield'||signal.aborted||closed||destroyed)throw error;
      const stepped=grant;grant=undefined;stepped.release();waiterYields++;
      await servedTurns(signal);continue;
     }
     break;
    }
    if(!grant.value)throw aborted();record.ready=true;const value=lease<T>(identity,grant,record);grant=undefined;return value;
   }
   finally{record.waiters--;unused(record);grant?.release();}
  }
  function compose(partition:FrozenDataPartition,selected:readonly {part:FrozenDataPart;lease:DataLease<unknown>}[]):unknown{
   if(partition.kind==='model-envelope'||partition.kind==='group-envelope'){
    const rowField=partition.kind==='group-envelope'?'groups':'models',identityField=partition.kind==='group-envelope'?'queueId':'targetId';
    const rows:{index:number;value:unknown}[]=[];
    for(const {part,lease}of selected)lease.borrow(value=>{
     if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid frozen model envelope');
     const {[rowField]:models,...envelope}=value as Record<string,unknown>;
     if(!sameEnvelopeValue(envelope,partition.envelope))throw Error('Frozen model envelope metadata mismatch');
     if(!Array.isArray(models)||models.length!==part.rowIndices?.length||models.length!==part.keys.length)throw Error('Frozen model partition row count mismatch');
     const keys=new Set(part.keys),seen=new Set<string>();
     for(let i=0;i<models.length;i++){
      const model=models[i],key=model?.[identityField];
      if(typeof key!=='string'||key!==part.keys[i]||!keys.has(key)||seen.has(key))throw Error('Frozen model partition target binding mismatch');
      seen.add(key);rows.push({index:part.rowIndices![i],value:model});
     }
    });
    rows.sort((a,b)=>a.index-b.index);
    return{...partition.envelope,[rowField]:rows.map(row=>row.value)};
   }
   if(partition.kind==='object-rows'){
    const rows:{index:number;value:unknown}[]=[];
    for(const {part,lease}of selected)lease.borrow(value=>{
     if(!Array.isArray(value)||value.length!==part.rowIndices?.length)throw Error('Frozen data partition row count mismatch');
     const keys=new Set(part.keys),seen=new Set<string>();
     for(let i=0;i<value.length;i++){const row=value[i],key=row?.city+'|'+row?.objectId;if(!keys.has(key))throw Error('Frozen data partition object binding mismatch');seen.add(key);rows.push({index:part.rowIndices![i],value:row});}
     if(seen.size!==keys.size)throw Error('Frozen data partition object is missing');
    });
    rows.sort((a,b)=>a.index-b.index);return rows.map(row=>row.value);
   }
   const values:[string,unknown][]=[];
   for(const {part,lease}of selected)lease.borrow(value=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==part.keys.length)throw Error('Frozen data partition record count mismatch');
    for(const key of part.keys){if(!Object.hasOwn(value,key)||typeof (value as Record<string,unknown>)[key]!=='string')throw Error('Frozen data partition record binding mismatch');values.push([key,(value as Record<string,unknown>)[key]]);}
   });
   return Object.fromEntries(values);
  }
  /** Takes every selected part of one partitioned ref at once, then admits the
   * composition. Parts are acquired as before (concurrently, through this map's
   * two-way ingress); a part read or clone that is refused waits inside its own
   * production holding only its queued estimate. Until every part is ready at
   * once and the composition is admitted, the ready parts held only here are
   * reclaimable by page pressure (see reclaimComposedParts) and are taken again
   * afterwards; a refused composition estimate waits the same way. So this
   * composition never holds part of its working set while waiting for
   * capacity, and the oldest unfinished composition is never reclaimed by
   * another one. Resolves with the admitted composition and the part leases
   * this request still holds, which the composition retains as parents. */
  function composeParts(identity:FrozenDataIdentity,descriptors:readonly FrozenDataDescriptor[],signal:AbortSignal,compositionLabel:string,compositionBytes:number,create:()=>ChunkResourceLease<ValueCell>):Promise<{assembled:ChunkResourceLease<ValueCell>|undefined;held:DataLease<unknown>[]}>{
   return new Promise((resolve,reject)=>{
    // labels: the page-ledger labels under which this part's binding and decoded admissions are refused.
    type Row={descriptor:FrozenDataDescriptor;labels:readonly string[];lease:DataLease<unknown>|undefined;pending:Promise<void>|undefined};
    const rows:Row[]=descriptors.map(descriptor=>({descriptor,labels:[bindingKey(identity,descriptor).slice(0,256),decodedKey(descriptor).slice(0,256)],lease:undefined,pending:undefined}));
    const own=new AbortController();let done=false,wake:CapacityWake|undefined;
    const held=()=>rows.reduce((bytes,row)=>bytes+exclusiveBytes(row.lease),0);
    const state:ComposeState={age:nextComposeAge=checkedAvailabilitySequence(nextComposeAge),complete:false,heldBytes:held,
     serves:label=>label===compositionLabel||rows.some(row=>!row.lease&&row.labels.includes(label)),
     snapshot(writer){
      writer.open();writer.value(state.age);writer.value(state.complete);writer.value(compositionLabel);writer.open();
      for(const row of rows){
       // Emit each part directly in reclaim order; no snapshot array or label
       // copy is retained. The writer checks shared limits before every field.
       writer.open();writer.value(row.labels[0]);writer.value(row.labels[1]);writer.value(!!row.lease);writer.value(exclusiveBytes(row.lease));writer.close();
      }
      writer.close();writer.close();
     },
     reclaim(lacking){
      let freed=0;
      for(const row of rows){
       if(freed>=lacking)break;
       const bytes=exclusiveBytes(row.lease);if(!bytes)continue;
       const item=row.lease!;row.lease=undefined;notifyCompositions();item.release();freed+=bytes;composeReclaims++;composeReclaimedBytes+=bytes;
       // Taken again once the refused admission that reclaimed it was served.
       queueMicrotask(()=>start(row));
      }
      return freed;
     },
     fail:error=>finish(error)};
    let unregister:(()=>void)|undefined;
    const stop=()=>finish(signal.reason??aborted());
    function finish(error?:unknown,result?:{assembled:ChunkResourceLease<ValueCell>;held:DataLease<unknown>[]}){
     if(done)return;done=true;state.complete=true;unregister?.();unregister=undefined;signal.removeEventListener('abort',stop);wake?.cancel();wake=undefined;
     if(result){resolve(result);return;}
     // Roll back every part, then report once their acquisitions settled.
     own.abort(error);
     const settling=rows.flatMap(row=>row.pending?[row.pending]:[]);
     for(const row of rows){const item=row.lease;row.lease=undefined;item?.release();}
     void Promise.allSettled(settling).then(()=>reject(error));
    }
    function start(row:Row){
     if(done||row.lease||row.pending)return;
     row.pending=acquireEntry<unknown>(identity,row.descriptor,own.signal,'dependency').then(item=>{
      row.pending=undefined;if(done){item.release();return;}row.lease=item;notifyCompositions();check();
     },error=>{row.pending=undefined;finish(error);});
    }
    function check(){
     if(done||rows.some(row=>!row.lease))return;
     let assembled:ChunkResourceLease<ValueCell>;
     try{assembled=create();}
     catch(error){
      if(!refusedNow(error)){finish(error);return;}
      // The composition's queued estimate was refused: its parts stay
      // reclaimable while it waits (subscribed in this segment) to try again.
      const need=held()+compositionBytes;
      if(need>resources.budget.stats.limitBytes){unfit++;finish(unfitError(resources.budget,need,'frozen partition composition does not fit the page beside its parts'));return;}
      // A previous wake-up still pending (a reclaimed part became ready again
      // and checked first) is replaced, not left to call check() once more.
      wake?.cancel();capacityWaits++;const current=capacityWake(resources.budget,own.signal);wake=current;
      current.promise.then(()=>{if(wake===current)wake=undefined;check();},()=>{});
      return;
     }
     // Taken: from here the parts belong to the admitted composition.
     state.complete=true;finish(undefined,{assembled,held:rows.map(row=>row.lease!)});
    }
    signal.addEventListener('abort',stop,{once:true});
    if(signal.aborted){stop();return;}
    // Register before taking any part. A refused participant leaves no
    // reservation: a hint retries only that fixed fee, never a part read.
    void(async()=>{
     let retry=false;
     while(!done){
      let hint:CapacityWake|undefined,cancel:(()=>void)|undefined;
      try{
       if(retry){
        hint=metadataHintWake(resources.budget,signal);cancel=()=>hint?.cancel();waiting.add(cancel);
        if(!resources.budget.supportsMetadataHintRetry())throw new ResourceBudgetHintUnsupportedError();
       }
       const off=registerCompose(resources,state);
       if(retry&&!resources.budget.supportsMetadataHintRetry()){off();throw new ResourceBudgetHintUnsupportedError();}
       // The participant's pressure pass can synchronously abort or dispose
       // this request. Never install a listener for an obsolete generation.
       if(done||signal.aborted||closed||destroyed){off();if(!done)finish(signal.reason??aborted());return;}
       unregister=off;break;
      }catch(error){
       if(done)return;
       if(!(error instanceof ResourceBudgetExceededError)){finish(error);return;}
       if(retry&&!resources.budget.supportsMetadataHintRetry()){finish(new ResourceBudgetHintUnsupportedError());return;}
       const minimum=PRESSURE_AVAILABILITY_LIMITS.registryBytes+PRESSURE_AVAILABILITY_LIMITS.participantBytes;
       if(minimum>resources.budget.stats.limitBytes){unfit++;finish(unfitError(resources.budget,minimum,'frozen composition pressure participant does not fit the page'));return;}
       if(!retry){retry=true;capacityWaits++;continue;}
       try{await hint!.promise;}catch(cause){finish(cause);return;}
      }finally{
       if(cancel)waiting.delete(cancel);hint?.cancel();
      }
     }
     if(done)return;for(const row of rows)start(row);check();
    })();
   });
  }
  const result:FrozenDataClient={
   resources,
   async acquire<T>(ref:FrozenDataRef,signal:AbortSignal,keys?:readonly string[],role:ChunkResourceRole='source'):Promise<DataLease<T>>{
    signal.throwIfAborted();if(closed||destroyed)throw aborted();
    if(!shaPattern.test(ref.canonicalSHA256)||ref.codec!=='json'||typeof ref.file!=='string'||!ref.file||ref.file.length>256||ref.file.split('/').includes('..')||!Number.isSafeInteger(ref.occurrence)||ref.occurrence<0)throw Error('Invalid frozen data reference');
    const rawSHA=config.resolve(ref.canonicalSHA256,ref.file,ref.occurrence);
    if(ref.occurrence>=(allowed.get(rawSHA)?.get(ref.file)??0))throw Error('Frozen data initializer is outside provider allowlist');
    const descriptor=registry.get(rawSHA);if(!descriptor)throw Error('Unknown frozen data resource');
    const identity:FrozenDataIdentity=Object.freeze({...ref,city:config.city,profileSHA256:config.profileSHA256,resolvedRawSHA256:rawSHA}),partition=config.partition?.(ref.canonicalSHA256,ref.file,ref.occurrence);
    if(!partition)return acquireEntry<T>(identity,descriptor,signal,role);
    const wanted=keys===undefined?undefined:new Set(keys),parts=partition.parts.filter(part=>wanted===undefined||part.keys.some(key=>wanted.has(key)));
    const physicalParts=parts.map(part=>{const physical=registry.get(part.descriptor.sha256);if(!physical)throw Error('Unknown frozen data partition');return physical;});
    const count=parts.reduce((n,part)=>n+part.keys.length,0),metadataBytes=256+count*128,contentKey=JSON.stringify(['frozen-composition-v2',ownerKey,identity.city,identity.profileSHA256,identity.canonicalSHA256,identity.file,identity.occurrence,partition.kind,parts.map(part=>part.descriptor.sha256)]);
    const create=()=>resources.acquire<ValueCell>({contentKey,role,allowRecent:false,estimate:{category:'metadata',bytes:metadataBytes,precision:'estimate',label:'selected frozen row/envelope containers'},
      async produce(context){
       // Production owns its own dependencies. It must not capture a waiting
       // consumer's grants/selection array, which that consumer may cancel.
       const grants:ChunkResourceLease<ValueCell>[]=[],parents:DataLease<unknown>[]=[],ownedParts:{part:FrozenDataPart;lease:DataLease<unknown>}[]=[];
       const cancel=()=>{for(const grant of grants)grant.release();};context.signal.addEventListener('abort',cancel,{once:true});
       try{
        context.signal.throwIfAborted();
        for(const part of parts)grants.push(binding(identity,registry.get(part.descriptor.sha256)!,'dependency'));
        await Promise.all(grants.map(grant=>grant.ready));context.signal.throwIfAborted();
        for(let i=0;i<grants.length;i++){const descriptor=registry.get(parts[i].descriptor.sha256)!,parent=lease<unknown>(identity,grants[i],entries.get(bindingKey(identity,descriptor)),descriptor.bytes);parents.push(parent);const opaque=parent.retainResource('dependency');try{context.retainParent(opaque);}finally{opaque.release();}ownedParts.push({part:parts[i],lease:parent});}
        grants.length=0;const value=compose(partition,ownedParts);ownedParts.length=0;return{value,parents};
       }catch(error){for(const parent of parents)parent.release();for(const grant of grants)grant.release();throw error;}finally{context.signal.removeEventListener('abort',cancel);}
      },
      costs:cell=>({category:'metadata',bytes:metadataBytes,precision:'estimate',identity:cell}),
      dispose(cell){cell.value=undefined;for(const parent of cell.parents??[])parent.release();cell.parents=undefined;},
     });
    let composed:{assembled:ChunkResourceLease<ValueCell>|undefined;held:DataLease<unknown>[]}|undefined;
    try{
     composed=await composeParts(identity,physicalParts,signal,contentKey.slice(0,256),metadataBytes,create);
     signal.throwIfAborted();if(closed||destroyed)throw aborted();
     await wait(composed.assembled!,signal);const value=lease<T>(identity,composed.assembled!,undefined,parts.reduce((bytes,part)=>bytes+part.descriptor.bytes,0));composed.assembled=undefined;return value;
    }
    finally{composed?.assembled?.release();for(const item of composed?.held??[])item.release();}
   },
   dispose(){if(closed)return;closed=true;for(const cancel of [...waiting])cancel();waiting.clear();for(const [release,role]of [...owned])if(role()==='source'||role()==='cache')release();clients.delete(result);},
  };clients.add(result);return result;
 }
 return{client,resources,get stats(){let waiters=0,leases=0,valueCells=0,logicalBytesWithLiveLease=0;for(const record of entries.values()){waiters+=record.waiters;leases+=record.leases;if(record.ready){valueCells++;logicalBytesWithLiveLease+=record.logicalBytes;}}return{entries:entries.size,valueCells,waiters,leases,active,queued:queue.length,peakConcurrency,reads,parses,relayedReads,releasedValues,acquisitions,cumulativeLogicalJSONBytes,logicalBytesWithLiveLease,clients:clients.size,capacityWaits,waiterYields,unfit,deliveryRefusals,unadmittedDeliveries,composeReclaims,composeReclaimedBytes,cloneHoldMisses:cloneHoldMisses.get(resources)??0,measurement:'page-store-resource-cells-and-logical-json-input-not-retained-heap' as const};},destroy(){if(destroyed)return;destroyed=true;for(const item of [...clients])item.dispose();for(const task of [...queue])if(task.signal.aborted)task.cancel?.();pump();}};
}
export type FrozenDataLeaseStats=ReturnType<typeof createFrozenDataLeaseStore>['stats'];
