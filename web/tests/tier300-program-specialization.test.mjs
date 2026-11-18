import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(web+'/package.json'),ts=require('typescript'),{build,transform}=require('esbuild'),dir=web+'/src/painted/tier300/safety';
// The shared reflection setup (support/f3-reflection-bridge.mjs) with the pure
// source-part/bounds helpers current Tier300 closures import.
const {loadReflectionBridge}=await import(pathToFileURL(path.join(web,'tests/support/f3-reflection-bridge.mjs')).href);
const {installAsyncProgramCompiler,preparedPaintPlan,captureHelpers,helpers:bridgeReflection,sceneRuntime,createFixtureResourceStore,installResidentChunkScene,installRendererImports,installLazyRendererClosures,evaluate:evaluateBridge,binding:bridgeBinding,preparationHelpers}=await loadReflectionBridge({exports:['preparationHelpers','installAsyncProgramCompiler','preparedPaintPlan','captureHelpers','helpers','sceneRuntime','createFixtureResourceStore','installResidentChunkScene','installRendererImports','installLazyRendererClosures','evaluate','binding'],sourceURL:'specialization-shared-fixture.mjs'});
const text=fs.readFileSync(dir+'/building-mesh-renderer.ts','utf8'),ast=ts.createSourceFile('tier300.ts',text,ts.ScriptTarget.Latest,true),nodes=new Map();
function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isArrowFunction(n.initializer))nodes.set(n.name.text,n.initializer.getText(ast));if(ts.isFunctionDeclaration(n)&&n.name)nodes.set(n.name.text,n.getText(ast));if(ts.isMethodDeclaration(n)&&['render','setBatches','renderPlanarReflection'].includes(n.name.getText(ast)))nodes.set(n.name.getText(ast),'function '+n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
const js=Object.fromEntries(await Promise.all(['compileGeometryProgram','familyProgram','trimFamilyPrograms','overrideProgramKey','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','residentFamilyProgramKeys','render','releaseGPU','isPaintFamilyReady','renderPlanarReflection','residentCaptureState','residentCaptureAdapter','solarCaptureRevision'].map(async name=>[name,(await transform('('+nodes.get(name)+')',{loader:'ts',target:'es2022'})).code])));
async function moduleAt(name){const out=await build({entryPoints:[web+'/src/painted/delegated500/safety/'+name+'.ts'],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));}
const policy=await moduleAt('current-paint-program'),{paintProgramRuns}=await moduleAt('paint-program-runs'),visibility=await moduleAt('paint-run-visibility');const I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const reflectionBundle=await build({entryPoints:[web+'/src/safety/resident-planar-reflection.ts'],bundle:true,write:false,format:'esm',platform:'node'});const {planResidentReflection}=await import('data:text/javascript;base64,'+Buffer.from(reflectionBundle.outputFiles[0].text).toString('base64'));
// The prepared Tier300 plan derives family depth effects from the actual
// current-paint analysis, which requires the assembled source's paintedFacade
// and main entrypoints; the fixture paint keeps its marker text plus those two.
const FIXTURE_PAINT='all original materials;vec3 paintedFacade(vec3 c,float family){return c;}void main(){}';
async function fixture(t,{city='berlin'}={}){let n=0,current;const draws=[],compiled=[],sources=[],deleted=[],driverShaders=[],g={lost:false,isContextLost(){return this.lost;}};
 for(const k of ['VERTEX_SHADER','FRAGMENT_SHADER','COMPILE_STATUS','LINK_STATUS','CURRENT_PROGRAM','VERTEX_ARRAY_BINDING','DEPTH_TEST','BLEND','CULL_FACE','DEPTH_WRITEMASK','DEPTH_FUNC','BLEND_SRC_RGB','BLEND_DST_RGB','BLEND_SRC_ALPHA','BLEND_DST_ALPHA','LEQUAL','SRC_ALPHA','ONE_MINUS_SRC_ALPHA','ONE','TRIANGLES','UNSIGNED_INT'])g[k]=++n;
 Object.assign(g,{createShader:type=>{const shader={type,attachments:new Set(),deleted:false,released:false};driverShaders.push(shader);return shader;},shaderSource:(s,t)=>{s.text=t;sources.push(t);},compileShader(){},getShaderParameter:s=>!g.failShader?.(s),getShaderInfoLog:shader=>g.failShader?.(shader)?'controlled shader failure':'',createProgram:()=>({id:++n,shaders:[],shaderHistory:[]}),attachShader:(p,s)=>{if(!p.shaders.includes(s)){p.shaders.push(s);p.shaderHistory.push(s);s.attachments.add(p);}if(s.type===g.FRAGMENT_SHADER)p.fragment=s.text;},detachShader:(p,s)=>{const at=p.shaders.indexOf(s);if(at>=0){p.shaders.splice(at,1);s.attachments.delete(p);}if(s.deleted&&!s.attachments.size){s.released=true;s.text=undefined;}},bindAttribLocation(){},linkProgram:p=>{p.failed=p.shaders.some(shader=>g.failShader?.(shader));compiled.push(p);},getExtension:()=>null,getProgramInfoLog:p=>p.failed?'controlled link failure':'',getProgramParameter:p=>!p.failed,deleteShader:s=>{s.deleted=true;if(!s.attachments.size){s.released=true;s.text=undefined;}},deleteProgram:p=>{deleted.push(p);for(const shader of [...(p.shaders??[])])g.detachShader(p,shader);p.deleted=true;p.released=true;},getParameter:key=>key===g.CURRENT_PROGRAM?current:1,isEnabled:()=>false,getUniformLocation:(_p,name)=>name,getUniform:(_p,name)=>name==='u_matrix'?I:0,useProgram:p=>current=p,drawElements:(_mode,count,_type,offset)=>draws.push({count,offset,program:current})});
 for(const k of ['bindVertexArray','enable','disable','depthFunc','depthMask','blendFuncSeparate','uniformMatrix4fv','uniform1f','uniform1i','uniform2f','uniform4f','uniform4fv','activeTexture','bindTexture','bindSampler','deleteBuffer','deleteVertexArray'])g[k]=()=>{};
 const base={id:'base'},v={...policy,...visibility,mainViewportMatrix:undefined,mainViewportRuns:undefined,gl:g,program:base,vao:{},VERTEX:'same vertex',cityPaintFragment:FIXTURE_PAINT,materialRecipeRevision:0,materialSourceSettled:true,pendingMaterialBatches:undefined,prepareMaterialSource:()=>true,replayMaterialBatches(){},clearMaterialSource(){},discardPendingGeometry(){},geometryOwner:{release(){}},setMaterialSourceBuilder(build){v.cityPaintFragment=build();v.materialRecipeRevision++;},fragment:(h,p)=>h+'|'+p,specializeCurrentPaintFragment:(s,f)=>s+'|family='+f,withResidentReflectionClip:s=>s+'|clip',lastFamilyFragmentCharacters:0,familySurfaceHelper:'base helper',familyPrograms:new Map(),familyFailures:new Map(),familyRuns:[{key:policy.currentPaintProgramKey(4912),firstIndex:0,indexCount:6},{key:policy.currentPaintProgramKey(21101),firstIndex:6,indexCount:6}],familyCompilations:0,familyEvictions:0,reflectionResidentRevision:0,paintOverride:()=>0,paintMode:()=>2,destroyed:false,pageHidden:false,enabled:true,gpuReady:()=>true,residentGPU:{emptyFrame:()=>false,isEmptyReady:()=>false,released(){}},syncFacadeResources(){},ensureTexturedProgram(){},ensureDiffuseProgram(){},grow(){},multiply:()=>I,matrix:undefined,anchor:[0,0],anchorUnit:1,materialAnchor:[0,0],materialUnit:1,indices:new Uint32Array(12),opacity:1,opacityContext:'normal',sceneEnvironment:{shadows:false,sunlight:true},sceneSun:{},sourceShadowOpacity:()=>0,shadowProgram:undefined,reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},rathausProxyMasks:{residentRevision:'ready',isResident:()=>true,prepare:()=>({ready:true}),withMasks:(_g,_p,draw)=>draw(),withResidentMasks:(_g,_p,draw)=>{draw();return true;},detach(){}},city,progressiveDiagnostic:null,diagnosticParams:new URLSearchParams(),loaded:new Map(),windowTexture:undefined,diffuseTexture:undefined,texturedProgram:undefined,diffuseProgram:undefined,viewRevision:0,facadeAttached:false,releaseShadowGPU(){},map:{triggerRepaint(){v.repaints++;}},repaints:0,planResidentReflection,residentReflectionClipPlane:()=>[0,0,1,0]};
 setFullResidentRange(v);
 // Shader/draw isolation only: preflight is already ready here. Actual source
 // scheduling/cancellation is covered by the dedicated preflight integration suite.
 v.preparedPaintSource=()=>FIXTURE_PAINT;
 // The solar receiver scope has its own GL-state suite; this fixture only needs its pass-through draw.
 v.withSceneSolarShadowReceiver=(gl,_matrix,draw)=>gl.isContextLost?.()?undefined:draw();
 const env=new Proxy(v,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,x)=>(o[k]=x,true)});for(const name of Object.keys(js))v[name]=Function('env','with(env){return '+js[name]+'}')(env);
 // The renderer draws published resident chunks of its geometry owner on the
 // page store (shared resident-chunk-scene support): one chunk over the full
 // fixture index range, anchored at the fixture's global frame.
 // Closures and imports this fixture neither extracts above nor stubs come from
 // the actual renderer (lazily, like the shared reflection fixture), so newer
 // main-frame witnesses and source-part helpers are production code.
 await installRendererImports('tier300',v);installLazyRendererClosures(text,v);
 // The resident main-program target is a constant accessor object over the
 // renderer's own program/family/texture locals: evaluate the actual one.
 v.residentMainPrograms=await evaluateBridge(bridgeBinding(text,'residentMainPrograms'),v);
 // Published diffuse needs start from the renderer's declared empty value.
 v.publishedDiffuseNeeds=await evaluateBridge(bridgeBinding(text,'publishedDiffuseNeeds'),v);
 const store=createFixtureResourceStore(sceneRuntime,g),scene=installResidentChunkScene(v,{provider:'tier300',runtime:sceneRuntime,gl:g,store,ownerName:'geometryOwner'});
 await preparedPaintPlan('tier300',text,v);t.after(()=>{v.preparedDataFixture.release();scene.release();});
 // The module-owned immutable Tier300 source authority, created by the same
 // production program-preparation module as the owner that validates it.
 v.tierProgramSourceAuthority=await evaluateBridge(bridgeBinding(text,'tierProgramSourceAuthority'),{...v,createProgramSourceAuthority:preparationHelpers.createProgramSourceAuthority});
 const f={provider:'tier300',values:v,v,g,draws,compiled,sources,deleted,driverShaders,base},actualCompile=v.compileGeometryProgram,driverHooks=Object.fromEntries(['createShader','shaderSource','compileShader','getShaderParameter','getShaderInfoLog','createProgram','attachShader','detachShader','bindAttribLocation','linkProgram','getExtension','getProgramParameter','getProgramInfoLog','deleteShader','deleteProgram'].map(name=>[name,g[name]]));
 installAsyncProgramCompiler(f,[]);Object.assign(g,driverHooks);v.compileGeometryProgram=actualCompile;
 Object.assign(v,{geometryUploadPending:false,needsBirth:false,birth:new Map(),reflectionObjectID:bridgeReflection.createResidentReflectionObjects(),reflectionClipUniforms:bridgeReflection.createResidentReflectionUniforms()});v.captureRuntime=captureHelpers.createResidentCaptureRuntime(v.residentCaptureAdapter());
 f.linked=work=>{for(let turn=0;turn<200;turn++){try{const result=work();if(result!==undefined&&result!==false)return result;}catch(error){if(!v.isProgramPreparationPending(error))throw error;}f.advancePreparation();}assert.fail('bounded program preparation did not finish');};f.until=ready=>{for(let turn=0;turn<200;turn++){f.draws.length=0;v.render(g,I);if(ready())return;f.advancePreparation();}assert.fail('bounded renderer preparation did not finish');};
 // Observation granularity under the shared scheduler: render admits every
 // missing required family at once and one full drain links them all, so
 // per-family readiness is observed one scheduler step at a time (one queued
 // dispatch per step), rendering after each step exactly as f.until does.
 f.untilStep=ready=>{for(let turn=0;turn<200;turn++){f.draws.length=0;v.render(g,I);if(ready())return;f.advancePreparation(true);}assert.fail('bounded single-step renderer preparation did not finish');};return f;}

