import {createResidentCaptureOwnership} from './support/fixtures-managers-b-renderer-runtime.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {resourceContentKey,resourceContentKeys} from './support/resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],key=row=>row.objectId+'|'+row.partId;
const resourceKeyModule={exports:{}};
Function('exports','require',ts.transpileModule(fs.readFileSync(new URL('../src/safety/renderer-chunk-input.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(resourceKeyModule.exports,id=>{assert.equal(id,'./resource-content-key');return resourceContentKeys;});
const {indexedResourceKey}=resourceKeyModule.exports;
const runtime=createSourceModules();
const indices=runtime.load('safety/render-runtime/resident-index-convention');
const drawRanges=runtime.load('safety/render-runtime/resident-draw-range');
const {currentPaintProgramGroups}=runtime.load('safety/current-paint-program-groups');
const {partitionProgramFamilies}=runtime.load('safety/partition-program-groups');
const {BUILDING_SURFACE_FRAGMENT_GLSL}=runtime.load('painted/bremen/safety/building-surface-style');
function functions(provider,names){
 const text=fs.readFileSync(new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider,text,ts.ScriptTarget.Latest,true),found=new Map();
 const walk=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));ts.forEachChild(node,walk);};walk(ast);
 for(const name of names)assert(found.has(name),provider+' '+name);
 return [...found.values()].join('\n');
}
function fixture(provider){
 const draws=[],writes=[],coverage=[],programs=[],requests=[],uploads=[];let vao,buffer,matrix,revision=8;
 const gl={ARRAY_BUFFER:1,ARRAY_BUFFER_BINDING:2,TRIANGLES:3,UNSIGNED_INT:4,DEPTH_TEST:5,LEQUAL:6,CULL_FACE:7,BLEND:8,SRC_ALPHA:9,ONE_MINUS_SRC_ALPHA:10,ONE:11,
  isContextLost:()=>false,getParameter:()=>buffer,bindBuffer:(_target,value)=>{buffer=value;},bufferSubData:(_target,offset,data)=>writes.push({buffer,offset,data:[...data]}),bindVertexArray:value=>{vao=value;},getUniformLocation:(_p,name)=>name,uniformMatrix4fv:(_p,_transpose,value)=>{matrix=[...value];},uniform1f(){},uniform2f(){},useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},drawElements(_kind,count,_type,offset){assert(offset/4+count<=(vao?.indexCount??3),'draw count stays within the bound index buffer');draws.push({vao,count,offset,matrix});},
 };
 const makeChunk=(n,scale)=>{
  const row={objectId:'osm/way/'+n,partId:'part/'+n,generation:1,box:[0,0,0,1,1,1],firstVertex:0,lastVertex:3,start:0,end:3,batches:[]},state=new Float32Array([1,1,1]);
  const packed={contentKey:'chunk-'+n,anchor:[.5+n*.001,.5],frame:{unit:scale},indices:new Uint32Array([0,1,2]),vertices:new Float32Array(27),paint:new Float32Array(15),progressive:new Float32Array(12)};
  const masks={pins:0,residentRevision:n,withResidentMasks(_gl,_p,run){run();return true;},retain(){this.pins++;let live=true;return{...this,release:()=>{if(live){live=false;this.pins--;}}};}};
  return{contentKey:packed.contentKey,anchor:[...packed.anchor],unit:scale,source:{frame:{unit:scale,origin:[8,53]}},cpu:{contentKey:packed.contentKey,value:packed,state:'ready',release(){}},state:{value:state,state:'ready'},stateData:state,dynamic:{value:state},loaded:new Map([[key(row),row]]),masks,shadowIndices:new Uint32Array(),shadowIndexCount:0,geometry:{contentKey:'view-'+n,value:{vao:{n},buffers:new Map(['vertex','static','state','paint','progressive'].map(type=>[type,{n,type}]))}},runs:[{firstIndex:0,indexCount:3,key:'base'}]};
 };
 const chunks=[makeChunk(1,1000),makeChunk(2,2000)],loaded=new Map(chunks.map((chunk,i)=>{const row=[...chunk.loaded.values()][0];return[key(row),{...row,start:3*i,end:3*i+3,firstVertex:3*i,lastVertex:3*i+3}];})),spans=chunks.map((chunk,i)=>({chunk,firstIndex:3*i,indexCount:3,localFirstIndex:0}));
 const owner={scene:{get version(){return revision;}},pins:0,capture(){this.pins++;let live=true;return{version:revision,leases:chunks.map(c=>c.geometry),release:()=>{if(live){live=false;this.pins--;}}};}};
 const scope={pins:0,retain(){this.pins++;let live=true;return()=>{if(live){live=false;this.pins--;}};}};
 const store={acquire(request){requests.push(request);if(this.failAt===requests.length)throw Error('shadow budget exhausted');const value=request.produce();return{contentKey:request.contentKey,value,release(){}};}};
 const shadowOwner={scene:{version:4},currentLeases:[],currentGeometries:[],allocate(_gl,_p,plan){uploads.push(plan);return{contentKey:plan.contentKey,value:{vao:{shadow:uploads.length,indexCount:plan.indices.length}},release(){}};},publish(leases){this.currentLeases=leases;this.currentGeometries=leases.map(l=>l.value);return true;},capture:owner.capture.bind(owner)};
 const program={},preparation={deferShadow:false,failShadow:false,work(_gl,request){if(this.failShadow)throw Error('controlled shadow replacement failure');if(this.deferShadow)return false;request.work();return true;},retainProgram(_gl,value){programs.push(value);let live=true;return()=>{if(live){live=false;programs.splice(programs.indexOf(value),1);}};}};
 const drawName=provider==='bremen'?'drawBremenSceneRange':provider==='tier300'?'drawTierSceneRange':'drawSceneRange';
 const names=['multiply','localComponent','sceneIndexCount','sceneShadowIndexCount',drawName,'drawProjectedShadows','residentCaptureAdapter','paintSelection',...(provider==='bremen'?['solarIndexCosts','uploadChunkState','captureChunkComponents','captureChunkRuns','sceneUploadedShadowIndexCount']:provider==='tier300'?['uploadState','writeSelectionState','captureChunkComponents','captureChunkRuns','retryLostCandidateChunks']:['uploadState','writeSelectionState','writeChunkSelection','chunkForComponent']),...(provider==='church'?['setChunkShadowRanges','updateSolarShadowIndices']:['updateSolarShadowIndices','uploadShadow'])];
 const bindings={...indices,...drawRanges,activeMainFrame:undefined,createResidentCaptureOwnership,resourceContentKey,indexedResourceKey,key,sceneChunks:chunks,sceneSpans:spans,loaded,gl,vao:{},geometryOwner:owner,shadowGeometryOwner:shadowOwner,program,shadowProgram:program,programPreparation:preparation,
  geometryUploadPending:false,geometryUploadFailure:undefined,mainGeometryProgramFailure:undefined,mainProgramFailure:undefined,materialSourceFailure:undefined,candidateFailure:undefined,contextRecoveryFailure:undefined,
  destroyed:false,pageHidden:false,enabled:true,opacity:1,opacityContext:'normal',needsBirth:false,birth:new Map(),selectedIdentity:undefined,selectionActive:true,sceneSun:{shadowVector:[1,1]},sceneEnvironment:{sunlight:true,shadows:true},sceneSunOrigin:[8,53],anchorUnit:1000,materialAnchor:[.5,.5],materialUnit:1000,matrix:new Float64Array(identity),candidateMainProjection:identity,mainWorldProjection:identity,mainWorldMatrix:identity,activeMainFrameVersion:8,activeMainFrame:undefined,
  currentDataScope:scope,residentData:{scope,chunkInput:{store}},packingData:undefined,sceneChunkDependencies:{store},sceneChunkBindings:{store},windowTexture:undefined,diffuseTexture:undefined,texturedProgram:undefined,diffuseProgram:undefined,facadeAttached:false,city:'leipzig',progressiveDiagnostic:undefined,paintMode:()=>2,paintOverride:()=>0,gpuReady:()=>true,
  solarCaptureRevision:()=>1,residentCaptureState:()=>({textureKind:0,runs:[{firstIndex:0,indexCount:6,program}]}),solarResidentKeys:()=>[],activeCaptureProgramKeys:()=>new Set(),solarProgramFailures:new Map(),partitionPrograms:new Map(),familyFailures:new Map(),reflectionCaptureFailures:new Map(),capturePreparation:undefined,
  reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},reflectionResidentRevision:0,captureStateRevision:0,surfaceContentRevision:0,map:{triggerRepaint(){}},
  solarShadowAdmittedKeys:new Set(),solarShadowAdmitted:0,solarShadowWithheld:0,solarShadowMode:'',solarShadowSignature:'',solarBoundary:{},generation:1,residentSolarShadowRanges:(_origin,rows)=>[...rows],shadowUploadPending:false,shadowPreparationSignature:'',shadowGeometryRevision:0,shadowDraws:0,shadowFailure:false,shadowVao:undefined,shadowIndexBuffer:undefined,shadowMask:{draw(_gl,matrix,height,run){coverage.push({matrix:[...matrix],height});run();return true;}},releaseShadowGPU(){for(const chunk of chunks){chunk.shadow=undefined;chunk.shadowIndexCount=0;}shadowOwner.currentLeases=[];shadowOwner.currentGeometries=[];},isProgramPreparationPending:()=>false,
  splitChunkRuns:(spans,chunk,runs)=>spans.filter(span=>span.chunk===chunk).flatMap(span=>runs.flatMap(run=>{const start=Math.max(span.firstIndex,run.firstIndex),end=Math.min(span.firstIndex+span.indexCount,run.firstIndex+run.indexCount);return end>start?[{...run,firstIndex:span.localFirstIndex+start-span.firstIndex,indexCount:end-start}]:[];})),fullColourFailure:undefined,
  releaseTierChunks(rows){for(const row of rows)row.released=true;},S402_SHADOW_VERTEX_GLSL:'vertex',S402_SHADOW_FRAGMENT_GLSL:'fragment',
 };
 const source=functions(provider,names)+`\nreturn {${names.join(',')},select(identity){selectedIdentity=identity;paintSelection();},changeScene(){sceneChunks=[];},clearSun(){sceneSun={};}};`,js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const api=new Function(...Object.keys(bindings),js)(...Object.values(bindings));
 const draw=(p,first,count)=>{
  if(provider==='bremen')return api[drawName](p,first,count);
  const batch=indices.createResidentTriangleDrawBatch(gl);
  try{return api[drawName](batch,p,first,count);}finally{batch.restore();}
 };
 return{...api,gl,draw,chunks,loaded,draws,writes,coverage,programs,requests,uploads,owner,scope,store,preparation,changeRevision(){revision++;}};
}
test('Church queries the provoking vertex once per multi-chunk main or shadow pass and restores the caller',()=>{
 const f=fixture('church'), modes=[];let mode=2,queries=0;
 const ext={FIRST_VERTEX_CONVENTION_WEBGL:1,LAST_VERTEX_CONVENTION_WEBGL:2,PROVOKING_VERTEX_WEBGL:3,
  provokingVertexWEBGL(next){mode=next;}};
 const getParameter=f.gl.getParameter, drawElements=f.gl.drawElements;
 f.gl.getParameter=key=>{if(key!==ext.PROVOKING_VERTEX_WEBGL)return getParameter(key);queries++;return mode;};
 f.gl.drawElements=(...args)=>{modes.push(mode);drawElements(...args);};
 for(const chunk of f.chunks){
  chunk.shadow={value:{vao:{indexCount:3}}};chunk.shadowIndexCount=3;
  for(const vao of [chunk.geometry.value.vao,chunk.shadow.value.vao]){
   const indexBuffer={};indices.markResidentFirstVertexBuffer(f.gl,indexBuffer,ext);indices.bindResidentIndexConvention(f.gl,vao,indexBuffer);
  }
 }
 assert.equal(f.draw({},0,6),true);
 assert.deepEqual(modes,[1,1]);assert.equal(mode,2);assert.equal(queries,1,'both main chunks share one driver query');
 f.drawProjectedShadows(.4);
 assert.deepEqual(modes,[1,1,1,1]);assert.equal(mode,2);assert.equal(queries,2,'shadow chunks share a separate query before compositing');
 f.gl.drawElements=()=>{throw Error('draw interrupted');};
 assert.throws(()=>f.drawProjectedShadows(.4),/draw interrupted/);assert.equal(mode,2,'failed shadow draws also restore the map convention');
});
for(const provider of ['bremen','tier300','church']){
 test(provider+' binds local offsets for two chunks and changes state only for the selected chunk',()=>{
  const f=fixture(provider);assert.equal(f.draw({},0,6),true);assert.deepEqual(f.draws.map(d=>[d.vao.n,d.count,d.offset]),[[1,3,0],[2,3,0]]);assert.equal(f.draws[0].matrix[0],Math.fround(.001));assert.equal(f.draws[1].matrix[0],Math.fround(.0005));
  f.select([...f.loaded.values()][1]);assert.deepEqual(f.writes.map(w=>w.buffer.n),[2]);f.select([...f.loaded.values()][1]);assert.equal(f.writes.length,1,'unchanged selection uploads no chunk');
 });
 test(provider+' freezes capture frames and holds every resource until its last consumer releases',()=>{
  const f=fixture(provider),snapshot=f.residentCaptureAdapter().snapshot(false);assert.equal(snapshot.status,'active');assert.deepEqual(snapshot.chunks.map(c=>c.runs[0].firstIndex),[0,0]);assert.deepEqual(snapshot.chunks.map(c=>c.components[0].order),[0,1]);
  const model=[...snapshot.chunks[1].matrix(identity)],retained=snapshot.retain('reflection');f.chunks[1].source.frame.unit=4000;f.chunks[1].cpu.value.frame.unit=4000;f.chunks[1].cpu.value.anchor[0]=.9;f.chunks[1].anchor[0]=.9;f.changeScene();assert.deepEqual([...snapshot.chunks[1].matrix(identity)],model);snapshot.release();assert.equal(f.owner.pins,1);assert.deepEqual(f.chunks.map(c=>c.masks.pins),[1,1]);assert.equal(f.programs.length,1);retained.release();retained.release();assert.equal(f.owner.pins,0);assert.deepEqual(f.chunks.map(c=>c.masks.pins),[0,0]);assert.equal(f.programs.length,0);assert.equal(f.scope.pins,0);
 });
 test(provider+' keeps shadow parents and composites the chunks in one coverage union at one world depth',()=>{
  const f=fixture(provider);
  if(provider==='church'){f.chunks.forEach(c=>{c.cpu.value.indices=new Uint32Array([0,1,2,0,1,2]);});f.setChunkShadowRanges([...f.loaded.values()]);f.chunks.forEach((c,i)=>{c.shadow={value:{vao:{shadow:i+1,indexCount:c.shadowIndices.length}}};c.shadowIndexCount=c.shadowIndices.length;});}
  else{assert(f.updateSolarShadowIndices());assert.equal(f.updateSolarShadowIndices(),false);f.uploadShadow();assert.equal(f.uploads.length,2);for(let i=0;i<2;i++){assert.strictEqual(f.uploads[i].parents[0],f.chunks[i].geometry);assert.strictEqual(f.uploads[i].parents[1],f.chunks[i].shadowCPU);}}
  assert.equal(f.requests.length,2);for(let i=0;i<2;i++){const request=f.requests[i],estimate=Array.isArray(request.estimate)?request.estimate:[request.estimate];assert.strictEqual(request.parents[0],f.chunks[i].cpu);assert.equal(estimate.filter(cost=>cost.category==='shadow').reduce((sum,cost)=>sum+cost.bytes,0),12);if(provider==='bremen'){const identity=estimate.find(cost=>cost.category==='metadata');assert.equal(identity.bytes,request.contentKey.length*2);assert.strictEqual(request.costs(f.chunks[i].shadowIndices).find(cost=>cost.category==='metadata'),identity,'shadow estimate and residence name the same independent key allocation');}}
  f.drawProjectedShadows(.4);assert.equal(f.coverage.length,1);assert.equal(f.draws.length,2);assert(Math.abs(f.draws[0].matrix[10]*0+f.draws[0].matrix[14])<1e-10);assert(Math.abs(f.draws[1].matrix[14]-.000015)<1e-10);
 });
}
test('bremen retains the published shadow counts while a larger replacement waits or fails',()=>{
 const f=fixture('bremen');assert(f.updateSolarShadowIndices());f.uploadShadow();assert.deepEqual(f.chunks.map(c=>c.shadowIndexCount),[3,3]);
 const prior=f.chunks.map(c=>c.shadow);
 // CPU preparation has a larger first subset and removes the second caster. Neither
 // change can affect a draw until the replacement GPU leases publish together.
 f.chunks[0].cpu.value.indices=new Uint32Array([0,1,2,0,1,2]);[...f.chunks[0].loaded.values()][0].end=6;[...f.chunks[1].loaded.values()][0].end=0;
 assert(f.updateSolarShadowIndices());assert.deepEqual(f.chunks.map(c=>c.shadowIndices.length),[6,0]);
 f.preparation.deferShadow=true;f.uploadShadow();f.drawProjectedShadows(.4);assert.deepEqual(f.draws.map(d=>d.count),[3,3]);assert.deepEqual(f.chunks.map(c=>c.shadow),prior);assert.equal(f.sceneUploadedShadowIndexCount(),6);
 f.draws.length=0;f.preparation.deferShadow=false;f.preparation.failShadow=true;f.uploadShadow();f.drawProjectedShadows(.4);assert.deepEqual(f.draws.map(d=>d.count),[3,3]);assert.deepEqual(f.chunks.map(c=>c.shadow),prior,'a failed replacement retains the last published shadow');
 f.draws.length=0;f.preparation.failShadow=false;f.uploadShadow();assert.deepEqual(f.chunks.map(c=>c.shadowIndexCount),[6,0]);assert.equal(f.chunks[1].shadow,undefined);f.drawProjectedShadows(.4);assert.deepEqual(f.draws.map(d=>d.count),[6]);
});

