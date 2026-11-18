import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import {web,staticClosure,nonBerlinOwnerRoutes,providerEntries,viteChunkRules,productionChunk} from './support/owner-lazy-closure.mjs';
import {registryFile,aggregateFile,aggregateBindings,registryContracts,bundleAggregate,bundleRegistry} from './support/owner-lazy-fixtures.mjs';
import {stageWrapperRoutes} from './support/owner-lazy2-virtual.mjs';

// The 81 certified non-Bremen city builders are reached only through the
// registry's dynamic imports, and the production build gives each one a chunk of
// its own. The canonical aggregate loads the builders a batch needs in one
// parallel module wave before its first stage, then prepares each stage's
// batch-scope data and passes that scope through the registry facade;
// synchronous reconstruction uses only an already loaded module.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const sha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const contracts=await registryContracts(),unrelated=contracts.filter(route=>route.city!=='bremen'),unrelatedKeys=new Set(unrelated.map(route=>route.moduleKey));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
// Imports of the 81 lazy originals only (the Bremen four load with the aggregate).
const lazyLoads=state=>state.loads.filter(key=>unrelatedKeys.has(key));
// The 35 stage builders the canonical aggregate binds through owner-*-lazy
// wrappers are lazy in the same way (the infill aggregate binds the same wrappers
// and the registry facades instead of its re-export shims).
const stageWrappers=await stageWrapperRoutes();
// The one allowed static edge: the infill renderer's Frankfurt HBF075 replacement
// wraps the F137 builder itself (an infill module, not the infill aggregate).
const infillRenderer='infill/building-mesh-renderer.ts',infillF137Owner=path.join(web,'src/painted/infill/safety/infill-frankfurt-hbf075.ts');
const allowedEager=(entry,route,closure)=>entry.label===infillRenderer&&route.routeName==='ownerF137Route'&&closure.route(route.file).includes(path.relative(web,infillF137Owner)+' -> ');
// Every manager and renderer module painted-map loads for some city.
const entries=providerEntries.map(entry=>({...entry,label:entry.provider+'/'+entry.name}));
const closureCache=new Map();let closures;
const entryClosures=()=>closures??=(async()=>{const out=new Map();for(const entry of entries)out.set(entry,await staticClosure([entry.file],{cache:closureCache}));return out;})();

test('every provider manager and renderer that painted-map loads keeps all 81 unrelated certified builders and the 35 stage originals out of its static closure',async t=>{
 assert.equal(contracts.length,85);assert.equal(unrelated.length,81);assert.equal(entries.length,14);assert.equal(stageWrappers.length,35);
 const report={};
 for(const [entry,closure]of await entryClosures()){
  const eager=unrelated.filter(route=>closure.has(route.file)),allowed=eager.filter(route=>allowedEager(entry,route,closure)),stage=stageWrappers.filter(wrapper=>closure.has(wrapper.original));
  let eagerBytes=0;for(const route of eager)eagerBytes+=closure.sizes.get(route.file);
  report[entry.label]={modules:closure.parents.size,bytes:closure.bytes,unrelatedBuilders:eager.length,unrelatedBytes:eagerBytes,stageOriginals:stage.length};
  for(const route of eager)if(!allowed.includes(route))assert.fail('Eager unrelated certified builder: '+closure.route(route.file));
  for(const wrapper of stage)assert.fail('Eager stage original: '+closure.route(wrapper.original));
  if(allowed.length)t.diagnostic(entry.label+' allowed static edge: '+closure.route(allowed[0].file));
  if(entry.label==='root500/building-mesh-renderer.ts'||entry.label===infillRenderer||entry.provider==='bremen'){
   assert(closure.has(registryFile),entry.label+' must bind the lazy registry');
   const lazy=new Set(closure.dynamic.get(registryFile));for(const route of contracts)assert(lazy.has(route.specifier),'Lazy original import for '+route.routeName);
   for(const wrapper of stageWrappers){assert(closure.has(wrapper.file),entry.label+' must bind '+wrapper.specifier);assert((closure.dynamic.get(wrapper.file)??[]).includes('./'+wrapper.originalKey),'Lazy original import for '+wrapper.specifier);}
  }
 }
 t.diagnostic('static closures: '+JSON.stringify(report));
});

