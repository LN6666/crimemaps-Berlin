import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// One bundle so the transport, store and ledger share module state.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export {createResourceByteTransport,resourceByteReadEnvelope,RESOURCE_BYTE_READ_COPIES} from './resource-byte-transport';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {createResourceByteTransport,resourceByteReadEnvelope,RESOURCE_BYTE_READ_COPIES,createChunkResourceStore,createResourceBudget,ResourceBudgetExceededError}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(budgetOptions){
 const budget=createResourceBudget(budgetOptions),store=createChunkResourceStore({budget}),reads=[];
 const transport=createResourceByteTransport({namespace:'transient-test',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});})});
 const peak={bytes:0};const sample=()=>{peak.bytes=Math.max(peak.bytes,budget.stats.bytes);};
 return{budget,store,transport,reads,peak,sample};
}

test('the network chunk list and its contiguous copy are admitted before the request, completion keeps only the exact buffer',async()=>{
 const max=256*1024,size=200*1024,{budget,store,transport,reads}=harness({limitBytes:64*MiB,recentLimitBytes:8*MiB});
 assert.equal(RESOURCE_BYTE_READ_COPIES,2);
 assert.deepEqual(resourceByteReadEnvelope('/p',max).map(cost=>[cost.category,cost.bytes,cost.precision]),[['read',max,'estimate'],['read',max,'estimate']]);
 const pending=transport.acquireBytes('/safety/buildings3d/a.json',new AbortController().signal,max);
 // Admission is synchronous; no read has been issued yet.
 assert.equal(reads.length,0);
 assert.deepEqual({...budget.stats.categories.read},{bytes:2*max,exactBytes:0,estimatedBytes:2*max});
 await settle();assert.equal(reads.length,1);assert.equal(reads[0].max,max);
 reads[0].resolve(new Uint8Array(size));
 const lease=await pending;
 assert.equal(lease.bytes.byteLength,size);
 assert.deepEqual({...budget.stats.categories.read},{bytes:size,exactBytes:size,estimatedBytes:0},'the envelope shrinks to the exact contiguous buffer');
 lease.release();assert.throws(()=>lease.bytes,/released/);
 assert(budget.stats.recentBytes<=size,'released bytes stay only inside the bounded recent subset');
 store.evictRecent();assert.equal(budget.stats.bytes,0);assert.equal(transport.stats.retainedByteResources,0);
});

test('a read whose working set does not fit beside an active read waits without starting, then wakes when that envelope shrinks',async()=>{
 // Above 1 MiB the transport keeps no recent copy, so release retires immediately.
 const max=2*MiB,limit=3*max,{budget,transport,reads,peak,sample}=harness({limitBytes:limit,recentLimitBytes:MiB});
 const first=transport.acquireBytes('/safety/buildings3d/a.json',new AbortController().signal,max);sample();
 const second=transport.acquireBytes('/safety/buildings3d/b.json',new AbortController().signal,max);sample();
 await settle();sample();
 assert.deepEqual(reads.map(read=>read.path),['/safety/buildings3d/a.json'],'the second request is not issued while two full copies of the first may coexist');
 assert.equal(budget.stats.bytes,2*max);assert.equal(budget.stats.availabilityListeners,1);
 reads[0].resolve(new Uint8Array(max));
 const a=await first;await settle();sample();
 assert.deepEqual(reads.map(read=>read.path),['/safety/buildings3d/a.json','/safety/buildings3d/b.json'],'the smaller exact buffer wakes the waiting request');
 assert.equal(budget.stats.bytes,max+2*max);assert.equal(budget.stats.availabilityListeners,0);
 reads[1].resolve(new Uint8Array(max));
 const b=await second;sample();
 assert(peak.bytes<=limit,'the logical ledger never exceeded its limit');
 a.release();b.release();assert.equal(budget.stats.bytes,0);
});

test('a single read whose two-copy working set exceeds the page ledger is reported as not fitting instead of queueing',async()=>{
 const max=2*MiB,{budget,transport,reads}=harness({limitBytes:3*MiB,recentLimitBytes:MiB});
 await assert.rejects(transport.acquireBytes('/safety/buildings3d/huge.json',new AbortController().signal,max),error=>error instanceof ResourceBudgetExceededError&&error.required>=2*max&&error.capacity===3*MiB);
 await settle();
 assert.equal(reads.length,0);assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.bytes,0);
 // A read whose complete envelope fits is still admitted by the same ledger.
 const fitting=transport.acquireBytes('/safety/buildings3d/fits.json',new AbortController().signal,MiB);
 await settle();assert.equal(reads.length,1);reads[0].resolve(new Uint8Array(MiB));(await fitting).release();
});

test('cancelling a waiting read removes its wake-up listener and never issues the request',async()=>{
 const max=2*MiB,{budget,transport,reads}=harness({limitBytes:3*max,recentLimitBytes:MiB});
 const first=transport.acquireBytes('/safety/buildings3d/a.json',new AbortController().signal,max);
 const controller=new AbortController(),second=transport.acquireBytes('/safety/buildings3d/b.json',controller.signal,max);
 await settle();assert.equal(budget.stats.availabilityListeners,1);
 controller.abort();
 await assert.rejects(second,error=>error?.name==='AbortError');
 assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.bytes,2*max);
 reads[0].resolve(new Uint8Array(max));(await first).release();await settle();
 assert.deepEqual(reads.map(read=>read.path),['/safety/buildings3d/a.json']);assert.equal(budget.stats.bytes,0);
});
