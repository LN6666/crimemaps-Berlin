import test from 'node:test';
import assert from 'node:assert/strict';
import {facadeRuntime,facadePage,table,copy,settle,until,deadline,MiB} from './support/core-frozen-fixtures.mjs';
import {adoptRuntime,blockerFor,greedy} from './support/ingress-adopt-fixtures.mjs';

// The real frozen facade (frozen-paint-tables + initializer store) over the real
// byte transport, page store and ledger, with tiny null-profile tables. Each
// case gets a fresh facade (initializer completion is one-shot per module).
// These cases pin the caller-admitted table read: one claim [input, minted
// envelope] handed to the transport, a wait at admission that holds nothing,
// the refused-delivery retry recipe, the adoption order and the page-lifetime
// charge of parsed module values.
const helpers=await adoptRuntime();
const T=table('adopt-table',300),S=table('adopt-shared',200),one='painted/bremen/safety/ingress-adopt-one.ts',two='painted/bremen/safety/ingress-adopt-two.ts',shared='painted/bremen/safety/ingress-adopt-shared.ts';
const manifest=[T.d,S.d],dependencies={schema_version:1,providers:{bremen:[T.d.sha256,S.d.sha256]},initializers:{bremen:{[T.d.sha256]:{[one]:1},[S.d.sha256]:{[two]:1,[shared]:1}}}};
const fresh=await facadeRuntime({manifest,dependencies});
const input=f=>3*f.d.bytes,envelope=f=>2*f.physical.length;
const parsedBytes=f=>helpers.estimateRetainedBuildingPayload(JSON.parse(new TextDecoder().decode(f.raw))).retainedPayloadEstimateBytes;
const begin=(api,p,providers=['bremen'])=>api.beginFrozenPaintTableInitialization(p.ingress,new AbortController().signal,providers);

test('one byte short of input plus envelope, the table read waits at admission holding nothing, then reads once',async()=>{
 const api=await fresh(),p=facadePage(api),{budget}=p,blocker=blockerFor(budget,input(T)+envelope(T)-1);
 const session=begin(api,p),pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 for(let i=0;i<8;i++)await settle();
 const waiting=api.frozenPaintTableStats().inputLedger;
 assert.equal(p.reads.length,0);assert.equal(budget.stats.bytes,blocker.bytes,'0 bytes above the baseline while waiting');
 assert.equal(waiting.claims,0);assert.deepEqual(waiting.pending.map(row=>[row.phase,row.requiredBytes]),[['frozen-table-input',input(T)+envelope(T)]]);
 assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');assert.equal(p.transport.stats.consumers,0);
 blocker.release();
 await until(()=>p.reads.length===1,'the whole working set fits and the read starts');
 const flight=api.frozenPaintTableStats().inputLedger;
 assert.equal(flight.claimedBytes,input(T));assert.equal(flight.claimedReadBytes,envelope(T),'the claim lists the minted envelope');
 assert.equal(budget.stats.bytes,input(T)+envelope(T),'the transport entry lists the same envelope: counted once');
 assert.equal(p.transport.stats.admittedReads,1,'a caller-admitted read');
 p.deliver(T);assert.equal((await deadline(pending)).rows.length,300);await settle();
 const after=api.frozenPaintTableStats();
 assert.equal(p.reads.length,1,'exactly one read');assert.equal(after.inputLedger.admissions,1);assert.equal(after.inputLedger.deliveryRefusals,0);assert.equal(after.inputLedger.claims,0);
 session.close();p.store.evictRecent();
 assert.equal(budget.stats.bytes,after.retainedParsedEstimateBytes,'only the page-lifetime parsed value remains');assert.equal(budget.stats.availabilityListeners,0);
 p.store.destroy();
});

test('closing the session while the table read waits for capacity returns everything',async()=>{
 const api=await fresh(),p=facadePage(api),{budget}=p,blocker=blockerFor(budget,input(T)+envelope(T)-1);
 const session=begin(api,p),pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 await until(()=>api.frozenPaintTableStats().inputLedger.pending.length===1,'the input waits');
 session.close();await assert.rejects(pending,{name:'AbortError'});for(let i=0;i<4;i++)await settle();
 assert.equal(budget.stats.bytes,blocker.bytes);assert.equal(budget.stats.availabilityListeners,0);assert.equal(p.reads.length,0);
 assert.deepEqual(api.frozenPaintTableStats().inputLedger.pending,[]);
 blocker.release();p.store.destroy();
});

test('a synchronous wake-wave reserver cannot take the table read envelope; the first wave carries only what delivery frees',async()=>{
 const api=await fresh(),p=facadePage(api),{budget}=p,P=T.physical.length;
 // Exactly the working set plus room for the parsed value's page-lifetime charge.
 const blocker=blockerFor(budget,input(T)+envelope(T)+parsedBytes(T)),thief=greedy(budget,{cap:P});thief.arm();
 const session=begin(api,p),pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 await until(()=>p.reads.length===1,'the read starts at once');
 assert.equal(thief.bytes,0,'nothing was returned to the ledger before the read');
 assert.equal(api.frozenPaintTableStats().inputLedger.handoffRefusals,0,'no hand-off exists to refuse');
 p.deliver(T);assert.equal((await deadline(pending)).rows.length,300);await settle();
 assert.equal(thief.bytes,P,'the delivery wave carried only the envelope beyond the response');
 const stats=api.frozenPaintTableStats();
 assert.equal(stats.inputLedger.deliveryRefusals,0);assert.equal(stats.parsedRetention.unheldParsed,0,'the parsed value was charged');
 session.close();thief.release();thief.off();blocker.release();p.store.evictRecent();assert.equal(budget.stats.bytes,stats.retainedParsedEstimateBytes);p.store.destroy();
});

