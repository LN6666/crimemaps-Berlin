import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const entry=`export {installEnvironmentScene} from './environment-scene-manager';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';export * from './environment-resource-budget';`;
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true,plugins:[{name:'renderer-only-fixture',setup(b){b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.createFixtureRenderer(options);',loader:'js'}));}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const MiB=1024*1024,sourceSHA='a'.repeat(64),boundarySHA='b'.repeat(64),snapshot='fixture';
const hash=n=>n.toString(16).padStart(64,'0');
const square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const tile=(n,bbox,kinds={water:1},bytes=1024,extra={})=>({id:'tile-'+String(n).padStart(3,'0'),tile_key:String(n),bbox,kinds,feature_count:1,path:'/safety/environment/berlin/tile-'+n+'.json',sha256:hash(n),bytes,...extra});
const payload=t=>({type:'FeatureCollection',schema_version:1,city:'berlin',features:[{type:'Feature',id:'osm/way/'+Number(BigInt('0x'+t.sha256)),geometry:{type:'Polygon',coordinates:[square(t.bbox)]},properties:{kind:'water',osmTags:{},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:sourceSHA,source_boundary_sha256:boundarySHA}}]});
const settle=async(count=8)=>{for(let i=0;i<count;i++)await new Promise(resolve=>setImmediate(resolve));};
async function until(predicate){for(let i=0;i<200;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('Fixture did not settle');}
// A leaf's pre-read bound: two reader integrity copies (the 2xP SHA-256 input
// copy model, environmentJsonReadCosts) + two-byte text + 24 bytes/source byte + 16,
// plus 80 bytes per descriptor feature for the publication reference slots
// (flatMap + ground filter: 2 x 8-byte slot x 2.5 growth; one 40-byte Set entry).
const leafBound=(bytes,features=1)=>2*bytes+2*bytes+24*bytes+16+80*features;

// customize(renderer) adjusts one fixture renderer; pages make a partitioned
// manifest whose page reads readPage may hold; storeOptions reach the page store.
function fixture({tiles=[],pages,limitBytes=512*MiB,readTile,readPage,onRenderer,customize,storeOptions={},zoom=18}={}){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,32*MiB)}),store=m.createChunkResourceStore({budget,...storeOptions});
 const reads=[],publications=[],renderers=[],events=new Map(),layers=new Map();let box=[10,50,10.02,50.02],centre={lng:10.01,lat:50.01},currentZoom=zoom;
 const createFixtureRenderer=options=>{
  onRenderer?.();
  const renderer={options,enabled:false,layer:{id:'fixture',onRemove(){}},setFeatures(features,bounds,_w,_c,detail='full'){publications.push({ids:features.map(f=>f.id),bounds:[...bounds],detail});},setEnabled(v){this.enabled=v;},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){},stats:{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:0,omitted:0},hardSurfaceDisplay:{captureStale:false},treeRows:{truncated:false},woodland:{truncated:false}}};
  customize?.(renderer,publications);renderers.push(renderer);return renderer;
 };
 const map={createFixtureRenderer,getZoom:()=>currentZoom,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>centre,getBounds:()=>({getWest:()=>box[0],getSouth:()=>box[1],getEast:()=>box[2],getNorth:()=>box[3]}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),triggerRepaint(){}};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:sourceSHA,within_expected_area:true,geometry:{type:'Polygon',coordinates:[square([9,49,12,52])]}};
 const manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary:{path:'/safety/environment/berlin/boundary.json',bytes:100,sha256:boundarySHA},...(pages?{index_type:'viewport-partitioned-v1',partitions:pages.map(p=>p.asset)}:{tiles})};
 const manager=m.installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:async(asset,signal)=>{const p=typeof asset==='string'?asset:asset.path;reads.push({path:p,signal});if(p.endsWith('/index.json'))return manifest;if(p.endsWith('/boundary.json'))return boundary;const page=pages?.find(v=>v.asset.path===p);if(page)return readPage?readPage(page,signal):{schema_version:1,city:'berlin',tiles:page.tiles};const t=tiles.find(v=>v.path===p)??pages?.flatMap(v=>v.tiles).find(v=>v.path===p);assert.ok(t,'known tile '+p);return readTile?readTile(t,signal):payload(t);}});
 return{manager,budget,store,reads,publications,renderers,leafReads:()=>reads.filter(r=>r.path.includes('/tile-')),move(nextBox,nextCentre){box=nextBox;centre=nextCentre;events.get('moveend')();},setZoom(value){currentZoom=value;events.get('moveend')();}};
}

