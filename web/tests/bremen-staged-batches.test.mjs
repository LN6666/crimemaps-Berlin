import {resourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {constructionHarness,component} from './fixtures/bremen-renderer-construction-harness.mjs';
import {bulk70PreimportRows} from './support/f5bremen-bulk70-preimport.mjs';
import {createRuntimeLoader} from './support/fixtures-managers-a-runtime.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {RENDERER_RUNTIME_MODULES,RENDERER_RUNTIME_DEPENDENCIES,rendererRuntime} from './support/fixtures-managers-b-renderer-runtime.mjs';
import {inspectableRendererSource,inspectionRecorder,sceneArrays,residentArrayIdentity,assertSameResidentArrays,trackLiveBuffers} from './support/f6bremen-renderer-inspect.mjs';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
const rendererFile=path.join(web,'src/painted/bremen/safety/building-mesh-renderer.ts'),managerFile=path.join(web,'src/painted/bremen/safety/three-dimensional-map.ts');
const [rendererText,managerText,scopeText,viewportText]=await Promise.all([readFile(rendererFile,'utf8'),readFile(managerFile,'utf8'),readFile(path.join(web,'src/safety/frozen-data-scope.ts'),'utf8'),readFile(path.join(web,'src/safety/viewport-request.ts'),'utf8')]);
const rendererAst=ts.createSourceFile(rendererFile,rendererText,ts.ScriptTarget.Latest,true),managerAst=ts.createSourceFile(managerFile,managerText,ts.ScriptTarget.Latest,true);
const transpile=text=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
// frozen-data-scope.ts imports only the page ledger's error class (01:50 fixture item): the actual
// resource-budget module of one page runtime is bound; any other runtime import is still refused.
const scopeModule={exports:{}};Function('require','module','exports',transpile(scopeText))(createRuntimeLoader().scopeRequire('Bremen staged-batches scope'),scopeModule,scopeModule.exports);
const {createFrozenDataScope}=scopeModule.exports;
function node(ast,name){let found,rank=0;function visit(n){const score=ts.isFunctionDeclaration(n)?3:ts.isMethodDeclaration(n)||ts.isVariableDeclaration(n)?2:ts.isPropertyAssignment(n)?1:0;if(score&&n.name?.getText(ast)===name&&score>=rank){found=n;rank=score;}ts.forEachChild(n,visit);}visit(ast);assert(found,'actual '+name);return found;}
function code(ast,name){const n=node(ast,name);return ts.isFunctionDeclaration(n)?n.getText(ast).replace(/^export\s+/,''):ts.isMethodDeclaration(n)?'function '+n.getText(ast):n.initializer.getText(ast);}
function evaluate(ast,name,values,fallback=()=>undefined){const js=transpile('('+code(ast,name)+')');return Function('env','with(env){return '+js+'}')(new Proxy(values,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k==='resourceContentKey'?resourceContentKey:k in o?o[k]:k in globalThis?globalThis[k]:fallback(k),set:(o,k,v)=>(o[k]=v,true)}));}
const noop=()=>{},pass=rows=>rows,no=()=>false,key=c=>c.objectId+'|'+c.partId;
const count=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
const stats=()=>({objects:1,vertices:3,triangles:1,originalVertices:3,sourceRetained:true,actualVisualAccepted:false,components:[]});
const row=id=>({city:'bremen',objectId:id,partId:id+'/part',origin:[8.8,53.07],componentGeometry:{type:'Polygon',coordinates:[]},sourceFeature:{type:'Feature',properties:{}},batches:[{positions:[0,0,0,1,0,0,0,1,0],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[.5,.5,.5]}]});
const signal=()=>new AbortController().signal,tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}
const REF={canonicalSHA256:'a'.repeat(64),file:'test/bremen-staging.ts',occurrence:0,codec:'json'};
function scopes(events){const all=[];let live=0,onRelease;return{all,set onRelease(fn){onRelease=fn;},get live(){return live;},create(){const id=all.length+1;const scope=createFrozenDataScope({async acquire(ref,requestSignal){requestSignal.throwIfAborted();assert.deepEqual(ref,REF);live++;let active=true;const value={id};return{borrow(read){assert(active);return read(value);},release(){if(!active)return;onRelease?.(id);active=false;live--;events.push('lease-release:'+id);}};}});scope.id=id;const retain=scope.retain.bind(scope),release=scope.release.bind(scope);scope.retain=()=>{events.push('retain:'+id);return retain();};scope.release=()=>{events.push('owner-release:'+id);release();};all.push(scope);return scope;}};}


// Current AST lifecycle functions execute against the production program owner,
// scheduler and geometry owner. The tiny GL driver only supplies hardware calls.
function runtimeModule(text,deps={}){const module={exports:{}},code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;Function('require','module','exports',code)(name=>{assert(name in deps,name);return deps[name];},module,module.exports);return module.exports;}
const [schedulerSource,programSource,geometrySource,programPlanSource,familySource,preparedSource]=await Promise.all(['src/safety/render-runtime/preparation-scheduler.ts','src/safety/render-runtime/program-preparation.ts','src/safety/render-runtime/resident-geometry.ts','src/painted/bremen/safety/bremen-prepared-program-plan.ts','src/safety/family-paint-program.ts','src/safety/prepared-source.ts'].map(file=>readFile(path.join(web,file),'utf8')));
// The page runtime graph (scheduler, program owner, completion, chunk store, ledger, resident geometry,
// family/prepared source) is loaded through its real relative imports, not a hand-maintained require map.
const pageRuntime=createSourceModules({allow:id=>['safety/render-runtime/pressure-availability','safety/render-runtime/diagnostic-snapshot','safety/render-runtime/preparation-scheduler','safety/render-runtime/program-preparation','safety/render-runtime/submitted-program-completion','safety/render-runtime/chunk-resource-store','safety/render-runtime/resource-budget','safety/render-runtime/resident-geometry','safety/render-runtime/resident-index-convention','safety/render-runtime/resident-normal-packing','safety/family-paint-program','safety/prepared-source','safety/render-runtime/shader-source-budget'].includes(id)});
const realRendererRuntime=rendererRuntime(createSourceModules({allow:id=>[...RENDERER_RUNTIME_MODULES,...RENDERER_RUNTIME_DEPENDENCIES].includes(id)}),'bremen');
const actualScheduler=pageRuntime.load('safety/render-runtime/preparation-scheduler'),actualPrograms=pageRuntime.load('safety/render-runtime/program-preparation'),actualGeometry=pageRuntime.load('safety/render-runtime/resident-geometry'),actualFamily=pageRuntime.load('safety/family-paint-program'),actualPreparedSource=pageRuntime.load('safety/prepared-source');
assert(schedulerSource&&programSource&&geometrySource&&familySource&&preparedSource);
const awaitUtf8Source=await readFile(path.join(web,'src/safety/utf8-byte-length.ts'),'utf8');
function lifecycleDriver(v){
 const turns=[],buffers=new Map();let serial=0,array,element,vao;
 const gl={NO_ERROR:0,ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,ARRAY_BUFFER_BINDING:3,VERTEX_ARRAY_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,VERTEX_SHADER:8,FRAGMENT_SHADER:9,LINK_STATUS:10,COMPILE_STATUS:11,
  getError:()=>0,isContextLost:()=>false,getParameter:key=>key===3?array:vao,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),bindVertexArray:value=>{vao=value;},bindBuffer:(target,value)=>{if(target===1)array=value;else element=value;},bufferData:(target,data)=>buffers.set(target===1?array:element,data.slice()),bufferSubData(){},deleteVertexArray(){},deleteBuffer:buffer=>buffers.delete(buffer),getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},createShader:type=>({type,id:++serial}),shaderSource(){},compileShader(){},createProgram:()=>({id:++serial,shaders:new Set()}),attachShader:(program,shader)=>program.shaders.add(shader),detachShader:(program,shader)=>program.shaders.delete(shader),bindAttribLocation(){},linkProgram(){},getExtension:()=>null,getProgramParameter:()=>true,getShaderParameter:()=>true,getProgramInfoLog:()=>'',getShaderInfoLog:()=>'',deleteShader(){},deleteProgram(){},
 };
 const turn=run=>{const previous=setTimeout;globalThis.setTimeout=work=>(turns.push(work),turns.length);try{return run();}finally{globalThis.setTimeout=previous;}};
 const owner=actualPrograms.createProgramPreparationOwner('bremen fixture',()=>v.map.triggerRepaint());
 const fragment='#version 300 es\nprecision highp float;\nout vec4 outColor;\nvec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}\nvoid main(){outColor=vec4(paintedFacade(vec3(1.),vec3(0.),vec3(0.),vec4(0.),0.),1.);}';
 const facade={paintProgramPartitionEnabled:()=>true,paintProgramFragment:(_key,_city,scope)=>{scope.borrow(v.fixtureResource,()=>{});return fragment;},facadePaintFragmentForCity:(_city,scope)=>{scope.borrow(v.fixtureResource,()=>{});return fragment;},facadePaintSpecializationForCity:city=>({city,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null,specialized:null}),describeFacadePaintSource:(city,source,kind,scope)=>{assert.ok(scope.stats.pins>0);return{city,fixture:true,sourceKind:kind,fragmentBytes:Buffer.byteLength(source,'utf8'),fullFragmentBytes:kind==='full'?Buffer.byteLength(source,'utf8'):null,specialized:null};},clearBremenPreparedProgramSources(){}};
 Object.assign(v,{...actualPrograms,...actualFamily,createBremenPreparedProgramPlan:runtimeModule(programPlanSource,{'./facade-paint-fragment':facade,'../../../safety/utf8-byte-length':runtimeModule(awaitUtf8Source),'../../../safety/prepared-source':actualPreparedSource}).createBremenPreparedProgramPlan,programPreparation:{compile:(...args)=>turn(()=>owner.compile(...args)),work:(...args)=>turn(()=>owner.work(...args)),prune:()=>turn(()=>owner.prune()),cancel:()=>turn(()=>owner.cancel()),contextLost:()=>turn(()=>owner.contextLost()),releaseProgram:(...args)=>owner.releaseProgram(...args),dispose:()=>owner.dispose(),get stats(){return owner.stats;}},geometryOwner:actualGeometry.createResidentGeometryOwner(),shadowGeometryOwner:actualGeometry.createResidentGeometryOwner(),captureDemands:new Map(),heldCaptureDemandKeys:new Set(),residentResetRevision:0,pendingCandidate:undefined,candidateFailure:undefined,candidateSequence:0,programPlanRevision:0,programMaterialIdentity:{},residentProgramPlan:undefined,matrix:undefined,transientResidentScope:undefined,surfaceStyle:undefined,baseSurfaceFragment:'tiny helper',surfaceFragment:undefined,VERTEX:'tiny vertex',fragment:(_helper,paint)=>paint,pruneOwner6307Fragment:value=>value,withResidentReflectionClip:value=>value,paintMode:()=>0,paintOverride:()=>0,geometryResidentUploaded:false,geometryUploadPending:false,shadowUploadPending:false,reflectionResidentRevision:0,mainGeometryProgramFailure:undefined,solarProgramFailures:new Map(),solarProgramRevision:0,gpuPreflightRequired:false,shadowGeometryRevision:0,shadowGeometryMain:undefined,shadowGeometryIndices:undefined,residentGPU:{beforeUpload:()=>true,published(){},released(){},detach(){v.fixtureEvents?.push('resident detach');}},program:undefined,texturedProgram:undefined,diffuseProgram:undefined,shadowProgram:undefined,shadowVao:undefined,shadowIndexBuffer:undefined,textureShaderAttempted:false,diffuseShaderAttempted:false,vao:undefined,vertexBuffer:undefined,indexBuffer:undefined,stateBuffer:undefined,paintBuffer:undefined,progressiveBuffer:undefined});
 const upload=v.geometryOwner.upload.bind(v.geometryOwner);v.geometryOwner.upload=(...args)=>{v.fixtureEvents?.push('upload');if(v.fixtureCalls)v.fixtureCalls.uploads++;return upload(...args);};
 function flush(progress=()=>v.prepareCandidate()){for(let i=0;i<150;i++){turn(progress);if(v.candidateFailure)throw Error(v.candidateFailure);if(!v.pendingCandidate&&!turns.length)return;turn(()=>turns.shift()?.());}assert.fail('Actual candidate did not drain');}
 return{gl,buffers,flush,bind(){v.gl=gl;}};
}

