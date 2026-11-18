import test from 'node:test';
import assert from 'node:assert/strict';
import {MiB,KiB,BITMAP,workingSet,fakeGL,settle,until,category,drained,page,largerBuffer,metadata} from './support/texture-stage2-harness.mjs';

// Stage-2 adoption of the caller-admitted byte transport by the source-material
// runtime: the bitmap entry's estimate lists a minted read envelope beside the
// decode envelope, and its production context is the transport's claim
// ({admitted, envelope, keep:[decode]}). The read is admitted with the decode
// envelope at once, the transport never reserves or waits, and a refused
// delivery is retried holding nothing with the delivered buffer's envelope.
const A=4096,small=workingSet(A,256),program={};

test('R1: one byte short of the read envelope beside the decode envelope, the load waits holding nothing and reads once when that byte is released',async()=>{
 // texture-hold-wait-probe as a test: the decode estimate alone would fit.
 const limit=2*MiB,p=page({limitBytes:limit,recentLimitBytes:KiB}),asset=p.assetFor();
 const blockerBytes=limit-(small.decode+small.envelope-1),blocker=p.budget.reserve([{category:'read',bytes:blockerBytes,precision:'exact',label:'other-owner'}],{label:'other-owner'});
 const r=p.runtime({asset});
 r.setEnabled(true);await settle(20);
 assert.deepEqual({held:p.budget.stats.bytes-blockerBytes,available:p.budget.stats.availableBytes,listeners:p.budget.stats.availabilityListeners,network:p.network.length,consumers:p.transport.stats.consumers,admitted:p.transport.stats.admittedReads,loading:r.stats.loading,error:r.stats.error,workingSet:r.stats.loadWorkingSetBytes},
  {held:0,available:small.load-1,listeners:1,network:0,consumers:0,admitted:0,loading:false,error:'texture-budget-pending',workingSet:small.load},'nothing is held while the whole working set waits');
 blocker.adjust([{category:'read',bytes:blockerBytes-1,precision:'exact',label:'other-owner'}]);
 assert.equal(await until(()=>r.stats.loads===1),true,'the released byte completes the working set');
 assert.deepEqual({network:p.network.length,ledgerAtRead:p.network[0].ledgerBytes,admitted:p.transport.stats.admittedReads,delivered:p.transport.stats.admittedDeliveries,refused:p.transport.stats.admittedRefusals,error:r.stats.error,retries:r.stats.capacityRetries,refusedRetries:r.stats.refusedCapacityRetries,listeners:p.budget.stats.availabilityListeners},
  {network:1,ledgerAtRead:blockerBytes-1+small.load,admitted:1,delivered:1,refused:0,error:undefined,retries:1,refusedRetries:0,listeners:0},'one read, with the envelope charged once while both entries list it');
 r.destroy();blocker.release();assert.equal(drained(p),0);
});

// The three facade materials at their real sizes.
const materials=[{name:'window',bytes:13651,sourceSize:1024},{name:'plaster',bytes:95359,sourceSize:256},{name:'brick',bytes:117467,sourceSize:256}];
for(const [seed,material] of materials.entries())test(`${material.name}: the bitmap entry is the transport's claim: one envelope during the read, the delivered buffer in its place, nothing waits`,{timeout:10_000},async()=>{
 const p=page({deferred:true}),asset=p.assetFor({seed,bytes:material.bytes,sourceSize:material.sourceSize}),ws=workingSet(material.bytes,material.sourceSize);
 const decodeStarted=Promise.withResolvers(),finishDecode=Promise.withResolvers();
 let decodeCalls=0;
 const r=p.runtime({asset,sourceSize:material.sourceSize,async decodeBitmap(_blob,options){
  decodeCalls++;
  decodeStarted.resolve();
  await finishDecode.promise;
  return {width:options.resizeWidth,height:options.resizeHeight,close(){}};
 }});
 r.setEnabled(true);
 assert.deepEqual({bytes:p.budget.stats.bytes,read:category(p.budget,'read'),construction:category(p.budget,'construction'),admitted:p.transport.stats.admittedReads,productions:p.transport.stats.admittedProductions,consumers:p.transport.stats.consumers,listeners:p.budget.stats.availabilityListeners},
  {bytes:ws.load,read:{bytes:ws.envelope,exactBytes:0,estimatedBytes:ws.envelope},construction:{bytes:ws.decode,exactBytes:0,estimatedBytes:ws.decode},admitted:1,productions:1,consumers:1,listeners:0},'admitted at once in one claim; the transport reserved nothing more and registered no wait');
 assert.equal(await until(()=>p.network.length===1),true);
 assert.deepEqual({ledgerAtRead:p.network[0].ledgerBytes,max:p.network[0].max},{ledgerAtRead:ws.load,max:material.bytes});
 // The transport is still blocked, so load() joins the one operation in flight.
 const loading=r.load();
 p.network[0].resolve();
 await decodeStarted.promise;
 assert.equal(decodeCalls,1,'hash and header checks pass on the delivered bytes');
 assert.deepEqual({bytes:p.budget.stats.bytes,read:category(p.budget,'read'),construction:category(p.budget,'construction').bytes,delivered:p.transport.stats.admittedDeliveries},
  {bytes:ws.decode+material.bytes,read:{bytes:material.bytes,exactBytes:material.bytes,estimatedBytes:0},construction:ws.decode,delivered:1},'delivery replaced the envelope by the exact buffer in place');
 finishDecode.resolve();
 assert.equal(await loading,true);
 assert.equal(r.stats.loads,1);
 assert.deepEqual({reads:r.stats.reads,decodes:r.stats.decodes,storeHits:r.stats.storeHits,unadmitted:r.stats.unadmittedTransportReads,construction:category(p.budget,'construction').bytes,texture:category(p.budget,'texture'),error:r.stats.error},
  {reads:1,decodes:1,storeHits:0,unadmitted:0,construction:0,texture:{bytes:BITMAP,exactBytes:0,estimatedBytes:BITMAP},error:undefined});
 r.destroy();assert.equal(drained(p),0);
});

