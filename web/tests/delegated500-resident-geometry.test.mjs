import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {installRendererClosures,bundleRendererModules} from './support/f5resb-renderer-closures.mjs';

const web=new URL('../',import.meta.url),file='src/painted/delegated500/safety/building-mesh-renderer.ts';
const text=fs.readFileSync(new URL(file,web),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),nodes=[];
(function visit(n){nodes.push(n);ts.forEachChild(n,visit);})(ast);
function declaration(name){const found=nodes.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(found.length,1,name);return found[0];}
function method(name){const found=nodes.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)===name);assert.equal(found.length,1,name);return 'function '+found[0].getText(ast);}
function evaluate(source,state){const js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return Function('env','with(env){return '+js+'}')(new Proxy(state,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)}));}
// One production module graph: the renderer's own imports and the page runtime modules below are one esbuild
// bundle (bundleRendererModules in support/f5resb-renderer-closures.mjs; the renderer's imports include JSON/GLSL
// assets), so the chunk store, ledger, preparation owner and every renderer import that a chunk-residency
// closure reaches share one module state, as on one page. load(relative) returns that bundle's module for a
// source file; there is no per-file dependency map. Peak RSS of this file is about 1.1 GB: batch runs take
// the heavy lock.
const runtimeBundle=await bundleRendererModules(file,['src/painted/delegated500/safety/paint-run-visibility.ts','src/painted/delegated500/safety/current-paint-program.ts','src/safety/resident-gpu-lifecycle.ts','src/safety/render-runtime/preparation-scheduler.ts','src/safety/render-runtime/submitted-program-completion.ts','src/safety/render-runtime/program-grant-handoff.ts','src/safety/viewport-request.ts','src/safety/render-runtime/resource-budget.ts','src/safety/render-runtime/program-preparation.ts','src/safety/render-runtime/chunk-resource-store.ts','src/safety/render-runtime/resident-geometry.ts','src/painted/delegated500/safety/indexed-pick-blocks70.ts','src/safety/facade-rathaus-display-masks.ts','src/safety/facade-rathaus-proxy-mask.ts','src/safety/renderer-chunk-input.ts']),rendererRequire=runtimeBundle.requireFrom;
function load(relative){return runtimeBundle.load(relative);}
const visibility=load('src/painted/delegated500/safety/paint-run-visibility.ts'),currentPrograms=load('src/painted/delegated500/safety/current-paint-program.ts'),lifecycle=load('src/safety/resident-gpu-lifecycle.ts'),grantHandoff=load('src/safety/render-runtime/program-grant-handoff.ts'),viewport=load('src/safety/viewport-request.ts'),preparation=load('src/safety/render-runtime/program-preparation.ts'),geometry=load('src/safety/render-runtime/resident-geometry.ts'),pick=load('src/painted/delegated500/safety/indexed-pick-blocks70.ts');
const chunkInputAPI=load('src/safety/renderer-chunk-input.ts');
const maskResource=load('src/safety/facade-rathaus-proxy-mask.ts');
let fixtureChunkSequence=0;
const mainProjection=Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const bridgeSource=fs.readFileSync(new URL('tests/resident-planar-reflection.test.mjs',web),'utf8'),bridgeSetup=bridgeSource.slice(0,bridgeSource.indexOf('for(const provider of providers)test(')).replace("process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url))",JSON.stringify(fileURLToPath(web)))
 // The shared setup runs as a data: module, which has no hierarchical base URL: its relative support
 // import is resolved here against this file (as tier-church-resident-geometry does).
 .replace("new URL('./support/resident-chunk-scene.mjs',import.meta.url)",JSON.stringify(new URL('./support/resident-chunk-scene.mjs',import.meta.url).href));
