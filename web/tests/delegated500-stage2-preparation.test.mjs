import test from 'node:test';
import assert from 'node:assert/strict';
import {delegatedPreflightFixture} from './support/fixtures-renderer-leftovers-delegated.mjs';
// delegated500 batch preparation over the flattened production factory in its
// chunk-construction form (support/fixtures-renderer-leftovers-delegated.mjs:
// production prepareBatches/setBatches, page ledger admission of the material
// source text, the construction's production context.schedule and the pending
// batch pump; material data, CPU packing and publication are the fixture's
// recorded boundaries, and its cleanup checks every claim and scope pin).
// - (DECISIONS 02:20 (a)) A request is checked against setBatches' complete
//   generation guard and the in-flight preparation's generation before it
//   supersedes anything: an older request reserves nothing and newer valid work
//   (in flight, queued, or an unpublished candidate) still publishes.
// - (02:20 (b)) A source failure of the construction is cached outside the
//   material state until setMaterialSourceBuilder: a later request is rejected
//   with it before any admission or build.
// - (sweep uncovered[30] (1)) A source-context run that retires the candidate's
//   material claim leaves no unbudgeted text in its kept snapshot.
const tokenNames=['F004_TOKEN645','F269_TOKEN640','F285_TOKEN634','F235_TOKEN631','F244_TOKEN627','F244_TOKEN622','F244_TOKEN619','F358_TOKEN604','F238_BODY595_GLSL','F358_NORMAL579_TOKEN','F346_ANNEX562_CLIP','F346_ANNEX562_GLSL','F355_HIP559_CLIP'];
const fixtureSource=tokenNames.join('|')+'|?f238Body595(|s166|repairs';
const packedFields=['published','generation','indices','loaded','solarShadowAdmittedKeys','rathausProxyMasks','cityPaintFragment','cityPaintFragmentBytes','materialSourceSettled','materialRecipeRevision','materialSourceWorkRevision','residentDataPlan','publishedDataPlan','sceneChunks','sceneSpans','residentChunkInput'];
const fixture=(t,city='berlin')=>delegatedPreflightFixture(t,city,{fixtureSource,tokenNames,packedFields});
async function finish(f,cell=f.scheduler.cells.at(-1)){const running=f.scheduler.run(cell);f.scheduler.open(cell);assert.equal(await running,true);f.consume();}
const bytes=f=>f.store.budget.stats.bytes;

test('an older request leaves the in-flight preparation alone: it reserves nothing and the newer generation still publishes',async t=>{
 const f=await fixture(t),latest=f.args('latest',7);await f.queue(latest);f.prepare();
 const cell=f.scheduler.cells.at(-1),cells=f.scheduler.cells.length,held=bytes(f);
 await assert.rejects(f.queue(f.args('older',6)),/Invalid generation/);
 assert.equal(f.scheduler.cells.length,cells,'the older request registers no construction');assert.equal(bytes(f),held,'and reserves no source text');
 assert.equal(cell.descriptor.current(),true,'the in-flight construction is still current');
 await finish(f,cell);f.publication();assert.deepEqual(f.calls,[latest]);assert.equal(f.builds.length,1);
});

test('an older request leaves queued and unpublished newer work alone; an equal generation still supersedes it',async t=>{
 const f=await fixture(t),latest=f.args('latest',7);await f.queue(latest);f.prepare();await finish(f);
 const candidate=f.ctx.pendingGeometry;assert(candidate,'the newer candidate is unpublished');assert.equal(candidate.state.generation,7);
 await assert.rejects(f.queue(f.args('older',6)),/Invalid generation/);
 assert.equal(f.ctx.pendingGeometry,candidate,'the unpublished candidate survives');assert.equal(candidate.closed,false);
 f.publication();assert.deepEqual(f.calls,[latest],'and it is what publishes');
 // A request of the same generation is the normal supersession (a newer view of that generation).
 const g=await fixture(t),first=g.args('first',7),again=g.args('again',7);await g.queue(first);g.prepare();const old=g.scheduler.cells.at(-1);
 await g.queue(again);assert.equal(old.descriptor.current(),false,'an equal generation supersedes');await finish(g);g.publication();assert.deepEqual(g.calls,[again]);
});

