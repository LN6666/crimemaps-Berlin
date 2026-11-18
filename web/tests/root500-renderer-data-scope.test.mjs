import {createResidentCaptureOwnership} from './support/fixtures-managers-b-renderer-runtime.mjs';
import test from 'node:test';
import {fixtureChunkInput} from './support/fixtures-managers-b-renderer-runtime.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {residencyFixture,component} from './fixtures/painted-residency-harness.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';

const filename=new URL('../src/painted/root500/safety/building-mesh-renderer.ts',import.meta.url),source=await readFile(filename,'utf8');
const ast=ts.createSourceFile(filename.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),nodes=[];
function visit(node){nodes.push(node);ts.forEachChild(node,visit);}visit(ast);
const fn=name=>nodes.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
const factory=fn('createBuildingMeshRenderer'),returned=factory.body.statements.find(node=>ts.isReturnStatement(node)&&ts.isObjectLiteralExpression(node.expression));
const method=name=>returned.expression.properties.find(node=>ts.isMethodDeclaration(node)&&node.name.getText(ast)===name);
const declaration=name=>factory.body.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)===name));
const compile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const evaluate=(text,ctx)=>new Function('env','with(env){'+compile(text)+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)}));
// frozen-data-scope.ts imports the page ledger's error class: load it through the real
// relative module graph, including the scope's weak numeric-parent registry.
// The real chunk-input retention of the renderer (chunk-mesh-packing.retainChunkInput) comes from the same graph.
const realModules=createSourceModules({allow:id=>['safety/frozen-data-scope','safety/reconstruction-resource-parents','safety/render-runtime/resource-budget','painted/root500/safety/chunk-mesh-packing','safety/renderer-chunk-input','safety/resource-content-key'].includes(id)});
const shared=realModules.load('safety/frozen-data-scope'),{retainChunkInput,completeChunkSourceRows,orderVisibleChunkRows,visibleChunkDisplayKeys}=realModules.load('painted/root500/safety/chunk-mesh-packing');
const {retainReconstructionPreparedInputs}=realModules.load('safety/reconstruction-resource-parents');
const {createFrozenDataScope}=shared,tinyRef={canonicalSHA256:'a'.repeat(64),file:'painted/root500/safety/tiny-renderer-fixture.ts',occurrence:0,codec:'json'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function client(events=[],onRelease=()=>{}){const state={acquires:0,releases:0};return{state,async acquire(){state.acquires++;let released=false;return{borrow:read=>read({tiny:true}),release(){if(released)return;released=true;onRelease();events.push('lease.release');state.releases++;}};},dispose(){}};}
function row(id=1,mesh=true){return{city:'berlin',objectId:'osm/way/'+id,partId:'component/'+id,origin:[13,52],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]},batches:mesh?[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.2,.3,.4]}]:[]};}
const key=c=>c.objectId+'|'+c.partId;
function preparation(extra={}){
 const events=[],scopes=[],data=client(events),controller=new AbortController();
 const record=(name,scope)=>{events.push(name);scopes.push(scope);scope.borrow(tinyRef,value=>assert.equal(value.tiny,true));};
 const ctx={events,scopes,frozenData:data,createFrozenDataScope,retainReconstructionPreparedInputs,retainChunkInput,completeChunkSourceRows,orderVisibleChunkRows,visibleChunkDisplayKeys,city:'berlin',destroyed:false,key,signal:controller.signal,
  // Lazy owner route modules load first, before any scope exists (DECISIONS 2026-11-02 04:29 [0]).
  prepareOwnerReconstructionModules:async(rows,signal)=>{signal.throwIfAborted();assert.equal(scopes.length,0,'route modules load before any data scope');ctx.moduleRows=rows;},
  prepareRoot500ProgressiveData:async(rows,city,signal,scope)=>{events.push('progressive');scopes.push(scope);await scope.prepare([tinyRef],signal);},
  prepareOwnerRecoveredSourceComponents:async(rows,signal,wait,scope)=>record('prepare recovery',scope),
  importedRoot500_ownerRecoveredSourceComponents:(rows,scope)=>{record('recover',scope);return rows;},
  importedRoot500_prepareOwnerReconstructionComponents:async(rows,signal,wait,scope)=>{record('stages',scope);return{components:rows,stats:{objects:1,components:[]}};},
  prepareRoot500DerivedDisplays:async(rows,city,admission,signal,scope)=>record('prepare derived',scope),
  prepareRoot500MaterialData:async(rows,city,signal,scope)=>{ctx.materialInputs=rows;record('prepare material admissions',scope);},
  prepareOwnerReconstructionMaterials:async(rows,signal,wait,scope)=>record('materials',scope),...extra,
 };
 // These tiny owner doubles produce none of the four Munich patch identities.
 // Source completion, ordering and display filtering still use the real helpers.
 for(const id of ['068','075','082','107']){ctx['importedRoot500_appendF'+id+'DerivedDisplay']=(rows,city,admission,scope)=>{record('append '+id,scope);return rows;};ctx['isF'+id+'DerivedDisplayIdentity']=()=>false;}
 const prepare=evaluate(fn('ownerCommitStep').getText(ast)+'\n'+fn('validate').getText(ast)+'\n'+fn('prepareBatches').getText(ast)+'\nreturn prepareBatches;',ctx);
 return{ctx,prepare,controller,data,events,scopes};
}

