import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Reuse the existing fixture setup only: its original reflection assertions still run separately.
const web=fileURLToPath(new URL('../',import.meta.url));
// The shared reflection setup through support/f3-reflection-bridge.mjs (one
// production bundle, including planar-reflection-group, the dedicated
// Reichstag mesh and the source-part/bounds helpers current compilers import).
// The Reichstag mesh's facade paint controls read the page query once at module
// initialization; this suite runs with no query (default paint mode).
globalThis.location??=new URL('http://fixture.invalid/');
const {loadReflectionBridge,F3_REICHSTAG_RUNTIME_MODULES}=await import(new URL('./support/f3-reflection-bridge.mjs',import.meta.url).href);
const {installDelegatedColourDependencies}=await import(new URL('./support/f5prog-delegated-colour.mjs',import.meta.url).href);
const {installProgramGrantHandoff}=await import(new URL('./support/f5prog-renderer-deps.mjs',import.meta.url).href);
const {fixture,helpers,providers,evaluate,method,binding,productionHelpers,recipeKey,recipeRuns,installAsyncProgramCompiler,maskFactoryImports}=await loadReflectionBridge({exports:['fixture','helpers','providers','evaluate','method','binding','productionHelpers','recipeKey','recipeRuns','installAsyncProgramCompiler','maskFactoryImports'],sourceURL:'resident-solar-shadow-fixture.mjs',runtimeModules:F3_REICHSTAG_RUNTIME_MODULES});
for(const provider of providers)test(`${provider}: actual resident solar capture keeps all mask/material draws, disables water clip and restores state`,async()=>{
 const f=await fixture(provider);
 // Outside the main-camera identity box: solar coverage must include all resident casters.
 f.first.box=[20,2,30,24,12,36];f.second.box=[-12,1,-8,-4,5,-2];f.values.anchor=[.53,.34];f.values.anchorUnit=1000;
 const actual=f.values.solarCoverage();assert(actual.complete);assert.equal(actual.triangles,4);assert.equal(actual.draws,1);
 [.518,.304,0,.554,.348,.012].forEach((expected,i)=>assert(Math.abs(actual.bounds[i]-expected)<1e-12));
 const before=JSON.stringify([...f.values.loaded.values()]);const seen=[];const draw=f.m.gl.drawElements;f.m.gl.drawElements=(...args)=>{seen.push({depth:f.m.state.mask,blend:f.m.state.blend,clip:f.m.clip.at(-1)});draw(...args);};
 const r=f.render({...f.pass,purpose:'solar-depth',maxTriangles:actual.triangles,maxDraws:actual.draws});
 assert.deepEqual(r,{triangles:4,draws:1,complete:true});assert.equal(f.masks,1);assert(seen.every(s=>s.depth&&!s.blend&&s.clip===0));assert.deepEqual(f.m.state,f.m.original);assert.equal(JSON.stringify([...f.values.loaded.values()]),before);assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);
 assert.equal(f.m.draws.length,actual.draws,'planned coverage counts the draw calls actually executed');
 assert.equal(f.m.draws.reduce((triangles,draw)=>triangles+draw.count/3,0),actual.triangles,'planned coverage matches executed index triangles');
 f.m.draws.length=0;f.values.anchor=[0,0];f.values.anchorUnit=1;const reflection=f.render({...f.pass,maxTriangles:2,maxDraws:1});assert.equal(reflection.draws,0,'ordinary reflection still culls the off-camera boxes');
 f.first.box=f.second.box=[-.1,0,-.1,.1,.1,.1];f.values.anchor=[0,0];f.values.anchorUnit=1;
 assert.deepEqual(f.render({...f.pass,maxTriangles:2,maxDraws:1}),{triangles:2,draws:1,complete:false,...(f.values.captureRuntime?{reason:'plan:capture-budget'}:{})});assert(f.m.clip.includes(1),'ordinary reflection still enables water clipping');
});
test('every actual provider rejects unfinished growth/first-frame work and translucent casters without losing ordinary reflection',async()=>{
 for(const provider of providers){const f=await fixture(provider),solar=()=>f.render({...f.pass,purpose:'solar-depth'});
  f.values.needsBirth=true;assert.equal(f.values.solarCoverage().complete,false);assert.equal(solar().complete,false);assert.equal(f.m.draws.length,0);
  f.values.needsBirth=false;f.values.birth.set('growing',0);assert.equal(f.values.solarCoverage().complete,false);assert.equal(solar().complete,false);f.values.birth.clear();assert(f.values.solarCoverage().complete);
  f.values.opacity=.5;assert.equal(f.values.solarCoverage(),undefined);assert.deepEqual(solar(),{triangles:0,draws:0,complete:true});assert.equal(f.render(f.pass).draws,2);
  f.values.opacity=1;f.values.opacityContext='route-selection';assert.equal(f.values.solarCoverage(),undefined);f.values.opacityContext='normal';f.values.enabled=false;assert.equal(f.values.solarCoverage(),undefined);
 }
});
test('solar revision tracks source and growth, with camera revision only in lineage A',async()=>{
 // HEAD semantics, accepted in DECISIONS 2026-11-03 02:25: lineage A's
 // semantic capture revision includes viewRevision; the other providers use
 // content revisions. Mask and main-program identities gate coverage rather
 // than this revision. Compare every provider and every stimulus explicitly.
 const stimuli={camera:f=>f.values.viewRevision+=1,generation:f=>f.values.generation++,reflectionResidentRevision:f=>f.values.reflectionResidentRevision++,maskResidentRevision:f=>f.values.rathausProxyMasks.residentRevision='next-mask',needsBirth:f=>f.values.needsBirth=true,birth:f=>f.values.birth.set('new',0),mainProgram:f=>f.values.program={kind:'replacement'}};
 const expected={camera:false,generation:true,reflectionResidentRevision:false,maskResidentRevision:false,needsBirth:true,birth:true,mainProgram:false},observed={},wanted={};
 for(const provider of providers){const f=await fixture(provider),revision=await evaluate(method(f.text,'getSolarShadowRevision'),f.values);observed[provider]={};wanted[provider]={...expected,camera:['root500','infill','bremen'].includes(provider)};
  for(const [name,change]of Object.entries(stimuli)){const before=revision();change(f);observed[provider][name]=revision()!==before;}
 }
 assert.deepEqual(observed,wanted);
});
test('missing resident family or mask cannot publish an apparently complete solar target',async()=>{
 for(const provider of ['city','root500','delegated500','tier300','church','infill','bremen']){const f=await fixture(provider);f.values.rathausProxyMasks.withResidentMasks=()=>false;assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);}
 const f=await fixture('city');f.values.materialProgramsCurrent=()=>false;assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);
});
test('invalid bounds and units are never labelled complete and source bounds remain immutable',()=>{
 const rows=[{start:0,end:3,box:[1,2,3,4,5,6]}],before=JSON.stringify(rows);assert.equal(helpers.residentSolarShadowCoverage(rows,[.5,.4],0,1,1,true).complete,false);assert.equal(helpers.residentSolarShadowCoverage([{...rows[0],box:[4,2,3,1,5,6]}],[.5,.4],100,1,1,true).complete,false);assert.equal(helpers.residentSolarShadowCoverage(rows,[.5,.4],100,1,1,false).complete,false);assert.equal(JSON.stringify(rows),before);
});

