import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {buildEnvironmentGroundOverview,groundOverviewJSON,GROUND_OVERVIEW_LIMITS as limits} from './environment-ground-overview.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),source='a'.repeat(64),city='bremen',snapshot='synthetic-source-cohort';
const square=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
function fixture(){
 const files=new Map(),boundaryRaw=Buffer.from(JSON.stringify({source_pbf_sha256:source,geometry:{type:'Polygon',coordinates:[square(-.2,-.2,.2,.2)]}})),boundary={path:'/safety/environment/bremen/boundary.json',sha256:sha(boundaryRaw),bytes:boundaryRaw.length};files.set(boundary.path,boundaryRaw);
 const feature=(id,geometry,tags)=>({type:'Feature',id:'osm/way/'+id,geometry,properties:{kind:'green',osmTags:tags,displayClip:true,sourceGeometry:structuredClone(geometry),source_snapshot:snapshot,source_pbf_sha256:source,source_boundary_sha256:boundary.sha256,retainedUnknownMetadata:{negativeZero:-0}}});
 const grass=feature(1,{type:'Polygon',coordinates:[square(-.09,-.09,-.01,-.01),square(-.07,-.07,-.03,-.03)]},{landuse:'grass'}),forest=feature(2,{type:'MultiPolygon',coordinates:[[square(.01,.01,.03,.03)],[square(.04,.04,.07,.07)]]},{natural:'wood'}),paved=feature(3,{type:'Polygon',coordinates:[square(.08,.08,.09,.09)]},{leisure:'park',surface:'asphalt'});
 const add=(n,features)=>{const raw=Buffer.from(groundOverviewJSON({type:'FeatureCollection',schema_version:1,city,features})),bytes=gzipSync(raw),kinds={};for(const f of features)kinds[f.properties.kind]=(kinds[f.properties.kind]??0)+1;const asset={id:'green-'+n,tile_key:String(n),bbox:[-.1,-.1,.1,.1],path:'/safety/environment/bremen/green-'+n+'.json.gz',sha256:sha(bytes),bytes:bytes.length,compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw),feature_count:features.length,kinds};files.set(asset.path,bytes);return asset;};
 const page=(n,tiles,metadata={})=>{const raw=Buffer.from(groundOverviewJSON({schema_version:1,city,tiles,...metadata})),bytes=gzipSync(raw),asset={id:'partition-'+n,bbox:[-.1,-.1,.1,.1],path:'/safety/environment/bremen/partition-'+n+'.json.gz',sha256:sha(bytes),bytes:bytes.length,compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw),tile_count:tiles.length};files.set(asset.path,bytes);return asset;};
 const tiles=[add(1,[grass,forest,paved]),add(2,[structuredClone(grass)])],index={schema_version:1,city,source_snapshot:snapshot,source_pbf_sha256:source,city_boundary:boundary,tiles,originalMetadata:{unchanged:true}},reads=[];
 return{index,files,grass,forest,paved,feature,add,page,reads,input:()=>({indexBytes:Buffer.from(groundOverviewJSON(index)),readAsset:async(asset,signal)=>{signal?.throwIfAborted();reads.push(asset.path);return files.get(asset.path);}})};
}
function partitioned(f,pages){delete f.index.tiles;f.index.index_type='viewport-partitioned-v1';f.index.partitions=pages;return f;}

