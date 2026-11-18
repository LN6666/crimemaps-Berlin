import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {residencyFixture,evaluate} from './fixtures/painted-residency-harness.mjs';

const rendererSource=provider=>fs.readFileSync(provider==='delegated500'&&process.env.CRIMEMAPS_FACTORY_REGRESSION_SOURCE
 ?process.env.CRIMEMAPS_FACTORY_REGRESSION_SOURCE:new URL('../src/painted/'+provider+'/safety/building-mesh-renderer.ts',import.meta.url),'utf8');

function factoryDependencies(provider,base,rendererAst){
 const root=new URL('../src/painted/'+provider+'/safety/',import.meta.url),modules=new Map(),arityModules=new Map(),scopedFunctions=new Map(),cityEmptyModules=new Set();
 const read=id=>fs.readFileSync(new URL(/\.(?:mjs|ts)$/.test(id)?id:id+'.ts',root),'utf8');
 function addCityEmptyModule(id){
  if(cityEmptyModules.has(id))return;cityEmptyModules.add(id);
  const helperAst=ts.createSourceFile(id,read(id),ts.ScriptTarget.Latest,true),imported=new Map();
  for(const statement of helperAst.statements)if(ts.isImportDeclaration(statement)){
   const bindings=statement.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.set(item.name.text,statement.moduleSpecifier.text);
   if(statement.moduleSpecifier.text.endsWith('-projection-pin')){
    // Keep the real immutable pins of the parent-readiness guards already
    // exercised here; sidecar functions need no target pins for empty inputs.
    if(id.endsWith('-parent-readiness'))addCityEmptyModule(statement.moduleSpecifier.text);
   }
  }
  function initializedDependency(node){
   if(ts.isArrowFunction(node)||ts.isFunctionExpression(node))return;
   if(ts.isIdentifier(node)&&imported.has(node.text))addCityEmptyModule(imported.get(node.text));
   ts.forEachChild(node,initializedDependency);
  }
  // S528 creates its adapter and five-part ID set at module initialization.
  // Load its actual small math/pin imports, without executing any projection.
  for(const statement of helperAst.statements)if(ts.isVariableStatement(statement))for(const item of statement.declarationList.declarations)if(item.initializer)initializedDependency(item.initializer);
 }
 if(provider==='city')for(const statement of rendererAst.statements){
  if(!ts.isImportDeclaration(statement)||!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings))continue;
  const id=statement.moduleSpecifier.text;
  if(id.endsWith('-projection-sidecar')||statement.importClause.namedBindings.elements.some(item=>item.name.text.endsWith('ParentReadiness')||item.name.text==='paintProgramRuns'))addCityEmptyModule(id);
 }
 function arityModule(id){
  if(!arityModules.has(id)){
   const text=read(id),ast=ts.createSourceFile(id+'.ts',text,ts.ScriptTarget.Latest,true);
   const declaration=ast.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>node.name.getText(ast)==='delegated500DataFunctionArities');
   assert(declaration?.initializer,id+' publishes its actual scoped arities');
   // Evaluate only the literal arity metadata; model tables and their getters
   // remain behind the existing tiny factory dependencies.
   const arities=evaluate('export const arities='+declaration.initializer.getText(ast)).arities,target=dependency(id),overrides=new Map();
   // The generic tiny seam treats names containing GLSL as string constants.
   // Actual arity metadata also declares get...GLSL resource getters: preserve
   // their function identity/type while refusing all cold-factory data reads.
   for(const name of Object.keys(arities))if(typeof Reflect.get(target,name)!=='function')overrides.set(name,()=>{throw Error('Cold factory cannot read scoped resource '+id+':'+name);});
   scopedFunctions.set(id,overrides);
   arityModules.set(id,new Proxy(target,{get:(o,name)=>name==='delegated500DataFunctionArities'?arities:Reflect.get(o,name)}));
  }
  return arityModules.get(id);
 }
 // Small pure factory helpers execute from their actual module text: the City
 // material recipe validator/builder (its hook table keeps the real hook names,
 // but every model wrapper refuses cold use) and the delegated source budget
 // gate. Their siblings keep the existing tiny seams.
 const actualHelpers=new Map([['./city-shader-budget',{names:['createCityMaterialBuilder'],tables:{MATERIAL_HOOKS:'cold-material-hook'}}],['./delegated-shader-budget',{names:['createDelegatedSourceBudgetGate','createContextPreparedSourceWorkspace'],consts:['unusedWorkspaceStats'],imports:{createPreparedSourceWorkspace:'../../../safety/prepared-source'},classes:['DelegatedPreparedSourceMap'],tables:{}}]]),actualHelperValues=new Map();
 function actualHelper(id){
  if(!actualHelperValues.has(id)){
   const {names,tables,consts=[],imports={},classes=[]}=actualHelpers.get(id),helperAst=ts.createSourceFile(id+'.ts',read(id),ts.ScriptTarget.Latest,true),parts=Object.entries(imports).map(([name,from])=>'import {'+name+'} from '+JSON.stringify(from)+';');
   for(const statement of helperAst.statements){
    if(ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(item=>consts.includes(item.name.getText(helperAst))))parts.push(statement.getText(helperAst));
    if(ts.isVariableStatement(statement))for(const item of statement.declarationList.declarations){const name=item.name.getText(helperAst);if(!(name in tables))continue;
     const object=item.initializer&&ts.isCallExpression(item.initializer)?item.initializer.arguments[0]:item.initializer;assert(object&&ts.isObjectLiteralExpression(object),id+':'+name+' is a literal table');
     parts.push('const '+name+'=Object.freeze({'+object.properties.map(property=>JSON.stringify(property.name.getText(helperAst))+':()=>{throw Error('+JSON.stringify('Cold factory cannot run '+tables[name]+' ')+'+'+JSON.stringify(property.name.getText(helperAst))+');}').join(',')+'});');}
    if(ts.isFunctionDeclaration(statement)&&names.includes(statement.name?.text)||ts.isClassDeclaration(statement)&&classes.includes(statement.name?.text))parts.push(statement.getText(helperAst));
   }
   const value=evaluate(parts.join('\n')+'\nexport {'+[...names,...classes].join(',')+'};',dependency);for(const name of [...names,...classes])assert.equal(typeof value[name],'function',id+' keeps actual '+name);
   actualHelperValues.set(id,value);
  }
  return actualHelperValues.get(id);
 }
 function dependency(id){
  if(!modules.has(id)){
   let value;
   if(provider==='delegated500'&&id==='./delegated500-scoped-functions')value=evaluate(read(id),arityModule);
   // The prepared-source workspace is a pure runtime leaf (no model reads; it is
   // created lazily and only reserves on first use). Evaluate its actual text
   // against the fixture page's real shader-source-budget and family leaves.
   else if(id==='../../../safety/prepared-source')value=evaluate(read(id),leaf=>{assert(['./family-paint-program','./render-runtime/shader-source-budget'].includes(leaf),'prepared-source imports only pure leaves: '+leaf);return base('../../../safety/'+leaf.slice(2));});
   // Public empty draws still capture and validate a real main-frame witness.
   // This pure helper must not fall through to a generic tiny import seam.
   else if(id==='../../../safety/render-runtime/main-draw-bindings')value=evaluate(read(id));
   else if(provider==='delegated500'&&id==='./paint-run-visibility'||['root500','infill','tier300','church'].includes(provider)&&id==='../../delegated500/safety/paint-run-visibility')value=evaluate(read(id));
   else if(provider==='delegated500'&&id==='./current-paint-program')value=evaluate(read(id),dependency);
   else if(cityEmptyModules.has(id))value=evaluate(read(id),dependency);
   else{
    const target=base(id),properties=new Map();
    // The production registry keys functions by identity. Preserve the same
    // imported tiny function across registry construction and factory imports.
    const actual=actualHelpers.has(id)?actualHelper(id):undefined;
    value=new Proxy(target,{get:(o,name)=>{const override=scopedFunctions.get(id);if(override?.has(name))return override.get(name);if(actual&&Object.hasOwn(actual,name))return actual[name];if(!properties.has(name))properties.set(name,Reflect.get(o,name));return properties.get(name);}});
   }
   modules.set(id,value);
  }
  return modules.get(id);
 }
 return dependency;
}

