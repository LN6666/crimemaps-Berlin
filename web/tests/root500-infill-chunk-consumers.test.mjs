import {createResidentCaptureOwnership} from './support/fixtures-managers-b-renderer-runtime.mjs';
import {resourceContentKey,resourceContentKeys} from './support/resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const read=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const key=row=>row.objectId+'|'+row.partId;
function evaluate(text,bindings={}){
 const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};new Function('module','exports',...Object.keys(bindings),code)(module,module.exports,...Object.values(bindings));return module.exports;
}
const {indexedResourceKey}=evaluate(read('safety/renderer-chunk-input.ts'),{require:id=>{assert.equal(id,'./resource-content-key');return resourceContentKeys;}});
const pickBlocks=evaluate(read('painted/root500/safety/indexed-pick-blocks70.ts'));
const ranges=evaluate(read('safety/render-runtime/resident-draw-range.ts'));
const triangles=evaluate(read('safety/render-runtime/resident-index-convention.ts'));
const parsed=new Map();
function codeFor(provider,names,methods=[]){
 if(!parsed.has(provider)){const source=read(`painted/${provider}/safety/building-mesh-renderer.ts`);parsed.set(provider,ts.createSourceFile(provider,source,ts.ScriptTarget.Latest,true));}
 const ast=parsed.get(provider),functions=new Map(),wanted=new Set(names),methodCode=[];
 function walk(node){
  if(ts.isFunctionDeclaration(node)&&wanted.has(node.name?.text))functions.set(node.name.text,node.getText(ast));
  if(ts.isMethodDeclaration(node)&&methods.includes(node.name?.getText(ast)))methodCode.push(node.getText(ast));
  ts.forEachChild(node,walk);
 }
 walk(ast);for(const name of names)assert(functions.has(name),provider+' production function '+name);
 const constants=ast.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>['C','EPS','key','merc','geo','unit','sub','cross','dot'].includes(node.name.getText(ast))).map(node=>'const '+node.getText(ast)+';');
 return constants.join('\n')+'\n'+[...functions.values()].join('\n')+'\nconst methods={'+methodCode.join(',')+'};';
}
function fixture(provider){
 const writes=[],draws=[],programPins=[],coverage=[],resourceRequests=[],geometryRequests=[];let currentVAO,currentBuffer,currentMatrix,serial=0;
 const gl={ARRAY_BUFFER:1,ARRAY_BUFFER_BINDING:2,TRIANGLES:4,UNSIGNED_INT:5,DEPTH_TEST:6,LEQUAL:7,CULL_FACE:8,BLEND:9,SRC_ALPHA:10,ONE_MINUS_SRC_ALPHA:11,ONE:12,
  isContextLost:()=>false,getParameter:()=>currentBuffer,bindBuffer:(_type,buffer)=>{currentBuffer=buffer;},bufferSubData:(_type,offset,data)=>writes.push({buffer:currentBuffer,offset,data:[...data]}),
  bindVertexArray:vao=>{currentVAO=vao;},getUniformLocation:(_p,name)=>name,uniformMatrix4fv:(_name,_t,matrix)=>{currentMatrix=[...matrix];},uniform1f(){},uniform2f(){},useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},
  drawElements(_mode,count,_type,offset){assert(offset>=0&&offset/4+count<=3,'draw stays within the bound chunk index buffer');draws.push({vao:currentVAO,count,offset,matrix:currentMatrix});},
 };
 function chunk(n,anchor,unit,z){
  const row={objectId:'osm/way/'+n,partId:'part/'+n,generation:1,firstVertex:0,lastVertex:3,start:0,end:3,box:[-.8,-.8,z,.8,.8,z],batches:[{positions:new Float32Array(9)}]};
  const vertices=new Float32Array([-.8,-.8,z,0,0,1,1,1,1,.8,-.8,z,0,0,1,1,1,1,0,.8,z,0,0,1,1,1,1]),indices=new Uint32Array([0,1,2]),state=new Float32Array([1,1,1]);
  const packed={contentKey:'chunk-'+n,anchor,vertices,indices,paint:new Float32Array(15),progressive:new Float32Array(12),rows:[{component:row,start:0,end:3}],frame:{unit},baseState:new Float32Array([1,1,1])};
  const geometry={value:{vao:{n},indexBuffer:{n,type:'index'},buffers:new Map(['vertex','state','paint','progressive'].map(type=>[type,{n,type}]))},contentKey:'view-'+n};
  const blocks=pickBlocks.createIndexedPickBlocks70(vertices,indices,[row],9);blocks.ranges=new Map([[key(row),blocks.ranges.get(row)]]);
  const masks={pins:0,residentRevision:n,stats:{allocatedCPUBytes:0,allocatedGPUBytes:0},withResidentMasks(_gl,_p,draw){draw();return true;},retain(){this.pins++;let live=true;return{...this,release:()=>{if(live){live=false;this.pins--;}}};}};
  return{source:{frame:{unit,origin:[8,53]}},cpu:{contentKey:packed.contentKey,value:packed,state:'ready'},state:{value:state,state:'ready'},geometry,loaded:new Map([[key(row),row]]),masks,shadowIndices:new Uint32Array(),pick:{value:blocks}};
 }
 const chunks=[chunk(1,[.5,.5],1000,.6),chunk(2,[.5001,.5],2000,.4)];
 const loaded=new Map(chunks.map((chunk,i)=>{const row=[...chunk.loaded.values()][0];return[key(row),{...row,firstVertex:3*i,lastVertex:3*i+3,start:3*i,end:3*i+3}];}));
 const spans=chunks.map((chunk,i)=>({chunk,firstIndex:i*3,indexCount:3,localFirstIndex:0}));
 const geometryOwner={scene:{version:9},pins:0,capture(){this.pins++;let live=true;return{version:this.scene.version,leases:chunks.map(chunk=>chunk.geometry),release:()=>{if(live){live=false;this.pins--;}}};}};
 const store={acquire(request){resourceRequests.push(request);if(this.failAt===resourceRequests.length)throw Error('shadow budget exhausted');const value=request.produce();let live=true;return{contentKey:request.contentKey,value,release(){assert(live);live=false;},retain(){throw Error('unused');}};}};
 const shadowGeometryOwner={scene:{version:3},currentLeases:[],currentGeometries:[],allocate(_gl,_p,request){geometryRequests.push(request);return{contentKey:request.contentKey,value:{vao:{shadow:true,n:++serial},indexBuffer:{}},release(){}};},publish(leases){this.currentLeases=leases;this.currentGeometries=leases.map(lease=>lease.value);return true;},release(){this.currentLeases=[];this.currentGeometries=[];}};
 const scope={pins:0,retain(){this.pins++;let live=true;return()=>{assert(live);live=false;this.pins--;};}},program={p:1};
 const preparation={retainProgram(_gl,p){programPins.push(p);let live=true;return()=>{assert(live);live=false;programPins.splice(programPins.indexOf(p),1);};},compile(){return program;},work(_context,request){request.work();return true;}};
 const exports=['multiply','inverse','project','triangle','boxHit','localComponent','sceneIndexCount','sceneShadowIndexCount','componentGrowth','uploadChunkState','paintSelection','grow','rememberFinishedBirth','reserveBirthSlot','drawSceneRange','captureChunkComponents','captureChunkRuns','residentCaptureAdapter','updateSolarShadowIndices','uploadShadow','prepareShadowUpload','drawProjectedShadows','retryLostCandidateChunks'];
 const source=`${codeFor(provider,exports,['pick'])}
  export const api={${exports.join(',')},pick:methods.pick,select(identity){selectedIdentity=identity;paintSelection();},growAt(time){testTime=time;needsBirth=false;birth.set(key([...loaded.values()][1]),0);grow();},replaceScene(next){sceneChunks=next;geometryOwner.scene.version++;},clearSun(){sceneSun={};},setSelectionActive(value){selectionActive=value;}};`;
 const globals={...ranges,...triangles,createResidentCaptureOwnership,resourceContentKey,indexedResourceKey,sceneChunks:chunks,sceneSpans:spans,loaded,gl,program,geometryOwner,shadowGeometryOwner,sceneChunkInput:{store},geometryUploadPending:false,geometryUploadFailure:undefined,reflectionResidentRevision:0,captureStateRevision:0,viewRevision:0,enabled:true,selectionActive:true,selectedIdentity:undefined,destroyed:false,pageHidden:false,partitionPending:false,opacity:1,opacityContext:'normal',matrix:new Float64Array(identity),anchor:[.5,.5],anchorUnit:1000,materialAnchor:[.5,.5],materialUnit:1000,candidateMainMatrix:identity,activeMainFrameVersion:9,
  birth:new Map(),seenBirth:new Set(),BIRTH_LIMIT:20000,needsBirth:false,reducedMotion:false,map:{triggerRepaint(){},getCanvas:()=>({clientWidth:512,clientHeight:512})},clock:()=>150,
  gpuReady:()=>true,paintMode:()=>2,paintOverride:()=>0,progressiveDiagnostic:'none',city:'leipzig',mainGeometryProgramFailure:undefined,contextRecoveryFailure:undefined,
  indexedPickBlockHit70:pickBlocks.indexedPickBlockHit70,INDEXED_PICK_BLOCK_TRIANGLES70:64,isSourceOnlyGlassRoof:()=>false,f151CrownPickDiscard:()=>false,partialGatePickDiscard:()=>false,s402ConnectorPickDiscard:()=>false,s036Roof009PickDiscard:()=>false,
  solarCaptureRevision:()=>1,sceneEnvironment:{shadows:true,sunlight:true},sceneSun:{shadowVector:[1,1]},sceneSunOrigin:[8,53],windowTexture:undefined,diffuseTexture:undefined,texturedProgram:undefined,diffuseProgram:undefined,committingScope:undefined,residentScope:scope,partitionPrograms:new Map(),solarProgramFailures:new Map(),solarResidentKeys:()=>[],facadeAttached:false,
  residentCaptureState:()=>({textureKind:0,runs:[{firstIndex:0,indexCount:6,program}]}),programPreparation:preparation,reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},
  solarShadowAdmittedKeys:new Set(),solarShadowAdmitted:0,solarShadowWithheld:0,solarShadowMode:'',solarShadowSignature:'',solarBoundary:{},generation:1,residentSolarShadowRanges:(_origin,rows)=>[...rows],shadowUploadPending:false,shadowPreparationSignature:'',streamShadowRevision:0,shadowProgram:program,shadowVao:undefined,shadowIndexBuffer:undefined,shadowFailure:false,shadowDraws:0,shadowMask:{draw(_context,matrix,height,run){coverage.push({matrix:[...matrix],height});run();return true;}},releaseShadowGPU(){shadowGeometryOwner.release();},isProgramPreparationPending:()=>false,S402_SHADOW_VERTEX_GLSL:'vertex',S402_SHADOW_FRAGMENT_GLSL:'fragment',releaseStreamChunks(rows){for(const row of rows)row.released=true;},testTime:150};
 const {api}=evaluate(source,globals);
 const drawSceneRange=(p,first,count)=>{
  const batch=triangles.createResidentTriangleDrawBatch(gl);
  try{return api.drawSceneRange(batch,p,first,count);}finally{batch.restore();}
 };
 return{...api,drawSceneRange,chunks,loaded,spans,writes,draws,programPins,geometryOwner,scope,coverage,resourceRequests,geometryRequests,shadowGeometryOwner,store};
}
for(const provider of ['root500','infill']){
 test(provider+' draws cross-chunk runs using local offsets and distinct model transforms',()=>{
  const h=fixture(provider);assert.equal(h.drawSceneRange({},0,6),true);assert.deepEqual(h.draws.map(row=>[row.vao.n,row.count,row.offset]),[[1,3,0],[2,3,0]]);assert.equal(h.draws[0].matrix[0],Math.fround(.001));assert.equal(h.draws[1].matrix[0],Math.fround(.0005));assert.equal(h.draws[1].matrix[12],Math.fround(.5001));
  h.replaceScene(h.chunks);assert.equal(h.drawSceneRange({},0,6),false,'a changed publication cannot complete an old frame');assert.equal(h.draws.length,2);
 });
 test(provider+' changes only selected/growing chunk state and picks the closest cross-frame triangle',()=>{
  const h=fixture(provider),target=[...h.loaded.values()][1];h.select(target);assert.deepEqual([...h.chunks[0].state.value],[1,1,1]);assert.deepEqual([...h.chunks[1].state.value],[3,3,3]);assert.deepEqual(h.writes.map(row=>row.buffer.n),[2]);assert.equal(h.pick({x:256,y:256}).objectId,target.objectId,'local ray parameter preserves nearest ordering across different units');
  h.growAt(150);assert.deepEqual([...h.chunks[1].state.value],[2.5,2.5,2.5]);assert.equal(h.componentGrowth(target),.5);assert.equal(h.chunks[0].state.value[0],1);assert(h.writes.every(row=>row.buffer.n===2));
 });
 test(provider+' capture freezes all chunk frames and retains masks, programs and geometry through its last consumer',()=>{
  const h=fixture(provider),snapshot=h.residentCaptureAdapter().snapshot(false);assert.equal(snapshot.status,'active');assert.equal(snapshot.publicationVersion,9);assert.deepEqual(snapshot.chunks.map(c=>c.components[0].start),[0,0]);assert.deepEqual(snapshot.chunks.map(c=>c.components[0].order),[0,1]);assert.deepEqual(snapshot.chunks.map(c=>c.runs[0].firstIndex),[0,0]);
  const matrix=[...snapshot.chunks[1].matrix(identity)],retained=snapshot.retain('reflection');h.chunks[1].source.frame.unit=4000;h.chunks[1].cpu.value.anchor[0]=.7;h.replaceScene([]);assert.deepEqual([...snapshot.chunks[1].matrix(identity)],matrix);snapshot.release();assert.equal(h.geometryOwner.pins,1);assert.equal(h.scope.pins,1);assert.deepEqual(h.chunks.map(c=>c.masks.pins),[1,1]);assert.equal(h.programPins.length,1);retained.release();retained.release();assert.equal(h.geometryOwner.pins,0);assert.equal(h.scope.pins,0);assert.deepEqual(h.chunks.map(c=>c.masks.pins),[0,0]);assert.equal(h.programPins.length,0);
 });
 test(provider+' shadow subsets retain their actual main parents and blend all chunks in one coverage union',()=>{
  const h=fixture(provider);assert(h.updateSolarShadowIndices());assert.deepEqual(h.chunks.map(c=>[...c.shadowIndices]),[[0,1,2],[0,1,2]]);assert.equal(h.resourceRequests.length,2);assert.equal(h.updateSolarShadowIndices(),false);assert.equal(h.resourceRequests.length,2,'unchanged membership reuses its charged subset');h.uploadShadow();assert.equal(h.geometryRequests.length,2);for(let i=0;i<2;i++){assert.strictEqual(h.geometryRequests[i].parents[0],h.chunks[i].geometry);assert.strictEqual(h.geometryRequests[i].parents[1],h.chunks[i].shadowCPU);assert.strictEqual(h.geometryRequests[i].buffers[0].buffer,h.chunks[i].geometry.value.buffers.get('vertex'));assert.equal(h.resourceRequests[i].estimate.bytes,12);assert.strictEqual(h.resourceRequests[i].parents[0],h.chunks[i].cpu);}h.drawProjectedShadows(.5);assert.equal(h.coverage.length,1);assert.equal(h.draws.length,2);h.clearSun();assert(h.updateSolarShadowIndices());assert.equal(h.sceneShadowIndexCount(),0);
 });
 test(provider+' context loss requeues an unfinished chunk production without a terminal candidate failure',()=>{
  const h=fixture(provider),candidate={chunks:[{cpu:{state:'lost'}}],sourceAttempt:2,sourceWorkConsumed:true,sourcePrepared:true,sourceReady:true,state:{},snapshot:{},finishChunkPack(){},chunkFailure:Error('prior'),repack(){}};const old=candidate.chunks[0];h.retryLostCandidateChunks(candidate);assert(old.released);assert.equal(candidate.sourceAttempt,3);assert.equal(candidate.sourceWorkConsumed,false);assert.equal(candidate.chunkFailure,undefined);assert.equal(candidate.chunks,undefined);if(provider==='infill')assert.strictEqual(candidate.pack,candidate.repack);else assert.equal(candidate.sourceReady,false);
 });
}