test('a wrapper that drops the fourth argument is counted: the transport then charged a second read envelope beside the claim',async()=>{
 const p=page({deferred:true}),asset=p.assetFor();
 const r=p.runtime({asset,acquireBytes:(path,signal,max)=>p.transport.acquireBytes(path,signal,max)});
 r.setEnabled(true);assert.equal(await until(()=>p.network.length===1),true);
 assert.deepEqual({ledgerAtRead:p.network[0].ledgerBytes,admitted:p.transport.stats.admittedReads},{ledgerAtRead:small.load+small.envelope,admitted:0},'the legacy path admits its own envelope');
 p.network[0].resolve();assert.equal(await until(()=>r.stats.loads===1),true);
 assert.deepEqual({unadmitted:r.stats.unadmittedTransportReads,error:r.stats.error},{unadmitted:1,error:undefined});
 r.destroy();assert.equal(drained(p),0);
});

test('a wrapper that remaps the asset path and forwards the fourth argument (the painted-map shape) keeps the admitted read',async()=>{
 const p=page({deferred:true}),asset=p.assetFor(),mapped='/assets/3d-materials/stage2-mapped-0123abcd.png';
 p.files.set(mapped,p.files.get(asset.path));p.files.delete(asset.path);
 const assets={[asset.path]:mapped};
 const r=p.runtime({asset,acquireBytes:(path,signal,max,admission)=>p.transport.acquireBytes(assets[path]??path,signal,max,admission)});
 r.setEnabled(true);assert.equal(await until(()=>p.network.length===1),true);
 assert.deepEqual({path:p.network[0].path,ledgerAtRead:p.network[0].ledgerBytes,admitted:p.transport.stats.admittedReads},{path:mapped,ledgerAtRead:small.load,admitted:1},'the mapped URL is read under the one admitted envelope');
 p.network[0].resolve();assert.equal(await until(()=>r.stats.loads===1),true);
 assert.deepEqual({unadmitted:r.stats.unadmittedTransportReads,delivered:p.transport.stats.admittedDeliveries,error:r.stats.error},{unadmitted:0,delivered:1,error:undefined});
 r.destroy();assert.equal(drained(p),0);
});

