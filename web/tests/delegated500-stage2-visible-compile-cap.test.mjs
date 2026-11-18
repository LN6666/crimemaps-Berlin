import test from 'node:test';
import assert from 'node:assert/strict';
import {createDelegatedFixture,declaration,evaluate,DEFAULT_HELPER} from './support/fixtures-delegated-renderer.mjs';
// delegated500 starts at most one visible colour compile per frame (DECISIONS
// 2026-11-02 03:25), on top of the context scheduler's own pacing. Driven through
// the renderer's real declarations (support/fixtures-delegated-renderer.mjs:
// production program owner, context scheduler, page ResourceBudget/chunk store,
// prepared-source workspace): the layer render runs prepareMainPrograms and the
// draw, then one scheduler turn runs the source builds it queued.
// Fixture inputs: the synthetic paint, one published chunk and a fake WebGL2
// context. Not covered: real driver compile time, the scheduler's wall-clock
// slice (the fixture clock stands still in a turn) and any GPU.
const GLSL=`vec3 kept(vec3 base,float family){return base*.3;}
vec3 cut(vec3 base,float family){if(base.r<0.)discard;return base*.4;}
vec3 cutAgain(vec3 base,float family){if(base.g<0.)discard;return base*.5;}
vec3 progressiveFeatureDispatch(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==1003.||family==1006.||family==1008.)return kept(base,family);if(family==1004.)return cut(base,family);if(family==1005.)return cutAgain(base,family);return base;}
vec3 progressiveFeatureDispatchCityLegacy500(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatch(base,p,normal,frame,family);}
vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return progressiveFeatureDispatchCityLegacy500(base,p,normal,frame,family);}
vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family>=1000.)return progressiveFeatureDispatchCity(base,p,normal,frame,floor(family+.5));return base;}`;
const INSIDE=[-.1,0,-.1,.1,.1,.1],OUTSIDE=[5,0,5,6,1,6],key=family=>'current-family:'+family,identity=()=>new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);

async function city({families,visible}){
 const fixture=await createDelegatedFixture({city:'hannover',paint:GLSL}),{S}=fixture,shown=new Set(visible);
 const comps=families.map((family,i)=>({objectId:'osm/way/'+(100+i),partId:'p'+i,start:i*3,end:i*3+3,firstVertex:i,lastVertex:i+1,family,box:shown.has(family)?INSIDE:OUTSIDE}));
 fixture.setScene(comps,comps.map(c=>({firstIndex:c.start,indexCount:3,key:key(c.family)})));
 S.program=fixture.until(()=>S.compileGeometryProgram(DEFAULT_HELPER));
 // Every program build: the frame its source build ran in, the frame phase that
 // requested it ('render' is the main preparation of the layer render) and its family.
 const builds=[];fixture.driver.onBuild=origin=>builds.push({frame:S.frameNo,phase:origin.phase,family:origin.family});
 // One building-layer frame, then one context scheduler turn.
 const frame=()=>{S.frameNo++;S.repaint=false;S.phase='render';S.render(fixture.gl,{defaultProjectionData:{mainMatrix:identity()}});S.phase='preparation';fixture.advancePreparation(true);S.phase='idle';return S.repaint;};
 const settle=(limit=60)=>{for(let i=0;i<limit;i++)if(!frame()&&!fixture.turns.queue.length)return i+1;assert.fail('main programs did not settle');};
 // A synthetic pan moves boxes relative to the identity projection, then uses
 // the real move callback to invalidate the view cache and main draw witness.
 const move=evaluate(declaration('move'),S);
 const show=list=>{shown.clear();for(const family of list)shown.add(family);for(const c of comps)c.box=shown.has(c.family)?INSIDE:OUTSIDE;move();};
 const block=free=>fixture.budget.reserve({category:'construction',bytes:fixture.budget.stats.availableBytes-free,precision:'exact',label:'fixture ledger pressure'});
 // Visible colour programs the main preparation built, counted per frame.
 const visibleBuildsPerFrame=()=>{const counts=new Map();for(const row of builds)if(row.phase==='render')counts.set(row.frame,(counts.get(row.frame)??0)+1);return counts;};
 return{...fixture,S,frame,settle,show,block,builds,visibleBuildsPerFrame,programOf:family=>S.partitionPrograms.get(key(family))};
}

