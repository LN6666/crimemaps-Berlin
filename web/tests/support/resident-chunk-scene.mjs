// Shared fixtures for renderer capture tests that evaluate actual renderer
// closures over a resident scene.
//
// The renderers no longer draw one global VAO/index buffer: every consumer reads
// the published physical chunks (`sceneChunks`), their global spans
// (`sceneSpans`) and the published geometry scene of the renderer's
// ResidentGeometryOwner. This module derives exactly that resident state from a
// fixture's original component rows (`values.loaded`), packed index count
// (`values.indices`) and VAO handle (`values.vao`):
//
// - one physical chunk per publication, anchored at the fixture's existing
//   global anchor/unit, so local and global index ranges coincide;
// - its GPU geometry is a real page-store allocation published through the
//   actual createResidentGeometryOwner (allocation creation itself issues no GL
//   call; its value is the fixture's existing VAO handle);
// - each structural change of the rows, index count, VAO or anchor/unit frame
//   is a new publication (new content key, new scene version), never an
//   in-place rewrite; in-place edits of a row (range, box) stay visible because
//   the chunk holds the fixture's own row objects;
// - chunk masks are pinned through `retain(role)` or synchronous `retainReady(role)`
//   and read the fixture's current
//   `values.rathausProxyMasks`, so a test replacing that binding (or one of its
//   methods) is observed by every pinned capture;
// - stand-in program handles that a fixture placed directly in resident maps are
//   lent through counted loans; programs actually compiled by the production
//   preparation owner still use its own retainProgram.
//
// Nothing here substitutes a renderer function: renderer closures are still
// extracted from the current renderer source by each test.

export const componentKey=component=>component.objectId+'|'+component.partId;

/** Rows keyed by the renderer's own component key. */
export function keyedComponents(rows){return new Map(rows.map(row=>[componentKey(row),row]));}

export function createFixtureResourceStore(runtime,gl,{limitBytes=64*1024*1024}={}){
 const budget=runtime.resourceBudget.createResourceBudget({limitBytes,recentLimitBytes:0});
 const store=runtime.chunkResourceStore.createChunkResourceStore({budget});
 runtime.chunkResourceStore.bindChunkResourceContext(gl,store);
 return store;
}

/**
 * Counted loans for program handles that a fixture installed as resident
 * programs without compiling them. `compiled` names programs produced by the
 * production preparation owner; those keep the owner's own grant checks.
 */
