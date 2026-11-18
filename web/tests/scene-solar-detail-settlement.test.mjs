import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';

// Run the real scalar derivation and AST-extracted manager functions. No model,
// map renderer graph, GL, timers, browser, or historical test suite is loaded.
const repo=fileURLToPath(new URL('../..',import.meta.url));
const require=createRequire(path.join(repo,'web/package.json'));
const {build}=require('esbuild');
const output=await build({stdin:{contents:["export * from './safety/scene-solar-detail-settlement';",
 "export {createBuildingDetailRuntime} from './safety/building-detail-runtime';",
 "export {buildingDetailSolarCoverageBounds,mergeSceneSolarCoverageBounds} from './safety/prospective-solar-projection';"].join('\n'),
 resolveDir:path.join(repo,'web/src'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {deriveSceneSolarDetailSettlement,createBuildingDetailRuntime,buildingDetailSolarCoverageBounds,
 mergeSceneSolarCoverageBounds}=await import('data:text/javascript;base64,'+
 Buffer.from(output.outputFiles[0].contents).toString('base64'));
const PROVIDERS=['city','delegated500','tier300','church','root500','infill','bremen'];
const production=new Map(await Promise.all(PROVIDERS.map(async provider=>{
 const file=new URL(`../src/painted/${provider}/safety/three-dimensional-map.ts`,import.meta.url);
 const text=await readFile(file,'utf8'),ast=ts.createSourceFile(file.pathname,text,ts.ScriptTarget.Latest,true);
 assert.equal(ast.parseDiagnostics.length,0,provider+' manager parses');
 return [provider,{text,ast}];
})));
function find(provider,name){
 const {ast}=production.get(provider),functions=[],other=[];
 (function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name?.text===name)functions.push(node);
  else if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)===name)other.push(node);
  else if((ts.isVariableDeclaration(node)||ts.isPropertyAssignment(node))&&node.name.getText(ast)===name)other.push(node.initializer);
  ts.forEachChild(node,visit);
 })(ast);
 const matches=functions.length?functions:other;
 assert.equal(matches.length,1,provider+' has one actual '+name);
 return matches[0];
}
function evaluate(code,scope){
 const transpiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const live=new Proxy(scope,{has:()=>true,get:(value,key)=>{
  if(key===Symbol.unscopables)return undefined;
  if(key in value)return value[key];
  if(key in globalThis)return globalThis[key];
  throw new ReferenceError('Unexpected actual manager binding: '+String(key));
 },set:(value,key,next)=>(value[key]=next,true)});
 return Function('scope','with(scope){'+transpiled+'}')(live);
}
function actual(provider,name,scope){
 const node=find(provider,name),{ast}=production.get(provider);
 const expression=ts.isMethodDeclaration(node)?`({${node.getText(ast)}})[${JSON.stringify(name)}]`:`(${node.getText(ast)})`;
 return evaluate('return '+expression+';',scope);
}
function deferred(){
 let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});
 return {promise,resolve,reject};
}

