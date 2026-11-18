import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {harness,tick,webRoot} from './support/managers3-harness.mjs';
import {shard,network,until,outcome} from './support/managers3-fixtures.mjs';
import {managerEvent} from './support/manager-admission-waits.mjs';

const resultOf=run=>run.then(()=>'fulfilled',error=>'rejected:'+(error?.name??String(error)));
const settle=async()=>{for(let i=0;i<60;i++)await tick();};
async function scenario(control,dropResidents=false){
 const sources=Array.from({length:5},(_,i)=>shard('shared-a'+i,{fixture:i===0,count:120})),b=shard('shared-b'),net=network();
 let pool,probe,cohort,reason,openGate;
 const gate=new Promise(resolve=>openGate=resolve);
 const h=harness('tier300',{}, {nativeSources({runtime,page,component}){
  pool=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts')).createSharedNativeSourcePool({read:net.read,resourceStore:page.store});
  const client=pool.client(component.city),originalCohort=client.cohort.bind(client),acquire=client.acquire.bind(client);
  client.acquire=async(asset,signal,...args)=>{if(asset.sha256===b.leaf.sha256&&!control){await new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});gate.then(()=>{signal.removeEventListener('abort',abort);resolve();});if(signal.aborted)abort();});}return acquire(asset,signal,...args);};
  if(control)client.cohort=undefined;
  else client.cohort=(...args)=>{cohort=originalCohort(...args);const attempt=cohort.attempt.bind(cohort);cohort.attempt=(p,s)=>{probe=p;const result=attempt(p,s);result.signal.addEventListener('abort',()=>reason=result.signal.reason);return result;};return cohort;};
  return client;
 }});
 h.fixture.manifest={...h.fixture.manifest,shards:[...sources.map(s=>s.leaf),b.leaf]};
 const resident=pool.client('berlin'),controller=new AbortController(),residentValues=[];
 for(const leaf of [...sources,b]){const pending=resident.acquire(leaf.leaf,controller.signal,200000,'main');await until(()=>net.pending(leaf.leaf.path).length===1,'preload');net.deliver(leaf.leaf.path,leaf.bytes);residentValues.push(await pending);}
 const budget=h.page.budget,baseline=budget.stats.bytes,desiredFree=1500000;
 let blocker,foreign;
 if(control)blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-desiredFree,precision:'estimate'});
 const run=h.manager.requestMode('3d',controller.signal);void run.catch(()=>{});
 if(!control){
  await until(()=>probe?.held()>1500000,'five ready sources while final source gated');await settle();
  blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate'});
  const admitted=budget.tryReserve({category:'construction',bytes:64,precision:'estimate',label:'foreign reclaim'});if(admitted.ok)foreign=admitted.reservation;
  await until(()=>pool.stats.cohortWaits>=1,'cohort waited');await settle();
  if(dropResidents){for(const value of residentValues)value.release();await settle();}
  const newBytes=blocker.bytes+budget.stats.availableBytes-desiredFree;
  if(!blocker.adjust({category:'construction',bytes:newBytes,precision:'estimate'}))throw Error('Cannot set free space');
  openGate();await settle();
 }
 let settledOutcome=dropResidents ? await outcome(run,100)
  : await managerEvent(resultOf(run),'the Tier300 view to use its resident sources');
 let beforeRoom;
 if(dropResidents){
  beforeRoom={outcome:settledOutcome,entries:pool.stats.entries,free:budget.stats.availableBytes};
  blocker.release();
  settledOutcome=await net.respondUntil([...sources,b],resultOf(run),'the Tier300 retry to finish after capacity returns');
 }
 const report={control,beforeRoom,baseline,desiredFree,freeAfter:budget.stats.availableBytes,requiredBytes:reason?.requiredBytes,outcome:settledOutcome,cohortWaiting:cohort?.waiting,pool:pool.stats,networkReads:net.reads.length};
 controller.abort();h.manager.destroy();blocker?.release();foreign?.release();for(const value of residentValues)value.release();resident.destroy();pool.destroy();openGate();await settle();return report;
}
test('tier300 retries a released batch whose canonical parents remain independently resident',async()=>{
 const repaired=await scenario(false),control=await scenario(true);
 assert.equal(repaired.outcome,'fulfilled');assert.equal(repaired.cohortWaiting,false);
 assert.equal(control.outcome,'fulfilled');assert.equal(repaired.baseline,control.baseline);
 assert.equal(repaired.freeAfter,control.freeAfter,'same final source graph and page charge');
 assert.equal(repaired.networkReads,6,'reuses the independently resident canonical sources');
 assert.equal(repaired.pool.holders,control.pool.holders,'independent resident and manager roles both survive');
 assert(repaired.pool.cohortYields<=3,'bounded retries instead of self-release spin');
});

