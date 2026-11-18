import {isProgramPreparationPending} from './render-runtime/program-preparation';

/** budgetWaiting (present only when >0) counts pending demands that are page
 * ledger waits whose onAvailable wake their owner holds, i.e. the owner's
 * needsFrameAfter(before) was false: that wake repaints, so those demands need
 * no caller frame. Counts add up like ready/pending/failed when results merge. */
export type SolarShadowPreparationResult={status:'ready'|'pending'|'failed';ready:number;pending:number;failed:number;budgetWaiting?:number;reason?:string};
export type SolarDepthCompileEvent={phase:'depth';scope:'preparation-call';key:string;epoch:string;start:number;elapsed:number;result:'started'|'ready'|'pending'|'cancelled'|'lost'|'failed'};
export type SolarShadowPreparationBudget={compile<T>(key:string,epoch:string,work:()=>T):{status:'pending'}|{status:'ready';value:T}};

export function solarShadowPreparation(ready=0,pending=0,failed=0,budgetWaiting=0):SolarShadowPreparationResult{
 const result:SolarShadowPreparationResult={status:failed?'failed':pending?'pending':'ready',ready,pending,failed};
 if(budgetWaiting>0&&pending>0)result.budgetWaiting=Math.min(budgetWaiting,pending);
 return result;
}

/** A capture snapshot owns geometry, masks and executable loans. Do not build
 * or retain that snapshot while its prerequisite programs are still missing.
 * Invalidating the snapshot does not cancel the provider's program demands;
 * their existing scheduler/ledger wake remains responsible for progress. */
export function prepareSolarShadowResources(preparation:SolarShadowPreparationResult,resources:{invalidate():void;prepareSolar():{status:'ready'|'pending'|'failed';reason?:string}}):SolarShadowPreparationResult{
 if(preparation.status!=='ready'){
  resources.invalidate();
  return preparation;
 }
 const result=resources.prepareSolar();
 const summary=solarShadowPreparation(preparation.ready,Number(result.status==='pending'),Number(result.status==='failed'));
 if(result.status!=='ready'&&result.reason)summary.reason=result.reason.slice(0,256);
 return summary;
}

/** Only a pending result with some demand outside a held budget wait needs the
 * caller to request another frame; a fully budget-waiting one is woken. */
export function solarShadowPreparationNeedsFrame(result:SolarShadowPreparationResult|undefined):boolean{
 return result?.status==='pending'&&(result.budgetWaiting??0)<result.pending;
}

/** A pending answered by a page-ledger wait whose onAvailable wake its owner
 * holds (ProgramPreparationBudgetWait with waiting:true). Read structurally so
 * the provider doubles that only stand in for isProgramPreparationPending keep
 * loading this module. Such an answer starts no compile, source build or
 * admission of its own: the owner answers a refused exact recipe from its wait. */
const heldLedgerWait=(error:unknown)=>isProgramPreparationPending(error)&&(error as {waiting?:unknown}).waiting===true;

/** One program demand per capture-tree visit. Actual asynchronous source/driver
 * phases belong to the context scheduler. These events measure this preparation
 * call, not driver compile/link completion or first-draw cost.
 * A demand answered by a held ledger wait (heldLedgerWait) gives this visit's
 * one slot back, so the next demand of the same visit still gets its attempt;
 * every other outcome (ready, an ordinary pending, a failure or a wait whose wake
 * is not held) keeps it. A visit therefore still starts at most one compile.
 * This relies on each work() making one program compile and propagating its
 * outcome, or converting every pending into a plain ProgramPreparationPending, as
 * every current provider does: a work that started a compile and then threw a
 * held wait of a second compile would let the visit start one more. */
export function createSolarShadowPreparationBudget(observe?:(event:SolarDepthCompileEvent)=>void):SolarShadowPreparationBudget{
 let started=false;
 return{compile<T>(key:string,epoch:string,work:()=>T){
  if(started)return{status:'pending' as const};started=true;
  const start=performance.now(),event:SolarDepthCompileEvent={phase:'depth',scope:'preparation-call',key:key.slice(0,256),epoch:epoch.slice(0,256),start,elapsed:0,result:'started'};
  observe?.({...event});
  try{const value=work();event.result='ready';return{status:'ready' as const,value};}
  catch(error){event.result=isProgramPreparationPending(error)?error.status:'failed';if(heldLedgerWait(error))started=false;throw error;}
  finally{event.elapsed=Math.max(0,performance.now()-start);observe?.({...event});}
 }};
}

/** A capture owner's shared reading of solarShadowPreparationNeedsFrame: true
 * only for a pending result whose every pending demand is a held page-ledger
 * wait (budgetWaiting covers pending). Such an owner requests no frame of its
 * own; the program owner's onAvailable wake repaints and the next visit
 * retries. The reading lasts until that next visit only. When the program
 * owner's cancel() or a rebind withdraws a held wake, the owner itself requests
 * that one frame (after the withdrawing call returns, unless it is disposed or
 * holds a new wake by then). Context loss and dispose request none, and drop a
 * frame an earlier cancel of the same turn queued: a provider that withdraws
 * there and still draws a still map must request it itself. cancel() is for
 * lifecycle transitions only; cancelling a held wake on every frame would make
 * every frame request another. */
export function solarShadowPreparationHeldWait(result:SolarShadowPreparationResult|undefined):boolean{
 return result?.status==='pending'&&(result.budgetWaiting??0)>0&&!solarShadowPreparationNeedsFrame(result);
}
