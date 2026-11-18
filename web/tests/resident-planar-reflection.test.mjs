import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const web=process.env.CRIMEMAPS_REFLECTION_WEB_ROOT??fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript'),{build,transform,transformSync}=require('esbuild');
const {keyedComponents,createFixtureResourceStore,residentProgramLoans,installResidentChunkScene}=await import(new URL('./support/resident-chunk-scene.mjs',import.meta.url));
const identity=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),providers=['city','root500','delegated500','tier300','church','infill','bremen'];
function scope(values){return new Proxy(values,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});}
async function evaluate(text,values){const compiled=await transform('('+text+')',{loader:'ts',target:'es2022'});return Function('env','with(env){return '+compiled.code+'}')(scope(values));}
function evaluateSync(text,values){const compiled=transformSync('('+text+')',{loader:'ts',target:'es2022'});return Function('env','with(env){return '+compiled.code+'}')(scope(values));}
// Every renderer function that an extracted closure reaches is that renderer's
// own declaration (closure level first, then module level), bound on first use.
// Fixture state, stubs and explicitly extracted closures already in `values`
// keep precedence; a later explicit assignment replaces the lazy binding.
function installLazyRendererClosures(text,values){
 const ast=parsed(text);let block;(function find(n){if(!block&&ts.isFunctionDeclaration(n)&&n.name?.text==='residentCaptureAdapter')block=n.parent;else if(!block)ts.forEachChild(n,find);})(ast);assert(block&&ts.isBlock(block),'actual renderer closure');
 const declarations=new Map(),bound=[];
 const collect=statements=>{for(const node of statements){if(ts.isFunctionDeclaration(node)&&node.name&&node.body)declarations.set(node.name.text,node.getText(ast).replace(/^export\s+/,''));else if(ts.isVariableStatement(node)&&node.declarationList.flags&ts.NodeFlags.Const)for(const declaration of node.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&declaration.initializer&&(ts.isArrowFunction(declaration.initializer)||ts.isFunctionExpression(declaration.initializer)))declarations.set(declaration.name.text,declaration.initializer.getText(ast));}};
 collect(ast.statements);collect(block.statements);
 for(const [name,source]of declarations){if(name in values)continue;const define=value=>Object.defineProperty(values,name,{configurable:true,enumerable:true,writable:true,value});Object.defineProperty(values,name,{configurable:true,enumerable:false,get(){const value=evaluateSync(source,values);define(value);bound.push(name);return value;},set:define});}
 // Closure-level state starts from the renderer's own declared initial value
 // when that value is a plain literal or an empty collection; constructed
 // owners (geometry, stores, scopes) are never created here.
 const literal=node=>!node||ts.isLiteralExpression(node)||ts.isPrefixUnaryExpression(node)&&ts.isNumericLiteral(node.operand)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword,ts.SyntaxKind.NullKeyword].includes(node.kind)||ts.isIdentifier(node)&&node.text==='undefined'||ts.isArrayLiteralExpression(node)&&!node.elements.length||ts.isObjectLiteralExpression(node)&&!node.properties.length||ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&['Map','Set','WeakMap','WeakSet'].includes(node.expression.text)&&!node.arguments?.length||ts.isAsExpression(node)&&literal(node.expression);
 for(const node of block.statements)if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations){
  if(!ts.isIdentifier(declaration.name)||!declaration.initializer||!literal(declaration.initializer))continue;const name=declaration.name.text,source=declaration.initializer.getText(ast);if(name in values)continue;
  const define=value=>Object.defineProperty(values,name,{configurable:true,enumerable:true,writable:true,value});Object.defineProperty(values,name,{configurable:true,enumerable:false,get(){const value=evaluateSync(source,values);define(value);bound.push(name);return value;},set:define});
 }
 return bound;
}
// Renderer sources are large; reuse the last parsed trees instead of reparsing
// the same text for every extracted closure. Extraction itself is unchanged.
const parsedSources=new Map();
function parsed(text){let ast=parsedSources.get(text);if(ast){parsedSources.delete(text);parsedSources.set(text,ast);return ast;}ast=ts.createSourceFile('renderer.ts',text,ts.ScriptTarget.Latest,true);parsedSources.set(text,ast);while(parsedSources.size>2)parsedSources.delete(parsedSources.keys().next().value);return ast;}
function method(text,name){const ast=parsed(text);let found;function visit(n){if((ts.isMethodDeclaration(n)||ts.isFunctionDeclaration(n)||ts.isPropertyAssignment(n))&&n.name?.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert(found,name);return ts.isPropertyAssignment(found)?found.initializer.getText(ast):'function '+name+found.getText(ast).slice(name.length);}
function binding(text,name){const ast=parsed(text);let found;function visit(n){if((ts.isVariableDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.getText(ast)===name)found=n;ts.forEachChild(n,visit);}visit(ast);assert(found,name);return ts.isVariableDeclaration(found)?found.initializer.getText(ast):found.getText(ast).replace(/^export\s+/,'');}
const currentKeySource=await readFile(path.join(web,'src/painted/delegated500/safety/current-paint-program.ts'),'utf8'),currentPaintProgramKey=await evaluate(binding(currentKeySource,'currentPaintProgramKey'),{}),currentPaintProgramFamily=await evaluate(binding(currentKeySource,'currentPaintProgramFamily'),{});
// One module graph for every production helper, like one page: the chunk
// store/budget, resident geometry owner, capture runtime, preparation owner and
// the renderer imports listed below share module state (context stores,
// preparation schedulers, error classes) instead of one private copy each.
const RUNTIME_MODULES=['src/safety/resident-planar-reflection.ts','src/safety/solar-shadow-preparation.ts','src/safety/render-runtime/resident-capture.ts','src/safety/render-runtime/chunk-resource-store.ts','src/safety/render-runtime/resource-budget.ts','src/safety/render-runtime/resident-geometry.ts','src/painted/delegated500/safety/berlin-distant-paint.ts','src/painted/church/safety/berlin-church-program-sharing.ts','src/safety/family-paint-program.ts','src/safety/render-runtime/program-preparation.ts','src/safety/prepared-source.ts','src/safety/render-runtime/program-grant-handoff.ts','src/painted/delegated500/safety/current-paint-program.ts','src/safety/utf8-byte-length.ts','src/painted/delegated500/safety/paint-run-visibility.ts','src/safety/frozen-data-scope.ts','src/safety/frozen-data-lease-store.ts','src/painted/city/safety/city-data-metadata.ts','src/painted/delegated500/safety/delegated500-data-demand.ts','src/painted/tier300/safety/s434-cohort-constants.ts','src/painted/tier300/safety/s020-relation-outline-profile.ts','src/safety/facade-rathaus-display-masks.ts','src/safety/render-runtime/shader-source-budget.ts'];
// Renderer imports that the extracted capture/preparation closures now call.
// Each is resolved from that renderer's own import declaration.
const RENDERER_IMPORTS=['currentPaintProgramGroups','createPaintProgramIdleRetirement','sharedInfillEquivalentProgramFamilies','retainRendererChunkInput','splitChunkRuns','getChunkResourceStoreForContext','bindChunkResourceContext','ChunkResourceContextLostError','createResidentGeometryOwner'];
const rendererImports=new Map();
for(const provider of providers){
 const file=path.join(web,`src/painted/${provider}/safety/building-mesh-renderer.ts`),ast=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true),rows=[];
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings))for(const element of node.importClause.namedBindings.elements){
  if(element.isTypeOnly||!RENDERER_IMPORTS.includes(element.name.text))continue;
  const relative=path.relative(web,path.resolve(path.dirname(file),node.moduleSpecifier.text))+'.ts';rows.push({local:element.name.text,exported:(element.propertyName??element.name).text,relative});if(!RUNTIME_MODULES.includes(relative))RUNTIME_MODULES.push(relative);
 }
 rendererImports.set(provider,rows);
}
const runtimeBuild=await build({stdin:{contents:RUNTIME_MODULES.map((relative,index)=>`export * as m${index} from ${JSON.stringify(path.join(web,relative))};`).join('\n'),resolveDir:web,sourcefile:'reflection-fixture-runtime.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',target:'es2022',write:false});
const runtimeNamespaces=await import('data:text/javascript;base64,'+Buffer.from(runtimeBuild.outputFiles[0].text+'\n//# sourceURL=fixture-reflection-runtime.mjs').toString('base64'));
async function productionHelpers(relative){const index=RUNTIME_MODULES.indexOf(relative);assert(index>=0,'shared fixture runtime includes '+relative);return runtimeNamespaces['m'+index];}
const helpers=await productionHelpers('src/safety/resident-planar-reflection.ts');
const solarPreparationHelpers=await productionHelpers('src/safety/solar-shadow-preparation.ts');
const captureHelpers=await productionHelpers('src/safety/render-runtime/resident-capture.ts');
const chunkResourceHelpers=await productionHelpers('src/safety/render-runtime/chunk-resource-store.ts');
const resourceBudgetHelpers=await productionHelpers('src/safety/render-runtime/resource-budget.ts');
const residentGeometryHelpers=await productionHelpers('src/safety/render-runtime/resident-geometry.ts');
const displayMaskHelpers=await productionHelpers('src/safety/facade-rathaus-display-masks.ts');
const shaderSourceHelpers=await productionHelpers('src/safety/render-runtime/shader-source-budget.ts');
const sceneRuntime={chunkResourceStore:chunkResourceHelpers,resourceBudget:resourceBudgetHelpers,residentGeometry:residentGeometryHelpers};
const distantHelpers=await productionHelpers('src/painted/delegated500/safety/berlin-distant-paint.ts');
const churchHelpers=await productionHelpers('src/painted/church/safety/berlin-church-program-sharing.ts');
const familyHelpers=await productionHelpers('src/safety/family-paint-program.ts'),preparationHelpers=await productionHelpers('src/safety/render-runtime/program-preparation.ts');
const preparedSourceHelpers=await productionHelpers('src/safety/prepared-source.ts');
const grantHandoffHelpers=await productionHelpers('src/safety/render-runtime/program-grant-handoff.ts');
const currentPaintHelpers=await productionHelpers('src/painted/delegated500/safety/current-paint-program.ts');
const utf8Helpers=await productionHelpers('src/safety/utf8-byte-length.ts');
// The delegated context-ledger workspace factory, extracted from its module the
// same way as other production closures: its module also reaches the frozen
// paint tables, which these fixtures never load.
const delegatedBudgetSource=await readFile(path.join(web,'src/painted/delegated500/safety/delegated-shader-budget.ts'),'utf8');
const createContextPreparedSourceWorkspace=await evaluate(binding(delegatedBudgetSource,'createContextPreparedSourceWorkspace'),{createPreparedSourceWorkspace:preparedSourceHelpers.createPreparedSourceWorkspace,unusedWorkspaceStats:await evaluate(binding(delegatedBudgetSource,'unusedWorkspaceStats'),{})});
async function installRendererImports(provider,values){for(const {local,exported,relative}of rendererImports.get(provider)??[]){if(local in values)continue;const value=(await productionHelpers(relative))[exported];assert(value!==undefined,provider+' import '+local);values[local]=value;}}
// Synthetic material inputs are measured only after their existing builder ran.
// No fixture claims to know the size of an unbuilt complete fallback.
function describeFixturePaintSource(values,city,source,kind,preparedScope){const bytes=utf8Helpers.utf8ByteLength(source);return{...values.facadePaintSpecializationForCity(city,preparedScope),sourceKind:kind,fragmentBytes:bytes,fullFragmentBytes:kind==='full'?bytes:null};}
const visibilityHelpers=await productionHelpers('src/painted/delegated500/safety/paint-run-visibility.ts');
const scopeHelpers=await productionHelpers('src/safety/frozen-data-scope.ts');
const leaseHelpers=await productionHelpers('src/safety/frozen-data-lease-store.ts');
const recipeProviders=new Set(['root500','infill','bremen']);
let fixtureSequence=0;
function tinyPreparedResources(provider,city,resources,payloads,partition){
 const physical=new Map(),descriptors=new Map(),bindings=new Map(),initializers={};
 resources.forEach((ref,index)=>{const bytes=Buffer.from(JSON.stringify(payloads[index])),sha256=createHash('sha256').update(bytes).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:bytes.length};descriptors.set(sha256,descriptor);physical.set(descriptor.path,bytes);bindings.set(ref.file+'|'+ref.canonicalSHA256,descriptor);(initializers[sha256]??={})[ref.file]=1;});
 const store=leaseHelpers.createFrozenDataLeaseStore([...descriptors.values()]),client=store.client({city,profileSHA256:null,provider,selection:{tables:[...descriptors.keys()],initializers},resolve(sha,file,occurrence){assert.equal(occurrence,0);const descriptor=bindings.get(file+'|'+sha);assert(descriptor,'only declared tiny resources');return descriptor.sha256;},partition,read:async asset=>{assert(physical.has(asset),'fixture cannot read original model assets');return new Uint8Array(physical.get(asset));}});return{store,client};
}
// Keep direct prepared-plan consumers on the same capture lifetime closures as
// the resident bridge fixture. These are renderer functions, not demand stubs.
async function installCaptureDemandBindings(provider,text,values){
 for(const [name,value]of Object.entries({...captureHelpers,...solarPreparationHelpers,...visibilityHelpers,...distantHelpers,...churchHelpers}))if(!(name in values))values[name]=value;
 values.utf8ByteLength??=utf8Helpers.utf8ByteLength;values.reflectionObjectID??=helpers.createResidentReflectionObjects();
 const defaults={programPublicationRevision:0,packedPlanSequence:0,publishedPlanId:null,gpuGeneration:0,anchor:[0,0],anchorUnit:1,materialUnit:1,captureGeometryRevision:0,captureStateRevision:0,surfaceContentRevision:0,reflectionResidentRevision:0,familyEvictions:0,solarDemandKeys:new Set(),reflectionDemandKeys:new Set(),reflectionCaptureFailures:new Map(),captureFamilyFailures:new Map(),reflectionProgramFailures:new Map(),heldCaptureDemandKeys:new Set(),captureDemands:new Map(),programSources:new WeakMap(),casterAnalysisPending:new Set(),casterPreparedSources:new Map(),distantQuality:new Map(),exactRichProgramKeys:new Map(),distantMaterialAvailable:false,sharedPaulLobeRichProgram:false,materialSourceSettled:false,cityPaintFragmentBytes:0};
 for(const [name,value]of Object.entries(defaults))if(values[name]===undefined)values[name]=value;
 const bind=async names=>{for(const name of names)values[name]=await evaluate(binding(text,name),values);};
 if(provider==='bremen'||provider==='city'){values.mainVisibilityCache??=await evaluate(binding(text,'mainVisibilityCache'),values);values.mainGPUIncarnation??=0;values.window??={devicePixelRatio:1};const canvas={width:512,height:512};values.map??={triggerRepaint(){}};values.map.getCanvas??=()=>canvas;}
 if(provider==='bremen'||provider==='city'){await bind(['multiply']);if(values.matrix){const unit=values.anchorUnit,[x,y]=values.anchor,world=values.multiply(values.matrix,[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-x*unit,0,y*unit,1]);if(provider==='bremen')values.candidateMainProjection??=world;else values.mainWorldProjection??=world;}}
 if(provider==='bremen'){values.mainProgramRevisitEligible??=await evaluate(binding(text,'mainProgramRevisitEligible'),values);await bind(['releaseOwnedProgram','releaseInactivePaintProgram']);}
 if(recipeProviders.has(provider)){
  if(provider==='root500')await bind(['keysByPaintRuns','paintKeysForRuns']);
  await bind(['mainPaintRuns','mainPaintKeys','capturePaintKeys','mainMaterialKeys','captureMaterialKeys','forgetCaptureRole','retireInactiveCaptureRoles','retainedPaintKeys','pruneFamilySource','solarProgramDemandActive','solarPreparationKeys','solarResidentKeys','clearProgramSources','clearSettledProgramSources','reconcileCaptureDemand','reconcileProgramDemand','geometryProgramDemand','setCaptureDemand']);
 }else if(provider==='city'){
  await bind(['hookSignature','materialProgramsCurrent','overrideProgramKey','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','residentFamilyProgramKeys','solarFamilyProgramsNeeded','familyProgramNeeded','activeCaptureProgramKeys','retireCapturePrograms','replaceCaptureKeys','planProgramSourceNeeded','clearProgramSource','captureContentIdentity','captureContentRevision','reconcileProgramSources','setCaptureDemand','clearCaptureDemands']);
 }else if(provider==='tier300'){
  await bind(['overrideProgramKey','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','residentFamilyProgramKeys','activeCaptureProgramKeys','retireCapturePrograms','replaceCaptureKeys','planSourceNeeded','captureContentIdentity','captureContentRevision','reconcileMaterialSource','setCaptureDemand','clearCaptureDemands']);
 }else if(provider==='delegated500'){
  await bind(['richPaintProgramKey','distantPaintProgramKey','programKey','programOverrideKey','mainPaintDemand','mainPaintProgramKeys','mainProtectedProgramKeys','casterIsBase','solarCasterResidentKeys','solarCaptureDemandActive','captureProgramDemandCurrent','reflectionMaterialKey','reflectionRunKeys','reflectionCaptureKeys','activeCaptureProgramKeys','reflectionKeyProgram','trimCapturePrograms','retireCapturePrograms','resetCaptureDemands','setCaptureDemand','endCaptureDemands','visibleProgramDemandKeys','visibleProgramDemandCurrent','materialProgramDemandCurrent','pruneProgramPreparation','drainSourceWorkspaces','ensureMaterialSourceWorkspace']);
 }else if(provider==='church'){
  await bind(['mainFamilyProgramKey','mainPaintDemandFor','mainPaintDemand','mainPaintProgramKeys','overrideProgramKey','solarCaptureKeys','reflectionMaterialKey','reflectionRunKeys','reflectionCaptureKeys','captureProgramKeys','reflectionKeyProgram','trimCapturePrograms','retireCapturePrograms','resetCaptureDemands','setCaptureDemand','endCaptureDemands','pruneProgramPreparation']);
 }
}
// Retain the production grant carrier before preparing even an empty candidate.
// Its callbacks follow the live owner in values, including a later core fixture owner.
async function installFixtureGrantHandoff(provider,text,values){
 Object.assign(values,grantHandoffHelpers);
 if(provider==='delegated500'){
  values.programGrantHandoff??=await evaluate(binding(text,'programGrantHandoff'),values);
  values.clearProgramGrantHandoff=await evaluate(binding(text,'clearProgramGrantHandoff'),values);
 }else if(provider==='city'||provider==='tier300'){
  values.candidateHandoffRevision??=0;values.preparedProgramHandoffs??=new WeakMap();
  values.candidateProgramHandoff??=await evaluate(binding(text,'candidateProgramHandoff'),values);
  for(const name of ['clearCandidateHandoff','handoffPendingPrograms'])values[name]=await evaluate(binding(text,name),values);
 }
}
async function preparedCityDataPlan(text,values){
 await installFixtureGrantHandoff('city',text,values);
 const base='src/painted/city/safety/',resources={},modules={};
 for(const [file,name]of [['c311-fixture.ts','C311_FIXTURE_RESOURCE'],['c312-fixture.ts','C312_FIXTURE_RESOURCE'],['c320-fixture.ts','C320_FIXTURE_RESOURCE'],['c322-fixture.ts','C322_FIXTURE_RESOURCE'],['progressive-paint-admissions.ts','PROGRESSIVE_ADMISSIONS_RESOURCE'],['progressive-feature-cities.ts','PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE']]){modules[file]=await readFile(path.join(web,base+file),'utf8');resources[name]=await evaluate(binding(modules[file],name),{});}
 const metadata=await productionHelpers(base+'city-data-metadata.ts'),preparation=await readFile(path.join(web,base+'city-prepared-data.ts'),'utf8'),prepareCityData=await evaluate(binding(preparation,'prepareCityData'),{...metadata,...resources}),refs=Object.values(resources),payloads=refs.map(ref=>ref===resources.PROGRESSIVE_ADMISSIONS_RESOURCE?[]:ref===resources.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE?{city:values.city}:{native:[],fixture:ref.file}),{client,store}=tinyPreparedResources('city',values.city,refs,payloads,(sha,file)=>sha===resources.PROGRESSIVE_ADMISSIONS_RESOURCE.canonicalSHA256&&file===resources.PROGRESSIVE_ADMISSIONS_RESOURCE.file?{schemaVersion:1,kind:'object-rows',parts:[]}:undefined);
 Object.assign(values,{...metadata,prepareCityData,createFrozenDataScope:scopeHelpers.createFrozenDataScope,frozenData:client,preparedDataHandoffs:new WeakMap(),cityDataPlanSequence:++fixtureSequence,dataPreparationSequence:0,dataPreparationPending:undefined,dataPreparationCancel:undefined,dataPublicationRevision:0,residentDataPlan:undefined,publishedDataPlan:undefined,residentDataRelease:undefined,compilationPublishedState:undefined,geometryCompilationCandidate:undefined});values.map??={triggerRepaint(){}};
 for(const name of ['clearResidentRollback','disposeGeometryCandidate','rollbackResidentUpload'])if(typeof values[name]!=='function')values[name]=await evaluate(binding(text,name),values);
 values.prepareBatches=await evaluate(binding(text,'prepareBatches'),values);values.currentDataScope=await evaluate(binding(text,'currentDataScope'),values);values.getPreparedDataScope=await evaluate(binding(text,'getPreparedDataScope'),values);
 const components=values.preparedDataComponents??[{city:values.city,objectId:'osm/way/1',partId:'fixture-part'}],controller=new AbortController();
 try{const prepared=await values.prepareBatches(components,controller.signal),releaseScope=prepared.scope.retain();prepared.release();Object.assign(values,{residentDataPlan:prepared,publishedDataPlan:prepared,residentDataRelease:releaseScope,programDataIdentity:prepared.identity,preparedScope:prepared.scope});values.clearCityPreparedProgramSources=scope=>{assert.equal(scope.stats.disposed,false);};values.preparedPaintSource??=()=> 'fixture original city materials';values.facadePaintFragmentForCity=()=>values.currentDataScope().borrow(resources.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,()=>values.preparedPaintSource('base'));values.facadePaintSpecializationForCity=(city,scope=values.currentDataScope())=>{scope.borrow(resources.PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,()=>{});return{city,specialized:null,fragmentBytes:null,fullFragmentBytes:null};};values.cityData_describeFacadePaintSource=(city,source,kind,scope)=>describeFixturePaintSource(values,city,source,kind,scope);
  const fixture={scope:prepared.scope,prepared,client,store,components,resources,release(){releaseScope();client.dispose();store.destroy();}};values.preparedDataFixture=fixture;return fixture;
 }catch(error){client.dispose();store.destroy();throw error;}
}
async function preparedDelegatedDataPlan(text,values){
 await installFixtureGrantHandoff('delegated500',text,values);
 const base='src/painted/delegated500/safety/',read=file=>readFile(path.join(web,base+file),'utf8'),admissions=await read('progressive-paint-admissions.ts'),extras=await read('progressive-feature-cities.ts'),catalogName=values.city==='berlin'?['progressive-berlin-programs.ts','BERLIN_PROGRAM_GLSL_RESOURCE']:values.city==='hannover'?['f340-program822.ts','HANNOVER_PROGRAMS822_RESOURCE']:['progressive-hamburg-programs.ts','HAMBURG_PROGRAM_GLSL_RESOURCE'],catalog=await read(catalogName[0]),admissionRef=await evaluate(binding(admissions,'PROGRESSIVE_ADMISSIONS_RESOURCE'),{}),extraRef=await evaluate(binding(extras,'PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE'),{}),catalogRef=await evaluate(binding(catalog,catalogName[1]),{}),resources=[admissionRef,extraRef,catalogRef],{client,store}=tinyPreparedResources('delegated500',values.city,resources,[[],{city:values.city},{base:'fixture catalog marker'}],(sha,file)=>sha===admissionRef.canonicalSHA256&&file===admissionRef.file?{schemaVersion:1,kind:'object-rows',parts:[]}:undefined),demand=await productionHelpers(base+'delegated500-data-demand.ts');
 // The material assets are synthetic. The actual renderer preparation receipt,
 // closed demand and scope lifetime are preserved; original data consumers are
 // covered by their own scope/recipe suites rather than loading source models.
 Object.assign(values,{...demand,createFrozenDataScope:scopeHelpers.createFrozenDataScope,frozenData:client,residentPreparedData:undefined,committingPreparedData:undefined,residentScopeRelease:undefined,dataPreparationSequence:0,dataPreparationPending:undefined,materialRequestSequence:0,residentLifecycleRevision:0,committedGeneration:values.generation??0,pendingGeometry:undefined,pendingMaterialBatches:undefined});values.map??={triggerRepaint(){}};
 values.clearDelegated500PaintSourcesForScope=scope=>{assert.equal(scope.stats.disposed,false);};
 values.facadePaintSpecializationForCity??=(city,scope=(values.committingPreparedData??values.residentPreparedData)?.scope)=>{assert(scope&&!scope.stats.disposed);scope.borrow(extraRef,()=>{});return{city,specialized:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null};};
 values.describeFacadePaintSource=(city,source,kind,scope=(values.committingPreparedData??values.residentPreparedData)?.scope)=>describeFixturePaintSource(values,city,source,kind,scope);
 const packingInput=[];
 values.prepareDelegated500Data=async(components,city,signal,scope,raw)=>{assert.equal(city,values.city);assert(raw,'preparation retains exact raw components');assert.equal(raw,packingInput,'the exact packing input array reaches data preparation');const closed=demand.delegated500DemandClosure(components);await scope.prepareSelection(admissionRef,[...new Set(closed.identities.map(row=>row.city+'|'+row.objectId))],signal);await scope.prepare([extraRef],signal);};
 values.prepareDelegated500Programs=async(components,city,signal,scope)=>{assert.equal(city,values.city);const closed=demand.delegated500DemandClosure(components);scope.assertSelection(admissionRef,closed.identities.map(row=>row.city+'|'+row.objectId));await scope.prepareSelection(catalogRef,['base'],signal);};
 for(const name of ['withPreparedData','clearDataPreparation','cancelPendingMaterialBatches','discardGeometryCandidate','candidateCurrent','sourceContextCurrent','withSourceContext','prepareBatches'])values[name]=await evaluate(binding(text,name),values);
 const components=values.preparedDataComponents??[{city:values.city,objectId:'osm/way/1',partId:'fixture-part'}],controller=new AbortController();
 // Nonempty delegated batches now pack authoritative renderer chunks inside
 // preparation. These fixtures publish their resident chunk directly, so the
 // actual preparation runs for the same closed demand with no packing input.
 try{const prepared=await values.prepareBatches(packingInput,controller.signal,undefined,components),releaseScope=prepared.scope.retain();values.clearDataPreparation(values.dataPreparationPending,false);prepared.release();Object.assign(values,{residentPreparedData:prepared,residentScopeRelease:releaseScope,preparedScope:prepared.scope,materialSourceSettled:true});values.cityPaintFragment??='fixture original delegated materials';
  // Resident retirement follows the renderer's own order (clearResidentBatches,
  // publishPackedResident): captures are invalidated before the resident scope
  // is released, because a capture plan now pins the scope it was frozen with.
  const fixture={scope:prepared.scope,prepared,client,store,components,resources,release(){if(values.residentPreparedData===prepared){values.captureRuntime?.invalidate();values.clearDelegated500PaintSourcesForScope(prepared.scope);values.residentPreparedData=undefined;values.residentScopeRelease=undefined;}releaseScope();client.dispose();store.destroy();}};values.preparedDataFixture=fixture;return fixture;}catch(error){client.dispose();store.destroy();throw error;}
}
async function preparedTierDataPlan(text,values,sourceHelpers=preparedSourceHelpers){
 await installFixtureGrantHandoff('tier300',text,values);
 const base='src/painted/tier300/safety/',read=relative=>readFile(path.join(web,base+relative),'utf8'),admissions=await read('progressive-paint-admissions.ts'),extras=await read('progressive-feature-cities.ts'),feature=await read('progressive-feature-glsl.ts');
 const PROGRESSIVE_INPUT_SHA=await evaluate(binding(admissions,'PROGRESSIVE_INPUT_SHA'),{}),PROGRESSIVE_ADMISSIONS_RESOURCE=await evaluate(binding(admissions,'PROGRESSIVE_ADMISSIONS_RESOURCE'),{PROGRESSIVE_INPUT_SHA}),PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE=await evaluate(binding(extras,'PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE'),{}),PROGRESSIVE_CITY_SOURCE_FULL_SHA=await evaluate(binding(extras,'PROGRESSIVE_CITY_SOURCE_FULL_SHA'),{}),PROGRESSIVE_FEATURE_SHA=await evaluate(binding(feature,'PROGRESSIVE_FEATURE_SHA'),{});
 const components=values.preparedDataComponents??[{city:values.city,objectId:'osm/way/1',partId:'fixture-part'}],resources=[PROGRESSIVE_ADMISSIONS_RESOURCE,PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE],payloads=[components.map(({city,objectId,partId})=>({city,objectId,partId})),{city:values.city}],physical=new Map(),descriptors=payloads.map(value=>{const bytes=Buffer.from(JSON.stringify(value)),sha256=createHash('sha256').update(bytes).digest('hex'),descriptor={path:`/safety/buildings3d/painted-tables/${sha256.slice(0,2)}/${sha256}.json`,sha256,bytes:bytes.length};physical.set(descriptor.path,bytes);return descriptor;});
 const store=leaseHelpers.createFrozenDataLeaseStore(descriptors),client=store.client({city:values.city,profileSHA256:null,provider:'tier300',selection:{tables:descriptors.map(d=>d.sha256),initializers:Object.fromEntries(descriptors.map((d,i)=>[d.sha256,{[resources[i].file]:1}]))},resolve(sha,file,occurrence){const index=resources.findIndex(r=>r.canonicalSHA256===sha&&r.file===file&&r.occurrence===occurrence);assert(index>=0,'only declared tiny tier resources');return descriptors[index].sha256;},read:async asset=>{assert(physical.has(asset),'tier fixture cannot read model assets');return new Uint8Array(physical.get(asset));}}),frozen=scopeHelpers.createFrozenDataScope(client);
 values.preparedPaintSource??=()=> 'fixture original tier materials';
 const checkScope=scope=>{assert(scope,'tier material callback requires a prepared scope');assert.equal(scope.stats.disposed,false);};
 values.facadePaintFragmentForCity=(_city,scope)=>{checkScope(scope);return scope.borrow(PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,record=>{assert.equal(record.city,values.city);return values.preparedPaintSource('base');});};
 values.facadePaintSpecializationForCity=(_city,scope)=>{checkScope(scope);scope.borrow(PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,()=>{});return{program:'fixture-original-source',specialized:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null};};
 // The plan is bound to the renderer's page budget exactly as the renderer
 // creates it (chunk input store budget, else geometryOwner.store.budget), so its
 // material-source assembly is reserved from the synthetic template's bounds
 // before the synthetic builder runs.
 // Resident retirement below follows publishPackedGeometry/destroy: captures,
 // which pin the scope they were frozen with, are invalidated before retireData.
 const clearTier300PaintSources=scope=>checkScope(scope),source=await read('tier300-prepared-data-plan.ts'),ast=ts.createSourceFile('tier-plan.ts',source,ts.ScriptTarget.Latest,true),body=ast.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(ast).replace(/^export\s+/,''));
 const partial=await read('source-partial-gate-display.ts'),PROFILE=await evaluate(binding(partial,'PROFILE'),{}),partialGateAdmissionDemand=await evaluate(binding(partial,'partialGateAdmissionDemand'),{PROFILE}),cohort=await productionHelpers(base+'s434-cohort-constants.ts'),outline=await productionHelpers(base+'s020-relation-outline-profile.ts');
 const actual=await evaluate('(()=>{'+body.join('\n')+';return{createTier300PreparedDataPlan,prepareTier300Data,tier300AdmissionKeys};})()',{...sourceHelpers,...utf8Helpers,specializeCurrentPaintProgram:(source,family)=>(values.specializeCurrentPaintProgram??currentPaintHelpers.specializeCurrentPaintProgram)(source,family),...cohort,...outline,partialGateAdmissionDemand,PROGRESSIVE_ADMISSIONS_RESOURCE,PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE,PROGRESSIVE_CITY_SOURCE_FULL_SHA,PROGRESSIVE_FEATURE_SHA,facadePaintFragmentForCity:values.facadePaintFragmentForCity,facadePaintSpecializationForCity:values.facadePaintSpecializationForCity,describeFacadePaintSource:(city,source,kind,scope)=>describeFixturePaintSource(values,city,source,kind,scope),describeFacadePaintSourceBounds:(_city,_key,scope)=>{checkScope(scope);return shaderSourceHelpers.shaderSourceBounds(shaderSourceHelpers.shaderSourceParts`${values.preparedPaintSource('base')}`);},clearTier300PaintSources});
 try{await actual.prepareTier300Data(components,values.city,new AbortController().signal,frozen);const plan=actual.createTier300PreparedDataPlan({scope:frozen,city:values.city,id:++fixtureSequence,budget:values.geometryOwner.store.budget}),releaseScope=frozen.retain();frozen.release();Object.assign(values,actual,{frozenData:client,createFrozenDataScope:scopeHelpers.createFrozenDataScope,preparedScope:frozen,residentData:{plan,scope:frozen,releaseScope},pendingData:undefined,packingData:undefined,capturePreparation:undefined,sourcePlanIdentity:undefined,cityPaintFragment:'',materialSourceSettled:true,dataPreparationPending:false,dataPreparationRevision:0,dataPreparationFailure:undefined});for(const name of ['dataScope','retireData','clearMaterialSource','solarMaterialDemandActive','reconcileMaterialSource','capturePreparationDiagnostic','materialSource','prepareMaterialSource'])values[name]=await evaluate(binding(text,name),values);const fixture={scope:frozen,plan,client,store,components,resources:{PROGRESSIVE_ADMISSIONS_RESOURCE,PROGRESSIVE_CITY_EXTRA_GLSL_RESOURCE},release(){if(values.residentData?.plan===plan){const owner=values.residentData;values.captureRuntime?.invalidate();values.clearMaterialSource(plan);values.residentData=undefined;values.capturePreparation=undefined;values.retireData(owner);}else{plan.release();releaseScope();}client.dispose();store.destroy();}};values.preparedDataFixture=fixture;return fixture;}catch(error){frozen.release();client.dispose();store.destroy();throw error;}
}
// The synthetic material builders replace model assets only. Scope liveness,
// prepared-plan identity and the deferred source recipe remain production code.
async function preparedPaintPlan(provider,text,values,sourceHelpers=preparedSourceHelpers){
 if(['city','delegated500','tier300'].includes(provider)){const fixture=await ({city:preparedCityDataPlan,delegated500:preparedDelegatedDataPlan,tier300:preparedTierDataPlan}[provider])(text,values,sourceHelpers);await installCaptureDemandBindings(provider,text,values);return fixture;}
 const frozen=scopeHelpers.createFrozenDataScope({acquire(){throw Error('capture fixture must not acquire model assets');}});
 values.pendingCandidate=undefined;values.committingScope=undefined;values.residentScope=frozen;values.currentDataScope=frozen;values.configuredDataScope=frozen;
 values.preparedPaintSource??=key=>'exact '+values.city+' '+key;
 // Bind the original finite certification predicates; their asset branches stay
 // outside these tiny owner-key fixtures, while the city gates remain real.
 const facadeText=await readFile(path.join(web,`src/painted/${provider}/safety/facade-paint-fragment.ts`),'utf8'),facadeAST=ts.createSourceFile('facade.ts',facadeText,ts.ScriptTarget.Latest,true);
 for(const name of ['genericBerlinOwnerExclusionCertified','genericDusseldorfProgramCertified']){let original;const find=node=>{if(!original&&ts.isFunctionDeclaration(node)&&node.name?.text===name)original=node;ts.forEachChild(node,find);};find(facadeAST);assert(original,name);values[name]=await evaluate(original.getText(facadeAST).replace(/^export\s+/,''),values);}
 const checkScope=scope=>{assert.equal(scope,frozen,'source builder borrows the prepared batch scope');assert.equal(scope.stats.disposed,false);};
 values.paintProgramFragment=(key,_city,scope)=>{checkScope(scope??values.committingScope);return values.preparedPaintSource(key);};
 values.facadePaintFragmentForCity=(_city,scope)=>{checkScope(scope??values.committingScope);return values.preparedPaintSource('base');};
 values.facadePaintSpecializationForCity=(_city,scope)=>{checkScope(scope??values.committingScope);return {program:'fixture-original-source',specialized:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null};};
 values.paintProgramPartitionEnabled=()=>values.legacyPartitionEnabled;
 values.clearRoot500PaintSources=scope=>checkScope(scope);
 const original=await readFile(path.join(web,`src/painted/${provider}/safety/${provider}-prepared-program-plan.ts`),'utf8'),ast=ts.createSourceFile('prepared-plan.ts',original,ts.ScriptTarget.Latest,true);
 const body=ast.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(ast).replace(/^export\s+/,''));
 const factoryName={root500:'createRoot500PreparedProgramPlan',infill:'createInfillPreparedProgramPlan',bremen:'createBremenPreparedProgramPlan'}[provider];
 const create=await evaluate('(()=>{'+body.join('\n')+';return '+factoryName+';})()',{
  ...preparedSourceHelpers,...utf8Helpers,describeFacadePaintSource:(city,source,kind,scope)=>describeFixturePaintSource(values,city,source,kind,scope),paintProgramPartitionEnabled:values.paintProgramPartitionEnabled,paintProgramFragment:values.paintProgramFragment,facadePaintFragmentForCity:values.facadePaintFragmentForCity,facadePaintSpecializationForCity:values.facadePaintSpecializationForCity,
  prepareRoot500ProgramData:async(_keys,_city,signal,scope)=>{signal.throwIfAborted();checkScope(scope);},clearRoot500PaintSources:scope=>checkScope(scope),clearInfillPaintSources:scope=>checkScope(scope),clearBremenPreparedProgramSources:scope=>checkScope(scope),
 });
 if(provider==='root500'){
  values.createRoot500PreparedProgramPlan=create;values.publishedProgramPlan=create({identity:'fixture-root500-plan',scope:frozen,city:values.city});values.publishedProgramPlan.prepareMetadata();values.publishedProgramPlan.prepareRepair(()=>true);
  values.withPlan=await evaluate(binding(text,'withPlan'),values);
 }else if(provider==='infill'){
  values.createInfillPreparedProgramPlan=create;values.residentProgramPlan=create({id:1,scope:frozen,city:values.city});values.residentProgramPlan.prepareMetadata();
 }else{
  values.residentProgramPlan=create({scope:frozen,city:values.city,generation:values.generation,revision:1,profileInputs:[],sourceInputs:[values.loaded],materialInputs:[]});
  values.programPlanScope=await evaluate(binding(text,'programPlanScope'),values);
 }
 values.preparedScope=frozen;
 await installCaptureDemandBindings(provider,text,values);
}
function assertPartial(f,result,triangles=0,draws=0){const {reason,pending,...counts}=result;assert.deepEqual(counts,{triangles,draws,complete:false});if(pending!==undefined)assert.equal(typeof pending,'boolean');if(f.values.captureRuntime){assert.equal(typeof reason,'string');assert(reason.length>0&&reason.length<=512);}}
function recipeKey(f,key,family=1001){return recipeProviders.has(f.provider)?familyHelpers.familyPaintRecipeKey(key,[family]):key;}
function recipeRuns(f,runs){return runs.map((run,i)=>({...run,key:recipeKey(f,run.key,run.family??1001+i)}));}
// The shared Rathaus mask factory imports its page chunk store and the display
// mask geometry helpers. The page store is the one bound to the fixture context;
// only the coincident-wall plan stays the original empty fixture plan.
const maskSource=await readFile(path.join(web,'src/safety/facade-rathaus-proxy-mask.ts'),'utf8');
const maskBlock=await evaluate(binding(maskSource,'maskBlock'),{maskBlocks:await evaluate(binding(maskSource,'maskBlocks'),{})});
function maskFactoryImports(pageStore){return{maskBlock,rathausCoincidentWallFragmentMasks:()=>({masks:[],origin:undefined}),rathausProxyFragmentCovered:displayMaskHelpers.rathausProxyFragmentCovered,getPageChunkResourceStore:()=>pageStore};}
function mockGL(){const p={kind:'previous'},v={kind:'previous-vao'},state={program:p,vao:v,depth:false,blend:false,cull:true,mask:false,depthFunc:511,src:1,dst:2,srcA:3,dstA:4},draws=[],uniforms=new Map(),clip=[];const original={...state};let creates=0,uploads=0;
 const gl={CURRENT_PROGRAM:1,VERTEX_ARRAY_BINDING:2,DEPTH_TEST:3,BLEND:4,CULL_FACE:5,DEPTH_WRITEMASK:6,DEPTH_FUNC:7,BLEND_SRC_RGB:8,BLEND_DST_RGB:9,BLEND_SRC_ALPHA:10,BLEND_DST_ALPHA:11,VIEWPORT:12,LEQUAL:515,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,ONE:1,TRIANGLES:4,UNSIGNED_INT:5125,INVALID_INDEX:4294967295,MAX_UNIFORM_BUFFER_BINDINGS:99,UNIFORM_BUFFER_BINDING:98,UNIFORM_BUFFER:97,DYNAMIC_DRAW:96,BUFFER_SIZE:95,
 activeTexture(){},bindTexture(){},bindSampler(){},isContextLost:()=>false,getParameter(k){return ({1:state.program,2:state.vao,6:state.mask,7:state.depthFunc,8:state.src,9:state.dst,10:state.srcA,11:state.dstA,12:new Int32Array([7,11,128,128]),99:24,98:null})[k];},isEnabled(k){return k===3?state.depth:k===4?state.blend:state.cull;},enable(k){state[k===3?'depth':k===4?'blend':'cull']=true;},disable(k){state[k===3?'depth':k===4?'blend':'cull']=false;},useProgram(p){state.program=p;},bindVertexArray(v){state.vao=v;},depthMask(v){state.mask=v;},depthFunc(v){state.depthFunc=v;},blendFuncSeparate(a,b,c,d){Object.assign(state,{src:a,dst:b,srcA:c,dstA:d});},
 getUniformLocation(p,name){return{p,name};},getUniform(p,loc){return uniforms.get(p)?.get(loc.name)??new Float32Array(identity);},uniformMatrix4fv(loc,_transpose,value){let map=uniforms.get(loc.p);if(!map)uniforms.set(loc.p,map=new Map());map.set(loc.name,new Float32Array(value));},uniform1i(loc,v){if(loc.name==='u_resident_reflection_clip')clip.push(v);},uniform1f(){},uniform2f(){},uniform4f(){},uniform4fv(){},drawElements(mode,count,type,offset){draws.push({program:state.program,count,offset});},
 getBufferParameter:()=>2048,getUniformBlockIndex:()=>0,getIndexedParameter:()=>null,uniformBlockBinding(){},bindBufferBase(){},bindBuffer(){},createBuffer(){creates++;return{};},bufferData(){uploads++;},deleteBuffer(){},
 bindFramebuffer(){throw Error('reflection changed framebuffer');},viewport(){throw Error('reflection changed viewport');},compileShader(){throw Error('reflection compiled');},bufferSubData(){throw Error('reflection uploaded');}};
 return{gl,state,original,draws,uniforms,clip,get creates(){return creates;},get uploads(){return uploads;}};
}
async function fixture(provider,{city:fixtureCity='berlin'}={}){if(provider==='base')provider='city';const relative=provider==='base'?'src/safety/building-mesh-renderer.ts':`src/painted/${provider}/safety/building-mesh-renderer.ts`,text=await readFile(path.join(web,relative),'utf8'),m=mockGL(),p={kind:'surface'},v={kind:'resident-vao'},first={objectId:'owner-a',partId:'a',start:0,end:6,box:[-.1,0,-.1,.1,.1,.1]},second={objectId:'owner-b',partId:'b',start:6,end:12,box:[-.1,0,-.1,.1,.1,.1]},loaded=keyedComponents([first,second]),mainMatrix=new Float64Array(identity);let masks=0;
 // These fixtures model a nonshared resident cache; the sharing suite exercises verified shared programs.
 const values={...familyHelpers,...preparationHelpers,legacyPartitionEnabled:true,...helpers,...captureHelpers,...distantHelpers,...churchHelpers,...solarPreparationHelpers,...visibilityHelpers,legacySolarPartitions:false,solarDepthRevision:0,distantQuality:new Map(),distantMaterialAvailable:false,sharedPaulLobeRichProgram:false,exactRichProgramKeys:new Map(),berlinSharedFamilyPrograms:false,gl:m.gl,destroyed:false,pageHidden:false,enabled:true,indices:new Uint32Array(12),vertices:new Float32Array(40),program:p,vao:v,gpuReady:()=>true,anchor:[0,0],anchorUnit:1,materialAnchor:[0,0],materialUnit:1,opacity:1,opacityContext:'normal',windowTexture:undefined,diffuseTexture:undefined,texturedProgram:undefined,diffuseProgram:undefined,facadeAttached:false,paintMode:()=>2,paintOverride:()=>0,sceneSun:{instantISO:'2026-10-25T12:00:00Z',shadowVector:[1,1]},sceneEnvironment:{sunlight:true,shadows:true,quality:'detail'},progressiveDiagnostic:'normal',uploadSceneLight(){},uploadFacadeLayouts(){},reflectionClipUniforms:helpers.createResidentReflectionUniforms(),reflectionObjectID:helpers.createResidentReflectionObjects(),reflectionResidentRevision:0,generation:1,viewRevision:1,matrix:mainMatrix,city:fixtureCity,activeWhite:false,loaded,currentPaintProgramKey,currentPaintProgramFamily,familyCompilations:0,familyEvictions:0,currentFamilyPrograms:provider==='delegated500',berlinCurrent:provider==='delegated500'&&fixtureCity==='berlin',casterBase:new Map(),casterFailures:new Map(),casterHelper:undefined,drawFrame:0,casterCompileFrame:-1,queueOnlyProgram:false,familyPrograms:new Map(),familyFailures:new Map(),familyRuns:[{firstIndex:0,indexCount:12,key:currentPaintProgramKey(0)}],partitionEnabled:provider==='delegated500',partitionRuns:[{firstIndex:0,indexCount:12,key:currentPaintProgramKey(0)}],partitionPrograms:new Map(),partitionFailures:new Map(),paintProgramKey:()=> 'base',c311Display:{enabled:false},c312Display:{enabled:false},c313Display:{enabled:false},rathausProxyMasks:{residentRevision:'ready',prepare:()=>({ready:true}),isResident:()=>true,withResidentMasks(_gl,_p,draw){masks++;draw();return true;}},multiply(a,b){const out=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;},grow(){throw Error('reflection advanced birth');},upload(){throw Error('reflection uploaded geometry');},compileGeometryProgram(){throw Error('reflection compiled program');},syncFacadeResources(){throw Error('reflection attached texture');}};
 Object.assign(values,{casterAnalysisPending:new Set(),casterPreparedSources:new Map(),casterFamily0:undefined});
 Object.assign(values,{programPreparation:preparationHelpers.createProgramPreparationOwner(provider+' resident fixture',()=>{}),solarProgramFailures:new Map(),solarProgramRevision:0,solarPreparationIndex:undefined,geometryUploadPending:false,gpuPreflightRequired:false,mainViewportMatrix:undefined,mainViewportRuns:undefined,landmarkVisible:false,fullColourFailure:undefined,fullColourRevision:0,fullColourSourceCharacters:0,fullColourProgramKey:'full-colour',BERLIN_FULL_CURRENT_CAPTURE_KEY:'berlin-full-current',programOwnerIdentity:String(++fixtureSequence),materialRecipeRevision:0,materialSourceWorkRevision:0});
 // Resident chunk publication, page store, renderer imports and program loans of
 // the current multi-chunk consumers (support/resident-chunk-scene.mjs).
 const store=createFixtureResourceStore(sceneRuntime,m.gl),loans=residentProgramLoans(values.programPreparation,undefined,{lost:()=>new preparationHelpers.ProgramPreparationPending('lost')});
 const lazyClosures=installLazyRendererClosures(text,values);
 values.programPreparation=loans.owner;
 await installRendererImports(provider,values);
 if(values.currentPaintProgramGroups)values.linkedPaint=await evaluate(binding(text,'linkedPaint'),values);
 if(values.createPaintProgramIdleRetirement)values.programIdleRetirement=await evaluate(binding(text,'programIdleRetirement'),values);

 const scene=installResidentChunkScene(values,{provider,runtime:sceneRuntime,gl:m.gl,store,ownerName:provider==='delegated500'?'residentGeometry':'geometryOwner'});
 if(provider==='church')values.familyPrograms.set(values.fullColourProgramKey,p);
 if(provider==='delegated500')values.partitionPrograms.set(values.BERLIN_FULL_CURRENT_CAPTURE_KEY,p);
 if(recipeProviders.has(provider)){await preparedPaintPlan(provider,text,values);values.partitionRuns=[{firstIndex:0,indexCount:12,key:familyHelpers.familyPaintRecipeKey('base',[0])}];for(const name of ['legacyProgramKey','overrideSourceKey','activeFamilyKey','familySource'])values[name]=await evaluate(binding(text,name),values);}
 // Extract real closures so Float32 override thresholds and family selection cannot drift.
 if(provider==='city'){Object.assign(values,{captureFamilyFailures:new Map(),cityPaintFragment:'fixture',materialRecipeRevision:1,programMaterialFragment:1,programHookSignature:'1:1:1',c311ShaderActive:true,c312ShaderActive:true,c313ShaderActive:true,sourceRoleBatchIncluded:()=>true});values.c290DepthTieBreak=await evaluate(binding(text,'c290DepthTieBreak'),values);for(const name of ['hookSignature','materialProgramsCurrent','overrideProgramKey','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','residentFamilyProgramKeys','solarFamilyProgramsNeeded','familyProgramNeeded','familyProgram','prepareCapturePrograms','prepareSolarShadow','readyFamilyRuns','c290RoofComponent','c290ProgramRuns'])values[name]=await evaluate(binding(text,name),values);}
 if(provider==='tier300'){for(const name of ['overrideProgramKey','updateMainViewport','mainFamilyRuns','mainFamilyProgramKeys','residentFamilyProgramKeys','familyProgram','prepareCapturePrograms','prepareSolarShadow'])values[name]=await evaluate(binding(text,name),values);}
 if(provider==='church')await installCaptureDemandBindings(provider,text,values);
 if(provider==='delegated500'){values.richPaintProgramKey=await evaluate(binding(text,'richPaintProgramKey'),values);values.distantPaintProgramKey=await evaluate(binding(text,'distantPaintProgramKey'),values);values.programKey=await evaluate(binding(text,'programKey'),values);values.programOverrideKey=await evaluate(binding(text,'programOverrideKey'),values);for(const name of ['mainPaintDemand','mainPaintProgramKeys','casterIsBase','solarCasterResidentKeys','solarCaptureDemandActive','captureProgramDemandCurrent','visibleProgramDemandKeys','visibleProgramDemandCurrent','materialProgramDemandCurrent','pruneProgramPreparation','trimSolarCasterState','solarCasterFailureReason','compilePartitionProgram','releaseSolarDepth','prepareSolarPrograms','prepareSolarShadow'])values[name]=await evaluate(binding(text,name),values);}
 // Delegated program sources are the renderer's own workspace on its context
 // ledger (a fresh one per renderer), not a per-plan map.
 if(provider==='delegated500'){values.createContextPreparedSourceWorkspace=createContextPreparedSourceWorkspace;values.programSources=await evaluate(binding(text,'programSources'),values);}
 if(['city','tier300','delegated500'].includes(provider))await preparedPaintPlan(provider,text,values);
 values.withSceneSolarShadowReceiver=(gl,_matrix,draw)=>gl.isContextLost?.()?undefined:draw();values.needsBirth=false;values.birth=new Map();values.residentCaptureState=await evaluate(binding(text,'residentCaptureState'),values);
 for(const name of ['familySurfaceHelper','captureContentIdentity','captureContentRevision','captureModelMatrix','semanticCaptureRevision','solarCaptureRevision','residentCaptureAdapter','prepareCaptureMaterialPrograms','prepareCaptureMaterials','prepareCaptureMaterial','prepareCapturePrograms','trimSolarPrograms','prepareSolarPrograms','prepareSolarShadow','preparePlanarReflection'])if(new RegExp('(?:function|const) '+name+'[=(]').test(text))values[name]=await evaluate(binding(text,name),values);
 values.captureRuntime=captureHelpers.createResidentCaptureRuntime(values.residentCaptureAdapter());
 values.solarCoverage=await evaluate(binding(text,'solarCoverage'),values);
 const render=await evaluate(method(text,'renderPlanarReflection'),values),revision=await evaluate(method(text,'getPlanarReflectionRevision'),values),pass={gl:m.gl,mainMatrix:new Float64Array(identity),clipPlaneWorldZ:0,maxTriangles:100,maxDraws:64};return{provider,text,render,revision,values,m,pass,first,second,mainMatrix,scene,store,lazyClosures,loans:loans.stats,prepare:(request=pass,budget=solarPreparationHelpers.createSolarShadowPreparationBudget())=>values.preparePlanarReflection(request,budget),get masks(){return masks;}};
}
// The fake GL is driven by the production preparation owner and its actual
// source/vertex/fragment/link/completion/validation turns. No ready/pending stub.
function installAsyncProgramCompiler(f,record,{kind='colour',sharedState={}}={}){
 const queue=sharedState.queue??=[],driver=sharedState.driver??={fail:false,linked:0,shaderSources:[],attributes:[],metadata:undefined};sharedState.serial??=0;
 driver.shaders??=[];driver.programs??=[];driver.deleted??=[];driver.released??=[];driver.compiled??=new WeakSet();
 const turn=work=>{const previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);try{return work();}finally{globalThis.setTimeout=previous;}};
 const g=f.values.gl,previousDeleteProgram=g.deleteProgram?.bind(g);
 const releaseShader=shader=>{if(shader.deleted&&!shader.attachments.size&&!shader.released){shader.released=true;driver.released.push(shader);}};
 Object.assign(g,{VERTEX_SHADER:3001,FRAGMENT_SHADER:3002,COMPILE_STATUS:3003,LINK_STATUS:3004,
  createShader:type=>{const shader={type,attachments:new Set(),deleted:false,released:false};driver.shaders.push(shader);return shader;},shaderSource:(shader,source)=>{shader.source=source;driver.shaderSources.push(source);},compileShader(){},getShaderParameter:()=>!driver.fail,getShaderInfoLog:()=>driver.fail?'controlled shader failure':'',
  createProgram:()=>{const program={program:true,kind,depth:++sharedState.serial,id:'prepared-'+sharedState.serial,metadata:driver.metadata,shaders:[],shaderHistory:[]};driver.programs.push(program);driver.compiled.add(program);return program;},attachShader(program,shader){program.shaders.push(shader);program.shaderHistory.push(shader);shader.attachments.add(program);},detachShader(program,shader){const index=program.shaders.indexOf(shader);if(index>=0)program.shaders.splice(index,1);shader.attachments.delete(program);releaseShader(shader);},bindAttribLocation:(_p,index,name)=>driver.attributes.push([index,name]),linkProgram:p=>{driver.linked++;p.failed=typeof driver.fail==='function'?driver.fail(p):driver.fail;},getExtension:()=>null,getProgramParameter:p=>!p.failed,getProgramInfoLog:()=> 'controlled link failure',deleteShader(shader){driver.deleted.push(shader);shader.deleted=true;releaseShader(shader);},deleteProgram(program){previousDeleteProgram?.(program);driver.deleted.push(program);program.deleted=true;for(const shader of program.shaders??[]){shader.attachments.delete(program);releaseShader(shader);}if(program.shaders)program.shaders.length=0;if(!program.released){program.released=true;driver.released.push(program);}},
 });
 const owner=preparationHelpers.createProgramPreparationOwner(f.provider+' fixture',()=>f.values.map?.triggerRepaint?.());
 // Programs this production owner compiled keep its own capture grant checks;
 // stand-in handles the fixture installed directly are lent as resident programs.
 const loans=residentProgramLoans(owner,driver.compiled,{lost:()=>new preparationHelpers.ProgramPreparationPending('lost')});
 const wrapped={compile:(context,recipe)=>{const requestPhase=f.values.phase;const program=turn(()=>owner.compile(context,{...recipe,build(){const sources=recipe.build();driver.onBuild?.(recipe,sources,requestPhase);return sources;}}));assert.deepEqual(program.shaders,[],'a prepared resident capture program must not retain shader attachments');assert.equal(program.shaderHistory.length,2);for(const shader of program.shaderHistory){assert.equal(shader.deleted,true);assert.equal(shader.released,true,'resident shader storage is released only after detachment/deletion');assert.equal(shader.attachments.size,0);}return program;},work:(...args)=>turn(()=>owner.work(...args)),prune:()=>turn(()=>owner.prune()),releaseProgram:(...args)=>turn(()=>owner.releaseProgram(...args)),retainProgram:(...args)=>loans.owner.retainProgram(...args),get fixtureLoans(){return loans.stats;},dispose:()=>turn(()=>owner.dispose()),cancel:()=>turn(()=>owner.cancel()),contextLost:()=>turn(()=>owner.contextLost()),get hasPending(){return owner.hasPending;},get stats(){return owner.stats;}};
 f.values.programPreparation=wrapped;f.values.isProgramPreparationPending=preparationHelpers.isProgramPreparationPending;f.values.ProgramPreparationPending=preparationHelpers.ProgramPreparationPending;
 f.values.compileGeometryProgram=(...args)=>{
  Object.defineProperty(args,'requestPhase',{value:f.values.phase});
  const familyRecipe=recipeProviders.has(f.provider),capture=familyRecipe||f.provider==='church'||f.provider==='city'?!!args[3]:f.provider==='tier300'?!!args[2]:!!(args[4]??args[3]),plan=familyRecipe?(args[5]??f.values.publishedProgramPlan??f.values.residentProgramPlan):f.provider==='tier300'?f.values.residentData?.plan:f.provider==='delegated500'?f.values.residentPreparedData:f.provider==='city'?f.values.residentDataPlan:undefined,resource=f.provider==='church'&&args[3]?'colour:full':'colour:'+(familyRecipe?(args[4]??[0]).join(','):f.provider==='church'||f.provider==='tier300'?args[1]??0:args[2]??0),sourceToken=args[1]&&typeof args[1]==='object'?args[1].key:args[1]??'base',inputs=familyRecipe?[plan.identity??String(plan.id),args[0],args[1],String(args[2])]:f.provider==='church'?[args[0],String(args[4]??f.values.queueOnlyProgram)]:[args[0],sourceToken,...(plan?[String(plan.id??plan.identity??'prepared')]:[])];
  return wrapped.compile(g,{resource,inputs,priority:capture?'capture':'visible',current:familyRecipe?()=>!f.values.destroyed&&!f.values.preparedScope.stats.disposed&&(f.values.publishedProgramPlan??f.values.residentProgramPlan)===plan:f.provider==='tier300'?()=>!f.values.destroyed&&!f.values.pageHidden&&f.values.enabled&&f.values.residentData?.plan===plan&&!plan.scope.stats.disposed:f.provider==='delegated500'?()=>f.values.sourceContextCurrent(plan,f.values.materialRecipeRevision):f.provider==='city'?()=>!f.values.destroyed&&!f.values.pageHidden&&f.values.enabled&&f.values.residentDataPlan===plan&&!plan.scope.stats.disposed:undefined,build(){record.push(args);driver.metadata=args;const paint=familyRecipe?(f.provider==='bremen'?plan.fragment(args[1]):f.values.withPlan?f.values.withPlan(plan,()=>f.values.paintProgramFragment(args[1],f.values.city)):f.values.paintProgramFragment(args[1],f.values.city,plan.scope)):f.provider==='delegated500'?(args[1]&&typeof args[1]==='object'?args[1].build():args[1]??f.values.cityPaintFragment):f.provider==='tier300'?f.values.materialSource(plan):f.provider==='city'?f.values.facadePaintFragmentForCity(f.values.city):String(args[1]);return{vertex:'original vertex '+f.provider,fragment:paint,attributes:['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']};}});
 };

 f.advancePreparation=(one=false)=>turn(()=>{let steps=0;while(queue.length){assert(++steps<2000,'unbounded program preparation');queue.shift()();if(one)break;}return steps;});
 f.prepareAll=()=>{for(let frame=0;frame<100;frame++){const result=f.values.prepareSolarShadow();f.advancePreparation();if(result.status!=='pending')return result;if(typeof f.values.drawFrame==='number')f.values.drawFrame++;}assert.fail('actual async depth preparation did not finish');};
 f.preparationDriver=driver;f.preparationQueue=queue;return driver;
}
for(const provider of providers)test(`${provider}: actual surface bridge reuses resident resources and restores state without main-frame writes`,async()=>{const f=await fixture(provider),r0=f.revision(),before=JSON.stringify([...f.values.loaded.values()]);const r=f.render(f.pass);assert.deepEqual(r,{triangles:4,draws:2,complete:true});assert.equal(f.m.draws.length,2);assert(f.m.draws.every(row=>row.program===f.values.program));assert.equal(f.values.matrix,f.mainMatrix);assert.equal(f.values.viewRevision,1);assert.equal(f.values.reflectionResidentRevision,0);assert.equal(JSON.stringify([...f.values.loaded.values()]),before);assert.deepEqual(f.m.state,f.m.original);assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);assert.equal(f.m.clip.at(-1),0);assert.equal(f.revision(),r0);f.values.reflectionResidentRevision++;assert.equal(f.revision(),r0,'resource preparation alone cannot dirty the capture content key');f.values.texturedProgram={};assert.equal(f.revision(),r0,'a newly ready handle resumes the same pending capture');f.values.paintOverride=()=>7;assert.notEqual(f.revision(),r0,'an appearance change dirties the semantic capture');assert(!method(f.text,'renderPlanarReflection').includes('layer.render'));});
test('budgeting selects whole components and leaves oversized or unready components partial',()=>{const p={},c=[{start:0,end:12,box:[0,0,0,1,1,1]},{start:12,end:18,box:[0,0,0,1,1,1]}],runs=[{firstIndex:0,indexCount:18,program:p}];const r=helpers.planResidentReflection(c,runs,identity,2,1,18);assert.equal(r.triangles,2);assert.equal(r.draws,1);assert.equal(r.complete,false);assert.equal(r.plan[0].firstIndex,12);assert.equal(r.plan[0].indexCount,6);const missing=helpers.planResidentReflection([c[0]],[{firstIndex:0,indexCount:6,program:p},{firstIndex:6,indexCount:6,program:undefined}],identity,100,10,18);assert.equal(missing.plan.length,0);assert(!missing.complete);const fragmented=helpers.planResidentReflection([c[0]],[{firstIndex:0,indexCount:6,program:p},{firstIndex:6,indexCount:6,program:p}],identity,100,1,18);assert.equal(fragmented.plan.length,0);assert(!fragmented.complete);});
test('reflection budget exclusion precedes missing program readiness',()=>{
 const p={},components=[{start:0,end:6,box:[0,0,0,1,1,1]},{start:6,end:12,box:[0,0,0,1,1,1]}],runs=[{firstIndex:0,indexCount:6,program:p},{firstIndex:6,indexCount:6,program:undefined}];
 for(const [triangles,draws]of [[2,2],[4,1]]){
  const result=helpers.planResidentReflection(components,runs,identity,triangles,draws,12);
  assert.equal(result.complete,false);assert.equal(result.reason,'capture-budget');assert.notEqual(result.pending,true);assert.deepEqual(result.components,[components[0]]);assert.deepEqual(result.plan,[{program:p,firstIndex:0,indexCount:6}]);
 }
 const zero=helpers.planResidentReflection([components[1]],[runs[1]],identity,0,0,12);assert.equal(zero.reason,'capture-budget');assert.notEqual(zero.pending,true);assert.equal(zero.plan.length,0);
});
test('an admitted missing reflection program remains pending until the exact resident handle is ready',()=>{
 const component={start:0,end:6,box:[0,0,0,1,1,1]},run={firstIndex:0,indexCount:6,program:undefined};
 const waiting=helpers.planResidentReflection([component],[run],identity,2,1,6);assert.equal(waiting.complete,false);assert.equal(waiting.reason,'missing-program');assert.equal(waiting.pending,true);assert.equal(waiting.plan.length,0);
 const owner={kind:'accepted-owner'};run.program=owner;const ready=helpers.planResidentReflection([component],[run],identity,2,1,6);assert.equal(ready.complete,true);assert.notEqual(ready.pending,true);assert.deepEqual(ready.components,[component]);assert.deepEqual(ready.plan,[{program:owner,firstIndex:0,indexCount:6}]);
});
test('reflection admission does not replace a pending earlier component with a later ready component',()=>{
 const first={start:0,end:6,box:[0,0,0,1,1,1]},second={start:6,end:12,box:[0,0,0,1,1,1]},owner={},runs=[{firstIndex:0,indexCount:6,program:undefined},{firstIndex:6,indexCount:6,program:owner}];
 for(const [triangles,draws]of [[2,2],[4,1]]){
  const waiting=helpers.planResidentReflection([first,second],runs,identity,triangles,draws,12);assert.equal(waiting.complete,false);assert.equal(waiting.pending,true);assert.equal(waiting.reason,'missing-program');assert.equal(waiting.plan.length,0,'later readiness cannot consume the earlier component budget');
  runs[0].program=owner;const ready=helpers.planResidentReflection([first,second],runs,identity,triangles,draws,12);assert.deepEqual(ready.components,[first]);assert.deepEqual(ready.plan,[{program:owner,firstIndex:0,indexCount:6}]);assert.equal(ready.reason,'capture-budget');assert.notEqual(ready.pending,true);runs[0].program=undefined;
 }
});
test('invalid reflection component and run ranges remain failures rather than pending resources',async()=>{
 const owner={},box=[0,0,0,1,1,1],valid={start:0,end:6,box};
 for(const component of [{start:1,end:6,box},{start:0,end:9,box},{start:0,end:NaN,box}]){
  const result=helpers.planResidentReflection([component],[{firstIndex:0,indexCount:6,program:owner}],identity,100,10,6);assert.equal(result.complete,false);assert.equal(result.reason,'invalid-component-range');assert.notEqual(result.pending,true);assert.equal(result.plan.length,0);
 }
 for(const run of [{firstIndex:1,indexCount:5,program:owner},{firstIndex:0,indexCount:4,program:owner}]){
  const result=helpers.planResidentReflection([valid],[run],identity,100,10,6);assert.equal(result.complete,false);assert.notEqual(result.pending,true);assert.equal(result.plan.length,0);
 }
 const f=await fixture('city');f.first.start=1;const result=f.render(f.pass);assert.equal(result.complete,false);assert.match(result.reason,/invalid-component-range/);assert.notEqual(result.pending,true);
});
test('reflection geometry upload and resident mask availability recover without a semantic content change',async()=>{
 const f=await fixture('city'),revision=f.revision();f.values.geometryUploadPending=true;f.values.gpuReady=()=>false;
 const geometry=f.render(f.pass);assertPartial(f,geometry);assert.equal(geometry.pending,true);assert.equal(geometry.reason,'geometry-upload-pending');assert.equal(f.m.draws.length,0);
 f.values.geometryUploadPending=false;f.values.gpuReady=()=>true;assert.equal(f.revision(),revision);assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});f.m.draws.length=0;
 const withMasks=f.values.rathausProxyMasks.withResidentMasks;f.values.rathausProxyMasks.withResidentMasks=()=>false;
 const mask=f.render(f.pass);assertPartial(f,mask);assert.equal(mask.pending,true);assert.match(mask.reason,/mask-unavailable/);assert.equal(f.m.draws.length,0);
 f.values.rathausProxyMasks.withResidentMasks=withMasks;assert.equal(f.revision(),revision);assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);
});
test('reflection selected resident texture bindings stay pending until their existing pixels are available',async()=>{
 const f=await fixture('city');let available=false;Object.assign(f.values,{paintMode:()=>1,facadeAttached:true,texturedProgram:{},windowTexture:{isResident:()=>true,stats:{ready:true,textureObjects:1,residentRevision:1},withResidentTexture(_g,_p,draw,unavailable){return available?draw():unavailable();}}});
 const revision=f.revision(),waiting=f.render(f.pass);assertPartial(f,waiting);assert.equal(waiting.pending,true);assert.match(waiting.reason,/texture-unavailable/);assert.equal(f.m.draws.length,0);assert.deepEqual(f.m.state,f.m.original);
 available=true;assert.equal(f.revision(),revision);assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);
});
test('all providers honor zero/small budgets, context loss, wrong context and empty providers',async()=>{for(const provider of providers){const f=await fixture(provider);assertPartial(f,f.render({...f.pass,maxTriangles:2,maxDraws:1}),2,1);assertPartial(f,f.render({...f.pass,maxTriangles:0}));f.values.gl.isContextLost=()=>true;assert(!f.render(f.pass).complete);f.values.gl.isContextLost=()=>false;assert(!f.render({...f.pass,gl:{...f.m.gl}}).complete);f.values.indices=new Uint32Array();f.values.loaded.clear();assert.deepEqual(f.render(f.pass),{triangles:0,draws:0,complete:true});}});
test('partition material readiness never compiles or substitutes a missing owner program',async()=>{for(const provider of ['root500','delegated500','church','tier300','infill','bremen']){const f=await fixture(provider),owner={kind:'accepted-owner'},key=provider==='church'||provider==='tier300'||provider==='delegated500'?currentPaintProgramKey(291):'owner123';f.values.partitionEnabled=true;f.values[provider==='church'||provider==='tier300'?'familyRuns':'partitionRuns']=[{firstIndex:0,indexCount:12,key:recipeKey(f,key)}];const pending=f.render(f.pass);assertPartial(f,pending);assert.equal(pending.pending,true);assert.equal(f.m.draws.length,0);const a=f.revision();f.values[provider==='church'||provider==='tier300'?'familyPrograms':'partitionPrograms'].set(recipeKey(f,key),owner);assert.equal(f.revision(),a,'resource readiness resumes the existing semantic capture key');assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert(f.m.draws.every(row=>row.program===owner));}});
test('church, tier300 and delegated reflection use actual Float32 override closures and require the exact resident program',async()=>{for(const provider of ['church','tier300','delegated500']){const f=await fixture(provider),programs=f.values[provider==='church'||provider==='tier300'?'familyPrograms':'partitionPrograms'],owner={kind:'ordinary-owner'},key=currentPaintProgramKey(291);f.values[provider==='church'||provider==='tier300'?'familyRuns':'partitionRuns']=[{firstIndex:0,indexCount:12,key:recipeKey(f,key)}];programs.set(key,owner);f.values.paintOverride=()=>.0100000001;assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert(f.m.draws.every(row=>row.program===owner));for(const raw of [1678.75,1000001.25]){f.m.draws.length=0;f.values.paintOverride=()=>raw;assertPartial(f,f.render(f.pass));assert.equal(f.m.draws.length,0);const override={kind:'override',raw};programs.set(currentPaintProgramKey(Math.fround(raw)),override);assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert(f.m.draws.every(row=>row.program===override));}assert.equal(f.m.creates,0);assert.equal(f.m.uploads,0);}});
test('surface texture wrappers are used only after the ordinary frame attached resources',async()=>{const f=await fixture('city'),tex={kind:'window'},diff={kind:'diffuse'};let bound=0;f.values.paintMode=()=>1;f.values.texturedProgram=tex;f.values.diffuseProgram=diff;f.values.windowTexture={isResident:()=>true,stats:{ready:true,textureObjects:1},withResidentTexture(_g,_p,draw){bound++;return draw();}};f.values.diffuseTexture={isResident:()=>true,stats:{neededMaterials:{plaster:true,brick:true},plaster:{ready:true,textureObjects:1},brick:{ready:true,textureObjects:1},totalTextureObjects:2},withResidentTextures(_g,_p,draw){bound++;return draw();}};f.render(f.pass);assert.equal(bound,0);assert(f.m.draws.every(r=>r.program===f.values.program));f.m.draws.length=0;f.values.facadeAttached=true;const r=f.render(f.pass);assert.equal(bound,4);assert.equal(r.draws,2);assert(f.m.draws.every(r=>r.program===diff));});
test('stale masks produce partial capture without uploads; actual shared mask code reuses only current resident versions',async()=>{for(const provider of ['city','root500','delegated500','tier300','church']){const relative='src/safety/facade-rathaus-proxy-mask.ts',text=await readFile(path.join(web,relative),'utf8'),m=mockGL(),pageStore=createFixtureResourceStore(sceneRuntime,m.gl),create=await evaluate(method(text,'createRathausProxyMasks'),maskFactoryImports(pageStore)),masks=create();let drawn=0;assert(!masks.withResidentMasks(m.gl,{},()=>drawn++));assert.equal(m.creates,0);assert.equal(m.uploads,0);masks.withMasks(m.gl,{},()=>drawn++);assert.equal(m.creates,1);assert.equal(m.uploads,1);const ready=masks.residentRevision;assert(masks.withResidentMasks(m.gl,{},()=>drawn++));assert.equal(m.uploads,1);masks.configure([],new Float32Array());assert.notEqual(masks.residentRevision,ready);assert(!masks.withResidentMasks(m.gl,{},()=>drawn++));assert.equal(m.uploads,1);assert.equal(drawn,2);}});
test('clip plane follows final world altitude under a mirrored perspective matrix and leaves the surface shader disabled by default',()=>{const m=new Float64Array([2,.1,.2,.2, .1,3,.2,0, .3,.4,-4,.1, -.2,.3,.5,1]),water=.02,plane=helpers.residentReflectionClipPlane(m,water);assert(plane);for(const z of [-1,-.1,0,.04,.5,1]){const world=[.2,-.1,z,1],clip=Array.from({length:4},(_,r)=>world.reduce((s,v,k)=>s+m[k*4+r]*v,0)),ndc=clip.map(v=>v/clip[3]),signed=plane.reduce((s,v,k)=>s+v*ndc[k],0);assert.equal(signed<0,z<water);}assert.equal(helpers.residentReflectionClipPlane(new Float64Array(16),water),undefined);const src='#version 300 es\nprecision highp float;out vec4 outColor;void main(){outColor=vec4(1.);}',next=helpers.withResidentReflectionClip(src);assert(next.startsWith('#version 300 es\n'));assert(next.includes('if(u_resident_reflection_clip)'));assert(next.includes('gl_FragCoord'));assert(next.includes('outColor=vec4(1.);'));assert.throws(()=>helpers.withResidentReflectionClip('void f(){}'),/one surface/);});
test('reflection frustum culling uses the whole growth envelope; invalid bounds remain conservatively visible',()=>{assert(!helpers.residentReflectionBoxOutside([-.1,2,-.1,.1,3,.1],identity));assert(helpers.residentReflectionBoxOutside([2,0,0,3,1,1],identity));assert(!helpers.residentReflectionBoxOutside([NaN,0,0,1,1,1],identity));});
test('a draw exception overrides an already pending real reflection plan and stops later ready rows',async()=>{
 const f=await fixture('city'),adapter=f.values.residentCaptureAdapter(),snapshot=adapter.snapshot(false);assert.equal(snapshot.status,'active');
 // Keep the provider's actual components, bindings and draw closures. Only the
 // resident run inputs differ: two ready rows, then one admitted missing owner.
 // The snapshot is chunked; its one physical chunk carries those inputs.
 assert.equal(snapshot.chunks.length,1);const chunk=snapshot.chunks[0];
 chunk.runs=[{firstIndex:0,indexCount:3,program:f.values.program},{firstIndex:3,indexCount:3,program:f.values.program},{firstIndex:6,indexCount:6,program:undefined}];
 const planned=helpers.planResidentReflection(chunk.components,chunk.runs,chunk.matrix(f.pass.mainMatrix),f.pass.maxTriangles,f.pass.maxDraws,chunk.indexCount,chunk.cull);
 assert.equal(planned.pending,true);assert.equal(planned.reason,'missing-program');assert.equal(planned.plan.length,2);assert.deepEqual(planned.plan.map(row=>row.firstIndex),[0,3]);
 const runtime=captureHelpers.createResidentCaptureRuntime({...adapter,snapshot:()=>snapshot});let drawCalls=0;
 f.m.gl.drawElements=()=>{drawCalls++;throw Error('controlled pending-plan draw failure');};
 const result=runtime.render(f.pass);assertPartial(f,result);assert.equal(drawCalls,1,'the later ready row must not execute after the first draw throws');assert.notEqual(result.pending,true,'a terminal draw failure must clear inherited resource pending');assert.match(result.reason,/^exception:draw:0\+3:Error: controlled pending-plan draw failure/);assert.deepEqual(f.m.state,f.m.original);assert.equal(f.m.clip.at(-1),0);
});
test('draw failure always clears clipping and restores program, VAO, matrix and depth/blend state',async()=>{const f=await fixture('root500');f.m.gl.drawElements=()=>{throw Error('controlled draw failure');};const result=f.render(f.pass);assertPartial(f,result);assert.match(result.reason,/exception:draw:0\+6:.*controlled draw failure/);assert.notEqual(result.pending,true);assert.equal(f.m.clip.at(-1),0);assert.deepEqual(f.m.state,f.m.original);assert.equal(f.values.matrix,f.mainMatrix);assert.deepEqual([...f.m.uniforms.get(f.values.program).get('u_matrix')],[...identity]);});
test('derived owner displacement stays conservative and source mask failure cannot trigger fallback geometry',async()=>{const f=await fixture('city');f.first.box=[2,0,0,3,1,1];f.second.box=[2,0,0,3,1,1];assert.equal(f.render(f.pass).draws,0);f.values.c312Display.enabled=true;assert.equal(f.render(f.pass).draws,2);f.values.rathausProxyMasks.withResidentMasks=()=>false;assertPartial(f,f.render(f.pass));});
test('the accepted Bremen roof depth tie uses its original indices without mutating main-pass diagnostics',async()=>{const f=await fixture('city',{city:'bremen'});f.values.sourceRoleBatchIncluded=()=>true;const roof={objectId:'osm/way/425109262',partId:'osm/way/425109262/component/43f298631abdaa423549',start:0,end:27,box:[-.1,0,-.1,.1,.1,.1],batches:[{positions:Array.from({length:33},(_,i)=>i%3===1?7.5:0),indices:[10,0,1,1,2,3,1,3,4,4,5,6,4,6,7,4,7,8,4,8,9,4,9,10,4,10,1]}]};f.values.loaded=new Map([['roof',roof]]);f.values.indices=new Uint32Array(27);f.values.familyRuns=[{firstIndex:0,indexCount:27,key:currentPaintProgramKey(0)}];const mainDiagnostic={...f.values.c290DepthTieBreak},packedIndices=f.values.indices,originalIndices=[...roof.batches[0].indices],originalPositions=[...roof.batches[0].positions];assert.deepEqual(f.render({...f.pass,maxTriangles:14,maxDraws:3}),{triangles:14,draws:3,complete:true});assert.deepEqual(f.m.draws.map(r=>[r.count,r.offset]),[[27,0],[9,0],[6,84]]);assert.deepEqual(f.values.c290DepthTieBreak,{...mainDiagnostic,eligible:true,guard:true,uniform:false,roofVertices:11,roofIndices:27,roofY:7.5});assert.equal(f.values.indices,packedIndices);assert.deepEqual(roof.batches[0].indices,originalIndices);assert.deepEqual(roof.batches[0].positions,originalPositions);f.m.draws.length=0;assert.deepEqual(f.render({...f.pass,maxTriangles:13,maxDraws:3}),{triangles:0,draws:0,complete:false,reason:'plan:capture-budget'});});
test('white/paint mode transitions wait for the ordinary frame to select the matching resident pair',async()=>{for(const provider of ['city']){const f=await fixture(provider);f.values.whiteModeEligible=true;f.values.activeWhite=true;assertPartial(f,f.render(f.pass));assert.equal(f.m.draws.length,0);f.values.activeWhite=false;assert.equal(f.render(f.pass).draws,2);f.values.paintMode=()=>0;assert(!f.render(f.pass).complete);f.values.activeWhite=true;assert.equal(f.render(f.pass).draws,2);}});

