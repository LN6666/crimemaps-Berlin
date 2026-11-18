import test from 'node:test';
import assert from 'node:assert/strict';
import {adoptRuntime,page,blockerFor,network,recordPartition,numericRowsPartition,rowTable,leaseNeed,wholeNeed,cloneNeed,frozenMap,drained,until,deadline,state,settle,MiB,NORMALIZE_EXPANSION} from './support/ingress-adopt-fixtures.mjs';
import {groupedVariant,groupedNear,oversizedView} from './support/ingress-adopt-groups.mjs';

// Review follow-ups of the ingress-adopt write line (IA-R3 to IA-R6), on the
// real lease store, building detail source, native pool, byte transport, page
// store and ledger. Network reads stay pending until a case settles them.
const api=await adoptRuntime();
const signal=()=>new AbortController().signal;
const zero={bytes:0,exactBytes:0,estimatedBytes:0};
const category=(budget,name)=>({...(budget.stats.categories[name]??zero)});
const decoded=f=>JSON.parse(new TextDecoder().decode(f.raw));
const valueBytes=raw=>api.estimateRetainedBuildingPayload(JSON.parse(new TextDecoder().decode(raw))).retainedPayloadEstimateBytes;
// A decoded production's working set: inflate d, normalize 13d (FROZEN_NORMALIZE_EXPANSION) and the 2P envelope.
const decodedNeed=f=>leaseNeed(f)-256;

test('IA-R3: an attempt abandoned inside its own delivery wave keeps no minted read envelope',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('review-abandon-wave',240),a=frozenMap(api,resources,'A',{tables:[f]});
 // Every reservation an abandoned attempt keeps until it settles.
 const kept=[],tryReserve=budget.tryReserve.bind(budget);
 budget.tryReserve=(costs,options)=>{if(options?.label==='abandoned frozen ingress until it settles')kept.push([costs].flat().map(cost=>({...cost})));return tryReserve(costs,options);};
 const pa=a.client.acquire(a.ref(f),signal());void pa.catch(()=>{});
 await until(()=>a.net.reads.length===1,'map A reads the table');
 // The delivery's second step (the claim shrinks to [...keep, response]) runs a
 // wake wave; destroying map A in it abandons the attempt before its charge follows.
 let armed=true;const stop=budget.onAvailable(()=>{if(armed){armed=false;a.destroy();}});
 a.deliver(f);
 await until(()=>!armed,'the delivery wave destroyed map A');stop();
 await assert.rejects(deadline(pa),{name:'AbortError'});for(let i=0;i<8;i++)await settle();
 assert.equal(kept.length,1,'the abandoned attempt kept what it may still hold');
 assert.deepEqual(kept[0].filter(cost=>cost.category==='read'&&cost.precision==='estimate'),[],'no minted envelope: the transport had already put it down');
 assert(kept[0].every(cost=>cost.category==='inflate'),'only its inflated copy, under the claim identity');
 assert.equal(a.leases.stats.parses,0);
 budget.tryReserve=tryReserve;await drained(assert,resources,[a]);
});

test('IA-R4: a client disposed inside the pressure wave of its refused binding estimate rejects at once',async()=>{
 const resources=page(api),{budget}=resources,f=rowTable('review-reentrant-binding',120),a=frozenMap(api,resources,'A',{tables:[f]});
 // Less than the binding's 256-byte queued estimate is free.
 const blocker=blockerFor(budget,100);
 let armed=true;const stop=budget.onPressure(()=>{if(armed){armed=false;a.client.dispose();}});
 const pa=a.client.acquire(a.ref(f),signal());void pa.catch(()=>{});
 stop();assert.equal(armed,false,'the refusal of the binding estimate disposed the client');
 assert.equal(await state(pa),'rejected:AbortError','it does not wait for an availability wave');
 assert.equal(budget.stats.availabilityListeners,0,'no wake-up subscription was registered');
 assert.equal(a.leases.stats.capacityWaits,0);assert.equal(a.net.reads.length,0);
 blocker.release();a.destroy();await drained(assert,resources,[a]);
});

