import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

// Actual manager functions, tiny synthetic native shards and the real existing
// continuation/scope. No provider data graph, model asset, browser or GPU loads.
// Source residency is the manager's wanted-source leases on a real page chunk store
// (no decoded cache Map): the actual wantedSources initializer, loadSourceContent,
// shard, sourceChunkInput and clearSourceDemand run against the real store and the
// real createWantedResourceLeases. The tiny native client owns one real store
// resource per shard, which the source production retains as its parent.
const base=new URL('../src/painted/infill/safety/',import.meta.url),source=await readFile(new URL('three-dimensional-map.ts',base),'utf8');
const ast=ts.createSourceFile('infill-manager.ts',source,ts.ScriptTarget.Latest,true),nodes=[];
(function visit(node){nodes.push(node);ts.forEachChild(node,visit);})(ast);
const factory=nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='installThreeDimensionalMap');
// Manager-level declarations only (a nested block may reuse a local name for another value).
const fn=name=>{const node=factory.body.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,'infill manager declares '+name);return node;};
const declaration=name=>{const node=factory.body.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)===name));assert(node,'infill manager declares '+name);return node;};
const statement=text=>{const node=factory.body.statements.find(node=>ts.isExpressionStatement(node)&&node.getText(ast)===text);assert(node,'infill manager runs '+text);return node;};
const returned=factory.body.statements.find(node=>ts.isReturnStatement(node)&&ts.isObjectLiteralExpression(node.expression));
const method=name=>{const node=returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);assert(node,'infill manager returns '+name);return node;};
const compile=(text,module=ts.ModuleKind.None)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module}}).outputText;
// Every free identifier must be supplied by the fixture or be a real global: a new free
// binding in an extracted production function fails at its lookup instead of reading undefined.
function evaluate(text,ctx){return Function('env','with(env){'+compile(text)+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>{if(typeof key==='symbol')return key===Symbol.unscopables?undefined:target[key];if(key in target)return target[key];if(key in globalThis)return globalThis[key];throw new ReferenceError('unbound free identifier in extracted infill manager: '+key);},set:(target,key,value)=>(target[key]=value,true)}));}
// Shared modules load with their real relative imports (the scope charges the page
// ledger); nothing beyond these runtime modules may be reached.
const detailRuntimeModules=['safety/building-detail-runtime','safety/building-detail-demand','safety/projected-detail-policy',
 'safety/building-detail-residency','safety/building-detail-source','safety/bounded-3d-gzip','safety/building-payload-cost',
 'safety/building-detail-groups','safety/resource-byte-transport'];
