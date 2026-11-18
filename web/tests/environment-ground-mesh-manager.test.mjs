import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry="export {installEnvironmentScene} from './environment-scene-manager';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';export {environmentGroundMeshEncodedRetainedBytes} from './environment-ground-mesh';";
const result=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',plugins:[{name:'mesh-renderer-fixture',setup(b){b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.fixtureRenderer(options);',loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const pbf='a'.repeat(64),boundarySHA='b'.repeat(64),snapshot='mesh-manager-fixture',MiB=1024**2;
const hash=n=>n.toString(16).padStart(64,'0'),sha=raw=>createHash('sha256').update(raw).digest('hex');
const near=[10,50,10.02,50.02],far=[10,50,11,51],square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const tile=(id,bbox,kinds={green:1})=>({id:'tile-'+id,tile_key:String(id),bbox,kinds,feature_count:Object.values(kinds).reduce((a,b)=>a+b,0),path:'/safety/environment/berlin/tile-'+id+'.json',bytes:1024,sha256:hash(id)});
function source(t){
 let at=0;const features=[];for(const [kind,count]of Object.entries(t.kinds))for(let i=0;i<count;i++)features.push({type:'Feature',id:'osm/way/'+(Number(BigInt('0x'+t.sha256))*10+at++),geometry:kind==='tree'?{type:'Point',coordinates:[10.01,50.01]}:{type:'Polygon',coordinates:[square(t.bbox)]},properties:{kind,osmTags:{landuse:'grass'},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:pbf,source_boundary_sha256:boundarySHA}});
 return{type:'FeatureCollection',schema_version:1,city:'berlin',features};
}
function encode(values,float){const bytes=Buffer.alloc(values.length*4);values.forEach((value,i)=>float?bytes.writeFloatLE(value,i*4):bytes.writeUInt32LE(value,i*4));return bytes.toString('base64');}
function fixture({box=far,zoom=12.1,mutateMesh,mutateAsset,delayMesh=false,rendererReject=false}={}){
 const native=tile(1,near,{green:1,tree:1,water:1}),tiles=[native,...Array.from({length:33},(_,i)=>tile(20+i,[10.4+i*.001,50.4,10.401+i*.001,50.401]))];
 const canonical={...tile(900,far),path:'/safety/environment/berlin/ground-overview-'+hash(900)+'.json.gz',compression:'gzip',bytes:256,uncompressed_bytes:1024,uncompressed_sha256:hash(901)};
 const canonicalTuples=[{path:canonical.path,sha256:canonical.sha256,uncompressed_sha256:canonical.uncompressed_sha256}];
 const document={schema:'environment-ground-far-mesh-v1',encoding:'f32le-xyz-role4-u32le',city:'berlin',source_pbf_sha256:pbf,source_boundary_sha256:boundarySHA,source_snapshot:snapshot,canonical_ground_tiles:canonicalTuples,source_feature_ids:['osm/way/9000'],source_polygon_count:1,origin:[10.01,50.01],vertex_count:3,index_count:3,
  vertices_f32le_base64:encode([-0,.01,0,4,10,.01,0,4,0,.01,10,4],true),indices_u32le_base64:encode([0,1,2],false),
  proof:{canonical_vertices:3,canonical_indices:3,canonical_bytes_7stride:96,packed_bytes_4stride:60,fixed_up_normal_bytes:12,packed_bytes_including_up_normal:72,position_error_m:0,welded_vertices:0,duplicate_triangles:0,expanded_unique_oriented_triangles_equal:true,all_seven_attributes_bit_exact:true}};
 mutateMesh?.(document);const raw=Buffer.from(JSON.stringify(document)),physical=gzipSync(raw);
 const meshAsset={path:'/safety/environment/berlin/ground-overview-'+sha(physical)+'.json.gz',compression:'gzip',bytes:physical.length,sha256:sha(physical),uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw)};mutateAsset?.(meshAsset);
 const budget=api.createResourceBudget({limitBytes:512*MiB,recentLimitBytes:32*MiB}),store=api.createChunkResourceStore({budget}),leases=[];
 const originalAcquire=store.acquire;
 store.acquire=request=>{const lease=originalAcquire(request);if(request.contentKey.includes('environment-ground-mesh-v1')){const release=lease.release,row={lease,releases:0};lease.release=()=>{row.releases++;release();};leases.push(row);}return lease;};
 const publications=[],reads=[],waiting=[],layers=new Map(),events=new Map(),renderers=[];let view=box,level=zoom,sourceDocument;
 const liveLeases=()=>leases.filter(row=>!row.lease.released);
 const map={getZoom:()=>level,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>({lng:(view[0]+view[2])/2,lat:(view[1]+view[3])/2}),getBounds:()=>({getWest:()=>view[0],getSouth:()=>view[1],getEast:()=>view[2],getNorth:()=>view[3]}),getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),removeLayer:id=>layers.delete(id),on:(name,fn)=>events.set(name,fn),off:name=>events.delete(name),triggerRepaint(){},
  fixtureRenderer(options){const renderer={options,layer:{id:'fixture-mesh'},enabled:false,destroys:0,
   setFeatures(features,_bounds,_water,_camera,detail){publications.push({kind:'features',detail,kinds:features.map(f=>f.properties.kind),liveMeshInputsAtCall:liveLeases().length});},
   setGroundMesh(mesh){assert.equal(liveLeases().length,1,'the real input lease must still be live at renderer publication');assert.equal(mesh.data,sourceDocument,'inspection must retain the one encoded source object');assert.ok(budget.holders(64).some(row=>row.label?.includes('environment-ground-mesh-v1')&&row.category==='decoded'&&row.bytes===api.environmentGroundMeshEncodedRetainedBytes(raw.length)),'the encoded input is paid separately before renderer work');if(rendererReject)throw Error('Fixture renderer mesh publication refused');publications.push({kind:'mesh',mesh});},
   setEnabled(v){this.enabled=v;},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){this.destroys++;},
   stats:{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:0,omitted:0},treeRows:{truncated:false},woodland:{truncated:false}}};renderers.push(renderer);return renderer;}};
 const manifest={schema_version:1,city:'berlin',source_pbf_sha256:pbf,source_snapshot:snapshot,city_boundary:{path:'/safety/environment/berlin/boundary.json',bytes:128,sha256:boundarySHA},tiles,ground_tiles:[canonical],ground_far_mesh:meshAsset};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:pbf,within_expected_area:true,geometry:{type:'Polygon',coordinates:[square([9,49,12,52])]}};
 const manager=api.installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:async(asset,signal,max)=>{
  const name=typeof asset==='string'?asset:asset.path;reads.push({path:name,asset,signal,max});if(name.endsWith('/index.json'))return manifest;if(name.endsWith('/boundary.json'))return boundary;
  if(name===meshAsset.path){assert.equal(asset.sha256,sha(physical),'fixture reader enforces Asset physical SHA');assert.equal(asset.bytes,physical.length);assert.equal(asset.uncompressed_sha256,sha(raw));assert.equal(asset.uncompressed_bytes,raw.length);assert.ok(asset.bytes<=max&&asset.uncompressed_bytes<=MiB);sourceDocument=JSON.parse(gunzipSync(physical));if(delayMesh)return new Promise(resolve=>waiting.push({resolve,signal,value:sourceDocument}));return sourceDocument;}
  if(name===canonical.path)throw Error('Mesh fallback must not fetch the canonical GeoJSON again');
  const t=tiles.find(t=>t.path===name);assert.ok(t,'known native fixture asset');return source(t);
 }});
 return{manager,store,budget,leases,liveLeases,publications,reads,waiting,renderers,canonical,meshAsset,raw,document,move(next,z=level){view=next;level=z;events.get('moveend')();},close(){manager.destroy();store.destroy();}};
}
async function turns(n=6){for(let i=0;i<n;i++)await new Promise(resolve=>setImmediate(resolve));}
async function until(predicate){for(let i=0;i<200;i++){if(predicate())return;await turns(1);}throw Error('Packed manager fixture did not settle');}
const settled=f=>['ready','partial','error'].includes(f.manager.stats.state),meshReads=f=>f.reads.filter(r=>r.path===f.meshAsset.path);

