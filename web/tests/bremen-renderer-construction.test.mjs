import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {constructionHarness,component,assertDiagnosticState,evaluate} from './fixtures/bremen-renderer-construction-harness.mjs';

function assertPublishedComponent(actual,expected){
 assert.deepEqual(actual,expected);if(!expected)return;
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(actual[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(actual.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
function assertReleasedSourcePlans(h){for(const plan of h.programPlans){assert.equal(plan.preparedSourceStats.sourceCharacters,0,'terminal plan retains no assembled source or analysis');assert.equal(plan.preparedSourceStats.released,true);}}
test('whole production constructor is cold; prepared nonempty commit configures once after retain',async()=>{
 let certificateCalls=0;
 const h=constructionHarness(undefined,{dependencyOverrides:{'./lloyd-front-runtime':{lloydFrontGroupDisplayCertificate:(display,_source,_leaf,scope)=>{certificateCalls++;assert.ok(scope.stats.pins>0);if(display[0].batches[0].positions[0]!==0)throw Error('tiny certificate array mismatch');return{status:'fixture-validated'};}}}});await h.environment(async()=>{
  const r=h.create();assert.equal(h.configuration().length,0);assert.equal(h.scopes.length,0);const cold=r.stats;assert.equal(cold.progressivePaintDiagnostics.state,'unprepared');assert.equal(cold.progressivePaintAdmissions,undefined);assert.deepEqual(cold.progressivePaintAppliedComponents,[]);assert.deepEqual(cold.progressivePaintRejectedAdmissions,[]);assertDiagnosticState(r,'unprepared');r.setBatches([],0);assertDiagnosticState(r,'unprepared');assert.equal(h.scopes.length,0);assert.equal(h.configuration().length,0);
  // The later mutable-material probe reads component(2) in this same scope.
  // Declare its complete admitted physical source group up front; the visible
  // request remains the original single component.
  const rows=[component()],materialRows=[...rows,component(2)],batch=await r.prepareBatches(rows,new AbortController().signal,undefined,undefined,undefined,materialRows,h.chunkInput(materialRows));
  assert.equal(h.configuration().length,0);assert.equal(h.clients[0].shaderBorrows,0);assert.equal(h.clients[0].admissionBorrows,0);assert.equal(h.clients[0].constructionBorrows,1);assert.equal(batch.scope.stats.pins,0);
  h.commit(r,batch,1);assert.equal(h.configuration().length,0,'setBatches only registers source demand');assert.equal(batch.scope.stats.pins,1);assert.equal(r.getRevision().generation,0);assert.equal(r.getComponent(rows[0]),undefined);assert.equal(h.gpu.sourceBuilds,0);
  r.setEnabled(true);r.layer.onAdd({},h.gl);assert.equal(h.configuration().length,0);await h.flush(r);assert.equal(r.stats.geometryPreparation.failure,undefined);assert.equal(r.getRevision().generation,1);
  assert.deepEqual(h.clients[0].releasedRefs,[h.constructionResource]);assert.equal(batch.scope.stats.resources,2);assert.throws(()=>batch.scope.borrow(h.constructionResource,value=>value),/not prepared/);
  assert.equal(batch.scope.borrow(h.resourceRefs[0],value=>value.fragment).startsWith('vec3 paintedFacade'),true,'material source stays available after construction retirement');
  const certificateEvent=h.events.findIndex(e=>e.kind==='certificates'),retireEvent=h.events.findIndex(e=>e.kind==='construction-retire'),sourceEvent=h.events.findIndex(e=>e.kind==='base');assert(certificateEvent>=0&&certificateEvent<retireEvent&&retireEvent<sourceEvent,'the actual renderer retires construction after certificates and before deferred material-source work');
  assert.equal(h.configuration().filter(e=>e.kind==='partition').length,1);assert.equal(h.configuration().filter(e=>e.kind==='source-description').length,1);assert.equal(h.configuration().filter(e=>e.kind==='base').length,1,'baseline source builds only after admission in paint mode zero');assert.ok(h.configuration().every(e=>e.scope===batch.scope));
  const firstShader=h.events.findIndex(e=>e.kind==='partition'),retain=h.events.findIndex(e=>e.kind==='retain');assert.ok(retain>=0&&retain<firstShader);assert.ok(h.phaseEvents.includes('source-build'));assert.equal(h.gpu.sourceBuilds,1);assert.equal(h.uploads.length,5);
  const metadata=r.getComponent(rows[0]),publicFull=r.getSurfaceComponent(rows[0]),otherFull=r.getSurfaceComponent(rows[0]);
  assert.deepEqual(Object.keys(metadata),['city','objectId','partId','generation','componentGeometry','sourceFeature','displayEstimates']);assert.equal(Object.hasOwn(metadata,'batches'),false);assert.notStrictEqual(metadata.sourceFeature,rows[0].sourceFeature);
  metadata.componentGeometry.coordinates[0][0][0]=99;metadata.sourceFeature.properties.changed=true;metadata.displayEstimates.progressivePainted=false;publicFull.batches[0].positions[0]=99;
  assert.equal(rows[0].componentGeometry.coordinates[0][0][0],8);assert.equal(Object.hasOwn(rows[0].sourceFeature.properties,'changed'),false);assert.equal(rows[0].batches[0].positions[0],0);assert.equal(otherFull.batches[0].positions[0],0);assert.equal(r.getComponent(rows[0]).displayEstimates.progressivePainted,true);
  assert.strictEqual(r.borrowSurfaceComponent(rows[0]).batches[0].positions,rows[0].batches[0].positions);assert.equal(r.stats.progressiveShaderSpecialization.scopeLabel,0);assert.equal(r.stats.paintProgramPartitions.baseFragmentBytes,h.programPlans[0].sourceCharacters);assert.ok(r.stats.paintProgramPartitions.baseFragmentBytes>0);assert.equal(r.stats.paintProgramPartitions.legacyPartitions,true);
  assert.equal(r.getLloydFrontGroupReadback().status,'fixture-validated');rows[0].batches[0].positions[0]=9;assert.throws(()=>r.getLloydFrontGroupReadback(),/tiny certificate array mismatch/);rows[0].batches[0].positions[0]=0;assert.equal(certificateCalls,2);
  const diagnostics=r.stats.progressivePaintDiagnostics;assert.equal(diagnostics.state,'available');assert.equal(diagnostics.generation,1);assert.equal(diagnostics.admissions,3);assert.equal(diagnostics.appliedComponents[0].objectId,rows[0].objectId);assert.equal(diagnostics.appliedComponents[0].coloredVertices,3);assert.deepEqual(diagnostics.rejectedAdmissions,[]);
  const published=r.borrowSurfaceComponent(rows[0]),publishedPaint=r.getProgressiveRenderStatus();assert.equal(published.displayEstimates.progressivePainted,true);assert.strictEqual(published.sourceFeature,rows[0].sourceFeature);assert.deepEqual(publishedPaint,diagnostics.appliedComponents);assert.deepEqual(r.getProgressivePaintFingerprints(),h.progressive.progressivePaintFingerprints);
  h.progressive.progressivePaintData([component(2)],batch.scope);assert.equal(h.progressive.progressiveRenderStatus(batch.scope)[0].objectId,'osm/way/2');assert.deepEqual(r.getProgressiveRenderStatus(),publishedPaint,'same-scope mutable records do not change the published UI receipt');assertPublishedComponent(r.borrowSurfaceComponent(rows[0]),published);assert.equal(published.displayEstimates.progressivePainted,true);
  diagnostics.appliedComponents[0].batchColorBindings['0'][0]=999;assert.equal(r.stats.progressivePaintAppliedComponents[0].batchColorBindings['0'][0],.2);
  const beforeStats={borrows:h.clients[0].borrows,acquires:h.clients[0].acquires};for(let i=0;i<3;i++)r.stats;assert.deepEqual({borrows:h.clients[0].borrows,acquires:h.clients[0].acquires},beforeStats);
  h.commit(r,batch,2);assert.equal(h.configuration().length,3);assert.equal(r.getRevision().generation,1);await h.flush(r);assert.equal(r.getRevision().generation,2);// The second plan of the identical admitted source (same chunk content and
  // program key) reuses the resident program: it configures its partition but
  // neither describes nor builds the source again, and uploads nothing new.
  assert.equal(h.programPlans.length,2);assert.equal(h.configuration().filter(e=>e.kind==='partition').length,2);assert.equal(h.configuration().filter(e=>e.kind==='source-description').length,1,'the identical admitted source is described once');assert.equal(h.gpu.sourceBuilds,1);assert.equal(h.uploads.length,5);assert.equal(h.clients[0].shaderBorrows,2,'one source build plus the explicit material-liveness read; metadata adds no body borrow');assert.equal(h.clients[0].sourceRegistrations,h.clients[0].acquires,'the scope registers each acquired value once');assert.equal(batch.scope.stats.pins,1);assert.equal(h.clients[0].acquires,3);assert.equal(h.programPlans[0].released,true);
  r.destroy();assertReleasedSourcePlans(h);batch.release();assert.equal(batch.scope.stats.disposed,true);assert.equal(h.clients[0].releases,3);h.drainPage();assert.equal(h.gpu.disposes,1);
 });
});

test('empty and destroy clear configuration; context recovery preserves resident scope and CPU arrays',async()=>{
 const h=constructionHarness();await h.environment(async()=>{
  const r=h.create(),rows=[component()],batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);r.setEnabled(true);r.layer.onAdd({},h.gl);await h.flush(r);assert.equal(r.getRevision().generation,1);
  const resident=r.borrowSurfaceComponent(rows[0]),sourceResident=r.borrowSourceComponent(rows[0]),geometry=h.uploads.find(upload=>upload.data.length===27).data,acquires=h.clients[0].acquires,beforeSpecialization=h.configuration().filter(e=>e.kind==='source-description').length,sourceBuilds=h.gpu.sourceBuilds;
  h.handlers.get('webglcontextlost')();h.handlers.get('webglcontextrestored')();await h.flush(r,()=>r.stats.contextRecovery.successes===1&&!r.stats.geometryPreparation.pending);
  assertPublishedComponent(r.borrowSurfaceComponent(rows[0]),resident);assert.strictEqual(r.borrowSourceComponent(rows[0]),sourceResident);assert.strictEqual(sourceResident.batches[0].positions,rows[0].batches[0].positions);assert.strictEqual(h.uploads.findLast(upload=>upload.data.length===27).data,geometry);assert.equal(batch.scope.stats.pins,1);assert.equal(h.configuration().filter(e=>e.kind==='source-description').length,beforeSpecialization+1,'recovery describes the source it actually rebuilt');assert.equal(h.clients[0].acquires,acquires);assert.equal(h.gpu.sourceBuilds,sourceBuilds+1,'recovery rebuilds shader from retained plan while retaining exact CPU geometry');assert.equal(r.stats.gpuLifecycle.initializations,2);
  r.setBatches([],2);assertDiagnosticState(r,'unprepared');assert.equal(r.getComponent(rows[0]),undefined);assert.equal(r.getSourceComponent(rows[0]),undefined);assert.deepEqual(r.getProgressiveRenderStatus(),[]);assert.equal(r.stats.progressiveShaderSpecialization,undefined);assert.equal(r.stats.progressivePaintDiagnostics.state,'unprepared');assert.equal(r.stats.progressivePaintDiagnostics.generation,undefined);assert.equal(r.stats.progressivePaintAdmissions,undefined);assert.deepEqual(r.stats.progressivePaintAppliedComponents,[]);assert.deepEqual(r.stats.progressivePaintRejectedAdmissions,[]);assert.equal(r.stats.paintProgramPartitions.baseFragmentBytes,0);assert.equal(r.stats.paintProgramPartitions.legacyPartitions,false);assert.equal(batch.scope.stats.pins,0);assert.equal(h.programPlans[0].released,true);
  h.commit(r,batch,3);assert.equal(batch.scope.stats.pins,1);assert.equal(r.getRevision().generation,2);await h.flush(r);assert.equal(r.getRevision().generation,3);assert.equal(h.configuration().filter(e=>e.kind==='source-description').length,beforeSpecialization+2);assert.equal(h.clients[0].acquires,acquires);
  r.destroy();assertReleasedSourcePlans(h);r.destroy();assertReleasedSourcePlans(h);assertDiagnosticState(r,'unavailable');assert.equal(r.getComponent(rows[0]),undefined);assert.equal(r.stats.progressiveShaderSpecialization,undefined);assert.equal(r.stats.progressivePaintDiagnostics.state,'unprepared');assert.equal(r.stats.progressivePaintDiagnostics.generation,undefined);assert.equal(r.stats.progressivePaintAdmissions,undefined);assert.deepEqual(r.stats.progressivePaintAppliedComponents,[]);assert.deepEqual(r.stats.progressivePaintRejectedAdmissions,[]);assert.equal(r.stats.paintProgramPartitions.baseFragmentBytes,0);assert.equal(r.stats.paintProgramPartitions.legacyPartitions,false);assert.equal(batch.scope.stats.pins,0);batch.release();assert.equal(h.clients[0].releases,3);h.drainPage();assert.equal(h.gpu.disposes,1);
 });
});

test('source-description and material failures preserve the published generation and release candidate pins',async()=>{
 // The program source is city-level (city + partition mode), and a later batch of
 // the same program source reuses the resident program without describing or
 // building it again. The first batch therefore publishes in city mode and the
 // second one needs the partition-mode program, whose source description fails.
 let partitionMode=false;
 const h=constructionHarness();h.overrideDependency('./facade-paint-fragment',{paintProgramPartitionEnabled:(city,scope)=>{assert.equal(city,'bremen');assert.ok(scope.stats.pins>0);return partitionMode;}});await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],new AbortController().signal);h.commit(r,a,1);a.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.flush(r);assert.equal(r.getRevision().generation,1);assert.equal(a.scope.stats.pins,1);const oldGPU=[...h.buffers.keys()];
  partitionMode=true;const b=await r.prepareBatches([component(2)],new AbortController().signal);h.control.failSpecialization=true;
  h.commit(r,b,2);assert.equal(r.getRevision().generation,1);await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.stats.geometryPreparation.failure,/tiny source-description failure/);assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.pins,0);assert.equal(a.scope.stats.disposed,false);assert.equal(r.getComponent(component(2)),undefined);assert.equal(r.getComponent(component(1)).objectId,'osm/way/1');assert.equal(r.stats.progressiveShaderSpecialization.scopeLabel,0);assert.equal(r.stats.progressivePaintDiagnostics.state,'available');assert.equal(r.stats.progressivePaintDiagnostics.generation,1);assert.equal(r.stats.progressivePaintAppliedComponents[0].objectId,'osm/way/1');assert.equal(r.isPickReady(),false);assert.deepEqual([...h.buffers.keys()],oldGPU);assert.equal(h.programPlans.at(-1).released,true);
  h.control.failSpecialization=false;h.commit(r,b,2);await h.flush(r);assert.equal(r.stats.progressiveShaderSpecialization.scopeLabel,1);assert.equal(a.scope.stats.disposed,true);assert.equal(b.scope.stats.pins,1);assert.equal(r.getComponent(component(2)).objectId,'osm/way/2');assert.equal(r.getRevision().generation,2);
  const c=await r.prepareBatches([component(3)],new AbortController().signal);h.control.failMaterials=true;const secondGPU=[...h.buffers.keys()];h.commit(r,c,3);await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.stats.geometryPreparation.failure,/tiny material failure/);assert.equal(h.progressive.getProgressivePaintDiagnostics(c.scope).appliedComponents[0].objectId,'osm/way/3');assert.equal(r.stats.progressivePaintDiagnostics.state,'available');assert.equal(r.stats.progressivePaintDiagnostics.generation,2);assert.equal(r.stats.progressivePaintAppliedComponents[0].objectId,'osm/way/2');assert.equal(c.scope.stats.pins,0);assert.deepEqual([...h.buffers.keys()],secondGPU);assert.equal(h.programPlans.at(-1).released,true);b.release();c.release();h.control.failMaterials=false;r.setBatches([],3);assert.equal(b.scope.stats.disposed,true);assert.equal(c.scope.stats.disposed,true);assert.equal(r.stats.progressiveShaderSpecialization,undefined);r.destroy();assertReleasedSourcePlans(h);assert.equal(h.gpu.disposes,1);
 });
});


