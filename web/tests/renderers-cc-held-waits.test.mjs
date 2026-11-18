import test from 'node:test';
import assert from 'node:assert/strict';
// City and Church renderers, third stage (renderers-cc):
// 1. City resident main preparation: a material-source admission wait whose
//    onAvailable wake the renderer holds counts toward heldOnly (DECISIONS
//    2026-11-02 01:35), so the render spin site asks no frame while only that
//    ledger is waited on; the wake repaints once; an admitted, queued material
//    build keeps its frame.
// 2. City capture closures restore a held wait (core-solar-program CDR[4],
//    DECISIONS 03:25): familyProgram answers every pending with undefined, the
//    closure throws the held wait again, so the visit's solar budget gives its
//    slot back (R2 applies to City) and the result counts budgetWaiting. The
//    same holds for the material-source admission wait in every capture site.
// 3. Church compile entry: the prepared-source workspace's AbortError on a
//    lost (or hidden) context is answered as ProgramPreparationPending('lost')
//    ('cancelled'), with no ledger residue and the last submitted attempt's
//    record unchanged; the write-only visibleCompileFrame is gone.
// 4. (review RCC-2) A capture visit whose familyProgram call compiled a program
//    and dropped it because the material programs went stale has spent its one
//    compile: the closure answers an ordinary pending even when the refresh met
//    a held wait, so the solar budget keeps the slot (no second compile).
// 5. (review RCC-3) A candidate whose prepared data is aborted with no
//    successor is rolled back and asks one frame, as cancelCandidate does.
// The program owner, ledger, store, solar budget, prepared-source workspace and
// City material preflight are production modules (support/renderers-cc-
// runtime.mjs); renderer declarations are their own source text, bound with the
// shared scope fixture (support/renderers-city-tier-church-scope.mjs).
const {runtime,ledgerFixture,usedBytes}=await import('./support/renderers-cc-runtime.mjs');
const {bind,nodes,ts,renderer}=await import('./support/renderers-city-tier-church-scope.mjs');
const {ProgramPreparationPending,isProgramPreparationPending,createSolarShadowPreparationBudget,solarShadowPreparation,solarShadowPreparationNeedsFrame}=runtime;
const fresh=()=>createSolarShadowPreparationBudget();
const familyKey=family=>'current-family:'+family,familyOf=key=>Number(key.split(':')[1]);
const square=()=>Float64Array.from({length:16},(_,i)=>i%5===0?1:0);
const replaced=(from,to)=>js=>{assert(js.includes(from),'mutation anchor present: '+from.slice(0,60));return js.split(from).join(to);};
function withFixture(work){const f=ledgerFixture();try{return work(f);}finally{f.dispose();}}

/** A material envelope the blocked ledger refuses but an empty one admits. */
function materialBounds(f){
 const bounds=runtime.shaderSourceBounds(runtime.shaderSourceText('x'.repeat(120),['renderers-cc/material']));
 const probe=runtime.admitCityMaterialPreflight(f.budget,bounds,'probe',{});assert.equal(probe.status,'admitted');assert(probe.bytes>100&&probe.bytes<=1000,'envelope '+probe.bytes);probe.reservation.release();
 return bounds;
}

