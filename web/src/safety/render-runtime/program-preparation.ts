import {createPreparationScheduler,type PreparationJob,type PreparationStatus,type PreparationPriority} from './preparation-scheduler';
import {pollSubmittedProgramCompletion} from './submitted-program-completion';
import {getChunkResourceStoreForContext} from './chunk-resource-store';
import {ResourceBudgetExceededError,ResourceBudgetHintUnsupportedError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetPressure,type ResourceBudgetReservation} from './resource-budget';
import {readRenderDiagnosticSnapshot} from './diagnostic-snapshot';
import {registerPressureAvailability,PressureAvailabilityBudgetError,type PressureAdmissionProbe,type PressureAvailabilityRegistration,type PressureSnapshotWriter} from './pressure-availability';
import {AVAILABILITY_STATE_LIMITS,ResourceAvailabilityStateError} from './resource-budget';

export type PreparedProgramSources={vertex:string;fragment:string;attributes:readonly string[]};
/** Policy estimate charged for every budgeted linked executable that names no
 * submittedAllowanceBytes of its own (owner decision 2026-11-02 03:25): the
 * same single-entry estimate as the recent program set. Driver-side bytes are
 * unmeasured; acceptance calibrates this value against driver memory. */
export const LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES=256*1024;
/** Source bounds cover generated UTF16 logical payload plus assembly work;
 * neither this bound nor a driver policy allowance is physical RAM. */
export type ProgramPreparationBudget={
 sourceBytesUpperBound:number;
 /** Explicit per-program driver allowance. Omitted: the budgeted program is
  * still charged, at LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES. Either is admitted
  * with the recipe, held as 'program-submitted' while the driver works,
  * becomes 'program' when linked (moved, never added, into the recent role
  * when retained) and 'program-retiring' until its deletion fence. */
 submittedAllowanceBytes?:number;
 /** Preflight the independent workspace before enqueueing. Its owner reserves
  * the same allocation identities during build and keeps them until real clear. */
 workspaceCosts?:readonly ResourceBudgetCost[];
};
type SourceDescription={characters:number;hash:string};
export type PreparationSynchronousPhase='source-build'|'source-description'|'vertex-submit'|'fragment-submit'|'link-submit'|'completion-query'|'link-status'|'vertex-status'|'fragment-status'|'upload'|'cleanup';
type SynchronousMeasurement={phase:PreparationSynchronousPhase;startedAtMs:number;endedAtMs:number;durationMs:number};
type PhaseTotals={calls:number;totalMs:number;maxMs:number};
type MutableTiming={synchronousMs:number;khrCompletionQueries:number;hasExecution?:boolean;khrWaitStartedAtMs?:number;khrWaitEndedAtMs?:number;lastSynchronousPhase?:SynchronousMeasurement;longestSynchronousPhase?:SynchronousMeasurement};
export type PreparationTiming={queuedAtMs:number;startedAtMs?:number;settledAtMs?:number;queueWaitMs:number;wallMs:number;synchronousMs:number;khrCompletionWaitMs:number;khrCompletionQueries:number;lastSynchronousPhase?:SynchronousMeasurement;longestSynchronousPhase?:SynchronousMeasurement};
export type ProgramPreparationDiagnostic={source:string;resource:string;epoch:number;status:PreparationStatus;phase:string;vertex?:SourceDescription;fragment?:SourceDescription;reason?:string;provider?:string;priority?:PreparationPriority;timing?:PreparationTiming};
type TerminalStatus=Exclude<PreparationStatus,'pending'>;
type TerminalIdentity={provider:string;source:string;resource:string;epoch:number;priority:PreparationPriority;status:TerminalStatus};
type TerminalPhases={lastSettledAtMs:number;longestSynchronousPhase?:(TerminalIdentity&SynchronousMeasurement);longestKHRCompletionWait?:(TerminalIdentity&{startedAtMs:number;endedAtMs:number;durationMs:number})};
export class ProgramPreparationPending extends Error{constructor(readonly status:'pending'|'cancelled'|'lost'='pending'){super('Program preparation '+status);}}
export const isProgramPreparationPending=(error:unknown):error is ProgramPreparationPending=>error instanceof ProgramPreparationPending;
/** A pending demand the page ResourceBudget refused. It stays a plain pending
 * result for existing callers. waiting:true means its owner holds the one
 * onAvailable subscription that repaints it, so the caller needs no frame of
 * its own; until that wake the same exact recipe is answered here without a
 * new admission attempt or pressure eviction. */
export class ProgramPreparationBudgetWait extends ProgramPreparationPending{constructor(readonly pressure:ResourceBudgetPressure|undefined,readonly waiting:boolean){super('pending');}}
export const isProgramPreparationBudgetWait=(error:unknown):error is ProgramPreparationBudgetWait=>error instanceof ProgramPreparationBudgetWait;
export class ProgramPreparationFailure extends Error{constructor(readonly diagnostic:ProgramPreparationDiagnostic){super(diagnostic.source+' '+diagnostic.resource+' '+diagnostic.phase+': '+diagnostic.reason);}}
/** The phase of a ProgramPreparationFailure whose recipe is larger than the
 * whole page ledger: it can never be admitted, so it is reported, not awaited. */
export const PROGRAM_BUDGET_UNFIT_PHASE='budget-admission';
/** The driver allowance this budget descriptor is admitted and charged with:
 * its explicit submittedAllowanceBytes, else the policy estimate. Preflights
 * that judge a recipe against the ledger capacity add this, not the field. */
export function programAllowanceBytes(budget:Pick<ProgramPreparationBudget,'submittedAllowanceBytes'>):number{return budget.submittedAllowanceBytes??LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES;}
export const isProgramBudgetUnfitFailure=(error:unknown):error is ProgramPreparationFailure=>error instanceof ProgramPreparationFailure&&error.diagnostic.phase===PROGRAM_BUDGET_UNFIT_PHASE;
type BudgetWaitObserver={readonly waitingForBudget?:boolean;readonly budgetWaits?:number};
/** One judgement for every renderer's pending path. Read owner.budgetWaits
 * before an attempt; afterwards this is false only when that attempt was
 * answered with a budget wait whose onAvailable wake the owner holds (the wake
 * repaints). Any other pending, or an owner without this surface, still needs
 * the caller's own frame. */
export function programPreparationNeedsFrame(owner:BudgetWaitObserver,budgetWaitsBefore:number|undefined):boolean{
 return !(owner.waitingForBudget===true&&typeof owner.budgetWaits==='number'&&typeof budgetWaitsBefore==='number'&&owner.budgetWaits!==budgetWaitsBefore);
}
const contexts=new WeakMap<WebGL2RenderingContext,ReturnType<typeof createPreparationScheduler>>();
type ProgramLifecycleIdentity={programId:number;source:string;resource:string;epoch:number;priority:PreparationPriority;vertex?:SourceDescription;fragment?:SourceDescription;attributes:SourceDescription};
type ProgramLifecycleEvent=ProgramLifecycleIdentity&{contextId:number;sequence:number;atMs:number;event:'create'|'delete-issued'};
type ProgramResourceObjects={contextId:number;createdPrograms:number;deleteProgramRequests:number};
const PROGRAM_LIFECYCLE_LIMIT=32;
const programLifecycleEvents:ProgramLifecycleEvent[]=[];let programLifecycleSequence=0;
/** Explicit diagnostic read only; omitted from per-renderer/frame snapshots. */
export function readRenderProgramLifecycle(){return {scope:'page/tracked-program-issued-calls' as const,sequence:programLifecycleSequence,limit:PROGRAM_LIFECYCLE_LIMIT,dropped:programLifecycleSequence-programLifecycleEvents.length,events:programLifecycleEvents.map(row=>({...row,vertex:row.vertex?{...row.vertex}:undefined,fragment:row.fragment?{...row.fragment}:undefined,attributes:{...row.attributes}}))};}
// Weak keys and scalar descriptions only: never retain a GL handle, full shader,
// source scope or recipe closure to observe its lifetime. Hashes are diagnostic
// fingerprints, not proof that two shader sources are byte-identical.
const programLifecycleIdentities=new WeakMap<WebGLProgram,ProgramLifecycleIdentity>();
const resourceContexts=new WeakMap<WebGL2RenderingContext,ProgramResourceObjects>();let resourceContextSequence=0;
function resourceObjectsFor(context:WebGL2RenderingContext):ProgramResourceObjects{
 let value=resourceContexts.get(context);
 if(!value){value={contextId:++resourceContextSequence,createdPrograms:0,deleteProgramRequests:0};resourceContexts.set(context,value);}
 return value;
}
/** Diagnostic identity only. The weak registry retains no context or GPU handle. */
export const getRenderResourceContextId=(context:WebGL2RenderingContext)=>resourceObjectsFor(context).contextId;
function recordProgramLifecycle(state:ProgramResourceObjects,identity:ProgramLifecycleIdentity,event:ProgramLifecycleEvent['event']){
 programLifecycleEvents.push({...identity,contextId:state.contextId,event,sequence:++programLifecycleSequence,atMs:performance.now()});
 if(programLifecycleEvents.length>PROGRAM_LIFECYCLE_LIMIT)programLifecycleEvents.shift();
}
function createTrackedProgram(context:WebGL2RenderingContext,diagnostic:ProgramPreparationDiagnostic,attributes:readonly string[]){
 const program=context.createProgram();if(program){const state=resourceObjectsFor(context),identity:ProgramLifecycleIdentity={programId:++state.createdPrograms,source:diagnostic.source.slice(0,192),resource:diagnostic.resource.slice(0,192),epoch:diagnostic.epoch,priority:diagnostic.priority??'visible',vertex:diagnostic.vertex?{...diagnostic.vertex}:undefined,fragment:diagnostic.fragment?{...diagnostic.fragment}:undefined,attributes:describe(JSON.stringify(attributes))};programLifecycleIdentities.set(program,identity);recordProgramLifecycle(state,identity,'create');}return program;
}
function issueDeleteTrackedProgram(context:WebGL2RenderingContext,program:WebGLProgram){const state=resourceObjectsFor(context);state.deleteProgramRequests++;const identity=programLifecycleIdentities.get(program);if(identity){recordProgramLifecycle(state,identity,'delete-issued');programLifecycleIdentities.delete(program);}context.deleteProgram(program);}
/** allowance is always charged for a budgeted recipe; policyAllowance marks
 * the policy estimate (no explicit submittedAllowanceBytes). */
type ProgramBudgetTicket={reservation:ResourceBudgetReservation;store:ReturnType<typeof getChunkResourceStoreForContext>;epoch:number;sourceIdentity:object;driverIdentity:object;upperBound:number;allowance:number;policyAllowance:boolean;workspaceCosts:readonly ResourceBudgetCost[];sourceMeasured:boolean;retiring:boolean;transferred:boolean;consumed:boolean;label:string};
type ProgramBudgetClaim={reservation:ResourceBudgetReservation;store:ReturnType<typeof getChunkResourceStoreForContext>;context:WebGL2RenderingContext;epoch:number;lost:boolean;identity:object;allowance:number;policyAllowance:boolean;label:string};
/** Ledger labels of a program's driver allowance, by phase and source. */
function allowanceLabel(policy:boolean,phase:'submitted'|'linked'|'retiring'|'recent'){
 if(!policy)return phase==='submitted'?'Explicit program policy allowance; driver bytes remain unmeasured':phase==='linked'?'Linked executable policy allowance; driver bytes remain unmeasured':phase==='retiring'?'Retiring executable policy allowance; driver bytes remain unmeasured':'Recent linked executable policy allowance; driver bytes remain unmeasured';
 return(phase==='submitted'?'Program in driver compile/link':phase==='linked'?'Linked executable':phase==='retiring'?'Retiring executable':'Recent linked executable')+': policy estimate '+LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES+' B; driver-side bytes unmeasured';
}
const programBudgetClaims=new WeakMap<WebGLProgram,ProgramBudgetClaim>(),contextBudgetClaims=new WeakMap<WebGL2RenderingContext,Set<ProgramBudgetClaim>>();
class ProgramBudgetAdmissionPending extends ProgramPreparationPending{constructor(readonly ledger:ResourceBudget,readonly pressure:ResourceBudgetPressure,readonly store?:ReturnType<typeof getChunkResourceStoreForContext>,readonly metadataAdmission?:PressureAdmissionProbe){super();}}
/** Internal: the recipe's own deduplicated claim exceeds the ledger capacity. */
class ProgramBudgetUnfit extends Error{constructor(readonly required:number,readonly capacity:number){super('Program does not fit the page resource budget: requires '+required+' logical bytes; capacity '+capacity);}}
// A page ledger's limit is fixed when it is created; reading stats computes usage.
const ledgerCapacities=new WeakMap<ResourceBudget,number>();
function ledgerCapacity(ledger:ResourceBudget){let value=ledgerCapacities.get(ledger);if(value===undefined){value=ledger.stats.limitBytes;ledgerCapacities.set(ledger,value);}return value;}
/** The claim the ledger would charge for these costs alone: one value per
 * allocation identity (the largest), every anonymous cost separately. */
function claimBytes(costs:readonly ResourceBudgetCost[]){
 const identified=new Map<object|string,number>();let total=0;
 for(const cost of costs){const bytes=Math.ceil(cost.bytes);if(cost.identity===undefined){total+=bytes;continue;}identified.set(cost.identity,Math.max(bytes,identified.get(cost.identity)??0));}
 for(const bytes of identified.values())total+=bytes;return total;
}
/** A refusal that no release can cure: the attempted claim's own addition
 * already exceeds the whole capacity (it never counts shared identities twice). */
const pressureUnfit=(pressure:ResourceBudgetPressure)=>pressure.additionalBytes>pressure.capacity;
function unfitFailure(source:string,resource:string,epoch:number,required:number,capacity:number){
 return new ProgramPreparationFailure({source:source.slice(0,128),resource:resource.slice(0,256),epoch,status:'failed',phase:PROGRAM_BUDGET_UNFIT_PHASE,reason:('Program does not fit the page resource budget: requires '+required+' logical bytes; capacity '+capacity).slice(0,2048)});
}
function preparationBudget(value:ProgramPreparationBudget|undefined):ProgramPreparationBudget|undefined{
 if(value===undefined)return;
 const sourceBytesUpperBound=value?.sourceBytesUpperBound,submittedAllowanceBytes=value?.submittedAllowanceBytes;
 if(!value||!Number.isSafeInteger(sourceBytesUpperBound)||sourceBytesUpperBound<0||(submittedAllowanceBytes!==undefined&&(!Number.isSafeInteger(submittedAllowanceBytes)||submittedAllowanceBytes<=0)))throw new Error('Invalid program source bound or submitted policy allowance');
 if(value.workspaceCosts!==undefined&&!Array.isArray(value.workspaceCosts))throw new Error('Program workspace costs must be an allocation descriptor array');
 return Object.freeze({sourceBytesUpperBound,submittedAllowanceBytes,workspaceCosts:value.workspaceCosts===undefined?undefined:Object.freeze(value.workspaceCosts.map(cost=>Object.freeze({...cost})))});
}
function programBudgetCosts(ticket:ProgramBudgetTicket,sourceBytes:number):ResourceBudgetCost[]{
 const costs:ResourceBudgetCost[]=[];
 if(sourceBytes)costs.push({category:'program-source',bytes:sourceBytes,precision:ticket.sourceMeasured?'exact':'estimate',identity:ticket.sourceIdentity,label:ticket.sourceMeasured?'Generated UTF16 logical source/attribute payload; engine storage unmeasured':'Generated UTF16 logical source/assembly bound; not JS physical bytes'});
 costs.push({category:ticket.retiring?'program-retiring':'program-submitted',bytes:ticket.allowance,precision:'estimate',identity:ticket.driverIdentity,label:allowanceLabel(ticket.policyAllowance,ticket.retiring?'retiring':'submitted')});
 costs.push(...ticket.workspaceCosts);
 return costs;
}
function reserveProgramBudget(context:WebGL2RenderingContext,description:ProgramPreparationBudget|undefined,resource:string):ProgramBudgetTicket|undefined{
 const value=preparationBudget(description);if(!value)return;
 const store=getChunkResourceStoreForContext(context),ticket={store,epoch:store.contextEpoch(context),sourceIdentity:{},driverIdentity:{},upperBound:value.sourceBytesUpperBound,allowance:programAllowanceBytes(value),policyAllowance:value.submittedAllowanceBytes===undefined,workspaceCosts:value.workspaceCosts??[],sourceMeasured:false,retiring:false,transferred:false,consumed:false,label:resource.slice(0,256)} as ProgramBudgetTicket;
 const costs=programBudgetCosts(ticket,ticket.upperBound),required=claimBytes(costs),capacity=ledgerCapacity(store.budget);
 // Larger than the whole page ledger: no release can admit it. Report it before
 // any admission attempt, so it neither waits nor evicts under pressure.
 if(required>capacity)throw new ProgramBudgetUnfit(required,capacity);
 const result=store.budget.tryReserve(costs,{label:ticket.label});
 if(result.ok!==true)throw new ProgramBudgetAdmissionPending(store.budget,result.error.details,store);
 ticket.reservation=result.reservation;return ticket;
}
/** Move the unsubmitted ticket to the selected live builder before source
 * construction. Replacing costs atomically avoids charging both plan workspaces. */