test('tier300 retry accounts for canonical parents disposed after the batch returned',async()=>{
 const result=await scenario(false,true);
 assert.equal(result.beforeRoom.outcome,'pending','does not bypass the working-set budget');
 assert.equal(result.beforeRoom.entries,0,'independent parents really left the page');
 assert.equal(result.outcome,'fulfilled','reconstructs after real room returns');
 assert.equal(result.networkReads,12,'each of the six disposed canonical sources is read again');
});

async function coldEntryOrder(freeBytes){
 const sources=[...Array.from({length:5},(_,i)=>shard('order-a'+i,{fixture:i===0,count:120})),shard('order-z-large',{count:240})],net=network();let pool;
 const h=harness('tier300',{}, {nativeSources({runtime,page,component}){
  pool=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts')).createSharedNativeSourcePool({read:net.read,resourceStore:page.store});return pool.client(component.city);
 }});
 h.fixture.manifest={...h.fixture.manifest,shards:sources.map(s=>s.leaf)};
 const resident=pool.client('berlin'),controller=new AbortController(),values=[];
 for(const source of sources){const request=resident.acquire(source.leaf,controller.signal,200000,'main');await until(()=>net.pending(source.leaf.path).length===1,'preload ordered source');net.deliver(source.leaf.path,source.bytes);values.push(await request);}
 const budget=h.page.budget,blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-freeBytes,precision:'estimate'});
 const run=h.manager.requestMode('3d',controller.signal);void run.catch(()=>{});const state=await managerEvent(resultOf(run),'the cold Tier300 view to finish');
 const report={state,addedBytes:freeBytes-budget.stats.availableBytes,reads:net.reads.length,holders:pool.stats.holders};
 controller.abort();h.manager.destroy();blocker.release();for(const value of values)value.release();resident.destroy();pool.destroy();await settle();return report;
}
test('cold entry prepares the larger private source first without dropping selected sources',async()=>{
 const limited=await coldEntryOrder(1700000),roomy=await coldEntryOrder(3000000);
 assert.equal(roomy.state,'fulfilled');assert.equal(limited.state,'fulfilled');
 assert.equal(limited.addedBytes,roomy.addedBytes,'same retained graph under both budgets');
 assert.equal(limited.holders,roomy.holders,'all selected and independently resident roles survive');
 assert.equal(limited.reads,6,'all six original sources are retained and reused');
});

