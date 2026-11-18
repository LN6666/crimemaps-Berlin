// managers-3: the shared native source pool's cohort registry and parked-demand
// accounting on a real page ledger and chunk store, the shared transient-read
// rule (a contract check of the page transport, ledger or store, by its stable
// code RESOURCE_CONTRACT_VIOLATION or by its message, is never read again),
// retryManagerAdmission accepting a cohort's whole-batch return, and the
// managers' source text for the same rule. No product data, browser or GPU.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {shard,network,until,outcome,tick} from './support/managers3-fixtures.mjs';

const web=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const MiB=1024**2;
function poolPage({limitBytes=64*MiB,read}={}){
 const runtime=createRuntimeLoader(web),page=runtime.createPageResources({limitBytes});
 const native=runtime.load(path.join(web,'src/safety/shared-native-source.ts'));
 const net=network(),pool=native.createSharedNativeSourcePool({read:read??net.read,resourceStore:page.store});
 return{runtime,page,budget:page.budget,native,net,pool,client:pool.client('berlin'),ResourceBudgetExceededError:runtime.resourceBudget.ResourceBudgetExceededError};
}
const settle=async(turns=30)=>{for(let i=0;i<turns;i++)await tick();};

test('a cohort holding ready bytes while its own source is parked returns its batch, waits holding nothing as parked demand, and ends on room',async()=>{
 const {budget,net,pool,client}=poolPage(),b=shard('b');
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-MiB,precision:'estimate',label:'holder'});
 const parks=[];const demand={park(parked){const row={parked,open:true};parks.push(row);return()=>{row.open=false;};}};
 const cohort=client.cohort(demand),request=new AbortController();
 let held=4096;const attempt=cohort.attempt({held:()=>held,pending:()=>[{asset:b.leaf}]},request.signal);
 const acquiring=client.acquire(b.leaf,new AbortController().signal,200000);void acquiring.catch(()=>{});
 await until(()=>pool.stats.parkedSources===1,'the source parks for capacity');
 const need=client.parkedNeed(b.leaf);assert.ok(need>MiB,'parkedNeed is the refused working set');
 await settle();assert.equal(attempt.yielded,true,'the park checked the cohort once');assert.equal(attempt.signal.aborted,true);
 const reason=attempt.signal.reason;assert.equal(reason.code,'MANAGER_ADMISSION_RETRY');// Returned at the refusal itself (the pressure path: the refused increment over
 // the source's 512 B queued estimate) or at its park (the whole parked need).
 assert.ok(reason.requiredBytes>=held+need-512&&reason.requiredBytes<=held+need,'it waits for its ready bytes plus what its own source lacks: '+reason.requiredBytes);assert.equal(reason.reclaimed,false);
 assert.equal(cohort.retry(new Error('other'),request.signal),undefined,'only its own yield is waited for');
 const waiting=cohort.retry(reason,request.signal);assert.ok(waiting instanceof Promise);
 assert.equal(cohort.waiting,true);assert.equal(parks.filter(row=>row.open).length,1,'the wait is registered as parked demand');assert.equal(parks[0].parked(),true);
 assert.equal(await outcome(waiting),'pending','no room: it waits (no timer, no polling)');
 blocker.release();await waiting;
 assert.equal(cohort.waiting,false);assert.equal(parks[0].open,false,'the parked registration ends with the wait');
 assert.equal(pool.stats.cohortYields,1);assert.equal(pool.stats.cohortWaits,1);
 // The parked source itself resumes on the same room.
 await until(()=>net.pending(b.leaf.path).length===1,'the source reads');net.deliver(b.leaf.path,b.bytes);(await acquiring).release();
 assert.equal(pool.stats.parkedSources,0);held=0;attempt.close();assert.equal(pool.stats.cohorts,0);
 client.destroy();pool.destroy();
});

