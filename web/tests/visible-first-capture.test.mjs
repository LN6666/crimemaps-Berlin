import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Real production modules with their real relative dependencies (one module
// instance per file, like one page): the scheduler that program-preparation
// creates for a context is the same module this test drives directly.
const productionModules=new Map();
function loadProductionModule(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=productionModules.get(filename);if(previous)return previous.exports;
 const module={exports:{}};productionModules.set(filename,module);
 try{const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only real local production dependencies');const target=path.resolve(path.dirname(filename),name);return loadProductionModule(path.extname(target)?target:target+'.ts');});return module.exports;
 }catch(error){productionModules.delete(filename);throw error;}
}
const scheduling=loadProductionModule(new URL('../src/safety/render-runtime/preparation-scheduler.ts',import.meta.url));
const {createPreparationScheduler,beginVisibleReadinessDeadline,visibleReadinessDeadlineActive}=scheduling;
const {createProgramPreparationOwner,isProgramPreparationPending}=loadProductionModule(new URL('../src/safety/render-runtime/program-preparation.ts',import.meta.url));
const {waitForResidentDraw}=loadProductionModule(new URL('../src/safety/resident-draw-readiness.ts',import.meta.url));

function clock(){
 const timers=new Map(),previous={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,performance:Object.getOwnPropertyDescriptor(globalThis,'performance')};let now=0,sequence=0,created=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin:previous.performance?.value?.timeOrigin??0,now:()=>now}});
 globalThis.setTimeout=(fn,ms=0)=>{const id=++sequence;created++;timers.set(id,{fn,at:now+ms});return id;};
 globalThis.clearTimeout=id=>{timers.delete(id);};
 const next=()=>[...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
 return{
  get now(){return now;},advance(ms){now+=ms;},get created(){return created;},get pending(){return timers.size;},
  one(){const entry=next();assert(entry,'a scheduled turn is pending');timers.delete(entry[0]);now=Math.max(now,entry[1].at);entry[1].fn();},
  all(limit=500){let n=0;while(timers.size){assert(++n<=limit,'bounded turns');this.one();}},
  until(predicate,limit=200){let n=0;while(!predicate()){assert(++n<=limit,'bounded turns did not reach the milestone');this.one();}},
  elapse(ms){const end=now+ms;for(;;){const entry=next();if(!entry||entry[1].at>end)break;timers.delete(entry[0]);now=entry[1].at;entry[1].fn();}now=end;},
  restore(){globalThis.setTimeout=previous.setTimeout;globalThis.clearTimeout=previous.clearTimeout;if(previous.performance)Object.defineProperty(globalThis,'performance',previous.performance);else delete globalThis.performance;},
 };
}

// A scheduler with an explicit deadline flag and a manual turn queue.
function harness(){
 const turns=[],order=[];let deadline=false;
 const scheduler=createPreparationScheduler({lost:()=>false,schedule:work=>turns.push(work),visibleDeadline:()=>deadline});
 const job=(name,priority,{slot=false,steps=1}={})=>{let left=steps;const value={identity:{source:'fixture '+name,resource:name},priority,epoch:scheduler.epoch,status:'pending',requiresProgramSlot:slot,phase:()=>'phase-'+name,disposed:0,settledCount:0,
  step(){if(left===steps)order.push(name);return --left<=0;},dispose(){value.disposed++;},settled(){value.settledCount++;}};return value;};
 return{scheduler,order,job,turns,set deadline(value){deadline=value;},one(){assert(turns.length,'scheduled turn');turns.shift()();},all(){let n=0;while(turns.length){assert(++n<200);turns.shift()();}}};
}

test('without a visible deadline three visible CPU quanta precede one capture quantum',()=>{
 const h=harness(),capture=h.job('c','capture'),visible=Array.from({length:6},(_,i)=>h.job('v'+i,'visible'));
 h.scheduler.submit(capture);for(const job of visible)h.scheduler.submit(job);h.all();
 assert.deepEqual(h.order,['v0','v1','v2','c','v3','v4','v5']);
 const dispatch=h.scheduler.stats.dispatch;assert.equal(dispatch.visibleStartsTotal,6);assert.equal(dispatch.captureStartsTotal,1);assert.equal(dispatch.deferredCaptures,0);assert.equal(dispatch.deferredCaptureJobs,0);assert.equal(dispatch.deadlineCaptureStarts,0);assert.equal(dispatch.visibleDeadlineActive,false);
});

