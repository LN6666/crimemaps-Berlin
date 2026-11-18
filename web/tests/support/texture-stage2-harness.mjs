// Shared harness for the texture-stage2 suites: the real source-material
// runtime, byte transport, page store and ledger, bundled in memory (write:false).
// TEXTURE_STAGE2_SUBJECT=<file> replaces source-material-texture.ts by that file
// while its relative imports still resolve in web/src/safety, so the same cases
// run against a saved copy or a mutant as a control.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from 'esbuild';

export const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../src/safety');
const subject=process.env.TEXTURE_STAGE2_SUBJECT;
export const subjectFile=subject?path.resolve(subject):path.join(safety,'source-material-texture.ts');
const redirect={name:'texture-stage2-subject',setup(b){
 if(!subject)return;
 b.onResolve({filter:/^\.\/source-material-texture$/},()=>({path:subjectFile,namespace:'texture-stage2-subject'}));
 b.onLoad({filter:/.*/,namespace:'texture-stage2-subject'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'ts',resolveDir:safety}));
}};
const built=await build({stdin:{contents:"export {createSourceMaterialTexture} from './source-material-texture';export {createResourceByteTransport,resourceByteAdmittedEnvelope,ResourceByteDeliveryRefusedError} from './resource-byte-transport';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node',plugins:[redirect],logLevel:'silent'});
export const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

export const KiB=1024,MiB=1024*1024,SIZE=128,BITMAP=SIZE*SIZE*4,MIP=(BITMAP*4-4)/3;
/** The runtime's working sets for an asset of `bytes` at `sourceSize`:
 * PNG copy and Blob, full decode, resized output, and the 2x read envelope. */
export function workingSet(bytes,sourceSize){const decode=bytes*2+sourceSize*sourceSize*4+BITMAP;return{decode,envelope:2*bytes,load:2*bytes+decode};}
export function png(bytes,sourceSize=256,seed=0){
 const b=new Uint8Array(bytes);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]);
 const view=new DataView(b.buffer);view.setUint32(16,sourceSize);view.setUint32(20,sourceSize);b[24]=8;for(let i=33;i<bytes;i++)b[i]=(i*29+seed*7)&255;return b;
}
export function fakeGL(){
 const g={TEXTURE0:0x84c0},names=['TEXTURE_2D','ACTIVE_TEXTURE','TEXTURE_BINDING_2D','UNPACK_FLIP_Y_WEBGL','UNPACK_PREMULTIPLY_ALPHA_WEBGL','UNPACK_COLORSPACE_CONVERSION_WEBGL','UNPACK_ALIGNMENT','UNPACK_ROW_LENGTH','UNPACK_IMAGE_HEIGHT','UNPACK_SKIP_PIXELS','UNPACK_SKIP_ROWS','UNPACK_SKIP_IMAGES','NONE','RGBA','UNSIGNED_BYTE','TEXTURE_WRAP_S','TEXTURE_WRAP_T','REPEAT','TEXTURE_MAG_FILTER','TEXTURE_MIN_FILTER','LINEAR','LINEAR_MIPMAP_LINEAR','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','WAIT_FAILED','TIMEOUT_EXPIRED'];
 let id=0x9000,active=g.TEXTURE0,next=1;for(const name of names)g[name]=id++;
 const bound=new Map(),pixelStore=new Map(),live=new Set(),created=[],uploads=[],readyUniforms=[];
 Object.assign(g,{created,uploads,readyUniforms,
  isContextLost:()=>false,
  getParameter(p){if(p===g.ACTIVE_TEXTURE)return active;if(p===g.TEXTURE_BINDING_2D)return bound.get(active)??null;return pixelStore.get(p)??0;},
  activeTexture(unit){active=unit;},bindTexture(_target,texture){bound.set(active,texture);},pixelStorei(p,v){pixelStore.set(p,v);},
  createTexture(){const texture={texture:next++};live.add(texture);created.push(texture);return texture;},
  deleteTexture(texture){live.delete(texture);},isTexture(texture){return live.has(texture);},
  texImage2D(...args){uploads.push(args.at(-1));},texParameteri(){},generateMipmap(){},
  getUniformLocation(_program,name){return name;},uniform1i(){},uniform1f(_location,value){readyUniforms.push(value);},
  fenceSync(){return{};},flush(){},clientWaitSync(){return g.ALREADY_SIGNALED;},deleteSync(){},
 });
 return g;
}
export const settle=async(turns=4)=>{for(let i=0;i<turns;i++)await new Promise(resolve=>setImmediate(resolve));};
// Every caller watches a state held until its next test action. Worker-backed
// hashing and decoding may outlast any fixed number of event-loop turns.
export async function until(condition) {
 const deadline = performance.now() + 10_000;
 while (!condition()) {
  if (performance.now() >= deadline) return false;
  await delay(2);
 }
 return true;
}
export const category=(budget,name)=>({...(budget.stats.categories[name]??{bytes:0,exactBytes:0,estimatedBytes:0})});
/** Ledger bytes left once every consumer and recent entry is gone. */
export function drained(p){p.store.evictRecent();p.store.collectRetired();return p.budget.stats.bytes;}

/** One page: ledger, store and byte transport. Each network read records the
 * ledger at the moment the transport reads; deferred reads wait for resolve().
 * serve(bytes, call, n) may return another array, e.g. a view over a larger buffer. */
export function page({limitBytes=64*MiB,recentLimitBytes=Math.min(8*MiB,limitBytes),recentMaxEntries,recentMaxIdleMs,deferred=false,serve}={}){
 const budget=api.createResourceBudget({limitBytes,recentLimitBytes}),store=api.createChunkResourceStore({budget,recentMaxEntries,recentMaxIdleMs});
 const files=new Map(),network=[],bitmaps=[],counts={direct:0};
 const read=(target,signal,max)=>{
  const call={path:target,signal,max,ledgerBytes:budget.stats.bytes,availableBytes:budget.stats.availableBytes};network.push(call);
  const answer=()=>{const value=new Uint8Array(files.get(target));return serve?serve(value,call,network.length):value;};
  if(!deferred)return Promise.resolve().then(answer);
  return new Promise((resolve,reject)=>{call.resolve=()=>resolve(answer());call.reject=reject;});
 };
 const transport=api.createResourceByteTransport({namespace:'texture-stage2',resourceStore:store,read});
 function assetFor({seed=0,bytes=4096,sourceSize=256}={}){
  const body=png(bytes,sourceSize,seed),asset={path:'/assets/3d-materials/stage2-'+seed+'-'+bytes+'.png',bytes,sha256:createHash('sha256').update(body).digest('hex')};
  files.set(asset.path,body);return asset;
 }
 const runtime=({asset,sourceSize=256,transported=true,acquireBytes,...extra}={})=>api.createSourceMaterialTexture({asset,sourceSize,textureUnit:4,samplerName:'u_stage2_diffuse',readyName:'u_stage2_ready',label:'Stage2',resourceStore:store,
  acquireBytes:acquireBytes??(transported?transport.acquireBytes:undefined),
  readBytes:async value=>{counts.direct++;return new Uint8Array(files.get(value.path));},requestRepaint(){},
  decodeBitmap:async(_blob,options)=>{const bitmap={width:options.resizeWidth,height:options.resizeHeight,closed:false,close(){this.closed=true;}};bitmaps.push(bitmap);return bitmap;},...extra});
 return{budget,store,transport,files,network,bitmaps,counts,assetFor,runtime};
}
/** A reader answer: the asset bytes as a view over a buffer `scale` times larger. */
export const largerBuffer=scale=>value=>{const larger=new Uint8Array(scale*value.byteLength);larger.set(value);return new Uint8Array(larger.buffer,0,value.byteLength);};
export const metadata=(bytes,label='unrelated')=>({category:'metadata',bytes,precision:'exact',label});
