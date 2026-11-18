import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// p0-audit R1 (DECISIONS: "R1 修法修正"): the value of a scope.resourceMemo is
// paid once, by its store lease. An enclosing scope.memo that returns that value
// (F154: getRoot500Data returns {recovered, record, ...}) must not charge the
// value's batches/arrays again under their construction identities. The record
// duplication between the source-data memo and the resourceMemo metadata is the
// registered bounded exception and is only measured here.
const web=fileURLToPath(new URL('../',import.meta.url));
const api=await(async()=>{
 const result=await build({stdin:{contents:`export {getRoot500Data,F154_SOURCE_RESOURCE_MEMO_KEY} from './src/painted/root500/safety/owner-f154-reconstruction';export {createFrozenDataScope} from './src/safety/frozen-data-scope';export {createResourceBudget} from './src/safety/render-runtime/resource-budget';export {createChunkResourceStore} from './src/safety/render-runtime/chunk-resource-store';`,resolveDir:web,loader:'ts'},absWorkingDir:web,bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',logLevel:'silent',plugins:[{name:'no-frozen-tables',setup(builder){builder.onResolve({filter:/frozen-paint-tables/},()=>{throw Error('F154 inline source data must not reach frozen tables');});}}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
})();

// A real page ledger and store; every reservation's adjusted costs are recorded.
function page(){
 const budget=api.createResourceBudget({limitBytes:64*1024**2,recentLimitBytes:0}),store=api.createChunkResourceStore({budget}),reservations=[];
 const reserve=budget.reserve.bind(budget);
 budget.reserve=(request,...rest)=>{const reservation=reserve(request,...rest),record={label:request?.label,adjusts:[]};reservations.push(record);const adjust=reservation.adjust.bind(reservation);reservation.adjust=(costs,...more)=>{record.adjusts.push(costs);return adjust(costs,...more);};return reservation;};
 const scope=api.createFrozenDataScope({resources:store,async acquire(){throw Error('No frozen acquisition in this fixture');},dispose(){}});
 return{budget,store,scope,reservations,memoCosts:()=>reservations.filter(row=>row.label==='frozen scope memo construction').map(row=>row.adjusts.at(-1)??[])};
}
const graph=value=>{const seen=new Set();(function visit(item){if(!item||typeof item!=='object'||seen.has(item))return;seen.add(item);if(ArrayBuffer.isView(item))return;for(const child of Object.values(item))visit(child);})(value);return seen;};
const sum=costs=>costs.reduce((bytes,cost)=>bytes+cost.bytes,0);

test('an enclosing memo charges none of a resourceMemo value graph, only its own private objects',()=>{
 const f=page(),memoKey={},resourceKey={};let shared;
 const value=f.scope.memo(memoKey,()=>{
  shared=f.scope.resourceMemo(resourceKey,{contentKey:'r4misc-shared',estimate:[{category:'decoded',bytes:1024,precision:'estimate',label:'fixture'}],produce:()=>({arrays:[[1,2,3],[4,5,6]],nested:{positions:new Float32Array(6)}}),costs:value=>[{category:'decoded',bytes:256,precision:'estimate',identity:value}]});
  return{shared,arrays:shared.arrays,own:[7,8,9]};
 });
 const [costs]=f.memoCosts(),sharedGraph=graph(shared);
 assert.equal(costs.filter(cost=>sharedGraph.has(cost.identity)||cost.identity===shared.nested.positions.buffer).length,0,'no shared identity is charged by the memo');
 assert(costs.some(cost=>cost.identity===value.own),'the memo still charges its own private array');
 assert(costs.some(cost=>cost.identity===value),'and its own wrapper');
 f.scope.release();assert.equal(f.budget.stats.bytes,0);
});

test('F154: the outer memo charges no recovered batch identity; the ledger saving is measured',()=>{
 const f=page(),before=f.budget.stats.bytes,data=api.getRoot500Data(f.scope),after=f.budget.stats.bytes;
 const recovered=data.recovered,batchGraph=graph(recovered.batches);
 assert(batchGraph.size>recovered.batches.length,'the recovered batches hold arrays');
 const memos=f.memoCosts();assert.equal(memos.length,2,'the outer F154 memo and the source-data memo');
 for(const costs of memos)assert.equal(costs.filter(cost=>batchGraph.has(cost.identity)||cost.identity===recovered).length,0,'no recovered identity is charged by a memo');
 const outer=memos.find(costs=>costs.some(cost=>cost.identity===data));assert(outer,'the outer memo wrapper is charged');
 assert(sum(outer)<1024,'the outer memo charges only its wrapper: '+sum(outer));
 // The resourceMemo costs exactly: decoded arrays under identity=recovered.
 const decoded=recovered.batches.reduce((bytes,batch)=>bytes+(batch.positions.length+batch.normals.length+batch.indices.length+batch.color.length)*8,0);
 const categories=f.budget.stats.categories;assert.equal(categories.decoded.bytes,decoded);
 // Ledger total = store lease (decoded + metadata) + source-data memo (record, the
 // bounded exception) + outer wrapper. Before the fix the outer memo also charged
 // about 33 KB of batch arrays (84,942 B in total; see the S2-src-misc report).
 const sourceData=memos.find(costs=>costs!==outer);
 assert(after-before<=decoded+categories.metadata.bytes+sum(sourceData)+sum(outer),'no further charge: '+(after-before));
 assert(after-before<50*1024,'F154 ledger after the fix: '+(after-before));
 f.scope.release();assert.equal(f.budget.stats.bytes,0,'every F154 charge is returned with the scope');
});
