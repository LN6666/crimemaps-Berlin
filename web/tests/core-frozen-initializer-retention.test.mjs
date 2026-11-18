import test from 'node:test';
import assert from 'node:assert/strict';
import {facadeRuntime,facadePage,initializerRuntime,table,copy,settle,until,deadline,inputClaim,readWorkingSet} from './support/core-frozen-fixtures.mjs';
// IA-R2 (stage 2 ingress-adopt CDR[2]): a parsed frozen table module value stays on the page ledger as a
// page-lifetime 'metadata' estimate (DECISIONS 2026-11-02 03:25), so every ledger-byte expectation adds
// retainedParsedEstimateBytes. Blockers are still sized from the real stats.bytes.

// The real frozen facade, initializer store, byte transport, page store and
// ledger over tiny null-profile inputs. T is shared by two initializers; U and
// V each have one. Every case is a fresh page (initializer completion is one-shot).
const T=table('T',100),U=table('U',600),V=table('V',500);
const file=name=>`painted/root500/safety/core-frozen-${name}.ts`,fileT1=file('t1'),fileT2=file('t2'),fileU=file('u'),fileV=file('v');
const manifest=[T.d,U.d,V.d],dependencies={schema_version:1,providers:{root500:[T.d.sha256,U.d.sha256,V.d.sha256]},
 initializers:{root500:{[T.d.sha256]:{[fileT1]:1,[fileT2]:1},[U.d.sha256]:{[fileU]:1},[V.d.sha256]:{[fileV]:1}}}};
const fresh=await facadeRuntime({manifest,dependencies});
const signal=()=>new AbortController().signal;
const stats=api=>api.frozenPaintTableStats();
// The parsed-value offset is itself pinned (review F4), so a refused or uncounted charge cannot hide in it:
// - none of these values is parsed without a page ledger (unledgeredParsed=0);
// - refusals are exact per scenario (DECISIONS 2026-11-02 03:25: a refused page-lifetime charge never fails
//   the initializer and is counted as unheldParsed); without page pressure every parsed value is charged;
// - the offset exists exactly when a parsed value was charged, and is positive once one was.
const parsedBytes=(api,{parsed=false,unheld=0}={})=>{const s=stats(api),r=s.parsedRetention;assert.equal(r.unheldParsed,unheld,'parsed table values refused by the page ledger');assert.equal(r.unheldParsedBytes>0,unheld>0,'refused bytes are attributed exactly when a value was refused');assert.equal(r.unledgeredParsed,0,'every parsed table value ran with a page ledger');assert.equal(s.retainedParsedEstimateBytes,r.retainedParsedEstimateBytes);assert.equal(r.claims>0,r.retainedParsedEstimateBytes>0,'an estimate exists exactly when a parsed value is charged');if(parsed)assert(r.retainedParsedEstimateBytes>0,'the parsed table value is charged as page-lifetime metadata');return r.retainedParsedEstimateBytes;};
async function firstOfT(api,page){
 const session=api.beginFrozenPaintTableInitialization(page.ingress,signal(),['root500']);
 const first=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT1,0));
 await until(()=>page.reads.length===1,'T is read');page.deliver(T);
 const value=await deadline(first,'T1 completes');await settle();
 return{session,value};
}

test('a shared table input stays charged once while it waits for its remaining initializer, then leaves with it',async()=>{
 const api=await fresh(),page=facadePage(api);
 const session=api.beginFrozenPaintTableInitialization(page.ingress,signal(),['root500']);
 const pending=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT1,0));
 await until(()=>page.reads.length===1,'T is read');
 assert.equal(page.budget.stats.bytes,parsedBytes(api)+readWorkingSet(T),'the input claim and the transport envelope while reading');
 page.deliver(T);const first=await deadline(pending);assert.equal(first.name,'T');await settle();
 const kept=stats(api);
 assert.equal(kept.inputLedger.claims,0);assert.equal(kept.inputLedger.adoptions,1,'the store adopted the read claim');assert.equal(kept.inputLedger.leasedResponses,0,'the transport response returned once the store kept its verified copy');
 assert.equal(kept.retainedTables,1);assert.equal(kept.retention.holds,1);assert.equal(kept.retention.heldBytes,inputClaim(T),'exact retained input plus one next-parse working copy');
 assert.equal(page.budget.stats.bytes,parsedBytes(api)+inputClaim(T),'the retained table is the only charge, counted once');
 assert.deepEqual({...page.budget.stats.categories.inflate},{bytes:T.d.bytes,exactBytes:T.d.bytes,estimatedBytes:0},'the inflated table exactly');
 const second=await deadline(session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0)));
 assert.equal(second.name,'T');assert.notEqual(second,first,'each initializer still parses its own value');await settle();
 assert.equal(page.reads.length,1,'the second initializer consumed the retained input without another read');
 const after=stats(api);
 assert.equal(after.retainedTables,0);assert.equal(after.retention.holds,0);assert.equal(after.retention.heldBytes,0);assert.equal(after.retention.adoptions,1);
 assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true}),'the retained table left with its last initializer');assert.equal(page.budget.stats.availabilityListeners,0);
 session.close();page.store.destroy();
});

