import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Pure helper contract only. The compositor's actual capture/receiver wiring
// requires its own integration evidence; these fixtures do not supply that.
const repo=fileURLToPath(new URL('../..',import.meta.url));
const require=createRequire(path.join(repo,'web/package.json'));
const {build}=require('esbuild');
const output=await build({stdin:{contents:"export * from './safety/scene-solar-coverage-epoch';",
 resolveDir:path.join(repo,'web/src'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {createSceneSolarCoverageEpoch}=await import('data:text/javascript;base64,'+
 Buffer.from(output.outputFiles[0].contents).toString('base64'));

const PROVIDERS=['root500','delegated500'];
const LEAF=[0,0,0,1,1,1];
const bounds=upper=>[-1,0,-1,upper,upper,upper];
function input({contextKey='context-1',upper=4,stamp=1,sourceRevision=1}={}){
 return {contextKey,rawResidentCoverage:{kind:'unforced-resident',revision:`source-${sourceRevision}`,
  confirmedRevision:`source-${sourceRevision}`,bounds:[-1,0,-1,1,1,1],triangles:20,draws:2,complete:true},
  providers:PROVIDERS.map((provider,index)=>({provider,requestRevision:stamp,readyRequestRevision:stamp,
   generation:stamp,readyGeneration:stamp,pending:false,canonical:index===0
    ?{kind:'bounds',generation:stamp,bounds:[0,0,0,upper,upper,upper]}
    :{kind:'empty',generation:stamp}}))};
}
function acknowledge(value,epochId,providers=PROVIDERS){
 const next=structuredClone(value);
 for(const provider of next.providers)if(providers.includes(provider.provider))provider.ack={
  contextKey:next.contextKey,epochId,requestRevision:provider.requestRevision,generation:provider.generation};
 return next;
}
function published(value,plan,override={}){
 return {...structuredClone(value),publishedCapture:{kind:'published-capture',contextKey:value.contextKey,
  revision:plan.revision,bounds:[...plan.bounds],complete:true,...override}};
}
function establish(helper,value=input()){
 const baseline=acknowledge(value,0),before=helper.observe(baseline);
 assert.equal(before.epochId,undefined,'raw/canonical evidence alone must not establish an epoch');
 assert.equal(before.needsRefresh,false);
 const witness=helper.capturePlan();
 assert.equal(witness?.kind,'witness','canonical baseline must have a witness path before any epoch');
 assert.equal(witness.epochId,0);
 const witnessed=published(baseline,witness),state=helper.observe(witnessed);
 assert(Number.isSafeInteger(state.epochId)&&state.epochId>0);
 assert.equal(state.needsRefresh,true);
 assert.equal(state.capturePending,true,'new epoch must be acknowledged by the whole cohort');
 assert.equal(state.receiverReady,false,'the witness is not publication of the new epoch capture');
 return {value:witnessed,epochId:state.epochId};
}
function settle(helper,value,epochId){
 const acknowledged=acknowledge(value,epochId),before=helper.observe(acknowledged);
 assert.equal(before.needsRefresh,false);
 assert.equal(before.receiverReady,false,'an old witness cannot make the new epoch receiver ready');
 const plan=helper.capturePlan();
 assert.equal(plan?.kind,'epoch');
 assert.equal(plan.epochId,epochId);
 const next=published(acknowledged,plan),state=helper.observe(next);
 assert.equal(state.receiverReady,true);
 assert.equal(state.capturePending,false);
 assert.equal(state.needsRefresh,false);
 return {value:next,state,plan};
}

test('epoch admission requires exact published witness and a new epoch capture before receiver readiness',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),baseline=acknowledge(input(),0);
 const noAck=helper.observe(input());
 assert.equal(noAck.epochId,undefined);
 assert.equal(noAck.receiverReady,false);
 assert.equal(helper.capturePlan(),undefined,'missing baseline acknowledgements cannot schedule a witness');
 helper.observe(baseline);
 const witness=helper.capturePlan();
 assert.equal(witness?.kind,'witness');
 assert.deepEqual(witness.bounds,bounds(4));
 for(const invalid of [
  {contextKey:'old-context'},
  {revision:'old-source-and-provider-stamp'},
  {bounds:[0,0,0,0,0,0]},
  {complete:false},
 ]){
  const state=helper.observe(published(baseline,witness,invalid));
  assert.equal(state.epochId,undefined);
  assert.equal(state.needsRefresh,false);
  assert.equal(state.receiverReady,false);
  assert.equal(helper.projectionFor(LEAF),undefined);
 }
 const {value,epochId}=establish(helper,baseline);
 assert.deepEqual(helper.projectionFor(LEAF),{epochId,bounds:bounds(4)});
 const repeated=helper.observe(value);
 assert.equal(repeated.epochId,epochId);
 assert.equal(repeated.needsRefresh,false,'one published witness emits one refresh event');
 assert.equal(helper.capturePlan(),undefined,'baseline epoch-0 acknowledgements do not settle the new epoch');
 const ready=settle(helper,value,epochId);
 assert.equal(typeof ready.plan.revision,'string');
 assert(ready.plan.revision.length>0);
});

test('grow and shrink require cohort rejudgement while forced old witness bounds never become the new candidate',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS);
 let current=establish(helper);
 let ready=settle(helper,current.value,current.epochId);
 for(const [upper,stamp] of [[10,2],[2,3]]){
  const previousEpoch=current.epochId;
  const candidate=acknowledge(input({upper,stamp,sourceRevision:stamp}),previousEpoch);
  const before=helper.observe(candidate);
  assert.equal(before.needsRefresh,false,'changed raw/canonical bounds still need actual witness publication');
  const witness=helper.capturePlan();
  assert.equal(witness?.kind,'witness');
  assert.equal(witness.epochId,previousEpoch);
  assert.deepEqual(witness.bounds,bounds(10),'the shrink witness must still cover the old larger epoch');
  const witnessed=published(candidate,witness),changed=helper.observe(witnessed);
  assert(changed.epochId>previousEpoch);
  assert.equal(changed.needsRefresh,true);
  assert.equal(changed.capturePending,true);
  assert.equal(changed.receiverReady,false);
  assert.deepEqual(helper.projectionFor(LEAF),{epochId:changed.epochId,bounds:bounds(upper)},
   'epoch must use unforced candidate bounds, not the deliberately larger published witness');
  const oneProvider=acknowledge(witnessed,changed.epochId,[PROVIDERS[0]]);
  const partial=helper.observe(oneProvider);
  assert.equal(partial.capturePending,true);
  assert.equal(partial.needsRefresh,false);
  assert.equal(helper.capturePlan(),undefined);
  assert.equal(helper.observe(oneProvider).needsRefresh,false,'pending acknowledgement must not loop refresh');
  current={value:witnessed,epochId:changed.epochId};
  ready=settle(helper,current.value,current.epochId);
  assert.deepEqual(ready.plan.bounds,bounds(upper));
 }
 assert.deepEqual(ready.plan.bounds,bounds(2));
});

