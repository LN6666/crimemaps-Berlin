import test from 'node:test';
import assert from 'node:assert/strict';
import {createDelegatedFixture,createCaptureGL,declaration,rendererText as text,DEFAULT_HELPER} from './support/fixtures-delegated-renderer.mjs';
// Non-Berlin per-family cities (12 of 14) cast with family 0's program unless a family's own
// paint closure discards or writes depth. Those "own casters" compile one per frame. These checks
// drive the REAL capture owner (the scene solar shadow layer's prerender with its pending-frame
// request, scene-solar-shadow failedKey latch, planar-reflection-group AND) with the renderer's
// real solar bindings, its layer render (main programs and draw closure) and
// getSolarShadowRevision(), against the production program owner and context scheduler
// (support/fixtures-delegated-renderer.mjs). The facade paint and one published chunk are fixture data.
// Not covered here: the production wrappers around layer.render (guardCustomLayerRender,
// withSceneSolarShadowReceiver, main-frame completion bookkeeping) and the scheduler's
// wall-clock slice yield (its clock stands still inside a captured turn).
// Dispatcher shape the renderer narrows. 1004/1005 discard like hnHbfPlatforms1 (own casters); 1003/1006/1008 cast like family 0.
const GLSL=`vec3 kept(vec3 base,float family){return base*.3;}
vec3 cut(vec3 base,float family){if(base.r<0.)discard;return base*.4;}
vec3 cutAgain(vec3 base,float family){if(base.g<0.)discard;return base*.5;}
vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.||family==1006.||family==1008.)return kept(base,family);if(family==1004.)return cut(base,family);if(family==1005.)return cutAgain(base,family);return base;}
vec3 progressiveFeatureDispatchCityLegacy500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatch(base,p,normal,frame,family);}
vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatchCityLegacy500(base,p,normal,frame,family);}
vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1000.)return progressiveFeatureDispatchCity(base,p,normal,frame,floor(family+.5));return base;}`;
const key=family=>'current-family:'+family,identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),INSTANT='2026-06-21T10:00:00.000Z';
const INSIDE=[-.1,0,-.1,.1,.1,.1],OUTSIDE=[5,0,5,6,1,6];
const stable=name=>({prepareSolarShadow(){},getSolarShadowRevision:()=>'stable:'+name,getPlanarReflectionRevision:()=>'stable:'+name,getSolarShadowCoverage:()=>({bounds:[0,0,0,1,1,1],triangles:4,draws:1,complete:true}),renderPlanarReflection:pass=>({triangles:Math.min(4,pass.maxTriangles),draws:Math.min(1,pass.maxDraws),complete:true})});
async function city({families,visible,compileFails=new Set(),growth}){
 const fixture=await createDelegatedFixture({city:'hannover',paint:GLSL}),{S,driver,m}=fixture,events=[],shown=new Set(visible);
 // The fixture advances the production context scheduler only through turns.advance
 // (frame preparation and fixture.until alike): a call inside it runs in an admitted scheduler turn.
 let schedulerTurns=0;const advance=fixture.turns.advance;fixture.turns.advance=(...args)=>{schedulerTurns++;try{return advance(...args);}finally{schedulerTurns--;}};
 // Every paint assembly and specialization from construction on, the base program's
 // included. Classification and compile builds may run them only in admitted scheduler
 // turns. The prepared-source workspace reuses one admitted assembled base, so each
 // family's analysis is its specialization.
 const assemblies=[],analyses=[];
 const assemble=S.fragment;S.fragment=(...args)=>{assemblies.push({frame:S.frameNo,inTurn:schedulerTurns>0});return assemble(...args);};
 const specialize=S.specializeCurrentPaintProgram;S.specializeCurrentPaintProgram=(...args)=>{analyses.push({family:args[1],frame:S.frameNo,inTurn:schedulerTurns>0});return specialize(...args);};
 const comps=families.map((family,i)=>({objectId:'osm/way/'+(100+i),partId:'p'+i,start:i*3,end:i*3+3,firstVertex:i,lastVertex:i+1,family,box:shown.has(family)?INSIDE:OUTSIDE}));
 const chunk=fixture.setScene(comps,comps.map(c=>({firstIndex:c.start,indexCount:3,key:key(c.family)})));
 // A published resident base program (the renderer's main family-0 program).
 S.program=fixture.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 // Each program build is one event: the frame it was built in, the phase that requested it
 // and the phase it ran in (the context scheduler's turn, never the frame itself).
 driver.onBuild=origin=>{events.push({frame:S.frameNo,phase:origin.phase,family:origin.family,builtIn:origin.builtIn});};
 driver.fail=p=>{const failed=compileFails.has(p.metadata?.[2]??0);if(failed){const event=events.findLast(e=>e.family===(p.metadata?.[2]??0));if(event)event.failed=true;}return failed;};
 if(growth){
  Object.assign(S,{needsBirth:true,reducedMotion:growth==='reduced',seenBirth:new Set(),clock:()=>(S.frameNo-1)*150});
  if(S.reducedMotion)chunk.stateData.fill(1);
 }
 let providerPreparation;
 const d500={setCaptureDemand:change=>S.setCaptureDemand(change),prepareSolarShadow(budget){
  const result=S.prepareSolarShadow(budget);
  // Read the existing call's scalar result and pure diagnostics only. Calling
  // coverage here would construct the snapshot preparation deliberately defers.
  providerPreparation={status:result.status,ready:result.ready,pending:result.pending,failed:result.failed,budgetWaiting:result.budgetWaiting,reason:S.captureRuntime.stats.reason,casterFailureReason:S.solarCasterFailureReason()};
  return result;
 },getSolarShadowRevision:()=>S.getSolarShadowRevision(),getPlanarReflectionRevision:()=>'unused',getSolarShadowCoverage:()=>S.solarCoverage(),
  renderPlanarReflection(pass){const c=S.solarCoverage();if(!c?.complete)return{triangles:0,draws:0,complete:!c};return{triangles:Math.min(c.triangles,pass.maxTriangles),draws:Math.min(c.draws,pass.maxDraws),complete:true};}};
 // painted-map.ts provider order and main.ts outer group (no Berlin dedicated appearance).
 const inner=m.fixtureGroup.planarReflectionGroup(()=>[stable('root500'),d500,stable('tier300'),stable('church'),stable('city')]),source=m.fixtureGroup.planarReflectionGroup(()=>[undefined,inner]);
 // main.ts installs the scene solar shadow layer: the only capture owner, run in prerender.
 const layers=new Map(),surface={isStyleLoaded:()=>true,getLayer:id=>layers.get(id),addLayer:layer=>layers.set(layer.id,layer),removeLayer:id=>layers.delete(id),on(){},off(){},triggerRepaint:()=>S.map.triggerRepaint()};
 const capture=m.fixtureSolarLayer.installSceneSolarShadowLayer({map:surface,source,initial:{instantISO:INSTANT,sunlight:true,shadows:true,motion:true,quality:'detail'},solarLight:()=>({direction:S.sceneSun.direction,instantISO:INSTANT,altitudeDegrees:45}),available:()=>true});
 capture.setMode(true);assert(capture.customLayer&&layers.has(capture.customLayer.id),'the capture layer is installed');
 const shadow={get stats(){return capture.stats.core??{status:'no-capture',published:false,captures:0};},resetGPU:()=>capture.resetGPU()};
 const cgl=createCaptureGL();m.fixtureChunks.bindChunkResourceContext(cgl,m.fixtureChunks.createChunkResourceStore({budget:m.fixtureBudget.createResourceBudget({limitBytes:256*1024*1024,recentLimitBytes:16*1024*1024})}));
 // One MapLibre frame: capture-layer prerender first, then the building layer's render.
 function frame(){S.frameNo++;S.repaint=false;const before=events.length;S.phase='prerender';providerPreparation=undefined;capture.customLayer.prerender(cgl);
  // Capture before render/grow can complete a reduced-motion birth. A frame
  // that reuses the core's failed/ready latch has no new provider preparation.
  const prepared=providerPreparation;
  S.phase='render';S.render(fixture.gl,{defaultProjectionData:{mainMatrix:identity()}});S.phase='preparation';fixture.advancePreparation(true);S.phase='idle';const st=shadow.stats;
  return{frame:S.frameNo,status:st.status,published:st.published,captures:st.captures,reason:st.coverage?.reason,providerPreparation:prepared,repaint:S.repaint,compiles:events.slice(before)};}
 const idle=(limit=60)=>{const rows=[frame()];while((rows.at(-1).repaint||fixture.turns.queue.length)&&rows.length<limit)rows.push(frame());return rows;};
 const continuous=n=>Array.from({length:n},frame);
 // Own casters (requested by the capture prerender) compile at most one per frame. Visible
 // colour programs are submitted by main preparation and paced by the context scheduler, so
 // every build must run inside a scheduler turn rather than synchronously in a frame.
 const perFrame=()=>{assert(events.every(e=>e.builtIn==='preparation'),'program sources build only in context scheduler turns: '+JSON.stringify(events));return Math.max(0,...[...events.filter(e=>e.phase==='prerender').reduce((map,e)=>map.set(e.frame,(map.get(e.frame)??0)+1),new Map()).values()]);};
 return{S,events,frame,idle,continuous,perFrame,shadow,show(list){
  shown.clear();for(const f of list)shown.add(f);for(const c of comps)c.box=shown.has(c.family)?INSIDE:OUTSIDE;
  // Counterfactual boxes represent a new camera view under the identity
  // projection. Follow the real move callback: never reuse that view's cached
  // visibility or main witness after changing which families are in view.
  S.viewRevision++;S.matrix=undefined;S.mainWorldMatrix=undefined;S.invalidateMainFrame();S.pruneProgramPreparation();
 },assemblies,analyses,get fragments(){return assemblies.length;},get synchronousFragments(){return assemblies.filter(a=>!a.inTurn).length;},get synchronousAnalyses(){return analyses.filter(a=>!a.inTurn).length;}};
}
test('several off-screen own casters on an idle map finish and publish one capture; each frame compiles at most one own caster',async()=>{
 const c=await city({families:[0,1003,1004,1005],visible:[0,1003]});const rows=c.idle();const last=rows.at(-1);
 assert.equal(last.status,'ready',JSON.stringify(rows.map(r=>[r.frame,r.status,r.reason])));assert.equal(last.published,true);assert.equal(last.repaint,false,'no repaint once complete');
 assert.equal(last.captures,1,'the completed set is captured once');assert(c.perFrame()<=1);assert.deepEqual(c.events.map(e=>e.family).sort(),[1003,1004,1005]);
});
test('a continuous frame stream with only family 0 visible does not stall behind the failed-capture latch',async()=>{
 const c=await city({families:[0,1004,1005],visible:[0]});const rows=c.continuous(36);assert(rows.some(r=>r.status==='ready'),JSON.stringify(rows.map(r=>r.status)));assert.equal(rows.at(-1).published,true);assert(c.perFrame()<=1);
});
test('panning across already compiled base-casting families never re-captures the unchanged depth',async()=>{
 const c=await city({families:[0,1003,1006,1008],visible:[0,1003,1006,1008]});c.idle();const ready=c.frame();assert.equal(ready.status,'ready');
 const views=[[1003],[1006,1008],[0,1003],[1008],[1003,1006]];const rows=views.map(v=>{c.show(v);return c.frame();});
 assert(rows.every(r=>r.published&&r.compiles.length===0));assert.equal(rows.at(-1).captures,ready.captures,'LRU order and colour-only programs are not depth inputs');
});
test('an own caster that fails to compile is reported as such, is not retried every frame and stops requesting frames',async()=>{
 const c=await city({families:[0,1004],visible:[0],compileFails:new Set([1004])});const rows=c.idle();const last=rows.at(-1);
 assert.equal(last.status,'incomplete-coverage');assert.equal(last.reason,'depth-preparation-failed');assert.equal(last.repaint,false);
 const failed=rows.findLast(row=>row.providerPreparation?.status==='failed');assert.ok(failed,'the real provider reports its failed preparation');
 assert.equal(failed.providerPreparation.failed,1);assert.equal(failed.providerPreparation.pending,0);assert.match(failed.providerPreparation.casterFailureReason??'',/solar-caster-compile-failed:current-family:1004/);
 assert.equal(c.events.filter(e=>e.family===1004).length,1);c.continuous(5);assert.equal(c.events.filter(e=>e.family===1004).length,1);
});
test('after a GPU release the visible colour programs compile before any off-screen caster, and the idle map still publishes',async()=>{
 const c=await city({families:[0,1003,1004],visible:[0,1003]});c.idle();assert.equal(c.frame().status,'ready');
 // A GPU release is a context reset for the capture owner too: its revision
 // describes content, never borrowed program availability. The renderer then
 // recompiles its own base program (family 0) as visible work.
 c.S.releaseGPU();c.shadow.resetGPU();const before=c.events.length;const rows=c.idle();const after=c.events.slice(before);
 assert.deepEqual(after.map(e=>e.phase+':'+e.family),['render:0','render:1003','prerender:1004'],'visible first after the release');assert.equal(rows.at(-1).status,'ready');assert.equal(rows.at(-1).repaint,false);assert(c.perFrame()<=1);
});
test('a renderer-only GPU release keeps the published capture and rebuilds no off-screen caster: the revision describes content',async()=>{
 const c=await city({families:[0,1003,1004],visible:[0,1003]});c.idle();const ready=c.frame(),revision=c.S.getSolarShadowRevision();assert.equal(ready.status,'ready');
 // layer.onRemove releases only the renderer's GPU state (releaseGPU). The capture
 // owner is not reset, so its published target stays valid for unchanged content.
 c.S.releaseGPU();assert.equal(c.S.getSolarShadowRevision(),revision,'releasing borrowed programs leaves the content revision unchanged');
 const before=c.events.length,rows=c.idle(),after=c.events.slice(before);
 assert.deepEqual(after.map(e=>e.phase+':'+e.family),['render:0','render:1003'],'only the visible colour programs are rebuilt');
 assert(rows.every(r=>r.status==='ready'&&r.published&&r.captures===ready.captures),'the published capture is kept: '+JSON.stringify(rows));assert.equal(rows.at(-1).repaint,false);
});
test('caster classification only assembles in admitted slots, releases temporary sources, and survives depth GPU release',async()=>{
 const c=await city({families:[0,1003,1004,1005,1006,1008],visible:[0]});
 // The base compile left its admitted assembly in the workspace. Drain it, as an idle
 // drainSourceWorkspaces() does, so the classification has to assemble its own base.
 c.S.clearProgramSources();const setup=c.fragments;c.idle();const first=c.fragments,analysed=c.analyses.length;
 assert.equal(c.synchronousFragments,0,'no source assembly during demand, draw or capture polling');assert.equal(c.synchronousAnalyses,0,'no source analysis during demand, draw or capture polling');
 assert.equal(first-setup,1,'one admitted assembly serves every family\'s classification and own-caster compile');
 const perFamily=c.analyses.reduce((map,a)=>map.set(a.family,(map.get(a.family)??0)+1),new Map());
 assert.deepEqual([...perFamily.keys()].sort((a,b)=>a-b),[0,1003,1004,1005,1006,1008],'every family is classified (family 0 by the base program compile)');
 assert([...perFamily.values()].every(n=>n===1),'at most one analysis for each family; own-caster compiles reuse their classified source: '+JSON.stringify([...perFamily]));
 assert.equal(c.S.casterPreparedSources.size,0,'compiled own casters no longer retain specialized sources');assert.equal(c.S.casterAnalysisPending.size,0,'all ready work markers consumed');
 c.S.releaseSolarDepth();c.S.casterIsBase(key(1005));c.S.casterIsBase(key(1008));assert.equal(c.fragments,first,'no reassembly after release');assert.equal(c.analyses.length,analysed,'no reanalysis after release');
 assert.equal(c.S.casterIsBase(key(1004)),false);assert.equal(c.S.casterIsBase(key(1003)),true);
});
test('the render path re-arms the caster gate on every frame and a release clears the budget stamp',()=>{
 assert(text.includes('partitionPending=false;casterVisibleKnown=false;'));assert(text.includes('if(!gpuReady())residentGPU!.attach(gl)'));
 const released=declaration('releaseGPU');assert(released.includes('programPreparation.cancel();'));assert(released.includes('releaseSolarDepth();casterRetry=false;casterVisibleKnown=false;casterCompileFrame=-1;'));
 assert(text.includes('offscreenPaintRunsSkipped=0;casterVisibleKnown=true;if(casterRetry){casterRetry=false;solarDepthRevision++;}'));
});

