import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {createTsModuleLoader} from './support/fixtures-solar-texture-env-ts-modules.mjs';

// Follow-ups of the environment manager's page-budget admission: the retained
// water-admission profile, the municipal boundary's solar index, and the pure
// depth-plane module. Logical ledger checks only; no GPU or physical memory.
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),safety=path.join(web,'src/safety'),ts=createRequire(path.join(web,'package.json'))('typescript');
const entry=[
 "export {installEnvironmentScene} from './environment-scene-manager';",
 "export {createChunkResourceStore,getPageChunkResourceStore} from './render-runtime/chunk-resource-store';",
 "export {createResourceBudget,getPageResourceBudget} from './render-runtime/resource-budget';",
 "export {environmentClaimBytes,environmentJsonReadCosts,environmentRetainedEstimate} from './environment-resource-budget';",
 "export {currentSolarShadowBoundary,prepareSolarShadowBoundary,solarShadowBoundaryCacheStats,solarShadowBoundaryIndexBytes,SOLAR_BOUNDARY_INDEX_MODEL} from './solar-shadow-admission';",
].join('');
const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true,plugins:[{name:'renderer-only-fixture',setup(b){b.onResolve({filter:/^\.\/environment-scene-renderer$/},()=>({path:'renderer',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const createEnvironmentSceneRenderer=(map,options)=>map.createFixtureRenderer(options);',loader:'js'}));}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024,sourceSHA='a'.repeat(64),snapshot='fixture',wrapper=m.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes;
const hash=n=>n.toString(16).padStart(64,'0');
// The shared solar boundary cache is module-global: every test uses its own hash.
let shaSerial=0x5e000;const nextSha=()=>hash(++shaSerial);
const square=([w,s,e,n])=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
// A closed ring around the view whose teeth each span most latitude buckets,
// so the exact index size grows with the tooth count.
function sawtooth(teeth){const ring=[[9,48.9]];for(let i=0;i<=teeth;i++)ring.push([9+3*i/teeth,i%2?52:49]);ring.push([12,48.9],[9,48.9]);return{type:'Polygon',coordinates:[ring]};}
const tile=(n,bbox)=>({id:'tile-'+String(n).padStart(3,'0'),tile_key:String(n),bbox,kinds:{water:1},feature_count:1,path:'/safety/environment/berlin/tile-'+n+'.json',sha256:hash(n),bytes:1024});
const payload=(t,boundarySHA)=>({type:'FeatureCollection',schema_version:1,city:'berlin',features:[{type:'Feature',id:'osm/way/'+Number(BigInt('0x'+t.sha256)),geometry:{type:'Polygon',coordinates:[square(t.bbox)]},properties:{kind:'water',osmTags:{},displayClip:false,source_snapshot:snapshot,source_pbf_sha256:sourceSHA,source_boundary_sha256:boundarySHA}}]});
const profileFor=(boundarySHA,t,extra=64)=>({boundarySHA256:boundarySHA,origin:[10.5,50.5],sourcePbfSHA256:sourceSHA,physicalTileSHA256:[t.sha256,...Array.from({length:extra},(_,i)=>hash(0x7000+i))]});
const settle=async(count=8)=>{for(let i=0;i<count;i++)await new Promise(resolve=>setImmediate(resolve));};
async function until(predicate,label='fixture'){for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error(label+' did not settle');}
function countTimers(){const saved=globalThis.setTimeout;let count=0;globalThis.setTimeout=(...args)=>{count++;return saved(...args);};return{get count(){return count;},restore(){globalThis.setTimeout=saved;}};}
// Records probe() whenever an ArrayBuffer of exactly `bytes` is constructed.
function observeAllocation(bytes,probe){const Native=globalThis.ArrayBuffer,seen=[];globalThis.ArrayBuffer=new Proxy(Native,{construct(target,args){if(args[0]===bytes)seen.push(probe());return Reflect.construct(target,args);}});return{seen,restore(){globalThis.ArrayBuffer=Native;}};}

let layerSerial=0;
// page:true installs on the page store (one ledger with the shared module, as
// on the product page); otherwise the manager receives a private store/ledger.
// waterAdmission may be a function of the fixture, run just before the install.
function fixture({page=false,limitBytes=64*MiB,boundarySHA=nextSha(),geometry={type:'Polygon',coordinates:[square([9,49,12,52])]},boundaryBytes=100,tiles=[tile(1,[10.005,50.005,10.015,50.015])],waterAdmission,onRead}={}){
 const budget=page?m.getPageResourceBudget():m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,32*MiB)});
 const store=page?m.getPageChunkResourceStore():m.createChunkResourceStore({budget});
 const reads=[],publications=[],renderers=[],events=new Map(),layers=new Map(),box=[10,50,10.02,50.02],centre={lng:10.01,lat:50.01};
 const createFixtureRenderer=options=>{
  const renderer={options,enabled:false,layer:{id:'environment-followups-'+(++layerSerial),onRemove(){}},setFeatures(features,_bounds,water,_camera,detail='full'){publications.push({ids:features.map(f=>f.id),water:[...(water??[])].map(f=>f.id),detail});},setEnabled(v){this.enabled=v;},setReflectionSource(){},setSceneEnvironment(){},setOffscreen(){},setVisible(){},setReducedMotion(){},resetPlanarReflectionGPU(){},destroy(){},stats:{animationActive:false,omittedTrees:0,heldWater:0,greenGround:{held:0,omitted:0},treeRows:{truncated:false},woodland:{truncated:false}}};
  renderers.push(renderer);return renderer;
 };
 const map={createFixtureRenderer,getZoom:()=>18,getPitch:()=>0,getVerticalFieldOfView:()=>40,getCanvas:()=>({clientWidth:1200,clientHeight:600}),getCenter:()=>centre,getBounds:()=>({getWest:()=>box[0],getSouth:()=>box[1],getEast:()=>box[2],getNorth:()=>box[3]}),getLayer:id=>layers.get(id),addLayer:l=>layers.set(l.id,l),removeLayer:id=>layers.delete(id),on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n),triggerRepaint(){}};
 const boundary={id:'osm/relation/1',name:'Berlin',source_pbf_sha256:sourceSHA,within_expected_area:true,geometry};
 const manifest={schema_version:1,city:'berlin',source_snapshot:snapshot,source_pbf_sha256:sourceSHA,city_boundary:{path:'/safety/environment/berlin/boundary.json',bytes:boundaryBytes,sha256:boundarySHA},tiles};
 const f={budget,store,reads,publications,renderers,manifest,boundarySHA,count:suffix=>reads.filter(p=>p.endsWith(suffix)).length};
 const admission=typeof waterAdmission==='function'?waterAdmission(f):waterAdmission;
 f.manager=m.installEnvironmentScene({map,city:'berlin',beforeLayer:()=>undefined,waterAdmission:admission,...(page?{}:{resourceStore:store}),read:async(asset,signal)=>{
  const p=typeof asset==='string'?asset:asset.path;reads.push(p);await onRead?.(p,f,signal);
  if(p.endsWith('/index.json'))return manifest;if(p.endsWith('/boundary.json'))return boundary;
  const t=tiles.find(v=>v.path===p);assert.ok(t,'known tile '+p);return payload(t,boundarySHA);
 }});
 return f;
}
const ready=f=>()=>['ready','partial'].includes(f.manager.stats.state);

test('the water admission profile is charged under its own identity from install until destroy',async()=>{
 const boundarySHA=nextSha(),t=tile(1,[10.005,50.005,10.015,50.015]),profile=profileFor(boundarySHA,t),bytes=m.environmentRetainedEstimate(profile);
 const f=fixture({boundarySHA,tiles:[t],waterAdmission:profile});
 try{
  assert.ok(bytes>0);
  assert.equal(f.budget.stats.bytes,bytes,'charged synchronously by the install, before any refresh or read');
  assert.equal(f.budget.stats.categories.metadata?.bytes,bytes);assert.equal(f.reads.length,0);
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,bytes);
  const caller=f.budget.reserve({category:'decoded',bytes,precision:'estimate',identity:profile});
  assert.equal(f.budget.stats.bytes,bytes,'a caller charging the same profile identity is counted once');
  caller.release();assert.equal(f.budget.stats.bytes,bytes,'and the manager claim keeps it charged');
  f.manager.setMode(true);await until(ready(f));
  assert.deepEqual(f.publications.at(-1).water,['osm/way/1'],'the retained profile still admits its matching water');
  f.manager.setMode(false);
  assert.equal(f.budget.stats.bytes,bytes,'explicit 2D returns every other claim; the profile stays charged while the options hold it');
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,bytes);
  f.manager.setMode(true);await until(ready(f));assert.deepEqual(f.publications.at(-1).water,['osm/way/1']);
 }finally{f.manager.destroy();}
 assert.equal(f.budget.stats.bytes,0,'destroy returns the profile claim');assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,0);
 f.store.destroy();
});

