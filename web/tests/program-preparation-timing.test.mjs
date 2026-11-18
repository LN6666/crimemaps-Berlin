import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const productionModules=new Map();
function loadProductionModule(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=productionModules.get(filename);if(previous)return previous.exports;
 const module={exports:{}};productionModules.set(filename,module);
 try{const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only real local production dependencies');const target=path.resolve(path.dirname(filename),name);return loadProductionModule(path.extname(target)?target:target+'.ts');});return module.exports;
 }catch(error){productionModules.delete(filename);throw error;}
}
const {createProgramPreparationOwner,isProgramPreparationPending,ProgramPreparationFailure,scheduleRenderResourceWork}=loadProductionModule(new URL('../src/safety/render-runtime/program-preparation.ts',import.meta.url));
const {createResourceBudget}=loadProductionModule(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url));
const {createChunkResourceStore,bindChunkResourceContext,getChunkResourceStoreForContext}=loadProductionModule(new URL('../src/safety/render-runtime/chunk-resource-store.ts',import.meta.url));

const TIME_ORIGIN=1893456000000;
const VERTEX='PRIVATE_VERTEX_BODY: original vertex';
const FRAGMENT='PRIVATE_FRAGMENT_BODY: original fragment';
const INPUT='PRIVATE_INPUT: material revision';
const pending=(operation,status='pending')=>assert.throws(operation,error=>isProgramPreparationPending(error)&&error.status===status);

function controlled(body){
 const performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance');
 const previousTimeout=globalThis.setTimeout,previousClearTimeout=globalThis.clearTimeout;
 let now=100,sequence=0,timersCreated=0,repaints=0,builds=0,clockReadStep=0;
 const timers=new Map(),owners=[];
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin:TIME_ORIGIN,now:()=>{const value=now;now+=clockReadStep;return value;}}});
 globalThis.setTimeout=fn=>{const id=++sequence;timersCreated++;timers.set(id,fn);return id;};
 globalThis.clearTimeout=id=>timers.delete(id);
 const h={
  now:()=>now,
  advance(ms){assert(ms>=0);now+=ms;},
  clockReadStep(ms){assert(ms>=0);clockReadStep=ms;},
  one(){assert(timers.size,'expected one admitted scheduler turn');const [id,fn]=timers.entries().next().value;timers.delete(id);fn();},
  all(){let turns=0;while(timers.size){assert(++turns<1000,'unbounded timing fixture');h.one();}},
  until(predicate){let turns=0;while(!predicate()){assert(++turns<100,'timing fixture did not reach requested phase');h.one();}},
  owner(source,onRepaint){const owner=createProgramPreparationOwner(source,()=>{repaints++;onRepaint?.();});owners.push(owner);return owner;},
  recipe(resource='colour',options={}){return{resource,priority:options.priority??'visible',inputs:[INPUT],...(options.current?{current:options.current}:{}),build(){builds++;h.advance(options.buildMs??11);return{vertex:VERTEX,fragment:FRAGMENT,attributes:['a_position','a_paint_family']};}};},
  counters:()=>({timersCreated,timersPending:timers.size,repaints,builds}),
 };
 try{return body(h);}finally{
  try{for(const owner of owners)owner.cancel();}finally{
   timers.clear();globalThis.setTimeout=previousTimeout;globalThis.clearTimeout=previousClearTimeout;
   if(performanceDescriptor)Object.defineProperty(globalThis,'performance',performanceDescriptor);else delete globalThis.performance;
  }
 }
}

function driver(h,{parallel=false,linked=true,durationScale=1}={}){
 let sequence=0;const calls=[],created=[],deleted=[],attachments=new Map(),shaders=new Map(),completionByProgram=new Map();
 // deleteShader only marks an attached shader. Its backing object becomes
 // logically free in this driver model after the last program detaches it or
 // that program is deleted. This model cannot measure native physical release.
 const collect=shader=>{const state=shaders.get(shader);if(state.deleteMarked&&!state.programs.size)state.freed=true;};
 const gl={lost:false,complete:true,fenceComplete:true,linked,compiled:true,infoLog:'',VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,COMPLETION_STATUS_KHR:5,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10};
 const call=(name,duration,operation)=>(...args)=>{
  if(name!=='isContextLost')assert(!gl.lost,name+' after context loss');
  const entry={name,args,startedAtMs:h.now()};calls.push(entry);
  h.advance((typeof duration==='function'?duration(...args):duration)*durationScale);
  try{return operation?.(...args);}finally{entry.endedAtMs=h.now();}
 };
 Object.assign(gl,{
  isContextLost:call('isContextLost',0,()=>gl.lost),
  createShader:call('createShader',1,type=>{const value={type,id:++sequence};created.push(value);shaders.set(value,{programs:new Set(),deleteMarked:false,freed:false,deleteCalls:0});return value;}),
  shaderSource:call('shaderSource',2),compileShader:call('compileShader',3),
  createProgram:call('createProgram',1,()=>{const value={program:true,id:++sequence};created.push(value);attachments.set(value,new Set());return value;}),
  attachShader:call('attachShader',1,(program,shader)=>{const state=shaders.get(shader);assert(state&&!state.freed);attachments.get(program).add(shader);state.programs.add(program);}),
  detachShader:call('detachShader',1,(program,shader)=>{assert(attachments.get(program)?.delete(shader),'detach requires an actual program attachment');shaders.get(shader).programs.delete(program);collect(shader);}),
  bindAttribLocation:call('bindAttribLocation',1),linkProgram:call('linkProgram',7),
  getExtension:call('getExtension',2,()=>parallel?{COMPLETION_STATUS_KHR:gl.COMPLETION_STATUS_KHR}:null),
  getProgramParameter:call('getProgramParameter',(_program,parameter)=>parameter===gl.COMPLETION_STATUS_KHR?2:3,(_program,parameter)=>parameter===gl.COMPLETION_STATUS_KHR?(completionByProgram.get(_program)??gl.complete):gl.linked),
  getProgramInfoLog:call('getProgramInfoLog',2,()=>gl.infoLog),getShaderParameter:call('getShaderParameter',1,()=>gl.compiled),getShaderInfoLog:call('getShaderInfoLog',2,()=>gl.infoLog),
  deleteShader:call('deleteShader',1,shader=>{deleted.push(shader);const state=shaders.get(shader);state.deleteCalls++;state.deleteMarked=true;collect(shader);}),
  deleteProgram:call('deleteProgram',1,program=>{deleted.push(program);for(const shader of attachments.get(program)??[]){shaders.get(shader).programs.delete(program);collect(shader);}attachments.delete(program);}),
  fenceSync:call('fenceSync',0,()=>({sync:true})),flush:call('flush',0),clientWaitSync:call('clientWaitSync',0,()=>gl.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED),deleteSync:call('deleteSync',0),
 });
 return{gl,calls,created,deleted,setComplete(program,value){completionByProgram.set(program,value);},shaderOwnership(){const states=[...shaders.values()];return{created:states.length,deleteMarked:states.filter(state=>state.deleteMarked).length,freed:states.filter(state=>state.freed).length,attachments:states.reduce((count,state)=>count+state.programs.size,0),deleteCalls:states.reduce((count,state)=>count+state.deleteCalls,0)};}};
}