for(const growth of ['animated','reduced'])test(`${growth} birth on an idle map publishes after the last growth render, then stops`,async()=>{
 const c=await city({families:[0],visible:[0],growth}),rows=c.idle();
 assert.equal(rows[0].status,'preparing');assert.equal(rows[0].reason,'depth-preparation-pending');
 assert.equal(rows[0].providerPreparation?.status,'pending');assert.equal(rows[0].providerPreparation.pending,1);assert.equal(rows[0].providerPreparation.failed,0);assert.match(rows[0].providerPreparation.reason,/needs-birth$/);
 const last=rows.at(-1);assert.equal(last.status,'ready',JSON.stringify(rows));assert.equal(last.published,true);
 assert.equal(last.captures,1);assert.equal(last.repaint,false);assert.equal(rows.length,growth==='animated'?4:2);
 assert.equal(c.frame().captures,1,'settled frame reuses the published target');
});
test('a visible colour compile can recover an earlier caster failure and publish on the next idle frame',async()=>{
 const compileFails=new Set([1004]),c=await city({families:[0,1004],visible:[0],compileFails});
 assert.equal(c.idle().at(-1).status,'incomplete-coverage');assert.equal(c.S.casterFailures.size,1);
 compileFails.clear();c.show([0,1004]);const rows=c.idle(),last=rows.at(-1);
 assert.equal(c.S.casterFailures.size,0,'a successful replacement retires its obsolete failure');
 assert.equal(last.status,'ready',JSON.stringify(rows));assert.equal(last.published,true);assert.equal(last.repaint,false);
 assert.equal(last.captures,1);assert(rows.length>2,'asynchronous compilation yields before the final capture frame');
 assert.equal(c.events.filter(e=>e.family===1004).length,2,'one failed caster attempt and one successful colour attempt');assert(c.perFrame()<=1);
});
