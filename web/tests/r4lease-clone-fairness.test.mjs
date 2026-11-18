import test from 'node:test';
import assert from 'node:assert/strict';
import {leaseRuntime,leasePage,leaseMap,table,leasePhases,settle,until,deadline,CLONE_HOLD_EXPANSION} from './support/core-frozen-fixtures.mjs';

// Stage 3 round 4 (S1-lease; DECISIONS 2026-11-02 22:19, R3 src-r3a CDR[1]).
// Two (or three) tables of one map on one page, every pending network read
// delivered as soon as it appears. Before round 4 the clone phase could
// re-read without end: one table's clone was refused while the other read,
// its decoded value was let go, and the two alternated. Now the decoded value
// settles beside the clone hold and the first clone's room (S = 10d + 2E), the
// first clone takes that room without growing the ledger, a refused settle is
// re-admitted with its read (headroom), and a waiter blocked only by younger
// waiters' queued estimates is served first while they step back (FIFO). So
// every table reads at most twice and each acquisition completes, or is
// reported as not fitting the page when it cannot fit even alone. The real
// lease store, byte transport, page store and ledger; tiny synthetic tables.
const api=await leaseRuntime();
const MAX_READS_PER_TABLE=2;
// A native crypto digest can still be running after hundreds of setImmediate
// turns on a busy worker. Treat elapsed time without progress as the bound.
const STALLED_MS=4000;
const waitForWork=idle=>idle<32?settle():new Promise(resolve=>setTimeout(resolve,1));

/** Acquires every table at once on a page of limitBytes and delivers reads as
 * they start. Returns per-table outcomes and read counts; drains the page. */
async function race(tables,limitBytes,{abort,deliver=(row,bytes)=>row.resolve(bytes)}={}){
 const resources=leasePage(api,{limitBytes}),{budget}=resources,m=leaseMap(api,resources,'M',tables);
 const controllers=tables.map(()=>new AbortController()),out={};
 tables.forEach((f,i)=>m.client.acquire(m.ref(f),controllers[i].signal).then(lease=>{out[i]='ok';lease.release();},error=>{out[i]=error?.name;}));
 let idle=0,aborted=false,progressAt=performance.now();
 while(Object.keys(out).length<tables.length&&m.network.length<=tables.length*MAX_READS_PER_TABLE+4&&performance.now()-progressAt<STALLED_MS){
  if(abort&&!aborted&&abort.when(m)){aborted=true;controllers[abort.index].abort();}
  const row=m.network.find(r=>!r.done&&!r.signal.aborted);
  if(row){row.done=true;const f=tables.find(f=>f.path===row.target);deliver(row,new Uint8Array(f.physical));idle=0;progressAt=performance.now();}else idle++;
  await waitForWork(idle);
 }
 const reads=tables.map(f=>m.network.filter(r=>r.target===f.path).length);
 const result={limitBytes,out:tables.map((_,i)=>out[i]??'pending'),reads,total:m.network.length,stats:{...m.leases.stats},aborted};
 m.destroy();for(let i=0;i<8;i++)await settle();
 result.drained=budget.stats.bytes===0&&budget.stats.availabilityListeners===0;
 return result;
}
const names=(prefix,n)=>Array.from({length:n},(_,i)=>table(prefix+'-'+i,240));
/** The least page one acquisition completes on (each table has the same shape). */
const wholeOf=tables=>Math.max(...tables.map(f=>leasePhases(f).whole));
function limits(whole,n){
 const set=new Set();
 for(let L=whole-8*1024;L<=n*whole+4096;L+=4096)set.add(L);
 // The exact page, the queued-estimate window above it and the window where
 // the settle beside another read was refused (R3 livelock range included).
 for(let L=whole-256;L<=whole+768*n+512;L+=64)set.add(L);
 for(let L=Math.floor(1.75*whole);L<=Math.ceil(1.95*whole);L+=1024)set.add(L);
 return [...set].sort((a,b)=>a-b);
}
function check(row,whole){
  const tag=JSON.stringify({L:row.limitBytes,out:row.out,reads:row.reads});
  assert(row.reads.every(n=>n<=MAX_READS_PER_TABLE),'every table reads at most twice: '+tag);
  if(row.limitBytes<whole)assert(row.out.every(o=>o==='ResourceBudgetExceededError'),'below one acquisition every table is reported as not fitting: '+tag);
  else assert(row.out.every(o=>o==='ok'),'at or above one acquisition every table completes: '+tag);
  assert(row.drained,'the page drains: '+tag);
}

