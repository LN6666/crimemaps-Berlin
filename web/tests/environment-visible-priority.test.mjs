import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const result=await build({entryPoints:[path.join(safety,'environment-scene-manager.ts')],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true,plugins:[{name:'renderer-only-fixture',setup(b){b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.createFixtureRenderer(options);',loader:'js'}));}}]});
const {installEnvironmentScene}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const sourceSHA='a'.repeat(64),boundarySHA='b'.repeat(64),snapshot='fixture';
const hash=n=>n.toString(16).padStart(64,'0');
const square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const tile=(n,bbox,kinds={tree:1},bytes=1024)=>({id:'tile-'+String(n).padStart(3,'0'),tile_key:String(n),bbox,kinds,feature_count:1,path:'/safety/environment/berlin/tile-'+n+'.json',sha256:hash(n),bytes});
function payload(t){const kind=t.kinds?.water?'water':t.kinds?.water_line?'water_line':t.kinds?.green?'green':'tree',bbox=t.bbox;return{type:'FeatureCollection',schema_version:1,city:'berlin',features:[{type:'Feature',id:'osm/way/'+Number(BigInt('0x'+t.sha256)),geometry:['water','green'].includes(kind)?{type:'Polygon',coordinates:[square(bbox)]}:kind==='water_line'?{type:'LineString',coordinates:[[bbox[0],bbox[1]],[bbox[2],bbox[3]]]}:{type:'Point',coordinates:[bbox[0],bbox[1]]},properties:{kind,osmTags:{},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:sourceSHA,source_boundary_sha256:boundarySHA}}]};}
function fixture({tiles=[],pages,box=[10,50,10.02,50.02],centre={lng:10.01,lat:50.01},pitch=70,readTile,frameClock,rendererStats={}}={}){
 const reads=[],allReads=[],publications=[],renderers=[],events=new Map(),layers=new Map();let currentBox=box,currentCentre=centre,zoom=18;
 const createFixtureRenderer=options=>{
  const renderer={options,removals:0,destroys:0,reflectionResets:0,enabled:false,layer:{id:'fixture',onRemove(){renderer.removals++;}},setFeatures(features,bounds,_water,_camera,detail='full'){publications.push({ids:features.map(f=>f.id),kinds:features.map(f=>f.properties.kind),bounds:[...bounds],detail});},setEnabled(v){this.enabled=v;},setReflectionSource(v){this.reflectionSource=v;},setSceneEnvironment(v){this.environment=v;},setOffscreen(v){this.offscreen=v;},setVisible(v){this.visible=v;},setReducedMotion(v){this.reducedMotion=v;},resetPlanarReflectionGPU(){this.reflectionResets++;},destroy(){this.destroys++;},stats:{animationActive:false,omittedTrees:0,heldWater:0,hardSurfaceDisplay:{captureStale:false},greenGround:{held:0,omitted:0},treeRows:{truncated:false},woodland:{truncated:false},...rendererStats}};
  renderers.push(renderer);return renderer;
 };
 const map={createFixtureRenderer,getZoom:()=>zoom,getPitch:()=>pitch,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>currentCentre,getBounds:()=>({getWest:()=>currentBox[0],getSouth:()=>currentBox[1],getEast:()=>currentBox[2],getNorth:()=>currentBox[3]}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>{layers.get(id)?.onRemove();layers.delete(id);},on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),triggerRepaint(){}};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:sourceSHA,within_expected_area:true,geometry:{type:'Polygon',coordinates:[square([9,49,12,52])]}};
 const manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary:{path:'/safety/environment/berlin/boundary.json',bytes:100,sha256:boundarySHA},...(pages?{index_type:'viewport-partitioned-v1',partitions:pages.map(p=>p.asset)}:{tiles})};
 const manager=installEnvironmentScene({map,city:'berlin',frameClock,beforeLayer:()=>undefined,read:async(asset,signal)=>{const p=typeof asset==='string'?asset:asset.path;allReads.push(p);if(p.endsWith('/index.json'))return manifest;if(p.endsWith('/boundary.json'))return boundary;reads.push({asset,signal});const page=pages?.find(v=>v.asset.path===p);if(page)return{schema_version:1,city:'berlin',tiles:page.tiles};const t=tiles.find(v=>v.path===p)??pages?.flatMap(p=>p.tiles).find(v=>v.path===p);assert.ok(t,'known fixture tile '+p);return readTile?readTile(t,signal):payload(t);}});
 return{manager,reads,allReads,publications,renderers,layers,map,setZoom(value){zoom=value;events.get('moveend')();},move(nextBox,nextCentre){currentBox=nextBox;currentCentre=nextCentre;events.get('moveend')();}};
}
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Fixture did not settle');}

test('warm pauses reuse the exact published geometry while a changed view still rebuilds',async()=>{
 const t=tile(1,[10.005,50.005,10.015,50.015],{green:1}),f=fixture({tiles:[t],pitch:0});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.publications.length,1);const renderer=f.renderers[0];
  for(const [pause,resume] of [[()=>f.manager.setVisible(false),()=>f.manager.setVisible(true)],[()=>f.manager.setOffscreen(true),()=>f.manager.setOffscreen(false)],[()=>f.manager.suspend(),()=>f.manager.resume()]]){
   pause();assert.equal(renderer.enabled,false);resume();await until(()=>f.manager.stats.state==='ready');
   assert.equal(renderer.enabled,true);assert.equal(f.publications.length,1,'warm resume must not retriangulate or regenerate unchanged trees');
  }
  f.manager.resume();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,1);
  f.move([10.001,50.001,10.021,50.021],{lng:10.011,lat:50.011});await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.publications.length,2);assert.equal(f.reads.length,1,'changed bounds still select from the valid warm source');
  f.manager.setMode(false);f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.length,3,'explicit teardown invalidates publication identity');
 }finally{f.manager.destroy();}
});

