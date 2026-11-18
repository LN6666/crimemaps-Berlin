import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=new URL('../src/safety/main.ts',import.meta.url),raw=fs.readFileSync(source,'utf8'),ast=ts.createSourceFile(source.pathname,raw,ts.ScriptTarget.Latest,true);
assert.equal(ast.parseDiagnostics.length,0,'main parses');
const names=['beginMainContextRecovery','requestThreeDimensionalMode','readMainDrawReadiness','currentMainRecoveryReady','readRecoveryReadySnapshot'];
const declarations=names.map(name=>{const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,'actual '+name);return node.getText(ast);}).join('\n');
let lostCallback;
(function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='installCustomLayerRecovery')lostCallback=node.arguments[0].properties.find(property=>property.name?.getText(ast)==='onLost')?.initializer.getText(ast);ts.forEachChild(node,visit);})(ast);
assert(lostCallback,'actual main recovery loss callback');
const code=ts.transpileModule(declarations+'\nreturn {'+names.join(',')+',onLost:'+lostCallback+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(owner){
 const scope={threeDimensional:owner,threeDimensionalPreparation:undefined,contextRecoveryPreparation:undefined,mapGPUUnavailable:false,threeDimensionalRecovery:undefined,mapRecoveryNotice:{setThreeDFallback(){},update(){}},ensureBuildingInformation:async()=>{},dedicatedAppearance:undefined,building3dInteraction:undefined,
  dedicatedInitRequest:new AbortController(),viewportRequest:new AbortController(),environmentRequest:new AbortController(),syncSceneVisibility(){},refresh(){}};
 const values=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
 return {scope,...Function('scope','with(scope){'+code+'}')(values)};
}
function owner(mode='2d',snapshot={ready:true,preparing:false,providers:[]}){
 return {mode,wantedMode:mode,snapshot,beginContextRecovery:()=>false,suspend(){},resume(){},get renderer(){throw Error('readiness must not depend on a renderer existing');},getDrawReadinessSnapshot(){return this.snapshot;},getManagerDrawReadiness(){return [];},async requestMode(next){this.mode=this.wantedMode=next;this.snapshot={ready:true,preparing:false,providers:[]};return {mode:next,status:'ready'};}};
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('no owner remains pending while explicit 2D can be ready without creating a renderer',()=>{
 const h=harness();assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().preparing,true);
 h.scope.threeDimensional=owner();assert.equal(h.currentMainRecoveryReady(),true);assert.equal(h.readRecoveryReadySnapshot().ready,true);
});

test('2D initialization and recovery fallback retain failure even if a stale snapshot says ready',()=>{
 for(const failure of ['initialization budget rejected','restored GPU allocation rejected']){
  const h=harness(owner('2d',{ready:true,preparing:false,failure,providers:[]}));
  assert.throws(()=>h.currentMainRecoveryReady(),error=>error.message===failure);
  const draw=h.readRecoveryReadySnapshot();assert.equal(draw.ready,false);assert.equal(draw.preparing,false);assert.equal(draw.failure,failure);assert.equal(draw.wantedMode,'2d');
 }
});

test('3D intent requires current main readiness and matching mode before recovery completes',()=>{
 const current=owner('2d',{ready:false,preparing:true,providers:[]}),h=harness(current);current.wantedMode='3d';
 assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().preparing,true);
 current.snapshot={ready:true,preparing:false,providers:[]};assert.equal(h.currentMainRecoveryReady(),false,'an old 2D frame cannot finish a 3D request');
 current.mode='3d';current.snapshot.preparing=true;assert.equal(h.currentMainRecoveryReady(),false,'pending work cannot be relabeled ready');
 current.snapshot.preparing=false;assert.equal(h.currentMainRecoveryReady(),true);
});