// The complete production factory runs in its original order. Only
// external model/material dependencies use the existing tiny residency seams;
// no closure extraction, declaration hoisting or fixture-owned state replaces
// any factory local. No GL context or source asset is needed to expose the TDZ.
function fixture(provider='delegated500',text=rendererSource(provider),city='cologne',{observeProgramOwner}={}){
 const h=residencyFixture('infill',{city:'cologne',dependencyOverrides:{
  './facade-paint-fragment':{facadePaintSpecializationForCity:()=>undefined},
 }}),ast=ts.createSourceFile(provider+'-renderer.ts',text,ts.ScriptTarget.Latest,true);
 const preparation=h.dependency('../../../safety/render-runtime/program-preparation');
 if(observeProgramOwner){
  const create=preparation.createProgramPreparationOwner;
  // Observe the real module boundary, never insert/replace a factory local.
  // Peers and geometry dependencies retain this exact module's WeakMaps.
  h.overrideDependency('../../../safety/render-runtime/program-preparation',{createProgramPreparationOwner(...args){const owner=create(...args);observeProgramOwner(owner,args[0]);return owner;}});
 }
 const factory=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createBuildingMeshRenderer');assert(factory);
 const imports=ast.statements.filter(ts.isImportDeclaration).map(n=>n.getText(ast));
 const moduleState=ast.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(declaration=>['delegatedProgramOwnerSequence','cityDataPlanSequence','churchProgramOwnerSequence','churchChunkInstanceSequence','delegatedChunkInstanceSequence','delegatedColourSourceAuthority','COLOUR_ATTRIBUTES','COLOUR_ASSEMBLY_AUTHORITY'].includes(declaration.name.getText(ast)))).map(n=>n.getText(ast));
 if(provider==='delegated500')assert(moduleState.some(source=>source.includes('delegatedColourSourceAuthority')),'retain the actual module-owned colour source authority');
 if(provider==='city')assert.equal(moduleState.length,1,'retain the actual city module sequence declaration');
 // Keep the entire factory body byte-for-byte, including declarations below
 // its return. Module-level model assemblies are outside this initialization check.
 // The actual module-level matrix helpers (pure Float64Array math) are needed
 // by the public render closure once a frame is accepted.
 const moduleFunctionNames=new Set([...(provider==='bremen'?['fragment']:[]),'multiply','inverse','project']);
 const moduleFunctions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&moduleFunctionNames.has(n.name?.text)||ts.isVariableStatement(n)&&n.declarationList.declarations.some(declaration=>moduleFunctionNames.has(declaration.name.getText(ast)))).map(n=>n.getText(ast));
 const module=evaluate([...imports,...moduleFunctions,...moduleState,factory.getText(ast)].join('\n'),factoryDependencies(provider,h.dependency,ast)),handlers=new Map();
 const map={getCanvas:()=>({width:32,height:32,clientWidth:32,clientHeight:32}),on(name,fn){handlers.set(name,fn);},off(name,fn){if(handlers.get(name)===fn)handlers.delete(name);},triggerRepaint(){}};
 return{h,handlers,preparation,create:()=>module.createBuildingMeshRenderer(map,city)};
}