test('production manual chunks give each lazy original an initializer chunk that no statically reachable module shares',async t=>{
 // A lazy original moved out of frozen-initializer-chunks.json would join a
 // paint-<provider>-<n> bucket with static members and load eagerly again.
 const config=(await readFile(path.join(web,'vite.config.ts'),'utf8')).split('\n').map(line=>line.trim()),at=viteChunkRules.map(rule=>config.indexOf(rule));
 for(const [index,rule]of viteChunkRules.entries())assert(at[index]>=0,'vite.config.ts manual-chunk rule changed: '+rule);
 assert(at[1]<at[2]&&at[2]<at[3]&&at[3]<at[4],'initializer chunks are chosen before the owner buckets');
 const initializers=new Set(JSON.parse(await readFile(path.join(web,'frozen-initializer-chunks.json'),'utf8'))),eagerChunks=new Map();
 for(const [entry,closure]of await entryClosures()){
  const allowed=new Set(unrelated.filter(route=>closure.has(route.file)&&allowedEager(entry,route,closure)).map(route=>route.file));
  for(const file of closure.parents.keys()){if(allowed.has(file))continue;const chunk=productionChunk(file,initializers);if(chunk&&!eagerChunks.has(chunk))eagerChunks.set(chunk,entry.label+': '+path.relative(web,file));}
 }
 const own=new Set();
 for(const route of unrelated){
  const chunk=productionChunk(route.file,initializers);
  assert(chunk?.startsWith('init-'),route.routeName+' must stay listed in frozen-initializer-chunks.json');
  assert(!eagerChunks.has(chunk),route.routeName+' shares its production chunk with '+eagerChunks.get(chunk));
  assert(!own.has(chunk),route.routeName+' has a chunk of its own');own.add(chunk);
 }
 for(const wrapper of stageWrappers){
  const chunk=productionChunk(wrapper.original,initializers);
  assert(chunk?.startsWith('init-'),wrapper.originalKey+' must stay listed in frozen-initializer-chunks.json');
  assert(!eagerChunks.has(chunk),wrapper.originalKey+' shares its production chunk with '+eagerChunks.get(chunk));
  assert(!own.has(chunk),wrapper.originalKey+' has a chunk of its own');own.add(chunk);
 }
 t.diagnostic(JSON.stringify({lazyOriginals:own.size,staticManualChunks:eagerChunks.size}));
});

test('every registry facade keeps the identity, demand, scope arity and no-match container of its original builder',async()=>{
 const text=await readFile(registryFile,'utf8');
 for(const route of contracts){
  const source=await readFile(route.file,'utf8'),ast=ts.createSourceFile(route.file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),declarations=new Map();
  (function visit(node){if((ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node))&&node.name&&ts.isIdentifier(node.name))declarations.set(node.name.text,node);ts.forEachChild(node,visit);})(ast);
  const label=path.basename(route.file),initializer=name=>declarations.get(name)?.initializer?.getText(ast);
  // Identity: the registry predicate and table are the original ones.
  assert.equal(initializer(route.identity),route.identityText,label+' identity predicate');
  assert.deepEqual(JSON.parse(initializer(route.table)),route.ids,label+' identity table');
  // Scope arity: reconstruction takes the scope after its one original argument; materials take none.
  const arities=JSON.parse(initializer('root500DataFunctionArities'));
  assert([undefined,1].includes(arities[route.reconstruct]),label+' reconstruction arity');assert.equal(arities[route.materials],undefined,label+' material arity');
  const reconstruct=declarations.get(route.reconstruct);assert(reconstruct&&ts.isFunctionDeclaration(reconstruct),label);
  assert.deepEqual(reconstruct.parameters.map(p=>p.getText(ast)),['components:BuildingComponent[]','$scope?:FrozenDataScope'],label+' reconstruction parameters');
  // No-match container: the same array or a map copy, exactly as the facade's flag.
  const body=reconstruct.body.getText(ast),empty='{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]}';
  assert(body.startsWith(`{if(!mayMatchRoot500Data(components)){const stats:OwnerReconstructionStats=${empty};return{components:${route.copyNoMatch?'components.map(component=>component)':'components'},stats:stats};}`),label+' no-match container');
  // Demand: whenever no row is needed by the facade, the original takes that no-match return.
  const demand=JSON.parse(initializer('__root500Demand')),keys=new Set(route.ids.map(id=>id.objectId+'|'+id.partId));
  for(const row of demand)assert(row.partId!==null&&keys.has(row.objectId+'|'+row.partId),label+' demand outside its identity table');
  const may=declarations.get('mayMatchRoot500Data').body.getText(ast),tail='&&__root500Demand.some(identity=>identity.objectId===component.objectId&&(identity.partId===null||identity.partId===component.partId)));}';
  if(route.neededCity)assert.equal(may,`{return components.some(component=>[${JSON.stringify(route.neededCity)}].includes(component.city)${tail}`,label+' city demand');
  else{assert(route.cityAware);assert.equal(may,`{return components.some(component=>true${tail}`,label+' city-agnostic demand');assert(body.includes(`const stats:OwnerReconstructionStats=${empty};if(!components.some(${route.identity}))return{components,stats};`),label+' identity guard before any data use');}
  // Materials: every write and count is guarded by the facade's needed identity.
  const materials=declarations.get(route.materials),match=materials.body.getText(ast).match(/const match=([^;]+);/);assert(match,label+' material match');
  assert(new RegExp(`^${route.neededCity?`c\\.city==='${route.neededCity}'&&`:''}${route.identity}\\(c\\)&&!!c\\.displayEstimates\\?\\.\\w+$`).test(match[1]),label+' material guard '+match[1]);
  (function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='set'&&['paint','frames'].includes(node.expression.expression.getText(ast))){let guarded=false;for(let parent=node.parent;parent&&parent!==materials;parent=parent.parent)if(ts.isIfStatement(parent)&&parent.expression.getText(ast)==='match')guarded=true;assert(guarded,label+' unguarded material write');}ts.forEachChild(node,visit);})(materials.body);
  assert(text.includes(`const ${route.routeName}=createLazyOwnerRoute(${JSON.stringify(route.reconstruct)},${route.neededText},${route.copyNoMatch},()=>import('${route.specifier}').then(m=>({reconstruct:m.${route.reconstruct},baseMaterials:m.${route.materials}})),()=>import('${route.specifier}'));`),label+' registry route');
 }
});

