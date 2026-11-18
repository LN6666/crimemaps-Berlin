import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {facadeRuntime,facadePage,initializerRuntime,table,copy,settle,until,deadline,deferred,source,readWorkingSet} from './support/core-frozen-fixtures.mjs';
// IA-R2 (stage 2 ingress-adopt CDR[2]): a parsed frozen table module value stays on the page ledger as a
// page-lifetime 'metadata' estimate (DECISIONS 2026-11-02 03:25), so every ledger-byte expectation adds
// retainedParsedEstimateBytes. Blockers are still sized from the real stats.bytes.

// session.settled(signal): resolves once no initializer the session selects is
// pending, rejects with the session's end or the caller's abort, holds nothing.
const freshStore=await initializerRuntime();
const a=table('settled-a',40,{gzip:false}),b=table('settled-b',30,{gzip:false});
const file=name=>`painted/root500/safety/core-frozen-settled-${name}.ts`;
const selection=rows=>({tables:[...new Set(rows.map(row=>row.f.d.sha256))],initializers:rows.reduce((out,{f,file:name})=>{const row=out[f.d.sha256]??={};row[name]=(row[name]??0)+1;return out;},{})});
const signal=()=>new AbortController().signal;
async function store(fixtures=[a,b]){const {createFrozenInitializerStore}=await freshStore();return createFrozenInitializerStore(fixtures.map(f=>f.d));}
const gatedReader=fixtures=>{const gates=new Map(fixtures.map(f=>[f.path,deferred()]));return{gates,read:async(target,readSignal)=>{const bytes=await gates.get(target).promise;readSignal.throwIfAborted();return copy(bytes);},open(f){gates.get(f.path).resolve(f.physical);}};};

test('settled resolves at once while nothing it selects is pending, including selected initializers no module requested',async()=>{
 const s=await store(),rows=[{f:a,file:file('a')},{f:b,file:file('b')}];
 const session=s.begin(async()=>assert.fail('nothing is read'),signal(),selection(rows));
 await deadline(session.settled(signal()));
 assert.equal(s.stats.reads,0);assert.equal(s.stats.settledWaiters,0);assert.equal(s.stats.ownedTimers,0);session.close();
});

test('settled waits for every requested initializer it selects and resolves after they complete',async()=>{
 const s=await store(),rows=[{f:a,file:file('a')},{f:b,file:file('b')}],reader=gatedReader([a,b]),events=[];
 const session=s.begin(reader.read,signal(),selection(rows));
 const va=s.read(a.d.sha256,rows[0].file).then(value=>{events.push('a');return value;}),vb=s.read(b.d.sha256,rows[1].file).then(value=>{events.push('b');return value;});
 const done=session.settled(signal()).then(()=>{events.push('settled');});
 await settle();assert.deepEqual(events,[]);assert.equal(s.stats.settledWaiters,1);
 reader.open(a);await until(()=>events.includes('a'),'the first initializer completes');await settle();
 assert(!events.includes('settled'),'another selected initializer is still pending');
 reader.open(b);await deadline(done);
 assert.deepEqual(events,['a','b','settled']);assert.equal((await va).name,'settled-a');assert.equal((await vb).name,'settled-b');
 assert.equal(s.stats.settledWaiters,0);
 await deadline(session.settled(signal()),'quiescent again: resolves at once');session.close();
});

test('settled rejects with the session failure; the parked initializer completes in a later session',async()=>{
 const s=await store([a]),rows=[{f:a,file:file('fail')}];
 const session=s.begin(async()=>new Uint8Array(a.physical.length),signal(),selection(rows));
 const value=s.read(a.d.sha256,rows[0].file),waiting=session.settled(signal());
 await assert.rejects(waiting,/hash mismatch/);await assert.rejects(session.settled(signal()),/hash mismatch/,'a later call rejects with the same failure');
 assert.equal(session.active,false);assert.equal(s.stats.settledWaiters,0);
 const retry=s.begin(async()=>copy(a.physical),signal(),selection(rows));
 await deadline(retry.settled(signal()));assert.equal((await value).name,'settled-a');retry.close();
});