test('one failed environment leaf aborts the sibling before it can publish after the error',async()=>{
 const a=tile(1,[10.005,50.005,10.008,50.008]),b=tile(2,[10.009,50.009,10.012,50.012]),waiting=[];
 const f=fixture({tiles:[a,b],pitch:0,readTile:(t,signal)=>t===a?Promise.reject(Error('Rejected leaf')):new Promise(resolve=>waiting.push({resolve,signal}))});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='error');
  assert.equal(waiting.length,1);assert.equal(waiting[0].signal.aborted,true);assert.equal(f.manager.stats.lastError,'Rejected leaf');
  const publications=f.publications.length;waiting[0].resolve(payload(b));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.publications.length,publications);assert.equal(f.manager.stats.loads,0);assert.equal(f.manager.stats.state,'error');assert.equal(f.renderers[0].enabled,false);
 }finally{f.manager.destroy();}
});

test('environment prepares the already verified municipality for greenery without another download or building-provider dependency',async()=>{
 const f=fixture({tiles:[tile(1,[10.005,50.005,10.015,50.015])],pitch:0});
 try{f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');const prepared=f.renderers[0].options.verifiedBoundary;assert.equal(prepared.boundarySHA256,boundarySHA);assert.equal(prepared.covers([10,50,10.02,50.02]),true);assert.equal(prepared.covers([8,50,10,51]),false);assert.equal(f.allReads.length,3);assert.equal(f.allReads.filter(p=>p.endsWith('/boundary.json')).length,1);}finally{f.manager.destroy();}
});

test('ground water wins over closer ground trees and height-padding without changing 32-tile cap',async()=>{
 const water=tile(90,[9,50.005,10.005,50.015],{water:1}),nearWater=tile(91,[10.011,50.008,10.015,50.012],{water_line:1});
 const ground=Array.from({length:25},(_,i)=>tile(i+1,[10.009,50.009,10.011,50.011]));
 const padding=Array.from({length:20},(_,i)=>tile(i+40,[10.01,50.021+i*.0001,10.012,50.022+i*.0001]));
 const f=fixture({tiles:[...padding,...ground,nearWater,water]});f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');
 assert.deepEqual(f.reads.slice(0,2).map(r=>r.asset.id),[nearWater.id,water.id]);assert.equal(f.reads.length,32);assert.ok(f.manager.stats.cacheRawBytes<=4*1024**2);assert.ok(f.manager.stats.cacheTiles<=64);assert.ok(f.manager.stats.cacheRetainedEstimateBytes<=24*1024**2);
 assert.equal(f.manager.stats.partial,true);assert.ok(f.publications.at(-1).ids.includes('osm/way/90'));assert.ok(f.publications.at(-1).ids.includes('osm/way/91'));f.manager.destroy();
});
test('nearest bbox distance uses latitude scale, stable IDs and no inference from water-like names',async()=>{
 const east=tile(1,[10.06,60.049,10.061,60.051]),north=tile(2,[10.049,60.058,10.051,60.059]),unknown=tile(3,[10,60,10.001,60.001]);unknown.id='water-name-without-kind';delete unknown.kinds;
 const f=fixture({tiles:[north,unknown,east],box:[10,60,10.1,60.1],centre:{lng:10.05,lat:60.05}});f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');assert.deepEqual(f.reads.map(r=>r.asset.id),[east.id,north.id,unknown.id]);f.manager.destroy();
 const a=tile(9,[10.009,50.009,10.011,50.011],{water:1}),b=tile(8,a.bbox,{water:1}),g=fixture({tiles:[a,b]});g.manager.setMode(true);await until(()=>g.manager.stats.state!=='loading');assert.deepEqual(g.reads.map(r=>r.asset.id),[b.id,a.id]);g.manager.destroy();
});
test('raw visible budget remains 4 MiB and ground metadata wins before unchanged 2 MiB page cap',async()=>{
 const f=fixture({tiles:Array.from({length:6},(_,i)=>tile(i+1,[10.005,50.005,10.015,50.015],{water:1},1024**2))});f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');assert.equal(f.reads.length,4);assert.equal(f.manager.stats.cacheRawBytes,4*1024**2);assert.equal(f.manager.stats.partial,true);f.manager.destroy();
 const page=(n,bbox)=>({asset:{id:'page-'+n,bbox,path:'/safety/environment/berlin/page-'+n+'.json',sha256:hash(n+100),bytes:1024**2},tiles:[]});
 const far1=page(1,[11,51,11.1,51.1]),far2=page(2,[11.2,51.2,11.3,51.3]),visible=page(3,[10,50,10.02,50.02]),g=fixture({pages:[far1,far2,visible]});g.manager.setMode(true);await until(()=>g.manager.stats.state!=='loading');assert.equal(g.reads.length,2);assert.equal(g.reads[0].asset.id,visible.asset.id);assert.equal(g.manager.stats.metadataRawBytes,2*1024**2);assert.equal(g.manager.stats.partial,true);g.manager.destroy();
});
test('panning cancels old water reads and late old responses never publish over the new view',async()=>{
 const old=[tile(1,[10.005,50.005,10.008,50.008],{water:1}),tile(2,[10.009,50.009,10.012,50.012],{water:1})],fresh=tile(3,[11.005,51.005,11.015,51.015],{water:1}),waiting=[];
 const f=fixture({tiles:[...old,fresh],pitch:0,readTile:(t,signal)=>t===fresh?payload(t):new Promise(resolve=>waiting.push({resolve,t,signal}))});f.manager.setMode(true);await until(()=>waiting.length===2);f.move([11,51,11.02,51.02],{lng:11.01,lat:51.01});await until(()=>f.publications.some(p=>p.ids.includes('osm/way/3')));
 assert.ok(waiting.every(w=>w.signal.aborted));const count=f.publications.length;for(const w of waiting)w.resolve(payload(w.t));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,count);assert.ok(f.publications.every(p=>p.ids.every(id=>id==='osm/way/3')));assert.deepEqual(f.publications.at(-1).bounds,[11,51,11.02,51.02]);assert.equal(f.manager.stats.lastError,undefined);f.manager.destroy();
});