const CITY_MATERIAL=['prepareMaterialSource','admitMaterialSource','releaseMaterialAdmission','materialAdmissionHeld','finishMaterialAdmission','compileGeometryProgram','heldLedgerPending','isHeldMaterialSourceWait'];
function cityState(f,extra={}){
 const state={map:f.map,programPreparation:f.owner,isProgramPreparationPending,ProgramPreparationPending,solarShadowPreparation,gl:f.gl,destroyed:false,pageHidden:false,enabled:true,city:'munich',
  // Material admission: production declarations on the page ledger.
  materialSourceFailure:undefined,geometryCompilationCandidate:undefined,materialSourceSettled:false,materialSourceWorkRevision:1,residentMaterialAdmission:{},materialPreflightIdentity:{},materialAdmissions:new Map(),
  materialSourceHeldWaits:0,materialSourceWaitErrors:new WeakSet(),materialSourceBuilder:Object.assign(()=>'material',{key:'city-material-v1:munich:fixture',hooks:[],city:'munich'}),
  admitCityMaterialPreflight:runtime.admitCityMaterialPreflight,currentDataScope:()=>({stats:{disposed:false}}),describeMaterialSource:()=>state.bounds,geometryOwner:{scene:{version:1},store:{budget:f.budget}},
  // Main preparation.
  mainWorldProjection:square(),anchorUnit:1,anchor:[0,0],multiply:()=>square(),updateMainViewport(){},keys:new Set([familyKey(0),familyKey(9)]),currentPaintProgramKey:familyKey,currentPaintProgramFamily:familyOf,materialRecipeRevision:1,hookSignature:()=>'hooks',
  paintMode:()=>2,landmarkVisible:false,windowTexture:undefined,surfaceFragment:undefined,diffuseTexture:undefined,diffuseFragment:undefined,residentMaterialStyles:[],familyFailures:new Map(),familySurfaceHelper:'helper',
  program:undefined,familyPrograms:new Map(),texturedProgram:undefined,diffuseProgram:undefined,activeWhite:false,whiteModeEligible:false,candidateMainStamp:()=>'stamp',candidateBindingStamp:()=>'binding',publishedDataPlan:{id:1},materialProgramsCurrent:()=>true,...extra};
 state.mainFamilyProgramKeys=()=>state.keys;
 return state;
}
/** The City render spin site, as render runs it (asserted textually below). */
const renderSpin=(S,map)=>{const ledgerWait={heldOnly:false};if(!S.prepareResidentMain(ledgerWait)&&!ledgerWait.heldOnly)map.triggerRepaint();return ledgerWait;};
function cityResident(f,rewrite={}){
 const S=bind('city',['prepareResidentMain','prepareMainPrograms','candidateTexturesReady','residentMainPrograms',...CITY_MATERIAL],cityState(f),rewrite);
 S.bounds=materialBounds(f);return S;
}

test('City resident preparation: a held material-source admission wait asks no frame; its wake repaints once; an admitted, queued material build keeps its frame',()=>{
 const render=nodes('city',node=>ts.isMethodDeclaration(node)&&node.name.getText()==='render'&&node.getText().includes('prepareResidentMain('));assert.equal(render.length,1);
 assert(render[0].getText().includes('const ledgerWait:MainProgramWait={heldOnly:false};if(!prepareResidentMain(ledgerWait)&&!ledgerWait.heldOnly)map.triggerRepaint();'),'the render spin site this suite replays');
 withFixture(f=>{
  const S=cityResident(f);f.block();
  for(let frame=0;frame<4;frame++){const wait=renderSpin(S,f.map);assert.equal(wait.heldOnly,true,'frame '+frame+': every pending is the held material wait');}
  assert.equal(f.map.repaints,0,'no caller frame while only the material admission is waited on');
  assert.equal(f.budget.stats.availabilityListeners,1,'one held material wake');assert.equal(S.materialAdmissions.get(S.residentMaterialAdmission).wait?.signal.aborted,false);
  assert.equal(S.materialSourceHeldWaits,8,'base and family 9 meet the held wait on each of 4 frames');assert.equal(f.owner.budgetWaits,0,'the program owner never saw these demands');
  f.unblock();assert.equal(f.map.repaints,1,'the material wake repaints exactly once');assert.equal(f.budget.stats.availabilityListeners,0);
  // Admitted now: the certification build is queued on the context scheduler,
  // an ordinary pending that keeps its caller frame.
  const before=usedBytes(f.budget).bytes,wait=renderSpin(S,f.map);assert.equal(wait.heldOnly,false);assert.equal(f.map.repaints,2,'an admitted, queued material build keeps its caller frame');
  assert(usedBytes(f.budget).bytes>before,'the build envelope is reserved before the builder runs');
  S.enabled=false;
 });
});

test('City resident preparation: a held material wait beside an ordinary pending keeps the frame; a material wait whose wake is not held (no prepared data) keeps it too',()=>{
 withFixture(f=>{
  const S=cityResident(f);f.block();
  // Family 9 is an ordinary pending (its compile is cancelled), the base is the held material wait.
  const compile=S.compileGeometryProgram;S.compileGeometryProgram=(helper,white,family)=>{if(family===9)throw new ProgramPreparationPending('cancelled');return compile(helper,white,family);};
  renderSpin(S,f.map);assert.equal(f.map.repaints,1,'a held wait beside an ordinary pending keeps the caller frame');S.compileGeometryProgram=compile;
  // A disposed data scope answers the admission with no wake: ordinary pending.
  f.unblock();S.currentDataScope=()=>({stats:{disposed:true}});S.describeMaterialSource=()=>{throw new DOMException('City prepared source is unavailable','AbortError');};
  for(const [key,value]of S.materialAdmissions){value.wait?.abort();S.materialAdmissions.delete(key);}
  const repaints=f.map.repaints;renderSpin(S,f.map);assert.equal(f.map.repaints,repaints+1,'an admission refused without a held wake keeps the caller frame');
  S.enabled=false;
 });
});

