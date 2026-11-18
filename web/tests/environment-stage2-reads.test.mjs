import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MiB,hash,square,sawtooth,settle,until,encode,loadStage2Modules,createAdmittedReads,environmentSource,environmentMap,road,vehicleScenery,sceneryHost} from './support/environment-stage2-fixtures.mjs';

// Stage 2 of the environment page-budget work: the caller-admitted read
// protocol of the page byte transport (ensureRead first, holding nothing; one
// claim per read listing the read's minted envelope; the transport shrinks it
// in place at delivery), the 2xP reader integrity copies, the water profile
// identity take-over, committed-hold waits (and in-flight hold waits apart),
// the tile selection containers charged with the metadata that bounds them, the
// bootstrap headroom through a delivery, the product ledger shape and an unfit
// renderer GPU decision. Logical ledger checks only.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const m=await loadStage2Modules(safety);
let shaSerial=0x5f200;const nextSha=()=>hash(++shaSerial);
const ready=manager=>()=>['ready','partial'].includes(manager.stats.state);
const ledger=(limitBytes=256*MiB)=>{const budget=m.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,32*MiB)});return{budget,store:m.createChunkResourceStore({budget})};};
const slot=8,pushedSlots=n=>Math.ceil(n*slot*2.5),sortedSlots=n=>pushedSlots(n)+n*slot;
const profileFor=boundarySHA=>({boundarySHA256:boundarySHA,origin:[10.5,50.5],sourcePbfSHA256:'a'.repeat(64),physicalTileSHA256:Array.from({length:32},(_,i)=>hash(0x7300+i))});
/** map.on wrapper: the test can fire moveend itself. */
function withHandlers(view){const handlers=new Map(),on=view.map.on;view.map.on=(n,fn)=>{handlers.set(n,fn);return on(n,fn);};return handlers;}
function install(store,reads,extra={}){const view=environmentMap(extra.view);return{...view,manager:m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:reads.read,...(extra.legacy?{}:{ensureRead:reads.ensureRead}),...extra.options})};}

test('every environment read admits its working set and minted envelope as one claim; the transport adds no byte and shrinks that claim in place',async()=>{
 const {budget,store}=ledger(),src=environmentSource({boundarySHA:nextSha()}),reads=createAdmittedReads(m,{budget,store,files:src.files}),f=install(store,reads);
 try{
  f.manager.setMode(true);await until(ready(f.manager));
  assert.deepEqual(reads.calls.map(call=>call.path.split('/').pop()),['index.json','boundary.json','tile-1.json']);
  assert.equal(reads.ensures.length,1);assert.deepEqual(reads.ensures[0],{bytes:0,listeners:0},'the reader is readied before any claim of the manager exists');
  for(const call of reads.calls){
   const name=call.path.split('/').pop(),network=reads.network.find(row=>row.path===call.path);
   assert.ok(call.admission,name+' carries the 4th argument');
   assert.equal(call.max,call.limit,name+' passes the read ceiling the envelope is minted for');
   assert.equal(m.environmentClaimBytes(call.envelope),2*call.limit,name+': the envelope is the two-copy read of its ceiling');
   assert.equal(network.bytes,call.before,name+': the read entry reserves the claim\'s own envelope identities, adding no byte');
   assert.equal(network.listeners,0,name+': nothing waits for capacity inside the read');
   assert.equal(call.deliveredCost.bytes,reads.bytesOf(call.path).byteLength,name+' delivers exactly its bytes');
   assert.ok(!call.keep.some(cost=>call.envelope.includes(cost)),name+': keep never lists the envelope');
  }
  const [manifestRead,boundaryRead,leafRead]=reads.calls;
  assert.equal(manifestRead.admission.admitted,boundaryRead.admission.admitted,'the manifest and the boundary use the one bootstrap claim, one read at a time');
  for(const call of [manifestRead,boundaryRead]){
   assert.equal(call.claimBytes,m.environmentClaimBytes([...call.keep,...call.envelope]),'the bootstrap claim lists exactly keep and the envelope');
   assert.equal(call.claimAfter,m.environmentClaimBytes(call.keep)+call.deliveredCost.bytes,'delivery shrinks it in place to keep plus the delivered bytes');
  }
  assert.equal(typeof leafRead.admission.admitted.adjust,'function');assert.equal(leafRead.admission.admitted.bytes,undefined,'the leaf read is carried by its store production context');
  assert.equal(new Set(reads.calls.map(call=>call.envelope)).size,3,'every read mints its own envelope');
  const stats=reads.transport.stats;assert.deepEqual([stats.admittedReads,stats.admittedDeliveries,stats.admittedRefusals,stats.admittedAbandoned],[3,3,0,0]);
  const r=f.manager.stats.resources;
  assert.equal(r.manifestClaimBytes,m.environmentRetainedEstimate(src.manifest)+r.boundaryIndexBytes,'the committed bootstrap keeps no read byte');
  assert.equal(r.selectionClaimBytes,sortedSlots(1)+pushedSlots(32),'the unpartitioned tile selection slots were split off the committed bootstrap claim');
  assert.equal(r.admission.waits,0);assert.equal(r.admission.committedHoldWaits,0);assert.equal(r.readAdmission,'caller-admitted');assert.equal(r.readEnvelopeRetries,0);
 }finally{f.manager.destroy();store.evictRecent();}
 assert.equal(budget.stats.bytes,0,'destroy (and the recent raw-byte eviction) returns every byte');store.destroy();
});

