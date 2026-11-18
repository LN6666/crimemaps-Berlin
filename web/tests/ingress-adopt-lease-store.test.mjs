import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptRuntime,page,blockerFor,greedy,rowTable,recordPartition,leaseNeed,settleNeed,cloneNeed,wholeNeed,frozenMap,drained,until,deadline,state,settle,MiB} from './support/ingress-adopt-fixtures.mjs';

// The real frozen lease store of one or two maps over the real page store,
// ledger and byte transport (caller-admitted reads). Network reads stay pending
// until a case settles them. These cases pin the ingress-adopt contract: a
// refused admission returns everything beyond the queued estimates and waits on
// the ledger's availability, holding nothing; a partition composition never
// holds its ready parts while waiting (they stay reclaimable until all are
// taken); an unfit working set is reported at once. Under scheme H (DECISIONS
// 2026-11-02 08:56, clone hold 10 d since 22:19) a read is followed by its
// settle (256 + 10d + 2E) and its clone (2E + 10d) phases (settleNeed,
// cloneNeed): cases that size the free page for a whole acquisition use
// wholeNeed, not the read's leaseNeed alone.
const api=await adoptRuntime();
const signal=()=>new AbortController().signal;
const decoded=f=>JSON.parse(new TextDecoder().decode(f.raw));
const QUEUED=256+512;// a waiting read's binding and shared descriptor estimates
const zero={bytes:0,exactBytes:0,estimatedBytes:0};
const category=(budget,name)=>({...(budget.stats.categories[name]??zero)});
const valueBytes=raw=>api.estimateRetainedBuildingPayload(JSON.parse(new TextDecoder().decode(raw))).retainedPayloadEstimateBytes;
// The decoded production's own working set (its queued 512 is replaced).
const decodedNeed=f=>leaseNeed(f)-256;

test('one byte short of its whole working set, a read waits holding only its queued estimates, then reads once',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('adopt-wait',240),m=frozenMap(api,resources,'M',{tables:[f]});
 const blocker=blockerFor(budget,leaseNeed(f)-1),baseline=blocker.bytes+QUEUED;
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.leases.stats.capacityWaits===1,'the refused admission waits');
 for(let i=0;i<6;i++)await settle();
 assert.equal(m.net.reads.length,0,'no network read while the working set does not fit');
 assert.equal(budget.stats.bytes,baseline,'0 bytes above its queued binding and descriptor estimates while waiting');
 assert.deepEqual(category(budget,'normalize'),zero,'no expansion is held');assert.deepEqual(category(budget,'read'),zero,'no read envelope is held');
 assert.equal(m.transport.stats.consumers,0,'the transport holds nothing for it');assert.equal(m.leases.stats.active,0,'the waiting read left its ingress slot');
 assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');
 blocker.release();
 await until(()=>m.net.reads.length===1,'released capacity starts the read');
 assert.equal(budget.stats.bytes,leaseNeed(f),'binding estimate, expansion and the minted envelope, each counted once');
 assert.equal(m.transport.stats.admittedReads,1,'a caller-admitted read');
 m.deliver(f);const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),decoded(f));
 assert.equal(m.net.reads.length,1,'exactly one read');assert.equal(m.leases.stats.reads,1,'one admitted read attempt');assert.equal(m.leases.stats.capacityWaits,1);
 lease.release();m.destroy();await drained(assert,resources,[m]);
});

test('aborting a read that waits for capacity returns everything and ends its wake-up subscription',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('adopt-abort',240),m=frozenMap(api,resources,'M',{tables:[f]});
 const blocker=blockerFor(budget,leaseNeed(f)-1),leaving=new AbortController();
 const pending=m.client.acquire(m.ref(f),leaving.signal);
 await until(()=>m.leases.stats.capacityWaits===1,'the refused admission waits');
 leaving.abort();await assert.rejects(deadline(pending),{name:'AbortError'});
 for(let i=0;i<6;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes,'nothing of the aborted read remains charged');assert.equal(budget.stats.availabilityListeners,0,'no wake-up subscription remains');
 assert.equal(m.net.reads.length,0,'it never read');
 blocker.release();m.destroy();await drained(assert,resources,[m]);
});