test('pure progressive diagnostics never borrow unprepared data and report disposed scopes unavailable',async()=>{
 const h=constructionHarness(),p=h.progressive,c=component(1);
 assert.equal(p.getProgressivePaintDiagnostics().state,'unprepared');assert.equal(p.getProgressivePaintCount(),undefined);assert.equal(p.isProgressivelyPainted(c),false);assert.deepEqual(p.progressiveRenderStatus(),[]);assert.deepEqual(p.progressivePaintRejections(),[]);
 const scope=h.newScope();assert.equal(p.getProgressivePaintDiagnostics(scope).state,'unprepared');assert.equal(p.getProgressivePaintCount(scope),undefined);assert.equal(p.isProgressivelyPainted(c,scope),false);assert.deepEqual(p.progressiveRenderStatus(scope),[]);assert.deepEqual(p.progressivePaintRejections(scope),[]);assert.equal(h.clients[0].acquires,0);assert.equal(h.clients[0].borrows,0);
 scope.release();scope.memo=()=>{throw Error('disposed diagnostics must not enter memo');};scope.borrow=()=>{throw Error('disposed diagnostics must not borrow');};
 assert.equal(p.getProgressivePaintDiagnostics(scope).state,'unavailable');assert.equal(p.getProgressivePaintCount(scope),undefined);assert.equal(p.isProgressivelyPainted(c,scope),false);assert.deepEqual(p.progressiveRenderStatus(scope),[]);assert.deepEqual(p.progressivePaintRejections(scope),[]);

 const available=h.newScope();await available.prepare([h.resourceRefs[1]],new AbortController().signal);p.progressivePaintData([c],available);p.progressiveAdmission({...c,testReject:true},available);
 const cloneDescriptor=Object.getOwnPropertyDescriptor(globalThis,'structuredClone'),clone=globalThis.structuredClone,clonedInputs=[];let cloneCalls=0;
 Object.defineProperty(globalThis,'structuredClone',{...cloneDescriptor,value(value,options){cloneCalls++;clonedInputs.push(value);return Reflect.apply(clone,globalThis,[value,options]);}});
 try{
  const before={acquires:h.clients[1].acquires,borrows:h.clients[1].borrows};
  for(let i=0;i<5;i++){
   assert.equal(p.getProgressivePaintCount(available),3);assert.equal(p.isProgressivelyPainted(c,available),true);assert.equal(p.isProgressivelyPainted(component(2),available),false);
   assert.equal(p.getProgressivePaintCount(),undefined);assert.equal(p.isProgressivelyPainted(c),false);assert.equal(p.getProgressivePaintCount(scope),undefined);assert.equal(p.isProgressivelyPainted(c,scope),false);
  }
  assert.equal(cloneCalls,0,'scalar and Boolean diagnostics never clone metadata');
  const snapshot=p.getProgressivePaintDiagnostics(available);assert.equal(snapshot.state,'available');assert.ok(cloneCalls>0);
  snapshot.appliedComponents[0].batchColorBindings['0'][0]=999;snapshot.rejectedAdmissions[0].reason='mutated whole snapshot';
  let countBefore=cloneCalls;const records=p.progressiveRenderStatus(available);assert.ok(cloneCalls>countBefore);assert.ok(clonedInputs.slice(countBefore).every(Array.isArray),'render diagnostics copy only their array');assert.equal(records[0].batchColorBindings['0'][0],.2);records[0].batchColorBindings['0'][0]=777;
  countBefore=cloneCalls;const rejected=p.progressivePaintRejections(available);assert.ok(cloneCalls>countBefore);assert.ok(clonedInputs.slice(countBefore).every(Array.isArray),'rejection diagnostics copy only their array');assert.equal(rejected[0].reason,'tiny rejected carrier');rejected[0].reason='mutated rejection copy';
  const again=p.getProgressivePaintDiagnostics(available);assert.equal(again.appliedComponents[0].batchColorBindings['0'][0],.2);assert.equal(again.rejectedAdmissions[0].reason,'tiny rejected carrier');
  countBefore=cloneCalls;assert.equal(p.getProgressivePaintCount(available),3);assert.equal(p.isProgressivelyPainted(c,available),true);assert.equal(cloneCalls,countBefore);
  assert.deepEqual({acquires:h.clients[1].acquires,borrows:h.clients[1].borrows},before,'all diagnostics remain independent of resource access');assert.equal(h.clients[0].acquires,0);assert.equal(h.clients[0].borrows,0);assert.equal(h.clients[1].modelBorrows,0);
 }finally{Object.defineProperty(globalThis,'structuredClone',cloneDescriptor);available.release();}
});

