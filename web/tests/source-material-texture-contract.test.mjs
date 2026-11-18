import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import v8 from 'node:v8';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {waitForResourceState} from './support/wait-for-resource-state.mjs';

// Contract checks for the shared source-material runtime beyond the provider
// fixtures (resident-facade-texture covers the loss-during-binding and HEAD
// re-attach steps, facade-controller-retention the controller lifetime):
// - stopped textures are revocable cache leases: an unexpired hit restores
//   synchronously, while expiry/pressure/turnover releases them and a later
//   return reloads safely through the bounded source path;
// - a kept texture of a lost incarnation is never bound or deleted;
// - a second consumer adopts the shared entries in the same call, bytes once;
// - cache-only pixels stay open while a new context admits their texture;
// - a stale store hit after a same-object restore is detected by the runtime
//   alone, and a handle that stays dead is reported with bounded attempts;
// - no claim is held while another waits: a refused upload waits with its
//   pixels evictable, a load admits the byte transport's read envelope with its
//   decode envelope in one claim that the transport takes over (it neither
//   admits nor waits, and no availability wave opens the envelope before
//   delivery), and two runtimes cannot wait on each other's claims;
// - store entries never retain a destroyed runtime's scope or options.
const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export {createSourceMaterialTexture} from './source-material-texture';export {createResourceByteTransport} from './resource-byte-transport';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {createSourceMaterialTexture,createResourceByteTransport,createChunkResourceStore,createResourceBudget}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
// Collection checks also run under a plain `node --test`.
v8.setFlagsFromString('--expose-gc');const gc=globalThis.gc??vm.runInNewContext('gc');