test('terminal manager observations annotate the live snapshot without granting readiness',()=>{
 const row={provider:'city',managerPresent:true,rendererPresent:true,mode:'3d',wantedMode:'3d',ready:false,preparing:true,generation:9,viewRevision:4},current=owner('3d',{ready:false,preparing:true,providers:[row]});
 current.getManagerDrawReadiness=()=>[{provider:'city',record:{ticket:5,stage:'waiting-main',handoff:{expectedGeneration:9,publishedGeneration:8,actuallyPublished:true,mainReady:false},timing:{startedAtMs:100,observedAtMs:200,elapsedWallMs:100,visibleBudgetMs:8000},sourceComponents:new Array(100)}}];
 const h=harness(current),draw=h.readRecoveryReadySnapshot();assert.equal(h.currentMainRecoveryReady(),false);assert.equal(draw.ready,false);assert.equal(draw.providers[0].generation,9);assert.deepEqual(draw.providers[0].manager,{ticket:5,phase:undefined,stage:'waiting-main',expectedGeneration:9,publishedGeneration:8,published:true,mainReady:false,startedAtMs:100,observedAtMs:200,elapsedWallMs:100,visibleBudgetMs:8000});assert.equal('sourceComponents'in draw.providers[0].manager,false);
});

test('metadata initialization is pending before owner handoff and records its failure until an explicit successful request',async()=>{
 const current=owner(),h=harness(current),metadata=deferred();h.scope.ensureBuildingInformation=()=>metadata.promise;
 const pending=h.requestThreeDimensionalMode('3d',new AbortController().signal);assert.equal(current.wantedMode,'2d');assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().wantedMode,'3d');
 metadata.reject(Error('metadata initialization rejected'));await assert.rejects(pending,/metadata initialization rejected/);
 assert.throws(()=>h.currentMainRecoveryReady(),/metadata initialization rejected/);assert.equal(h.readRecoveryReadySnapshot().ready,false);assert.equal(h.readRecoveryReadySnapshot().preparing,false);
 await h.requestThreeDimensionalMode('2d',new AbortController().signal);assert.equal(h.currentMainRecoveryReady(),true);assert.equal(h.readRecoveryReadySnapshot().failure,undefined);
});

test('a retry stays pending while the lazy owner still carries the prior initialization error',async()=>{
 const current=owner('2d',{ready:false,preparing:false,failure:'previous initialization rejected',providers:[]}),h=harness(current),metadata=deferred();h.scope.ensureBuildingInformation=()=>metadata.promise;
 const pending=h.requestThreeDimensionalMode('3d',new AbortController().signal);assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().failure,undefined);
 metadata.resolve();await pending;assert.equal(h.currentMainRecoveryReady(),true);
});

test('an aborted metadata phase cannot count the untouched default 2D scene as a completed 3D request',async()=>{
 const current=owner(),h=harness(current),metadata=deferred(),request=new AbortController();h.scope.ensureBuildingInformation=()=>metadata.promise;
 const pending=h.requestThreeDimensionalMode('3d',request.signal);request.abort();metadata.resolve();await assert.rejects(pending,error=>error.name==='AbortError');
 assert.equal(current.wantedMode,'2d');assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().preparing,true);assert.equal(h.readRecoveryReadySnapshot().failure,undefined);
});

test('a superseded initialization rejection cannot replace the newer explicit 2D result',async()=>{
 const current=owner(),h=harness(current),metadata=deferred(),request=new AbortController();h.scope.ensureBuildingInformation=()=>metadata.promise;
 const pending=h.requestThreeDimensionalMode('3d',request.signal);request.abort();await h.requestThreeDimensionalMode('2d',new AbortController().signal);metadata.reject(Error('obsolete metadata rejection'));await assert.rejects(pending,/obsolete metadata rejection/);
 assert.equal(h.currentMainRecoveryReady(),true);assert.equal(h.readRecoveryReadySnapshot().failure,undefined);
});

