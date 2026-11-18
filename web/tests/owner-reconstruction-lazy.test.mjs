import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {resourceContentKey} from './support/resource-content-key.mjs';

// Exercise the production raw native shard boundary without model data or GPU.
// Retired F029/F033 import-loader behavior is covered by the actual scoped owner,
// staged preparation and manager lifetime suites; no duplicate loader is kept.
const web=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(web,'src/painted/root500/safety');
const require=createRequire(new URL('../package.json',import.meta.url));
const {transform}=require('esbuild');
const esm=async(contents)=>'data:text/javascript;base64,'+Buffer.from((await transform(contents,{loader:'ts',format:'esm',target:'es2022'})).code).toString('base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const unrelated={city:'berlin',objectId:'unrelated',partId:'unrelated/component',batches:[],sourceFeature:{},componentGeometry:{type:'Polygon'}};

// Execute the actual native shard boundary. Whole-cohort owner scope preparation
// belongs to renderer.prepareBatches; root500-manager-data-scope.test.mjs covers
// that gate, coalescing, pins, admission changes, cancellation and publication.
// Since the page-store migration the manager's shard() reads its wanted-source
// lease, whose production is loadSourceContent over the page native source
// client (the shared pool fetches, verifies and normalizes; this fixture client
// stands in for that pool with gates on its fetch and verification steps). The
// actual declarations run over the real page store and wanted-lease adapter, as
// in bremen-owner-manager.test.mjs.
const managerSource=await readFile(path.join(source,'three-dimensional-map.ts'),'utf8');
const ts=require('typescript'),managerAST=ts.createSourceFile('three-dimensional-map.ts',managerSource,ts.ScriptTarget.Latest,true);
const functions=new Map(),variables=new Map();
(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node);if(ts.isVariableStatement(node))for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name)&&!variables.has(item.name.text))variables.set(item.name.text,node);ts.forEachChild(node,visit);})(managerAST);
for(const name of ['shard','loadSourceContent','sourceContentKey','sourceResourceKey','bindSourceContent'])assert.ok(functions.has(name),'The production async shard boundary must be available: '+name);
assert.ok(variables.has('wantedSources'));
const declarations=[...['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard'].map(name=>functions.get(name).getText(managerAST)),variables.get('wantedSources').getText(managerAST)].join('\n');
const js=ts.transpileModule(declarations+'\nreturn {shard,wantedSources,sourceResourceKey};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const {createSourceModules}=await import('./support/fixtures-managers-b-source-modules.mjs');
const runtime=createSourceModules({allow:id=>['safety/viewport-request','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/program-preparation','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/diagnostic-snapshot','safety/render-runtime/pressure-availability'].includes(id)});
const {createWantedResourceLeases}=runtime.load('safety/viewport-request'),{createChunkResourceStore}=runtime.load('safety/render-runtime/chunk-resource-store'),{createResourceBudget,ResourceBudgetExceededError}=runtime.load('safety/render-runtime/resource-budget');
const shard={tile_key:'one',sha256:'verified',path:'/one',bytes:1,vertices:0};
function harness({ownerProfile=false,fetchGate=Promise.resolve(),verifyGate=Promise.resolve(),profileFailure}={}){
  const calls=[],rows=[unrelated],bytes=new Uint8Array([1]),profile={sha256:'tiny-profile'},nativeReleases=[];
  const resources=createChunkResourceStore({budget:createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
  const noGlobalPrepare=()=>{throw Error('Raw native admission must not prepare global owner recipes');};
  // The page native source client: fetch and verification happen inside the shared pool.
  const nativeSources={resources,ownerKey:'root500:fixture-owner',async acquire(leaf,requestSignal,maxVertices,role){
    requestSignal.throwIfAborted();assert.equal(leaf,shard);assert.equal(maxVertices,200000);assert.equal(role,'dependency');
    calls.push('fetch');await fetchGate;requestSignal.throwIfAborted();calls.push('verify');await verifyGate;requestSignal.throwIfAborted();calls.push('normalize');
    const raw={schema_version:1,city:'berlin',components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:32}};
    const parent=resources.acquire({contentKey:JSON.stringify(['fixture-native-leaf',leaf.tile_key,leaf.sha256]),role:'source',allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'exact'},produce:()=>({raw})});
    await parent.ready;let released=false;
    return{raw,verified:bytes,physicalBytes:leaf.bytes,retainResource:held=>parent.retain(held),release(){if(released)return;released=true;nativeReleases.push(leaf.tile_key);parent.release();}};
   },destroy(){}};
  const ctx={resources,createWantedResourceLeases,ResourceBudgetExceededError,resourceContentKey,city:'berlin',maxVertices:200000,mobile:false,loadCount:0,
    manifestSHA:'manifest',manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},compiler_sha256:'compiler',source_snapshot:'snapshot'},sourceOwnerKey:'root500:fixture-owner',sourceDiagnostics:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),
    options:{awaitPaintInitialization:noGlobalPrepare,frozenData:{acquire:noGlobalPrepare},nativeSources},ownerShapePatchProfile:()=>ownerProfile?profile:null,verifyOwnerShapePatchRows:(components,actualProfile)=>{calls.push('profile');assert.equal(components,rows);assert.equal(actualProfile,profile);if(profileFailure)throw profileFailure;},
    ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),
    shadowAdmissionForDecodedShard:()=>null,THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024,mobile:1024},shadowByShard:new WeakMap(),estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:0}),
    sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:()=>{throw Error('Raw admission must not prepare source roles; final selected commit owns this gate');}};
  const scope=new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
  const production=Function('scope','with(scope){'+js+'}')(scope),key=production.sourceResourceKey(shard);
  // The manager registers its wanted set before it reads any shard; withdrawn demand cancels the production.
  const want=()=>production.wantedSources.reconcile([{leaf:shard,contentKey:key}]),withdraw=()=>production.wantedSources.reconcile([]);
  const content=()=>{if(!production.wantedSources.keys.includes(key))return undefined;const lease=production.wantedSources.retain(key,'selected');try{return lease.value;}finally{lease.release();}};
  return{shard:(leaf,requestSignal)=>production.shard(leaf,requestSignal),get loadCount(){return ctx.loadCount;},calls,rows,ctx,profile,want,withdraw,content,resources,nativeReleases};
}
const bounded=failure=>error=>error instanceof Error&&error.name===failure.name&&error.message===failure.message;

