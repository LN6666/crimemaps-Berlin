// Infill main-mask preparation after WebGL context recovery (R4 F2-residency
// CDR[4] second half). The resident and a same-plan replay candidate both run
// main-material-mask work for the same plan and stamp. The page program owner
// supersedes work by resource name across revisions, so a shared name made the
// two callers cancel each other's queued or ready work every frame: the replay
// candidate stayed pending (mainRequiredCount 0, mainReady false) and never
// converged. The role in the resource name keeps the two preparations apart.
import assert from 'node:assert/strict';
import test from 'node:test';
import {residencyFixture,component} from './fixtures/painted-residency-harness.mjs';

const sha='b'.repeat(64);
const shadowFor=rows=>({verifiedBoundarySHA256:sha,profile:{schema_version:1,city:'leipzig',source_boundary_sha256:sha,status:'display-schematic',includes_growth_zero_to_one:true,swept_bbox_actual_city_covered:true,fixed_vector:[1,1]},components:[{...rows[0],triangleCount:19}]});

function infillFixture(){
 const h=residencyFixture('infill');
 h.overrideDependency('./owner-f018-completion',{infillProgressiveObjectDemand(rows){return rows.map(({city,objectId,partId})=>({city,objectId,partId}));}});
 return h;
}
// Pending and last work diagnostics are the renderer's own observable names.
function observeMaskWork(r,seen){const stats=r.getProgramPreparationStats()[0];for(const name of JSON.stringify([stats.pendingResources,stats.last]).match(/main-material-masks:[^"]*/g)??[])seen.add(name);}
const settled=r=>{const state=r.stats.geometryPreparation;if(state.candidateFailure)throw Error('Candidate did not publish: '+state.candidateFailure);return !state.pending&&!state.candidatePending;};

// extraFrames 0 is the colliding case (fails with one shared name); 3 is the
// control where the resident masks finish before the replay is committed.
for(const extraFrames of [0,3])test(`infill replay candidate committed ${extraFrames} frame(s) after context recovery publishes instead of cancelling the resident mask work`,async()=>{
 const h=infillFixture();
 await h.environment(async()=>{
  const r=h.create(),rows=[component(1,true)],b=await h.prepareBatch(r,rows),shadow=shadowFor(rows);
  h.commit(r,b,1,shadow);r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  const before=r.stats.geometryPreparation;assert.equal(before.candidatePending,false);assert.equal(before.uploaded,true);
  h.handlers.get('webglcontextlost')();h.handlers.get('webglcontextrestored')();
  // Recovery is only uploaded here: the resident main masks are still
  // unprepared when the replay arrives, which is the colliding state.
  await h.settle(r,()=>r.stats.geometryPreparation.uploaded);
  for(let i=0;i<extraFrames;i++){h.frame(r,true);h.tick();}
  h.commit(r,b,2,shadow);
  await h.settle(r);
  const after=r.stats.geometryPreparation;
  assert.equal(after.candidatePending,false,'the replay candidate publishes within the bounded settle');
  assert.equal(after.candidateFailure,undefined);
  assert.equal(after.pending,false);
  const diagnostic=r.getReadinessDiagnostic();
  assert.equal(diagnostic.candidate,undefined,'no candidate remains pending');
  assert.equal(diagnostic.geometryResources.main.publishedGeneration,2,'generation 2 is the published geometry');
  // The resident main draw re-prepares for the published generation on the next frame.
  h.frame(r,true);h.tick();
  assert.deepEqual(r.getDrawReadiness(),{ready:true,preparing:false},'the resident draw path is ready again after the publication');
  b.scope.release();r.setBatches([],3);r.destroy();
 });
});

test('infill resident and candidate main-mask work use distinct resource names for the same plan and stamp',async()=>{
 const h=infillFixture();
 await h.environment(async()=>{
  const r=h.create(),rows=[component(1,true)],b=await h.prepareBatch(r,rows),shadow=shadowFor(rows);
  h.commit(r,b,1,shadow);r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  h.handlers.get('webglcontextlost')();h.handlers.get('webglcontextrestored')();
  await h.settle(r,()=>r.stats.geometryPreparation.uploaded);
  const seen=new Set();h.commit(r,b,2,shadow);
  await h.settle(r,()=>{observeMaskWork(r,seen);return settled(r);});
  const names=[...seen],resident=names.filter(name=>name.startsWith('main-material-masks:resident:')),candidate=names.filter(name=>name.startsWith('main-material-masks:candidate:'));
  assert.equal(resident.length+candidate.length,names.length,'every main-mask work name carries its role: '+names.join(', '));
  assert(resident.length>0,'the recovering resident prepares its masks during the replay');
  assert(candidate.length>0,'the replay candidate prepares its own masks');
  for(const name of candidate)assert(!resident.includes(name),'resident and candidate never share one superseding name');
  // Same plan and stamp: only the role separates the two names.
  assert.deepEqual(new Set(candidate.map(name=>name.slice('main-material-masks:candidate:'.length))),new Set(resident.map(name=>name.slice('main-material-masks:resident:'.length))));
  b.scope.release();r.setBatches([],3);r.destroy();
 });
});