const REQUIRED=new Set(['root500','infill','bremen']);
const BOX=[-2,0,-3,4,5,6];
function fixture(provider){
 const controller=new AbortController(),draw=deferred(),drawCalls=[];
 const scope={deriveSceneSolarDetailSettlement,buildingDetailSolarCoverageBounds,mergeSceneSolarCoverageBounds,
  destroyed:false,suspended:false,pageHidden:false,mode:'3d',wantedMode:'3d',revision:12,generation:7,
  lastReadyTicket:12,lastReadyGeneration:7,detailSettlementFailed:false,lastError:undefined,
  detailRefreshPending:false,visibleLoadsPending:0,preparingTicket:undefined,cameraMotionTicket:undefined,
  ownCameraStartingTicket:undefined,mapMoving:false,rendererGeneration:7,residentVertices:3,
  drawState:{ready:true,preparing:false},publishedSolarCoverageGeneration:7,publishedSolarCoverageBounds:BOX,
  requiredSolarCoverageGeneration:7,requiredSolarCoverageBounds:BOX,options:{},request:controller,
  modeRequests:{refreshBlocked:false,settleViewport:()=>false},s434Aggregate:{pending:false,clear(){}},
  sourceClient:{},mainSourceLeases:[],publishedSourceContentKeys:[],publishedContentKeys:[],sourceKeys:[],
  ownerReconstruction:{components:[]},sourceEdgeAssemblyDisplay:{groups:[],errors:[]},selectedShardIds:[],
  visibleRetainedEstimateBytes:0,stagingRetainedEstimateBytes:0,partial:false,readyHandoff:undefined,
  displayedDetailBinding:undefined,adoptedDetailBinding:undefined,nativeGroupDisplay:{groups:[],errors:[]},
  koRailCohortDiagnostic70:undefined,messeturmCohortDiagnostic70:undefined,
  adoptedDetailResources:new Map(),publishedDetailResources:new Map(),lastReadyState:undefined,
  drawReadiness:undefined,managerReadiness:undefined,detailDemand:{},cityMaterialModulesPending:false,
  recoveryResident:{invalidate(){}},flushDetailRefresh(){},synchronizePublishedExplicitSources(){},
  publishSourceContent(keys){scope.publishedContentKeys=[...keys];},
  rememberPublishedDetails:()=>scope.rendererGeneration,stagedSourceContent:()=>scope.sourceKeys,
  resourceKey:key=>key,wantedSources:{retain(){throw Error('unexpected SOURCE acquisition');}},
  performance:{now:()=>100,timeOrigin:1000},
  ChunkResourceContextLostError:class extends Error{},StaleBuildingDetailDemandError:class extends Error{},
  clearFailedHandoff(){},
 };
 scope.map={isMoving:()=>scope.mapMoving,triggerRepaint(){}};
 scope.renderer={getRevision:()=>({generation:scope.rendererGeneration,viewRevision:1}),
  getDrawReadiness:()=>scope.drawState,getReadinessDiagnostic:()=>({generation:scope.rendererGeneration}),
  get residentVertexCount(){return scope.residentVertices;},setEnabled(){},
  setBatches(rows,generation){assert.deepEqual(rows,[]);scope.rendererGeneration=generation;scope.residentVertices=0;}};
 scope.current=actual(provider,'current',scope);
 scope.announce=actual(provider,'announce',scope);
 if(REQUIRED.has(provider))scope.publishRequiredSolarCoverage=actual(provider,'publishRequiredSolarCoverage',scope);
 else{
  scope.computePublishedSolarCoverageBounds=actual(provider,'computePublishedSolarCoverageBounds',scope);
  scope.publishSourceDemand=actual(provider,'publishSourceDemand',scope);
  scope.rememberReadyHandoff=actual(provider,'rememberReadyHandoff',scope);
 }
 if(provider==='delegated500'||provider==='church')scope.observeDraw=actual(provider,'observeDraw',scope);
 scope.waitForResidentDraw=options=>{drawCalls.push(options);return draw.promise;};
 scope.drawn=actual(provider,'drawn',scope);
 const target={generation:7,registered:true,current:()=>true,sourceResourceKeys:[]};
 const argument=provider==='delegated500'||provider==='church'?target.generation:
  provider==='city'||provider==='tier300'?{current(){},registered:()=>target.registered,generation:()=>target.generation}:target;
 return {scope,controller,draw,drawCalls,target,argument,get:actual(provider,'getDetailSettlement',scope),
  drawn:()=>scope.drawn(controller.signal,scope.revision,argument)};
}
function observation(phase='ready'){
 return {phase,stage:phase==='ready'?'ready':'preparing',inspections:1,
  snapshot:{pickReady:phase==='ready',pageVisible:true,mapMoving:false,rendererPresent:true,pickReadyEvaluated:true}};
}
async function until(predicate){
 for(let turn=0;turn<30&&!predicate();turn++)await Promise.resolve();
 assert(predicate(),'bounded fixture microtasks did not reach the actual draw adapter');
}
function statement(provider,functionName,predicate){
 const fn=find(provider,functionName),matches=fn.body.statements.filter(predicate);
 assert.equal(matches.length,1,provider+' has one actual '+functionName+' statement for this path');
 return matches[0].getText(production.get(provider).ast);
}
function callsDetailSelect(node){
 let found=false;
 (function visit(value){
  if(ts.isCallExpression(value)&&ts.isPropertyAccessExpression(value.expression)&&value.expression.name.text==='select'&&
   value.expression.expression.getText().includes('detailRuntime'))found=true;
  ts.forEachChild(value,visit);
 })(node);
 return found;
}

