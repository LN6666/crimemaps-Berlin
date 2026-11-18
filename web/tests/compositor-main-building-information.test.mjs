import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';

// The actual main.ts metadata helpers (ensureBuildingInformation and its cache
// and page-store declarations) run against the actual Frozen paint-table
// session (frozen-paint-tables with its FrozenTableIngress reader and the actual
// initializer store), the actual byte transport, page ledger and chunk store.
// Fixtures: a one-table city manifest selected by the 'city' provider, the
// network reader behind boundedDataBytes, and the building-information import,
// whose module initializer requests that table like a TLA initializer.
const web=fileURLToPath(new URL('../',import.meta.url)),safety=path.join(web,'src/safety');
const mainFile=process.env.COMPOSITOR_MAIN_MAIN_TS??path.join(safety,'main.ts');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};};
const raw=new TextEncoder().encode(JSON.stringify({rows:[[1,2,3],[4,5,6]],label:'building information fixture'}));
const sha=createHash('sha256').update(raw).digest('hex');
const descriptor={path:`/safety/buildings3d/painted-tables/${sha.slice(0,2)}/${sha}.json`,sha256:sha,bytes:raw.length};
const initializer='painted/city/safety/progressive-paint-admissions.ts';
const providers=['root500','delegated500','tier300','church','city','infill','bremen'];
const dependencies={schema_version:1,providers:Object.fromEntries(providers.map(p=>[p,p==='city'?[sha]:[]])),initializers:Object.fromEntries(providers.map(p=>[p,p==='city'?{[sha]:{[initializer]:1}}:{}]))};
const fixtureModules={
  'virtual:crimemaps-city-data':'export default null;export const profileSHA256=null;export const buildingFocusRegistry=undefined;export const buildingDetailCatalog=undefined;',
  './deployment':"export const repositoryCity='berlin';",
  './frozen-paint-table-manifest.json':'export default '+JSON.stringify([descriptor])+';',
  './frozen-paint-table-dependencies.json':'export default '+JSON.stringify(dependencies)+';',
};
const entry=[
  "export {cityCacheIdleTiers} from './city-cache-retention';",
  "export * as tables from './frozen-paint-tables';",
  "export * as transport from './resource-byte-transport';",
  "export {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';",
].join('\n');
const bundleText=(await build({stdin:{contents:entry,resolveDir:safety,sourcefile:'building-information-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'silent',plugins:[{name:'building-information-inputs',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'building-information-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'building-information-fixture'},args=>({loader:'js',contents:fixtureModules[args.path]}));
}}]})).outputFiles[0].text;
let instance=0;
// A fresh module instance per case (initializer store, page singletons).
const load=()=>import('data:text/javascript;base64,'+Buffer.from(bundleText+'\n// building information '+(++instance)).toString('base64'));

