import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createRuntimeLoader,createFixtureNativeSources} from './support/fixtures-managers-a-runtime.mjs';

const filename=new URL('../src/painted/root500/safety/three-dimensional-map.ts',import.meta.url),source=await readFile(filename,'utf8');
const ast=ts.createSourceFile(filename.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const nodes=[];function visit(node){nodes.push(node);ts.forEachChild(node,visit);}visit(ast);
const fn=name=>nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
const declaration=name=>nodes.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)===name));
const install=fn('installThreeDimensionalMap'),visible=fn('visibleNow');
const returned=install.body.statements.find(node=>ts.isReturnStatement(node)&&node.expression&&ts.isObjectLiteralExpression(node.expression));
const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
const viewFinally=visible.body.statements.find(node=>ts.isTryStatement(node)&&node.finallyBlock?.getText(ast).includes('publication.close()')).finallyBlock;
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const evaluate=(text,ctx)=>new Function('env','with(env){'+compile(text)+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)}));
// frozen-data-scope.ts raises the page ledger's own ResourceBudgetExceededError;
// its only runtime import resolves to the actual resource-budget module.
const runtime=createRuntimeLoader();
const scopeExports={};new Function('exports','require',ts.transpileModule(await readFile(new URL('../src/safety/frozen-data-scope.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(scopeExports,runtime.scopeRequire());
const {createFrozenDataScope}=scopeExports;
const viewportExports={};new Function('exports',ts.transpileModule(await readFile(new URL('../src/safety/viewport-request.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(viewportExports);
const {createViewportRequestContinuation,createPreparedConsumerLifetime,createWantedResourceLeases}=viewportExports;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function client(events=[]){const state={acquires:0,releases:0,disposals:0};return{state,async acquire(){state.acquires++;let released=false;return{borrow:read=>read({tiny:true}),release(){if(released)return;released=true;state.releases++;}};},dispose(){events.push('client.dispose');state.disposals++;}};}
const tinyRef={canonicalSHA256:'a'.repeat(64),file:'painted/root500/safety/tiny-manager-fixture.ts',occurrence:0,codec:'json'};
async function prepared(rows,data,events=[]){const scope=createFrozenDataScope(data);await scope.prepare([tinyRef],new AbortController().signal);const release=scope.release.bind(scope);scope.release=()=>{events.push('scope.release');release();};return{scope,input:[...rows],source:rows,sourceLoaded:new Map(),displayComponents:rows,originalSourceVertices:0,originalSourceIndices:0,reconstructed:{components:rows,stats:{objects:0}},chunkInput:undefined,releaseChunkDependencies(){}};}
function renderer(events=[],prepare){let resident,unpin,published=0;return{layer:{id:'tiny-renderer'},prepareBatches:prepare,isPickReady:()=>true,getRevision:()=>({generation:published}),getDrawReadiness(){return{ready:this.isPickReady(),preparing:false};},cancelCandidate(){events.push('cancelCandidate');},setBatches(...args){events.push('setBatches');published=args[1];const incoming=args[0].length?args.at(-1):undefined;if(incoming){const next=incoming.scope.retain();unpin?.();resident=incoming;unpin=next;}else{unpin?.();unpin=undefined;resident=undefined;}},setEnabled(){},suspendSelection(){},setPageHidden(){events.push('hidden');},destroy(){events.push('renderer.destroy');unpin?.();unpin=undefined;resident=undefined;},get resident(){return resident;}};}
const bounds={getWest:()=>8,getSouth:()=>50,getEast:()=>9,getNorth:()=>51};
function context(extra={}){
 const events=[],data=client(events),controller=new AbortController(),page=runtime.createPageResources();const ctx={
  resourceContentKey,events,createPreparedConsumerLifetime,options:{frozenData:data,awaitPaintInitialization:operation=>operation,manageCamera:false,nativeSources:{destroy(){events.push('native.destroy');}}},signal:controller.signal,ticket:1,revision:1,fixtureRows:[],renderer:undefined,
  map:{getBounds:()=>bounds,getZoom:()=>18,getStyle:()=>({layers:[]}),getLayer:()=>false,removeLayer(){},off(){},triggerRepaint(){},getCenter:()=>({lng:8.5,lat:50.5}),isMoving:()=>false},
  city:'berlin',manifestSHA:'manifest',manifest:{source_pbf_sha256:'pbf',source_snapshot:'snapshot',city_boundary:{sha256:'boundary'}},cohortLimits:{retainedCap:1024**2},chosen:[],retainedShardCost:new WeakMap(),sourceLeafByFeature:new WeakMap(),ownerProfileByComponent:new WeakMap(),shadowByShard:new WeakMap(),
  railCohort:{diagnostic:()=>({})},churchCohort:{diagnostic:()=>({})},s434CohortSelection:{diagnostic:()=>({})},s434Aggregate:{pending:false,packing:()=>undefined,update(){},clear(){}},
  ownerShapePatchDisplayRows:rows=>rows,ownerShapePatchMetadata:()=>({components:[]}),nativePartDisplayPlan:()=>{events.push('nativePlan');return{hiddenOutlines:[],groups:[],errors:[]};},verifiedInteriorSourceHolds:()=>[],sourceEdgeAssemblyDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),s020RelationOutlineDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),
  NATIVE_PART_DISPLAY_PROFILES:[],SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES:[],S020_RELATION_OUTLINE_PROFILES:[],progressiveAdmission:()=>undefined,s020FullOriginalBatchRouteReady:()=>true,mergeShadowAdmissions:()=>undefined,partialGateDisplayPlan:()=>undefined,s402ConnectorPlan:()=>undefined,s036NorthCofacePlan:()=>undefined,s240BaseCofacePlan:()=>undefined,f151CrownPlan:()=>undefined,
  current(signal){signal.throwIfAborted();if(ctx.stale)throw new DOMException('Aborted','AbortError');},drawn:async()=>{},announce:status=>({status}),generation:0,destroyed:false,suspended:false,documentHidden:false,viewportVisible:true,pageHidden:false,wantedMode:'3d',partial:false,duplicatePackSkips:0,preparedReuseCount:0,
  residentPreparation:undefined,releaseResidentPreparation:undefined,residentAdmissionKey:undefined,lastPackedComponents:undefined,lastPackedAggregateProfile:undefined,lastPackedAggregateDiagnostic:'',lastPackedViewKey:'',lastPackedSourceRoles:undefined,
  sourceRoleDisplayProfile:()=>undefined,prepareSourceRoleDisplay:async()=>{},
  // Page-store source and detail state of the current manager closure. The page
  // store, wanted-source leases and every extracted lifecycle helper are actual;
  // these rows carry no source geometry, so the chunk-input assembly for them is
  // a recorded fixture (recovery-resident-reuse runs the real assembly).
  resources:page.store,wantedSources:createWantedResourceLeases({key:descriptor=>descriptor.contentKey,acquire(){throw Error('scope fixtures want no source leaf');}}),
  mainSourceLeases:new Map(),mainExplicitSources:new Map(),publishedContentKeys:[],stagedExplicitSources:[],stagedExplicitGeneration:undefined,stagedExplicitCurrent:undefined,publishedExplicitGeneration:undefined,requiredSolarCoverageBounds:undefined,requiredSolarCoverageGeneration:undefined,
  latestDrawTarget:undefined,lastRegistered:undefined,publishedDetailResources:new Map(),publishedDetailGeneration:undefined,publishedManagerState:undefined,adoptedDetailResources:new Map(),currentNativeGroupDisplay:undefined,lastReadyGeneration:undefined,clearedFailedTicket:undefined,
  sourceCandidates:new Map(),detailBindings:new Map(),session:undefined,sourceOwnerKey:'root500:fixture',sourceResourceByFeature:new WeakMap(),sourceContentByFeature:new WeakMap(),facadeHelpers:undefined,bootstrapRetained:undefined,detailRefreshPending:false,
  chunkInputs:[],sourceChunkInput(components,parents,admission){ctx.chunkInputs.push({components,parents,admission});return{store:page.store,groups:[],cohorts:[]};},bindDerivedChunkInput(prepared,components){ctx.chunkInputs.push({derived:prepared,components});},
  ...extra,
 };ctx.modeRequests??=createViewportRequestContinuation(()=>Boolean(ctx.map.isMoving?.()));ctx.modeRequests.setHidden(ctx.pageHidden);return ctx;
}
function preparationHarness(ctx){return evaluate(`
 ${declaration('preparedConsumers').getText(ast)}
 ${fn('retirePreparedBatches').getText(ast)}
 ${fn('retainPreparedBatches').getText(ast)}
 ${fn('sameStageComponents').getText(ast)}
 ${fn('sameSourceRoles').getText(ast)}
 ${fn('clearPreparedBatches').getText(ast)}
 ${fn('keepPreparedBatches').getText(ast)}
 ${fn('prepareAdmittedSourceRoles').getText(ast)}
 ${['rememberPublishedDetails','stageExplicitSources','sourceContentKey','sourceResourceKey','sourceResourceKeys','retireChunkInput','sourceChunkDemand'].map(name=>fn(name).getText(ast)).join('\n')}
 let finished=false,firstDrawPending=false;
 const results=fixtureRows.slice(),readers=[];let stagingTicket=ticket,stagingRetainedEstimateBytes=0;
 ${declaration('publication').getText(ast)}
 ${declaration('prepareController').getText(ast)}
 ${declaration('prepareCommit').getText(ast)}
 ${['captureDetailSubset','validateDetail','adoptDetail','settleDetail'].map(name=>declaration(name).getText(ast)).join('\n')}
 ${declaration('commit').getText(ast)}
 return {prepare:prepareCommit,commit:()=>publication.finish(commit),stage:()=>publication.stage(commit),clear:clearPreparedBatches,promote:keepPreparedBatches,finish:async()=>${viewFinally.getText(ast)},stats:()=>({rows:!!prepareRows,promise:!!preparePromise,value:!!prepareValue,key:prepareAdmissionKey,controller:!!prepareController})};
 `,ctx);}

test('manager injects the exact provider data client into its actual renderer creation branch',async()=>{
 const ensure=fn('ensure'),branch=ensure.body.statements[0].getText(ast).replaceAll(/import\('([^']+)'\)/g,(_all,name)=>'loadModule('+JSON.stringify(name)+')');
 const ctx=context();let received;const r=renderer();
 const modules={createBuildingMeshRenderer:(_map,_city,options)=>(received=options,r),sourceSurfaceStyle:()=>({}),BUILDING_SURFACE_FRAGMENT_GLSL:'tiny',openFacadeSurfaceFragment:value=>value,createOpenFacadeWindowTexture:()=>({}),neutralSchematicFacadeStyle:()=>({}),openFacadeDiffuseFragment:value=>value,createOpenFacadeDiffuse:()=>({}),acquireFacadeHelperSource:async request=>{assert.equal(request.budget,ctx.resources.budget,'helper source is admitted on the page ledger');assert.equal(request.baseSurfaceFragment,'tiny');helpers.push(request);return{surfaceFragment:'tiny-surface',diffuseFragment:'tiny-diffuse',released:false,release(){}};}};const helpers=[];
 Object.assign(ctx,{mobile:false,matchMedia:()=>({matches:false}),readBinaryAsset(){},loadModule:async()=>modules});ctx.map.addLayer=()=>{};
 await evaluate('let renderer;return(async()=>{'+branch+'})();',ctx);assert.equal(received.frozenData,ctx.options.frozenData);assert.equal(helpers.length,1);assert.equal(received.surfaceFragment,'tiny-surface');assert.equal(received.diffuseFragment,'tiny-diffuse');
});

test('raw native cache and owner-profile admission do not acquire or pin owner recipes',async()=>{
 // The raw native path is now the manager's wanted page-store source: shard waits on
 // that source and its production (loadSourceContent) reads the native leaf.
 for(const name of ['shard','loadSourceContent'])for(const word of ['prepareOwner','prepareNonBerlin'])assert(!fn(name).getText(ast).includes(word),name+' must not prepare '+word);
 for(const profile of [false,true]){
  const ctx=context(),component={city:'berlin',objectId:'tiny',partId:'native',componentGeometry:{type:'Polygon'},sourceFeature:{},batches:[{positions:[0,0,0]}]},rows=[component];
  const native=createFixtureNativeSources({store:ctx.resources,city:'berlin',owner:'root500-scope',rows:()=>rows});ctx.options.nativeSources=native;
  Object.assign(ctx,{createWantedResourceLeases,maxVertices:200000,mobile:false,loadCount:0,sourceDiagnostics:new Map(),ResourceBudgetExceededError:runtime.resourceBudget.ResourceBudgetExceededError,THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024**2,mobile:1024**2},ownerShapePatchProfile:()=>profile?{sha256:'patch'}:undefined,verifyOwnerShapePatchRows(){},shadowAdmissionForDecodedShard:()=>undefined,estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:128}),prepareSourceRoleDisplay(){throw Error('Raw/native activation must not prepare source roles');}});
  const source=evaluate(['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard'].map(name=>fn(name).getText(ast)).join('\n')+'\n'+declaration('wantedSources').getText(ast)+'\nreturn{shard,wantedSources,sourceResourceKey};',ctx),asset={tile_key:'tiny',sha256:'sha',vertices:1,path:'tiny',bytes:24};
  source.wantedSources.reconcile([{leaf:asset,contentKey:source.sourceResourceKey(asset)}]);
  assert.equal(await source.shard(asset,ctx.signal),rows);assert.equal(await source.shard(asset,ctx.signal),rows);assert.equal(native.stats.acquisitions,1,'one native read serves both requests');assert.equal(native.stats.releases,0,'the wanted source keeps its native parent');
  if(profile)assert.equal(ctx.ownerProfileByComponent.get(component).sha256,'patch');else assert.equal(ctx.sourceLeafByFeature.get(component.sourceFeature),'sha');
  source.wantedSources.reconcile([]);await tick();assert.equal(native.stats.releases,1,'releasing the wanted source releases its native lease once');assert.equal(ctx.options.frozenData.state.acquires,0);
 }
});

test('two commits sharing one pending preparation retain independently and reuse only a live resident scope',async()=>{
 const ctx=context(),calls=[],r=renderer(ctx.events,(...args)=>{const operation=deferred();calls.push({args,...operation});return operation.promise;});ctx.renderer=r;const h=preparationHarness(ctx),rows=[{}],admission={sourcePbfSHA256:'pbf',bounds:[8,50,9,51],zoom:18};
 const first=h.prepare(rows,admission),second=h.prepare([...rows],{...admission});assert.equal(calls.length,1);assert.equal(calls[0].args[2],ctx.options.awaitPaintInitialization);assert.equal(calls[0].args[3],admission);
 const p=await prepared(rows,ctx.options.frozenData);calls[0].resolve(p);const [a,b]=await Promise.all([first,second]);assert.equal(p.scope.stats.pins,2);
 a.release();assert.equal(p.scope.stats.ownerReleased,true);assert.equal(p.scope.stats.disposed,false);r.setBatches(rows,1,p);h.promote(p,JSON.stringify(admission));b.release();assert.equal(p.scope.stats.pins,2);
 const reused=await h.prepare(rows,admission);assert.equal(calls.length,1);reused.release();r.setBatches([],2);assert.equal(p.scope.stats.disposed,false);h.clear();assert.equal(p.scope.stats.disposed,true);
 const fresh=h.prepare(rows,admission);assert.equal(calls.length,2);calls[1].resolve(await prepared(rows,ctx.options.frozenData));(await fresh).release();await h.finish();assert.deepEqual(h.stats(),{rows:false,promise:false,value:false,key:undefined,controller:false});
});

test('superseded and view-cancelled preparations release successful late scopes without publishing',async()=>{
 const ctx=context(),calls=[];ctx.renderer=renderer(ctx.events,(...args)=>{const operation=deferred();calls.push({args,...operation});return operation.promise;});const h=preparationHarness(ctx),aRows=[{}],bRows=[{}],admission={zoom:18};
 const a=h.prepare(aRows,admission);const rejected=assert.rejects(a,{name:'AbortError'});const b=h.prepare(bRows,admission);const late=await prepared(aRows,ctx.options.frozenData);calls[0].resolve(late);await rejected;assert.equal(late.scope.stats.disposed,true);
 await h.finish();const bRejected=assert.rejects(b,{name:'AbortError'}),lateB=await prepared(bRows,ctx.options.frozenData);calls[1].resolve(lateB);await bRejected;assert.equal(lateB.scope.stats.disposed,true);assert.equal(ctx.events.includes('setBatches'),false);assert.equal(ctx.options.frozenData.state.releases,2);
});

test('a changed derived admission invalidates preparation even when native component references are identical',async()=>{
 const ctx=context(),calls=[];ctx.renderer=renderer(ctx.events,(...args)=>{const operation=deferred();calls.push({args,...operation});return operation.promise;});const h=preparationHarness(ctx),rows=[{}];
 const old=h.prepare(rows,{zoom:17}),rejected=assert.rejects(old,{name:'AbortError'}),next=h.prepare(rows,{zoom:18});assert.equal(calls.length,2);assert.equal(calls[0].args[1].aborted,true);assert.deepEqual(calls[1].args[3],{zoom:18});calls[0].resolve(await prepared(rows,ctx.options.frozenData));await rejected;calls[1].resolve(await prepared(rows,ctx.options.frozenData));(await next).release();await h.finish();
});

test('actual commit captures admission before preparation, preserves native plans and releases only after publication',async()=>{
 const row={batches:[],sourceFeature:{}},ctx=context({fixtureRows:[[row]],chosen:[{id:'tiny'}]});ctx.retainedShardCost.set(ctx.fixtureRows[0],128);let admission,p;
 ctx.renderer=renderer(ctx.events,async(rows,_signal,_wait,derived)=>{ctx.events.push('prepare');admission=derived;p=await prepared(rows,ctx.options.frozenData,ctx.events);return p;});const h=preparationHarness(ctx);
 await h.commit();assert.deepEqual(admission,{sourcePbfSHA256:'pbf',bounds:[8,50,9,51],zoom:18});assert.equal(ctx.renderer.resident,p);assert.equal(p.scope.stats.ownerReleased,true);assert.equal(p.scope.stats.pins,2);assert(ctx.events.indexOf('prepare')<ctx.events.indexOf('nativePlan'));assert(ctx.events.indexOf('setBatches')<ctx.events.indexOf('scope.release'));await h.finish();assert.equal(p.scope.stats.disposed,false);ctx.renderer.destroy();assert.equal(p.scope.stats.disposed,false);h.clear();assert.equal(p.scope.stats.disposed,true);
});

test('actual commit discards an obsolete completion and releases on downstream plan failure',async()=>{
 for(const stale of [true,false]){
  const row={batches:[],sourceFeature:{}},ctx=context({fixtureRows:[[row]],chosen:[{id:'tiny'}]});ctx.retainedShardCost.set(ctx.fixtureRows[0],128);let p;
  ctx.renderer=renderer(ctx.events,async rows=>{p=await prepared(rows,ctx.options.frozenData);if(stale)ctx.stale=true;return p;});if(!stale)ctx.nativePartDisplayPlan=()=>{throw Error('tiny plan failure');};
  const h=preparationHarness(ctx);await assert.rejects(h.commit(),stale?{name:'AbortError'}:/tiny plan failure/);assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.events.includes('setBatches'),false);await h.finish();
 }
});

function lifecycle(ctx){return evaluate(declaration('preparedConsumers').getText(ast)+'\n'+fn('retirePreparedBatches').getText(ast)+'\n'+fn('clearPreparedBatches').getText(ast)+'\n'+['retireChunkInput','clearSourceDemand','clearExplicitSources','clearRequiredSolarCoverage','clearFailedHandoff','rememberPublishedDetails','restorePublishedDetails'].map(name=>fn(name).getText(ast)).join('\n')+'\n'+fn('setWorkHidden').getText(ast)+'\n'+fn('requestMode').getText(ast)+'\nreturn {requestMode,'+['setPageHidden','setViewportVisible','suspend','resume','destroy'].map(name=>method(name).getText(ast)).join(',')+'};',ctx);}
function lifecycleContext(){const ctx=context();Object.assign(ctx,{mode:'3d',wantedMode:'3d',revision:1,request:new AbortController(),active:0,queue:[],preparingTicket:undefined,cameraMotionTicket:undefined,ownCameraStartingTicket:undefined,visibleLoadsPending:0,cache:new Map(),cacheBytes:0,cacheRetainedEstimateBytes:0,visibleRetainedEstimateBytes:0,stagingRetainedEstimateBytes:0,selectedShardIds:[],koRailCohort70:undefined,koRailCohortDiagnostic70:undefined,coChurchCohort70:undefined,coChurchCohortDiagnostic70:undefined,modeRequests:ctx.modeRequests,recoveryResident:{invalidate(){},suspend:()=>true,reuse:()=>true},syncNativeCache(){},partitions:{clear(){}},moveStarted(){},moved(){},ensure:async()=>{},visible:async()=>({mode:'3d',status:'ready'}),moveCamera:async()=>{}});return ctx;}

test('real 2D empties the renderer; hide and recovery preserve pins; destroy disposes the client after renderer',async()=>{
 const ctx=lifecycleContext();ctx.renderer=renderer(ctx.events);const life=lifecycle(ctx),p=await prepared([{}],ctx.options.frozenData);ctx.renderer.setBatches([{}],1,p);p.scope.release();
 life.setPageHidden(true);assert.equal(p.scope.stats.disposed,false);assert.equal(life.suspend({contextRecovery:true}),true);life.resume({contextRecovery:true});assert.equal(p.scope.stats.disposed,false);
 await life.requestMode('2d',new AbortController().signal);assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.options.frozenData.state.disposals,0);
 const next=await prepared([{}],ctx.options.frozenData);ctx.renderer.setBatches([{}],2,next);next.scope.release();life.destroy();assert.equal(next.scope.stats.disposed,true);assert(ctx.events.indexOf('renderer.destroy')<ctx.events.indexOf('client.dispose'));assert.equal(ctx.options.frozenData.state.disposals,1);life.destroy();assert.equal(ctx.options.frozenData.state.disposals,1);
});

test('failed 3D entry from 2D rolls back through the actual empty renderer commit',async()=>{
 const ctx=lifecycleContext();ctx.mode='2d';ctx.ensure=async()=>{throw Error('tiny entry failure');};ctx.renderer=renderer(ctx.events);const p=await prepared([{}],ctx.options.frozenData);ctx.renderer.setBatches([{}],1,p);p.scope.release();
 await assert.rejects(lifecycle(ctx).requestMode('3d',new AbortController().signal),/tiny entry failure/);assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.mode,'2d');assert.equal(ctx.options.frozenData.state.disposals,0);
});