test('new main admissions retain deadline owner fairness and capture still completes',()=>{
 // Instant chains exercise admission credit without a continuation carrying
 // the owner into the following choice.
 const h=harness(),capture=h.job('c','capture',{slot:true}),visible=Array.from({length:6},(_,i)=>h.job('v'+i,'visible',{slot:true}));h.deadline=true;
 h.scheduler.submit(capture);for(const job of visible)h.scheduler.submit(job);h.all();
 assert.deepEqual(h.order,['v0','v1','v2','v3','v4','v5','c'],'capture runs once no visible start is runnable');
 assert.equal(capture.status,'ready');assert.equal(capture.disposed,1);assert.equal(capture.settledCount,1);
 const dispatch=h.scheduler.stats.dispatch;assert.equal(dispatch.deadlineCaptureStarts,1);assert.equal(dispatch.captureStartsTotal,1);assert.equal(dispatch.visibleStartsTotal,6);assert.equal(dispatch.visibleDeadlineActive,true);
});

test('continuously replaced short main chains cannot deny an otherwise idle capture admission',()=>{
 const h=harness(),calls=[];let count=0;h.deadline=true;
 const enqueue=()=>{const job=h.job('main:'+count++,'visible',{slot:true});job.group='one-main-provider';const step=job.step;job.step=()=>{calls.push('main');return step();};job.settled=()=>{if(count<20)enqueue();};h.scheduler.submit(job);};
 const capture=h.job('capture','capture',{slot:true}),step=capture.step;capture.step=()=>{calls.push('capture');return step();};h.scheduler.submit(capture);enqueue();h.all();
 const at=calls.indexOf('capture');assert(at>=3&&at<20,'bounded admission credit survives same-group settled reentry');assert.equal(capture.status,'ready');assert.equal(capture.disposed,1);assert.equal(h.scheduler.stats.admitted,0);
});

test('a saved CPU choice is reconsidered when a parked poll changes its role and introduces main demand',()=>{
 const h=harness(),calls=[],old=h.job('submitted-capture','capture',{slot:true}),candidate=h.job('formerly-main','visible',{slot:true}),main=h.job('new-main','visible',{slot:true}),preflight=h.job('preflight','visible');let changed=false;
 old.submitted=true;old.waiting=true;old.step=()=>{if(!changed){changed=true;candidate.priority='capture';h.scheduler.submit(main);}return false;};
 preflight.step=()=>{calls.push('preflight');return true;};candidate.step=()=>{calls.push('formerly-main');return true;};main.step=()=>{calls.push('new-main');main.submitted=true;main.waiting=true;return false;};
 h.scheduler.submit(old);h.scheduler.submit(preflight);h.scheduler.submit(candidate);h.one();
 assert.deepEqual(calls,['preflight','new-main'],'the newly capture-only saved choice cannot take the only free main admission');assert.equal(candidate.startedAtMs,undefined);assert.equal(h.scheduler.stats.admitted,2);assert.equal(h.scheduler.stats.submitted,2);
 h.scheduler.invalidate();h.all();assert.equal(h.scheduler.stats.admitted,0);assert.equal(old.disposed,1);assert.equal(main.disposed,1);
});

