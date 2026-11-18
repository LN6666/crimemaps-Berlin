import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const compiled=await build({entryPoints:[path.join(safety,'environment-scene-manager.ts')],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',plugins:[{name:'ground-renderer-fixture',setup(b){b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.fixtureRenderer(options);',loader:'js'}));}}]});
const {installEnvironmentScene}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const pbf='a'.repeat(64),boundarySHA='b'.repeat(64),snapshot='local-ground-fixture';
const hash=n=>n.toString(16).padStart(64,'0'),square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const near=[10,50,10.02,50.02],far=[10,50,11,51];
function tile(n,bbox=near,kinds={green:1},bytes=1024){
 return{id:'tile-'+n,tile_key:String(n),bbox,kinds,feature_count:Object.values(kinds).reduce((a,b)=>a+b,0),path:'/safety/environment/berlin/tile-'+n+'.json',sha256:hash(n),bytes};
}
const coarse=()=>({...tile(900,far),path:'/safety/environment/berlin/ground-900.json.gz',compression:'gzip',bytes:256,uncompressed_bytes:1024,uncompressed_sha256:hash(901)});
function payload(t){
 let at=0;const features=[];
 for(const [kind,count]of Object.entries(t.kinds))for(let i=0;i<count;i++)features.push({type:'Feature',id:'osm/way/'+(Number(BigInt('0x'+t.sha256))*10+(at++)),geometry:kind==='tree'?{type:'Point',coordinates:[t.bbox[0],t.bbox[1]]}:{type:'Polygon',coordinates:[square(t.bbox)]},properties:{kind,osmTags:{landuse:'grass'},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:pbf,source_boundary_sha256:boundarySHA}});
 return{type:'FeatureCollection',schema_version:1,city:'berlin',features};
}
function farTiles(){return Array.from({length:33},(_,i)=>tile(50+i,[10.4+i*.001,50.4,10.401+i*.001,50.401]));}
function fixture({tiles=[tile(1),...farTiles()],pages,box=far,readLeaf,pagePins={}}={}){
 const overview=coarse(),allTiles=pages?pages.flatMap(p=>p.tiles):tiles;
 const reads=[],publications=[],events=new Map(),layers=new Map(),renderers=[];let view=box,zoom=12.1;
 const map={getZoom:()=>zoom,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>({lng:(view[0]+view[2])/2,lat:(view[1]+view[3])/2}),getBounds:()=>({getWest:()=>view[0],getSouth:()=>view[1],getEast:()=>view[2],getNorth:()=>view[3]}),getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),removeLayer:id=>layers.delete(id),on:(name,fn)=>events.set(name,fn),off:name=>events.delete(name),triggerRepaint(){},
  fixtureRenderer(options){const renderer={options,layer:{id:'fixture-ground'},enabled:false,destroyed:0,setFeatures(features,bounds,_water,_camera,detail){publications.push({features:[...features],ids:features.map(f=>f.id),kinds:features.map(f=>f.properties.kind),bounds:[...bounds],detail});},setEnabled(v){this.enabled=v;},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){this.destroyed++;},stats:{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:0,omitted:0},treeRows:{truncated:false},woodland:{truncated:false}}};renderers.push(renderer);return renderer;}};
 const manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:pbf,city_boundary:{path:'/safety/environment/berlin/boundary.json',bytes:128,sha256:boundarySHA},ground_tiles:[overview],...(pages?{index_type:'viewport-partitioned-v1',partitions:pages.map(p=>p.asset)}:{tiles})};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:pbf,within_expected_area:true,geometry:{type:'Polygon',coordinates:[square([9,49,12,52])]}};
 const manager=installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,read:async(asset,signal,max)=>{const name=typeof asset==='string'?asset:asset.path;reads.push({asset,signal,max,path:name});if(name.endsWith('/index.json'))return manifest;if(name.endsWith('/boundary.json'))return boundary;const page=pages?.find(p=>p.asset.path===name);if(page)return{schema_version:1,city:'berlin',source_pbf_sha256:pbf,source_snapshot:snapshot,source_boundary_sha256:boundarySHA,...pagePins,tiles:page.tiles};const t=name===overview.path?overview:allTiles.find(t=>t.path===name);assert.ok(t,'known fixture asset '+name);return readLeaf?readLeaf(t,signal,overview):payload(t);}});
 return{manager,reads,publications,renderers,overview,manifest,move(next,level=zoom){view=next;zoom=level;events.get('moveend')();}};
}
async function until(predicate){for(let i=0;i<150;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Ground fixture did not settle');}
const settled=f=>['ready','partial','error'].includes(f.manager.stats.state);
const leafReads=f=>f.reads.filter(r=>r.path.includes('/tile-')||r.path.includes('/ground-'));
function page(n,bbox,tiles,bytes=1024**2){return{asset:{id:'page-'+n,bbox,path:'/safety/environment/berlin/page-'+n+'.json',sha256:hash(1000+n),bytes},tiles};}

test('overview atomically becomes complete local native ground and returns, while full near retains trees and water',async()=>{
 const native=tile(1,near,{green:1,tree:1,water:1}),waiting=[];let first=true;
 const nativeValue=payload(native);nativeValue.features[0].geometry.coordinates.push(square([10.005,50.005,10.01,50.01]).reverse());const expected=structuredClone(nativeValue);
 const f=fixture({tiles:[native,...farTiles()],readLeaf:(t,signal,overview)=>t===native?(first?(first=false,new Promise(resolve=>waiting.push({resolve,signal}))):nativeValue):payload(t)});
 try{
  f.manager.setMode(true);await until(()=>settled(f));assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.equal(f.manager.stats.state,'partial');
  const previous=f.publications.at(-1),count=f.publications.length;
  f.move(near,14.8);await until(()=>waiting.length===1);assert.equal(f.publications.length,count,'the old overview remains until both readers complete');assert.equal(f.renderers[0].enabled,true);
  waiting[0].resolve(nativeValue);await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.manager.stats.groundSource,'native-tiles');assert.equal(f.manager.stats.groundSelection.nativeClosureComplete,true);
  const local=f.publications.at(-1);assert.deepEqual(local.kinds,['green']);assert.deepEqual(local.features[0],expected.features[0],'native ID/tags/rings/holes and source pins remain exact');assert.ok(!local.ids.some(id=>previous.ids.includes(id)));
  assert.ok(f.manager.stats.groundSelection.rawBytes<=4*1024**2);assert.equal(f.manager.stats.groundSelection.selectedLeaves,1);
  f.move(far,12.1);await until(()=>f.manager.stats.state==='partial');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.deepEqual(f.publications.at(-1).kinds,['green']);
  f.move(near,14.8);await until(()=>f.manager.stats.state==='ready');assert.equal(f.manager.stats.groundSource,'native-tiles');
  f.move(near,15);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'full');assert.deepEqual(new Set(f.publications.at(-1).kinds),new Set(['green','tree','water']));
  f.move(far,12.1);await until(()=>f.manager.stats.state==='partial');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.deepEqual(f.publications.at(-1).kinds,['green']);
  assert.ok(leafReads(f).every(r=>r.max<=1024**2));assert.equal(f.manager.stats.resources.leafProductionLimit,2);
 }finally{f.manager.destroy();}
});

