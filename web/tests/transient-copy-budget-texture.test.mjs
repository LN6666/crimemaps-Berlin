import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export {createSourceMaterialTexture} from './source-material-texture';export {createResourceByteTransport} from './resource-byte-transport';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {createSourceMaterialTexture,createResourceByteTransport,createChunkResourceStore,createResourceBudget}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024,SOURCE=1024,UPLOAD=128,BITMAP=UPLOAD*UPLOAD*4,MIP=(BITMAP*4-4)/3,DECODE=SOURCE*SOURCE*4+BITMAP;
const settle=async(turns=4)=>{for(let i=0;i<turns;i++)await new Promise(resolve=>setImmediate(resolve));};
function png(bytes){
 const b=new Uint8Array(bytes);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]);
 const view=new DataView(b.buffer);view.setUint32(16,SOURCE);view.setUint32(20,SOURCE);b[24]=8;for(let i=33;i<bytes;i++)b[i]=(i*31)&255;return b;
}
function fakeGL(){
 const g={TEXTURE0:0x84c0},names=['TEXTURE_2D','ACTIVE_TEXTURE','TEXTURE_BINDING_2D','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_COLORSPACE_CONVERSION_WEBGL','UNPACK_ALIGNMENT','UNPACK_ROW_LENGTH','UNPACK_IMAGE_HEIGHT','UNPACK_SKIP_PIXELS','UNPACK_SKIP_ROWS','UNPACK_SKIP_IMAGES','NONE','RGBA','UNSIGNED_BYTE','TEXTURE_WRAP_S','TEXTURE_WRAP_T','REPEAT','TEXTURE_MAG_FILTER','TEXTURE_MIN_FILTER','LINEAR','LINEAR_MIPMAP_LINEAR','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','WAIT_FAILED','TIMEOUT_EXPIRED'];
 let id=0x9000,active=g.TEXTURE0,next=1;for(const name of names)g[name]=id++;
 const bound=new Map(),pixelStore=new Map(),live=new Set(),uploads=[],deleted=[],uniforms=new Map();
 Object.assign(g,{uploads,deleted,uniforms,
  getParameter(p){if(p===g.ACTIVE_TEXTURE)return active;if(p===g.TEXTURE_BINDING_2D)return bound.get(active)??null;return pixelStore.get(p)??0;},
  activeTexture(unit){active=unit;},bindTexture(_target,texture){bound.set(active,texture);},pixelStorei(p,v){pixelStore.set(p,v);},
  createTexture(){const texture={texture:next++};live.add(texture);return texture;},deleteTexture(texture){live.delete(texture);deleted.push(texture);},isTexture(texture){return live.has(texture);},
  texImage2D(...args){uploads.push(args.at(-1));},texParameteri(){},generateMipmap(){},isContextLost(){return false;},
  getUniformLocation(_program,name){return name;},uniform1i(name,value){uniforms.set(name,value);},uniform1f(name,value){uniforms.set(name,value);},
  fenceSync(){return{};},flush(){},clientWaitSync(){return g.ALREADY_SIGNALED;},deleteSync(){},
 });
 return g;
}
function harness({limitBytes=64*MiB,recentLimitBytes=8*MiB,transport=true,readBytes,assetBytes=4096}={}){
 const budget=createResourceBudget({limitBytes,recentLimitBytes}),store=createChunkResourceStore({budget}),bytes=png(assetBytes);
 const asset={path:'/assets/3d-materials/transient-window.png',bytes:assetBytes,sha256:createHash('sha256').update(bytes).digest('hex')};
 const reads=[],decodes=[],bitmaps=[];let repaints=0;
 const byteTransport=transport?createResourceByteTransport({namespace:'texture-test',resourceStore:store,read:(target,_signal,max)=>new Promise(resolve=>reads.push({path:target,max,resolve:()=>resolve(new Uint8Array(bytes))}))}):undefined;
 const texture=createSourceMaterialTexture({asset,sourceSize:SOURCE,textureUnit:3,samplerName:'u_source_window_texture',readyName:'u_source_window_ready',label:'Window',resourceStore:store,
  acquireBytes:byteTransport?.acquireBytes,readBytes:readBytes?((value,signal)=>readBytes(bytes,value,signal)):(()=>Promise.reject(Error('direct read unused'))),requestRepaint(){repaints++;},
  decodeBitmap:(blob,options)=>new Promise(resolve=>decodes.push({blob,options,resolve:()=>{const bitmap={width:options.resizeWidth,height:options.resizeHeight,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);resolve(bitmap);}}))});
 return{budget,store,texture,asset,bytes,reads,decodes,bitmaps,gl:fakeGL(),get repaints(){return repaints;}};
}
const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});

