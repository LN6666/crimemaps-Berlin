import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const web=fileURLToPath(new URL('../',import.meta.url));
const rootDir=path.join(web,'src/painted/root500/safety');
const bremenDir=path.join(web,'src/painted/bremen/safety');
const registryPath=path.join(rootDir,'owner-nonberlin-lazy');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const parse=(file,text)=>ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const evaluate=(text,require)=>{const exports={};Function('require','exports',transpile(text))(require,exports);return exports;};

// Read only these bounded routing/manager files. Every original full builder is
// intercepted by the fixture require function; neither proxies nor model tables
// are opened. The production registry and lazy helper execute without rewriting.
// ROOT ruling (DECISIONS 2026-11-02 04:29 [3]): the canonical aggregate imports
// the four Bremen originals (F257/F259/F261/F274) directly; the other 81 routes
// are bound to the owner-nonberlin-lazy registry singleton. The registry keeps
// all 85 routes (its prepareNonBerlinOwnerRoutes still prepares Bremen rows).
const [registryText,helperText,ownerText,managerText,canonicalText]=await Promise.all([
 readFile(registryPath+'.ts','utf8'),readFile(path.join(rootDir,'lazy-owner-route.ts'),'utf8'),
 readFile(path.join(bremenDir,'owner-reconstruction.ts'),'utf8'),readFile(path.join(bremenDir,'three-dimensional-map.ts'),'utf8'),
 readFile(path.join(rootDir,'owner-reconstruction.ts'),'utf8'),
]);
const registryAST=parse('registry.ts',registryText),ownerAST=parse('canonical-owner.ts',canonicalText),bremenOwnerAST=parse('bremen-owner.ts',ownerText),managerAST=parse('manager.ts',managerText);
const sharedAggregate=bremenOwnerAST.statements.find(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='../../root500/safety/owner-reconstruction');
assert(sharedAggregate,'Bremen must use the canonical root500 aggregate');
const sharedNames=new Map(sharedAggregate.importClause.namedBindings.elements.map(element=>[element.name.text,(element.propertyName??element.name).text]));
for(const [local,original]of [['frozenOwnerReconstructionComponents','ownerReconstructionComponents'],['frozenOwnerReconstructionBaseMaterials','ownerReconstructionBaseMaterials'],['frozenOwnerReconstructionIdentity','ownerReconstructionIdentity']])assert.equal(sharedNames.get(local),original);
const variables=new Map();
(function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))variables.set(node.name.text,node.initializer);ts.forEachChild(node,visit);})(registryAST);
const property=(node,name)=>node.properties.find(p=>p.name?.getText(registryAST)===name)?.initializer;
const routes=variables.get('routes').elements.map(row=>{
 const city=property(row,'city').text,routeName=property(row,'prepare').expression.text,factory=variables.get(routeName);
 assert(ts.isCallExpression(factory)&&factory.expression.getText(registryAST)==='createLazyOwnerRoute');
 const reconstruct=factory.arguments[0].text,prefix=reconstruct.replace(/Reconstruction$/,''),identity=prefix+'Identity',materials=prefix+'BaseMaterials';
 let module;
 (function visit(node){if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)module=node.arguments[0].text;ts.forEachChild(node,visit);})(factory.arguments[3]);
 assert(module,'Dynamic original module must be explicit');
 const ids=JSON.parse(variables.get(prefix.replace(/^owner/,'')+'_IDS').getText(registryAST));
 return{city,routeName,reconstruct,identity,materials,module,ids,copyNoMatch:factory.arguments[2].kind===ts.SyntaxKind.TrueKeyword};
});
assert.equal(routes.length,85);
const names=routes.flatMap(route=>[route.identity,route.reconstruct,route.materials]),nameSet=new Set(names);
assert.equal(nameSet.size,255);
const selectedImports=ownerAST.statements.filter(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(element=>nameSet.has(element.name.text)));
assert.equal(selectedImports.length,85,'The fixture must execute all 85 imports in Bremen\'s canonical aggregate');
const selectedNames=selectedImports.flatMap(node=>node.importClause.namedBindings.elements.map(element=>element.name.text));
// Exactly one extra binding rides on these imports: the F257 construction
// retirement capability, imported under the aggregate's own local name.
const extraBindings=selectedImports.flatMap(node=>node.importClause.namedBindings.elements.filter(element=>!nameSet.has(element.name.text)).map(element=>[node.moduleSpecifier.text,(element.propertyName??element.name).text,element.name.text]));
assert.deepEqual(extraBindings,[['./owner-f257-reconstruction','retireRoot500Construction','retireF257Construction']]);
assert.deepEqual(selectedNames.filter(name=>nameSet.has(name)).sort(),[...names].sort());
const registrySpecifier='./owner-nonberlin-lazy',importSource=new Map(selectedImports.flatMap(node=>node.importClause.namedBindings.elements.map(element=>[element.name.text,node.moduleSpecifier.text])));
const prepareExport=bremenOwnerAST.statements.find(node=>ts.isExportDeclaration(node)&&node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(element=>element.name.text==='prepareNonBerlinOwnerRoutes'));
assert(prepareExport,'Actual Bremen owner must export the shared prepare hook');
const bremenRoutes=routes.filter(route=>route.city==='bremen'),lazyRoutes=routes.filter(route=>route.city!=='bremen');
assert.deepEqual(bremenRoutes.map(route=>route.reconstruct),['ownerF257Reconstruction','ownerF259Reconstruction','ownerF274Reconstruction','ownerF261Reconstruction']);
assert.equal(lazyRoutes.length,81);
for(const route of lazyRoutes)for(const name of [route.identity,route.reconstruct,route.materials])assert.equal(importSource.get(name),registrySpecifier,name+' is bound to the registry singleton');
for(const route of bremenRoutes)for(const name of [route.identity,route.reconstruct,route.materials])assert.equal(importSource.get(name),route.module,name+' is a direct import of its Bremen original');
// Static evaluation order of the four direct Bremen originals in the aggregate.
const staticBremenModules=selectedImports.map(node=>node.moduleSpecifier.text).filter(name=>name!==registrySpecifier);
assert.deepEqual([...staticBremenModules].sort(),bremenRoutes.map(route=>route.module).sort());

