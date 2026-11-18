import test from 'node:test';
import assert from 'node:assert/strict';
import {KiB,MiB,cost,greedyReserver,loadCoreTransport,settle,transportHarness,until} from './support/core-transport-harness.mjs';

// Caller-admitted byte reads: the caller mints the read's envelope, admits
// [...own costs, ...envelope] in one claim and hands both to acquireBytes as
// the fourth argument. The transport then admits nothing and never waits for
// capacity: on a store miss the read's entry reserves the same envelope
// identities for no additional byte, so the read stays charged until it
// settles whoever leaves, and delivery adjusts the claim once, in place, to
// [...keep, delivered bytes].
const api=await loadCoreTransport();
const MAX=64*KiB,SIZE=48*KiB,KEEP=16*KiB,ENVELOPE=2*MAX;
const timeout={timeout:10_000};
const A='/safety/buildings3d/core-transport/a.json',B='/safety/buildings3d/core-transport/b.json';
const live=()=>new AbortController().signal;
const keepCosts=(bytes=KEEP)=>[cost('decoded',bytes,'caller decode working set')];
const readClaim=(h,path=A,max=MAX,keep=keepCosts())=>h.admitRead(path,max,keep);

test('a caller-admitted read delivers on a ledger with nothing else free, reserving and waiting for nothing',timeout,async()=>{
  const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h),{claim}=read;
  const other=h.fill(limit-h.real.stats.bytes);
  assert.equal(h.real.stats.availableBytes,0,'other owners hold everything beside the claim');
  const pending=h.acquire(A,live(),MAX,read);
  assert.equal(h.real.stats.bytes,limit,'the read entry reserves the envelope its claim lists, for no additional byte');
  assert.deepEqual(h.category('read'),{bytes:ENVELOPE,exactBytes:0,estimatedBytes:ENVELOPE},'one envelope, counted once');
  assert.equal(h.real.stats.availabilityListeners,0,'the transport never waits for capacity');
  await until(()=>h.reads.length===1,'the read is issued');
  assert.equal(h.reads[0].max,MAX);
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;
  assert.equal(lease.bytes.byteLength,SIZE);
  assert.equal(claim.bytes,KEEP+SIZE,'the same claim now carries [...keep, delivered bytes]');
  assert.deepEqual({identity:lease.cost.identity===lease.bytes.buffer,bytes:lease.cost.bytes,precision:lease.cost.precision,category:lease.cost.category},
    {identity:true,bytes:SIZE,precision:'exact',category:'read'});
  assert.equal(h.real.stats.bytes,other.bytes+KEEP+SIZE,'the delivered buffer is counted once');
  assert.deepEqual(h.category('read'),{bytes:SIZE,exactBytes:SIZE,estimatedBytes:0});
  assert.equal(h.transport.stats.admittedDeliveries,1);assert.equal(h.transport.stats.reads,1);
  lease.release();
  assert.equal(h.real.stats.bytes,other.bytes+KEEP+SIZE,'a recent copy of the listed buffer adds no byte');
  claim.release();other.release();
  assert.equal(h.real.stats.bytes,SIZE,'after the claim, only the bounded recent copy charges the buffer');
  assert.equal(h.real.stats.recentBytes,SIZE);
  h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
  assert.equal(h.transport.stats.consumers,0);assert.equal(h.transport.stats.admittedProductions,0);
});

test('ledger occupancy never exceeds the caller claim while the read is admitted, delivered and charged',timeout,async()=>{
  const limit=2*MiB,spare=512*KiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h);
  const admittedBytes=read.claim.bytes,other=h.fill(limit-spare-admittedBytes);
  const ceiling=other.bytes+admittedBytes;h.probe.reset();
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;lease.release();
  assert(h.probe.peak.mutations>0,'the ledger was sampled at every mutation');
  assert(h.probe.peak.bytes<=ceiling,`peak ${h.probe.peak.bytes} stayed within others plus the claim (${ceiling}); the ${spare} B spare was never used`);
  assert.equal(h.real.stats.bytes,other.bytes+KEEP+SIZE);
  read.claim.release();other.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('delivery frees only what the read no longer needs: a synchronous reserver in the wake wave takes exactly that',timeout,async()=>{
  const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h),{claim}=read;
  const other=h.fill(limit-h.real.stats.bytes);
  const greedy=greedyReserver(h);
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;
  assert(greedy.calls>=1,'the shrink sent a wake wave');
  assert.equal(greedy.bytes,ENVELOPE-SIZE,'the wave reserver took exactly the returned envelope remainder');
  assert.equal(claim.bytes,KEEP+SIZE,'the claim kept its delivered bytes and keep costs');
  assert.equal(h.real.stats.bytes,limit,'the page-store charge of the delivered buffer needed no free byte');
  assert.equal(lease.bytes.byteLength,SIZE);
  greedy.stop();lease.release();claim.release();other.release();h.store.evictRecent();
  assert.equal(h.real.stats.bytes,0);
});

