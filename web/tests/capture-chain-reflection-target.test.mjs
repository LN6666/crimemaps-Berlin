import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCaptureChain,createFencedGL,createLedger} from './support/capture-chain-gl.mjs';

// Wave 3 capture chain, items 2 and 3, on the real reflection core, groups,
// resident planner, page ledger and chunk store (fake WebGL2 context).
// Item 2 (UI CDR-1): a capture copies the result's budgetOmissions (at most 16
// rows) into its snapshot, release clears them, and stats reports a copy. A
// capture-budget partial with pending=false is the designed steady state
// (owner decision 2): nothing retries it.
// Item 3 (solar-reflection-wait open item 3, ROOT decision 01:35, corrected by
// capture-chain review F2): when a new target size does not fit, the old-size
// target is returned when its snapshot is not displayed for the current
// revision (R1) or when its bytes alone cover the refused shortfall; otherwise
// its displayed snapshot stays shown (the picture before the change) and every
// later refusal decides again. The capture holds its own ledger wake and, until
// the wait ends, the page store's bounded retirement follow-up frames, so a
// still map (frames only when requested, no compositor registration) collects a
// returned target's fence and retries exactly once with one target charged. A
// fence never signals in the frame that created it; each map frame is its own
// task, because the store spends one follow-up frame per task.
const m=await loadCaptureChain();
const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),identity64=Float64Array.from(identity);
const economy=m.planarReflectionBudget('economy'),bytesOf=(w,h)=>{const [x,y]=m.planarReflectionSize(w,h,economy.pixels,economy.maxDimension);return{x,y,bytes:x*y*6};};
const box=[0,0,0,1,1,1],paint={},singles=n=>Array.from({length:n},(_,i)=>({start:i*6,end:i*6+6,box})),singleRuns=n=>Array.from({length:n},(_,i)=>({firstIndex:i*6,indexCount:6,program:paint}));
// A resident provider plans inside its synchronous capture, as painted renderers do.
function resident(id,count,log){
 return{getPlanarReflectionRevision:()=>id,setPlanarReflectionProjection(){},renderPlanarReflection(p){
  log.push(id);const planned=m.planResidentReflectionChunks([{components:singles(count),runs:singleRuns(count),matrix:identity64,indexCount:count*6,cull:false}],p.maxTriangles,p.maxDraws);
  return{triangles:planned.triangles,draws:planned.draws,complete:planned.complete,...(planned.reason?{reason:'plan:'+planned.reason}:{}),...(planned.pending?{pending:true}:{})};}};
}
const view={mainMatrix:identity,viewportWidth:1280,viewportHeight:800,planeWorldZ:.02/25000000,quality:'economy',appearanceKey:'sun/1'};

test('a capture keeps a bounded copy of the group omission rows in its snapshot and stats; release clears them; the steady partial never retries',()=>{
 const {store,gl}=createLedger(m),log=[];let time=1000;
 // The city uses 12 of the fixed 24 draws; Bremen uses the remaining 12,
 // preserving the original 22 whole-component omissions and their source.
 const painted=m.planarReflectionGroup(()=>[resident('city',12,log),resident('bremen',34,log)],{labels:['city','bremen']}),outer=m.planarReflectionGroup(()=>[undefined,painted],{labels:['dedicated','painted']});
 const r=m.createPlanarBuildingReflection({now:()=>time}),row={source:'source[1/painted]:source[1/bremen]',components:22,triangles:44,draws:22};
 const capture=(extra={})=>{time+=1000;return r.capture(gl,{...view,...extra});};
 try{
  r.setSource(outer);assert.deepEqual(r.stats.budgetOmissions,[],'no capture, no rows');
  const shown=capture();
  assert.ok(shown?.texture);assert.equal(shown.complete,false);assert.equal(shown.reason,'source[1/painted]:source[1/bremen]:plan:capture-budget','the reason text is unchanged');
  assert.deepEqual(shown.budgetOmissions,[row]);assert.deepEqual(r.stats.budgetOmissions,[row]);
  assert.deepEqual(outer.reflectionBudgetStats,{captures:1,pending:false,omissions:[row]},'the same rows the outer group recorded');
  assert.match(r.stats.budgetOmissionsMeaning,/pending=false is the designed steady state/);
  // Designed steady state: partial, not pending, no frame and no retry.
  assert.equal(r.stats.mode,'captured-partial');assert.equal(r.stats.pending,false);assert.equal(r.needsFrame,false);assert.equal(r.frame(time+1e9),false);
  assert.equal(capture(),shown,'a fixed view and source reuse the partial capture');assert.equal(log.length,2,'without drawing again');assert.equal(outer.reflectionBudgetStats.captures,1);
  // stats hands out copies.
  r.stats.budgetOmissions[0].components=999;r.stats.budgetOmissions.push(row);assert.deepEqual(r.stats.budgetOmissions,[row]);
  // Every release path clears the rows with the snapshot.
  for(const [name,end] of [['reset',()=>r.resetGPU()],['disabled',()=>capture({enabled:false})],['source switch',()=>{r.setSource(undefined);r.setSource(outer);}],['destroy',()=>r.destroy()]]){
   if(name!=='reset'){assert.deepEqual(capture({appearanceKey:name})?.budgetOmissions,[row],name);}
   end();assert.deepEqual(r.stats.budgetOmissions,[],name);assert.equal(r.stats.allocatedGPUBytes,0,name);
  }
 }finally{r.destroy();store.collectRetired();store.destroy();}
});

