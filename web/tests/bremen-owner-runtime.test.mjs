import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';

// Real owner runtime + DataLeaseStore + source-guarded AG70 recipe. Only the
// mixed 132/19 certificate factory is replaced: this explicit tiny substitute
// deliberately retains the supplied parsed model and returns nested aliases.
// Its schema/geometry admission is covered by the separate real-factory tests;
// this file tests owner lifetime, snapshot ownership and failure integration.
const web=fileURLToPath(new URL('../',import.meta.url)),bremen=path.join(web,'src/painted/bremen/safety');
const fakeCertificates=`import {EDGE70_SHA,EDGE70_RESOURCE} from './bremen-ag70-metadata';
let nextFailure,observer,created=0,disposed=0;
export const observeNextParsed=callback=>{observer=callback;};
export const failNextCertificateFactory=error=>{nextFailure=error;};
export const certificateFixtureStats=()=>({created,disposed});
// The batch-scope certificate entry points the runtime now imports. The tiny batch
// preparation completes the union for a live scope; group readiness follows it.
const preparedScopes=new WeakSet();
export async function prepareBremenHeldSourceCertificates(scope,components,signal,force=false){signal.throwIfAborted();if(scope.stats.disposed)throw Error('Tiny certificate preparation on a disposed scope');preparedScopes.add(scope);}
export function hasPreparedBremenCertificateUnion(scope){return preparedScopes.has(scope)&&!scope.stats.disposed;}
export function hasPreparedBremenCertificateGroup(scope,groupKey){return typeof groupKey==='string'&&hasPreparedBremenCertificateUnion(scope);}
// Like the actual factory, the runtime supplies no AG70 input (undefined): the
// factory reads the parsed AG70 model through the batch scope it is given.
export function createBremenHeldSourceCertificates(input,scope){
 const data=input??scope.borrow(EDGE70_RESOURCE,value=>value);
 created++;const callback=observer;observer=undefined;callback?.(data);
 if(nextFailure){const error=nextFailure;nextFailure=undefined;throw error;}
 let resident=data;
 const model=()=>{if(!resident)throw Error('Tiny certificate scope disposed');return resident.models[0];};
 const record=identity=>{const m=model();if(!m.requiredNativeGroup.some(r=>r.objectId===identity?.objectId&&r.partId===identity?.partId))return null;return {patchSHA256:EDGE70_SHA,identity:m.requiredNativeGroup[0],parent:m.displays[0],display:m.displays[0].batches,source:m.nativeSourceComponents[0],model:m};};
 return {
  bremenHeldSourceRule:record,
  serializeBremenHeldSourceReadback(c,leaf,generation){const r=record(c);return r&&{...r,certificateKind:'tiny-held',generation,sourceLeafSHA256:leaf?.(c),requiredWholeDisplayParent:r.parent};},
  serializeBremenWholeDisplayCertificate(c,generation,source,leaf){const r=record(c);return r&&{...r,certificateKind:'tiny-whole',generation,originalSource:source,sourceLeafSHA256:leaf?.(source)};},
  dispose(){if(resident){resident=undefined;disposed++;}}
 };
}`;
const built=await build({stdin:{contents:`export {createBremenOwnerRuntime} from './src/painted/bremen/safety/bremen-owner-runtime';export {createFrozenDataLeaseStore} from './src/safety/frozen-data-lease-store';export {EDGE70_SHA,EDGE70_RESOURCE} from './src/painted/bremen/safety/bremen-ag70-metadata';export {EDGE70_IDENTITIES} from './src/painted/bremen/safety/bremen-ag70-identities';export {createEdgeAg70Recipe,edgeAg70Identity} from './src/painted/bremen/safety/bremen-ag70-runtime';export {nativePaintSignature} from './src/painted/bremen/safety/progressive-native-signature';export {observeNextParsed,failNextCertificateFactory,certificateFixtureStats} from './src/painted/bremen/safety/bremen-held-source-certificates';`,resolveDir:web,sourcefile:'owner-runtime-fixture.ts',loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',target:'es2022',plugins:[{name:'explicit-tiny-certificate-scope',setup(builder){
 builder.onResolve({filter:/bremen-held-source-certificates$/},()=>({path:'tiny-held-scope',namespace:'tiny-certificates'}));
 builder.onLoad({filter:/.*/,namespace:'tiny-certificates'},()=>({contents:fakeCertificates,loader:'js',resolveDir:bremen}));
 builder.onResolve({filter:/frozen-paint-tables|painted-tables|\.json(?:\.gz)?$/},()=>{throw Error('Original table or one-shot initializer must not enter OwnerRuntime tests');});
}}]});
const {createBremenOwnerRuntime,createFrozenDataLeaseStore,EDGE70_SHA,EDGE70_RESOURCE,EDGE70_IDENTITIES,createEdgeAg70Recipe,edgeAg70Identity,nativePaintSignature,observeNextParsed,failNextCertificateFactory,certificateFixtureStats}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
// Execute the actual aggregation-local arrow, not a reimplementation of its
// demand predicate. The full multi-owner chain is intentionally not bundled.
const ownerSource=await readFile(path.join(bremen,'owner-reconstruction.ts'),'utf8'),ownerAST=ts.createSourceFile('owner-reconstruction.ts',ownerSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
assert.equal(ownerAST.parseDiagnostics.length,0);
// The aggregation-local AG70 boundary now lives in the staged Bremen chain (bremenOwnerStages),
// which runs it through bremenScopedCall with the batch scope.
const aggregate=ownerAST.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='bremenOwnerStages');assert(aggregate);
const agArrows=[];(function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ownerAST)==='edgeAg70Reconstruction'){assert(ts.isArrowFunction(node.initializer));agArrows.push(node.initializer);}ts.forEachChild(node,visit);})(aggregate);
assert.equal(agArrows.length,1,'One actual aggregation-local AG70 boundary');
const aggregateArrowJS=ts.transpileModule('('+agArrows[0].getText(ownerAST)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
// edgeAg70Identity is not a scoped recipe data function, so bremenScopedCall calls it with its own
// arguments (its registry has no entry for it); the batch scope is passed through to the runtime.
assert(!ownerSource.includes('bremenScopedCall(edgeAg70Identity,[c],scope)')||!(await readFile(path.join(bremen,'bremen-recipe-stages.ts'),'utf8')).includes('edgeAg70Identity'),'edgeAg70Identity has no scoped call registration');
const aggregateAG70=(ownerRuntime,scope)=>Function('ownerRuntime','edgeAg70Identity','bremenScopedCall','scope','return '+aggregateArrowJS)(ownerRuntime,edgeAg70Identity,(fn,args)=>fn(...args),scope);
const signal=()=>new AbortController().signal,tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const deadline=async(promise,label='owner work')=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' did not settle before deadline')),1000))]);}finally{clearTimeout(timer);}};
const hash=value=>createHash('sha256').update(value).digest('hex');
// Lease accounting of the batch-scope data path. A runtime's one legacy scope
// prepares the single AG70 resource (stats.leases counts scope resources). The
// recipe memo and the certificate memo (the factory reads AG70 through the scope)
// each retain that lease as a memo parent, so a published runtime holds three
// lease-store leases; while the adapter delays publication only the scope lease
// and the certificate memo parent (built inside the forced preparation) exist.
const SCOPE_RESOURCES=1,PREPARED_STORE_LEASES=3,PREPARING_STORE_LEASES=2;
function drained(store){for(const key of ['entries','valueCells','waiters','leases','active','queued','logicalBytesWithLiveLease'])assert.equal(store.stats[key],0,key+' must drain');}
function unprepared(runtime){assert.equal(runtime.stats.prepared,false);assert.equal(runtime.stats.leases,0);assert.throws(()=>runtime.edgeAg70Reconstruction([]),/not prepared|disposed/);}
function fixture(t,{reader}={}){
 const rows=EDGE70_IDENTITIES.map((identity,index)=>({city:'bremen',...identity,origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]},sourceFeature:{type:'Feature',properties:{fixture:index}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}]}));
 const leaf=row=>'leaf-'+row?.partId,data={models:[{targetId:'owner-tiny-ag70',requiredNativeGroup:rows.map(row=>({objectId:row.objectId,partId:row.partId,signature:nativePaintSignature(row),sourceLeafSHA256:leaf(row)})),nativeSourceComponents:structuredClone(rows),displays:[{objectId:rows[0].objectId,partId:rows[0].partId,origin:[8.81,53.08],inScope:true,batches:[{positions:[0,0,0,2,0,0,0,2,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.75,.75,.75],paint:Array(12).fill(.25),frames:Array(15).fill(.5),extras:{nested:[{value:7}]}}]}]}]};
 const bytes=new TextEncoder().encode(JSON.stringify(data)),sha256=hash(bytes),descriptor={path:'/safety/buildings3d/painted-tables/'+sha256.slice(0,2)+'/'+sha256+'.json',sha256,bytes:bytes.length},store=createFrozenDataLeaseStore([descriptor]),runtimes=[],clients=[];
 let reads=0;
 const read=async(p,s,max)=>{reads++;assert.equal(p,descriptor.path);assert.equal(max,bytes.length);s.throwIfAborted();return reader?reader({p,signal:s,max,bytes,read:reads}):bytes;};
 const config={city:'bremen',provider:'bremen',profileSHA256:'a'.repeat(64),selection:{tables:[sha256],initializers:{[sha256]:{[EDGE70_RESOURCE.file]:1}}},resolve:(canonical,file,occurrence)=>{assert.equal(canonical,EDGE70_SHA);assert.equal(file,EDGE70_RESOURCE.file);assert.equal(occurrence,0);return sha256;},read};
 const client=()=>{const value=store.client(config);clients.push(value);return value;};
 const runtime=()=>{const value=createBremenOwnerRuntime(client());runtimes.push(value);return value;};
 t.after(()=>{observeNextParsed(undefined);failNextCertificateFactory(undefined);for(const value of runtimes)value.dispose();for(const value of clients)value.dispose();store.destroy();});
 return{rows,data,leaf,bytes,descriptor,store,client,runtime,get reads(){return reads;}};
}