test('delivery that needs growth the ledger refuses rejects, keeps the claim as it was and holds nothing',timeout,async()=>{
  const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h),{claim,keep}=read;
  const other=h.fill(limit-h.real.stats.bytes),before=claim.bytes;
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  // A view whose underlying allocation is larger than the admitted envelope.
  const buffer=3*MAX;h.reads[0].resolve(new Uint8Array(new ArrayBuffer(buffer),0,SIZE));
  let refusal;
  await assert.rejects(pending,error=>(refusal=error) instanceof api.ResourceBudgetExceededError&&error instanceof api.ResourceByteDeliveryRefusedError&&
    error.name==='ResourceBudgetExceededError'&&error.code==='RESOURCE_BYTE_DELIVERY_REFUSED'&&
    error.claimBytes===KEEP+buffer&&error.deliveredBytes===buffer&&error.unfit===false);
  assert.deepEqual({envelopeBytes:refusal.envelopeBytes,beyondEnvelopeBytes:refusal.beyondEnvelopeBytes,retryBytes:refusal.retryBytes},
    {envelopeBytes:buffer,beyondEnvelopeBytes:buffer-ENVELOPE,retryBytes:KEEP+buffer},'the retry sizes come with the refusal');
  assert.equal(claim.bytes,before,'a refused adjust keeps the prior costs');
  await settle();
  assert.equal(h.real.stats.bytes,limit,'no part of the delivery stays charged anywhere else');
  assert.equal(h.real.stats.availabilityListeners,0,'the transport registered no wait');
  assert.equal(h.transport.stats.consumers,0);assert.equal(h.transport.stats.admittedRefusals,1);
  claim.release();assert.equal(h.real.stats.bytes,other.bytes,'the caller releases everything it held');
  // The caller waits holding nothing, then admits the reported retry at once.
  other.release();
  const envelope=api.resourceByteAdmittedEnvelope(A,MAX,refusal.envelopeBytes),retry=h.admit([...keep,...envelope]);
  assert.equal(retry.bytes,refusal.retryBytes);
  const again=h.transport.acquireBytes(A,live(),MAX,{admitted:retry,envelope,keep});
  await until(()=>h.reads.length===2,'the refused production left no copy, so the retry reads again');
  h.reads[1].resolve(new Uint8Array(new ArrayBuffer(buffer),0,SIZE));
  const lease=await again;
  assert.equal(retry.bytes,KEEP+buffer);assert.equal(h.real.stats.bytes,KEEP+buffer);
  lease.release();retry.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a refused delivery whose retry alone exceeds the ledger is reported as not fitting',timeout,async()=>{
  {const limit=256*KiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:64*KiB}),read=readClaim(h);
   const pending=h.acquire(A,live(),MAX,read);
   await until(()=>h.reads.length===1,'the read is issued');
   h.reads[0].resolve(new Uint8Array(new ArrayBuffer(limit),0,SIZE));
   await assert.rejects(pending,error=>error instanceof api.ResourceByteDeliveryRefusedError&&error.unfit===true&&error.claimBytes===KEEP+limit&&error.retryBytes===KEEP+limit);
   assert.equal(read.claim.bytes,KEEP+ENVELOPE);read.claim.release();await settle();assert.equal(h.real.stats.bytes,0);}
  // Keep growth: the delivered claim would fit, but a retry also admits a whole envelope beside keep.
  {const limit=256*KiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:64*KiB}),read=readClaim(h),keep=keepCosts(160*KiB);
   const other=h.fill(limit-h.real.stats.bytes);
   const pending=h.acquire(A,live(),MAX,{...read,keep});
   await until(()=>h.reads.length===1,'the keep-growth read is issued');
   h.reads[0].resolve(new Uint8Array(SIZE));
   await assert.rejects(pending,error=>error instanceof api.ResourceByteDeliveryRefusedError&&error.claimBytes===160*KiB+SIZE&&
     error.claimBytes<=limit&&error.retryBytes===160*KiB+ENVELOPE&&error.unfit===true);
   read.claim.release();other.release();await settle();assert.equal(h.real.stats.bytes,0);}
});