const recoverySource=fs.readFileSync(new URL('../src/safety/custom-layer-recovery.ts',import.meta.url),'utf8'),recoveryCode=ts.transpileModule(recoverySource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {installCustomLayerRecovery}=await import('data:text/javascript;base64,'+Buffer.from(recoveryCode).toString('base64'));
function recovery(h){
 const events=new Map(),timers=new Map(),calls={ready:0,error:0,losses:[]},map={on(name,fn){const set=events.get(name)??new Set();set.add(fn);events.set(name,set);},off(name,fn){events.get(name)?.delete(fn);},emit(name){for(const fn of events.get(name)??[])fn();},isStyleLoaded:()=>true,getLayer:()=>undefined,triggerRepaint(){}};
 const coordinator=installCustomLayerRecovery({map,layers:()=>[],onLost(event){calls.losses.push(event);h.onLost(event);},onLayersRestored(){h.scope.mapGPUUnavailable=false;h.scope.threeDimensional?.resume({contextRecovery:true});},isReady:h.currentMainRecoveryReady,readReadySnapshot:h.readRecoveryReadySnapshot,onReady(){calls.ready++;},onError(){calls.error++;},schedule(fn,ms){assert.equal(ms,12000,'existing recovery budget');const id={};timers.set(id,fn);return id;},cancel(id){timers.delete(id);}});
 return {map,coordinator,calls,timers};
}

test('typed-loss AbortError after owner handoff stays recoverable through the existing restored/render events',async()=>{
 const current=owner(),h=harness(current);
 current.requestMode=async function(){this.wantedMode='3d';this.snapshot={ready:false,preparing:true,providers:[]};throw new DOMException('3D preparation interrupted by context loss','AbortError');};
 await assert.rejects(h.requestThreeDimensionalMode('3d',new AbortController().signal),error=>error.name==='AbortError');assert.equal(h.scope.threeDimensionalPreparation,undefined);assert.equal(h.currentMainRecoveryReady(),false);assert.equal(h.readRecoveryReadySnapshot().failure,undefined);
 const r=recovery(h);r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();r.map.emit('render');assert.equal(r.coordinator.state,'waiting-frame');assert.equal(r.calls.ready,0);
 current.mode='3d';current.snapshot={ready:true,preparing:false,providers:[]};r.map.emit('render');assert.equal(r.coordinator.state,'ready');assert.equal(r.calls.ready,1);assert.equal(r.calls.error,0);assert.equal(r.timers.size,0);r.coordinator.destroy();
});

test('recovery failure is terminal before a 2D fallback can be reported as recovered',async()=>{
 const current=owner('3d',{ready:false,preparing:true,providers:[]}),h=harness(current),r=recovery(h);r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();
 current.mode=current.wantedMode='2d';current.snapshot={ready:false,preparing:false,failure:'restored program allocation rejected',providers:[]};r.map.emit('render');
 assert.equal(r.coordinator.state,'error');assert.equal(r.calls.ready,0);assert.equal(r.calls.error,1);assert.equal(r.coordinator.lastTerminal.reason,'is-ready-error');assert.equal(r.coordinator.lastTerminal.readiness.ready,false);assert.equal(r.coordinator.lastTerminal.readiness.failure,current.snapshot.failure);assert.equal(r.timers.size,0);r.coordinator.destroy();
});

// Execute the compositor's actual transition, rollback, baseline and readiness
// functions. A single provider isolates rendering and byte I/O; no test copy of
// the failure/baseline rules participates in the main/coordinator event sequence.
const paintedFile=new URL('../src/safety/painted-map.ts',import.meta.url),paintedText=fs.readFileSync(paintedFile,'utf8'),paintedAst=ts.createSourceFile(paintedFile.pathname,paintedText,ts.ScriptTarget.Latest,true);
const paintedNames=['requestMode','beginContextRecovery','mainDrawReadiness'],paintedFunctions=new Map();
(function visit(node){if(ts.isFunctionDeclaration(node)&&paintedNames.includes(node.name?.text))paintedFunctions.set(node.name.text,node.getText(paintedAst));ts.forEachChild(node,visit);})(paintedAst);
assert.equal(paintedFunctions.size,paintedNames.length);
const paintedCode=ts.transpileModule([...paintedFunctions.values()].join('\n')+'\nreturn {'+paintedNames.join(',')+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function paintedOwner(){
 const published=[],scope={destroyed:false,wanted:'2d',transition:0,preparing:0,initializing:undefined,lastError:undefined,lastFallback:undefined,recoveryFallback:undefined,request:new AbortController(),providerOrder:['city'],states:new Map(),nextFailure:undefined,
  options:{onState:state=>published.push(state)},ensure:async()=>{},startFrozenInitialization(){},clearBytes(){},releaseSelectedSource(){},modelViewProjection:{invalidate(){}},location:{hostname:'test.invalid'},ChunkResourceContextLostError:class extends Error{},recordReadinessTimeout(){},recordTransitionFailure(){},solarDetailContextGeneration:0,solarDetail:{reset(){}}};
 const manager={mode:'2d',wantedMode:'2d',async requestMode(next){this.wantedMode=next;if(next==='3d'&&scope.nextFailure)throw scope.nextFailure;this.mode=next;return{mode:next,status:'ready'};}};
 scope.managers=new Map([['city',manager]]);scope.renderers=new Map([['city',{getDrawReadiness:()=>({ready:true,preparing:false}),getRevision:()=>({generation:1,viewRevision:1})}]]);
 scope.aggregateState=()=>({mode:manager.mode,status:'ready'});
 const values=new Proxy(scope,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
 const actual=Function('scope','with(scope){'+paintedCode+'}')(values);
 return {scope,published,owner:{requestMode:actual.requestMode,beginContextRecovery:actual.beginContextRecovery,getDrawReadinessSnapshot:()=>actual.mainDrawReadiness(true),getManagerDrawReadiness:()=>[],get mode(){return manager.mode;},get wantedMode(){return scope.wanted;},suspend(){},resume(){}}};
}
async function failedPaintedRequest(){
 const fixture=paintedOwner(),h=harness(fixture.owner);fixture.scope.nextFailure=Error('same source failure');
 let duringRollback;const publish=fixture.scope.options.onState;fixture.scope.options.onState=state=>{publish(state);if(state.fallback)duringRollback=fixture.owner.beginContextRecovery();};
 await assert.rejects(h.requestThreeDimensionalMode('3d',new AbortController().signal),/same source failure/);
 assert.equal(duringRollback,false,'fallback publication is not a settled request until rollback returns');assert.equal(fixture.scope.preparing,0);assert.equal(fixture.published.at(-1).fallback.provider,'city');
 fixture.scope.options.onState=publish;
 return{fixture,h};
}

test('completed 3D fallback followed by a new real loss recovers the retained 2D view and keeps diagnostics',async()=>{
 const {fixture,h}=await failedPaintedRequest(),preparation=h.scope.threeDimensionalPreparation,fallback=fixture.scope.lastFallback,error=fixture.scope.lastError,r=recovery(h);
 try{
  assert.throws(()=>h.currentMainRecoveryReady(),/same source failure/);
  r.map.emit('webglcontextlost');assert.strictEqual(h.scope.contextRecoveryPreparation,preparation);
  r.map.emit('webglcontextrestored');await Promise.resolve();r.map.emit('render');
  assert.equal(r.coordinator.state,'ready');assert.equal(r.calls.ready,1);assert.equal(r.calls.error,0);assert.equal(r.timers.size,0);
  assert.equal(h.scope.mapGPUUnavailable,false);assert.equal(h.readMainDrawReadiness().mode,'2d');assert.equal(h.currentMainRecoveryReady(),true);
  assert.strictEqual(h.scope.threeDimensionalPreparation,preparation);assert.equal(preparation.failure,error);assert.strictEqual(fixture.scope.lastFallback,fallback);assert.equal(fixture.scope.lastError,error);
 }finally{r.coordinator.destroy();}
});

test('a new 3D request with the same failure text is terminal in this recovery and terminal onLost cannot rebaseline it',async()=>{
 const {fixture,h}=await failedPaintedRequest(),old=h.scope.threeDimensionalPreparation,r=recovery(h);
 try{
  r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();
  const metadata=deferred();h.scope.ensureBuildingInformation=()=>metadata.promise;fixture.scope.nextFailure=Error('same source failure');
  const retry=h.requestThreeDimensionalMode('3d',new AbortController().signal),failed=assert.rejects(retry,/same source failure/);
  assert.equal(h.currentMainRecoveryReady(),false,'a new preparation object immediately invalidates the main baseline');r.map.emit('render');assert.equal(r.coordinator.state,'waiting-frame');assert.equal(r.calls.ready,0);
  metadata.resolve();await failed;
  assert.notStrictEqual(h.scope.threeDimensionalPreparation,old);assert.equal(fixture.scope.recoveryFallback,undefined);
  r.map.emit('render');assert.equal(r.coordinator.state,'error');assert.equal(r.calls.ready,0);assert.equal(r.calls.error,1);assert.equal(h.scope.mapGPUUnavailable,true);
  assert.deepEqual(r.calls.losses.map(event=>event.reason),['context-lost','terminal']);assert.equal(r.calls.losses[0].attemptId,r.calls.losses[1].attemptId);
  assert.strictEqual(h.scope.contextRecoveryPreparation,old,'terminal suspension does not accept the new failed preparation');assert.equal(fixture.scope.recoveryFallback,undefined);
  assert.throws(()=>h.currentMainRecoveryReady(),/same source failure/);r.map.emit('render');assert.equal(r.calls.ready,0);
 }finally{r.coordinator.destroy();}
});

test('pending metadata at the loss boundary cannot accept a previous fallback or default 2D as ready',async()=>{
 for(const previousFallback of [false,true]){
  const {fixture,h}=previousFallback?await failedPaintedRequest():(()=>{const fixture=paintedOwner();return{fixture,h:harness(fixture.owner)};})();
  const metadata=deferred();h.scope.ensureBuildingInformation=()=>metadata.promise;
  const pending=h.requestThreeDimensionalMode('3d',new AbortController().signal),failed=assert.rejects(pending,/new metadata failure/),r=recovery(h);
  try{
   r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();r.map.emit('render');
   assert.equal(h.scope.contextRecoveryPreparation,undefined);assert.equal(fixture.scope.recoveryFallback,undefined);assert.equal(r.coordinator.state,'waiting-frame');assert.equal(r.calls.ready,0);
   metadata.reject(Error('new metadata failure'));await failed;r.map.emit('render');
   assert.equal(r.coordinator.state,'error');assert.equal(r.calls.ready,0);assert.throws(()=>h.currentMainRecoveryReady(),/new metadata failure/);
  }finally{r.coordinator.destroy();}
 }
});

test('a 3D scene that falls back during this recovery remains a failure',async()=>{
 const fixture=paintedOwner(),h=harness(fixture.owner);await h.requestThreeDimensionalMode('3d',new AbortController().signal);
 const r=recovery(h);try{
  r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();
  fixture.scope.nextFailure=Error('restored GPU allocation rejected');await assert.rejects(h.requestThreeDimensionalMode('3d',new AbortController().signal),/restored GPU allocation rejected/);
  r.map.emit('render');assert.equal(r.coordinator.state,'error');assert.equal(r.calls.ready,0);assert.equal(fixture.scope.recoveryFallback,undefined);
  assert.match(r.coordinator.lastTerminal.readiness.failure,/restored GPU allocation rejected/);
 }finally{r.coordinator.destroy();}
});

test('a failed metadata retry cannot borrow the older owner fallback at a later real loss',async()=>{
 const {fixture,h}=await failedPaintedRequest(),fallback=fixture.scope.lastFallback;
 h.scope.ensureBuildingInformation=async()=>{throw Error('metadata failed before owner handoff');};
 await assert.rejects(h.requestThreeDimensionalMode('3d',new AbortController().signal),/metadata failed before owner handoff/);
 assert.equal(h.scope.threeDimensionalPreparation.handedOff,undefined);
 const r=recovery(h);try{
  r.map.emit('webglcontextlost');r.map.emit('webglcontextrestored');await Promise.resolve();r.map.emit('render');
  assert.equal(h.scope.contextRecoveryPreparation,undefined);assert.equal(fixture.scope.recoveryFallback,undefined);assert.strictEqual(fixture.scope.lastFallback,fallback);
  assert.equal(r.coordinator.state,'error');assert.equal(r.calls.ready,0);assert.match(r.coordinator.lastTerminal.readiness.failure,/metadata failed before owner handoff/);
 }finally{r.coordinator.destroy();}
});

test('recovery boundary records current preparation separately from historical manager readiness',()=>{
 const current=owner('3d',{ready:false,preparing:true,providers:[{provider:'infill',managerPresent:true,rendererPresent:true,ready:false,preparing:true}]}),h=harness(current);
 current.getRecoveryPreparationStats=()=>[{provider:'infill',pending:2,failed:0,ready:3,budget:{waitingForAvailability:false},pendingResources:[{resource:'geometry-upload',phase:'upload',priority:'visible',timing:{queuedAtMs:100,startedAtMs:110}}],sourceArrays:['omit']}];
 const snapshot=h.readRecoveryReadySnapshot();assert.equal(snapshot.ready,false);
 assert.equal(snapshot.providers[0].preparation.pending,2);
 assert.equal(snapshot.providers[0].preparation.jobs[0].resource,'geometry-upload');
 assert.equal('sourceArrays' in snapshot.providers[0].preparation,false);
});
