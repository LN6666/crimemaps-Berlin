import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/safety');
const built=await build({stdin:{contents:"export {createSceneSolarShadow} from './scene-solar-shadow';export {installSceneSolarShadowLayer} from './scene-solar-shadow-layer';export {sceneSolarLight} from './scene-solar-light';export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';",resolveDir:safety},bundle:true,write:false,format:'esm',platform:'node'});
const {createSceneSolarShadow,installSceneSolarShadowLayer,sceneSolarLight,createChunkResourceStore,bindChunkResourceContext,createResourceBudget}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

const MiB=1024*1024,solarSize=512,solarBytes=solarSize*solarSize*4;
// fence: 'signaled' (every query passes), 'task' (WebGL2: never signalled in the
// task that created it), 'never' (always TIMEOUT_EXPIRED), 'unavailable' (fenceSync null).
function fakeGL({fence='signaled'}={}){
 const g={TEXTURE0:0x84c0},names=['ACTIVE_TEXTURE','TEXTURE_BINDING_2D','TEXTURE_2D','SAMPLER_BINDING','READ_FRAMEBUFFER_BINDING','DRAW_FRAMEBUFFER_BINDING','READ_FRAMEBUFFER','DRAW_FRAMEBUFFER','FRAMEBUFFER','RENDERBUFFER_BINDING','RENDERBUFFER','CURRENT_PROGRAM','VERTEX_ARRAY_BINDING','ARRAY_BUFFER_BINDING','ARRAY_BUFFER','VIEWPORT','SCISSOR_BOX','DEPTH_CLEAR_VALUE','COLOR_WRITEMASK','DEPTH_WRITEMASK','DEPTH_FUNC','DEPTH_RANGE','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','BLEND_EQUATION_RGB','BLEND_EQUATION_ALPHA','CULL_FACE_MODE','FRONT_FACE','DEPTH_TEST','BLEND','CULL_FACE','SCISSOR_TEST','STENCIL_TEST','POLYGON_OFFSET_FILL','TEXTURE_MIN_FILTER','TEXTURE_MAG_FILTER','TEXTURE_WRAP_S','TEXTURE_WRAP_T','TEXTURE_COMPARE_MODE','NEAREST','CLAMP_TO_EDGE','DEPTH_COMPONENT24','DEPTH_COMPONENT','UNSIGNED_INT','DEPTH_ATTACHMENT','FRAMEBUFFER_COMPLETE','MAX_TEXTURE_SIZE','MAX_COMBINED_TEXTURE_IMAGE_UNITS','LEQUAL','DEPTH_BUFFER_BIT','NONE','SYNC_GPU_COMMANDS_COMPLETE','ALREADY_SIGNALED','CONDITION_SATISFIED','WAIT_FAILED','TIMEOUT_EXPIRED'];
 let id=0x9000,active=g.TEXTURE0,next=1,task=0;for(const name of names)g[name]=id++;
 const values=new Map([[g.VIEWPORT,[0,0,800,600]],[g.SCISSOR_BOX,[0,0,800,600]],[g.COLOR_WRITEMASK,[true,true,true,true]],[g.DEPTH_RANGE,[0,1]],[g.MAX_TEXTURE_SIZE,4096],[g.MAX_COMBINED_TEXTURE_IMAGE_UNITS,32],[g.DEPTH_WRITEMASK,true],[g.DEPTH_CLEAR_VALUE,1]]);
 const textures=new Map(),samplers=new Map(),enabled=new Set(),allocations=[],deleted=[];let read=null,draw=null;
 const put=(key,value)=>values.set(key,value);
 Object.assign(g,{allocations,deleted,
  getParameter(p){if(p===g.ACTIVE_TEXTURE)return active;if(p===g.TEXTURE_BINDING_2D)return textures.get(active)??null;if(p===g.SAMPLER_BINDING)return samplers.get(active-g.TEXTURE0)??null;if(p===g.READ_FRAMEBUFFER_BINDING)return read;if(p===g.DRAW_FRAMEBUFFER_BINDING)return draw;const v=values.get(p);return Array.isArray(v)?v.slice():v??null;},
  activeTexture(unit){active=unit;},bindTexture(_t,t){textures.set(active,t);},bindSampler(unit,s){samplers.set(unit,s);},
  bindFramebuffer(target,f){if(target!==g.DRAW_FRAMEBUFFER)read=f;if(target!==g.READ_FRAMEBUFFER)draw=f;},bindRenderbuffer(_t,v){put(g.RENDERBUFFER_BINDING,v);},useProgram(p){put(g.CURRENT_PROGRAM,p);},bindVertexArray(v){put(g.VERTEX_ARRAY_BINDING,v);},bindBuffer(_t,b){put(g.ARRAY_BUFFER_BINDING,b);},
  viewport(...v){put(g.VIEWPORT,v);},scissor(...v){put(g.SCISSOR_BOX,v);},clearDepth(v){put(g.DEPTH_CLEAR_VALUE,v);},colorMask(...v){put(g.COLOR_WRITEMASK,v);},depthMask(v){put(g.DEPTH_WRITEMASK,v);},depthFunc(v){put(g.DEPTH_FUNC,v);},depthRange(...v){put(g.DEPTH_RANGE,v);},
  blendFuncSeparate(){},blendEquationSeparate(){},cullFace(v){put(g.CULL_FACE_MODE,v);},frontFace(v){put(g.FRONT_FACE,v);},isEnabled(cap){return enabled.has(cap);},enable(cap){enabled.add(cap);},disable(cap){enabled.delete(cap);},
  createTexture(){return{kind:'texture',id:next++};},createFramebuffer(){return{kind:'fbo',id:next++};},
  // Record whether the caller's state was already restored when a target is deleted.
  deleteTexture(o){deleted.push({object:o,boundAnywhere:[...textures.values()].includes(o),draw});},deleteFramebuffer(o){deleted.push({object:o,boundAnywhere:read===o||draw===o,draw});},
  texParameteri(){},texImage2D(_t,_l,format,w,h){allocations.push({format,w,h});},framebufferTexture2D(){},drawBuffers(){},readBuffer(){},checkFramebufferStatus(){return g.FRAMEBUFFER_COMPLETE;},clear(){},
  isContextLost(){return false;},createVertexArray(){return{};},nextTask(){task++;},
  fenceSync(){return fence==='unavailable'?null:{task};},flush(){},deleteSync(){},
  clientWaitSync(sync){return fence==='signaled'||(fence==='task'&&sync.task<task)?g.ALREADY_SIGNALED:g.TIMEOUT_EXPIRED;},
 });
 return g;
}
function fixture({limitBytes=64*MiB}={}){
 const gl=fakeGL(),budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,32*MiB)}),store=createChunkResourceStore({budget});bindChunkResourceContext(gl,store);
 let repaints=0,revision='resident/1';
 const coverage={bounds:[.537,.328,0,.5371,.3281,.00001],triangles:180,draws:3,complete:true};
 const source={setCaptureDemand(){},getSolarShadowRevision:()=>revision,getPlanarReflectionRevision:()=>revision,getSolarShadowCoverage:()=>coverage,renderPlanarReflection:()=>({triangles:coverage.triangles,draws:coverage.draws,complete:true})};
 const core=createSceneSolarShadow({requestRepaint(){repaints++;}});core.setSource(source);
 return{gl,budget,store,core,source,coverage,args:{direction:[.5,Math.sqrt(.75),0],enabled:true,quality:'economy'},revision:value=>{revision=value;},
  block:(leave=64)=>budget.reserve({category:'metadata',bytes:budget.stats.availableBytes-leave,precision:'exact',label:'unrelated page claim'}),
  wake:()=>{repaints++;},get repaints(){return repaints;}};
}
const shadowBytes=budget=>budget.stats.categories.shadow?.bytes??0;