const MiB=1024*1024,UPLOAD=256,BITMAP=UPLOAD*UPLOAD*4,MIP=(BITMAP*4-4)/3,ASSET=4096,program={};
// 256x256 sources: raw read envelope (two copies), PNG copy and Blob, full decode, resized output.
const DECODE=ASSET*2+BITMAP+BITMAP,LOAD=ASSET*2+DECODE;
function png(seed=0){
 const b=new Uint8Array(ASSET);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]);
 const view=new DataView(b.buffer);view.setUint32(16,256);view.setUint32(20,256);b[24]=8;for(let i=33;i<ASSET;i++)b[i]=(i*29+seed*7)&255;return b;
}
function fakeGL(){
 const g={TEXTURE0:0x84c0},names=['TEXTURE_2D','ACTIVE_TEXTURE','TEXTURE_BINDING_2D','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_COLORSPACE_CONVERSION_WEBGL','UNPACK_ALIGNMENT','UNPACK_ROW_LENGTH','UNPACK_IMAGE_HEIGHT','UNPACK_SKIP_PIXELS','UNPACK_SKIP_ROWS','UNPACK_SKIP_IMAGES','NONE','RGBA','UNSIGNED_BYTE','TEXTURE_WRAP_S','TEXTURE_WRAP_T','REPEAT','TEXTURE_MAG_FILTER','TEXTURE_MIN_FILTER','LINEAR','LINEAR_MIPMAP_LINEAR','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','WAIT_FAILED','TIMEOUT_EXPIRED'];
 let id=0x9000,active=g.TEXTURE0,next=1,lost=false;for(const name of names)g[name]=id++;
 const bound=new Map(),pixelStore=new Map(),live=new Set(),created=[],deleted=[],uploads=[],readyUniforms=[];
 Object.assign(g,{created,deleted,uploads,readyUniforms,
  isContextLost:()=>lost,lose(){lost=true;live.clear();},restore(){lost=false;},
  getParameter(p){if(p===g.ACTIVE_TEXTURE)return active;if(p===g.TEXTURE_BINDING_2D)return bound.get(active)??null;return pixelStore.get(p)??0;},
  activeTexture(unit){active=unit;},bindTexture(_target,texture){bound.set(active,texture);},pixelStorei(p,v){pixelStore.set(p,v);},
  createTexture(){if(lost)return null;const texture={texture:next++};live.add(texture);created.push(texture);return texture;},
  deleteTexture(texture){live.delete(texture);deleted.push(texture);},isTexture(texture){return !lost&&live.has(texture);},
  // The source's closed state is recorded when the upload reads it.
  texImage2D(...args){const source=args.at(-1);uploads.push({source,closed:source?.closed===true});},texParameteri(){},generateMipmap(){},
  getUniformLocation(_program,name){return name;},uniform1i(){},uniform1f(_location,value){readyUniforms.push(value);},
  fenceSync(){return{};},flush(){},clientWaitSync(){return g.ALREADY_SIGNALED;},deleteSync(){},
 });
 return g;
}
function page({limitBytes=64*MiB,recentLimitBytes=Math.min(8*MiB,limitBytes),recentMaxEntries,recentMaxIdleMs}={}){
 const budget=createResourceBudget({limitBytes,recentLimitBytes}),store=createChunkResourceStore({budget,recentMaxEntries,recentMaxIdleMs});
 const files=new Map(),counts={reads:0,transportReads:0},bitmaps=[];let transport;
 function assetFor(seed=0){
  const bytes=png(seed),asset={path:'/assets/3d-materials/contract-'+seed+'.png',bytes:ASSET,sha256:createHash('sha256').update(bytes).digest('hex')};
  files.set(asset.path,bytes);return asset;
 }
 const main=assetFor(0);
 const byteTransport=()=>transport??=createResourceByteTransport({namespace:'contract',resourceStore:store,read:async target=>{counts.transportReads++;return new Uint8Array(files.get(target));}});
 // Every runtime of one page shares the store: equal content keys are one entry.
 const runtime=({asset=main,transported=false,...extra}={})=>createSourceMaterialTexture({uploadSize:256,asset,sourceSize:256,textureUnit:4,samplerName:'u_contract_diffuse',readyName:'u_contract_ready',label:'Contract',resourceStore:store,
  acquireBytes:transported?byteTransport().acquireBytes:undefined,
  readBytes:async value=>{counts.reads++;return new Uint8Array(files.get(value.path));},requestRepaint(){},
  decodeBitmap:async(_blob,options)=>{const bitmap={width:options.resizeWidth,height:options.resizeHeight,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);return bitmap;},...extra});
 return{budget,store,runtime,assetFor,bitmaps,counts,get transport(){return byteTransport();}};
}
/** One resident (capture-path) draw: whether it drew and the ready uniforms it set. */
function draw(r,g){const at=g.readyUniforms.length;let drawn=false;r.withResidentTexture(g,program,()=>{drawn=true;},()=>{});return{drawn,ready:g.readyUniforms.slice(at)};}
const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});
const texture=budget=>category(budget,'texture');
function drained(p){p.store.evictRecent();p.store.collectRetired();assert.equal(p.budget.stats.bytes,0,'every charge returns once the last consumer and the recent entries are gone');}
async function settle(turns){for(let i=0;i<turns;i++)await new Promise(resolve=>setImmediate(resolve));}
async function collected(ref){for(let i=0;i<10;i++){await new Promise(resolve=>setImmediate(resolve));gc();}return ref.deref()===undefined;}

