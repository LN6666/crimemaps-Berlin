import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoader,src,microtasks} from './support/core-solar-program-modules.mjs';

// The verified solar boundary index on the page ledger, entered without hold
// and wait. tryAdmitSolarShadowBoundary admits at once or refuses with nothing
// allocated, cached or registered. A hand-off claim (admitSolarShadowBoundary /
// tryAdmitSolarShadowBoundary `claim`) holding exactly the index bytes takes the
// index identities in place: no byte is given back, so no availability wave
// runs between the caller's admission and the module's, and a listener that
// reserves inside a wave cannot take the bytes. A growth that a pressure
// eviction paid for is no such hand-off, and a claim of another ledger is found
// with a zero-byte probe that moves nothing on the admitting ledger. Since an
// insertion runs no wave, waiters of the same hash are told in a microtask
// (onSolarShadowBoundaryCached). The real module and ledger run here; the
// "thief" is a listener that reserves synchronously in every wave.
const load=createLoader();
const solar=load(src('safety','solar-shadow-admission.ts'));
const {createResourceBudget,ResourceBudgetExceededError}=load(src('safety','render-runtime','resource-budget.ts'));
const MiB=1024*1024,WRAPPER=solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
let serial=0;const nextSha=()=>(0x5017a000+(++serial)).toString(16).padStart(64,'0');
const square=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const boundary=()=>({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square(13.3,52.4,13.5,52.6),square(13.35,52.45,13.4,52.5)]}});
const required=value=>solar.solarShadowBoundaryIndexBytes(value)+WRAPPER;
const ledger=(limitBytes=MiB)=>createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,MiB/4)});
const placeholder=(budget,value,extra=0)=>budget.reserve({category:'shadow',bytes:required(value)+extra,precision:'estimate',label:'hand-off placeholder'});
const stats=()=>solar.solarShadowBoundaryCacheStats();
/** Reserves every free byte synchronously inside each availability wave. */
function thief(budget){
 const taken=[];let calls=0;
 const off=budget.onAvailable(()=>{calls++;const free=budget.stats.availableBytes;if(!free)return;const result=budget.tryReserve({category:'texture',bytes:free,precision:'exact',label:'synchronous wave reserver'});if(result.ok)taken.push(result.reservation);});
 return{get calls(){return calls;},taken,stop(){off();for(const claim of taken)claim.release();}};
}
/** Index buffers constructed while `run` runs, with the shadow bytes charged then. */
function allocations(budget,run){
 const Original=globalThis.ArrayBuffer,built=[];
 globalThis.ArrayBuffer=new Proxy(Original,{construct(target,args){built.push({bytes:args[0],charged:budget.stats.categories.shadow?.bytes??0});return Reflect.construct(target,args);}});
 try{return{value:run(),built};}catch(error){error.built=built;throw error;}finally{globalThis.ArrayBuffer=Original;}
}
const ownedSignal=()=>new AbortController().signal;
/** Counts timers created while a case runs (a wait must create none). */
function countTimers(){const saved=globalThis.setTimeout;let count=0;globalThis.setTimeout=(...args)=>{count++;return saved(...args);};return{get count(){return count;},restore(){globalThis.setTimeout=saved;}};}

test('tryAdmit admits the exact index before its buffer exists, reuses a cached hash without admission and registers no wait',()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 const {value:prepared,built}=allocations(budget,()=>solar.tryAdmitSolarShadowBoundary(value,{budget}));
 assert.deepEqual(built,[{bytes:bytes-WRAPPER,charged:bytes}],'one exact buffer, charged before construction');
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),prepared);
 assert.deepEqual(solar.solarShadowBoundaryCosts(prepared).map(cost=>[cost.category,cost.bytes,cost.precision]),[['shadow',bytes-WRAPPER,'exact'],['shadow',WRAPPER,'estimate']]);
 assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.availabilityListeners,0);
 const reservations=budget.stats.reservations;
 assert.equal(solar.tryAdmitSolarShadowBoundary(value,{budget}),prepared,'a cached hash is returned');assert.equal(budget.stats.reservations,reservations,'without a second admission');
 assert.equal(prepared.covers([13.31,52.41,13.32,52.42]),true);assert.equal(prepared.covers([13.36,52.46,13.37,52.47]),false);
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary({boundarySHA256:'x',geometry:value.geometry},{budget}),/Invalid verified solar boundary/);
});

