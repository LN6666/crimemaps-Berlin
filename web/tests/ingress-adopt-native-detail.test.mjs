import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {adoptRuntime,page,blockerFor,greedy,network,nativeShard,detailVariant,until,deadline,state,settle,MiB} from './support/ingress-adopt-fixtures.mjs';

// The working-set coefficients, read from the real modules so a recalibration
// changes one constant, not every expectation.
const {NATIVE_SOURCE_EXPANSION,NATIVE_SOURCE_VERTEX_BYTES,DETAIL_VARIANT_EXPANSION}=await (async()=>{
 const built=await build({stdin:{contents:"export {NATIVE_SOURCE_EXPANSION,NATIVE_SOURCE_VERTEX_BYTES} from './shared-native-source';\nexport {DETAIL_VARIANT_EXPANSION} from './building-detail-source';",
  resolveDir:fileURLToPath(new URL('../src/safety/',import.meta.url)),sourcefile:'ingress-adopt-native-detail-coefficients.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
 return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text+'\n// native/detail coefficients').toString('base64'));
})();
assert.ok(NATIVE_SOURCE_EXPANSION>0&&NATIVE_SOURCE_VERTEX_BYTES===48&&DETAIL_VARIANT_EXPANSION>0,'the native and detail sources export their working-set coefficients');

// The real shared native source pool and building detail source over the real
// byte transport (caller-admitted reads), page store and ledger. Network reads
// stay pending until a case settles them. A refused admission returns what its
// production holds beyond the entry's queued estimate and waits on the ledger;
// a read without a transport pre-charges its two-copy envelope and then the
// delivered buffer exactly.
const api=await adoptRuntime();
const signal=()=>new AbortController().signal;
const VERTICES=200000;
const zero={bytes:0,exactBytes:0,estimatedBytes:0};
const category=(budget,name)=>({...(budget.stats.categories[name]??zero)});
// A canonical production's working set: inflate (none, plain), normalize and the read envelope.
const nativeNeed=a=>a.bytes*NATIVE_SOURCE_EXPANSION+VERTICES*NATIVE_SOURCE_VERTEX_BYTES+2*a.bytes;
function nativePool(resources,{transport=true}={}){
 const net=network(),bytes=api.createResourceByteTransport({namespace:'ingress-adopt-native',resourceStore:resources.store,read:net.read});
 const pool=api.createSharedNativeSourcePool({resourceStore:resources.store,read:net.read,...(transport?{acquireBytes:bytes.acquireBytes}:{})});
 return{net,bytes,pool,client:pool.client('berlin')};
}

test('native: one byte short of its working set, the canonical source waits holding only its queued estimate, then reads once',async()=>{
 const resources=page(api),{budget}=resources,a=nativeShard(),n=nativePool(resources);
 const blocker=blockerFor(budget,nativeNeed(a.descriptor)-1);
 const pending=n.client.acquire(a.descriptor,signal(),VERTICES);
 await until(()=>n.pool.stats.capacityWaits===1,'the refused admission waits');for(let i=0;i<6;i++)await settle();
 assert.equal(n.net.reads.length,0);assert.equal(budget.stats.bytes,blocker.bytes+512,'0 bytes above its queued descriptor estimate');
 assert.equal(n.pool.stats.active,0,'the waiting read left the ingress slot');assert.equal(budget.stats.availabilityListeners,1);assert.equal(n.bytes.stats.consumers,0);
 blocker.release();
 await until(()=>n.net.reads.length===1,'released capacity starts the read');
 assert.equal(budget.stats.bytes,nativeNeed(a.descriptor),'expansion and the minted envelope, counted once with the transport entry');
 n.net.deliver(a.descriptor.path,new Uint8Array(a.bytes));
 const result=await deadline(pending);assert.equal(result.raw.components.length,4);
 assert.equal(n.net.reads.length,1);assert.equal(n.bytes.stats.admittedReads,1);assert.equal(n.pool.stats.unadmittedDeliveries,0);
 result.release();n.pool.destroy();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

test('native: aborting a source that waits for capacity returns everything',async()=>{
 const resources=page(api),{budget}=resources,a=nativeShard(),n=nativePool(resources),leaving=new AbortController();
 const blocker=blockerFor(budget,nativeNeed(a.descriptor)-1);
 const pending=n.client.acquire(a.descriptor,leaving.signal,VERTICES);
 await until(()=>n.pool.stats.capacityWaits===1,'the refused admission waits');
 leaving.abort();await assert.rejects(deadline(pending),{name:'AbortError'});for(let i=0;i<6;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes);assert.equal(budget.stats.availabilityListeners,0);assert.equal(n.net.reads.length,0);
 blocker.release();n.pool.destroy();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});

test('native: a synchronous wake-wave reserver cannot take the read envelope; it only gets what delivery frees',async()=>{
 const resources=page(api),{budget}=resources,a=nativeShard(),n=nativePool(resources),P=a.descriptor.bytes;
 const blocker=blockerFor(budget,nativeNeed(a.descriptor)+MiB),thief=greedy(budget,{cap:P});thief.arm();
 const pending=n.client.acquire(a.descriptor,signal(),VERTICES);
 await until(()=>n.net.reads.length===1,'the read starts at once');assert.equal(thief.bytes,0,'nothing was returned before the read');
 n.net.deliver(a.descriptor.path,new Uint8Array(a.bytes));
 const result=await deadline(pending);assert.equal(thief.bytes,P,'the delivery wave carried only the envelope beyond the response');
 assert.equal(n.pool.stats.capacityWaits,0);
 result.release();thief.release();thief.off();blocker.release();n.pool.destroy();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});

test('native without a transport pre-charges the two-copy read envelope, then the delivered buffer exactly',async()=>{
 const resources=page(api),{budget}=resources,a=nativeShard(),n=nativePool(resources,{transport:false}),P=a.descriptor.bytes;
 const pending=n.client.acquire(a.descriptor,signal(),VERTICES);
 await until(()=>n.net.reads.length===1,'the fallback read starts');
 assert.deepEqual(category(budget,'read'),{bytes:2*P,exactBytes:0,estimatedBytes:2*P},'the envelope is charged before the read');
 // The reader keeps the delivered bytes alive until the parse expansion is admitted.
 let observed;const watch=budget.onAvailable(()=>{observed??=category(budget,'read');});
 n.net.deliver(a.descriptor.path,new Uint8Array(a.bytes));
 const result=await deadline(pending);watch();
 assert.deepEqual(observed,{bytes:P,exactBytes:P,estimatedBytes:0},'the first shrink lists the delivered buffer exactly');
 result.release();n.pool.destroy();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});

const descriptorBytes=resource=>api.estimateRetainedBuildingPayload(resource).estimatedJsContainerBytes+2048;
// The display-variant read and parse claim: normalize DETAIL_VARIANT_EXPANSION x raw (plain JSON: no inflate) and the envelope.
const detailNeed=resource=>resource.descriptor.bytes*DETAIL_VARIANT_EXPANSION+2*resource.descriptor.bytes;
function detailSource(resources,{transport=true}={}){
 const net=network(),bytes=api.createResourceByteTransport({namespace:'ingress-adopt-detail',resourceStore:resources.store,read:net.read});
 const source=api.createBuildingDetailSource({city:'berlin',resourceStore:resources.store,readCanonical:async()=>assert.fail('display variants never read the canonical leaf'),readBytes:net.read,...(transport?{acquireBytes:bytes.acquireBytes}:{})});
 return{net,bytes,source};
}

test('detail: one byte short of its read and parse claim, the variant waits holding only its descriptor estimate, then reads once',async()=>{
 const resources=page(api),{budget}=resources,v=detailVariant('adopt-wait'),d=detailSource(resources);
 const blocker=blockerFor(budget,descriptorBytes(v.resource)+detailNeed(v.resource)-1);
 const pending=d.source.acquire(v.resource,{signal:signal()});
 await until(()=>d.source.stats.capacityWaits===1,'the refused admission waits');for(let i=0;i<6;i++)await settle();
 assert.equal(d.net.reads.length,0);assert.equal(budget.stats.bytes,blocker.bytes+descriptorBytes(v.resource),'0 bytes above its descriptor estimate');
 assert.equal(budget.stats.availabilityListeners,1);assert.equal(d.bytes.stats.consumers,0);
 blocker.release();
 await until(()=>d.net.reads.length===1,'released capacity starts the read');
 assert.equal(d.bytes.stats.admittedReads,1,'a caller-admitted read');
 d.net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 const lease=await deadline(pending);assert.equal(lease.value.raw.components.length,2);
 assert.equal(d.net.reads.length,1);assert.equal(d.source.stats.unadmittedDeliveries,0);
 lease.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

test('detail: aborting a variant that waits for capacity returns everything',async()=>{
 const resources=page(api),{budget}=resources,v=detailVariant('adopt-abort'),d=detailSource(resources),leaving=new AbortController();
 const blocker=blockerFor(budget,descriptorBytes(v.resource)+detailNeed(v.resource)-1);
 const pending=d.source.acquire(v.resource,{signal:leaving.signal});
 await until(()=>d.source.stats.capacityWaits===1,'the refused admission waits');
 leaving.abort();await assert.rejects(deadline(pending));for(let i=0;i<6;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes);assert.equal(budget.stats.availabilityListeners,0);assert.equal(d.net.reads.length,0);
 blocker.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});

test('detail without a transport pre-charges the two-copy read envelope before the read, then the delivered buffer exactly',async()=>{
 const resources=page(api),{budget}=resources,v=detailVariant('adopt-fallback'),d=detailSource(resources,{transport:false}),P=v.resource.descriptor.bytes;
 const pending=d.source.acquire(v.resource,{signal:signal()});
 await until(()=>d.net.reads.length===1,'the fallback read starts');
 assert.equal(d.net.reads[0].max,1024**2,'the legacy reader keeps its one-MiB ceiling');
 assert.deepEqual(category(budget,'read'),{bytes:2*P,exactBytes:0,estimatedBytes:2*P},'the envelope is charged before the read');
 let observed;const watch=budget.onAvailable(()=>{observed??=category(budget,'read');});
 d.net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 const lease=await deadline(pending);watch();
 assert.deepEqual(observed,{bytes:P,exactBytes:P,estimatedBytes:0},'the first shrink lists the delivered buffer exactly');
 lease.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});

test('detail: a refused decode returns the parsed document and its claim, waits holding only the descriptor estimate, then completes',async()=>{
 const resources=page(api),{budget}=resources,v=detailVariant('adopt-decode'),d=detailSource(resources);
 // Room for the read and parse claim plus the decode.
 const blocker=blockerFor(budget,descriptorBytes(v.resource)+detailNeed(v.resource)+256*1024);
 const pending=d.source.acquire(v.resource,{signal:signal()});
 await until(()=>d.net.reads.length===1,'the read starts');
 // Take every byte that frees from delivery on, so the decode cannot be admitted yet.
 const thief=greedy(budget);thief.arm();
 d.net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 await until(()=>d.source.stats.capacityWaits===1,'the decode is refused and waits');thief.disarm();
 for(let i=0;i<4;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes+thief.bytes+descriptorBytes(v.resource),'only the descriptor estimate is held while it waits');
 assert.equal(await state(pending),'pending');
 thief.release();
 await until(()=>d.net.reads.length===2,'with room again the pass starts over and reads again');
 d.net.deliver(v.resource.descriptor.path,new Uint8Array(v.physical));
 const lease=await deadline(pending);assert.equal(lease.value.raw.components.length,2);
 lease.release();thief.off();blocker.release();resources.store.evictRecent();assert.equal(budget.stats.bytes,0);
});