test('a local replacement cannot read a cropped native subset around the 32-leaf or 4MiB limits',async()=>{
 for(const tiles of [Array.from({length:33},(_,i)=>tile(i+1,near)),Array.from({length:5},(_,i)=>tile(i+1,near,{green:1},1024**2))]){
  const f=fixture({tiles,box:near});
  try{f.manager.setMode(true);await until(()=>settled(f));assert.equal(f.manager.stats.state,'partial');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.match(f.manager.stats.groundSelection.reason,/leaf-budget/);assert.deepEqual(leafReads(f).map(r=>r.path),[f.overview.path]);}finally{f.manager.destroy();}
 }
});

test('partition closure checks metadata budget before I/O and promotes only the complete visible page',async()=>{
 const native=tile(1),pages=[page(1,near,[native]),page(2,[10.3,50.3,10.4,50.4],farTiles().slice(0,16)),page(3,[10.4,50.4,10.6,50.6],farTiles().slice(16))],f=fixture({pages});
 try{
  f.manager.setMode(true);await until(()=>settled(f));assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.match(f.manager.stats.groundSelection.reason,/metadata-budget/);assert.equal(f.reads.filter(r=>r.path.includes('/page-')).length,0);
  f.move(near,14.8);await until(()=>f.manager.stats.state==='ready');assert.equal(f.manager.stats.groundSource,'native-tiles');assert.equal(f.reads.filter(r=>r.path.includes('/page-')).length,1);assert.ok(f.manager.stats.metadataRawBytes<=2*1024**2);assert.deepEqual(f.publications.at(-1).ids,payload(native).features.map(f=>f.id));
 }finally{f.manager.destroy();}
 const many=fixture({pages:Array.from({length:17},(_,i)=>page(i+10,near,[tile(i+10)],128)),box:near});
 try{many.manager.setMode(true);await until(()=>settled(many));assert.equal(many.manager.stats.state,'partial');assert.match(many.manager.stats.groundSelection.reason,/metadata-budget/);assert.equal(many.reads.filter(r=>r.path.includes('/page-')).length,0);}finally{many.manager.destroy();}
});

