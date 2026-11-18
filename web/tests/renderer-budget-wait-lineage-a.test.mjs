import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PROVIDERS,runtime,rendererText,sourceOf,evaluate,install,statement,turns,mockGL,ledger,recipe,fixtureMap,web} from './support/renderers-lineage-a-harness.mjs';

// Lineage-a renderers (root500, infill, bremen), actual production functions:
// a compile attempt answered with a page-ledger wait whose onAvailable wake the
// program owner holds requests no caller frame; that wake requests exactly one;
// every other pending (queued compile, escaped non-budget pending, any other
// not-ready cause) keeps requesting frames. Capture preparation reports such
// waits as budgetWaiting. The projected shadow mask is woken through the map and
// withdraws its ledger wait when it is not drawn.
const {createProgramPreparationOwner,isProgramPreparationPending,isProgramPreparationBudgetWait,ProgramPreparationPending,ProgramPreparationFailure,solarShadowPreparation,prepareSolarShadowResources,solarShadowPreparationNeedsFrame,createSolarShadowPreparationBudget,createProjectedShadowMask}=runtime;
const ts=createRequire(new URL('../package.json',import.meta.url))('typescript');
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],topDown=[1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1];

/** The renderer's own program owner (its production initializer and repaint). */
function owner(provider,values){values.createProgramPreparationOwner=createProgramPreparationOwner;values.programPreparation=evaluate(sourceOf(provider,'programPreparation',{kind:'variable'}),values);return values.programPreparation;}
function common(provider,{free,limitBytes=1<<20,sizes={}}={}){
 const gl=mockGL(),{budget,blocker}=ledger(gl,{limitBytes,free}),map=fixtureMap(),t=turns(),values={};
 Object.assign(values,{gl,map,city:'berlin',destroyed:false,pageHidden:false,enabled:true,isProgramPreparationPending,ProgramPreparationPending,ProgramPreparationFailure,solarShadowPreparation,prepareSolarShadowResources,
  familySource:key=>({sourceKey:key,families:[1]}),pruneFamilySource:()=>false,partitionCompileAttempt:undefined,
  compileGeometryProgram:(_helper,sourceKey)=>{const value=recipe(provider,sourceKey,sizes[sourceKey]??4096);return values.programPreparation.acquireReadyProgram(gl,value)??values.programPreparation.compile(gl,value);}});
 owner(provider,values);
 /** Refuse one more exact recipe on the ledger and let the held wait escape. */
 const heldWait=key=>{try{values.programPreparation.compile(gl,recipe(provider,key,sizes[key]??4096));}catch(error){assert(isProgramPreparationBudgetWait(error)&&error.waiting,'fixture recipe is answered with a held ledger wait');throw error;}assert.fail('fixture recipe was admitted');};
 return{gl,budget,blocker,map,t,values,heldWait};
}

