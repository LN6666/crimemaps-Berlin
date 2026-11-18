/** The publication identity belongs to a single attempt of the current view. */
export type ViewportPublicationAttempt={signal:AbortSignal;current:()=>void;isCurrent:()=>boolean};
type Publish=(attempt:ViewportPublicationAttempt)=>void|Promise<void>;

const adjacentPublications=new WeakMap<AbortSignal,AbortSignal>();
/** Available only inside the predecessor's synchronous abort notification.
 * Consumers may retain the successor signal for one bounded resource handoff;
 * viewport cancellation and publication failure never create this association. */
export function adjacentViewportPublicationSignal(signal:AbortSignal):AbortSignal|undefined{
 const successor=adjacentPublications.get(signal);
 return successor&&!successor.aborted?successor:undefined;
}

/** A read failure cancels only its sibling readers, then drains their cleanup.
 * Keep the first reason before aborting: a sibling may reject with AbortError
 * instead of the source error or cohort-yield object that cancelled the group.
 * The parent still owns publication, retained source roles and cohort retries. */
export async function runAbortableReaders<T>(parent:AbortSignal,readers:readonly ((signal:AbortSignal)=>Promise<T>)[]):Promise<T[]>{
 parent.throwIfAborted();
 const own=new AbortController();let failed=false,failure:unknown;
 const fail=(error:unknown)=>{if(failed)return;failed=true;failure=error;own.abort(error);};
 const aborted=()=>fail(parent.reason);
 parent.addEventListener('abort',aborted,{once:true});
 try{
  if(parent.aborted)aborted();
  const results=await Promise.allSettled(readers.map(async read=>{
   try{own.signal.throwIfAborted();const value=await read(own.signal);own.signal.throwIfAborted();return value;}
   catch(error){fail(error);throw error;}
  }));
  if(failed)throw failure;
  return results.map(result=>(result as PromiseFulfilledResult<T>).value);
 }finally{parent.removeEventListener('abort',aborted);}
}

