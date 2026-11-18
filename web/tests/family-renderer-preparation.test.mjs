import test from 'node:test';
import assert from 'node:assert/strict';
import {familyHarness,S402_SOURCES} from './support/f6resb-family-whole-renderer.mjs';

// Chunk residency (stage 3, round 6): root500, infill and bremen no longer upload one renderer-wide
// vertex/index/state/paint/progressive array set from extracted closures. Every upload, cancellation,
// failure, recovery and readback runs through published page-store chunks of the actual renderer
// module, so these suites now drive the whole renderer (support/f6resb-family-whole-renderer.mjs over
// the residency and Bremen construction fixtures) and observe the shared fake WebGL context.
// The positive complete-main proof stays with the whole-module lifecycle suites; here a recovery is
// only checked not to be signed by uploaded buffers or an invalid frame.
const providers=['root500','infill','bremen'];
const VIEW_LAYOUT=[{index:0,size:3,stride:36,offset:0},{index:1,size:3,stride:36,offset:12},{index:2,size:3,stride:36,offset:24},{index:3,size:1,stride:4,offset:0},{index:4,size:4,stride:20,offset:0},{index:5,size:1,stride:20,offset:16},{index:6,size:4,stride:16,offset:0}];
// The chunk's shared static allocation carries every attribute except the per-view selection state.
const STATIC_LAYOUT=VIEW_LAYOUT.filter(row=>row.index!==3);
const SHADOW_LAYOUT=[[0,3,36,0],[3,1,4,0],[4,2,20,0],[6,1,16,12]];
const kinds=uploads=>uploads.map(upload=>upload.data.constructor.name+':'+upload.data.length);
// Canonical 9-float vertices of one row at its own chunk frame: position, normal, colour.
function interleaved(row){const out=[];for(const batch of row.batches)for(let i=0;i<batch.positions.length/3;i++)out.push(...Float32Array.from([batch.positions[i*3],batch.positions[i*3+1],batch.positions[i*3+2],batch.normals[i*3],batch.normals[i*3+1],batch.normals[i*3+2],batch.color[0],batch.color[1],batch.color[2]]));return out.map(value=>value===0?0:value);}
const viewVao=f=>{const vao=[...new Set(f.attrs.filter(row=>row.index===3&&row.stride===4).map(row=>row.vao))].at(-1);assert(vao,'a chunk view VAO with its state attribute');return vao;};
const staticVao=f=>{const vao=[...new Set(f.attrs.map(row=>row.vao))].filter(value=>!f.attrs.some(row=>row.vao===value&&row.index===3)).at(-1);assert(vao,'a static chunk VAO');return vao;};
// An unready readback must issue no GL call. Bremen reads through its resident geometry owner's picking lease,
// whose capture checks the context epoch: that status query (isContextLost) is the only call it may make; it
// issues no binding, buffer or readback call.
const readbackStatusQueries=provider=>provider==='bremen'?new Set(['isContextLost']):new Set();
function withoutGL(f,work){const allowed=readbackStatusQueries(f.provider),methods=Object.entries(f.gl).filter(([name,value])=>typeof value==='function'&&!allowed.has(name));for(const [name]of methods)f.gl[name]=()=>{throw Error('unready readback touched GL.'+name);};try{return work();}finally{for(const [name,value]of methods)f.gl[name]=value;}}
function assertReadbackReady(result,count=1){assert.equal(result.requested,true);assert.equal(result.available,true);assert.equal(result.records.length,count);for(const record of result.records){assert.equal(record.available,true);assert.equal(record.packedGeometry.allValuesMatchCPU,true);assert.equal(record.packedIndex.allValuesMatchCPU,true);}}
const failureOf=r=>{const state=r.stats.geometryPreparation;return state.failure??state.candidateFailure;};
async function publish(f,r,rows,generation=1){const batch=await f.prepare(r,rows);f.commit(r,batch,generation);f.release(batch);f.attach(r);await f.settle(r);f.visible(r);return batch;}
async function stepUntil(f,r,until,message,limit=40){for(let i=0;i<limit;i++){if(until())return;await f.step(r);}assert(until(),message);}

