import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {constructionHarness,component,evaluate} from './fixtures/bremen-renderer-construction-harness.mjs';

function assertPublishedComponent(renderer,expected){
 const actual=renderer.getSurfaceComponent(expected),borrowed=renderer.borrowSurfaceComponent(expected);
 assert.deepEqual(actual,expected);assert.notStrictEqual(actual,borrowed,'explicit full readback is isolated');
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(borrowed[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(borrowed.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
const lifecycle=evaluate(fs.readFileSync(new URL('../src/safety/resident-gpu-lifecycle.ts',import.meta.url),'utf8'),()=>{throw Error('Unexpected lifecycle import');});
function fixture(){
 const control={paused:false,failUploadAt:0,errorAt:0,errorCode:0,loseAt:0,lost:false,errorFlags:[]},uploads=[],subUploads=[],deletedBuffers=new Set(),deletedPrograms=[],buffers=new Map();let serial=0,vao,array,element,uploadAttempt=0,plans=0,errorReads=0;
 const gl={ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,ARRAY_BUFFER_BINDING:3,VERTEX_ARRAY_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,NO_ERROR:0,OUT_OF_MEMORY:0x505,INVALID_OPERATION:0x502,INVALID_ENUM:0x500,
  getError(){errorReads++;return control.errorFlags.shift()??0;},isContextLost:()=>control.lost,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),deleteVertexArray(){},deleteBuffer:b=>{deletedBuffers.add(b);buffers.delete(b);},deleteProgram:p=>deletedPrograms.push(p),
  bindVertexArray:v=>{vao=v;},bindBuffer:(target,b)=>{if(target===1)array=b;else element=b;},getParameter:key=>key===3?array:vao,
  bufferData(target,data){uploadAttempt++;const buffer=target===1?array:element;uploads.push({buffer,data,values:Array.from(data)});buffers.set(buffer,new data.constructor(data));if(control.errorAt===uploadAttempt)control.errorFlags.push(control.errorCode);if(control.loseAt===uploadAttempt)control.lost=true;if(control.failNewIndicesAfter&&data instanceof Uint32Array&&data!==control.failNewIndicesAfter){control.failNewIndicesAfter=undefined;throw Error('tiny replacement upload failure');}if(control.failUploadAt===uploadAttempt)throw Error('tiny replacement upload failure');},
  bufferSubData(_target,_offset,data){subUploads.push({buffer:array,data,values:Array.from(data)});buffers.set(array,new data.constructor(data));},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},
 };
 const h=constructionHarness(undefined,{dependencyOverrides:{
  '../../../safety/resident-gpu-lifecycle':lifecycle,
  '../../../safety/family-paint-program':{familyPaintRuns(){plans++;return[];}},
  './bremen-paint-gpu-diagnostic':{readBremenPaintGPUDiagnostic:context=>context},
 }});
 // The shared whole-renderer fixture owns the real program scheduler and its
 // fake driver. Keep this suite's exact buffer/error observations on that driver.
 // The actual Rathaus masks keep their table in a uniform buffer: those calls stay
 // on the harness driver, apart from this suite's vertex/index observations.
 const harnessGL={bindBuffer:h.gl.bindBuffer,bufferData:h.gl.bufferData,getParameter:h.gl.getParameter},uniformTarget=h.gl.UNIFORM_BUFFER;
 for(const name of ['bindBuffer','bufferData']){const own=gl[name];gl[name]=(target,...args)=>target===uniformTarget?harnessGL[name](target,...args):own(target,...args);}
 {const own=gl.getParameter;gl.getParameter=key=>key===h.gl.UNIFORM_BUFFER_BINDING||key===h.gl.MAX_UNIFORM_BUFFER_BINDINGS?harnessGL.getParameter(key):own(key);}
 // A lost context frees this suite's observed buffers too.
 h.control.onContextLost=()=>buffers.clear();
 Object.assign(h.gl,gl);Object.defineProperty(control,'paused',{get:()=>h.control.paused,set:value=>{h.control.paused=value;}});
 return{h,gl:h.gl,control,uploads,subUploads,deletedBuffers,deletedPrograms,buffers,get plans(){return plans;},get disposed(){return h.gpu.disposes;},get errorReads(){return errorReads;},get allocations(){return serial;},geometryUploads:()=>uploads.filter(row=>row.data instanceof Float32Array&&row.data.length===27),stateUploads:()=>uploads.filter(row=>row.data instanceof Float32Array&&row.data.length===3),failNextUpload(n=1){control.failUploadAt=uploadAttempt+n;},flagNextUpload(code,n=1){control.errorCode=code;control.errorAt=uploadAttempt+n;},loseNextUpload(n=1){control.loseAt=uploadAttempt+n;}};
}
const signal=()=>new AbortController().signal;

const clipVisibility=evaluate(fs.readFileSync(new URL('../src/painted/root500/safety/paint-run-visibility.ts',import.meta.url),'utf8'));
function visibilityFixture(){
 const reads=new Map(),h=constructionHarness(undefined,{dependencyOverrides:{
  './facade-paint-controls':{paintMode:()=>2,paintOverride:()=>0},
  './facade-paint-frame':{facadePaintData(rows){const out=new Float32Array(rows.length*15);rows.forEach((row,i)=>{const family=Number(row.objectId.split('/').at(-1));for(let v=0;v<3;v++)out[(i*3+v)*5+4]=family;});return out;}},
  './paint-run-visibility':{...clipVisibility,paintBoxOutsideClip(box,matrix){reads.set(box,(reads.get(box)??0)+1);return clipVisibility.paintBoxOutsideClip(box,matrix);}},
 }});
 const row=(id,x=0)=>{const value=component(id);for(let i=0;i<value.batches[0].positions.length;i+=3)value.batches[0].positions[i]+=x;return value;};
 const projection=()=>{const unit=2*Math.PI*6378137*Math.cos(53*Math.PI/180),ax=(8+180)/360,ay=(1-Math.log(Math.tan(Math.PI/4+53*Math.PI/360))/Math.PI)/2;return new Float64Array([unit,0,0,0,0,0,-unit,0,0,unit,0,0,-ax*unit,0,ay*unit,1]);};
 // The whole-renderer driver's existing 160-turn bound, with an explicit
 // caller projection instead of its fixed initial camera.
 const settleView=async(renderer,view)=>{for(let step=0;step<160;step++){renderer.layer.render(h.gl,view);const next=h.timers.entries().next().value;if(next&&!h.control.paused){h.timers.delete(next[0]);next[1]();}await new Promise(resolve=>setImmediate(resolve));if(renderer.getDrawReadiness().ready)return;}assert.fail('Bremen viewport did not reach its existing bounded readiness gate');};
 const cleanup=renderer=>{renderer.destroy();h.dependency('../../../safety/render-runtime/program-preparation').releaseRecentPrograms(h.gl);h.drainPage();};
 return{h,reads,row,projection,settleView,cleanup};
}

test('Bremen geometric visibility reuses stationary renders and separates numeric camera, candidate and recovery states',async()=>{
 const f=visibilityFixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),rows=[f.row(9),f.row(11,5)],prepared=await r.prepareBatches(rows,signal());h.commit(r,prepared,1);prepared.release();r.layer.onAdd({},h.gl);r.setEnabled(true);r.setReducedMotion(true);await h.flush(r);h.render(r);
  const boxes=rows.map(row=>r.borrowSurfaceComponent(row).box),reads=()=>boxes.reduce((n,box)=>n+(f.reads.get(box)??0),0),initial=reads();assert(initial>0);
  for(let i=0;i<12;i++)h.render(r);assert.equal(reads(),initial,'reconcile, preparation and draw share the same geometric visibility across stationary frames');
  const view=f.projection();r.layer.render(h.gl,view);assert.equal(reads(),initial,'equal matrix values in a different array reuse the scene result');
  view[12]-=5;r.layer.render(h.gl,view);assert.equal(reads(),initial+2,'mutating the same projection array recomputes both component boxes once');
  assert.deepEqual(r.getProgramPreparationStats()[0].resourceResidency.mainKeys.map(key=>JSON.parse(key)[1]),[[11]]);r.layer.render(h.gl,view);assert.equal(reads(),initial+2);
  window.devicePixelRatio=2;r.layer.render(h.gl,view);assert.equal(reads(),initial+4,'DPR invalidates even an unchanged numeric projection');window.devicePixelRatio=1;h.render(r);
  h.handlers.get('resize')();const beforeResize=reads();h.render(r);assert.equal(reads(),beforeResize+2);
  const next=await r.prepareBatches([f.row(13),f.row(15,5)],signal());h.commit(r,next,2);next.release();await h.flush(r,()=>r.getReadinessDiagnostic().candidate?.phase==='main-materials');h.control.paused=true;
  const previous=reads();for(let i=0;i<3;i++)h.render(r);assert.equal(r.getRevision().generation,1);assert.equal(reads(),previous,'temporary candidate restoration does not evict the resident visibility result');
  r.cancelCandidate(2);h.control.paused=false;await h.flush(r);assert.equal(r.getRevision().generation,1);assert.equal(r.getComponent(f.row(13)),undefined,'cancelled geometry never becomes the published scene');
  const beforeRecovery=reads();h.control.lost=true;h.handlers.get('webglcontextlost')();h.control.lost=false;h.handlers.get('webglcontextrestored')();await h.flush(r);assert(reads()>beforeRecovery,'the context incarnation invalidates geometric visibility');assert.equal(r.getRevision().generation,1);assert.equal(r.getDrawReadiness().ready,true);
  f.cleanup(r);
 });
});