function fixture({oldEagerRoute=false}={}){
 // `loads` lists module evaluations (each module evaluates once, as in ESM);
 // `requests` lists every require/import() of a module, cached or not.
 const loads=[],requests=[],reconstructionCalls=[],materialCalls=[],modules=new Map(),evaluated=new Set();
 for(const route of routes){
  const reconstruct=components=>{reconstructionCalls.push({route,components});return{components,stats:{fixture:route.reconstruct}};};
  const baseMaterials=(components,paint,frames)=>{materialCalls.push({route,components,paint,frames});paint[0]=.25;frames[0]=.5;return{objects:1,vertices:1,actualVisualAccepted:false};};
  modules.set(route.module,{[route.identity]:component=>route.ids.some(id=>id.objectId===component.objectId&&id.partId===component.partId),[route.reconstruct]:reconstruct,[route.materials]:baseMaterials,...(route.reconstruct==='ownerF257Reconstruction'?{retireRoot500Construction(){}}:{})});
 }
 const load=name=>{assert(modules.has(name),'Original full module must be a virtual builder: '+name);requests.push(name);if(!evaluated.has(name)){evaluated.add(name);loads.push(name);}return modules.get(name);};
 const helper=evaluate(helperText,()=>{throw Error('Unexpected value dependency in lazy route helper');});
 const registry=evaluate(registryText,name=>name==='./lazy-owner-route'?helper:load(name));
 const imports=selectedImports.map(node=>{
  if(oldEagerRoute&&node.importClause.namedBindings.elements.some(element=>element.name.text==='ownerF055Reconstruction'))return node.getText(ownerAST).replace(node.moduleSpecifier.getText(ownerAST),JSON.stringify('./owner-f055-reconstruction'));
  return node.getText(ownerAST);
 });
 const owner=evaluate(imports.join('\n')+'\nexport {'+names.join(',')+'};\n'+prepareExport.getText(bremenOwnerAST),name=>{
  if(name==='./owner-nonberlin-lazy'||path.resolve(bremenDir,name)===registryPath)return registry;
  // Deliberately support the former eager path with a tiny virtual module. A
  // reverted production import therefore increments loads before any prepare.
  return load('./'+path.basename(name));
 });
 const rows=routes.map(route=>({...route.ids[0],city:'bremen',batches:[],sourceFeature:{},componentGeometry:{type:'Polygon'}}));
 return{owner,registry,loads,requests,modules,rows,reconstructionCalls,materialCalls};
}
const assertLazyBindings=f=>{
 assert.deepEqual(f.loads,staticBremenModules,'Bremen owner imports must not evaluate any full builder other than its four direct Bremen originals');
 for(const route of lazyRoutes)for(const name of [route.identity,route.reconstruct,route.materials])assert.equal(f.owner[name],f.registry[name],name+' must use the root singleton');
 for(const route of bremenRoutes)for(const name of [route.identity,route.reconstruct,route.materials])assert.equal(f.owner[name],f.modules.get(route.module)[name],name+' is the direct Bremen original');
 assert.equal(f.owner.prepareNonBerlinOwnerRoutes,f.registry.prepareNonBerlinOwnerRoutes);
};
const zeroStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};