test('a batch that cannot fit beside its parked need even on an empty page fails as not fitting, with nothing to wait for',async()=>{
 const {budget,pool,client,ResourceBudgetExceededError}=poolPage(),b=shard('b');
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes-MiB,precision:'estimate',label:'holder'});
 const cohort=client.cohort(),request=new AbortController();
 const attempt=cohort.attempt({held:()=>budget.stats.limitBytes,pending:()=>[{asset:b.leaf}]},request.signal);
 const control=new AbortController(),acquiring=client.acquire(b.leaf,control.signal,200000);void acquiring.catch(()=>{});
 await until(()=>attempt.signal.aborted,'the cohort fails');
 assert.ok(attempt.signal.reason instanceof ResourceBudgetExceededError,'the ledger\'s own not-fitting error');assert.equal(attempt.yielded,false);
 assert.equal(cohort.retry(attempt.signal.reason,request.signal),undefined,'not fitting is never waited for');assert.equal(pool.stats.cohortUnfit,1);
 control.abort();assert.equal(await outcome(acquiring),'rejected:AbortError');await settle();
 assert.equal(pool.stats.parkedSources,0);assert.equal(pool.stats.cohorts,0);assert.equal(budget.stats.bytes,blocker.bytes);
 blocker.release();client.destroy();pool.destroy();
});

test('an aborted request ends its cohort attempt and its wait without a leftover registration',async()=>{
 const {budget,client,pool}=poolPage(),listeners=budget.stats.availabilityListeners;
 const cohort=client.cohort(),request=new AbortController(),attempt=cohort.attempt({held:()=>0,pending:()=>[]},request.signal);
 assert.equal(pool.stats.cohorts,1);request.abort();assert.equal(attempt.signal.aborted,true);assert.equal(attempt.yielded,false);attempt.close();assert.equal(pool.stats.cohorts,0);
 const other=new AbortController(),yielding=cohort.attempt({held:()=>8,pending:()=>[{label:'managers3 source still read'}]},other.signal);
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate',label:'holder'});
 const foreign=budget.tryReserve({category:'construction',bytes:4,precision:'estimate',label:'other admission'});
 // Closing the pressure registration itself can satisfy this tiny admission.
 const remainder=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate'});
 assert.equal(yielding.yielded,true,'a covered foreign refusal reclaims the ready batch');assert.equal(yielding.signal.reason.reclaimed,true);assert.equal(pool.stats.cohortReclaims,1);
 const waiting=cohort.retry(yielding.signal.reason,other.signal);assert.equal(budget.stats.availabilityListeners,listeners+1);
 other.abort();assert.equal(await outcome(waiting),'rejected:AbortError');assert.equal(cohort.waiting,false);assert.equal(budget.stats.availabilityListeners,listeners,'no availability registration is left behind');
 remainder.release();if(foreign.ok)foreign.reservation.release();blocker.release();client.destroy();pool.destroy();
});

test('the pool reads a transient TypeError once more, but never a contract check of the transport, ledger or store',async()=>{
 const contract=[Object.assign(new TypeError('anything at all'),{code:'RESOURCE_CONTRACT_VIOLATION'}),new TypeError('This read envelope already covers another read; mint one per read'),new TypeError('Resource reservation label must be a string')];
 for(const failure of [new TypeError('Failed to fetch'),...contract]){
  const b=shard('t'),calls=[];
  const {pool,client}=poolPage({read:async(target,signal,max)=>{calls.push(target);if(calls.length===1)throw failure;return b.bytes.slice();}});
  const result=client.acquire(b.leaf,new AbortController().signal,200000);
  if(failure.message==='Failed to fetch'){const lease=await result;assert.equal(calls.length,2,'a network failure is read once more');lease.release();}
  else{await assert.rejects(result,error=>String(error.message).includes(failure.message));assert.equal(calls.length,1,'contract failure read once: '+failure.message);}
  assert.equal(pool.stats.transportAttempts,calls.length);client.destroy();pool.destroy();
 }
});

test('retryManagerAdmission waits out a cohort\'s whole-batch return by its shape, and rethrows anything else',async()=>{
 const {runtime,budget,native}=poolPage();
 const admission=runtime.load(path.join(web,'src/safety/manager-ensure-admission.ts'));
 const yieldOf=bytes=>new native.NativeSourceCohortYield(bytes,'test cohort',false);
 assert.equal(admission.isManagerAdmissionRetry(yieldOf(8)),true);assert.equal(admission.isManagerAdmissionRetry(new admission.ManagerAdmissionRetry(8,'x')),true);
 assert.equal(admission.isManagerAdmissionRetry({code:'MANAGER_ADMISSION_RETRY',requiredBytes:-1}),false);assert.equal(admission.isManagerAdmissionRetry({code:'OTHER',requiredBytes:8}),false);
 const blocker=budget.reserve({category:'construction',bytes:budget.stats.availableBytes,precision:'estimate',label:'holder'});
 let runs=0;const running=admission.retryManagerAdmission(budget,new AbortController().signal,async()=>{runs++;if(runs===1)throw yieldOf(MiB);return 'done';});
 assert.equal(await outcome(running),'pending');assert.equal(runs,1);
 blocker.release();assert.equal(await running,'done');assert.equal(runs,2);
 await assert.rejects(admission.retryManagerAdmission(budget,new AbortController().signal,async()=>{throw {code:'MANAGER_ADMISSION_RETRY',requiredBytes:'many'};}),error=>error.requiredBytes==='many');
});