test('dedicated Reichstag uses the same opaque resident mesh for solar capture and preserves reflection semantics',async()=>{
 const fixtureText=await readFile(new URL('./planar-building-reflection.test.mjs',import.meta.url),'utf8'),fakeGL=await evaluate(binding(fixtureText,'fakeGL'),{}),dedicatedGL=await evaluate(binding(fixtureText,'dedicatedGL'),{fakeGL});
 const oldLocation=globalThis.location;globalThis.location={search:''};let createDedicatedReichstagLayer;try{({createDedicatedReichstagLayer}=await productionHelpers('src/safety/dedicated-reichstag-mesh.ts'));}finally{if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
 const vertex=new ArrayBuffer(72),v=new DataView(vertex);for(let i=0;i<3;i++){v.setFloat32(i*24,i,true);v.setFloat32(i*24+4,i?10:0,true);v.setFloat32(i*24+8,i===2?1:0,true);v.setInt16(i*24+14,32767,true);for(let j=18;j<22;j++)v.setUint8(i*24+j,255);}
 const mesh={origin:[13.3761,52.5186],vertex,index:new Uint16Array([0,1,2]),vertices:3,triangles:1,identity:{objectId:'osm/relation/8990774',partId:'osm/relation/8990774/component/35b9af608ec3d7abc1c1'},sourceCommit:'cca429f4e72a1b1b962de4d944ec83fed96869e8',boundarySHA:'a'.repeat(64)},f=dedicatedGL(),r=createDedicatedReichstagLayer({triggerRepaint(){}},mesh),matrix=Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),pass={gl:f.gl,mainMatrix:matrix,clipPlaneWorldZ:0,maxTriangles:1,maxDraws:1,purpose:'solar-depth'};
 r.setEnabled(true);r.layer.onAdd({},f.gl);r.setGrowth(.5);assert.equal(r.getSolarShadowCoverage().complete,false);assert.equal(r.renderPlanarReflection(pass).complete,false);assert.equal(f.gl.surfaceDraws.length,0);r.setGrowth(1);
 const coverage=r.getSolarShadowCoverage();assert.equal(coverage.complete,true);assert.equal(coverage.triangles,1);assert.equal(coverage.draws,1);assert(coverage.bounds[5]>0);const before=f.gl.snapshot(),compiled=f.compiled,uploads=f.uploads;
 assert.deepEqual(r.renderPlanarReflection(pass),{triangles:1,draws:1,complete:true});assert.equal(f.gl.surfaceDraws.at(-1).clip,0);assert.equal(f.gl.snapshot(),before);assert.equal(f.compiled,compiled);assert.equal(f.uploads,uploads);
 r.setOpacity(.5);assert.equal(r.getSolarShadowCoverage(),undefined);assert.equal(r.renderPlanarReflection(pass).draws,0);assert.equal(r.renderPlanarReflection({...pass,purpose:undefined}).draws,1);assert.equal(f.gl.surfaceDraws.at(-1).clip,1);r.destroy();assert.equal(r.getSolarShadowCoverage(),undefined);
});

