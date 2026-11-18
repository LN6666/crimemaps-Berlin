import test from 'node:test';
import assert from 'node:assert/strict';
import {enumerateBuildingDetailLeaves, buildingDetailLeafSelection, buildingDetailLeafDisposition, missingBuildingDetailLeafSelection} from './building-detail-city.mjs';

const descriptor = (name, extra={}) => ({path:'/safety/buildings3d/'+name+'.json',sha256:name.padEnd(64,'0'),bytes:100,...extra});
const leaf = name => ({...descriptor(name),id:name,vertices:3});
async function collect(iterator) {const rows=[];for await(const row of iterator)rows.push(row);return rows;}

test('city discovery visits bounded partition metadata serially and never reads model payloads',async()=>{
 const root=descriptor('a'),left=descriptor('b'),right=descriptor('c'),calls=[];
 const values=new Map([[root.path,{schema_version:1,city:'berlin',index_type:'partitioned-city3d-v1',partitions:[left,right]}],
  [left.path,{schema_version:1,city:'berlin',shards:[leaf('d')]}],[right.path,{schema_version:1,city:'berlin',shards:[leaf('e')]}]]);
 const rows=await collect(enumerateBuildingDetailLeaves({async json(d){calls.push(d.path);assert.ok(values.has(d.path),'model payload was requested');return values.get(d.path);}},root,'berlin'));
 assert.deepEqual(calls,[root.path,left.path,right.path]);
 assert.deepEqual(rows.map(r=>r.leaf.id),['d','e']);assert.deepEqual(rows[0].indexChain,[left]);assert.deepEqual(rows[1].indexChain,[right]);
});

test('city discovery rejects cyclic partitions and preserves original identity',async()=>{
 const root=descriptor('a'),before=structuredClone(root);
 await assert.rejects(collect(enumerateBuildingDetailLeaves({async json(){return {schema_version:1,city:'berlin',index_type:'partitioned-city3d-v1',partitions:[root]};}},root,'berlin')),/Cyclic/);
 assert.deepEqual(root,before);
});

test('city discovery rejects wrong-city pages and duplicate leaf identities',async()=>{
 const root=descriptor('a');
 await assert.rejects(collect(enumerateBuildingDetailLeaves({async json(){return {schema_version:1,city:'bremen',shards:[leaf('b')]};}},root,'berlin')),/city\/schema/);
 await assert.rejects(collect(enumerateBuildingDetailLeaves({async json(){return {schema_version:1,city:'berlin',shards:[leaf('b'),leaf('b')]};}},root,'berlin')),/duplicate canonical leaf/);
});

test('bounded leaf selection is explicit per planned city and rejects ambiguous or foreign selections',()=>{
 assert.equal(buildingDetailLeafSelection(undefined,['berlin']),undefined,'no selection keeps the original serial order');
 const selection=buildingDetailLeafSelection({berlin:['roof-02100','roof-02107']},['berlin','bremen']);
 assert.deepEqual([...selection.get('berlin')],['roof-02100','roof-02107']);
 assert.equal(selection.has('bremen'),false,'an unnamed planned city selects no leaf');
 for(const bad of [{},[],{hamburg:['a']},{berlin:[]},{berlin:['a','a']},{berlin:[1]},{berlin:['']},{berlin:'a'}])
  assert.throws(()=>buildingDetailLeafSelection(bad,['berlin','bremen']),/Leaf selection|Invalid leaf selection/);
});

test('a selected batch decides each leaf in a fixed order: failed re-validation, same-binding receipt, selection, budget',()=>{
 const complete={status:'complete'},failedReceipt={status:'failed'},decide=extra=>buildingDetailLeafDisposition({budgetExhausted:false,...extra});
 assert.equal(decide({previous:complete,revalidationFailed:true,selected:true}),'failed-revalidation','a selected leaf whose receipt no longer verifies is a recorded failure, never a missing selection');
 assert.equal(decide({previous:complete,selected:false}),'reuse','a leaf completed under this exact binding stays in the cumulative city manifest even when unselected');
 assert.equal(decide({previous:failedReceipt,selected:false}),'failed');assert.equal(decide({previous:failedReceipt,selected:false,retryFailed:true}),'not-selected');
 assert.equal(decide({selected:false,budgetExhausted:true}),'not-selected','an unselected leaf is never produced, whatever the budget');
 assert.equal(decide({selected:true,budgetExhausted:true}),'pending');assert.equal(decide({selected:true}),'produce');
 assert.equal(decide({selected:undefined}),'produce','without a selection every leaf is eligible in serial order');
 assert.equal(decide({previous:failedReceipt,selected:true,retryFailed:true}),'produce');
});

test('a selection is checked against the pinned index metadata before production and reports every missing id',async()=>{
 const root=descriptor('a'),left=descriptor('b'),calls=[];
 const values=new Map([[root.path,{schema_version:1,city:'berlin',index_type:'partitioned-city3d-v1',partitions:[left]}],[left.path,{schema_version:1,city:'berlin',shards:[leaf('d'),leaf('e')]}]]);
 const mount={async json(d){calls.push(d.path);assert.ok(values.has(d.path),'model payload was requested');return values.get(d.path);}};
 assert.deepEqual(await missingBuildingDetailLeafSelection(mount,root,'berlin',new Set(['e','d'])),[]);
 assert.deepEqual(await missingBuildingDetailLeafSelection(mount,root,'berlin',new Set(['z','d','y'])),['y','z']);
 assert.deepEqual(calls,[root.path,left.path,root.path,left.path],'only index pages are read');
});

test('city discovery preserves the existing one-MiB metadata bound before expansion',async()=>{
 let reads=0;
 await assert.rejects(collect(enumerateBuildingDetailLeaves({async json(){reads++;}},descriptor('a',{uncompressed_bytes:1024**2+1}),'berlin')),/metadata\/depth/);
 assert.equal(reads,0);
});
