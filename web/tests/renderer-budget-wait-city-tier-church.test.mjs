import test from 'node:test';
import assert from 'node:assert/strict';
// City, Tier300 and Church renderers on the page ResourceBudget:
// - a pending answered by a held page-ledger wait requests no caller frame; the
//   owner's onAvailable wake repaints once; every other pending keeps its frame.
//   The first suite covers the catch-site guards (a pending thrown out of the
//   attempt); the spin-site suite drives the production upload/initialize paths,
//   where prepareMainPrograms' own poll swallows each pending compile;
// - solar, capture and reflection preparation results count held budget waits
//   as budgetWaiting and add them when results merge;
// - the projected shadow mask repaints on its ledger wake and withdraws a wait
//   that is no longer wanted;
// - City and Tier300 retire every replaced or abandoned Rathaus scene
//   placeholder (publication, discard, retry, failed or superseded
//   construction, empty batch), so the page 'mask' claim returns to its baseline
//   instead of growing per publication;
// - packed payloads never pin a material producer or assembly closure.
// The program owner, ledger, store and solar helpers are production modules;
// renderer declarations are their own source text (support/renderers-city-
// tier-church-scope.mjs). The City publication suite runs the flattened City
// factory with production Rathaus masks on the page store (support/fixtures-
// renderer-city.mjs), as city-resident-geometry does with fixture masks.
const scope=await import('./support/renderers-city-tier-church-scope.mjs');
const {runtime,bind,budgetFixture,nodes,ts,categoryBytes}=scope;
const {solarShadowPreparationNeedsFrame,createSolarShadowPreparationBudget,isProgramPreparationPending,ProgramPreparationPending}=runtime;
const common=f=>({map:f.map,programPreparation:f.owner,isProgramPreparationPending,ProgramPreparationPending,solarShadowPreparation:runtime.solarShadowPreparation,prepareSolarShadowResources:runtime.prepareSolarShadowResources,createSolarShadowPreparationBudget,gl:f.gl,destroyed:false,pageHidden:false,enabled:true});
const fresh=()=>createSolarShadowPreparationBudget();
function withFixture(work){const f=budgetFixture();try{return work(f);}finally{f.dispose();}}

test('catch-site guards: a held budget wait thrown out of the attempt requests no frame; the ledger wake repaints once; other pending keeps its frame',()=>{
 // These catches see a budget wait only when a pending escapes the attempt; in
 // production the inner preparation swallows it (the spin-site suite below).
 // Tier300 initializeResidentGPU: a candidate's material stage compiles.
 withFixture(f=>{
  const S=bind('tier300',['initializeResidentGPU'],{...common(f),gl:undefined,program:undefined,geometryUploadPending:false,pendingData:{},residentData:undefined,gpuInitializationPrepared:false,releaseGPU(){},prepareGeometryUpload(){},prepareMaterialSource:()=>f.compile('tier300-material')});
  f.block();
  S.initializeResidentGPU(f.gl,false);assert.equal(f.owner.waitingForBudget,true,'the owner holds the onAvailable wake');assert.equal(f.map.repaints,0,'no caller frame for a held budget wait');
  for(let frame=0;frame<3;frame++)S.initializeResidentGPU(f.gl,false);
  assert.equal(f.map.repaints,0,'later frames do not spin while the same recipe waits');assert.equal(f.owner.budgetWaits,4);assert.equal(f.budget.stats.availabilityListeners,1);
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');assert.equal(f.owner.waitingForBudget,false);
  S.prepareMaterialSource=()=>{throw new ProgramPreparationPending();};S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,2,'a non-ledger pending keeps one caller frame');
  S.prepareMaterialSource=()=>f.compile('tier300-admitted');S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,3,'an admitted, queued compile keeps one caller frame');
 });
 // City initializeResidentGPU: the resident candidate's upload compiles; a
 // material source that is not ready yet is its own (non-ledger) pending.
 withFixture(f=>{
  const S=bind('city',['initializeResidentGPU'],{...common(f),gl:undefined,gpuInitializationPrepared:true,pendingGeometryCandidate:{},prepareGeometryUpload:()=>f.compile('city-upload'),prepareMaterialSource:()=>false,sceneIndexCount:()=>0,releaseGPU(){}});
  f.block();
  S.initializeResidentGPU(f.gl,false);S.initializeResidentGPU(f.gl,false);assert.equal(f.owner.waitingForBudget,true);assert.equal(f.map.repaints,0,'no caller frame for a held budget wait');
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');
  S.pendingGeometryCandidate=undefined;S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,1,'empty scene needs no material preflight or caller frame');
  S.sceneIndexCount=()=>3;S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,2,'a nonempty unready material source keeps one caller frame');
 });
 // Church full-program upgrade: the queued candidate's upload compiles.
 withFixture(f=>{
  const state={...common(f),queueOnlyProgram:true,fullProgramUpgradeFailure:undefined,fullProgramUpgradePending:false,pendingGeometry:undefined,hasVisibleUnsupportedQueueComponent:()=>true,capturePackedState:()=>({sceneChunks:[],sceneSpans:[]}),sceneProgramRuns:()=>[],createGeometryCandidate:packed=>({packed}),upload:()=>f.compile('church-full')};
  const S=bind('church',['scheduleFullProgramUpgradeForVisibleUnsupported'],state);
  f.block();
  S.scheduleFullProgramUpgradeForVisibleUnsupported();assert.equal(f.map.repaints,0,'no caller frame for a held budget wait');assert.equal(S.fullProgramUpgradePending,true);assert.equal(S.fullProgramUpgradeFailure,undefined,'a budget wait is not a failure');
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');
  S.pendingGeometry=undefined;S.upload=()=>{throw new ProgramPreparationPending();};S.scheduleFullProgramUpgradeForVisibleUnsupported();assert.equal(f.map.repaints,2,'a non-ledger pending keeps one caller frame');
 });
});