test('complete renderer module evaluates with only tiny virtual exports and binds the actual imported functions',()=>{
 const modules=new Map();
 for(const node of ast.statements.filter(ts.isImportDeclaration)){
  const name=node.moduleSpecifier.text,module=modules.get(name)??{__esModule:true};modules.set(name,module);const bindings=node.importClause?.namedBindings;
  if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements){const key=item.propertyName?.text??item.name.text;module[key]??=function virtualExport(){throw Error('module top invoked dependency '+name+'::'+key);};}
 }
 const catalog=modules.get('./facade-paint-fragment');catalog.root500DataFunctionArities={paintProgramFragment:2};
 // The module-level colour assembly authority is a pure descriptor: the only dependency the module top may call.
 const authorities=[];modules.get('../../../safety/render-runtime/program-preparation').createProgramSourceAuthority=descriptor=>{authorities.push(descriptor);return{fixtureAuthority:descriptor};};
 // Native ES imports are hoisted; preserve that order in the synthetic CommonJS evaluation.
 const moduleText=[...ast.statements.filter(ts.isImportDeclaration),...ast.statements.filter(node=>!ts.isImportDeclaration(node))].map(node=>node.getText(ast)).join('\n');
 const output=ts.transpileModule(moduleText,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,exports={};
 const arities=new Function('exports','require',output+'\nreturn root500RendererDataArities;')(exports,name=>{assert(modules.has(name),'unexpected dependency '+name);return modules.get(name);});
 assert.equal(typeof exports.createBuildingMeshRenderer,'function');assert.equal(arities.get(catalog.paintProgramFragment),2);
 assert.deepEqual(authorities.map(descriptor=>descriptor.inputs),[['root500-colour-assembly-v2']],'one module-level colour assembly authority');
 const owners=modules.get('./owner-reconstruction');for(const [name,arity]of [['ownerRecoveredSourceComponents',1],['ownerReconstructionComponents',1],['ownerReconstructionIdentity',1],['ownerReconstructionBaseMaterials',3]])assert.equal(arities.get(owners[name]),arity,name);
});

