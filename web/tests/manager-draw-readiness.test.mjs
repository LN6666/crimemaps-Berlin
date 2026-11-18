import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const providers=['city','delegated500','tier300','church','root500','infill','bremen'];
const observed=new Set(['root500','infill','bremen']);
const production=new Map(await Promise.all(providers.map(async provider=>{
 const file=new URL(`../src/painted/${provider}/safety/three-dimensional-map.ts`,import.meta.url);
 const source=await readFile(file,'utf8'),ast=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true),drawn=[],observers=[],getters=[];
 assert.equal(ast.parseDiagnostics.length,0,provider+' manager parses');
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='drawn')drawn.push(node);if(ts.isFunctionDeclaration(node)&&node.name?.text==='observeDraw')observers.push(node);if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='getDrawReadinessDiagnostic')getters.push(node.initializer);ts.forEachChild(node,visit);})(ast);
 assert.equal(getters.length,1,provider+' exposes its real readiness record');
 assert.equal(drawn.length,1,provider+' has one draw adapter');
 const imports=ast.statements.filter(node=>ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='../../../safety/resident-draw-readiness');
 assert.equal(imports.length,1,provider+' imports the shared draw helper');
 const bindings=imports[0].importClause?.namedBindings;
 assert(bindings&&ts.isNamedImports(bindings),provider+' uses the shared named helper');
 const helper=bindings.elements.find(binding=>(binding.propertyName??binding.name).text==='waitForResidentDraw');
 assert(helper,provider+' imports waitForResidentDraw');
 const code=ts.transpileModule([...observers,drawn[0]].map(node=>node.getText(ast)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const getter=ts.transpileModule('const getDiagnostic='+getters[0].getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 return[provider,{code,getter,helper:helper.name.text}];
})));

