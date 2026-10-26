import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Load the production factories, but inject builders. No model/data files or GPU are used.
const web=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(web,'src/painted/root500/safety');
const require=createRequire(new URL('../package.json',import.meta.url));
const {transform}=require('esbuild');
const esm=async(contents)=>'data:text/javascript;base64,'+Buffer.from((await transform(contents,{loader:'ts',format:'esm',target:'es2022'})).code).toString('base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const unrelated={city:'berlin',objectId:'unrelated',partId:'unrelated/component',batches:[],sourceFeature:{},componentGeometry:{type:'Polygon'}};

for(const number of ['029','033']){
  const prefix='F'+number;
  const identitiesURL=await esm(await readFile(path.join(source,`owner-f${number}-identities.ts`),'utf8'));
  const identities=await import(identitiesURL);
  const contents=await readFile(path.join(source,`owner-f${number}-lazy.ts`),'utf8');
  const module=await import(await esm(contents.replaceAll(`'./owner-f${number}-identities'`,JSON.stringify(identitiesURL))));
  const create=module[`createOwner${prefix}Loader`];
  const target={...identities[`${prefix}_IDS`][0],batches:[]};
  const builder={
    [`owner${prefix}Reconstruction`]:components=>({components,stats:{loaded:prefix}}),
    [`owner${prefix}BaseMaterials`]:()=>({loaded:prefix}),
  };

  test(`${prefix}: unrelated identity/part/city does not import a builder`,async()=>{
    let loads=0;const loader=create(async()=>{loads++;return builder;});
    const rows=[unrelated,{...target,city:'frankfurt'},{...target,partId:'other'}];
    await loader.prepare(rows,signal());assert.equal(loads,0);
    const out=loader.reconstruct(rows);assert.deepEqual(out.components,rows);assert.equal(out.stats.objects,0);
    if(number==='029')assert.notEqual(out.components,rows);else assert.equal(out.components,rows);
  });

  test(`${prefix}: relevant synchronous use fails closed before preparation`,()=>{
    const loader=create(async()=>builder);
    assert.throws(()=>loader.reconstruct([target]),/not prepared/);
    assert.throws(()=>loader.baseMaterials([target],new Float32Array(),new Float32Array()),/not prepared/);
  });

  test(`${prefix}: shared pending import survives one caller's cancellation`,async()=>{
    const gate=deferred(),controller=new AbortController();let loads=0;
    const loader=create(()=>{loads++;return gate.promise;});
    const first=loader.prepare([target],controller.signal),second=loader.prepare([target],signal());
    await tick();assert.equal(loads,1);controller.abort();await assert.rejects(first,{name:'AbortError'});
    assert.throws(()=>loader.reconstruct([target]),/not prepared/);
    gate.resolve(builder);await second;assert.equal(loader.reconstruct([target]).stats.loaded,prefix);
  });

  test(`${prefix}: cancelled request does not publish a late import result`,async()=>{
    let loads=0;const gate=deferred(),loader=create(()=>{loads++;return gate.promise;});
    const already=new AbortController();already.abort();await assert.rejects(loader.prepare([target],already.signal),{name:'AbortError'});assert.equal(loads,0);
    const controller=new AbortController(),pending=loader.prepare([target],controller.signal);
    await tick();controller.abort();await assert.rejects(pending,{name:'AbortError'});
    gate.resolve(builder);await tick();assert.throws(()=>loader.reconstruct([target]),/not prepared/);
    await loader.prepare([target],signal());assert.equal(loads,1);assert.equal(loader.reconstruct([target]).stats.loaded,prefix);
  });

  test(`${prefix}: session failure rejects while import stays pending; next session resumes it`,async()=>{
    const gate=deferred(),failedSession=deferred(),failure=new Error('table session failed');let loads=0;
    const loader=create(()=>{loads++;return gate.promise;});
    const first=loader.prepare([target],signal(),operation=>Promise.race([operation,failedSession.promise]));
    failedSession.reject(failure);await assert.rejects(first,error=>error===failure);
    assert.throws(()=>loader.reconstruct([target]),/not prepared/);assert.equal(loads,1);
    const retry=loader.prepare([target],signal(),operation=>operation);gate.resolve(builder);await retry;
    assert.equal(loads,1);assert.equal(loader.reconstruct([target]).stats.loaded,prefix);
  });

  test(`${prefix}: rejected loader is not published as ready`,async()=>{
    const failure=new Error('module fetch failed');let loads=0;
    const loader=create(async()=>{if(++loads===1)throw failure;return builder;});
    await assert.rejects(loader.prepare([target],signal()),error=>error===failure);
    assert.throws(()=>loader.reconstruct([target]),/not prepared/);
    await loader.prepare([target],signal());assert.equal(loads,2);
  });
}

// Execute the actual shard function with bounded dependencies, including all async gates.
const managerSource=await readFile(path.join(source,'three-dimensional-map.ts'),'utf8');
const start=managerSource.indexOf('async function shard('),end=managerSource.indexOf('async function visible(',start);
assert.ok(start>=0&&end>start,'The production async shard boundary must be available');
const body=managerSource.slice(start,end);
const {createHarness}=await import(await esm(`export function createHarness(ctx:any){
const {cache,fetchBounded,checked,normalizeBuildingShard,city,maxVertices,prepareOwnerF029Reconstruction,prepareOwnerF033Reconstruction,prepareNonBerlinOwnerRoutes,options,ownerShapePatchProfile,verifyOwnerShapePatchRows,ownerProfileByComponent,retainedShardCost,remember,shadowAdmissionForDecodedShard,manifest,mobile,THREE_D_DECODED_PAYLOAD_LIMITS,shadowByShard,estimateRetainedBuildingPayload,sourceLeafByFeature,prepareSourceRoleDisplay}=ctx;
let loadCount=0;${body};return{shard};}`));
const shard={tile_key:'one',sha256:'verified',path:'/one',bytes:1,vertices:0};
function harness({ownerProfile=false,first,second,third=Promise.resolve()}){
  const writes=[],calls=[],rows=[unrelated],wait=operation=>operation;
  const prepare=(label,operation)=>async(components,requestSignal,adapter)=>{
    calls.push(label);assert.equal(components,rows);assert.equal(adapter,wait);requestSignal.throwIfAborted();await adapter(operation);
  };
  const ctx={cache:new Map(),fetchBounded:async()=>new Uint8Array([1]),checked:async b=>b,
    normalizeBuildingShard:()=>({schema_version:1,city:'berlin',components:rows,decodedPayloadCost:{retainedPayloadEstimateBytes:32}}),
    city:'berlin',maxVertices:200000,prepareOwnerF029Reconstruction:prepare('F029',first),prepareOwnerF033Reconstruction:prepare('F033',second),prepareNonBerlinOwnerRoutes:prepare('city',third),
    options:{awaitPaintInitialization:wait},ownerShapePatchProfile:()=>ownerProfile?{}:null,verifyOwnerShapePatchRows:()=>{},
    ownerProfileByComponent:new WeakMap(),retainedShardCost:new WeakMap(),remember:(...args)=>writes.push(args),
    shadowAdmissionForDecodedShard:()=>null,manifest:{city_boundary:{sha256:'boundary'}},mobile:false,
    THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:1024,mobile:1024},shadowByShard:new WeakMap(),estimateRetainedBuildingPayload:()=>({retainedPayloadEstimateBytes:0}),
    sourceLeafByFeature:new WeakMap(),prepareSourceRoleDisplay:async()=>{}};
  return{...createHarness(ctx),writes,calls,rows};
}