test('actual preparation completes recovery, all derived displays and materials in one owned scope',async()=>{
 const h=preparation(),rows=[row()],admission={zoom:18},result=await h.prepare(rows,h.controller.signal,undefined,admission);
 assert.deepEqual(h.events,['progressive','prepare recovery','recover','recover','stages','prepare derived','append 068','append 075','append 082','append 107','prepare material admissions','materials']);assert(h.scopes.every(scope=>scope===result.scope));assert.deepEqual(h.ctx.materialInputs,[...result.source,...result.displayComponents]);
 assert.deepEqual(result.input,rows);assert.equal(result.sourceLoaded.get(key(rows[0])),rows[0]);assert.deepEqual(result.displayComponents,rows);assert.equal(result.displayComponents[0],rows[0]);assert.equal(result.originalSourceVertices,3);assert.equal(result.originalSourceIndices,3);assert.equal(result.scope.stats.ownerReleased,false);
 result.scope.release();assert.equal(result.scope.stats.disposed,true);assert.equal(h.data.state.releases,1);
});

test('empty preparation returns an explicitly releasable data scope',async()=>{
 const h=preparation(),result=await h.prepare([],h.controller.signal);assert.equal(h.events[0],'progressive');assert.equal(h.data.state.acquires,1);assert.equal(result.displayComponents.length,0);result.scope.release();assert.equal(h.data.state.releases,1);
});

test('cancellation or destruction after an awaited preparation stops consumers and releases acquired data',async()=>{
 for(const stage of ['progressive','recovery','stages','derived','material-admissions','materials'])for(const destroyed of [false,true]){
  const gate=deferred(),h=preparation(),property={progressive:'prepareRoot500ProgressiveData',recovery:'prepareOwnerRecoveredSourceComponents',stages:'importedRoot500_prepareOwnerReconstructionComponents',derived:'prepareRoot500DerivedDisplays','material-admissions':'prepareRoot500MaterialData',materials:'prepareOwnerReconstructionMaterials'}[stage],original=h.ctx[property];
  h.ctx[property]=async(...args)=>{const result=await original(...args);await gate.promise;return result;};const operation=h.prepare([row()],h.controller.signal),rejected=assert.rejects(operation,{name:'AbortError'});await tick();const before=[...h.events];if(destroyed)h.ctx.destroyed=true;else h.controller.abort();gate.resolve();await rejected;
  assert.deepEqual(h.events.slice(0,-1),before,stage);assert.equal(h.events.at(-1),'lease.release');assert.equal(h.data.state.releases,1);
 }
});

test('invalid recovered rows and failed derived preparation release without material work',async()=>{
 for(const invalid of [true,false]){
  const h=preparation();if(!invalid)h.ctx.prepareRoot500DerivedDisplays=async()=>{throw Error('tiny derived failure');};const rows=[row()];if(invalid)rows[0].city='munich';await assert.rejects(h.prepare(rows,h.controller.signal),invalid?/Invalid source component/:/tiny derived failure/);assert.equal(h.events.includes('materials'),false);assert.equal(h.data.state.releases,1);
 }
});

const failed=renderer=>!!renderer.stats.geometryPreparation.candidateFailure;
const start=async(fixture,renderer)=>{renderer.setEnabled(true);renderer.layer.onAdd({},fixture.gl);await fixture.settle(renderer);};

test('actual commit uses prepared displays once, pins before work and releases the previous generation after upload',async()=>{
 const events=[],h=residencyFixture('root500',{onRelease:(_value,lease)=>{if(lease.role==='material')events.push('release');}});h.control.onConsumer=name=>events.push('call '+name);await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],a=await h.prepareBatch(r,rows),sourceCalls=events.filter(name=>/call (?:ownerRecoveredSourceComponents|.*ownerReconstructionComponents|appendF\d+DerivedDisplay)/i.test(name));h.commit(r,a,1);a.scope.release();assert.equal(a.scope.stats.pins,1);assert.equal(a.scope.stats.disposed,false);assert.equal(r.stats.components,0,'candidate CPU is not published before scheduler admission');await start(h,r);assert.equal(r.stats.components,1);assert.equal(r.stats.vertices,3);assert.equal(r.stats.triangles,1);assert.deepEqual(a.displayComponents,rows);assert.deepEqual(events.filter(name=>/call (?:ownerRecoveredSourceComponents|.*ownerReconstructionComponents|appendF\d+DerivedDisplay)/i.test(name)),sourceCalls,'commit consumes prepared data without running the source/reconstruction/derived chain again');
  const b=await h.prepareBatch(r,rows);h.control.onUpload=()=>{assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.pins,1);events.push('upload second');};h.commit(r,b,2);b.scope.release();await h.settle(r);h.control.onUpload=undefined;assert.equal(a.scope.stats.disposed,true);assert.equal(b.scope.stats.disposed,false);assert(events.indexOf('upload second')<events.indexOf('release'));
  r.setBatches([],3);assert.equal(b.scope.stats.disposed,true);assert.equal(r.stats.components,0);assert.equal(r.stats.sourceComponents,0);assert.equal(r.stats.vertices,0);
  // Released chunk GPU geometry retires through the page store; the page owner's frame-boundary collect deletes it.
  h.chunkStore.collectRetired();assert.equal(h.buffers.size,0);r.destroy();
 });
});