test('two tables: every page from below one acquisition to two reads at most twice per table and completes (the R3 livelock window included)',async()=>{
 const tables=names('r4-two',2),whole=wholeOf(tables);
 assert.equal(leasePhases(tables[0]).whole,leasePhases(tables[0]).settle,'precondition: the settle beside the clone room is the largest phase');
 for(const L of limits(whole,2))check(await race(tables,L),whole);
 // The round-3 reproduction limit (two-waiters.mjs): one read each now.
 const r3=await race(tables,630000);
 assert.deepEqual([r3.out,r3.reads],[['ok','ok'],[1,1]]);
});

test('three tables: every page reads at most twice per table and completes or is reported as not fitting',async()=>{
 const tables=names('r4-three',3),whole=wholeOf(tables);
 for(const L of limits(whole,3).filter((L,i)=>L<=whole+768*3+512||i%2===0))check(await race(tables,L),whole);
});

test('a delayed delivery on the exact page still reaches the real clone and drains the ledger',async()=>{
 const tables=names('r4-delayed',2),whole=wholeOf(tables);
 const row=await race(tables,whole,{deliver:(read,bytes)=>setTimeout(()=>read.resolve(bytes),30)});
 assert.deepEqual(row.out,['ok','ok']);assert(row.reads.every(n=>n<=MAX_READS_PER_TABLE));assert(row.drained);
});

test('exact page: one acquisition fits only after the waiting tables step back; each completes with bounded reads',async()=>{
 for(const n of [2,3]){
  const tables=names('r4-exact-'+n,n),whole=wholeOf(tables);
  const row=await race(tables,whole);
  assert.deepEqual(row.out,tables.map(()=>'ok'),'all complete on the exact page: '+JSON.stringify(row));
  assert(row.reads.every(r=>r<=MAX_READS_PER_TABLE),JSON.stringify(row.reads));
  assert(row.stats.waiterYields>0,'the younger waiters stepped back for the older one (no silent wait on queued estimates)');
  assert(row.drained);
  // One byte below: reported, not awaited.
  const below=await race(tables,whole-1);
  assert.deepEqual(below.out,tables.map(()=>'ResourceBudgetExceededError'));assert(below.reads.every(r=>r===1));assert(below.drained);
 }
});

test('aborts: a table aborted while waiting (settle refused, or stepped back) leaves; the others complete with bounded reads and the page drains',async()=>{
 const two=names('r4-abort-two',2),whole2=wholeOf(two);
 // A page where the second settle is refused beside the other read (each table reads twice at most).
 const window=[];for(let L=Math.floor(1.75*whole2);L<=Math.ceil(1.95*whole2);L+=1024)window.push(L);
 let refusedSettle;
 for(const L of window){const row=await race(two,L);if(row.reads.some(r=>r===2)){refusedSettle=L;break;}}
 assert(refusedSettle,'precondition: a page where a settle is refused and re-read');
 for(const index of [0,1]){
  const row=await race(two,refusedSettle,{abort:{index,when:m=>m.leases.stats.capacityWaits>0}});
  assert(row.aborted);
  assert.equal(row.out[index],'AbortError','the aborted table rejects with its abort');
  assert.equal(row.out[1-index],'ok','the other table completes: '+JSON.stringify(row));
  assert(row.reads.every(r=>r<=MAX_READS_PER_TABLE));assert(row.drained);
 }
 // Exact page, three tables: abort a table that stepped back for an older one.
 const three=names('r4-abort-three',3),whole3=wholeOf(three);
 for(const index of [1,2]){
  const row=await race(three,whole3,{abort:{index,when:m=>m.leases.stats.waiterYields>0}});
  assert(row.aborted);
  assert.equal(row.out[index],'AbortError',JSON.stringify(row));
  assert.deepEqual(row.out.filter((_,i)=>i!==index),['ok','ok'],'the others complete: '+JSON.stringify(row));
  assert(row.reads.every(r=>r<=MAX_READS_PER_TABLE));assert(row.drained);
 }
});

