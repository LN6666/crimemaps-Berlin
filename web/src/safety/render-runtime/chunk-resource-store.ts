import {getPageResourceBudget,ResourceBudgetExceededError,ResourceAvailabilityStateError,AVAILABILITY_STATE_LIMITS,type AvailabilityJSON,type AvailabilityStoreState,type ResourceAvailabilityProviderLimits,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetOptions,type ResourceBudgetReservation,type RESOURCE_CONTRACT_VIOLATION} from './resource-budget';
import {scheduleRenderResourceWork,scheduleRenderResourceSteps,isProgramPreparationPending} from './program-preparation';
import {readRenderDiagnosticSnapshot} from './diagnostic-snapshot';
import type {ChunkCacheRetention,ChunkContentKey,ChunkGpuResourceRequest,ChunkGpuRetirement,ChunkProductionContext,ChunkPublication,ChunkReadyBorrowRole,ChunkResourceBorrow,ChunkResourceCosts,ChunkResourceLease,ChunkResourceRequest,ChunkResourceRole,ChunkResourceState,ChunkResourceStore,ChunkScene,ChunkSceneReadySnapshot,ChunkSceneRequest,ChunkSceneSnapshot} from './chunk-resource-types';
export type * from './chunk-resource-types';

type Lease=ChunkResourceBorrow<unknown>&{changed?:()=>void;detach?:()=>void};
type Entry={
 key:string;state:ChunkResourceState;value:unknown;hasValue:boolean;reservation:ResourceBudgetReservation;selfCosts:readonly ResourceBudgetCost[];
 context?:WebGL2RenderingContext;epoch?:number;controller:AbortController;
 leases:Set<Lease>;parents:ChunkResourceLease<unknown>[];allowRecent:boolean;cacheIdleMs:number;retentionTier?:ChunkCacheRetention;cacheExpired?:boolean;
 idleOverride?:{allowRecent:boolean;cacheIdleMs:number};
 settled:boolean;finalized:boolean;started?:boolean;resolve:()=>void;reject:(error:unknown)=>void;ready:Promise<void>;
 dispose?: (value:unknown)=>void;costs?: (value:unknown)=>ChunkResourceCosts;
 fence?:WebGLSync;retirementError?:string;retirementStarted?:boolean;failure?:unknown;recentSince?:number;
 /** Retirement whose GPU completion can no longer be observed (no fence or a
  * failed query): released after the bounded fallback, never kept forever. */
 unobservedSince?:number;followUps?:number;
 /** The frame in which this entry last woke waiters as reclaimable. */
 reclaimWakeFrame?:number;
};
type ContextState={epoch:number;lost:boolean};
export type ChunkResourceStoreOptions=ResourceBudgetOptions&{cacheIdleTiersMs?:Readonly<Record<ChunkCacheRetention,number>>;budget?:ResourceBudget;recentMaxEntries?:number;recentMaxIdleMs?:number;
 /** Follow-up frames requested per retiring GPU entry while its fence is
  * pending. A frame is one synchronous task that publicly collects, however
  * many renderers collect inside it. */
 retirementFollowUpFrames?:number;
 /** Logical release of a retirement whose completion cannot be observed. */
 retirementFallbackMs?:number};
export const CHUNK_CACHE_IDLE_MS=Object.freeze({refetch:10_000,redecode:13_000,reupload:17_000,rebuild:20_000});
const pageStores=new WeakMap<object,ChunkResourceStore>();
// A locator only. Allocation and lifetime remain owned by the page store.
const contextStores=new WeakMap<WebGL2RenderingContext,ChunkResourceStore>();
const contextIncarnations=new WeakMap<WebGL2RenderingContext,ContextState>();
const orphanedRetirements=new Set<{budget:ResourceBudget;collect:()=>boolean;followUp:(count:boolean)=>boolean}>();
export class ChunkResourceContextLostError extends Error{
 readonly code='CHUNK_CONTEXT_LOST';
 readonly retryable=true;
 constructor(message='Shared CPU work was not run before its GPU admission context was lost'){
  super(message.slice(0,1024));this.name='ChunkResourceContextLostError';
 }
}
const aborted=()=>new DOMException('Chunk resource demand superseded','AbortError');
// The ledger's stable contract code, kept as a local literal so a harness that
// substitutes the ledger module cannot change this store's error type/message.
const CONTRACT_CODE:typeof RESOURCE_CONTRACT_VIOLATION='RESOURCE_CONTRACT_VIOLATION';
function contractViolation(error:TypeError):TypeError{Object.defineProperty(error,'code',{value:CONTRACT_CODE,enumerable:true,configurable:true,writable:false});return error;}
/** acquireCacheIfFits: the store's private implementation per created store. */
const cacheIfFitsImplementations=new WeakMap<ChunkResourceStore,<T>(request:ChunkResourceRequest<T>)=>ChunkResourceLease<T>|undefined>();
/** Internal refusal of a cache-if-fits request; never leaves this module. */
class CacheDoesNotFit extends Error{}
const usable=(entry:Entry)=>!entry.finalized&&(entry.state==='ready'||entry.state==='recent');
const leasable=(entry:Entry)=>!entry.finalized&&!['retiring','failed','lost','released'].includes(entry.state);
const cacheRole=(role:ChunkResourceRole)=>role==='cache'||role==='recent';
function allocationCosts(input:ChunkResourceCosts):readonly ResourceBudgetCost[]{
 const values:readonly ResourceBudgetCost[]=Array.isArray(input)?input:[input as ResourceBudgetCost];
 return values.map(value=>({...value,identity:value.identity??{},...(value.label?{label:value.label.slice(0,256)}:{})}));
}
function allocationBytes(costs:readonly ResourceBudgetCost[]){
 const values=new Map<object|string,number>();for(const cost of costs)values.set(cost.identity!,Math.max(cost.bytes,values.get(cost.identity!)??0));
 return[...values.values()].reduce((a,b)=>a+b,0);
}
function boundedFailure(error:unknown){
 if(error instanceof ChunkResourceContextLostError)return new ChunkResourceContextLostError(error.message);
 if(isProgramPreparationPending(error)&&error.status==='lost')return new ChunkResourceContextLostError();
 if(error instanceof ResourceBudgetExceededError)return new ResourceBudgetExceededError(error.details);
 if(error instanceof DOMException)return new DOMException(error.message.slice(0,1024),error.name);
 const result=new Error((error instanceof Error?error.message:String(error)).slice(0,1024));
 if(error instanceof Error)result.name=error.name.slice(0,128);
 // A contract violation stays recognisable after crossing the store, so a
 // consumer never retries it as a transient failure. Only this code is kept.
 if(error instanceof Error&&(error as {code?:unknown}).code===CONTRACT_CODE)Object.defineProperty(result,'code',{value:CONTRACT_CODE,enumerable:true,configurable:true,writable:false});
 return result;
}

/** No independent producer queue or polling timer. A single recent-cache deadline
 * collects expired idle payloads without waiting for another painted frame. Call this store from the
 * existing ingress/preparation work and collectRetired from its frame boundary.
 * While a GPU retirement waits for its fence, onRetirementPending requesters
 * get a bounded number of follow-up frame requests, so a still map collects.
 * A frame is one synchronous task: its first public collectRetired opens it
 * and a microtask after that task closes it, so the map and the renderers that
 * all collect inside one MapLibre frame spend a single frame. */