for(const provider of providers){
 test(`${provider}: main packing/upload uses actual shared work and preserves every float32, index and attribute layout`,async()=>{
  const f=familyHarness(provider);await f.environment(async()=>{
   const r=f.create(),row=f.diagnosticComponent(),batch=await f.prepare(r,[row]);f.commit(r,batch,1);f.release(batch);
   assert.equal(f.uploads.length,0,'a commit queues its candidate and uploads nothing inline');
   f.attach(r);assert.equal(f.uploads.length,0,'attachment schedules the upload as shared preparation work');
   const previousVao={fixture:'previous vao'},previousArray={fixture:'previous array'};f.gl.bindVertexArray(previousVao);f.gl.bindBuffer(f.gl.ARRAY_BUFFER,previousArray);
   await f.settle(r);
   const n=row.batches.reduce((count,b)=>count+b.positions.length/3,0);
   assert.deepEqual(kinds(f.uploads),['Uint32Array:'+n,'Float32Array:'+n*9,'Float32Array:'+n*5,'Float32Array:'+n*4,'Float32Array:'+n],'one chunk: indices, canonical vertex9, paint5, progressive4 and its separate state1');
   const [index,vertex,paint,progressive,state]=f.uploads;
   assert.deepEqual(index.values,[...row.batches[0].indices]);assert.deepEqual(vertex.values.map(value=>value===0?0:value),interleaved(row));assert.deepEqual(state.values,Array(n).fill(97));
   for(const upload of [paint,progressive])assert.deepEqual(upload.values,Array.from(upload.data),'the uploaded paint/progressive values are the published canonical CPU array, unchanged since upload');
   const diagnostic=r.readPaintGPUDiagnostic([row]);assertReadbackReady(diagnostic);
   // The renderer's own readback reads paint5/progressive4 back at each record's range: every value equals the
   // canonical CPU array uploaded for this chunk at that range.
   for(const record of diagnostic.records)for(const [name,upload,stride]of [['paint',paint,5],['progressive',progressive,4]]){const read=record[name];assert(read&&Array.isArray(read.values)&&read.values.length>0,'readback carries '+name);assert.equal(read.strideFloats,stride);const at=read.offsetBytes/4;assert.deepEqual(read.values,upload.values.slice(at,at+read.values.length),name+' GPU values equal the canonical CPU values at the record range');}
   assert.deepEqual(f.layoutAt(viewVao(f)),VIEW_LAYOUT,'the drawn chunk view binds every attribute at its canonical stride/offset');
   assert.deepEqual(f.layoutAt(staticVao(f)),STATIC_LAYOUT,'the shared static chunk allocation binds the same canonical layout without the view state');
   assert.equal(f.gl.getParameter(f.gl.VERTEX_ARRAY_BINDING),previousVao,'the upload restores the caller VAO');assert.equal(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING),previousArray,'the upload restores the caller ARRAY_BUFFER');
   assert.equal(r.getProgramPreparationStats()[0].context.maxInFlight,2);
   assert.equal(f.plans,1,'the chunk production plans its family runs once; the GPU upload reuses them');
   // A full resident upload pending after context restoration: new selection state cannot reach any GPU buffer
   // until that upload, which then carries the newest canonical state.
   f.visible(r);f.lose();f.restore();const uploads=f.uploads.length,subUploads=f.subUploads.length;r.setSelection(row);
   assert.equal(f.subUploads.length,subUploads,'new state cannot mutate GPU geometry while the full upload is pending');assert.equal(f.uploads.length,uploads);
   await f.settle(r,()=>f.residentUploaded(r));const restored=f.uploads.slice(uploads);
   assert.deepEqual(kinds(restored),kinds(f.uploads.slice(0,5)));assert.strictEqual(restored[1].data,vertex.data,'restoration re-uploads the same canonical vertex array');assert.strictEqual(restored[2].data,paint.data,'restoration re-uploads the same canonical paint array');assert.strictEqual(restored[3].data,progressive.data,'restoration re-uploads the same canonical progressive array');assert.deepEqual(restored[4].values,Array(n).fill(99),'the restored state carries the selection made while the upload waited');
   assert.equal(f.plans,1);
  });
 });
 test(`${provider}: superseded/hidden/lost jobs cannot upload, and recovery resubmits the latest CPU snapshot`,async()=>{
  const f=familyHarness(provider);await f.environment(async()=>{
   const r=f.create();f.attach(r);
   // Superseded: the first candidate is committed to an attached renderer and a frame admits its upload work (queued,
   // its timer not yet run); a newer commit then supersedes it before that work runs.
   const first=await f.prepare(r,[f.component(1)]);f.commit(r,first,1);f.release(first);f.frameOnly(r);assert(f.timers.size>0,'the first candidate upload work is admitted and queued');assert.equal(f.uploads.length,0);
   const latest=await f.prepare(r,[f.component(2)]);f.commit(r,latest,2);f.release(latest);
   await f.settle(r);f.visible(r);
   assert.equal(r.getRevision().generation,2);assert.equal(r.getComponent(f.component(1)),undefined);assert.equal(r.getComponent(f.component(2)).objectId,f.component(2).objectId);
   assert.equal(f.uploads.length,5,'the superseded candidate never uploads; only the latest chunk does');assert.equal(first.scope.stats.disposed,true,'the superseded candidate scope is released');
   const vertex=f.uploads[1].data;
   // Lost while an upload is admitted: a restoration's resident upload is admitted by a finite main frame (its timer
   // task queued, not yet run) and the context is lost again before that task runs. The admitted job cannot upload
   // through the lost context; the next restoration resubmits the published canonical snapshot.
   f.lose();f.restore();f.frameOnly(r);assert(f.timers.size>0,'the restoration upload work is admitted and queued');assert.equal(f.uploads.length,5);
   f.lose();await f.idle(20);assert.equal(f.uploads.length,5,'a job admitted before the loss cannot upload through the lost context');
   f.restore();await f.settle(r,()=>f.residentUploaded(r));assert.equal(f.uploads.length,10);assert.strictEqual(f.uploads[6].data,vertex,'recovery uploads the latest published CPU snapshot');assert.equal(r.getRevision().generation,2);
   // Hidden: the pending restore upload is cancelled while hidden and resubmitted when visible again.
   f.visible(r);f.lose();f.restore();r.setPageHidden(true);await f.idle(20);assert.equal(f.uploads.length,10,'hidden work cannot upload');
   r.setPageHidden(false);await f.settle(r,()=>f.residentUploaded(r));assert.equal(f.uploads.length,15);assert.strictEqual(f.uploads[11].data,vertex);assert.equal(r.getRevision().generation,2);
   // Hidden candidate (HEAD semantics): a pending candidate is cancelled while the page is hidden; it never uploads,
   // its scope is released and the published generation stays. It does not resume by itself: the manager resubmits it.
   f.visible(r);const hiddenCandidate=await f.prepare(r,[f.component(1)]);f.commit(r,hiddenCandidate,3);f.release(hiddenCandidate);
   r.setPageHidden(true);await f.idle(20);assert.equal(f.uploads.length,15,'a hidden candidate cannot upload');assert.equal(hiddenCandidate.scope.stats.disposed,true,'hiding cancels the candidate and releases its scope');assert.equal(r.getRevision().generation,2);
   r.setPageHidden(false);await f.idle(20);assert.equal(f.uploads.length,15,'a cancelled candidate does not resume by itself');assert.equal(r.getRevision().generation,2);
   const resubmitted=await f.prepare(r,[f.component(1)]);f.commit(r,resubmitted,3);f.release(resubmitted);await f.settle(r);f.visible(r);assert.equal(r.getRevision().generation,3);assert.equal(r.getComponent(f.component(1)).objectId,f.component(1).objectId);assert.equal(f.uploads.length,20,'the resubmitted candidate uploads once');
  });
 });
 test(`${provider}: pending and failed uploads block render, capture and picking until a successful new revision`,async()=>{
  const f=familyHarness(provider);await f.environment(async()=>{
   const r=f.create(),row=f.diagnosticComponent(),batch=await f.prepare(r,[row]);f.commit(r,batch,1);f.release(batch);f.attach(r);const snapshot=f.adapters.at(-1).snapshot;
   // HEAD semantics: a capture made while the first upload is pending is blocked (pending), never a ready empty capture.
   assert.deepEqual(snapshot(true),{status:'blocked',pending:true,reason:'geometry-upload-pending'},'the first pending upload blocks capture');assert.equal(r.isPickReady(),false);
   const draws=f.drawVaos.length;f.frameOnly(r);assert.equal(f.drawVaos.length,draws,'a pending upload draws nothing');assert.equal(f.uploads.length,0);
   f.control.failUpload=1;await f.settle(r,()=>!!failureOf(r));assert.match(failureOf(r),/controlled upload failure/);assert.equal(r.stats.geometryPreparation.pending,false,'a terminal upload failure is not retryable preparation');
   const failedCapture=snapshot(true);assert.equal(failedCapture.status,'blocked');assert.equal(failedCapture.pending,false,'a terminal upload failure must not masquerade as retryable preparation');assert.match(failedCapture.reason,/geometry-upload-failed/);assert.equal(r.isPickReady(),false);
   const attempts=f.uploads.length;for(let i=0;i<10;i++)await f.step(r);assert.equal(f.uploads.length,attempts,'failed work is not retried each frame');
   const next=await f.prepare(r,[row]);f.commit(r,next,2);f.release(next);await f.settle(r);f.visible(r);
   assert.equal(r.isPickReady(),true);assert.equal(failureOf(r),undefined);assert.equal(r.stats.mainGeometryProgramFailure,undefined);
  });
 });
 test(`${provider}: preparation getter returns only bounded owner data without work, full stats or timers`,async()=>{
  const f=familyHarness(provider);await f.environment(async()=>{
   const r=f.create(),batch=await f.prepare(r,[f.component(1)]);f.commit(r,batch,1);f.release(batch);f.attach(r);
   // Frames admit the shared upload work; stop with that one job queued (before its timer runs).
   let rows;for(let i=0;i<40;i++){f.frameOnly(r);rows=r.getProgramPreparationStats();if(rows[0].pending===1)break;const next=f.timers.entries().next().value;if(next){f.timers.delete(next[0]);next[1]();}await new Promise(resolve=>setImmediate(resolve));}
   assert.equal(rows[0].pending,1,'one shared preparation job is queued');
   assert(f.repaints>0,'positive control: renderer map repaint requests are observed');
   const queued=f.timers.size,uploads=f.uploads.length,sources=f.sources().length,links=f.links.length,repaints=f.repaints;
   // The getter includes observedAtMs and elapsed pending durations. Hold only this synchronous pair of
   // reads at one instant; keep the entire projection comparison and all no-work assertions.
   const clock=performance,instant=clock.now(),previousNow=Object.getOwnPropertyDescriptor(clock,'now');
   Object.defineProperty(clock,'now',{configurable:true,value:()=>instant});
   try{
    const projected=r.getProgramPreparationStats();assert.equal(projected.length,1);assert.equal(projected[0].provider,provider);assert.equal(projected[0].pending,1);assert.equal(projected[0].context.maxInFlight,2);
    assert.equal(f.timers.size,queued,'the getter queues no timer');assert.equal(f.uploads.length,uploads,'the getter uploads nothing');assert.equal(f.sources().length,sources,'the getter builds no shader source');assert.equal(f.links.length,links);assert.equal(f.repaints,repaints,'the getter requests no map repaint');
    assert(!JSON.stringify(projected).includes('exact S402'));assert.deepEqual(r.getProgramPreparationStats(),projected);
   }finally{if(previousNow)Object.defineProperty(clock,'now',previousNow);else delete clock.now;}
  });
 });

 test(`${provider}: uploaded recovery buffers and an invalid inner frame cannot sign complete-main success`,async()=>{
  const f=familyHarness(provider);await f.environment(async()=>{
   const r=f.create();await publish(f,r,[f.component(1)]);assert.equal(r.stats.contextRecovery.successes,0);
   const uploads=f.uploads.length;f.lose();f.restore();const drawsAtRestore=f.drawVaos.length;assert.equal(r.stats.contextRecovery.pending,true);assert.equal(r.stats.contextRecovery.successes,0);
   // The restoration upload is admitted only by a frame with a finite main view (prepareResidentMain); its
   // timer task then uploads. Stop as soon as the recovery buffers are uploaded, before any further finite
   // frame could draw: from then on only frames with an invalid (empty) main matrix run.
   for(let i=0;i<40&&f.uploads.length<uploads+5;i++){f.frameOnly(r);if(f.uploads.length>=uploads+5)break;const next=f.timers.entries().next().value;if(next){f.timers.delete(next[0]);next[1]();}await new Promise(resolve=>setImmediate(resolve));}
   assert.equal(f.drawVaos.length,drawsAtRestore,'no main draw ran between restoration and the uploaded recovery buffers');
   assert.equal(f.uploads.length,uploads+5,'the recovery buffers are uploaded');assert.equal(r.stats.contextRecovery.successes,0);assert.equal(r.getDrawReadiness().ready,false,'uploaded buffers are not a complete main-frame witness');
   await f.invalidStep(r);await f.invalidStep(r);assert.equal(r.stats.contextRecovery.successes,0);assert.equal(r.stats.contextRecovery.pending,true);assert.equal(r.getDrawReadiness().ready,false);
  });
 });
 test(`${provider}: projected shader failure stays explicit and hidden demand cannot submit stale shader work`,async()=>{
  const f=familyHarness(provider);f.control.sun=true;await f.environment(async()=>{
   const r=f.create(),row=f.component(1);await publish(f,r,[row]);const base=f.shaderOwnership(),uploads=f.uploads.length,isS402=text=>text===S402_SOURCES.vertex||text===S402_SOURCES.fragment;
   r.setSolarShadowBoundary({boundarySHA256:'a'.repeat(64)});assert.equal(r.stats.geometryPreparation.shadowPending,true);
   // A cooperative turn may already submit/link while the demand is visible.
   // Hiding must drain that admitted work without adding any shader submission.
   await f.step(r);const admittedSources=f.sources().length,admittedLinks=f.links.length;
   r.setPageHidden(true);await f.idle(20);assert.equal(f.sources().length,admittedSources,'hidden demand cannot submit another shader source');assert.equal(f.links.length,admittedLinks,'hidden demand cannot link another program');
   const hiddenStats=r.getProgramPreparationStats()[0];assert.equal(hiddenStats.pending,0);assert.equal(hiddenStats.ready,0);assert.equal(r.stats.shadowGPUReady,false);
   const drained=f.shaderOwnership();assert.equal(drained.attachments,0);assert.equal(drained.freed,drained.created);assert.equal(drained.deleteCalls,drained.created,'hidden cancellation retires every admitted shader exactly once');
   r.setPageHidden(false);f.control.failLink=true;r.setSolarShadowBoundary({boundarySHA256:'b'.repeat(64)});
   await stepUntil(f,r,()=>r.stats.shadowFailure===true,'the failed shadow program latches');f.control.failLink=false;
   assert.equal(r.stats.geometryPreparation.shadowPending,false);assert.equal(r.stats.shadowGPUReady,false);assert.equal(f.uploads.length,uploads,'a failed shadow program uploads no shadow index');
   const linked=f.links.length;for(let i=0;i<5;i++)await f.step(r);assert.equal(f.links.length,linked,'the failed shader is latched instead of retried every frame');assert.equal(r.getProgramPreparationStats()[0].failed,1);
   const failed=f.shaderOwnership();assert.deepEqual({created:failed.created-drained.created,deleteMarked:failed.deleteMarked-drained.deleteMarked,freed:failed.freed-drained.freed,attachments:failed.attachments,deleteCalls:failed.deleteCalls-drained.deleteCalls},{created:2,deleteMarked:2,freed:2,attachments:0,deleteCalls:2},'the subsequent failed recipe releases its own two shaders exactly once');
   assert(f.sources().slice(admittedSources).every(isS402),'only the exact S402 shadow recipe was submitted after the hidden drain');assert(base.created<=drained.created);
  });
 });

 test(`${provider}: projected shadow keeps exact S402 recipe, never latches pending as failure and restores bindings`,async()=>{
  const f=familyHarness(provider);f.control.sun=true;await f.environment(async()=>{
   const r=f.create(),row=f.component(1);await publish(f,r,[row]);const uploads=f.uploads.length,sources=f.sources().length,links=f.links.length,base=f.shaderOwnership();
   const previousVao={fixture:'previous vao'},previousArray={fixture:'previous array'};
   r.setSolarShadowBoundary({boundarySHA256:'a'.repeat(64)});assert.equal(r.stats.geometryPreparation.shadowPending,true);assert.equal(r.stats.shadowFailure,false);assert.equal(f.sources().length,sources);assert.equal(f.uploads.length,uploads);
   await f.step(r);assert.equal(f.links.length,links+1);assert.deepEqual(f.sources().slice(sources),[S402_SOURCES.vertex,S402_SOURCES.fragment]);
   assert.equal(r.stats.geometryPreparation.shadowPending,true,'shadow view upload uses the same scheduler');assert.equal(r.stats.shadowFailure,false,'pending is never latched as failure');
   f.gl.bindVertexArray(previousVao);f.gl.bindBuffer(f.gl.ARRAY_BUFFER,previousArray);const attrs=f.attrs.length;
   await stepUntil(f,r,()=>!r.stats.geometryPreparation.shadowPending,'the shadow view publishes');assert.equal(r.stats.shadowGPUReady,true);assert.equal(r.stats.shadowFailure,false);
   const shadowUploads=f.uploads.slice(uploads);assert.deepEqual(kinds(shadowUploads),['Uint32Array:'+row.batches[0].indices.length],'the shadow view uploads only its index subset');assert.deepEqual(shadowUploads[0].values,[...row.batches[0].indices]);
   const shadowVao=f.attrs.slice(attrs).find(entry=>entry.index===4&&entry.size===2)?.vao;assert(shadowVao,'the shadow view VAO');assert.deepEqual(f.layoutAt(shadowVao).map(a=>[a.index,a.size,a.stride,a.offset]),SHADOW_LAYOUT);
   assert.equal(f.gl.getParameter(f.gl.VERTEX_ARRAY_BINDING),previousVao);assert.equal(f.gl.getParameter(f.gl.ARRAY_BUFFER_BINDING),previousArray);
   const owned=f.shaderOwnership();assert.deepEqual({created:owned.created-base.created,deleteMarked:owned.deleteMarked-base.deleteMarked,freed:owned.freed-base.freed,attachments:owned.attachments,deleteCalls:owned.deleteCalls-base.deleteCalls},{created:2,deleteMarked:2,freed:2,attachments:0,deleteCalls:2},'Ready projected program retains its executable with no attached shader backing objects');
   const linked=f.links.length;for(let i=0;i<3;i++)await f.step(r);assert.equal(f.links.length,linked);
   const shadowIndexBuffer=shadowUploads[0].buffer,shadowProgram=f.links[links];assert(shadowProgram,'the linked S402 shadow program');
   r.layer.onRemove({},f.gl);assert.equal(r.stats.shadowGPUReady,false);assert.equal(r.stats.geometryPreparation.shadowPending,false);
   assert(f.deleted.programs.includes(shadowProgram),'removal deletes the shadow program');assert.equal(f.shaderOwnership().attachments,0,'no shader stays attached after removal');
   const shadowViewDeleted=()=>f.deleted.buffers.includes(shadowIndexBuffer)&&!f.buffers.has(shadowIndexBuffer)&&f.deleted.vaos.includes(shadowVao);
   // root500/infill (no recent page cache) delete the released shadow view at once. Bremen's page store keeps released
   // resources in its bounded recent cache; evicting unpinned entries then deletes it, so no live lease still pins it.
   if(provider!=='bremen')assert(shadowViewDeleted(),'removal deletes the shadow index buffer and view VAO');
   f.evictUnpinned();assert(shadowViewDeleted(),'the removed shadow index buffer and view VAO are unleased and deleted on eviction');
  });
 });
  test(`${provider}: GPU readback blocks pending and failed revisions instead of mismatching or overrunning old buffers`,async()=>{
   const f=familyHarness(provider);await f.environment(async()=>{
    const r=f.create(),row=f.diagnosticComponent();await publish(f,r,[row]);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    // Chunk residency: a pending replacement never rewrites the published chunk's CPU or GPU arrays, so the
    // published readback stays consistent (no mismatch, no overrun) and the unpublished candidate is not read.
    const replacement=await f.prepare(r,[row,f.component(2)]);f.commit(r,replacement,2);f.release(replacement);assert.equal(r.isPickReady(),false);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    await f.settle(r);f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    // A pending or failed resident upload exposes no stale buffer and touches no GL.
    f.lose();f.restore();const pending=withoutGL(f,()=>r.readPaintGPUDiagnostic([row]));assert.equal(pending.requested,true);assert.equal(pending.available,false);
    f.control.failUpload=1;await stepUntil(f,r,()=>f.uploadFailures===1,'the resident upload fails');assert.equal(withoutGL(f,()=>r.readPaintGPUDiagnostic([row])).available,false);
    const retry=await f.prepare(r,[row]);f.commit(r,retry,3);f.release(retry);assert.equal(withoutGL(f,()=>r.readPaintGPUDiagnostic([row])).available,false);await f.settle(r,()=>f.residentUploaded(r));f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
   });
  });
  test(`${provider}: GPU readback stays unavailable across cancelled, lost and released revisions until recovery uploads`,async()=>{
   const f=familyHarness(provider);await f.environment(async()=>{
    const r=f.create(),row=f.diagnosticComponent();await publish(f,r,[row]);const blocked=()=>withoutGL(f,()=>r.readPaintGPUDiagnostic([row]));assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    f.lose();f.restore();r.setPageHidden(true);await f.idle(10);assert.equal(blocked().available,false);r.setPageHidden(false);assert.equal(blocked().available,false);await f.settle(r,()=>f.residentUploaded(r));f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    f.lose();await f.idle(10);assert.equal(blocked().available,false);f.restore();assert.equal(blocked().available,false);await f.settle(r,()=>f.residentUploaded(r));f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    r.layer.onRemove({},f.gl);assert.equal(blocked().available,false);r.layer.onAdd({},f.gl);assert.equal(blocked().available,false);await f.settle(r,()=>f.residentUploaded(r));f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
   });
  });
  test(`${provider}: GPU readback preserves empty requests, provider limits, batching and genuine ready errors`,async()=>{
   const f=familyHarness(provider);await f.environment(async()=>{
    const r=f.create(),row=f.diagnosticComponent(),batch=await f.prepare(r,[row]);f.commit(r,batch,1);f.release(batch);f.attach(r);
    assert.deepEqual(withoutGL(f,()=>r.readPaintGPUDiagnostic()),{requested:false,records:[]});assert.deepEqual(withoutGL(f,()=>r.readPaintGPUDiagnostic([])),{requested:false,records:[]});
    const unknown=Array.from({length:provider==='bremen'?128:9},(_,i)=>({objectId:'unknown/'+i,partId:'part'}));
    // Provider limits (as at HEAD): root500 refuses more than 8 identities; infill's own diagnostic helper reads
    // any request in batches of 8; Bremen reads up to 128 and records each unknown identity as not resident.
    const limited=provider==='root500'?/Too many GPU diagnostic identities/:undefined;
    const batchesOf=result=>result.batchCount??result.chunks?.find(row=>row.batchCount!==undefined)?.batchCount;
    if(limited)assert.throws(()=>withoutGL(f,()=>r.readPaintGPUDiagnostic(unknown)),limited);
    else if(provider==='infill'){const result=withoutGL(f,()=>r.readPaintGPUDiagnostic(unknown));assert.equal(result.requested,true);assert.equal(result.available,false);assert.deepEqual(result.records,[]);assert.equal(batchesOf(result),2,'infill reads 9 identities as two batches of its helper');}
    else{const result=withoutGL(f,()=>r.readPaintGPUDiagnostic(unknown));assert.equal(result.requested,true);assert.equal(result.available,false);assert.equal(result.records.length,unknown.length);assert(result.records.every(record=>record.available===false));}
    if(provider==='bremen')assert.throws(()=>withoutGL(f,()=>r.readPaintGPUDiagnostic([...unknown,{objectId:'one-too-many',partId:'part'}])),/Bremen GPU diagnostic request exceeds128 identities/);
    await f.settle(r);f.visible(r);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    if(limited)assert.throws(()=>r.readPaintGPUDiagnostic(unknown),limited);
    else if(provider==='infill'){const result=r.readPaintGPUDiagnostic(unknown);assert.equal(result.requested,true);assert.deepEqual(result.records,[]);assert.equal(batchesOf(result),2);}
    else{const result=r.readPaintGPUDiagnostic(unknown);assert.equal(result.available,false);assert.equal(result.records.length,unknown.length);}
    const batched=r.readPaintGPUDiagnostic([row,{objectId:'unknown/0',partId:'part'}]);assert.equal(batched.requested,true);assert.equal(batched.available,false,'one unknown identity makes the batch unavailable');
    const vertexUpload=f.uploads.find(upload=>upload.data.length===row.batches[0].positions.length/3*9),allocation=f.buffers.get(vertexUpload.buffer);assert(allocation,'the published vertex allocation');
    // Negative controls on the published allocation (same buffer handle): changed GPU contents are exposed as a CPU/GPU
    // mismatch, and a CPU range beyond the actual (shorter) allocation is refused as an overrun.
    f.buffers.set(vertexUpload.buffer,allocation.map(value=>value+1));assert(r.readPaintGPUDiagnostic([row]).records.some(record=>record.packedGeometry?.allValuesMatchCPU===false),'negative control: the readback exposes a CPU/GPU vertex mismatch');
    f.buffers.set(vertexUpload.buffer,allocation.slice(0,allocation.length-9));assert.throws(()=>r.readPaintGPUDiagnostic([row]),/diagnostic (byte range exceeds buffer|range exceeds actual allocation)/,'negative control: a CPU range beyond the actual allocation is refused');
    f.buffers.set(vertexUpload.buffer,allocation);assertReadbackReady(r.readPaintGPUDiagnostic([row]));
    f.buffers.delete(vertexUpload.buffer);assert.throws(()=>r.readPaintGPUDiagnostic([row]),/diagnostic (byte range exceeds buffer|range exceeds actual allocation)|must read an existing allocation/,'ready diagnostics must expose a missing allocation');
   });
  });

}
