import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// The runtime adapter and the producer's round-trip validator come from the same
// bundle: decodeBuildingDetailJSON is exactly what building-detail-variants runs
// on every plain JSON replacement before it is published.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:[
  "export {createBuildingDetailSource} from './building-detail-source';",
  "export {decodeBuildingDetailJSON,inspectBuildingDetailJSON} from './building-detail-meshopt';",
  "export {createChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget} from './render-runtime/resource-budget';",
].join('\n'),resolveDir:safety,sourcefile:'ingress-detail-entry.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),sha=digit=>digit.repeat(64);
const signal=()=>new AbortController().signal;
const bindings={sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'synthetic-source',materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')};
function component(id){
  const geometry={type:'Polygon',coordinates:[[[13,52],[13.001,52],[13,52.001],[13,52]]]};
  // Producer field order is deliberately not the normalizer's batch order.
  return{city:'berlin',objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],componentGeometry:geometry,
    sourceFeature:{type:'Feature',id:`osm/way/${id}`,geometry,properties:{name:'Synthetic source',height:'8'},source_marker:'original'},
    retainedMetadata:{protected:false,sourceRevision:1},
    batches:[{material_slot:{id:'wall'},color:[.5,.25,.75],positions:[0,0,0,1.5,0,0,0,2.25,0],uv:[0,0,1,0,0,1],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],shading:'flat'}],
    displayHint:{retained:true}};
}
function fixture({gzip=false,mutate=()=>{}}={}){
  const header={schema:'crimemaps-building-detail-replacement-v1',level:'coarse',canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),geometrySHA256:sha('c'),
    materialSHA256:bindings.materialSHA256,sourceEquivalenceSHA256:bindings.sourceEquivalenceSHA256,producerSHA256:bindings.producerSHA256,protectionSHA256:bindings.protectionSHA256};
  const document={schema_version:1,city:'berlin',components:[component(1),component(2)],detail_variant:header,shadow_profile:{old_canonical_signature:true}};
  mutate(document);
  const raw=new TextEncoder().encode(JSON.stringify(document)),physical=gzip?new Uint8Array(gzipSync(raw)):raw;
  const descriptor={path:`/safety/buildings3d/detail/decode.json${gzip?'.gz':''}`,bytes:physical.length,sha256:hash(physical),...(gzip?{compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:hash(raw)}:{})};
  const resource={key:'decode-'+descriptor.sha256,city:'berlin',level:'coarse',descriptor,geometrySHA256:sha('c'),canonicalIndexSHA256:sha('1'),canonicalLeafSHA256:sha('2'),bindings,vertices:6,triangles:2,componentCount:2,
    components:[1,2].map(id=>({objectId:`osm/way/${id}`,partId:`component/${id}`,origin:[13,52],box:[0,0,0,1,1,0],protected:false}))};
  return{document:JSON.parse(new TextDecoder().decode(raw)),physical,resource};
}
function source(data,extra={}){
  const budget=api.createResourceBudget(),resourceStore=api.createChunkResourceStore({budget});
  return{budget,resourceStore,source:api.createBuildingDetailSource({city:'berlin',resourceStore,readCanonical:async()=>assert.fail('display variants never read the canonical leaf'),
    readBytes:async(_path,currentSignal)=>{currentSignal.throwIfAborted();return data.physical.slice();},...extra})};
}
// Typed arrays keep constructor and exact bits; every other field keeps order.
const canonicalJSON=value=>JSON.stringify(value,(_key,item)=>ArrayBuffer.isView(item)?{[item.constructor.name]:Array.from(item,number=>Object.is(number,-0)?'-0':number)}:item);