// Keep the real owner, scheduler and whole renderer. Only the fake driver's
// completion status is gated; LINK_STATUS remains an independent validation.
test('draw readiness distinguishes required preparation, matrix drawing and program failure without diagnostics snapshots',async()=>{
 // As in the source-description case, the failing candidate needs a program the
 // resident does not share: the resident publishes in city mode, the candidate
 // requires the partition-mode base program.
 let partitionMode=false;
 const h=constructionHarness();h.overrideDependency('./facade-paint-fragment',{paintProgramPartitionEnabled:(city,scope)=>{assert.equal(city,'bremen');assert.ok(scope.stats.pins>0);return partitionMode;}});const preparation=h.dependency('../../../safety/render-runtime/program-preparation'),createOwner=preparation.createProgramPreparationOwner;let owner,blockStats=false;
 preparation.createProgramPreparationOwner=(...args)=>{owner=createOwner(...args);const descriptor=Object.getOwnPropertyDescriptor(owner,'stats');Object.defineProperty(owner,'stats',{...descriptor,get(){assert.equal(blockStats,false,'draw readiness must not read owner.stats');return descriptor.get.call(owner);}});return owner;};
 await h.environment(async()=>{
  const r=h.create(),descriptor=Object.getOwnPropertyDescriptor(r,'stats');Object.defineProperty(r,'stats',{...descriptor,get(){assert.equal(blockStats,false,'draw readiness must not read renderer.stats');return descriptor.get.call(r);}});
  const readiness=()=>{blockStats=true;try{const value=r.getDrawReadiness();assert.equal(value.ready,r.isPickReady());return value;}finally{blockStats=false;}};
  assert.deepEqual(readiness(),{ready:false,preparing:false});r.setEnabled(true);assert.deepEqual(readiness(),{ready:false,preparing:false},'cold empty renderer has no required missing GPU');
  const batch=await r.prepareBatches([component(1)],new AbortController().signal);h.commit(r,batch,1);batch.release();assert.deepEqual(readiness(),{ready:false,preparing:true});r.layer.onAdd({},h.gl);await h.flush(r);
  // The harness frames draw with a matrix (flush settles on draw readiness). The
  // main draw is now prepared per view: a camera move is required preparation
  // until the next matrix frame prepares and draws the new view (no frame without
  // a matrix completes it), so the compositor keeps requesting frames.
  assert.deepEqual(readiness(),{ready:true,preparing:false});
  h.handlers.get('move')();assert.deepEqual(readiness(),{ready:false,preparing:true},'a moved view requires main preparation in the next matrix frame');
  r.layer.render(h.gl,{defaultProjectionData:{}});await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(readiness(),{ready:false,preparing:true},'a frame without a matrix cannot prepare the view');
  owner.work(h.gl,{resource:'optional-fixture-work',revision:1,current:()=>true,work(){}});assert.equal(owner.stats.pending,1,'the actual shared owner has live optional work');
  r.layer.render(h.gl,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});assert.equal(owner.stats.pending,1,'the optional work is still queued');assert.deepEqual(readiness(),{ready:true,preparing:false},'optional work cannot hold the drawing phase');
  h.handlers.get('move')();assert.deepEqual(readiness(),{ready:false,preparing:true});h.control.lost=true;h.handlers.get('webglcontextlost')();assert.deepEqual(readiness(),{ready:false,preparing:true});h.control.lost=false;h.handlers.get('webglcontextrestored')();await h.flush(r,()=>h.uploads.length===10);assert.deepEqual(readiness(),{ready:false,preparing:false});
  partitionMode=true;const next=await r.prepareBatches([component(2)],new AbortController().signal);h.gl.getProgramParameter=()=>false;h.gl.getProgramInfoLog=()=> 'tiny required base program failed';h.commit(r,next,2);next.release();await h.flush(r,()=>!!r.getDrawReadiness().failure);const failed=readiness();assert.equal(failed.ready,false);assert.equal(failed.preparing,false);assert.match(failed.failure,/tiny required base program failed/);assert.equal(r.getRevision().generation,1,'failed candidate retains the published generation');
  r.setPageHidden(true);assert.deepEqual(readiness(),{ready:false,preparing:false});r.setPageHidden(false);assert.equal(readiness().failure,undefined,'hidden cancellation clears the retired candidate failure');assert.equal(next.scope.stats.disposed,true);r.setEnabled(false);assert.deepEqual(readiness(),{ready:false,preparing:false});r.setBatches([],3);assert.deepEqual(readiness(),{ready:false,preparing:false});r.destroy();assertReleasedSourcePlans(h);assert.deepEqual(readiness(),{ready:false,preparing:false});
 });
});