test('a refused delivery is recorded before the store bounds its error: the load waits holding nothing for the retry claim, mints the delivered buffer envelope and reads once more',async()=>{
 // The reader delivers the asset as a view over a 3x larger buffer, which the
 // full ledger cannot add beside the decode envelope.
 const limit=4*MiB,p=page({limitBytes:limit,serve:largerBuffer(3)}),asset=p.assetFor();
 const hold=p.budget.reserve(metadata(limit-small.load)),retry=small.decode+3*A;
 const r=p.runtime({asset});
 r.setEnabled(true);
 assert.equal(await until(()=>r.stats.error==='texture-budget-pending'),true);
 assert.deepEqual({held:p.budget.stats.bytes-hold.bytes,listeners:p.budget.stats.availabilityListeners,workingSet:r.stats.loadWorkingSetBytes,refused:p.transport.stats.admittedRefusals,delivered:p.transport.stats.admittedDeliveries,network:p.network.length,loading:r.stats.loading,resources:p.store.stats.resources},
  {held:0,listeners:1,workingSet:retry,refused:1,delivered:0,network:1,loading:false,resources:0},'the retry recipe survived the store; nothing is held while it waits');
 // The released bytes make exactly the retry claim fit.
 hold.adjust(metadata(limit-retry));
 assert.equal(await until(()=>r.stats.loads===1),true);
 assert.deepEqual({network:p.network.length,ledgerAtRead:p.network[1].ledgerBytes,delivered:p.transport.stats.admittedDeliveries,refused:p.transport.stats.admittedRefusals,error:r.stats.error,retries:r.stats.capacityRetries,refusedRetries:r.stats.refusedCapacityRetries,listeners:p.budget.stats.availabilityListeners},
  {network:2,ledgerAtRead:limit,delivered:1,refused:1,error:undefined,retries:1,refusedRetries:0,listeners:0},'the retry claim lists the delivered buffer envelope; its delivery needs no growth');
 r.destroy();hold.release();assert.equal(drained(p),0);
});

test('a refused delivery whose retry claim cannot fit the ledger is reported as not fitting, without a wait or another read',async()=>{
 const limit=MiB,factor=Math.floor((limit-small.decode)/A)+1,p=page({limitBytes:limit,recentLimitBytes:64*KiB,serve:largerBuffer(factor)}),asset=p.assetFor();
 assert(small.decode+factor*A>limit,'the delivered backing buffer remains unfit at the fixed upload size');
 const hold=p.budget.reserve(metadata(limit-small.load));
 const r=p.runtime({asset});
 r.setEnabled(true);
 assert.equal(await until(()=>/does not fit the page resource ledger/.test(r.stats.error??'')),true,String(r.stats.error));
 assert.deepEqual({held:p.budget.stats.bytes-hold.bytes,listeners:p.budget.stats.availabilityListeners,workingSet:r.stats.loadWorkingSetBytes,network:p.network.length},{held:0,listeners:0,workingSet:small.decode+factor*A,network:1});
 hold.release();const probe=p.budget.reserve(metadata(KiB));probe.release();await settle(8);
 assert.deepEqual({network:p.network.length,loads:r.stats.loads,listeners:p.budget.stats.availabilityListeners},{network:1,loads:0,listeners:0},'later availability does not read it again');
 r.destroy();assert.equal(drained(p),0);
});

test('a second refusal with the minted retry envelope is reported instead of retried again',async()=>{
 // The second read delivers an even larger buffer than the first.
 const limit=4*MiB,p=page({limitBytes:limit,serve:(value,_call,n)=>largerBuffer(n===1?3:5)(value)}),asset=p.assetFor();
 const hold=p.budget.reserve(metadata(limit-small.load)),retry=small.decode+3*A;
 const r=p.runtime({asset});
 r.setEnabled(true);assert.equal(await until(()=>r.stats.error==='texture-budget-pending'),true);
 hold.adjust(metadata(limit-retry));
 assert.equal(await until(()=>/beyond its admitted retry envelope/.test(r.stats.error??'')),true,String(r.stats.error));
 assert.match(r.stats.error,new RegExp('beyond its admitted retry envelope of '+3*A+' bytes'));
 assert.deepEqual({network:p.network.length,refused:p.transport.stats.admittedRefusals,listeners:p.budget.stats.availabilityListeners,held:p.budget.stats.bytes-hold.bytes},{network:2,refused:2,listeners:0,held:0});
 hold.release();const probe=p.budget.reserve(metadata(KiB));probe.release();await settle(8);
 assert.deepEqual({network:p.network.length,loads:r.stats.loads},{network:2,loads:0},'no third read');
 r.destroy();assert.equal(drained(p),0);
});

test('a release between a refused delivery and the wait subscription still wakes the load',async()=>{
 const limit=4*MiB,p=page({limitBytes:limit,serve:largerBuffer(3)}),asset=p.assetFor();
 let hold=p.budget.reserve(metadata(limit-small.load-A)),spare=p.budget.reserve(metadata(A,'spare'));
 // The failed bitmap entry returns its claim before the runtime subscribes; an
 // unrelated owner frees its claim inside that wave, which no subscriber hears.
 let fired=0;const off=p.budget.onAvailable(()=>{if(!spare)return;fired++;const claim=spare;spare=undefined;off();claim.release();});
 const r=p.runtime({asset});
 r.setEnabled(true);
 assert.equal(await until(()=>r.stats.loads===1),true,'subscribing rechecks capacity instead of sleeping on a missed hint');
 assert.deepEqual({fired,network:p.network.length,refused:p.transport.stats.admittedRefusals,delivered:p.transport.stats.admittedDeliveries,listeners:p.budget.stats.availabilityListeners,error:r.stats.error},{fired:1,network:2,refused:1,delivered:1,listeners:0,error:undefined});
 r.destroy();hold.release();hold=undefined;assert.equal(drained(p),0);
});

