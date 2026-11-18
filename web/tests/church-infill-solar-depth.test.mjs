import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const web=fileURLToPath(new URL('../',import.meta.url));
// The shared reflection setup through support/f3-reflection-bridge.mjs (one
// production bundle, including the source-part and bounds helpers that current
// church/infill compilers import).
const {loadReflectionBridge}=await import(new URL('./support/f3-reflection-bridge.mjs',import.meta.url).href);
const {fixture,evaluate,method,binding,productionHelpers,recipeKey,recipeRuns,installAsyncProgramCompiler,preparedPaintPlan,maskFactoryImports,installFixtureGrantHandoff,preparationHelpers}=await loadReflectionBridge({exports:['fixture','evaluate','method','binding','productionHelpers','recipeKey','recipeRuns','installAsyncProgramCompiler','preparedPaintPlan','maskFactoryImports','installFixtureGrantHandoff','preparationHelpers'],sourceURL:'church-infill-solar-depth-fixture.mjs'});
// Renderer module state newer closures reach (support/f5prog-renderer-deps.mjs).
const {bindRendererBindings,installProgramGrantHandoff}=await import(new URL('./support/f5prog-renderer-deps.mjs',import.meta.url).href);
const providers=['church','infill'];
async function preparedFixture(provider,city=provider==='infill'?'frankfurt':'berlin'){
 const f=await fixture(provider),compiled=[],deleted=[],base={program:f.values.program,vao:f.values.vao,matrix:f.values.matrix};
 Object.assign(f.values,{partitionEnabled:provider==='infill',city,queueOnlyProgram:false,clearBerlinProgramComparison(){},sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'full source helper',familySurfaceHelper:'full source helper',surfaceFragment:undefined,fullColourFailure:undefined,fullColourRevision:0,paintProgramKey:n=>'owner'+n});
 f.values.familyPrograms.clear();f.values.partitionPrograms.clear();
 if(provider==='infill'){f.values.legacyPartitionEnabled=city==='frankfurt';f.values.preparedPaintSource=key=>'exact original '+f.values.city+' '+key;f.values.preparedScope.release();await preparedPaintPlan(provider,f.text,f.values);}
 f.m.gl.deleteProgram=p=>deleted.push(p);f.values.rathausProxyMasks.withMasks=(_g,_p,draw)=>draw();
 for(const name of [...(provider==='infill'?['releaseSolarPrograms','solarResidentKeys','trimSolarPrograms']:[]),'prepareSolarPrograms','prepareSolarShadow'])f.values[name]=await evaluate(binding(f.text,name),f.values);
 f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:6,key:'owner-a'},{firstIndex:6,indexCount:6,key:'owner-b'}]);f.values.familyRuns=[{firstIndex:0,indexCount:6,key:f.values.currentPaintProgramKey(208)},{firstIndex:6,indexCount:6,key:f.values.currentPaintProgramKey(211)}];
 installAsyncProgramCompiler(f,compiled);if(provider==='infill')f.preparationDriver.onBuild=(_recipe,sources)=>{compiled.at(-1)[1]=sources.fragment;};
 // The geometry owner is the shared chunk scene's actual resident owner;
 // only the separate shadow geometry owner keeps its teardown double.
 // Infill releaseGPU also ends its static geometry owner, stubbed like the
 // shadow owner, and clears its actual program grant handoff.
 if(provider==='infill'){f.values.staticGeometryOwner={release(){},contextLost(){}};await installProgramGrantHandoff({evaluate,binding,productionHelpers},f);}
 Object.assign(f.values,{shadowGeometryOwner:{release(){},contextLost(){}},residentGPU:{released(){}},discardPendingGeometry(){},releaseShadowGPU(){},windowTexture:undefined,diffuseTexture:undefined});f.values.rathausProxyMasks.detach=()=>{};f.m.gl.deleteVertexArray=()=>{};
 // Church colour sources come from its actual prepared-source workspace (a
 // factory constant over the geometry store budget); the model paint text and
 // its pre-build bound are fixture inputs, never original assets.
 if(provider==='church'){
  const shaderBudget=await productionHelpers('src/safety/render-runtime/shader-source-budget.ts'),churchPaint='fixture church paint';
  Object.assign(f.values,{createPreparedSourceWorkspace:(await productionHelpers('src/safety/prepared-source.ts')).createPreparedSourceWorkspace,getFacadePaintFragmentGLSL:()=>churchPaint,describeFacadePaintSourceBounds:()=>shaderBudget.shaderSourceBounds(shaderBudget.shaderSourceParts`${churchPaint}`)});
  f.values.sourceWorkspace=await evaluate(binding(f.text,'sourceWorkspace'),f.values);
  // Church now also hands program grants to a successor generation, and binds
  // its colour source bounds to its module-owned immutable source authority.
  await installFixtureGrantHandoff(provider,f.text,f.values);f.values.grantHandoffGeneration=undefined;
  f.values.programGrantHandoff=await evaluate(binding(f.text,'programGrantHandoff'),f.values);f.values.clearProgramGrantHandoff=await evaluate(binding(f.text,'clearProgramGrantHandoff'),f.values);
  f.values.createProgramSourceAuthority??=preparationHelpers.createProgramSourceAuthority;f.values.specializeCurrentPaintFragment??=(await productionHelpers('src/painted/delegated500/safety/current-paint-program.ts')).specializeCurrentPaintFragment;
  f.values.churchColourSourceAuthority=await evaluate(binding(f.text,'churchColourSourceAuthority'),f.values);
 }
 // Solar capture work is admitted only for an active solar capture demand:
 // church keeps that demand as its solar capture token, infill through its
 // actual setCaptureDemand.
 const activateSolarDemand=()=>{if(provider==='church')f.values.solarCaptureToken=provider+'-solar-fixture';else f.values.setCaptureDemand({kind:'solar',token:provider+'-solar-fixture',active:true});};
 activateSolarDemand();
 // Infill teardown also ends its resident chunk geometry roles; the restored
 // GPU uploads a new incarnation (a new VAO handle, so the fixture chunk scene
 // publishes fresh chunks), as the renderer's next geometry upload does.
 let gpuIncarnation=0;
 // Actual GPU teardown (releaseGPU) also ends every capture demand
 // (church resetCaptureDemands, infill captureDemands.clear()); the scene's
 // solar driver requests capture again for the restored GPU, as here.
 // Teardown is checked before that re-request: releaseGPU ends every capture
 // demand, so until demand is activated again preparation admits no work (no
 // compile, no queued shader work, nothing ready or failed) and coverage stays
 // incomplete. (Infill/Bremen still report their capture resource as pending
 // 'missing-program' there: a readiness report, not admitted work.)
 // Re-activation with the same token is what the scene does: its solar driver
 // calls demand.activate(source,key) before every non-cached
 // preparation, and createCaptureResourceDemand.activate always forwards
 // setCaptureDemand({active:true}), also for an unchanged token. It does not
 // rely on teardown changing the solar revision (church/delegated500 releaseGPU
 // leaves getSolarShadowRevision unchanged).
 const assertCaptureInert=()=>{const before=compiled.length,queued=f.values.programPreparation.stats.pending,result=f.values.prepareSolarShadow();assert.deepEqual([result.ready,result.failed],[0,0],provider+' ended capture demand admits no preparation');assert.equal(compiled.length,before,provider+' teardown cannot compile before capture is requested again');assert.equal(f.values.programPreparation.stats.pending,queued,provider+' teardown queues no shader work before capture is requested again');assert.equal(f.values.solarCoverage().complete,false);};
 const release=await evaluate(binding(f.text,'releaseGPU'),f.values),programs=provider==='church'?f.values.familyPrograms:f.values.partitionPrograms;
 return Object.assign(f,{compiled,deleted,programs,release,assertCaptureInert,resetGPU(){release();Object.assign(f.values,base);f.values.generation++;if(provider==='infill')f.values.vao={kind:'resident-vao',incarnation:++gpuIncarnation};assertCaptureInert();activateSolarDemand();}});
}
for(const provider of providers)test(`${provider}: off-camera capture prepares exact original colour recipes and preserves ordered resident coverage`,async()=>{
 const f=await preparedFixture(provider);f.first.box=[20,2,30,24,12,36];f.second.box=[-12,1,-8,-4,5,-2];const indices=new Uint32Array(f.values.indices),components=JSON.stringify([...f.values.loaded.values()]);
 assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.compiled.length,0);assert.equal(f.prepareAll().status,'ready');const coverage=f.values.solarCoverage();assert(coverage.complete);assert.equal(coverage.triangles,4);assert.equal(coverage.draws,provider==="church"?1:2);assert.equal(f.compiled.length,provider==='church'?1:2);assert.equal(f.programs.size,provider==='church'?1:2);assert.equal(f.m.draws.length,0);
 assert.deepEqual(f.render({...f.pass,purpose:'solar-depth',maxTriangles:4,maxDraws:2}),{triangles:4,draws:provider==="church"?1:2,complete:true});assert.deepEqual(f.m.draws.map(x=>[x.offset,x.count]),provider==="church"?[[0,12]]:[[0,6],[24,6]]);assert(f.m.draws.every(x=>f.preparationDriver.programs.includes(x.program)));assert.deepEqual(f.m.state,f.m.original);assert.deepEqual(f.values.indices,indices);assert.equal(JSON.stringify([...f.values.loaded.values()]),components);
 f.first.box=f.second.box=[-.1,0,-.1,.1,.1,.1];f.m.draws.length=0;
 if(provider==='church'){
  assert.equal(f.render(f.pass).complete,false,'complete unpruned colour source cannot stand in for missing specialized family recipes');assert.equal(f.m.draws.length,0);assert.deepEqual(f.compiled[0],['full source helper',0,0,true,false]);
  for(const city of ['berlin','hamburg','munich','cologne','frankfurt','stuttgart','dusseldorf','dortmund','leipzig','bremen','essen','dresden','hannover','nuremberg']){const next=await preparedFixture(provider,city);assert.equal(next.prepareAll().status,'ready',city);assert(next.values.solarCoverage().complete,city);next.release();}
 }else{
  assert.equal(f.render(f.pass).complete,true,'ordinary reflection uses the same exact original prepared recipes');assert.deepEqual(f.compiled.map(a=>[a[1],a[3],a[4]]),[['exact original frankfurt owner-a',true,[1001]],['exact original frankfurt owner-b',true,[1002]]]);
  // Last consumer release (DECISIONS 2026-11-03 01:15, ratified): the
  // override supersedes both capture-held family programs; neither main (off
  // camera) nor capture still needs them, so each is deleted exactly once, the
  // replacement recipe is not, and a settled capture never retires again.
  const superseded=[...f.programs.values()];assert.equal(superseded.length,2);
  f.values.paintOverride=()=>6417;assert.equal(f.prepareAll().status,'ready');const key=f.values.familyPaintRecipeKey('owner6417',[6417]);assert.deepEqual([...f.values.solarResidentKeys()],[key]);assert(f.programs.has(key));assert.equal(f.compiled.length,3);
  assert.equal(f.deleted.length,superseded.length,'only superseded capture family programs are retired');for(const p of superseded)assert.equal(f.deleted.filter(value=>value===p).length,1,'each superseded family program is deleted exactly once');assert(!f.deleted.includes(f.programs.get(key)),'the current override recipe is not retired');assert(superseded.every(p=>![...f.programs.values()].includes(p)));
  assert.equal(f.prepareAll().status,'ready');assert.equal(f.compiled.length,3);assert.equal(f.deleted.length,superseded.length,'a settled capture never retires twice');
  // Main still needing a family program keeps it when capture stops needing
  // it: owner-a stays on camera (a main paint key), owner-b is capture-only.
  // Ending the solar demand through the renderer's own setCaptureDemand retires
  // only the capture-only program, exactly once.
  const g=await preparedFixture(provider);g.second.box=[-12,1,-8,-4,5,-2];
  // These counterfactual projected bounds represent a new view. As on move,
  // advance its revision instead of reusing the prior visibility snapshot.
  g.values.viewRevision++;
  assert.equal(g.prepareAll().status,'ready');const [mainKey,captureKey]=[...g.values.solarResidentKeys()];
  assert.deepEqual([...g.values.mainPaintKeys()],[mainKey]);assert.deepEqual([...g.values.heldCaptureDemandKeys].sort(),[mainKey,captureKey].sort());const mainProgram=g.programs.get(mainKey),captureProgram=g.programs.get(captureKey);assert(mainProgram&&captureProgram&&mainProgram!==captureProgram);assert.equal(g.deleted.length,0);
  g.values.setCaptureDemand({kind:'solar',token:provider+'-solar-fixture',active:false});
  assert.deepEqual(g.deleted,[captureProgram],'the capture-only family program is deleted exactly once');assert.equal(g.programs.get(mainKey),mainProgram,'a family program main still needs is not deleted');assert(!g.programs.has(captureKey));
  g.values.reconcileProgramDemand();assert.deepEqual(g.deleted,[captureProgram]);assert.equal(g.programs.get(mainKey),mainProgram);
 }
});
for(const provider of providers)test(`${provider}: cached capture prepares active empty masks and changed mask versions without a camera draw`,async()=>{
 const f=await preparedFixture(provider),text=await readFile(new URL('../src/safety/facade-rathaus-proxy-mask.ts',import.meta.url),'utf8'),create=await evaluate(method(text,'createRathausProxyMasks'),maskFactoryImports(f.store)),masks=create();f.values.rathausProxyMasks=masks;
 let generic={old:'generic'},indexed={old:'indexed'};const original={generic,indexed},get=f.m.gl.getParameter.bind(f.m.gl);f.m.gl.getParameter=k=>k===f.m.gl.UNIFORM_BUFFER_BINDING?generic:get(k);f.m.gl.getIndexedParameter=()=>indexed;f.m.gl.bindBuffer=(_t,p)=>{generic=p;};f.m.gl.bindBufferBase=(_t,_i,p)=>{indexed=p;};
 assert.equal(f.prepareAll().status,'ready');assert.equal(f.m.creates,1);assert.equal(f.m.uploads,1);assert.equal(f.m.draws.length,0);assert.equal(generic,original.generic);assert.equal(indexed,original.indexed);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 const count=f.compiled.length;masks.configure([],new Float32Array());assert.equal(masks.withResidentMasks(f.m.gl,{},()=>{}),false);assert.equal(f.prepareAll().status,'ready');assert.equal(f.compiled.length,count);assert.equal(f.m.uploads,2);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert.equal(generic,original.generic);assert.equal(indexed,original.indexed);
});
test('Frankfurt private infill source pruning stays city-scoped while capture uses the exact ordinary source keys',async()=>{
 for(const city of ['frankfurt','stuttgart']){
  const f=await preparedFixture('infill',city);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:6,key:'infill-boerse'},{firstIndex:6,indexCount:6,key:'owner-a'}]);assert.equal(f.prepareAll().status,'ready');
  assert.deepEqual(f.compiled.map(a=>[a[1],a[3],a[4]]),[[`exact original ${city} infill-boerse`,true,[1001]],[`exact original ${city} owner-a`,true,[1002]]]);assert.equal(f.values.pruneFamilySource('infill-boerse',f.values.residentProgramPlan),city==='frankfurt');assert.equal(f.values.pruneFamilySource('owner-a',f.values.residentProgramPlan),false);assert(f.values.solarCoverage().complete);assert.equal(f.values.partitionPrograms.size,2);assert.equal(f.m.draws.length,0);
 }
});
for(const provider of providers)test(`${provider}: capture gates and failures stay latched until actual GPU teardown permits a clean retry`,async()=>{
 const f=await preparedFixture(provider);for(const [key,value]of [['pageHidden',true],['enabled',false],['needsBirth',true],['opacity',.5]]){const old=f.values[key];f.values[key]=value;f.values.prepareSolarShadow();assert.equal(f.compiled.length,0,key);f.values[key]=old;}f.values.birth.set('growing',0);f.values.prepareSolarShadow();assert.equal(f.compiled.length,0);f.values.birth.clear();f.values.sceneEnvironment.shadows=false;f.prepareAll();assert.equal(f.compiled.length,0);f.values.sceneEnvironment.shadows=true;
 if(provider==='church'){f.values.queueOnlyProgram=true;f.values.prepareSolarShadow();assert.equal(f.compiled.length,0);f.values.queueOnlyProgram=false;}else{f.values.partitionEnabled=false;f.values.prepareSolarShadow();assert.equal(f.compiled.length,0);f.values.partitionEnabled=true;}
 f.preparationDriver.fail=true;const expectedFailures=provider==='church'?1:2;for(let frame=0;(provider==='church'?Number(!!f.values.fullColourFailure):f.values.solarProgramFailures.size)<expectedFailures;frame++){assert(frame<10,'all admitted recipe failures must settle');assert.equal(f.prepareAll().status,'failed');}const failed=f.compiled.length;assert.equal(f.prepareAll().status,'failed');assert.equal(f.compiled.length,failed);assert.equal(failed,expectedFailures);assert.equal(f.deleted.length,failed);assert.equal(f.values.solarCoverage().complete,false);
 f.preparationDriver.fail=false;f.resetGPU();assert.equal(f.programs.size,0);assert.equal(f.prepareAll().status,'ready');assert(f.values.solarCoverage().complete);const cached=f.compiled.length;f.values.viewRevision++;f.prepareAll();assert.equal(f.compiled.length,cached);
 const resident=[...f.programs.values()];f.resetGPU();f.values[provider==='church'?'familySurfaceHelper':'baseSurfaceFragment']='new source helper';assert.equal(f.prepareAll().status,'ready');assert(f.compiled.length>cached);for(const p of resident)assert.equal(f.deleted.filter(value=>value===p).length,1);
 f.release();assert.equal(f.programs.size,0);if(provider==='church')assert.equal(f.values.fullColourFailure,undefined);else assert.equal(f.values.solarProgramFailures.size,0);
});
for(const provider of providers)test(`actual compiler ${provider}: original structural source, vertex and attributes remain distinct from different ordinary recipes`,async()=>{
 const full='#version 300 es\nprecision highp float;out vec4 color;uniform bool hole;void material(){if(hole)discard;}vec3 paintedFacade(vec3 base,float family){return base;}void main(){material();paintedFacade(vec3(.5),0.);gl_FragDepth=gl_FragCoord.z;color=vec4(.5);}';
 const f=await preparedFixture(provider),source=f.preparationDriver.shaderSources,attrs=f.preparationDriver.attributes;let ordinary=0;f.preparationDriver.onBuild=undefined;
 Object.assign(f.values,{...(provider==='infill'?{preparedPaintSource:()=> 'exact original source'}:{}),VERTEX:'exact original position/growth vertex',initialPaintFragment:'unsafe base stub',gpuGeneration:3,fragment:(_helper,arg)=>{assert.equal(arg,provider==='church'?false:'exact original source');return full;},familyFragmentSource:()=>{ordinary++;return full;},pruneOwner6307Fragment:()=>{ordinary++;return full;},
  // Church family recipes now specialize the prepared paint in its source
  // workspace (specializeCurrentPaintFragment), the ordinary pruned path that
  // familyFragmentSource used to be; complete capture source never calls it.
  ...(provider==='church'?{specializeCurrentPaintFragment:()=>{ordinary++;return full;}}:{})});
 // The colour recipes name their module-level attribute lists and immutable
 // assembly authority, evaluated from the renderer text.
 await bindRendererBindings({evaluate,binding},f,provider==='church'?['colourAttributes']:['COLOUR_PROGRAM_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY']);
 // An infill candidate admits exactly the colour recipes it requires
 // (requiredMainKeys/requiredCaptureKeys): here the requested family-0 recipe.
 if(provider==='infill'){const key=f.values.familyPaintRecipeKey('exact-source-key',[0]);f.values.pendingCandidate={plan:f.values.residentProgramPlan,scope:f.values.preparedScope,requiredMainKeys:new Set([key]),requiredCaptureKeys:new Set([key])};}
 // The colour helper is the renderer's own surface helper (infill
 // baseSurfaceFragment, church familySurfaceHelper): any other helper is a
 // texture-material recipe, demanded only by attached facade textures.
 const helper=provider==='infill'?f.values.baseSurfaceFragment:f.values.familySurfaceHelper;
 const compile=await evaluate(binding(f.text,'compileGeometryProgram'),f.values),capture=()=>compile(helper,provider==='church'?0:'exact-source-key',provider==='church'?0:false,true);
 assert.throws(capture,f.values.isProgramPreparationPending);assert.equal(source.length,0);f.advancePreparation();const captured=capture();assert(captured.program);assert.equal(source[0],'exact original position/growth vertex');assert(source[1].includes('void material(){if(hole)discard;}'));assert(source[1].includes('gl_FragDepth=gl_FragCoord.z;color=vec4(.5);'));assert.equal(ordinary,0);assert.deepEqual(attrs.slice(0,6).map(a=>a[1]),['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family']);
 const colour=()=>provider==='church'?compile(helper,211):compile(helper,'exact-source-key',true);assert.throws(colour,f.values.isProgramPreparationPending);f.advancePreparation();assert.notEqual(colour(),captured,'a pruned family or different prune recipe cannot borrow complete capture source');assert.equal(ordinary,1);f.values.programPreparation.dispose();
});