test('the product hand-off takes the profile over from the read claim its caller just released, without waiting',()=>{
 const boundarySHA=nextSha(),t=tile(1,[10.005,50.005,10.015,50.015]),text=JSON.stringify(profileFor(boundarySHA,t,256));
 const readCosts=m.environmentJsonReadCosts({bytes:Buffer.byteLength(text)},'water admission profile'),readBytes=m.environmentClaimBytes(readCosts);
 let blocker,decoded;
 // The caller's order: admit the read claim, decode, release it in finally,
 // then install synchronously. Only the released read claim is free.
 const f=fixture({boundarySHA,tiles:[t],waterAdmission:f=>{
  blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-readBytes,precision:'exact'});
  const readClaim=f.budget.reserve(readCosts);assert.equal(f.budget.stats.availableBytes,0);
  try{decoded=JSON.parse(text);}finally{readClaim.release();}
  return decoded;
 }});
 try{
  const bytes=m.environmentRetainedEstimate(decoded);
  assert.ok(bytes<=readBytes,'the retained profile is bounded by the released read claim');
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,bytes,'taken over in the same task');
  assert.equal(f.budget.stats.bytes,blocker.bytes+bytes);assert.equal(f.budget.stats.availabilityListeners,0,'no wait was registered');
 }finally{f.manager.destroy();blocker.release();}
 assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('a refused install hand-off makes the first refresh wait for the profile before any read, holding nothing',async()=>{
 const boundarySHA=nextSha(),t=tile(1,[10.005,50.005,10.015,50.015]),profile=profileFor(boundarySHA,t),bytes=m.environmentRetainedEstimate(profile);let blocker;
 const f=fixture({boundarySHA,tiles:[t],waterAdmission:f=>{blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-(bytes-1),precision:'exact'});return profile;}});
 const timers=countTimers();
 try{
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,0,'the install hand-off was refused');
  f.manager.setMode(true);await settle();
  assert.equal(f.reads.length,0,'no manifest read before the profile is charged');assert.equal(f.manager.stats.state,'loading');
  const pending=f.manager.stats.resources.admission.pending;
  assert.equal(pending.phase,'environment water admission profile');assert.equal(pending.requiredBytes,bytes);
  assert.equal(f.budget.stats.bytes,blocker.bytes,'nothing else of the manager is held while it waits');
  assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(timers.count,0,'waiting creates no polling timer');
  timers.restore();
  blocker.release();await until(ready(f));
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,bytes);assert.equal(f.count('/index.json'),1);
  assert.equal(f.manager.stats.resources.admission.pending,undefined);assert.deepEqual(f.publications.at(-1).water,['osm/way/1']);
 }finally{timers.restore();f.manager.destroy();blocker.release();}
 assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('destroy during the profile wait removes the wait, and a later wake-up charges nothing',async()=>{
 const boundarySHA=nextSha(),t=tile(1,[10.005,50.005,10.015,50.015]),profile=profileFor(boundarySHA,t),bytes=m.environmentRetainedEstimate(profile);let blocker;
 const f=fixture({boundarySHA,tiles:[t],waterAdmission:f=>{blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-(bytes-1),precision:'exact'});return profile;}});
 try{
  f.manager.setMode(true);await settle();assert.equal(f.budget.stats.availabilityListeners,1);
  f.manager.destroy();await settle();
  assert.equal(f.budget.stats.availabilityListeners,0);assert.equal(f.budget.stats.bytes,blocker.bytes);assert.equal(f.reads.length,0);
  blocker.release();await settle();
  assert.equal(f.budget.stats.bytes,0);assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,0);
 }finally{f.manager.destroy();blocker.release();f.store.destroy();}
});

