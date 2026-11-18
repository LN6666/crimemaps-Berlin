import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Shared budget core: a lease that becomes reclaimable wakes waiters at most
// once per entry and frame, and a further transition in that frame is
// deferred to the next frame boundary rather than dropped; a reclaimable event
// raised inside a wave reaches waiters that subscribed during it; GPU
// retirements ask for bounded follow-up frames, counted per frame (one
// synchronous task) rather than per collect call, until their fence passes;
// unobservable retirements are released after a bounded logical fallback; and
// a cache hit refreshes the recent idle clock. The actual runtime modules run;
// only the WebGL context and the clock are fixtures.
function runtime(){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const require=request=>{assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);return load(resolve(dirname(file),request+'.ts'));};
  new Function('require','module','exports',compiled.outputText)(require,module,module.exports);
  return module.exports;
 }
 const root=fileURLToPath(new URL('../src/safety/render-runtime/',import.meta.url));
 return{...load(resolve(root,'resource-budget.ts')),...load(resolve(root,'chunk-resource-store.ts'))};
}
const api=runtime();
function gpu(){
 let lost=false,signaled=false,fenceNull=false,waitFailed=false,next=0;const fences=[],deleted=[];
 const gl={
  SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,TIMEOUT_EXPIRED:4,WAIT_FAILED:5,
  isContextLost:()=>lost,fenceSync(){if(fenceNull)return null;const fence={id:++next};fences.push(fence);return fence;},flush(){},
  clientWaitSync:()=>waitFailed?5:signaled?2:4,deleteSync(fence){deleted.push(fence);},
 };
 return{gl,fences,deleted,signal(value=true){signaled=value;},nullFence(value=true){fenceNull=value;},failWait(value=true){waitFailed=value;},lose(){lost=true;}};
}
const cost=(bytes,category='decoded',identity)=>({category,bytes,precision:'exact',...(identity?{identity}:{})});
function withClock(run){const original=performance.now;let now=1000;performance.now=()=>now;try{return run({set(value){now=value;},advance(ms){now+=ms;}});}finally{performance.now=original;}}
// A frame is one task: the previous task's microtasks (which close its frame)
// have run before the next public collect.
const nextTask=()=>new Promise(resolve=>setImmediate(resolve));
/** A waiter that subscribes once and drops its subscription when woken. */
function waiter(budget){const value={wakes:0,off:undefined};value.off=budget.onAvailable(()=>{value.wakes++;const stop=value.off;value.off=undefined;stop?.();});return value;}

test('a released lease entering the recent cache wakes a waiter once; its retry evicts that entry under pressure',()=>{
 const budget=api.createResourceBudget({limitBytes:100,recentLimitBytes:80}),store=api.createChunkResourceStore({budget});
 const blocker=budget.reserve(cost(30,'construction'));
 const lease=store.acquire({contentKey:'cpu/warm',role:'source',estimate:cost(60),allowRecent:true,produce:()=>({bytes:60}),dispose(){}});
 assert.equal(lease.state,'ready');assert.equal(budget.stats.bytes,90);
 // A waiter refused while the entry is still functionally held.
 assert.equal(budget.tryReserve(cost(40,'construction')).ok,false);
 let wakes=0;const off=budget.onAvailable(()=>{wakes++;});
 lease.release();
 assert.equal(store.stats.recent,1,'the idle entry is cached, not freed');assert.equal(budget.stats.bytes,90,'no byte dropped');
 assert.equal(wakes,1,'entering recent sends one reclaimable wake');assert.equal(budget.stats.reclaimableEvents,1);assert.equal(store.stats.reclaimableWakes,1);
 // The woken retry's refused admission evicts the reclaimable CPU entry and fits.
 const retry=budget.tryReserve(cost(40,'construction'));assert.equal(retry.ok,true,'pressure eviction of the recent entry admits the waiter');
 assert.equal(store.stats.recent,0);assert.equal(budget.stats.bytes,70);
 off();retry.reservation.release();blocker.release();store.destroy();assert.equal(budget.stats.bytes,0);
});

