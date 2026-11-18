import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const web=process.env.CRIMEMAPS_SOLAR_ADAPTER_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url));
// The shared reflection setup through support/f3-reflection-bridge.mjs (one
// production bundle, including planar-reflection-group and the source-part and
// bounds helpers that current delegated/Bremen compilers import).
const {loadReflectionBridge,F3_RUNTIME_MODULES,F3_RENDERER_IMPORTS}=await import(new URL('./support/f3-reflection-bridge.mjs',import.meta.url).href);
const {fixture,evaluate,method,binding,productionHelpers,recipeKey,recipeRuns,installAsyncProgramCompiler,preparedPaintPlan,maskFactoryImports,sceneRuntime}=await loadReflectionBridge({exports:['fixture','evaluate','method','binding','productionHelpers','recipeKey','recipeRuns','installAsyncProgramCompiler','preparedPaintPlan','maskFactoryImports','sceneRuntime'],sourceURL:'delegated-bremen-solar-depth-fixture.mjs',runtimeModules:[...F3_RUNTIME_MODULES,'src/painted/bremen/safety/shared-paint-recipe.ts'],rendererImports:[...F3_RENDERER_IMPORTS,'sharedBremenPaintRecipeKey']});
// Renderer module state newer closures reach (support/f5prog-*.mjs).
const {installResidentChunkScene}=await import(new URL('./support/f3-chunk-scene.mjs',import.meta.url).href);
const {installDelegatedColourDependencies,loadDelegatedShaderBudget}=await import(new URL('./support/f5prog-delegated-colour.mjs',import.meta.url).href);
const {bindRendererBindings,installProgramGrantHandoff,installChurchColourDependencies}=await import(new URL('./support/f5prog-renderer-deps.mjs',import.meta.url).href);
const cases=[['delegated500','hamburg'],['delegated500','hannover'],['bremen','bremen']];
async function depthFixture(provider,city){
 const f=await fixture(provider,{city}),calls=[],deleted=[],base={program:f.values.program,vao:f.values.vao,matrix:f.values.matrix};
 Object.assign(f.values,{city,currentFamilyPrograms:provider==='delegated500'&&city==='berlin',berlinCurrent:provider==='delegated500'&&city==='berlin',casterBase:new Map(),casterFailures:new Map(),casterHelper:undefined,drawFrame:0,casterCompileFrame:-1,partitionEnabled:true,legacySolarPartitions:provider==='delegated500'&&['hamburg','hannover'].includes(city),sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'source helper',familySurfaceHelper:'source helper',surfaceFragment:undefined,cityPaintFragment:'complete base including all city hooks',paintProgramKey:n=>'owner'+n,legacyPartitionFragment:key=>'hooked exact '+f.values.city+' '+key});
 f.values.partitionPrograms.clear();
 if(['root500','infill','bremen'].includes(provider)){f.values.preparedPaintSource=key=>'exact '+f.values.city+' '+key;f.values.preparedScope.release();await preparedPaintPlan(provider,f.text,f.values);}
 if(provider==='delegated500')Object.assign(f.values,{prepareMaterialSource:()=>true,materialRecipeRevision:0,materialSourceWorkRevision:0,casterPreparedSources:new Map(),pendingMaterialBatches:undefined,discardGeometryCandidate(){},clearShadowGeometry(){},clearMaterialSource(){f.values.casterPreparedSources.clear();}});
 if(provider==='delegated500')for(const name of ['snapshotMaterial','snapshotPackedResident'])f.values[name]=await evaluate(binding(f.text,name),f.values);
 f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:6,key:'base'},{firstIndex:6,indexCount:6,key:'owner-a'}]);f.m.gl.deleteProgram=p=>deleted.push(p);
 for(const name of [...(provider==='delegated500'?['releaseSolarDepth','trimSolarCasterState']:['releaseSolarPrograms','solarResidentKeys','trimSolarPrograms']),'prepareSolarPrograms','prepareSolarShadow'])f.values[name]=await evaluate(binding(f.text,name),f.values);
 installDepthCompiler(f,calls);
 // The resident geometry owner is the shared chunk scene's actual owner.
 Object.assign(f.values,{residentGPU:{released(){}},releaseShadowGPU(){},invalidateMatrix(){},clearGeometryHandles(){},windowTexture:undefined,diffuseTexture:undefined,reusableVertex673:undefined});f.values.rathausProxyMasks.detach=()=>{};f.m.gl.deleteVertexArray=()=>{};
 // Solar capture work is admitted only for an active solar capture demand
 // (delegated: its solar capture token; Bremen: its actual setCaptureDemand).
 const activateSolarDemand=()=>{if(provider==='delegated500')f.values.solarCaptureToken=provider+'-solar-fixture';else f.values.setCaptureDemand({kind:'solar',token:provider+'-solar-fixture',active:true});};
 activateSolarDemand();
 // Actual GPU teardown (releaseGPU) also ends every capture demand (delegated
 // resetCaptureDemands, Bremen captureDemands.clear()) and clears the
 // renderer's actual grant handoff; Bremen also ends its static geometry
 // owner (stubbed like the other teardown owners). The scene's solar driver
 // requests capture again for the restored GPU, as resetGPU does here.
 await installProgramGrantHandoff({evaluate,binding,productionHelpers},f);
 if(provider==='bremen')f.values.staticGeometryOwner={release(){},contextLost(){}};
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
 const assertCaptureInert=()=>{const before=calls.length,queued=f.values.programPreparation.stats.pending,result=f.values.prepareSolarShadow();assert.deepEqual([result.ready,result.failed],[0,0],provider+' ended capture demand admits no preparation');assert.equal(calls.length,before,provider+' teardown cannot compile before capture is requested again');assert.equal(f.values.programPreparation.stats.pending,queued,provider+' teardown queues no shader work before capture is requested again');assert.equal(f.values.solarCoverage().complete,false);};
 const release=await evaluate(binding(f.text,'releaseGPU'),f.values),programs=f.values.partitionPrograms,failures=provider==='delegated500'?f.values.casterFailures:f.values.solarProgramFailures;
 return Object.assign(f,{calls,deleted,programs,failures,release,trim:()=>f.values[provider==='delegated500'?'trimSolarCasterState':'trimSolarPrograms'](),keys:()=>f.values[provider==='delegated500'?'solarCasterResidentKeys':'solarResidentKeys'](),releaseCapture:()=>f.values[provider==='delegated500'?'releaseSolarDepth':'releaseSolarPrograms'](),activateSolarDemand,assertCaptureInert,resetGPU(){release();Object.assign(f.values,base);f.values.generation++;assertCaptureInert();activateSolarDemand();}});
}
function installDepthCompiler(f,calls,options){
 installAsyncProgramCompiler(f,calls,options);
 if(!options?.sharedState)f.preparationDriver.onBuild=(_recipe,sources)=>{calls.at(-1)[1]=sources.fragment;};
}
async function actualMasks(f){
 const text=await readFile(path.join(web,'src/safety/facade-rathaus-proxy-mask.ts'),'utf8');let generic={before:'generic'},indexed={before:'indexed'},uploads=0,removed=0;
 const before={generic,indexed},g=f.m.gl,get=g.getParameter.bind(g);g.getParameter=k=>k===g.UNIFORM_BUFFER_BINDING?generic:get(k);g.getIndexedParameter=()=>indexed;g.bindBuffer=(_t,p)=>{generic=p;};g.bindBufferBase=(_t,_i,p)=>{indexed=p;};g.bufferData=(_t,rows)=>{assert.equal(rows.byteLength,2048);uploads++;};g.deleteBuffer=()=>removed++;
 const create=await evaluate(method(text,'createRathausProxyMasks'),maskFactoryImports(f.store)),masks=create();f.values.rathausProxyMasks=masks;
 return{masks,before,get generic(){return generic;},get indexed(){return indexed;},get uploads(){return uploads;},get removed(){return removed;}};
}
test('capture scheduling: Bremen starts only one cold ordinary recipe per preparation budget',async()=>{
 const f=await depthFixture('bremen','bremen');await actualMasks(f);let starts=0;
 const budget={compile(_key,_epoch,work){if(starts)return{status:'pending'};starts++;return{status:'ready',value:work()};}};
 const result=f.values.prepareSolarShadow(budget);assert.equal(f.calls.length,0);assert.equal(starts,1);assert.equal(result.status,'pending');assert.equal(f.values.programPreparation.stats.pending,1);f.advancePreparation();assert.equal(f.calls.length,1);assert.equal(f.preparationDriver.linked,1);assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.m.draws.length,0);
});
test('nested providers share context admission and execute exactly the prepared complete resident coverage',async()=>{
 const {planarReflectionGroup}=await productionHelpers('src/safety/planar-reflection-group.ts');
 const fixtures=await Promise.all([['bremen','bremen'],['root500','berlin'],['infill','frankfurt'],['church','berlin'],['delegated500','hamburg']].map(async([p,c])=>{
  if(p!=='church')return depthFixture(p,c);
  const f=await fixture(p),calls=[];f.values.familyPrograms.clear();Object.assign(f.values,{sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},familySurfaceHelper:'source helper',queueOnlyProgram:false});for(const name of ['prepareSolarPrograms','prepareSolarShadow'])f.values[name]=await evaluate(binding(f.text,name),f.values);installDepthCompiler(f,calls);
  // Church solar capture work is admitted only for its active solar capture
  // token, as every other provider here is activated by depthFixture.
  f.values.solarCaptureToken='church-solar-fixture';
  // Its colour sources come from its actual prepared-source workspace and
  // grant handoff (support/f5prog-renderer-deps.mjs).
  await installChurchColourDependencies({evaluate,binding,productionHelpers},f);
  return Object.assign(f,{calls,programs:f.values.familyPrograms});
 }));
 const sharedGL=fixtures[0].values.gl,sharedState={};for(const f of fixtures){f.values.programPreparation.cancel();f.values.gl=sharedGL;f.pass.gl=sharedGL;installDepthCompiler(f,f.calls,{sharedState});}
 // Resident chunk geometry is a page-store GPU lease of one context: on the
 // shared context every nested provider's chunks are published (by the same
 // shared chunk scene) on that context's page store, as one page does.
 for(const f of fixtures.slice(1)){f.scene.release();f.scene=installResidentChunkScene(f.values,{provider:f.provider,runtime:sceneRuntime,gl:sharedGL,store:fixtures[0].store,ownerName:f.provider==='delegated500'?'residentGeometry':'geometryOwner'});}
 let maskUpdates=0;for(const f of fixtures)f.values.rathausProxyMasks.prepare=(_g,programs)=>{maskUpdates+=programs.length;return{ready:true};};
 const source=f=>({prepareSolarShadow:budget=>f.values.prepareSolarShadow(budget),getPlanarReflectionRevision:()=>String(f.values.solarProgramRevision??f.values.fullColourRevision??f.values.solarDepthRevision),getSolarShadowCoverage:()=>f.values.solarCoverage(),renderPlanarReflection:f.render});
 const group=planarReflectionGroup(()=>[source(fixtures[0]),planarReflectionGroup(()=>fixtures.slice(1).map(source))]);const total=()=>fixtures.reduce((n,f)=>n+f.calls.length,0);let result;
 for(let frame=0;frame<100;frame++){const before=total();result=group.prepareSolarShadow();fixtures[0].advancePreparation(true);assert(total()-before<=1,'one source start per shared context turn');assert(fixtures[0].values.programPreparation.stats.context.inFlight<=1);if(result.status==='ready')break;assert.equal(result.status,'pending');assert.equal(group.getSolarShadowCoverage().complete,false);}
 assert.equal(total(),8,'legacy delegated base borrows its original main program');assert.equal(fixtures[0].preparationDriver.linked,8);assert.deepEqual(result,{status:'ready',ready:8,pending:0,failed:0});
 // The church fixture renders all four triangles in a single draw.
 const perProvider=fixtures.map(f=>{const c=f.values.solarCoverage();return[f.provider,c.triangles,c.draws,c.complete];});
 assert.deepEqual(perProvider,[['bremen',4,2,true],['root500',4,2,true],['infill',4,2,true],['church',4,1,true],['delegated500',4,2,true]]);
 const coverage=group.getSolarShadowCoverage();assert.equal(coverage.complete,true);assert.equal(coverage.triangles,20);assert.equal(coverage.draws,9);
 const before=total(),masksBefore=maskUpdates;assert.equal(group.prepareSolarShadow().status,'ready');assert.equal(total(),before);assert.equal(maskUpdates-masksBefore,9,'cached masks include the already resident base program without another compile');assert(fixtures.every(f=>f.m.draws.length===0));
 let draws=0,triangles=0;const draw=sharedGL.drawElements;sharedGL.drawElements=(mode,count,...args)=>{draws++;triangles+=count/3;return draw(mode,count,...args);};
 assert.deepEqual(group.renderPlanarReflection({...fixtures[0].pass,purpose:'solar-depth',maxTriangles:coverage.triangles,maxDraws:coverage.draws}),{triangles:20,draws:9,complete:true});assert.equal(draws,coverage.draws);assert.equal(triangles,coverage.triangles);assert.equal(total(),before);
});
test('Bremen capture demand changes retire diagnostics while ordinary shader grants survive until actual GPU teardown',async()=>{
 const f=await depthFixture('bremen','bremen');await actualMasks(f);assert.equal(f.values.prepareSolarShadow().status,'pending');f.advancePreparation();assert.equal(f.values.prepareSolarShadow().status,'pending');const first=f.programs.get(recipeKey(f,'base'));assert(first);assert.equal(f.programs.size,1);
 // Last consumer release (DECISIONS 2026-11-03 01:15, ratified; the title
 // predates it): replacement runs supersede both resident family programs.
 // Neither main nor capture still needs them, so each is deleted exactly once
 // when the replacement is prepared, the replacement recipe is not, and
 // neither diagnostic retirement nor actual GPU teardown deletes them again.
 assert.equal(f.prepareAll().status,'ready');const resident=[...f.programs.values()];assert.equal(resident.length,2);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'replacement'}]);assert.equal(f.prepareAll().status,'ready');assert.deepEqual([...f.keys()],[recipeKey(f,'replacement')]);
 const once=label=>{assert.equal(f.deleted.filter(p=>resident.includes(p)).length,resident.length,label);for(const p of resident)assert.equal(f.deleted.filter(value=>value===p).length,1,label);};
 const replacement=f.programs.get(recipeKey(f,'replacement'));assert(replacement);once('each superseded family program is deleted exactly once');assert(!f.deleted.includes(replacement),'the replacement recipe is not retired');assert.deepEqual([...f.programs.values()],[replacement]);
 f.releaseCapture();assert.equal(f.failures.size,0);once('diagnostic retirement deletes no superseded program again');assert(!f.deleted.includes(replacement));
 f.resetGPU();assert.equal(f.programs.size,0);once('actual GPU teardown deletes no superseded program again');assert.equal(f.deleted.filter(value=>value===replacement).length,1);f.values.baseSurfaceFragment='next helper';assert.equal(f.prepareAll().status,'ready');assert.equal(f.values.solarCoverage().complete,true);
 // Main still needing a family program keeps it when capture stops needing
 // it: the base run stays on camera (a main paint key), owner-a is
 // capture-only. Ending the solar demand through the renderer's own
 // setCaptureDemand retires only the capture-only program, exactly once.
 const g=await depthFixture('bremen','bremen');await actualMasks(g);
 // The packed publication is immutable in production. Moving a fixture box
 // models a new view, so run the real move invalidation rather than retaining
 // the old view's cached runs or successful-main-frame witness.
 assert.equal(g.values.candidateMainProjection.length,16,'the fixture has a real main viewport projection before the pan');
 const projection=new Float64Array(g.values.candidateMainProjection),revision=g.values.viewRevision;
 g.values.invalidateMatrix=await evaluate(binding(g.text,'invalidateMatrix'),g.values);
 const move=await evaluate(binding(g.text,'move'),g.values);
 g.values.mainDrawWitness={fixture:'old-main'};g.values.pendingCompleteMain={fixture:'old-pending-main'};
 g.second.box=[-12,1,-8,-4,5,-2];move();
 assert.equal(g.values.viewRevision,revision+1);assert.equal(g.values.matrix,undefined);assert.equal(g.values.mainDrawWitness,undefined);assert.equal(g.values.pendingCompleteMain,undefined);assert.equal(g.values.candidateMainProjection,undefined);
 // Supply the next main viewport projection; this is not a completed draw.
 g.values.candidateMainProjection=projection;
 assert.equal(g.prepareAll().status,'ready');const [mainKey,captureKey]=[...g.keys()];
 assert.deepEqual([...g.values.mainPaintKeys()],[mainKey]);assert.deepEqual([...g.values.heldCaptureDemandKeys].sort(),[mainKey,captureKey].sort());const mainProgram=g.programs.get(mainKey),captureProgram=g.programs.get(captureKey);assert(mainProgram&&captureProgram&&mainProgram!==captureProgram);assert.equal(g.deleted.length,0);
 g.values.setCaptureDemand({kind:'solar',token:'bremen-solar-fixture',active:false});
 assert.deepEqual(g.deleted,[captureProgram],'the capture-only family program is deleted exactly once');assert.equal(g.programs.get(mainKey),mainProgram,'a family program main still needs is not deleted');assert(!g.programs.has(captureKey));
 g.values.reconcileProgramDemand();assert.deepEqual(g.deleted,[captureProgram]);assert.equal(g.programs.get(mainKey),mainProgram);
});
for(const [provider,city]of cases){
 test(`${city} ${provider}: offscreen capture reuses exact original ordinary recipes without a main-camera admission`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f),before=JSON.stringify([...f.values.loaded.values()]);f.first.box=[10,0,10,11,1,11];f.second.box=[20,0,20,21,1,21];
  assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.calls.length,0);assert.equal(f.prepareAll().status,'ready');assert.equal(f.values.solarCoverage().complete,true);assert.equal(f.calls.length,provider==='bremen'?2:1);assert.equal(f.programs.size,provider==='bremen'?2:1);
  assert.deepEqual(f.calls.map(a=>a.slice(1,3)),provider==='bremen'?[['exact bremen base',true],['exact bremen owner-a',false]]:[[`hooked exact ${city} owner-a`,0]]);assert(f.calls.every(a=>provider==='bremen'?a[3]===true:a[4]===true));assert.equal(m.uploads,1);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  assert.equal(f.m.draws.length,0);assert.deepEqual(f.render({...f.pass,purpose:'solar-depth',maxTriangles:4,maxDraws:2}),{triangles:4,draws:2,complete:true});assert(f.m.draws.every(d=>d.program===f.values.program||f.preparationDriver.programs.includes(d.program)));assert.equal(f.values.matrix,f.mainMatrix);assert.deepEqual(f.m.state,f.m.original);
  f.first.box=f.second.box=[-.1,0,-.1,.1,.1,.1];assert.equal(f.render(f.pass).complete,true,'capture and reflection use the same exact ordinary-cache programs');
  f.values.paintMode=()=>0;assert.equal(f.values.solarCoverage().complete,true);f.m.draws.length=0;assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert(f.m.draws.every(d=>d.program===f.values.program));assert.equal(JSON.stringify([...f.values.loaded.values()]),before);assert.equal(f.values.indices.length,12);
 });
 test(`${city} ${provider}: masks and active capture keys preserve ordinary ownership until actual GPU teardown`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f);assert.equal(f.prepareAll().status,'ready');const initial=f.calls.length;f.values.viewRevision++;f.prepareAll();assert.equal(f.calls.length,initial);assert.equal(m.uploads,1);
  m.masks.configure([],new Float32Array());assert.equal(m.masks.withResidentMasks(f.m.gl,{},()=>{}),false);assert.equal(f.prepareAll().status,'ready');assert.equal(m.uploads,2);assert.equal(f.calls.length,initial);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  const retained=[...f.programs.values()];f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a',family:1002}]);f.trim();assert.deepEqual([...f.keys()],[recipeKey(f,'owner-a',1002)]);assert(retained.every(p=>!f.deleted.includes(p)));
  f.values.paintOverride=()=>1678.75;assert.equal(f.prepareAll().status,'ready');assert.deepEqual([...f.keys()],[recipeKey(f,'owner1679',1678.75)]);assert.equal(f.calls.length,initial+1);assert.equal(f.values.solarCoverage().complete,true);
  const resident=[...f.programs.values()];f.values.gl=undefined;const upload=await evaluate(binding(f.text,'uploadPreparedGeometry'),f.values);if(provider==='delegated500')assert.throws(upload,/Geometry upload requires/);else upload();assert.deepEqual([...f.programs.values()],resident,'a missing context cannot retire successful ordinary recipes before replacement publication');f.values.gl=f.m.gl;
  // Precondition for the teardown check below: delegated500 held resident
  // chunk geometry leases before release (Bremen: a main VAO handle).
  if(provider==='delegated500')assert(f.values.residentGeometry.currentLeases.length>0,'resident chunk geometry is leased before teardown');else assert.notEqual(f.values.vao,undefined);
  f.release();assert.equal(f.programs.size,0);assert.equal(f.failures.size,0);assert.equal(m.masks.stats.allocatedGPUBytes,0);assert.equal(f.values.program,undefined);
  // Delegated500 no longer owns one global VAO: its resident chunk geometry is
  // the resident geometry owner's publication, which teardown ends. Bremen
  // still clears its main VAO handle.
  if(provider==='delegated500')assert.equal(f.values.residentGeometry.currentLeases.length,0);else assert.equal(f.values.vao,undefined);
  for(const p of resident)assert.equal(f.deleted.filter(value=>value===p).length,1);
 });
 test(`${city} ${provider}: compile and mask failure are bounded and actual GPU teardown permits a source retry`,async()=>{
  const f=await depthFixture(provider,city),m=await actualMasks(f);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);f.values.needsBirth=true;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.needsBirth=false;f.values.sceneEnvironment.shadows=false;f.prepareAll();assert.equal(f.calls.length,0);f.values.sceneEnvironment.shadows=true;
  f.m.gl.createBuffer=()=>null;assert.equal(f.prepareAll().status,'failed');assert.equal(f.prepareAll().status,'failed');assert.equal(f.calls.length,1);assert.equal(f.deleted.length,0);assert.equal(f.failures.size,0);assert.match(f.values.solarCoverage().reason,/mask|Rathaus/i);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);assert.equal(m.generic,m.before.generic);assert.equal(m.indexed,m.before.indexed);
  f.m.gl.createBuffer=()=>({});m.masks.configure([],new Float32Array());assert.equal(f.prepareAll().status,'ready');assert.equal(f.calls.length,1,'a mask retry reuses the successful ordinary program');assert.equal(f.values.solarCoverage().complete,true);
  f.resetGPU();f.values.baseSurfaceFragment='next material helper';assert.equal(f.prepareAll().status,'ready');assert.equal(f.calls.length,2);assert.equal(f.failures.size,0);assert.equal(f.values.solarCoverage().complete,true);
  let lost=true;f.m.gl.isContextLost=()=>lost;const count=f.calls.length;f.values.prepareSolarShadow();assert.equal(f.calls.length,count);f.release();assert.equal(f.programs.size,0);lost=false;Object.assign(f.values,{program:{kind:'restored-main'},vao:{kind:'restored-vao'},matrix:f.mainMatrix});f.assertCaptureInert();f.activateSolarDemand();assert.equal(f.prepareAll().status,'ready');assert.equal(f.calls.length,count+1);assert.equal(f.values.solarCoverage().complete,true);
  f.resetGPU();const attempts=f.calls.length;f.preparationDriver.fail=true;assert.equal(f.prepareAll().status,'failed');assert.equal(f.prepareAll().status,'failed');assert.equal(f.calls.length-attempts,1);assert.equal(f.failures.size,1);f.values.partitionRuns=recipeRuns(f,[]);f.trim();assert.equal(f.failures.size,0);
 });
}
test('delegated Berlin retains one complete original colour recipe independently of specialized family zero',async()=>{
 const f=await depthFixture('delegated500','berlin');await actualMasks(f);assert.equal(f.prepareAll().status,'ready');assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].slice(1),['complete base including all city hooks',0,true,true,f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY]);assert.equal(f.programs.size,1);assert.notEqual(f.programs.get(f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY),f.values.program);assert.equal(f.values.solarCoverage().complete,true);
});
test('Bremen private source pruning stays city-scoped while capture selects original recipe keys',async()=>{
 for(const city of ['bremen','hamburg']){const f=await depthFixture('bremen',city);await actualMasks(f);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:6,key:'bremen-ag70'},{firstIndex:6,indexCount:6,key:'owner-a'}]);assert.equal(f.prepareAll().status,'ready');assert.deepEqual(f.calls.map(a=>[a[1],a[2],a[3],a[4]]),[[`exact ${city} bremen-ag70`,city==='bremen',true,[1001]],[`exact ${city} owner-a`,false,true,[1002]]]);assert(f.values.solarCoverage().complete);assert.equal(f.programs.size,2);assert.equal(f.m.draws.length,0);}
});
test('delegated legacy capture defers the exact original colour-hook expression',async()=>{
 const f=await depthFixture('delegated500','hannover'),names=['f025FigureFragment663','f020StoneFragment660','f020TurretFragment659','f020AnnexFragment658','f020NaveFragment657','f020ApseFragment656','f020ButtressFragment655','f020ChapelFragment654','f020Fragment652','f004Fragment645'],values={city:'hannover',currentFamilyPrograms:false,paintProgramFragment:(key,city)=>`original:${city}:${key}`};for(const name of names)values[name]=(text,city)=>`${name}(${text},${city})`;
 // The legacy chain is now the delegated shader-budget wrapper table applied
 // in order (applyDelegatedPaintWrappers + DELEGATED_LEGACY_PARTITION_WRAPPERS);
 // that module is evaluated over these same stand-in fragment functions.
 const wrappers=await loadDelegatedShaderBudget({evaluate,productionHelpers},{fragments:values});Object.assign(values,{applyDelegatedPaintWrappers:wrappers.applyDelegatedPaintWrappers,DELEGATED_LEGACY_PARTITION_WRAPPERS:wrappers.DELEGATED_LEGACY_PARTITION_WRAPPERS});
 const original=await evaluate(binding(f.text,'legacyPartitionFragment'),values);let request;const compile=await evaluate(binding(f.text,'compilePartitionProgram'),{...values,legacyPartitionFragment:original,compileGeometryProgram:(...args)=>(request=args,{program:true})});compile('helper','f340',true);assert.equal(typeof request[1].build,'function');assert.equal(request[1].build(),original('f340'));assert.equal(original('f340'),names.reduceRight((text,name)=>`${name}(${text},hannover)`,'original:hannover:f340'));
});
for(const [provider,city]of [cases[0],cases[2]])test(`actual matching colour/capture compiler ${provider}: supplied material, vertex and attributes share one executable`,async()=>{
 const full='#version 300 es\nprecision highp float;out vec4 color;uniform bool hole;void cut(){if(hole)discard;}vec3 paintedFacade(vec3 base,float family){return base;}void main(){cut();paintedFacade(vec3(.25),0.);gl_FragDepth=gl_FragCoord.z;color=vec4(.25);}';
 const f=await depthFixture(provider,city),submitted=f.preparationDriver.shaderSources,attrs=f.preparationDriver.attributes;f.preparationDriver.onBuild=undefined;
 Object.assign(f.values,{...(provider==='bremen'?{preparedPaintSource:()=> 'full material source'}:{}),VERTEX:'original vertex and growth',fragment:(_helper,paint)=>{assert.equal(paint,'full material source');return full;},initialPaintFragment:'wrong initialization stub',diagnostic557:false,reusableVertex673:undefined,pruneOwner6307Fragment(){throw Error('cannot prune the requested full source');}});
 // The colour recipes name their module-level attribute list and immutable
 // source authorities (Bremen: COLOUR_ATTRIBUTES/COLOUR_ASSEMBLY_AUTHORITY;
 // delegated500: support/f5prog-delegated-colour.mjs), evaluated from the renderer.
 if(provider==='bremen')await bindRendererBindings({evaluate,binding},f,['COLOUR_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY']);else await installDelegatedColourDependencies({evaluate,binding,productionHelpers},f);
 // A Bremen candidate admits exactly the colour recipes it requires
 // (requiredKeys/requiredCaptureKeys): here the requested family-0 recipe.
 if(provider==='bremen'){const key=f.values.familyPaintRecipeKey('full-source-key',[0]);f.values.pendingCandidate={plan:f.values.residentProgramPlan,scope:f.values.preparedScope,requiredKeys:new Set([key]),requiredCaptureKeys:new Set([key])};}
 // The base colour helper is the renderer's base surface fragment; any other
 // helper is a texture-material recipe, demanded only by attached facade textures.
 const helper=f.values.baseSurfaceFragment;
 const compile=await evaluate(binding(f.text,'compileGeometryProgram'),f.values),capture=()=>compile(helper,provider==='bremen'?'full-source-key':'full material source',provider==='bremen'?false:0,true),main=()=>provider==='bremen'?compile(helper,'full-source-key',false,false):compile(helper,'full material source',0,true,false);
 assert.throws(capture,f.values.isProgramPreparationPending);assert.equal(submitted.length,0);f.advancePreparation();const solar=capture();assert.equal(main(),solar);assert.equal(f.preparationDriver.linked,1);assert.equal(submitted[0],'original vertex and growth');assert(submitted[1].includes('void cut(){if(hole)discard;}'));assert(submitted[1].includes('gl_FragDepth=gl_FragCoord.z;color=vec4(.25);'));assert.deepEqual(attrs.map(r=>r[1]),['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);f.values.programPreparation.dispose();
});