test('an abandoned read leaves the runtime holding nothing; the transport keeps it charged until it settles, and the next load mints a new envelope',async()=>{
 const p=page({deferred:true}),asset=p.assetFor(),r=p.runtime({asset});
 r.setEnabled(true);assert.equal(await until(()=>p.network.length===1),true);
 r.setEnabled(false);await settle(8);
 assert.deepEqual({bytes:p.budget.stats.bytes,abandoned:p.transport.stats.admittedAbandoned,consumers:p.transport.stats.consumers,resources:p.store.stats.resources,listeners:p.budget.stats.availabilityListeners,loading:r.stats.loading,aborted:p.network[0].signal.aborted},
  {bytes:small.envelope,abandoned:1,consumers:0,resources:1,listeners:0,loading:false,aborted:true},'only the in-flight read stays charged, by its own entry');
 p.network[0].resolve();await settle(8);
 assert.deepEqual({bytes:p.budget.stats.bytes,resources:p.store.stats.resources},{bytes:0,resources:0});
 r.setEnabled(true);assert.equal(await until(()=>p.network.length===2),true);
 p.network[1].resolve();assert.equal(await until(()=>r.stats.loads===1),true);
 assert.deepEqual({error:r.stats.error,reads:r.stats.reads,admitted:p.transport.stats.admittedReads,delivered:p.transport.stats.admittedDeliveries},{error:undefined,reads:2,admitted:2,delivered:1});
 r.destroy();assert.equal(drained(p),0);
});

for(const transported of [true,false])test(`an upload that can never fit beside its pixels is reported as not fitting, with bounded attempts and no wait (${transported?'byte transport':'direct reader'})`,async()=>{
 // A synthetic 128x128 source keeps the same byte-boundary scenario at the fixed upload size.
 // Its load working set fits the ledger,
 // the resized pixels beside their mip chain cannot.
 const sourceSize=128,load=workingSet(A,sourceSize),limit=148*KiB,p=page({limitBytes:limit}),asset=p.assetFor({sourceSize}),g=fakeGL();
 assert(load.load<=limit&&limit<BITMAP+(BITMAP*4-4)/3,'the case lies between the two working sets');
 const r=p.runtime({asset,transported,sourceSize});
 r.attach(g);r.setEnabled(true);
 assert.equal(await until(()=>r.stats.loads===1),true);
 assert.match(r.stats.error,/does not fit the page resource ledger/);
 const reads=p.network.length+p.counts.direct;
 assert.deepEqual({attempts:r.stats.uploadAttempts,listeners:p.budget.stats.availabilityListeners,ready:r.stats.ready,uploads:g.uploads.length,reads},{attempts:3,listeners:0,ready:false,uploads:1,reads:1},'only the placeholder was uploaded');
 // Availability, draws and load calls start no read or upload.
 const probe=p.budget.reserve(metadata(4*KiB));probe.release();p.store.evictRecent();await settle(8);
 for(let i=0;i<3;i++)assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'drawn');
 assert.equal(await r.load(),true);await settle(8);
 assert.deepEqual({reads:p.network.length+p.counts.direct,uploads:g.uploads.length,listeners:p.budget.stats.availabilityListeners,attempts:r.stats.uploadAttempts},{reads:1,uploads:1,listeners:0,attempts:3});
 assert.match(r.stats.error,/does not fit the page resource ledger/);
 r.destroy();assert.equal(drained(p),0);
});