test('overview keeps exact complete source rings, holes, IDs, tags and pins under the original packed caps',async()=>{
 const f=fixture(),before=groundOverviewJSON(f.index),expected=new Map([f.grass,f.forest].map(v=>[v.id,v]));
 const a=await buildEnvironmentGroundOverview(f.input()),b=await buildEnvironmentGroundOverview(f.input());
 assert.equal(groundOverviewJSON(f.index),before);assert.deepEqual(a.index.tiles,f.index.tiles);assert.deepEqual(a.index.originalMetadata,f.index.originalMetadata);
 assert.deepEqual(a.receipt.selected.map(v=>v.id),[...expected.keys()]);assert.deepEqual(a.receipt.duplicates,[f.grass.id]);assert.equal(a.receipt.held[0].id,f.paved.id);assert.equal(a.receipt.sourceGeometryChanged,false);
 const decoded=[];for(const t of a.index.ground_tiles){const file=a.files.find(v=>v.path===t.path),raw=gunzipSync(file.bytes);assert.equal(sha(file.bytes),t.sha256);assert.equal(sha(raw),t.uncompressed_sha256);assert.equal(raw.length,t.uncompressed_bytes);decoded.push(...JSON.parse(raw.toString()).features);}
 for(const feature of decoded){assert.deepEqual(feature,expected.get(feature.id));assert(Object.is(feature.properties.retainedUnknownMetadata.negativeZero,-0));}
 assert.equal(decoded.find(v=>v.id===f.grass.id).geometry.coordinates.length,2,'the original source hole is kept');
 assert(a.receipt.output.vertices<=limits.vertices);assert(a.receipt.output.indices<=limits.indices);assert(a.receipt.output.rawBytes<=limits.rawBytes);assert(a.files.length<=limits.leaves);assert(a.receipt.output.triangleAreaSumM2>0);assert.match(a.receipt.areaMeasurement,/not polygon union/);
 assert.equal(groundOverviewJSON(a.index),groundOverviewJSON(b.index));assert.deepEqual(a.files.map(v=>v.bytes),b.files.map(v=>v.bytes),'same source inputs yield the same transport');
});

test('producer refuses missing kind inventory and altered bytes while selecting excess inputs before reading',async()=>{
 const missing=fixture();delete missing.index.tiles[0].kinds;await assert.rejects(buildEnvironmentGroundOverview(missing.input()),/complete kind inventories/);assert.equal(missing.reads.length,0);
 const excess=fixture(),result=await buildEnvironmentGroundOverview(excess.input(),{caps:{inputLeaves:1}});assert.deepEqual(excess.reads,[excess.index.city_boundary.path,excess.index.tiles[0].path]);assert.equal(result.receipt.inputComplete,false);assert.equal(result.receipt.inputDocuments,1);assert.deepEqual(result.receipt.unreadInputs,[{kind:'leaf',descriptor:excess.index.tiles[1],reason:'input-document-budget'}]);
 const altered=fixture();altered.files.set(altered.index.tiles[0].path,Buffer.alloc(altered.index.tiles[0].bytes));await assert.rejects(buildEnvironmentGroundOverview(altered.input()),/byte\/SHA mismatch/);
});

test('partitioned mixed sources retain the native index and publish only unchanged whole green features',async()=>{
 const f=fixture(),tree=f.feature(4,{type:'Point',coordinates:[0,0]},{natural:'tree'});tree.properties.kind='tree';
 const tile=f.add(3,[f.grass,f.forest,tree]),page=f.page(1,[tile]);partitioned(f,[page]);const before=groundOverviewJSON(f.index);
 const result=await buildEnvironmentGroundOverview(f.input());
 assert.equal(groundOverviewJSON(f.index),before);assert.deepEqual(result.index.partitions,f.index.partitions);assert.equal('tiles'in result.index,false);assert.deepEqual(result.index.originalMetadata,f.index.originalMetadata);
 assert.deepEqual(f.reads,[f.index.city_boundary.path,page.path,tile.path]);assert.equal(result.receipt.inputComplete,true);assert.equal(result.receipt.inputMode,'viewport-partitioned-v1');assert.equal(result.receipt.inputDeclaredFeatures,3);assert.equal(result.receipt.inputDecodedFeatures,3);assert.equal(result.receipt.inputFeatures,2);
 assert.equal(result.receipt.inputPartitionRawBytes,page.uncompressed_bytes);assert.equal(result.receipt.inputRawBytes,result.receipt.inputIndexRawBytes+result.receipt.inputBoundaryRawBytes+page.uncompressed_bytes+tile.uncompressed_bytes);
 const features=result.files.flatMap(file=>JSON.parse(gunzipSync(file.bytes).toString()).features),expected=new Map([f.grass,f.forest].map(f=>[f.id,f]));
 for(const feature of features){assert.deepEqual(feature,expected.get(feature.id));assert.equal(feature.properties.kind,'green');assert(Object.is(feature.properties.retainedUnknownMetadata.negativeZero,-0));}
 assert.equal(features.length,2);assert.equal(features.find(v=>v.id===f.grass.id).geometry.coordinates.length,2);assert.equal(tree.properties.kind,'tree');assert(result.index.ground_tiles.every(t=>Object.keys(t.kinds).join(',')==='green'));
 const inconsistent=fixture(),mixed=inconsistent.add(3,[inconsistent.grass,tree]);mixed.kinds={green:2};inconsistent.index.tiles=[mixed];await assert.rejects(buildEnvironmentGroundOverview(inconsistent.input()),/Ground leaf kind\/count mismatch/);
});

