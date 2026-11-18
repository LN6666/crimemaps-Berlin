// Shared fixture for the delegated500 renderer suites (family programs, solar
// caster capture, Berlin distant paint). The renderer's own declarations are
// extracted from building-mesh-renderer.ts and evaluated against one state
// object; they run with the production program preparation owner, context
// scheduler, page ResourceBudget/chunk store, prepared-source workspace,
// wrapper chain, fragment shell, specializer and capture runtime.
//
// Fixture inputs, not production code: the synthetic facade paint (the data a
// frozen scope would otherwise supply), one published scene chunk with live
// geometry and mask leases, and a fake WebGL2 context. Geometry upload, shadow
// geometry, textures and data preparation sit outside these suites and are
// inert stubs, listed in INERT below.
//
// Known coverage gaps (uncovered[32](3)): the suites call the renderer's raw
// render method, not the production layer wrapper around it; under the frozen
// fixture clock the 2 ms cooperative-yield branch of a preparation turn never
// runs; and residentGPU.attach is a stub (no real context attach/restore).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {nullCityDataProfilePlugin} from '../city-profile-test-plugin.mjs';

export const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build}=require('esbuild');

export const scopeProxy=state=>new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
const transpiled=new Map();
/** Evaluate one declaration's TypeScript text with `state` as its enclosing scope. */
export function evaluate(source,state){let js=transpiled.get(source);if(js===undefined){js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');transpiled.set(source,js);}return Function('scope','with(scope){return '+js+'}')(scopeProxy(state));}

// Declarations evaluated against the fixture state, in creation order where an
// initializer runs immediately. Names map to the renderer source text.
const MODULE=[['key',text=>text.startsWith('(i:Identity)=>')],'multiply','DELEGATED_COLOUR_ATTRIBUTES','delegatedColourSourceAuthority','delegatedPreparedSourceAuthority'];
const STATE_INITIALIZERS=['linkedPaint','programIdleRetirement','VERTEX','BERLIN_FULL_CURRENT_CAPTURE_KEY','uploadSceneLight','reflectionClipUniforms','reflectionObjectID'];
const FUNCTIONS=[
 // material source, admission and colour programs
 'fragmentParts','fragment','materialSourceBuilder','legacyPartitionFragment','pageBudget','programSources','clearProgramSources','createCasterPreparedSources','withPreparedData','withSourceContext','sourceContextCurrent','candidateCurrent','selectColourProgramConsumer','delegatedPaintBounds','materialBaseKey','materialPaintBounds','materialRebuildEstimate','materialTextRequirement','withMaterialTextCosts','colourSpecializationFamilies','colourSourceRecipe','colourProgramRecipe','compileGeometryProgram','compilePartitionProgram','ensureMaterialSourceWorkspace','releaseMaterialSourceClaim','materialSourceGate','batchSourceGate','casterSourceGate','sourceBudgetWaiting','materialSourceEstimate','admitMaterialSourceNow','f020PartitionFlags1679','buildMaterialSourceSteps','buildMaterialSource','prepareMaterialSource','clearMaterialSource','snapshotMaterial','restoreMaterial','clearMaterialSnapshot',
 // paint keys
 'programKey','programOverrideKey','richPaintProgramKey','distantPaintProgramKey',
 // casters, capture demand and solar preparation
 'casterIsBase','endCaptureDemands','preparePlanarReflection','solarCasterResidentKeys','solarCaptureDemandActive','captureProgramDemandCurrent','reflectionMaterialKey','reflectionRunKeys','reflectionCaptureKeys','activeCaptureProgramKeys','reflectionKeyProgram','trimCapturePrograms','retireCapturePrograms','resetCaptureDemands','setCaptureDemand','mainPaintDemand','mainPaintProgramKeys','mainProtectedProgramKeys','visibleProgramDemandKeys','visibleProgramDemandCurrent','materialProgramDemandCurrent','pruneProgramPreparation','drainSourceWorkspaces','trimSolarCasterState','prepareCasterClassification','casterProgram','prepareFamilyCasters','releaseSolarDepth','prepareSolarPrograms','solarProgramStats','residentCaptureState','solarCasterFailureReason','solarCaptureRevision','captureContentRevision','residentCaptureAdapter','prepareCaptureMaterial','prepareSolarShadow','solarCoverage',
 // resident main programs, draw and lifecycle
 'sceneIndexCount','localComponent','gpuReady','invalidateMainFrame','takeCompletedMainFrame','mainBindingStamp','mainRolePrograms','captureMainFrameWitness','paintDetailQuality','updateDistantPaintQuality','candidateTexturePending','candidateMainReady','refreshCandidateCapture','createResidentMainPlan','prepareResidentMain','candidateMaterialKeys','candidateTextureRecipesKnown','prepareMainPrograms','candidatePaintDemand','clearCandidateGPU','snapshotPackedResident','prepareChunkMasks','drawSceneRange','syncFacadeResources','clearProgramGrantHandoff','programGrantHandoff','rememberFinishedBirth','reserveBirthSlot','grow','uploadState','releaseGPU',
 // the capture runtime over this renderer's adapter (initialized last)
 'captureRuntime'];
const METHODS=[['render',text=>text.includes('chunkStore?.collectRetired()')],['getSolarShadowRevision']];
/** Peripheral renderer stages outside these suites: geometry upload/publication,
 * projected shadows, data preparation and candidate replacement. */
const INERT=['pumpPendingMaterialBatches','prepareGeometryUpload','uploadShadow','releaseShadowGPU','clearShadowGeometry','clearDataPreparation','cancelPendingMaterialBatches','discardGeometryCandidate','drawProjectedShadows','recordDraw601','recordCompile557'];
// Facade paint data functions read the frozen scope; the fixture supplies their
// data. Paint mode/override are the fixture's appearance controls (their module
// reads the page URL when it loads).
const DATA_FUNCTIONS=new Set(['facadePaintFragmentForCity','facadePaintSpecializationForCity','paintProgramFragment','paintProgramKey','describeFacadePaintSource','describeFacadePaintSourceBounds','paintMode','paintOverride']);

const rendererSources=new Map();
/** The delegated500 renderer of one checkout's web root (default: this one):
 * its declarations, object methods, imports and the bundle of their modules. */
export function rendererSource(root=web){
 const cached=rendererSources.get(root);if(cached)return cached;
 const safety=path.join(root,'src/painted/delegated500/safety'),text=fs.readFileSync(path.join(safety,'building-mesh-renderer.ts'),'utf8'),ast=ts.createSourceFile('building-mesh-renderer.ts',text,ts.ScriptTarget.Latest,true);
 // Every function/variable declaration and object method, by name.
 const declared=new Map(),methods=new Map(),imports=new Map(),scopedConsts=new Map();
 const push=(map,name,row)=>{const rows=map.get(name)??[];rows.push(row);map.set(name,rows);};
 (function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name)push(declared,node.name.text,node.getText(ast).replace(/^export\s+/,''));
  else if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){const value=node.initializer.getText(ast);push(declared,node.name.text,value);const scoped=/^scopedValue\((importedDelegated_\w+)\)$/.exec(value);if(scoped)scopedConsts.set(node.name.text,scoped[1]);}
  else if(ts.isMethodDeclaration(node)&&node.name)push(methods,node.name.getText(ast),'function '+node.getText(ast));
  ts.forEachChild(node,visit);
 })(ast);
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const element of bindings.elements)if(!element.isTypeOnly)imports.set(element.name.text,[node.moduleSpecifier.text,(element.propertyName??element.name).text]);}
 /** The one renderer declaration (function text or variable initializer) named
  * `name`; `filter` disambiguates names that are also local variables. */
 const declaration=(name,filter)=>{const rows=(declared.get(name)??[]).filter(value=>!filter||filter(value));assert.equal(rows.length,1,'one renderer declaration '+name);return rows[0];};
 /** The one object method `name` (layer.render, getSolarShadowRevision, ...). */
 const method=(name,filter)=>{const rows=(methods.get(name)??[]).filter(value=>!filter||filter(value));assert.equal(rows.length,1,'one renderer method '+name);return rows[0];};
 let sources,modulesPromise;
 const source={root,safety,text,declaration,method,
  get sources(){if(!sources){sources=[];for(const row of MODULE){const [name,filter]=Array.isArray(row)?row:[row];sources.push([name,declaration(name,filter)]);}for(const name of [...STATE_INITIALIZERS,...FUNCTIONS])sources.push([name,declaration(name,value=>!/^scopedValue\(/.test(value))]);for(const [name,filter] of METHODS)sources.push(['method:'+name,method(name,filter)]);}return sources;},
  /** One esbuild bundle: the renderer imports these declarations reference, the
   * pure scopedValue helpers they call, and the runtime owners the fixture drives. */
  modules(){
   modulesPromise??=(async()=>{
    const used=new Set(),bound=new Map();
    for(const [,value] of source.sources)for(const [word] of value.matchAll(/\b[A-Za-z_$][\w$]*\b/g)){
     if(imports.has(word))used.add(word);
     const scoped=scopedConsts.get(word);if(scoped&&!DATA_FUNCTIONS.has(word)&&imports.has(scoped)){used.add(scoped);bound.set(word,scoped);}
    }
    const entry=[...[...used].map(name=>{const [specifier,imported]=imports.get(name);return 'export {'+imported+' as '+name+'} from '+JSON.stringify(specifier)+';';}),
     "export * as fixtureBudget from '../../../safety/render-runtime/resource-budget';",
     "export * as fixtureChunks from '../../../safety/render-runtime/chunk-resource-store';",
     "export * as fixturePreparation from '../../../safety/render-runtime/program-preparation';",
     "export * as fixtureShaderSource from '../../../safety/render-runtime/shader-source-budget';",
     "export * as fixtureSolar from '../../../safety/scene-solar-shadow';",
     "export * as fixtureSolarLayer from '../../../safety/scene-solar-shadow-layer';",
     "export * as fixtureGroup from '../../../safety/planar-reflection-group';",
     "export * as fixturePolicy from './current-paint-program';",
     "export * as fixtureDistant from './berlin-distant-paint';",
     "export * as fixtureUTF8 from '../../../safety/utf8-byte-length';"].join('\n');
    const bundled=await build({stdin:{contents:entry,resolveDir:safety,sourcefile:'fixtures-delegated-renderer-entry.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false,logLevel:'error',plugins:[nullCityDataProfilePlugin]});
    const m=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text+'\n//# sourceURL=fixtures-delegated-renderer-bundle.mjs').toString('base64'));
    return{m,bound,used};
   })();
   return modulesPromise;
  }};
 rendererSources.set(root,source);return source;
}
const own=rendererSource();
export const safety=own.safety,rendererText=own.text;
export const declaration=(name,filter)=>own.declaration(name,filter);
export const method=(name,filter)=>own.method(name,filter);

// Captures the context scheduler's setTimeout turns so a test advances the
// production scheduler deterministically (one tick per call when `one`). The
// scheduler slices a tick by wall time (2 ms) or 16 steps; while a captured tick
// runs, the clock it reads stands still, so every tick ends on its step limit or
// when no job can advance. Program owners read the clock only for measurements.
export function createTurnQueue(){
 const queue=[];
 const turn=work=>{const previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);try{return work();}finally{globalThis.setTimeout=previous;}};
 const still=work=>{const clock=performance.now(),own=Object.getOwnPropertyDescriptor(performance,'now');performance.now=()=>clock;try{return work();}finally{if(own)Object.defineProperty(performance,'now',own);else delete performance.now;}};
 const advance=(one=false)=>turn(()=>still(()=>{let steps=0;while(queue.length){assert(++steps<4000,'unbounded program preparation');queue.shift()();if(one)break;}return steps;}));
 return{queue,turn,advance};
}

