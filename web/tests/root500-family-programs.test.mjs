import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build,transform}=require('esbuild');
async function production(relative){const result=await build({entryPoints:[path.join(web,relative)],bundle:true,write:false,format:'esm',platform:'node',target:'es2022'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=family-fixture-'+path.basename(relative)+'.mjs').toString('base64'));}
const visibility=await production('src/painted/delegated500/safety/paint-run-visibility.ts');
const {partitionProgramFamilies}=await production('src/safety/partition-program-groups.ts');
const {residentDrawRange}=await production('src/safety/render-runtime/resident-draw-range.ts');
const {createResidentTriangleDrawBatch}=await production('src/safety/render-runtime/resident-index-convention.ts');
const V=await production('src/painted/root500/safety/paint-run-visibility.ts'),U=await production('src/safety/utf8-byte-length.ts'),B=await production('src/safety/render-runtime/shader-source-budget.ts'),A=await production('src/safety/render-runtime/shader-assembly-budget.ts'),F=await production('src/safety/family-paint-program.ts'),P=await production('src/safety/render-runtime/program-preparation.ts'),S=await production('src/safety/solar-shadow-preparation.ts'),W=await production('src/safety/prepared-source.ts'),R=await production('src/painted/root500/safety/owner-shader-prune.ts'),{createFrozenDataScope}=await production('src/safety/frozen-data-scope.ts'),RB=await production('src/safety/render-runtime/resource-budget.ts');
const {sharedBremenPaintRecipeKey}=await production('src/painted/bremen/safety/shared-paint-recipe.ts');
const {sharedInfillEquivalentProgramFamilies}=await production('src/painted/infill/safety/infill-equivalent-program-families.ts');
const {BUILDING_SURFACE_FRAGMENT_GLSL:infillBaseHelper}=await production('src/painted/infill/safety/building-surface-style.ts');
const providers=['root500','infill','bremen'],texts=Object.fromEntries(await Promise.all(providers.map(async provider=>[provider,await readFile(path.join(web,'src/painted/'+provider+'/safety/building-mesh-renderer.ts'),'utf8')]))),asts=Object.fromEntries(providers.map(p=>[p,ts.createSourceFile('renderer.ts',texts[p],ts.ScriptTarget.Latest,true)]));
function binding(name,provider='root500'){const ast=asts[provider];let found;function visit(n){if((ts.isVariableDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert(found,name);return ts.isVariableDeclaration(found)?found.initializer.getText(ast):found.getText(ast).replace(/^export\s+/,'');}
async function evaluate(name,values){const compiled=await transform('('+binding(name,values.provider)+')',{loader:'ts',target:'es2022'});return Function('env','with(env){return '+compiled.code+'}')(new Proxy(values,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>(o[k]=v,true)}));}
const source='#version 300 es\nprecision highp float;out vec4 color;flat in float v_f;\nvec3 a(vec3 b){return b*.5;}vec3 b(vec3 v){discard;return v*.25;}vec3 paintedFacade(vec3 base,vec3 p,vec3 n,vec4 q,float family){if(family==1001.)return a(base);if(family==1002.)return b(base);return base;}\nvoid main(){color=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.,1.,0.),vec4(0.),v_f),1.);}';
async function actualPlanFactory(provider,facade){
 const source=await readFile(path.join(web,`src/painted/${provider}/safety/${provider}-prepared-program-plan.ts`),'utf8'),js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
 // Each value import of the actual plan module is mapped explicitly (no broad allow-list).
 const imports={'./facade-paint-fragment':facade,'../../../safety/prepared-source':W,'../../../safety/utf8-byte-length':U};
 Function('module','exports','require',js)(module,module.exports,name=>{assert(Object.hasOwn(imports,name),'Unexpected plan import '+name);return imports[name];});return module.exports[{root500:'createRoot500PreparedProgramPlan',infill:'createInfillPreparedProgramPlan',bremen:'createBremenPreparedProgramPlan'}[provider]];
}
function compilerOwner(v){const queue=[],recipes=[],sources=[],deleted=[];let sequence=0,fail=false;const gl=v.gl;
 Object.assign(gl,{VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,createShader:type=>({type}),shaderSource(shader,source){shader.source=source;sources.push(source);},compileShader(){},getShaderParameter:()=>!fail,getShaderInfoLog:()=> 'controlled compile error',createProgram:()=>({id:++sequence,shaders:[]}),attachShader(program,shader){program.shaders.push(shader);if(shader.type===1)program.vertex=shader.source;else program.fragment=shader.source;},detachShader(program,shader){program.shaders=program.shaders.filter(value=>value!==shader);},bindAttribLocation(){},linkProgram(program){program.failed=fail;},getExtension:()=>null,getProgramParameter:program=>!program.failed,getProgramInfoLog:()=> 'controlled link error',deleteShader(shader){shader.deleted=true;},deleteProgram(program){deleted.push(program);}});
 const turn=work=>{const previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);try{return work();}finally{globalThis.setTimeout=previous;}};
 const owner=P.createProgramPreparationOwner(v.provider+' family fixture',()=>{});
 v.programPreparation={compile(context,recipe){recipes.push(recipe);return turn(()=>owner.compile(context,recipe));},acquireReadyProgram:(context,recipe)=>owner.acquireReadyProgram(context,recipe),needsFrameAfter:(...args)=>owner.needsFrameAfter?.(...args),get budgetWaits(){return owner.budgetWaits??0;},work:(...args)=>turn(()=>owner.work(...args)),prune:()=>turn(()=>owner.prune()),cancel:()=>turn(()=>owner.cancel()),releaseProgram:(...args)=>turn(()=>owner.releaseProgram(...args)),dispose:()=>turn(()=>owner.dispose()),get stats(){return owner.stats;}};
 const drain=()=>turn(()=>{let steps=0;while(queue.length){assert(++steps<200,'unbounded actual program preparation');queue.shift()();}});
 return{owner,recipes,sources,deleted,drain,get createdPrograms(){return sequence;},set failure(value){fail=value;},linked(work){for(let frame=0;frame<30;frame++){try{return work();}catch(error){if(!P.isProgramPreparationPending(error))throw error;}drain();}assert.fail('actual plan/compiler did not settle');}};
}
async function fixture(provider='root500',shaderSource=source){
 const values={provider,programIdleRetirement:{reset(){},synchronize(){}},...F,...P,...S,...visibility,sceneSpans:[],viewRevision:0,mainGPUIncarnation:0,shaderSourceBoundPart:A.shaderSourceBoundPart,describeShaderAssemblyBounds:A.describeShaderAssemblyBounds,city:'bremen',legacyPartitionEnabled:false,partitionEnabled:true,cityPaintFragment:shaderSource,initialPaintFragment:shaderSource,VERTEX:'unchanged vertex',fragment:(_h,p)=>p,fragmentParts:(_h,p)=>B.shaderSourceParts`${p}`,pruneOwner6307Fragment:s=>s,withResidentReflectionClip:s=>s+'\n// reflection clip',gl:{isContextLost:()=>false,deleteProgram(){}},paintMode:()=>2,paintOverride:()=>0,baseSurfaceFragment:'helper',surfaceFragment:undefined,
  program:{id:'initial-family0'},vao:{},texturedProgram:undefined,diffuseProgram:undefined,windowTexture:undefined,diffuseTexture:undefined,facadeAttached:false,partitionPrograms:new Map(),partitionFailures:new Map(),partitionVisibleKeys:[],partitionRenderCount:0,partitionLastRenderAt:undefined,partitionPending:false,partitionRuns:[1001,1002].map((f,i)=>({key:F.familyPaintRecipeKey('base',[f]),firstIndex:i*3,indexCount:3})),indices:new Uint32Array(6),loaded:new Map([['a',{start:0,end:6,box:[0,0,0,1,1,1]}]]),anchor:[0,0],anchorUnit:1,candidateMainProjection:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),matrix:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),paintBoxOutsideClip:()=>false,paintRunIntersectsVisible:()=>true,offscreenPaintRunsSkipped:0,partitionCompileAttempt:undefined,map:{repaints:0,triggerRepaint(){this.repaints++;}},rathausProxyMasks:{withMasks:(_g,_p,draw)=>draw()},uniforms(){},solarProgramFailures:new Map(),solarProgramRevision:0,solarPreparationIndex:undefined,generation:1,needsBirth:false,birth:new Map(),destroyed:false,pageHidden:false,enabled:true,opacity:1,opacityContext:'normal',gpuReady:()=>true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]}};
 Object.assign(values,{partitionProgramFamilies,residentDrawRange,createResidentTriangleDrawBatch});
 if(provider==='root500'){
  values.keysByPaintRuns=new WeakMap();
  values.paintKeysForRuns=await evaluate('paintKeysForRuns',values);
 }
 if(provider==='bremen')values.sharedBremenPaintRecipeKey=sharedBremenPaintRecipeKey;
 values.scope=createFrozenDataScope({acquire(){throw Error('family fixture must not acquire model tables');}});values.sourceBuilds=0;values.sourceClears=0;values.committingScope=undefined;values.residentScope=values.scope;values.configuredDataScope=values.scope;values.currentDataScope=values.scope;values.pendingCandidate=undefined;values.programCoverageReady=true;values.geometryOwner={current:undefined,release(){},contextLost(){}};values.clearGeometryHandles=()=>{};values.releaseCandidatePrograms=()=>{};
 // The page ResourceBudget the renderer hands its prepared program plan (prepared.chunkInput.store.budget).
 values.budget=RB.createResourceBudget({limitBytes:256*1024**2,recentLimitBytes:0});
 // Capture demand state of the actual renderer: no capture kind is active until setCaptureDemand admits one.
 values.sceneIndexCount=()=>values.indices.length;
 values.captureDemands=new Map();values.heldCaptureDemandKeys=new Set();values.captureRuntime={invalidate(){}};
 const clearSources=scope=>{assert.equal(scope,values.scope);values.sourceClears++;};
 const facade={prepareRoot500ProgramData:async(_keys,_city,signal,scope)=>{signal.throwIfAborted();assert.equal(scope,values.scope);},paintProgramPartitionEnabled:()=>false,paintProgramFragment(_key,_city,scope){assert.equal(scope,values.scope);values.sourceBuilds++;return shaderSource;},facadePaintFragmentForCity(_city,scope){assert.equal(scope,values.scope);values.sourceBuilds++;return shaderSource;},facadePaintSpecializationForCity:()=>({}),clearRoot500PaintSources:clearSources,clearInfillPaintSources:clearSources,clearBremenPreparedProgramSources:clearSources};
 values.paintProgramPartitionEnabled=facade.paintProgramPartitionEnabled;values.paintProgramFragment=(key,city,scope)=>facade.paintProgramFragment(key,city,scope??values.committingScope??values.scope);values.facadePaintFragmentForCity=(city,scope)=>facade.facadePaintFragmentForCity(city,scope??values.committingScope??values.scope);values.facadePaintSpecializationForCity=facade.facadePaintSpecializationForCity;values.clearRoot500PaintSources=scope=>{assert.equal(scope,values.scope);values.sourceClears++;};
 // Program-source admission bounds of the synthetic fragment, from the actual shader source budget.
 facade.describeFacadePaintSourceBounds=(currentCity,sourceKey,scope)=>{assert.equal(scope,values.scope);return B.shaderSourceBounds(B.shaderSourceText(shaderSource,['root500-family-programs/synthetic-paint',currentCity,sourceKey??'city']));};
 // Specialization description of the built source, as the actual facade module computes it.
 facade.describeFacadePaintSource=(currentCity,built,kind,scope)=>{assert.equal(scope,values.scope);const bytes=U.utf8ByteLength(built);return{...facade.facadePaintSpecializationForCity(currentCity,scope),sourceKind:kind,fragmentBytes:bytes,fullFragmentBytes:kind==='full'?bytes:null};};
 // The immutable program-source authority each actual plan names in its recipe provenance.
 facade.ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY=facade.INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY=facade.BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY=P.createProgramSourceAuthority({inputs:['root500-family-programs fixture',provider],builders:[facade.paintProgramPartitionEnabled,facade.paintProgramFragment,facade.facadePaintFragmentForCity]});
 const createPlan=await actualPlanFactory(provider,facade);
 if(provider==='root500'){values.createRoot500PreparedProgramPlan=createPlan;values.publishedProgramPlan=createPlan({identity:'fixture-root-plan',scope:values.scope,city:values.city,budget:values.budget});values.publishedProgramPlan.prepareMetadata();values.withPlan=await evaluate('withPlan',values);}else if(provider==='infill'){values.createInfillPreparedProgramPlan=createPlan;values.residentProgramPlan=createPlan({id:1,scope:values.scope,city:values.city,budget:values.budget});values.residentProgramPlan.prepareMetadata();}else{values.residentProgramPlan=createPlan({budget:values.budget,scope:values.scope,city:values.city,generation:1,revision:1,profileInputs:[],sourceInputs:[],materialInputs:[]});values.programPlanScope=await evaluate('programPlanScope',values);}
 if(provider==='infill'){values.sharedInfillEquivalentProgramFamilies=sharedInfillEquivalentProgramFamilies;values.LOW_OFFICE_PROGRAM_FAMILIES=await evaluate('LOW_OFFICE_PROGRAM_FAMILIES',values);values.sharedInfillProgramFamilies=await evaluate('sharedInfillProgramFamilies',values);}
 // Module-level program constants of the actual renderer (colour attributes and the colour assembly authority over the bound builders).
 for(const name of ['COLOUR_ATTRIBUTES','COLOUR_PROGRAM_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY'])if(new RegExp('\\bconst '+name+'=').test(texts[provider]))values[name]=await evaluate(name,values);
 for(const name of ['legacyProgramKey','overrideSourceKey','activeFamilyKey','familySource','pruneFamilySource','releaseSolarPrograms','solarPreparationKeys','solarResidentKeys','trimSolarPrograms','solarProgramDemandActive','clearProgramSources','clearSettledProgramSources','reconcileProgramDemand','geometryProgramDemand','residentCaptureState',
  // Current helpers the bound declarations call (prepared program recipes, chunk paint runs, resident main preparation, capture demand).
  'geometryProgramRecipe','mainPaintRuns','prepareResidentMain','reconcileCaptureDemand','retireInactiveCaptureRoles'])values[name]=await evaluate(name,values);
 if(provider==='bremen'){for(const name of ['multiply','mainVisibilityCache','mainProgramRevisitEligible','releaseOwnedProgram','releaseInactivePaintProgram'])values[name]=await evaluate(name,values);const canvas={width:512,height:512};values.map.getCanvas=()=>canvas;values.window={devicePixelRatio:1};values.mainGPUIncarnation=0;values.viewRevision=0;}
 // Declared by root500 and infill only (Bremen has no separate main-draw invalidation or recipe-consumer pruning).
 // Root500/infill coordinate geometry recipes per prepared plan; the consumer table starts empty like the renderer's.
 if(texts[provider].includes('const geometryRecipeConsumers=')){values.geometryRecipeConsumers=new WeakMap();values.transientGeometryDemand=undefined;}
 for(const name of ['geometryProgramConsumer','prepareCapturePrograms','invalidateMainDraw','pruneGeometryRecipeConsumers','coordinateGeometryRecipe','rememberGeometryRecipe','liveGeometryRecipe','sameGeometryRecipe','retainedPaintKeys','mainPaintKeys','capturePaintKeys','forgetCaptureRole','mainMaterialKeys','captureMaterialKeys','pruneCandidateCaptureRoles','setCaptureDemand'])if(texts[provider].includes('function '+name+'(')&&!(name in values))values[name]=await evaluate(name,values);
 return values;
}