function transferSourceBudget(context:WebGL2RenderingContext,ticket:ProgramBudgetTicket|undefined,description:ProgramPreparationBudget|undefined,resource:string):ProgramBudgetTicket|undefined{
 if(!ticket){try{return reserveProgramBudget(context,description,resource);}catch(error){if(error instanceof ProgramBudgetAdmissionPending)throw new ResourceBudgetExceededError(error.pressure);throw error;}}
 const value=preparationBudget(description),next={...ticket,upperBound:value?.sourceBytesUpperBound??ticket.upperBound,allowance:value?programAllowanceBytes(value):ticket.allowance,policyAllowance:value?value.submittedAllowanceBytes===undefined:ticket.policyAllowance,workspaceCosts:value?.workspaceCosts??[]};
 const costs=programBudgetCosts(next,next.upperBound);
 if(!ticket.reservation.adjust(costs)){const pressure=ticket.store.budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Selected source budget admission failed');}
 Object.assign(ticket,{upperBound:next.upperBound,allowance:next.allowance,policyAllowance:next.policyAllowance,workspaceCosts:next.workspaceCosts});return ticket;
}
/** reserveProgramBudget for an owner: an unfit recipe becomes its failure. */
function admitProgramBudget(context:WebGL2RenderingContext,description:ProgramPreparationBudget|undefined,resource:string,source:string,epoch:number):ProgramBudgetTicket|undefined{
 try{return reserveProgramBudget(context,description,resource);}
 catch(error){if(error instanceof ProgramBudgetUnfit)throw unfitFailure(source,resource,epoch,error.required,error.capacity);throw error;}
}
function sourceBudget(ticket:ProgramBudgetTicket|undefined,bytes:number){
 if(!ticket||ticket.transferred||!ticket.reservation.active)return;
 if(bytes>ticket.upperBound)throw new Error('Program source budget descriptor exceeded: '+bytes+' UTF16 logical bytes > '+ticket.upperBound);
 if(!ticket.reservation.adjust(programBudgetCosts(ticket,bytes)))throw new Error('Program source budget adjustment exceeded its admitted bound');
}
function attachProgramBudget(context:WebGL2RenderingContext,program:WebGLProgram,ticket:ProgramBudgetTicket|undefined){
 if(!ticket||!ticket.reservation.active)return;
 if(!ticket.reservation.adjust({category:'program',bytes:ticket.allowance,precision:'estimate',identity:ticket.driverIdentity,label:allowanceLabel(ticket.policyAllowance,'linked')}))throw new Error('Program allowance transfer exceeded its admitted reservation');
 const claim:ProgramBudgetClaim={reservation:ticket.reservation,store:ticket.store,context,epoch:ticket.epoch,lost:false,identity:ticket.driverIdentity,allowance:ticket.allowance,policyAllowance:ticket.policyAllowance,label:ticket.label};
 ticket.transferred=true;programBudgetClaims.set(program,claim);let claims=contextBudgetClaims.get(context);if(!claims){claims=new Set();contextBudgetClaims.set(context,claims);}claims.add(claim);
}
function invalidateProgramBudgetClaims(context:WebGL2RenderingContext){
 dropRecentContext(context);
 const claims=contextBudgetClaims.get(context);if(!claims)return;
 const lost=[...claims];claims.clear();for(const claim of lost){claim.lost=true;claim.store.invalidateContext(context,claim.epoch);claim.reservation.release();}
}
function deleteTrackedProgram(context:WebGL2RenderingContext,program:WebGLProgram){
 const claim=programBudgetClaims.get(program);
 if(!claim){issueDeleteTrackedProgram(context,program);return;}
 programBudgetClaims.delete(program);contextBudgetClaims.get(claim.context)?.delete(claim);
 if(claim.lost){claim.reservation.release();return;}
 claim.reservation.adjust({category:'program-retiring',bytes:claim.allowance,precision:'estimate',identity:claim.identity,label:allowanceLabel(claim.policyAllowance,'retiring')});
 claim.store.retireGpu({context:claim.context,epoch:claim.epoch,reservation:claim.reservation,dispose:()=>issueDeleteTrackedProgram(claim.context,program),label:claim.label});
}
function releaseLostProgramBudget(program:WebGLProgram){const claim=programBudgetClaims.get(program);if(!claim)return;programBudgetClaims.delete(program);contextBudgetClaims.get(claim.context)?.delete(claim);claim.lost=true;claim.store.invalidateContext(claim.context,claim.epoch);claim.reservation.release();}
const resourceObjectStats=(context:WebGL2RenderingContext)=>({...resourceObjectsFor(context),scope:'tracked-program-owners/context-lifetime-issued-calls' as const});
function schedulerFor(context:WebGL2RenderingContext){let scheduler=contexts.get(context);if(!scheduler){scheduler=createPreparationScheduler({lost:()=>{const lost=context.isContextLost();if(lost)invalidateProgramBudgetClaims(context);return lost;}});contexts.set(context,scheduler);}return scheduler;}
function describe(source:string):SourceDescription{let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return{characters:source.length,hash:(hash>>>0).toString(16).padStart(8,'0')};}

type RenderResourceWorkOptions={resource:string;signal:AbortSignal;phase?:'source-build'|'upload';priority?:PreparationPriority;label?:string};
/** Shared resource work uses the existing context scheduler, not a renderer's
 * view cancellation. The source-store production signal is its sole demand. */
export function scheduleRenderResourceWork<T>(context:WebGL2RenderingContext,options:RenderResourceWorkOptions&{work:()=>T}):Promise<T>{
 return scheduleRenderResourceJob(context,options,options.work,false);
}
/** One job advances bounded steps under the existing 2 ms / 16 step turn
 * limits. It does not enqueue a separate timer for every packing window. */
export function scheduleRenderResourceSteps(context:WebGL2RenderingContext,options:RenderResourceWorkOptions&{step:()=>boolean}):Promise<void>{
 return scheduleRenderResourceJob(context,options,options.step,true).then(()=>{});
}
function scheduleRenderResourceJob<T>(context:WebGL2RenderingContext,options:RenderResourceWorkOptions,callback:()=>T,repeat:boolean):Promise<T>{
 const {resource,signal,priority='visible',phase='source-build',label}=options;
 if(signal.aborted)return Promise.reject(signal.reason??new DOMException('Resource work aborted','AbortError'));
 let work:(()=>T)|undefined=callback,result:T|undefined,hasResult=false;
 return new Promise<T>((resolve,reject)=>{
  let resolveResult:((value:T)=>void)|undefined=resolve,rejectResult:((reason:unknown)=>void)|undefined=reject;
  const scheduler=schedulerFor(context);
  const abort=()=>scheduler.cancel(job);
  const job:PreparationJob={identity:{source:'shared-resource-'+phase+(label?':'+label:''),resource},group:'shared-resource',priority,epoch:scheduler.epoch,status:'pending',requiresProgramSlot:false,current:()=>!signal.aborted,phase:()=>phase,
   step(){
    const run=work;if(!repeat)work=undefined;const value=run!();
    if(repeat&&value===false)return false;
    work=undefined;result=value;hasResult=true;return true;
   },
   dispose(){work=undefined;job.current=undefined;signal.removeEventListener('abort',abort);},
   settled(){
    const value=result,returned=hasResult,complete=resolveResult,fail=rejectResult;result=undefined;hasResult=false;resolveResult=undefined;rejectResult=undefined;
    // Deliver a completed CPU value to its producer even after a reentrant
    // abort/loss. Consumer readiness is separate; the store must see and dispose
    // a late value, and canonical CPU content does not inherit a GPU epoch.
    if(returned)complete?.(value as T);else if(job.status==='lost')fail?.(new ProgramPreparationPending('lost'));else if(job.status==='cancelled')fail?.(signal.reason??new DOMException('Resource work aborted','AbortError'));else fail?.(job.error??new Error('Shared resource work failed'));
   },
  };
  signal.addEventListener('abort',abort,{once:true});scheduler.submit(job);if(signal.aborted)abort();
 });
}

type TerminalPhaseRows=Partial<Record<TerminalStatus,TerminalPhases>>;
function projectTerminalPhases(value:TerminalPhaseRows):TerminalPhaseRows{
 return Object.fromEntries(Object.entries(value).map(([status,row])=>[status,{lastSettledAtMs:row.lastSettledAtMs,longestSynchronousPhase:row.longestSynchronousPhase?{...row.longestSynchronousPhase}:undefined,longestKHRCompletionWait:row.longestKHRCompletionWait?{...row.longestKHRCompletionWait}:undefined}]));
}
/** Per status: latest settlement and the longest phase/KHR wait of any row
 * (the first row wins a tie). Every result is a copy. */
function mergeTerminalPhases(rows:readonly TerminalPhaseRows[]):TerminalPhaseRows{
 const merged:TerminalPhaseRows={};
 for(const row of rows)for(const [status,value]of Object.entries(projectTerminalPhases(row)) as [TerminalStatus,TerminalPhases][]){
  const slot=merged[status];if(!slot){merged[status]=value;continue;}
  slot.lastSettledAtMs=Math.max(slot.lastSettledAtMs,value.lastSettledAtMs);
  if(value.longestSynchronousPhase&&(!slot.longestSynchronousPhase||value.longestSynchronousPhase.durationMs>slot.longestSynchronousPhase.durationMs))slot.longestSynchronousPhase=value.longestSynchronousPhase;
  if(value.longestKHRCompletionWait&&(!slot.longestKHRCompletionWait||value.longestKHRCompletionWait.durationMs>slot.longestKHRCompletionWait.durationMs))slot.longestKHRCompletionWait=value.longestKHRCompletionWait;
 }
 return merged;
}

/** Renderer-owned demand; shared admission/driver ownership belongs to context.
 * Sources are constructed only after admission, including CPU specialization.
 * Ready values transfer once to the renderer, which retains normal GPU ownership.
 * Cancelling this owner never cancels another provider on the same context. */
function createPrivateProgramPreparationOwner(source:string,repaint:()=>void){
 type TimedEntry={job:PreparationJob;diagnostic:ProgramPreparationDiagnostic;timing:MutableTiming;pendingPhase:()=>string};
 type Entry=TimedEntry&{inputs:readonly string[];visibleDemand:boolean;program?:WebGLProgram;context:WebGL2RenderingContext;scheduler:ReturnType<typeof createPreparationScheduler>;resumable:()=>boolean;resume:()=>void;retainedCharacters:()=>number;linkSubmitted:()=>boolean};
 type WorkEntry=TimedEntry&{scheduler:ReturnType<typeof createPreparationScheduler>};
 const entries=new Map<number,Entry>();let sequence=0,bound:WebGL2RenderingContext|undefined,revision=0,last:ProgramPreparationDiagnostic|undefined;
 const driverEntries=new Set<Entry>();let budgetedRecipes=0,unbudgetedRecipes=0,driverAllowanceRecipes=0,unmeasuredDriverRecipes=0,policyAllowanceRecipes=0;
 const workEntries=new Map<string,WorkEntry>();
 const livePriority=(entry:Entry,read:(()=>PreparationPriority)|undefined)=>read?()=>{const priority=read();entry.visibleDemand ||= priority==='visible';return priority;}:undefined;
 const provider=source.slice(0,128).split(/\s+/,1)[0].slice(0,64),phaseTimings:Partial<Record<PreparationSynchronousPhase,PhaseTotals>>={},terminalPhases:Partial<Record<TerminalStatus,TerminalPhases>>={};
 const timingState=():MutableTiming=>({synchronousMs:0,khrCompletionQueries:0});
 function measure<T>(timing:MutableTiming,phase:PreparationSynchronousPhase,work:()=>T):T{
  const startedAtMs=performance.now();if(phase!=='cleanup')timing.hasExecution=true;
  try{return work();}finally{
   const endedAtMs=performance.now(),durationMs=Math.max(0,endedAtMs-startedAtMs),value={phase,startedAtMs,endedAtMs,durationMs};
   timing.synchronousMs+=durationMs;timing.lastSynchronousPhase=value;
   if(!timing.longestSynchronousPhase||durationMs>timing.longestSynchronousPhase.durationMs)timing.longestSynchronousPhase=value;
   const total=phaseTimings[phase]??(phaseTimings[phase]={calls:0,totalMs:0,maxMs:0});total.calls++;total.totalMs+=durationMs;total.maxMs=Math.max(total.maxMs,durationMs);
  }
 }
 function timingSnapshot(job:PreparationJob,timing:MutableTiming,now:number):PreparationTiming{
  const end=job.settledAtMs??now,queuedAtMs=job.queuedAtMs??end;
  return{queuedAtMs,startedAtMs:job.startedAtMs,settledAtMs:job.settledAtMs,queueWaitMs:Math.max(0,(job.startedAtMs??end)-queuedAtMs),wallMs:Math.max(0,end-queuedAtMs),synchronousMs:timing.synchronousMs,khrCompletionWaitMs:timing.khrWaitStartedAtMs===undefined?0:Math.max(0,(timing.khrWaitEndedAtMs??end)-timing.khrWaitStartedAtMs),khrCompletionQueries:timing.khrCompletionQueries,lastSynchronousPhase:timing.lastSynchronousPhase?{...timing.lastSynchronousPhase}:undefined,longestSynchronousPhase:timing.longestSynchronousPhase?{...timing.longestSynchronousPhase}:undefined};
 }
 function project(diagnostic:ProgramPreparationDiagnostic,job:PreparationJob,timing:MutableTiming,now:number):ProgramPreparationDiagnostic{
  return{...diagnostic,source:diagnostic.source.slice(0,128),resource:diagnostic.resource.slice(0,256),reason:diagnostic.reason?.slice(0,2048),provider,priority:job.priority,vertex:diagnostic.vertex?{...diagnostic.vertex}:undefined,fragment:diagnostic.fragment?{...diagnostic.fragment}:undefined,timing:timingSnapshot(job,timing,now)};
 }
 function cloneDiagnostic(value:ProgramPreparationDiagnostic):ProgramPreparationDiagnostic{
  const timing=value.timing;return{...value,vertex:value.vertex?{...value.vertex}:undefined,fragment:value.fragment?{...value.fragment}:undefined,timing:timing?{...timing,lastSynchronousPhase:timing.lastSynchronousPhase?{...timing.lastSynchronousPhase}:undefined,longestSynchronousPhase:timing.longestSynchronousPhase?{...timing.longestSynchronousPhase}:undefined}:undefined};
 }
 function settled(diagnostic:ProgramPreparationDiagnostic,job:PreparationJob,timing:MutableTiming){
  const now=performance.now();job.settledAtMs??=now;diagnostic.status=job.status;diagnostic.epoch=job.epoch;if(job.error&&!diagnostic.reason)diagnostic.reason=String(job.error).slice(0,2048);last=project(diagnostic,job,timing,now);
  if(job.status!=='pending'){
   const identity:TerminalIdentity={provider,source:diagnostic.source.slice(0,128),resource:diagnostic.resource.slice(0,256),epoch:job.epoch,priority:job.priority,status:job.status},slot=terminalPhases[job.status]??(terminalPhases[job.status]={lastSettledAtMs:now});slot.lastSettledAtMs=now;
   const longest=timing.longestSynchronousPhase;
   if(timing.hasExecution&&longest&&(!slot.longestSynchronousPhase||longest.durationMs>slot.longestSynchronousPhase.durationMs))slot.longestSynchronousPhase={...identity,...longest};
   if(timing.khrWaitStartedAtMs!==undefined){const endedAtMs=timing.khrWaitEndedAtMs??job.settledAtMs,durationMs=Math.max(0,endedAtMs-timing.khrWaitStartedAtMs);if(!slot.longestKHRCompletionWait||durationMs>slot.longestKHRCompletionWait.durationMs)slot.longestKHRCompletionWait={...identity,startedAtMs:timing.khrWaitStartedAtMs,endedAtMs,durationMs};}
  }
  repaint();
 }
 function releaseCompleted(entry:Entry){const program=entry.program;entry.program=undefined;if(program){if(entry.job.epoch===entry.scheduler.epoch&&!entry.context.isContextLost())deleteTrackedProgram(entry.context,program);else releaseLostProgramBudget(program);}}
 function ownershipReadyInvalidated(entry:Entry|WorkEntry,status:'cancelled'|'lost'){
  if(entry.job.status!=='ready')return;
  for(const [key,value]of entries)if(value===entry)entries.delete(key);
  for(const [key,value]of workEntries)if(value===entry)workEntries.delete(key);
  if('inputs'in entry)releaseCompleted(entry);
  entry.job.status=status;entry.job.current=undefined;
  // Revoking an unconsumed ready value is an ownership observation, not a
  // second scheduler completion. Its original settled time freezes duration.
  settled(entry.diagnostic,entry.job,entry.timing);
 }
 function retire(){
  let submitted=false;
  for(const [key,entry]of entries){
   if(entry.job.status==='pending'){entry.scheduler.cancel(entry.job);if(entry.job.submitted&&entry.job.status==='pending'){submitted=true;continue;}}
   if(entry.job.status==='ready'){ownershipReadyInvalidated(entry,entry.job.epoch!==entry.scheduler.epoch||entry.context.isContextLost()?'lost':'cancelled');continue;}
   releaseCompleted(entry);entries.delete(key);
  }
  for(const entry of workEntries.values()){if(entry.job.status==='ready')ownershipReadyInvalidated(entry,entry.job.epoch!==entry.scheduler.epoch?'lost':'cancelled');else entry.scheduler.cancel(entry.job);}workEntries.clear();
  return submitted||[...driverEntries].some(entry=>entry.job.status==='pending'&&entry.job.submitted);
 }
 function cancel(){revision++;retire();for(const entry of driverEntries)entry.inputs=[];entries.clear();}
 function prune(){
  for(const [key,entry]of [...entries]){
   const lost=entry.job.epoch!==entry.scheduler.epoch;
   if(!lost&&(!entry.job.current||entry.job.current())){if(entry.job.status==='pending'&&entry.job.currentPriority)entry.job.priority=entry.job.currentPriority();continue;}
   if(entry.job.status==='pending'){entry.scheduler.cancel(entry.job);if(entry.job.submitted&&entry.job.status==='pending')continue;}
   if(entry.job.status==='ready'){ownershipReadyInvalidated(entry,lost?'lost':'cancelled');continue;}
   releaseCompleted(entry);entries.delete(key);
   entry.job.current=undefined;
  }
  for(const [key,entry]of [...workEntries]){
   const lost=entry.job.epoch!==entry.scheduler.epoch;
   if(!lost&&(!entry.job.current||entry.job.current()))continue;
   if(entry.job.status==='ready'){ownershipReadyInvalidated(entry,lost?'lost':'cancelled');continue;}
   workEntries.delete(key);
   if(entry.job.status==='pending')entry.scheduler.cancel(entry.job);
   // Already terminal work has already published its timing exactly once.
   entry.job.current=undefined;
  }
 }
 function projectStats(){
  const observedAtMs=performance.now(),programEntries=[...new Set([...entries.values(),...driverEntries])],all=[...programEntries,...workEntries.values()],pending=all.filter(e=>e.job.status==='pending').sort((a,b)=>Number(b.job.startedAtMs!==undefined)-Number(a.job.startedAtMs!==undefined)),failures=all.filter(e=>e.job.status==='failed'),sourceRetainedCharacters=programEntries.reduce((sum,entry)=>sum+entry.retainedCharacters(),0);
  return{schemaVersion:1,revision,performanceTimeOriginMs:performance.timeOrigin,observedAtMs,timingScope:'owner-lifetime',resourceObjects:bound?resourceObjectStats(bound):undefined,pending:pending.length,failed:failures.length,ready:all.filter(e=>e.job.status==='ready').length,
   submitted:programEntries.filter(entry=>entry.job.status==='pending'&&entry.job.submitted).length,retiring:programEntries.filter(entry=>entry.job.status==='pending'&&entry.job.submitted&&(entry.job.abandoned||entry.job.error!==undefined)).length,resumable:programEntries.filter(entry=>entry.resumable()).length,sourceRetainedCharacters,sourceRetainedBytesEstimate:sourceRetainedCharacters*2,sourceRetainedScope:'logical-generated-source-utf16-estimate' as const,budgetedRecipes,unbudgetedRecipes,driverAllowanceRecipes,unmeasuredDriverRecipes,policyAllowanceRecipes,
   pendingResources:pending.slice(0,8).map(e=>({...project(e.diagnostic,e.job,e.timing,observedAtMs),phase:e.pendingPhase(),schedulingState:e.job.startedAtMs===undefined?'queued':'active',submitted:!!e.job.submitted,retiring:!!e.job.submitted&&!!(e.job.abandoned||e.job.error!==undefined)})),pendingResourcesTruncated:pending.length>8,
   phaseTimings:Object.fromEntries(Object.entries(phaseTimings).map(([phase,total])=>[phase,{...total}])),
   terminalPhases:projectTerminalPhases(terminalPhases),
   failures:failures.slice(0,16).map(e=>project(e.diagnostic,e.job,e.timing,observedAtMs)),last:last?cloneDiagnostic(last):undefined,context:bound?schedulerFor(bound).stats:undefined};
 }
 return{
  /** Upload/allocation phase on the same context admission queue. The caller
   * supplies an exact revision guard and keeps readiness pending until work ran.
   * A terminal publication ends its own demand in work(); retainReady:false
   * retires that successful record without requiring a later polling consumer.
   * Failures stay available for the waiting caller in either mode. */
  work(context:WebGL2RenderingContext,recipe:{resource:string;revision:number;current:()=>boolean;work:()=>void;phase?:'upload'|'source-build';priority?:PreparationPriority;retainReady?:boolean}):boolean{
   if(bound&&bound!==context)cancel();bound=context;const scheduler=schedulerFor(context),key=recipe.resource+':'+recipe.revision;
   if(context.isContextLost()){scheduler.invalidate();return false;}
   for(const [oldKey,entry]of workEntries)if(entry.job.identity.resource===recipe.resource&&oldKey!==key){if(entry.job.status==='ready')ownershipReadyInvalidated(entry,entry.job.epoch!==scheduler.epoch?'lost':'cancelled');else entry.scheduler.cancel(entry.job);workEntries.delete(oldKey);}
   const existing=workEntries.get(key);if(existing){
    if(existing.job.epoch!==scheduler.epoch||!recipe.current()||existing.job.current&&!existing.job.current()){
     if(existing.job.status==='pending')existing.scheduler.cancel(existing.job);
     else if(existing.job.status==='ready')ownershipReadyInvalidated(existing,existing.job.epoch!==scheduler.epoch?'lost':'cancelled');
     workEntries.delete(key);return false;
    }
    if(existing.job.status==='pending')existing.job.priority=recipe.priority??'visible';
    if(existing.job.status==='failed')throw new ProgramPreparationFailure({...existing.diagnostic,status:'failed'});if(existing.job.status==='ready'){existing.job.current=undefined;workEntries.delete(key);return true;}if(existing.job.status!=='pending')workEntries.delete(key);return false;
   }
   const diagnostic:ProgramPreparationDiagnostic={source:source.slice(0,128),resource:recipe.resource.slice(0,256),epoch:scheduler.epoch,status:'pending',phase:recipe.phase??'upload'},capturedRevision=revision,timing=timingState(),phase=recipe.phase??'upload',guard=recipe.current,retainReady=recipe.retainReady!==false;let work:(()=>void)|undefined=recipe.work;
   const job:PreparationJob={identity:{source,resource:recipe.resource},group:source,priority:recipe.priority??'visible',epoch:scheduler.epoch,status:'pending',current:()=>capturedRevision===revision&&guard(),phase:()=>phase,step(){const run=work;work=undefined;measure(timing,phase,()=>run!());return true;},dispose(){work=undefined;if(job.status!=='ready')job.current=undefined;},settled(){if(job.status==='ready'&&!retainReady&&workEntries.get(key)?.job===job){workEntries.delete(key);job.current=undefined;}settled(diagnostic,job,timing);}};
   workEntries.set(key,{job,diagnostic,timing,pendingPhase:()=>phase,scheduler});scheduler.submit(job);return false;
  },
  compile(context:WebGL2RenderingContext,recipe:ProgramPreparationRecipe,admission?:ProgramBudgetTicket):WebGLProgram{
   if(bound&&bound!==context)cancel();bound=context;
   const scheduler=schedulerFor(context);
   if(context.isContextLost()){scheduler.invalidate();throw new ProgramPreparationPending('lost');}
   // Keep source strings only while their demand is unconsumed. A permanent
   // string-to-token cache would retain every generated legacy partition body.
   const found=[...entries].find(([,entry])=>entry.job.identity.resource===recipe.resource&&entry.inputs.length===recipe.inputs.length&&entry.inputs.every((value,index)=>value===recipe.inputs[index]));
   const key=found?.[0]??++sequence,existing=found?.[1];let priority=recipe.priority??'visible',visibleDemand=priority==='visible';
   if(existing){
    admission?.reservation.release();
    // Completed but unconsumed programs are outside the scheduler queue. Recheck
    // the shared epoch and both revisions at the actual ownership transfer.
    const invalidEpoch=existing.job.epoch!==scheduler.epoch;
    if(invalidEpoch||recipe.current&&!recipe.current()||existing.job.current&&!existing.job.current()){
     const status=invalidEpoch?'lost':'cancelled';
     if(existing.job.status==='pending')existing.scheduler.cancel(existing.job);
     else if(existing.job.status==='ready')ownershipReadyInvalidated(existing,status);
     else releaseCompleted(existing);
     if(!invalidEpoch&&existing.job.status==='pending'&&existing.job.submitted)throw new ProgramPreparationPending();
     entries.delete(key);throw new ProgramPreparationPending(status);
    }
    priority=recipe.currentPriority?.()??priority;visibleDemand=priority==='visible';
    if(existing.job.status==='pending'&&existing.job.abandoned){
     // Only an already linked executable can resume after its source was
     // dropped. A partial submission drains before a fresh recipe is admitted.
     if(!existing.resumable())throw new ProgramPreparationPending();
     existing.job.current=recipe.current;
     if(!existing.scheduler.resume(existing.job)){existing.job.current=undefined;throw new ProgramPreparationPending();}
     existing.resume();
    }
    // Failure history and today's demand are separate. The shared caller
    // aggregates its live subscribers before setting this execution's role;
    // a private caller owns its one current role. Only capture-only failure
    // history permits the one first-visible retry.
    const visibleUpgrade=existing.job.status==='failed'&&visibleDemand&&!existing.visibleDemand;
    if(existing.job.status==='failed'&&!existing.job.submitted&&existing.job.error instanceof ResourceBudgetExceededError){
     const failure=existing.job.error,pressure=failure.details;entries.delete(key);existing.inputs=[];existing.job.current=undefined;
     if(pressureUnfit(pressure))throw unfitFailure(source,recipe.resource,scheduler.epoch,pressure.additionalBytes,pressure.capacity);
     const store=getChunkResourceStoreForContext(context);throw new ProgramBudgetAdmissionPending(store.budget,pressure,store,failure instanceof PressureAvailabilityBudgetError?failure.admission:undefined);
    }
    existing.visibleDemand ||= visibleDemand;
    existing.job.priority=priority;if(existing.job.status==='pending')existing.job.currentPriority=livePriority(existing,recipe.currentPriority);
    if(existing.job.status==='ready'){entries.delete(key);existing.job.current=undefined;const value=existing.program!;existing.program=undefined;return value;}
    if(existing.job.status==='failed'&&!visibleUpgrade)throw existing.job.error instanceof ProgramPreparationFailure?existing.job.error:new ProgramPreparationFailure({...existing.diagnostic,status:'failed'});
    if(visibleUpgrade||existing.job.status==='lost'||existing.job.status==='cancelled')entries.delete(key);
    else throw new ProgramPreparationPending();
   }
   if(!existing&&recipe.currentPriority){if(recipe.current&&!recipe.current()){admission?.reservation.release();throw new ProgramPreparationPending('cancelled');}priority=recipe.currentPriority();visibleDemand=priority==='visible';}
   // Bound unconsumed demand; callers retry after other entries are consumed.
   // A full stale visible queue must not prevent required capture admission.
   if(entries.size>=64&&priority==='capture'){
    const victim=[...entries].find(([,entry])=>entry.job.priority==='visible'&&entry.job.status!=='failed');
    if(victim){const [oldKey,entry]=victim;if(entry.job.status==='pending')entry.scheduler.cancel(entry.job);else if(entry.job.status==='ready')ownershipReadyInvalidated(entry,entry.job.epoch!==scheduler.epoch?'lost':'cancelled');else releaseCompleted(entry);if(entry.job.status!=='pending'||!entry.job.submitted)entries.delete(oldKey);}
   }
   if(entries.size>=64){admission?.reservation.release();throw new ProgramPreparationPending();}
   let budgetTicket=admission??admitProgramBudget(context,recipe.budget,recipe.resource,source,scheduler.epoch);
   if(budgetTicket)budgetTicket.consumed=true;
   if(budgetTicket)budgetedRecipes++;else unbudgetedRecipes++;
   // Every budgeted recipe charges a driver allowance (explicit or the policy
   // estimate); only an unbudgeted recipe leaves its driver bytes uncharged.
   if(budgetTicket){driverAllowanceRecipes++;if(budgetTicket.policyAllowance)policyAllowanceRecipes++;}else unmeasuredDriverRecipes++;
   const diagnostic:ProgramPreparationDiagnostic={source:source.slice(0,128),resource:recipe.resource.slice(0,256),epoch:scheduler.epoch,status:'pending',phase:'source'};
   const capturedRevision=revision,shaders:WebGLShader[]=[],submittedShaders:WebGLShader[]=[],attachedShaders=new Set<WebGLShader>(),timing=timingState();
   let resolveSource=recipe.resolveSource;
   let build:(()=>PreparedProgramSources)|undefined=recipe.build,vertexSource:string|undefined,fragmentSource:string|undefined,attributes:readonly string[]|undefined,next:WebGLProgram|undefined,phase=0,linkSubmitted=false,driverComplete=false,retiring=false,lastSubmittedAtMs:number|undefined;
   let parallel:{COMPLETION_STATUS_KHR:number}|null|undefined;
   const entry={} as Entry;
   const driverLive=()=>{if(context.isContextLost()||job.epoch!==scheduler.epoch)throw new ProgramPreparationPending('lost');};
   const live=()=>{driverLive();if(job.abandoned||job.status!=='pending'||!job.submitted&&capturedRevision!==revision)throw new ProgramPreparationPending('cancelled');};
   function retirementPhase(){return linkSubmitted?'retiring-link-completion':'retiring-shader-completion';}
   const pendingPhase=()=>retiring?retirementPhase():['source','vertex-submit','fragment-submit','link-submit','link-completion','link-status'][phase]??diagnostic.phase;
   const retainedSourceBytes=()=>2*((vertexSource?.length??0)+(fragmentSource?.length??0)+(attributes?.reduce((sum,name)=>sum+name.length,0)??0));
   const abandon=()=>{retiring=true;if(job.error===undefined)diagnostic.phase=retirementPhase();build=undefined;resolveSource=undefined;vertexSource=fragmentSource=undefined;attributes=undefined;job.current=undefined;job.currentPriority=undefined;if(budgetTicket){budgetTicket.workspaceCosts=[];budgetTicket.retiring=true;sourceBudget(budgetTicket,0);budgetTicket.reservation.markRetiring();}};
   const drain=()=>{
    driverLive();if(driverComplete){job.waiting=false;return true;}if(job.error===undefined)diagnostic.phase=retirementPhase();
    if(parallel===undefined)parallel=context.getExtension('KHR_parallel_shader_compile');
    job.waiting=!!parallel;if(parallel)timing.khrWaitStartedAtMs??=lastSubmittedAtMs??performance.now();
    const submission={program:next,linked:linkSubmitted,shaders:submittedShaders};let complete:boolean;
    const valid=()=>job.epoch===scheduler.epoch;
    if(parallel){
     complete=true;
     if(linkSubmitted){timing.khrCompletionQueries++;complete=measure(timing,'completion-query',()=>pollSubmittedProgramCompletion(context,submission,parallel,valid));}
     else for(const shader of submittedShaders){driverLive();timing.khrCompletionQueries++;complete=measure(timing,'completion-query',()=>pollSubmittedProgramCompletion(context,{linked:false,shaders:[shader]},parallel,valid))&&complete;}
    }
    else if(linkSubmitted)complete=measure(timing,'link-status',()=>pollSubmittedProgramCompletion(context,submission,null,valid));
    else{complete=true;for(const [index,shader]of submittedShaders.entries()){driverLive();complete=measure(timing,index?'fragment-status':'vertex-status',()=>pollSubmittedProgramCompletion(context,{linked:false,shaders:[shader]},null,valid))&&complete;}}
    driverLive();if(!complete)return false;driverComplete=true;job.waiting=false;if(parallel)timing.khrWaitEndedAtMs=performance.now();return true;
   };
   const fail=(fallback:string,log:string|null='')=>{diagnostic.reason=((log??'').trim()||fallback).slice(0,2048);return new ProgramPreparationFailure({...diagnostic,status:'failed'});};
   const job:PreparationJob={identity:{source,resource:recipe.resource},group:source,epoch:scheduler.epoch,priority,status:'pending',requiresProgramSlot:true,
    current:recipe.current,currentPriority:livePriority(entry,recipe.currentPriority),phase:pendingPhase,
    step(){
     try{
     if(retiring||job.abandoned||job.error!==undefined)return drain();
     live();
     if(phase===0){const selection=resolveSource?.();resolveSource=undefined;if(selection){budgetTicket=transferSourceBudget(context,budgetTicket,selection.budget,recipe.resource);live();if(selection.current&&!selection.current())throw new ProgramPreparationPending('cancelled');build=selection.build;}const construct=build;build=undefined;const sources=measure(timing,'source-build',()=>construct!());vertexSource=sources.vertex;fragmentSource=sources.fragment;attributes=sources.attributes;live();if(budgetTicket){if(retainedSourceBytes()>budgetTicket.upperBound)throw new Error('Program source budget descriptor exceeded: '+retainedSourceBytes()+' UTF16 logical bytes > '+budgetTicket.upperBound);budgetTicket.sourceMeasured=true;budgetTicket.workspaceCosts=[];}sourceBudget(budgetTicket,retainedSourceBytes());live();measure(timing,'source-description',()=>{diagnostic.vertex=describe(vertexSource!);diagnostic.fragment=describe(fragmentSource!);});phase++;return false;}
     if(phase===1||phase===2){
      const fragment=phase===2;diagnostic.phase=fragment?'fragment-submit':'vertex-submit';measure(timing,fragment?'fragment-submit':'vertex-submit',()=>{const shader=context.createShader(fragment?context.FRAGMENT_SHADER:context.VERTEX_SHADER);if(shader)shaders.push(shader);live();if(!shader)throw fail('shader allocation failed');try{context.shaderSource(shader,fragment?fragmentSource!:vertexSource!);}finally{if(fragment)fragmentSource=undefined;else vertexSource=undefined;sourceBudget(budgetTicket,retainedSourceBytes());}live();job.submitted=true;driverEntries.add(entry);submittedShaders.push(shader);context.compileShader(shader);lastSubmittedAtMs=performance.now();live();});phase++;return false;
     }
     if(phase===3){
      diagnostic.phase='link-submit';measure(timing,'link-submit',()=>{next=createTrackedProgram(context,diagnostic,attributes!)??undefined;live();if(!next)throw fail('program allocation failed');for(const shader of shaders){context.attachShader(next,shader);attachedShaders.add(shader);live();}try{for(const [index,name]of attributes!.entries()){context.bindAttribLocation(next,index,name);live();}}finally{attributes=undefined;sourceBudget(budgetTicket,retainedSourceBytes());}live();linkSubmitted=true;context.linkProgram(next);const returnedAtMs=performance.now();lastSubmittedAtMs=returnedAtMs;live();parallel=context.getExtension('KHR_parallel_shader_compile');job.waiting=!!parallel;if(parallel)timing.khrWaitStartedAtMs=returnedAtMs;live();});phase++;return false;
     }
     if(phase===4){
      diagnostic.phase='link-completion';if(parallel&&!driverComplete){timing.khrCompletionQueries++;const complete=measure(timing,'completion-query',()=>{const value=context.getProgramParameter(next!,parallel!.COMPLETION_STATUS_KHR);if(value)driverComplete=true;live();return value;});if(!complete)return false;timing.khrWaitEndedAtMs=performance.now();}job.waiting=false;phase++;return false;
     }
     // Completion only permits validation; it never establishes successful link.
     diagnostic.phase='link-status';const linked=measure(timing,'link-status',()=>{const value=context.getProgramParameter(next!,context.LINK_STATUS);driverComplete=true;live();return value;});
     if(!linked){const log=measure(timing,'link-status',()=>{const value=context.getProgramInfoLog(next!);live();return value;});for(const [index,shader]of shaders.entries()){const result=measure(timing,index?'fragment-status':'vertex-status',()=>{const compiled=context.getShaderParameter(shader,context.COMPILE_STATUS);live();if(compiled)return{compiled,info:null};diagnostic.phase=index?'fragment-status':'vertex-status';const info=context.getShaderInfoLog(shader);live();return{compiled,info};});if(!result.compiled)throw fail('shader compilation failed (empty driver log)',result.info);}throw fail('program link failed (empty driver log)',log);}
     // A linked executable no longer needs its shader attachments. Deletion
     // alone only flags attached shaders, retaining them with the program.
     live();measure(timing,'cleanup',()=>{for(const shader of [...attachedShaders]){context.detachShader(next!,shader);attachedShaders.delete(shader);live();}});
     attachProgramBudget(context,next!,budgetTicket);entry.program=next;next=undefined;diagnostic.phase='linked';return true;
     }catch(error){
      if(context.isContextLost()||job.epoch!==scheduler.epoch||!job.submitted)throw error;
      if(!job.abandoned&&job.error===undefined)job.error=error;
      abandon();return driverComplete;
     }
    },
    abandon,
    dispose(){measure(timing,'cleanup',()=>{
     const released=shaders.splice(0),program=next,valid=()=>job.epoch===scheduler.epoch&&!context.isContextLost();
     attachedShaders.clear();submittedShaders.length=0;next=undefined;vertexSource=fragmentSource=undefined;attributes=undefined;build=undefined;resolveSource=undefined;if(job.status!=='ready')job.current=undefined;job.waiting=false;
     if(budgetTicket)budgetTicket.workspaceCosts=[];
     sourceBudget(budgetTicket,0);
     const dispose=()=>{let cleanupError:unknown;for(const shader of released)if(valid())try{context.deleteShader(shader);}catch(error){cleanupError??=error===undefined?new Error('Shader cleanup failed'):error;}if(program&&valid())try{deleteTrackedProgram(context,program);}catch(error){cleanupError??=error===undefined?new Error('Program cleanup failed'):error;}if(cleanupError!==undefined)throw cleanupError;};
     if(budgetTicket&&!budgetTicket.transferred&&budgetTicket.reservation.active){
      if(!valid()){budgetTicket.store.invalidateContext(context,budgetTicket.epoch);budgetTicket.reservation.release();}
      else if(job.submitted)budgetTicket.store.retireGpu({context,epoch:budgetTicket.epoch,reservation:budgetTicket.reservation,dispose,label:budgetTicket.label});
      else{try{dispose();}finally{budgetTicket.reservation.release();}}
     }else dispose();
    });},
    settled(){driverEntries.delete(entry);if((job.status==='cancelled'||job.status==='lost')&&entries.get(key)===entry)entries.delete(key);settled(diagnostic,job,timing);},
   };
   Object.assign(entry,{job,diagnostic,timing,pendingPhase,linkSubmitted:()=>linkSubmitted,inputs:[...recipe.inputs],visibleDemand,context,scheduler,resumable:()=>entries.get(key)===entry&&capturedRevision===revision&&job.status==='pending'&&!!job.abandoned&&linkSubmitted&&!!next&&job.error===undefined&&job.epoch===scheduler.epoch,resume(){retiring=false;phase=4;if(budgetTicket){const resumed=budgetTicket.retiring&&budgetTicket.reservation.active;budgetTicket.retiring=false;budgetTicket.reservation.setRetiring(false);sourceBudget(budgetTicket,0);if(resumed)retiringAllowanceResumed(budgetTicket.store.budget);}},retainedCharacters:()=>((vertexSource?.length??0)+(fragmentSource?.length??0))});entries.set(key,entry);scheduler.submit(job);throw new ProgramPreparationPending(job.status==='lost'?'lost':'pending');
  },
  cancel,
  retire,
  prune,
  /** A shared worker has one exact recipe. Updating its live role neither
   * retries failed work nor changes submitted ownership or failure history. */
  setRuntimePriority(priority:PreparationPriority){for(const entry of entries.values())if(entry.job.status==='pending'){entry.job.priority=priority;entry.visibleDemand ||= priority==='visible';}for(const entry of driverEntries)if(entry.job.status==='pending')entry.job.priority=priority;},
  takeBudgetPressure(){
   for(const [key,entry]of entries)if(entry.job.status==='failed'&&!entry.job.submitted&&entry.job.error instanceof ResourceBudgetExceededError){
    const failure=entry.job.error,pressure=failure.details;entries.delete(key);entry.inputs=[];entry.job.current=undefined;
    const store=getChunkResourceStoreForContext(entry.context);return new ProgramBudgetAdmissionPending(store.budget,pressure,store,failure instanceof PressureAvailabilityBudgetError?failure.admission:undefined);
   }
   return undefined;
  },
  contextLost(){if(bound)schedulerFor(bound).invalidate();cancel();},
  /** Retention of a shared execution: keep its exact link-submitted program
   * running to completion. A running one simply continues; an abandoned one
   * whose linked executable is still resumable resumes under `current`.
   * False when no linked submission exists: the caller then retires as usual
   * (unsubmitted work is cancelled and refunded, a partial shader submission
   * drains and is deleted). */
  holdLinked(current:()=>boolean):boolean{
   for(const entry of entries.values()){
    const job=entry.job;
    if(job.status!=='pending'||!job.submitted||job.error!==undefined||job.epoch!==entry.scheduler.epoch||!entry.linkSubmitted())continue;
    if(!job.abandoned)return true;
    if(!entry.resumable())continue;
    job.current=current;
    if(!entry.scheduler.resume(job)){job.current=undefined;continue;}
    entry.resume();return true;
   }
   return false;
  },
  /** Lifetime recipe accounting and terminal phases without projecting rows. */
  get accounting(){return{budgetedRecipes,unbudgetedRecipes,driverAllowanceRecipes,unmeasuredDriverRecipes,policyAllowanceRecipes,terminalPhases:projectTerminalPhases(terminalPhases)};},
  /** An in-flight or unconsumed entry for this exact private recipe identity. */
  demanded(recipe:{resource:string;inputs:readonly string[]}){for(const entry of entries.values())if(entry.job.identity.resource===recipe.resource&&entry.inputs.length===recipe.inputs.length&&entry.inputs.every((value,index)=>value===recipe.inputs[index]))return true;return false;},
  get canResume(){return[...entries.values()].some(entry=>entry.resumable());},
  /** Same pending predicate as stats, without allocating diagnostic rows. */
  get hasPending(){
   for(const entry of entries.values())if(entry.job.status==='pending')return true;
   for(const entry of driverEntries)if(entry.job.status==='pending')return true;
   for(const entry of workEntries.values())if(entry.job.status==='pending')return true;
   return false;
  },
  get stats(){return readRenderDiagnosticSnapshot(projectStats);},
 };
}

export type ProgramSourceAuthority=Readonly<{kind:'immutable-program-source';inputs:readonly string[];builders:readonly Function[]}>;
/** Module-owned immutable source provenance. Every call creates a distinct authority. */
export function createProgramSourceAuthority({inputs,builders}:{inputs:readonly string[];builders:readonly Function[]}):ProgramSourceAuthority{
 if(!Array.isArray(inputs)||![...inputs].every(value=>typeof value==='string')||!Array.isArray(builders)||![...builders].every(value=>typeof value==='function'))throw new TypeError('Invalid immutable program source authority');
 return Object.freeze({kind:'immutable-program-source',inputs:Object.freeze([...inputs]),builders:Object.freeze([...builders])});
}
export type ProgramSourceSelection={budget?:ProgramPreparationBudget;current?:()=>boolean;build:()=>PreparedProgramSources};
export type ProgramPreparationRecipe={resource:string;inputs:readonly string[];sharedKey?:string;provenance?:readonly ProgramSourceAuthority[];budget?:ProgramPreparationBudget;priority?:PreparationPriority;
 /** Current role after the demand guard succeeds; no compile poll is required
  * to demote a still-live capture demand after it leaves the main view. */
 currentPriority?:()=>PreparationPriority;current?:()=>boolean;
 /** Resolve a live plan and its budget together immediately before source
  * execution; this callback describes construction and must not build sources. */
 resolveSource?:()=>ProgramSourceSelection;build:()=>PreparedProgramSources};
type ReadyProgramRecipe=Pick<ProgramPreparationRecipe,'sharedKey'|'resource'|'inputs'|'provenance'|'current'|'priority'>;
const noProgramProvenance:readonly ProgramSourceAuthority[]=Object.freeze([]);
function snapshotProgramProvenance(provenance:readonly ProgramSourceAuthority[]|undefined):readonly ProgramSourceAuthority[]{
 if(provenance===undefined)return noProgramProvenance;
 if(!Array.isArray(provenance))throw new TypeError('Invalid immutable program source provenance');
 const snapshot=[...provenance];
 for(const authority of snapshot){
  if(!authority||typeof authority!=='object'||!Object.isFrozen(authority))throw new TypeError('Invalid immutable program source authority');
  // Frozen accessors can still change their result. Provenance is data, never a
  // scope-like object or a callback that supplies mutable metadata later.
  const fields=Object.getOwnPropertyDescriptors(authority),inputs=fields.inputs?.value,builders=fields.builders?.value;
  if(Reflect.ownKeys(fields).length!==3||fields.kind?.value!=='immutable-program-source'||!Array.isArray(inputs)||!Object.isFrozen(inputs)||![...inputs].every(value=>typeof value==='string')||!Array.isArray(builders)||!Object.isFrozen(builders)||![...builders].every(value=>typeof value==='function'))throw new TypeError('Invalid immutable program source authority');
 }
 return Object.freeze(snapshot);
}
type PrivateOwner=ReturnType<typeof createPrivateProgramPreparationOwner>;
type SharedSubscriber={owner:SharedOwner;record:SharedProgram;revision:number;priority:PreparationPriority;currentPriority?:()=>PreparationPriority;build?:()=>PreparedProgramSources;budget?:()=>ProgramPreparationBudget|undefined;resolveSource?:()=>ProgramSourceSelection;current?:()=>boolean;status:PreparationStatus;failure?:ProgramPreparationFailure};
/** Exact recipe identity refused by the page budget, held only until the wake. */
type BudgetRefusal=Readonly<{sharedKey:string|undefined;resource:string;inputs:readonly string[];provenance:readonly ProgramSourceAuthority[];metadataAdmission?:PressureAdmissionProbe}>;
function budgetRefusal(recipe:{sharedKey?:string;resource:string;inputs:readonly string[]},provenance:readonly ProgramSourceAuthority[]):BudgetRefusal{return Object.freeze({sharedKey:recipe.sharedKey,resource:recipe.resource,inputs:Object.freeze([...recipe.inputs]),provenance});}
function sameBudgetRefusal(a:BudgetRefusal,b:BudgetRefusal){return a.sharedKey===b.sharedKey&&a.resource===b.resource&&a.inputs.length===b.inputs.length&&a.inputs.every((value,index)=>value===b.inputs[index])&&a.provenance.length===b.provenance.length&&a.provenance.every((value,index)=>Object.is(value,b.provenance[index]));}
type SharedOwner={source:string;revision:number;disposed:boolean;retainRecent:boolean;grantedReferences:number;releasedReferences:number;pending:Set<SharedSubscriber>;held:Map<WebGLProgram,{record:SharedProgram;count:number}>;notify:(record:SharedProgram,status:PreparationStatus)=>void;waitForBudget:(error:ProgramBudgetAdmissionPending,refusal?:BudgetRefusal)=>void};
type SharedProgram={id:number;source:string;resource:string;sharedKey:string;inputs:readonly string[];provenance:readonly ProgramSourceAuthority[];budget?:ProgramPreparationBudget;context:WebGL2RenderingContext;scheduler:ReturnType<typeof createPreparationScheduler>;epoch:number;worker:PrivateOwner;subscribers:Set<SharedSubscriber>;holders:Map<SharedOwner,number>;captureReferences:number;status:PreparationStatus;program?:WebGLProgram;failure?:ProgramPreparationFailure;visibleDemand:boolean;closed:boolean;releasing:boolean;
 /** Builders are needed only until this execution starts its source phase.
  * Later polls and subscribers must not reattach an already consumed plan. */
 needsSourceBuilder:boolean;
 /** The last consumer's owner asked to keep this linked executable (recent set). */
 retain:boolean;
 /** Its exact link-submitted execution keeps running without a consumer so the
  * linked result can enter the recent set; never source construction. */
 retainDraining:boolean;retentionLedger?:RecentLedger;};
const sharedContexts=new WeakMap<WebGL2RenderingContext,Set<SharedProgram>>(),sharedPrograms=new WeakMap<WebGLProgram,SharedProgram>();
const transferredPrograms=new WeakMap<WebGLProgram,{context:WebGL2RenderingContext;epoch:number;released:boolean;owner:SharedOwner;captureReferences:number;deleteRequested:boolean}>();let sharedSequence=0;
function sharedRows(context:WebGL2RenderingContext){let rows=sharedContexts.get(context);if(!rows){rows=new Set();sharedContexts.set(context,rows);}return rows;}
function findSharedProgram(context:WebGL2RenderingContext,epoch:number,recipe:ReadyProgramRecipe,provenance:readonly ProgramSourceAuthority[]){
 return [...sharedRows(context)].find(value=>!value.closed&&value.epoch===epoch&&value.sharedKey===recipe.sharedKey&&value.resource===recipe.resource&&value.inputs.length===recipe.inputs.length&&value.inputs.every((input,index)=>input===recipe.inputs[index])&&value.provenance.length===provenance.length&&value.provenance.every((authority,index)=>Object.is(authority,provenance[index])));
}
function releaseSharedIfUnused(record:SharedProgram){
 if(record.closed||record.releasing||record.subscribers.size||record.holders.size||record.captureReferences)return;
 // A submitted but abandoned program still owns its context admission credit.
 // Keep only its exact recipe identity and cleanup state while it drains. A
 // matching successor may re-subscribe before the driver completes; this is
 // bounded in-flight ownership, never an idle cache of linked programs.
 // Opt-in retention (record.retain) differs only for an exact LINK-submitted
 // execution: it completes instead of draining, and a linked result enters the
 // page's bounded, budget-charged recent set instead of being deleted.
 record.releasing=true;
 try{
  const valid=record.epoch===record.scheduler.epoch&&!record.context.isContextLost();
  if(record.status==='pending'&&valid&&record.retain&&holdForRetention(record))return;
  endRetentionDrain(record);
  const draining=record.status==='pending'&&valid&&record.worker.retire();
  // retire() may settle an unsubmitted job and synchronously notify consumers.
  if(record.closed||record.subscribers.size||record.holders.size||record.captureReferences||draining)return;
  const program=record.program,keep=!!program&&valid&&record.retain&&record.status==='ready';
  // Close the record before retention runs. Retention may send a synchronous
  // availability wave; a listener that compiles this exact recipe inside it
  // must reach the recent row (or nothing), never this closing record, so a
  // later row eviction can never delete an executable that is still granted.
  const identity:RecentIdentity|undefined=keep?{context:record.context,scheduler:record.scheduler,epoch:record.epoch,sharedKey:record.sharedKey,resource:record.resource,inputs:record.inputs,provenance:record.provenance}:undefined;
  record.closed=true;sharedRows(record.context).delete(record);record.inputs=[];record.provenance=noProgramProvenance;record.budget=undefined;
  record.program=undefined;
  record.worker.cancel();
  const retained=!!identity&&retainRecentProgram(identity,program!);
  if(program&&!retained){if(valid&&!record.context.isContextLost()&&record.epoch===record.scheduler.epoch)deleteTrackedProgram(record.context,program);else releaseLostProgramBudget(program);}
 }finally{record.releasing=false;}
}
function removeSharedSubscriber(subscriber:SharedSubscriber,status:PreparationStatus,notify=true,retain=subscriber.owner.retainRecent){
 const record=subscriber.record;record.subscribers.delete(subscriber);subscriber.owner.pending.delete(subscriber);subscriber.build=undefined;subscriber.resolveSource=undefined;subscriber.budget=undefined;subscriber.current=undefined;subscriber.currentPriority=undefined;subscriber.status=status;
 refreshSharedPriority(record);
 // A cancelled last consumer's owner decides whether a linked result is kept.
 if(status==='cancelled')record.retain=retain;
 if(notify)subscriber.owner.notify(record,status);releaseSharedIfUnused(record);
}
function currentSharedSubscriber(subscriber:SharedSubscriber){
 if(subscriber.owner.disposed||subscriber.revision!==subscriber.owner.revision)return false;
 try{if(subscriber.current&&!subscriber.current())return false;if(subscriber.currentPriority)subscriber.priority=subscriber.currentPriority();return true;}catch{return false;}
}
/** Membership/role mutations refresh this without invoking guards again. Live
 * guard/role callbacks are evaluated by sharedCurrent/prune before its next step.
 * Retention without subscribers is background work, even after visible use. */
function sharedPriority(record:SharedProgram):PreparationPriority{
 for(const subscriber of record.subscribers)if(!subscriber.owner.disposed&&subscriber.revision===subscriber.owner.revision&&subscriber.priority==='visible')return 'visible';
 return 'capture';
}
function refreshSharedPriority(record:SharedProgram){const priority=sharedPriority(record);if(record.status==='pending')record.visibleDemand ||= priority==='visible';record.worker.setRuntimePriority(priority);return priority;}
function sharedCurrent(record:SharedProgram){
 if(record.closed||record.epoch!==record.scheduler.epoch||record.context.isContextLost())return false;
 for(const subscriber of [...record.subscribers])if(!currentSharedSubscriber(subscriber))removeSharedSubscriber(subscriber,'cancelled');
 refreshSharedPriority(record);
 return !record.closed&&(record.subscribers.size>0||record.retainDraining);
}
function sharedRecipe(record:SharedProgram,priority:PreparationPriority):ProgramPreparationRecipe{
 const resolveSource=():ProgramSourceSelection=>{
  if(!sharedCurrent(record))throw new ProgramPreparationPending('cancelled');
  const subscriber=[...record.subscribers].find(value=>value.build&&currentSharedSubscriber(value));
  if(!subscriber)throw new ProgramPreparationPending('cancelled');
  const selected=subscriber.resolveSource?.()??{budget:subscriber.budget?.(),current:subscriber.current,build:subscriber.build!};
  record.needsSourceBuilder=false;for(const value of record.subscribers){value.build=undefined;value.resolveSource=undefined;value.budget=undefined;}
  return selected;
 };
 return{resource:record.resource,inputs:record.inputs,budget:record.budget,priority,current:()=>sharedCurrent(record),currentPriority:()=>sharedPriority(record),resolveSource,build:()=>resolveSource().build()};
}

function settleShared(record:SharedProgram){
 if(record.closed)return;
 const stats=record.worker.stats;
 if(record.epoch!==record.scheduler.epoch||record.context.isContextLost()){invalidateSharedContext(record.context);return;}
 const pressure=record.worker.takeBudgetPressure();
 if(pressure&&!pressureUnfit(pressure.pressure)){
  // Removal may close the record and clear its inputs; keep the identity first.
  const refusal=budgetRefusal(record,record.provenance);
  for(const subscriber of [...record.subscribers]){subscriber.owner.waitForBudget(pressure,refusal);removeSharedSubscriber(subscriber,'cancelled',false);}
  releaseSharedIfUnused(record);return;
 }
 // A refusal no release can cure is this execution's failure, not a wait.
 if(pressure){record.status='failed';record.failure=unfitFailure(record.source,record.resource,record.epoch,pressure.pressure.additionalBytes,pressure.pressure.capacity);}
 else if(stats.ready){
  try{record.program=record.worker.compile(record.context,sharedRecipe(record,sharedPriority(record)));record.status='ready';sharedPrograms.set(record.program,record);}
  catch(error){if(error instanceof ProgramPreparationFailure){record.status='failed';record.failure=error;}else record.status=isProgramPreparationPending(error)?error.status:'failed';}
 }else if(stats.failed){record.status='failed';record.failure=new ProgramPreparationFailure(stats.failures[0]);}
 else if(stats.last?.status==='cancelled'||stats.last?.status==='lost')record.status=stats.last.status;
 else return;
 // A linked result was taken above while the drain still held the demand.
 endRetentionDrain(record);
 for(const subscriber of [...record.subscribers]){
  if(!currentSharedSubscriber(subscriber)){removeSharedSubscriber(subscriber,'cancelled');continue;}
  subscriber.build=undefined;subscriber.resolveSource=undefined;subscriber.budget=undefined;subscriber.status=record.status;subscriber.failure=record.failure;subscriber.owner.notify(record,record.status);
 }
 releaseSharedIfUnused(record);
}
function invalidateSharedContext(context:WebGL2RenderingContext){
 invalidateProgramBudgetClaims(context);
 for(const record of [...sharedRows(context)]){
  if(record.closed)continue;endRetentionDrain(record);record.closed=true;record.status='lost';record.inputs=[];record.provenance=noProgramProvenance;record.budget=undefined;if(record.program)releaseLostProgramBudget(record.program);record.program=undefined;sharedRows(context).delete(record);
  for(const subscriber of [...record.subscribers])removeSharedSubscriber(subscriber,'lost');
  for(const owner of record.holders.keys()){for(const [program,held]of owner.held)if(held.record===record){owner.releasedReferences+=held.count;owner.held.delete(program);}owner.notify(record,'lost');}
  record.holders.clear();record.captureReferences=0;record.worker.cancel();
 }
}

// ---- Opt-in retention: a bounded recent set of exact linked executables ----
// An owner that asks for it (createProgramPreparationOwner retainRecent, or
// the per-call release/cancel/prune/dispose option) keeps the linked program of
// an exact shared recipe after its last consumer leaves. The entry is keyed by
// context incarnation (scheduler epoch) plus sharedKey/resource/inputs/
// provenance, charged to the page ResourceBudget as category 'program' in the
// recent role (an executable's own policy claim is flipped to recent, never
// charged twice), evicted least recently retained first under ledger pressure,
// and released on context loss or page teardown. Nothing is evicted by time.
// LRU order holds among retained executables only. The page ledger calls its
// pressure listeners in registration order: the chunk store's listener (made
// with the store) clears its own recent entries first, and this set then gives
// up only the shortfall still left. Cross-cache priority is not decided here.
/** Logical allowance of a retained executable without a charged claim of its
 * own (an unbudgeted recipe). The same policy estimate as every budgeted
 * linked executable, whose own claim moves into the recent role instead. */
export const RECENT_PROGRAM_ALLOWANCE_BYTES=LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES;
/** Count bound of retained executables per page ledger. */
export const RECENT_PROGRAM_MAX_ENTRIES=128;
/** Retained executables use at most this share of the ledger's recent subset;
 * the rest stays available to the chunk store's recent data. */
export const RECENT_PROGRAM_RECENT_SHARE=0.5;
type RecentStore=ReturnType<typeof getChunkResourceStoreForContext>;
type RecentProgram={ledger:RecentLedger;store:RecentStore;context:WebGL2RenderingContext;scheduler:ReturnType<typeof createPreparationScheduler>;epoch:number;sharedKey:string;resource:string;inputs:readonly string[];provenance:readonly ProgramSourceAuthority[];program:WebGLProgram;claim:ProgramBudgetClaim;recentOnly:boolean};
type RecentContextWatch={slot:number;count:number;observable:boolean;canvas?:EventTarget;scheduler:ReturnType<typeof createPreparationScheduler>};
type RecentLedger={budget:ResourceBudget;recentLimit:number;rows:Set<RecentProgram>;drains:Set<SharedProgram>;bytes:number;retained:number;hits:number;evictedPressure:number;evictedCapacity:number;released:number;refused:number;lost:number;drainsStarted:number;pressureAvailability?:PressureAvailabilityRegistration;stopPressure?:(()=>void);registeringPressure:boolean;retaining:number;contextWatches:Map<WebGL2RenderingContext,RecentContextWatch>;contextChanged:()=>void};
/** The exact identity of a closing shared record, read before it is cleared. */
type RecentIdentity={context:WebGL2RenderingContext;scheduler:ReturnType<typeof createPreparationScheduler>;epoch:number;sharedKey:string;resource:string;inputs:readonly string[];provenance:readonly ProgramSourceAuthority[]};
const recentLedgers=new WeakMap<ResourceBudget,RecentLedger>(),recentContexts=new WeakMap<WebGL2RenderingContext,Set<RecentProgram>>(),recentContextLedgers=new WeakMap<WebGL2RenderingContext,RecentLedger>();
// 1 KiB for the descriptor/callback plus at most 128 context-watch records at
// an estimated 192 B each; 32 KiB is a conservative logical JS allowance.
// Tracker snapshots/history are separately paid by its original 4 MiB claim.
const RECENT_PRESSURE_METADATA_BYTES=32768;
function recentPressureState(ledger:RecentLedger,writer:PressureSnapshotWriter):void{
 let characters=0;
 if(ledger.rows.size>RECENT_PROGRAM_MAX_ENTRIES)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Recent program pressure row bound exceeded');
 // Set iteration is the actual least-recently-retained eviction order. Program
 // recipe inputs/provenance govern future reuse, not this pressure callback;
 // actual take/retain/delete operations change these rows and notify the gate.
 writer.open();writer.value(ledger.recentLimit);writer.value(ledger.bytes);writer.open();
 for(const row of ledger.rows){
  characters+=row.resource.length+row.sharedKey.length;if(characters>AVAILABILITY_STATE_LIMITS.chars)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Recent program source identity bound exceeded');
  const watch=ledger.contextWatches.get(row.context);
  if(!watch||!watch.observable)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','Recent program context changes are not observable');
  writer.open();writer.value(row.resource);writer.value(row.sharedKey);writer.value(watch.slot);writer.value(row.epoch);writer.value(row.scheduler.epoch);writer.value(row.context.isContextLost());writer.value(row.store.destroyed);writer.value(row.claim.lost);writer.value(row.claim.reservation.active);writer.value(row.claim.reservation.recent);writer.value(row.claim.reservation.bytes);writer.value(row.claim.allowance);writer.value(row.claim.policyAllowance);writer.value(row.recentOnly);writer.close();
 }
 writer.close();writer.close();
}
function activateRecentPressure(ledger:RecentLedger):boolean{
 if(ledger.pressureAvailability)return true;if(ledger.registeringPressure)return false;
 ledger.registeringPressure=true;let registration:PressureAvailabilityRegistration|undefined,off:(()=>void)|undefined;
 try{
  registration=registerPressureAvailability(ledger.budget,'recent-programs',writer=>recentPressureState(ledger,writer),RECENT_PRESSURE_METADATA_BYTES);
  off=ledger.budget.onPressure(pressure=>evictRecentForPressure(ledger,pressure),'metadata-hint-v1');
  ledger.pressureAvailability=registration;ledger.stopPressure=off;return true;
 }catch(error){off?.();registration?.release();if(error instanceof ResourceBudgetExceededError)return false;throw error;}
 finally{ledger.registeringPressure=false;}
}
function deactivateRecentPressure(ledger:RecentLedger){
 if(ledger.rows.size||ledger.retaining)return;
 const off=ledger.stopPressure,registration=ledger.pressureAvailability;ledger.stopPressure=undefined;ledger.pressureAvailability=undefined;
 try{off?.();}finally{registration?.release();}
}
function retainRecentContext(ledger:RecentLedger,context:WebGL2RenderingContext,scheduler:ReturnType<typeof createPreparationScheduler>){
 let watch=ledger.contextWatches.get(context);if(watch){if(watch.scheduler!==scheduler)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_AMBIGUOUS','A context has two program schedulers');watch.count++;return;}
 let slot=1;const occupied=new Set([...ledger.contextWatches.values()].map(value=>value.slot));while(occupied.has(slot))slot++;
 if(slot>RECENT_PROGRAM_MAX_ENTRIES)throw new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Recent program context bound exceeded');
 const canvas=context.canvas as EventTarget|undefined;let observable=false,lost=false;
 try{if(canvas&&typeof canvas.addEventListener==='function'&&typeof canvas.removeEventListener==='function'){canvas.addEventListener('webglcontextlost',ledger.contextChanged);lost=true;canvas.addEventListener('webglcontextrestored',ledger.contextChanged);observable=true;}}
 catch{if(lost)try{canvas?.removeEventListener('webglcontextlost',ledger.contextChanged);}catch{/* A missing observer is reported by the snapshot. */}}
 ledger.contextWatches.set(context,{slot,count:1,observable,canvas,scheduler});
}
function releaseRecentContext(ledger:RecentLedger,context:WebGL2RenderingContext){
 const watch=ledger.contextWatches.get(context);if(!watch)return;if(--watch.count)return;ledger.contextWatches.delete(context);
 if(watch.observable){try{watch.canvas?.removeEventListener('webglcontextlost',ledger.contextChanged);}finally{watch.canvas?.removeEventListener('webglcontextrestored',ledger.contextChanged);}}
}
/** A resumed link un-retires its charged allowance. A refused waiter's pressure
 * pass may have counted those bytes as returning at their fence and so left
 * retained executables in place (evictRecentForPressure). No byte drops, so
 * the ledger sends no wave by itself: send one reclaimable wave, and the woken
 * waiter's retry evicts against the ledger as it now stands. Only a ledger
 * that holds retained executables can have deferred such an eviction. */
function retiringAllowanceResumed(budget:ResourceBudget){if(recentLedgers.get(budget)?.rows.size)budget.notifyReclaimable?.();}
function recentLedger(budget:ResourceBudget):RecentLedger{
 let ledger=recentLedgers.get(budget);
 if(!ledger){
  const created={} as RecentLedger;Object.assign(created,{budget,recentLimit:budget.stats.recentLimitBytes,rows:new Set(),drains:new Set(),bytes:0,retained:0,hits:0,evictedPressure:0,evictedCapacity:0,released:0,refused:0,lost:0,drainsStarted:0,registeringPressure:false,retaining:0,contextWatches:new Map(),contextChanged:()=>created.pressureAvailability?.notify()});
  recentLedgers.set(budget,created);ledger=created;
 }
 return ledger;
}
const recentShare=(ledger:RecentLedger)=>Math.floor(ledger.recentLimit*RECENT_PROGRAM_RECENT_SHARE);
function recentLedgerFor(context:WebGL2RenderingContext):RecentLedger|undefined{
 const store=getChunkResourceStoreForContext(context);if(store.destroyed)return;
 const ledger=recentLedger(store.budget);recentContextLedgers.set(context,ledger);return ledger;
}
/** Keep a pending exact execution running only when its link is submitted. */
function holdForRetention(record:SharedProgram):boolean{
 if(record.retainDraining)return true;
 const ledger=recentLedgerFor(record.context);
 if(!ledger||recentShare(ledger)<RECENT_PROGRAM_ALLOWANCE_BYTES)return false;
 record.retainDraining=true;
 if(!record.worker.holdLinked(()=>sharedCurrent(record))){record.retainDraining=false;return false;}
 record.retentionLedger=ledger;ledger.drains.add(record);ledger.drainsStarted++;return true;
}
function endRetentionDrain(record:SharedProgram){record.retainDraining=false;record.retentionLedger?.drains.delete(record);record.retentionLedger=undefined;}
function removeRecentRow(row:RecentProgram){
 if(!row.ledger.rows.delete(row))return false;
 row.ledger.bytes-=row.claim.allowance;recentContexts.get(row.context)?.delete(row);row.ledger.pressureAvailability?.notify();
 try{releaseRecentContext(row.ledger,row.context);}finally{if(!row.ledger.rows.size)deactivateRecentPressure(row.ledger);}return true;
}
function evictRecentRow(row:RecentProgram,reason:'capacity'|'pressure'|'released'|'lost'){
 const ledger=row.ledger;ledger.retaining++;
 try{
  if(!removeRecentRow(row))return;
  const valid=reason!=='lost'&&!row.context.isContextLost()&&row.epoch===schedulerFor(row.context).epoch&&!row.claim.lost;
  if(!valid){ledger.lost++;releaseLostProgramBudget(row.program);return;}
  if(reason==='capacity')ledger.evictedCapacity++;else if(reason==='pressure')ledger.evictedPressure++;else ledger.released++;
  // The ordinary deletion: the claim stays charged as retiring until its fence.
  deleteTrackedProgram(row.context,row.program);
 }finally{ledger.retaining--;if(!ledger.rows.size)deactivateRecentPressure(ledger);}
}
function evictRecentForPressure(ledger:RecentLedger,pressure:ResourceBudgetPressure|undefined){
 if(!ledger.rows.size)return;
 if(!pressure){for(const row of [...ledger.rows])evictRecentRow(row,'pressure');return;}
 // Earlier listeners may already have freed bytes, and retiring bytes return
 // at their fences without any eviction: evict only what is still missing.
 // A resumed link un-retires its bytes without returning them; that resume
 // wakes waiters again (retiringAllowanceResumed), so this credit is never a
 // lost wake.
 const now=ledger.budget.stats;
 let total=Math.max(0,now.bytes-now.retiringBytes+pressure.additionalBytes-pressure.capacity);
 let recent=Math.max(0,now.recentBytes+Math.max(0,pressure.recentRequired-pressure.recentCurrent)-pressure.recentCapacity);
 for(const row of [...ledger.rows]){
  if(total<=0&&recent<=0)break;
  const bytes=row.claim.allowance;evictRecentRow(row,'pressure');total-=bytes;recent-=bytes;
 }
}
/** Retain a linked executable of a just-closed exact record. Its metadata
 * descriptor makes one original-budget pressure admission; the executable's
 * retention itself makes room only among retained rows, and only when those
 * rows can actually make the required room. */
function retainRecentProgram(record:RecentIdentity,program:WebGLProgram):boolean{
 const context=record.context,ledger=recentLedgerFor(context);if(!ledger)return false;
 const store=getChunkResourceStoreForContext(context),budget=store.budget,claim=programBudgetClaims.get(program);
 if(claim&&(claim.lost||!claim.reservation.active||claim.context!==context)){ledger.refused++;return false;}
 if(!activateRecentPressure(ledger)){ledger.refused++;return false;}
 if(ledger.retaining>=RECENT_PROGRAM_MAX_ENTRIES){ledger.refused++;return false;}
 ledger.retaining++;
 try{
 // Registration can synchronously run real pressure callbacks. A context or
 // existing program claim invalidated there must never become a ghost row.
 if(context.isContextLost()||store.destroyed||record.epoch!==record.scheduler.epoch||claim&&(claim.lost||!claim.reservation.active||programBudgetClaims.get(program)!==claim)){ledger.refused++;return false;}
 const allowance=claim?claim.allowance:RECENT_PROGRAM_ALLOWANCE_BYTES,share=recentShare(ledger);
 let stats=budget.stats;
 // A new claim must fit now: an eviction only moves bytes to retiring.
 if(allowance>share||(!claim&&stats.bytes+allowance>stats.limitBytes)){ledger.refused++;return false;}
 // Evicting retained rows frees only their own recent bytes. When even all of
 // them could not make room in the recent subset (other caches hold the
 // rest), refuse at once instead of discarding retained progress for nothing.
 if(stats.recentBytes-ledger.bytes+allowance>stats.recentLimitBytes){ledger.refused++;return false;}
 const crowded=()=>ledger.rows.size>=RECENT_PROGRAM_MAX_ENTRIES||ledger.bytes+allowance>share||stats.recentBytes+allowance>stats.recentLimitBytes;
 while(ledger.rows.size&&crowded()){evictRecentRow(ledger.rows.values().next().value as RecentProgram,'capacity');stats=budget.stats;}
 if(crowded()||(!claim&&stats.bytes+allowance>stats.limitBytes)){ledger.refused++;return false;}
 let held=claim,recentOnly=false;
 if(held){if(!held.reservation.setRecent(true)){ledger.refused++;return false;}}
 else{
  const identity={},label=('recent '+record.resource).slice(0,256),result=budget.tryReserve({category:'program',bytes:allowance,precision:'estimate',identity,label:allowanceLabel(false,'recent')},{label,recent:true});
  if(result.ok!==true){ledger.refused++;return false;}
  if(context.isContextLost()||store.destroyed||record.epoch!==record.scheduler.epoch){result.reservation.release();ledger.refused++;return false;}
  held={reservation:result.reservation,store,context,epoch:store.contextEpoch(context),lost:false,identity,allowance,policyAllowance:true,label};recentOnly=true;
  programBudgetClaims.set(program,held);let claims=contextBudgetClaims.get(context);if(!claims){claims=new Set();contextBudgetClaims.set(context,claims);}claims.add(held);
 }
 const row:RecentProgram={ledger,store,context,scheduler:record.scheduler,epoch:record.epoch,sharedKey:record.sharedKey,resource:record.resource,inputs:Object.freeze([...record.inputs]),provenance:record.provenance,program,claim:held,recentOnly};
 retainRecentContext(ledger,context,record.scheduler);ledger.rows.add(row);ledger.bytes+=allowance;ledger.retained++;ledger.pressureAvailability?.notify();
 let rows=recentContexts.get(context);if(!rows){rows=new Set();recentContexts.set(context,rows);}rows.add(row);
 // An already charged claim just became evictable: a waiter's retry can now evict it.
 if(!recentOnly)budget.notifyReclaimable?.();
 return true;
 }finally{ledger.retaining--;if(!ledger.rows.size)deactivateRecentPressure(ledger);}
}
/** Take an exact retained executable back into use (no compile, no admission). */
function takeRecentProgram(context:WebGL2RenderingContext,epoch:number,recipe:ReadyProgramRecipe,provenance:readonly ProgramSourceAuthority[]):RecentProgram|undefined{
 const rows=recentContexts.get(context);if(!rows?.size||recipe.sharedKey===undefined)return;
 for(const row of [...rows]){
  if(row.epoch!==epoch||row.claim.lost||!row.claim.reservation.active){evictRecentRow(row,'lost');continue;}
  if(row.store.destroyed){evictRecentRow(row,'released');continue;}
  if(row.sharedKey!==recipe.sharedKey||row.resource!==recipe.resource||row.inputs.length!==recipe.inputs.length||!row.inputs.every((value,index)=>value===recipe.inputs[index])||row.provenance.length!==provenance.length||!row.provenance.every((authority,index)=>Object.is(authority,provenance[index])))continue;
  removeRecentRow(row);row.ledger.hits++;
  // Back in use: the recent-only charge ends; an own policy claim stays charged.
  if(row.recentOnly){programBudgetClaims.delete(row.program);contextBudgetClaims.get(context)?.delete(row.claim);row.claim.reservation.release();}
  else row.claim.reservation.setRecent(false);
  return row;
 }
 return undefined;
}
function adoptRecentProgram(context:WebGL2RenderingContext,scheduler:ReturnType<typeof createPreparationScheduler>,recipe:ReadyProgramRecipe,provenance:readonly ProgramSourceAuthority[],source:string):SharedProgram|undefined{
 const ledger=recentContextLedgers.get(context);if(ledger)ledger.retaining++;
 try{
  const row=takeRecentProgram(context,scheduler.epoch,recipe,provenance);if(!row)return;
  const created={} as SharedProgram;
  Object.assign(created,{id:++sharedSequence,source,resource:recipe.resource,sharedKey:recipe.sharedKey,inputs:[...recipe.inputs],provenance,budget:undefined,context,scheduler,epoch:scheduler.epoch,subscribers:new Set(),holders:new Map(),captureReferences:0,status:'ready',program:row.program,visibleDemand:recipe.priority!=='capture',closed:false,releasing:false,needsSourceBuilder:false,retain:false,retainDraining:false,worker:createPrivateProgramPreparationOwner(source,()=>settleShared(created))});
  sharedRows(context).add(created);sharedPrograms.set(row.program,created);return created;
 }finally{if(ledger){ledger.retaining--;if(!ledger.rows.size)deactivateRecentPressure(ledger);}}
}
/** Context loss: retained executables of that incarnation issue no GL call. */
function dropRecentContext(context:WebGL2RenderingContext){const rows=recentContexts.get(context);if(rows?.size)for(const row of [...rows])evictRecentRow(row,'lost');}
type RecentProgramScope=WebGL2RenderingContext|ResourceBudget|{readonly budget:ResourceBudget};
const isRecentContext=(scope:RecentProgramScope):scope is WebGL2RenderingContext=>typeof (scope as WebGL2RenderingContext).isContextLost==='function';
/** Explicit idle context reclamation or page teardown: release every retained executable and end every retention
 * drain of one context, or of every context charged to one page ledger (pass
 * a ChunkResourceStore or its ResourceBudget). Lost incarnations issue no GL
 * call. Returns the number of released executables. */
export function releaseRecentPrograms(scope:RecentProgramScope):number{
 let rows:RecentProgram[],drains:SharedProgram[];
 if(isRecentContext(scope)){rows=[...recentContexts.get(scope)??[]];drains=[...recentContextLedgers.get(scope)?.drains??[]].filter(record=>record.context===scope);}
 else{const ledger=recentLedgers.get('budget'in scope?scope.budget:scope);rows=[...ledger?.rows??[]];drains=[...ledger?.drains??[]];}
 for(const record of drains){record.retain=false;endRetentionDrain(record);releaseSharedIfUnused(record);}
 for(const row of rows)evictRecentRow(row,'released');
 return rows.length;
}
function recentProgramStats(context:WebGL2RenderingContext|undefined){
 const ledger=context?recentContextLedgers.get(context):undefined;
 return{scope:'page-ledger-recent-linked-exact-shared-executables' as const,entries:ledger?.rows.size??0,contextEntries:context?recentContexts.get(context)?.size??0:0,bytes:ledger?.bytes??0,shareLimitBytes:ledger?recentShare(ledger):0,maxEntries:RECENT_PROGRAM_MAX_ENTRIES,defaultAllowanceBytes:RECENT_PROGRAM_ALLOWANCE_BYTES,draining:ledger?.drains.size??0,drainsStarted:ledger?.drainsStarted??0,retained:ledger?.retained??0,hits:ledger?.hits??0,evictedPressure:ledger?.evictedPressure??0,evictedCapacity:ledger?.evictedCapacity??0,released:ledger?.released??0,refused:ledger?.refused??0,lost:ledger?.lost??0,eviction:'ledger-pressure-least-recently-retained-first; never by time' as const,accounting:'explicit-policy-allowance; physical-driver-bytes-unmeasured' as const};
}
/** Diagnostics of the page ledger's retained executables seen from one context. */
export function getRecentProgramStats(context:WebGL2RenderingContext){return recentProgramStats(context);}

/** Shared reuse is opt-in: sharedKey + resource + inputs + provenance must describe every
 * source/attribute-affecting input exactly. Consumers must reset all mutable GL
 * state at each draw, or include identical fixed state in that identity. Legacy
 * compile remains a unique ownership transfer. Both modes use the ONE existing
 * context scheduler, including source building, specialization and uploads. */
export type ProgramPreparationOwnerOptions={
 /** Default for this owner's last-consumer releases of exact linked shared
  * programs: keep them in the page's bounded, budget-charged recent set
  * instead of deleting them (default false: unchanged deletion). Context loss
  * never retains; dispose retains only when asked explicitly. Legacy
  * (non-shared) programs have no exact identity and are never retained.
  * Decided production scope (owner, 2026-11-01): only where a readiness
  * timeout cancels a candidate or a 2D fallback releases resident programs,
  * passed per call ({retainRecent:true} on that release/prune/cancel). An
  * owner-wide default would also retain ordinary pan trims, page-hidden
  * cancels and a destroy's releases before dispose; it needs its own decision. */
 retainRecent?:boolean;
};
/** Per call: overrides the owner's retainRecent default. */
export type ProgramReleaseOptions={retainRecent?:boolean};
function retentionOption(value:{retainRecent?:unknown}|undefined,fallback:boolean):boolean{
 if(value===undefined||value.retainRecent===undefined)return fallback;
 if(typeof value.retainRecent!=='boolean')throw new TypeError('retainRecent must be a boolean');
 return value.retainRecent;
}
export function createProgramPreparationOwner(source:string,repaint:()=>void,options?:ProgramPreparationOwnerOptions){
 const retainDefault=retentionOption(options,false);
 const local=createPrivateProgramPreparationOwner(source,repaint),legacyHeld=new Set<WebGLProgram>();let bound:WebGL2RenderingContext|undefined,lastShared:ProgramPreparationDiagnostic|undefined,sharedCacheHits=0,recentHits=0,capturedProgramReferences=0;
 const capturedPrograms=new Map<WebGLProgram,number>();
 let budgetWaitOff:(()=>void)|undefined,budgetHintOff:(()=>void)|undefined,budgetSignal=new AbortController(),lastBudgetPressure:ResourceBudgetPressure|undefined,budgetWaitCount=0,budgetWaitGeneration=0n,queuedMetadataProbe:bigint|undefined;
 let metadataFailure:{ledger:ResourceBudget;error:Error;recoverable:boolean}|undefined;
 // Recipes reported as larger than the whole ledger (never awaited).
 let unfitFailures=0,lastUnfit:{resource:string;reason:string}|undefined;
 const reportUnfit=(error:unknown)=>{if(isProgramBudgetUnfitFailure(error)){unfitFailures++;lastUnfit={resource:error.diagnostic.resource.slice(0,256),reason:(error.diagnostic.reason??'').slice(0,512)};}return error;};
 // Exact recipes refused while the current wake is registered (bounded). The
 // wake clears them: every waiter then retries through its next repaint.
 const budgetRefusals:BudgetRefusal[]=[];
 const clearBudgetWait=()=>{const off=budgetWaitOff,hint=budgetHintOff;budgetWaitOff=undefined;budgetHintOff=undefined;budgetRefusals.length=0;budgetWaitGeneration++;try{off?.();}finally{hint?.();}};
 const failMetadataWait=(ledger:ResourceBudget,error:Error,recoverable=false)=>{clearBudgetWait();metadataFailure={ledger,error,recoverable};if(!owner.disposed)repaint();};
 const metadataHintsSafe=(ledger:ResourceBudget)=>typeof ledger.supportsMetadataHintRetry==='function'&&ledger.supportsMetadataHintRetry();
 const queueMetadataProbe=()=>{
  if(!budgetWaitOff)return;const generation=budgetWaitGeneration;if(queuedMetadataProbe===generation)return;queuedMetadataProbe=generation;
  queueMicrotask(()=>{
   if(queuedMetadataProbe===generation)queuedMetadataProbe=undefined;
   if(generation!==budgetWaitGeneration||!budgetWaitOff||owner.disposed)return;
   for(const refusal of [...budgetRefusals]){
    const admission=refusal.metadataAdmission;if(!admission)continue;const ledger=admission.budget;
    if(!admission.safe||!metadataHintsSafe(ledger)){failMetadataWait(ledger,new ResourceBudgetHintUnsupportedError(),admission.safe);return;}
    try{
     const result=admission.probe();
     // A synchronous pressure callback may have installed an unknown listener
     // or cancelled this owner while the fixed-fee admission was in progress.
     if(generation!==budgetWaitGeneration||owner.disposed){if(result.status==='ready')admission.rollback();return;}
     if(!metadataHintsSafe(ledger)){if(result.status==='ready')admission.rollback();failMetadataWait(ledger,new ResourceBudgetHintUnsupportedError(),true);return;}
     if(result.status==='unfit'){failMetadataWait(ledger,unfitFailure(source,refusal.resource,bound?schedulerFor(bound).epoch:0,result.error.details.additionalBytes,result.error.details.capacity));return;}
     if(result.status==='ready'||result.status==='stale'){clearBudgetWait();if(!owner.disposed)repaint();return;}
    }catch(error){failMetadataWait(ledger,error instanceof Error?error:new Error(String(error)));return;}
   }
  });
 };
 const waitForBudget=(error:ProgramBudgetAdmissionPending,refusal?:BudgetRefusal)=>{
  lastBudgetPressure=Object.freeze({...error.pressure,label:error.pressure.label?.slice(0,256)});if(owner.disposed)return;
  const admission=error.metadataAdmission;
  if(admission&&(!refusal||!admission.safe||admission.budget!==error.ledger||!metadataHintsSafe(error.ledger))){failMetadataWait(error.ledger,new ResourceBudgetHintUnsupportedError(),!!refusal&&admission.safe&&admission.budget===error.ledger);return;}
  if(refusal){
   const index=budgetRefusals.findIndex(value=>sameBudgetRefusal(value,refusal)),row=admission?Object.freeze({...refusal,metadataAdmission:admission}):refusal;
   if(index<0){if(budgetRefusals.length>=64){failMetadataWait(error.ledger,new ResourceAvailabilityStateError('GROUND_AVAILABILITY_STATE_OVERFLOW','Program budget refusal bound exceeded'));return;}budgetRefusals.push(row);}
   else if(admission)budgetRefusals[index]=row;
  }
  if(!budgetWaitOff){
   const generation=budgetWaitGeneration;let wake=()=>{},frames:(()=>void)|undefined;
   budgetWaitOff=()=>{wake();frames?.();};
   try{wake=error.ledger.onAvailable(()=>{if(budgetRefusals.some(value=>value.metadataAdmission))queueMetadataProbe();else{clearBudgetWait();if(!owner.disposed)repaint();}},budgetSignal.signal);if(generation!==budgetWaitGeneration||!budgetWaitOff){wake();return;}
   // Bytes held by retiring GPU work return only at a frame-boundary collect.
   // While waiting, this owner takes the store's bounded follow-up frames, so a
   // still map still collects them; the wake or a cancel ends both.
   frames=error.store?.onRetirementPending?.(()=>{if(!owner.disposed)repaint();},budgetSignal.signal);if(generation!==budgetWaitGeneration||!budgetWaitOff){frames?.();wake();return;}}
   catch(failure){failMetadataWait(error.ledger,failure instanceof Error?failure:new Error(String(failure)));return;}
  }
  if(admission&&!budgetHintOff){
   if(!metadataHintsSafe(error.ledger)){failMetadataWait(error.ledger,new ResourceBudgetHintUnsupportedError(),true);return;}
   const generation=budgetWaitGeneration;
   try{const off=error.ledger.onAvailabilityStateChange(queueMetadataProbe,budgetSignal.signal);if(generation!==budgetWaitGeneration||!budgetWaitOff){off();return;}budgetHintOff=off;}
   catch(failure){failMetadataWait(error.ledger,failure instanceof Error?failure:new Error(String(failure)));return;}
   if(!metadataHintsSafe(error.ledger)){failMetadataWait(error.ledger,new ResourceBudgetHintUnsupportedError(),true);return;}
  }
  if(admission)queueMetadataProbe();
 };
 // Until that wake a refused exact recipe is answered without another
 // admission attempt, pressure eviction or source work.
 const refusedUntilWake=(recipe:ProgramPreparationRecipe,provenance:readonly ProgramSourceAuthority[])=>!!budgetWaitOff&&budgetRefusals.some(value=>(recipe.budget!==undefined||!!value.metadataAdmission)&&value.sharedKey===recipe.sharedKey&&value.resource===recipe.resource&&value.inputs.length===recipe.inputs.length&&value.inputs.every((input,index)=>input===recipe.inputs[index])&&value.provenance.length===provenance.length&&value.provenance.every((authority,index)=>Object.is(authority,provenance[index])));
 const budgetWaitResult=()=>{if(metadataFailure)throw reportUnfit(metadataFailure.error);budgetWaitCount++;return new ProgramPreparationBudgetWait(lastBudgetPressure,!!budgetWaitOff&&!owner.disposed);};
 const owner:SharedOwner={source,revision:0,disposed:false,retainRecent:retainDefault,grantedReferences:0,releasedReferences:0,pending:new Set(),held:new Map(),notify(record,status){
  const diagnostic=record.worker.stats.last;lastShared=diagnostic?{...diagnostic,source:source.slice(0,128),resource:record.resource.slice(0,256),provider:source.slice(0,128).split(/\s+/,1)[0].slice(0,64),status,epoch:record.epoch}:{source:source.slice(0,128),resource:record.resource.slice(0,256),epoch:record.epoch,status,phase:status==='ready'?'linked':'source'};repaint();
 },waitForBudget};
 // A held wake withdrawn while this owner lives becomes one retry: one repaint
 // once the withdrawing call has returned (a microtask, never a timer), so a
 // still map re-judges its demand and, if it is refused again, holds a new wake.
 // It is skipped when the owner was disposed meanwhile or already holds a new
 // wake (a retry in the same turn registered one; that wake repaints). One
 // queued retry at a time. Context loss and dispose withdraw without a retry and
 // drop one that an earlier cancel or rebind queued (a new generation), so no
 // retry repaints after them; a withdrawal after the context loss queues its own.
 // A withdrawal is a lifecycle transition (releaseGPU, hide, disable, a CPU
 // clear, a rebind): a provider must not cancel a held wake on every frame, or
 // each frame would request the next one, which is frame-rate polling.
 let withdrawnRetryQueued=false,withdrawnRetryGeneration=0;
 const retryWithdrawnWait=()=>{
  if(withdrawnRetryQueued)return;withdrawnRetryQueued=true;const generation=withdrawnRetryGeneration;
  queueMicrotask(()=>{if(generation!==withdrawnRetryGeneration)return;withdrawnRetryQueued=false;if(!owner.disposed&&!budgetWaitOff)repaint();});
 };
 const dropWithdrawnRetry=()=>{withdrawnRetryGeneration++;withdrawnRetryQueued=false;};
 function cancelShared(retain:boolean,retry=true){const held=!!budgetWaitOff;clearBudgetWait();metadataFailure=undefined;budgetSignal.abort();if(!owner.disposed)budgetSignal=new AbortController();owner.revision++;for(const subscriber of [...owner.pending])removeSharedSubscriber(subscriber,'cancelled',true,retain);if(!retry||owner.disposed)dropWithdrawnRetry();else if(held)retryWithdrawnWait();}
 function releaseContextOwnership(context:WebGL2RenderingContext){
  for(const [program,held]of [...owner.held])if(held.record.context===context){const count=held.count;for(let i=0;i<count;i++)releaseProgram(context,program,{retainRecent:false});}
  for(const program of [...legacyHeld]){const transferred=transferredPrograms.get(program);if(transferred?.context===context)releaseProgram(context,program);}
 }
 function forgetInvalidLegacyOwnership(){
  for(const program of [...legacyHeld]){const transferred=transferredPrograms.get(program);if(transferred&&(transferred.epoch!==schedulerFor(transferred.context).epoch||transferred.context.isContextLost())){releaseLostProgramBudget(program);transferred.released=true;legacyHeld.delete(program);}}
 }
 function bind(context:WebGL2RenderingContext){if(owner.disposed)throw new ProgramPreparationPending('cancelled');if(bound&&bound!==context){cancelShared(false);local.cancel();releaseContextOwnership(bound);}bound=context;}
 function releaseProgram(context:WebGL2RenderingContext,program:WebGLProgram,options?:ProgramReleaseOptions){
  const record=sharedPrograms.get(program),retain=retentionOption(options,retainDefault);
  if(record){const held=owner.held.get(program);if(!held||held.record!==record)return;record.retain=retain;owner.releasedReferences++;held.count--;const count=(record.holders.get(owner)??0)-1;if(count>0)record.holders.set(owner,count);else record.holders.delete(owner);if(!held.count)owner.held.delete(program);releaseSharedIfUnused(record);return;}
  const transferred=transferredPrograms.get(program);if(transferred){if(transferred.owner!==owner||transferred.released||transferred.context!==context)return;transferred.released=true;transferred.deleteRequested=true;legacyHeld.delete(program);if(transferred.epoch!==schedulerFor(context).epoch||context.isContextLost()){releaseLostProgramBudget(program);return;}if(transferred.captureReferences)return;}
  if(!context.isContextLost())deleteTrackedProgram(context,program);
 }
 function retainProgram(context:WebGL2RenderingContext,program:WebGLProgram):()=>void{
  const continuingCapture=capturedPrograms.has(program);
  if((owner.disposed||bound!==context)&&!continuingCapture)throw new ProgramPreparationPending('cancelled');
  if(context.isContextLost())throw new ProgramPreparationPending('lost');
  const record=sharedPrograms.get(program);
  let release:()=>void;
  if(record){
   if(record.closed||record.context!==context||record.epoch!==schedulerFor(context).epoch)throw new ProgramPreparationPending('lost');
   if((!owner.held.has(program)&&!continuingCapture)||record.status!=='ready'||record.program!==program)throw new ProgramPreparationPending('cancelled');
   record.captureReferences++;
   release=()=>{if(!record.closed){record.captureReferences--;releaseSharedIfUnused(record);}};
  }else{
   const transferred=transferredPrograms.get(program);
   if(!transferred||transferred.owner!==owner||transferred.context!==context||((transferred.released||!legacyHeld.has(program))&&!continuingCapture))throw new ProgramPreparationPending('cancelled');
   if(transferred.epoch!==schedulerFor(context).epoch)throw new ProgramPreparationPending('lost');
   transferred.captureReferences++;
   release=()=>{
    transferred.captureReferences--;
    if(!transferred.captureReferences&&transferred.deleteRequested){
     if(transferred.epoch===schedulerFor(context).epoch&&!context.isContextLost())deleteTrackedProgram(context,program);
     else releaseLostProgramBudget(program);
    }
   };
  }
  capturedProgramReferences++;capturedPrograms.set(program,(capturedPrograms.get(program)??0)+1);let released=false;
  // This independent pass role survives renderer cancel/dispose. The executing
  // capture, rather than that renderer, owns its one final release.
  return()=>{if(released)return;released=true;capturedProgramReferences--;const count=capturedPrograms.get(program)!-1;if(count)capturedPrograms.set(program,count);else capturedPrograms.delete(program);release();};
 }
 function grant(record:SharedProgram){
  const program=record.program!;owner.grantedReferences++;record.holders.set(owner,(record.holders.get(owner)??0)+1);const held=owner.held.get(program);if(held)held.count++;else owner.held.set(program,{record,count:1});return program;
 }
 function grantReady(record:SharedProgram){
  const program=grant(record),subscriber=[...owner.pending].find(value=>value.record===record);if(subscriber)removeSharedSubscriber(subscriber,'ready',false);sharedCacheHits++;return program;
 }
 function guardSharedDemand(context:WebGL2RenderingContext,recipe:ReadyProgramRecipe){
  const scheduler=schedulerFor(context);
  if(context.isContextLost()){scheduler.invalidate();invalidateSharedContext(context);throw new ProgramPreparationPending('lost');}
  if(recipe.current&&!recipe.current())throw new ProgramPreparationPending('cancelled');
  return scheduler;
 }
 function projectStats(){
  const own=local.stats,demands=[...owner.pending],records=[...new Set(demands.map(value=>value.record))],pending=records.filter(record=>record.status==='pending'),failed=records.filter(record=>record.status==='failed'),ready=records.filter(record=>record.status==='ready');
  const executions=records.map(record=>({record,stats:record.worker.stats}));
  // Shared records this owner now holds keep their execution's recipe
  // accounting and terminal phases after consumption (no pending/ready rows).
  const heldAccounting=[...new Set([...owner.held.values()].map(value=>value.record))].filter(record=>!records.includes(record)).map(record=>record.worker.accounting);
  const accounted=[...executions.map(value=>value.stats),...heldAccounting];
  const pendingRows=executions.filter(value=>value.record.status==='pending').flatMap(({record,stats})=>stats.pendingResources.map(row=>({...row,source:source.slice(0,128),executionSource:record.source.slice(0,128),sharedExecution:record.id}))),failureRows=executions.filter(value=>value.record.status==='failed').flatMap(value=>value.stats.failures);
  const submitted=own.submitted+executions.reduce((count,value)=>count+value.stats.submitted,0),retiring=own.retiring+executions.reduce((count,value)=>count+value.stats.retiring,0),resumable=own.resumable+executions.reduce((count,value)=>count+value.stats.resumable,0),sourceRetainedCharacters=own.sourceRetainedCharacters+executions.reduce((count,value)=>count+value.stats.sourceRetainedCharacters,0);
  const last=lastShared&&(!own.last||(lastShared.timing?.settledAtMs??0)>=(own.last.timing?.settledAtMs??0))?lastShared:own.last;
  const waitingForBudget=!!budgetWaitOff,budgetRows:ProgramPreparationDiagnostic[]=waitingForBudget?[{source:source.slice(0,128),resource:lastBudgetPressure?.label??'program-budget',epoch:bound?schedulerFor(bound).epoch:0,status:'pending',phase:'budget-admission',reason:'Required '+lastBudgetPressure?.required+' bytes; capacity '+lastBudgetPressure?.capacity}]:[];
  const heldPrograms=new Set([...owner.held.keys(),...legacyHeld]),heldClaims=[...heldPrograms].map(program=>programBudgetClaims.get(program)).filter((claim):claim is ProgramBudgetClaim=>!!claim&&!claim.lost&&claim.reservation.active);
  const budget={waitingForAvailability:waitingForBudget,budgetWaits:budgetWaitCount,refusedRecipes:waitingForBudget?budgetRefusals.length:0,unfitFailures,lastUnfit:lastUnfit?{...lastUnfit}:undefined,lastPressure:lastBudgetPressure?{...lastBudgetPressure}:undefined,scope:'private-lifetime-and-current-shared-demand-or-holding',budgetedRecipes:own.budgetedRecipes+accounted.reduce((n,value)=>n+value.budgetedRecipes,0),unbudgetedRecipes:own.unbudgetedRecipes+accounted.reduce((n,value)=>n+value.unbudgetedRecipes,0),driverAllowanceRecipes:own.driverAllowanceRecipes+accounted.reduce((n,value)=>n+value.driverAllowanceRecipes,0),unmeasuredDriverRecipes:own.unmeasuredDriverRecipes+accounted.reduce((n,value)=>n+value.unmeasuredDriverRecipes,0),heldDriverAllowancePrograms:heldClaims.length,heldDriverAllowanceBytes:heldClaims.reduce((n,claim)=>n+claim.allowance,0),heldUnmeasuredDriverPrograms:heldPrograms.size-heldClaims.length,policyAllowanceRecipes:own.policyAllowanceRecipes+accounted.reduce((n,value)=>n+value.policyAllowanceRecipes,0),policyAllowanceBytes:LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES,sourceAccounting:'generated-UTF16-logical-source-and-attributes',driverAccounting:'explicit-or-policy-estimate-per-budgeted-program; physical-driver-bytes-unmeasured'};
  return{...own,phaseTimingsScope:'private-owner-lifetime-excludes-shared-programs',executionStatsScope:'private-and-unique-shared-executions-demanded-by-this-owner',terminalPhases:mergeTerminalPhases([own.terminalPhases,...accounted.map(value=>value.terminalPhases)]),terminalPhasesScope:'private-lifetime-and-current-shared-demand-or-holding',recent:{...recentProgramStats(bound),ownerHits:recentHits,ownerDefault:retainDefault},submitted,retiring,resumable,sourceRetainedCharacters,sourceRetainedBytesEstimate:sourceRetainedCharacters*2,sourceRetainedScope:'logical-generated-source-utf16-estimate',budget,revision:owner.revision,ownedLegacyPrograms:legacyHeld.size,pending:own.pending+pending.length+Number(waitingForBudget),failed:own.failed+failed.length,ready:own.ready+ready.length,pendingResources:[...own.pendingResources,...pendingRows,...budgetRows].slice(0,8),pendingResourcesTruncated:own.pendingResourcesTruncated||own.pendingResources.length+pendingRows.length+budgetRows.length>8,failures:[...own.failures,...failureRows].slice(0,16),last,context:bound?schedulerFor(bound).stats:undefined,resourceObjects:bound?resourceObjectStats(bound):undefined,shared:{grantedReferences:owner.grantedReferences,releasedReferences:owner.releasedReferences,pending:pending.length,ready:ready.length,heldPrograms:owner.held.size,heldReferences:[...owner.held.values()].reduce((n,value)=>n+value.count,0),cacheHits:sharedCacheHits,demands:executions.map(({record,stats})=>({execution:record.id,source:record.source.slice(0,128),resource:record.resource.slice(0,256),epoch:record.epoch,status:record.status,subscribers:record.subscribers.size,holders:record.holders.size,submitted:stats.submitted,retiring:stats.retiring,resumable:stats.resumable}))}};
 }
 return{
  work(context:WebGL2RenderingContext,recipe:Parameters<PrivateOwner['work']>[1]){bind(context);return local.work(context,recipe);},
  compile(context:WebGL2RenderingContext,recipe:ProgramPreparationRecipe):WebGLProgram{
   bind(context);if(metadataFailure)throw reportUnfit(metadataFailure.error);const provenance=snapshotProgramProvenance(recipe.provenance);
   if(recipe.sharedKey===undefined){try{if(recipe.budget!==undefined)guardSharedDemand(context,recipe);if(refusedUntilWake(recipe,provenance)&&!local.demanded(recipe))throw budgetWaitResult();const program=local.compile(context,recipe);transferredPrograms.set(program,{context,epoch:schedulerFor(context).epoch,released:false,owner,captureReferences:0,deleteRequested:false});legacyHeld.add(program);return program;}catch(error){if(error instanceof ProgramBudgetAdmissionPending){waitForBudget(error,budgetRefusal(recipe,provenance));throw budgetWaitResult();}throw reportUnfit(error);}}
   const scheduler=guardSharedDemand(context,recipe),currentPriority=recipe.currentPriority?.()??recipe.priority??'visible';
   let record=findSharedProgram(context,scheduler.epoch,recipe,provenance);
   if(record?.status==='ready')return grantReady(record);
   if(record?.status==='failed'&&!(currentPriority==='visible'&&!record.visibleDemand))throw reportUnfit(record.failure!);
   let admission:ProgramBudgetTicket|undefined;
   if(!record){
    // An exact retained executable answers before any admission, so a
    // pressure eviction cannot discard the very program being reused.
    const recent=adoptRecentProgram(context,scheduler,recipe,provenance,source);if(recent){recentHits++;return grantReady(recent);}
    if(refusedUntilWake(recipe,provenance))throw budgetWaitResult();
    try{admission=admitProgramBudget(context,recipe.budget,recipe.resource,source,scheduler.epoch);guardSharedDemand(context,recipe);}catch(error){admission?.reservation.release();admission=undefined;if(error instanceof ProgramBudgetAdmissionPending){record=findSharedProgram(context,scheduler.epoch,recipe,provenance);if(record?.status==='ready')return grantReady(record);if(!record){waitForBudget(error,budgetRefusal(recipe,provenance));throw budgetWaitResult();}}else throw reportUnfit(error);}
    record=findSharedProgram(context,scheduler.epoch,recipe,provenance);
    if(record){admission?.reservation.release();admission=undefined;if(record.status==='ready')return grantReady(record);}
    else{const created={} as SharedProgram;Object.assign(created,{id:++sharedSequence,source,resource:recipe.resource,sharedKey:recipe.sharedKey,inputs:[...recipe.inputs],provenance,budget:admission?Object.freeze({sourceBytesUpperBound:admission.upperBound,submittedAllowanceBytes:admission.policyAllowance?undefined:admission.allowance,workspaceCosts:admission.workspaceCosts}):undefined,context,scheduler,epoch:scheduler.epoch,subscribers:new Set(),holders:new Map(),captureReferences:0,status:'pending',visibleDemand:currentPriority==='visible',closed:false,releasing:false,needsSourceBuilder:true,retain:false,retainDraining:false,worker:createPrivateProgramPreparationOwner(source,()=>settleShared(created))});record=created;sharedRows(context).add(record);}
   }
   if(record.status==='failed'&&!(currentPriority==='visible'&&!record.visibleDemand)){admission?.reservation.release();throw reportUnfit(record.failure!);}
   // A first-visible retry or a fully drained partial submission starts source
   // work again. Pending KHR resumption has no source phase to rebuild; admission
   // waits and still-queued work have not consumed their builders yet.
   if(record.status==='failed'||record.status==='cancelled')record.needsSourceBuilder=true;
   let subscriber=[...owner.pending].find(value=>value.record===record);
   if(subscriber&&subscriber.revision!==owner.revision){removeSharedSubscriber(subscriber,'cancelled');subscriber=undefined;}
   if(!subscriber){subscriber={owner,record,revision:owner.revision,priority:currentPriority,currentPriority:recipe.currentPriority,build:record.needsSourceBuilder?recipe.build:undefined,resolveSource:record.needsSourceBuilder?recipe.resolveSource:undefined,budget:record.needsSourceBuilder?()=>recipe.budget:undefined,current:recipe.current,status:'pending'};owner.pending.add(subscriber);record.subscribers.add(subscriber);}else{subscriber.build=record.needsSourceBuilder?recipe.build:undefined;subscriber.resolveSource=record.needsSourceBuilder?recipe.resolveSource:undefined;subscriber.budget=record.needsSourceBuilder?()=>recipe.budget:undefined;subscriber.current=recipe.current;subscriber.priority=currentPriority;subscriber.currentPriority=recipe.currentPriority;}
   record.visibleDemand ||= currentPriority==='visible';record.status='pending';
   const priority=refreshSharedPriority(record);
   try{record.worker.compile(context,sharedRecipe(record,priority),admission);}
   catch(error){if(error instanceof ProgramBudgetAdmissionPending){const refusal=budgetRefusal(record,record.provenance);for(const waiting of [...record.subscribers]){waiting.owner.waitForBudget(error,refusal);removeSharedSubscriber(waiting,'cancelled',false);}releaseSharedIfUnused(record);throw budgetWaitResult();}if(!isProgramPreparationPending(error)){if((record.status as PreparationStatus)!=='failed'){record.status='failed';record.failure=error instanceof ProgramPreparationFailure?error:new ProgramPreparationFailure({source,resource:recipe.resource,epoch:scheduler.epoch,status:'failed',phase:'source',reason:String(error)});}throw reportUnfit(record.failure);}throw new ProgramPreparationPending(error.status);}
   finally{if(admission&&!admission.consumed)admission.reservation.release();}
   throw new ProgramPreparationPending();
  },
  /** Observe this owner's exact live shared demand without admitting new work.
   * Polling an existing job must not consume a renderer's new-compile slot. */
  hasPendingProgram(context:WebGL2RenderingContext,recipe:ReadyProgramRecipe):boolean{
   if(owner.disposed||bound!==context||context.isContextLost()||recipe.sharedKey===undefined)return false;
   const record=findSharedProgram(context,schedulerFor(context).epoch,recipe,snapshotProgramProvenance(recipe.provenance));
   return !!record&&!record.closed&&record.status==='pending'&&[...owner.pending].some(value=>value.record===record&&value.revision===owner.revision&&value.status==='pending');
  },
  /** Acquire an already linked exact shared recipe without creating any demand. */
  acquireReadyProgram(context:WebGL2RenderingContext,recipe:ReadyProgramRecipe):WebGLProgram|undefined{
   bind(context);const provenance=snapshotProgramProvenance(recipe.provenance),scheduler=guardSharedDemand(context,recipe);
   if(recipe.sharedKey===undefined)return undefined;
   const record=findSharedProgram(context,scheduler.epoch,recipe,provenance);
   if(record)return record.status==='ready'?grantReady(record):undefined;
   // A retained exact executable is already linked: taking it creates no demand.
   const recent=adoptRecentProgram(context,scheduler,recipe,provenance,source);if(recent){recentHits++;return grantReady(recent);}
   return undefined;
  },
  releaseProgram,retainProgram,
  /** True while a refused admission of this owner waits on the page ledger's
   * onAvailable wake, which repaints; such a demand needs no caller frame. */
  get waitingForBudget(){return !!budgetWaitOff&&!owner.disposed;},
  /** Monotonic count of compile demands answered with a budget wait. Compared
   * around a caller's own attempts it separates that wait from other pending. */
  get budgetWaits(){return budgetWaitCount;},
  /** programPreparationNeedsFrame for this owner: pass budgetWaits as read
   * before the attempt that left work pending. */
  needsFrameAfter(budgetWaitsBefore:number|undefined){return programPreparationNeedsFrame({waitingForBudget:!!budgetWaitOff&&!owner.disposed,budgetWaits:budgetWaitCount},budgetWaitsBefore);},
  /** Retire demands that no consumer will take, including already linked
   * results outside the scheduler queue. Renderer-held programs stay owned.
   * retainRecent (default: the owner option) keeps exact linked shared results. */
  prune(options?:ProgramReleaseOptions){
   const retain=retentionOption(options,retainDefault);
   if(bound&&bound.isContextLost()){schedulerFor(bound).invalidate();invalidateSharedContext(bound);forgetInvalidLegacyOwnership();}
   local.prune();
   for(const subscriber of [...owner.pending]){
    const record=subscriber.record;
    if(record.closed||record.epoch!==record.scheduler.epoch||!currentSharedSubscriber(subscriber))removeSharedSubscriber(subscriber,record.epoch!==record.scheduler.epoch?'lost':'cancelled',true,retain);else refreshSharedPriority(record);
   }
  },
  /** retainRecent (default: the owner option): an exact link-submitted shared
   * demand completes into the recent set; unsubmitted work is still cancelled
   * and refunded, and a partial shader submission still drains and deletes.
   * A held budget wake this withdraws is replaced by one repaint after the call
   * returns (see retryWithdrawnWait), unless the owner is disposed or holds a
   * new wake by then; contextLost() and dispose() withdraw without one and drop
   * a retry an earlier cancel of the same turn queued. Not a per-frame call:
   * cancelling a held wake every frame would make every frame request another. */
  cancel(options?:ProgramReleaseOptions){cancelShared(retentionOption(options,retainDefault));local.cancel();},
  contextLost(){if(bound){schedulerFor(bound).invalidate();invalidateSharedContext(bound);}forgetInvalidLegacyOwnership();cancelShared(false,false);local.cancel();},
  /** Teardown: retains nothing unless retainRecent:true is passed here. */
  dispose(options?:ProgramReleaseOptions){if(owner.disposed)return;const retain=retentionOption(options,false);owner.disposed=true;cancelShared(retain);local.cancel();for(const [program,held]of [...owner.held]){const count=held.count;for(let i=0;i<count;i++)releaseProgram(held.record.context,program,{retainRecent:retain});}for(const program of [...legacyHeld]){const transferred=transferredPrograms.get(program);if(transferred)releaseProgram(transferred.context,program);}},
  /** Boolean equivalent of stats.pending, including refused budget admission. */
  get hasPending(){
   if(local.hasPending||budgetWaitOff)return true;
   for(const subscriber of owner.pending)if(subscriber.record.status==='pending')return true;
   return false;
  },
  get stats(){return readRenderDiagnosticSnapshot(projectStats);},
 };
}
