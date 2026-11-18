// root500 and infill prepareBatches finish the lazy owner route-module wave
// before they hold anything (DECISIONS 2026-11-02 04:29 [0]; independent group
// fix:owner-lazy CDR[0]; S2 owner-lazy-2 CDR[0]). While the import wave is
// pending the renderer holds no FrozenDataScope (root500 creates none yet; the
// infill manager's scope is still empty), no retained chunk input and no
// progressive lease. An abort, a destroy or an import failure during the wave
// therefore leaves nothing to release. The call is optional, so a renderer
// fixture whose owner stub lacks it keeps working. Production prepareBatches is
// evaluated in a fixture scope that records each boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFile,install,functionText,evaluate} from './support/renderers-a-scope.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {resourceContentKey} from './support/resource-content-key.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
const STOP=Object.freeze(Object.assign(new Error('fixture stops after the first data stage'),{name:'FixtureStop'}));
const completeChunkSourceRows=evaluate(functionText(sourceFile('root500','chunk-mesh-packing.ts'),'completeChunkSourceRows'),{});

function fixture(provider){
 const events=[],modules=[],wave=deferred();
 const scope={prepare(){events.push('scope.prepare');},release(){events.push('scope.release');},stats:{disposed:false}};
 const values={destroyed:false,city:'frankfurt',frozenData:{},completeChunkSourceRows,
  createFrozenDataScope(){events.push('scope');return scope;},
  retainChunkInput(input){events.push('chunk-input');return input?{input,release(){events.push('chunk-input.release');}}:undefined;},
  prepareOwnerReconstructionModules(rows,signal,wait){events.push('modules');modules.push({rows,signal,wait});return wave.promise;},
  prepareOwnerRecoveredSourceComponents:async()=>{},
  ownerRecoveredSourceComponents:rows=>rows,
  sourceBatches:rows=>({sourceComponents:rows}),
  completeInfillProgressiveObjectDemand:rows=>rows,
  prepareRoot500ProgressiveData(){events.push('progressive');throw STOP;},
  prepareInfillProgressiveData(){events.push('progressive');throw STOP;},
 };
 install(sourceFile(provider),values,{functions:['prepareBatches']});
 const components=[{objectId:'o1',partId:'p1',batches:[]}],physicalRows=[...components,{objectId:'o2',partId:'p2',batches:[]}],demand=[...physicalRows];
 // Ingress has activated this complete physical source group. The viewport
 // request remains its own array and must not cut the module wave down to o1.
 const chunkInput={store:{},groups:[{contentKey:resourceContentKey('fixture-native-group','o1-o2'),components:physicalRows,parents:[],frame:{origin:[8.68,50.11],unit:1,authority:'fixture-source-frame'},cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:'near'}],cohorts:[]},wait=operation=>operation;
 const run=(signal,{withDemand=true}={})=>provider==='root500'?values.prepareBatches(components,signal,wait,undefined,withDemand?demand:undefined,chunkInput):values.prepareBatches(components,signal,scope,wait,undefined,withDemand?demand:undefined,chunkInput);
 return{values,events,modules,wave,components,physicalRows,demand,wait,run};
}
const created=provider=>provider==='root500'?['scope','chunk-input','progressive','chunk-input.release','scope.release']:['chunk-input','progressive','chunk-input.release'];