test('a deadline with no runnable visible start still runs capture work, including while visible programs lack a driver slot',()=>{
 const h=harness();h.deadline=true;
 const only=h.job('alone','capture');h.scheduler.submit(only);h.all();assert.deepEqual(h.order,['alone']);assert.equal(h.scheduler.stats.dispatch.deferredCaptures,0);assert.equal(h.scheduler.stats.dispatch.deadlineCaptureStarts,1);
 // Two submitted visible programs hold both slots; a third visible program is
 // not eligible, so pure capture work (no slot) proceeds instead of waiting.
 const order=h.order;order.length=0;const holders=[0,1].map(i=>{const job=h.job('hold'+i,'visible',{slot:true,steps:1000});job.submitted=true;return job;});
 for(const job of holders){job.step=()=>{if(!order.includes(job.identity.resource))order.push(job.identity.resource);job.waiting=true;return false;};h.scheduler.submit(job);}
 const blocked=h.job('slotless-visible','visible',{slot:true}),upload=h.job('capture-upload','capture');h.scheduler.submit(blocked);h.scheduler.submit(upload);
 for(let i=0;i<4&&h.turns.length;i++)h.one();
 assert(order.includes('capture-upload'),'capture work without a slot runs while no visible start is eligible');assert(!order.includes('slotless-visible'));assert.equal(blocked.status,'pending');
 for(const job of holders)h.scheduler.cancel(job);
});

test('when the deadline ends the next choice reads 3:1 again without any wake or timer',()=>{
 const h=harness(),capture=h.job('c','capture'),visible=Array.from({length:6},(_,i)=>h.job('v'+i,'visible'));h.deadline=true;
 h.scheduler.submit(capture);for(const job of visible)h.scheduler.submit(job);
 // One turn admits at most 16 steps; stop it after four visible starts.
 let starts=0;for(const job of visible){const step=job.step;job.step=()=>{const done=step();if(++starts===4)h.deadline=false;return done;};}
 h.all();assert.deepEqual(h.order,['v0','v1','v2','v3','c','v4','v5'],'the consecutive visible run already reached three, so capture goes next');
 assert.equal(h.scheduler.stats.dispatch.deferredCaptures,1);assert.equal(h.scheduler.stats.dispatch.deadlineCaptureStarts,0);
});

test('dispatch names the phase and resource of the step that made the longest turn',()=>{
 const c=clock();try{
  const h=harness(),slow=h.job('slow','visible'),fast=h.job('fast','visible');slow.step=()=>{c.advance(40);return true;};fast.step=()=>{c.advance(1);return true;};
  h.scheduler.submit(fast);h.one();h.scheduler.submit(slow);h.one();
  const longest=h.scheduler.stats.dispatch.longestTurn;assert.deepEqual(longest,{elapsedMs:40,steps:1,yieldReason:'idle',source:'fixture slow',resource:'slow',priority:'visible',phase:'phase-slow',stepMs:40});
  assert.equal(h.scheduler.stats.dispatch.maxElapsedMs,40);longest.resource='mutated';assert.equal(h.scheduler.stats.dispatch.longestTurn.resource,'slow','stats return a copy');
 }finally{c.restore();}
});

test('selection cost is separate from guard, step and delayed pump time and does not change service order',()=>{
 for(const slowSelection of [false,true]){const c=clock();try{
  const turns=[],order=[];let pumping=false;const scheduler=createPreparationScheduler({lost:()=>false,schedule:work=>turns.push(work),visibleDeadline:()=>{if(pumping&&slowSelection)c.advance(5);return false;}});
  for(const name of ['a','b'])scheduler.submit({identity:{source:name,resource:name},priority:'visible',epoch:0,status:'pending',current(){c.advance(7);return true;},step(){order.push(name);c.advance(3);return true;},dispose(){},settled(){}});
  c.advance(40);while(turns.length){pumping=true;try{turns.shift()();}finally{pumping=false;}}
  const stats=scheduler.stats,timing=stats.dispatch.timing;assert.deepEqual(order,['a','b']);assert.equal(timing.callbackDelay.totalMs,40);assert.equal(timing.selection.totalMs,slowSelection?10:0);assert.equal(timing.guard.totalMs,14);assert.equal(timing.step.totalMs,6);assert.equal(timing.turnOverhead.totalMs,0);assert.equal(stats.pending,0);
 }finally{c.restore();}}
});