test('solar capture diagnostics preserve actual provider exceptions, masks and integer plan failures',async t=>{
 for(const provider of ['root500','delegated500','tier300','church','city','bremen']){
  const f=await fixture(provider);f.values.paintMode=()=>0;const pass={...f.pass,purpose:'solar-depth'};
  assert.equal(f.values.solarCoverage().complete,true);
  const draw=f.m.gl.drawElements;f.m.gl.drawElements=()=>{throw Error('controlled solar draw failure '+ 'x'.repeat(800));};
  const exception=f.render(pass);assert.equal(exception.complete,false);assert.match(exception.reason,/^exception:draw:0\+12:Error: controlled solar draw failure/);assert(exception.reason.length<=512);assert.deepEqual(f.m.state,f.m.original);
  if(provider==='bremen')t.diagnostic(JSON.stringify({provider,coverage:f.values.solarCoverage(),returned:exception}));
  f.m.gl.drawElements=draw;const masks=f.values.rathausProxyMasks.withResidentMasks;f.values.rathausProxyMasks.withResidentMasks=()=>false;
  assert.deepEqual(f.render(pass),{triangles:0,draws:0,complete:false,reason:'mask-unavailable:0+12',pending:true});assert.equal(f.values.solarCoverage().complete,true);
  f.values.rathausProxyMasks.withResidentMasks=masks;
  assert.deepEqual(f.render({...pass,maxTriangles:2,maxDraws:1}),{triangles:0,draws:0,complete:false,reason:'plan:capture-budget'});
  assert.deepEqual(f.render({...pass,gl:{...f.m.gl}}),{triangles:0,draws:0,complete:false,reason:'gpu:context-mismatch'});
  f.values.needsBirth=true;assert.match(f.render(pass).reason,/^coverage:needs-birth$/);f.values.needsBirth=false;
  assert.deepEqual(f.render(pass),{triangles:4,draws:1,complete:true});
 }
});
test('solar capture reports unavailable resident texture without drawing fallback geometry',async()=>{
 const f=await fixture('city');Object.assign(f.values,{paintMode:()=>1,facadeAttached:true,texturedProgram:{},windowTexture:{isResident:()=>true,stats:{ready:true,textureObjects:1},withResidentTexture(_gl,_program,_draw,unavailable){return unavailable();}}});
 assert.equal(f.values.solarCoverage().complete,true);
 assert.deepEqual(f.render({...f.pass,purpose:'solar-depth'}),{triangles:0,draws:0,complete:false,reason:'texture-unavailable:0+12',pending:true});assert.equal(f.m.draws.length,0);assert.deepEqual(f.m.state,f.m.original);
});

