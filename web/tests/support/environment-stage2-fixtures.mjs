// Stage-2 environment fixtures: the environment manager and the vehicle
// scenery read through the REAL page byte transport, with a reader that keeps
// the City manager's readAsset contract (a descriptor's own byte count caps the
// read; the 4th argument passes through unchanged; the lease is returned after
// decoding). Logical ledger checks only: no GPU, browser or physical memory.
import {build} from 'esbuild';

export const MiB=1024*1024;
export const hash=n=>n.toString(16).padStart(64,'0');
export const square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
// A closed ring around the view whose teeth each span most latitude buckets, so
// the exact solar index size grows with the tooth count.
export function sawtooth(teeth){const ring=[[9,48.9]];for(let i=0;i<=teeth;i++)ring.push([9+3*i/teeth,i%2?52:49]);ring.push([12,48.9],[9,48.9]);return{type:'Polygon',coordinates:[ring]};}
export const settle=async(count=8)=>{for(let i=0;i<count;i++)await new Promise(resolve=>setImmediate(resolve));};
export async function until(predicate,label='fixture'){for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error(label+' did not settle');}
export const encode=value=>new TextEncoder().encode(JSON.stringify(value));

/** One bundle, so the ledger, the page store, the transport and the environment
 * modules share class identities as in the product bundle. The environment
 * renderer and the vehicle renderer are replaced by fixtures. */
export async function loadStage2Modules(safety,{entry,stubRenderers=true}={}){
 const contents=entry??[
  "export {installEnvironmentScene} from './environment-scene-manager';",
  "export {installThreeDimensionalScenery} from './three-dimensional-scenery';",
  "export {createResourceByteTransport,ResourceByteDeliveryRefusedError} from './resource-byte-transport';",
  "export {createChunkResourceStore,getPageChunkResourceStore} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,getPageResourceBudget} from './render-runtime/resource-budget';",
  "export * from './environment-resource-budget';",
  "export {currentSolarShadowBoundary,solarShadowBoundaryIndexBytes,solarShadowBoundaryCacheStats,SOLAR_BOUNDARY_INDEX_MODEL} from './solar-shadow-admission';",
 ].join('');
 const plugins=stubRenderers?[{name:'stage2-renderer-fixtures',setup(b){
  b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'environment-renderer',namespace:'stage2-fixture'}));
  b.onResolve({filter:/^\.\/animated-vehicles$/},()=>({path:'vehicles',namespace:'stage2-fixture'}));
  b.onLoad({filter:/^environment-renderer$/,namespace:'stage2-fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.createFixtureRenderer(options);',loader:'js'}));
  b.onLoad({filter:/^vehicles$/,namespace:'stage2-fixture'},()=>({contents:'export const createAnimatedVehicles=(...args)=>globalThis.__environmentStage2VehicleFactory(...args);',loader:'js'}));
 }}]:[];
 const built=await build({stdin:{contents,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true,plugins});
 return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
}

/** files: path -> JSON value; each is served as its exact encoded bytes. The
 * reader records, per call, the ledger bytes just before acquireBytes and, per
 * network read, the ledger bytes when the network read starts: a caller-admitted
 * read adds no byte beside the caller's claim, so the two are equal. */
export function createAdmittedReads(m,{budget,store,files,onNetwork,networkBytes}={}){
 const encoded=new Map([...files].map(([path,value])=>[path,encode(value)]));
 const calls=[],network=[],ensures=[];let ensureGate,transport;
 const bytesOf=path=>{const bytes=encoded.get(path);if(!bytes)throw Error('unknown fixture path '+path);return bytes;};
 transport=m.createResourceByteTransport({namespace:'environment-stage2',resourceStore:store,read:async(path,signal,max)=>{
  const row={path,max,bytes:budget.stats.bytes,listeners:budget.stats.availabilityListeners,count:network.filter(r=>r.path===path).length+1};network.push(row);
  await onNetwork?.(row,signal);signal.throwIfAborted();
  const bytes=bytesOf(path),out=networkBytes?.(row,bytes)??new Uint8Array(bytes);
  if(out.byteLength>max)throw Error('fixture read exceeds its ceiling');return out;
 }});
 async function read(asset,signal,max,admission){
  const path=typeof asset==='string'?asset:asset.path,limit=typeof asset==='string'?max:Math.min(max,asset.bytes);
  const call={path,max,limit,admission,before:budget.stats.bytes,claimBytes:admission?.admitted?.bytes,keep:admission?.keep,envelope:admission?.envelope};calls.push(call);
  const lease=admission===undefined?await transport.acquireBytes(path,signal,limit):await transport.acquireBytes(path,signal,limit,admission);
  try{call.deliveredCost=lease.cost;call.claimAfter=admission?.admitted?.bytes;signal.throwIfAborted();return JSON.parse(new TextDecoder().decode(lease.bytes));}
  finally{lease.release();}
 }
 async function ensureRead(signal){ensures.push({bytes:budget.stats.bytes,listeners:budget.stats.availabilityListeners});if(ensureGate)await ensureGate.promise;signal.throwIfAborted();}
 return{transport,calls,network,ensures,read,ensureRead,encoded,bytesOf,
  holdEnsure(){let release;const promise=new Promise(resolve=>{release=resolve;});ensureGate={promise};return()=>{ensureGate=undefined;release();};},
  count:suffix=>network.filter(row=>row.path.endsWith(suffix)).length};
}