test('the snapshot copy keeps at most 16 valid rows of any source result',()=>{
 const {store,gl}=createLedger(m);let time=1000,rows=[];
 const r=m.createPlanarBuildingReflection({now:()=>time});
 r.setSource({getPlanarReflectionRevision:()=>'direct',renderPlanarReflection:()=>({triangles:1,draws:1,complete:false,reason:'capture-budget',budgetOmissions:rows})});
 const capture=key=>{time+=1000;return r.capture(gl,{...view,appearanceKey:key});};
 try{
  rows=Array.from({length:20},(_,i)=>({source:'p'+i,components:1,triangles:2,draws:1}));
  assert.deepEqual(capture('many').budgetOmissions,rows.slice(0,16));assert.equal(r.stats.budgetOmissions.length,16);
  rows=[null,{source:7,components:1,triangles:1,draws:1},{source:'zero',components:0,triangles:0,draws:0},{source:'negative',components:1,triangles:-1,draws:1},{source:'fraction',components:1.5,triangles:2,draws:1},{source:'x'.repeat(5000),components:2,triangles:4,draws:2}];
  assert.deepEqual(capture('invalid').budgetOmissions,[{source:'x'.repeat(1024),components:2,triangles:4,draws:2}]);
  rows=[];const none=capture('none');assert.equal('budgetOmissions' in none,false,'no rows, no field');assert.deepEqual(r.stats.budgetOmissions,[]);
 }finally{r.destroy();store.collectRetired();store.destroy();}
});

const nextTask=()=>new Promise(resolve=>setImmediate(resolve));
// Start below the fixed 32768-pixel cap so a later wider viewport really
// grows the target. Two already capped viewports can differ only by rounding.
const stillView={...view,viewportWidth:320,viewportHeight:80};
// A still map: the environment layer's render captures, the 'render' boundary
// collects, and a frame exists only if something requested one.
function stillMap({follow}={}){
 const gl=createFencedGL(),ledger=createLedger(m,{gl,store:follow===undefined?{}:{retirementFollowUpFrames:follow}}),{budget,store}=ledger;
 let time=1000,repaints=0,wanted=false,renders=0,peak=0,fail,revision='resident/still/1';
 const source={getPlanarReflectionRevision:()=>revision,setPlanarReflectionProjection(){},setPlanarReflectionState(){},setCaptureDemand(){},
  renderPlanarReflection(){renders++;if(fail){const error=fail;fail=undefined;throw error;}return{triangles:12,draws:1,complete:true};}};
 const r=m.createPlanarBuildingReflection({now:()=>time,requestRepaint:()=>{repaints++;wanted=true;}});r.setSource(source);
 const note=()=>{peak=Math.max(peak,ledger.textureBytes());};
 // Each map frame is its own task; the GPU has moved past every earlier frame.
 async function frame(extra={}){await nextTask();gl.advanceGPU();const shown=r.capture(gl,{...stillView,...extra});note();store.collectRetired();note();return shown;}
 return{...ledger,gl,r,frame,
  /** Draws the one requested frame, if any. */
  async step(extra={}){if(!wanted)return false;wanted=false;await frame(extra);return true;},
  /** Draws the one frame something requested and returns what it shows. */
  async drawRequested(extra={}){assert.equal(wanted,true,'a frame was requested');wanted=false;return frame(extra);},
  async settle(extra={},limit=64){let n=0;while(wanted){assert.ok(++n<=limit,'a still map settles');wanted=false;await frame(extra);}return n;},
  advance(ms=1000){time+=ms;},failNext(error){fail=error;},setRevision(value){revision=value;},
  get repaints(){return repaints;},get wanted(){return wanted;},get renders(){return renders;},get peak(){return peak;},resetPeak(){peak=ledger.textureBytes();},
  waitRows:()=>({requesters:store.stats.retirementFrameRequesters,listeners:budget.stats.availabilityListeners,retiring:store.stats.retiring}),
  allocations:(x,y)=>gl.allocations.filter(row=>row.kind==='texture'&&row.width===x&&row.height===y).length,
  dispose(){r.destroy();gl.stall(false);gl.advanceGPU();store.collectRetired();store.destroy();}};
}
const A=bytesOf(stillView.viewportWidth,stillView.viewportHeight),B=bytesOf(1600,900),wide={viewportWidth:1600,viewportHeight:900},half=Math.floor(B.bytes/2);