test('prepared empty native input publishes nonempty derived displays instead of taking the 2D clear path',async()=>{
 const h=residencyFixture();await h.environment(async()=>{// Chunk residency: a derived-only display must be named by an explicit authoritative packing group
  // that the manager binds AFTER preparation. Supplying it before preparation
  // would incorrectly classify the fixture DISPLAY as a native source row.
  const r=h.create(),derived=component(2),p=await r.prepareBatches([],new AbortController().signal);assert.deepEqual(p.displayComponents,[],'no native input');
  const bound=retainChunkInput(fixtureChunkInput(h.chunkInputs,h.chunkStore,[derived]));p.releaseChunkDependencies();p.chunkInput=bound.input;p.releaseChunkDependencies=()=>bound.release();p.displayComponents=[derived];p.visibleDisplayKeys=[key(derived)];
  h.commit(r,p,1);p.scope.release();await start(h,r);assert.equal(r.getComponent(derived).objectId,derived.objectId);assert.equal(r.stats.sourceComponents,0,'DISPLAY never enters the native SOURCE index');assert.equal(p.scope.stats.pins,1);assert.equal(p.scope.stats.disposed,false);r.setBatches([],2);assert.equal(p.scope.stats.disposed,true);r.destroy();});
});

test('nonempty commit rejects unprepared or changed inputs, while failed candidates retain only the last published generation',async()=>{
 const h=residencyFixture();await h.environment(async()=>{const r=h.create(),rows=[component(1)],a=await h.prepareBatch(r,rows);assert.throws(()=>r.setBatches(rows,1),/require prepared/);assert.throws(()=>r.setBatches([component(2)],1,...Array(9).fill(undefined),a),/input changed/);assert.equal(a.scope.stats.pins,0);h.commit(r,a,1);a.scope.release();await start(h,r);const source=r.borrowSourceComponent(rows[0]);
  const b=await h.prepareBatch(r,[component(2)]);h.commit(r,b,2);b.scope.release();assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.pins,1);h.failNextUpload();await h.settle(r,()=>failed(r));assert.match(r.stats.geometryPreparation.candidateFailure,/tiny replacement upload failure/);assert.strictEqual(r.borrowSourceComponent(rows[0]),source);assert.deepEqual(r.getSourceComponent(rows[0]),source);assert.equal(r.getRevision().generation,1);assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.disposed,true);r.setBatches([],3);assert.equal(a.scope.stats.disposed,true);assert.equal(h.ledgers.filter(lease=>lease.role==='material').reduce((n,v)=>n+v.released,0),2);assert.equal(h.ledgers.filter(lease=>lease.role==='construction').reduce((n,v)=>n+v.released,0),4);r.destroy();});
});

