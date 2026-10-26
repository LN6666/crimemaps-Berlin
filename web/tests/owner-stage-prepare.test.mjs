import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const src=new URL('../src/painted/root500/safety/',import.meta.url);
const read=name=>readFile(new URL(name,src),'utf8');
const esm=async code=>'data:text/javascript;base64,'+Buffer.from((await transform(code,{loader:'ts',format:'esm',target:'es2022'})).code).toString('base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const empty=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
const noopRows=[{city:'berlin',objectId:'unrelated',partId:'unrelated/component',batches:[],origin:[13.4,52.5]}];
const aggregate=await read('owner-reconstruction.ts');
const rendererSource=await read('building-mesh-renderer.ts');
const managerSource=await read('three-dimensional-map.ts');
const {createLazyOwnerRoute}=await import(await esm(await read('lazy-owner-route.ts')));
let serial=0;
async function ownerFixture(t,{insert=true,gate036,gate031}={}){
 const id='__ownerStage'+(++serial),calls=[],imports=[],waits=[],builders={},routes={};
 const targets={};
 for(const n of ['031','036']){
  const text=await read(`owner-f${n}-lazy.ts`);targets[n]={...JSON.parse(text.match(new RegExp(`const F${n}_IDS=(\\[.*?\\]);`))[1])[0],batches:[],origin:[13.4,52.5]};
  builders[n]={
   [`ownerF${n}Reconstruction`]:components=>{calls.push(`ownerF${n}Reconstruction`);const matched=components.some(c=>c.objectId===targets[n].objectId);return{components,stats:{...empty(),error:matched?`F${n} requires all unchanged real native carriers`:undefined}};},
   [`ownerF${n}BaseMaterials`]:()=>({objects:0,vertices:0,actualVisualAccepted:false}),
  };
 }
 const context={builders,createLazyOwnerRoute,load:async n=>{imports.push(n);await(n==='036'?gate036:gate031)?.promise;return builders[n];}};
 globalThis[id]=context;t.after(()=>{delete globalThis[id];});
 for(const n of ['031','036']){
  let code=(await transform(await read(`owner-f${n}-lazy.ts`),{loader:'ts',format:'esm',target:'es2022'})).code;
  code=code.replace(/import\s*\{[^}]*\}\s*from\s*["']\.\/lazy-owner-route["'];?/g,`const {createLazyOwnerRoute}=globalThis[${JSON.stringify(id)}];`);
  code=code.replace(new RegExp(`import\\(["']\\./owner-f${n}-reconstruction["']\\)`),`globalThis[${JSON.stringify(id)}].load(${JSON.stringify(n)})`);
  routes[n]=await import(await esm(code));
 }
 context.get=name=>{
  for(const n of ['031','036'])if(routes[n][name])return routes[n][name];
  if(name.startsWith('prepareOwner'))return()=>undefined;
  if(name.endsWith('Identity'))return()=>false;
  if(name==='ownerF154RecoveredSources')return rows=>rows;
  return components=>{calls.push(name);let rows=components;
   if(insert&&name==='ownerF037Reconstruction')rows=[...rows,targets['036']];
   if(insert&&name==='ownerF027Reconstruction')rows=[...rows,targets['031']];
   return{components:rows,stats:empty(),cofaceStats:{fixture:true}};
  };
 };
 let code=(await transform(aggregate,{loader:'ts',format:'esm',target:'es2022'})).code;
 code=code.replace(/import\s*\{([^}]+)\}\s*from\s*["'][^"']+["'];?/g,(_,bindings)=>bindings.split(',').map(binding=>{
  const [exported,local=exported]=binding.trim().split(/\s+as\s+/);return `const ${local}=globalThis[${JSON.stringify(id)}].get(${JSON.stringify(exported)});`;
 }).join('\n'));
 const mod=await import(await esm(code));
 return {mod,routes,calls,imports,targets,waits,wait:operation=>{waits.push(operation);return operation;}};
}

test('the one production chain prepares on actual prior-stage output, preserves order/error receipts, and does not rerun builders',async t=>{
 const g036=deferred(),g031=deferred(),f=await ownerFixture(t,{gate036:g036,gate031:g031});
 const pending=f.mod.prepareOwnerReconstructionComponents(noopRows,new AbortController().signal,f.wait);
 await tick();assert.deepEqual(f.imports,['036']);assert.equal(f.calls.at(-1),'ownerF037Reconstruction');
 g036.resolve();await tick();assert.deepEqual(f.imports,['036','031']);assert.equal(f.calls.at(-1),'ownerF027Reconstruction');
 g031.resolve();const out=await pending;
 assert.match(out.stats.error,/F036 requires/);assert.match(out.stats.error,/F031 requires/);assert.deepEqual(out.cofaceStats,{fixture:true});
 const asyncCalls=[...f.calls];f.calls.length=0;const syncOut=f.mod.ownerReconstructionComponents(noopRows);
 assert.deepEqual(syncOut,out);assert.deepEqual(f.calls,asyncCalls);assert.equal(f.calls.filter(x=>x==='ownerF037Reconstruction').length,1);assert.equal(f.calls.filter(x=>x==='ownerF027Reconstruction').length,1);
 assert.deepEqual(f.imports,['036','031']);assert.equal(f.waits.length,2);assert.equal(noopRows.length,1);
});

test('unrelated input neither imports the two frozen owners nor changes empty error semantics',async t=>{
 const f=await ownerFixture(t,{insert:false});const out=await f.mod.prepareOwnerReconstructionComponents(noopRows,new AbortController().signal,f.wait);
 assert.deepEqual(f.imports,[]);assert.deepEqual(f.waits,[]);assert.equal(out.stats.objects,0);assert.equal(out.stats.error,undefined);
 assert.deepEqual(f.mod.ownerReconstructionComponents(noopRows),out);
});

test('identities introduced after an owner stage retain the original material no-op without importing a table',async t=>{
 const f=await ownerFixture(t,{insert:false});await f.mod.prepareOwnerReconstructionComponents(noopRows,new AbortController().signal,f.wait);
 for(const n of ['031','036']){
  const rows=[f.targets[n]],paint=new Float32Array([.1,.2,.3,.4]),frames=new Float32Array([1,2,3,4,5]);const beforePaint=paint.slice(),beforeFrames=frames.slice();
  assert.deepEqual(f.routes[n][`ownerF${n}BaseMaterials`](rows,paint,frames),{objects:0,vertices:0,actualVisualAccepted:false});
  assert.deepEqual(paint,beforePaint);assert.deepEqual(frames,beforeFrames);
  assert.throws(()=>f.routes[n][`ownerF${n}BaseMaterials`]([{...rows[0],displayEstimates:{[`F${n}Exterior`]:true}}],paint,frames),/not prepared/);
 }
 assert.deepEqual(f.imports,[]);
});

test('cancellation at the F036 barrier stops the chain and a late module result cannot resume or publish it',async t=>{
 const gate=deferred(),f=await ownerFixture(t,{gate036:gate}),own=new AbortController();
 const pending=f.mod.prepareOwnerReconstructionComponents(noopRows,own.signal,f.wait);await tick();own.abort();await assert.rejects(pending,{name:'AbortError'});
 gate.resolve();await tick();assert.equal(f.calls.at(-1),'ownerF037Reconstruction');assert(!f.calls.includes('ownerF036Reconstruction'));
 assert.throws(()=>f.mod.ownerReconstructionComponents(noopRows),/not prepared/);
 const out=await f.mod.prepareOwnerReconstructionComponents(noopRows,new AbortController().signal,f.wait);assert.match(out.stats.error,/F031 requires/);assert.deepEqual(f.imports,['036','031']);
});

test('cancellation at the later F031 barrier preserves the completed prefix without executing the suffix',async t=>{
 const gate=deferred(),f=await ownerFixture(t,{gate031:gate}),own=new AbortController();
 const pending=f.mod.prepareOwnerReconstructionComponents(noopRows,own.signal,f.wait);await tick();own.abort();await assert.rejects(pending,{name:'AbortError'});gate.resolve();await tick();
 assert.equal(f.calls.at(-1),'ownerF027Reconstruction');assert.equal(f.calls.filter(n=>n==='ownerF036Reconstruction').length,1);assert(!f.calls.includes('ownerF031Reconstruction'));
});

// Execute the production CPU prepare method and synchronous commit prefix; mock only
// model builders and WebGL packing, which this cancellation test does not exercise.
const prepareStart=rendererSource.indexOf(' async function prepareBatches('),prepareEnd=rendererSource.indexOf(' return {layer,prepareBatches',prepareStart);
const setStart=rendererSource.indexOf('setBatches(components:'),setEnd=rendererSource.indexOf('components=appendF107DerivedDisplay(',setStart);
assert(prepareStart>0&&prepareEnd>prepareStart&&setStart>0&&setEnd>setStart);
const rendererHarness=await import(await esm(`export function fixture(ctx:any){
 const {ownerRecoveredSourceComponents,prepareOwnerReconstructionComponents,ownerReconstructionComponents,validate,city}=ctx;
 let destroyed=false,generation=0;const key=(c:any)=>c.objectId+'|'+c.partId;const ownerCommitStep=(_step:any,run:any)=>run();
 ${rendererSource.slice(prepareStart,prepareEnd)}
 function ${rendererSource.slice(setStart,setEnd)}return{source:components,reconstructed,nextSourceLoaded,originalSourceVertices,originalSourceIndices};}
 return{prepareBatches,setBatches,destroy(){destroyed=true;}};
}`));
const managerStart=managerSource.indexOf('  let commitSequence='),managerEnd=managerSource.indexOf('  // Completed spatial batches',managerStart);
assert(managerStart>0&&managerEnd>managerStart);
const managerHarness=await import(await esm(`export function fixture(ctx:any){
 const {signal,ticket,current,cohortLimits,chosen,results,retainedShardCost,railCohort,churchCohort,ownerShapePatchDisplayRows,ownerProfileByComponent,sourceLeafByFeature,ownerShapePatchMetadata,nativePartDisplayPlan,manifestSHA,manifest,verifiedInteriorSourceHolds,sourceEdgeAssemblyDisplayPlan,progressiveAdmission,s020RelationOutlineDisplayPlan,s020FullOriginalBatchRouteReady,mergeShadowAdmissions,shadowByShard,partialGateDisplayPlan,s402ConnectorPlan,s036NorthCofacePlan,s240BaseCofacePlan,f151CrownPlan,map,s434Aggregate,s434CohortSelection,options,renderer,drawn,announce}=ctx;
 const city='berlin',NATIVE_PART_DISPLAY_PROFILES=[],SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES=[],S020_RELATION_OUTLINE_PROFILES=[];
 let destroyed=false,suspended=false,partial=false,koRailCohortDiagnostic70,coChurchCohortDiagnostic70,ownerReconstruction,sourceEdgeAssemblyDisplay,visibleRetainedEstimateBytes=0,generation=0,lastPackedComponents,lastPackedAggregateProfile,lastPackedAggregateDiagnostic='',duplicatePackSkips=0,selectedShardIds=[],lastCommit=0,firstDrawPending=false,finished=true;
 const sameStageComponents=(a:any,b:any)=>!!a&&a.length===b.length&&a.every((c:any,i:number)=>c===b[i]);
 ${managerSource.slice(managerStart,managerEnd)}
 return{commit,get selected(){return selectedShardIds;},get duplicatePackSkips(){return duplicatePackSkips;},destroy(){destroyed=true;},suspend(){suspended=true;}};
}`));
function commitFixture(t,{prepareGate}={}){
 const own=new AbortController(),events=[],prepares=[],commits=[],callbacks=[],retainedShardCost=new WeakMap();let valid=true,recoveryCalls=0,reconstructionCalls=0;
 const cpu=rendererHarness.fixture({city:'berlin',ownerRecoveredSourceComponents:rows=>{recoveryCalls++;return [...rows];},validate:()=>{},
  ownerReconstructionComponents:()=>{throw Error('sync reconstruction must not rerun prepared output');},
  prepareOwnerReconstructionComponents:async(source,signal)=>{reconstructionCalls++;await prepareGate?.(source,signal);signal.throwIfAborted();return{components:source,stats:empty()};}});
 const renderer={prepareBatches:(rows,signal,wait)=>{prepares.push({rows,signal,wait});return cpu.prepareBatches(rows,signal,wait);},setBatches(...args){const result=cpu.setBatches(...args);commits.push({rows:args[0],generation:args[1],prepared:args[11],profile:args[6],result});},setEnabled:value=>events.push(['enabled',value])};
 const chosen=[{id:'one'}],results=[];let packing;
 const ctx={signal:own.signal,ticket:1,current(signal){signal.throwIfAborted();if(!valid)throw new DOMException('Aborted','AbortError');},cohortLimits:{retainedCap:1000},chosen,results,retainedShardCost,
  railCohort:{diagnostic:()=>({})},churchCohort:{diagnostic:()=>({})},ownerShapePatchDisplayRows:rows=>rows,ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),ownerShapePatchMetadata:rows=>({components:rows}),nativePartDisplayPlan:rows=>({hiddenOutlines:[],groups:[],errors:[],rows}),manifestSHA:'hash',manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},source_snapshot:'snapshot'},verifiedInteriorSourceHolds:()=>[],sourceEdgeAssemblyDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),progressiveAdmission:()=>undefined,s020RelationOutlineDisplayPlan:()=>({hiddenOutlines:[],groups:[],errors:[]}),s020FullOriginalBatchRouteReady:()=>false,mergeShadowAdmissions:()=>undefined,shadowByShard:new WeakMap(),partialGateDisplayPlan:()=>undefined,s402ConnectorPlan:()=>undefined,s036NorthCofacePlan:()=>undefined,s240BaseCofacePlan:()=>undefined,f151CrownPlan:()=>undefined,
  map:{getBounds:()=>({getWest:()=>13,getSouth:()=>52,getEast:()=>14,getNorth:()=>53}),getZoom:()=>17},s434Aggregate:{packing:()=>packing,update(_rows,config){callbacks.push(config.onChange);}},s434CohortSelection:{diagnostic:()=>({})},options:{awaitPaintInitialization:p=>p,onNativeGroupDisplay:plan=>events.push(['native',plan.rows])},renderer,drawn:async()=>{},announce:state=>events.push(['state',state])};
 const manager=managerHarness.fixture(ctx);t.after(()=>own.abort());
 const setRows=name=>{const rows=[{...noopRows[0],objectId:name,partId:name+'/component'}];results[0]=rows;retainedShardCost.set(rows,32);return rows;};
 return{manager,renderer,cpu,own,events,prepares,commits,callbacks,setRows,get reconstructionCalls(){return reconstructionCalls;},get recoveryCalls(){return recoveryCalls;},invalidate(){valid=false;},repack(profile,reason='ready'){packing=profile;callbacks.at(-1)(reason);}};
}

