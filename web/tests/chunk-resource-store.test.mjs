import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// Read the actual runtime, including its circular function-only scheduler link.
// No source extraction, replacement owner, or fake store substitutes production.
function runtime(){
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  const require=request=>{
   assert.ok(request.startsWith('.'),'runtime dependency must be local: '+request);
   return load(resolve(dirname(file),request+'.ts'));
  };
  new Function('require','module','exports',compiled.outputText)(require,module,module.exports);
  return module.exports;
 }
 const root=fileURLToPath(new URL('../src/safety/render-runtime/',import.meta.url));
 return{...load(resolve(root,'resource-budget.ts')),...load(resolve(root,'chunk-resource-store.ts'))};
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function gpu(){
 let lost=false,complete=false,next=0,flushes=0,deletedFences=0;
 const gl={
  SYNC_GPU_COMMANDS_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3,TIMEOUT_EXPIRED:4,WAIT_FAILED:5,
  isContextLost:()=>lost,fenceSync:()=>({fence:++next}),flush(){flushes++;},
  clientWaitSync:()=>complete?2:4,deleteSync(){deletedFences++;},
 };
 return{gl,complete(){complete=true;},lose(){lost=true;},restore(){lost=false;},get flushes(){return flushes;},get deletedFences(){return deletedFences;}};
}
const cost=(bytes,identity)=>({category:'decoded',bytes,precision:'exact',...(identity?{identity}:{})});
function fixture(limitBytes=1024){
 const api=runtime(),budget=api.createResourceBudget({limitBytes,recentLimitBytes:Math.min(256,limitBytes)});
 return{api,budget,store:api.createChunkResourceStore({budget})};
}

test('one shared CPU production, consumer cancellation and void completion release separately',async()=>{
 const {store,budget}=fixture(),pending=deferred(),signalA=new AbortController();
 let produced=0,disposed=0,productionSignal;
 const request={contentKey:'city/leaf/canonical/source-proof',role:'source',estimate:cost(64),produce(context){produced++;productionSignal=context.signal;return pending.promise;},costs:value=>cost(value.byteLength,value.buffer),dispose(){disposed++;}};
 const a=store.acquire({...request,signal:signalA.signal}),b=store.acquire({...request,role:'picking'});
 assert.equal(produced,1);signalA.abort();
 await assert.rejects(a.ready,{name:'AbortError'});
 assert.equal(a.value,undefined);assert.equal(productionSignal.aborted,false);
 pending.resolve(new Uint8Array(32));
 assert.equal(await b.ready,undefined);assert.equal(b.value.byteLength,32);assert.equal(budget.stats.bytes,32);
 b.release();b.release();
 assert.equal(productionSignal.aborted,true);assert.equal(b.value,undefined);assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);
 assert.equal(await b.ready,undefined,'a completed signal holds no payload');
});

test('last consumer abort keeps inflight charge and disposes the late value exactly once',async()=>{
 const {store,budget}=fixture(),pending=deferred();let signal,disposed=0;
 const lease=store.acquire({contentKey:'leaf/late',role:'candidate',estimate:cost(64),produce(context){signal=context.signal;return pending.promise;},dispose(){disposed++;}});
 lease.release();await assert.rejects(lease.ready,{name:'AbortError'});
 assert.equal(signal.aborted,true);assert.equal(budget.stats.bytes,64);assert.equal(budget.stats.retiringBytes,64);
 pending.resolve(new Uint8Array(48));
 await pending.promise;await Promise.resolve();
 assert.equal(disposed,1);assert.equal(lease.value,undefined);assert.equal(budget.stats.bytes,0);
 store.destroy();assert.equal(disposed,1);
});

