import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {residencyFixture,residencyResource,evaluate as loadModule} from './fixtures/painted-residency-harness.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {managerF154Binding,f154ManifestFor} from './support/f2-f154-manager.mjs';

// Execute the production preparation/commit/lifetime bodies with tiny scoped
// sources. No provider graph, real model decoder, browser or GPU is loaded.
function assertPublishedComponent(renderer,expected){
 const actual=renderer.getSurfaceComponent(expected),borrowed=renderer.borrowSurfaceComponent(expected);
 assert.deepEqual(actual,expected);assert.notStrictEqual(actual,borrowed,'explicit full readback is isolated');
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(borrowed[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(borrowed.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
const base=new URL('../src/painted/infill/safety/',import.meta.url);
const read=name=>readFile(new URL(name,base),'utf8');
const rendererText=await read('building-mesh-renderer.ts'),managerText=await read('three-dimensional-map.ts');
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function nodes(text){const ast=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true),out=new Map();(function visit(node){if(ts.isFunctionDeclaration(node)&&node.name||ts.isMethodDeclaration(node)||ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)out.set(node.name.getText(ast),node);ts.forEachChild(node,visit);})(ast);return out;}
const rendererNodes=nodes(rendererText),managerNodes=nodes(managerText);
function evaluate(text,values){const scope=new Proxy(values,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});return Function('scope','with(scope){return '+compile(text)+'}')(scope);}
function attach(values,source,names){for(const name of names){const node=source.get(name);assert(node,name);values[name]=evaluate(ts.isMethodDeclaration(node)?'({'+node.getText()+'}).'+name:'('+ (ts.isVariableDeclaration(node)?node.initializer.getText():node.getText().replace(/^export\s+/,''))+')',values);}}
// Load the actual scope, page error class and pure array-ownership registry;
// every other production dependency stays outside this fixture's boundary.
const {createFrozenDataScope}=createSourceModules({allow:id=>['safety/frozen-data-scope','safety/render-runtime/resource-budget','safety/reconstruction-resource-parents'].includes(id)}).load('safety/frozen-data-scope');
const ref={canonicalSHA256:'a'.repeat(64),file:'fixture-f154-source.ts',occurrence:0,codec:'json'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};};
const row=id=>({city:'frankfurt',objectId:id,partId:id+'/part',origin:[8.67198,50.116035],sourceFeature:{properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.3,.4,.5]}]});
function resourceClient(){const calls=[],active=new Set();return{calls,active,async acquire(_ref,signal){assert.deepEqual(_ref,ref);signal.throwIfAborted();const value={source:row('recovered-'+calls.length)};calls.push(value);active.add(value);let released=false;return{borrow:read=>{assert(!released);return read(value);},release(){released=true;active.delete(value);}};},dispose(){assert.equal(active.size,0,'renderer and manager drop aliases before client disposal');}};}
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]});
async function rendererFixture(){
 const calls=[],active=new Set(),resources=[],materialSnapshots=[];let reflectionAliases=[],h;
 const origin=[8.67198,50.116035],ring=Array.from({length:52},(_,i)=>{const angle=i*2*Math.PI/52;return[origin[0]+Math.cos(angle)*.0002,origin[1]+Math.sin(angle)*.00015];});ring.push([...ring[0]]);
 // The production record carries its exact identity and SOURCE authority; the manager binds
 // the recovered source group only when these match the manifest (bindDerivedChunkInput).
 const record={city:'frankfurt',objectId:'osm/way/384153099',partId:'osm/way/384153099/component/83cb7aff2638e3f41f2b',source_pbf_sha256:'e'.repeat(64),componentGeometry:{type:'Polygon',coordinates:[ring]},osmTags:{building:'yes',height:'34',name:'tiny complete F154 fixture'},source_boundary_sha256:'f'.repeat(64),source_snapshot:'tiny-snapshot',source_url:'https://example.invalid/tiny-f154'};
 const {nativePaintSignature}=loadModule(await readFile(new URL('../src/painted/root500/safety/progressive-native-signature.ts',import.meta.url),'utf8'));
 const f154=loadModule(await readFile(new URL('../src/painted/root500/safety/owner-f154-reconstruction.ts',import.meta.url),'utf8'),id=>{
  if(id==='./progressive-native-signature')return{nativePaintSignature};
  if(id==='./owner-f154-source-data')return{root500DataRefs:[residencyResource],getRoot500Data:scope=>scope.borrow(residencyResource,value=>value)};
  throw Error('Unexpected F154 algorithm import '+id);
 });
 const owner={prepareOwnerRecoveredSourceComponents:async(rows,signal,wait,scope)=>{calls.push('prepare');return f154.prepareOwnerF154RecoveredSources(rows,signal,wait,scope);},
  ownerRecoveredSourceComponents:(rows,scope)=>f154.ownerF154RecoveredSources(rows,scope),
  async prepareOwnerReconstructionComponents(rows,signal,wait,scope){const preparation=f154.prepareRoot500Data(rows,signal,scope);await(wait?wait(preparation):preparation);signal.throwIfAborted();return owner.ownerReconstructionComponents(rows,scope);},
  async prepareOwnerReconstructionMaterials(rows,signal,wait,scope){const preparation=f154.prepareRoot500Data(rows,signal,scope);await(wait?wait(preparation):preparation);signal.throwIfAborted();},
  ownerReconstructionComponents:(rows,scope)=>{calls.push('reconstruct');return f154.ownerF154Reconstruction(rows,scope);},ownerReconstructionIdentity:c=>f154.ownerF154Identity(c),
  ownerReconstructionBaseMaterials:(rows,paint,frames,scope)=>{calls.push('materials');const result=f154.ownerF154BaseMaterials(rows,paint,frames,scope);materialSnapshots.push({scope,result,rows:rows.map(r=>r.objectId+'|'+r.partId),paint:paint.slice(),frames:frames.slice()});if(h.control.failMaterials)throw Error('controlled material failure');return result;}};
 const overrides={'./owner-reconstruction':owner,'./infill-f288-coplanar-roof':{infillF288ClipCoplanarFacilityRoofs:rows=>(calls.push('clip'),rows)},
  './progressive-native-signature':{nativePaintSignature},
  './infill-paint-programs':{prepareInfillPaintPrograms:async(_rows,_city,signal,scope)=>{calls.push('programs');await scope.prepare([residencyResource],signal);}},
  './owner-display-budget':{fitOwnerDisplayBudget:(rows,_cap,options)=>{rows.forEach(options.protected);return{components:rows,vertices:options.vertices,indices:options.indices,diagnostic:{}};},sourceBoundsContainFocus:()=>false}};
 overrides['./facade-paint-fragment']={prepareInfillPaintPrograms:overrides['./infill-paint-programs'].prepareInfillPaintPrograms};
 for(const name of ['appendF068DerivedDisplay','appendF075DerivedDisplay','appendF082DerivedDisplay','appendF107DerivedDisplay']){
  const module=name.includes('068')?'./owner-f068-derived-display':name.includes('075')?'./owner-f075-derived-display':name.includes('082')?'./owner-f082-derived-display':'./owner-f107-derived-display';
  overrides[module]={[name]:rows=>(calls.push(name),rows)};
 }
 h=residencyFixture('infill',{rendererSourcePath:process.env.INFILL_F154_BASELINE_RENDERER,city:'frankfurt',dependencyOverrides:overrides,
  resourceValue(ref){assert.deepEqual(ref,residencyResource);const value={F154_SOURCE_RECORD:structuredClone(record),fragment:'vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}'};resources.push(value);active.add(value);return value;},
  onRelease(value){active.delete(value);},onInvalidate(){reflectionAliases=[];}});
 // As the actual infill manager does after prepareBatches: bind the recovered F154 SOURCE group
 // (memo lease parent) into the prepared authoritative chunk input before any commit.
 const bindDerivedChunkInput=managerF154Binding({provider:'infill',f154,nativePaintSignature,store:h.chunkStore,chunkInputs:h.chunkInputs,manifest:f154ManifestFor(record)}),prepareBatch=h.prepareBatch;
 h.prepareBatch=async(...args)=>{const prepared=await prepareBatch(...args);try{bindDerivedChunkInput(prepared,prepared.displayComponents);}catch(error){prepared.release?.();prepared.scope.release();throw error;}return prepared;};
 const nearby=(id=1)=>({city:'frankfurt',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/part',origin:[...origin],sourceFeature:{type:'Feature',properties:{source:'tiny nearby'},geometry:{type:'Polygon',coordinates:[[[8,50],[8.001,50],[8,50.001],[8,50]]]}},componentGeometry:{type:'Polygon',coordinates:[[[8,50],[8.001,50],[8,50.001],[8,50]]]},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.3,.4,.5]}]});
 return{h,calls,active,resources,materialSnapshots,f154,nativePaintSignature,record,nearby,get reflectionAliases(){return reflectionAliases;},set reflectionAliases(rows){reflectionAliases=rows;}};
}

test('merged input recovers a nearby source once, preserves pack order and transfers scope through resident replacement and empty commit',async()=>{
 const f=await rendererFixture(),h=f.h;await h.environment(async()=>{
  const r=h.create(),input=[f.nearby()],original=structuredClone(input),first=await h.prepareBatch(r,input),source=first.sourceComponents[1];
  assert.equal(first.sourceComponents.length,2);assert.equal(source.objectId,'osm/way/384153099');assert.deepEqual(source.componentGeometry,f.record.componentGeometry);assert.equal(source.sourceFeature.properties.sourceBoundarySHA256,f.record.source_boundary_sha256);assert.equal(source.sourceFeature.properties.sourceSnapshot,f.record.source_snapshot);assert.equal(source.sourceFeature.properties.sourceURL,f.record.source_url);
  assert.equal(f.nativePaintSignature(source),f.f154.getF154_RECOVERED_SOURCE_SIGNATURE(first.scope));assert.equal(first.displayComponents[1].displayEstimates.F154PhotoEstimate.sourceSignature,f.nativePaintSignature(source));assert.notStrictEqual(first.displayComponents[1].batches,source.batches);assert.equal(first.reconstructed.stats.objects,1);assert.equal(first.reconstructed.stats.error,undefined);
  assert.deepEqual(f.calls,['prepare','programs','reconstruct','clip','appendF068DerivedDisplay','appendF075DerivedDisplay','appendF082DerivedDisplay','appendF107DerivedDisplay']);assert.equal(h.configurations,0);assert.equal(h.sources.length,0);
  const sourceBefore=structuredClone(source);h.commit(r,first,1);first.scope.release();assert.equal(first.scope.stats.pins,2,'resident and manager-owned prepared inputs each retain the scope');assert.equal(r.getRevision().generation,0);r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);assert.equal(r.getRevision().generation,1);assert.equal(r.stats.geometryPreparation.candidateFailure,undefined);
  assert.strictEqual(r.borrowSourceComponent(source).batches,source.batches);assert.strictEqual(r.borrowSourceComponent(source).sourceFeature,source.sourceFeature);assert.deepEqual(r.getSourceComponent(source),r.borrowSourceComponent(source));assert.deepEqual(source,sourceBefore);assert.deepEqual(input,original);const materials=f.materialSnapshots.at(-1);assert.equal(materials.result.objects,1);assert.equal(materials.frames[3*5+4],6212);assert.equal(materials.paint[3*4+3],2);assert.equal(materials.result.vertices,first.displayComponents[1].batches.reduce((n,b)=>n+b.positions.length/3,0));
  h.commit(r,first,2);await h.settle(r);assert.equal(f.calls.filter(c=>c==='reconstruct').length,1,'S434 repack reuses prepared reconstruction');assert.equal(first.scope.stats.pins,2,'resident and manager-owned prepared inputs each retain the scope');assert.deepEqual(source,sourceBefore);
  f.reflectionAliases=[r.borrowSurfaceComponent(source)];const second=await h.prepareBatch(r,[f.nearby(2)]);h.commit(r,second,3);first.release();second.scope.release();assert.equal(first.scope.stats.disposed,false);await h.settle(r);assert(first.scope.stats.disposed);assert.equal(f.reflectionAliases.length,0);assert.equal(f.active.size,1);assert.equal(r.getRevision().generation,3);
  second.release();r.setBatches([],4);assert(second.scope.stats.disposed);assert.equal(r.getSourceComponent(source),undefined);assert.equal(r.getComponent(source),undefined);assert.equal(r.stats.sourceComponents,0);assert.equal(r.stats.components,0);assert.equal(f.active.size,0);assert.equal(r.stats.paintProgramPartitions.baseFragmentBytes,0);assert.equal(r.stats.progressiveShaderSpecialization,undefined);r.destroy();assert.equal(h.buffers.size,0);
 });
});

test('a partial material failure retains the published scope and releases the isolated candidate before actual renderer destroy',async()=>{
 const f=await rendererFixture(),h=f.h;await h.environment(async()=>{
  const r=h.create(),first=await h.prepareBatch(r,[f.nearby(1)]);h.commit(r,first,1);first.scope.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);const source=first.sourceComponents[1],oldSource=r.borrowSourceComponent(source),oldDisplay=r.borrowSurfaceComponent(source),gpu=[...h.buffers.keys()];
  const second=await h.prepareBatch(r,[f.nearby(2)]),hitsBeforeSecond=h.chunkStore.stats.hits,snapshotsBeforeSecond=f.materialSnapshots.length;h.control.failMaterials=true;h.commit(r,second,2);second.scope.release();assert.equal(first.scope.stats.disposed,false);assert.equal(second.scope.stats.disposed,false);assert.equal(f.active.size,2);await h.settle(r,()=>!!r.stats.geometryPreparation.candidateFailure);
  assert.match(r.stats.geometryPreparation.candidateFailure,/controlled material failure/);second.release();assert.equal(first.scope.stats.disposed,false);assert.equal(second.scope.stats.disposed,true,JSON.stringify(second.scope.stats));assert.equal(first.scope.stats.pins,2,'resident and manager-owned prepared inputs each retain the scope');assert.equal(second.scope.stats.pins,0);assert.equal(f.active.size,1);assert.equal(r.getSourceComponent(source).generation,oldSource.generation);assert.strictEqual(r.borrowSourceComponent(source).batches,oldSource.batches);assert.strictEqual(r.borrowSourceComponent(source).sourceFeature,oldSource.sourceFeature);assertPublishedComponent(r,oldDisplay);assert.deepEqual([...h.buffers.keys()],gpu);// Content-addressed chunks (controller ruling, 2026-11-02 23:50): the published F154 chunk is
  // reused by the second candidate, so the real F154 material validation ran exactly once, for
  // the first publication, and the failing candidate produced materials only for its new row.
  const f154Key=f.record.objectId+'|'+f.record.partId,f154Runs=f.materialSnapshots.filter(s=>s.rows.includes(f154Key)),secondRuns=f.materialSnapshots.slice(snapshotsBeforeSecond);
  assert.equal(f154Runs.length,1,'the F154 chunk materials were produced once');assert.equal(f154Runs[0].scope,first.scope,'by the first publication');assert.equal(f154Runs[0].result.objects,1,'the real F154 material validation ran');
  assert(secondRuns.length>0,'the failing candidate ran its own materials');assert(secondRuns.every(s=>s.scope===second.scope&&!s.rows.includes(f154Key)&&s.result.objects===0),'the failing candidate reused the F154 chunk instead of re-producing it');assert.deepEqual(secondRuns.flatMap(s=>s.rows),[f.nearby(2).objectId+'|'+f.nearby(2).partId]);
  assert(h.chunkStore.stats.hits>hitsBeforeSecond,'the second candidate hit an existing content-addressed chunk');
  first.release();r.destroy();assert.equal(r.getSourceComponent(source),undefined);assert.equal(r.getComponent(source),undefined);assert.equal(r.stats.sourceComponents,0);assert.equal(r.stats.components,0);assert.equal(f.active.size,0);assert(first.scope.stats.disposed);assert(second.scope.stats.disposed);assert.equal(h.buffers.size,0);
 });
});

