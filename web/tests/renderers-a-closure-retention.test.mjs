// What a resident chunk keeps of the renderer that packed it (WAVE3-BACKLOG
// 03:25 Stage 3 Renderers; sweep uncovered[7]). The page store holds each
// lease's onChange while the lease lives, so the listener a renderer passes
// must not capture its per-candidate packing scope: candidate (args, repack,
// finishChunkPack), the batch scope and the builder inputs are collectable once
// the chunk is published and the renderer drops the candidate. Lineage A
// (root500, infill, bremen) now passes its renderer-scope repaintMap, as City
// and Tier300 already did; Church and delegated500 pass no listener at all, and
// their producer is dropped once production settles.
// Run with: node --expose-gc --test tests/renderers-a-closure-retention.test.mjs
//
// Against the pre-change lineage-A renderers (RENDERERS_A_SOURCE_ROOT set to
// the saved copies) the six lineage-A cases fail: the inline listener keeps the
// sentinel, the candidate and the batch scope alive while the chunk is resident.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runtime,page,packingCall,packingScope,rendererValue,writers,packedGroup,materialsFor,collect,alive,context,fixtureMap,tick} from './support/renderers-a-closure.mjs';

const category=(budget,name)=>budget.stats.categories[name]?.bytes??0;

test('premise: the page store keeps a lease onChange for the lease life and drops it with the entry',async()=>{
 const p=page();let {lease,refs}=(()=>{
  const sentinel={payload:new Uint8Array(1<<16)},onChange=()=>void sentinel;
  return{lease:p.store.acquire({contentKey:'premise',role:'candidate',allowRecent:true,estimate:{category:'packed',bytes:64,precision:'exact'},produce:()=>new Uint8Array(64),onChange}),refs:{sentinel:new WeakRef(sentinel),onChange:new WeakRef(onChange)}};
 })();
 await lease.ready;await collect();
 assert.deepEqual(alive(refs),['onChange','sentinel'],'a resident lease keeps its listener and the listener scope');
 lease.release();lease=undefined;p.real.evictRecent();await collect();
 assert.deepEqual(alive(refs),[],'released and evicted, the listener goes');
 p.close();assert.equal(p.budget.stats.bytes,0);
});