test('consumer-first: a consumer of a retained table runs while both read slots are busy',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 assert.equal(stats(api).retention.holds,1);
 const u=session.wait(api.readFrozenTableAsync(U.d.sha256,fileU,0)),v=session.wait(api.readFrozenTableAsync(V.d.sha256,fileV,0));
 await until(()=>page.reads.length===3,'U and V hold both read slots with their network reads in flight');
 assert.equal(stats(api).activeReads,2);assert.deepEqual(stats(api).inputLedger.pending.map(row=>row.phase),['frozen-table-transport','frozen-table-transport']);
 const second=await deadline(session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0)),'the consumer runs although both read slots are busy');
 assert.equal(second.name,'T');await settle();
 const busy=stats(api);
 assert.equal(busy.retention.holds,0,'its last initializer released the retained table');assert.equal(busy.retention.evictions,0);
 assert.equal(busy.activeReads,2);assert.equal(page.reads.length,3,'no read was issued for T2');
 page.deliver(U);page.deliver(V);
 assert.equal((await deadline(u)).name,'U');assert.equal((await deadline(v)).name,'V');await settle();
 assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true}));assert.equal(page.budget.stats.availabilityListeners,0);
 session.close();page.store.destroy();
});

// Review F3: idle retained inputs are reclaimed up to the refused admission's
// shortfall, never all-or-nothing. (This case replaces the earlier expectation
// that an idle input which cannot admit a read alone is kept: such a read waits
// on availability, which does not count retained inputs as reclaimable.)
test('both read slots refused for capacity: the idle retained table is reclaimed although it cannot admit either read alone, and its later initializer reads it again',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 assert.equal(stats(api).retention.holds,1);
 const free=4096,blocker=page.budget.reserve({category:'construction',bytes:page.budget.stats.limitBytes-page.budget.stats.bytes-free,precision:'estimate',label:'other producer'});
 assert(inputClaim(T)+free<readWorkingSet(V)&&readWorkingSet(V)<readWorkingSet(U),'reclaiming the retained table admits neither read alone');
 const u=session.wait(api.readFrozenTableAsync(U.d.sha256,fileU,0)),v=session.wait(api.readFrozenTableAsync(V.d.sha256,fileV,0));
 await until(()=>stats(api).inputLedger.pending.filter(row=>row.phase==='frozen-table-input').length===2,'both read slots wait for capacity');
 const waiting=stats(api);
 assert.equal(waiting.activeReads,2);assert.equal(waiting.retention.evictions,1,'reclaimed by the first refused read');assert.equal(waiting.retention.holds,0);assert.equal(waiting.retainedTables,0);
 assert.equal(page.budget.stats.bytes,parsedBytes(api)+blocker.bytes,'nothing else is held while the reads wait');
 const second=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0));await settle();await settle();
 assert.equal(page.reads.length,1,'T2 needs a read again and queues behind the waiting read slots');
 blocker.release();
 await until(()=>page.reads.length===3,'released capacity admits both reads');page.deliver(U);page.deliver(V);
 assert.equal((await deadline(u)).name,'U');assert.equal((await deadline(v)).name,'V');
 await until(()=>page.reads.length===4,'T is read again for T2');page.deliver(T);
 assert.equal((await deadline(second)).name,'T');await settle();
 assert.equal(stats(api).failures,0);assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true}));assert.equal(page.budget.stats.availabilityListeners,0);
 session.close();page.store.destroy();
});