test('the actual registry imports an original once, only for needed rows or a warmed city and never for Bremen, and keeps cancellation, refusal and retry exact',async()=>{
 const f=await bundleRegistry(),{registry,loader}=f,scope={label:'batch scope'},timers=[globalThis.setTimeout,globalThis.setInterval];
 globalThis.setTimeout=globalThis.setInterval=()=>{throw Error('owner routes must not use timers');};
 try{
  assert.equal(f.dynamicImports,170,'one builder mapping and one scoped original import per route');
  for(const route of contracts)assert.equal(registry.root500DataFunctionArities[route.reconstruct],1),assert.equal(registry.root500DataFunctionArities[route.materials],3);
  const [hamburg,cityAware,munich]=[contracts.find(r=>r.city==='hamburg'&&r.copyNoMatch),contracts.find(r=>r.cityAware),contracts.find(r=>r.city==='munich')];
  const row=(route,id=route.ids[0],extra={})=>({city:route.neededCity??id.city,objectId:id.objectId,partId:id.partId,batches:[{positions:[0,0,0,1,0,0,0,1,0]}],...extra});
  const calls=[],original=(route,overrides={})=>({[route.reconstruct]:(...args)=>{calls.push([route.reconstruct,args]);return{components:args[0],stats:{fixture:route.reconstruct}};},[route.materials]:(...args)=>{calls.push([route.materials,args]);return{objects:1,vertices:1,actualVisualAccepted:false};},root500DataFunctionArities:{[route.reconstruct]:1},prepareRoot500Data:(...args)=>{calls.push(['prepare:'+route.reconstruct,args]);},...overrides});
  // Cold rows: same identity in another city, another part, an unrelated row.
  for(const route of [hamburg,cityAware]){
   const cold=[row(route,route.ids[0],{city:'berlin'}),row(route,{...route.ids[0],partId:route.ids[0].partId+'/other'}),{city:route.neededCity??route.ids[0].city,objectId:'osm/way/1',partId:'osm/way/1/component/x',batches:[]}];
   await registry.prepareRoot500Data(cold,new AbortController().signal,scope,registry[route.reconstruct]);await registry.prepareRoot500Data(cold,new AbortController().signal,scope);
   const out=registry[route.reconstruct](cold,scope);assert.equal(out.components===cold,!route.copyNoMatch);assert.deepEqual(out.components,cold);assert.equal(out.stats.objects,0);
   const paint=new Float32Array(12).fill(.5),frames=new Float32Array(15).fill(.25);assert.deepEqual(registry[route.materials](cold,paint,frames,scope),{objects:0,vertices:0,actualVisualAccepted:false});assert(paint.every(v=>v===.5)&&frames.every(v=>v===.25));
  }
  assert.deepEqual(loader.calls,[],'cold rows never start an import');
  // An aborted waiter neither publishes nor cancels the shared import; the other waiter completes it.
  const gate=deferred();loader.handler=()=>gate.promise;const needed=[row(hamburg)],a=new AbortController(),b=new AbortController();
  const first=registry.prepareRoot500Data(needed,a.signal,scope,registry[hamburg.reconstruct]),second=registry.prepareRoot500Data(needed,b.signal,scope,registry[hamburg.reconstruct]);await tick();
  assert.deepEqual(loader.calls,[hamburg.specifier]);a.abort();await assert.rejects(first,{name:'AbortError'});assert.throws(()=>registry[hamburg.reconstruct](needed,scope),/not prepared/);
  gate.resolve(original(hamburg));await second;assert.deepEqual(loader.calls,[hamburg.specifier]);
  assert.deepEqual(calls.map(([name,args])=>[name,args[0],args[1],args[2]]),[['prepare:'+hamburg.reconstruct,needed,b.signal,scope]],'only the live waiter prepares batch-scope data');
  const result=registry[hamburg.reconstruct](needed,scope);assert.equal(result.stats.fixture,hamburg.reconstruct);assert.deepEqual(calls.at(-1),[hamburg.reconstruct,[needed,scope]]);
  const paint=new Float32Array(12),frames=new Float32Array(15);registry[hamburg.materials](needed,paint,frames,scope);assert.deepEqual(calls.at(-1),[hamburg.materials,[needed,paint,frames]],'materials keep their original arguments');
  await registry.prepareRoot500Data([row(hamburg)],new AbortController().signal,scope,registry[hamburg.reconstruct]);assert.equal(loader.calls.length,1,'one import per module');
  // A failed import or a malformed module is not published and is retried by the next batch.
  const failure=Error('controlled import failure');let attempt=0;loader.handler=()=>++attempt===1?Promise.reject(failure):attempt===2?Promise.resolve({}):Promise.resolve(original(cityAware));
  for(const expected of [failure,/does not export its builder/]){await assert.rejects(registry.prepareRoot500Data([row(cityAware)],new AbortController().signal,scope,registry[cityAware.reconstruct]),expected);assert.throws(()=>registry[cityAware.reconstruct]([row(cityAware)],scope),/not prepared/);}
  await registry.prepareRoot500Data([row(cityAware)],new AbortController().signal,scope,registry[cityAware.reconstruct]);assert.equal(attempt,3);assert.equal(registry[cityAware.reconstruct]([row(cityAware)],scope).stats.fixture,cityAware.reconstruct);
  // Without a recipe every needed route is prepared once; already aborted work starts nothing.
  const aborted=new AbortController();aborted.abort();await assert.rejects(registry.prepareRoot500Data([row(munich)],aborted.signal,scope),{name:'AbortError'});
  const before=loader.calls.length;loader.handler=()=>Promise.resolve(original(munich));await registry.prepareRoot500Data([row(munich),row(hamburg)],new AbortController().signal,scope);assert.deepEqual(loader.calls.slice(before),[munich.specifier]);
  // Module-only preparation: needed originals import together, once, with no data or scope;
  // a later batch stage then prepares only its scoped data. An aborted waiter publishes nothing.
  const [leipzig,dresden,hannover]=['leipzig','dresden','hannover'].map(city=>contracts.find(route=>route.city===city)),gates=new Map([leipzig,dresden,hannover].map(route=>[route.specifier,deferred()]));
  loader.handler=specifier=>gates.get(specifier).promise;const start=loader.calls.length,dataStart=calls.length;
  const together=registry.prepareNonBerlinOwnerRouteModules([row(leipzig),row(dresden),{city:'berlin',objectId:'osm/way/2',partId:'osm/way/2/component/y',batches:[]}],new AbortController().signal);await tick();
  assert.deepEqual(loader.calls.slice(start).sort(),[leipzig.specifier,dresden.specifier].sort(),'needed imports start together');
  for(const route of [leipzig,dresden])gates.get(route.specifier).resolve(original(route));await together;assert.equal(calls.length,dataStart,'module-only preparation prepares no data');
  await registry.prepareRoot500Data([row(leipzig)],new AbortController().signal,scope,registry[leipzig.reconstruct]);assert.equal(loader.calls.length,start+2,'batch preparation reuses the loaded original');
  assert.deepEqual(calls.slice(dataStart).map(([name])=>name),['prepare:'+leipzig.reconstruct]);
  const cancelled=new AbortController(),late=registry.prepareNonBerlinOwnerRouteModules([row(hannover)],cancelled.signal);await tick();cancelled.abort();await assert.rejects(late,{name:'AbortError'});
  gates.get(hannover.specifier).resolve(original(hannover));await tick();assert.throws(()=>registry[hannover.reconstruct]([row(hannover)],scope),/not prepared/,'an aborted module wait publishes nothing');
  await registry.prepareRoot500Data([row(hannover)],new AbortController().signal,scope,registry[hannover.reconstruct]);assert.equal(loader.calls.filter(s=>s===hannover.specifier).length,1,'the next batch reuses the one import');
  assert.equal(await registry.prepareNonBerlinOwnerRouteModules([row(hamburg)],new AbortController().signal),undefined);assert.equal(loader.calls.filter(s=>s===hamburg.specifier).length,1);
  // A wave starts synchronously: nothing missing (loaded, cold or Bremen rows) gives
  // undefined. The aggregate imports the Bremen originals itself; waves never do.
  const bremen=contracts.find(route=>route.city==='bremen'),calm=loader.calls.length;
  assert.equal(registry.startNonBerlinOwnerRouteModules([row(bremen),row(hamburg),row(munich)],new AbortController().signal,()=>{throw Error('no wait expected');}),undefined);
  await registry.prepareNonBerlinOwnerRouteModules([row(bremen)],new AbortController().signal);await registry.prepareNonBerlinOwnerCityRouteModules('bremen',new AbortController().signal);await registry.prepareNonBerlinOwnerCityRouteModules('berlin',new AbortController().signal);
  assert.equal(loader.calls.length,calm,'no Bremen or Berlin import from a module wave');
  // City warm-up before any row exists: every lazy original of the city starts in
  // one wave, none of another city, no data; a later batch reuses each module.
  const cologne=contracts.filter(route=>route.city==='cologne'),cityGates=new Map(cologne.map(route=>[route.specifier,deferred()]));
  loader.handler=specifier=>cityGates.get(specifier).promise;const warmStart=loader.calls.length,warmData=calls.length;
  const warm=registry.prepareNonBerlinOwnerCityRouteModules('cologne',new AbortController().signal);await tick();
  assert.equal(cologne.length,13);assert.deepEqual(loader.calls.slice(warmStart).sort(),cologne.map(route=>route.specifier).sort(),'the city originals start together');
  for(const route of cologne)cityGates.get(route.specifier).resolve(original(route));await warm;assert.equal(calls.length,warmData,'a warm-up prepares no data');
  assert.equal(registry.startNonBerlinOwnerRouteModules(cologne.map(route=>row(route)),new AbortController().signal),undefined,'warmed originals need no wave');
  await registry.prepareRoot500Data([row(cologne[0])],new AbortController().signal,scope,registry[cologne[0].reconstruct]);assert.equal(loader.calls.length,warmStart+cologne.length);
  assert.deepEqual(calls.slice(warmData).map(([name])=>name),['prepare:'+cologne[0].reconstruct]);
  // An aborted warm-up publishes nothing; the next batch reuses its import.
  const dortmund=contracts.filter(route=>route.city==='dortmund'),lateGates=new Map(dortmund.map(route=>[route.specifier,deferred()]));loader.handler=specifier=>lateGates.get(specifier).promise;
  const stop=new AbortController(),stopped=registry.prepareNonBerlinOwnerCityRouteModules('dortmund',stop.signal);await tick();stop.abort();await assert.rejects(stopped,{name:'AbortError'});
  for(const route of dortmund)lateGates.get(route.specifier).resolve(original(route));await tick();
  for(const route of dortmund)assert.throws(()=>registry[route.reconstruct]([row(route)],scope),/not prepared/,'an aborted warm-up publishes nothing');
  await registry.prepareRoot500Data([row(dortmund[0])],new AbortController().signal,scope,registry[dortmund[0].reconstruct]);assert.equal(loader.calls.filter(s=>s===dortmund[0].specifier).length,1);
  // A synchronous session refusal leaves no shared import unobserved, even when that
  // import fails later; the next wave calls import() again.
  const nuremberg=contracts.find(route=>route.city==='nuremberg'),broken=deferred(),refusal=Error('paint initialization session closed'),unhandled=[],onUnhandled=reason=>unhandled.push(reason);
  process.on('unhandledRejection',onUnhandled);
  try{
   loader.handler=()=>broken.promise;const refusedAt=loader.calls.length,refuse=()=>{throw refusal;};
   assert.throws(()=>registry.startNonBerlinOwnerRouteModules([row(nuremberg)],new AbortController().signal,refuse),refusal);
   await assert.rejects(registry.prepareNonBerlinOwnerRouteModules([row(nuremberg)],new AbortController().signal,refuse),refusal);
   assert.equal(loader.calls.length,refusedAt+1,'refused waits share one import');
   broken.reject(Error('controlled chunk failure'));for(let i=0;i<4;i++)await tick();assert.deepEqual(unhandled,[],'no unobserved rejection');
   loader.handler=()=>Promise.resolve(original(nuremberg));await registry.prepareNonBerlinOwnerRouteModules([row(nuremberg)],new AbortController().signal);
   assert.equal(loader.calls.length,refusedAt+2,'a failed import is attempted again by the next wave');assert.equal(registry[nuremberg.reconstruct]([row(nuremberg)],scope).stats.fixture,nuremberg.reconstruct);
  }finally{process.off('unhandledRejection',onUnhandled);}
 }finally{[globalThis.setTimeout,globalThis.setInterval]=timers;f.close();}
});