test('S434 callbacks repack with the same prepared scope while identical initial packs are skipped',async()=>{
 const native={batches:[],sourceFeature:{}},ctx=context({fixtureRows:[[native]],chosen:[{id:'tiny'}]});ctx.retainedShardCost.set(ctx.fixtureRows[0],128);
 const calls=[],publications=[];let callback,packing,p;
 ctx.s434Aggregate={pending:false,packing:()=>packing,update(_rows,options){callback=options.onChange;},clear(){}};
 ctx.renderer=renderer(ctx.events,async(...args)=>{calls.push(args);return p=await prepared(args[0],ctx.options.frozenData);});const set=ctx.renderer.setBatches;ctx.renderer.setBatches=(...args)=>{publications.push(args);set(...args);};const h=preparationHarness(ctx);
 await h.commit();assert.equal(calls.length,1);assert.equal(publications.length,1);assert.equal(p.scope.stats.ownerReleased,true);assert.equal(p.scope.stats.pins,2);
 packing={profile:{tiny:true},diagnostic:{status:'ready'}};callback('ready');assert.equal(publications.length,2);assert.equal(publications[1].at(-1),p);assert.equal(publications[1][6],packing);assert.equal(ctx.generation,2);assert.equal(p.scope.stats.pins,2);
 await h.commit();assert.equal(calls.length,1);assert.equal(publications.length,2);assert.equal(ctx.duplicatePackSkips,1);assert.equal(ctx.generation,2);
 packing=undefined;callback('invalidated');assert.equal(publications.length,3);assert.equal(publications[2].at(-1),p);assert.equal(ctx.generation,3);assert.equal(ctx.options.frozenData.state.acquires,1);assert.equal(p.scope.stats.disposed,false);
 await h.finish();ctx.renderer.destroy();assert.equal(p.scope.stats.disposed,false);h.clear();assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.options.frozenData.state.releases,1);
});