function clockFixture(){
 const subscriptions=new Set();return {subscriptions,subscribe(value){subscriptions.add(value);return()=>subscriptions.delete(value);},wake(){}};
}
function assertReleased(f){
 assert.equal(f.manager.stats.state,'idle');assert.equal(f.manager.customLayer,undefined);assert.equal(f.manager.stats.renderer,undefined);assert.equal(f.layers.size,0);
 assert.equal(f.manager.stats.cacheTiles,0);assert.equal(f.manager.stats.cacheRawBytes,0);assert.equal(f.manager.stats.cacheRetainedEstimateBytes,0);assert.equal(f.manager.stats.metadataRawBytes,0);
}
test('explicit 2D releases environment layer, decoded caches and frame subscription; 3D rebuilds with current settings',async()=>{
 const t=tile(1,[10.005,50.005,10.015,50.015],{water:1}),page={asset:{id:'page-1',bbox:t.bbox,path:'/safety/environment/berlin/page-1.json',sha256:hash(101),bytes:1024},tiles:[t]},clock=clockFixture(),f=fixture({pages:[page],frameClock:clock,pitch:0});
 const reflection={fixture:true},environment={instantISO:'2026-06-21T10:00:00.000Z',sunlight:true,shadows:true,motion:false,quality:'economy'};
 try{
  f.manager.setReflectionSource(reflection);f.manager.setReducedMotion(true);f.manager.setSceneEnvironment(environment);f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.renderers.length,1);assert.equal(clock.subscriptions.size,1);assert.ok(f.manager.stats.cacheRetainedEstimateBytes>0);assert.equal(f.manager.stats.metadataRawBytes,1024);
  const old=f.renderers[0];f.manager.setMode(false);assertReleased(f);assert.equal(clock.subscriptions.size,0);assert.equal(old.removals,1);assert.equal(old.destroys,1);assert.equal(old.enabled,false);
  f.manager.setMode(false);assert.equal(old.destroys,1);
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.equal(f.renderers.length,2);assert.equal(clock.subscriptions.size,1);
  const current=f.renderers[1];assert.notEqual(current,old);assert.equal(current.reflectionSource,reflection);assert.deepEqual(current.environment,environment);assert.equal(current.options.reducedMotion,true);assert.equal(current.enabled,true);
  for(const suffix of ['/index.json','/boundary.json','/page-1.json','/tile-1.json'])assert.equal(f.allReads.filter(p=>p.endsWith(suffix)).length,2,suffix+' reloads after explicit 2D');
  f.manager.setMode(false);assertReleased(f);assert.equal(current.removals,1);assert.equal(current.destroys,1);f.manager.destroy();f.manager.destroy();assert.equal(current.destroys,1);assert.equal(clock.subscriptions.size,0);
 }finally{f.manager.destroy();}
});
test('visibility, offscreen and context suspend preserve resumable environment resources',async()=>{
 const t=tile(1,[10.005,50.005,10.015,50.015],{water:1}),clock=clockFixture(),f=fixture({tiles:[t],frameClock:clock,pitch:0});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');const renderer=f.renderers[0],retained=f.manager.stats.cacheRetainedEstimateBytes;
  const retainedPause=()=>{assert.equal(f.manager.stats.state,'idle');assert.equal(f.renderers.length,1);assert.equal(renderer.destroys,0);assert.equal(renderer.removals,0);assert.equal(f.manager.customLayer,renderer.layer);assert.equal(f.manager.stats.cacheRetainedEstimateBytes,retained);assert.equal(f.manager.stats.cacheTiles,1);assert.equal(clock.subscriptions.size,1);};
  f.manager.setVisible(false);retainedPause();f.manager.setVisible(true);await until(()=>f.manager.stats.state==='ready');
  f.manager.setOffscreen(true);retainedPause();f.manager.setOffscreen(false);await until(()=>f.manager.stats.state==='ready');
  f.manager.suspend();retainedPause();assert.equal(renderer.reflectionResets,1);f.manager.resume();await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.renderers.length,1);assert.equal(f.reads.length,1);assert.equal(renderer.enabled,true);
 }finally{f.manager.destroy();}
});
test('below-ground-floor view releases populated environment resources exactly once and near view rebuilds current settings',async()=>{
 const t=tile(1,[10.005,50.005,10.015,50.015],{water:1}),page={asset:{id:'page-1',bbox:t.bbox,path:'/safety/environment/berlin/page-1.json',sha256:hash(101),bytes:1024},tiles:[t]},clock=clockFixture(),f=fixture({pages:[page],frameClock:clock,pitch:0});
 const reflection={fixture:true},environment={instantISO:'2026-06-21T10:00:00.000Z',sunlight:true,shadows:true,motion:false,quality:'economy'};
 try{
  f.manager.setReflectionSource(reflection);f.manager.setReducedMotion(true);f.manager.setSceneEnvironment(environment);f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  const old=f.renderers[0],retained=f.manager.stats.cacheRetainedEstimateBytes;assert.ok(retained>0);assert.equal(f.manager.stats.metadataRawBytes,1024);
  const retainedPause=()=>{assert.equal(f.manager.stats.state,'idle');assert.equal(old.destroys,0);assert.equal(old.removals,0);assert.equal(f.manager.customLayer,old.layer);assert.equal(f.manager.stats.cacheRetainedEstimateBytes,retained);assert.equal(f.manager.stats.metadataRawBytes,1024);assert.equal(clock.subscriptions.size,1);};
  f.manager.setVisible(false);f.setZoom(10.4);retainedPause();f.manager.setVisible(true);retainedPause();f.setZoom(18);await until(()=>f.manager.stats.state==='ready');
  f.manager.setOffscreen(true);f.setZoom(10.4);retainedPause();f.manager.setOffscreen(false);retainedPause();f.setZoom(18);await until(()=>f.manager.stats.state==='ready');
  f.manager.suspend();f.setZoom(10.4);retainedPause();f.manager.resume();retainedPause();f.setZoom(18);await until(()=>f.manager.stats.state==='ready');
  f.setZoom(NaN);retainedPause();f.setZoom(18);await until(()=>f.manager.stats.state==='ready');
  f.setZoom(10.4);assertReleased(f);assert.equal(clock.subscriptions.size,0);assert.equal(old.removals,1);assert.equal(old.destroys,1);assert.equal(old.enabled,false);
  f.setZoom(10.4);assertReleased(f);assert.equal(old.removals,1);assert.equal(old.destroys,1);
  f.setZoom(18);await until(()=>f.manager.stats.state==='ready');assert.equal(f.renderers.length,2);assert.equal(clock.subscriptions.size,1);
  const current=f.renderers[1];assert.notEqual(current,old);assert.equal(current.reflectionSource,reflection);assert.deepEqual(current.environment,environment);assert.equal(current.options.reducedMotion,true);assert.equal(current.enabled,true);
  for(const suffix of ['/index.json','/boundary.json','/page-1.json','/tile-1.json'])assert.equal(f.allReads.filter(p=>p.endsWith(suffix)).length,2,suffix+' reloaded');
 }finally{f.manager.destroy();}
});
test('late below-ground-floor-aborted environment read cannot recreate the old layer or publish over the returned near view',async()=>{
 const t=tile(1,[10.005,50.005,10.015,50.015],{water:1}),waiting=[];let calls=0;
 const f=fixture({tiles:[t],pitch:0,readTile:(t,signal)=>++calls===1?new Promise(resolve=>waiting.push({resolve,t,signal})):payload(t)});
 try{
  f.manager.setMode(true);await until(()=>waiting.length===1);const old=f.renderers[0];f.setZoom(10.4);assertReleased(f);assert.equal(waiting[0].signal.aborted,true);assert.equal(old.destroys,1);
  f.setZoom(18);await until(()=>f.manager.stats.state==='ready');const count=f.publications.length;
  waiting[0].resolve(payload(t));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.publications.length,count);assert.equal(old.destroys,1);assert.equal(f.manager.stats.cacheTiles,1);assert.equal(f.manager.stats.state,'ready');assert.equal(f.manager.stats.lastError,undefined);
 }finally{f.manager.destroy();}
});
test('late aborted environment reads cannot resurrect 2D resources or overwrite a rebuilt 3D scene',async()=>{
 for(const reenter of [false,true]){
  const t=tile(1,[10.005,50.005,10.015,50.015],{water:1}),waiting=[];let calls=0;
  const f=fixture({tiles:[t],pitch:0,readTile:(t,signal)=>++calls===1?new Promise(resolve=>waiting.push({resolve,t,signal})):payload(t)});
  try{
   f.manager.setMode(true);await until(()=>waiting.length===1);const old=f.renderers[0];f.manager.setMode(false);assertReleased(f);assert.equal(waiting[0].signal.aborted,true);assert.equal(old.destroys,1);
   if(reenter){f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.equal(f.renderers.length,2);}
   const publications=f.publications.length;waiting[0].resolve(payload(t));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
   assert.equal(f.publications.length,publications);assert.equal(old.destroys,1);assert.equal(f.manager.stats.lastError,undefined);
   if(reenter){assert.equal(f.manager.stats.cacheTiles,1);assert.equal(f.manager.stats.loads,1);assert.equal(f.manager.stats.state,'ready');}else{assertReleased(f);assert.equal(f.renderers.length,1);}
  }finally{f.manager.destroy();}
 }
});