test('a newer component snapshot aborts older CPU preparation; only the latest commits and updates UI',async t=>{
 const gates=new Map(),f=commitFixture(t,{prepareGate:async(rows,signal)=>{const g=deferred();gates.set(rows[0].objectId,g);await g.promise;signal.throwIfAborted();}});
 const a=f.setRows('old'),first=f.manager.commit();await tick();const b=f.setRows('new'),second=f.manager.commit();await tick();
 assert.equal(f.prepares[0].signal.aborted,true);gates.get('new').resolve();await second;gates.get('old').resolve();await first;
 assert.equal(f.commits.length,1);assert.equal(f.commits[0].rows[0],b[0]);assert.deepEqual(f.events.filter(e=>e[0]==='native'),[['native',b]]);assert.equal(f.recoveryCalls,2);assert.equal(f.reconstructionCalls,2);assert.notEqual(a[0],b[0]);
});

test('identical in-flight snapshots share CPU preparation and S434 repacks reuse the prepared result',async t=>{
 const gate=deferred(),f=commitFixture(t,{prepareGate:()=>gate.promise});f.setRows('same');const first=f.manager.commit(),second=f.manager.commit();await tick();assert.equal(f.prepares.length,1);
 gate.resolve();await Promise.all([first,second]);assert.equal(f.commits.length,1);const prepared=f.commits[0].prepared;
 f.repack({profile:'ready'});f.repack({profile:null},'invalidated');assert.equal(f.commits.length,3);assert(f.commits.every(c=>c.prepared===prepared));assert.equal(f.recoveryCalls,1);assert.equal(f.reconstructionCalls,1);
 await f.manager.commit();assert.equal(f.prepares.length,1);assert.equal(f.manager.duplicatePackSkips,1);
});

