import {inflateBounded3DGzip} from './bounded-3d-gzip';
import {ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {registerPressureAvailability,type PressureSnapshotWriter} from './render-runtime/pressure-availability';

export type FrozenInitializerDescriptor={path:string;sha256:string;bytes:number;transport?:{path:string;sha256:string;bytes:number;encoding:'gzip'}};
export type FrozenInitializerSelection={tables:readonly string[];initializers?:Record<string,Record<string,number>>};
/** Page-ledger hooks of a session whose table inputs are charged on the page
 * ledger (a FrozenTableIngress session). A session without them charges
 * nothing, exactly as before. */
export type FrozenInitializerLedger={
 /** The page ledger that charged this session's table inputs. */
 readonly budget:ResourceBudget;
 /** Hands over the reservation that charged one verified table input once the
  * store keeps that input; the reader's own claim ends there. Undefined when
  * that read holds none. */
 adopt(sha:string):ResourceBudgetReservation|undefined;
 /** Retained bytes of a parsed module value (the page-lifetime charge); the
  * value's input size when absent or when it throws. */
 estimate?(value:unknown):number;
};
/** One owner's initializer session. Only the latest begun session is active. */
export interface FrozenInitializerSession{
 readonly active:boolean;
 /** Races `operation` with this session's end (failure, close, replacement). */
 wait<T>(operation:Promise<T>):Promise<T>;
 /** Resolves once no initializer selected by this session is pending, i.e. every
  * initializer a module has requested and this session selects has completed
  * (at once when none is pending). Selected initializers no module has
  * requested are not waited for: a module requests them when it is imported.
  * Rejects with this session's failure when an initializer fails, with an
  * AbortError when the session is closed, replaced by a later begin() or its
  * begin signal aborts first (a call after that rejects at once), and with
  * `signal`'s reason (AbortError) when `signal` aborts. Holds no reservation and
  * owns no timer: it wakes on initializer completion, session end or `signal`. */
 settled(signal:AbortSignal):Promise<void>;
 close():void;
}
type Reader=(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;
type Job={key:string;sha:string;file:string;occurrence:number;queued:boolean;promise:Promise<any>;resolve:(value:any)=>void};
type SettledWaiter={resolve:()=>void;reject:(error:unknown)=>void};
type Session={id:number;read:Reader;controller:AbortController;allowed:Map<string,Map<string,number>>;failure:Promise<never>;reject:(error:unknown)=>void;closed:boolean;ended:unknown;removeAbort:()=>void;removePressure:()=>void;pressureAvailability?:ReturnType<typeof registerPressureAvailability>;onFailure?:(error:unknown)=>void;ledger?:FrozenInitializerLedger;settled:Set<SettledWaiter>};
type Hold={reservation:ResourceBudgetReservation;session:Session};
const LIMIT=64*1024**2,ABORT=()=>new DOMException('Aborted','AbortError');
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(v=>v.toString(16).padStart(2,'0')).join('');
function abortable<T>(read:()=>Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();return new Promise((resolve,reject)=>{let settled=false;const finish=(error:unknown,value?:T)=>{if(settled)return;settled=true;signal.removeEventListener('abort',cancel);error===undefined?resolve(value!):reject(error);};const cancel=()=>finish(signal.reason??ABORT());signal.addEventListener('abort',cancel,{once:true});Promise.resolve().then(read).then(value=>finish(undefined,value),error=>finish(error));if(signal.aborted)cancel();});
}

/** Jobs await only verified input bytes, never another module or import promise.
 * A transient cancellation/failure parks the TLA job rather than rejecting its
 * module evaluation: native ESM caches rejected evaluations permanently.
 * The owning request gets the error immediately through session.wait(); an
 * explicit new session resumes the same pending initializer exactly once.
 *
 * Scheduling is consumer-first: an initializer whose table input is already
 * retained only parses, so it runs at once and never waits for one of the two
 * read slots. Read slots go to initializers whose table is neither retained nor
 * already being read for the session (those wait queued and then consume). A
 * slot waiting for page capacity therefore never keeps queued a consumer whose
 * completion would let a retained table leave.
 *
 * On a ledger session the store charges what it retains: when a verified input
 * is kept for the table's remaining initializers it adopts the read's claim
 * (no second admission) as the exact retained copy plus one decoded-text
 * working copy for the next parse, and releases it when the table is dropped:
 * after its last selected initializer, when the session ends, or when page
 * pressure reclaims it while no initializer of that table is queued or running
 * (a later initializer reads it again). Nothing waits while holding it.
 *
 * The parsed value an initializer resolves stays module state for the page's
 * lifetime. On a ledger session it is charged once, when it is parsed, as a
 * page-lifetime 'metadata' estimate of its exported value (identity: the value)
 * that is never released. A refused charge never fails the initializer: it is
 * counted (unheldParsed) for acceptance attribution, as are values parsed by a
 * session without a page ledger (unledgeredParsed).
 */
export function createFrozenInitializerStore(descriptors:readonly FrozenInitializerDescriptor[]){
 const registry=new Map<string,FrozenInitializerDescriptor>(),raw=new Map<string,Uint8Array>();
 const expected=new Map<string,Map<string,number>>(),consumed=new Map<string,number>(),done=new Set<string>();
 const jobs=new Map<string,Job>(),queue:Job[]=[],running=new Set<Job>();
 const physical=new Map<string,{session:Session;promise:Promise<Uint8Array>}>();
 // Ledger claims of retained inputs, and inputs a ledger session keeps without one.
 const holds=new Map<string,Hold>(),unheld=new Set<string>();
 let current:Session|undefined,epoch=0,readers=0,retainedBytes=0,declaredInFlightRawBytes=0,activePhysicalBytes=0,peakLiveRawInputBytes=0,peakRetainedBytes=0,peakPhysicalBytes=0,peakInitializers=0,peakModules=0,reads=0,parses=0,failures=0;
 const notifyPressure=()=>current?.pressureAvailability?.notify();
 let selectedRawByteBudget=0,selectedRawInputBound=0,consumerRuns=0;
 let retentionAdoptions=0,retentionReservations=0,retentionRefusals=0,retentionEvictions=0,retentionReleases=0,peakRetentionHeldBytes=0;
 // Page-lifetime charges of parsed module values (kept, never released).
 const parsedClaims:ResourceBudgetReservation[]=[];
 let retainedParsedEstimateBytes=0,unheldParsed=0,unheldParsedBytes=0,unledgeredParsed=0,unledgeredParsedBytes=0;
 /** Charges one parsed module value for the page's lifetime; never fails the initializer. */
 function chargeParsed(value:unknown,inputBytes:number,job:Job,session:Session){
  const ledger=session.ledger;let bytes=inputBytes;
  // A value the estimator cannot walk (or none given) is charged its input size.
  if(ledger?.estimate)try{const estimated=ledger.estimate(value);if(Number.isFinite(estimated)&&estimated>=0)bytes=estimated;}catch{bytes=inputBytes;}
  bytes=Math.max(1,Math.ceil(bytes));
  if(!ledger){unledgeredParsed++;unledgeredParsedBytes+=bytes;return;}
  const identity=value!==null&&typeof value==='object'?value as object:undefined;
  const result=ledger.budget.tryReserve({category:'metadata',bytes,precision:'estimate',...(identity?{identity}:{}),label:'frozen module value '+job.sha.slice(0,16)},{label:'frozen parsed module value (page lifetime)'});
  if(!result.ok){unheldParsed++;unheldParsedBytes+=bytes;return;}
  parsedClaims.push(result.reservation);retainedParsedEstimateBytes+=bytes;
 }
 type ResolvedInput={file:string;sha256:string;bytes:number;occurrence:number;sessionEpoch:number;decodeParseStartMs:number;resolvedAtMs:number;decodeParseElapsedMs:number};
 const largestResolvedInputs:ResolvedInput[]=[],resolvedByProvider:Record<string,{initializers:number;logicalJSONBytes:number}>={};
 let resolvedJSONBytes=0,firstResolveMs:number|undefined,lastResolveMs:number|undefined,maxDecodeParseMs=0;
 function recordResolved(job:Job,bytes:number,sessionEpoch:number,start:number,end:number){
  resolvedJSONBytes+=bytes;firstResolveMs??=end;lastResolveMs=end;maxDecodeParseMs=Math.max(maxDecodeParseMs,end-start);
  const provider=job.file.split('/')[1],totals=resolvedByProvider[provider]??={initializers:0,logicalJSONBytes:0};totals.initializers++;totals.logicalJSONBytes+=bytes;
  largestResolvedInputs.push({file:job.file.slice(0,256),sha256:job.sha,bytes,occurrence:job.occurrence,sessionEpoch,decodeParseStartMs:start,resolvedAtMs:end,decodeParseElapsedMs:Math.max(0,end-start)});
  largestResolvedInputs.sort((a,b)=>b.bytes-a.bytes);if(largestResolvedInputs.length>8)largestResolvedInputs.length=8;
 }
 let total=0;for(const d of descriptors){
  if(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json$/.test(d.path)||!d.path.endsWith('/'+d.sha256+'.json')||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>LIMIT||registry.has(d.sha256))throw Error('Invalid frozen table descriptor');
  const t=d.transport;if(t&&(!/^\/safety\/buildings3d\/painted-tables\/[a-f0-9]{2}\/[a-f0-9]{64}\.json\.gz$/.test(t.path)||!t.path.endsWith('/'+t.sha256+'.json.gz')||!/^[a-f0-9]{64}$/.test(t.sha256)||t.encoding!=='gzip'||!Number.isSafeInteger(t.bytes)||t.bytes<1||t.bytes>LIMIT))throw Error('Invalid frozen table transport');
  registry.set(d.sha256,d);total+=d.bytes;
 }
 if(total>900*1024**2)throw Error('Frozen table budget exceeded');
 const heldBytes=()=>{let bytes=0;for(const hold of holds.values())bytes+=hold.reservation.bytes;return bytes;};
 const live=()=>{peakRetainedBytes=Math.max(peakRetainedBytes,retainedBytes);peakLiveRawInputBytes=Math.max(peakLiveRawInputBytes,retainedBytes+declaredInFlightRawBytes);peakPhysicalBytes=Math.max(peakPhysicalBytes,activePhysicalBytes);peakRetentionHeldBytes=Math.max(peakRetentionHeldBytes,heldBytes());};
 function stopPressure(session:Session){
  const off=session.removePressure,availability=session.pressureAvailability;session.removePressure=()=>{};session.pressureAvailability=undefined;
  off();availability?.release();
 }
 function stopIdlePressure(session:Session){
  for(const hold of holds.values())if(hold.session===session)return;
  stopPressure(session);
 }
 const drop=(sha:string)=>{
  const bytes=raw.get(sha);if(bytes){retainedBytes-=bytes.byteLength;raw.delete(sha);}
  unheld.delete(sha);
  const hold=holds.get(sha);if(hold){holds.delete(sha);retentionReleases++;notifyPressure();stopIdlePressure(hold.session);hold.reservation.release();}
 };
 const clear=()=>{for(const sha of [...raw.keys(),...holds.keys()])drop(sha);};
 const remaining=(sha:string,session:Session)=>{let count=0;for(const [file,n]of session.allowed.get(sha)??[])for(let i=0;i<n;i++)if(!done.has(sha+'|'+file+'|'+i))count++;return count;};
 const allowed=(job:Job,session:Session)=>job.occurrence<(session.allowed.get(job.sha)?.get(job.file)??0);
 const enqueue=(job:Job)=>{if(!job.queued&&jobs.has(job.key)){job.queued=true;queue.push(job);notifyPressure();}};
 // Pending: requested by a module, selected by the session, not yet complete.
 const pendingFor=(session:Session)=>{for(const job of jobs.values())if(allowed(job,session))return true;return false;};
 function notifySettled(session:Session){
  if(session.closed||!session.settled.size||pendingFor(session))return;
  const waiters=[...session.settled];session.settled.clear();for(const waiter of waiters)waiter.resolve();
 }
 function stop(session:Session,error?:unknown){
  if(session.closed)return;session.closed=true;session.ended=error??ABORT();session.removeAbort();if(current===session)current=undefined;stopPressure(session);
  session.controller.abort(error??ABORT());clear();
  if(error!==undefined){session.reject(error);session.onFailure?.(error);}
  // Completion waiters learn how the session ended: its failure, or an abort
  // when it was closed, replaced or its begin signal aborted.
  const waiters=[...session.settled];session.settled.clear();for(const waiter of waiters)waiter.reject(session.ended);
 }
 function failure(session:Session,error:unknown){if(current!==session||session.closed)return;failures++;stop(session,error);}
 const retentionCosts=(d:FrozenInitializerDescriptor,value:Uint8Array):ResourceBudgetCost[]=>[
  {category:d.transport?'inflate':'read',bytes:value.buffer.byteLength,precision:'exact',identity:value.buffer,label:'frozen table retained input '+d.sha256.slice(0,16)},
  {category:'normalize',bytes:value.byteLength*2,precision:'estimate',label:'frozen table next-initializer decoded-text working copy'},
 ];
 /** Charges the verified input this table keeps for its remaining initializers.
  * The read claim is adopted and adjusted to the same bytes, so this admits
  * nothing new. Without a claim the store reserves once; if even that is
  * refused the input serves only the initializers already holding it. */
 function retain(d:FrozenInitializerDescriptor,value:Uint8Array,session:Session){
  const ledger=session.ledger;if(!ledger)return;
  if(!session.pressureAvailability){
   let availability:ReturnType<typeof registerPressureAvailability>;
   try{availability=registerPressureAvailability(ledger.budget,'frozen-initializers',writer=>pressureSnapshot(session,writer));}
   catch(error){
    // The ingress may still own the admitted read/response. Hand it back even
    // when no retained-table participant could be admitted.
    ledger.adopt(d.sha256)?.release();
    if(!(error instanceof ResourceBudgetExceededError))throw error;
    // No table is held yet: use the existing unheld path rather than retain
    // bytes without a pressure participant or fail session construction.
    if(!session.closed&&current===session){retentionRefusals++;unheld.add(d.sha256);}return;
   }
   if(session.closed||current!==session){availability.release();ledger.adopt(d.sha256)?.release();return;}
   try{session.removePressure=ledger.budget.onPressure(pressure=>evictIdle(session,pressure),'metadata-hint-v1');session.pressureAvailability=availability;}
   catch(error){availability.release();throw error;}
  }
  const costs=retentionCosts(d,value),adopted=ledger.adopt(d.sha256);let reservation:ResourceBudgetReservation|undefined;
  if(adopted){if(adopted.adjust(costs)){reservation=adopted;retentionAdoptions++;}else adopted.release();}
  if(!reservation){const result=ledger.budget.tryReserve(costs,{label:'frozen table retained input '+d.sha256});if(result.ok){reservation=result.reservation;retentionReservations++;}}
  if(!reservation){retentionRefusals++;unheld.add(d.sha256);stopIdlePressure(session);return;}
  holds.get(d.sha256)?.reservation.release();holds.set(d.sha256,{reservation,session});notifyPressure();
 }
 const busy=(sha:string,session:Session)=>{for(const job of running)if(job.sha===sha)return true;for(const job of queue)if(job.sha===sha&&allowed(job,session))return true;return false;};
 function pressureSnapshot(session:Session,writer:PressureSnapshotWriter){
  writer.open();if(session.closed||current!==session){writer.close();return;}
  // Keep the Map's age order, the exact retained table and reservation, and
  // the same busy predicate evictIdle uses. This function only reads state.
  for(const [sha,hold]of holds){
   if(hold.session!==session)continue;
   writer.open();writer.value(sha);writer.value(hold.reservation.bytes);writer.value(busy(sha,session));writer.close();
  }
  writer.close();
 }
 /** Page pressure reclaims idle retained inputs (no initializer of that table
  * queued or running), oldest first, until the refused admission's remaining
  * shortfall is covered, whether or not they cover all of it alone: listeners
  * that run after this one may free the rest within the same refusal, and a
  * waiter that resumes later does not count retained inputs as reclaimable.
  * This keeps a retained input from blocking any read, the store's own
  * included. A later initializer of a reclaimed table reads it again. Nothing
  * is reclaimed for an admission larger than the whole page, or one refused by
  * the recent subset, which retained inputs are not part of. */
 function evictIdle(session:Session,pressure:ResourceBudgetPressure){
  if(session.closed||current!==session||!session.ledger)return;
  const stats=session.ledger.budget.stats;
  // Retained inputs are not in the recent subset: they cannot make room there.
  if(stats.recentBytes+Math.max(0,pressure.recentRequired-pressure.recentCurrent)>stats.recentLimitBytes)return;
  if(pressure.additionalBytes>stats.limitBytes)return;
  // Live usage: what earlier listeners already freed is not reclaimed again.
  let lacking=stats.bytes+pressure.additionalBytes-stats.limitBytes;
  for(const [sha,hold]of [...holds]){
   if(lacking<=0)return;
   if(hold.session!==session||busy(sha,session))continue;
   lacking-=hold.reservation.bytes;retentionEvictions++;drop(sha);
  }
 }
 async function input(d:FrozenInitializerDescriptor,session:Session):Promise<Uint8Array>{
  session.controller.signal.throwIfAborted();const cached=raw.get(d.sha256);if(cached)return cached;
  const inflight=physical.get(d.sha256);if(inflight?.session===session)return inflight.promise;
  const entry={session,promise:undefined as unknown as Promise<Uint8Array>};
  entry.promise=(async()=>{
   const signal=session.controller.signal,p=d.transport??d;let ownPhysical=0;
   declaredInFlightRawBytes+=d.bytes;live();reads++;
   try{
    const bytes=await abortable(()=>session.read(p.path,signal,p.bytes),signal);signal.throwIfAborted();
    if(bytes.byteLength!==p.bytes)throw Error('Frozen table byte count mismatch');ownPhysical=bytes.byteLength;activePhysicalBytes+=ownPhysical;live();
    if(await hash(bytes)!==p.sha256)throw Error('Frozen table hash mismatch');signal.throwIfAborted();
    const value=d.transport?await inflateBounded3DGzip(bytes,d.bytes,signal,d.sha256,LIMIT):bytes.slice();
    signal.throwIfAborted();if(current!==session||session.closed)throw ABORT();
    declaredInFlightRawBytes-=d.bytes;raw.set(d.sha256,value);retainedBytes+=value.byteLength;retain(d,value,session);live();return value;
   }catch(error){declaredInFlightRawBytes-=d.bytes;throw error;}
   finally{activePhysicalBytes-=ownPhysical;}
  })().finally(()=>{if(physical.get(d.sha256)===entry)physical.delete(d.sha256);});
  physical.set(d.sha256,entry);return entry.promise;
 }
 function start(job:Job,session:Session,reading:boolean){
  job.queued=false;running.add(job);notifyPressure();if(reading)readers++;else consumerRuns++;
  peakInitializers=Math.max(peakInitializers,running.size);peakModules=Math.max(peakModules,new Set([...running].map(row=>row.file)).size);
  void(async()=>{
   const bytes=await input(registry.get(job.sha)!,session);session.controller.signal.throwIfAborted();if(current!==session||session.closed)throw ABORT();
   const parseStart=performance.now(),value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));parses++;
   recordResolved(job,bytes.byteLength,session.id,parseStart,performance.now());
   chargeParsed(value,bytes.byteLength,job,session);
   done.add(job.key);jobs.delete(job.key);consumed.set(job.sha,(consumed.get(job.sha)??0)+1);
   if(unheld.has(job.sha)||!remaining(job.sha,session))drop(job.sha);
   job.resolve(value);notifySettled(session);
  })().catch(error=>{if(current===session&&!session.closed)failure(session,error);}).finally(()=>{running.delete(job);notifyPressure();if(reading)readers--;if(jobs.has(job.key))enqueue(job);pump();});
 }
 function pump(){
  const session=current;if(!session||session.closed)return;
  // Consumers first: their verified input is retained, they only parse.
  for(let at=0;at<queue.length;){const job=queue[at];if(allowed(job,session)&&raw.has(job.sha)){queue.splice(at,1);start(job,session,false);}else at++;}
  // Then at most two reads. A job whose table this session is already reading
  // stays queued and consumes once that input is retained.
  while(readers<2){
   const at=queue.findIndex(job=>allowed(job,session)&&!raw.has(job.sha)&&physical.get(job.sha)?.session!==session);if(at<0)return;
   start(queue.splice(at,1)[0],session,true);
  }
 }
 function read(sha:string,file:string,occurrence=0):Promise<any>{
  if(!registry.has(sha)||!/^painted\/(?:root500|delegated500|tier300|church|city|infill|bremen)\/safety\/[A-Za-z0-9_.-]+\.ts$/.test(file)||!Number.isSafeInteger(occurrence)||occurrence<0)throw Error('Invalid frozen module initializer');
  const key=sha+'|'+file+'|'+occurrence;if(done.has(key))throw Error('Frozen initializer evaluated more than once');
  const existing=jobs.get(key);if(existing)return existing.promise;
  const job:Job={key,sha,file,occurrence,queued:false,promise:undefined as unknown as Promise<any>,resolve:()=>{}};job.promise=new Promise(resolve=>job.resolve=resolve);jobs.set(key,job);enqueue(job);if(current&&!allowed(job,current))failure(current,Error('Frozen initializer is outside the selected provider graph'));pump();return job.promise;
 }
 function begin(read:Reader,signal:AbortSignal,selection:FrozenInitializerSelection,onFailure?:(error:unknown)=>void,ledger?:FrozenInitializerLedger):FrozenInitializerSession{
  signal.throwIfAborted();const allow=new Map<string,Map<string,number>>();let selectedTotal=0,shared=0;const sizes:number[]=[];
  if(ledger!==undefined&&(typeof ledger?.adopt!=='function'||typeof ledger.budget?.tryReserve!=='function'||typeof ledger.budget.onPressure!=='function'))throw TypeError('Frozen initializer ledger requires the page budget and an input adopter');
  for(const sha of selection.tables){const d=registry.get(sha),refs=selection.initializers?.[sha];if(!d||!refs)throw Error('Unknown frozen initializer selection');const rows=new Map<string,number>();let count=0;
   for(const [file,n]of Object.entries(refs)){if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid frozen initializer count');rows.set(file,n);count+=n;}
   allow.set(sha,rows);const all=expected.get(sha)??new Map<string,number>();for(const [file,n]of rows)all.set(file,n);expected.set(sha,all);selectedTotal+=d.bytes;sizes.push(d.bytes);if(count>1)shared+=d.bytes;
  }
  if(current)stop(current,ABORT());sizes.sort((a,b)=>b-a);selectedRawByteBudget=selectedTotal;selectedRawInputBound=(sizes[0]??0)+(sizes[1]??0)+shared;
  let reject!:(error:unknown)=>void;const failed=new Promise<never>((_resolve,no)=>reject=no);void failed.catch(()=>{});
  const session:Session={id:++epoch,read,controller:new AbortController(),allowed:allow,failure:failed,reject,closed:false,ended:undefined,removeAbort:()=>{},removePressure:()=>{},onFailure,ledger,settled:new Set()};
  const canceled=()=>stop(session,signal.reason??ABORT());
  current=session;signal.addEventListener('abort',canceled,{once:true});session.removeAbort=()=>signal.removeEventListener('abort',canceled);
  if(signal.aborted)canceled();else pump();
  return{
   get active(){return current===session&&!session.closed;},
   wait<T>(operation:Promise<T>):Promise<T>{return Promise.race([operation,session.failure]);},
   settled(waitSignal:AbortSignal):Promise<void>{
    if(waitSignal?.aborted)return Promise.reject(waitSignal.reason??ABORT());
    if(session.closed)return Promise.reject(session.ended);
    if(!pendingFor(session))return Promise.resolve();
    return new Promise<void>((resolve,reject)=>{
     let finished=false;
     const finish=(error?:unknown)=>{if(finished)return;finished=true;session.settled.delete(waiter);waitSignal?.removeEventListener('abort',abort);if(error===undefined)resolve();else reject(error);};
     const waiter:SettledWaiter={resolve:()=>finish(),reject:error=>finish(error)},abort=()=>finish(waitSignal.reason??ABORT());
     session.settled.add(waiter);waitSignal?.addEventListener('abort',abort,{once:true});
    });
   },
   close(){stop(session,ABORT());},
  };
 }
 return{read,begin,get stats(){return{retainedBytes,retainedTables:raw.size,active:running.size,activeReads:readers,consumerRuns,activeModules:new Set([...running].map(job=>job.file)).size,peakConcurrency:peakInitializers,peakConcurrentModules:peakModules,queued:queue.length,pendingInitializers:jobs.size,completedInitializers:done.size,reads,parses,failures,sessionActive:Boolean(current&&!current.closed),settledWaiters:current?.settled.size??0,declaredInFlightRawBytes,activePhysicalBytes,peakPhysicalBytes,peakRetainedBytes,peakLiveRawInputBytes,selectedRawByteBudget,selectedRawInputBound,inputRepresentation:'verified-utf8-streamed-initializers',parsedValuesShared:false,ownedTimers:0,
  retention:{holds:holds.size,heldBytes:heldBytes(),peakHeldBytes:peakRetentionHeldBytes,unheldTables:unheld.size,adoptions:retentionAdoptions,reservations:retentionReservations,refusals:retentionRefusals,evictions:retentionEvictions,releases:retentionReleases,measurement:'logical page-ledger claims of verified inputs kept for remaining initializers plus one next-parse working copy; parsed module values are charged separately (parsedRetention)' as const},
  parsedRetention:{claims:parsedClaims.length,retainedParsedEstimateBytes,unheldParsed,unheldParsedBytes,unledgeredParsed,unledgeredParsedBytes,measurement:'page-lifetime metadata estimates of parsed module values (the ledger estimate of the exported value, else its input size), charged once when parsed and never released; refused or ledger-less values are only counted' as const},
  resolvedInputs:{scope:'cumulative-logical-json-input-not-retained-heap',performanceTimeOriginMs:performance.timeOrigin,resolvedJSONBytes,firstResolveMs,lastResolveMs,maxDecodeParseMs,byProvider:Object.fromEntries(Object.entries(resolvedByProvider).map(([provider,value])=>[provider,{...value}])),largest:largestResolvedInputs.map(value=>({...value})),limit:8}};}};
}
