// shared-core-3 (2): acquireCacheIfFits creates a cache/recent role only when
// it fits right now, judged and charged in one step, quietly (S2 environment
// CDR[4]; sweep uncovered[25] (1)). store.acquire keeps its semantics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ledger,stores,page,MiB,KiB} from './support/core3-runtime.mjs';

const {acquireCacheIfFits}=stores;
const cost=(bytes,identity={})=>({category:'decoded',bytes,precision:'exact',identity});
/** A ready CPU entry held by a source lease; its value and dispose are observable. */
function sourceEntry(store,key,bytes){
 const disposed=[];
 const lease=store.acquire({contentKey:key,role:'source',estimate:cost(bytes),produce:()=>({key}),dispose:value=>disposed.push(value)});
 assert.equal(lease.state,'ready');return{lease,disposed};
}
const warm=key=>({contentKey:key,role:'cache',estimate:[],produce:()=>{throw new Error('warm reuse requires a loaded value');}});
function watch(budget){let pressures=0;const off=budget.onPressure(()=>{pressures++;});return{get pressures(){return pressures;},off};}

test('a cache role that fits is created in the same step and charged to the recent subset, without pressure',()=>{
 const {budget,store}=page(undefined,{limitBytes:4*MiB,recentLimitBytes:MiB}),seen=watch(budget);
 try{
  const {lease}=sourceEntry(store,'leaf:a',256*KiB),before=budget.stats.pressureEvents;
  const cache=acquireCacheIfFits(store,warm('leaf:a'));
  assert(cache,'it fits: a cache lease');assert.equal(cache.role,'cache');assert.deepEqual(cache.value,{key:'leaf:a'});
  assert.equal(budget.stats.recentBytes,256*KiB,'charged to the recent subset');assert.equal(budget.stats.bytes,256*KiB,'not added to the page total');
  assert.equal(budget.stats.pressureEvents,before);assert.equal(seen.pressures,0);
  assert.equal(store.stats.recent,1);assert.equal(store.stats.cacheIfFitsSkips,0);
  lease.release();assert.equal(cache.value?.key,'leaf:a','the cache role keeps the value after the source leaves');
  cache.release();
 }finally{seen.off();store.destroy();}
});

test('a cache role that does not fit the recent subset is not created: no listener runs, no other entry is evicted, the entry is unchanged',()=>{
 const {budget,store}=page(undefined,{limitBytes:4*MiB,recentLimitBytes:MiB}),seen=watch(budget);
 try{
  // Another owner's recent entry fills most of the subset.
  const other=sourceEntry(store,'other',768*KiB),otherCache=store.acquire(warm('other'));other.lease.release();
  assert.equal(budget.stats.recentBytes,768*KiB);
  const {lease}=sourceEntry(store,'leaf:b',512*KiB);
  const pressureEvents=budget.stats.pressureEvents,lastPressure=budget.stats.lastPressure,recentBefore=store.stats.recent,bytes=budget.stats.bytes;
  assert.equal(acquireCacheIfFits(store,warm('leaf:b')),undefined,'does not fit: no lease');
  assert.equal(seen.pressures,0,'no onPressure listener ran');assert.equal(budget.stats.pressureEvents,pressureEvents,'not a pressure event');assert.equal(budget.stats.lastPressure,lastPressure,'lastPressure unchanged');
  assert.equal(otherCache.released,false,'the other owner\'s cache role survives');assert.equal(store.stats.recent,recentBefore);
  assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.recentBytes,768*KiB,'the refused entry is not charged as recent');
  assert.equal(lease.state,'ready');assert.deepEqual(lease.value,{key:'leaf:b'});assert.equal(store.stats.cacheIfFitsSkips,1);
  // Contrast: the unchanged acquire makes room under pressure.
  const forced=store.acquire(warm('leaf:b'));assert.equal(otherCache.released,true,'store.acquire still evicts as before');assert.equal(seen.pressures>0,true);
  forced.release();lease.release();
 }finally{seen.off();store.destroy();}
});

test('a full recent entry count refuses without evicting the oldest entry',()=>{
 const budget=ledger.createResourceBudget({limitBytes:4*MiB,recentLimitBytes:MiB}),store=stores.createChunkResourceStore({budget,recentMaxEntries:1});
 try{
  const first=sourceEntry(store,'first',KiB),firstCache=store.acquire(warm('first'));first.lease.release();
  const {lease}=sourceEntry(store,'second',KiB);
  assert.equal(acquireCacheIfFits(store,warm('second')),undefined);
  assert.equal(firstCache.released,false,'the oldest recent entry stays');assert.equal(store.stats.recent,1);
  lease.release();
 }finally{store.destroy();}
});