test('request cancellation, stale ticket and renderer destruction reject late preparation without committing',async t=>{
 for(const action of ['abort','ticket','destroy']){
  const gate=deferred(),f=commitFixture(t,{prepareGate:()=>gate.promise});f.setRows(action);const pending=f.manager.commit();await tick();
  if(action==='abort')f.own.abort();else if(action==='ticket')f.invalidate();else f.cpu.destroy();gate.resolve();await assert.rejects(pending,{name:'AbortError'});assert.equal(f.commits.length,0);assert.deepEqual(f.events,[]);
 }
});

test('failed CPU preparation does not poison a later retry or silently remove owner errors',async t=>{
 let fail=true;const f=commitFixture(t,{prepareGate:async()=>{if(fail)throw Error('frozen owner unavailable');}});f.setRows('same');await assert.rejects(f.manager.commit(),/frozen owner unavailable/);assert.equal(f.commits.length,0);
 fail=false;await f.manager.commit();assert.equal(f.commits.length,1);assert.equal(f.prepares.length,2);
 assert.throws(()=>f.cpu.setBatches([{...noopRows[0]}],10,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,f.commits[0].prepared),/Prepared owner input changed/);
});


test('prepared commit keeps the original pre-chain source map and source counts without validating mutated display output',async()=>{
 const raw={...noopRows[0],batches:[{positions:[0,0,0,1,0,0,0,1,0],indices:[0,1,2]}]},input=[raw];let validations=0;
 const cpu=rendererHarness.fixture({city:'berlin',ownerRecoveredSourceComponents:rows=>[...rows],validate:()=>{validations++;},ownerReconstructionComponents:()=>{throw Error('must use prepared result');},prepareOwnerReconstructionComponents:async source=>{
  source[0].batches[0].positions.push(1,1,0);source[0].batches[0].indices.push(1,2,3);
  source[0]={...source[0],objectId:'display-only-replacement',partId:'display-only-replacement/component'};
  return{components:source,stats:empty()};
 }});
 const prepared=await cpu.prepareBatches(input,new AbortController().signal);
 const out=cpu.setBatches(input,1,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,prepared);
 assert.equal(out.originalSourceVertices,3);assert.equal(out.originalSourceIndices,3);assert.equal(out.nextSourceLoaded.get(raw.objectId+'|'+raw.partId),raw);assert.equal(out.nextSourceLoaded.size,1);assert.equal(validations,1);
 assert.equal(out.reconstructed.components[0].objectId,'display-only-replacement');
});