test('keep costs larger than the claim can take are growth: a refusal keeps the claim unchanged and its retry sizes are never negative',timeout,async()=>{
  const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h),before=read.claim.bytes;
  const other=h.fill(limit-h.real.stats.bytes),keep=keepCosts(KEEP+ENVELOPE);
  const pending=h.acquire(A,live(),MAX,{...read,keep});
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  let refusal;await assert.rejects(pending,error=>(refusal=error) instanceof api.ResourceByteDeliveryRefusedError);
  assert.equal(read.claim.bytes,before);assert.equal(h.real.stats.bytes,limit);
  assert.deepEqual({claimBytes:refusal.claimBytes,envelopeBytes:refusal.envelopeBytes,beyondEnvelopeBytes:refusal.beyondEnvelopeBytes,retryBytes:refusal.retryBytes,unfit:refusal.unfit},
    {claimBytes:KEEP+ENVELOPE+SIZE,envelopeBytes:ENVELOPE,beyondEnvelopeBytes:0,retryBytes:KEEP+2*ENVELOPE,unfit:false});
  read.claim.release();other.release();await settle();assert.equal(h.real.stats.bytes,0);
  // The documented retry: one claim of [...keep, ...an envelope minted with envelopeBytes].
  const envelope=api.resourceByteAdmittedEnvelope(A,MAX,refusal.envelopeBytes),retry=h.admit([...keep,...envelope]);
  assert.equal(retry.bytes,refusal.retryBytes);
  const again=h.transport.acquireBytes(A,live(),MAX,{admitted:retry,envelope,keep});
  await until(()=>h.reads.length===2,'the retry reads again');
  h.reads[1].resolve(new Uint8Array(SIZE));
  const lease=await again;assert.equal(retry.bytes,KEEP+ENVELOPE+SIZE);
  lease.release();retry.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('aborting a caller-admitted read stops its production, never touches the claim, and holds nothing once the read settles',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h),{claim}=read,before=claim.bytes;
  const controller=new AbortController(),pending=h.acquire(A,controller.signal,MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
  assert(h.reads[0].signal.aborted,'its only consumer left, so the shared production was cancelled');
  assert.equal(claim.bytes,before);assert.equal(h.real.stats.bytes,before,'the claim and the abandoned read list one envelope');
  h.reads[0].resolve(new Uint8Array(SIZE));await settle();await settle();
  assert.equal(claim.bytes,before,'a late body is never delivered to an abandoned claim');
  assert.equal(h.transport.stats.admittedDeliveries,0);assert.equal(h.transport.stats.admittedAbandoned,1);
  assert.equal(h.real.stats.bytes,before,'only the claim lists the envelope once the read settled');
  claim.release();assert.equal(h.real.stats.bytes,0);assert(h.transport.idle);
  assert.equal(h.transport.stats.admittedProductions,0);assert.equal(h.store.stats.resources,0);
});

test('an abandoned in-flight read stays charged by its entry after the caller releases the claim, until the read settles',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h,A,MAX,[]),controller=new AbortController();
  const pending=h.acquire(A,controller.signal,MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  controller.abort();await assert.rejects(pending,{name:'AbortError'});read.claim.release();
  assert.deepEqual(h.category('read'),{bytes:ENVELOPE,exactBytes:0,estimatedBytes:ENVELOPE},'the read has not settled: its entry still charges the envelope');
  const whole=h.budget.tryReserve(cost('decoded',h.real.stats.limitBytes,'another owner'));
  assert.equal(whole.ok,false,'another owner cannot admit the bytes the abandoned read may still hold');
  h.reads[0].resolve(new Uint8Array(SIZE));await settle();await settle();
  assert.equal(h.real.stats.bytes,0,'the settled read returns its envelope');
  const after=h.budget.tryReserve(cost('decoded',h.real.stats.limitBytes,'another owner'));
  assert.equal(after.ok,true);after.reservation.release();
  assert.equal(h.store.stats.resources,0);
});

test('transport.destroy rejects caller-admitted reads and a 3-argument reader sharing one; abandoned reads stay charged until they settle',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts();
  const a=readClaim(h,A,MAX,keep),b=readClaim(h,B,MAX,keep),held=a.claim.bytes+b.claim.bytes;
  const pa=h.acquire(A,live(),MAX,a),pb=h.acquire(B,live(),MAX,b);
  const legacy=h.transport.acquireBytes(A,live(),MAX);
  await until(()=>h.reads.length===2,'both admitted reads are issued');
  assert.equal(h.real.stats.bytes,held,'the 3-argument reader of A joined the admitted read holding nothing');
  h.transport.destroy();
  for(const pending of [pa,pb,legacy])await assert.rejects(pending,{name:'AbortError'});
  assert(h.reads.every(read=>read.signal.aborted));
  assert.equal(h.real.stats.bytes,held,'only the callers\' claims, and the envelopes their reads share, remain');
  assert.equal(h.real.stats.availabilityListeners,0);
  a.claim.release();b.claim.release();
  assert.equal(h.real.stats.bytes,2*ENVELOPE,'the cancelled reads have not settled: their entries keep the envelopes');
  for(const read of h.reads)read.reject(read.signal.reason);
  await settle();await settle();
  assert.equal(h.real.stats.bytes,0);
  assert.equal(h.transport.stats.consumers,0);assert.equal(h.transport.stats.admittedProductions,0);assert.equal(h.store.stats.resources,0);
});