function rendererFixture(){
 const events=[],registry=scopes(events),calls={reconstruction:0,materials:0,legacy:0};let v;
 const ownerRuntime={createBatchScope:()=>registry.create(),hasPreparedBatchCertificates:()=>false,hasPreparedCertificateGroup:()=>false,prepare(){calls.legacy++;throw Error('legacy prepare in batch path');},pin(){calls.legacy++;throw Error('legacy pin in batch path');},async prepareBatchCertificates(scope,components,requestSignal){events.push('certificates');assert.equal(components.at(-1).objectId,'F107');assert.equal(scope,v.stagingScope);requestSignal.throwIfAborted();if(v.destroyDuringCertificates)v.destroyed=true;}};
 const texture={setUploadSize:noop,setNeededMaterials:noop,setPageHidden:noop,detach:noop,destroy:noop};
 v={BREMEN_MATERIAL_SCOPE_CONSUMERS:[],ownerRuntime,city:'bremen',destroyed:false,enabled:true,pageHidden:false,generation:0,viewRevision:0,loaded:new Map(),sourceLoaded:new Map(),vertices:new Float32Array(),indices:new Uint32Array(),paintData:new Float32Array(),progressiveData:new Float32Array(),stateData:new Float32Array(),shadowIndices:new Uint32Array(),fixedShadowIndexBytes:0,birth:new Map(),seenBirth:new Set(),s434DrawableCounts:new Map(),solarShadowAdmittedKeys:new Set(),residentScopePins:new Map(),currentDataScope:undefined,selectedIdentity:undefined,materialAnchor:undefined,vertexCap:10000,key,gl:undefined,partitionPrograms:new Map(),partitionFailures:new Map(),geometryUploadRevision:0,partitionRuns:[],map:{getCenter:()=>({lng:8.8,lat:53.07}),off:noop,triggerRepaint:noop},document:{removeEventListener:noop},windowTexture:texture,diffuseTexture:texture,immutableAltesSourceReadback:{destroy:noop},captureRuntime:{invalidate:noop},programPreparation:{cancel:noop,contextLost:noop,releaseProgram:noop,dispose:noop},residentGPU:{released:noop,detach:noop},rathausProxyMasks:{configure:noop,detach:noop},createRathausProxyMasks:()=>({configure:noop,detach:noop}),residentMaterialStyles:[],pendingResidentRollback:undefined,residentRollbackScope:undefined,residentRollbackMasks:undefined,partitionEnabled:false,geometryUploadFailure:undefined,geometryResidentUploaded:false,retryResidentUpload:false,shadowMask:{release:noop},nativeLeafSHA:()=> 'leaf',sceneSunInstant:0,
  async prepareBremenProgressiveAdmissions(input,requestSignal,scope){v.stagingScope=scope;events.push('admissions-prepare');await scope.prepare([REF],requestSignal);},
  async prepareOwnerRecoveredSourceComponents(input,requestSignal,wait,scope){v.stagingScope=scope;events.push('recovery-prepare');await scope.prepare([REF],requestSignal);if(v.recoveryGate)await v.recoveryGate.promise;requestSignal.throwIfAborted();},
  scopeOriginal_ownerRecoveredSourceComponents(input,scope){scope.borrow(REF,noop);if(input.some(c=>key(c)===key(row('recovered'))))return input;events.push('recover');return[...input,row('recovered')];},
  validate(c,city){events.push('validate:'+c.objectId);assert.equal(c.city,city);},
  async prepareBremenOwnerReconstructionComponents(input,requestSignal,wait,scope,leaf,runtime){events.push('reconstruct');calls.reconstruction++;assert.equal(scope,v.stagingScope);assert.equal(leaf,v.nativeLeafSHA);assert.equal(runtime,ownerRuntime);requestSignal.throwIfAborted();return{components:[...input,row('owner-display')],stats:stats()};},
  async prepareRoot500DerivedDisplays(components,city,admission,requestSignal,scope){events.push('derived-prepare');assert.equal(components.at(-1).objectId,'owner-display');assert.equal(city,'bremen');assert.equal(admission,v.expectedAdmission);assert.equal(scope,v.stagingScope);requestSignal.throwIfAborted();},
  ownerRecoveredSourceComponents(){throw Error('setBatches repeated source recovery');},ownerReconstructionComponents(){throw Error('setBatches repeated owner reconstruction');},ownerReconstructionIdentity:no,
  infillF288ClipCoplanarFacilityRoofs:components=>components,bremenScopedCall:(fn,args,scope)=>fn(...args,scope),
  async prepareBremenModuleResources(scope,components,requestSignal){events.push('materials-prepare');assert.equal(components.at(-1).objectId,'F107');assert.equal(scope,v.stagingScope);requestSignal.throwIfAborted();if(v.failPrepare)throw Error('controlled resource preparation failure');},
  fitOwnerDisplayBudget:(components,_cap,cost)=>({components,vertices:cost.vertices,indices:cost.indices,diagnostic:{fixture:true}}),acceptPaintComponent:()=>true,sourceRoleBatchIncluded:()=>true,s434AggregateBatchIncluded:()=>true,f260CanopyDisplay267:components=>({held:[],drawable:components}),exactNativePartDisplay:components=>({held:[],drawable:components}),appendF260AcceptedRestore:components=>({components,stats:{...stats(),objects:0,vertices:0,triangles:0}}),f260AcceptedRestoreBaseMaterials:noop,
  progressivePaintData(components){assert.equal(v.currentDataScope,v.stagingScope);events.push('paint');return new Float32Array(count(components)*4).fill(.25);},facadePaintData(components){assert.equal(v.currentDataScope,v.stagingScope);return new Float32Array(count(components)*5).fill(.5);},ownerReconstructionBaseMaterials(components){events.push('materials');calls.materials++;if(v.failMaterials)throw Error('controlled partial materials commit');if(components.length)v.currentDataScope.borrow(REF,noop);},
  sceneSolarLight:()=>({}),merc:origin=>[...origin],unit:()=>1,isFacadeLandmark:no,isSourceOnlyGlassRoof:no,sourceRoleDisplayProfile:()=>undefined,paintProgramPartitionEnabled:()=>true,paintProgramFragment:()=> 'exact scoped base fragment',facadePaintFragmentForCity:()=> 'exact scoped facade fragment',facadePaintSpecializationForCity:()=>({fixture:true}),readBremenProgressivelyPainted:()=>false,progressiveRenderView:()=>Object.freeze([]),getProgressivePaintDiagnosticsView:()=>({state:"available",appliedComponents:Object.freeze([]),rejectedAdmissions:Object.freeze([])}),getProgressivePaintDiagnostics:()=>({state:'available',appliedComponents:[],rejectedAdmissions:[]}),
  retireUnloadedBirths:noop,syncFacadeResources:noop,admitShadow:noop,updateSolarShadowIndices:noop,paintSelection:noop,releaseSolarDepth:noop,releaseShadowGPU:noop,upload(){events.push('upload');v.finishResidentUpload();},invalidateMatrix(){v.matrix=undefined;},paintCamera:noop,repaintPaint:noop,move:noop,contextRestored:noop,
 };
 for(const stage of ['F068','F075','F082','F107'])v['scopeOriginal_append'+stage+'DerivedDisplay']=(components,_city,_admission,scope)=>{events.push(stage);assert.equal(scope,v.stagingScope);return[...components,row(stage)];};
 // Names the renderer imports from the page runtime modules (chunk input,
 // packing/residency, store, budgets) resolve to the actual modules of the
 // same page runtime graph, never to a double.
 const runtimeImport=name=>{for(const node of rendererAst.statements){if(!ts.isImportDeclaration(node)||node.importClause?.isTypeOnly)continue;const module=realRendererRuntime(node.moduleSpecifier.text);if(!module)continue;for(const element of node.importClause?.namedBindings?.elements??[])if(!element.isTypeOnly&&element.name.text===name)return module[(element.propertyName??element.name).text];}return undefined;};
 const fallback=name=>{const real=runtimeImport(String(name));if(real!==undefined)return real;if(/Identity$|CarrierIdentity$/.test(String(name)))return no;if(/^apply/.test(String(name)))return noop;if(/Reconstruction|Reframe|Repaint/.test(String(name)))return components=>({components,stats:stats()});if(/^[A-Z][A-Z0-9_]+$/.test(String(name)))return{models:[],sourceAuthoritySHA256:'fixture'};return undefined;};
 v.fixtureResource=REF;v.fixtureEvents=events;const driver=lifecycleDriver(v);
 for(const name of ['mainVisibilityCache', 'mainProgramRevisitEligible', 'releaseOwnedProgram', 'releaseInactivePaintProgram', 'ownerCommitStep', 'snapshotResident', 'packCandidate', 'programPlanScope', 'releaseCandidatePrograms', 'discardPendingCandidate', 'clearAbandonedCandidateFailure', 'candidateCurrent', 'publishCandidate', 'prepareCandidate', 'clearResidentCPU', 'finishResidentUpload', 'retainResidentBatchScope', 'releaseSupersededBatchScopes', 'configurePreparedPrograms', 'clearPreparedPrograms', 'clearProgressivePaintDiagnostics', 'releaseResidentOwnerRuntime', 'programReady', 'gpuReady', 'publishGeometry', 'uploadPreparedGeometry', 'prepareGeometryUpload', 'upload', 'retireShadowGeometry', 'releaseShadowGPU', 'uploadShadow', 'compileGeometryProgram', 'pruneFamilySource', 'geometryProgramDemand', 'clearProgramSources', 'clearSettledProgramSources', 'mainPaintRuns', 'mainPaintKeys', 'capturePaintKeys', 'retainedPaintKeys', 'captureMaterialKeys', 'mainMaterialKeys', 'forgetCaptureRole', 'retireInactiveCaptureRoles', 'reconcileCaptureDemand', 'reconcileProgramDemand', 'releaseSolarPrograms', 'solarProgramDemandActive', 'solarResidentKeys', 'activeFamilyKey', 'familySource', 'releaseGPU', 'contextLost', 'setPageHidden', 'destroy', 'prepareBatches', 'setBatches'])v[name]=evaluate(rendererAst,name,v,fallback);
 const commit=prepared=>{driver.bind();v.setBatches(prepared.input,v.generation+1,...Array(9).fill(undefined),prepared);driver.flush();};
 return{v,events,registry,calls,commit,driver};
}