test('IA-R5: a read refused for a younger composition does not fail an older one that already holds that part',async()=>{
 // Part P (large) is read first; part Q (smaller) waits. The page is just too
 // small for the older composition's P beside another read of P, which only a
 // younger composition (another map) needs.
 // Scheme H (DECISIONS 2026-11-02 08:56): the older composition's P now settles
 // beside the held normalize claim and clones (wholeNeed). The page must hold
 // that whole acquisition, yet stay below VP plus a second read of P, so the
 // tables are numeric rows (value estimate below raw bytes, digits compress
 // poorly): on the hex-string record tables used before scheme H, P's clone
 // (2E + 13d) exceeds VP plus a read of P (E + 14d + 2P) and the page cannot be
 // both. The case and its assertions are otherwise those before scheme H.
 const p=numericRowsPartition('review-shared',[160,40],{numbers:48}),[P,Q]=p.parts,VP=valueBytes(P.raw),VQ=valueBytes(Q.raw);
 const readP=decodedNeed(P)-512;// a second read of P, beyond its queued descriptor estimate
 const low=Math.max(wholeNeed(P)+768,VP+768+3*VQ+NORMALIZE_EXPANSION*Q.d.bytes+2048,wholeNeed(P)+VQ+256+2048),high=VP+readP;
 const limitBytes=Math.floor((low+high)/2);
 assert(low<high,'precondition: the whole P of the older composition fits, a second read of P beside its VP does not');
 assert(VP+readP>limitBytes&&wholeNeed(P)+768<=limitBytes,'precondition: only a second read of P cannot fit beside the older composition');
 assert(leaseNeed(Q)>limitBytes-256-(NORMALIZE_EXPANSION+1)*P.d.bytes,'precondition: Q stays refused while P reads, settles and clones');
 // The precondition before scheme H, unchanged (the new tables still meet it).
 assert(decodedNeed(Q)-512>VP+768&&VQ+2048<VP,'precondition: Q stays refused while the page keeps VP free');
 const resources=page(api,{limitBytes}),{budget}=resources;
 const older=frozenMap(api,resources,'A',{partitions:[p]}),younger=frozenMap(api,resources,'B',{partitions:[p],city:'bremen'});
 const one=older.client.acquire(older.partitionRef(),signal());
 await until(()=>older.net.reads.length===1&&older.leases.stats.capacityWaits>=1,'P reads while Q waits');
 assert.equal(older.net.reads[0].target,P.d.transport.path);
 // Another holder takes every byte freed once P completes (its clone hold
 // returned, no normalize claim left), leaving VP free: Q's read does not fit.
 const taken=[];let armed=true;
 const stop=budget.onAvailable(()=>{if(!armed||(budget.stats.categories.normalize?.bytes??0)>0)return;const extra=budget.stats.availableBytes-VP;if(extra>0)taken.push(budget.reserve({category:'construction',bytes:extra,precision:'estimate',label:'review holder'}));});
 older.net.deliver(P.d.transport.path,new Uint8Array(P.physical));
 await until(()=>older.leases.stats.valueCells===1,'the older composition holds P');
 for(let i=0;i<6;i++)await settle();
 armed=false;
 assert(taken.length>0,'the other holder took the room P returned');assert.equal(budget.stats.availableBytes,VP,'VP is free');
 assert.equal(older.net.reads.length,1,'Q still waits');assert.equal(await state(one),'pending');
 const waits=younger.leases.stats.capacityWaits;
 const two=younger.client.acquire(younger.partitionRef(),signal());
 await until(()=>younger.leases.stats.capacityWaits>waits,'the younger composition’s read of P is refused and waits');
 for(let i=0;i<6;i++)await settle();
 assert.equal(await state(one),'pending','the older composition is not reported as not fitting for a read it does not wait for');
 assert.equal(older.leases.stats.unfit+younger.leases.stats.unfit,0);
 assert.equal(older.leases.stats.composeReclaims,0,'the younger refusal does not reclaim the older composition');
 // The other holder leaves: the older composition completes, then the younger one.
 stop();for(const r of taken)r.release();
 await until(()=>older.net.pending().length===1,'the older composition reads Q');
 older.net.deliver(Q.d.transport.path,new Uint8Array(Q.physical));
 const lease1=await deadline(one,'the older composition completes');assert.deepEqual(lease1.borrow(value=>value),p.expected);
 assert.equal(await state(two),'pending');
 lease1.release();
 await until(()=>younger.net.pending().length===1,'the younger composition reads P again');
 younger.net.deliver(P.d.transport.path,new Uint8Array(P.physical));
 const lease2=await deadline(two,'the younger composition completes');assert.deepEqual(lease2.borrow(value=>value),p.expected);
 lease2.release();older.destroy();younger.destroy();await drained(assert,resources,[older,younger]);
});

