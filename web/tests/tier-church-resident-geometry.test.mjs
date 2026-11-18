import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {installRendererClosures,bundleRendererModules} from './support/f5resb-renderer-closures.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(web+'package.json'),ts=require('typescript');
// The shared setup runs as a data: module, which has no hierarchical base URL: its relative support
// import is resolved here against this file, as program-preparation and tier300-program-specialization do.
const sharedText=fs.readFileSync(web+'tests/resident-planar-reflection.test.mjs','utf8'),sharedSetup=sharedText.slice(0,sharedText.indexOf('for(const provider of providers)test(')).replace("process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url))",JSON.stringify(web)).replace("new URL('./support/resident-chunk-scene.mjs',import.meta.url)",JSON.stringify(new URL('./support/resident-chunk-scene.mjs',import.meta.url).href)),{preparedPaintPlan,installCaptureDemandBindings}=await import('data:text/javascript;base64,'+Buffer.from(sharedSetup+'\nexport {preparedPaintPlan,installCaptureDemandBindings};').toString('base64'));
const providers=['tier300','church'];
// Chunk residency: both renderers' own imports (chunk packing, mask recipes, renderer chunk input, JSON/GLSL
// assets) and the page runtime share one esbuild module graph (support/f5resb-renderer-closures.mjs), so the
// chunk store, ledger, program owner and resident geometry are one module state, as on one page.
const RUNTIME_IDS=['safety/prepared-source','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/program-grant-handoff','safety/viewport-request','safety/render-runtime/program-preparation','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/resident-geometry','safety/resident-gpu-lifecycle','safety/frozen-data-scope','painted/delegated500/safety/paint-run-visibility','painted/delegated500/safety/current-paint-program','safety/renderer-chunk-input'];
const rendererFiles=Object.fromEntries(providers.map(p=>[p,`src/painted/${p}/safety/building-mesh-renderer.ts`])),rendererBundle=await bundleRendererModules(Object.values(rendererFiles),RUNTIME_IDS.map(id=>'src/'+id+'.ts'));
const runtimeModules={load:id=>{assert(RUNTIME_IDS.includes(id),'unexpected runtime module '+id);return rendererBundle.load('src/'+id+'.ts');}};
const functions=['capturePackedState','restorePackedState','pendingGeometryBytes','discardPendingGeometry','publishPackedGeometry','packBatches','setBatches','upload','prepareGeometryUpload','uploadPreparedGeometry','uploadState','writeSelectionState','paintSelection','growthSnapshot','grow','reserveBirthSlot','rememberFinishedBirth','retireUnloadedBirths','initializeResidentGPU','gpuReady','releaseGPU','contextLost'];
function actual(provider){
 const file=web+`src/painted/${provider}/safety/building-mesh-renderer.ts`,text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,99,true),nodes=new Map(),methods=new Map(),bindings=new Map();
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name)nodes.set(n.name.text,n);if(ts.isMethodDeclaration(n))methods.set(n.name.getText(ast),n);if(ts.isVariableDeclaration(n)&&n.initializer)bindings.set(n.name.getText(ast),n.initializer);ts.forEachChild(n,visit);}visit(ast);
 const fields=nodes.get('capturePackedState').body.statements[0].expression.properties.map(p=>p.name.getText(ast));
 const lifecycleSeams=[];(function find(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='createResidentGPULifecycle'&&n.arguments[0]&&ts.isObjectLiteralExpression(n.arguments[0]))for(const property of n.arguments[0].properties)if(ts.isPropertyAssignment(property)&&property.name.getText(ast)==='hasResident')lifecycleSeams.push(property.initializer.getText(ast));ts.forEachChild(n,find);})(ast);assert.equal(lifecycleSeams.length,1,provider+' createResidentGPULifecycle hasResident');
 const declarations=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.every(d=>['C','EPS','merc','geo','unit','key','sub','dot','cross'].includes(d.name.getText(ast)))).map(n=>n.getText(ast));
 const compile=(()=>{let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='compileGeometryProgram')found=n;ts.forEachChild(n,visit);}visit(ast);assert(found,'compileGeometryProgram');return 'const '+found.getText(ast)+';';})();
 const helpers=provider==='tier300'?['trimFamilyPrograms','prepareResidentMain','prepareMainPrograms','mainProgramRolesCurrent','mainProgramsCurrent','mainFrameStamp','mainDrawWitnessCurrent','mainRequiredFailed','completeMainDraw','selectGeometryPlan','clearCandidateHandoff','handoffPendingPrograms','multiply','recordMainProjection','invalidateMainProjection','candidateMainStamp','candidateBindingStamp','candidateTexturesReady','releaseCandidateMain','prepareCandidateMain','candidateMainCurrent','cancelCandidate','withPackedCandidate','stylesNeeded','applyDiffuseNeeds','dataScope','retireData','clearDataPreparation','prepareBatches','clearMaterialSource','solarMaterialDemandActive','reconcileMaterialSource','capturePreparationDiagnostic','materialSource','prepareMaterialSource','replayMaterialBatches']:[ 'createResidentMainPlan','prepareResidentMain','prepareMainPrograms','invalidateMainFrame','takeCompletedMainFrame','mainBindingStamp','mainRolePrograms','hasRequiredMainFailure','mainWitnessCurrent','mainFrameCurrent','captureMainFrameWitness','recordCompleteMainFrame','clearProgramGrantHandoff','candidateMaterialKeys','candidateTextureRecipesKnown','colourProgramHasConsumer','multiply','mainPaintDemandFor','mainPaintDemand','mainPaintProgramKeys','candidateCurrent','candidateMatrix','candidatePaintDemand','candidatePaintKeys','createGeometryCandidate','candidateTexturePending','candidateMainReady','refreshCandidateCapture','clearCandidateGPU','cancelCandidate','colourProgramRecipe','clearBerlinProgramComparison','captureProgramKeys'];
 const authorityName=provider==='tier300'?'tierProgramSourceAuthority':'churchColourSourceAuthority';assert(bindings.has(authorityName),authorityName);
 const handoffName=provider==='tier300'?'candidateProgramHandoff':'programGrantHandoff';assert(bindings.has(handoffName),handoffName);
 const source=[...declarations,'const '+handoffName+'='+bindings.get(handoffName).getText(ast)+';',...(provider==='tier300'?['const residentMainPrograms='+bindings.get('residentMainPrograms').getText(ast)+';']:[]),'const '+authorityName+'='+bindings.get(authorityName).getText(ast)+';','const overrideProgramKey='+bindings.get('overrideProgramKey').getText(ast)+';',compile,nodes.get('validate').getText(ast),...helpers.map(name=>nodes.get(name).getText(ast)),...functions.map(name=>nodes.get(name).getText(ast)),...['setPageHidden','setEnabled'].map(name=>'function '+methods.get(name).getText(ast))].join('\n');
 const initialized=['gpuPreflightRequired',...(provider==='tier300'?['candidateHandoffRevision','preparedProgramHandoffs','mainGPUIncarnation','mainRenderFrame','pendingMainFrame','pendingEmptyMainFrame','familyCompilations','familyEvictions']:[]),...(provider==='church'?['fullColourProgramKey','fullColourRevision','fullColourSourceCharacters','mainGPUIncarnation','residentMainMasksReady']:[])];
 // The extracted source's own local bindings that later closure bindings (bound on first use against the
 // fixture state) reach: module helpers, the colour authority, the grant handoff and overrideProgramKey.
 const locals=[...ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.every(d=>['C','EPS','merc','geo','unit','key','sub','dot','cross'].includes(d.name.getText(ast)))).flatMap(n=>n.declarationList.declarations.map(d=>d.name.getText(ast))),handoffName,...(provider==='tier300'?['residentMainPrograms']:[]),authorityName,'overrideProgramKey'];
 return {text,fields,helpers,locals,hasResident:lifecycleSeams[0],initializers:Object.fromEntries(initialized.map(name=>{assert(bindings.has(name),provider+' '+name);return[name,bindings.get(name).getText(ast)];})),solarIndices:provider==='tier300'?nodes.get('updateSolarShadowIndices').getText(ast):undefined,definitions:Object.fromEntries(['uploadShadow','releaseShadowGPU','drawProjectedShadows',...(provider==='church'?['scheduleFullProgramUpgradeForVisibleUnsupported']:[])].map(name=>[name,nodes.get(name).getText(ast)])),js:ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText};
}