test('a refused tryAdmit throws the ledger error with nothing allocated, cached or waiting, so the caller returns its claims and waits holding nothing',()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 const lease=budget.reserve({category:'metadata',bytes:4096,precision:'exact',label:'caller lease'}),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes+1,precision:'exact'});
 const before=stats(),reservations=budget.stats.reservations;
 let refusal;
 assert.throws(()=>allocations(budget,()=>solar.tryAdmitSolarShadowBoundary(value,{budget})),error=>{refusal=error;return error instanceof ResourceBudgetExceededError&&error.additionalBytes===bytes;});
 assert.deepEqual(refusal.built,[],'a refused index allocates no buffer');
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined,'and caches nothing');
 assert.equal(budget.stats.availabilityListeners,0,'no wake-up is registered: the caller decides how to wait');assert.equal(budget.stats.reservations,reservations);
 const after=stats();assert.equal(after.strictRefusals,before.strictRefusals+1);assert.equal(after.overBudgetPreparations,before.overBudgetPreparations,'never built over budget');assert.equal(after.pendingCharges,before.pendingCharges);
 // The caller returns its own claim; the retry admits at once.
 lease.release();
 const prepared=solar.tryAdmitSolarShadowBoundary(value,{budget});
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),prepared);assert.equal(budget.stats.categories.shadow.bytes,bytes);
 blocker.release();
 const small=ledger(2048),tiny={boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square(0,0,1,1)]}};
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary(tiny,{budget:small}),error=>error instanceof solar.SolarShadowBoundaryUnfitError&&error.requiredBytes===required(tiny)&&error.limitBytes===2048,'an index above the whole ledger is unfit, not a wait');
 assert.equal(small.stats.availabilityListeners,0);assert.equal(small.stats.reservations,0);
});

test('contrast: giving a placeholder back before an unclaimed admission lets a synchronous wave reserver take the bytes, and the module then waits',async()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes,precision:'exact'}),claim=placeholder(budget,value),stealer=thief(budget);
 try{
  claim.release();
  assert.equal(stealer.calls,1);assert.equal(stealer.taken.length,1,'the give-back wave hands the index bytes to the first synchronous reserver');
  const waiting=new AbortController(),admitted=solar.admitSolarShadowBoundary(value,{budget,signal:waiting.signal});
  assert.equal(budget.stats.availabilityListeners,2,'the module now waits beside whatever its caller still holds');
  waiting.abort();await assert.rejects(admitted,{name:'AbortError'});
  assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined);
 }finally{stealer.stop();blocker.release();}
});

for(const form of ['admitSolarShadowBoundary','tryAdmitSolarShadowBoundary'])test(form+' with a claim of exactly the index bytes takes it in place: no wave, nothing to steal, no wait, one charge',async()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes,precision:'exact'}),claim=placeholder(budget,value);
 assert.equal(budget.stats.availableBytes,0,'the page ledger is full: only the claim holds room for the index');
 const stealer=thief(budget),events=budget.stats.availabilityEvents,listeners=budget.stats.availabilityListeners,charged=budget.stats.bytes,before=stats();
 try{
  const {value:result,built}=allocations(budget,()=>form==='admitSolarShadowBoundary'?solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal(),claim}):solar.tryAdmitSolarShadowBoundary(value,{budget,claim}));
  assert.deepEqual(built,[{bytes:bytes-WRAPPER,charged:bytes}],'the index is built under the handed-over bytes, in the same synchronous turn');
  const prepared=await result;
  assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),prepared);
  assert.equal(budget.stats.availabilityEvents,events,'no byte was given back, so no wave ran');assert.equal(stealer.calls,0);assert.equal(stealer.taken.length,0);
  assert.equal(budget.stats.availabilityListeners,listeners,'the module registered no wait');
  assert.equal(budget.stats.bytes,charged,'the claim bytes became the index bytes, counted once');
  assert.equal(claim.active,true);assert.equal(claim.bytes,bytes);
  assert.deepEqual([budget.stats.categories.shadow.exactBytes,budget.stats.categories.shadow.estimatedBytes],[bytes-WRAPPER,WRAPPER],'the claim now carries the index identities');
  assert.equal(stats().handOvers,before.handOvers+1);
  // The caller still owns its claim. Releasing it after the hand-off changes no
  // bytes: the module cache holds its own claim of the same identities.
  claim.release();
  assert.equal(budget.stats.bytes,charged);assert.equal(budget.stats.availabilityEvents,events);assert.equal(stealer.calls,0);
  assert.equal(solar.tryAdmitSolarShadowBoundary(value,{budget}),prepared,'the cached index is shared');
 }finally{stealer.stop();blocker.release();}
});