test('Bremen canonical aggregate binds 81 routes to the lazy singleton and imports its four Bremen originals directly; the former eager edge fails the guard',()=>{
 assertLazyBindings(fixture());
 const old=fixture({oldEagerRoute:true});assert(old.loads.includes('./owner-f055-reconstruction'));assert.deepEqual(old.loads.filter(name=>name!=='./owner-f055-reconstruction'),staticBremenModules);assert.throws(()=>assertLazyBindings(old),/must not evaluate any full builder/);
});

test('Bremen prepares only its four routes; the other 81 retain synchronous no-match/copy/material contracts',async()=>{
 const f=fixture();assertLazyBindings(f);
 const before=f.requests.length;await f.owner.prepareNonBerlinOwnerRoutes(f.rows,signal());
 assert.deepEqual(f.requests.slice(before),bremenRoutes.map(route=>route.module),'the registry prepares exactly the four Bremen routes');
 assert.deepEqual(f.loads,staticBremenModules,'the Bremen originals were already evaluated by the static imports');
 for(const route of lazyRoutes){
  const output=f.owner[route.reconstruct](f.rows);assert.equal(output instanceof Promise,false);assert.deepEqual(output.stats,zeroStats);assert.deepEqual(output.components,f.rows);assert.equal(output.components===f.rows,!route.copyNoMatch);for(let i=0;i<f.rows.length;i++)assert.equal(output.components[i],f.rows[i]);
  const paint=new Float32Array([.75]),frames=new Float32Array([.875]);assert.deepEqual(f.owner[route.materials](f.rows,paint,frames),{objects:0,vertices:0,actualVisualAccepted:false});assert.deepEqual([...paint],[.75]);assert.deepEqual([...frames],[.875]);
 }
 assert.deepEqual(f.loads,staticBremenModules);assert.equal(f.reconstructionCalls.length,0);assert.equal(f.materialCalls.length,0);
 const requests=f.requests.length;await f.registry.prepareNonBerlinOwnerRoutes(f.rows,signal());assert.equal(f.loads.length,4);assert.equal(f.requests.length,requests,'Root and Bremen share prepared route state');
});