test('S434 invalidation after explicit 2D intent cannot repack before the real 2D clear releases its scope',async()=>{
 const row={batches:[],sourceFeature:{}},rows=[row],ctx=lifecycleContext();ctx.signal=ctx.request.signal;ctx.fixtureRows=[rows];ctx.chosen=[{id:'tiny'}];ctx.retainedShardCost.set(rows,128);let callback,p,notifications=0;
 ctx.s434Aggregate={pending:false,packing:()=>undefined,update(_rows,options){callback=options.onChange;},clear(){ctx.events.push('s434.clear');notifications++;callback?.('invalidated');}};ctx.renderer=renderer(ctx.events,async selected=>p=await prepared(selected,ctx.options.frozenData));const h=preparationHarness(ctx);await h.commit();await h.finish();const generation=ctx.generation,publications=ctx.events.filter(event=>event==='setBatches').length;assert.equal(p.scope.stats.pins,2);
 ctx.wantedMode='2d';callback('invalidated');assert.equal(ctx.generation,generation);assert.equal(ctx.events.filter(event=>event==='setBatches').length,publications);assert.equal(ctx.residentPreparation,p);assert.equal(p.scope.stats.disposed,false);
 // The real requestMode aborts its previous view before changing mode. Model
 // the lifecycle's synchronous onAbort notification on that exact signal.
 ctx.request.signal.addEventListener('abort',()=>{notifications++;callback('invalidated');},{once:true});await lifecycle(ctx).requestMode('2d',new AbortController().signal);assert.equal(notifications,2);assert.equal(ctx.generation,generation+1);assert.equal(ctx.events.filter(event=>event==='setBatches').length,publications+1);assert.equal(ctx.renderer.resident,undefined);assert.equal(ctx.residentPreparation,undefined);assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.options.frozenData.state.releases,1);
});