test('a claim the module cannot take is refused with its reason; the module allocates, caches and keeps nothing, and the caller releases its claim',async()=>{
 const budget=ledger(),bytes=required(boundary()),refused=(reason,claimBytes)=>error=>error instanceof solar.SolarShadowBoundaryClaimError&&error.code==='SOLAR_BOUNDARY_CLAIM_MISMATCH'&&error.retryable===false&&error.reason===reason&&error.requiredBytes===bytes&&error.claimBytes===claimBytes;
 const before=stats();
 // Bytes that are not exactly the index: the claim is left as it was.
 let value=boundary(),claim=placeholder(budget,value,1),charged=budget.stats.bytes;
 await assert.rejects(solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal(),claim}),refused('bytes',bytes+1));
 assert.equal(claim.bytes,bytes+1);assert.equal(budget.stats.bytes,charged);assert.equal(budget.stats.categories.shadow.exactBytes,0,'its costs are untouched');
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined);claim.release();
 claim=placeholder(budget,value,-1);assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim}),refused('bytes',bytes-1));claim.release();
 // A released claim.
 claim=placeholder(budget,value);claim.release();
 await assert.rejects(solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal(),claim}),refused('inactive',0));
 // A claim of another ledger: the admitting ledger is unchanged.
 const other=ledger();claim=placeholder(other,value);charged=budget.stats.bytes;
 let ledgerRefusal;
 assert.throws(()=>allocations(budget,()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim})),error=>{ledgerRefusal=error;return refused('ledger',bytes)(error);});
 assert.deepEqual(ledgerRefusal.built,[],'nothing is built');assert.equal(budget.stats.bytes,charged);assert.equal(budget.stats.reservations,0,'the probe reservation was returned');
 assert.equal(claim.active,true);assert.equal(other.stats.bytes,bytes,'the other ledger still charges the caller its claim');claim.release();assert.equal(other.stats.bytes,0);
 // Identities another claim also charges: re-identifying would add bytes.
 const shared=[{category:'shadow',bytes,precision:'estimate',identity:{},label:'shared placeholder identity'}],peer=budget.reserve(shared);claim=budget.reserve(shared);charged=budget.stats.bytes;
 assert.equal(charged,bytes,'the two claims count their shared identity once');
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim}),refused('shared',bytes),'room to grow: refused after the probe');
 claim.release();assert.equal(budget.stats.bytes,charged);
 const full=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});claim=budget.reserve(shared);
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim}),refused('shared',bytes),'no room to grow: the adjust itself is refused');
 claim.release();full.release();peer.release();assert.equal(budget.stats.bytes,0);
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined,'no refusal cached the index');
 assert.equal(stats().handOverRefusals-before.handOverRefusals,6);assert.equal(stats().handOvers,before.handOvers);
 // An aborted hand-off and a claim that is no reservation.
 const aborted=new AbortController();aborted.abort();claim=placeholder(budget,value);
 await assert.rejects(solar.admitSolarShadowBoundary(value,{budget,signal:aborted.signal,claim}),{name:'AbortError'});assert.equal(claim.bytes,bytes);
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim:{bytes}}),TypeError);claim.release();
 assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

