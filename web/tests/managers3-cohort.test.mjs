// managers-3 (DECISIONS 2026-11-02 07:49, IA-R1 (b) and compositor F1, manager
// side): the real managers read their selected sources through the real shared
// native source pool on the real page ledger and chunk store. A lineage-A
// cohort never holds a ready source while one of its own sources waits for
// capacity: it returns its whole batch, waits holding nothing outside the
// visible preparation gate and reads again. Its ready, unpublished sources are
// page-level reclaimable by another admission. An abort leaks nothing.
// detailDemandHeld reads true exactly while every pending load is parked on a
// page-ledger wake. Only reads (a controllable network), the renderer and
// imported planners are fixtures (managers-stage2 harness). No product data,
// browser or GPU.
import test from 'node:test';
import assert from 'node:assert/strict';
import {shard,network,cohortManager,until,outcome,tick} from './support/managers3-fixtures.mjs';

const cities={root500:'berlin',infill:'frankfurt',bremen:'bremen',tier300:'berlin',church:'berlin',delegated500:'berlin'};
const settle=async(turns=40)=>{for(let i=0;i<turns;i++)await tick();};
/** Starts 3D on a page with two selected leaves. `block`:
 * 'after-first-admitted': once the first leaf's working set is admitted and its
 *  read waits on the network, a page holder takes every free byte, so only the
 *  cohort's own ready first leaf could make room for the second one;
 * 'before': a page holder leaves only the queued estimates free, so both leaves
 *  park for capacity before either is ready. */
async function blockedCohort(provider,{block='after-first-admitted',...options}={}){
 const city=cities[provider],a=shard('a',{city,fixture:true}),b=shard('b',{city});
 const m=cohortManager(provider,[a,b],options),{budget,net}=m,base=budget.stats.bytes,listeners=budget.stats.availabilityListeners;
 let blocker;
 if(block==='before')blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-64*1024,precision:'estimate',label:'managers3 page holder'});
 const run=m.manager.requestMode('3d',new AbortController().signal);void run.catch(()=>{});
 if(block==='after-first-admitted'){
  await until(()=>net.pending(a.leaf.path).length===1,'first leaf reads');
  assert.equal(net.pending(b.leaf.path).length,0,'one ingress slot: the second leaf is queued holding its estimate');
  blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate',label:'managers3 page holder'});
  net.deliver(a.leaf.path,a.bytes);
 }
 return{...m,a,b,run,blocker,base,listeners};
}
/** Delivers every read the cohort asks for until the request settles. */
async function finish(m){
 const {net,a,b}=m;
 for(let round=0;round<40&&await outcome(m.run,2)==='pending';round++){for(const leaf of [a,b])if(net.pending(leaf.leaf.path).length)net.deliver(leaf.leaf.path,leaf.bytes);await settle(10);}
 const state=await m.run;assert.equal(state.mode,'3d');assert.equal(m.manager.mode,'3d');assert.equal(m.states.at(-1).status,'ready');
}