test('a profile larger than the page limit is reported unfit before any read and never waits',async()=>{
 const limit=64*1024,boundarySHA=nextSha(),t=tile(1,[10.005,50.005,10.015,50.015]),profile=profileFor(boundarySHA,t,600),bytes=m.environmentRetainedEstimate(profile);
 assert.ok(bytes>limit,'fixture: the retained profile exceeds the whole limit');
 const f=fixture({limitBytes:limit,boundarySHA,tiles:[t],waterAdmission:profile});
 try{
  assert.equal(f.manager.stats.resources.waterAdmissionClaimBytes,0);
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='error');
  assert.equal(f.manager.stats.lastError,'Environment resource environment water admission profile requires '+bytes+' logical bytes, above the page budget limit '+limit);
  assert.equal(f.reads.length,0);assert.equal(f.manager.stats.resources.admission.unfitAdmissions,1);
  assert.equal(f.budget.stats.availabilityListeners,0);assert.equal(f.budget.stats.bytes,0);
 }finally{f.manager.destroy();f.store.destroy();}
});

test('on the page ledger the solar index is admitted before allocation, handed to the shared module and counted once',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(400),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 const shadow=()=>page.stats.categories.shadow?.bytes??0,shadowExact=()=>page.stats.categories.shadow?.exactBytes??0,cached=()=>m.solarShadowBoundaryCacheStats().claimedBytes,beforeExact=shadowExact();
 const allocation=observeAllocation(exact,()=>({exact:shadowExact()-beforeExact,cached:m.currentSolarShadowBoundary(boundarySHA)!==undefined}));
 const f=fixture({page:true,boundarySHA,geometry});
 try{
  f.manager.setMode(true);await until(ready(f));allocation.restore();
  assert.deepEqual(allocation.seen,[{exact,cached:false}],'one index allocation, with its exact bytes already on the page ledger');
  const prepared=f.renderers[0].options.verifiedBoundary;
  assert.equal(prepared,m.currentSolarShadowBoundary(boundarySHA));assert.equal(prepared.boundarySHA256,boundarySHA);
  assert.equal(f.manager.stats.resources.boundaryIndexBytes,exact+wrapper,'the manager holds the index costs');
  assert.equal(shadow(),cached(),'the module cache claim and the manager claim count the index once');
  f.manager.setMode(false);
  assert.equal(f.manager.stats.resources.boundaryIndexBytes,0);assert.equal(shadow(),cached(),'the module cache still holds and charges its entry');
 }finally{allocation.restore();f.manager.destroy();}
});