/** Fake WebGL2 renderer context: real shader/program objects for the owner's
 * build/compile/link/validation turns, recorded draws/uniforms, constant enums. */
export function createRendererGL(){
 let serial=0;const enums={},state={lost:false,current:null,vao:null,array:null};
 const driver={fail:false,linked:[],programs:[],shaders:[],deleted:[],draws:[],uniforms:[],sources:new Map(),onBuild:undefined};
 const shaderOf=(program,type)=>program.shaderHistory.find(shader=>shader.type===type);
 const special={
  isContextLost:()=>state.lost,getExtension:()=>null,getError:()=>0,drawingBufferWidth:800,drawingBufferHeight:600,
  createShader:type=>{const shader={shader:++serial,type,attachments:new Set(),deleted:false};driver.shaders.push(shader);return shader;},
  shaderSource(shader,source){shader.source=source;},compileShader(){},getShaderInfoLog:()=>'',
  getShaderParameter:()=>true,
  createProgram:()=>{const program={program:true,id:'program#'+(++serial),shaders:[],shaderHistory:[],deleted:false};driver.programs.push(program);return program;},
  attachShader(program,shader){program.shaders.push(shader);program.shaderHistory.push(shader);shader.attachments.add(program);},
  detachShader(program,shader){const index=program.shaders.indexOf(shader);if(index>=0)program.shaders.splice(index,1);shader.attachments.delete(program);},
  bindAttribLocation(){},
  linkProgram(program){const fragment=shaderOf(program,enums.FRAGMENT_SHADER)?.source,vertex=shaderOf(program,enums.VERTEX_SHADER)?.source,origin=driver.sources.get(fragment);program.origin=origin;program.metadata=origin?.args;program.fragment=fragment;program.vertex=vertex;program.failed=typeof driver.fail==='function'?!!driver.fail(program):!!driver.fail;driver.linked.push(program);},
  getProgramParameter:program=>!program.failed,getProgramInfoLog:()=> 'fixture link failure',
  deleteShader(shader){shader.deleted=true;},deleteProgram(program){if(!program)return;program.deleted=true;driver.deleted.push(program);for(const shader of program.shaders)shader.attachments.delete(program);program.shaders.length=0;},
  useProgram(program){state.current=program;},bindVertexArray(vao){state.vao=vao;},bindBuffer(target,buffer){if(target===enums.ARRAY_BUFFER)state.array=buffer;},
  getUniformLocation:(_program,name)=>name,getUniformBlockIndex:()=>0xffffffff,
  uniform1f(name,value){driver.uniforms.push({program:state.current,name,value});},
  drawElements(_mode,count,_type,offset){driver.draws.push({program:state.current,count,offset,vao:state.vao});},
  getParameter(p){if(p===enums.CURRENT_PROGRAM)return state.current;if(p===enums.VERTEX_ARRAY_BINDING)return state.vao;if(p===enums.ARRAY_BUFFER_BINDING)return state.array;if(p===enums.DEPTH_WRITEMASK)return true;return null;},
  isEnabled:()=>false,
 };
 const gl=new Proxy({},{get(_target,key){if(key==='__state')return state;if(key==='__driver')return driver;if(key in special)return special[key];if(typeof key==='string'&&/^[A-Z0-9_]+$/.test(key))return enums[key]??=0x7000+(++serial);return()=>undefined;}});
 // Enum identities used above are allocated before any program exists.
 void gl.FRAGMENT_SHADER;void gl.VERTEX_SHADER;void gl.ARRAY_BUFFER;void gl.CURRENT_PROGRAM;void gl.VERTEX_ARRAY_BINDING;void gl.ARRAY_BUFFER_BINDING;void gl.DEPTH_WRITEMASK;
 return{gl,driver,state};
}