for(const provider of ['city','delegated500','tier300','church','bremen'])test(provider+': complete cold factory initializes its public closures before returning',async()=>{
 const f=fixture(provider);await f.h.environment(async()=>{
  const r=f.create();
  const diagnostic=r.getReadinessDiagnostic(),emptyGeometry={revision:null,ownedBufferBytes:0,ownedBuffers:0,borrowedBuffers:0,contextId:null,contextIdScope:'last-upload-context',lifetimeScope:'geometry-owner-lifetime-across-contexts',createdBuffers:0,deleteBufferRequests:0,createdVertexArrays:0,deleteVertexArrayRequests:0};
  // The owners now also report their chunk-store role and the page store; the
  // original empty-owner fields stay exact, and nothing may be allocated.
  assert.deepEqual(Object.keys(diagnostic.geometryResources).sort(),['main','shadow']);
  for(const [role,value] of Object.entries(diagnostic.geometryResources)){
   assert.deepEqual(Object.fromEntries(Object.keys(emptyGeometry).map(name=>[name,value[name]])),emptyGeometry,role);
   if('chunks' in value)assert.equal(value.chunks,0,role+' has no resident chunk');
   if(value.resourceStore)for(const name of ['resources','cpu','gpu','gpuAllocations','productions','preparing','ready','retiring'])assert.equal(value.resourceStore[name],0,role+' store '+name);
  }
  if(provider==='delegated500'){assert.equal(diagnostic.geometryUploadFailure,undefined);assert.equal(diagnostic.residentPublicationFailure,undefined);}
  const preparation=r.getProgramPreparationStats();assert.equal(preparation.length,1);assert.equal(preparation[0].provider,provider);assert.equal(preparation[0].pending,0);
  const readiness=r.getDrawReadiness();assert.equal(typeof readiness.ready,'boolean');assert.equal(typeof readiness.preparing,'boolean');
  assert.doesNotThrow(()=>r.setPageHidden(true));
  assert.doesNotThrow(()=>r.setPageHidden(false));
  assert.equal(r.residentVertexCount,0);
  assert.equal(f.h.scopes.length,0,'cold factory initialization cannot acquire a data scope');
  assert.equal(f.h.ledgers.length,0,'cold metadata queries cannot read a frozen resource');
  assert.equal(f.h.sources.length,0,'cold initialization must not construct model shaders');
  assert.equal(f.h.buffers.size,0,'cold initialization must not allocate geometry');
  r.destroy();assert.equal(f.handlers.size,0);
 });
});