test('a hand-off for a hash already cached returns the cached index and leaves the claim with its caller',async()=>{
 const budget=ledger(),value=boundary(),bytes=required(value),prepared=solar.tryAdmitSolarShadowBoundary(value,{budget}),claim=placeholder(budget,value);
 assert.equal(budget.stats.bytes,2*bytes);
 assert.equal(await solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal(),claim}),prepared);
 assert.equal(budget.stats.categories.shadow.estimatedBytes,WRAPPER+bytes,'the placeholder kept its own costs');
 claim.release();assert.equal(budget.stats.bytes,bytes,'and returns them when its caller releases it');
});

test('a caller that keeps its handed-over claim is a holder: the index stays charged after the module cache drops it, until that last holder releases',()=>{
 const budget=ledger(),value=boundary(),bytes=required(value),claim=placeholder(budget,value);
 const prepared=solar.tryAdmitSolarShadowBoundary(value,{budget,claim});
 assert.equal(budget.stats.bytes,bytes);
 // Two later hashes: the two-entry FIFO cache evicts the first and returns its claim.
 const second=boundary(),third=boundary();solar.tryAdmitSolarShadowBoundary(second,{budget});solar.tryAdmitSolarShadowBoundary(third,{budget});
 assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined);assert.ok(prepared.covers([13.31,52.41,13.32,52.42]));
 assert.equal(budget.stats.bytes,bytes+required(second)+required(third),'the holder keeps the evicted index charged');
 claim.release();assert.equal(budget.stats.bytes,required(second)+required(third),'released by its last holder');
});

test('environment adopter: the bootstrap claim splits its index costs into a deduplicated placeholder and hands it off, with no byte moved and no wave before the index exists',async()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 const manifest={category:'metadata',bytes:3000,precision:'estimate',identity:{},label:'environment manifest'},parsed={category:'decoded',bytes:5000,precision:'estimate',identity:{},label:'environment municipal boundary'};
 const index=[{category:'shadow',bytes:solar.solarShadowBoundaryIndexBytes(value),precision:'exact',identity:{},label:'environment solar boundary index (admitted before allocation)'},{category:'shadow',bytes:WRAPPER,precision:'estimate',identity:{},label:'environment solar boundary index views (admitted before allocation)'}];
 const bootstrap=budget.reserve([manifest,parsed,...index]),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});
 const stealer=thief(budget),events=budget.stats.availabilityEvents,charged=budget.stats.bytes;
 try{
  // 1. The same cost objects: deduplicated, so the split needs no capacity.
  const split=budget.tryReserve(index,{label:'environment solar boundary index hand-off'});assert.equal(split.ok,true);assert.equal(budget.stats.bytes,charged);
  // 2. The bootstrap claim drops them; the placeholder still charges them.
  assert.equal(bootstrap.adjust([manifest,parsed]),true);assert.equal(budget.stats.bytes,charged);assert.equal(split.reservation.bytes,bytes);
  // 3. The hand-off itself.
  const prepared=await solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal(),claim:split.reservation});
  assert.equal(budget.stats.bytes,charged);assert.equal(budget.stats.availabilityEvents,events,'no wave from the split to the built index');assert.equal(stealer.calls,0);
  stealer.stop();
  // 4. The final step keeps the manifest and the index under the module identities.
  assert.equal(bootstrap.adjust([manifest,...solar.solarShadowBoundaryCosts(prepared)]),true);split.reservation.release();
  assert.equal(budget.stats.bytes,charged-parsed.bytes,'only the parsed boundary is given back, once the index exists');
  assert.equal(budget.stats.categories.shadow.bytes,bytes,'the index is counted once by the module cache and the environment holder');
  assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),prepared);
 }finally{stealer.stop();blocker.release();bootstrap.release();}
});

