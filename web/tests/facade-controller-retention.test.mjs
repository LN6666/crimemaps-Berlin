import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createTsModuleLoader,codeStatements} from './support/fixtures-solar-texture-env-ts-modules.mjs';
const C=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),S=process.env.TEXTURE_TEST_BASE??C,sourceRoot=process.env.TEXTURE_TEST_SOURCE_ROOT??C;
const ts=createRequire(S+'/web/package.json')('typescript');
const file='web/src/safety/open-facade-window-texture.ts';
const text=fs.readFileSync(path.join(sourceRoot,file),'utf8');
// The entry wraps the shared source-material runtime, which owns the load
// controller; the page resource store keeps its production signal internal.
const sources=path.join(sourceRoot,'web/src')+path.sep,entry=path.join(sourceRoot,file),owner=path.join(sourceRoot,'web/src/safety/source-material-texture.ts');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
function fixture(){const b=new Uint8Array(13651),v=new DataView(b.buffer);v.setUint32(0,0x89504e47);v.setUint32(4,0x0d0a1a0a);v.setUint32(12,0x49484452);v.setUint32(16,1024);v.setUint32(20,1024);b[24]=8;return b;}
function harness(read,overrideDecodedSize){
 const refs=[];let aborts=0,closed=0,repaints=0,reads=0,decodes=0;
 class TrackedController extends AbortController{constructor(){super();refs.push(new WeakRef(this));}abort(reason){aborts++;super.abort(reason);}}
 const expected='7e2f09469e1b4a683bed7e41306d9e7800da1a9aecfd5688e22b77fb4a2d0386',crypto={subtle:{digest:async()=>Uint8Array.from(expected.match(/../g),s=>parseInt(s,16)).buffer}};
 // A fresh loader evaluates fresh module instances, so each harness has its own page store and ledger.
 const loader=createTsModuleLoader({typescript:ts,allow:module=>module.startsWith(sources),globals:module=>module===owner||module===entry?{AbortController:TrackedController,crypto}:{}});
 const exports=loader.load(entry);
 const {createChunkResourceStore}=loader.load(path.join(sourceRoot,'web/src/safety/render-runtime/chunk-resource-store.ts'));
 const {createResourceBudget}=loader.load(path.join(sourceRoot,'web/src/safety/render-runtime/resource-budget.ts'));
 const store=createChunkResourceStore({budget:createResourceBudget()});
 const runtime=exports.createOpenFacadeWindowTexture({resourceStore:store,readBytes:(asset,signal)=>{reads++;return read(asset,signal);},requestRepaint:()=>repaints++,
  decodeBitmap:async(_blob,{resizeWidth,resizeHeight})=>{decodes++;return{width:overrideDecodedSize??resizeWidth,height:overrideDecodedSize??resizeHeight,close(){closed++;}};}});
 return{runtime,refs,store,loader,get aborts(){return aborts;},get closed(){return closed;},get repaints(){return repaints;},get reads(){return reads;},get decodes(){return decodes;}};
}
async function collected(ref){assert.equal(typeof global.gc,'function','Run this suite with node --expose-gc');for(let i=0;i<10;i++){await tick();global.gc();}assert.equal(ref.deref(),undefined,'live texture runtime must not retain completed/aborted controller');}

test('success releases controller while bitmap/runtime remain usable; later hide creates no stale abort stack',async t=>{const h=harness(async()=>fixture());h.runtime.setEnabled(true);assert.equal(await h.runtime.load(),true,h.runtime.stats.error);assert.equal(h.runtime.stats.loads,1);assert.equal(h.runtime.stats.cityCacheEntries,1);assert.equal(h.runtime.stats.loading,false);
 const {uploadWidth,uploadHeight}=h.runtime.stats;
 // Two ordered steps on one harness, so the lifecycle checks still run and report when the retention check fails.
 await t.test('completed controller is collectable while the bitmap stays usable',async()=>{await collected(h.refs.at(-1));});
 await t.test('later hide/show reuses the stored bitmap without aborts, reads or decodes',async()=>{
  h.runtime.setPageHidden(true);h.runtime.detach();assert.equal(h.aborts,0,'completed work must not be aborted by later lifecycle changes');h.runtime.setPageHidden(false);assert.equal(await h.runtime.load(),true);
  // Hiding hands the decoded bitmap to the page store as a recent entry; the next
  // load is a store hit: a second completed load task without a second read or decode.
  assert.equal(h.runtime.stats.loads,2);assert.equal(h.reads,1);assert.equal(h.decodes,1);
  // The last consumer leaving keeps the bitmap only as one bounded recent entry,
  // charged to the page budget's recent subset; eviction returns that charge and
  // the store closes the bitmap exactly once.
  h.runtime.destroy();assert.equal(h.closed,0);
  assert.deepEqual({recent:h.store.stats.recent,recentBytes:h.store.budget.stats.recentBytes},{recent:1,recentBytes:uploadWidth*uploadHeight*4},'the retained bitmap is a charged, evictable recent entry');
  h.store.evictRecent();assert.equal(h.closed,1);
  assert.deepEqual({recent:h.store.stats.recent,recentBytes:h.store.budget.stats.recentBytes},{recent:0,recentBytes:0},'eviction returns the recent charge');
  h.store.destroy();assert.equal(h.closed,1);
 });});