const {preparedPaintPlan}=await import('data:text/javascript;base64,'+Buffer.from(bridgeSetup+'\nexport {preparedPaintPlan};').toString('base64'));
function context(){
 let sequence=0,error=0,uploads=0;const control={lost:false,failUpload:0,failLink:false},bindings={vao:null,array:null},deleted=[],data=[],updates=[],sources=[],links=[];
 const gl={NO_ERROR:0,ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,VERTEX_ARRAY_BINDING:3,ARRAY_BUFFER_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,VERTEX_SHADER:8,FRAGMENT_SHADER:9,LINK_STATUS:10,COMPILE_STATUS:11,INVALID_INDEX:0xffffffff,getUniformBlockIndex:()=>0xffffffff,
  isContextLost:()=>control.lost,getError(){const e=error;error=0;return e;},getParameter:k=>k===3?bindings.vao:bindings.array,
  createVertexArray:()=>({vao:++sequence}),createBuffer:()=>({buffer:++sequence}),bindVertexArray(v){bindings.vao=v;},bindBuffer(t,v){if(t===1)bindings.array=v;},
  bufferData(t,value,usage){data.push({t,value,usage});if(++uploads===control.failUpload)error=1285;},getAttribLocation:(_p,name)=>name.length,enableVertexAttribArray(){},vertexAttribPointer(){},deleteVertexArray:v=>deleted.push(v),deleteBuffer:v=>deleted.push(v),bufferSubData:(_t,_at,value)=>updates.push(value),
  createShader:type=>({shader:++sequence,type}),shaderSource(shader,source){shader.source=source;sources.push(source);},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader:v=>deleted.push(v),
  createProgram:()=>({program:++sequence,shaders:[]}),attachShader(program,shader){program.shaders.push(shader);},detachShader(program,shader){program.shaders=program.shaders.filter(value=>value!==shader);},bindAttribLocation(){},linkProgram(program){links.push(program);},getExtension:()=>null,getProgramParameter:()=>!control.failLink,getProgramInfoLog:()=> 'controlled link failure',deleteProgram:v=>deleted.push(v)};
 return {gl,control,deleted,data,updates,sources,links,get uploads(){return uploads;}};
}
// Production packing validates source identities and footprints: each fixture label maps to one stable
// OSM way id with a closed polygon footprint (keyOf/identityOf name the same component).
const componentIds=new Map();function osmId(id){if(!componentIds.has(id))componentIds.set(id,'osm/way/'+(990000001+componentIds.size));return componentIds.get(id);}
const keyOf=id=>osmId(id)+'|part',identityOf=id=>({objectId:osmId(id),partId:'part'});
function component(id='next'){return {city:'cologne',objectId:osmId(id),partId:'part',origin:[7,50],sourceFeature:{type:'Feature',properties:{}},componentGeometry:{type:'Polygon',coordinates:[[[7,50],[7.0001,50],[7,50.0001],[7,50]]]},batches:[{positions:new Float64Array([0,0,0,1,2,0,0,0,1]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),color:[.2,.3,.4],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]};}
// Chunk masks are production bindings (the chunk's mask recipe), not the scratch fixture mask: a test observes
// one binding's retirement by counting its own detach/destroy calls.
function maskRetirements(masks){const counts={detach:0,destroy:0};for(const name of ['detach','destroy']){const original=masks[name].bind(masks);masks[name]=()=>{counts[name]++;original();};}return counts;}
const tinyPaint='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}';
const tinyVertex='#version 300 es\nprecision highp float;in vec3 a_position;in vec3 a_normal;in vec3 a_color;in float a_selected;in vec4 a_paint_frame;in float a_paint_family;in vec4 a_progressive_color;out vec3 v_color;out vec3 v_normal;out vec3 v_local;out vec4 v_frame;flat out float v_family;void main(){gl_Position=vec4(a_position,1.);v_color=a_color;v_normal=a_normal;v_local=a_position;v_frame=a_paint_frame;v_family=a_paint_family;}';
const tinyFragment=(helper,paint)=>'#version 300 es\nprecision highp float;in vec3 v_color;in vec3 v_normal;in vec3 v_local;in vec4 v_frame;flat in float v_family;out vec4 colour;\n'+helper+'\n'+paint+'\nvoid main(){colour=vec4(paintedFacade(v_color,v_local,v_normal,v_frame,v_family),1.);}';
async function fixture(t,{bootstrap=false}={}){const c=context(),queue=[],masks=[],events=[];let failCPU=false;const createMask=()=>{const value=maskResource.createRathausProxyMasks(),configure=value.configure,detach=value.detach;Object.assign(value,{detaches:0,configure(...args){if(failCPU)throw Error('fixture mask validation');return configure(...args);},detach(){this.detaches++;detach();}});masks.push(value);return value;};
 const S={...pick,...grantHandoff,...viewport,...currentPrograms,grantHandoffGeneration:undefined,grantHandoffPreparationToken:undefined,mainFrameWitness:undefined,pendingMainFrame:undefined,gl:c.gl,program:{},destroyed:false,pageHidden:false,enabled:true,generation:1,viewRevision:1,mainWorldMatrix:mainProjection.slice(),mainFrame:0,residentTextureStyles:[],candidateFailureGeneration:undefined,reflectionResidentRevision:0,matrix:new Float64Array(16),vertices:new Float32Array(27),stateData:new Float32Array([1,1,1]),indices:new Uint32Array([0,1,2]),paintData:new Float32Array(15),progressiveData:new Float32Array(12),loaded:new Map(),sourceLoaded:new Map(),anchor:[0,0],anchorUnit:1,materialUnit:1,materialAnchor:undefined,sceneSunOrigin:[0,0],sceneSun:{},rathausProxyMasks:createMask(),createRathausProxyMasks:createMask,nativeLeaf:'old-leaf',needsBirth:false,selectedIdentity:undefined,selectionActive:true,key:c=>c.objectId+'|'+c.partId,
 materialSourceSettled:true,materialSourceFailure:undefined,pendingMaterialBatches:undefined,pendingGeometry:undefined,geometryUploadRevision:0,geometryUploadPending:false,geometryUploadFailure:undefined,shadowUploadPending:false,partitionEnabled:true,currentFamilyPrograms:true,legacySolarPartitions:false,partitionRuns:[],partitionPending:false,paintProgramRuns:(_i,_p)=>[{key:'current-family:7',firstIndex:0,indexCount:3}],programKey:()=> 'base',gpuInitializationPrepared:false,
 residentGeometry:geometry.createResidentGeometryOwner(),shadowGeometry:geometry.createResidentGeometryOwner(),shadowMask:{release(){}},shadowUploadRevision:0,shadowUploadPlan:undefined,shadowUploadedIndexCount:0,shadowIndices:new Uint32Array(),residentPublicationFailure:undefined,captureRuntime:{invalidate(){events.push('invalidate');}},residentGPU:{beforeUpload:()=>true,released(){},published(){}},retireUnloadedBirths(){events.push('retire');},syncFacadeResources(){events.push('textures');},admitShadow(){events.push('shadow');},updateSolarShadowIndices(){},uploadShadow(){events.push('shadow-upload');},clearMaterialSource(){},map:{triggerRepaint(){events.push('repaint');}},windowTexture:undefined,diffuseTexture:undefined,
 merc:undefined,unit:undefined,sceneSolarLight:()=>({instant:'same'}),isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,surfaceStyle:undefined,applyPartialGateMask:()=>({}),applyS402ConnectorMask:()=>({}),applyS036NorthCoface:()=>({}),applyS240BaseCoface:()=>({}),applyF151CrownMask:()=>({}),partitionPrograms:new Map(),partitionFailures:new Map(),distantQuality:new Map(),releaseSolarDepth(){},releaseShadowGPU(){},reusableVertex673:undefined,casterRetry:false,casterVisibleKnown:false,casterCompileFrame:-1,facadeAttached:false,textureShaderAttempted:false,diffuseShaderAttempted:false};
 let notifyPreparationWork;
 const turn=fn=>{
  const previous=globalThis.setTimeout;
  globalThis.setTimeout=work=>{
   queue.push(work);
   notifyPreparationWork?.();
   return queue.length;
  };
  try{return fn();}finally{globalThis.setTimeout=previous;}
 };
 const owner=preparation.createProgramPreparationOwner('actual delegated geometry fixture',()=>events.push('settled'));
 S.programPreparation={compile:(...args)=>turn(()=>owner.compile(...args)),work:(...args)=>turn(()=>owner.work(...args)),prune:()=>turn(()=>owner.prune()),cancel:()=>turn(()=>owner.cancel()),contextLost:()=>turn(()=>owner.contextLost()),releaseProgram:(...args)=>owner.releaseProgram(...args),acquireReadyProgram:(...args)=>owner.acquireReadyProgram(...args),hasPendingProgram:(...args)=>owner.hasPendingProgram(...args),dispose:()=>owner.dispose(),get stats(){return owner.stats;}};
 const handoffDeclaration=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='programGrantHandoff');assert(handoffDeclaration?.initializer);S.programGrantHandoff=evaluate(handoffDeclaration.initializer.getText(ast),S);
 for(const name of ['merc','unit','snapshotPackedResident','restorePackedResident','discardGeometryCandidate','publishPackedResident','updateSelectionData','paintSelection','uploadState','prepareGeometryUpload','uploadPreparedGeometry','upload','setBatches','releaseGPU','triangle','clearShadowGeometry','releaseShadowGPU','uploadShadow','gpuReady','initializeResidentGPU'])S[name]=evaluate(['merc','unit'].includes(name)?nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name).initializer.getText(ast):declaration(name).getText(ast),S);
 for(const name of ['contextLost','createResidentMainPlan','prepareResidentMain','prepareMainPrograms','invalidateMainFrame','takeCompletedMainFrame','mainBindingStamp','mainRolePrograms','hasRequiredMainFailure','mainWitnessCurrent','mainFrameCurrent','captureMainFrameWitness','recordCompleteMainFrame','selectColourProgramConsumer','clearProgramGrantHandoff','candidateMaterialKeys','candidateTextureRecipesKnown','multiply','paintDetailQuality','candidatePaintDemand','candidateTexturePending','candidateMainReady','refreshCandidateCapture','clearCandidateGPU','cancelCandidate','colourProgramRecipe','mainPaintDemand','mainPaintProgramKeys','casterIsBase','solarCasterResidentKeys','solarCaptureDemandActive','captureProgramDemandCurrent','visibleProgramDemandKeys','visibleProgramDemandCurrent','materialProgramDemandCurrent','pruneProgramPreparation','trimSolarCasterState','solarProgramStats','compilePartitionProgram','clearMaterialSource','prepareMaterialSource'])S[name]=evaluate(declaration(name).getText(ast),S);
 S.setPageHidden=evaluate(method('setPageHidden'),S);
 for(const name of ['C','EPS','mainGPUIncarnation','residentMainMasksReady'])S[name]=evaluate(nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name).initializer.getText(ast),S);
 // Keep the production geometry-packing tail intact. The hundreds of unchanged
 // appearance recipe filters before nextSourceLoaded are tiny fixture inputs.
 const body=[...declaration('packResidentBatchesSteps').body.statements],start=body.findIndex(n=>n.getText(ast)==='sourceLoaded=nextSourceLoaded;');assert(start>=0);
 const tail=body.slice(start).map(n=>n.getText(ast)).join('\n');
 S.filterConstructionComponents=evaluate(declaration('filterConstructionComponents').getText(ast),S);
 S.packResidentBatchesSteps=evaluate(declaration('packResidentBatchesSteps').getText(ast),S);
 S.packResidentBatches=evaluate(declaration('packResidentBatches').getText(ast),S);
 const binding=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='compileGeometryProgram');assert(binding);
 Object.assign(S,{baseSurfaceFragment:undefined,surfaceFragment:undefined,city:'cologne',materialRecipeRevision:0,materialSourceWorkRevision:0,materialSourceBuilder:()=> 'actual current material seam',cityPaintFragment:'actual current material seam',casterPreparedSources:new Map(),casterBase:new Map(),casterFailures:new Map(),casterAnalysisPending:new Set(),casterFamily0:undefined,solarDepthRevision:0,solarDepthHelper:undefined,berlinCurrent:false,paintMode:()=>2,paintOverride:()=>0,programOverrideKey:()=>undefined,richPaintProgramKey:key=>key,distantPaintProgramKey:key=>key,...visibility,opacity:1,opacityContext:'normal',sceneEnvironment:{sunlight:true,shadows:true},birth:new Map(),fragment:(_helper,source)=>source,VERTEX:'actual vertex seam',withResidentReflectionClip:source=>source,diagnostic557:false,ensureTexturedProgram(){},ensureDiffuseProgram(){},S402_SHADOW_VERTEX_GLSL:'actual static shadow vertex seam',S402_SHADOW_FRAGMENT_GLSL:'actual static shadow fragment seam',ProgramPreparationPending:preparation.ProgramPreparationPending,isProgramPreparationPending:preparation.isProgramPreparationPending});
 for(const name of ['BERLIN_FULL_CURRENT_CAPTURE_KEY','gpuPreflightRequired']){const value=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name);assert(value?.initializer,name);S[name]=evaluate(value.initializer.getText(ast),S);}
 S.compileGeometryProgram=evaluate(binding.initializer.getText(ast),S);
 Object.assign(S,{materialSourceBuilder:()=>tinyPaint,cityPaintFragment:tinyPaint,fragment:tinyFragment,VERTEX:tinyVertex,currentInitialFragmentBytes:0,currentLastFragmentBytes:0});
 Object.assign(S,{createProgramSourceAuthority:preparation.createProgramSourceAuthority,delegated500ScopedFunctionArities:new Map([...rendererRequire('./delegated500-scoped-functions').delegated500ScopedFunctionArities,[S.materialSourceBuilder,0],[S.fragment,0]])});const authority=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='delegatedColourSourceAuthority');assert(authority?.initializer);S.delegatedColourSourceAuthority=evaluate(authority.initializer.getText(ast),S);
 // Chunk residency: every renderer helper/state/import a closure above reaches (preparedChunkConstructions,
 // releasePackedChunks, sceneIndexCount, retainChunkBindings, ...) is the renderer's own declaration, bound on first use.
 // Material-data inputs stay fixture inputs: the shared setup installs its own facade source/specialization
 // seams, and the partition gate is the fixture's declared state (current family programs, partitions on).
 S.paintProgramPartitionEnabled=()=>false;
 // Desktop renderer construction constant (const vertexCap=mobile?100000:200000).
 S.vertexCap=200000;S.mobile=false;
 // Paint ownership is a registry input: the synthetic fixture rows are owned by this delegated renderer.
 S.acceptPaintComponent=(provider,_component)=>provider==='delegated500';
 installRendererClosures(text,S,{requireFrom:rendererRequire,wrappers:['scopedValue'],exclude:['facadePaintSpecializationForCity','describeFacadePaintSource','facadePaintFragmentForCity','paintProgramFragment','paintProgramKey'],construct:['delegatedPreparedSourceAuthority','sourceBudgetWake','materialSourceGate','batchSourceGate','casterSourceGate','paintBoundCache','colourAssemblyBounds','chunkStateOwner','linkedPaint','programIdleRetirement']});
 t.after(()=>S.programIdleRetirement.reset());
 S.preparedPaintSource=()=>tinyPaint;await preparedPaintPlan('delegated500',text,S);
 // The colour program source workspace is the renderer's own, on its context page ledger (as the shared
 // reflection fixture installs it for delegated500), not the capture-binding placeholder map.
 {const value=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='programSources');assert(value?.initializer);S.programSources=evaluate(value.initializer.getText(ast),S);}
 // The shared setup's data stub is bound to its own one empty packing call. Fixture batches run the same
 // closed-demand preparation (admission selection, city extra) for their own exact raw packing input.
 {const [admissionRef,extraRef]=S.preparedDataFixture.resources;S.prepareDelegated500Data=async(components,city,signal,scope,raw)=>{assert.equal(city,S.city);assert.equal(raw.length,S.fixturePackingInput.length,'the complete physical source cohort reaches data preparation');assert(raw.every((row,index)=>row===S.fixturePackingInput[index]),'every raw source row keeps its exact identity and order');(S.fixtureDataPreparations??=[]).push([...raw]);const closed=S.delegated500DemandClosure(components);await scope.prepareSelection(admissionRef,[...new Set(closed.identities.map(row=>row.city+'|'+row.objectId))],signal);await scope.prepare([extraRef],signal);};}
 for(const name of ['snapshotMaterial','restoreMaterial','clearMaterialSnapshot','pumpPendingMaterialBatches','clearResidentBatches'])S[name]=evaluate(declaration(name).getText(ast),S);
 const emptyPaintView=Object.freeze([]),emptyPaint=()=>{const scope=(S.committingPreparedData??S.residentPreparedData).scope;return scope.borrow(S.preparedDataFixture.resources[0],rows=>{assert.equal(rows.length,0);return emptyPaintView;});};
 Object.assign(S,{progressiveStatusSnapshot:[],progressiveRenderView:emptyPaint,progressiveRenderStatus:()=>structuredClone(emptyPaint()),isProgressivelyPainted:()=>{emptyPaint();return false;},solarShadowAdmittedKeys:new Set(),fixedShadowIndices:new Uint32Array(),fixedShadowRanges:[],shadowSourceBoundarySHA:'',solarShadowSignature:'',solarShadowAdmitted:0,solarShadowWithheld:0,shadowAdmittedComponents:0});
 // The geometry fixture keeps the unchanged appearance certificates controlled;
 // the actual A catalogue closure has its own case below. Source admission,
 // receipt identity, scope pins and candidate publication remain production code.
 S.buildMaterialSource=()=>{const data=S.committingPreparedData??S.residentPreparedData;assert(data&&!data.scope.stats.disposed);S.cityPaintFragment=S.materialSourceBuilder();S.currentFamilyPrograms=true;S.materialSourceSettled=true;};
 // The appearance-data seam remains the same opaque operation when the real
 // construction runner enters through the new generator instead of its drain.
 S.buildMaterialSourceSteps=function*(...args){return S.buildMaterialSource(...args);};
 t.after(()=>{S.cancelPendingMaterialBatches();S.discardGeometryCandidate();S.residentScopeRelease?.();S.residentScopeRelease=undefined;S.preparedDataFixture.release();owner.dispose();});
 const setPrepared=S.setBatches;
 // As the manager does: nonempty batches are prepared with authoritative renderer chunk input (one ingress
 // source group over the page store the resident geometry owner uses) and the original publication plans.
 // The chunk construction's source build runs on the shared context scheduler, whose turn may already sit in
 // this fixture's captured queue (a program compile scheduled it inside a fixture turn): while the actual
 // preparation is awaited, the fixture keeps running its captured turns (as its batch pump below does), bounded.
 async function settleWithTurns(preparation){
  assert.equal(notifyPreparationWork,undefined,'one fixture preparation owns the captured queue');
  let scheduled,watchdog;
  const pump=new Promise((_,reject)=>{
   watchdog=setTimeout(()=>reject(new Error('chunk preparation did not settle within 10 seconds')),10_000);
   function schedule(){
    if(scheduled || !queue.length)return;
    scheduled=setImmediate(()=>{
     scheduled=undefined;
     try{if(queue.length)turn(queue.shift());schedule();}
     catch(error){reject(error);}
    });
   }
   notifyPreparationWork=schedule;
   schedule();
  });
  try{return await Promise.race([preparation,pump]);}
  finally{
   notifyPreparationWork=undefined;
   if(scheduled)clearImmediate(scheduled);
   clearTimeout(watchdog);
  }
 }
 // Content keys are page-unique (the page store is shared by every fixture of this file): one key, one source group.
 const chunkInput=rows=>S.fixtureChunkInput??({store:S.residentGeometry.store,groups:[{contentKey:'fixture-source:'+(++fixtureChunkSequence)+':'+rows.map(row=>row.objectId).join(','),components:rows,parents:[],frame:chunkInputAPI.rendererChunkFrame(rows[0].origin,'fixture-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]});
 S.setBatches=async(...args)=>{const preparation={nextGeneration:args[1],shadowAdmission:args[2],nativeDisplay:args[3],partialGatePlan:args[4],s402Plan:args[5],s434Plan:args[6],s036Plan:args[7],s240Plan:args[8],f151Plan:args[9]},scope=args[0].length?S.createFrozenDataScope(S.frozenData):undefined,input=args[0].length?chunkInput(args[0]):undefined;let prepared;try{prepared=args[0].length?(S.fixturePackingInput=input.groups.flatMap(group=>[...group.components]),await settleWithTurns(S.prepareBatches(args[0],new AbortController().signal,scope,args[0],input,preparation))):undefined;args[10]=prepared;setPrepared(...args);}finally{scope?.release();}
  for(let count=0;S.pendingMaterialBatches&&!S.pendingGeometry;count++){assert(count<100,'source candidate did not finish admitted packing');if(!queue.length){S.pumpPendingMaterialBatches();if(!queue.length)break;}turn(()=>queue.shift()());S.pumpPendingMaterialBatches();}
  if(S.batchPreparationFailure&&!S.pendingGeometry)throw Error(S.batchPreparationFailure);S.prepareGeometryUpload();
 };
 if(bootstrap){const release=S.residentScopeRelease;S.residentScopeRelease=undefined;S.residentPreparedData=undefined;release?.();S.materialSourceSettled=false;S.cityPaintFragment='';S.program=undefined;assert.equal(S.sceneChunks.length,0,'bootstrap starts from the empty chunk scene');S.currentFamilyPrograms=false;S.residentGPU=lifecycle.createResidentGPULifecycle({bind:context=>{S.gl=context;},initialize:S.initializeResidentGPU,release:S.releaseGPU,ready:S.gpuReady,lost:context=>context.isContextLost(),hasResident:()=>S.sceneIndexCount()>0||!!S.pendingMaterialBatches||!!S.pendingGeometry,needsPreflight:()=>S.gpuPreflightRequired,clearTransient(){},revision:()=>S.viewRevision});S.residentGPU.attach(c.gl);}
 const poll=()=>{S.mainFrame++;return S.prepareGeometryUpload();},drain=()=>turn(()=>{let count=0;while(queue.length){assert(++count<100);queue.shift()();}}),finish=(allowFailure=false)=>{for(let count=0;count<30;count++){drain();poll();if(!S.pendingGeometry&&!S.pendingMaterialBatches&&!S.geometryUploadPending){if(!allowFailure){const diagnostic=JSON.stringify({geometry:S.geometryUploadFailure,batch:S.batchPreparationFailure,programs:owner.stats.failures});assert.equal(S.geometryUploadFailure,undefined,diagnostic);assert.equal(S.batchPreparationFailure,undefined,diagnostic);}return;}}assert.fail('actual delegated candidate did not settle');},commit=async(rows=[component()],generation=2)=>{await S.setBatches(rows,generation);finish();};
 const settleBootstrap=()=>{for(let i=0;i<10;i++){S.mainWorldMatrix=mainProjection.slice();S.mainFrame++;S.initializeResidentGPU(c.gl,false);drain();S.prepareGeometryUpload();if(!S.pendingGeometry&&!S.geometryUploadPending&&S.gpuReady())return;}assert.fail('actual initialize/program/geometry chain did not settle');};
 return {S,c,queue,masks,events,owner,poll,drain,finish,commit,settleBootstrap,failCPU(value){failCPU=value;}};
}

// Chunk residency: the canonical 9-float geometry and the separate 1-float state live per published chunk
// (cpu.value.vertices/indices and the chunk's own stateData); the candidate keeps its own chunk scene until
// the admitted upload publishes exactly those arrays.
test('delegated chunk preparation survives a delayed scheduler wake',async t=>{
 const f=await fixture(t),prepare=f.S.prepareBatches;
 f.S.prepareBatches=async(...args)=>{
  // An independent operation may remain pending while many event-loop turns elapse.
  for(let i=0;i<1100;i++)await new Promise(resolve=>setImmediate(resolve));
  return prepare(...args);
 };
 await f.commit([component('delayed-wake')]);
 assert.equal(f.S.generation,2);
 assert.equal(f.S.sceneChunks.length,1);
});
test('delegated actual packing stages canonical9/state1 and publishes the same arrays only after admitted upload',async t=>{const f=await fixture(t),{S,c}=f,old=S.snapshotPackedResident(),initialRetired=maskRetirements(old.rathausProxyMasks);assert(old.rathausProxyMasks.stats.allocatedCPUBytes>0,'the initial scratch mask holds its page-ledger mask reservation');await S.setBatches([component()],2);const candidate=S.pendingGeometry;assert(candidate);assert.equal(S.sceneChunks,old.sceneChunks);assert.equal(S.loaded,old.loaded);assert.equal(candidate.state.sceneChunks.length,1);const chunk=candidate.state.sceneChunks[0],packed=chunk.cpu.value;assert.equal(packed.vertices.length,27);assert.equal(chunk.stateData.length,3);assert.equal(c.data.length,0,'no GL allocation/upload before work admission');f.finish();const initialAfterPublish={destroy:initialRetired.destroy,allocatedCPUBytes:old.rathausProxyMasks.stats.allocatedCPUBytes};assert.equal(S.sceneChunks,candidate.state.sceneChunks);assert.equal(S.sceneChunks[0].stateData,chunk.stateData);assert.equal(S.sceneChunks[0].cpu.value.vertices,packed.vertices);assert.equal(S.generation,2);assert.equal(S.pendingGeometry,undefined);assert.equal(S.geometryUploadPending,false,'the admitted upload publishes and consumes its work marker');assert.equal(S.geometryUploadPending,false);assert.equal(f.owner.stats.pending,0);assert.equal(c.data.filter(row=>row.value===packed.vertices).length,1,'the canonical vertex array is uploaded once, without a staging copy');assert.equal(c.data.filter(row=>row.value===chunk.stateData).length,1,'the separate state array is uploaded once');assert.deepEqual([...packed.indices],[0,1,2]);assert.equal(S.loaded.get(keyOf('next')).lastVertex,3);
 // Masks are per chunk: the published scene draws with its chunk's own mask binding, never the empty initial
 // resident's scratch binding.
 assert.equal(old.sceneChunks.length,0);assert.equal(S.rathausProxyMasks,S.sceneChunks[0].masks);assert(S.sceneChunks.every(chunk=>chunk.masks!==old.rathausProxyMasks));
 // The replaced initial scratch binding is retired at publication (every exit path returns its reservation):
 // destroyed exactly once, its page-ledger mask bytes released.
 assert.deepEqual(initialAfterPublish,{destroy:1,allocatedCPUBytes:0},'publication retires the replaced initial scratch mask and returns its reservation');});

test('delegated candidate requires a main matrix, base and real main-family programs before atomic publication',async t=>{
 const f=await fixture(t),{S,c}=f,previous=S.snapshotPackedResident();S.mainWorldMatrix=undefined;await S.setBatches([component('main-gated')],2);const candidate=S.pendingGeometry;
 assert(candidate);assert.equal(S.candidateMainReady(candidate),false);assert.equal(c.sources.length,0);assert.equal(c.data.length,0);assert.equal(S.sceneChunks,previous.sceneChunks);
 S.mainWorldMatrix=mainProjection.slice();f.poll();assert.equal(f.owner.stats.pending,2,'base and required family register together before either GL job completes');assert.equal(candidate.base,undefined);assert.equal(candidate.partitions.size,0);assert.equal(S.candidateMainReady(candidate),false);assert.equal(S.sceneChunks,previous.sceneChunks);assert.equal(c.data.length,0,'pending required programs cannot publish the candidate geometry');
 f.drain();f.poll();const base=candidate.base,family=candidate.partitions.get('current-family:7');assert(base);assert(family);assert.equal(S.candidateMainReady(candidate),true);assert(candidate.state.rathausProxyMasks.isResident(c.gl,base));assert(candidate.state.rathausProxyMasks.isResident(c.gl,family));assert.equal(S.sceneChunks,previous.sceneChunks);assert.equal(c.data.length,0,'ready programs alone do not bypass admitted geometry work');
 f.finish();assert.equal(S.generation,2);assert.equal(S.sceneChunks,candidate.state.sceneChunks);assert.equal(S.program,base);assert.equal(S.partitionPrograms.get('current-family:7'),family);assert.equal(S.pendingGeometry,undefined);assert.equal(S.geometryUploadPending,false);
});

test('delegated candidate registers every actual main family across frames, one new visible compile per frame, and publishes nothing before all are ready',async t=>{
 const f=await fixture(t),{S,c}=f,requested=[],compile=S.programPreparation.compile,keys=[9,11,13].map(currentPrograms.currentPaintProgramKey);
 S.programPreparation.compile=(context,recipe)=>{requested.push(recipe.resource);return compile(context,recipe);};S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));await S.setBatches([component('required-9'),component('required-11'),component('required-13')],2);
 // delegated500 starts at most one visible colour compile per main frame (DECISIONS 2026-11-02 03:25): every
 // actual main family is registered by the candidate's own polls, one new family per frame, never all in one.
 const registered=()=>[9,11,13].filter(family=>requested.some(resource=>resource.endsWith(':'+family))),started=[];
 for(let i=0;i<12&&registered().length<3;i++){const before=new Set(requested);f.poll();started.push(new Set(requested.filter(resource=>!before.has(resource)&&resource!=='colour:0')).size);if(registered().length<3){assert.equal(S.generation,1,'no publication while a main family is unregistered');assert.equal(c.data.length,0,'no geometry upload while a main family is unregistered');}f.drain();}
 const candidate=S.pendingGeometry;assert(candidate);assert.deepEqual([...candidate.mainKeys],keys);for(const family of [9,11,13])assert(requested.some(resource=>resource.endsWith(':'+family)),'each actual visible family must register');assert(started.every(count=>count<=1),'at most one new visible family compile per frame: '+started);assert.equal(S.generation,1);assert.equal(c.data.length,0);
 // The last registered family's compile completes on the next poll; from then on repeated polls hold exactly
 // one grant per candidate role (base plus each family) and add none.
 f.poll();const grants=f.owner.stats.shared.grantedReferences;assert.equal(grants,1+candidate.partitions.size);assert(candidate.base);f.poll();f.poll();assert.equal(f.owner.stats.shared.grantedReferences,grants);assert.equal(S.generation,1);f.finish();assert.equal(S.generation,2);for(const key of keys)assert(S.partitionPrograms.has(key));
});

test('pending main families do not consume later frames new-compile slots while the scheduler is still working',async t=>{
 const f=await fixture(t),{S,c}=f,requested=new Set(),compile=S.programPreparation.compile,keys=[9,11,13].map(currentPrograms.currentPaintProgramKey);
 S.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));
 await S.setBatches([component('pending9'),component('pending11'),component('pending13')],2);
 for(let i=0;!requested.has('colour:9');i++){assert(i<12,'initial material preflight must settle');f.poll();if(!requested.has('colour:9'))f.drain();}
 const started=[];
 // Deliberately do not drain the real scheduler between main frames: queued
 // or driver-waiting work must not serialize admission of all later families.
 for(let i=0;i<2;i++){const before=new Set(requested);f.poll();started.push([...requested].filter(resource=>resource!=='colour:0'&&!before.has(resource)).length);}
 assert.deepEqual(started,[1,1],'each frame may admit one new family while earlier work stays pending');
 assert.equal(S.generation,1);assert.equal(c.data.length,0,'pending programs cannot certify or publish geometry');
 f.finish();assert.equal(S.generation,2);for(const key of keys)assert(S.partitionPrograms.has(key));
});