for(const provider of ['city','delegated500','tier300','church','bremen'])test(provider+': complete factory public cancellation works without a registered candidate',async()=>{
 const f=fixture(provider);await f.h.environment(async()=>{
  const r=f.create();
  try{
   assert.equal(typeof r.cancelCandidate,'function');
   assert.doesNotThrow(()=>r.cancelCandidate(0),'the initial generation has no candidate or failure latch to cancel');
   assert.doesNotThrow(()=>r.cancelCandidate(37),'an unmatched generation is a harmless public no-op');
   assert.equal(r.residentVertexCount,0);assert.equal(f.h.scopes.length,0);assert.equal(f.h.ledgers.length,0);assert.equal(f.h.sources.length,0);assert.equal(f.h.buffers.size,0);
  }finally{r.destroy();}
  assert.equal(f.handlers.size,0);
 });
});

for(const provider of ['city','delegated500','tier300','church','bremen'])test(provider+': complete factory first public empty draw keeps the resident state empty',async()=>{
 const f=fixture(provider);await f.h.environment(async()=>{
  const r=f.create(),mainMatrix=Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  try{
   r.setEnabled(true);assert.doesNotThrow(()=>r.layer.onAdd(undefined,f.h.gl));
   assert.doesNotThrow(()=>r.layer.render(f.h.gl,{defaultProjectionData:{mainMatrix}}),'exercise the original public render closure with the existing tiny GL, not an extracted helper');
   assert.equal(r.residentVertexCount,0);assert.equal(f.h.scopes.length,0);assert.equal(f.h.ledgers.length,0);assert.equal(f.h.sources.length,0);assert.equal(f.h.buffers.size,0);assert.equal(f.h.draws.length,0,'an empty first view must not invent a building draw');
   if(provider==='delegated500'){
    assert.equal(r.isPickReady(),true,'the accepted empty frame must settle picking readiness');
    assert.equal(r.getDrawReadiness().ready,true,'the accepted empty frame must settle provider readiness');
   }
  }finally{r.destroy();}
  assert.equal(f.handlers.size,0);
 });
});