test('a failed read rejects with its error and leaves the claim and its envelope free for a retry with the same claim',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h),{claim}=read,before=claim.bytes;
  const first=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].reject(new TypeError('network'));
  // The page store hands every consumer its bounded copy of the production failure.
  await assert.rejects(first,{name:'TypeError',message:'network'});
  assert.equal(claim.bytes,before);assert.equal(h.real.stats.bytes,before,'the failed entry released its share of the envelope');
  const second=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===2,'the retry reads again');
  h.reads[1].resolve(new Uint8Array(SIZE));
  const lease=await second;assert.equal(claim.bytes,KEEP+SIZE);
  lease.release();claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('one delivered buffer is counted once across the claim, a 3-argument consumer, its recent copy and a later admitted hit',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),read=readClaim(h,A,MAX,keep);
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const first=await pending,buffer=first.bytes.buffer;
  const legacy=await h.transport.acquireBytes(A,live(),MAX);
  assert.equal(h.reads.length,1,'the 3-argument consumer hits the charged entry');
  assert.equal(legacy.bytes.buffer,buffer);
  assert.deepEqual(h.category('read'),{bytes:SIZE,exactBytes:SIZE,estimatedBytes:0});
  first.release();read.claim.release();
  assert.equal(h.real.stats.bytes,SIZE,'the entry keeps the buffer charged for its remaining consumer');
  legacy.release();
  assert.equal(h.real.stats.recentBytes,SIZE,'the released buffer stays only as one bounded recent copy');
  const later=readClaim(h,A,MAX,keep);
  const hit=h.acquire(A,live(),MAX,later);
  assert.equal(later.claim.bytes,KEEP+SIZE,'a usable hit delivers in the same call: the claim shrinks before any await');
  assert.equal(h.real.stats.bytes,KEEP+SIZE,'the hit is counted once beside the claim\'s keep costs');
  const third=await hit;assert.equal(h.reads.length,1,'no second network read');
  assert.equal(third.bytes.buffer,buffer);
  third.release();later.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a 3-argument reader joins an in-flight caller-admitted read holding nothing and shares its buffer',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h),held=read.claim.bytes;
  const admitted=h.acquire(A,live(),MAX,read);
  const legacy=h.transport.acquireBytes(A,live(),MAX);
  await until(()=>h.reads.length===1,'the admitted read is issued');
  assert.equal(h.real.stats.bytes,held,'the 3-argument reader reserved no envelope of its own');
  assert.equal(h.real.stats.availabilityListeners,0,'and waits on that read, not on capacity');
  assert.equal(h.transport.stats.consumers,2);
  h.reads[0].resolve(new Uint8Array(SIZE));
  const [x,y]=await Promise.all([admitted,legacy]);
  assert.equal(h.reads.length,1,'one network read served both');
  assert.equal(x.bytes.buffer,y.bytes.buffer);
  assert.equal(h.real.stats.bytes,KEEP+SIZE);
  x.release();read.claim.release();assert.equal(h.real.stats.bytes,SIZE,'the 3-argument consumer still holds a charged buffer');
  y.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a 3-argument reader keeps an admitted read alive after its owner leaves: the entry still charges the envelope and no AbortError is handed on',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h),controller=new AbortController();
  const admitted=h.acquire(A,controller.signal,MAX,read);
  const legacy=h.transport.acquireBytes(A,live(),MAX);
  await until(()=>h.reads.length===1,'the admitted read is issued');
  controller.abort();await assert.rejects(admitted,{name:'AbortError'});read.claim.release();
  assert(!h.reads[0].signal.aborted,'the 3-argument reader keeps the read');
  assert.deepEqual(h.category('read'),{bytes:ENVELOPE,exactBytes:0,estimatedBytes:ENVELOPE},'its entry keeps the owner\'s envelope charged');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await legacy;assert.equal(lease.bytes.byteLength,SIZE);
  assert.equal(h.reads.length,1,'the same read served it');
  assert.deepEqual(h.category('read'),{bytes:SIZE,exactBytes:SIZE,estimatedBytes:0});
  lease.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a 3-argument reader sharing an admitted read shares its read failure, and gets the buffer past an owner refusal only if the ledger has room for it',timeout,async()=>{
  {const h=transportHarness(api),read=readClaim(h);
   const admitted=h.acquire(A,live(),MAX,read),legacy=h.transport.acquireBytes(A,live(),MAX);
   await until(()=>h.reads.length===1,'read failure: the admitted read is issued');
   h.reads[0].reject(new Error('boom'));
   await assert.rejects(admitted,/boom/);await assert.rejects(legacy,/boom/,'like any read two consumers share');
   assert.equal(read.claim.bytes,KEEP+ENVELOPE);read.claim.release();
   assert.equal(h.real.stats.bytes,0);assert.equal(h.reads.length,1);}
  for(const room of [64*KiB,32*KiB]){
    const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),read=readClaim(h),before=read.claim.bytes;
    // The owner's keep needs 112 KiB more than its claim; the shared buffer needs 48 KiB beside the owner's envelope.
    const other=h.fill(limit-h.real.stats.bytes-room),keep=keepCosts(KEEP+ENVELOPE+64*KiB);
    const admitted=h.acquire(A,live(),MAX,{...read,keep}),legacy=h.transport.acquireBytes(A,live(),MAX);
    await until(()=>h.reads.length===1,room+': the admitted read is issued');
    h.reads[0].resolve(new Uint8Array(SIZE));
    await assert.rejects(admitted,api.ResourceByteDeliveryRefusedError,room+': the owner is refused');
    assert.equal(read.claim.bytes,before,room+': its claim is unchanged');
    if(room>=SIZE){
      const lease=await legacy;assert.equal(lease.bytes.byteLength,SIZE,room+': the sharing reader gets the buffer');
      assert.equal(h.real.stats.bytes,other.bytes+before+SIZE,room+': the buffer is charged once beside the owner claim');
      lease.release();
    }else await assert.rejects(legacy,api.ResourceBudgetExceededError,room+': without room the shared production is refused, and nothing waits');
    read.claim.release();other.release();h.store.evictRecent();await settle();
    assert.equal(h.real.stats.bytes,0,room+': nothing stays charged');assert.equal(h.real.stats.availabilityListeners,0,room);
  }
});