test('partial payload failures keep source and scoped reads on the last published generation',async()=>{
 for(const failure of ['upload','applyF068DerivedDisplayMaterials','facadePaintData']){const h=residencyFixture();await h.environment(async()=>{const r=h.create(),rows=[component(1)],a=await h.prepareBatch(r,rows);h.commit(r,a,1);a.scope.release();await start(h,r);const source=r.borrowSourceComponent(rows[0]),b=await h.prepareBatch(r,[component(2)]);let callScope;
  if(failure!=='upload')h.control.failConsumer=failure;
  h.commit(r,b,2);b.scope.release();assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.pins,1);if(failure==='upload')h.failNextUpload();await h.settle(r,()=>failed(r));assert.match(r.stats.geometryPreparation.candidateFailure,failure==='upload'?/tiny replacement upload failure/:/tiny material failure/);assert.strictEqual(r.borrowSourceComponent(rows[0]),source);assert.deepEqual(r.getSourceComponent(rows[0]),source);assert.equal(r.getRevision().generation,1);assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.disposed,true);
  h.control.onConsumer=(name,scope)=>{if(name==='progressiveRenderStatus'){callScope=scope;assert.equal(scope.borrow(h.resource,value=>typeof value.fragment==='string'),true);}};const beforeReads=h.ledgers.reduce((n,lease)=>n+lease.borrows,0),beforeAcquires=h.ledgers.length;const diagnostic=r.stats;assert.equal(diagnostic.sourceComponents,1);assert.deepEqual(diagnostic.progressivePaintAppliedComponents,[]);assert.equal(callScope,undefined,'published diagnostics use the completed immutable view without calling a scoped producer');assert.equal(h.ledgers.length,beforeAcquires);assert.equal(h.ledgers.reduce((n,lease)=>n+lease.borrows,0),beforeReads,'reading the cached view performs no new resource borrow');assert.equal(a.scope.borrow(h.resource,value=>typeof value.fragment==='string'),true,'the retained published generation keeps its actual material lease');r.setBatches([],3);assert.equal(a.scope.stats.disposed,true);r.destroy();});}
});

test('real empty commit calls no data functions, and context loss or page hiding preserves the resident CPU pin',async()=>{
 const events=[],h=residencyFixture('root500',{onInvalidate:()=>events.push('capture.clear'),onRelease:(_value,lease)=>{if(lease.role!=='material')return;assert.equal(h.buffers.size,0);events.push('lease.release');}});await h.environment(async()=>{const r=h.create(),p=await h.prepareBatch(r,[component(1)]);h.commit(r,p,1);p.scope.release();await start(h,r);
  // A lost WebGL context frees its own objects; the page store finishes them as lost without deleteBuffer.
  const lostContextBuffers=[...h.buffers.keys()];h.handlers.get('webglcontextlost')();for(const buffer of lostContextBuffers)h.buffers.delete(buffer);r.setPageHidden(true);assert.equal(p.scope.stats.disposed,false);const originalBorrows=h.ledgers.reduce((n,l)=>n+l.borrows,0),startAt=events.length;r.setBatches([],2);assert.equal(h.ledgers.reduce((n,l)=>n+l.borrows,0),originalBorrows,'2D clear does not invoke scoped data consumers');assert(events.slice(startAt).indexOf('capture.clear')<events.slice(startAt).indexOf('lease.release'));assert.equal(p.scope.stats.disposed,true);r.destroy();h.chunkStore.collectRetired();assert(lostContextBuffers.every(buffer=>!h.deletedBuffers.has(buffer)),'lost-context buffers are never deleted through a stale context, through destroy or the page collect');});
});

