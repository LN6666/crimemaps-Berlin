import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
import {createRuntimeLoader,createFixtureNativeSources} from './support/fixtures-managers-a-runtime.mjs';

// p0-audit R2 (Bremen): the Frankfurt Bulk70 builder is imported lazily by row
// identity. visible() now imports it with the city's catalogue identities before
// any source lease, so loadSourceContent's own Bulk70 preparation, which runs
// while the native source lease is held, never awaits that import.
const web=fileURLToPath(new URL('../',import.meta.url));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

// The actual lazy loader and identity catalogue. Its two default dynamic imports
// stay external: every loader below is created with an explicit module loader.
const lazy=await(async()=>{
 const result=await build({stdin:{contents:`export {createInfillFrankfurtLowOfficeBulk70Loader} from './src/painted/bremen/safety/infill-frankfurt-low-office-bulk70-lazy';export {BULK70_IDENTITY_GROUPS} from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-identities';export {INFILL_BULK_BUDGET_CATALOGUE} from './src/painted/infill/safety/infill-frankfurt-low-office-bulk70-budget-metadata';`,resolveDir:web,loader:'ts'},absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent',plugins:[{name:'bulk70-builders-external',setup(builder){
  builder.onResolve({filter:/infill-frankfurt-low-office-bulk70$|infill-bulk-budget-credit$/},args=>args.kind==='dynamic-import'?{path:args.path,external:true}:undefined);
  builder.onResolve({filter:/frozen-paint-tables/},()=>{throw Error('The lazy Bulk70 loader must not reach frozen tables');});
 }}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
})();

const managerSource=await readFile(path.join(web,'src/painted/bremen/safety/three-dimensional-map.ts'),'utf8'),managerAST=ts.createSourceFile('manager.ts',managerSource,ts.ScriptTarget.Latest,true);
const declaration=name=>{let text;(function visit(node){if(!text&&(ts.isFunctionDeclaration(node)&&node.name?.text===name||ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(managerAST)===name)))text=node.getText(managerAST);ts.forEachChild(node,visit);})(managerAST);assert(text,'actual Bremen manager '+name);return text;};
const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const bulk70PreimportRows=Function('BULK70_IDENTITY_GROUPS',transpile(declaration('bulk70PreimportRows'))+'\nreturn bulk70PreimportRows;')(lazy.BULK70_IDENTITY_GROUPS);
const sourcePathJS=transpile(['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard','wantedSources'].map(declaration).join('\n'));
const runtime=createRuntimeLoader(),{createWantedResourceLeases}=runtime.load(path.join(web,'src/safety/viewport-request.ts'));

// A loader over the real lazy state machine whose builder import is held by a gate.
function gatedLoader(){
 const state={imports:0,gate:deferred()};
 const builder={INFILL_BULK_BUDGET_CATALOGUE:lazy.INFILL_BULK_BUDGET_CATALOGUE,prepareInfillData:async()=>{},infillFrankfurtLowOfficeBulk70Reconstruction:components=>({components,stats:{objects:0}}),infillBulkBudgetCredit:()=>({vertices:0})};
 state.loader=lazy.createInfillFrankfurtLowOfficeBulk70Loader(async()=>{state.imports++;state.onImport?.();await state.gate.promise;return builder;});
 return state;
}

// The actual manager source path (shard -> wanted page-store source ->
// loadSourceContent) with fixture native sources whose rows are one Bulk70 cohort.
function manager(bulk70,waits){
 const group=lazy.BULK70_IDENTITY_GROUPS[0],rows=group.identities.map(identity=>({city:'frankfurt',...identity,origin:[8.6,50.1],componentGeometry:{type:'Polygon',coordinates:[[[8.6,50.1],[8.601,50.1],[8.601,50.101],[8.6,50.1]]]},sourceFeature:{type:'Feature',properties:{}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[1,1,1]}]}));
 const wait=operation=>{waits.count++;return operation;};
 const {store}=runtime.createPageResources(),nativeSources=createFixtureNativeSources({store,city:'frankfurt',owner:'r4misc-bulk70-preimport',rows:()=>rows});
 const inLease=[];
 const values={resourceContentKey:runtime.load(path.join(web,'src/safety/resource-content-key.ts')).resourceContentKey,city:'frankfurt',maxVertices:200000,mobile:false,options:{awaitPaintInitialization:wait,nativeSources},resources:store,sourceOwnerKey:nativeSources.ownerKey,manifestSHA:'fixture-index',manifest:{source_pbf_sha256:'fixture-pbf',city_boundary:{sha256:'fixture'},compiler_sha256:'fixture-compiler',source_snapshot:'fixture-snapshot'},createWantedResourceLeases,ResourceBudgetExceededError:runtime.resourceBudget.ResourceBudgetExceededError,sourceDiagnostics:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),
  prepareBremenInfillOwnerRouteModules:async()=>{},prepareNonBerlinOwnerRoutes:async()=>{},
  // The in-lease call: record the native leases held and whether it imported.
  prepareInfillFrankfurtLowOfficeBulk70Reconstruction:(...args)=>{assert.equal(args[2],wait);const entry={held:nativeSources.stats.acquisitions-nativeSources.stats.releases,importsBefore:bulk70.imports,waitsBefore:waits.count};inLease.push(entry);return bulk70.loader.prepare(...args).then(value=>{entry.importsAfter=bulk70.imports;entry.waitsAfter=waits.count;return value;});},
  ownerShapePatchProfile:()=>undefined,verifyOwnerShapePatchRows(){},ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),loadCount:0,shadowAdmissionForDecodedShard:()=>undefined,THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1<<20,mobile:1<<20},estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:32}),shadowByShard:new WeakMap(),sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:async()=>{}};
 const scope=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 const source=Function('scope','with(scope){'+sourcePathJS+'\nreturn{shard,wantedSources,sourceResourceKey};}')(scope),descriptor={tile_key:'fixture',path:'/fixture',sha256:'fixture',bytes:1,vertices:3*rows.length};
 return{rows,inLease,nativeSources,wait,descriptor,shard:signal=>source.shard(descriptor,signal),want:()=>source.wantedSources.reconcile([{leaf:descriptor,contentKey:source.sourceResourceKey(descriptor)}]),release:()=>source.wantedSources.reconcile([])};
}