test('an explicit re-attach binds the kept texture in the same call: real pixels on its first draw, no read, allocation or upload, each byte charged once',async()=>{
 const p=page(),r=p.runtime(),g=fakeGL();
 r.attach(g);r.setEnabled(true);assert.equal(await r.load(),true);assert.equal(p.counts.reads,1);
 r.detach();
 assert.deepEqual({resident:r.isResident(g),ready:r.stats.ready,runtimePixels:r.stats.cityCacheEntries,kept:r.stats.keptTextureObjects},{resident:false,ready:false,runtimePixels:0,kept:1},'detach keeps the real texture and hands the pixels to the page store');
 assert.equal(p.budget.stats.bytes,BITMAP+MIP+4);
 assert.equal(p.budget.stats.recentBytes,BITMAP+MIP+4,'stopped texture, pixels and placeholder are all evictable');
 const allocated=g.created.length,uploads=g.uploads.length;
 r.attach(g);
 assert.deepEqual({resident:r.isResident(g),ready:r.stats.ready,reads:p.counts.reads,kept:r.stats.keptTextureObjects},{resident:true,ready:true,reads:1,kept:0},'ready synchronously, without a load being awaited');
 assert.deepEqual(draw(r,g),{drawn:true,ready:[1]},'the first draw samples the real pixels');
 assert.deepEqual({allocated:g.created.length,uploads:g.uploads.length},{allocated,uploads},'no allocation or upload');
 assert.deepEqual(texture(p.budget),{bytes:BITMAP+MIP+4,exactBytes:MIP+4,estimatedBytes:BITMAP},'one bitmap estimate beside the exact mip chain and placeholder');
 r.destroy();drained(p);assert.deepEqual(p.bitmaps.map(bitmap=>bitmap.closed),[true]);
});

test('a second consumer of the same asset is ready on attach from the shared entries, without a read, an allocation or a second charge',async()=>{
 const p=page(),first=p.runtime(),second=p.runtime(),g=fakeGL();
 first.attach(g);first.setEnabled(true);assert.equal(await first.load(),true);
 const charged=p.budget.stats.bytes,allocated=g.created.length;
 // The order a renderer uses: enable, then attach the facade resources.
 second.setEnabled(true);second.attach(g);
 assert.deepEqual({resident:second.isResident(g),ready:second.stats.ready},{resident:true,ready:true});
 assert.deepEqual(draw(second,g),{drawn:true,ready:[1]});
 assert.deepEqual({reads:p.counts.reads,allocated:g.created.length,bytes:p.budget.stats.bytes},{reads:1,allocated,bytes:charged},'one read, one texture and one charge for both consumers');
 first.destroy();
 assert.deepEqual(draw(second,g),{drawn:true,ready:[1]},'the remaining consumer keeps its own leases');
 second.destroy();drained(p);assert.deepEqual(p.bitmaps.map(bitmap=>bitmap.closed),[true]);
});

// Each recent-cache eviction a page can apply while the facade is away; the
// pressure variant keeps the ledger full during the return.
const evictions={
 'no eviction':{},
 'idle expiry':{store:{recentMaxIdleMs:1},async evict(p){await new Promise(resolve=>setTimeout(resolve,5));p.store.collectRetired();}},
 'pressure eviction':{evict(p){const s=p.budget.stats;return p.budget.reserve({category:'metadata',bytes:s.availableBytes+s.recentBytes,precision:'exact',label:'unrelated claim that fits only after every recent entry is evicted'});}},
 'LRU turnover':{store:{recentMaxEntries:2},evict(p){for(let i=0;i<3;i++)p.store.acquire({contentKey:'unrelated-'+i,role:'source',allowRecent:true,estimate:{category:'metadata',bytes:1,precision:'exact'},produce:()=>({})}).release();}},
};
// The renderers' syncFacadeResources order; page visibility reaches the runtime first.
const orders={
 'leave and return (setEnabled, detach / setEnabled, attach)':{leave(r){r.setEnabled(false);r.detach();},back(r,g){r.setEnabled(true);r.attach(g);}},
 'page hide and show (setPageHidden, setEnabled, detach / setPageHidden, setEnabled, attach)':{leave(r){r.setPageHidden(true);r.setEnabled(false);r.detach();},back(r,g){r.setPageHidden(false);r.setEnabled(true);r.attach(g);}},
};
for(const [order,steps] of Object.entries(orders))test(`${order}: an unexpired texture returns immediately and an evicted texture reloads safely`,async t=>{
 for(const [name,variant] of Object.entries(evictions))await t.test(name,async()=>{
  const p=page(variant.store),r=p.runtime(),g=fakeGL();let hold;
  try{
   r.setEnabled(true);r.attach(g);assert.equal(await r.load(),true);assert.equal(r.stats.ready,true);
   steps.leave(r);assert.equal(r.isResident(g),false);assert.equal(r.stats.ready,false);
   hold=await variant.evict?.(p);
   if(variant.evict){assert.equal(p.bitmaps[0].closed,true);assert.equal(r.stats.keptTextureObjects,0,'stopped GPU textures are also revocable');}
   const allocated=g.created.length,uploads=g.uploads.length,epoch=p.store.contextEpoch(g);
   steps.back(r,g);
   assert.equal(p.store.contextEpoch(g),epoch,'cache expiry is not context loss');
   if(!variant.evict){
    assert.deepEqual({resident:r.isResident(g),ready:r.stats.ready,reads:p.counts.reads},{resident:true,ready:true,reads:1});
    assert.deepEqual({allocated:g.created.length,uploads:g.uploads.length},{allocated,uploads});
   }else{
    if(hold){assert.equal(r.stats.ready,false,'a full ledger waits without sampling a deleted texture');hold.release();hold=undefined;}
    await waitForResourceState(()=>r.stats.ready,'the actual reload to become ready');
    assert.equal(p.counts.reads,2,'one reload after cache eviction');
   }
   assert.deepEqual(draw(r,g),{drawn:true,ready:[1]});
   assert.deepEqual(g.uploads.filter(row=>row.closed),[],'no upload read closed pixels');
  }finally{r.destroy();hold?.release();drained(p);}
 });
});

