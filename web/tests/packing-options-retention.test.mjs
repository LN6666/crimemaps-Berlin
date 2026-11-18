// The chunk store keeps an entry's dispose (and, until completion, costs) for
// the entry's whole life, recent included. Whatever those two functions share
// a scope with stays alive with the entry. The packing producers must
// therefore hand the store module-scope dispose/costs that read only the
// produced value, and drop the packing options once production settles.
// Run with: node --expose-gc --test tests/packing-options-retention.test.mjs
//
// Against the pre-change producers (root500 sha256 f51800d5…, delegated500
// 5255f1a6…, substituted at bundle time) the resident, recent, kept-request,
// in-flight-hit and static tests fail, and so do the two hand-over contract
// tests, which lock the guard the fix added. The control and the failure,
// abort, context-loss, late-value, refused-cost and pre-aborted tests pass on
// them as well: those exits already dropped the options, and the tests keep
// them that way.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {PACKING_FILES,acquireChunk,acquireMesh,alive,category,collect,context,deferredProduceStore,disposeCountingStore,doubleProduceStore,lossyContext,meshPackOptions,requestKeepingStore,runtime,setup} from './support/packing-retention-runtime.mjs';

test('control: an entry whose dispose shares a scope with its producer pins that scope while resident and recent',async()=>{
 const f=setup();
 const {lease,refs}=(()=>{
  const sentinel={payload:new Uint8Array(1<<16)};
  const lease=f.store.acquire({contentKey:'retention-control',role:'candidate',allowRecent:true,estimate:{category:'packed',bytes:64,precision:'exact'},
   produce:()=>({bytes:new Uint8Array(64),size:sentinel.payload.length}),dispose(){void sentinel;}});
  return{lease,refs:{sentinel:new WeakRef(sentinel)}};
 })();
 await lease.ready;await collect();
 assert.deepEqual(alive(refs),['sentinel'],'resident: the measurement sees a pinned scope');
 lease.release();assert.equal(f.store.stats.recent,1);await collect();
 assert.deepEqual(alive(refs),['sentinel'],'recent: the entry still keeps its dispose');
 f.store.evictRecent();await collect();
 assert.deepEqual(alive(refs),[],'the scope goes with the entry');
 f.close();
});

test('root500 acquirePackedMeshChunk: a resident chunk keeps neither its packing options nor their callback scope',async()=>{
 const f=setup(),{lease,refs}=acquireMesh(f,context());
 await lease.ready;const value=lease.value;
 assert.equal(f.events.materials,1);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1,'the source role ends with production');
 await collect();
 assert.deepEqual(alive(refs),[],'options, callbacks and their scope are collectable while the chunk is resident');
 assert.equal(lease.state,'ready');assert.equal(lease.value,value);
 // Exact charges of the payload itself, unchanged by dropping the options.
 const exact=[value.vertices,value.indices,value.paint,value.progressive,value.baseState].reduce((n,a)=>n+a.buffer.byteLength,0);
 assert.deepEqual(category(f.budget,'packed'),{bytes:exact,exactBytes:exact,estimatedBytes:0});
 assert.deepEqual(category(f.budget,'mask'),{bytes:2048,exactBytes:2048,estimatedBytes:0});
 assert.equal(category(f.budget,'metadata').bytes,value.metadataBytes);
 assert.equal(f.events.auxiliary,0,'a resident chunk keeps its sidecar');
 lease.release();f.store.evictRecent();
 assert.equal(f.events.auxiliary,1,'dispose releases the sidecar once');assert.equal(category(f.budget,'packed').bytes,0);
 f.close();assert.equal(f.budget.stats.bytes,0);
});