test('real owner prepares verified resolved input, source-guards build/material, clears and reacquires',async t=>{
 const f=fixture(t),runtime=f.runtime(),before=structuredClone(f.rows);assert.equal(runtime.edgeAg70Identity(f.rows[0]),true);assert.equal(runtime.stats.preparing,0);
 assert.equal(await runtime.prepare(f.rows,signal()),undefined);assert.equal(runtime.stats.prepared,true);assert.equal(runtime.stats.publications,1);assert.equal(runtime.stats.leases,SCOPE_RESOURCES);assert.equal(f.store.stats.valueCells,1);assert.equal(f.store.stats.parses,1);assert.equal(f.reads,1);
 const shown=runtime.edgeAg70Reconstruction(f.rows,undefined,f.leaf);assert.equal(shown.stats.objects,1);assert.equal(shown.stats.vertices,3);assert.deepEqual(f.rows,before);assert.deepEqual(shown.components[1].batches,[]);assert.notEqual(shown.components[0].batches[0].extras,f.data.models[0].displays[0].batches[0].extras);
 const changed=structuredClone(f.rows);changed[0].batches[0].positions[0]=12;assert.equal(runtime.edgeAg70Reconstruction(changed,undefined,f.leaf).stats.objects,0);assert.equal(runtime.edgeAg70Reconstruction(f.rows,undefined,()=> 'wrong-leaf').stats.objects,0);
 const paint=new Float32Array(12),frames=new Float32Array(15);assert.deepEqual(runtime.edgeAg70BaseMaterials(shown.components,paint,frames),{objects:1,vertices:3,actualVisualAccepted:false});assert(paint.every(value=>value===.25));assert(frames.every(value=>value===.5));
 runtime.clearResident();await tick();unprepared(runtime);assert.equal(runtime.stats.releaseRequested,true);assert.equal(runtime.stats.generation,1);drained(f.store);assert.equal(f.store.stats.releasedValues,1);
 assert.equal(runtime.edgeAg70Identity(f.rows[0]),true);assert.equal(runtime.serializeBremenHeldSourceReadback(undefined,f.leaf,1),null);await runtime.prepare(f.rows,signal());assert.equal(f.store.stats.parses,2);assert.equal(f.reads,2);assert.equal(runtime.stats.releaseRequested,false);assert.equal(runtime.edgeAg70Reconstruction(f.rows,undefined,f.leaf).stats.objects,1);
 runtime.clearResident();await tick();drained(f.store);
});