test('a stepped-back acquisition holds nothing while the served one reads again, and binds again only after it ended',async()=>{
 const tables=names('r4-turn',2),whole=wholeOf(tables);
 const resources=leasePage(api,{limitBytes:whole}),{budget}=resources,m=leaseMap(api,resources,'M',tables);
 const events=[],done={};
 tables.forEach((f,i)=>m.client.acquire(m.ref(f),new AbortController().signal).then(lease=>{events.push('ok'+i);done[i]=true;lease.release();},error=>{done[i]=error?.name;}));
 let yieldAt=-1,checked=false,idle=0,progressAt=performance.now();
 while(Object.keys(done).length<2&&m.network.length<=6&&performance.now()-progressAt<STALLED_MS){
  if(yieldAt<0&&m.leases.stats.waiterYields>0)yieldAt=events.length;
  const row=m.network.find(r=>!r.done&&!r.signal.aborted);
  if(row){
   const i=tables.findIndex(f=>f.path===row.target);
   if(yieldAt>=0&&!checked&&events.filter(e=>e==='read'+i).length===1){
    // The served table's re-read: admitted with its settle on the exact page,
    // so the stepped-back table holds nothing at all.
    checked=true;assert.equal(budget.stats.bytes,whole,'the served re-read fills the exact page: the stepped-back acquisition holds no byte');
   }
   events.push('read'+i);row.done=true;row.resolve(new Uint8Array(tables[i].physical));idle=0;progressAt=performance.now();
  }else idle++;
  await waitForWork(idle);
 }
 assert.deepEqual(done,{0:true,1:true},JSON.stringify(events));
 assert(yieldAt>=0,'a waiter stepped back');assert(checked,'the served table read again after the step-back: '+JSON.stringify(events));
 // After the step-back the other table reads only once the served one completed.
 const after=events.slice(yieldAt),served=Number(after.find(e=>e.startsWith('read')).slice(4)),other=1-served;
 const servedOk=after.indexOf('ok'+served),otherRead=after.indexOf('read'+other);
 assert(otherRead<0||otherRead>servedOk,'the stepped-back table binds and reads again only after the served one ended: '+JSON.stringify(events));
 assert(tables.every((f,i)=>events.filter(e=>e==='read'+i).length<=MAX_READS_PER_TABLE));
 m.destroy();for(let i=0;i<8;i++)await settle();
 assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});

// R4 review (R4S1-1/R4S1-2/R4S1-3): several maps binding the same tables share
// one decoded production per table. k bindings need 256 k beside its read or
// settle while the admission's own checks count one, so on a page within those
// estimates of the need one production alone, or a second production of a table
// whose clone was refused, waited with nothing left to wake it. The bindings
// beyond the first holder now step back for it. Seeded delivery order (a
// deterministic linear congruential sequence, not a timer), leases released
// at once or a few turns after they complete.
/** Every map acquires every table at once on a page of limitBytes. Bounded by
 * reads and idle turns. Returns per-acquisition outcomes and per-table reads. */
async function raceMaps(mapCount,tables,limitBytes,{seed=1,holdTurns=0}={}){
 const resources=leasePage(api,{limitBytes}),{budget}=resources,cities=['bremen','essen','berlin'];
 const maps=Array.from({length:mapCount},(_,i)=>leaseMap(api,resources,'M'+i,tables,{city:cities[i]}));
 let state=seed;const next=()=>{state=(state*1103515245+12345)%2147483648;return state/2147483648;};
 const out={},held=[],n=mapCount*tables.length;
 maps.forEach((m,mi)=>tables.forEach((f,ti)=>m.client.acquire(m.ref(f),new AbortController().signal).then(lease=>{out[mi+':'+ti]='ok';held.push({lease,turns:holdTurns});},error=>{out[mi+':'+ti]=error?.name;})));
 const network=()=>maps.flatMap(m=>m.network);
 let idle=0,progressAt=performance.now();
 while(Object.keys(out).length<n&&network().length<=tables.length*(mapCount+1)+4&&performance.now()-progressAt<STALLED_MS){
  for(const row of held)if(row.lease&&--row.turns<0){row.lease.release();row.lease=undefined;}
  const pending=network().filter(r=>!r.done&&!r.signal.aborted);
  if(pending.length&&next()<0.7){const row=pending[Math.floor(next()*pending.length)];row.done=true;row.resolve(new Uint8Array(tables.find(f=>f.path===row.target).physical));idle=0;progressAt=performance.now();}else idle++;
  await waitForWork(idle);
 }
 for(const row of held)if(row.lease){row.lease.release();row.lease=undefined;}
 const reads=tables.map(f=>network().filter(r=>r.target===f.path).length);
 const result={limitBytes,seed,holdTurns,out:maps.flatMap((_,mi)=>tables.map((_,ti)=>out[mi+':'+ti]??'pending')),reads,
  stuckBytes:budget.stats.bytes,listeners:budget.stats.availabilityListeners,yields:maps.reduce((s,m)=>s+m.leases.stats.waiterYields,0),cloneHoldMisses:maps.map(m=>m.leases.stats.cloneHoldMisses)};
 for(const m of maps)m.destroy();for(let i=0;i<8;i++)await settle();
 result.drained=budget.stats.bytes===0&&budget.stats.availabilityListeners===0;
 return result;
}
function checkMaps(row,whole,mapCount){
  const tag=JSON.stringify(row);
  assert(!row.out.includes('pending'),'no acquisition is left waiting: '+tag);
  if(row.limitBytes<whole)assert(row.out.every(o=>o==='ResourceBudgetExceededError'),'below one acquisition every one is reported as not fitting: '+tag);
  else assert(row.out.every(o=>o==='ok'),'at or above one acquisition every one completes: '+tag);
  assert(row.reads.every(r=>r<=mapCount+1),'every table reads at most once per map and once more: '+tag);
  assert(row.cloneHoldMisses.every(n=>n===0),'every clone ran beside its held claim: '+tag);
  assert(row.drained,'the page drains: '+tag);
}
/** Pages from below one acquisition through the k-binding estimate window and the
 * capped-headroom window above it (whole .. whole + P + 256 k, step 64), then coarser. */
