import test from 'node:test';
import assert from 'node:assert/strict';
import {MiB,BITMAP,MIP,workingSet,fakeGL,settle,until,drained,page,png,metadata} from './support/texture-stage2-harness.mjs';

// Stage-2 review fixes of the source-material runtime (texture-fix2): every
// wait for real pixels survives a committed placeholder, a terminal failure stays
// reported, a dropped transport argument is counted at the call, and a capacity
// hint retries only work whose own working set could fit.
const A=4096,small=workingSet(A,256),program={};
const view=(r,p)=>({ready:r.stats.ready,loading:r.stats.loading,error:r.stats.error,listeners:p.budget.stats.availabilityListeners,network:p.network.length});

test('F1: a placeholder committed after a refused real upload keeps the wait for the real pixels; released capacity uploads them (attach under a full ledger)',async()=>{
 const sourceSize=128,load=workingSet(A,sourceSize),limit=4*MiB,p=page({limitBytes:limit}),asset=p.assetFor({bytes:A,sourceSize}),g=fakeGL();
 const hold=p.budget.reserve(metadata(limit));
 const r=p.runtime({asset,sourceSize});
 r.attach(g);r.setEnabled(true);await settle(8);
 assert.deepEqual({...view(r,p),textures:r.stats.textureObjects},{ready:false,loading:false,error:'texture-budget-pending',listeners:1,network:0,textures:0},'even the placeholder waits');
 // Room for the load working set (plus 64 B), not for the mip chain beside the pixels.
 hold.adjust(metadata(limit-load.load-64));
 assert.equal(await until(()=>r.stats.loads===1),true);await settle(8);
 assert(p.budget.stats.availableBytes<MIP,'the mip chain cannot be admitted');
 for(let i=0;i<4;i++){assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'drawn');await settle(4);}
 assert.deepEqual({...view(r,p),textures:r.stats.textureObjects},{ready:false,loading:false,error:'texture-budget-pending',listeners:1,network:1,textures:1},'the placeholder draws while the real upload still waits, holding nothing');
 hold.release();
 assert.equal(await until(()=>r.stats.ready),true,'released capacity reaches the waiting real upload');
 assert.deepEqual(view(r,p),{ready:true,loading:false,error:undefined,listeners:0,network:1});
 r.destroy();assert.equal(drained(p),0);
});

test('F1: after a reported context change a refused real upload, its pixels taken by the refusal, and a committed placeholder still recover the real texture',async()=>{
 const p=page({limitBytes:4*MiB}),asset=p.assetFor(),g=fakeGL();
 const r=p.runtime({asset});
 r.attach(g);r.setEnabled(true);assert.equal(await until(()=>r.stats.ready),true);
 p.store.invalidateContext(g,p.store.contextEpoch(g));
 // 64 B left: the placeholder fits, the mip chain does not.
 const hold=p.budget.reserve(metadata(p.budget.stats.availableBytes-64));
 assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'fallback');
 assert.equal(r.stats.retainedBitmapLogicalRGBABytes,0,'the refusal pressure took the cached pixels');
 assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'drawn');
 assert.deepEqual({...view(r,p),textures:r.stats.textureObjects},{ready:false,loading:false,error:'texture-budget-pending',listeners:1,network:1,textures:1},'the committed placeholder did not end the wait for real pixels');
 hold.release();
 assert.equal(await until(()=>r.stats.ready),true);
 assert.deepEqual({...view(r,p),loads:r.stats.loads,storeHits:r.stats.storeHits},{ready:true,loading:false,error:undefined,listeners:0,network:1,loads:2,storeHits:1},'the recent bitmap is adopted, not read again');
 r.destroy();assert.equal(drained(p),0);
});

test('F1 family: real pixels evicted and their texture revoked by another owner, with no refusal at all, are loaded again after the placeholder commits',async()=>{
 const p=page({limitBytes:64*MiB}),asset=p.assetFor(),g=fakeGL();
 const r=p.runtime({asset});
 r.attach(g);r.setEnabled(true);assert.equal(await until(()=>r.stats.ready),true);
 p.store.evictRecent();assert.equal(r.stats.retainedBitmapLogicalRGBABytes,0);
 p.store.invalidateContext(g,p.store.contextEpoch(g));
 assert.equal(r.withTexture(g,program,()=>'drawn',()=>'fallback'),'drawn');
 assert.deepEqual({ready:r.stats.ready,loading:r.stats.loading},{ready:false,loading:true},'the placeholder commit starts recovery');
 assert.equal(await until(()=>r.stats.ready),true);
 assert.deepEqual({...view(r,p),reads:r.stats.reads,decodes:r.stats.decodes},{ready:true,loading:false,error:undefined,listeners:0,network:2,reads:2,decodes:2});
 r.destroy();assert.equal(drained(p),0);
});