test('each matching city delegates to its original virtual builder and preserves exact material argument references',async()=>{
 const f=fixture();
 for(const city of new Set(routes.map(route=>route.city))){
  const selected=routes.filter(route=>route.city===city),rows=selected.map(route=>({...route.ids[0],batches:[]})),before=f.loads.length;
  await f.owner.prepareNonBerlinOwnerRoutes(rows,signal());assert.deepEqual(f.loads.slice(before),city==='bremen'?[]:selected.map(route=>route.module));
  for(const route of selected){
   const result=f.owner[route.reconstruct](rows);assert.equal(result.components,rows);assert.equal(result.stats.fixture,route.reconstruct);assert.equal(f.reconstructionCalls.at(-1).components,rows);
   const paint=new Float32Array(1),frames=new Float32Array(1);assert.deepEqual(f.owner[route.materials](rows,paint,frames),{objects:1,vertices:1,actualVisualAccepted:false});const call=f.materialCalls.at(-1);assert.equal(call.components,rows);assert.equal(call.paint,paint);assert.equal(call.frames,frames);assert.equal(paint[0],.25);assert.equal(frames[0],.5);
  }
 }
 assert.equal(f.loads.length,85);assert.equal(new Set(f.loads).size,85);
});

// The registry's Bremen route state (what prepareNonBerlinOwnerRoutes waits on) is
// observed through the registry facade; the aggregate's Bremen bindings are the
// directly imported originals and need no preparation.
test('a cancelled Bremen waiter cannot publish late; a new waiter reuses the original pending import',async()=>{
 const f=fixture(),gate=deferred(),controller=new AbortController(),wait=async operation=>{const value=await operation;await gate.promise;return value;},before=f.requests.length;
 const pending=f.owner.prepareNonBerlinOwnerRoutes(f.rows,controller.signal,wait);await tick();assert.deepEqual(f.requests.slice(before),[bremenRoutes[0].module]);controller.abort();await assert.rejects(pending,{name:'AbortError'});gate.resolve();await tick();assert.throws(()=>f.registry[bremenRoutes[0].reconstruct](f.rows),/not prepared/);
 await f.owner.prepareNonBerlinOwnerRoutes(f.rows,signal());assert.deepEqual(f.requests.slice(before),bremenRoutes.map(route=>route.module),'the new waiter reuses the first pending import');assert.equal(f.registry[bremenRoutes[0].reconstruct](f.rows).stats.fixture,bremenRoutes[0].reconstruct);
 assert.deepEqual(f.loads,staticBremenModules);assert.equal(f.owner[bremenRoutes[0].reconstruct](f.rows).stats.fixture,bremenRoutes[0].reconstruct);
});

test('one cancelled Bremen observer leaves the second observer of the singleton import active',async()=>{
 const f=fixture(),gate=deferred(),controller=new AbortController(),wait=async operation=>{const value=await operation;await gate.promise;return value;},before=f.requests.length;
 const cancelled=f.owner.prepareNonBerlinOwnerRoutes(f.rows,controller.signal,wait),active=f.registry.prepareNonBerlinOwnerRoutes(f.rows,signal(),wait);await tick();assert.equal(f.requests.length-before,1);controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.throws(()=>f.registry[bremenRoutes[0].reconstruct](f.rows),/not prepared/);gate.resolve();await active;assert.deepEqual(f.requests.slice(before),bremenRoutes.map(route=>route.module));
});