test('ready borrows have no completion Promise and the last draw role owns the payload',async()=>{
 const {store,budget}=fixture(),pending=deferred();let disposed=0;
 const source=store.acquire({contentKey:'source/ready-borrow',role:'source',estimate:cost(32),produce:()=>pending.promise,dispose(){disposed++;}});
 assert.throws(()=>source.borrowReady('main'),/not ready/);
 pending.resolve(new Uint8Array(32));await source.ready;
 const value=source.value,main=source.borrowReady('main'),reflection=source.borrowReady('reflection');
 for(const borrow of [main,reflection]){
  assert.equal('ready' in borrow,false,'a synchronous draw pin has no completion signal');
  assert.equal('retain' in borrow,false,'a draw pin cannot create pending consumers');
  assert.equal(borrow.contentKey,source.contentKey);assert.strictEqual(borrow.value,value);
 }
 assert.equal(main.role,'main');assert.equal(reflection.role,'reflection');
 source.release();assert.equal(await source.ready,undefined);
 assert.equal(disposed,0);assert.equal(budget.stats.bytes,32);assert.equal(store.stats.roles,2);
 main.release();main.release();
 assert.equal(main.released,true);assert.equal(main.value,undefined);assert.strictEqual(reflection.value,value);
 assert.equal(disposed,0);assert.equal(store.stats.roles,1);
 reflection.release();reflection.release();
 assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('actual CPU cost overflow disposes returned canonical parents and never reports ready',async()=>{
 const {store,budget}=fixture(1024);let disposed=0;
 const lease=store.acquire({contentKey:'leaf/underestimated',role:'source',estimate:cost(32),produce:()=>new Uint8Array(96),costs:value=>cost(value.byteLength,value.buffer),dispose(){disposed++;}});
 await assert.rejects(lease.ready,/exceeds reserved capacity/);
 assert.equal(lease.state,'failed');assert.equal(lease.value,undefined);assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);
 const retry=store.acquire({contentKey:'leaf/underestimated',role:'source',estimate:cost(16),produce:()=>new Uint8Array(16)});
 await retry.ready;assert.equal(retry.value.byteLength,16);retry.release();
});

test('capacity notification cancelling during final cost adjustment disposes the value',async()=>{
 const {store,budget}=fixture(),controller=new AbortController();let disposed=0;
 const off=budget.onAvailable(()=>controller.abort());
 const lease=store.acquire({contentKey:'source/reentrant-cost',role:'source',signal:controller.signal,estimate:cost(64),produce:()=>new Uint8Array(32),costs:value=>cost(value.byteLength,value.buffer),dispose(){disposed++;}});
 await assert.rejects(lease.ready,{name:'AbortError'});
 assert.equal(lease.value,undefined);assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);off();
});

test('shared typed views charge the underlying allocation once, private metadata separately',async()=>{
 const {store,budget}=fixture(),buffer=new ArrayBuffer(64),privateA={},privateB={};
 const acquire=(key,metadata)=>store.acquire({contentKey:key,role:'source',estimate:[cost(64,buffer),{category:'metadata',bytes:12,precision:'estimate',identity:metadata}],produce:()=>new Uint8Array(buffer,8,16)});
 const a=acquire('provider/a',privateA),b=acquire('provider/b',privateB);
 await Promise.all([a.ready,b.ready]);
 assert.equal(budget.stats.bytes,88);assert.equal(budget.stats.exactBytes,64);assert.equal(budget.stats.estimatedBytes,24);
 a.release();assert.equal(budget.stats.bytes,76);b.release();assert.equal(budget.stats.bytes,0);
});

test('GPU budget denial happens before create and leaves the published set intact',()=>{
 const {store,budget}=fixture(96),device=gpu();let creates=0;
 const acquire=(key,bytes)=>store.acquireGpu({contentKey:key,context:device.gl,epoch:0,role:'candidate',estimate:{category:'gpu-buffer',bytes,precision:'exact'},create:()=>({id:++creates}),dispose(){}});
 const a=acquire('group/a',64),scene=store.createScene('actual-main'),first=scene.reconcile({generation:1,wanted:['group/a'],context:device.gl,epoch:0});
 first.add(a);assert.equal(first.publish(),true);a.release();
 assert.throws(()=>acquire('group/b',64),{name:'ResourceBudgetExceededError'});
 assert.equal(creates,1);assert.equal(scene.leases[0].value.id,1);assert.equal(scene.generation,1);assert.equal(budget.stats.bytes,64);
 scene.destroy();device.complete();store.collectRetired();assert.equal(budget.stats.bytes,0);
});