test('on a separate ledger the manager keeps the admitted index bytes through the allocation and returns them with the manifest',async()=>{
 const boundarySHA=nextSha(),geometry=sawtooth(400),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 const f=fixture({boundarySHA,geometry});
 const allocation=observeAllocation(exact,()=>f.budget.stats.categories.shadow?.exactBytes??0);
 try{
  f.manager.setMode(true);await until(ready(f));allocation.restore();
  assert.deepEqual(allocation.seen,[exact],'the manager ledger carries the exact index bytes when the index is allocated');
  assert.equal(f.budget.stats.categories.shadow.bytes,exact+wrapper);assert.equal(f.manager.stats.resources.boundaryIndexBytes,exact+wrapper);
  assert.ok(f.manager.stats.resources.manifestClaimBytes>exact+wrapper,'carried by the retained manifest claim');
  f.manager.setMode(false);assert.equal(f.budget.stats.bytes,0,'returned with the manifest');
 }finally{allocation.restore();f.manager.destroy();f.store.destroy();}
});

test('a holder keeps the index charged after the shared cache drops it, and returns it when it lets go',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(300),own=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry})+wrapper;
 const shadow=()=>page.stats.categories.shadow?.bytes??0,cached=()=>m.solarShadowBoundaryCacheStats().claimedBytes;
 const f=fixture({page:true,boundarySHA,geometry});
 try{
  f.manager.setMode(true);await until(ready(f));
  assert.equal(shadow(),cached(),'while cached, both holders count it once');
  for(let i=0;i<2;i++)m.prepareSolarShadowBoundary({boundarySHA256:nextSha(),geometry:{type:'Polygon',coordinates:[square([0,0,1,1])]}});
  assert.equal(m.currentSolarShadowBoundary(boundarySHA),undefined,'the two-entry cache dropped it');
  assert.equal(f.renderers[0].options.verifiedBoundary.boundarySHA256,boundarySHA,'the environment still holds the prepared index');
  assert.equal(shadow()-cached(),own,'and still charges it');
  f.manager.setMode(false);assert.equal(shadow(),cached(),'returned when the manager lets go');
 }finally{f.manager.destroy();}
});