test('an entry wakes at most once per frame: a waiter that re-leases it on retry cannot loop, and the deferred wake arrives at the next frame',async()=>{
 const budget=api.createResourceBudget({limitBytes:100,recentLimitBytes:80}),store=api.createChunkResourceStore({budget});
 const request={contentKey:'cpu/looping',role:'source',estimate:cost(20),allowRecent:true,produce:()=>({bytes:20}),dispose(){}};
 let frameRequests=0;const frames=new AbortController();store.onRetirementPending(()=>{frameRequests++;},frames.signal);
 // Owners subscribe once per refusal and drop the subscription when woken; a
 // waiter retries only when woken, re-leases the entry, is refused, waits again.
 let wakes=0,off,retries=0,woken=true;const subscribe=()=>{off=budget.onAvailable(()=>{wakes++;woken=true;const stop=off;off=undefined;stop?.();});};
 while(woken&&retries<10){woken=false;retries++;const lease=store.acquire(request);assert.equal(lease.state,'ready');subscribe();lease.release();}
 assert.equal(retries,2,'one woken retry in this frame, then the waiter waits');assert.equal(wakes,1);
 assert.equal(budget.stats.reclaimableEvents,1,'the second transition of the same entry in this frame sends no wave now');assert.equal(store.stats.hits,1);
 assert.equal(store.stats.reclaimWakeDeferred,true,'it is deferred, not dropped');assert.equal(store.stats.deferredReclaimWakes,1);assert.equal(frameRequests,1,'the deferral asks for the frame that delivers it');
 // The next frame boundary delivers the deferred wave to the waiting retry.
 await nextTask();store.collectRetired();
 assert.equal(wakes,2,'the deferred wave reaches the waiter at the next frame');assert.equal(store.stats.reclaimWakeDeferred,false);assert.equal(budget.stats.reclaimableEvents,2);
 store.collectRetired();assert.equal(wakes,2,'one wave per deferral');
 // In that new frame the same entry wakes again at once: no lifetime limit.
 // (Subscribe after the hit: a cache hit itself frees recent capacity, which
 // is an ordinary availability wave for a waiter subscribed before it.)
 const again=store.acquire(request);subscribe();again.release();assert.equal(wakes,3);assert.equal(budget.stats.reclaimableEvents,3);
 off?.();off=undefined;
 // An entry whose earlier transition found no waiter can still wake one later.
 store.acquire({...request,contentKey:'cpu/no-waiter'}).release();assert.equal(budget.stats.reclaimableEvents,3);
 const late=store.acquire({...request,contentKey:'cpu/no-waiter'});subscribe();late.release();
 assert.equal(budget.stats.reclaimableEvents,4);assert.equal(wakes,4);
 off?.();frames.abort();store.destroy();
});

test('two different waiters in one frame: a waiter refused while the entry was held is woken at the next frame boundary and admitted',async()=>{
 const budget=api.createResourceBudget({limitBytes:100,recentLimitBytes:80}),store=api.createChunkResourceStore({budget});
 const request={contentKey:'cpu/E',role:'source',estimate:cost(60),allowRecent:true,produce:()=>({bytes:60}),dispose(){}};
 let frameRequests=0;const frames=new AbortController();store.onRetirementPending(()=>{frameRequests++;},frames.signal);
 const blocker=budget.reserve(cost(30,'construction'));let lease=store.acquire(request);
 const first=waiter(budget);lease.release();assert.equal(first.wakes,1,'E entering recent wakes the first waiter');
 const fits=budget.tryReserve(cost(10,'construction'));assert.equal(fits.ok,true);assert.equal(store.stats.recent,1,'admitted without evicting E');
 // E is used again; a second waiter is refused while E is functionally held.
 lease=store.acquire(request);assert.equal(store.stats.recent,0);assert.equal(budget.tryReserve(cost(20,'construction')).ok,false);
 const second=waiter(budget);lease.release();
 assert.equal(second.wakes,0,'E already woke waiters in this frame');assert.equal(store.stats.reclaimWakeDeferred,true);assert.equal(frameRequests,1);
 await nextTask();store.collectRetired();
 assert.equal(second.wakes,1,'the next frame boundary wakes the second waiter');
 const retry=budget.tryReserve(cost(20,'construction'));assert.equal(retry.ok,true,'its retry evicts E under pressure and fits');assert.equal(store.stats.recent,0);
 retry.reservation.release();fits.reservation.release();blocker.release();frames.abort();store.destroy();assert.equal(budget.stats.bytes,0);
});

test('a reclaimable event raised inside a wave reaches a waiter that subscribed during that wave',()=>{
 const budget=api.createResourceBudget({limitBytes:100,recentLimitBytes:80}),store=api.createChunkResourceStore({budget});
 const blocker=budget.reserve(cost(40,'construction')),warm=store.acquire({contentKey:'cpu/nested',role:'source',estimate:cost(30),allowRecent:true,produce:()=>({}),dispose(){}});
 // Woken by a byte drop, the first waiter subscribes a second one (refused in
 // the meantime) and then releases its warm lease into the recent cache.
 let late;const first=waiter(budget),wake=budget.onAvailable(()=>{wake();late=waiter(budget);warm.release();});
 const small=budget.reserve(cost(5,'construction'));small.release();
 assert.equal(first.wakes,1);assert.equal(store.stats.recent,1);
 assert.equal(late.wakes,1,'the nested reclaimable event is sent as its own wave after the running one');
 assert.equal(budget.stats.reclaimableEvents,1);assert.equal(budget.stats.reclaimableFollowUpWaves,1);assert.equal(budget.stats.reclaimableFollowUpDrops,0);
 // A nested byte drop still gets no second wave (the ledger's one-wave rule).
 const extra=budget.reserve(cost(5,'construction'));let nested=0;const once=budget.onAvailable(()=>{once();extra.release();});const after=waiter(budget);const offNested=budget.onAvailable(()=>{nested++;});
 const drop=budget.reserve(cost(5,'construction'));drop.release();assert.equal(nested,1,'a nested release does not repeat the wave');assert.equal(after.wakes,1);
 offNested();blocker.release();store.destroy();assert.equal(budget.stats.bytes,0);
});