test('delegated published-resident restoration registers every main recipe without treating recovered buffers as a full-draw witness',async t=>{
 const f=await fixture(t),{S,c}=f,keys=[9,11,13].map(currentPrograms.currentPaintProgramKey),requested=new Set(),compile=S.programPreparation.compile;S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));S.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};await f.commit([component('restore9'),component('restore11'),component('restore13')],2);const chunks=S.sceneChunks,data=S.residentPreparedData;
 c.control.lost=true;S.contextLost();c.control.lost=false;requested.clear();const uploads=c.data.length;S.mainWorldMatrix=undefined;S.initializeResidentGPU(c.gl,true);assert.equal(requested.size,0,'unknown projection cannot register restored programs');assert.equal(c.data.length,uploads);assert.equal(S.mainFrameCurrent(),false);S.mainWorldMatrix=mainProjection.slice();
 // One visible family compile starts per main frame (DECISIONS 2026-11-02 03:25): restoration registers the
 // base and every restored main family over successive frames despite Pending, one new family per frame.
 const started=[];for(let i=0;i<16&&![0,9,11,13].every(family=>requested.has('colour:'+family));i++){S.mainFrame++;const before=new Set(requested);S.initializeResidentGPU(c.gl,true);started.push([...requested].filter(resource=>!before.has(resource)&&resource!=='colour:0').length);f.drain();}
 for(const family of [0,9,11,13])assert(requested.has('colour:'+family),'actual main registration includes every restored role despite Pending');assert(started.every(count=>count<=1),'at most one new visible family compile per frame: '+started);assert.equal(c.data.length,uploads);assert.equal(S.mainFrameCurrent(),false);
 S.mainFrame++;S.initializeResidentGPU(c.gl,true);const grants=f.owner.stats.shared.grantedReferences;S.initializeResidentGPU(c.gl,true);S.initializeResidentGPU(c.gl,true);assert.equal(f.owner.stats.shared.grantedReferences,grants);
 f.settleBootstrap();assert.equal(S.generation,2);assert.strictEqual(S.sceneChunks,chunks,'restoration reuses the published CPU chunks');assert.strictEqual(S.residentPreparedData,data);assert.equal(data.scope.stats.disposed,false);for(const key of keys)assert(S.partitionPrograms.has(key));assert.equal(f.owner.stats.pending,0);assert.equal(S.mainFrameCurrent(),false,'actual preparation/upload has not executed the production complete main draw');
});

