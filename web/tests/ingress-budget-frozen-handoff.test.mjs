import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The real public facade, initializer store, byte transport, page store and
// ledger in one bundle (as in ingress-budget-frozen-initializer). Only the
// null-profile development inputs are injected as tiny fixtures. These cases
// pin the working-set admission: a table input and the transport's read
// envelope for the same read are admitted together, so the input is never
// held while the transport waits for capacity (no hold-and-wait).
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function table(value){
  const raw=new TextEncoder().encode(JSON.stringify(value)),sha256=hash(raw),physical=new Uint8Array(gzipSync(raw)),t=hash(physical);
  return{raw,physical,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length,
    transport:{path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'}}};
}
// Hex digests do not repeat, so the gzip transport stays a sizeable share of the raw table.
const digest=n=>createHash('sha256').update(String(n)).digest('hex');
const first=table({rows:Array.from({length:400},(_,i)=>({i,v:digest(i)}))});
const file='painted/root500/safety/ingress-handoff.ts';
const manifest=[first.d],dependencies={schema_version:1,providers:{root500:[first.d.sha256]},initializers:{root500:{[first.d.sha256]:{[file]:1}}}};
const contents=await readFile(path.join(source,'frozen-paint-tables.ts'),'utf8')+[
  "\nexport {createResourceByteTransport} from './resource-byte-transport';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",
].join('\n');
const built=await build({stdin:{contents,resolveDir:source,sourcefile:'frozen-paint-tables.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins:[{name:'tiny-handoff-inputs',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'handoff-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'handoff-fixture'},args=>({loader:'js',contents:args.path==='virtual:crimemaps-city-data'?'export const profileSHA256=null;export default null;':args.path==='./deployment'?"export const repositoryCity='bremen';":'export default '+JSON.stringify(args.path.includes('manifest')?manifest:dependencies)+';'}));
}}]});
const text=built.outputFiles[0].text;
let instance=0;
// Initializer completion is one-shot per module instance; each case gets a fresh facade (a fresh page).
const fresh=()=>import('data:text/javascript;base64,'+Buffer.from(text+'\n// handoff instance '+(++instance)).toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,label){for(let i=0;i<60;i++){if(predicate())return;await settle();}assert.fail(label);}
const MiB=1024*1024,d=first.d.bytes,P=first.d.transport.bytes;
const input=3*d,envelope=2*P,workingSet=input+envelope;
assert(P>64&&input>envelope,'fixture keeps a sizeable transport envelope beside the input claim');
function harness(api,{limitBytes=64*MiB,recentLimitBytes=1024}={}){
  const budget=api.createResourceBudget({limitBytes,recentLimitBytes}),store=api.createChunkResourceStore({budget}),reads=[];
  const transport=api.createResourceByteTransport({namespace:'ingress-handoff',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});})});
  return{budget,store,transport,reads,ingress:{acquireBytes:transport.acquireBytes,budget}};
}
const body=()=>{const bytes=new Uint8Array(first.physical.length);bytes.set(first.physical);return bytes;};
const holder=(budget,bytes,label='shard source waiting on paint initialization')=>budget.reserve({category:'construction',bytes,precision:'estimate',label});
const pendingRows=api=>api.frozenPaintTableStats().inputLedger.pending.map(row=>[row.sha256,row.phase,row.requiredBytes]);

test('a page limit that admits the input claim but not claim plus transport envelope is reported as not fitting, never held',async()=>{
  const api=await fresh(),limit=input+P,{budget,store,transport,reads,ingress}=harness(api,{limitBytes:limit,recentLimitBytes:0});
  const failures=[];
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500'],error=>failures.push(error));
  await assert.rejects(session.wait(api.readFrozenTableAsync(first.d.sha256,file,0)),error=>error instanceof api.ResourceBudgetExceededError&&error.capacity===limit&&error.required>=workingSet);
  const ledger=api.frozenPaintTableStats().inputLedger;
  assert.equal(failures.length,1,'the owner receives the explicit refusal');assert.equal(ledger.unfit,1);assert.equal(ledger.claims,0);assert.deepEqual(ledger.pending,[]);
  assert.equal(reads.length,0);assert.equal(transport.stats.consumers,0);assert.equal(budget.stats.bytes,0);assert.equal(budget.stats.availabilityListeners,0);
  store.destroy();
});