async function concurrentSourcePreparation(cancel=false){
 const sources=Array.from({length:12},(_,i)=>shard('concurrent-'+String(i).padStart(2,'0'),{fixture:i===0,count:8})),net=network();let pool,active=0,peak=0,open=false;
 const pending=new Set();
 const prepare=async(_rows,_sha,signal)=>{
  active++;peak=Math.max(peak,active);
  try{if(!open)await new Promise((resolve,reject)=>{
   const done=()=>{pending.delete(done);signal.removeEventListener('abort',abort);resolve();};
   const abort=()=>{pending.delete(done);signal.removeEventListener('abort',abort);reject(signal.reason);};
   pending.add(done);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  });}finally{active--;}
 };
 const h=harness('tier300',{}, {planners:{prepareSourceRoleDisplay:prepare},nativeSources({runtime,page,component}){
  pool=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts')).createSharedNativeSourcePool({read:net.read,resourceStore:page.store});return pool.client(component.city);
 }});
 h.fixture.manifest={...h.fixture.manifest,shards:sources.map(s=>s.leaf)};
 const resident=pool.client('berlin'),controller=new AbortController(),values=[];
 for(const source of sources){const request=resident.acquire(source.leaf,controller.signal,200000,'main');await until(()=>net.pending(source.leaf.path).length===1,'preload concurrent source');net.deliver(source.leaf.path,source.bytes);values.push(await request);}
 const baseline=h.page.budget.stats.bytes;
 const run=h.manager.requestMode('3d',controller.signal);void run.catch(()=>{});await until(()=>active>0,'source preparation begins');await settle();
 const beforeRelease={active,peak,reads:net.reads.length};
 if(cancel){controller.abort();h.manager.destroy();}else{open=true;for(const done of [...pending])done();}
 const result=await managerEvent(resultOf(run),'Tier300 source preparation to settle');controller.abort();h.manager.destroy();await settle();
 const afterDestroy={active,pending:pending.size,bytes:h.page.budget.stats.bytes,holders:pool.stats.holders,baseline};
 for(const value of values)value.release();resident.destroy();pool.destroy();await settle();
 return{beforeRelease,result,peak,afterDestroy};
}
test('tier300 bounds actual provider source preparation, not only readers awaiting eager productions',async()=>{
 const result=await concurrentSourcePreparation();
 assert.equal(result.beforeRelease.active,2,'only two provider preparations may hold transient metadata');
 assert.equal(result.peak,2);assert.equal(result.result,'fulfilled');
 assert.equal(result.beforeRelease.reads,12,'all twelve canonical sources stay available');
 assert.equal(result.afterDestroy.active,0);assert.equal(result.afterDestroy.bytes,result.afterDestroy.baseline);
});
test('cancelling tier300 source preparation removes queued work without losing independent resident roles',async()=>{
 const result=await concurrentSourcePreparation(true);
 assert.equal(result.result,'rejected:AbortError');assert.equal(result.afterDestroy.active,0);assert.equal(result.afterDestroy.pending,0);
 assert.equal(result.afterDestroy.bytes,result.afterDestroy.baseline);assert.equal(result.afterDestroy.holders,12);
});

async function coldMissingSourceFirst(control){
 const residentSources=Array.from({length:5},(_,i)=>shard('cold-resident-'+i,{fixture:i===0,count:120})),fresh=shard('cold-a-unread',{count:3}),net=network();let pool;
 const h=harness('tier300',{}, {nativeSources({runtime,page,component}){
  pool=runtime.load(path.join(webRoot,'src/safety/shared-native-source.ts')).createSharedNativeSourcePool({read:net.read,resourceStore:page.store});const client=pool.client(component.city);
  if(control)client.residentSourceBytes=()=>undefined;
  return client;
 }});
 h.fixture.manifest={...h.fixture.manifest,shards:[fresh,...residentSources].map(s=>s.leaf)};
 const resident=pool.client('berlin'),controller=new AbortController(),values=[];
 for(const source of residentSources){const request=resident.acquire(source.leaf,controller.signal,200000,'main');await until(()=>net.pending(source.leaf.path).length===1,'preload cold resident');net.deliver(source.leaf.path,source.bytes);values.push(await request);}
 const budget=h.page.budget,freeBytes=10300000,blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-freeBytes,precision:'estimate'});
 const run=h.manager.requestMode('3d',controller.signal);void run.catch(()=>{});
 const state=await net.respondUntil([fresh],resultOf(run),'the cold Tier300 view to finish its new source');
 const report={control,state,free:budget.stats.availableBytes,reads:net.reads.length,retry:pool.stats.retryWaitDiagnostics};
 controller.abort();h.manager.destroy();blocker.release();for(const v of values)v.release();resident.destroy();pool.destroy();await settle();return report;
}
test('cold entry reads missing canonical sources before retaining resident private views',async()=>{
 const actual=await coldMissingSourceFirst(false),control=await coldMissingSourceFirst(true);
 console.log('COLD_MISSING_SOURCE_COMPARISON',JSON.stringify({actual,control}));
 assert.equal(control.state,'fulfilled');assert.equal(actual.state,'fulfilled');assert.equal(actual.free,control.free,'identical final resource charge');assert.equal(actual.reads,control.reads,'same complete source set');
});
