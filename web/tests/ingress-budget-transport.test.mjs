import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {NORMALIZE_EXPANSION} from './support/core-frozen-fixtures.mjs';

// One bundle, so the byte transport, the three ingress consumers, the page
// store and the ledger share module state exactly as they do on the page. Every
// payload is a small synthetic in-memory fixture; no product asset is read.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:[
  "export {createResourceByteTransport} from './resource-byte-transport';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget} from './render-runtime/resource-budget';",
  "export {createFrozenDataLeaseStore} from './frozen-data-lease-store';",
  "export {createSharedNativeSourcePool} from './shared-native-source';",
  "export {createBuildingDetailSource} from './building-detail-source';",
].join('\n'),resolveDir:safety,sourcefile:'ingress-transport-entry.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),sha=digit=>digit.repeat(64);
const encode=value=>new TextEncoder().encode(JSON.stringify(value));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate,label){for(let i=0;i<50;i++){if(predicate())return;await settle();}assert.fail(label);}
function harness(){
  const budget=api.createResourceBudget({limitBytes:64*MiB,recentLimitBytes:8*MiB}),store=api.createChunkResourceStore({budget}),reads=[];
  const transport=api.createResourceByteTransport({namespace:'ingress-budget',resourceStore:store,read:(target,signal,max)=>new Promise((resolve,reject)=>{reads.push({path:target,signal,max,resolve,reject});})});
  return{budget,store,transport,reads};
}
const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});
const envelope=bytes=>({bytes:2*bytes,exactBytes:0,estimatedBytes:2*bytes});
// A fresh, exactly sized backing allocation, like a contiguous network body.
const response=bytes=>new Uint8Array(bytes);

for(const gzip of [false,true])test(`frozen ${gzip?'gzip':'plain'} ingress charges one read envelope before the request and the response once by buffer identity`,async()=>{
  const {budget,store,transport,reads}=harness();
  const raw=encode({items:[1,2,3],padding:'x'.repeat(4096)}),rawSHA=hash(raw),physical=gzip?new Uint8Array(gzipSync(raw)):raw;
  const d={path:`/safety/buildings3d/painted-tables/${rawSHA.slice(0,2)}/${rawSHA}.json`,sha256:rawSHA,bytes:raw.length};
  if(gzip){const t=hash(physical);d.transport={path:`/safety/buildings3d/painted-tables/${t.slice(0,2)}/${t}.json.gz`,sha256:t,bytes:physical.length,encoding:'gzip'};}
  const P=physical.length,file='painted/bremen/safety/ingress-transport.ts';
  const leases=api.createFrozenDataLeaseStore([d],{resourceStore:store});
  const client=leases.client({city:'bremen',profileSHA256:sha('a'),provider:'bremen',selection:{tables:[rawSHA],initializers:{[rawSHA]:{[file]:1}}},resolve:value=>value,
    read:async()=>assert.fail('a byte lease takes priority over the legacy reader'),acquireBytes:transport.acquireBytes});
  const pending=client.acquire({canonicalSHA256:rawSHA,file,occurrence:0,codec:'json'},new AbortController().signal);
  await until(()=>reads.length===1,'the physical read is issued');
  assert.equal(reads[0].max,P,'the transport ceiling is the verified physical size');
  assert.deepEqual(category(budget,'read'),envelope(P),'while the read is in flight only the transport two-copy envelope is charged (not a third consumer copy)');
  assert.equal(category(budget,'normalize').bytes,d.bytes*NORMALIZE_EXPANSION,'the parse expansion is still admitted before the read');
  const body=response(P);body.set(physical);reads[0].resolve(body);
  const value=await pending;
  assert.deepEqual(value.borrow(row=>row.items),[1,2,3]);
  assert.equal(transport.stats.consumers,0,'the response lease is returned once the table value exists');
  assert(category(budget,'read').bytes<=P,'only the bounded recent transport copy may remain');
  value.release();client.dispose();leases.destroy();store.evictRecent();
  assert.equal(budget.stats.bytes,0);store.destroy();
});

