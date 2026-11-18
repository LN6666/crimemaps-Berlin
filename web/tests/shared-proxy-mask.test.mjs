import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const {outputFiles}=await build({stdin:{contents:"export * from './src/safety/facade-rathaus-proxy-mask';export {getPageChunkResourceStore} from './src/safety/render-runtime/chunk-resource-store';",resolveDir:new URL('..',import.meta.url).pathname,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {createRathausProxyMasks,getPageChunkResourceStore}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text+'\n//# sourceURL=shared-proxy-mask-runtime.mjs').toString('base64'));
function context(){
 const originalGeneric={},originalIndexed={},state={generic:originalGeneric,indexed:originalIndexed,lost:false,create:0,upload:0,deleted:[],fail:false,silentFail:false,storage:new WeakMap()};
 const gl={INVALID_INDEX:0xffffffff,MAX_UNIFORM_BUFFER_BINDINGS:1,UNIFORM_BUFFER_BINDING:2,UNIFORM_BUFFER:3,DYNAMIC_DRAW:4,BUFFER_SIZE:5,
  SYNC_GPU_COMMANDS_COMPLETE:101,ALREADY_SIGNALED:102,CONDITION_SATISFIED:103,WAIT_FAILED:104,
  fenceSync:()=>({}),flush(){},clientWaitSync:()=>102,deleteSync(){},
  isContextLost:()=>state.lost,getUniformBlockIndex:p=>p.active?0:0xffffffff,
  getParameter:k=>k===1?24:state.generic,getIndexedParameter:()=>state.indexed,
  createBuffer(){state.create++;return state.fail?null:{};},deleteBuffer:b=>state.deleted.push(b),
  bindBuffer:(_t,b)=>{state.generic=b;},bindBufferBase:(_t,_i,b)=>{state.indexed=b;},uniformBlockBinding(){},
  getBufferParameter:()=>state.storage.get(state.generic)??0,
  bufferData(_target,data){state.upload++;state.lastWords=[...data];if(state.fail)throw Error('upload failed');if(!state.silentFail)state.storage.set(state.generic,data.byteLength);}};
 return{gl,state,originalGeneric,originalIndexed};
}
const active={active:true},inactive={active:false};
test('nineteen chunk masks share the linked layout of each material and restore the caller’s live bindings',()=>{
 const {gl,state}=context(),masks=Array.from({length:19},()=>createRathausProxyMasks());
 const programs=Array.from({length:32},(_,i)=>({active:i%2===0}));
 let indices=0,limits=0,draws=0;
 const index=gl.getUniformBlockIndex,parameter=gl.getParameter;
 gl.getUniformBlockIndex=(...args)=>{indices++;return index(...args);};
 gl.getParameter=key=>{if(key===gl.MAX_UNIFORM_BUFFER_BINDINGS)limits++;return parameter(key);};
 try{
  for(const mask of masks)assert.equal(mask.prepare(gl,programs).ready,true);
  for(let frame=0;frame<2;frame++){
   for(const mask of masks)for(const program of programs){
    const generic={},indexed={};state.generic=generic;state.indexed=indexed;
    assert.equal(mask.withResidentMasks(gl,program,()=>draws++),true);
    assert.equal(state.generic,generic);assert.equal(state.indexed,indexed);
   }
   assert.equal(indices,32);assert.equal(limits,16);
  }
  assert.equal(draws,2*19*32);
  assert.equal(masks[0].isResident(gl,{active:true}),true);
  assert.equal(indices,33,'a newly linked program must query its own block');
 }finally{for(const mask of masks)mask.destroy();}
});
test('the complete program set prepares a zero-mask block once and capture never uploads',()=>{
 const m=createRathausProxyMasks(),c=context();let draws=0;
 assert.equal(m.isResident(c.gl,active),false);
 assert.equal(m.withResidentMasks(c.gl,active,()=>draws++),false);
 assert.deepEqual(m.prepare(c.gl,[inactive,active,active]),{ready:true});
 assert.equal(c.state.create,1);assert.equal(c.state.upload,1);
 assert.equal(c.state.generic,c.originalGeneric);assert.equal(c.state.indexed,c.originalIndexed);
 assert.equal(m.withResidentMasks(c.gl,active,()=>draws++),true);
 assert.deepEqual(m.prepare(c.gl,[active]),{ready:true});
 assert.equal(draws,1);assert.equal(c.state.upload,1);
});
test('configuration invalidates residency before any capture; prepare advances only the uploaded version',()=>{
 const m=createRathausProxyMasks(),c=context();m.prepare(c.gl,[active]);const initial=m.residentRevision;
 m.configure([],new Float32Array());assert.notEqual(m.residentRevision,initial);
 assert.equal(m.isResident(c.gl,active),false);assert.equal(m.withResidentMasks(c.gl,active,()=>assert.fail('stale draw')),false);
 assert.equal(c.state.upload,1);assert.equal(m.prepare(c.gl,[active]).ready,true);
 assert.equal(c.state.upload,2);assert.equal(m.isResident(c.gl,active),true);
});
test('inactive shader blocks require no GPU allocation',()=>{
 const m=createRathausProxyMasks(),c=context();let drawn=false;
 assert.equal(m.prepare(c.gl,[inactive]).ready,true);assert.equal(m.isResident(c.gl,inactive),true);
 m.withResidentMasks(c.gl,inactive,()=>{drawn=true;});assert(drawn);assert.equal(c.state.create,0);assert.equal(c.state.upload,0);
});
test('switching contexts releases old ownership once and destroy is idempotent',()=>{
 const m=createRathausProxyMasks(),a=context(),b=context();m.prepare(a.gl,[active]);m.prepare(b.gl,[active]);
 assert.equal(a.state.deleted.length,1);assert.equal(m.isResident(a.gl,active),false);assert.equal(m.isResident(b.gl,active),true);
 m.detach();m.detach();assert.equal(b.state.deleted.length,1);assert.equal(m.stats.allocatedGPUBytes,0);
});
test('allocation failure stays unready and returns a bounded reason; recovery may retry',()=>{
 const m=createRathausProxyMasks(),c=context();c.state.fail=true;
 const result=m.prepare(c.gl,[active]);assert.equal(result.ready,false);assert.match(result.reason,/mask-prepare/);
 assert.equal(m.withResidentMasks(c.gl,active,()=>assert.fail('failed draw')),false);
 c.state.fail=false;assert.equal(m.prepare(c.gl,[active]).ready,true);
});
test('draw exceptions restore bindings; loss drops handles without deleting lost GPU resources',()=>{
 const m=createRathausProxyMasks(),c=context();m.prepare(c.gl,[active]);
 assert.throws(()=>m.withResidentMasks(c.gl,active,()=>{throw Error('draw failed');}),/draw failed/);
 assert.equal(c.state.generic,c.originalGeneric);assert.equal(c.state.indexed,c.originalIndexed);
 c.state.lost=true;assert.equal(m.prepare(c.gl,[active]).ready,false);m.detach();assert.equal(c.state.deleted.length,0);
 c.state.lost=false;assert.equal(m.isResident(c.gl,active),false);assert.equal(m.prepare(c.gl,[active]).ready,true);assert.equal(c.state.upload,2);
});

test('non-throwing storage allocation failure cannot certify a new version',()=>{
 // Versions are page chunk-store leases: the previous successful version stays
 // alive while any consumer (here a retained capture) holds it and is retired
 // when its last consumer leaves, not kept idle until a later replacement.
 const m=createRathausProxyMasks(),c=context();m.prepare(c.gl,[active]);const held=m.retain();m.configure([],new Float32Array());
 assert.equal(c.state.deleted.length,0,'a retained capture keeps the previous successful version');assert.equal(held.isResident(c.gl,active),true);
 held.release();assert.equal(c.state.deleted.length,1,'the last consumer retires the previous successful version');
 c.state.silentFail=true;assert.equal(m.prepare(c.gl,[active]).ready,false);assert.equal(m.isResident(c.gl,active),false);
 assert.equal(c.state.deleted.length,2,'only failed staged buffer is deleted');assert.equal(c.state.generic,c.originalGeneric);
 c.state.silentFail=false;assert.equal(m.prepare(c.gl,[active]).ready,true);assert.equal(m.isResident(c.gl,active),true);assert.equal(c.state.deleted.length,2,'the successful replacement retires nothing else');
});
test('context loss while querying an inactive uniform block cannot become ready',()=>{
 const m=createRathausProxyMasks(),c=context();c.gl.getUniformBlockIndex=()=>{c.state.lost=true;return c.gl.INVALID_INDEX;};
 assert.deepEqual(m.prepare(c.gl,[inactive]),{ready:false,reason:'context-lost'});assert.equal(m.isResident(c.gl,inactive),false);assert.equal(c.state.create,0);
});

function fullMaskRecipe(){
 const component=(objectId,partId,x0,z0,x1,z1,low,high)=>{
  const ring=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],positions=[],normals=[],indices=[];
  for(let edge=0;edge<4;edge++){
   const [ax,az]=ring[edge],[bx,bz]=ring[edge+1],length=Math.hypot(bx-ax,bz-az),normal=[-(bz-az)/length,0,(bx-ax)/length];
   positions.push(ax,low,az,bx,low,bz,bx,high,bz,ax,high,az);
   for(let k=0;k<4;k++)normals.push(...normal);
   indices.push(...[0,1,2,0,2,3].map(k=>edge*4+k));
  }
  return{city:'munich',objectId,partId,origin:[11.575,48.137],componentGeometry:{type:'Polygon',coordinates:[ring]},displayEstimates:{meshPrecision:{metric_rounding_m:.001}},sourceFeature:{properties:{'building:part':'yes'}},batches:[{positions:new Float32Array([x0,high,z0,x1,high,z0,x1,high,z1]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),indices:new Uint32Array([0,1,2])},{positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices)}]};
 };
 const outline=component('osm/relation/147095','osm/relation/147095/component/5e6b070df42914207582',0,0,10,10,0,10),a=component('osm/way/219431689','part-a',2,0,4,2,2,8),b=component('osm/way/223907239','part-b',6,0,8,2,2,8),paint=new Float32Array(19*5),wall=outline.batches[1];
 for(let i=0;i<16;i++){paint[(i+3)*5]=-wall.normals[i*3+2]*wall.positions[i*3]+wall.normals[i*3]*wall.positions[i*3+2];paint[(i+3)*5+4]=120;}
 const scratch=createRathausProxyMasks();scratch.configure([outline],paint,[outline,a,b]);const recipe=scratch.cpuRecipe();scratch.destroy();
 assert.equal(recipe.masks.length,2);assert.equal(recipe.wordMasks.length,2);
 return{recipe,outline,a,b,paint};
}
function shaderCovered(words,packed,u,y){const bits=packed-Math.floor(packed/10000)*10000,first=Math.floor(bits/32),count=bits%32;for(let i=first;i<first+count;i++){const r=words.slice(i*4,i*4+4);if(u>=r[0]&&u<=r[1]&&y>=r[2]&&y<=r[3])return true;}return false;}