test('Bremen reused delegated colour programs prepare their complete plan mask without a new depth compiler',async()=>{
 const f=await fixture('delegated500',{city:'bremen'});Object.assign(f.values,{currentFamilyPrograms:false,berlinCurrent:false,legacySolarPartitions:false,partitionEnabled:false});
 const text=await readFile(path.join(web,'src/safety/facade-rathaus-proxy-mask.ts'),'utf8'),create=await evaluate(method(text,'createRathausProxyMasks'),maskFactoryImports(f.store));f.values.rathausProxyMasks=create();
 f.values.prepareSolarPrograms=await evaluate(binding(f.text,'prepareSolarPrograms'),f.values);const prepare=await evaluate(binding(f.text,'prepareSolarShadow'),f.values);
 f.values.setCaptureDemand({kind:'solar',token:'bremen-complete-original-mask',active:true});
 let reads=0;const adapter=f.values.residentCaptureAdapter();f.values.captureRuntime=captureHelpers.createResidentCaptureRuntime({...adapter,snapshot(solar){reads++;return adapter.snapshot(solar);}});
 assert.equal(f.values.solarCoverage().complete,false);assert.equal(f.m.creates,0);assert.equal(reads,1);
 assert.equal(prepare().status,'ready');assert.equal(f.m.creates,1);assert.equal(f.m.uploads,1);assert.equal(f.values.solarCoverage().complete,true);assert.equal(reads,1,'prepare freezes post-mask revision on the original exact rows');
 assert.deepEqual(f.render({...f.pass,purpose:'solar-depth'}),{triangles:4,draws:1,complete:true});assert.equal(reads,1,'execute does not select components or rebuild the plan');
 f.values.rathausProxyMasks.configure([],new Float32Array());assert.equal(f.values.solarCoverage().complete,false);assert.equal(reads,2);assert.equal(prepare().status,'ready');assert.equal(f.m.uploads,2);assert.equal(reads,2);
});