function setFullResidentRange(v){v.loaded=new Map([['fixture-resident',{city:v.city,objectId:'shader-fixture',partId:'complete-index-range',start:0,end:v.indices.length,box:[-.1,-.1,-.1,.1,.1,.1]}]]);}

function completeFrame(f){for(let frame=0;frame<f.v.familyRuns.length*3+10;frame++){f.draws.length=0;f.v.render(f.g,I);const override=f.v.overrideProgramKey();if(f.v.familyRuns.every(r=>(override??r.key)===policy.currentPaintProgramKey(0)||f.v.familyPrograms.has(override??r.key)))return;f.advancePreparation();}assert.fail('current resident materials did not finish bounded asynchronous preparation');}

let scopedTier300API;
async function scopedTier300Fixture(t){
 if(!scopedTier300API){
  const entries=['safety/frozen-data-scope','safety/frozen-data-lease-store','painted/tier300/safety/tier300-prepared-data-plan','painted/tier300/safety/progressive-paint','painted/tier300/safety/progressive-paint-admissions','painted/tier300/safety/progressive-feature-cities','painted/tier300/safety/progressive-native-signature'];
  const output=await build({stdin:{contents:entries.map(name=>'export * from '+JSON.stringify('./src/'+name+'.ts')+';').join('\n'),resolveDir:web,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'no-installed-city-profile',setup(b){b.onLoad({filter:/\/safety\/frozen-paint-tables\.ts$/},()=>({contents:'export function frozenPaintTableRowCounts(){return {};}',loader:'js'}));}}]});
  scopedTier300API=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));
 }
 const api=scopedTier300API,components=['part-b','part-a'].map(partId=>({city:'berlin',objectId:'osm/way/9917',partId,origin:[13,52],componentGeometry:{type:'Polygon',coordinates:[[[13,52],[13.00001,52],[13,52.00001],[13,52]]]},sourceFeature:{properties:{fixture:'tiny scoped Tier300'}},batches:[{faceRole:'wall',positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2],color:[.1,.2,.3]}]}));
 const admissions=components.map((component,i)=>({city:component.city,objectId:component.objectId,partId:component.partId,origin:component.origin,descriptionSHA256:'d'.repeat(64),tier:300,mode:'native',family:4111+i,geometrySignature:api.nativePaintSignature(component),wallColor:i?[.6,.5,.4]:[.3,.4,.5],surfaceFrames:[{batchIndex:0,firstVertex:0,vertexCount:3,family:4111+i,uAxis:[1,0,0],vAxis:[0,1,0],uOrigin:0,vOrigin:0,height:1,width:1}]}));
 const extra='vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(family==4111.)return base*.75;return base;}';
 const resources=[{ref:api.PROGRESSIVE_ADMISSIONS_RESOURCE,value:admissions},{ref:api.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,value:{berlin:extra}}].map(row=>{const bytes=new TextEncoder().encode(JSON.stringify(row.value)),sha=createHash('sha256').update(bytes).digest('hex');return{...row,bytes,sha,path:'/safety/buildings3d/painted-tables/'+sha.slice(0,2)+'/'+sha+'.json'};});
 const store=api.createFrozenDataLeaseStore(resources.map(row=>({path:row.path,sha256:row.sha,bytes:row.bytes.length}))),reads=[];
 const client=store.client({city:'berlin',profileSHA256:null,provider:'tier300',selection:{tables:resources.map(row=>row.sha),initializers:Object.fromEntries(resources.map(row=>[row.sha,{[row.ref.file]:1}]))},resolve(canonical,file,occurrence){const row=resources.find(row=>row.ref.canonicalSHA256===canonical&&row.ref.file===file&&row.ref.occurrence===occurrence);assert.ok(row,'exact canonical/file/occurrence binding');return row.sha;},async read(path,signal,max){signal.throwIfAborted();const row=resources.find(row=>row.path===path);assert.ok(row);assert.equal(max,row.bytes.length);reads.push(row.ref.file);return row.bytes;}});
 const scope=api.createFrozenDataScope(client);
 t.after(()=>{scope.release();client.dispose();store.destroy();});
 return{api,scope,store,reads,components,admissions,extra,resources};
}