test('a caller-admitted consumer that joins inside the delivery wave is delivered in its own continuation',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),first=readClaim(h,A,MAX,keep),second=readClaim(h,A,MAX,keep);
  let joined;
  const stop=h.real.onAvailable(()=>{if(!joined)joined=h.acquire(A,live(),MAX,second);});
  const x=h.acquire(A,live(),MAX,first);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const p=await x;stop();
  assert(joined,'the first claim\'s shrink woke the listener during delivery');
  const q=await joined;
  assert.equal(h.reads.length,1);assert.equal(p.bytes.buffer,q.bytes.buffer);
  assert.equal(second.claim.bytes,KEEP+SIZE);assert.equal(h.real.stats.bytes,2*KEEP+SIZE);
  p.release();q.release();first.claim.release();second.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('transport.destroy inside the delivery wave rejects the read and leaves only the caller claim',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h),{claim}=read;
  const stop=h.real.onAvailable(()=>h.transport.destroy());
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  await assert.rejects(pending,{name:'AbortError'});stop();
  await settle();
  assert.equal(claim.bytes,KEEP+SIZE,'the in-place delivery had already happened when the wave destroyed the transport');
  assert.equal(h.real.stats.bytes,KEEP+SIZE,'no store charge survives beside the claim');
  claim.release();assert.equal(h.real.stats.bytes,0);
  assert.equal(h.transport.stats.consumers,0);assert.equal(h.transport.stats.admittedProductions,0);assert.equal(h.store.stats.resources,0);
});