/** Resident main preparation: root500/infill decide the frame inside prepareResidentMain; bremen in its callers. */
function mainFixture(provider,options){
 const f=common(provider,options),{values,gl,map}=f,plan={identity:'fixture-plan',id:1,legacy:false,partitionEnabled:true};
 Object.assign(values,{publishedProgramPlan:plan,residentProgramPlan:plan,currentDataScope:{},configuredDataScope:{},candidateMainMatrix:identity,candidateMainProjection:identity,matrix:undefined,anchorUnit:1,anchor:[0,0],multiply:(_a,b)=>b,
  partitionEnabled:true,paintMode:()=>2,paintOverride:()=>0,mainPaintRuns:()=>[{key:'k1'}],activeFamilyKey:key=>key,mainPaintKeys:()=>new Set(['k1']),capturePaintKeys:()=>new Set(),mainMaskChunks:()=>[],residentMainMaskChunks:[],residentMainRequiredKeys:undefined,residentMainRequiredStamp:undefined,
  mainPreparationStamp:()=>'stamp',candidateMainViewStamp:()=>'stamp',residentResetRevision:0,partitionVisibleKeys:[],pruneGeometryRecipeConsumers(){},syncFacadeResources(){},mainGPUIncarnation:0,program:undefined,texturedProgram:undefined,diffuseProgram:undefined,textureShaderFailure:undefined,diffuseShaderFailure:undefined,textureShaderAttempted:false,diffuseShaderAttempted:false,
  forgetCaptureRole(){},partitionPrograms:new Map(),landmarkVisible:false,residentMaterialStyles:[],chunkMainMasks:()=>({prepare:()=>({ready:true}),isResident:()=>true}),prepareBremenMasks:()=>({ready:true}),sceneChunks:[],geometryUploadRevision:0,residentMainPreparedStamp:undefined,residentMainFailureStamp:undefined,
  partitionFailures:new Map(),partitionPending:false,invalidateMainDraw(){},residentMainFailure:undefined,mainGeometryProgramFailure:undefined,contextRecoveryFailure:undefined,contextRecoveryPending:false,solarProgramFailures:new Map(),clearSettledProgramSources(){},pendingCandidate:undefined,candidateGrantHandoff:{clear(){}},
  baseSurfaceFragment:'base helper',surfaceFragment:undefined,diffuseFragment:undefined,windowTexture:undefined,diffuseTexture:undefined,acquireGeometryProgram:()=>undefined,
  releaseGPU(){},geometryOwner:{currentLeases:[{}]},geometryUploadPending:false,upload(){}});
 if(provider==='bremen'){install(provider,values,['mainProgramRevisitEligible','releaseOwnedProgram'],'variable');install(provider,values,['releaseInactivePaintProgram']);}
 install(provider,values,provider==='bremen'?['prepareMainPrograms','prepareResidentMain','initializeResidentGPU']:['mainTexturesReady','prepareMainPrograms','prepareResidentMain']);
 // One resident main frame: bremen's initializer is the caller that decides.
 f.frame=()=>f.t.turn(()=>provider==='bremen'?(values.initializeResidentGPU(gl,false),values.program!==undefined&&values.partitionPrograms.has('k1')&&values.residentMainPreparedStamp==='stamp'):values.prepareResidentMain(gl));
 f.settle=()=>{for(let i=0;i<12;i++){if(f.frame())return true;f.t.drain();}return false;};
 return f;
}

