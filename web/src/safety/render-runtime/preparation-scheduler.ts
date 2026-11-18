export type PreparationStatus='pending'|'failed'|'ready'|'cancelled'|'lost';
export type PreparationPriority='visible'|'capture';
export type PreparationIdentity={source:string;resource:string};
export type PreparationJob={identity:PreparationIdentity;priority:PreparationPriority;status:PreparationStatus;epoch:number;step:()=>boolean;dispose:()=>void;settled:()=>void;current?:()=>boolean;currentPriority?:()=>PreparationPriority;error?:unknown;requiresProgramSlot?:boolean;submitted?:boolean;waiting?:boolean;abandoned?:boolean;abandon?:()=>void;
 /** Stable owner identity, shared by all its resources and execution records. */
 group?:string;
 /** Diagnostic name of the phase the next step executes; never source text. */
 phase?:()=>string;
 queuedAtMs?:number;startedAtMs?:number;settledAtMs?:number};
/** The step that dominated the longest dispatch turn (diagnostic copy). */
export type PreparationTurnRecord={elapsedMs:number;steps:number;yieldReason:string;source:string;resource:string;priority:PreparationPriority;phase:string;stepMs:number};
type DispatchTiming={calls:number;totalMs:number;maxMs:number;lastMs:number};

// Page-wide registry of visible readiness deadlines in progress. A readiness
// wait (resident-draw-readiness.ts) registers under this global key without
// importing this module, because its loaders admit no extra dependency; both
// sides only add/delete one token object in the same Set.
const VISIBLE_READINESS_DEADLINES=Symbol.for('crimemaps.render-runtime.visible-readiness-deadlines');
type VisibleReadinessDeadlines={active:Set<object>};
function visibleReadinessDeadlines():VisibleReadinessDeadlines{
 const host=globalThis as unknown as Record<symbol,VisibleReadinessDeadlines|undefined>;
 return host[VISIBLE_READINESS_DEADLINES]??={active:new Set<object>()};
}
/** True while any provider's visible readiness deadline is running. */
export function visibleReadinessDeadlineActive():boolean{return visibleReadinessDeadlines().active.size>0;}
/** Register one visible readiness deadline; the returned end is idempotent. */
export function beginVisibleReadinessDeadline():()=>void{
 const token={},registry=visibleReadinessDeadlines();registry.active.add(token);
 return()=>{registry.active.delete(token);};
}

/** One context, one synchronous CPU step, at most two admitted program chains.
 * A submitted waiter keeps its driver slot until its terminal step completes.
 * A turn cooperatively advances short phases; synchronous driver calls cannot yield.
 * visibleDeadline (default: the page registry above) only reorders CPU service. */