// Commit-path suites run the whole production renderer module in the
// construction harness, so setBatches, page-store chunk packing
// (packBremenChunkMaterials, installBremenChunkScene, releaseBremenChunks), scene*
// state, program preparation and resident geometry are the actual code on a tiny
// fenced GL bound to the page chunk store. Only module boundaries are doubles:
// the same staged events, scopes and owner boundary as rendererFixture above.
// A read-only inspection statement exposes closure state for the white-box
// assertions (support/f6bremen-renderer-inspect.mjs); this suite may set
// currentDataScope, as its startup case did before.
const inspectedRendererText=inspectableRendererSource(rendererText,{writable:['currentDataScope']});
// The whole renderer validates SOURCE rows with its own validate(): staged
// SOURCE rows (input and recovered) carry an OSM object id and a closed footprint.
// Derived display rows keep their stage names as identities.
const sourceRow=id=>({...row(id),objectId:'osm/way/'+(1+[...id].reduce((n,ch)=>(n*31+ch.charCodeAt(0))%999999937,7)),componentGeometry:{type:'Polygon',coordinates:[[[8.8,53.07],[8.801,53.07],[8.8,53.071],[8.8,53.07]]]}});
async function harnessRendererFixture(body){
 const events=[],registry=scopes(events),calls={reconstruction:0,materials:0,legacy:0},fixtureProducers=new WeakMap(),control={failMaterials:false,failPrepare:false,committing:false,organistenIdentity:undefined,expectedAdmission:undefined,recoveryGate:undefined,destroyDuringCertificates:false};let view,stagingScope;
 const ownerRuntime={createBatchScope:()=>registry.create(),hasPreparedBatchCertificates:()=>false,hasPreparedCertificateGroup:()=>false,prepare(){calls.legacy++;throw Error('legacy prepare in batch path');},pin(){calls.legacy++;throw Error('legacy pin in batch path');},async prepareBatchCertificates(scope,components,requestSignal){events.push('certificates');assert.equal(components.at(-1).objectId,'F107');assert.equal(scope,stagingScope);requestSignal.throwIfAborted();},retireBatchConstruction(){throw Error('uncertified staged batch has no construction to retire');}};
 const texture={setUploadSize:noop,setNeededMaterials:noop,setPageHidden:noop,setEnabled:noop,attach:noop,detach:noop,destroy:noop};
 const recorder=inspectionRecorder();
 // These bounded producer doubles derive their tiny output from the preceding
 // row. Keep that exact edge, rather than putting DISPLAY in the native input.
 const appendDisplay=(components,stage)=>{const parent=components.at(-1);assert.ok(parent,'fixture producer requires its preceding row');const output={...row(stage),origin:[...parent.origin]};fixtureProducers.set(output,{stage,parent});return[...components,output];};
 const derived=stage=>({['append'+stage+'DerivedDisplay']:(components,_city,_admission,scope)=>{events.push(stage);assert.equal(scope,stagingScope);return appendDisplay(components,stage);}});
 const h=constructionHarness(inspectedRendererText,{ownerRuntime,rendererOptions:{nativeLeafSHA:()=> 'leaf',windowTexture:texture,diffuseTexture:texture},dependencyOverrides:{...recorder.override,
  './progressive-paint':{async prepareBremenProgressiveAdmissions(_input,requestSignal,scope){stagingScope=scope;events.push('admissions-prepare');await scope.prepare([REF],requestSignal);},isProgressivelyPainted:no,progressiveAdmission:()=>undefined,progressivePaintRejections:()=>[],progressiveRenderStatus:()=>[],getProgressivePaintDiagnosticsView:()=>({state:'available',appliedComponents:Object.freeze([]),rejectedAdmissions:Object.freeze([])}),progressivePaintData(components){assert.equal(view.currentDataScope,stagingScope);events.push('paint');return new Float32Array(count(components)*4).fill(.25);}},
  './facade-paint-frame':{facadePaintData(components){assert.equal(view.currentDataScope,stagingScope);return new Float32Array(count(components)*5).fill(.5);}},
  './owner-reconstruction':{BREMEN_MATERIAL_SCOPE_CONSUMERS:[],
   async prepareOwnerRecoveredSourceComponents(_input,requestSignal,_wait,scope){stagingScope=scope;events.push('recovery-prepare');await scope.prepare([REF],requestSignal);if(control.recoveryGate)await control.recoveryGate.promise;requestSignal.throwIfAborted();},
   // One module export serves the staged recovery and the scoped wrapper; a commit
   // must never call it again.
   ownerRecoveredSourceComponents(input,scope){if(control.committing)throw Error('setBatches repeated source recovery');scope.borrow(REF,noop);if(input.some(c=>key(c)===key(sourceRow('recovered'))))return input;events.push('recover');return[...input,sourceRow('recovered')];},
   async prepareBremenOwnerReconstructionComponents(input,requestSignal,_wait,scope,leaf,runtime){events.push('reconstruct');calls.reconstruction++;assert.equal(scope,stagingScope);assert.equal(leaf(input[0]),'leaf');assert.equal(runtime,ownerRuntime);requestSignal.throwIfAborted();return{components:appendDisplay(input,'owner-display'),stats:stats()};},
   ownerReconstructionComponents(){throw Error('setBatches repeated owner reconstruction');},ownerReconstructionIdentity:no,
   ownerReconstructionBaseMaterials(components,_paint,_frames,scope){events.push('materials');calls.materials++;if(control.failMaterials)throw Error('controlled partial materials commit');if(components.length)scope.borrow(REF,noop);}},
  '../../root500/safety/root500-derived-display-data':{async prepareRoot500DerivedDisplays(components,city,admission,requestSignal,scope){events.push('derived-prepare');assert.equal(components.at(-1).objectId,'owner-display');assert.equal(city,'bremen');assert.equal(admission,control.expectedAdmission);assert.equal(scope,stagingScope);requestSignal.throwIfAborted();}},
  './bremen-recipe-stages':{bremenScopedCall:(fn,args,scope)=>fn(...args,scope),async prepareBremenModuleResources(scope,components,requestSignal){events.push('materials-prepare');assert.equal(components.at(-1).objectId,'F107');assert.equal(scope,stagingScope);requestSignal.throwIfAborted();if(control.failPrepare)throw Error('controlled resource preparation failure');}},
 }});
 // Modules without a harness entry keep the harness's tiny defaults for their
 // other exports: these doubles are assigned onto the same module objects.
 for(const stage of ['F068','F075','F082','F107'])h.overrideDependency('./owner-'+stage.toLowerCase()+'-derived-display',derived(stage));
 // The organisten predicate receives one identity plus the renderer's scope,
 // never a forwarded array index; a suite may observe the identity.
 h.overrideDependency('./organisten-runtime',{organistenIdentity(c,scope){assert.equal(arguments.length,2,'identity plus the scoped wrapper scope');assert.notEqual(typeof scope,'number','array index must not be forwarded as the optional scope');assert.equal(scope,view.currentDataScope);return control.organistenIdentity?control.organistenIdentity(c):false;}});
 // The tiny shader reads its scoped fragment from the staged scope's prepared
 // resource, as the former driver did, and describes it as a fixture source.
 const TINY_FRAGMENT='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}',describe=h.dependency('./facade-paint-fragment').describeFacadePaintSource,scopedFragment=scope=>{assert.ok(scope.stats.pins>0);scope.borrow(REF,noop);return TINY_FRAGMENT;};
 h.overrideDependency('./facade-paint-fragment',{paintProgramFragment:(_key,_city,scope)=>scopedFragment(scope),facadePaintFragmentForCity:(_city,scope)=>scopedFragment(scope),describeFacadePaintSource:(...args)=>({...describe(...args),fixture:true})});
 const liveBuffers=trackLiveBuffers(h.gl);
 await h.environment(async()=>{
  const r=h.create();view=recorder.latest;r.setEnabled(true);
  async function settle(){await h.settle(r,()=>!!r.stats.geometryPreparation.failure||!r.stats.geometryPreparation.pending&&r.getDrawReadiness().ready);const failure=r.stats.geometryPreparation.failure;if(failure)throw Error(failure);}
  // A commit binds the context first when no suite step did (the former driver's
  // bind); onAdd with no resident batch only records the context.
  const chunks=h.dependency('../../../safety/renderer-chunk-input');
  async function prepareBatches(input,requestSignal,wait,admission){
   const prepared=await r.prepareBatches(input,requestSignal,wait,admission,undefined,undefined,h.chunkInput(input));
   // Recovery is a SOURCE-producing boundary. Only its actual prepared output
   // enters SOURCE groups; each subsequent recipe owns its own output resource.
   const sourceInput=h.chunkInput(prepared.source),sourceKeys=new Set(prepared.source.map(key)),parents=[],proofs=[],receipts=[];
   try{
    for(const output of prepared.components){
     if(sourceKeys.has(key(output)))continue;
     const producer=fixtureProducers.get(output);assert.ok(producer,'DISPLAY must have an actual fixture producer');
     let source=producer.parent;const seen=new Set();while(!sourceKeys.has(key(source))){assert.ok(!seen.has(source),'fixture ancestry is acyclic');seen.add(source);const previous=fixtureProducers.get(source);assert.ok(previous,'fixture ancestry reaches a prepared SOURCE');source=previous.parent;}
     const authority=JSON.stringify(['staged-fixture-producer-v1',producer.stage,key(producer.parent),key(output)]);
     const parent=h.page.store.acquire({contentKey:authority,role:'candidate',allowRecent:false,estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:()=>({producer:producer.stage,source:key(producer.parent),component:output}),costs:value=>({category:'metadata',bytes:256,precision:'estimate',identity:value})});parents.push(parent);
     proofs.push({authority,components:[output],sources:[source],parents:[parent],frame:chunks.rendererChunkFrame(output.origin,authority)});
     receipts.push({objectId:output.objectId,partId:output.partId,sourcePartId:producer.parent.partId,sourceCarrier:{objectId:producer.parent.objectId},patchSHA256:authority});
    }
    assert.deepEqual(proofs.map(proof=>proof.components[0].objectId),['owner-display','F068','F075','F082','F107']);
    const held=chunks.bindRendererChunkDerivations(sourceInput,proofs);prepared.releaseChunkDependencies();prepared.chunkInput=held;prepared.releaseChunkDependencies=()=>{held.release();prepared.chunkInput=undefined;};
    prepared.stats.components=receipts;prepared.visibleDisplayKeys=chunks.rendererDerivedDisplayKeys(h.dependency('../../root500/safety/chunk-mesh-packing').orderVisibleChunkRows(prepared.source,prepared.visibleSourceKeys),prepared.components,receipts,proofs,()=>false,prepared.source);
    return prepared;
   }catch(error){prepared.release();throw error;}finally{for(const parent of parents)parent.release();}
  }
  async function commit(prepared){if(!view.gl)r.layer.onAdd({},h.gl);control.committing=true;try{r.setBatches(prepared.input,view.generation+1,...Array(9).fill(undefined),prepared);await settle();}finally{control.committing=false;}}
  const local={prepareBatches,releaseGPU:()=>view.releaseGPU(),contextLost:()=>view.contextLost(),initializeResidentGPU:(...args)=>view.initializeResidentGPU(...args),gpuReady:()=>view.gpuReady()},arrays=new Set(['vertices','indices','paintData','progressiveData','stateData']);
  const v=new Proxy({},{get(_o,k){if(k in local)return local[k];if(arrays.has(k))return sceneArrays(view)[k];if(k in view)return view[k];const value=r[k];return typeof value==='function'?value.bind(r):value;},set(_o,k,value){if(k==='failMaterials')control.failMaterials=value;else if(k==='organistenIdentity')control.organistenIdentity=value;else if(k==='expectedAdmission')control.expectedAdmission=value;else if(k==='currentDataScope')view.currentDataScope=value;else throw Error('Fixture does not write renderer state '+String(k));return true;}});
  // A body failure is reported as itself; the page drain runs after a passing body.
  // GPU chunk meshes are page-store resources kept as recent cache after their
  // last consumer: they are deleted when the page evicts them (each pass must make
  // progress; a pass without progress means a live lease still pins an entry).
  const evictPage=()=>{h.releaseChunkSources();h.page.store.collectRetired();for(let pass=0;h.page.store.stats.resources;pass++){const before=h.page.store.stats.resources;h.page.store.evictRecent();h.page.store.collectRetired();assert.ok(h.page.store.stats.resources<before,'eviction pass '+pass+' made no progress');}};
  try{await body({v,r,h,view,events,registry,calls,commit,evictPage,arrays:()=>residentArrayIdentity(view),gl:h.gl,buffers:h.buffers});}
  catch(error){try{r.destroy();}catch{}throw error;}
  r.destroy();h.drainPage(liveBuffers);
 });
}