test('still map: a resize that fits once the old target is returned returns it; its own follow-up frame collects the fence, and the wake retries exactly once',async()=>{
 const f=stillMap();
 try{
  assert.ok((await f.frame())?.texture);assert.equal(f.textureBytes(),A.bytes);assert.equal(f.repaints,0);assert.equal(f.allocations(A.x,A.y),1);
  assert.ok(half<B.bytes&&A.bytes+half>=B.bytes,'the new size fits only once the old target is returned');
  f.advance();const blocker=f.block(half),before=f.waitRows(),renders=f.renders;f.resetPeak();
  assert.equal(await f.frame(wide),undefined);assert.equal(f.r.stats.mode,'resource-budget-pending');
  // Never hold the old-size target (one part of a capture) while waiting for its replacement.
  assert.equal(f.r.stats.allocatedGPUBytes,0,'the old-size target is returned');
  assert.equal(f.wanted,true,'the capture itself asked the still map for the collecting frame');
  assert.deepEqual(f.waitRows(),{requesters:before.requesters+1,listeners:before.listeners+1,retiring:1},'its fence did not pass in that frame; one retirement registration and one held wake, both the capture\'s own');
  assert.equal(f.textureBytes(),A.bytes,'only that one target stays charged until its fence passes');
  assert.equal(f.r.needsFrame,false);assert.equal(f.r.frame(1e12),false,'and nothing polls the shared clock');
  assert.equal(f.r.stats.waitingForTargetBudget,true);assert.equal(f.r.stats.targetBudgetWaits,1);
  assert.equal(await f.settle(wide),2,'one frame collects the fence (whose wake repaints), the next retries');
  assert.equal(f.renders,renders+1,'exactly one retry after the fence was collected');assert.equal(f.allocations(B.x,B.y),1,'one allocation of the new size');
  assert.equal(f.r.stats.mode,'captured');assert.equal(f.r.stats.width,B.x);assert.equal(f.r.stats.height,B.y);
  assert.equal(f.textureBytes(),B.bytes,'exactly one charged target');assert.equal(f.peak,Math.max(A.bytes,B.bytes),'never two targets charged at once');
  assert.deepEqual(f.waitRows(),{...before,retiring:0},'the wait ended: registration and wake revoked');
  const repaints=f.repaints;await nextTask();assert.equal(f.wanted,false);assert.equal(f.repaints,repaints,'the still map stays still');
  assert.equal(f.r.stats.targetBudgetWaits,1);blocker.release();
 }finally{f.dispose();}
});

