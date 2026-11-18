import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptRuntime,page,blockerFor,rowTable,leaseNeed,frozenMap,drained,until,deadline,settle} from './support/ingress-adopt-fixtures.mjs';
import {NORMALIZE_EXPANSION,CLONE_HOLD_EXPANSION} from './support/core-frozen-fixtures.mjs';

// followups (DECISIONS 2026-11-02 08:56): the calibrated 13x normalize
// expansion and the clone phase, scheme H; since round 4 (DECISIONS 22:19) the
// clone hold keeps 10 d (FROZEN_CLONE_HOLD_EXPANSION) and the first clone's
// room E from the settle on. The real frozen lease store, page
// store, ledger and byte transport of one or two maps; network reads stay
// pending until a case delivers them. A test-only import wrapper observes the
// actual JSON clone entry and then calls its unchanged production body, so each
// case reads the ledger while that clone runs. Only tiny synthetic tables.
const api=await adoptRuntime({observeFrozenClone:true});
const signal=()=>new AbortController().signal;
const decoded=f=>JSON.parse(new TextDecoder().decode(f.raw));
const zero={bytes:0,exactBytes:0,estimatedBytes:0};
const category=(budget,name)=>({...(budget.stats.categories[name]??zero)}).bytes;
const valueBytes=f=>api.estimateRetainedBuildingPayload(decoded(f)).retainedPayloadEstimateBytes;
const normalizeOf=f=>NORMALIZE_EXPANSION*f.d.bytes;
/** What the clone hold keeps from the settle through the clones. */
const holdOf=f=>CLONE_HOLD_EXPANSION*f.d.bytes;

/** Records the page ledger at every actual private clone of a fixture table. */
function cloneSpy(t,budget){
 const key=Symbol.for('crimemaps.test.frozenClone'),original=globalThis[key],seen=[];
 globalThis[key]=value=>{
  if(value&&typeof value==='object'&&typeof value.name==='string'&&value.name.startsWith('fu-'))seen.push({name:value.name,bytes:budget.stats.bytes,normalize:category(budget,'normalize'),inflate:category(budget,'inflate'),read:category(budget,'read'),metadata:category(budget,'metadata')});
 };
 t.after(()=>{if(original===undefined)delete globalThis[key];else globalThis[key]=original;});
 return seen;
}

test('the lease store exports the calibrated normalize expansion (13, provisional)',()=>{
 assert.equal(NORMALIZE_EXPANSION,13);
});

test('the lease store exports the clone hold expansion (10, DECISIONS 2026-11-02 22:19)',()=>{
 assert.equal(CLONE_HOLD_EXPANSION,10);
 assert(CLONE_HOLD_EXPANSION<NORMALIZE_EXPANSION,'the hold is below the parse claim it replaces');
});

test('one map: the normalize claim stays charged after the decoded value settles, through its binding clone, and leaves with it',async t=>{
 const resources=page(api),{budget}=resources,f=rowTable('fu-one',240),m=frozenMap(api,resources,'M',{tables:[f]}),E=valueBytes(f),seen=cloneSpy(t,budget);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.net.reads.length===1,'the read starts');
 assert.equal(category(budget,'normalize'),normalizeOf(f),'the read admits the 13x expansion');
 m.deliver(f);const lease=await deadline(pending);
 assert.equal(seen.length,1,'one private clone');
 const [clone]=seen;
 assert.equal(clone.inflate+clone.read,0,'the decoded value had settled: its read and inflated buffers were returned');
 assert.equal(clone.normalize,holdOf(f),'scheme H: the held normalize (10 d) is still charged while the clone runs');
 assert.equal(clone.metadata,2*E,'the shared value and the clone charge (which took the room its settle held)');
 assert.equal(clone.bytes,2*E+holdOf(f),'the whole clone-phase ledger: 2E plus the held expansion');
 await settle();
 assert.equal(category(budget,'normalize'),0,'the held claim left with the last clone');
 assert.equal(budget.stats.bytes,E,'only the private value stays charged');
 assert.equal(m.leases.stats.cloneHoldMisses,0,'the held claim was admitted (same identity as the read claim)');
 assert.deepEqual(lease.borrow(value=>value),decoded(f));
 lease.release();m.destroy();await drained(assert,resources,[m]);
});