// A recovered peer has already submitted into the shared context before the
// second renderer receives its restore notification. The receiver is cold only
// with respect to model data: its actual owner must bind and compile on this GL
// before loss, otherwise a duplicate contextLost() would be a harmless no-op.
for(const provider of ['church','delegated500'])test(provider+': late actual restore listener preserves a recovered peer owner on the same GL context',async()=>{
 const observed=[],f=fixture(provider,rendererSource(provider),'cologne',{observeProgramOwner:(owner,source)=>observed.push({owner,source})});
 await f.h.environment(async()=>{
  const r=f.create();let peer;const linked=[],link=f.h.gl.linkProgram;
  f.h.gl.linkProgram=(...args)=>{linked.push(args[0]);return link.apply(f.h.gl,args);};
  let demandRevision=1;
  const build=()=>({vertex:'void main(){gl_Position=vec4(0.0);}',fragment:'precision mediump float;void main(){gl_FragColor=vec4(1.0);}',attributes:[]});
  const authority=f.preparation.createProgramSourceAuthority({inputs:['factory-recovery-tiny-source'],builders:[build]});
  const recipe=resource=>({resource,sharedKey:provider+':factory-recovery:'+resource,inputs:[resource],provenance:[authority],current:()=>demandRevision===1,build});
  const until=(ready,label)=>{for(let i=0;i<32&&!ready();i++)assert(f.h.tick(),label+': actual scheduler retains a timer');assert(ready(),label+': bounded actual preparation must settle');};
  const compiled=(owner,value)=>{
   assert.throws(()=>owner.compile(f.h.gl,value),error=>f.preparation.isProgramPreparationPending(error)&&error.status==='pending');
   until(()=>owner.stats.ready===1,value.resource);return owner.compile(f.h.gl,value);
  };
  try{
   assert.equal(observed.length,1,'the complete factory creates its actual preparation owner once');
   const receiver=observed[0].owner;assert.equal(observed[0].source,provider+' cologne');
   r.setEnabled(true);r.layer.onAdd(undefined,f.h.gl);
   const beforeLoss=compiled(receiver,recipe('receiver-before-loss'));
   assert(linked.includes(beforeLoss),'receiver owner really submitted and linked on the same GL');
   assert.equal(receiver.stats.shared.heldReferences,1,'a cold unbound receiver cannot satisfy this precondition');
   const initialEpoch=receiver.stats.context.epoch;
   const lost=f.handlers.get('webglcontextlost'),restored=f.handlers.get('webglcontextrestored');assert.equal(typeof lost,'function');assert.equal(typeof restored,'function');
   f.h.control.lost=true;lost();
   assert.equal(receiver.stats.context.epoch,initialEpoch+1,'the actual loss listener invalidates its bound context');
   f.h.control.lost=false;
   peer=f.preparation.createProgramPreparationOwner('peer-restored-first',()=>{});
   const peerRecipe=recipe('peer-after-loss'),peerProgram=compiled(peer,peerRecipe);
   assert.notEqual(peerProgram,beforeLoss);assert(linked.includes(peerProgram),'peer performs a real post-loss program submission');
   const recoveredEpoch=peer.stats.context.epoch;assert.equal(recoveredEpoch,initialEpoch+1);
   assert.equal(peer.stats.shared.heldReferences,1);
   let uploads=0;
   assert.equal(peer.work(f.h.gl,{resource:'peer-after-loss-upload',revision:1,current:()=>demandRevision===1,work(){uploads++;}}),false);
   assert.equal(uploads,0);assert.equal(peer.stats.pending,1,'peer has fresh queued work before the late listener');
   assert.equal(f.h.gl.isContextLost(),false,'logical epoch invalidation remains a bug when the GL reports restored');
   restored();
   assert.equal(peer.stats.context.epoch,recoveredEpoch,'late renderer restore must not invalidate a recovered peer epoch');
   assert.equal(peer.stats.pending,1,'late restore must not cancel the peer upload');
   assert.equal(peer.stats.shared.heldReferences,1,'late restore preserves the peer linked grant');
   const readyAgain=peer.acquireReadyProgram(f.h.gl,peerRecipe);
   assert.equal(readyAgain,peerProgram,'the exact ready peer program remains acquirable after actual restore');
   peer.releaseProgram(f.h.gl,readyAgain);
   assert(!f.h.deletedPrograms.includes(peerProgram),'no deletion request may target the live peer program');
   until(()=>uploads===1,'peer-after-loss-upload');assert.equal(peer.stats.pending,0);assert.equal(peer.stats.context.epoch,recoveredEpoch);
   peer.releaseProgram(f.h.gl,peerProgram);assert.equal(peer.stats.shared.heldReferences,0);
   assert.equal(f.h.deletedPrograms.filter(program=>program===peerProgram).length,1,'final grant release issues one deletion request, not evidence of native physical reclamation');
  }finally{demandRevision++;peer?.dispose();r.destroy();}
  assert.equal(f.handlers.size,0);
 });
});