test('all AG rule/readback/whole-certificate graphs are owned snapshots before resident clear',async t=>{
 const f=fixture(t),runtime=f.runtime();await runtime.prepare(f.rows,signal());
 const rule=runtime.bremenHeldSourceRule(f.rows[0]),held=runtime.serializeBremenHeldSourceReadback(f.rows[0],f.leaf,4),whole=runtime.serializeBremenWholeDisplayCertificate(f.rows[0],4,f.rows[0],f.leaf),outputs=[rule,held,whole];
 for(const output of outputs){assert.equal(output.patchSHA256,EDGE70_SHA);assert.equal(output.model.requiredNativeGroup.length,3);assert.deepEqual(output.parent.origin,[8.81,53.08]);}
 rule.parent.batches[0].extras.nested[0].value=70;held.requiredWholeDisplayParent.origin[0]=999;whole.model.nativeSourceComponents[0].batches[0].positions[0]=900;
 const next=runtime.bremenHeldSourceRule(f.rows[0]);assert.equal(next.parent.batches[0].extras.nested[0].value,7);assert.equal(next.parent.origin[0],8.81);assert.equal(next.model.nativeSourceComponents[0].batches[0].positions[0],0);
 const retained=structuredClone(outputs);runtime.clearResident();await tick();drained(f.store);assert.deepEqual(outputs,retained);assert.throws(()=>runtime.bremenHeldSourceRule(f.rows[0]),/not prepared/);assert.throws(()=>runtime.serializeBremenWholeDisplayCertificate(f.rows[0],4,f.rows[0],f.leaf),/not prepared/);
});

