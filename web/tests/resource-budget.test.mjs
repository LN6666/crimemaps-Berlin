import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../src/safety/render-runtime/resource-budget.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};
Function('module','exports','require',compiled)(module,module.exports,id=>assert.fail('Unexpected budget dependency '+id));
const {createResourceBudget,getPageResourceBudget,ResourceBudgetExceededError}=module.exports;
const cost=(bytes,identity,category='decoded',precision='exact')=>({bytes,identity,category,precision});

test('resource budget shares one underlying ArrayBuffer across views and reservations while private metadata remains additive',()=>{
 const budget=createResourceBudget({limitBytes:1024,recentLimitBytes:128}),buffer=new ArrayBuffer(128),left=new Float32Array(buffer,0,8),right=new Uint8Array(buffer,32,64),metadataA={},metadataB={};
 const a=budget.reserve([cost(left.buffer.byteLength,left.buffer),cost(right.buffer.byteLength,right.buffer),cost(11,metadataA,'metadata')]),b=budget.reserve([cost(right.buffer.byteLength,right.buffer),cost(17,metadataB,'metadata')]);
 try{
  assert.equal(left.buffer,right.buffer);assert.equal(a.bytes,139);assert.equal(b.bytes,145);assert.equal(budget.stats.reservations,2);assert.equal(budget.stats.allocations,3);
  assert.equal(budget.stats.bytes,156);assert.equal(budget.stats.exactBytes,156);assert.equal(budget.stats.categories.decoded.bytes,128);assert.equal(budget.stats.categories.metadata.bytes,28);
  b.release();assert.equal(budget.stats.bytes,139,'the other view still owns the complete payload');assert.equal(budget.stats.categories.decoded.bytes,128);a.release();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.allocations,0);
 }finally{b.release();a.release();}
});

test('resource budget preserves a larger outstanding estimate until that claim ends and hands accounting to the remaining exact owner',()=>{
 const budget=createResourceBudget({limitBytes:1024}),identity={},estimate=budget.reserve(cost(320,identity,'packed','estimate')),small=budget.reserve(cost(128,identity,'decoded'));
 let large;
 try{
  assert.equal(budget.stats.bytes,320);assert.equal(budget.stats.estimatedBytes,320);assert.equal(budget.stats.exactBytes,0,'a smaller exact observation does not cancel a larger estimate');
  large=budget.reserve(cost(480,identity,'gpu-buffer'));assert.equal(budget.stats.bytes,480);assert.equal(budget.stats.exactBytes,480);assert.equal(budget.stats.estimatedBytes,0);
  large.release();assert.equal(budget.stats.bytes,320);assert.equal(budget.stats.estimatedBytes,320);assert.equal(estimate.active,true);
  estimate.release();assert.equal(budget.stats.bytes,128);assert.equal(budget.stats.exactBytes,128);assert.equal(budget.stats.estimatedBytes,0);assert.equal(budget.stats.categories.decoded.bytes,128);small.release();assert.equal(budget.stats.bytes,0);
 }finally{large?.release();small.release();estimate.release();}
});

test('resource budget keeps a rejected adjustment intact and admits new work only after pressure actually evicts idle claims',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:40}),identity={},live=budget.reserve(cost(60,identity)),events=[];
 let idle=budget.reserve(cost(30,{},'packed'),{recent:true}),incoming;
 const off=budget.onPressure(()=>{const before=budget.stats.bytes;idle.release();events.push([before,budget.stats.bytes]);});
 try{
  assert.equal(live.adjust(cost(120,identity)),false);assert.equal(live.bytes,60);assert.equal(live.active,true);assert.equal(budget.stats.bytes,60);assert.equal(idle.active,false);assert.deepEqual(events,[[90,60]]);
  assert.equal(budget.stats.lastPressure.required,120);assert.equal(budget.stats.lastPressure.capacity,100);assert.equal(budget.stats.lastPressure.shortfallBytes,20);
  idle=budget.reserve(cost(30,{},'packed'),{recent:true});incoming=budget.reserve(cost(35,{},'construction'));assert.equal(incoming.bytes,35);assert.equal(budget.stats.bytes,95);assert.equal(idle.active,false);assert.deepEqual(events,[[90,60],[90,60]],'eviction changes real usage before the new reservation is added');
  off();const rejected=budget.tryReserve(cost(20,{},'metadata'),{label:'still full'});assert.equal(rejected.ok,false);assert(rejected.error instanceof ResourceBudgetExceededError);assert.equal(rejected.error.requiredBytes,115);assert.equal(rejected.error.currentBytes,95);assert.equal(rejected.error.shortfallBytes,15);assert.equal(rejected.error.label,'still full');assert.equal(budget.stats.bytes,95);assert.equal(events.length,2);
 }finally{off();incoming?.release();idle.release();live.release();}
});