test('visible green ground is admitted before dense tree point leaves under the same raw-byte cap',async()=>{
 const pointLeaves=Array.from({length:5},(_,i)=>tile(i+1,[10.009,50.009,10.011,50.011],{tree:1000},1024**2));
 const green=tile(20,[10,50,10.02,50.02],{green:12},10000),water=tile(21,[10,50,10.02,50.02],{water:1},10000);
 const paddingGreen=tile(22,[10,50.021,10.02,50.025],{green:12},10000);
 const f=fixture({tiles:[...pointLeaves,paddingGreen,green,water]});
 try{f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');assert.deepEqual(f.reads.slice(0,2).map(r=>r.asset.id),[water.id,green.id]);assert.ok(f.manager.stats.cacheRawBytes<=4*1024**2);assert.ok(f.reads.length<=32);assert.equal(f.manager.stats.partial,true);assert.ok(f.publications.at(-1).ids.includes('osm/way/20'));}finally{f.manager.destroy();}
});

test('ground-only zoom keeps native green, skips definite tree/water leaves and conservatively filters unknown or mixed leaves',async()=>{
 const box=[10.005,50.005,10.015,50.015],green=tile(1,box,{green:1}),tree=tile(2,box),water=tile(3,box,{water:1}),row=tile(4,box,{tree_row:1}),mixed=tile(5,box,{green:1,tree:1}),unknownGreen=tile(6,box),unknownTree=tile(7,box),unknownEmpty=tile(8,box,{});
 mixed.feature_count=2;delete unknownGreen.kinds;delete unknownTree.kinds;
 const f=fixture({tiles:[tree,water,row,mixed,green,unknownGreen,unknownTree,unknownEmpty],pitch:0,readTile:t=>{
  if(t===unknownGreen||t===unknownEmpty)return payload({...t,kinds:{green:1}});
  if(t===mixed){const p=payload(t);p.features.push({...payload(tree).features[0],id:'osm/node/50'});return p;}
  return payload(t);
 }});
 try{
  f.setZoom(14.5);f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  assert.deepEqual(f.reads.map(r=>r.asset.id).sort(),[green,mixed,unknownGreen,unknownTree,unknownEmpty].map(t=>t.id).sort());
  const published=f.publications.at(-1);assert.equal(published.detail,'ground');assert.deepEqual(published.ids.slice().sort(),['osm/way/1','osm/way/5','osm/way/6','osm/way/8']);assert.ok(published.kinds.every(k=>k==='green'));
  assert.ok(f.manager.stats.cacheRawBytes<=4*1024**2);assert.ok(f.manager.stats.cacheRetainedEstimateBytes<=24*1024**2);
  f.setZoom(14.999);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'ground');assert.equal(f.renderers.length,1);
  f.setZoom(15);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'full');assert.ok(f.publications.at(-1).kinds.includes('water'));assert.ok(f.publications.at(-1).kinds.includes('tree'));assert.equal(f.reads.length,8,'cached source leaves are reused across the tier boundary');
  f.setZoom(10.499);assertReleased(f);
 }finally{f.manager.destroy();}
});