test('actual Tier300 scoped data preserves full ordered part admissions and unavailable preparation',async t=>{
 const f=await scopedTier300Fixture(t),signal=new AbortController().signal,before=JSON.stringify(f.components);
 assert.throws(()=>f.api.getPROGRESSIVE_ADMISSIONS(),/scope/i);
 assert.throws(()=>f.api.progressivePaintData(f.components),/scope/i);
 assert.equal(f.api.progressivePaintCount(),undefined,'missing profile/scope is unavailable, not a fabricated zero');
 assert.throws(()=>f.api.getPROGRESSIVE_ADMISSIONS(f.scope),/not prepared/);
 await f.api.prepareTier300Data([],'berlin',signal,f.scope);assert.deepEqual(f.reads,[]);
 await assert.rejects(f.api.prepareTier300Data(f.components,'bremen',signal,f.scope),/city mismatch/);assert.deepEqual(f.reads,[]);
 await f.api.prepareTier300Data(f.components,'berlin',signal,f.scope);
 assert.equal(f.reads.length,2);assert.equal(f.scope.stats.resources,2);
 assert.deepEqual(f.api.getPROGRESSIVE_ADMISSIONS(f.scope),f.admissions,'full cohort and canonical order survive; one shared raw object ID is not a row limit');
 const colours=f.api.progressivePaintData(f.components,f.scope),frames=f.api.applyProgressiveFrames(f.components,new Float32Array(30),f.scope);
 for(let i=0;i<2;i++)for(let vertex=0;vertex<3;vertex++){
  assert.deepEqual(colours.slice((i*3+vertex)*4,(i*3+vertex+1)*4),new Float32Array([...f.admissions[i].wallColor,1]));
  const [u,v]=f.components[i].batches[0].positions.slice(vertex*3,vertex*3+2);
  assert.deepEqual(frames.slice((i*3+vertex)*5,(i*3+vertex+1)*5),new Float32Array([u,v,1,1,4111+i]));
 }
 assert.deepEqual(f.api.progressiveRenderStatus(f.scope).map(row=>row.partId),['part-b','part-a']);
 assert.equal(f.api.progressivePaintCount(f.scope),2);assert.equal(f.api.progressivePaintCityCount(f.scope),2);
 assert.equal(f.api.progressiveAdmission({...f.components[0],partId:'other-part'},f.scope),undefined);
 assert.equal(JSON.stringify(f.components),before,'source geometry, IDs and order remain unchanged');
});