test('delegated candidate cancellation matches its generation and preserves published geometry and main programs',async t=>{
 const f=await fixture(t),{S}=f;await f.commit();const previous=S.snapshotPackedResident(),geometry=S.residentGeometry.current,program=S.program,family=S.partitionPrograms.get('current-family:7');
 S.mainWorldMatrix=undefined;await S.setBatches([component('cancel-main')],3);const candidate=S.pendingGeometry;assert(candidate);S.cancelCandidate(2);assert.equal(S.pendingGeometry,candidate,'a stale manager cancellation cannot cancel a newer candidate');
 S.cancelCandidate(3);assert.equal(S.pendingGeometry,undefined);assert.equal(candidate.closed,true);f.drain();assert.equal(S.generation,2);assert.equal(S.sceneChunks,previous.sceneChunks);assert.equal(S.residentGeometry.current,geometry);assert.equal(S.program,program);assert.equal(S.partitionPrograms.get('current-family:7'),family);assert.equal(S.geometryUploadPending,false);assert.equal(candidate.releaseScope,undefined);
});

test('delegated CPU validation failure and GL upload failure preserve the published arrays, mask and geometry',async t=>{for(const failure of ['cpu','gpu']){const f=await fixture(t),{S,c}=f;await f.commit();const previous=S.snapshotPackedResident(),gpu=S.residentGeometry.current,deleted=c.deleted.length,publishedState=previous.sceneChunks[0].stateData;assert(gpu);
 // The published mask is the chunk's own binding: count any retirement of it by the failed candidate.
 let maskRetirements=0;for(const name of ['detach','destroy']){const original=previous.rathausProxyMasks[name].bind(previous.rathausProxyMasks);previous.rathausProxyMasks[name]=()=>{maskRetirements++;original();};}
 if(failure==='cpu'){f.failCPU(true);await assert.rejects(async()=>{await S.setBatches([component('failed')],3);},/mask validation/);}else{c.control.failUpload=c.uploads+2;await S.setBatches([component('failed')],3);f.finish(true);assert.match(S.geometryUploadFailure,/WebGL error/);}assert.equal(S.sceneChunks,previous.sceneChunks);assert.equal(S.sceneChunks[0].stateData,publishedState);assert.equal(S.loaded,previous.loaded);assert.equal(S.generation,2);assert.equal(S.rathausProxyMasks,previous.rathausProxyMasks);assert.equal(S.residentGeometry.current,gpu);assert.equal(S.pendingGeometry,undefined);assert.equal(maskRetirements,0);assert(c.deleted.slice(deleted).every(v=>![gpu.vao,gpu.indexBuffer,...gpu.buffers.values()].includes(v)));}});