test('a re-identification whose growth a pressure eviction paid for is refused as shared, not taken as a hand-off of the same bytes',()=>{
 const budget=ledger(),value=boundary(),bytes=required(value);
 // A peer charges the claim's identity too: re-identifying the claim needs bytes.
 const shared=[{category:'shadow',bytes,precision:'estimate',identity:{},label:'shared placeholder identity'}],peer=budget.reserve(shared),claim=budget.reserve(shared);
 const victim=budget.reserve({category:'texture',bytes,precision:'exact',label:'recent victim'},{recent:true});
 const fill=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});
 let evictions=0;const stop=budget.onPressure(()=>{if(victim.active){evictions++;victim.release();}});
 const before=stats(),charged=budget.stats.bytes,pressure=budget.stats.pressureEvents;
 try{
  assert.equal(budget.stats.availableBytes,0,'full: only an eviction can pay for the growth');
  assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim}),error=>error instanceof solar.SolarShadowBoundaryClaimError&&error.reason==='shared');
  assert.equal(evictions,1,'the growth ran the pressure callbacks, a documented effect of a claim made in the wrong order');
  assert.equal(budget.stats.bytes,charged,'the eviction paid exactly for the growth, so the total alone could not tell');
  assert.equal(budget.stats.pressureEvents,pressure+1);
  assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined,'nothing was built or cached');
  assert.equal(stats().handOvers,before.handOvers);assert.equal(stats().handOverRefusals,before.handOverRefusals+1);
  assert.equal(claim.active,true,'the claim stays with its caller');
  claim.release();assert.equal(budget.stats.bytes,charged-bytes,'its release returns the re-identified bytes; the peer keeps its own');
 }finally{stop();fill.release();peer.release();if(claim.active)claim.release();}
 assert.equal(budget.stats.bytes,0);
});

test('a claim of another ledger is refused as ledger with no reservation, eviction, pressure or wave on the admitting ledger',()=>{
 for(const room of [true,false]){
  const budget=ledger(),other=ledger(),value=boundary(),bytes=required(value),claim=placeholder(other,value);
  const fill=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(room?bytes:0),precision:'exact'});
  let evictions=0,wakes=0;const stop=budget.onPressure(()=>{evictions++;}),off=budget.onAvailable(()=>{wakes++;});
  const view=s=>({bytes:s.bytes,pressureEvents:s.pressureEvents,availabilityEvents:s.availabilityEvents,reservations:s.reservations}),before=view(budget.stats),label=room?'room for the index':'full';
  try{
   assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget,claim}),error=>error instanceof solar.SolarShadowBoundaryClaimError&&error.reason==='ledger',label);
   assert.deepEqual(view(budget.stats),before,label+': nothing moved on the admitting ledger');
   assert.equal(evictions,0,label+': no pressure callback ran');assert.equal(wakes,0,label+': no listener was woken');
   assert.equal(solar.currentSolarShadowBoundary(value.boundarySHA256),undefined);
   assert.equal(claim.active,true);assert.equal(other.stats.bytes,bytes,'the other ledger still charges the claim');
  }finally{stop();off();fill.release();claim.release();}
  assert.equal(other.stats.bytes,0);
 }
});

test('a waiting admit of the same hash is woken in a microtask when another caller hands the index off, with no ledger wave and no timer',async()=>{
 const budget=ledger(),value=boundary(),claim=placeholder(budget,value);
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});
 const timers=countTimers(),listeners=budget.stats.availabilityListeners,subscribers=stats().cacheSubscribers,events=budget.stats.availabilityEvents;
 let settled=false;
 try{
  const waiting=solar.admitSolarShadowBoundary(value,{budget,signal:ownedSignal()});waiting.then(()=>{settled=true;},()=>{settled=true;});
  await microtasks();
  assert.equal(settled,false,'refused: it waits');assert.equal(budget.stats.availabilityListeners,listeners+1);
  const prepared=solar.tryAdmitSolarShadowBoundary(value,{budget,claim});
  assert.equal(settled,false,'not inside the inserting call');
  await microtasks();
  assert.equal(settled,true,'the hand-off woke it');assert.equal(await waiting,prepared,'it returns the index the hand-off cached');
  assert.equal(budget.stats.availabilityEvents,events,'no ledger wave ran');assert.equal(timers.count,0,'no timer');
  assert.equal(budget.stats.availabilityListeners,listeners);assert.equal(stats().cacheSubscribers??0,subscribers??0,'both of its registrations ended');
 }finally{timers.restore();claim.release();blocker.release();}
 assert.equal(budget.stats.bytes,required(value),'only the module cache charges the index');
});