for(const provider of ['city','tier300','delegated500'])test(provider+': capture source demand pins real prepared data, cancels after final release and reacquires a fresh scope',async()=>{
 const f=await fixture(provider),calls=[],old=f.values.preparedDataFixture;assert.equal(old.scope.stats.ownerReleased,true);assert.equal(old.scope.stats.disposed,false);assert.equal(old.scope.stats.pins,1);
 if(provider==='delegated500')f.values.partitionPrograms.clear();else f.values.familyRuns=[{firstIndex:0,indexCount:12,key:currentPaintProgramKey(1004)}];f.values.familySurfaceHelper='fixture material helper';
 f.values.setCaptureDemand({kind:'solar',token:provider+'-prepared-scope-capture',active:true});installAsyncProgramCompiler(f,calls);assert.equal(f.values.prepareSolarShadow().status,'pending');assert.equal(calls.length,0,'capture source construction stays scheduled');
 old.release();assert.equal(old.scope.stats.disposed,true);f.values.programPreparation.prune();f.advancePreparation();assert.equal(calls.length,0,'the released data scope cannot submit a stale capture source');assert.equal(f.values.programPreparation.stats.pending,0);
 const fresh=await preparedPaintPlan(provider,f.text,f.values);assert.notEqual(fresh.scope,old.scope);assert.equal(fresh.scope.stats.ownerReleased,true);assert.equal(fresh.scope.stats.disposed,false);
 f.preparationDriver.onBuild=()=>assert.equal(fresh.scope.stats.disposed,false,'actual source construction uses the live resident pin');
 assert.equal(f.prepareAll().status,'ready');assert.equal(calls.length,1);const coverage=f.values.solarCoverage();assert.equal(coverage.complete,true);assert.deepEqual(f.render({...f.pass,purpose:'solar-depth',maxTriangles:coverage.triangles,maxDraws:coverage.draws}),{triangles:4,draws:1,complete:true});assert.equal(f.m.draws.length,coverage.draws);assert.equal(f.m.draws.reduce((n,row)=>n+row.count/3,0),coverage.triangles);
 f.values.captureRuntime.invalidate();f.values.programPreparation.dispose();fresh.release();assert.equal(fresh.scope.stats.disposed,true);assert.equal(fresh.store.stats.entries,0);assert.equal(fresh.store.stats.leases,0);
});
test('mask readiness cannot promote invalid geometry and missing selected texture remains pending',async()=>{
 const invalid=await fixture('bremen');invalid.values.paintMode=()=>0;invalid.values.anchor=[NaN,0];assert.equal(invalid.values.solarCoverage().complete,false);assert.equal(invalid.values.captureRuntime.prepareSolar().status,'failed');assert.equal(invalid.values.solarCoverage().complete,false);assert.equal(invalid.m.draws.length,0);
 const f=await fixture('city');let draws=0;const stats={ready:false,textureObjects:1,residentRevision:1};Object.assign(f.values,{paintMode:()=>1,facadeAttached:true,texturedProgram:{},windowTexture:{stats,isResident:()=>true,withResidentTexture(_g,_p,draw){draws++;return draw();}}});
 assert.equal(f.values.captureRuntime.prepareSolar().status,'pending');assert.match(f.values.solarCoverage().reason,/texture-unavailable/);assert.equal(draws,0);stats.ready=true;stats.residentRevision++;
 assert.equal(f.values.captureRuntime.prepareSolar().status,'ready');assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);assert.equal(draws,1);
});
test('capture quality waits for needed diffuse pixels while retaining unneeded placeholder sampler residency',async()=>{
 const f=await fixture('city'),stats={neededMaterials:{plaster:true,brick:false},plaster:{ready:true,textureObjects:1,residentRevision:1},brick:{ready:false,textureObjects:1,residentRevision:1},totalTextureObjects:2};
 Object.assign(f.values,{paintMode:()=>1,facadeAttached:true,texturedProgram:{},diffuseProgram:{},windowTexture:{stats:{ready:true,textureObjects:1,residentRevision:1},isResident:()=>true,withResidentTexture(_g,_p,draw){return draw();}},diffuseTexture:{stats,isResident:()=>true,withResidentTextures(_g,_p,draw){return draw();}}});
 assert.equal(f.values.captureRuntime.prepareSolar().status,'ready');assert.equal(f.render({...f.pass,purpose:'solar-depth'}).complete,true);
 stats.neededMaterials.brick=true;assert.equal(f.values.captureRuntime.prepareSolar().status,'pending');stats.brick.ready=true;stats.brick.residentRevision++;assert.equal(f.values.captureRuntime.prepareSolar().status,'ready');
});
test('shared executor stops after draw context loss and performs no state restore on a lost context',async()=>{
 const f=await fixture('city');f.values.paintMode=()=>0;let lost=false,writesAfterLoss=0,drawCalls=0;
 f.m.gl.isContextLost=()=>lost;for(const name of ['uniform1f','useProgram','bindVertexArray','uniformMatrix4fv']){const original=f.m.gl[name].bind(f.m.gl);f.m.gl[name]=(...args)=>{if(lost)writesAfterLoss++;return original(...args);};}
 f.m.gl.drawElements=()=>{drawCalls++;lost=true;};
 const result=f.render({...f.pass,purpose:'solar-depth'});assert.equal(result.complete,false);assert.equal(result.reason,'gpu:context-lost');assert.equal(drawCalls,1);assert.equal(writesAfterLoss,0);
});