const viewportHelpers=loadModule(await readFile(new URL('../src/safety/viewport-request.ts',import.meta.url),'utf8'));
const managerRuntime=createSourceModules({allow:id=>id.startsWith('safety/render-runtime/')||['safety/renderer-chunk-input','safety/resource-content-key'].includes(id)}),managerChunkStores=managerRuntime.load('safety/render-runtime/chunk-resource-store'),managerChunkInputs=managerRuntime.load('safety/renderer-chunk-input');
function managerFixture(renderer){
 // A real page store backs the manager's authoritative source chunk input. The renderer
 // double keeps the production prepareBatches contract: it retains the supplied chunk input
 // and returns it with releaseChunkDependencies (retired by the manager's consumer lifetime).
 const store=managerChunkStores.createChunkResourceStore({limitBytes:64*1024**2,recentLimitBytes:0,recentMaxEntries:0,recentMaxIdleMs:0}),prepareBatches=renderer.prepareBatches;
 renderer.prepareBatches=async(input,signal,scope,wait,admission,demand,chunkInput)=>{const retained=managerChunkInputs.retainRendererChunkInput(chunkInput);try{const prepared=await prepareBatches.call(renderer,input,signal,scope,wait,admission,demand,chunkInput);prepared.chunkInput=retained;prepared.releaseChunkDependencies=()=>retained?.release();return prepared;}catch(error){retained?.release();throw error;}};
 const controller=new AbortController(),values={resourceContentKey,...viewportHelpers,residentPreparation:undefined,releaseResidentPreparation:undefined,preparedAdmissionKey:undefined,lastPackedComponents:undefined,renderer,signal:controller.signal,ticket:1,revision:1,destroyed:false,suspended:false,pageHidden:false,wantedMode:'3d',s434Aggregate:{clear(){}},options:{frozenData:resourceClient()},createFrozenDataScope,sameStageComponents:(a,b)=>!!a&&a.length===b.length&&a.every((c,i)=>c===b[i]),
  ownerShapePatchDisplayRows:rows=>rows,ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),resources:store,manifestSHA:'tiny-manifest',manifest:{compiler_sha256:'tiny-compiler'},sourceCandidates:new Map(),sourceResourceByFeature:new WeakMap(),retainRendererChunkInput:managerChunkInputs.retainRendererChunkInput};
 attach(values,managerNodes,['current','sourceAbsentDisplay','retireChunkInput','bindDerivedChunkInput','sourceChunkDemand','sourceChunkInput','preparedConsumers','retirePreparedBatches','clearPreparedBatches','keepPreparedBatches','prepareCommit']);
 // As visibleNow does, each commit's verified source leaf is a wanted source lease in
 // sourceCandidates while prepareCommit reads it; the rows are that leaf's own components.
 const prepareCommit=values.prepareCommit;values.prepareCommit=async(rows,...args)=>{
  const contentKey=JSON.stringify(['tiny-infill-source',rows.map(row=>[row.objectId,row.partId])]),lease=store.acquire({contentKey,role:'source',allowRecent:false,estimate:{category:'metadata',bytes:256,precision:'exact'},produce:()=>({contentKey,resourceKey:contentKey,components:rows,recipeAuthority:'tiny-recipe',materialAuthority:'tiny-material',selectedLOD:'canonical'})});
  try{await lease.ready;values.sourceCandidates.set(contentKey,lease);return await prepareCommit(rows,...args,()=>{});}finally{if(values.sourceCandidates.get(contentKey)===lease)values.sourceCandidates.delete(contentKey);lease.release();}
 };
 const publication=viewportHelpers.createViewportRequestContinuation(()=>false).publication(controller.signal,()=>values.current(controller.signal,values.ticket));return{values,controller,publication};
}
test('actual manager drops late/cancelled preparations and only publishes a current result, then reuses its prepared snapshot',async t=>{
 const gates=[],scopes=[],retired=[];let notifyStarted;const nextStarted=()=>{const started=deferred();notifyStarted=()=>started.resolve();return started.promise;};
 const f=managerFixture({async prepareBatches(input,signal,scope){scopes.push(scope);await scope.prepare([ref],signal);const gate=deferred();gates.push(gate);notifyStarted?.();await gate.promise;return{input,scope,sourceComponents:input,displayComponents:input,reconstructed:{components:input,stats:emptyStats()},originalSourceVertices:3,originalSourceIndices:3,release(){retired.push(scope);}};}}),rows=[row('first')],published=[];
 // B3 transfers the manager cache pin only after the publishing setter accepts;
 // prepareCommit itself now retires every result not adopted by that callback.
 const publish=(label,input)=>prepared=>{published.push(label);f.values.keepPreparedBatches(prepared);f.values.preparedAdmissionKey=JSON.stringify({});f.values.lastPackedComponents=input;};
 t.after(async()=>{f.controller.abort();for(const gate of gates)gate.resolve();await f.publication.close();f.values.clearPreparedBatches();f.values.options.frozenData.dispose();});
 const firstStarted=nextStarted(),first=f.publication.finish(attempt=>f.values.prepareCommit(rows,{},attempt,publish('stale',rows))),firstRejected=assert.rejects(first,{name:'AbortError'});await firstStarted;
 let currentAttempt;const secondStarted=nextStarted(),nextRows=[row('second')],second=f.publication.finish(attempt=>{currentAttempt=attempt;return f.values.prepareCommit(nextRows,{},attempt,publish('current',nextRows));});
 // The current publication contract drains predecessor cleanup before starting
 // replacement allocation. Resolve the late producer before waiting for nextStarted.
 await tick();assert.equal(scopes.length,1,'replacement waits for predecessor cleanup');
 gates[0].resolve();await firstRejected;await secondStarted;assert(scopes[0].stats.disposed);assert.equal(f.values.residentPreparation,undefined);assert.deepEqual(retired,[scopes[0]],'late preparation reaches its terminal release before any renderer adopts it');
 gates[1].resolve();await second;assert.deepEqual(published,['current']);assert.equal(scopes[1].stats.ownerReleased,true);assert.equal(scopes[1].stats.pins,1);
 await f.values.prepareCommit([...nextRows],{},currentAttempt,publish('repack',nextRows));assert.equal(scopes.length,2);assert.deepEqual(published,['current','repack']);assert.deepEqual(retired,[scopes[0]],'reusing the published preparation does not retire its plan');
 f.values.clearPreparedBatches();assert.equal(f.values.residentPreparation,undefined);assert(scopes[1].stats.disposed);assert.equal(f.values.options.frozenData.active.size,0);assert.deepEqual(retired,[scopes[0],scopes[1]]);
 const cancelRows=[row('cancel')],thirdStarted=nextStarted(),third=f.publication.finish(attempt=>f.values.prepareCommit(cancelRows,{},attempt,publish('cancelled',cancelRows))),cancelled=assert.rejects(third,{name:'AbortError'});await thirdStarted;f.controller.abort();gates[2].resolve();await cancelled;assert(scopes[2].stats.disposed);assert.deepEqual(published,['current','repack']);assert.deepEqual(retired,scopes,'cancelled preparation also drops its unadopted plan exactly once');
});