export function createPreparationScheduler(options:{lost:()=>boolean;schedule?:(work:()=>void)=>void;visibleDeadline?:()=>boolean}){
 const queue:PreparationJob[]=[],parked:PreparationJob[]=[],jobs=new Set<PreparationJob>(),admittedPrograms=new Set<PreparationJob>(),completed=new WeakSet<PreparationJob>(),abandonNotified=new WeakSet<PreparationJob>();
 let active:PreparationJob|undefined,stepping:PreparationJob|undefined,deferredFinish:{job:PreparationJob;status:PreparationStatus}|undefined,scheduled=false,ticking=false,epoch=0,visibleStarts=0,lossObserved=false,preferParked=false;
 const serviceOrder={visible:new Map<string,number>(),capture:new Map<string,number>()},servedVisibleGroups=new Set<string>();
 let serviceSequence=0,visibleQuanta=0,visibleProgramAdmissions=0,deadlineRound:Set<string>|undefined,deadlineWasActive=false,scheduledAtMs:number|undefined;
 const schedule=options.schedule??(work=>{setTimeout(work,0);}),visibleDeadline=options.visibleDeadline??visibleReadinessDeadlineActive;
 // A 2 ms slice can stop between shader submission and link, leaving the
 // driver idle for a whole delayed browser callback. Four milliseconds lets
 // short chains submit together; the step cap, two program slots and one KHR
 // poll per waiter per turn still bound work and preserve cooperative yields.
 const sliceBudgetMs=4,maxStepsPerTurn=16;
 let turns=0,steps=0,lastSteps=0,maxSteps=0,lastElapsedMs=0,maxElapsedMs=0,lastYieldReason='idle';
 // Start counters describe executions, while the 3:1 rule counts bounded CPU
 // service quanta so a continuing job cannot indefinitely postpone capture.
 let visibleStartsTotal=0,captureStartsTotal=0,deadlineCaptureStarts=0,deferredCaptures=0,deferredCaptureJobs=0,longestTurn:PreparationTurnRecord|undefined;
 const deferredJobs=new WeakSet<PreparationJob>();
 const yieldReasons:Record<string,number>={'idle':0,'waiting':0,'slice-budget':0,'step-limit':0,'context-lost':0,'epoch-change':0};
 // Fixed scalar accounts, never a per-job/frame log. Callback delay is time
 // outside a dispatch turn. Selection, guard (including guard cancellation),
 // step(), and the remaining turn/terminal bookkeeping partition turn time.
 const timing={callbackDelay:{calls:0,totalMs:0,maxMs:0,lastMs:0},selection:{calls:0,totalMs:0,maxMs:0,lastMs:0},guard:{calls:0,totalMs:0,maxMs:0,lastMs:0},step:{calls:0,totalMs:0,maxMs:0,lastMs:0},turnOverhead:{calls:0,totalMs:0,maxMs:0,lastMs:0}} satisfies Record<string,DispatchTiming>;
 const recordTime=(row:DispatchTiming,elapsedMs:number)=>{const ms=Math.max(0,elapsedMs);row.calls++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);row.lastMs=ms;};
 const groupFor=(job:PreparationJob)=>job.group??job.identity.source;
 function clearServiceHistory(){serviceOrder.visible.clear();serviceOrder.capture.clear();serviceSequence=0;visibleProgramAdmissions=0;servedVisibleGroups.clear();deadlineRound=undefined;}
 function remove(job:PreparationJob){
  const queued=queue.indexOf(job);if(queued>=0)queue.splice(queued,1);
  const waiting=parked.indexOf(job);if(waiting>=0)parked.splice(waiting,1);
  if(active===job)active=undefined;jobs.delete(job);admittedPrograms.delete(job);
  // A last job can enqueue its next same-owner resource from settled(). Keep
  // its service position while any peer waits, even across that empty instant.
  // Round membership is history too; choose() checks actual queued eligibility.
  if(!jobs.size)clearServiceHistory();
 }
 function complete(job:PreparationJob){
  if(completed.has(job))return;completed.add(job);job.currentPriority=undefined;
  // One callback cannot interrupt another job's context-wide retirement. Mark
  // the attempts first so reentrant cancellation never repeats either callback.
  try{job.dispose();}catch(error){job.error??=error===undefined?new Error('Preparation disposal failed'):error;if(job.status==='ready')job.status='failed';}
  job.settledAtMs??=performance.now();
  try{job.settled();}catch(error){job.error??=error===undefined?new Error('Preparation settlement failed'):error;}
 }
 function finish(job:PreparationJob,status:PreparationStatus){
  if(completed.has(job)||job.settledAtMs!==undefined)return;
  if(job.status==='lost')status='lost';else if(job.status==='cancelled'&&status==='failed')status='cancelled';
  job.status=status;remove(job);
  // Reentrant cancellation/loss may occur inside a driver or source callback.
  // Disposal and terminal observation wait for that exact step to unwind.
  if(stepping===job){deferredFinish={job,status};return;}complete(job);
 }
 function invalidate(){
  if(lossObserved)return;lossObserved=true;epoch++;
  const lost=new Set(jobs);if(stepping)lost.add(stepping);
  queue.length=0;parked.length=0;active=undefined;visibleQuanta=0;clearServiceHistory();
  for(const job of lost)finish(job,'lost');
 }
 function wake(){if(ticking||scheduled||!jobs.size)return;scheduled=true;scheduledAtMs=performance.now();try{schedule(tick);}catch(error){scheduled=false;scheduledAtMs=undefined;throw error;}}
 function notifyAbandon(job:PreparationJob){
  if(abandonNotified.has(job))return;abandonNotified.add(job);job.currentPriority=undefined;
  try{job.abandon?.();}catch(error){job.error??=error===undefined?new Error('Preparation abandonment failed'):error;}
 }
 function cancel(job:PreparationJob){
  if(job.status!=='pending'||!jobs.has(job))return;
  if(job.submitted){if(!job.abandoned){job.abandoned=true;notifyAbandon(job);}}
  else finish(job,'cancelled');
  wake();
 }
 function fail(job:PreparationJob,error:unknown){
  job.error=error===undefined?new Error('Preparation job failed without an error'):error;
  // The private program step owns debt drainage after submission. An unexpected
  // throw takes the same minimal cleanup path, without pretending it was cancel.
  if(job.submitted)notifyAbandon(job);else finish(job,'failed');
 }
 function parkWaitingActive(){
  if(active?.waiting){if(!parked.includes(active))parked.push(active);active=undefined;}
 }
 function yieldActive(job:PreparationJob){
  if(active!==job||job.status!=='pending'||!jobs.has(job))return;
  active=undefined;
  // Keep a program's generated workspace/driver chain local within its owner,
  // but give every other owner a choice after this exact synchronous step.
  // Pure multi-step resource jobs rotate within their one shared group too.
  const sibling=job.requiresProgramSlot?queue.findIndex(value=>value.priority===job.priority&&groupFor(value)===groupFor(job)):-1;
  if(sibling<0)queue.push(job);else queue.splice(sibling,0,job);
 }
 function serviceCPU(job:PreparationJob){
  const group=groupFor(job);serviceOrder[job.priority].set(group,++serviceSequence);
  if(job.priority==='visible'){visibleQuanta++;servedVisibleGroups.add(group);deadlineRound?.delete(group);}
  else{visibleQuanta=0;servedVisibleGroups.clear();deadlineRound=undefined;}
 }
 function captureMayStart(){
  if(!queue.some(job=>job.priority==='visible'&&job.requiresProgramSlot&&!admittedPrograms.has(job)))return true;
  if(visibleProgramAdmissions<3)return false;
  if(!admittedPrograms.size)return true;
  for(const job of admittedPrograms)if(job.priority==='visible'&&!job.abandoned&&job.error===undefined)return true;
  return false;
 }
 function nextCPU(){
  parkWaitingActive();
  // A parked poll can settle between selection and CPU execution, changing
  // subscriber roles or admitting a new main demand. Reconsider that saved
  // choice before it acquires a chain; it has not received CPU service yet.
  if(active){queue.unshift(active);active=undefined;}
  const slotAvailable=admittedPrograms.size<2;
  // CPU quanta and new program chains have different costs. Three shader
  // phases never buy capture a whole new admission. While a main start waits,
  // keep one live main chain or an empty slot for it, then permit one capture
  // after three fresh main admissions. Existing submitted/retiring capture
  // always keeps its slot; a newly freed slot beside capture goes to main.
  // With no waiting main, capture may use either otherwise idle admission.
  const captureAdmission=captureMayStart();
  const eligible=(job:PreparationJob)=>!job.requiresProgramSlot||admittedPrograms.has(job)||slotAvailable&&(job.priority==='visible'||captureAdmission);
  const deadline=visibleDeadline();if(deadline&&!deadlineWasActive)servedVisibleGroups.clear();if(!deadline)deadlineRound=undefined;deadlineWasActive=deadline;
  // Least recently served stable owner wins; queue order breaks ties and keeps
  // first starts FIFO within that owner. Resource names never create new owners.
  const choose=(priority:PreparationPriority,groups?:Set<string>)=>{
   let index=-1,order=Infinity;
   for(let i=0;i<queue.length;i++){const job=queue[i],group=groupFor(job);if(job.priority!==priority||!eligible(job)||groups&&!groups.has(group))continue;const served=serviceOrder[priority].get(group)??0;if(served<order||served===order&&index>=0&&group===groupFor(queue[index])&&admittedPrograms.has(job)&&!admittedPrograms.has(queue[index])){index=i;order=served;}}
   return index;
  };
  const capture=choose('capture'),visible=choose('visible');
  let index=visible;
  if(capture>=0&&(visible<0||visibleQuanta>=3)){
   index=capture;
   if(visible>=0&&deadline){
    // Before the owed capture quantum, let each currently runnable visible
    // owner advance once. This includes CPU preflight/upload, not only programs.
    // Freeze this round: arrivals cannot extend it and starve capture forever.
    deadlineRound??=new Set(queue.filter(job=>job.priority==='visible'&&eligible(job)&&!servedVisibleGroups.has(groupFor(job))).map(groupFor));
    const protectedVisible=choose('visible',deadlineRound);
    if(protectedVisible>=0){index=protectedVisible;deferredCaptures++;const deferred=queue[capture];if(!deferredJobs.has(deferred)){deferredJobs.add(deferred);deferredCaptureJobs++;}}
   }
  }
  if(index<0)return;active=queue.splice(index,1)[0];return active;
 }
 function advance(job:PreparationJob,turnEpoch:number):boolean{
  if(active===job)serviceCPU(job);
  if(job.startedAtMs===undefined){job.startedAtMs=performance.now();if(active===job){if(job.priority==='visible'){visibleStarts++;visibleStartsTotal++;}else{visibleStarts=0;captureStartsTotal++;if(visibleDeadline())deadlineCaptureStarts++;}}}
  try{
   // Abandoned/error-retiring work is no longer a live consumer, but must keep
   // draining its already submitted driver work until private cleanup is done.
   const guardStartedAtMs=performance.now();
   try{if(!job.abandoned&&job.error===undefined){if(job.current&&!job.current())cancel(job);else if(job.status==='pending'&&job.currentPriority)job.priority=job.currentPriority();}}
   finally{recordTime(timing.guard,performance.now()-guardStartedAtMs);}
  }catch(error){fail(job,error);}
  if(options.lost()){invalidate();return false;}
  if(epoch!==turnEpoch||job.status!=='pending'||job.epoch!==turnEpoch)return false;
  // Source construction already owns one of the two chain admissions. A
  // yielded source cannot let a third chain start before either one settles.
  if(job.requiresProgramSlot&&!admittedPrograms.has(job)){
   // Shared current() can prune the last main subscriber or synchronously
   // introduce another demand. Recheck the real role/slot after that guard.
   if(admittedPrograms.size>=2||job.priority==='capture'&&!captureMayStart()){yieldActive(job);return false;}
   admittedPrograms.add(job);
   if(job.priority==='visible')visibleProgramAdmissions=Math.min(3,visibleProgramAdmissions+1);else visibleProgramAdmissions=0;
  }
  stepping=job;
  try{
   const stepStartedAtMs=performance.now();let done:boolean;
   try{done=job.step();}finally{recordTime(timing.step,performance.now()-stepStartedAtMs);}
   if(options.lost()){invalidate();return true;}
   if(job.status==='pending'&&job.epoch===epoch&&epoch===turnEpoch&&done)finish(job,job.abandoned?'cancelled':job.error!==undefined?'failed':'ready');
  }catch(error){
   if(options.lost()){invalidate();return true;}
   if(job.status==='pending'&&job.epoch===epoch&&epoch===turnEpoch)fail(job,error);
  }finally{
   stepping=undefined;
   if(deferredFinish?.job===job){const terminal=deferredFinish;deferredFinish=undefined;job.status=terminal.status;complete(job);}
   parkWaitingActive();
   yieldActive(job);
  }
  return true;
 }
 function tick(){
  if(ticking)return;scheduled=false;ticking=true;
  const startedAtMs=performance.now(),turnEpoch=epoch,checkedWaiters=new Set<PreparationJob>();
  if(scheduledAtMs!==undefined)recordTime(timing.callbackDelay,startedAtMs-scheduledAtMs);scheduledAtMs=undefined;
  const accountedBefore=timing.selection.totalMs+timing.guard.totalMs+timing.step.totalMs;
  let turnSteps=0,attempts=0,reason='idle',longestStep:{source:string;resource:string;priority:PreparationPriority;phase:string;stepMs:number}|undefined;turns++;
  try{
   while(true){
    if(options.lost()){invalidate();reason='context-lost';break;}
    if(epoch!==turnEpoch){reason='epoch-change';break;}
    if(!jobs.size){reason='idle';break;}
    // A single source/driver phase can exceed this cooperative target. Its
    // return, rather than a timer or an interrupt, is the next yield boundary.
    if(attempts&&performance.now()-startedAtMs>=sliceBudgetMs){reason='slice-budget';break;}
    if(attempts>=maxStepsPerTurn){reason='step-limit';break;}
    const selectionStartedAtMs=performance.now();let job:PreparationJob|undefined;
    try{
     const cpu=nextCPU(),parkedIndex=parked.findIndex(value=>!checkedWaiters.has(value));
     if(parkedIndex>=0&&(!cpu||preferParked)){
      job=parked.splice(parkedIndex,1)[0];parked.push(job);preferParked=false;
     }else{job=cpu;preferParked=parkedIndex>=0;}
    }finally{recordTime(timing.selection,performance.now()-selectionStartedAtMs);}
    if(!job){reason='waiting';break;}
    // Guard-only cancellations also count against the dispatch cap, so a long
    // stale queue cannot make a turn unbounded without calling any step.
    attempts++;
    // Attribution only: the phase this step runs, read before it runs.
    let phase='step';try{phase=String(job.phase?.()??'step').slice(0,64);}catch{phase='step';}
    const stepStartedAtMs=performance.now(),identity=job.identity,priority=job.priority;
    if(advance(job,turnEpoch)){
     turnSteps++;steps++;
     // Even a newly linked program must wait for the next timer before its
     // first KHR poll. A successful poll that clears waiting may validate now.
     if(job.waiting)checkedWaiters.add(job);
    }
    const stepMs=Math.max(0,performance.now()-stepStartedAtMs);
    if(!longestStep||stepMs>longestStep.stepMs)longestStep={source:String(identity.source).slice(0,128),resource:String(identity.resource).slice(0,256),priority,phase,stepMs};
    if(options.lost()){invalidate();reason='context-lost';break;}
    if(epoch!==turnEpoch){reason='epoch-change';break;}
   }
  }finally{
   lastSteps=turnSteps;maxSteps=Math.max(maxSteps,turnSteps);lastElapsedMs=Math.max(0,performance.now()-startedAtMs);
   recordTime(timing.turnOverhead,lastElapsedMs-(timing.selection.totalMs+timing.guard.totalMs+timing.step.totalMs-accountedBefore));
   if(longestStep&&(!longestTurn||lastElapsedMs>longestTurn.elapsedMs))longestTurn={elapsedMs:lastElapsedMs,steps:turnSteps,yieldReason:reason,...longestStep};
   maxElapsedMs=Math.max(maxElapsedMs,lastElapsedMs);lastYieldReason=reason;yieldReasons[reason]=(yieldReasons[reason]??0)+1;
   ticking=false;wake();
  }
 }
 return{
  submit(job:PreparationJob){
   job.queuedAtMs=performance.now();job.startedAtMs=undefined;job.settledAtMs=undefined;job.requiresProgramSlot??=false;job.submitted??=false;job.waiting??=false;job.abandoned??=false;
   completed.delete(job);abandonNotified.delete(job);
   if(options.lost()){invalidate();job.epoch=epoch;finish(job,'lost');return;}
   lossObserved=false;job.epoch=epoch;jobs.add(job);
   // A caller-supplied submitted continuation already owns its slot; do not
   // reset that fact or let it block itself behind the admission limit.
   if(job.submitted){admittedPrograms.add(job);parked.push(job);}else queue.push(job);wake();
  },
  cancel,
  resume(job:PreparationJob):boolean{
   if(job.status!=='pending'||!jobs.has(job)||!job.submitted||!job.abandoned||job.epoch!==epoch||options.lost())return false;
   // Only the private owner knows whether its linked drain is resumable. It
   // replaces the demand guard first; waiting remains private phase state.
   job.abandoned=false;abandonNotified.delete(job);wake();return true;
  },
  invalidate,
  get epoch(){return epoch;},
  get stats(){
   const pending=[...jobs].filter(job=>job.status==='pending'),submitted=pending.filter(job=>job.submitted).length;
   // active is the currently selected CPU step; parked validation may be runnable
   // even after its KHR waiting flag clears. inFlight counts slots, never RAM.
   // visibleStarts is the consecutive run since the last capture start; the
   // dispatch totals are cumulative. admitted includes started source chains;
   // submitted/inFlight still count only real driver submissions. A deferred
   // capture yielded one owed quantum to an unserved visible deadline owner.
   return{epoch,pending:pending.length,queued:queue.length,active:Number(!!active),waiting:pending.filter(job=>job.waiting).length,admitted:admittedPrograms.size,submitted,retiring:pending.filter(job=>job.submitted&&(job.abandoned||job.error!==undefined)).length,inFlight:submitted,maxInFlight:2,scheduled,visibleStarts,dispatch:{turns,steps,lastSteps,maxSteps,lastElapsedMs,maxElapsedMs,lastYieldReason,yieldReasons:{...yieldReasons},sliceBudgetMs,maxStepsPerTurn,visibleQuantaSinceCapture:visibleQuanta,visibleProgramAdmissionsSinceCapture:visibleProgramAdmissions,visibleStartsTotal,captureStartsTotal,deadlineCaptureStarts,deferredCaptures,deferredCaptureJobs,visibleDeadlineActive:visibleDeadline(),timing:{scope:'scheduler-lifetime',clock:'performance.now-ms',callbackDelay:{...timing.callbackDelay},selection:{...timing.selection},guard:{...timing.guard},step:{...timing.step},turnOverhead:{...timing.turnOverhead}},longestTurn:longestTurn?{...longestTurn}:undefined}};
  },
 };
}
