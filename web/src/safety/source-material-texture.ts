import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkResourceCosts,ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';
import {resourceByteAdmittedEnvelope,ResourceByteDeliveryRefusedError,type ResourceBytesAcquire,type ResourceBytesLease} from './resource-byte-transport';

export type SourceTextureAsset={path:string;bytes:number;sha256:string};
export type SourceTextureOptions={
 uploadSize?:128|256;
 readBytes:(asset:SourceTextureAsset,signal:AbortSignal)=>Promise<Uint8Array>;
 requestRepaint:()=>void;
 decodeBitmap?:(blob:Blob,options:ImageBitmapOptions)=>Promise<ImageBitmap>;
 resourceStore?:ChunkResourceStore;
 /** The page byte transport, on resourceStore's page ledger. Every read passes
  * {admitted, envelope, keep}, so a wrapper must forward the fourth argument
  * unchanged; stats.unadmittedTransportReads counts reads whose call returned
  * without reading it (a dropped argument), at the call, not at delivery. */
 acquireBytes?:ResourceBytesAcquire;
};
type Options=SourceTextureOptions&{asset:SourceTextureAsset;sourceSize:256|1024;textureUnit:3|4|5;samplerName:string;readyName:string;label:string};
const UPLOAD_ATTEMPTS=3;
const FALLBACK_KEY='source-material:transparent-rgba8-repeat-linear-v1';
// Store entries outlive the load or upload that produced them: a bitmap as a
// recent entry, a texture while any consumer of its content key holds it (the
// placeholder is shared by every runtime). Their cost and dispose callbacks are
// module functions that capture at most the context, so a live entry retains
// neither a completed load's AbortController nor a runtime's scope or options.
const bitmapCosts=(value:ImageBitmap):ChunkResourceCosts=>({category:'texture',bytes:value.width*value.height*4,precision:'estimate',identity:value,label:'ImageBitmap RGBA equivalent'});
const closeBitmap=(value:ImageBitmap)=>value.close();
const deleteTextureFor=(g:WebGL2RenderingContext)=>(value:WebGLTexture)=>g.deleteTexture(value);
/** The stored handle is still a texture of this context incarnation. */
const liveTexture=(g:WebGL2RenderingContext,lease:ChunkResourceLease<WebGLTexture>)=>{const value=lease.value;return !!value&&g.isTexture(value);};

/** One pixel/GL contract for all painted providers. Content has no camera or
 * provider identity; independent consumers hold their own revocable leases. */