const runtime=createSourceModules({allow:id=>[...detailRuntimeModules,'safety/frozen-data-scope','safety/reconstruction-resource-parents','safety/render-runtime/resource-budget','safety/viewport-request','painted/infill/safety/three-dimensional-viewport','painted/root500/safety/three-dimensional-viewport','safety/render-runtime/chunk-resource-store','safety/render-runtime/program-preparation','safety/render-runtime/pressure-availability','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/diagnostic-snapshot'].includes(id)});
const shared=async id=>runtime.load(id);
const {StaleBuildingDetailDemandError}=await shared('safety/building-detail-runtime');
const {createFrozenDataScope}=await shared('safety/frozen-data-scope'),{runAbortableReaders,createViewportRequestContinuation,createPreparedConsumerLifetime,createWantedResourceLeases}=await shared('safety/viewport-request');
const viewport=await shared('painted/infill/safety/three-dimensional-viewport'),stores=await shared('safety/render-runtime/chunk-resource-store'),budgets=await shared('safety/render-runtime/resource-budget');
const ref={canonicalSHA256:'a'.repeat(64),file:'tiny-infill-manager-fixture.ts',occurrence:0,codec:'json'},tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}
function row(id,origin=[.5,.5]){return{city:'frankfurt',objectId:'osm/way/'+id,partId:'part/'+id,origin,sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4]}]};}
function dataClient(events,onRelease){const active=new Set(),stats={acquires:0,releases:0,disposals:0};return{active,stats,async acquire(_ref,signal){signal.throwIfAborted();stats.acquires++;const value={tiny:true};active.add(value);let released=false;return{borrow:read=>read(value),release(){if(released)return;released=true;onRelease?.();active.delete(value);stats.releases++;events.push('lease.release');}};},dispose(){assert.equal(active.size,0);stats.disposals++;events.push('client.dispose');}};}
// Manager-level declarations evaluated verbatim, in factory order. The remaining manager
// state (mode, revision, generation, request, counters, renderer, map...) lives on ctx.
const DECLARATIONS=['pageHidden','modeRequests','residentPreparation','lastPackedComponents','preparedConsumers','sourceDiagnostics','mainSourceLeases','wantedSources','mainExplicitSources','stagedExplicitSources','sourceContentByFeature','publishedContentKeys','latestDrawTarget','publishedDetailResources','publishedDetailGeneration','detailDemand','moveStarted','moved'];
const FUNCTIONS=['retirePreparedBatches','clearPreparedBatches','keepPreparedBatches','clearExplicitSources','stageExplicitSources','explicitSourceMatches','synchronizePublishedExplicitSources','clearSourceDemand','sourceContentKey','sourceResourceKey','bindSourceContent','sourceResourceKeys','publishedSourceContent','retireChunkInput','sourceAbsentDisplay','sourceChunkDemand','sourceChunkInput','current','rememberPublishedDetails','restorePublishedDetails','loadSourceContent','shard','clearFailedHandoff','visible','visibleNow','requestMode','clearRequiredSolarCoverage','setWorkHidden'];
const moduleFunction=name=>{const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert(node,'infill manager module declares '+name);return node.getText(ast);};
const managerBody=(()=>{const wanted=new Set([...DECLARATIONS.map(declaration),...FUNCTIONS.map(fn),statement('modeRequests.setHidden(pageHidden);')]);return [moduleFunction('sameStageComponents'),...factory.body.statements.filter(node=>wanted.has(node)).map(node=>node.getText(ast))].join('\n');})();
function fixture({initialHidden=false}={}){
 const events=[],reads=[],roleCalls=[],preparations=[],publications=[],scopes=[],pins=new Map(),nativeLeases=new Set();let resident,enabled=false,hidden=initialHidden,h;
 const data=dataClient(events,()=>{if(ctx.expectClearedOnFinalRelease){assert.equal(h.state().residentPreparation,undefined);assert.equal(h.state().managerRelease,false);assert.equal(h.state().preparedAdmissionKey,undefined);assert.equal(h.state().lastPackedViewKey,undefined);}}),inside=row(1),outside=row(2,[10,10]),owner=row(3),normalRows=[inside,outside],ownerRows=[owner];
 const descriptors=[{id:'normal',tile_key:'normal',path:'tiny-normal',sha256:'b'.repeat(64),bytes:20,vertices:6,bbox:[0,0,11,11],lod:1},{id:'owner',tile_key:'owner',path:'tiny-owner',sha256:'c'.repeat(64),bytes:20,vertices:3,bbox:[0,0,1,1],lod:1}];
 const rawByPath=new Map([['tiny-normal',{schema_version:1,city:'frankfurt',components:normalRows,decodedPayloadCost:{retainedPayloadEstimateBytes:256}}],['tiny-owner',{schema_version:1,city:'frankfurt',components:ownerRows,decodedPayloadCost:{retainedPayloadEstimateBytes:128}}]]);
 const store=stores.createChunkResourceStore({budget:budgets.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 // Tiny page native client: one verified read per acquisition, held as one real store
 // resource whose dependency role is the source production's parent.
 const native={ownerKey:'tiny-infill-owner',resources:store,async acquire(asset,signal,_vertexCap,role='dependency'){signal.throwIfAborted();reads.push(asset.path);events.push('read '+asset.path);if(ctx.readGate){const gate=ctx.readGate;ctx.readGate=undefined;await gate.promise;}signal.throwIfAborted();
   const raw=rawByPath.get(asset.path),lease=store.acquire({contentKey:'tiny-native:'+asset.path+':'+reads.length,role,allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'estimate',label:'tiny native source'},produce:()=>({raw}),costs:value=>({category:'metadata',bytes:64,precision:'estimate',identity:value}),dispose(){events.push('native.dispose');}});
   await lease.ready;nativeLeases.add(lease);let released=false;return{contentKey:lease.contentKey,role,raw,verified:{},physicalBytes:20,get released(){return released;},retainResource:next=>lease.retain(next??'dependency'),release(){if(released)return;released=true;nativeLeases.delete(lease);lease.release();events.push('native.release');}};},
  setCached(){},destroy(){events.push('native.destroy');}};
 const renderer={layer:{id:'tiny-infill'},async prepareBatches(rows,signal,scope,wait,admission,demand,chunkInput){events.push('owner.prepare');preparations.push({rows:[...rows],signal,scope,admission,demand,chunkInput});scopes.push(scope);await scope.prepare([ref],signal);
   // The renderer's chunk input retains each group's source parent until the preparation retires.
   const dependencies=(chunkInput?.groups??[]).flatMap(group=>group.parents.map(parent=>parent.retain('dependency')));
   const prepared={input:[...rows],scope,sourceComponents:rows,displayComponents:rows,reconstructed:{components:rows,stats:{objects:0,components:[]}},originalSourceVertices:3,originalSourceIndices:3,chunkInput,releaseChunkDependencies(){for(const lease of dependencies.splice(0))lease.release();}};preparations.at(-1).prepared=prepared;preparations.at(-1).dependencies=dependencies;if(ctx.prepareGate){const gate=ctx.prepareGate;ctx.prepareGate=undefined;await gate.promise;}return prepared;},setBatches(...args){const incoming=args.at(-1);if(incoming?.scope){incoming.signal?.throwIfAborted();events.push('publish');if(!pins.has(incoming.scope))pins.set(incoming.scope,incoming.scope.retain());if(ctx.failPublish)throw Error('tiny renderer publication failure');for(const [scope,release]of pins)if(scope!==incoming.scope){pins.delete(scope);release();}resident=incoming;publications.push(args);}else{events.push('renderer.empty');resident=undefined;for(const release of pins.values())release();pins.clear();}},setEnabled(value){enabled=value;events.push('enabled '+value);},setPageHidden(value){hidden=value;events.push('hidden '+value);},isPickReady:()=>enabled&&!hidden&&ctx.pickReady!==false,getDrawReadiness:()=>({ready:enabled&&!hidden}),suspendSelection(){},cancelCandidate(generation){events.push('renderer.cancel '+generation);},getRevision:()=>({generation:ctx.generation}),getComponent:()=>undefined,get residentVertexCount(){return resident?3:0;},destroy(){events.push('renderer.destroy');resident=undefined;for(const release of pins.values())release();pins.clear();}};
 const bounds={getWest:()=>ctx.viewBounds[0],getSouth:()=>ctx.viewBounds[1],getEast:()=>ctx.viewBounds[2],getNorth:()=>ctx.viewBounds[3]},selection=base=>({candidates:base,viewportRows:(_raw,visible)=>[...visible],priority:()=>0,reserveAfter:()=>({vertices:0,bytes:0}),note(){},diagnostic:()=>({})});
 const ctx={focusState:undefined,StaleBuildingDetailDemandError,resourceContentKey,events,options:{frozenData:data,nativeSources:native,manageCamera:false,awaitPaintInitialization:value=>value,onNativeGroupDisplay(){events.push('native.plan.publish');}},createFrozenDataScope,runAbortableReaders,createViewportRequestContinuation,createPreparedConsumerLifetime,createWantedResourceLeases,ChunkResourceContextLostError:stores.ChunkResourceContextLostError,ResourceBudgetExceededError:budgets.ResourceBudgetExceededError,pageIsHidden:()=>initialHidden,city:'frankfurt',mobile:false,maxVisible:128,maxBytes:8*1024**2,maxVertices:200000,nativeAdmissionVertexLimit:200000,
  mode:'3d',wantedMode:'3d',destroyed:false,suspended:false,revision:1,generation:0,active:0,peak:0,request:new AbortController(),manifest:{shards:descriptors,source_pbf_sha256:'pbf',source_snapshot:'source',compiler_sha256:'compiler',city_boundary:{sha256:'boundary'}},manifestSHA:'manifest',boundary:{},partitions:undefined,
  map:{getZoom:()=>ctx.zoom,getBounds:()=>bounds,getCenter:()=>({lng:ctx.center[0],lat:ctx.center[1]}),getCanvas:()=>({clientWidth:800,clientHeight:600}),getPitch:()=>30,getVerticalFieldOfView:()=>40,isMoving:()=>false,triggerRepaint(){},off(){},getLayer:()=>false,removeLayer(){}},viewBounds:[0,0,1,1],center:[.5,.5],zoom:16,
  renderer,resources:store,sourceOwnerKey:'infill:frankfurt:tiny',sourceAbsentPatches:[],F154_RECONSTRUCTION_SHA:'tiny-f154',visibleRetainedEstimateBytes:0,stagingRetainedEstimateBytes:0,stagingTicket:0,loadCount:0,partial:false,duplicatePackSkips:0,selectedShardIds:[],visibleLoadsPending:0,detailRefreshPending:false,preparingTicket:undefined,cameraMotionTicket:undefined,ownCameraStartingTicket:undefined,lastError:undefined,drawReadiness:undefined,requiredSolarCoverageBounds:undefined,requiredSolarCoverageGeneration:undefined,lastRegistered:undefined,lastReadyGeneration:undefined,clearedFailedTicket:-1,publishedManagerState:undefined,currentNativeGroupDisplay:undefined,sourceEdgeAssemblyDisplay:{groups:[],errors:[]},ownerReconstruction:{components:[]},adoptedDetailResources:new Map(),
  sourceLeafByFeature:new WeakMap(),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),retainedComponentCost:new WeakMap(),shadowByShard:new WeakMap(),THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:32*1024**2,mobile:16*1024**2},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:128}),
  sourceRoles:new WeakMap(),sourceRoleDisplayProfile:c=>ctx.sourceRoles.get(c)??null,ownerShapePatchProfiles:()=>[],ownerShapePatchProfile:path=>path==='tiny-owner'?{number:'tiny'}:undefined,verifyOwnerShapePatchRows(){},ownerShapePatchDisplayRows:rows=>rows,ownerShapePatchMetadata:()=>({components:[]}),shadowAdmissionForDecodedShard:()=>undefined,
  modelHeightQuery:()=>({matches:true,verified:true}),prepareS434CohortSelection:selection,prepareF288CohortSelection:selection,prepareFrankfurtCohortSelection:selection,...viewport,buildingDetailSolarCoverageBounds:()=>{throw Error('tiny fixture has no detail resources');},
  // The F154 parent binding has its own production-level test (infill-f154-scope-integration);
  // these rows carry no F154 identity, so the manager's call is observed, not re-executed.
  bindDerivedChunkInput(prepared,rows){assert.strictEqual(rows,prepared.displayComponents);events.push('derived.bind');},
  prepareSourceRoleDisplay:async(rows,leaf,signal)=>{signal.throwIfAborted();roleCalls.push({rows:[...rows],leaf});events.push('roles.prepare');},nativePartDisplayPlan:()=>{events.push('native.plan');return{hiddenOutlines:[],groups:[],errors:[]};},verifiedInteriorSourceHolds:()=>[],sourceEdgeAssemblyDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),s020RelationOutlineDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),
  NATIVE_PART_DISPLAY_PROFILES:[],SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES:[],S020_RELATION_OUTLINE_PROFILES:[],progressiveAdmission:()=>undefined,s020FullOriginalBatchRouteReady:()=>false,mergeShadowAdmissions:()=>undefined,partialGateDisplayPlan:()=>undefined,s402ConnectorPlan:()=>undefined,s036NorthCofacePlan:()=>undefined,s240BaseCofacePlan:()=>undefined,f151CrownPlan:()=>undefined,
  s434Aggregate:{pending:false,packing:()=>undefined,update(_rows,options){ctx.aggregateCallback=options.onChange;if(ctx.failAggregate)throw Error('tiny aggregate publication failure');},clear(){ctx.aggregateCallback=undefined;events.push('aggregate.clear');}},recoveryResident:{invalidate(){events.push('recovery.invalidate');},complete(){events.push('recovery.complete');},suspend:()=>false,reuse:()=>false},
  containsPosition:()=>true,flushDetailRefresh(){},facadeHelpers:undefined,bootstrapRetained:undefined,drawn:async()=>{},ensure:async()=>events.push('ensure'),announce:status=>({mode:ctx.mode,status}),location:{search:'?review303'},performance:{now:()=>1000},
 };
 h=evaluate(`${managerBody}\nreturn{run:()=>visible(request.signal,revision),requestMode,moved,${['setPageHidden','setViewportVisible','suspend','resume','destroy'].map(name=>method(name).getText(ast)).join(',')},state:()=>({documentHidden,viewportVisible,pageHidden,residentPreparation,preparedAdmissionKey,lastPackedComponents,lastPackedViewKey,managerRelease:!!releaseResidentPreparation,wantedKeys:wantedSources.keys}),sourceKey:id=>sourceResourceKey(manifest.shards.find(leaf=>leaf.id===id)),sourceValue:id=>wantedSources.value(sourceResourceKey(manifest.shards.find(leaf=>leaf.id===id)))};`,ctx);
 return{h,ctx,events,reads,roleCalls,preparations,publications,scopes,data,store,nativeLeases,inside,outside,owner,pins,get resident(){return resident;},get enabled(){return enabled;},get hidden(){return hidden;}};
}