/** Fake WebGL2 capture context for the scene solar shadow's depth target. */
export function createCaptureGL(){
 let n=0x9000;const k={};let draw=null,read=null,g;
 const special={isContextLost:()=>false,createVertexArray:()=>({vao:++n}),checkFramebufferStatus:()=>g.FRAMEBUFFER_COMPLETE,createTexture:()=>({texture:++n}),createFramebuffer:()=>({framebuffer:++n}),isEnabled:()=>false,getError:()=>0,
  bindFramebuffer(t,fb){if(t===g.FRAMEBUFFER){draw=fb;read=fb;}else if(t===g.DRAW_FRAMEBUFFER)draw=fb;else if(t===g.READ_FRAMEBUFFER)read=fb;},
  getParameter(p){switch(p){case g.DRAW_FRAMEBUFFER_BINDING:return draw;case g.READ_FRAMEBUFFER_BINDING:return read;case g.VIEWPORT:case g.SCISSOR_BOX:return new Int32Array([0,0,800,600]);case g.MAX_TEXTURE_SIZE:return 4096;case g.MAX_COMBINED_TEXTURE_IMAGE_UNITS:return 32;case g.DEPTH_RANGE:return new Float32Array([0,1]);case g.COLOR_WRITEMASK:return[true,true,true,true];case g.ACTIVE_TEXTURE:return g.TEXTURE0;default:return null;}}};
 g=new Proxy({},{has:(_target,key)=>key in special,get(_target,key){if(key in special)return special[key];if(typeof key==='string'&&/^[A-Z0-9_]+$/.test(key))return k[key]??=++n;return()=>undefined;}});
 return g;
}