test('settlement derivation preserves actual ready stamps and distinguishes private unknown from complete empty',()=>{
 const box=[-2,0,-3,4,5,6],base={active:true,failed:false,requestRevision:12,readyRequestRevision:12,
  generation:7,readyGeneration:7,pending:false,publicationGeneration:7,publicationBounds:box};
 assert.deepEqual(deriveSceneSolarDetailSettlement(base),{requestRevision:12,readyRequestRevision:12,
  generation:7,readyGeneration:7,pending:false,canonical:{kind:'bounds',generation:7,bounds:box}});
 for(const invalid of [{active:false},{failed:true},{readyRequestRevision:-1},{readyGeneration:-1}])
  assert.equal(deriveSceneSolarDetailSettlement({...base,...invalid}),undefined);
 const pending=deriveSceneSolarDetailSettlement({...base,requestRevision:13,generation:8,pending:true});
 assert.equal(pending.requestRevision,13);assert.equal(pending.readyRequestRevision,12);
 assert.equal(pending.generation,8);assert.equal(pending.readyGeneration,7);assert.equal(pending.pending,true);
 assert.equal(pending.canonical,undefined,'a temporarily unmatched private publication is unknown');
 assert.equal(deriveSceneSolarDetailSettlement({...base,publicationGeneration:6}).canonical,undefined);
 assert.equal(deriveSceneSolarDetailSettlement({...base,publicationGeneration:undefined}).canonical,undefined);
 assert.deepEqual(deriveSceneSolarDetailSettlement({...base,publicationBounds:undefined}).canonical,
  {kind:'empty',generation:7},'only a matching private publication generation can certify no canonical envelope');
});

test('all seven actual manager getters preserve ready tickets, block active work and keep missing private publication unknown',()=>{
 for(const provider of PROVIDERS){
  const f=fixture(provider),s=f.scope;
  assert.deepEqual(f.get(),{requestRevision:12,readyRequestRevision:12,generation:7,readyGeneration:7,
   pending:false,canonical:{kind:'bounds',generation:7,bounds:BOX}},provider);
  s.revision=13;
  assert.equal(f.get().readyRequestRevision,12,provider+' must not copy the current revision into ready');
  s.revision=12;
  for(const [key,value]of [['detailRefreshPending',true],['visibleLoadsPending',1],['preparingTicket',12],
   ['cameraMotionTicket',12],['ownCameraStartingTicket',12],['mapMoving',true]]){
   const old=s[key];s[key]=value;assert.equal(f.get().pending,true,provider+' '+key);s[key]=old;
  }
  s.modeRequests.refreshBlocked=true;assert.equal(f.get().pending,true,provider+' blocked viewport');s.modeRequests.refreshBlocked=false;
  if(REQUIRED.has(provider)){s.s434Aggregate.pending=true;assert.equal(f.get().pending,true,provider+' aggregate pending');s.s434Aggregate.pending=false;}
  s.drawState={ready:false,preparing:true};assert.equal(f.get().pending,true,provider+' draw preparing');
  s.drawState={ready:false,preparing:false,failure:'actual draw failure'};assert.equal(f.get(),undefined,provider+' draw failure');
  s.drawState={ready:true,preparing:false};s.announce('error');assert.equal(f.get(),undefined,provider+' failed visible path');
  s.announce('ready');assert.equal(f.get().pending,false,provider+' real success clears failure');
  for(const key of ['destroyed','suspended','pageHidden']){s[key]=true;assert.equal(f.get(),undefined,provider+' '+key);s[key]=false;}
  s.mode='2d';assert.equal(f.get(),undefined,provider+' 2D');s.mode='3d';
  const generationKey=REQUIRED.has(provider)?'requiredSolarCoverageGeneration':'publishedSolarCoverageGeneration';
  const boundsKey=REQUIRED.has(provider)?'requiredSolarCoverageBounds':'publishedSolarCoverageBounds';
  s[generationKey]=6;s[boundsKey]=undefined;
  assert.equal(f.get().canonical,undefined,provider+' missing stale bounds are not an empty witness');
  s[generationKey]=7;
  assert.deepEqual(f.get().canonical,{generation:7,kind:'empty'},provider+' private current-generation empty witness');
  assert.equal(s.renderer.residentVertexCount,3,'canonical-only nonempty geometry is independent of the detail envelope');
  f.controller.abort();
  assert.equal(f.get(),undefined,provider+' aborted request cannot reuse its staged ready ticket and cached drawable frame');
 }
});