test('Bremen viewport return reuses former-main programs, while real page pressure can evict and rebuild them',async()=>{
 const f=visibilityFixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),rows=[f.row(9),f.row(11,5)],prepared=await r.prepareBatches(rows,signal());h.commit(r,prepared,1);prepared.release();r.layer.onAdd({},h.gl);r.setEnabled(true);r.setReducedMotion(true);await h.flush(r);
  const a=f.projection(),b=f.projection();b[12]-=5;const uploads=h.uploads.length,initialBuilds=h.gpu.sourceBuilds;
  await f.settleView(r,b);assert.equal(h.gpu.sourceBuilds,initialBuilds+1,'only the newly visible family needs a program build');assert.equal(r.getProgramPreparationStats()[0].recent.entries,1);
  const hits=r.getProgramPreparationStats()[0].recent.ownerHits;await f.settleView(r,a);assert.equal(h.gpu.sourceBuilds,initialBuilds+1);assert.equal(r.getProgramPreparationStats()[0].recent.ownerHits,hits+1,'the exact previous main executable is adopted');assert.equal(h.uploads.length,uploads,'viewport changes do not upload geometry again');
  await f.settleView(r,b);const before=h.gpu.sourceBuilds,budget=h.page.store.budget,usage=budget.stats;assert(r.getProgramPreparationStats()[0].recent.entries>0);assert(usage.recentBytes<=usage.recentLimitBytes);
  const pressure=budget.tryReserve({category:'metadata',bytes:usage.availableBytes+usage.recentBytes,precision:'exact',identity:{}});assert.equal(r.getProgramPreparationStats()[0].recent.entries,0,'ordinary page pressure evicts revisit executables');if(pressure.ok)pressure.reservation.release();else assert.equal(pressure.error.name,'ResourceBudgetExceededError');h.page.store.collectRetired();
  await f.settleView(r,a);assert.equal(h.gpu.sourceBuilds,before+1,'an evicted family is rebuilt through the original exact recipe');assert.equal(h.uploads.length,uploads);assert.equal(r.getDrawReadiness().ready,true);f.cleanup(r);
 });
});

