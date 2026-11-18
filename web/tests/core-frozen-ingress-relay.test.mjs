import test from 'node:test';
import assert from 'node:assert/strict';
import {leaseRuntime,leaseMap,drainedLeases,leaseExpansion,category,decodedValue,table,copy,settle,until,deadline,MiB,NORMALIZE_EXPANSION} from './support/core-frozen-fixtures.mjs';

// The real frozen lease store of two maps on one page store, each with its own
// byte transport exactly as painted-map builds them (one namespace per city),
// over the real chunk store and ledger. Network reads stay pending until a case
// settles them and reject on abort like fetch. Only tiny synthetic bytes.
const api=await leaseRuntime();
const f=table('relay',240),file='painted/bremen/safety/core-frozen-relay.ts',expected=JSON.parse(new TextDecoder().decode(f.raw));
const ref={canonicalSHA256:f.d.sha256,file,occurrence:0,codec:'json'};
const signal=()=>new AbortController().signal;
function page({limitBytes=64*MiB}={}){const budget=api.createResourceBudget({limitBytes,recentLimitBytes:0});return{budget,store:api.createChunkResourceStore({budget})};}
function map(resources,name,{reader='transport',ignoreAbort=false}={}){
 const network=[];
 const read=(target,readSignal,max)=>new Promise((resolve,reject)=>{network.push({target,signal:readSignal,max,resolve,reject});if(!ignoreAbort)readSignal.addEventListener('abort',()=>reject(readSignal.reason),{once:true});});
 const transport=api.createResourceByteTransport({namespace:JSON.stringify(['bremen',null]),resourceStore:resources.store,read});
 const leases=api.createFrozenDataLeaseStore([f.d],{resourceStore:resources.store});
 const client=leases.client({city:'bremen',profileSHA256:null,provider:'bremen',selection:{tables:[f.d.sha256],initializers:{[f.d.sha256]:{[file]:1}}},resolve:sha=>sha,
  ...(reader==='transport'?{read:transport.readBytes,acquireBytes:transport.acquireBytes}:{read})});
 // painted-map destroy order: the map's frozen resources, then its transport.
 return{name,network,transport,leases,client,destroy(){leases.destroy();transport.destroy();}};
}
async function drained(resources,...maps){
 await settle();await settle();resources.store.evictRecent();
 for(const m of maps){for(const key of ['entries','valueCells','waiters','leases','active','queued'])assert.equal(m.leases.stats[key],0,m.name+' '+key+' must drain');assert.equal(m.transport.stats.consumers,0,m.name+' transport consumers');}
 assert.equal(resources.budget.stats.bytes,0,'every claim returned to the page ledger');assert.equal(resources.budget.stats.availabilityListeners,0,'no wake-up subscription remains');
}