test('city overview displays existing green ground at the default camera without loading near scenery',async()=>{
 const green=tile(1,[10.005,50.005,10.015,50.015],{green:1}),water=tile(2,[10.005,50.005,10.015,50.015],{water:1});
 const f=fixture({zoom:12.1,tiles:[green,water],readTile:t=>{const value=payload(t);if(t===green)value.features[0].properties={...value.features[0].properties,kind:'green',osmTags:{landuse:'grass'}};return value;}});
 try{
  f.manager.setMode(true);assert.equal(f.manager.stats.state,'loading','the existing default 12.1 city view must not disable all source ground');
  await until(()=>f.manager.stats.state==='ready');assert.deepEqual(f.publications.at(-1),{ids:['osm/way/1'],bounds:[10,50,10.02,50.02],detail:'ground'});
  assert.deepEqual(f.leafReads().map(row=>row.path),[green.path],'only the source green leaf belongs to this ground tier');
  f.setZoom(10.5);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'ground','the actual overview button camera keeps its source cover');
  f.setZoom(10.4);assert.equal(f.manager.stats.state,'idle');assert.equal(f.manager.customLayer,undefined);assert.equal(f.budget.stats.bytes,0,'leaving the city overview still retires environment resources');
 }finally{f.manager.destroy();f.store.destroy();}
});

test('near to overview to near changes environment detail while retaining source ground and original resource limits',async()=>{
 const green=tile(3,[10.005,50.005,10.015,50.015],{green:1}),water=tile(4,[10.005,50.005,10.015,50.015],{water:1});
 const f=fixture({tiles:[green,water],readTile:t=>{const value=payload(t);if(t===green)value.features[0].properties={...value.features[0].properties,kind:'green',osmTags:{landuse:'grass'}};return value;}});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'full');assert.deepEqual(new Set(f.publications.at(-1).ids),new Set(['osm/way/3','osm/way/4']));
  f.setZoom(10.5);assert.equal(f.publications.at(-1).detail,'ground');assert.deepEqual(f.publications.at(-1).ids,[],'near-only surfaces are withdrawn before the new ground publication');
  await until(()=>f.manager.stats.state==='ready');assert.deepEqual(f.publications.at(-1).ids,['osm/way/3']);
  f.setZoom(18);await until(()=>f.manager.stats.state==='ready');assert.equal(f.publications.at(-1).detail,'full');assert.deepEqual(new Set(f.publications.at(-1).ids),new Set(['osm/way/3','osm/way/4']));
  assert.equal(f.budget.stats.limitBytes,512*MiB);f.manager.setMode(false);assert.equal(f.budget.stats.bytes,0);
 }finally{f.manager.destroy();f.store.destroy();}
});

test('a leaf read is admitted before it starts; pressure waits for one ledger wake-up with no read or timer',async t=>{
 const leaf=tile(1,[10.005,50.005,10.015,50.015],{water:1},MiB);let blocker;
 const f=fixture({tiles:[leaf],limitBytes:64*MiB,onRenderer:()=>{blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-MiB,precision:'exact'});}});
 const savedTimeout=globalThis.setTimeout;let timers=0;
 try{
  f.manager.setMode(true);await until(()=>blocker!==undefined);
  globalThis.setTimeout=(...args)=>{timers++;return savedTimeout(...args);};await settle();
  assert.equal(f.leafReads().length,0,'no leaf read before its parse working set is admitted');
  assert.equal(f.manager.stats.state,'loading');
  const pending=f.manager.stats.resources.admission.pending;
  assert.equal(pending.phase,'environment leaf read');assert.equal(pending.requiredBytes,leafBound(MiB),'the claim is derived from the leaf descriptor');assert.equal(pending.owner,'environment-scene');
  assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(timers,0,'waiting creates no polling timer');
  globalThis.setTimeout=savedTimeout;
  blocker.release();await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.leafReads().length,1);assert.ok(f.publications.at(-1).ids.includes('osm/way/1'));assert.equal(f.manager.stats.resources.admission.pending,undefined);
  assert.ok(f.manager.stats.resources.manifestClaimBytes>0,'the retained manifest stays charged as metadata');
  assert.ok(f.budget.stats.bytes<leafBound(MiB),'after decode the leaf claim shrinks to its retained estimate');
 }finally{globalThis.setTimeout=savedTimeout;f.manager.destroy();assert.equal(f.budget.stats.bytes,0,'destroy returns every manager claim');f.store.destroy();}
});