// A real, short-lived construction claim for one changed source revision. A
// refusal owns one ledger wake and reports a held preparation, without a timer
// or repeated admission attempt. Once admitted, construction releases its bytes
// before the capture target is acquired. This is independent of quality aliases.
function transientPreparation(budget,requestRepaint){
 let ready=false,stopAvailable,attempts=0,wakes=0;
 const pending=()=>({status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
 return{
  prepare(){
   if(ready)return{status:'ready',ready:1,pending:0,failed:0};
   if(stopAvailable)return pending();
   attempts++;const claim=budget.tryReserve({category:'construction',bytes:128,precision:'exact',label:'changed solar source preparation'});
   if(claim.ok){ready=true;claim.reservation.release();return{status:'ready',ready:1,pending:0,failed:0};}
   stopAvailable=budget.onAvailable(()=>{stopAvailable?.();stopAvailable=undefined;wakes++;requestRepaint();});return pending();
  },
  get attempts(){return attempts;},get wakes(){return wakes;},
  dispose(){stopAvailable?.();stopAvailable=undefined;},
 };
}

test('a latched render failure returns its unpublished depth target only after caller GL state is restored',()=>{
 const f=fixture();
 assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.core.stats.size,solarSize);assert.equal(shadowBytes(f.budget),solarBytes);
 f.revision('resident/2');f.source.renderPlanarReflection=()=>{throw Error('provider failed');};
 assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.core.stats.status,'capture-failed');
 assert.equal(f.core.stats.published,false);assert.equal(f.core.stats.depthTextureObjects,0);assert.equal(f.core.stats.allocatedGPUBytes,0);
 assert.match(f.core.stats.lastError,/provider failed/,'failure diagnostics stay until the next attempt');
 assert.equal(f.gl.deleted.length,2);assert(f.gl.deleted.every(row=>!row.boundAnywhere&&row.draw===null),'deletion follows restoration of the caller framebuffer and sampler units');
 f.store.collectRetired();assert.equal(shadowBytes(f.budget),0,'the retired target leaves the ledger after its completion fence');
 const allocations=f.gl.allocations.length;
 for(let i=0;i<5;i++)assert.equal(f.core.capture(f.gl,f.args),'failed');
 assert.equal(f.gl.allocations.length,allocations,'the failed-key latch neither retries nor reallocates');assert.equal(f.core.stats.failures,1);
 f.source.renderPlanarReflection=()=>({triangles:180,draws:3,complete:true});f.revision('resident/3');
 assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.core.stats.size,solarSize);assert.equal(shadowBytes(f.budget),solarBytes);
 f.core.destroy();f.store.collectRetired();assert.equal(shadowBytes(f.budget),0);
});