// One row per selected route identity, cold variants and a Bremen route row.
function batches(){
 const pick=(predicate)=>contracts.find(predicate),selected=[pick(r=>r.city==='hamburg'&&r.copyNoMatch),pick(r=>r.city==='hamburg'&&!r.copyNoMatch),pick(r=>r.cityAware&&r.ids.length>1),pick(r=>r.city==='munich'),pick(r=>r.city==='frankfurt'&&!r.cityAware)];
 const row=(route,id,extra={})=>({city:id.city??route.neededCity,objectId:id.objectId,partId:id.partId,batches:[{positions:[0,0,0,1,0,0,0,1,0]}],displayEstimates:{fixture:true},...extra});
 const matched=selected.flatMap(route=>route.ids.slice(0,2).map(id=>row(route,{...id,city:route.neededCity??id.city})));
 const cold=selected.flatMap(route=>[row(route,route.ids[0],{city:'berlin'}),row(route,{...route.ids[0],partId:route.ids[0].partId+'/other',city:route.neededCity??route.ids[0].city})]);
 const bremen=contracts.filter(route=>route.city==='bremen').map(route=>row(route,{...route.ids[0],city:'bremen'}));
 const berlin=[{city:'berlin',objectId:'osm/way/1',partId:'osm/way/1/component/x',batches:[{positions:[0,0,0,1,0,0,0,1,0]}],displayEstimates:{}}];
 return{selected,list:[['berlin',berlin],['cold',cold],['hamburg',matched.filter(c=>c.city==='hamburg')],['mixed',[...matched,...cold,...berlin]],['bremen',bremen],['mixed-again',[...cold,...matched]]]};
}
async function run(owner,state,rows){
 const scope={label:'batch scope'},signal=new AbortController().signal,wait=operation=>operation,mark=state.prepares.length,callMark=state.calls.length,writeMark=state.writes.length;
 const prepared=await owner.prepareOwnerReconstructionComponents(rows,signal,wait,scope),stageMark=state.prepares.length,synchronous=owner.ownerReconstructionComponents(rows,scope);
 assert.deepEqual(synchronous,prepared,'synchronous reconstruction reuses prepared modules');
 const identities=rows.map(c=>owner.ownerReconstructionIdentity(c,scope)),display=prepared.components,vertices=display.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 await owner.prepareOwnerReconstructionMaterials(display,signal,wait,scope);const paint=new Float32Array(4*vertices),frames=new Float32Array(5*vertices);owner.ownerReconstructionBaseMaterials(display,paint,frames,scope);
 // Every original builder call: reconstruction gets the batch scope after its one argument; materials keep three.
 for(const entry of state.scopes){if(entry.name.endsWith('Reconstruction')){assert.equal(entry.argc,2,entry.name);assert.equal(entry.scope,scope,entry.name+' receives the exact batch scope');}else assert.equal(entry.argc,3,entry.name);}state.scopes.length=0;
 return{result:sha(prepared),identities,paint:sha(Buffer.from(paint.buffer)),frames:sha(Buffer.from(frames.buffer)),stagePrepares:state.prepares.slice(mark,stageMark).map(p=>p.name+':'+p.rows.join(',')),
  // Material preparation order follows module registration; the set is what matters.
  materialPrepares:[...new Set(state.prepares.slice(stageMark).map(p=>p.name+':'+p.rows.join(',')))].sort(),calls:state.calls.slice(callMark),writes:state.writes.slice(writeMark),objects:prepared.stats.objects};
}

