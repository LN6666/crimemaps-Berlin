import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {web} from './support/owner-lazy-closure.mjs';
import {stageWrapperRoutes,ownerRouteContracts,bundleOwnerAggregate,fixtureScope,fixtureRow,registryFile} from './support/owner-lazy2-virtual.mjs';

// Review fixes for owner-lazy-2.
// R1: both owner aggregates offer a module-only wave (no data, no scope), so a
//     renderer can finish every import before it builds its FrozenDataScope and
//     the stage preparation that follows imports nothing while it holds a lease.
// R2: the registry's legacy city prepare (prepareNonBerlinOwnerRoutes) also
//     publishes the scoped original, so a later scope-bearing facade call keeps
//     its scope instead of falling back to the unscoped builder.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const zero=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const wrappers=await stageWrapperRoutes(),routes=await ownerRouteContracts();
const byName=name=>wrappers.find(w=>w.specifier==='./'+name);
const registryRoutes=new Map([...routes.values()].filter(route=>route.kind==='registry').map(route=>['./'+route.key,route]));
const bremen=new Set([...routes.values()].filter(route=>route.city==='bremen').map(route=>route.key));

for(const target of ['root500','infill']){
 test(`the ${target} aggregate finishes its module wave before any scope exists, and its stages then import nothing`,async()=>{
  const f=await bundleOwnerAggregate(target,routes);
  try{
   const F006=byName('owner-f006-lazy'),F140=byName('owner-f140-lazy'),hamburg=[...routes.values()].find(route=>route.kind==='registry'&&route.city==='hamburg'),F136=[...routes.values()].find(route=>route.key==='owner-f136-reconstruction');
   const hit=w=>fixtureRow(w.ids[0].city,w.ids[0].objectId,w.ids[0].partId);
   const rows=[hit(F006),hit(F140),fixtureRow('hamburg',hamburg.ids[0].objectId,hamburg.ids[0].partId),fixtureRow('frankfurt',F136.ids[0].objectId,F136.ids[0].partId)],keys=[F006.originalKey,F140.originalKey,hamburg.key,F136.key];
   const holds=keys.map(key=>f.state.hold(key)),waits=[];
   const modules=f.owner.prepareOwnerReconstructionModules(rows,signal(),operation=>{waits.push(1);return operation;});await tick();
   assert.deepEqual(f.state.loads.filter(key=>!bremen.has(key)).sort(),[...keys].sort(),'every lazy original these rows need starts in one wave');
   assert.equal(waits.length,1,'one session wait for the module wave');
   for(const hold of holds)hold.release();await modules;
   assert.deepEqual(f.state.prepares,[],'module-only preparation prepares no data');assert.deepEqual(f.state.calls,[],'and runs no builder');
   assert.equal(await f.owner.prepareOwnerReconstructionModules(rows,signal(),()=>{throw Error('a loaded batch needs no second wave');}),undefined);
   const loads=f.state.loads.length,scope=fixtureScope(),stageLoads=[];
   const result=await f.owner.prepareOwnerReconstructionComponents(rows,signal(),operation=>{stageLoads.push(f.state.loads.length);return operation;},scope);
   assert.equal(f.state.loads.length,loads,'stage preparation under the scope imports nothing');assert(stageLoads.every(count=>count===loads));
   assert.deepEqual(f.state.prepares.map(entry=>entry.name).sort(),[F006.reconstruct,F140.reconstruct,hamburg.reconstruct,F136.reconstruct].sort(),'each needed route still prepares its data at its stage');
   for(const entry of f.state.prepares)assert.equal(entry.scope,scope);
   assert.deepEqual(result,f.owner.ownerReconstructionComponents(rows,scope));
   await f.owner.prepareOwnerReconstructionMaterials(rows,signal(),undefined,scope);assert.equal(f.state.loads.length,loads,'material preparation imports nothing either');
  }finally{f.close();}
 });
 test(`a cancelled ${target} module wave publishes nothing and the next one reuses the same import`,async()=>{
  const f=await bundleOwnerAggregate(target,routes);
  try{
   const F033=byName('owner-f033-lazy'),rows=[fixtureRow(F033.ids[0].city,F033.ids[0].objectId,F033.ids[0].partId)],hold=f.state.hold(F033.originalKey),controller=new AbortController();
   const pending=f.owner.prepareOwnerReconstructionModules(rows,controller.signal);await tick();controller.abort();hold.release();
   await assert.rejects(pending,{name:'AbortError'});await tick();
   const again=f.owner.prepareOwnerReconstructionModules(rows,signal());assert(again instanceof Promise);await again;
   assert.deepEqual(f.state.loads.filter(key=>key===F033.originalKey),[F033.originalKey],'one shared import');assert.deepEqual(f.state.prepares,[]);
   const result=await f.owner.prepareOwnerReconstructionComponents(rows,signal(),undefined,fixtureScope());assert.equal(result.components[0].chain.at(-1),F033.reconstruct);
  }finally{f.close();}
 });
}