test('the City material held-wait suite detects an unmarked material pending and a poll that ignores it (mutations)',()=>{
 for(const [name,rewrite] of [
  ['compile entry throws an ordinary pending',{compileGeometryProgram:replaced('throw materialSourceHeldWaits!==materialWaits?heldLedgerPending(true):new ProgramPreparationPending();','throw new ProgramPreparationPending();')}],
  ['poll ignores the material wait',{prepareMainPrograms:replaced('&&!isHeldMaterialSourceWait(error))framePending=true;',')framePending=true;')}],
  ['admission does not count its held refusal',{admitMaterialSource:replaced('materialSourceHeldWaits++;return false;','return false;')}],
 ])withFixture(f=>{const S=cityResident(f,rewrite);f.block();for(let frame=0;frame<4;frame++)renderSpin(S,f.map);assert.equal(f.map.repaints,4,name+': the spin site asks a frame every frame');S.enabled=false;});
});

// ---- City capture closures ----
const CITY_CAPTURE=['prepareCaptureMaterialPrograms','prepareCapturePrograms','preparePlanarReflection','familyProgram','capturePendingAfter'];
function cityCapture(f,{material=false,rewrite={}}={}){
 const S=bind('city',[...CITY_CAPTURE,...CITY_MATERIAL],cityState(f,{createSolarShadowPreparationBudget,captureContentRevision:()=>'content',facadeAttached:true,textureShaderFailure:undefined,diffuseShaderFailure:undefined,
  solarDemandToken:undefined,reflectionDemandToken:{},solarFamilyProgramsNeeded:()=>true,replaceCaptureKeys(){},gpuReady:()=>true,generation:1,programHookSignature:'hooks',captureFamilyFailures:new Map(),familyCompilations:0,
  residentFamilyProgramKeys:()=>new Set([familyKey(9),familyKey(11)]),familyRuns:[{key:familyKey(9),firstIndex:0,indexCount:3},{key:familyKey(11),firstIndex:3,indexCount:3}],overrideProgramKey:()=>undefined,opacityContext:'normal',opacity:1,sceneChunks:[],sceneIndexCount:()=>6,geometryUploadPending:false,
  c290RoofComponent:()=>undefined,c290ProgramRuns:()=>[],planResidentReflectionChunks:()=>({plan:[{program:familyKey(9)},{program:familyKey(11)}],triangles:6,draws:2,components:[]})}),rewrite);
 S.bounds=materialBounds(f);
 // The program owner's demand, or the production material entry ahead of it.
 if(!material)S.compileGeometryProgram=(helper,_white=false,family=0)=>f.compile('city:'+helper+':'+family);
 return S;
}
const reflectionPass=f=>({gl:f.gl,mainMatrix:new Float64Array(16),maxTriangles:99,maxDraws:8});

test('City capture: a held program-owner wait thrown again from the capture closure gives the visit slot back, so every family is attempted and none asks a frame (R2 on City)',()=>{
 withFixture(f=>{
  const S=cityCapture(f);f.block();
  const solar=S.prepareCapturePrograms(fresh());assert.deepEqual(solar,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:2});assert.equal(solarShadowPreparationNeedsFrame(solar),false);
  const reflection=S.preparePlanarReflection(reflectionPass(f),fresh());assert.deepEqual(reflection,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:2,plannedTriangles:6,plannedDraws:2});assert.equal(solarShadowPreparationNeedsFrame(reflection),false);
  assert.equal(f.owner.budgetWaits,4,'both families attempted on both visits');assert.equal(f.map.repaints,0);
  assert.equal(S.captureFamilyFailures.size,0,'a held wait is no capture failure');
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');
  const queued=S.prepareCapturePrograms(fresh());assert.deepEqual(queued,{status:'pending',ready:0,pending:2,failed:0},'admitted: one compile starts, the second demand waits for the next visit');assert.equal(solarShadowPreparationNeedsFrame(queued),true);
 });
});