test('F2: a terminal load failure stays reported across disable, hide, re-enable and re-attach, and is not read again',async()=>{
 const p=page(),asset=p.assetFor({bytes:A}),g=fakeGL(),g2=fakeGL();
 p.files.set(asset.path,png(A,256,99)); // served bytes no longer match the pinned SHA-256
 const gate=r=>r.stats.ready||!!(r.stats.error&&!r.stats.loading);
 const r=p.runtime({asset});
 r.attach(g);r.setEnabled(true);
 assert.equal(await until(()=>!!r.stats.error&&!r.stats.loading),true);
 const failure=r.stats.error;assert.match(failure,/SHA mismatch/);
 const steps=[()=>r.setEnabled(false),()=>r.setEnabled(true),()=>r.setPageHidden(true),()=>r.setPageHidden(false),()=>r.attach(g2),()=>r.withTexture(g2,program,()=>'drawn',()=>'fallback')];
 for(const step of steps){step();await settle(8);assert.deepEqual({error:r.stats.error,gate:gate(r),loading:r.stats.loading},{error:failure,gate:true,loading:false});}
 assert.deepEqual({network:p.network.length,listeners:p.budget.stats.availabilityListeners},{network:1,listeners:0});
 r.destroy();assert.equal(drained(p),0);
});

test('F3: a read whose wrapper dropped the fourth argument is counted at the call, while it is stuck behind its own envelope, and once only',{timeout:10_000},async()=>{
 const limit=8*MiB,p=page({limitBytes:limit}),asset=p.assetFor({seed:1,bytes:95359}),ws=workingSet(asset.bytes,256);
 // Room for the bitmap working set, one byte short of the legacy path's own envelope beside it.
 const hold=p.budget.reserve(metadata(limit-ws.load-2*asset.bytes+1));
 const r=p.runtime({asset,acquireBytes:(path,signal,max)=>p.transport.acquireBytes(path,signal,max)});
 r.setEnabled(true);await settle(40);
 const stuck=()=>({held:p.budget.stats.bytes-hold.bytes,network:p.network.length,loading:r.stats.loading,unadmitted:r.stats.unadmittedTransportReads,consumers:p.transport.stats.consumers});
 assert.deepEqual(stuck(),{held:ws.load,network:0,loading:true,unadmitted:1,consumers:1},'the hold-and-wait shape is visible while it lasts');
 await settle(200);assert.deepEqual(stuck(),{held:ws.load,network:0,loading:true,unadmitted:1,consumers:1});
 // load() returns the already-blocked operation while loading is true.
 const pendingLoad=r.load();
 hold.release();
 assert.equal(await pendingLoad,true);
 assert.equal(r.stats.loads,1);
 assert.deepEqual({unadmitted:r.stats.unadmittedTransportReads,network:p.network.length,error:r.stats.error},{unadmitted:1,network:1,error:undefined},'counted once, not again at delivery');
 r.destroy();assert.equal(drained(p),0);
});

test('F4 (M07): a load completed by a non-wake call ends the earlier refused load wait, with no context to upload to',async()=>{
 const limit=4*MiB,p=page({limitBytes:limit}),asset=p.assetFor({bytes:117467,seed:7}),ws=workingSet(117467,256);
 const hold=p.budget.reserve(metadata(limit-ws.load+1));
 const r=p.runtime({asset});
 r.setEnabled(true);await settle(8);
 assert.deepEqual({error:r.stats.error,listeners:p.budget.stats.availabilityListeners},{error:'texture-budget-pending',listeners:1});
 // The release queues a wake; a direct load in the same task takes the bytes first.
 hold.adjust(metadata(limit-ws.load-4));
 const loaded=r.load();
 assert.equal(await loaded,true);await settle(20);
 assert.deepEqual({loads:r.stats.loads,listeners:p.budget.stats.availabilityListeners,retries:r.stats.capacityRetries,error:r.stats.error,network:p.network.length},{loads:1,listeners:0,retries:0,error:undefined,network:1},'no stale load wait stays subscribed');
 r.destroy();hold.release();assert.equal(drained(p),0);
});

