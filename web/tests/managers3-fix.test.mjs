// managers-3-fix: the independent review of managers-3 (R1-R4). On the real
// shared native source pool, page ledger and chunk store, and on real managers
// (managers-stage2 harness):
// R1 a reclaimed cohort whose reclaimer was served by the batch's own release
//    wave, before the cohort registered its wait, reads again with no later
//    release; a batch refused for its own source right after a wait that ended
//    at registration waits for a wave unless the level rose since (no read loop);
// R2 a manager that reported detailDemandHeld repaints once when a parked pool
//    source wakes up, not only when its parked registration is removed;
// R3 a cohort whose sources are all ready is settled and never reclaimed;
// R4 a source not read through the native client (a building-detail source) is
//    recognized by its label: its refusal is the cohort's own, not a reclaim.
// No product data, browser or GPU.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {shard,network,cohortManager,until,outcome,tick} from './support/managers3-fixtures.mjs';

const web=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const MiB=1024**2;
function poolPage({limitBytes=64*MiB}={}){
 const runtime=createRuntimeLoader(web),page=runtime.createPageResources({limitBytes});
 const native=runtime.load(path.join(web,'src/safety/shared-native-source.ts'));
 const net=network(),pool=native.createSharedNativeSourcePool({read:net.read,resourceStore:page.store});
 return{budget:page.budget,pool,client:pool.client('berlin')};
}
const settle=async(turns=30)=>{for(let i=0;i<turns;i++)await tick();};
const estimate=(bytes,label)=>({category:'construction',bytes,precision:'estimate',label});

test('R1: a reclaimed cohort whose reclaimer was served by the release wave reads again with no later release',async()=>{
 const {budget,pool,client}=poolPage();
 // The cohort's ready, unpublished source (4 MiB) and its in-flight working set.
 let ready=budget.reserve(estimate(4*MiB,'managers3-fix cohort ready source'));const inflight=budget.reserve(estimate(2*MiB,'managers3-fix cohort in flight'));
 const cohort=client.cohort(),request=new AbortController();
 const attempt=cohort.attempt({held:()=>ready?4*MiB:0,pending:()=>[{label:'managers3-fix source still read'}]},request.signal);
 const blocker=budget.reserve(estimate(budget.stats.availableBytes,'managers3-fix holder'));
 // The manager returns its batch as its read unwinds, a few turns after the yield (its finally).
 attempt.signal.addEventListener('abort',()=>{queueMicrotask(()=>{const r=ready;ready=undefined;r?.release();inflight.release();});});
 let foreign;const off=budget.onAvailable(()=>{if(foreign)return;const next=budget.tryReserve(estimate(MiB,'managers3-fix reclaimer'));if(next.ok)foreign=next.reservation;});
 assert.equal(budget.tryReserve(estimate(MiB,'managers3-fix reclaimer')).ok,false,'refused: the cohort is reclaimed');
 await settle(20);off();
 assert.ok(foreign,'the reclaimer was served by the release wave, before the cohort registers');
 const reason=attempt.signal.reason;assert.equal(reason.reclaimed,true);assert.equal(pool.stats.cohortReclaims,1);
 const before=budget.stats;assert.ok(before.availableBytes+before.recentBytes>=reason.requiredBytes,'room is present as the cohort registers');
 const waiting=cohort.retry(reason,request.signal);
 assert.equal(await outcome(waiting,10),'fulfilled','no later release is needed: room present at registration ends the wait');
 assert.equal(cohort.waiting,false);
 request.abort();foreign.release();blocker.release();client.destroy();pool.destroy();
});

test('R1: refused for its own source right after a wait that ended at registration, a batch waits for a wave unless the level rose (no read loop)',async()=>{
 const {budget,pool,client}=poolPage(),listeners=budget.stats.availabilityListeners;
 const label='managers3-fix own source',held=4*MiB,cohort=client.cohort();
 const side=budget.reserve(estimate(8*MiB,'managers3-fix side holder'));
 /** One attempt refused for its own source on a full page; the page holder is released again before the retry registers. */
 async function refusedOnce(){
  const request=new AbortController(),attempt=cohort.attempt({held:()=>held,pending:()=>[{label}]},request.signal);
  const blocker=budget.reserve(estimate(budget.stats.availableBytes,'managers3-fix page holder'));
  assert.equal(budget.tryReserve(estimate(MiB,label),{label}).ok,false);
  assert.equal(attempt.yielded,true,'its own refusal returns the batch');const reason=attempt.signal.reason;
  assert.equal(reason.reclaimed,false);assert.equal(reason.requiredBytes,held+MiB,'ready bytes plus the refused need');
  blocker.release();return{request,reason};
 }
 const first=await refusedOnce();
 assert.equal(await outcome(cohort.retry(first.reason,first.request.signal),5),'fulfilled','room present at registration');
 // Same page level again: as if the batch's estimate were short, it reads no more in a loop and waits for a wave.
 const second=await refusedOnce(),waiting=cohort.retry(second.reason,second.request.signal);
 assert.equal(await outcome(waiting,30),'pending','no rise since the last registration: wait for a wave');
 assert.equal(budget.stats.availabilityListeners,listeners+1,'one availability registration');
 side.release();
 assert.equal(await outcome(waiting,10),'fulfilled','the next wave ends it');
 // A level that rose before the registration (a release no later wave reports) ends it at registration.
 const side2=budget.reserve(estimate(8*MiB,'managers3-fix side holder'));
 const third=await refusedOnce();assert.equal(await outcome(cohort.retry(third.reason,third.request.signal),5),'fulfilled');
 const fourth=await refusedOnce();side2.release();
 assert.equal(await outcome(cohort.retry(fourth.reason,fourth.request.signal),5),'fulfilled','the level rose since the last registration');
 assert.equal(budget.stats.availabilityListeners,listeners,'no availability registration is left behind');
 for(const row of [first,second,third,fourth])row.request.abort();client.destroy();pool.destroy();
});