// A chunked capture snapshot pins, for one publication, the geometry scene, each
// chunk's mask version, every program it binds and the provider's data scope.
// Every exit must return all of them: a completed reflection, a cached solar plan
// once invalidated, and a draw failure. Otherwise a retired publication (and its
// CPU data) outlives its last consumer.
function captureScope(f){const v=f.values;return{root500:v.committingScope??v.residentScope,infill:v.committingScope??v.residentScope,bremen:v.currentDataScope,tier300:v.residentData?.scope,city:v.publishedDataPlan?.scope,delegated500:v.residentPreparedData?.scope,church:undefined}[f.provider];}
test('chunked captures return every mask pin, program loan, scope pin and scene role on each exit',async()=>{
 for(const provider of providers){
  const f=await fixture(provider),scope=captureScope(f),held=()=>({masks:f.scene.maskPins,loans:f.loans.outstanding,scope:scope?.stats.pins,roles:f.store.stats.roles});
  assert.equal(provider==='church'||!!scope,true,provider+' capture data scope');const baseline=held();assert.equal(baseline.masks,0);assert.equal(baseline.loans,0);
  assert.deepEqual(f.render(f.pass),{triangles:4,draws:2,complete:true});assert(f.loans.issued>0,provider+' capture borrowed its resident programs');assert.deepEqual(held(),baseline,provider+' completed reflection');
  f.values.paintMode=()=>0;assert.equal(f.values.solarCoverage().complete,true);const cached=held();assert(cached.masks>0&&cached.loans>0&&cached.roles>baseline.roles,provider+' a cached solar plan holds its frozen publication');if(scope)assert.equal(cached.scope,baseline.scope+1);
  assert.deepEqual(f.render({...f.pass,purpose:'solar-depth'}),{triangles:4,draws:1,complete:true});assert.deepEqual(held(),cached,provider+' execution returns its own execution roles');
  f.values.captureRuntime.invalidate();assert.deepEqual(held(),baseline,provider+' solar invalidation');
  const draw=f.m.gl.drawElements;f.m.gl.drawElements=()=>{throw Error('controlled ownership draw failure');};
  const failed=f.render(f.pass);f.m.gl.drawElements=draw;assert.equal(failed.complete,false);assert.match(failed.reason,/controlled ownership draw failure/);assert.deepEqual(held(),baseline,provider+' draw failure');
 }
});