test('free capacity in [input, input + envelope) waits at admission holding nothing, then reads once the whole working set fits',async()=>{
  const api=await fresh(),limit=64*MiB,{budget,store,transport,reads,ingress}=harness(api,{limitBytes:limit});
  const other=holder(budget,limit-(input+P));
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,file,0));
  for(let i=0;i<8;i++)await settle();
  const waiting=api.frozenPaintTableStats().inputLedger;
  assert.equal(reads.length,0,'no read starts while the whole working set does not fit');
  assert.equal(waiting.claims,0);assert.equal(waiting.claimedBytes,0);assert.equal(budget.stats.bytes,other.bytes,'neither the input nor an envelope is held while waiting');
  assert.deepEqual(pendingRows(api),[[first.d.sha256,'frozen-table-input',workingSet]]);
  assert.equal(transport.stats.consumers,0,'the transport is not waiting on behalf of a held input');assert.equal(budget.stats.availabilityListeners,1,'one wake-up subscription, no polling');
  assert(other.adjust({category:'construction',bytes:limit-workingSet,precision:'estimate'}),'the other producer returns exactly enough');
  await until(()=>reads.length===1,'the whole working set fits and the read starts');
  assert.equal(reads[0].path,first.d.transport.path);assert.equal(reads[0].max,P);
  assert.equal(budget.stats.bytes,limit,'input claim plus the transport envelope, each counted once');
  assert.deepEqual({...budget.stats.categories.read},{bytes:envelope,exactBytes:0,estimatedBytes:envelope},'the envelope now belongs to the transport, once');
  const flight=api.frozenPaintTableStats().inputLedger;
  assert.equal(flight.claims,1);assert.equal(flight.claimedBytes,input);assert.deepEqual(pendingRows(api),[[first.d.sha256,'frozen-table-transport',envelope]]);
  reads[0].resolve(body());
  assert.equal((await pending).rows.length,400);await settle();
  const after=api.frozenPaintTableStats().inputLedger;
  assert.equal(after.claims,0);assert.deepEqual(after.pending,[]);assert.equal(after.handoffRefusals,0);assert.equal(transport.stats.consumers,0);
  store.evictRecent();assert.equal(budget.stats.bytes,other.bytes,'only the other producer remains');assert.equal(budget.stats.availabilityListeners,0);
  other.release();session.close();store.destroy();
});

test('capacity that would only cover the transport envelope waits at admission without holding the input',async()=>{
  const api=await fresh(),limit=64*MiB,{budget,store,transport,reads,ingress}=harness(api,{limitBytes:limit});
  const other=holder(budget,limit-(envelope+16));
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,file,0));
  for(let i=0;i<8;i++)await settle();
  assert.equal(reads.length,0);assert.equal(api.frozenPaintTableStats().inputLedger.claims,0);assert.equal(transport.stats.consumers,0);
  assert.equal(budget.stats.bytes,other.bytes);assert.deepEqual(pendingRows(api),[[first.d.sha256,'frozen-table-input',workingSet]]);
  other.release();
  await until(()=>reads.length===1,'released capacity starts the read');reads[0].resolve(body());
  assert.equal((await pending).rows.length,400);await settle();
  // IA-R2 (B): the parsed value stays on the page ledger as a page-lifetime 'metadata' estimate.
  assert.equal(api.frozenPaintTableStats().inputLedger.claims,0);store.evictRecent();assert.equal(budget.stats.bytes,api.frozenPaintTableStats().retainedParsedEstimateBytes);
  session.close();store.destroy();
});

