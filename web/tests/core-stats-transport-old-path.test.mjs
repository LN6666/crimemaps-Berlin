import test from 'node:test';
import assert from 'node:assert/strict';
import {KiB,loadCoreTransport,settle,transportHarness,until} from './support/core-transport-harness.mjs';

// The 3-argument acquireBytes path (DECISIONS 2026-11-02 04:00, ruling (1)):
// a recent hit inside store.acquire sends a wake wave before the lease is
// returned. A consumer cancelled in that wave (its signal aborted, or the
// transport destroyed) had already released, so the lease acquire then
// returned was never released and pinned the buffer. It is returned now. The
// rest of the 3-argument path, its own envelope admission and capacity wait,
// is unchanged. CORE_TRANSPORT_SOURCE swaps the transport for a negative
// control (see the harness).
const api=await loadCoreTransport();
const MAX=64*KiB,SIZE=48*KiB,timeout={timeout:10_000};
const A='/safety/buildings3d/core-stats/a.json';
const live=()=>new AbortController().signal;
/** One completed 3-argument read whose released buffer sits in the recent copy. */
async function recentCopy(h){
 const first=h.transport.acquireBytes(A,live(),MAX);
 await until(()=>h.reads.length===1,'the read is issued');
 h.reads[0].resolve(new Uint8Array(SIZE));(await first).release();
 assert.equal(h.real.stats.recentBytes,SIZE,'a recent copy');
}

for(const how of ['abort','destroy'])test('a 3-argument recent hit cancelled inside the store wake wave ('+how+') returns its lease, so nothing stays pinned',timeout,async()=>{
 {
  const h=transportHarness(api);
  await recentCopy(h);
  const controller=new AbortController();let waves=0;
  const stop=h.real.onAvailable(()=>{waves++;if(how==='abort')controller.abort();else h.transport.destroy();});
  await assert.rejects(h.transport.acquireBytes(A,controller.signal,MAX),{name:'AbortError'});stop();
  assert(waves>=1,how+': the recent hit sent its wake wave inside acquire');
  assert.equal(h.reads.length,1,how+': a recent hit issues no second network read');
  await settle();h.store.evictRecent();
  assert.equal(h.real.stats.bytes,0,how+': no lease pins the buffer');
  assert.equal(h.store.stats.resources,0,how);assert.equal(h.store.stats.roles,0,how);
  if(how==='abort')assert.equal(h.transport.stats.consumers,0,how+': no consumer is left');
 }
});

test('an uncancelled 3-argument recent hit still delivers the recent buffer and returns it to the recent copy on release',timeout,async()=>{
 const h=transportHarness(api);
 await recentCopy(h);
 let waves=0;const stop=h.real.onAvailable(()=>{waves++;});
 const lease=await h.transport.acquireBytes(A,live(),MAX);stop();
 assert(waves>=1,'the hit sent its wake wave');assert.equal(lease.bytes.byteLength,SIZE);assert.equal(h.reads.length,1,'served from the recent copy');
 assert.equal(h.real.stats.recentBytes,0,'the live consumer moved the buffer out of the recent copy');
 lease.release();await settle();
 assert.equal(h.real.stats.recentBytes,SIZE,'released, it is a recent copy again');
 h.store.evictRecent();assert.equal(h.real.stats.bytes,0);assert.equal(h.store.stats.resources,0);
});

test('a 3-argument consumer cancelled while its read is in flight still fails without a lease, and a full ledger still waits holding nothing',timeout,async()=>{
 const h=transportHarness(api,{limitBytes:4*MAX,recentLimitBytes:MAX});
 const controller=new AbortController(),read=h.transport.acquireBytes(A,controller.signal,MAX);
 await until(()=>h.reads.length===1,'the read is issued');
 controller.abort();await assert.rejects(read,{name:'AbortError'});
 h.reads[0].resolve(new Uint8Array(SIZE));await settle();h.store.evictRecent();
 assert.equal(h.real.stats.bytes,0,'an abandoned miss leaves nothing behind');
 // A full ledger: the 3-argument path keeps its own capacity wait.
 const other=h.fill(4*MAX-MAX),waiting=h.transport.acquireBytes(A,live(),MAX);
 await settle();assert.equal(h.reads.length,1,'nothing is read while the envelope does not fit');assert.equal(h.real.stats.bytes,other.bytes,'the waiting consumer holds nothing');
 other.release();await until(()=>h.reads.length===2,'the wake admits and issues the read');
 h.reads[1].resolve(new Uint8Array(SIZE));(await waiting).release();await settle();h.store.evictRecent();
 assert.equal(h.real.stats.bytes,0);
});