test('actual aggregate uses the pure F154 identity signature and scopes reconstruction and materials',async()=>{
 const upstream=nodes(await readFile(new URL('../src/painted/root500/safety/owner-f154-reconstruction.ts',import.meta.url),'utf8')),identityArity=upstream.get('ownerF154Identity').initializer.parameters.length;assert.equal(identityArity,1);
 const source=await read('owner-reconstruction.ts'),ast=ts.createSourceFile('aggregate.ts',source,ts.ScriptTarget.Latest,true),scope=createFrozenDataScope({acquire(){throw Error('pure aggregate boundary must not read models');}}),calls=[],exports={},contract=loadModule(await read('infill-data-contract.ts'));
 Function('require','exports',compile(source))(path=>{if(path==='./infill-data-contract')return contract;const imported=ast.statements.filter(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===path).flatMap(n=>n.importClause?.namedBindings?.elements??[]).filter(n=>!n.isTypeOnly).map(n=>(n.propertyName??n.name).text);
 return Object.fromEntries(imported.map(name=>[name,name==='getinfillJubilaeumssaeuleIdentity'?()=>()=>false:name.includes('Identity')?((...args)=>{if(name==='ownerF154Identity'){assert.equal(args.length,identityArity);calls.push([name,args.length]);}return false;}):name.includes('Reconstruction')?((rows,...args)=>{if(name==='ownerF154Reconstruction')calls.push([name,args.at(-1)]);return{components:rows,stats:emptyStats(),cofaceStats:{}};}):name.includes('RemoveDuplicate')||name.includes('RemoveDuplicateNativeParts')?rows=>rows:(...args)=>{if(name==='ownerF154BaseMaterials')calls.push([name,args.at(-1)]);return args[0];}]));},exports);
 exports.ownerReconstructionIdentity(row('plain'),scope);exports.ownerReconstructionComponents([],scope);exports.ownerReconstructionBaseMaterials([],new Float32Array(),new Float32Array(),scope);
 assert.deepEqual(calls,[['ownerF154Identity',1],['ownerF154Reconstruction',scope],['ownerF154BaseMaterials',scope]]);scope.release();assert.equal(scope.stats.disposed,true);
});