test('a transport-owned PNG read is charged once: transport envelope before reading, one exact buffer identity while decoding',async()=>{
 const f=harness(),A=f.asset.bytes;
 f.texture.setEnabled(true);
 assert.deepEqual(category(f.budget,'read'),{bytes:2*A,exactBytes:0,estimatedBytes:2*A},'only the transport reserves the raw read');
 assert.deepEqual(category(f.budget,'construction'),{bytes:2*A+DECODE,exactBytes:0,estimatedBytes:2*A+DECODE},'copy, Blob, full decode and resized output are admitted before reading');
 await settle();assert.equal(f.reads.length,1);assert.equal(f.reads[0].max,A);
 f.reads[0].resolve();await settle(8);
 assert.equal(f.decodes.length,1,'decode starts after the hash/header checks');
 assert.deepEqual(category(f.budget,'read'),{bytes:A,exactBytes:A,estimatedBytes:0},'transport and texture share the exact buffer identity');
 assert.equal(category(f.budget,'construction').bytes,2*A+DECODE);
 f.decodes[0].resolve();await settle(8);
 assert.equal(category(f.budget,'construction').bytes,0,'construction envelope exits after decode');
 assert.deepEqual(category(f.budget,'texture'),{bytes:BITMAP,exactBytes:0,estimatedBytes:BITMAP},'only the resized bitmap remains before upload');
 f.texture.attach(f.gl);
 assert.equal(f.texture.stats.ready,true);assert.equal(f.texture.stats.cityCacheEntries,1,'uploaded pixels move to the bounded city bitmap cache');
 assert.equal(f.budget.stats.recentBytes>=BITMAP,true);
 f.texture.destroy();f.store.evictRecent();f.store.collectRetired();
 assert.equal(f.bitmaps[0].closed,true);assert.equal(f.budget.stats.bytes,0);
});

test('a full recent subset after upload drops the functional bitmap pin instead of keeping it pinned or pending',async()=>{
 const f=harness({recentLimitBytes:4096});
 f.texture.attach(f.gl);f.texture.setEnabled(true);
 await settle();f.reads[0].resolve();await settle(8);f.decodes[0].resolve();await settle(8);
 const stats=f.texture.stats;
 assert.equal(stats.ready,true);assert.equal(stats.error,undefined);
 assert.equal(stats.cityCacheEntries,0);assert.equal(stats.retainedBitmapLogicalRGBABytes,0);
 assert.equal(f.bitmaps[0].closed,true,'the uploaded bitmap closes once no functional or cache role remains');
 assert.equal(f.budget.stats.availabilityListeners,0,'no capacity wait remains for a committed upload');
 // Pressure may already have evicted the recent 1x1 fallback; the bitmap estimate is gone either way.
 const charged=category(f.budget,'texture');
 assert.equal(charged.estimatedBytes,0,'no ImageBitmap estimate remains charged');
 assert(charged.exactBytes===charged.bytes&&charged.bytes>=MIP&&charged.bytes<=MIP+4,'only the GPU mip chain (and at most the 1x1 fallback) stays charged');
 assert.equal(f.gl.uploads.filter(value=>value===f.bitmaps[0]).length,1);
 f.texture.destroy();
});

test('a post-read envelope rejection waits for capacity instead of latching a permanent asset failure',async()=>{
 const A=4096,decodeCost=2*A+DECODE,filler=MiB,limit=decodeCost+3*A+filler;let reads=0;
 // A direct reader may return a view whose underlying buffer is larger than the asset.
 const f=harness({transport:false,limitBytes:limit,recentLimitBytes:MiB,assetBytes:A,readBytes:async(bytes)=>{reads++;const larger=new Uint8Array(64*A);larger.set(bytes);return new Uint8Array(larger.buffer,0,A);}});
 const hold=f.budget.reserve({category:'metadata',bytes:filler,precision:'exact'});
 f.texture.setEnabled(true);await settle(8);
 assert.equal(reads,1);assert.equal(f.texture.stats.error,'texture-budget-pending');assert.equal(f.decodes.length,0);
 assert.equal(f.budget.stats.availabilityListeners,1);
 hold.release();await settle(8);
 assert.equal(reads,2,'released capacity wakes the same texture work');
 assert.equal(f.decodes.length,1);f.decodes[0].resolve();await settle(8);
 assert.equal(f.texture.stats.loads,1);assert.equal(f.texture.stats.error,undefined);
 f.texture.destroy();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
});

