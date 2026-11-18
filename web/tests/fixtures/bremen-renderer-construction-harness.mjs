import {createResidentCaptureOwnership} from '../support/fixtures-managers-b-renderer-runtime.mjs';
import {f154Construction} from '../support/f154-construction-boundary.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createRuntimeLoader} from '../support/fixtures-managers-a-runtime.mjs';

const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const rendererPath=path.join(web,'src/painted/bremen/safety/building-mesh-renderer.ts');
const scopePath=path.join(web,'src/safety/frozen-data-scope.ts');
const resource={canonicalSHA256:'a'.repeat(64),file:'tiny/renderer-programs.ts',occurrence:0,codec:'json'};
const TINY_FRAGMENT='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}';
const groupDiagnostics=['getLloydFrontGroupReadback','getBremenHeldSourceReadback','getF260AcceptedRestoreGroupReadback','getMarketCapGroupReadback','getOrganistenGroupReadback','getGlockeKuesterGroupReadback','getTeerhofDetailGroupReadback','getEuroGableGroupReadback','getBremenStephaniRowsGroupReadback','getBremenHbfCourtGroupReadback','getBremenCoverageGroupReadback','getBremenEdgefill70GroupReadback','getBremenWholeDisplayCertificate'];
export const assertDiagnosticState=(renderer,state)=>{for(const name of groupDiagnostics){const value=renderer[name](component());assert.equal(value.state,state,name);assert.equal(value.status,state,name);assert.equal(value.generation,renderer.getRevision().generation,name);}};
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[],sourceRetained:true,actualVisualAccepted:false});
const count=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
export function component(id=1){return{city:'bremen',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/tiny',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:'osm/way/'+id,properties:{},geometry:{type:'Polygon',coordinates:[]}},batches:[{positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,0,1,0,0,1,0,0,1]),indices:new Uint32Array([0,1,2]),color:[.4,.5,.6]}]};}
export function evaluate(source,require= id=>{throw Error('Unexpected fixture leaf import '+id);}){const sf=ts.createSourceFile('fixture.ts',source,ts.ScriptTarget.Latest,true);source=[...sf.statements.filter(ts.isImportDeclaration),...sf.statements.filter(n=>!ts.isImportDeclaration(n))].map(n=>n.getText(sf)).join('\n');const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const module={exports:{}};new Function('require','module','exports',compiled)(require,module,module.exports);return module.exports;}

// This evaluates the entire production module and calls its exported constructor.
// Imports are tiny boundary substitutes; no product function is AST-extracted.
// ownerRuntime/rendererOptions (optional) replace the tiny owner boundary and add
// constructor options (for example the real Bremen owner runtime and its native
// leaf hash); omitted, the harness is unchanged.
export function constructionHarness(rendererSource=fs.readFileSync(rendererPath,'utf8'),{dependencyOverrides={},resourceValue,ownerRuntime:ownerRuntimeOverride,rendererOptions={}}={}){
 const events=[],scopes=[],handlers=new Map(),clients=[],control={failSpecialization:false,failMaterials:false,paused:false,errors:[],lost:false},gpu={attaches:0,detaches:0,releases:0,compiles:0,sourceBuilds:0,disposes:0};
 // A lost context frees its GPU objects: the tiny driver forgets every buffer of
 // the lost incarnation when the context-lost event reaches the renderer.
 let lostBuffers=0;const handlerSources=new Map();
 const timers=new Map(),programPlans=[],compileRequests=[],uploads=[],subUploads=[],deletedBuffers=new Set(),deletedPrograms=[],buffers=new Map(),sources=[],phaseEvents=[],draws=[];let serial=0,vao,array,element,uniform,attempt=0,errorReads=0,phase,timerID=0;const uniformUploads=[],uniformSizes=new Map(),uniformIndexed=new Map();
 const inPhase=(value,run)=>{const before=phase;phase=value;phaseEvents.push(value);try{return run();}finally{phase=before;}};
 // One actual page runtime: the resource ledger, chunk store and the render-runtime
 // modules import each other (program-preparation <-> chunk-resource-store), so
 // they load through one cycle-aware CommonJS loader and share their error classes.
 const runtime=createRuntimeLoader(web),runtimeModule=name=>runtime.load(path.join(web,'src',name));
 const {createFrozenDataScope}=runtime.load(scopePath);
 const documentStub=new EventTarget(),canvas={width:512,height:512,clientWidth:512,clientHeight:512,getBoundingClientRect:()=>({left:0,top:0,width:512,height:512})};
 const map={getCenter:()=>({lng:8,lat:53}),getCanvas:()=>canvas,on(type,fn){handlerSources.set(type,fn);handlers.set(type,type==='webglcontextlost'?(...args)=>{lostBuffers+=buffers.size;buffers.clear();control.onContextLost?.();return fn(...args);}:fn);},off(type,fn){if(handlerSources.get(type)===fn){handlers.delete(type);handlerSources.delete(type);}},triggerRepaint(){}};
 const globals={setTimeout:fn=>{const id=++timerID;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),document:documentStub,location:{search:'',hostname:'example.invalid'},window:{devicePixelRatio:1}};
 async function environment(run){const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});try{return await run();}finally{for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
 const admissionsModule=evaluate(fs.readFileSync(path.join(web,'src/painted/bremen/safety/progressive-paint-admissions.ts'),'utf8'),id=>{throw Error('Unexpected admissions code import '+id);});
 const admissionsResource=admissionsModule.PROGRESSIVE_ADMISSIONS_RESOURCE;
 const constructionResource=evaluate(fs.readFileSync(path.join(web,'src/painted/bremen/safety/bremen-ag70-metadata.ts'),'utf8')).EDGE70_RESOURCE,constructionMemo={},preparedCertificateScopes=new WeakSet();
 const tinyAdmissions=[1,2,3].map(id=>({city:'bremen',objectId:'osm/way/'+id,partId:'osm/way/'+id+'/component/tiny',origin:[8,53],descriptionSHA256:'b'.repeat(64),geometrySignature:'tiny',tier:1,mode:'tiny',family:7,batchColors:{'0':[.2,.3,.4]}}));
 function newScope(){const ledger={acquires:0,releases:0,sourceRegistrations:0,borrows:0,shaderBorrows:0,admissionBorrows:0,constructionBorrows:0,modelBorrows:0,refs:[],releasedRefs:[],prepareRequests:[]};clients.push(ledger);const scope=createFrozenDataScope({async acquire(ref,signal){signal.throwIfAborted();const admission=ref.canonicalSHA256===admissionsResource.canonicalSHA256,shader=ref.canonicalSHA256===resource.canonicalSHA256,construction=ref.canonicalSHA256===constructionResource.canonicalSHA256;if(admission||shader||construction)assert.deepEqual(ref,admission?admissionsResource:shader?resource:constructionResource);const value=admission?tinyAdmissions:shader?{fragment:TINY_FRAGMENT}:construction?{fixtureConstruction:[1,2,3]}:resourceValue?.(ref);if(!admission&&!shader&&!construction&&!resourceValue)throw Error('Unregistered tiny resource: '+ref.file);ledger.acquires++;ledger.refs.push({...ref});let live=true;return{borrow(read){assert.ok(live);
  // The actual scope walks each acquired value once (rememberSource) so that its
  // memo costs exclude shared source objects. That registration is scope
  // bookkeeping, not a consumer read: it is counted apart from the borrows below.
  // Match only the production registration callback (frozen-data-scope.ts).
  // Other first reads still count; a changed callback makes the existing
  // sourceRegistrations===acquires check fail loudly.
  const registrationSource=Function.prototype.toString.call(read).replace(/\s+/g,'');
  if(registrationSource==='value=>rememberSource(value,owner)'||registrationSource==='(value)=>rememberSource(value,owner)'){ledger.sourceRegistrations++;return read(value);}
  ledger.borrows++;if(admission)ledger.admissionBorrows++;else if(shader)ledger.shaderBorrows++;else if(construction)ledger.constructionBorrows++;else ledger.modelBorrows++;return read(value);},release(){if(live){live=false;ledger.releases++;ledger.releasedRefs.push({...ref});}},retainResource(role){assert.ok(live);return page.store.acquire({contentKey:JSON.stringify(['tiny-frozen-resource-parent',ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]),role,allowRecent:false,estimate:{category:'metadata',bytes:64,precision:'estimate',label:'tiny frozen resource parent'},produce:()=>({ref:{...ref}}),costs:value=>({category:'metadata',bytes:64,precision:'estimate',identity:value})});}};}});const prepare=scope.prepare;scope.prepare=(refs,signal)=>{ledger.prepareRequests.push(refs.map(ref=>({...ref})));return prepare(refs,signal);};const originalRetain=scope.retain;scope.retain=()=>{events.push({kind:'retain',scope});return originalRetain();};scopes.push(scope);return scope;}
 function shader(kind,scope){assert.equal(phase,'compile-build','full shader reads require admitted compile.build');events.push({kind,scope});assert.ok(scope,'missing prepared renderer scope at '+kind);assert.ok(scope.stats.pins>0,'program configuration happened before retaining scope');return scope.borrow(resource,value=>value);}
 const shaderModule={clearBremenPreparedProgramSources(){events.push({kind:'source-clear'});},paintProgramPartitionEnabled:(city,scope)=>{assert.equal(city,'bremen');events.push({kind:'partition',scope});if(scope)assert.ok(scope.stats.pins>0);return true;},paintProgramFragment:(key,city,scope)=>{assert.equal(key,'base');assert.equal(city,'bremen');return shader('base',scope).fragment;},facadePaintFragmentForCity:(city,scope)=>shader('city-fragment',scope).fragment,facadePaintSpecializationForCity:city=>({city,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null,specialized:null}),describeFacadePaintSource:(city,source,kind,scope)=>{assert.equal(phase,'compile-build');assert.equal(city,'bremen');assert.ok(scope.stats.pins>0);events.push({kind:'source-description',scope});if(control.failSpecialization)throw Error('tiny source-description failure');return{city,scopeLabel:scopes.indexOf(scope),sourceKind:kind,fragmentBytes:Buffer.byteLength(source,'utf8'),fullFragmentBytes:kind==='full'?Buffer.byteLength(source,'utf8'):null,specialized:null};},paintProgramKey:()=> 'base',genericBerlinOwnerExclusionCertified:()=>false,genericDusseldorfProgramCertified:()=>false,
  // Program-source admission bounds of the tiny fragment, from the actual shader
  // source budget (the plan reserves them before the scoped raw-source assembly).
  describeFacadePaintSourceBounds:(city,_sourceKey,scope)=>{assert.equal(city,'bremen');assert.ok(scope,'source bounds are described inside a prepared scope');const budget=runtimeModule('safety/render-runtime/shader-source-budget.ts');return budget.shaderSourceBounds(budget.shaderSourceText(TINY_FRAGMENT,['tiny-bremen-facade-v1']));}};
 const sourceRows=rows=>rows;
 const factories={retainF154ReconstructionConstruction:f154Construction.retainF154ReconstructionConstruction,retireF154ReconstructionConstruction:f154Construction.retireF154ReconstructionConstruction,createResidentReflectionUniforms:()=>()=>{},createResidentReflectionObjects:()=>{const ids=new WeakMap();let id=0;return value=>{if(!value)return 0;if(!ids.has(value))ids.set(value,++id);return ids.get(value);};},defaultSceneEnvironment:()=>({instantISO:'2026-01-01T00:00:00Z'}),sceneSolarLight:()=>({shadowVector:undefined}),createSceneLightUniforms:()=>()=>{},createProjectedShadowMask:()=>({release(){},stats:{}}),createNativeSourceReadback:()=>({destroy(){},observe(){},stats:{}}),createRathausProxyMasks:()=>{const resident=new Map();let revision=0;return{configure(){resident.clear();revision++;},detach(){resident.clear();revision++;},prepare(context,programs){if(context.isContextLost())return{ready:false,reason:'context-lost'};let refs=resident.get(context);if(!refs)resident.set(context,refs=new Set());for(const program of programs)if(!refs.has(program)){refs.add(program);revision++;}return{ready:true};},isResident:(context,program)=>!context.isContextLost()&&!!resident.get(context)?.has(program),get residentRevision(){return 'tiny:'+revision;},withMasks(_gl,_p,draw){return draw();},stats:{allocatedCPUBytes:0,allocatedGPUBytes:0}};},createSolarShadowPreparationBudget:()=>({}),createResidentCaptureRuntime:adapter=>({invalidate(){events.push({kind:'capture-invalidate'});},render(){return adapter.snapshot(false);}})};
 const leaf=name=>fs.readFileSync(path.join(web,'src/'+name),'utf8');
 const programModule=runtimeModule('safety/render-runtime/program-preparation.ts');
 shaderModule.BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY=programModule.createProgramSourceAuthority({inputs:['tiny-bremen-facade-v1'],builders:[shaderModule.paintProgramFragment,shaderModule.facadePaintFragmentForCity,shaderModule.describeFacadePaintSource]});
 const viewportModule=evaluate(leaf('safety/viewport-request.ts'));
 const geometryModule=runtimeModule('safety/render-runtime/resident-geometry.ts');
 const lifecycleModule=evaluate(leaf('safety/resident-gpu-lifecycle.ts'));
 const familyModule=runtimeModule('safety/family-paint-program.ts');
 const preparedSources=runtimeModule('safety/prepared-source.ts');
 const programPlanModule=evaluate(leaf('painted/bremen/safety/bremen-prepared-program-plan.ts'),id=>{if(id==='./facade-paint-fragment')return shaderModule;if(id==='../../../safety/utf8-byte-length')return evaluate(leaf('safety/utf8-byte-length.ts'));if(id==='../../../safety/prepared-source')return preparedSources;throw Error('Unexpected Bremen plan dependency '+id);});
 const reflectionFactories={createResidentReflectionUniforms:factories.createResidentReflectionUniforms,createResidentReflectionObjects:factories.createResidentReflectionObjects};
 const imports={
  // Chunk input retention, chunk mesh packing/residency and the shader source and
  // assembly budgets are page runtime infrastructure: actual modules of the same
  // runtime (one chunk store and ledger), like program preparation and geometry.
  '../../../safety/renderer-chunk-input':runtimeModule('safety/renderer-chunk-input.ts'),
  '../../../safety/resource-content-key':runtimeModule('safety/resource-content-key.ts'),
  './bremen-display-derivations':runtimeModule('painted/bremen/safety/bremen-display-derivations.ts'),
  './shared-paint-recipe':runtimeModule('painted/bremen/safety/shared-paint-recipe.ts'),
  '../../../safety/render-runtime/shader-source-budget':runtimeModule('safety/render-runtime/shader-source-budget.ts'),
  '../../../safety/render-runtime/shader-assembly-budget':runtimeModule('safety/render-runtime/shader-assembly-budget.ts'),
  '../../root500/safety/chunk-mesh-packing':runtimeModule('painted/root500/safety/chunk-mesh-packing.ts'),
  '../../root500/safety/chunk-mesh-residency':runtimeModule('painted/root500/safety/chunk-mesh-residency.ts'),
  '../../../safety/facade-rathaus-display-masks':runtimeModule('safety/facade-rathaus-display-masks.ts'),
  './facade-rathaus-proxy-mask':runtimeModule('painted/bremen/safety/facade-rathaus-proxy-mask.ts'),
  '../../../safety/viewport-request':viewportModule,
  '../../../safety/render-runtime/program-grant-handoff':evaluate(leaf('safety/render-runtime/program-grant-handoff.ts')),
  './facade-paint-fragment':shaderModule,
  './bremen-certificate-group-ledger':{certificateGroupKeysForModule:(_module,rows)=>rows?.some(c=>tinyAdmissions.some(r=>r.objectId===c.objectId&&r.partId===c.partId))?['tiny:owner']:[],certificateGroupKeysForIdentity:c=>tinyAdmissions.some(r=>r.objectId===c?.objectId&&r.partId===c?.partId)?['tiny:owner']:[]},
  './bremen-recipe-stages':{bremenScopedCall:(fn,args,scope)=>fn(...args,scope),prepareBremenModuleResources:async(scope,_rows,signal)=>scope.prepare([resource,admissionsResource],signal)},
  './owner-reconstruction':{BREMEN_MATERIAL_SCOPE_CONSUMERS:[],prepareOwnerRecoveredSourceComponents:async()=>{},ownerRecoveredSourceComponents:sourceRows,prepareBremenOwnerReconstructionComponents:async rows=>({components:rows,stats:emptyStats()}),ownerReconstructionComponents:rows=>({components:rows,stats:emptyStats()}),ownerReconstructionBaseMaterials:()=>{if(control.failMaterials)throw Error('tiny material failure');},ownerReconstructionIdentity:()=>false},
  '../../root500/safety/root500-derived-display-data':{prepareRoot500DerivedDisplays:async()=>{}},
  './bremen-prepared-program-plan':{createBremenPreparedProgramPlan(options){const plan=programPlanModule.createBremenPreparedProgramPlan(options);programPlans.push(plan);return plan;}},
  '../../../safety/render-runtime/resident-geometry':geometryModule,
  '../../../safety/render-runtime/program-preparation':{...programModule,createProgramPreparationOwner(...args){const owner=programModule.createProgramPreparationOwner(...args);return{...owner,get stats(){return owner.stats;},dispose(){gpu.disposes++;events.push({kind:'program-dispose'});owner.dispose();},compile(context,recipe){gpu.compiles++;compileRequests.push({resource:recipe.resource,inputs:[...recipe.inputs]});return owner.compile(context,{...recipe,build:()=>inPhase('compile-build',()=>{gpu.sourceBuilds++;return recipe.build();})});},work(context,recipe){return owner.work(context,{...recipe,work:()=>inPhase(recipe.phase??'upload',recipe.work)});}};}},
  '../../../safety/family-paint-program':familyModule,
  '../../../safety/component-readback':evaluate(leaf('safety/component-readback.ts')),
  '../../../safety/resident-gpu-lifecycle':{...lifecycleModule,createResidentGPULifecycle(callbacks){const owner=lifecycleModule.createResidentGPULifecycle(callbacks);return{...owner,get stats(){return owner.stats;},attach(gl){gpu.attaches++;owner.attach(gl);},detach(){gpu.detaches++;owner.detach();},released(){gpu.releases++;owner.released();}};}},
  '../../../safety/resident-planar-reflection':{...evaluate(leaf('safety/resident-planar-reflection.ts')),withResidentReflectionClip:text=>text,...reflectionFactories},
  '../../../safety/custom-layer-render-error':{guardCustomLayerRender:(_map,_id,render)=>render},
  './owner-display-budget':{fitOwnerDisplayBudget:(components,_cap,options)=>({components,vertices:options.vertices,indices:options.indices,diagnostic:{}}),sourceBoundsContainFocus:()=>false},
  './f260-canopy-recovery267':{f260CanopyDisplay267:rows=>({drawable:rows,held:[]}),applyF260CanopyPaint267:()=>{}},
  './source-part-display':{exactNativePartDisplay:rows=>({drawable:rows,held:[]})},
  './infill-f288-coplanar-roof':{infillF288ClipCoplanarFacilityRoofs:sourceRows},
  './source-role-display':{sourceRoleBatchIncluded:()=>true,sourceRoleDisplayProfile:()=>null},
  './s434-aggregate-display':{s434AggregateBatchIncluded:()=>true},
  './s434-owner138-compat':{checkS434Owner138Replacement:()=>({status:'not-loaded'})},
  '../../../safety/paint-ownership':{acceptPaintComponent:()=>true},
  './facade-paint-controls':{paintMode:()=>0,paintOverride:()=>0},
  './progressive-paint':{progressivePaintFingerprints:{},getProgressivePaintCount:()=>0,progressivePaintCount:0,progressivePaintData:rows=>new Float32Array(count(rows)*4),progressivePaintRejections:()=>[],progressiveRenderStatus:()=>[],progressiveAdmission:()=>undefined},
  './facade-paint-frame':{facadePaintData:rows=>new Float32Array(count(rows)*5)},
 };
 const identityCode=new Map();
 function loadIdentityCode(name){if(identityCode.has(name))return identityCode.get(name);const value=evaluate(fs.readFileSync(path.join(web,'src/painted/bremen/safety/'+name+'.ts'),'utf8'),id=>{if(['./bremen-identity-projections','./bremen-identity-metadata','./bremen-ag70-identities','./bremen-ag70-metadata','./bremen-demand-metadata','./bremen-recipe-demand'].includes(id))return loadIdentityCode(id.slice(2));throw Error('Unexpected pure identity dependency '+id);});identityCode.set(name,value);return value;}
 const f260Metadata=evaluate(fs.readFileSync(path.join(web,'src/painted/bremen/safety/f260-accepted-restore-data.ts'),'utf8'),id=>{throw Error('Unexpected F260 metadata import '+id);});
 const progressive=evaluate(fs.readFileSync(path.join(web,'src/painted/bremen/safety/progressive-paint.ts'),'utf8'),id=>{
  if(id==='./bremen-identity-metadata'||id==='./bremen-recipe-demand')return loadIdentityCode(id.slice(2));
  if(id==='./progressive-paint-admissions')return admissionsModule;
  if(id==='./f260-accepted-restore-runtime')return{F260_ACCEPTED_RESTORE_SCOPE_RESOURCES:[f260Metadata.F260_ACCEPTED_RESTORE_DATA_RESOURCE],f260AcceptedRestoreAdmission:()=>undefined};
  if(id==='./f260-accepted-restore-data')return{F260_ACCEPTED_RESTORE_SHA:'c'.repeat(64)};
  if(id==='./progressive-feature-glsl')return{PROGRESSIVE_FEATURE_SHA:'d'.repeat(64)};
  if(id==='./progressive-merged-tower-family')return{validProgressiveNativeFamily:()=>true};
  if(id==='./progressive-paint-validation')return{progressivePaintValidation:c=>c.testReject?'tiny rejected carrier':undefined};
  if(id==='./progressive-native-signature')return{nativePaintSignature:()=> 'tiny'};
  if(id==='./frozen-paint-ids')return{FROZEN_PAINT_IDS:new Set()};
  throw Error('Unexpected progressive fixture dependency '+id);
 });
 imports['./progressive-paint']=progressive;
 const captureModule='../../../safety/render-runtime/resident-capture';
 imports[captureModule]={createResidentCaptureOwnership,createResidentCaptureRuntime:factories.createResidentCaptureRuntime,...imports[captureModule]};
 for(const[id,override]of Object.entries(dependencyOverrides))imports[id]={...(imports[id]??{}),...override};
 const noOpReport=()=>({enabled:false,reason:'tiny no-op',maskedVertices:0,maskedTriangles:0});
 function imported(name){
  if(name==='paintBoxOutsideClip')return()=>false;if(name==='paintRunIntersectsVisible')return()=>true;if(name==='pruneOwner6307Fragment')return text=>text;if(name==='uploadFacadeLayouts')return()=>{};if(name==='withSceneSolarShadowReceiver')return(_gl,_matrix,draw)=>draw();
  if(name in factories)return factories[name];
  if(name==='FROZEN_PAINT_IDS')return new Set();if(name==='DESCRIPTION_BINDINGS')return[];
  if(name==='SOURCE_SHADOW_VECTOR')return[1,1];if(/GLSL|SOURCE_SHA/.test(name))return'';
  if(/^appendF\d+DerivedDisplay$/.test(name))return sourceRows;
  if(name==='appendF260AcceptedRestore')return rows=>({components:rows,stats:emptyStats()});
  if(name==='applyF018S036Compatibility')return(_rows,_paint,_frames,_plan,current)=>current;
  if(/^apply/.test(name)||name==='f260AcceptedRestoreBaseMaterials')return noOpReport;
  if(/^is|Identity$|Discard$|Intersects/.test(name))return()=>false;
  if(/Certificate|Readback/.test(name))return()=>null;
  if(name==='nativePaintSignature')return()=> 'tiny';
  return()=>{throw Error('Unspecified tiny renderer dependency: '+name);};
 }
 const moduleCache=new Map();
 // An ESM import binding is one stable value: the transpiled module reads it again
 // on every use, so each tiny substitute is created once per module and name
 // (identity matters, e.g. prepared-source recipes compare inputs with Object.is).
 const dependency=id=>{if(imports[id])return imports[id];if(!moduleCache.has(id))moduleCache.set(id,new Proxy({}, {get(target,name){if(!Reflect.has(target,name))Reflect.set(target,name,imported(String(name)));return Reflect.get(target,name);}}));return moduleCache.get(id);};
 const overrideDependency=(id,exports)=>Object.assign(dependency(id),exports);
 const rendererModule=evaluate(rendererSource,dependency);
 // This tiny owner boundary gives the actual renderer a distinct construction
 // input. The renderer, rather than the test, chooses the retirement stage.
 const ownerRuntime={hasPreparedCertificateGroup:(scope,key)=>key==='tiny:owner'&&preparedCertificateScopes.has(scope)&&!scope.stats.disposed,hasPreparedBatchCertificates:scope=>preparedCertificateScopes.has(scope)&&!scope.stats.disposed,createBatchScope:newScope,async prepareBatchCertificates(scope,rows,signal){if(!rows.length)return;await scope.prepare([constructionResource],signal);scope.memo(constructionMemo,()=>scope.borrow(constructionResource,value=>({input:value})));preparedCertificateScopes.add(scope);events.push({kind:'certificates',scope});},retireBatchConstruction(scope){assert(preparedCertificateScopes.has(scope));scope.retirePrepared([constructionResource],[constructionMemo]);events.push({kind:'construction-retire',scope});},serializeBremenHeldSourceReadback:()=>null,serializeBremenWholeDisplayCertificate:()=>null};
 // Like the manager, each nonempty prepared batch arrives with authoritative chunk
 // input (one page-store source lease per row set). A test that passes its own
 // chunk input (or null for none) keeps it; empty batches carry none.
 const create=()=>{const renderer=rendererModule.createBuildingMeshRenderer(map,'bremen',{ownerRuntime:ownerRuntimeOverride??ownerRuntime,nativeLeafSHA:()=> 'tiny-leaf',clock:()=>1,...rendererOptions}),prepare=renderer.prepareBatches;renderer.prepareBatches=(input,signal,wait,admission,scope,demand,chunk)=>prepare(input,signal,wait,admission,scope,demand,chunk===undefined&&input.length?chunkInput(input):chunk??undefined);return renderer;};
 const configuration=()=>events.filter(e=>['partition','base','source-description','city-fragment'].includes(e.kind));
 const commit=(r,b,g)=>r.setBatches(b.input,g,...Array(9).fill(undefined),b);
 const layouts=new Map(),constants=['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','ARRAY_BUFFER_BINDING','VERTEX_ARRAY_BINDING','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','BUFFER_SIZE','VERTEX_ATTRIB_ARRAY_BUFFER_BINDING','VERTEX_ATTRIB_ARRAY_ENABLED','VERTEX_ATTRIB_ARRAY_SIZE','VERTEX_ATTRIB_ARRAY_STRIDE','VERTEX_ATTRIB_ARRAY_TYPE','VERTEX_ATTRIB_ARRAY_NORMALIZED','VERTEX_ATTRIB_ARRAY_INTEGER','VERTEX_ATTRIB_ARRAY_DIVISOR','VERTEX_ATTRIB_ARRAY_POINTER'];
 const gl=Object.fromEntries(constants.map((v,i)=>[v,i+1]));Object.assign(gl,{
  // A tiny GPU that completes submitted work at once: the page chunk store's
  // nonblocking retirement fence is already signaled at its next collect.
  SYNC_GPU_COMMANDS_COMPLETE:0x9117,ALREADY_SIGNALED:0x911A,TIMEOUT_EXPIRED:0x911B,CONDITION_SATISFIED:0x911C,WAIT_FAILED:0x911D,fenceSync:()=>({fence:++serial}),clientWaitSync:()=>gl.ALREADY_SIGNALED,deleteSync(){},flush(){},
  UNIFORM_BUFFER:104,UNIFORM_BUFFER_BINDING:105,MAX_UNIFORM_BUFFER_BINDINGS:106,INVALID_INDEX:0xFFFFFFFF,VERTEX_SHADER:100,FRAGMENT_SHADER:101,COMPILE_STATUS:102,LINK_STATUS:103,NO_ERROR:0,OUT_OF_MEMORY:0x0505,INVALID_OPERATION:0x0502,getError(){errorReads++;return control.errors.shift()??gl.NO_ERROR;},isContextLost:()=>control.lost,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),deleteVertexArray:v=>layouts.delete(v),deleteBuffer:b=>{deletedBuffers.add(b);buffers.delete(b);},deleteProgram:p=>deletedPrograms.push(p),createShader:type=>({type,id:++serial}),shaderSource(shader,text){sources.push({phase,text});shader.text=text;},compileShader(){},attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(){},createProgram:()=>({program:++serial}),getExtension:()=>null,getProgramParameter:()=>true,getShaderParameter:()=>true,getProgramInfoLog:()=>'',getShaderInfoLog:()=>'',deleteShader(){},
  bindVertexArray:v=>{vao=v;},bindBuffer:(target,b)=>{if(target===gl.UNIFORM_BUFFER)uniform=b;else if(target===gl.ARRAY_BUFFER)array=b;else element=b;},getParameter:k=>k===gl.MAX_UNIFORM_BUFFER_BINDINGS?24:k===gl.UNIFORM_BUFFER_BINDING?uniform:k===gl.ARRAY_BUFFER_BINDING?array:vao,
  // The actual Rathaus masks keep their mask table in a uniform buffer: that
  // binding and its data are recorded apart from vertex/index uploads.
  bindBufferBase(target,index,b){if(target===gl.UNIFORM_BUFFER){uniform=b;uniformIndexed.set(index,b);}},getIndexedParameter:(target,index)=>target===gl.UNIFORM_BUFFER_BINDING?uniformIndexed.get(index)??null:null,getUniformBlockIndex:()=>0,uniformBlockBinding(){},
  bufferData(target,data){if(target===gl.UNIFORM_BUFFER){uniformUploads.push({buffer:uniform,bytes:data.byteLength});uniformSizes.set(uniform,data.byteLength);return;}attempt++;control.onUpload?.();const buffer=target===gl.ARRAY_BUFFER?array:element;uploads.push({buffer,data,values:Array.from(data)});buffers.set(buffer,new data.constructor(data));if(control.failUploadAt===attempt)throw Error('tiny replacement upload failure');if(control.errorUploadAt===attempt)control.errors.push(control.errorCode);if(control.lostUploadAt===attempt)control.lost=true;},bufferSubData(_target,offset,data){subUploads.push({buffer:array,offset,data,values:Array.from(data)});const existing=buffers.get(array);assert(existing,'state sub-upload targets an allocated buffer');assert(Number.isSafeInteger(offset)&&offset>=0&&offset+data.byteLength<=existing.byteLength,'state sub-upload stays inside the allocated buffer');new Uint8Array(existing.buffer,existing.byteOffset+offset,data.byteLength).set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));},
  getAttribLocation:(_p,name)=>({'a_position':0,'a_normal':1,'a_color':2,'a_selected':3,'a_paint_frame':4,'a_paint_family':5,'a_progressive_color':6,'a_s402_frame':4,'a_s402_alpha':6})[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(index,size,type,normalized,stride,offset){if(!layouts.has(vao))layouts.set(vao,new Map());layouts.get(vao).set(index,{buffer:array,size,type,normalized,stride,offset});},getUniformLocation:()=>null,isEnabled:()=>false,useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},uniformMatrix4fv(){},uniform1f(){},uniform1i(){},uniform2f(){},uniform3f(){},drawElements(_mode,count,_type,offset){draws.push({count,offset});},
  getVertexAttrib(index,k){const a=layouts.get(vao)?.get(index);return k===gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING?a?.buffer:k===gl.VERTEX_ATTRIB_ARRAY_ENABLED?!!a:k===gl.VERTEX_ATTRIB_ARRAY_SIZE?a?.size:k===gl.VERTEX_ATTRIB_ARRAY_STRIDE?a?.stride:k===gl.VERTEX_ATTRIB_ARRAY_TYPE?a?.type:k===gl.VERTEX_ATTRIB_ARRAY_NORMALIZED?a?.normalized:k===gl.VERTEX_ATTRIB_ARRAY_INTEGER?false:0;},getVertexAttribOffset:index=>layouts.get(vao)?.get(index)?.offset??0,getBufferParameter:target=>target===gl.UNIFORM_BUFFER?uniformSizes.get(uniform)??0:buffers.get(target===gl.ARRAY_BUFFER?array:element)?.byteLength??0,
  getBufferSubData(target,offset,out){const data=buffers.get(target===gl.ARRAY_BUFFER?array:element);assert.ok(data,'diagnostic must read an existing allocation');new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(new Uint8Array(data.buffer,data.byteOffset+offset,out.byteLength));},
 });
 // The renderer packs only authoritative manager chunk input: this runtime's page
 // store (the one its geometry owners and masks also use), bound to this context,
 // holds a ready source lease per prepared row set, exactly the
 // shape a manager hands to prepareBatches (one group per set, one cohort).
 const page={store:runtime.chunkResourceStore.getPageChunkResourceStore()};runtime.chunkResourceStore.bindChunkResourceContext(gl,page.store);
 const chunkSources=[];let chunkSerial=0;
 function chunkInput(rows){
  const contentKey=JSON.stringify(['tiny-bremen-source-v1',++chunkSerial,rows.map(c=>[c.objectId,c.partId])]),cohort=JSON.stringify(['tiny-bremen-publication-v1',contentKey]),origin=rows[0].origin;
  const source=page.store.acquire({contentKey,role:'source',allowRecent:false,estimate:{category:'metadata',bytes:256,precision:'estimate',label:'tiny Bremen source'},produce:()=>({components:rows}),costs:value=>({category:'metadata',bytes:256,precision:'estimate',identity:value})});chunkSources.push(source);
  return{store:page.store,groups:[{contentKey,components:rows,parents:[source],frame:{origin,unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority:JSON.stringify(['tiny-source-frame-v1',contentKey,origin])},cohortKeys:[cohort],materialAuthority:'tiny-material',recipeAuthority:'tiny-recipe',selectedLOD:'tiny'}],cohorts:[{key:cohort,members:[contentKey],authority:'tiny-publication'}]};
 }
 function releaseChunkSources(){for(const source of chunkSources.splice(0))source.release();}
 // GPU chunk meshes are page-store resources (shared and kept as recent cache),
 // not renderer-private allocations. After a renderer is destroyed and the
 // manager released its chunk sources, every buffer still alive must be a chunk
 // resource charged exactly on the page ledger, and every remaining page entry
 // must be evictable recent cache, not pinned by a lease the renderer or its
 // dependency chain forgot to release. The store's forced destroy is not used to
 // prove that: it releases live leases too.
 // Evicting the recent set retires those entries; a retired chunk releases its
 // dependency lease on a parent only at collect, and that parent then becomes
 // recent itself, so one pass drains one dependency level. Each pass must shrink
 // the store; a pass without progress means a live lease still pins an entry.
 // A suite with its own buffer observations passes that map.
 function drainPage(live=buffers){
  releaseChunkSources();page.store.collectRetired();
  const bytes=[...live.values()].reduce((n,data)=>n+data.byteLength,0);
  assert.equal(bytes,page.store.stats.budget.categories['gpu-buffer']?.bytes??0,'every GPU buffer left after the renderer is a page-ledger chunk resource');
  const shape=()=>{const s=page.store.stats;return JSON.stringify({resources:s.resources,gpu:s.gpu,cpu:s.cpu,recent:s.recent,roles:s.roles,retiring:s.retiring,buffers:live.size,gpuBytes:s.budget.categories['gpu-buffer']?.bytes??0});};
  for(let pass=0;page.store.stats.resources;pass++){
   const before=page.store.stats.resources;page.store.evictRecent();page.store.collectRetired();
   assert.ok(page.store.stats.resources<before,'eviction pass '+pass+' made no progress: a remaining page entry is pinned by a live lease, not recent cache '+shape());
  }
  assert.equal(live.size,0,'evicting the recent cache deletes every remaining buffer '+shape());
  assert.equal(page.store.stats.budget.categories['gpu-buffer']?.bytes??0,0,'no GPU bytes stay charged after the recent cache is evicted');
  page.store.destroy();
 }
 function render(renderer){const unit=2*Math.PI*6378137*Math.cos(53*Math.PI/180),ax=(8+180)/360,ay=(1-Math.log(Math.tan(Math.PI/4+53*Math.PI/360))/Math.PI)/2;renderer.layer.render(gl,[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-ax*unit,0,ay*unit,1]);}
 function pump(renderer,{until=()=>!renderer.stats.geometryPreparation.pending&&renderer.getDrawReadiness().ready,maxSteps=160}={}){for(let step=0;step<maxSteps;step++){render(renderer);const next=timers.entries().next().value;if(next&&!control.paused){timers.delete(next[0]);next[1]();}if(until())return;}throw Error('Bremen fixture did not settle: '+JSON.stringify(renderer.stats.geometryPreparation));}
 // Chunk-store productions resolve through promises between scheduler steps, so a
 // renderer that packs page-store chunks settles only when each step also yields
 // its microtasks (same frames and timers as pump, no added deadline).
 async function settle(renderer,predicate){const until=predicate??(()=>!renderer.stats.geometryPreparation.pending&&renderer.getDrawReadiness().ready);for(let step=0;step<160;step++){render(renderer);const next=timers.entries().next().value;if(next&&!control.paused){timers.delete(next[0]);next[1]();}await new Promise(resolve=>setImmediate(resolve));if(until())return;}throw Error('Bremen fixture did not settle: '+JSON.stringify(renderer.stats.geometryPreparation));}

 // flush runs the same frames/timers as pump and also yields each step's
 // microtasks, because page-store chunk productions settle through promises.
 const flush=settle;
 return{viewport:viewportModule,environment,create,render,pump,flush,settle,timers,runtime,page,chunkInput,releaseChunkSources,drainPage,get lostBuffers(){return lostBuffers;},uniformUploads,programPlans,compileRequests,draws,uploads,buffers,deletedBuffers,sources,phaseEvents,newScope,scopes,clients,events,gpu,handlers,control,configuration,commit,gl,progressive,dependency,overrideDependency,resourceRefs:[resource,admissionsResource],constructionResource,ownerRuntime};
}