const facadeNodes=nodes(await read('facade-paint-fragment.ts'));
const cityPaintResourceNode=nodes(await read('progressive-feature-cities.ts')).get('INFILL_CITY_PAINT_RESOURCE');assert(cityPaintResourceNode?.initializer);
const cityPaintRef=loadModule('export const value='+cityPaintResourceNode.initializer.getText()).value;
function programFixture(){const berlin={...ref,canonicalSHA256:'b'.repeat(64),file:'painted/root500/safety/progressive-berlin-programs.ts'},hamburg={...ref,canonicalSHA256:'c'.repeat(64),file:'painted/root500/safety/progressive-hamburg-programs.ts'},reads=[],active=new Set(),source='vec3 exactOriginal(vec3 v){return v*.375+vec3(.125);}',baseSource='vec3 exactBase(vec3 v){return v;}',citySource='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base*.5;}';
 const client={async acquire(resource,signal){signal.throwIfAborted();assert(resource===berlin||resource===hamburg||resource.file===berlin.file||resource.file===hamburg.file);reads.push(resource.file);const value={base:baseSource,f7000:source};active.add(value);return{borrow:read=>read(value),release:()=>active.delete(value)};}};
 const values={berlinProgramRefs:[berlin],hamburgProgramRefs:[hamburg],paintProgramPartitionEnabled:city=>['berlin','hamburg','munich'].includes(city),getBerlinProgramData:scope=>scope.borrow(berlin,value=>({BERLIN_PROGRAM_GLSL:value})),getHamburgProgramData:scope=>scope.borrow(hamburg,value=>({HAMBURG_PROGRAM_GLSL:value})),BERLIN_PROGRAM_FAMILIES:{7000:'f7000'},HAMBURG_PROGRAM_FAMILIES:{7000:'f7000'},paintProgramKey:()=> 'f7000',INDEPENDENT_INFILL_PAINTS:[],PROGRESSIVE_CITY_SOURCE_FULL_SHA:'same',PROGRESSIVE_FEATURE_SHA:'same',PROGRESSIVE_CITY_EXTRA_GLSL:{munich:citySource},PROGRESSIVE_CITY_BASELINE_GLSL:'',PROGRESSIVE_FEATURE_GLSL:baseSource,scopeInfillPaint:value=>value,handelshofBalconies104CityFragment:value=>value,makeFacadePaintFragment:input=>input,F109_GLSL:'F109\n',F089_GLSL:'F089\n',F071_NORTH_COURT_GLSL6438:'F071\n',F018_COMPLETION_GLSL:'',F086_COMPLETION_GLSL:'',F106_COMPLETION_GLSL:'',F056_GLSL:'',F054_GLSL:'',F060_GLSL:'',F051_GLSL:'',F049_GLSL:'',F040H_GLSL:''};
 const selections=[],acquireProgram=client.acquire;
 client.acquire=async(resource,signal,keys)=>{if(resource.file!==cityPaintRef.file)return acquireProgram(resource,signal,keys);assert.deepEqual(resource,cityPaintRef);signal.throwIfAborted();assert(Array.isArray(keys)&&keys.length===1,'city source preparation selects its exact city');selections.push([...keys]);reads.push(resource.file);const value={munich:citySource};active.add(value);return{borrow:read=>read(value),release:()=>active.delete(value)};};
 Object.assign(values,{INFILL_CITY_PAINT_RESOURCE:cityPaintRef,getPROGRESSIVE_CITY_EXTRA_GLSL:scope=>scope.borrow(cityPaintRef,value=>value)});
 attach(values,facadeNodes,['infillSpecializationObservations','observeInfillFacadeSource','fullProgressiveCompatibility','fullFacadePaintFragment','prepareInfillPaintPrograms','genericBerlinOwnerExclusionCertified','genericHamburgOwnerExclusionCertified','specializeCertifiedProgressiveTail','excludeCertifiedOwnerGuards','paintProgramFragmentUnscoped','facadePaintFragmentForCity']);return{values,client,reads,active,selections,source,baseSource,citySource};}