test('a response buffer larger than its envelope is refused once, then read again holding nothing with an envelope that covers it',async()=>{
 const api=await fresh(),P=T.physical.length,limit=64*MiB;
 const budget=api.createResourceBudget({limitBytes:limit,recentLimitBytes:0}),store=api.createChunkResourceStore({budget}),reads=[];
 // The response is a view of a buffer three times its size.
 const transport=api.createResourceByteTransport({namespace:'ingress-adopt',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({target,resolve});signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})});
 const body=()=>{const view=new Uint8Array(new ArrayBuffer(3*P),0,P);view.set(T.physical);return view;};
 const blocker=blockerFor(budget,input(T)+envelope(T));
 const session=api.beginFrozenPaintTableInitialization({acquireBytes:transport.acquireBytes,budget},new AbortController().signal,['bremen']);
 const pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 await until(()=>reads.length===1,'the first read starts');reads[0].resolve(body());
 await until(()=>api.frozenPaintTableStats().inputLedger.deliveryRefusals===1,'the delivery is refused');
 for(let i=0;i<4;i++)await settle();
 const waiting=api.frozenPaintTableStats().inputLedger;
 assert.equal(budget.stats.bytes,blocker.bytes,'nothing is held while the larger working set waits');
 assert.deepEqual(waiting.pending.map(row=>[row.phase,row.requiredBytes]),[['frozen-table-input',input(T)+3*P]],'input plus an envelope covering the delivered buffer');
 blocker.release();
 await until(()=>reads.length===2,'the read starts again');reads[1].resolve(body());
 assert.equal((await deadline(pending)).rows.length,300);
 assert.equal(api.frozenPaintTableStats().inputLedger.unfit,0);
 session.close();store.evictRecent();store.destroy();
});

test('a refused delivery whose larger working set exceeds the page is reported as not fitting',async()=>{
 const api=await fresh(),P=T.physical.length,limit=input(T)+envelope(T)+P-1;
 const budget=api.createResourceBudget({limitBytes:limit,recentLimitBytes:0}),store=api.createChunkResourceStore({budget}),reads=[];
 const transport=api.createResourceByteTransport({namespace:'ingress-adopt',resourceStore:store,read:target=>new Promise(resolve=>{reads.push({target,resolve});})});
 const failures=[],session=api.beginFrozenPaintTableInitialization({acquireBytes:transport.acquireBytes,budget},new AbortController().signal,['bremen'],error=>failures.push(error));
 const other=budget.reserve({category:'construction',bytes:P-1,precision:'estimate'});
 const pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 await until(()=>reads.length===1,'the read starts');
 const view=new Uint8Array(new ArrayBuffer(3*P),0,P);view.set(T.physical);reads[0].resolve(view);
 await assert.rejects(deadline(pending),{name:'ResourceBudgetExceededError'});
 assert.equal(failures.length,1);assert.equal(api.frozenPaintTableStats().inputLedger.unfit,1);assert.equal(reads.length,1,'never read again');
 assert.equal(budget.stats.bytes,other.bytes);assert.equal(budget.stats.availabilityListeners,0);
 other.release();store.destroy();
});

test('an adopted claim stops listing the delivered response; the retained input is charged once',async()=>{
 const api=await fresh(),p=facadePage(api),{budget}=p;
 const session=begin(api,p),first=session.wait(api.readFrozenTableAsync(S.d.sha256,two,0));
 await until(()=>p.reads.length===1,'the shared table is read');p.deliver(S);
 assert.equal((await deadline(first)).rows.length,200);await settle();
 const stats=api.frozenPaintTableStats();
 assert.equal(stats.retention.holds,1,'kept for its remaining initializer');assert.equal(stats.retention.heldBytes,3*S.d.bytes,'the retained copy and one next-parse working copy');
 assert.deepEqual({...(budget.stats.categories.read??{bytes:0,exactBytes:0,estimatedBytes:0})},{bytes:0,exactBytes:0,estimatedBytes:0},'the response is listed nowhere once adopted');
 assert.equal(budget.stats.bytes,3*S.d.bytes+stats.retainedParsedEstimateBytes);
 const second=await deadline(session.wait(api.readFrozenTableAsync(S.d.sha256,shared,0)));assert.equal(second.rows.length,200);await settle();
 const after=api.frozenPaintTableStats();
 assert.equal(after.retention.holds,0);assert.equal(p.reads.length,1,'the remaining initializer parsed the retained input');
 assert.equal(after.parsedRetention.claims,2,'each initializer value is charged');assert.equal(budget.stats.bytes,after.retainedParsedEstimateBytes);
 session.close();p.store.destroy();
});

test('a parsed value whose page-lifetime charge is refused still resolves; it is counted as unheld',async()=>{
 const api=await fresh(),p=facadePage(api),{budget}=p,blocker=blockerFor(budget,input(T)+envelope(T));
 const session=begin(api,p),pending=session.wait(api.readFrozenTableAsync(T.d.sha256,one,0));
 await until(()=>p.reads.length===1,'the read starts');p.deliver(T);
 assert.equal((await deadline(pending)).rows.length,300);await settle();
 const stats=api.frozenPaintTableStats();
 assert.equal(stats.parsedRetention.unheldParsed,1);assert.equal(stats.parsedRetention.unheldParsedBytes,parsedBytes(T));
 assert.equal(stats.retainedParsedEstimateBytes,0);assert.equal(stats.failures,0,'the initializer did not fail');
 session.close();p.store.evictRecent();assert.equal(budget.stats.bytes,blocker.bytes);
 blocker.release();p.store.destroy();
});