test('far mesh reads only its registered asset and holds one paid encoded source until clear, without manager typed decode',async t=>{
 const original=globalThis.atob;globalThis.atob=()=>{throw Error('Manager must not decode a ground mesh');};t.after(()=>{globalThis.atob=original;});
 const f=fixture();
 try{
  f.manager.setMode(true);await until(()=>settled(f));assert.equal(f.manager.stats.state,'partial');assert.equal(f.manager.stats.groundSource,'packed-source-mesh');assert.equal(f.manager.stats.groundSelection.route,'mesh');
  assert.equal(meshReads(f).length,1);assert.ok(!f.reads.some(r=>r.path===f.canonical.path));assert.equal(f.publications.length,1);assert.equal(f.publications[0].kind,'mesh');
  assert.equal(f.liveLeases().length,1);assert.equal(f.manager.stats.resources.encodedGroundMesh.pendingSourceLeases,0);assert.equal(f.manager.stats.resources.encodedGroundMesh.publishedSourceLeases,1);assert.equal(f.manager.stats.resources.encodedGroundMesh.retainedEstimateBytes,api.environmentGroundMeshEncodedRetainedBytes(f.raw.length));
  f.move([10,50,10.99,50.99]);await until(()=>settled(f));assert.equal(meshReads(f).length,1);assert.equal(f.publications.length,1,'the same global source mesh is not decoded again for a camera change');
  f.manager.setOffscreen(true);assert.equal(f.liveLeases().length,1,'a resumable pause retains the current publication input');f.manager.setOffscreen(false);await until(()=>settled(f));assert.equal(meshReads(f).length,1);
  f.manager.setMode(false);assert.equal(f.liveLeases().length,0);assert.equal(f.leases[0].lease.value,undefined);assert.equal(f.leases[0].releases,1);assert.ok(!f.budget.holders(64).some(row=>row.label?.includes('environment-ground-mesh-v1')),'the component encoded-input owner delta clears; the pre-existing PreparedBoundary module cache is outside this assertion');
 }finally{f.close();}
});