// Tiny actual page-store allocations: the capture runtime owns no alternate
// resource cache. The mock GL records only bindings and delayed retirement.
function chunkCaptureFixture(){
 const m=mockGL(),g=m.gl,program={kind:'shared-chunk-program'},visits=[],bindings=[],disposed=[],hooks={};
 Object.assign(g,{SYNC_GPU_COMMANDS_COMPLETE:101,ALREADY_SIGNALED:102,CONDITION_SATISFIED:103,WAIT_FAILED:104,fenceSync:()=>({}),flush(){},clientWaitSync:()=>102,deleteSync(){}});
 const budget=resourceBudgetHelpers.createResourceBudget({limitBytes:4096,recentLimitBytes:0}),store=chunkResourceHelpers.createChunkResourceStore({budget}),scene=store.createScene('resident-capture-test'),epoch=store.contextEpoch(g),clip=helpers.createResidentReflectionUniforms();
 const make=(key,order,translation,anchor,unit)=>{
  const vao={kind:key},component={start:0,end:6,box:[-.1,0,-.1,.1,.1,.1],order};
  const chunk={contentKey:key,vao,components:[component],runs:[{firstIndex:0,indexCount:6,program}],indexCount:6,anchor,unit,opacity:1,cull:true,skipMasks:false,
   masks:{residentRevision:'ready',prepare:()=>({ready:true}),isResident:()=>true,withResidentMasks(_gl,_program,draw){draw();return true;}},bindingRevision:()=>key+':ready',bindingsReady:()=>true,
   matrix(main){const value=new Float64Array(main);value[12]+=translation;return value;},uniforms(p,matrix,plane,viewport){g.uniformMatrix4fv(g.getUniformLocation(p,'u_matrix'),false,matrix);clip(g,p,plane,viewport);},resetClip(p){clip(g,p);},bind(_p,draw){bindings.push(key);draw();}};
  const lease=store.acquireGpu({contentKey:key,role:'candidate',context:g,epoch,estimate:{category:'gpu-buffer',bytes:64,precision:'exact'},create:()=>({key,vao,program}),dispose(value){disposed.push(value.key);hooks.dispose?.(value);}});
  return{chunk,lease};
 };
 // Physical chunk order is deliberately different from original component order.
 const late=make('late',1,.2,[2,3],2),early=make('early',0,-.2,[0,0],1),chunks=[late.chunk,early.chunk],inputs=[late.lease,early.lease];
 const publication=scene.reconcile({generation:1,wanted:inputs.map(row=>row.contentKey),context:g,epoch});for(const lease of inputs)publication.add(lease);assert.equal(publication.publish(),true);for(const lease of inputs)lease.release();
 let snapshotCalls=0,releasedSnapshots=0;
 const snapshot=solar=>{snapshotCalls++;const held=scene.capture(solar?'solar':'reflection');return{status:'active',gl:g,publicationVersion:held.version,chunks,leases:held.leases,release(){releasedSnapshots++;held.release();}};};
 const adapter={revision:()=> 'unchanged-semantic-revision',publicationVersion:()=>scene.version,snapshot},runtime=captureHelpers.createResidentCaptureRuntime(adapter);
 const draw=g.drawElements;g.drawElements=(...args)=>{visits.push({vao:m.state.vao,matrix:[...m.uniforms.get(m.state.program).get('u_matrix')]});hooks.draw?.(visits.length);return draw(...args);};
 const pass={gl:g,mainMatrix:new Float64Array(identity),clipPlaneWorldZ:0,maxTriangles:4,maxDraws:2};
 return{m,g,budget,store,scene,epoch,chunks,program,visits,bindings,disposed,hooks,adapter,runtime,snapshot,pass,get snapshotCalls(){return snapshotCalls;},get releasedSnapshots(){return releasedSnapshots;},cleanup(){runtime.destroy();scene.destroy();store.destroy();store.collectRetired();assert.equal(budget.stats.bytes,0);}};
}