test('actual draw adapters update ready tickets only at the current ready generation and remain pending during visible work',async()=>{
 for(const provider of PROVIDERS){
  const f=fixture(provider),s=f.scope;
  s.lastReadyTicket=11;s.lastReadyGeneration=6;s.visibleLoadsPending=1;
  const pending=f.drawn(),options=f.drawCalls[0];
  assert.equal(f.get().readyRequestRevision,11,provider+' before actual draw readiness');
  options.current();options.observe(observation('waiting'));
  assert.equal(f.get().readyRequestRevision,11,provider+' a waiting observation is not successful work');
  s.rendererGeneration=6;
  assert.equal(options.renderer().getDrawReadiness().ready,false,provider+' old drawable generation does not settle target');
  options.observe(observation());
  assert.equal(f.get().readyRequestRevision,11,provider+' wrong generation');
  s.rendererGeneration=7;
  assert.equal(options.renderer().getDrawReadiness().ready,true);
  options.observe(observation());
  assert.equal(f.get().readyRequestRevision,12,provider+' actual successful adapter observation');
  assert.equal(f.get().readyGeneration,7);
  assert.equal(f.get().pending,true,provider+' staged draw success cannot hide an unfinished visible request');
  f.draw.resolve();await pending;s.visibleLoadsPending=0;
  assert.equal(f.get().pending,false);
  const late=fixture(provider);late.scope.lastReadyTicket=11;late.scope.lastReadyGeneration=6;late.scope.visibleLoadsPending=1;
  const obsolete=late.drawn(),callback=late.drawCalls[0];late.scope.revision=13;
  assert.throws(()=>callback.current(),error=>error.name==='AbortError');
  callback.observe(observation());
  assert.equal(late.get().readyRequestRevision,11,provider+' late ticket must not sign revision 13');
  assert.equal(late.get().pending,true);
  late.draw.resolve();await obsolete;
 }
});