test('prepareBatches is an actual constructor-level public API and manager static gates exclude legacy shard preparation',()=>{
 const factory=node(rendererAst,'createBuildingMeshRenderer');assert(factory.body.statements.some(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='prepareBatches'),'preparation cannot be hidden in a capture adapter');
 const publicReturns=factory.body.statements.filter(ts.isReturnStatement);assert(publicReturns.some(n=>ts.isObjectLiteralExpression(n.expression)&&n.expression.properties.some(p=>p.name?.getText(rendererAst)==='prepareBatches')),'actual renderer return exposes preparation');
 assert.equal(node(rendererAst,'setBatches').parameters.at(-1).name.getText(rendererAst),'prepared');
 const legacy=[];function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&/ownerRuntime!?$/.test(n.expression.expression.getText(managerAst))&&['prepare','pin'].includes(n.expression.name.text))legacy.push(n.getText(managerAst));ts.forEachChild(n,visit);}visit(node(managerAst,'shard'));assert.deepEqual(legacy,[]);
 const visible=node(managerAst,'visibleNow'),finallyBlocks=[];function finalizers(n){if(ts.isTryStatement(n)&&n.finallyBlock)finallyBlocks.push(n.finallyBlock.getText(managerAst));ts.forEachChild(n,finalizers);}finalizers(visible);assert(finallyBlocks.some(text=>/await\s+publication\.close\(\)/.test(text)),'visible request drains its shared publication lifecycle before final cleanup');assert(finallyBlocks.some(text=>text.includes('planningScope.release()')),'planning metadata has a finally release');
});

test('actual staged CPU preparation recovers SOURCE, reconstructs once, then prepares complete derived/material/certificate demand',()=>harnessRendererFixture(async f=>{
 const input=[sourceRow('native')],before=structuredClone(input),admission={fixture:'admission'},wait=p=>p;f.v.expectedAdmission=admission;const prepared=await f.v.prepareBatches(input,signal(),wait,admission);
 assert.equal(prepared.input,input);assert.deepEqual(input,before);assert.equal(prepared.originalSourceVertices,3);assert.equal(prepared.originalSourceIndices,3);assert.equal(prepared.sourceVertices,6);assert.equal(prepared.sourceLoaded.size,2);assert.equal(prepared.components.length,7);
 assert.deepEqual(f.events.filter(x=>!x.startsWith('validate:')),['admissions-prepare','recovery-prepare','recover','reconstruct','derived-prepare','F068','F075','F082','F107','materials-prepare','certificates']);
 await f.commit(prepared);prepared.release();assert.equal(f.calls.reconstruction,1);assert.equal(f.calls.materials,1);assert.equal(f.calls.legacy,0);assert.equal(f.v.sourceLoaded.size,2);assert.equal(f.v.loaded.size,7);assert.equal(f.v.vertices.length,189);assert.equal(f.v.stateData.length,21);assert.deepEqual([...f.v.indices],Array.from({length:21},(_,i)=>i));assert.equal(prepared.input,undefined);assert.equal(prepared.source.length,0);assert.equal(prepared.sourceLoaded.size,0);assert.equal(prepared.components.length,0);assert.equal(prepared.stats.components.length,0);assert.equal(prepared.scope.stats.disposed,false,'resident pin keeps borrowed data after staging release');f.v.setBatches([],f.v.generation+1);assert.equal(f.registry.live,0);
}));

test('actual startup binds the context without scoped builders and initializes from a nonempty prepared batch',()=>harnessRendererFixture(async f=>{
 const initialize=f.v.initializeResidentGPU,ready=f.v.gpuReady;
 initialize(f.gl,false);assert.equal(f.v.gl,f.gl);assert.equal(ready(),false);assert.equal(f.buffers.size,0);assert.equal(f.v.programPreparation.stats.pending,0);
 const scope=f.registry.create();await scope.prepare([REF],signal());f.v.currentDataScope=scope;
 initialize(f.gl,false);assert.equal(ready(),false,'A scope alone cannot replace its missing source plan');assert.equal(f.v.programPreparation.stats.pending,0);
 f.v.currentDataScope=undefined;scope.release();assert.equal(scope.stats.disposed,true);
 // The real candidate pipeline must admit nonempty geometry/source demand;
 // no fabricated empty preflight flag or placeholder GPU buffers are installed.
 const prepared=await f.v.prepareBatches([sourceRow('startup')],signal());assert.equal(prepared.scope.stats.resources,1);await f.commit(prepared);prepared.release();
 initialize(f.gl,false);assert.equal(ready(),true);assert(f.v.residentProgramPlan);assert.equal(f.v.currentDataScope,prepared.scope);assert.equal(prepared.scope.stats.disposed,false);
 assert.equal(f.buffers.size,5,'Only the actual resident owner allocates the five buffers');assert.equal(f.v.progressiveShaderSpecialization.city,'bremen');assert.equal(f.v.progressiveShaderSpecialization.fixture,true);assert.equal(f.v.progressiveShaderSpecialization.sourceKind,'partition');assert(f.v.progressiveShaderSpecialization.fragmentBytes>0);assert.equal(f.v.progressiveShaderSpecialization.fullFragmentBytes,null);assert.equal(f.v.progressiveShaderSpecialization.specialized,null);f.v.releaseGPU();assert.equal(ready(),false);f.v.setBatches([],f.v.generation+1);assert.equal(prepared.scope.stats.disposed,true);assert.equal(f.v.residentProgramPlan,undefined);assert.equal(f.v.configuredDataScope,undefined);f.evictPage();assert.equal(f.buffers.size,0);assert.equal(f.registry.live,0);
}));

test('failed, cancelled, and destroyed staging release their scopes without changing a resident generation',async()=>{
 for(const failure of ['resources','cancel','destroy']){const f=rendererFixture(),input=[row('native')],controller=new AbortController();if(failure==='resources')f.v.failPrepare=true;if(failure==='destroy')f.v.destroyDuringCertificates=true;if(failure==='cancel')f.v.recoveryGate=deferred();const work=f.v.prepareBatches(input,controller.signal);if(failure==='cancel'){await tick();controller.abort();f.v.recoveryGate.resolve();}await assert.rejects(work,failure==='resources'?/controlled resource preparation failure/:{name:'AbortError'});assert.equal(f.registry.all[0].stats.disposed,true);assert.equal(f.registry.live,0);assert.equal(f.v.loaded.size,0);assert.equal(f.v.sourceLoaded.size,0);assert.equal(f.v.residentScopePins.size,0);}
});