test('full to ground clears old trees and water before a pending leaf resolves; the old tier cannot publish late',async()=>{
 const water=tile(1,[10.005,50.005,10.015,50.015],{water:1}),green=tile(2,[11.005,51.005,11.015,51.015],{green:1}),waiting=[];
 const f=fixture({tiles:[water,green],pitch:0,readTile:(t,signal)=>t===water?payload(t):new Promise(resolve=>waiting.push({resolve,signal}))});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.deepEqual(f.publications.at(-1).kinds,['water']);
  f.move([11,51,11.02,51.02],{lng:11.01,lat:51.01});await until(()=>waiting.length===1);
  f.setZoom(14.75);assert.equal(f.publications.at(-1).detail,'ground');assert.deepEqual(f.publications.at(-1).ids,[],'old full-layer geometry is cleared synchronously, before network completion');
  await until(()=>waiting.length===2);assert.equal(waiting[0].signal.aborted,true);waiting[1].resolve(payload(green));await until(()=>f.manager.stats.state==='ready');
  const count=f.publications.length;waiting[0].resolve(payload(green));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,count);assert.deepEqual(f.publications.at(-1).kinds,['green']);assert.equal(f.publications.at(-1).detail,'ground');assert.equal(f.manager.stats.loads,2);
 }finally{f.manager.destroy();}
});