// The eager reference is a synthetic eager registry behind the same (current)
// aggregate text, not the former aggregate itself; the HEAD aggregate comparison
// is a scratch check recorded with the owner-lazy evidence.
test('the actual aggregate gives byte-identical results with the lazy registry and a synthetic eager registry for root500 cities, Bremen and cold rows',async t=>{
 const lazy=await bundleAggregate('lazy',contracts),eager=await bundleAggregate('eager',contracts);
 try{
  const {selected,list}=batches();
  assert.equal(lazyLoads(eager.state).length,81,'the eager reference imports every builder up front');
  assert.equal(lazyLoads(lazy.state).length,0,'the lazy aggregate imports none at load');
  const summary=[];
  for(const [label,rows]of list){
   const loadsBefore=lazy.state.loads.length,a=await run(lazy.owner,lazy.state,rows),b=await run(eager.owner,eager.state,rows);
   assert.deepEqual(a,b,label+': lazy and eager results, identities, materials and stage order');
   const loaded=lazy.state.loads.slice(loadsBefore);summary.push({label,rows:rows.length,objects:a.objects,result:a.result.slice(0,16),paint:a.paint.slice(0,16),loaded});
   if(label==='berlin'||label==='cold'||label==='bremen'||label==='mixed-again')assert.deepEqual(loaded,[],label+' starts no further import');
  }
  const expected=selected.map(route=>route.moduleKey);
  assert.deepEqual([...lazyLoads(lazy.state)].sort(),[...expected].sort(),'exactly the needed originals, each once');
  t.diagnostic(JSON.stringify(summary));
 }finally{lazy.close();eager.close();}
});