// Run only the actual adapter. The shared helper is a spy: no renderer graph,
// deadlines, map listeners, assets, browser or GPU work runs in this fixture.
function fixture(provider){
 let resolve,reject,now=100,diagnosticReads=0,currentFailure;
 const promise=new Promise((done,fail)=>{resolve=done;reject=fail;}),calls=[],currentCalls=[],sourcePublications=[],coveragePublications=[];
 const controller=new AbortController(),map=Object.freeze({}),signal=controller.signal,ticket=37,target={generation:11,registered:true,current:()=>true,sourceResourceKeys:['verified-source']};
 const firstState={ready:true,preparing:false},firstRenderer={getRevision:()=>({generation:11}),getDrawReadiness:()=>firstState};
 const env={map,renderer:firstRenderer,drawReadiness:undefined,managerReadiness:undefined,destroyed:false,revision:ticket,rememberReadyHandoff(){},performance:{now:()=>now,timeOrigin:123456},lastReadyGeneration:undefined,lastReadyState:undefined,adoptedDetailResources:new Map(),publishedDetailResources:new Map(),ownerReconstruction:{components:[]},sourceEdgeAssemblyDisplay:{groups:[],errors:[]},selectedShardIds:['fixture-source'],visibleRetainedEstimateBytes:32,
  current(...args){currentCalls.push(args);if(currentFailure)throw currentFailure;},
  rememberPublishedDetails(){return env.renderer?.getRevision?.().generation;},
  synchronizePublishedExplicitSources(){sourcePublications.push(['explicit-source-main']);},
  publishSourceContent(keys){sourcePublications.push([...keys]);},
  publishRequiredSolarCoverage(resources,generation){coveragePublications.push({resources:[...resources],generation});},
 };
 const argument=provider==='church'||provider==='delegated500'?target.generation:provider==='city'||provider==='tier300'?{current:()=>{assert(target.current());},registered:()=>target.registered,generation:()=>target.generation}:target;
 const {code,getter,helper}=production.get(provider);
 env[helper]=options=>{calls.push(options);return promise;};
 const scope=new Proxy(env,{has:()=>true,get:(value,key)=>{if(key===Symbol.unscopables)return undefined;if(key in value)return value[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('Unexpected draw adapter binding: '+String(key));},set:(value,key,next)=>(value[key]=next,true)});
 const readDiagnostic=Function('env','with(env){'+getter+'return getDiagnostic;}')(scope);
 const adapter=Function('env','with(env){'+code+'return drawn;}')(scope),drawn=(signal,ticket)=>adapter(signal,ticket,argument);
 return{env,map,signal,controller,readDiagnostic,ticket,target,firstRenderer,firstState,promise,resolve,reject,calls,currentCalls,sourcePublications,coveragePublications,drawn,
  failCurrent(error){currentFailure=error;},
  nextDiagnostic(value,generation=target.generation){now+=10;const renderer={getRevision:()=>({generation}),getDrawReadiness:()=>firstState,getReadinessDiagnostic(){assert.equal(this,renderer);diagnosticReads++;return value;}};env.renderer=renderer;return{now,renderer};},
  get diagnosticReads(){return diagnosticReads;},
 };
}

for(const provider of providers){
 test(provider+': actual draw adapter forwards its original budget and live request/renderer closures',async()=>{
  const f=fixture(provider),result=f.drawn(f.signal,f.ticket);
  assert(result instanceof Promise);assert.equal(f.calls.length,1);
  const options=f.calls[0];
  assert.equal(options.map,f.map);assert.equal(options.signal,f.signal);
  assert.equal(options.drawTimeoutMs,provider==='infill'||provider==='bremen'?8_000:15_000);
  assert.equal(Object.hasOwn(options,'totalTimeoutMs'),false,'the original visible total budget is not overridden');
  options.current();assert.deepEqual(f.currentCalls,[[f.signal,f.ticket]]);
  const failure=Error('request was superseded');f.failCurrent(failure);
  assert.throws(()=>options.current(),error=>error===failure);
  assert.equal(options.renderer().getDrawReadiness(),f.firstState,'the wrapper reads the current renderer readiness');
  const replacementState={ready:false,preparing:false,failure:'actual renderer failure'},replacement={getDrawReadiness(){assert.equal(this,replacement);return replacementState;},getRevision:()=>({generation:10})};f.env.renderer=replacement;
  assert.equal(options.renderer().getDrawReadiness(),replacementState,'a real failure survives the generation wrapper');
  replacement.getDrawReadiness=()=>f.firstState;
  assert.deepEqual(options.renderer().getDrawReadiness(),{ready:false,preparing:true},'an older drawable generation cannot complete the staged request');
  f.env.renderer=undefined;assert.equal(options.renderer(),undefined);
  let settled=false;result.then(()=>{settled=true;});await Promise.resolve();assert.equal(settled,false,'adapter waits for the helper');
  f.resolve();assert.equal(await result,undefined);
  const rejected=fixture(provider),error=Error('helper readiness failed'),pending=rejected.drawn(rejected.signal,rejected.ticket);
  const rejection=assert.rejects(pending,actual=>actual===error);rejected.reject(error);await rejection;
 });
 if(observed.has(provider))test(provider+': actual observer preserves request, phase, snapshot and renderer diagnostics at observation time',async()=>{
  const f=fixture(provider),pending=f.drawn(f.signal,f.ticket),observe=f.calls[0].observe;
  assert.equal(typeof observe,'function');assert.equal(f.env.drawReadiness,undefined);assert.equal(f.diagnosticReads,0);
  const phases=[['waiting','preparing'],['waiting','drawing'],['ready','ready'],['error','drawing','fixture failure'],['timeout','preparing','fixture timeout']];
  for(const[index,[phase,stage,reason]]of phases.entries()){
   const snapshot=Object.freeze({pageVisible:index!==4,mapMoving:index===4?null:false,rendererPresent:true,pickReady:index===4?null:phase==='ready',pickReadyEvaluated:index!==4});
   const value=Object.freeze({phase,stage,inspections:index+2,snapshot,...(reason===undefined?{}:{reason})});
   const timing=Object.freeze({queuedAtMs:20,startedAtMs:25,queueWaitMs:5,wallMs:80+index,synchronousMs:7,khrCompletionWaitMs:60+index,khrCompletionQueries:3+index});
   const diagnostic=Object.freeze({revision:index,partition:{pending:2},contextLost:false,programPreparation:Object.freeze({
    schemaVersion:1,observedAtMs:100+index,performanceTimeOriginMs:123456,pending:1,
    pendingResources:[{source:provider,resource:'main',phase:'link-completion',timing}],
    phaseTimings:{'link-submit':{calls:1,totalMs:7,maxMs:7}},
    terminalPhases:{ready:{lastSettledAtMs:90,longestKHRCompletionWait:{startedAtMs:30,endedAtMs:80,durationMs:50}}},
    context:{epoch:2,pending:3,inFlight:1,maxInFlight:1,scheduled:true,visibleStarts:4},
   })});
   const {now}=f.nextDiagnostic(diagnostic);observe(value);
   const cached=f.env.drawReadiness;
   assert.equal(cached.ticket,f.ticket);assert.equal(cached.inspections,value.inspections);
   assert.equal(cached.phase,phase);assert.equal(cached.stage,stage);assert.equal(cached.reason,reason);
   assert.deepEqual(cached.snapshot,snapshot);assert.equal(cached.renderer,diagnostic);
   assert.equal(cached.renderer.programPreparation,diagnostic.programPreparation);assert.deepEqual(cached.renderer,diagnostic);
   assert.equal(cached.recordedAtMs,now);assert.equal(cached.performanceTimeOriginMs,f.env.performance.timeOrigin);
   assert.equal(f.diagnosticReads,index+1,'each observation reads the current renderer once');
   assert.equal(provider==='bremen'?cached.handoff.mainReady:cached.mainReady,phase==='ready','main readiness requires the observed publication');
  }
  assert.deepEqual(f.sourcePublications,[['explicit-source-main'],['verified-source']],'source main roles publish only at the actual ready observation');
  f.nextDiagnostic({revision:'older'},10);observe({phase:'ready',stage:'ready',inspections:8,snapshot:{pickReady:true}});
  assert.equal(provider==='bremen'?f.env.drawReadiness.handoff.mainReady:f.env.drawReadiness.mainReady,false,'an obsolete complete frame cannot publish this request');
  assert.deepEqual(f.sourcePublications,[['explicit-source-main'],['verified-source']]);
  f.env.renderer=undefined;
  observe({phase:'waiting',stage:'preparing',inspections:9,snapshot:{pageVisible:true,mapMoving:false,rendererPresent:false,pickReady:null,pickReadyEvaluated:true}});
  assert.equal(f.env.drawReadiness.renderer,undefined);assert.equal(f.env.drawReadiness.reason,undefined);
  f.resolve();await pending;
 });
}

for(const provider of ['city','tier300','church','delegated500'])test(provider+': public diagnostic observes the real adapter without changing its publication or deadline',async()=>{
 const f=fixture(provider),pending=f.drawn(f.signal,f.ticket),observe=f.calls[0].observe;
 assert.equal(f.readDiagnostic(),undefined);assert.equal(typeof observe,'function');
 for(const phase of ['waiting','ready','error','timeout']){
  const timing={startedAtMs:40,observedAtMs:120,elapsedWallMs:80,visibleBudgetMs:15000},snapshot={pageVisible:true,mapMoving:false,rendererPresent:true,pickReady:phase==='ready',pickReadyEvaluated:true};
  const diagnostic={revision:phase,preparedSourceStats:{resident:{builds:2,replacements:1}}};f.nextDiagnostic(diagnostic);
  const readsBefore=f.diagnosticReads,capturesTerminal=(provider==='city'||provider==='delegated500')&&phase!=='waiting';
  observe({phase,stage:phase==='ready'?'ready':'preparing',inspections:2,timing,snapshot,...(phase==='error'?{reason:'real failure'}:{})});
  assert.equal(f.diagnosticReads,readsBefore+(capturesTerminal?1:0),'only terminal observations capture renderer details; waiting remains cheap');
  const record=f.readDiagnostic();assert.equal(record.phase,phase);assert.equal(record.timing,timing);assert.equal(record.snapshot,snapshot);assert.equal(record.renderer,diagnostic);assert.equal(record.mainReady,phase==='ready');
  assert.equal(record.reason,phase==='error'?'real failure':undefined);
  if(capturesTerminal)assert.equal(record.rendererAtObservation,diagnostic,'preserve the terminal renderer evidence');
 }
 f.nextDiagnostic({revision:'older'},10);observe({phase:'ready',stage:'ready',inspections:3,snapshot:{pickReady:true}});
 assert.equal(f.readDiagnostic().mainReady,false,'wrong published generation cannot count as main ready');
 const retained=f.env.managerReadiness;
 f.env.revision++;observe({phase:'ready',stage:'ready',snapshot:{pickReady:true}});assert.equal(f.env.managerReadiness,retained,'superseded request cannot overwrite');
 f.env.revision--;f.controller.abort();observe({phase:'timeout',stage:'preparing',snapshot:{pickReady:false}});assert.equal(f.env.managerReadiness,retained,'aborted request cannot overwrite');
 f.resolve();await pending;
});