test('all owner prepares complete before either shard branch admits its cache entry',async()=>{
  for(const ownerProfile of [false,true]){
    const first=deferred(),second=deferred(),third=deferred(),h=harness({ownerProfile,first:first.promise,second:second.promise,third:third.promise});
    const pending=h.shard(shard,signal());await tick();assert.deepEqual(h.calls,['F029']);assert.equal(h.writes.length,0);
    first.resolve();await tick();assert.deepEqual(h.calls,['F029','F033']);assert.equal(h.writes.length,0);
    second.resolve();await tick();assert.deepEqual(h.calls,['F029','F033','city']);assert.equal(h.writes.length,0);third.resolve();assert.equal(await pending,h.rows);assert.equal(h.writes.length,1);
  }
});

test('second prepare cancellation or failure cannot admit an owner-profile shard',async()=>{
  const second=deferred(),controller=new AbortController(),cancelled=harness({ownerProfile:true,first:Promise.resolve(),second:second.promise});
  const pending=cancelled.shard(shard,controller.signal);await tick();assert.deepEqual(cancelled.calls,['F029','F033']);
  controller.abort();second.resolve();await assert.rejects(pending,{name:'AbortError'});assert.equal(cancelled.writes.length,0);
  const gate=deferred(),failure=new Error('second owner session failed'),failed=harness({ownerProfile:true,first:Promise.resolve(),second:gate.promise});
  const rejected=failed.shard(shard,signal());await tick();gate.reject(failure);await assert.rejects(rejected,error=>error===failure);assert.equal(failed.writes.length,0);
});


test('city-route cancellation or failure cannot admit either shard branch',async()=>{
  for(const ownerProfile of [false,true]){
    const third=deferred(),controller=new AbortController(),cancelled=harness({ownerProfile,first:Promise.resolve(),second:Promise.resolve(),third:third.promise});
    const pending=cancelled.shard(shard,controller.signal);await tick();assert.deepEqual(cancelled.calls,['F029','F033','city']);controller.abort();third.resolve();await assert.rejects(pending,{name:'AbortError'});assert.equal(cancelled.writes.length,0);
    const gate=deferred(),failure=new Error('city route session failed'),failed=harness({ownerProfile,first:Promise.resolve(),second:Promise.resolve(),third:gate.promise});
    const rejected=failed.shard(shard,signal());await tick();gate.reject(failure);await assert.rejects(rejected,error=>error===failure);assert.equal(failed.writes.length,0);
  }
});