const row=(owner,resource)=>{const value=owner.stats.pendingResources.find(item=>item.resource===resource);assert(value,'missing pending resource '+resource);return value;};
const queries=f=>f.calls.filter(call=>call.name==='getProgramParameter'&&call.args[1]===f.gl.COMPLETION_STATUS_KHR);
const sumPhases=stats=>Object.values(stats.phaseTimings).reduce((total,value)=>total+value.totalMs,0);
function phase(value,expected){assert.equal(value.phase,expected);assert.equal(value.durationMs,value.endedAtMs-value.startedAtMs);assert(value.durationMs>=0);}
function noExecutableOrPrivateData(value){
 const text=JSON.stringify(value);for(const secret of [VERTEX,FRAGMENT,INPUT])assert(!text.includes(secret),'snapshot retained '+secret);
 function visit(item){if(item===null||item===undefined)return;assert.notEqual(typeof item,'function');if(typeof item!=='object')return;for(const [key,child]of Object.entries(item)){assert(!['inputs','job','build','work','program','contextObject'].includes(key),'private snapshot member '+key);visit(child);}}
 visit(value);
}

test('cooperative timing accounts for short admitted phases in one turn without adding artificial queue or wait time',()=>controlled(h=>{
 const f=driver(h,{durationScale:.01}),owner=h.owner('short source berlin'),recipe=h.recipe('short',{buildMs:.2});
 pending(()=>owner.compile(f.gl,recipe));h.advance(40);assert.equal(row(owner,'short').timing.queueWaitMs,40);h.one();
 const stats=owner.stats,timing=stats.last.timing,dispatch=stats.context.dispatch;
 assert.equal(stats.last.status,'ready');assert.equal(stats.pending,0);assert.equal(timing.queueWaitMs,40);assert.equal(timing.startedAtMs,140);assert(timing.synchronousMs>0&&timing.synchronousMs<2);assert(timing.wallMs>40&&timing.wallMs<42);
 assert(Math.abs(timing.synchronousMs-sumPhases(stats))<1e-8);assert(Math.abs(timing.wallMs-timing.queueWaitMs-timing.synchronousMs)<1e-8);assert.equal(timing.khrCompletionQueries,0);assert.equal(timing.khrCompletionWaitMs,0);
 assert.equal(dispatch.turns,1);assert(dispatch.steps>=4&&dispatch.steps<=16);assert.equal(h.counters().timersCreated,1);assert.equal(h.counters().timersPending,0);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);assert.equal(f.calls.filter(call=>call.name==='getProgramParameter'&&call.args[1]===f.gl.LINK_STATUS).length,1);
 const frozen=structuredClone(timing);h.advance(5000);assert.deepEqual(owner.stats.last.timing,frozen);noExecutableOrPrivateData(stats);
}));