test('Bremen actual candidate remains unpublished at 13 of 18 main programs and publishes only when all 18 are ready',async()=>{
 const f=visibilityFixture(),{h}=f,bindings=h.dependency('../../../safety/render-runtime/program-preparation'),createOwner=bindings.createProgramPreparationOwner,blocked=new Set([113,114,115,116,117]);
 h.overrideDependency('../../../safety/render-runtime/program-preparation',{createProgramPreparationOwner(...args){const owner=createOwner(...args),held=recipe=>{try{return JSON.parse(recipe.resource)[3]?.some(family=>blocked.has(family));}catch{return false;}};return{...owner,get stats(){return owner.stats;},acquireReadyProgram(context,recipe){return held(recipe)?undefined:owner.acquireReadyProgram(context,recipe);},compile(context,recipe){if(held(recipe))throw new bindings.ProgramPreparationPending();return owner.compile(context,recipe);}};}});
 await h.environment(async()=>{
  const r=h.create(),first=await r.prepareBatches([f.row(9)],signal());h.commit(r,first,1);first.release();r.layer.onAdd({},h.gl);r.setEnabled(true);r.setReducedMotion(true);await h.flush(r);const uploads=h.uploads.length;
  const next=await r.prepareBatches(Array.from({length:18},(_,i)=>f.row(100+i)),signal());h.commit(r,next,2);next.release();await h.flush(r,()=>r.getReadinessDiagnostic().candidate?.readyMainPrograms===13);
  const candidate=r.getReadinessDiagnostic().candidate;assert.equal(candidate.requiredMainPrograms,18);assert.equal(candidate.readyMainPrograms,13);assert.equal(r.getRevision().generation,1);assert.equal(h.uploads.length,uploads);assert.equal(r.getDrawReadiness().ready,false);
  for(let i=0;i<3;i++)h.render(r);assert.equal(r.getRevision().generation,1);assert.equal(h.uploads.length,uploads,'repeated geometry visibility hits cannot become a program-readiness cache');
  blocked.clear();await h.flush(r);assert.equal(r.getRevision().generation,2);assert.equal(r.getReadinessDiagnostic().candidate,undefined);assert.equal(r.getProgramPreparationStats()[0].resourceResidency.mainCount,18);assert.equal(r.getDrawReadiness().ready,true);f.cleanup(r);
 });
});