test('delegated latest candidate replacement and hide cancel old work without publishing or retaining its rows',async t=>{const f=await fixture(t),{S}=f;await f.commit();const old=S.snapshotPackedResident();await S.setBatches([component('obsolete')],3);const obsolete=S.pendingGeometry,obsoleteMasks=maskRetirements(obsolete.state.rathausProxyMasks);assert.notEqual(obsolete.state.rathausProxyMasks,old.rathausProxyMasks);await S.setBatches([component('latest')],4);assert.equal(obsoleteMasks.destroy,1,'the superseded candidate chunk mask is retired once');assert.equal(S.pendingGeometry.state.sourceLoaded.has(keyOf('latest')),true);S.setPageHidden(true);assert.equal(S.pendingGeometry,undefined);f.drain();assert.equal(S.sceneChunks,old.sceneChunks);assert.equal(S.loaded,old.loaded);assert.equal(S.generation,2);assert.equal(S.geometryUploadPending,false);assert.equal(f.owner.stats.pending,0);});

test('delegated filtered-empty publication requests a frame that certifies empty readiness',async t=>{
 const f=await fixture(t,{bootstrap:true}),{S,c,events}=f;
 // Real admission/packing receives a physical source row but admits no drawable
 // component, as a provider can legitimately do outside its display coverage.
 S.acceptPaintComponent=()=>false;
 const prepare=S.prepareGeometryUpload;S.prepareGeometryUpload=()=>{};
 await S.setBatches([component('filtered-empty')],2);
 S.prepareGeometryUpload=prepare;
 assert(S.pendingGeometry,'the asynchronous source request reaches publication');
 assert.equal(S.sceneIndexCount(S.pendingGeometry.state.sceneChunks),0);
 events.length=0;S.prepareGeometryUpload();
 assert.equal(S.generation,2);assert.equal(S.pendingGeometry,undefined);
 assert.equal(S.geometryUploadPending,false);assert.equal(S.residentGPU.isEmptyReady(),false,'publication alone is not a frame witness');
 assert(events.includes('repaint'),'publication must request its empty main frame even when the map is otherwise idle');
 assert.equal(c.data.length,0,'an empty publication allocates no geometry');
 // The requested main draw supplies the projection again after releaseGPU.
 S.mainFrame++;S.mainWorldMatrix=mainProjection.slice();
 assert.equal(S.residentGPU.emptyFrame(mainProjection),true);
 S.recordCompleteMainFrame(true);
 assert.equal(S.residentGPU.isEmptyReady(),true);assert.equal(S.mainFrameCurrent(),true);
});