test('full packed mask slots preserve visible fallback walls and match CPU picking without rewriting paint',()=>{
 const store=getPageChunkResourceStore(),baseline=store.budget.stats.bytes,f=fullMaskRecipe(),beforeWords=[...f.recipe.words],beforePaint=[...f.paint],c=context();
 const all=f.recipe.createBinding(),onlyA=f.recipe.createBinding([f.outline,f.a]),onlyB=f.recipe.createBinding([f.b]),none=f.recipe.createBinding([]);
 try{
  assert.equal(store.budget.stats.bytes,baseline+4*2048,'one original recipe and three admitted filtered arrays');
  for(const [binding,aVisible,bVisible]of [[all,true,true],[onlyA,true,false],[onlyB,false,true],[none,false,false]]){
   assert.equal(binding.prepare(c.gl,[active]).ready,true);
   assert.equal(binding.covered(f.outline,3,5,0),aVisible);assert.equal(binding.covered(f.outline,7,5,0),bVisible);
   assert.equal(shaderCovered(c.state.lastWords,f.paint[3*5+4],-3,5),aVisible);
   assert.equal(shaderCovered(c.state.lastWords,f.paint[3*5+4],-7,5),bVisible);
  }
  assert.deepEqual([...f.recipe.words],beforeWords);assert.deepEqual([...f.paint],beforePaint);
 }finally{for(const binding of [all,onlyA,onlyB,none])binding.destroy();f.recipe.release();store.collectRetired();}
 assert.equal(store.budget.stats.bytes,baseline);
});