test('dispatch time separates delayed callbacks, live guards and shader steps without changing their order',()=>controlled(h=>{
 const f=driver(h,{durationScale:0}),owner=h.owner('guarded bremen'),recipe=h.recipe('guarded',{buildMs:3,current(){h.advance(7);return true;}});
 pending(()=>owner.compile(f.gl,recipe));h.advance(40);h.one();
 let dispatch=owner.stats.context.dispatch;assert.equal(row(owner,'guarded').phase,'vertex-submit');assert.equal(dispatch.timing.callbackDelay.totalMs,40);assert.equal(dispatch.timing.guard.totalMs,7);assert.equal(dispatch.timing.step.totalMs,3);assert.equal(dispatch.timing.selection.totalMs,0);assert.equal(dispatch.timing.turnOverhead.totalMs,0);assert.equal(dispatch.lastElapsedMs,10);
 h.advance(60);h.one();dispatch=owner.stats.context.dispatch;assert.equal(row(owner,'guarded').phase,'fragment-submit');assert.equal(dispatch.timing.callbackDelay.totalMs,100);assert.equal(dispatch.timing.callbackDelay.maxMs,60);assert.equal(dispatch.timing.guard.totalMs,14);assert.equal(dispatch.timing.guard.maxMs,7);assert.equal(dispatch.timing.step.totalMs,3,'the slow guard is not attributed to a shader call');
 h.all();dispatch=owner.stats.context.dispatch;assert.equal(owner.stats.last.status,'ready');assert.equal(f.calls.filter(value=>value.name==='linkProgram').length,1);assert.equal(dispatch.timing.guard.calls,dispatch.steps);assert.equal(dispatch.timing.step.calls,dispatch.steps);assert.equal(dispatch.timing.guard.totalMs,7*dispatch.steps);
 assert.equal(dispatch.timing.selection.totalMs+dispatch.timing.guard.totalMs+dispatch.timing.step.totalMs+dispatch.timing.turnOverhead.totalMs,3+7*dispatch.steps);assert.equal(dispatch.timing.callbackDelay.totalMs,100,'callback wait is outside synchronous dispatch time');
 const frozen=structuredClone(dispatch.timing);h.advance(1000);assert.deepEqual(owner.stats.context.dispatch.timing,frozen,'reading stats does not resample or accrue idle time');dispatch.timing.guard.totalMs=-1;assert.deepEqual(owner.stats.context.dispatch.timing,frozen,'the bounded counters are copied');noExecutableOrPrivateData(owner.stats);
}));

test('timing separates queue admission, source build and driver phases while pending rows report the real next phase',()=>controlled(h=>{
 const f=driver(h),blocker=h.owner('blocker berlin'),owner=h.owner('root500 berlin');
 blocker.work(f.gl,{resource:'geometry-upload',revision:1,current:()=>true,work(){h.advance(13);}});
 const recipe=h.recipe();pending(()=>owner.compile(f.gl,recipe));
 let value=row(owner,'colour');assert.equal(value.schedulingState,'queued');assert.equal(value.phase,'source');assert.equal(value.timing.queuedAtMs,100);assert.equal(value.timing.startedAtMs,undefined);
 h.advance(40);h.one();h.advance(7);h.one();
 value=row(owner,'colour');assert.equal(value.schedulingState,'active');assert.equal(value.phase,'vertex-submit');
 assert.equal(value.timing.startedAtMs,160);assert.equal(value.timing.queueWaitMs,60);assert.equal(value.timing.wallMs,71);assert.equal(value.timing.synchronousMs,11);
 phase(value.timing.longestSynchronousPhase,'source-build');assert.equal(value.timing.longestSynchronousPhase.durationMs,11);
 assert.equal(owner.stats.phaseTimings['source-build'].totalMs,11);assert.equal(owner.stats.phaseTimings['source-description'].calls,1);assert.equal(f.calls.filter(call=>call.name==='createShader').length,0);
 h.advance(5);h.one();assert.equal(row(owner,'colour').phase,'fragment-submit');assert.equal(row(owner,'colour').timing.queueWaitMs,60);
 h.one();assert.equal(row(owner,'colour').phase,'link-submit');h.one();assert.equal(row(owner,'colour').phase,'link-completion');
 const stats=owner.stats;assert.equal(stats.performanceTimeOriginMs,TIME_ORIGIN);assert.equal(stats.observedAtMs,h.now());assert.equal(stats.timingScope,'owner-lifetime');assert.equal(stats.phaseTimings['vertex-submit'].totalMs,6);assert.equal(stats.phaseTimings['fragment-submit'].totalMs,6);assert.equal(stats.phaseTimings['link-submit'].totalMs,14);
}));

test('KHR wall wait starts when linkProgram returns and is separate from each completion query and synchronous totals',()=>controlled(h=>{
 const f=driver(h,{parallel:true}),owner=h.owner('bremen bremen'),recipe=h.recipe();f.gl.complete=false;
 pending(()=>owner.compile(f.gl,recipe));for(let turn=0;turn<4;turn++)h.one();
 const linkReturn=f.calls.find(call=>call.name==='linkProgram').endedAtMs;
 h.advance(50);h.one();let value=row(owner,'colour');assert.equal(value.phase,'link-completion');assert.equal(value.timing.khrCompletionQueries,1);assert.equal(value.timing.khrCompletionWaitMs,h.now()-linkReturn);
 assert.equal(owner.stats.phaseTimings['completion-query'].totalMs,2);assert.equal(value.timing.synchronousMs,39);
 h.advance(80);f.gl.complete=true;h.one();value=owner.stats.pendingResources.find(item=>item.resource==='colour')??owner.stats.last;if(value.status!=='ready')assert.equal(value.phase,'link-status');
 const queryEnd=queries(f).at(-1).endedAtMs,wait=queryEnd-linkReturn;
 assert.equal(value.timing.khrCompletionQueries,2);assert.equal(value.timing.khrCompletionWaitMs,wait);assert.equal(wait,136);
 h.advance(100);assert.equal((owner.stats.pendingResources.find(item=>item.resource==='colour')??owner.stats.last).timing.khrCompletionWaitMs,wait);h.all();
 const stats=owner.stats,timing=stats.last.timing;assert.equal(timing.khrCompletionWaitMs,wait);assert.equal(timing.khrCompletionQueries,2);assert.equal(stats.phaseTimings['completion-query'].calls,2);assert.equal(stats.phaseTimings['completion-query'].maxMs,2);assert.equal(timing.synchronousMs,sumPhases(stats));assert(timing.synchronousMs<wait);
 const longest=stats.terminalPhases.ready.longestKHRCompletionWait;assert.equal(longest.startedAtMs,linkReturn);assert.equal(longest.endedAtMs,queryEnd);assert.equal(longest.durationMs,wait);assert.equal(longest.resource,'colour');assert.equal(longest.epoch,0);
}));