// The actual manager: its source production (loadSourceContent) runs Bulk70, then
// the city route preparation, before profile/shadow admission and before the
// source content is published to the wanted-source cache. Shard rows are produced
// by the actual wanted-source declaration over the real page resource store, as in
// bremen-owner-manager.test.mjs; the native source client is a tiny verified leaf.
const managerFunctions=new Map(),managerVariables=new Map();
(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)managerFunctions.set(node.name.text,node);if(ts.isVariableStatement(node))for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name)&&!managerVariables.has(item.name.text))managerVariables.set(item.name.text,node);ts.forEachChild(node,visit);})(managerAST);
for(const name of ['shard','loadSourceContent','sourceResourceKey','sourceContentKey','bindSourceContent'])assert(managerFunctions.has(name),'the actual manager declares '+name);
assert(managerVariables.has('wantedSources'));
const ownerImport=managerAST.statements.find(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./owner-reconstruction'&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(element=>element.name.text==='prepareNonBerlinOwnerRoutes'));
assert(ownerImport,'Actual manager must import the owner prepare hook');
const managerJS=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sourceDeclarations=[...['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','shard'].map(name=>managerFunctions.get(name).getText(managerAST)),managerVariables.get('wantedSources').getText(managerAST)].join('\n');
const pageRuntime=createSourceModules({allow:id=>['safety/viewport-request','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/program-preparation','safety/render-runtime/pressure-availability','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/diagnostic-snapshot'].includes(id)});
const {createWantedResourceLeases}=pageRuntime.load('safety/viewport-request'),{createChunkResourceStore}=pageRuntime.load('safety/render-runtime/chunk-resource-store'),{createResourceBudget,ResourceBudgetExceededError}=pageRuntime.load('safety/render-runtime/resource-budget');
async function until(predicate,label){for(let i=0;i<200;i++){if(predicate())return;await tick();}assert.fail(label);}
function managerFixture({ownerProfile=false,bulkGate=deferred(),cityGate=deferred()}={}){
 const f=fixture(),calls=[],nativeReleases=[],resources=createChunkResourceStore({budget:createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 const wait=async operation=>{const value=await operation;await cityGate.promise;return value;},descriptor={id:'fixture',tile_key:'fixture',path:'/fixture',sha256:'fixture',bytes:1,vertices:0};
 const raw={schema_version:1,city:'bremen',components:f.rows,decodedPayloadCost:{retainedPayloadEstimateBytes:32}};
 const nativeSources={resources,ownerKey:'bremen:fixture-owner',async acquire(leaf,requestSignal,maxVertices,role){
   requestSignal.throwIfAborted();calls.push('fetch');assert.equal(leaf,descriptor);assert.equal(role,'dependency');
   const parent=resources.acquire({contentKey:JSON.stringify(['fixture-native-leaf',leaf.tile_key,leaf.sha256]),role:'source',allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'exact'},produce:()=>({raw})});
   await parent.ready;let released=false;
   return{raw,verified:{fixture:true},physicalBytes:leaf.bytes,retainResource:held=>parent.retain(held),release(){if(released)return;released=true;nativeReleases.push(leaf.tile_key);parent.release();}};
  },destroy(){}};
 const values={resourceContentKey,resources,createWantedResourceLeases,ResourceBudgetExceededError,city:'bremen',maxVertices:200000,mobile:false,loadCount:0,
  manifestSHA:'manifest',manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'fixture'},compiler_sha256:'compiler',source_snapshot:'snapshot'},sourceOwnerKey:'bremen:fixture-owner',sourceDiagnostics:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),
  options:{awaitPaintInitialization:wait,nativeSources},
  prepareBremenInfillOwnerRouteModules:async()=>{},
  prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async(components,requestSignal,adapter)=>{calls.push('bulk70');assert.equal(components,f.rows);assert.equal(adapter,wait);requestSignal.throwIfAborted();await bulkGate.promise;},
  prepareNonBerlinOwnerRoutes:async(components,requestSignal,adapter)=>{calls.push('city');assert.equal(components,f.rows);assert.equal(adapter,wait);await f.owner.prepareNonBerlinOwnerRoutes(components,requestSignal,adapter);},
  ownerShapePatchProfile:()=>{calls.push('profile-admission');return ownerProfile?{}:undefined;},verifyOwnerShapePatchRows:()=>calls.push('verify-profile'),ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),
  shadowAdmissionForDecodedShard:()=>{calls.push('shadow-admission');},THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024,mobile:1024},estimateRetainedBuildingPayload:()=>{throw Error('no shadow payload in this fixture');},shadowByShard:new WeakMap(),sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:async()=>calls.push('source-role')};
 const scope=new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 const actual=Function('scope','with(scope){'+managerJS(sourceDeclarations)+'\nreturn {shard,wantedSources,sourceResourceKey};}')(scope),key=actual.sourceResourceKey(descriptor);
 return{...f,...actual,values,calls,nativeReleases,resources,bulkGate,cityGate,descriptor,
  // The manager registers its wanted set before it reads any shard; withdrawing it cancels the production.
  want:()=>actual.wantedSources.reconcile([{leaf:descriptor,contentKey:key}]),withdraw:()=>actual.wantedSources.reconcile([]),
  get productions(){return values.loadCount;}};
}
const registryBremenRequests=m=>m.requests.filter(name=>bremenRoutes.some(route=>route.module===name)).length-staticBremenModules.length;
for(const ownerProfile of [false,true]){
 const branch=ownerProfile?'profile':'ordinary';
 test(`actual Bremen ${branch} shard awaits Bulk70 then the real city gate before admission/cache`,async()=>{
  const m=managerFixture({ownerProfile});m.want();const pending=m.shard(m.descriptor,signal());
  await until(()=>m.calls.includes('bulk70'),'Bulk70 starts');for(let i=0;i<4;i++)await tick();
  assert.deepEqual(m.calls,['fetch','bulk70']);assert.equal(registryBremenRequests(m),0);assert.equal(m.productions,0);
  m.bulkGate.resolve();await until(()=>m.calls.includes('city'),'the city gate starts');await tick();
  assert.deepEqual(m.calls,['fetch','bulk70','city']);assert.equal(registryBremenRequests(m),1,'the first Bremen route import waits on the city gate');assert.equal(m.productions,0,'nothing is published while the city gate waits');
  m.cityGate.resolve();assert.equal(await pending,m.rows);assert.equal(registryBremenRequests(m),4);assert.equal(m.productions,1);
  assert(m.calls.indexOf('profile-admission')>m.calls.indexOf('city'));assert(m.calls.includes(ownerProfile?'verify-profile':'shadow-admission'));
  assert.equal(m.loads.length,4,'only the four static Bremen originals were ever evaluated');
  m.withdraw();
 });
 test(`actual Bremen ${branch} shard aborts after Bulk70 before entering the city gate`,async()=>{
  const m=managerFixture({ownerProfile}),controller=new AbortController();m.want();const pending=m.shard(m.descriptor,controller.signal);void pending.catch(()=>{});
  await until(()=>m.calls.includes('bulk70'),'Bulk70 starts');
  controller.abort();m.withdraw();m.bulkGate.resolve();await assert.rejects(pending,{name:'AbortError'});for(let i=0;i<6;i++)await tick();
  assert.deepEqual(m.calls,['fetch','bulk70']);assert.equal(registryBremenRequests(m),0);assert.equal(m.productions,0);assert.equal(m.resources.stats.resources,0,'withdrawn demand returns the native leaf');assert.deepEqual(m.nativeReleases,['fixture']);
 });
 test(`actual Bremen ${branch} shard cannot admit a cancelled city preparation or its late import`,async()=>{
  const m=managerFixture({ownerProfile}),controller=new AbortController();m.want();const pending=m.shard(m.descriptor,controller.signal);void pending.catch(()=>{});m.bulkGate.resolve();
  await until(()=>m.calls.includes('city'),'the city gate starts');assert.deepEqual(m.calls,['fetch','bulk70','city']);
  controller.abort();m.withdraw();await assert.rejects(pending,{name:'AbortError'});m.cityGate.resolve();for(let i=0;i<6;i++)await tick();
  assert.equal(m.productions,0);assert.deepEqual(m.calls,['fetch','bulk70','city']);assert.throws(()=>m.registry[bremenRoutes[0].reconstruct](m.rows),/not prepared/);assert.equal(m.resources.stats.resources,0);
 });
 test(`actual Bremen ${branch} shard cannot admit a failed city preparation`,async()=>{
  const m=managerFixture({ownerProfile}),failure=new Error('controlled city table session failure');m.want();const pending=m.shard(m.descriptor,signal());void pending.catch(()=>{});m.bulkGate.resolve();
  await until(()=>m.calls.includes('city'),'the city gate starts');assert.deepEqual(m.calls,['fetch','bulk70','city']);m.cityGate.reject(failure);
  // The page store hands waiters a bounded copy of a production failure (same name and message; it keeps no reference to the original).
  await assert.rejects(pending,error=>error instanceof Error&&error.name===failure.name&&error.message===failure.message);assert.equal(m.productions,0);assert.deepEqual(m.calls,['fetch','bulk70','city']);assert.throws(()=>m.registry[bremenRoutes[0].reconstruct](m.rows),/not prepared/);
  m.withdraw();
 });
}
