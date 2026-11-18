import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

// Execute the actual manager's shard/source-production/requestMode/destroy
// bodies with tiny rows and a runtime spy. Shard rows are produced by the
// actual wanted-source declaration over the real page resource store and
// wanted-lease adapter (the cache the manager now uses); the page native source
// client is a tiny verified leaf in that same store. Actual resource
// acquisition, reconstruction and reacquire belong to the separate
// runtime/core integration suite; no renderer is loaded.
const web=fileURLToPath(new URL('../',import.meta.url)),file=path.join(web,'src/painted/bremen/safety/three-dimensional-map.ts');
const source=await readFile(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
const functions=new Map(),variables=new Map(),destroyMethods=[];
(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node);if(ts.isVariableStatement(node))for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name)&&!variables.has(item.name.text))variables.set(item.name.text,node);if(ts.isMethodDeclaration(node)&&node.name.getText(ast)==='destroy')destroyMethods.push(node);ts.forEachChild(node,visit);})(ast);
for(const name of ['shard','loadSourceContent','sourceResourceKey','sourceContentKey','bindSourceContent','requestMode','clearSourceDemand','clearExplicitSources','clearFailedHandoff','restoreReadyHandoff','retireChunkInput'])assert(functions.has(name),'the actual manager declares '+name);
assert(variables.has('wantedSources'));assert.equal(destroyMethods.length,1);
const js=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const text=name=>functions.get(name).getText(ast);
const scope=values=>new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
// Several actual declarations evaluated together bind to each other lexically;
// every other free identifier reads and writes the fixture object.
const declare=(statements,result,values)=>Function('scope','with(scope){'+js(statements)+'\nreturn '+result+'}')(scope(values));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