test('submitted cancellation keeps original queue and driver-wait clocks through admission debt',()=>controlled(h=>{
 const f=driver(h,{parallel:true});f.gl.complete=false;let cancelledSettlements=0;
 const first=h.owner('first',()=>cancelledSettlements++),second=h.owner('second'),queued=h.owner('queued'),preflight=h.owner('preflight'),firstRecipe=h.recipe('first'),secondRecipe=h.recipe('second'),queuedRecipe=h.recipe('queued');
 const links=()=>f.calls.filter(call=>call.name==='linkProgram');pending(()=>first.compile(f.gl,firstRecipe));h.until(()=>links().length===1);pending(()=>second.compile(f.gl,secondRecipe));h.until(()=>links().length===2);
 const firstProgram=links()[0].args[0],secondProgram=links()[1].args[0],firstLinkReturn=links()[0].endedAtMs;
 pending(()=>queued.compile(f.gl,queuedRecipe));const originalQueuedAt=row(queued,'queued').timing.queuedAtMs,firstStartedAt=row(first,'first').timing.startedAtMs;assert.equal(queued.stats.context.submitted,2);assert.equal(queued.stats.context.inFlight,2);assert.equal(queued.stats.context.maxInFlight,2);assert.equal(queued.stats.context.waiting,2);assert.equal(queued.stats.context.queued,1);
 h.advance(4000);const waiting=row(queued,'queued').timing,recordedAt=queued.stats.observedAtMs;assert.equal(waiting.queuedAtMs,originalQueuedAt);assert(waiting.wallMs>=4000);const synchronousBefore=waiting.synchronousMs;
 first.cancel();const cancelRequestedAt=h.now();assert.equal(first.stats.submitted,1);assert.equal(first.stats.retiring,1);assert.equal(first.stats.pending,1);assert.equal(first.stats.sourceRetainedCharacters,0);assert.equal(queued.stats.context.retiring,1);assert.equal(cancelledSettlements,0,'submitted cancellation must wait for real driver completion before settlement');assert.equal(f.deleted.filter(value=>value===firstProgram).length,0);
 const sourceWork={resource:'bounded-preflight',revision:1,phase:'source-build',current:()=>true,work(){h.advance(17);}};assert.equal(preflight.work(f.gl,sourceWork),false);h.advance(8000);h.until(()=>preflight.stats.last?.status==='ready');assert.equal(preflight.stats.last.timing.synchronousMs,17);assert(preflight.stats.last.timing.queueWaitMs>=8000);assert.equal(preflight.stats.phaseTimings['source-build'].totalMs,17);assert.equal(preflight.stats.context.submitted,2,'pure CPU work does not consume a driver slot');for(let turn=0;turn<6;turn++)h.one();assert.equal(links().length,2,'abandoned submitted work still owns admission until driver completion');assert.equal(f.calls.filter(call=>call.name==='createShader').length,4);assert.equal(cancelledSettlements,0);
 const stillWaiting=row(queued,'queued').timing;assert.equal(stillWaiting.queuedAtMs,originalQueuedAt);assert(stillWaiting.wallMs>=12000);assert(stillWaiting.queueWaitMs>=12000);assert.equal(stillWaiting.startedAtMs,undefined);assert.equal(stillWaiting.settledAtMs,undefined);assert.equal(queued.stats.context.submitted,2);assert.equal(stillWaiting.synchronousMs,synchronousBefore,'queue and driver waiting are not synchronous source/GL work');assert(queued.stats.observedAtMs>recordedAt);assert.equal(f.deleted.filter(value=>value===firstProgram).length,0);
 f.setComplete(firstProgram,true);h.until(()=>links().length===3);
 const cancelled=first.stats.last;assert.equal(cancelled.status,'cancelled');assert.equal(cancelledSettlements,1);assert.equal(cancelled.timing.startedAtMs,firstStartedAt);assert(cancelled.timing.settledAtMs>=cancelRequestedAt);assert(cancelled.timing.khrCompletionWaitMs>=12000);assert(cancelled.timing.khrCompletionWaitMs>=cancelRequestedAt-firstLinkReturn);assert.equal(f.deleted.filter(value=>value===firstProgram).length,1,'one logical program cleanup follows completion');
 const deletionIndex=f.calls.findIndex(call=>call.name==='deleteProgram'&&call.args[0]===firstProgram),thirdLinkIndex=f.calls.findIndex(call=>call.name==='linkProgram'&&call.args[0]===links()[2].args[0]);assert(deletionIndex>=0&&thirdLinkIndex>deletionIndex);
 f.setComplete(secondProgram,true);f.setComplete(links()[2].args[0],true);h.all();assert.equal(cancelledSettlements,1);const finished=queued.stats.last.timing;assert.equal(finished.queuedAtMs,originalQueuedAt);assert(finished.wallMs>=12000);assert(finished.queueWaitMs>=12000);assert.equal(finished.queueWaitMs,finished.startedAtMs-finished.queuedAtMs);assert(finished.settledAtMs>=finished.startedAtMs);assert(finished.synchronousMs<finished.wallMs);assert.equal(f.deleted.filter(value=>value===firstProgram).length,1);
 const frozen=structuredClone(cancelled.timing);h.advance(1000);assert.deepEqual(first.stats.last.timing,frozen,'terminal timing stays frozen while observation time advances');
}));