test('fulfilled prepare promises and external owned outputs do not pin released parsed values',{skip:typeof globalThis.gc!=='function'?'Run with --expose-gc for parsed WeakRef assertion':false},async t=>{
 const f=fixture(t),runtime=f.runtime();let weak;observeNextParsed(value=>{weak=Object.fromEntries(Object.entries({root:value,models:value.models,model:value.models[0],nativeSources:value.models[0].nativeSourceComponents,displays:value.models[0].displays,display:value.models[0].displays[0],batch:value.models[0].displays[0].batches[0],positions:value.models[0].displays[0].batches[0].positions,extras:value.models[0].displays[0].batches[0].extras}).map(([key,item])=>[key,new WeakRef(item)]));});
 const completed=runtime.prepare(f.rows,signal());await completed;const outputs=[runtime.edgeAg70Reconstruction(f.rows,undefined,f.leaf),runtime.bremenHeldSourceRule(f.rows[0]),runtime.serializeBremenHeldSourceReadback(f.rows[0],f.leaf,1),runtime.serializeBremenWholeDisplayCertificate(f.rows[0],1,f.rows[0],f.leaf)];
 const releasePin=runtime.pin();runtime.clearResident();assert.equal(f.store.stats.valueCells,1);releasePin();await tick();drained(f.store);await tick();for(let attempt=0;attempt<8;attempt++){globalThis.gc();await tick();}
 // Root-only WeakRef checks miss a recipe retaining models after the root dies.
 // Keep outputs, fulfilled prepare promise and released pin callback referenced.
 for(const [key,reference]of Object.entries(weak))assert.equal(reference.deref(),undefined,'Released owner/promise/pin retained parsed '+key);assert.equal(await completed,undefined);releasePin();assert.equal(outputs[0].stats.objects,1);assert.equal(outputs[1].model.requiredNativeGroup.length,3);assert.equal(outputs[2].requiredWholeDisplayParent.batches.length,1);assert.equal(outputs[3].patchSHA256,EDGE70_SHA);
});

test('two runtimes share one parsed cell and one disposal cannot invalidate the other client',async t=>{
 const f=fixture(t),first=f.runtime(),second=f.runtime();await Promise.all([first.prepare(f.rows,signal()),second.prepare(f.rows,signal())]);assert.equal(f.reads,1);assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.valueCells,1);assert.equal(f.store.stats.leases,2*PREPARED_STORE_LEASES);
 first.dispose();first.dispose();assert.equal(first.stats.disposed,true);unprepared(first);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);assert.equal(f.store.stats.valueCells,1);assert.equal(second.edgeAg70Reconstruction(f.rows,undefined,f.leaf).stats.objects,1);assert.equal(second.serializeBremenHeldSourceReadback(f.rows[0],f.leaf,1).patchSHA256,EDGE70_SHA);
 second.dispose();await tick();drained(f.store);assert.equal(f.store.stats.clients,0);await assert.rejects(first.prepare(f.rows,signal()),/disposed/);
});