test('incomplete coverage after a published capture returns the old target instead of keeping an unused solar role',()=>{
 const f=fixture();
 assert.equal(f.core.capture(f.gl,f.args),'ready');
 f.revision('resident/streaming');f.coverage.complete=false;
 assert.equal(f.core.capture(f.gl,f.args),'failed');assert.equal(f.core.stats.status,'incomplete-coverage');
 assert.equal(f.core.stats.depthTextureObjects,0);assert.equal(f.gl.deleted.length,2);
 f.store.collectRetired();assert.equal(shadowBytes(f.budget),0);
 f.revision('resident/complete');f.coverage.complete=true;
 assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.core.stats.published,true);
 f.core.destroy();
});

test('a changed source held on real preparation capacity returns its unpublished economy target, then wakes and publishes',()=>{
 const f=fixture({limitBytes:2*solarBytes}),preparation=transientPreparation(f.budget,f.wake);let blocker;
 try{
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(shadowBytes(f.budget),solarBytes);
  blocker=f.block();assert.equal(f.budget.stats.availableBytes,64,'128 preparation bytes cannot fit alongside this target');
  f.source.prepareSolarShadow=preparation.prepare;f.revision('resident/preparation-capacity');const listeners=f.budget.stats.availabilityListeners;
  assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.status,'preparing');assert.equal(f.core.stats.preparationWaitingForBudget,true);
  assert.equal(f.budget.stats.lastPressure.additionalBytes,128);assert(f.budget.stats.lastPressure.required>f.budget.stats.limitBytes);
  assert.equal(f.core.stats.depthTextureObjects,0,'an unpublished target is not held while its preparation waits');assert.equal(f.gl.deleted.length,2);
  assert.equal(shadowBytes(f.budget),solarBytes,'the old target remains charged until its fence is collected');assert.equal(f.budget.stats.retiringBytes,solarBytes);
  const pressure=f.budget.stats.pressureEvents;for(let i=0;i<5;i++)assert.equal(f.core.capture(f.gl,f.args),'pending');
  assert.equal(preparation.attempts,1,'a held wake prevents repeated admission attempts');assert.equal(f.budget.stats.pressureEvents,pressure);
  assert.equal(f.budget.stats.availabilityListeners,listeners+1);assert.equal(f.repaints,0);
  f.store.collectRetired();
  assert.equal(f.repaints,1,'the retired target wakes its waiting preparation once');assert.equal(preparation.wakes,1);assert.equal(shadowBytes(f.budget),0);
  assert.equal(f.budget.stats.availabilityListeners,listeners);
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(preparation.attempts,2);assert.equal(f.core.stats.size,solarSize);assert.equal(shadowBytes(f.budget),solarBytes);
  assert.equal(f.core.stats.published,true);assert.equal(f.budget.stats.retiringBytes,0);assert.equal(f.gl.allocations.length,2,'one original target and one replacement');
  assert(f.budget.stats.bytes<=2*solarBytes);
 }finally{preparation.dispose();blocker?.release();f.core.destroy();f.store.collectRetired();f.store.destroy();}
});