// ---- The page registry, the real context scheduler and the real readiness wait ----
function driver(){
 let id=0;const calls=[],created=[],deleted=[];
 const gl={lost:false,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,isContextLost(){return this.lost;}};
 const call=(name,fn)=>(...args)=>{assert(!gl.lost,name+' after context loss');calls.push({name,args});return fn?.(...args);};
 Object.assign(gl,{createShader:call('createShader',type=>{const value={type,id:++id};created.push(value);return value;}),shaderSource:call('shaderSource'),compileShader:call('compileShader'),createProgram:call('createProgram',()=>{const value={program:true,id:++id};created.push(value);return value;}),attachShader:call('attachShader'),detachShader:call('detachShader'),bindAttribLocation:call('bindAttribLocation'),linkProgram:call('linkProgram'),getExtension:call('getExtension',()=>null),getProgramParameter:call('getProgramParameter',()=>true),getProgramInfoLog:call('getProgramInfoLog',()=>''),getShaderParameter:call('getShaderParameter',()=>true),getShaderInfoLog:call('getShaderInfoLog',()=>''),deleteShader:call('deleteShader',value=>deleted.push(value)),deleteProgram:call('deleteProgram',value=>deleted.push(value))});
 return{gl,calls,created,deleted};
}
const recipe=(resource,priority,order,buildMs=0,c)=>({resource,priority,inputs:['fixture input'],build(){order.push(resource);if(buildMs)c.advance(buildMs);return{vertex:'v '+resource,fragment:'f '+resource,attributes:[]};}});
const pending=fn=>assert.throws(fn,error=>isProgramPreparationPending(error));

test('the page deadline registry reorders the real context scheduler: queued capture yields to visible programs, then still links',()=>{
 for(const inDeadline of [false,true]){
  const c=clock(),end=inDeadline?beginVisibleReadinessDeadline():undefined;try{
   const f=driver(),order=[],owners=Array.from({length:6},(_,i)=>createProgramPreparationOwner('provider '+i,()=>{}));
   assert.equal(visibleReadinessDeadlineActive(),inDeadline);
   for(const [i,owner]of owners.entries())pending(()=>owner.compile(f.gl,recipe(String(i),i===0?'capture':'visible',order)));c.all();
   assert.deepEqual(order.filter(value=>value!=='0'),['1','2','3','4','5']);assert(order.indexOf('0')>=3,'shader phases do not earn fresh capture admission');assert.equal(order.length,6,'capture eventually links too');if(inDeadline)assert.equal(order.at(-1),'0','unserved visible owners retain deadline protection');else assert(order.indexOf('0')<5,'capture can share admission before all main work finishes');
   const context=owners[0].stats.context;assert.equal(context.pending,0);assert.equal(context.dispatch.turns,c.created,'no timer beyond the existing turn timers');
   assert.equal(context.dispatch.deferredCaptures>0,inDeadline);assert.equal(context.dispatch.captureStartsTotal,1);assert.equal(context.dispatch.visibleStartsTotal,5);assert.equal(context.admitted,0);
   assert(owners[0].compile(f.gl,recipe('0','capture',order)).program,'deferred capture is valid linked work');for(const owner of owners)owner.dispose();
  }finally{end?.();c.restore();}
 }
 assert.equal(visibleReadinessDeadlineActive(),false);
});

test('the longest real dispatch turn reports the program phase and resource that blocked it',()=>{
 const c=clock();try{
  const f=driver(),order=[],owner=createProgramPreparationOwner('bremen bremen',()=>{});
  pending(()=>owner.compile(f.gl,recipe('bremen-utility70','visible',order,37,c)));c.all();
  const longest=owner.stats.context.dispatch.longestTurn;assert.equal(longest.phase,'source');assert.equal(longest.resource,'bremen-utility70');assert.equal(longest.source,'bremen bremen');assert.equal(longest.stepMs,37);assert(longest.elapsedMs>=37);
  assert(!JSON.stringify(owner.stats.context.dispatch).includes('f bremen'),'no source text in dispatch diagnostics');owner.dispose();
 }finally{c.restore();}
});