test('a functional release that leaves only cache roles makes the entry evictable and wakes',()=>{
 const budget=api.createResourceBudget({limitBytes:100,recentLimitBytes:80}),store=api.createChunkResourceStore({budget});
 const main=store.acquire({contentKey:'cpu/cache-held',role:'main',estimate:cost(50),produce:()=>({bytes:50}),dispose(){}});
 const warm=main.retain('cache');let wakes=0;const off=budget.onAvailable(()=>{wakes++;});
 main.release();assert.equal(wakes,1);assert.equal(warm.state,'ready');
 assert.equal(budget.tryReserve(cost(80,'construction')).ok,true,'pressure revokes the cache role and admits');assert.equal(warm.released,true);
 off();store.destroy();
});

test('GPU retirement asks for bounded follow-up frames until its fence passes; acquisitions spend none',async()=>{
 const budget=api.createResourceBudget({limitBytes:1000,recentLimitBytes:0}),store=api.createChunkResourceStore({budget,recentMaxEntries:0,recentMaxIdleMs:0,retirementFollowUpFrames:3}),f=gpu();
 let frames=0;const signal=new AbortController(),off=store.onRetirementPending(()=>{frames++;},signal.signal);
 const reservation=budget.reserve(cost(100,'program'));let disposed=0;
 store.retireGpu({context:f.gl,epoch:store.contextEpoch(f.gl),reservation,dispose(){disposed++;},label:'fixture program'});
 assert.equal(disposed,1);assert.equal(f.fences.length,1);assert.equal(frames,1,'the retirement start requests one frame');assert.equal(budget.stats.bytes,100);
 // Internal collects from acquisitions are not frames.
 for(let i=0;i<10;i++){const lease=store.acquire({contentKey:'cpu/'+i,role:'source',estimate:cost(1),produce:()=>({}),dispose(){}});lease.release();}
 assert.equal(frames,1,'acquire collects never request or spend follow-up frames');
 for(let i=0;i<3;i++){await nextTask();store.collectRetired();}assert.equal(frames,4,'each pending frame boundary asks for one more frame');
 await nextTask();store.collectRetired();assert.equal(frames,4,'the per-entry follow-up bound stops further requests');assert.equal(store.stats.retiring,1,'the claim stays until the fence passes');
 f.signal();await nextTask();store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(f.deleted.length,1);assert.equal(store.stats.retiring,0);
 const after=frames;const second=budget.reserve(cost(10,'program'));store.retireGpu({context:f.gl,epoch:store.contextEpoch(f.gl),reservation:second,dispose(){},label:'signaled'});
 assert.equal(frames,after+1);await nextTask();store.collectRetired();assert.equal(frames,after+1,'a retirement whose fence passed asks for nothing more');assert.equal(budget.stats.bytes,0);
 signal.abort();const third=budget.reserve(cost(10,'program'));f.signal(false);store.retireGpu({context:f.gl,epoch:store.contextEpoch(f.gl),reservation:third,dispose(){},label:'unsubscribed'});
 assert.equal(frames,after+1,'an aborted requester is not called');assert.equal(store.stats.retirementFrameRequesters,0);off();
 f.signal();store.collectRetired();store.destroy();assert.equal(budget.stats.bytes,0);
});

test('several public collects in one task are one frame: the map and two renderers spend one follow-up frame, not three',async()=>{
 const budget=api.createResourceBudget({limitBytes:1000,recentLimitBytes:0}),store=api.createChunkResourceStore({budget,recentMaxEntries:0,recentMaxIdleMs:0,retirementFollowUpFrames:4}),f=gpu();
 let frames=0;const signal=new AbortController();store.onRetirementPending(()=>{frames++;},signal.signal);
 const reservation=budget.reserve(cost(100,'program'));store.retireGpu({context:f.gl,epoch:store.contextEpoch(f.gl),reservation,dispose(){},label:'shared-frame fixture'});
 assert.equal(frames,1);const opened=store.stats.frameBoundaries;
 // painted-map's 'render' collect plus delegated500's and church's render collects.
 for(let frame=1;frame<=4;frame++){await nextTask();for(let call=0;call<3;call++)store.collectRetired();assert.equal(frames,1+frame,'frame '+frame+' spends and requests once');}
 assert.equal(store.stats.frameBoundaries,opened+4,'four tasks open four frames');
 await nextTask();store.collectRetired();store.collectRetired();assert.equal(frames,5,'the 4-frame bound is reached after four frames, not after two tasks of three collects');
 assert.equal(store.stats.retiring,1);f.signal();store.collectRetired();assert.equal(budget.stats.bytes,0,'a later collect in the same task still collects');
 signal.abort();store.destroy();
});