test('same-runtime concurrent prepares publish one recipe/certificate pair without extra leases',async t=>{
 const gate=deferred(),f=fixture(t,{reader:async({bytes})=>{await gate.promise;return bytes;}}),runtime=f.runtime();t.after(()=>gate.resolve());const first=runtime.prepare(f.rows,signal()),second=runtime.prepare(f.rows,signal());await tick();assert.equal(runtime.stats.preparing,2);assert.equal(f.store.stats.waiters,2);gate.resolve();await deadline(Promise.all([first,second]));assert.equal(runtime.stats.publications,1);assert.equal(runtime.stats.preparing,0);assert.equal(runtime.stats.leases,SCOPE_RESOURCES);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);assert.equal(f.reads,1);runtime.clearResident();await tick();drained(f.store);
});

test('non-Bremen and already-aborted preparations start no input or certificate work',async t=>{
 const f=fixture(t),runtime=f.runtime(),before=certificateFixtureStats();await runtime.prepare([],signal());await runtime.prepare(f.rows.map(row=>({...row,city:'berlin'})),signal());const controller=new AbortController();controller.abort();await assert.rejects(runtime.prepare(f.rows,controller.signal),{name:'AbortError'});assert.equal(f.reads,0);assert.equal(runtime.stats.preparations,0);assert.deepEqual(certificateFixtureStats(),before);unprepared(runtime);drained(f.store);
});

test('one cancelled owner waiter cannot abort a second runtime sharing pending verified input',async t=>{
 const gate=deferred();let inputSignal;const f=fixture(t,{reader:async({bytes,signal})=>{inputSignal=signal;await gate.promise;return bytes;}}),cancelled=f.runtime(),active=f.runtime(),controller=new AbortController();t.after(()=>gate.resolve());
 const first=cancelled.prepare(f.rows,controller.signal),second=active.prepare(f.rows,signal());await tick();controller.abort();await assert.rejects(deadline(first),{name:'AbortError'});assert.equal(inputSignal.aborted,false);assert.equal(f.store.stats.waiters,1);unprepared(cancelled);gate.resolve();await deadline(second);assert.equal(active.stats.prepared,true);assert.equal(f.reads,1);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);active.clearResident();await tick();drained(f.store);
});

test('clear cancels a pending generation and a late old reader cannot publish over a fresh prepare',async t=>{
 const oldGate=deferred();let oldInputSignal;const f=fixture(t,{reader:async({bytes,signal,read})=>{if(read===1){oldInputSignal=signal;await oldGate.promise;}return bytes;}}),runtime=f.runtime();t.after(()=>oldGate.resolve());
 const old=runtime.prepare(f.rows,signal());await tick();runtime.clearResident();await assert.rejects(deadline(old),{name:'AbortError'});assert(oldInputSignal.aborted);unprepared(runtime);assert.equal(f.store.stats.valueCells,0);assert.equal(f.store.stats.active,1);
 await deadline(runtime.prepare(f.rows,signal()));assert.equal(runtime.stats.prepared,true);assert.equal(runtime.stats.publications,1);assert.equal(f.store.stats.parses,1);oldGate.resolve();await tick();await tick();assert.equal(runtime.stats.prepared,true);assert.equal(runtime.stats.publications,1);assert.equal(f.store.stats.parses,1);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);runtime.clearResident();await tick();drained(f.store);
});

for(const action of ['abort','clear','dispose'])test(`${action} settles an adapter-delayed acquired prepare and releases its temporary lease before adapter completion`,async t=>{
 const f=fixture(t),runtime=f.runtime(),controller=new AbortController(),entered=deferred(),gate=deferred();t.after(()=>gate.resolve());
 const pending=runtime.prepare(f.rows,controller.signal,async operation=>{const lease=await operation;entered.resolve();await gate.promise;return lease;});await deadline(entered.promise);assert.equal(f.store.stats.leases,PREPARING_STORE_LEASES);
 if(action==='abort')controller.abort();else if(action==='clear')runtime.clearResident();else runtime.dispose();
 await assert.rejects(deadline(pending,action+' delayed prepare'),{name:'AbortError'});await tick();assert.equal(runtime.stats.preparing,0);unprepared(runtime);drained(f.store);gate.resolve();await tick();await tick();unprepared(runtime);drained(f.store);
});

