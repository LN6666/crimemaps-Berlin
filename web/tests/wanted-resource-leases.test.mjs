import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:`export {createWantedResourceLeases} from './viewport-request.ts'; export {createChunkResourceStore} from './render-runtime/chunk-resource-store.ts'; export {createResourceBudget} from './render-runtime/resource-budget.ts';`,resolveDir:new URL('../src/safety/',import.meta.url).pathname},bundle:true,platform:'node',format:'esm',write:false});
const {createWantedResourceLeases,createChunkResourceStore,createResourceBudget}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function fixture(produce=key=>({key})) {
 const counts=new Map(),disposed=[],store=createChunkResourceStore({budget:createResourceBudget()});
 const wanted=createWantedResourceLeases({key:key=>key,acquire:key=>store.acquire({contentKey:key,role:'source',allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'estimate'},
  produce:context=>{counts.set(key,(counts.get(key)??0)+1);return produce(key,context);},dispose:value=>disposed.push(value.key)})});
 return {wanted,store,counts,disposed};
}
test('latest wanted coalesces before production; unknown retains and explicit empty retires',async()=>{
 const f=fixture();f.wanted.reconcile(['obsolete']);f.wanted.reconcile(['current']);await f.wanted.ready();
 assert.deepEqual([...f.counts.keys()],['current']);
 f.wanted.reconcile(undefined);assert.equal((await f.wanted.value('current')).key,'current');
 f.wanted.reconcile([]);assert.deepEqual(f.wanted.keys,[]);assert.deepEqual(f.disposed,['current']);f.wanted.destroy();f.store.destroy();
});
test('intersection retains one producer and main publication survives removal of demand',async()=>{
 const f=fixture();f.wanted.reconcile(['a','b']);await f.wanted.ready();const b=await f.wanted.value('b'),main=f.wanted.retain('a','main');
 f.wanted.reconcile(['b','c']);await f.wanted.ready();assert.equal(await f.wanted.value('b'),b);assert.equal(f.counts.get('b'),1);
 assert.equal(main.value.key,'a');assert(!f.disposed.includes('a'));main.release();assert(f.disposed.includes('a'));f.wanted.destroy();f.store.destroy();
});
test('one canceled leaf waiter does not cancel still-wanted production',async()=>{
 let complete;const f=fixture(()=>new Promise(resolve=>{complete=resolve;}));f.wanted.reconcile(['slow']);
 const canceled=new AbortController(),pending=f.wanted.value('slow',canceled.signal),rejected=assert.rejects(pending,{name:'AbortError'});
 canceled.abort();await rejected;assert.equal(f.counts.get('slow'),1);complete({key:'slow'});
 assert.equal((await f.wanted.value('slow')).key,'slow');f.wanted.destroy();f.store.destroy();
});
test('failed content retries only after a new explicit demand reconciliation',async()=>{
 let attempt=0;const failure=Error('real source admission');const f=fixture(key=>{if(++attempt===1)throw failure;return{key};});
 // The page store keeps a bounded copy of a production failure (same name and message, no reference
 // to the original error object); every later read of the same failed content sees that one copy.
 let cached;const bounded=error=>error instanceof Error&&error!==failure&&error.name===failure.name&&error.message===failure.message&&(cached??=error)===error;
 f.wanted.reconcile(['same']);await assert.rejects(f.wanted.value('same'),bounded);
 await assert.rejects(f.wanted.value('same'),bounded);assert.equal(attempt,1);
 f.wanted.reconcile(['same']);assert.equal((await f.wanted.value('same')).key,'same');assert.equal(attempt,2);f.wanted.destroy();f.store.destroy();
});

test('only the final viewport transition applies focus grace, before releasing old demand',async t=>{
 let now=0,id=0;const timers=new Map();
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(run,delay)=>{timers.set(++id,{run,at:now+delay});return id;});
 t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const advance=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.run();}};
 const f=fixture(),calls=[],tiers={refetch:8000,redecode:11000,reupload:14000,rebuild:16000};
 const transition={beforeRelease:keys=>{calls.push([...keys]);f.store.setIdleRetention(keys,tiers);}};
 try{
  f.wanted.reconcile(['a','b']);await f.wanted.ready();const main=f.wanted.retain('a','main');
  f.wanted.reconcile(['b'],{beforeRelease:()=>{throw Error('obsolete pan must not run');}});
  f.wanted.reconcile(['b','c'],transition);await f.wanted.ready();assert.deepEqual(calls,[['a']]);
  advance(20000);assert(!f.disposed.includes('a'),'the prior draw still owns its source');main.release();
  advance(15999);assert(!f.disposed.includes('a'));
  f.wanted.reconcile(['a','b','c']);await f.wanted.ready();assert.equal(f.counts.get('a'),1,'returning during grace reuses source');
  f.wanted.reconcile(['b','c'],transition);await f.wanted.ready();
  advance(16000);assert(f.disposed.includes('a'));assert.equal(f.counts.get('b'),1);assert.equal(f.counts.get('c'),1);
 }finally{f.wanted.destroy();f.store.destroy();}
});

test('a failed retirement policy preserves the old demand and does not acquire replacements',async()=>{
 const f=fixture();try{
  f.wanted.reconcile(['old']);await f.wanted.ready();
  f.wanted.reconcile(['new'],{beforeRelease:()=>{throw Error('invalid exit policy');}});
  await assert.rejects(f.wanted.ready(),/invalid exit policy/);
  assert.deepEqual([...f.counts.keys()],['old']);assert.deepEqual(f.disposed,[]);
  f.wanted.reconcile(['old']);assert.equal((await f.wanted.value('old')).key,'old');
 }finally{f.wanted.destroy();f.store.destroy();}
});
