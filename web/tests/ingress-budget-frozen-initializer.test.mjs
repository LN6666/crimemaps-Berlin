import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The real public facade, initializer store, byte transport, page store and
// ledger in one bundle. Only the null-profile development inputs (manifest,
// dependencies, deployment and virtual profile) are injected as tiny fixtures.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function table(value){
  const raw=new TextEncoder().encode(JSON.stringify(value)),sha256=hash(raw),physical=new Uint8Array(gzipSync(raw)),t=hash(physical);
  return{raw,physical,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,
    transport:{path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'}}};
}
const first=table({rows:Array.from({length:120},(_,i)=>({i,v:'first-'+i}))}),second=table({rows:Array.from({length:80},(_,i)=>({i,v:'second-'+i}))});
const firstFile='painted/root500/safety/ingress-first.ts',secondFile='painted/root500/safety/ingress-second.ts';
const manifest=[first.d,second.d],dependencies={schema_version:1,providers:{root500:[first.d.sha256,second.d.sha256]},initializers:{root500:{[first.d.sha256]:{[firstFile]:1},[second.d.sha256]:{[secondFile]:1}}}};
const contents=await readFile(path.join(source,'frozen-paint-tables.ts'),'utf8')+[
  "\nexport {createResourceByteTransport} from './resource-byte-transport';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",
].join('\n');
const built=await build({stdin:{contents,resolveDir:source,sourcefile:'frozen-paint-tables.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins:[{name:'tiny-initializer-inputs',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'ingress-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'ingress-fixture'},args=>({loader:'js',contents:args.path==='virtual:crimemaps-city-data'?'export const profileSHA256=null;export default null;':args.path==='./deployment'?"export const repositoryCity='bremen';":'export default '+JSON.stringify(args.path.includes('manifest')?manifest:dependencies)+';'}));
}}]});
const text=built.outputFiles[0].text;
let instance=0;
// Initializer completion is one-shot per module instance; each scenario gets
// its own fresh facade, exactly like a fresh page.
const fresh=()=>import('data:text/javascript;base64,'+Buffer.from(text+'\n// instance '+(++instance)).toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,label){for(let i=0;i<60;i++){if(predicate())return;await settle();}assert.fail(label);}
function harness(api,{limitBytes=64*1024*1024,recentLimitBytes=1024*1024}={}){
  const budget=api.createResourceBudget({limitBytes,recentLimitBytes}),store=api.createChunkResourceStore({budget}),reads=[];
  const transport=api.createResourceByteTransport({namespace:'ingress-initializer',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});})});
  return{budget,store,transport,reads,ingress:{acquireBytes:transport.acquireBytes,budget}};
}
const body=f=>{const bytes=new Uint8Array(f.physical.length);bytes.set(f.physical);return bytes;};
const claimBytes=f=>3*f.d.bytes;
// The input claim and the byte transport's read envelope are admitted as one working set.
const workingSet=f=>claimBytes(f)+2*f.d.transport.bytes;

test('table inputs are admitted before the read, keep the response leased until the first initializer constructs, then exit',async()=>{
  const api=await fresh(),{budget,store,transport,reads,ingress}=harness(api);
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,firstFile,0));
  await until(()=>reads.length===1,'the table read is issued');
  assert.equal(reads[0].path,first.d.transport.path);assert.equal(reads[0].max,first.d.transport.bytes);
  const ledger=api.frozenPaintTableStats().inputLedger;
  assert.equal(ledger.claims,1);assert.equal(ledger.claimedBytes,claimBytes(first),'exact verified input copy plus one two-byte working copy bound');
  assert.equal(budget.stats.categories.inflate.exactBytes,first.d.bytes,'the inflated table is charged before it exists');
  assert.deepEqual({...budget.stats.categories.read},{bytes:2*first.d.transport.bytes,exactBytes:0,estimatedBytes:2*first.d.transport.bytes},'the transport envelope, once');
  assert.equal(budget.stats.bytes,claimBytes(first)+2*first.d.transport.bytes);
  assert.deepEqual(ledger.pending.map(row=>[row.sha256,row.phase,row.requiredBytes]),[[first.d.sha256,'frozen-table-transport',2*first.d.transport.bytes]],'the handed-off read is observable with the transport envelope it holds');
  reads[0].resolve(body(first));
  const value=await pending;
  assert.equal(value.rows.length,120);assert.equal(value.rows[7].v,'first-7');
  await settle();
  const after=api.frozenPaintTableStats().inputLedger;
  assert.equal(after.claims,0);assert.equal(after.leasedResponses,0);assert.equal(after.exits,1);assert.equal(after.admissions,1);assert.deepEqual(after.pending,[]);assert.equal(after.handoffRefusals,0);
  assert.equal(transport.stats.consumers,0,'the transport response was held, then returned');
  // IA-R2: the parsed module value stays on the page ledger as a page-lifetime 'metadata' estimate.
  const parsedRetention=api.frozenPaintTableStats().retainedParsedEstimateBytes;assert(parsedRetention>0,'the parsed table value is charged as page-lifetime metadata');
  store.evictRecent();assert.equal(budget.stats.bytes,parsedRetention,'nothing but the parsed-value estimate remains charged after the table exits');
  session.close();store.destroy();
});