test('infill manager prepares complete admitted physical source roles while preserving the small visible request before native plans',async()=>{
 const f=fixture();await f.h.run();assert.equal(f.reads.length,2);assert.equal(f.h.state().wantedKeys.length,2,'both admitted leaves are wanted page-store sources');assert((await f.h.sourceValue('normal')).components.includes(f.outside),'the wanted source keeps the whole verified leaf');assert.deepEqual(f.roleCalls,[{rows:[f.inside,f.outside],leaf:'b'.repeat(64)}],'source-role preparation covers the complete activated canonical leaf');assert.deepEqual(f.roleCalls.map(call=>({...call,rows:call.rows.filter(row=>f.preparations[0].rows.includes(row))})),[{rows:[f.inside],leaf:'b'.repeat(64)}],'the visible request still contains only its original admitted source-role row');assert.deepEqual(f.preparations[0].rows,[f.owner,f.inside]);assert(f.preparations[0].chunkInput.groups.some(group=>group.components.includes(f.inside)&&group.components.includes(f.outside)),'the same authoritative physical group owns inside and offscreen source rows');assert(!fn('shard').getText(ast).includes('prepareSourceRoleDisplay'));assert(f.events.indexOf('roles.prepare')<f.events.indexOf('native.plan'));// Native/material gates consume the prepared batch's own closed admission and scope (HEAD and
 // current visibleNow: nativePartDisplayPlan runs inside prepareCommit's publish), so the order is
 // admitted physical source roles -> visible owner request -> native plan.
 assert(f.events.indexOf('roles.prepare')<f.events.indexOf('owner.prepare'));assert(f.events.indexOf('owner.prepare')<f.events.indexOf('native.plan'));f.h.destroy();assert.equal(f.data.active.size,0);await tick();assert.equal(f.nativeLeases.size,0,'destroy returns every native source lease');assert.equal(f.store.stats.resources,0,'no source or native resource outlives the destroyed manager');
});