test('a synchronous wake-wave reserver cannot take the read envelope; it only gets what delivery frees',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('adopt-greedy',240),m=frozenMap(api,resources,'M',{tables:[f]}),P=f.physical.length;
 // Scheme H: room for the read and, beside the P the reserver takes at
 // delivery, for the settle and clone phases that follow it (the read alone,
 // leaseNeed, was the whole acquisition before scheme H).
 const free=Math.max(leaseNeed(f),settleNeed(f)+P,cloneNeed(f)+P);
 const blocker=blockerFor(budget,free),thief=greedy(budget,{cap:P});thief.arm();
 const pending=m.client.acquire(m.ref(f),signal());
 await until(()=>m.net.reads.length===1,'the read starts at once');
 assert.equal(thief.bytes,0,'no wave handed anything to the reserver before delivery: nothing is returned at the hand-over');
 assert.equal(budget.stats.bytes,blocker.bytes+leaseNeed(f),'claim and transport entry list one envelope: exactly the read working set above the other holder');
 m.deliver(f);const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),decoded(f));
 assert.equal(thief.bytes,P,'the first wave carried only the envelope beyond the delivered response');
 assert.equal(m.leases.stats.capacityWaits,0,'the read was never refused');assert.equal(m.leases.stats.deliveryRefusals,0);
 lease.release();thief.release();thief.off();blocker.release();m.destroy();await drained(assert,resources,[m]);
});

test('a working set that cannot fit beside its binding even on an empty page is reported at once',async()=>{
 const f=rowTable('adopt-unfit',240),resources=page(api,{limitBytes:leaseNeed(f)-1}),m=frozenMap(api,resources,'M',{tables:[f]});
 await assert.rejects(deadline(m.client.acquire(m.ref(f),signal()),'an unfit read must not wait'),{name:'ResourceBudgetExceededError'});
 assert.equal(m.net.reads.length,0);assert.equal(m.leases.stats.unfit,1);assert.equal(m.leases.stats.capacityWaits,0);
 m.destroy();await drained(assert,resources,[m]);
});

test('a refused private clone returns the shared value too and waits holding only its binding estimate',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('adopt-clone',240),E=valueBytes(f.raw),d=f.d.bytes;
 // Two maps on one table. The decoded value settles beside the clone hold, the
 // held normalize 10 d and the first clone's room E (settleNeed); map A's
 // clone takes that room and never grows the ledger. Map B's clone grows it by
 // E - 256 beside the shared value, A's private copy and the held normalize: on
 // this page it lacks one byte (DECISIONS 2026-11-02 22:19).
 const a=frozenMap(api,resources,'A',{tables:[f]}),b=frozenMap(api,resources,'B',{tables:[f]});
 const free=3*E+10*d-1;
 assert(free>=Math.max(leaseNeed(f)+256,settleNeed(f)+256),'precondition: the read and the settle fit beside both binding estimates');
 const blocker=blockerFor(budget,free);
 const pa=a.client.acquire(a.ref(f),signal()),pb=b.client.acquire(b.ref(f),signal());
 await until(()=>a.net.reads.length===1,'map A reads the shared table');a.deliver(f);
 const leaseA=await deadline(pa,'map A clones into the room its read settled beside');
 await until(()=>b.leases.stats.capacityWaits===1,'map B\'s clone is refused and waits');
 for(let i=0;i<4;i++)await settle();
 assert.equal(a.leases.stats.capacityWaits,0,'map A was never refused');
 assert.equal(a.leases.stats.parses,1,'the refusal came after the parse: at B\'s clone');
 assert.equal(budget.stats.bytes,blocker.bytes+E+256,'B holds only its binding estimate while it waits: the shared value and the clone hold were returned');
 assert.equal(category(budget,'normalize').bytes,0,'the clone hold was dropped with the parent');
 assert.equal(budget.stats.availabilityListeners,1,'B\'s own wake-up only');
 leaseA.release();
 await until(()=>b.net.reads.length===1,'with room again map B reads the table again');
 // The page remembered B's refused clone: B's read admits its settle and the
 // first clone's room with it (the headroom), so it never grows after its read.
 assert.equal(budget.stats.bytes-blocker.bytes,256+d+13*d+2*f.physical.length+Math.max(0,settleNeed(f)-256-14*d-f.physical.length),'the re-read admits its settle with its read');
 b.deliver(f);
 const leaseB=await deadline(pb);assert.deepEqual(leaseB.borrow(value=>value),decoded(f));
 assert.equal(b.leases.stats.capacityWaits,1,'the re-read was never refused');assert.equal(a.net.reads.length+b.net.reads.length,2,'one re-read');
 leaseB.release();blocker.release();a.destroy();b.destroy();await drained(assert,resources,[a,b]);
});