test('church solar, capture-material and reflection results count held budget waits and add them when merged',()=>{
 const church=f=>({...common(f),solarCaptureToken:{},reflectionCaptureToken:{},queueOnlyProgram:false,paintMode:()=>2,sceneIndexCount:()=>3,opacityContext:'normal',opacity:1,needsBirth:false,birth:new Map(),gpuReady:()=>true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},fullColourFailure:undefined,fullColourProgramKey:'full-colour',familyPrograms:new Map(),gpuGeneration:3,fullColourRevision:0,reflectionResidentRevision:0,familySurfaceHelper:'helper',
  reflectionMaterialKey:()=>'material:window',reflectionKeyProgram:()=>undefined,reflectionProgramFailures:new Map(),surfaceFragment:'window helper',diffuseFragment:'diffuse helper',captureRuntime:{invalidate(){},prepareSolar:()=>({status:'ready'})},pruneProgramPreparation(){},
  compileGeometryProgram:(_helper,family=0,_requested,fullColour=false,_queue,demand)=>f.compile('church:'+(demand??(fullColour?'full':'family:'+family)))});
 withFixture(f=>{
  const S=bind('church',['prepareSolarPrograms','prepareCaptureMaterial','prepareSolarShadow'],church(f));
  f.block();
  const solar=S.prepareSolarPrograms(fresh());assert.deepEqual(solar,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});assert.equal(solarShadowPreparationNeedsFrame(solar),false);
  const visited=fresh();visited.compile('another demand','epoch',()=>1);
  assert.deepEqual(S.prepareSolarPrograms(visited),{status:'pending',ready:0,pending:1,failed:0},'a capture-visit slot already used is no ledger wait');
  // paint mode 2: material has no work; the full colour recipe waits; resources ready.
  let merged=S.prepareSolarShadow(fresh());assert.deepEqual(merged,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});assert.equal(solarShadowPreparationNeedsFrame(merged),false);
  S.captureRuntime={invalidate(){},prepareSolar(){assert.fail('capture resources wait for ready programs');}};merged=S.prepareSolarShadow(fresh());
  assert.deepEqual(merged,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1},'program wait defers capture resources');assert.equal(solarShadowPreparationNeedsFrame(merged),false);
  // paint mode 1: the material recipe waits; the full colour path has no work.
  S.paintMode=()=>1;S.captureRuntime={invalidate(){},prepareSolar:()=>({status:'ready'})};
  const material=S.prepareCaptureMaterial(fresh());assert.deepEqual(material,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
  merged=S.prepareSolarShadow(fresh());assert.deepEqual(merged,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});assert.equal(solarShadowPreparationNeedsFrame(merged),false);
  f.unblock();const repaints=f.map.repaints;
  const queued=S.prepareCaptureMaterial(fresh());assert.deepEqual(queued,{status:'pending',ready:0,pending:1,failed:0},'an admitted, queued compile is an ordinary pending');assert.equal(solarShadowPreparationNeedsFrame(queued),true);assert.equal(f.map.repaints,repaints);
 });
 withFixture(f=>{
  const plan=keys=>({plan:keys.map(program=>({program})),triangles:3*keys.length,draws:keys.length});let keys=['current-family:200'];
  const S=bind('church',['preparePlanarReflection'],{...church(f),city:'cologne',berlinSharedFamilyPrograms:undefined,geometryUploadPending:false,reflectionDemandKeys:new Set(),reflectionDemandPlanned:false,captureProgramKeys:()=>new Set(),retireCapturePrograms(){},selectPhysicalReflection:()=>plan(keys),currentPaintProgramFamily:key=>Number(key.split(':')[1])});
  f.block();const pass={gl:f.gl};
  let result=S.preparePlanarReflection(pass,fresh());
  assert.deepEqual(result,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1,plannedTriangles:3,plannedDraws:1});assert.equal(f.map.repaints,0,'a reflection waiting only on the ledger requests no frame');assert.equal(solarShadowPreparationNeedsFrame(result),false);
  keys=['current-family:200','current-family:300'];result=S.preparePlanarReflection(pass,fresh());
  assert.deepEqual(result,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:2,plannedTriangles:6,plannedDraws:2});assert.equal(f.map.repaints,0,'a held wait gives the visit slot back: the second demand is attempted and waits on the same wake');assert.equal(solarShadowPreparationNeedsFrame(result),false);
  f.unblock();const repaints=f.map.repaints;keys=['current-family:400'];result=S.preparePlanarReflection(pass,fresh());
  assert.deepEqual(result,{status:'pending',ready:0,pending:1,failed:0,plannedTriangles:3,plannedDraws:1});assert.equal(f.map.repaints,repaints+1,'an ordinary pending keeps one frame');
 });
});

for(const provider of ['tier300','city'])test(provider+' capture-material, capture-program, solar and reflection results count held budget waits and add them when merged',()=>{
 const city=provider==='city';
 const state=f=>({...common(f),linkedPaint:runtime.currentPaintProgramGroups(provider,'berlin'),paintMode:()=>1,landmarkVisible:true,windowTexture:{stats:{textureObjects:1,ready:true}},surfaceFragment:'window helper',diffuseFragment:undefined,diffuseTexture:undefined,facadeAttached:true,textureShaderFailure:undefined,diffuseShaderFailure:undefined,texturedProgram:undefined,diffuseProgram:undefined,captureContentRevision:()=>'content',
  compileGeometryProgram:helper=>f.compile(provider+':'+helper),solarDemandToken:undefined,reflectionDemandToken:{},solarMaterialDemandActive:()=>true,solarFamilyProgramsNeeded:()=>true,replaceCaptureKeys(){},gpuReady:()=>true,materialProgramsCurrent:()=>true,residentData:{plan:{id:7}},capturePreparation:undefined,overrideProgramKey:()=>undefined,currentPaintProgramKey:family=>'current-family:'+family,program:undefined,
  familyRuns:[{key:'current-family:9',firstIndex:0,indexCount:3}],residentFamilyProgramKeys:()=>new Set(['current-family:9']),familyPrograms:new Map(),familyFailures:new Map(),captureFamilyFailures:new Map(),reflectionCaptureFailures:new Map(),generation:1,materialRecipeRevision:1,programHookSignature:'hooks',familyProgram:key=>f.compile(provider+':'+key),
  captureRuntime:{invalidate(){},prepareSolar:()=>({status:'ready'})},sceneIndexCount:()=>3,opacityContext:'normal',opacity:1,sceneChunks:[],geometryUploadPending:false,c290RoofComponent:()=>undefined,c290ProgramRuns:()=>[],planResidentReflectionChunks:()=>({plan:[{program:'current-family:9'}],triangles:3,draws:1,components:[]})});
 withFixture(f=>{
  const S=bind(provider,['prepareCaptureMaterialPrograms','prepareCapturePrograms','prepareSolarShadow','preparePlanarReflection'],state(f));
  f.block();
  assert.deepEqual(S.prepareCaptureMaterialPrograms(fresh()),{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1},'window material waits on the ledger');
  S.texturedProgram={ready:true};S.diffuseFragment='diffuse helper';S.diffuseTexture={stats:{neededMaterials:{plaster:false,brick:false},totalTextureObjects:2}};
  const diffuse=S.prepareCaptureMaterialPrograms(fresh());assert.deepEqual(diffuse,{status:'pending',ready:1,pending:1,failed:0,budgetWaiting:1},'diffuse material waits on the ledger');assert.equal(solarShadowPreparationNeedsFrame(diffuse),false);
  S.paintMode=()=>2;
  const programs=S.prepareCapturePrograms(fresh());assert.deepEqual(programs,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});
  let merged=S.prepareSolarShadow(fresh());assert.deepEqual(merged,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1});assert.equal(solarShadowPreparationNeedsFrame(merged),false);
  S.captureRuntime={invalidate(){},prepareSolar(){assert.fail('capture resources wait for ready programs');}};merged=S.prepareSolarShadow(fresh());assert.deepEqual(merged,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1},'program wait defers capture resources');assert.equal(solarShadowPreparationNeedsFrame(merged),false);
  // Two families: a held wait gives the capture-visit slot back, so both are attempted and both wait on the one wake.
  if(city)S.residentFamilyProgramKeys=()=>new Set(['current-family:9','current-family:11']);else S.familyRuns=[{key:'current-family:9',firstIndex:0,indexCount:3},{key:'current-family:11',firstIndex:3,indexCount:3}];
  const two=S.prepareCapturePrograms(fresh());assert.deepEqual(two,{status:'pending',ready:0,pending:2,failed:0,budgetWaiting:2});assert.equal(solarShadowPreparationNeedsFrame(two),false);
  const reflection=S.preparePlanarReflection({gl:f.gl,mainMatrix:new Float64Array(16),maxTriangles:99,maxDraws:8},fresh());
  assert.deepEqual(reflection,{status:'pending',ready:0,pending:1,failed:0,budgetWaiting:1,plannedTriangles:3,plannedDraws:1});assert.equal(solarShadowPreparationNeedsFrame(reflection),false);
  assert.equal(f.map.repaints,0,'no preparation path requested a frame while only the ledger was waited on');
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');
  S.familyRuns=[{key:'current-family:13',firstIndex:0,indexCount:3}];S.residentFamilyProgramKeys=()=>new Set(['current-family:13']);
  const queued=S.prepareCapturePrograms(fresh());assert.deepEqual(queued,{status:'pending',ready:0,pending:1,failed:0},'an admitted, queued compile is an ordinary pending');assert.equal(solarShadowPreparationNeedsFrame(queued),true);
 });
});