test('native boundary: ordinary/profile fetch and verification finish before raw admission without global owner preparation',async()=>{
  for(const ownerProfile of [false,true]){
    const fetch=deferred(),verify=deferred(),h=harness({ownerProfile,fetchGate:fetch.promise,verifyGate:verify.promise});h.want();
    const pending=h.shard(shard,signal());await tick();assert.deepEqual(h.calls,['fetch']);assert.equal(h.loadCount,0);
    fetch.resolve();await tick();assert.deepEqual(h.calls,['fetch','verify']);assert.equal(h.loadCount,0);
    verify.resolve();
    assert.equal(await pending,h.rows);assert.equal(h.loadCount,1);assert.equal(h.content().components,h.rows);assert.equal(h.ctx.retainedShardCost.get(h.rows),32);
    if(ownerProfile){assert.deepEqual(h.calls,['fetch','verify','normalize','profile']);assert.equal(h.ctx.ownerProfileByComponent.get(h.rows[0]),h.profile);}else{assert.deepEqual(h.calls,['fetch','verify','normalize']);assert.equal(h.ctx.sourceLeafByFeature.get(h.rows[0].sourceFeature),shard.sha256);}
    const calls=[...h.calls];assert.equal(await h.shard(shard,signal()),h.rows);assert.deepEqual(h.calls,calls);assert.equal(h.loadCount,1,'a live source content is reused, never produced again');
    h.withdraw();
  }
});

test('native boundary: cancellation before or during native fetch/verification never admits either branch',async()=>{
  for(const ownerProfile of [false,true]){
    const already=new AbortController(),cold=harness({ownerProfile});already.abort();await assert.rejects(cold.shard(shard,already.signal),{name:'AbortError'});assert.deepEqual(cold.calls,[]);assert.equal(cold.loadCount,0);
    for(const phase of ['fetch','verify']){
      const gate=deferred(),controller=new AbortController(),h=harness({ownerProfile,[phase+'Gate']:gate.promise});h.want();const pending=h.shard(shard,controller.signal);await tick();assert.equal(h.calls.at(-1),phase);assert.equal(h.loadCount,0);
      controller.abort();h.withdraw();const rejected=assert.rejects(pending,{name:'AbortError'});gate.resolve();await rejected;for(let i=0;i<4;i++)await tick();
      assert.equal(h.loadCount,0);assert.equal(h.content(),undefined);assert.equal(h.resources.stats.resources,0,'withdrawn demand leaves no source content');
    }
  }
});

test('native boundary: native fetch/verification and branch validation failures never admit raw rows',async()=>{
  for(const ownerProfile of [false,true]){
    for(const phase of ['fetch','verify']){
      const gate=deferred(),failure=new Error('tiny native '+phase+' failed'),h=harness({ownerProfile,[phase+'Gate']:gate.promise});h.want();const pending=h.shard(shard,signal());await tick();assert.equal(h.calls.at(-1),phase);
      // The page store hands every waiter a bounded copy of the production failure.
      const rejected=assert.rejects(pending,bounded(failure));gate.reject(failure);await rejected;assert.equal(h.loadCount,0);h.withdraw();
    }
  }
  const failure=new Error('tiny profile verification failed'),profile=harness({ownerProfile:true,profileFailure:failure});profile.want();await assert.rejects(profile.shard(shard,signal()),bounded(failure));assert.equal(profile.loadCount,0);assert.equal(profile.ctx.ownerProfileByComponent.has(profile.rows[0]),false);
  for(let i=0;i<4;i++)await tick();assert.deepEqual(profile.nativeReleases,['one'],'the failed production returns its native source');profile.withdraw();
});