test('two maps on one page store read the verified table once but own separate mutable values',async()=>{
 const resources=page(),a=map(resources,'A'),b=map(resources,'B');
 const pa=a.client.acquire(ref,signal()),pb=b.client.acquire(ref,signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 assert.equal(b.network.length,0,'map B joins the page-wide verified ingress');
 assert.equal(resources.budget.stats.categories.normalize.bytes,NORMALIZE_EXPANSION*f.d.bytes,'one page-wide expansion claim, not one per map');
 a.network[0].resolve(copy(f.physical));
 const [one,two]=await deadline(Promise.all([pa,pb]));
 assert.deepEqual([a.leases.stats.reads,b.leases.stats.reads,a.leases.stats.parses,b.leases.stats.parses],[1,0,1,0]);
 assert.equal(a.leases.stats.valueCells,1);assert.equal(b.leases.stats.valueCells,1);
 one.borrow(value=>{value.rows[0].v='mutated by A';});
 assert.equal(two.borrow(value=>value.rows[0].v),expected.rows[0].v,'a mutation through one map is invisible to the other');
 a.destroy();assert.throws(()=>one.borrow(()=>0),/releas/i);assert.deepEqual(two.borrow(value=>value),expected);
 two.release();b.destroy();await drained(resources,a,b);
});

test('the producing map is destroyed during the shared read: the waiting map relays with its own reader and completes',async()=>{
 const resources=page(),a=map(resources,'A'),b=map(resources,'B');
 const pa=a.client.acquire(ref,signal());void pa.catch(()=>{});const pb=b.client.acquire(ref,signal());
 await until(()=>a.network.length===1,'map A reads the shared table');assert.equal(b.network.length,0);
 a.destroy();
 await assert.rejects(pa,{name:'AbortError'});
 assert.equal(a.network[0].signal.aborted,true,'map A\'s read is cancelled with its map');
 await until(()=>b.network.length===1,'map B reads again with its own reader');
 assert.equal(resources.budget.stats.categories.normalize.bytes,NORMALIZE_EXPANSION*f.d.bytes,'the relayed read keeps the one page-wide claim');
 b.network[0].resolve(copy(f.physical));
 const lease=await deadline(pb,'map B completes after the relay');
 assert.deepEqual(lease.borrow(value=>value),expected,'map B receives the verified value, not map A\'s abort');
 assert.deepEqual([a.leases.stats.reads,b.leases.stats.reads,b.leases.stats.relayedReads,a.leases.stats.parses,b.leases.stats.parses],[1,1,1,0,1]);
 lease.release();b.destroy();await drained(resources,a,b);
});

test('when every waiting map leaves, the shared read is cancelled without a relay and every claim returns',async()=>{
 const resources=page(),a=map(resources,'A'),b=map(resources,'B'),leaving=new AbortController();
 const pa=a.client.acquire(ref,signal());void pa.catch(()=>{});const pb=b.client.acquire(ref,leaving.signal);
 await until(()=>a.network.length===1,'map A reads the shared table');
 leaving.abort();await assert.rejects(pb,{name:'AbortError'});
 assert.equal(a.network[0].signal.aborted,false,'a non-producing waiter that leaves does not cancel the read');
 a.destroy();await assert.rejects(pa,{name:'AbortError'});await settle();
 assert.equal(a.network[0].signal.aborted,true,'nobody waits: the read is cancelled');
 assert.equal(b.network.length,0,'and nobody relays it');assert.equal(b.leases.stats.relayedReads,0);
 b.destroy();await drained(resources,a,b);
});

test('a verification failure still rejects every waiting map and is not relayed',async()=>{
 const resources=page(),a=map(resources,'A'),b=map(resources,'B');
 const pa=a.client.acquire(ref,signal()),pb=b.client.acquire(ref,signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 a.network[0].resolve(new Uint8Array(f.physical.length));
 await assert.rejects(pa,/hash mismatch/);await assert.rejects(pb,/hash mismatch/);
 assert.equal(b.network.length,0);assert.equal(b.leases.stats.relayedReads,0);
 a.destroy();b.destroy();await drained(resources,a,b);
});

test('a producing reader torn down beneath its live map is replaced by the next waiting map\'s reader',async()=>{
 const resources=page(),a=map(resources,'A'),b=map(resources,'B');
 const pa=a.client.acquire(ref,signal()),pb=b.client.acquire(ref,signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 a.transport.destroy();
 await until(()=>b.network.length===1,'map B reads after map A\'s transport went away');
 b.network[0].resolve(copy(f.physical));
 const [one,two]=await deadline(Promise.all([pa,pb]));
 assert.deepEqual(one.borrow(value=>value),expected);assert.deepEqual(two.borrow(value=>value),expected);
 one.borrow(value=>{value.name='changed by A';});assert.equal(two.borrow(value=>value.name),'relay');
 assert.equal(b.leases.stats.relayedReads,1);
 one.release();two.release();a.destroy();b.destroy();await drained(resources,a,b);
});

test('a producing reader that ignores its abort keeps its own slot but never holds the waiting map',async()=>{
 const resources=page(),a=map(resources,'A',{reader:'legacy',ignoreAbort:true}),b=map(resources,'B',{reader:'legacy'});
 const pa=a.client.acquire(ref,signal());void pa.catch(()=>{});const pb=b.client.acquire(ref,signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 a.destroy();await assert.rejects(pa,{name:'AbortError'});
 await until(()=>b.network.length===1,'map B relays although map A\'s reader has not settled');
 assert.equal(a.leases.stats.active,1,'the unsettled read still owns map A\'s ingress slot');
 b.network[0].resolve(copy(f.physical));
 const lease=await deadline(pb,'map B completes before map A\'s reader settles');assert.deepEqual(lease.borrow(value=>value),expected);
 a.network[0].resolve(copy(f.physical));await settle();await settle();
 assert.equal(a.leases.stats.active,0);assert.equal(a.leases.stats.parses,0,'late bytes of an abandoned attempt are never parsed');assert.equal(b.leases.stats.parses,1);
 lease.release();b.destroy();await drained(resources,a,b);
});

// Review F1: a relayed read must not keep the abandoned attempt's working set
// while it waits for a slot on the relaying map's ingress. T is shared by A and
// B; X and Y are B's own tables, whose reads occupy B's two ingress slots.
const T=table('relay-t',200),X=table('relay-x',300),Y=table('relay-y',260);
const blockerFor=(budget,free)=>budget.reserve({category:'construction',bytes:budget.stats.limitBytes-budget.stats.bytes-free,precision:'estimate',label:'other holder'});

test('a relayed read queued behind the relaying map\'s full ingress holds only the queued estimate, then reads once a slot frees',async()=>{
 const resources=page(),{budget}=resources,a=leaseMap(api,resources,'A',[T]),b=leaseMap(api,resources,'B',[T,X,Y]);
 const pa=a.client.acquire(a.ref(T),signal());void pa.catch(()=>{});const pbT=b.client.acquire(b.ref(T),signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 const pbX=b.client.acquire(b.ref(X),signal()),pbY=b.client.acquire(b.ref(Y),signal());
 await until(()=>b.network.length===2,'X and Y occupy both of map B\'s ingress slots');
 assert.equal(b.leases.stats.active,2);assert.equal(category(budget,'normalize').bytes,NORMALIZE_EXPANSION*(T.d.bytes+X.d.bytes+Y.d.bytes));
 a.destroy();await assert.rejects(pa,{name:'AbortError'});
 await until(()=>b.leases.stats.queued===1,'the relayed read of T queues on map B\'s full ingress');await settle();await settle();
 assert.equal(b.leases.stats.relayedReads,1);assert.equal(b.network.length,2,'no read of T yet');
 assert.equal(category(budget,'normalize').bytes,NORMALIZE_EXPANSION*(X.d.bytes+Y.d.bytes),'the queued relay returned T\'s expansion to the page');
 // B's three bindings, T's queued decoded estimate, X's and Y's expansion claims and their transport envelopes: nothing else.
 assert.equal(budget.stats.bytes,3*256+512+leaseExpansion(X)+leaseExpansion(Y)+2*X.physical.length+2*Y.physical.length,'T\'s shared claim is exactly the queued estimate');
 b.deliver(X);(await deadline(pbX)).release();
 await until(()=>b.pending().includes(T.path),'T relays once a slot frees');b.deliver(T);
 const lease=await deadline(pbT,'map B completes after the relay');assert.deepEqual(lease.borrow(value=>value),decodedValue(T));
 b.deliver(Y);(await deadline(pbY)).release();lease.release();b.destroy();await drainedLeases(assert,resources,a,b);
});

test('an abandoned attempt keeps what it may still hold charged until it settles, but not its parse expansion',async()=>{
 const resources=page(),{budget}=resources,a=leaseMap(api,resources,'A',[T],{reader:'legacy',ignoreAbort:true}),b=leaseMap(api,resources,'B',[T,X,Y],{reader:'legacy'});
 const pa=a.client.acquire(a.ref(T),signal());void pa.catch(()=>{});const pbT=b.client.acquire(b.ref(T),signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 const pbX=b.client.acquire(b.ref(X),signal()),pbY=b.client.acquire(b.ref(Y),signal());
 await until(()=>b.network.length===2,'X and Y occupy both of map B\'s ingress slots');
 const P=f=>f.physical.length;
 assert.equal(category(budget,'read').bytes,P(T)+P(X)+P(Y),'legacy readers pre-charge their physical bytes');
 a.destroy();await assert.rejects(pa,{name:'AbortError'});
 await until(()=>b.leases.stats.queued===1,'the relayed read of T queues on map B\'s full ingress');await settle();await settle();
 assert.equal(category(budget,'normalize').bytes,NORMALIZE_EXPANSION*(X.d.bytes+Y.d.bytes),'an aborted attempt never parses: its expansion is returned at once');
 assert.equal(category(budget,'read').bytes,P(T)+P(X)+P(Y),'the bytes map A\'s unsettled reader may still deliver stay charged');
 assert.equal(category(budget,'inflate').bytes,T.d.bytes+X.d.bytes+Y.d.bytes,'and so does the inflated copy that attempt reserved');
 a.deliver(T,{aborted:true});await settle();await settle();
 assert.equal(category(budget,'read').bytes,P(X)+P(Y),'returned when the abandoned attempt settles');assert.equal(category(budget,'inflate').bytes,X.d.bytes+Y.d.bytes);
 assert.equal(a.leases.stats.parses,0,'its late bytes are never parsed');assert.equal(a.leases.stats.active,0);
 b.deliver(X);(await deadline(pbX)).release();
 await until(()=>b.pending().includes(T.path),'T relays once a slot frees');b.deliver(T);
 const lease=await deadline(pbT);assert.deepEqual(lease.borrow(value=>value),decodedValue(T));
 b.deliver(Y);(await deadline(pbY)).release();lease.release();b.destroy();await drainedLeases(assert,resources,a,b);
});

// IA-R2 A class (S2 ingress-adopt CDR[1]): a refused relay no longer rejects;
// like every refused frozen admission it waits holding only its queued
// estimates, and completes once room returns.
test('a relayed read admits its working set again; refused, it waits holding only its queued estimates and completes once room returns',async()=>{
 const resources=page(),{budget}=resources,a=leaseMap(api,resources,'A',[T]),b=leaseMap(api,resources,'B',[T]);
 const pa=a.client.acquire(a.ref(T),signal());void pa.catch(()=>{});const pbT=b.client.acquire(b.ref(T),signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 // The page is otherwise full, and from map A's teardown on another holder
 // takes every byte the page frees inside the same availability wave.
 const blocker=blockerFor(budget,0),taken=[];
 const stop=budget.onAvailable(()=>{const bytes=budget.stats.availableBytes;if(bytes>0)taken.push(budget.reserve({category:'construction',bytes,precision:'estimate',label:'greedy holder'}));});
 a.destroy();await assert.rejects(pa,{name:'AbortError'});
 await until(()=>b.leases.stats.capacityWaits===1,'the relayed admission is refused and waits');
 for(let i=0;i<6;i++)await settle();
 stop();
 assert.equal(b.leases.stats.relayedReads,1,'map B relayed');assert.equal(b.network.length,0,'and was refused before any read');
 const held=taken.reduce((n,r)=>n+r.bytes,0);
 assert.equal(budget.stats.bytes,blocker.bytes+held+256+512,'a relay does not wait holding a working set: only its binding and descriptor estimates');
 assert.equal(category(budget,'normalize').bytes,0,'no expansion is held');
 assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');
 for(const reservation of taken)reservation.release();blocker.release();
 await until(()=>b.network.length===1,'with room again map B reads');b.deliver(T);
 const lease=await deadline(pbT,'the relay completes');assert.deepEqual(lease.borrow(value=>value),decodedValue(T));
 assert.equal(b.leases.stats.reads,1,'one read by map B');
 lease.release();b.destroy();await drainedLeases(assert,resources,a,b);
});

// IA-R2 A class (S2 ingress-adopt CDR[1]): X no longer rejects; it waits
// holding only its queued estimates (no working set), and T still completes
// without any outside release.
test('review F1 scenario: a relay beside reads that cannot fit their envelopes completes without any outside release',async()=>{
 const T=table('hold-t',12,{gzip:false}),Y=table('hold-y',25,{gzip:false}),X=table('hold-x',640,{gzip:false}),all=[T,X,Y];
 const resources=page(),{budget}=resources,a=leaseMap(api,resources,'A',all),b=leaseMap(api,resources,'B',all);
 const pa=a.client.acquire(a.ref(T),signal());void pa.catch(()=>{});const pbT=b.client.acquire(b.ref(T),signal());
 await until(()=>a.network.length===1,'map A reads the shared table');assert.equal(b.network.length,0);
 // Room for X's and Y's expansion claims (13d each) but not for X's transport envelope beside them.
 const blocker=blockerFor(budget,512+NORMALIZE_EXPANSION*X.d.bytes+NORMALIZE_EXPANSION*Y.d.bytes);
 const pbX=b.client.acquire(b.ref(X),signal()),pbY=b.client.acquire(b.ref(Y),signal());
 await until(()=>b.pending().includes(Y.path),'Y admits its whole working set and reads');
 await until(()=>b.leases.stats.capacityWaits>=1,'X is refused and waits');
 assert(!b.pending().includes(X.path),'X never reached the network');
 assert.equal(category(budget,'normalize').bytes,NORMALIZE_EXPANSION*(T.d.bytes+Y.d.bytes),'X waits without its expansion: only T and Y hold one');
 assert.equal(budget.stats.availabilityListeners,1,'X alone waits for capacity, on one wake-up');
 a.destroy();await assert.rejects(pa,{name:'AbortError'});
 await until(()=>b.pending().includes(T.path),'T relays to map B');b.deliver(T);
 const lease=await deadline(pbT,'T completes without any outside release');assert.deepEqual(lease.borrow(value=>value),decodedValue(T));
 b.deliver(Y);(await deadline(pbY)).release();lease.release();
 assert(!b.pending().includes(X.path),'X still waits for room beside the other holder');
 blocker.release();
 await until(()=>b.pending().includes(X.path),'with room X reads');b.deliver(X);
 const leaseX=await deadline(pbX,'X completes once room returns');assert.deepEqual(leaseX.borrow(value=>value),decodedValue(X));
 leaseX.release();b.destroy();await drainedLeases(assert,resources,a,b);
});

test('destroying the page store rejects waiting maps with an AbortError and returns every claim',async()=>{
 const resources=page(),{budget}=resources,a=leaseMap(api,resources,'A',[T]),b=leaseMap(api,resources,'B',[T]);
 const pa=a.client.acquire(a.ref(T),signal()),pb=b.client.acquire(b.ref(T),signal());
 await until(()=>a.network.length===1,'map A reads the shared table');
 resources.store.destroy();
 await assert.rejects(deadline(pa),{name:'AbortError'});await assert.rejects(deadline(pb),{name:'AbortError'});
 await settle();await settle();
 assert.equal(a.network[0].signal.aborted,true,'the shared read is cancelled');assert.equal(b.network.length,0,'and not relayed');
 a.destroy();b.destroy();await settle();
 assert.equal(budget.stats.bytes,0,'every claim returned to the page ledger');assert.equal(budget.stats.availabilityListeners,0);
});