const runtime=createSourceModules({allow:id=>['safety/viewport-request','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/program-preparation','safety/render-runtime/pressure-availability','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/diagnostic-snapshot'].includes(id)});
const {createWantedResourceLeases}=runtime.load('safety/viewport-request'),{createChunkResourceStore}=runtime.load('safety/render-runtime/chunk-resource-store'),{createResourceBudget,ResourceBudgetExceededError}=runtime.load('safety/render-runtime/resource-budget');
const pageStore=()=>createChunkResourceStore({budget:createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
const sourceDeclarations=[...['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard'].map(text),variables.get('wantedSources').getText(ast)].join('\n');

function shardFixture({profile=false,cacheHit=false,withRuntime=true,gateInfill=false}={}){
 const rows=[{city:'bremen',objectId:'fixture',partId:'part',componentGeometry:{type:'Polygon'},sourceFeature:{},batches:[]}],descriptor={id:'fixture',tile_key:'fixture',path:'/fixture',sha256:'verified',bytes:1,vertices:0};
 const calls=[],gates=[],infillCalls=[],nativeReleases=[],resources=pageStore(),wait=operation=>operation,control={gateInfill:false};
 const raw={schema_version:1,city:'bremen',components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:32}};
 const ownerRuntime=withRuntime?{prepare(){calls.push('runtime');}}:undefined;
 // The page native source client: the verified tiny leaf is a ready CPU parent
 // in the same page store, as createSharedNativeSourcePool provides it.
 const nativeSources={resources,ownerKey:'bremen:fixture-owner',async acquire(leaf,requestSignal,maxVertices,role){
   requestSignal.throwIfAborted();calls.push('fetch');assert.equal(leaf,descriptor);assert.equal(maxVertices,200000);assert.equal(role,'dependency');
   const parent=resources.acquire({contentKey:JSON.stringify(['fixture-native-leaf',leaf.tile_key,leaf.sha256]),role:'source',allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'exact'},produce:()=>({raw})});
   await parent.ready;let released=false;
   return{raw,verified:{fixture:true},physicalBytes:leaf.bytes,retainResource:held=>parent.retain(held),release(){if(released)return;released=true;nativeReleases.push(leaf.tile_key);parent.release();}};
  },destroy(){}};
 const values={resourceContentKey,ownerRuntime,resources,createWantedResourceLeases,ResourceBudgetExceededError,city:'bremen',maxVertices:200000,mobile:false,loadCount:0,
  manifestSHA:'manifest',manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',source_snapshot:'snapshot'},sourceOwnerKey:'bremen:fixture-owner',sourceDiagnostics:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),
  options:{awaitPaintInitialization:wait,nativeSources,...(withRuntime?{frozenData:{fixture:true}}:{})},
  prepareBremenInfillOwnerRouteModules:async(components,requestSignal,adapter)=>{if(!control.gateInfill)return;calls.push('infill-routes');assert.equal(components,rows);assert.equal(adapter,wait);requestSignal.throwIfAborted();const gate=deferred();gates.push(gate);infillCalls.push({components,signal:requestSignal,adapter});await gate.promise;},
  prepareOwnerF029Reconstruction:async()=>calls.push('F029'),prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async()=>calls.push('bulk70'),prepareNonBerlinOwnerRoutes:async()=>calls.push('city-routes'),prepareBremenOwnerReconstructionComponents:async()=>calls.push('canonical'),
  ownerShapePatchProfile:()=>{calls.push('profile-admission');return profile?{}:undefined;},verifyOwnerShapePatchRows:()=>calls.push('verify-profile'),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),
  shadowAdmissionForDecodedShard:()=>{calls.push('shadow-admission');},THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024,mobile:1024},estimateRetainedBuildingPayload:()=>{throw Error('no shadow payload in this fixture');},shadowByShard:new WeakMap(),sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:async()=>calls.push('source-role')};
 const actual=declare(sourceDeclarations,'{shard,wantedSources,sourceResourceKey,sourceContentKey}',values);
 const key=actual.sourceResourceKey(descriptor);
 const m={...actual,values,rows,descriptor,key,calls,gates,infillCalls,nativeReleases,resources,control,
  // The manager registers its wanted set before it reads any shard (visibleNow).
  want:()=>actual.wantedSources.reconcile([{leaf:descriptor,contentKey:key}]),
  // Demand changes (a newer request, overview or 2D) reconcile the wanted set.
  withdraw:()=>{actual.wantedSources.reconcile([]);return actual.wantedSources.keys;},
  get productions(){return values.loadCount;},
  content:()=>{const lease=actual.wantedSources.retain(key,'selected');try{return lease.value;}finally{lease.release();}},
  async warm(){m.want();assert.equal(await actual.shard(descriptor,signal()),rows);m.calls.length=0;},
 };
 m.ready=(async()=>{if(cacheHit)await m.warm();control.gateInfill=gateInfill;})();
 return m;
}
const settled=async m=>{await tick();await tick();return m.resources.stats.resources;};
// Raw source reads intentionally stop before owner CPU preparation. That work
// is exercised at the merged publication boundary in bremen-staged-batches.
for(const variant of [{name:'fresh ordinary'},{name:'fresh profile',profile:true},{name:'cache hit',cacheHit:true}]){
 test(`actual ${variant.name} shard keeps native caching independent of owner preparation`,async()=>{
  const m=shardFixture(variant);await m.ready;m.want();assert.equal(await m.shard(m.descriptor,signal()),m.rows);
  assert.equal(m.calls.includes('runtime'),false);assert.equal(m.calls.includes('F029'),false);
  assert.equal(m.calls.includes('canonical'),false,'reconstruction belongs to the merged batch');
  if(variant.cacheHit){assert.deepEqual(m.calls,[]);assert.equal(m.productions,1,'a live source content is reused, never produced again');}
  else{assert.deepEqual(m.calls.slice(0,3),['fetch','bulk70','city-routes']);assert.equal(m.productions,1);assert(m.calls.includes(variant.profile?'verify-profile':'shadow-admission'));}
  // The cached value is the provider-owned source content for this leaf.
  const value=m.content();assert.equal(value.components,m.rows);assert.equal(value.resourceKey,m.key);assert.equal(value.contentKey,m.sourceContentKey(m.descriptor));assert.equal(value.bytes,m.descriptor.bytes);assert.equal(value.retainedEstimateBytes,32);assert(m.values.sourceDiagnostics.has(m.key));
  assert.equal(m.values.sourceResourceByFeature.get(m.rows[0].sourceFeature),m.key);
  m.withdraw();assert.equal(await settled(m),0,'withdrawn demand disposes the content and returns its native leaf');assert.deepEqual(m.nativeReleases,['fixture']);
 });
 test(`actual ${variant.name} shard rejects cancellation before any source read or admission`,async()=>{
  const m=shardFixture(variant),controller=new AbortController();await m.ready;controller.abort();
  // A cancelled caller never registers demand or starts a read of its own.
  await assert.rejects(m.shard(m.descriptor,controller.signal),{name:'AbortError'});assert.deepEqual(m.calls,[]);assert.equal(m.productions,variant.cacheHit?1:0);
  assert.equal(await settled(m),variant.cacheHit?2:0,'a cancelled caller neither creates nor releases source content');
 });
 test(`actual ${variant.name} shard does not require an owner runtime to cache raw native rows`,async()=>{
  const m=shardFixture({...variant,withRuntime:false});await m.ready;m.want();assert.equal(await m.shard(m.descriptor,signal()),m.rows);assert.equal(m.calls.includes('runtime'),false);assert.equal(m.productions,1);assert.equal(m.calls.includes('fetch'),!variant.cacheHit);
 });
 test(`actual ${variant.name} infill route gate precedes downstream native admission`,async()=>{
  const m=shardFixture({...variant,gateInfill:true}),controller=new AbortController();await m.ready;m.want();let returned=false;
  const pending=m.shard(m.descriptor,controller.signal).then(value=>{returned=true;return value;});await tick();
  if(variant.cacheHit){
   // The live content was produced through the gate once; its immutable route
   // module code is prepared, so a hit returns without re-entering the gate.
   assert.equal(await pending,m.rows);assert.deepEqual(m.calls,[]);assert.equal(m.infillCalls.length,0);assert.equal(m.productions,1);return;
  }
  assert.deepEqual(m.calls,['fetch','infill-routes']);assert.equal(returned,false);assert.equal(m.productions,0);assert.equal(m.infillCalls.length,1);
  // The gate belongs to the shared store-owned production, not to one caller.
  assert.notEqual(m.infillCalls[0].signal,controller.signal);assert.equal(m.infillCalls[0].signal.aborted,false);
  m.gates[0].resolve();assert.equal(await pending,m.rows);assert.equal(m.calls.includes('runtime'),false);
  assert.equal(m.productions,1);assert.deepEqual(m.calls.slice(0,4),['fetch','infill-routes','bulk70','city-routes']);assert(m.calls.includes(variant.profile?'verify-profile':'shadow-admission'));
 });
 for(const outcome of ['cancel','failure'])test(`actual ${variant.name} ${outcome} at the infill gate prevents downstream admission`,async()=>{
  const m=shardFixture({...variant,gateInfill:true}),controller=new AbortController(),failure=Error('controlled infill preparation failure');await m.ready;m.want();
  const pending=m.shard(m.descriptor,controller.signal);
  if(variant.cacheHit){
   // A live hit has no gate left to cancel or fail: a cancelled caller is
   // rejected without touching the content, and otherwise the rows return.
   if(outcome==='cancel'){controller.abort();await assert.rejects(pending,{name:'AbortError'});}else assert.equal(await pending,m.rows);
   assert.deepEqual(m.calls,[]);assert.equal(m.productions,1);assert.equal(await settled(m),2,'the live content stays for its other consumers');return;
  }
  await tick();
  if(outcome==='cancel'){
   // The caller leaves and the request's demand is withdrawn: the shared
   // production is aborted at the gate before any downstream admission.
   controller.abort();await assert.rejects(pending,{name:'AbortError'});m.withdraw();assert.equal(m.infillCalls[0].signal.aborted,true,'withdrawn demand aborts the store-owned production');m.gates[0].resolve();
  }else{
   m.gates[0].reject(failure);
   // The store keeps a bounded copy of the producer failure, never its error graph.
   await assert.rejects(pending,error=>error!==failure&&error.message===failure.message&&error.name===failure.name);
  }
  await settled(m);assert.deepEqual(m.calls,['fetch','infill-routes']);assert.equal(m.productions,0);assert.deepEqual(m.nativeReleases,['fixture'],'the native leaf is returned exactly once');
  m.withdraw();assert.equal(await settled(m),0,'nothing is retained after the gate stops production');
 });
}
test('a cancelled caller at the infill gate detaches without stopping demanded production',async()=>{
 const m=shardFixture({gateInfill:true}),controller=new AbortController();await m.ready;m.want();const pending=m.shard(m.descriptor,controller.signal);await tick();
 controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(m.infillCalls[0].signal.aborted,false,'one caller cannot cancel production another view still demands');
 m.gates[0].resolve();await settled(m);assert.equal(m.productions,1);assert.deepEqual(m.calls.slice(0,4),['fetch','infill-routes','bulk70','city-routes']);
 m.calls.length=0;assert.equal(await m.shard(m.descriptor,signal()),m.rows);assert.deepEqual(m.calls,[],'the next caller reads the produced content');
});

