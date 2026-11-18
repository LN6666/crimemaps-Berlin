// Shared inputs for the core-frozen tests: tiny synthetic tables, the real
// lease store / initializer store / frozen facade bundled with the real page
// store, ledger and byte transport. No product table, asset, browser or GPU.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

export const web=fileURLToPath(new URL('../../',import.meta.url));
export const source=path.join(web,'src/safety');
export const MiB=1024*1024;
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
export {waitForResourceState as until} from './wait-for-resource-state.mjs';
/** Test-side guard only: a stalled wait fails the test instead of hanging it. */
export function deadline(promise,label='core-frozen operation stalled',ms=4000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]).finally(()=>clearTimeout(timer));}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
export const copy=bytes=>{const out=new Uint8Array(bytes.length);out.set(bytes);return out;};
const digest=n=>createHash('sha256').update(String(n)).digest('hex');
/** A verified table: raw JSON bytes, physical (gzip) bytes and its descriptor. */
export function table(name,rows,{gzip=true}={}){
 const raw=new TextEncoder().encode(JSON.stringify({name,rows:Array.from({length:rows},(_,i)=>({i,v:digest(name+'-'+i)}))})),sha256=hash(raw);
 const d={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length};let physical=raw;
 if(gzip){physical=new Uint8Array(gzipSync(raw));const t=hash(physical);d.transport={path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'};}
 return{name,raw,physical,d,path:(d.transport??d).path};
}
/** The working set the facade admits for one table read: input claim plus transport envelope. */
export const inputClaim=f=>3*f.d.bytes;
export const readWorkingSet=f=>3*f.d.bytes+2*f.physical.length;
/** The decoded value one table holds as native JSON. */
export const decodedValue=f=>JSON.parse(new TextDecoder().decode(f.raw));
/** One lease-store read's whole working set as the lease store admits it: the
 * binding estimate (256), the decoded expansion (inflate d when gzip,
 * NORMALIZE_EXPANSION d) and,
 * with a byte transport, the transport's two-copy read envelope (2P). */
export const leaseExpansion=f=>(f.d.transport?f.d.bytes:0)+NORMALIZE_EXPANSION*f.d.bytes;
export const leaseWorkingSet=f=>256+leaseExpansion(f)+2*f.physical.length;
/** A page category's bytes, or zeros when the category is absent. */
export const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});
/** One page ledger and its chunk store for lease-store cases. */
export function leasePage(api,{limitBytes=64*MiB,recentLimitBytes=0}={}){const budget=api.createResourceBudget({limitBytes,recentLimitBytes});return{budget,store:api.createChunkResourceStore({budget})};}
/** One map's frozen lease store over a shared page store, with its own byte
 * transport exactly as painted-map builds them (one namespace per city), or a
 * legacy reader. Network reads stay pending until a case settles them and
 * reject on abort like fetch, unless ignoreAbort. Destroy follows painted-map:
 * the map's frozen resources, then its transport. */
export function leaseMap(api,resources,name,tables,{reader='transport',ignoreAbort=false,city='bremen'}={}){
 const network=[],file=f=>`painted/${city}/safety/core-frozen-${f.name}.ts`;
 const read=(target,readSignal,max)=>new Promise((resolve,reject)=>{network.push({target,signal:readSignal,max,resolve,reject,done:false});if(!ignoreAbort)readSignal.addEventListener('abort',()=>reject(readSignal.reason),{once:true});});
 const transport=api.createResourceByteTransport({namespace:JSON.stringify([city,null]),resourceStore:resources.store,read});
 const leases=api.createFrozenDataLeaseStore(tables.map(f=>f.d),{resourceStore:resources.store});
 const client=leases.client({city,profileSHA256:null,provider:city,selection:{tables:tables.map(f=>f.d.sha256),initializers:Object.fromEntries(tables.map(f=>[f.d.sha256,{[file(f)]:1}]))},resolve:sha=>sha,
  ...(reader==='transport'?{read:transport.readBytes,acquireBytes:transport.acquireBytes}:{read})});
 return{name,network,transport,leases,client,
  ref:f=>({canonicalSHA256:f.d.sha256,file:file(f),occurrence:0,codec:'json'}),
  /** Physical paths whose network read is still pending and not aborted. */
  pending:()=>network.filter(row=>!row.done&&!row.signal.aborted).map(row=>row.target),
  /** Settles the pending network read of one table; aborted: also one whose signal aborted (a reader that ignores it). */
  deliver(f,{aborted=false}={}){const row=network.find(r=>r.target===f.path&&!r.done&&(aborted||!r.signal.aborted));if(!row)throw Error(name+' has no pending read of '+f.name);row.done=true;row.resolve(copy(f.physical));},
  destroy(){leases.destroy();transport.destroy();}};
}
/** Every lease store and transport drained, every claim back on the page ledger
 * and no wake-up subscription left. */