test('a decoder that ignores the requested dimensions closes the wrong-size bitmap and retains no pixels',async()=>{
 const h=harness(async()=>fixture(),256);
 try{
  h.runtime.setEnabled(true);assert.equal(h.runtime.stats.uploadWidth,128);
  assert.equal(await h.runtime.load(),false);assert.match(h.runtime.stats.error,/texture resize unavailable/);
  assert.equal(h.decodes,1);assert.equal(h.closed,1);assert.equal(h.runtime.stats.loads,0);assert.equal(h.runtime.stats.cityCacheEntries,0);
  assert.equal(h.store.budget.stats.recentBytes,0);await collected(h.refs.at(-1));
 }finally{h.runtime.destroy();h.store.destroy();}
});

test('failed texture releases controller and preserves bounded retry/fallback behavior',async()=>{let reads=0;const h=harness(async()=>{reads++;throw Error('fixture network failure');});h.runtime.setEnabled(true);assert.equal(await h.runtime.load(),false);assert.match(h.runtime.stats.error,/fixture network failure/);await collected(h.refs.at(-1));assert.equal(h.runtime.retry(),true);assert.equal(await h.runtime.load(),false);assert.equal(reads,2);assert.equal(h.runtime.retry(),false);await collected(h.refs.at(-1));h.runtime.setEnabled(false);assert.equal(h.aborts,0);h.runtime.destroy();});

test('active cancellation remains AbortError; cancelled controller collects after pending read settles',async()=>{const d=deferred();let signal;const h=harness((_a,s)=>{signal=s;return d.promise;});h.runtime.setEnabled(true);const pending=h.runtime.load(),ref=h.refs.at(-1);h.runtime.setPageHidden(true);assert.equal(h.aborts,1);assert.equal(signal.aborted,true);assert.equal(signal.reason.name,'AbortError');signal=undefined;d.resolve(fixture());assert.equal(await pending,false);assert.equal(h.runtime.stats.loading,false);await collected(ref);h.runtime.destroy();assert.equal(h.aborts,1);});

test('late finalization of cancelled load cannot clear the replacement load controller',async()=>{const first=deferred(),second=deferred();let reads=0;const h=harness(()=>++reads===1?first.promise:second.promise);h.runtime.setEnabled(true);const a=h.runtime.load();h.runtime.setPageHidden(true);h.runtime.setPageHidden(false);const b=h.runtime.load();first.resolve(fixture());assert.equal(await a,false);assert.equal(h.runtime.stats.loading,true);h.runtime.setEnabled(false);assert.equal(h.aborts,2,'replacement remains cancellable after old finally');second.resolve(fixture());assert.equal(await b,false);assert.equal(h.runtime.stats.loads,0);h.runtime.destroy();});

test('all active-provider runtimes re-export the one shared lifetime fix',()=>{
 // Every provider entry now re-exports the shared runtime; the former
 // byte-identical copies are gone. Evaluate each entry and require the very
 // same exported bindings as the shared module the lifetime tests exercise.
 const h=harness(async()=>fixture()),shared=h.loader.load(entry),keys=Object.keys(shared).sort();assert.ok(keys.includes('createOpenFacadeWindowTexture'));
 for(const provider of ['root500','delegated500','tier300','church','city','infill','bremen']){
  const providerFile=path.join(sourceRoot,`web/src/painted/${provider}/safety/open-facade-window-texture.ts`);
  assert.deepEqual(codeStatements(fs.readFileSync(providerFile,'utf8')),["export * from '../../../safety/open-facade-window-texture';"],provider);
  const exported=h.loader.load(providerFile);assert.deepEqual(Object.keys(exported).sort(),keys,provider);
  for(const key of keys)assert.equal(exported[key],shared[key],`${provider}:${key}`);
 }
 assert.match(text,/createSourceMaterialTexture\(/,'the shared entry delegates to the source-material runtime exercised above');h.runtime.destroy();
});