// Keep the adapter's original callback in a separate factory activation, not
// the live test's async/IIFE scope. The submitted callbacks are themselves weak
// witnesses, so this does not hide a scheduler/work-context closure leak.
function steppedMaterialAdapter(materials,held,refs){
 return async(rows,signal,work)=>{
  held.work=work;let value,complete=false;
  const materialWork=()=>materials(rows,signal);refs.materialWork=new WeakRef(materialWork);
  try{
   value=await work.run(materialWork,'retention-materials');let step=0;
   const materialSteps=()=>++step===3;refs.materialSteps=new WeakRef(materialSteps);
   await work.steps(materialSteps,'retention-material-steps');complete=true;return value;
  }finally{if(!complete)value?.release?.();}
 };
}
function acquireEscapedMaterialContext(f,held){
 const {options,refs}=meshPackOptions(f);
 options.materials=steppedMaterialAdapter(options.materials,held,refs);
 refs.asyncMaterials=new WeakRef(options.materials);
 return{lease:runtime.acquirePackedMeshChunk(f.store,context(),options,undefined,()=>{}),refs};
}
test('root500 asynchronous materials: an escaped settled work context retains neither packing options nor source callbacks',async()=>{
 const f=setup(),held={}, {lease,refs}=acquireEscapedMaterialContext(f,held);
 await lease.ready;await collect();
 assert.deepEqual(alive(refs),[],'closing a provider work context drops its producer/source closure even if that context escapes');
 assert.throws(()=>held.work.run(()=>{}),/production has settled/);
 assert.equal(f.events.materials,1);assert.equal(f.events.retains,f.events.releases);assert.equal(f.events.auxiliary,0);
 lease.release();f.store.evictRecent();assert.equal(f.events.auxiliary,1);f.close();assert.equal(f.budget.stats.bytes,0);
});

test('root500 acquirePackedMeshChunk: a recent entry keeps neither; a recent hit reuses the payload and drops its own options',async()=>{
 const f=setup(),gl=context(),first=acquireMesh(f,gl);
 await first.lease.ready;const value=first.lease.value;
 first.lease.release();assert.equal(f.store.stats.recent,1,'the released chunk stays as a recent entry');
 await collect();
 assert.deepEqual(alive(first.refs),[],'options, callbacks and their scope are collectable while the chunk is recent');
 const second=acquireMesh(f,gl);
 assert.equal(second.lease.state,'ready');assert.equal(second.lease.value,value);assert.equal(f.store.stats.recent,0);
 assert.equal(f.events.materials,1,'a recent hit does not pack again');
 assert.equal(f.events.retains,2);assert.equal(f.events.releases,2,'a hit releases its source role at once');
 await collect();
 assert.deepEqual(alive(second.refs),[],'the hit request keeps nothing either');
 assert.equal(second.lease.value,value);
 second.lease.release();f.store.evictRecent();
 assert.equal(f.events.auxiliary,1,'the sidecar is released once, at eviction');assert.equal(category(f.budget,'packed').bytes,0);
 f.close();assert.equal(f.budget.stats.bytes,0);
});