for(const end of ['close','replacement','begin signal'])test(`settled rejects with an AbortError when the session ends by ${end}, and at once afterwards`,async()=>{
 const s=await store([a]),rows=[{f:a,file:file('end')}],owner=new AbortController();
 const session=s.begin(()=>new Promise(()=>{}),owner.signal,selection(rows));
 const value=s.read(a.d.sha256,rows[0].file),waiting=session.settled(signal());await settle();
 let next;
 if(end==='close')session.close();else if(end==='replacement')next=s.begin(async()=>copy(a.physical),signal(),selection(rows));else owner.abort();
 await assert.rejects(waiting,{name:'AbortError'});await assert.rejects(session.settled(signal()),{name:'AbortError'});
 assert.equal(session.active,false);assert.equal(s.stats.settledWaiters,0);
 if(next){await deadline(next.settled(signal()),'the replacing session completes the initializer');assert.equal((await value).name,'settled-a');next.close();}
});

test('the caller\'s signal ends only its own wait, with its reason',async()=>{
 const s=await store([a]),rows=[{f:a,file:file('signal')}],reader=gatedReader([a]);
 const session=s.begin(reader.read,signal(),selection(rows));s.read(a.d.sha256,rows[0].file);
 const mine=new AbortController(),other=session.settled(signal()),own=session.settled(mine.signal);await settle();
 assert.equal(s.stats.settledWaiters,2);
 const reason=new DOMException('this caller left','AbortError');mine.abort(reason);
 await assert.rejects(own,error=>error===reason);assert.equal(s.stats.settledWaiters,1,'the other waiter keeps waiting');
 const gone=new AbortController();gone.abort();await assert.rejects(session.settled(gone.signal),{name:'AbortError'});
 reader.open(a);await deadline(other);assert.equal(s.stats.settledWaiters,0);session.close();
});

test('an initializer outside the selection fails the session and its settled wait',async()=>{
 const s=await store([a,b]),rows=[{f:a,file:file('in')}],reader=gatedReader([a]);
 const session=s.begin(reader.read,signal(),selection(rows));s.read(a.d.sha256,rows[0].file);
 const waiting=session.settled(signal());s.read(b.d.sha256,file('outside'));
 await assert.rejects(waiting,/outside the selected provider graph/);assert.equal(session.active,false);
});

test('through the facade a ledger session\'s settled holds no claim and resolves when its requested initializer completes',async()=>{
 const T=table('settled-t',80),fileT1=file('t1'),fileT2=file('t2');
 const fresh=await facadeRuntime({manifest:[T.d],dependencies:{schema_version:1,providers:{root500:[T.d.sha256]},initializers:{root500:{[T.d.sha256]:{[fileT1]:1,[fileT2]:1}}}}});
 const api=await fresh(),page=facadePage(api);
 const session=api.beginFrozenPaintTableInitialization(page.ingress,signal(),['root500']);
 await deadline(session.settled(signal()),'nothing requested yet');
 const first=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT1,0)),waiting=session.settled(signal());
 await until(()=>page.reads.length===1,'the requested initializer reads its table');
 assert.equal(page.budget.stats.bytes,api.frozenPaintTableStats().retainedParsedEstimateBytes+readWorkingSet(T),'the settled wait adds no claim beside the read');assert.equal(page.budget.stats.availabilityListeners,0);
 page.deliver(T);await deadline(waiting,'settled after the requested initializer');assert.equal((await first).name,'settled-t');
 assert.equal(api.frozenPaintTableStats().retention.holds,1,'T2 is selected but not requested: settled does not wait for it');
 const second=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0));await deadline(session.settled(signal()));assert.equal((await second).name,'settled-t');
 await settle();{const r=api.frozenPaintTableStats().parsedRetention;assert.equal(r.unheldParsed,0,'the parsed table value was charged to the page ledger');assert.equal(r.unledgeredParsed,0);assert(r.claims>0&&r.retainedParsedEstimateBytes>0,'the completed table value is charged as page-lifetime metadata (review F4)');}assert.equal(page.budget.stats.bytes,api.frozenPaintTableStats().retainedParsedEstimateBytes);session.close();page.store.destroy();
});

test('the frozen core owns no timer or polling loop',async()=>{
 for(const name of ['frozen-data-lease-store.ts','frozen-paint-initializer-store.ts','frozen-paint-tables.ts']){
  const text=await readFile(path.join(source,name),'utf8');
  assert.doesNotMatch(text,/\b(?:setTimeout|setInterval|requestAnimationFrame|requestIdleCallback)\s*\(/,name+' schedules no timer');
 }
});