test('coverage reports the existing growth, GPU and resident-run blocker without compiling or drawing',async()=>{
 for(const provider of providers){const f=await fixture(provider);f.values.needsBirth=true;assert.equal(f.values.solarCoverage().reason,'needs-birth');f.values.needsBirth=false;f.values.birth.set('a',0);assert.equal(f.values.solarCoverage().reason,'growing');f.values.birth.clear();f.values.gpuReady=()=>false;assert.equal(f.values.solarCoverage().reason,'gpu-unready');assert.equal(f.m.draws.length,0);}
 for(const provider of ['root500','delegated500','tier300','church']){const f=await fixture(provider),key=currentKey(f);if(provider==='root500'||provider==='delegated500'){f.values.partitionEnabled=true;f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key}]);}else f.values.familyRuns=[{firstIndex:0,indexCount:12,key}];if(provider==='delegated500')f.values.partitionPrograms.delete(f.values.BERLIN_FULL_CURRENT_CAPTURE_KEY);if(provider==='church')f.values.familyPrograms.delete(f.values.fullColourProgramKey);const value=f.values.solarCoverage();assert.equal(value.complete,false,provider);assert.equal(value.reason,'missing-program',provider);assert.equal(f.m.draws.length,0);}
 function currentKey(f){return f.values.currentPaintProgramKey(19401);}
 const c=[{start:0,end:6,box:[0,0,0,1,1,1]}];assert.equal(helpers.planResidentReflection(c,[{firstIndex:3,indexCount:3,program:{}}],[],100,100,6,false).reason,'run-coverage');assert.equal(helpers.planResidentReflection([{...c[0],end:0}],[],[],100,100,6,false).reason,'invalid-component-range');
});

