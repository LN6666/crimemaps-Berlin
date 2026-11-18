/** MapLibre custom layers are omitted from the style restored after context loss.
 * Owners retain source CPU/cache/selection identity and decide which layers exist.
 * This module never reads renderer internals, resets depth, or changes map data. */
export type RecoveryMap={
 on(type:string,fn:()=>void):void;off(type:string,fn:()=>void):void;
 isStyleLoaded():boolean;getLayer(id:string):unknown;
 addLayer(layer:{id:string},beforeId?:string):unknown;removeLayer(id:string):unknown;triggerRepaint():void;
};
export type RecoverableCustomLayer={layer:{id:string};beforeId?:()=>string|undefined};
export type RecoveryReadyProvider={
 provider:string;managerPresent:boolean;rendererPresent:boolean;mode?:string;wantedMode?:string;
 ready:boolean;preparing:boolean;failure?:string;generation?:number|null;viewRevision?:number|null;
 preparation?:{pending:number|null;failed:number|null;ready:number|null;waitingForBudget:boolean|null;jobs:readonly {resource?:string;phase?:string;priority?:string;queuedAtMs:number|null;startedAtMs:number|null}[]};
 manager?:{ticket?:number|null;phase?:string;stage?:string;expectedGeneration?:number|null;publishedGeneration?:number|null;published?:boolean|null;mainReady?:boolean|null;startedAtMs?:number|null;observedAtMs?:number|null;elapsedWallMs?:number|null;visibleBudgetMs?:number|null};
};
export type RecoveryReadySnapshot={ready:boolean;preparing:boolean;failure?:string;mode?:string;wantedMode?:string;providers?:readonly RecoveryReadyProvider[]};
export type RecoveryState='idle'|'lost'|'waiting-style'|'registering'|'waiting-frame'|'ready'|'error'|'timed-out'|'destroyed';
export type RecoveryLossEvent=Readonly<{reason:'context-lost'|'terminal';attemptId:number}>;
export type RecoveryTerminalReason='timeout'|'register-error'|'resume-error'|'is-ready-error'|'on-ready-error'|'on-lost-error';
export type RecoveryErrorInfo={readonly name:string;readonly message:string};
export type RecoveryTerminalSample={readonly utc:string|null;readonly timeOriginMs:number|null;readonly monotonicMs:number|null;readonly wallClockMs:number|null};
export type RecoveryReadyRecord={
 readonly schemaVersion:1;readonly revision:number;readonly attemptId:number;
 readonly at:RecoveryTerminalSample;readonly readinessCapturedAt:RecoveryTerminalSample;
 readonly timing:RecoveryTerminalRecord["timing"];readonly exceededThreshold:boolean;
 readonly readiness?:RecoveryReadySnapshot;readonly diagnosticError?:RecoveryErrorInfo;
};
export type RecoveryTerminalRecord={
 readonly schemaVersion:1;readonly reason:RecoveryTerminalReason;readonly previousState:RecoveryState;readonly revision:number;readonly attemptId:number;
 readonly at:RecoveryTerminalSample;readonly attemptStartedAt:RecoveryTerminalSample|undefined;readonly budgetStartedAt:RecoveryTerminalSample|undefined;
 readonly readinessCapturedAt:RecoveryTerminalSample;readonly onLostErrorAt?:RecoveryTerminalSample;
 readonly timing:{readonly budgetMs:number;readonly wallElapsedMs:number|null;readonly visibleElapsedMs:number;readonly hiddenElapsedMs:number|null;readonly preBudgetElapsedMs:number|null;readonly postBudgetElapsedMs:number;readonly remainingVisibleMs:number;readonly visibleOverrunMs:number;readonly pageHidden:boolean};
 readonly readiness?:RecoveryReadySnapshot;readonly error?:RecoveryErrorInfo;readonly onLostError?:RecoveryErrorInfo;readonly registrationCleanupError?:RecoveryErrorInfo;
 readonly diagnosticError?:RecoveryErrorInfo;readonly publicationError?:RecoveryErrorInfo;
};
export type RecoveryThresholdRecord=Omit<RecoveryTerminalRecord,'reason'> & {readonly reason:'threshold-exceeded';readonly continuing:true};
const finite=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
const boundedText=(value:unknown,limit:number)=>typeof value==='string'?value.slice(0,limit):undefined;
function recoveryError(error:unknown):RecoveryErrorInfo{
 let name='Error',message=error===null?'null':typeof error==='object'||typeof error==='function'?'Non-Error value':String(error);
 if(error&&typeof error==='object'){
  try{name=boundedText((error as {name?:unknown}).name,80)??name;}catch{/* diagnostic getters cannot replace the original error */}
  try{message=boundedText((error as {message?:unknown}).message,512)??message;}catch{/* same boundary */}
 }
 return Object.freeze({name:name.slice(0,80),message:message.slice(0,512)});
}
/** Copy only the small readiness contract, never source arrays, Error objects or owner stats. */
function boundedReadiness(value:RecoveryReadySnapshot):RecoveryReadySnapshot{
 const providers=value.providers?.slice(0,16).map(provider=>{
  const row:RecoveryReadyProvider={provider:boundedText(provider.provider,80)??'unknown',managerPresent:provider.managerPresent===true,rendererPresent:provider.rendererPresent===true,ready:provider.ready===true,preparing:provider.preparing===true,
   mode:boundedText(provider.mode,24),wantedMode:boundedText(provider.wantedMode,24),failure:boundedText(provider.failure,512),generation:finite(provider.generation),viewRevision:finite(provider.viewRevision)};
  if(provider.preparation){
   const source=provider.preparation;
   row.preparation=Object.freeze({pending:finite(source.pending),failed:finite(source.failed),ready:finite(source.ready),waitingForBudget:typeof source.waitingForBudget==='boolean'?source.waitingForBudget:null,
    jobs:Object.freeze((source.jobs??[]).slice(0,8).map(job=>Object.freeze({resource:boundedText(job.resource,160),phase:boundedText(job.phase,40),priority:boundedText(job.priority,24),queuedAtMs:finite(job.queuedAtMs),startedAtMs:finite(job.startedAtMs)})))});
  }
  if(provider.manager){
   const source=provider.manager,manager:NonNullable<RecoveryReadyProvider['manager']>={};
   for(const key of ['ticket','expectedGeneration','publishedGeneration','startedAtMs','observedAtMs','elapsedWallMs','visibleBudgetMs'] as const)if(source[key]!==undefined)manager[key]=finite(source[key]);
   for(const key of ['phase','stage'] as const)if(source[key]!==undefined)manager[key]=boundedText(source[key],80);
   for(const key of ['published','mainReady'] as const)if(source[key]!==undefined)manager[key]=typeof source[key]==='boolean'?source[key]:null;
   row.manager=Object.freeze(manager);
  }
  return Object.freeze(row);
 });
 return Object.freeze({ready:value.ready===true,preparing:value.preparing===true,failure:boundedText(value.failure,512),mode:boundedText(value.mode,24),wantedMode:boundedText(value.wantedMode,24),...(providers?{providers:Object.freeze(providers)}:{})});
}
export function installCustomLayerRecovery(options:{
 map:RecoveryMap;
 /** Registration order: building first, then cars with beforeId=building.id. */
 layers:()=>readonly RecoverableCustomLayer[];
 /** Cancel pending picks/fetches and stop animations; retain committed selection/cache.
  * Only context-lost starts a new loss boundary; terminal repeats suspension for
  * the same attempt and must not accept its failures as an earlier 2D fallback. */
 onLost:(event:RecoveryLossEvent)=>void;
 /** Resume enabled renderers/loaders after registration. Honor cancellation before writes. */
 onLayersRestored:(signal:AbortSignal)=>void|Promise<void>;
 /** Active layers must have rendered the current matrix. Inactive scenes may return true. */
 isReady:()=>boolean;
 /** Invoked at loss/terminal boundaries and once at successful recovery, never on each waiting frame. */
 readReadySnapshot?:()=>RecoveryReadySnapshot;
 /** Last terminal publication is synchronous and independent of map render events. */
 onTerminal?:(record:RecoveryTerminalRecord)=>void;
 onReady?:()=>void;
 /** Visible waiting budget, including a context that never emits restored. */
 timeoutMs?:number;pageHidden?:boolean;onTimeout?:()=>void;
 /** Observation only; does not suspend owners or cancel recovery. */
 onThreshold?:(record:RecoveryThresholdRecord)=>void;
 schedule?:(fn:()=>void,ms:number)=>unknown;cancel?:(handle:unknown)=>void;now?:()=>number;
 onError?:(error:unknown)=>void;
}){
 const {map}=options;let destroyed=false,restored=false,busy=false,registered=false;
 let state:RecoveryState='idle';
 let revision=0,request=new AbortController();
 const budget=options.timeoutMs??12000;if(!Number.isFinite(budget)||budget<=0)throw Error('Invalid map recovery timeout');
 const schedule=options.schedule??((fn:()=>void,ms:number)=>setTimeout(fn,ms)),cancel=options.cancel??(handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)),now=options.now??Date.now;
 let hidden=options.pageHidden??false,timer:unknown,remaining=budget,started=0,watching=false;
 let attemptId=0,attemptStartedAt:RecoveryTerminalSample|undefined,budgetStartedAt:RecoveryTerminalSample|undefined;
 let visibleUsedMs=0,visibleSegmentAt:number|undefined,budgetStoppedAt:number|undefined,attemptLostError:RecoveryErrorInfo|undefined,lastTerminal:RecoveryTerminalRecord|undefined;
 let lastReady:RecoveryReadyRecord|undefined,lastThreshold:RecoveryThresholdRecord|undefined;
 function sample():RecoveryTerminalSample{
  const wallClockMs=finite(now());let utc:string|null=null,timeOriginMs:number|null=null,monotonicMs:number|null=null;
  try{utc=new Date().toISOString();}catch{/* retain an explicit unknown */}
  try{if(typeof performance!=='undefined'){timeOriginMs=finite(performance.timeOrigin);monotonicMs=finite(performance.now());}}catch{/* optional diagnostic clock only */}
  return Object.freeze({utc,timeOriginMs,monotonicMs,wallClockMs});
 }
 const elapsed=(from:number|null|undefined,to:number|null)=>from===undefined||from===null||to===null?null:Math.max(0,to-from);
 function startAttempt(){attemptId++;lastReady=undefined;lastThreshold=undefined;attemptStartedAt=sample();budgetStartedAt=undefined;budgetStoppedAt=undefined;visibleUsedMs=0;visibleSegmentAt=undefined;attemptLostError=undefined;}
 function captureReady(){
  const at=sample();let readiness:RecoveryReadySnapshot|undefined,diagnosticError:RecoveryErrorInfo|undefined;
  try{if(options.readReadySnapshot)readiness=boundedReadiness(options.readReadySnapshot());}catch(error){diagnosticError=recoveryError(error);}
  // Keep the live renderer tuple at this transition. Historical manager timing
  // and a much later diagnostic checkpoint cannot witness this recovery frame.
  lastReady=Object.freeze({schemaVersion:1,revision,attemptId,at,timing:readTiming(at),exceededThreshold:!!lastThreshold||readTiming(at).visibleOverrunMs>0,readinessCapturedAt:sample(),...(readiness?{readiness}:{}),...(diagnosticError?{diagnosticError}:{})});
 }
 function readTiming(at:RecoveryTerminalSample):RecoveryTerminalRecord['timing']{
  const active=watching&&!hidden&&visibleSegmentAt!==undefined?elapsed(visibleSegmentAt,at.wallClockMs)??0:0;
  const visibleElapsedMs=visibleUsedMs+active,budgetWall=elapsed(budgetStartedAt?.wallClockMs,watching?at.wallClockMs:budgetStoppedAt??at.wallClockMs);
  return Object.freeze({budgetMs:budget,wallElapsedMs:elapsed(attemptStartedAt?.wallClockMs,at.wallClockMs),visibleElapsedMs,hiddenElapsedMs:budgetWall===null?null:Math.max(0,budgetWall-visibleElapsedMs),preBudgetElapsedMs:elapsed(attemptStartedAt?.wallClockMs,budgetStartedAt?.wallClockMs??at.wallClockMs),postBudgetElapsedMs:budgetStoppedAt===undefined?0:elapsed(budgetStoppedAt,at.wallClockMs)??0,remainingVisibleMs:Math.max(0,budget-visibleElapsedMs),visibleOverrunMs:Math.max(0,visibleElapsedMs-budget),pageHidden:hidden});
 }
 function captureTerminal(reason:RecoveryTerminalReason,error?:unknown,before?:RecoveryTerminalRecord):RecoveryTerminalRecord{
  const at=sample();
  let readiness=before?.readiness,diagnosticError=before?.diagnosticError;
  if(!before)try{if(options.readReadySnapshot)readiness=boundedReadiness(options.readReadySnapshot());}catch(snapshotError){diagnosticError=recoveryError(snapshotError);}
  return Object.freeze({schemaVersion:1 as const,reason,previousState:before?.previousState??state,revision:before?.revision??revision,attemptId,at,attemptStartedAt,budgetStartedAt,readinessCapturedAt:before?.readinessCapturedAt??at,
   timing:readTiming(at),
   ...(readiness?{readiness}:{}),...(reason==='timeout'?{}:{error:recoveryError(error)}),...(attemptLostError?{onLostError:attemptLostError}:{}),...(diagnosticError?{diagnosticError}:{})});
 }
 function publishTerminal(){if(!lastTerminal)return;try{options.onTerminal?.(lastTerminal);}catch(error){lastTerminal=Object.freeze({...lastTerminal,publicationError:recoveryError(error)});}}
 function notifyLost(terminal?:RecoveryTerminalRecord){
  const before=terminal??captureTerminal('on-lost-error');
  try{options.onLost({reason:terminal?'terminal':'context-lost',attemptId});}catch(error){
   const detail=recoveryError(error);attemptLostError=detail;
   lastTerminal=terminal?Object.freeze({...terminal,onLostError:detail,onLostErrorAt:sample()}):captureTerminal('on-lost-error',error,before);
   if(!terminal)publishTerminal();
   // Preserve the actual error object/stack passed to the existing business callback.
   options.onError?.(error);
  }
 }
 function stopTimer(){const at=now();if(timer!==undefined){cancel(timer);timer=undefined;remaining=Math.max(0,remaining-(at-started));}if(visibleSegmentAt!==undefined){visibleUsedMs+=Math.max(0,at-visibleSegmentAt);visibleSegmentAt=undefined;}return at;}
 function clearWait(){const at=stopTimer();if(watching)budgetStoppedAt=at;watching=false;}
 function terminate(reason:RecoveryTerminalReason,error?:unknown,registrationCleanupError?:RecoveryErrorInfo){
  lastReady=undefined;
  // Capture before abort listeners or onLost can clear the current owner/readiness state.
  const captured=captureTerminal(reason,error),terminal=registrationCleanupError?Object.freeze({...captured,registrationCleanupError}):captured;lastTerminal=terminal;
  try{clearWait();request.abort();revision++;registered=false;busy=false;state=reason==='timeout'?'timed-out':'error';notifyLost(terminal);}
  finally{publishTerminal();}
  if(reason==='timeout')options.onTimeout?.();else options.onError?.(error);
 }
 function wait(){if(!watching||hidden||timer!==undefined||destroyed)return;started=now();visibleSegmentAt=started;if(lastThreshold)return;timer=schedule(()=>{
  timer=undefined;if(destroyed||hidden||!watching)return;
  lastThreshold=Object.freeze({...captureTerminal('timeout'),reason:'threshold-exceeded' as const,continuing:true as const});
  try{options.onThreshold?.(lastThreshold);}catch(error){lastThreshold=Object.freeze({...lastThreshold,publicationError:recoveryError(error)});}
 },Math.max(0,remaining));}
 function beginWait(newAttempt=true){clearWait();if(newAttempt)startAttempt();remaining=budget;visibleUsedMs=0;budgetStoppedAt=undefined;budgetStartedAt=sample();watching=true;wait();}
 const current=(signal:AbortSignal,ticket:number)=>!destroyed&&!signal.aborted&&ticket===revision&&restored;
 function lost(){if(destroyed||!restored&&(state==='lost'||state==='timed-out'))return;startAttempt();request.abort();revision++;restored=false;registered=false;busy=false;state='lost';notifyLost();beginWait(false);}
 async function restore(){
  if(destroyed||hidden||!restored||busy||registered||state==='error'||state==='timed-out')return;
  const ticket=revision,signal=request.signal;let phase:RecoveryTerminalReason='register-error',registrationCleanupError:RecoveryErrorInfo|undefined;
  try{
   if(!map.isStyleLoaded()){state='waiting-style';return;}
   busy=true;state='registering';
   for(const entry of options.layers()){
    if(!current(signal,ticket))return;
    if(!entry.layer.id)throw Error('Custom recovery layer requires an ID');
    if(!map.getLayer(entry.layer.id)){
     const before=entry.beforeId?.();try{map.addLayer(entry.layer,before&&map.getLayer(before)?before:undefined);}catch(error){try{if(map.getLayer(entry.layer.id))map.removeLayer(entry.layer.id);}catch(cleanupError){registrationCleanupError=recoveryError(cleanupError);}throw error;}
    }
   }
   if(!current(signal,ticket))return;
   phase='resume-error';
   await options.onLayersRestored(signal);
   if(!current(signal,ticket))return;
   registered=true;state='waiting-frame';map.triggerRepaint();
  }catch(error){if(current(signal,ticket))terminate(phase,error,registrationCleanupError);}
  finally{if(ticket===revision)busy=false;}
 }
 const styleChanged=()=>{void restore();};
 function frame(){
  if(destroyed||hidden||!restored)return;
  if(!registered){void restore();return;}
  if(state!=='waiting-frame')return;
  let phase:RecoveryTerminalReason='is-ready-error';
  try{if(options.isReady()){clearWait();state='ready';captureReady();phase='on-ready-error';options.onReady?.();}}
  catch(error){terminate(phase,error);}
 }
 function contextRestored(){if(destroyed||restored)return;request.abort();request=new AbortController();revision++;restored=true;registered=false;busy=false;const timedOut=state==='timed-out';state='waiting-style';if(timedOut||!watching)beginWait();void restore();}
 map.on('webglcontextlost',lost);map.on('webglcontextrestored',contextRestored);
 map.on('style.load',styleChanged);map.on('styledata',styleChanged);map.on('render',frame);
 return {
  /** Explicit bounded retry after owner reports a recoverable registration failure. */
  retry(){if(destroyed||!restored||state!=='error'&&state!=='timed-out')return;request.abort();request=new AbortController();revision++;registered=false;busy=false;state='waiting-style';beginWait();void restore();},
  setPageHidden(value:boolean){if(destroyed||hidden===value)return;hidden=value;if(value)stopTimer();else{wait();void restore();}},
  get state(){return state;},get revision(){return revision;},get lastTerminal(){return lastTerminal;},get lastReady(){return lastReady;},get lastThreshold(){return lastThreshold;},
  destroy(){if(destroyed)return;destroyed=true;clearWait();request.abort();revision++;state='destroyed';map.off('webglcontextlost',lost);map.off('webglcontextrestored',contextRestored);map.off('style.load',styleChanged);map.off('styledata',styleChanged);map.off('render',frame);}
 };
}