/** Keep one mode intent alive while its obsolete viewport attempts are cancelled. */
export function createViewportRequestContinuation(isMoving:()=>boolean){
 let active:AbortController|undefined,activeView:AbortController|undefined,moving=false,hidden=false,blocked=false,settled:(()=>void)|undefined;
 const superseded=new DOMException('Viewport superseded','AbortError');
 const pending=()=>blocked||Boolean(active&&!active.signal.aborted);

 async function waitForViewport(signal:AbortSignal):Promise<void>{
  signal.throwIfAborted();
  while(hidden||moving||isMoving()){
   await new Promise<void>((resolve,reject)=>{
    const cleanup=()=>{if(settled===wake)settled=undefined;signal.removeEventListener('abort',aborted);};
    const wake=()=>{cleanup();resolve();},aborted=()=>{cleanup();reject(signal.reason);};
    settled=wake;signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
   });
   signal.throwIfAborted();
  }
 }

 return {
  async run<T>(external:AbortSignal,waitForStableView:boolean,attempt:(view:AbortController)=>Promise<T>):Promise<T>{
   external.throwIfAborted();active?.abort();if(blocked)moving=isMoving();blocked=false;
   const intent=active=new AbortController();
   const cancel=()=>{intent.abort(external.reason);if(active===intent)blocked=true;};
   external.addEventListener('abort',cancel,{once:true});if(external.aborted)cancel();
   try{
    for(;;){
     intent.signal.throwIfAborted();
     if(waitForStableView)await waitForViewport(intent.signal);
     intent.signal.throwIfAborted();
     if(waitForStableView&&(hidden||moving||isMoving()))continue;
     const view=activeView=new AbortController(),cancelView=()=>view.abort(intent.signal.reason);
     intent.signal.addEventListener('abort',cancelView,{once:true});
     try{
      const result=await attempt(view);
      intent.signal.throwIfAborted();
      // A producer may settle successfully after its consumer was superseded.
      // Such a result is not publication for the latest wanted view.
      view.signal.throwIfAborted();
      return result;
     }
     catch(error){
      // Only our own viewport/visibility interruption continues the same mode intent.
      // A genuine source/material/publication failure must not be swallowed
      // merely because a visibility event also happened during that callback.
      if(!intent.signal.aborted&&view.signal.aborted&&view.signal.reason===superseded&&
       (error===superseded||error instanceof DOMException&&error.name==='AbortError'))continue;
      throw error;
     }finally{intent.signal.removeEventListener('abort',cancelView);if(activeView===view)activeView=undefined;}
    }
   }finally{external.removeEventListener('abort',cancel);if(active===intent)active=undefined;}
  },
  invalidateViewport(view:AbortController){moving=true;view.abort(superseded);},
  /** Visibility cancels preparation, while the original mode intent waits for show. */
  setHidden(value:boolean,view:AbortController|undefined=activeView){
   hidden=value;
   if(value)view?.abort(superseded);
   else{moving=isMoving();settled?.();}
   return pending();
  },
  /** A pending mode intent is the sole continuation; idle viewport refresh stays in the adapter. */
  settleViewport(){moving=false;settled?.();return pending();},
  get refreshBlocked(){return blocked;},
  cancel(){active?.abort();},
  resume(){moving=isMoving();blocked=false;},

  /** Coalesce publication on this view; this is not a second fetch or preparation queue. */
  publication(signal:AbortSignal,assertCurrent:()=>void){
   let timer:ReturnType<typeof setTimeout>|undefined,stopped=false,closed=false,lastCommit=0,latest:AbortController|undefined;
   const work=new Map<Promise<void>,AbortController>();
   const preparationWork=new Map<AbortSignal,Set<Promise<unknown>>>();
   let staged:{publish:Publish;onError:(error:unknown)=>void}|undefined;
   const current=()=>{signal.throwIfAborted();assertCurrent();};
   const isCurrent=()=>{try{current();return true;}catch{return false;}};
   const clearTimer=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
   const run=(publish:Publish,onError?:(error:unknown)=>void):Promise<void>=>{
    if(closed)throw new DOMException('Publication closed','AbortError');
    current();
    const previous=latest,own=latest=new AbortController(),cancel=()=>own.abort(signal.reason);
    signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
    const check=()=>{own.signal.throwIfAborted();current();};
    const preparations=new Set<Promise<unknown>>();preparationWork.set(own.signal,preparations);
    const attempt:ViewportPublicationAttempt={signal:own.signal,current:check,isCurrent:()=>{try{check();return true;}catch{return false;}}};
    // Completed resident callbacks retain this identity until the next commit/view.
    own.signal.addEventListener('abort',()=>signal.removeEventListener('abort',cancel),{once:true});
    if(previous&&!previous.signal.aborted){
     adjacentPublications.set(previous.signal,own.signal);
     try{previous.abort(superseded);}finally{adjacentPublications.delete(previous.signal);}
    }
    // Aborting the predecessor is synchronous, but its resource cleanup can
    // still be unwinding asynchronously. Keep the adjacent-signal handoff
    // above, then drain that work before allocating the replacement's inputs.
    const predecessors=[...work.keys()];
    const operation=Promise.allSettled(predecessors).then(()=>{check();return publish(attempt);});
    const result=operation.then(()=>{check();lastCommit=performance.now();}).catch(error=>{
     // Report before cancellation changes currentness. Abort producers before
     // draining them: a draw deadline may win while CPU preparation still runs.
     try{if(onError&&attempt.isCurrent()&&!(error instanceof DOMException&&error.name==='AbortError'))onError(error);}
     catch{/* A reporting callback must not replace the original failure. */}
     finally{own.abort(error);}
     throw error;
    }).finally(async()=>{
     try{await Promise.allSettled([...preparations]);}
     finally{preparationWork.delete(own.signal);}
    });
    work.set(result,own);void result.finally(()=>{work.delete(result);scheduleStaged();}).catch(()=>{});
    return result;
   };
   const cooldown=()=>new Promise<void>((resolve,reject)=>{
    const remaining=50-(performance.now()-lastCommit);if(remaining<=0){resolve();return;}
    const cleanup=()=>signal.removeEventListener('abort',aborted);
    const aborted=()=>{clearTimeout(delay);cleanup();reject(signal.reason);};
    const delay=setTimeout(()=>{cleanup();resolve();},remaining);
    signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
   });
   function scheduleStaged(){
    if(stopped||!staged||timer!==undefined||work.size||!isCurrent())return;
    timer=setTimeout(()=>{
     timer=undefined;
     if(stopped||!isCurrent()){staged=undefined;return;}
     if(work.size)return;
     const next=staged;staged=undefined;if(!next)return;
     try{void run(next.publish,next.onError);}catch(error){if(isCurrent())next.onError(error);}
    },Math.max(16,50-(performance.now()-lastCommit)));
   }
   return {
    current,isCurrent,
    trackPreparation(attempt:ViewportPublicationAttempt,pending:Promise<unknown>){
     const preparations=preparationWork.get(attempt.signal);
     if(!preparations)throw Error('Publication preparation has no live owner');
     preparations.add(pending);
     void pending.then(()=>preparations.delete(pending),()=>preparations.delete(pending));
    },
    stage(publish:Publish,onError:(error:unknown)=>void=()=>{}){
     if(stopped||!isCurrent())return;
     // One latest update for this unchanged viewport, not a new preparation
     // every time another source finishes while the previous draw is pending.
     staged={publish,onError};scheduleStaged();
    },
    async finish(publish:Publish){clearTimer();staged=undefined;stopped=true;await cooldown();current();await run(publish);},
    async close(){closed=true;stopped=true;staged=undefined;clearTimer();for(const controller of work.values())controller.abort(superseded);await Promise.allSettled([...work.keys()]);},
   };
  },
 };
}