test('a pressure listener registered after the session frees the rest: reclaiming the idle input admits the refused read in the same refusal',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 const held=stats(api).retention.heldBytes;assert.equal(held,inputClaim(T));
 // Another cache that frees R bytes synchronously under pressure, subscribed after the session.
 const R=held,other=page.budget.reserve({category:'metadata',bytes:R,precision:'estimate',label:'other cache entry'});let freed=0;
 const stop=page.budget.onPressure(()=>{if(other.active){other.release();freed++;}});
 // U lacks more than the idle input alone, but no more than it plus R.
 const lacking=held+Math.floor(R/2),blocker=page.budget.reserve({category:'construction',bytes:page.budget.stats.limitBytes-page.budget.stats.bytes-(readWorkingSet(U)-lacking),precision:'estimate',label:'other producer'});
 const u=session.wait(api.readFrozenTableAsync(U.d.sha256,fileU,0));
 await until(()=>page.reads.length===2,'U is read inside its first refusal');
 const s=stats(api);
 assert.equal(freed,1,'the later listener released its entry inside that refusal');assert.equal(s.retention.evictions,1,'the idle input was reclaimed although it alone did not cover the shortfall');
 assert.equal(s.retention.holds,0);assert.equal(s.inputLedger.waits,0,'U never waited');
 page.deliver(U);assert.equal((await deadline(u)).name,'U');
 stop();blocker.release();await settle();// T was charged before the blocker; U was parsed while the blocker left no room, so its charge was refused.
 assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true,unheld:1}));assert.equal(page.budget.stats.availabilityListeners,0);
 session.close();page.store.destroy();
});

test('nothing is reclaimed for an admission larger than the whole page or one refused by the recent subset',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 assert.equal(stats(api).retention.holds,1);
 const huge=page.budget.tryReserve({category:'construction',bytes:page.budget.stats.limitBytes+1,precision:'estimate',label:'never fits'});
 assert.equal(huge.ok,false);assert.equal(stats(api).retention.holds,1,'an unfit admission reclaims nothing');
 // Refused by the total as well as by the recent subset, which no reclaimed input could ever admit.
 const recent=page.budget.tryReserve({category:'metadata',bytes:page.budget.stats.availableBytes+1,precision:'estimate',label:'recent entry'},{recent:true});
 assert.equal(recent.ok,false,'this page keeps no recent subset');assert.equal(stats(api).retention.holds,1,'retained inputs cannot make recent room');
 assert.equal(stats(api).retention.evictions,0);
 assert.equal((await deadline(session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0)))).name,'T');await settle();
 assert.equal(page.reads.length,1,'T2 consumed the kept input');assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true}));
 session.close();page.store.destroy();
});

test('an idle retained table is reclaimed under page pressure and read again by its later initializer',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 const free=readWorkingSet(U)-Math.floor(inputClaim(T)/2);
 const blocker=page.budget.reserve({category:'construction',bytes:page.budget.stats.limitBytes-page.budget.stats.bytes-free,precision:'estimate',label:'other producer'});
 const u=session.wait(api.readFrozenTableAsync(U.d.sha256,fileU,0));
 await until(()=>page.reads.length===2,'U is read once the idle retained table is reclaimed');
 const reclaimed=stats(api);assert.equal(reclaimed.retention.evictions,1);assert.equal(reclaimed.retention.holds,0);assert.equal(reclaimed.retainedTables,0);assert.equal(reclaimed.inputLedger.claims,1,'only U\'s own read claim is held now');
 page.deliver(U);assert.equal((await deadline(u)).name,'U');
 const second=session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0));
 await until(()=>page.reads.length===3,'T is read again for its later initializer');page.deliver(T);
 assert.equal((await deadline(second)).name,'T');await settle();
 const after=stats(api);assert.equal(after.inputLedger.admissions,3);assert.equal(after.retention.holds,0);assert.equal(after.failures,0);
 // T1 was charged before the blocker; U was parsed while its read and the blocker filled the page (refused).
 assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true,unheld:1})+blocker.bytes);blocker.release();assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true,unheld:1}));assert.equal(page.budget.stats.availabilityListeners,0);
 session.close();page.store.destroy();
});

