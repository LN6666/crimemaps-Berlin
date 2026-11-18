import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync, gzipSync} from 'node:zlib';
import {detailJSON} from './building-detail-variants.mjs';
import {chooseBuildingDetailTransport, encodeBuildingDetailMeshopt} from './building-detail-meshopt.mjs';

const encoderPath=process.env.CRIMEMAPS_MESHOPT_ENCODER,decoderPath=process.env.CRIMEMAPS_MESHOPT_DECODER;
let encoder,decoder;
if(encoderPath&&decoderPath){
  for(const filename of [encoderPath,decoderPath]){assert(path.isAbsolute(filename));const pkg=JSON.parse(await readFile(path.join(path.dirname(filename),'package.json'),'utf8'));assert.equal(pkg.name,'meshoptimizer');assert.equal(pkg.version,'1.3.0');}
  ({MeshoptEncoder:encoder}=await import(pathToFileURL(encoderPath).href));({MeshoptDecoder:decoder}=await import(pathToFileURL(decoderPath).href));await Promise.all([encoder.ready,decoder.ready]);
}
function fixture(){
  const batch={positions:new Float32Array([-0,0,1,1.25,-2.5,3.75,-.5,4,5]),normals:new Float32Array([-0,1,0,-0,1,0,-0,1,0]),indices:new Uint32Array([2,0,1,1,0,2]),color:[.3,.4,.5],materialName:'unchanged-original-material',faceRole:'roof'};
  const sourceFeature={type:'Feature',properties:{name:'Original SOURCE'},geometry:{type:'Polygon',coordinates:[[[8,53],[8.1,53],[8,53.1],[8,53]]]}};
  return {schema_version:1,city:'bremen',detail_variant:{canonical_leaf_sha256:'a'.repeat(64),protectedMemberRetained:true},components:[{city:'bremen',objectId:'osm/way/1',partId:'held-canonical',sourceFeature,componentGeometry:sourceFeature.geometry,origin:[8,53],batches:[batch]},{city:'bremen',objectId:'osm/way/2',partId:'reduced-candidate',sourceFeature,batches:[{...batch,positions:batch.positions.slice(),normals:batch.normals.slice(),indices:batch.indices.slice()}]}]};
}
const bits=array=>Array.from(new Uint32Array(array.buffer,array.byteOffset,array.length));

test('actual 1.3 lossless vertex and index-sequence streams preserve every bit, corner order and metadata',{skip:!encoder||!decoder},async()=>{
  const input=fixture(),before=input.components.map(component=>component.batches.map(batch=>({positions:bits(batch.positions),normals:bits(batch.normals),indices:bits(batch.indices)})));
  const result=await encodeBuildingDetailMeshopt(input,{encoder}),wire=result.document;
  assert.equal(wire.encoding,'meshopt-lossless-f32-v1');assert.equal(wire.detail_variant,input.detail_variant);
  let decodedBytes=0,encodedBytes=0;
  for(let ci=0;ci<input.components.length;ci++){
    const original=input.components[ci],component=wire.components[ci];
    for(const key of Object.keys(original).filter(key=>key!=='batches'))assert.equal(component[key],original[key]);
    for(let bi=0;bi<original.batches.length;bi++){
      const batch=original.batches[bi],encoded=component.batches[bi];for(const key of Object.keys(batch).filter(key=>!['positions','normals','indices'].includes(key)))assert.equal(encoded[key],batch[key]);
      for(const name of ['positions','normals','indices']){
        const stream=encoded[name],integer=name==='indices',bytes=new Uint8Array(stream.decodedBytes),source=Buffer.from(stream.data,'base64');
        assert.equal(stream.codec,integer?'index-sequence':'vertex');assert.equal(stream.count,integer?batch.indices.length:batch.positions.length/3);assert.equal(stream.stride,integer?4:12);assert.equal(stream.decodedBytes,batch[name].byteLength);
        integer?decoder.decodeIndexSequence(bytes,stream.count,stream.stride,source):decoder.decodeVertexBuffer(bytes,stream.count,stream.stride,source);
        assert.equal(createHash('sha256').update(bytes).digest('hex'),stream.sha256);
        const view=new DataView(bytes.buffer);assert.deepEqual(Array.from({length:batch[name].length},(_,i)=>view.getUint32(i*4,true)),bits(batch[name]));
        decodedBytes+=bytes.byteLength;encodedBytes+=source.byteLength;
      }
    }
  }
  assert.deepEqual(result.stats,{decodedTypedArrayBytes:decodedBytes,encodedBufferBytes:encodedBytes,vertices:6,triangles:4,streams:6,quantization:false,reordered:false,filtered:false});
  assert(Object.is(input.components[0].batches[0].positions[0],-0));assert.deepEqual(input.components.map(component=>component.batches.map(batch=>({positions:bits(batch.positions),normals:bits(batch.normals),indices:bits(batch.indices)}))),before);
});