test('an idle entry already charged as recent is simply leased again',()=>{
 const {budget,store}=page(undefined,{limitBytes:4*MiB,recentLimitBytes:MiB});
 try{
  const entry=store.acquire({contentKey:'idle',role:'source',allowRecent:true,estimate:cost(900*KiB),produce:()=>({idle:true})});
  entry.release();assert.equal(budget.stats.recentBytes,900*KiB,'the released entry is recent');
  const cache=acquireCacheIfFits(store,warm('idle'));assert(cache);assert.deepEqual(cache.value,{idle:true});
  assert.equal(budget.stats.recentBytes,900*KiB);cache.release();
 }finally{store.destroy();}
});

test('a miss that does not fit creates no entry; a miss that fits is produced like acquire',()=>{
 const {budget,store}=page(undefined,{limitBytes:2*MiB,recentLimitBytes:MiB}),seen=watch(budget);
 try{
  const resources=store.stats.resources;let produced=0;
  assert.equal(acquireCacheIfFits(store,{contentKey:'big',role:'cache',estimate:cost(1.5*MiB),produce:()=>{produced++;return 1;}}),undefined);
  assert.equal(produced,0,'nothing was produced');assert.equal(store.stats.resources,resources,'no entry remains');assert.equal(budget.stats.bytes,0);assert.equal(seen.pressures,0);
  const small=acquireCacheIfFits(store,{contentKey:'small',role:'cache',estimate:cost(KiB),produce:()=>{produced++;return 2;}});
  assert(small);assert.equal(small.value,2);assert.equal(produced,1);assert.equal(budget.stats.recentBytes,KiB);small.release();
 }finally{seen.off();store.destroy();}
});

test('only cache or recent roles take this path; other failures throw as acquire does; an unknown store caches nothing',()=>{
 const {store}=page(undefined);
 try{
  assert.throws(()=>acquireCacheIfFits(store,{contentKey:'x',role:'source',estimate:[],produce:()=>1}),error=>error instanceof TypeError&&error.code==='RESOURCE_CONTRACT_VIOLATION');
  const controller=new AbortController();controller.abort();
  assert.throws(()=>acquireCacheIfFits(store,{...warm('y'),signal:controller.signal}),error=>error.name==='AbortError');
  const foreign={acquire(){throw new Error('not called');}};
  assert.equal(acquireCacheIfFits(foreign,warm('z')),undefined);
  store.destroy();assert.throws(()=>acquireCacheIfFits(store,warm('z')),/destroyed/);
 }finally{store.destroy();}
});

test('the ledger quiet admission: evict:false refuses without listeners or a pressure record, and the default still evicts',()=>{
 const budget=ledger.createResourceBudget({limitBytes:MiB,recentLimitBytes:MiB});let evicted=0;
 const held=budget.reserve(cost(MiB-KiB));budget.onPressure(()=>{evicted++;});
 assert.throws(()=>budget.reserve(cost(2*KiB),{evict:false}),error=>error.name==='ResourceBudgetExceededError'&&error.additionalBytes===2*KiB);
 assert.equal(evicted,0);assert.equal(budget.stats.pressureEvents,0);assert.equal(budget.stats.lastPressure,undefined);
 const small=budget.reserve(cost(KiB));
 assert.equal(small.adjust(cost(2*KiB),{evict:false}),false);assert.equal(small.setRecent(true,{evict:false}),true,'fits: same result as before');
 assert.equal(evicted,0);assert.equal(budget.stats.pressureEvents,0);
 assert.equal(budget.tryReserve(cost(2*KiB)).ok,false);assert.equal(evicted,1,'the default admission still runs the listeners');assert.equal(budget.stats.pressureEvents,1);
 assert.throws(()=>budget.reserve(cost(1),{evict:'no'}),error=>error instanceof TypeError&&error.code==='RESOURCE_CONTRACT_VIOLATION');
 small.release();held.release();
});

// shared-core-3-fix (review F1): a miss with parents is judged with its whole
// ancestry before any parent is retained; a refusal is quiet and returns undefined.
test('a cache-if-fits miss with parents that does not fit: undefined, no listener, no eviction, no parent retained, no entry',()=>{
 const {budget,store}=page(undefined,{limitBytes:8*MiB,recentLimitBytes:MiB}),seen=watch(budget);
 try{
  const other=sourceEntry(store,'other',700*KiB),otherCache=store.acquire(warm('other'));other.lease.release();
  const parent=sourceEntry(store,'parent',600*KiB);
  const pressureEvents=budget.stats.pressureEvents,lastPressure=budget.stats.lastPressure,events=budget.stats.availabilityEvents,resources=store.stats.resources,bytes=budget.stats.bytes,recentBytes=budget.stats.recentBytes;
  let wakes=0;const off=budget.onAvailable(()=>{wakes++;});
  let produced=0;
  const result=acquireCacheIfFits(store,{contentKey:'child',role:'cache',estimate:cost(KiB),parents:[parent.lease],produce:()=>{produced++;return{child:true};}});
  off();
  assert.equal(result,undefined,'the ancestry does not fit the recent subset');
  assert.equal(seen.pressures,0);assert.equal(budget.stats.pressureEvents,pressureEvents);assert.equal(budget.stats.lastPressure,lastPressure);
  assert.equal(otherCache.released,false,'another owner\'s recent entry stays');
  assert.equal(wakes,0);assert.equal(budget.stats.availabilityEvents,events,'nothing was built, so nothing is released or woken');
  assert.equal(store.stats.resources,resources);assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.recentBytes,recentBytes);
  assert.equal(produced,0);assert.equal(store.stats.cacheIfFitsSkips,1);
  // The parent was not retained: releasing its only lease retires it now.
  parent.lease.release();assert.equal(parent.disposed.length,1,'no dependency lease was left on the parent');
  otherCache.release();
 }finally{seen.off();store.destroy();}
});