function mapLimits(phases,mapCount,tableCount){
 const {whole,P,E}=phases,set=new Set();
 for(let L=whole-256;L<=whole+P+256*mapCount*tableCount+512;L+=64)set.add(L);
 for(let L=whole;L<=Math.max(tableCount,2)*whole+4*E;L+=1537)set.add(L);
 return [...set].sort((a,b)=>a-b);
}

test('several maps, one table: every page completes or is reported as not fitting, with at most maps + 1 reads (R4S1-1, R4S1-2)',async()=>{
 const [f]=names('r4-maps',1),phases=leasePhases(f);
 for(const mapCount of [2,3]){
  for(const L of mapLimits(phases,mapCount,1))for(const holdTurns of [0,3])checkMaps(await raceMaps(mapCount,[f],L,{seed:L*7+holdTurns,holdTurns}),phases.whole,mapCount);
 }
 // The review's reproductions: two maps on the exact page (one production,
 // its own sibling binding the only blocker), three maps 5000 B above it (a
 // second production after refused clones, its capped read beside two bindings).
 const exact=await raceMaps(2,[f],phases.whole);
 assert.deepEqual(exact.out,['ok','ok'],JSON.stringify(exact));assert(exact.yields>0,'the sibling binding stepped back: '+JSON.stringify(exact));
 const capped=await raceMaps(3,[f],phases.whole+5000,{seed:5});
 assert.deepEqual(capped.out,['ok','ok','ok'],JSON.stringify(capped));assert(capped.yields>0,JSON.stringify(capped));
 assert(capped.reads[0]<=4,JSON.stringify(capped));
});

test('several maps, several tables: every page completes or is reported as not fitting, with at most maps + 1 reads per table (R4S1-3)',async()=>{
 const tables=names('r4-maps-tables',2),whole=wholeOf(tables),phases=leasePhases(tables[0]);
 for(const mapCount of [2,3]){
  for(const L of mapLimits({...phases,whole},mapCount,2).filter((L,i)=>L<=whole+phases.P+2048||i%2===0))checkMaps(await raceMaps(mapCount,tables,L,{seed:L*13+mapCount,holdTurns:L%2?3:0}),whole,mapCount);
 }
});

test('a later map whose private clone waits beside another map\'s live clone waits for that holder, not silently, and completes once it is released (R4S1-4)',async()=>{
 const [f]=names('r4-live-clone',1),phases=leasePhases(f);
 // One clone beside the shared value fits; a second private clone beside a live first one does not.
 const L=phases.whole+1024;assert(2*phases.E+phases.E+CLONE_HOLD_EXPANSION*phases.d>L,'precondition: 3E + 10d does not fit');
 const resources=leasePage(api,{limitBytes:L}),{budget}=resources,a=leaseMap(api,resources,'A',[f],{city:'bremen'}),b=leaseMap(api,resources,'B',[f],{city:'essen'});
 const first=await (async()=>{const p=a.client.acquire(a.ref(f),new AbortController().signal);await until(()=>a.pending().length===1);a.deliver(f);return p;})();
 let second='pending';const p=b.client.acquire(b.ref(f),new AbortController().signal).then(lease=>{second='ok';return lease;},error=>{second=error?.name;});
 // B reads (A's decoded value is gone), settles, and its clone beside A's live clone is refused: it waits on the ledger.
 async function deliverUntil(ready,label){
  await until(()=>{
   if(ready())return true;
   if(b.pending().length)b.deliver(f);
   return false;
  },label);
 }
 await deliverUntil(()=>second!=='pending'||(b.pending().length===0&&b.leases.stats.capacityWaits>0),'B reaches the clone wait while A holds its lease');
 assert.equal(second,'pending','B waits while A holds its private clone');
 assert(budget.stats.availabilityListeners>0,'B waits subscribed to the ledger (A releasing wakes it), not silently');
 assert.equal(b.leases.stats.unfit,0,'B fits the page alone: it is not reported as not fitting');
 first.release();
 await deliverUntil(()=>second!=='pending','B settles after A releases its lease');
 assert.equal(second,'ok','B completes once A released its clone');
 (await p).release();a.destroy();b.destroy();for(let i=0;i<8;i++)await settle();
 assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
});