test('stopped texture expires at17s while an active shared renderer stays protected',async t=>{
 let now=0;t.mock.method(performance,'now',()=>now);
 const p=page(),r=p.runtime(),peer=p.runtime(),g=fakeGL();
 try{
  r.setEnabled(true);r.attach(g);assert.equal(await r.load(),true);
  r.setEnabled(false);r.detach();now=16999;p.store.collectRetired();assert.equal(r.stats.keptTextureObjects,1);
  now=17000;p.store.collectRetired();assert.equal(r.stats.keptTextureObjects,0);assert.equal(p.budget.stats.bytes,0);
  r.setEnabled(true);r.attach(g);await waitForResourceState(()=>r.stats.ready,'the reattached texture to become ready');assert.equal(p.counts.reads,2);
  peer.setEnabled(true);peer.attach(g);assert.equal(peer.stats.ready,true);
  r.setEnabled(false);r.detach();now+=21000;p.store.collectRetired();
  assert.deepEqual(draw(peer,g),{drawn:true,ready:[1]},'another renderer still owns the shared texture');
  peer.destroy();now+=17000;p.store.collectRetired();assert.equal(p.budget.stats.bytes,0,'the last actual use starts its own bounded idle period');
 }finally{r.destroy();peer.destroy();drained(p);}
});

test('a kept texture of a lost incarnation is never bound or deleted: the return reports that incarnation once and uploads the stored pixels in the same call',async()=>{
 const p=page(),r=p.runtime(),g=fakeGL();
 r.setEnabled(true);r.attach(g);assert.equal(await r.load(),true);
 r.setEnabled(false);r.detach();assert.equal(r.stats.keptTextureObjects,1);
 g.lose();g.restore();
 const deleted=g.deleted.length,allocated=g.created.length;
 r.setEnabled(true);r.attach(g);
 assert.equal(p.store.contextEpoch(g),1,'the runtime reported the incarnation it observed, once');
 assert.equal(g.deleted.length,deleted,'no delete is issued for a handle of the lost incarnation');
 assert.deepEqual({resident:r.isResident(g),ready:r.stats.ready,kept:r.stats.keptTextureObjects,reads:p.counts.reads},{resident:true,ready:true,kept:0,reads:1},'the stored pixels are uploaded in the new incarnation without a read');
 assert.deepEqual(draw(r,g),{drawn:true,ready:[1]});
 assert.equal(g.created.length,allocated+2,'the placeholder and the real texture are allocated again in the new incarnation');
 assert.deepEqual(g.uploads.at(-1),{source:p.bitmaps[0],closed:false});
 r.destroy();drained(p);
});