test('filtered capture pins its original word slots and parent recipe until its last release',()=>{
 const store=getPageChunkResourceStore(),baseline=store.budget.stats.bytes,f=fullMaskRecipe(),c=context(),binding=f.recipe.createBinding([f.a]);
 assert.equal(binding.prepare(c.gl,[active]).ready,true);const held=binding.retain('solar');
 binding.destroy();f.recipe.release();
 assert.equal(store.budget.stats.bytes,baseline+3*2048,'original CPU, filtered CPU and capture UBO remain charged');
 let draws=0;assert.equal(held.withResidentMasks(c.gl,active,()=>draws++),true);assert.equal(draws,1);assert.equal(c.state.upload,1);
 held.release();held.release();store.collectRetired();assert.equal(store.budget.stats.bytes,baseline);assert.equal(c.state.deleted.length,1);
});

test('filtered mask admission failure returns its parent hold and allocates no GPU storage',()=>{
 const store=getPageChunkResourceStore(),baseline=store.budget.stats.bytes,f=fullMaskRecipe(),held=store.budget.reserve({category:'mask',bytes:store.budget.stats.availableBytes,precision:'exact'});
 try{assert.throws(()=>f.recipe.createBinding([f.a]),error=>error.name==='ResourceBudgetExceededError');}
 finally{held.release();f.recipe.release();}
 assert.equal(store.budget.stats.bytes,baseline,'failed copy admission leaves no recipe or copy claim');
});