test('infill manager hidden intent starts no work and resumes its sole continuation on show',async()=>{
 const f=fixture({initialHidden:true});f.ctx.mode='2d';f.ctx.wantedMode='2d';const intent=f.h.requestMode('3d',new AbortController().signal);await tick();assert.equal(f.reads.length,0);assert.equal(f.preparations.length,0);assert.equal(f.publications.length,0);assert.equal(f.ctx.wantedMode,'3d');f.h.setPageHidden(false);await intent;assert.equal(f.preparations.length,1);assert.equal(f.publications.length,1);assert.equal(f.ctx.mode,'3d');assert.equal(f.h.state().pageHidden,false);f.h.destroy();
});

test('infill manager hide cancels an active viewport without losing mode intent or publishing its late native result',async()=>{
 const f=fixture(),gate=deferred();f.ctx.mode='2d';f.ctx.wantedMode='2d';f.ctx.manifest.shards=f.ctx.manifest.shards.slice(0,1);f.ctx.readGate=gate;const intent=f.h.requestMode('3d',new AbortController().signal);await tick();assert.equal(f.reads.length,1);const before=f.ctx.revision;f.h.setPageHidden(true);assert.equal(f.ctx.revision,before+1);assert.equal(f.ctx.request.signal.aborted,true);assert.equal(f.enabled,false);assert.equal(f.ctx.wantedMode,'3d');gate.resolve();await tick();await tick();assert.equal(f.preparations.length,0);assert.equal(f.publications.length,0);assert.equal(f.reads.length,1);f.h.moved();await tick();assert.equal(f.reads.length,1);f.h.setPageHidden(false);await intent;assert.equal(f.publications.length,1);assert.equal(f.preparations.length,1);f.h.destroy();
});