test('a claim larger than the whole page budget is reported unfit before any read instead of waiting',async()=>{
 const small=fixture({tiles:[tile(1,[10.005,50.005,10.015,50.015])],limitBytes:20*MiB});
 small.manager.setMode(true);await until(()=>small.manager.stats.state==='error');
 assert.equal(small.reads.length,0,'the manifest working set is checked before the manifest read');
 assert.match(small.manager.stats.lastError,/environment manifest requires \d+ logical bytes, above the page budget limit/);
 assert.equal(small.manager.stats.resources.admission.unfitAdmissions,1);small.manager.destroy();small.store.destroy();
 const gz=tile(2,[10.005,50.005,10.015,50.015],{water:1},MiB,{compression:'gzip',uncompressed_bytes:MiB,uncompressed_sha256:'c'.repeat(64)});
 const f=fixture({tiles:[gz],limitBytes:30*MiB});
 f.manager.setMode(true);await until(()=>f.manager.stats.state==='error');
 assert.equal(f.leafReads().length,0,'an unfit gzip leaf is never read');assert.match(f.manager.stats.lastError,/environment leaf read requires \d+ logical bytes/);
 f.manager.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('a same-tier view change keeps the intersecting in-flight production and cancels only the difference',async()=>{
 const a=tile(1,[10.005,50.005,10.008,50.008]),b=tile(2,[10.016,50.016,10.019,50.019]),waiting=new Map();
 // Like the product reader, an aborted read settles promptly instead of hanging.
 const f=fixture({tiles:[a,b],readTile:(t,signal)=>new Promise((resolve,reject)=>{waiting.set(t.id,{resolve,signal,t});signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});})});
 try{
  f.manager.setMode(true);await until(()=>waiting.size===2);
  const inFlight=f.budget.stats.bytes;assert.ok(inFlight>=2*leafBound(1024),'both in-flight leaves hold their read+parse claims');
  f.move([10,50,10.009,50.009],{lng:10.0045,lat:50.0045});
  assert.equal(waiting.get(b.id).signal.aborted,true,'the leaf outside the new view is cancelled');
  assert.equal(waiting.get(a.id).signal.aborted,false,'the intersecting leaf keeps its shared production');
  assert.equal(f.budget.stats.retiringBytes,leafBound(1024),'a cancelled production stays charged until its read actually stops');
  await settle();assert.equal(f.budget.stats.bytes,inFlight-leafBound(1024),'then the cancelled demand returns its reservation');assert.equal(f.budget.stats.retiringBytes,0);
  waiting.get(a.id).resolve(payload(a));await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.leafReads().length,2,'the intersecting leaf is not read a second time');
  assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);
  const count=f.publications.length;waiting.get(b.id).resolve(payload(b));await settle();assert.equal(f.publications.length,count,'a cancelled leaf never publishes late');
  assert.equal(f.manager.stats.loads,1);
  f.manager.setMode(false);assert.equal(f.budget.stats.bytes,0,'explicit 2D returns manifest, metadata, warm and demand claims');
 }finally{f.manager.destroy();f.store.destroy();}
});