test('partition pages share the original input document budget and unread descendants are explicit',async()=>{
 const f=fixture(),tiles=f.index.tiles,page=f.page(1,tiles),later=f.page(2,[f.add(3,[f.forest])]);partitioned(f,[page,later]);
 const result=await buildEnvironmentGroundOverview(f.input(),{caps:{inputLeaves:2}});
 assert.deepEqual(f.reads,[f.index.city_boundary.path,page.path,tiles[0].path]);assert.equal(result.receipt.inputDocuments,2);assert.equal(result.receipt.inputPartitions.length,1);assert.equal(result.receipt.inputLeaves.length,1);assert.equal(result.receipt.inputComplete,false);
 assert.deepEqual(result.receipt.unreadInputs,[{kind:'leaf',descriptor:tiles[1],reason:'input-document-budget',partitionSHA256:page.sha256},{kind:'partition',descriptor:later,reason:'input-document-budget'}]);
 assert.equal(result.receipt.inputRawBytes,result.receipt.inputIndexRawBytes+result.receipt.inputBoundaryRawBytes+page.uncompressed_bytes+tiles[0].uncompressed_bytes);assert.equal(result.receipt.inputPartitions[0].sha256,page.sha256);assert.equal(result.receipt.inputLeaves[0].sha256,tiles[0].sha256);
});

test('partition integrity, city and declared source pins fail closed before any child leaf read',async()=>{
 for(const metadata of [{city:'berlin'},{source_pbf_sha256:'b'.repeat(64)},{source_snapshot:'wrong'},{city_boundary_sha256:'c'.repeat(64)}]){
  const f=fixture(),page=f.page(1,[f.index.tiles[0]],metadata);partitioned(f,[page]);await assert.rejects(buildEnvironmentGroundOverview(f.input()),/Ground partition (city\/schema\/count|source binding) mismatch/);assert.deepEqual(f.reads,[f.index.city_boundary.path,page.path]);
 }
 const f=fixture(),page=f.page(1,[f.index.tiles[0]]);partitioned(f,[page]);f.files.set(page.path,Buffer.alloc(page.bytes));await assert.rejects(buildEnvironmentGroundOverview(f.input()),/byte\/SHA mismatch/);assert.deepEqual(f.reads,[f.index.city_boundary.path,page.path]);
 const wrongRaw=fixture(),rawPage=wrongRaw.page(1,[wrongRaw.index.tiles[0]]);rawPage.uncompressed_sha256='e'.repeat(64);partitioned(wrongRaw,[rawPage]);await assert.rejects(buildEnvironmentGroundOverview(wrongRaw.input()),/raw byte\/SHA mismatch/);assert.deepEqual(wrongRaw.reads,[wrongRaw.index.city_boundary.path,rawPage.path]);
 const wrongCount=fixture(),countPage=wrongCount.page(1,[wrongCount.index.tiles[0]]);countPage.tile_count++;partitioned(wrongCount,[countPage]);await assert.rejects(buildEnvironmentGroundOverview(wrongCount.input()),/Ground partition city\/schema\/count mismatch/);assert.deepEqual(wrongCount.reads,[wrongCount.index.city_boundary.path,countPage.path]);
 const cancelled=fixture(),cancelledPage=cancelled.page(1,[cancelled.index.tiles[0]]);partitioned(cancelled,[cancelledPage]);const abort=new AbortController(),input=cancelled.input();await assert.rejects(buildEnvironmentGroundOverview({...input,readAsset:async(asset,signal)=>{const bytes=await input.readAsset(asset,signal);if(asset.path===cancelledPage.path)abort.abort();return bytes;}},{signal:abort.signal}),{name:'AbortError'});assert.deepEqual(cancelled.reads,[cancelled.index.city_boundary.path,cancelledPage.path]);
});