test('pre-import rows are the complete catalogue identities of one city and select the import only for Frankfurt',async()=>{
 const rows=bulk70PreimportRows('frankfurt'),identities=lazy.BULK70_IDENTITY_GROUPS.flatMap(group=>group.identities);
 assert.equal(rows.length,identities.length);assert.equal(identities.length,101);
 rows.forEach((row,index)=>assert.deepEqual(row,{city:'frankfurt',objectId:identities[index].objectId,partId:identities[index].partId}));
 for(const city of ['bremen','berlin','essen']){const bulk70=gatedLoader();await bulk70.loader.prepare(bulk70PreimportRows(city),new AbortController().signal);assert.equal(bulk70.imports,0,city+' imports no Bulk70 builder');}
 const bulk70=gatedLoader();const pending=bulk70.loader.prepare(rows,new AbortController().signal);await tick();assert.equal(bulk70.imports,1);bulk70.gate.resolve();await pending;
 // Ready: every later preparation (including the in-lease one) imports nothing.
 await bulk70.loader.prepare(rows,new AbortController().signal);assert.equal(bulk70.imports,1);
});

test('premise: without the pre-import the source path awaits the Bulk70 import while the native source lease is held',async()=>{
 const bulk70=gatedLoader(),waits={count:0},m=manager(bulk70,waits);
 try{
  m.want();const pending=m.shard(new AbortController().signal);await tick();
  assert.equal(m.inLease.length,1);assert(m.inLease[0].held>0,'the in-lease call runs holding the native source lease');
  assert.equal(bulk70.imports,1,'the import starts inside the lease');assert.equal(m.inLease[0].importsAfter,undefined,'and the source path waits on it');
  bulk70.gate.resolve();assert.equal(await pending,m.rows);
 }finally{m.release();}
});

test('with the visible() pre-import the in-lease Bulk70 preparation imports nothing and never waits',async()=>{
 const bulk70=gatedLoader(),waits={count:0},m=manager(bulk70,waits);
 try{
  // visible(): the city block imports the builder by catalogue identity, holding nothing.
  let heldDuringImport;bulk70.onImport=()=>{heldDuringImport=m.nativeSources.stats.acquisitions-m.nativeSources.stats.releases;};
  const preimport=bulk70.loader.prepare(bulk70PreimportRows('frankfurt'),new AbortController().signal,m.wait);await tick();
  assert.equal(bulk70.imports,1);assert.equal(heldDuringImport,0,'no native source lease is held while the import is awaited');assert.equal(m.nativeSources.stats.acquisitions,0);
  bulk70.gate.resolve();await preimport;const waitsAfterPreimport=waits.count;assert.equal(waitsAfterPreimport,1);
  // visibleNow(): the source path, holding its lease, finds the builder ready.
  m.want();const value=await m.shard(new AbortController().signal);assert.equal(value,m.rows);
  assert.equal(m.inLease.length,1);const call=m.inLease[0];
  assert(call.held>0,'the call still runs inside the lease');
  assert.equal(call.importsBefore,1);assert.equal(call.importsAfter,1,'no import inside the lease');
  assert.equal(call.waitsAfter,waitsAfterPreimport,'the session wait adapter is not entered inside the lease');
  assert.equal(bulk70.imports,1);
 }finally{m.release();}
});

test('actual visible() imports Bulk70 by catalogue identity in its city block, before visibleNow and any source lease',()=>{
 // A function declaration: other scopes declare unrelated `visible` variables.
 let visible;(function visit(node){if(!visible&&ts.isFunctionDeclaration(node)&&node.name?.text==='visible')visible=node.getText(managerAST);ts.forEachChild(node,visit);})(managerAST);assert(visible,'actual Bremen manager visible()');
 const block=visible.slice(visible.indexOf('if(cityRouteModulesPending){'));
 const blockEnd=block.indexOf('cityRouteModulesPending=false;');assert(blockEnd>0);
 const call=block.indexOf('await prepareInfillFrankfurtLowOfficeBulk70Reconstruction(bulk70PreimportRows(city),signal,options.awaitPaintInitialization);current(signal,ticket);');
 assert(call>0&&call<blockEnd,'the Bulk70 pre-import completes before the city block is marked done');
 assert(visible.indexOf('if(cityRouteModulesPending){')<visible.indexOf('visibleNow('),'the city block precedes the visible source path');
 assert(!/nativeSources[!?]?\.(?:acquire|read)\(/.test(visible.slice(0,visible.indexOf('cityRouteModulesPending=false;'))),'no native source is acquired before or inside the city block');
 // loadSourceContent keeps its own call (the same wait adapter), after the lease.
 const load=declaration('loadSourceContent');
 assert(load.indexOf('options.nativeSources!.acquire(')<load.indexOf('await prepareInfillFrankfurtLowOfficeBulk70Reconstruction(raw.components,signal,options.awaitPaintInitialization)'));
});