test('onSolarShadowBoundaryCached reports each insertion of its hash once, in a microtask, and ends with its unsubscribe or abort',async()=>{
 const budget=ledger(),value=boundary(),sha=value.boundarySHA256,calls=[],base=stats();
 const offThrower=solar.onSolarShadowBoundaryCached(sha,()=>{calls.push('thrower');throw Error('a failing subscriber');});
 const offA=solar.onSolarShadowBoundaryCached(sha,()=>calls.push('a'));
 const controller=new AbortController();solar.onSolarShadowBoundaryCached(sha,()=>calls.push('b'),controller.signal);
 assert.equal(stats().cacheSubscribers,base.cacheSubscribers+3);
 solar.tryAdmitSolarShadowBoundary(value,{budget});
 assert.deepEqual(calls,[],'never inside the inserting call');
 await microtasks();
 assert.deepEqual(calls,['thrower','a','b'],'each subscriber once; a failing one does not stop the others');
 // Already cached when subscribing: reported once, so check-then-subscribe loses nothing.
 const again=[],offAgain=solar.onSolarShadowBoundaryCached(sha,()=>again.push(1));
 await microtasks();assert.deepEqual(again,[1]);
 controller.abort();offA();offThrower();offA();
 assert.equal(stats().cacheSubscribers,base.cacheSubscribers+1,'unsubscribe (twice is harmless) and abort end them');
 // Evicted by two later hashes and inserted again: reported again.
 solar.tryAdmitSolarShadowBoundary(boundary(),{budget});solar.tryAdmitSolarShadowBoundary(boundary(),{budget});
 assert.equal(solar.currentSolarShadowBoundary(sha),undefined);
 await microtasks();assert.deepEqual(again,[1],'other hashes are not reported');
 solar.tryAdmitSolarShadowBoundary(value,{budget});await microtasks();assert.deepEqual(again,[1,1],'each insertion of its hash');
 offAgain();assert.equal(stats().cacheSubscribers,base.cacheSubscribers);
 assert.deepEqual(calls,['thrower','a','b'],'ended subscriptions hear nothing more');
 assert.equal(stats().cachedWakeups-base.cachedWakeups,5);
 const aborted=new AbortController();aborted.abort();
 const none=solar.onSolarShadowBoundaryCached(sha,()=>calls.push('never'),aborted.signal);none();await microtasks();
 assert.equal(stats().cacheSubscribers,base.cacheSubscribers,'an aborted signal subscribes nothing');assert.deepEqual(calls,['thrower','a','b']);
 assert.throws(()=>solar.onSolarShadowBoundaryCached('x',()=>{}),TypeError);assert.throws(()=>solar.onSolarShadowBoundaryCached(sha,undefined),TypeError);
});

test('tryAdmitRefusals counts tryAdmit refusals alone; strictRefusals counts every refused strict attempt, a waiting admit included',async()=>{
 const budget=ledger(),value=boundary(),bytes=required(value),blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-bytes+1,precision:'exact'}),base=stats();
 const controller=new AbortController(),waiting=solar.admitSolarShadowBoundary(value,{budget,signal:controller.signal});
 assert.equal(stats().strictRefusals,base.strictRefusals+1);assert.equal(stats().tryAdmitRefusals,base.tryAdmitRefusals,'a waiting admit is no tryAdmit');
 assert.throws(()=>solar.tryAdmitSolarShadowBoundary(value,{budget}),ResourceBudgetExceededError);
 assert.equal(stats().strictRefusals,base.strictRefusals+2);assert.equal(stats().tryAdmitRefusals,base.tryAdmitRefusals+1);
 controller.abort();await assert.rejects(waiting,{name:'AbortError'});
 assert.equal(stats().cacheSubscribers,base.cacheSubscribers,'the aborted wait left no subscription');assert.equal(budget.stats.availabilityListeners,0);
 blocker.release();
});