/** A Berlin environment source served as exact bytes: manifest (tiles or
 * viewport pages), municipal boundary and leaves. */
export function environmentSource({boundarySHA=hash(0xb0),sourceSHA='a'.repeat(64),snapshot='fixture',geometry={type:'Polygon',coordinates:[square([9,49,12,52])]},tiles=[[1,[10.005,50.005,10.015,50.015]]],pages}={}){
 const payload=(id,bbox)=>({type:'FeatureCollection',schema_version:1,city:'berlin',features:[{type:'Feature',id:'osm/way/'+id,geometry:{type:'Polygon',coordinates:[square(bbox)]},properties:{kind:'water',osmTags:{},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:sourceSHA,source_boundary_sha256:boundarySHA}}]});
 const files=new Map(),leaf=([n,bbox])=>{const path='/safety/environment/berlin/tile-'+n+'.json',value=payload(n,bbox);files.set(path,value);return{id:'tile-'+String(n).padStart(3,'0'),tile_key:String(n),bbox,kinds:{water:1},feature_count:1,path,sha256:hash(n),bytes:encode(value).byteLength};};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:sourceSHA,within_expected_area:true,geometry};
 files.set('/safety/environment/berlin/boundary.json',boundary);
 const city_boundary={path:'/safety/environment/berlin/boundary.json',bytes:encode(boundary).byteLength,sha256:boundarySHA};
 let manifest;
 if(pages){
  const partitions=pages.map(([n,bbox,rows])=>{const value={schema_version:1,city:'berlin',tiles:rows.map(leaf)},path='/safety/environment/berlin/page-'+n+'.json';files.set(path,value);return{id:'page-'+n,path,sha256:hash(0x9000+n),bytes:encode(value).byteLength,bbox};});
  manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary,index_type:'viewport-partitioned-v1',partitions};
 }else manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary,tiles:tiles.map(leaf)};
 files.set('/safety/environment/berlin/index.json',manifest);
 return{files,manifest,boundary,boundarySHA,sourceSHA};
}

let layerSerial=0;
/** A MapLibre surface whose environment renderer is a fixture. */
export function environmentMap({box=[10,50,10.02,50.02],centre={lng:10.01,lat:50.01},onRenderer}={}){
 const renderers=[],publications=[],events=new Map(),layers=new Map();
 const createFixtureRenderer=options=>{
  onRenderer?.(options);
  const renderer={options,layer:{id:'environment-stage2-'+(++layerSerial),onRemove(){}},setFeatures(features){publications.push(features.map(f=>f.id));},setEnabled(){},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){},stats:{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:0,omitted:0},hardSurfaceDisplay:{captureStale:false},treeRows:{truncated:false},woodland:{truncated:false}}};
  renderers.push(renderer);return renderer;
 };
 const map={createFixtureRenderer,getZoom:()=>18,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>centre,getBounds:()=>({getWest:()=>box[0],getSouth:()=>box[1],getEast:()=>box[2],getNorth:()=>box[3]}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),triggerRepaint(){}};
 return{map,renderers,publications};
}

// Vehicle scenery source (the decorative-schematic road subset).
export const road=(id,coordinates)=>({id:'osm/way/'+id+'/clip/0',source_way_id:id,coordinates,direction:1,source_tags:{highway:'residential'},source_url:'https://www.openstreetmap.org/way/'+id});
export const vehicleScenery=roads=>({schema_version:1,city:'berlin',source_snapshot:'test',source_pbf_sha256:'a'.repeat(64),source_url:'https://www.openstreetmap.org',city_boundary_sha256:'b'.repeat(64),role:'decorative-schematic',partial:true,roads});

/** The scenery's DOM status line and vehicle renderer, replaced for one test.
 * resources (optional): the fake renderer's stats.resources (its kept storage). */
export function sceneryHost(t,{resources}={}){
 const saved={document:Object.getOwnPropertyDescriptor(globalThis,'document'),factory:globalThis.__environmentStage2VehicleFactory},status={setAttribute(){},remove(){},textContent:''},created=[];
 globalThis.document={hidden:false,createElement:()=>status};
 globalThis.__environmentStage2VehicleFactory=(_map,_city,options)=>{const vehicles={options,layer:{id:'cars'},setEnabled(){},setVisible(){},setReducedMotion(){},setZoom(){},setFrameLoad(){},setRoads(){},get positionSamples(){return[];},get stats(){return resources?{allocatedVehicles:1,resources:{...resources}}:{allocatedVehicles:1};},destroy(){}};created.push(vehicles);return vehicles;};
 t.after(()=>{if(saved.document)Object.defineProperty(globalThis,'document',saved.document);else delete globalThis.document;globalThis.__environmentStage2VehicleFactory=saved.factory;});
 const events=new Map(),layers=new Map();
 const map={on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),getZoom:()=>18,getBounds:()=>({getWest:()=>12,getSouth:()=>51,getEast:()=>14,getNorth:()=>53}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id)};
 return{map,status,created,host:{append(){}}};
}
