import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Exercise the real public facade and real resource/initializer stores. This is
// explicitly the null-profile development path: tiny manifest/dependencies,
// deployment and virtual profile imports are injected before any product JSON
// can load. Active 12-route projection is covered by city-data-profile tests.
const web=fileURLToPath(new URL('../',import.meta.url)),source=path.join(web,'src/safety');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(value){const bytes=new TextEncoder().encode(JSON.stringify(value)),sha256=hash(bytes);return{bytes,d:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:bytes.length}};}
const shared=fixture({items:[1,2],negativeZeroTag:'shared'}),exclusive=fixture({items:[3],exclusive:true});
const sharedFile='painted/bremen/safety/resource-shared.ts',exclusiveFile='painted/bremen/safety/resource-exclusive.ts';
const manifest=[shared.d,exclusive.d],dependencies={schema_version:1,providers:{bremen:[shared.d.sha256,exclusive.d.sha256],root500:[shared.d.sha256]},initializers:{bremen:{[shared.d.sha256]:{[sharedFile]:2},[exclusive.d.sha256]:{[exclusiveFile]:1}},root500:{[shared.d.sha256]:{[sharedFile]:1}}}};
// The page store and ledger factories come from the same bundle, so an owner
// given its own store shares class identities with the facade under test.
const contents=await readFile(path.join(source,'frozen-paint-tables.ts'),'utf8')+"\nexport {createChunkResourceStore} from './render-runtime/chunk-resource-store';\nexport {createResourceBudget} from './render-runtime/resource-budget';";
const built=await build({stdin:{contents,resolveDir:source,sourcefile:'frozen-paint-tables.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,plugins:[{name:'tiny-resource-owner-boundaries',setup(builder){
 builder.onResolve({filter:/^(?:virtual:crimemaps-city-data|\.\/deployment|\.\/frozen-paint-table-(?:manifest|dependencies)\.json)$/},args=>({path:args.path,namespace:'resource-fixture'}));
 builder.onLoad({filter:/.*/,namespace:'resource-fixture'},args=>({loader:'js',contents:args.path==='virtual:crimemaps-city-data'?'export const profileSHA256=null;export default null;':args.path==='./deployment'?"export const repositoryCity='bremen';":'export default '+JSON.stringify(args.path.includes('manifest')?manifest:dependencies)+';'}));
}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const signal=()=>new AbortController().signal;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const ref=(f=shared,file=sharedFile,occurrence=0)=>({canonicalSHA256:f.d.sha256,file,occurrence,codec:'json'});
function ownerFixture({resourceStore}={}){const reads=[],payloads=new Map([shared,exclusive].map(f=>[f.d.path,f]));const read=async(p,s,max)=>{s.throwIfAborted();const f=payloads.get(p);assert(f,'Only tiny fixture paths may be read');assert.equal(max,f.bytes.length);reads.push(p);return f.bytes;};return{owner:api.createFrozenDataResourceOwner({city:'bremen',profileSHA256:null,read,...(resourceStore?{resourceStore}:{})}),reads,read};}
async function assertDrained(owner){await tick();for(const key of ['entries','valueCells','waiters','leases','active','queued','logicalBytesWithLiveLease'])assert.equal(owner.stats[key],0,key+' must drain');}
const released=lease=>{assert.throws(()=>lease.borrow(()=>null),/releas|dispos|inactive|expired/i);assert.throws(()=>lease.retain(),/releas|dispos|inactive|expired/i);};

test('the real facade gives each map an independent resource owner under the injected null profile',async t=>{
 // No explicit store: both maps resolve the one page store, as painted-map does.
 const a=ownerFixture(),b=ownerFixture();t.after(()=>{a.owner.destroy();b.owner.destroy();});
 const firstClient=a.owner.client('bremen'),secondClient=b.owner.client('bremen');
 const [first,second]=await Promise.all([firstClient.acquire(ref(),signal()),secondClient.acquire(ref(),signal())]);
 // Verified table ingress is page-wide and counted once (one physical read and
 // one ledger charge per page); the first map's reader performs that read.
 assert.equal(first.identity.city,'bremen');assert.equal(first.identity.profileSHA256,null);assert.equal(first.identity.resolvedRawSHA256,shared.d.sha256);assert.equal(a.reads.length,1);assert.equal(b.reads.length,0,'the second map joins the page-wide verified ingress');assert.equal(a.owner.stats.valueCells,1);assert.equal(b.owner.stats.valueCells,1);
 // Each map still owns its mutable initializer value and its lifetime.
 first.borrow(value=>value.items[0]=99);assert.equal(second.borrow(value=>value.items[0]),1,'a mutation through one map lease is invisible to another map');a.owner.destroy();released(first);assert.equal(second.borrow(value=>value.items[0]),1);await assertDrained(a.owner);second.release();await assertDrained(b.owner);
});

test('maps given separate page stores read, parse and own their tables independently',async t=>{
 const stores=[0,1].map(()=>api.createChunkResourceStore({budget:api.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0})}));
 const a=ownerFixture({resourceStore:stores[0]}),b=ownerFixture({resourceStore:stores[1]});t.after(()=>{a.owner.destroy();b.owner.destroy();for(const store of stores)store.destroy();});
 const [first,second]=await Promise.all([a.owner.client('bremen').acquire(ref(),signal()),b.owner.client('bremen').acquire(ref(),signal())]);
 assert.equal(a.reads.length,1);assert.equal(b.reads.length,1);assert.equal(a.owner.stats.valueCells,1);assert.equal(b.owner.stats.valueCells,1);
 assert(stores.every(store=>store.budget.stats.bytes>0),'each store charges its own verified table');
 first.borrow(value=>value.items[0]=99);assert.equal(second.borrow(value=>value.items[0]),1);a.owner.destroy();released(first);assert.equal(second.borrow(value=>value.items[0]),1);await assertDrained(a.owner);second.release();await assertDrained(b.owner);
});