test('failed commits restore the resident generation, while hidden/context recovery preserve resident data and real empty/destroy release it',()=>harnessRendererFixture(async f=>{
 let predicateCalls=0;f.v.organistenIdentity=function(c){assert.equal(arguments.length,1,'array index must not be forwarded as the optional scope');assert.equal(c.city,'bremen');predicateCalls++;return false;};const a=await f.v.prepareBatches([sourceRow('A')],signal());await f.commit(a);assert(predicateCalls>0);a.release();const scopeA=a.scope;
 const sourceA=f.v.sourceLoaded,verticesA=f.arrays(),generationA=f.v.generation,b=await f.v.prepareBatches([sourceRow('B')],signal());f.v.failMaterials=true;await assert.rejects(f.commit(b),/partial materials commit/);b.release();assert.equal(f.v.residentScopePins.size,1);assert.equal(scopeA.stats.disposed,false);assert.equal(b.scope.stats.disposed,true,'failed generation releases after the actual snapshot restores resident fields');assert.equal(f.v.currentDataScope,scopeA);assert.equal(f.v.sourceLoaded,sourceA);assertSameResidentArrays(f.arrays(),verticesA);assert.equal(f.v.generation,generationA);
 f.v.failMaterials=false;const c=await f.v.prepareBatches([sourceRow('C')],signal());await f.commit(c);c.release();assert.equal(scopeA.stats.disposed,true);assert.equal(b.scope.stats.disposed,true);assert.equal(f.v.residentScopePins.size,1);const source=f.v.sourceLoaded,vertices=f.arrays();f.v.releaseGPU();f.v.contextLost();f.v.setPageHidden(true);f.v.setPageHidden(false);assert.equal(f.v.sourceLoaded,source);assertSameResidentArrays(f.arrays(),vertices);assert.equal(c.scope.stats.disposed,false);
 const cleared=[];f.registry.onRelease=id=>{assert.equal(f.v.sourceLoaded.size,0,'SOURCE references cleared before lease release');assert.equal(f.v.loaded.size,0,'DISPLAY references cleared before lease release');for(const name of ['vertices','indices','paintData','progressiveData','stateData'])assert.equal(f.v[name].length,0,name+' cleared before lease release');cleared.push(id);};
 f.v.setBatches([],f.v.generation+1);assert.equal(f.v.sourceLoaded.size,0);assert.equal(f.v.loaded.size,0);assert.equal(f.v.vertices.length,0);assert.equal(c.scope.stats.disposed,true);assert.equal(f.registry.live,0);assert.deepEqual(cleared,[c.scope.id]);
 const d=await f.v.prepareBatches([sourceRow('D')],signal());await f.commit(d);d.release();f.v.destroy();assert.equal(d.scope.stats.disposed,true);assert.equal(f.v.sourceLoaded.size,0);assert.equal(f.v.loaded.size,0);assert.equal(f.v.vertices.length,0);assert.equal(f.v.residentScopePins.size,0);assert.equal(f.registry.live,0);assert.deepEqual(cleared,[c.scope.id,d.scope.id]);
}));

function managerFixture({runtime=createRuntimeLoader(),page=runtime.createPageResources()}={}){
 const chunks=runtime.load(path.join(web,'src/safety/renderer-chunk-input.ts')),packing=runtime.load(path.join(web,'src/painted/root500/safety/chunk-mesh-packing.ts'));
 const events=[],registry=scopes(events),requests=[],commits=[],chunkRetains={live:0},native=sourceRow('left'),other=sourceRow('right'),shape={...sourceRow('shape-patch'),sourceFeature:native.sourceFeature,batches:native.batches},results=[[native],[other]],callbacks=[];let v;
 const plan=()=>({hiddenOutlines:[],groups:[],errors:[]});
 const renderer={prepareBatches(input,requestSignal,wait,admission,scope,demand,chunkInput){events.push('renderer-prepare');assert.deepEqual(demand,[native,other]);const source=packing.completeChunkSourceRows(chunkInput,input),held=v.retainRendererChunkInput(chunkInput),gate=deferred(),prepared={input,source,sourceLoaded:new Map(source.map(c=>[key(c),c])),components:[...input],stats:stats(),scope,signal:requestSignal,visibleSourceKeys:input.map(key),visibleDisplayKeys:input.map(key),chunkInput:held,releaseChunkDependencies(){if(!prepared.chunkInput)return;events.push('chunk-dependencies-release');held.release();prepared.chunkInput=undefined;},release(){events.push('prepared-release');prepared.releaseChunkDependencies();prepared.input=undefined;prepared.source=[];prepared.sourceLoaded=new Map();prepared.components=[];prepared.stats=stats();scope.release();}};requests.push({input,requestSignal,scope,prepared,resolve:()=>gate.resolve(prepared)});return gate.promise;},setBatches(input,generation,...args){events.push('setBatches');const prepared=args.at(-1);assert.equal(prepared.input,input);assert(prepared.components.length);commits.push({input,generation,prepared});},setEnabled(){events.push('enable');},
  // Publication state the manager reads before an initial repack: the double has
  // no drawn generation, so an initial repack never takes the duplicate-skip path.
  getRevision:()=>({generation:commits.at(-1)?.generation??0,viewRevision:0}),getDrawReadiness:()=>({ready:false,preparing:false}),isPickReady:()=>false};
 v={signal:signal(),ticket:1,revision:1,destroyed:false,suspended:false,city:'bremen',mobile:false,renderer,ownerRuntime:{createBatchScope:()=>registry.create(),prepare(){throw Error('legacy prepare');},pin(){throw Error('legacy pin');}},activePreparationScope:undefined,releaseAggregatePrepared:noop,
  current(requestSignal,ticket){requestSignal.throwIfAborted();assert.equal(ticket,v.revision);},THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:100000,mobile:100000},chosen:['left','right'].map((id,i)=>({id,tile_key:id,sha256:String(i+1).repeat(64),bytes:128,lod:1})),results,retainedShardCost:new WeakMap(results.map(r=>[r,100])),shadowByShard:new WeakMap(),ownerProfileByComponent:new WeakMap(),sourceLeafByFeature:new WeakMap(),manifestSHA:'index',manifest:{source_pbf_sha256:'pbf',city_boundary:{sha256:'boundary'},source_snapshot:'source'},options:{awaitPaintInitialization:p=>p,onNativeGroupDisplay:noop},
  async prepareBremenFunctions(scope,fns,input,requestSignal){events.push('merged-plan-prepare');assert.deepEqual(input,[native,shape,other]);await scope.prepare([REF],requestSignal);},bremenScopedCall:(fn,args,scope)=>fn(...args,scope),bremenAcceptedCohortSelection:{diagnostic:()=>({complete:true})},s434CohortSelection:{diagnostic:()=>({})},ownerShapePatchDisplayRows(input){events.push('shape-rows');return input.includes(native)&&!input.some(c=>key(c)===key(shape))?[...input,shape]:input;},ownerShapePatchMetadata:()=>({}),nativePartDisplayPlan:plan,verifiedInteriorSourceHolds:()=>[],sourceEdgeAssemblyDisplayPlan:plan,s020RelationOutlineDisplayPlan:plan,s020FullOriginalBatchRouteReady:()=>true,progressiveAdmission:()=>({geometrySignature:'signature'}),mergeShadowAdmissions:()=>undefined,partialGateDisplayPlan:()=>({}),s402ConnectorPlan:()=>({}),s036NorthCofacePlan:()=>({}),s240BaseCofacePlan:()=>({}),f151CrownPlan:()=>({}),
  // Commit state the manager now keeps per request: started CPU preparations
  // (awaited before the request ends), the chunk-input authority of the selected
  // sources, and the explicit-source staging of each registered draw. The renderer
  // double retains the real page-store input; cache dependencies are counted.
  pendingPreparations:new Set(),partial:false,selectedShardIds:[],lastError:undefined,lastHandoffGeneration:-1,bremenFiniteCohortDiagnostic:undefined,visibleRetainedEstimateBytes:0,sourceEdgeAssemblyDisplay:undefined,
  prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async(_components,requestSignal)=>{requestSignal.throwIfAborted();},
  ...chunks,...runtime.load(path.join(web,'src/painted/bremen/safety/bremen-display-derivations.ts')),
  resources:page.store,sourceCandidates:new Map(),sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),sourceOwnerKey:'bremen:staged-fixture',sourceAbsentPatches:[],stageExplicitSources(input,generation){events.push('stage-sources:'+generation);assert.ok(input?.groups.length,'publication retains concrete source groups');},
  retainRendererChunkInput(input){const held=chunks.retainRendererChunkInput(input);if(!held)return undefined;chunkRetains.live++;let live=true;const release=held.release;held.release=()=>{if(!live)return;live=false;chunkRetains.live--;release();};return held;},
  generation:0,lastPackedComponents:undefined,lastPackedAggregateProfile:undefined,lastPackedAggregateDiagnostic:undefined,duplicatePackSkips:0,sameStageComponents:()=>false,s434Aggregate:{packing:()=>undefined,update(_input,options){callbacks.push(options.onChange);}},map:{getBounds:()=>({getWest:()=>0,getSouth:()=>0,getEast:()=>1,getNorth:()=>1}),getZoom:()=>18},firstDrawPending:true,finished:true,drawn:async()=>{},announce:noop,
 };
 v.noAggregatePrepared=v.releaseAggregatePrepared;
 // Real ingress helpers bind each selected leaf to a budgeted page resource.
 // The tiny shape recipe shares its native input arrays, just as this boundary's
 // producer declares; it is not a separate unowned DISPLAY in sourceChunkInput.
 for(const name of ['sourceContentKey','sourceResourceKey','sourceResourceKeys','bindSourceContent','sourceChunkDemand','sourceChunkInput','sourceAbsentDisplay','bindDerivedChunkInput','retireChunkInput'])v[name]=evaluate(managerAst,name,v);
 const releaseSources=()=>{for(const lease of v.sourceCandidates.values())lease.release();v.sourceCandidates.clear();};
 const registerSource=(leaf,rows,detail)=>{const resourceKey=v.sourceResourceKey(leaf,detail),contentKey=v.sourceContentKey(leaf,detail),lease=page.store.acquire({contentKey:resourceKey,role:'candidate',allowRecent:false,estimate:{category:'metadata',bytes:256,precision:'estimate'},produce:()=>({contentKey,resourceKey,components:rows,recipeAuthority:JSON.stringify(['staged-shape-recipe-v1',rows.map(key)]),materialAuthority:'tiny-material',selectedLOD:detail?.resource.level??'tiny'}),costs:value=>({category:'metadata',bytes:256,precision:'estimate',identity:value})});assert.ok(lease.value,'synchronous fixture leaf is ready');v.sourceCandidates.set(resourceKey,lease);v.bindSourceContent(leaf,rows,resourceKey,detail);return lease;};
 for(let i=0;i<v.chosen.length;i++)registerSource(v.chosen[i],results[i]);
 const drainPage=()=>{releaseSources();page.store.collectRetired();while(page.store.stats.resources){const before=page.store.stats.resources;page.store.evictRecent();page.store.collectRetired();assert.ok(page.store.stats.resources<before,'manager fixture leaked a source or dependency lease');}assert.equal(page.store.budget.stats.totalBytes,0);};
 for(const name of ['scopeOriginal_prepareBremenAcceptedCohortSelection','scopeOriginal_partialGateDisplayPlan','scopeOriginal_s020RelationOutlineDisplayPlan','scopeOriginal_s020FullOriginalBatchRouteReady','scopeOriginal_progressiveAdmission'])v[name]=noop;
 const helperModule={exports:{}};let publicationClock=1000;Function('performance','module','exports',transpile(viewportText))({now:()=>publicationClock+=100},helperModule,helperModule.exports);
 let viewController=new AbortController();v.signal=viewController.signal;v.pageHidden=false;v.wantedMode='3d';
 v.resetPublication=()=>{viewController.abort();viewController=new AbortController();v.signal=viewController.signal;v.publication=helperModule.exports.createViewportRequestContinuation(()=>false).publication(v.signal,()=>{v.current(v.signal,v.ticket);if(v.pageHidden||v.wantedMode==='2d')throw new DOMException('Aborted','AbortError');});};v.resetPublication();
 Object.assign(v,{session:undefined,detailBindings:new Map(),adoptedDetailResources:new Map(),lastHandoffTicket:-1});
 for(const name of ['captureDetailSubset','validateDetail','adoptDetail','settleDetail'])v[name]=evaluate(managerAst,name,v);
 const commit=evaluate(managerAst,'commit',v,name=>/^[A-Z][A-Z0-9_]+$/.test(String(name))?[]:undefined);v.commit=()=>v.publication.finish(commit);
 return{v,events,registry,requests,commits,callbacks,native,other,shape,chunkRetains,registerSource,releaseSources,drainPage};
}