test('delegated empty commit immediately retires the candidate and GPU while keeping the canonical empty state',async t=>{const f=await fixture(t),{S}=f;await f.commit();await S.setBatches([component('obsolete')],3);const pending=S.pendingGeometry,pendingMasks=maskRetirements(pending.state.rathausProxyMasks);await S.setBatches([],4);assert.equal(S.pendingGeometry,undefined);assert.equal(pendingMasks.destroy,1,'the unpublished candidate chunk mask is retired once');assert.equal(S.sceneChunks.length,0,'the canonical empty state has no chunk geometry, state or indices');assert.equal(S.sceneSpans.length,0);assert.equal(S.sceneIndexCount(),0);assert.equal(S.residentGeometry.current,undefined);f.drain();assert.equal(S.generation,4);assert.equal(S.loaded.size,0);});

test('delegated selection, growth and exact triangle picking share separate state without changing canonical geometry',async t=>{const f=await fixture(t),{S,c}=f;await f.commit();const chunk=S.sceneChunks[0],before=chunk.cpu.value.vertices.slice(),entry=S.loaded.get(keyOf('next'));S.selectedIdentity=entry;S.paintSelection();assert(chunk.stateData.every(v=>Math.floor(v%4/2)===1));assert.deepEqual(chunk.cpu.value.vertices,before);
 // The chunk state upload writes the dirty range of the chunk's own state array in place (a view of it).
 const update=c.updates.at(-1);assert.equal(update.buffer,chunk.stateData.buffer);assert.equal(update.byteOffset,chunk.stateData.byteOffset);assert.equal(update.length,chunk.stateData.length);const growthState=new Float32Array([.5,.5,.5]),vertices=new Float32Array([0,0,0,0,1,0,1,1,1,1,2,0,0,1,0,1,1,1,0,0,1,0,1,0,1,1,1]);const hit=S.triangle([.25,2,.25],[0,-1,0],vertices,growthState,0,1,2);assert(hit);assert.equal(hit.distance,1.75);assert.deepEqual(Array.from(vertices.slice(0,3)),[0,0,0]);});

test('delegated main geometry has one upload owner and no interleaved static/state staging copy',()=>{for(const name of ['initializeResidentGPU','uploadPreparedGeometry','releaseGPU','uploadShadow','releaseShadowGPU']){const source=declaration(name).getText(ast);assert(!source.includes('.createBuffer('),name);assert(!source.includes('.createVertexArray('),name);assert(!source.includes('.deleteBuffer('),name);assert(!source.includes('.deleteVertexArray('),name);}assert(!declaration('uploadPreparedGeometry').getText(ast).includes('new Float32Array'));assert(!text.includes('vertices.length/10'));assert(!text.includes('vertices[vi*10'));// Chunk residency: one owner (residentGeometry) allocates each chunk's GPU geometry and publishes the scene.
 const upload=declaration('uploadPreparedGeometry').getText(ast);assert(upload.includes('residentGeometry.allocate('));assert(upload.includes('residentGeometry.publish('));});


test('delegated actual initialization admits the program before geometry and restores from the published canonical arrays',async t=>{
 const f=await fixture(t,{bootstrap:true}),{S,c}=f;await S.setBatches([component()],2);assert.equal(S.program,undefined);assert.equal(c.sources.length,0);assert.equal(c.data.length,0);f.settleBootstrap();
 assert.equal(c.links.length,2);assert.equal(S.generation,2);assert(S.gpuReady());assert.equal(S.residentGPU.stats.initialized,true);assert.equal(S.residentGPU.stats.initializations,1);const chunks=S.sceneChunks,state=chunks[0].stateData,indices=chunks[0].cpu.value.indices,program=S.program,families=new Map(S.partitionPrograms),initialLinks=c.links.length;
 c.control.lost=true;S.shadowGeometry.contextLost();S.residentGeometry.contextLost();S.programPreparation.contextLost();const deleted=c.deleted.length;S.releaseGPU();assert.equal(c.deleted.length,deleted,'lost epoch release does not call GL delete');assert.equal(S.sceneChunks,chunks);assert.equal(S.sceneChunks[0].stateData,state);assert.equal(S.sceneChunks[0].cpu.value.indices,indices);
 c.control.lost=false;f.settleBootstrap();assert.notEqual(S.program,program);assert.equal(c.links.length,initialLinks+1+families.size,'restoration links the base and every required main family');assert.deepEqual([...S.partitionPrograms.keys()],[...families.keys()]);for(const [key,value]of families)assert.notEqual(S.partitionPrograms.get(key),value,'restoration cannot retain a lost-epoch family handle');assert.equal(S.sceneChunks,chunks);assert.equal(S.sceneChunks[0].stateData,state);assert.equal(S.sceneChunks[0].cpu.value.indices,indices);assert.equal(S.residentGPU.stats.initialized,true);assert.equal(S.residentGPU.stats.initializations,2);assert.equal(S.generation,2);
});