export function createSourceMaterialTexture(options:Options){
 const store=options.resourceStore??getPageChunkResourceStore(),asset=options.asset,unit=options.textureUnit;
 let SIZE:128|256=options.uploadSize??128;
 if(SIZE!==128&&SIZE!==256)throw Error('Unsupported source texture upload size');
 let BITMAP_BYTES=SIZE*SIZE*4,MIP_BYTES=(SIZE*SIZE*4*4-4)/3;
 let bitmapKey=JSON.stringify(['source-material-bitmap-v1',asset.sha256,options.sourceSize,SIZE,'none','none','none','high']);
 let textureKey=JSON.stringify(['source-material-rgba8-mip-repeat-linear-v1',asset.sha256,SIZE]);
 const uniforms=new WeakMap<WebGLProgram,{sampler:WebGLUniformLocation|null;ready:WebGLUniformLocation|null}>();
 let enabled=false,hidden=false,destroyed=false,attachmentAttempted=false,assetFailed=false;
 let uploadAttempts=0,retries=0,revision=0,loads=0,residentRevision=0,error:string|undefined;
 // loads counts completed load tasks, page-store hits included. reads and
 // decodes count the byte reads this runtime's productions started and the
 // decodes they completed; storeHits the completed loads that adopted an
 // existing page-store entry instead of producing one.
 let reads=0,decodes=0,storeHits=0,unadmittedTransportReads=0;
 let controller:AbortController|undefined,loading:Promise<boolean>|undefined,gl:WebGL2RenderingContext|undefined;
 let pixels:ChunkResourceLease<ImageBitmap>|undefined,gpu:ChunkResourceLease<WebGLTexture>|undefined,uploaded=false;
 // The real texture kept across disable, hide and detach (see park).
 let kept:ChunkResourceLease<WebGLTexture>|undefined;
 // One availability subscription serves every waiting work. Each wait keeps the
 // working set its work must admit before a hint retries it (0: not waiting):
 // progress is the work towards real pixels (a load, or the upload of loaded
 // pixels beside their mip chain), retried by load(); placeholder is the
 // placeholder upload, retried by safeUpload(). The latest refusal of a work
 // sets its wait; only what that work waited for ends it.
 let stopAvailable:(()=>void)|undefined,wakeQueued=false,progressWaitBytes=0,placeholderWaitBytes=0,postReadBytes=0;
 // Retries that capacity wakes started, and those refused again; retryWake
 // marks the synchronous part of such a retry.
 let capacityRetries=0,refusedCapacityRetries=0,retryWake=false;
 // A refused delivery's envelope (its delivered buffer beyond the standard
 // 2x asset.bytes): later reads mint it, and a refusal with it is not retried.
 let deliveryEnvelopeBytes=0;
 const SOURCE_RGBA=options.sourceSize**2*4;
 // PNG copy and Blob, full-size decode and resized output coexist with the raw
 // read envelope (chunked body + contiguous copy). The bitmap entry lists both
 // before anything is read; with a byte transport its production context is
 // the transport's caller-admitted claim. The whole bitmap working set must fit
 // the page ledger at once.
 let DECODE_BYTES=asset.bytes*2+SOURCE_RGBA+BITMAP_BYTES,LOAD_BYTES=asset.bytes*2+DECODE_BYTES;
 const bitmap=()=>pixels?.value;
 const texture=()=>gpu?.value;
 const aborted=()=>new DOMException('Texture consumer cancelled','AbortError');
 const current=(signal:AbortSignal,ticket:number)=>{signal.throwIfAborted();if(destroyed||hidden||!enabled||ticket!==revision)throw aborted();};
 const doesNotFit=(bytes:number)=>Error(options.label+' texture working set of '+bytes+' bytes does not fit the page resource ledger of '+store.budget.stats.limitBytes+' bytes');
 function stopWaiting(){stopAvailable?.();stopAvailable=undefined;progressWaitBytes=0;placeholderWaitBytes=0;}
 /** Ends the waits a work just served; any other wait keeps the subscription. */
 function settleWaits(progress:boolean,placeholder:boolean){if(progress)progressWaitBytes=0;if(placeholder)placeholderWaitBytes=0;if(!progressWaitBytes&&!placeholderWaitBytes)stopWaiting();}
 function wake(){
  if(wakeQueued)return;wakeQueued=true;
  queueMicrotask(()=>{wakeQueued=false;
   // Every wait ended (served, aborted or destroyed) before this hint ran.
   if(!stopAvailable)return;
   if(destroyed||hidden){stopWaiting();return;}
   // A hint is not admission: a waiting work is retried only once its own
   // working set could fit after recent eviction and retired-allocation
   // collection, so a release that covers only the placeholder retries only
   // the placeholder, not a load whose refused admission would empty the page
   // recent cache through the pressure path. Retiring bytes are an optimistic
   // bound: a retirement whose production or fence is still pending is not
   // reclaimable, so such a retry is refused and waits again
   // (refusedCapacityRetries). Each retry needs a real availability wave, so
   // this never loops.
   const s=store.budget.stats,room=s.availableBytes+s.recentBytes+s.retiringBytes;
   const progress=progressWaitBytes>0&&progressWaitBytes<=room,placeholder=!progress&&placeholderWaitBytes>0&&placeholderWaitBytes<=room;
   if(!progress&&!placeholder)return;
   settleWaits(progress,placeholder);
   const asWake=(work:()=>unknown)=>{capacityRetries++;retryWake=true;try{work();}finally{retryWake=false;}};
   // A wake can arrive while the failed load is still settling; retry after it.
   // A placeholder still waiting beside a due load is drawn by the repaint.
   if(progress){const retry=()=>asWake(()=>void load());if(loading)void loading.then(retry,retry);else retry();}else asWake(safeUpload);
   options.requestRepaint();
  });
 }
 /** need: bytes the refused work must admit before a hint retries it;
  * progress: that work is a load or the upload of real pixels. */
 function awaitCapacity(need:number,progress:boolean){
  if(destroyed||hidden)return;
  if(progress)progressWaitBytes=need;else placeholderWaitBytes=need;
  if(!stopAvailable)stopAvailable=store.budget.onAvailable(wake);
  // A release between the rejected admission and this subscription sent no
  // hint. A wake's own retry refused in its synchronous part was refused after
  // its admission's pressure eviction rechecked the ledger in this same task,
  // so it waits for the next wave instead: an underestimated need cannot spin.
  if(!retryWake&&Math.min(progressWaitBytes||Infinity,placeholderWaitBytes||Infinity)<=store.budget.stats.availableBytes)wake();
 }
 function abort(){revision++;controller?.abort();controller=undefined;loading=undefined;stopWaiting();}
 function releasePixels(){const old=pixels;pixels=undefined;old?.release();}
 function releaseGPU(){const old=gpu;gpu=undefined;uploaded=false;if(old)residentRevision++;old?.release();}
 function releaseKept(){const old=kept;kept=undefined;old?.release();}
 /** A stopped facade is not an active GPU consumer. Keep a revocable cache
  * lease for fast returns within its 17s idle tier; pressure can evict sooner.
  * A later return reloads through the normal bounded source path. */
 function park(){
  const old=gpu;if(!old)return;
  const real=uploaded,g=old.context;gpu=undefined;uploaded=false;residentRevision++;
  if(!real||!g||g.isContextLost()||old.epoch!==store.contextEpoch(g)){old.release();return;}
  if(liveTexture(g,old)){
   releaseKept();try{kept=old.retain('cache');}catch(error){if(!(error instanceof ResourceBudgetExceededError))throw error;}
   finally{old.release();}return;
  }
  // A same-object restore that no owner reported yet: report the observed
  // incarnation (its handles are never deleted), as upload does for a hit.
  store.invalidateContext(g,old.epoch);old.release();
 }
 /** Pixels that no upload needs right now stay only in the revocable cache. A
  * full or unavailable recent subset drops them instead of keeping a
  * non-evictable role: recovery reads the asset again. */
 function cachePixels(){
  const held=pixels;if(!held)return;if(held.released){pixels=undefined;return;}if(held.role==='cache')return;
  pixels=undefined;
  try{pixels=held.retain('cache');}catch{/* recovery reads the asset again */}
  finally{held.release();}
 }
 function withState<T>(g:WebGL2RenderingContext,fn:()=>T,pixelStore=false):T{
  const active=g.getParameter(g.ACTIVE_TEXTURE);
  const stores=pixelStore?[g.UNPACK_FLIP_Y_WEBGL,g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.UNPACK_ALIGNMENT,g.UNPACK_ROW_LENGTH,g.UNPACK_IMAGE_HEIGHT,g.UNPACK_SKIP_PIXELS,g.UNPACK_SKIP_ROWS,g.UNPACK_SKIP_IMAGES].map(p=>[p,g.getParameter(p)] as const):[];
  g.activeTexture(g.TEXTURE0+unit);const binding=g.getParameter(g.TEXTURE_BINDING_2D);
  try{return fn();}finally{if(!g.isContextLost()){g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,binding);for(const[p,v]of stores)g.pixelStorei(p,v);g.activeTexture(active);}}
 }
 function isResident(g:WebGL2RenderingContext):boolean{
  const value=texture();return !destroyed&&gl===g&&attachmentAttempted&&!!value&&gpu?.epoch===store.contextEpoch(g)&&!g.isContextLost()&&g.isTexture(value)&&!g.isContextLost();
 }
 function bindAndDraw<T>(g:WebGL2RenderingContext,program:WebGLProgram|undefined,draw:()=>T,unavailable:()=>T):T{
  if(!program||!isResident(g)||!gpu)return unavailable();
  // Reentrant owner changes during a draw cannot retire the bound incarnation.
  const pin=gpu.retain('reflection'),ready=uploaded;
  try{return withState(g,()=>{
   const value=pin.value;if(!value||g.isContextLost())return unavailable();g.bindTexture(g.TEXTURE_2D,value);
   let loc=uniforms.get(program);if(!loc){loc={sampler:g.getUniformLocation(program,options.samplerName),ready:g.getUniformLocation(program,options.readyName)};uniforms.set(program,loc);}
   if(g.isContextLost())return unavailable();g.uniform1i(loc.sampler,unit);if(g.isContextLost())return unavailable();g.uniform1f(loc.ready,ready?1:0);
   return g.isContextLost()?unavailable():draw();
  });}finally{pin.release();}
 }
 function upload(){
  if(!gl||destroyed||hidden)return false;
  const g=gl;if(g.isContextLost())throw Error(options.label+' texture context lost');
  // The kept real texture of this context is bound as is. One whose handle this
  // live context no longer knows reports its observed incarnation first; one of
  // another context or incarnation is dropped.
  if(enabled&&kept){
   const held=kept;kept=undefined;
   try{
    // An evicted cache handle is not a context-loss observation. Only a still
    // owned texture whose driver handle disappeared may invalidate the epoch.
    if(held.value&&held.context===g&&held.epoch===store.contextEpoch(g)){
     if(liveTexture(g,held)){const active=held.retain('main'),old=gpu;gpu=active;uploaded=true;residentRevision++;old?.release();return true;}
     store.invalidateContext(g,held.epoch);
    }
   }finally{held.release();}
  }
  const image=enabled?bitmap():undefined,key=image?textureKey:FALLBACK_KEY;
  if(gpu?.contentKey===key&&isResident(g))return uploaded;
  const acquire=()=>store.acquireGpu<WebGLTexture>({contentKey:key,context:g,epoch:store.contextEpoch(g),role:'main',allowRecent:true,
   estimate:{category:'texture',bytes:image?MIP_BYTES:4,precision:'exact',label:asset.path},
   create:()=>withState(g,()=>{
    let created:WebGLTexture|undefined;
    try{
     created=g.createTexture()??undefined;if(!created)throw Error(options.label+' texture allocation failed');
     g.bindTexture(g.TEXTURE_2D,created);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.NONE);g.pixelStorei(g.UNPACK_ALIGNMENT,1);
     for(const p of [g.UNPACK_ROW_LENGTH,g.UNPACK_IMAGE_HEIGHT,g.UNPACK_SKIP_PIXELS,g.UNPACK_SKIP_ROWS,g.UNPACK_SKIP_IMAGES])g.pixelStorei(p,0);
     if(image)g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);
     else g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array(4));
     g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,image?g.LINEAR_MIPMAP_LINEAR:g.LINEAR);
     if(image)g.generateMipmap(g.TEXTURE_2D);
     if(g.isContextLost())throw Error(options.label+' texture context lost during upload');return created;
    }catch(error){if(created&&!g.isContextLost())g.deleteTexture(created);throw error;}
   },true),dispose:deleteTextureFor(g),
  });
  // Cache-only pixels (kept across a restore or a context change) are pinned for
  // this synchronous upload: the texture admission's pressure eviction may take
  // their cache role but cannot close them before texImage2D. No wait holds it.
  const pin=image&&pixels?.role==='cache'?pixels.retain('source'):undefined;
  try{
   let next=acquire();
   // A same-object restore keeps the store incarnation until some owner reports it.
   // A hit whose handle this context no longer knows reports its own observed epoch
   // (lost handles are never deleted) and allocates once in the new incarnation,
   // instead of binding the lost handle or waiting for another owner to invalidate.
   if(!liveTexture(g,next)){
    store.invalidateContext(g,next.epoch);next.release();
    if(g.isContextLost())throw Error(options.label+' texture context lost');
    if(destroyed||hidden||gl!==g)return false;
    next=acquire();
    if(!liveTexture(g,next)){next.release();throw Error(options.label+' texture handle unavailable after reallocation');}
   }
   const old=gpu;gpu=next;uploaded=!!image;residentRevision++;old?.release();
   // Uploaded pixels no longer require a functional CPU pin. A page-budgeted
   // cache may retain the bitmap for recovery; pressure can close it immediately.
   // A full or unavailable recent subset drops the pin instead of keeping it as
   // a non-evictable source role or reporting the committed upload as pending.
   if(uploaded)cachePixels();
   return uploaded;
  }finally{pin?.release();}
 }
 function safeUpload(){
  if(!gl||destroyed||hidden||uploadAttempts>=UPLOAD_ATTEMPTS)return false;
  // Read before the attempt: a refused admission's pressure eviction may take
  // the cached pixels, but this attempt's working set included them.
  const image=enabled&&!!bitmap();
  try{
   const ready=upload();
   // Committed real pixels serve every wait; a committed placeholder serves only
   // its own, so work towards real pixels keeps waiting (and pending) beside it.
   settleWaits(ready,ready||!!texture());
   // A terminal asset failure stays reported: renderers release textured
   // candidates on error && !loading, and nothing retries it implicitly.
   error=progressWaitBytes?'texture-budget-pending':assetFailed?error:undefined;
   // Real pixels gone (their cache evicted, their texture revoked by a context
   // change) while nothing reads, waits for or keeps them: the committed
   // placeholder would stay for good, so load() recovers them (a recent bitmap,
   // or a new read), waiting holding nothing if it is refused.
   if(!ready&&enabled&&!progressWaitBytes&&!kept&&!loading&&!bitmap()&&!assetFailed)void load();
   return ready;
  }
  catch(e){
   if(e instanceof ResourceBudgetExceededError){
    // The pixels and their mip chain coexist while uploading. Nothing is held
    // while waiting for that whole working set: the pixels return to the
    // revocable cache (pressure may close them; the woken load reads again).
    // Real pixels wait as progress, retried by load(), so a later placeholder
    // commit cannot end the wait for them.
    const need=image?BITMAP_BYTES+MIP_BYTES:4;
    if(need>store.budget.stats.limitBytes){uploadAttempts=UPLOAD_ATTEMPTS;error=String(doesNotFit(need));return false;}
    if(retryWake)refusedCapacityRetries++;
    cachePixels();awaitCapacity(need,image);error='texture-budget-pending';return false;
   }
   uploadAttempts++;error=String(e);return false;
  }
 }
 async function load(external?:AbortSignal):Promise<boolean>{
  if(destroyed||hidden||!enabled)return false;
  if(gl&&kept)safeUpload();
  if(uploaded&&gl&&isResident(gl))return true;
  // The kept texture serves the next attach to its context: nothing is read meanwhile.
  if(kept?.value)return true;releaseKept();
  if(bitmap()){if(gl)safeUpload();return true;}
  if(assetFailed)return false;if(loading)return loading;
  // Report a working set larger than the whole ledger instead of waiting forever.
  if(LOAD_BYTES>store.budget.stats.limitBytes){assetFailed=true;error=String(doesNotFit(LOAD_BYTES));return false;}
  controller=new AbortController();const own=controller,signal=own.signal,ticket=++revision,woken=retryWake;
  const externalAbort=()=>own.abort();external?.addEventListener('abort',externalAbort,{once:true});if(external?.aborted)own.abort();
  const decodeSize=SIZE;
  const task=(async()=>{
   let consumer:ChunkResourceLease<ImageBitmap>|undefined,produced=false;
   try{
    // PNG input, hash/Blob copies, source decode and resized output coexist.
    // Decoder/browser overhead remains an estimate, not a physical-memory cap.
    // The whole working set, the raw read envelope (chunked body + contiguous
    // copy) included, is admitted at once before anything is read, so no part
    // of it is held while another part waits.
    const decodeCost={category:'construction' as const,bytes:DECODE_BYTES,precision:'estimate' as const,label:'PNG copy, decode and resize'};
    // Through the byte transport the envelope is minted for the one bitmap
    // entry this call may create (a store hit leaves it unused), after a
    // refused delivery with that delivery's envelope.
    const acquire=options.acquireBytes,retried=deliveryEnvelopeBytes>0;
    const envelope=acquire?resourceByteAdmittedEnvelope(asset.path,asset.bytes,deliveryEnvelopeBytes):undefined;
    const readEnvelope=envelope??[{category:'read' as const,bytes:asset.bytes*2,precision:'estimate' as const,label:asset.path}];
    consumer=store.acquire<ImageBitmap>({contentKey:bitmapKey,role:'source',signal,allowRecent:true,cacheRetention:'redecode',estimate:[...readEnvelope,decodeCost],
     produce:async context=>{
      produced=true;
      let candidate:ImageBitmap|undefined,bytesLease:ResourceBytesLease|undefined;
      try{
       let bytes:Uint8Array;reads++;
       if(acquire&&envelope){
        // This production context is the transport's caller-admitted claim: its
        // estimate lists the envelope, so the read's own store entry reserves
        // the same identities for no further byte and the transport never
        // waits. Delivery replaces the envelope here in place by the delivered
        // buffer beside the decode envelope (keep).
        // A forwarded claim reserves the same identities in the call's
        // synchronous part: the ledger neither grows nor meets a new pressure.
        // A wrapper that drops the fourth argument admits its own envelope
        // there (growth) or is refused and waits (pressure) while this claim
        // stays held: counted at the call, so the count shows a read stuck
        // that way; a joined or recent legacy read is counted at delivery.
        const before=context.budget.stats;let droppedAtCall=false;
        try{
         const pending=acquire(asset.path,context.signal,asset.bytes,{admitted:context,envelope,keep:[decodeCost]});
         const after=context.budget.stats;
         if(after.bytes>before.bytes||after.pressureEvents!==before.pressureEvents){droppedAtCall=true;unadmittedTransportReads++;}
         bytesLease=await pending;
        }
        catch(e){
         // The page store bounds this to a plain budget error, so the retry
         // recipe is recorded first: load() waits, holding nothing, until the
         // retry claim fits, and the next read mints the delivered buffer's
         // envelope. retryBytes is that whole claim (decode + envelopeBytes),
         // so the recorded need covers the retry and the immediate recheck in
         // awaitCapacity cannot spin. A claim that cannot fit, or a second
         // refusal with that envelope, is reported as not fitting instead.
         if(e instanceof ResourceByteDeliveryRefusedError){
          postReadBytes=Math.max(postReadBytes,e.retryBytes);
          if(e.unfit)throw doesNotFit(e.retryBytes);
          if(retried)throw Error(options.label+' texture read delivered '+e.deliveredBytes+' bytes beyond its admitted retry envelope of '+deliveryEnvelopeBytes+' bytes; reported as not fitting instead of retrying again');
          deliveryEnvelopeBytes=Math.max(deliveryEnvelopeBytes,e.envelopeBytes);
         }
         throw e;
        }
        // Delivered without the caller-admitted cost: a wrapper dropped the
        // fourth argument, so the transport admitted (and could wait for) a
        // second envelope beside this claim.
        if(!droppedAtCall&&bytesLease.cost===undefined)unadmittedTransportReads++;
        bytes=bytesLease.bytes;
       }else bytes=await options.readBytes(asset,context.signal);
       context.signal.throwIfAborted();
       if(bytes.byteLength!==asset.bytes)throw Error('Official '+options.label+' texture byte mismatch');
       // The same underlying buffer identity deduplicates a transport-owned read
       // (a caller-admitted delivery already lists it here: this changes nothing).
       if(!context.adjust([{category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer,label:asset.path},decodeCost])){
        context.signal.throwIfAborted();
        // The whole underlying buffer (a view may expose only part) plus decode.
        const need=bytes.buffer.byteLength+decodeCost.bytes;
        if(need>context.budget.stats.limitBytes)throw doesNotFit(need);
        postReadBytes=Math.max(postReadBytes,need);const pressure=context.budget.stats.lastPressure;
        if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Texture input exceeds reserved byte envelope');
       }
       const copy=new Uint8Array(bytes),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',copy.buffer));context.signal.throwIfAborted();
       if([...digest].map(n=>n.toString(16).padStart(2,'0')).join('')!==asset.sha256)throw Error('Official '+options.label+' texture SHA mismatch');
       const header=new DataView(copy.buffer);
       if(copy.length<33||header.getUint32(0)!==0x89504e47||header.getUint32(4)!==0x0d0a1a0a||header.getUint32(12)!==0x49484452||header.getUint32(16)!==options.sourceSize||header.getUint32(20)!==options.sourceSize||copy[24]!==8)throw Error('Official texture dimensions/format mismatch');
       const decode=options.decodeBitmap??((b:Blob,o:ImageBitmapOptions)=>createImageBitmap(b,o));
       candidate=await decode(new Blob([copy],{type:'image/png'}),{resizeWidth:decodeSize,resizeHeight:decodeSize,resizeQuality:'high',imageOrientation:'none',premultiplyAlpha:'none',colorSpaceConversion:'none'});decodes++;context.signal.throwIfAborted();
       if(candidate.width!==decodeSize||candidate.height!==decodeSize)throw Error(options.label+' texture resize unavailable');
       const result=candidate;candidate=undefined;return result;
      }finally{candidate?.close();bytesLease?.release();}
     },costs:bitmapCosts,dispose:closeBitmap,
    });
    // A usable store hit (another consumer's ready entry, or this runtime's
    // recent bitmap after a context change or loss) is adopted in this same
    // call, so the upload that follows binds real pixels synchronously. Only a
    // production that is still running is awaited.
    if(consumer.value===undefined)await consumer.ready;
    current(signal,ticket);
    const ready=consumer.retain('source');consumer.release();consumer=undefined;releasePixels();pixels=ready;
    if(!produced)storeHits++;
    // These pixels supersede any earlier load still waiting for capacity; the
    // upload below waits again if it is refused.
    settleWaits(true,false);
    safeUpload();loads++;if(uploaded||!gl)error=undefined;options.requestRepaint();return true;
   }catch(e){
    if(signal.aborted||ticket!==revision||destroyed||hidden||!enabled)return false;
    if(e instanceof ResourceBudgetExceededError){if(woken)refusedCapacityRetries++;awaitCapacity(Math.max(LOAD_BYTES,postReadBytes),true);error='texture-budget-pending';return false;}
    assetFailed=true;error=String(e);return false;
   }finally{consumer?.release();external?.removeEventListener('abort',externalAbort);if(controller===own)controller=undefined;}
  })();loading=task;void task.then(()=>{if(loading===task)loading=undefined;});return task;
 }
 return{
  load,isResident,withResidentTexture:bindAndDraw,
  setUploadSize(value:128|256){
   if(value!==128&&value!==256)throw Error('Unsupported source texture upload size');
   if(destroyed||value===SIZE)return;
   abort();releaseGPU();releaseKept();releasePixels();
   SIZE=value;BITMAP_BYTES=SIZE*SIZE*4;MIP_BYTES=(SIZE*SIZE*4*4-4)/3;
   bitmapKey=JSON.stringify(['source-material-bitmap-v1',asset.sha256,options.sourceSize,SIZE,'none','none','none','high']);
   textureKey=JSON.stringify(['source-material-rgba8-mip-repeat-linear-v1',asset.sha256,SIZE]);
   DECODE_BYTES=asset.bytes*2+SOURCE_RGBA+BITMAP_BYTES;LOAD_BYTES=asset.bytes*2+DECODE_BYTES;
   uploadAttempts=0;retries=0;assetFailed=false;error=undefined;postReadBytes=0;residentRevision++;
   if(!hidden){safeUpload();if(enabled)void load();}options.requestRepaint();
  },
  setEnabled(value:boolean){if(enabled===value)return;enabled=value;if(!value){abort();park();releasePixels();if(!hidden)safeUpload();}else if(!hidden)void load();},
  setPageHidden(value:boolean){if(hidden===value)return;hidden=value;if(value){abort();park();releasePixels();}else{safeUpload();if(enabled)void load();}},
  attach(g:WebGL2RenderingContext){if(destroyed)return;if(gl===g&&isResident(g))return;releaseGPU();gl=g;residentRevision++;attachmentAttempted=true;uploadAttempts=0;safeUpload();if(enabled&&!hidden&&!assetFailed)void load();},
  detach(){abort();park();releasePixels();gl=undefined;attachmentAttempted=false;},
  retry(){if(destroyed||hidden||!enabled||retries>=1)return false;retries++;assetFailed=false;if(bitmap())return safeUpload();void load();return true;},
  withTexture<T>(g:WebGL2RenderingContext,program:WebGLProgram|undefined,draw:()=>T,fallbackDraw:()=>T):T{if(gl!==g||!attachmentAttempted)this.attach(g);else if(!texture())safeUpload();return bindAndDraw(g,program,draw,fallbackDraw);},
  get stats(){return{enabled,hidden,residentRevision,loading:!!loading,uploadAttempts,maxUploadAttemptsPerAttach:UPLOAD_ATTEMPTS,retries,maxExplicitRetriesPerCity:1,optionalTextureFailureDoesNotThrowGeometry:true,requiresSamplerFreeProgramFallback:true,ready:uploaded&&!!texture(),assetBytes:asset.bytes,loadWorkingSetBytes:Math.max(LOAD_BYTES,postReadBytes),sourceWidth:options.sourceSize,sourceHeight:options.sourceSize,uploadWidth:SIZE,uploadHeight:SIZE,retainedBitmapLogicalRGBABytes:bitmap()?BITMAP_BYTES:0,logicalGPUTextureRGBABytes:texture()?(uploaded?MIP_BYTES:4):0,textureObjects:texture()?1:0,keptTextureObjects:kept?.value?1:0,keptLogicalGPUTextureRGBABytes:kept?.value?MIP_BYTES:0,cityCacheEntries:bitmap()?1:0,textureUnit:unit,loads,reads,decodes,storeHits,capacityRetries,refusedCapacityRetries,unadmittedTransportReads,error,sharedResourceStore:true,measurement:'Per-consumer logical view; shared page store deduplicates bitmap estimates and GPU RGBA8 bytes; excludes driver/browser overhead'};},
  destroy(){if(destroyed)return;destroyed=true;abort();releaseGPU();releaseKept();releasePixels();gl=undefined;attachmentAttempted=false;},
 };
}