test('a refused index step releases the whole bootstrap; the retry admits its first step whole before the manifest read',async()=>{
 const boundarySHA=nextSha(),geometry=sawtooth(800),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 let blocker,armed=true,atSecondManifest,atSecondBoundary;
 const f=fixture({boundarySHA,geometry,onRead:(p,f)=>{
  // Another owner takes memory while the boundary is read.
  if(p.endsWith('/boundary.json')&&armed){armed=false;blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes-Math.floor(exact/2),precision:'exact'});}
  else if(p.endsWith('/boundary.json'))atSecondBoundary=f.budget.stats.bytes;
  if(p.endsWith('/index.json')&&f.count('/index.json')===2)atSecondManifest=f.budget.stats.bytes;
 }});
 const timers=countTimers();
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.pending!==undefined);
  const peak=m.environmentRetainedEstimate(f.manifest)+(24*100+16)+exact+wrapper,manifestRead=m.environmentClaimBytes(m.environmentJsonReadCosts({bytes:1024**2},'manifest')),r=f.manager.stats.resources;
  assert.ok(peak<manifestRead,'fixture: this index step fits inside the manifest read set');
  assert.equal(r.bootstrapRestarts,1);assert.equal(r.bootstrapPeakBytes,peak,'the refused step (manifest, parsed boundary, index) is the learned peak');
  assert.equal(r.admission.pending.phase,'environment manifest','the retry admits the larger manifest read set first');assert.equal(r.admission.pending.requiredBytes,manifestRead);
  assert.equal(f.budget.stats.bytes,blocker.bytes,'the attempt released its manifest and boundary: nothing is held while it waits');
  assert.equal(f.count('/index.json'),1);assert.equal(f.count('/boundary.json'),1);assert.equal(m.currentSolarShadowBoundary(boundarySHA),undefined,'no index was built');
  assert.equal(f.budget.stats.availabilityListeners,1);assert.equal(timers.count,0,'waiting creates no polling timer');
  timers.restore();blocker.release();await until(ready(f));
  assert.equal(atSecondManifest,manifestRead,'the retry holds its whole first step before the manifest read');
  assert.equal(atSecondBoundary,peak,'its smaller boundary step keeps headroom up to the learned peak through the boundary read');
  assert.equal(f.count('/index.json'),2);assert.equal(f.count('/boundary.json'),2);
  assert.equal(f.manager.stats.resources.bootstrapRestarts,1,'no later step of the retry grew past the learned peak');
  assert.equal(f.manager.stats.resources.bootstrapPeakBytes,0);assert.equal(f.manager.stats.resources.boundaryIndexBytes,exact+wrapper);
  assert.equal(f.manager.stats.resources.manifestClaimBytes,m.environmentRetainedEstimate(f.manifest)+exact+wrapper,'the committed claim drops the headroom');
 }finally{timers.restore();f.manager.destroy();blocker?.release();}
 assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('another owner taking what a shrinking retry step gives back cannot refuse that retry again',async()=>{
 const boundarySHA=nextSha(),geometry=sawtooth(800),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 // At each boundary read (at most four), a competing owner takes every free byte
 // but half the index: the growth the index step would need is gone each time.
 const competitors=[],heldAtBoundary=[];
 const f=fixture({boundarySHA,geometry,onRead:(p,f)=>{
  if(!p.endsWith('/boundary.json')||competitors.length>=4)return;
  heldAtBoundary.push(f.budget.stats.bytes-competitors.reduce((sum,claim)=>sum+claim.bytes,0));
  competitors.push(f.budget.reserve({category:'texture',bytes:Math.max(0,f.budget.stats.availableBytes-Math.floor(exact/2)),precision:'exact'}));
 }});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.bootstrapRestarts===1&&f.manager.stats.resources.admission.pending!==undefined);
  const peak=m.environmentRetainedEstimate(f.manifest)+(24*100+16)+exact+wrapper;
  assert.equal(f.manager.stats.resources.bootstrapPeakBytes,peak,'the first attempt learned its refused index step');
  competitors[0].release();
  await until(()=>ready(f)()||f.manager.stats.resources.bootstrapRestarts>1,'ready or a second restart');
  assert.equal(competitors.length,2,'the competitor also took what the retry gave back at its boundary step');
  assert.equal(heldAtBoundary[1],peak,'the retry held the learned peak through its boundary read');
  assert.equal(f.manager.stats.resources.bootstrapRestarts,1,'that grab could not refuse the retry again');
  assert.equal(f.manager.stats.state,'ready');assert.equal(f.count('/index.json'),2);assert.equal(f.count('/boundary.json'),2);
  assert.equal(f.manager.stats.resources.bootstrapPeakBytes,0);assert.equal(f.manager.stats.resources.boundaryIndexBytes,exact+wrapper);
 }finally{f.manager.destroy();for(const claim of competitors)claim.release();}
 assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('the boundary read set joins the bootstrap claim; a refused growth waits without holding the manifest read set',async()=>{
 let blocker,armed=true,atSecondManifest;
 const f=fixture({boundaryBytes:1024**2,onRead:(p,f)=>{
  if(p.endsWith('/index.json')&&armed){armed=false;blocker=f.budget.reserve({category:'texture',bytes:f.budget.stats.availableBytes,precision:'exact'});}
  else if(p.endsWith('/index.json'))atSecondManifest=f.budget.stats.bytes;
 }});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.pending!==undefined);
  const need=m.environmentRetainedEstimate(f.manifest)+m.environmentClaimBytes(m.environmentJsonReadCosts({bytes:1024**2},'boundary'));
  assert.equal(f.manager.stats.resources.bootstrapPeakBytes,need,'retained manifest plus the boundary read set is the learned peak');
  assert.equal(f.manager.stats.resources.admission.pending.phase,'environment bootstrap');assert.equal(f.manager.stats.resources.admission.pending.requiredBytes,need);
  assert.equal(f.budget.stats.bytes,blocker.bytes,'the manifest read claim is not held while the boundary set waits');
  assert.equal(f.count('/boundary.json'),0);
  blocker.release();await until(ready(f));
  assert.equal(atSecondManifest,need,'the retry holds the learned peak, above the manifest read set, before its manifest read');
  assert.equal(f.count('/index.json'),2);assert.equal(f.count('/boundary.json'),1);assert.equal(f.manager.stats.resources.bootstrapRestarts,1);
 }finally{f.manager.destroy();blocker?.release();}
 assert.equal(f.budget.stats.bytes,0);f.store.destroy();
});

test('an index that cannot fit under the page limit is reported unfit before any allocation',async()=>{
 const boundarySHA=nextSha(),geometry=sawtooth(110000),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 const limit=m.environmentClaimBytes(m.environmentJsonReadCosts({bytes:1024**2},'manifest'))+64*1024;
 assert.ok(exact>limit,'fixture: the index alone exceeds the whole limit');
 const allocation=observeAllocation(exact,()=>true),f=fixture({boundarySHA,geometry,limitBytes:limit});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.state==='error');allocation.restore();
  assert.match(f.manager.stats.lastError,/^Environment resource environment solar boundary index requires \d+ logical bytes, above the page budget limit \d+$/);
  assert.equal(allocation.seen.length,0,'no index storage was allocated');assert.equal(m.currentSolarShadowBoundary(boundarySHA),undefined);
  assert.equal(f.manager.stats.resources.admission.unfitAdmissions,1);assert.equal(f.budget.stats.availabilityListeners,0,'unfit never waits');
  assert.equal(f.budget.stats.bytes,0);assert.equal(f.count('/boundary.json'),1);
 }finally{allocation.restore();f.manager.destroy();f.store.destroy();}
});

