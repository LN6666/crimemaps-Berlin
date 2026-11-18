import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
const C=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),S=process.env.OVERVIEW_TEST_BASE??C,sourceRoot=process.env.OVERVIEW_TEST_SOURCE_ROOT??C;
const ts=createRequire(S+'/web/package.json')('typescript');
const providers=['root500','delegated500','tier300','church','city'];
function load(file,cache=new Map()) {if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const text=fs.readFileSync(path.join(S,file),'utf8'),js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports',js)(spec=>load(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec+'.ts')),cache),exports);return exports;}
const {createSharedNativeSourcePool}=load('web/src/safety/shared-native-source.ts');
const {createRecoveryResidentReuse}=load('web/src/safety/recovery-resident-reuse.ts');
const {resourceContentKey}=load('web/src/safety/resource-content-key.ts');
function managerSource(provider){const file=`web/src/painted/${provider}/safety/three-dimensional-map.ts`,text=fs.readFileSync(path.join(sourceRoot,file),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);assert.equal(ast.parseDiagnostics.length,0);return{text,ast};}
function managerNode(provider,name){const {ast}=managerSource(provider);let result;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)result=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert(result,name);return result;}
function managerHas(provider,name){const {ast}=managerSource(provider);let found=false;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=true;ts.forEachChild(node,visit);}visit(ast);return found;}
// The manager-level declaration (a nested block may reuse the same local name for another value).
function managerInitializer(provider,name,accept=()=>true){const {ast}=managerSource(provider);const found=[];function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer&&accept(node.initializer))found.push(node.initializer.getText(ast));ts.forEachChild(node,visit);}visit(ast);assert.equal(found.length,1,provider+' declares one manager-level '+name);return found[0];}
function execute(fn,env){const js=ts.transpileModule('('+fn+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText.trim().replace(/;$/,'');const proxy=new Proxy(env,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});return Function('env','with(env){return '+js+'}')(proxy);}
function fixture(){const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13.001,52.001],[13,52]]]};const component={city:'berlin',objectId:'osm/way/1',partId:'osm/way/1/component/01234567890123456789',origin:[13,52],componentGeometry:geometry,sourceFeature:{type:'Feature',id:'osm/way/1',geometry,properties:{name:'retained fixture'}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.4,.5,.6]}]};const bytes=new TextEncoder().encode(JSON.stringify({schema_version:1,city:'berlin',components:[component]}));return{bytes,asset:{path:'/safety/buildings3d/fixture.json',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}};}
// Source residency is now the manager's wanted-source leases on the page chunk store (no decoded
// cache Map): the actual wantedSources initializer, clearSourceDemand and (where declared)
// releaseMainSources run against the real store and the real createWantedResourceLeases.
const runtime=createSourceModules({allow:id=>id==='safety/viewport-request'||id.startsWith('safety/render-runtime/')});
const {createWantedResourceLeases}=runtime.load('safety/viewport-request'),stores=runtime.load('safety/render-runtime/chunk-resource-store'),budgets=runtime.load('safety/render-runtime/resource-budget');
// Each test's native pool charges its own page store, so no decoded entry is shared across tests through the page singleton.
// setCached is the native cache's recent retention, so the pool store allows bounded recent entries.
const poolStore=()=>stores.createChunkResourceStore({budget:budgets.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:16*1024**2}),recentMaxEntries:16,recentMaxIdleMs:60_000});
class FixtureContextLost extends Error{}
class FixtureStaleDemand extends Error{}
function harness(provider,client,f){const calls={emptyPacks:0,metadataClears:0,aggregateClears:0,draws:0,preparedClears:0,focusResets:0},selection={objectId:'osm/way/1',partId:'osm/way/1/component/01234567890123456789'};let zoom=16;
 const recoveryResident=createRecoveryResidentReuse(()=>({view:[16,1000,600],source:['fixture'],generation:1,rendererGeneration:1}));recoveryResident.complete();
 const store=stores.createChunkResourceStore({budget:budgets.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 const env={recoveryResident,mode:'3d',revision:1,overviewReleased:false,visibleLoadsPending:0,generation:1,manifest:{},visibleRetainedEstimateBytes:12,stagingRetainedEstimateBytes:8,selectedShardIds:['fixture'],partial:true,koRailCohort70:undefined,koRailCohortDiagnostic70:undefined,coChurchCohort70:undefined,coChurchCohortDiagnostic70:undefined,messeturmCohort70:undefined,messeturmCohortDiagnostic70:undefined,mobile:false,
  publishedDetailResources:new Map(),adoptedDetailResources:new Map(),publishedDetailGeneration:undefined,publishedManagerState:undefined,currentNativeGroupDisplay:undefined,lastRegistered:undefined,
  // Focus memory (building-focus-provider): an emptied display must also forget its grace holds.
  focusState:{reset(){calls.focusResets++;},moveStarted(){},destroy(){}},
  s434Aggregate:{clear(){calls.aggregateClears++;}},ownerShapePatchMetadata:()=>({components:[],geometryAdded:0}),ownerReconstruction:{components:[selection]},options:{onNativeGroupDisplay(){}},partitions:{clear(){calls.metadataClears++;}},map:{getZoom:()=>zoom,getBounds:()=>({getWest:()=>13,getSouth:()=>52,getEast:()=>14,getNorth:()=>53}),getCanvas:()=>({clientWidth:1000,clientHeight:600}),getPitch:()=>45,getVerticalFieldOfView:()=>45,triggerRepaint(){},isMoving:()=>false},
  renderer:{enabled:true,selected:selection,loaded:[],getRevision:()=>({generation:env.generation}),getDrawReadiness:()=>({ready:true,preparing:false}),setBatches(rows){assert.equal(rows.length,0);calls.emptyPacks++;this.loaded=rows;},setEnabled(value){this.enabled=value;}},announce:status=>({mode:'3d',status}),drawn:async()=>{calls.draws++;},
  // Prepared CPU batches and handoff state are released by their own owners; the overview branch calls them once.
  clearPreparedBatches(){calls.preparedClears++;},clearPreparedData(){calls.preparedClears++;},clearPreparedAggregate(){calls.preparedClears++;},clearReadyHandoff(){},rememberReadyHandoff(){},showNativeGroupDisplay(){},clearFailedHandoff(){},flushDetailRefresh(){},detailRefreshPending:false,detailDemand:undefined,cityMaterialModulesPending:false,
  ChunkResourceContextLostError:FixtureContextLost,StaleBuildingDetailDemandError:FixtureStaleDemand,modeRequests:{invalidateViewport(){},settleViewport(){}},request:new AbortController(),destroyed:false,
  createWantedResourceLeases,resourceContentKey,resources:store,resourceStore:store,sourceClient:{ownerKey:'fixture-owner',destroy(){}},sourceDiagnostics:new Map(),sourceMetrics:new Map(),sourceValues:0,sourceContentByShard:new Map(),publishedSourceContentKeys:[],publishedContentKeys:[],shadowByShard:new WeakMap(),estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:64}),mainExplicitSources:new Map(),
  sourceContentKey:(leaf,detail)=>JSON.stringify(['fixture-building-source',leaf.tile_key,leaf.sha256,detail?.resource?.level??null]),
  // The native read is the actual shared native source client; the store charges and owns the decoded rows.
  // This fixture tests source ownership; admission scheduling and ready receipts have separate suites.
  prepareSource(_key,signal,work){signal.throwIfAborted();return work();},
  async loadShard(leaf,signal,_detail,context){const read=await client.read(f.asset,signal,200000),components=read.raw.components,value={components,packingComponents:components,selectedResource:undefined,groups:undefined,contentKey:leaf.sha256,selectedLOD:0,materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',release:()=>read.release()};
   // As the actual loader: the admitted production adjusts to the retained resource cost before publishing it.
   if(!context.adjust(env.sourceResourceCosts(value))){read.release();throw Error('fixture source no longer fits the page budget');}return value;},
  async loadSourceContent(leaf,context){const read=await client.read(f.asset,context.signal,200000),components=read.raw.components,ownedMetadataBytes=1024+components.reduce((n,c)=>n+512+2*(c.objectId.length+c.partId.length),0);
   if(!context.adjust({category:'metadata',bytes:ownedMetadataBytes,precision:'estimate',label:'fixture provider SOURCE metadata'})){read.release();throw Error('fixture source no longer fits the page budget');}
   return{contentKey:leaf.sha256,components,groups:undefined,ownedMetadataBytes,releaseDependency:()=>read.release()};},
 };
 env.mainSourceLeases=provider==='root500'?new Map():[];
 env.current=(signal,ticket)=>{signal.throwIfAborted();assert.equal(ticket,env.revision);};
 if(provider!=='root500'){env.resourceKey=execute(managerInitializer(provider,'resourceKey',node=>ts.isArrowFunction(node)),env);for(const name of ['sourceResourceCosts','retireSourceClient','releaseMainSources'])env[name]=execute(managerNode(provider,name),env);}
 else for(const name of ['clearExplicitSources','clearRequiredSolarCoverage'])env[name]=execute(managerNode(provider,name),env);
 env.wantedSources=execute(managerInitializer(provider,'wantedSources'),env);env.clearSourceDemand=execute(managerNode(provider,'clearSourceDemand'),env);
 const leaf={id:'fixture',tile_key:'fixture',sha256:f.asset.sha256},descriptor=provider==='root500'?{contentKey:'fixture-source:'+f.asset.sha256,leaf,detail:undefined}:{leaf,detail:undefined},key=provider==='root500'?descriptor.contentKey:env.resourceKey(env.sourceContentKey(leaf));
 // The manager's publication step: wanted demand produces the source once, then the published
 // scene holds its own 'main' lease (publishSourceDemand / retainSourceContent).
 async function publish(signal=new AbortController().signal){env.wantedSources.reconcile([descriptor]);const value=await env.wantedSources.value(key,signal),lease=env.wantedSources.retain(key,'main');if(provider==='root500')env.mainSourceLeases.set(key,lease);else env.mainSourceLeases=[...env.mainSourceLeases,lease];return value;}
 const mainLeases=()=>provider==='root500'?env.mainSourceLeases.size:env.mainSourceLeases.length;
 // Execute the actual visible() wrapper and visibleNow() prefix, including overview and detail
 // re-entry reset. Stop at the existing partition resolve boundary: no network,
 // renderer preparation or unrelated city material machinery is simulated here.
 const whole=managerNode(provider,'visibleNow'),cut=whole.indexOf('const paged=');assert(cut>0);const prefix=whole.slice(0,cut)+"return {mode,status:'detail-required'};}";
 env.visibleNow=execute(prefix,env);const visible=execute(managerNode(provider,'visible'),env);return{env,calls,selection,store,publish,mainLeases,view:async(z,activate=false,signal=new AbortController().signal)=>{zoom=z;return visible(signal,1,activate);}};
}

for(const provider of providers)test(`${provider}: real overview branch drops source leases once; detail re-entry can restore identical full source`,async()=>{
 const f=fixture(),nativeStore=poolStore();let reads=0;const pool=createSharedNativeSourcePool({read:async()=>{reads++;return f.bytes;},resourceStore:nativeStore}),client=pool.client('berlin'),peer=pool.client('berlin'),h=harness(provider,client,f),signal=new AbortController().signal;
 const published=await h.publish(),other=await peer.read(f.asset,signal,200000);h.env.renderer.loaded=published.components;const expected=structuredClone(published.components);peer.setCached([other.raw.components]);other.release();assert.equal(pool.stats.entries,1);assert.equal(reads,1);assert.equal(h.mainLeases(),1);assert.equal(h.store.stats.resources,1,'one page-store source entry');
 assert.equal((await h.view(13,true)).status,'overview');assert.equal(h.mainLeases(),1,'prepare-only mode must not evict a still-visible detail scene');assert.equal(h.store.stats.resources,1);assert.equal(h.calls.emptyPacks,0);
 assert.equal((await h.view(13)).status,'overview');assert.equal(h.env.recoveryResident.suspend(true),false,'overview invalidates a completed resident reuse stamp');await new Promise(resolve=>setImmediate(resolve));
 assert(h.calls.focusResets>=1,'the overview branch forgets focus admissions, so no grace hold outlives the emptied display');
 assert.equal(h.mainLeases(),0,'the published main source lease is released');assert.deepEqual(h.env.wantedSources.keys,[],'no wanted source demand remains');assert.equal(h.store.stats.resources,0,'the page store retired the source entry');assert.equal(h.store.stats.budget.bytes,0,'no source bytes stay charged');assert.equal(h.env.visibleRetainedEstimateBytes,0);assert.equal(h.env.stagingRetainedEstimateBytes,0);assert.deepEqual(h.env.selectedShardIds,[]);assert.equal(h.calls.emptyPacks,1);assert.equal(h.calls.metadataClears,1);assert.equal(h.env.renderer.selected,h.selection,'identity survives; no model graph is needed');assert.equal(h.env.renderer.loaded.length,0);assert.equal(pool.stats.entries,1,'another active provider still owns its cache');assert.equal(pool.stats.holders,1);peer.setCached([]);
 // With no holder left the decoded entry is at most an evictable recent cache entry of the native store: no role holds it, and eviction drops it.
 assert.equal(pool.stats.holders,0);assert.equal(nativeStore.stats.recent,nativeStore.stats.resources,'only evictable recent cache entries remain');nativeStore.evictRecent();assert.equal(nativeStore.stats.resources,0);assert.equal(pool.stats.entries,0);
 h.env.renderer.enabled=false;await h.view(12);await h.view(14.49);assert.equal(h.calls.emptyPacks,1,'same overview must not keep releasing/repacking');assert.equal(h.calls.metadataClears,1);assert.equal(h.env.renderer.enabled,true,'overview readiness survives disable/re-entry');
 assert.equal((await h.view(14.5)).status,'detail-required');const restored=await h.publish();assert.equal(reads,2);assert.deepEqual(restored.components,expected);h.env.renderer.loaded=restored.components;assert.equal(h.mainLeases(),1);assert.equal(pool.stats.entries,1);
 await h.view(13);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls.emptyPacks,2,'a real later detail→overview transition releases again');assert.equal(h.mainLeases(),0);assert.equal(h.store.stats.resources,0);assert.equal(pool.stats.holders,0);assert.equal(nativeStore.stats.recent,nativeStore.stats.resources,'only evictable recent cache entries remain');nativeStore.evictRecent();assert.equal(nativeStore.stats.resources,0);assert.equal(pool.stats.entries,0);assert.equal(h.env.visibleLoadsPending,0);pool.destroy();
});