test('delegated borrowed shadow uploads only its index buffer and preserves successful main and shadow storage on failure',async t=>{
 // Chunk residency: a shadow subset of a published chunk is its own index lease (setChunkShadowRanges, as the
 // solar admission drives it with a new signature); every vertex buffer is borrowed from the main chunk.
 const f=await fixture(t),{S,c}=f;await f.commit([component('shadow-a'),component('shadow-b'),component('shadow-c')],2);const main=S.residentGeometry.current;assert(main);assert.equal(S.sceneChunks.length,1);assert.equal(S.sceneIndexCount(),9);
 const admit=(...labels)=>{S.setChunkShadowRanges(labels.map(identityOf));S.solarShadowSignature='fixture-admission:'+labels.join(',');};admit('shadow-a');assert.equal(S.sceneChunks[0].shadowIndices.length,3);const before=c.data.length;
 for(let i=0;i<3&&S.shadowUploadPending!==false||!S.shadowGeometry.current;i++){assert(i<5);S.uploadShadow();f.drain();S.uploadShadow();}
 assert.equal(c.data.length-before,1,'shadow borrows all four existing geometry buffers');const shadow=S.shadowGeometry.current;for(const [key,buffer]of shadow.buffers)assert.equal(buffer,main.buffers.get(key));assert.equal(S.shadowUploadedIndexCount,3);assert.equal(S.shadowUploadPlan,undefined,'ready work marker is consumed');
 // The replacement demand grows to six indices (a two-row subset of the three-row chunk, so it is its own
 // index upload, not the borrowed full-chunk index buffer); its upload fails.
 admit('shadow-a','shadow-b');assert.equal(S.sceneChunks[0].shadowIndices.length,6,'the demand changed to six indices');c.control.failUpload=c.uploads+1;S.uploadShadow();f.drain();S.uploadShadow();assert.equal(S.shadowGeometry.current,shadow);assert.equal(S.shadowUploadedIndexCount,3,'failed demand cannot draw six indices from the previous three-index GPU buffer');assert.equal(S.sceneChunks[0].shadowIndexCount,3);assert.equal(S.shadowFailure,true);
 const deleted=c.deleted.length;S.releaseShadowGPU();assert.equal(S.shadowGeometry.current,undefined);assert(c.deleted.slice(deleted).every(buffer=>!main.buffers.has(buffer)&&![...main.buffers.values()].includes(buffer)));assert.equal(S.residentGeometry.current,main);
});

test('delegated queued selection uses the newest separate state bits and texture failure cannot undo committed geometry',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();await S.setBatches([component('selected')],3);const candidate=S.pendingGeometry;S.selectedIdentity=identityOf('selected');S.syncFacadeResources=()=>{if(candidate.closed&&S.generation===3)throw Error('controlled texture failure');};f.finish();
 assert.equal(S.sceneChunks,candidate.state.sceneChunks);assert.equal(S.generation,3);const selectedChunk=S.sceneChunks[0];assert(selectedChunk.stateData.every(value=>Math.floor(value%4/2)===1));assert.equal(c.data.findLast(row=>row.value===selectedChunk.stateData).value,selectedChunk.stateData,'the uploaded state buffer holds the newest selection bits');assert.equal(S.geometryUploadFailure,undefined);assert.match(S.residentPublicationFailure,/controlled texture failure/);assert.equal(S.pendingGeometry,undefined);
});


test('delegated failed replacement retains colour grants; successful publication retires the previous source context',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();
 const retired={id:'cached old colour'},resident={id:'resident colour'};S.partitionPrograms=new Map([['retired',retired],['current-family:7',resident]]);S.casterFailures=new Map([['retired','old caster failure']]);S.casterBase.set('current-family:7',true);S.casterFamily0=false;
 const before=S.snapshotPackedResident(),gpu=S.residentGeometry.current,programs=[...S.partitionPrograms.values()],keys=[...S.solarCasterResidentKeys()];assert.deepEqual(keys,['current-family:7']);
 c.control.failUpload=c.uploads+1;await S.setBatches([component('failed-caster')],3);f.finish(true);
 assert.equal(S.sceneChunks,before.sceneChunks);assert.equal(S.sceneChunks[0].stateData,before.sceneChunks[0].stateData);assert.equal(S.generation,before.generation);assert.equal(S.residentGeometry.current,gpu);assert.deepEqual([...S.partitionPrograms.values()],programs);assert.deepEqual([...S.solarCasterResidentKeys()],keys);assert.equal(S.casterFailures.get('retired'),'old caster failure');assert(programs.every(program=>!c.deleted.includes(program)));
 c.control.failUpload=0;await S.setBatches([component('published-caster')],4);f.finish();
 assert.equal(S.generation,4);assert.notEqual(S.residentGeometry.current,gpu);assert.equal(S.partitionPrograms.size,1,'publication transfers the candidate main-family grant after retiring the old colour context');assert(S.partitionPrograms.has('current-family:7'));assert(!programs.includes(S.partitionPrograms.get('current-family:7')));assert(programs.every(program=>c.deleted.filter(value=>value===program).length===1));assert.equal(S.casterFailures.has('retired'),false);assert.deepEqual([...S.solarCasterResidentKeys()],keys,'the new source context retains the exact required colour role without borrowing old-source grants');const nextColour=S.partitionPrograms.get('current-family:7');assert(c.links.includes(nextColour),'the published main colour role was linked by the real preparation owner');const solar=S.solarProgramStats();assert.deepEqual(solar.keys,keys);assert.equal(solar.programs,1);assert.equal(solar.casters.pending,0,'the required colour role is already resident; this is not a full solar-capture readiness claim');assert.equal(solar.sharedColourPrograms,true);assert(programs.every(program=>c.deleted.filter(value=>value===program).length===1));
 const roleGrants=[S.program,nextColour],released=[],releaseProgram=S.programPreparation.releaseProgram;S.programPreparation.releaseProgram=(context,program)=>{released.push(program);return releaseProgram(context,program);};S.releaseGPU();assert.equal(S.partitionPrograms.size,0);for(const grant of new Set(roleGrants))assert.equal(released.filter(program=>program===grant).length,roleGrants.filter(program=>program===grant).length,'final retirement releases each held main-role grant, whether programs alias or remain distinct');assert(programs.every(program=>c.deleted.includes(program)),'the renderer releases each ordinary colour grant at its normal terminal boundary');
});

test('actual delegated Berlin preparation declares F004/F020 metadata programs without an admitted owner family',async t=>{
 const cache=new Map(),root=fileURLToPath(web);
 function actualModule(relative){
  let filename=path.resolve(root,relative);if(!path.extname(filename))filename+='.ts';if(cache.has(filename))return cache.get(filename);
  if(filename.endsWith('/safety/frozen-paint-tables.ts')){const value={frozenPaintTableRowCounts:(_sha,_file,count)=>({global:count,retained:count,city:undefined})};cache.set(filename,value);return value;}
  if(filename.endsWith('.json')){const value=JSON.parse(fs.readFileSync(filename,'utf8'));cache.set(filename,value);return value;}
  const exports={};cache.set(filename,exports);const raw=fs.readFileSync(filename,'utf8'),js=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  Function('exports','require',js)(exports,spec=>{assert(spec.startsWith('.'),'unexpected external asset import '+spec);return actualModule(path.resolve(path.dirname(filename),spec));});return exports;
 }
 const base='src/painted/delegated500/safety/',preparer=actualModule(base+'delegated500-prepared-data.ts'),facade=actualModule(base+'facade-paint-fragment.ts'),demand=actualModule(base+'delegated500-data-demand.ts');
 const admissions=actualModule(base+'progressive-paint-admissions.ts'),extra=actualModule(base+'progressive-feature-cities.ts'),catalog=actualModule(base+'progressive-berlin-programs.ts'),lease=actualModule('src/safety/frozen-data-lease-store.ts'),scopeAPI=actualModule('src/safety/frozen-data-scope.ts');
 const rows=[{city:'berlin',objectId:'osm/way/991900001',partId:'unmatched-fixture-part'}],closure=demand.delegated500DemandClosure(rows);
 assert.deepEqual(closure.families,[]);assert.equal(closure.modules.size,0);assert.equal(facade.paintProgramPartitionEnabled('berlin'),false,'metadata source reads remain required even when the current partition source hash gate is closed');
 const keys=[catalog.BERLIN_PROGRAM_FAMILIES['1567'],catalog.BERLIN_PROGRAM_FAMILIES['1679']];assert(keys.every(key=>typeof key==='string'));
 const programs=Object.fromEntries([...new Set(['base',...keys])].map(key=>[key,'/* tiny exact source '+key+' */\nvec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}']));
 const resources=[{ref:admissions.PROGRESSIVE_ADMISSIONS_RESOURCE,value:[]},{ref:extra.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,value:{berlin:'vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}'}},{ref:catalog.BERLIN_PROGRAM_GLSL_RESOURCE,value:programs}].map(row=>{const bytes=new TextEncoder().encode(JSON.stringify(row.value)),sha=createHash('sha256').update(bytes).digest('hex');return{...row,bytes,sha,path:'/safety/buildings3d/painted-tables/'+sha.slice(0,2)+'/'+sha+'.json'};});
 const store=lease.createFrozenDataLeaseStore(resources.map(row=>({path:row.path,sha256:row.sha,bytes:row.bytes.length}))),reads=[];
 const client=store.client({city:'berlin',profileSHA256:null,provider:'delegated500',selection:{tables:resources.map(row=>row.sha),initializers:Object.fromEntries(resources.map(row=>[row.sha,{[row.ref.file]:1}]))},resolve(canonical,file,occurrence){const row=resources.find(row=>row.ref.canonicalSHA256===canonical&&row.ref.file===file&&row.ref.occurrence===occurrence);assert(row,'exact canonical/file/occurrence binding');return row.sha;},async read(path,signal,max){signal.throwIfAborted();const row=resources.find(row=>row.path===path);assert(row);assert.equal(max,row.bytes.length);reads.push(row.ref.file);return row.bytes;}}),scope=scopeAPI.createFrozenDataScope(client),signal=new AbortController().signal;
 t.after(()=>{scope.release();client.dispose();store.destroy();});
 await preparer.prepareDelegated500Data(rows,'berlin',signal,scope);
 assert.throws(()=>scope.assertSelection(catalog.BERLIN_PROGRAM_GLSL_RESOURCE,keys),/selection|prepared|declared/i);
 await preparer.prepareDelegated500Programs(rows,'berlin',signal,scope);
 scope.assertSelection(catalog.BERLIN_PROGRAM_GLSL_RESOURCE,keys);
 assert.deepEqual([1567,1679].map(family=>facade.paintProgramKey(family,'berlin',scope)),keys);
 for(const key of keys)assert(facade.paintProgramFragment(key,'berlin',scope).includes(programs[key]),'the actual consumer preserves the selected exact source');
 assert.equal(reads.filter(file=>file===catalog.BERLIN_PROGRAM_GLSL_RESOURCE.file).length,1);
 scope.release();assert.equal(scope.stats.disposed,true);assert.equal(store.stats.valueCells,0);
});