test('actual scoped dispatch pads default parameters, drops callback extras and keeps pure values unchanged',async()=>{
 const data=client(),scope=createFrozenDataScope(data);await scope.prepare([tinyRef],new AbortController().signal);const ctx={fixtureScope:scope,root500RendererDataArities:new Map()},h=evaluate(`${declaration('residentScope').getText(ast)}
${fn('scopedCall').getText(ast)}
${fn('scopedValue').getText(ast)}
residentScope=fixtureScope;return{scopedCall,scopedValue,setCommitting:value=>committingScope=value};`,ctx);let received;const dataful=(...args)=>{received=args;return 7;};ctx.root500RendererDataArities.set(dataful,3);assert.equal(h.scopedCall(dataful,['rows']),7);assert.deepEqual(received,['rows',undefined,undefined,scope]);ctx.root500RendererDataArities.set(dataful,1);['row'].map(h.scopedValue(dataful));assert.deepEqual(received,['row',scope]);const other=createFrozenDataScope(data);h.setCommitting(other);h.scopedCall(dataful,['row']);assert.equal(received.at(-1),other);h.setCommitting(undefined);other.release();assert.equal(h.scopedValue(42),42);const pure=(...args)=>args;assert.deepEqual(h.scopedCall(pure,[1,2,3]),[1,2,3]);scope.release();
});

test('destroy clears CPU consumers before final release and is idempotent',async()=>{
 // GPU chunk geometry retires through the page store (fence-gated, collected at the page owner's
 // frame boundary), independently of the scope's material lease: at the final material release
 // every still-registered buffer is already in store retirement, and none survives destroy.
 let r,pendingAtRelease,retiringAtRelease;const events=[],h=residencyFixture('root500',{onRelease:(_value,lease)=>{if(lease.role!=='material')return;pendingAtRelease=[...h.buffers.keys()];retiringAtRelease=h.chunkStore.stats.retiring;assert.equal(r.stats.components,0);assert.equal(r.stats.sourceComponents,0);assert(h.buffers.size===0||h.chunkStore.stats.retiring>0,'no GPU buffer is still owned at the final material release');assert.equal(r.getReadinessDiagnostic().geometryResources.main.ownedBuffers??0,0,'the renderer owns no geometry buffer');events.push('release');}});h.control.onConsumer=name=>events.push(name);await h.environment(async()=>{r=h.create();const p=await h.prepareBatch(r,[component(1)]);h.commit(r,p,1);p.scope.release();await start(h,r);r.destroy();assert.equal(p.scope.stats.disposed,true);assert.equal(r.stats.components,0);assert.equal(r.stats.sourceComponents,0);assert.equal(h.buffers.size,0,'destroy and its page collect delete every GPU buffer');assert(Array.isArray(pendingAtRelease),'the final material release ran during destroy');assert(pendingAtRelease.length===0||retiringAtRelease>0,'buffers alive at the final material release belong to retiring store entries');assert(pendingAtRelease.every(buffer=>h.deletedBuffers.has(buffer)),'every buffer alive at the final material release is deleted by the store retirement');for(let frame=0;frame<4&&h.chunkStore.stats.retiring>0;frame++)h.chunkStore.collectRetired();assert.equal(h.chunkStore.stats.retiring,0,'store retirement completes within bounded page frame collects');r.destroy();assert.equal(h.ledgers[0].released,1);assert(events.indexOf('source.clear')<events.indexOf('release'));});
});

test('capture ownership keeps its source and geometry until the last retained execution exits',async()=>{
 const events=[],data=client(events),scope=createFrozenDataScope(data);
 await scope.prepare([tinyRef],new AbortController().signal);
 const snapshot=createResidentCaptureOwnership(()=>({version:7,release(){events.push('geometry.release');}}),scope);
 snapshot.addRelease(()=>events.push('program.release'));
 snapshot.addRelease(()=>events.push('mask.release'));
 const execution=snapshot.retain();assert.equal(execution.version,7);assert.equal(scope.stats.pins,1);
 scope.release();snapshot.release();snapshot.release();
 assert.equal(scope.stats.disposed,false);assert.deepEqual(events,[],'the retained execution still needs every binding');
 execution.release();execution.release();
 assert.equal(scope.stats.disposed,true);assert.equal(data.state.releases,1);
 assert.deepEqual(events,['mask.release','program.release','geometry.release','lease.release']);
 assert.throws(()=>snapshot.retain(),/retired/);
});