for(const provider of ['root500','infill']){
 test(`${provider}: prepareBatches holds no scope, chunk input or progressive lease while the route-module wave is pending`,async()=>{
  const f=fixture(provider),controller=new AbortController(),pending=f.run(controller.signal);void pending.catch(()=>{});
  await tick();await tick();
  assert.deepEqual(f.events,['modules'],'only the module wave has started');
  assert.equal(f.modules.length,1);assert.deepEqual(f.modules[0].rows,f.physicalRows,'the wave covers the complete activated physical source group');for(const [index,row]of f.physicalRows.entries())assert.equal(f.modules[0].rows[index],row,'source rows retain their identity');assert.deepEqual(f.components,[f.physicalRows[0]],'the viewport request is not expanded in place');assert.deepEqual(f.demand,f.physicalRows,'the demand receipt is unchanged');assert.equal(f.modules[0].signal,controller.signal);assert.equal(f.modules[0].wait,f.wait,'the session wait is forwarded');
  f.wave.resolve();
  await assert.rejects(pending,error=>error===STOP);
  assert.deepEqual(f.events,['modules',...created(provider)],'scope, chunk input and data stages follow the wave, and are released on failure');
 });

 test(`${provider}: without a demand the wave still covers the complete activated physical source group`,async()=>{
  const f=fixture(provider),pending=f.run(new AbortController().signal,{withDemand:false});void pending.catch(()=>{});
  await tick();assert.deepEqual(f.modules[0].rows,f.physicalRows);assert.equal(f.modules[0].rows[0],f.components[0]);assert.equal(f.modules[0].rows[1],f.physicalRows[1]);assert.equal(f.components.length,1,'completion leaves the original requested rows intact');
  f.wave.resolve();await assert.rejects(pending,error=>error===STOP);
 });

 test(`${provider}: an abort during the wave rejects with AbortError and leaves nothing to release`,async()=>{
  const f=fixture(provider),controller=new AbortController(),pending=f.run(controller.signal);void pending.catch(()=>{});
  await tick();controller.abort();f.wave.resolve();
  await assert.rejects(pending,error=>error?.name==='AbortError');
  assert.deepEqual(f.events,['modules']);
 });

 test(`${provider}: a destroy during the wave rejects with AbortError and leaves nothing to release`,async()=>{
  const f=fixture(provider),pending=f.run(new AbortController().signal);void pending.catch(()=>{});
  await tick();f.values.destroyed=true;f.wave.resolve();
  await assert.rejects(pending,error=>error?.name==='AbortError');
  assert.deepEqual(f.events,['modules']);
 });

 test(`${provider}: an import failure propagates unchanged and nothing was acquired`,async()=>{
  const f=fixture(provider),failure=new TypeError('Failed to fetch dynamically imported module'),pending=f.run(new AbortController().signal);void pending.catch(()=>{});
  await tick();f.wave.reject(failure);
  await assert.rejects(pending,error=>error===failure);
  assert.deepEqual(f.events,['modules']);
 });

 test(`${provider}: an owner module without the export (fixture stub) still prepares`,async()=>{
  const f=fixture(provider);f.values.prepareOwnerReconstructionModules=undefined;
  await assert.rejects(f.run(new AbortController().signal),error=>error===STOP);
  assert.deepEqual(f.events,created(provider));
 });
}


test('infill: actual recovered F154 identity is declared before the first progressive selection',async()=>{
 const {createFrozenDataScope}=createSourceModules({allow:id=>['safety/frozen-data-scope','safety/render-runtime/resource-budget','safety/reconstruction-resource-parents'].includes(id)}).load('safety/frozen-data-scope');
 const ref={canonicalSHA256:'a'.repeat(64),file:'fixture-progressive-admissions.ts',occurrence:0,codec:'json'},calls=[];
 let released=0;
 const scope=createFrozenDataScope({async acquire(_ref,signal,keys){signal.throwIfAborted();calls.push([...keys]);return{borrow:fn=>fn([]),release(){released++;}};}});
 const recovered={city:'frankfurt',objectId:'osm/way/384153099',partId:'osm/way/384153099/component/83cb7aff2638e3f41f2b',origin:[8.67198,50.116035],batches:[]};
 // Execute the production recovery predicate; only its geometry factory is a
 // tiny stand-in. The admission scope and renderer preparation are real bodies.
 const recover=evaluate(functionText(sourceFile('root500','owner-f154-reconstruction.ts'),'ownerF154RecoveredSources'),{
  __root500Origin_F154:recovered.origin,getRoot500Data:()=>({createRecoveredSource:()=>recovered})
 });
 const prepare=evaluate(functionText(sourceFile('infill','progressive-paint.ts'),'prepareInfillProgressiveData'),{INFILL_ADMISSIONS_RESOURCE:ref});
 const f=fixture('infill');
 for(const row of f.physicalRows){row.city='frankfurt';row.origin=[...recovered.origin];}
 f.values.ownerRecoveredSourceComponents=recover;
 f.values.sourceBatches=rows=>({sourceComponents:recover(rows,scope)});
 f.values.prepareInfillProgressiveData=async(rows,city,signal)=>{
  await prepare(rows,city,signal,scope);
  scope.assertSelection(ref,[recovered.city+'|'+recovered.objectId]);
  assert.throws(()=>scope.assertSelection(ref,['frankfurt|osm/way/999999999']),/not declared/,'unrelated consumers remain rejected');
  throw STOP;
 };
 try{
  f.wave.resolve();await assert.rejects(f.run(new AbortController().signal),error=>error===STOP);
  assert.equal(calls.length,1,'no selection widening or whole-table fallback');
  assert.deepEqual(new Set(calls[0]),new Set(['frankfurt|o1','frankfurt|o2','frankfurt|osm/way/384153099']));
  assert.equal(f.components.length,1,'source recovery does not mutate viewport input');
  assert.equal(recover([{...f.components[0],city:'berlin'}],scope).length,1);
  assert.equal(recover([{...f.components[0],origin:[8.7,50.2]}],scope).length,1);
  assert.equal(recover([f.components[0],recovered],scope).length,2,'existing recovered identity is not duplicated');
 }finally{scope.release();}
 assert.equal(released,1,'selected resource is released with its scope');
});