test('two allowed providers in the same owner share a logical ref and dispose independently',async t=>{
 const {owner,reads}=ownerFixture();t.after(()=>owner.destroy());const a=owner.client('bremen'),b=owner.client('root500');
 const [first,second]=await Promise.all([a.acquire(ref(),signal()),b.acquire(ref(),signal())]);assert.equal(reads.length,1);assert.equal(owner.stats.parses,1);assert.equal(owner.stats.valueCells,1);assert.equal(owner.stats.leases,2);
 let same=false;first.borrow(one=>second.borrow(two=>{same=one===two;}));assert(same);
 a.dispose();released(first);assert.equal(second.borrow(value=>value.items[0]),1);assert.equal(owner.stats.leases,1);await assert.rejects(async()=>a.acquire(ref(),signal()));b.dispose();released(second);await assertDrained(owner);
});

test('the facade rejects unknown providers, unselected files and occurrences before any read',async t=>{
 const {owner,reads}=ownerFixture();t.after(()=>owner.destroy());assert.throws(()=>owner.client('not-a-provider'),/provider/i);
 const bremen=owner.client('bremen'),root=owner.client('root500');
 for(const [client,invalid]of [[bremen,ref(shared,'painted/bremen/safety/unselected.ts')],[bremen,ref(shared,sharedFile,2)],[root,ref(shared,sharedFile,1)],[root,ref(exclusive,exclusiveFile)]])await assert.rejects(async()=>client.acquire(invalid,signal()),/allowlist|select|binding|provider|unknown/i);
 assert.equal(reads.length,0);await assertDrained(owner);
 const allowed=await bremen.acquire(ref(shared,sharedFile,1),signal());assert.equal(allowed.identity.occurrence,1);allowed.release();await assertDrained(owner);
});

test('final release and reacquire through the public facade perform a new verified read and parse',async t=>{
 const {owner,reads}=ownerFixture();t.after(()=>owner.destroy());const client=owner.client('bremen'),first=await client.acquire(ref(),signal());first.borrow(value=>value.items[0]=99);first.release();released(first);assert.equal(owner.stats.valueCells,0);await assertDrained(owner);
 const second=await client.acquire(ref(),signal());assert.equal(second.borrow(value=>value.items[0]),1);assert.equal(reads.length,2);assert.equal(owner.stats.parses,2);second.release();await assertDrained(owner);assert.equal(owner.stats.releasedValues,2);
});

test('owner.destroy revokes external original and retained leases, clears cells and rejects new clients',async()=>{
 const {owner}=ownerFixture(),client=owner.client('bremen'),lease=await client.acquire(ref(),signal()),retained=lease.retain();await tick();assert.equal(owner.stats.leases,2);owner.destroy();owner.destroy();released(lease);released(retained);await assertDrained(owner);assert.throws(()=>owner.client('bremen'));await assert.rejects(async()=>client.acquire(ref(),signal()));lease.release();retained.release();assert.equal(owner.stats.releasedValues,1);
});

test('resource release/reacquire/destroy neither consumes nor resets legacy one-shot initializer done state',async t=>{
 const resource=ownerFixture();t.after(()=>resource.owner.destroy());const client=resource.owner.client('root500');
 const before=api.frozenPaintTableStats();assert.equal(before.completedInitializers,0);const initialResource=await client.acquire(ref(),signal());initialResource.release();await assertDrained(resource.owner);assert.equal(api.frozenPaintTableStats().completedInitializers,0,'Resource acquire must not register a legacy TLA completion');
 const session=api.beginFrozenPaintTableInitialization(resource.read,signal(),['root500']);t.after(()=>session.close());
 const legacy=await session.wait(api.readFrozenTableAsync(shared.d.sha256,sharedFile,0));assert.deepEqual(legacy.items,[1,2]);legacy.items[0]=77;session.close();assert.equal(api.frozenPaintTableStats().completedInitializers,1);assert.equal(api.frozenPaintTableStats().parses,1);assert.throws(()=>api.readFrozenTableAsync(shared.d.sha256,sharedFile,0),/more than once/i);
 const reacquired=await client.acquire(ref(),signal());assert.equal(reacquired.borrow(value=>value.items[0]),1,'Legacy module value and resource value must remain independent');reacquired.release();await assertDrained(resource.owner);resource.owner.destroy();
 const fresh=ownerFixture();t.after(()=>fresh.owner.destroy());const next=await fresh.owner.client('root500').acquire(ref(),signal());assert.equal(next.borrow(value=>value.items[0]),1);next.release();await assertDrained(fresh.owner);
 assert.equal(api.frozenPaintTableStats().completedInitializers,1);assert.equal(api.frozenPaintTableStats().parses,1);assert.throws(()=>api.readFrozenTableAsync(shared.d.sha256,sharedFile,0),/more than once/i);
});