// A local seven-factory contract, not a repository-wide lint rule. Function and
// type declarations after a direct return need no runtime initialization; even
// an uninitialized let is forbidden there because its binding stays in the TDZ.
for(const provider of ['root500','infill','bremen','city','delegated500','tier300','church'])test(provider+': complete factory has no runtime initialization after its public return',()=>{
 const text=rendererSource(provider),ast=ts.createSourceFile(provider+'-renderer.ts',text,ts.ScriptTarget.Latest,true);
 assert.equal(ast.parseDiagnostics.length,0,provider+': source parses');
 const factory=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createBuildingMeshRenderer');assert(factory);
 const statements=[...factory.body.statements],returned=statements.findIndex(ts.isReturnStatement);assert(returned>=0,provider+': direct public factory return exists');
 const runtime=statements.slice(returned+1).filter(node=>!ts.isFunctionDeclaration(node)&&!ts.isTypeAliasDeclaration(node)&&!ts.isInterfaceDeclaration(node)&&!ts.isEmptyStatement(node));
 assert.deepEqual(runtime.map(node=>({line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,source:node.getText(ast).slice(0,240)})),[],provider+': returned public closures cannot initialize later runtime declarations');
});

test('city: cold Munich empty publication does not acquire a scope through C311/C312 wrappers',async()=>{
 const f=fixture('city',rendererSource('city'),'munich');await f.h.environment(async()=>{const r=f.create();assert.doesNotThrow(()=>r.setBatches([],0));assert.equal(r.residentVertexCount,0);assert.equal(f.h.scopes.length,0,'empty publication does not prepare frozen data');assert.equal(f.h.ledgers.length,0,'empty publication does not read a frozen resource');assert.equal(f.h.sources.length,0,'empty publication does not assemble source');assert.equal(f.h.buffers.size,0);assert.deepEqual(r.getReadinessDiagnostic().preparedData,{resident:undefined,candidate:undefined});r.destroy();assert.equal(f.handlers.size,0);});
});