test('cache-only pixels stay open while a new context admits their texture under pressure',async()=>{
 // The ledger holds the pixels, the first context's mip chain and placeholder,
 // but not a second mip chain beside them: that admission evicts recent entries.
 const limit=BITMAP+MIP+(MIP>>1),p=page({limitBytes:limit,recentLimitBytes:limit}),r=p.runtime(),a=fakeGL(),b=fakeGL();
 r.attach(a);r.setEnabled(true);assert.equal(await r.load(),true);
 assert.equal(r.stats.cityCacheEntries,1,'after the upload the runtime keeps its pixels only in the cache role');
 r.attach(b);
 assert.deepEqual(b.uploads.map(row=>({source:row.source,closed:row.closed})),[{source:p.bitmaps[0],closed:false}],'the new context uploads open pixels');
 assert.deepEqual({resident:r.isResident(b),ready:r.stats.ready,reads:p.counts.reads},{resident:true,ready:true,reads:1});
 assert.deepEqual(draw(r,b),{drawn:true,ready:[1]});
 assert(p.budget.stats.bytes<=limit,'the admission stayed inside the ledger');
 assert.equal(p.bitmaps[0].closed,false);
 r.destroy();drained(p);assert.deepEqual(p.bitmaps.map(bitmap=>bitmap.closed),[true]);
});

test('a same-object restore is detected by the runtime alone: one reallocation in the new incarnation, real pixels on the first draw, co-owners recover there',async()=>{
 const p=page(),r=p.runtime(),peer=p.runtime(),g=fakeGL();
 r.attach(g);r.setEnabled(true);assert.equal(await r.load(),true);
 peer.setEnabled(true);peer.attach(g);assert.equal(peer.stats.ready,true);
 const revision=r.stats.residentRevision;
 g.lose();g.restore();
 assert.equal(r.isResident(g),false);assert.deepEqual(draw(r,g),{drawn:false,ready:[]});
 const deleted=g.deleted.length,allocated=g.created.length;
 r.attach(g);
 assert.deepEqual({resident:r.isResident(g),ready:r.stats.ready,reads:p.counts.reads},{resident:true,ready:true,reads:1},'resident in the new incarnation without a second read');
 assert(r.stats.residentRevision>revision);
 assert.deepEqual(draw(r,g),{drawn:true,ready:[1]},'the first draw samples the retained pixels');
 assert.equal(p.store.contextEpoch(g),1,'the runtime reported the incarnation it observed, once');
 assert.equal(g.created.length,allocated+1,'one allocation in the new incarnation');
 assert.equal(g.deleted.length,deleted,'no delete is issued for a handle of the lost incarnation');
 assert.deepEqual(g.uploads.at(-1),{source:p.bitmaps[0],closed:false});
 assert.equal(p.budget.stats.bytes,BITMAP+MIP,'the lost incarnation returned its charges');
 // The co-owner's lease belonged to the lost incarnation: the capture path stays
 // unavailable, and its drawing path recovers from the new incarnation.
 assert.equal(peer.isResident(g),false);assert.deepEqual(draw(peer,g),{drawn:false,ready:[]});
 let peerReady;assert.equal(peer.withTexture(g,program,()=>{peerReady=g.readyUniforms.at(-1);return 'drawn';},()=>'fallback'),'drawn');
 assert.deepEqual({peerReady,allocated:g.created.length,reads:p.counts.reads},{peerReady:1,allocated:allocated+1,reads:1},'the co-owner reuses the new texture');
 r.destroy();peer.destroy();drained(p);
});

