/** The callback includes admission, CPU preparation and its local cancellation drain. */
export type VisiblePreparationRun=<T>(signal:AbortSignal,work:()=>Promise<T>)=>Promise<T>;
export type PreparationProvider='city'|'root500'|'tier300'|'delegated500'|'church'|'bremen'|'infill';
const providers=new Set<PreparationProvider>(['city','root500','tier300','delegated500','church','bremen','infill']);
const aborted=()=>new DOMException('Aborted','AbortError');
/** One page's visible-preparation budget. This does not schedule GL restoration or material callbacks. */
export function createVisiblePreparationGate(){
 type Job={provider:PreparationProvider;signal:AbortSignal;start:()=>void;cancel:()=>void};
 const pending=new Map<PreparationProvider,Job>();
 let active:Job|undefined,destroyed=false,peakActive=0,peakQueued=0;
 function pump(){
  if(destroyed||active)return;
  const job=pending.values().next().value as Job|undefined;if(!job)return;
  pending.delete(job.provider);active=job;peakActive=1;job.start();
 }
 function run<T>(provider:PreparationProvider,signal:AbortSignal,work:()=>Promise<T>):Promise<T>{
  if(destroyed||signal.aborted)return Promise.reject(signal.reason??aborted());
  if(!providers.has(provider))return Promise.reject(Error('Unknown preparation provider'));
  return new Promise<T>((resolve,reject)=>{
   const previous=pending.get(provider);previous?.cancel();
   const cleanup=()=>signal.removeEventListener('abort',job.cancel);
   const finish=()=>{cleanup();if(active===job)active=undefined;queueMicrotask(pump);};
   const job:Job={provider,signal,
    cancel(){
     // The owner aborts active work. Do not release this slot before its finally/drain settles.
     if(active===job)return;
     if(pending.get(provider)===job)pending.delete(provider);
     cleanup();reject(signal.reason??aborted());
    },
    start(){
     void Promise.resolve().then(()=>{signal.throwIfAborted();return work();}).then(
      value=>{finish();if(signal.aborted)reject(signal.reason??aborted());else resolve(value);},error=>{finish();reject(error);},
     );
    },
   };
   pending.set(provider,job);peakQueued=Math.max(peakQueued,pending.size);
   signal.addEventListener('abort',job.cancel,{once:true});if(signal.aborted)job.cancel();pump();
  });
 }
 return {run,get idle(){return !active&&pending.size===0;},get stats(){return {active:active?1:0,queued:pending.size,peakActive,peakQueued};},
  destroy(){if(destroyed)return;destroyed=true;for(const job of [...pending.values()])job.cancel();pending.clear();},
 };
}