test('missing actual evidence and generation mismatches withdraw projection without inventing an empty shrink',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),created=establish(helper);
 let ready=settle(helper,created.value,created.epochId);
 const invalids=[];
 let broken=structuredClone(ready.value);broken.providers.pop();invalids.push(broken);
 broken=structuredClone(ready.value);delete broken.providers[1].canonical;invalids.push(broken);
 broken=structuredClone(ready.value);broken.providers[0].canonical.generation++;invalids.push(broken);
 broken=structuredClone(ready.value);broken.rawResidentCoverage.confirmedRevision='different-after-read';invalids.push(broken);
 broken=structuredClone(ready.value);broken.rawResidentCoverage.complete=false;invalids.push(broken);
 broken=structuredClone(ready.value);broken.rawResidentCoverage.kind='forced-old-epoch';invalids.push(broken);
 for(const invalid of invalids){
  const state=helper.observe(invalid);
  assert.equal(state.needsRefresh,false);
  assert.equal(state.capturePending,true);
  assert.equal(state.receiverReady,false);
  assert.equal(helper.projectionFor(LEAF),undefined,'unknown coverage must not reuse old large projection bounds');
  assert.equal(helper.capturePlan(),undefined);
  const recovered=helper.observe(ready.value);
  assert.equal(recovered.epochId,created.epochId,'temporary missing proof must not allocate an empty epoch');
  assert.equal(recovered.needsRefresh,false);
  assert.equal(recovered.receiverReady,false,'a withdrawn plan needs a new exact published capture receipt');
  const plan=helper.capturePlan();
  assert.equal(plan?.kind,'epoch');
  assert.equal(plan.epochId,created.epochId);
  ready={value:published(ready.value,plan),plan};
  assert.equal(helper.observe(ready.value).receiverReady,true);
 }
});