test('church: queue-only upgrade keeps the successful program and geometry until the full candidate publishes',async()=>{
 for(const failure of ['compile','upload',undefined]){
  const f=await integratedFixture('church'),{ctx,api}=f;ctx.queueOnlyProgram=true;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const before=api.capturePackedState(),gpu=f.geometryOwner.current,program=ctx.program,deleted=f.deleted.length,uploads=f.uploaded.length;
  if(failure==='compile')f.control.failCompile=true;
  f.turn(()=>ctx.scheduleFullProgramUpgradeForVisibleUnsupported());assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(ctx.sceneChunks,before.sceneChunks);assert.equal(ctx.queueOnlyProgram,true);await f.drain();
  for(let i=0;i<20;i++){if(failure==='upload')f.control.failUpload=true;f.turn(()=>ctx.scheduleFullProgramUpgradeForVisibleUnsupported());api.prepareGeometryUpload();await f.drain();if(ctx.fullProgramUpgradeFailure||ctx.queueOnlyProgram===false)break;assert(i<19);}
  // Chunk residency: the full-program upgrade keeps the same packed chunks, so it reuses their content-addressed
  // resident GPU geometry (no new upload): only a program failure can fail it. An upload failure armed for the
  // upgrade is never reached, and the upgrade publishes the full program over the same resident geometry.
  if(failure==='upload'){assert.equal(f.uploaded.length,uploads,'the upgrade issues no geometry upload');assert.equal(ctx.fullProgramUpgradeFailure,undefined);assert.equal(ctx.queueOnlyProgram,false);assert.notEqual(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(ctx.sceneChunks,before.sceneChunks);assert(f.deleted.slice(deleted).includes(program));}
  else if(failure){assert(ctx.fullProgramUpgradeFailure);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(ctx.sceneChunks,before.sceneChunks);assert.equal(ctx.queueOnlyProgram,true);assert(!f.deleted.slice(deleted).includes(program));const held=ctx.fullProgramUpgradeFailure;f.turn(()=>ctx.scheduleFullProgramUpgradeForVisibleUnsupported());assert.equal(ctx.fullProgramUpgradeFailure,held);assert.equal(ctx.pendingGeometry,undefined);}
  else{api.prepareGeometryUpload();assert.equal(ctx.queueOnlyProgram,false,ctx.fullProgramUpgradeFailure);assert.notEqual(ctx.program,program);assert.equal(f.geometryOwner.current,gpu,'content-addressed reuse of the resident chunk geometry');assert.equal(f.uploaded.length,uploads);assert.equal(ctx.sceneChunks,before.sceneChunks);assertSameStates(sceneStates(ctx),sceneStates(before));assert.equal(ctx.geometryUploadPending,false);assert(f.deleted.slice(deleted).includes(program));assert.equal(ctx.fullProgramUpgradeFailure,undefined);}
  api.releaseGPU();f.dispose();f.owner.dispose();
 }
});
const sources=Object.fromEntries(providers.map(p=>[p,actual(p)]));
function load(relative,dependencies={}){
 const source=fs.readFileSync(web+relative,'utf8'),js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
 Function('module','exports','require',js)(module,module.exports,name=>{assert(name in dependencies,name);return dependencies[name];});return module.exports;
}
// The page runtime is loaded through its real relative imports (one page graph: scheduler, completion,
// program owner, chunk store, ledger, resident geometry), not a hand-maintained require map; the
// former map missed program-preparation's chunk-store/ledger imports and failed the whole file.
const schedulerAPI=runtimeModules.load('safety/render-runtime/preparation-scheduler');
const completionAPI=runtimeModules.load('safety/render-runtime/submitted-program-completion'),grantHandoffAPI=runtimeModules.load('safety/render-runtime/program-grant-handoff'),viewportAPI=runtimeModules.load('safety/viewport-request'),preparationAPI=runtimeModules.load('safety/render-runtime/program-preparation'),geometryAPI=runtimeModules.load('safety/render-runtime/resident-geometry');
const lifecycleAPI=runtimeModules.load('safety/resident-gpu-lifecycle'),scopeAPI=runtimeModules.load('safety/frozen-data-scope'),visibilityAPI=runtimeModules.load('painted/delegated500/safety/paint-run-visibility'),paintKeysAPI=runtimeModules.load('painted/delegated500/safety/current-paint-program');
// Chunk production settles through the page scheduler and store promises: between fixture frames the
// event loop runs (as a browser does between animation frames), captured before any turn() override.
const realSetTimeout=globalThis.setTimeout,nextTask=()=>new Promise(resolve=>realSetTimeout(resolve,0));
const mainProjection=Float64Array.from({length:16},(_,i)=>i%5===0?(i===15?1:.1):0);

// Diagnostic trace only: indices of a chunk scene (the lifecycle's hasResident seam is the renderer's own text).
const chunkIndexCount=chunks=>(chunks??[]).reduce((n,chunk)=>n+(chunk.cpu.value?.indices.length??0),0);
// Chunk residency views: the canonical 9-float geometry, indices and paint live in each packed chunk's CPU value
// (cpu.value) and the separate 1-float selection/growth state in the chunk's own state array (church:
// chunk.stateData; tier300: its state lease). "Same resident" now means the same published chunk scene and the
// same per-chunk state arrays, not one renderer-wide vertex/state array.
const chunkState=chunk=>chunk.stateData??chunk.state?.value;
const sceneStates=state=>state.sceneChunks.map(chunkState);
const onlyChunk=state=>{assert.equal(state.sceneChunks.length,1,'one packed chunk');return state.sceneChunks[0];};
function assertSameStates(actual,expected,message){assert.equal(actual.length,expected.length,message);actual.forEach((value,i)=>assert.equal(value,expected[i],message));}
// Closure-level production values the suites opt into (source workspace, chunk state owner, attribute list).
// Each fixture is its own renderer instance on the shared page store: a distinct renderer id, as two layers
// on one page have, keeps the legacy (unprepared) chunk content keys of different fixtures apart.
let fixtureRendererSequence=0;
// The chunk state binding's buffer layout per renderer (state uploaded, the rest borrowed).
// tier300 binds through the shared allocateChunkMeshView, whose borrowed canonical vertex buffer key is 'vertex'.
const STATE_BINDING_KEYS={church:['static','state','paint'],tier300:['vertex','state','paint','progressive']};
// A failure produced inside a chunk store production crosses the store as its bounded copy (same name and
// message, chunk-resource-store boundedFailure), never as the producer's own error object.
const sameBoundedFailure=(actual,expected)=>actual instanceof Error&&actual.name===expected.name&&actual.message===expected.message;
// As the manager does, tier300 batches are prepared with authoritative renderer chunk input: one ingress source
// group over the page store the renderer's geometry owner uses, with a page-unique content key.
let tierChunkSequence=0;
const tierChunkInput=(ctx,rows)=>({store:ctx.geometryOwner.store,groups:[{contentKey:'tier-fixture-source:'+(++tierChunkSequence)+':'+rows.map(row=>row.objectId).join(','),components:rows,parents:[],frame:runtimeModules.load('safety/renderer-chunk-input').rendererChunkFrame(rows[0].origin,'fixture-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]});
const CONSTRUCTED={church:['sourceWorkspace','colourAttributes','chunkStateOwner'],tier300:['tierStateOwner']};
// The renderer's own resident GPU lifecycle seam: the hasResident initializer of its createResidentGPULifecycle
// call (resident chunk scene, candidate chunk scene or tier300 pending data), evaluated on the fixture state.
function residentSceneSeam(provider,ctx){const js=ts.transpileModule('('+sources[provider].hasResident+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return Function('env','with(env){return '+js+'}')(new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)}));}
function component(id=1){return {city:'berlin',objectId:'osm/way/'+id,partId:'part-'+id,origin:[0,0],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[0,1],[0,0]]]},batches:[{positions:new Float32Array([0,0,0,2,0,0,0,3,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),color:[.25,.5,.75],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]};}
async function fixture(provider,{attach=true}={}){
 const packed=sources[provider],ctx=Object.fromEntries(packed.fields.map(name=>[name,undefined])),jobs=[],uploads=[],effects=[],masks=[];
 let nextGPU=0;
 // The resident geometry seam exposes the page store whose ledger the prepared tier300 data plan binds to.
 const pageStore=runtimeModules.load('safety/render-runtime/chunk-resource-store').createChunkResourceStore({budget:runtimeModules.load('safety/render-runtime/resource-budget').createResourceBudget({limitBytes:256*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 // Controlled chunk geometry owner (no GL): allocate records each chunk geometry plan and lends a lease whose
 // value is a fresh controlled GPU handle set (borrowed buffers keep their identity); publish installs the
 // chunk leases as the current scene, as the actual createResidentGeometryOwner does for one context.
 // Its published scene carries a version (as the actual owner's chunk scene), advanced by every publish/release.
 const geometryOwner={store:pageStore,current:undefined,currentLeases:[],currentGeometries:[],sceneVersion:0,get scene(){return{owner:ctx.id,version:this.sceneVersion,leases:this.currentLeases};},
  allocate(_gl,_program,plan){uploads.push(plan);if(ctx.uploadError)throw ctx.uploadError;if(plan.current&&!plan.current())throw Error('Stale geometry');const value={revision:plan.revision,vao:{id:++nextGPU},indexBuffer:plan.indexBuffer??{},buffers:new Map(plan.buffers.map(b=>[b.key,b.buffer??{}]))};let released=false;return{contentKey:plan.contentKey,value,get released(){return released;},release(){released=true;}};},
  publish(leases,{current}={}){if(current&&!current())return false;this.currentLeases=[...leases];this.currentGeometries=leases.map(lease=>lease.value);this.current=leases.length===1?leases[0].value:undefined;this.sceneVersion++;return true;},
  release(){this.current=undefined;this.currentLeases=[];this.currentGeometries=[];this.sceneVersion++;effects.push('geometry-release');},contextLost(){this.release();}};
  // tier300 allocates each chunk view through the shared allocateChunkMeshView: one static allocation (canonical
  // vertex, paint and progressive arrays with the chunk indices) on its staticGeometryOwner, then the view on
  // geometryOwner borrowing those buffers beside its own state. The controlled static owner records its plans in
  // the same upload log and lends controlled handles, as the controlled geometry owner does.
  const staticGeometryOwner={store:pageStore,allocate:geometryOwner.allocate,release(){},contextLost(){}};
 const makeMasks=()=>{const residents=new Map(),value={detached:false,stats:{allocatedCPUBytes:16},configure(_rows,data){if(ctx.maskError)throw ctx.maskError;if(data.length)data[4]=42;},prepare(context,programs){ctx.onMaskPrepare?.(value,programs);if(context.isContextLost())return{ready:false,reason:'context-lost'};let set=residents.get(context);if(!set)residents.set(context,set=new Set());for(const program of programs)set.add(program);return{ready:true};},isResident:(context,program)=>!context.isContextLost()&&!!residents.get(context)?.has(program),detach(){value.detached=true;residents.clear();},
  // Chunk residency: a packed chunk carries its mask CPU recipe and each published chunk creates its own
  // binding from it (a fresh controlled binding here); a retired chunk destroys its binding.
  destroyed:false,destroy(){value.destroyed=true;value.detached=true;residents.clear();},covered:()=>false,residentRevision:'fixture',origin:undefined,costs:[],
  withResidentMasks:(context,program,draw)=>{if(!value.isResident(context,program))return false;draw();return true;},withMasks:(_context,_program,draw)=>draw(),
  retain(){let live=true;return{prepare:(context,programs)=>live?value.prepare(context,programs):{ready:false,reason:'mask-lease-released'},isResident:(context,program)=>live&&value.isResident(context,program),withResidentMasks:(context,program,draw)=>live&&value.withResidentMasks(context,program,draw),get residentRevision(){return value.residentRevision;},get origin(){return value.origin;},release(){live=false;}};},
  retainReady(){const {prepare,...pin}=value.retain();return pin;},
  cpuRecipe(){return{words:new Float32Array(),masks:[],wordMasks:[],origin:undefined,costs:[],retain:()=>({release(){}}),release(){},createBinding:()=>makeMasks()};}};masks.push(value);return value;};
 Object.assign(ctx,{
  ...visibilityAPI,...paintKeysAPI,...grantHandoffAPI,...viewportAPI,grantHandoffGeneration:undefined,packingPublishedMainDemand:undefined,createProgramSourceAuthority:preparationAPI.createProgramSourceAuthority,mainWorldMatrix:mainProjection.slice(),mainFrame:0,residentTextureStyles:[],publishedPlanId:0,VERTEX:'original vertex interface',withResidentReflectionClip:s=>s,specializeCurrentPaintFragment:s=>s,fragment:()=> 'original family fragment',familyFragmentSource:()=> 'original family fragment',familySurfaceHelper:'original family helper',mainWorldProjection:undefined,mainWorldProjectionRevision:0,dataPublicationRevision:0,packingPublishedContent:undefined,candidateFailureGeneration:undefined,candidateFailure:undefined,mainDrawWitness:undefined,emptyMainDrawWitness:undefined,mainFrameWitness:undefined,pendingMainFrame:undefined,publishedDiffuseNeeds:{plaster:false,brick:false},publishedLandmark:false,mainViewportMatrix:undefined,mainViewportRuns:undefined,
  id:'tier-church-fixture-'+(++fixtureRendererSequence),city:'berlin',destroyed:false,pageHidden:false,enabled:true,generation:0,viewRevision:0,matrix:undefined,needsBirth:true,
  sceneSunOrigin:[0,0],sceneSun:{},sceneSunInstant:'fixture',anchor:[0,0],anchorUnit:1,materialAnchor:undefined,materialUnit:1,
  paintData:new Float32Array(),progressiveData:new Float32Array(),vertices:new Float32Array(),stateData:new Float32Array(),indices:new Uint32Array(),loaded:new Map(),sourceLoaded:new Map(),heldSourceOutlines:[],nativeGroupPlan:undefined,landmarkVisible:false,familyRuns:[],
  s434DrawableCounts:new Map(),s434DisplayProfile:null,s528ProjectionStats:[],pickBlocks70:{bounds:new Float64Array(),typedBytes:0},
  rathausProxyMasks:makeMasks(),createRathausProxyMasks:makeMasks,pendingGeometry:undefined,geometryUploadRevision:0,geometryUploadPending:false,geometryUploadFailure:undefined,geometryPostPublishFailure:undefined,shadowUploadPending:false,
  geometryOwner,staticGeometryOwner,program:{},gl:{ARRAY_BUFFER:1,ARRAY_BUFFER_BINDING:2,createVertexArray(){throw Error('manual packing uses its controlled geometry owner');},isContextLost:()=>false,getParameter:()=>null,bindBuffer(){},bufferSubData(_target,_offset,data){effects.push(['state',Array.from(data)]);}},vao:undefined,indexBuffer:undefined,vertexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,reflectionResidentRevision:0,
  programPreparation:{acquireReadyProgram(){return undefined;},work(_gl,job){let cell=jobs.find(c=>c.job.resource===job.resource&&c.job.revision===job.revision);if(!cell){cell={job,ready:false};jobs.push(cell);}if(cell.error)throw cell.error;return cell.ready;},compile(_gl,recipe){assert(recipe.current(),'manual geometry seam requires actual current source demand');return ctx.program;},releaseProgram(){effects.push('program-release');},prune(){},cancel(){effects.push('cancel');},
    // Owner statistics the chunk-era prune and wait paths read: pending cells are this seam's unfinished jobs.
    get stats(){return{pending:jobs.filter(cell=>!cell.ready&&!cell.error).length};},budgetWaits:0,needsFrameAfter:()=>true},
  captureRuntime:{invalidate(){effects.push('invalidate');}},residentGPU:undefined,map:{triggerRepaint(){effects.push('repaint');}},
  pendingMaterialBatches:undefined,materialSourceSettled:true,materialSourceFailure:undefined,
  syncFacadeResources(){effects.push('facades');},diffuseTexture:undefined,windowTexture:undefined,paintSelection:undefined,
  admitShadow(admission){effects.push(['admit',admission]);},updateSolarShadowIndices(){effects.push('solar');},uploadShadow(){effects.push('shadow');},releaseShadowGPU(){effects.push('shadow-release');},
  sceneSolarLight:()=>({fixture:true}),vertexCap:100,acceptPaintComponent:()=>true,isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,
  exactNativePartDisplay:rows=>({held:[],drawable:rows}),s166Display70:()=>true,beMarkischesMuseumDisplay1:()=>true,beZeughausCourtDisplay1:()=>true,
  sourceRoleBatchIncluded:()=>true,s434AggregateBatchIncluded:()=>true,
  progressivePaintData:rows=>new Float32Array(rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*4,0),0)),
  facadePaintData:rows=>{if(ctx.paintError)throw ctx.paintError;return new Float32Array(rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*5,0),0));},
  applyS166SportMuseum70(){},snapshotS528Paint:()=>({}),assertS528PaintUnmasked(){},applyPartialGateMask:()=>({}),applyS402ConnectorMask:()=>({}),applyS036NorthCoface:()=>({}),applyS240BaseCoface:()=>({}),
  applyBEMarkischesMuseum1:()=>({}),applyBEZeughausCourt1:()=>({}),applyHNOrangerieBack1:()=>({}),prepareS528Packing:()=>new Map(),s528ProjectionProvenance:()=>[],
  paintProgramRuns:()=>[{key:paintKeysAPI.currentPaintProgramKey(0),firstIndex:0,indexCount:3}],
  createIndexedPickBlocks70:(_v,_i,_c,stride)=>{assert.equal(stride,9);return {bounds:new Float64Array(6),typedBytes:48};},
  familyPrograms:new Map(),familyFailures:new Map(),familyPending:false,visibleFamilyCount:0,fullProgramUpgradePending:false,fullProgramUpgradeFailure:undefined,geometryPublishedRevision:-1,packedPlanSequence:0,programPublicationRevision:0,facadeAttached:false,gpuInitializationPrepared:false,gpuGeneration:0,mainProgramFailure:undefined,textureShaderFailure:undefined,textureShaderAttempted:false,diffuseShaderFailure:undefined,diffuseShaderAttempted:false,texturedProgram:undefined,diffuseProgram:undefined,baseSurfaceFragment:undefined,surfaceFragment:undefined,cityPaintFragment:'fixture material',queueOnlyProgram:false,unsupportedQueueComponents:new Set(),queueFamilies:new Set([0,42]),
  paintMode:()=>2,paintOverride:()=>0,opacity:1,opacityContext:'normal',sceneEnvironment:{sunlight:false,shadows:false},facadePaintFragmentForCity:()=> 'fixture material',s166ProgramReady70:()=>true,hnOrangerieBackProgramReady:()=>true,tier300SelectedRepairsReady:()=>true,
  s166MaterialReady70:true,tier300RepairProgramReady:true,orangerieProgramReady:true,nativeLeaf:undefined,ownerPatchLeaf:undefined,OWNER_SHAPE_PATCH_PROFILES:{},
  isProgressivelyPainted:()=>false,progressiveRenderStatus:()=>[],progressiveRenderRecords:[],candidateSequence:0,dataPreparation:undefined,dataPreparationRevision:0,dataPreparationPending:false,dataPreparationFailure:undefined,sourcePlanIdentity:undefined,residentData:undefined,pendingData:undefined,packingData:undefined,capturePreparation:undefined,ProgramPreparationPending:preparationAPI.ProgramPreparationPending,isProgramPreparationPending:preparationAPI.isProgramPreparationPending,preparedDataComponents:[1,2,3,4].map(component),selectedIdentity:undefined,selectionActive:true,reducedMotion:true,clock:()=>0,birth:new Map(),seenBirth:new Set(),BIRTH_LIMIT:20000,
 });
 // Chunk residency: every renderer helper, literal state field and import the extracted closures reach
 // (sceneIndexCount, legacyChunkInput, sceneChunks/sceneSpans, retainChunkBindings, ...) is the renderer's own,
 // bound on first use; capturePackedState placeholders start from the renderer's declared literals.
 installRendererClosures(packed.text,ctx,{reset:'undefined',requireFrom:rendererBundle.requireFor(rendererFiles[provider]),exclude:['facadePaintSpecializationForCity','preparedPaintSource','map','programGrantHandoff','candidateProgramHandoff','preparedProgramHandoffs','candidateHandoffRevision','cityPaintFragment','describeFacadePaintSource','facadePaintFragmentForCity'],construct:CONSTRUCTED[provider]});
 const env=new Proxy(ctx,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 for(const[name,value]of Object.entries(packed.initializers)){const js=ts.transpileModule('('+value+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;ctx[name]=Function('env','with(env){return '+js+'}')(env);}
 // Source workspace and program owner must share the page pressure registry,
 // as well as the budget itself; a second bundled registry rejects that budget.
 // The prepared Tier300 plan specializes the assembled material source through the actual current-paint
  // analysis, which requires its paintedFacade and main entrypoints (as tier300-program-specialization's fixture).
 if(provider==='tier300'){ctx.preparedPaintSource=()=> 'fixture original tier materials;vec3 paintedFacade(vec3 c,float family){return c;}void main(){}';await preparedPaintPlan('tier300',packed.text,ctx,runtimeModules.load('safety/prepared-source'));const view=Object.freeze([]),ref=ctx.preparedDataFixture.resources.PROGRESSIVE_ADMISSIONS_RESOURCE;ctx.progressiveRenderView=scope=>scope.borrow(ref,()=>view);}else await installCaptureDemandBindings('church',packed.text,ctx);
 const api=Function('env','with(env){'+packed.js+'\nreturn {'+[...functions,...packed.helpers,...packed.locals,'compileGeometryProgram','setPageHidden','setEnabled'].join(',')+'};}')(env);
 Object.assign(ctx,api);if(provider==='tier300')api.recordMainProjection(mainProjection);
 const lifecycle=lifecycleAPI.createResidentGPULifecycle({bind:context=>{ctx.gl=context;},initialize:api.initializeResidentGPU,release:api.releaseGPU,ready:api.gpuReady,lost:context=>context.isContextLost(),hasResident:residentSceneSeam(provider,ctx),needsPreflight:()=>ctx.gpuPreflightRequired,clearTransient:()=>{},revision:()=>ctx.viewRevision});ctx.residentGPU=lifecycle;if(attach)lifecycle.attach(ctx.gl);
 const set=async(rows,generation,...args)=>{if(provider!=='tier300'||!rows.length)return api.setBatches(rows,generation,...args);assert.equal(typeof ctx.geometryOwner.scene.owner,'string','the geometry scene supplies its real owner identity');assert.equal(ctx.tierStateOwner,'tier300-state:'+ctx.geometryOwner.scene.owner,'the actual Tier initializer is bound before state production');const scope=scopeAPI.createFrozenDataScope(ctx.preparedDataFixture.client);try{const prepared=await api.prepareBatches(rows,new AbortController().signal,scope,undefined,tierChunkInput(ctx,rows)),all=[rows,generation,...args];while(all.length<10)all.push(undefined);all[10]=prepared;api.setBatches(...all);}catch(error){api.clearDataPreparation?.(ctx.dataPreparation);throw error;}finally{scope.release();}};
 return {ctx,api,jobs,uploads,effects,masks,geometryOwner,set,async runMaterial(){if(provider!=='tier300')return true;const cell=jobs.find(c=>/^material-source-preflight:\d+$/.test(c.job.resource)&&!c.ready&&!c.error);assert(cell,'actual material stage must be queued');assert(cell.job.current());try{cell.job.work();cell.ready=true;}catch(error){cell.error=error;}
   // Chunk residency: the material stage starts the chunk's CPU production (and then its state); the candidate
   // is assembled once those page-store productions settle on the event loop, polled as the renderer's frames do.
   for(let i=0;i<40;i++){const ready=api.prepareMaterialSource();if(ready){api.prepareGeometryUpload();return true;}if(!ctx.pendingData||ctx.materialSourceFailure!==undefined)return false;await nextTask();}
   return false;},run(cell=jobs.at(-1)){assert(cell.job.current());try{cell.job.work();cell.ready=true;}catch(error){cell.error=error;throw error;}api.prepareGeometryUpload();},dispose(){api.discardPendingGeometry();api.releaseGPU();const data=ctx.residentData;data?.plan.release();data?.releaseScope();ctx.residentData=undefined;ctx.preparedDataFixture?.release();if(ctx.preparedDataFixture){assert.equal(ctx.preparedDataFixture.store.stats.entries,0);assert.equal(ctx.preparedDataFixture.store.stats.leases,0);}}};
}

async function integratedFixture(provider){
 const f=await fixture(provider,{attach:false}),{ctx,api}=f,queue=[],deleted=[],uploaded=[],stateWrites=[],buffers=new Map(),bindings={vao:null,array:null,element:null};let sequence=0,error=0;
 const control={lost:false,failUpload:false,failCompile:false},gl={NO_ERROR:0,ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,VERTEX_ARRAY_BINDING:3,ARRAY_BUFFER_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,VERTEX_SHADER:8,FRAGMENT_SHADER:9,LINK_STATUS:10,COMPILE_STATUS:11,
  isContextLost:()=>control.lost,getError(){const result=error;error=0;return result;},getParameter:key=>key===3?bindings.vao:bindings.array,
  createVertexArray:()=>({vao:++sequence}),createBuffer:()=>({buffer:++sequence}),bindVertexArray:value=>{bindings.vao=value;},bindBuffer(target,value){if(target===1)bindings.array=value;else bindings.element=value;},
  bufferData(target,data){uploaded.push({target,data});buffers.set(target===1?bindings.array:bindings.element,data);if(control.failUpload){control.failUpload=false;error=1285;}},bufferSubData(_target,_offset,data){const chunk=ctx.sceneChunks.find(value=>chunkState(value)===data);assert(chunk,'a state sub-upload writes one published chunk\'s own state array');assert.equal(bindings.array,chunk.geometry?.value?.buffers.get('state'),'into that chunk\'s own state buffer');stateWrites.push({chunk,data});},
  getAttribLocation:(_program,name)=>name.length,enableVertexAttribArray(){},vertexAttribPointer(){},
  deleteVertexArray:value=>deleted.push(value),deleteBuffer:value=>{deleted.push(value);buffers.delete(value);},
  createShader:type=>({shader:++sequence,type}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader:value=>deleted.push(value),
  createProgram:()=>({program:++sequence}),attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(program){program.failed=control.failCompile;},getExtension:()=>null,getProgramParameter:program=>!program.failed,getProgramInfoLog:()=> 'controlled full program failure',deleteProgram:value=>deleted.push(value),
 };
 const turn=work=>{const prior=globalThis.setTimeout;globalThis.setTimeout=work=>(queue.push(work),queue.length);try{return work();}finally{globalThis.setTimeout=prior;}};
 const owner=preparationAPI.createProgramPreparationOwner(provider+' actual bootstrap',()=>{}),geometryOwner=geometryAPI.createResidentGeometryOwner(),shadowOwner=geometryAPI.createResidentGeometryOwner();
 Object.assign(ctx,{gl,program:undefined,geometryOwner,staticGeometryOwner:geometryAPI.createResidentGeometryOwner(),shadowGeometryOwner:shadowOwner,ProgramPreparationPending:preparationAPI.ProgramPreparationPending,isProgramPreparationPending:preparationAPI.isProgramPreparationPending,
  programPreparation:{acquireReadyProgram:(...args)=>turn(()=>owner.acquireReadyProgram(...args)),compile:(...args)=>turn(()=>owner.compile(...args)),work:(...args)=>turn(()=>owner.work(...args)),prune:()=>turn(()=>owner.prune()),cancel:()=>turn(()=>owner.cancel()),contextLost:()=>turn(()=>owner.contextLost()),releaseProgram:(...args)=>owner.releaseProgram(...args)},
  ensureTexturedProgram(){},ensureDiffuseProgram(){},VERTEX:'original vertex interface',withResidentReflectionClip:s=>s,
  // tier300's prepared plan derives each family's depth effects from the assembled fragment through the actual
  // current-paint analysis: its double keeps the marker text plus the paintedFacade and main entrypoints.
  specializeCurrentPaintFragment:s=>s,fragment:provider==='tier300'?()=> 'original family fragment;vec3 paintedFacade(vec3 c,float family){return c;}void main(){}':()=> 'original family fragment',familyFragmentSource:()=> 'original family fragment',familySurfaceHelper:'original family helper',hasVisibleUnsupportedQueueComponent:()=>true,
  lastFamilyFragmentCharacters:0,lastFragmentCharacters:0,lastCompileAttempt:undefined,solarDepthSourceCharacters:0,
  shadowMask:{release(){}},shadowGeometryRevision:0,shadowGeometrySource:undefined,shadowUploadedIndexCount:0,shadowVao:undefined,shadowIndexBuffer:undefined,shadowProgram:undefined,
  SOURCE_SHADOW_VERTEX_GLSL:'original church shadow vertex',SOURCE_SHADOW_FRAGMENT_GLSL:'original church shadow fragment',S402_SHADOW_VERTEX_GLSL:'original tier shadow vertex',S402_SHADOW_FRAGMENT_GLSL:'original tier shadow fragment',
 });
 if(provider==='tier300')ctx.materialSourceSettled=false;
 Object.assign(ctx,api);
 const env=new Proxy(ctx,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)});
 for(const [name,source]of Object.entries(sources[provider].definitions)){const js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;ctx[name]=Function('env','with(env){return '+js+'}')(env);}
 const trace=[],mark=stage=>{if(trace.length<16)trace.push({stage,generation:ctx.generation,indices:chunkIndexCount(ctx.sceneChunks),candidateGeneration:ctx.pendingGeometry?.packed.generation,candidateIndices:chunkIndexCount(ctx.pendingGeometry?.packed.sceneChunks),program:!!ctx.program,vao:!!ctx.vao,vertexBuffer:!!ctx.vertexBuffer,indexBuffer:!!ctx.indexBuffer,stateBuffer:!!ctx.stateBuffer,geometryBufferKeys:[...(ctx.geometryOwner.current?.buffers.keys()??[])],revision:ctx.geometryUploadRevision,pending:ctx.geometryUploadPending});};const setBatches=api.setBatches;api.setBatches=(...args)=>{mark('set-before');try{return setBatches(...args);}finally{mark('set-after');}};
 const lifecycle=lifecycleAPI.createResidentGPULifecycle({bind:context=>{ctx.gl=context;},initialize:(...args)=>{mark('init-before');try{return api.initializeResidentGPU(...args);}finally{mark('init-after');}},release:()=>{mark('release');api.releaseGPU();},ready:api.gpuReady,lost:context=>context.isContextLost(),hasResident:residentSceneSeam(provider,ctx),needsPreflight:()=>ctx.gpuPreflightRequired,clearTransient:()=>{},revision:()=>ctx.viewRevision});ctx.residentGPU=lifecycle;
 const runQueue=()=>turn(()=>{let count=0;while(queue.length){assert(++count<100,'unbounded actual preparation queue');queue.shift()();}});
  // One bounded drain: the queued turn work, then one event-loop task for chunk production/store settlement, then
  // any work that settlement queued.
  const drain=async()=>{runQueue();await nextTask();runQueue();};
 const frame=()=>turn(()=>{if(provider==='church'){ctx.mainWorldMatrix=mainProjection.slice();ctx.mainFrame++;}if(provider==='tier300')api.recordMainProjection(mainProjection);if(provider==='tier300'&&(ctx.pendingMaterialBatches||ctx.indices.length)){if(api.prepareMaterialSource())api.replayMaterialBatches();}lifecycle.attach(gl);api.prepareGeometryUpload();});
 // Chunk production is asynchronous, so a ready published resident no longer implies that the latest candidate
 // has been packed, uploaded or failed within the same frame: settling also waits until no candidate is pending.
 const settle=async()=>{for(let i=0;i<30;i++){frame();await drain();if(!ctx.geometryUploadPending&&api.gpuReady()&&!ctx.pendingGeometry&&!ctx.pendingData)return;}assert.fail('actual initial program/geometry path did not become ready '+JSON.stringify({program:!!ctx.program,vao:!!ctx.vao,revision:ctx.geometryUploadRevision,published:ctx.geometryPublishedRevision,pending:!!ctx.pendingGeometry,geometry:ctx.geometryUploadFailure,main:ctx.mainProgramFailure,material:ctx.materialSourceFailure===undefined?undefined:String(ctx.materialSourceFailure),materialStack:ctx.materialSourceFailure?.stack?.split('\n').slice(0,8),candidate:ctx.candidateFailure,candidateGeneration:ctx.candidateFailureGeneration,data:ctx.dataPreparationFailure,last:ctx.lastCompileAttempt,preparation:owner.stats.last,trace}));};
 return{...f,geometryOwner,owner,lifecycle,gl,control,deleted,uploaded,stateWrites,drain,frame,settle,turn};
}

test('tier300: published-resident restoration registers every main recipe without treating recovered buffers as a full-draw witness',async()=>{
 const f=await integratedFixture('tier300'),{ctx,api}=f,keys=[9,11,13].map(paintKeysAPI.currentPaintProgramKey),requested=new Set(),compile=ctx.programPreparation.compile;ctx.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));ctx.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};f.lifecycle.attach(f.gl);await f.set([component(9),component(11),component(13)],1);await f.settle();const chunks=ctx.sceneChunks,plan=ctx.residentData.plan;
 f.control.lost=true;api.contextLost();f.control.lost=false;requested.clear();const uploads=f.uploaded.length;api.invalidateMainProjection();f.lifecycle.attach(f.gl);assert.equal(requested.size,0,'unknown main projection cannot register restored programs');assert.equal(f.uploaded.length,uploads);assert.equal(api.mainDrawWitnessCurrent(),false);f.frame();for(const family of [0,9,11,13])assert(requested.has('tier300:berlin:colour:'+family),'the first finite restoration pass registers every required main role');assert.equal(f.uploaded.length,uploads);assert.equal(api.mainDrawWitnessCurrent(),false);
 const grants=f.owner.stats.shared.grantedReferences;f.frame();f.frame();assert.equal(f.owner.stats.shared.grantedReferences,grants);await f.settle();assert.equal(ctx.generation,1);assert.strictEqual(ctx.sceneChunks,chunks);assert.strictEqual(ctx.residentData.plan,plan);assert.equal(plan.scope.stats.disposed,false);for(const key of keys)assert(ctx.familyPrograms.has(key));assert.equal(f.owner.stats.pending,0);assert.equal(api.mainDrawWitnessCurrent(),false,'the actual preparation/upload seam has not executed a complete main draw');f.dispose();f.owner.dispose();
});

for(const provider of providers){
 test(provider+': every actual main family registers in one pending poll without duplicate grants',async()=>{
  const f=await integratedFixture(provider),{ctx,api}=f,requested=new Set(),compile=ctx.programPreparation.compile,keys=[9,11,13].map(paintKeysAPI.currentPaintProgramKey);
  ctx.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};ctx.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));f.lifecycle.attach(f.gl);await f.set([component(9),component(11),component(13)],1);
  let candidate;
  for(let i=0;i<16;i++){f.frame();candidate=provider==='tier300'?ctx.pendingData:ctx.pendingGeometry;if(candidate?.mainKeys?.size===3)break;await f.drain();}
  assert(candidate);assert.deepEqual([...candidate.mainKeys],keys);for(const family of [0,9,11,13])assert(requested.has(provider==='tier300'?'tier300:berlin:colour:'+family:'colour:'+family),'all selected main roles register despite earlier Pending');
  assert.equal(ctx.generation,0);assert.equal(f.uploaded.length,0);const grants=f.owner.stats.shared.grantedReferences;f.turn(()=>api.prepareGeometryUpload());f.turn(()=>api.prepareGeometryUpload());assert.equal(f.owner.stats.shared.grantedReferences,grants);assert.equal(ctx.generation,0);
  await f.settle();assert.equal(ctx.generation,1);for(const key of keys)assert(ctx.familyPrograms.has(key));f.dispose();f.owner.dispose();
 });

 test(provider+': actual main-ready gate prewarms the visible candidate family before replacing the prior resident',async()=>{
  const f=await integratedFixture(provider),{ctx}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const program=ctx.program,gpu=f.geometryOwner.current,chunks=ctx.sceneChunks,key=paintKeysAPI.currentPaintProgramKey(42);
  ctx.paintProgramRuns=()=>[{key,firstIndex:0,indexCount:3}];await f.set([component(2)],2);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(ctx.sceneChunks,chunks);
  for(let i=0;i<30&&ctx.generation!==2;i++){f.frame();const candidate=provider==='tier300'?ctx.pendingData:ctx.pendingGeometry;if(candidate&&!(provider==='tier300'?candidate.mainPrograms:candidate.families)?.has(key)){assert.equal(ctx.generation,1);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);}await f.drain();}
  await f.settle();assert.equal(ctx.generation,2);const selected=ctx.familyPrograms.get(key);assert(selected);assert(ctx.rathausProxyMasks.isResident(f.gl,selected));assert(ctx.rathausProxyMasks.isResident(f.gl,ctx.program));assert.notEqual(f.geometryOwner.current,gpu);assert.equal(f.owner.stats.pending,0);f.dispose();f.owner.dispose();
 });

 test(provider+': actual main-ready gate retains the published geometry while its main projection is unavailable',async()=>{
  const f=await integratedFixture(provider),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const chunks=ctx.sceneChunks,program=ctx.program,gpu=f.geometryOwner.current,uploads=f.uploaded.length;
  if(provider==='tier300')api.invalidateMainProjection();else ctx.mainWorldMatrix=undefined;
  await f.set([component(2)],2);
  for(let i=0;i<12;i++){f.turn(()=>{if(provider==='tier300'&&api.prepareMaterialSource())api.replayMaterialBatches();api.prepareGeometryUpload();});await f.drain();}
  const candidate=provider==='tier300'?ctx.pendingData:ctx.pendingGeometry;assert(candidate);assert.equal(provider==='tier300'?api.candidateMainCurrent(candidate):api.candidateMainReady(candidate),false);assert.equal(ctx.sceneChunks,chunks);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(f.uploaded.length,uploads);assert.equal(ctx.generation,1);
  await f.settle();assert.equal(ctx.generation,2);assert.notEqual(f.geometryOwner.current,gpu);assert.equal(ctx.pendingGeometry,undefined);assert(ctx.rathausProxyMasks.isResident(f.gl,ctx.program));f.dispose();f.owner.dispose();
 });

 test(provider+': actual main-ready gate waits for selected texture pixels before atomically publishing their programs',async()=>{
  const f=await integratedFixture(provider),{ctx}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const chunks=ctx.sceneChunks,program=ctx.program,gpu=f.geometryOwner.current,uploads=f.uploaded.length;
  ctx.paintMode=()=>1;ctx.isFacadeLandmark=()=>true;ctx.surfaceFragment='window helper';ctx.diffuseFragment='diffuse helper';
  ctx.windowTexture={stats:{ready:false,loading:true,residentRevision:1,textureObjects:1},detach(){},setPageHidden(){}};
  ctx.diffuseTexture={stats:{totalTextureObjects:2,plaster:{ready:false,loading:true,residentRevision:1},brick:{ready:true,residentRevision:1}},setNeededMaterials(){},detach(){},setPageHidden(){}};
  await f.set([component(2)],2);for(let i=0;i<12;i++){f.frame();await f.drain();}
  const candidate=provider==='tier300'?ctx.pendingData:ctx.pendingGeometry;assert(candidate);assert.equal(provider==='tier300'?f.api.candidateTexturesReady(candidate):!f.api.candidateTexturePending(candidate),false);assert.equal(ctx.generation,1);assert.equal(ctx.sceneChunks,chunks);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(f.uploaded.length,uploads);
  ctx.windowTexture.stats.ready=true;ctx.windowTexture.stats.loading=false;ctx.windowTexture.stats.residentRevision++;ctx.diffuseTexture.stats.plaster.ready=true;ctx.diffuseTexture.stats.plaster.loading=false;ctx.diffuseTexture.stats.plaster.residentRevision++;await f.settle();
  assert.equal(ctx.generation,2);assert(ctx.texturedProgram);assert(ctx.diffuseProgram);for(const p of [ctx.program,ctx.texturedProgram,ctx.diffuseProgram])assert(ctx.rathausProxyMasks.isResident(f.gl,p));assert.notEqual(f.geometryOwner.current,gpu);f.dispose();f.owner.dispose();
 });

 test(provider+': actual main-ready cancellation retires only the matching unpublished generation',async()=>{
  const f=await integratedFixture(provider),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const chunks=ctx.sceneChunks,program=ctx.program,gpu=f.geometryOwner.current;
  if(provider==='tier300')api.invalidateMainProjection();else ctx.mainWorldMatrix=undefined;
  await f.set([component(2)],2);for(let i=0;i<6;i++){f.turn(()=>{if(provider==='tier300'&&api.prepareMaterialSource())api.replayMaterialBatches();api.prepareGeometryUpload();});await f.drain();}
  const candidate=provider==='tier300'?ctx.pendingData:ctx.pendingGeometry;assert(candidate);api.cancelCandidate(99);assert.equal(provider==='tier300'?ctx.pendingData:ctx.pendingGeometry,candidate);api.cancelCandidate(2);await f.drain();assert.equal(ctx.pendingGeometry,undefined);if(provider==='tier300')assert.equal(ctx.pendingData,undefined);assert.equal(ctx.sceneChunks,chunks);assert.equal(ctx.program,program);assert.equal(f.geometryOwner.current,gpu);assert.equal(ctx.generation,1);f.dispose();f.owner.dispose();
 });

 test(provider+': actual main-ready context loss keeps the last CPU resident without deleting invalid GL handles',async()=>{
  const f=await integratedFixture(provider),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const chunks=ctx.sceneChunks,states=sceneStates(ctx);
  if(provider==='tier300')api.invalidateMainProjection();else ctx.mainWorldMatrix=undefined;
  await f.set([component(2)],2);const deleted=f.deleted.length;f.control.lost=true;api.contextLost();await f.drain();assert.equal(f.deleted.length,deleted);assert.equal(ctx.sceneChunks,chunks);assertSameStates(sceneStates(ctx),states);assert.equal(ctx.generation,1);assert.equal(f.geometryOwner.current,undefined);f.control.lost=false;f.dispose();f.owner.dispose();
 });

 test(provider+': original pack publishes canonical 9-float geometry plus independent state only after upload',async()=>{
  const f=await fixture(provider),row=component(),shadow={fixture:true},old=f.api.capturePackedState();await f.set([row],1,shadow);if(provider==='tier300'){assert.equal(f.ctx.pendingGeometry,undefined);assert(f.ctx.pendingData);assert.equal(f.uploads.length,0);await f.runMaterial();}
  assert.equal(f.ctx.generation,0);assert.equal(f.ctx.sceneChunks,old.sceneChunks);assert.equal(f.ctx.loaded,old.loaded);assert.equal(f.uploads.length,0);assert.equal(f.jobs.length,provider==='tier300'?2:1);
  const pending=f.ctx.pendingGeometry,chunk=onlyChunk(pending.packed),data=chunk.cpu.value,state=chunkState(chunk);assert.equal(data.vertices.length,27);assert.equal(state.length,3);assert.deepEqual([...data.indices],[0,1,2]);
  assert.deepEqual([...data.vertices],[0,0,0,0,0,1,.25,.5,.75,2,0,0,0,0,1,.25,.5,.75,0,3,0,0,0,1,.25,.5,.75]);assert.deepEqual([...state],[97,97,97]);assert.equal(data.paint[4],42);
  assert.equal(f.geometryOwner.current,undefined,'candidate preparation may prewarm masks/textures but cannot publish main geometry');assert.equal(f.ctx.sceneChunks,old.sceneChunks);assert.equal(f.ctx.loaded,old.loaded);assert.equal(f.ctx.generation,old.generation);assert(!f.effects.includes('shadow'),'candidate prewarm cannot publish the resident shadow view');f.run();const initialRetired=old.rathausProxyMasks.destroyed;
  assert.equal(f.ctx.generation,1);assert.equal(f.ctx.sceneChunks,pending.packed.sceneChunks);assertSameStates(sceneStates(f.ctx),[state]);assert.equal(f.ctx.pendingGeometry,undefined);assert.equal(f.ctx.geometryUploadPending,false);assert.equal(f.ctx.loaded.size,1);
  // Masks are per chunk: the published scene draws with its chunk's binding, never the initial scratch binding.
  assert.equal(old.sceneChunks.length,0);assert.equal(f.ctx.rathausProxyMasks,onlyChunk(f.ctx).masks);assert.notEqual(f.ctx.rathausProxyMasks,old.rathausProxyMasks);
  // The published chunk's GPU plans: exactly one allocation uploads the canonical vertex array as is (with the
  // chunk's indices) and exactly one uploads the separate state array; that binding borrows every other buffer.
  const vertexPlans=f.uploads.filter(plan=>plan.buffers.some(b=>b.data===data.vertices)),statePlans=f.uploads.filter(plan=>plan.buffers.some(b=>b.data===state));assert.equal(vertexPlans.length,1);assert.equal(statePlans.length,1);assert.equal(vertexPlans[0].indices,data.indices);
  assert.deepEqual(statePlans[0].buffers.map(b=>b.key),STATE_BINDING_KEYS[provider]);assert(statePlans[0].buffers.every(b=>b.key==='state'?b.data===state:!b.data&&!!b.buffer),'the state binding borrows the static buffers');assert(f.effects.some(e=>Array.isArray(e)&&e[0]==='admit'&&e[1]===shadow));
  const geometry=[...data.vertices];f.ctx.selectedIdentity=row;f.api.paintSelection();assert.deepEqual([...data.vertices],geometry);assert.deepEqual([...state],[99,99,99]);f.api.grow();assert.deepEqual([...data.vertices],geometry);assert.equal(f.api.growthSnapshot().minGrowth,1);f.dispose();
  // Publication retires the replaced initial scratch mask binding (every exit path returns its reservation).
  assert.equal(initialRetired,true,'publication destroys the replaced initial scratch mask');
 });

 test(provider+': pack/mask/upload failures keep the last successful CPU and GPU resident',async()=>{
  const f=await fixture(provider);await f.set([component()],1);if(provider==='tier300')await f.runMaterial();f.run();const published=f.api.capturePackedState(),gpu=f.geometryOwner.current;
  for(const errorField of ['paintError','maskError']){const error=Error(errorField);f.ctx[errorField]=error;if(provider==='tier300'){await f.set([component(2)],2);assert.equal(await f.runMaterial(),false);assert(sameBoundedFailure(f.ctx.materialSourceFailure,error),'the chunk production failure reaches the material stage as the store\'s bounded copy');}else await assert.rejects(f.set([component(2)],2),e=>sameBoundedFailure(e,error));f.ctx[errorField]=undefined;assert.equal(f.ctx.sceneChunks,published.sceneChunks);assert.equal(f.ctx.loaded,published.loaded);assert.equal(f.ctx.generation,1);assert.equal(f.geometryOwner.current,gpu);assert.equal(f.ctx.pendingGeometry,undefined);assert.equal(f.masks.at(-1).detached,true);}
  await f.set([component(3)],2);if(provider==='tier300')await f.runMaterial();const candidate=f.ctx.pendingGeometry,error=Error('upload');f.ctx.uploadError=error;assert.throws(()=>f.run(),e=>e===error);f.api.prepareGeometryUpload();assert.equal(candidate.packed.rathausProxyMasks.detached,true);assert.equal(f.ctx.pendingGeometry,undefined);assert.equal(f.ctx.sceneChunks,published.sceneChunks);assertSameStates(sceneStates(f.ctx),sceneStates(published));assert.equal(f.ctx.generation,1);assert.equal(f.geometryOwner.current,gpu);f.dispose();
 });

 test(provider+': replace/hide/disable invalidate and release only the unpublished candidate',async()=>{
  const f=await fixture(provider);await f.set([component()],1);if(provider==='tier300')await f.runMaterial();f.run();const published=f.api.capturePackedState(),gpu=f.geometryOwner.current;
  await f.set([component(2)],2);if(provider==='tier300')await f.runMaterial();const first=f.ctx.pendingGeometry,firstJob=f.jobs.at(-1);await f.set([component(3)],3);if(provider==='tier300')await f.runMaterial();assert.equal(first.packed.rathausProxyMasks.detached,true);assert.equal(firstJob.job.current(),false);assert.equal(f.ctx.pendingGeometry.packed.generation,3);assert.equal(f.ctx.sceneChunks,published.sceneChunks);
  const latest=f.ctx.pendingGeometry,latestJob=f.jobs.at(-1);f.api.setPageHidden(true);assert.equal(latest.packed.rathausProxyMasks.detached,true);assert.equal(latestJob.job.current(),false);assert.equal(f.ctx.pendingGeometry,undefined);assert.equal(f.geometryOwner.current,gpu);assert.equal(f.ctx.sceneChunks,published.sceneChunks);
  f.api.setPageHidden(false);f.ctx.materialSourceSettled=true;await f.set([component(4)],4);if(provider==='tier300')await f.runMaterial();const disabled=f.ctx.pendingGeometry;f.api.setEnabled(false);assert.equal(disabled.packed.rathausProxyMasks.detached,true);assert.equal(f.ctx.pendingGeometry,undefined);assert.equal(f.ctx.generation,1);f.dispose();
 });

 test(provider+': empty commits immediately and restore upload reuses canonical arrays without repacking',async()=>{
  const f=await fixture(provider);await f.set([component()],1);if(provider==='tier300')await f.runMaterial();f.run();const chunks=f.ctx.sceneChunks,states=sceneStates(f.ctx);f.api.upload();assert.equal(f.ctx.pendingGeometry.packed.sceneChunks,chunks,'the restore upload reuses the published chunks without repacking');f.run();assert.equal(f.ctx.sceneChunks,chunks);assertSameStates(sceneStates(f.ctx),states);
  await f.set([component(2)],2);if(provider==='tier300')await f.runMaterial();const stale=f.ctx.pendingGeometry,job=f.jobs.at(-1);await f.set([],3);assert.equal(stale.packed.rathausProxyMasks.detached,true);assert.equal(job.job.current(),false);assert.equal(f.ctx.generation,3);assert.equal(f.ctx.sceneChunks.length,0,'the empty commit publishes no chunk geometry or state');assert.equal(f.ctx.sceneSpans.length,0);assert.equal(f.ctx.loaded.size,0);assert.equal(f.geometryOwner.current,undefined);assert.equal(f.ctx.pendingGeometry,undefined);f.dispose();
 });

 test(provider+': renderer owns no legacy allocation/upload/delete or stride10/static repacking path',async()=>{
  const text=sources[provider].text;for(const pattern of [/\.createBuffer\(/,/\.createVertexArray\(/,/\.bufferData\(/,/\.deleteBuffer\(/,/\.deleteVertexArray\(/,/vertices\[[^\]]*\*10/,/vertices\.length\/10/,/staticData/,/new Float32Array\(count\*10\)/])assert.doesNotMatch(text,pattern);
  // Chunk residency: the shadow view is allocated and published per chunk through its own
  // geometry owner and borrows the published main chunk's vertex and state buffers (no
  // renderer-level vertexBuffer/stateBuffer handle is uploaded twice).
  assert.match(text,/shadowGeometryOwner\.allocate\(/);assert.match(text,/shadowGeometryOwner\.publish\(/);assert.match(text,/buffer:(?:main|geometry)\.buffers\.get\('(?:static|vertex)'\)!/);assert.match(text,/buffer:(?:main|geometry)\.buffers\.get\('state'\)!/);assert.match(text,/geometryOwner\.contextLost\(\)/);assert.match(text,/shadowGeometryOwner\.contextLost\(\)/);
  if(provider==='church')assert.doesNotMatch(text,/progressiveBuffer|progressiveData/);
 });

 test(provider+': actual program preparation bootstraps the owner upload and restores canonical resident arrays',async()=>{
  const f=await integratedFixture(provider),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);assert.equal(ctx.generation,0);assert.equal(ctx.program,undefined);assert.equal(f.uploaded.length,0);
  await f.settle();const published=api.capturePackedState(),firstGPU=f.geometryOwner.current,firstProgram=ctx.program;assert(firstGPU);assert(firstProgram);assert.equal(ctx.generation,1);assert.equal(f.lifecycle.stats.initialized,true);assert.equal(f.lifecycle.stats.initializations,1);assert.equal(f.owner.stats.pending,0);{const chunk=onlyChunk(ctx);assert.equal(f.uploaded.filter(row=>row.data===chunk.cpu.value.vertices).length,1,'the canonical vertex array is uploaded once, as is');assert.equal(f.uploaded.filter(row=>row.data===chunkState(chunk)).length,1,'the separate state array is uploaded once');}
  f.control.failUpload=true;await f.set([component(2)],2);await f.settle();assert.equal(ctx.generation,1);assert.equal(ctx.sceneChunks,published.sceneChunks);assert.equal(ctx.program,firstProgram);assert.equal(f.geometryOwner.current,firstGPU);assert(ctx.geometryUploadFailure?.includes('WebGL error'));assert.equal(ctx.pendingGeometry,undefined);
  const before=f.deleted.length;f.control.lost=true;api.contextLost();assert.equal(f.deleted.length,before,'lost context cannot delete invalid GL objects');assert.equal(f.geometryOwner.current,undefined);assert.equal(ctx.sceneChunks,published.sceneChunks);assertSameStates(sceneStates(ctx),sceneStates(published));f.control.lost=false;await f.settle();assert.notEqual(f.geometryOwner.current,firstGPU);assert.notEqual(ctx.program,firstProgram);assert.equal(ctx.sceneChunks,published.sceneChunks);assertSameStates(sceneStates(ctx),sceneStates(published));assert.equal(ctx.generation,1);assert.equal(f.lifecycle.stats.initialized,true);assert.equal(f.owner.stats.pending,0);api.releaseGPU();f.dispose();f.owner.dispose();
 });

 test(provider+': shadow upload borrows the published buffers and retains the old uploaded index count while its replacement waits',async()=>{
  // Chunk residency: the projected shadow is a per-chunk index view; its rows come from the solar admission
  // (church: setChunkShadowRanges with a new admission signature). Two rows in one chunk give a 3-index subset
  // first and the 6-index full chunk as the replacement; every vertex/state buffer is borrowed from the main chunk.
  const f=await integratedFixture(provider),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component(1),component(2)],1);await f.settle();const main=f.geometryOwner.current,chunks=ctx.sceneChunks,states=sceneStates(ctx);assert(main);assert.equal(onlyChunk(ctx).cpu.value.indices.length,6);
  // church: the chunk shadow ranges and their admission signature are set directly. tier300: its subsets come from
  // the solar boundary admission, so the renderer's own updateSolarShadowIndices runs over the published chunks with
  // only the solar-shadow-admission import (residentSolarShadowRanges) standing in for the boundary geometry test.
  // Every closure name the production function reads or writes must be bound on the fixture context (or be a real
  // global): an unbound name throws instead of silently reading undefined or creating a new context field.
  const tierSolarIndices=provider==='tier300'?Function('env','with(env){return '+ts.transpileModule('('+sources.tier300.solarIndices+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+'}')(new Proxy(ctx,{has:()=>true,get:(o,k)=>{if(k===Symbol.unscopables)return undefined;if(k in o)return o[k];if(k in globalThis)return globalThis[k];throw ReferenceError('tier300 updateSolarShadowIndices reads an unbound closure name: '+String(k));},set:(o,k,v)=>{if(!(k in o))throw ReferenceError('tier300 updateSolarShadowIndices writes an unbound closure name: '+String(k));o[k]=v;return true;}})):undefined;
  const admit=(...ids)=>{if(provider==='church'){ctx.setChunkShadowRanges(ids.map(id=>component(id)));ctx.solarShadowSignature='fixture-admission:'+ids.join(',');return;}
   ctx.sceneSun={...ctx.sceneSun,shadowVector:[1,1]};ctx.solarBoundary??={fixture:'verified-boundary'};ctx.residentSolarShadowRanges=(_origin,rows)=>[...rows].filter(row=>ids.some(id=>row.objectId==='osm/way/'+id));
   assert.equal(tierSolarIndices(),true,'a changed solar admission replaces the chunk shadow subsets');};
  // The main and shadow views bind the same canonical vertex and state buffers (church 'static'; tier300's shadow
  // 'vertices' borrows the shared chunk mesh view's 'vertex').
  const [shadowVertexKey,mainVertexKey]=provider==='tier300'?['vertices','vertex']:['static','static'];
  // Execute the real draw function too: a coherent statistic alone cannot prove that
  // the old GPU view is drawn with its own index count while CPU admission moves ahead.
  const drawn=[];Object.assign(f.gl,{useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},getUniformLocation:()=>0,uniform1f(){},uniform2f(){},uniformMatrix4fv(){},drawElements(_mode,count){drawn.push(count);}});
  Object.assign(ctx,{matrix:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),shadowDraws:0});ctx.mainWorldProjection=ctx.matrix;ctx.mainWorldMatrix=ctx.matrix;ctx.shadowMask.draw=(_gl,_matrix,_offset,draw)=>{draw();return true;};
  const assertDraw=count=>{drawn.length=0;ctx.drawProjectedShadows(.5);assert.deepEqual(drawn,[count],'actual draw uses the published shadow subset');};

  admit(1);assert.equal(onlyChunk(ctx).shadowIndices.length,3);for(let i=0;!ctx.shadowVao||ctx.shadowUploadPending;i++){assert(i<20);f.turn(()=>ctx.uploadShadow());await f.drain();}
  assert.equal(ctx.shadowUploadedIndexCount,3);const shadow=ctx.shadowGeometryOwner.current;assert(shadow);assert(main.buffers.get(mainVertexKey));assert.equal(shadow.buffers.get(shadowVertexKey),main.buffers.get(mainVertexKey));assert.equal(shadow.buffers.get('state'),main.buffers.get('state'));assert.equal(ctx.sceneChunks,chunks);assertSameStates(sceneStates(ctx),states);assertDraw(3);
  const firstUploads=f.uploaded.length;admit(1,2);f.turn(()=>ctx.uploadShadow());assert.equal(ctx.shadowUploadedIndexCount,3);assert.equal(ctx.shadowGeometryOwner.current,shadow);assertDraw(3);await f.drain();f.turn(()=>ctx.uploadShadow());assert.equal(ctx.shadowUploadedIndexCount,6);assertDraw(6);assert.equal(f.uploaded.length-firstUploads,1,'shadow replacement uploads only its own index data');
  const publishedShadow=ctx.shadowGeometryOwner.current;admit(2);f.control.failUpload=true;f.turn(()=>ctx.uploadShadow());await f.drain();f.turn(()=>ctx.uploadShadow());assert.equal(ctx.shadowFailure,true);assert.equal(ctx.shadowUploadPending,false);assert.equal(ctx.shadowGeometryOwner.current,publishedShadow,'a failed replacement retains the last published shadow view');assert.equal(ctx.shadowUploadedIndexCount,6);assertDraw(6);
  const oldMainHandles=[main.vao,main.indexBuffer,...main.buffers.values()],deleted=f.deleted.length;ctx.releaseShadowGPU();assert.equal(ctx.shadowUploadedIndexCount,0);assert.equal(onlyChunk(ctx).shadowIndexCount,0);assert(f.deleted.slice(deleted).every(value=>!oldMainHandles.includes(value)),'borrowed main buffers remain owned by the main geometry');api.releaseGPU();f.dispose();f.owner.dispose();
 });

 test(provider+': selection changes during a candidate wait are written into the same uploaded state buffer',async()=>{
  const f=await fixture(provider),row=component();await f.set([row],1);if(provider==='tier300')await f.runMaterial();const pending=f.ctx.pendingGeometry,state=chunkState(onlyChunk(pending.packed));f.ctx.selectedIdentity=row;f.run();assertSameStates(sceneStates(f.ctx),[state]);assert(state.every(value=>Math.floor(value%4/2)===1));const statePlans=f.uploads.filter(plan=>plan.buffers.some(buffer=>buffer.key==='state'&&buffer.data));assert.equal(statePlans.length,1);assert.equal(statePlans[0].buffers.find(buffer=>buffer.key==='state').data,state,'the one uploaded state buffer is the chunk state holding the newest selection');f.dispose();
 });
}

test('tier300: main-ready reentrant empty publication cannot be overwritten by the saved candidate snapshot',async()=>{
 const f=await integratedFixture('tier300'),{ctx,api}=f;f.lifecycle.attach(f.gl);await f.set([component()],1);await f.settle();const publication=ctx.dataPublicationRevision;let emptied=false;
 ctx.onMaskPrepare=()=>{ctx.onMaskPrepare=undefined;emptied=true;api.setBatches([],3);};
 await f.set([component(2)],2);for(let i=0;i<30&&!emptied;i++){f.frame();await f.drain();}
 assert(emptied,'the real candidate mask stage must execute the reentrant empty commit');assert(ctx.dataPublicationRevision>publication);assert.equal(ctx.generation,3);assert.equal(ctx.vertices.length,0);assert.equal(ctx.indices.length,0);assert.equal(ctx.loaded.size,0);assert.equal(ctx.pendingGeometry,undefined);assert.equal(ctx.pendingData,undefined);assert.equal(f.geometryOwner.current,undefined);f.dispose();f.owner.dispose();
});
