import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const built=await build({stdin:{contents:"export * from './environment-ground-mesh';",resolveDir:new URL('../src/safety/',import.meta.url).pathname,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const sha='a'.repeat(64),boundarySHA='b'.repeat(64),rawSHA='c'.repeat(64);
function encode(values,float){const raw=Buffer.alloc(values.length*4);values.forEach((v,i)=>float?raw.writeFloatLE(v,i*4):raw.writeUInt32LE(v,i*4));return raw.toString('base64');}
function fixture(){
  const canonical=[{path:'/safety/environment/berlin/ground-overview-'+sha+'.json.gz',sha256:sha,uncompressed_sha256:rawSHA}];
  const data={schema:'environment-ground-far-mesh-v1',encoding:'f32le-xyz-role4-u32le',city:'berlin',
    source_pbf_sha256:sha,source_boundary_sha256:boundarySHA,source_snapshot:'2026-09-25T20:24:36Z',
    canonical_ground_tiles:canonical,source_feature_ids:['osm/way/1'],source_polygon_count:1,origin:[13,52],vertex_count:3,index_count:3,
    vertices_f32le_base64:encode([-0,.01,0,4,10,.01,0,4,0,.01,10,4],true),indices_u32le_base64:encode([0,1,2],false),
    proof:{canonical_vertices:3,canonical_indices:3,canonical_bytes_7stride:96,packed_bytes_4stride:60,
      fixed_up_normal_bytes:12,packed_bytes_including_up_normal:72,position_error_m:0,welded_vertices:0,duplicate_triangles:0,
      expanded_unique_oriented_triangles_equal:true,all_seven_attributes_bit_exact:true}};
  return {data,expected:{city:'berlin',sourceSHA256:sha,boundarySHA256:boundarySHA,snapshot:data.source_snapshot,canonicalGroundTiles:canonical,sourceFeatureCount:1}};
}
const clone=value=>structuredClone(value);

test('far green inspection keeps one source object; admitted LE decode preserves -0, four attributes and the one UP normal tail',()=>{
  const {data,expected}=fixture(),before=JSON.stringify(data),checked=api.inspectEnvironmentGroundMesh(data,expected);
  assert.equal(checked.data,data);assert.equal(checked.sourceFeatureIds,data.source_feature_ids);
  const mesh=api.decodeEnvironmentGroundMesh(checked);
  assert.equal(Object.is(mesh.positions[0],-0),true);assert.equal(mesh.positions.length,15);
  assert.deepEqual([...mesh.positions.slice(-3)],[0,1,0]);assert.deepEqual([...mesh.indices],[0,1,2]);
  const bound=api.environmentGroundMeshPublicationBound(checked);
  assert.equal(bound.vertexBytes,60);assert.equal(bound.indexBytes,12);assert.equal(bound.packedBytes,72);
  assert(bound.packedBytes<data.proof.canonical_bytes_7stride);
  assert.equal(bound.counts.nativeTrees,0);assert.equal(bound.counts.greenPolygons,1);
  assert.equal(JSON.stringify(data),before);
});

test('far green rejects stale source/canonical tuples, foreign cities and duplicate source IDs before decode',()=>{
  const {data,expected}=fixture();
  for(const mutate of [x=>x.source_pbf_sha256='d'.repeat(64),x=>x.source_boundary_sha256='d'.repeat(64),
    x=>x.source_snapshot='old',x=>x.city='bremen',x=>x.canonical_ground_tiles[0].uncompressed_sha256='d'.repeat(64),
    x=>x.source_feature_ids.push('osm/way/1')]){
    const bad=clone(data);mutate(bad);assert.throws(()=>api.inspectEnvironmentGroundMesh(bad,expected),/source-bound/);
  }
});

test('far green cap, binary length, error and byte-benefit assertions fail closed without a decoder allocation',()=>{
  const {data,expected}=fixture();
  for(const mutate of [x=>x.vertex_count=20001,x=>x.index_count=60001,x=>x.indices_u32le_base64+='AAAA',
    x=>x.vertices_f32le_base64='AA==',x=>x.proof.position_error_m=.01,x=>x.proof.packed_bytes_4stride++,
    x=>x.proof.all_seven_attributes_bit_exact=false,x=>x.proof.canonical_bytes_7stride=72]){
    const bad=clone(data);mutate(bad);assert.throws(()=>api.inspectEnvironmentGroundMesh(bad,expected),/source-bound/);
  }
});

test('decoder rejects nonfinite coordinates, non-green roles, wrong plane and invalid/degenerate triangle indices',()=>{
  const {data,expected}=fixture();
  for(const values of [[NaN,.01,0,4,10,.01,0,4,0,.01,10,4],[0,.02,0,4,10,.01,0,4,0,.01,10,4],
    [0,.01,0,8,10,.01,0,4,0,.01,10,4]]){
    const bad=clone(data);bad.vertices_f32le_base64=encode(values,true);
    assert.throws(()=>api.decodeEnvironmentGroundMesh(api.inspectEnvironmentGroundMesh(bad,expected)),/source-bound/);
  }
  for(const indices of [[0,1,3],[0,1,1]]){
    const bad=clone(data);bad.indices_u32le_base64=encode(indices,false);
    assert.throws(()=>api.decodeEnvironmentGroundMesh(api.inspectEnvironmentGroundMesh(bad,expected)),/source-bound/);
  }
});

test('Float32 envelope checks use the exact source boundary and do not draw across its rejected region',()=>{
  const {data,expected}=fixture(),mesh=api.decodeEnvironmentGroundMesh(api.inspectEnvironmentGroundMesh(data,expected));
  const calls=[],boundary={boundarySHA256:boundarySHA,covers:box=>{calls.push(box);return false;}};
  assert.equal(api.validateGroundMeshBoundary(mesh,boundary),false);assert(calls.length>2&&calls.length<=257,'fallback remains bounded');
  assert(calls[0].every(Number.isFinite));
  // Inverse Mercator round-trips 52 degrees as 51.99999999999999.
  // Tolerate arithmetic roundoff only in this assertion, not boundary admission.
  assert(Math.abs(calls[0][0]-13)<1e-12&&Math.abs(calls[0][1]-52)<1e-12);
  assert(calls[0][2]>13&&calls[0][2]<13.0002);
  assert(calls[0][3]>52&&calls[0][3]<52.0001);
  assert.equal(api.validateGroundMeshBoundary(mesh,{boundarySHA256:boundarySHA,covers:()=>true}),true);
  assert.equal(api.validateGroundMeshBoundary(mesh,{boundarySHA256:'d'.repeat(64),covers:()=>true}),false);
});

test('encoded source and renderer decoded reservations stay separate and bounded',()=>{
  assert.equal(api.environmentGroundMeshEncodedRetainedBytes(100),4496);
  for(const n of [-1,0,NaN,Infinity,1024**2+1])assert.throws(()=>api.environmentGroundMeshEncodedRetainedBytes(n),/source-bound/);
  const {data,expected}=fixture(),bound=api.environmentGroundMeshPublicationBound(api.inspectEnvironmentGroundMesh(data,expected));
  assert(bound.constructionBytes>=4*bound.packedBytes);
  assert.equal(bound.counts.waterVertices,0);assert.equal(bound.evidenceBytes,0);
});