test('ensureRead readies the reader holding nothing: no claim, read or wait exists until it resolves',async t=>{
 const {budget,store}=ledger(),src=environmentSource({boundarySHA:nextSha()}),reads=createAdmittedReads(m,{budget,store,files:src.files}),f=install(store,reads);
 const release=reads.holdEnsure();
 try{
  f.manager.setMode(true);await settle();
  assert.equal(reads.ensures.length,1);assert.equal(reads.calls.length,0,'no read before the reader is ready');
  assert.deepEqual([budget.stats.bytes,budget.stats.reservations,budget.stats.availabilityListeners],[0,0,0],'nothing is admitted or waiting while ensureRead waits');
  assert.equal(f.manager.stats.state,'loading');
  release();await until(ready(f.manager));assert.equal(reads.calls.length,3);
 }finally{release();f.manager.destroy();store.evictRecent();store.destroy();}
 // The scenery follows the same order before its index read.
 const host=sceneryHost(t),roads=vehicleScenery([road(1,[[13,52],[13.002,52.002]])]),index={schema_version:1,city:'berlin',role:'decorative-schematic',partial:true,snapshot:'test',source_pbf_sha256:'a'.repeat(64),data:{path:'/safety/buildings3d/roads.json',bytes:encode(roads).byteLength,sha256:'b'.repeat(64)}};
 const l=ledger(),files=new Map([['/safety/buildings3d/scenery-index.json',index],['/safety/buildings3d/roads.json',roads]]),sceneryReads=createAdmittedReads(m,{budget:l.budget,store:l.store,files});
 const scenery=m.installThreeDimensionalScenery({map:host.map,city:'berlin',locale:'en',host:host.host,buildingLayer:()=>undefined,resourceStore:l.store,read:sceneryReads.read,ensureRead:sceneryReads.ensureRead});
 const releaseScenery=sceneryReads.holdEnsure();
 try{
  scenery.setMode(true);await settle();
  assert.equal(sceneryReads.ensures.length,1);assert.equal(sceneryReads.calls.length,0);
  const vehicleOnly=l.budget.stats.bytes;assert.equal(l.budget.stats.availabilityListeners,0);
  releaseScenery();await until(()=>scenery.stats.state==='ready','scenery');
  assert.deepEqual(sceneryReads.calls.map(call=>call.path.split('/').pop()),['scenery-index.json','roads.json']);
  const [indexRead,roadsRead]=sceneryReads.calls;
  for(const call of sceneryReads.calls){assert.ok(call.admission);assert.equal(sceneryReads.network.find(row=>row.path===call.path).bytes,call.before,call.path+' adds no byte beside its claim');}
  assert.equal(indexRead.claimBytes,m.environmentClaimBytes([...indexRead.keep,...indexRead.envelope]),'the index claim lists its read set and envelope');
  assert.equal(m.environmentClaimBytes(indexRead.envelope),2*64*1024);assert.equal(m.environmentClaimBytes(roadsRead.envelope),2*index.data.bytes,'the roads envelope is sized by the descriptor');
  assert.equal(roadsRead.admission.admitted.bytes,undefined,'the roads read is carried by its store production');
  assert.equal(scenery.stats.resources.sourceLease,'ready');
  assert.ok(l.budget.stats.bytes-l.budget.stats.recentBytes>=vehicleOnly);
 }finally{releaseScenery();scenery.destroy();l.store.evictRecent();}
 assert.equal(l.budget.stats.bytes,0);l.store.destroy();
});

