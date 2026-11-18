import {resourceContentKey,resourceContentKeys,decodeResourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {constants} from 'node:buffer';
import ts from 'typescript';

const read=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const module={exports:{}};
Function('exports','require',ts.transpileModule(read('safety/renderer-chunk-input.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(module.exports,id=>{assert.equal(id,'./resource-content-key');return resourceContentKeys;});
const {indexedResourceKey}=module.exports;

test('indexed resource references retain exact authorities, row order, boundaries and missing rows',()=>{
 const a='source|with:separators\\"',b=a+'changed',rows=[[a,[0,3]],[b,[3,9]],undefined,[a,[9,12]]];
 const encoded=indexedResourceKey('shadow',rows,row=>row),[format,namespace,authorities,references]=decodeResourceContentKey(encoded);
 assert.equal(format,'indexed-resource-v2');assert.equal(namespace,'shadow');assert.deepEqual(authorities,[a,b]);
 assert.deepEqual(references.map(row=>row===null?undefined:[authorities[row[0]],row[1]]),rows);
 for(const changed of [[...rows].reverse(),[[a,[0,4]],...rows.slice(1)],[[b,[0,3]],...rows.slice(1)]])assert.notEqual(indexedResourceKey('shadow',changed,row=>row),encoded);
 assert.notEqual(indexedResourceKey('material',rows,row=>row),encoded);
});

function solarUpdate(provider,state){
 const source=read(`painted/${provider}/safety/building-mesh-renderer.ts`),ast=ts.createSourceFile(provider,source,ts.ScriptTarget.Latest,true);let declaration,costFactory;
 const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='updateSolarShadowIndices')declaration=node.getText(ast);if(ts.isFunctionDeclaration(node)&&node.name?.text==='solarIndexCosts')costFactory=node.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert(declaration);
 const code=ts.transpileModule('('+declaration+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const scope=new Proxy(state,{has:()=>true,get:(target,name)=>name===Symbol.unscopables?undefined:name in target?target[name]:globalThis[name],set:(target,name,value)=>(target[name]=value,true)});
 if(costFactory)state.solarIndexCosts=Function('scope','with(scope){return '+ts.transpileModule('('+costFactory+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'}')(scope);
 return Function('scope','with(scope){return '+code+'}')(scope);
}

for(const provider of ['city','tier300','bremen','root500','infill'])test(provider+' real solar preparation stores a long packed key once, preserving all index ranges',()=>{
 // This shape overflowed Array.join before any GPU program existed. The test
 // retains only one 1 MiB authority, never constructs the old >512 MiB result.
 const contentKey='verified-packed:'+ 'k'.repeat(1024*1024),rows=Array.from({length:600},(_,i)=>({objectId:'building-'+i,partId:'p',start:i*3,end:i*3+3}));
 assert(contentKey.length*rows.length>constants.MAX_STRING_LENGTH);
 const key=row=>row.objectId+'|'+row.partId,loaded=new Map(rows.map(row=>[key(row),row])),indices=Uint32Array.from({length:1800},(_,i)=>i);
 const chunk={cpu:{contentKey,value:{contentKey,indices}},loaded,shadowIndices:new Uint32Array()};let acquisitions=0,releases=0;
 const store={acquire(request){acquisitions++;return{contentKey:request.contentKey,value:request.produce(),release(){releases++;}};}};
 const state={resourceContentKey,indexedResourceKey,key,loaded,sceneChunks:[chunk],sceneSun:{shadowVector:[1,1]},sceneSunOrigin:[8,53],solarBoundary:{},generation:1,solarShadowAdmittedKeys:new Set(),solarShadowSignature:'',solarShadowAdmitted:0,solarShadowWithheld:0,solarShadowMode:'',shadowIndices:new Uint32Array(),
  sceneIndexCount:()=>indices.length,sceneShadowIndexCount:()=>chunk.shadowIndices.length,residentSolarShadowRanges:()=>rows,localComponent:row=>({chunk,row}),residentChunkInput:{store},sceneChunkInput:{store},sceneChunkDependencies:{store},packingData:undefined,residentData:{chunkInput:{store}}};
 const update=solarUpdate(provider,state);
 assert.equal(update(),true);assert.equal(acquisitions,1);assert.deepEqual(chunk.shadowIndices,indices);
 assert(state.solarShadowSignature.length<contentKey.length+rows.length*32);
 assert.equal(state.solarShadowAdmitted,600);assert.equal(update(),false);assert.equal(acquisitions,1,'unchanged ranges reuse their subset');
 rows.pop();loaded.delete('building-599|p');assert.equal(update(),true);assert.equal(acquisitions,2);assert.equal(releases,1);assert.deepEqual(chunk.shadowIndices,indices.subarray(0,1797));
});

for(const provider of ['bremen','city'])test(provider+' solar index ownership charges its own complete key before production and retires it with the subset',async()=>{
 const {runtime}=await import('./support/renderers-a-closure.mjs'),budget=runtime.createResourceBudget({limitBytes:1024*1024,recentLimitBytes:0}),store=runtime.createChunkResourceStore({budget});
 const key=row=>row.objectId+'|'+row.partId,rows=[{objectId:'osm/way/1',partId:'p',start:0,end:3}],loaded=new Map(rows.map(row=>[key(row),row])),contentKey='parent:"\\'.repeat(128),indices=new Uint32Array([0,1,2]),packed={contentKey,indices};
 const parent=store.acquire({contentKey,role:'source',estimate:{category:'packed',bytes:indices.byteLength,precision:'exact'},produce:()=>packed,costs:value=>({category:'packed',bytes:value.indices.byteLength,precision:'exact',identity:value.indices.buffer})});
 const chunk={cpu:parent,loaded,shadowIndices:new Uint32Array()},requests=[],actualAcquire=store.acquire.bind(store);let fail=false,produced=0;
 store.acquire=request=>{requests.push(request);const produce=request.produce,before=budget.stats.bytes,reserved=request.estimate.reduce((sum,cost)=>sum+cost.bytes,0);return actualAcquire({...request,produce(...args){produced++;assert.equal(budget.stats.bytes,before+reserved,'array and key are reserved before production');if(fail)throw Error('controlled subset failure');return produce(...args);}});};
 const state={resourceContentKey,indexedResourceKey,key,loaded,sceneChunks:[chunk],sceneSun:{shadowVector:[1,1]},sceneSunOrigin:[8,53],solarBoundary:{},generation:1,solarShadowAdmittedKeys:new Set(),solarShadowSignature:'',solarShadowAdmitted:0,solarShadowWithheld:0,solarShadowMode:'',shadowIndices:new Uint32Array(),sceneIndexCount:()=>indices.length,sceneShadowIndexCount:()=>chunk.shadowIndices.length,residentSolarShadowRanges:()=>rows,localComponent:row=>({chunk,row}),residentChunkInput:{store},sceneChunkDependencies:{store}};
 const update=solarUpdate(provider,state),baseline=budget.stats.bytes;assert.equal(update(),true);assert.equal(produced,1);
 const request=requests[0],metadata=request.estimate.find(cost=>cost.category==='metadata'),costs=request.costs(chunk.shadowIndices);
 assert.equal(metadata.bytes,request.contentKey.length*2);assert.equal(metadata.precision,'estimate');assert.strictEqual(costs.find(cost=>cost.category==='metadata'),metadata,'estimate and residence share one allocation identity');assert.deepEqual(decodeResourceContentKey(request.contentKey),['solar-indices-v1',contentKey,[[0,3]]]);
 assert.equal(budget.stats.bytes,baseline+metadata.bytes+indices.byteLength,'only the independent key payload and new index buffer are charged');assert.equal(update(),false);assert.equal(produced,1);
 state.sceneSun={};assert.equal(update(),true);assert.equal(budget.stats.bytes,baseline,'CPU subset and its key retire together');
 state.sceneSun={shadowVector:[1,1]};fail=true;assert.throws(update,/production is pending|controlled subset failure/);assert.equal(budget.stats.bytes,baseline,'failed production leaves neither array nor key reservation');
 parent.release();store.destroy();assert.equal(budget.stats.bytes,0);
});