function delayedKHRDriver(h){
 const completionStatus=0x91B1,programs=[],ready=new WeakSet(),failed=new WeakSet(),queries=new Map(),linkChecks=new Map(),draws=[];
 const create=h.gl.createProgram,draw=h.gl.drawElements;
 h.gl.drawElements=(...args)=>{draws.push({count:args[1],offset:args[3]});return draw(...args);};
 h.gl.createProgram=()=>{const value=create();programs.push(value);return value;};
 h.gl.getExtension=name=>name==='KHR_parallel_shader_compile'?{COMPLETION_STATUS_KHR:completionStatus}:null;
 h.gl.getProgramParameter=(program,name)=>{
  if(name===completionStatus){queries.set(program,(queries.get(program)??0)+1);return ready.has(program);}
  assert.equal(name,h.gl.LINK_STATUS,'completion and link validation have distinct queries');linkChecks.set(program,(linkChecks.get(program)??0)+1);return !failed.has(program);
 };
 function turn(renderer,mainMatrix){renderer.layer.render(h.gl,{defaultProjectionData:mainMatrix?{mainMatrix}:{}});const next=h.timers.entries().next().value;if(next){h.timers.delete(next[0]);next[1]();}}
 return{programs,ready,failed,queries,linkChecks,draws,turn};
}

