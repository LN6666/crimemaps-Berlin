import test from 'node:test';
import assert from 'node:assert/strict';
import {getEventListeners} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {harness,providers,createVisiblePreparationGate,tick} from './support/managers-stage2-harness.mjs';
import {cohortManager,shard,until} from './support/managers3-fixtures.mjs';

const runtime=createRuntimeLoader();
const {runAbortableReaders}=runtime.load(fileURLToPath(new URL('../src/safety/viewport-request.ts',import.meta.url)));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function observe(promise){
 const state={done:false,value:undefined,error:undefined,failed:false};
 void promise.then(value=>{state.value=value;state.done=true;},error=>{state.error=error;state.failed=true;state.done=true;});
 return state;
}
async function completed(state,label){await until(()=>state.done,label);return state;}
function waitForAbort(signal,{generic=false}={}){
 return new Promise((_resolve,reject)=>{
  const aborted=()=>{signal.removeEventListener('abort',aborted);reject(generic?new DOMException('Reader cancelled','AbortError'):signal.reason);};
  signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
 });
}

test('reader failure aborts siblings, waits for cleanup and preserves the source Error',async t=>{
 const parent=new AbortController(),failure=Error('source hash mismatch'),source=deferred(),cleanup=deferred();
 let siblingSignal,cleaned=false;
 const listeners=getEventListeners(parent.signal,'abort').length;
 const result=observe(runAbortableReaders(parent.signal,[
  async()=>source.promise,
  async signal=>{siblingSignal=signal;try{await waitForAbort(signal,{generic:true});}finally{await cleanup.promise;cleaned=true;}},
 ]));
 t.after(()=>{parent.abort();cleanup.resolve();});
 source.reject(failure);
 await until(()=>siblingSignal?.aborted,'the sibling receives local cancellation');
 assert.equal(parent.signal.aborted,false,'local failure does not cancel publication or other parent work');
 assert.equal(result.done,false,'the read group must keep its slot until sibling cleanup drains');
 cleanup.resolve();await completed(result,'the failed read group drains');
 assert.equal(result.error,failure,'the sibling AbortError must not replace the first source Error');
 assert.equal(cleaned,true);
 assert.equal(getEventListeners(parent.signal,'abort').length,listeners);
 assert.equal(getEventListeners(siblingSignal,'abort').length,0);
});

test('an already aborted parent starts no reader and preserves its reason',async()=>{
 const parent=new AbortController(),reason=new DOMException('Viewport replaced','AbortError');let starts=0;
 parent.abort(reason);
 const result=observe(runAbortableReaders(parent.signal,[async()=>{starts++;}]));
 await completed(result,'already aborted group');
 assert.equal(result.error,reason);assert.equal(starts,0);
 assert.equal(getEventListeners(parent.signal,'abort').length,0);
});

test('a running parent abort reaches every reader without changing the reason',async()=>{
 const parent=new AbortController(),reason=new DOMException('Map suspended','AbortError'),signals=[];
 const result=observe(runAbortableReaders(parent.signal,[0,1].map(()=>async signal=>{signals.push(signal);await waitForAbort(signal,{generic:true});})));
 parent.abort(reason);await completed(result,'parent cancellation drains');
 assert.equal(result.error,reason);assert.equal(signals.length,2);
 assert(signals.every(signal=>signal.aborted));assert.equal(getEventListeners(parent.signal,'abort').length,0);
});

test('a successful read group removes its parent listener and keeps result order',async()=>{
 const parent=new AbortController(),last=deferred(),result=observe(runAbortableReaders(parent.signal,[async()=>last.promise,async()=>2]));
 last.resolve(1);await completed(result,'successful group');
 assert.equal(result.failed,false);assert.deepEqual(result.value,[1,2]);
 assert.equal(getEventListeners(parent.signal,'abort').length,0);
});