async function depthFixture(provider){
 const f=await fixture(provider),calls=[],deleted=[];
 Object.assign(f.values,{partitionEnabled:true,sceneEnvironment:{sunlight:true,shadows:true},sceneSun:{shadowVector:[1,1]},baseSurfaceFragment:'source helper',surfaceFragment:undefined,cityPaintFragment:'complete Berlin source with all hooks',paintProgramKey:n=>'owner'+n,preparedPaintSource:key=>'exact '+f.values.city+' '+key});
 f.values.partitionPrograms.clear();f.m.gl.deleteProgram=p=>deleted.push(p);f.values.rathausProxyMasks.withMasks=(_gl,_p,draw)=>draw();
 const names=provider==='root500'?['releaseSolarPrograms','solarResidentKeys','trimSolarPrograms','prepareSolarPrograms','prepareSolarShadow']:['releaseSolarDepth','prepareSolarPrograms','prepareSolarShadow'];
 for(const name of names)f.values[name]=await evaluate(binding(f.text,name),f.values);
 if(provider==='delegated500')Object.assign(f.values,{prepareMaterialSource:()=>true,materialRecipeRevision:0,materialSourceWorkRevision:0});
 // root500 releaseGPU and candidate cancellation clear its actual program
 // grant handoff (support/f5prog-renderer-deps.mjs); delegated500 already has it.
 await installProgramGrantHandoff({evaluate,binding,productionHelpers},f);
 installAsyncProgramCompiler(f,calls);f.preparationDriver.onBuild=(_recipe,sources)=>{calls.at(-1)[1]=sources.fragment;};
 // Solar capture work is admitted only for an active solar capture demand
 // (delegated: its solar capture token; root500: its actual setCaptureDemand).
 if(provider==='delegated500')f.values.solarCaptureToken=provider+'-solar-fixture';else f.values.setCaptureDemand({kind:'solar',token:provider+'-solar-fixture',active:true});
 return Object.assign(f,{calls,deleted,releaseCapture:()=>f.values[provider==='root500'?'releaseSolarPrograms':'releaseSolarDepth'](),captureRevision:()=>f.values[provider==='root500'?'solarProgramRevision':'solarDepthRevision']});
}
test('offscreen root recipes reuse the ordinary cache while complete Berlin delegated source stays distinct from specialized families',async()=>{
 for(const provider of ['root500','delegated500']){
  const f=await depthFixture(provider);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:6,key:'owner-a'},{firstIndex:6,indexCount:6,key:'owner-b'}]);
  assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.calls.length,0,'coverage stays read-only');f.prepareAll();
  assert(f.values.solarCoverage().complete);assert.equal(f.calls.length,provider==='root500'?2:1);assert.equal(f.values.partitionPrograms.size,provider==='root500'?2:1);assert.equal(f.m.draws.length,0);
  assert(f.calls.every(args=>args[3]===true),'capture keeps its scheduling priority while compiling original colour recipes');
  assert.deepEqual(f.calls.map(args=>args.slice(1,3)),provider==='root500'?[['exact berlin owner-a',false],['exact berlin owner-b',false]]:[['complete Berlin source with all hooks',0]]);
  const n=f.calls.length,revision=f.captureRevision();f.values.viewRevision++;f.prepareAll();assert.equal(f.calls.length,n);assert.equal(f.captureRevision(),revision);
  const coverage=f.values.solarCoverage(),result=f.render({...f.pass,purpose:'solar-depth',maxTriangles:coverage.triangles,maxDraws:coverage.draws});
  assert.deepEqual(result,{triangles:4,draws:provider==='root500'?2:1,complete:true});assert.equal(f.masks,provider==='root500'?2:1);assert(f.m.draws.every(row=>f.preparationDriver.programs.includes(row.program)));
  assert.equal(f.m.draws.length,coverage.draws);assert.equal(f.m.draws.reduce((n,row)=>n+row.count/3,0),coverage.triangles);
  f.m.draws.length=0;
  if(provider==='root500'){assert.equal(f.render(f.pass).complete,true,'ordinary reflection consumes the same exact prepared recipes');assert(f.m.draws.every(row=>f.values.partitionPrograms.has([...f.values.partitionPrograms].find(([,p])=>p===row.program)?.[0])));}
  else assert.equal(f.render(f.pass).complete,false,'the complete unpruned source cannot substitute for missing specialized colour families');
  const resident=[...f.values.partitionPrograms.values()];f.releaseCapture();assert.deepEqual([...f.values.partitionPrograms.values()],resident,'capture-state reset borrows ordinary cached programs');assert(resident.every(p=>!f.deleted.includes(p)));
 }
});
test('capture gates and failures remain explicit while only the ordinary cache owner retires shared programs',async()=>{
 for(const provider of ['root500','delegated500']){
  const f=await depthFixture(provider);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);f.values.needsBirth=true;f.values.prepareSolarShadow();assert.equal(f.calls.length,0);f.values.needsBirth=false;f.values.sceneEnvironment.shadows=false;f.prepareAll();assert.equal(f.calls.length,0);f.values.sceneEnvironment.shadows=true;
  f.preparationDriver.fail=true;assert.equal(f.prepareAll().status,'failed');const failed=f.calls.length;assert.equal(f.prepareAll().status,'failed');assert.equal(f.calls.length,failed);assert.equal(f.values.solarCoverage().complete,false);
  f.preparationDriver.fail=false;f.values.programPreparation.cancel();f.releaseCapture();assert.equal(f.prepareAll().status,'ready');const resident=[...f.values.partitionPrograms.values()];
  if(provider==='root500'){f.values.partitionRuns=[];f.values.trimSolarPrograms();assert.equal(f.values.solarProgramFailures.size,0);assert.deepEqual([...f.values.partitionPrograms.values()],resident,'capture retirement cannot delete the ordinary LRU');}
  // root500 releaseGPU also ends its static geometry owner (staticGeometryOwner),
  // stubbed exactly like the resident geometry owners beside it.
  Object.assign(f.values,{residentGPU:{released(){}},geometryOwner:{release(){},contextLost(){}},residentGeometry:{release(){},contextLost(){}},staticGeometryOwner:{release(){},contextLost(){}},discardGeometryCandidate(){},pendingMaterialBatches:undefined,clearMaterialSource(){},clearGeometryHandles(){},clearShadowGeometry(){},reusableVertex673:undefined,diffuseTexture:undefined,windowTexture:undefined,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined,releaseShadowGPU(){},texturedProgram:undefined,diffuseProgram:undefined});f.values.rathausProxyMasks.detach=()=>{};f.m.gl.deleteVertexArray=()=>{};
  (await evaluate(binding(f.text,'releaseGPU'),f.values))();assert.equal(f.values.partitionPrograms.size,0);for(const p of resident)assert.equal(f.deleted.filter(value=>value===p).length,1);
 }
});
for(const provider of ['root500','delegated500'])test(`${provider}: actual matching colour and capture compilers preserve source, vertex and attribute slots with one executable`,async()=>{
 const full='#version 300 es\nprecision highp float;out vec4 color;uniform bool hole;void cut(){if(hole)discard;}vec3 paintedFacade(vec3 base,float family){return base;}void main(){cut();paintedFacade(vec3(.25),0.);gl_FragDepth=gl_FragCoord.z;color=vec4(.25);}';
 const f=await depthFixture(provider),submitted=f.preparationDriver.shaderSources,attrs=f.preparationDriver.attributes;f.preparationDriver.onBuild=undefined;
 Object.assign(f.values,{VERTEX:'original vertex and growth',preparedPaintSource:()=> 'full material source',fragment:(_helper,paint)=>{assert.equal(paint,'full material source');return full;},initialPaintFragment:'wrong initial stub',diagnostic557:false,reusableVertex673:undefined,pruneOwner6307Fragment(){throw Error('must not prune the requested full source');}});
 // The colour recipes name their module-level attribute list and immutable
 // source authorities (root500: COLOUR_PROGRAM_ATTRIBUTES/COLOUR_ASSEMBLY_AUTHORITY;
 // delegated500: support/f5prog-delegated-colour.mjs), evaluated from the renderer.
 if(provider==='root500'){for(const name of ['COLOUR_PROGRAM_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY'])f.values[name]??=await evaluate(binding(f.text,name),f.values);}
 else await installDelegatedColourDependencies({evaluate,binding,productionHelpers},f);
 // A root500 candidate admits exactly the colour recipes it requires
 // (requiredMainKeys/requiredCaptureKeys); this one requires the requested
 // original-material family-0 recipe for both the main and the capture role.
 if(provider==='root500'){const key=f.values.familyPaintRecipeKey('original-material',[0]);f.values.pendingCandidate={plan:f.values.publishedProgramPlan,scope:f.values.preparedScope,closed:false,requiredMainKeys:new Set([key]),requiredCaptureKeys:new Set([key])};}
 // The base colour helper is the renderer's base surface fragment; any other
 // helper is a texture-material recipe, demanded only by attached facade textures.
 const helper=f.values.baseSurfaceFragment;
 const compile=await evaluate(binding(f.text,'compileGeometryProgram'),f.values),capture=()=>compile(helper,provider==='root500'?'original-material':'full material source',provider==='root500'?false:0,true),main=()=>provider==='root500'?compile(helper,'original-material',false,false):compile(helper,'full material source',0,true,false);
 assert.throws(capture,f.values.isProgramPreparationPending);assert.equal(submitted.length,0);f.advancePreparation();const solar=capture();assert.equal(main(),solar);assert.equal(f.preparationDriver.linked,1);assert.equal(submitted[0],'original vertex and growth');assert(submitted[1].includes('void cut(){if(hole)discard;}'));assert(submitted[1].includes('gl_FragDepth=gl_FragCoord.z;color=vec4(.25);'));assert.deepEqual(attrs.map(row=>row[1]),['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);f.values.programPreparation.dispose();
});

// Regression: an off-camera source can have a complete depth program but no UBO
// because no ordinary camera draw has uploaded its masks yet.
async function attachActualMasks(f){
 const text=await readFile(new URL('../src/safety/facade-rathaus-proxy-mask.ts',import.meta.url),'utf8');
 let plan={masks:[],origin:undefined},generic={previous:'generic'},indexed={previous:'indexed'},uploads=[],indexedBinds=0,removed=0;
 const before={generic,indexed},g=f.m.gl,originalGet=g.getParameter.bind(g);
 g.getParameter=k=>k===g.UNIFORM_BUFFER_BINDING?generic:originalGet(k);g.getIndexedParameter=()=>indexed;g.bindBuffer=(_target,p)=>{generic=p;};g.bindBufferBase=(_target,_binding,p)=>{indexed=p;indexedBinds++;};
 g.bufferData=(_target,data)=>uploads.push(new Float32Array(data));g.deleteBuffer=()=>{removed++;};
 const create=await evaluate(method(text,'createRathausProxyMasks'),{...maskFactoryImports(f.store),rathausCoincidentWallFragmentMasks:()=>plan}),masks=create();f.values.rathausProxyMasks=masks;
 return {masks,uploads,before,get generic(){return generic;},get indexed(){return indexed;},get indexedBinds(){return indexedBinds;},get removed(){return removed;},setNonempty(){
  plan={masks:[{outline:{ring:0,edge:0},u:[.2,.8],y:[1,3]}],origin:[13,52]};
  const ring=[[0,0],[1,0],[1,1],[0,1],[0,0]],positions=[],normals=[];for(let i=0;i<4;i++){for(const [x,z]of [ring[i],ring[i+1],ring[i+1],ring[i]]){positions.push(x,1,z);normals.push(0,0,1);}}
  const paint=new Float32Array(20*5);for(let i=0;i<20;i++)paint[i*5+4]=120;paint[5*5]=1;
  masks.configure([{objectId:'osm/relation/147095',batches:[{positions:new Float32Array(12)},{positions,normals}],componentGeometry:{coordinates:[ring]}}],paint);
 }};
}
test('solar prepare uploads empty and later nonempty active masks before offscreen capture, preserving caller GL bindings',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),a=await attachActualMasks(f);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);
  f.prepareAll();assert.equal(a.uploads.length,1,provider+' empty active block must own a valid UBO');assert.equal(a.uploads[0].byteLength,2048);assert(a.uploads[0].every(x=>x===0));assert.equal(f.m.draws.length,0,'prepare must not draw');assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);assert.equal(f.values.partitionPrograms.size,1);
  const ready=f.render({...f.pass,purpose:'solar-depth'});assert.deepEqual(ready,{triangles:4,draws:1,complete:true});const programs=f.calls.length;f.m.draws.length=0;f.prepareAll();assert.equal(a.uploads.length,1);assert.equal(f.calls.length,programs);
  a.setNonempty();assert.equal(a.masks.stats.maskCount,1);assert.equal(a.masks.withResidentMasks(f.m.gl,{},()=>{}),false,'new data version stays unready before preparation');f.prepareAll();assert.equal(f.calls.length,programs,'version update does not recompile an unchanged shader');assert.equal(a.uploads.length,2);assert(a.uploads[1].some(x=>x!==0));assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);assert.equal(f.m.draws.length,0);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
  // Mask versions are chunk-store leases released by their last consumer
  // (DECISIONS 2026-11-02 23:50, as shared-proxy-mask #7): the atomic
  // replacement above already retired the superseded UBO; detach ends the
  // owner's role, while the completed capture plan still pins the current
  // version until that capture is invalidated, which retires it exactly once.
  a.masks.detach();assert.equal(a.removed,1,'a pinned capture keeps its exact mask version');assert.equal(f.scene.maskPins,1);
  f.values.captureRuntime.invalidate();assert.equal(f.scene.maskPins,0);assert.equal(a.removed,2,'atomic replacement and detach each retire one UBO');assert.equal(a.masks.stats.allocatedGPUBytes,0);f.releaseCapture();f.prepareAll();assert.equal(a.uploads.length,3,'GPU teardown permits fresh mask preparation');assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 }
});
// The case above returns the last capture pin by invalidating the capture
// runtime directly. This one reaches the same release through the renderer's
// own production path: ending the solar capture demand (setCaptureDemand with
// active:false and the current token) invalidates the completed capture plan,
// which returns the pinned mask version exactly once.
test('ending the solar capture demand through the renderer returns the pinned mask version exactly once',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),a=await attachActualMasks(f),token=provider+'-solar-fixture';f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);
  assert.equal(typeof f.values.setCaptureDemand,'function',provider+' fixture exposes the renderer demand entry');
  f.prepareAll();assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
  a.setNonempty();f.prepareAll();assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert.equal(a.removed,1,'atomic replacement retired the superseded UBO');
  a.masks.detach();assert.equal(a.removed,1);assert.equal(f.scene.maskPins,1,'the completed capture still pins the current version');
  f.values.setCaptureDemand({kind:'solar',token:provider+'-stale-token',active:false});assert.equal(f.scene.maskPins,1,'a stale token cannot end the current demand');assert.equal(a.removed,1);
  f.values.setCaptureDemand({kind:'solar',token,active:false});
  assert.equal(f.scene.maskPins,0,provider+' ending the demand returns the last capture pin');assert.equal(a.removed,2,'the pinned version retires exactly once');assert.equal(a.masks.stats.allocatedGPUBytes,0);
  f.values.setCaptureDemand({kind:'solar',token,active:false});assert.equal(a.removed,2,'a repeated end retires nothing twice');
 }
});
test('solar mask preparation failure preserves its successful borrowed program and cannot publish or retry every frame',async()=>{
 for(const provider of ['root500','delegated500']){const f=await depthFixture(provider),a=await attachActualMasks(f);f.values.partitionRuns=recipeRuns(f,[{firstIndex:0,indexCount:12,key:'owner-a'}]);f.m.gl.createBuffer=()=>null;f.prepareAll();f.prepareAll();assert.equal(f.calls.length,1);assert.equal(f.deleted.length,0);assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,false);assert.equal(f.m.draws.length,0);assert.equal(a.generic,a.before.generic);assert.equal(a.indexed,a.before.indexed);
  f.releaseCapture();f.m.gl.createBuffer=()=>({});f.prepareAll();assert.equal(f.values.solarCoverage().complete,true);assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 }
});