test('pending shader source working sets clear on hide, attempt cancellation and context loss',async()=>{
 for(const action of ['hide','abort','context-loss']){
  const h=constructionHarness(),driver=delayedKHRDriver(h);await h.environment(async()=>{
   const controller=new AbortController(),r=h.create(),batch=await r.prepareBatches([component(1)],controller.signal);h.commit(r,batch,1);batch.release();r.setEnabled(true);r.layer.onAdd({},h.gl);
   await h.flush(r,()=>driver.programs.length===1&&(driver.queries.get(driver.programs[0])??0)>=3);
   const plan=h.programPlans[0];assert(plan.preparedSourceStats.sourceCharacters>0,'the admitted source and analysis exist while link completion is pending');assert.equal(h.uploads.length,0);assert.equal(batch.scope.stats.pins,1);assert.equal(driver.linkChecks.get(driver.programs[0])??0,0);
   if(action==='hide')r.setPageHidden(true);else if(action==='abort')controller.abort();else{h.control.lost=true;h.handlers.get('webglcontextlost')();}
   assert.equal(plan.preparedSourceStats.sourceCharacters,0,action+' retires temporary shader source and analysis');
   if(action==='abort'){assert.equal(plan.preparedSourceStats.released,true);assert.equal(batch.scope.stats.disposed,true);}
   if(action==='context-loss'){assert.equal(plan.preparedSourceStats.released,false);assert.equal(batch.scope.stats.pins,1);assert.equal(batch.scope.stats.disposed,false,'context recovery retains canonical CPU scope data');}
   r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);h.drainPage();
  });
 }
});

test('KHR mode zero delayed completion consumes source marker and publishes without rebuilding source',async()=>{
 const h=constructionHarness(),driver=delayedKHRDriver(h);await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);batch.release();r.setEnabled(true);r.layer.onAdd({},h.gl);
  await h.flush(r,()=>driver.programs.length===1&&(driver.queries.get(driver.programs[0])??0)>=3);
  const base=driver.programs[0],sourceBuilds=h.gpu.sourceBuilds,planBuilds=h.programPlans[0].sourcesBuilt,sourceStats=h.programPlans[0].preparedSourceStats;assert(sourceStats.sourceCharacters>0);
  assert.equal(sourceBuilds,1);assert.equal(planBuilds,1);assert.equal(driver.linkChecks.get(base)??0,0,'KHR completion is checked before successful link validation');
  for(let i=0;i<12;i++)driver.turn(r);
  assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true});const waiting=r.getReadinessDiagnostic();assert.equal(waiting.programPreparation.pending,1);assert.equal(waiting.programPreparation.ready,0,'ready source marker is consumed before program polling');assert.equal(waiting.programPreparation.failed,0);assert.equal(waiting.hasProgram,false);assert.equal(waiting.hasVAO,false);assert.equal(h.uploads.length,0);assert.equal(r.getRevision().generation,0);assert.equal(h.gpu.sourceBuilds,sourceBuilds);assert.equal(h.programPlans[0].sourcesBuilt,planBuilds);assert.equal(driver.programs.length,1);assert.equal(batch.scope.stats.pins,1);
  assert.equal(h.programPlans[0].preparedSourceStats.builds,sourceStats.builds);assert.equal(h.programPlans[0].preparedSourceStats.analyses,sourceStats.analyses,'KHR polling reuses the parsed source working set');
  driver.ready.add(base);await h.flush(r,()=>r.getRevision().generation===1&&h.uploads.length===5);assert.equal(h.programPlans[0].preparedSourceStats.sourceCharacters,0,'completed base publication retires temporary source and analysis');
  // Programs and upload are complete; the main draw of the published generation is
  // prepared per view, which the next matrix frame does (and then draws).
  assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true},'KHR programs and upload are complete; only the matrix frame remains');const published=r.getReadinessDiagnostic();assert.equal(published.hasProgram,true);assert.equal(published.hasVAO,true);assert.equal(published.candidate,undefined);assert.equal(published.programPreparation.pending,0);assert.equal(published.programPreparation.ready,0,'terminal geometry publication leaves no ready work entry');assert.equal(published.programPreparation.failed,0);assert.equal(h.buffers.size,5);assert.equal(driver.linkChecks.get(base),1);assert.equal(h.gpu.sourceBuilds,sourceBuilds);assert.equal(h.programPlans[0].sourcesBuilt,planBuilds);assert.strictEqual(r.borrowSurfaceComponent(rows[0]).batches[0].positions,rows[0].batches[0].positions);
  driver.turn(r,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false},'one matrix frame prepares and draws the published view');assert.ok(driver.draws.length>0);assert.equal(h.gpu.sourceBuilds,sourceBuilds,'drawing rebuilds no source');assert.equal(h.uploads.length,5);
  r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);h.drainPage();
 });
});