test('a composition holds its ready part only reclaimably while another part waits; foreign pressure takes it back',async()=>{
 const resources=page(api),{budget}=resources,p=recordPartition('compose',[24,480]),[a,b]=p.parts,m=frozenMap(api,resources,'M',{partitions:[p]});
 // Room for both parts' queued estimates and the small part's whole
 // acquisition only (scheme H: read, settle and clone, wholeNeed).
 const blocker=blockerFor(budget,2*QUEUED+wholeNeed(a)-QUEUED+64);
 assert(leaseNeed(b)-QUEUED>wholeNeed(a)+64,'precondition: the large part never fits beside them');
 const pending=m.client.acquire(m.partitionRef(),signal());
 await until(()=>m.net.reads.length===1&&m.leases.stats.capacityWaits>=1,'the small part reads while the large one waits');
 assert.equal(m.net.reads[0].target,a.d.transport.path);
 m.net.deliver(a.d.transport.path,new Uint8Array(a.physical));
 await until(()=>m.leases.stats.valueCells===1,'the small part is ready while the large one still waits');
 for(let i=0;i<4;i++)await settle();
 assert.equal(m.net.reads.length,1,'the large part still waits');
 // A foreign admission one byte larger than the free page: reclaiming the
 // ready part (held only by the waiting composition) admits it in the same refusal.
 const foreign=budget.tryReserve({category:'construction',bytes:budget.stats.availableBytes+1,precision:'estimate',label:'foreign admission'});
 assert(foreign.ok,'the waiting composition did not hold its ready part against another admission');
 assert.equal(m.leases.stats.composeReclaims,1);
 foreign.reservation.release();blocker.release();
 await until(()=>m.net.pending().length===2,'both parts read: the large one, and the reclaimed small one again');
 for(const row of [...m.net.pending()])m.net.deliver(row.target,new Uint8Array(row.target===a.d.transport.path?a.physical:b.physical));
 const lease=await deadline(pending);assert.deepEqual(lease.borrow(value=>value),p.expected);
 assert.equal(m.net.reads.filter(row=>row.target===a.d.transport.path).length,2,'the reclaimed part was read again');
 lease.release();m.destroy();await drained(assert,resources,[m]);
});

test('two compositions short of room: the older completes first; the younger cannot hold it back, and then completes too',async()=>{
 const resources=page(api),{budget}=resources;
 // The younger large part is larger, so that the room returned below for the
 // older one's whole acquisition never fits the younger one's read.
 const p1=recordPartition('older',[24,480]),p2=recordPartition('younger',[24,640]);
 const m1=frozenMap(api,resources,'A',{partitions:[p1]}),m2=frozenMap(api,resources,'B',{partitions:[p2],city:'bremen'});
 const [a1,b1]=p1.parts,[a2,b2]=p2.parts;
 const blocker=blockerFor(budget,4*QUEUED+(wholeNeed(a1)-QUEUED)+(wholeNeed(a2)-QUEUED)+64);
 const one=m1.client.acquire(m1.partitionRef(),signal()),two=m2.client.acquire(m2.partitionRef(),signal());
 await until(()=>m1.net.reads.length===1&&m2.net.reads.length===1,'each small part reads; both large parts wait');
 m1.net.deliver(a1.d.transport.path,new Uint8Array(a1.physical));m2.net.deliver(a2.d.transport.path,new Uint8Array(a2.physical));
 await until(()=>m1.leases.stats.valueCells===1&&m2.leases.stats.valueCells===1,'both small parts ready');
 for(let i=0;i<4;i++)await settle();
 assert.equal(await state(one),'pending');assert.equal(await state(two),'pending');
 // Return just enough that the older large part's whole acquisition (scheme H:
 // its largest phase, wholeNeed) fits once the younger composition's ready part
 // is reclaimed; the younger one never reclaims the older's.
 const target=(wholeNeed(b1)-QUEUED)-valueBytes(a2.raw)+1,free=budget.stats.availableBytes;
 assert(free<target,'the large parts cannot read yet');
 assert(leaseNeed(b2)-QUEUED>target,'precondition: the returned room never fits the younger large read');
 // With the 10 d clone hold (DECISIONS 2026-11-02 22:19) the settle (256 + 10d
 // + 2E) and the clone (2E + 10d) of these record parts are below their read:
 // the read is the largest phase again, so the reclaim serves the read.
 assert.equal(wholeNeed(b1),leaseNeed(b1),'precondition: the read is the older large part\'s largest phase');
 assert(leaseNeed(b1)-QUEUED>target,'precondition: the returned room fits the older large read only with the reclaim');
 blocker.adjust({category:'construction',bytes:blocker.bytes-(target-free),precision:'estimate'});
 await until(()=>m1.net.reads.length===2,'the older composition reads its large part');
 assert.equal(m2.net.reads.length,1,'the younger large part still waits');
 assert.equal(m2.leases.stats.composeReclaims,1,'the younger composition returned its ready part for the older read');assert.equal(m1.leases.stats.composeReclaims,0,'the older one kept its own');
 m1.net.deliver(b1.d.transport.path,new Uint8Array(b1.physical));
 const lease1=await deadline(one,'the older composition completes without any outside release');assert.deepEqual(lease1.borrow(value=>value),p1.expected);
 assert.equal(m2.leases.stats.composeReclaims,1,'one reclaim served the older whole acquisition');assert.equal(m1.leases.stats.composeReclaims,0,'the older one kept its own');
 assert.equal(await state(two),'pending','the younger one still waits, holding only reclaimable parts');
 lease1.release();blocker.release();
 await until(()=>m2.net.pending().length===2,'the younger composition reads again');
 for(const row of [...m2.net.pending()])m2.net.deliver(row.target,new Uint8Array(row.target===a2.d.transport.path?a2.physical:b2.physical));
 const lease2=await deadline(two,'the younger composition completes');assert.deepEqual(lease2.borrow(value=>value),p2.expected);
 lease2.release();m1.destroy();m2.destroy();await drained(assert,resources,[m1,m2]);
});