test('raw bytes, single-document bytes and all mixed feature declarations are reserved before reads',async()=>{
 {
  const f=fixture(),[first,later]=f.index.tiles,cap=Buffer.byteLength(groundOverviewJSON(f.index))+f.index.city_boundary.bytes+first.uncompressed_bytes;
  const result=await buildEnvironmentGroundOverview(f.input(),{caps:{inputRawBytes:cap}});assert.equal(result.receipt.inputRawBytes,cap);assert.deepEqual(f.reads,[f.index.city_boundary.path,first.path]);assert.deepEqual(result.receipt.unreadInputs,[{kind:'leaf',descriptor:later,reason:'input-raw-byte-budget'}]);assert.equal(result.receipt.inputComplete,false);
 }
 {
  const f=fixture(),[large,small]=f.index.tiles,result=await buildEnvironmentGroundOverview(f.input(),{caps:{inputLeafBytes:small.uncompressed_bytes}});
  assert.deepEqual(f.reads,[f.index.city_boundary.path,small.path]);assert.deepEqual(result.receipt.unreadInputs,[{kind:'leaf',descriptor:large,reason:'input-single-document-budget'}]);assert.equal(result.receipt.inputLeaves.length,1);
 }
 {
  const f=fixture(),tree=f.feature(4,{type:'Point',coordinates:[0,0]},{natural:'tree'});tree.properties.kind='tree';const first=f.add(3,[f.grass]),mixed=f.add(4,[f.forest,tree]);f.index.tiles=[first,mixed];
  const result=await buildEnvironmentGroundOverview(f.input(),{caps:{inputFeatures:2}});assert.deepEqual(f.reads,[f.index.city_boundary.path,first.path]);assert.deepEqual(result.receipt.unreadInputs,[{kind:'leaf',descriptor:mixed,reason:'input-feature-budget'}]);assert.equal(result.receipt.inputDeclaredFeatures,1);assert.equal(result.receipt.inputDecodedFeatures,1);assert.equal(result.receipt.inputFeatures,1);assert.equal(result.receipt.inputComplete,false);
 }
});

test('abort/deadline are explicit and cancellation during an input read cannot return a partial output',async()=>{
 const f=fixture(),abort=new AbortController();abort.abort();await assert.rejects(buildEnvironmentGroundOverview(f.input(),{signal:abort.signal}),{name:'AbortError'});assert.equal(f.reads.length,0);
 await assert.rejects(buildEnvironmentGroundOverview(f.input(),{deadline:Date.now()-1}),/deadline/);assert.equal(f.reads.length,0);
 const pending=new AbortController(),input=f.input();await assert.rejects(buildEnvironmentGroundOverview({...input,readAsset:async(asset,signal)=>{const bytes=await input.readAsset(asset,signal);pending.abort();return bytes;}},{signal:pending.signal}),{name:'AbortError'});assert.deepEqual(f.reads,[f.index.city_boundary.path]);
});