test('public reflection holds a synchronous short pin through success and failure',async()=>{
 const scope=createFrozenDataScope(client());for(const failure of [false,true]){
  const ctx={residentScope:scope,committingScope:undefined,captureRuntime:{render(){assert.equal(scope.stats.pins,1);if(failure)throw Error('tiny reflection failure');return{triangles:0};}}},render=evaluate('return {'+method('renderPlanarReflection').getText(ast)+'};',ctx).renderPlanarReflection;
  if(failure)assert.throws(()=>render({}),/tiny reflection failure/);else assert.deepEqual(render({}),{triangles:0});assert.equal(scope.stats.pins,0);
 }scope.release();
});

test('GPU initialization admits no source or allocation before a prepared plan and scheduler turn',async()=>{
 const h=residencyFixture();await h.environment(async()=>{const r=h.create();r.layer.onAdd({},h.gl);assert.equal(h.uploads.length,0);assert.equal(h.sources.length,0);assert.equal(r.isPickReady(),false);const p=await h.prepareBatch(r,[component(1)]);h.commit(r,p,1);p.scope.release();r.setEnabled(true);assert.equal(h.configurations,0);assert.equal(h.uploads.length,0);assert.equal(h.sources.length,0);await h.settle(r);assert.equal(r.getRevision().generation,1);assert.equal(h.buffers.size,5);r.destroy();});
});

test('packing, budget and numerical commit core preserves exact canonical GPU values and source arrays',async()=>{
 const h=residencyFixture();await h.environment(async()=>{const r=h.create(),c=component(1),before=structuredClone(c),p=await h.prepareBatch(r,[c]);h.commit(r,p,1);p.scope.release();await start(h,r);const geometry=h.uploads.find(row=>row.data.length===27).data,state=h.uploads.find(row=>row.data instanceof Float32Array&&row.data.length===3).data,index=h.uploads.find(row=>row.data instanceof Uint32Array).data;assert.deepEqual(Array.from(geometry),Array.from(new Float32Array([0,-0,0,0,0,1,.4,.5,.6,1,0,0,0,0,1,.4,.5,.6,0,1,0,0,0,1,.4,.5,.6])));assert.deepEqual(Array.from(state),[97,97,97]);assert.deepEqual(Array.from(index),[0,1,2]);assert.deepEqual(c,before);assert.equal(r.stats.ownerDisplayBudget!==undefined,true);assert.equal(r.stats.vertices,3);assert.equal(r.stats.triangles,1);r.destroy();});
});

test('in-place reconstruction preserves pre-chain source membership and counts without revalidating display output',async()=>{
 const h=preparation(),native=row(),rows=[native],display=row(99),stages=h.ctx.importedRoot500_prepareOwnerReconstructionComponents;display.sourceFeature={type:'display-only'};display.componentGeometry={type:'display-only'};
 h.ctx.importedRoot500_prepareOwnerReconstructionComponents=async(...args)=>{const reconstructed=await stages(...args);native.batches[0].positions.push(2,0,0);native.batches[0].normals.push(0,0,1);native.batches[0].indices.push(0,2,3);native.batches.push(row(2).batches[0]);return{...reconstructed,components:[...args[0],display]};};
 const result=await h.prepare(rows,h.controller.signal);assert.equal(result.originalSourceVertices,3);assert.equal(result.originalSourceIndices,3);assert.equal(native.batches.reduce((n,b)=>n+b.positions.length/3,0),7);assert.equal(native.batches.reduce((n,b)=>n+b.indices.length,0),9);
 assert.equal(result.sourceLoaded.size,1);assert.equal(result.sourceLoaded.get(key(native)),native);assert.equal(result.sourceLoaded.has(key(display)),false);assert.deepEqual(result.input,[native]);assert.deepEqual(result.source,[native]);assert.deepEqual(result.displayComponents,[native,display]);assert.equal(h.events.filter(stage=>stage==='stages').length,1);assert.equal(h.events.at(-1),'materials');result.scope.release();assert.equal(h.data.state.releases,1);
});