const families=['root500','infill','bremen','city','tier300','church','delegated500'];
const managerText=family=>fs.readFileSync(path.join(web,'src/painted',family,'safety/three-dimensional-map.ts'),'utf8');
test('the seven managers exclude contract errors by code beside the scanned message test, at all three transient-read sites',()=>{
 for(const family of families){
  const text=managerText(family),sites=[...text.matchAll(/error\.name==='TypeError'&&!(\/.+?\/i)\.test\(error\.message\)(&&\(error as \{code\?:unknown\}\)\.code!=='RESOURCE_CONTRACT_VIOLATION')?/g)];
  assert.equal(sites.length,3,family);assert.ok(sites.every(match=>match[2]),family+' every site also excludes the stable contract code');
 }
 const pool=fs.readFileSync(path.join(web,'src/safety/shared-native-source.ts'),'utf8');
 assert.match(pool,/const transientTransportError=\(error:unknown\)=>\(error as \{name\?:unknown\}\|null\)\?\.name==='TypeError'&&!contractViolation\(error\);/);
 assert.match(pool,/value\?\.code==='RESOURCE_CONTRACT_VIOLATION'\|\|/);
});

test('all seven managers (root500, infill, bremen, city, tier300, church, delegated500) expose detailDemandHeld; the lineage-A cohorts retry outside the gate; managers never prepare owner modules themselves',()=>{
 for(const family of families){
  const text=managerText(family);
  assert.ok(text.includes('get detailDemandHeld(){return detailDemand.held();}'),family+' exposes detailDemandHeld (city through its lazy adapter)');
  assert.match(text,/const detailDemand=\{probes:new Set<\(\)=>boolean>\(\),reported:false,/,family);
  assert.match(text,/if\(!detailDemand\.watch\)detailDemand\.watch=(?:options\.nativeSources|sourceClient)\?\.onUnparked\?\.\(\(\)=>\{if\(detailDemand\.reported&&!detailDemand\.held\(\)\)detailDemand\.clear\(\);\}\);/,family+' (managers-3-fix R2: a pool wake-up repaints once)');
  if(['root500','infill','bremen'].includes(family)){
   assert.match(text,/const cohort=options\.nativeSources\?\.cohort\?\.\(detailDemand\),run=/,family);
   assert.match(text,/for\(;;\)\{try\{return await \(options\.runVisiblePreparation\?options\.runVisiblePreparation\(signal,run\):run\(\)\);\}catch\(error\)\{const room=cohort\?\.retry\(error,signal\);if\(!room\)throw error;await room;current\(signal,ticket\);\}\}/,family+' waits outside the gate');
   assert.match(text,/if\(cohortRead\?\.yielded&&!readsDone&&!destroyed\)\{wantedSources\.reconcile\(\[\]\);void wantedSources\.keys;\}/,family+' returns every source role of a batch it did not finish reading');
   assert.match(text,/const readers=runAbortableReaders\(readSignal,/,family+' joins the abortable source readers before publishing');
   assert.match(text,/try\{await readers;readsDone=true;unparkRead\?\.\(\);cohortRead\?\.close\(\);/,family+' (managers-3-fix R3: a read that finished publishes its wanted set)');
   assert.match(text,/detailBindings\.has\(leaf\)\?\[\{label:chosenKeys\.get\(leaf\)!\}\]/,family+' (managers-3-fix R4: detail sources are pending by label)');
  }
  assert.ok(!/prepare(?:Infill)?OwnerReconstructionModules/.test(text),family+': owner module preparation belongs to the renderers (DECISIONS 07:49)');
 }
});