test('Bremen exact pending recipe updates live main/capture priority without another compile call',async()=>{
 const v=await fixture('bremen'),key=F.familyPaintRecipeKey('base',[1001]);v.partitionRuns=[];v.pendingCandidate={plan:v.residentProgramPlan,scope:v.scope,requiredKeys:new Set([key]),requiredCaptureKeys:new Set([key])};
 try{const recipe=v.geometryProgramRecipe('helper','base',false,false,[1001]);assert.equal(recipe.priority,'visible');assert.equal(recipe.currentPriority(),'visible');assert.equal(recipe.current(),true);v.pendingCandidate.requiredKeys.clear();assert.equal(recipe.currentPriority(),'capture');assert.equal(recipe.current(),true,'the unchanged capture still owns this exact source recipe');v.pendingCandidate.requiredKeys.add(key);assert.equal(recipe.currentPriority(),'visible');}finally{v.residentProgramPlan.release();v.scope.release();}
});
// Retain the former finite GLSL control-flow oracle on the actual shared colour
// recipe. This checks source semantics, not GPU acceptance or rasterization.
function materialCoverageShader(output,prune){return`#version 300 es
precision highp float;uniform float mode;uniform float hole;out vec4 ${output};
vec3 paintedFacade(vec3 base,float family){return base;}
${prune?'vec3 fpSurfaceOnly(vec3 base){return fpGlassFacade(base,0.,0.,30.,30.,1.);}\nvec3 fpLayoutFacade(vec3 base){return fpSurfaceOnly(base);}':''}
vec4 material(){if(hole>.5){gl_FragDepth=.12;discard;}return vec4(.2,.3,.4,1.);}
void main(){paintedFacade(vec3(.5),0.);gl_FragDepth=.45;if(mode<.5){${output}=vec4(.1);gl_FragDepth=.31;return;}${output}=material();if(mode>1.5){if(${output}[0]<.25)discard;}gl_FragDepth=${output}[1];${output}=vec4(.6,.7,.8,1.);}
`;}
function executeMaterialCoverage(source,{mode,hole}){
 const functions=source.slice(source.indexOf('vec4 material'))
  .replace(/\bvoid\s+(\w+)\s*\(\s*(?:void)?\s*\)/g,'function $1()')
  .replace(/\bvec4\s+(\w+)\s*\(\s*\)/g,'function $1()')
  .replace(/\b(?:float|vec4)\s+(\w+)\s*=/g,'let $1=')
  .replace(/\bdiscard\s*;/g,"throw 'discard';");
 const vector=(...v)=>v.length===1?[v[0],v[0],v[0],v[0]]:v;
 return new Function('mode','hole','vec3','vec4','paintedFacade',`let color,colour,gl_FragDepth=.5;try{${functions}\n;main();return {discard:false,depth:gl_FragDepth,color:${source.includes('out vec4 colour;')?'colour':'color'}};}catch(e){if(e==='discard')return{discard:true};throw e;}`)(mode,hole,vector,vector,base=>base);
}
// Family program recipes live only while a consumer demands them (root500/infill
// geometryProgramDemand, Bremen geometryProgramConsumer): a candidate names the exact visible main
// and capture recipe keys it requires, and an undemanded recipe is cancelled, never built.
function wantRecipes(v,{main=[],capture=[]}){const key=([sourceKey,families])=>F.familyPaintRecipeKey(sourceKey,[...new Set(families)].sort((a,b)=>a-b)),mainKeys=new Set(main.map(key)),captureKeys=new Set(capture.map(key));Object.assign(v.pendingCandidate,{requiredMainKeys:mainKeys,requiredKeys:mainKeys,requiredCaptureKeys:captureKeys});}
for(const provider of providers){
test(provider+': ' + 'real compiler defers source construction and shares the exact colour recipe with depth-only capture',async()=>{
 const v=await fixture(provider),metadataClears=v.sourceClears;
 // The resident's second family is an actual offscreen caster. Candidate-only
 // capture declarations cannot override a still-visible resident main role.
 Object.assign(v,V,{matrix:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),loaded:new Map([['visible',{start:0,end:3,box:[0,0,0,1,1,1]}],['offscreen',{start:3,end:6,box:[5,0,0,6,1,1]}]])});
 assert.deepEqual([...v.mainPaintKeys()],[F.familyPaintRecipeKey('base',[1001])]);
 v.pendingCandidate={plan:v.publishedProgramPlan??v.residentProgramPlan,scope:v.scope,closed:false};wantRecipes(v,{main:[['base',[1001]]],capture:[['base',[1002]],['other-source',[1002]],['base',[1002.25]]]});const driver=compilerOwner(v),compile=await evaluate('compileGeometryProgram',v);
 assert.throws(()=>compile('helper'),P.ProgramPreparationPending);assert.equal(v.sourceBuilds,0,'the real plan cannot emit source before context admission');assert.equal(driver.recipes[0].priority,'visible');driver.drain();const initial=driver.linked(()=>compile('helper'));assert(!initial.fragment.includes('vec3 a(')&&!initial.fragment.includes('vec3 b('));assert(initial.fragment.includes(source.slice(source.indexOf('void main()'))));assert.equal(initial.vertex,v.VERTEX);
 const colour=driver.linked(()=>compile('helper','base',false,false,[1001]));assert(colour.fragment.includes('vec3 a('));assert(!colour.fragment.includes('vec3 b('));
 const depth=driver.linked(()=>compile('helper','base',false,true,[1002]));assert(depth.fragment.includes('discard;'));assert(depth.fragment.includes(source.slice(source.indexOf('void main()'))));assert(driver.recipes.some(recipe=>recipe.priority==='capture'));
 if(provider==='bremen'){assert.equal(v.geometryProgramRecipe('helper','base',false,true,[1001]).currentPriority(),'visible','depth polling retains visible priority for the current main family');assert.equal(v.geometryProgramRecipe('helper','base',false,true,[1002]).currentPriority(),'capture','only the offscreen caster is capture-only');}
 const unique=[...new Set(driver.recipes.map(r=>r.resource))],resourceOf=(sourceKey,families)=>provider==='bremen'?JSON.stringify([v.city,'colour',sourceKey,families]):v.city+':colour:'+sourceKey+':'+families.join(',');assert.equal(unique[0],resourceOf('base',[0]));assert.equal(unique[1],resourceOf('base',[1001]));assert.equal(unique[2],resourceOf('base',[1002]));assert.equal(v.sourceBuilds,1,'all families use one admitted pre-family working set');assert.equal(v.sourceClears-metadataClears,1,'the assembled working set does not retain a duplicate facade-builder source');assert.equal(driver.owner.stats.pending,0);
 const shared=driver.linked(()=>compile('helper','base',false,true,[1001]));assert.equal(shared,colour);assert.equal(v.sourceBuilds,1,'capture reuses the already linked colour source');
 assert.equal(driver.createdPrograms,3,'initial, family 1001 and family 1002 each create one executable');
 v.programPreparation.releaseProgram(v.gl,colour);assert(!driver.deleted.includes(shared),'one independently granted reference remains');v.programPreparation.releaseProgram(v.gl,shared);assert.equal(driver.deleted.filter(p=>p===shared).length,1);
 // A helper other than the base surface fragment is a material recipe: root500/infill demand it
 // only for a candidate that wants its main texture in material paint mode (Bremen by its material keys).
 const materialMode=v.paintMode;if(provider!=='bremen'){v.pendingCandidate.mainTextureWanted=true;v.paintMode=()=>1;}
 const helperVariant=driver.linked(()=>compile('different helper','base',false,true,[1002]));v.paintMode=materialMode;const sourceVariant=driver.linked(()=>compile('helper','other-source',false,true,[1002])),pruneVariant=driver.linked(()=>compile('helper','base',true,true,[1002]));
 assert.notEqual(helperVariant,depth);assert.notEqual(sourceVariant,depth);assert.notEqual(pruneVariant,depth);assert(driver.recipes.every(recipe=>recipe.sharedKey));
 const originalVertex=v.VERTEX;v.VERTEX='different position/growth vertex';const vertexVariant=driver.linked(()=>compile('helper','base',false,true,[1002]));assert.notEqual(vertexVariant,depth);assert.equal(vertexVariant.vertex,v.VERTEX);v.VERTEX=originalVertex;
 const overrideVariant=driver.linked(()=>compile('helper','base',false,true,[1002.25]));assert.notEqual(overrideVariant,depth,'different Float32 override families cannot borrow the original recipe');
 driver.owner.dispose();v.scope.release();
});
test(provider+': shared colour/depth recipe preserves holes, output-read discard, early return and fragment depth',async()=>{
 for(const output of ['color','colour'])for(const prune of [false,true]){
  const original=materialCoverageShader(output,prune),v=await fixture(provider,original);v.pruneOwner6307Fragment=R.pruneOwner6307Fragment;v.pendingCandidate={plan:v.publishedProgramPlan??v.residentProgramPlan,scope:v.scope,closed:false};const driver=compilerOwner(v),compile=await evaluate('compileGeometryProgram',v);
  const colour=driver.linked(()=>compile('helper','base',prune,false,[0])),solar=driver.linked(()=>compile('helper','base',prune,true,[0]));
  assert.equal(solar,colour);assert.equal(driver.createdPrograms,1,'main and depth-only capture create one actual program');
  assert.doesNotMatch(colour.fragment,/\b(?:fpSurfaceOnly|fpLayoutFacade|fpGlassFacade)\s*\(/,'dead missing facade calls cannot enter the submitted program');
  assert.equal(colour.fragment.slice(colour.fragment.indexOf('void main()'),colour.fragment.indexOf('\n// reflection clip')),original.slice(original.indexOf('void main()')));
  for(const mode of [0,1,2])for(const hole of [0,1])assert.deepEqual(executeMaterialCoverage(solar.fragment,{mode,hole}),executeMaterialCoverage(original,{mode,hole}),`mode ${mode}, hole ${hole}`);
  assert.equal(executeMaterialCoverage(solar.fragment,{mode:1,hole:1}).discard,true,'material holes remain discarded');
  assert.equal(executeMaterialCoverage(solar.fragment,{mode:2,hole:0}).discard,true,'colour-output reads can still discard');
  assert.equal(executeMaterialCoverage(solar.fragment,{mode:0,hole:1}).depth,.31,'early return retains its original depth write');
  assert.equal(executeMaterialCoverage(solar.fragment,{mode:1,hole:0}).depth,.3,'output-dependent fragment depth is unchanged');
  driver.owner.dispose();v.scope.release();
 }
});
test(provider+': partial frames draw only exact resident family programs and complete frames keep draw order',async()=>{
 // Visible family programs are prepared by the resident/candidate main preparation
 // (prepareMainPrograms); the actual draw closure only consumes them and never compiles.
 const v=await fixture(provider),draws=[];v.pruneFamilySource=()=>false;v.gl.drawElements=(_m,count,_t,offset)=>draws.push({p:v.selected,count,offset});v.uniforms=p=>{v.selected=p;};v.compileGeometryProgram=()=>assert.fail('the draw closure never compiles');
 const residentMasks=new Set();
 v.mainPrepared=false;
 v.sceneSpans=[{firstIndex:0,indexCount:6,chunk:{
  cpu:{value:{}},geometry:{value:{vao:v.vao}},masks:{isResident:(context,program)=>context===v.gl&&residentMasks.has(program)},
 }}];
 v.drawSceneRange=(batch,_program,first,count)=>{batch.draw(v.vao,count,first*4);return true;};
 v.drawBremenSceneRange=(_program,first,count)=>{v.gl.drawElements(v.gl.TRIANGLES,count,v.gl.UNSIGNED_INT,first*4);return true;};
 const draw=await evaluate('draw',v),[first,second]=v.partitionRuns.map(run=>v.activeFamilyKey(run.key));
 draw();assert(v.partitionPending);assert.equal(draws.length,0);
 const ready={id:'family:1001'};
 v.partitionPrograms.set(first,ready);
 draw();assert(v.partitionPending);assert.equal(draws.length,0,'an exact program requires its resident mask');
 residentMasks.add(ready);
 draw();assert(v.partitionPending,'a missing family keeps the frame incomplete');
 assert.deepEqual(draws.map(d=>[d.p.id,d.count,d.offset]),[['family:1001',3,0]]);
 const next={id:'family:1002'};
 v.partitionPrograms.set(second,next);residentMasks.add(next);v.mainPrepared=true;draws.length=0;
 draw();assert(!v.partitionPending);assert.deepEqual(draws.map(d=>[d.p.id,d.count,d.offset]),[['family:1001',3,0],['family:1002',3,12]]);assert(!draws.some(d=>d.p===v.program));
});
test(provider+': ' + 'pending and failed family programs remain explicit and cannot enter complete capture',async()=>{
 const v=await fixture(provider);compilerOwner(v);v.pruneFamilySource=()=>false;const prepareMain=await evaluate('prepareMainPrograms',v),required=new Set(v.partitionRuns.map(run=>v.activeFamilyKey(run.key)));let compiles=0;
 const plan=v.publishedProgramPlan??v.residentProgramPlan,masks={prepare:()=>assert.fail('masks wait for every visible family'),isResident:()=>false};
 // The actual main preparation for this provider: root500/infill take a request with an explicit
 // failure table; Bremen prepares a candidate's complete visible set and throws a hard failure.
 const candidate={plan,program:{id:'base'}};if(provider==='bremen'){v.candidateMainProjection=new Float64Array(16);v.candidateMainViewStamp=()=>'family-fixture';v.residentMaterialStyles=[];v.landmarkVisible=false;}
 const prepare=()=>provider==='bremen'?prepareMain(candidate,v.gl,()=>true):prepareMain({role:'resident',plan,roles:{base:{id:'base'},colours:v.partitionPrograms,textureWanted:false},required,masks,context:v.gl,revision:1,stamp:'family-fixture',markPrepared(){},current:()=>true,failures:v.partitionFailures});
 const colours=()=>provider==='bremen'?candidate.colourPrograms:v.partitionPrograms;
 v.compileGeometryProgram=()=>{compiles++;throw new P.ProgramPreparationPending();};assert.equal(prepare(),false);assert.equal(compiles,required.size,'one poll registers the complete visible family demand');assert.equal(colours().size,0);assert.equal(v.partitionFailures.size,0);assert(v.residentCaptureState(1).runs.every(r=>r.program===undefined));
 const original=console.error;console.error=()=>{};try{v.compileGeometryProgram=()=>{compiles++;throw Error('controlled family failure');};
  if(provider==='bremen'){assert.throws(prepare,/controlled family failure/);assert.equal(v.partitionCompileAttempt.state,'failed');assert.match(v.partitionCompileAttempt.error,/controlled family failure/);}
  else{const before=compiles;assert.equal(prepare(),false);assert.equal(v.partitionFailures.size,required.size,'each failed visible family is recorded explicitly');assert.equal(compiles-before,required.size);assert.equal(prepare(),false,'a recorded failure keeps the main frame incomplete');assert.equal(compiles-before,required.size,'a recorded failure is not recompiled every poll');}
 }finally{console.error=original;}
 assert.equal(colours().size,0);assert(v.residentCaptureState(1).runs.every(r=>r.program===undefined),'neither pending nor failed families enter complete capture');
});
test(provider+': colour and solar capture share one resident cache, including offscreen casters protected from viewport trim',async()=>{
 const v=await fixture(provider),driver=compilerOwner(v);v.pruneFamilySource=()=>false;v.compileGeometryProgram=await evaluate('compileGeometryProgram',v);
 // Actual cache/clip consumers require actual disjoint geometry, rather than a
 // replaced outer helper that the shared visibility module never calls.
 Object.assign(v,V,{loaded:new Map([['visible',{start:0,end:3,box:[0,0,0,1,1,1]}],['offscreen',{start:3,end:6,box:[5,0,0,6,1,1]}]])});
 const [firstKey,secondKey]=v.partitionRuns.map(run=>v.activeFamilyKey(run.key)),visibleRecipe=v.familySource(firstKey);
 // The resident main preparation installs the visible family into the shared resident cache.
 const visible=driver.linked(()=>v.compileGeometryProgram('helper',visibleRecipe.sourceKey,false,false,visibleRecipe.families));v.partitionPrograms.set(firstKey,visible);assert(!v.partitionPrograms.has(secondKey));
 // Solar capture is admitted explicitly; its casters are the complete resident runs, visible or not.
 v.setCaptureDemand({kind:'solar',token:'family-fixture-solar',active:true});
 const prepare=await evaluate('prepareSolarPrograms',v);let state;for(let frame=0;frame<30;frame++){state=prepare();assert(!v.partitionPending,'capture warmup is not a main draw gate');if(state.status==='ready')break;driver.drain();}assert.equal(state.status,'ready');assert.equal(v.partitionPrograms.get(firstKey),visible,'capture reuses the visible colour program');const offscreen=v.partitionPrograms.get(secondKey);assert(offscreen);assert(offscreen.fragment.includes('discard;'));
 const capture=v.residentCaptureState(1);assert.deepEqual(capture.runs.map(r=>r.program),[visible,offscreen]);assert.deepEqual(capture.runs.map(r=>[r.firstIndex,r.indexCount]),[[0,3],[3,3]]);assert(driver.recipes.some(recipe=>recipe.priority==='capture'));
 // The offscreen caster is outside main demand; reconciliation keeps it while solar capture demands it.
 v.reconcileCaptureDemand();assert.equal(v.partitionPrograms.get(secondKey),offscreen,'viewport-only demand must keep the full resident capture demand');assert(!driver.deleted.includes(offscreen));assert.equal(v.residentCaptureState(1).runs[1].program,offscreen);
 // Ending the solar demand retires exactly the capture-only caster; the visible program stays.
 v.setCaptureDemand({kind:'solar',token:'family-fixture-solar',active:false});assert(!v.partitionPrograms.has(secondKey));assert.equal(driver.deleted.filter(p=>p===offscreen).length,1);assert.equal(v.partitionPrograms.get(firstKey),visible);assert(!driver.deleted.includes(visible));
 driver.owner.dispose();v.scope.release();
});
test(provider+': capture pending and failure are explicit, and a later colour publication clears obsolete capture failure',async()=>{
 const v=await fixture(provider),driver=compilerOwner(v);v.setCaptureDemand({kind:'solar',token:'family-fixture-solar',active:true});v.compileGeometryProgram=()=>{throw new P.ProgramPreparationPending();};const prepare=await evaluate('prepareSolarPrograms',v);assert.equal(prepare().status,'pending');assert.equal(v.solarProgramFailures.size,0);
 v.compileGeometryProgram=()=>{throw Error('controlled capture compile failure');};assert.equal(prepare().status,'failed');assert(v.solarProgramFailures.size>0,'the capture failure is recorded explicitly');assert.equal(v.partitionFailures.size,0,'capture failure is not a main colour failure');
 const programs=v.partitionRuns.map((run,i)=>({run,program:{id:'recovered:'+i}}));for(const {run,program}of programs)v.partitionPrograms.set(run.key,program);assert.equal(prepare().status,'ready');assert.equal(v.solarProgramFailures.size,0);assert.deepEqual(v.residentCaptureState(1).runs.map(r=>r.program),programs.map(r=>r.program));driver.owner.dispose();v.scope.release();
});
test(provider+': ' + 'initialization pending preserves demand so the next lifecycle attach can resume it',async()=>{
 const v=await fixture(provider),driver=compilerOwner(v);v.program=undefined;v.vao=undefined;v.gl.createVertexArray=()=>({});v.pendingCandidate=undefined;v.pumpCandidate=()=>{};v.prepareCandidate=()=>{};let releases=0;v.releaseGPU=()=>{releases++;};v.compileGeometryProgram=()=>{throw new P.ProgramPreparationPending();};
 if(provider!=='bremen'){
  // Root500/infill initialize through the actual resident main preparation once the first render
  // supplied its main matrix; only its geometry/mask collaborators are fixture values here.
  Object.assign(v,{candidateMainMatrix:new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),anchorUnit:1,anchor:[0,0],multiply:(a,b)=>Float64Array.from({length:16},(_,i)=>{const r=i%4,c=(i-r)/4;let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];return s;}),mainMaskChunks:()=>[],chunkMainMasks:()=>({prepare:()=>assert.fail('masks wait for programs'),isResident:()=>false}),mainPreparationStamp:()=>'family-fixture',syncFacadeResources(){},mainGPUIncarnation:0,geometryUploadRevision:0,residentMaterialStyles:[],landmarkVisible:false,residentMainPreparedStamp:undefined,contextRecoveryPending:false,geometryResidentUploaded:false,geometryUploadPending:false});v.prepareMainPrograms=await evaluate('prepareMainPrograms',v);v.prepareResidentMain=await evaluate('prepareResidentMain',v);
 }else{
  // Bremen now retains real main demand while attachment is pending. Exercise
  // that actual resident preparation chain, including its production stamp
  // and complete family registration, rather than returning before it starts.
  Object.assign(v,{residentResetRevision:0,residentMaterialStyles:[],landmarkVisible:false,residentMainPreparedStamp:undefined,residentMainFailureStamp:undefined,geometryUploadRevision:0,geometryUploadPending:false,sceneChunks:[]});
  for(const name of ['candidateMainViewStamp','prepareBremenMasks','prepareMainPrograms','prepareResidentMain'])v[name]=await evaluate(name,v);
 }
 const init=await evaluate('initializeResidentGPU',v);init(v.gl,true);init(v.gl,true);assert.equal(releases,0);assert.equal(v.mainGeometryProgramFailure,undefined);assert.equal(v.map.repaints,2);
 assert.equal(v.partitionPending,true,'pending main preparation keeps the frame pending');assert.equal(v.residentMainFailure,undefined);assert.equal(v.program,undefined);driver.owner.dispose();v.scope.release();
});
test(provider+': release cancels demand and releases each actual shared grant exactly once',async()=>{
 const v=await fixture(provider),driver=compilerOwner(v),compile=await evaluate('compileGeometryProgram',v),cancel=v.programPreparation.cancel;let cancelled=0;v.programPreparation.cancel=()=>{cancelled++;cancel();};v.captureRuntime={invalidate(){}};v.residentGPU={released(){}};v.rathausProxyMasks.detach=()=>{};v.releaseShadowGPU=()=>{};v.invalidateMatrix=()=>{};
 // Chunk-scene geometry owners and grant handoffs are released beside the programs; they are empty
 // fixture owners here, so only the program/demand release is observed.
 let geometryReleases=0;Object.assign(v,{sceneChunks:[],staticGeometryOwner:{release(){geometryReleases++;},contextLost:()=>assert.fail('context is live')},geometryOwner:{release(){geometryReleases++;},contextLost:()=>assert.fail('context is live')},clearProgramGrantHandoff(){},candidateGrantHandoff:new Map(),mainGPUIncarnation:0,candidateMainViewRevision:0,viewRevision:0});if(texts[provider].includes('releaseOwnedProgram='))v.releaseOwnedProgram=await evaluate('releaseOwnedProgram',v);
 v.program=driver.linked(()=>compile('helper','base',false,false,[0]));const shared=driver.linked(()=>compile('helper','base',false,true,[0]));assert.equal(shared,v.program);v.partitionPrograms.set('shared-zero',shared);const family=driver.linked(()=>compile('helper','base',false,true,[1001]));v.partitionPrograms.set(v.partitionRuns[0].key,family);const owned=new Set([v.program,...v.partitionPrograms.values()]);
 (await evaluate('releaseGPU',v))();assert.equal(cancelled,1);assert(geometryReleases>0,'geometry owners are released with the programs');assert.equal(v.captureDemands.size,0,'release cancels capture demand');assert.equal(v.partitionPrograms.size,0);assert.equal(v.solarProgramFailures.size,0);for(const p of owned)assert.equal(driver.deleted.filter(x=>x===p).length,1);assert.equal(driver.owner.stats.shared.heldReferences,0);driver.owner.dispose();for(const p of owned)assert.equal(driver.deleted.filter(x=>x===p).length,1);v.scope.release();
});
}
test('bounded actual root500 material recipes retain main and remove the initial city-sized closure',{skip:!process.env.CRIMEMAPS_FAMILY_SHADER_SITES},async t=>{
 const {createCityFrozenProfile}=await production('src/safety/city-frozen-profile.ts'),manifest=JSON.parse(await readFile(path.join(web,'src/safety/frozen-paint-table-manifest.json'),'utf8')),dependencies=JSON.parse(await readFile(path.join(web,'src/safety/frozen-paint-table-dependencies.json'),'utf8'));
 for(const provider of providers)for(const city of provider==='root500'?['berlin','hamburg','bremen']:provider==='infill'?['frankfurt']:['bremen']){
  const site=path.join(process.env.CRIMEMAPS_FAMILY_SHADER_SITES,'crimemaps-'+city[0].toUpperCase()+city.slice(1)),profile=JSON.parse(await readFile(path.join(site,'city-data-profile.json'),'utf8')),cp=createCityFrozenProfile(manifest,dependencies,profile,city),descriptors=new Map(cp.descriptors.map(d=>[d.sha256,d]));let bytesRead=0;
  globalThis.__familyShaderRowCounts=(...args)=>cp.rowCounts(...args);
  globalThis.__familyShaderRead=async(sha,file,occurrence=0)=>{const resolved=cp.resolve(sha,file,occurrence),d=descriptors.get(resolved);assert(d,'missing descriptor '+provider+':'+file+':'+resolved);const physical=d.transport??d;assert((bytesRead+=physical.bytes)<64*1024**2,'bounded input read');const input=await readFile(path.join(site,physical.path));assert.equal(input.length,physical.bytes);assert.equal(createHash('sha256').update(input).digest('hex'),physical.sha256);const raw=d.transport?gunzipSync(input):input;assert.equal(raw.length,d.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),d.sha256);return JSON.parse(raw);};
  const sourceDir=path.join(web,'src/painted/'+provider+'/safety'),entries=[['facade-paint-fragment.ts','*'],['facade-opening-primitives.ts','FACADE_OPENING_GLSL'],['facade-layouts.ts','FACADE_LAYOUT_GLSL'],['facade-rathaus-proxy-mask.ts','RATHAUS_PROXY_MASK_GLSL'],['source-partial-gate-display.ts','PARTIAL_GATE_MASK_GLSL'],['s402-connector-display.ts','S402_CONNECTOR_MASK_GLSL'],['s036-north-coface-display.ts','S036_ROOF009_MASK_GLSL'],['building-surface-style.ts','BUILDING_SURFACE_FRAGMENT_GLSL'],['owner-shader-prune.ts','pruneOwner6307Fragment']],entry=entries.map(([file,names])=>'export '+(names==='*'?'*':'{'+names+'}')+' from '+JSON.stringify(path.join(sourceDir,file))+';').join('\n')+'\nexport {SCENE_SURFACE_LIGHT_GLSL} from '+JSON.stringify(path.join(web,'src/safety/scene-surface-light.ts'))+';\nexport {withResidentReflectionClip} from '+JSON.stringify(path.join(web,'src/safety/resident-planar-reflection.ts'))+';';
  const result=await build({stdin:{contents:entry,resolveDir:web,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',define:{'import.meta.env':'{}'},plugins:[{name:'verified-local-shader-fixture',setup(b){b.onResolve({filter:/(^|\/)frozen-paint-tables(\.ts)?$/},()=>({path:'frozen',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const readFrozenTableAsync=(...a)=>globalThis.__familyShaderRead(...a);export const frozenPaintTableRowCounts=(...a)=>globalThis.__familyShaderRowCounts(...a);',loader:'js'}));}}]});
  let paint;try{paint=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text+'\n//# sourceURL=bounded-family-assembly-'+provider+'-'+city+'.mjs').toString('base64'));}catch(error){throw Error('Shader fixture '+provider+':'+city+': '+error.message);}
  for(const [key,families]of provider==='infill'?[['base',[0]],['infill-westhafen-original102',[45510]]]:provider==='bremen'?[['base',[0]],['bremen-glocke-kuester',[47080]]]:city==='berlin'?[['base',[0]],['owner6307',[6307]]]:city==='hamburg'?[['base',[0]]]:[[undefined,[0]],[undefined,[3302]]]){
   const paintSource=key?paint.paintProgramFragment(key,city):paint.facadePaintFragmentForCity(city),assemble=await evaluate('fragment',{...paint,provider}),raw=assemble(paint.BUILDING_SURFACE_FRAGMENT_GLSL,paintSource),prune=families[0]===0?paint.paintProgramPartitionEnabled(city):key?(await evaluate('pruneFamilySource',{...paint,provider,city,legacyPartitionEnabled:paint.paintProgramPartitionEnabled(city)}))(key):false,original=prune?paint.pruneOwner6307Fragment(raw):raw,specialized=F.specializeFamilyPaintFragment(original,families);
   assert.equal(specialized.slice(specialized.indexOf('void main()')),original.slice(original.indexOf('void main()')));assert(specialized.length<original.length);if(families[0]===0)assert(!/\bvec3\s+progressiveFeatureDispatchCity\s*\(/.test(specialized),'initial program cannot retain the city paint dispatcher');
   const compilerValues=await fixture(provider,paintSource);Object.assign(compilerValues,{...F,...paint,fragment:assemble,provider,city,initialPaintFragment:paintSource,legacyPartitionEnabled:paint.paintProgramPartitionEnabled(city),facadePaintFragmentForCity:()=>paintSource,paintProgramFragment:()=>paintSource,VERTEX:await evaluate('VERTEX',{}),programPreparation:{compile(_gl,recipe){return recipe.build();}}});const compile=await evaluate('compileGeometryProgram',compilerValues),colour=compile(paint.BUILDING_SURFACE_FRAGMENT_GLSL,key??'base',prune,false,families),depth=compile(paint.BUILDING_SURFACE_FRAGMENT_GLSL,key??'base',prune,true,families),sha=s=>createHash('sha256').update(s).digest('hex');assert.equal(depth.fragment,colour.fragment,'the depth-only target consumes the exact original colour fragment');compilerValues.scope.release();
   t.diagnostic(JSON.stringify({provider,city,key:key??'city',families,originalCharacters:original.length,specializedCharacters:specialized.length,colourCharacters:colour.fragment.length,colourSHA256:sha(colour.fragment),depthCharacters:depth.fragment.length,depthSHA256:sha(depth.fragment)}));
  }
  delete globalThis.__familyShaderRead;delete globalThis.__familyShaderRowCounts;
 }
});