for(const provider of ['root500','infill','bremen','tier300'])test(provider+': a ready source is returned with its whole cohort while the other source lacks capacity, and the retry after room returns succeeds',async()=>{
 const m=await blockedCohort(provider);const {budget,net,pool,manager,a,b,blocker,base}=m;
 await until(()=>pool.stats.cohortWaits===1,'the cohort returns its batch and waits');await settle();
 assert.equal(pool.stats.cohortYields,1,'one whole-batch return');assert.ok(pool.stats.cohortReturnedBytes>0,'the ready first leaf was part of it');
 // Holding nothing: the ledger charges only the page holder (and what was charged before the request).
 assert.equal(budget.stats.bytes,blocker.bytes+base,'neither leaf, nor any queued estimate, stays charged while the cohort waits');
 assert.equal(pool.stats.holders,0,'no native source lease is held');assert.equal(pool.stats.entries,0,'no decoded canonical value is retained');
 assert.equal(pool.stats.cohorts,0,'the waiting cohort is no longer registered as taking');
 const diagnostic=pool.stats,ledgerBefore=JSON.stringify(budget.stats),witnessBefore=JSON.stringify(diagnostic.retryWaitDiagnostics);
 assert.equal(diagnostic.retryWaitingCount,1);assert.equal(diagnostic.retryWaitDiagnostics.length,1);
 const witness=diagnostic.retryWaitDiagnostics[0];
 assert(witness.checks>0);assert(witness.requiredBytes>witness.availableWithRecentBytes);
 witness.requiredBytes=-1;
 assert.equal(JSON.stringify(pool.stats.retryWaitDiagnostics),witnessBefore,'snapshot mutation cannot alter the current retry witness');
 assert.equal(JSON.stringify(budget.stats),ledgerBefore,'reading diagnostics does not change capacity or wake work');
 assert.equal(m.gate.idle,true,'the wait is outside the visible preparation gate');
 assert.equal(net.pending().length,0,'no read is in flight');assert.equal(await outcome(m.run),'pending','the request is still valid and waits');
 assert.equal(manager.detailDemandPending,true);assert.equal(manager.detailDemandHeld,true,'parked on a page-ledger wake: the compositor may report budgetWaiting');
 const repaints=m.counts.repaints;
 blocker.release();
 await until(()=>net.pending(a.leaf.path).length===1,'the cohort reads again after room returns');
 assert.equal(manager.detailDemandHeld,false,'reading again is network work, not a parked wait');
 assert.ok(m.counts.repaints>repaints,'the manager repaints once its reported parked wait ends');
 await finish(m);
 assert.equal(pool.stats.cohortYields,1,'no further return once the batch fits');assert.equal(pool.stats.cohorts,0);
 assert.deepEqual(net.reads.map(row=>row.target),[a.leaf.path,a.leaf.path,b.leaf.path],'the returned leaf is read again, the refused one once');
 assert.equal(manager.detailDemandPending,false);assert.equal(manager.detailDemandHeld,false);
 manager.destroy();
});

test('control: without the cohort the ready source stays held while the other one waits for capacity (the hold-and-wait IA-R1 removes)',async()=>{
 const m=await blockedCohort('root500',{net:network(),withoutCohort:true});const {budget,pool,manager,blocker,base}=m;
 await until(()=>pool.stats.parkedSources===1,'the second leaf parks');await settle(80);
 assert.equal(pool.stats.cohortYields,0);assert.ok(budget.stats.bytes>blocker.bytes+base,'the first leaf stays charged beside the waiting second leaf');
 assert.ok(pool.stats.holders>0,'its lease is held');
 manager.destroy();await settle();
 assert.equal(budget.stats.bytes,blocker.bytes+base);blocker.release();
});

for(const provider of ['root500','tier300'])test(provider+': a page admission the cohort can cover reclaims its ready, unpublished source for a waiting holder; the cohort then reads again and completes',async()=>{
 const city='berlin',a=shard('a',{city,fixture:true}),b=shard('b',{city});
 const m={...cohortManager(provider,[a,b]),a,b},{budget,net,pool,manager}=m,base=budget.stats.bytes;
 m.run=manager.requestMode('3d',new AbortController().signal);void m.run.catch(()=>{});
 await until(()=>net.pending(a.leaf.path).length===1,'first leaf reads');net.deliver(a.leaf.path,a.bytes);
 // The second leaf's working set is admitted and its read waits on the network: the cohort holds the ready first leaf.
 await until(()=>net.pending(b.leaf.path).length===1,'second leaf reads');await settle();
 assert.equal(pool.stats.cohorts,1,'the cohort is registered while it takes its sources');
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate',label:'managers3 page holder'});
 // Another holder needs a little more than the page has free and waits for
 // availability: what the cohort's ready leaf returns covers it.
 // Pressure callbacks may reclaim synchronously. Own the first successful
 // reservation exactly once, whether admission finishes now or on a later wave.
 const request=()=>budget.tryReserve({category:'construction',bytes:64,precision:'estimate',label:'managers3 foreign admission'});
 const initial=request();let foreign=initial.ok?initial.reservation:undefined;
 const off=budget.onAvailable(()=>{if(foreign)return;const next=request();if(next.ok)foreign=next.reservation;});
 await until(()=>foreign!==undefined&&pool.stats.cohortWaits>=1,'the reclaimed batch admits the waiting holder');off();
 assert.equal(pool.stats.cohortReclaims,1,'reclaimed by the other admission');assert.ok(pool.stats.cohortYields>=1);
 const first=net.reads.find(row=>row.target===b.leaf.path);assert.equal(first.signal.aborted,true,"the second leaf's read was cancelled with its batch");
 assert.equal(manager.mode,'2d','nothing was published from the returned batch');
 foreign.release();blocker.release();
 await finish(m);
 manager.destroy();
});