function readinessMap(){const renders=new Set();return{renders,map:{on:(_event,fn)=>renders.add(fn),off:(_event,fn)=>renders.delete(fn),isMoving:()=>false,triggerRepaint(){}},render(){for(const fn of [...renders])fn();}};}
test('a resident readiness wait holds the page deadline through the threshold until ready, failure or abort',async()=>{
 for(const outcome of ['ready','timeout','failure','abort']){
  const c=clock();try{
   const m=readinessMap(),controller=new AbortController();let state={ready:false,preparing:true};
   const result=waitForResidentDraw({map:m.map,signal:controller.signal,current(){},renderer:()=>({getDrawReadiness:()=>state}),drawTimeoutMs:8000}).then(()=>'ready',error=>error);
   assert.equal(visibleReadinessDeadlineActive(),true,outcome+': the attempt is inside its visible deadline');
   c.elapse(7999);assert.equal(visibleReadinessDeadlineActive(),true);
   if(outcome==='ready'){state={ready:true,preparing:false};m.render();}
   else if(outcome==='timeout'){c.elapse(60001);assert.equal(visibleReadinessDeadlineActive(),true,'threshold does not abandon visible work');state={ready:true,preparing:false};m.render();}
   else if(outcome==='failure'){state={ready:false,preparing:false,failure:'controlled failure'};m.render();}
   else controller.abort();
   const value=await result;assert.equal(visibleReadinessDeadlineActive(),false,outcome+': the deadline ends when the attempt settles');
   if(outcome==='ready'||outcome==='timeout')assert.equal(value,'ready');else if(outcome==='failure')assert.equal(value.message,'controlled failure');else assert.equal(value.name,'AbortError');
   assert.equal(c.pending,0);assert.equal(m.renders.size,0);
  }finally{c.restore();}
 }
});

test('two overlapping readiness waits keep the deadline until the last one settles, and a setup throw leaves none',async()=>{
 const c=clock();try{
  const a=readinessMap(),b=readinessMap(),ready={ready:true,preparing:false};let first={ready:false,preparing:true},second={ready:false,preparing:true};
  const one=waitForResidentDraw({map:a.map,signal:new AbortController().signal,current(){},renderer:()=>({getDrawReadiness:()=>first}),drawTimeoutMs:8000});
  const two=waitForResidentDraw({map:b.map,signal:new AbortController().signal,current(){},renderer:()=>({getDrawReadiness:()=>second}),drawTimeoutMs:15000});
  first=ready;a.render();await one;assert.equal(visibleReadinessDeadlineActive(),true,'the second provider is still inside its deadline');
  second=ready;b.render();await two;assert.equal(visibleReadinessDeadlineActive(),false);
  const broken={on(){throw Error('controlled map failure');},off(){},triggerRepaint(){}};
  await assert.rejects(waitForResidentDraw({map:broken,signal:new AbortController().signal,current(){},renderer:()=>undefined,drawTimeoutMs:8000}),/controlled map failure/);
  assert.equal(visibleReadinessDeadlineActive(),false,'a rejected setup does not leave a registered deadline');
 }finally{c.restore();}
});

test('a visible deadline protects CPU preflight and upload owners before the owed capture quantum',()=>{
 // Material preflight is itself on the readiness path, before a program exists.
 const h=harness(),capture=h.job('c','capture'),visible=Array.from({length:6},(_,i)=>h.job('v'+i,'visible'));h.deadline=true;
 h.scheduler.submit(capture);for(const job of visible)h.scheduler.submit(job);h.all();
 assert.deepEqual(h.order,['v0','v1','v2','v3','v4','v5','c']);
 let dispatch=h.scheduler.stats.dispatch;assert.equal(dispatch.deferredCaptures,3);assert.equal(dispatch.deferredCaptureJobs,1);assert.equal(dispatch.deadlineCaptureStarts,1);assert.equal(dispatch.visibleDeadlineActive,true);
 // The same CPU work remains eligible while both driver slots are occupied.
 const g=harness();g.deadline=true;const holders=[0,1].map(i=>{const job=g.job('hold'+i,'visible',{slot:true});job.submitted=true;job.step=()=>{job.waiting=true;return false;};return job;});
 for(const job of holders)g.scheduler.submit(job);
 const blocked=g.job('vp','visible',{slot:true}),late=g.job('c2','capture'),uploads=Array.from({length:4},(_,i)=>g.job('u'+i,'visible'));
 g.scheduler.submit(late);g.scheduler.submit(blocked);for(const job of uploads)g.scheduler.submit(job);
 for(let i=0;i<6&&g.turns.length;i++)g.one();
 assert.deepEqual(g.order,['u0','u1','u2','u3','c2'],'every runnable CPU owner gets one quantum, then capture progresses despite the blocked program');assert.equal(blocked.status,'pending');
 dispatch=g.scheduler.stats.dispatch;assert.equal(dispatch.deferredCaptures,1);assert.equal(dispatch.deadlineCaptureStarts,1);
 for(const job of [...holders,blocked])g.scheduler.cancel(job);
});