test('frozen legacy readers without a ledger are still pre-charged by the consumer claim',async()=>{
  const {budget,store}=harness(),raw=encode({legacy:true}),rawSHA=hash(raw),file='painted/bremen/safety/ingress-legacy.ts';
  const d={path:`/safety/buildings3d/painted-tables/${rawSHA.slice(0,2)}/${rawSHA}.json`,sha256:rawSHA,bytes:raw.length};
  let observed;
  const leases=api.createFrozenDataLeaseStore([d],{resourceStore:store});
  const client=leases.client({city:'bremen',profileSHA256:sha('a'),provider:'bremen',selection:{tables:[rawSHA],initializers:{[rawSHA]:{[file]:1}}},resolve:value=>value,
    read:async(_path,signal,max)=>{signal.throwIfAborted();observed=category(budget,'read');assert.equal(max,raw.length);return raw.slice();}});
  const value=await client.acquire({canonicalSHA256:rawSHA,file,occurrence:0,codec:'json'},new AbortController().signal);
  assert.deepEqual(observed,{bytes:raw.length,exactBytes:raw.length,estimatedBytes:0});
  value.release();client.dispose();leases.destroy();store.evictRecent();assert.equal(budget.stats.bytes,0);store.destroy();
});

function nativeComponent(id){
  const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13.001,52.001],[13,52]]]};
  return{city:'berlin',objectId:`osm/way/${id}`,partId:`osm/way/${id}/component/test`,origin:[13,52],componentGeometry:geometry,sourceFeature:{type:'Feature',id:`osm/way/${id}`,geometry,properties:{name:'native'}},
    batches:[{positions:[0,100,0,1,100,0,0,100,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.4,.5,.6]}]};
}
for(const gzip of [false,true])test(`shared native ${gzip?'gzip':'plain'} ingress reads with the descriptor size and charges the read once`,async()=>{
  const {budget,store,transport,reads}=harness();
  const raw=encode({schema_version:1,city:'berlin',components:[nativeComponent(1)],shadow_profile:{schema_version:1,city:'berlin',status:'display-schematic'},shadow_admitted_component_indices:[0]});
  const physical=gzip?new Uint8Array(gzipSync(raw)):raw;
  const descriptor={path:'/safety/buildings3d/ingress-native.json',bytes:physical.length,sha256:hash(physical),...(gzip?{compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:hash(raw)}:{})};
  const pool=api.createSharedNativeSourcePool({resourceStore:store,read:async()=>assert.fail('a byte lease takes priority'),acquireBytes:transport.acquireBytes});
  const client=pool.client('berlin'),pending=client.acquire(descriptor,new AbortController().signal,200000);
  await until(()=>reads.length===1,'the physical read is issued');
  assert.equal(reads[0].max,descriptor.bytes,'not the one-MiB native maximum');
  assert.deepEqual(category(budget,'read'),envelope(descriptor.bytes),'the consumer adds no anonymous copy of the transport read');
  const body=response(physical.length);body.set(physical);reads[0].resolve(body);
  const value=await pending;
  assert.equal(value.raw.components.length,1);assert(value.raw.components[0].batches[0].positions instanceof Float32Array);
  assert.equal(transport.stats.consumers,0);
  value.release();client.destroy();pool.destroy();store.evictRecent();assert.equal(budget.stats.bytes,0);store.destroy();
});

test('a native consumer that leaves during its read cancels and refunds the shared production without a second read',async()=>{
  const {budget,store,transport,reads}=harness(),raw=encode({schema_version:1,city:'berlin',components:[nativeComponent(2)]});
  const descriptor={path:'/safety/buildings3d/ingress-native-cancel.json',bytes:raw.length,sha256:hash(raw)};
  const pool=api.createSharedNativeSourcePool({resourceStore:store,read:async()=>assert.fail('a byte lease takes priority'),acquireBytes:transport.acquireBytes});
  const client=pool.client('berlin'),controller=new AbortController(),pending=client.acquire(descriptor,controller.signal,200000);
  await until(()=>reads.length===1,'the physical read is issued');
  assert(budget.stats.bytes>0);
  controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
  assert(reads[0].signal.aborted,'the shared production was cancelled together with its only consumer');
  reads[0].resolve(response(raw.length));await settle();await settle();
  assert.equal(reads.length,1,'no retry or second transport read for a released consumer');
  store.evictRecent();assert.equal(budget.stats.bytes,0,'every admitted working set was returned');
  client.destroy();pool.destroy();store.destroy();
});