test('a committed placeholder upload keeps the wait of a load that still needs capacity',{timeout:10_000},async()=>{
 const limit=MiB,p=page({limitBytes:limit}),asset=p.assetFor(),g=fakeGL();
 const hold=p.budget.reserve(metadata(limit));
 const readyRepaint=Promise.withResolvers();
 const r=p.runtime({asset,requestRepaint(){
  if(r.stats.ready)readyRepaint.resolve();
 }});
 r.attach(g);assert.equal(r.stats.error,'texture-budget-pending','the placeholder waits');
 r.setEnabled(true);await settle(4);
 // 16 bytes cover the placeholder, not the load: the wake retries only the
 // placeholder, whose upload commits; the load is not retried (a refused retry
 // would empty the page recent cache through the pressure path) and keeps waiting.
 hold.adjust(metadata(limit-16));await settle(8);
 assert.deepEqual({listeners:p.budget.stats.availabilityListeners,textures:r.stats.textureObjects,retries:r.stats.capacityRetries,refusedRetries:r.stats.refusedCapacityRetries,network:p.network.length,error:r.stats.error},{listeners:1,textures:1,retries:1,refusedRetries:0,network:0,error:'texture-budget-pending'});
 // The repaint that wake requested draws with the committed placeholder.
 assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'drawn');
 assert.deepEqual({textures:r.stats.textureObjects,ready:r.stats.ready,listeners:p.budget.stats.availabilityListeners,error:r.stats.error},{textures:1,ready:false,listeners:1,error:'texture-budget-pending'},'the load keeps its subscription and stays reported as pending');
 hold.release();
 // Observe the automatic upload, including its asynchronous SHA-256 check.
 await readyRepaint.promise;
 assert.equal(r.stats.ready,true,'released capacity still reaches the waiting load');
 assert.deepEqual({network:p.network.length,loads:r.stats.loads,listeners:p.budget.stats.availabilityListeners,error:r.stats.error},{network:1,loads:1,listeners:0,error:undefined});
 r.destroy();assert.equal(drained(p),0);
});

test('stats separate byte reads, decodes and store hits from loads, which count store hits too',async()=>{
 const p=page(),asset=p.assetFor(),first=p.runtime({asset});
 first.setEnabled(true);assert.equal(await first.load(),true);
 const view=r=>({loads:r.stats.loads,reads:r.stats.reads,decodes:r.stats.decodes,storeHits:r.stats.storeHits});
 assert.deepEqual(view(first),{loads:1,reads:1,decodes:1,storeHits:0});
 // Hiding hands the pixels to the page store; showing adopts them again.
 first.setPageHidden(true);first.setPageHidden(false);
 assert.equal(await until(()=>first.stats.loads===2),true);
 assert.deepEqual(view(first),{loads:2,reads:1,decodes:1,storeHits:1});
 const second=p.runtime({asset});second.setEnabled(true);
 assert.equal(await until(()=>second.stats.loads===1),true);
 assert.deepEqual(view(second),{loads:1,reads:0,decodes:0,storeHits:1},'the second consumer adopts the shared bitmap');
 assert.deepEqual({network:p.network.length,bitmaps:p.bitmaps.length},{network:1,bitmaps:1});
 first.destroy();second.destroy();assert.equal(drained(p),0);
});

test('capacity retries are counted, including one refused because retiring bytes were not reclaimable',async()=>{
 // A retired entry whose production has not settled stays charged and is not
 // reclaimable by pressure: the wake bound counts it optimistically.
 const limit=2*MiB,p=page({limitBytes:limit}),asset=p.assetFor(),R=64*KiB,gap=32*KiB;
 let settleRetiring;const inflight=p.store.acquire({contentKey:'stage2-retiring-in-flight',role:'source',estimate:{category:'metadata',bytes:R,precision:'estimate',label:'in-flight production'},produce:()=>new Promise(resolve=>{settleRetiring=resolve;})});
 inflight.release();assert.equal(p.budget.stats.retiringBytes,R);
 const available=small.load-gap-1,hold=p.budget.reserve(metadata(limit-R-available-1)),tiny=p.budget.reserve(metadata(1,'tiny'));
 const r=p.runtime({asset});
 r.setEnabled(true);await settle(4);
 assert.deepEqual({retries:r.stats.capacityRetries,refused:r.stats.refusedCapacityRetries,listeners:p.budget.stats.availabilityListeners},{retries:0,refused:0,listeners:1});
 // A one-byte release: available plus retiring bytes now cover the load, but the retiring part cannot be reclaimed.
 tiny.release();await settle(8);
 assert.deepEqual({retries:r.stats.capacityRetries,refused:r.stats.refusedCapacityRetries,listeners:p.budget.stats.availabilityListeners,network:p.network.length,held:p.budget.stats.bytes-hold.bytes-R,error:r.stats.error},
  {retries:1,refused:1,listeners:1,network:0,held:0,error:'texture-budget-pending'},'the refused retry waits again, holding nothing');
 settleRetiring({});
 assert.equal(await until(()=>r.stats.loads===1),true,'the settled retirement releases its bytes and wakes the load');
 assert.deepEqual({retries:r.stats.capacityRetries,refused:r.stats.refusedCapacityRetries,network:p.network.length,listeners:p.budget.stats.availabilityListeners},{retries:2,refused:1,network:1,listeners:0});
 r.destroy();hold.release();assert.equal(drained(p),0);
});