const main=fs.readFileSync(mainFile,'utf8'),ast=ts.createSourceFile('main.ts',main,ts.ScriptTarget.Latest,true);
const names=new Set(['buildingInformation','buildingInformationPending','waitForBuildingInformation','ensureBuildingInformation','pageResourceProfile','pageResourceStore']);
const helperNodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)?names.has(n.name?.text):ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(ast))));
assert.equal(helperNodes.length,6,'the actual metadata helpers, their cache declarations and the page store helper of main.ts');
const helperSource=helperNodes.map(n=>n.getText(ast)).join('\n')+'\nexports.ensure=ensureBuildingInformation;exports.pageResourceStore=pageResourceStore;';
const helperCode=ts.transpileModule(helperSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;

async function fixture({mobile=false,mode='ok',gate}={}){
  const api=await load(),owner={},events=[],profiles=[];let created=0,infoImport;
  const page=options=>{profiles.push(options?.profile);return api.getPageChunkResourceStore(options,owner);};
  const transportModule={...api.transport,createResourceByteTransport:options=>{created++;events.push(['transport',options.namespace,options.resourceStore]);return api.transport.createResourceByteTransport(options);}};
  const state={mode,reads:0};let store;
  const require=name=>{
    if(name==='./frozen-paint-tables')return api.tables;
    if(name==='./resource-byte-transport')return transportModule;
    assert.equal(name,'./building-3d-information');events.push(['information-import']);
    // The module's initializer requests its table from the session that imports it.
    return infoImport??=api.tables.readFrozenTableAsync(sha,initializer).then(value=>({actual:true,value}));
  };
  const bindings={currentCity:'berlin',cityCacheIdleTiers:api.cityCacheIdleTiers,
    assetPath:p=>'/test-map'+p,matchMedia:query=>{assert.equal(query,'(max-width:760px)');return{matches:mobile};},getPageChunkResourceStore:page,
    boundedDataBytes:async(p,signal,max,policy)=>{
      assert.equal(p,'/test-map'+descriptor.path);assert.equal(max,raw.length);assert.equal(policy,'default');
      store??=api.getPageChunkResourceStore({},owner);
      state.reads++;events.push(['read',store.budget.stats.bytes,store.budget.stats.availabilityListeners]);
      if(gate)await gate.promise;signal.throwIfAborted();
      return state.mode==='bad'?new Uint8Array(raw.length):raw.slice();
    },
  };
  const exports={};
  new Function('require','exports',...Object.keys(bindings),helperCode)(require,exports,...Object.values(bindings));
  return{api,owner,events,profiles,state,exports,get created(){return created;},
    get store(){return store??=api.getPageChunkResourceStore({},owner);},
    get stats(){return api.tables.frozenPaintTableStats();}};
}
// The table working set the ingress admits for one read: verified input,
// digest/decoded-text working copy and the transport's two-copy read envelope.
const workingSet=3*raw.length+2*raw.length;
// What stays charged after the read: only the parsed module value's page-lifetime
// estimate, where the initializer store charges it (none before that adoption).
const parsedResidual=f=>f.stats.parsedRetention?.retainedParsedEstimateBytes??0;

test('the city metadata session reads its table through the page transport with the input and its read envelope on the page ledger, then returns them',async()=>{
  const f=await fixture({mobile:true});
  const info=await f.exports.ensure(new AbortController().signal);
  assert.equal(info.actual,true);assert.deepEqual(info.value,JSON.parse(new TextDecoder().decode(raw)));
  assert.equal(f.state.reads,1,'one read');
  const [,bytesAtRead,listeners]=f.events.find(row=>row[0]==='read');
  assert(bytesAtRead>=workingSet,'during the read the page ledger holds the table input and its read envelope ('+bytesAtRead+' >= '+workingSet+')');
  assert.equal(listeners,0,'the read waits for nothing');
  const [,namespace,resourceStore]=f.events.find(row=>row[0]==='transport');
  assert.equal(resourceStore,f.store,'the transport is on the page store');assert.equal(typeof namespace,'string');
  assert.deepEqual(f.profiles,['mobile'],'the page store is configured once, with this device\'s profile');
  assert.equal(f.stats.sessionActive,false,'the metadata session closes before any renderer session');
  f.store.evictRecent();
  assert.equal(f.store.budget.stats.bytes,parsedResidual(f),'every claim of the read returns');assert.equal(f.store.budget.stats.availabilityListeners,0);
  if(f.stats.parsedRetention)assert.equal(f.stats.parsedRetention.claims,1,'one page-lifetime value of the one parse');
  assert.equal(await f.exports.ensure(new AbortController().signal),info,'cached metadata starts no second session');assert.equal(f.state.reads,1);
});

test('the metadata entry configures the page ledger with the device profile, so the later 3D adapter on a mobile page shares it',async()=>{
  const f=await fixture({mobile:true});
  // review303 reaches this at module top level, before any 3D adapter exists.
  await f.exports.ensure(new AbortController().signal);
  const store=f.api.getPageChunkResourceStore({profile:'mobile'},f.owner);
  assert.equal(store,f.store,'the mobile 3D adapter receives the same page store');
  assert.equal(f.exports.pageResourceStore(),store,'main.ts hands that store on explicitly');
  assert.throws(()=>f.api.getPageChunkResourceStore({profile:'desktop'},f.owner),/already been configured/,'the ledger was configured as mobile, not the default profile');
  // The failure this avoids: a default-profile page ledger refuses the mobile adapter.
  const other={};f.api.getPageChunkResourceStore({},other);
  assert.throws(()=>f.api.getPageChunkResourceStore({profile:'mobile'},other),/already been configured/);
  const desktop=await fixture({mobile:false});await desktop.exports.ensure(new AbortController().signal);assert.deepEqual(desktop.profiles,['desktop']);
});

test('a failed verified input rejects; the retry reuses the page transport and its read returns every claim',async()=>{
  const f=await fixture({mode:'bad'});
  await assert.rejects(f.exports.ensure(new AbortController().signal),/hash mismatch/);
  assert.equal(f.stats.sessionActive,false);f.store.evictRecent();assert.equal(f.store.budget.stats.bytes,0,'a failed input returns its claim and parses nothing');
  f.state.mode='ok';const info=await f.exports.ensure(new AbortController().signal);assert.equal(info.actual,true);
  assert.equal(f.created,1,'one transport per page across attempts');assert.equal(f.state.reads,2);
  f.store.evictRecent();assert.equal(f.store.budget.stats.bytes,parsedResidual(f));
});

test('the owner\'s abort cancels the in-flight table read and returns its claims; an immediate retry completes',async()=>{
  const gate=deferred(),f=await fixture({gate}),owner=new AbortController();
  const first=f.exports.ensure(owner.signal),canceled=assert.rejects(first,{name:'AbortError'});
  for(let i=0;i<20&&!f.state.reads;i++)await settle();assert.equal(f.state.reads,1);
  assert(f.store.budget.stats.bytes>=workingSet,'charged while the read is in flight');
  owner.abort();await canceled;
  gate.resolve();for(let i=0;i<10;i++)await settle();f.store.evictRecent();
  assert.equal(f.store.budget.stats.bytes,0,'the cancelled read returns its input claim and envelope');
  const retry=await f.exports.ensure(new AbortController().signal);assert.equal(retry.actual,true);
  f.store.evictRecent();assert.equal(f.store.budget.stats.bytes,parsedResidual(f));assert.equal(f.store.budget.stats.availabilityListeners,0);
});

test('main.ts hands the one page store to the 3D adapter and passes it with readiness to the page installers',()=>{
  const calls=(callee,property)=>{const out=[];(function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)===callee&&node.arguments[0]&&ts.isObjectLiteralExpression(node.arguments[0])){const row=node.arguments[0].properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)===property);out.push(row?.initializer.getText(ast));}ts.forEachChild(node,visit);})(ast);return out;};
  assert.deepEqual(calls('installThreeDimensionalMap','resourceStore'),['pageResourceStore()']);
  assert.deepEqual(calls('module.installEnvironmentScene','resourceStore'),['threeDimensional!.resourceStore']);
  assert.deepEqual(calls('installThreeDimensionalScenery','resourceStore'),['threeDimensional.resourceStore']);
  for(const callee of ['module.installEnvironmentScene','installThreeDimensionalScenery']){
    assert.deepEqual(calls(callee,'ensureRead'),['(signal:AbortSignal)=>threeDimensional!.ensureReady(signal)'],callee+' awaits the 3D owner\'s readiness before it admits');
    assert.deepEqual(calls(callee,'read'),['(asset,signal,max,admitted?:ResourceByteAcquireOptions)=>threeDimensional!.readAsset(asset,signal,max,admitted)'],callee+' forwards the fourth argument');
  }
});