// The candidate now prepares its required visible colours with its base program
// and publishes them atomically: geometry never becomes resident with a missing
// visible family colour, so the pending family6277 link holds the publication.
test('KHR mode two holds geometry publication until the visible family6277 colour links, for 189 turns',async()=>{
 const h=constructionHarness(undefined,{dependencyOverrides:{
  './facade-paint-controls':{paintMode:()=>2,paintOverride:()=>0},
  './facade-paint-frame':{facadePaintData:rows=>{const count=rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),frames=new Float32Array(count*5);for(let i=0;i<count;i++)frames[i*5+4]=6277;return frames;}},
 }}),driver=delayedKHRDriver(h),main=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);batch.release();r.setEnabled(true);r.layer.onAdd({},h.gl);
  await h.flush(r,()=>driver.programs.length===2&&driver.programs.every(program=>(driver.queries.get(program)??0)>=3));
  const [base,family]=driver.programs,pendingResources=()=>r.getReadinessDiagnostic().programPreparation.pendingResources;
  assert.deepEqual(pendingResources().map(entry=>[entry.resource,entry.phase]),[[JSON.stringify(['bremen','colour','base',[0]]),'link-completion'],[JSON.stringify(['bremen','colour','base',[6277]]),'link-completion']],'the candidate submits its base and required visible family colour together');
  const sourceBuilds=h.gpu.sourceBuilds,planBuilds=h.programPlans[0].sourcesBuilt,sourceStats=h.programPlans[0].preparedSourceStats;assert(sourceStats.sourceCharacters>0);
  assert.equal(sourceBuilds,2,'two program builds');assert.equal(planBuilds,1,'from one raw source');assert.equal(sourceStats.builds,1);assert.equal(sourceStats.analyses,1,'and one parsed source working set');
  assert.equal(driver.linkChecks.get(base)??0,0);assert.equal(driver.linkChecks.get(family)??0,0);assert.equal(r.getRevision().generation,0);assert.equal(h.uploads.length,0);assert.equal(r.isPickReady(),false);assert.equal(driver.draws.length,0);
  driver.ready.add(base);driver.turn(r,main);assert.equal(driver.linkChecks.get(base),1,'the base link is validated once');const beforeQueries=driver.queries.get(family);
  for(let i=0;i<189;i++){
   driver.turn(r,main);assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true});const state=r.getReadinessDiagnostic(),pending=state.programPreparation.pendingResources;
   assert.equal(state.programPreparation.pending,1);assert.equal(state.programPreparation.ready,0,'source and terminal publication work are consumed');assert.equal(state.programPreparation.failed,0);assert.equal(pending.length,1);assert.equal(pending[0].phase,'link-completion');assert.equal(pending[0].resource,JSON.stringify(['bremen','colour','base',[6277]]));
   assert.equal(state.hasProgram,false,'the linked base stays with the unpublished candidate');assert.equal(state.hasVAO,false);assert.equal(h.uploads.length,0);assert.equal(r.getRevision().generation,0);assert.equal(h.gpu.sourceBuilds,sourceBuilds);assert.equal(h.programPlans[0].sourcesBuilt,planBuilds);assert.equal(driver.programs.length,2);assert.equal(batch.scope.stats.pins,1);assert.equal(driver.draws.length,0);
  }
  assert.equal(h.programPlans[0].preparedSourceStats.builds,sourceStats.builds);assert.equal(h.programPlans[0].preparedSourceStats.analyses,sourceStats.analyses);
  assert.equal(driver.queries.get(family),beforeQueries+189);driver.turn(r);assert.equal(r.isPickReady(),false,'a preparation-only turn cannot publish the held candidate');assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true});assert.equal(r.getRevision().generation,0);
  driver.ready.add(family);for(let i=0;i<160&&!r.isPickReady();i++)driver.turn(r,main);
  assert.equal(h.programPlans[0].preparedSourceStats.sourceCharacters,0,'settled visible demand retires the current source analysis');
  assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false});assert.equal(r.getRevision().generation,1,'geometry and its visible colours publish together');const published=r.getReadinessDiagnostic();assert.equal(published.programPreparation.pending,0);assert.equal(published.programPreparation.ready,0);assert.equal(published.programPreparation.failed,0);assert.equal(published.hasProgram,true);assert.equal(published.hasVAO,true);assert.equal(h.buffers.size,5);assert.equal(driver.linkChecks.get(base),1);assert.equal(driver.linkChecks.get(family),1);assert.equal(h.gpu.sourceBuilds,sourceBuilds);assert.equal(h.programPlans[0].sourcesBuilt,planBuilds);assert.equal(r.stats.paintProgramPartitions.cachedPrograms,1);assert.equal(h.uploads.length,5);assert.ok(driver.draws.length>0);assert.strictEqual(r.borrowSurfaceComponent(rows[0]).batches[0].positions,rows[0].batches[0].positions);r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);h.drainPage();
 });
});