/** Clear the last consumer's references before releasing its final preparation pin. */
export function createPreparedConsumerLifetime<T extends object>(retire:(value:T)=>void){
 const consumers=new WeakMap<T,number>();
 return {
  count(value:T){return consumers.get(value)??0;},
  retire(value:T){if(!consumers.has(value))retire(value);},
  retain(value:T,retainPin:()=>()=>void){
   const unpin=retainPin();consumers.set(value,(consumers.get(value)??0)+1);let released=false;
   return()=>{if(released)return;released=true;const remaining=(consumers.get(value)??1)-1;if(remaining>0)consumers.set(value,remaining);else{consumers.delete(value);retire(value);}unpin();};
  },
 };
}
import type {ChunkResourceLease, ChunkResourceRole} from './render-runtime/chunk-resource-types';


/** A manager's current demand contains leases, never a decoded/LRU cache.
 * Production, sharing, pressure and recent retention belong to the page store.
 * Undefined projection keeps demand; an explicit empty set retires this role.
 */
export function createWantedResourceLeases<D, T>(options: {
 key(descriptor:D):string;
 acquire(descriptor:D):ChunkResourceLease<T>;
}) {
 const held=new Map<string,ChunkResourceLease<T>>();
 let latest:Map<string,D>|undefined,version=0,scheduled=false,destroyed=false;
 let beforeRelease:((keys:readonly string[])=>void)|undefined;
 let failure:unknown,failed=false;
 const superseded=()=>new DOMException('Wanted resource set superseded','AbortError');
 function flush() {
  scheduled=false;
  if(destroyed||!latest)return;
  const next=latest,prepareRelease=beforeRelease;latest=undefined;beforeRelease=undefined;failure=undefined;failed=false;
  // Only the coalesced final transition may set focus-exit grace. In particular,
  // an obsolete intermediate pan must not change retained resources' deadlines.
  try{prepareRelease?.([...held].filter(([key,lease])=>!next.has(key)&&!lease.released).map(([key])=>key));}
  catch(error){next.clear();failure=error;failed=true;return;}
  // Published/capture/picking roles have their own retained leases. Removing
  // only manager demand cannot release another consumer's old drawable scene.
  for(const [key,lease] of held)if(!next.has(key)||lease.released||lease.state==='failed'||lease.state==='lost'||lease.state==='retiring'||lease.state==='released'){held.delete(key);lease.release();}
  try {
   for(const [key,descriptor] of next)if(!held.has(key)) {
    const lease=options.acquire(descriptor);
    if(lease.contentKey!==key){lease.release();throw Error('Wanted source lease content identity mismatch');}
    held.set(key,lease);
   }
  } catch(error) {failure=error;failed=true;}
  // Do not retain caller descriptors (which can contain entire component
  // tables) after the store has taken the required production descriptors.
  next.clear();
 }
 return {
  reconcile(wanted:readonly D[]|undefined,transition?:{beforeRelease:(keys:readonly string[])=>void}) {
   if(destroyed)throw new DOMException('Resource demand destroyed','AbortError');
   if(wanted===undefined)return version;
   const next=new Map<string,D>();
   for(const descriptor of wanted){const key=options.key(descriptor);if(!key||key.length>16384)throw Error('Invalid wanted resource identity');next.set(key,descriptor);}
   latest?.clear();latest=next;beforeRelease=transition?.beforeRelease;version++;
   // Coalescing only the latest set is not another production queue or timer.
   if(!scheduled){scheduled=true;queueMicrotask(flush);}
   return version;
  },
  async ready(signal?:AbortSignal):Promise<void> {
   signal?.throwIfAborted();flush();if(failed)throw failure;
   const expected=version,leases=[...held.values()];
   await new Promise<void>((resolve,reject)=>{
    const cleanup=()=>signal?.removeEventListener('abort',abort);
    const abort=()=>{cleanup();reject(signal?.reason??superseded());};
    signal?.addEventListener('abort',abort,{once:true});
    void Promise.all(leases.map(lease=>lease.ready)).then(()=>{cleanup();resolve();},error=>{cleanup();reject(error);});
    if(signal?.aborted)abort();
   });
   signal?.throwIfAborted();
   if(destroyed||expected!==version)throw superseded();
   for(const lease of held.values())if(lease.released||lease.value===undefined)throw Error('Wanted source production has no live value');
  },
  async value(contentKey:string,signal?:AbortSignal):Promise<T> {
   signal?.throwIfAborted();flush();if(failed)throw failure;
   const lease=held.get(contentKey);
   if(destroyed||!lease||lease.released)throw superseded();
   await new Promise<void>((resolve,reject)=>{
    const cleanup=()=>signal?.removeEventListener('abort',abort);
    const abort=()=>{cleanup();reject(signal?.reason??superseded());};
    signal?.addEventListener('abort',abort,{once:true});
    void lease.ready.then(()=>{cleanup();resolve();},error=>{cleanup();reject(error);});
    if(signal?.aborted)abort();
   });
   signal?.throwIfAborted();flush();if(failed)throw failure;
   // Changes elsewhere in demand do not invalidate an intersecting leaf.
   if(destroyed||held.get(contentKey)!==lease||lease.released)throw superseded();
   const value=lease.value;if(value===undefined)throw Error('Wanted source production has no live value');
   return value;
  },
  retain(contentKey:string,role:ChunkResourceRole):ChunkResourceLease<T> {
   flush();if(failed)throw failure;
   const lease=held.get(contentKey);
   if(destroyed||!lease||lease.released)throw superseded();
   return lease.retain(role);
  },
  get keys(){flush();return [...held.keys()];},
  get revision(){return version;},
  destroy(){if(destroyed)return;destroyed=true;version++;latest?.clear();latest=undefined;beforeRelease=undefined;failure=undefined;failed=false;for(const lease of held.values())lease.release();held.clear();},
 };
}