// These pure-query cases reuse the same suite; they do not replace the complete cold factories above.
async function readiness(provider){
 const file=new URL('../src/painted/'+provider+'/safety/building-mesh-renderer.ts',import.meta.url),text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file.pathname,text,ts.ScriptTarget.Latest,true),bindings=new Map();let factory;
 const helpers=new Set(['isPickReady','getDrawReadiness','multiply','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','mainPaintDemandFor','mainPaintDemand','mainPaintProgramKeys','hasVisibleUnsupportedQueueComponent']);
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='createBuildingMeshRenderer')factory=node;if(ts.isFunctionDeclaration(node)&&helpers.has(node.name?.text))bindings.set(node.name.text,node.getText(ast));if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='mainFamilyProgramKey')bindings.set('mainFamilyProgramKey',node.initializer.getText(ast));ts.forEachChild(node,visit);}visit(ast);
 assert.equal(ast.parseDiagnostics.length,0,provider+': source parses');assert(factory);const api=factory.body.statements.find(ts.isReturnStatement)?.expression;assert(api&&ts.isObjectLiteralExpression(api));
 for(const name of ['isPickReady','getDrawReadiness']){assert(bindings.has(name),provider+': real readiness function');assert(api.properties.some(n=>n.name?.getText(ast)===name),provider+': API exposes '+name);}
 const state={destroyed:false,pageHidden:false,enabled:true,gl:{isContextLost:()=>false},matrix:new Float32Array(16),gpuReady:()=>true,residentGPU:{isEmptyReady:()=>false},geometryUploadPending:false,geometryUploadRevision:1,geometryPublishedRevision:1,geometryFailure:undefined,mainDrawFailure:undefined,geometryUploadFailure:undefined,geometryPostPublishFailure:undefined,residentPublicationFailure:undefined,mainGeometryProgramFailure:undefined,mainProgramFailure:undefined,materialSourceFailure:undefined,materialSourceSettled:true,indices:new Uint32Array([0,1,2]),pendingGeometryCandidate:undefined,pendingGeometry:undefined,pendingMaterialBatches:undefined,materialProgramsCurrent:()=>true,paintMode:()=>2,overrideProgramKey:()=>undefined,currentPaintProgramKey:n=>'family-'+n,programOverrideKey:()=>undefined,richPaintProgramKey:key=>key,distantPaintProgramKey:key=>key,paintBoxOutsideClip:()=>false,paintRunIntersectsVisible:(first,count,ranges)=>ranges.some(([start,end])=>first<end&&first+count>start),program:{},familyPending:false,familyRuns:[],familyPrograms:new Map(),familyFailures:new Map(),loaded:new Map(),landmarkVisible:false,city:'bremen',berlinSharedFamilyPrograms:false,partitionEnabled:false,partitionPending:false,partitionRuns:[],partitionPrograms:new Map(),partitionFailures:new Map(),fullProgramUpgradePending:false,fullProgramUpgradeFailure:undefined,queueOnlyProgram:false,shadowUploadPending:true,programPreparation:{stats:{pending:3,pendingResources:[{resource:'capture-only',phase:'link-completion',priority:'capture'}]},work(){assert.fail('readiness cannot advance preparation');},compile(){assert.fail('readiness cannot compile');}}};
 // Current readiness reads the resident index count through sceneIndexCount()
 // and requires a drawn main-frame witness for the current resident revision;
 // this fixture treats each published state as drawn.
 Object.assign(state,{sceneIndexCount:()=>state.indices.length,mainDrawWitnessCurrent:()=>true,mainFrameCurrent:()=>true,emptyMainFrameCurrent:()=>true,contextRecoveryFailure:undefined,activeChunkPreparation:undefined,
  // mainPaintDemand() derives its clip from the chunk anchor frame; without a
  // separate world matrix it uses the published matrix, as this fixture does.
  anchor:[0,0],anchorUnit:1,mainWorldMatrix:undefined});
 if(provider==='city')Object.assign(state,{mainWorldProjection:Float64Array.from({length:16},(_,i)=>i%5===0?1:0),mainVisibilityCache:new WeakMap(),generation:1,viewRevision:1,mainGPUIncarnation:0,window:{devicePixelRatio:1},map:{getCanvas:()=>({width:512,height:512})}});
 if(provider==='delegated500'||provider==='church'){
  // Keep the real geometric projection/cache, including its original clip test.
  // This query fixture supplies one stable publication identity and revisions;
  // the cases below replace accepted maps/runs as they change visible demand.
  const visibility=evaluate(fs.readFileSync(new URL('../src/painted/delegated500/safety/paint-run-visibility.ts',import.meta.url),'utf8'));
  Object.assign(state,visibility,{sceneSpans:[],generation:1,viewRevision:1,mainGPUIncarnation:0});
 }
 Object.assign(state,{dataPreparationPending:undefined,dataPreparationFailure:undefined,candidateFailure:undefined,pendingData:undefined,batchPreparationFailure:undefined,mainViewportRuns:undefined,unsupportedQueueComponents:new Set()});
 const env=new Proxy(state,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:k in globalThis?globalThis[k]:(()=>{throw Error('Unspecified readiness dependency '+String(k));})()});
 for(const [name,source]of bindings){const js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;state[name]=Function('env','with(env){return '+js+'}')(env);}
 return state;
}