test('the projected shadow mask repaints on its ledger wake and a no longer wanted wait is withdrawn',()=>{
 for(const provider of ['city','tier300','church']){
  // Wiring: the one shared mask is created with the map's repaint, and the
  // render pass withdraws a pending wait whenever it does not draw the mask.
  const created=nodes(provider,node=>ts.isCallExpression(node)&&node.expression.getText()==='createProjectedShadowMask');
  assert.equal(created.length,1,provider);const options=created[0].arguments[0];assert(options&&ts.isObjectLiteralExpression(options),provider+' passes mask options');
  const repaint=options.properties.find(p=>p.name?.getText()==='requestRepaint');assert(repaint&&ts.isArrowFunction(repaint.initializer)&&repaint.initializer.body.getText()==='map.triggerRepaint()',provider+' wakes the map on the mask ledger wake');
  const pass=nodes(provider,node=>ts.isIfStatement(node)&&node.expression.getText().includes('shadowAlpha>0')&&node.thenStatement.getText().includes('drawProjectedShadows(shadowAlpha)'));
  assert.equal(pass.length,1,provider+' has one projected shadow pass');assert.equal(pass[0].elseStatement?.getText(),'shadowMask?.cancelPending?.();',provider+' withdraws the wait when the pass is skipped');
  // Behaviour: shadows off, hidden page and disabled layer withdraw it; shadows on does not.
  const spy={cancelled:0,cancelPending(){spy.cancelled++;return true;},release(){},draw(){return false;}};
  const S=bind(provider,['setSceneEnvironment','setPageHidden','setEnabled'],{shadowMask:spy,map:{triggerRepaint(){}},programPreparation:{cancel(){},prune(){}},enabled:true,pageHidden:false,sceneEnvironment:{shadows:true,sunlight:true,motion:true,instantISO:'2026-11-01T12:00:00Z'},checkedSceneEnvironment:value=>value,sceneSolarLight:()=>({shadowVector:[1,1]}),sceneSunOrigin:[0,0],ownerReducedMotion:false,reducedMotion:false,birth:new Map(),updateSolarShadowIndices:()=>false});
  S.setSceneEnvironment({shadows:true,sunlight:true,motion:true,instantISO:'2026-11-01T12:00:00Z'});assert.equal(spy.cancelled,0,provider+': shadows on keep the wait');
  S.setSceneEnvironment({shadows:false,sunlight:true,motion:true,instantISO:'2026-11-01T12:00:00Z'});assert.equal(spy.cancelled,1,provider+': shadows off withdraw it');
  S.setPageHidden(true);assert.equal(spy.cancelled,2,provider+': a hidden page withdraws it');S.setPageHidden(true);assert.equal(spy.cancelled,2,'an unchanged hidden state is no new event');
  S.setPageHidden(false);S.setEnabled(false);assert.equal(spy.cancelled,3,provider+': a disabled layer withdraws it');
 }
});