test('warm leaves are revocable page-cache roles and an unchanged view reuses its publication without decoding',async()=>{
 const leaf=tile(1,[10.005,50.005,10.015,50.015]),f=fixture({tiles:[leaf]});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.manager.stats.cacheTiles,1);assert.ok(f.budget.stats.recentBytes>0,'warm reuse is charged inside the page recent subset');
  const withLeaf=f.budget.stats.bytes;f.store.evictRecent();
  assert.equal(f.manager.stats.cacheTiles,0,'page pressure revokes the warm leaf');assert.ok(f.budget.stats.bytes<withLeaf);assert.equal(f.budget.stats.recentBytes,0);
  f.manager.setVisible(false);f.manager.setVisible(true);await until(()=>f.manager.stats.state==='ready');
  assert.equal(f.leafReads().length,1,'unchanged view: no re-read after the cache was revoked');assert.equal(f.publications.length,1,'and no re-publication');
  assert.equal(f.renderers[0].enabled,true);
  f.move([10.001,50.001,10.021,50.021],{lng:10.011,lat:50.011});await until(()=>f.manager.stats.state==='ready'&&f.publications.length===2);
  assert.equal(f.leafReads().length,2,'a changed view decodes the revoked leaf again');assert.equal(f.manager.stats.cacheTiles,1);
  f.manager.setMode(false);assert.equal(f.budget.stats.bytes,0);
 }finally{f.manager.destroy();f.store.destroy();}
});

test('decoded environment cache expires at 13s and a later view reloads without disturbing current geometry',async t=>{
 let now=0,id=0;const timers=new Map();
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(run,delay=0)=>{const key=++id;timers.set(key,{run,at:now+delay});return key;});
 t.mock.method(globalThis,'clearTimeout',key=>timers.delete(key));
 const advance=ms=>{now+=ms;let turns=0;for(;;){const next=[...timers].find(([,v])=>v.at<=now);if(!next)break;assert(++turns<100);timers.delete(next[0]);next[1].run();}};
 const leaf=tile(1,[10.005,50.005,10.015,50.015]),f=fixture({tiles:[leaf]});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
  const published=f.publications.length,bytes=f.budget.stats.bytes;
  advance(12999);assert.equal(f.manager.stats.cacheTiles,1);assert.equal(f.leafReads().length,1);
  advance(1);assert.equal(f.manager.stats.cacheTiles,0);assert.ok(f.budget.stats.bytes<bytes);
  const receipt=f.store.stats.idleCache.lastExpiries.at(-1);
  assert.equal(receipt.idleLimitMs,13000);assert.equal(receipt.collectedAt,13000);assert.equal(receipt.stateAfter,'released');
  assert.equal(f.publications.length,published,'cache eviction does not withdraw published geometry');assert.equal(f.renderers[0].enabled,true);
  f.move([10.001,50.001,10.021,50.021],{lng:10.011,lat:50.011});
  await until(()=>f.manager.stats.state==='ready'&&f.publications.length>published);
  assert.equal(f.leafReads().length,2,'the next changed view reads the evicted source again');
  assert.deepEqual(f.publications.at(-1).ids,['osm/way/1']);
  f.manager.setMode(false);assert.equal(f.budget.stats.bytes,0);
 }finally{f.manager.destroy();f.store.destroy();}
});

test('a refused publication reserves and releases nothing, so it wakes no waiter; one real release resumes it',async()=>{
 const leaf=tile(1,[10.005,50.005,10.015,50.015]);let refuse=true,calls=0,wakeupsAtCall;
 const f=fixture({tiles:[leaf],customize:(renderer,publications)=>{renderer.setFeatures=(features,bounds,_w,_c,detail='full')=>{calls++;wakeupsAtCall=f.budget.stats.availabilityEvents;if(refuse)throw new m.EnvironmentResourcePendingError('environment publication',4096,undefined);publications.push({ids:features.map(x=>x.id),bounds:[...bounds],detail});};}});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.pending?.phase==='environment publication');
  assert.ok(calls>=1);assert.equal(f.budget.stats.availabilityEvents,wakeupsAtCall,'the refused publication released no claim of its own');
  const attempts=calls,idle=f.budget.stats.availabilityEvents;await settle(20);
  assert.equal(calls,attempts,'no retry before a real release');assert.equal(f.budget.stats.availabilityEvents,idle);
  assert.equal(f.manager.stats.state,'loading');assert.equal(f.budget.stats.availabilityListeners,1);
  refuse=false;f.budget.reserve({category:'texture',bytes:1024,precision:'exact'}).release();
  await until(()=>f.manager.stats.state==='ready');assert.equal(calls,attempts+1,'one real release resumes it exactly once');assert.ok(f.publications.at(-1).ids.includes('osm/way/1'));
 }finally{f.manager.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();}
});