/** The renderer's default surface helper (its baseSurfaceFragment fallback). */
export const DEFAULT_HELPER='vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
const MiB=1024*1024;
const FLAGS=['hc70ProgramReady','hc70PantaleonGateProgramReady','hc70PantaleonAnnexProgramReady','hc70LudwigWorkshopProgramReady','hc70MesseturmCrownProgramReady','supplementBatch1Ready','f004645Available','f020Whole1679Available','f020Chapel1679Available','f269640Available','f285634Available','f235631Available','f244627Available','f244622Available','f244619Available','f358604Available','f238Body595Available','f358Normal579Available','f346562Available','f355Clip559Available'];

/** Fixture frozen scope: pins and disposal only; paint data is the fixture's. */
export function fixtureScope(){let pins=0,disposed=false;return{retain(){assert(!disposed,'retain of a disposed fixture scope');pins++;let done=false;return()=>{if(!done){done=true;pins--;}};},borrow(_ref,read){return read({});},assertSelection(){},prepare:async()=>{},prepareSelection:async()=>{},dispose(){disposed=true;},get stats(){return{resources:0,pending:0,pins,ownerReleased:false,disposed};}};}

/** One published chunk holding every component: live geometry and mask leases. */
function sceneChunk(S,components,gl){
 const indexCount=Math.max(0,...components.map(c=>c.end)),vertexCount=Math.max(0,...components.map(c=>c.lastVertex??0));
 const lease=(value)=>{const row={value,released:false,state:'ready',context:gl,epoch:0,retain(){const held={value,released:false,state:'ready',context:gl,retain:()=>row.retain(),release(){held.released=true;}};return held;},release(){}};return row;};
 const maskRows=()=>({residentRevision:S.maskRevision,prepare:()=>S.maskPrepare(),isResident:()=>S.maskResident(),withResidentMasks:(_gl,_program,draw)=>{draw();return true;}});
 const masks={...maskRows(),get residentRevision(){return S.maskRevision;},detaches:0,detach(){masks.detaches++;},destroy(){},retain(){return{...maskRows(),release(){}};}};
 const chunk={contentKey:'fixture-chunk',anchor:[0,0],unit:1,cpu:{value:{indices:new Uint32Array(indexCount)},release(){}},dynamic:{release(){}},stateData:new Float32Array(vertexCount),dirtyState:undefined,loaded:new Map(components.map(c=>[S.key(c),c])),masks,geometry:lease({vao:{vao:'fixture-chunk'},buffers:new Map([['state',{buffer:'fixture-state'}]])})};
 return chunk;
}

