import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {createDelegatedFixture,declaration,evaluate,method,rendererText as text,safety,DEFAULT_HELPER} from './support/fixtures-delegated-renderer.mjs';
// delegated500's own budget waits, driven through the renderer's real declarations
// (support/fixtures-delegated-renderer.mjs: production program owner, context
// scheduler, page ResourceBudget/chunk store, prepared-source workspace and capture
// runtime). Fixture inputs: the synthetic paint, one published chunk, a fake WebGL2
// context and, where a case says so, an explicit allowance on every colour recipe
// (production recipes carry none and are charged at the 256 KiB policy estimate).
// setPageHidden/setEnabled run as the renderer's own method text against the same
// state; their peripheral stages are the fixture's inert stand-ins.
// Not covered: the scene solar shadow owner's own frame policy (it reads
// budgetWaiting through solarShadowPreparationNeedsFrame), the page store frame
// boundary of a real map (collectRetired is called directly here) and any GPU.
const GLSL=`vec3 kept(vec3 base,float family){return base*.3;}
vec3 cut(vec3 base,float family){if(base.r<0.)discard;return base*.4;}
vec3 cutAgain(vec3 base,float family){if(base.g<0.)discard;return base*.5;}
vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.||family==1006.||family==1008.)return kept(base,family);if(family==1004.)return cut(base,family);if(family==1005.)return cutAgain(base,family);return base;}
vec3 progressiveFeatureDispatchCityLegacy500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatch(base,p,normal,frame,family);}
vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatchCityLegacy500(base,p,normal,frame,family);}
vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1000.)return progressiveFeatureDispatchCity(base,p,normal,frame,floor(family+.5));return base;}`;
const MiB=1024*1024,INSIDE=[-.1,0,-.1,.1,.1,.1],OUTSIDE=[5,0,5,6,1,6],key=family=>'current-family:'+family,identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// The shared R8 mask, page store/ledger and solar frame policy, bundled once.
let shared;
function modules(){
 shared??=(async()=>{
  const entry=`export {createProjectedShadowMask} from './projected-shadow-mask';export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';export {solarShadowPreparationNeedsFrame} from './solar-shadow-preparation';export {checkedSceneEnvironment} from './scene-environment-state';export {sceneSolarLight} from './scene-solar-light';`;
  const built=await build({stdin:{contents:entry,resolveDir:path.resolve(safety,'../../../safety'),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',target:'es2022'});
  return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 })();
 return shared;
}

async function city({families,visible,city:name='hannover',allowance}){
 const fixture=await createDelegatedFixture({city:name,paint:GLSL}),{S}=fixture,shown=new Set(visible);
 // Charged programs: each colour recipe also asks for a linked-program policy
 // allowance, which its program then holds until the owner deletes it.
 if(allowance){const programBudget=S.programSources.programBudget;S.programSources.programBudget=(...args)=>({...programBudget(...args),submittedAllowanceBytes:allowance});}
 const comps=families.map((family,i)=>({objectId:'osm/way/'+(100+i),partId:'p'+i,start:i*3,end:i*3+3,firstVertex:i,lastVertex:i+1,family,box:shown.has(family)?INSIDE:OUTSIDE}));
 fixture.setScene(comps,comps.map(c=>({firstIndex:c.start,indexCount:3,key:key(c.family)})));
 S.program=fixture.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 const builds=[];fixture.driver.onBuild=origin=>builds.push(origin.family);
 // One building-layer frame, then one context scheduler turn.
 const frame=()=>{S.frameNo++;S.repaint=false;S.phase='render';S.render(fixture.gl,{defaultProjectionData:{mainMatrix:identity()}});S.phase='preparation';fixture.advancePreparation(true);S.phase='idle';return S.repaint;};
 const settle=(limit=60)=>{for(let i=0;i<limit;i++)if(!frame()&&!fixture.turns.queue.length)return;assert.fail('main programs did not settle');};
 // The synthetic view moves boxes relative to the identity camera. Run the
 // production move invalidation as well: real camera changes advance the view
 // revision, whereas mutating boxes under an unchanged publication is not a
 // supported input to the geometric visibility cache.
 const move=evaluate(declaration('move'),S);
 const show=list=>{shown.clear();for(const family of list)shown.add(family);for(const c of comps)c.box=shown.has(c.family)?INSIDE:OUTSIDE;move();};
 const store=fixture.m.fixtureChunks.getChunkResourceStoreForContext(fixture.gl);
 // Fill the page ledger up to `free` available bytes.
 const block=free=>fixture.budget.reserve({category:'construction',bytes:fixture.budget.stats.availableBytes-free,precision:'exact',label:'fixture ledger pressure'});
 return{...fixture,S,frame,settle,show,store,block,builds,programOf:family=>S.partitionPrograms.get(key(family))};
}

test('a resident family plan keeps invisible colour programs in its last-used set: panning back draws them without a rebuild or a release',async()=>{
 const c=await city({families:[0,1003,1006,1008],visible:[0,1003,1006,1008]});c.settle();
 const programs=[1003,1006,1008].map(c.programOf);assert(programs.every(Boolean),'every visible family has its own colour program');
 const deleted=c.driver.deleted.length,built=c.builds.length,granted=c.owner.stats.shared.releasedReferences;
 for(const view of [[0],[1006],[0,1003],[1008],[0]]){
  c.show(view);c.frame();
  assert.deepEqual([1003,1006,1008].map(c.programOf),programs,'the invisible programs stay resident: '+JSON.stringify(view));
 }
 c.show([0,1003,1006,1008]);c.driver.draws.length=0;c.frame();
 assert.equal(c.builds.length,built,'panning back rebuilds nothing');assert.equal(c.driver.deleted.length,deleted,'no colour program was released while it was out of view');
 assert.equal(c.owner.stats.shared.releasedReferences,granted,'no colour grant was returned to the owner');
 assert.deepEqual(c.driver.draws.slice(-3).map(row=>row.program),programs,'each run draws with its own program, not the base fallback');
 assert.equal(c.S.currentProgramEvictions,0,'a set below the 64-entry bound evicts nothing');
});

test('an own admission the ledger refuses first trims the least recently used invisible charged program, never a visible one, and its retired reservation wakes the wait',async()=>{
 const allowance=64*MiB,c=await city({families:[0,1003,1006,1008,1004],visible:[0,1003,1006,1008],allowance});c.settle();
 assert.equal(c.owner.stats.budget.heldDriverAllowancePrograms,4,'base and three family programs hold their allowance');
 c.show([0]);c.frame();assert.equal(c.S.partitionPrograms.size,3,'out of view, all three stay in the last-used set');
 const trimmed=c.programOf(1006),kept=[c.programOf(1003),c.programOf(1008)];
 // Half an allowance is free: the next program needs one more than that.
 const blocker=c.block(allowance/2);
 try{
  // 1003 (the oldest entry) becomes visible again with 1004, whose compile is refused.
  c.show([1003,1004]);c.frame();
  assert.equal(c.owner.waitingForBudget,true,'the refused demand waits on the ledger');
  assert.match(c.owner.stats.budget.lastPressure.label,/colour:1004/);
  assert(c.driver.deleted.includes(trimmed),'the least recently used invisible program is trimmed');
  assert(kept.every(p=>!c.driver.deleted.includes(p)),'a visible program and the next entry are kept');
  assert.deepEqual([...c.S.partitionPrograms.keys()].sort(),[key(1003),key(1008)]);assert.equal(c.S.currentProgramEvictions,1,'one shortfall needs one charged program');
  assert.equal(c.budget.stats.retiringBytes,allowance,'the trimmed reservation retires; it is not refunded twice or early');
  // No waiter is woken before the retired reservation is collected.
  c.S.repaint=false;c.frame();assert.equal(c.owner.waitingForBudget,true);assert.equal(c.S.currentProgramEvictions,1,'a refusal already waiting trims nothing more');
  // The fake context has no fence: the page store releases after its logical grace.
  await sleep(150);c.S.repaint=false;c.store.collectRetired();
  assert.equal(c.owner.waitingForBudget,false,'the collected reservation is the availability that wakes the owner');assert.equal(c.S.repaint,true,'the wake repaints');
  c.settle();
  assert(c.programOf(1004),'the refused visible program is admitted after the wake');assert.equal(c.S.currentProgramEvictions,1);
  assert(kept.every(p=>!c.driver.deleted.includes(p)));
 }finally{blocker.release();}
});

// DECISIONS 2026-11-02 03:25 replaced the former "production colour programs are
// uncharged" contract: a recipe without an explicit allowance is still charged at
// the linked-program policy estimate (256 KiB). The production recipes are used
// as they are (no allowance override), so trimming them now does admit work.
test('production colour programs hold the policy estimate: a refusal trims the least recently used invisible one, never a visible one, and its retired estimate wakes the wait',async()=>{
 // 1004's whole admission (its source bound, workspace and one estimate) read from an identical
 // fixture whose ledger is full; the case below leaves half an estimate less than that free.
 const probe=await city({families:[0,1003,1006,1004],visible:[0,1003,1006]});probe.settle();probe.show([0]);probe.frame();
 const full=probe.block(0);let need;
 try{probe.show([0,1003,1004]);probe.frame();assert.equal(probe.owner.waitingForBudget,true);assert.match(probe.owner.stats.budget.lastPressure.label,/colour:1004/);need=probe.owner.stats.budget.lastPressure.additionalBytes;}finally{full.release();}
 const c=await city({families:[0,1003,1006,1004],visible:[0,1003,1006]});c.settle();
 const P=c.owner.stats.budget.policyAllowanceBytes;assert.equal(P,256*1024);assert(need>P,'1004 asks for its source bound plus one estimate');
 assert.equal(c.owner.stats.budget.heldDriverAllowancePrograms,3,'base and two family programs hold the policy estimate');
 assert.equal(c.owner.stats.budget.heldDriverAllowanceBytes,3*P,'linked production colour programs hold the policy estimate on the ledger');
 c.show([0]);c.frame();assert.equal(c.S.partitionPrograms.size,2,'out of view, both stay in the last-used set');
 const trimmed=c.programOf(1006),kept=c.programOf(1003),base=S=>S.program;assert(trimmed&&kept);
 // Half an estimate less than 1004's admission is free: trimming one invisible program covers the shortfall.
 const blocker=c.block(need-P/2);
 try{
  // 1003 becomes visible again with 1004, whose compile is refused; 1006 is the least recently used invisible entry.
  c.show([0,1003,1004]);c.frame();
  assert.equal(c.owner.waitingForBudget,true,'the refused demand waits on the ledger');
  assert.match(c.owner.stats.budget.lastPressure.label,/colour:1004/);
  assert(c.driver.deleted.includes(trimmed),'the least recently used invisible program is trimmed');
  assert(!c.driver.deleted.includes(kept)&&!c.driver.deleted.includes(base(c.S)),'visible programs are kept');
  assert.deepEqual([...c.S.partitionPrograms.keys()],[key(1003)]);assert.equal(c.S.currentProgramEvictions,1,'one shortfall needs one charged program');
  assert.equal(c.budget.stats.retiringBytes,P,'the trimmed estimate retires; it is not refunded twice or early');
  // No waiter is woken before the retired reservation is collected.
  c.S.repaint=false;c.frame();assert.equal(c.owner.waitingForBudget,true);assert.equal(c.S.currentProgramEvictions,1,'a refusal already waiting trims nothing more');
  await sleep(150);c.S.repaint=false;c.store.collectRetired();
  assert.equal(c.owner.waitingForBudget,false,'the collected reservation is the availability that wakes the owner');assert.equal(c.S.repaint,true,'the wake repaints');
  c.settle();
  assert(c.programOf(1004),'the refused visible program is admitted after the wake');assert.equal(c.S.currentProgramEvictions,1);
  assert(!c.driver.deleted.includes(kept));
 }finally{blocker.release();}
});

test('own casters behind a held ledger wait report budgetWaiting for every pending demand, request no frame and take no per-draw revision step until the wake',async()=>{
 const c=await city({families:[0,1004,1005],visible:[0]}),{S}=c,render=()=>{S.frameNo++;S.phase='render';S.render(c.gl,{defaultProjectionData:{mainMatrix:identity()}});S.phase='idle';};
 S.setCaptureDemand({kind:'solar',token:'budget-wait',active:true});
 render();c.advancePreparation();
 // The first visit only submits the classification: an ordinary pending that asks for a frame.
 S.repaint=false;let result=S.prepareSolarShadow();assert.equal(result.status,'pending');assert.equal(result.budgetWaiting,undefined);assert.equal(S.repaint,true);
 c.advancePreparation();render();c.advancePreparation();
 const blocker=c.block(1024);
 try{
  S.repaint=false;result=S.prepareSolarShadow();
  assert.equal(result.status,'pending');assert.equal(c.owner.waitingForBudget,true);
  assert.equal(result.budgetWaiting,result.pending,'both missing casters and their capture plan wait on the one owner wake: '+JSON.stringify(result));
  assert.equal((await modules()).solarShadowPreparationNeedsFrame(result),false,'the capture needs no polling frame');
  assert.equal(S.repaint,false,'the renderer asks for no frame either');assert.equal(S.casterRetry,true,'the casters still need a retry');
  const revision=S.solarDepthRevision;render();assert.equal(S.solarDepthRevision,revision,'the draw takes no revision step for a held wait');assert.equal(S.casterRetry,false);
  S.repaint=false;result=S.prepareSolarShadow();assert.equal(result.budgetWaiting,result.pending,'a later visit inside the same wait is answered without a frame');assert.equal(S.repaint,false);
 }finally{blocker.release();}
 assert.equal(c.owner.waitingForBudget,false,'the ledger wake ends the wait');assert.equal(S.repaint,true,'and repaints');
 render();S.repaint=false;result=S.prepareSolarShadow();assert.equal(result.status,'pending');assert.equal(result.budgetWaiting,undefined,'an admitted, queued compile is an ordinary pending');assert.equal(S.repaint,true);
 const revision=S.solarDepthRevision;render();assert.equal(S.solarDepthRevision,revision+1,'an ordinary pending keeps the per-draw revision step');
 for(let i=0;i<40&&result.status==='pending';i++){c.advancePreparation();render();result=S.prepareSolarShadow();}
 assert.equal(result.status,'ready');assert(c.programOf(1004)&&c.programOf(1005));
});

test('Berlin current capture counts a held ledger wait of its full-colour program as budgetWaiting',async()=>{
 const c=await city({families:[0,1004],visible:[0,1004],city:'berlin'}),{S}=c;c.settle();
 S.setCaptureDemand({kind:'solar',token:'berlin-budget-wait',active:true});
 const blocker=c.block(1024);
 try{
  S.repaint=false;const result=S.prepareSolarShadow();
  assert.equal(result.status,'pending');assert.equal(c.owner.waitingForBudget,true);assert.equal(result.budgetWaiting,result.pending,JSON.stringify(result));
 }finally{blocker.release();}
 let result=S.prepareSolarShadow();for(let i=0;i<40&&result.status==='pending';i++){c.advancePreparation();result=S.prepareSolarShadow();}
 assert.equal(result.status,'ready');assert(S.partitionPrograms.get(S.BERLIN_FULL_CURRENT_CAPTURE_KEY));
});

// The renderer's projected shadow mask on a minimal WebGL2 mock, with the
// renderer's own creation text and render statement.
function maskGL(){
 const names='VIEWPORT DRAW_FRAMEBUFFER_BINDING CURRENT_PROGRAM VERTEX_ARRAY_BINDING ACTIVE_TEXTURE DEPTH_WRITEMASK DEPTH_FUNC DEPTH_RANGE STENCIL_WRITEMASK STENCIL_BACK_WRITEMASK BLEND_SRC_RGB BLEND_DST_RGB BLEND_SRC_ALPHA BLEND_DST_ALPHA BLEND_EQUATION_RGB BLEND_EQUATION_ALPHA COLOR_WRITEMASK TEXTURE_BINDING_2D SAMPLER_BINDING MAX_TEXTURE_SIZE DRAW_FRAMEBUFFER TEXTURE_2D TEXTURE0 DEPTH_TEST STENCIL_TEST SCISSOR_TEST CULL_FACE BLEND LEQUAL FUNC_ADD MAX ONE SRC_ALPHA ONE_MINUS_SRC_ALPHA VERTEX_SHADER FRAGMENT_SHADER COMPILE_STATUS LINK_STATUS FRAMEBUFFER_COMPLETE R8 RED UNSIGNED_BYTE TEXTURE_MIN_FILTER TEXTURE_MAG_FILTER TEXTURE_WRAP_S TEXTURE_WRAP_T NEAREST CLAMP_TO_EDGE COLOR_ATTACHMENT0 COLOR TRIANGLES FRONT BACK SYNC_GPU_COMMANDS_COMPLETE ALREADY_SIGNALED CONDITION_SATISFIED TIMEOUT_EXPIRED WAIT_FAILED'.split(' ');
 const gl=Object.fromEntries(names.map((n,i)=>[n,i+1])),values=new Map([[1,[0,0,640,480]]]);let serial=0;
 for(const [name,value]of [['DEPTH_WRITEMASK',true],['DEPTH_FUNC','LEQUAL'],['DEPTH_RANGE',[0,1]],['STENCIL_WRITEMASK',255],['STENCIL_BACK_WRITEMASK',255],['BLEND_SRC_RGB','SRC_ALPHA'],['BLEND_DST_RGB','ONE_MINUS_SRC_ALPHA'],['BLEND_SRC_ALPHA','ONE'],['BLEND_DST_ALPHA','ONE_MINUS_SRC_ALPHA'],['BLEND_EQUATION_RGB','FUNC_ADD'],['BLEND_EQUATION_ALPHA','FUNC_ADD'],['COLOR_WRITEMASK',[true,true,true,true]],['MAX_TEXTURE_SIZE',8192],['ACTIVE_TEXTURE','TEXTURE0']])values.set(gl[name],typeof value==='string'?gl[value]:value);
 const resource=kind=>({id:++serial,kind});
 return Object.assign(gl,{lost:false,storage:[],isContextLost:()=>gl.lost,getParameter:k=>values.get(k)??null,isEnabled:()=>false,enable(){},disable(){},activeTexture:k=>values.set(gl.ACTIVE_TEXTURE,k),bindTexture(){},bindSampler(){},
  createProgram:()=>resource('program'),createShader:()=>resource('shader'),createFramebuffer:()=>resource('framebuffer'),createTexture:()=>resource('texture'),createVertexArray:()=>resource('vao'),isProgram:v=>v?.kind==='program',
  deleteProgram(){},deleteShader(){},deleteFramebuffer(){},deleteTexture(){},deleteVertexArray(){},shaderSource(){},compileShader(){},attachShader(){},detachShader(){},linkProgram(){},getShaderParameter:()=>true,getProgramParameter:()=>true,getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',
  bindFramebuffer(){},texParameteri(){},framebufferTexture2D(){},checkFramebufferStatus:()=>gl.FRAMEBUFFER_COMPLETE,clearBufferfv(){},viewport(){},depthMask(){},depthFunc(){},colorMask(){},stencilMaskSeparate(){},blendEquationSeparate(){},blendFuncSeparate(){},
  useProgram(){},bindVertexArray(){},getUniformLocation:(_p,name)=>name,uniform1i(){},uniform1f(){},uniform2f(){},uniform3fv(){},uniform3f(){},uniform2fv(){},uniformMatrix4fv(){},drawElements(){},drawArrays(){},texImage2D:(...args)=>gl.storage.push(args[3]*args[4]),
  fenceSync:()=>({id:++serial}),flush(){},deleteSync(){},clientWaitSync:()=>gl.ALREADY_SIGNALED});
}
/** The one renderer statement that draws or withdraws the mask in layer.render. */
function shadowStatement(){
 const start=text.indexOf("if(progressiveDiagnostic!=='no-shadow'&&shadowProgram&&shadowUploadedIndexCount&&shadowAlpha>0)"),end=text.indexOf('shadowMask.cancelPending();',start);
 assert(start>=0&&end>start,'the render statement draws the mask or withdraws its pending admission');
 return text.slice(start,end+'shadowMask.cancelPending();'.length);
}

test('the projected shadow mask wakes the map from the ledger and withdraws its pending admission once the layer stops drawing it',async()=>{
 assert(text.includes('const shadowMask=createProjectedShadowMask({requestRepaint:()=>map.triggerRepaint()});'),'the mask is created with the map repaint as its one ledger wake');
 const m=await modules(),topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];
 const budget=m.createResourceBudget({limitBytes:MiB,recentLimitBytes:MiB}),store=m.createChunkResourceStore({budget}),gl=maskGL();m.bindChunkResourceContext(gl,store);
 let repaints=0;const map={triggerRepaint(){repaints++;}},shadowMask=m.createProjectedShadowMask({requestRepaint:()=>map.triggerRepaint()});
 const blocker=budget.reserve({category:'texture',bytes:MiB-100000,precision:'exact'});
 // A frame that draws the mask under pressure leaves one pending admission.
 assert.equal(shadowMask.draw(gl,topDown,.03,()=>{}),false);assert.equal(shadowMask.stats.admission,'pending');assert.equal(budget.stats.availabilityListeners,1);
 const statement=new Function('state',`let {progressiveDiagnostic,shadowProgram,shadowUploadedIndexCount,shadowAlpha,shadowMask,shadowFailure}=state;const drawProjectedShadows=()=>{state.draws++;},releaseShadowGPU=()=>{throw Error('unexpected shadow failure');};${shadowStatement()}`);
 const state={progressiveDiagnostic:'',shadowProgram:{},shadowUploadedIndexCount:3,shadowAlpha:.08,shadowMask,shadowFailure:false,draws:0};
 statement(state);assert.equal(state.draws,1);assert.equal(shadowMask.stats.waiting,true,'a drawn mask keeps waiting for its wake');
 // Shadows switched off (alpha 0): the layer no longer draws the mask.
 statement({...state,shadowAlpha:0});assert.equal(shadowMask.stats.waiting,false);assert.equal(shadowMask.stats.cancellations,1);assert.equal(budget.stats.availabilityListeners,0,'its ledger listener is removed');
 blocker.release();assert.equal(repaints,0,'a withdrawn admission is never woken');
 // Without pressure the wake path repaints once.
 const pressure=budget.reserve({category:'texture',bytes:MiB-100000,precision:'exact'});
 assert.equal(shadowMask.draw(gl,topDown,.03,()=>{}),false);pressure.release();assert.equal(repaints,1,'one ledger wake repaints the map');
 // Every way the layer stops drawing withdraws the pending admission: hidden,
 // disabled, shadows switched off; geometry clears already release the mask.
 const methods=text.slice(text.indexOf('setEnabled(value:boolean)'));
 assert(methods.startsWith('setEnabled(value:boolean){if(!value){if(shadowUploadedIndexCount)shadowMask.cancelPending();'));
 assert(text.includes('setPageHidden(value:boolean){if(value!==pageHidden||value)invalidateMainFrame();if(value){if(shadowUploadedIndexCount)shadowMask.cancelPending();'));
 // Exercise the actual setter against another real pending mask admission.
 // Statements between cancellation and assignment (such as quality handling)
 // must not invalidate the test or hide a lost cancellation.
 const pendingPressure=budget.reserve({category:'texture',bytes:MiB-100000,precision:'exact'});
 assert.equal(shadowMask.draw(gl,topDown,.03,()=>{}),false);assert.equal(budget.stats.availabilityListeners,1);
 const environment={instantISO:'2026-10-25T12:00:00Z',sunlight:true,shadows:true,motion:true,quality:'economy'};
 let setterRepaints=0,prunes=0;
 const controls={checkedSceneEnvironment:m.checkedSceneEnvironment,sceneSolarLight:m.sceneSolarLight,sceneSunOrigin:[8.8,53.08],shadowUploadedIndexCount:3,shadowMask,sceneEnvironment:environment,ownerReducedMotion:false,reducedMotion:false,birth:new Map(),syncFacadeResources(){assert.fail('unchanged economy quality does not resync facade resources');},rememberFinishedBirth(){assert.fail('unchanged motion does not finish a birth');},updateSolarShadowIndices:()=>false,uploadShadow(){assert.fail('unchanged shadow indices do not upload');},pruneProgramPreparation(){prunes++;},map:{triggerRepaint(){setterRepaints++;}}};
 const setSceneEnvironment=evaluate(method('setSceneEnvironment'),controls),cancellations=shadowMask.stats.cancellations;
 setSceneEnvironment(environment);assert.equal(shadowMask.stats.waiting,true,'keeping shadows enabled retains the actual ledger wake');assert.equal(shadowMask.stats.cancellations,cancellations);assert.equal(budget.stats.availabilityListeners,1);
 const withoutShadows={...environment,shadows:false};setSceneEnvironment(withoutShadows);
 assert.deepEqual(controls.sceneEnvironment,m.checkedSceneEnvironment(withoutShadows));assert.equal(shadowMask.stats.waiting,false);assert.equal(shadowMask.stats.cancellations,cancellations+1);assert.equal(budget.stats.availabilityListeners,0,'the real scene setter withdraws the mask listener');assert.equal(prunes,2);assert.equal(setterRepaints,2);
 pendingPressure.release();assert.equal(repaints,1,'the setter-withdrawn admission cannot wake later');
 shadowMask.release();
 assert(declaration('clearShadowGeometry').includes('shadowMask.release();'),'a cleared shadow geometry releases the mask and its wait');
 // The renderer adds no boundary reservation of its own (the manager admits it in ensure).
 assert(!text.includes('solarShadowBoundaryCosts'));
});

test('the public solar revision carries the caster failure latch, not borrowed program availability',async()=>{
 const c=await city({families:[0,1004],visible:[0]}),{S}=c,base=S.getSolarShadowRevision();
 S.casterFailures.set(key(1004),'fixture failure');const failed=S.getSolarShadowRevision();assert.notEqual(failed,base,'a recorded caster failure changes the content revision');
 S.casterFailures.delete(key(1004));assert.equal(S.getSolarShadowRevision(),base,'its retirement restores it');
 S.solarDepthRevision+=5;assert.equal(S.getSolarShadowRevision(),base,'the internal depth revision is not a content input');
});

test('a refused own admission whose oldest idle program returns no bytes (a capture snapshot still borrows it) trims on until the ledger gets the shortfall back, and that return wakes the wait',async()=>{
 const allowance=64*MiB,c=await city({families:[0,1003,1006,1008,1004],visible:[0,1003,1006,1008],allowance});c.settle();
 c.show([0]);c.frame();
 const borrowed=c.programOf(1006),next=c.programOf(1008),visible=c.programOf(1003);
 // The oldest idle entry stays borrowed: releasing the renderer's reference returns
 // nothing to the ledger until that snapshot ends.
 const borrow=c.owner.retainProgram(c.gl,borrowed);
 const blocker=c.block(allowance/2);
 try{
  c.show([1003,1004]);c.frame();
  assert.equal(c.owner.waitingForBudget,true,'the refused demand waits on the ledger');
  assert.deepEqual([...c.S.partitionPrograms.keys()],[key(1003)],'the borrowed and the next idle program leave the last-used set; the visible one stays');
  assert.equal(c.S.currentProgramEvictions,2,'the borrowed release returns nothing, so the trim moves on to the next idle program');
  assert(!c.driver.deleted.includes(borrowed),'a borrowed program is not deleted under its snapshot');
  assert(c.driver.deleted.includes(next)&&!c.driver.deleted.includes(visible));
  assert.equal(c.budget.stats.retiringBytes,allowance,'exactly the next program\'s reservation retires');
  await sleep(150);c.S.repaint=false;c.store.collectRetired();
  assert.equal(c.owner.waitingForBudget,false,'the returned reservation is the availability that wakes the owner');assert.equal(c.S.repaint,true,'the wake repaints');
  c.settle();assert(c.programOf(1004),'the refused visible program is admitted after the wake');
 }finally{blocker.release();}
 const retiring=c.budget.stats.retiringBytes;borrow();
 assert(c.driver.deleted.includes(borrowed),'ending the snapshot deletes the borrowed program');
 assert.equal(c.budget.stats.retiringBytes,retiring+allowance,'and retires its reservation once');
});

test('a missing visible colour program in a held ledger wait gets no polling frame from the draw; the wake repaints and an admitted, queued compile keeps the poll',async()=>{
 const c=await city({families:[0,1003,1004],visible:[0,1003]}),{S}=c;c.settle();
 const blocker=c.block(1024);
 try{
  c.show([0,1003,1004]);
  assert.equal(c.frame(),false,'the held wait of the missing visible program requests no frame');
  assert.equal(c.owner.waitingForBudget,true);assert.equal(S.partitionPending,true,'the program is still missing: readiness and picking keep waiting');
  assert.deepEqual([...S.heldMainWaitKeys],[key(1004)]);
  assert.equal(c.frame(),false,'a later frame inside the same wait polls nothing either');
 }finally{blocker.release();}
 assert.equal(c.owner.waitingForBudget,false,'the released bytes wake the owner');assert.equal(S.repaint,true,'and the wake repaints');
 assert.equal(c.frame(),true,'after the wake the compile is admitted and queued: an ordinary pending keeps the poll');
 c.settle();assert(c.programOf(1004));assert.equal(S.partitionPending,false);
});

test('releasing the GPU while a held ledger wait is registered withdraws that wake and requests the one frame it would have given',async()=>{
 const c=await city({families:[0,1003,1004],visible:[0,1003]}),{S}=c;c.settle();
 const blocker=c.block(1024);
 try{
  c.show([0,1003,1004]);assert.equal(c.frame(),false);assert.equal(c.owner.waitingForBudget,true);
  S.repaint=false;S.releaseGPU();
  assert.equal(c.owner.waitingForBudget,false,'the cancel withdraws the owner wake');
  assert.equal(S.repaint,true,'the renderer requests the frame itself');
 }finally{blocker.release();}
});

test('a paint mode without the partition draw releases the resident idle colour programs at its next preparation; the partition draw compiles them again',async()=>{
 const c=await city({families:[0,1003,1006,1008],visible:[0,1003,1006,1008]}),{S}=c;c.settle();
 const programs=[1003,1006,1008].map(c.programOf),built=c.builds.length;
 S.paintModeValue=1;c.frame();
 assert.equal(S.partitionPrograms.size,0,'nothing would trim the last-used set without the partition draw');
 assert(programs.every(p=>c.driver.deleted.includes(p)),'their programs are deleted');
 S.paintModeValue=2;c.settle();
 assert([1003,1006,1008].every(family=>c.programOf(family)),'the partition draw compiles its programs again');assert.equal(c.builds.length,built+3);
});

test('hiding the page or disabling the renderer keeps only the last partition draw\'s programs; showing the same view again rebuilds none of them',async()=>{
 const c=await city({families:[0,1003,1006,1008],visible:[0,1003,1006,1008]}),{S}=c;c.settle();
 S.endCaptureDemands=evaluate(declaration('endCaptureDemands'),S);S.paintSelection=()=>{};
 const setPageHidden=evaluate(method('setPageHidden'),S),setEnabled=evaluate(method('setEnabled',value=>value.startsWith('function setEnabled(value:boolean){if(!value){')),S);
 c.show([0,1003]);c.frame();
 const kept=c.programOf(1003),idle=[c.programOf(1006),c.programOf(1008)];
 assert.equal(S.partitionPrograms.size,3,'while the partition draw runs, idle programs stay in its last-used set');
 setPageHidden(true);
 assert.deepEqual([...S.partitionPrograms.keys()],[key(1003)],'hidden: only the last partition draw\'s program stays');
 assert(idle.every(p=>c.driver.deleted.includes(p))&&!c.driver.deleted.includes(kept));
 setPageHidden(true);assert.equal(S.partitionPrograms.get(key(1003)),kept,'a repeated hide keeps it');
 let built=c.builds.length;setPageHidden(false);c.settle();
 assert.equal(c.programOf(1003),kept,'the shown view draws the kept program');assert.equal(c.builds.length,built,'showing it rebuilds nothing');
 c.show([0,1003,1006]);c.settle();c.show([0,1006]);c.frame();
 const enabledKept=c.programOf(1006),enabledIdle=c.programOf(1003);
 setEnabled(false);
 assert.deepEqual([...S.partitionPrograms.keys()],[key(1006)],'disabled: only the last partition draw\'s program stays');
 assert(c.driver.deleted.includes(enabledIdle)&&!c.driver.deleted.includes(enabledKept));
 built=c.builds.length;setEnabled(true);c.settle();
 assert.equal(c.programOf(1006),enabledKept);assert.equal(c.builds.length,built,'re-enabling the same view rebuilds nothing');
});