test('without KHR there is no completion query or fabricated KHR waiting interval',()=>controlled(h=>{
 const f=driver(h),owner=h.owner('infill frankfurt'),recipe=h.recipe();pending(()=>owner.compile(f.gl,recipe));h.all();
 const stats=owner.stats;assert.equal(stats.last.status,'ready');assert.equal(stats.last.timing.khrCompletionQueries,0);assert.equal(stats.last.timing.khrCompletionWaitMs,0);assert.equal(queries(f).length,0);assert.equal(stats.phaseTimings['completion-query'],undefined);assert.equal(stats.phaseTimings['link-status'].totalMs,3);assert.equal(stats.last.timing.synchronousMs,sumPhases(stats));assert.equal(stats.terminalPhases.ready.longestKHRCompletionWait,undefined);
 assert.deepEqual(f.shaderOwnership(),{created:2,deleteMarked:2,freed:2,attachments:0,deleteCalls:2},'Ready executable must not retain attached delete-marked shaders');assert.equal(f.calls.filter(call=>call.name==='detachShader').length,2);
}));

test('pending projection is bounded at eight and repeated snapshots perform no GL, scheduling, build or repaint work',()=>controlled(h=>{
 const f=driver(h),label='p'.repeat(90)+' '+'label'.repeat(40),owner=h.owner(label);
 for(let index=0;index<10;index++)pending(()=>owner.compile(f.gl,h.recipe('r'+index+':'+'x'.repeat(400),{priority:index%2?'capture':'visible'})));
 const before={...h.counters(),calls:f.calls.length};h.advance(75);let stats;
 for(let count=0;count<4;count++)stats=owner.stats;
 assert.deepEqual({...h.counters(),calls:f.calls.length},before);assert.equal(stats.pending,10);assert.equal(stats.pendingResources.length,8);assert.equal(stats.pendingResourcesTruncated,true);assert.equal(stats.observedAtMs,175);assert.equal(stats.performanceTimeOriginMs,TIME_ORIGIN);
 for(const value of stats.pendingResources){assert.equal(value.provider,'p'.repeat(64));assert.equal(value.source.length,128);assert.equal(value.resource.length,256);assert.equal(value.epoch,0);assert.equal(value.status,'pending');assert.equal(value.phase,'source');assert.equal(value.schedulingState,'queued');assert(['visible','capture'].includes(value.priority));assert.equal(value.timing.queueWaitMs,75);assert.equal(value.timing.wallMs,75);assert.equal(value.timing.synchronousMs,0);assert.equal(value.timing.startedAtMs,undefined);}
 assert.deepEqual(stats.phaseTimings,{});noExecutableOrPrivateData(stats);
}));

test('ready timing stops growing before consumption and later current cancellation retains its original work duration',()=>controlled(h=>{
 const f=driver(h),owner=h.owner('root500 berlin');let current=true;const recipe=h.recipe('colour',{current:()=>current,buildMs:31});
 pending(()=>owner.compile(f.gl,recipe));h.all();const first=structuredClone(owner.stats.last.timing),settled=owner.stats.terminalPhases.ready.lastSettledAtMs;
 h.advance(5000);assert.deepEqual(owner.stats.last.timing,first);assert.equal(owner.stats.terminalPhases.ready.lastSettledAtMs,settled);
 current=false;pending(()=>owner.compile(f.gl,recipe),'cancelled');const stats=owner.stats;
 assert.equal(stats.last.status,'cancelled');assert.equal(stats.last.timing.wallMs,first.wallMs);assert.equal(stats.last.timing.queueWaitMs,first.queueWaitMs);assert.equal(stats.last.timing.settledAtMs,first.settledAtMs);
 const longest=stats.terminalPhases.cancelled.longestSynchronousPhase;assert.equal(longest.resource,'colour');assert.equal(longest.epoch,0);assert.equal(longest.status,'cancelled');phase(longest,'source-build');assert.equal(longest.durationMs,31);assert(stats.terminalPhases.cancelled.lastSettledAtMs>=h.now()-1);
}));

test('failed validation preserves bounded identities, failure timing and the actual longest synchronous phase',()=>controlled(h=>{
 const f=driver(h,{linked:false}),owner=h.owner('q'.repeat(90)+' '+'owner'.repeat(50)),recipe=h.recipe('failure:'+'r'.repeat(400),{buildMs:41});f.gl.infoLog='z'.repeat(5000);
 pending(()=>owner.compile(f.gl,recipe));h.all();assert.throws(()=>owner.compile(f.gl,recipe),ProgramPreparationFailure);
 const stats=owner.stats,failure=stats.failures[0];assert.equal(stats.failed,1);assert.equal(failure.phase,'link-status');assert.equal(failure.source.length,128);assert.equal(failure.resource.length,256);assert.equal(failure.reason.length,2048);assert.equal(failure.timing.synchronousMs,sumPhases(stats));assert.equal(failure.timing.settledAtMs,h.now());
 const longest=stats.terminalPhases.failed.longestSynchronousPhase;assert.equal(longest.provider.length,64);assert.equal(longest.source.length,128);assert.equal(longest.resource.length,256);assert.equal(longest.status,'failed');assert.equal(longest.epoch,0);phase(longest,'source-build');assert.equal(longest.durationMs,41);
 const frozen=structuredClone(failure.timing);h.advance(1000);assert.deepEqual(owner.stats.failures[0].timing,frozen);noExecutableOrPrivateData(stats);
 assert.deepEqual(f.shaderOwnership(),{created:2,deleteMarked:2,freed:2,attachments:0,deleteCalls:2},'The logical driver model releases attachments as well as recording delete calls; native physical release is outside this fixture');
}));