test('a budget wait raised after the matching-size target was allocated keeps that target for the retry',()=>{
 const f=fixture({limitBytes:2*solarBytes});let blocker,attempts=0;
 try{
  assert.equal(f.core.capture(f.gl,f.args),'ready');blocker=f.block();f.revision('resident/budget');
  f.source.renderPlanarReflection=()=>{attempts++;const claim=f.budget.reserve({category:'construction',bytes:128,precision:'exact',label:'solar caster draw state'});claim.release();return{triangles:180,draws:3,complete:true};};
  const listeners=f.budget.stats.availabilityListeners;
  assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.status,'resource-budget-pending');
  assert.equal(f.budget.stats.lastPressure.additionalBytes,128);assert(f.budget.stats.lastPressure.required>f.budget.stats.limitBytes);
  assert.equal(f.core.stats.depthTextureObjects,1);assert.equal(f.core.stats.size,solarSize);assert.equal(f.gl.deleted.length,0);assert.equal(f.core.needsFrame,false);
  const pressure=f.budget.stats.pressureEvents;for(let i=0;i<5;i++)assert.equal(f.core.capture(f.gl,f.args),'pending');
  assert.equal(attempts,1);assert.equal(f.budget.stats.pressureEvents,pressure);assert.equal(f.budget.stats.availabilityListeners,listeners+1);assert.equal(f.repaints,0);
  blocker.release();assert.equal(f.repaints,1);assert.equal(f.budget.stats.availabilityListeners,listeners);
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(attempts,2);assert.equal(f.gl.allocations.length,1,'the same-size target is reused');assert.equal(shadowBytes(f.budget),solarBytes);
  f.core.destroy();assert.equal(f.gl.deleted.length,2);
 }finally{blocker?.release();f.core.destroy();f.store.collectRetired();f.store.destroy();}
});

