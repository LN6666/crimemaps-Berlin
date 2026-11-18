import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadStage2Modules,until,settle,square,MiB} from './support/environment-stage2-fixtures.mjs';

const safety=fileURLToPath(new URL('../src/safety/',import.meta.url));
const m=await loadStage2Modules(safety,{entry:"export {installEnvironmentScene} from './environment-scene-manager';export {createResourceBudget} from './render-runtime/resource-budget';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {greenGroundGeometry} from './environment-greenery-geometry';"});
const sourceSHA='a'.repeat(64),snapshot='synthetic-exact-ground',encode=v=>Buffer.from(JSON.stringify(v)),sha=v=>createHash('sha256').update(encode(v)).digest('hex');
const untilManager=(f,wanted='ready',predicate)=>until(()=>{
 const state=f.manager.stats;
 if(state.state==='error'&&wanted!=='error')assert.fail('Environment manager entered error: '+state.lastError);
 return predicate?predicate(state):state.state===wanted;
});
function fixture({overview=true,nativeKind='green',mutate,readLeaf}={}){
 const budget=m.createResourceBudget({limitBytes:512*MiB,recentLimitBytes:32*MiB}),store=m.createChunkResourceStore({budget}),events=new Map(),layers=new Map(),reads=[],publications=[],renderers=[],box=[10,50,10.02,50.02];let zoom=12.1;
 const boundary={id:'osm/relation/1',name:'Berlin',within_expected_area:true,source_pbf_sha256:sourceSHA,geometry:{type:'Polygon',coordinates:[square([9,49,12,52])]}},boundaryAsset={path:'/safety/environment/berlin/boundary.json',bytes:encode(boundary).length,sha256:sha(boundary)},files=new Map([[boundaryAsset.path,boundary]]);
 const leaf=(n,kind)=>{
  const value={type:'FeatureCollection',schema_version:1,city:'berlin',features:[{type:'Feature',id:'osm/way/'+n,geometry:{type:'Polygon',coordinates:[square([10.005,50.005,10.015,50.015])]},properties:{kind,osmTags:kind==='green'?{landuse:'grass'}:{natural:'water'},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:sourceSHA,source_boundary_sha256:boundaryAsset.sha256}}]},t={id:'leaf-'+n,tile_key:String(n),path:'/safety/environment/berlin/leaf-'+n+'.json',bytes:encode(value).length,sha256:sha(value),bbox:[10.005,50.005,10.015,50.015],feature_count:1,kinds:{[kind]:1}};files.set(t.path,value);return t;
 };
 const native=leaf(1,nativeKind),ground=leaf(2,'green'),manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary:boundaryAsset,tiles:[native],...(overview?{ground_tiles:[ground]}:{})};mutate?.({manifest,native,ground,files,leaf});
 const map={getZoom:()=>zoom,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>({lng:10.01,lat:50.01}),getBounds:()=>({getWest:()=>box[0],getSouth:()=>box[1],getEast:()=>box[2],getNorth:()=>box[3]}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),on:(name,fn)=>events.set(name,fn),off:name=>events.delete(name),triggerRepaint(){},createFixtureRenderer(options){
  let mesh;const renderer={enabled:false,layer:{id:'ground-fixture'},setFeatures(features,bounds,_water,_camera,detail){mesh=m.greenGroundGeometry(features,options.origin,bounds,options.verifiedBoundary,20000,60000);publications.push({ids:features.map(f=>f.id),detail,mesh});},setEnabled(v){this.enabled=v;},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){},get stats(){return{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:mesh?.held??0,omitted:mesh?.omitted??0},treeRows:{truncated:false},woodland:{truncated:false}};}};renderers.push(renderer);return renderer;
 }};
 const manager=m.installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:async(asset,signal)=>{signal.throwIfAborted();const p=typeof asset==='string'?asset:asset.path;reads.push({path:p,signal});if(p.endsWith('/index.json'))return manifest;const value=files.get(p);assert(value,'known fixture asset');return p===boundaryAsset.path?value:readLeaf?readLeaf(asset,signal,value):value;}});
 return{manager,budget,store,native,ground,reads,publications,renderers,setZoom(v){zoom=v;events.get('moveend')();},close(){manager.destroy();store.destroy();assert.equal(budget.stats.bytes,0);}};
}