test('delegated complete source groups survive A subset to overlapping B and back without geometry or program replacement',async t=>{
 const f=await fixture(t),{S,c}=f,rows=[component('stable-full-a'),component('stable-full-b')],store=S.residentGeometry.store;
 const requests=[],acquire=store.acquire.bind(store);t.mock.method(store,'acquire',request=>{requests.push(request);return acquire(request);});
 const source=store.acquire({contentKey:'stable-full-source:'+ ++fixtureChunkSequence,role:'wanted',estimate:{category:'decoded',bytes:4096,precision:'estimate'},produce:()=>rows});
 await source.ready;S.fixtureChunkInput={store,groups:[{contentKey:source.contentKey,components:rows,parents:[source],frame:chunkInputAPI.rendererChunkFrame(rows[0].origin,'stable-full-frame'),cohortKeys:[],materialAuthority:'stable-full-material',recipeAuthority:'stable-full-recipe',selectedLOD:0}],cohorts:[]};
 t.after(()=>source.release());
 await S.setBatches([rows[0]],2);assert(S.pendingGeometry);assert(S.pendingGeometry.state.sceneChunks[0].source.parents.every(parent=>!parent.released&&parent.state==='ready'),'the candidate retains every actual source parent after its preparation receipt is returned');f.finish();const first=S.sceneChunks[0],packed=first.cpu.value,staticBuffer=first.geometry.value.buffers.get('static'),paintBuffer=first.geometry.value.buffers.get('paint'),program=S.program,family=S.partitionPrograms.get('current-family:7'),uploads=c.data.length;
 assert.equal(packed.rows.length,2,'physical production contains the complete admitted source group');const packedRequest=requests.find(request=>request.allowRecent===true&&Array.isArray(request.estimate)&&request.estimate.some(cost=>cost.category==='packed'));assert(packedRequest);const packedEstimate=rows.reduce((sum,row)=>sum+row.batches.reduce((bytes,batch)=>bytes+batch.positions.length/3*76+batch.indices.length*4+Math.ceil(batch.indices.length/(64*3))*48,0),0);assert.equal(packedRequest.estimate.find(cost=>cost.category==='packed').bytes,packedEstimate,'pre-production admission covers all physical source rows');assert.equal(packedRequest.estimate.find(cost=>cost.category==='metadata').bytes,512+rows.length*256);assert.equal(first.loaded.size,1);assert.equal(S.loaded.size,1);assert.equal(S.sourceLoaded.size,1);assert.equal(S.sceneIndexCount(),3);assert.equal(S.sceneVertexCount(),3);assert.deepEqual(S.fixtureDataPreparations.at(-1),rows);
 await f.commit(rows,3);assert.equal(S.sceneChunks[0].cpu.value,packed);assert.equal(S.sceneChunks[0].geometry.value.buffers.get('static'),staticBuffer);assert.equal(S.sceneChunks[0].geometry.value.buffers.get('paint'),paintBuffer);assert.equal(S.program,program);assert.equal(S.partitionPrograms.get('current-family:7'),family);assert.equal(S.loaded.size,2);assert.equal(S.sceneIndexCount(),6);assert.equal(c.data.length,uploads,'expanding the visible spans uploads no shared source geometry');
 S.cancelCandidate(2);assert.equal(S.generation,3,'late cancellation cannot withdraw the shared current resident');
 S.selectedIdentity=identityOf('stable-full-b');S.paintSelection();assert(S.sceneChunks[0].stateData.slice(3).every(value=>Math.floor(value%4/2)===1));
 await f.commit([rows[0]],4);assert.equal(S.sceneChunks[0].cpu.value,packed);assert.equal(S.sceneChunks[0].geometry.value.buffers.get('static'),staticBuffer);assert.equal(S.loaded.has(keyOf('stable-full-b')),false);assert.equal(S.sourceLoaded.has(keyOf('stable-full-b')),false);assert.equal(S.sceneIndexCount(),3);assert.equal(S.sceneVertexCount(),3);assert(S.sceneChunks[0].stateData.every(value=>Math.floor(value%4/2)===0),'a selected source outside the view has no highlighted vertices');assert.equal(c.data.length,uploads);
 await S.setBatches([],5);
});

test('delegated stable source candidates retain a native outline across outline-only to parts and back',async t=>{
 const f=await fixture(t),{S}=f,outline=component('stable-outline'),part=component('stable-part');outline.sourceFeature.properties={building:'yes'};part.sourceFeature.properties={'building:part':'yes'};const rows=[outline,part],store=S.residentGeometry.store;
 S.fixtureChunkInput={store,groups:[{contentKey:'stable-outline-source:'+ ++fixtureChunkSequence,components:rows,parents:[],frame:chunkInputAPI.rendererChunkFrame(outline.origin,'stable-outline-frame'),cohortKeys:[],materialAuthority:'outline-material',recipeAuthority:'outline-recipe',selectedLOD:0}],cohorts:[]};
 await f.commit([outline],2);const packed=S.sceneChunks[0].cpu.value,staticBuffer=S.sceneChunks[0].geometry.value.buffers.get('static');assert.equal(packed.rows.length,2);assert(S.loaded.has(keyOf('stable-outline')));assert.equal(S.loaded.has(keyOf('stable-part')),false);
 await f.commit(rows,3);assert.equal(S.sceneChunks[0].cpu.value,packed);assert.equal(S.loaded.has(keyOf('stable-outline')),false,'the original exact native-part rule hides only the visible outline draw');assert(S.loaded.has(keyOf('stable-part')));assert.equal(S.sceneIndexCount(),3);
 await f.commit([outline],4);assert.equal(S.sceneChunks[0].cpu.value,packed);assert.equal(S.sceneChunks[0].geometry.value.buffers.get('static'),staticBuffer);assert(S.loaded.has(keyOf('stable-outline')),'the source fallback is still physically available');assert.equal(S.loaded.has(keyOf('stable-part')),false);assert.equal(S.sceneIndexCount(),3);
 await S.setBatches([],5);
});