test('actual Tier300 plan reuses one scoped assembled source and clears working source before lease release',async t=>{
 const f=await scopedTier300Fixture(t),plan=f.api.createTier300PreparedDataPlan({scope:f.scope,city:'berlin',id:91}),signal=new AbortController().signal;
 t.after(()=>plan.release());
 plan.prepareMetadata();assert.equal(plan.specialization.fragmentBytes,null);assert.equal(plan.specialization.fullFragmentBytes,null);assert.equal(f.reads.length,0,'metadata query does not acquire source data');assert.throws(()=>plan.prepareMaterialSource(),/not prepared/);
 await f.api.prepareTier300Data(f.components,'berlin',signal,f.scope);
 plan.prepareMetadata();assert.equal(plan.specialization.city,'berlin');
 const recipe={sourceKey:'base',inputs:[f.scope],assemble:paint=>'#version 300 es\nprecision highp float;\n'+paint+'\nuniform float u_fixture_family;void main(){vec3 c=paintedFacade(vec3(.2),vec3(0.),vec3(0.,0.,1.),vec4(0.,0.,1.,1.),u_fixture_family);}'};
 const first=plan.prepareSource(recipe,[4111]),second=plan.prepareSource(recipe,[4112]);
 assert.ok(first.fragment.includes('void main()'));assert.ok(second.fragment.includes('void main()'));
 // Tier300 supplies its own specializer (specializeCurrentPaintFragment and
 // paintedFacadeDepthEffects per family), so the shared workspace performs no
 // family-paint analysis of its own: analyses stay 0 while the one assembled
 // source is built once and the second family is a cache hit.
 assert.deepEqual({builds:plan.preparedSourceStats.builds,analyses:plan.preparedSourceStats.analyses,hits:plan.preparedSourceStats.hits},{builds:1,analyses:0,hits:1});
 assert.ok(plan.preparedSourceStats.sourceCharacters>0);
 const resources=f.scope.stats.resources;
 plan.clearPreparedSource();assert.equal(plan.preparedSourceStats.sourceCharacters,0);assert.equal(plan.preparedSourceStats.released,false);assert.equal(f.scope.stats.resources,resources);
 const unpin=f.scope.retain();f.scope.release();
 plan.prepareSource(recipe,[4111]);assert.equal(plan.preparedSourceStats.builds,2);assert.equal(plan.preparedSourceStats.analyses,0);
 assert.deepEqual(f.api.getPROGRESSIVE_ADMISSIONS(f.scope),f.admissions,'source clearing leaves valid published scope inputs intact');
 plan.release();assert.equal(plan.preparedSourceStats.sourceCharacters,0);assert.equal(plan.preparedSourceStats.released,true);assert.throws(()=>plan.prepareSource(recipe,[4111]),{name:'AbortError'});
 unpin();assert.equal(f.scope.stats.disposed,true);assert.equal(f.store.stats.valueCells,0);
});