for(const provider of PROVIDERS){
 test(`${provider}: a held ledger wait requests no frame, its wake exactly one, and admitted work keeps frames until ready`,()=>{
  const f=mainFixture(provider,{free:1000}),owner=f.values.programPreparation,listeners=f.budget.stats.availabilityListeners;
  assert.equal(f.frame(),false);
  assert.equal(f.map.repaints,0,'base and family recipes both wait on the ledger: no caller frame');
  assert.equal(owner.waitingForBudget,true);assert.equal(owner.budgetWaits,2,'each refused recipe is one counted held wait');
  assert.equal(f.budget.stats.availabilityListeners,listeners+1,'one owner wake');
  assert.equal(f.frame(),false);assert.equal(f.map.repaints,0,'a later poll inside the wait requests no frame either');assert.equal(owner.budgetWaits,4);
  f.blocker.release();
  assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');assert.equal(owner.waitingForBudget,false);
  const before=f.map.repaints;assert.equal(f.frame(),false);
  assert.equal(f.map.repaints,before+1,'admitted compiles queued in the scheduler are a non-budget pending and request a frame');
  assert.equal(owner.budgetWaits,4,'no further ledger refusal after the wake');
  assert.equal(f.settle(),true,'the woken preparation completes');
 });

 test(`${provider}: non-budget and mixed pendings still request a frame on every attempt`,()=>{
  {
   const f=mainFixture(provider);
   assert.equal(f.frame(),false);assert.equal(f.map.repaints,1,'queued compile work requests a frame');
   assert.equal(f.frame(),false);assert.equal(f.map.repaints,2,'and again on the next attempt');
   assert.equal(f.values.programPreparation.budgetWaits,0);
  }
  {
   // The base recipe fits and queues; the family recipe waits on the ledger. The base
   // recipe's admission now includes its linked program's policy estimate (256 KiB,
   // DECISIONS 2026-11-02 03:25), so the free room covers that estimate as well.
   const f=mainFixture(provider,{free:100000+262144,sizes:{k1:600000}}),owner=f.values.programPreparation;
   assert.equal(f.frame(),false);
   assert.equal(owner.budgetWaits,1);assert.equal(owner.waitingForBudget,true);
   assert.equal(f.map.repaints,1,'a held wait beside queued work still requests the queued work its frame');
  }
 });

 test(`${provider}: an escaped pending in context recovery is judged by the owner's held wait`,()=>{
  for(const escaped of ['held','plain']){
   const f=common(provider,{free:1000}),{values}=f;
   Object.assign(values,{contextRecoveryAttempts:0,contextRecoveryPending:false,contextRecoveryFailure:undefined,mainGeometryProgramFailure:undefined,move(){},
    layer:{onAdd(){if(escaped==='held')f.heldWait('recovery');throw new ProgramPreparationPending();}}});
   install(provider,values,['contextRestored']);
   f.t.turn(()=>values.contextRestored());
   assert.equal(f.map.repaints,escaped==='held'?0:1,escaped+' pending');
   assert.equal(values.contextRecoveryPending,true,'recovery stays pending, not failed');assert.equal(values.contextRecoveryFailure,undefined);
  }
 });

 if(provider!=='bremen')test(`${provider}: initialization judges only the pending that escapes after resident main settled its own waits`,()=>{
  for(const escaped of ['plain','held']){
   const f=common(provider,{free:1000}),{values,gl}=f,scope={};
   Object.assign(values,{publishedProgramPlan:{},residentProgramPlan:{},configuredDataScope:scope,residentScope:scope,committingScope:undefined,pendingCandidate:undefined,candidateMainMatrix:identity,program:{},geometryResidentUploaded:false,geometryUploadPending:false,mainGeometryProgramFailure:undefined,invalidateMainDraw(){},releaseGPU(){},
     // Resident main swallows its own held wait (it decided its frame itself).
     prepareResidentMain(){try{f.heldWait('main-family');}catch(error){if(!isProgramPreparationPending(error))throw error;}return false;},
     upload(){if(escaped==='held')f.heldWait('upload');throw new ProgramPreparationPending();},prepareGeometryUpload(){}});
   install(provider,values,['initializeResidentGPU']);
   f.t.turn(()=>values.initializeResidentGPU(gl,true));
   assert.equal(values.programPreparation.waitingForBudget,true);
   assert.equal(f.map.repaints,escaped==='held'?0:1,escaped==='held'?'an escaped held wait is woken by its owner':'a non-budget pending after resident main still requests its frame');
  }
 });

 test(`${provider}: candidate main preparation requests a frame unless every cause is a held ledger wait`,()=>{
  const run=(prepareCandidateMain)=>{
   const f=common(provider,{free:1000}),{values}=f,candidate={id:1,revision:1,handoffRevision:0,generation:1,sourcePrepared:true,sourceReady:true,sourceWorkConsumed:true,state:{},snapshot:{},indexCount:1,signal:undefined};
   Object.assign(values,{pendingCandidate:candidate,candidateMainMatrix:identity,clearProgramGrantHandoff(){},releaseCandidatePrograms(){},retryLostCandidateChunks(){},prepareCandidateSource(){},finishCandidateChunkPacking:()=>true,prepareCandidatePrograms:()=>true,publishCandidate(){},candidateGrantHandoff:{clear(){}},candidateCurrent:()=>true,
    geometryOwner:{contextLost(){}},shadowGeometryOwner:{contextLost(){}},geometryResidentUploaded:false,geometryUploadPending:false,sceneIndexCount:()=>1,discardPendingCandidate(){},candidateFailure:undefined,candidateFailureGeneration:undefined,mainGeometryProgramFailure:undefined,
    prepareCandidateMain:(_candidate,a,b)=>prepareCandidateMain(provider==='bremen'?b:a,f)});
   install(provider,values,[provider==='root500'?'pumpCandidate':'prepareCandidate']);
   f.t.turn(()=>provider==='root500'?values.pumpCandidate():values.prepareCandidate());
   return f.map.repaints;
  };
  // A main pass that was answered only by held ledger waits.
  assert.equal(run((waits,f)=>{try{f.heldWait('candidate-main');}catch{waits.ledger++;}return false;}),0,'held waits only: the owner wake repaints');
  assert.equal(run((waits,f)=>{try{f.heldWait('candidate-main');}catch{waits.ledger++;}waits.other=true;return false;}),1,'another not-ready cause beside the wait requests a frame');
  assert.equal(run(()=>false),1,'a pass with no counted wait requests a frame');
  if(provider!=='root500'){
   assert.equal(run((waits,f)=>{try{f.heldWait('candidate-main');}catch{waits.ledger++;}throw new ProgramPreparationPending();}),1,'a non-budget pending escaping after settled waits requests a frame');
   assert.equal(run((_waits,f)=>f.heldWait('candidate-main')),0,'an escaped held wait is woken by its owner');
  }
 });
}