test('deadline fairness yields continuing visible work and freezes the round so new owners cannot postpone capture',()=>{
 const c=clock();try{
  const h=harness(),calls=[],jobs=[],capture=h.job('capture','capture');h.deadline=true;
  const add=name=>{const job=h.job(name,'visible',{steps:100}),step=job.step;job.group=name;job.step=()=>{calls.push(name);c.advance(5);if(name==='d'&&!jobs.some(value=>value.group==='late'))add('late');return step();};jobs.push(job);h.scheduler.submit(job);};
  const captureStep=capture.step;capture.step=()=>{calls.push('capture');c.advance(5);return captureStep();};h.scheduler.submit(capture);
  for(const name of ['a','b','c','d'])add(name);
  for(let turn=0;turn<5;turn++)h.one();
  assert.deepEqual(calls,['a','b','c','d','capture'],'one safe step per initial visible owner; a new owner cannot extend the owed capture round');
  assert(jobs.every(job=>job.status==='pending'),'capture advances while visible jobs still need many steps');
  assert.equal(capture.status,'ready');assert.equal(h.scheduler.stats.dispatch.maxSteps,1,'a slow synchronous step still returns at the original slice boundary');
  for(const job of jobs)h.scheduler.cancel(job);h.all();assert.equal(h.scheduler.stats.pending,0);
 }finally{c.restore();}
});

test('a short owner repeatedly enqueueing from settlement cannot reset its service position ahead of a continuing peer',()=>{
 const c=clock();try{
  const h=harness(),calls=[],shortJobs=[],peer=h.job('peer','visible',{steps:4}),peerStep=peer.step;h.deadline=true;peer.group='peer';
  peer.step=()=>{calls.push('peer');c.advance(5);return peerStep();};h.scheduler.submit(peer);h.one();
  const enqueueShort=()=>{
   const name='short:'+String(shortJobs.length+1),job=h.job(name,'visible'),step=job.step,settled=job.settled;job.group='short-owner';
   job.step=()=>{calls.push(name);c.advance(5);return step();};
   job.settled=()=>{settled();if(shortJobs.length<6)enqueueShort();};shortJobs.push(job);h.scheduler.submit(job);
  };
  enqueueShort();for(let turn=0;turn<6;turn++)h.one();
  assert.deepEqual(calls,['peer','short:1','peer','short:2','peer','short:3','peer'],'each reentrant resource keeps its owner position, so the existing peer advances after one short quantum');
  assert.equal(peer.status,'ready');assert.equal(peer.settledCount,1);assert.equal(shortJobs.length,4,'the peer completes while more reentrant short work remains');
  h.all();assert.equal(shortJobs.length,6);assert(shortJobs.every(job=>job.status==='ready'&&job.disposed===1&&job.settledCount===1));assert.equal(h.scheduler.stats.pending,0);
 }finally{c.restore();}
});

test('a readiness setup throw ends its armed deadline timer and listeners as well as the page deadline',async()=>{
 const c=clock();try{
  const m=readinessMap(),observations=[];
  m.map.triggerRepaint=()=>{throw Error('controlled repaint failure');};
  const result=waitForResidentDraw({map:m.map,signal:new AbortController().signal,current(){},renderer:()=>({getDrawReadiness:()=>({ready:false,preparing:true})}),drawTimeoutMs:8000,observe:value=>observations.push(value.phase)});
  await assert.rejects(result,/controlled repaint failure/);
  assert.equal(visibleReadinessDeadlineActive(),false);assert.equal(c.pending,0,'no armed deadline timer is left');assert.equal(m.renders.size,0,'no render listener is left');
  c.elapse(8000);m.render();assert.deepEqual(observations,['waiting','error'],'one terminal observation and none after the promise settled');
 }finally{c.restore();}
});