test('cancelling queued work cannot overwrite the useful longest phase from active work',()=>controlled(h=>{
 let settlements=0;const f=driver(h),owner=h.owner('bremen bremen',()=>{if(++settlements===1)h.clockReadStep(100);});pending(()=>owner.compile(f.gl,h.recipe('active',{buildMs:29})));pending(()=>owner.compile(f.gl,h.recipe('queued',{buildMs:99})));h.one();
 assert.equal(row(owner,'active').schedulingState,'active');assert.equal(row(owner,'queued').schedulingState,'queued');owner.cancel();
 const stats=owner.stats,longest=stats.terminalPhases.cancelled.longestSynchronousPhase;
 assert.equal(stats.pending,0);assert.equal(stats.pendingResources.length,0);assert.equal(stats.pendingResourcesTruncated,false);assert.equal(longest.resource,'active');phase(longest,'source-build');assert.equal(longest.durationMs,29);assert(stats.phaseTimings.cleanup.maxMs>=100,'queued cleanup is deliberately longer but has no executed job phase');assert.equal(settlements,2);assert.equal(h.counters().builds,1);assert.equal(f.calls.filter(call=>call.name==='createShader').length,0);
}));

test('epoch invalidation preserves old execution timing and never relabels retained maxima as a new epoch',()=>controlled(h=>{
 const f=driver(h),owner=h.owner('root500 berlin'),other=h.owner('other berlin'),recipe=h.recipe('old',{buildMs:43});
 pending(()=>owner.compile(f.gl,recipe));h.all();const first=structuredClone(owner.stats.last.timing);h.advance(2000);
 assert.equal(other.work(f.gl,{resource:'epoch-bind',revision:1,current:()=>true,work(){}}),false);other.contextLost();assert.equal(owner.stats.context.epoch,1);
 pending(()=>owner.compile(f.gl,recipe),'lost');let stats=owner.stats;
 assert.equal(stats.last.status,'lost');assert.equal(stats.last.epoch,0);assert.equal(stats.last.timing.wallMs,first.wallMs);assert.equal(stats.last.timing.settledAtMs,first.settledAtMs);
 assert.equal(stats.terminalPhases.lost.longestSynchronousPhase.epoch,0);assert.equal(stats.terminalPhases.lost.longestSynchronousPhase.status,'lost');assert.equal(stats.terminalPhases.lost.longestSynchronousPhase.durationMs,43);
 const next=h.recipe('new',{buildMs:1});pending(()=>owner.compile(f.gl,next));h.all();stats=owner.stats;
 assert.equal(stats.last.epoch,1);assert.equal(stats.last.status,'ready');assert.equal(stats.terminalPhases.ready.longestSynchronousPhase.epoch,0);assert.equal(stats.terminalPhases.ready.longestSynchronousPhase.resource,'old');assert.equal(stats.terminalPhases.ready.longestSynchronousPhase.status,'ready');assert.equal(stats.phaseTimings['source-build'].calls,2);assert.equal(stats.phaseTimings['source-build'].totalMs,44);assert.equal(stats.phaseTimings['source-build'].maxMs,43);assert.equal(stats.timingScope,'owner-lifetime');
}));

test('upload work uses the same timing and terminal slots without treating queue time as synchronous work',()=>controlled(h=>{
 const f=driver(h),owner=h.owner('bremen bremen');
 const failing={resource:'geometry-upload',revision:1,current:()=>true,work(){h.advance(19);throw Error('controlled upload failure');}};
 assert.equal(owner.work(f.gl,failing),false);assert.equal(row(owner,'geometry-upload').phase,'upload');h.advance(70);h.all();assert.throws(()=>owner.work(f.gl,failing),ProgramPreparationFailure);
 let stats=owner.stats;assert.equal(stats.last.timing.queueWaitMs,70);assert.equal(stats.last.timing.synchronousMs,19);assert.equal(stats.last.timing.wallMs,89);phase(stats.last.timing.longestSynchronousPhase,'upload');assert.equal(stats.terminalPhases.failed.longestSynchronousPhase.resource,'geometry-upload');
 const next={...failing,revision:2,work(){h.advance(5);}};assert.equal(owner.work(f.gl,next),false);h.all();assert.equal(owner.work(f.gl,next),true);stats=owner.stats;
 assert.equal(stats.last.status,'ready');assert.equal(stats.phaseTimings.upload.calls,2);assert.equal(stats.phaseTimings.upload.totalMs,24);assert.equal(stats.phaseTimings.upload.maxMs,19);assert.equal(stats.terminalPhases.failed.longestSynchronousPhase.durationMs,19);assert.equal(stats.terminalPhases.ready.longestSynchronousPhase.durationMs,5);
 const longOwner=h.owner('p'.repeat(90)+' '+'owner'.repeat(40)),resource='geometry-upload:'+'r'.repeat(400),writes=[];
 const revision1={resource,revision:1,current:()=>true,work(){writes.push(1);}},revision2={...revision1,revision:2,work(){writes.push(2);}};
 assert.equal(longOwner.work(f.gl,revision1),false);assert.equal(longOwner.work(f.gl,revision2),false);
 const projected=longOwner.stats;assert.equal(projected.pending,1);assert.equal(projected.pendingResources[0].resource,resource.slice(0,256));assert.equal(projected.pendingResources[0].source.length,128);assert.equal(projected.pendingResources[0].provider.length,64);
 h.all();assert.deepEqual(writes,[2],'revision replacement uses the full resource identity, never its truncated diagnostic label');assert.equal(longOwner.work(f.gl,revision2),true);
}));