export function residentProgramLoans(owner,compiled=new WeakSet(),{lost=()=>Error('Capture borrowed a program on a lost context')}={}){
 const loans=new Map();let issued=0,returned=0;
 const lend=(context,program)=>{
  if(!program)throw Error('Capture borrowed a missing program');
  if(compiled.has(program))return owner.retainProgram(context,program);
  // Same refusal as the production owner for a lost context.
  if(context.isContextLost?.())throw lost();
  loans.set(program,(loans.get(program)??0)+1);issued++;let live=true;
  return()=>{if(!live)return;live=false;returned++;const count=loans.get(program)-1;if(count)loans.set(program,count);else loans.delete(program);};
 };
 const stats={get outstanding(){let n=0;for(const count of loans.values())n+=count;return n;},get issued(){return issued;},get returned(){return returned;}};
 const view=new Proxy(owner,{get(target,key){if(key==='retainProgram')return lend;if(key==='fixtureLoans')return stats;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 return{owner:view,stats,compiled};
}

/** A mask binding whose pins read the fixture's current mask object. */
function delegatingMasks(values,pins){
 const current=()=>values.rathausProxyMasks;
 const retainLegacy=(readyOnly=false)=>{let live=true;pins.count++;const pin={
  prepare(gl,programs){return live?current().prepare(gl,programs):{ready:false,reason:'mask-lease-released'};},
  isResident(gl,program){return live&&current().isResident(gl,program);},
  withResidentMasks(gl,program,draw){return live&&current().withResidentMasks(gl,program,draw);},
  get residentRevision(){return current().residentRevision;},get origin(){return current().origin;},
  release(){if(!live)return;live=false;pins.count--;},
 };if(readyOnly)delete pin.prepare;return pin;};
 return new Proxy({},{get(_target,key){
  const masks=current();
  if(key==='retain'||key==='retainReady'){
   if(typeof masks[key]==='function')return role=>{const pin=masks[key](role);pins.count++;let live=true;return new Proxy(pin,{get(target,name){if(name==='release')return()=>{if(!live)return;live=false;pins.count--;target.release();};const value=Reflect.get(target,name,target);return typeof value==='function'?value.bind(target):value;}});};
   return()=>retainLegacy(key==='retainReady');
  }
  const value=masks?.[key];return typeof value==='function'?value.bind(masks):value;
 }});
}

/**
 * Installs `sceneChunks`, `sceneSpans` and the provider's geometry owner on
 * `values`. Returns diagnostics for the fixture.
 */
export function installResidentChunkScene(values,{provider,runtime,gl,store,ownerName='geometryOwner'}){
 const owner=runtime.residentGeometry.createResidentGeometryOwner({store,owner:provider+' reflection fixture'});
 const pins={count:0},masks=delegatingMasks(values,pins),assigned=new Map();
 let state,serial=0,publications=0;
 const signature=()=>{const loaded=values.loaded,indices=values.indices;return{loaded,indices,vao:values.vao,keys:[...loaded.values()].map(componentKey).join('\n'),count:indices.length,frame:JSON.stringify([...values.anchor,values.anchorUnit])};};
 const same=(a,b)=>a.loaded===b.loaded&&a.indices===b.indices&&a.vao===b.vao&&a.keys===b.keys&&a.count===b.count&&a.frame===b.frame;
 const metadata={get c311Display(){return values.c311Display;},get c312Display(){return values.c312Display;},get c313Display(){return values.c313Display;}};
 function publish(next){
  const epoch=store.contextEpoch(gl),contentKey=provider+'-reflection-fixture-'+ ++serial,previous=state;
  let chunk,lease;
  if(next.count){
   lease=store.acquireGpu({contentKey,context:gl,epoch,role:'candidate',estimate:{category:'gpu-buffer',bytes:next.indices.byteLength||4,precision:'exact'},
    create:()=>({vao:next.vao,indexBuffer:{fixtureIndexBuffer:contentKey},buffers:new Map(),context:gl,epoch}),dispose(){}});
   const frame={origin:[0,0],unit:values.anchorUnit,authority:'reflection-fixture'},anchor=[...values.anchor];
   const packed={contentKey,anchor,indices:next.indices,frame};
   chunk={contentKey,anchor,unit:frame.unit,source:{contentKey,frame,parents:[],cohortKeys:[]},cpu:{contentKey,state:'ready',released:false,value:packed},
    geometry:lease,loaded:new Map([...next.loaded.values()].map(row=>[componentKey(row),row])),masks,material:{state:'ready',value:{metadata}},
    runs:[],firstIndex:0,firstVertex:0,stateData:new Float32Array(),shadowIndices:new Uint32Array()};
  }
  if(!owner.publish(lease?[lease]:[],{context:gl,epoch}))throw Error('reflection fixture scene was not published');
  publications++;
  state={signature:next,chunks:chunk?[chunk]:[],spans:chunk?[{chunk,firstIndex:0,indexCount:next.count,localFirstIndex:0}]:[],lease};
  // The old chunk role ends after the new scene is current; a capture that
  // pinned the old publication keeps its own scene role until it ends.
  previous?.lease?.release();
  assigned.clear();
  return state;
 }
 const current=()=>state&&same(state.signature,signature())?state:publish(signature());
 for(const [name,read]of [['sceneChunks',()=>current().chunks],['sceneSpans',()=>current().spans]])
  Object.defineProperty(values,name,{configurable:true,enumerable:true,get(){return assigned.has(name)?assigned.get(name):read();},set(value){assigned.set(name,value);}});
 values[ownerName]=owner;
 current();
 return{owner,get publications(){return publications;},get maskPins(){return pins.count;},refresh:current,
  release(){state?.lease?.release();state=undefined;owner.release();}};
}