for(const provider of ['city','delegated500','tier300','church']){
 test(provider+': draw readiness separates required preparation from an old pickable view and background capture',async()=>{
  const state=await readiness(provider);
  state.familyFailures.set('unneeded-family','controlled background failure');state.partitionFailures.set('unneeded-family','controlled background failure');
  assert.equal(state.isPickReady(),true);assert.equal(state.getDrawReadiness().ready,true,'background capture, unrelated failures and shadow work do not block colour draw');
  if(provider!=='church'){
   state.dataPreparationPending=provider==='city'?2:provider==='tier300'?true:{token:2};
   assert.equal(state.isPickReady(),true,'data preparation retains the old published pick authority');
   assert.equal(state.getDrawReadiness().ready,false);assert.equal(state.getDrawReadiness().preparing,true,'the actual early data phase owns draw readiness');
   state.dataPreparationPending=undefined;
  }
  if(provider==='church'){state.paintMode=()=>1;state.landmarkVisible=true;state.facadeAttached=false;state.diffuseTexture=undefined;state.windowTexture={stats:{loading:true,textureObjects:0}};assert.equal(state.getDrawReadiness().ready,true,'texture download keeps the existing colour fallback');state.paintMode=()=>2;state.landmarkVisible=false;}
  state.geometryUploadPending=true;
  let result=state.getDrawReadiness();assert.equal(result.ready,false);assert.equal(result.preparing,true,'required geometry still prepares');
  state.geometryUploadPending=false;
  if(provider==='church')state.fullProgramUpgradePending=true;else{if(provider==='tier300')state.pendingData={id:2};else state.pendingMaterialBatches=[[],2];state.materialSourceSettled=false;}
  result=state.getDrawReadiness();assert.equal(state.isPickReady(),true,'old published view remains pickable');assert.equal(result.ready,false);assert.equal(result.preparing,true,'new material source cannot look drawn');
  state.pendingMaterialBatches=undefined;state.pendingData=undefined;state.materialSourceSettled=true;state.fullProgramUpgradePending=false;
  const run={key:'family-6277',firstIndex:0,indexCount:3};state.familyRuns=[run];state.partitionRuns=[run];state.partitionEnabled=true;state.loaded=new Map([['visible',{box:[0,0,0,1,1,1],start:0,end:3}]]);
  result=state.getDrawReadiness();assert.equal(result.ready,false);assert.equal(result.preparing,true,'current colour demand still prepares');
  state.familyFailures.set(run.key,'controlled visible colour failure');state.partitionFailures.set(run.key,'controlled visible colour failure');
  result=state.getDrawReadiness();assert.equal(result.ready,false);assert.equal(result.preparing,false);assert.match(result.failure,/controlled visible colour failure/);
  state.familyFailures.delete(run.key);state.partitionFailures.delete(run.key);state.familyPrograms.set(run.key,{});state.partitionPrograms.set(run.key,{});
  assert.equal(state.getDrawReadiness().ready,true);
  if(provider==='delegated500'){
   state.programOverrideKey=()=> 'override';state.richPaintProgramKey=()=>assert.fail('readiness must use the draw key resolver');state.distantPaintProgramKey=key=>{assert.equal(key,'override');return 'override-draw';};
   state.partitionPrograms.set('override-draw',{});assert.equal(state.getDrawReadiness().ready,true,'override observes the same resident key as draw');
   state.partitionPrograms.delete('override-draw');state.partitionFailures.set('override-draw','controlled override colour failure');
   result=state.getDrawReadiness();assert.equal(result.ready,false);assert.match(result.failure,/controlled override colour failure/);
   state.programOverrideKey=()=>undefined;state.distantPaintProgramKey=key=>key;state.richPaintProgramKey=key=>key;state.partitionFailures.delete('override-draw');
  }
  state.familyRuns=[];state.partitionRuns=[];

  state.geometryUploadFailure='controlled main upload failure';state.geometryFailure='controlled main upload failure';state.geometryUploadRevision=2;
  result=state.getDrawReadiness();assert.equal(result.ready,false);assert.equal(result.preparing,false);assert.match(result.failure,/controlled main upload failure/);
  state.geometryUploadFailure=undefined;state.geometryFailure=undefined;state.geometryUploadRevision=1;
  assert.equal(state.getDrawReadiness().ready,true);
  state.pageHidden=true;assert.deepEqual(state.getDrawReadiness(),{ready:false,preparing:false});
  state.pageHidden=false;state.enabled=false;assert.deepEqual(state.getDrawReadiness(),{ready:false,preparing:false});
  state.enabled=true;state.gl.isContextLost=()=>true;result=state.getDrawReadiness();assert.equal(result.ready,false);assert.equal(result.failure,undefined);
  state.gl.isContextLost=()=>false;state.indices=new Uint32Array();state.matrix=undefined;state.gpuReady=()=>false;state.residentGPU.isEmptyReady=()=>true;
  assert.equal(state.getDrawReadiness().ready,true,'the lifecycle-certified empty view remains ready');
 });
}