test('late readiness and stale acknowledgements cannot settle the current ticket or cause repeated refresh',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),created=establish(helper);
 const ready=settle(helper,created.value,created.epochId);
 const pending=structuredClone(ready.value),provider=pending.providers[0];
 provider.requestRevision=2;provider.generation=2;provider.canonical.generation=2;provider.pending=true;
 let state=helper.observe(pending);
 assert.equal(state.capturePending,true);
 assert.equal(state.receiverReady,false);
 assert.equal(state.needsRefresh,false);
 assert.deepEqual(helper.projectionFor(LEAF),{epochId:created.epochId,bounds:bounds(4)},
  'valid current canonical bounds remain usable during ordinary same-epoch rejudgement');
 assert.equal(helper.capturePlan(),undefined);
 // The old asynchronous callback has completed, but readyRequestRevision and
 // readyGeneration are still 1 while the current manager ticket is 2.
 const late=structuredClone(pending);late.providers[0].pending=false;
 state=helper.observe(late);
 assert.equal(state.capturePending,true);
 assert.equal(state.needsRefresh,false);
 assert.equal(helper.capturePlan(),undefined);
 const fresh=structuredClone(late);
 fresh.providers[0].readyRequestRevision=2;fresh.providers[0].readyGeneration=2;
 state=helper.observe(fresh);
 assert.equal(state.epochId,created.epochId,'same geometry bounds do not create another coverage epoch');
 assert.equal(state.needsRefresh,false);
 assert.equal(state.capturePending,true,'the old acknowledgement still identifies ticket/generation 1');
 assert.equal(helper.capturePlan(),undefined);
 const acknowledged=acknowledge(fresh,created.epochId);
 state=helper.observe(acknowledged);
 assert.equal(state.receiverReady,false,'the prior capture proof is bound to the old provider stamps');
 const plan=helper.capturePlan();
 assert.equal(plan?.kind,'epoch');
 assert.notEqual(plan.revision,ready.plan.revision);
 state=helper.observe(published(acknowledged,plan));
 assert.equal(state.receiverReady,true);
 assert.equal(state.needsRefresh,false);
});

test('reset and context replacement discard old proofs and acknowledgements without reusing epoch IDs',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),created=establish(helper);
 const ready=settle(helper,created.value,created.epochId);
 // The owner uses this same reset boundary for 2D, destroy, and context loss.
 // This checks only the helper, not that those compositor hooks are installed.
 helper.reset();
 assert.equal(helper.projectionFor(LEAF),undefined);
 assert.equal(helper.capturePlan(),undefined);
 const other=acknowledge(input({contextKey:'context-2',upper:2}),0);
 other.publishedCapture=structuredClone(ready.value.publishedCapture);
 let state=helper.observe(other);
 assert.equal(state.epochId,undefined);
 assert.equal(state.needsRefresh,false);
 assert.equal(state.receiverReady,false);
 assert.equal(helper.projectionFor(LEAF),undefined);
 const witness=helper.capturePlan();
 assert.equal(witness?.kind,'witness','a new context can bootstrap from its canonical baseline');
 const witnessed=published(other,witness);
 state=helper.observe(witnessed);
 assert(state.epochId>created.epochId);
 const newEpoch=state.epochId,wrongContextAck=acknowledge(witnessed,newEpoch);
 for(const provider of wrongContextAck.providers)provider.ack.contextKey='context-1';
 state=helper.observe(wrongContextAck);
 assert.equal(state.capturePending,true);
 assert.equal(helper.capturePlan(),undefined);
 settle(helper,witnessed,newEpoch);
 const unknownContext=input({contextKey:'context-3'});
 unknownContext.rawResidentCoverage.complete=false;
 state=helper.observe(unknownContext);
 assert.equal(state.capturePending,true);
 assert.equal(state.receiverReady,false);
 assert.equal(helper.projectionFor(LEAF),undefined);
 assert.equal(helper.capturePlan(),undefined);
 helper.reset();helper.reset();
 assert.equal(helper.projectionFor(LEAF),undefined);
 assert.equal(helper.capturePlan(),undefined);
});

