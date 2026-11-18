import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoader,src,fakeGL,turns,declarationText,evaluateDeclaration} from './support/core-solar-program-modules.mjs';
// delegated500's capture loops after R2 (core-solar-program): a held ledger wait
// gives the visit's one compile slot back, so a key the slot later skips waits
// behind a ready or started compile, never behind that wake. It is ordinary
// pending: only the held key counts as budgetWaiting and the visit keeps its
// frame request (the solar layer reads solarShadowPreparationNeedsFrame; the
// reflection path requests the renderer's own frame). Before this recount a
// skipped key counted as budgetWaiting once any held wait was seen, so behind an
// already linked program the visit read as held-only and asked for no frame:
// the capture-chain group merge passes that count on to both cores.
// The renderer's real prepareSolarPrograms and preparePlanarReflection,
// evaluated over the real owner, page ledger, store and scheduler on a fake context.
const load=createLoader();
const core=load(src('safety','render-runtime','program-preparation.ts')),solar=load(src('safety','solar-shadow-preparation.ts'));
const {createResourceBudget}=load(src('safety','render-runtime','resource-budget.ts'));
const {createChunkResourceStore,bindChunkResourceContext}=load(src('safety','render-runtime','chunk-resource-store.ts'));
const {createProgramPreparationOwner,isProgramPreparationPending}=core;
const delegatedRenderer=src('painted','delegated500','safety','building-mesh-renderer.ts');

function fixture(limitBytes=4096){
 const budget=createResourceBudget({limitBytes,recentLimitBytes:0}),store=createChunkResourceStore({budget}),{gl}=fakeGL();bindChunkResourceContext(gl,store);
 return{budget,store,gl,block:free=>budget.reserve({category:'construction',bytes:budget.stats.availableBytes-free,precision:'exact',label:'fixture ledger pressure'})};
}
// A recipe's claim is its source bound plus a 128 B linked-program allowance.
const recipe=(resource,bytes=256)=>({resource,priority:'capture',inputs:['input:'+resource],budget:{sourceBytesUpperBound:bytes,submittedAllowanceBytes:128},build:()=>({vertex:'vertex '+resource,fragment:'fragment '+resource,attributes:['a_position']})});
function delegatedScope(f,owner,keys,sizes){
 const state={
  createSolarShadowPreparationBudget:solar.createSolarShadowPreparationBudget,solarShadowPreparation:solar.solarShadowPreparation,isProgramPreparationPending,
  pruneProgramPreparation(){},solarCaptureToken:'r2-recount',currentFamilyPrograms:false,legacySolarPartitions:true,paintMode:()=>2,destroyed:false,pageHidden:false,enabled:true,sceneIndexCount:()=>3,opacityContext:'default',opacity:1,needsBirth:false,birth:new Set(),
  gl:f.gl,gpuReady:()=>true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[.5,.5]},baseSurfaceFragment:'helper',surfaceFragment:'helper',diffuseFragment:'diffuse',solarDepthHelper:'helper',releaseSolarDepth(){},berlinCurrent:false,
  prepareFamilyCasters(){throw Error('the family caster path is not under test');},compileGeometryProgram(){throw Error('the whole-city program is not under test');},
  trimSolarCasterState:()=>keys,partitionPrograms:new Map(),casterFailures:new Map(),programPreparation:owner,BERLIN_FULL_CURRENT_CAPTURE_KEY:'berlin-full-current',
  compilePartitionProgram:(helper,key)=>owner.compile(f.gl,recipe(key,sizes[key])),materialRecipeRevision:1,solarDepthRevision:0,
  selectPhysicalReflection:()=>({plan:keys.map(program=>({program})),triangles:3*keys.length,draws:keys.length}),activeCaptureProgramKeys:()=>new Set(),retireCapturePrograms(){},reflectionDemandKeys:new Set(),reflectionDemandPlanned:false,reflectionCaptureToken:'r2-recount',geometryUploadPending:false,
  reflectionKeyProgram:key=>state.partitionPrograms.get(key),reflectionProgramFailures:new Map(),reflectionResidentRevision:0,repaints:0,map:{triggerRepaint(){state.repaints++;}},prepareChunkMasks:()=>({ready:true}),sceneChunks:[],residentCaptureAdapter:()=>({snapshot:()=>({status:'active',bindingsReady:()=>true})}),
 };
 state.prepareSolarPrograms=evaluateDeclaration(declarationText(delegatedRenderer,'prepareSolarPrograms'),state);
 state.preparePlanarReflection=evaluateDeclaration(declarationText(delegatedRenderer,'preparePlanarReflection'),state);
 return state;
}
const visits={
 solar:S=>{const result=S.prepareSolarPrograms();return{result,needsFrame:solar.solarShadowPreparationNeedsFrame(result)};},
 reflection:S=>{const repaints=S.repaints,result=S.preparePlanarReflection({gl:S.gl});return{result,needsFrame:S.repaints>repaints};},
};
for(const [kind,visit]of Object.entries(visits))for(const slot of ['ready','started'])test(`delegated500 ${kind}: behind a held wait, the key the slot skips after ${slot==='ready'?'an already linked program':'a started compile'} is ordinary pending and the visit keeps its frame`,()=>{
 const t=turns(),f=fixture();
 const owner=createProgramPreparationOwner('delegated500 r2 recount fixture',()=>{}),sizes={big:3000,'small-a':256,'small-b':256},S=delegatedScope(f,owner,Object.keys(sizes),sizes);
 try{
  if(slot==='ready'){assert.throws(()=>owner.compile(f.gl,recipe('small-a',256)),error=>isProgramPreparationPending(error));t.all();}
  const blocker=f.block(1000);
  try{
   const {result,needsFrame}=visit(S);
   assert.equal(owner.waitingForBudget,true,'the big key holds the owner wake');
   if(slot==='ready')assert.deepEqual({ready:result.ready,pending:result.pending,failed:result.failed,budgetWaiting:result.budgetWaiting},{ready:1,pending:2,failed:0,budgetWaiting:1},'only the held key is budget waiting: '+JSON.stringify(result));
   else assert.deepEqual({ready:result.ready,pending:result.pending,failed:result.failed,budgetWaiting:result.budgetWaiting},{ready:0,pending:3,failed:0,budgetWaiting:1},'only the held key is budget waiting: '+JSON.stringify(result));
   assert.equal(needsFrame,true,'the skipped key keeps the frame request');
  }finally{blocker.release();}
 }finally{owner.dispose();t.all();t.restore();f.store.collectRetired();f.store.destroy();}
});