test('still map: a stalled fence gets one follow-up per frame boundary, bounded by the store, and the wait stays held, never polled',async()=>{
 const f=stillMap({follow:4});
 try{
  await f.frame();f.advance();const blocker=f.block(half),renders=f.renders;
  f.gl.stall(true);assert.equal(await f.frame(wide),undefined);
  let drawn=0;while(await f.step(wide)){assert.ok(++drawn<=5,'follow-up frames are bounded');assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.renders,renders,'no retry while the bytes are still retiring');}
  assert.ok(drawn>=3,'the stalled fence kept getting frames: '+drawn);
  assert.equal(f.r.stats.waitingForTargetBudget,true,'the wait is still held after the bound');assert.equal(f.r.needsFrame,false);assert.equal(f.r.frame(1e12),false);
  // A later frame (any owner's) collects the passed fence; its wake retries once.
  f.gl.stall(false);await f.frame(wide);assert.equal(f.wanted,true);assert.equal(await f.settle(wide),1);
  assert.equal(f.renders,renders+1);assert.equal(f.textureBytes(),B.bytes);assert.equal(f.r.stats.targetBudgetWaits,1);
  blocker.release();
 }finally{f.dispose();}
});

test('still map: a wait without its own old target still takes the follow-up frames for another owner\'s retirement',async()=>{
 const f=stillMap();
 try{
  // Another owner's texture occupies the capacity this capture's first target needs.
  const other=f.store.acquireGpu({contentKey:'other-owner-texture',context:f.gl,epoch:f.store.contextEpoch(f.gl),role:'reflection',estimate:{category:'texture',bytes:A.bytes,precision:'exact',label:'other owner'},create:()=>({}),dispose(){}});
  const blocker=f.block(A.bytes-1);
  assert.equal(await f.frame(),undefined);assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.waitRows().requesters,1);assert.equal(f.wanted,false,'nothing is retiring yet');
  other.release();assert.equal(f.wanted,true,'that retirement asks the waiting capture for a frame');
  assert.equal(await f.settle(),2);assert.equal(f.r.stats.mode,'captured');assert.equal(f.renders,1);assert.equal(f.textureBytes(),A.bytes);
  assert.equal(f.waitRows().requesters,0);blocker.release();
 }finally{f.dispose();}
});

test('every end of a target wait revokes its registration and wake; a same-size target stays for the retry, its cleared image never shown',async()=>{
 // Another view ends the wait; its own refused attempt registers exactly one new wait.
 const f=stillMap();
 try{
  await f.frame();f.advance();const blocker=f.block(half);await f.frame(wide);
  assert.equal(f.waitRows().requesters,1);
  const tall={viewportWidth:1280,viewportHeight:700},C=bytesOf(1280,700);assert.ok(C.x!==B.x&&C.bytes>half,'another capture size that also cannot fit yet');
  f.gl.stall(true);await f.frame(tall);
  assert.equal(f.r.stats.targetBudgetWaits,2,'the new view was refused while the old bytes still retire');
  assert.deepEqual(f.waitRows(),{requesters:1,listeners:1,retiring:1},'the first wait was revoked: one registration and one wake, never one per attempt');
  f.gl.stall(false);assert.equal(await f.settle(tall),2);assert.equal(f.r.stats.mode,'captured');assert.equal(f.r.stats.width,C.x);assert.equal(f.textureBytes(),C.bytes);
  assert.deepEqual(f.waitRows(),{requesters:0,listeners:0,retiring:0});
  blocker.release();
 }finally{f.dispose();}
 // Destroy (and every release path) ends it; the later collection wakes nobody.
 const g=stillMap();
 try{
  await g.frame();g.advance();const blocker=g.block(half);await g.frame(wide);
  g.r.destroy();assert.deepEqual(g.waitRows(),{requesters:0,listeners:0,retiring:1});
  const repaints=g.repaints;g.gl.advanceGPU();await nextTask();g.store.collectRetired();
  assert.equal(g.waitRows().retiring,0);assert.equal(g.repaints,repaints,'a destroyed capture is never woken');blocker.release();
 }finally{g.dispose();}
 // A refusal after the target already has the wanted size keeps that target (as the solar capture does).
 // That attempt already cleared it, so the previous snapshot (same revision) is gone with its image.
 const h=stillMap();
 try{
  await h.frame();h.advance();const refusal=h.budget.tryReserve({category:'construction',bytes:h.budget.stats.limitBytes+1,precision:'exact'});assert.equal(refusal.ok,false);
  h.failNext(refusal.error);assert.equal(await h.frame({appearanceKey:'sun/2'}),undefined);
  assert.equal(h.r.stats.mode,'resource-budget-pending');assert.equal(h.r.stats.allocatedGPUBytes,A.bytes,'the same-size target is not returned');assert.equal(h.waitRows().requesters,1);
  assert.equal(await h.frame({appearanceKey:'sun/2'}),undefined,'a waiting frame never shows the cleared texture');
  assert.equal(h.r.stats.complete,false);assert.equal(h.r.stats.triangles,0,'stats no longer describe the cleared capture');assert.equal(h.wanted,false,'nothing retires, nothing polls');
  // Any byte drop is an availability wave: a brief reservation released again.
  const repaints=h.repaints,brief=h.block(64);brief.release();assert.equal(h.repaints,repaints+1,'the ledger wake repaints once');
  h.advance();assert.ok((await h.frame({appearanceKey:'sun/2'}))?.texture);assert.equal(h.r.stats.mode,'captured');assert.equal(h.textureBytes(),A.bytes);assert.equal(h.waitRows().requesters,0);
 }finally{h.dispose();}
});