test('final runs follow provoking Float32 family, encoded normalization, fractional repairs and original index order',()=>{const families=[4912,21101.2,21201,21202,21203,44190,2000001,-98,0],paint=new Float32Array(families.length*3*5),indices=Uint32Array.from({length:families.length*3},(_,i)=>i);families.forEach((f,i)=>{paint[(i*3)*5+4]=999;paint[(i*3+1)*5+4]=888;paint[(i*3+2)*5+4]=f;});const before=indices.slice(),runs=paintProgramRuns(indices,paint,policy.currentPaintProgramKey,false);assert.deepEqual(indices,before);assert.equal(runs.reduce((n,r)=>n+r.indexCount,0),indices.length);assert.deepEqual(runs.map(r=>r.firstIndex),families.map((_,i)=>i*3));assert.deepEqual(runs.map(r=>policy.currentPaintProgramFamily(r.key)),families.map(f=>f>=1e6?Math.floor(Math.fround(Math.fround(f)/10000)):Math.fround(f)));// Runs are now derived per packed chunk: packBatches hands the chunk packer
 // its material pass (repairs such as the Zeughaus court) and the run builder;
 // the shared packer builds runs only after materials and the final indices.
 const pack=nodes.get('packBatches'),materials=nodes.get('packTierChunkMaterials');
 assert(pack.includes('runs:(indices,paint)=>paintProgramRuns(indices,paint,currentPaintProgramKey,false)'));assert(pack.includes('materials:(rows,signal)=>packTierChunkMaterials('));assert(materials.includes('applyBEZeughausCourt1('));
 // The actual resumable producer's packing order and cross-step run joins
 // are covered by chunk-mesh-packing-steps.test.mjs, not old source spellings.
});
test('main paint draws only matching full programs, reuses cached families and honors Float32 overrides',async t=>{const f=await fixture(t);completeFrame(f);assert.equal(f.compiled.length,2);assert.deepEqual(f.draws.map(x=>[x.count,x.offset]),[[6,0],[6,24]]);assert(f.draws.every(x=>x.program!==f.base));assert(f.draws[0].program.fragment.includes('family=4912'));assert(f.draws[1].program.fragment.includes('family=21101'));f.v.render(f.g,I);assert.equal(f.compiled.length,2);f.v.paintOverride=()=>.0100000001;f.v.render(f.g,I);assert.equal(f.compiled.length,2);for(const value of [-3,21101.2,1000001.25]){f.v.paintOverride=()=>value;f.draws.length=0;completeFrame(f);assert.equal(f.draws.length,2);assert(f.draws.every(d=>d.program.fragment.includes('family='+Math.fround(value))));}assert.equal(f.compiled.length,5);});
// Mode one draws through the source window texture. Its textured program is
// prepared through the renderer's own main preparation (needsWindow: mode one,
// visible landmark, a window texture and the source surface helper), so the
// texture double carries the stats that preparation and binding readiness
// read; a pre-installed stand-in program would be released as not demanded.
function windowTextureDouble(wrapped){return{stats:{ready:true,loading:false,error:undefined,residentRevision:'window-ready',textureObjects:1},isResident:()=>true,withTexture(_g,_p,draw){wrapped();draw();},setEnabled(){},attach(){},detach(){},setPageHidden(){},destroy(){}};}
function enableWindowTexture(f,wrapped){Object.assign(f.v,{landmarkVisible:true,surfaceFragment:'window helper',windowTexture:windowTextureDouble(wrapped)});}
// Paint-family programs are every linked program except the source window
// texture program (whose specialized fragment starts with its own helper).
const paintFamilyPrograms=f=>f.compiled.filter(p=>!String(p.fragment).startsWith('window helper'));
test('mode zero/one retains base and source texture wrappers without compiling paint families',async t=>{const f=await fixture(t);f.v.paintMode=()=>0;f.v.render(f.g,I);assert.equal(f.compiled.length,0);assert.equal(f.draws[0].program,f.base);let wrappers=0;f.v.paintMode=()=>1;enableWindowTexture(f,()=>wrappers++);f.until(()=>!!f.v.texturedProgram);assert.equal(f.compiled.length,1,'only the source window texture program links');assert.equal(f.compiled[0],f.v.texturedProgram);assert(f.v.texturedProgram.fragment.startsWith('window helper'));assert.equal(paintFamilyPrograms(f).length,0);wrappers=0;f.draws.length=0;f.v.render(f.g,I);assert.equal(wrappers,1);assert.equal(f.compiled.length,1);assert.equal(f.draws[0].program,f.v.texturedProgram);f.v.paintMode=()=>2;completeFrame(f);assert.equal(wrappers,1);assert.equal(paintFamilyPrograms(f).length,2);assert.equal(f.compiled.length,3);assert(f.draws.every(d=>d.program!==f.compiled[0]));});
test('omitted diagnostic spans intersect each run once and preserve total draw order',async t=>{const f=await fixture(t,{city:'dortmund'});f.v.progressiveDiagnostic='without-candidate';f.v.diagnosticParams=new URLSearchParams('sample=progressive-dortmund-30319077');f.v.loaded.set('osm/way/1560907616|osm/way/1560907616/component/c87db3a22f0446da7c25',{start:3,end:9,box:[-.1,-.1,-.1,.1,.1,.1]});completeFrame(f);assert.deepEqual(f.draws.map(d=>[d.count,d.offset]),[[3,0],[3,36]]);});
test('inactive target16 protects active programs; context release clears ownership and later demand recompiles',async t=>{const f=await fixture(t),active=new Set();f.v.indices=new Uint32Array(60);setFullResidentRange(f.v);f.v.familyRuns=Array.from({length:20},(_,i)=>({key:policy.currentPaintProgramKey(4000+i),firstIndex:i*3,indexCount:3}));for(let i=0;i<20;i++){const key=policy.currentPaintProgramKey(4000+i);active.add(key);f.linked(()=>f.v.familyProgram(key));}f.v.trimFamilyPrograms(active);assert.equal(f.v.familyPrograms.size,20);assert.equal(f.deleted.length,0);f.v.trimFamilyPrograms(new Set([policy.currentPaintProgramKey(4000)]));assert.equal(f.v.familyPrograms.size,16);assert(f.v.familyPrograms.has(policy.currentPaintProgramKey(4000)));const old=[...f.v.familyPrograms.values()];f.v.releaseGPU();assert.equal(f.v.familyPrograms.size,0);for(const p of old)assert.equal(f.deleted.filter(x=>x===p).length,1);f.v.program=f.base;f.linked(()=>f.v.familyProgram(policy.currentPaintProgramKey(4000)));assert.equal(f.compiled.length,21);});
test('paint to mode zero/one trims newly inactive excess and restores demanded full materials on return',async t=>{for(const mode of [0,1]){const f=await fixture(t);f.v.indices=new Uint32Array(60);setFullResidentRange(f.v);f.v.familyRuns=Array.from({length:20},(_,i)=>({key:policy.currentPaintProgramKey(4000+i),firstIndex:i*3,indexCount:3}));completeFrame(f);assert.equal(f.v.familyPrograms.size,20);assert.equal(f.compiled.length,20);const revision=f.v.reflectionResidentRevision;let textureDraws=0;enableWindowTexture(f,()=>textureDraws++);f.v.paintMode=()=>mode;f.draws.length=0;f.v.render(f.g,I);assert.equal(f.v.familyPrograms.size,16);assert.equal(f.deleted.length,4);assert.equal(f.compiled.length,20);assert(f.v.reflectionResidentRevision>revision);assert.deepEqual(f.draws.map(d=>[d.count,d.offset]),[[60,0]]);
  // Mode one prepares its source window program asynchronously (one link), then draws through the texture wrapper; mode zero never does.
  if(mode===1){f.until(()=>!!f.v.texturedProgram);assert.equal(f.compiled.length,21);textureDraws=0;f.draws.length=0;f.v.render(f.g,I);assert.deepEqual(f.draws.map(d=>[d.count,d.offset,d.program]),[[60,0,f.v.texturedProgram]]);}else{f.until(()=>true);assert.equal(f.v.texturedProgram,undefined);}assert.equal(textureDraws,mode===1?1:0);assert.equal(f.v.familyPrograms.size,16);assert.equal(f.deleted.length,4);f.v.paintMode=()=>2;completeFrame(f);assert.equal(f.v.familyPrograms.size,20);assert.equal(paintFamilyPrograms(f).length,24);assert.equal(f.compiled.length,24+mode);assert.equal(f.draws.length,20);assert(f.draws.every(d=>d.program!==f.base&&d.program!==f.v.texturedProgram));}});