test('two caller-admitted consumers share one read; its entry keeps the first envelope charged when the first leaves',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),first=readClaim(h,A,MAX,keep),second=readClaim(h,A,MAX,keep);
  const controller=new AbortController();
  const x=h.acquire(A,controller.signal,MAX,first);
  const y=h.acquire(A,live(),MAX,second);
  await until(()=>h.reads.length===1,'one read for both');
  assert.equal(h.real.stats.bytes,first.claim.bytes+second.claim.bytes,'the entry shares the first envelope; the second claim keeps its own until delivery (conservative)');
  controller.abort();await assert.rejects(x,{name:'AbortError'});first.claim.release();
  assert(!h.reads[0].signal.aborted,'the remaining consumer keeps the production');
  assert.equal(h.real.stats.bytes,ENVELOPE+second.claim.bytes,'the entry still charges the first envelope');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await y;
  assert.equal(second.claim.bytes,KEEP+SIZE);assert.equal(h.real.stats.bytes,KEEP+SIZE);
  lease.release();second.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a smaller-ceiling joiner never narrows the coverage of a larger read when the larger owner leaves',timeout,async()=>{
  const h=transportHarness(api),controller=new AbortController(),small=MAX/4;
  const big=readClaim(h,A,MAX,[]),little=readClaim(h,A,small,[]);
  const x=h.acquire(A,controller.signal,MAX,big),y=h.acquire(A,live(),small,little);
  await until(()=>h.reads.length===1,'one read at the larger ceiling');
  assert.equal(h.reads[0].max,MAX);
  controller.abort();await assert.rejects(x,{name:'AbortError'});big.claim.release();
  assert(!h.reads[0].signal.aborted,'the joiner keeps the read');
  assert.equal(h.real.stats.bytes,ENVELOPE+2*small,`the read at ceiling ${MAX} stays charged at its full envelope beside the joiner claim`);
  h.reads[0].resolve(new Uint8Array(small));
  const lease=await y;assert.equal(lease.bytes.byteLength,small);
  assert.equal(little.claim.bytes,small,'the joiner claim lists the delivered buffer');assert.equal(h.real.stats.bytes,small);
  lease.release();little.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('two caller-admitted consumers of one read are both delivered and the buffer is counted once',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),first=readClaim(h,A,MAX,keep),second=readClaim(h,A,MAX,keep);
  const x=h.acquire(A,live(),MAX,first);
  const y=h.acquire(A,live(),MAX,second);
  await until(()=>h.reads.length===1,'one read for both');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const [p,q]=await Promise.all([x,y]);
  assert.equal(p.bytes.buffer,q.bytes.buffer);
  assert.equal(first.claim.bytes,KEEP+SIZE);assert.equal(second.claim.bytes,KEEP+SIZE);
  assert.equal(h.real.stats.bytes,2*KEEP+SIZE,'two keep sets, one delivered buffer');
  p.release();q.release();first.claim.release();second.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a caller-admitted consumer that joins a 3-argument read is delivered on its claim and counted once',timeout,async()=>{
  const h=transportHarness(api);
  const legacy=h.transport.acquireBytes(A,live(),MAX);
  const read=readClaim(h);
  const admitted=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'one read for both');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const [x,y]=await Promise.all([legacy,admitted]);
  assert.equal(x.bytes.buffer,y.bytes.buffer);
  assert.equal(read.claim.bytes,KEEP+SIZE);assert.equal(h.real.stats.bytes,KEEP+SIZE,'the entry\'s exact charge and the claim share one identity');
  x.release();y.release();read.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a 3-argument reader of a second transport on the same page store shares an admitted read, which stays charged when its owner leaves',timeout,async()=>{
  const h=transportHarness(api),secondReads=[];
  const second=api.createResourceByteTransport({namespace:'core-transport-test',resourceStore:h.store,
    read:()=>new Promise((resolve,reject)=>{secondReads.push({resolve,reject});})});
  const controller=new AbortController(),read=readClaim(h,A,MAX,[]);
  const owner=h.acquire(A,controller.signal,MAX,read);
  const legacy=second.acquireBytes(A,live(),MAX);
  await until(()=>h.reads.length===1,'the admitted read is issued');
  assert.equal(secondReads.length,0,'the second transport shares that read');
  controller.abort();await assert.rejects(owner,{name:'AbortError'});read.claim.release();
  assert(!h.reads[0].signal.aborted,'the second transport\'s reader keeps it');
  assert.equal(h.real.stats.bytes,ENVELOPE,'the shared read stays charged at its envelope');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await legacy;assert.equal(lease.bytes.byteLength,SIZE);
  assert.equal(h.real.stats.bytes,SIZE);
  lease.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a page-store production context can be the admitted claim (an entry whose estimate lists the envelope)',timeout,async()=>{
  const h=transportHarness(api),decode=cost('construction',96*KiB,'decode working set'),envelope=api.resourceByteAdmittedEnvelope(A,MAX);
  const estimate=[decode,...envelope],admittedBytes=decode.bytes+ENVELOPE;
  let during;h.probe.reset();
  const entry=h.store.acquire({contentKey:'core-transport-texture',role:'source',estimate,
    produce:async context=>{
      const lease=await h.transport.acquireBytes(A,context.signal,MAX,{admitted:context,envelope,keep:[decode]});
      try{during=h.real.stats.bytes;return{width:1};}finally{lease.release();}
    },
    costs:()=>cost('texture',4*KiB,'decoded result','exact'),dispose(){}});
  await until(()=>h.reads.length===1,'the read is issued from inside the production');
  assert.equal(h.real.stats.bytes,admittedBytes,'only the entry estimate is charged during the read');
  h.reads[0].resolve(new Uint8Array(SIZE));
  await entry.ready;
  assert.equal(during,decode.bytes+SIZE,'delivery replaced the entry\'s envelope by the delivered bytes in place');
  assert(h.probe.peak.bytes<=admittedBytes,'the ledger never exceeded the entry estimate');
  entry.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('an abandoned production-context claim leaves its read charged until the read settles',timeout,async()=>{
  const h=transportHarness(api),decode=cost('construction',96*KiB,'decode working set'),envelope=api.resourceByteAdmittedEnvelope(A,MAX);
  const entry=h.store.acquire({contentKey:'core-transport-texture',role:'source',estimate:[decode,...envelope],
    produce:async context=>{(await h.transport.acquireBytes(A,context.signal,MAX,{admitted:context,envelope,keep:[decode]})).release();return 1;},dispose(){}});
  await until(()=>h.reads.length===1,'the read is issued from inside the production');
  entry.release();await settle();await settle();
  assert(h.reads[0].signal.aborted,'the texture production left, so its byte read was cancelled');
  assert.equal(h.store.stats.resources,1,'only the in-flight byte read remains');
  assert.equal(h.real.stats.bytes,ENVELOPE,'the texture entry is gone; the in-flight read is still charged');
  h.reads[0].resolve(new Uint8Array(SIZE));await settle();await settle();
  assert.equal(h.real.stats.bytes,0);assert.equal(h.store.stats.resources,0);
});

test('caller-admitted options are validated before anything is read or reserved',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),read=readClaim(h,A,MAX,keep),{claim,envelope}=read,signal=live();
  await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{}),TypeError);
  await assert.rejects(h.transport.acquireBytes(A,signal,MAX,null),TypeError);
  for(const unminted of [undefined,api.resourceByteReadEnvelope(A,MAX),[...envelope]])
    await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{admitted:claim,envelope:unminted,keep}),{name:'TypeError',message:/minted by resourceByteAdmittedEnvelope/},'only a minted envelope');
  await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{admitted:claim,envelope,keep:'none'}),TypeError);
  await assert.rejects(h.transport.acquireBytes(A,signal,2*MAX,{admitted:claim,envelope,keep}),RangeError,'an envelope smaller than this read');
  const small=h.admit(keep);
  await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{admitted:small,envelope:api.resourceByteAdmittedEnvelope(A,MAX),keep}),RangeError,'a claim smaller than its envelope');
  small.release();
  await assert.rejects(h.transport.acquireBytes(A,signal,0,{admitted:claim,envelope,keep}),RangeError);
  for(const [bad,error] of [[{category:'nonsense',bytes:1,precision:'exact'},TypeError],[{category:'decoded',bytes:-1,precision:'exact'},RangeError],
    [{category:'unmeasured-driver',bytes:1,precision:'exact'},TypeError],[envelope[0],TypeError]])
    await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{admitted:claim,envelope,keep:[bad]}),error,'an invalid keep cost fails before the read');
  const other=transportHarness(api);let foreign;
  const entry=other.store.acquire({contentKey:'foreign',role:'source',estimate:[],produce:context=>{foreign=context;return 1;}});
  await assert.rejects(h.transport.acquireBytes(A,signal,MAX,{admitted:foreign,envelope,keep}),TypeError,'a production context of another ledger');
  entry.release();
  const released=readClaim(h,B,MAX,keep);released.claim.release();
  await assert.rejects(h.acquire(B,signal,MAX,released),/no longer active/);
  const aborted=new AbortController();aborted.abort();
  assert.throws(()=>h.acquire(A,aborted.signal,MAX,read),{name:'AbortError'},'an aborted signal throws at once, as on the 3-argument path');
  assert.equal(h.reads.length,0);assert.equal(h.real.stats.bytes,claim.bytes);
  h.transport.destroy();
  await assert.rejects(h.acquire(A,signal,MAX,read),{name:'AbortError'});
  claim.release();assert.equal(h.real.stats.bytes,0);
});