test('infill manager reuses exact preparation across visible tasks and skips packing only with the full view key',async()=>{
 const f=fixture();await f.h.run();const first=f.h.state().residentPreparation;assert.equal(first.scope.stats.pins,2);await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,1);assert.equal(f.ctx.duplicatePackSkips,1);assert.equal(f.h.state().residentPreparation,first);
 f.ctx.center=[.6,.5];await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,2);assert.equal(f.h.state().residentPreparation,first);
 f.ctx.manifest.shards[0].id='normal-renamed';await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,3);
 f.ctx.renderer.selected={objectId:'osm/way/1',partId:'part/1'};await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,4);
 f.ctx.sourceRoles.set(f.inside,{role:'newly-ready'});await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,5);
 f.ctx.viewBounds=[0,0,1.1,1];await f.h.run();assert.equal(f.preparations.length,2);assert.equal(f.publications.length,6);assert.equal(first.scope.stats.disposed,true);assert.equal(f.data.active.size,1);f.h.destroy();
});

test('infill manager keeps the published preparation and drops only the failed publication snapshot while preserving renderer partial-generation pins',async()=>{
 for(const partial of [false,true]){
  const f=fixture();await f.h.run();const first=f.h.state().residentPreparation;f.ctx.viewBounds=[0,0,1.1,1];if(partial)f.ctx.failPublish=true;else f.ctx.failAggregate=true;await assert.rejects(f.h.run(),partial?/tiny renderer publication failure/:/tiny aggregate publication failure/);const next=f.scopes.at(-1);
  // HEAD clearFailedHandoff: a candidate that failed before its draw target registered never
  // replaced the published generation, so the manager keeps the published preparation and its
  // packed state (renderer pin + manager pin) and drops only the failed snapshot and aggregate.
  const kept=f.h.state();assert.strictEqual(kept.residentPreparation,first,'the published preparation stays resident');assert.notEqual(kept.residentPreparation.scope,next);assert.equal(kept.managerRelease,true);assert.notEqual(kept.preparedAdmissionKey,undefined);assert.notEqual(kept.lastPackedComponents,undefined);assert.equal(f.ctx.aggregateCallback,undefined);assert.equal(first.scope.stats.pins,2);assert.equal(first.scope.stats.disposed,false);assert.equal(next.stats.ownerReleased,true);assert.equal(next.stats.pins,partial?1:0);assert.equal(next.stats.disposed,!partial);assert.equal(f.pins.size,partial?2:1);f.h.destroy();assert.equal(f.data.active.size,0);
 }
});