test('packed payloads keep no material-producer or assembly closure',()=>{
 // Tier300: the payload's auxiliary release is made at module scope and closes
 // over that auxiliary alone.
 const release=nodes('tier300',node=>ts.isVariableDeclaration(node)&&node.name.getText()==='releaseAuxiliary');assert.equal(release.length,1);
 assert(ts.isSourceFile(release[0].parent.parent.parent),'releaseAuxiliary is a module-scope declaration');
 const returned=nodes('tier300',node=>ts.isPropertyAssignment(node)&&node.name.getText()==='release'&&node.initializer.getText()==='releaseAuxiliary(auxiliary)');assert.equal(returned.length,1,'packTierChunkMaterials returns the module-scope release');
 let fn=returned[0];while(fn&&!ts.isFunctionDeclaration(fn))fn=fn.parent;assert.equal(fn?.name?.text,'packTierChunkMaterials');
 const make=Function('return ('+ts.transpileModule('('+release[0].initializer.getText()+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+')')();
 let released=0;const auxiliary={maskRecipe:{release(){released++;}}},drop=make(auxiliary);drop();assert.equal(released,1);
 // Tier300 and City: assembly replaces the packing (whose finish closes over the
 // packing function's whole scope) by the chunk leases alone.
 const tier=nodes('tier300',node=>ts.isFunctionDeclaration(node)&&node.name?.text==='prepareMaterialSource')[0].getText();
 assert(tier.includes('pendingGeometry={packed:capturePackedState(),after,data:candidate};candidate.chunkPacking={chunks:candidate.chunkPacking.chunks,finish:()=>after};'),'tier300 drops the assembly closure when the candidate is assembled');
 const city=nodes('city',node=>ts.isFunctionDeclaration(node)&&node.name?.text==='packGeometryCandidate')[0].getText();
 assert(city.includes('candidate.packed=true;candidate.chunkPacking={chunks:candidate.chunkPacking.chunks,finish:()=>true};candidate.args=undefined;'),'city drops the assembly closure when the candidate is packed');
 // City: the material store entry keeps its dispose for the entry's lifetime;
 // that dispose is module-scoped, not a method of buildBatches' scope.
 const dispose=nodes('city',node=>ts.isVariableDeclaration(node)&&node.name.getText()==='disposeCityChunkMaterial');assert.equal(dispose.length,1);
 assert(ts.isSourceFile(dispose[0].parent.parent.parent),'disposeCityChunkMaterial is a module-scope declaration');
 const material=nodes('city',node=>ts.isPropertyAssignment(node)&&node.name.getText()==='dispose'&&node.initializer.getText()==='disposeCityChunkMaterial');assert.equal(material.length,1);
 let owner=material[0];while(owner&&!ts.isFunctionDeclaration(owner))owner=owner.parent;assert.equal(owner?.name?.text,'buildBatches');
 assert.equal(nodes('city',node=>ts.isMethodDeclaration(node)&&node.name.getText()==='dispose'&&node.getText().includes('maskRecipe.release()')).length,0,'no scope-capturing material dispose method remains');
 const disposeMaterial=Function('return ('+ts.transpileModule('('+dispose[0].initializer.getText()+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+')')();
 released=0;disposeMaterial({maskRecipe:{release(){released++;}}});assert.equal(released,1);
});

// ---- City publication with production Rathaus masks on the page ledger ----
// The flattened City fixture lives in support/renderers-city-tier-church-city.mjs
// (shared with the scope probe); it runs over support/fixtures-renderer-city.mjs.
const {cityFixture,component}=await import('./support/renderers-city-tier-church-city.mjs');
async function publicationSeries(f){
 const base=f.maskBytes(),published=[];
 for(let generation=1;generation<=4;generation++){await f.publish('mask-ledger-'+generation,generation);published.push(f.maskBytes());}
 await f.S.setBatches([],5);assert.equal(f.S.sceneChunks.length,0);
 return{base,published,cleared:f.maskBytes()};
}

test('city publications retire each replaced Rathaus scene placeholder: four publishes and one clear return the page mask claim to its baseline',async t=>{
 const f=await cityFixture(t),{S}=f,placeholders=[S.rathausProxyMasks],packings=[],uploads=[];
 assert.equal(placeholders[0].stats.allocatedCPUBytes,2048,'the initial scene placeholder is a production mask with its CPU words');
 // Observe each assembled candidate as it is uploaded, and every scene placeholder.
 const build=S.buildBatches;S.buildBatches=(...args)=>{const packing=build(...args);packings.push(packing);return packing;};
 const upload=S.uploadPreparedGeometry;S.uploadPreparedGeometry=(candidate,current)=>{uploads.push({packing:candidate.chunkPacking,assembled:packings.at(-1)});const result=upload(candidate,current);if(!placeholders.includes(S.rathausProxyMasks))placeholders.push(S.rathausProxyMasks);return result;};
 const {base,published,cleared}=await publicationSeries(f);t.diagnostic('page mask bytes '+JSON.stringify({base,published,cleared}));
 assert.deepEqual(published,[published[0],published[0],published[0],published[0]],'no growth per publication: '+JSON.stringify({base,published,cleared}));
 assert.equal(cleared,base,'publishing four times and clearing once returns the page mask claim to its baseline');
 assert.equal(placeholders.length,5,'each publication installs one scene placeholder');
 for(const [index,placeholder]of placeholders.slice(0,4).entries())assert.equal(placeholder.stats.allocatedCPUBytes,0,'replaced placeholder '+index+' was destroyed');
 assert.notEqual(S.rathausProxyMasks,placeholders[4],'the clear installs its own placeholder');assert.equal(placeholders[4].stats.allocatedCPUBytes,0,'the placeholder replaced by the clear was destroyed');
 assert.equal(S.rathausProxyMasks.stats.allocatedCPUBytes,2048,'the current scene placeholder stays live');
 assert.equal(uploads.length,4);
 for(const row of uploads){assert.notEqual(row.packing,row.assembled,'the assembled packing closure is not retained to publication');assert.equal(row.packing.chunks,row.assembled.chunks,'the chunk leases stay owned');assert.equal(row.packing.finish(),true);}
});

test('the same City series without the placeholder retirement grows by one placeholder per publication (the suite detects the leak)',async t=>{
 const revert=(js,from,to)=>{const out=js.split(from).join(to);assert.notEqual(out,js,'the reverted retirement exists: '+from);return out;};
 const f=await cityFixture(t,{uploadPreparedGeometry:js=>revert(js,'oldMasks.destroy()','void 0'),setBatches:js=>revert(revert(js,'oldMasks.destroy()','oldMasks.detach()'),'failed.destroy()','failed.detach()')});
 const {base,published,cleared}=await publicationSeries(f);t.diagnostic('page mask bytes without retirement '+JSON.stringify({base,published,cleared}));
 for(let i=1;i<published.length;i++)assert.equal(published[i]-published[i-1],2048,'each publication leaks one 2 KiB placeholder: '+JSON.stringify({base,published,cleared}));
 assert.equal(cleared-base,5*2048,'four publishes and one clear leak five placeholders');
});

// ---- F-2 at the actual spin sites, over production preparation paths ----
// Each renderer's own upload/initialize declaration runs over its production
// prepareMainPrograms, whose poll swallows a pending compile as the renderer
// does; only the innermost compile is replaced, by the real program owner on
// the page ledger (budgetFixture: 900 of 1000 B blocked refuses a 640 B
// recipe, so the owner holds one onAvailable wake).
const square=()=>Float64Array.from({length:16},(_,i)=>i%5===0?1:0);
const familyKey=family=>'current-family:'+family,familyOf=key=>Number(key.split(':')[1]);
const replaced=(from,to)=>js=>js.split(from).join(to);
function tierMain(f,rewrite={}){
 const candidate={id:1,targetGeneration:1,materialReady:true,closed:false};
 const state={...common(f),candidate,mainWorldProjection:square(),anchorUnit:1,anchor:[0,0],multiply:()=>square(),updateMainViewport(){},keys:new Set([familyKey(0)]),currentPaintProgramKey:familyKey,currentPaintProgramFamily:familyOf,
  landmarkVisible:false,paintMode:()=>2,windowTexture:undefined,surfaceFragment:undefined,diffuseTexture:undefined,diffuseFragment:undefined,publishedDiffuseNeeds:{plaster:false,brick:false},familyFailures:new Map(),familyPrograms:new Map(),program:undefined,texturedProgram:undefined,diffuseProgram:undefined,familySurfaceHelper:'helper',
  compileGeometryProgram:(helper,family=0)=>f.compile('tier300:'+helper+':'+family),candidateMainStamp:()=>'stamp',candidateBindingStamp:()=>'binding',candidateMainCurrent:()=>true,withPackedCandidate:(_candidate,work)=>work(),
  sceneChunks:[],geometryOwner:{scene:{version:1}},materialSourceSettled:true,residentData:{plan:{id:1}},geometryUploadPending:true,geometryUploadRevision:1,pendingData:candidate,pendingGeometry:{packed:{sceneSpans:[{}]},data:candidate}};
 state.mainFamilyProgramKeys=()=>state.keys;
 return bind('tier300',['prepareGeometryUpload','prepareCandidateMain','prepareResidentMain','prepareMainPrograms','candidateTexturesReady','initializeResidentGPU','residentMainPrograms'],state,rewrite);
}
function cityMain(f,rewrite={}){
 const candidate={packed:true,revision:1,targetGeneration:1,white:false,material:'material',hooks:'hooks',closed:false};
 const state={...common(f),candidate,mainWorldProjection:square(),anchorUnit:1,anchor:[0,0],multiply:()=>square(),updateMainViewport(){},keys:new Set([familyKey(0)]),currentPaintProgramKey:familyKey,currentPaintProgramFamily:familyOf,materialRecipeRevision:1,hookSignature:()=>'hooks',whiteModeEligible:false,paintMode:()=>2,
  landmarkVisible:false,windowTexture:undefined,surfaceFragment:undefined,diffuseTexture:undefined,diffuseFragment:undefined,residentMaterialStyles:[],familyFailures:new Map(),familySurfaceHelper:'helper',
  compileGeometryProgram:(helper,_white=false,family=0)=>f.compile('city:'+helper+':'+family),candidateMainStamp:()=>'stamp',candidateBindingStamp:()=>'binding',candidateMainCurrent:()=>true,withGeometryCandidate:(_candidate,work)=>work(),
  sceneChunks:[],geometryUploadPending:true,geometryUploadRevision:1,geometryPublishedRevision:-1,pendingGeometryCandidate:candidate};
 state.mainFamilyProgramKeys=()=>state.keys;
 return bind('city',['prepareGeometryUpload','prepareCandidateMain','prepareMainPrograms','candidateTexturesReady'],state,rewrite);
}
function churchMain(f,rewrite={}){
 const value={id:1,packed:{generation:1,landmarkVisible:false,loaded:new Map(),sceneChunks:[]},families:new Map(),captureKeys:new Set(),mainKeys:new Set(),materialKeys:new Set(),mainDemandKnown:false,familyCompileFrame:-1,maskReady:false};
 const state={...common(f),value,mainWorldMatrix:square(),queueOnlyProgram:false,city:'cologne',keys:new Set([familyKey(0)]),currentPaintProgramKey:familyKey,currentPaintProgramFamily:familyOf,candidateMaterialKeys:()=>new Set(),refreshCandidateCapture(){},familySurfaceHelper:'helper',familyFailures:new Map(),
  compileGeometryProgram:(helper,family=0)=>f.compile('church:'+helper+':'+family),paintMode:()=>2,windowTexture:undefined,diffuseTexture:undefined,candidateTextureRecipesKnown:()=>false,geometryUploadPending:true,pendingGeometry:value,mainFrame:1};
 state.candidatePaintKeys=()=>state.keys;
 return bind('church',['prepareGeometryUpload','prepareMainPrograms','candidateCurrent','candidateTexturePending'],state,rewrite);
}

test('F-2 at the actual spin sites: a production upload or initialize attempt whose every pending compile is a held ledger wait asks no frame; any other pending keeps one',()=>{
 // Tier300 candidate upload: prepareGeometryUpload -> prepareCandidateMain -> prepareMainPrograms.
 withFixture(f=>{
  const S=tierMain(f);f.block();
  for(let frame=0;frame<4;frame++)S.prepareGeometryUpload();
  assert.equal(f.map.repaints,0,'tier300 candidate upload: no caller frame while only the ledger is waited on');
  assert.equal(f.owner.waitingForBudget,true);assert.equal(f.owner.budgetWaits,4,'one held wait per frame');assert.equal(f.budget.stats.availabilityListeners,1,'one wake');
  f.unblock();assert.equal(f.map.repaints,1,'the ledger wake repaints exactly once');
  S.prepareGeometryUpload();assert.equal(f.map.repaints,2,'an admitted, queued compile keeps its caller frame');
  S.keys=new Set([familyKey(0),familyKey(9)]);S.prepareGeometryUpload();
  assert.equal(f.owner.waitingForBudget,true,'family 9 waits on the ledger');assert.equal(f.map.repaints,3,'a held wait beside an ordinary pending keeps the caller frame');
 });
 // Tier300 resident initialize and resident upload: prepareResidentMain.
 withFixture(f=>{
  const S=tierMain(f);S.pendingData=undefined;S.pendingGeometry=undefined;S.geometryUploadPending=false;f.block();
  for(let frame=0;frame<3;frame++)S.initializeResidentGPU(f.gl,false);
  assert.equal(f.map.repaints,0,'tier300 resident initialize: no caller frame');assert.equal(f.owner.budgetWaits,3);
  S.geometryUploadPending=true;S.pendingGeometry={packed:{sceneSpans:[{}]}};S.prepareGeometryUpload();assert.equal(f.map.repaints,0,'tier300 resident upload: no caller frame');
  S.materialSourceSettled=false;S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,1,'an unsettled material source keeps the caller frame');S.materialSourceSettled=true;
  f.unblock();assert.equal(f.map.repaints,2,'the ledger wake repaints exactly once');
  S.compileGeometryProgram=()=>{throw new ProgramPreparationPending();};S.initializeResidentGPU(f.gl,false);assert.equal(f.map.repaints,3,'an ordinary pending from the compile keeps the caller frame');
 });
 // City candidate upload.
 withFixture(f=>{
  const S=cityMain(f);f.block();
  for(let frame=0;frame<4;frame++)S.prepareGeometryUpload();
  assert.equal(f.map.repaints,0,'city candidate upload: no caller frame');assert.equal(f.owner.budgetWaits,4);assert.equal(f.budget.stats.availabilityListeners,1);
  const compile=S.compileGeometryProgram;S.compileGeometryProgram=(...args)=>{S.materialRecipeRevision++;return compile(...args);};
  S.prepareGeometryUpload();assert.equal(f.map.repaints,1,'a recipe change during the attempt keeps the caller frame');S.compileGeometryProgram=compile;
  f.unblock();assert.equal(f.map.repaints,2,'the ledger wake repaints exactly once');
  S.prepareGeometryUpload();assert.equal(f.map.repaints,3,'an admitted, queued compile keeps its caller frame');
 });
 // Church candidate upload.
 withFixture(f=>{
  const S=churchMain(f);f.block();
  for(let frame=0;frame<4;frame++)S.prepareGeometryUpload();
  assert.equal(f.map.repaints,0,'church candidate upload: no caller frame');assert.equal(f.owner.budgetWaits,4);
  S.paintMode=()=>1;S.value.packed.landmarkVisible=true;S.windowTexture={stats:{ready:false,error:undefined}};
  S.prepareGeometryUpload();assert.equal(f.map.repaints,1,'a pending texture keeps the caller frame');S.paintMode=()=>2;
  f.unblock();assert.equal(f.map.repaints,2,'the ledger wake repaints exactly once');
  S.prepareGeometryUpload();assert.equal(f.map.repaints,3,'an admitted, queued compile keeps its caller frame');
 });
});

test('the spin-site suite detects an ungated frame request and a poll that counts every pending (mutations)',()=>{
 for(const [provider,make] of [['tier300',tierMain],['city',cityMain],['church',churchMain]]){
  withFixture(f=>{const S=make(f,{prepareGeometryUpload:replaced('if(!ledgerWait.heldOnly)map.triggerRepaint();return;','map.triggerRepaint();return;')});f.block();for(let frame=0;frame<4;frame++)S.prepareGeometryUpload();assert.equal(f.map.repaints,4,provider+': an ungated spin site asks a frame every frame');});
  withFixture(f=>{const S=make(f,{prepareMainPrograms:replaced('programPreparation.needsFrameAfter?.(budgetWaits)!==false','true')});f.block();for(let frame=0;frame<4;frame++)S.prepareGeometryUpload();assert.equal(f.map.repaints,4,provider+': a poll without the per-compile judgement asks a frame every frame');});
 }
});

test('church resident preparation names its held family waits; render gates its family frame on them; Tier300 and City render gate theirs',()=>{
 withFixture(f=>{
  const sceneChunks=[];
  const S=bind('church',['prepareResidentMain','prepareMainPrograms','createResidentMainPlan','candidateCurrent','candidateTexturePending'],{...common(f),mainWorldMatrix:square(),queueOnlyProgram:false,city:'cologne',sceneChunks,sceneIndexCount:()=>3,generation:1,mainGPUIncarnation:0,publishedPlanId:1,
   capturePackedState:()=>({generation:1,sceneChunks,loaded:new Map(),landmarkVisible:false}),program:{base:true},familyPrograms:new Map(),familyFailures:new Map(),keys:new Set([familyKey(0),familyKey(9),familyKey(11)]),currentPaintProgramKey:familyKey,currentPaintProgramFamily:familyOf,
   candidateMaterialKeys:()=>new Set(),refreshCandidateCapture(){},familySurfaceHelper:'helper',compileGeometryProgram:(helper,family=0)=>f.compile('church:'+helper+':'+family),paintMode:()=>2,candidateTextureRecipesKnown:()=>false,mainFrame:1});
  S.candidatePaintKeys=()=>S.keys;
  f.block();const wait={heldOnly:false,held:new Set()};
  assert.equal(S.prepareResidentMain(wait),false);assert.equal(wait.heldOnly,true,'both missing families are held ledger waits');assert.deepEqual([...wait.held].sort(),[familyKey(11),familyKey(9)]);
  S.familyFailures.set(familyKey(11),'failed');assert.equal(S.prepareResidentMain(wait),false);assert.equal(wait.heldOnly,false,'a failed family keeps the frame');assert.deepEqual([...wait.held],[familyKey(9)]);S.familyFailures.clear();
  f.unblock();S.keys=new Set([familyKey(0),familyKey(9)]);assert.equal(S.prepareResidentMain(wait),false);assert.equal(wait.heldOnly,false,'an admitted, queued compile keeps the frame');assert.equal(wait.held.size,0);
 });
 // familyDraw is a render-local closure: its frame request reads the account
 // taken for this frame, per missing family.
 const render=nodes('church',node=>ts.isMethodDeclaration(node)&&node.name.getText()==='render'&&node.getText().includes('familyDraw'));assert.equal(render.length,1);const text=render[0].getText();
 assert(text.includes('const residentWait:MainProgramWait={heldOnly:false,held:new Set()},mainPrepared=prepareResidentMain(residentWait);let familyFrame=false;'),'church render takes the account');
 assert(text.includes('if(!selected){familyPending=true;if(!residentWait.held?.has(key))familyFrame=true;'),'a missing family outside the held set asks the frame');
 assert(text.includes('if(familyPending&&(familyFrame||!residentWait.heldOnly))map.triggerRepaint();'),'the family frame request is gated');
 assert(!/if\(familyPending\)map\.triggerRepaint\(\)/.test(text),'no ungated family frame request remains');
 for(const provider of ['tier300','city']){
  const site=nodes(provider,node=>ts.isMethodDeclaration(node)&&node.name.getText()==='render'&&node.getText().includes('prepareResidentMain('));assert.equal(site.length,1,provider);
  assert(site[0].getText().includes('const ledgerWait:MainProgramWait={heldOnly:false};if(!prepareResidentMain(ledgerWait)&&!ledgerWait.heldOnly)map.triggerRepaint();'),provider+' render gates its frame request');
 }
 // No main-preparation call asks a frame without the account any more.
 for(const provider of ['tier300','city','church'])assert(!/!prepare(ResidentMain|CandidateMain|MainPrograms)\((value|candidate|data)?\)\)\{?map\.triggerRepaint\(\)/.test(scope.renderer(provider).text),provider+': no ungated spin site');
});

// ---- Tier300 scene placeholders on the page ledger ----
// Production packing, assembly, discard, retry, publication, empty-batch and
// scene-install declarations run with production Rathaus masks on this graph's
// page store. The fixture packing stands in for packBatches only: one chunk
// whose material recipe comes from a production mask (as packTierChunkMaterials
// makes it) and whose finish binds that recipe and calls the production
// installTierChunkScene, which installs the first chunk's binding as the scene's.
const pageMaskBytes=()=>categoryBytes(runtime.getPageChunkResourceStore().budget,'mask');
test('Tier300 published CPU and animation state survive cancellation of their preparation viewport',async()=>{
 const store=runtime.createChunkResourceStore(),controller=new AbortController();let disposed=0;
 const acquire=(key,value)=>store.acquire({contentKey:key,role:'candidate',signal:controller.signal,estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>value,dispose(){disposed++;}});
 const cpu=acquire('tier-published-cpu',{frame:{unit:1},anchor:[0,0]}),state=acquire('tier-published-state',new Float32Array([1]));
 await Promise.all([cpu.ready,state.ready]);
 const chunk={cpu,state,loaded:new Map([['part',{objectId:'part',firstVertex:0,lastVertex:1}]])},candidate={signal:controller.signal,scope:{},plan:{}};
 const S=bind('tier300',['publishPackedGeometry','grow'],{needsBirth:true,birth:new Map(),seenBirth:new Set(),reducedMotion:true,clock:()=>0,key:row=>row.objectId,reserveBirthSlot:()=>true,map:{triggerRepaint(){}},sceneChunks:[],rathausProxyMasks:{destroy(){}},residentData:undefined,viewRevision:0,dataPublicationRevision:0,pendingData:candidate,
  restorePackedState(packed){S.sceneChunks=packed.sceneChunks;S.sceneSunOrigin=[0,0];},stylesNeeded:()=>({}),sceneSunOrigin:[0,0],sourceLoaded:new Map([['live',{}]])});
 try{
  S.publishPackedGeometry({data:candidate,packed:{sceneChunks:[chunk]}});
  controller.abort(new DOMException('Viewport superseded','AbortError'));
  assert.equal(chunk.cpu.value?.frame.unit,1,'the published source stays readable by shadows and reflection');
  assert.equal(chunk.state.value?.[0],1,'the next animation frame has its published state');
  assert.doesNotThrow(()=>S.grow(),'production animation reads state[0] after the viewport was cancelled');
  assert.equal(disposed,0,'publication owns both payloads until scene retirement');
 }finally{chunk.cpu.release();chunk.state.release();store.destroy();}
 assert.equal(disposed,2,'normal scene retirement releases both payloads once');
});


for(const failure of ['cancelled','retain-failure'])test('Tier300 publication '+failure+' preserves candidate cleanup',async()=>{
 const store=runtime.createChunkResourceStore(),controller=new AbortController();let disposed=0;
 const cpu=store.acquire({contentKey:'unpublished-'+failure,role:'candidate',signal:controller.signal,estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>({frame:{unit:1}}),dispose(){disposed++;}});
 await cpu.ready;
 const chunk={cpu,state:{retain(){throw Error('controlled state retention failure');}}},previous=[];
 const S=bind('tier300',['publishPackedGeometry'],{sceneChunks:previous,mainDrawWitness:{}});
 try{
  if(failure==='cancelled')controller.abort();
  assert.throws(()=>S.publishPackedGeometry({data:{signal:controller.signal},packed:{sceneChunks:[chunk]}}),failure==='cancelled'?{name:'AbortError'}:/controlled state retention failure/);
  assert.equal(S.sceneChunks,previous,'no partial publication');assert.equal(chunk.cpu,cpu,'candidate still owns its original lease');
  controller.abort();assert.equal(disposed,1,'abort cleans up; no extra handoff lease leaks');
 }finally{cpu.release();store.destroy();}
});

function tierScene(rewrite={}){
 const map={repaints:0,triggerRepaint(){map.repaints++;}};
 const S=bind('tier300',['measureSourcePreparation','recordSourcePreparation','prepareMaterialSource','retryLostCandidateChunks','discardPendingGeometry','publishPackedGeometry','capturePackedState','restorePackedState','releaseTierChunks','installTierChunkScene','setBatches'],{
  sourcePreparationStages:{},performance, map,gl:{isContextLost:()=>false},destroyed:false,pageHidden:false,enabled:true,city:'berlin',isProgramPreparationPending,ProgramPreparationPending,
  rathausProxyMasks:runtime.createRathausProxyMasks(),createRathausProxyMasks:runtime.createRathausProxyMasks,sceneChunks:[],sceneSpans:[],pendingGeometry:undefined,pendingData:undefined,residentData:undefined,packingData:undefined,
  dataPublicationRevision:0,generation:0,viewRevision:0,geometryUploadRevision:0,candidateHandoffRevision:0,materialSourceSettled:false,program:undefined,texturedProgram:undefined,diffuseProgram:undefined,familyPrograms:new Map(),familyFailures:new Map(),sourceLoaded:new Map(),
  programPreparation:{work:(_context,job)=>job.current()?(job.work(),true):false,prune(){},releaseProgram(){}},materialSource:()=>'fixture paint'},rewrite);
 let ready=true,failure;
 S.packBatches=(components,generation)=>{
  if(failure)throw failure;
  if(!components.length)return{chunks:[],finish(){S.installTierChunkScene([],[],generation);return{components:[],styles:[],shadowAdmission:undefined};}};
  const source=runtime.createRathausProxyMasks(),recipe=source.cpuRecipe();source.destroy();
  const value={anchor:[0,0],frame:{unit:1,origin:[0,0]},rows:[],runs:[],styles:[],auxiliary:{maskRecipe:recipe,s528ProjectionStats:[]}};
  const lease=(value,dispose=()=>{})=>{let refs=0;const make=()=>{let live=true;refs++;return{value,state:'ready',retain:make,release(){if(live){live=false;if(--refs===0)dispose();}}};};return make();};
  const chunk={source:{},cpu:lease(value,()=>recipe.release()),state:lease(new Float32Array()),loaded:new Map(),shadowIndices:new Uint32Array()};
  return{chunks:[chunk],finish(){if(!ready)return undefined;if(!chunk.masks)chunk.masks=recipe.createBinding();S.installTierChunkScene([chunk],[],generation);return{components:[],styles:[],shadowAdmission:undefined};}};
 };
 let sequence=0;
 const candidate=()=>{const id=++sequence;return{id,targetGeneration:id,plan:{id,prepareMetadata(){},specialization:undefined,clearPreparedSource(){},release(){}},scope:{},releaseScope(){},materialReady:false,packedReady:false,args:[[{objectId:'tier-'+id}],id]};};
 return{S,map,
  set ready(value){ready=value;},set failure(value){failure=value;},
  pack(){const value=candidate();S.pendingData=value;S.prepareMaterialSource();return value;},
  publish(){const value=S.pendingGeometry;assert(value?.data,'an assembled candidate');S.pendingGeometry=undefined;S.publishPackedGeometry(value);},
  dispose(){S.discardPendingGeometry();S.releaseTierChunks(S.sceneChunks);S.sceneChunks=[];S.rathausProxyMasks.destroy();}};
}

test('tier300 retires each replaced or abandoned scene placeholder: publications, a discard, a retry, failed packings and an empty batch keep the page mask claim at its baseline',t=>{
 const f=tierScene(),{S}=f,base=pageMaskBytes(),initial=S.rathausProxyMasks,published=[];
 try{
  for(let generation=1;generation<=4;generation++){const value=f.pack();assert.equal(S.pendingGeometry?.data,value,'assembled');f.publish();published.push(pageMaskBytes());}
  t.diagnostic('tier300 page mask bytes '+JSON.stringify({base,published}));
  assert.deepEqual(published,[base,base,base,base],'each publication holds one chunk recipe in place of the scene placeholder');
  assert.equal(initial.stats.allocatedCPUBytes,0,'the initial scene placeholder was destroyed at the first publication');
  // An unassembled candidate: its base placeholder and chunk return on discard.
  f.ready=false;f.pack();assert.equal(pageMaskBytes(),base+2*2048,'a packed, unassembled candidate holds its base placeholder and its chunk recipe');
  S.discardPendingGeometry();assert.equal(pageMaskBytes(),base,'a discard returns both');
  // A lost chunk: the retry releases the old packing and its base placeholder.
  const lost=f.pack();lost.chunkPacking.chunks[0].cpu.state='lost';assert.equal(S.retryLostCandidateChunks(lost),true);assert.equal(pageMaskBytes(),base,'a retry returns both');
  S.discardPendingGeometry();f.ready=true;
  // A failed packing destroys its placeholder; the candidate is discarded.
  f.failure=Error('controlled packing failure');f.pack();assert.equal(S.pendingData,undefined,'the failed candidate is discarded');assert.equal(pageMaskBytes(),base,'a failed packing returns its placeholder');
  // Empty batches: a failed empty packing, then a published one.
  assert.throws(()=>S.setBatches([],10),/controlled packing failure/);assert.equal(pageMaskBytes(),base,'a failed empty packing returns its placeholder');f.failure=undefined;
  S.setBatches([],11);assert.equal(S.sceneChunks.length,0);assert.equal(pageMaskBytes(),base,'the empty publication holds only its own placeholder');
 }finally{f.dispose();}
 assert.equal(pageMaskBytes(),base-2048,'teardown returns the last scene placeholder');
 // The renderer's own teardown destroys its scene placeholder (as City and Church).
 const teardown=nodes('tier300',node=>ts.isMethodDeclaration(node)&&node.name.getText()==='destroy'&&node.getText().includes('immutableAltesSourceReadback.destroy()'));assert.equal(teardown.length,1);
 assert(teardown[0].getText().includes('releaseTierChunks(previousChunks);rathausProxyMasks.destroy();'),'renderer teardown destroys the scene placeholder');
});

test('the tier300 placeholder suite detects each removed retirement (mutations)',()=>{
 const cases=[
  ['assembly',{prepareMaterialSource:replaced('if(candidate.packedBase!==base&&base.rathausProxyMasks!==rathausProxyMasks)base.rathausProxyMasks.destroy();','')},f=>{f.pack();f.publish();f.pack();f.publish();},2*2048],
  ['publication',{publishPackedGeometry:replaced('if(previousMasks!==rathausProxyMasks&&!sceneChunks.some(chunk=>chunk.masks===previousMasks))previousMasks.destroy();','')},f=>{f.pack();f.publish();f.pack();f.publish();},2048],
  ['discard',{discardPendingGeometry:replaced('base?.rathausProxyMasks?.destroy();','')},f=>{f.ready=false;f.pack();f.S.discardPendingGeometry();},2048],
  ['retry',{retryLostCandidateChunks:replaced('base?.rathausProxyMasks?.destroy();','')},f=>{f.ready=false;const lost=f.pack();lost.chunkPacking.chunks[0].cpu.state='lost';f.S.retryLostCandidateChunks(lost);f.S.discardPendingGeometry();},2048],
  ['failed packing',{prepareMaterialSource:replaced('if(failedMasks&&failedMasks!==rathausProxyMasks)failedMasks.destroy();','')},f=>{f.failure=Error('controlled packing failure');f.pack();},2048],
  ['failed empty packing',{setBatches:replaced('if(failedMasks&&failedMasks!==rathausProxyMasks)failedMasks.destroy();','')},f=>{f.failure=Error('controlled packing failure');assert.throws(()=>f.S.setBatches([],10));},2048],
 ];
 // With every retirement each run ends at its own baseline (the suite above);
 // without one, the claim it would have returned stays.
 for(const [name,rewrite,run,leak] of cases){
  const f=tierScene(rewrite),base=pageMaskBytes(),scene=f.S.rathausProxyMasks;
  try{run(f);assert.equal(pageMaskBytes()-base,leak,name+': the removed retirement leaks '+leak+' bytes');}
  finally{f.dispose();scene.destroy();}
 }
});

test('city: a failed or superseded nonempty construction and a failed empty build return their scene placeholder claim',async t=>{
 const f=await cityFixture(t),{S}=f;
 await cityFailureSeries(f,S,(label,before,after)=>assert.equal(after,before,label+' returns its placeholder claim'));
});

test('the same City failures without their retirements leak one placeholder each (the suite detects them)',async t=>{
 const revert=(js,from,to)=>{const out=js.split(from).join(to);assert.notEqual(out,js,'the reverted retirement exists: '+from);return out;};
 const f=await cityFixture(t,{setBatches:js=>revert(revert(js,'constructionMasks.destroy()','void 0'),'failed.destroy()','failed.detach()')}),{S}=f;
 await cityFailureSeries(f,S,(label,before,after)=>assert.equal(after-before,2048,label+' leaks one 2 KiB placeholder without its retirement'));
});

async function cityFailureSeries(f,S,check){
 await f.publish('construction-base',1);const scene=S.rathausProxyMasks;
 const created=[],create=S.createRathausProxyMasks;S.createRathausProxyMasks=(...args)=>{const value=create(...args);created.push(value);return value;};
 // A nonempty construction calls clearMaterialSource(false) for its new prepared
 // receipt; the fixture fails that one call, or supersedes the handoff in it.
 const clear=S.clearMaterialSource;let mode;S.clearMaterialSource=(...args)=>{const armed=args[0]===false?mode:undefined;if(armed)mode=undefined;if(armed==='throw')throw Error('controlled construction failure');if(armed==='supersede')S.candidateHandoffRevision++;return clear(...args);};
 const build=S.buildBatches;let failEmpty=false;S.buildBatches=(...args)=>{if(!args[0].length&&failEmpty){failEmpty=false;throw Error('controlled empty build failure');}return build(...args);};
 const attempt=async(label,arm,run,pattern)=>{const before=f.maskBytes(),count=created.length;arm();await assert.rejects(run(),pattern);
  assert.equal(created.length,count+1,label+' made one scene placeholder');assert.equal(mode,undefined,label+' reached its controlled failure');assert.equal(S.rathausProxyMasks,scene,label+' restores the resident scene');assert.equal(S.generation,1);check(label,before,f.maskBytes());};
 await attempt('a failed construction',()=>{mode='throw';},()=>S.setBatches([component('construction-throw')],2),/controlled construction failure/);
 await attempt('a superseded construction',()=>{mode='supersede';},()=>S.setBatches([component('construction-supersede')],2),/superseded during construction/);
 await attempt('a failed empty build',()=>{failEmpty=true;},()=>S.setBatches([],3),/controlled empty build failure/);
 S.createRathausProxyMasks=create;S.clearMaterialSource=clear;S.buildBatches=build;
 // The renderer still publishes afterwards.
 await f.publish('construction-after',4);
}