function reentrantCase(h,kind,action){
 const f=driver(h);let primarySettled=0,otherSettled=0,tailEndedAtMs;
 const owner=h.owner('primary berlin',()=>primarySettled++),other=h.owner('other berlin',()=>otherSettled++);
 const callback=()=>{
  h.advance(7);
  if(action==='cancel'||action==='cancel-then-loss')owner.cancel();
  if(action==='lost'||action==='cancel-then-loss')owner.contextLost();
  assert.equal(primarySettled,0,'terminal notification waits until the executing callback unwinds');
  h.advance(13);tailEndedAtMs=h.now();
  if(kind==='work')throw Error('controlled callback tail after termination');
  return{vertex:VERTEX,fragment:FRAGMENT,attributes:[]};
 };
 if(kind==='build')pending(()=>owner.compile(f.gl,{resource:'self',inputs:[INPUT],build:callback}));
 else assert.equal(owner.work(f.gl,{resource:'self',revision:1,current:()=>true,work:callback}),false);
 const otherRecipe=h.recipe('other',{buildMs:1});pending(()=>other.compile(f.gl,otherRecipe));
 assert.equal(h.counters().timersCreated,1);h.one();
 const expected=action==='cancel'?'cancelled':'lost',stats=owner.stats,timing=stats.last.timing,terminal=stats.terminalPhases[expected];
 assert.equal(stats.last.status,expected);assert.equal(stats.last.epoch,0);assert.equal(primarySettled,1);assert.equal(stats.failed,0);assert.equal(stats.terminalPhases.failed,undefined);
 assert.equal(timing.synchronousMs,20);assert(timing.settledAtMs>=tailEndedAtMs);assert(timing.settledAtMs>=timing.longestSynchronousPhase.endedAtMs);phase(timing.longestSynchronousPhase,kind==='build'?'source-build':'upload');assert.equal(timing.longestSynchronousPhase.endedAtMs,tailEndedAtMs);assert.equal(terminal.longestSynchronousPhase.durationMs,20);assert.equal(terminal.longestSynchronousPhase.status,expected);
 if(kind==='build')assert.equal(stats.phaseTimings.cleanup.calls,1,'dispose runs exactly once after build returns');
 assert.equal(f.calls.filter(call=>call.name==='createShader').length,0,'terminated source/upload cannot submit shader work');
 assert.equal(h.counters().timersCreated,action==='cancel'?2:1,'wake requests inside a turn coalesce; an invalidated epoch schedules no empty continuation');
 if(action==='cancel'){
  h.all();assert.equal(other.stats.last.status,'ready');assert.equal(other.stats.last.epoch,0);assert.equal(otherSettled,1);
 }else{
  assert.equal(other.stats.last.status,'lost');assert.equal(otherSettled,1);h.all();
  other.contextLost();assert.equal(other.stats.context.epoch,1);assert.equal(otherSettled,1,'the other owner acknowledges the same loss without settling its old job again');
  pending(()=>other.compile(f.gl,otherRecipe));h.all();assert.equal(other.stats.last.status,'ready');assert.equal(other.stats.last.epoch,1);assert.equal(otherSettled,2);
 }
 assert.equal(primarySettled,1,'later scheduler turns do not settle the terminated job again');
 assert.equal(h.counters().timersPending,0);assert.equal(h.counters().timersCreated,other.stats.context.dispatch.turns,'each context turn comes from one scheduler timer; timing adds no separate timers');assert(other.stats.context.dispatch.maxSteps<=16);
}

for(const kind of ['build','work'])for(const action of ['cancel','lost'])test(`${kind} self ${action} settles once after the complete callback and preserves other-owner progress`,()=>controlled(h=>reentrantCase(h,kind,action)));

test('build/work cancel followed by context loss retains lost status and never settles or disposes twice',()=>{
 for(const kind of ['build','work'])controlled(h=>reentrantCase(h,kind,'cancel-then-loss'));
});

test('source-build work: CPU preflight keeps its phase and shares admission without retaining an executed callback',()=>controlled(h=>{
 const f=driver(h),owner=h.owner('city'),events=[],work={resource:'material-source-preflight',revision:1,phase:'source-build',current:()=>true,work(){events.push('source');h.advance(17);}};assert.equal(owner.work(f.gl,work),false);assert.equal(row(owner,'material-source-preflight').phase,'source-build');h.all();assert.deepEqual(events,['source']);assert.equal(owner.stats.phaseTimings['source-build'].totalMs,17);assert.equal(owner.stats.phaseTimings.upload,undefined);assert.equal(owner.work(f.gl,work),true);assert.equal(owner.stats.ready,0);noExecutableOrPrivateData(owner.stats);
}));