test('actual renderer packs GPU geometry and canonical state once, then reuses both for context recovery',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],original=structuredClone(rows),batch=await r.prepareBatches(rows,signal());
  assert.equal(batch.scope.stats.resources,3,'preparation owns independent construction, shader and admission leases');assert.equal(batch.scope.borrow(h.constructionResource,()=>true),true);
  h.commit(r,batch,1);batch.release();
  r.layer.onAdd({},f.gl);r.setEnabled(true);r.setReducedMotion(true);await h.flush(r);assert.equal(r.residentVertexCount,3);assert.equal(f.uploads.length,5);assert.equal(f.plans,1);
  assert.equal(batch.scope.stats.resources,2,'the real candidate handoff retires only construction');assert.equal(batch.scope.stats.pins,1);assert.deepEqual(h.clients[0].releasedRefs,[h.constructionResource]);
  assert.throws(()=>batch.scope.borrow(h.constructionResource,()=>true),/not prepared/);for(const ref of h.resourceRefs)assert.equal(batch.scope.borrow(ref,()=>true),true,'resident material remains available');
  const live=r.getProgramPreparationStats()[0];assert.equal(live.provider,'bremen');assert(live.ownedLegacyPrograms+live.shared.heldPrograms>0,'published geometry has a live program owner');assert(live.shared.heldReferences>=live.shared.heldPrograms);
  assert.equal(live.resourceObjects.scope,'tracked-program-owners/context-lifetime-issued-calls');assert(live.resourceObjects.createdPrograms>0);assert.equal(r.getReadinessDiagnostic().geometryResources.main.contextId,live.resourceObjects.contextId,'geometry and program observations use the actual shared context identity');
  const geometry=f.geometryUploads()[0],state=f.stateUploads()[0];assert.equal(geometry.data.length,27);assert.equal(state.data.length,3);
  assert.deepEqual(geometry.values.filter((_v,i)=>i%9<3),[0,0,0,1,0,0,0,1,0]);assert.deepEqual(state.values,[97,97,97]);
  r.setEnabled(true);r.setSelection(rows[0]);assert.deepEqual(Array.from(state.data),[99,99,99],'selection mutates the canonical state used for upload in place');assert.strictEqual(f.subUploads.at(-1).data.buffer,state.data.buffer,'the selection sub-upload is a view of that canonical state');assert.deepEqual(f.subUploads.at(-1).values,[99,99,99]);
  const beforeAcquires=h.clients[0].acquires;f.control.lost=true;h.handlers.get('webglcontextlost')();f.buffers.clear();f.control.lost=false;h.handlers.get('webglcontextrestored')();await h.flush(r,()=>f.geometryUploads().length===2&&!r.stats.geometryPreparation.pending);
  assert.strictEqual(f.geometryUploads()[1].data,geometry.data,'recovery uploads the original resident GPU layout directly');assert.strictEqual(f.stateUploads()[1].data,state.data);assert.equal(f.plans,1,'recovery does not rebuild family runs');assert.equal(h.clients[0].acquires,beforeAcquires);assert.deepEqual(h.clients[0].releasedRefs,[h.constructionResource],'recovery never reacquires the retired construction input');assert.equal(batch.scope.stats.resources,2);assert.deepEqual(rows,original);
  r.setBatches([],2);assert.equal(batch.scope.stats.disposed,true);assert.equal(h.clients[0].releases,3);r.destroy();assert.equal(f.disposed,1);assert.ok(f.deletedPrograms.length>0);
  const retired=r.getProgramPreparationStats()[0];assert.equal(retired.pending,0);assert.equal(retired.ownedLegacyPrograms,0);assert.equal(retired.shared.heldPrograms,0);assert.equal(retired.shared.heldReferences,0);assert.equal(retired.shared.grantedReferences,retired.shared.releasedReferences,'all owner-lifetime logical grants are released, including context-loss retirement');assert.deepEqual(retired.shared.demands,[],'the last owner retains no queued or linked demand');assert.deepEqual(retired.resourceResidency.captureTokens,[]);assert.equal(retired.resourceResidency.captureOwnedCount,0);assert.deepEqual(retired.resourceResidency.captureOwnedKeys,[]);
 });
});