test('without ensureRead every read keeps the 3-argument form and the reader admits its own envelope',async()=>{
 const {budget,store}=ledger(),src=environmentSource({boundarySHA:nextSha()}),reads=createAdmittedReads(m,{budget,store,files:src.files}),f=install(store,reads,{legacy:true});
 try{
  f.manager.setMode(true);await until(ready(f.manager));
  assert.equal(reads.ensures.length,0);assert.equal(reads.calls.length,3);
  for(const call of reads.calls){
   assert.equal(call.admission,undefined,call.path);assert.equal(call.max,1024**2,'the legacy ceiling is unchanged');
   assert.equal(reads.network.find(row=>row.path===call.path).bytes,call.before+2*call.limit,'the 3-argument read admits its own two-copy envelope beside the manager claim');
  }
  assert.equal(reads.transport.stats.admittedReads,0);assert.equal(f.manager.stats.resources.readAdmission,'reader-admitted');
 }finally{f.manager.destroy();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('a refused delivery is retried holding nothing with the larger envelope it named; the retry reads once more and completes',async()=>{
 const {budget,store}=ledger(64*MiB),src=environmentSource({boundarySHA:nextSha()}),leaf=src.manifest.tiles[0];let blocker;
 // The first leaf read returns its bytes on a buffer three times their size,
 // while another owner holds every free byte: the delivery would have to grow.
 const reads=createAdmittedReads(m,{budget,store,files:src.files,
  onNetwork:row=>{if(row.path===leaf.path&&row.count===1){store.evictRecent();blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});}},
  networkBytes:(row,bytes)=>{if(row.path!==leaf.path||row.count!==1)return;const view=new Uint8Array(new ArrayBuffer(3*bytes.byteLength),0,bytes.byteLength);view.set(bytes);return view;}});
 const f=install(store,reads);
 try{
  f.manager.setMode(true);await until(()=>reads.transport.stats.admittedRefusals===1&&f.manager.stats.resources.admission.pending!==undefined,'a refused delivery');
  const r=f.manager.stats.resources;
  assert.equal(r.admission.pending.phase,'leaf-decode','the demand waits for a release');
  assert.equal(budget.stats.bytes-budget.stats.recentBytes,blocker.bytes+r.manifestClaimBytes+r.selectionClaimBytes,'nothing of the refused leaf is held while it waits');
  assert.equal(budget.stats.availabilityListeners,1);assert.equal(f.manager.stats.state,'loading');
  blocker.release();await until(ready(f.manager));
  const leafCalls=reads.calls.filter(call=>call.path===leaf.path);
  assert.equal(leafCalls.length,2,'one retry');assert.equal(reads.count('/tile-1.json'),2);
  assert.equal(m.environmentClaimBytes(leafCalls[0].envelope),2*leaf.bytes);
  assert.equal(m.environmentClaimBytes(leafCalls[1].envelope),3*leaf.bytes,'the retry admits the envelope the refusal named at once');
  assert.equal(reads.transport.stats.admittedRefusals,1);assert.equal(f.publications.at(-1).length,1);
 }finally{f.manager.destroy();blocker?.release();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('refused deliveries: one retry with the named envelope, then unfit; a retry above the ledger is unfit at once',()=>{
 const pressure={capacity:4*MiB,required:5*MiB,current:3*MiB,recentCapacity:MiB,recentRequired:0,recentCurrent:0,shortfallBytes:MiB,recentShortfallBytes:0,additionalBytes:2*MiB,constraint:'total',label:'fixture'};
 const refused=(deliveredBytes,limitBytes=4*MiB)=>new m.ResourceByteDeliveryRefusedError(pressure,{keepBytes:1000,deliveredBytes,max:1024,limitBytes});
 const envelopes=m.createEnvironmentReadEnvelopes();
 assert.equal(m.environmentClaimBytes(envelopes.mint('/a',1024)),2048);
 const first=refused(5000);assert.equal(first.unfit,false);
 assert.deepEqual(envelopes.failure('/a','environment page',first),{retry:true});
 assert.equal(m.environmentClaimBytes(envelopes.mint('/a',1024)),5000,'the next read of the path mints the named envelope');assert.equal(envelopes.deliverable('/a',1024),5000);
 const again=envelopes.failure('/a','environment page',refused(5000));
 assert.equal(again.retry,false);assert.ok(again.error instanceof m.EnvironmentResourceUnfitError,'refused again after its retry: unfit, not a loop');
 assert.ok(again.error instanceof m.EnvironmentResourceRefusedAgainError);assert.equal(again.error.requiredBytes,refused(5000).retryBytes);assert.ok(again.error.requiredBytes<=again.error.limitBytes,'fixture: the retry claim is within the limit');
 assert.doesNotMatch(again.error.message,/above the page/,'the message claims no excess it does not have');
 assert.match(again.error.message,/^Environment resource environment page was refused again after its retry with the named 5000-byte envelope \(that retry claim: \d+ logical bytes; page budget limit 4194304\)$/);
 assert.equal(m.environmentClaimBytes(envelopes.mint('/a',1024)),2048,'the reported path starts over');
 const huge=envelopes.failure('/b','environment leaf read',refused(8*MiB));
 assert.equal(huge.retry,false);assert.ok(huge.error instanceof m.EnvironmentResourceUnfitError);assert.ok(!(huge.error instanceof m.EnvironmentResourceRefusedAgainError),'a retry above the ledger keeps the unfit message');assert.match(huge.error.message,/environment leaf read requires \d+ logical bytes, above the page budget limit 4194304/);
 const other=new Error('read failed');assert.deepEqual(envelopes.failure('/c','x',other),{retry:false,error:other},'other failures pass through');
 envelopes.failure('/d','x',refused(3000));envelopes.delivered('/d');assert.equal(m.environmentClaimBytes(envelopes.mint('/d',1024)),2048,'a completed read clears its retry envelope');
});

test('the bootstrap keeps its learned peak through a delivery: a reserver taking what the boundary delivery frees cannot refuse the retry again',async()=>{
 const {budget,store}=ledger(64*MiB),boundarySHA=nextSha(),geometry=sawtooth(800),src=environmentSource({boundarySHA,geometry});
 const exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry}),boundaryBytes=src.manifest.city_boundary.bytes;
 const competitors=[];let armed=false,off;
 // First attempt: at the boundary read another owner takes every free byte but
 // half the index, so the index step is refused. The retry's boundary read arms
 // a listener that, in the first wave after it, takes every free byte but one.
 const reads=createAdmittedReads(m,{budget,store,files:src.files,onNetwork:row=>{
  if(!row.path.endsWith('/boundary.json'))return;
  if(row.count===1)competitors.push(budget.reserve({category:'texture',bytes:Math.max(0,budget.stats.availableBytes-Math.floor(exact/2)),precision:'exact'}));
  else if(row.count===2)armed=true;
 }});
 off=budget.onAvailable(()=>{if(!armed)return;armed=false;competitors.push(budget.reserve({category:'texture',bytes:Math.max(0,budget.stats.availableBytes-1),precision:'exact'}));});
 const f=install(store,reads);
 try{
  assert.ok(exact>6*boundaryBytes,'fixture: the index step grows past the delivered boundary step');
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.bootstrapRestarts===1&&f.manager.stats.resources.admission.pending!==undefined,'the first restart');
  const peak=f.manager.stats.resources.bootstrapPeakBytes;
  assert.equal(peak,m.environmentRetainedEstimate(src.manifest)+(24*boundaryBytes+16)+exact+m.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,'the refused index step is the learned peak');
  competitors[0].release();
  await until(()=>competitors.length===2,'the retry boundary delivery');
  await until(()=>f.manager.stats.resources.bootstrapRestarts>1||m.currentSolarShadowBoundary(boundarySHA)!==undefined,'the index or a second restart');
  assert.equal(f.manager.stats.resources.bootstrapRestarts,1,'the delivered claim kept the peak: the index step did not grow');
  competitors[1].release();await until(ready(f.manager));
  assert.equal(reads.count('/index.json'),2);assert.equal(reads.count('/boundary.json'),2);assert.equal(f.manager.stats.resources.bootstrapPeakBytes,0);
 }finally{off();f.manager.destroy();for(const claim of competitors)claim.release();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('after the same-ledger index hand-over the bootstrap claim still carries its headroom up to the learned peak',async()=>{
 const page=m.getPageResourceBudget(),pageStore=m.getPageChunkResourceStore();pageStore.evictRecent();
 const boundarySHA=nextSha(),geometry=sawtooth(500),src=environmentSource({boundarySHA,geometry}),exact=m.solarShadowBoundaryIndexBytes({boundarySHA256:boundarySHA,geometry});
 src.manifest.city_boundary.bytes=1024**2;// a large descriptor: its read set, not the index, is the refused step
 let blocker,armed=true;const values=new Map([...src.files]),seen=[];
 const Native=globalThis.ArrayBuffer;
 const view=environmentMap();
 const manager=m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,read:async asset=>{const p=typeof asset==='string'?asset:asset.path;if(p.endsWith('/index.json')&&armed){armed=false;blocker=page.reserve({category:'texture',bytes:page.stats.availableBytes,precision:'exact'});}return values.get(p);}});
 const base=page.stats.bytes;
 try{
  manager.setMode(true);await until(()=>manager.stats.resources.admission.pending!==undefined,'the refused boundary step');
  const peak=manager.stats.resources.bootstrapPeakBytes;assert.ok(peak>m.environmentRetainedEstimate(src.manifest)+exact,'fixture: the learned peak is above the index step');
  globalThis.ArrayBuffer=new Proxy(Native,{construct(target,args){if(args[0]===exact)seen.push({bytes:page.stats.bytes-base,peak:manager.stats.resources.bootstrapPeakBytes});return Reflect.construct(target,args);}});
  blocker.release();await until(ready(manager));
  globalThis.ArrayBuffer=Native;
  assert.equal(seen.length,1,'one index allocation');
  assert.equal(seen[0].bytes,seen[0].peak,'at the index allocation the claim (manifest, parsed boundary, headroom) and the handed-over index hold exactly the learned peak');
  assert.equal(manager.stats.resources.bootstrapRestarts,1);
 }finally{globalThis.ArrayBuffer=Native;manager.destroy();blocker?.release();}
});

test('the water profile is taken over under its own identity: a caller that shrinks its claim to it, installs, then releases adds no byte and wakes nobody, even on a full ledger',()=>{
 const {budget,store}=ledger(64*MiB),boundarySHA=nextSha(),profile={boundarySHA256:boundarySHA,origin:[10.5,50.5],sourcePbfSHA256:'a'.repeat(64),physicalTileSHA256:Array.from({length:128},(_,i)=>hash(0x7100+i))};
 const text=JSON.stringify(profile),readCosts=m.environmentJsonReadCosts({bytes:Buffer.byteLength(text)},'water admission profile'),cost=m.environmentWaterProfileCost(profile);
 assert.deepEqual(m.environmentDecodedCost(m.environmentRetainedEstimate(profile),profile,'environment water admission profile','metadata'),cost,'the product caller\'s inline cost is this cost');
 assert.deepEqual([cost.category,cost.identity,cost.label],['metadata',profile,m.ENVIRONMENT_WATER_PROFILE_LABEL]);
 const caller=budget.reserve(readCosts,{label:'caller profile read'});assert.ok(cost.bytes<=caller.bytes);
 assert.equal(caller.adjust([cost]),true,'the caller shrinks its read claim in place');
 const blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});assert.equal(budget.stats.availableBytes,0);
 const before={bytes:budget.stats.bytes,events:budget.stats.availabilityEvents,reservations:budget.stats.reservations},view=environmentMap();
 const manager=m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:async()=>{throw Error('no read');},waterAdmission:profile});
 try{
  assert.equal(manager.stats.resources.waterAdmissionClaimBytes,cost.bytes,'taken over at install on a full ledger');
  assert.deepEqual([budget.stats.bytes,budget.stats.availabilityEvents,budget.stats.reservations,budget.stats.availabilityListeners],[before.bytes,before.events,before.reservations+1,0],'the install adds no byte, runs no wave and registers no wait');
  caller.release();
  assert.deepEqual([budget.stats.bytes,budget.stats.availabilityEvents],[before.bytes,before.events],'the caller\'s release then changes no byte and wakes nobody');
 }finally{manager.destroy();}
 assert.equal(budget.stats.bytes,blocker.bytes,'destroy returns the profile');blocker.release();store.destroy();
});