test('resource budget enforces recent as a subset of total and shares one configured desktop or mobile page ledger',()=>{
 const MiB=1024*1024,desktop=createResourceBudget(),mobile=createResourceBudget({profile:'mobile'});
 assert.equal(desktop.stats.limitBytes,1_500_000_000,'desktop page ledger default is decimal 1.5 GB (owner decision 2026-11-12)');assert.equal(desktop.stats.recentLimitBytes,32*MiB);assert.equal(mobile.stats.limitBytes,512*MiB);assert.equal(mobile.stats.recentLimitBytes,16*MiB);assert.equal(desktop.stats.physicalMemory,'unmeasured');assert(desktop.stats.unmeasured.some(row=>row.category==='unmeasured-driver'));
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:25}),live=budget.reserve(cost(70,{})),idle=budget.reserve(cost(20,{},'packed'),{recent:true});let extra;
 try{
  const recent=budget.tryReserve(cost(10,{},'packed'),{recent:true}),total=budget.tryReserve(cost(11,{}));assert.equal(recent.ok,false);assert.equal(recent.error.constraint,'recent');assert.equal(recent.error.recentRequired,30);assert.equal(total.ok,false);assert.equal(total.error.constraint,'total');assert.equal(total.error.required,101);assert.equal(budget.stats.bytes,90);
  assert.equal(idle.setRecent(false),true);assert.equal(budget.stats.bytes,90);assert.equal(budget.stats.recentBytes,0);extra=budget.reserve(cost(10,{},'packed'),{recent:true});assert.equal(budget.stats.bytes,100);assert.equal(budget.stats.availableBytes,0);assert.equal(budget.stats.recentBytes,10);assert.equal(budget.stats.recentAvailableBytes,15);
 }finally{extra?.release();idle.release();live.release();}
 assert.throws(()=>createResourceBudget({limitBytes:100,recentLimitBytes:101}),RangeError);
 const page={},options={profile:'mobile',limitBytes:100,recentLimitBytes:25},shared=getPageResourceBudget(options,page);assert.equal(getPageResourceBudget(undefined,page),shared);assert.equal(getPageResourceBudget({...options},page),shared);assert.notEqual(getPageResourceBudget(options,{}),shared);
 for(const change of [{profile:'desktop'},{limitBytes:101},{recentLimitBytes:26}])assert.throws(()=>getPageResourceBudget(change,page),/already been configured/);
});

test('resource budget retirement and resumption preserve the total charge until final release',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:50}),reservation=budget.reserve(cost(40,{},'gpu-buffer'),{recent:true});
 try{
  assert.equal(budget.stats.bytes,40);assert.equal(budget.stats.recentBytes,40);reservation.markRetiring();reservation.markRetiring();assert.equal(budget.stats.bytes,40);assert.equal(budget.stats.recentBytes,0);assert.equal(budget.stats.retiringBytes,40);assert.equal(reservation.setRecent(true),false);
  assert.equal(typeof reservation.setRetiring,'function');reservation.setRetiring(false);assert.equal(budget.stats.bytes,40);assert.equal(budget.stats.retiringBytes,0);assert.equal(reservation.setRecent(true),true);assert.equal(budget.stats.recentBytes,40);
  reservation.setRetiring(true);assert.equal(budget.stats.bytes,40);assert.equal(budget.stats.retiringBytes,40);assert.equal(budget.stats.recentBytes,0);reservation.release();reservation.release();assert.equal(reservation.active,false);assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.retiringBytes,0);reservation.setRetiring(false);assert.equal(budget.stats.bytes,0);
 }finally{reservation.release();}
});