test('two maps clone one decoded value: one held claim covers both clones and returns after the last one',async t=>{
 const resources=page(api),{budget}=resources,f=rowTable('fu-two',240),a=frozenMap(api,resources,'A',{tables:[f]}),b=frozenMap(api,resources,'B',{tables:[f]}),E=valueBytes(f),seen=cloneSpy(t,budget);
 const pa=a.client.acquire(a.ref(f),signal()),pb=b.client.acquire(b.ref(f),signal());
 await until(()=>a.net.reads.length===1,'map A reads the shared table');
 assert.equal(b.net.reads.length,0,'map B joins the page-wide ingress');
 a.deliver(f);
 const [one,two]=await deadline(Promise.all([pa,pb]));
 assert.deepEqual([a.leases.stats.reads+b.leases.stats.reads,a.leases.stats.parses+b.leases.stats.parses],[1,1],'one read, one parse');
 assert.equal(seen.length,2,'each map clones the one decoded value');
 for(const [i,clone]of seen.entries()){
  assert.equal(clone.normalize,holdOf(f),'clone '+i+': one page-wide held expansion, not one per map');
  assert.equal(clone.inflate+clone.read,0,'clone '+i+': after the decoded value settled');
 }
 assert.equal(seen[0].bytes,2*E+holdOf(f)+256,'first clone: shared value, its clone (the room), the held expansion and the other binding estimate');
 assert.equal(seen[1].bytes,3*E+holdOf(f),'second clone: the first private value stays, the held expansion still covers this clone');
 await settle();
 assert.equal(category(budget,'normalize'),0,'returned after the last clone');
 assert.equal(budget.stats.bytes,2*E,'two private values');
 one.borrow(value=>{value.rows[0].v='mutated by A';});
 assert.deepEqual(two.borrow(value=>value),decoded(f),'the maps own separate values');
 one.release();two.release();a.destroy();b.destroy();await drained(assert,resources,[a,b]);
});

test('a refused clone returns the held expansion with its parent before it waits, and completes once room returns',async t=>{
 const resources=page(api),{budget}=resources,f=rowTable('fu-refused',240),E=valueBytes(f),H=holdOf(f);
 // Two maps on one table. Map A's clone takes the room the decoded value
 // settled beside; map B's clone needs E - 256 more and lacks one byte.
 const room=3*E+H-1;
 assert(room>=Math.max(leaseNeed(f),256+H+2*E)+256,'precondition: the read and the settle fit beside both binding estimates');
 const a=frozenMap(api,resources,'A',{tables:[f]}),b=frozenMap(api,resources,'B',{tables:[f]}),blocker=blockerFor(budget,room),seen=cloneSpy(t,budget);
 const pa=a.client.acquire(a.ref(f),signal()),pb=b.client.acquire(b.ref(f),signal());
 await until(()=>a.net.reads.length===1,'the read starts');a.deliver(f);
 const leaseA=await deadline(pa);
 await until(()=>b.leases.stats.capacityWaits===1,'map B\'s clone is refused and waits');
 for(let i=0;i<4;i++)await settle();
 assert.equal(seen.length,1,'only map A\'s clone ran');assert.equal(a.leases.stats.capacityWaits,0,'the first clone is never refused');
 assert.equal(category(budget,'normalize'),0,'no hold-and-wait: the held expansion left with the last parent');
 assert.equal(budget.stats.bytes,blocker.bytes+E+256,'map B holds only its binding estimate while it waits');
 assert.equal(budget.stats.availabilityListeners,1,'its own wake-up, no timer');
 assert.equal(b.leases.stats.unfit,0);
 blocker.release();
 await until(()=>b.net.reads.length===1,'with room again map B reads the table again');b.deliver(f);
 const leaseB=await deadline(pb);
 assert.equal(seen.length,2);assert.equal(seen[1].normalize,H,'the retried clone runs under the held expansion');
 assert.deepEqual(leaseB.borrow(value=>value),decoded(f));
 leaseA.release();leaseB.release();a.destroy();b.destroy();await drained(assert,resources,[a,b]);
});