test('City capture: a held material-source admission wait counts as budgetWaiting in the window, diffuse, solar and reflection sites and returns the visit slot',()=>{
 withFixture(f=>{
  const S=cityCapture(f,{material:true});f.block();
  S.paintMode=()=>1;S.landmarkVisible=true;S.windowTexture={stats:{textureObjects:1,ready:true}};S.surfaceFragment='window helper';
  assert.deepEqual(S.prepareCaptureMaterialPrograms(fresh()),{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1},'window material');
  S.texturedProgram={ready:true};S.diffuseFragment='diffuse helper';S.diffuseTexture={stats:{neededMaterials:{plaster:false,brick:false},totalTextureObjects:2}};
  assert.deepEqual(S.prepareCaptureMaterialPrograms(fresh()),{status:'pending',ready:1,pending:1,failed:0,budgetWaiting:1},'diffuse material');
  S.paintMode=()=>2;
  const solar=S.prepareCapturePrograms(fresh());assert.deepEqual(solar,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:2});assert.equal(solarShadowPreparationNeedsFrame(solar),false);
  const reflection=S.preparePlanarReflection(reflectionPass(f),fresh());assert.equal(reflection.budgetWaiting,2);assert.equal(solarShadowPreparationNeedsFrame(reflection),false);
  assert.equal(f.owner.budgetWaits,0,'no program demand reached the owner');assert.equal(f.budget.stats.availabilityListeners,1,'one material wake');assert.equal(f.map.repaints,0);
  f.unblock();assert.equal(f.map.repaints,1,'the material wake repaints exactly once');
  S.enabled=false;
 });
});

test('the City capture suite detects a closure that throws an ordinary pending and a catch that ignores the material wait (mutations)',()=>{
 const closure='()=>{const before=programPreparation.budgetWaits,materialWaits=materialSourceHeldWaits,compilations=familyCompilations,value=familyProgram(key,true);if(!value)throw capturePendingAfter(before,materialWaits,compilations);return value;}',plain='()=>{const value=familyProgram(key,true);if(!value)throw new ProgramPreparationPending();return value;}';
 withFixture(f=>{const S=cityCapture(f,{rewrite:{prepareCapturePrograms:replaced(closure,plain)}});f.block();const solar=S.prepareCapturePrograms(fresh());assert.deepEqual(solar,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:1},'the pre-change closure keeps the slot: the second family is an ordinary pending');assert.equal(solarShadowPreparationNeedsFrame(solar),true);});
 withFixture(f=>{const S=cityCapture(f,{rewrite:{preparePlanarReflection:replaced(closure,plain)}});f.block();assert.equal(solarShadowPreparationNeedsFrame(S.preparePlanarReflection(reflectionPass(f),fresh())),true,'reflection: the pre-change closure asks a frame');});
 withFixture(f=>{const S=cityCapture(f,{material:true,rewrite:{prepareCapturePrograms:replaced('===false||isHeldMaterialSourceWait(error))budgetWaiting++;','===false)budgetWaiting++;')}});f.block();assert.equal(solarShadowPreparationNeedsFrame(S.prepareCapturePrograms(fresh())),true,'a catch blind to the material wait asks a frame');S.enabled=false;});
});

test('City main draw path is unchanged: only the two capture closures call familyProgram',()=>{
 const calls=nodes('city',node=>ts.isCallExpression(node)&&node.expression.getText()==='familyProgram');
 assert.deepEqual(calls.map(node=>node.getText()),['familyProgram(key,true)','familyProgram(key,true)'],'solar and reflection capture closures only');
 const owners=calls.map(node=>{let at=node.parent;while(at&&!(ts.isFunctionDeclaration(at)&&at.name))at=at.parent;return at?.name.text;});
 assert.deepEqual(owners.sort(),['prepareCapturePrograms','preparePlanarReflection']);
});