test('a handle that is still not live after one reallocation is reported, and attempts stay bounded',()=>{
 const p=page(),r=p.runtime(),g=fakeGL();g.isTexture=()=>false;
 r.attach(g);
 assert.deepEqual({epoch:p.store.contextEpoch(g),allocated:g.created.length,attempts:r.stats.uploadAttempts,resident:r.isResident(g)},{epoch:1,allocated:2,attempts:1,resident:false},'one invalidation and one reallocation per attempt');
 assert.match(r.stats.error,/unavailable after reallocation/);
 assert.deepEqual(draw(r,g),{drawn:false,ready:[]});
 let draws=0;for(let i=0;i<5;i++)assert.equal(r.withTexture(g,program,()=>{draws++;return 'drawn';},()=>'fallback'),'fallback');
 assert.deepEqual({draws,attempts:r.stats.uploadAttempts,epoch:p.store.contextEpoch(g),allocated:g.created.length},{draws:0,attempts:3,epoch:3,allocated:4},'the per-attach attempt bound stops further work');
 r.destroy();drained(p);
});

test('a refused upload waits with its pixels evictable: pressure reclaims them meanwhile, and released capacity still makes it ready',async()=>{
 const limit=MiB,p=page({limitBytes:limit}),r=p.runtime(),g=fakeGL();
 r.setEnabled(true);assert.equal(await r.load(),true);assert.equal(p.budget.stats.bytes,BITMAP,'pixels, no context yet');
 // An unrelated claim leaves less than the mip chain beside the pixels.
 const hold=p.budget.reserve({category:'metadata',bytes:limit-BITMAP-MIP+4096,precision:'exact',label:'unrelated'});
 r.attach(g);
 assert.deepEqual({ready:r.stats.ready,error:r.stats.error,listeners:p.budget.stats.availabilityListeners},{ready:false,error:'texture-budget-pending',listeners:1});
 assert.equal(p.budget.stats.recentBytes,BITMAP,'the waiting work holds its pixels only as an evictable recent charge');
 p.store.evictRecent();
 assert.equal(p.bitmaps[0].closed,true,'pressure reclaims the pixels while the upload waits');
 assert.equal(p.budget.stats.bytes,hold.bytes,'nothing else stays charged for the waiting texture');
 await settle(4);
 assert.deepEqual({error:r.stats.error,reads:p.counts.reads,listeners:p.budget.stats.availabilityListeners},{error:'texture-budget-pending',reads:1,listeners:1},'the freed pixels alone cannot fit the whole upload working set: the wait goes on, no read starts');
 hold.release();
 await waitForResourceState(()=>r.stats.ready,'the woken load to read again and upload');
 assert.deepEqual({error:r.stats.error,reads:p.counts.reads,listeners:p.budget.stats.availabilityListeners},{error:undefined,reads:2,listeners:0});
 assert.deepEqual(draw(r,g),{drawn:true,ready:[1]});
 assert.deepEqual(g.uploads.filter(row=>row.closed),[],'no upload read closed pixels');
 r.destroy();drained(p);
});

test('a load admits the byte transport read envelope together with its decode envelope: when they do not fit, nothing is charged while it waits',async()=>{
 // The decode envelope alone would fit, but not beside the transport's read envelope.
 const limit=MiB,p=page({limitBytes:limit}),r=p.runtime({transported:true});
 const hold=p.budget.reserve({category:'metadata',bytes:limit-LOAD+1,precision:'exact',label:'unrelated'});
 r.setEnabled(true);await settle(4);
 assert.deepEqual({error:r.stats.error,construction:category(p.budget,'construction').bytes,read:category(p.budget,'read').bytes,transportReads:p.counts.transportReads,consumers:p.transport.stats.consumers,listeners:p.budget.stats.availabilityListeners},
  {error:'texture-budget-pending',construction:0,read:0,transportReads:0,consumers:0,listeners:1},'the texture waits for its whole working set with nothing held');
 hold.release();
 await waitForResourceState(()=>r.stats.loads===1,'released capacity to wake the same load');
 assert.deepEqual({error:r.stats.error,pixels:r.stats.cityCacheEntries,transportReads:p.counts.transportReads,consumers:p.transport.stats.consumers,listeners:p.budget.stats.availabilityListeners},{error:undefined,pixels:1,transportReads:1,consumers:0,listeners:0});
 r.destroy();drained(p);
});