test('a clone that cannot fit beside the held expansion even on an empty page is reported, not awaited',async t=>{
 const f=rowTable('fu-unfit',240),E=valueBytes(f),H=holdOf(f),limitBytes=2*E+H-1;
 assert(limitBytes>=leaseNeed(f),'precondition: the read fits');
 const resources=page(api,{limitBytes}),{budget}=resources,m=frozenMap(api,resources,'M',{tables:[f]}),seen=cloneSpy(t,budget);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.net.reads.length===1,'the read fits the page');m.deliver(f);
 await assert.rejects(deadline(pending),error=>error instanceof api.ResourceBudgetExceededError&&error.required===2*E+H&&error.capacity===limitBytes);
 assert.equal(seen.length,0);assert.equal(m.leases.stats.unfit,1);assert.equal(m.leases.stats.capacityWaits,0);
 m.destroy();await drained(assert,resources,[m]);
});

test('the settled value beside the held expansion is admitted before the settle; refused, the read returns everything and waits',async t=>{
 const resources=page(api),{budget}=resources,f=rowTable('fu-settle',240),E=valueBytes(f),N=holdOf(f);
 assert(256+N+2*E>leaseNeed(f),'precondition: the settled value beside the held expansion and the first clone\'s room exceeds the read working set');
 const m=frozenMap(api,resources,'M',{tables:[f]}),blocker=blockerFor(budget,leaseNeed(f)),seen=cloneSpy(t,budget);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.net.reads.length===1,'the whole read working set fits');m.deliver(f);
 await until(()=>m.leases.stats.capacityWaits===1,'the settle is refused and the read waits');
 for(let i=0;i<4;i++)await settle();
 assert.equal(m.leases.stats.parses,1,'it was refused after the parse');assert.equal(seen.length,0);
 assert.equal(category(budget,'normalize'),0);
 assert.equal(budget.stats.bytes,blocker.bytes+256+512,'holding only the binding and decoded queued estimates');
 assert.equal(budget.stats.availabilityListeners,1);
 blocker.release();
 await until(()=>m.net.reads.length===2,'with room again it reads again');m.deliver(f);
 const lease=await deadline(pending);assert.equal(seen.length,1);assert.equal(seen[0].normalize,N);
 assert.deepEqual(lease.borrow(value=>value),decoded(f));
 lease.release();m.destroy();await drained(assert,resources,[m]);
});

// Review F3: a held claim the ledger refuses is never silent. The ledger is
// made to refuse only that reservation (it cannot be refused otherwise: same
// identity as the read claim, fixed page limit); the clone then runs uncovered
// and the page store counts the miss.
test('a refused clone hold is counted in stats.cloneHoldMisses, and the read still completes and drains',async t=>{
 const resources=page(api),{budget}=resources,f=rowTable('fu-miss',240),E=valueBytes(f),seen=cloneSpy(t,budget);
 const original=budget.tryReserve;let refused=0;
 budget.tryReserve=(cost,options)=>{if(options?.label==='frozen normalize held through binding clones'){refused++;return{ok:false,error:new api.ResourceBudgetExceededError({capacity:0,required:0,current:0,recentCapacity:0,recentRequired:0,recentCurrent:0,shortfallBytes:0,recentShortfallBytes:0,additionalBytes:0,constraint:'total',label:'followups forced refusal'})};}return original.call(budget,cost,options);};
 t.after(()=>{budget.tryReserve=original;});
 const m=frozenMap(api,resources,'M',{tables:[f]});
 assert.equal(m.leases.stats.cloneHoldMisses,0);
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.net.reads.length===1,'the read starts');m.deliver(f);
 const lease=await deadline(pending);
 assert.equal(refused,1,'the hold was asked for once and refused');
 assert.equal(m.leases.stats.cloneHoldMisses,1,'the miss is counted');
 assert.equal(seen.length,1);assert.equal(seen[0].normalize,0,'the clone ran without the held expansion');assert.equal(seen[0].bytes,2*E);
 assert.deepEqual(lease.borrow(value=>value),decoded(f));
 lease.release();m.destroy();await drained(assert,resources,[m]);
});