test('bremen published-resident restoration registers the complete visible set before waiting and requires a fresh full draw',async()=>{
 const h=constructionHarness(undefined,{dependencyOverrides:{'./facade-paint-controls':{paintMode:()=>2,paintOverride:()=>0},'./facade-paint-frame':{facadePaintData(rows){const out=new Float32Array(rows.length*15);rows.forEach((row,i)=>{const family={1:9,2:11,3:13}[Number(row.objectId.split('/').at(-1))];for(let v=0;v<3;v++)out[(i*3+v)*5+4]=family;});return out;}}}});await h.environment(async()=>{
  const r=h.create(),rows=[component(1),component(2),component(3)],batch=await r.prepareBatches(rows,signal());h.commit(r,batch,1);batch.release();r.layer.onAdd({},h.gl);r.setEnabled(true);r.setReducedMotion(true);await h.flush(r);h.render(r);assert.equal(r.getDrawReadiness().ready,true);const canonical=h.uploads.find(row=>row.data instanceof Float32Array&&row.data.length===81).data,cpu=r.borrowSurfaceComponent(rows[0]),acquires=h.clients[0].acquires,epoch=r.getProgramPreparationStats()[0].context.epoch,recoveries=r.stats.contextRecovery.successes;
  h.control.lost=true;h.handlers.get('webglcontextlost')();h.buffers.clear();assert.equal(r.getDrawReadiness().ready,false);assert.equal(batch.scope.stats.disposed,false);h.control.lost=false;h.handlers.get('webglcontextrestored')();const requests=h.compileRequests.length,uploads=h.uploads.length;r.layer.render(h.gl,{defaultProjectionData:{}});assert.equal(h.compileRequests.length,requests,'unknown projection cannot register restoration work');assert.equal(h.uploads.length,uploads);assert.equal(r.getDrawReadiness().ready,false);
  h.render(r);const families=new Set(h.compileRequests.slice(requests).flatMap(row=>JSON.parse(row.resource)[3]));for(const family of [0,9,11,13])assert(families.has(family),'the first finite restoration pass registers every actual required main recipe despite Pending');assert.equal(h.uploads.length,uploads);assert.equal(r.getDrawReadiness().ready,false);assert.equal(r.getProgramPreparationStats()[0].context.epoch,epoch+1);assert.equal(r.stats.contextRecovery.successes,recoveries,'initialization and registered material roles are not a completed recovery');const grants=r.getProgramPreparationStats()[0].shared.grantedReferences;h.render(r);h.render(r);assert.equal(r.getProgramPreparationStats()[0].shared.grantedReferences,grants);
  const draws=h.draws.length;await h.flush(r);assert.equal(r.getDrawReadiness().ready,true);assert.equal(r.stats.contextRecovery.successes,recoveries+1,'only the fresh complete main draw completes recovery');assert(h.draws.length>draws,'recovery readiness follows an actual complete main draw');assert.equal(r.getRevision().generation,1);assert.strictEqual(h.uploads.findLast(row=>row.data instanceof Float32Array&&row.data.length===81).data,canonical);assertPublishedComponent(r,cpu);assert.equal(h.clients[0].acquires,acquires,'restoration does not reacquire retired construction or model leases');assert.equal(batch.scope.stats.disposed,false);assert.equal(r.getProgramPreparationStats()[0].pending,0);h.handlers.get('move')();assert.equal(r.getDrawReadiness().ready,false,'a full draw for the previous view cannot certify the next view');h.render(r);assert.equal(r.getDrawReadiness().ready,true);r.destroy();assert.equal(batch.scope.stats.disposed,true);h.drainPage();
 });
});

