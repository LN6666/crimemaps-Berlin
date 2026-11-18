import {pageIsHidden,visibleReadinessDeadline} from './visible-readiness-deadline';

export type ResidentDrawReadiness={ready:boolean;preparing:boolean;failure?:string};
export type ResidentDrawObservation={
 phase:'waiting'|'ready'|'error'|'threshold-exceeded';
 threshold?:{firstExceededAtMs:number;elapsedVisibleMs:number;visibleOverrunMs:number;continuing:boolean};
 stage:'preparing'|'drawing'|'ready';
 inspections:number;
 timing:{startedAtMs:number;observedAtMs:number;elapsedWallMs:number;visibleBudgetMs:number};
 snapshot:{pageVisible:boolean;mapMoving:boolean|null;rendererPresent:boolean;pickReady:boolean|null;pickReadyEvaluated:boolean};
 reason?:string;
};
type RenderMap={on(event:'render',listener:()=>void):unknown;off(event:'render',listener:()=>void):unknown;isMoving?:()=>boolean;triggerRepaint():void};

// The page-wide visible readiness deadline registry that every context
// preparation scheduler reads (render-runtime/preparation-scheduler.ts): while
// a token is present, a runnable visible start goes before capture insertion.
// Shared by its global key because this module's loaders admit no new import.
const VISIBLE_READINESS_DEADLINES=Symbol.for('crimemaps.render-runtime.visible-readiness-deadlines');
function beginVisibleReadinessDeadline():()=>void{
 const host=globalThis as unknown as Record<symbol,{active:Set<object>}|undefined>,registry=host[VISIBLE_READINESS_DEADLINES]??={active:new Set<object>()},token={};
 registry.active.add(token);return()=>{registry.active.delete(token);};
}

/** Preparation keeps its original observation threshold across stage changes.
 * Exceeding it records a slow load, never cancels the current request. Actual
 * renderer errors, superseding requests and owner cancellation still terminate. */
export function waitForResidentDraw(options:{
 map:RenderMap;
 signal:AbortSignal;
 current:()=>void;
 renderer:()=>{getDrawReadiness():ResidentDrawReadiness}|undefined;
 drawTimeoutMs:number;
 observe?:(value:ResidentDrawObservation)=>void;
}):Promise<void>{
 return new Promise((resolve,reject)=>{
  const {map,signal}=options;
  const startedAtMs=performance.now();
  let firstExceededAtMs:number|undefined,visibleUsedMs=0,visibleSince:number|undefined=pageIsHidden()?undefined:startedAtMs;
  let done=false,inspections=0,stage:ResidentDrawObservation['stage']='preparing';
  let snapshot:ResidentDrawObservation['snapshot']={pageVisible:!pageIsHidden(),mapMoving:null,rendererPresent:false,pickReady:null,pickReadyEvaluated:false};
  let cancelDeadline=()=>{},endVisibleDeadline=()=>{};
  const observe=(phase:ResidentDrawObservation['phase'],error?:unknown)=>{
   if(!options.observe)return;
   const observedAtMs=performance.now();
   // This is the whole attempt's wall time, including hidden intervals. The
   // existing visible deadline owns its paused budget; observations never reset it.
   const elapsedVisibleMs=visibleUsedMs+(visibleSince===undefined?0:Math.max(0,observedAtMs-visibleSince));
   if(firstExceededAtMs===undefined&&elapsedVisibleMs>options.drawTimeoutMs)firstExceededAtMs=observedAtMs;
   options.observe({phase,stage,inspections,...(firstExceededAtMs===undefined?{}:{threshold:{firstExceededAtMs,elapsedVisibleMs,visibleOverrunMs:Math.max(0,elapsedVisibleMs-options.drawTimeoutMs),continuing:!done}}),timing:{startedAtMs,observedAtMs,elapsedWallMs:Math.max(0,observedAtMs-startedAtMs),visibleBudgetMs:options.drawTimeoutMs},snapshot:{...snapshot},...(error===undefined?{}:{reason:String(error)})});
  };
  const finish=(error?:unknown)=>{
   if(done)return;done=true;endVisibleDeadline();cancelDeadline();map.off('render',inspect);signal.removeEventListener('abort',aborted);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibilityChanged);
   try{observe(error!==undefined?'error':'ready',error);}catch(observationError){error??=observationError;}
   error!==undefined?reject(error):resolve();
  };
  const aborted=()=>finish(signal.reason??new DOMException('Aborted','AbortError'));
  const resume=()=>{inspect();if(!done)map.triggerRepaint();};
  const visibilityChanged=()=>{const at=performance.now();if(visibleSince!==undefined)visibleUsedMs+=Math.max(0,at-visibleSince);visibleSince=pageIsHidden()?undefined:at;if(!pageIsHidden())resume();};
  const inspect=()=>{
   if(done)return;
   try{
    signal.throwIfAborted();options.current();
    const renderer=options.renderer(),visible=!pageIsHidden(),moving=visible?Boolean(map.isMoving?.()):null;
    const state=visible&&!moving?renderer?.getDrawReadiness():undefined;
    inspections++;snapshot={pageVisible:visible,mapMoving:moving,rendererPresent:!!renderer,pickReady:state?.ready??null,pickReadyEvaluated:visible&&!moving};
    if(state?.failure){finish(Error(state.failure));return;}
    if(state?.ready){stage='ready';finish();return;}
    if(state)stage=state.preparing?'preparing':'drawing';
    observe('waiting');
   }catch(error){finish(error);}
  };
  // The whole attempt is inside its visible deadline until it settles.
  endVisibleDeadline=beginVisibleReadinessDeadline();
  try{
   if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibilityChanged);
   cancelDeadline=visibleReadinessDeadline(options.drawTimeoutMs,()=>{inspect();if(!done){firstExceededAtMs??=performance.now();try{observe('threshold-exceeded');map.triggerRepaint();}catch(error){finish(error);}}},()=>{});
   map.on('render',inspect);signal.addEventListener('abort',aborted,{once:true});inspect();if(!done)map.triggerRepaint();
  }catch(error){
   // A setup throw still rejects with that error. finish ends everything armed
   // so far at once: the page deadline token, the deadline timer and the render
   // and abort listeners, so no later inspection observes a settled attempt.
   finish(error);
  }
 });
}