test('same-admission CPU preparation failure is cleared so the next attempt prepares a fresh scope',async()=>{
 const ctx=context(),calls=[],rows=[{}],admission={sourcePbfSHA256:'pbf',bounds:[8,50,9,51],zoom:18};let failed,next;
 ctx.renderer=renderer(ctx.events,async(...args)=>{calls.push(args);const p=await prepared(args[0],ctx.options.frozenData);if(calls.length===1){failed=p;p.scope.release();throw Error('tiny CPU preparation failure');}next=p;return p;});const h=preparationHarness(ctx);
 await assert.rejects(h.prepare(rows,admission),/tiny CPU preparation failure/);assert.equal(failed.scope.stats.disposed,true);assert.deepEqual(h.stats(),{rows:false,promise:false,value:false,key:undefined,controller:true});assert.equal(ctx.events.includes('setBatches'),false);
 const attempt=await h.prepare([...rows],admission);assert.equal(calls.length,2);assert.equal(calls[0][1].aborted,true);assert.equal(calls[1][3],admission);assert.equal(attempt.prepared,next);assert.notEqual(next.scope,failed.scope);assert.equal(next.scope.stats.pins,1);assert.equal(next.scope.stats.ownerReleased,false);assert.equal(ctx.options.frozenData.state.acquires,2);
 attempt.release();assert.equal(next.scope.stats.disposed,true);assert.equal(ctx.options.frozenData.state.releases,2);assert.deepEqual(h.stats(),{rows:false,promise:false,value:false,key:undefined,controller:true});await h.finish();
});