// ---- Church compile entry on the production prepared-source workspace ----
function churchCompile(f,rewrite={}){
 const sourceBounds=runtime.shaderSourceBounds(runtime.shaderSourceText('fixture fragment 0000000000',['fixture/church-material'])),recipes=[];
 const state={map:f.map,isProgramPreparationPending,ProgramPreparationPending,gl:f.gl,destroyed:false,pageHidden:false,enabled:true,generation:17,gpuGeneration:3,queueOnlyProgram:false,VERTEX:'fixture vertex',colourAttributes:['a_position'],churchColourSourceAuthority:{},colourProgramHasConsumer:()=>true,
  linkedPaint:runtime.currentPaintProgramGroups('church','munich'),
  withResidentReflectionClip:x=>x,lastCompileAttempt:{requestedFamily:1,canonicalFamily:1,generation:17,gpuGeneration:3,stage:'link',characters:1,sourceHash:'00000000',contextLost:false,status:'ready',infoLog:''},
  churchSourceRecipe:(helper,queue)=>({sourceKey:queue?'queue':'paint',inputs:[helper,queue],sourceBounds,assemble:paint=>paint}),
  programPreparation:{compile(_gl,recipe){recipes.push(recipe);throw new ProgramPreparationPending();}}};
 state.sourceWorkspace=runtime.createPreparedSourceWorkspace({budget:f.budget,current:()=>!state.destroyed&&!state.pageHidden&&state.enabled&&!!state.gl&&!state.gl.isContextLost(),build:()=>'fixture fragment',specialize:(_source,families)=>({fragment:'fixture fragment '+(families[0]??0),depthEffects:false})});
 const S=bind('church',['compileGeometryProgram','colourProgramRecipe'],state,rewrite);S.recipes=recipes;return S;
}
const pendingWith=status=>error=>isProgramPreparationPending(error)&&error.status===status;

test('Church compile on the production workspace: a lost context is answered as pending lost, a hidden page as cancelled; no ledger residue, no driver call, the last attempt unchanged',()=>{
 withFixture(f=>{
  const S=churchCompile(f),baseline=usedBytes(f.budget),attempt={...S.lastCompileAttempt};
  // Live: the demand reaches the program owner carrying its workspace ticket.
  assert.throws(()=>S.compileGeometryProgram('helper',200,208),pendingWith('pending'));assert.equal(S.recipes.length,1);assert(S.recipes[0].budget.sourceBytesUpperBound>0,'the live demand carries its prepared-source budget ticket');
  f.gl.lost=true;const calls=f.gl.calls;
  assert.throws(()=>S.compileGeometryProgram('helper',200,208),pendingWith('lost'),'the workspace guard on a lost context is the owner contract: pending lost');
  assert.equal(S.recipes.length,1,'the lost demand never reached the owner');assert.equal(f.gl.calls,calls,'no driver call after loss');
  assert.deepEqual(usedBytes(f.budget),baseline,'no ledger residue');assert.deepEqual(S.lastCompileAttempt,attempt,'the last submitted attempt is not relabelled failed');
  f.gl.lost=false;S.pageHidden=true;
  assert.throws(()=>S.compileGeometryProgram('helper',200,208),pendingWith('cancelled'),'a hidden page cancels the demand');assert.deepEqual(usedBytes(f.budget),baseline);assert.deepEqual(S.lastCompileAttempt,attempt);
  S.pageHidden=false;S.programPreparation={compile(){throw Error('driver fixture link detail');}};
  assert.throws(()=>S.compileGeometryProgram('helper',200,208),/driver fixture link detail/,'a real failure is still a failure');assert.equal(S.lastCompileAttempt.status,'failed');
 });
});

test('the Church lost-context suite detects the pre-change contract (mutation), and visibleCompileFrame is gone',()=>{
 withFixture(f=>{
  const S=churchCompile(f,{compileGeometryProgram:replaced("if(error instanceof DOMException&&error.name==='AbortError')throw new ProgramPreparationPending(gl?.isContextLost()?'lost':'cancelled');",'')});
  f.gl.lost=true;assert.throws(()=>S.compileGeometryProgram('helper',200,208),error=>error instanceof DOMException&&error.name==='AbortError','without the answer the workspace AbortError escapes');assert.equal(S.lastCompileAttempt.status,'failed','and relabels the previous attempt failed');
 });
 const {text}=renderer('church');assert(!/\bvisibleCompileFrame\b/.test(text),'church keeps no write-only visible compile frame');
 assert.equal(nodes('church',node=>ts.isIdentifier(node)&&node.text==='visibleCompileFrame').length,0);
});