test('actual shader lookup prepares exact program refs, preserves shader strings and the existing lazy Munich base branch',async()=>{
 const f=programFixture(),signal=new AbortController().signal;
 for(const city of ['berlin','hamburg','munich']){
  const scope=createFrozenDataScope(f.client),key=city==='munich'?'base':'f7000';
  if(city!=='munich')assert.throws(()=>f.values.paintProgramFragmentUnscoped(key,city,scope),/not prepared/);
  await f.values.prepareInfillPaintPrograms([{}],city,signal,scope);assert.deepEqual(f.selections.at(-1),[city]);assert.equal(f.reads.at(-1),'painted/root500/safety/progressive-'+(city==='berlin'?'berlin':'hamburg')+'-programs.ts');
  const output=f.values.paintProgramFragmentUnscoped(key,city,scope);assert.equal(output,city==='munich'?f.citySource:f.source);
  const reads=f.reads.length;assert.equal(f.values.paintProgramFragmentUnscoped(key,city,scope),output);assert.equal(f.reads.length,reads,'repeated lookup borrows its existing exact city lease');assert.equal(f.values.fullFacadePaintFragment(),f.baseSource,'the lazy full fallback preserves the original source string');
  scope.release();assert(scope.stats.disposed);assert.equal(f.active.size,0);assert.throws(()=>f.values.paintProgramFragmentUnscoped(key,city,scope),{name:'AbortError'},'the exact city/program leases are revoked after their final scope release');
 }
 const empty=createFrozenDataScope(f.client),count=f.reads.length,programReads=f.reads.filter(file=>file!==cityPaintRef.file).length;await f.values.prepareInfillPaintPrograms([], 'berlin',signal,empty);assert.equal(f.reads.length,count,'empty demand reads no city or program source');await f.values.prepareInfillPaintPrograms([{}],'stuttgart',signal,empty);assert.deepEqual(f.selections.at(-1),['stuttgart']);assert.equal(f.reads.filter(file=>file!==cityPaintRef.file).length,programReads,'a non-partition city does not read either program catalog');empty.release();assert.equal(f.active.size,0);
});

test('GPU initialization stays pending before a scope exists and performs no program lookup or allocation',async()=>{
 const h=residencyFixture('infill',{city:'frankfurt'});await h.environment(async()=>{
  const r=h.create(),forbidden=()=>{throw Error('unprepared GPU allocation or shader lookup');};
  for(const name of ['createVertexArray','createBuffer','createShader','createProgram','shaderSource','compileShader','linkProgram'])h.gl[name]=forbidden;
  r.setEnabled(true);r.layer.onAdd({},h.gl);h.frame(r);assert.equal(h.configurations,0);assert.equal(h.compileRequests.length,0);assert.equal(h.sources.length,0);assert.equal(h.uploads.length,0);assert.equal(h.scopes.length,0);assert.equal(r.isPickReady(),false);assert.equal(r.stats.gpuLifecycle.initialized,false);r.destroy();
 });
});