// The actual registry over recorder originals; every dynamic original import goes
// through one global loader, optionally held behind a gate.
async function bundleRegistry(key){
 const state={imports:[],calls:[],prepares:[],gate:undefined};
 globalThis[key]=specifier=>{
  state.imports.push(specifier);const route=registryRoutes.get(specifier);if(!route)return Promise.reject(Error('unknown original '+specifier));
  return Promise.resolve(state.gate).then(()=>({
   [route.reconstruct](...args){state.calls.push([route.reconstruct,args]);return{components:args[0],stats:zero()};},
   [route.materials](...args){state.calls.push([route.materials,args]);return{objects:0,vertices:0,actualVisualAccepted:false};},
   root500DataFunctionArities:{[route.reconstruct]:1,[route.materials]:3},
   prepareRoot500Data(...args){state.prepares.push([specifier,...args]);}
  }));
 };
 const result=await build({stdin:{contents:`export * from ${JSON.stringify(registryFile)};`,resolveDir:web,sourcefile:'owner-lazy2-review-registry.js',loader:'js'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',plugins:[{name:'loader',setup(builder){builder.onResolve({filter:/^\.\/owner-/},args=>args.kind==='dynamic-import'?{path:'owner-lazy2-loader:'+args.path,external:true}:undefined);}}]});
 const text=result.outputFiles[0].text,rewired=text.replaceAll('import("owner-lazy2-loader:',`globalThis[${JSON.stringify(key)}]("`);
 assert.notEqual(rewired,text,'fixture rewires the dynamic original imports');
 return{registry:await import('data:text/javascript;base64,'+Buffer.from(rewired).toString('base64')),state,close(){delete globalThis[key];}};
}

test('a legacy city prepare publishes the scoped original, so a later facade call keeps its scope',async()=>{
 const f=await bundleRegistry('__ownerLazy2ReviewRegistry');
 try{
  const F136=registryRoutes.get('./owner-f136-reconstruction'),rows=[fixtureRow('frankfurt',F136.ids[0].objectId,F136.ids[0].partId)],scope={label:'batch-scope'};
  await f.registry.prepareNonBerlinOwnerRoutes(rows,signal());
  assert(f.state.imports.includes('./owner-f136-reconstruction'));
  assert.equal(f.registry.startNonBerlinOwnerRouteModules(rows,signal()),undefined,'the legacy prepare leaves no module wave behind');
  f.registry.ownerF136Reconstruction(rows,scope);let call=f.state.calls.at(-1);
  assert.equal(call[0],'ownerF136Reconstruction');assert.equal(call[1].length,2);assert.equal(call[1][1],scope,'the scope reaches the original');
  f.registry.ownerF136BaseMaterials(rows,new Float32Array(4),new Float32Array(5),scope);call=f.state.calls.at(-1);
  assert.equal(call[0],'ownerF136BaseMaterials');assert.equal(call[1].length,4);assert.equal(call[1][3],scope);
  // Without a scope the call shape stays the original one plus an empty scope slot.
  f.registry.ownerF136Reconstruction(rows);call=f.state.calls.at(-1);assert.equal(call[1][0],rows);assert.equal(call[1][1],undefined);
  await f.registry.prepareInfillDataForFunction('ownerF136Reconstruction',rows,signal(),scope);
  assert.equal(f.state.prepares.at(-1)[3],scope,'scoped data preparation reuses the published original');
 }finally{f.close();}
});

test('an aborted legacy city prepare publishes nothing; the next one does',async()=>{
 const f=await bundleRegistry('__ownerLazy2ReviewRegistryAbort');
 try{
  let release;f.state.gate=new Promise(resolve=>release=resolve);
  const controller=new AbortController(),seed=registryRoutes.get('./owner-f136-reconstruction');
  const pending=f.registry.prepareNonBerlinOwnerRoutes([fixtureRow('frankfurt',seed.ids[0].objectId,seed.ids[0].partId)],controller.signal);await tick();
  const first=registryRoutes.get(f.state.imports[0]);assert(first&&first.city==='frankfurt','the first Frankfurt route is pending');
  controller.abort();release();await assert.rejects(pending,{name:'AbortError'});await tick();
  const rows=[fixtureRow(first.city,first.ids[0].objectId,first.ids[0].partId)],scope={label:'batch-scope'};
  assert.throws(()=>f.registry[first.reconstruct](rows,scope),/not prepared/,'an aborted waiter publishes neither route');
  await f.registry.prepareNonBerlinOwnerRoutes(rows,signal());
  f.registry[first.reconstruct](rows,scope);const call=f.state.calls.at(-1);assert.equal(call[0],first.reconstruct);assert.equal(call[1][1],scope);
 }finally{f.close();}
});

test('each registry route takes its unscoped builder from its one shared original import',async()=>{
 // The unscoped route reads `name` / `materials` from the shared original; this
 // holds because every certified binding names exactly those exports of the same module.
 const {readFile}=await import('node:fs/promises'),text=await readFile(registryFile,'utf8');
 const rows=[...text.matchAll(/createLazyOwnerRoute\("(\w+)",[^\n]*?,(?:true|false),\(\)=>import\('([^']+)'\)\.then\(m=>\(\{reconstruct:m\.(\w+),baseMaterials:m\.(\w+)\}\)\),\(\)=>import\('([^']+)'\)\);/g)];
 assert.equal(rows.length,registryRoutes.size);
 for(const [,name,specifier,reconstruct,materials,original]of rows){assert.equal(reconstruct,name);assert.equal(materials,name.replace(/Reconstruction$/,'BaseMaterials'));assert.equal(original,specifier,name+' binds one module');}
 const f=await bundleRegistry('__ownerLazy2ReviewRegistryOnce');
 try{
  const F136=registryRoutes.get('./owner-f136-reconstruction'),rows2=[fixtureRow('frankfurt',F136.ids[0].objectId,F136.ids[0].partId)];
  await f.registry.prepareNonBerlinOwnerRoutes(rows2,signal());
  const frankfurt=[...registryRoutes.values()].filter(route=>route.city==='frankfurt').map(route=>'./'+route.key).sort();
  assert.deepEqual([...f.state.imports].sort(),frankfurt,'one import per Frankfurt original');
  await f.registry.prepareInfillDataForFunction('ownerF136Reconstruction',rows2,signal(),{label:'s'});assert.equal(f.state.imports.length,frankfurt.length,'scoped preparation reuses it');
 }finally{f.close();}
});