test('tier300 retries lost unfinished CPU work with a fresh source attempt',()=>{
 const f=fixture('tier300'),chunk={cpu:{state:'lost'}},candidate={chunkPacking:{chunks:[chunk]},packedBase:{},packedReady:false,materialReady:true,sourceWorkConsumed:true,sourceAttempt:2};assert(f.retryLostCandidateChunks(candidate));assert(chunk.released);assert.equal(candidate.sourceAttempt,3);assert.equal(candidate.sourceWorkConsumed,false);assert.equal(candidate.materialReady,false);assert.equal(candidate.chunkPacking,undefined);assert.equal(candidate.packedBase,undefined);
});


// Compile only the small budget runtime in memory; renderer functions below
// are taken from their real AST and use a tiny source and mock program owner.
const budgetRuntime=await build({stdin:{contents:"export * from './src/safety/render-runtime/shader-source-budget';export * from './src/safety/render-runtime/shader-assembly-budget';export * from './src/safety/render-runtime/resource-budget';export * from './src/safety/prepared-source';export * from './src/safety/resident-planar-reflection';",resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node'});
const B=await import('data:text/javascript;base64,'+Buffer.from(budgetRuntime.outputFiles[0].text).toString('base64'));
function sourceDeclarations(provider,names){
 const source=fs.readFileSync(new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider,source,ts.ScriptTarget.Latest,true),found=new Map();
 const walk=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(ast)))found.set(node.name.getText(ast),'const '+node.getText(ast)+';');ts.forEachChild(node,walk);};walk(ast);
 for(const name of names)assert(found.has(name),provider+' '+name);return [...found.values()].join('\n');
}
function sourceFixture(provider,limitBytes){
 const budget=B.createResourceBudget({limitBytes}),raw='vec3 paintedFacade(vec3 base){return base;}',rawBounds=B.shaderSourceBounds(B.shaderSourceText(raw,['fixture-raw'])),helper=BUILDING_SURFACE_FRAGMENT_GLSL;let builds=0,workspace,lastRecipe;
 const createPreparedSourceWorkspace=options=>{const original=B.createPreparedSourceWorkspace(options);workspace={...original,programBudget(recipe,...args){lastRecipe=recipe;return original.programBudget(recipe,...args);},prepareSource(recipe,...args){assert.strictEqual(recipe,lastRecipe,'preflight and production must share one exact recipe');return original.prepareSource(recipe,...args);}};return workspace;};
 const programPreparation={acquireReadyProgram(){},compile(_gl,recipe){assert(recipe.budget);const hold=budget.reserve([...recipe.budget.workspaceCosts,{category:'program-source',bytes:recipe.budget.sourceBytesUpperBound,precision:'estimate',identity:{}}]);try{return recipe.build();}finally{hold.release();}}};
 const city='fixture',scope={stats:{disposed:false}},attributes=['position'],plan={scope,programSourceInputs:[],programSourceProvenance:[],partitionEnabled:false,describeSourceBounds:()=>rawBounds,
  describeAssemblyBounds(surface,assemble){assert.equal(surface,helper);return assemble(this.describeSourceBounds());},
  programBudget:(...args)=>workspace.programBudget(...args),prepareSource:(...args)=>workspace.prepareSource(...args),prepareFragment:(recipe,family)=>workspace.prepareSource(recipe,[family]).fragment,prepareMetadata(){}};
 if(provider!=='church')createPreparedSourceWorkspace({budget,current:()=>true,build(){builds++;return raw;},specialize:fragment=>({fragment,depthEffects:false})});
 const bindings={...B,partitionProgramFamilies,BUILDING_SURFACE_FRAGMENT_GLSL,linkedPaint:provider==='bremen'?undefined:currentPaintProgramGroups(provider,city),createPreparedSourceWorkspace,geometryOwner:{store:{budget}},destroyed:false,pageHidden:false,enabled:true,gl:{isContextLost:()=>false},getFacadePaintFragmentGLSL(){builds++;return raw;},describeFacadePaintSourceBounds:()=>rawBounds,churchColourSourceAuthority:{},specializeCurrentPaintFragment:source=>source,
  MUNICH_QUEUE_FRAGMENT_GLSL:'#version 300 es\nvoid main(){}',SCENE_SURFACE_LIGHT_GLSL:'',RATHAUS_PROXY_MASK_GLSL:'',PARTIAL_GATE_MASK_GLSL:'',S402_CONNECTOR_MASK_GLSL:'',S036_ROOF009_MASK_GLSL:'',FACADE_OPENING_GLSL:'',FACADE_LAYOUT_GLSL:'',VERTEX:'void main(){}',COLOUR_ATTRIBUTES:attributes,colourAttributes:attributes,
  residentProgramPlan:plan,residentData:{plan},familyPaintRecipeKey:()=>'',baseSurfaceFragment:helper,surfaceFragment:undefined,diffuseFragment:undefined,city,currentDataScope:scope,legacyPartitionEnabled:false,programPlanScope:()=>scope,pruneFamilySource:()=>false,pruneOwner6307Fragment:source=>source,COLOUR_ASSEMBLY_AUTHORITY:{},geometryProgramDemand:()=>true,geometryProgramConsumer:()=>plan,progressiveShaderSpecialization:undefined,
  tierProgramSourceAuthority:{},selectGeometryPlan:()=>plan,sourcePlanIdentity:undefined,cityPaintFragment:'',lastFamilyFragmentCharacters:0,clearMaterialSource(){workspace.clearPreparedSource();},programPreparation,
  queueOnlyProgram:false,gpuGeneration:1,colourProgramHasConsumer:()=>true,fullColourSourceCharacters:0,lastFragmentCharacters:0,lastCompileAttempt:undefined,generation:1,isProgramPreparationPending:()=>false,
 };
 const names=['fragmentParts','fragment','compileGeometryProgram',...(provider==='bremen'?['geometryProgramRecipe']:provider==='church'?['sourceWorkspace','churchSourceRecipe','colourProgramRecipe']:[])],source=sourceDeclarations(provider,names)+'\nreturn {compileGeometryProgram,fragment};',js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,api=new Function(...Object.keys(bindings),js)(...Object.values(bindings));
 return{api,budget,helper,raw,get builds(){return builds;},get recipe(){return lastRecipe;},release(){workspace.release();}};
}
for(const provider of ['bremen','tier300','church'])test(provider+' admits its complete tagged shell before producing source and uses the same recipe for compilation',()=>{
 const denied=sourceFixture(provider,1);try{assert.throws(()=>denied.api.compileGeometryProgram(denied.helper),{name:'ResourceBudgetExceededError'});assert.equal(denied.builds,0);assert.equal(denied.budget.stats.bytes,0);}finally{denied.release();}
 const f=sourceFixture(provider,8*1024*1024);try{const compiled=f.api.compileGeometryProgram(f.helper),original=provider==='church'?f.api.fragment(f.helper,false,f.raw):f.api.fragment(f.helper,f.raw),expected=B.withResidentReflectionClip(original);assert.equal(compiled.fragment,expected);assert.equal(f.builds,1);assert.equal(f.recipe.sourceBounds.paintSourceCharactersUpperBound,f.raw.length);assert.equal(f.recipe.sourceBounds.sourceCharactersUpperBound,expected.length);B.validateShaderSourceSyntax(expected,f.recipe.sourceBounds.syntaxUpperBound);assert(f.budget.stats.bytes>0,'live prepared base keeps its charge');}finally{f.release();}assert.equal(f.budget.stats.bytes,0);
});

for(const provider of ['bremen','tier300','church'])test(provider+' keeps the previous shadow publication and retries after partial subset budget rejection',()=>{
 const f=fixture(provider);let oldReleases=0;const old=f.chunks.map(chunk=>{if(provider==='church')chunk.cpu.value.indices=new Uint32Array([0,1,2,0,1,2]);const value=new Uint32Array([2,1,0]);chunk.shadowIndices=value;chunk.shadowCPU={release(){oldReleases++;}};return value;});f.store.failAt=2;
 assert.throws(()=>f.updateSolarShadowIndices(),/shadow budget exhausted/);assert.equal(oldReleases,0);for(let i=0;i<2;i++)assert.strictEqual(f.chunks[i].shadowIndices,old[i]);f.store.failAt=undefined;assert.equal(f.updateSolarShadowIndices(),true,'failed construction must not publish its signature');assert.equal(oldReleases,2);assert.equal(f.requests.length,4);
});
