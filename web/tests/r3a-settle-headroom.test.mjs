import test from 'node:test';
import assert from 'node:assert/strict';
import {leaseRuntime,leasePage,leaseMap,drainedLeases,table,decodedValue,leaseWorkingSet,leasePhases,valueEstimate,category,settle,until,deadline,MiB,NORMALIZE_EXPANSION,CLONE_HOLD_EXPANSION} from './support/core-frozen-fixtures.mjs';

// Stage 3 round 3 (src-r3a). Scheme H (DECISIONS 2026-11-02 08:56) settles the
// decoded value beside the clone hold; since round 4 (DECISIONS 22:19) that is
// S = 10d + 2E (the held normalize, the value and the first clone's room),
// 2E - 4d more than the parse claim (inflate d + 13d). A refused settle returns everything and waits
// holding only the queued estimates; its next attempt then admits that settle
// with its read (production.settleBytes), so once admitted it never has to grow
// after the read, and a holder that takes every byte the read frees cannot send
// it back for another read. The real lease store, byte transport, page store
// and ledger; tiny synthetic tables; network reads stay pending until settled.
const api=await leaseRuntime();
const signal=()=>new AbortController().signal;
const QUEUED=256+512;
/** A synchronous availability listener taking every free byte of each wave
 * while the read is in its read phase (a read or inflate buffer is charged). */
function thief(budget){
 const taken=[];let total=0;
 const reading=()=>(budget.stats.categories.read?.bytes??0)+(budget.stats.categories.inflate?.bytes??0)>0;
 const off=budget.onAvailable(()=>{if(!reading())return;const bytes=budget.stats.availableBytes;if(bytes>0){taken.push(budget.reserve({category:'construction',bytes,precision:'estimate',label:'r3a wake-wave reserver'}));total+=bytes;}});
 return{get bytes(){return total;},release(){off();for(const r of taken)r.release();taken.length=0;}};
}

for(const reader of ['transport','legacy']){
 test(`${reader} reader: a settle refused once is admitted with the next read; the retry never grows after its read`,async()=>{
  const f=table('r3a-headroom-'+reader,240),{d,P,E,S}=leasePhases(f),K=NORMALIZE_EXPANSION,H=CLONE_HOLD_EXPANSION,expected=decodedValue(f);
  const resources=leasePage(api,{limitBytes:64*MiB}),{budget}=resources,m=leaseMap(api,resources,'M',[f],{reader});
  // The read's own working set: binding, expansion and the 2P envelope (transport) or P pre-charge (legacy).
  const read=reader==='transport'?leaseWorkingSet(f):256+d+K*d+P;
  assert.equal(S,H*d+2*E);
  assert(S-(d+K*d)>0,'precondition: the settle beside the clone hold needs more than the parse claim');
  // 1. Room for the read only; a reserver keeps every byte the read frees: the settle is refused.
  const blocker=budget.reserve({category:'construction',bytes:budget.stats.limitBytes-read,precision:'estimate',label:'other holder'});
  const first=thief(budget);
  const pending=m.client.acquire(m.ref(f),signal());
  await until(()=>m.network.length===1,'the first read starts');m.deliver(f);
  await until(()=>m.leases.stats.capacityWaits===1,'its settle is refused and waits');
  for(let i=0;i<4;i++)await settle();
  assert.equal(m.leases.stats.parses,1,'the first attempt parsed');
  assert.equal(first.bytes,reader==='transport'?2*P:P,'the reserver kept every byte the first read freed');
  assert.equal(budget.stats.bytes,blocker.bytes+first.bytes+QUEUED,'it waits holding only its queued estimates');
  // 2. Room for exactly the retry's admission (its read plus the settle
  // headroom); a new reserver again takes every byte the read frees. An
  // evictable holder of E - 256 (what a clone without its room would grow by)
  // is released only by a refused binding (clone) admission: the settle gets no
  // outside room, and the clone, which takes the room its settle held, never
  // needs it.
  const retry=256+S+(reader==='transport'?P:0),clone=E-256;
  first.release();blocker.adjust({category:'construction',bytes:budget.stats.limitBytes-retry-clone,precision:'estimate'});
  const evictable=budget.reserve({category:'construction',bytes:clone,precision:'estimate',label:'r3a evictable holder'});
  const evictions=[];const offPressure=budget.onPressure(pressure=>{evictions.push(pressure.label);if(String(pressure.label).includes('frozen-binding-v2'))evictable.release();});
  assert.equal(budget.stats.availableBytes,retry-QUEUED,'exactly the retry admission is free');
  const second=thief(budget);
  await until(()=>m.network.length===2,'the retry reads');
  assert.equal(budget.stats.bytes-blocker.bytes-evictable.bytes,retry,'the retry admitted its read with the settle it needs: 256 + 10d + 2E (+ P beside the envelope)');
  assert.equal(category(budget,'metadata').bytes-256,S-K*d-d-P,'its headroom tops the delivered claim up to the settle');
  m.deliver(f);
  const lease=await deadline(pending,'the retry completes although every byte its read freed was taken');
  assert.deepEqual(lease.borrow(value=>value),expected);
  // The headroom absorbs the response at inflation: only the envelope's second copy (P) is freed.
  assert.equal(second.bytes,reader==='transport'?P:0,'the reserver took every byte the retry\'s read freed');
  assert.equal(m.leases.stats.capacityWaits,1,'the retry was never refused');assert.equal(m.network.length,2,'one re-read at most');assert.equal(m.leases.stats.unfit,0);
  assert.equal(category(budget,'normalize').bytes,0,'the clone hold was returned');
  assert(!evictions.some(label=>String(label).includes('frozen-json-v2')),'the retry\'s settle was never refused: '+JSON.stringify(evictions));
  assert.equal(evictable.active,true,'the clone took the room its settle held: it grew nothing and evicted nothing');
  assert(!evictions.some(label=>String(label).includes('frozen-binding-v2')),'the clone was never refused');
  offPressure();lease.release();second.release();evictable.release();blocker.release();m.destroy();await drainedLeases(assert,resources,m);
 });
}