test('ground to full rejects a late ground request without removing the newly restored water',async()=>{
 const green=tile(1,[10.005,50.005,10.015,50.015],{green:1}),water=tile(2,green.bbox,{water:1}),waiting=[];let greenReads=0;
 const f=fixture({tiles:[green,water],pitch:0,readTile:(t,signal)=>t===green&&++greenReads===1?new Promise(resolve=>waiting.push({resolve,signal})):payload(t)});
 try{
  f.setZoom(14.75);f.manager.setMode(true);await until(()=>waiting.length===1);assert.equal(f.reads.length,1);
  f.setZoom(15);await until(()=>f.manager.stats.state==='ready');assert.equal(waiting[0].signal.aborted,true);assert.equal(f.publications.at(-1).detail,'full');assert.ok(f.publications.at(-1).kinds.includes('water'));
  const count=f.publications.length;waiting[0].resolve(payload(green));for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.publications.length,count);assert.equal(f.manager.stats.cacheTiles,2);assert.equal(f.manager.stats.loads,2);assert.equal(f.manager.stats.lastError,undefined);
 }finally{f.manager.destroy();}
});

test('green ground held or omitted geometry reports partial coverage in both zoom tiers',async()=>{
 for(const zoom of [14.75,15])for(const reason of ['held','omitted']){
  const f=fixture({tiles:[tile(1,[10.005,50.005,10.015,50.015],{green:1})],pitch:0,rendererStats:{greenGround:{held:0,omitted:0,[reason]:1}}});
  try{f.setZoom(zoom);f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');assert.equal(f.manager.stats.state,'partial',reason+' at '+zoom);assert.equal(f.manager.stats.partial,true);}finally{f.manager.destroy();}
 }
});

for(const kind of ['treeRows','woodland'])test(`upstream tree candidate truncation in ${kind} reports partial even without final selection omissions`,async()=>{
 const f=fixture({tiles:[tile(1,[10.005,50.005,10.015,50.015])],pitch:0,rendererStats:{[kind]:{truncated:true}}});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');
  assert.equal(f.manager.stats.renderer.omittedTrees,0);assert.equal(f.manager.stats.renderer.heldWater,0);assert.deepEqual(f.manager.stats.renderer.greenGround,{held:0,omitted:0});
  assert.equal(f.manager.stats.state,'partial');assert.equal(f.manager.stats.partial,true);
  f.renderers[0].stats[kind].truncated=false;f.setZoom(18);await until(()=>f.manager.stats.state!=='loading');
  assert.equal(f.manager.stats.state,'ready','current renderer result clears previous truncation');assert.equal(f.manager.stats.partial,false);
 }finally{f.manager.destroy();}
});

test('upstream tree candidate truncation flags false preserve ready coverage',async()=>{
 const f=fixture({tiles:[tile(1,[10.005,50.005,10.015,50.015])],pitch:0});
 try{f.manager.setMode(true);await until(()=>f.manager.stats.state!=='loading');assert.equal(f.manager.stats.state,'ready');assert.equal(f.manager.stats.partial,false);assert.equal(f.manager.stats.renderer.treeRows.truncated,false);assert.equal(f.manager.stats.renderer.woodland.truncated,false);}finally{f.manager.destroy();}
});