test('V5 final source-role gate groups only admitted and owner-filtered native rows before CPU recipes and plans',async()=>{
 for(const outcome of ['ready','cancel','failure']){
  const a={sourceFeature:{},batches:[]},b={sourceFeature:{},batches:[]},c={sourceFeature:{},batches:[]},patched={sourceFeature:{},batches:[]},overBudget={sourceFeature:{},batches:[]},offscreen={sourceFeature:{},batches:[]},rows=[a,b,c,patched],controller=new AbortController(),ctx=context({signal:controller.signal,fixtureRows:[rows,[overBudget]],chosen:[{id:'selected'},{id:'too-large'}],cohortLimits:{retainedCap:250}});ctx.retainedShardCost.set(rows,128);ctx.retainedShardCost.set(ctx.fixtureRows[1],80);
  // This fixture records the already admitted physical source group; an empty
  // group list cannot represent the inputs exercised by the final role gate.
  ctx.ownerShapePatchDisplayRows=selected=>selected.filter(row=>row!==patched);ctx.sourceChunkInput=(components,parents,admission)=>{ctx.chunkInputs.push({components,parents,admission});return{store:ctx.resources,groups:[{contentKey:'v5-admitted-source-group',components:[...components],parents:[],selectedLOD:'canonical'}],cohorts:[]};};for(const row of [a,c,patched,overBudget,offscreen])ctx.sourceLeafByFeature.set(row.sourceFeature,'leaf-a');ctx.sourceLeafByFeature.set(b.sourceFeature,'leaf-b');
  const gates=[deferred(),deferred()],seen=[];ctx.prepareSourceRoleDisplay=async(selected,leaf,request)=>{ctx.events.push('source:'+leaf);seen.push({selected,leaf,request});await gates[seen.length-1].promise;};let p;ctx.renderer=renderer(ctx.events,async selected=>{ctx.events.push('prepare');assert.deepEqual(selected,[a,b,c]);return p=await prepared(selected,ctx.options.frozenData);});const h=preparationHarness(ctx),pending=h.commit();await tick();assert.equal(seen.length,1);assert.deepEqual(seen[0].selected,[a,c]);assert.equal(seen[0].leaf,'leaf-a');assert.notEqual(seen[0].request,controller.signal,'CPU preparation uses the shared publication attempt identity');assert.equal(seen[0].request.aborted,false);assert.equal(ctx.events.includes('prepare'),false);assert.equal(ctx.events.includes('nativePlan'),false);assert.equal(ctx.residentPreparation,undefined);
  if(outcome==='failure'){const failure=new Error('tiny final source role failure'),rejected=assert.rejects(pending,error=>error===failure);gates[0].reject(failure);await rejected;}else if(outcome==='cancel'){controller.abort();assert.equal(seen[0].request.aborted,true,'view cancellation reaches the publication attempt');const rejected=assert.rejects(pending,{name:'AbortError'});gates[0].resolve();await rejected;}else{gates[0].resolve();await tick();assert.equal(seen.length,2);assert.deepEqual(seen[1].selected,[b]);assert.equal(seen[1].leaf,'leaf-b');assert.equal(ctx.events.includes('prepare'),false);assert.equal(ctx.events.includes('nativePlan'),false);gates[1].resolve();await pending;assert(ctx.events.indexOf('source:leaf-b')<ctx.events.indexOf('prepare'));assert(ctx.events.indexOf('prepare')<ctx.events.indexOf('nativePlan'));assert.equal(ctx.residentPreparation,p);}
  if(outcome!=='ready'){assert.equal(seen.length,1);assert.equal(ctx.events.includes('setBatches'),false);assert.equal(ctx.events.includes('prepare'),false);assert.equal(ctx.options.frozenData.state.acquires,0);assert.equal(ctx.residentPreparation,undefined);}await h.finish();ctx.renderer.destroy();h.clear();if(p)assert.equal(p.scope.stats.disposed,true);
 }
});