test('actual manager awaits the merged shape-patch batch, transfers cached scope ownership, and reuses preparation for aggregate repacks',async()=>{
 const f=managerFixture(),work=f.v.commit();await tick();assert.equal(f.requests.length,1);assert.deepEqual(f.requests[0].input,[f.native,f.other,f.shape]);assert.equal(f.commits.length,0);assert(!f.events.includes('enable'),'readiness cannot publish before CPU preparation');
 f.requests[0].resolve();await work;await tick();assert.equal(f.commits.length,1);assert.equal(f.requests[0].prepared.input,undefined,'fulfilled preparation promise drops its arrays');assert.equal(f.requests[0].scope.stats.disposed,false,'aggregate cache owns a scope pin');
 f.callbacks[0]('ready');await tick();assert.equal(f.requests.length,1,'ready repack must reuse prepared CPU outputs');assert.equal(f.commits.length,2);f.v.releaseAggregatePrepared();assert.equal(f.requests[0].scope.stats.disposed,true);assert.equal(f.commits[0].prepared.components.length,0,'cache release clears its aliasing arrays');assert.equal(f.registry.live,0);assert.equal(f.chunkRetains.live,0,'the cache release returns its retained chunk input');f.drainPage();
});

test('a superseded manager commit releases a late prepared result without publishing and allows the newest complete batch to win',async()=>{
 const f=managerFixture(),first=f.v.commit();await tick();f.v.resetPublication();const second=f.v.commit();await tick();assert.equal(f.requests.length,2);assert.equal(f.requests[0].requestSignal.aborted,true);f.requests[0].resolve();await assert.rejects(first,{name:'AbortError'});assert.equal(f.commits.length,0);assert.equal(f.requests[0].prepared.input,undefined,'late prepared references must be cleared even when current() rejects');assert.equal(f.requests[0].scope.stats.disposed,true);
 f.requests[1].resolve();await second;await tick();assert.equal(f.commits.length,1);f.v.releaseAggregatePrepared();assert.equal(f.registry.live,0);assert.equal(f.chunkRetains.live,0,'no superseded or cached chunk input stays retained');f.drainPage();
});


test('a retired manager cache release cannot erase the release hook for a newer resident preparation',async()=>{
 const f=managerFixture(),first=f.v.commit();await tick();f.requests[0].resolve();await first;const releaseFirst=f.v.releaseAggregatePrepared,oldScope=f.requests[0].scope;
 const next=f.v.commit();await tick();f.requests[1].resolve();await next;const releaseNext=f.v.releaseAggregatePrepared,nextScope=f.requests[1].scope;assert.equal(oldScope.stats.disposed,true);assert.notEqual(releaseNext,releaseFirst);releaseFirst();assert.equal(f.v.releaseAggregatePrepared,releaseNext);assert.equal(nextScope.stats.disposed,false);releaseNext();releaseNext();assert.equal(nextScope.stats.disposed,true);assert.equal(f.registry.live,0);assert.equal(f.chunkRetains.live,0,'each cache release returns exactly its own chunk input');f.drainPage();
});

test('actual manager source leases register cached detail without decoding, partial adoption preserves readers, and another level cannot reuse rows',async()=>{
 const loader=createRuntimeLoader(),page=loader.createPageResources();
 const {createBuildingDetailRuntime}=loader.load(path.join(web,'src/safety/building-detail-runtime.ts'));
 const {createWantedResourceLeases}=loader.load(path.join(web,'src/safety/viewport-request.ts'));
 const {buildingDetailSolarCoverageBounds}=loader.load(path.join(web,'src/safety/prospective-solar-projection.ts'));
 const hash=character=>character.repeat(64),asset=(name,character)=>({path:'/safety/buildings3d/'+name+'.json',sha256:hash(character),bytes:100});
 const makeIndex=(id,character)=>{const canonicalLeaf={...asset(id,character),id};return{schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'bremen',canonicalIndex:asset('index','1'),canonicalLeaf,
  bindings:{sourcePBFSHA256:hash('3'),boundarySHA256:hash('4'),compilerSHA256:hash('5'),sourceSnapshot:'tiny',materialSHA256:hash('6'),producerSHA256:hash('7'),protectionSHA256:hash('8'),sourceEquivalenceSHA256:hash('9')},
  components:[{objectId:'osm/way/1',partId:id,origin:[8,53],box:[0,0,0,1,1,1],protected:false}],
  near:{level:'near',asset:asset(id,character),geometrySHA256:hash('a'),vertices:6,triangles:2},
  variants:[{level:'coarse',asset:asset(id+'-coarse','b'),geometrySHA256:hash('c'),vertices:3,triangles:1,errors:[{componentIndex:0,errorM:.01,normalDeviationRad:0}]}]};};
 const documents=[makeIndex('left','2'),makeIndex('right','d')],pending=deferred(),reads=[],rows=[row('cached-native')];let near=false,releases=0;
 const runtime=createBuildingDetailRuntime({city:'bremen',resolveDetailIndex:async(_sha,leaf)=>documents.find(value=>value.canonicalLeaf.id===leaf.id),
  getDemands:()=>near?[{pass:'picking',maxErrorCssPx:1,maxErrorDrawingBufferPx:1,project:()=>undefined}]:[{pass:'main',maxErrorCssPx:1,maxErrorDrawingBufferPx:1,project:()=>({matrix:[.01,0,0,0,0,.01,0,0,0,0,0,0,0,0,0,1],viewport:{cssWidth:100,cssHeight:100,drawingBufferWidth:100,drawingBufferHeight:100}})}],
  readCanonical:async()=>{throw Error('Unexpected native decode');},readBytes:async()=>{throw Error('Unexpected detail decode');},
  async acquireSelected(resource){
   reads.push(resource);if(resource.level==='near')throw Error('uncached canonical acquisition');
   if(resource.descriptor.path.includes('right'))await pending.promise;
   const components=resource.descriptor.path.includes('left')?rows:[row('later-native')];
   const grant=page.store.acquire({contentKey:'detail-fixture:'+resource.key,role:'source',allowRecent:false,
    estimate:{category:'metadata',bytes:1024,precision:'estimate'},
    produce:()=>({raw:{schema_version:1,city:'bremen',components,decodedPayloadCost:{retainedPayloadEstimateBytes:512}}}),
    costs:value=>({category:'metadata',bytes:512,precision:'estimate',identity:value}),dispose(){}});
   await grant.ready;return{value:grant.value,retainResource:role=>grant.retain(role),release(){releases++;grant.release();}};
  }});
 const controller=new AbortController(),session=runtime.openSession({requestId:1,signal:controller.signal});
 const indices=await Promise.all(documents.map(document=>runtime.resolveDetailIndex(hash('1'),document.canonicalLeaf,{signal:controller.signal}))),resources=indices.map(index=>runtime.select(index).resource);
 assert.deepEqual(resources.map(resource=>resource.level),['coarse','coarse']);
 const leaves=documents.map((document,i)=>({...document.canonicalLeaf,tile_key:'tile-'+i})),bindings=indices.map((index,i)=>({index,resource:resources[i]}));
 const v={signal:controller.signal,ticket:1,chosen:leaves,detailBindings:new Map(leaves.map((leaf,i)=>[leaf,bindings[i]])),adoptedDetailResources:new Map(),lastHandoffTicket:-1,session,
  city:'bremen',manifestSHA:hash('1'),manifest:{source_pbf_sha256:hash('3'),city_boundary:{sha256:hash('4')},compiler_sha256:hash('5'),source_snapshot:'tiny'},sourceOwnerKey:'detail-fixture',
  options:{detailRuntime:runtime},resources:page.store,createWantedResourceLeases,buildingDetailSolarCoverageBounds,
  sourceContentByFeature:new WeakMap(),sourceResourceByFeature:new WeakMap(),sourceLeafByFeature:new WeakMap(),sourceDiagnostics:new Map(),retainedShardCost:new WeakMap(),shadowByShard:new WeakMap(),
  maxVertices:100,mobile:false,loadCount:0,THREE_D_DECODED_PAYLOAD_LIMITS:{desktop:100000,mobile:100000},ResourceBudgetExceededError:loader.resourceBudget.ResourceBudgetExceededError,
  async prepareBremenInfillOwnerRouteModules(input,requestSignal){assert.strictEqual(input,rows);requestSignal.throwIfAborted();},
  prepareInfillFrankfurtLowOfficeBulk70Reconstruction:async()=>{},prepareNonBerlinOwnerRoutes:async()=>{},prepareSourceRoleDisplay:async()=>{},ownerShapePatchProfile:()=>undefined,
  normalizeBuildingShard(){throw Error('A source lease hit must never decode');}};
 for(const name of ['sourceContentKey','sourceResourceKey','bindSourceContent','loadSourceContent','wantedSources'])v[name]=evaluate(managerAst,name,v);
 const descriptor=(leaf,detail)=>({leaf,detail,contentKey:v.sourceResourceKey(leaf,detail)}),coarseDescriptor=descriptor(leaves[0],bindings[0]);
 v.wantedSources.reconcile([coarseDescriptor]);
 const warm=runtime.openSession({requestId:0,signal:controller.signal});
 const warmShard=evaluate(managerAst,'shard',v);assert.strictEqual(await warmShard(leaves[0],controller.signal,warm,bindings[0]),rows);warm.finish();
 assert.equal(reads.length,1);assert.equal(reads[0].level,'coarse');reads.length=0;
 const shard=evaluate(managerAst,'shard',v);
 for(const name of ['captureDetailSubset','validateDetail','adoptDetail','settleDetail'])v[name]=evaluate(managerAst,name,v);
 assert.strictEqual(await shard(leaves[0],controller.signal,session,bindings[0]),rows);
 assert.equal(session.stats.cachedRegistrations,1);assert.equal(session.stats.acquisitions,0);assert.deepEqual(reads,[]);
 const later=session.acquireSelected(resources[1],{index:indices[1]});
 assert.equal(session.stats.acquisitions,1);assert.equal(session.stats.trackedResources,2);
 v.validateDetail([leaves[0].id]);v.adoptDetail([leaves[0].id],7);
 assert.equal(session.state.committed,true);assert.equal(session.state.generation,7);assert.equal(session.state.status,'adopted');assert.equal(session.stats.trackedResources,2,'partial adoption keeps the pending reader');
 assert.deepEqual([...v.adoptedDetailResources.keys()],[leaves[0].tile_key]);
 pending.resolve();await later;v.validateDetail(leaves.map(leaf=>leaf.id));v.adoptDetail(leaves.map(leaf=>leaf.id),8);
 await v.settleDetail(Promise.resolve(),{registered:true,generation:8,current:()=>true});
 assert.equal(session.state.status,'ready');assert.equal(releases,1);session.finish();assert.equal(session.stats.trackedResources,0);assert.equal(session.stats.sourceLeases,0);
 near=true;const next=runtime.openSession({requestId:2,signal:controller.signal}),nearBinding={index:indices[0],resource:runtime.select(indices[0]).resource};
 assert.notEqual(nearBinding.resource.key,resources[0].key);
 v.wantedSources.reconcile([coarseDescriptor,descriptor(leaves[0],nearBinding)]);
 // Source production belongs to the page store; the manager request propagates
 // production failure to its detail session, rather than shard acquiring there.
 await assert.rejects(shard(leaves[0],controller.signal,next,nearBinding).catch(error=>{next.fail(error);throw error;}),/uncached canonical acquisition/);
 assert.equal(reads.length,2);assert.equal(reads[1].level,'near');assert.equal(next.stats.cachedRegistrations,0);assert.equal(next.state.status,'failed-before-publication');next.finish();
 assert.strictEqual((await v.wantedSources.value(coarseDescriptor.contentKey,controller.signal)).components,rows,'failed new-level acquisition retains the existing source lease rows');
 assert.equal(v.sourceContentByFeature.get(rows[0].sourceFeature),v.sourceContentKey(leaves[0],bindings[0]));
 v.wantedSources.destroy();assert.equal(page.store.stats.resources,0,'no provider or parent source survives its last lease');
});