test('a changed revision replaces a real preparation budget wake while retaining the fixed-size target',()=>{
 const f=fixture({limitBytes:2*solarBytes});let blocker,attempts=0;
 try{
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.core.stats.size,solarSize);blocker=f.block();
  f.source.prepareSolarShadow=()=>{attempts++;const claim=f.budget.reserve({category:'construction',bytes:128,precision:'exact',label:'solar source preparation'});claim.release();return{status:'ready',ready:1,pending:0,failed:0};};
  f.revision('resident/prepare-wait');const listeners=f.budget.stats.availabilityListeners;
  assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.status,'resource-budget-pending');
  assert.equal(f.core.stats.depthTextureObjects,1,'the same-size target stays for the retry');assert.equal(f.gl.deleted.length,0);
  assert.equal(f.core.needsFrame,false,'without an own retirement the wait sleeps on the availability hint');
  assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(attempts,1,'the waiting key makes no repeated preparation attempt');
  f.revision('resident/prepare-wait/2');assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(attempts,2,'a real content revision supersedes the old wait');
  assert.equal(f.budget.stats.availabilityListeners,listeners+1,'the superseded subscription is replaced, not accumulated');
  assert.equal(f.core.stats.depthTextureObjects,1);assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.retiringBytes,0);assert.equal(f.core.needsFrame,false);
  const pressure=f.budget.stats.pressureEvents;for(let i=0;i<4;i++)assert.equal(f.core.capture(f.gl,f.args),'pending');
  assert.equal(attempts,2);assert.equal(f.budget.stats.pressureEvents,pressure);assert.equal(f.repaints,0);
  blocker.release();assert.equal(f.repaints,1,'only the replacement wait wakes');assert.equal(f.budget.stats.availabilityListeners,listeners);
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(attempts,3);assert.equal(f.core.stats.size,solarSize);assert.equal(f.gl.allocations.length,1);assert.equal(f.core.stats.published,true);
 }finally{blocker?.release();f.core.destroy();f.store.collectRetired();f.store.destroy();}
});

test('ordinary pending preparation keeps the economy target; a real held ledger preparation returns it',()=>{
 const f=fixture({limitBytes:2*solarBytes}),preparation=transientPreparation(f.budget,f.wake);let blocker;
 try{
  assert.equal(f.core.capture(f.gl,f.args),'ready');
  f.source.prepareSolarShadow=()=>({status:'pending',ready:0,pending:1,failed:0});f.revision('resident/new-depth-program');
  for(let i=0;i<3;i++){
   assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.status,'preparing');
   assert.equal(f.core.stats.depthTextureObjects,1,'ordinary pending reuses its same-size target');assert.equal(f.gl.deleted.length,0);assert.equal(f.core.needsFrame,true);
  }
  blocker=f.block();f.source.prepareSolarShadow=preparation.prepare;f.revision('resident/held-depth-program');
  assert.equal(f.core.capture(f.gl,f.args),'pending');assert.equal(f.core.stats.status,'preparing');assert.equal(f.core.stats.preparationWaitingForBudget,true);
  assert.equal(f.core.stats.depthTextureObjects,0,'the same target is returned when its preparation holds a ledger wake');assert.equal(f.gl.deleted.length,2);assert.equal(f.core.needsFrame,true);
  assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.retiringBytes,solarBytes);
  f.store.collectRetired();assert.equal(shadowBytes(f.budget),0);assert.equal(preparation.wakes,1);
  assert.equal(f.core.capture(f.gl,f.args),'ready');assert.equal(f.core.stats.size,solarSize);assert.equal(f.core.stats.published,true);
  assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.retiringBytes,0);assert.equal(f.gl.allocations.length,2);
 }finally{preparation.dispose();blocker?.release();f.core.destroy();f.store.collectRetired();f.store.destroy();}
});