test('explicit publication revocation blocks receiver until a new current capture receipt without refreshing the epoch',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),created=establish(helper);
 const ready=settle(helper,created.value,created.epochId),plan=helper.capturePlan();
 assert.equal(helper.state.receiverReady,true);
 assert.equal(plan?.kind,'epoch');
 const projection=helper.projectionFor(LEAF);
 // A real undefined publication callback must also discard its queued prior
 // receipt. This pure fixture checks the helper contract, not the GL callback.
 const withoutProof=structuredClone(ready.value);
 delete withoutProof.publishedCapture;
 helper.revokePublication();
 assert.equal(helper.state.receiverReady,false,'pending/failure/release withdraws receiver publication immediately');
 assert.equal(helper.state.epochId,created.epochId);
 assert.equal(helper.state.needsRefresh,false);
 assert.equal(helper.state.capturePending,false,'the current capture plan remains available');
 assert.strictEqual(helper.capturePlan(),plan);
 assert.deepEqual(helper.projectionFor(LEAF),projection);
 for(let repeat=0;repeat<2;repeat++){
  const state=helper.observe(withoutProof);
  assert.equal(state.receiverReady,false,'absence of a new publication event cannot resurrect the historical proof');
  assert.equal(state.epochId,created.epochId);
  assert.equal(state.needsRefresh,false);
  assert.strictEqual(helper.capturePlan(),plan);
  helper.revokePublication();
  assert.equal(helper.state.receiverReady,false,'repeated withdrawal is idempotent');
  assert.equal(helper.state.needsRefresh,false);
  assert.strictEqual(helper.capturePlan(),plan);
 }
 // This is the next current capture publication event. Do not reuse ready.value,
 // which carries the historical receipt invalidated by the undefined callback.
 const nextPublication=published(withoutProof,helper.capturePlan());
 assert.notStrictEqual(nextPublication.publishedCapture,ready.value.publishedCapture);
 const restored=helper.observe(nextPublication);
 assert.equal(restored.receiverReady,true);
 assert.equal(restored.epochId,created.epochId);
 assert.equal(restored.needsRefresh,false);
 assert.equal(restored.capturePending,false);
 assert.strictEqual(helper.capturePlan(),plan);
});

test('withdrawing unavailable resident observation blocks projection and capture without losing the established epoch',()=>{
 const helper=createSceneSolarCoverageEpoch(PROVIDERS),created=establish(helper);
 const ready=settle(helper,created.value,created.epochId),oldPlan=helper.capturePlan();
 assert.equal(helper.state.receiverReady,true);
 const withdrawn=helper.withdrawObservation();
 assert.equal(withdrawn.epochId,created.epochId);
 assert.equal(withdrawn.needsRefresh,false);
 assert.equal(withdrawn.capturePending,true);
 assert.equal(withdrawn.receiverReady,false);
 assert.equal(helper.projectionFor(LEAF),undefined);
 assert.equal(helper.capturePlan(),undefined);
 const repeated=helper.withdrawObservation();
 assert.equal(repeated.epochId,created.epochId);
 assert.equal(repeated.needsRefresh,false);
 const withoutProof=structuredClone(ready.value);
 delete withoutProof.publishedCapture;
 const restoredObservation=helper.observe(withoutProof);
 assert.equal(restoredObservation.epochId,created.epochId,'same complete evidence does not create another epoch');
 assert.equal(restoredObservation.needsRefresh,false);
 assert.equal(restoredObservation.receiverReady,false);
 assert.deepEqual(helper.projectionFor(LEAF),{epochId:created.epochId,bounds:bounds(4)});
 const currentPlan=helper.capturePlan();
 assert.equal(currentPlan?.kind,'epoch');
 assert.notEqual(currentPlan.revision,oldPlan.revision,'withdrawal invalidates the issued capture observation');
 const stale=helper.observe({...withoutProof,publishedCapture:ready.value.publishedCapture});
 assert.equal(stale.receiverReady,false,'the withdrawn historical publication cannot restore a receiver');
 assert.equal(stale.needsRefresh,false);
 // Represents the next actual publication event for the newly issued plan;
 // no GL callback or native capture is exercised by this pure helper fixture.
 const publishedNow=helper.observe(published(withoutProof,currentPlan));
 assert.equal(publishedNow.receiverReady,true);
 assert.equal(publishedNow.epochId,created.epochId);
 assert.equal(publishedNow.needsRefresh,false);
});