test('root500 acquirePackedMeshChunk: failed packing drops its options and releases its sidecar and source role once',async()=>{
 const f=setup(),{lease,refs}=acquireMesh(f,context(),{fail:'runs'});
 await assert.rejects(lease.ready,/fixture runs failed/);
 await collect();
 assert.equal(f.events.materials,1);assert.equal(f.events.auxiliary,1,'the sidecar made before the failure is released');
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

test('root500 acquirePackedMeshChunk: packing aborted before the scheduler runs drops its options',async()=>{
 const f=setup(),controller=new AbortController(),{lease,refs}=acquireMesh(f,context(),{signal:controller.signal});
 controller.abort();
 await assert.rejects(lease.ready,error=>error?.name==='AbortError');
 await collect();
 assert.equal(f.events.materials,0);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);
 f.close();assert.equal(f.budget.stats.bytes,0);
});

for(const mode of ['scheduled','synchronous']){
 const gl=()=>mode==='scheduled'?context():undefined;
 test(`delegated500 acquirePackedChunk (${mode}): a resident chunk keeps neither its producer nor the producer's scope`,async()=>{
  const f=setup(),{lease,refs}=acquireChunk(f,{gl:gl()});
  await lease.ready;const value=lease.value;
  assert.equal(f.events.produced,1);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1,'the production role ends with production');
  await collect();
  assert.deepEqual(alive(refs),[],'producer callbacks and their scope are collectable while the chunk is resident');
  assert.equal(lease.state,'ready');assert.equal(lease.value,value);
  const exact=[value.vertices,value.indices,value.paint,value.progressive,value.initialState,value.indexedPick.bounds].reduce((n,a)=>n+a.byteLength,0);
  assert.deepEqual(category(f.budget,'packed'),{bytes:exact,exactBytes:exact,estimatedBytes:0},'costs of the packed value replace the estimate');
  assert.deepEqual(category(f.budget,'mask'),{bytes:2048,exactBytes:2048,estimatedBytes:0});
  assert.equal(category(f.budget,'metadata').bytes,512+value.sourceRowCount*256);
  lease.release();f.store.evictRecent();
  assert.equal(f.events.masks,1,'dispose releases the mask recipe once');assert.equal(category(f.budget,'packed').bytes,0);
  f.close();assert.equal(f.budget.stats.bytes,0);
 });
 test(`delegated500 acquirePackedChunk (${mode}): a recent entry keeps neither; a recent hit never runs its producer and drops it`,async()=>{
  const f=setup(),shared=gl(),first=acquireChunk(f,{gl:shared});
  await first.lease.ready;const value=first.lease.value;
  first.lease.release();assert.equal(f.store.stats.recent,1);
  await collect();
  assert.deepEqual(alive(first.refs),[],'producer callbacks and their scope are collectable while the chunk is recent');
  const second=acquireChunk(f,{gl:shared});
  assert.equal(second.lease.state,'ready');assert.equal(second.lease.value,value);
  assert.equal(f.events.produced,1,'a recent hit does not produce again');assert.equal(f.events.retains,1,'a hit takes no production role');
  await collect();
  assert.deepEqual(alive(second.refs),[]);
  second.lease.release();f.store.evictRecent();
  assert.equal(f.events.masks,1);assert.equal(category(f.budget,'packed').bytes,0);
  f.close();assert.equal(f.budget.stats.bytes,0);
 });
}