test('the index hand-off gives nothing back: a synchronous reserver armed at the boundary read sees no wave before the index exists, and the module never waits while the bootstrap is held',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(600),index=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry})+wrapper;
 // A listener that reserves synchronously from its wake-up (the product's
 // listeners only schedule). Armed at the boundary read, it would take the
 // index bytes from any wave that ran before the index exists.
 let armed=false,beforeIndex=0,afterIndex=0;const grabbed=[];
 const off=page.onAvailable(()=>{if(!armed)return;if(m.currentSolarShadowBoundary(boundarySHA)){afterIndex++;return;}beforeIndex++;const taken=page.tryReserve({category:'texture',bytes:Math.max(0,page.stats.availableBytes-(index-1)),precision:'exact'});if(taken.ok)grabbed.push(taken.reservation);});
 const f=fixture({page:true,boundarySHA,geometry,onRead:(p,f)=>{if(p.endsWith('/boundary.json')&&f.count('/boundary.json')===1)armed=true;}});
 const baseListeners=page.stats.availabilityListeners;
 try{
  f.manager.setMode(true);await until(ready(f));armed=false;
  assert.equal(beforeIndex,0,'no wave ran from the boundary read to the built index');assert.equal(grabbed.length,0,'so nothing could take the index bytes');
  assert.ok(afterIndex>0,'the final step does give the parsed boundary back, once the index exists');
  const r=f.manager.stats.resources;
  assert.equal(r.bootstrapRestarts,0,'nothing was withdrawn or restarted');assert.equal(r.admission.waits,0,'and nothing waited');
  assert.equal(f.count('/index.json'),1);assert.equal(f.count('/boundary.json'),1);
  assert.equal(page.stats.availabilityListeners,baseListeners,'the module registered no wait');
  assert.equal(r.boundaryIndexBytes,index);assert.equal(f.renderers[0].options.verifiedBoundary,m.currentSolarShadowBoundary(boundarySHA));
 }finally{off();f.manager.destroy();for(const claim of grabbed)claim.release();}
});

test('on one ledger the hand-off neither restarts nor waits, and a reserver that takes and returns bytes in the first later wave changes nothing',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(600),index=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry})+wrapper;
 // Reserves inside the first wave after the boundary read and releases one
 // microtask later; no later wave follows that release.
 let armed=false,grabbed,indexAtGrab;
 const off=page.onAvailable(()=>{if(!armed)return;armed=false;indexAtGrab=m.currentSolarShadowBoundary(boundarySHA);const claim=grabbed=page.reserve({category:'texture',bytes:Math.max(0,page.stats.availableBytes-(index-1)),precision:'exact'});queueMicrotask(()=>claim.release());});
 const f=fixture({page:true,boundarySHA,geometry,onRead:(p,f)=>{if(p.endsWith('/boundary.json')&&f.count('/boundary.json')===1)armed=true;}});
 const baseListeners=page.stats.availabilityListeners;
 try{
  f.manager.setMode(true);await until(ready(f));
  assert.ok(grabbed&&!grabbed.active,'the other owner took bytes in a wave and gave them back');
  assert.ok(indexAtGrab,'that first wave came once the index existed');
  const r=f.manager.stats.resources;assert.equal(r.bootstrapRestarts,0);assert.equal(r.admission.waits,0,'no wait was registered');
  assert.equal(f.count('/index.json'),1);assert.equal(f.count('/boundary.json'),1);assert.equal(page.stats.availabilityListeners,baseListeners);
  assert.equal(f.renderers[0].options.verifiedBoundary,m.currentSolarShadowBoundary(boundarySHA));
 }finally{off();f.manager.destroy();if(grabbed?.active)grabbed.release();}
});

