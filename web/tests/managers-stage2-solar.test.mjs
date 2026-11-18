import test from 'node:test';
import assert from 'node:assert/strict';
import {MiB,sha,outcomeOf,pageModules,createResourceBudget} from './support/managers-stage2-ingress.mjs';

// The managers' solar boundary hand-off (manager-ensure-admission) on the actual
// solar-shadow-admission module: strict synchronous admission (tryAdmit), no
// placeholder that is released and admitted again, and a satisfied wait that the
// cache's own insertion hint ends when another holder hands the same index over
// without moving a byte. No timer is involved anywhere.
function withoutTimers(t){const saved={setTimeout,setInterval};const forbid=name=>()=>{throw Error(name+' is not allowed in admission waits');};globalThis.setTimeout=forbid('setTimeout');globalThis.setInterval=forbid('setInterval');t.after(()=>{globalThis.setTimeout=saved.setTimeout;globalThis.setInterval=saved.setInterval;});}
const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const solarValue=(hash,points=5)=>({boundarySHA256:hash,geometry:{type:'Polygon',coordinates:[points===5?ring(13.3,52.4,13.5,52.6):[...Array.from({length:points},(_,i)=>[13.3+(i%1000)*1e-4,52.4+Math.floor(i/1000)*1e-4]),[13.3,52.4]]]}});
let nextHash=0;const freshHash=()=>sha('stage2 solar fixture '+(++nextHash));
function production(budget,{bytes=MiB}={}){
 const calls=[];
 return{calls,produce:async signal=>{calls.push(signal);signal.throwIfAborted();return{value:{id:calls.length},claim:budget.reserve({category:'metadata',bytes,precision:'estimate',label:'fixture bootstrap value'})};}};
}

test('the hand-off admits the exact index at once: no placeholder is released, no wave runs, nothing waits',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 const value=solarValue(freshHash(),20000),I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,fixture=production(budget);
 const lease=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.ok(solar.currentSolarShadowBoundary(value.boundarySHA256),'cached before the lease returns');
 assert.equal(budget.stats.availabilityEvents,0,'no placeholder was returned to the ledger in between');
 assert.equal(budget.stats.categories.shadow.bytes,I,'the index is charged once, exactly');
 assert.equal(budget.stats.availabilityListeners,0);
 const direct=admission.handOffSolarShadowBoundary(budget,value,new AbortController().signal);
 assert.equal(await direct,solar.currentSolarShadowBoundary(value.boundarySHA256),'a cached index is returned as it is');
 lease.release();
});

test('a refused hand-off throws ManagerAdmissionRetry synchronously and registers nothing; an index above the ledger is unfit at once',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:16*MiB,recentLimitBytes:MiB});
 const value=solarValue(freshHash(),20000),I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 const blocker=budget.reserve({category:'mask',bytes:16*MiB-(I-1),precision:'estimate'});
 const refusals=solar.solarShadowBoundaryCacheStats().tryAdmitRefusals;
 let thrown;try{admission.handOffSolarShadowBoundary(budget,value,new AbortController().signal,4096);}catch(error){thrown=error;}
 assert.ok(thrown instanceof admission.ManagerAdmissionRetry,'thrown in the same turn');assert.deepEqual([thrown.requiredBytes,thrown.admissionBytes],[4096+I,I]);
 assert.deepEqual([budget.stats.availabilityListeners,solar.solarShadowBoundaryCacheStats().cacheSubscribers,solar.currentSolarShadowBoundary(value.boundarySHA256)],[0,0,undefined],'nothing allocated, cached or registered');
 assert.equal(solar.solarShadowBoundaryCacheStats().tryAdmitRefusals,refusals+1);
 blocker.release();
 const tiny=createResourceBudget({limitBytes:I-1,recentLimitBytes:0});
 assert.throws(()=>admission.handOffSolarShadowBoundary(tiny,value,new AbortController().signal),error=>error.name==='SolarShadowBoundaryUnfitError'&&error.retryable===false);
 const lease=admission.acquireManagerBootstrap({budget:tiny,key:'tiny',signal:new AbortController().signal,produce:production(tiny,{bytes:1024}).produce,solarBoundary:()=>value});
 assert.equal(await outcomeOf(lease),'SolarShadowBoundaryUnfitError','a bootstrap whose index never fits fails instead of waiting');
 assert.equal(tiny.stats.availabilityListeners,0);
});

test('a joiner waiting for an uncached index wakes when another holder hands that index over: no ledger wave is needed',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 const fixture=production(budget,{bytes:4*MiB}),hash=freshHash(),value=solarValue(hash,20000),other=solarValue(freshHash());
 const I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 // The shared value is ready with another boundary's index: the two-entry cache
 // keeps room, so caching `value` evicts nothing (an eviction would run a wave).
 const first=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>other});
 assert.equal(solar.solarShadowBoundaryCacheStats().entries,1);
 // Another holder keeps exactly the index's bytes; the rest of the ledger is full.
 const holder=budget.reserve({category:'shadow',bytes:I,precision:'estimate',label:'other holder placeholder'});
 const blocker=budget.reserve({category:'mask',bytes:budget.stats.availableBytes-(I-1),precision:'estimate',label:'other holders'});
 const joining=admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.equal(await outcomeOf(joining,50),'pending','the index does not fit beside the others');
 assert.equal(solar.solarShadowBoundaryCacheStats().cacheSubscribers,1,'the wait subscribed to the cache insertion hint');
 const waves=budget.stats.availabilityEvents;
 // The atomic hand-over: the holder's claim takes the index identities in place.
 const prepared=solar.tryAdmitSolarShadowBoundary(value,{budget,claim:holder});
 assert.equal(budget.stats.availabilityEvents,waves,'the hand-over moved no byte and ran no wave');
 assert.equal(await outcomeOf(joining,20),'fulfilled','the cache hint alone ends the wait');
 assert.equal(budget.stats.availabilityEvents,waves,'still no wave');
 const lease=await joining;assert.equal(lease.value,first.value,'the shared value is leased again');assert.equal(fixture.calls.length,1);assert.equal(solar.currentSolarShadowBoundary(hash),prepared);
 assert.deepEqual([budget.stats.availabilityListeners,solar.solarShadowBoundaryCacheStats().cacheSubscribers],[0,0],'every registration ended with the wait');
 holder.release();first.release();lease.release();blocker.release();
});

test('an aborted satisfied wait leaves neither a ledger listener nor a cache subscription',async t=>{
 withoutTimers(t);const {admission,solar}=pageModules(),budget=createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 const fixture=production(budget,{bytes:4*MiB}),value=solarValue(freshHash(),20000);
 const I=solar.solarShadowBoundaryIndexBytes(value)+solar.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
 const first=await admission.acquireManagerBootstrap({budget,key:'k',signal:new AbortController().signal,produce:fixture.produce,solarBoundary:()=>value});
 solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget});solar.prepareSolarShadowBoundary(solarValue(freshHash()),{budget});
 const blocker=budget.reserve({category:'mask',bytes:budget.stats.availableBytes-(I-1),precision:'estimate'});
 const controller=new AbortController(),joining=admission.acquireManagerBootstrap({budget,key:'k',signal:controller.signal,produce:fixture.produce,solarBoundary:()=>value});
 assert.equal(await outcomeOf(joining,50),'pending');assert.equal(solar.solarShadowBoundaryCacheStats().cacheSubscribers,1);
 controller.abort();assert.equal(await outcomeOf(joining),'AbortError');
 assert.deepEqual([budget.stats.availabilityListeners,solar.solarShadowBoundaryCacheStats().cacheSubscribers],[0,0]);
 first.release();blocker.release();
});