// Review F2: B > A + free. Returning the old target cannot make room, so its
// displayed snapshot stays shown exactly as before the change (the refused frame
// shows nothing, later frames the old-size snapshot) and stays charged; a later
// refusal that the old bytes would cover returns them.
test('still map: a resize the old target cannot make room for keeps showing the old-size snapshot as before the change; a later refusal that its bytes cover returns them',async()=>{
 const f=stillMap();
 try{
  const first=await f.frame();assert.ok(first?.texture);f.advance();
  const blocker=f.block(64),before=f.waitRows(),renders=f.renders,repaints=f.repaints;
  assert.ok(B.bytes>A.bytes+64,'the new size cannot fit even once the old target is returned');
  assert.equal(await f.frame(wide),undefined,'the refused frame shows nothing, as before the change');
  assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.r.stats.targetBudgetWaits,1);
  assert.equal(f.r.stats.allocatedGPUBytes,A.bytes,'returning it cannot make room and its snapshot is displayed: the old target stays');assert.equal(f.textureBytes(),A.bytes);
  assert.deepEqual(f.waitRows(),{requesters:before.requesters+1,listeners:before.listeners+1,retiring:0},'one held wake and one retirement registration; nothing retires');
  assert.equal(f.wanted,false,'so nothing asks the still map for a frame');assert.equal(f.r.needsFrame,false);assert.equal(f.r.frame(1e12),false);
  assert.equal(f.r.stats.complete,true);assert.equal(f.r.stats.triangles,12,'stats still describe the displayed capture');
  for(let i=0;i<3;i++)assert.equal(await f.frame(wide),first,'later frames keep showing the old-size snapshot, as before the change');
  assert.equal(f.renders,renders,'no retry without a wake');assert.equal(f.repaints,repaints);
  // The capacity changes: the wake retries once, and that refusal decides again.
  blocker.release();assert.equal(f.repaints,repaints+1,'the ledger wake repaints once');assert.equal(f.r.stats.waitingForTargetBudget,false);
  const second=f.block(half);f.resetPeak();assert.ok(A.bytes+half>=B.bytes);
  assert.equal(await f.drawRequested(wide),undefined);assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.r.stats.targetBudgetWaits,2);
  assert.equal(f.r.stats.allocatedGPUBytes,0,'now its bytes cover the shortfall: the old target is returned');
  assert.equal(f.r.stats.complete,false);assert.equal(f.r.stats.triangles,0,'stats describe no capture once none is displayed');
  assert.equal(f.wanted,true,'its retirement asks the still map for the collecting frame');
  assert.equal(await f.settle(wide),2);assert.equal(f.r.stats.mode,'captured');assert.equal(f.r.stats.width,B.x);assert.equal(f.r.stats.height,B.y);
  assert.equal(f.renders,renders+1,'exactly one capture, after the fence was collected');assert.equal(f.allocations(B.x,B.y),1);
  assert.equal(f.textureBytes(),B.bytes);assert.equal(f.peak,Math.max(A.bytes,B.bytes),'never two targets charged');
  assert.deepEqual(f.waitRows(),{...before,retiring:0});second.release();
 }finally{f.dispose();}
});