test('material failure restores the published CPU generation without changing its GPU buffers or reusable preparation stats',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();const resident=r.borrowSurfaceComponent(component(1)),gpuBefore=[...f.buffers.keys()],uploads=f.uploads.length;
  const b=await r.prepareBatches([component(2)],signal()),stats=b.stats;h.control.failMaterials=true;
  h.commit(r,b,2);await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.stats.geometryPreparation.failure,/tiny material failure/);assertPublishedComponent(r,resident);assert.equal(r.getComponent(component(2)),undefined);assert.equal(r.getRevision().generation,1);assert.equal(r.stats.progressivePaintDiagnostics.state,'available');assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.pins,0);assert.equal(f.uploads.length,uploads);assert.deepEqual([...f.buffers.keys()],gpuBefore);assert.strictEqual(b.stats,stats);
  b.release();assert.equal(b.scope.stats.disposed,true);h.control.failMaterials=false;r.destroy();assert.equal(a.scope.stats.disposed,true);
 });
});

test('failed candidate GPU upload deletes only candidate buffers and restores the last uploaded CPU/source/scope generation',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();const resident=r.borrowSurfaceComponent(component(1)),gpuBefore=[...f.buffers.keys()],source=r.borrowSourceComponent(component(1));
  const b=await r.prepareBatches([component(2)],signal());f.failNextUpload(2);h.commit(r,b,2);b.release();await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.getDrawReadiness().failure,/replacement upload failure/);assert.equal(r.getDrawReadiness().preparing,false);assert.match(r.stats.geometryPreparation.failure,/replacement upload failure/);
  assertPublishedComponent(r,resident);assert.strictEqual(r.borrowSourceComponent(component(1)),source);assert.deepEqual(r.getSourceComponent(component(1)),source);assert.equal(r.getComponent(component(2)),undefined);assert.equal(r.getRevision().generation,1);assert.equal(r.stats.geometryPreparation.pending,false);assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.disposed,true);assert.deepEqual([...f.buffers.keys()],gpuBefore);assert.ok(gpuBefore.every(buffer=>!f.deletedBuffers.has(buffer)));
  r.destroy();assert.equal(a.scope.stats.disposed,true);h.drainPage(f.buffers);
 });
});

test('successive pending generations retain one uploaded fallback and release each superseded candidate before final upload',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();const before=f.uploads.length;
  f.control.paused=true;const b=await r.prepareBatches([component(2)],signal());h.commit(r,b,2);b.release();assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.pins,1);
  const c=await r.prepareBatches([component(3)],signal());h.commit(r,c,3);c.release();assert.equal(a.scope.stats.pins,1);assert.equal(b.scope.stats.disposed,true);assert.equal(c.scope.stats.pins,1);assert.equal(f.uploads.length,before);
  f.control.paused=false;await h.flush(r);assert.equal(f.uploads.length,before+5);assert.equal(a.scope.stats.disposed,true);assert.equal(c.scope.stats.disposed,false);assert.equal(r.getRevision().generation,3);assert.equal(r.getComponent(component(3)).objectId,'osm/way/3');
  r.setBatches([],4);assert.equal(c.scope.stats.disposed,true);r.destroy();h.drainPage(f.buffers);
 });
});

test('verified legacy shadow admission retains its receipt length while solar display owns the only shadow index buffer',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),rows=[component(1)],batch=await r.prepareBatches(rows,signal()),boundary='d'.repeat(64);
  const admission={verifiedBoundarySHA256:boundary,profile:{schema_version:1,city:'bremen',source_boundary_sha256:boundary,status:'display-schematic',includes_growth_zero_to_one:true,swept_bbox_actual_city_covered:true,fixed_vector:[1,1]},components:[{objectId:rows[0].objectId,partId:rows[0].partId,triangleCount:1}]};
  r.setBatches(rows,1,admission,...Array(8).fill(undefined),batch);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);batch.release();
  const stats=r.stats;assert.equal(stats.sceneEnvironment.fixedShadowIndexBytes,12);assert.equal(stats.sceneEnvironment.dynamicShadowIndexBytes,0);assert.equal(stats.shadowAdmittedComponents,1);// The resident CPU typed arrays now also include the chunk's Rathaus mask table,
  // the very table uploaded once as the mask uniform buffer.
  assert.equal(h.uniformUploads.length,1);assert.equal(stats.cpuTypedArrayBytes,240+h.uniformUploads[0].bytes,'geometry/state/paint/index buffers and the mask table are counted once, without an unused legacy shadow copy');
  assert.equal(h.page.store.stats.budget.categories.packed.bytes,240+stats.sceneEnvironment.fixedShadowIndexBytes,'the packed chunk holds its arrays once plus the one solar-display shadow index array');assert.deepEqual(f.uploads[0].values,[0,1,2]);
  r.destroy();assert.equal(batch.scope.stats.disposed,true);
 });
});