test('a table input that does not fit now waits on the ledger without a timer and starts when capacity returns',async()=>{
  const api=await fresh(),limit=claimBytes(first)+2*first.d.transport.bytes+4096;
  const {budget,store,reads,ingress}=harness(api,{limitBytes:limit,recentLimitBytes:first.d.transport.bytes});
  const blocker=budget.reserve({category:'construction',bytes:limit-claimBytes(first)+1,precision:'estimate',label:'other producer'});
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,firstFile,0));
  await settle();await settle();
  assert.equal(reads.length,0,'the read is not issued while its working set does not fit');
  const waiting=api.frozenPaintTableStats().inputLedger;
  assert.equal(waiting.waits,1);assert.equal(waiting.claims,0);assert.equal(waiting.pending.length,1);
  assert.equal(waiting.pending[0].sha256,first.d.sha256);assert.equal(waiting.pending[0].phase,'frozen-table-input');assert.equal(waiting.pending[0].requiredBytes,workingSet(first),'the whole working set waits: input claim plus transport envelope');
  assert.equal(budget.stats.bytes,limit-claimBytes(first)+1,'nothing but the other producer is held while the input waits');
  assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');
  blocker.release();
  await until(()=>reads.length===1,'released capacity starts the waiting read');
  reads[0].resolve(body(first));
  assert.equal((await pending).rows.length,120);await settle();
  assert.deepEqual(api.frozenPaintTableStats().inputLedger.pending,[]);assert.equal(budget.stats.availabilityListeners,0);
  store.evictRecent();assert.equal(budget.stats.bytes,0);session.close();store.destroy();
});

test('a table input larger than the whole page ledger is reported as not fitting instead of queueing',async()=>{
  const api=await fresh(),{budget,store,reads,ingress}=harness(api,{limitBytes:claimBytes(first)-1,recentLimitBytes:0});
  const failures=[];
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500'],error=>failures.push(error));
  await assert.rejects(session.wait(api.readFrozenTableAsync(first.d.sha256,firstFile,0)),error=>error instanceof api.ResourceBudgetExceededError&&error.required>=claimBytes(first)&&error.capacity===claimBytes(first)-1);
  assert.equal(failures.length,1,'the owner receives the explicit refusal');
  assert.equal(reads.length,0);assert.equal(api.frozenPaintTableStats().inputLedger.unfit,1);
  assert.equal(budget.stats.availabilityListeners,0);assert.equal(budget.stats.bytes,0);
  store.destroy();
});

test('closing a session cancels a waiting input and an in-flight read and returns every claim',async()=>{
  const api=await fresh(),limit=claimBytes(first)+claimBytes(second)+2*first.d.transport.bytes+2*second.d.transport.bytes;
  const {budget,store,transport,reads,ingress}=harness(api,{limitBytes:limit,recentLimitBytes:1024});
  const blocker=budget.reserve({category:'construction',bytes:limit-claimBytes(first)-2*first.d.transport.bytes,precision:'estimate'});
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const a=session.wait(api.readFrozenTableAsync(first.d.sha256,firstFile,0)),b=session.wait(api.readFrozenTableAsync(second.d.sha256,secondFile,0));
  await until(()=>reads.length===1,'the first input fits and starts');
  await settle();
  const state=api.frozenPaintTableStats().inputLedger;
  assert.equal(state.claims,1);assert.equal(state.claimedBytes,claimBytes(first),'only the admitted first input is claimed');
  assert.deepEqual(Object.fromEntries(state.pending.map(row=>[row.sha256,[row.phase,row.requiredBytes]])),{[first.d.sha256]:['frozen-table-transport',2*first.d.transport.bytes],[second.d.sha256]:['frozen-table-input',workingSet(second)]},'the first read is with the transport; the second waits with its own reason and whole working set');
  session.close();
  await assert.rejects(a,{name:'AbortError'});await assert.rejects(b,{name:'AbortError'});
  await settle();
  assert(reads[0].signal.aborted,'the in-flight read was cancelled');
  assert.equal(api.frozenPaintTableStats().inputLedger.claims,0);assert.equal(budget.stats.availabilityListeners,0);
  reads[0].resolve(body(first));await settle();await settle();
  assert.equal(reads.length,1,'the waiting input never issued its read');assert.equal(transport.stats.consumers,0);
  blocker.release();store.evictRecent();assert.equal(budget.stats.bytes,0);store.destroy();
});

test('a bare reader keeps the legacy initializer path without ledger claims',async()=>{
  const api=await fresh(),seen=[];
  const session=api.beginFrozenPaintTableInitialization(async(target,signal,max)=>{signal.throwIfAborted();seen.push([target,max]);return body(first);},new AbortController().signal,['root500']);
  assert.equal((await session.wait(api.readFrozenTableAsync(first.d.sha256,firstFile,0))).rows.length,120);
  assert.deepEqual(seen,[[first.d.transport.path,first.d.transport.bytes]]);
  const ledger=api.frozenPaintTableStats().inputLedger;assert.equal(ledger.admissions,0);assert.equal(ledger.claims,0);
  session.close();
});