test('offscreen resident colour waits for camera demand while full capture rows and later solar-depth preparation remain intact',async()=>{
 const visibility=evaluate(fs.readFileSync(new URL('../src/painted/root500/safety/paint-run-visibility.ts',import.meta.url),'utf8'));
 const reflection=evaluate(fs.readFileSync(new URL('../src/safety/resident-planar-reflection.ts',import.meta.url),'utf8'));
 let captureAdapter;
 const h=constructionHarness(undefined,{dependencyOverrides:{
  './paint-run-visibility':visibility,
  './facade-paint-controls':{paintMode:()=>2,paintOverride:()=>0},
  './facade-paint-frame':{facadePaintData:rows=>{const values=[];for(const c of rows)for(const b of c.batches)for(let i=0;i<b.positions.length/3;i++)values.push(0,0,0,0,c.objectId==='osm/way/1'?6277:6278);return new Float32Array(values);}},
  '../../../safety/scene-environment-state':{defaultSceneEnvironment:()=>({instantISO:'2026-01-01T00:00:00Z',sunlight:true,shadows:true,motion:false})},
  '../../../safety/scene-solar-light':{sceneSolarLight:()=>({shadowVector:[1,1]})},
  './source-shadow':{sourceShadowOpacity:()=>0},
  // Capture execution/mask binding remain a tiny boundary. Inspect the actual
  // renderer snapshots with the real reflection planner; no capture is drawn.
  '../../../safety/render-runtime/resident-capture':{createResidentCaptureRuntime:adapter=>{captureAdapter=adapter;return{invalidate(){},render:()=>adapter.snapshot(false),prepareSolar:()=>({status:'ready'})};}},
 }}),driver=delayedKHRDriver(h),main=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 h.overrideDependency('../../../safety/solar-shadow-preparation',evaluate(fs.readFileSync(new URL('../src/safety/solar-shadow-preparation.ts',import.meta.url),'utf8'),id=>{assert.equal(id,'./render-runtime/program-preparation');return h.dependency('../../../safety/render-runtime/program-preparation');}));
 await h.environment(async()=>{
  const rows=[component(1),component(2)];for(let i=0;i<rows[1].batches[0].positions.length;i+=3)rows[1].batches[0].positions[i]+=10;
  const r=h.create(),batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);batch.release();r.setReducedMotion(true);r.setEnabled(true);r.layer.onAdd({},h.gl);
  // Without a main projection the candidate waits for the camera: it starts no
  // colour program, conservative or otherwise.
  for(let i=0;i<8;i++){driver.turn(r);await new Promise(resolve=>setImmediate(resolve));}
  assert.equal(driver.programs.length,0);assert.equal(r.getProgramPreparationStats()[0].resourceResidency.mainProjectionKnown,false);assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true});assert.equal(r.getRevision().generation,0);
  // The harness frame views component 1 only. The candidate prepares its base and
  // the visible 6277 colour and publishes them atomically; 6278 is offscreen.
  await h.flush(r,()=>driver.programs.length===2&&driver.programs.every(program=>(driver.queries.get(program)??0)>=3));
  assert.deepEqual(r.getReadinessDiagnostic().programPreparation.pendingResources.map(entry=>entry.resource),[JSON.stringify(['bremen','colour','base',[0]]),JSON.stringify(['bremen','colour','base',[6277]])]);
  for(const program of driver.programs)driver.ready.add(program);await h.flush(r,()=>r.getRevision().generation===1&&h.uploads.length===5);
  assert.equal(driver.programs.length,2,'the offscreen colour family never participates in the candidate');assert.equal(r.residentVertexCount,6);assert.equal(r.stats.paintProgramPartitions.runs,2);assert.equal(batch.scope.stats.pins,1);
  // Capture snapshots now carry the published page-store chunks (one here).
  const residentSnapshot=captureAdapter.snapshot(false);assert.equal(residentSnapshot.chunks.length,1);const resident=residentSnapshot.chunks[0];main[0]=main[5]=main[10]=resident.unit;main[12]=-resident.anchor[0]*resident.unit;main[13]=-resident.anchor[1]*resident.unit;residentSnapshot.release();
  for(let i=0;i<160&&!r.isPickReady();i++)driver.turn(r,main);
  assert.equal(r.getReadinessDiagnostic().partition.required,1);assert.match(r.getReadinessDiagnostic().partition.requiredKeys[0],/6277/);
  assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false});assert.equal(driver.programs.length,2,'the offscreen colour family never started');assert.equal(h.gpu.sourceBuilds,2);assert.equal(r.stats.paintProgramPartitions.offscreenPaintRunsSkipped,1);assert.ok(driver.draws.length>0);assert.ok(driver.draws.every(row=>row.offset===0&&row.count===3));
  const demand=r.getProgramPreparationStats()[0].resourceResidency;assert.equal(demand.mainCount,1);assert.equal(demand.captureCount,0,'sunlight alone does not create a capture lease');
  const reflected=r.renderPlanarReflection({});assert.equal(reflected.status,'active');assert.equal(reflected.chunks.length,1);const snapshot=reflected.chunks[0];assert.equal(snapshot.components.length,2);assert.equal(snapshot.indexCount,6);assert.equal(snapshot.runs.length,2);assert.ok(snapshot.runs[0].program);assert.equal(snapshot.runs[1].program,undefined,'unprepared offscreen colour remains explicit in capture');
  const wide=new Float64Array([1e-9,0,0,0,0,1e-9,0,0,0,0,1e-9,0,0,0,0,1]),capturePlan=reflection.planResidentReflection(snapshot.components,snapshot.runs,snapshot.matrix(wide),100,64,snapshot.indexCount,true);
  assert.equal(capturePlan.complete,false);assert.equal(capturePlan.reason,'missing-program');assert.equal(capturePlan.components.length,1,'partial reflection coverage cannot claim complete');reflected.release();
  r.setCaptureDemand({kind:'solar',token:'full-solar-fixture',active:true});
  for(let i=0;i<200&&r.stats.solarDepth.programs!==2;i++){
   r.prepareSolarShadow();for(const program of driver.programs)driver.ready.add(program);driver.turn(r,main);assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false},'optional depth preparation cannot block the ready main view');
  }
  assert.equal(r.getProgramPreparationStats()[0].resourceResidency.captureCount,2,'the active solar token retains the complete resident family cohort');
  const depth=r.stats.solarDepth;assert.equal(depth.programs,2);assert.deepEqual(depth.keys.map(key=>JSON.parse(key)[1][0]).sort(),[6277,6278]);assert.equal(driver.programs.length,3,'solar demand adds only the missing original colour program');assert.equal(r.stats.paintProgramPartitions.cachedPrograms,2);const solarCapture=captureAdapter.snapshot(true);assert.equal(solarCapture.chunks.length,1);const solarSnapshot=solarCapture.chunks[0];assert.equal(solarSnapshot.components.length,2);assert.equal(solarSnapshot.runs.length,2);assert.ok(solarSnapshot.runs.every(run=>run.program));assert.equal(h.uploads.length,5);
  assert.strictEqual(solarSnapshot.runs[0].program,snapshot.runs[0].program,'main colour and solar capture retain the identical ready executable');
  const compiled=driver.programs.length,sourceBuilds=h.gpu.sourceBuilds,moved=[...main];moved[12]-=10;h.handlers.get('move')();driver.turn(r,moved);
  assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false},'the newly visible family already has its original colour executable');assert.equal(driver.programs.length,compiled);assert.equal(h.gpu.sourceBuilds,sourceBuilds);assert.equal(h.uploads.length,5);assert.equal(r.getRevision().generation,1);assert.ok(driver.draws.some(row=>row.offset===12&&row.count===3));
  const sharedCapture=captureAdapter.snapshot(false);assert.equal(sharedCapture.chunks.length,1);const shared=sharedCapture.chunks[0];assert.equal(shared.components.length,2);assert.equal(shared.runs.length,2);assert.strictEqual(shared.runs[1].program,solarSnapshot.runs[1].program);for(const row of rows)assert.strictEqual(r.borrowSurfaceComponent(row).batches[0].positions,row.batches[0].positions);
  // A capture snapshot retains the resident scope, programs and chunks until its consumer releases it.
  solarCapture.release();sharedCapture.release();r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);h.drainPage();
 });
});