// Compile only the small budget runtime in memory; renderer functions below
// are taken from their real AST and use a tiny source and mock program owner.
const budgetRuntime=await build({stdin:{contents:"export * from './src/safety/render-runtime/shader-source-budget';export * from './src/safety/render-runtime/shader-assembly-budget';export * from './src/safety/render-runtime/resource-budget';export * from './src/safety/prepared-source';export * from './src/safety/resident-planar-reflection';export {partitionProgramFamilies} from './src/safety/partition-program-groups';export {BUILDING_SURFACE_FRAGMENT_GLSL} from './src/painted/root500/safety/building-surface-style';export {sharedInfillEquivalentProgramFamilies} from './src/painted/infill/safety/infill-equivalent-program-families';",resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node'});
const B=await import('data:text/javascript;base64,'+Buffer.from(budgetRuntime.outputFiles[0].text).toString('base64'));
function sourceDeclarations(provider,names){
 const source=fs.readFileSync(new URL(`../src/painted/${provider}/safety/building-mesh-renderer.ts`,import.meta.url),'utf8'),ast=ts.createSourceFile(provider,source,ts.ScriptTarget.Latest,true),found=new Map();
 const walk=node=>{if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(ast)))found.set(node.name.getText(ast),'const '+node.getText(ast)+';');ts.forEachChild(node,walk);};walk(ast);
 for(const name of names)assert(found.has(name),provider+' '+name);return [...found.values()].join('\n');
}
test('Root500 reuses a material index only for the same published runs and override settings',()=>{
 const names=['keysByPaintRuns','paintKeysForRuns'];
 const source=sourceDeclarations('root500',names);
 let override=0,visits=0;
 const api=evaluate(source+`\nexport const keys=paintKeysForRuns;
  export function setLegacy(value){legacyPartitionEnabled=value;}`,{
  paintOverride:()=>override,legacyPartitionEnabled:false,overrideSourceKey:n=>String(n),
  overriddenFamilyPaintKey:(key,n,resolve)=>key+resolve(n),
 });
 const run={get key(){visits++;return 'building';}},runs=[run];
 assert.deepEqual([...api.keys(runs)],['building']);
 assert.strictEqual(api.keys(runs),api.keys(runs));assert.equal(visits,1);
 override=7;assert.deepEqual([...api.keys(runs)],['building7']);assert.equal(visits,2);
 api.setLegacy(true);api.keys(runs);assert.equal(visits,3);
 api.keys([...runs]);assert.equal(visits,4);
});

test('Root500 preserves mask chunk order for disjoint, clipped and cross-chunk runs',()=>{
 const chunks=Array.from({length:4},(_,i)=>({id:i})),sceneSpans=[2,1,3,1,0].map((i,k)=>({chunk:chunks[i],firstIndex:3*k,indexCount:3}));
 let runs=[];
 const {mainMaskChunks}=evaluate(sourceDeclarations('root500',['mainMaskChunks'])+'\nexport {mainMaskChunks};',{
  partitionEnabled:true,paintMode:()=>2,mainPaintRuns:()=>runs,sceneChunks:chunks,sceneSpans,
 });
 for(let subset=0;subset<1<<7;subset++){
  runs=Array.from({length:7},(_,i)=>({firstIndex:2*i,indexCount:2})).filter((_,i)=>subset&(1<<i));
  const expected=chunks.filter(chunk=>sceneSpans.some(s=>s.chunk===chunk&&runs.some(r=>r.firstIndex<s.firstIndex+s.indexCount&&r.firstIndex+r.indexCount>s.firstIndex)));
  assert.deepEqual(mainMaskChunks(),expected);
 }
});

function sourceFixture(provider,limitBytes){
 const budget=B.createResourceBudget({limitBytes}),raw='vec3 paintedFacade(vec3 base){return base;}',rawBounds=B.shaderSourceBounds(B.shaderSourceText(raw,['fixture-raw'])),helper='vec3 sourceFacade(vec3 base){return base;}';let builds=0,workspace,lastRecipe;
 const createPreparedSourceWorkspace=options=>{const original=B.createPreparedSourceWorkspace(options);workspace={...original,programBudget(recipe,...args){lastRecipe=recipe;return original.programBudget(recipe,...args);},prepareSource(recipe,...args){assert.strictEqual(recipe,lastRecipe,'preflight and production must share one exact recipe');return original.prepareSource(recipe,...args);}};return workspace;};
 const programPreparation={acquireReadyProgram(){},compile(_gl,recipe){assert(recipe.budget);const hold=budget.reserve([...recipe.budget.workspaceCosts,{category:'program-source',bytes:recipe.budget.sourceBytesUpperBound,precision:'estimate',identity:{}}]);try{return recipe.build();}finally{hold.release();}}};
 const scope={stats:{disposed:false}},attributes=['position'],plan={scope,programSourceInputs:[],programSourceProvenance:[],partitionEnabled:false,describeSourceBounds:()=>rawBounds,describeAssemblyBounds:(_key,_helper,_prune,describe)=>describe(rawBounds),programBudget:(...args)=>workspace.programBudget(...args),prepareSource:(...args)=>workspace.prepareSource(...args),prepareFragment:(recipe,family)=>workspace.prepareSource(recipe,[family]).fragment,prepareMetadata(){}};
 if(provider!=='church')createPreparedSourceWorkspace({budget,current:()=>true,build(){builds++;return raw;},specialize:fragment=>({fragment,depthEffects:false})});
 const bindings={...B,createPreparedSourceWorkspace,geometryOwner:{store:{budget}},destroyed:false,pageHidden:false,enabled:true,gl:{isContextLost:()=>false},getFacadePaintFragmentGLSL(){builds++;return raw;},describeFacadePaintSourceBounds:()=>rawBounds,churchColourSourceAuthority:{},specializeCurrentPaintFragment:source=>source,
  MUNICH_QUEUE_FRAGMENT_GLSL:'#version 300 es\nvoid main(){}',SCENE_SURFACE_LIGHT_GLSL:'',RATHAUS_PROXY_MASK_GLSL:'',PARTIAL_GATE_MASK_GLSL:'',S402_CONNECTOR_MASK_GLSL:'',S036_ROOF009_MASK_GLSL:'',FACADE_OPENING_GLSL:'',FACADE_LAYOUT_GLSL:'',VERTEX:'void main(){}',COLOUR_ATTRIBUTES:attributes,COLOUR_PROGRAM_ATTRIBUTES:attributes,colourAttributes:attributes,
  publishedProgramPlan:plan,residentProgramPlan:plan,residentData:{plan},withPlan:(_plan,run)=>run(),coordinateGeometryRecipe:(_plan,recipe)=>recipe,familyPaintRecipeKey:()=>'',baseSurfaceFragment:helper,surfaceFragment:undefined,diffuseFragment:undefined,city:'fixture',currentDataScope:scope,legacyPartitionEnabled:false,programPlanScope:()=>scope,pruneFamilySource:()=>false,pruneOwner6307Fragment:source=>source,COLOUR_ASSEMBLY_AUTHORITY:{},geometryProgramDemand:()=>true,geometryProgramConsumer:()=>plan,progressiveShaderSpecialization:undefined,
  tierProgramSourceAuthority:{},selectGeometryPlan:()=>plan,sourcePlanIdentity:undefined,cityPaintFragment:'',lastFamilyFragmentCharacters:0,clearMaterialSource(){workspace.clearPreparedSource();},programPreparation,
  queueOnlyProgram:false,gpuGeneration:1,colourProgramHasConsumer:()=>true,fullColourSourceCharacters:0,lastFragmentCharacters:0,lastCompileAttempt:undefined,generation:1,isProgramPreparationPending:()=>false,
 };
 const names=[...(provider==='infill'?['LOW_OFFICE_PROGRAM_FAMILIES','sharedInfillProgramFamilies']:[]),'fragmentParts','fragment','compileGeometryProgram','geometryProgramRecipe'],source=sourceDeclarations(provider,names)+'\nreturn {compileGeometryProgram,fragment};',js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,api=new Function(...Object.keys(bindings),js)(...Object.values(bindings));
 return{api,budget,helper,raw,get builds(){return builds;},get recipe(){return lastRecipe;},release(){workspace.release();}};
}

for(const provider of ['root500','infill'])test(provider+' reserves complete source assembly before its builder and shares the exact preflight recipe',()=>{
 const denied=sourceFixture(provider,1);try{assert.throws(()=>denied.api.compileGeometryProgram(denied.helper),{name:'ResourceBudgetExceededError'});assert.equal(denied.builds,0);assert.equal(denied.budget.stats.bytes,0);}finally{denied.release();}
 const f=sourceFixture(provider,8*1024*1024);try{const compiled=f.api.compileGeometryProgram(f.helper),expected=B.withResidentReflectionClip(f.api.fragment(f.helper,f.raw));assert.equal(compiled.fragment,expected);assert.equal(f.builds,1);assert.equal(f.recipe.sourceBounds.paintSourceCharactersUpperBound,f.raw.length);assert.equal(f.recipe.sourceBounds.sourceCharactersUpperBound,expected.length);B.validateShaderSourceSyntax(expected,f.recipe.sourceBounds.syntaxUpperBound);}finally{f.release();}assert.equal(f.budget.stats.bytes,0);
});
for(const provider of ['root500','infill'])test(provider+' preserves every published shadow subset when a later chunk cannot reserve memory',()=>{
 const h=fixture(provider);let oldReleases=0;const old=h.chunks.map(chunk=>{chunk.shadowIndices=new Uint32Array([2,1,0]);chunk.shadowCPU={release(){oldReleases++;}};return chunk.shadowIndices;});h.store.failAt=2;assert.throws(()=>h.updateSolarShadowIndices(),/shadow budget exhausted/);assert.equal(oldReleases,0);h.chunks.forEach((chunk,i)=>assert.strictEqual(chunk.shadowIndices,old[i]));h.store.failAt=undefined;assert(h.updateSolarShadowIndices());assert.equal(oldReleases,2);
});