test('a warm leaf that does not fit the recent subset is skipped instead of evicting another owner',async()=>{
 for(const variant of ['bytes','entries']){
  const leaf=tile(1,[10.005,50.005,10.015,50.015]),f=fixture({tiles:[leaf],storeOptions:variant==='entries'?{recentMaxEntries:1}:{}});
  try{
   const other=f.store.acquire({contentKey:'other-owner-recent',role:'main',allowRecent:true,estimate:{category:'decoded',bytes:variant==='bytes'?32*MiB-512:1024,precision:'estimate'},produce:()=>({other:true})});other.release();
   assert.equal(f.store.stats.recent,1);const pressure=f.budget.stats.pressureEvents;
   f.manager.setMode(true);await until(()=>f.manager.stats.state==='ready');
   assert.equal(f.manager.stats.cacheTiles,0,variant+': the warm copy is skipped');assert.equal(f.manager.stats.resources.warmSkipped,1);
   assert.equal(f.budget.stats.pressureEvents,pressure,variant+': no pressure eviction ran for the environment cache');
   let produced=false;const again=f.store.acquire({contentKey:'other-owner-recent',role:'main',estimate:{category:'decoded',bytes:16,precision:'estimate'},produce:()=>{produced=true;return{rebuilt:true};}});
   assert.equal(produced,false,variant+': the other owner\'s recent entry survived');assert.equal(again.value.other,true);again.release();
  }finally{f.manager.destroy();f.store.destroy();}
 }
});

test('after a same-tier handoff at most two leaf productions are in flight; adopted reads are not repeated',async()=>{
 const a=tile(1,[10.004,50.004,10.006,50.006]),b=tile(2,[10.005,50.005,10.007,50.007]),c=tile(3,[10.014,50.014,10.016,50.016]),d=tile(4,[10.015,50.015,10.017,50.017]);
 const waiting=new Map();let maxInFlight=0;
 const f=fixture({tiles:[a,b,c,d],readTile:(t,signal)=>new Promise((resolve,reject)=>{waiting.set(t.id,()=>{waiting.delete(t.id);resolve(payload(t));});maxInFlight=Math.max(maxInFlight,waiting.size);signal.addEventListener('abort',()=>{waiting.delete(t.id);reject(new DOMException('Aborted','AbortError'));},{once:true});})});
 const inFlight=()=>[...waiting.keys()].sort().join(',');
 try{
  f.move([10,50,10.02,50.02],{lng:10.005,lat:50.005});f.manager.setMode(true);await until(()=>waiting.size===2);
  assert.equal(inFlight(),'tile-001,tile-002');
  f.move([10,50,10.02,50.02],{lng:10.0155,lat:50.0155});await settle(20);
  assert.equal(inFlight(),'tile-001,tile-002','the new view waits for the two adopted productions instead of opening more reads');
  assert.equal(f.manager.stats.resources.leafProductionsInFlight,2);assert.equal(f.manager.stats.resources.demandLeaves,2);
  waiting.get('tile-001')();await until(()=>waiting.size===2&&!waiting.has('tile-001'));
  assert.equal(inFlight(),'tile-002,tile-003','a settled production frees exactly one slot, taken by the highest-priority new leaf');
  waiting.get('tile-002')();await until(()=>waiting.has('tile-004'));assert.equal(inFlight(),'tile-003,tile-004');
  waiting.get('tile-003')();waiting.get('tile-004')();await until(()=>f.manager.stats.state==='ready');
  assert.equal(maxInFlight,2,'never more than two leaf reads in flight');
  assert.deepEqual(f.leafReads().map(r=>r.path.match(/tile-\d+/)[0]),['tile-1','tile-2','tile-3','tile-4'],'each leaf is read exactly once');
  assert.deepEqual([...f.publications.at(-1).ids].sort(),['osm/way/1','osm/way/2','osm/way/3','osm/way/4']);
 }finally{f.manager.destroy();f.store.destroy();}
});