test('delegated500 acquirePackedChunk: failed production drops the producer and releases its production role once',async()=>{
 const f=setup(),{lease,refs}=acquireChunk(f,{gl:context(),fail:true});
 await assert.rejects(lease.ready,/fixture chunk packing failed/);
 await collect();
 assert.equal(f.events.produced,1);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

// The decision's second half: a production drops the options once it settles
// (success or failure), and a request that starts no production (a store hit)
// drops them when acquisition returns, even if something kept the request.
test('root500 acquirePackedMeshChunk: a kept request frees the options once production settles, fails, or the acquisition is a hit',async()=>{
 const f=setup(),gl=context(),kept=requestKeepingStore(f.store);
 const produced=acquireMesh(f,gl,{store:kept.store});await produced.lease.ready;
 const hit=acquireMesh(f,gl,{store:kept.store});assert.equal(hit.lease.value,produced.lease.value);
 const failed=acquireMesh(f,gl,{store:kept.store,fail:'runs',provider:'root500:retention-failure'});
 await assert.rejects(failed.lease.ready,/fixture runs failed/);
 assert.equal(kept.requests.length,3);
 await collect();
 assert.deepEqual({produced:alive(produced.refs),hit:alive(hit.refs),failed:alive(failed.refs)},{produced:[],hit:[],failed:[]});
 assert.equal(f.events.materials,2);assert.equal(f.events.retains,3);assert.equal(f.events.releases,3);assert.equal(f.events.auxiliary,1,'only the failed sidecar is released yet');
 hit.lease.release();produced.lease.release();failed.lease.release();f.store.evictRecent();
 assert.equal(f.events.auxiliary,2);f.close();assert.equal(f.budget.stats.bytes,0);
});

for(const mode of ['scheduled','synchronous'])test(`delegated500 acquirePackedChunk (${mode}): a kept request frees the producer once production settles, fails, or the acquisition is a hit`,async()=>{
 const f=setup(),gl=mode==='scheduled'?context():undefined,kept=requestKeepingStore(f.store);
 const produced=acquireChunk(f,{gl,store:kept.store});await produced.lease.ready;
 const hit=acquireChunk(f,{gl,store:kept.store});assert.equal(hit.lease.value,produced.lease.value);
 const failed=acquireChunk(f,{gl,store:kept.store,fail:true,contentKey:'retention-failure'});
 await assert.rejects(failed.lease.ready,/fixture chunk packing failed/);
 assert.equal(kept.requests.length,3);
 await collect();
 assert.deepEqual({produced:alive(produced.refs),hit:alive(hit.refs),failed:alive(failed.refs)},{produced:[],hit:[],failed:[]});
 assert.equal(f.events.produced,2);assert.equal(f.events.retains,2);assert.equal(f.events.releases,2);
 hit.lease.release();produced.lease.release();failed.lease.release();f.store.evictRecent();
 assert.equal(f.events.masks,1);f.close();assert.equal(f.budget.stats.bytes,0);
});

// The remaining exits: context loss, a late value, an in-flight hit, refused
// costs and a signal aborted before acquisition. Each ends every role once,
// leaves the ledger at zero and keeps no options.
test('root500 acquirePackedMeshChunk: context loss while packing is queued settles as lost, ends the source role once and drops the options',async()=>{
 const f=setup(),gl=lossyContext(),{lease,refs}=acquireMesh(f,gl);
 gl.lost=true;
 await assert.rejects(lease.ready,error=>error?.name==='ChunkResourceContextLostError');
 assert.equal(lease.state,'lost');
 await collect();
 assert.equal(f.events.materials,0,'nothing is packed for a lost context');assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

test('delegated500 acquirePackedChunk (scheduled): context loss while production is queued settles as lost, ends the production role once and drops the producer',async()=>{
 const f=setup(),gl=lossyContext(),{lease,refs}=acquireChunk(f,{gl});
 gl.lost=true;
 await assert.rejects(lease.ready,error=>error?.name==='ChunkResourceContextLostError');
 assert.equal(lease.state,'lost');
 await collect();
 assert.equal(f.events.produced,0);assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

// Late value: the only consumer leaves after the work made its value and
// before the store sees it. It leaves from a later microtask, by a closure made
// here: an abort made synchronously inside a packing callback would capture
// that callback's frame in the unformatted stacks of the abort reasons that the
// consumer's signal and the released lease keep (store behaviour, outside the
// producers).
test('root500 acquirePackedMeshChunk: a late value is disposed once through the module dispose and keeps no options',async()=>{
 const f=setup(),view=disposeCountingStore(f.store),controller=new AbortController(),seen={};
 const leave=()=>{seen.materials=f.events.materials;seen.auxiliary=f.events.auxiliary;controller.abort();};
 const {lease,refs}=acquireMesh(f,context(),{store:view.store,signal:controller.signal,onRuns:()=>queueMicrotask(leave)});
 await assert.rejects(lease.ready,error=>error?.name==='AbortError');
 await collect();
 assert.deepEqual(seen,{materials:1,auxiliary:0},'packing had finished and nothing was released when the consumer left');
 assert.equal(view.disposed,1,'the store disposes the late value');assert.equal(f.events.auxiliary,1,'which releases its sidecar once');
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);assert.equal(f.store.stats.callbackErrors,0);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);assert.equal(category(f.budget,'mask').bytes,0);
 f.close();assert.equal(f.budget.stats.bytes,0);
});

test('delegated500 acquirePackedChunk (scheduled): a late value is disposed once through the module dispose and keeps no producer',async()=>{
 const f=setup(),view=disposeCountingStore(f.store),controller=new AbortController(),seen={};
 const leave=()=>{seen.produced=f.events.produced;seen.masks=f.events.masks;controller.abort();};
 const {lease,refs}=acquireChunk(f,{gl:context(),store:view.store,signal:controller.signal,onProduced:()=>queueMicrotask(leave)});
 await assert.rejects(lease.ready,error=>error?.name==='AbortError');
 await collect();
 assert.deepEqual(seen,{produced:1,masks:0},'the producer had returned and nothing was released when the consumer left');
 assert.equal(view.disposed,1,'the store disposes the late value');assert.equal(f.events.masks,1,'which releases its mask recipe once');
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);assert.equal(f.store.stats.callbackErrors,0);
 assert.deepEqual(alive(refs),[]);
 assert.equal(category(f.budget,'packed').bytes,0);assert.equal(category(f.budget,'mask').bytes,0);
 f.close();assert.equal(f.budget.stats.bytes,0);
});

test('root500 acquirePackedMeshChunk: a hit while packing is in flight ends its own source role at once and shares the value; neither request keeps options',async()=>{
 const f=setup(),gl=context(),hits=f.store.stats.hits,first=acquireMesh(f,gl),second=acquireMesh(f,gl);
 assert.equal(second.lease.state,'preparing');assert.equal(f.store.stats.hits,hits+1);
 assert.equal(f.events.retains,2);assert.equal(f.events.releases,1,'the in-flight hit ends its source role when acquisition returns');
 await Promise.all([first.lease.ready,second.lease.ready]);
 assert.equal(second.lease.value,first.lease.value);assert.equal(f.events.materials,1);assert.equal(f.events.releases,2);
 await collect();
 assert.deepEqual({first:alive(first.refs),second:alive(second.refs)},{first:[],second:[]});
 first.lease.release();second.lease.release();f.store.evictRecent();
 assert.equal(f.events.auxiliary,1);f.close();assert.equal(f.budget.stats.bytes,0);
});

test('delegated500 acquirePackedChunk (scheduled): a hit while production is in flight takes no production role and shares the value; neither request keeps the producer',async()=>{
 const f=setup(),gl=context(),hits=f.store.stats.hits,first=acquireChunk(f,{gl}),second=acquireChunk(f,{gl});
 assert.equal(second.lease.state,'preparing');assert.equal(f.store.stats.hits,hits+1);
 assert.equal(f.events.retains,1,'only the started production takes a role');
 await Promise.all([first.lease.ready,second.lease.ready]);
 assert.equal(second.lease.value,first.lease.value);assert.equal(f.events.produced,1);assert.equal(f.events.releases,1);
 await collect();
 assert.deepEqual({first:alive(first.refs),second:alive(second.refs)},{first:[],second:[]});
 first.lease.release();second.lease.release();f.store.evictRecent();
 assert.equal(f.events.masks,1);f.close();assert.equal(f.budget.stats.bytes,0);
});

test('delegated500 acquirePackedChunk (scheduled): actual costs above the reservation fail the entry; the refused value is disposed once and the producer dropped',async()=>{
 const f=setup(),view=disposeCountingStore(f.store),{lease,refs}=acquireChunk(f,{gl:context(),store:view.store,estimate:16,contentKey:'retention-overrun'});
 await assert.rejects(lease.ready,/Chunk actual logical cost exceeds reserved capacity/);
 assert.equal(lease.state,'failed');
 await collect();
 assert.equal(f.events.produced,1);assert.equal(view.disposed,1,'the store disposes the refused value');assert.equal(f.events.masks,1);
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

test('root500 acquirePackedMeshChunk: a refused production.adjust fails with the ledger pressure, releases the sidecar and source role once and drops the options',async()=>{
 // Run metadata above the estimate, on a ledger 16 bytes larger than the
 // reservation an identical request makes.
 const roomy=setup(),probe=acquireMesh(roomy,context(),{extraRuns:400}),reserved=roomy.budget.stats.bytes;
 await probe.lease.ready;probe.lease.release();roomy.close();
 const f=setup(reserved+16),{lease,refs}=acquireMesh(f,context(),{extraRuns:400});
 assert.equal(f.budget.stats.bytes,reserved,'the estimate is admitted');
 await assert.rejects(lease.ready,error=>error?.name==='ResourceBudgetExceededError');
 assert.equal(lease.state,'failed');
 await collect();
 assert.equal(f.events.materials,1);assert.equal(f.events.auxiliary,1,'the sidecar made before the refusal is released once');
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1);
 assert.deepEqual(alive(refs),[]);
 lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

test('both producers: a signal aborted before acquisition throws AbortError and takes no source or production role',()=>{
 const f=setup(),controller=new AbortController(),resources=f.store.stats.resources;controller.abort();
 assert.throws(()=>acquireMesh(f,context(),{signal:controller.signal}),error=>error?.name==='AbortError');
 for(const gl of [context(),undefined])assert.throws(()=>acquireChunk(f,{gl,signal:controller.signal}),error=>error?.name==='AbortError');
 assert.deepEqual({...f.events},{materials:0,retains:0,releases:0,auxiliary:0,produced:0,masks:0});
 assert.equal(f.store.stats.resources,resources,'no entry is made');
 f.close();assert.equal(f.budget.stats.bytes,0);
});

// The hand-over relies on the store calling produce at most once, synchronously
// inside acquire (chunk-resource-store has that one call site). A store that
// broke this gets a loud failure naming it, never a second packing or a second
// release of a role.
test('both producers: a production started after acquire returned fails loudly, packs nothing and ends each role once',async()=>{
 const f=setup(),deferred=deferredProduceStore(f.store);
 const mesh=acquireMesh(f,context(),{store:deferred});
 assert.equal(f.events.retains,1);assert.equal(f.events.releases,1,'the source role ended when acquisition returned');
 await assert.rejects(mesh.lease.ready,/Chunk mesh produce called more than once or after acquire returned/);
 const chunk=acquireChunk(f,{gl:context(),store:deferred});
 await assert.rejects(chunk.lease.ready,/Packed chunk produce called more than once or after acquire returned/);
 assert.equal(f.events.materials,0);assert.equal(f.events.produced,0);
 assert.equal(f.events.retains,1,'no production role is taken');assert.equal(f.events.releases,1);
 await collect();
 assert.deepEqual({mesh:alive(mesh.refs),chunk:alive(chunk.refs)},{mesh:[],chunk:[]});
 mesh.lease.release();chunk.lease.release();f.close();assert.equal(f.budget.stats.bytes,0);
});

test('both producers: a second produce call inside acquire fails loudly and leaves the started production intact',async()=>{
 const f=setup(),double=doubleProduceStore(f.store);
 const mesh=acquireMesh(f,context(),{store:double.store}),chunk=acquireChunk(f,{gl:context(),store:double.store});
 assert.deepEqual(double.errors.map(error=>error.message),['Chunk mesh produce called more than once or after acquire returned','Packed chunk produce called more than once or after acquire returned']);
 assert.equal(double.starts,0,'no second production starts');
 await Promise.all([mesh.lease.ready,chunk.lease.ready]);
 assert.equal(f.events.materials,1);assert.equal(f.events.produced,1);
 assert.equal(f.events.retains,2);assert.equal(f.events.releases,2,'each role ends once, with its one production');
 await collect();
 assert.deepEqual({mesh:alive(mesh.refs),chunk:alive(chunk.refs)},{mesh:[],chunk:[]});
 mesh.lease.release();chunk.lease.release();f.store.evictRecent();
 assert.equal(f.events.auxiliary,1);assert.equal(f.events.masks,1);f.close();assert.equal(f.budget.stats.bytes,0);
});

// Static guard for the same contract: the store request's dispose and costs
// name module-scope functions whose only free names are module declarations.
function storeRequestHooks(file,producer){
 const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),declared=new Map();
 for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&node.name)declared.set(node.name.text,node);
  else if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name))declared.set(declaration.name.text,declaration);
 }
 const imported=new Set(ast.statements.filter(ts.isImportDeclaration).flatMap(node=>{const clause=node.importClause;if(!clause)return[];const names=clause.name?[clause.name.text]:[];const bindings=clause.namedBindings;if(bindings&&ts.isNamedImports(bindings))names.push(...bindings.elements.map(element=>element.name.text));else if(bindings)names.push(bindings.name.text);return names;}));
 const fn=declared.get(producer);assert(fn&&ts.isFunctionDeclaration(fn),producer+' is a module function');
 const requests=[];(function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='acquire'&&ts.isObjectLiteralExpression(node.arguments[0]??node))requests.push(node.arguments[0]);ts.forEachChild(node,visit);})(fn.body);
 assert.equal(requests.length,1,producer+' makes one store request');
 const hooks={};
 for(const name of ['dispose','costs']){
  const property=requests[0].properties.find(row=>row.name?.getText(ast)===name);assert(property,producer+' passes '+name);
  const reference=ts.isShorthandPropertyAssignment(property)?property.name:ts.isPropertyAssignment(property)&&ts.isIdentifier(property.initializer)?property.initializer:undefined;
  assert(reference,`${producer}: ${name} is a reference to a module-scope function, not a closure made in the producer`);
  const target=declared.get(reference.text);assert(target,`${producer}: ${name} (${reference.text}) is declared at module scope`);
  const body=ts.isFunctionDeclaration(target)?target:target.initializer;assert(body&&(ts.isFunctionLike(body)),`${reference.text} is a function`);
  hooks[name]={name:reference.text,free:freeNames(body).filter(id=>!(declared.has(id)||imported.has(id)))};
 }
 return hooks;
}
/** Identifiers a function reads that it does not declare (types, property
 * names and its own or nested bindings excluded). */