test('keep costs are copied when the call starts: a later change to the array does not change what delivery lists',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),read=readClaim(h,A,MAX,keep);
  const pending=h.acquire(A,live(),MAX,read);
  keep.push(cost('decoded',ENVELOPE,'pushed after the call'));
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;assert.equal(read.claim.bytes,KEEP+SIZE);
  lease.release();read.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a claim that does not list its envelope is refused before anything is read, and nothing waits',timeout,async()=>{
  {const h=transportHarness(api),keep=keepCosts(),envelope=api.resourceByteAdmittedEnvelope(A,MAX);
   // An unminted envelope of the same size: the entry's reservation of the minted one would grow the ledger.
   const claim=h.admit([...keep,...api.resourceByteReadEnvelope(A,MAX)]),before=h.real.stats.bytes;
   await assert.rejects(h.transport.acquireBytes(A,live(),MAX,{admitted:claim,envelope,keep}),TypeError);
   assert.equal(h.reads.length,0,'nothing is read');assert.equal(h.real.stats.bytes,before,'nothing stays reserved');
   assert.equal(claim.bytes,before);claim.release();assert.equal(h.store.stats.resources,0);}
  {const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),keep=keepCosts(),envelope=api.resourceByteAdmittedEnvelope(A,MAX);
   const claim=h.admit([...keep,...api.resourceByteReadEnvelope(A,MAX)]),other=h.fill(limit-h.real.stats.bytes);
   await assert.rejects(h.transport.acquireBytes(A,live(),MAX,{admitted:claim,envelope,keep}),TypeError,'a full ledger refuses that reservation outright');
   assert.equal(h.reads.length,0);assert.equal(h.real.stats.bytes,limit);assert.equal(h.real.stats.availabilityListeners,0);
   claim.release();other.release();assert.equal(h.real.stats.bytes,0);}
});

test('a claim released before delivery leaves the read charged by its entry, and that consumer is then rejected',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h,A,MAX,[]);
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  read.claim.release();
  assert.equal(h.real.stats.bytes,ENVELOPE,'the entry keeps the envelope charged');
  h.reads[0].resolve(new Uint8Array(SIZE));
  await assert.rejects(pending,/released before delivery/);
  await settle();
  assert.equal(h.real.stats.bytes,0);assert.equal(h.store.stats.resources,0);
});

