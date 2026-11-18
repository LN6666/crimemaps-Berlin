import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export {acquirePackedMeshChunk} from '../painted/root500/safety/chunk-mesh-packing';export {acquireChunkMeshState} from '../painted/root500/safety/chunk-mesh-residency';export {acquirePackedChunk,packChunkGeometry} from '../painted/delegated500/safety/renderer-packed-chunks';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {acquirePackedMeshChunk,acquireChunkMeshState,acquirePackedChunk,packChunkGeometry,createChunkResourceStore,createResourceBudget,ResourceBudgetExceededError}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024;
const wait=(ms=5)=>new Promise(resolve=>setTimeout(resolve,ms));
// The shared cooperative scheduler only needs a context identity and loss state.
const context=()=>({isContextLost:()=>false});
function component(id,vertices){
 const positions=Array.from({length:vertices*3},(_,i)=>i%7),indices=Array.from({length:(vertices-2)*3},(_,i)=>i%vertices);
 return{objectId:'o'+id,partId:'p',origin:[13.4,52.5],batches:[{positions,normals:positions.map(()=>0),indices,color:[.5,.5,.5],faceRole:'wall'}],sourceFeature:{properties:{}}};
}
function setup(limitBytes=64*MiB){
 const budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=createChunkResourceStore({budget});
 const components=[component(1,40),component(2,24)],sourceBytes=4096;
 const source=store.acquire({contentKey:'transient-source',role:'source',estimate:{category:'decoded',bytes:sourceBytes,precision:'exact'},produce:()=>({components})});
 const group={contentKey:'group-1',components,parents:[source],frame:{origin:[13.4,52.5],unit:1e7,authority:'test-frame'},cohortKeys:[],materialAuthority:'m',recipeAuthority:'r',selectedLOD:'near'};
 const counters={materials:0,retains:0,releases:0,auxiliary:0};
 const vertices=components.reduce((n,c)=>n+c.batches[0].positions.length/3,0),indices=components.reduce((n,c)=>n+c.batches[0].indices.length,0);
 const options={group,components,provider:'root500:transient',batchIncluded:()=>true,
  materials(rows){counters.materials++;const n=rows.reduce((v,c)=>v+c.batches[0].positions.length/3,0);return{paint:new Float32Array(n*5),progressive:new Float32Array(n*4),auxiliary:{tag:'aux'},release(){counters.auxiliary++;}};},
  styles:()=>({wall:1,roof:2,landmark:false,sourceGlassRoof:false}),runs:(local)=>[{key:'base',firstIndex:0,indexCount:local.length}],sourceCurrent(){},
  retainSource(){counters.retains++;return()=>{counters.releases++;};}};
 return{budget,store,source,group,components,options,counters,vertices,indices,sourceBytes};
}
const packed=budget=>({...(budget.stats.categories.packed??{bytes:0,exactBytes:0,estimatedBytes:0})});

test('root500 packing admits all packed arrays before materials or packing run, then settles to exact buffer identities',async()=>{
 const f=setup(),gl=context(),expected=f.vertices*(9+5+4+1)*4+f.indices*4;
 const lease=acquirePackedMeshChunk(f.store,gl,f.options,undefined,()=>{});
 assert.equal(f.counters.materials,0,'construction is scheduled after admission');
 assert.deepEqual(packed(f.budget),{bytes:expected,exactBytes:expected,estimatedBytes:0});
 assert.equal(f.counters.retains,1);
 await lease.ready;const value=lease.value;
 assert.equal(f.counters.materials,1);assert.equal(f.counters.releases,1,'the construction source scope exits once production completes');
 const actual=[value.vertices,value.indices,value.paint,value.progressive,value.baseState].reduce((n,a)=>n+a.buffer.byteLength,0);
 assert.equal(actual,expected);assert.deepEqual(packed(f.budget),{bytes:actual,exactBytes:actual,estimatedBytes:0});
 assert.equal(Object.hasOwn(value,'geometry'),false,'construction geometry overrides are not stored in the payload');
 // One owner-specific dynamic copy is admitted before slicing baseState.
 const state=acquireChunkMeshState(f.store,gl,'owner',lease,undefined,()=>{});
 assert.equal(packed(f.budget).bytes,actual+value.baseState.byteLength);
 await state.ready;assert.notEqual(state.value.buffer,value.baseState.buffer);assert.equal(packed(f.budget).bytes,actual+value.baseState.byteLength);
 state.release();lease.release();f.store.evictRecent();
 assert.equal(f.counters.auxiliary,1,'sidecars retire with the packed payload');assert.equal(packed(f.budget).bytes,0);
 assert.equal(f.budget.stats.bytes,f.sourceBytes,'the source parent no longer carries packed dependency roles');
 f.source.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
});

test('cancelling before scheduled packing returns the whole reservation and never materializes arrays',async()=>{
 const f=setup(),controller=new AbortController();
 const lease=acquirePackedMeshChunk(f.store,context(),f.options,controller.signal,()=>{});
 assert(packed(f.budget).bytes>0);controller.abort();await wait();
 await assert.rejects(lease.ready,error=>error?.name==='AbortError');
 assert.equal(f.counters.materials,0);assert.equal(f.counters.releases,f.counters.retains);
 assert.equal(packed(f.budget).bytes,0);assert.equal(f.budget.stats.bytes,f.sourceBytes);
 f.source.release();
});

test('a group whose packed arrays alone exceed the page ledger is rejected before production and releases its source scope',()=>{
 const f=setup(8*1024);
 assert.throws(()=>acquirePackedMeshChunk(f.store,context(),f.options,undefined,()=>{}),error=>error instanceof ResourceBudgetExceededError&&error.capacity===8*1024);
 assert.equal(f.counters.materials,0);assert.equal(f.counters.retains,1);assert.equal(f.counters.releases,1);
 assert.equal(packed(f.budget).bytes,0);
 f.source.release();
});

test('delegated500 packing reserves an upper bound first, then charges exact arrays including pick bounds and drops its production scope',async()=>{
 const f=setup(),vertices=f.vertices,indices=f.indices;let retained=0,released=0;
 const estimate=vertices*76+indices*4+64*48;
 const lease=acquirePackedChunk(f.store,'delegated-transient',estimate,()=>{
  assert.equal(packed(f.budget).bytes,estimate,'the upper bound is admitted before any packed array exists');
  return packChunkGeometry(f.components,f.group.frame,new Float32Array(vertices*5),new Float32Array(vertices*4),{merc:p=>[(p[0]+180)/360,.3],unit:()=>1e7,included:()=>true,style:()=>1,progressivePainted:()=>false,landmark:()=>false,indexedPick:true});
 },undefined,undefined,()=>{retained++;return()=>{released++;};},f.components.length,[f.source]);
 await lease.ready;const value=lease.value;
 assert.equal(retained,1);assert.equal(released,1);
 const exact=[value.vertices,value.indices,value.paint,value.progressive,value.initialState,value.indexedPick.bounds].reduce((n,a)=>n+a.byteLength,0);
 assert(exact<=estimate);assert.deepEqual(packed(f.budget),{bytes:exact,exactBytes:exact,estimatedBytes:0});
 lease.release();f.store.evictRecent();assert.equal(packed(f.budget).bytes,0);
 f.source.release();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
});