test('complete native remains preferred, then mesh yields to original full near trees and water only after publication',async()=>{
 const f=fixture({box:near,zoom:14.8});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.equal(f.manager.stats.groundSource,'native-tiles');assert.equal(meshReads(f).length,0);
  f.move(far,12.1);await until(()=>f.manager.stats.groundSource==='packed-source-mesh');assert.equal(f.liveLeases().length,1);const held=f.liveLeases()[0];
  f.move(near,15);await until(()=>f.manager.stats.state==='ready');const full=f.publications.at(-1);assert.equal(full.kind,'features');assert.equal(full.detail,'full');assert.deepEqual(new Set(full.kinds),new Set(['green','tree','water']));assert.equal(full.liveMeshInputsAtCall,1,'the old input is not retired before actual replacement');assert.equal(held.lease.released,true);assert.equal(held.releases,1);assert.equal(f.liveLeases().length,0);
  assert.ok(!f.reads.some(r=>r.path===f.canonical.path));assert.equal(f.manager.stats.resources.encodedGroundMesh.publishedSourceLeases,0);
 }finally{f.close();}
});

test('bad source/cohort/count/SHA or a refused renderer mesh publication cannot replace the old native scene',async()=>{
 for(const failure of ['source','cohort','count','asset','renderer']){
  const f=fixture({box:near,zoom:14.8,mutateMesh:doc=>{if(failure==='source')doc.source_pbf_sha256='f'.repeat(64);if(failure==='cohort')doc.canonical_ground_tiles[0].uncompressed_sha256='f'.repeat(64);if(failure==='count')doc.source_feature_ids.push('osm/way/9001');},mutateAsset:asset=>{if(failure==='asset')asset.sha256='f'.repeat(64);},rendererReject:failure==='renderer'});
  try{
   f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');const previous=f.publications.at(-1),count=f.publications.length;
   f.move(far,12.1);await until(()=>settled(f));assert.equal(f.manager.stats.state,'partial');assert.ok(f.manager.stats.lastError);assert.equal(f.manager.stats.groundSource,'native-tiles');assert.equal(f.renderers[0].enabled,true);assert.equal(f.publications.length,count);assert.equal(f.publications.at(-1),previous);
   assert.equal(f.liveLeases().length,0);assert.ok(f.leases.every(row=>row.lease.value===undefined&&row.releases===1));assert.ok(!f.reads.some(r=>r.path===f.canonical.path));
  }finally{f.close();}
 }
 const oversized=fixture({mutateAsset:asset=>{asset.uncompressed_bytes=MiB+1;}});
 try{oversized.manager.setMode(true);await until(()=>settled(oversized));assert.equal(oversized.manager.stats.state,'error');assert.equal(meshReads(oversized).length,0,'the original single-asset raw bound applies before reading');assert.equal(oversized.liveLeases().length,0);}finally{oversized.close();}
});

test('superseded and destroyed mesh reads release their real source leases and late data cannot publish',async()=>{
 const f=fixture({box:near,zoom:14.8,delayMesh:true});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');const count=f.publications.length;
  f.move(far,12.1);await until(()=>f.waiting.length===1);assert.equal(f.manager.stats.resources.encodedGroundMesh.pendingSourceLeases,1);assert.equal(f.publications.length,count);
  f.move(near,14.8);await until(()=>f.manager.stats.state==='ready');assert.equal(f.waiting[0].signal.aborted,true);assert.equal(f.leases[0].lease.released,true);assert.equal(f.leases[0].releases,1);f.waiting[0].resolve(f.waiting[0].value);await turns();assert.equal(f.publications.length,count);assert.equal(f.manager.stats.resources.encodedGroundMesh.loads,0);
  f.move(far,12.1);await until(()=>f.waiting.length===2);f.manager.destroy();assert.equal(f.waiting[1].signal.aborted,true);assert.equal(f.liveLeases().length,0);f.waiting[1].resolve(f.waiting[1].value);await turns();assert.equal(f.publications.length,count);assert.equal(f.renderers[0].destroys,1);assert.ok(f.leases.every(row=>row.releases===1));
 }finally{f.close();}
});