test('a failed pending upload after context loss restores the uploaded generation and uploads its retained buffers once',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();const geometry=f.geometryUploads()[0].data,state=f.stateUploads()[0].data,geometryUploadsBeforeLoss=f.geometryUploads().length;
  const b=await r.prepareBatches([component(2)],signal());h.commit(r,b,2);b.release();await h.flush(r,()=>f.plans===2);assert.equal(f.uploads.length,5,'the new CPU plan is packed before any candidate GPU publication');const planned=f.plans;
  f.control.paused=true;f.control.lost=true;h.handlers.get('webglcontextlost')();f.buffers.clear();
  f.control.failNewIndicesAfter=f.uploads[0].data;f.control.paused=false;f.control.lost=false;h.handlers.get('webglcontextrestored')();await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.equal(r.getRevision().generation,1);assert.equal(b.scope.stats.disposed,true);assert.equal(a.scope.stats.disposed,false);await h.flush(r,()=>!r.stats.geometryPreparation.pending&&f.geometryUploads().length>geometryUploadsBeforeLoss&&f.geometryUploads().at(-1).data===geometry);assert.equal(r.stats.geometryPreparation.pending,false);assert.equal(r.getDrawReadiness().ready,false,'old geometry preservation cannot certify the failed requested view');assert.equal(r.getDrawReadiness().preparing,false);assert.match(r.getDrawReadiness().failure,/tiny replacement upload failure/);assert.strictEqual(f.geometryUploads().at(-1).data,geometry);assert.strictEqual(f.stateUploads().at(-1).data,state);assert.equal(f.plans,planned,'recovery reuses both packed CPU plans without rebuilding');assert.equal(r.getComponent(component(2)),undefined);assert.equal(r.getComponent(component(1)).objectId,'osm/way/1');
  r.destroy();assert.equal(a.scope.stats.disposed,true);h.drainPage(f.buffers);
 });
});

test('a SOURCE-only commit keeps its source scope while immediately dropping an unused uploaded fallback',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),a=await r.prepareBatches([component(1)],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();
  const row=component(2);row.batches[0].indices=new Uint32Array();const b=await r.prepareBatches([row],signal());h.commit(r,b,2);b.release();await h.flush(r);
  assert.equal(a.scope.stats.disposed,true);assert.equal(b.scope.stats.disposed,false);assert.equal(r.getSourceComponent(row).objectId,row.objectId);assert.equal(r.getComponent(row),undefined);
  // The renderer drops the unused fallback at once: it holds no chunk or buffer.
  // Its released GPU chunk now belongs only to the page store's recent cache.
  const geometry=r.getProgramPreparationStats()[0].resourceResidency.geometry.main,budget=h.page.store.stats.budget,cached=[...f.buffers.values()].reduce((n,data)=>n+data.byteLength,0);
  assert.equal(geometry.chunks,0);assert.equal(geometry.ownedBuffers,0);assert.equal(budget.categories['gpu-buffer']?.bytes??0,cached,'every remaining buffer is a page-ledger chunk resource');assert.ok(h.page.store.stats.recent>=1&&budget.recentBytes>=cached,'and is held only as recent cache');
  assert.equal(r.stats.geometryPreparation.pending,false);
  // Recent cache, not a pin: while the renderer still holds this SOURCE scope,
  // evicting the page recent set retires every remaining GPU chunk and deletes
  // its buffers. Each pass must free something (a retired chunk releases its
  // parent only at collect, so one pass drains one dependency level).
  for(let pass=0;h.page.store.stats.gpu;pass++){const before=h.page.store.stats.resources;h.page.store.evictRecent();h.page.store.collectRetired();assert.ok(h.page.store.stats.resources<before,'eviction pass '+pass+' must free a cached entry: no remaining GPU chunk is pinned by the live renderer');}
  assert.equal(f.buffers.size,0,'every remaining buffer was evictable recent cache');assert.equal(h.page.store.stats.budget.categories['gpu-buffer']?.bytes??0,0);
  assert.equal(r.getSourceComponent(row).objectId,row.objectId,'evicting the cached fallback keeps the committed SOURCE');
  r.destroy();assert.equal(b.scope.stats.disposed,true);h.drainPage(f.buffers);
 });
});