// ---- Review RCC-2: compiled, then dropped as material-stale ----
test('City capture: a visit that compiled a family program and dropped it as material-stale keeps its slot, even when the refresh meets a held owner wait (no second compile in the visit)',()=>{
 const guard='if(familyCompilations!==compilations)return new ProgramPreparationPending();';
 for(const [name,rewrite,compilations] of [['current',{},1],['without the compiled-visit guard (mutation)',{capturePendingAfter:replaced(guard,'')},2]])withFixture(f=>{
  const S=cityCapture(f,{rewrite});f.block();
  let stale=false,refreshes=0,id=0;
  // The family program compiles, and the material recipe moves meanwhile.
  S.materialProgramsCurrent=()=>!stale;S.compileGeometryProgram=()=>{stale=true;return{id:'family-'+(++id),program:true};};
  // The refresh that follows meets the blocked ledger: a held owner wait.
  S.refreshMaterialPrograms=()=>{refreshes++;assert.throws(()=>f.compile('refresh'),isProgramPreparationPending);};
  const solar=S.prepareCapturePrograms(fresh());
  assert.equal(S.familyCompilations,compilations,name+': compiles started in one visit');assert.equal(refreshes,compilations,name+': refreshes');
  if(compilations===1){
   assert.equal(solar.pending,2,'the compiled family is pending and the second family waits for the next visit');assert.equal(solar.failed,0);
   assert(f.map.repaints>=1,'familyProgram asked the frame that drives the refreshed retry');
   assert.equal(S.familyPrograms.size,0,'the stale program is not kept');
  }
  S.enabled=false;
 });
});
test('City capture: the compiled-then-stale answer is an ordinary pending in the reflection closure as well',()=>{
 const guard='if(familyCompilations!==compilations)return new ProgramPreparationPending();';
 for(const [name,rewrite,compilations] of [['current',{},1],['without the compiled-visit guard (mutation)',{capturePendingAfter:replaced(guard,'')},2]])withFixture(f=>{
  const S=cityCapture(f,{rewrite});f.block();let stale=false;
  S.materialProgramsCurrent=()=>!stale;S.compileGeometryProgram=()=>{stale=true;return{id:'family',program:true};};
  S.refreshMaterialPrograms=()=>{assert.throws(()=>f.compile('refresh'),isProgramPreparationPending);};
  const reflection=S.preparePlanarReflection(reflectionPass(f),fresh());
  assert.equal(S.familyCompilations,compilations,name+': compiles started in the reflection visit');assert.equal(reflection.pending,2);assert.equal(reflection.failed,0);
  S.enabled=false;
 });
});

// ---- Review RCC-3: an aborted candidate without a successor asks a frame ----
function cityAbortListener(state,rewrite){
 const found=nodes('city',node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='abort'&&!!node.initializer&&ts.isArrowFunction(node.initializer)&&node.initializer.getText().includes('adjacentViewportPublicationSignal'));
 assert.equal(found.length,1,'one City prepared-data abort listener');
 let text=found[0].initializer.getText();if(rewrite){const next=rewrite(text);assert.notEqual(next,text);text=next;}
 const js=ts.transpileModule('('+text+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');
 const scope=new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 return Function('scope','with(scope){return '+js+'}')(scope);
}
function abortCase({successor,superseded=false},rewrite){
 const map={repaints:0,triggerRepaint(){map.repaints++;}},candidate={id:'candidate'},handoffs=[],rollbacks=[];
 const state=bind('city',['rollbackResidentUpload'],{map,candidate,pendingGeometryCandidate:superseded?{id:'other'}:candidate,geometryUploadRevision:4,geometryUploadPending:true,prepared:{signal:{aborted:true}},
  adjacentViewportPublicationSignal:()=>successor,handoffPendingPrograms:signal=>handoffs.push(signal),clearResidentRollback:preserve=>rollbacks.push(preserve),clearCandidateHandoff(){}});
 cityAbortListener(state,rewrite)();
 return{repaints:map.repaints,handoffs:handoffs.length,rollbacks,revision:state.geometryUploadRevision};
}
test('City prepared-data abort with no successor rolls the candidate back and asks one frame; a successor or a superseded candidate asks none here',()=>{
 assert.deepEqual(abortCase({successor:undefined}),{repaints:1,handoffs:0,rollbacks:[false],revision:5},'no successor: rolled back, one frame (as cancelCandidate)');
 assert.deepEqual(abortCase({successor:{id:'next'}}),{repaints:0,handoffs:1,rollbacks:[true],revision:5},'a successor publication repaints when it publishes');
 assert.deepEqual(abortCase({successor:undefined,superseded:true}),{repaints:0,handoffs:0,rollbacks:[],revision:4},'a superseded candidate is untouched');
 assert.equal(abortCase({successor:undefined},text=>text.replace('else if(rollbackResidentUpload())map.triggerRepaint();','else rollbackResidentUpload();')).repaints,0,'the pre-change listener asks no frame (mutation detected)');
});