test('on a separate ledger a refused hand-off waits on the module ledger holding nothing, only for a wave that can hold the index',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(500),index=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry})+wrapper;
 const baseBytes=page.stats.bytes,baseListeners=page.stats.availabilityListeners;
 // The module's own (page) ledger has room for everything but this index.
 const blocker=page.reserve({category:'texture',bytes:page.stats.availableBytes-(index-1),precision:'exact'});
 const f=fixture({boundarySHA,geometry}),timers=countTimers();
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.pending!==undefined);
  const r=f.manager.stats.resources;
  assert.equal(r.admission.pending.phase,'environment solar boundary index');assert.equal(r.admission.pending.requiredBytes,index);
  assert.equal(r.bootstrapRestarts,1);assert.equal(m.currentSolarShadowBoundary(boundarySHA),undefined,'nothing was built');
  assert.equal(f.budget.stats.bytes,0,'nothing is held on the manager ledger while it waits');
  assert.equal(page.stats.bytes,baseBytes+blocker.bytes,'nor on the module ledger');
  assert.equal(page.stats.availabilityListeners,baseListeners+1,'one registration: the withdrawn module wait is gone');assert.equal(f.budget.stats.availabilityListeners,0);
  // A wave that cannot hold the index does not restart the bootstrap.
  const small=page.reserve({category:'texture',bytes:1,precision:'exact'});small.release();await settle();
  assert.equal(f.manager.stats.resources.bootstrapRestarts,1);assert.equal(f.count('/index.json'),1);assert.equal(f.count('/boundary.json'),1);
  assert.equal(page.stats.availabilityListeners,baseListeners+1,'it keeps its one registration');assert.equal(timers.count,0,'waiting creates no polling timer');
  timers.restore();blocker.release();await until(ready(f));
  assert.equal(f.manager.stats.resources.bootstrapRestarts,1);assert.equal(f.count('/index.json'),2);assert.equal(f.count('/boundary.json'),2);
  assert.equal(f.renderers[0].options.verifiedBoundary,m.currentSolarShadowBoundary(boundarySHA));assert.equal(page.stats.availabilityListeners,baseListeners);
 }finally{timers.restore();f.manager.destroy();blocker.release();f.store.destroy();}
 assert.equal(f.budget.stats.bytes,0);
});

test('on a separate ledger a refused split waits once on the module ledger holding nothing, and the release right after the refusal wakes it',async()=>{
 const page=m.getPageResourceBudget();m.getPageChunkResourceStore().evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(500),index=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry})+wrapper;
 const baseListeners=page.stats.availabilityListeners;
 const blocker=page.reserve({category:'texture',bytes:page.stats.availableBytes-(index-1),precision:'exact'});
 // The refused split runs the page pressure callbacks; this one returns the
 // blocker one microtask later, after the manager registered its one wait in
 // the refusal's turn. Its release wave is the wake-up: nothing is missed.
 let armed=true;const stop=page.onPressure(()=>{if(!armed)return;armed=false;queueMicrotask(()=>blocker.release());});
 const f=fixture({boundarySHA,geometry});
 try{
  f.manager.setMode(true);await until(()=>ready(f)()||f.manager.stats.state==='error','ready');
  assert.equal(armed,false,'the split was refused once');assert.equal(blocker.active,false);
  assert.equal(f.manager.stats.state,'ready');
  const r=f.manager.stats.resources;assert.equal(r.bootstrapRestarts,1);assert.equal(r.admission.waits,1,'one wait, registered before the release');
  assert.equal(f.count('/index.json'),2);assert.equal(f.count('/boundary.json'),2);assert.equal(page.stats.availabilityListeners,baseListeners);
  assert.equal(f.renderers[0].options.verifiedBoundary,m.currentSolarShadowBoundary(boundarySHA));
 }finally{stop();f.manager.destroy();blocker.release();f.store.destroy();}
 assert.equal(f.budget.stats.bytes,0);
});