function lifecycleFixture({withRuntime=true,previous='3d',failEnsure=false,layerExists=true}={}){
 const calls=[],failure=new Error('controlled prepare failure'),resources=pageStore();
 // One wanted source with a published main role, in the real page store.
 const wantedSources=createWantedResourceLeases({key:descriptor=>descriptor.contentKey,acquire:descriptor=>resources.acquire({contentKey:descriptor.contentKey,role:'source',allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'exact'},produce:()=>({components:[]}),dispose:()=>calls.push(['source-dispose',descriptor.contentKey])})});
 wantedSources.reconcile([{contentKey:'fixture-source'}]);const mainSourceLeases=new Map([['fixture-source',wantedSources.retain('fixture-source','main')]]);
 const renderer={layer:{id:'fixture-renderer'},setEnabled:value=>calls.push(['enabled',value]),suspendSelection:()=>calls.push(['suspend-selection']),setBatches:(rows,generation)=>calls.push(['batches',rows,generation]),getRevision:()=>({generation:values.generation}),destroy:()=>calls.push(['renderer-destroy'])};
 const ownerRuntime=withRuntime?{clearResident:()=>calls.push(['clear-resident']),dispose:()=>calls.push(['runtime-dispose'])}:undefined;
 const values={ownerRuntime,renderer,resources,wantedSources,mainSourceLeases,mainExplicitSources:new Map(),stagedExplicitSources:[],stagedExplicitGeneration:undefined,stagedExplicitCurrent:undefined,publishedExplicitGeneration:undefined,publishedContentKeys:['fixture-source'],
  destroyed:false,suspended:false,wantedMode:previous,mode:previous,revision:0,generation:0,preparingTicket:undefined,request:new AbortController(),recoveryResident:{invalidate:()=>calls.push(['recovery-invalidate'])},
  lastReadyGeneration:undefined,lastReadyState:undefined,lastHandoffGeneration:undefined,clearedHandoffTicket:undefined,adoptedDetailResources:new Map([['detail',{}]]),detailRefreshPending:false,
  modeRequests:{run:async(external,_threeD,operation)=>{external.throwIfAborted();return operation(new AbortController());},cancel:()=>calls.push(['mode-cancel'])},fetchLifetime:{abort:()=>calls.push(['fetch-abort'])},
  current:requestSignal=>requestSignal.throwIfAborted(),ensure:async()=>{calls.push(['ensure']);if(failEnsure)throw failure;},visible:async()=>({status:'ready'}),moveCamera:async()=>{},announce:status=>{calls.push(['announce',status]);return{status,mode:values.mode};},
  s434Aggregate:{clear:()=>calls.push(['aggregate-clear'])},releaseAggregatePrepared:()=>calls.push(['prepared-release']),ownerShapePatchMetadata:()=>({fixture:true}),clearRequiredSolarCoverage:()=>calls.push(['solar-coverage-clear']),
  options:{manageCamera:false,...(withRuntime?{frozenData:{fixture:true}}:{}),onNativeGroupDisplay:()=>calls.push(['native-display']),nativeSources:{destroy:()=>calls.push(['native-destroy'])}},
  partitions:{clear:()=>calls.push(['partition-clear'])},map:{off:()=>{},getLayer:()=>layerExists,removeLayer:()=>calls.push(['layer-remove']),triggerRepaint:()=>{}},moveStarted:()=>{},moved:()=>{},flushDetailRefresh:()=>{},
  facadeHelpers:{release:()=>calls.push(['facade-helpers-release'])},bootstrapRetained:{release:()=>calls.push(['bootstrap-release'])},visibleRetainedEstimateBytes:1,stagingRetainedEstimateBytes:1,selectedShardIds:['fixture'],lastError:undefined,ownerReconstruction:undefined};
 const actual=declare([...['requestMode','clearSourceDemand','clearExplicitSources'].map(text),'const destroy=({'+destroyMethods[0].getText(ast)+'}).destroy;'].join('\n'),'{requestMode,destroy}',values);
 return{...actual,calls,values,failure,resources,
  // The former per-manager cache is the page store: the wanted source and its
  // main role must both be gone, and the content disposed exactly once.
  async sourcesCleared(){await tick();assert.deepEqual(wantedSources.keys,[]);assert.equal(mainSourceLeases.size,0);assert.equal(resources.stats.resources,0);assert.deepEqual(calls.filter(([name])=>name==='source-dispose'),[['source-dispose','fixture-source']]);assert.deepEqual(values.publishedContentKeys,[]);}};
}
function assertEmptyBeforeClear(m){const empty=m.calls.findIndex(([name,rows])=>name==='batches'&&rows.length===0),clear=m.calls.findIndex(([name])=>name==='clear-resident');assert(empty>=0,'Actual manager must commit empty batches');assert(clear>empty,'Release owner resources only after the renderer no longer holds its rows');assert.equal(m.calls.filter(([name])=>name==='clear-resident').length,1);}
test('explicit 2D commits empty renderer batches before clearing the runtime resident set',async()=>{
 const m=lifecycleFixture();assert.equal((await m.requestMode('2d',signal())).status,'ready');assertEmptyBeforeClear(m);await m.sourcesCleared();assert.equal(m.values.mode,'2d');assert.equal(m.calls.some(([name])=>name==='runtime-dispose'),false);
 assert.equal(m.values.adoptedDetailResources.size,0);assert(m.calls.findIndex(([name])=>name==='clear-resident')<m.calls.findIndex(([name])=>name==='source-dispose'),'source content outlives the renderer rows it backed');
});
test('failed transition from 2D empties renderer batches before clearing owner resources',async()=>{
 const m=lifecycleFixture({previous:'2d',failEnsure:true});await assert.rejects(m.requestMode('3d',signal()),error=>error===m.failure);assertEmptyBeforeClear(m);assert.equal(m.values.mode,'2d');assert.equal(m.values.lastError,String(m.failure));
});
test('failed transition from an already active 3D mode preserves the resident runtime',async()=>{
 const m=lifecycleFixture({previous:'3d',failEnsure:true});await assert.rejects(m.requestMode('3d',signal()),error=>error===m.failure);assert.equal(m.values.mode,'3d');assert.equal(m.calls.some(([name])=>name==='clear-resident'||name==='batches'||name==='runtime-dispose'),false);
 assert.equal(m.resources.stats.resources,1,'the published source content stays resident');
});
test('2D without frozenData keeps the legacy empty-batch path and does not create a runtime scope',async()=>{
 const m=lifecycleFixture({withRuntime:false});await m.requestMode('2d',signal());assert(m.calls.some(([name,rows])=>name==='batches'&&rows.length===0));assert.equal(m.calls.some(([name])=>name==='clear-resident'||name==='runtime-dispose'),false);await m.sourcesCleared();
});
test('destroy removes the layer and destroys the renderer before disposing ownerRuntime exactly once',async()=>{
 const m=lifecycleFixture();m.destroy();m.destroy();const names=m.calls.map(([name])=>name);assert(names.indexOf('layer-remove')<names.indexOf('renderer-destroy'));assert(names.indexOf('renderer-destroy')<names.indexOf('runtime-dispose'));assert.equal(names.filter(name=>name==='runtime-dispose').length,1);assert.equal(names.filter(name=>name==='renderer-destroy').length,1);
 for(const name of ['facade-helpers-release','bootstrap-release','native-destroy','mode-cancel','fetch-abort'])assert.equal(names.filter(value=>value===name).length,1,name+' exactly once');
 await m.sourcesCleared();
});
test('destroy without frozenData preserves renderer cleanup without invoking a runtime',async()=>{
 const m=lifecycleFixture({withRuntime:false,layerExists:false});m.destroy();assert(m.calls.some(([name])=>name==='renderer-destroy'));assert.equal(m.calls.some(([name])=>name==='runtime-dispose'||name==='clear-resident'||name==='layer-remove'),false);await m.sourcesCleared();
});