test('still map: once capacity for both sizes appears, the new target is admitted beside the displayed old one, which retires after the swap',async()=>{
 const f=stillMap();
 try{
  const first=await f.frame();f.advance();const blocker=f.block(64),before=f.waitRows();
  assert.equal(await f.frame(wide),undefined);assert.equal(await f.frame(wide),first);assert.equal(f.r.stats.allocatedGPUBytes,A.bytes);
  f.resetPeak();blocker.release();
  const shown=await f.drawRequested(wide);assert.ok(shown?.texture&&shown!==first);assert.equal(f.r.stats.mode,'captured');assert.equal(f.r.stats.width,B.x);
  assert.equal(f.peak,A.bytes+B.bytes,'both targets are charged at once only because both fit the ledger');assert.ok(f.peak<=f.budget.stats.limitBytes);
  assert.equal(f.r.stats.targetBudgetWaits,1);assert.deepEqual(f.waitRows(),{...before,retiring:1},'the wait ended; the old target retires');
  // A later frame boundary collects its fence (on a still map the compositor's
  // own onRetirementPending registration, wave 3 stage 2, requests one).
  assert.equal(await f.frame(wide),shown);assert.equal(f.textureBytes(),B.bytes);assert.deepEqual(f.waitRows(),{...before,retiring:0});
 }finally{f.dispose();}
});

test('still map: an old-size target whose snapshot is not displayed for the new revision is returned even when its bytes cannot make room (R1)',async()=>{
 const f=stillMap();
 try{
  await f.frame();f.advance();f.setRevision('resident/still/2');const blocker=f.block(64),before=f.waitRows();
  assert.equal(await f.frame(wide),undefined);assert.equal(f.r.stats.mode,'resource-budget-pending');
  assert.equal(f.r.stats.allocatedGPUBytes,0,'an undisplayed target is never held for a wait');assert.equal(f.r.stats.complete,false);assert.equal(f.r.stats.triangles,0);
  assert.equal(f.wanted,true,'its retirement asks for the collecting frame');
  // The collection wakes the capture once; the retry is refused again and holds nothing.
  assert.equal(await f.settle(wide),2);assert.equal(f.r.stats.mode,'resource-budget-pending');assert.equal(f.r.stats.targetBudgetWaits,2);
  assert.equal(f.textureBytes(),0);assert.equal(f.renders,1,'nothing was drawn after the first capture');
  assert.deepEqual(f.waitRows(),{requesters:before.requesters+1,listeners:before.listeners+1,retiring:0});
  for(let i=0;i<2;i++)assert.equal(await f.frame(wide),undefined);assert.equal(f.wanted,false,'the still map stays still');
  blocker.release();assert.equal(await f.settle(wide),1);assert.equal(f.r.stats.mode,'captured');assert.equal(f.textureBytes(),B.bytes);assert.equal(f.renders,2);
 }finally{f.dispose();}
});

// Review F3: an invalid capture input ends the wait like every other end.
test('still map: an invalid capture input ends a target wait: its registration and wake are revoked and a later byte drop wakes nothing',async()=>{
 const f=stillMap();
 try{
  await f.frame();f.advance();const blocker=f.block(64),before=f.waitRows();
  await f.frame(wide);assert.equal(f.r.stats.waitingForTargetBudget,true);assert.deepEqual(f.waitRows(),{requesters:before.requesters+1,listeners:before.listeners+1,retiring:0});
  f.setRevision('');assert.equal(await f.frame(wide),undefined);assert.equal(f.r.stats.mode,'invalid-capture-input');
  assert.equal(f.r.stats.waitingForTargetBudget,false);assert.deepEqual(f.waitRows(),before,'both registrations are revoked');
  const repaints=f.repaints;blocker.release();await nextTask();assert.equal(f.repaints,repaints,'a later byte drop wakes nothing');assert.equal(f.wanted,false);
  f.setRevision('resident/still/1');const shown=await f.frame(wide);assert.ok(shown?.texture,'a valid input captures again');assert.equal(f.r.stats.mode,'captured');
  assert.equal(await f.frame(wide),shown);assert.equal(f.textureBytes(),B.bytes);
 }finally{f.dispose();}
});