// Run all seven actual visibleNow/requestMode paths. Only transport and GPU
// boundaries use the existing fixture: two distinct selected leaves enter the
// managers' real shard calls, one fails and one stays pending until its signal
// aborts. The single-leaf fallback fixture could not exercise this interleaving.
for(const provider of providers)test(provider+': source failure drains a blocked sibling and releases the preparation gate',async t=>{
 const gate=createVisiblePreparationGate(),parent=new AbortController(),failure=Error(provider+' source validation failed'),source=deferred();
 const h=harness(provider,{runVisiblePreparation:(signal,work)=>gate.run(provider,signal,work)});
 const first=h.fixture.manifest.shards[0],second={...first,id:'blocked-'+provider,tile_key:'blocked-'+provider,sha256:'blocked-'+provider};
 h.fixture.manifest.shards=[first,second];
 let failedReaderStarted=false,siblingSignal,siblingCleaned=false;
 h.fixture.readOverride=async(asset,signal)=>{
  if(asset.id===first.id){failedReaderStarted=true;return source.promise;}
  siblingSignal=signal;try{await waitForAbort(signal,{generic:true});}finally{siblingCleaned=true;}
 };
 t.after(()=>{parent.abort();source.resolve([]);h.manager.destroy();gate.destroy();});
 const result=observe(h.manager.requestMode('3d',parent.signal));
 await until(()=>failedReaderStarted&&siblingSignal,'both selected readers started');
 let nextProviderStarted=false;
 const next=observe(gate.run(provider==='city'?'root500':'city',new AbortController().signal,async()=>{assert.equal(siblingCleaned,true);nextProviderStarted=true;}));
 source.reject(failure);
 await completed(result,provider+' reports the source failure without waiting for another network result');
 assert.equal(result.error,failure);assert.equal(siblingSignal.aborted,true);assert.equal(siblingCleaned,true);
 assert.equal(parent.signal.aborted,false);assert.equal(getEventListeners(siblingSignal,'abort').length,0);
 await completed(next,'the next provider can use the gate');assert.equal(next.failed,false);assert.equal(nextProviderStarted,true);
 assert.equal(gate.idle,true);assert.equal(h.fixture.inspect().visibleLoadsPending,0);
 assert.equal(h.manager.mode,'2d');assert.equal(h.states.at(-1).status,'error');
 // A fresh intent must not inherit the failed group's child signal.
 h.fixture.manifest.shards=[first];h.fixture.readOverride=undefined;
 const flat=observe(h.manager.requestMode('2d',new AbortController().signal));await completed(flat,'explicit 2D cleanup');assert.equal(flat.failed,false);
 const retry=observe(h.start());await completed(retry,'fresh 3D retry');assert.equal(retry.failed,false,retry.error?.stack);
});

// The real native-source pool mints its own cohort yield object. The local
// reader group must return that exact object to cohort.retry, without turning
// it into an ordinary AbortError or introducing another retry after it fits.
for(const provider of ['root500','infill','bremen'])test(provider+': a cohort yield still retries once outside the gate',async t=>{
 const city=provider==='infill'?'frankfurt':provider==='bremen'?'bremen':'berlin';
 const a=shard('cancel-a',{city,fixture:true}),b=shard('cancel-b',{city});
 const h=cohortManager(provider,[a,b]),parent=new AbortController();let blocker;
 t.after(()=>{parent.abort();blocker?.release();h.manager.destroy();h.pool.destroy();h.gate.destroy();});
 const run=h.manager.requestMode('3d',parent.signal);
 const result=observe(run);
 await until(()=>h.net.pending(a.leaf.path).length===1,'first cohort source admitted');
 blocker=h.budget.reserve({category:'construction',bytes:h.budget.stats.availableBytes,precision:'estimate',label:'reader cancellation cohort test'});
 h.net.deliver(a.leaf.path,a.bytes);
 await until(()=>h.pool.stats.cohortWaits===1,'the cohort returns its batch');
 for(let i=0;i<20;i++)await tick();
 assert.equal(result.done,false);assert.equal(h.pool.stats.cohortYields,1);
 assert.equal(h.gate.idle,true);assert.equal(h.pool.stats.holders,0);assert.equal(h.pool.stats.cohorts,0);
 blocker.release();blocker=undefined;
 await h.net.respondUntil([a,b],run,'the cohort retry to complete');
 assert.equal(result.failed,false,result.error?.stack);
 assert.equal(h.manager.mode,'3d');assert.equal(h.pool.stats.cohortYields,1);assert.equal(h.pool.stats.cohortWaits,1);
 assert.deepEqual(h.net.reads.map(row=>row.target),[a.leaf.path,a.leaf.path,b.leaf.path]);
});