test('a released native consumer stops its production before a transient-failure retry can read again',async()=>{
  const {budget,store}=harness(),raw=encode({schema_version:1,city:'berlin',components:[nativeComponent(3)]});
  const descriptor={path:'/safety/buildings3d/ingress-native-retry.json',bytes:raw.length,sha256:hash(raw)};
  const controller=new AbortController();let attempts=0,charged=0;
  const pool=api.createSharedNativeSourcePool({resourceStore:store,read:async(_path,signal,max)=>{
    attempts++;assert.equal(max,descriptor.bytes);charged=budget.stats.bytes;
    // The only consumer leaves while this attempt fails transiently.
    controller.abort();assert(signal.aborted,'the production signal follows its last consumer synchronously');throw new TypeError('network');
  }});
  await assert.rejects(pool.client('berlin').acquire(descriptor,controller.signal,200000),{name:'AbortError'});
  await settle();
  assert.equal(attempts,1,'an abandoned production never issues its second transport attempt');
  assert(charged>0,'the working set was admitted before the read');
  store.evictRecent();assert.equal(budget.stats.bytes,0,'its reservation was returned');pool.destroy();store.destroy();
});

function detailFixture(){
  const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]};
  const components=[1,2].map(id=>({city:'berlin',objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],componentGeometry:geometry,
    sourceFeature:{type:'Feature',id:`osm/way/${id}`,geometry,properties:{name:'Synthetic source'}},
    batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.5,.6,.7]}]}));
  const bindings={sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'synthetic-source',materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')};
  const header={schema:'crimemaps-building-detail-replacement-v1',level:'coarse',canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),geometrySHA256:sha('c'),
    materialSHA256:bindings.materialSHA256,sourceEquivalenceSHA256:bindings.sourceEquivalenceSHA256,producerSHA256:bindings.producerSHA256,protectionSHA256:bindings.protectionSHA256};
  const raw=encode({schema_version:1,city:'berlin',components,detail_variant:header}),physical=new Uint8Array(gzipSync(raw));
  const descriptor={path:'/safety/buildings3d/detail/ingress-coarse.json.gz',bytes:physical.length,sha256:hash(physical),compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:hash(raw)};
  const resource={key:'ingress-'+descriptor.sha256,city:'berlin',level:'coarse',descriptor,geometrySHA256:sha('c'),canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),bindings,vertices:6,triangles:2,componentCount:2,
    components:[1,2].map(id=>({objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],box:[0,0,0,1,1,0],protected:false}))};
  return{resource,physical};
}
test('building detail display reads use the validated descriptor size as the transport ceiling',async()=>{
  const {budget,store,transport,reads}=harness(),{resource,physical}=detailFixture();
  const source=api.createBuildingDetailSource({city:'berlin',resourceStore:store,acquireBytes:transport.acquireBytes,
    readCanonical:async()=>assert.fail('display variants never read the canonical leaf'),readBytes:async()=>assert.fail('a byte lease takes priority')});
  const pending=source.acquire(resource,{signal:new AbortController().signal});
  await until(()=>reads.length===1,'the physical read is issued');
  assert.equal(reads[0].max,resource.descriptor.bytes,'not the fixed one-MiB physical limit');
  assert.deepEqual(category(budget,'read'),envelope(resource.descriptor.bytes),'two copies of the actual leaf, not of one MiB');
  const body=response(physical.length);body.set(physical);reads[0].resolve(body);
  const value=await pending;
  assert.equal(value.value.raw.components.length,2);assert.equal(transport.stats.consumers,0);
  value.release();store.evictRecent();assert.equal(budget.stats.bytes,0);store.destroy();
});