test('a pan sequence builds at most one visible colour program per frame and still publishes every visible family',async()=>{
 const c=await city({families:[0,1003,1004,1005,1006,1008],visible:[0]});c.settle();
 const before=c.builds.length;
 for(const view of [[0,1003,1006,1008],[0,1004,1005],[1003,1004,1005,1006,1008]]){
  c.show(view);const frames=c.settle();
  for(const family of view)if(family)assert(c.programOf(family),'the visible family '+family+' has its own colour program after the pan to '+JSON.stringify(view));
  assert(frames<=view.filter(Boolean).length+2,'the view settles within one frame per program it needed: '+frames+' frames for '+JSON.stringify(view));
 }
 const counts=c.visibleBuildsPerFrame();
 assert(Math.max(0,...counts.values())<=1,'no frame builds a second visible program: '+JSON.stringify([...counts]));
 const built=c.builds.slice(before).filter(row=>row.phase==='render').map(row=>row.family).sort();
 assert.deepEqual(built,[1003,1004,1005,1006,1008],'each visible family is built once, none twice');
});

test('after one frame starts a compile, the other missing keys of that frame adopt already linked programs without building them',async()=>{
 const c=await city({families:[0,1003,1006,1008],visible:[0,1003,1006,1008]});c.settle();
 const linked={1006:c.programOf(1006),1008:c.programOf(1008)};assert(linked[1006]&&linked[1008]);
 c.show([0]);c.frame();
 // 1006 and 1008 leave for the page's recent program set; 1003 is deleted.
 for(const family of [1003,1006,1008]){const p=c.programOf(family);c.S.partitionPrograms.delete(key(family));c.owner.releaseProgram(c.gl,p,{retainRecent:family!==1003});}
 assert.equal(c.S.partitionPrograms.size,0);
 const before=c.builds.length;c.show([0,1003,1006,1008]);
 assert.equal(c.frame(),true,'the compile it started keeps the frame request');
 assert.equal(c.programOf(1006),linked[1006],'1006 adopts its linked program in the same frame');
 assert.equal(c.programOf(1008),linked[1008],'1008 adopts its linked program in the same frame');
 assert.deepEqual(c.builds.slice(before).map(row=>row.family),[1003],'only the missing 1003 is built');
 c.settle();assert(c.programOf(1003));assert.deepEqual(c.builds.slice(before).map(row=>row.family),[1003]);
});

test('held ledger waits do not spend the frame\'s visible compile: two refused keys both hold the owner wake and request no polling frame',async()=>{
 const c=await city({families:[0,1003,1004,1005],visible:[0,1003]});c.settle();
 const blocker=c.block(1024);
 try{
  c.show([0,1003,1004,1005]);
  assert.equal(c.frame(),false,'every missing visible program waits on the owner wake: no frame is requested');
  assert.equal(c.owner.waitingForBudget,true);
  assert.deepEqual([...c.S.heldMainWaitKeys].sort(),[key(1004),key(1005)],'the second refused key was attempted in the same frame, not capped behind the first');
  assert.equal(c.frame(),false,'a later frame inside the wait polls nothing either');
 }finally{blocker.release();}
 assert.equal(c.owner.waitingForBudget,false,'the released bytes wake the owner');assert.equal(c.S.repaint,true,'and the wake repaints');
 const before=c.builds.length;c.settle();
 assert(c.programOf(1004)&&c.programOf(1005));
 const counts=c.visibleBuildsPerFrame();assert(Math.max(0,...counts.values())<=1,'after the wake they are built one per frame: '+JSON.stringify([...counts]));
 assert.deepEqual(c.builds.slice(before).map(row=>row.family).sort(),[1004,1005]);
});
