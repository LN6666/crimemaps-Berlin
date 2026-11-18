import type {ResourceBudget} from './render-runtime/resource-budget';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {environmentAdmissionError,EnvironmentResourcePendingError} from './environment-resource-budget';

export type GroundChunkPermit=Readonly<{channel:string;release():void}>;
type Waiter={channel:string;signal:AbortSignal;abort:()=>void;resolve:(permit:GroundChunkPermit)=>void;reject:(reason:unknown)=>void};
const aborted=(signal:AbortSignal)=>signal.reason??new DOMException('Ground chunk request cancelled','AbortError');
const stopped=()=>new DOMException('Ground chunk gate destroyed','AbortError');
const overflow=()=>Object.assign(new Error('Ground chunk retry exceeded its four distinct availability states'),{code:'GROUND_AVAILABILITY_STATE_OVERFLOW'});

/** FIFO permit for the ONE green-or-hard decoded chunk. Acquire BEFORE reading
 * and decoding a mesh; keep it through the GPU fence and release only with the
 * target's source ACK. This gate shares the page's existing budget; it admits
 * no bytes and introduces neither a private queue of work nor a timer. */
export function createGroundChunkTurnstile(wake:()=>void,budget:ResourceBudget,store:ChunkResourceStore){
 if(typeof wake!=='function'||!budget||typeof budget.onAvailable!=='function'||!budget.stats||!store||store.budget!==budget||typeof store.createAvailabilityTracker!=='function')throw new TypeError('Ground chunk gate requires the existing page budget and store');
 type Tracker=ReturnType<ChunkResourceStore['createAvailabilityTracker']>;
 const queue:Waiter[]=[],initializers=new Set<()=>void>(),channels=new Set<string>(),retries=new Set<()=>void>();
 let owner:{channel:string;token:object}|undefined,budgetWaiters=0,tracker:Tracker|undefined,trackerUsers=0,creatingTracker=false,destroyed=false,lastRetryFailure:string|undefined;
 const notify=()=>{try{wake();}catch{/* Owner work must not strand a granted permit. */}};
 function pump(){
  while(!destroyed&&!owner&&queue.length){
   const item=queue.shift()!;item.signal.removeEventListener('abort',item.abort);
   if(item.signal.aborted){item.reject(aborted(item.signal));continue;}
   const token={};owner={channel:item.channel,token};let held=true;
   const permit:GroundChunkPermit=Object.freeze({channel:item.channel,release(){
    if(!held)return;held=false;if(owner?.token!==token)throw Error('Ground chunk permit owner differs');
    owner=undefined;pump();notify();
   }});
   item.resolve(permit);
  }
 }
 function acquire(channel:string,signal:AbortSignal):Promise<GroundChunkPermit>{
  if(typeof channel!=='string'||!channel||channel.length>64)throw new TypeError('Valid ground chunk channel required');
  if(!signal||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean')throw new TypeError('Ground chunk acquisition requires AbortSignal');
  if(destroyed)return Promise.reject(stopped());
  if(signal.aborted)return Promise.reject(aborted(signal));
  // A retiring owner and its next generation may coexist, but there may be at
  // most one queued request per channel. Cancellation removes its queue entry.
  if(queue.some(item=>item.channel===channel))throw Error('Ground chunk channel already waiting');
  return new Promise((resolve,reject)=>{
   const item:Waiter={channel,signal,resolve,reject,abort(){
    const at=queue.indexOf(item);if(at<0)return;queue.splice(at,1);signal.removeEventListener('abort',item.abort);reject(aborted(signal));pump();notify();
   }};
   queue.push(item);signal.addEventListener('abort',item.abort,{once:true});
   if(signal.aborted)item.abort();else pump();
  });
 }
 function waitForBudgetChange(signal:AbortSignal):Promise<void>{
  if(!signal||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean')throw new TypeError('Ground chunk budget wait requires AbortSignal');
  if(signal.aborted)return Promise.reject(aborted(signal));
  // Controllers call this ONLY after releasing a refused decoded borrow and its
  // permit. ResourceBudget emits availability synchronously: installing here
  // excludes the self-release wave, so it cannot create a retry/busy loop.
  // If there is no later external capacity change, remain explicitly pending.
  return new Promise((resolve,reject)=>{
   let off:()=>void=()=>{},done=false;budgetWaiters++;
   const finish=(ok:boolean,reason?:unknown)=>{
    if(done)return;done=true;budgetWaiters--;
    try{off();}catch(error){if(ok){ok=false;reason=error;}}finally{signal.removeEventListener('abort',onAbort);}
    ok?resolve():reject(reason);
   };
   const onAbort=()=>finish(false,aborted(signal));
   signal.addEventListener('abort',onAbort,{once:true});
   try{off=budget.onAvailable(()=>finish(true));if(done)off();else if(signal.aborted)onAbort();}
   catch(error){finish(false,error);}
  });
 }
 // Wait for either a ledger availability event OR another channel successfully
 // creating the one shared tracker. A cancelled waiter removes both listeners.
 function waitForTracker(signal:AbortSignal):Promise<void>{
  if(destroyed)return Promise.reject(stopped());if(signal.aborted)return Promise.reject(aborted(signal));
  return new Promise((resolve,reject)=>{
   let done=false,off=()=>{};budgetWaiters++;
   const finish=(error?:unknown)=>{if(done)return;done=true;budgetWaiters--;initializers.delete(onWake);signal.removeEventListener('abort',onAbort);try{off();}catch(e){error??=e;}error===undefined?resolve():reject(error);};
   const onWake=()=>finish(destroyed?stopped():undefined),onAbort=()=>finish(aborted(signal));
   initializers.add(onWake);signal.addEventListener('abort',onAbort,{once:true});
   try{off=budget.onAvailable(onWake,signal);if(done)off();else if(destroyed||tracker)onWake();else if(signal.aborted)onAbort();}catch(error){finish(error);}
  });
 }
 /** One bounded history belongs to one channel's chunk. The tracker's fixed
  * original-budget claim includes two histories and capture scratch. A chunk
  * that succeeds first time never creates the tracker or spends its 4 MiB. */
 async function createBudgetRetry(channel:'green'|'hard',signal:AbortSignal){
  if(!signal||typeof signal.addEventListener!=='function'||typeof signal.removeEventListener!=='function'||typeof signal.aborted!=='boolean')throw new TypeError('Ground chunk retry requires AbortSignal');
  if(channel!=='green'&&channel!=='hard')throw new TypeError('Ground chunk retry channel must be green or hard');
  if(destroyed)throw stopped();if(signal.aborted)throw aborted(signal);
  if(channels.has(channel))throw Error('Ground chunk channel already has a retry tracker');channels.add(channel);
  let active=false,closed=false,cancelActive:(()=>void)|undefined,current:Tracker|undefined,seen:Set<string>|undefined;
  const releaseTracker=(held:Tracker)=>{trackerUsers--;if(!trackerUsers&&tracker===held){tracker=undefined;held.release();}};
  const release=()=>{
   if(closed)return;closed=true;signal.removeEventListener('abort',release);cancelActive?.();seen?.clear();retries.delete(release);channels.delete(channel);
   if(current){const held=current;current=undefined;releaseTracker(held);}
  };
  retries.add(release);signal.addEventListener('abort',release,{once:true});if(signal.aborted)release();
  if(closed)throw aborted(signal);
  async function attachTracker():Promise<void>{
   try{
    while(!tracker){
     if(closed||destroyed)throw signal.aborted?aborted(signal):stopped();
     if(creatingTracker){await waitForTracker(signal);continue;}
     let pending=false;creatingTracker=true;
     try{
      const candidate=store.createAvailabilityTracker();
      // The real pressure callback may synchronously cancel this generation or
      // destroy the renderer before the reservation returns.
      if(closed||destroyed||signal.aborted){candidate.release();throw signal.aborted?aborted(signal):stopped();}
      tracker=candidate;
     }catch(error){const refusal=environmentAdmissionError(error,'ground availability tracker');if(!(refusal instanceof EnvironmentResourcePendingError))throw refusal??error;pending=true;}
     finally{creatingTracker=false;}
     if(tracker)for(const notify of [...initializers])notify();else if(pending)await waitForTracker(signal);
    }
    if(closed||destroyed||signal.aborted)throw signal.aborted?aborted(signal):stopped();
    current=tracker;trackerUsers++;seen=new Set<string>();
   }catch(error){if(!trackerUsers&&tracker){const orphan=tracker;tracker=undefined;orphan.release();}throw error;}
  }
  function afterRelease(cleanup:()=>void):Promise<void>{
   if(typeof cleanup!=='function')throw new TypeError('Ground chunk retry cleanup required');
   if(closed){try{cleanup();}catch(error){return Promise.reject(error);}return Promise.reject(signal.aborted?aborted(signal):stopped());}
   if(active)throw Error('Ground chunk retry is already waiting');active=true;
   if(!current){
    // First refusal: release the actual source and FIFO permit before asking
    // the page for tracker memory. The first post-cleanup state is always
    // tried once, so a nested change before tracker creation cannot be lost.
    try{cleanup();}catch(error){active=false;return Promise.reject(error);}
    if(closed||signal.aborted){active=false;return Promise.reject(signal.aborted?aborted(signal):stopped());}
    return attachTracker().then(()=>{active=false;return afterRelease(()=>{});},error=>{active=false;throw error;});
   }
   const observed=current,history=seen!;
   return new Promise((resolve,reject)=>{
    let done=false,queued=false,off:()=>void=()=>{},setupError:unknown,cleanupError:unknown;
    const finish=(ok:boolean,reason?:unknown)=>{
     if(done)return;done=true;active=false;cancelActive=undefined;budgetWaiters--;
     try{off();}catch(error){if(ok){ok=false;reason=error;}}
     ok?resolve():reject(reason);
    };
    cancelActive=()=>finish(false,signal.aborted?aborted(signal):stopped());
    const check=()=>{
     queued=false;if(done)return;
     try{const state=observed.capture();if(history.has(state))return;if(history.size>=4)throw overflow();history.add(state);finish(true);}
     catch(error){lastRetryFailure=String((error as {code?:unknown})?.code??error).slice(0,256);finish(false,error);}
    };
    const schedule=()=>{if(!done&&!queued){queued=true;queueMicrotask(check);}};
    budgetWaiters++;
    // Take both sides of subscription, then always observe the net state after
    // cleanup. Captures are exact, bounded and prepaid by the shared tracker;
    // an overflow or ambiguous graph is a visible failure, not a fingerprint.
    try{observed.capture();off=observed.onChange(schedule,signal);if(done)off();else observed.capture();}catch(error){setupError=error;}
    try{cleanup();}catch(error){cleanupError=error;}
    if(done)return;if(cleanupError!==undefined){finish(false,cleanupError);return;}if(setupError!==undefined){lastRetryFailure=String((setupError as {code?:unknown})?.code??setupError).slice(0,256);finish(false,setupError);return;}
    if(closed||signal.aborted){finish(false,signal.aborted?aborted(signal):stopped());return;}schedule();
   });
  }
  return Object.freeze({afterRelease,release});
 }
 function assertCanEverFitChunk(decodedBytes:number){
  if(!Number.isSafeInteger(decodedBytes)||decodedBytes<=0)throw new TypeError('Invalid decoded ground chunk bytes');
  // CPU and GPU buffers are distinct allocations; the target also requires one
  // VAO. Other retained page/program/target costs only increase this lower bound.
  const minimum=2*decodedBytes+384,limit=budget.stats.limitBytes;
  if(!Number.isSafeInteger(minimum)||!Number.isSafeInteger(limit)||minimum>limit)throw new RangeError('Ground chunk cannot fit the existing page budget');
 }
 function cancelWaiting(channel:string){
  for(let i=queue.length-1;i>=0;i--){const item=queue[i];if(item.channel!==channel)continue;queue.splice(i,1);item.signal.removeEventListener('abort',item.abort);item.reject(new DOMException('Ground chunk channel cancelled','AbortError'));}
  pump();notify();
 }
 function destroy(){if(destroyed)return;destroyed=true;for(const notify of [...initializers])notify();for(const item of queue.splice(0)){item.signal.removeEventListener('abort',item.abort);item.reject(stopped());}for(const release of [...retries])release();notify();}
 return Object.freeze({acquire,createBudgetRetry,waitForBudgetChange,assertCanEverFitChunk,cancelWaiting,destroy,
  get stats(){return {owner:owner?.channel,waiting:queue.map(item=>item.channel),budgetWaiters,trackerUsers,trackerReady:!!tracker,lastRetryFailure,residentDecodedChunkLimit:1,residentSubmittedMeshLimit:1,vertices:20000,indices:60000};}});
}

/** @deprecated The enqueue-only wrapper admitted two decoded chunks. Callers
 * must use acquire before source.decoded and release at the target fence ACK. */
export function withGroundChunkTurnstile<T>(_target:T,_gate:ReturnType<typeof createGroundChunkTurnstile>,_channel:string):T{
 throw Error('The enqueue-only ground chunk gate is unsafe; acquire a decode permit instead');
}