/**
 * The delegated500 renderer core of `root` with the given synthetic paint.
 *  paint: the city paint fragment (GLSL defining paintedFacade(base,p,normal,frame,family));
 *    the renderer's own fragment shell supplies main().
 *  partitions: optional legacy partition paints by catalogue key.
 * setScene(components,runs) then publishes one chunk: components are
 * [{objectId,partId,start,end,firstVertex,lastVertex,box}] in index order.
 */
export async function createDelegatedFixture({city='cologne',paint,partitions={},limitBytes=512*MiB,helper=undefined,root=web}={}){
 assert(typeof paint==='string'&&paint.includes('paintedFacade('),'fixture paint defines paintedFacade');
 const source=rendererSource(root),{m,bound}=await source.modules();
 const {gl,driver,state:glState}=createRendererGL(),turns=createTurnQueue();
 const budget=m.fixtureBudget.createResourceBudget({limitBytes,recentLimitBytes:Math.min(limitBytes,16*MiB)});m.fixtureChunks.bindChunkResourceContext(gl,m.fixtureChunks.createChunkResourceStore({budget}));
 const S={},events=[],counts={paint:0,repaints:0};
 const data={city,scope:fixtureScope(),signal:new AbortController().signal};
 const scoped=fn=>(...args)=>{const owner=S.committingPreparedData??S.residentPreparedData;if(!owner)throw Error('fixture data call requires prepared data');assert.equal(owner.scope.stats.disposed,false,'fixture data call on a live scope');return fn(...args);};
 const partitionPaint=key=>partitions[key]??paint;
 const owner=m.fixturePreparation.createProgramPreparationOwner('delegated500 '+city+' fixture',()=>S.map.triggerRepaint());
 // Every owner entry point runs inside a captured scheduler turn. Program builds
 // record the renderer call that requested them, the frame phase that requested
 // them (phase) and the phase their source build ran in (builtIn).
 let call;
 const programPreparation=new Proxy(owner,{get(target,key){
  const value=target[key];if(typeof value!=='function')return value;
  // Compiled-shader hygiene (restored, review fixtures-delegated#1 F1): every program the owner hands
  // out as ready has detached and deleted both of its shaders; a pending or failed compile throws first.
  if(key==='compile')return(context,recipe)=>{const origin=call,observe=build=>()=>{const sources=build();if(origin){origin.builtIn=S.phase;driver.sources.set(sources.fragment,origin);events.push(origin);driver.onBuild?.(origin,recipe,sources);}return sources;};
   // Source selection may replace build after admission; observe the builder
   // actually executed, preserving its budget and current-consumer guard.
   const program=turns.turn(()=>target.compile(context,{...recipe,build:observe(recipe.build),resolveSource:recipe.resolveSource?()=>{const selected=recipe.resolveSource();return selected?{...selected,build:observe(selected.build)}:selected;}:undefined}));
   if(program?.program===true){assert.deepEqual(program.shaders,[],'a ready program keeps no attached shader');assert.equal(program.shaderHistory.length,2,'a ready program linked exactly one vertex and one fragment shader');
    for(const shader of program.shaderHistory){assert.equal(shader.deleted,true,'each linked shader is deleted');assert.equal(shader.attachments.size,0,'each linked shader is detached');}}
   return program;};
  return(...args)=>turns.turn(()=>value.apply(target,args));
 }});
 Object.assign(S,Object.fromEntries(FLAGS.map(name=>[name,false])),{
  city,berlinCurrent:city==='berlin',gl,mobile:false,phase:'init',
  // facade paint data (fixture input) and the pure policy helpers it is read with
  facadePaintFragmentForCity:scoped(()=>{counts.paint++;return paint;}),paintProgramFragment:scoped(key=>partitionPaint(key)),paintProgramKey:scoped(()=> 'base'),
  facadePaintSpecializationForCity:scoped(currentCity=>({city:currentCity,specialized:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null})),
  describeFacadePaintSource:(currentCity,source,kind)=>{const bytes=m.fixtureUTF8.utf8ByteLength(source);return{city:currentCity,specialized:null,sourceKind:kind,fragmentBytes:bytes,fullFragmentBytes:kind==='full'?bytes:null};},
  describeFacadePaintSourceBounds:(currentCity,sourceKey,scope)=>{assert.equal(scope.stats.disposed,false);return m.fixtureShaderSource.shaderSourceBounds(m.fixtureShaderSource.shaderSourceText(sourceKey===undefined?paint:partitionPaint(sourceKey)),{authorityTrace:['fixtures-delegated/synthetic-paint',currentCity,sourceKey??'city']});},
  // renderer state
  destroyed:false,pageHidden:false,enabled:true,committingPreparedData:undefined,residentPreparedData:data,pendingGeometry:undefined,pendingMaterialBatches:undefined,residentLifecycleRevision:0,dataPreparationPending:undefined,batchPreparationFailure:undefined,
  materialRecipeRevision:1,materialSourceWorkRevision:1,materialSourceSettled:false,materialSourceFailure:undefined,cityPaintFragment:'',cityPaintFragmentBytes:0,cityPaintFragmentClaim:undefined,materialRebuildIdentities:undefined,progressiveShaderSpecialization:undefined,
  currentFamilyPrograms:city==='berlin',partitionEnabled:city==='berlin',legacySolarPartitions:false,exactRichProgramKeys:new Map(),sharedPaulLobeRichProgram:false,distantMaterialAvailable:false,distantQuality:new Map(),
  sourceBudgetWake:new AbortController(),paintBoundCache:new WeakMap(),colourAssemblyBounds:new WeakMap(),programSourcesRevision:undefined,programSourceUTF8Bytes:0,
  baseSurfaceFragment:helper,surfaceFragment:undefined,diffuseFragment:undefined,windowTexture:undefined,diffuseTexture:undefined,facadeAttached:false,landmarkVisible:false,residentTextureStyles:[],
  program:undefined,texturedProgram:undefined,diffuseProgram:undefined,textureShaderFailure:undefined,diffuseShaderFailure:undefined,textureShaderAttempted:false,diffuseShaderAttempted:false,
  partitionPrograms:new Map(),partitionFailures:new Map(),partitionRuns:[],partitionPending:false,currentVisibleProgramCount:0,currentProgramEvictions:0,currentInitialFragmentBytes:0,currentLastFragmentBytes:0,offscreenPaintRunsSkipped:0,partitionCompileAttempt:undefined,
  casterBase:new Map(),casterFailures:new Map(),casterAnalysisPending:new Set(),casterFamily0:undefined,drawFrame:0,casterCompileFrame:-1,casterRetry:false,casterRetryHeld:false,heldMainWaitKeys:new Set(),heldMainWaitFrame:-1,lastPartitionDrawKeys:new Set(),casterVisibleKnown:false,solarDepthHelper:undefined,solarDepthRevision:0,
  solarCaptureToken:undefined,reflectionCaptureToken:undefined,reflectionDemandPlanned:false,reflectionDemandKeys:new Set(),heldCaptureDemandKeys:new Set(),reflectionProgramFailures:new Map(),surfaceContentRevision:0,
  paintModeValue:2,paintOverrideValue:0,paintMode:()=>S.paintModeValue,paintOverride:()=>S.paintOverrideValue,opacity:1,opacityContext:'normal',progressiveDiagnostic:null,diagnostic557:false,finitePaintCompileTrace:false,compileStage557:undefined,seenDraw601:new Set(),diagnosticParams:new URLSearchParams(),
  sceneEnvironment:{sunlight:true,shadows:true,quality:'detail'},sceneSun:{shadowVector:[1,1],instantISO:'2026-06-21T10:00:00.000Z',direction:[.3,.8,.5]},
  generation:1,viewRevision:0,needsBirth:false,birth:new Map(),seenBirth:new Set(),BIRTH_LIMIT:20000,reducedMotion:false,selectedIdentity:undefined,selectionActive:true,clock:()=>0,
  anchor:[0,0],anchorUnit:1,materialAnchor:[0,0],materialUnit:1,matrix:undefined,mainWorldMatrix:undefined,mainFrame:0,mainGPUIncarnation:0,residentMainMasksReady:false,mainFrameWitness:undefined,pendingMainFrame:undefined,
  geometryPublishedRevision:1,mainDrawFailure:undefined,mainGeometryProgramFailure:undefined,geometryUploadFailure:undefined,geometryUploadPending:false,geometryUploadRevision:1,shadowUploadPending:false,gpuInitializationPrepared:true,
  shadowProgram:undefined,shadowUploadedIndexCount:0,shadowFailure:false,reusableVertex673:undefined,grantHandoffGeneration:undefined,grantHandoffPreparationToken:undefined,chunkStore:undefined,
  reflectionResidentRevision:0,maskRevision:'fixture-masks',maskPrepare:()=>({ready:true}),maskResident:()=>true,
  residentGeometry:{store:{contextEpoch:()=>0},scene:{get version(){return S.geometryPublishedRevision;}},
   // Geometry upload remains outside this fixture. Capture follows the real
   // scene contract: freeze the publication and retain each live chunk lease.
   capture(role){const version=S.geometryPublishedRevision;let held=[];try{for(const chunk of S.sceneChunks)held.push(chunk.geometry.retain(role));}catch(error){for(const lease of held)lease.release();throw error;}return{version,get leases(){return held;},release(){const previous=held;held=[];for(const lease of previous)lease.release();}};},
   release(){},contextLost(){}},
  rathausProxyMasks:{detach(){},residentRevision:'fixture-rathaus'},
  map:{repaints:0,triggerRepaint(){this.repaints++;counts.repaints++;S.repaint=true;},getCanvas:()=>({clientWidth:800,clientHeight:600})},repaint:false,frameNo:0,
  programPreparation,
 },Object.fromEntries(INERT.map(name=>[name,()=>{}])));
 for(const [local,imported] of bound)if(!(local in S))S[local]=m[imported];
 for(const name of Object.keys(m))if(!name.startsWith('fixture')&&!(name in S))S[name]=m[name];
 // Released geometry is republished by the (inert) upload stage; attaching a
 // context runs the production main-program preparation it would run first.
 S.residentGPU={attach(){if(S.sceneIndexCount()&&!S.gpuReady())S.prepareResidentMain();},emptyFrame:()=>false,released(){},published(){},isEmptyReady:()=>false,detach(){}};
 for(const [name,text] of source.sources){
  S[name.startsWith('method:')?name.slice(7):name]=evaluate(text,S);
  if(name==='createCasterPreparedSources')S.casterPreparedSources=S.createCasterPreparedSources();
 }
 // Record the arguments of every renderer compile call; the owner's build turn
 // attaches them to the linked program as metadata.
 const compile=S.compileGeometryProgram;
 S.compileGeometryProgram=(...args)=>{const previous=call;call={args,phase:S.phase,frame:S.frameNo,family:args[2]??0};try{return compile(...args);}finally{call=previous;}};
 const fixture={S,gl,glState,driver,events,counts,budget,owner,data,turns,m,source,
  advancePreparation:one=>turns.advance(one),
  // Synthetic one-chunk scene: components and their paint runs.
  setScene(rows,runs){const chunk=sceneChunk(S,rows,gl);S.sceneChunks=[chunk];S.sceneSpans=[{chunk,firstIndex:0,indexCount:chunk.cpu.value.indices.length,localFirstIndex:0}];S.loaded=new Map(rows.map(c=>[S.key(c),c]));S.indices=chunk.cpu.value.indices;S.vertices=new Float32Array(chunk.stateData.length*9);S.stateData=chunk.stateData;S.partitionRuns=runs;return chunk;},
  // Retry a renderer attempt across scheduler turns until it yields a value.
  until(attempt,turnsLimit=400){let last;for(let i=0;i<turnsLimit;i++){try{const value=attempt();if(value!==undefined&&value!==false)return value;}catch(error){if(!m.isProgramPreparationPending(error))throw error;last=error;}turns.advance();}throw Error('preparation did not settle: '+last);},
 };
 return fixture;
}