test('V5 unchanged published input and admission reuse one scope and pack across visible calls; every pack key boundary still republishes',async()=>{
 const row={sourceFeature:{},batches:[]},rows=[row],ctx=context({fixtureRows:[rows],chosen:[{id:'one'}]});ctx.retainedShardCost.set(rows,128);const calls=[],publications=[],profiles=new Map([[row,{v:1}]]);ctx.sourceRoleDisplayProfile=c=>profiles.get(c);ctx.renderer=renderer(ctx.events,async(...args)=>{calls.push(args);return prepared(args[0],ctx.options.frozenData);});const set=ctx.renderer.setBatches;ctx.renderer.setBatches=(...args)=>{publications.push(args);set(...args);};
 async function view(){const h=preparationHarness(ctx);await h.commit();await h.finish();return h;}
 let h=await view(),first=ctx.residentPreparation;assert.equal(first.scope.stats.pins,2);assert.equal(calls.length,1);assert.equal(publications.length,1);h=await view();assert.equal(ctx.residentPreparation,first);assert.equal(calls.length,1);assert.equal(publications.length,1);assert.equal(ctx.duplicatePackSkips,1);assert.equal(ctx.preparedReuseCount,1);
 for(const change of [()=>ctx.map.getCenter=()=>({lng:8.6,lat:50.5}),()=>profiles.set(row,{v:1}),()=>ctx.renderer.selected={objectId:'picked',partId:'part'},()=>ctx.chosen=[{id:'another-leaf'}]]){const before=publications.length;change();h=await view();assert.equal(calls.length,1);assert.equal(publications.length,before+1);assert.equal(ctx.residentPreparation,first);assert.equal(first.scope.stats.pins,2);}
 for(const change of [()=>ctx.map.getZoom=()=>19,()=>ctx.map.getBounds=()=>({...bounds,getEast:()=>9.1}),()=>ctx.manifest.source_pbf_sha256='another-pbf']){const previous=ctx.residentPreparation,count=calls.length;change();h=await view();assert.equal(calls.length,count+1);assert.notEqual(ctx.residentPreparation,previous);assert.equal(previous.scope.stats.disposed,true);assert.equal(ctx.residentPreparation.scope.stats.pins,2);}
 const changedRows=[{...row}],previous=ctx.residentPreparation;ctx.fixtureRows=[changedRows];ctx.retainedShardCost.set(changedRows,128);h=await view();assert.equal(calls.length,5);assert.notEqual(ctx.residentPreparation,previous);assert.equal(previous.scope.stats.disposed,true);ctx.renderer.destroy();h.clear();assert.equal(ctx.options.frozenData.state.releases,5);
});

test('V5 failed publication never promotes an unpublished scope or overwrites the previous manager snapshot',async()=>{
 const oldRow={sourceFeature:{},batches:[]},oldRows=[oldRow],ctx=context({fixtureRows:[oldRows],chosen:[{id:'old'}]});ctx.retainedShardCost.set(oldRows,128);const created=[];ctx.renderer=renderer(ctx.events,async rows=>{const value=await prepared(rows,ctx.options.frozenData);created.push(value);return value;});let h=preparationHarness(ctx);await h.commit();await h.finish();const old=ctx.residentPreparation,packed=ctx.lastPackedComponents,viewKey=ctx.lastPackedViewKey;
 const nextRows=[{sourceFeature:{},batches:[]}];ctx.fixtureRows=[nextRows];ctx.retainedShardCost.set(nextRows,128);ctx.chosen=[{id:'new'}];ctx.renderer.setBatches=()=>{assert.equal(ctx.residentPreparation,old);assert.equal(ctx.lastPackedComponents,packed);throw Error('tiny publication failed');};let cleared=0;ctx.s434Aggregate.clear=()=>cleared++;h=preparationHarness(ctx);await assert.rejects(h.commit(),/tiny publication failed/);assert.equal(created.length,2);assert.equal(created[1].scope.stats.disposed,true);assert.equal(ctx.residentPreparation,old);assert.equal(ctx.renderer.resident,old);assert.equal(ctx.lastPackedComponents,packed);assert.equal(ctx.lastPackedViewKey,viewKey);assert.equal(old.scope.stats.pins,2);assert.equal(cleared,1);await h.finish();ctx.renderer.destroy();h.clear();assert.equal(old.scope.stats.disposed,true);
});