// The real capture layer on a fake map. A frame runs only when something asked
// for one, each in a new task: custom prerender captures, then painted-map's
// 'render' listener collects retirements. Nothing else renders an idle map.
function layerFixture({limitBytes,fence='task',hold=0}){
 const gl=fakeGL({fence}),budget=createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,8*MiB)}),store=createChunkResourceStore({budget});bindChunkResourceContext(gl,store);
 const held=hold?budget.reserve({category:'metadata',bytes:hold,precision:'exact',label:'unrelated page claim'}):undefined;
 const coverage={bounds:[.537,.328,0,.5371,.3281,.00001],triangles:180,draws:3,complete:true};
 let revision='resident/idle';const source={setCaptureDemand(){},getSolarShadowRevision:()=>revision,getPlanarReflectionRevision:()=>revision,getSolarShadowCoverage:()=>coverage,renderPlanarReflection:()=>({triangles:180,draws:3,complete:true})};
 const layers=new Map();let repaint=false,repaints=0,peak=budget.stats.bytes,shadowPeak=0;
 const map={isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer(layer){layers.set(layer.id,layer);layer.onAdd?.();},removeLayer(id){layers.get(id)?.onRemove?.();layers.delete(id);},on(){},off(){},triggerRepaint(){repaint=true;repaints++;}};
 const initial={instantISO:'2026-06-21T12:00:00+02:00',sunlight:true,shadows:true,motion:true,quality:'economy'},light=sceneSolarLight(13.4,52.5,initial.instantISO);
 const owner=installSceneSolarShadowLayer({map,source,initial,solarLight:()=>light,mobile:false,available:()=>true});
 const note=()=>{peak=Math.max(peak,budget.stats.bytes);shadowPeak=Math.max(shadowPeak,shadowBytes(budget));};
 function frames(limit=64){let count=0;while(repaint&&count<limit){repaint=false;count++;gl.nextTask();owner.customLayer?.prerender(gl);note();store.collectRetired();note();}return count;}
 return{gl,budget,store,owner,source,held,frames,invalidate(value){revision=value;map.triggerRepaint();},wake:()=>map.triggerRepaint(),
  get repaintRequested(){return repaint;},get repaints(){return repaints;},get peak(){return peak;},get shadowPeak(){return shadowPeak;},get core(){return owner.stats.core;},
  dispose(){owner.destroy();held?.release();gl.nextTask();store.collectRetired();store.destroy();}};
}

test('on an idle map a real held preparation requests the frames that collect its retired economy target, then publishes and goes idle',()=>{
 // WebGL2 fences never pass in their creating task. Only 64 bytes are free;
 // changed-source preparation needs 128. Returning the old 1 MiB target makes
 // room at a later frame boundary, without any camera or quality change.
 const f=layerFixture({limitBytes:2*solarBytes,hold:solarBytes-64}),preparation=transientPreparation(f.budget,f.wake);
 try{
  f.owner.setMode(true);assert.equal(f.frames(),1);
  assert.equal(f.core.status,'ready');assert.equal(f.core.size,solarSize);assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.availableBytes,64);
  f.source.prepareSolarShadow=preparation.prepare;f.invalidate('resident/idle/2');const count=f.frames();
  assert.equal(f.owner.stats.faulted,false,f.owner.stats.lastError);
  assert.equal(f.core.status,'ready','no unrelated frame is needed to finish the wait');assert.equal(f.core.size,solarSize);assert.equal(f.core.published,true);
  assert(count>=2&&count<=4,'frames until the retired fence passes: '+count);assert.equal(preparation.attempts,2);assert.equal(preparation.wakes,1);
  assert.equal(f.repaintRequested,false,'a published capture stops requesting frames');assert.equal(f.frames(),0);
  assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.retiringBytes,0);assert.equal(f.budget.stats.availabilityListeners,0);
  assert.equal(f.shadowPeak,solarBytes,'the replacement never overlaps a charged old target');assert(f.peak<=2*solarBytes);
  assert.equal(f.gl.allocations.length,2);f.owner.destroy();f.gl.nextTask();f.store.collectRetired();assert.equal(shadowBytes(f.budget),0);
 }finally{preparation.dispose();f.dispose();}
});