test('invalid arrays, non-finite values and cumulative vertex/index limits reject before encoding',async()=>{
  let calls=0;const stub={ready:Promise.resolve(),encodeVertexBuffer(){calls++;return new Uint8Array([1]);},encodeIndexSequence(){calls++;return new Uint8Array([1]);}};
  const invalid=[];
  for(const mutate of [batch=>batch.positions=[0,0,0],batch=>batch.normals=new Float32Array(3),batch=>batch.positions[0]=NaN,batch=>batch.normals[0]=Infinity,batch=>batch.indices=new Uint32Array(),batch=>batch.indices=new Uint32Array([0,1]),batch=>batch.indices[0]=3]){const document=fixture();mutate(document.components[1].batches[0]);invalid.push(document);}
  for(const document of invalid)await assert.rejects(encodeBuildingDetailMeshopt(document,{encoder:stub}));
  await assert.rejects(encodeBuildingDetailMeshopt(fixture(),{encoder:stub,vertexCap:5}),/budget/);
  const tooMany=fixture();for(const component of tooMany.components)component.batches[0].indices=new Uint32Array(21).fill(0);
  await assert.rejects(encodeBuildingDetailMeshopt(tooMany,{encoder:stub,vertexCap:6}),/budget/);
  assert.equal(calls,0);
});

test('ready and batch work honor cancellation and deadlines without mutating original arrays',async()=>{
  const input=fixture(),controller=new AbortController(),stub={ready:new Promise(()=>{}),encodeVertexBuffer(){throw Error('must not encode');},encodeIndexSequence(){throw Error('must not encode');}};
  const pending=encodeBuildingDetailMeshopt(input,{encoder:stub,signal:controller.signal});setImmediate(()=>controller.abort());await assert.rejects(pending,{name:'AbortError'});
  await assert.rejects(encodeBuildingDetailMeshopt(input,{encoder:stub,deadline:Date.now()-1}),/time bound/);
  await assert.rejects(encodeBuildingDetailMeshopt(input,{encoder:stub,deadline:Date.now()+10}),/time bound/);
  assert(Object.is(input.components[0].batches[0].positions[0],-0));
});

test('transport chooser retains smaller valid JSON including signed zero and falls back when meshopt raw exceeds the unchanged limit',{skip:!encoder},async()=>{
  const input=fixture();input.components=[input.components[0]];
  const batch=input.components[0].batches[0];
  batch.positions=new Float32Array([-0,0,0,1,0,0,0,1,0]);batch.normals=new Float32Array([-0,0,1,-0,0,1,-0,0,1]);
  const raw=Buffer.from(detailJSON(input)+'\n'),before=bits(batch.positions);
  const selected=await chooseBuildingDetailTransport(input,{encoder,serialize:detailJSON});
  assert.equal(selected.encoding,'json');assert.deepEqual(selected.rawBytes,raw);assert.deepEqual(gunzipSync(selected.bytes),raw);
  assert.equal(selected.bytes.length,Math.min(selected.transportStats.plainJSONGzipBytes,selected.transportStats.meshoptJSONGzipBytes));
  const parsed=JSON.parse(selected.rawBytes.toString('utf8'));
  assert(Object.is(parsed.components[0].batches[0].positions[0],-0));assert(Object.is(parsed.components[0].batches[0].normals[0],-0));
  assert.deepEqual(parsed.components[0].batches[0].indices,[2,0,1,1,0,2]);assert.deepEqual(parsed.components[0].sourceFeature,input.components[0].sourceFeature);
  assert.equal(selected.decodedBytes,batch.positions.byteLength+batch.normals.byteLength+batch.indices.byteLength);
  assert.deepEqual(bits(batch.positions),before);
  const bounded=await chooseBuildingDetailTransport(input,{encoder,serialize:detailJSON,maxRawBytes:raw.length});
  assert.equal(bounded.encoding,'json');assert.equal(bounded.transportStats.meshoptWithinLimits,false);assert.equal(bounded.transportStats.meshoptJSONGzipBytes,null);
  assert.deepEqual(bounded.bytes,selected.bytes);
});