test('fence-less, failed-query and throwing-dispose retirements are released after the bounded fallback, never kept',()=>withClock(clock=>{
 const budget=api.createResourceBudget({limitBytes:1000,recentLimitBytes:0}),store=api.createChunkResourceStore({budget,recentMaxEntries:0,recentMaxIdleMs:0,retirementFallbackMs:100}),f=gpu();
 let frames=0;store.onRetirementPending(()=>{frames++;});
 const epoch=()=>store.contextEpoch(f.gl);
 // No fence: completion cannot be observed.
 f.nullFence();const noFence=budget.reserve(cost(100,'program'));store.retireGpu({context:f.gl,epoch:epoch(),reservation:noFence,dispose(){},label:'no fence'});f.nullFence(false);
 assert.equal(store.stats.unobservedRetirements,1);assert.equal(budget.stats.bytes,100);assert.equal(frames,1,'the fallback still asks for its collecting frame');
 clock.advance(50);store.collectRetired();assert.equal(budget.stats.bytes,100,'kept for the fallback grace');assert(frames>=2);
 clock.advance(60);store.collectRetired();assert.equal(budget.stats.bytes,0,'released at the first collect after the grace');assert.equal(store.stats.fallbackReleases,1);
 // A fence whose query fails.
 const failed=budget.reserve(cost(50,'program'));store.retireGpu({context:f.gl,epoch:epoch(),reservation:failed,dispose(){},label:'wait failed'});
 f.failWait();store.collectRetired();assert.equal(store.stats.unobservedRetirements,1);assert.equal(budget.stats.bytes,50);f.failWait(false);
 clock.advance(100);store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(f.deleted.length,1,'the failed fence is deleted on release');
 // A dispose that throws keeps the fence path: released when the fence passes.
 const throwing=budget.reserve(cost(70,'program'));store.retireGpu({context:f.gl,epoch:epoch(),reservation:throwing,dispose(){throw new Error('fixture delete failure');},label:'throwing dispose'});
 assert.equal(store.stats.unobservedRetirements,0,'a throwing delete still has a completion fence');assert.equal(budget.stats.bytes,70);assert.match(String(store.stats.lastRetirementError),/fixture delete failure/);
 f.signal();store.collectRetired();assert.equal(budget.stats.bytes,0);
 // A throwing dispose with no fence falls back too.
 f.signal(false);f.nullFence();const both=budget.reserve(cost(30,'program'));store.retireGpu({context:f.gl,epoch:epoch(),reservation:both,dispose(){throw new Error('second failure');},label:'both'});
 clock.advance(100);store.collectRetired();assert.equal(budget.stats.bytes,0);assert.equal(store.stats.retiring,0);
 assert(store.stats.retirementErrors>=4);store.destroy();
}));

test('a cache hit refreshes the recent idle clock and least-recent order instead of expiring from its first lease',()=>withClock(clock=>{
 const budget=api.createResourceBudget({limitBytes:1000,recentLimitBytes:500}),store=api.createChunkResourceStore({budget,recentMaxIdleMs:20_000,recentMaxEntries:2});
 const request=key=>({contentKey:key,role:'source',estimate:cost(10),allowRecent:true,produce:()=>({}),dispose(){}});
 store.acquire(request('a')).release();clock.advance(1);store.acquire(request('b')).release();
 // Touch A before the 20-second deadline. Only B expires on the next collection.
 clock.advance(14_000);store.acquire(request('a')).release();
 clock.advance(7_000);store.collectRetired();assert.equal(store.stats.recent,1,'B expires after 21 s, A was used 7 s ago');
 const hit=store.acquire(request('a'));assert.equal(store.stats.hits,2);hit.release();
 // Cache role hits refresh as well and move to the newest position.
 const c=store.acquire({...request('c')});const warm=c.retain('cache');c.release();clock.advance(14_000);const warmAgain=store.acquire({...request('c'),role:'cache'});
 clock.advance(7_000);store.collectRetired();assert.equal(warm.released,false,'the refreshed cache role survives 21 s after its first lease');
 warm.release();warmAgain.release();store.destroy();
}));