test('aborted overview transition does not clear current residency or leave pending accounting',async()=>{
 for(const provider of providers){const f=fixture(),pool=createSharedNativeSourcePool({read:async()=>f.bytes,resourceStore:poolStore()}),client=pool.client('berlin'),h=harness(provider,client,f);await h.publish();const stop=new AbortController();stop.abort();await assert.rejects(h.view(13,false,stop.signal),{name:'AbortError'});assert.equal(h.mainLeases(),1);assert.equal(h.store.stats.resources,1);assert.equal(h.calls.emptyPacks,0);assert.equal(h.env.visibleLoadsPending,0);h.env.clearSourceDemand();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.store.stats.resources,0);pool.destroy();}
});

test('root500 overview replaces published LOD bindings before its empty render callback',async()=>{
 const f=fixture(),pool=createSharedNativeSourcePool({read:async()=>f.bytes,resourceStore:poolStore()}),client=pool.client('berlin'),h=harness('root500',client,f),e=h.env;
 const detail={key:'fixture-mid',level:'mid'},resources=new Map([['fixture',detail]]);
 Object.assign(e,{publishedDetailResources:new Map(resources),adoptedDetailResources:new Map(resources),publishedDetailGeneration:1,publishedManagerState:{retainedBytes:12},currentNativeGroupDisplay:{groups:['old']},lastRegistered:{generation:1,detailResources:resources},requiredSolarCoverageGeneration:1,synchronizePublishedExplicitSources(){},publishRequiredSolarCoverage(rows,generation){assert.deepEqual([...rows],[],'empty geometry cannot publish obsolete detail coverage');e.requiredSolarCoverageGeneration=generation;}});
 for(const name of ['rememberPublishedDetails','currentPickingResources','flushDetailRefresh'])e[name]=execute(managerNode('root500',name),e);
 await h.publish();await h.view(13);
 assert.doesNotThrow(()=>e.flushDetailRefresh(),'the first ready empty render cannot throw a stale picking binding error');
 assert.deepEqual(e.currentPickingResources(),[]);
 assert.equal(e.adoptedDetailResources.size,0);assert.equal(e.publishedDetailResources.size,0);
 assert.equal(e.publishedManagerState,undefined,'obsolete manager metadata is released with the scene');
 assert.equal(e.publishedDetailGeneration,e.generation);
 await h.view(14.5);
 const replacement={key:'fixture-near',level:'near'};
 e.generation++;e.lastRegistered={generation:e.generation,detailResources:new Map([['fixture',replacement]])};
 assert.deepEqual(e.currentPickingResources(),[replacement],'detail re-entry binds the new renderer publication');
 e.clearSourceDemand();pool.destroy();
});
