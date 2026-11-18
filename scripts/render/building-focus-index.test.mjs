import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {buildBuildingFocusIndex,paginateBuildingFocusIndex} from './building-focus-index.mjs';
const index='c'.repeat(64),leaves=[{id:'roof',sha256:'a'.repeat(64),lod:1},{id:'base',sha256:'b'.repeat(64),lod:1}];
const document=(leaf,objectId='osm/way/1')=>{
 const value={schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'frankfurt',canonicalIndex:{sha256:index},canonicalLeaf:{id:leaf.id,sha256:leaf.sha256},components:[{objectId,partId:leaf.id,origin:[8.68,50.11],box:[-10,0,-10,10,100,10]}]};
 const bytes=Buffer.from(JSON.stringify(value));return{asset:{path:'/safety/buildings3d/'+leaf.id+'.json',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},bytes};
};
const build=(documents,expectedLeaves=leaves)=>buildBuildingFocusIndex({city:'frankfurt',canonicalIndexSHA256:index,expectedLeaves,documents});
test('source-object closure joins roof and base across files without reading geometry',()=>{
 const docs=leaves.map(leaf=>document(leaf)),a=build(docs),b=build([...docs].reverse());
 assert.deepEqual(a,b);assert.equal(a.leafCount,2);assert.equal(a.dependencies.length,1);assert.equal(a.dependencies[0].leafKeys.length,2);assert.equal(a.requiresRuntimeOwnerCohorts,true);
 assert.equal(a.schema,'crimemaps-building-focus-source-index-v2');assert(a.leaves.every(leaf=>leaf.partition===null),'flat manifests have no partition locator');
});
test('variant-only metadata and stale bindings cannot claim complete source closure',()=>{
 assert.throws(()=>build([document(leaves[0])]),/Incomplete/);
 assert.throws(()=>build([document(leaves[0]),document({...leaves[1],sha256:'d'.repeat(64)})]),/stale/);
 assert.throws(()=>build([document(leaves[0]),document(leaves[0])]),/duplicate/);
 const altered=document(leaves[0]);altered.bytes[0]=32;assert.throws(()=>build([altered,document(leaves[1])]),/hash mismatch/);
});
test('unrelated objects do not become one artificial city-wide cohort',()=>{
 assert.deepEqual(build([document(leaves[0]),document(leaves[1],'osm/way/2')]).dependencies,[]);
});
test('an object recurring in another geometry LOD is an alternative, not a missing part',()=>{
 const lod2={id:'roof-lod2',sha256:'e'.repeat(64),lod:2},expected=[...leaves,lod2];
 const result=build([...leaves,lod2].map(leaf=>document(leaf)),expected);
 assert.equal(result.dependencies.length,1,'only the LOD-1 roof/base pair forms a dependency');
 assert.deepEqual(result.dependencies[0].leafKeys,[JSON.stringify(['base','b'.repeat(64)]),JSON.stringify(['roof','a'.repeat(64)])]);
 assert.throws(()=>build(leaves.map(leaf=>document(leaf)),[{...leaves[0],lod:undefined},leaves[1]]),/LOD/);
 const aliased=[{id:'roof',sha256:'a'.repeat(64),supported_lods:[1,2,3],actual_geometry_lod:1},leaves[1]];
 assert.equal(build(leaves.map(leaf=>document(leaf)),aliased).dependencies.length,1,'partition alias rows normalize to LOD 1 like the runtime');
});
test('partitioned leaves carry the locator of the page that lists them',()=>{
 const rows=[{leaf:leaves[0],indexChain:[{id:'p-north'}]},{leaf:leaves[1],indexChain:[{id:'p-south'}]}];
 const result=build(leaves.map(leaf=>document(leaf)),rows);
 assert.deepEqual(result.leaves.map(leaf=>[leaf.id,leaf.partition]).sort(),[['base','p-south'],['roof','p-north']]);
 assert.throws(()=>build(leaves.map(leaf=>document(leaf)),[{leaf:leaves[0],indexChain:[{id:'a'},{id:'b'}]},rows[1]]),/partition depth/);
 assert.throws(()=>build(leaves.map(leaf=>document(leaf)),[{leaf:leaves[0],indexChain:[{id:'../x y'}]},rows[1]]),/partition id/);
});

test('paged root contains no geometry bounds and each selected leaf carries its cross-file closure and locators',()=>{
 const rows=[{leaf:leaves[0],indexChain:[{id:'p-north'}]},{leaf:leaves[1],indexChain:[{id:'p-south'}]}];
 const original=build(leaves.map(leaf=>document(leaf)),rows),paged=paginateBuildingFocusIndex(original);
 const resources=new Map(paged.assets.map(row=>[row.asset.path,row]));
 const read=asset=>{const r=resources.get(asset.path);assert.equal(r.bytes.length,asset.bytes);assert.equal(createHash('sha256').update(r.bytes).digest('hex'),asset.sha256);
  if(asset.compression!=='gzip'){assert(asset.path.endsWith(asset.sha256+'.json'));return JSON.parse(r.bytes);}
  assert(asset.path.endsWith(asset.sha256+'.json.gz'));const raw=gunzipSync(r.bytes);assert.equal(raw.length,asset.uncompressed_bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),asset.uncompressed_sha256);return JSON.parse(raw);};
 const root=read(paged.root);assert(!('components' in root));assert(!('leaves' in root));assert.equal(root.schema,'crimemaps-building-focus-catalog-v2');
 const recovered=[];
 for(const page of root.pages){const index=read(page.asset);assert.equal(index.schema,'crimemaps-building-focus-page-v2');assert(!('components' in index));for(const entry of index.entries){
  const leaf=read(entry.asset);assert.equal(leaf.schema,'crimemaps-building-focus-leaf-v2');assert.equal(leaf.leaf.id,entry.id);assert.equal(leaf.leaf.sha256,entry.sha256);assert.equal(leaf.sourceObjectDependencies[0].leafKeys.length,2);
  assert.deepEqual(leaf.dependencyLocators,[{key:JSON.stringify(['base','b'.repeat(64)]),partition:'p-south'},{key:JSON.stringify(['roof','a'.repeat(64)]),partition:'p-north'}]);
  assert.equal(leaf.leaf.partition,entry.id==='roof'?'p-north':'p-south');recovered.push(leaf.components[0].partId);
 }}
 assert.deepEqual(recovered.sort(),['base','roof']);
 const again=paginateBuildingFocusIndex(build(leaves.map(leaf=>document(leaf)).reverse(),[...rows].reverse()));assert.deepEqual(again.root,paged.root);
 assert(paged.assets.every(row=>row.asset.bytes<=500000));
 const kinds=paged.assets.map(row=>[row.asset.compression??'plain',JSON.parse(row.asset.compression?gunzipSync(row.bytes):row.bytes).schema]);
 assert(kinds.every(([codec,schema])=>codec===(schema==='crimemaps-building-focus-leaf-v2'?'gzip':'plain')),'only leaf documents are gzip; root and pages stay plain');
 assert.deepEqual(paginateBuildingFocusIndex(original).assets.map(row=>row.asset),paged.assets.map(row=>row.asset),'gzip output is deterministic');
 assert.throws(()=>paginateBuildingFocusIndex({...original,schema:'crimemaps-building-focus-source-index-v1'}),/Invalid focus source index/);
});