const fixtureRow=(route,id=route.ids[0])=>({city:route.neededCity??id.city,objectId:id.objectId,partId:id.partId,batches:[{positions:[0,0,0,1,0,0,0,1,0]}],displayEstimates:{fixture:true}});
async function referenceOrder(rows,inject){
 const reference=await bundleAggregate('lazy',contracts);
 try{if(inject)reference.state.inject.set(...inject);await reference.owner.prepareOwnerReconstructionComponents(rows,new AbortController().signal,undefined,{label:'reference'});return reference.state.calls.slice();}finally{reference.close();}
}

test('the first batch needing lazy routes imports them in one parallel wave before any stage, and cancellation leaves no stage',async()=>{
 const {selected}=batches(),rows=selected.map(route=>fixtureRow(route)),order=await referenceOrder(rows),expected=selected.map(route=>route.moduleKey).sort();
 const f=await bundleAggregate('lazy',contracts);
 try{
  // Every import is held, so a wave that loaded one module after another would show only its first.
  const holds=selected.map(route=>f.state.hold(route.moduleKey)),controller=new AbortController(),waits=[],wait=operation=>{waits.push(f.state.calls.length);return operation;};
  const pending=f.owner.prepareOwnerReconstructionComponents(rows,controller.signal,wait,{label:'gated'});
  for(let i=0;i<8;i++)await tick();
  assert.deepEqual([...lazyLoads(f.state)].sort(),expected,'every needed original starts in the one wave');
  assert.deepEqual(f.state.calls,[],'no stage runs while the wave is pending');assert.deepEqual(f.state.prepares,[],'no stage prepares data while the wave is pending');
  assert.deepEqual(waits,[0],'the whole wave is one session wait');
  controller.abort();await assert.rejects(pending,{name:'AbortError'});for(const hold of holds)hold.release();for(let i=0;i<4;i++)await tick();
  assert.deepEqual(f.state.calls,[],'a late import cannot run the aborted continuation');
  const result=await f.owner.prepareOwnerReconstructionComponents(rows,new AbortController().signal,undefined,{label:'retry'});
  assert.deepEqual([...lazyLoads(f.state)].sort(),expected,'the retry reuses each import');assert.equal(new Set(f.state.loads).size,f.state.loads.length,'every original evaluates once');
  assert.deepEqual(f.state.calls,order,'the fresh batch runs the whole chain');assert.equal(result.stats.objects,rows.length);
 }finally{f.close();}
 // Display rows go through the same single wave before any material data preparation.
 const m=await bundleAggregate('lazy',contracts);
 try{
  const holds=selected.map(route=>m.state.hold(route.moduleKey)),pending=m.owner.prepareOwnerReconstructionMaterials(rows,new AbortController().signal,undefined,{label:'materials'});
  for(let i=0;i<8;i++)await tick();
  assert.deepEqual([...lazyLoads(m.state)].sort(),expected,'material preparation starts every needed original together');assert.deepEqual(m.state.prepares,[],'no material data before the wave');
  for(const hold of holds)hold.release();await pending;assert.deepEqual([...new Set(m.state.prepares.map(entry=>entry.name))].sort(),selected.map(route=>route.reconstruct).sort());
 }finally{m.close();}
 // Module-only preparation before any reservation: the same originals, no data, no stage;
 // the batch that follows imports nothing more and runs the same chain.
 const p=await bundleAggregate('lazy',contracts);
 try{
  await p.owner.prepareOwnerReconstructionModules(rows,new AbortController().signal);
  assert.deepEqual([...lazyLoads(p.state)].sort(),expected);assert.deepEqual(p.state.prepares,[]);assert.deepEqual(p.state.calls,[]);
  const result=await p.owner.prepareOwnerReconstructionComponents(rows,new AbortController().signal,undefined,{label:'prepared modules'});
  assert.deepEqual([...lazyLoads(p.state)].sort(),expected,'no further import');assert.deepEqual(p.state.calls,order);assert.equal(result.stats.objects,rows.length);
 }finally{p.close();}
});