test('resource budget availability wakes only for increased capacity and abort/off/nested release cannot duplicate a notification wave',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:40}),identity={},live=budget.reserve(cost(30,identity)),duplicate=budget.reserve(cost(30,identity)),nested=budget.reserve(cost(20,{},'metadata'));
 let first=0,second=0,aborted=0,removed=0,preAborted=0,depth=0,maxDepth=0;const observations=[];
 const offFirst=budget.onAvailable(()=>{depth++;maxDepth=Math.max(maxDepth,depth);first++;nested.release();depth--;});
 const offSecond=budget.onAvailable(()=>{second++;observations.push([budget.stats.availableBytes,budget.stats.recentAvailableBytes]);});
 const signal=new AbortController(),already=new AbortController(),offAbort=budget.onAvailable(()=>aborted++,signal.signal),offRemoved=budget.onAvailable(()=>removed++);already.abort();const offAlready=budget.onAvailable(()=>preAborted++,already.signal);
 try{
  signal.abort();offRemoved();offRemoved();assert.equal(budget.stats.availabilityListeners,2);assert.equal(first,0);assert.equal(second,0);duplicate.release();assert.equal(first,0,'removing a duplicate claim does not create capacity');assert.equal(second,0);assert.equal(live.setRecent(false),true);assert.equal(first,0);
  assert.equal(live.adjust(cost(20,identity)),true);assert.equal(first,1);assert.equal(second,1);assert.equal(maxDepth,1);assert.deepEqual(observations,[[80,40]],'the later listener sees capacity after the nested release, once');assert.equal(budget.stats.bytes,20);
  assert.equal(live.setRecent(true),true);assert.equal(live.setRecent(true),true);assert.equal(first,1,'reserving recent capacity does not wake waiters');assert.equal(live.setRecent(false),true);assert.equal(first,2);assert.equal(second,2);assert.equal(maxDepth,1);assert.deepEqual(observations,[[80,40],[80,40]]);
  offFirst();offSecond();assert.equal(budget.stats.availabilityListeners,0);live.release();live.release();assert.equal(first,2);assert.equal(second,2);assert.equal(aborted,0);assert.equal(removed,0);assert.equal(preAborted,0);assert.equal(budget.stats.bytes,0);
 }finally{offFirst();offSecond();offAbort();offRemoved();offAlready();duplicate.release();nested.release();live.release();}
});

test('pressure diagnostics preserve bounded requested cost scalars without retaining allocation identities',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:0}),held=budget.reserve(cost(50,{})),identity={payload:new ArrayBuffer(8)},rows=Array.from({length:8},(_,i)=>({...cost(20+i,{},i%2?'metadata':'construction','estimate'),label:'cost-'+i}));
 rows[7]={...rows[7],identity,label:'x'.repeat(1000)};
 const rejected=budget.tryReserve(rows,{label:'bounded request'});assert.equal(rejected.ok,false);
 const snapshot=budget.stats.lastPressure;
 assert.equal(snapshot.requestedCostCount,8);assert.equal(snapshot.requestedCosts.length,4);
 assert.deepEqual(snapshot.requestedCosts.map(row=>row.bytes),[27,26,25,24]);
 assert(snapshot.requestedCosts.every(row=>!('identity'in row)&&Object.isFrozen(row)));
 assert.equal(snapshot.requestedCosts[0].label.length,256);assert(Object.isFrozen(snapshot.requestedCosts));
 rows[7].label='changed';assert.equal(snapshot.requestedCosts[0].label,'x'.repeat(256));
 assert.equal(budget.stats.bytes,50,'diagnostics cannot admit the refused work');
 held.release();
 const quiet=budget.tryReserve(cost(101,{},'metadata'),{evict:false});assert.equal(quiet.ok,false);
 assert.equal(budget.stats.lastPressure,snapshot,'quiet refusal keeps pressure history unchanged');
 assert.equal(quiet.error.details.requestedCosts[0].bytes,101);
});

test('an eviction-resolved pressure attempt remains distinct from the last terminal refusal',()=>{
 const budget=createResourceBudget({limitBytes:100,recentLimitBytes:50}),live=budget.reserve(cost(50,{})),idle=budget.reserve(cost(30,{}),{recent:true});
 const off=budget.onPressure(()=>idle.release()),incoming=budget.reserve({...cost(40,{},'metadata','estimate'),label:'private view expansion'});
 assert.equal(budget.stats.bytes,90);assert.equal(budget.stats.lastPressure,undefined);
 assert.equal(budget.stats.lastPressureAttempt.required,120);
 assert.equal(budget.stats.lastPressureAttempt.requestedCosts[0].label,'private view expansion');
 off();incoming.release();live.release();
});