test('retention never needs more than the read admitted: a page that fits exactly one read still completes a shared table',async()=>{
 const api=await fresh(),page=facadePage(api,{limitBytes:readWorkingSet(T)});
 const {session,value}=await firstOfT(api,page);assert.equal(value.name,'T');
 assert.equal(stats(api).retention.heldBytes,inputClaim(T));assert(inputClaim(T)<=page.budget.stats.limitBytes);
 assert.equal((await deadline(session.wait(api.readFrozenTableAsync(T.d.sha256,fileT2,0)))).name,'T');await settle();
 const after=stats(api);assert.equal(after.inputLedger.unfit,0);assert.equal(after.failures,0);
 // The page holds exactly one read, so neither parsed T value finds room for its page-lifetime estimate:
 // both charges are refused and counted, nothing is charged, and both initializers still complete.
 assert.equal(page.budget.stats.bytes,parsedBytes(api,{unheld:2}));assert.equal(parsedBytes(api,{unheld:2}),0);
 session.close();page.store.destroy();
});

test('closing a session returns the retained table charge; a later session reads it again for the parked initializer',async()=>{
 const api=await fresh(),page=facadePage(api),{session}=await firstOfT(api,page);
 assert.equal(page.budget.stats.bytes,parsedBytes(api)+inputClaim(T));
 session.close();
 assert.equal(stats(api).retention.holds,0);assert.equal(stats(api).retainedTables,0);assert.equal(page.budget.stats.bytes,parsedBytes(api),'the closed session returned its retained table');
 const parked=api.readFrozenTableAsync(T.d.sha256,fileT2,0);await settle();assert.equal(page.reads.length,1,'no session, no read');
 const next=api.beginFrozenPaintTableInitialization(page.ingress,signal(),['root500']);
 await until(()=>page.reads.length===2,'the next session reads T for the parked initializer');page.deliver(T);
 assert.equal((await deadline(next.wait(parked))).name,'T');await settle();assert.equal(page.budget.stats.bytes,parsedBytes(api,{parsed:true}));
 next.close();page.store.destroy();
});

test('a bare reader keeps the legacy path: no ledger charge, one read for a shared table',async()=>{
 const api=await fresh(),reads=[];
 const session=api.beginFrozenPaintTableInitialization(async(target,readSignal)=>{readSignal.throwIfAborted();reads.push(target);return copy(T.physical);},signal(),['root500']);
 const [one,two]=await deadline(session.wait(Promise.all([api.readFrozenTableAsync(T.d.sha256,fileT1,0),api.readFrozenTableAsync(T.d.sha256,fileT2,0)])));
 assert.equal(one.name,'T');assert.notEqual(one,two);assert.deepEqual(reads,[T.path]);
 const legacy=stats(api);assert.equal(legacy.inputLedger.admissions,0);assert.equal(legacy.retention.adoptions,0);assert.equal(legacy.retention.holds,0);assert.equal(legacy.retainedTables,0);
 session.close();
});

test('without a claim to adopt and without room, a retained input serves only the initializers holding it and nothing waits',async()=>{
 const {createFrozenInitializerStore,createResourceBudget}=await (await initializerRuntime())();
 const t=table('unheld',50,{gzip:false}),files=[file('unheld-a'),file('unheld-b')],budget=createResourceBudget({limitBytes:1024,recentLimitBytes:0});
 assert(3*t.d.bytes>budget.stats.limitBytes,'the retention charge cannot be admitted');
 const store=createFrozenInitializerStore([t.d]),reads=[];
 const session=store.begin(async target=>{reads.push(target);return copy(t.physical);},signal(),{tables:[t.d.sha256],initializers:{[t.d.sha256]:{[files[0]]:1,[files[1]]:1}}},undefined,{budget,adopt:()=>undefined});
 assert.equal((await deadline(session.wait(store.read(t.d.sha256,files[0])))).name,'unheld');
 assert.equal(store.stats.retention.refusals,1);assert.equal(store.stats.retainedTables,0,'not kept without a charge');assert.equal(reads.length,1);
 assert.equal((await deadline(session.wait(store.read(t.d.sha256,files[1])))).name,'unheld');
 assert.equal(reads.length,2,'the later initializer reads again');assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
 assert.throws(()=>store.begin(async()=>t.physical,signal(),{tables:[],initializers:{}},undefined,{budget}),TypeError,'a ledger needs its input adopter');
 session.close();
});
