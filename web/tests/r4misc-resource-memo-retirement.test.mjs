import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Review R4S2-3: a scope.resourceMemo value graph is excluded from every scope
// memo's construction costs (p0-audit R1), so it is paid only by its store lease.
// Retiring that lease while a scope memo can still reach the graph would leave
// those objects live and uncharged; retirePrepared must refuse it before changing
// any ownership. Retiring the referencing memo first, or both together while the
// memo has no consumers, remains valid.
const web=fileURLToPath(new URL('../',import.meta.url));
const api=await(async()=>{
 const result=await build({stdin:{contents:`export {getRoot500Data,F154_SOURCE_RESOURCE_MEMO_KEY} from './src/painted/root500/safety/owner-f154-reconstruction';export {createFrozenDataScope} from './src/safety/frozen-data-scope';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';export {createChunkResourceStore} from './src/safety/render-runtime/chunk-resource-store';`,resolveDir:web,loader:'ts'},absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
})();

function page(){
 const budget=api.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),store=api.createChunkResourceStore({budget});
 const scope=api.createFrozenDataScope({resources:store,async acquire(){throw Error('No frozen acquisition in this fixture');},dispose(){}});
 return{budget,scope};
}
const shared=(scope,key,contentKey='r4misc-retire')=>scope.resourceMemo(key,{contentKey,estimate:[{category:'decoded',bytes:1024,precision:'estimate',label:'fixture'}],produce:()=>({arrays:[[1,2,3],[4,5,6]],nested:{positions:new Float32Array(6)}}),costs:value=>[{category:'decoded',bytes:256,precision:'estimate',identity:value}]});
const ready=(scope,key)=>{const lease=scope.retainMemoResource(key,'resident');lease.release();return true;};
const retired=(scope,key)=>{assert.throws(()=>scope.retainMemoResource(key,'resident'),/unprepared frozen resource memo/);return true;};

test('a resource memo still reachable from a live scope memo cannot retire, and nothing changes',()=>{
 const f=page(),resourceKey={},outerKey={};
 const outer=f.scope.memo(outerKey,()=>{const value=shared(f.scope,resourceKey);return{arrays:value.arrays};});
 const bytes=f.budget.stats.bytes;
 assert.throws(()=>f.scope.retirePrepared([],[resourceKey]),/scope memo still references its value/);
 assert.equal(f.budget.stats.bytes,bytes,'no charge was returned');assert(ready(f.scope,resourceKey));
 assert.equal(f.scope.memo(outerKey,()=>assert.fail('the memo is still cached')),outer);
 // A typed array view of a shared buffer is a reference to the graph as well.
 const viewKey={},otherResource={};
 f.scope.memo(viewKey,()=>{const value=shared(f.scope,otherResource,'r4misc-retire-view');return{view:new Uint8Array(value.nested.positions.buffer)};});
 assert.throws(()=>f.scope.retirePrepared([],[otherResource]),/scope memo still references its value/);assert(ready(f.scope,otherResource));
 f.scope.release();assert.equal(f.budget.stats.bytes,0);
});

test('retiring the referencing memo first, or both together without consumers, releases both',()=>{
 const f=page(),resourceKey={},outerKey={};
 f.scope.memo(outerKey,()=>({arrays:shared(f.scope,resourceKey).arrays}));
 const pin=f.scope.retainPrepared([],[outerKey]);
 // A consumer keeps the memo alive past this retirement: refused.
 assert.throws(()=>f.scope.retirePrepared([],[outerKey,resourceKey]),/scope memo still references its value/);assert(ready(f.scope,resourceKey));
 pin();f.scope.retirePrepared([],[outerKey,resourceKey]);assert(retired(f.scope,resourceKey));
 const g=page(),firstKey={},secondKey={};
 g.scope.memo(firstKey,()=>({arrays:shared(g.scope,secondKey).arrays}));
 g.scope.retirePrepared([],[firstKey]);assert(ready(g.scope,secondKey));
 g.scope.retirePrepared([],[secondKey]);assert(retired(g.scope,secondKey));
 for(const p of [f,g]){p.scope.release();assert.equal(p.budget.stats.bytes,0);}
});

test('an unrelated live memo does not block a resource memo retirement',()=>{
 const f=page(),resourceKey={},otherKey={};
 shared(f.scope,resourceKey);f.scope.memo(otherKey,()=>({own:[1,2,3]}));
 const before=f.budget.stats.bytes;f.scope.retirePrepared([],[resourceKey]);
 assert(retired(f.scope,resourceKey));assert(f.budget.stats.bytes<before,'the store lease charge was returned');
 f.scope.release();assert.equal(f.budget.stats.bytes,0);
});

test('F154: the source resource memo cannot retire while getRoot500Data still holds its recovered value',()=>{
 const f=page(),data=api.getRoot500Data(f.scope);assert(data.recovered.batches.length>0);
 assert.throws(()=>f.scope.retirePrepared([],[api.F154_SOURCE_RESOURCE_MEMO_KEY]),/scope memo still references its value/);
 assert(ready(f.scope,api.F154_SOURCE_RESOURCE_MEMO_KEY));
 f.scope.release();assert.equal(f.budget.stats.bytes,0);
});