test('bad page or leaf source pins never publish native ready and retain the bounded overview',async()=>{
 for(const bad of ['page','leaf']){
  const native=tile(1),sibling=tile(2),waiting=[],f=fixture({...(bad==='page'?{pages:[page(1,near,[native])],pagePins:{source_pbf_sha256:'f'.repeat(64)}}:{tiles:[native,sibling],readLeaf:(t,signal,overview)=>{if(t===sibling)return new Promise(resolve=>waiting.push({resolve,signal}));const value=payload(t);if(t!==overview)value.features[0].properties.source_pbf_sha256='f'.repeat(64);return value;}}),box:near});
  try{
   f.manager.setMode(true);await until(()=>settled(f));assert.equal(f.manager.stats.state,'partial');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.equal(f.manager.stats.groundSelection.nativeClosureComplete,false);assert.match(f.manager.stats.lastError,/environment|binding/i);assert.deepEqual(f.publications.at(-1).ids,payload(f.overview).features.map(f=>f.id));assert.equal(f.publications.length,1);
   if(bad==='leaf'){assert.equal(waiting.length,1);assert.equal(waiting[0].signal.aborted,true,'the other reader cannot remain part of the replacement after one leaf fails');waiting[0].resolve(payload(sibling));for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,1);assert.equal(f.manager.stats.groundSource,'exact-source-overview');}
  }finally{f.manager.destroy();}
 }
});

test('native identity conflicts and geometry overflow fall back, while identical source duplicates are published once',async()=>{
 for(const scenario of ['identical','conflict','geometry']){
  const a=tile(1),b=tile(2);let tiles=[a,b];
  if(scenario==='geometry')tiles=[a];
  const f=fixture({tiles,box:near,readLeaf:(t,_signal,overview)=>{
   if(t===overview)return payload(t);
   const value=payload(t);
   if(scenario==='geometry'){
    const ring=Array.from({length:20001},(_,i)=>{const angle=i/20001*Math.PI*2;return[10.01+.005*Math.cos(angle),50.01+.005*Math.sin(angle)];});ring.push(ring[0]);value.features[0].geometry.coordinates=[ring];
   }else{value.features[0].id='osm/way/1';if(scenario==='conflict'&&t===b)value.features[0].properties.osmTags.landuse='forest';}
   return value;
  }});
  try{
   f.manager.setMode(true);await until(()=>settled(f));
   if(scenario==='identical'){assert.equal(f.manager.stats.state,'ready');assert.equal(f.manager.stats.groundSource,'native-tiles');assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);}
   else{assert.equal(f.manager.stats.state,'partial');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert.match(f.manager.stats.lastError,scenario==='conflict'?/Conflicting.*identity/:/geometry budget/);assert.equal(f.publications.length,1);}
  }finally{f.manager.destroy();}
 }
});

test('a superseded local read and a destroyed request cannot replace the restored overview late',async()=>{
 const native=tile(1),waiting=[],f=fixture({tiles:[native,...farTiles()],readLeaf:(t,signal,overview)=>t===native?new Promise(resolve=>waiting.push({resolve,signal})):payload(t)});
 try{
  f.manager.setMode(true);await until(()=>settled(f));f.move(near,14.8);await until(()=>waiting.length===1);
  f.move(far,12.1);await until(()=>f.manager.stats.state==='partial');assert.equal(waiting[0].signal.aborted,true);
  const count=f.publications.length;waiting[0].resolve(payload(native));for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,count);assert.equal(f.manager.stats.groundSource,'exact-source-overview');
  f.move(near,14.8);await until(()=>waiting.length===2);f.manager.destroy();assert.equal(waiting[1].signal.aborted,true);waiting[1].resolve(payload(native));for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,count);assert.equal(f.renderers[0].destroyed,1);
 }finally{f.manager.destroy();}
});