function handoffFixture(state={}){
 // Spread, not parameter defaults: an explicit undefined must override.
 const {ticket,revision,lastHandoffTicket,lastHandoffGeneration,published,lastReadyGeneration}={ticket:4,revision:4,lastHandoffTicket:4,lastHandoffGeneration:7,published:7,lastReadyGeneration:6,...state};
 const calls=[],renderer={setEnabled:value=>calls.push(['enabled',value]),cancelCandidate:value=>calls.push(['cancel-candidate',value]),setBatches:(rows,generation)=>calls.push(['batches',rows,generation]),getRevision:()=>({generation:published})};
 const values={calls,renderer,revision,lastHandoffTicket,lastHandoffGeneration,lastReadyGeneration,lastReadyState:undefined,clearedHandoffTicket:undefined,generation:published,mode:'3d',adoptedDetailResources:new Map([['detail',{}]]),selectedShardIds:['fixture'],visibleRetainedEstimateBytes:1,
  s434Aggregate:{clear:()=>calls.push(['aggregate-clear'])},releaseAggregatePrepared:()=>calls.push(['prepared-release']),publishedContentKeys:['fixture-source'],clearRequiredSolarCoverage:()=>calls.push(['solar-coverage-clear']),ownerRuntime:{clearResident:()=>calls.push(['clear-resident'])},ownerShapePatchMetadata:()=>({fixture:true}),options:{onNativeGroupDisplay:()=>calls.push(['native-display'])}};
 const actual=declare([text('restoreReadyHandoff'),text('clearFailedHandoff')].join('\n'),'{clearFailedHandoff}',values);actual.clearFailedHandoff(ticket);return values;
}
test('actual renderer injection, stats and cleanup boundaries refer to the same conditional ownerRuntime',()=>{
 let declaration,rendererBinding,statsBinding;const clears=[];
 (function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='ownerRuntime')declaration=node.initializer;
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='module.createBuildingMeshRenderer')for(const argument of node.arguments)if(ts.isObjectLiteralExpression(argument))rendererBinding=argument.properties.find(property=>property.name?.getText(ast)==='ownerRuntime');
  if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='ownerRuntime'&&node.initializer.getText(ast)==='ownerRuntime?.stats')statsBinding=node;
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='ownerRuntime?.clearResident'){let ancestor=node.parent;while(ancestor&&!ts.isFunctionDeclaration(ancestor)&&!ts.isMethodDeclaration(ancestor))ancestor=ancestor.parent;clears.push(ancestor?.name?.getText(ast));}
  ts.forEachChild(node,visit);
 })(ast);
 assert(ts.isConditionalExpression(declaration));assert.equal(declaration.condition.getText(ast),'options.frozenData');assert.equal(declaration.whenTrue.getText(ast),'createBremenOwnerRuntime(options.frozenData)');assert.equal(declaration.whenFalse.getText(ast),'undefined');
 assert(rendererBinding&&ts.isShorthandPropertyAssignment(rendererBinding),'Actual renderer options must receive this same runtime');assert(statsBinding,'Actual cache stats must expose this runtime stats');
 // Besides explicit 2D and its failed-from-2D rollback, the only clear is the
 // failed handoff whose own non-ready candidate generation is already
 // published (visible() failure); overview/context paths preserve the runtime.
 assert.deepEqual(clears,['clearFailedHandoff','requestMode','requestMode'],'Only explicit 2D, its failed-from-2D rollback and a published failed handoff clear the runtime; overview/context paths must preserve it');
 const cleared=handoffFixture(),order=cleared.calls.map(([name])=>name);
 assert.deepEqual(cleared.calls[0],['cancel-candidate',7]);assert.equal(order.filter(name=>name==='clear-resident').length,1);assert(order.indexOf('batches')<order.indexOf('clear-resident'),'empty batches precede the runtime clear');assert.equal(cleared.mode,'2d');assert.equal(cleared.clearedHandoffTicket,4);assert.equal(cleared.adoptedDetailResources.size,0);
 for(const [reason,state] of [['a stale ticket',{revision:5}],['another handoff ticket',{lastHandoffTicket:3}],['no published handoff',{lastHandoffGeneration:undefined}],['an unpublished candidate',{published:6}],['the last ready generation',{lastReadyGeneration:7}]]){
  const kept=handoffFixture(state);assert.equal(kept.calls.some(([name])=>name==='clear-resident'||name==='batches'),false,reason+' preserves the resident runtime');assert.equal(kept.clearedHandoffTicket,undefined,reason);
 }
 // The context-loss rejection is rethrown before the failed-handoff clear.
 const visible=text('visible');assert(visible.indexOf('instanceof ChunkResourceContextLostError')>=0&&visible.indexOf('instanceof ChunkResourceContextLostError')<visible.indexOf('clearFailedHandoff(ticket)'),'context loss never reaches the failed-handoff clear');
});