test('F4 (M07): after a load completed by attach, a later upload to another context reports no pending error',async()=>{
 const limit=4*MiB,p=page({limitBytes:limit}),asset=p.assetFor({bytes:117467,seed:7}),ws=workingSet(117467,256),g=fakeGL(),g2=fakeGL();
 const hold=p.budget.reserve(metadata(limit-ws.load+1));
 const r=p.runtime({asset});
 r.setEnabled(true);await settle(8);
 hold.adjust(metadata(limit-ws.load-4));r.attach(g);
 assert.equal(await until(()=>r.stats.loads===1),true);await settle(20);
 assert.deepEqual({ready:r.stats.ready,listeners:p.budget.stats.availabilityListeners,error:r.stats.error},{ready:true,listeners:0,error:undefined});
 r.attach(g2);await settle(8);
 assert.deepEqual({ready:r.stats.ready,listeners:p.budget.stats.availabilityListeners,error:r.stats.error,network:p.network.length},{ready:true,listeners:0,error:undefined,network:1});
 r.destroy();hold.release();assert.equal(drained(p),0);
});

test('F5: a release that covers only the waiting placeholder retries the placeholder, not the load, and leaves the page recent cache alone',async()=>{
 const limit=MiB,p=page({limitBytes:limit}),asset=p.assetFor(),g=fakeGL();
 const hold=p.budget.reserve(metadata(limit));
 const r=p.runtime({asset});
 r.attach(g);r.setEnabled(true);await settle(4);
 assert.deepEqual({listeners:p.budget.stats.availabilityListeners,textures:r.stats.textureObjects,error:r.stats.error},{listeners:1,textures:0,error:'texture-budget-pending'});
 hold.adjust(metadata(limit-1024-16));
 p.store.acquire({contentKey:'stage2-unrelated-recent',role:'source',allowRecent:true,estimate:{category:'metadata',bytes:1024,precision:'exact'},produce:()=>({})}).release();
 const pressure=p.budget.stats.pressureEvents;assert.equal(p.store.stats.recent,1);
 await settle(8);
 assert.deepEqual({retries:r.stats.capacityRetries,refused:r.stats.refusedCapacityRetries,textures:r.stats.textureObjects,ready:r.stats.ready,listeners:p.budget.stats.availabilityListeners,recent:p.store.stats.recent,pressure:p.budget.stats.pressureEvents,network:p.network.length,error:r.stats.error},
  {retries:1,refused:0,textures:1,ready:false,listeners:1,recent:1,pressure,network:0,error:'texture-budget-pending'},'no doomed load retry and no pressure eviction');
 hold.release();
 assert.equal(await until(()=>r.stats.ready),true,'the load still waits and completes once its working set fits');
 assert.deepEqual({listeners:p.budget.stats.availabilityListeners,network:p.network.length,refused:r.stats.refusedCapacityRetries,error:r.stats.error},{listeners:0,network:1,refused:0,error:undefined});
 r.destroy();assert.equal(drained(p),0);
});

test('F6: a queued wake whose wait a synchronous store hit already ended is neither counted nor retried',async()=>{
 const limit=4*MiB,p=page({limitBytes:limit}),asset=p.assetFor({bytes:117467,seed:3}),ws=workingSet(117467,256),g=fakeGL();
 const hold=p.budget.reserve(metadata(limit-ws.load+1));
 const b=p.runtime({asset});b.setEnabled(true);await settle(8);
 assert.equal(p.budget.stats.availabilityListeners,1);
 hold.adjust(metadata(limit-ws.load));
 const a=p.runtime({asset});a.setEnabled(true);
 assert.equal(await until(()=>a.stats.loads===1),true);await settle(8);
 assert.deepEqual({retries:b.stats.capacityRetries,error:b.stats.error},{retries:0,error:'texture-budget-pending'});
 // One availability wave queues B's wake; B attaches in the same task and adopts A's bitmap.
 const t=p.budget.reserve(metadata(1));t.release();
 b.attach(g);
 assert.deepEqual({loads:b.stats.loads,storeHits:b.stats.storeHits,ready:b.stats.ready},{loads:1,storeHits:1,ready:true});
 await settle(8);
 assert.deepEqual({retries:b.stats.capacityRetries,refused:b.stats.refusedCapacityRetries,listeners:p.budget.stats.availabilityListeners,network:p.network.length},{retries:0,refused:0,listeners:0,network:1});
 a.destroy();b.destroy();hold.release();assert.equal(drained(p),0);
});