test('one envelope covers one read: refused while its read is in flight or abandoned, free again once that read settles',timeout,async()=>{
  const h=transportHarness(api),read=readClaim(h,A,MAX,[]),controller=new AbortController();
  const first=h.acquire(A,controller.signal,MAX,read);
  // A second claim listing the same envelope (its identities are shared, so it adds no byte).
  const other={claim:h.admit([...read.envelope]),envelope:read.envelope,keep:[]};
  await assert.rejects(h.acquire(B,live(),MAX,other),/already covers another read/);
  await until(()=>h.reads.length===1,'the first read is issued');
  controller.abort();await assert.rejects(first,{name:'AbortError'});
  await assert.rejects(h.acquire(B,live(),MAX,other),/already covers another read/,'the abandoned read still reserves it');
  assert.equal(h.reads.length,1);
  h.reads[0].resolve(new Uint8Array(SIZE));await settle();await settle();
  const again=h.acquire(B,live(),MAX,other);
  await until(()=>h.reads.length===2,'the settled envelope covers a new read');
  h.reads[1].resolve(new Uint8Array(SIZE));(await again).release();
  read.claim.release();other.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('keep may exceed the claim\'s own costs while the delivered claim still fits it: no growth, even on a full ledger',timeout,async()=>{
  const limit=MiB,h=transportHarness(api,{limitBytes:limit,recentLimitBytes:256*KiB}),envelope=api.resourceByteAdmittedEnvelope(A,MAX);
  // Admitted as max(envelope, buffer + working set): the parse working set reuses the envelope's bytes after delivery.
  const working=ENVELOPE-SIZE,keep=[cost('decoded',working,'parse working set')],claim=h.admit([...envelope]),other=h.fill(limit-h.real.stats.bytes);
  const pending=h.transport.acquireBytes(A,live(),MAX,{admitted:claim,envelope,keep});
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;
  assert.equal(claim.bytes,working+SIZE);assert.equal(h.real.stats.bytes,limit,'the claim became [...keep, buffer] in place');
  lease.release();claim.release();other.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('one claim carries one read at a time: a concurrent second read with it is refused before anything happens',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts(),ea=api.resourceByteAdmittedEnvelope(A,MAX),eb=api.resourceByteAdmittedEnvelope(B,MAX);
  const claim=h.admit([...keep,...ea,...eb]);
  const first=h.transport.acquireBytes(A,live(),MAX,{admitted:claim,envelope:ea,keep});
  await assert.rejects(h.transport.acquireBytes(B,live(),MAX,{admitted:claim,envelope:eb,keep}),/already carries another read/);
  await until(()=>h.reads.length===1,'only the first read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await first;assert.equal(claim.bytes,KEEP+SIZE);
  lease.release();claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a consumer whose ceiling is below an existing delivered buffer rejects and keeps its claim',timeout,async()=>{
  const h=transportHarness(api),keep=keepCosts();
  const legacy=h.transport.acquireBytes(A,live(),MAX);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));const held=await legacy;
  const small=SIZE/2,read=readClaim(h,A,small,keep),before=read.claim.bytes;
  await assert.rejects(h.acquire(A,live(),small,read),/consumer limit exceeded/);
  assert.equal(read.claim.bytes,before);
  held.release();read.claim.release();h.store.evictRecent();assert.equal(h.real.stats.bytes,0);
});

test('a recent hit cancelled inside the store wake wave returns its lease, so nothing stays pinned',timeout,async()=>{
  for(const how of ['abort','destroy']){
    const h=transportHarness(api);
    const first=h.transport.acquireBytes(A,live(),MAX);
    await until(()=>h.reads.length===1,how+': the read is issued');
    h.reads[0].resolve(new Uint8Array(SIZE));(await first).release();
    assert.equal(h.real.stats.recentBytes,SIZE,how+': a recent copy');
    const controller=new AbortController(),read=readClaim(h,A,MAX,[]);
    const stop=h.real.onAvailable(()=>{if(how==='abort')controller.abort();else h.transport.destroy();});
    await assert.rejects(h.acquire(A,controller.signal,MAX,read),{name:'AbortError'});stop();
    assert.equal(read.claim.bytes,ENVELOPE,how+': the claim is unchanged');
    read.claim.release();await settle();h.store.evictRecent();
    assert.equal(h.real.stats.bytes,0,how+': no lease pins the buffer');
    assert.equal(h.store.stats.resources,0,how);assert.equal(h.store.stats.roles,0,how);
  }
});

test('a released admitted read keeps a recent copy only if the recent subset admits it, and never waits for one',timeout,async()=>{
  const h=transportHarness(api,{limitBytes:MiB,recentLimitBytes:SIZE/2}),keep=keepCosts(),read=readClaim(h,A,MAX,keep);
  const pending=h.acquire(A,live(),MAX,read);
  await until(()=>h.reads.length===1,'the read is issued');
  h.reads[0].resolve(new Uint8Array(SIZE));
  const lease=await pending;lease.release();
  assert.equal(h.real.stats.recentBytes,0,'a copy larger than the recent subset is not kept');
  assert.equal(h.real.stats.availabilityListeners,0);
  read.claim.release();assert.equal(h.real.stats.bytes,0);
  const again=readClaim(h,A,MAX,keep),next=h.acquire(A,live(),MAX,again);
  await until(()=>h.reads.length===2,'without a recent copy the next read goes to the network');
  h.reads[1].resolve(new Uint8Array(SIZE));(await next).release();again.claim.release();assert.equal(h.real.stats.bytes,0);
});

test('the 3-argument path keeps its own envelope admission and capacity wait, with no admitted state',timeout,async()=>{
  const max=2*MiB,h=transportHarness(api,{limitBytes:3*max,recentLimitBytes:MiB});
  const first=h.transport.acquireBytes(A,live(),max);
  assert.deepEqual(h.category('read'),{bytes:2*max,exactBytes:0,estimatedBytes:2*max},'admitted synchronously before the request');
  const second=h.transport.acquireBytes(B,live(),max);
  await settle();
  assert.deepEqual(h.reads.map(read=>read.path),[A],'the second read waits for capacity');
  assert.equal(h.real.stats.availabilityListeners,1);
  h.reads[0].resolve(new Uint8Array(max));
  const a=await first;
  await until(()=>h.reads.length===2,'the shrink wakes the waiting read');
  h.reads[1].resolve(new Uint8Array(max));
  const b=await second;
  assert.deepEqual({admittedReads:h.transport.stats.admittedReads,admittedAbandoned:h.transport.stats.admittedAbandoned,admittedProductions:h.transport.stats.admittedProductions},
    {admittedReads:0,admittedAbandoned:0,admittedProductions:0});
  a.release();b.release();assert.equal(h.real.stats.bytes,0);
});