// drawn() now also synchronizes the published explicit SOURCE bindings and the
// required detail solar coverage of a ready generation: the actual manager
// functions run against this request's empty staged/published state.
function bindDrawnPublication(v,solar){
 Object.assign(v,{publishedExplicitGeneration:undefined,stagedExplicitGeneration:undefined,stagedExplicitCurrent:undefined,stagedExplicitSources:[],mainExplicitSources:new Map(),lastReadyGeneration:undefined,lastReadyState:undefined,drawReadiness:undefined,requiredSolarCoverageBounds:undefined,requiredSolarCoverageGeneration:undefined,publishedContentKeys:[],
  // A suite that publishes detail resources passes the actual solar projection.
  buildingDetailSolarCoverageBounds:solar?.buildingDetailSolarCoverageBounds??(()=>{throw Error('no detail resource is published by this fixture');}),mergeSceneSolarCoverageBounds:solar?.mergeSceneSolarCoverageBounds??(()=>{throw Error('no detail resource is published by this fixture');})});
 v.adoptedDetailResources??=new Map();v.selectedShardIds??=[];v.visibleRetainedEstimateBytes??=0;
 for(const name of ['explicitSourceMatches','synchronizePublishedExplicitSources','publishRequiredSolarCoverage'])v[name]=evaluate(managerAst,name,v);
}

test('actual manager draw fence rejects unregistered, old-generation and stale-current readiness and clears its original deadline on ready or abort while a crossed threshold keeps waiting',async()=>{
 const h=constructionHarness(),deadlines=[];
 const waitSource=await readFile(path.join(web,'src/safety/resident-draw-readiness.ts'),'utf8');
 const readiness=runtimeModule(waitSource,{'./visible-readiness-deadline':{pageIsHidden:()=>false,visibleReadinessDeadline(milliseconds,onTimeout){const entry={milliseconds,onTimeout,cancelled:false};deadlines.push(entry);return()=>{entry.cancelled=true;};}}});
 await h.environment(async()=>{
  const r=h.create();r.layer.onAdd({},h.gl);r.setEnabled(true);
  const renderResident=()=>r.layer.render(h.gl,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});
  const first=await r.prepareBatches([component(1)],signal());h.commit(r,first,1);first.release();await h.flush(r);renderResident();
  assert.equal(r.getDrawReadiness().ready,true,'the real renderer/context owner reached drawable readiness');
  const listeners=new Set(),map={on(event,listener){assert.equal(event,'render');listeners.add(listener);},off(event,listener){assert.equal(event,'render');listeners.delete(listener);},triggerRepaint(){},isMoving:()=>false};
  const v={map,renderer:r,revision:1,destroyed:false,suspended:false,pageHidden:false,wantedMode:'3d',waitForResidentDraw:readiness.waitForResidentDraw};
  bindDrawnPublication(v);v.current=evaluate(managerAst,'current',v);v.drawn=evaluate(managerAst,'drawn',v);
  const render=()=>{for(const listener of [...listeners])listener();};
  let active=true,settled=false;const target={registered:false,current:()=>active,generation:2},controller=new AbortController();
  const waiting=v.drawn(controller.signal,1,target).then(()=>{settled=true;});
  render();await Promise.resolve();assert.equal(settled,false,'old resident readiness cannot precede target registration');
  target.registered=true;render();await Promise.resolve();assert.equal(settled,false,'registered target still rejects the old ready generation');
  const second=await r.prepareBatches([component(2)],signal());h.commit(r,second,2);second.release();await h.flush(r);renderResident();assert.equal(r.getRevision().generation,2);assert.equal(r.getDrawReadiness().ready,true);
  active=false;render();await Promise.resolve();assert.equal(settled,false,'a drawable matching generation cannot satisfy a stale attempt');
  active=true;render();await waiting;assert.equal(settled,true);assert.equal(listeners.size,0);assert.equal(deadlines.length,1);assert.equal(deadlines[0].milliseconds,8000);assert.equal(deadlines[0].cancelled,true);
  const cancelled=new AbortController(),aborted=v.drawn(cancelled.signal,1,{registered:false,current:()=>true}),rejected=assert.rejects(aborted,{name:'AbortError'});cancelled.abort();await rejected;assert.equal(listeners.size,0);assert.equal(deadlines[1].cancelled,true);
  const lateTarget={registered:false,current:()=>true,generation:2},late=v.drawn(signal(),1,lateTarget);deadlines[2].onTimeout();assert.equal(listeners.size,1);lateTarget.registered=true;render();await late;assert.equal(listeners.size,0);assert.equal(deadlines[2].cancelled,true);
  assert.deepEqual(deadlines.map(entry=>entry.milliseconds),[8000,8000,8000],'phase/generation changes do not restart or extend the original request budget');
  r.setBatches([],3);r.destroy();/* chunk meshes are page-store GPU resources: drainPage proves none is pinned and deletes them */h.drainPage();assert.equal(h.buffers.size,0);assert.ok(h.scopes.every(scope=>scope.stats.disposed));
 });
});

