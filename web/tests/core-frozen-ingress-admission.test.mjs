import test from 'node:test';
import assert from 'node:assert/strict';
import {leaseRuntime,leasePage,leaseMap,drainedLeases,table,decodedValue,leaseWorkingSet,leasePhases,category,settle,until,deadline,MiB,NORMALIZE_EXPANSION} from './support/core-frozen-fixtures.mjs';

// One lease-store read admits its whole working set at once: the decoded
// expansion and the byte transport's two-copy read envelope for the same read
// (review F2). The claim hands the envelope to the transport in one synchronous
// segment, so it never holds the expansion while the transport waits for
// capacity. A refused admission waits on the ledger's availability holding only
// its queued estimates (ingress-adopt, IA-R2 A class: cases 3 and 4 below are
// the lease-store L1 and L3 contracts). Under scheme H the acquisition then
// settles its value beside the held normalize claim and clones it (leasePhases):
// the least page it completes on is phases.whole. The real lease store, byte
// transport, page store and ledger; only tiny synthetic bytes, network reads
// stay pending until a case settles them.
const api=await leaseRuntime();
const f=table('admission',240),P=f.physical.length,expected=decodedValue(f),phases=leasePhases(f);
const QUEUED=256+512;// a waiting read's binding and shared descriptor estimates
const signal=()=>new AbortController().signal;
const blockerFor=(budget,free)=>budget.reserve({category:'construction',bytes:budget.stats.limitBytes-budget.stats.bytes-free,precision:'estimate',label:'other holder'});

test('a working set above the page limit is refused at once and never reaches the transport',async()=>{
 const resources=leasePage(api,{limitBytes:leaseWorkingSet(f)-1}),m=leaseMap(api,resources,'M',[f]);
 await assert.rejects(deadline(m.client.acquire(m.ref(f),signal()),'an unfit read must not wait'),{name:'ResourceBudgetExceededError'});
 assert.equal(m.network.length,0,'the transport never queued a read');assert.equal(m.leases.stats.reads,0,'refused before any read');
 m.destroy();await drainedLeases(assert,resources,m);
});

// Scheme H (DECISIONS 2026-11-02 08:56) made the read only the first of three
// phases: the whole working set is now the largest of read, settle and clone
// (leasePhases), no longer leaseWorkingSet alone.
test('a page whose limit is exactly the whole working set reads the table',async()=>{
 assert(phases.whole>leaseWorkingSet(f),'precondition: under scheme H the settle or clone phase is the largest');
 const resources=leasePage(api,{limitBytes:phases.whole}),m=leaseMap(api,resources,'M',[f]);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the read is issued');
 assert.equal(resources.budget.stats.bytes,leaseWorkingSet(f),'binding estimate, expansion and the transport envelope, each once');
 m.deliver(f);const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),expected);
 assert.equal(m.leases.stats.capacityWaits,0,'no phase was refused');assert.equal(m.leases.stats.unfit,0);assert.equal(m.network.length,1,'one read');
 lease.release();m.destroy();await drainedLeases(assert,resources,m);
});

// IA-R2 A class (S2 ingress-adopt CDR[1]): replaces "refused at once holding
// nothing" (the pre-ingress-adopt contract) with the lease-store L1 contract.
test('room for the expansion but not the transport envelope: waits holding only its queued estimates, then reads once when room returns',async()=>{
 const resources=leasePage(api,{limitBytes:64*MiB}),m=leaseMap(api,resources,'M',[f]),{budget}=resources;
 // One byte short of the whole read working set; the 13d expansion alone fits.
 const blocker=blockerFor(budget,leaseWorkingSet(f)-1);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.leases.stats.capacityWaits===1,'the refused admission waits');
 for(let i=0;i<6;i++)await settle();
 assert.equal(m.network.length,0,'the transport never queued a read');
 assert.equal(budget.stats.bytes,blocker.bytes+QUEUED,'0 bytes above its queued binding and descriptor estimates while it waits');
 assert.equal(category(budget,'normalize').bytes,0,'the expansion is not held while the envelope waits');assert.equal(category(budget,'read').bytes,0,'nor any envelope');
 assert.equal(m.transport.stats.consumers,0,'the transport holds nothing for it');
 assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');
 blocker.release();
 await until(()=>m.network.length===1,'with room the read is issued');
 assert.deepEqual(category(budget,'read'),{bytes:2*P,exactBytes:0,estimatedBytes:2*P},'the envelope is charged once, by the transport, while the read is in flight');
 assert.equal(category(budget,'normalize').bytes,NORMALIZE_EXPANSION*f.d.bytes,'the expansion was admitted before the read');
 m.deliver(f);const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),expected);
 assert.equal(m.network.length,1,'read exactly once');assert.equal(m.leases.stats.reads,1);assert.equal(m.leases.stats.capacityWaits,1);
 lease.release();m.destroy();await drainedLeases(assert,resources,m);
});

// IA-R2 A class (S2 ingress-adopt CDR[1]): the hand-off that returned the
// envelope inside a wake wave no longer exists (the claim hands its envelope to
// the transport's caller-admitted read); replaced by the lease-store L3 contract.
test('a synchronous wake-wave reserver gets nothing before delivery and only the envelope minus the delivered response at delivery',async()=>{
 const resources=leasePage(api,{limitBytes:64*MiB}),m=leaseMap(api,resources,'M',[f]),{budget}=resources;
 const blocker=blockerFor(budget,leaseWorkingSet(f));
 // A listener that synchronously takes every free byte in the first availability wave.
 let grabbed;const stop=budget.onAvailable(()=>{if(!grabbed)grabbed=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate',label:'greedy wake-wave reserver'});});
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the read is issued at once');
 assert.equal(grabbed,undefined,'no wave before delivery: nothing is returned at the hand-off');
 assert.equal(budget.stats.bytes,budget.stats.limitBytes,'the page is exactly full: claim and transport entry list one envelope');
 m.deliver(f);
 await until(()=>grabbed!==undefined,'delivery frees the envelope beyond the response');
 stop();
 assert.equal(grabbed.bytes,2*P-P,'the reserver got exactly the envelope minus the delivered response D=P');
 // Scheme H: the settle beside the held normalize claim then needs E-d more than
 // the parse claim; with the reserver keeping D the page lacks it, so the read
 // waits holding only its queued estimates, and later reads again, admitting
 // that settle with its read.
 await until(()=>m.leases.stats.capacityWaits===1,'the settle waits for capacity');
 for(let i=0;i<6;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes+grabbed.bytes+QUEUED,'it waits holding only its queued estimates');
 grabbed.release();blocker.release();
 await until(()=>m.network.length===2,'with room it reads again');m.deliver(f);
 const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),expected);
 assert.equal(m.leases.stats.capacityWaits,1,'the second attempt was admitted with its settle');assert.equal(m.leases.stats.unfit,0);
 lease.release();m.destroy();await drainedLeases(assert,resources,m);
});

test('a legacy reader keeps its one pre-charged admission and never sees a transport envelope',async()=>{
 const resources=leasePage(api,{limitBytes:64*MiB}),m=leaseMap(api,resources,'M',[f],{reader:'legacy'}),{budget}=resources;
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the legacy read is issued');
 assert.deepEqual(category(budget,'read'),{bytes:P,exactBytes:P,estimatedBytes:0},'only the physical bytes are pre-charged');
 m.deliver(f);const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),expected);
 lease.release();m.destroy();await drainedLeases(assert,resources,m);
});