export async function drainedLeases(assert,resources,...maps){
 await settle();await settle();resources.store.evictRecent();
 for(const m of maps){for(const key of ['entries','valueCells','waiters','leases','active','queued'])assert.equal(m.leases.stats[key],0,m.name+' '+key+' must drain');assert.equal(m.transport.stats.consumers,0,m.name+' transport consumers');}
 assert.equal(resources.budget.stats.bytes,0,'every claim returned to the page ledger');assert.equal(resources.budget.stats.availabilityListeners,0,'no wake-up subscription remains');
}
const bundle=async(contents,sourcefile,plugins=[])=>{
 const built=await build({stdin:{contents,resolveDir:source,sourcefile,loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins});
 return built.outputFiles[0].text;
};
const load=(text,tag)=>import('data:text/javascript;base64,'+Buffer.from(text+'\n// '+tag).toString('base64'));
/** The lease store's own normalize expansion per raw byte, read from the real
 * module so a recalibration changes one constant, not every expectation. */
const sizing=await load(await bundle("export {FROZEN_NORMALIZE_EXPANSION,FROZEN_CLONE_HOLD_EXPANSION} from './frozen-data-lease-store';export {estimateRetainedBuildingPayload} from './building-payload-cost';",'core-frozen-normalize-expansion.ts'),'core-frozen normalize expansion');
export const NORMALIZE_EXPANSION=sizing.FROZEN_NORMALIZE_EXPANSION;
if(!(NORMALIZE_EXPANSION>0))throw Error('frozen-data-lease-store must export FROZEN_NORMALIZE_EXPANSION');
/** What the clone hold keeps per raw byte from the settle through the clones
 * (DECISIONS 2026-11-02 22:19), read from the real module. */
export const CLONE_HOLD_EXPANSION=sizing.FROZEN_CLONE_HOLD_EXPANSION;
if(!(CLONE_HOLD_EXPANSION>0))throw Error('frozen-data-lease-store must export FROZEN_CLONE_HOLD_EXPANSION');
/** The settled decoded value's page-ledger estimate (the real estimator). */
export const valueEstimate=raw=>sizing.estimateRetainedBuildingPayload(JSON.parse(new TextDecoder().decode(raw))).retainedPayloadEstimateBytes;
/** Scheme H (DECISIONS 2026-11-02 08:56 and 22:19): one lease-store table
 * acquisition holds, from its binding's queued 256 on, at most
 *  read   256 + expansion + 2P (leaseWorkingSet, expansion with K = 13),
 *  settle 256 + H d + 2E: the decoded value settles beside the clone hold,
 *         the held normalize H d (H = CLONE_HOLD_EXPANSION = 10) and the
 *         first clone's room E (the parse buffer is gone),
 *  clone  2E + H d: the shared value, the binding's private clone (which took
 *         the room's identity) and the held normalize (the binding's 256 is
 *         replaced by E).
 * whole is the largest: the least page on which the acquisition completes.
 * S (settleBytes) is the settle claim without the binding's 256. */
export function leasePhases(f){
 const d=f.d.bytes,E=valueEstimate(f.raw),read=leaseWorkingSet(f),S=CLONE_HOLD_EXPANSION*d+2*E,settle=256+S,clone=2*E+CLONE_HOLD_EXPANSION*d;
 return{d,P:f.physical.length,E,S,read,settle,clone,whole:Math.max(read,settle,clone)};
}
/** The real lease store with the real page store, ledger and byte transport. */
export async function leaseRuntime(){
 return load(await bundle(["export {createFrozenDataLeaseStore} from './frozen-data-lease-store';","export {createResourceByteTransport} from './resource-byte-transport';","export {createChunkResourceStore} from './render-runtime/chunk-resource-store';","export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';"].join('\n'),'core-frozen-lease-runtime.ts'),'core-frozen lease runtime');
}
/** The real initializer store with the real page ledger (no facade, no transport). */
export async function initializerRuntime(){
 let instance=0;const text=await bundle(["export {createFrozenInitializerStore} from './frozen-paint-initializer-store';","export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';"].join('\n'),'core-frozen-initializer-runtime.ts');
 return()=>load(text,'core-frozen initializer runtime '+(++instance));
}
/** The real frozen facade over tiny null-profile inputs. Module initializer
 * completion is one-shot per module instance, so every call returns a fresh
 * facade (a fresh page). */
export async function facadeRuntime({manifest,dependencies,city='bremen'}){
 const contents=await readFile(path.join(source,'frozen-paint-tables.ts'),'utf8')+["",
  "export {createResourceByteTransport} from './resource-byte-transport';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';"].join('\n');
 const text=await bundle(contents,'frozen-paint-tables.ts',[{name:'core-frozen-null-profile',setup(builder){
  builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'core-frozen-fixture'}));
  builder.onLoad({filter:/.*/,namespace:'core-frozen-fixture'},args=>({loader:'js',contents:args.path==='virtual:crimemaps-city-data'?'export const profileSHA256=null;export default null;':args.path==='./deployment'?`export const repositoryCity=${JSON.stringify(city)};`:'export default '+JSON.stringify(args.path.includes('manifest')?manifest:dependencies)+';'}));
 }}]);
 let instance=0;return()=>load(text,'core-frozen facade '+(++instance));
}
/** One page ledger, its chunk store and a byte transport whose network reads
 * stay pending until the test settles them (they reject on abort, like fetch). */
export function facadePage(api,{limitBytes=64*MiB,recentLimitBytes=0}={}){
 const budget=api.createResourceBudget({limitBytes,recentLimitBytes}),store=api.createChunkResourceStore({budget}),reads=[];
 const transport=api.createResourceByteTransport({namespace:'core-frozen',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});signal.addEventListener('abort',()=>reject(signal.reason),{once:true});})});
 return{budget,store,transport,reads,ingress:{acquireBytes:transport.acquireBytes,budget},
  /** Settles the pending network read of one table. */
  deliver(f){const row=reads.find(read=>read.path===f.path&&!read.done&&!read.signal.aborted);if(!row)throw Error('No pending read of '+f.name);row.done=true;row.resolve(copy(f.physical));},
  pendingReads(){return reads.filter(read=>!read.done&&!read.signal.aborted).map(read=>read.path);}};
}
