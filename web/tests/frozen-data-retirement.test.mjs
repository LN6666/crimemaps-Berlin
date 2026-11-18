import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({entryPoints:[new URL('../src/safety/frozen-data-scope.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {createFrozenDataScope}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const ref=letter=>({canonicalSHA256:letter.repeat(64),file:'painted/test/'+letter+'.ts',occurrence:0,codec:'json'});
const signal=()=>new AbortController().signal;
function grant(value,onRelease){
 let active=true;
 return{borrow(read){assert(active,'retired grants cannot be borrowed');return read(value);},release(){assert(active,'each acquired grant releases exactly once');active=false;onRelease();}};
}

test('construction retirement preserves material grants and pins while invalidating only named memos',async()=>{
 const construction=ref('a'),material=ref('b'),values=new Map([[construction.file,{positions:[1,2,3]}],[material.file,{source:'original material'}]]),released=[];
 const scope=createFrozenDataScope({async acquire(reference){return grant(values.get(reference.file),()=>released.push(reference.file));}}),unpin=scope.retain(),constructionMemo={},materialMemo={};
 try{
  await scope.prepare([construction,material],signal());
  const original=scope.memo(constructionMemo,()=>scope.borrow(construction,value=>({positions:value.positions}))),paint=scope.memo(materialMemo,()=>scope.borrow(material,value=>value));
  scope.retirePrepared([construction,{...construction}],[constructionMemo]);
  assert.deepEqual(scope.stats,{resources:1,pending:0,pins:1,ownerReleased:false,disposed:false});
  assert.deepEqual(released,[construction.file]);assert.throws(()=>scope.borrow(construction,value=>value),/not prepared/);
  assert.equal(scope.borrow(material,value=>value),paint);assert.equal(scope.memo(materialMemo,()=>assert.fail('unrelated material memo rebuilt')),paint);
  const replacement=scope.memo(constructionMemo,()=>({positions:[4,5,6]}));assert.notEqual(replacement,original);assert.equal(scope.memo(constructionMemo,()=>assert.fail('replacement memo rebuilt')),replacement);
  scope.retirePrepared([construction],[constructionMemo]);assert.deepEqual(released,[construction.file]);assert.equal(scope.borrow(material,value=>value.source),'original material');
 }finally{scope.release();unpin();}
 assert.deepEqual(released,[construction.file,material.file]);assert.equal(scope.stats.disposed,true);
});

test('retirement rejects a pending reference before releasing any ready grant or deleting a memo',async()=>{
 const construction=ref('a'),material=ref('b'),pendingRef=ref('c'),released=[],memoKey={};let finish,started;
 const began=new Promise(resolve=>started=resolve),scope=createFrozenDataScope({acquire(reference){
  const value={file:reference.file};
  if(reference.file===pendingRef.file){started();return new Promise(resolve=>finish=()=>{finish=undefined;resolve(grant(value,()=>released.push(reference.file)));});}
  return Promise.resolve(grant(value,()=>released.push(reference.file)));
 }});let preparing;
 try{
  await scope.prepare([construction,material],signal());const memo=scope.memo(memoKey,()=>scope.borrow(construction,value=>value));
  preparing=scope.prepare([pendingRef],signal());preparing.catch(()=>{});await began;
  assert.throws(()=>scope.retirePrepared([construction,pendingRef],[memoKey]),/Cannot retire pending/);
  assert.equal(scope.stats.resources,2);assert.equal(scope.stats.pending,1);assert.deepEqual(released,[]);
  assert.equal(scope.memo(memoKey,()=>assert.fail('atomic refusal deleted the memo')),memo);assert.equal(scope.borrow(construction,value=>value),memo);assert.equal(scope.borrow(material,value=>value.file),material.file);
  finish();await preparing;scope.retirePrepared([construction,pendingRef],[memoKey]);
  assert.deepEqual(released,[construction.file,pendingRef.file]);assert.equal(scope.stats.resources,1);assert.equal(scope.stats.pending,0);assert.equal(scope.borrow(material,value=>value.file),material.file);
 }finally{scope.release();finish?.();await preparing?.catch(()=>{});}
 assert.deepEqual(released,[construction.file,pendingRef.file,material.file]);
});

test('retired selected resources reprepare their original declared demand without widening or narrowing it',async()=>{
 const selected=ref('a'),calls=[],released=[],scope=createFrozenDataScope({async acquire(reference,_signal,keys){calls.push([...keys]);return grant({keys:[...keys]},()=>released.push(reference.file));}}),declared=['bremen|object-a','bremen|object-b'];
 try{
  await scope.prepareSelection(selected,[...declared,declared[0]],signal());scope.retirePrepared([selected],[]);
  await scope.prepare([selected],signal());assert.deepEqual(calls,[declared,declared]);assert.deepEqual(scope.borrow(selected,value=>value.keys),declared);scope.assertSelection(selected,declared);
  await assert.rejects(scope.prepareSelection(selected,['bremen|object-c'],signal()),/cannot widen/);assert.equal(calls.length,2);
  scope.retirePrepared([selected],[]);await scope.prepareSelection(selected,[declared[0]],signal());
  assert.deepEqual(calls,[declared,declared,declared]);assert.deepEqual(scope.borrow(selected,value=>value.keys),declared);scope.assertSelection(selected,[declared[1]]);
 }finally{scope.release();}
 assert.deepEqual(released,[selected.file,selected.file,selected.file]);
});

test('a producer-released pinned scope can retire and prepare again until its last pin aborts pending acquisition',async()=>{
 const construction=ref('a'),material=ref('b'),pendingRef=ref('c'),released=[];let started,readSignal;
 const began=new Promise(resolve=>started=resolve),scope=createFrozenDataScope({acquire(reference,controllerSignal){
  if(reference.file===pendingRef.file){readSignal=controllerSignal;started();return new Promise((_resolve,reject)=>controllerSignal.addEventListener('abort',()=>reject(controllerSignal.reason),{once:true}));}
  return Promise.resolve(grant({file:reference.file},()=>released.push(reference.file)));
 }}),unpin=scope.retain();
 try{
  await scope.prepare([construction],signal());scope.release();scope.retirePrepared([construction],[]);await scope.prepare([material],signal());
  assert.deepEqual(scope.stats,{resources:1,pending:0,pins:1,ownerReleased:true,disposed:false});assert.equal(scope.borrow(material,value=>value.file),material.file);
  const preparing=scope.prepare([pendingRef],signal()),rejected=assert.rejects(preparing,{name:'AbortError'});await began;assert.equal(readSignal.aborted,false);
  unpin();await rejected;assert.equal(readSignal.aborted,true);assert.deepEqual(scope.stats,{resources:0,pending:0,pins:0,ownerReleased:true,disposed:true});
  assert.throws(()=>scope.borrow(material,value=>value),{name:'AbortError'});await assert.rejects(scope.prepare([construction],signal()),{name:'AbortError'});
 }finally{scope.release();unpin();}
 assert.deepEqual(released,[construction.file,material.file]);
});

test('construction retirement waits only for the named final consumer while material remains prepared',async()=>{
 const construction=ref('a'),material=ref('b'),released=[],memoKey={},scope=createFrozenDataScope({async acquire(reference){return grant({file:reference.file,positions:[1,2,3]},()=>released.push(reference.file));}}),materialPin=scope.retain();
 await scope.prepare([construction,material],signal());const original=scope.memo(memoKey,()=>scope.borrow(construction,value=>value.positions)),first=scope.retainPrepared([construction],[memoKey]),last=scope.retainPrepared([construction],[memoKey]);
 scope.retirePrepared([construction],[memoKey]);first();first();assert.deepEqual(released,[]);assert.equal(scope.memo(memoKey,()=>assert.fail('retained construction memo rebuilt')),original);
 last();assert.deepEqual(released,[construction.file]);assert.throws(()=>scope.borrow(construction,value=>value),/not prepared/);assert.equal(scope.borrow(material,value=>value.file),material.file);
 scope.release();assert.equal(scope.stats.disposed,false,'unrelated material pin remains valid');materialPin();assert.deepEqual(released,[construction.file,material.file]);
});

test('reentrant retirement and owner release cannot clear a synchronous construction borrow',async()=>{
 const construction=ref('a'),released=[],scope=createFrozenDataScope({async acquire(reference){return grant({positions:[1,2,3]},()=>released.push(reference.file));}});
 await scope.prepare([construction],signal());scope.borrow(construction,value=>{scope.retirePrepared([construction],[]);scope.release();assert.deepEqual(released,[]);assert.equal(scope.stats.disposed,false);assert.deepEqual(value.positions,[1,2,3]);});
 assert.deepEqual(released,[construction.file]);assert.equal(scope.stats.disposed,true);
});