export function createChunkResourceStore(options:ChunkResourceStoreOptions={}):ChunkResourceStore{
 const cacheIdleTiersMs=Object.freeze({...CHUNK_CACHE_IDLE_MS,...options.cacheIdleTiersMs});
 for(const value of Object.values(cacheIdleTiersMs))if(!Number.isFinite(value)||value<0||value>20_000)throw new RangeError('Invalid chunk cache idle tier');
 const budget=options.budget??getPageResourceBudget(options);
 const cpu=new Map<ChunkContentKey,Entry>(),gpu=new WeakMap<WebGL2RenderingContext,Map<number,Map<ChunkContentKey,Entry>>>();
 const entries=new Set<Entry>(),recent=new Set<Entry>(),retiring=new Set<Entry>();
 const scenes=new Set<ChunkScene<unknown>>(),leaseEntries=new WeakMap<object,Entry>();
 let destroyed=false,collecting=false,evicting=false,productions=0,gpuAllocations=0,hits=0,callbackErrors=0,retirementErrors=0,retirementFrameRequests=0,fallbackReleases=0,reclaimableWakes=0,lastRetirementError:string|undefined;
 let frameGeneration=0,frameOpen=false,reclaimDeferred=false,deferredReclaimWakes=0,cacheIfFitsSkips=0;
 let orphan:{budget:ResourceBudget;collect:()=>boolean;followUp:(count:boolean)=>boolean}|undefined;
 const recentMaxEntries=options.recentMaxEntries??(budget.stats.profile==='mobile'?64:128),recentMaxIdleMs=Math.min(options.recentMaxIdleMs??20_000,20_000);
 if(options.recentMaxIdleMs!==undefined&&!Number.isFinite(options.recentMaxIdleMs))throw new RangeError('Invalid recent resource lifecycle limits');
 if(!Number.isSafeInteger(recentMaxEntries)||recentMaxEntries<0||!Number.isFinite(recentMaxIdleMs)||recentMaxIdleMs<0)throw new RangeError('Invalid recent resource lifecycle limits');
 // About four seconds of 60 Hz frames per entry (frames, not collect calls);
 // a fence-less retirement is a few frames' logical grace. Neither is a timer:
 // both are checked in collect.
 const retirementFollowUpFrames=options.retirementFollowUpFrames??240,retirementFallbackMs=options.retirementFallbackMs??100;
 if(!Number.isSafeInteger(retirementFollowUpFrames)||retirementFollowUpFrames<0||!Number.isFinite(retirementFallbackMs)||retirementFallbackMs<0)throw new RangeError('Invalid retirement follow-up limits');
 const retirementFrameRequesters=new Set<{request:(()=>void)|undefined}>();
 let idleExpiryCount=0;
 const idleExpiryReceipts:{key:string;idleSince:number;deadline:number;collectedAt:number;idleLimitMs:number;stateAfter:ChunkResourceState;functionalLeasesAfter:number}[]=[];
 let recentExpiryTimer:ReturnType<typeof setTimeout>|undefined,recentExpiryAt=Infinity,recentExpiryWakePending=false;
 function cacheIdleMs(tier:ChunkCacheRetention|undefined,gpu=false){
  const value=cacheIdleTiersMs[tier??(gpu?'reupload':'rebuild')];
  if(!Number.isFinite(value))throw contractViolation(new TypeError('Invalid chunk cache retention tier'));
  return Math.min(recentMaxIdleMs,value);
 }
 function restoreIdlePolicy(entry:Entry){
  const original=entry.idleOverride;if(!original)return;
  entry.allowRecent=original.allowRecent;entry.cacheIdleMs=original.cacheIdleMs;entry.idleOverride=undefined;
 }
 function applyRequestRetention(entry:Entry,request:{allowRecent?:boolean;cacheRetention?:ChunkCacheRetention}){
  // Explicit requests still constrain the underlying ordinary policy even while
  // a temporary focus grace is active. A failed cache-if-fits never gets here.
  const original=entry.idleOverride??entry;
  original.allowRecent||=request.allowRecent===true;
  entry.allowRecent||=request.allowRecent===true;
  if(request.cacheRetention){
   const limit=cacheIdleMs(request.cacheRetention,!!entry.context);
   if(limit<=original.cacheIdleMs)entry.retentionTier=request.cacheRetention;
   original.cacheIdleMs=Math.min(original.cacheIdleMs,limit);
   entry.cacheIdleMs=Math.min(entry.cacheIdleMs,limit);
  }
 }
 function updateRecentExpiry(){
  if(collecting||evicting)return;
  let deadline=Infinity;
  for(const entry of recent)deadline=Math.min(deadline,(entry.recentSince??performance.now())+entry.cacheIdleMs);
  if(destroyed||!Number.isFinite(deadline)){
   if(recentExpiryTimer!==undefined)clearTimeout(recentExpiryTimer);
   recentExpiryTimer=undefined;recentExpiryAt=Infinity;recentExpiryWakePending=false;return;
  }
  if(recentExpiryWakePending)return;
  if(recentExpiryTimer!==undefined&&recentExpiryAt===deadline)return;
  if(recentExpiryTimer!==undefined)clearTimeout(recentExpiryTimer);
  recentExpiryAt=deadline;
  recentExpiryTimer=setTimeout(()=>{
   recentExpiryTimer=undefined;recentExpiryAt=Infinity;
   if(destroyed||!recent.size)return;
   // Idle disposal cannot wait for another painted frame. Use the same collector;
   // GPU completion remains nonblocking and keeps its charge until its fence passes.
   if(performance.now()<deadline){updateRecentExpiry();return;}
   collect(false);
  },Math.min(2_147_483_647,Math.max(1,Math.ceil(deadline-performance.now()))));
 }
 // The provider records exact stable content identities/roles, not an event
 // count or a hash. In particular main+cache and cache-only differ even when
 // their charged byte totals are identical. Parent lease edges are explicit.
 function availabilityState(remaining:ResourceAvailabilityProviderLimits):AvailabilityStoreState{
  const L=AVAILABILITY_STATE_LIMITS;
  if(entries.size>remaining.storeEntries)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Store availability entry bound exceeded');
  // Check the shared page remainder BEFORE copying/sorting entry references or
  // creating any role, parent or key tuple arrays for this provider.
  let keyChars=0,leases=0;
  for(const entry of entries){
   if(entry.key.length>L.chars||entry.key.length>remaining.storeKeyChars-keyChars)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Store content identity scan bound exceeded');keyChars+=entry.key.length;
   const size=entry.leases.size+entry.parents.length;if(size>remaining.storeLeaseEdges-leases)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Store lease/parent bound exceeded');leases+=size;
  }
  const stateCodes:readonly ChunkResourceState[]=['preparing','ready','recent','retiring','failed','lost','released'];
  const roleCodes:readonly ChunkResourceRole[]=['source','main','solar','reflection','picking','selected','candidate','dependency','cache','recent'];
  const roleCode=(role:ChunkResourceRole)=>{const code=roleCodes.indexOf(role);if(code<0)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Unknown store role');return code;};
  // Store one complete content identity per entry; rows and parent edges refer
  // to sorted indices. Full identities are retained, never hashed or truncated.
  const ordered=[...entries].sort((a,b)=>{
   const ak=a.context?'gpu':'cpu',bk=b.context?'gpu':'cpu';if(ak!==bk)return ak<bk?-1:1;
   const ae=a.epoch??-1,be=b.epoch??-1;if(ae!==be)return ae-be;return a.key<b.key?-1:a.key>b.key?1:0;
  });
  const keyByEntry=new Map<Entry,number>(),keys:[string,number|null,string][]=[],rows:AvailabilityJSON[]=[];
  for(const entry of ordered){
   const key:[string,number|null,string]=[entry.context?'gpu':'cpu',entry.epoch??null,entry.key],previous=keys[keys.length-1];
   if(previous&&previous[0]===key[0]&&previous[1]===key[1]&&previous[2]===key[2])throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Duplicate live store content identity');
   keyByEntry.set(entry,keys.length);keys.push(key);
  }
  for(const entry of ordered){
   const roles=[...entry.leases].map(lease=>roleCode(lease.role)).sort((a,b)=>a-b),parents:[number,number][]=[];
   for(const parent of entry.parents){
    const owner=leaseEntries.get(parent),key=owner&&keyByEntry.get(owner);if(key===undefined)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Parent owner unavailable');
    parents.push([key,roleCode(parent.role)]);
   }
   parents.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const key=keyByEntry.get(entry);if(key===undefined)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Store owner unavailable');
   const state=stateCodes.indexOf(entry.state);if(state<0)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Unknown store state');
   const flags=Number(entry.settled)|Number(entry.started??false)<<1|Number(entry.allowRecent)<<2|Number(!!entry.cacheExpired)<<3|Number(recent.has(entry))<<4;
   rows.push([key,state,flags,entry.reservation.bytes,roles,parents]);
  }
  return ['store-v2',keys,rows];
 }
 const unregisterAvailabilityState=budget.registerAvailabilityStateProvider(availabilityState);
 const live=()=>{if(destroyed)throw new Error('Chunk resource store destroyed');};
 const validKey=(key:string)=>{if(typeof key!=='string'||key.length===0)throw new Error('Chunk content identity is required');};
 function stateFor(gl:WebGL2RenderingContext){
  let state=contextIncarnations.get(gl);if(!state){state={epoch:0,lost:false};contextIncarnations.set(gl,state);}return state;
 }
 function gpuRows(gl:WebGL2RenderingContext,epoch:number){
  let epochs=gpu.get(gl);if(!epochs){epochs=new Map();gpu.set(gl,epochs);}
  let rows=epochs.get(epoch);if(!rows){rows=new Map();epochs.set(epoch,rows);}return rows;
 }
 function removeIndex(entry:Entry){
  const rows=entry.context?gpu.get(entry.context)?.get(entry.epoch!):cpu;
  if(rows?.get(entry.key)===entry)rows.delete(entry.key);
  if(entry.context&&rows?.size===0)gpu.get(entry.context)?.delete(entry.epoch!);
  recent.delete(entry);updateRecentExpiry();
 }
 function changed(entry:Entry){
  budget.notifyAvailabilityStateChange();
  for(const lease of [...entry.leases])try{lease.changed?.();}catch{callbackErrors++;}
 }
 function cacheEnvelope(entry:Entry,seen=new Set<Entry>()):readonly ResourceBudgetCost[]{
  if(seen.has(entry))return[];seen.add(entry);
  const costs=[...entry.selfCosts];
  for(const lease of entry.parents){const parent=leaseEntries.get(lease);if(parent)costs.push(...cacheEnvelope(parent,seen));}
  return costs;
 }
 const hasCacheRole=(entry:Entry)=>[...entry.leases].some(lease=>cacheRole(lease.role));
 function setCacheCharge(entry:Entry,cached:boolean,evict=true){
  const quiet=evict?undefined:{evict:false};
  if(!entry.reservation.adjust(cached?cacheEnvelope(entry):entry.selfCosts,quiet))return false;
  if(entry.reservation.setRecent(cached,quiet))return true;
  entry.reservation.adjust(entry.selfCosts);return false;
 }
 function adjustOwned(entry:Entry,cost:ChunkResourceCosts){
  const costs=allocationCosts(cost),previous=entry.selfCosts;entry.selfCosts=costs;
  if(!entry.reservation.adjust(entry.reservation.recent?cacheEnvelope(entry):costs)){entry.selfCosts=previous;return false;}
  return true;
 }
 function settle(entry:Entry,error?:unknown){
  if(entry.settled)return;entry.settled=true;
  if(error!==undefined)entry.reject(error);else entry.resolve();
 }
 function finish(entry:Entry,state:ChunkResourceState,lost=false){
  if(entry.finalized)return;
  entry.finalized=true;entry.state=state;removeIndex(entry);retiring.delete(entry);entries.delete(entry);
  const gl=entry.context;
  if(entry.fence&&!lost&&gl&&!gl.isContextLost())try{gl.deleteSync(entry.fence);}catch{retirementErrors++;}
  entry.fence=undefined;entry.value=undefined;entry.hasValue=false;entry.dispose=undefined;entry.costs=undefined;entry.selfCosts=[];
  entry.reservation.release();
  const parents=entry.parents;entry.parents=[];
  for(const parent of parents){
   const ancestor=leaseEntries.get(parent),wasEvicting=evicting;
   // An evicted child must not restart another idle period on its ancestry,
   // including after an asynchronous GPU fence. Other live consumers survive.
   if(entry.cacheExpired){evicting=true;if(ancestor)ancestor.cacheExpired=true;}
   try{parent.release();if(entry.cacheExpired&&ancestor&&!ancestor.finalized&&[...ancestor.leases].every(lease=>cacheRole(lease.role)))evictEntry(ancestor,true);}
   finally{evicting=wasEvicting;}
  }
  changed(entry);
  for(const lease of entry.leases)lease.detach?.();
  entry.leases.clear();
 }
 function registerOrphan(){
  if(!destroyed||orphan||!retiring.size)return;
  const work={budget,collect(){collect(false);const done=retiring.size===0;if(done)orphan=undefined;return done;},followUp:(count:boolean)=>followUpWanted(count)};
  orphan=work;orphanedRetirements.add(work);
 }
 function retireComplete(entry:Entry){
  if(entry.finalized||!entry.settled||entry.retirementStarted)return;
  entry.retirementStarted=true;
  const value=entry.value,dispose=entry.hasValue?entry.dispose:undefined;
  entry.value=undefined;entry.hasValue=false;entry.dispose=undefined;entry.costs=undefined;
  if(!entry.context){
   try{if(dispose)dispose(value);}catch{callbackErrors++;}finally{finish(entry,'released');}
   return;
  }
  const gl=entry.context;
  if(gl.isContextLost()||entry.epoch!==stateFor(gl).epoch){finish(entry,'lost',true);return;}
  // Delete is a request, not proof that submitted work or driver pages ended.
  // Keep the complete charge and parent leases until a nonblocking fence passes.
  // A throwing delete is recorded; the fence still observes prior GPU work.
  try{if(dispose)dispose(value);}catch(error){retirementFailure(entry,'GPU dispose failed: '+String(error));}
  try{entry.fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0)??undefined;if(entry.fence)gl.flush();}catch(error){entry.fence=undefined;retirementFailure(entry,String(error));}
  if(!entry.fence)unobservedRetirement(entry,'GPU completion fence unavailable');
  requestRetirementFrame(false);
 }
 function retirementFailure(entry:Entry,reason:string){entry.retirementError??=reason.slice(0,512);lastRetirementError=reason.slice(0,512);retirementErrors++;}
 /** Completion cannot be observed: release after the logical fallback grace
  * at a later collect instead of charging the claim forever. */
 function unobservedRetirement(entry:Entry,reason:string){retirementFailure(entry,reason);entry.unobservedSince??=performance.now();}
 /** Pending retirements that may still ask for a frame; count spends one. */
 function followUpWanted(count:boolean){
  let wanted=false;
  for(const entry of retiring){
   if(entry.finalized||!entry.context||!entry.settled||!entry.retirementStarted)continue;
   const used=entry.followUps??0;if(used>=retirementFollowUpFrames)continue;
   if(count)entry.followUps=used+1;wanted=true;
  }
  return wanted;
 }
 /** One request to every requester: each should schedule one frame whose
  * boundary calls collectRetired. */
 function requestFrames(){
  if(destroyed||!retirementFrameRequesters.size)return;
  retirementFrameRequests++;
  for(const row of [...retirementFrameRequesters]){const request=row.request;if(!request)continue;try{request();}catch{callbackErrors++;}}
 }
 /** At most one request per call, only while some retirement has follow-up
  * frames left. The frame that a public collect opens spends one frame of
  * each entry; further collects in that frame spend and request nothing. */
 function requestRetirementFrame(count:boolean){
  if(destroyed||!retirementFrameRequesters.size)return;
  let wanted=followUpWanted(count);
  for(const work of orphanedRetirements)if(work.budget===budget&&work.followUp(count))wanted=true;
  if(wanted)requestFrames();
 }
 const closeFrame=()=>{frameOpen=false;};
 /** The first public collect of a synchronous task opens one frame; the
  * microtask after that task closes it. Nothing is scheduled otherwise. */
 function openFrame(){
  if(frameOpen)return false;
  frameOpen=true;frameGeneration++;queueMicrotask(closeFrame);return true;
 }
 /** A released lease made charged bytes evictable. Each entry wakes waiters
  * at most once per frame, so a waiter whose own retry re-leases and releases
  * it cannot loop faster than frames do. A further transition in that frame is
  * deferred, never dropped: one wave goes out at the next frame-boundary
  * collect, and that frame is requested from the frame requesters. */
 function reclaimable(entry:Entry){
  if(destroyed||!budget.notifyReclaimable)return;
  if(entry.reclaimWakeFrame===frameGeneration){deferReclaimWake();return;}
  if(budget.notifyReclaimable()){entry.reclaimWakeFrame=frameGeneration;reclaimableWakes++;}
 }
 function deferReclaimWake(){
  if(reclaimDeferred)return;reclaimDeferred=true;deferredReclaimWakes++;requestFrames();
 }
 function deliverDeferredReclaimWake(){
  if(!reclaimDeferred)return;reclaimDeferred=false;
  if(!destroyed&&budget.notifyReclaimable?.())reclaimableWakes++;
 }
 function retire(entry:Entry){
  if(entry.finalized||entry.state==='retiring')return;
  removeIndex(entry);entry.state='retiring';entry.reservation.markRetiring();retiring.add(entry);
  entry.controller.abort();
  if(entry.settled)retireComplete(entry);
  registerOrphan();
 }
 function idle(entry:Entry){
  if(entry.finalized||entry.leases.size)return;
  if(usable(entry)&&entry.allowRecent&&!entry.cacheExpired&&!destroyed&&!evicting&&recentMaxEntries>0&&recentMaxIdleMs>0){
   while(recent.size>=recentMaxEntries&&!recent.has(entry)){const oldest=recent.values().next().value as Entry|undefined;if(!oldest)break;evictEntry(oldest);}
   // The same identities charge retained CPU/source ancestors to the recent
   // subset without adding their bytes a second time to the page total.
   if(setCacheCharge(entry,true)){entry.state='recent';entry.recentSince=performance.now();recent.add(entry);updateRecentExpiry();reclaimable(entry);return;}
  }
  retire(entry);
 }
 function admitRole(entry:Entry,role:ChunkResourceRole,signal?:AbortSignal,ifFits=false){
  if(!leasable(entry))throw new Error('Chunk resource is not leasable: '+entry.key);
  if(signal?.aborted)throw aborted();
  const incomingCache=cacheRole(role),wasIdle=entry.state==='recent';
  if(!incomingCache)restoreIdlePolicy(entry);
  if(incomingCache&&ifFits&&(evicting||recentMaxEntries===0||recentMaxIdleMs===0))throw new CacheDoesNotFit();
  if(incomingCache&&(evicting||recentMaxEntries===0||recentMaxIdleMs===0))throw new Error('Recent resource retention is unavailable');
  // Cache only if it fits: the entry-count bound and the cache charge are judged
  // and applied in this one synchronous step, quietly (no onPressure listener,
  // no eviction of another entry). A refusal leaves the entry exactly as it was.
  if(incomingCache&&ifFits&&!entry.reservation.recent){
   if(recent.size>=recentMaxEntries&&!recent.has(entry))throw new CacheDoesNotFit();
   if(!setCacheCharge(entry,true,false))throw new CacheDoesNotFit();
  }
  if(wasIdle){recent.delete(entry);entry.recentSince=undefined;entry.state='ready';}
  if(!incomingCache)entry.cacheExpired=false;
  if(incomingCache){
   while(recent.size>=recentMaxEntries&&!recent.has(entry)){const oldest=recent.values().next().value as Entry|undefined;if(!oldest)break;evictEntry(oldest);}
   if(!setCacheCharge(entry,true)){
    const pressure=budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);
    throw new Error('Recent resource capacity is unavailable');
   }
   // A cache hit is a use: it refreshes the idle clock and least-recent order.
   recent.delete(entry);entry.recentSince=performance.now();recent.add(entry);
  }else if(wasIdle&&!hasCacheRole(entry)){setCacheCharge(entry,false);}
  else if(recent.has(entry)){recent.delete(entry);entry.recentSince=performance.now();recent.add(entry);}
  updateRecentExpiry();
  if(!leasable(entry)||entry.controller.signal.aborted)throw aborted();
 }
 function releaseRole(entry:Entry,reference:Lease){
  entry.leases.delete(reference);
  if(entry.leases.size){
   if(!hasCacheRole(entry)){
    recent.delete(entry);entry.recentSince=undefined;
    // Functional borrows do not change costs; only leaving an actual cache
    // charge needs the same readmission used by asynchronous leases.
    if(entry.reservation.recent)setCacheCharge(entry,false);
   }else if([...entry.leases].every(held=>cacheRole(held.role)))reclaimable(entry);
  }else idle(entry);
  updateRecentExpiry();budget.notifyAvailabilityStateChange();
 }
 function makeReadyBorrow<T>(entry:Entry,role:ChunkReadyBorrowRole):ChunkResourceBorrow<T>{
  if(role!=='main'&&role!=='solar'&&role!=='reflection'&&role!=='picking'&&role!=='selected'&&role!=='dependency')throw contractViolation(new TypeError('Ready resource borrow requires a draw or dependency role'));
  if(!usable(entry))throw new Error('Chunk resource is not ready for a synchronous borrow');
  admitRole(entry,role);
  let released=false;
  const borrow:ChunkResourceBorrow<T>={
   get contentKey(){return entry.key;},role,
   get state(){return released?'released':entry.state;},
   get value(){return released||!usable(entry)?undefined:entry.value as T;},
   get released(){return released;},
   get context(){return entry.context;},get epoch(){return entry.epoch;},
   release(){if(released)return;released=true;releaseRole(entry,borrow);},
  };
  entry.leases.add(borrow);budget.notifyAvailabilityStateChange();return borrow;
 }
 function makeLease<T>(entry:Entry,role:ChunkResourceRole,onChange?:()=>void,signal?:AbortSignal,ifFits=false):ChunkResourceLease<T>{
  admitRole(entry,role,signal,ifFits);
  let released=false;
  let readySettled=false,resolveReady!:()=>void,rejectReady!:(error:unknown)=>void;
  const ready=new Promise<void>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  void ready.catch(()=>{});
  const resolveLocal=()=>{if(readySettled)return;readySettled=true;resolveReady();};
  const rejectLocal=(error:unknown)=>{if(readySettled)return;readySettled=true;rejectReady(error);};
  // A consumer can stop awaiting immediately while another consumer keeps the
  // shared producer alive. Completion signals never contain the payload.
  void entry.ready.then(resolveLocal,rejectLocal);
  const detach=()=>{
   const previousSignal=signal;signal=undefined;
   previousSignal?.removeEventListener('abort',release);
   (lease as Lease).changed=undefined;onChange=undefined;
  };
  const release=()=>{
   if(released)return;released=true;
   if(!readySettled)rejectLocal(aborted());
   detach();releaseRole(entry,lease as Lease);
  };
  const lease:ChunkResourceLease<T>={
   get contentKey(){return entry.key;},role,
   get state(){return released?'released':entry.state;},
   get value(){return released||!usable(entry)?undefined:entry.value as T;},
   ready,
   get released(){return released;},
   get context(){return entry.context;},get epoch(){return entry.epoch;},
   retain(nextRole){if(released)throw new Error('Released chunk lease cannot be retained');return makeLease<T>(entry,nextRole);},
   borrowReady(nextRole){if(released)throw new Error('Released chunk lease cannot be borrowed');return makeReadyBorrow<T>(entry,nextRole);},
   release,
  };
  (lease as Lease).changed=onChange;(lease as Lease).detach=detach;entry.leases.add(lease as Lease);leaseEntries.set(lease,entry);budget.notifyAvailabilityStateChange();
  signal?.addEventListener('abort',release,{once:true});
  return lease;
 }
 /** cacheAdmission: a cache-if-fits miss reserves its whole cache envelope as
  * recent, quietly, in this one reservation (selfCosts stay the entry's own). */
 function createEntry(key:string,estimate:ChunkResourceCosts,allowRecent:boolean,context?:WebGL2RenderingContext,epoch?:number,evict=true,cacheAdmission?:{selfCosts:readonly ResourceBudgetCost[];envelope:readonly ResourceBudgetCost[]},retention?:ChunkCacheRetention){
  // Reserve before a producer, decoded expansion or bufferData can run.
  const idleMs=cacheIdleMs(retention,!!context);
  const selfCosts=cacheAdmission?.selfCosts??allocationCosts(estimate);
  const reservation=cacheAdmission?budget.reserve(cacheAdmission.envelope,{label:key,recent:true,evict:false}):budget.reserve(selfCosts,evict?{label:key}:{label:key,evict:false});
  if(destroyed){reservation.release();throw new Error('Chunk resource store destroyed during admission');}
  let resolve!:()=>void,reject!:(error:unknown)=>void;
  const ready=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
  // Polling owners may consume state rather than await; retain the original
  // rejecting signal without producing an unhandled rejection or payload promise.
  void ready.catch(()=>{});
  const entry:Entry={key,state:'preparing',value:undefined,hasValue:false,reservation,selfCosts,context,epoch,controller:new AbortController(),leases:new Set(),parents:[],allowRecent,cacheIdleMs:idleMs,retentionTier:retention??(context?'reupload':'rebuild'),settled:false,finalized:false,resolve,reject,ready};
  entries.add(entry);return entry;
 }
 function production(entry:Entry):ChunkProductionContext{
  return{
   signal:entry.controller.signal,budget,
   adjust(cost){return !entry.finalized&&adjustOwned(entry,cost);},
   retainParent(parent){retainCpuParent(entry,parent);},
   schedule(context,work,options={}){
    if(entry.finalized||entry.controller.signal.aborted)return Promise.reject(aborted());
    return scheduleRenderResourceWork(context,{...options,resource:entry.key,signal:entry.controller.signal,work});
   },
   scheduleSteps(context,step,options={}){
    if(entry.finalized||entry.controller.signal.aborted)return Promise.reject(aborted());
    return scheduleRenderResourceSteps(context,{...options,resource:entry.key,signal:entry.controller.signal,step});
   },
  };
 }
 function retainCpuParent(entry:Entry,parent:ChunkResourceLease<unknown>){
  if(entry.finalized||entry.controller.signal.aborted)throw aborted();
  const parentEntry=leaseEntries.get(parent);
  if(!parentEntry||parent.released||parent.state!=='ready'||parent.context!==undefined)throw new Error('CPU chunk requires ready CPU/source parents from the same page');
  if(entry.parents.some(held=>leaseEntries.get(held)===parentEntry))return;
  const held=parent.retain('dependency');entry.parents.push(held);
  try{
   if(entry.reservation.recent&&!setCacheCharge(entry,true)){
    const pressure=budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);
    throw new Error('CPU chunk dependency cache capacity is unavailable');
   }
   if(entry.finalized||entry.controller.signal.aborted)throw aborted();
  }catch(error){const at=entry.parents.indexOf(held);if(at>=0)entry.parents.splice(at,1);held.release();throw error;}
 }
 function fail(entry:Entry,error:unknown){
  if(entry.finalized||entry.state==='failed')return;
  entry.failure=boundedFailure(error);
  settle(entry,entry.failure);
  if(entry.state==='retiring'){retireComplete(entry);return;}
  entry.state='failed';changed(entry);
  if(entry.context){if(!entry.started&&!entry.hasValue)finish(entry,'failed');else if(entry.leases.size===0)retire(entry);}
  else finish(entry,entry.failure instanceof ChunkResourceContextLostError?'lost':'failed');
 }
 function complete(entry:Entry,value:unknown){
  if(entry.finalized){
   // Context loss may occur inside a producer. Never delete on the lost epoch.
   if(!entry.context)entry.dispose?.(value);
   return;
  }
  entry.value=value;entry.hasValue=true;
  if(entry.state==='retiring'||entry.controller.signal.aborted||entry.leases.size===0){
   settle(entry,aborted());
   retire(entry);retireComplete(entry);
   return;
  }
  try{
   if(entry.costs){
    const costs=allocationCosts(entry.costs(value));
    if(allocationBytes(costs)>allocationBytes(entry.selfCosts)||!adjustOwned(entry,costs))throw new Error('Chunk actual logical cost exceeds reserved capacity: '+entry.key);
   }
   entry.costs=undefined;
   // A down-adjustment can wake a caller that cancels its demand synchronously.
   // Recheck after that callback before turning the completed value into ready.
   if(entry.finalized)return;
   if(entry.controller.signal.aborted||entry.leases.size===0){
    settle(entry,aborted());
    retire(entry);retireComplete(entry);
    return;
   }
   if(entry.context&&(entry.context.isContextLost()||entry.epoch!==stateFor(entry.context).epoch))throw new Error('Chunk GPU incarnation changed before readiness');
   entry.state='ready';settle(entry);changed(entry);
  }catch(error){
   if(!entry.context){try{entry.dispose?.(value);}catch{callbackErrors++;}finally{entry.value=undefined;entry.hasValue=false;}}
   fail(entry,error);
  }
 }
 /** A cache-if-fits miss is judged before anything is built: the parents are
  * checked (no lease taken), then the recent entry-count bound, then one quiet
  * recent reservation of the whole cache envelope (own estimate plus each
  * retained CPU/source ancestor's envelope; shared identities are counted once
  * in the page total). A refusal creates, charges, releases and wakes nothing.
  * The judged ancestry is then held before the lease's cache charge, which
  * recomputes the identical envelope and so changes nothing. */
 function createCacheIfFitsEntry(request:ChunkResourceRequest<unknown>):Entry{
  const parents:{entry:Entry;lease:ChunkResourceLease<unknown>}[]=[];
  for(const parent of new Set(request.parents??[])){
   const parentEntry=leaseEntries.get(parent);
   if(!parentEntry||parent.released||parent.state!=='ready'||parent.context!==undefined)throw new Error('CPU chunk requires ready CPU/source parents from the same page');
   if(!parents.some(row=>row.entry===parentEntry))parents.push({entry:parentEntry,lease:parent});
  }
  if(evicting||recentMaxEntries===0||recentMaxIdleMs===0||recent.size>=recentMaxEntries)throw new CacheDoesNotFit();
  const selfCosts=allocationCosts(request.estimate),envelope=[...selfCosts],seen=new Set<Entry>();
  for(const row of parents)envelope.push(...cacheEnvelope(row.entry,seen));
  let entry:Entry;
  try{entry=createEntry(request.contentKey,request.estimate,request.allowRecent===true,undefined,undefined,false,{selfCosts,envelope},request.cacheRetention);}
  catch(error){if(error instanceof ResourceBudgetExceededError)throw new CacheDoesNotFit();throw error;}
  try{for(const row of parents)entry.parents.push(row.lease.retain('dependency'));}
  catch(error){finish(entry,'released');throw error;}
  return entry;
 }
 function acquire<T>(request:ChunkResourceRequest<T>,ifFits=false):ChunkResourceLease<T>{
  live();validKey(request.contentKey);cacheIdleMs(request.cacheRetention);if(request.signal?.aborted)throw aborted();collect(false);
  const existing=cpu.get(request.contentKey);
  if(existing&&!existing.finalized&&existing.state!=='retiring'&&existing.state!=='failed'){
   if(!ifFits){hits++;applyRequestRetention(existing,request);return makeLease<T>(existing,request.role,request.onChange,request.signal);}
   // A refused cache-if-fits leaves the entry unchanged, so count the hit after.
   const lease=makeLease<T>(existing,request.role,request.onChange,request.signal,true);
   hits++;applyRequestRetention(existing,request);return lease;
  }
  let entry:Entry;
  if(!ifFits)entry=createEntry(request.contentKey,request.estimate,request.allowRecent===true,undefined,undefined,true,undefined,request.cacheRetention);
  else entry=createCacheIfFitsEntry(request);
  entry.dispose=request.dispose as Entry['dispose'];entry.costs=request.costs as Entry['costs'];
  let lease:ChunkResourceLease<T>;
  try{
   // A capacity callback may already have started this content's producer.
   // Join it with an independent consumer before releasing the unused claim.
   const admitted=cpu.get(entry.key);
   if(admitted&&!admitted.finalized&&admitted.state!=='retiring'&&admitted.state!=='failed'){
    lease=makeLease<T>(admitted,request.role,request.onChange,request.signal,ifFits);
    hits++;applyRequestRetention(admitted,request);
    finish(entry,'released');return lease;
   }
   cpu.set(entry.key,entry);
   lease=makeLease<T>(entry,request.role,request.onChange,request.signal,ifFits);
  }catch(error){if(error instanceof CacheDoesNotFit){finish(entry,'released');throw error;}fail(entry,error);throw error;}
  try{
   if(!ifFits)for(const parent of new Set(request.parents??[]))retainCpuParent(entry,parent);
   productions++;entry.started=true;
   const produced=request.produce(production(entry));
   if(produced&&typeof (produced as Promise<T>).then==='function'){
    // The chained completion resolves void. Neither entry nor lease retains the
    // fulfilled producer promise that could otherwise keep a released T alive.
    void Promise.resolve(produced).then(value=>{complete(entry,value);},error=>{fail(entry,error);});
   }else complete(entry,produced);
  }catch(error){fail(entry,error);}
  return lease;
 }
 function acquireGpu<T>(request:ChunkGpuResourceRequest<T>):ChunkResourceLease<T>{
  live();validKey(request.contentKey);cacheIdleMs(request.cacheRetention,true);collect(false);bindChunkResourceContext(request.context,store);
  const state=stateFor(request.context);
  if(request.context.isContextLost())throw new Error('Chunk GPU context is lost');
  if(request.epoch!==state.epoch)throw new Error('Chunk GPU epoch is stale: '+request.epoch+' != '+state.epoch);
  state.lost=false;
  const rows=gpuRows(request.context,request.epoch),existing=rows.get(request.contentKey);
  if(existing&&!existing.finalized&&existing.state!=='retiring'&&existing.state!=='failed'){
   hits++;applyRequestRetention(existing,request);
   return makeLease<T>(existing,request.role,request.onChange);
  }
  const entry=createEntry(request.contentKey,request.estimate,request.allowRecent===true,request.context,request.epoch,true,undefined,request.cacheRetention);
  entry.dispose=request.dispose as Entry['dispose'];entry.costs=request.costs as Entry['costs'];
  let lease:ChunkResourceLease<T>|undefined;
  try{
   // Admission may evict the epoch's last indexed resource or synchronously
   // admit another owner of this key. Use the live index after those callbacks,
   // and never replace their allocation or register into an obsolete epoch.
   if(request.context.isContextLost()||request.epoch!==stateFor(request.context).epoch)throw new Error('Chunk GPU incarnation changed before allocation');
   const admittedRows=gpuRows(request.context,request.epoch),admitted=admittedRows.get(entry.key);
   if(admitted&&!admitted.finalized&&admitted.state!=='retiring'&&admitted.state!=='failed'){
    lease=makeLease<T>(admitted,request.role,request.onChange);
    hits++;applyRequestRetention(admitted,request);
    finish(entry,'released');
    if(lease.state!=='ready')throw admitted.failure??new Error('Chunk GPU allocation did not become ready: '+admitted.key);
    return lease;
   }
   admittedRows.set(entry.key,entry);
   lease=makeLease<T>(entry,request.role,request.onChange);
   for(const parent of new Set(request.parents??[])){
    if(!leaseEntries.has(parent)||parent.released||parent.state!=='ready'||(parent.context&&(parent.context!==request.context||parent.epoch!==request.epoch)))throw new Error('Chunk borrowed buffer parent is unavailable or from another page/epoch');
    entry.parents.push(parent.retain('dependency'));
   }
   if(entry.reservation.recent&&!setCacheCharge(entry,true)){
    const pressure=budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);
    throw new Error('Chunk dependency cache capacity is unavailable');
   }
   if(request.context.isContextLost()||request.epoch!==stateFor(request.context).epoch)throw new Error('Chunk GPU incarnation changed before allocation');
   gpuAllocations++;
   entry.started=true;
   const value=request.create(production(entry));
   complete(entry,value);
   if(entry.state!=='ready')throw entry.failure??new Error('Chunk GPU allocation did not become ready: '+entry.key);
   return lease;
  }catch(error){fail(entry,error);lease?.release();throw error;}
 }
 /** frame: the public frame-boundary collect. The one that opens a frame also
  * delivers a deferred reclaimable wake and spends one follow-up frame of
  * every pending retirement. Acquisitions collect without a frame. */
 function collect(frame:boolean){
  if(collecting)return;collecting=true;recentExpiryWakePending=false;
  try{
   const now=performance.now();
   for(const entry of [...recent])if(now-(entry.recentSince??now)>=entry.cacheIdleMs){
    const idleSince=entry.recentSince??now,deadline=idleSince+entry.cacheIdleMs;
    evictEntry(entry,true);idleExpiryCount++;
    if(idleExpiryReceipts.length===16)idleExpiryReceipts.shift();
    idleExpiryReceipts.push({key:entry.key.slice(0,256),idleSince,deadline,collectedAt:now,idleLimitMs:entry.cacheIdleMs,stateAfter:entry.state,functionalLeasesAfter:[...entry.leases].filter(lease=>!cacheRole(lease.role)).length});
   }
   for(const entry of [...retiring]){
   const gl=entry.context;
   if(!gl||!entry.settled)continue;
   if(gl.isContextLost()||entry.epoch!==stateFor(gl).epoch){finish(entry,'lost',true);continue;}
   if(entry.unobservedSince!==undefined){if(now-entry.unobservedSince>=retirementFallbackMs){fallbackReleases++;finish(entry,'released');}continue;}
   if(!entry.fence){if(entry.retirementStarted)unobservedRetirement(entry,'GPU completion fence unavailable');continue;}
   let result:number;try{result=gl.clientWaitSync(entry.fence,0,0);}catch(error){retirementFailure(entry,String(error));result=gl.WAIT_FAILED;}
   if(result===gl.ALREADY_SIGNALED||result===gl.CONDITION_SATISFIED)finish(entry,'released');
   else if(result===gl.WAIT_FAILED)unobservedRetirement(entry,'GPU completion query failed');
   }
   if(!destroyed)for(const orphan of [...orphanedRetirements])if(orphan.budget===budget&&orphan.collect())orphanedRetirements.delete(orphan);
  }finally{collecting=false;updateRecentExpiry();}
  if(frame&&openFrame()){deliverDeferredReclaimWake();requestRetirementFrame(true);}
 }
 function collectRetired(){collect(true);}
 function evictRecent(contentKeys?:readonly ChunkContentKey[]){
  const selected=contentKeys===undefined?undefined:new Set(contentKeys);
  if(selected?.size===0)return;
  if(evicting)return;evicting=true;
  try{for(const entry of [...recent])if(!selected||selected.has(entry.key))evictEntry(entry);}finally{evicting=false;updateRecentExpiry();}
 }
 function setIdleRetention(contentKeys:readonly ChunkContentKey[],tiers:Readonly<Record<ChunkCacheRetention,number>>,settings?:{exclusiveDependents?:boolean}){
  for(const tier of Object.keys(CHUNK_CACHE_IDLE_MS) as ChunkCacheRetention[])if(!Number.isFinite(tiers[tier])||tiers[tier]<0||tiers[tier]>20_000)throw new RangeError('Invalid chunk cache idle tier');
  const keys=new Set(contentKeys),now=performance.now();
  if(!keys.size)return;
  const selected=new Set([...entries].filter(entry=>keys.has(entry.key)&&leasable(entry)));
  if(settings?.exclusiveDependents){
   // Walk real retained-parent edges, not naming conventions. A resource with
   // even one unrelated parent is shared and keeps its existing policy.
   const children=new Map<Entry,Entry[]>(),remaining=new Map<Entry,number>();
   for(const child of entries){
    if(selected.has(child)||!leasable(child)||!child.parents.length)continue;
    const parents=new Set(child.parents.map(parent=>leaseEntries.get(parent)));
    if(parents.has(undefined))continue;
    remaining.set(child,parents.size);
    for(const parent of parents){const rows=children.get(parent!)??[];rows.push(child);children.set(parent!,rows);}
   }
   const queue=[...selected];
   for(let at=0;at<queue.length;at++)for(const child of children.get(queue[at])??[]){
    const left=remaining.get(child)!-1;remaining.set(child,left);
    if(left===0&&!selected.has(child)){selected.add(child);queue.push(child);}
   }
  }
  for(const entry of selected){
   entry.idleOverride??={allowRecent:entry.allowRecent,cacheIdleMs:entry.cacheIdleMs};
   entry.cacheIdleMs=Math.min(recentMaxIdleMs,tiers[entry.retentionTier??(entry.context?'reupload':'rebuild')]);
   entry.allowRecent=true;entry.cacheExpired=false;
   if(recent.has(entry))entry.recentSince=now;
  }
  updateRecentExpiry();budget.notifyAvailabilityStateChange();
 }
 function evictEntry(entry:Entry,expired=false){
  const wasEvicting=evicting;evicting=true;if(expired)entry.cacheExpired=true;recent.delete(entry);entry.recentSince=undefined;
  try{
   for(const lease of [...entry.leases])if(cacheRole(lease.role)){
    const notify=lease.changed;lease.release();
    try{notify?.();}catch{callbackErrors++;}
   }
   if(!entry.leases.size)retire(entry);
   else setCacheCharge(entry,false);
  }finally{evicting=wasEvicting;updateRecentExpiry();}
 }
 function invalidateContext(gl:WebGL2RenderingContext,epoch=stateFor(gl).epoch){
  const state=stateFor(gl);
  // Callers pass their observed epoch. A later restored owner cannot invalidate
  // allocations already made by a different owner in a newer incarnation.
  if(epoch>=state.epoch){state.epoch=epoch+1;state.lost=true;}
  for(const entry of [...entries])if(entry.context===gl&&entry.epoch===epoch){
   entry.controller.abort();settle(entry,new Error('Chunk GPU context incarnation lost'));finish(entry,'lost',true);
  }
 }
 function retireGpu(request:ChunkGpuRetirement){
  if(!request.reservation.active)return;
  const entry:Entry={
   key:(request.label??'external-gpu-allocation').slice(0,256),state:'ready',
   value:undefined,hasValue:true,reservation:request.reservation,selfCosts:[],context:request.context,epoch:request.epoch,
   controller:new AbortController(),leases:new Set(),parents:[],allowRecent:false,cacheIdleMs:0,
   settled:true,finalized:false,started:true,resolve(){},reject(){},ready:Promise.resolve(),
   dispose:()=>request.dispose(),
  };
  entries.add(entry);
  if(request.context.isContextLost()||request.epoch!==stateFor(request.context).epoch){finish(entry,'lost',true);return;}
  retire(entry);
 }
 function createScene<T=unknown>(owner:string):ChunkScene<T>{
  live();if(!owner)throw new Error('Chunk scene owner is required');
  let published=new Map<string,ChunkResourceLease<T>>(),version=0,generation=-1,closed=false;
  let active:{request:ChunkSceneRequest;leases:Map<string,ChunkResourceLease<T>>;cancelled:boolean;api:ChunkPublication<T>}|undefined;
  const releaseRows=(rows:Map<string,ChunkResourceLease<T>>)=>{for(const lease of rows.values())lease.release();rows.clear();};
  function reconcile(request:ChunkSceneRequest):ChunkPublication<T>{
   live();if(closed)throw new Error('Chunk scene destroyed');
   if(!Number.isSafeInteger(request.generation)||request.generation<generation||(active&&request.generation<active.request.generation))throw aborted();
   const wanted=[...new Set(request.wanted)];for(const key of wanted)validKey(key);
   const same=active&&active.request.generation===request.generation&&active.request.context===request.context&&active.request.epoch===request.epoch&&active.request.wanted.length===wanted.length&&active.request.wanted.every((key,i)=>key===wanted[i]);
   if(same){active!.request={...request,wanted};return active!.api;}
   active?.api.cancel();
   const value={request:{...request,wanted},leases:new Map<string,ChunkResourceLease<T>>(),cancelled:false,api:undefined as unknown as ChunkPublication<T>};
   const matches=(lease:ChunkResourceLease<T>)=>lease.state==='ready'&&(!value.request.context||lease.context===value.request.context)&&(value.request.epoch===undefined||lease.epoch===value.request.epoch);
   for(const key of wanted){const held=published.get(key);if(held&&matches(held))value.leases.set(key,held.retain('candidate'));}
   const api:ChunkPublication<T>={
    generation:request.generation,
    get pendingKeys(){return wanted.filter(key=>{const lease=value.leases.get(key);return !lease||!matches(lease);});},
    get cancelled(){return value.cancelled;},
    get(key){return value.cancelled?undefined:value.leases.get(key);},
    add(lease){
     if(value.cancelled||active!==value)throw aborted();
     if(!wanted.includes(lease.contentKey))throw new Error('Chunk is outside the wanted publication set');
     if(!leaseEntries.has(lease))throw new Error('Chunk publication must use this page store');
     const previous=value.leases.get(lease.contentKey);
     if(previous&&leaseEntries.get(previous)===leaseEntries.get(lease))return;
     const next=lease.retain('candidate');value.leases.set(lease.contentKey,next);previous?.release();
    },
    publish(){
     try{
     if(closed||value.cancelled||active!==value)return false;
     if(value.request.current?.()===false){api.cancel();return false;}
     if(api.pendingKeys.length)return false;
     for(const cohort of value.request.cohorts??[]){
      if(cohort.members.some(key=>!wanted.includes(key)||!value.leases.has(key))||cohort.ready?.()===false)return false;
     }
     if(value.request.current?.()===false){api.cancel();return false;}
     if(api.pendingKeys.length)return false;
     const previousKeys=[...published.keys()];
     const unchanged=generation===value.request.generation&&published.size===wanted.length&&wanted.every((key,i)=>previousKeys[i]===key&&leaseEntries.get(published.get(key)!)===leaseEntries.get(value.leases.get(key)!));
     if(unchanged){active=undefined;value.cancelled=true;releaseRows(value.leases);return true;}
     const next=new Map<string,ChunkResourceLease<T>>();
     try{for(const key of wanted)next.set(key,value.leases.get(key)!.retain('main'));}
     catch(error){releaseRows(next);throw error;}
     if(value.request.current?.()===false){releaseRows(next);api.cancel();return false;}
     const previous=published;published=next;generation=value.request.generation;version++;active=undefined;value.cancelled=true;
     releaseRows(value.leases);releaseRows(previous);return true;
     }catch(error){api.cancel();throw error;}
    },
    cancel(){if(value.cancelled)return;value.cancelled=true;if(active===value)active=undefined;releaseRows(value.leases);},
   };
   value.api=api;active=value;return api;
  }
  const scene:ChunkScene<T>={
   owner,get version(){return version;},get generation(){return generation;},
   get leases(){return [...published.values()];},reconcile,
   capture(role):ChunkSceneSnapshot<T>{
    if(closed)throw new Error('Chunk scene destroyed');
    let held:ChunkResourceLease<T>[]=[];
    try{for(const lease of published.values())held.push(lease.retain(role));}catch(error){for(const lease of held)lease.release();throw error;}
    const capturedVersion=version,capturedGeneration=generation;
    return{version:capturedVersion,generation:capturedGeneration,get leases(){return held;},release(){const previous=held;held=[];for(const lease of previous)lease.release();}};
   },
   captureReady(role):ChunkSceneReadySnapshot<T>{
    if(closed)throw new Error('Chunk scene destroyed');
    let held:ChunkResourceBorrow<T>[]=[];
    try{for(const lease of published.values())held.push(lease.borrowReady(role));}catch(error){for(const borrow of held)borrow.release();throw error;}
    const capturedVersion=version,capturedGeneration=generation;
    return{version:capturedVersion,generation:capturedGeneration,get borrows(){return held;},release(){const previous=held;held=[];for(const borrow of previous)borrow.release();}};
   },
   destroy(){if(closed)return;closed=true;active?.api.cancel();releaseRows(published);scenes.delete(scene as ChunkScene<unknown>);},
  };
  scenes.add(scene as ChunkScene<unknown>);return scene;
 }
 function projectStats(){
  const rows=[...entries];
  const idleDeadlines=[...new Set([...Object.values(cacheIdleTiersMs),...[...recent].map(entry=>entry.cacheIdleMs)])].map(limitMs=>{
   const held=[...recent].filter(row=>row.cacheIdleMs===Math.min(limitMs,recentMaxIdleMs));
   return{limitMs:Math.min(limitMs,recentMaxIdleMs),entries:held.length,earliestDeadline:held.length?Math.min(...held.map(row=>(row.recentSince??0)+row.cacheIdleMs)):null};
  }).filter((row,i,all)=>all.findIndex(other=>other.limitMs===row.limitMs)===i);
  return{idleCache:{observedAt:performance.now(),timeOrigin:performance.timeOrigin,deadlines:idleDeadlines,expiryCount:idleExpiryCount,lastExpiries:idleExpiryReceipts.map(row=>({...row}))},scope:'page-owned-unique-logical-resources',cacheIfFitsSkips,resources:rows.length,cpu:rows.filter(row=>!row.context).length,gpu:rows.filter(row=>row.context).length,preparing:rows.filter(row=>row.state==='preparing').length,ready:rows.filter(row=>row.state==='ready').length,recent:recent.size,recentMaxEntries,recentMaxIdleMs,cacheIdleTiersMs,retiring:retiring.size,retirementFollowUpFrames,retirementFallbackMs,retirementFrameRequesters:retirementFrameRequesters.size,retirementFrameRequests,recentExpiryScheduled:recentExpiryTimer!==undefined,recentExpiryWakePending,unobservedRetirements:rows.filter(row=>row.unobservedSince!==undefined).length,fallbackReleases,reclaimableWakes,deferredReclaimWakes,reclaimWakeDeferred:reclaimDeferred,frameBoundaries:frameGeneration,lastRetirementError,roles:rows.reduce((n,row)=>n+row.leases.size+Number(row.state==='recent'),0),productions,gpuAllocations,hits,callbackErrors,retirementErrors,budget:budget.stats,unmeasured:'Browser, driver, VAO/program internals and physical residency are not quantified by logical payload charges; fence completion is not physical-page reclamation.'};
 }
 // These built-in callbacks either reclaim actual entries/fences or are a
 // no-op; no-op pressure sends no metadata retry hint of its own.
 const unpressure=budget.onPressure(()=>{evictRecent();collect(false);},'metadata-hint-v1');
 const store:ChunkResourceStore={
  budget,get destroyed(){return destroyed;},acquire,acquireGpu,createScene,
  createAvailabilityTracker(){
   live();const tracker=budget.createAvailabilityTracker();
   // Pressure callbacks may have synchronously destroyed this owner while the
   // real reservation was being admitted. Do not leak or expose that claim.
   if(destroyed){tracker.release();throw new DOMException('Availability tracker owner destroyed','AbortError');}
   return tracker;
  },
  contextEpoch(gl){return stateFor(gl).epoch;},invalidateContext,retireGpu,collectRetired,evictRecent,setIdleRetention,
  onRetirementPending(request,signal){
   if(typeof request!=='function')throw contractViolation(new TypeError('Retirement frame request must be a function'));
   if(signal&&(typeof signal.addEventListener!=='function'||typeof signal.aborted!=='boolean'))throw contractViolation(new TypeError('Retirement frame signal must be an AbortSignal'));
   if(destroyed||signal?.aborted)return()=>{};
   const row:{request:(()=>void)|undefined}={request};retirementFrameRequesters.add(row);
   const off=()=>{retirementFrameRequesters.delete(row);row.request=undefined;updateRecentExpiry();signal?.removeEventListener('abort',off);};
   signal?.addEventListener('abort',off,{once:true});
   // A requester added after a retirement started still sees it collected,
   // and one added while a reclaimable wake is deferred still delivers it.
   if(retiring.size)requestRetirementFrame(false);
   if(reclaimDeferred)requestFrames();
   updateRecentExpiry();
   return off;
  },
  destroy(){
   if(destroyed)return;destroyed=true;unpressure();unregisterAvailabilityState();updateRecentExpiry();
   for(const scene of [...scenes])scene.destroy();
   evictRecent();
   for(const entry of [...entries]){for(const lease of [...entry.leases])lease.release();idle(entry);}
   collect(false);
   registerOrphan();
   for(const row of retirementFrameRequesters)row.request=undefined;retirementFrameRequesters.clear();
  },
  get stats(){return readRenderDiagnosticSnapshot(projectStats);},
 };
 cacheIfFitsImplementations.set(store,<T>(request:ChunkResourceRequest<T>)=>{
  if(!request||typeof request!=='object'||!cacheRole(request.role))throw contractViolation(new TypeError('A cache-if-fits resource allocation must be a cache or recent role request'));
  try{return acquire(request,true);}
  catch(error){if(error instanceof CacheDoesNotFit){cacheIfFitsSkips++;return undefined;}throw error;}
 });
 return store;
}