test('synchronous preparation-adapter failure removes listeners and leaves no late value publication',async t=>{
 const lateRead=deferred();
 const f=fixture(t,{reader:({bytes,read})=>read===1?lateRead.promise.then(()=>bytes):bytes});
 t.after(()=>lateRead.resolve());
 const runtime=f.runtime(),controller=new AbortController(),failure=Error('synthetic synchronous adapter failure');
 const add=controller.signal.addEventListener.bind(controller.signal),remove=controller.signal.removeEventListener.bind(controller.signal);
 let listeners=0;
 controller.signal.addEventListener=(type,...args)=>{if(type==='abort')listeners++;return add(type,...args);};
 controller.signal.removeEventListener=(type,...args)=>{if(type==='abort')listeners--;return remove(type,...args);};
 await assert.rejects(runtime.prepare(f.rows,controller.signal,()=>{throw failure;}),error=>error===failure);
 await tick();
 assert.equal(listeners,0);
 assert.equal(runtime.stats.preparing,0);
 assert.equal(runtime.stats.publications,0);
 unprepared(runtime);
 assert.equal(f.store.stats.valueCells,0);
 assert.equal(f.store.stats.leases,0);
 // The abandoned read owns its ingress slot until it settles. Release the
 // fixture read explicitly before asserting that the entire store drained.
 assert.equal(f.reads,1);
 assert.equal(f.store.stats.active,1);
 lateRead.resolve();
 await tick();
 assert.equal(f.store.stats.parses,0);
 assert.equal(runtime.stats.publications,0);
 drained(f.store);
 await runtime.prepare(f.rows,signal());
 assert.equal(runtime.stats.prepared,true);
 runtime.clearResident();
 await tick();
 drained(f.store);
});

test('adapter failure after acquire and changed-resource adapter cannot leak or publish readiness',async t=>{
 const f=fixture(t),runtime=f.runtime(),failure=Error('synthetic post-acquire adapter failure');
 await assert.rejects(runtime.prepare(f.rows,signal(),async operation=>{await operation;throw failure;}),error=>error===failure);await tick();unprepared(runtime);drained(f.store);
 await assert.rejects(runtime.prepare(f.rows,signal(),async operation=>{await operation;return{};}),/changed the resource/);await tick();unprepared(runtime);drained(f.store);assert.equal(runtime.stats.publications,0);await runtime.prepare(f.rows,signal());assert.equal(runtime.stats.prepared,true);
});

test('certificate-factory failure releases both temporary leases and permits clean verified retry',async t=>{
 const f=fixture(t),runtime=f.runtime(),failure=Error('synthetic certificate factory failure');failNextCertificateFactory(failure);await assert.rejects(runtime.prepare(f.rows,signal()),error=>error===failure);await tick();unprepared(runtime);drained(f.store);assert.equal(runtime.stats.publications,0);assert.equal(f.store.stats.releasedValues,1);await runtime.prepare(f.rows,signal());assert.equal(runtime.stats.publications,1);assert.equal(f.store.stats.parses,2);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);
});

test('a verified-reader failure is retryable and cannot create owner readiness',async t=>{
 const f=fixture(t,{reader:({bytes,read})=>read===1?new Uint8Array(bytes.length):bytes}),runtime=f.runtime();await assert.rejects(runtime.prepare(f.rows,signal()),/hash mismatch/);await tick();unprepared(runtime);drained(f.store);assert.equal(f.store.stats.parses,0);await runtime.prepare(f.rows,signal());assert.equal(runtime.stats.prepared,true);assert.equal(f.reads,2);assert.equal(f.store.stats.parses,1);
});

test('pins defer resident release until the last consumer drains; released pin callbacks are idempotent',async t=>{
 const f=fixture(t),runtime=f.runtime();await runtime.prepare(f.rows,signal());const first=runtime.pin(),second=runtime.pin();assert.equal(runtime.stats.pins,2);runtime.clearResident();assert.equal(runtime.stats.releaseRequested,true);assert.equal(runtime.stats.prepared,true);assert.equal(runtime.stats.leases,SCOPE_RESOURCES);assert.equal(f.store.stats.valueCells,1);assert.throws(()=>runtime.pin(),/not prepared/);assert.equal(runtime.edgeAg70Reconstruction(f.rows,undefined,f.leaf).stats.objects,1);
 first();first();assert.equal(runtime.stats.pins,1);assert.equal(f.store.stats.leases,PREPARED_STORE_LEASES);second();await tick();assert.equal(runtime.stats.pins,0);unprepared(runtime);drained(f.store);second();drained(f.store);await runtime.prepare(f.rows,signal());assert.equal(runtime.stats.prepared,true);assert.equal(f.store.stats.parses,2);
});