test('V5 hidden page performs no viewport CPU work, preserves the published scope and resumes the existing 3D intent',async()=>{
 const exported={};new Function('exports',ts.transpileModule(await readFile(new URL('../src/safety/viewport-request.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(exported);
 const row={sourceFeature:{},batches:[]},rows=[row],ctx=lifecycleContext();ctx.fixtureRows=[rows];ctx.chosen=[{id:'tiny'}];ctx.retainedShardCost.set(rows,128);let prepares=0,ensures=0,visibleCalls=0;ctx.renderer=renderer(ctx.events,async selected=>{prepares++;return prepared(selected,ctx.options.frozenData);});const h=preparationHarness(ctx);await h.commit();await h.finish();const p=ctx.residentPreparation,packed=ctx.lastPackedComponents;ctx.modeRequests=exported.createViewportRequestContinuation(()=>ctx.pageHidden||ctx.map.isMoving());ctx.ensure=async()=>ensures++;ctx.visible=async()=>{visibleCalls++;return{status:'ready'};};const life=lifecycle(ctx);
 life.setPageHidden(true);assert.equal(ctx.request.signal.aborted,true);assert.equal(ctx.residentPreparation,p);assert.equal(ctx.lastPackedComponents,packed);assert.equal(p.scope.stats.pins,2);const hidden=evaluate(fn('visibleNow').getText(ast)+'\nreturn visibleNow;',ctx);await assert.rejects(hidden(new AbortController().signal,ctx.ticket,false,false),{name:'AbortError'});
 const pending=life.requestMode('3d',new AbortController().signal);await tick();assert.equal(ensures,0);assert.equal(visibleCalls,0);assert.equal(prepares,1);assert.equal(ctx.events.filter(event=>event==='setBatches').length,1);assert.equal(ctx.wantedMode,'3d');life.setPageHidden(false);await pending;assert.equal(ensures,1);assert.equal(visibleCalls,2);assert.equal(prepares,1);assert.equal(ctx.residentPreparation,p);assert.equal(p.scope.stats.disposed,false);life.destroy();assert.equal(p.scope.stats.disposed,true);
});

test('V5 document and viewport visibility compose independently; only both visible wake CPU work and GPU recovery cannot override offscreen',async()=>{
 const row={sourceFeature:{},batches:[]},rows=[row],ctx=lifecycleContext();ctx.fixtureRows=[rows];ctx.chosen=[{id:'tiny'}];ctx.retainedShardCost.set(rows,128);let prepares=0,refreshes=0,pauses=0,settles=0;ctx.renderer=renderer(ctx.events,async selected=>{prepares++;return prepared(selected,ctx.options.frozenData);});const h=preparationHarness(ctx);await h.commit();await h.finish();const p=ctx.residentPreparation;
 const continuation=ctx.modeRequests,setHidden=continuation.setHidden,settle=continuation.settleViewport;ctx.modeRequests={...continuation,setHidden(value,view){if(value)pauses++;else settles++;return setHidden(value,view);},settleViewport(){settles++;return settle();}};ctx.visible=async()=>{refreshes++;return{status:'ready'};};ctx.moved=evaluate(declaration('moved').getText(ast)+'\nreturn moved;',ctx);ctx.recoveryResident={invalidate(){},suspend:()=>false,reuse:()=>false};const life=lifecycle(ctx);
 life.setViewportVisible(false);assert.equal(ctx.viewportVisible,false);assert.equal(ctx.documentHidden,false);assert.equal(ctx.pageHidden,true);assert.equal(pauses,1);
 life.setPageHidden(true);life.setPageHidden(false);assert.equal(ctx.documentHidden,false);assert.equal(ctx.viewportVisible,false);assert.equal(ctx.pageHidden,true);assert.equal(refreshes,0);assert.equal(settles,0);assert.equal(pauses,1);
 life.setPageHidden(true);life.setViewportVisible(true);assert.equal(ctx.documentHidden,true);assert.equal(ctx.viewportVisible,true);assert.equal(ctx.pageHidden,true);assert.equal(refreshes,0);assert.equal(settles,0);
 life.setPageHidden(false);assert.equal(ctx.pageHidden,false);assert.equal(settles,2);assert.equal(refreshes,1);assert.equal(ctx.residentPreparation,p);assert.equal(p.scope.stats.pins,2);
 life.setViewportVisible(false);assert.equal(ctx.pageHidden,true);assert.equal(pauses,2);assert.equal(life.suspend({contextRecovery:true}),false);life.resume({contextRecovery:true});assert.equal(ctx.suspended,false);assert.equal(ctx.viewportVisible,false);assert.equal(ctx.documentHidden,false);assert.equal(ctx.pageHidden,true);assert.equal(refreshes,1);assert.equal(prepares,1);assert.equal(ctx.events.filter(event=>event==='setBatches').length,1);assert.equal(ctx.residentPreparation,p);assert.equal(p.scope.stats.disposed,false);
 life.setPageHidden(true);life.setViewportVisible(true);assert.equal(ctx.pageHidden,true);assert.equal(refreshes,1);life.setPageHidden(false);assert.equal(ctx.pageHidden,false);assert.equal(refreshes,2);assert.equal(prepares,1);assert.equal(p.scope.stats.pins,2);life.destroy();assert.equal(p.scope.stats.disposed,true);
});

test('V5 2D overview and destroy sever manager snapshot refs before releasing their final pin',async()=>{
 for(const action of ['2d','overview','destroy']){
  const row={sourceFeature:{},batches:[]},rows=[row],ctx=lifecycleContext();ctx.fixtureRows=[rows];ctx.chosen=[{id:'tiny'}];ctx.retainedShardCost.set(rows,128);ctx.renderer=renderer(ctx.events,selected=>prepared(selected,ctx.options.frozenData));const h=preparationHarness(ctx);await h.commit();await h.finish();const p=ctx.residentPreparation,release=ctx.releaseResidentPreparation;let releases=0;ctx.releaseResidentPreparation=()=>{releases++;assert.equal(ctx.residentPreparation,undefined);assert.equal(ctx.residentAdmissionKey,undefined);assert.equal(ctx.lastPackedComponents,undefined);assert.equal(ctx.lastPackedAggregateProfile,undefined);assert.equal(ctx.lastPackedSourceRoles,undefined);assert.equal(ctx.lastPackedViewKey,'');assert.equal(ctx.releaseResidentPreparation,undefined);ctx.events.push('manager.release');release();};
  if(action==='2d')await lifecycle(ctx).requestMode('2d',new AbortController().signal);else if(action==='destroy')lifecycle(ctx).destroy();else{ctx.overviewReleased=false;ctx.map.getZoom=()=>14;ctx.map.getCanvas=()=>({clientWidth:640,clientHeight:480});ctx.map.getPitch=()=>0;ctx.map.getVerticalFieldOfView=()=>45;const overview=evaluate(declaration('preparedConsumers').getText(ast)+'\n'+fn('retirePreparedBatches').getText(ast)+'\n'+fn('clearPreparedBatches').getText(ast)+'\n'+['retireChunkInput','clearSourceDemand','clearExplicitSources','clearRequiredSolarCoverage'].map(name=>fn(name).getText(ast)).join('\n')+'\n'+fn('visibleNow').getText(ast)+'\nreturn visibleNow;',ctx);await overview(ctx.signal,ctx.ticket,false,false);}
  assert.equal(releases,1);assert.equal(p.scope.stats.disposed,true);assert.equal(ctx.options.frozenData.state.releases,1);if(action==='destroy'){assert(ctx.events.indexOf('renderer.destroy')<ctx.events.indexOf('manager.release'));assert(ctx.events.indexOf('manager.release')<ctx.events.indexOf('client.dispose'));}else assert(ctx.events.lastIndexOf('setBatches')<ctx.events.indexOf('manager.release'));
 }
});


test('retired fulfilled preparations drop their payload only after the final consumer while partial renderer pins remain independent',async()=>{
 const ctx=context(),calls=[];ctx.renderer=renderer(ctx.events,(...args)=>{const gate=deferred();calls.push({args,...gate});return gate.promise;});const h=preparationHarness(ctx),native={id:'native'},rows=[native],admission={zoom:18};
 const first=h.prepare(rows,admission),second=h.prepare(rows,admission),p=await prepared(rows,ctx.options.frozenData),sourceMap=new Map([['native',native]]);p.sourceLoaded=sourceMap;calls[0].resolve(p);const [a,b]=await Promise.all([first,second]),rendererPin=p.scope.retain();
 a.release();assert.equal(p.input[0],native);assert.equal(p.sourceLoaded,sourceMap);assert.equal(p.scope.stats.disposed,false);b.release();assert.deepEqual(p.input,[]);assert.deepEqual(p.source,[]);assert.deepEqual(p.displayComponents,[]);assert.equal(p.sourceLoaded.size,0);assert.deepEqual(p.reconstructed.components,[]);assert.equal(sourceMap.get('native'),native,'retirement replaces manager fields rather than mutating renderer aliases');assert.equal(p.scope.stats.pins,1);assert.equal(p.scope.stats.disposed,false);assert.equal(h.stats().promise,false);
 const retry=h.prepare(rows,admission);assert.equal(calls.length,2,'a partial renderer pin does not make a retired preparation reusable');calls[1].resolve(await prepared(rows,ctx.options.frozenData));(await retry).release();rendererPin();await h.finish();assert.equal(p.scope.stats.disposed,true);
});

test('resident replacement preserves an older concurrent consumer then clears the fulfilled result before its final capture pin releases',async()=>{
 const ctx=context(),calls=[];ctx.renderer=renderer(ctx.events,(...args)=>{const gate=deferred();calls.push({args,...gate});return gate.promise;});const h=preparationHarness(ctx),rows=[{id:'old'}],admission={zoom:18},operation=h.prepare(rows,admission),old=await prepared(rows,ctx.options.frozenData);calls[0].resolve(old);const first=await operation;h.promote(old,JSON.stringify(admission));first.release();const concurrent=await h.prepare(rows,admission),capturePin=old.scope.retain(),next=await prepared([{id:'new'}],ctx.options.frozenData);h.promote(next,JSON.stringify({zoom:19}));
 assert.equal(old.input[0],rows[0],'the live consumer still owns its complete input');concurrent.release();assert.deepEqual(old.input,[]);assert.deepEqual(old.source,[]);assert.deepEqual(old.displayComponents,[]);assert.equal(old.scope.stats.pins,1);assert.equal(old.scope.stats.disposed,false);capturePin();assert.equal(old.scope.stats.disposed,true);next.scope.release();h.clear();await h.finish();assert.equal(next.scope.stats.disposed,true);
});


test('a reused CPU preparation republishes an aborted GPU candidate with the current publication signal',async()=>{
 const row={sourceFeature:{},batches:[]},rows=[row],ctx=context({fixtureRows:[rows],chosen:[{id:'tiny'}]});ctx.retainedShardCost.set(rows,128);
 let ready=false,prepares=0;const candidateSignals=[];ctx.renderer=renderer(ctx.events,async selected=>{prepares++;return prepared(selected,ctx.options.frozenData);});ctx.renderer.isPickReady=()=>ready;
 const set=ctx.renderer.setBatches;ctx.renderer.setBatches=(...args)=>{const p=args.at(-1);p.signal.throwIfAborted();candidateSignals.push(p.signal);set(...args);};
 const h=preparationHarness(ctx);await h.commit();const p=ctx.residentPreparation,first=candidateSignals[0];assert.equal(first.aborted,false);assert.equal(prepares,1);assert.equal(candidateSignals.length,1);
 await h.commit();assert.equal(first.aborted,true,'the next publication retires the previous pending GPU candidate');assert.equal(prepares,1,'CPU preparation is still reusable');assert.equal(candidateSignals.length,2,'an unready renderer is resubmitted even when pack inputs match');assert.notEqual(candidateSignals[1],first);assert.equal(p.signal,candidateSignals[1]);assert.equal(p.signal.aborted,false);
 ready=true;await h.commit();assert.equal(prepares,1);assert.equal(candidateSignals.length,2,'a ready identical resident still skips repacking');assert.equal(ctx.duplicatePackSkips,1);await h.finish();ctx.renderer.destroy();h.clear();assert.equal(p.scope.stats.disposed,true);
});