test('an attempt abandoned after its caller-admitted delivery keeps the delivered response charged until it settles',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('adopt-abandon',240),P=f.physical.length,d=f.d.bytes;
 const a=frozenMap(api,resources,'A',{tables:[f]}),b=frozenMap(api,resources,'B',{tables:[f]});
 // Holds map A's attempt between its delivery and its hash check.
 const subtle=globalThis.crypto.subtle,digest=subtle.digest;let hold;
 subtle.digest=(...args)=>{if(!hold)return digest.apply(subtle,args);const release=hold;hold=undefined;return new Promise(resolve=>{release.resolve=()=>resolve(digest.apply(subtle,args));});};
 try{
  const pa=a.client.acquire(a.ref(f),signal());void pa.catch(()=>{});const pb=b.client.acquire(b.ref(f),signal());
  await until(()=>a.net.reads.length===1,'map A reads the shared table');
  const held={};hold=held;a.deliver(f);
  await until(()=>typeof held.resolve==='function','map A holds its delivered response while hashing it');
  a.destroy();await assert.rejects(pa,{name:'AbortError'});
  await until(()=>b.net.reads.length===1,'map B relays the read');
  assert.deepEqual(category(budget,'read'),{bytes:P+2*P,exactBytes:P,estimatedBytes:2*P},'the abandoned response stays charged exactly beside the relayed envelope');
  assert.equal(category(budget,'inflate').bytes,2*d,'and so does the inflated copy that attempt reserved');
  held.resolve();for(let i=0;i<8;i++)await settle();
  assert.deepEqual(category(budget,'read'),{bytes:2*P,exactBytes:0,estimatedBytes:2*P},'returned once the abandoned attempt settled');
  b.deliver(f);const lease=await deadline(pb);assert.deepEqual(lease.borrow(value=>value),decoded(f));
  assert.equal(a.leases.stats.parses,0,'the abandoned bytes were never parsed');
  lease.release();b.destroy();await drained(assert,resources,[a,b]);
 }finally{subtle.digest=digest;}
});

test('a map destroyed re-entrantly inside its own acquisition rejects at once instead of waiting for the shared value',async()=>{
 const resources=page(api,{recentLimitBytes:MiB}),{budget,store}=resources,f=rowTable('adopt-reentrant',240);
 const a=frozenMap(api,resources,'A',{tables:[f]}),b=frozenMap(api,resources,'B',{tables:[f]});
 // An evictable recent entry, so A's queued binding estimate is admitted only after pressure evicts it.
 const recent=store.acquire({contentKey:'ingress-adopt evictable recent',role:'source',allowRecent:true,estimate:{category:'metadata',bytes:4096,precision:'estimate'},produce:()=>({}),costs:value=>({category:'metadata',bytes:4096,precision:'estimate',identity:value})});
 await recent.ready;recent.release();assert.equal(store.stats.recent,1);
 const pb=b.client.acquire(b.ref(f),signal());
 await until(()=>b.net.reads.length===1,'map B reads the shared table');
 const blocker=blockerFor(budget,100);
 // The eviction's availability wave destroys map A inside A's own synchronous acquisition chain.
 let armed=true;const stop=budget.onAvailable(()=>{if(armed){armed=false;a.destroy();}});
 const pa=a.client.acquire(a.ref(f),signal());void pa.catch(()=>{});
 stop();assert.equal(armed,false,'map A was destroyed inside its own acquisition');
 assert.equal(await state(pa),'rejected:AbortError','it does not wait for the shared value');
 blocker.release();b.deliver(f);const lease=await deadline(pb);assert.deepEqual(lease.borrow(value=>value),decoded(f));
 lease.release();b.destroy();await drained(assert,resources,[a,b]);
});