test('a retired fence that never completes bounds the follow-up frames; the availability hint still finishes the wait',()=>{
 for(const fence of ['never','unavailable']){
  const f=layerFixture({limitBytes:2*solarBytes,fence,hold:solarBytes-64}),preparation=transientPreparation(f.budget,f.wake);
  try{
   f.owner.setMode(true);f.frames();assert.equal(f.core.status,'ready');assert.equal(f.budget.stats.availableBytes,64);
   f.source.prepareSolarShadow=preparation.prepare;f.invalidate('resident/idle/2');const allocations=f.gl.allocations.length,count=f.frames(200);
   assert.equal(f.owner.stats.faulted,false,f.owner.stats.lastError);
   assert.equal(f.core.status,'preparing');assert.equal(f.core.preparationWaitingForBudget,true);assert.equal(f.core.depthTextureObjects,0);
   assert(count>1,fence+': the wait asked for frames that could collect its retirement');assert(count<=32,fence+': follow-up frames are bounded, got '+count);
   assert.equal(f.repaintRequested,false,fence+': the idle map stops rendering');assert.equal(f.gl.allocations.length,allocations,'no allocation is attempted while waiting');
   assert.equal(shadowBytes(f.budget),solarBytes,'the incomplete fence keeps the old target charged');assert.equal(f.budget.stats.retiringBytes,solarBytes);
   const pressure=f.budget.stats.pressureEvents,listeners=f.budget.stats.availabilityListeners;
   assert.equal(listeners,1);assert.equal(f.frames(),0);assert.equal(f.budget.stats.pressureEvents,pressure);assert.equal(preparation.attempts,1);
   // Releasing a real unrelated claim admits preparation and a replacement;
   // both 1 MiB targets now fit even though the old fence still has not passed.
   const repaints=f.repaints;f.held.release();assert.equal(f.repaintRequested,true,'the availability hint requests the retry frame');assert.equal(f.repaints,repaints+1);
   f.frames();assert.equal(preparation.wakes,1);assert.equal(preparation.attempts,2);assert.equal(f.core.status,'ready');assert.equal(f.core.size,solarSize);
   assert.equal(f.budget.stats.availabilityListeners,0);assert.equal(shadowBytes(f.budget),2*solarBytes);assert.equal(f.budget.stats.retiringBytes,solarBytes);
   assert.equal(f.shadowPeak,2*solarBytes);assert(f.peak<=2*solarBytes);assert.equal(f.repaintRequested,false);
  }finally{preparation.dispose();f.dispose();}
 }
});

test('a budget wait without an own retirement requests no frames on an idle map',()=>{
 const f=layerFixture({limitBytes:2*solarBytes,hold:solarBytes+64});
 try{
  f.owner.setMode(true);assert.equal(f.frames(),1);assert.equal(f.core.status,'resource-budget-pending');
  assert.equal(f.budget.stats.lastPressure.additionalBytes,solarBytes);assert(f.budget.stats.lastPressure.required>f.budget.stats.limitBytes);
  assert.equal(f.core.depthTextureObjects,0);assert.equal(f.gl.allocations.length,0);assert.equal(f.budget.stats.retiringBytes,0);
  assert.equal(f.repaintRequested,false,'only the availability hint wakes this wait');
  const pressure=f.budget.stats.pressureEvents,listeners=f.budget.stats.availabilityListeners,repaints=f.repaints;
  assert.equal(listeners,1);for(let i=0;i<5;i++)assert.equal(f.frames(),0);
  assert.equal(f.budget.stats.pressureEvents,pressure);assert.equal(f.budget.stats.availabilityListeners,listeners);
  f.held.release();assert.equal(f.repaints,repaints+1);assert.equal(f.frames(),1);assert.equal(f.core.status,'ready');assert.equal(f.core.size,solarSize);
  assert.equal(shadowBytes(f.budget),solarBytes);assert.equal(f.budget.stats.availabilityListeners,0);assert.equal(f.repaintRequested,false);assert(f.peak<=2*solarBytes);
 }finally{f.dispose();}
});