for(const provider of ['root500','tier300'])test(provider+': detailDemandHeld is true only while every unready source of the read is parked for capacity, and false again once a read is back on the network',async()=>{
 const m=await blockedCohort(provider,{block:'before'});const {pool,manager,blocker}=m;
 await until(()=>pool.stats.parkedSources===2,'both leaves park');await settle();
 assert.equal(pool.stats.cohortYields,0,'nothing is ready, so no cohort has anything to return');
 assert.equal(manager.detailDemandPending,true);assert.equal(manager.detailDemandHeld,true);
 blocker.release();
 await until(()=>m.net.pending(m.a.leaf.path).length===1,'the first leaf reads');
 assert.equal(manager.detailDemandHeld,false,'a read on the network is not parked');
 await finish(m);
 assert.equal(manager.detailDemandPending,false);assert.equal(manager.detailDemandHeld,false);
 manager.destroy();
});

for(const provider of ['root500','tier300'])for(const where of ['after-first-admitted','before'])test(provider+': aborting the request ('+(where==='before'?'both leaves parked':'cohort waiting for its batch')+') leaks no charge, lease, registration or wake-up',async()=>{
 const m=await blockedCohort(provider,{block:where});const {budget,pool,manager,blocker,base,listeners}=m;
 if(where==='before')await until(()=>pool.stats.parkedSources===2,'both leaves park');
 else await until(()=>pool.stats.cohortWaits===1,'the cohort waits');
 await settle();
 const leaving=manager.requestMode('2d',new AbortController().signal);
 assert.equal(await outcome(m.run),'rejected:AbortError','the 3D request ends with the abort');await leaving;await settle();
 assert.equal(budget.stats.bytes,blocker.bytes+base,'nothing of the batch stays charged');
 assert.equal(pool.stats.holders,0);assert.equal(pool.stats.entries,0);assert.equal(pool.stats.cohorts,0,'no cohort stays registered');assert.equal(pool.stats.parkedSources,0,'no source stays parked');
 assert.equal(pool.stats.retryWaitingCount,0);assert.deepEqual(pool.stats.retryWaitDiagnostics,[],'abort releases diagnostic witnesses');
 assert.equal(budget.stats.availabilityListeners,listeners,'no availability registration is left behind');
 assert.equal(manager.detailDemandPending,false);assert.equal(manager.detailDemandHeld,false);assert.equal(m.gate.idle,true);
 blocker.release();manager.destroy();
});

test('tier300: queued preparation behind capacity-parked sources reports held demand and cancels without retained resources',async()=>{
 const leaves=Array.from({length:6},(_,i)=>shard('queued-'+i,{fixture:i===0}));
 const m=cohortManager('tier300',leaves),{manager,budget,pool}=m;
 const base=budget.stats.bytes,listeners=budget.stats.availabilityListeners;
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-64*1024,precision:'estimate',label:'queued preparation capacity fixture'});
 const run=manager.requestMode('3d',new AbortController().signal);void run.catch(()=>{});
 try{
  await until(()=>pool.stats.parkedSources===2,'two active preparations park while the others stay queued');await settle();
  assert.equal(pool.stats.parkedSources,2);
  assert.equal(manager.detailDemandPending,true);assert.equal(manager.detailDemandHeld,true);
  await manager.requestMode('2d',new AbortController().signal);
  assert.equal(await outcome(run),'rejected:AbortError');await settle();
  assert.equal(budget.stats.bytes,blocker.bytes+base);
  assert.equal(pool.stats.holders,0);assert.equal(pool.stats.entries,0);assert.equal(pool.stats.parkedSources,0);
  assert.equal(pool.stats.cohorts,0);assert.equal(pool.stats.retryWaitingCount,0);
  assert.equal(budget.stats.availabilityListeners,listeners);
  assert.equal(manager.detailDemandPending,false);assert.equal(manager.detailDemandHeld,false);assert.equal(m.gate.idle,true);
 }finally{blocker.release();manager.destroy();}
});