test('infill manager overview and 2D drop prepared references before their final pin release',async()=>{
 for(const overview of [false,true]){
  const f=fixture();await f.h.run();const prepared=f.h.state().residentPreparation;assert.equal(f.data.active.size,1);f.ctx.expectClearedOnFinalRelease=true;const unpin=f.pins.get(prepared.scope);f.pins.set(prepared.scope,()=>{assert.equal(f.h.state().residentPreparation,prepared);unpin();});
  if(overview){f.ctx.zoom=14;await f.h.run();}else await f.h.requestMode('2d',new AbortController().signal);
  assert.equal(f.h.state().residentPreparation,undefined);assert.equal(f.h.state().lastPackedViewKey,undefined);assert.equal(prepared.scope.stats.disposed,true);assert.equal(f.data.active.size,0);assert.equal(f.h.state().wantedKeys.length,overview?2:0,'overview keeps the wanted sources; 2D clears the source demand');f.h.destroy();
 }
});


test('infill manager hidden resident keeps CPU pins but rejects aggregate repacks and refreshes once on show',async()=>{
 const f=fixture();await f.h.run();const prepared=f.h.state().residentPreparation,count=f.publications.length;f.h.setPageHidden(true);f.ctx.aggregateCallback('invalidated');assert.equal(f.publications.length,count);assert.equal(f.preparations.length,1);assert.equal(f.h.state().residentPreparation,prepared);assert.equal(prepared.scope.stats.pins,2);assert.equal(prepared.scope.stats.disposed,false);assert.equal(f.enabled,false);
 const refreshed=deferred();f.ctx.drawn=async()=>refreshed.resolve();f.h.setPageHidden(false);await refreshed.promise;await tick();assert.equal(f.h.state().residentPreparation,prepared);assert.equal(f.preparations.length,1);assert.equal(f.publications.length,count);assert.equal(f.ctx.duplicatePackSkips,1);assert.equal(f.enabled,true);
 const generation=f.ctx.generation;f.ctx.wantedMode='2d';f.ctx.aggregateCallback('invalidated');assert.equal(f.publications.length,count);assert.equal(f.ctx.generation,generation);await f.h.requestMode('2d',new AbortController().signal);assert.equal(f.h.state().residentPreparation,undefined);assert.equal(prepared.scope.stats.disposed,true);assert.equal(f.data.active.size,0);f.h.destroy();
});