test('a wait for the next item while committed items are kept is counted as a committed-hold wait; a wait holding nothing (or only the page-lifetime water profile) is not',async()=>{
 const {budget,store}=ledger(64*MiB),src=environmentSource({boundarySHA:nextSha()}),leaf=src.manifest.tiles[0];let blocker,leafBlocker;
 const reads=createAdmittedReads(m,{budget,store,files:src.files});
 const leafNeed=2*leaf.bytes+m.environmentClaimBytes(m.environmentJsonReadCosts({bytes:leaf.bytes},'leaf'))+80;
 // The product configuration: main.ts always hands the decoded water profile over at install.
 const f=install(store,reads,{options:{waterAdmission:profileFor(src.boundarySHA)},view:{onRenderer:()=>{store.evictRecent();leafBlocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(leafNeed-1),precision:'exact'});}}});
 try{
  assert.ok(f.manager.stats.resources.waterAdmissionClaimBytes>0,'the profile is charged from install');
  blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-1,precision:'exact'});
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.pending!==undefined,'the manifest wait');
  let a=f.manager.stats.resources.admission;
  assert.equal(a.pending.phase,'environment manifest');assert.equal(a.committedHoldWaits,0,'the first claim waits holding nothing of this 3D lifetime: the page-lifetime profile is not a committed item');assert.equal(a.lastCommittedHold,undefined);
  assert.equal(a.inFlightHoldWaits,0);
  blocker.release();await until(()=>f.manager.stats.resources.admission.pending?.phase==='environment leaf read','the leaf wait');
  a=f.manager.stats.resources.admission;
  assert.equal(a.committedHoldWaits,1,'the leaf waits beside the committed manifest');
  assert.equal(a.lastCommittedHold.phase,'environment leaf read');assert.equal(a.lastCommittedHold.heldBytes,f.manager.stats.resources.manifestClaimBytes+f.manager.stats.resources.selectionClaimBytes,'the manifest, its index and the tile selection slots; never the water profile');
  assert.equal(a.inFlightHoldWaits,0,'no leaf production is in flight');
  assert.equal(reads.count('/tile-1.json'),0,'the leaf read has not started');
  leafBlocker.release();await until(ready(f.manager));
  assert.equal(f.manager.stats.resources.admission.committedHoldWaits,1);assert.equal(f.manager.stats.resources.admission.waits,2);
 }finally{f.manager.destroy();blocker?.release();leafBlocker?.release();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('tile selection containers are charged with the metadata that bounds them: a partitioned refresh admits no selection claim, and a full-ledger warm view re-enables after a visibility pause without any release',async()=>{
 const {budget,store}=ledger(64*MiB),boundarySHA=nextSha();
 const src=environmentSource({boundarySHA,pages:[[1,[10,50,10.02,50.02],[[1,[10.005,50.005,10.008,50.008]],[2,[10.009,50.009,10.012,50.012]]]],[2,[11,51,11.1,51.1],[[3,[11.01,51.01,11.02,51.02]]]]]});
 const reads=createAdmittedReads(m,{budget,store,files:src.files}),view=environmentMap(),handlers=withHandlers(view);
 const manager=m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:reads.read,ensureRead:reads.ensureRead});
 let blocker;
 try{
  manager.setMode(true);await until(ready(manager));
  const r=manager.stats.resources,page=src.files.get('/safety/environment/berlin/page-1.json');
  assert.equal(r.admission.waits,0,'no selection admission and no wait');
  assert.equal(r.manifestClaimBytes,m.environmentRetainedEstimate(src.manifest)+sortedSlots(2)+pushedSlots(2)+r.boundaryIndexBytes,'the manifest claim carries the partition selection slots');
  assert.equal(r.selectionClaimBytes,pushedSlots(32),'a partitioned manifest keeps only the chosen-leaf slots on the selection claim');
  assert.equal(r.metadataClaimBytes,Math.ceil(m.environmentRetainedEstimate(page.tiles))+pushedSlots(2)+sortedSlots(2),'the visible page carries its share of the tile selection');
  assert.equal(view.publications.at(-1).length,2);
  // An unchanged warm view: no wave, no wait.
  const events=budget.stats.availabilityEvents;handlers.get('moveend')();await until(ready(manager));await settle();
  assert.equal(budget.stats.availabilityEvents,events,'a warm-view refresh runs no availability wave');
  // A full ledger, then a visibility pause: the warm view comes back at once.
  const renderer=view.renderers[0],enabled=[];renderer.setEnabled=v=>enabled.push(v);
  store.evictRecent();blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes,precision:'exact'});
  const full={events:budget.stats.availabilityEvents,listeners:budget.stats.availabilityListeners};
  manager.setVisible(false);manager.setVisible(true);await until(ready(manager));await settle();
  assert.deepEqual(enabled,[false,true],'re-enabled without any release');
  assert.deepEqual([budget.stats.availabilityEvents,budget.stats.availabilityListeners],[full.events,full.listeners],'nothing waited and nothing was given back');
  assert.equal(manager.stats.resources.admission.waits,0);assert.equal(manager.stats.resources.admission.pending,undefined);
  blocker.release();blocker=undefined;
  manager.setMode(false);assert.equal(budget.stats.bytes,0,'explicit 2D returns the manifest, selection and page claims');
 }finally{manager.destroy();blocker?.release();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('an unpartitioned manifest: its tile selection slots are admitted inside the bootstrap and split off without a byte change, so the manifest claim is unchanged',async()=>{
 const {budget,store}=ledger(64*MiB),src=environmentSource({boundarySHA:nextSha(),tiles:[[1,[10.005,50.005,10.008,50.008]],[2,[10.009,50.009,10.012,50.012]],[3,[11.01,51.01,11.02,51.02]]]});
 const reads=createAdmittedReads(m,{budget,store,files:src.files}),f=install(store,reads);
 try{
  f.manager.setMode(true);await until(ready(f.manager));
  const r=f.manager.stats.resources;
  assert.equal(r.manifestClaimBytes,m.environmentRetainedEstimate(src.manifest)+r.boundaryIndexBytes);
  assert.equal(r.selectionClaimBytes,sortedSlots(3)+pushedSlots(32),'filtered and sorted tiles plus the chosen leaves');
  assert.equal(r.bootstrapRestarts,0);assert.equal(r.admission.waits,0);
  const events=budget.stats.availabilityEvents;f.manager.setVisible(false);f.manager.setVisible(true);await until(ready(f.manager));await settle();
  assert.equal(budget.stats.availabilityEvents,events,'the warm refresh admits and returns nothing');
  f.manager.setMode(false);assert.equal(f.manager.stats.resources.selectionClaimBytes,0,'explicit 2D returns the selection claim');
 }finally{f.manager.destroy();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('a wait registered beside a leaf production still in flight is counted apart as an in-flight hold wait, never as a committed-hold wait',async()=>{
 const {budget,store}=ledger(64*MiB),src=environmentSource({boundarySHA:nextSha(),tiles:[[1,[10.005,50.005,10.008,50.008]],[2,[10.009,50.009,10.012,50.012]]]}),leaf=src.manifest.tiles[0];let blocker;
 assert.equal(src.manifest.tiles[1].bytes,leaf.bytes,'fixture: two leaves of one size');
 const reads=createAdmittedReads(m,{budget,store,files:src.files});
 const leafNeed=2*leaf.bytes+m.environmentClaimBytes(m.environmentJsonReadCosts({bytes:leaf.bytes},'leaf'))+80;
 // At renderer creation another owner leaves room for one leaf claim, not two.
 const f=install(store,reads,{view:{onRenderer:()=>{store.evictRecent();blocker=budget.reserve({category:'texture',bytes:budget.stats.availableBytes-(2*leafNeed-1),precision:'exact'});}}});
 try{
  f.manager.setMode(true);await until(()=>f.manager.stats.resources.admission.inFlightHoldWaits>0,'the second leaf wait');
  const a=f.manager.stats.resources.admission;
  assert.deepEqual({...a.lastInFlightHold},{phase:'environment leaf read',heldProductions:1},'the second worker waits beside the first leaf production');
  assert.equal(a.committedHoldWaits,1,'the committed manifest is counted as before');
  blocker.release();blocker=undefined;await until(ready(f.manager));
  assert.equal(f.publications.at(-1).length,2);
 }finally{f.manager.destroy();blocker?.release();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('the product ledger shape: the page store is the solar module ledger and every read is caller-admitted; the hand-over neither restarts nor waits, and destroy returns all but the module cache',async()=>{
 const page=m.getPageResourceBudget(),pageStore=m.getPageChunkResourceStore();pageStore.evictRecent();
 const cached=()=>m.solarShadowBoundaryCacheStats().claimedBytes,beforeOwn=page.stats.bytes-cached(),baseListeners=page.stats.availabilityListeners;
 const src=environmentSource({boundarySHA:nextSha(),geometry:sawtooth(300)}),reads=createAdmittedReads(m,{budget:page,store:pageStore,files:src.files});
 const view=environmentMap(),manager=m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,resourceStore:pageStore,read:reads.read,ensureRead:reads.ensureRead,waterAdmission:profileFor(src.boundarySHA)});
 try{
  manager.setMode(true);await until(ready(manager));
  const r=manager.stats.resources;
  assert.equal(r.bootstrapRestarts,0);assert.equal(r.admission.waits,0);assert.equal(r.readAdmission,'caller-admitted');
  assert.ok(m.currentSolarShadowBoundary(src.boundarySHA),'the index is in the module cache');
  assert.equal(r.boundaryIndexBytes,m.solarShadowBoundaryIndexBytes({boundarySHA256:src.boundarySHA,geometry:src.boundary.geometry})+m.SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes);
  assert.deepEqual([reads.transport.stats.admittedReads,reads.transport.stats.admittedDeliveries,reads.transport.stats.admittedRefusals],[3,3,0]);
  assert.equal(page.stats.availabilityListeners,baseListeners,'nothing waits');
 }finally{manager.destroy();pageStore.evictRecent();}
 assert.equal(page.stats.bytes-cached(),beforeOwn,'destroy returns every byte but the module-level solar cache');
 assert.equal(page.stats.availabilityListeners,baseListeners);
});

test('a renderer GPU decision that is unfit at onAdd is an explicit, counted failure: no wait, no hang',async()=>{
 const {budget,store}=ledger(),src=environmentSource({boundarySHA:nextSha()}),reads=createAdmittedReads(m,{budget,store,files:src.files});
 // The fixture renderer's onAdd refuses as the mobile renderer does when the
 // ledger fits its fixed CPU storage but not its one GPU decision.
 const unfit=new m.EnvironmentResourceUnfitError('environment GPU programs and buffers',164096,100000,false);
 const view=environmentMap(),addLayer=view.map.addLayer;let added=0;
 view.map.addLayer=layer=>{added++;addLayer(layer);throw unfit;};
 const manager=m.installEnvironmentScene({map:view.map,city:'berlin',beforeLayer:()=>undefined,resourceStore:store,read:reads.read,ensureRead:reads.ensureRead});
 try{
  manager.setMode(true);await until(()=>manager.stats.state==='error','the explicit failure');
  const a=manager.stats.resources.admission;
  assert.equal(added,1);assert.equal(a.unfitAdmissions,1,'counted as unfit');assert.equal(a.lastUnfit,unfit.message);
  assert.equal(a.waits,0);assert.equal(budget.stats.availabilityListeners,0,'nothing waits');
  assert.equal(view.map.getLayer(view.renderers[0].layer.id),undefined,'the failed layer is removed');
 }finally{manager.destroy();store.evictRecent();}
 assert.equal(budget.stats.bytes,0);store.destroy();
});

test('the scenery counts a wait beside its kept vehicle storage as a committed-hold wait',async t=>{
 const kept={fixedCPUBytes:1000,programAllowanceBytes:200,roadBytes:30,gpuBytes:4};
 const host=sceneryHost(t,{resources:kept}),roads=vehicleScenery([road(1,[[13,52],[13.002,52.002]])]),index={schema_version:1,city:'berlin',role:'decorative-schematic',partial:true,snapshot:'test',source_pbf_sha256:'a'.repeat(64),data:{path:'/safety/buildings3d/roads.json',bytes:encode(roads).byteLength,sha256:'b'.repeat(64)}};
 const l=ledger(),files=new Map([['/safety/buildings3d/scenery-index.json',index],['/safety/buildings3d/roads.json',roads]]),reads=createAdmittedReads(m,{budget:l.budget,store:l.store,files});
 const scenery=m.installThreeDimensionalScenery({map:host.map,city:'berlin',locale:'en',host:host.host,buildingLayer:()=>undefined,resourceStore:l.store,read:reads.read,ensureRead:reads.ensureRead});
 let blocker=l.budget.reserve({category:'texture',bytes:l.budget.stats.availableBytes,precision:'exact'});
 try{
  scenery.setMode(true);await until(()=>scenery.stats.resources.admission.pending!==undefined,'the index wait');
  const a=scenery.stats.resources.admission;
  assert.equal(a.pending.phase,'vehicle scenery index');assert.equal(host.created.length,1,'the vehicle renderer exists');
  assert.equal(a.committedHoldWaits,1);assert.deepEqual({...a.lastCommittedHold},{phase:'vehicle scenery index',heldBytes:1234},'fixed CPU, program allowance, roads and GPU storage');
  blocker.release();blocker=undefined;await until(()=>scenery.stats.state==='ready','scenery');
 }finally{blocker?.release();scenery.destroy();l.store.evictRecent();}
 assert.equal(l.budget.stats.bytes,0);l.store.destroy();
});