test('bounded upload checks reject WebGL error flags, context loss and pre-existing errors before publishing',async()=>{
 const f=fixture(),{h}=f;await h.environment(async()=>{
  const r=h.create(),row=component(1),a=await r.prepareBatches([row],signal());h.commit(r,a,1);r.layer.onAdd({},f.gl);r.setEnabled(true);await h.flush(r);a.release();const resident=r.borrowSurfaceComponent(row),source=r.borrowSourceComponent(row),geometry=f.geometryUploads()[0].data;
  const idleReads=f.errorReads;r.setEnabled(true);r.setSelection(row);r.layer.render(f.gl,{defaultProjectionData:{}});assert.equal(f.errorReads,idleReads,'selection and an ordinary frame do not poll GL errors');
  for(const code of [f.gl.OUT_OF_MEMORY,f.gl.INVALID_OPERATION]){
   const before=r.readPaintGPUDiagnostic([row]),oldBuffers=[...f.buffers.keys()],reads=f.errorReads,uploads=f.uploads.length,b=await r.prepareBatches([component(2)],signal());
   f.flagNextUpload(code,2);h.commit(r,b,2);b.release();await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.stats.geometryPreparation.failure,new RegExp('Geometry upload failed with WebGL error 0x'+code.toString(16)));
   const after=r.readPaintGPUDiagnostic([row]);for(const key of ['vao','vertexBuffer','indexBuffer','progressiveBuffer','paintBuffer'])assert.strictEqual(after[key],before[key],key+' stays on the uploaded generation');
   assertPublishedComponent(r,resident);assert.strictEqual(r.borrowSourceComponent(row),source);assert.deepEqual(r.getSourceComponent(row),source);assert.equal(r.getRevision().generation,1);assert.equal(b.scope.stats.disposed,true);assert.deepEqual([...f.buffers.keys()],oldBuffers);assert.ok(oldBuffers.every(buffer=>!f.deletedBuffers.has(buffer)));assert.deepEqual(f.uploads.slice(uploads).map(row=>row.data.constructor.name+row.data.length),['Uint32Array3','Float32Array27','Float32Array15','Float32Array12'],'the chunk geometry buffers upload; its separate state buffer follows only a clean geometry check');assert.equal(f.errorReads,reads+2,'one entry check and one complete-candidate check');
  }
  const lostAttempt=new AbortController(),oldBuffers=[...f.buffers.keys()],reads=f.errorReads,b=await r.prepareBatches([component(2)],lostAttempt.signal);f.loseNextUpload(3);h.commit(r,b,2);b.release();await h.flush(r,()=>f.control.lost);assert.equal(f.control.lost,true);
  assertPublishedComponent(r,resident);assert.equal(b.scope.stats.disposed,false,'newest uncommitted attempt stays pinned until aborted or restored');assert.equal(r.stats.geometryPreparation.pending,true);assert.ok(oldBuffers.every(buffer=>!f.deletedBuffers.has(buffer)),'loss is detected before old buffers are released');assert.equal(f.errorReads,reads+1,'the entry check only: the complete-candidate check sees the lost context without reading GL errors');
  h.handlers.get('webglcontextlost')();f.buffers.clear();lostAttempt.abort();assert.equal(b.scope.stats.disposed,true);f.control.lost=false;const previousGeometryUploads=f.geometryUploads().length;h.handlers.get('webglcontextrestored')();await h.flush(r,()=>f.geometryUploads().length>previousGeometryUploads&&f.geometryUploads().at(-1).data===geometry&&!r.stats.geometryPreparation.pending);assert.equal(r.stats.geometryPreparation.pending,false);assert.strictEqual(f.geometryUploads().at(-1).data,geometry,'restoration reuses the successful generation CPU geometry');
  const uploads=f.uploads.length,allocations=f.allocations,priorReads=f.errorReads,c=await r.prepareBatches([component(3)],signal());f.control.errorFlags.push(f.gl.INVALID_ENUM,f.gl.INVALID_OPERATION);
  h.commit(r,c,2);c.release();await h.flush(r,()=>!!r.stats.geometryPreparation.failure);assert.match(r.stats.geometryPreparation.failure,/pre-existing WebGL error 0x500/);assert.equal(f.errorReads,priorReads+1);assert.deepEqual(f.control.errorFlags,[f.gl.INVALID_OPERATION],'only the reported pre-existing flag is read; there is no error drain');assert.equal(f.uploads.length,uploads);assert.equal(f.allocations,allocations);assertPublishedComponent(r,resident);assert.equal(c.scope.stats.disposed,true);
  r.destroy();assert.equal(a.scope.stats.disposed,true);h.drainPage(f.buffers);
 });
});