test('compiler specializes the complete assembled source for each helper and retains reflection injection',async t=>{const f=await fixture(t);for(const [helper,family]of [['base helper',4912],['window helper',0],['diffuse helper',0]]){if(family===0){f.v.paintMode=()=>1;f.v.landmarkVisible=true;f.v.facadeAttached=true;f.v.surfaceFragment='window helper';f.v.diffuseFragment='diffuse helper';f.v.windowTexture={stats:{textureObjects:1}};f.v.diffuseTexture={stats:{totalTextureObjects:2}};}const p=f.linked(()=>f.v.compileGeometryProgram(helper,family));assert.equal(p.fragment,helper+'|'+FIXTURE_PAINT+'|family='+family+'|clip');assert.deepEqual(p.shaders,[],'Verified linked programs retain source metadata, not attached shader objects');}assert(f.driverShaders.every(shader=>shader.deleted&&shader.released&&shader.attachments.size===0));assert(f.sources.filter(x=>x==='same vertex').length===3);assert(!nodes.get('render').includes('familyPending'));});
// Private SHA-bound assembly hook avoids putting generated city payloads in Git.
if(process.env.CRIMEMAPS_TIER300_ASSEMBLED_REVIEW_MODULE)test('actual observed shader specializes without changing any retained material or outer-main function',async()=>{const {review}=await import(pathToFileURL(process.env.CRIMEMAPS_TIER300_ASSEMBLED_REVIEW_MODULE));const result=review(policy.specializeCurrentPaintFragment);assert.equal(result.originalCharacters,458469);assert.equal(result.originalFNV,'342bf593');assert.equal(result.retainedNonWrapperChanges,0);assert(result.maxProgressiveCharacters<135000);});