test('a render failure releases the unadopted same-tier handoff at once, as stop() does',async()=>{
 const a=tile(1,[10.004,50.004,10.006,50.006]),b=tile(2,[10.005,50.005,10.007,50.007]),e=tile(5,[10.504,50.504,10.506,50.506]);
 const p1={asset:{id:'page-1',bbox:[10,50,10.01,50.01],path:'/safety/environment/berlin/page-1.json',sha256:hash(101),bytes:1024},tiles:[a,b]},p2={asset:{id:'page-2',bbox:[10.5,50.5,10.51,50.51],path:'/safety/environment/berlin/page-2.json',sha256:hash(102),bytes:1024},tiles:[e]};
 const leaves=new Map(),pageReads=new Map(),held=(map,key,signal,value)=>new Promise((resolve,reject)=>{map.set(key,{signal,resolve:()=>resolve(value)});signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
 const f=fixture({pages:[p1,p2],readTile:(t,signal)=>held(leaves,t.id,signal,payload(t)),readPage:(page,signal)=>page===p1?{schema_version:1,city:'berlin',tiles:page.tiles}:held(pageReads,page.asset.id,signal,{schema_version:1,city:'berlin',tiles:page.tiles})});
 try{
  f.move([10,50,10.01,50.01],{lng:10.005,lat:50.005});f.manager.setMode(true);await until(()=>leaves.size===2);
  f.move([10,50,10.51,50.51],{lng:10.255,lat:50.255});await until(()=>pageReads.has('page-2'));
  assert.equal(f.manager.stats.resources.handoffLeaves,2,'the same-tier successor holds both in-flight leaves while its page loads');
  assert.ok([...leaves.values()].every(r=>!r.signal.aborted));
  f.renderers[0].options.onRenderError(Error('controlled draw failure'));
  assert.equal(f.manager.stats.resources.handoffLeaves,0,'the failure releases the unadopted handoff at once');
  assert.ok([...leaves.values()].every(r=>r.signal.aborted),'and cancels their productions');assert.equal(pageReads.get('page-2').signal.aborted,true,'the pending refresh is aborted');
  assert.equal(f.manager.stats.state,'error');assert.equal(f.manager.stats.lastError,'controlled draw failure');
  await settle();assert.equal(f.manager.stats.resources.demandLeaves,0);assert.equal(f.budget.stats.retiringBytes,0,'the cancelled reads settled and returned their claims');
 }finally{f.manager.destroy();assert.equal(f.budget.stats.bytes,0);f.store.destroy();}
});

test('a published scene whose GPU storage waits for the page budget reports waiting-gpu-budget, not ready',async()=>{
 const leaf=tile(1,[10.005,50.005,10.015,50.015]),gpu={deferred:true};
 const f=fixture({tiles:[leaf],customize:renderer=>{const base=renderer.stats;Object.defineProperty(renderer,'stats',{get:()=>({...base,resources:{gpuDeferred:gpu.deferred,gpuPending:gpu.deferred?{label:'environment GPU buffers',requiredBytes:8192}:undefined}})});}});
 try{
  f.manager.setMode(true);await until(()=>!['idle','loading'].includes(f.manager.stats.state));
  assert.equal(f.manager.stats.state,'waiting-gpu-budget');
  assert.deepEqual(f.manager.stats.resources.gpuWaiting,{phase:'environment GPU buffers',label:'environment GPU buffers',requiredBytes:8192,publishedState:'ready'});
  gpu.deferred=false;assert.equal(f.manager.stats.state,'ready','the reported state follows the renderer once its storage exists');assert.equal(f.manager.stats.resources.gpuWaiting,undefined);
 }finally{f.manager.destroy();f.store.destroy();}
});
