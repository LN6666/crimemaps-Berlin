import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Real F257 accessors, lease store and page budget. Tiny verified tables reproduce
// the production SOURCE-only phase without loading city geometry or a browser.
const web=fileURLToPath(new URL('../',import.meta.url));
const built=await build({stdin:{contents:`
 export * as f257 from './src/painted/root500/safety/owner-f257-reconstruction';
 export {createFrozenDataScope} from './src/safety/frozen-data-scope';
 export {createFrozenDataLeaseStore} from './src/safety/frozen-data-lease-store';
 export {createChunkResourceStore} from './src/safety/render-runtime/chunk-resource-store';
 export {createResourceBudget} from './src/safety/render-runtime/resource-budget';
`,resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const signal=()=>new AbortController().signal;
const page=()=>{const budget=api.createResourceBudget({limitBytes:2**20,recentLimitBytes:0});return{budget,resources:api.createChunkResourceStore({budget})};};

test('F257 budget accounting preserves SOURCE-only preparation and defers DISPLAY until explicitly prepared',async()=>{
 const {budget,resources}=page(),refs=api.f257.root500DataRefs,reads=[];
 const values=[{carrier:{positions:[0,1,2]}},{carrier:[{positions:[3,4,5],normals:[0,1,0],indices:[0],color:[.1,.2,.3]}]}];
 const tables=values.map(value=>{const raw=Buffer.from(JSON.stringify(value)),sha256=createHash('sha256').update(raw).digest('hex');return{raw,descriptor:{path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:raw.length}};});
 const store=api.createFrozenDataLeaseStore(tables.map(table=>table.descriptor),{resourceStore:resources});
 const client=store.client({city:'bremen',provider:'root500',profileSHA256:null,
  selection:{tables:tables.map(table=>table.descriptor.sha256),initializers:Object.fromEntries(tables.map((table,index)=>[table.descriptor.sha256,{[refs[index].file]:1}]))},
  resolve:sha=>tables[refs.findIndex(ref=>ref.canonicalSHA256===sha)]?.descriptor.sha256,
  async read(path,request,max){request.throwIfAborted();const index=tables.findIndex(table=>table.descriptor.path===path);assert(index>=0);assert.equal(max,tables[index].raw.length);reads.push(index);return tables[index].raw;},
 }),scope=api.createFrozenDataScope(client);
 try{
  await scope.prepare([refs[0]],signal());assert.deepEqual(reads,[0]);
  // Before the fix this exact call reached Object.values -> get DISPLAY ->
  // borrow and threw "Frozen data resource was not prepared for this scope".
  const data=api.f257.getRoot500Data(scope);
  assert((budget.stats.categories.construction?.bytes??0)>0,'the real page-budget accounting path ran');
  assert.equal(api.f257.getRoot500Data(scope),data);assert.equal(data.SOURCE,scope.borrow(refs[0],value=>value));assert.deepEqual(data.SOURCE,values[0]);
  assert.deepEqual(reads,[0]);assert.equal(scope.stats.resources,1);
  assert.throws(()=>data.DISPLAY,/resource was not prepared for this scope/,'explicit premature reads still fail');
  await scope.prepare([refs[1]],signal());assert.deepEqual(reads,[0,1]);
  assert.equal(data.DISPLAY,scope.borrow(refs[1],value=>value));assert.deepEqual(data.DISPLAY,values[1]);
  assert.equal(api.f257.getRoot500Data(scope),data,'preparing the next stage preserves the lazy wrapper and source aliases');
  const release=scope.retainPrepared(refs,api.f257.root500ConstructionRetirement.memoKeys),charged=budget.stats.bytes;
  api.f257.retireRoot500Construction(scope);assert.equal(budget.stats.bytes,charged,'a named final consumer still owns both tables and the memo');
  release();assert.equal(scope.stats.resources,0);assert.equal(store.stats.leases,0);assert.equal(budget.stats.bytes,0);
 }finally{scope.release();client.dispose();store.destroy();resources.destroy();}
 assert.equal(budget.stats.bytes,0);
});

test('graph inspection leaves getters cold while materialized shared arrays still prevent early resource retirement',()=>{
 const {budget,resources}=page(),scope=api.createFrozenDataScope({resources,async acquire(){assert.fail('no table requested');},dispose(){}}),resourceKey={},aliasKey={},unrelatedKey={};let getterReads=0;
 const lazy=()=>{getterReads++;throw Error('later stage is not prepared');};
 try{
  const value=scope.resourceMemo(resourceKey,{contentKey:'accessor-retirement-fixture',estimate:{category:'decoded',bytes:256,precision:'estimate'},
   produce:()=>({positions:new Float32Array([1,2,3]),get later(){return lazy();}}),costs:value=>[{category:'decoded',bytes:256,precision:'estimate',identity:value}]});
  scope.memo(unrelatedKey,()=>({get later(){return lazy();},own:[4,5,6]}));
  // Walk Map, Set and a new typed-array view as well as ordinary own fields.
  const alias=scope.memo(aliasKey,()=>({nested:new Map([['positions',new Set([new Uint8Array(value.positions.buffer)])]]),get later(){return lazy();}}));
  const charged=budget.stats.bytes;
  assert.throws(()=>scope.retirePrepared([],[resourceKey]),/scope memo still references its value/);
  assert.equal(budget.stats.bytes,charged);assert.equal(scope.memo(aliasKey,()=>assert.fail('alias lost')),alias);assert.equal(getterReads,0);
  scope.retirePrepared([],[resourceKey,aliasKey]);assert(budget.stats.bytes<charged);assert.equal(getterReads,0,'source marking, accounting and retirement must not evaluate accessors');
  assert.throws(()=>scope.retainMemoResource(resourceKey,'resident'),/unprepared/);
 }finally{scope.release();resources.destroy();}
 assert.equal(budget.stats.bytes,0);assert.equal(getterReads,0);
});