test('actual visible session preserves an old resident before setter failure and marks a post-set renderer failure committed-not-ready before one 2D cleanup',async()=>{
 const {build}=await import('esbuild'),bundle=await build({entryPoints:[path.join(web,'src/safety/building-detail-runtime.ts')],bundle:true,platform:'node',format:'esm',write:false});
 const {createBuildingDetailRuntime,StaleBuildingDetailDemandError}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const h=constructionHarness(),f=managerFixture({runtime:h.runtime,page:h.page}),v=f.v,deadlines=[],sessions=[],settlements=[],setters=[],clears=[];
 const source=await readFile(path.join(web,'src/safety/resident-draw-readiness.ts'),'utf8');
 const readiness=runtimeModule(source,{'./visible-readiness-deadline':{pageIsHidden:()=>false,visibleReadinessDeadline(milliseconds,onTimeout){const entry={milliseconds,onTimeout,cancelled:false};deadlines.push(entry);return()=>{entry.cancelled=true;};}}});
 const freshRows=[component(2),component(3)],sha=digit=>digit.repeat(64),leaf={id:'fresh',tile_key:'fresh-tile',path:'/safety/buildings3d/fresh.json',bytes:100,sha256:sha('2')};
 const document={schema:'crimemaps-building-detail-demand-v1',schemaVersion:1,city:'bremen',canonicalIndex:{path:'/safety/buildings3d/index.json',bytes:100,sha256:sha('1')},canonicalLeaf:{id:leaf.id,path:leaf.path,bytes:leaf.bytes,sha256:leaf.sha256},
  bindings:{sourcePBFSHA256:sha('3'),boundarySHA256:sha('4'),compilerSHA256:sha('5'),sourceSnapshot:'tiny',materialSHA256:sha('6'),producerSHA256:sha('7'),protectionSHA256:sha('8'),sourceEquivalenceSHA256:sha('9')},
  components:freshRows.map(c=>({objectId:c.objectId,partId:c.partId,origin:c.origin,box:[0,0,0,1,1,0],protected:false})),
  near:{level:'near',asset:{path:leaf.path,bytes:leaf.bytes,sha256:leaf.sha256},geometrySHA256:sha('a'),vertices:6,triangles:2},variants:[]};
 let sourceReleases=0,failBeforeSetter=true,terminalDrawFailure=false;
 const runtime=createBuildingDetailRuntime({city:'bremen',resolveDetailIndex:async()=>document,getDemands:()=>[{pass:'picking',maxErrorCssPx:1,maxErrorDrawingBufferPx:1,project:()=>undefined}],
  readCanonical:async()=>{throw Error('Unexpected canonical decoder boundary');},readBytes:async()=>{throw Error('Unexpected variant decoder boundary');},
  async acquireSelected(){return{value:{raw:{schema_version:1,city:'bremen',components:freshRows}},release(){sourceReleases++;}};}});
 const index=await runtime.resolveDetailIndex(sha('1'),leaf,{signal:v.signal}),resource=runtime.select(index).resource;
 const openSession=runtime.openSession;runtime.openSession=(options)=>{const session=openSession(options),settle=session.settleReady,finish=session.finish;let finishes=0;
  session.settleReady=value=>{settlements.push({...value});return settle(value);};session.finish=()=>{finishes++;finish();};
  sessions.push({session,get finishes(){return finishes;}});return session;
 };
 await h.environment(async()=>{
  const r=h.create();r.layer.onAdd({},h.gl);r.setEnabled(true);
  const old=await r.prepareBatches([component(1)],signal());h.commit(r,old,1);old.release();await h.flush(r);r.layer.render(h.gl,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}});
  assert.equal(r.getDrawReadiness().ready,true);const oldSurface=r.borrowSurfaceComponent(component(1)),oldBuffers=[...h.buffers.keys()];
  const renderer=new Proxy(r,{get(target,key){if(key==='getDrawReadiness'&&terminalDrawFailure)return()=>({ready:false,preparing:false,failure:'controlled post-set draw failure'});if(key==='setBatches')return(...args)=>{setters.push({count:args[0].length,generation:args[1]});return target.setBatches(...args);};return Reflect.get(target,key);}});
  const ownerSource=await readFile(path.join(web,'src/painted/bremen/safety/bremen-owner-runtime.ts'),'utf8'),ownerAst=ts.createSourceFile('owner.ts',ownerSource,ts.ScriptTarget.Latest,true),ownerDeps={};
  for(const entry of ownerAst.statements.filter(ts.isImportDeclaration))if(!entry.importClause?.isTypeOnly)ownerDeps[entry.moduleSpecifier.text]=entry.moduleSpecifier.text==='../../../safety/frozen-data-scope'?scopeModule.exports:h.dependency(entry.moduleSpecifier.text);
  const cleanupOwner=runtimeModule(ownerSource,ownerDeps).createBremenOwnerRuntime({acquire(){throw Error('No legacy owner acquisition');},dispose(){}});
  const ownerRuntime=new Proxy(h.ownerRuntime,{get(target,key){if(key==='clearResident')return()=>{clears.push('owner');cleanupOwner.clearResident();};return Reflect.get(target,key);}});
  const listeners=new Set();Object.assign(v.map,{on(_event,listener){listeners.add(listener);},off(_event,listener){listeners.delete(listener);},triggerRepaint(){},isMoving:()=>false});
  Object.assign(v,{renderer,ownerRuntime,StaleBuildingDetailDemandError,waitForResidentDraw:readiness.waitForResidentDraw,visibleLoadsPending:0,recoveryResident:{invalidate(){}},mode:'3d',generation:1,selectedShardIds:['old'],visibleRetainedEstimateBytes:100});
  v.options.detailRuntime=runtime;v.s434Aggregate.clear=()=>clears.push('aggregate');const shape={...component(4),sourceFeature:freshRows[0].sourceFeature,batches:freshRows[0].batches};v.ownerShapePatchDisplayRows=input=>input.includes(freshRows[0])&&!input.some(c=>key(c)===key(shape))?[...input,shape]:input;
  v.prepareBremenFunctions=async(scope,_functions,_rows,requestSignal)=>{await scope.prepare(h.resourceRefs,requestSignal);if(failBeforeSetter)throw Error('controlled pre-set source failure');};
// visible() and its failure cleanup now also run the city route pre-import
   // (actual bulk70PreimportRows), the context-loss check and the ready-handoff
   // restoration; drawn() synchronizes published explicit SOURCE and detail
   // solar coverage with the actual projection.
   const solar=h.runtime.load(path.join(web,'src/safety/prospective-solar-projection.ts'));bindDrawnPublication(v,solar);
   // The actual renderer receives the manager's retained chunk input: the actual
   // retention of the same page runtime (the renderer double's counter does not apply).
   v.retainRendererChunkInput=h.runtime.load(path.join(web,'src/safety/renderer-chunk-input.ts')).retainRendererChunkInput;
   Object.assign(v,{detailRefreshPending:false,cityRouteModulesPending:true,city:'bremen',detailDemand:{},request:new AbortController(),clearedHandoffTicket:undefined,bulk70PreimportRows,ChunkResourceContextLostError:h.runtime.chunkResourceStore.ChunkResourceContextLostError,routeImports:[],
    async prepareBremenInfillOwnerRouteModules(rows,requestSignal){requestSignal.throwIfAborted();v.routeImports.push(['bremen-infill',rows.length]);},async prepareNonBerlinOwnerRoutes(rows,requestSignal){requestSignal.throwIfAborted();v.routeImports.push(['non-berlin',rows.length]);}});
   v.clearRequiredSolarCoverage=evaluate(managerAst,'clearRequiredSolarCoverage',v);v.restoreReadyHandoff=evaluate(managerAst,'restoreReadyHandoff',v);
   for(const name of ['drawn','clearFailedHandoff','visible'])v[name]=evaluate(managerAst,name,v);
  // Leaf collection is the boundary. The production visible wrapper, merged
  // commit, real renderer setter, session and failure cleanup all execute.
  v.visibleNow=async(requestSignal,ticket,_activate,_notify,session)=>{v.session=session;const acquired=await session.acquireSelected(resource,{index});v.chosen=[leaf];v.detailBindings=new Map([[leaf,{index,resource}]]);v.results=[acquired.value.raw.components];v.retainedShardCost.set(v.results[0],100);f.releaseSources();f.registerSource(leaf,v.results[0],{index,resource});
   try{return await v.commit();}finally{v.session=undefined;await v.publication.close();f.releaseSources();v.results.length=0;}
  };
  await assert.rejects(v.visible(v.signal,1),/controlled pre-set source failure/);
  assert.equal(sessions[0].session.state.committed,false);assert.equal(sessions[0].session.state.status,'failed-before-publication');assert.equal(sessions[0].session.stats.sourceLeases,0);assert.equal(sessions[0].finishes,1);assert.equal(sourceReleases,1);
  assert.equal(setters.length,0);assert.deepEqual(clears,[]);assert.equal(v.mode,'3d');assert.strictEqual(r.borrowSurfaceComponent(component(1)),oldSurface);assert.deepEqual([...h.buffers.keys()],oldBuffers);assert.equal(old.scope.stats.disposed,false);assert.equal(v.visibleLoadsPending,0);assert.equal(deadlines[0].cancelled,true);
  failBeforeSetter=false;v.resetPublication();/* the candidate is published before its deadline (below), so the request times out in its draw stage */const work=v.visible(v.signal,1),rejected=assert.rejects(work,/controlled post-set draw failure/);let workError;void work.catch(error=>{workError=error;});void rejected.catch(()=>{});
  for(let i=0;i<30&&!setters.length&&!workError;i++)await tick();if(workError)await rejected;assert.equal(setters.length,1,'the actual renderer setter owns the candidate before readiness');
  assert.equal(sessions[1].session.state.committed,true);assert.equal(sessions[1].session.state.status,'adopted');assert.equal(sessions[1].session.stats.sourceLeases,0);
   // The candidate is published before the deadline (the renderer publishes only
   // once its geometry and visible programs are ready); its main draw is never
   // observed, so the request times out committed-not-ready. (An unpublished
   // candidate is cancelled and the last ready resident kept instead; that path is
   // candidate-main-handoff's.)
   await h.flush(r,()=>r.getRevision().generation===2);assert.equal(r.getRevision().generation,2,'the actual renderer published the accepted candidate before the readiness deadline');assert.equal(r.getDrawReadiness().ready,false,'no complete main draw of the published generation yet');
   deadlines[1].onTimeout();await tick();assert.equal(sessions[1].session.state.status,'adopted','threshold leaves the pending published attempt live');terminalDrawFailure=true;for(const listener of [...listeners])listener();await rejected;
  assert.equal(sessions[1].session.state.status,'committed-not-ready');assert.equal(sessions[1].session.state.committed,true);assert.equal(sessions[1].session.stats.sourceLeases,0);assert.equal(sessions[1].finishes,1);assert.equal(sourceReleases,2);
  assert.equal(settlements.length,1);assert.equal(settlements[0].ready,false);assert.equal(settlements[0].generation,2);
  assert.deepEqual(setters.map(value=>value.count),[3,0],'one accepted candidate is followed by exactly one original empty 2D setter');assert.deepEqual(clears,['aggregate','owner']);assert.equal(v.mode,'2d');assert.equal(v.visibleLoadsPending,0);assert.equal(listeners.size,0);assert.equal(v.adoptedDetailResources.size,0);assert.equal(v.selectedShardIds.length,0);
  assert.equal(r.borrowSurfaceComponent(component(1)),undefined);assert.equal(old.scope.stats.disposed,true);/* chunk meshes are page-store GPU resources: once the cleanup dropped every lease, drainPage proves none is pinned and deletes them */h.drainPage();assert.equal(h.buffers.size,0,'the original cleanup clears GPU allocations; it does not restore the old GPU');assert.ok(h.scopes.every(scope=>scope.stats.disposed));
  assert.deepEqual(deadlines.map(entry=>entry.milliseconds),[8000,8000]);assert.ok(deadlines.every(entry=>entry.cancelled));cleanupOwner.dispose();r.destroy();
 });
});