test('solar combines adjacent components only after selection, with exact coverage and unchanged reflection draws',()=>{
 const f=chunkCaptureFixture();try{
  const early=f.chunks[1],box=early.components[0].box;
  early.components=[{start:0,end:3,box,order:0},{start:3,end:6,box,order:1}];
  f.chunks[0].components[0].order=2;
  assert.equal(f.runtime.prepareSolar().status,'ready');
  const coverage=f.runtime.coverage();assert.equal(coverage.triangles,4);assert.equal(coverage.draws,2);assert.equal(coverage.complete,true);
  assert.deepEqual(f.runtime.render({...f.pass,purpose:'solar-depth'}),{triangles:4,draws:2,complete:true});
  assert.deepEqual(f.m.draws.map(v=>[v.count,v.offset]),[[6,0],[6,0]]);
  assert.deepEqual(f.visits.map(v=>v.vao),[early.vao,f.chunks[0].vao]);
  f.m.draws.length=0;
  assert.deepEqual(f.runtime.render({...f.pass,maxDraws:3}),{triangles:4,draws:3,complete:true});
  assert.deepEqual(f.m.draws.map(v=>[v.count,v.offset]),[[3,0],[3,12],[6,0]]);
  assert.deepEqual(f.m.state,f.m.original);
 }finally{f.cleanup();}
});