test('a cached construction source failure rejects the next request before any admission or build; a recipe reset clears it',async t=>{
 const f=await fixture(t),error=Error('controlled source failure');let attempts=0;
 f.replaceSource(()=>{attempts++;throw error;});await f.queue(f.args());const running=f.scheduler.run();f.scheduler.open();await assert.rejects(running,failure=>failure===error);
 assert.equal(attempts,1);assert.match(f.ctx.batchPreparationFailure,/controlled source failure/);assert.equal(f.ctx.candidateFailureGeneration,6);
 assert.deepEqual(f.ctx.getDrawReadiness().failure,String(error).slice(0,512),'readiness reports the batch failure');
 const cells=f.scheduler.cells.length,held=bytes(f);
 for(const label of ['again','later']){await assert.rejects(f.queue(f.args(label,label==='again'?6:8)),failure=>failure===error);}
 assert.equal(attempts,1,'the failed builder is not run again');assert.equal(f.scheduler.cells.length,cells,'no construction is registered');assert.equal(bytes(f),held,'no source text is reserved');
 f.replaceSource();await f.queue(f.args('retry',8));f.prepare();await finish(f);f.publication();assert.equal(f.calls.length,1,'after the reset the next request builds and publishes');
});

test('an abort, a pending or a lost context is not cached as a source failure',async t=>{
 for(const kind of ['abort','pending','lost']){
  const f=await fixture(t);let attempts=0;
  f.replaceSource(()=>{attempts++;if(kind==='lost'){f.ctx.gl.isContextLost=()=>true;throw Error('context lost while building');}if(kind==='abort')throw new DOMException('Aborted','AbortError');throw new f.ctx.ProgramPreparationPending('lost');});
  await f.queue(f.args());const running=f.scheduler.run();f.scheduler.open();await running.catch(()=>{});
  if(kind==='lost')f.ctx.gl.isContextLost=()=>false;
  assert.equal(attempts,1);assert.equal(f.ctx.constructionSourceFailure,undefined,kind+' is not a cached source failure');assert.equal(f.ctx.batchPreparationFailure,undefined,kind+' records no batch failure');
  f.replaceSource();await f.queue(f.args('next',7));f.prepare();await finish(f);f.publication();assert.equal(f.calls.length,1,kind+': the next request builds');
 }
});

test('a source-context run that returns the candidate material claim leaves no unbudgeted text in its kept snapshot',async t=>{
 for(const transition of ['hide','destroy','lifecycle']){
  const f=await fixture(t);await f.queue(f.args());f.prepare();await finish(f);
  const candidate=f.ctx.pendingGeometry,material=candidate.state.material;
  assert(material.cityPaintFragment,'the candidate keeps its built material text');assert.equal(material.cityPaintFragmentClaim?.active,true,'under its live claim');
  const claimBytes=material.cityPaintFragmentClaim.bytes,before=bytes(f);
  // hide and destroy are the production transitions; 'lifecycle' changes the
  // resident lifecycle inside the run while the candidate stays open.
  f.ctx.withSourceContext(candidate.preparedData,material.materialRecipeRevision,()=>{if(transition==='hide')f.ctx.setPageHidden(true);else if(transition==='destroy')f.ctx.destroy();else f.ctx.residentLifecycleRevision++;});
  const kept=candidate.state.material;
  assert.equal(kept.cityPaintFragmentClaim?.active??false,false,transition+': the claim is returned');
  assert.equal(kept.cityPaintFragment,'',transition+': no text stays without its claim');assert.equal(kept.cityPaintFragmentBytes,0);
  assert(bytes(f)<=before-claimBytes,transition+': the ledger no longer holds the text: '+(before-bytes(f))+' of '+claimBytes+' B returned');
 }
});