test('shared bounded preparation preserves ready run order while each required family finishes asynchronously',async t=>{
 const f=await fixture(t),key=policy.currentPaintProgramKey;f.v.indices=new Uint32Array(15);setFullResidentRange(f.v);const families=[4912,21101,4912,0,4913];f.v.familyRuns=families.map((family,i)=>({key:key(family),firstIndex:i*3,indexCount:3}));
 f.v.render(f.g,I);assert.equal(f.compiled.length,0,'render only admits work; it cannot synchronously link a missing family');
 // Atomic drain (shared scheduler, maxInFlight 2): render admits every
 // missing family at once and one scheduler step may link up to two queued
 // families together, so the observation is per scheduler step, not per
 // family, and a step can pass over the 4912-only state. That state is made
 // deterministic by staged admission (as in the CPU-pick test): the resident
 // runs first demand 4912 only (driven to ready; the replaced demand cancels
 // the other queued families before they link), then the original runs again.
 // After every step the ready families are a prefix of the run order, each
 // linked exactly once, at most maxInFlight linked families are not yet
 // published, and the frame draws exactly the base run plus the ready ranges
 // in original index order, never a substitute for a pending one.
 const runs=f.v.familyRuns;f.v.familyRuns=[{key:key(4912),firstIndex:0,indexCount:15}];f.until(()=>f.v.familyPrograms.has(key(4912)));assert.equal(f.compiled.length,1,'staging links 4912 only');assert(!f.sources.some(s=>s.includes('family=21101')||s.includes('family=4913')),'cancelled queued families build no source');f.v.familyRuns=runs;
 const order=[4912,21101,4913],seen=[];
 for(let turn=0;;turn++){
  assert(turn<200,'bounded shared preparation did not finish');f.draws.length=0;f.v.render(f.g,I);
  const ready=order.filter(family=>f.v.familyPrograms.has(key(family)));seen.push(ready.length);
  // The shared scheduler's context limit is two submitted links (the same
  // constant at HEAD; city-program-specialization asserts it too).
  const context=f.v.programPreparation.stats.context;assert.equal(context.maxInFlight,2);assert(context.inFlight<=1,"rendered frames never observe more than one submitted link");
  assert.deepEqual(ready,order.slice(0,ready.length),'families become ready in run order');assert(f.compiled.length>=ready.length&&f.compiled.length<=Math.min(order.length,ready.length+context.maxInFlight),'a linked family is published at the next render; at most maxInFlight linked families are unpublished; none links twice');assert.equal(new Set(f.compiled.map(p=>p.fragment)).size,f.compiled.length,'each required family links exactly once');
  assert.deepEqual(f.draws.map(d=>d.offset),families.flatMap((family,i)=>family===0||ready.includes(family)?[i*12]:[]),'ready ranges retain original index order');
  for(const draw of f.draws){const actual=families[draw.offset/12];assert.equal(draw.program===f.base,actual===0);if(actual)assert(draw.program.fragment.includes('family='+actual));}
  if(ready.length===order.length)break;f.advancePreparation(true);
 }
 assert.equal(seen[0],1,'the first frame after staging draws 4912 and base only (offsets 0, 24, 36)');assert.equal(f.compiled.length,order.length);
 const repaints=f.v.repaints;f.draws.length=0;f.v.render(f.g,I);assert.equal(f.compiled.length,3);assert.equal(f.draws.length,5);assert.equal(f.v.repaints,repaints,'settled preparation does not request another repaint');
});
test('pending demand follows resident replacement and the current Float32 override',async t=>{
 // Atomic drain: one render admits both required families (4912, 21101) and
 // one full drain would link both, so the replacement is observed while both
 // are still queued: no family source is built before its link.
 const f=await fixture(t),key=policy.currentPaintProgramKey;f.v.render(f.g,I);assert.equal(f.compiled.length,0);assert.equal(f.v.programPreparation.stats.pending,2);assert(!f.sources.some(s=>s.includes('family=')),'queued families build no source before their link');
 f.v.familyRuns=[{key:key(5000),firstIndex:0,indexCount:6},{key:key(4912),firstIndex:6,indexCount:6}];completeFrame(f);assert.equal(f.compiled.length,2);assert.equal(f.draws.length,2);assert(!f.v.familyPrograms.has(key(21101)));assert(!f.sources.some(s=>s.includes('family=21101')),'an unrequested old family never reaches shaderSource');
 f.v.paintOverride=()=>-3;completeFrame(f);assert.equal(f.compiled.length,3);assert.equal(f.draws.length,2);assert(f.draws.every(d=>d.program.fragment.includes('family=-3')));assert(!f.v.familyPrograms.has(key(21101)));
});
test('disabled hidden empty lost and destroyed renders admit no new work; restored demand starts fresh',async t=>{
 const f=await fixture(t),key=policy.currentPaintProgramKey;f.v.familyRuns=[{key:key(4912),firstIndex:0,indexCount:12}];completeFrame(f);assert.equal(f.compiled.length,1);assert.equal(f.v.programPreparation.stats.pending,0);const repaints=f.v.repaints;
 for(const field of ['enabled','pageHidden','destroyed']){const old=f.v[field];f.v[field]=field!=='enabled';f.v.render(f.g,I);f.v[field]=old;assert.equal(f.compiled.length,1);assert.equal(f.v.repaints,repaints);}
 f.v.residentGPU.emptyFrame=()=>true;f.v.render(f.g,I);f.v.residentGPU.emptyFrame=()=>false;assert.equal(f.compiled.length,1);f.g.lost=true;f.v.render(f.g,I);assert.equal(f.compiled.length,1);f.v.releaseGPU();assert.equal(f.v.familyPrograms.size,0);
 f.v.familyRuns=[{key:key(5001),firstIndex:0,indexCount:6},{key:key(5002),firstIndex:6,indexCount:6}];f.g.lost=false;f.v.program=f.base;f.v.vao={};
 // Atomic drain: the restored demand admits both families at once and one
 // scheduler step may link both, so the restored state is checked after every
 // step: ready families are a prefix of the run order, each links exactly once
 // after the one pre-teardown link, and only ready ranges draw; neither
 // pre-teardown family (4912, 21101) returns.
 const order=[5001,5002];for(let turn=0;;turn++){assert(turn<200,'bounded restored preparation did not finish');f.draws.length=0;f.v.render(f.g,I);const ready=order.filter(family=>f.v.familyPrograms.has(key(family)));assert.deepEqual(ready,order.slice(0,ready.length));assert.equal(f.compiled.length,1+ready.length);assert.equal(f.draws.length,ready.length);assert(!f.v.familyPrograms.has(key(4912)));assert(!f.v.familyPrograms.has(key(21101)));if(ready.length===order.length)break;f.advancePreparation(true);}
 assert.equal(f.compiled.length,3);assert.equal(f.draws.length,2);
});
test('pending reflection draws only ready exact programs, remains incomplete and never compiles',async t=>{
 const f=await fixture(t),key=policy.currentPaintProgramKey,families=[4912,21101];f.v.loaded.clear();
 // The resident chunk scene keys its local components by identity (as the
 // renderer's captureChunkComponents looks them up): the two fixture
 // components carry distinct identities so capture plans them separately.
 f.v.loaded.set('first',{city:f.v.city,objectId:'reflection-first',partId:'a',start:0,end:6,box:[-.1,-.1,-.1,.1,.1,.1]});f.v.loaded.set('second',{city:f.v.city,objectId:'reflection-second',partId:'b',start:6,end:12,box:[-.1,-.1,-.1,.1,.1,.1]});const pass={gl:f.g,mainMatrix:I,clipPlaneWorldZ:0,maxTriangles:4,maxDraws:2};
 // Atomic drain: one render admits both families and one scheduler step may
 // link both together, so the partially ready state (4912 linked, 21101 still
 // pending) is made deterministic by staged admission as in the CPU-pick test:
 // the resident runs first demand 4912 only (driven to ready), then both again.
 // Reflection is then checked after every remaining step while main
 // preparation runs: it draws exactly the ready ranges in order with their
 // exact programs, stays incomplete ('plan:missing-program') while any family
 // is pending, and never compiles. The partially ready state must be observed.
 const runs=f.v.familyRuns;f.v.familyRuns=[{...runs[0],indexCount:12}];f.until(()=>f.v.familyPrograms.has(key(4912)));assert(!f.v.familyPrograms.has(key(21101)));const staged=f.compiled.length;assert.equal(staged,1,'staging links 4912 only');f.v.familyRuns=runs;
 const order=[4912,21101],observed=[];let partial=0;
 for(let turn=0;;turn++){assert(turn<200,'bounded main preparation did not finish');f.v.render(f.g,I);const ready=order.filter(family=>f.v.familyPrograms.has(key(family)));assert.deepEqual(ready,order.slice(0,ready.length));if(ready.length===order.length)break;observed.push(ready.length);
  const compiled=f.compiled.length;f.draws.length=0;assert.deepEqual(f.v.renderPlanarReflection(pass),{triangles:2*ready.length,draws:ready.length,complete:false,reason:'plan:missing-program',pending:true});assert.equal(f.compiled.length,compiled,'reflection never compiles');assert.deepEqual(f.draws.map(d=>d.offset),[0,24].slice(0,ready.length));for(const draw of f.draws){assert.notEqual(draw.program,f.base);assert(draw.program.fragment.includes('family='+families[draw.offset/24]));}partial++;f.advancePreparation(true);}
 assert.equal(observed[0],1,'the first reflection after staging sees 4912 ready and 21101 pending');
 assert(partial>0,'reflection was observed while main preparation was pending');completeFrame(f);f.draws.length=0;assert.deepEqual(f.v.renderPlanarReflection(pass),{triangles:4,draws:2,complete:true});assert.equal(f.compiled.length,2);assert.deepEqual(f.draws.map(d=>d.offset),[0,24]);
});