test('additive exact-source ground tiles publish at overview and leave the original near leaves and limits intact',async()=>{
 // A complete native green closure now correctly wins over the overview.
 // Use a real water-only native source to exercise the green fallback route.
 const f=fixture({nativeKind:'water',mutate({manifest,native,files}){const value={schema_version:1,city:'berlin',tiles:[native]},page={id:'page',path:'/safety/environment/berlin/page.json',bytes:encode(value).length,sha256:sha(value),bbox:[10,50,10.02,50.02]};files.set(page.path,value);manifest.index_type='viewport-partitioned-v1';manifest.partitions=[page];delete manifest.tiles;}});try{
  f.manager.setMode(true);await untilManager(f,'partial');assert.deepEqual(f.publications.at(-1).ids,['osm/way/2']);assert.equal(f.publications.at(-1).detail,'ground');assert.equal(f.manager.stats.groundSource,'exact-source-overview');assert(f.publications.at(-1).mesh.admitted>0);assert.equal(f.reads.filter(r=>r.path===f.native.path).length,0,'ground fallback does not load the native water leaf');assert.equal(f.reads.filter(r=>r.path.endsWith('/page.json')).length,1,'one bounded metadata probe establishes that no native green closure exists');assert.equal(f.manager.stats.groundSelection.reason,'no-visible-native-green-leaves');assert(f.manager.stats.resources.selectionClaimBytes>0);assert(f.manager.stats.resources.manifestClaimBytes>0);
  f.setZoom(18);await untilManager(f);assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);assert.equal(f.publications.at(-1).detail,'full');
  f.setZoom(10.5);await untilManager(f,'partial');assert.deepEqual(f.publications.at(-1).ids,['osm/way/2']);assert.equal(f.publications.at(-1).detail,'ground');assert.equal(f.budget.stats.limitBytes,512*MiB);assert(f.manager.stats.cacheRawBytes<=8*MiB);assert(f.publications.every(p=>p.mesh.positions.length/7<=20000&&p.mesh.indices.length<=60000));
  f.setZoom(10.4);assert.equal(f.manager.stats.state,'idle');assert.equal(f.manager.customLayer,undefined);assert.equal(f.budget.stats.bytes,0);
 }finally{f.close();}
 const legacy=fixture({overview:false});try{legacy.manager.setMode(true);await untilManager(legacy);assert.deepEqual(legacy.publications.at(-1).ids,['osm/way/1']);}finally{legacy.close();}
});

test('an invalid overview inventory errors before leaf reads instead of falling back to native tiles',async()=>{
 for(const mutate of [({manifest})=>{manifest.ground_tiles=[];},({manifest,ground})=>{manifest.ground_tiles=Array.from({length:33},(_,i)=>({...ground,id:'g'+i,path:ground.path+'-'+i}));},({manifest,ground})=>{manifest.ground_tiles=Array.from({length:5},(_,i)=>({...ground,id:'g'+i,path:ground.path+'-'+i,bytes:MiB}));},({ground})=>{ground.kinds={water:1};},({ground})=>{ground.uncompressed_bytes=1;}]){
  const f=fixture({mutate});try{f.manager.setMode(true);await untilManager(f,'error');assert.match(f.manager.stats.lastError,/ground overview/);assert.equal(f.publications.length,0);assert.equal(f.reads.length,1,'the invalid descriptor set never reaches a leaf or boundary read');}finally{f.close();}
 }
});

test('a warmed non-green source cannot masquerade as a green-only overview through descriptor metadata',async()=>{
 const f=fixture({mutate({manifest,native,ground,files}){const value=files.get(native.path);value.features[0].properties.kind='water';native.sha256=sha(value);native.bytes=encode(value).length;native.kinds={water:1};manifest.ground_tiles=[{...native,kinds:{green:1}}];}});
 try{f.setZoom(18);f.manager.setMode(true);await untilManager(f);const count=f.publications.length;f.setZoom(10.5);await untilManager(f,'error');assert.match(f.manager.stats.lastError,/non-green feature/);assert(f.publications.slice(count).every(p=>p.ids.length===0),'no forged green source publication follows the tier transition');assert.equal(f.renderers[0].enabled,false);}finally{f.close();}
});

test('leaving an overview cancels its pending input and a late response cannot replace the near publication',async()=>{
 let pending;const f=fixture({nativeKind:'water',readLeaf:(asset,signal,value)=>asset.id==='leaf-2'?new Promise(resolve=>{pending={resolve,signal,value};}):value});
 try{f.manager.setMode(true);await untilManager(f,'loading',()=>!!pending);f.setZoom(18);assert.equal(pending.signal.aborted,true);await untilManager(f);assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);pending.resolve(pending.value);await settle();assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);assert.equal(f.manager.stats.state,'ready');}finally{pending?.resolve(pending.value);f.close();}
});