test('scene intersection reuses allocation, capture pins removed chunks until execution ends',()=>{
 const {store,budget}=fixture(),device=gpu(),deleted=[];let creates=0;
 const acquire=key=>store.acquireGpu({contentKey:key,context:device.gl,epoch:0,role:'candidate',estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({id:++creates}),dispose:value=>deleted.push(value.id)});
 const a=acquire('group/a'),b=acquire('group/b'),bValue=b.value,scene=store.createScene('actual-main');
 let next=scene.reconcile({generation:1,wanted:['group/a','group/b'],context:device.gl,epoch:0});
 next.add(a);next.add(b);assert.equal(next.publish(),true);a.release();b.release();
 const capture=scene.capture('reflection'),bAgain=acquire('group/b'),c=acquire('group/c');
 next=scene.reconcile({generation:2,wanted:['group/b','group/c'],context:device.gl,epoch:0});
 assert.equal(next.get('group/b').value,bValue);next.add(c);assert.equal(next.publish(),true);bAgain.release();c.release();
 assert.equal(creates,3);assert.equal(scene.leases[0].value,bValue);assert.equal(capture.version,1);assert.equal(scene.version,2);assert.deepEqual(deleted,[]);
 capture.release();capture.release();assert.deepEqual(deleted,[1]);
 assert.equal(budget.stats.bytes,96);assert.equal(budget.stats.retiringBytes,32);
 device.complete();store.collectRetired();assert.equal(budget.stats.bytes,64);
 scene.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0);assert.deepEqual(deleted,[1,2,3]);
});

test('ready scene captures keep their version and retired GPU chunks until frame release',()=>{
 const {store,budget}=fixture(),device=gpu(),deleted=[];let creates=0;
 const acquire=key=>store.acquireGpu({contentKey:key,context:device.gl,epoch:0,role:'candidate',estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({id:++creates}),dispose:value=>deleted.push(value.id)});
 const a=acquire('ready/a'),b=acquire('ready/b'),scene=store.createScene('ready-main');
 let next=scene.reconcile({generation:11,wanted:['ready/a','ready/b'],context:device.gl,epoch:0});
 next.add(a);next.add(b);assert.equal(next.publish(),true);a.release();b.release();
 const frame=scene.captureReady('main'),heldA=frame.borrows[0],heldB=frame.borrows[1],c=acquire('ready/c');
 assert.equal('ready' in frame,false);assert.equal('ready' in heldA,false);
 assert.equal(heldA.context,device.gl);assert.equal(heldA.epoch,0);
 next=scene.reconcile({generation:12,wanted:['ready/b','ready/c'],context:device.gl,epoch:0});
 next.add(c);assert.equal(next.publish(),true);c.release();
 assert.equal(frame.version,1);assert.equal(frame.generation,11);assert.equal(scene.version,2);assert.equal(scene.generation,12);
 assert.deepEqual(frame.borrows.map(borrow=>borrow.contentKey),['ready/a','ready/b']);
 assert.strictEqual(scene.leases[0].value,heldB.value);assert.equal(heldA.value.id,1);
 assert.deepEqual(deleted,[]);assert.equal(budget.stats.retiringBytes,0);
 frame.release();frame.release();
 assert.equal(frame.borrows.length,0);assert.equal(heldA.released,true);assert.equal(heldA.value,undefined);
 assert.deepEqual(deleted,[1]);assert.equal(budget.stats.bytes,96);assert.equal(budget.stats.retiringBytes,32);
 device.complete();store.collectRetired();assert.equal(budget.stats.bytes,64);
 scene.destroy();store.collectRetired();assert.deepEqual(deleted,[1,2,3]);assert.equal(budget.stats.bytes,0);
});