test('shared program: one execution has attributable context timing and no private sources in consumer diagnostics',()=>controlled(h=>{
 const f=driver(h),a=h.owner('root500 berlin'),b=h.owner('city berlin'),r={...h.recipe('same-abi'),sharedKey:'native-abi-v1'};pending(()=>a.compile(f.gl,r));pending(()=>b.compile(f.gl,r));assert.equal(a.stats.context.pending,1);h.one();assert.equal(h.counters().builds,1);assert.equal(row(b,'same-abi').timing.synchronousMs,11);assert.equal(row(b,'same-abi').executionSource,'root500 berlin');h.all();const first=a.compile(f.gl,r),second=b.compile(f.gl,r);assert.equal(first,second);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);assert.equal(a.stats.last.timing.synchronousMs,b.stats.last.timing.synchronousMs);noExecutableOrPrivateData(a.stats);noExecutableOrPrivateData(b.stats);a.releaseProgram(f.gl,first);assert.equal(f.deleted.filter(value=>value===first).length,0);b.releaseProgram(f.gl,second);assert.equal(f.deleted.filter(value=>value===first).length,1);
}));

function budgetTimingFixture(f){const budget=createResourceBudget({limitBytes:640,recentLimitBytes:0}),store=createChunkResourceStore({budget});bindChunkResourceContext(f.gl,store);assert.equal(getChunkResourceStoreForContext(f.gl),store);return{budget,store};}

test('budget admission creates no scheduler or source timing before capacity and preserves the original cooperative clock after wake',()=>controlled(h=>{
 const f=driver(h,{durationScale:.01}),{budget,store}=budgetTimingFixture(f),owner=h.owner('budget-clock'),busy=budget.reserve({category:'construction',bytes:640,precision:'exact'}),recipe={...h.recipe('budget-clock',{buildMs:.25}),budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128}};
 try{
  pending(()=>owner.compile(f.gl,recipe));assert.equal(row(owner,'budget-clock').phase,'budget-admission');assert.equal(h.counters().builds,0);assert.equal(h.counters().timersCreated,0);assert.equal(sumPhases(owner.stats),0);assert.equal(f.calls.filter(call=>call.name!=='isContextLost').length,0);
  h.advance(500);busy.release();const admittedAt=h.now();pending(()=>owner.compile(f.gl,recipe));assert.equal(row(owner,'budget-clock').timing.queuedAtMs,admittedAt);h.advance(37);h.one();
  const timing=owner.stats.last.timing;assert.equal(timing.queueWaitMs,37);assert.equal(timing.startedAtMs,admittedAt+37);assert(timing.synchronousMs>=.25&&timing.synchronousMs<2);assert.equal(owner.stats.context.dispatch.turns,1);assert.equal(h.counters().timersCreated,1);assert.equal(h.counters().builds,1);assert.equal(owner.stats.phaseTimings['source-build'].totalMs,.25);assert.equal(owner.stats.phaseTimings['source-build'].calls,1);noExecutableOrPrivateData(owner.stats);
  const program=owner.compile(f.gl,recipe);assert.equal(budget.stats.bytes,128);owner.releaseProgram(f.gl,program);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{busy.release();owner.dispose();h.all();store.collectRetired();store.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0);}
}));

test('linked budget resumption preserves the original queue and KHR wall-wait clocks and the single shared ticket',()=>controlled(h=>{
 const f=driver(h,{parallel:true}),{budget,store}=budgetTimingFixture(f),a=h.owner('budget-timing-old'),b=h.owner('budget-timing-new');f.gl.complete=false;let live=true;
 const shared={...h.recipe('budget-timing-resume'),sharedKey:'budget-timing-resume-abi',budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128}},old={...shared,current:()=>live},next={...shared,current:()=>true};
 try{
  pending(()=>a.compile(f.gl,old));h.until(()=>f.calls.some(call=>call.name==='linkProgram'));const program=f.created.find(value=>value.program),original=structuredClone(row(a,'budget-timing-resume').timing),linkReturn=f.calls.find(call=>call.name==='linkProgram').endedAtMs;
  live=false;a.prune();assert.equal(budget.stats.retiringBytes,128);h.advance(77);pending(()=>b.compile(f.gl,next));const resumed=row(b,'budget-timing-resume').timing;
  assert.equal(resumed.queuedAtMs,original.queuedAtMs);assert.equal(resumed.startedAtMs,original.startedAtMs);assert.equal(resumed.synchronousMs,original.synchronousMs);assert.equal(budget.stats.reservations,1);assert.equal(budget.stats.retiringBytes,0);assert.equal(b.stats.budget.waitingForAvailability,false);assert.equal(h.counters().builds,1);
  f.gl.complete=true;h.all();assert.equal(b.compile(f.gl,next),program);const timing=b.stats.last.timing;assert.equal(timing.queuedAtMs,original.queuedAtMs);assert(timing.khrCompletionWaitMs>=77);assert.equal(b.stats.terminalPhases.ready.longestKHRCompletionWait.startedAtMs,linkReturn);assert.equal(h.counters().builds,1);assert.equal(f.calls.filter(call=>call.name==='linkProgram').length,1);assert.equal(b.stats.budget.budgetedRecipes,1);noExecutableOrPrivateData(b.stats);
  b.releaseProgram(f.gl,program);assert.equal(budget.stats.bytes,128);store.collectRetired();assert.equal(budget.stats.bytes,0);
 }finally{f.gl.complete=true;f.gl.fenceComplete=true;a.dispose();b.dispose();h.all();store.collectRetired();store.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0);}
}));