test('retiring a Bremen aggregate clears its fulfilled preparation and consumer fields before the last manager pin',()=>{
 let releaseNode;(function visit(node){if(ts.isFunctionExpression(node)&&node.name?.text==='releaseCachedPrepared')releaseNode=node;ts.forEachChild(node,visit);})(ast);assert(releaseNode);
 const rows=[{}];let chunkReleases=0;
 const cached={input:rows,source:rows,sourceLoaded:new Map([['row',{}]]),components:rows,stats:{components:rows},chunkInput:{groups:[]},releaseChunkDependencies:()=>{chunkReleases++;assert.equal(values.cachedPrepared,undefined,'the consumer field is cleared before chunk dependencies leave');assert.equal(cached.chunkInput,undefined);}},values={cached,cachedReleased:false,cachedPrepared:cached,preparedPromise:Promise.resolve(cached),lastPackedComponents:rows,lastPackedAggregateProfile:{},lastPackedAggregateDiagnostic:'old'};let releases=0;
 values.releasePin=()=>{releases++;assert.equal(chunkReleases,1,'renderer chunk dependencies are returned before the last pin');assert.equal(values.cachedPrepared,undefined);assert.equal(values.preparedPromise,undefined);assert.equal(values.lastPackedComponents,undefined);assert.equal(values.lastPackedAggregateProfile,undefined);assert.equal(values.lastPackedAggregateDiagnostic,'');assert.equal(cached.input,undefined);assert.deepEqual(cached.source,[]);assert.equal(cached.sourceLoaded.size,0);assert.deepEqual(cached.components,[]);assert.deepEqual(cached.stats.components,[]);assert.equal(rows.length,1,'another pinned consumer retains its array alias');};
 const release=declare(text('retireChunkInput')+'\nconst release=('+releaseNode.getText(ast)+');','release',values);values.releaseAggregatePrepared=release;release();release();assert.equal(releases,1);assert.equal(chunkReleases,1);assert.notEqual(values.releaseAggregatePrepared,release);
 cached.releaseChunkDependencies();assert.equal(chunkReleases,1,'the retired chunk input keeps no release callback');
});