test('Infill low-office shared identity retains every independent live family consumer',async()=>{
 const v=await fixture('infill');v.city='frankfurt';
 const a=F.familyPaintRecipeKey('infill-low-office',[34168]),b=F.familyPaintRecipeKey('infill-low-office',[34169]);
 const main=new Set([a,b]);v.residentMainRequiredKeys=main;
 const ra=v.geometryProgramRecipe('helper','infill-low-office',true,false,[34168]);
 const rb=v.geometryProgramRecipe('helper','infill-low-office',true,false,[34169]);
 assert(v.sameGeometryRecipe(ra,rb));assert.notEqual(ra.consumerKey,rb.consumerKey);
 const ca=v.coordinateGeometryRecipe(v.residentProgramPlan,ra);v.coordinateGeometryRecipe(v.residentProgramPlan,rb);
 assert.equal(ca.current(),true);main.delete(b);assert.equal(rb.current(),false);assert.equal(ca.current(),true,'later retired consumer cannot hide surviving earlier demand');
 main.delete(a);assert.equal(ca.current(),false);
 for(const [city,key,values] of [['essen','infill-low-office',[34168]],['frankfurt','base',[34168]],['frankfurt','infill-low-office',[33999]],['frankfurt','infill-low-office',[34168.5]],['frankfurt','infill-low-office',[]]])assert.equal(v.sharedInfillProgramFamilies(city,key,values),values);
 v.residentProgramPlan.release();v.scope.release();
});
test('Infill low-office compiles once, keeps two owners, and deletes only after final release',async()=>{
 const v=await fixture('infill');v.city='frankfurt';v.pruneFamilySource=()=>false;
 v.partitionRuns=[34168,34169].map((f,i)=>({key:F.familyPaintRecipeKey('infill-low-office',[f]),firstIndex:i*3,indexCount:3}));
 const driver=compilerOwner(v),compile=await evaluate('compileGeometryProgram',v);
 const a=driver.linked(()=>compile('helper','infill-low-office',false,false,[34168]));
 const b=driver.linked(()=>compile('helper','infill-low-office',false,false,[34169]));
 assert.equal(a,b);assert.equal(driver.createdPrograms,1);assert.equal(v.programPreparation.stats.shared.heldReferences,2);
 v.programPreparation.releaseProgram(v.gl,a);driver.drain();assert.equal(driver.deleted.length,0);assert.equal(v.programPreparation.stats.shared.heldReferences,1);
 v.programPreparation.releaseProgram(v.gl,b);driver.drain();assert.equal(driver.deleted.length,1);assert.equal(v.programPreparation.stats.shared.heldReferences,0);
 v.programPreparation.dispose();v.residentProgramPlan.release();v.scope.release();
});


test('Infill equivalent base programs share linking but preserve per-family demand and final release',async()=>{
 const v=await fixture('infill');v.city='frankfurt';v.pruneFamilySource=()=>false;v.baseSurfaceFragment=infillBaseHelper;
 const key='infill-skyper',families=[30000,30001];
 v.partitionRuns=families.map((f,i)=>({key:F.familyPaintRecipeKey(key,[f]),firstIndex:i*3,indexCount:3}));
 const driver=compilerOwner(v),compile=await evaluate('compileGeometryProgram',v);
 const a=driver.linked(()=>compile(infillBaseHelper,key,false,false,[families[0]]));
 const b=driver.linked(()=>compile(infillBaseHelper,key,false,false,[families[1]]));
 assert.equal(a,b);assert.equal(driver.createdPrograms,1);assert.equal(v.programPreparation.stats.shared.heldReferences,2);
 v.programPreparation.releaseProgram(v.gl,a);driver.drain();assert.equal(driver.deleted.length,0);
 v.programPreparation.releaseProgram(v.gl,b);driver.drain();assert.equal(driver.deleted.length,1);
 v.programPreparation.dispose();v.residentProgramPlan.release();v.scope.release();
});