test('a cache-if-fits miss with parents that fits: ancestry charged to the recent subset once, the page total unchanged, quietly',()=>{
 const {budget,store}=page(undefined,{limitBytes:8*MiB,recentLimitBytes:2*MiB}),seen=watch(budget);
 try{
  const parent=sourceEntry(store,'parent',600*KiB);
  const events=budget.stats.availabilityEvents;let wakes=0;const off=budget.onAvailable(()=>{wakes++;});
  const child=acquireCacheIfFits(store,{contentKey:'child',role:'cache',estimate:cost(KiB),parents:[parent.lease,parent.lease],produce:()=>({child:true})});
  off();
  assert(child,'it fits');assert.equal(child.state,'ready');assert.deepEqual(child.value,{child:true});
  assert.equal(budget.stats.bytes,601*KiB,'shared ancestor identities are not added to the page total twice');
  assert.equal(budget.stats.recentBytes,601*KiB,'own estimate and ancestry are in the recent subset');
  assert.equal(seen.pressures,0);assert.equal(budget.stats.pressureEvents,0);assert.equal(wakes,0);assert.equal(budget.stats.availabilityEvents,events);
  parent.lease.release();assert.equal(parent.disposed.length,0,'the child holds its ancestor');
  child.release();
 }finally{seen.off();store.destroy();}
});

test('a cache-if-fits miss with a parent that is not a ready CPU lease of this page throws before anything is built',()=>{
 const {budget,store}=page(undefined,{limitBytes:8*MiB,recentLimitBytes:2*MiB});
 try{
  const parent=sourceEntry(store,'parent',KiB);parent.lease.release();
  const resources=store.stats.resources,bytes=budget.stats.bytes,events=budget.stats.availabilityEvents;
  assert.throws(()=>acquireCacheIfFits(store,{contentKey:'child',role:'cache',estimate:cost(KiB),parents:[parent.lease],produce:()=>({})}),/ready CPU\/source parents/);
  assert.equal(store.stats.resources,resources);assert.equal(budget.stats.bytes,bytes);assert.equal(budget.stats.availabilityEvents,events);
 }finally{store.destroy();}
});

// shared-core-3-fix (review F2): a refused miss never builds then releases, so
// it sends no availability wake to waiters.
test('a refused cache-if-fits miss sends no availability wake (total or recent subset, or the entry-count bound)',()=>{
 const {budget,store}=page(undefined,{limitBytes:MiB,recentLimitBytes:MiB});
 try{
  const other=sourceEntry(store,'other',900*KiB),otherCache=store.acquire(warm('other'));other.lease.release();
  let wakes=0;const off=budget.onAvailable(()=>{wakes++;});
  const events=budget.stats.availabilityEvents,resources=store.stats.resources;
  assert.equal(acquireCacheIfFits(store,{contentKey:'miss',role:'cache',estimate:cost(200*KiB),produce:()=>({})}),undefined);
  assert.equal(wakes,0);assert.equal(budget.stats.availabilityEvents,events);assert.equal(store.stats.resources,resources);
  assert.equal(budget.stats.pressureEvents,0);assert.equal(otherCache.released,false);
  off();otherCache.release();
 }finally{store.destroy();}
 const bounded=page(undefined,{limitBytes:8*MiB,recentLimitBytes:2*MiB});
 const small=stores.createChunkResourceStore({budget:bounded.budget,recentMaxEntries:1});
 try{
  const other=sourceEntry(small,'other',KiB),otherCache=small.acquire(warm('other'));other.lease.release();
  let wakes=0;const off=bounded.budget.onAvailable(()=>{wakes++;});const events=bounded.budget.stats.availabilityEvents;
  assert.equal(acquireCacheIfFits(small,{contentKey:'miss',role:'cache',estimate:cost(KiB),produce:()=>({})}),undefined,'the entry-count bound is full');
  assert.equal(wakes,0);assert.equal(bounded.budget.stats.availabilityEvents,events);assert.equal(otherCache.released,false);assert.equal(small.stats.cacheIfFitsSkips,1);
  off();otherCache.release();
 }finally{small.destroy();bounded.store.destroy();}
});