// IA-R2 (A, stage 2 ingress-adopt CDR[1]): the caller now admits [input, minted envelope]
// as one claim that the transport adopts, so there is no hand-off that returns the
// envelope to the ledger and could be refused. The former "refusal inside the
// hand-off re-admits" case is rewritten as in ingress-adopt-frozen-tables (F3): a
// synchronous availability callback gets nothing before the read, and the delivery
// wave carries only the envelope beyond the response.
test('a synchronous availability callback cannot take the read envelope: the caller-admitted read starts at once and the delivery wave carries only what delivery frees',async()=>{
  const api=await fresh(),limit=64*MiB,{budget,store,transport,reads,ingress}=harness(api,{limitBytes:limit});
  const other=holder(budget,limit-workingSet);
  let stolen,stealer=budget.onAvailable(()=>{if(stolen||budget.stats.availableBytes<=0)return;stolen=holder(budget,Math.min(P,budget.stats.availableBytes),'synchronous availability callback');stealer();});
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,file,0));
  await until(()=>reads.length===1,'the whole working set fits and the read starts at once');
  assert.equal(stolen,undefined,'nothing was returned to the ledger before the read');
  const flight=api.frozenPaintTableStats().inputLedger;
  assert.equal(flight.handoffRefusals,0,'no hand-off exists to refuse');assert.equal(flight.claims,1);assert.equal(flight.admissions,1);
  assert.equal(transport.stats.consumers,1);assert.equal(budget.stats.bytes,limit,'input claim plus the minted envelope, each counted once');
  reads[0].resolve(body());
  assert.equal((await pending).rows.length,400);await settle();
  assert.equal(stolen?.bytes,P,'the delivery wave carried only the envelope beyond the response');
  const after=api.frozenPaintTableStats().inputLedger;
  assert.equal(after.claims,0);assert.equal(after.admissions,1);assert.equal(after.handoffRefusals,0);assert.equal(reads.length,1,'exactly one read');
  stolen.release();store.evictRecent();assert.equal(budget.stats.bytes,other.bytes+api.frozenPaintTableStats().retainedParsedEstimateBytes);assert.equal(budget.stats.availabilityListeners,0);
  other.release();session.close();store.destroy();
});

test('a table already being read by another consumer shares that transport read; the returned envelope is not charged twice',async()=>{
  const api=await fresh(),{budget,store,transport,reads,ingress}=harness(api);
  const elsewhere=transport.acquireBytes(first.d.transport.path,new AbortController().signal,P);
  await until(()=>reads.length===1,'the other consumer starts the physical read');
  assert.equal(budget.stats.bytes,envelope);
  const session=api.beginFrozenPaintTableInitialization(ingress,new AbortController().signal,['root500']);
  const pending=session.wait(api.readFrozenTableAsync(first.d.sha256,file,0));
  await until(()=>api.frozenPaintTableStats().inputLedger.claims===1,'the input is admitted and handed off');
  assert.equal(reads.length,1,'one physical read for both consumers');
  // IA-R2 (A): registered F4 upper bound (DECISIONS 2026-11-02 04:00 (2)): while the shared read is in
  // flight the joiner's own minted envelope (2P) is listed beside the leader's; only more, never less.
  assert.equal(budget.stats.bytes,envelope+input+envelope,'the shared read keeps one physical read; this table adds its input claim and its own envelope while in flight');
  reads[0].resolve(body());
  assert.equal((await pending).rows.length,400);const lease=await elsewhere;await settle();
  assert.equal(api.frozenPaintTableStats().inputLedger.claims,0);
  assert.deepEqual({...budget.stats.categories.read},{bytes:P,exactBytes:P,estimatedBytes:0},'the delivered response is charged exactly, once');
  lease.release();store.evictRecent();assert.equal(budget.stats.bytes,api.frozenPaintTableStats().retainedParsedEstimateBytes);assert.equal(transport.stats.consumers,0);
  session.close();store.destroy();
});