test('solar batching never spans omitted indices, different programs or the tie-bias pass',()=>{
 const f=chunkCaptureFixture();try{
  const early=f.chunks[1],box=early.components[0].box,other={kind:'other-program'};
  early.components=[{start:0,end:3,box,order:0},{start:6,end:9,box,order:1},{start:9,end:12,box,order:2}];
  early.indexCount=12;early.runs=[{firstIndex:0,indexCount:9,program:f.program},{firstIndex:9,indexCount:3,program:other}];
  f.chunks[0].components[0].order=3;
  early.extra={component:early.components[2],rows:[{program:other,firstIndex:9,indexCount:3}]};
  assert.equal(f.runtime.prepareSolar().status,'ready');const coverage=f.runtime.coverage();
  assert.equal(coverage.triangles,6);assert.equal(coverage.draws,5);
  assert.deepEqual(f.runtime.render({...f.pass,purpose:'solar-depth',maxTriangles:6,maxDraws:5}),{triangles:6,draws:5,complete:true});
  assert.deepEqual(f.m.draws.map(v=>[v.program,v.count,v.offset]),[[f.program,3,0],[f.program,3,24],[other,3,36],[f.program,6,0],[other,3,36]]);
  assert.deepEqual(f.m.state,f.m.original);
 }finally{f.cleanup();}
});

test('multi-chunk capture preserves original row order, local VAOs/matrices and one complete-pass budget',()=>{
 const f=chunkCaptureFixture();try{
  assert.deepEqual(f.runtime.render(f.pass),{triangles:4,draws:2,complete:true});
  assert.deepEqual(f.visits.map(row=>row.vao),[f.chunks[1].vao,f.chunks[0].vao]);assert.deepEqual(f.visits.map(row=>row.matrix[12]),[Math.fround(-.2),Math.fround(.2)]);assert.deepEqual(f.bindings,['early','late']);assert.deepEqual(f.m.state,f.m.original);
  f.visits.length=0;f.m.draws.length=0;f.bindings.length=0;
  const bounded=f.runtime.render({...f.pass,maxTriangles:2,maxDraws:1});assert.deepEqual(bounded,{triangles:2,draws:1,complete:false,reason:'plan:capture-budget'});assert.deepEqual(f.visits.map(row=>row.vao),[f.chunks[1].vao]);
  f.chunks[1].runs[0].program=undefined;f.visits.length=0;
  const pending=f.runtime.render({...f.pass,maxTriangles:2,maxDraws:1});assert.equal(pending.complete,false);assert.equal(pending.pending,true);assert.match(pending.reason,/missing-program/);assert.equal(pending.draws,0);assert.equal(f.visits.length,0,'a later ready chunk cannot consume an earlier missing-program reservation');
  f.chunks[1].runs[0].program=f.program;f.chunks[0].extra={component:f.chunks[0].components[0],rows:[{program:f.program,firstIndex:0,indexCount:3}]};
  assert.deepEqual(f.runtime.render({...f.pass,maxTriangles:5,maxDraws:3}),{triangles:5,draws:3,complete:true});
  const tied=f.runtime.render(f.pass);assert.equal(tied.complete,false);assert.equal(tied.triangles,2);assert.equal(tied.draws,1,'tie reservation is deducted once for the full pass');
 }finally{f.cleanup();}
});

test('solar execution retains old chunk resources through scene replacement, cache invalidation and GL restoration',()=>{
 const f=chunkCaptureFixture();try{
  const coverage=f.runtime.coverage();assert.equal(coverage.complete,true);assert.deepEqual(coverage.bounds,[-.1,-.1,0,2+.1/2,3+.1/2,.1]);
  f.hooks.draw=index=>{if(index===1){const empty=f.scene.reconcile({generation:2,wanted:[],context:f.g,epoch:f.epoch});assert.equal(empty.publish(),true);f.runtime.invalidate();}assert.equal(f.disposed.length,0,'in-progress capture pins both old allocations after main/cache departure');};
  f.hooks.dispose=()=>{assert.equal(f.visits.length,2);assert.deepEqual(f.m.state,f.m.original,'resources retire after all GL state restoration');};
  assert.deepEqual(f.runtime.render({...f.pass,purpose:'solar-depth'}),{triangles:4,draws:2,complete:true});assert.equal(f.disposed.length,2);assert.equal(f.releasedSnapshots,1);f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.cleanup();}
});

test('capture rejects a retention handle for another publication version and releases partial ownership',()=>{
 const f=chunkCaptureFixture();let releases=0;try{
  f.adapter.snapshot=solar=>{const snapshot=f.snapshot(solar);return{...snapshot,retain(role){const held=f.scene.capture(role);return{version:held.version+1,leases:held.leases,release(){releases++;held.release();}};}};};
  const result=f.runtime.render(f.pass);assert.equal(result.complete,false);assert.match(result.reason,/publication version changed/);assert.equal(f.visits.length,0);assert.equal(releases,1);assert.equal(f.releasedSnapshots,1);assert.equal(f.budget.stats.bytes,128,'only published allocations remain charged');
 }finally{f.cleanup();}
});

test('a cached solar plan cannot remain ready after another owner invalidates the shared GL epoch or the context is lost',()=>{
 for(const loss of ['epoch','physical']){const f=chunkCaptureFixture();try{
  assert.equal(f.runtime.coverage().complete,true);assert.equal(f.snapshotCalls,1);
  if(loss==='epoch')f.store.invalidateContext(f.g,f.epoch);else f.g.isContextLost=()=>true;
  const coverage=f.runtime.coverage();assert.equal(coverage.complete,false,loss);assert.equal(f.runtime.stats.ready,false);assert.equal(f.snapshotCalls,2,'unchanged revision/bindings/version cannot bypass invalid lease/context state');assert(f.releasedSnapshots>=1);assert.equal(f.visits.length,0);
 }finally{f.cleanup();}}
});

test('chunk-local capture ownership rejects a bare second VAO while a real global scene capture covers the complete set',()=>{
 const f=chunkCaptureFixture();try{
  f.adapter.snapshot=solar=>{const snapshot=f.snapshot(solar);return{...snapshot,leases:undefined,chunks:[{...f.chunks[0],leases:[snapshot.leases[0]]},{...f.chunks[1]}]};};
  const rejected=f.runtime.render(f.pass);assert.equal(rejected.complete,false);assert.match(rejected.reason,/publication leases/);assert.equal(f.visits.length,0);assert.equal(f.releasedSnapshots,1);
  f.adapter.snapshot=f.snapshot;assert.deepEqual(f.runtime.render(f.pass),{triangles:4,draws:2,complete:true});assert.equal(f.releasedSnapshots,2);
 }finally{f.cleanup();}
});

test('solar preparation preserves terminal blocks, keeps legacy waits and retries only a new revision',()=>{
 let revision=0,reads=0,snapshot={status:'blocked',reason:'main-upload-failed',pending:false};
 const runtime=captureHelpers.createResidentCaptureRuntime({revision:()=>String(revision),snapshot(){reads++;return snapshot;}});
 try{
  for(let i=0;i<3;i++)assert.deepEqual(runtime.prepareSolar(),{status:'failed',reason:'main-upload-failed'});
  assert.equal(reads,1,'a terminal block reuses its cached snapshot');
  assert.equal(runtime.coverage().complete,false);
  for(const pending of [true,undefined]){
   revision++;snapshot={status:'blocked',reason:'main-upload-pending',...(pending===undefined?{}:{pending})};
   assert.deepEqual(runtime.prepareSolar(),{status:'pending',reason:'main-upload-pending'});
  }
  revision++;snapshot={status:'inactive'};
  assert.deepEqual(runtime.prepareSolar(),{status:'ready'});
  assert.equal(reads,4,'a changed source revision can leave the terminal state');
 }finally{runtime.destroy();}
});

test('a terminal replacement releases the previous solar publication without retaining departed chunks',()=>{
 const f=chunkCaptureFixture();try{
  assert.equal(f.runtime.prepareSolar().status,'ready');
  const empty=f.scene.reconcile({generation:2,wanted:[],context:f.g,epoch:f.epoch});assert.equal(empty.publish(),true);
  assert.equal(f.disposed.length,0,'the prior capture holds its publication until replacement');
  f.adapter.snapshot=()=>({status:'blocked',pending:false,reason:'replacement-upload-failed'});
  assert.deepEqual(f.runtime.prepareSolar(),{status:'failed',reason:'replacement-upload-failed'});
  assert.equal(f.releasedSnapshots,1);assert.equal(f.disposed.length,2);
  f.store.collectRetired();assert.equal(f.budget.stats.bytes,0);
 }finally{f.cleanup();}
});

test('solar preparation observes a completed upload on a fixed camera and content revision',()=>{
 const f=chunkCaptureFixture();
 try{
  let uploaded=false,reads=0;
  f.adapter.snapshot=solar=>{
   reads++;
   return uploaded?f.snapshot(solar):{status:'blocked',pending:true,reason:'geometry-upload-pending'};
  };
  assert.equal(f.runtime.prepareSolar().status,'pending');
  uploaded=true;
  assert.equal(f.runtime.coverage().complete,false);
  assert.equal(reads,1,'reading the witness cannot drive preparation');
  assert.equal(f.runtime.prepareSolar().status,'ready');
  assert.equal(f.runtime.render({...f.pass,purpose:'solar-depth'}).complete,true);
  assert.equal(reads,2,'a complete publication stays cached');
 }finally{f.cleanup();}
});

test('a linked program can complete a previously pending solar plan at the same revision',()=>{
 const f=chunkCaptureFixture();
 try{
  let linked=false;
  f.adapter.snapshot=solar=>{
   const snapshot=f.snapshot(solar);
   if(linked)return snapshot;
   return {...snapshot,chunks:snapshot.chunks.map(chunk=>({...chunk,runs:chunk.runs.map(run=>({...run,program:undefined}))}))};
  };
  assert.equal(f.runtime.prepareSolar().status,'pending');
  linked=true;
  assert.equal(f.runtime.prepareSolar().status,'ready');
  assert.equal(f.runtime.coverage().complete,true);
  assert.equal(f.releasedSnapshots,1,'the pending snapshot releases its old loans');
 }finally{f.cleanup();}
});

test('solar preparation reports broken index coverage for the current geometry',()=>{
 const f=chunkCaptureFixture();
 try{
  f.chunks[0].runs[0].indexCount=3;
  const result=f.runtime.prepareSolar();
  assert.equal(result.status,'failed');
  assert.match(result.reason,/run-coverage/);
  assert.equal(f.runtime.coverage().complete,false);
  assert.equal(f.snapshotCalls,1);
 }finally{f.cleanup();}
});

test('released capture holds clear lease and callback arrays and stop reporting live ownership',async()=>{
 const f=chunkCaptureFixture();try{
  const source=await readFile(path.join(web,'src/safety/render-runtime/resident-capture.ts'),'utf8'),releaseAll=await evaluate(binding(source,'releaseAll'),{}),holdResources=await evaluate(binding(source,'holdResources'),{releaseAll});
  let hold,released=0;
  hold=holdResources({gl:f.g,publicationVersion:f.scene.version,chunks:[],chunkOwnership:true,leases:f.scene.leases,retain(role){const held=f.scene.capture(role);return{version:held.version,release(){released++;assert.equal(hold.live(),false);held.release();}};}},'solar');
  const leases=hold.leases,callbacks=hold.repeat,repeat=callbacks[0];assert.equal(leases.length,2);assert.equal(callbacks.length,1);assert.equal(hold.live(),true);
  hold.release();assert.equal(hold.live(),false);assert.equal(leases.length,0);assert.equal(callbacks.length,0);assert.throws(()=>repeat('solar'),/Capture hold released/);assert.equal(released,1);hold.release();assert.equal(released,1,'role release remains idempotent');
 }finally{f.cleanup();}
});