test('infill manager combines document and viewport visibility without recovery overriding an offscreen pause',async()=>{
 const f=fixture();await f.h.run();const prepared=f.h.state().residentPreparation,counts=[f.preparations.length,f.publications.length,f.roleCalls.length],flags=()=>{const s=f.h.state();return[s.documentHidden,s.viewportVisible,s.pageHidden];};
 f.h.setViewportVisible(false);assert.deepEqual(flags(),[false,false,true]);f.h.setPageHidden(true);assert.deepEqual(flags(),[true,false,true]);f.h.setPageHidden(false);assert.deepEqual(flags(),[false,false,true]);await tick();assert.deepEqual([f.preparations.length,f.publications.length,f.roleCalls.length],counts);
 f.h.suspend({contextRecovery:true});f.h.resume({contextRecovery:true});assert.deepEqual(flags(),[false,false,true]);await tick();assert.deepEqual([f.preparations.length,f.publications.length,f.roleCalls.length],counts);assert.equal(f.h.state().residentPreparation,prepared);assert.equal(prepared.scope.stats.pins,2);
 f.h.setPageHidden(true);f.h.setViewportVisible(true);assert.deepEqual(flags(),[true,true,true]);await tick();assert.deepEqual([f.preparations.length,f.publications.length,f.roleCalls.length],counts);
 const refreshed=deferred();f.ctx.drawn=async()=>refreshed.resolve();f.h.setPageHidden(false);await refreshed.promise;await tick();assert.deepEqual(flags(),[false,true,false]);assert.equal(f.preparations.length,counts[0]);assert.equal(f.publications.length,counts[1]);assert.equal(f.roleCalls.length,counts[2]+1);assert.equal(f.ctx.duplicatePackSkips,1);assert.equal(f.h.state().residentPreparation,prepared);f.h.destroy();assert.equal(f.data.active.size,0);
});