test('transport chooser uses actual smaller meshopt gzip without changing typed attributes, metadata or triangle order',{skip:!encoder||!decoder},async()=>{
  const input=fixture();input.components=[input.components[0]];const batch=input.components[0].batches[0],count=256;
  batch.positions=Float32Array.from({length:count*3},(_,i)=>Math.sin(i*1.13)*21);batch.positions[0]=-0;
  batch.normals=Float32Array.from({length:count*3},(_,i)=>i%3===2?1:-0);
  batch.indices=Uint32Array.from({length:(count-2)*3},(_,i)=>Math.floor(i/3)+[2,0,1][i%3]);
  const original=Object.fromEntries(['positions','normals','indices'].map(key=>[key,bits(batch[key])]));
  const selected=await chooseBuildingDetailTransport(input,{encoder,serialize:detailJSON}),wire=JSON.parse(selected.rawBytes.toString('utf8'));
  assert.equal(selected.encoding,'meshopt-lossless-f32-v1');assert.equal(wire.encoding,selected.encoding);
  assert.deepEqual(gunzipSync(selected.bytes),selected.rawBytes);assert.equal(selected.bytes.length,selected.transportStats.meshoptJSONGzipBytes);
  assert(selected.bytes.length<gzipSync(Buffer.from(detailJSON(input)+'\n'),{level:9}).length);
  assert.deepEqual(wire.components[0].sourceFeature,input.components[0].sourceFeature);assert.deepEqual(wire.components[0].batches[0].color,batch.color);
  for(const key of ['positions','normals','indices']){
    const stream=wire.components[0].batches[0][key],decoded=new Uint8Array(stream.decodedBytes),source=Buffer.from(stream.data,'base64');
    key==='indices'?decoder.decodeIndexSequence(decoded,stream.count,stream.stride,source):decoder.decodeVertexBuffer(decoded,stream.count,stream.stride,source);
    const view=new DataView(decoded.buffer);assert.deepEqual(Array.from({length:decoded.length/4},(_,i)=>view.getUint32(i*4,true)),original[key]);
    assert.deepEqual(bits(batch[key]),original[key]);
  }
  assert.equal(selected.transportStats.quantization,false);assert.equal(selected.transportStats.reordered,false);
  await assert.rejects(chooseBuildingDetailTransport(input,{encoder,serialize:detailJSON,maxEncodedBytes:1}),/No building detail transport/);
});

test('transport limits and serializer contract fail without encoder work and cannot raise the existing caps',async()=>{
  let calls=0;const stub={ready:Promise.resolve(),encodeVertexBuffer(){calls++;throw Error('unexpected encode');},encodeIndexSequence(){calls++;throw Error('unexpected encode');}};
  await assert.rejects(chooseBuildingDetailTransport(fixture(),{encoder:stub}),/serializer/);
  for(const extra of [{maxRawBytes:4*1024**2+1},{maxEncodedBytes:1024**2+1},{maxRawBytes:0},{maxEncodedBytes:-1}])
    await assert.rejects(chooseBuildingDetailTransport(fixture(),{encoder:stub,serialize:detailJSON,...extra}),/limit/);
  await assert.rejects(chooseBuildingDetailTransport(fixture(),{encoder:stub,serialize:detailJSON,deadline:Date.now()-1}),/time bound/);
  assert.equal(calls,0);
});