test('explicit caps can only tighten input, output and actual packed geometry budgets',async()=>{
 const f=fixture();await assert.rejects(buildEnvironmentGroundOverview(f.input(),{caps:{vertices:limits.vertices+1}}),/exceeds original limit/);assert.equal(f.reads.length,0);
 await assert.rejects(buildEnvironmentGroundOverview(f.input(),{caps:{inputRawBytes:1}}),/input budget/);assert.equal(f.reads.length,0);
 const result=await buildEnvironmentGroundOverview(f.input(),{caps:{leaves:1,vertices:8,indices:24}});assert.equal(result.files.length,1);assert(result.receipt.output.vertices<=8);assert(result.receipt.output.indices<=24);assert(result.receipt.omitted.some(v=>v.reason==='cohort-packed-budget'));assert.equal(result.receipt.caps.vertices,8);assert.equal(result.receipt.caps.rawBytes,limits.rawBytes);assert.equal(result.receipt.inputRawBytes,result.receipt.inputSourceLeafRawBytes+result.receipt.inputBoundaryRawBytes+result.receipt.inputIndexRawBytes);
});

test('opt-in far mesh reduces exact repeated ground geometry while retaining both complete canonical sources and holes',async()=>{
 const f=fixture(),other=structuredClone(f.grass);other.id='osm/way/10';f.index.tiles=[f.add(9,[f.grass,other])];
 const before=groundOverviewJSON([f.grass,other]),result=await buildEnvironmentGroundOverview(f.input(),{farCompaction:true});
 const asset=result.index.ground_far_mesh;assert(asset);assert.match(asset.path,/\/ground-overview-[a-f0-9]{64}\.json\.gz$/);
 assert.equal(result.receipt.displayCompaction.status,'prepared-not-runtime-adopted');
 const file=result.files.find(file=>file.path===asset.path),raw=gunzipSync(file.bytes),document=JSON.parse(raw);
 assert.equal(sha(file.bytes),asset.sha256);assert.equal(sha(raw),asset.uncompressed_sha256);assert.equal(raw.length,asset.uncompressed_bytes);
 assert.deepEqual(Object.keys(asset).sort(),['path','sha256','bytes','compression','uncompressed_bytes','uncompressed_sha256'].sort());
 assert.equal(document.schema,'environment-ground-far-mesh-v1');assert.equal(document.encoding,'f32le-xyz-role4-u32le');
 assert.equal(document.vertex_count,document.proof.canonical_vertices/2);assert.equal(document.index_count,document.proof.canonical_indices/2);
 assert.equal(document.source_polygon_count,2);assert.equal(document.proof.position_error_m,0);
 assert.equal(document.proof.packed_bytes_4stride,16*document.vertex_count+4*document.index_count);
 assert.equal(document.proof.fixed_up_normal_bytes,12);assert.equal(document.proof.packed_bytes_including_up_normal,document.proof.packed_bytes_4stride+12);
 assert.equal(Buffer.from(document.vertices_f32le_base64,'base64').length,document.vertex_count*16);
 assert.equal(Buffer.from(document.indices_u32le_base64,'base64').length,document.index_count*4);
 assert(document.proof.expanded_unique_oriented_triangles_equal);assert(document.proof.all_seven_attributes_bit_exact);
 assert.deepEqual(document.source_feature_ids,[f.grass.id,other.id].sort());
 assert.deepEqual(document.canonical_ground_tiles,result.index.ground_tiles.map(t=>({path:t.path,sha256:t.sha256,uncompressed_sha256:t.uncompressed_sha256})));
 const canonical=result.index.ground_tiles.flatMap(tile=>JSON.parse(gunzipSync(result.files.find(file=>file.path===tile.path).bytes)).features);
 assert.equal(groundOverviewJSON(canonical),before);assert.equal(canonical[0].geometry.coordinates.length,2);
 assert(Object.is(canonical[0].properties.retainedUnknownMetadata.negativeZero,-0));
 assert.equal(groundOverviewJSON([f.grass,other]),before);assert.equal(result.receipt.sourceGeometryChanged,false);
 assert.equal(result.receipt.output.leaves,result.index.ground_tiles.length+1);assert(result.receipt.output.leaves<=limits.leaves);
 assert.equal(result.receipt.output.rawBytes,result.receipt.output.canonicalRawBytes+raw.length);assert(result.receipt.output.rawBytes<=limits.rawBytes);
 assert(result.receipt.displayCompaction.stats.outputGPUBytes<result.receipt.displayCompaction.stats.inputGPUBytes);
});