function freeNames(fn){
 const local=new Set(),used=new Set();
 (function visit(node){
  if(ts.isTypeNode(node)||ts.isTypeParameterDeclaration(node))return;
  if(ts.isParameter(node)||ts.isVariableDeclaration(node)||ts.isBindingElement(node)){collectBindings(node.name,local);if(node.initializer)visit(node.initializer);return;}
  if(ts.isPropertyAccessExpression(node)){visit(node.expression);return;}
  if(ts.isPropertyAssignment(node)){if(ts.isComputedPropertyName(node.name))visit(node.name);visit(node.initializer);return;}
  if(ts.isAsExpression(node)||ts.isSatisfiesExpression?.(node)){visit(node.expression);return;}
  if(ts.isIdentifier(node)){used.add(node.text);return;}
  ts.forEachChild(node,visit);
 })(fn);
 return[...used].filter(id=>!local.has(id)&&!['undefined','Array','Math','Number','Object','Error'].includes(id));
}
function collectBindings(name,into){if(ts.isIdentifier(name))into.add(name.text);else for(const element of name.elements??[])if(!ts.isOmittedExpression(element))collectBindings(element.name,into);}

test('both producers hand the store module-scope dispose/costs that read only the produced value',()=>{
 for(const [file,producer]of [[PACKING_FILES.root500,'acquirePackedMeshChunk'],[PACKING_FILES.delegated500,'acquirePackedChunk']]){
  const hooks=storeRequestHooks(file,producer);
  for(const [name,hook]of Object.entries(hooks))assert.deepEqual(hook.free,[],`${producer}: ${name} (${hook.name}) reads no producer-scope name`);
 }
});