test('a first attempt admits no headroom: its working set is the read alone',async()=>{
 const f=table('r3a-first',240),resources=leasePage(api,{limitBytes:64*MiB}),{budget}=resources,m=leaseMap(api,resources,'M',[f]);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the read starts');
 assert.equal(budget.stats.bytes,leaseWorkingSet(f),'binding, expansion and envelope only');
 m.deliver(f);(await deadline(pending)).release();m.destroy();await drainedLeases(assert,resources,m);
});

test('a page that fits the read but never the settle reports the table as not fitting after one parse',async()=>{
 const f=table('r3a-unfit-settle',240),phases=leasePhases(f);
 assert(phases.settle>phases.read,'precondition');
 const resources=leasePage(api,{limitBytes:phases.settle-1}),m=leaseMap(api,resources,'M',[f]);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the read fits and starts');m.deliver(f);
 await assert.rejects(deadline(pending,'an unfit settle must not wait'),{name:'ResourceBudgetExceededError'});
 assert.equal(m.leases.stats.unfit,1);assert.equal(m.leases.stats.capacityWaits,0);assert.equal(m.network.length,1);
 m.destroy();await drainedLeases(assert,resources,m);
});

// Review R3A-3 (src-r3a-fix). A decoded value is checked against its private
// clone (2E + 10d since round 4, the bindings' own unfit check) before it
// settles. Before R3A-3, two tables on a page that fit each settle but no clone
// waited on each other's queued estimates forever; since round 4 the settle
// holds the first clone's room (256 + 10d + 2E, above the clone), so a page
// that fits a settle always fits its first clone, and a page below the clone
// reports the table as not fitting at its first parse, before its settle.
test('a page that fits the read but never the private clone reports the table as not fitting at its first parse',async()=>{
 const f=table('r3a-unfit-clone',240),phases=leasePhases(f);
 assert(phases.settle===phases.clone+256,'the settle holds the first clone\'s room');
 assert(phases.read<phases.clone,'precondition');
 const resources=leasePage(api,{limitBytes:phases.clone-1}),{budget}=resources,m=leaseMap(api,resources,'M',[f]);
 const refused=[];const off=budget.onPressure(pressure=>refused.push(String(pressure.label)));
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.network.length===1,'the read fits and starts');m.deliver(f);
 await assert.rejects(deadline(pending,'an unfit clone must not wait'),error=>error.name==='ResourceBudgetExceededError'&&/^frozen private clone does not fit/.test(error.label)&&error.required===phases.clone);
 assert.equal(m.leases.stats.unfit,1);assert.equal(m.leases.stats.capacityWaits,0);assert.equal(m.network.length,1);assert.equal(m.leases.stats.parses,1);
 assert.deepEqual(refused.filter(label=>/frozen-(json|binding)-v2/.test(label)),[],'neither its settle nor a clone was refused: it was reported before either');
 off();m.destroy();await drainedLeases(assert,resources,m);
});

test('two tables on a page that fits each read but no private clone are both reported as not fitting, never waiting on each other',async()=>{
 const a=table('r3a-pair-a',240),b=table('r3a-pair-b',240),pa=leasePhases(a),pb=leasePhases(b);
 // Below both clones, above each read beside the other table's queued estimates (768).
 const limitBytes=Math.min(pa.clone,pb.clone)-1;
 assert(limitBytes>=Math.max(pa.read,pb.read)+768,'precondition: each read fits beside the other\'s queued estimates');
 const resources=leasePage(api,{limitBytes}),m=leaseMap(api,resources,'M',[a,b]);
 const outcome={};
 const pending=[a,b].map((f,i)=>m.client.acquire(m.ref(f),signal()).then(lease=>{outcome[i]='ok';lease.release();},error=>{outcome[i]=error?.name;}));
 const remaining=new Map([[a.path,a],[b.path,b]]);
 while(remaining.size){
  await until(()=>m.pending().length>0,'the next table to start its one read');
  const [path]=m.pending();
  assert(remaining.has(path),'each table reads once, with no unexpected resource');
  m.deliver(remaining.get(path));
  remaining.delete(path);
 }
 await deadline(Promise.all(pending),'both tables must settle: an unfit clone is reported, never waited for');
 assert.deepEqual(outcome,{0:'ResourceBudgetExceededError',1:'ResourceBudgetExceededError'});
 assert.equal(m.network.length,2,'one read each, never a re-read');assert.equal(m.leases.stats.unfit,2);
 m.destroy();await drainedLeases(assert,resources,m);
});

test('the desktop ledger defaults to decimal 1.5 GB and mobile defaults to 512 MiB with the original recent subsets',()=>{
 const desktop=api.createResourceBudget(),explicit=api.createResourceBudget({profile:'desktop'}),mobile=api.createResourceBudget({profile:'mobile'});
 assert.equal(desktop.stats.limitBytes,1_500_000_000);assert.equal(explicit.stats.limitBytes,1_500_000_000);assert.equal(desktop.stats.recentLimitBytes,32*MiB);
 assert.equal(mobile.stats.limitBytes,512*MiB);assert.equal(mobile.stats.recentLimitBytes,16*MiB);
 assert.equal(api.createResourceBudget({limitBytes:512*MiB}).stats.limitBytes,512*MiB,'an explicit limit still wins');
 assert.equal(valueEstimate(new TextEncoder().encode('[]')),32,'fixture estimator is the real one');
});