test('shared-UP packing reports zero invented welding, and combined source-plus-mesh budgets preserve canonical fallback',async()=>{
 const f=fixture(),plain=await buildEnvironmentGroundOverview(f.input()),packed=await buildEnvironmentGroundOverview(f.input(),{farCompaction:true});
 assert(packed.index.ground_far_mesh);assert.equal(packed.receipt.displayCompaction.stats.weldedVertices,0);assert.equal(packed.receipt.displayCompaction.stats.duplicateTriangles,0);
 assert(packed.receipt.displayCompaction.proof.packed_bytes_including_up_normal<packed.receipt.displayCompaction.proof.canonical_bytes_7stride);
 assert.deepEqual(packed.index.ground_tiles,plain.index.ground_tiles);
 for(const tile of plain.index.ground_tiles)assert.deepEqual(packed.files.find(file=>file.path===tile.path).bytes,plain.files.find(file=>file.path===tile.path).bytes);
 const limited=fixture(),other=structuredClone(limited.grass);other.id='osm/way/10';limited.index.tiles=[limited.add(9,[limited.grass,other])];
 const result=await buildEnvironmentGroundOverview(limited.input(),{farCompaction:true,caps:{leaves:1}});
 assert.equal(result.index.ground_far_mesh,undefined);assert.equal(result.receipt.displayCompaction.status,'held');
 assert.equal(result.receipt.displayCompaction.reason,'combined-geometry-leaf-budget');assert.equal(result.files.length,1);
 const canonical=JSON.parse(gunzipSync(result.files[0].bytes)).features;assert.equal(groundOverviewJSON(canonical),groundOverviewJSON([limited.grass,other]));
});

test('mesh-only input reads the accepted ground cohort without native partitions and preserves source polygon units',async()=>{
 const f=fixture(),cohort=await buildEnvironmentGroundOverview(f.input());
 for(const file of cohort.files)f.files.set(file.path,file.bytes);
 const before=groundOverviewJSON(cohort.index),reads=[];
 const result=await buildEnvironmentGroundOverview({indexBytes:Buffer.from(before),readAsset:async(asset,signal)=>{signal?.throwIfAborted();reads.push(asset.path);return f.files.get(asset.path);}},{farCompaction:true});
 assert.deepEqual(reads,[f.index.city_boundary.path,...cohort.index.ground_tiles.map(tile=>tile.path)]);
 assert.deepEqual(result.index.ground_tiles,cohort.index.ground_tiles);assert.deepEqual(result.index.tiles,cohort.index.tiles);assert.equal(groundOverviewJSON(cohort.index),before);
 assert.equal(result.files.length,1,'only the new mesh is emitted; canonical source files are inherited');
 const document=JSON.parse(gunzipSync(result.files[0].bytes));assert.equal(document.source_feature_ids.length,2);
 assert.equal(document.source_polygon_count,3,'one grass polygon plus both native woodland components');
 assert.deepEqual(document.canonical_ground_tiles,cohort.index.ground_tiles.map(tile=>({path:tile.path,sha256:tile.sha256,uncompressed_sha256:tile.uncompressed_sha256})));
 assert.equal(result.receipt.nativeTilesOrPartitionsRead,false);assert.equal(result.receipt.canonicalAssetsRewritten,false);
 assert.equal(result.receipt.inputMode,'existing-canonical-ground-cohort-only');assert.equal(result.receipt.sourcePolygonCount,3);
 assert.equal(result.receipt.output.rawBytes,result.receipt.output.canonicalRawBytes+result.index.ground_far_mesh.uncompressed_bytes);
 const bad=structuredClone(cohort.index);bad.ground_tiles[0].uncompressed_sha256='e'.repeat(64);
 await assert.rejects(buildEnvironmentGroundOverview({indexBytes:Buffer.from(groundOverviewJSON(bad)),readAsset:async asset=>f.files.get(asset.path)},{farCompaction:true}),/raw byte\/SHA mismatch/);
});