test('bremen: the geometry-upload caller of resident main requests no frame for a held wait',()=>{
 const f=mainFixture('bremen',{free:1000}),{values,gl}=f;
 Object.assign(values,{geometryUploadPending:true,geometryUploadFailure:undefined,retryResidentUpload:false,programReady:()=>false});install('bremen',values,['prepareGeometryUpload']);
 f.t.turn(()=>values.prepareGeometryUpload());assert.equal(f.map.repaints,0,'held waits only');assert.equal(values.programPreparation.waitingForBudget,true);
 f.blocker.release();assert.equal(f.map.repaints,1,'the owner wake');
 f.t.turn(()=>values.prepareGeometryUpload());assert.equal(f.map.repaints,2,'queued compile work after the wake requests its frame');
 assert.ok(gl);
});

test('every resident and candidate main caller uses the held-wait frame rule',()=>{
 const guarded={root500:{resident:0,candidate:1},infill:{resident:0,candidate:1},bremen:{resident:3,candidate:1}};
 for(const provider of PROVIDERS){
  const text=rendererText(provider);
  assert.doesNotMatch(text,/prepareResidentMain\(gl\)\)\{if\(!mainGeometryProgramFailure\)map\.triggerRepaint\(\)/,provider+' has no unguarded resident caller');
  assert.doesNotMatch(text,/prepareCandidateMain\(candidate(,context)?\)\)\{map\.triggerRepaint\(\)/,provider+' has no unguarded candidate caller');
  assert.equal(text.split('if(!prepareResidentMain(gl,waits)){if(!mainGeometryProgramFailure&&(waits.other||!waits.ledger))map.triggerRepaint();return;}').length-1,guarded[provider].resident,provider+' resident callers (bremen: upload, initializer, render)');
  assert.equal((text.match(/if\(!prepareCandidateMain\(candidate,(context,)?waits\)\)\{if\(waits\.other\|\|!waits\.ledger\)map\.triggerRepaint\(\);return;\}/g)??[]).length,guarded[provider].candidate,provider+' candidate caller');
  if(provider!=='bremen')assert.match(sourceOf(provider,'prepareResidentMain'),/if\(!ready\)\{invalidateMainDraw\(\);if\(waits\.other\|\|!waits\.ledger\)map\.triggerRepaint\(\);\}/,provider+' resident main decides its own frame');
 }
});