for(const gzip of [false,true])test(`runtime plain ${gzip?'gzip':'JSON'} replacement equals the producer's decodeBuildingDetailJSON value field for field`,async()=>{
  const data=fixture({gzip}),{budget,resourceStore,source:adapter}=source(data);
  const lease=await adapter.acquire(data.resource,{signal:signal()});
  const runtime=lease.value.raw.components,producer=(await api.decodeBuildingDetailJSON(structuredClone(data.document),{signal:signal(),vertexCap:200000,geometryPositionCap:200000})).components;
  assert.equal(runtime.length,producer.length);
  for(let i=0;i<producer.length;i++){
    assert.deepEqual(Object.keys(runtime[i]),Object.keys(producer[i]),'component field order is the producer decoder order');
    for(let j=0;j<producer[i].batches.length;j++){
      const actual=runtime[i].batches[j],expected=producer[i].batches[j];
      assert.deepEqual(Object.keys(actual),Object.keys(expected),'batch field order is the producer decoder order');
      assert(actual.positions instanceof Float32Array&&actual.normals instanceof Float32Array&&actual.indices instanceof Uint32Array);
    }
  }
  assert.equal(canonicalJSON(runtime),canonicalJSON(producer),'the runtime value is the validated value');
  assert.equal(Object.hasOwn(runtime[0],'displayEstimates'),false,'no normalizer display flag is introduced');
  assert.equal(lease.value.verified,undefined,'the old canonical shadow header is not admitted');
  const decoded=budget.stats.categories.decoded;
  assert.equal(decoded.exactBytes,lease.value.raw.decodedPayloadCost.typedBufferBytes,'typed render streams are charged exactly once');
  assert.equal(decoded.exactBytes,api.inspectBuildingDetailJSON(data.document,{vertexCap:200000}).decodedTypedArrayBytes,'the inspected allocation is the decoded allocation');
  lease.release();resourceStore.evictRecent();assert.equal(budget.stats.bytes,0);resourceStore.destroy();
});

test('a value the producer validator rejects is rejected by the runtime decoder too',async()=>{
  // 0.1 is not a Float32 value: the old normalizer path silently rounded it.
  const data=fixture({mutate:document=>{document.components[0].batches[0].positions[3]=0.1;}});
  await assert.rejects(api.decodeBuildingDetailJSON(structuredClone(data.document),{signal:signal(),vertexCap:200000}),/Float32 position/);
  await assert.rejects(source(data).source.acquire(data.resource,{signal:signal()}),/Float32 position/);
  const normal=fixture({mutate:document=>{document.components[1].batches[0].normals[0]=1/3;}});
  await assert.rejects(source(normal).source.acquire(normal.resource,{signal:signal()}),/Float32 normal/);
  const index=fixture({mutate:document=>{document.components[1].batches[0].indices[2]=1.5;}});
  await assert.rejects(source(index).source.acquire(index.resource,{signal:signal()}),/triangle index/);
});

test('the producer codec tag for plain JSON is accepted exactly like an untagged document',async()=>{
  const plain=fixture(),tagged=fixture({mutate:document=>{document.encoding='json';}});
  const one=await source(plain).source.acquire(plain.resource,{signal:signal()}),two=await source(tagged).source.acquire(tagged.resource,{signal:signal()});
  assert.equal(canonicalJSON(two.value.raw.components),canonicalJSON(one.value.raw.components));
  one.release();two.release();
  const unknown=fixture({mutate:document=>{document.encoding='packed-json-v1';}});
  await assert.rejects(source(unknown).source.acquire(unknown.resource,{signal:signal()}));
});

test('a document whose streams exceed the selected allocation is refused before any typed array is built',async()=>{
  // The selected descriptor declares 6 vertices / 2 triangles (168 bytes); the
  // document carries one more batch. Its inspected size is compared first, so
  // the oversized arrays are never allocated against the smaller reservation.
  const extra={color:[.1,.2,.3],positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2]};
  const data=fixture({mutate:document=>{document.components[1].batches.push(structuredClone(extra));}});
  data.resource.decodedBytes=data.resource.vertices*24+data.resource.triangles*12;
  let allocated=0;const Native=Float32Array;
  const counting=source(data);
  globalThis.Float32Array=class extends Native{constructor(...args){super(...args);allocated++;}};
  try{await assert.rejects(counting.source.acquire(data.resource,{signal:signal()}),/decoded allocation mismatch/);}finally{globalThis.Float32Array=Native;}
  assert.equal(allocated,0,'no render stream was materialized for a refused document');
  assert.equal(counting.budget.stats.categories.decoded?.bytes??0,0);
  const ok=fixture();ok.resource.decodedBytes=ok.resource.vertices*24+ok.resource.triangles*12;
  const lease=await source(ok).source.acquire(ok.resource,{signal:signal()});lease.release();
});