// The solar prerender precedes grow(): the transition to ready must schedule a
// final capture even when reduced motion leaves already-full vertices unchanged.
for(const provider of providers)test(`${provider}: growth completion wakes the next solar prerender once, then idles`,async()=>{
 for(const reducedMotion of [false,true]){
  const f=await fixture(provider);let now=0,repaints=0,uploads=0;
  Object.assign(f.first,{firstVertex:0,lastVertex:1});Object.assign(f.second,{firstVertex:1,lastVertex:2});
  const canonical=provider!=='base',vertices=new Float32Array(canonical?18:20),stateData=new Float32Array([reducedMotion?7:6,reducedMotion?7:6]);if(!canonical)vertices[9]=vertices[19]=reducedMotion?7:6;
  const state=(i)=>canonical?stateData[i]:vertices[i*10+9];
  Object.assign(f.values,{vertices,stateData,needsBirth:true,reducedMotion,seenBirth:new Set(),BIRTH_LIMIT:20000,selectedIdentity:undefined,key:i=>i.objectId+'|'+i.partId,clock:()=>now,uploadState(){uploads++;},map:{triggerRepaint(){repaints++;}}});
  for(const name of ['rememberFinishedBirth','reserveBirthSlot','grow'])f.values[name]=await evaluate(binding(f.text,name),f.values);
  const revision=await evaluate(method(f.text,'getSolarShadowRevision'),f.values),pending=revision();
  assert.equal(f.values.solarCoverage().complete,false);
  f.values.grow();
  if(!reducedMotion){
   assert.equal(f.values.solarCoverage().reason,'growing');assert.equal(repaints,1);
   now=150;f.values.grow();assert.equal(state(0),6.5);assert.equal(f.values.solarCoverage().complete,false);
   now=300;repaints=0;f.values.grow();
  }
  assert.equal(f.values.solarCoverage().complete,true);assert.notEqual(revision(),pending);
  assert.equal(repaints,1,'ready transition requests the final capture frame');
  assert.equal(state(0),7);assert.equal(state(1),7,'style/selection bits are retained');
  if(reducedMotion)assert.equal(uploads,0,'no redundant vertex upload for an already-full mesh');
  const settledRevision=revision(),settledUploads=uploads;repaints=0;now=1000;f.values.grow();
  assert.equal(repaints,0,'settled growth does not keep the render loop running');assert.equal(uploads,settledUploads);assert.equal(revision(),settledRevision);
  f.values.needsBirth=true;f.values.pageHidden=true;f.values.grow();assert.equal(repaints,0,'hidden page stays paused');
 }
});