// A required visible colour is part of the candidate: its link failure fails the
// candidate before any geometry publication or draw, and releases its batch scope.
test('visible colour program failure fails the candidate before geometry publication, without a partial draw',async()=>{
 const h=constructionHarness(undefined,{dependencyOverrides:{
  './facade-paint-controls':{paintMode:()=>2,paintOverride:()=>0},
  './facade-paint-frame':{facadePaintData:()=>new Float32Array([0,0,0,0,6277,0,0,0,0,6277,0,0,0,0,6277])},
 }}),driver=delayedKHRDriver(h),main=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];await h.environment(async()=>{
  const r=h.create(),row=component(1),batch=await r.prepareBatches([row],new AbortController().signal);h.commit(r,batch,1);batch.release();r.setEnabled(true);r.layer.onAdd({},h.gl);
  await h.flush(r,()=>driver.programs.length===2&&driver.programs.every(program=>(driver.queries.get(program)??0)>=3));
  const [base,family]=driver.programs;assert.equal(batch.scope.stats.pins,1);driver.ready.add(base);driver.failed.add(family);driver.ready.add(family);h.gl.getProgramInfoLog=()=> 'tiny required visible colour failed';for(let i=0;i<160&&!r.getDrawReadiness().failure;i++)driver.turn(r,main);
  const state=r.getDrawReadiness();assert.equal(state.ready,false);assert.equal(state.preparing,false);assert.match(state.failure,/tiny required visible colour failed/);assert.match(r.getReadinessDiagnostic().candidateFailure,/tiny required visible colour failed/);assert.equal(r.getReadinessDiagnostic().geometryUploadFailure,undefined);
  assert.equal(r.isPickReady(),false);assert.equal(r.getRevision().generation,0,'nothing is published');assert.equal(h.uploads.length,0);assert.equal(driver.draws.length,0);assert.equal(r.borrowSurfaceComponent(row),undefined);assert.equal(batch.scope.stats.pins,0);assert.equal(batch.scope.stats.disposed,true,'the failed candidate releases its batch scope');
  r.destroy();assertReleasedSourcePlans(h);h.drainPage();
 });
});

// The source marker and chunk packing use admitted scheduler jobs. Async
// material preparation can cross microtasks before packing is queued. For the
// packed-before-loss case, drain only that bounded preparation work with a
// frozen clock; do not render again and consume the ready source marker.
// The other case advances past the 2 ms slice and loses context before packing.
function sliceClock(stepMs,run){
 const own=Object.getOwnPropertyDescriptor(performance,'now'),base=performance.now();let now=base;
 performance.now=()=>stepMs?(now+=stepMs):base;
 try{return run();}finally{if(own)Object.defineProperty(performance,'now',own);else delete performance.now;}
}
async function sourceReadyAcrossLoss(packedBeforeLoss){
 const h=constructionHarness(),family=h.dependency('../../../safety/family-paint-program'),originalRuns=family.familyPaintRuns;let packs=0;
 family.familyPaintRuns=(...args)=>{packs++;return originalRuns(...args);};
 await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],batch=await r.prepareBatches(rows,new AbortController().signal);h.commit(r,batch,1);batch.release();r.setEnabled(true);r.layer.onAdd({},h.gl);
  // Execute only the admitted source callback. Its ready marker has not yet
  // been consumed by another renderer preparation pass.
  r.layer.render(h.gl,{defaultProjectionData:{}});const first=h.timers.entries().next().value;assert.ok(first);h.timers.delete(first[0]);sliceClock(packedBeforeLoss?0:3,first[1]);
  if(packedBeforeLoss)for(let step=0;step<64&&packs===0;step++){
   await Promise.resolve();const queued=h.timers.entries().next().value;
   if(queued){h.timers.delete(queued[0]);sliceClock(0,queued[1]);}
  }
  const before=r.getReadinessDiagnostic(),reads={...h.clients[0]},sourceTurns=h.phaseEvents.filter(phase=>phase==='source-build').length;
  assert.equal(packs,packedBeforeLoss?1:0,packedBeforeLoss?'bounded unsliced preparation packs the candidate before the loss':'the slice budget yields the turn before the candidate packs');assert.equal(h.timers.size,packedBeforeLoss?0:1,packedBeforeLoss?'nothing is left for another turn':'the deferred packing keeps its scheduled turn');
  assert.equal(sourceTurns,1);assert.equal(before.candidate.phase,'source-build');assert.equal(before.programPreparation.ready,1);assert.equal(before.programPreparation.pending,0);assert.equal(before.generation,0);assert.equal(before.hasProgram,false);assert.equal(before.hasVAO,false);assert.equal(h.uploads.length,0);assert.equal(batch.scope.stats.pins,2,'the commit pin plus the pending chunk production pin (retainSource)');assert.equal(batch.scope.stats.disposed,false);
  h.handlers.get('webglcontextlost')();assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true});assert.equal(batch.scope.stats.pins,2,'the CPU chunk production and its pin survive the GPU loss');assert.equal(batch.scope.stats.disposed,false);assert.equal(r.getSourceComponent(rows[0]),undefined,'candidate SOURCE is not published during loss');
  h.handlers.get('webglcontextrestored')();await h.flush(r,()=>r.getRevision().generation===1&&h.uploads.length===5);
  assert.deepEqual(r.getDrawReadiness(),{ready:false,preparing:true},'published; the per-view main preparation waits for the next matrix frame');const published=r.getReadinessDiagnostic();assert.equal(packs,1,'the candidate packs exactly once across the loss and recovery');
  if(packedBeforeLoss){assert.equal(h.phaseEvents.filter(phase=>phase==='source-build').length,sourceTurns+1,'a no-op source callback re-establishes the marker in the new epoch');assert.equal(published.programPreparation.ready,0,'both the source marker and terminal geometry work are consumed');}
  else{assert.equal(h.phaseEvents.filter(phase=>phase==='source-build').length,sourceTurns+2,'the deferred packing turn and the no-op source callback of the new epoch');assert.equal(published.programPreparation.ready,1,'the extra source marker of the deferred packing waits for the next frame');}
  assert.equal(h.clients[0].admissionBorrows,reads.admissionBorrows);assert.equal(h.clients[0].modelBorrows,reads.modelBorrows);assert.equal(h.clients[0].acquires,reads.acquires);assert.equal(h.gpu.sourceBuilds,1,'only the recovered shader is constructed');assert.equal(published.hasProgram,true);assert.equal(published.hasVAO,true);assert.equal(published.candidate,undefined);assert.equal(published.programPreparation.pending,0);const source=r.borrowSourceComponent(rows[0]);assert.strictEqual(source.batches,rows[0].batches);assert.strictEqual(source.sourceFeature,rows[0].sourceFeature);assert.strictEqual(source.componentGeometry,rows[0].componentGeometry);assert.strictEqual(r.borrowSurfaceComponent(rows[0]).batches[0].positions,rows[0].batches[0].positions);assert.equal(batch.scope.stats.pins,1);assert.equal(h.buffers.size,5);
  r.layer.render(h.gl,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false});assert.equal(r.getReadinessDiagnostic().programPreparation.ready,0,'the matrix frame consumes the last ready entry');assert.equal(packs,1);assert.equal(h.gpu.sourceBuilds,1);r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);h.drainPage();
 });
}

test('source-ready candidate recovers across context loss before marker consumption without packing again',()=>sourceReadyAcrossLoss(true));

test('source-ready candidate whose packing the slice budget deferred recovers across context loss and packs exactly once',()=>sourceReadyAcrossLoss(false));