// projectedShadowDepthPlane exactly as it stood in projected-shadow-mask.ts before the move.
const REFERENCE=String.raw`/** Homogeneous image of the actual local y=height plane. Solving M^T p=n
 * gives z_ndc=-dot(p.xyw,vec3(x_ndc,y_ndc,1))/p.z, including perspective. */
export function projectedShadowDepthPlane(matrix:ArrayLike<number>,height=.03):[number,number,number]{
 if(matrix.length!==16||!Array.from(matrix).every(Number.isFinite)||!Number.isFinite(height))throw Error('Invalid projected shadow matrix');
 const local=[0,1,0,-height],rows=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>matrix[r*4+c]),local[r]]);
 for(let c=0;c<4;c++){let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;if(Math.abs(rows[pivot][c])<1e-25)throw Error('Singular projected shadow matrix');[rows[c],rows[pivot]]=[rows[pivot],rows[c]];const d=rows[c][c];for(let k=c;k<5;k++)rows[c][k]/=d;for(let r=0;r<4;r++)if(r!==c){const f=rows[r][c];for(let k=c;k<5;k++)rows[r][k]-=f*rows[c][k];}}
 const p=rows.map(row=>row[4]);if(Math.abs(p[2])<1e-14*Math.hypot(...p))throw Error('Edge-on projected shadow plane');
 const plane:[number,number,number]=[-p[0]/p[2],-p[1]/p[2],-p[3]/p[2]];if(!plane.every(Number.isFinite))throw Error('Invalid projected shadow depth');return plane;
}`;
const referenceModule={exports:{}};
new Function('exports','module',ts.transpileModule(REFERENCE,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(referenceModule.exports,referenceModule);
const reference=referenceModule.exports.projectedShadowDepthPlane;
function mulberry32(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Perspective-like scene matrices, raw random matrices, their Float32 copies and degenerate cases.
function sampleMatrices(count){
 const random=mulberry32(0x5eed),rows=[[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1],new Array(16).fill(0),[1,0],[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,NaN]];
 for(let i=0;i<count;i++){
  const yaw=random()*2*Math.PI,pitch=random()*1.2,s=1+random()*1e5,fy=1/Math.tan(.3+random()*.4),near=random()*10+.1;
  const c=Math.cos(yaw),n=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  rows.push([fy*c*s,fy*n*sp*s,n*cp*s*1.0001,n*cp*s,0,fy*cp*s,-sp*s*1.0001,-sp*s,-fy*n*s,fy*c*sp*s,c*cp*s*1.0001,c*cp*s,random()*4e3-2e3,random()*4e3-2e3,near+random()*2e3,near+random()*2e3+1]);
  rows.push(Array.from({length:16},()=>random()*4-2));
 }
 return[...rows,...rows.filter(row=>row.length===16).map(row=>new Float32Array(row))];
}
const bits=value=>Array.from(value,v=>{const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,v);return view.getBigUint64(0).toString(16);});
const outcome=(fn,args)=>{try{return{value:bits(fn(...args))};}catch(error){return{error:error instanceof Error?error.message:String(error)};}};

test('the depth plane lives in a dependency-free module that projected-shadow-mask re-exports',async()=>{
 const text=await fs.readFile(path.join(safety,'projected-shadow-plane.ts'),'utf8'),info=ts.preProcessFile(text,true,true);
 assert.deepEqual(info.importedFiles.map(row=>row.fileName),[],'no static, dynamic or type imports');assert.equal(info.referencedFiles.length,0);
 assert.ok(text.includes(REFERENCE),'the implementation text moved verbatim');
 const mask=await fs.readFile(path.join(safety,'projected-shadow-mask.ts'),'utf8');
 assert.ok(!/\bfunction projectedShadowDepthPlane\b/.test(mask),'projected-shadow-mask keeps no second implementation');
 const bundle=await build({stdin:{contents:"export {projectedShadowDepthPlane as plane} from './projected-shadow-plane';export {projectedShadowDepthPlane as maskPlane} from './projected-shadow-mask';",resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});
 const {plane,maskPlane}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 assert.equal(maskPlane,plane,'projected-shadow-mask exports the very same function');
 assert.equal(plane.length,reference.length);
});

test('the moved depth plane returns bit-identical results and identical errors',async()=>{
 const loader=createTsModuleLoader({typescript:ts}),plane=loader.load(path.join(safety,'projected-shadow-plane.ts')).projectedShadowDepthPlane;
 assert.deepEqual(loader.files.map(file=>path.relative(safety,file)),['projected-shadow-plane.ts'],'evaluating the plane loads nothing else');
 const heights=[undefined,Math.fround(.01),Math.fround(.02),.025,1,0,-3.5,1e-7,Infinity,NaN];let values=0,errors=0;
 for(const matrix of sampleMatrices(200))for(const height of heights){
  const args=height===undefined?[matrix]:[matrix,height],actual=outcome(plane,args),expected=outcome(reference,args);
  assert.deepEqual(actual,expected);if('value'in expected)values++;else errors++;
 }
 assert.ok(values>3000&&errors>40,'both finite planes and every error branch are exercised: '+values+'/'+errors);
});

test('environment green ground takes the plane from the pure module and keeps its exact Float32 uniforms',()=>{
 const loader=createTsModuleLoader({typescript:ts}),green=loader.load(path.join(safety,'environment-green-ground.ts'));
 const name=file=>path.relative(safety,file).split(path.sep).join('/'),files=loader.files.map(name),edges=loader.edges.map(edge=>[name(edge.from),name(edge.to)]);
 assert.ok(edges.some(([from,to])=>from==='environment-green-ground.ts'&&to==='projected-shadow-plane.ts'),'the depth plane comes from the pure module');
 assert.ok(!files.includes('projected-shadow-mask.ts'),'the green ground graph no longer loads projected-shadow-mask');
 assert.deepEqual(edges.filter(([from])=>from==='projected-shadow-plane.ts'),[],'the plane module is a leaf');
 const viewport=[19,31,1920,1200],depthRange=[.17,.93],u32=value=>Array.from(new Uint32Array(value.buffer,value.byteOffset,value.length));let compared=0;
 for(const row of sampleMatrices(100)){
  if(row.length!==16)continue;
  const matrix=new Float32Array(row),actual=green.greenGroundDepthParameters(matrix,viewport,depthRange);let expected;
  try{expected=new Float32Array(reference(matrix,Math.fround(.01)));if(!expected.every(Number.isFinite))expected=undefined;}catch{expected=undefined;}
  if(expected===undefined){assert.equal(actual,undefined);continue;}
  assert.deepEqual(u32(actual.plane),u32(expected));assert.deepEqual(u32(actual.viewport),u32(new Float32Array(viewport)));assert.deepEqual(u32(actual.depthRange),u32(new Float32Array(depthRange)));compared++;
 }
 assert.ok(compared>150,'compared '+compared+' finite uniform planes');
});