test('a lazy identity that first appears mid-chain still loads its original at its own stage',async()=>{
 const {selected}=batches(),[early,late]=[selected[0],selected[3]],inject=['ownerF032Reconstruction',[fixtureRow(late)]],rows=[fixtureRow(early)];
 const order=await referenceOrder(rows,inject);assert(order.includes(late.reconstruct)&&order.includes(early.reconstruct));const prefix=order.slice(0,order.indexOf(late.reconstruct));
 const f=await bundleAggregate('lazy',contracts);
 try{
  f.state.inject.set(...inject);const hold=f.state.hold(late.moduleKey),pending=f.owner.prepareOwnerReconstructionComponents(rows,new AbortController().signal,undefined,{label:'mid-chain'});
  for(let i=0;i<8;i++)await tick();
  assert.deepEqual(lazyLoads(f.state),[early.moduleKey,late.moduleKey],'the wave loads what the input needs; the stage loads the later identity');
  assert.deepEqual(f.state.calls,prefix,'stages before the later route ran; nothing after it');
  hold.release();const result=await pending;assert.deepEqual(f.state.calls,order);assert.equal(result.stats.objects,2);
 }finally{f.close();}
});

test('a synchronous session refusal leaves the pending stage and material operations observed',async()=>{
 const {selected}=batches(),target=selected[1],bremen=contracts.find(route=>route.city==='bremen'),refusal=Error('paint initialization session closed'),unhandled=[],onUnhandled=reason=>unhandled.push(reason);
 const f=await bundleAggregate('lazy',contracts);process.on('unhandledRejection',onUnhandled);
 try{
  // The refusal comes at the stage whose data preparation is still pending; that data then fails.
  for(const [route,run]of [[target,(rows,wait)=>f.owner.prepareOwnerReconstructionComponents(rows,new AbortController().signal,wait,{label:'refused'})],
   [bremen,(rows,wait)=>f.owner.prepareOwnerReconstructionMaterials(rows,new AbortController().signal,wait,{label:'refused'})]]){
   const data=f.state.hold('data:'+route.moduleKey);let refused=false;
   const wait=operation=>{if(!refused&&f.state.prepares.at(-1)?.name===route.reconstruct){refused=true;throw refusal;}return operation;};
   await assert.rejects(run([fixtureRow(route)],wait),refusal);assert(refused,route.routeName+' refused at its pending preparation');
   data.fail(Error('controlled data failure'));for(let i=0;i<6;i++)await tick();
   assert.deepEqual(unhandled,[],route.routeName+': no unobserved rejection after the refusal');
  }
 }finally{process.off('unhandledRejection',onUnhandled);f.close();}
});

test('the Bremen owner keeps the canonical aggregate and the shared unscoped route hook',async()=>{
 const bremen=await readFile(path.join(web,'src/painted/bremen/safety/owner-reconstruction.ts'),'utf8'),routes=await nonBerlinOwnerRoutes();
 assert(bremen.includes("export {prepareNonBerlinOwnerRoutes} from '../../root500/safety/owner-nonberlin-lazy';"));
 assert.deepEqual(routes.filter(route=>route.city==='bremen').map(route=>route.reconstruct),['ownerF257Reconstruction','ownerF259Reconstruction','ownerF274Reconstruction','ownerF261Reconstruction']);
 // The aggregate binds the four Bremen originals directly (module waves skip them) and none of the 81.
 const bindings=aggregateBindings(await readFile(aggregateFile,'utf8'));
 for(const route of contracts){const direct=bindings.get(route.specifier);if(route.city==='bremen')assert([route.identity,route.reconstruct,route.materials].every(name=>direct?.has(name)),route.routeName+' stays a direct import');else assert.equal(direct,undefined,route.routeName+' is bound only through the registry');}
});