/** Capture preparation with the actual owner, solar budget and result merge. */
function captureFixture(provider,options){
 const f=common(provider,options),{values}=f;
 const capture={status:'ready',invalidations:0,preparations:0};
 Object.assign(values,{needsBirth:false,birth:new Map(),captureDemands:new Map([['solar',{token:'solar',heldKeys:new Set()}],['reflection',{token:'reflection',heldKeys:new Set()}]]),reconcileCaptureDemand(){},gpuReady:()=>true,baseSurfaceFragment:'base helper',surfaceFragment:'window helper',diffuseFragment:'diffuse helper',
  solarPreparationKeys:(_helper,required)=>[...required],partitionPrograms:new Map(),heldCaptureDemandKeys:new Set(),solarProgramFailures:new Map(),generation:1,solarProgramRevision:0,clearSettledProgramSources(){},captureMaterialKeys:()=>[],texturedProgram:undefined,diffuseProgram:undefined,textureShaderFailure:undefined,diffuseShaderFailure:undefined,
  solarProgramDemandActive:()=>true,trimSolarPrograms:()=>new Set(['k1']),captureRuntime:{invalidate(){capture.invalidations++;},prepareSolar(){capture.preparations++;return{status:capture.status};}},createSolarShadowPreparationBudget,
  sceneIndexCount:()=>1,partitionEnabled:true,paintMode:()=>2,activeFamilyKey:key=>key,partitionRuns:[{firstIndex:0,indexCount:3,key:'k1'}],sceneChunks:[],multiply:(_a,b)=>b,planResidentReflectionChunks:()=>({plan:[{program:'k1'}],triangles:3,draws:1}),residentCaptureAdapter:()=>assert.fail('pending reflection preparation never snapshots')});
 install(provider,values,['prepareCapturePrograms','prepareCaptureMaterials','prepareSolarPrograms','prepareSolarShadow','preparePlanarReflection']);
 f.solar=()=>f.t.turn(()=>values.prepareSolarShadow(createSolarShadowPreparationBudget()));
 return Object.assign(f,{capture});
}
for(const provider of PROVIDERS){
 test(`${provider}: capture preparation counts held ledger waits as budgetWaiting and merges them`,()=>{
  {
   const f=captureFixture(provider,{free:1000}),owner=f.values.programPreparation,before=owner.budgetWaits;
   f.capture.status='pending';const result=f.solar();
   assert.deepEqual(result,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
   assert.equal(owner.budgetWaits-before,1);assert.equal(solarShadowPreparationNeedsFrame(result),false,'a fully held capture wait needs no caller frame');
   assert.equal(f.capture.preparations,0,'a held program wait cannot prepare or snapshot capture resources');assert.equal(f.capture.invalidations,1);
   assert.equal(f.t.queue.length,0,'the held program wait queues no polling work');
   assert.equal(f.map.repaints,0);
   f.blocker.release();assert.equal(f.map.repaints,1,'the owner wake repaints the waiting capture once');
   const next=f.solar();assert.equal(next.status,'pending');assert.equal(next.budgetWaiting,undefined,'admitted queued work is not a ledger wait');assert.equal(solarShadowPreparationNeedsFrame(next),true);
   assert.equal(f.capture.preparations,0,'queued prerequisites still cannot prepare capture resources');assert.equal(f.capture.invalidations,2);
   // Complete the real owner's queued program before admitting the resource.
   assert(f.t.drain()>0);const resourcePending=f.solar();
   assert(f.values.partitionPrograms.has('k1'),'the exact prerequisite program is resident');
   assert.deepEqual(resourcePending,{status:'pending',ready:1,pending:1,failed:0});assert.equal(solarShadowPreparationNeedsFrame(resourcePending),true,'a pending capture resource needs a frame after its prerequisites are ready');
   assert.equal(f.capture.preparations,1);assert.equal(f.capture.invalidations,2);assert.equal(f.gl.programs.length,1,'resource preparation does not compile the resident recipe again');
   f.capture.status='ready';assert.deepEqual(f.solar(),{status:'ready',ready:1,pending:0,failed:0});assert.equal(f.capture.preparations,2);assert.equal(f.gl.programs.length,1);
  }
  {
   // Material demands: an unready resident (not a ledger wait) is never counted;
   // a material attempt refused by the ledger is, merged with the program wait.
   const f=captureFixture(provider,{free:1000}),owner=f.values.programPreparation;f.values.captureMaterialKeys=()=>['@window'];
   let ready=false;f.values.gpuReady=()=>ready;
   const unready=f.t.turn(()=>f.values.prepareCaptureMaterials(createSolarShadowPreparationBudget(),'solar'));
   assert.deepEqual(unready,{status:'pending',ready:0,pending:1,failed:0});
   ready=true;const before=owner.budgetWaits,result=f.solar();
   assert.equal(result.pending,2);assert.equal(result.budgetWaiting,owner.budgetWaits-before,'budgetWaiting is exactly the attempts answered with a held wait');
   assert.equal(solarShadowPreparationNeedsFrame(result),result.pending>result.budgetWaiting);
   const materials=f.t.turn(()=>f.values.prepareCaptureMaterials(createSolarShadowPreparationBudget(),'solar'));
   assert.deepEqual(materials,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1},'a refused material attempt alone is one held wait');
  }
  {
   // Reflection preparation merges program and material waits into its result.
   const f=captureFixture(provider,{free:1000}),result=f.t.turn(()=>f.values.preparePlanarReflection({gl:f.gl,mainMatrix:identity,maxTriangles:100,maxDraws:4},createSolarShadowPreparationBudget()));
   assert.deepEqual(result,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1,plannedTriangles:3,plannedDraws:1});
  }
 });

 test(`${provider}: the projected shadow mask is woken through the map and withdraws a wait it no longer draws`,()=>{
  const viewportBytes=64*48;
  {
   const gl=mockGL(),{budget,blocker}=ledger(gl,{free:100}),map=fixtureMap(),values={createProjectedShadowMask,destroyed:false,map};
   const mask=evaluate(sourceOf(provider,'shadowMask',{kind:'variable'}),values);
   assert.equal(mask.draw(gl,topDown,.03,()=>assert.fail('no coverage without an admitted target')),false);
   assert.equal(mask.stats.admission,'pending');assert.equal(mask.stats.requiredBytes,viewportBytes);assert.equal(map.repaints,0);
   blocker.release();assert.equal(map.repaints,1,'the ledger wake reaches the map once');assert.equal(budget.stats.availabilityListeners,0);
   let coverage=0;assert.equal(mask.draw(gl,topDown,.03,()=>coverage++),true);assert.equal(coverage,1);mask.release();
  }
  {
   const gl=mockGL(),{blocker}=ledger(gl,{free:100}),map=fixtureMap(),values={createProjectedShadowMask,destroyed:false,map};
   const mask=evaluate(sourceOf(provider,'shadowMask',{kind:'variable'}),values);mask.draw(gl,topDown,.03,()=>{});
   values.destroyed=true;blocker.release();assert.equal(map.repaints,0,'a destroyed renderer is never repainted');mask.release();
  }
  {
   // The render statement: drawn while shadows are wanted, withdrawn otherwise.
   const gl=mockGL(),{budget}=ledger(gl,{free:100}),mask=createProjectedShadowMask({requestRepaint(){}});mask.draw(gl,topDown,.03,()=>{});
   let drawn=0;const values={gl,progressiveDiagnostic:null,shadowProgram:{},sceneShadowIndexCount:()=>3,sceneChunks:[{shadowIndices:[0,1,2],shadowIndexCount:3}],shadowAlpha:.1,shadowFailure:false,releaseShadowGPU(){},shadowMask:mask,drawProjectedShadows(){drawn++;}};
   if(provider==='bremen')install(provider,values,['sceneUploadedShadowIndexCount']);
   const run=statement(provider,"progressiveDiagnostic!=='no-shadow'&&shadowProgram",values);
   run();assert.equal(drawn,1);assert.equal(mask.stats.waiting,true,'a drawn mask keeps its wait');assert.equal(mask.stats.cancellations,0);
   values.shadowAlpha=0;run();assert.equal(drawn,1);assert.equal(mask.stats.waiting,false,'a mask not drawn withdraws its wait');assert.equal(mask.stats.cancellations,1);assert.equal(budget.stats.availabilityListeners,0);
   run();assert.equal(mask.stats.cancellations,1,'withdrawing is idempotent');mask.release();
  }
  {
   // Shadows off, layer disabled and page hidden withdraw a pending mask wait.
   let cancels=0;const values={shadowMask:{cancelPending(){cancels++;return true;}},invalidateMainDraw(){},invalidateMatrix(){},residentMainPreparedStamp:undefined,captureDemands:new Map(),captureRuntime:{invalidate(){}},cancelCandidate(){},discardPendingCandidate(){},clearAbandonedCandidateFailure(){},programPreparation:{cancel(){}},clearProgramSources(){},
    enabled:true,pageHidden:false,viewRevision:0,matrix:undefined,syncFacadeResources(){},paintSelection(){},reconcileProgramDemand(){},windowTexture:undefined,diffuseTexture:undefined,map:fixtureMap(),checkedSceneEnvironment:value=>value,sceneSolarLight:()=>({shadowVector:[1,1]}),sceneSunOrigin:[0,0],sceneEnvironment:{shadows:true,motion:true},sceneSunInstant:'',sceneSun:{},ownerReducedMotion:false,reducedMotion:false,needsBirth:false,birth:new Map(),rememberFinishedBirth(){},updateSolarShadowIndices:()=>false,uploadShadow(){}};
   install(provider,values,['setEnabled','setPageHidden','setSceneEnvironment'],'method');
   for(const name of ['setEnabled','setPageHidden'])assert.match(sourceOf(provider,name,{kind:'method'}),/programPreparation\.cancel\(\)/,name+' is the renderer API method');
   values.setSceneEnvironment({shadows:true,motion:true,instantISO:''});assert.equal(cancels,0);
   values.setSceneEnvironment({shadows:false,motion:true,instantISO:''});assert.equal(cancels,1,'shadows off');
   values.setEnabled(true);assert.equal(cancels,1);values.setEnabled(false);assert.equal(cancels,2,'layer disabled');
   values.setPageHidden(false);assert.equal(cancels,2);values.setPageHidden(true);assert.equal(cancels,3,'page hidden');
  }
 });

 test(`${provider}: the materials release is a context-free module helper and assembly drops construction closures`,()=>{
  const text=rendererText(provider),ast=ts.createSourceFile(provider+'.ts',text,ts.ScriptTarget.Latest,true);
  const helper=ast.statements.flatMap(node=>ts.isVariableStatement(node)?[...node.declarationList.declarations]:[]).find(node=>node.name.getText(ast)==='releaseAuxiliary');
  assert(helper&&ts.isArrowFunction(helper.initializer),'releaseAuxiliary is a module-level arrow, outside the renderer factory');
  const free=new Set();(function visit(node){if(ts.isIdentifier(node)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.name===node)&&!ts.isParameter(node.parent)&&!(ts.isPropertySignature(node.parent))&&!ts.isTypeReferenceNode(node.parent))free.add(node.text);ts.forEachChild(node,visit);})(helper.initializer.body);
  assert.deepEqual([...free],['aux'],'the release closure reads only its own auxiliary');
  const release=evaluate(sourceOf(provider,'releaseAuxiliary',{kind:'variable'}),{});let released=0;const aux={masks:{release(){released++;}}},dispose=release(aux);dispose();assert.equal(released,1);
  const materials=sourceOf(provider,provider==='bremen'?'packBremenChunkMaterials':'packChunkMaterials');
  assert.match(materials,/return\{paint,progressive,auxiliary,release:releaseAuxiliary\(auxiliary\)\};/);
  assert.doesNotMatch(materials,/release\(\)\{masks\.release\(\);\}|release:\(\)=>recipe\.release\(\)/);
  // After assembly the candidate keeps no packing closure; after publication no snapshot.
  const finish=sourceOf(provider,provider==='root500'?'prepareCandidateSource':provider==='infill'?'finishCandidateChunkPacking':'prepareCandidate');
  assert.match(finish,provider==='root500'?/candidate\.sourceReady=true;candidate\.args=undefined;/:provider==='infill'?/candidate\.finishChunkPack=undefined;candidate\.repack=undefined;/:/candidate\.finishPack=undefined;candidate\.repack=undefined;/);
  assert.match(sourceOf(provider,'publishCandidate'),provider==='root500'?/candidate\.snapshot=undefined;candidate\.chunks=undefined;candidate\.args=undefined;/:/candidate\.state=undefined;/);
 });
}

test('the lineage-a harness evaluates the current production files',()=>{for(const provider of PROVIDERS)assert.match(rendererText(provider),/export function createBuildingMeshRenderer\(/);assert.ok(web);});

// uncovered[32](2): the waits record of a candidate main pass must reach the shared main
// preparation (root500/infill pass it in the resident-main options, Bremen as the last argument
// of prepareMainPrograms); removing it would leave the held-wait counting below untested.
test('lineage A prepareCandidateMain forwards its waits record into the shared main preparation',()=>{
 for(const provider of PROVIDERS){
  const text=rendererText(provider),start=text.indexOf('function prepareCandidateMain(');assert(start>=0,provider+' declares prepareCandidateMain');
  const end=text.indexOf('\n function ',start+1);assert(end>start,provider+' prepareCandidateMain has a following declaration');const body=text.slice(start,end);
  assert(body.includes(provider==='bremen'?'previousStyles,true,waits)':'===stampReady,waits})'),provider+' forwards waits from prepareCandidateMain');
 }
});