// Replaces the hand-back case: the production no longer returns its read
// envelope to the ledger before calling the transport (stage 2, core-transport
// CDR 5), so a synchronous admission inside a wave can no longer take it.
test('a synchronous admission inside an availability wave cannot take the read envelope: the load keeps its whole working set until the transport delivers in place, and nothing waits',async()=>{
 // The whole working set fits exactly. Page availability callbacks may admit
 // synchronously; this one tries in every wave until it gets its bytes.
 const limit=MiB,p=page({limitBytes:limit}),r=p.runtime({transported:true});
 const hold=p.budget.reserve({category:'metadata',bytes:limit-LOAD,precision:'exact',label:'unrelated'});
 const waves=[];let grab;
 const off=p.budget.onAvailable(()=>{
  waves.push({read:category(p.budget,'read').bytes,construction:category(p.budget,'construction').bytes});
  if(grab)return;const result=p.budget.tryReserve({category:'metadata',bytes:2*ASSET,precision:'exact',label:'synchronous admission'});
  if(result.ok)grab={reservation:result.reservation,construction:category(p.budget,'construction').bytes};
 });
 r.setEnabled(true);
 assert.deepEqual({bytes:p.budget.stats.bytes,read:category(p.budget,'read').bytes,construction:category(p.budget,'construction').bytes,admitted:p.transport.stats.admittedReads,listeners:p.budget.stats.availabilityListeners,waves:waves.length},
  {bytes:limit,read:2*ASSET,construction:DECODE,admitted:1,listeners:1,waves:0},'one claim lists both envelopes: the transport reserved nothing more, registered no wait, and nothing returned to the ledger');
 await waitForResourceState(()=>r.stats.loads===1,'the same load to complete');
 off();
 assert.ok(waves.length>0,'delivery and decode returned bytes in waves');
 assert.ok(waves.every(row=>row.read<=ASSET),'no wave ran while the read envelope was charged');
 assert.ok(grab&&grab.construction===0,'the synchronous admission got bytes, and only after the decode envelope left');
 assert.deepEqual({error:r.stats.error,transportReads:p.counts.transportReads,admitted:p.transport.stats.admittedReads,delivered:p.transport.stats.admittedDeliveries,refused:p.transport.stats.admittedRefusals,consumers:p.transport.stats.consumers,listeners:p.budget.stats.availabilityListeners},
  {error:undefined,transportReads:1,admitted:1,delivered:1,refused:0,consumers:0,listeners:0});
 grab?.reservation.release();r.destroy();hold.release();drained(p);
});

test('two runtimes cannot wait on each other: an upload waiting beside its pixels and a load needing its read envelope both finish',async()=>{
 const limit=800000,p=page({limitBytes:limit}),g=fakeGL();
 const b=p.runtime({asset:p.assetFor(1)}),a=p.runtime({asset:p.assetFor(2),transported:true});
 b.setEnabled(true);assert.equal(await b.load(),true);
 let hold=p.budget.reserve({category:'metadata',bytes:limit-BITMAP-MIP+4096,precision:'exact',label:'unrelated'});
 b.attach(g);assert.equal(b.stats.error,'texture-budget-pending','b waits for its mip chain');
 // In one synchronous task the unrelated claim leaves and a starts its load.
 hold.release();hold=undefined;a.setEnabled(true);a.attach(g);
 await waitForResourceState(()=>a.stats.ready,'a to read, decode and upload while b waits');
 assert.deepEqual({error:b.stats.error,pixels:b.stats.cityCacheEntries},{error:'texture-budget-pending',pixels:0},'b waits with nothing held: its evictable pixels made room for a');
 a.destroy();
 await waitForResourceState(()=>b.stats.ready,'b to read its pixels again and upload once a leaves');
 assert.deepEqual({reads:p.counts.reads,listeners:p.budget.stats.availabilityListeners},{reads:2,listeners:0});
 assert.deepEqual(draw(b,g),{drawn:true,ready:[1]});
 assert.deepEqual(g.uploads.filter(row=>row.closed),[],'no upload read closed pixels');
 b.destroy();drained(p);
});