// A direct reader's view over a 64x larger buffer: after reading, the whole
// underlying buffer is charged beside the decode envelope.
const viewReader=(scale,counter)=>async bytes=>{counter.reads++;const larger=new Uint8Array(scale);larger.set(bytes);return new Uint8Array(larger.buffer,0,bytes.byteLength);};

test('a release between a rejected post-read admission and its wait subscription still wakes the texture work',async()=>{
 const A=4096,decodeCost=2*A+DECODE,limit=64*A+decodeCost,counter={reads:0};
 const f=harness({transport:false,limitBytes:limit,recentLimitBytes:MiB,assetBytes:A,readBytes:viewReader(64*A,counter)});
 let hold=f.budget.reserve({category:'metadata',bytes:32*A,precision:'exact'});
 // The failed production returns its envelope before the texture's catch runs;
 // an unrelated owner frees its claim in that gap, which no subscriber hears.
 const off=f.budget.onAvailable(()=>{if(!hold)return;const claim=hold;hold=undefined;off();claim.release();});
 f.texture.setEnabled(true);await settle(8);
 assert.equal(hold,undefined,'the unrelated claim was released inside the gap');
 assert.equal(counter.reads,2,'subscribing rechecks capacity instead of sleeping on a missed hint');
 assert.equal(f.decodes.length,1);f.decodes[0].resolve();await settle(8);
 assert.equal(f.texture.stats.loads,1);assert.equal(f.texture.stats.error,undefined);assert.equal(f.budget.stats.availabilityListeners,0);
 f.texture.destroy();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
});

test('a bitmap working set that can never fit the page ledger is reported as not fitting instead of waiting',async()=>{
 // Before any read: raw envelope, copy/Blob, full decode and resized output exceed the ledger.
 const small=harness({limitBytes:4*MiB,recentLimitBytes:MiB});
 small.texture.setEnabled(true);await settle(8);
 assert.equal(small.reads.length,0,'no transport read is queued for work that cannot fit');
 assert.match(small.texture.stats.error,/does not fit the page resource ledger/);
 assert.equal(small.budget.stats.availabilityListeners,0);assert.equal(small.budget.stats.bytes,0);
 small.texture.destroy();
 // After a direct read: the underlying buffer beside the decode envelope cannot fit.
 const A=4096,limit=8*MiB,counter={reads:0};
 const f=harness({transport:false,limitBytes:limit,recentLimitBytes:MiB,assetBytes:A,readBytes:viewReader(limit,counter)});
 f.texture.setEnabled(true);await settle(8);
 assert.equal(counter.reads,1);assert.match(f.texture.stats.error,/does not fit the page resource ledger/);
 assert.equal(f.budget.stats.availabilityListeners,0,'no wait remains for an impossible working set');
 const probe=f.budget.reserve({category:'metadata',bytes:1024,precision:'exact'});probe.release();await settle(8);
 assert.equal(counter.reads,1,'later availability hints do not download it again');assert.equal(f.decodes.length,0);
 f.texture.destroy();assert.equal(f.budget.stats.bytes,0);
});

test('a hint that cannot cover a waiting direct read does not download it again',async()=>{
 const A=4096,decodeCost=2*A+DECODE,limit=64*A+decodeCost,counter={reads:0};
 const f=harness({transport:false,limitBytes:limit,recentLimitBytes:MiB,assetBytes:A,readBytes:viewReader(64*A,counter)});
 const large=f.budget.reserve({category:'metadata',bytes:32*A,precision:'exact'}),small=f.budget.reserve({category:'metadata',bytes:A,precision:'exact'});
 f.texture.setEnabled(true);await settle(8);
 assert.equal(counter.reads,1);assert.equal(f.texture.stats.error,'texture-budget-pending');
 small.release();await settle(8);
 assert.equal(counter.reads,1,'the released claim cannot make room for the buffer and decode envelope');
 assert.equal(f.budget.stats.availabilityListeners,1,'the work keeps waiting for a sufficient hint');
 large.release();await settle(8);
 assert.equal(counter.reads,2);assert.equal(f.decodes.length,1);f.decodes[0].resolve();await settle(8);
 assert.equal(f.texture.stats.loads,1);assert.equal(f.texture.stats.error,undefined);
 f.texture.destroy();f.store.evictRecent();assert.equal(f.budget.stats.bytes,0);
});