// Per-family renderer scope (renderer-level names only) and the per-candidate
// packing locals of each production call.
function rendererValues(provider,p,map){
 const values={map,destroyed:false,city:'bremen',gl:context(),key:c=>c.objectId+'|'+c.partId,
  acquirePackedMeshChunk:runtime.acquirePackedMeshChunk,acquireChunkMeshState:runtime.acquireChunkMeshState,acquirePackedChunk:runtime.acquirePackedChunk,
  retainReconstructionResourceParents:runtime.retainReconstructionResourceParents,
  packChunkMaterials:writers.packChunkMaterials,packBremenChunkMaterials:writers.packBremenChunkMaterials,packTierChunkMaterials:writers.packTierChunkMaterials,
  readRoot500ProgressivelyPainted:()=>false,isProgressivelyPainted:()=>false,readBremenProgressivelyPainted:()=>false,cityData_isProgressivelyPainted:()=>false,
  isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,surfaceStyle:undefined,committingScope:undefined,currentDataScope:undefined,
  familyPaintRuns:writers.runs,paintProgramRuns:writers.runs,paintProgramKey:()=>'base',currentPaintProgramKey:'base',chunkStyles:writers.styles,
  sourceRoleBatchIncluded:()=>true,s434AggregateBatchIncluded:()=>true,s434DisplayProfile:null,
  chunkStateOwner:provider+':state',bremenStateOwner:'bremen:state',cityStateOwner:'city:state',tierStateOwner:'tier300:state',
  buildChurchPackedGroup:group=>packedGroup(group),buildGroup:group=>packedGroup(group)};
 values.repaintMap=rendererValue(provider,'repaintMap',values);
 return values;
}
const packLocals={
 root500:(p,s)=>({dependencies:{store:p.store},context:context(),group:p.group,included:new Map(),scope:s.scope,repairReady:false,sourceRows:[...p.components],cohortComponents:[...p.components],plans:{sourceRows:[...p.components]},legacy:false,prepared:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
 bremen:(p,s)=>({dependencies:{store:p.store},admissionContext:context(),sourceKeys:new Map(),group:p.group,diagnosticCosts:{metadata:64,construction:64},sourceScope:s.scope,packingProfile:null,s434Entries:[],sourceRows:[...p.components],staticComponents:[...p.components],partialGatePlan:undefined,s402Plan:undefined,s036Plan:undefined,s240Plan:undefined,f151Plan:undefined,legacy:false,prepared:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
 city:(p,s)=>({input:{store:p.store},group:p.group,profile:null,s434Entries:[],physicalEntries:[],material:{...materialsFor(p.components),geometry:undefined},scope:s.scope,prepared:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
 tier300:(p,s)=>({input:{store:p.store},packingContext:context(),group:p.group,selected:[...p.components],physical:[...p.components],physicalEntries:[],profile:null,s434Entries:[],sourceScope:s.scope,repairRaw:[],accepted:[...p.components],flags:{},partialGatePlan:undefined,s402Plan:undefined,s434Plan:undefined,s036Plan:undefined,s240Plan:undefined,s528Binding:undefined,packingData:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
};
packLocals.infill=(p,s)=>({...packLocals.root500(p,s),admissionStore:p.store,admissionContext:context()});
const PACKERS={root500:'startChunkPacking',infill:'acquireGroups',bremen:'packCandidate',city:'buildBatches',tier300:'packBatches'};
const PACKING_INITIALIZERS={root500:['reconstructionParents'],infill:['reconstructionParents'],city:['physicalBatchIncluded'],tier300:['physicalBatchIncluded']};
const STATE_OWNERS={root500:'finishCandidateChunkPacking',infill:'finishCandidateChunkPacking',bremen:'prepareCandidate',city:'buildBatches',tier300:'packBatches'};
const stateLocals={
 root500:(p,s,cpu)=>({dependencies:{store:p.store},context:context(),chunk:{cpu},candidate:Object.assign(s.candidate,{signal:undefined}),sentinel:s.sentinel,scope:s.scope}),
 bremen:(p,s,cpu)=>({candidate:Object.assign(s.candidate,{chunkDependencies:{store:p.store},signal:undefined}),context:context(),chunk:{cpu},sentinel:s.sentinel,scope:s.scope}),
 city:(p,s,cpu)=>({input:{store:p.store},chunk:{cpu},prepared:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
 tier300:(p,s,cpu)=>({input:{store:p.store},chunk:{cpu},packingData:{scope:s.scope,signal:undefined},candidate:s.candidate,sentinel:s.sentinel}),
};
stateLocals.infill=stateLocals.root500;

for(const provider of ['root500','infill','bremen','city','tier300']){
 test(`${provider}: a resident packed chunk and its dynamic state keep neither the candidate nor the packing scope; their listener is the renderer repaintMap`,async()=>{
  const p=page(),map=fixtureMap(),values=rendererValues(provider,p,map);
  // Packing, inside one per-candidate scope the test then drops.
  const packed=(()=>{const s=packingScope(provider+' packing scope');return{lease:packingCall(provider,'acquirePackedMeshChunk',PACKERS[provider],packLocals[provider](p,s),values,0,PACKING_INITIALIZERS[provider]),refs:s.refs};})();
  await packed.lease.ready;assert.equal(packed.lease.state,'ready');
  // Chunk state, made by the candidate that finishes packing.
  const state=(()=>{const s=packingScope(provider+' state scope');return{lease:packingCall(provider,'acquireChunkMeshState',STATE_OWNERS[provider],stateLocals[provider](p,s,packed.lease),values),refs:s.refs};})();
  await state.lease.ready;assert.equal(state.lease.state,'ready');
  // The candidate is published and dropped; both leases stay resident.
  await collect();
  assert.deepEqual({packing:alive(packed.refs),state:alive(state.refs)},{packing:[],state:[]},'candidate (args, repack, finishChunkPack), batch scope and builder inputs are collectable');
  assert.equal(typeof values.repaintMap,'function',provider+' declares a renderer-scope repaintMap');
  assert.equal(p.requests.length,2);
  for(const request of p.requests)assert.equal(request.onChange?.deref(),values.repaintMap,'each lease listens through the renderer-scope repaintMap');
  assert.equal(packed.lease.state,'ready');assert.equal(state.lease.state,'ready');assert.ok(category(p.budget,'packed')>0);
  // The listener still repaints the map, once per call; lineage A stops after destroy.
  const repaints=map.repaints;values.repaintMap();assert.equal(map.repaints,repaints+1);
  if(provider==='root500'||provider==='infill'){values.destroyed=true;values.repaintMap();assert.equal(map.repaints,repaints+1,'a destroyed renderer requests no frame');}
  state.lease.release();packed.lease.release();p.real.evictRecent();p.close();
  assert.equal(p.budget.stats.bytes,0,'the ledger returns to zero');
 });
}

// Church and delegated500 pass no store listener; their producer (which
// captures the packing scope) is dropped once production settles.
const churchLocals=(p,s)=>({source:{store:p.store},physical:p.components,contentKey:'church-fixture',estimate:4096,group:{...p.group,source:p.group.source},drawable:[...p.components],signal:undefined,candidate:s.candidate,sentinel:s.sentinel,scope:s.scope});
const delegatedLocals=(p,s)=>({bindings:{store:p.store},contentKey:'delegated500-fixture',estimate:4096,group:{...p.group,source:p.group.source},productionData:{signal:undefined,scope:s.scope},preparingChunkProduction:true,candidate:s.candidate,sentinel:s.sentinel});
for(const [provider,inFunction,locals] of [['church','prepareBatches',churchLocals],['delegated500','packResidentBatchesSteps',delegatedLocals]]){
 test(`${provider}: a resident packed chunk keeps neither its producer nor the candidate scope, and registers no listener`,async()=>{
  const p=page(),map=fixtureMap(),values=rendererValues(provider,p,map);
  const packed=(()=>{const s=packingScope(provider+' packing scope');return{lease:packingCall(provider,'acquirePackedChunk',inFunction,locals(p,s),values),refs:s.refs};})();
  await packed.lease.ready;await tick();assert.equal(packed.lease.state,'ready');
  assert.equal(p.requests.length,1);assert.equal(p.requests[0].hasOnChange,false,'no store listener');
  await collect();
  assert.deepEqual(alive(packed.refs),[],'candidate, batch scope and the producer scope are collectable while the chunk is resident');
  assert.equal(map.repaints,0);
  packed.lease.release();p.real.evictRecent();p.close();
  assert.equal(p.budget.stats.bytes,0,'the ledger returns to zero');
 });
}