test('a destroyed runtime is collectable while another consumer still holds their shared texture',async()=>{
 const p=page(),g=fakeGL(),second=p.runtime();
 // Only the first runtime's options reference the marker.
 let first;const ref=(()=>{const marker={};first=p.runtime({marker});return new WeakRef(marker);})();
 first.setEnabled(true);first.attach(g);assert.equal(await first.load(),true);
 second.setEnabled(true);second.attach(g);assert.equal(second.stats.ready,true);
 first.destroy();first=undefined;p.store.evictRecent();p.store.collectRetired();
 assert.equal(await collected(ref),true,'the shared texture entry does not retain the first runtime scope or options');
 assert.deepEqual(draw(second,g),{drawn:true,ready:[1]},'the remaining consumer still samples the shared texture');
 second.destroy();drained(p);
});


test('128px textures upload resized pixels, share only at the same size, switch back and recover',async()=>{
 const p=page(),g=fakeGL(),original=p.runtime(),low=p.runtime({uploadSize:128}),peer=p.runtime({uploadSize:128});
 for(const r of [original,low,peer]){r.setEnabled(true);r.attach(g);assert.equal(await r.load(),true);}
 assert.equal(p.counts.reads,2);
 assert.deepEqual(p.bitmaps.map(b=>b.width),[256,128]);
 assert.equal(low.stats.logicalGPUTextureRGBABytes,(128*128*4*4-4)/3);
 assert.equal(original.stats.logicalGPUTextureRGBABytes,MIP);
 assert.equal(g.uploads.filter(u=>u.source?.width===128).length,1);
 low.setUploadSize(256);assert.equal(await low.load(),true);
 assert.equal(low.stats.uploadWidth,256);assert.equal(p.counts.reads,2);
 assert.equal(peer.stats.uploadWidth,128);assert.equal(draw(peer,g).drawn,true);
 low.setUploadSize(128);assert.equal(await low.load(),true);
 g.lose();g.restore();low.attach(g);assert.equal(await low.load(),true);
 assert.equal(g.uploads.at(-1).source.width,128);assert.equal(draw(low,g).drawn,true);
 for(const r of [original,low,peer])r.destroy();drained(p);
});

test('changing size during decode cannot publish stale pixels under the new size',async()=>{
 const p=page(),g=fakeGL();let finish;
 const r=p.runtime({decodeBitmap:(_blob,options)=>options.resizeWidth===256?new Promise(resolve=>{finish=()=>resolve({width:256,height:256,closed:false,close(){this.closed=true;}});}):Promise.resolve({width:128,height:128,close(){}})});
 r.setEnabled(true);r.attach(g);await waitForResourceState(()=>!!finish,'the first bitmap decode to start');assert.equal(typeof finish,'function');
 r.setUploadSize(128);assert.equal(await r.load(),true);finish();await settle(5);
 assert.equal(r.stats.uploadWidth,128);assert.equal(g.uploads.filter(u=>u.source?.width===256).length,0);
 assert.equal(draw(r,g).drawn,true);r.destroy();drained(p);
});

test('the default texture allocation uses the fixed 128px economy size',async()=>{
 const p=page(),r=p.runtime({uploadSize:undefined}),g=fakeGL();
 try{r.setEnabled(true);r.attach(g);assert.equal(await r.load(),true);assert.equal(r.stats.uploadWidth,128);assert.equal(p.bitmaps[0].width,128);}
 finally{r.destroy();}
});