test('same-key root500 refresh executes the actual selection and cache registration before a new ready ticket',async()=>{
 const f=fixture('root500'),s=f.scope,sha=value=>value.repeat(64);
 const bindings={sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'fixture',
  materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')};
 const asset={path:'/safety/buildings3d/canonical.json',sha256:sha('2'),bytes:100};
 const index={schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'bremen',
  canonicalIndex:{path:'/safety/buildings3d/index.json',sha256:sha('1'),bytes:100},canonicalLeaf:{...asset,id:'leaf'},bindings,
  components:[{objectId:'osm/way/1',partId:'part/1',origin:[8.8,53.1],box:[0,0,0,1,1,1],protected:false}],
  near:{level:'near',asset,geometrySHA256:sha('a'),vertices:3,triangles:1},variants:[]};
 const runtime=createBuildingDetailRuntime({city:'bremen',resolveDetailIndex:async()=>undefined,
  readCanonical:async()=>{throw Error('cache fixture must not decode canonical data');},
  readBytes:async()=>{throw Error('cache fixture must not read an asset');},
  getDemands:()=>[{pass:'shadow',maxErrorCssPx:.5,maxErrorDrawingBufferPx:1,project:()=>({
   matrix:[.01,0,0,0,0,.01,0,0,0,0,.01,0,0,0,0,1],
   viewport:{cssWidth:100,cssHeight:100,drawingBufferWidth:100,drawingBufferHeight:100}})}]});
 const previous=runtime.select(index).resource,leaf={...asset,id:'leaf',tile_key:'leaf-key'},components=[];
 s.manifestSHA=sha('1');s.manifest={source_pbf_sha256:bindings.sourcePBFSHA256,city_boundary:{sha256:bindings.boundarySHA256},
  compiler_sha256:bindings.compilerSHA256,source_snapshot:bindings.sourceSnapshot};
 s.candidates=[leaf];s.detailBindings=new Map();s.adoptedDetailResources.set(leaf.tile_key,previous);
 s.options.detailRuntime={resolveDetailIndex:async()=>index,select:runtime.select,openSession:runtime.openSession};
 s.sourceResourceKey=(_leaf,detail)=>detail.resource.key;
 s.wantedSources.value=async()=>({components});s.bindSourceContent=()=>{};
 const selectStatement=statement('root500','visibleNow',callsDetailSelect);
 const selectAgain=evaluate('return async function(signal,ticket){'+selectStatement+'};',s);
 const shard=actual('root500','shard',s);
 s.visibleNow=async(signal,ticket,_activate,_notify,session)=>{
  s.session=session;await selectAgain(signal,ticket);
  const selected=s.detailBindings.get(leaf);
  assert.equal(selected.resource.key,previous.key,'this refresh keeps the same complete resource');
  await shard(leaf,signal,session,selected);
  session.validateBeforeAdopt({resourceKeys:[selected.resource.key]});
  session.adopt({generation:7,resourceKeys:[selected.resource.key]});
  s.publishedDetailResources.set(leaf.tile_key,selected.resource);
  await s.drawn(signal,ticket,f.target);
  session.settleReady({generation:7,ready:true});
  return s.announce('ready');
 };
 actual('root500','requestDetailRefresh',s)();
 assert.equal(f.get().pending,true);
 s.revision=13;
 const visible=actual('root500','visible',s),pending=visible(f.controller.signal,13);
 assert.equal(s.visibleLoadsPending,1,'the real wrapper marks pending before its first await');
 await until(()=>f.drawCalls.length===1);
 const selected=runtime.getBuildingDetailSelectionSnapshot().leaves[0];
 assert.equal(selected.resourceKey,previous.key);
 assert(selected.selections>=4,'selection loop, cache registration and adoption validation all execute the real selector');
 assert.equal(f.get().readyRequestRevision,12);
 assert.equal(f.get().pending,true);
 const options=f.drawCalls[0];options.current();options.renderer().getDrawReadiness();options.observe(observation());
 assert.equal(f.get().readyRequestRevision,13);
 assert.equal(f.get().pending,true,'actual visible finally has not completed');
 f.draw.resolve();await pending;
 assert.equal(s.visibleLoadsPending,0);
 assert.equal(f.get().pending,false);
 assert.equal(f.get().readyRequestRevision,13);
});

test('actual overview publishes complete empty only after drawn while a nonempty canonical-only source also has a valid empty detail envelope',async()=>{
 for(const provider of ['city','tier300']){
  const f=fixture(provider),s=f.scope;
  s.lastReadyTicket=11;s.lastReadyGeneration=7;s.overviewReleased=false;s.z=14;
  s.clearPreparedData=()=>{};s.clearSourceDemand=()=>{s.mainSourceLeases=[];s.publishedSolarCoverageGeneration=undefined;s.publishedSolarCoverageBounds=undefined;};
  s.ownerShapePatchMetadata=()=>({components:[]});s.partitions=undefined;
  const resultStatement=statement(provider,'visibleNow',node=>ts.isVariableStatement(node)&&
   node.declarationList.declarations.some(declaration=>declaration.name.getText()==='result'));
  const overview=statement(provider,'visibleNow',node=>ts.isIfStatement(node)&&
   ts.isBinaryExpression(node.expression)&&node.expression.left.getText()==='z'&&node.expression.right.getText()==='14.5');
  s.visibleNow=evaluate('return async function(signal,ticket,activate=false,notify=true){'+resultStatement+overview+'};',s);
  const visible=actual(provider,'visible',s),pending=visible(f.controller.signal,12);
  await until(()=>f.drawCalls.length===1);
  assert.equal(s.rendererGeneration,8);
  assert.equal(f.get().readyRequestRevision,11);
  assert.equal(f.get().canonical,undefined,provider+' queued empty batch is not a completed publication');
  assert.equal(f.get().pending,true);
  f.draw.resolve();await pending;
  assert.equal(f.get().readyRequestRevision,12);
  assert.equal(f.get().readyGeneration,8);
  assert.equal(f.get().pending,false);
  assert.deepEqual(f.get().canonical,{kind:'empty',generation:8},provider+' successful actual overview path');
  const failed=fixture(provider),b=failed.scope;
  b.lastReadyTicket=11;b.overviewReleased=true;b.z=14;
  b.visibleNow=evaluate('return async function(signal,ticket,activate=false,notify=true){'+resultStatement+overview+'};',b);
  const failure=Error('actual draw did not complete'),attempt=actual(provider,'visible',b)(failed.controller.signal,12);
  const rejected=assert.rejects(attempt,error=>error===failure);await until(()=>failed.drawCalls.length===1);
  failed.draw.reject(failure);await rejected;
  assert.equal(b.lastReadyTicket,11,provider+' failed draw cannot sign the current request');
 }
 const canonical=fixture('city'),s=canonical.scope;
 const lease={contentKey:'canonical-only',value:{components:[{objectId:'osm/way/1',partId:'part/1'}]},release(){}};
 s.sourceKeys=['canonical-only'];s.wantedSources.retain=()=>lease;
 s.publishSourceDemand();
 assert.equal(s.renderer.residentVertexCount,3);
 assert.equal(s.mainSourceLeases.length,1);
 assert.deepEqual(canonical.get().canonical,{generation:7,kind:'empty'},
  'actual current-generation publication with canonical-only source has no extra detail envelope');
});