test('dispose invalidates resident pins immediately and retained release callbacks cannot resurrect the owner',async t=>{
 const f=fixture(t),runtime=f.runtime();await runtime.prepare(f.rows,signal());const release=runtime.pin();runtime.clearResident();assert.equal(runtime.stats.prepared,true);runtime.dispose();runtime.dispose();await tick();unprepared(runtime);assert.equal(runtime.stats.pins,0);assert.equal(runtime.stats.preparing,0);drained(f.store);release();release();drained(f.store);assert.equal(runtime.stats.disposed,true);assert.throws(()=>runtime.pin(),/disposed/);await assert.rejects(runtime.prepare(f.rows,signal()),/disposed/);
});

function aggregationRows(f){
 const produced=createEdgeAg70Recipe(f.data).edgeAg70Reconstruction(f.rows,undefined,f.leaf).components,marked=produced[0],suppressed=produced[1];
 assert(marked.displayEstimates.edgeAg70);assert(suppressed.displayEstimates.edgeAg70Suppressed);assert.deepEqual(suppressed.batches,[]);
 return{noDemand:[[],[{...f.rows[0],objectId:'non-ag70',partId:'non-ag70',batches:[]}],f.rows.map(row=>({...row,city:'berlin'}))],demand:[f.rows,[marked],[suppressed]]};
}
for(const state of ['unprepared','failed'])test(`actual owner aggregation safely copies empty/non-AG/Berlin rows with an ${state} runtime`,async t=>{
 const f=fixture(t,state==='failed'?{reader:({bytes})=>new Uint8Array(bytes.length)}:{}),runtime=f.runtime();
 if(state==='failed')await assert.rejects(runtime.prepare(f.rows,signal()),/hash mismatch/);
 await tick();const reads=f.reads,acquisitions=f.store.stats.acquisitions,calls=[],real=runtime.edgeAg70Reconstruction;runtime.edgeAg70Reconstruction=(...args)=>{calls.push(args);return real(...args);};const actual=aggregateAG70(runtime),groups=aggregationRows(f);
 for(const rows of groups.noDemand){const before=calls.length,result=actual(rows,undefined,f.leaf);assert.notEqual(result.components,rows);assert.deepEqual(result.components,rows);result.components.forEach((row,index)=>assert.equal(row,rows[index]));assert.deepEqual(result.stats,{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});assert.equal(calls.length,before,'No-demand rollback must not invoke requireRecipe');}
 for(const rows of groups.demand){const before=calls.length;assert.throws(()=>actual(rows,undefined,f.leaf),/not prepared/);assert.equal(calls.length,before+1,'Raw, marked and suppressed AG identities must reach the runtime');assert.equal(calls.at(-1)[0],rows);}
 assert.equal(f.reads,reads);assert.equal(f.store.stats.acquisitions,acquisitions);assert.equal(runtime.stats.prepared,false);drained(f.store);
});

test('actual owner aggregation delegates prepared raw/marked/suppressed AG calls with original arguments',async t=>{
 const f=fixture(t),runtime=f.runtime();await runtime.prepare(f.rows,signal());const real=runtime.edgeAg70Reconstruction,calls=[];runtime.edgeAg70Reconstruction=(...args)=>{calls.push(args);return real(...args);};const actual=aggregateAG70(runtime),selected=['owner-tiny-ag70'];
 for(const [index,rows]of aggregationRows(f).demand.entries()){const expected=real(rows,selected,f.leaf),result=actual(rows,selected,f.leaf);assert.deepEqual(result,expected);assert.equal(calls.length,index+1);assert.equal(calls.at(-1)[0],rows);assert.equal(calls.at(-1)[1],selected);assert.equal(calls.at(-1)[2],f.leaf);if(index===0)assert.equal(result.stats.objects,1);}
 const before=calls.length;for(const rows of aggregationRows(f).noDemand){const result=actual(rows,selected,f.leaf);assert.notEqual(result.components,rows);assert.equal(result.stats.objects,0);}assert.equal(calls.length,before);assert.equal(f.reads,1);
});

test('actual owner aggregation without a runtime preserves no-demand copies and rejects AG demand explicitly',t=>{
 const f=fixture(t),actual=aggregateAG70(undefined),groups=aggregationRows(f);for(const rows of groups.noDemand){const result=actual(rows);assert.notEqual(result.components,rows);assert.deepEqual(result.components,rows);assert.equal(result.stats.objects,0);}
 for(const rows of groups.demand)assert.throws(()=>actual(rows),/runtime was not provided/);assert.equal(f.reads,0);drained(f.store);
});