const descriptorBytes=resource=>api.estimateRetainedBuildingPayload(resource).estimatedJsContainerBytes+2048;
/** Delivers every pending read as it appears until `promise` settles (test-side driver, no timer). */
async function serveUntil(net,promise,deliver,turns=400){
 let done=false;promise.then(()=>{done=true;},()=>{done=true;});
 for(let i=0;i<turns&&!done;i++){for(const row of [...net.pending()])deliver(row);await settle();}
 return deadline(promise);
}
function detailSource(resources,{transport=true,net=network(),vertexCap,readCanonical}={}){
 const bytes=api.createResourceByteTransport({namespace:'ingress-adopt-review-detail',resourceStore:resources.store,read:net.read});
 const source=api.createBuildingDetailSource({city:'berlin',resourceStore:resources.store,readBytes:net.read,...(vertexCap?{vertexCap}:{}),
  readCanonical:readCanonical??(async()=>assert.fail('display variants never read the canonical leaf')),...(transport?{acquireBytes:bytes.acquireBytes}:{})});
 return{net,bytes,source};
}

test('IA-R6: a group read admits nothing beyond what its source pre-admitted, and its delivery is counted once',async()=>{
 const resources=page(api),{budget}=resources,v=groupedVariant('review-groups'),d=detailSource(resources),G=v.groups.byteLength;
 const pending=d.source.acquire(v.resource,{signal:signal()});
 await until(()=>d.net.reads.length===1,'the variant read starts');
 d.net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 await until(()=>d.net.reads.length===2,'the group read starts');
 assert.equal(d.net.reads[1].target,v.resource.groupMetadata.path);
 assert.deepEqual(category(budget,'read'),{bytes:2*G,exactBytes:0,estimatedBytes:2*G},'only the minted group envelope, once');
 const during=budget.stats.bytes;
 let observed;const watch=budget.onAvailable(()=>{observed??=category(budget,'read');});
 d.net.deliver(v.resource.groupMetadata.path,new Uint8Array(v.groups));
 const lease=await deadline(pending);watch();
 assert.equal(lease.value.groups.packingGroups.length,2);
 assert.deepEqual(observed,{bytes:G,exactBytes:G,estimatedBytes:0},'the delivered group response is counted once');
 const groupBytes=api.estimateRetainedBuildingPayload(lease.value.groups).estimatedJsContainerBytes;
 // The group expansion is the source's own constant (calibrate-native recalibrated it from 40).
 assert.equal(during,budget.stats.bytes-groupBytes+api.DETAIL_GROUP_EXPANSION*G+2*G,'while it reads, the ledger holds the retained source and exactly one group working set');
 assert.equal(d.bytes.stats.admittedReads,2);assert.equal(d.source.stats.unadmittedDeliveries,0);assert.equal(d.source.stats.capacityWaits,0);
 lease.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

test('IA-R6: a group response beyond its envelope is retried once with an envelope that covers it; a second refusal does not fit',async()=>{
 for(const outcome of ['retried','unfit']){
  const resources=page(api),{budget}=resources,v=groupedVariant('review-group-'+outcome),d=detailSource(resources);
  const variant=v.resource.descriptor.path,group=v.resource.groupMetadata.path;
  const pending=d.source.acquire(v.resource,{signal:signal()});void pending.catch(()=>{});
  await until(()=>d.net.reads.length===1,'the variant read starts');d.net.deliver(variant,new Uint8Array(v.physical));
  await until(()=>d.net.reads.length===2,'the group read starts');
  let filler=blockerFor(budget,0);
  d.net.deliver(group,oversizedView(v.groups,4));
  await until(()=>d.source.stats.capacityWaits===1,'the refused group read waits');for(let i=0;i<4;i++)await settle();
  assert.equal(d.source.stats.deliveryRefusals,1);
  assert.equal(budget.stats.bytes,filler.bytes+descriptorBytes(v.resource),'the pass returned everything beyond its descriptor estimate');
  assert.equal(await state(pending),'pending');
  filler.release();
  await until(()=>d.net.reads.length===3,'the pass starts again');d.net.deliver(variant,new Uint8Array(v.physical));
  await until(()=>d.net.reads.length===4,'the group read starts again');
  if(outcome==='retried'){
   d.net.deliver(group,oversizedView(v.groups,4));
   const lease=await deadline(pending);assert.equal(lease.value.groups.packingGroups.length,2);
   assert.equal(d.source.stats.deliveryRefusals,1);assert.equal(d.source.stats.unfit,0);
   lease.release();
  }else{
   filler=blockerFor(budget,0);
   d.net.deliver(group,oversizedView(v.groups,6));
   await assert.rejects(deadline(pending),{name:'ResourceBudgetExceededError'});
   assert.equal(d.source.stats.deliveryRefusals,2);assert.equal(d.source.stats.unfit,1);assert.equal(d.net.reads.length,4,'no further read');
   filler.release();
  }
  for(let i=0;i<4;i++)await settle();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
 }
});

test('IA-R6: a group refusal reaches every detail source waiting on the shared group entry',async()=>{
 const resources=page(api),{budget}=resources,v=groupedVariant('review-group-shared'),net=network();
 // Two sources (different vertex caps: two source entries) share one transport and one group entry.
 const first=detailSource(resources,{net}),second={source:api.createBuildingDetailSource({city:'berlin',resourceStore:resources.store,readBytes:net.read,vertexCap:100000,acquireBytes:first.bytes.acquireBytes,readCanonical:async()=>assert.fail('no canonical')})};
 const variant=v.resource.descriptor.path,group=v.resource.groupMetadata.path;
 const one=first.source.acquire(v.resource,{signal:signal()}),two=second.source.acquire(v.resource,{signal:signal()});
 await until(()=>net.pending().length===1,'one shared variant read');net.deliver(variant,new Uint8Array(v.physical));
 await until(()=>net.pending().some(row=>row.target===group),'the shared group read starts');
 for(let i=0;i<20;i++)await settle();
 assert.equal(net.reads.filter(row=>row.target===group).length,1,'one group read serves both sources');
 const filler=blockerFor(budget,0);
 net.deliver(group,oversizedView(v.groups,4));
 await until(()=>first.source.stats.capacityWaits===1&&second.source.stats.capacityWaits===1,'both sources wait to retry with a larger envelope');
 assert.equal(await state(one),'pending');assert.equal(await state(two),'pending','the source that did not produce the group read retries too');
 filler.release();
 const [a,b]=await serveUntil(net,Promise.all([one,two]),row=>net.deliver(row.target,row.target===group?oversizedView(v.groups,4):new Uint8Array(v.physical)));
 assert.equal(net.reads.filter(row=>row.target===group).length,2,'the group was read once more, with the larger envelope');
 assert.equal(a.value.groups.packingGroups.length,2);assert.equal(b.value.groups.packingGroups.length,2);
 assert.equal(first.source.stats.unfit+second.source.stats.unfit,0);
 a.release();b.release();for(let i=0;i<4;i++)await settle();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

test('IA-R6: a near pass whose group admission is refused returns its canonical source and waits holding only its descriptor estimate',async()=>{
 const resources=page(api),{budget}=resources,n=groupedNear('review-near'),net=network();
 const pool=api.createSharedNativeSourcePool({resourceStore:resources.store,read:net.read}),client=pool.client('berlin');
 // The page fills just as the canonical source is handed to the near pass.
 let filler,armed=true;
 const d=detailSource(resources,{transport:false,net,readCanonical:async(asset,signal,cap)=>{const result=await client.read(asset,signal,cap);if(armed){armed=false;filler=blockerFor(budget,0);}return result;}});
 const pending=d.source.acquire(n.resource,{signal:signal()});
 await until(()=>net.reads.length===1,'the canonical read starts');net.deliver(n.resource.descriptor.path,new Uint8Array(n.canonical));
 await until(()=>d.source.stats.capacityWaits===1,'the group admission is refused and waits');for(let i=0;i<6;i++)await settle();
 assert.equal(pool.stats.holders,0,'the canonical source was returned');
 assert.equal(budget.stats.bytes,filler.bytes+descriptorBytes(n.resource),'only the descriptor estimate is held while it waits');
 assert.equal(net.reads.length,1,'no group read was started');
 filler.release();
 await until(()=>net.reads.length===2,'the pass starts again with the canonical read');net.deliver(n.resource.descriptor.path,new Uint8Array(n.canonical));
 await until(()=>net.reads.length===3,'then the group read');assert.equal(net.reads[2].target,n.resource.groupMetadata.path);
 net.deliver(n.resource.groupMetadata.path,new Uint8Array(n.groups));
 const lease=await deadline(pending);assert.equal(lease.value.groups.packingGroups.length,2);assert.equal(lease.value.admission.kind,'canonical');
 lease.release();client.destroy();pool.destroy();for(let i=0;i<4;i++)await settle();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});