/** Cache only if it fits (an additive option; store.acquire is unchanged).
 * For a 'cache' or 'recent' role: the role is created only when the entry's
 * cache charge, with its retained ancestry, fits the page ledger's recent
 * subset right now and the recent entry-count bound has room. Judgement and
 * charge happen in one synchronous step, quietly: a refusal runs no onPressure
 * listener, evicts no other entry, records no ledger pressure and returns
 * undefined with the entry unchanged. A refused miss builds nothing: no entry,
 * no reservation, no parent lease, so nothing is released and no availability
 * wake is sent. A miss with request.parents is judged with that ancestry
 * before any parent is retained; a parent that is not a ready CPU/source lease
 * of this page is thrown synchronously (acquire would return a failed lease).
 * An entry that is already charged as recent is simply leased; on a hit,
 * request.parents is ignored as by acquire. Other failures (abort, a
 * destroyed store, an unleasable entry) are thrown, and a producer error
 * fails the returned lease, as by acquire. A store that this module did not
 * create caches nothing (undefined):
 * skipping a revocable cache role is always safe. */
export function acquireCacheIfFits<T>(store:ChunkResourceStore,request:ChunkResourceRequest<T>):ChunkResourceLease<T>|undefined{
 const implementation=cacheIfFitsImplementations.get(store);
 return implementation?implementation(request):undefined;
}

export function getPageChunkResourceStore(options:Omit<ChunkResourceStoreOptions,'budget'>={},pageOwner:object=globalThis):ChunkResourceStore{
 const budget=getPageResourceBudget(options,pageOwner);
 let store=pageStores.get(pageOwner);
 if(!store||store.destroyed){store=createChunkResourceStore({...options,budget});pageStores.set(pageOwner,store);}
 return store;
}
export function bindChunkResourceContext(context:WebGL2RenderingContext,store:ChunkResourceStore=getPageChunkResourceStore()):ChunkResourceStore{
 const previous=contextStores.get(context);
 if(previous&&previous!==store&&!previous.destroyed)throw new Error('A WebGL context cannot have two page resource stores');
 contextStores.set(context,store);return store;
}
export function getChunkResourceStoreForContext(context:WebGL2RenderingContext):ChunkResourceStore{
 const existing=contextStores.get(context);
 return existing&&!existing.destroyed?existing:bindChunkResourceContext(context);
}
