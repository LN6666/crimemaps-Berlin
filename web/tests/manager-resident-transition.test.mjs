import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import ts from 'typescript';

// Execute only the actual manager callbacks/cache path against tiny data. No
// renderer/provider graph, manifest/model asset, browser or GPU is initialized.
const providers=['city','church','tier300','delegated500','root500','infill','bremen'],sources=new Map();
for(const provider of providers){const text=await readFile(new URL(`../src/painted/${provider}/safety/three-dimensional-map.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider+'-manager.ts',text,ts.ScriptTarget.Latest,true),nodes=[];(function visit(node){nodes.push(node);ts.forEachChild(node,visit);})(ast);assert.equal(ast.parseDiagnostics.length,0,provider);sources.set(provider,{ast,nodes});}
const compile=(text,module=ts.ModuleKind.None)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module}}).outputText;
function evaluate(text,ctx,module){return Function('env','with(env){'+compile(text,module)+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>{if(key===Symbol.unscopables)return undefined;if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('Missing manager fixture binding: '+String(key));},set:(target,key,value)=>(target[key]=value,true)}));}
const named=(provider,name)=>sources.get(provider).nodes.find(node=>(ts.isVariableDeclaration(node)||ts.isFunctionDeclaration(node))&&node.name?.text===name);
const signal=()=>new AbortController().signal;
const sharedSource=await readFile(new URL('../src/safety/viewport-request.ts',import.meta.url),'utf8');
const grantHandoffSource=await readFile(new URL('../src/safety/render-runtime/program-grant-handoff.ts',import.meta.url),'utf8');
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
async function until(predicate,label){
 for(let i=0;i<100;i++){if(predicate())return;await Promise.resolve();}
 assert(predicate(),label);
}
function fakeClock(){
 let now=1000,sequence=0;
 const timers=new Map();
 return{
  performance:{now:()=>now},
  setTimeout(run,delay=0){const id=++sequence;timers.set(id,{at:now+Math.max(0,delay),run});return id;},
  clearTimeout(id){timers.delete(id);},
  get pending(){return timers.size;},
  async advance(milliseconds){
   const end=now+milliseconds;let turns=0;
   for(;;){
    const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
    if(!next)break;
    assert(++turns<=100,'publication fixture must not create an unbounded timer loop');
    const [id,timer]=next;timers.delete(id);now=timer.at;timer.run();await flush();
   }
   now=end;await flush();
  },
 };
}
function shared(clock=fakeClock()){
 const ctx={exports:{},performance:clock.performance,setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout};
 evaluate(sharedSource,ctx,ts.ModuleKind.CommonJS);
 const grants={exports:{}};evaluate(grantHandoffSource,grants,ts.ModuleKind.CommonJS);
 return{...ctx.exports,...grants.exports,clock};
}
const expression=(node,ast)=>ts.isFunctionDeclaration(node)?ts.createPrinter().printNode(ts.EmitHint.Unspecified,ts.factory.updateFunctionDeclaration(node,node.modifiers?.filter(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword&&modifier.kind!==ts.SyntaxKind.DefaultKeyword),node.asteriskToken,node.name,node.typeParameters,node.parameters,node.type,node.body),ast):node.initializer.getText(ast);
function publicationBinding(provider){
 const {ast,nodes}=sources.get(provider);
 const calls=nodes.filter(node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='publication'&&node.expression.expression.getText(ast)==='modeRequests');
 assert.equal(calls.length,1,provider+' has one shared publication owner per visible task');
 let declaration=calls[0].parent;
 while(declaration&&!ts.isVariableDeclaration(declaration))declaration=declaration.parent;
 assert(declaration&&ts.isIdentifier(declaration.name),provider+' names its publication owner');
 return{call:calls[0],declaration,name:declaration.name.text};
}
function gates(provider){
 const {ast}=sources.get(provider),hiddenStateName=named(provider,'pageIsHidden')?'pageIsHidden':'pageHidden';
 assert(named(provider,hiddenStateName),provider);
 const controller=new AbortController(),rows=[{}],helpers=shared(),binding=publicationBinding(provider);
 const ctx={controller,signal:controller.signal,batchSignal:controller.signal,ticket:1,revision:1,destroyed:false,suspended:false,hiddenStateName,[hiddenStateName]:false,wantedMode:'3d',finished:false,activate:false,renderer:{},packedArgs:[],generation:3,lastS434PackedGeneration:3,components:rows,results:[rows],chosen:[{id:'fixture-source'}],residentPreparation:{input:rows},sameStageComponents:(a,b)=>a===b,calls:0,map:{isMoving:()=>false},location:{search:''},createViewportRequestContinuation:helpers.createViewportRequestContinuation,announce(){throw Error('A stale callback must not announce');}};
 ctx.prepared=ctx.residentPreparation;
 ctx.current=evaluate('return ('+expression(named(provider,'current'),ast)+');',ctx);
 ctx.modeRequests=evaluate('return ('+named(provider,'modeRequests').initializer.getText(ast)+');',ctx);
 ctx[binding.name]=evaluate('return ('+binding.declaration.initializer.getText(ast)+');',ctx);
 ctx.publicationOwner=ctx[binding.name];
 ctx.attempt={signal:controller.signal,current:ctx.publicationOwner.current,isCurrent:ctx.publicationOwner.isCurrent};
 ctx.commitSignal=controller.signal;
 ctx.commitCurrent=ctx.attempt.current;
 ctx.commitIsCurrent=ctx.attempt.isCurrent;
 ctx.commit=async attempt=>{attempt.current();ctx.calls++;};
 ctx.clock=helpers.clock;
 return ctx;
}
const invalidate={aborted:ctx=>ctx.controller.abort(),revision:ctx=>ctx.revision++,destroyed:ctx=>ctx.destroyed=true,suspended:ctx=>ctx.suspended=true,hidden:ctx=>ctx[ctx.hiddenStateName]=true,flat:ctx=>ctx.wantedMode='2d'};

test('all seven managers wire visibility and the shared publication lifecycle rather than their own timer',()=>{
 for(const provider of providers){
  const {ast,nodes}=sources.get(provider),binding=publicationBinding(provider),continuation=named(provider,'modeRequests');
  assert(continuation&&ts.isCallExpression(continuation.initializer),provider);
  assert.match(continuation.initializer.arguments[0].getText(ast),/\bpageHidden\b/,provider+' visibility participates in stable-view waiting');
  for(const method of ['stage','finish','close']){
   assert(nodes.some(node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)===binding.name&&node.expression.name.text===method),provider+' uses publication.'+method);
  }
  assert(nodes.some(node=>ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)==='modeRequests'&&node.expression.name.text==='setHidden'),provider+' delegates hidden interruption to the continuation');
  const stage=named(provider,'stage');assert(stage,provider);
  assert(!/\bsetTimeout\s*\(/.test(expression(stage,ast)),provider+' stage delegates its timer');
  for(const obsolete of ['flushTimer','lastCommit','commitSequence','stagedCommits','pendingCommits','batchPreparationController'])assert.equal(named(provider,obsolete),undefined,provider+' removes obsolete '+obsolete+' state');
 }
});

test('actual manager stage callbacks discard obsolete views through the real shared publication helper',async()=>{
 for(const provider of providers){
  const {ast}=sources.get(provider),stage=named(provider,'stage');assert(stage,provider);
  for(const [reason,change]of Object.entries(invalidate)){
   const ctx=gates(provider);
   try{
    const callback=evaluate('return ('+expression(stage,ast)+');',ctx);
    callback();assert(ctx.clock.pending<=1,provider+' coalesces staged work');
    change(ctx);await ctx.clock.advance(100);
    assert.equal(ctx.calls,0,provider+':'+reason);assert.equal(ctx.generation,3);
   }finally{await ctx.publicationOwner.close();}
  }
  const ctx=gates(provider);
  try{
   const callback=evaluate('return ('+expression(stage,ast)+');',ctx);
   callback();callback();await ctx.clock.advance(100);
   assert.equal(ctx.calls,1,provider+' current stage still commits once');
  }finally{await ctx.publicationOwner.close();}
  for(const reason of ['finished','activate']){
   const ctx=gates(provider);
   try{
    ctx[reason]=true;const callback=evaluate('return ('+expression(stage,ast)+');',ctx);
    callback();await ctx.clock.advance(100);
    assert.equal(ctx.calls,0,provider+' '+reason+' stage is not scheduled');assert.equal(ctx.clock.pending,0);
   }finally{await ctx.publicationOwner.close();}
  }
 }
});

test('aggregate invalidation cannot republish old native rows after supersession, hiding or explicit 2D intent',async()=>{
 for(const provider of providers.filter(name=>name!=='church')){const {ast}=sources.get(provider),node=named(provider,'repackS434');assert(node,provider);
  for(const [reason,change]of Object.entries(invalidate)){
   const ctx=gates(provider);ctx.s434Aggregate={packing(){throw Error('obsolete aggregate state read');}};
   try{change(ctx);const callback=evaluate('return ('+expression(node,ast)+');',ctx);await callback('invalidated');assert.equal(ctx.generation,3,provider+':'+reason);}
   finally{await ctx.publicationOwner.close();}
  }
   const ctx=gates(provider),reached=Error('current aggregate pipeline reached');ctx.validateDetail=()=>{};ctx.s434Aggregate={packing(){throw reached;}};
  try{const callback=evaluate('return ('+expression(node,ast)+');',ctx);await assert.rejects(Promise.resolve().then(()=>callback('invalidated')),error=>error===reached,provider+' current aggregate still executes');}
  finally{await ctx.publicationOwner.close();}
 }
});

test('shared publication coalesces at the existing 16/50 ms cadence and finish awaits its final async commit',async t=>{
 const {clock,createViewportRequestContinuation}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted());
 const firstGate=deferred(),finalGate=deferred(),published=[];let desired=1,firstAttempt,finalAttempt,finished=false;
 t.after(async()=>{view.abort();firstGate.resolve();finalGate.resolve();await publication.close();});
 const commit=async attempt=>{firstAttempt=attempt;const target=desired;await firstGate.promise;attempt.current();published.push(target);};
 publication.stage(commit);desired=2;publication.stage(commit);desired=3;publication.stage(commit);
 assert.equal(clock.pending,1);await clock.advance(15);assert.deepEqual(published,[]);
 await clock.advance(1);assert(firstAttempt);assert.deepEqual(published,[]);

 publication.stage(()=>{throw Error('superseded staged callback must not run');});
 publication.stage(attempt=>{attempt.current();published.push(5);});
 assert.equal(clock.pending,0,'incoming batches do not schedule another commit during the current one');
 await clock.advance(100);assert.equal(firstAttempt.signal.aborted,false);assert.deepEqual(published,[]);
 firstGate.resolve();await flush();assert.deepEqual(published,[3]);
 await clock.advance(49);assert.deepEqual(published,[3]);
 await clock.advance(1);assert.deepEqual(published,[3,5]);

 publication.stage(()=>{throw Error('finish must remove the staged callback');});
 const final=publication.finish(async attempt=>{finalAttempt=attempt;await finalGate.promise;attempt.current();published.push('final');}).then(()=>{finished=true;});
 await clock.advance(49);assert.equal(finalAttempt,undefined);
 await clock.advance(1);assert(finalAttempt);assert.equal(finished,false);
 finalGate.resolve();await final;assert.deepEqual(published,[3,5,'final']);assert.equal(clock.pending,0);
 await publication.close();assert.equal(finalAttempt.isCurrent(),true,'completed aggregate authority survives task close');assert.equal(finalAttempt.signal.aborted,false);assert.doesNotThrow(()=>finalAttempt.current());
});

test('a newer commit cancels the old attempt immediately and waits for its cleanup before publishing',async t=>{
 const {clock,createViewportRequestContinuation}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted());
 const gate=deferred(),published=[];let oldAttempt,newAttempt,finished=false;
 t.after(async()=>{view.abort();gate.resolve();await publication.close();});
 publication.stage(async attempt=>{oldAttempt=attempt;await gate.promise;attempt.current();published.push('obsolete');});
 await clock.advance(16);assert(oldAttempt);
 const final=publication.finish(attempt=>{newAttempt=attempt;attempt.current();published.push('latest');}).then(()=>{finished=true;});
 await until(()=>oldAttempt.signal.aborted,'supersession aborts the old attempt before its cleanup settles');
 await flush();
 assert.equal(newAttempt,undefined,'replacement work waits for the obsolete payload to settle');
 assert.equal(finished,false);
 assert.deepEqual(published,[]);
 gate.resolve();await final;assert.deepEqual(published,['latest']);
 await publication.close();
 assert.equal(newAttempt.isCurrent(),true,'close does not revoke an already completed publication');
 view.abort();assert.equal(newAttempt.isCurrent(),false);assert.throws(()=>newAttempt.current(),{name:'AbortError'});
});

test('adjacent publication handoff exists only during synchronous predecessor abort delivery',async t=>{
 const {clock,createViewportRequestContinuation,adjacentViewportPublicationSignal,createProgramGrantHandoff}=shared();
 const view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),context={},program={},released=[];
 const holder=createProgramGrantHandoff((_context,value)=>released.push(value));let previous,successor,inside,afterMicrotask;
 t.after(async()=>{view.abort();holder.clear();await publication.close();});
 publication.stage(attempt=>{previous=attempt;attempt.signal.addEventListener('abort',()=>{
  inside=adjacentViewportPublicationSignal(attempt.signal);holder.replace(context,[program,program],inside);
  void Promise.resolve().then(()=>{afterMicrotask=adjacentViewportPublicationSignal(attempt.signal);});
 });});
 await clock.advance(16);assert(previous);assert.equal(adjacentViewportPublicationSignal(previous.signal),undefined);
 const final=publication.finish(attempt=>{
  successor=attempt;assert.equal(inside,attempt.signal);assert.equal(holder.matches(attempt.signal),true);
  assert.equal(adjacentViewportPublicationSignal(previous.signal),undefined,'association ends before successor payload runs');holder.clear();
 });
 await clock.advance(50);await final;await flush();
 assert.equal(inside,successor.signal);assert.equal(afterMicrotask,undefined);assert.equal(successor.isCurrent(),true);
 assert.deepEqual(released,[program,program],'the two transferred roles retire separately');
});

test('an early failed publication successor clears transferred grants without a false adjacent abort',async t=>{
 const {clock,createViewportRequestContinuation,adjacentViewportPublicationSignal,createProgramGrantHandoff}=shared();
 const view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),context={},program={},released=[],abortAssociations=[],failure=Error('successor failed before publication');
 const holder=createProgramGrantHandoff((_context,value)=>released.push(value));let previous,successor;
 t.after(async()=>{view.abort();holder.clear();await publication.close();});
 publication.stage(attempt=>{previous=attempt;attempt.signal.addEventListener('abort',()=>holder.replace(context,[program],adjacentViewportPublicationSignal(attempt.signal)));});
 await clock.advance(16);
 const final=publication.finish(attempt=>{successor=attempt;assert.equal(holder.matches(attempt.signal),true);attempt.signal.addEventListener('abort',()=>abortAssociations.push(adjacentViewportPublicationSignal(attempt.signal)));throw failure;});
 const rejected=assert.rejects(final,error=>error===failure);await clock.advance(50);await rejected;await flush();
 assert.equal(successor.signal.aborted,true);assert.equal(successor.signal.reason,failure);assert.equal(view.signal.aborted,false);
 assert.equal(holder.matches(successor.signal),false);assert.deepEqual(released,[program]);assert.deepEqual(abortAssociations,[undefined]);
 assert.equal(adjacentViewportPublicationSignal(previous.signal),undefined);
});

test('parent cancellation during predecessor delivery invalidates the already bound successor',async t=>{
 const {clock,createViewportRequestContinuation,adjacentViewportPublicationSignal,createProgramGrantHandoff}=shared();
 const view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),context={},program={},released=[],failure=Error('view cancelled inside old abort');
 const holder=createProgramGrantHandoff((_context,value)=>released.push(value));let previous,offered,afterParentAbort,payloadCalls=0;
 t.after(async()=>{view.abort();holder.clear();await publication.close();});
 publication.stage(attempt=>{previous=attempt;attempt.signal.addEventListener('abort',()=>{
  offered=adjacentViewportPublicationSignal(attempt.signal);holder.replace(context,[program],offered);view.abort(failure);afterParentAbort=adjacentViewportPublicationSignal(attempt.signal);
 });});
 await clock.advance(16);
 const final=publication.finish(()=>{payloadCalls++;}),rejected=assert.rejects(final,error=>error===failure);
 await clock.advance(50);await rejected;await flush();
 assert(offered);assert.equal(offered.aborted,true);assert.equal(afterParentAbort,undefined);assert.equal(payloadCalls,0);
 assert.equal(holder.matches(offered),false);assert.deepEqual(released,[program]);assert.equal(adjacentViewportPublicationSignal(previous.signal),undefined);
});

test('a superseded async stage cannot announce its later real error on the still-current view',async t=>{
 const {clock,createViewportRequestContinuation}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),gate=deferred(),failures=[],error=Error('obsolete preparation failed');
 let oldAttempt,currentAttempt;
 t.after(async()=>{view.abort();gate.resolve();await publication.close();});
 publication.stage(async attempt=>{oldAttempt=attempt;await gate.promise;throw error;},failure=>failures.push(failure));
 await clock.advance(16);assert(oldAttempt);
 const final=publication.finish(attempt=>{currentAttempt=attempt;});
 await until(()=>oldAttempt.signal.aborted,'the replacement cancels the obsolete attempt immediately');
 await flush();assert.equal(currentAttempt,undefined,'the replacement waits for obsolete cleanup');
 gate.resolve();await final;
 assert.equal(oldAttempt.isCurrent(),false);assert.equal(oldAttempt.signal.aborted,true);assert.equal(currentAttempt.isCurrent(),true);assert.equal(currentAttempt.signal.aborted,false);
 await publication.close();
 assert.deepEqual(failures,[],'error callbacks belong to their commit attempt, not just the base viewport');
});

test('hidden async publication cannot commit late and show resumes the same wanted 3D intent once',async t=>{
 const {createViewportRequestContinuation,adjacentViewportPublicationSignal}=shared(),external=new AbortController(),gate=deferred(),published=[],abortAssociations=[];
 let hidden=false,view,attempts=0,settled=false,firstClosed=false,firstCommit;
 const continuation=createViewportRequestContinuation(()=>hidden);
 const result=continuation.run(external.signal,true,async currentView=>{
  view=currentView;const number=++attempts,publication=continuation.publication(view.signal,()=>view.signal.throwIfAborted());
  try{await publication.finish(async attempt=>{if(number===1){firstCommit=attempt;attempt.signal.addEventListener('abort',()=>abortAssociations.push(adjacentViewportPublicationSignal(attempt.signal)));await gate.promise;}attempt.current();published.push(number);});return '3d';}
  finally{await publication.close();if(number===1)firstClosed=true;}
 });
 const observed=result.then(value=>{settled=true;return value;},error=>{settled=true;throw error;});
 t.after(async()=>{external.abort();gate.resolve();await observed.catch(()=>{});});
 await until(()=>firstCommit!==undefined,'first async commit starts');assert.equal(attempts,1);
 hidden=true;assert.equal(continuation.setHidden(true,view),true);gate.resolve();await until(()=>firstClosed,'hidden attempt drains its obsolete async work');await flush();
 assert.equal(view.signal.aborted,true);assert.deepEqual(published,[]);assert.deepEqual(abortAssociations,[undefined]);assert.equal(attempts,1);assert.equal(settled,false);assert.equal(external.signal.aborted,false);
 hidden=false;assert.equal(continuation.setHidden(false),true);await until(()=>settled,'show resumes the original intent');
 assert.equal(await observed,'3d');assert.equal(attempts,2);assert.deepEqual(published,[2]);
});

test('viewport supersession retries the original intent, while explicit cancellation and real errors do not',async()=>{
 const {createViewportRequestContinuation,adjacentViewportPublicationSignal}=shared(),external=new AbortController(),gate=deferred(),abortAssociations=[];
 let moving=false,view,attempts=0,settled=false;
 const continuation=createViewportRequestContinuation(()=>moving);
 const result=continuation.run(external.signal,true,async currentView=>{
  view=currentView;const publication=continuation.publication(view.signal,()=>view.signal.throwIfAborted());
   try{await publication.finish(async attempt=>{if(++attempts===1){attempt.signal.addEventListener('abort',()=>abortAssociations.push(adjacentViewportPublicationSignal(attempt.signal)));await gate.promise;}attempt.current();});return '3d';}
  finally{await publication.close();}
 }).then(value=>{settled=true;return value;});
 await flush();moving=true;continuation.invalidateViewport(view);gate.resolve();await flush();
 assert.equal(attempts,1);assert.equal(settled,false);assert.equal(external.signal.aborted,false);assert.deepEqual(abortAssociations,[undefined]);
 moving=false;assert.equal(continuation.settleViewport(),true);await until(()=>settled,'moveend resumes the original intent');assert.equal(await result,'3d');assert.equal(attempts,2);
 for(const cancel of ['intent','parent']){
  const parent=new AbortController(),owner=createViewportRequestContinuation(()=>true);let error,completed=false,calls=0;
  const pending=owner.run(parent.signal,true,async()=>{calls++;}).then(()=>{completed=true;},failure=>{completed=true;error=failure;});
  await flush();if(cancel==='intent')owner.cancel();else parent.abort();await flush();
  assert.equal(completed,true,cancel+' abort settles while waiting for a stable view');await pending;assert.equal(error.name,'AbortError');assert.equal(calls,0);
 }
 for(const error of [Error('real source failure'),new DOMException('unowned transport abort','AbortError')]){
  const owner=createViewportRequestContinuation(()=>false);let calls=0,actual,completed=false;
  const failed=owner.run(signal(),true,async()=>{calls++;throw error;}).then(()=>{completed=true;},failure=>{completed=true;actual=failure;});
  await flush();assert.equal(completed,true);await failed;assert.equal(actual,error);assert.equal(calls,1,'unowned errors never become viewport retries');
 }
});

test('explicit 2D replaces a hidden stable-view wait without leaking an internal viewport abort',async()=>{
 const {createViewportRequestContinuation}=shared(),continuation=createViewportRequestContinuation(()=>true),parent=new AbortController();
 continuation.setHidden(true);
 let threeDCalls=0,threeDResult,twoDCalls=0;
 const pending=continuation.run(parent.signal,true,async()=>{threeDCalls++;return '3d';}).then(value=>{threeDResult=value;},error=>{threeDResult=error;});
 await flush();assert.equal(threeDCalls,0);assert.equal(threeDResult,undefined);
 const flat=continuation.run(signal(),false,async view=>{view.signal.throwIfAborted();twoDCalls++;return '2d';});
 assert.equal(await flat,'2d');await pending;
 assert.equal(threeDResult.name,'AbortError');assert.equal(parent.signal.aborted,false);assert.equal(threeDCalls,0);assert.equal(twoDCalls,1,'2D does not wait for visibility or stable camera');
 continuation.setHidden(false);continuation.settleViewport();await flush();assert.equal(threeDCalls,0,'show cannot revive the replaced 3D intent');
});

test('close cancels an unfinished publication before waiting for its payload to drain',async t=>{
 const {clock,createViewportRequestContinuation,adjacentViewportPublicationSignal}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),gate=deferred(),published=[],abortAssociations=[];
 let pendingAttempt,closed=false;
 t.after(async()=>{view.abort();gate.resolve();await publication.close();});
 publication.stage(async attempt=>{pendingAttempt=attempt;attempt.signal.addEventListener('abort',()=>abortAssociations.push(adjacentViewportPublicationSignal(attempt.signal)));await gate.promise;attempt.current();published.push('late');});
 await clock.advance(16);assert(pendingAttempt);
 const closing=publication.close().then(()=>{closed=true;});await flush();
 assert.equal(pendingAttempt.signal.aborted,true);assert.equal(pendingAttempt.isCurrent(),false);assert.deepEqual(abortAssociations,[undefined]);assert.equal(closed,false);assert.equal(clock.pending,0);
 gate.resolve();await closing;assert.equal(closed,true);assert.deepEqual(published,[]);
});

test('staged current failures report once while current, then abort their publication authority',async()=>{
 const {clock,createViewportRequestContinuation}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),error=Error('fixture preparation failed'),failures=[],events=[];
 let failedAttempt;
 publication.stage(attempt=>{failedAttempt=attempt;attempt.signal.addEventListener('abort',()=>events.push('abort'));throw error;},failure=>{assert.equal(failedAttempt.isCurrent(),true);assert.equal(failedAttempt.signal.aborted,false);assert.doesNotThrow(()=>failedAttempt.current());events.push('error');failures.push(failure);});await clock.advance(100);
 assert.deepEqual(failures,[error]);assert.deepEqual(events,['error','abort']);assert.equal(failedAttempt.signal.aborted,true);assert.equal(failedAttempt.signal.reason,error);assert.equal(failedAttempt.isCurrent(),false);assert.throws(()=>failedAttempt.current(),failure=>failure===error);assert.equal(clock.pending,0);await publication.close();assert.deepEqual(failures,[error]);
});

test('a failed final publication aborts its attempt even without an error callback',async()=>{
 const {createViewportRequestContinuation,adjacentViewportPublicationSignal}=shared(),view=new AbortController(),publication=createViewportRequestContinuation(()=>false).publication(view.signal,()=>view.signal.throwIfAborted()),error=Error('final preparation failed'),abortAssociations=[];
 let failedAttempt,aborts=0;
 await assert.rejects(publication.finish(attempt=>{failedAttempt=attempt;attempt.signal.addEventListener('abort',()=>{aborts++;abortAssociations.push(adjacentViewportPublicationSignal(attempt.signal));});throw error;}),failure=>failure===error);
 assert.equal(failedAttempt.signal.aborted,true);assert.equal(failedAttempt.signal.reason,error);assert.equal(failedAttempt.isCurrent(),false);assert.equal(aborts,1);assert.deepEqual(abortAssociations,[undefined]);await publication.close();assert.equal(aborts,1);
});

test('the last prepared consumer retires references before its final unpin, and each release is idempotent',()=>{
 const {createPreparedConsumerLifetime}=shared(),events=[],input=[{}],prepared={input};let pins=0;
 const lifetime=createPreparedConsumerLifetime(value=>{events.push('retire');value.input=[];});
 const retainPin=()=>{pins++;return()=>{if(pins===1)assert.deepEqual(prepared.input,[],'final unpin cannot observe retained preparation references');events.push('unpin');pins--;};};
 const first=lifetime.retain(prepared,retainPin),second=lifetime.retain(prepared,retainPin);
 lifetime.retire(prepared);assert.equal(prepared.input,input);assert.equal(lifetime.count(prepared),2);
 first();first();assert.equal(prepared.input,input);assert.equal(pins,1);assert.equal(lifetime.count(prepared),1);
 second();second();assert.deepEqual(events,['unpin','retire','unpin']);assert.equal(pins,0);assert.equal(lifetime.count(prepared),0);assert.equal(input.length,1);
});

// A synthetic, unowned fixture city and valid plain JSON protocol keep this
// source-lifetime case independent of owner recipes, real models and rendering.
function native(city,version){const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]};return{city,objectId:'osm/way/1',partId:'component/'+version,origin:[13,52],sourceFeature:{type:'Feature',id:'osm/way/1',geometry,properties:{fixture:true,version,nested:{original:version}}},componentGeometry:geometry,batches:[{positions:[version,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4]}]};}
function sourceRuntime(){
 const modules=new Map();
 function load(url){
  const file=new URL(url);if(!file.pathname.endsWith('.ts'))file.pathname+='.ts';
  const key=file.href;if(modules.has(key))return modules.get(key);
  const text=readFileSync(file,'utf8'),module={exports:{}};modules.set(key,module.exports);
  const output=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal((output.diagnostics??[]).filter(diagnostic=>diagnostic.category===ts.DiagnosticCategory.Error).length,0,key);
  Function('require','module','exports','crypto',output.outputText)(specifier=>{assert(specifier.startsWith('.'),'browser production dependency must be relative: '+specifier);return load(new URL(specifier,file));},module,module.exports,webcrypto);
  modules.set(key,module.exports);return module.exports;
 }
 return relative=>load(new URL('../src/'+relative+'.ts',import.meta.url));
}
function fixtureFunction(relative,name,ctx){
 const text=readFileSync(new URL('../src/'+relative+'.ts',import.meta.url),'utf8'),ast=ts.createSourceFile(relative+'.ts',text,ts.ScriptTarget.Latest,true);let found;
 (function visit(node){if((ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node))&&node.name?.text===name)found=node;ts.forEachChild(node,visit);})(ast);
 assert(found,relative+' exports '+name);return evaluate('return ('+expression(found,ast)+');',ctx);
}

test('each manager replaces a source lease only from a different pinned asset identity and retires temporary native readers',async()=>{
 const load=sourceRuntime(),{createChunkResourceStore}=load('safety/render-runtime/chunk-resource-store'),budget=load('safety/render-runtime/resource-budget'),{createSharedNativeSourcePool}=load('safety/shared-native-source'),payload=load('safety/building-payload-cost'),codec=load('safety/building-mesh-codec'),shadow=load('safety/source-shadow-binding'),roleDisplay=load('safety/source-role-display'),{createWantedResourceLeases}=load('safety/viewport-request');
 // These actual lazy preparers reject this fixture city's non-owner inputs
 // without loading any owner recipe/data; their ready predicates are untouched.
 const bremenRoutes=load('painted/infill/safety/bremen-infill-owner-routes'),frankfurt=load('painted/bremen/safety/infill-frankfurt-low-office-bulk70'),nonBerlin=load('painted/root500/safety/owner-nonberlin-lazy');
 for(const provider of providers){
  const {ast}=sources.get(provider),city='manager-resident-fixture',inputs=[native(city,1),native(city,2)],assets=inputs.map((component,index)=>{
   const bytes=new TextEncoder().encode(JSON.stringify({schema_version:1,city,components:[component]}));
   return {bytes,descriptor:{id:'native',tile_key:'same',path:'/safety/buildings3d/manager-resident-fixture-'+index+'.json',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.byteLength,vertices:3,lod:1}};
  }),reads=[],waiting=new AbortController(),nextWaiting=new AbortController(),candidates=[];
  // The real normalizer admits its 200,000-vertex working bound before reading
  // even this tiny fixture. Keep that admission enabled inside a finite budget.
  const store=createChunkResourceStore({budget:budget.createResourceBudget({limitBytes:16*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
  const pool=createSharedNativeSourcePool({resourceStore:store,read:async(path,productionSignal,max)=>{productionSignal.throwIfAborted();assert.notEqual(productionSignal,waiting.signal,'production is not owned by the temporary viewport wait');assert.notEqual(productionSignal,nextWaiting.signal);const asset=assets.find(item=>item.descriptor.path===path);assert(asset,'only the declared synthetic native fixtures may be read');assert(asset.bytes.byteLength<=max);reads.push(path);return asset.bytes.slice();}}),client=pool.client(city);
  let ownerRecipes=0,mainA,mainB;
  const ctx={resourceContentKey:load('safety/resource-content-key').resourceContentKey,city,mobile:false,maxVertices:100,loadCount:0,sourceValues:0,destroyed:false,ownedSourcePool:undefined,sourceClient:client,sourceOwnerKey:client.ownerKey,resources:store,resourceStore:store,sourceMetrics:new Map(),sourceDiagnostics:new Map(),sourceContentByShard:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),retainedShardCost:new WeakMap(),retainedComponentCost:new WeakMap(),ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),detailResourceKeyByRows:new WeakMap(),shadowByShard:new WeakMap(),manifestSHA:'a'.repeat(64),manifest:{source_pbf_sha256:'b'.repeat(64),city_boundary:{sha256:'c'.repeat(64)},compiler_sha256:'d'.repeat(64),source_snapshot:'synthetic-manager-resident-fixture',actual_geometry_lod:1},...payload,...codec,ResourceBudgetExceededError:budget.ResourceBudgetExceededError,createWantedResourceLeases,shadowAdmissionForDecodedShard:shadow.shadowAdmissionForDecodedShard,prepareSourceRoleDisplay:roleDisplay.prepareSourceRoleDisplay,prepareBremenInfillOwnerRouteModules:bremenRoutes.prepareBremenInfillOwnerRouteModules,prepareInfillFrankfurtLowOfficeBulk70Reconstruction:frankfurt.prepareInfillFrankfurtLowOfficeBulk70Reconstruction,prepareNonBerlinOwnerRoutes:nonBerlin.prepareNonBerlinOwnerRoutes,OWNER_SHAPE_PATCH_PROFILES:[],F:undefined,verifyOwnerShapePatchRows(){ownerRecipes++;throw Error('An unowned fixture cannot invoke an owner recipe');},options:{nativeSources:client,awaitPaintInitialization(){ownerRecipes++;throw Error('An unowned fixture cannot initialize owner paint');}}};
  // An empty owner catalog is explicit fixture data. Run the actual lookup;
  // no source readiness, admission budget, generation or publication gate is stubbed.
  ctx.ownerShapePatchProfile=fixtureFunction('painted/city/safety/owner-shape-patch-display','ownerShapePatchProfile',ctx);
  // src-r3b: loadShard imports the C358 module by city before the source lease and binds rows
  // synchronously after the read. Both actual functions run over the actual c358-display module
  // bindings (exactOwner, the lazy module and its bound value F); this fixture city never imports it.
  const c358={F:undefined,createLazyCityMaterial:load('painted/city/safety/lazy-city-material').createLazyCityMaterial};
  for(const name of ['C358_CITY','exactOwner','fixtureModule'])c358[name]=fixtureFunction('painted/city/safety/c358-display',name,c358);
  for(const name of ['prepareC358MaterialModule','bindC358MaterialRows','prepareC358MaterialBinding'])ctx[name]=fixtureFunction('painted/city/safety/c358-display',name,c358);
  ctx.prepareInlineCityMaterials=fixtureFunction('painted/city/safety/inline-city-materials','prepareInlineCityMaterials',ctx);
  for(const name of ['sourceContentKey','resourceKey','sourceResourceKey','bindSourceContent','recordSourceMetrics','sourceResourceCosts','shadowMetadataReserve','retireSourceClient','loadShard','loadSourceContent','shard']){const node=named(provider,name);if(node)ctx[name]=evaluate('return ('+expression(node,ast)+');',ctx);}
  const wantedNode=named(provider,'wantedSources');assert(wantedNode,provider+' owns real wanted source leases');ctx.wantedSources=evaluate('return ('+expression(wantedNode,ast)+');',ctx);
  const wanted=ctx.wantedSources,key=asset=>ctx.sourceResourceKey?ctx.sourceResourceKey(asset):ctx.resourceKey(ctx.sourceContentKey(asset)),descriptor=asset=>({leaf:asset,detail:undefined,contentKey:key(asset)});
  const read=async(asset,request)=>{if(named(provider,'loadSourceContent')){candidates.push(wanted.retain(key(asset),'candidate'));return ctx.shard(asset,request);}return ctx.shard(asset,request,undefined,undefined,candidates);};
  try{
   const a=assets[0].descriptor,b=assets[1].descriptor;wanted.reconcile([descriptor(a)]);
   const firstRows=await read(a,waiting.signal),first=firstRows[0],firstFeature=first.sourceFeature,firstSnapshot=structuredClone(firstFeature),firstPositions=Array.from(first.batches[0].positions);
   mainA=wanted.retain(key(a),'main');const originalSource=mainA.value;
   assert.equal((await read(a,waiting.signal)),firstRows,provider+' same actual authority reuses the produced source');
   assert.equal(ctx.loadCount,1);assert.equal(pool.stats.decodes,1);assert.deepEqual(reads,[a.path]);
   for(const candidate of candidates.splice(0))candidate.release();waiting.abort();
   assert.equal(mainA.value,originalSource,provider+' retiring temporary waits/candidate roles cannot retire main');assert.equal(mainA.value.components[0],first);
   wanted.reconcile([descriptor(b)]);const secondRows=await read(b,nextWaiting.signal),second=secondRows[0];mainB=wanted.retain(key(b),'main');
   assert.notEqual(key(a),key(b));assert.notEqual(firstFeature,second.sourceFeature);assert.equal(mainA.value.components[0],first,'old independent main survives latest wanted replacement');assert.equal(ctx.loadCount,2);assert.equal(pool.stats.decodes,2);assert.deepEqual(reads,[a.path,b.path]);
   assert.equal(ctx.sourceLeafByFeature.get(firstFeature),a.sha256);assert.equal(ctx.sourceLeafByFeature.get(second.sourceFeature),b.sha256);assert.equal(ctx.sourceLeafByFeature.get(structuredClone(second.sourceFeature)),undefined,'provenance remains bound to the original decoded Feature identity');assert.deepEqual(firstFeature,firstSnapshot);assert.deepEqual(Array.from(first.batches[0].positions),firstPositions,'new source identity cannot modify old native buffers');
   for(const candidate of candidates.splice(0))candidate.release();nextWaiting.abort();wanted.reconcile([]);assert.deepEqual(wanted.keys,[]);
   assert.equal(mainA.value.components[0],first);assert.equal(mainB.value.components[0],second);assert.equal(pool.stats.entries,2,'two actual native sources remain owned by independent main roles');
   mainA.release();await flush();assert.equal(pool.stats.entries,1,'only the old source last consumer retires its native ancestry');assert.equal(mainB.value.components[0],second);assert.equal(pool.stats.holders,1);
   mainB.release();await flush();assert.equal(pool.stats.entries,0);assert.equal(pool.stats.holders,0);assert.equal(pool.stats.uniqueTypedBufferBytes,0,'logical source ownership is fully released, not a physical heap assertion');assert.equal(store.stats.resources,0);assert.equal(ownerRecipes,0,'no owner recipe was touched');
  }finally{for(const candidate of candidates)candidate.release();mainA?.release();mainB?.release();wanted.destroy();client.destroy();pool.destroy();store.destroy();}
 }
});