test('ready capture rolls back earlier borrows when a later published context is lost',async()=>{
 const {store,budget}=fixture(),device=gpu();let cpuDisposed=0,gpuDeleted=0;
 const source=store.acquire({contentKey:'mixed/cpu',role:'source',estimate:cost(32),produce:()=>new Uint8Array(32),dispose(){cpuDisposed++;}});
 await source.ready;
 const graphics=store.acquireGpu({contentKey:'mixed/gpu',context:device.gl,epoch:0,role:'candidate',estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({id:1}),dispose(){gpuDeleted++;}});
 // This store scene intentionally owns CPU then GPU resources, so context loss
 // fails the second real borrow after the first has already been acquired.
 const scene=store.createScene('mixed-ready'),next=scene.reconcile({generation:1,wanted:['mixed/cpu','mixed/gpu']});
 next.add(source);next.add(graphics);assert.equal(next.publish(),true);source.release();graphics.release();
 const frame=scene.captureReady('reflection'),lost=frame.borrows[1];
 store.invalidateContext(device.gl,0);
 assert.equal(lost.context,device.gl);assert.equal(lost.epoch,0);assert.equal(lost.state,'lost');assert.equal(lost.value,undefined);
 assert.equal(store.contextEpoch(device.gl),1);assert.equal(gpuDeleted,0);
 const roles=store.stats.roles;
 assert.throws(()=>scene.captureReady('main'),/not ready/);
 assert.equal(store.stats.roles,roles,'failed capture must release the earlier CPU draw pin');
 assert.equal(budget.stats.bytes,32);assert.equal(cpuDisposed,0);
 scene.destroy();assert.equal(cpuDisposed,0,'the completed frame still owns its CPU resource');
 frame.release();frame.release();
 assert.equal(cpuDisposed,1);assert.equal(gpuDeleted,0);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('cohort readiness and stale generation cannot replace the old complete scene',()=>{
 const {store}=fixture(),device=gpu();let ready=false,active=true;
 const acquire=key=>store.acquireGpu({contentKey:key,context:device.gl,epoch:0,role:'candidate',estimate:{category:'gpu-buffer',bytes:16,precision:'exact'},create:()=>({key}),dispose(){}});
 const a=acquire('a'),b=acquire('b'),scene=store.createScene('cohort-main');
 let next=scene.reconcile({generation:1,wanted:['a']});next.add(a);assert.equal(next.publish(),true);a.release();
 next=scene.reconcile({generation:2,wanted:['a','b'],cohorts:[{key:'outline-parts-mask',members:['a','b'],ready:()=>ready}],current:()=>active});
 assert.equal(next.publish(),false);assert.equal(scene.generation,1);
 next.add(b);assert.equal(next.publish(),false);assert.equal(scene.generation,1);
 ready=true;active=false;assert.equal(next.publish(),false);assert.equal(next.cancelled,true);assert.equal(next.get('b'),undefined);
 assert.equal(scene.leases[0].value.key,'a');
 assert.throws(()=>next.add(b),{name:'AbortError'});b.release();scene.destroy();device.complete();store.collectRetired();
});

test('GPU incarnation loss preserves CPU content and never deletes through the old epoch',async()=>{
 const {store,budget}=fixture(),device=gpu();let packed=0,created=0,deleted=0;
 const source=store.acquire({contentKey:'source/authoritative',role:'source',estimate:cost(32),produce(){packed++;return new Uint8Array(32);}});
 await source.ready;
 const acquire=epoch=>store.acquireGpu({contentKey:'group/stable-content',context:device.gl,epoch,role:'main',parents:[source],estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({id:++created}),dispose(){deleted++;}});
 const old=acquire(0);store.invalidateContext(device.gl,0);
 assert.equal(old.state,'lost');assert.equal(old.value,undefined);assert.equal(deleted,0);assert.equal(source.value.byteLength,32);assert.equal(budget.stats.bytes,32);
 assert.throws(()=>acquire(0),/epoch is stale/);const current=acquire(store.contextEpoch(device.gl));assert.equal(current.value.id,2);assert.equal(packed,1);
 store.invalidateContext(device.gl,0);assert.equal(current.value.id,2,'a late old owner cannot invalidate a restored peer');
 source.release();assert.equal(budget.stats.bytes,64,'GPU parent still pins CPU source');
 current.release();assert.equal(deleted,1);device.complete();store.collectRetired();assert.equal(budget.stats.bytes,0);old.release();
});

test('restored GPU admission survives eviction of the epoch index and shares its CPU parent',async()=>{
 const {store,budget}=fixture(160),device=gpu(),deleted=[];let created=0,cpuDisposed=0;
 const source=store.acquire({contentKey:'recovery/source',role:'source',estimate:cost(16),produce:()=>new Uint8Array(16),dispose(){cpuDisposed++;}});
 await source.ready;
 const acquire=(key,bytes,allowRecent=false)=>store.acquireGpu({contentKey:key,context:device.gl,epoch:store.contextEpoch(device.gl),role:'main',parents:[source],allowRecent,estimate:{category:'gpu-buffer',bytes,precision:'exact'},create:()=>({id:++created}),dispose:value=>deleted.push(value.id)});
 const old=acquire('recovery/old',32),oldFrame=old.borrowReady('main');old.release();
 device.lose();store.invalidateContext(device.gl,0);
 assert.equal(oldFrame.state,'lost');assert.equal(oldFrame.value,undefined);assert.equal(budget.stats.bytes,16);assert.deepEqual(deleted,[]);
 device.restore();device.complete();
 const recent=acquire('recovery/recent',64,true);recent.release();
 assert.equal(budget.stats.bytes,80);assert.equal(budget.stats.recentBytes,80);
 // 16 CPU + 64 recent GPU + 96 new GPU exceeds 160. The last epoch-1
 // cache entry must leave its index during the new allocation's admission.
 const first=acquire('recovery/current',96),second=acquire('recovery/current',96);
 assert.strictEqual(second.value,first.value);assert.equal(created,3);assert.equal(store.stats.gpuAllocations,3);
 assert.equal(store.stats.productions,1);assert.equal(store.stats.resources,2);assert.equal(store.stats.roles,4,'two consumers share one GPU parent pin');
 assert.equal(budget.stats.bytes,112);assert.deepEqual(deleted,[2]);
 oldFrame.release();source.release();first.release();
 assert.equal(second.value.id,3);assert.equal(cpuDisposed,0);assert.equal(budget.stats.bytes,112);
 second.release();assert.deepEqual(deleted,[2,3]);assert.equal(cpuDisposed,0,'the GPU fence still owns its CPU parent');
 store.collectRetired();assert.equal(cpuDisposed,1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('GPU admission keeps a same-key allocation made by a reentrant capacity callback',()=>{
 const {store,budget}=fixture(128),device=gpu();let created=0,nested=false,winner;
 device.complete();
 const acquire=(key,bytes,allowRecent=false)=>store.acquireGpu({contentKey:key,context:device.gl,epoch:0,role:'main',allowRecent,estimate:{category:'gpu-buffer',bytes,precision:'exact'},create:()=>({id:++created}),dispose(){}});
 const recent=acquire('admission/recent',96,true);recent.release();
 const stop=budget.onAvailable(()=>{
  if(nested||budget.stats.availableBytes<48)return;
  nested=true;winner=acquire('admission/shared',48);
 });
 const outer=acquire('admission/shared',48);stop();
 assert.ok(winner);assert.strictEqual(outer.value,winner.value);assert.equal(created,2);
 assert.equal(store.stats.gpuAllocations,2);assert.equal(store.stats.resources,1);assert.equal(store.stats.roles,2);
 assert.equal(budget.stats.bytes,48,'the unused outer reservation was released');
 const again=acquire('admission/shared',48);assert.strictEqual(again.value,winner.value);assert.equal(created,2);
 winner.release();outer.release();assert.ok(again.value);again.release();store.collectRetired();
 assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('CPU admission joins a reentrant pending producer while consumers cancel independently',async()=>{
 const {store,budget}=fixture(128),pending=deferred(),controller=new AbortController();
 let builds=0,disposed=0,sourceDisposed=0,nested=false,winner,producerSignal;
 const source=store.acquire({contentKey:'admission/cpu-source',role:'source',estimate:cost(16),produce:()=>new Uint8Array(16),dispose(){sourceDisposed++;}});
 await source.ready;
 const recent=store.acquire({contentKey:'admission/cpu-cache',role:'source',allowRecent:true,estimate:cost(96),produce:()=>new Uint8Array(96)});
 await recent.ready;recent.release();
 const request={contentKey:'admission/cpu-shared',role:'candidate',parents:[source],estimate:cost(48),produce(context){builds++;producerSignal=context.signal;return pending.promise;},dispose(){disposed++;}};
 const stop=budget.onAvailable(()=>{
  if(nested||budget.stats.availableBytes<48)return;
  nested=true;winner=store.acquire(request);
 });
 const outer=store.acquire({...request,signal:controller.signal});stop();
 assert.ok(winner);assert.equal(builds,1);assert.equal(store.stats.resources,2);assert.equal(store.stats.roles,4);
 assert.equal(budget.stats.bytes,64);assert.notStrictEqual(outer.ready,winner.ready);
 controller.abort();await assert.rejects(outer.ready,{name:'AbortError'});
 assert.equal(producerSignal.aborted,false);assert.equal(winner.state,'preparing');
 source.release();assert.equal(sourceDisposed,0,'the shared producer owns its source exactly until completion and final release');
 pending.resolve(new Uint8Array(48));assert.equal(await winner.ready,undefined);
 assert.equal(winner.value.byteLength,48);assert.equal(builds,1);assert.equal(budget.stats.bytes,64);
 winner.release();assert.equal(disposed,1);assert.equal(sourceDisposed,1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('context loss during GPU admission rolls back before indexing or creating the old epoch',()=>{
 const {store,budget}=fixture(128),device=gpu();let created=0;
 device.complete();
 const acquire=(key,bytes,epoch,allowRecent=false)=>store.acquireGpu({contentKey:key,context:device.gl,epoch,role:'main',allowRecent,estimate:{category:'gpu-buffer',bytes,precision:'exact'},create:()=>({id:++created}),dispose(){}});
 const recent=acquire('admission/old-cache',96,0,true);recent.release();
 const stop=budget.onPressure(()=>{device.lose();store.invalidateContext(device.gl,0);});
 assert.throws(()=>acquire('admission/cancelled',48,0),/incarnation changed before allocation/);stop();
 assert.equal(created,1);assert.equal(store.contextEpoch(device.gl),1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
 device.restore();
 const current=acquire('admission/cancelled',48,1),peer=acquire('admission/cancelled',48,1);
 assert.strictEqual(peer.value,current.value);assert.equal(created,2);assert.equal(budget.stats.bytes,48);
 current.release();peer.release();store.collectRetired();assert.equal(budget.stats.bytes,0);
});

test('recent reuse has one global entry limit and pressure evicts actual payloads',async()=>{
 const api=runtime(),budget=api.createResourceBudget({limitBytes:96,recentLimitBytes:64}),store=api.createChunkResourceStore({budget,recentMaxEntries:1}),disposed=[];
 const acquire=key=>store.acquire({contentKey:key,role:'source',estimate:cost(32),allowRecent:true,produce:()=>({key}),dispose:value=>disposed.push(value.key)});
 const a=acquire('a');await a.ready;a.release();assert.equal(budget.stats.recentBytes,32);
 const aAgain=acquire('a');await aAgain.ready;assert.equal(store.stats.productions,1);aAgain.release();
 const b=acquire('b');await b.ready;b.release();assert.deepEqual(disposed,['a']);assert.equal(store.stats.recent,1);assert.equal(budget.stats.bytes,32);
 store.evictRecent();assert.deepEqual(disposed,['a','b']);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.recent,0);
});

test('building cache eviction leaves greenery and unrelated building caches reusable',async()=>{
 const {store,budget}=fixture(),disposed=[];
 const acquire=key=>store.acquire({contentKey:key,role:'source',estimate:cost(16),allowRecent:true,produce:()=>({key}),dispose:value=>disposed.push(value.key)});
 const keys=['building/left','building/left-neighbour','greenery/city'];
 for(const key of keys){const lease=acquire(key);await lease.ready;lease.release();}
 store.evictRecent([]);store.evictRecent(['building']);
 assert.deepEqual(disposed,[],'empty and prefix-only selections cannot flush the cache');
 store.evictRecent(['building/left','building/left']);
 assert.deepEqual(disposed,['building/left']);assert.equal(budget.stats.bytes,32);
 for(const key of keys.slice(1)){const lease=acquire(key);await lease.ready;lease.release();}
 assert.equal(store.stats.productions,3,'untargeted payloads remain available without reloading');
 store.destroy();assert.equal(budget.stats.bytes,0);
});

test('targeted building eviction protects live passes and waits for GPU completion',async()=>{
 const {store,budget}=fixture(),device=gpu();let disposed=0;
 const building=store.acquireGpu({contentKey:'building/detail',context:device.gl,epoch:0,role:'cache',estimate:{category:'gpu-buffer',bytes:16,precision:'exact'},create:()=>({id:1}),dispose(){disposed++;}});
 const reflection=building.borrowReady('reflection');
 const green=store.acquire({contentKey:'greenery/city',role:'source',estimate:cost(16),allowRecent:true,produce:()=>new Uint8Array(16)});
 await green.ready;green.release();
 store.evictRecent(['building/detail']);
 assert.equal(building.released,true);assert.equal(reflection.value.id,1);assert.equal(disposed,0);
 reflection.release();assert.equal(budget.stats.bytes,32,'GPU reservation survives until its fence completes');
 device.complete();store.collectRetired();
 assert.equal(disposed,1);assert.equal(budget.stats.bytes,16);assert.equal(store.stats.recent,1);
 store.destroy();assert.equal(budget.stats.bytes,0);
});

test('GPU recent charge includes retained CPU ancestry without duplicating page bytes',async()=>{
 const api=runtime(),budget=api.createResourceBudget({limitBytes:128,recentLimitBytes:32}),store=api.createChunkResourceStore({budget}),device=gpu();
 let sourceDisposals=0,gpuDisposals=0,creates=0;
 const source=store.acquire({contentKey:'source/parent',role:'source',estimate:cost(16),produce:()=>new Uint8Array(16),dispose(){sourceDisposals++;}});
 await source.ready;
 const acquire=()=>store.acquireGpu({contentKey:'group/child',context:device.gl,epoch:0,role:'main',parents:[source],allowRecent:true,estimate:{category:'gpu-buffer',bytes:16,precision:'exact'},create:()=>({id:++creates}),dispose(){gpuDisposals++;}});
 const first=acquire();source.release();first.release();
 assert.equal(budget.stats.bytes,32);assert.equal(budget.stats.recentBytes,32,'cache budget includes its source parent, once');
 // A hit ignores the now-released input parent lease and uses its own retained
 // dependency; it never regenerates or uploads the immutable content.
 const second=acquire();assert.equal(second.value.id,1);assert.equal(creates,1);
 assert.equal(budget.stats.recentBytes,0);second.release();store.evictRecent();
 assert.equal(budget.stats.bytes,32);assert.equal(budget.stats.retiringBytes,32);assert.equal(gpuDisposals,1);assert.equal(sourceDisposals,0);
 device.complete();store.collectRetired();assert.equal(sourceDisposals,1);assert.equal(budget.stats.bytes,0);
});

test('evicting an explicit cache role clears its holder but preserves a functional consumer',async()=>{
 const {store,budget}=fixture();let disposed=0,notifications=0,cache;
 cache=store.acquire({contentKey:'source/cached',role:'cache',estimate:cost(16),produce:()=>new Uint8Array(16),dispose(){disposed++;},onChange(){if(cache?.released){assert.equal(cache.value,undefined);notifications++;}}});
 await cache.ready;const functional=cache.retain('source');
 assert.equal(budget.stats.recentBytes,16);store.evictRecent();
 assert.equal(cache.released,true);assert.equal(notifications,1);assert.equal(cache.value,undefined);
 assert.equal(functional.value.byteLength,16);assert.equal(disposed,0);assert.equal(budget.stats.bytes,16);assert.equal(budget.stats.recentBytes,0);
 functional.release();assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);
});

test('temporary functional borrows do not readmit unchanged costs, while cache removal and final release still update the ledger',async()=>{
 const api=runtime(),budget=api.createResourceBudget({limitBytes:1024,recentLimitBytes:256});let adjustments=0,disposed=0;
 // Observe the real reservation; all accounting and ownership remain production.
 const observed=new Proxy(budget,{get(target,name,receiver){
  if(name==='reserve')return(...args)=>new Proxy(target.reserve(...args),{get(reservation,key,owner){
   if(key==='adjust')return(...next)=>{adjustments++;return reservation.adjust(...next);};
   return Reflect.get(reservation,key,owner);
  }});
  return Reflect.get(target,name,receiver);
 }});
 const store=api.createChunkResourceStore({budget:observed}),source=store.acquire({contentKey:'repeated-borrow',role:'source',estimate:cost(32),produce:()=>new Uint8Array(32),dispose(){disposed++;}});
 await source.ready;const baseline=adjustments,value=source.value;
 for(let index=0;index<100;index++){const borrowed=source.retain('dependency');assert.strictEqual(borrowed.value,value);borrowed.release();}
 assert.equal(adjustments,baseline,'borrowing a live resource must not run the page-wide admission calculation per numeric access');
 assert.equal(budget.stats.bytes,32);assert.equal(budget.stats.recentBytes,0);assert.equal(disposed,0);
 const cached=source.retain('cache');assert.equal(budget.stats.recentBytes,32);const withCache=adjustments;
 cached.release();assert.equal(adjustments,withCache+1,'the real recent-to-functional transition still removes its cache envelope');
 assert.equal(budget.stats.recentBytes,0);assert.strictEqual(source.value,value);
 const borrowed=source.retain('dependency');source.release();assert.strictEqual(borrowed.value,value);assert.equal(disposed,0);assert.equal(budget.stats.bytes,32,'reentrant owner release cannot free an active borrow');
 borrowed.release();assert.equal(disposed,1);assert.equal(budget.stats.bytes,0);assert.equal(store.stats.resources,0);
});

test('destroyed page store renews while its old GPU retirement remains on the same ledger',()=>{
 const api=runtime(),page={},options={limitBytes:96,recentLimitBytes:32},device=gpu(),first=api.getPageChunkResourceStore(options,page);
 api.bindChunkResourceContext(device.gl,first);
 first.acquireGpu({contentKey:'old/lifecycle',context:device.gl,epoch:0,role:'main',estimate:{category:'gpu-buffer',bytes:32,precision:'exact'},create:()=>({}),dispose(){}});
 first.destroy();assert.equal(first.destroyed,true);assert.equal(first.budget.stats.retiringBytes,32);
 const second=api.getPageChunkResourceStore(options,page);
 assert.notEqual(second,first);assert.equal(second.budget,first.budget);api.bindChunkResourceContext(device.gl,second);
 device.complete();second.collectRetired();assert.equal(second.budget.stats.bytes,0);assert.equal(api.getChunkResourceStoreForContext(device.gl),second);
});


test('default idle cache expires at 20 seconds while a live consumer remains protected',()=>{
 const f=fixture(),original=Object.getOwnPropertyDescriptor(performance,'now');let now=100;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
 try{
  assert.equal(f.store.stats.recentMaxIdleMs,20_000);
  const idle=f.store.acquire({contentKey:'idle-speed',role:'source',allowRecent:true,estimate:cost(8),produce:()=>({})});
  const active=f.store.acquire({contentKey:'active-speed',role:'main',allowRecent:true,estimate:cost(8),produce:()=>({})});
  idle.release();now+=19999;f.store.collectRetired();assert.equal(f.store.stats.recent,1);
  now++;f.store.collectRetired();assert.equal(f.store.stats.recent,0);assert(active.value);
  active.release();f.store.evictRecent();f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.store.destroy();if(original)Object.defineProperty(performance,'now',original);else delete performance.now;}
});