test('CPU pick gates pending triangles using the final provoking Float32 family and override',async t=>{
 const f=await fixture(t),key=policy.currentPaintProgramKey;f.v.render(f.g,I);assert.equal(f.v.isPaintFamilyReady(4912),false);assert.equal(f.v.isPaintFamilyReady(21101),false);
 // Atomic drain: one render admits both families and the shared scheduler
 // may link them in one step, so a 4912-ready / 21101-pending state is made
 // deterministic by staging admission: the resident runs first demand 4912
 // only (driven to ready), then demand both again; that render admits 21101
 // without linking it (render never links synchronously).
 const runs=f.v.familyRuns;f.v.familyRuns=[{...runs[0],indexCount:12}];f.until(()=>f.v.familyPrograms.has(key(4912)));assert(!f.v.familyPrograms.has(key(21101)));f.v.familyRuns=runs;f.v.render(f.g,I);assert(!f.v.familyPrograms.has(key(21101)));
 assert.equal(f.v.isPaintFamilyReady(4912),true);assert.equal(f.v.isPaintFamilyReady(21101),false);assert.equal(f.v.isPaintFamilyReady(0),true);
 f.v.familyPrograms.set(key(200),{id:'encoded'});assert.equal(f.v.isPaintFamilyReady(Math.fround(2000001)),true);assert.equal(f.v.isPaintFamilyReady(Math.fround(21101.2)),false);f.v.paintOverride=()=>-3;assert.equal(f.v.isPaintFamilyReady(4912),false);f.v.familyPrograms.set(key(-3),{id:'override'});assert.equal(f.v.isPaintFamilyReady(21101),true);

 for(const mode of [0,1]){f.v.paintMode=()=>mode;assert.equal(f.v.isPaintFamilyReady(21101),true);}
 assert(text.includes('const triangleIds=[indices[i],indices[i+1],indices[i+2]];if(!isPaintFamilyReady(paintData[triangleIds[2]*5+4]))continue;'));
});

test('fake GL defers attached shader deletion until detach and preserves linked fragment metadata',async t=>{
 const f=await fixture(t),g=f.g,p=g.createProgram(),shader=g.createShader(g.FRAGMENT_SHADER);g.shaderSource(shader,'linked fragment snapshot');g.attachShader(p,shader);g.linkProgram(p);g.deleteShader(shader);assert.equal(shader.deleted,true);assert.equal(shader.released,false);assert.deepEqual(p.shaders,[shader]);assert.equal(shader.attachments.has(p),true);g.detachShader(p,shader);assert.deepEqual(p.shaders,[]);assert.equal(shader.attachments.size,0);assert.equal(shader.released,true);assert.equal(shader.text,undefined);assert.equal(p.fragment,'linked fragment snapshot');
 const other=g.createProgram(),attached=g.createShader(g.VERTEX_SHADER);g.attachShader(other,attached);g.deleteShader(attached);assert.equal(attached.released,false);g.deleteProgram(other);assert.deepEqual(other.shaders,[]);assert.equal(attached.released,true);assert.equal(attached.attachments.size,0);assert.equal(other.released,true);
});