test('R3: a cohort whose sources are all ready is settled: never reclaimed in the turns before its close()',async()=>{
 const {budget,pool,client}=poolPage();
 let pending=[{label:'managers3-fix last source'}];
 const cohort=client.cohort(),request=new AbortController(),attempt=cohort.attempt({held:()=>4*MiB,pending:()=>pending},request.signal);
 const blocker=budget.reserve(estimate(budget.stats.availableBytes,'managers3-fix holder'));
 pending=[];// the last source is ready; the manager has not run its continuation yet
 assert.equal(budget.tryReserve(estimate(MiB,'managers3-fix foreign admission')).ok,false);
 assert.equal(attempt.yielded,false,'a settled batch is about to publish: it is not reclaimed');assert.equal(attempt.signal.aborted,false);
 assert.equal(pool.stats.cohortReclaims,0);assert.equal(pool.stats.cohortReturnedBytes,0,'no bytes are counted as returned');
 assert.equal(pool.stats.cohorts,0,'settled cohorts leave the registry');
 attempt.close();blocker.release();client.destroy();pool.destroy();
});

test('R4: a source the cohort reads outside the native client is recognized by its label: its refusal returns the batch, it is not a reclaim',async()=>{
 const {budget,pool,client}=poolPage(),label='["provider-source-owner-v1","owner","detail-source"]';
 const run=(items)=>{const cohort=client.cohort(),request=new AbortController(),attempt=cohort.attempt({held:()=>4*MiB,pending:()=>items},request.signal);return{cohort,request,attempt};};
 const own=run([{label}]);
 const blocker=budget.reserve(estimate(budget.stats.availableBytes,'managers3-fix holder'));
 assert.equal(budget.tryReserve(estimate(MiB,label),{label}).ok,false);
 assert.equal(own.attempt.yielded,true);assert.equal(own.attempt.signal.reason.reclaimed,false,'its own source: the batch is returned for ready bytes plus the need');
 assert.equal(own.attempt.signal.reason.requiredBytes,4*MiB+MiB);
 own.request.abort();blocker.release();
 // Unlabelled (before the fix): the same refusal reads as another admission and reclaims the batch.
 const foreign=run([{label:'managers3-fix unrelated source'}]);
 const blocker2=budget.reserve(estimate(budget.stats.availableBytes,'managers3-fix holder'));
 assert.equal(budget.tryReserve(estimate(MiB,label),{label}).ok,false);
 assert.equal(foreign.attempt.signal.reason.reclaimed,true);
 foreign.request.abort();blocker2.release();
 assert.equal(pool.stats.cohorts,0);assert.equal(pool.stats.parkedSources,0);client.destroy();pool.destroy();
});

for(const provider of ['root500','infill','tier300','church'])test('R2 '+provider+': after detailDemandHeld read true, a parked source waking up repaints the map once',async()=>{
 const city=provider==='infill'?'frankfurt':'berlin',a=shard('a',{city,fixture:true}),b=shard('b',{city});
 const m=cohortManager(provider,[a,b]),{budget,net,pool,manager}=m;
 const blocker=budget.reserve(estimate(budget.stats.availableBytes-64*1024,'managers3-fix page holder'));
 const run=manager.requestMode('3d',new AbortController().signal);void run.catch(()=>{});
 await until(()=>pool.stats.parkedSources===2,'both leaves park');await settle(40);
 assert.equal(manager.detailDemandHeld,true,'every unready source is parked');
 const repaints=m.counts.repaints;
 blocker.release();
 await until(()=>net.pending(a.leaf.path).length===1,'the first leaf reads');await settle(5);
 assert.equal(manager.detailDemandHeld,false);assert.equal(manager.detailDemandPending,true);
 assert.ok(m.counts.repaints>repaints,'the wake-up repaints, so the compositor does not wait on a silent frame loop');
 manager.destroy();await settle(5);
});