test('infill replacement clears the retired preparation object without mutating its still-pinned display aliases',async()=>{
 const f=fixture();await f.h.run();const old=f.h.state().residentPreparation,sourceAlias=old.sourceComponents,displayAlias=old.displayComponents,capturePin=old.scope.retain();f.ctx.viewBounds=[0,0,1.1,1];await f.h.run();assert.deepEqual(old.input,[]);assert.deepEqual(old.sourceComponents,[]);assert.deepEqual(old.displayComponents,[]);assert.deepEqual(old.reconstructed.components,[]);assert.equal(sourceAlias.length,2);assert.equal(displayAlias.length,2);assert.equal(old.scope.stats.disposed,false);assert.equal(old.scope.stats.pins,1);capturePin();assert.equal(old.scope.stats.disposed,true);f.h.destroy();assert.equal(f.data.active.size,0);
});

test('infill superseded CPU completion clears the fulfilled payload and cannot replace the current resident generation',async()=>{
 const f=fixture(),gate=deferred();f.ctx.prepareGate=gate;const old=f.h.run(),rejected=assert.rejects(old,{name:'AbortError'});await tick();await tick();assert.equal(f.preparations.length,1);const late=f.preparations[0].prepared;assert(late);f.ctx.revision++;await f.h.run();const resident=f.h.state().residentPreparation;assert.notEqual(resident,late);gate.resolve();await rejected;assert.equal(f.h.state().residentPreparation,resident);assert.equal(late.scope.stats.disposed,true);assert.deepEqual(late.input,[]);assert.deepEqual(late.sourceComponents,[]);assert.deepEqual(late.displayComponents,[]);assert.deepEqual(late.reconstructed.components,[]);assert.equal(f.publications.length,1);f.h.destroy();assert.equal(f.data.active.size,0);
});


test('infill CPU preparation reuse replaces an obsolete publication signal and retries an unready renderer',async()=>{
 const f=fixture();await f.h.run();const prepared=f.h.state().residentPreparation,oldSignal=prepared.signal;assert(oldSignal);assert.equal(oldSignal.aborted,false);
 f.ctx.request.abort();f.ctx.request=new AbortController();f.ctx.revision++;f.ctx.pickReady=false;await f.h.run();
 assert.equal(oldSignal.aborted,true);assert.equal(f.preparations.length,1,'the immutable CPU preparation remains resident');assert.equal(f.publications.length,2,'a cancelled GPU candidate must be resubmitted');assert.equal(f.h.state().residentPreparation,prepared);assert.notEqual(prepared.signal,oldSignal);assert.equal(prepared.signal.aborted,false);assert.equal(f.ctx.duplicatePackSkips,0);
 f.ctx.pickReady=true;await f.h.run();assert.equal(f.preparations.length,1);assert.equal(f.publications.length,2,'a ready resident with the full same key still skips');assert.equal(f.ctx.duplicatePackSkips,1);f.h.destroy();assert.equal(f.data.active.size,0);
});

test('infill hidden explicit 2D cancels the waiting 3D intent without restarting on show',async()=>{
 const f=fixture({initialHidden:true});f.ctx.mode='2d';f.ctx.wantedMode='2d';const intent=f.h.requestMode('3d',new AbortController().signal),rejected=assert.rejects(intent,{name:'AbortError'});await tick();assert.equal(f.reads.length,0);
 await f.h.requestMode('2d',new AbortController().signal);await rejected;assert.equal(f.ctx.mode,'2d');assert.equal(f.ctx.wantedMode,'2d');f.h.setPageHidden(false);await tick();assert.equal(f.reads.length,0);assert.equal(f.preparations.length,0);assert.equal(f.publications.length,0);f.h.destroy();
});
