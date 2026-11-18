import {f154Construction} from './support/f154-construction-boundary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {RENDERER_RUNTIME_MODULES,RENDERER_RUNTIME_DEPENDENCIES,rendererRuntime,fixtureChunkInput,solarShadowAdmissionDouble,tinyRathausProxyMasks,createResidentCaptureOwnership} from './support/fixtures-managers-b-renderer-runtime.mjs';

function assertPublishedComponent(actual,expected){
 assert.deepEqual(actual,expected);if(!expected)return;
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(actual[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(actual.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
const source=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
function evaluate(text,require=()=>{throw Error('Unexpected leaf import');}){const sf=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true),imports=sf.statements.filter(ts.isImportDeclaration),rest=sf.statements.filter(n=>!ts.isImportDeclaration(n));text=[...imports,...rest].map(n=>n.getText(sf)).join('\n');const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);return module.exports;}
// Shared runtime modules (ledger, page store, program owner, chunk packing and
// residency, shader budgets) load with their actual relative graph; the
// allowlist keeps model data, renderers and browser modules out.
const runtime=createSourceModules({allow:id=>[...RENDERER_RUNTIME_MODULES,...RENDERER_RUNTIME_DEPENDENCIES,'safety/frozen-data-scope','safety/resident-gpu-lifecycle','safety/family-paint-program','painted/bremen/safety/shared-paint-recipe','safety/prepared-source','safety/render-runtime/resident-geometry','safety/render-runtime/pressure-availability'].includes(id)});
const chunkInputs=runtime.load('safety/renderer-chunk-input'),stores=runtime.load('safety/render-runtime/chunk-resource-store'),budgets=runtime.load('safety/render-runtime/resource-budget');
const scopeModule=runtime.load('safety/frozen-data-scope'),lifecycle=runtime.load('safety/resident-gpu-lifecycle');
const family=runtime.load('safety/family-paint-program');
const preparedSources=runtime.load('safety/prepared-source');
const fixtureStores=new WeakSet();
const resource={canonicalSHA256:'a'.repeat(64),file:'tiny/programs',occurrence:0,codec:'json'},key=c=>c.objectId+'|'+c.partId;
const TINY_FRAGMENT='vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}';
const count=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[],sourceRetained:true,actualVisualAccepted:false});
function component(id=1,diagnostic=false){const n=diagnostic?57:3,positions=new Float32Array(n*3),normals=new Float32Array(n*3);for(let i=0;i<n;i++){positions.set([i%3===1?1:0,i===0?-0:i%3===2?1:0,Math.floor(i/3)],i*3);normals.set([0,0,1],i*3);}return{city:'bremen',objectId:diagnostic?'osm/way/1207797957':'osm/way/'+id,partId:diagnostic?'osm/way/1207797957/component/b56e09c7e8b907ba01ed':'osm/way/'+id+'/component/tiny',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:'osm/way/'+id,properties:{},geometry:{type:'Polygon',coordinates:[]}},batches:[{positions,normals,indices:Uint32Array.from({length:n},(_,i)=>i),color:[.4,.5,.6]}]};}
function fixture(){const provider='bremen';
 const control={mode:2,failFamily:undefined,paused:false,failMaterials:false,failSpecialization:false,failUploadAt:0,abortOnAcquire:undefined,errors:[],lost:false,errorUploadAt:0,errorCode:0,lostUploadAt:0},uploads=[],subUploads=[],deletedBuffers=new Set(),deletedPrograms=[],buffers=new Map(),handlers=new Map(),scopes=[],ledgers=[];let serial=0,vao,array,element,attempt=0,plans=0,disposed=0,configurations=0,errorReads=0,phase,clearSources=0;const timers=new Map(),sources=[],compileRequests=[],phaseEvents=[],draws=[],programPlans=[],modelEvents=[];let timerID=0,planCount=0;const inPhase=(value,run)=>{const before=phase;phase=value;phaseEvents.push(value);try{return run();}finally{phase=before;}};
 const layouts=new Map(),constants=['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','ARRAY_BUFFER_BINDING','VERTEX_ARRAY_BINDING','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','BUFFER_SIZE','VERTEX_ATTRIB_ARRAY_BUFFER_BINDING','VERTEX_ATTRIB_ARRAY_ENABLED','VERTEX_ATTRIB_ARRAY_SIZE','VERTEX_ATTRIB_ARRAY_STRIDE','VERTEX_ATTRIB_ARRAY_TYPE','VERTEX_ATTRIB_ARRAY_NORMALIZED','VERTEX_ATTRIB_ARRAY_INTEGER','VERTEX_ATTRIB_ARRAY_DIVISOR','VERTEX_ATTRIB_ARRAY_POINTER'];
 const gl=Object.fromEntries(constants.map((v,i)=>[v,i+1]));Object.assign(gl,{
  // A tiny GPU that completes submitted work at once (as the construction harness):
  // the page chunk store's nonblocking retirement fence is signaled at its next collect.
  SYNC_GPU_COMMANDS_COMPLETE:0x9117,ALREADY_SIGNALED:0x911A,TIMEOUT_EXPIRED:0x911B,CONDITION_SATISFIED:0x911C,WAIT_FAILED:0x911D,fenceSync:()=>({fence:++serial}),clientWaitSync:()=>gl.ALREADY_SIGNALED,deleteSync(){},flush(){},
  VERTEX_SHADER:100,FRAGMENT_SHADER:101,COMPILE_STATUS:102,LINK_STATUS:103,NO_ERROR:0,OUT_OF_MEMORY:0x0505,INVALID_OPERATION:0x0502,getError(){errorReads++;return control.errors.shift()??gl.NO_ERROR;},isContextLost:()=>control.lost,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),deleteVertexArray:v=>layouts.delete(v),deleteBuffer:b=>{deletedBuffers.add(b);buffers.delete(b);},deleteProgram:p=>deletedPrograms.push(p),createShader:type=>({type,id:++serial}),shaderSource(shader,text){sources.push({phase,text});shader.text=text;},compileShader(){},attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(){},createProgram:()=>({program:++serial}),getExtension:()=>null,getProgramParameter:()=>true,getShaderParameter:()=>true,getProgramInfoLog:()=>'',getShaderInfoLog:()=>'',deleteShader(){},
  bindVertexArray:v=>{vao=v;},bindBuffer:(target,b)=>{if(target===gl.ARRAY_BUFFER)array=b;else element=b;},getParameter:k=>k===gl.ARRAY_BUFFER_BINDING?array:vao,
  bufferData(target,data){attempt++;control.onUpload?.();const buffer=target===gl.ARRAY_BUFFER?array:element;uploads.push({buffer,data,values:Array.from(data)});buffers.set(buffer,new data.constructor(data));if(control.failUploadAt===attempt)throw Error('tiny replacement upload failure');if(control.errorUploadAt===attempt)control.errors.push(control.errorCode);if(control.lostUploadAt===attempt)control.lost=true;},bufferSubData(_target,_offset,data){subUploads.push({buffer:array,data,values:Array.from(data)});buffers.set(array,new data.constructor(data));},
  getAttribLocation:(_p,name)=>({'a_position':0,'a_normal':1,'a_color':2,'a_selected':3,'a_paint_frame':4,'a_paint_family':5,'a_progressive_color':6,'a_s402_frame':4,'a_s402_alpha':6})[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(index,size,type,normalized,stride,offset){if(!layouts.has(vao))layouts.set(vao,new Map());layouts.get(vao).set(index,{buffer:array,size,type,normalized,stride,offset});},getUniformLocation:()=>null,isEnabled:()=>false,useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},uniformMatrix4fv(){},uniform1f(){},uniform1i(){},uniform2f(){},uniform3f(){},drawElements(_mode,count,_type,offset){draws.push({count,offset});},
  getVertexAttrib(index,k){const a=layouts.get(vao)?.get(index);return k===gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING?a?.buffer:k===gl.VERTEX_ATTRIB_ARRAY_ENABLED?!!a:k===gl.VERTEX_ATTRIB_ARRAY_SIZE?a?.size:k===gl.VERTEX_ATTRIB_ARRAY_STRIDE?a?.stride:k===gl.VERTEX_ATTRIB_ARRAY_TYPE?a?.type:k===gl.VERTEX_ATTRIB_ARRAY_NORMALIZED?a?.normalized:k===gl.VERTEX_ATTRIB_ARRAY_INTEGER?false:0;},getVertexAttribOffset:index=>layouts.get(vao)?.get(index)?.offset??0,getBufferParameter:target=>buffers.get(target===gl.ARRAY_BUFFER?array:element)?.byteLength??0,
  getBufferSubData(target,offset,out){const data=buffers.get(target===gl.ARRAY_BUFFER?array:element);assert.ok(data,'diagnostic must read an existing allocation');new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(new Uint8Array(data.buffer,data.byteOffset+offset,out.byteLength));},
 });
 const frozenData={async acquire(ref,signal){assert.deepEqual(ref,resource);signal.throwIfAborted();const ledger={released:0,borrows:0};ledgers.push(ledger);control.abortOnAcquire?.abort();return{borrow(read){ledger.borrows++;return read({fragment:TINY_FRAGMENT});},release(){ledger.released++;}};}};
 const createScope=()=>{const scope=scopeModule.createFrozenDataScope(frozenData);scopes.push(scope);return scope;};
 const prepare=async(_rows,_city,signal,scope)=>scope.prepare([resource],signal),shader=scope=>{assert.ok(phase==='source-build'||phase==='compile-build','shader body read outside admitted source phase: '+phase);assert.ok(scope,'program configuration requires scope');assert.ok(scope.stats.pins>0);control.onShader?.();return scope.borrow(resource,v=>v.fragment);};
 const owner={BREMEN_MATERIAL_SCOPE_CONSUMERS:[],prepareOwnerRecoveredSourceComponents:async()=>{modelEvents.push('source-recovery');},ownerRecoveredSourceComponents:rows=>rows,ownerReconstructionComponents:rows=>({components:rows,stats:emptyStats()}),prepareBremenOwnerReconstructionComponents:async rows=>{modelEvents.push('reconstruction');return{components:rows,stats:emptyStats()};},ownerReconstructionIdentity:()=>false,ownerReconstructionBaseMaterials(){control.onMaterials?.();if(control.failMaterials)throw Error('tiny material failure');}};
 const shaderModule={prepareInfillPaintPrograms:prepare,root500DataFunctionArities:{paintProgramFragment:2,facadePaintFragmentForCity:1,facadePaintSpecializationForCity:1},paintProgramPartitionEnabled:()=>true,paintProgramFragment:(key,_city,scope)=>{if(control.failFamily===key)throw Error('tiny family failure '+key);return shader(scope);},facadePaintFragmentForCity:(_city,scope)=>shader(scope),facadePaintSpecializationForCity:city=>({city,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null,specialized:null}),describeFacadePaintSource:(city,fragment,kind,scope)=>{assert.equal(phase,'compile-build');assert.ok(scope.stats.pins>0);configurations++;if(control.failSpecialization)throw Error('tiny source-description failure');return{city,sourceKind:kind,fragmentBytes:Buffer.byteLength(fragment,'utf8'),fullFragmentBytes:kind==='full'?Buffer.byteLength(fragment,'utf8'):null,specialized:null};},clearBremenPreparedProgramSources(){clearSources++;},paintProgramKey:raw=>'family-'+raw,
  // Program-source admission bounds of the tiny fragment, from the actual shader
  // source budget (the plan reserves them before the scoped raw-source assembly).
  describeFacadePaintSourceBounds:(city,_sourceKey,scope)=>{assert.equal(city,'bremen');assert.ok(scope,'source bounds are described inside a prepared scope');const budget=runtime.load('safety/render-runtime/shader-source-budget');return budget.shaderSourceBounds(budget.shaderSourceText(TINY_FRAGMENT,['tiny-bremen-facade-v1']));}};
 shaderModule.BREMEN_FACADE_PROGRAM_SOURCE_AUTHORITY=runtime.load('safety/render-runtime/program-preparation').createProgramSourceAuthority({inputs:['tiny-bremen-facade-v1'],builders:[shaderModule.paintProgramFragment,shaderModule.facadePaintFragmentForCity,shaderModule.describeFacadePaintSource]});
 const programModule=runtime.load('safety/render-runtime/program-preparation');
 const planModule=evaluate(source('painted/bremen/safety/bremen-prepared-program-plan.ts'),id=>{if(id==='./facade-paint-fragment')return shaderModule;if(id==='../../../safety/utf8-byte-length')return evaluate(source('safety/utf8-byte-length.ts'));if(id==='../../../safety/prepared-source')return preparedSources;throw Error('Unexpected Bremen plan dependency '+id);});
 const modules={
  '../../../safety/frozen-data-scope':{...scopeModule,createFrozenDataScope:()=>createScope()},
  '../../../safety/resident-gpu-lifecycle':lifecycle,
  '../../../safety/component-readback':evaluate(source('safety/component-readback.ts')),
  // Pure handoff/viewport modules the renderer now imports, as in the other suites.
  '../../../safety/render-runtime/program-grant-handoff':evaluate(source('safety/render-runtime/program-grant-handoff.ts')),
  '../../../safety/viewport-request':evaluate(source('safety/viewport-request.ts')),
  '../../../safety/render-runtime/resident-geometry':runtime.load('safety/render-runtime/resident-geometry'),
  '../../../safety/render-runtime/program-preparation':{...programModule,createProgramPreparationOwner(...args){const owner=programModule.createProgramPreparationOwner(...args);return{...owner,get stats(){return owner.stats;},dispose(){disposed++;owner.dispose();},compile(context,recipe){compileRequests.push({resource:recipe.resource,inputs:[...recipe.inputs]});return owner.compile(context,{...recipe,build:()=>inPhase('compile-build',recipe.build)});},work(context,recipe){return owner.work(context,{...recipe,work:()=>inPhase(recipe.phase??'upload',recipe.work)});}};}},
  '../../../safety/family-paint-program':{...family,familyPaintRuns(...args){plans++;return family.familyPaintRuns(...args);}},
  '../../../safety/custom-layer-render-error':{guardCustomLayerRender:(_map,_id,render)=>render},
  './shared-paint-recipe':runtime.load('painted/bremen/safety/shared-paint-recipe'),
  './owner-reconstruction':owner,
  '../../root500/safety/root500-derived-display-data':{prepareRoot500DerivedDisplays:async()=>{}},
  './bremen-certificate-group-ledger':{certificateGroupKeysForModule:()=>[],certificateGroupKeysForIdentity:()=>[]},
  './bremen-recipe-demand':{bremenDemandSourceAuthority:()=>undefined},
  './bremen-recipe-stages':{bremenScopedCall:(fn,args,scope)=>fn(...args,scope),prepareBremenModuleResources:async(scope,_rows,signal)=>scope.prepare([resource],signal)},
  './infill-paint-programs':{prepareInfillPaintPrograms:prepare},
  './facade-paint-fragment':shaderModule,
  './bremen-prepared-program-plan':{createBremenPreparedProgramPlan(options){const plan=planModule.createBremenPreparedProgramPlan(options);programPlans.push(plan);return plan;}},
  './progressive-paint':{prepareBremenProgressiveAdmissions:async(_rows,signal,scope)=>scope.prepare([resource],signal),progressiveRenderView:()=>Object.freeze([]),getProgressivePaintDiagnosticsView:()=>({state:'available',appliedComponents:Object.freeze([]),rejectedAdmissions:Object.freeze([])}),getProgressivePaintDiagnostics:()=>({state:'available',appliedComponents:[],rejectedAdmissions:[]}),progressivePaintFingerprints:{},progressivePaintCount:provider==='root500'?()=>0:0,prepareRoot500ProgressiveData:prepare,progressivePaintData:rows=>new Float32Array(count(rows)*4),progressivePaintRejections:()=>[],progressiveRenderStatus:()=>[],progressiveAdmission:()=>undefined},
  './facade-paint-frame':{facadePaintData:rows=>{const data=new Float32Array(count(rows)*5);let at=0;for(const row of rows)for(let i=0;i<count([row]);i++)data[at++*5+4]=Number(row.objectId.split('/').at(-1))%2+1;return data;}},
  '../../../safety/resident-planar-reflection':{withResidentReflectionClip:text=>text},
  './owner-display-budget':{fitOwnerDisplayBudget:(rows,_cap,options)=>({components:rows,vertices:options.vertices,indices:options.indices,diagnostic:{}}),sourceBoundsContainFocus:()=>false},
  '../../../safety/solar-shadow-admission':solarShadowAdmissionDouble(),
  './source-role-display':{sourceRoleBatchIncluded:()=>true,sourceRoleDisplayProfile:()=>null},
  './source-part-display':{exactNativePartDisplay:rows=>({drawable:rows,held:[]})},
  './s434-aggregate-display':{s434AggregateBatchIncluded:()=>true},
  './s434-owner138-compat':{checkS434Owner138Replacement:()=>null},
  './f260-canopy-recovery267':{f260CanopyDisplay267:rows=>({drawable:rows,held:[]}),applyF260CanopyPaint267:()=>{}},
  './infill-f288-coplanar-roof':{infillF288ClipCoplanarFacilityRoofs:rows=>rows},
  './be-tv-base-repair':{beTVBaseRepairPlan1:()=>({enabled:false}),beTVBaseRepairDrawAlias1:c=>c,beTVBaseRepairBatchIncluded1:()=>true,beTVBaseRepairIdentity1:()=>false},
  './be-tv-base-westfold70':{beTVBaseWestFold70Transaction:rows=>({rows,enabled:false,legacyPlan:{enabled:false}}),beTVBaseWestFold70BaseRows:()=>[]},
  './source-partial-gate-gpu-diagnostic':{readPaintGPUDiagnostic:()=>null},
 };
 const factories={createResidentCaptureOwnership,retainF154ReconstructionConstruction:f154Construction.retainF154ReconstructionConstruction,retireF154ReconstructionConstruction:f154Construction.retireF154ReconstructionConstruction,createResidentReflectionUniforms:()=>()=>{},createResidentReflectionObjects:()=>{const ids=new WeakMap();let id=0;return value=>{if(!value)return 0;if(!ids.has(value))ids.set(value,++id);return ids.get(value);};},defaultSceneEnvironment:()=>({instantISO:'2026-01-01T00:00:00Z'}),sceneSolarLight:()=>({shadowVector:control.sun?[1,1]:undefined}),createSceneLightUniforms:()=>()=>{},createProjectedShadowMask:()=>({release(){},stats:{}}),createNativeSourceReadback:()=>({destroy(){},observe(){},stats:{}}),createRathausProxyMasks:()=>tinyRathausProxyMasks(control),createResidentCaptureRuntime:adapter=>({invalidate(){},render(){/* Like the actual capture runtime, the pass owns its snapshot and releases it (with its scope/geometry/program retentions) when the pass ends. */const snapshot=adapter.snapshot(false);snapshot.release?.();return snapshot;}}),createSolarShadowPreparationBudget:()=>({})};
 function imported(name){if(name==='paintRunIntersectsVisible')return()=>true;if(name==='paintBoxOutsideClip')return()=>false;if(name in factories)return factories[name];if(name==='root500DataFunctionArities')return{};if(name==='getProgressivePaintCount')return()=>0;if(name==='FROZEN_PAINT_IDS')return new Set();if(name==='DESCRIPTION_BINDINGS'||name==='OWNER_SHAPE_PATCH_PROFILES')return[];if(name==='SOURCE_SHADOW_VECTOR')return[1,1];if(/GLSL|SOURCE_SHA/.test(name))return'';if(/^appendF\d+DerivedDisplay$/.test(name))return rows=>rows;if(name==='appendF260AcceptedRestore')return rows=>({components:rows,stats:emptyStats()});if(name==='applyF018S036Compatibility')return(_r,_p,_f,_plan,current)=>current;if(/^apply/.test(name)||name==='f260AcceptedRestoreBaseMaterials')return()=>({enabled:false});if(/^is|Identity$|Discard$|Intersects|Certified/.test(name))return()=>false;if(/Readback|Certificate/.test(name))return()=>null;if(name==='nativePaintSignature')return()=> 'tiny';if(name==='acceptPaintComponent')return()=>true;if(name==='paintMode')return()=>control.mode;if(name==='paintOverride')return()=>0;if(name==='uploadFacadeLayouts')return()=>{};if(name==='paintBoxOutsideClip')return()=>false;if(name==='paintRunIntersectsVisible')return()=>true;if(name==='sourceShadowOpacity')return value=>value;if(name==='pruneOwner6307Fragment')return text=>text;if(name==='withSceneSolarShadowReceiver')return(_gl,_matrix,draw)=>draw();return()=>{throw Error('Unspecified tiny dependency '+name);};}
 // Chunk/packing/residency/store/shader-budget imports are the real runtime
 // modules of this graph (never stubbed); every other import keeps its double.
 const realRuntime=rendererRuntime(runtime,provider);
 const cache=new Map(),dependency=id=>{if(!cache.has(id)){const real=modules[id]?undefined:realRuntime(id);cache.set(id,real??new Proxy(modules[id]??{},{get:(o,name)=>Reflect.has(o,name)?Reflect.get(o,name):imported(String(name))}));}return cache.get(id);};
 // A lost context frees its GPU objects (as in the construction harness): the tiny
 // driver forgets every buffer of the lost incarnation when the context-lost event
 // reaches the renderer.
 const handlerSources=new Map();
 const renderer=evaluate(source(`painted/${provider}/safety/building-mesh-renderer.ts`),dependency),map={getCenter:()=>({lng:8,lat:53}),getCanvas:()=>({width:512,height:512,clientWidth:512,clientHeight:512,getBoundingClientRect:()=>({left:0,top:0,width:512,height:512})}),on:(name,fn)=>{handlerSources.set(name,fn);handlers.set(name,name==='webglcontextlost'?(...args)=>{buffers.clear();return fn(...args);}:fn);},off:(name,fn)=>{if(handlerSources.get(name)===fn){handlers.delete(name);handlerSources.delete(name);}},triggerRepaint(){}};
 const globals={setTimeout:(fn)=>{const id=++timerID;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),document:new EventTarget(),location:{search:'',hostname:'example.invalid'},window:{devicePixelRatio:1}};
 async function environment(run){const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});try{const value=await run();assertDrained();return value;}finally{store.destroy();for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
 const ownerRuntime={createBatchScope:createScope,prepareBatchCertificates:async()=>{},hasPreparedBatchCertificates:()=>false,hasPreparedCertificateGroup:()=>false,serializeBremenHeldSourceReadback:()=>null,serializeBremenWholeDisplayCertificate:()=>null};
 const create=()=>renderer.createBuildingMeshRenderer(map,'bremen',{ownerRuntime,nativeLeafSHA:()=> 'tiny-leaf',clock:()=>1}),signal=()=>new AbortController().signal;
 // The manager supplies an authoritative source chunk input with every batch;
 // its page store is this graph's store, so chunk CPU/GPU entries are charged.
 // The renderer packs and uploads into the page store: its resident-geometry
 // owners bind the context to the page store, and a context has one store, so
 // the chunk input carries that same page store (one ledger, one GPU incarnation).
 // Isolation per case: environment destroys this fixture's page store, so the
 // next fixture gets a new, empty one (no recent cache, as the former private
 // store had), bound to its own tiny context; no case sees another's entries.
 const store=stores.getPageChunkResourceStore({recentMaxEntries:0,recentMaxIdleMs:0});
 assert.ok(!fixtureStores.has(store),'each fixture has its own page store');fixtureStores.add(store);assert.equal(store.stats.resources,0,'each fixture starts from an empty page store');assert.equal(store.stats.recentMaxEntries,0);stores.bindChunkResourceContext(gl,store);
 // After a passing case, every remaining entry must be evictable (none pinned by
 // a live lease); one eviction pass drains one dependency level.
 function assertDrained(){store.collectRetired();for(let pass=0;store.stats.resources;pass++){const before=store.stats.resources;store.evictRecent();store.collectRetired();assert.ok(store.stats.resources<before,'eviction pass '+pass+' made no progress: a page entry is pinned by a live lease '+JSON.stringify({resources:store.stats.resources,gpu:store.stats.gpu,recent:store.stats.recent,roles:store.stats.roles}));}}
 // Chunk meshes are page-store GPU resources (not renderer-private buffers): a
 // released lease retires its buffers at the store's collect, and a retired chunk
 // frees its parent only then, so one pass drains one dependency level. A renderer
 // that dropped every lease leaves no buffer once the store is drained, and every
 // drain pass must make progress (assertDrained: nothing is pinned by a live lease).
 function collect(){assertDrained();}
 // While a renderer still holds its current generation, superseded chunk buffers
 // are deleted at the store's next retirement collect (no recent cache here).
 function collectRetired(){store.collectRetired();}
 async function prepareBatch(r,rows,abortSignal=signal()){return r.prepareBatches(rows,abortSignal,undefined,undefined,undefined,undefined,fixtureChunkInput(chunkInputs,store,rows));}
 function frame(r){r.layer.render(gl,{defaultProjectionData:{}});}
 function tick(){if(control.paused)return false;const entry=timers.entries().next().value;if(!entry)return false;timers.delete(entry[0]);entry[1]();return true;}
 // Chunk CPU packing and GPU residency settle through page-store promises, so
 // each frame or timer task is followed by its microtasks, as in a browser.
 const drain=()=>new Promise(resolve=>setImmediate(resolve));
 // A candidate is prepared for the main view: it starts its programs only once a
 // frame supplies the main projection, so settle frames carry the visible matrix.
 async function settle(r,ready=()=>!r.stats.geometryPreparation.pending){for(let i=0;i<160;i++){renderVisible(r);await drain();tick();await drain();if(ready())return;}throw Error('bounded candidate did not settle: '+JSON.stringify(r.stats.geometryPreparation));}
 function renderVisible(r){const unit=2*Math.PI*6378137*Math.cos(53*Math.PI/180),ax=(8+180)/360,ay=(1-Math.log(Math.tan(Math.PI/4+53*Math.PI/360))/Math.PI)/2;r.layer.render(gl,[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-ax*unit,0,ay*unit,1]);}
 async function settleVisible(r){for(let i=0;i<160;i++){renderVisible(r);await drain();if(r.isPickReady())return;tick();await drain();}assert.fail('bounded visible family preparation did not settle');}
 const commit=(r,b,g,shadow)=>r.setBatches(b.input,g,shadow,...Array(8).fill(undefined),b);
 return{store,collect,collectRetired,environment,create,prepareBatch,commit,frame,tick,settle,settleVisible,renderVisible,timers,sources,compileRequests,phaseEvents,draws,programPlans,modelEvents,get clearSources(){return clearSources;},control,uploads,subUploads,buffers,deletedBuffers,deletedPrograms,handlers,scopes,ledgers,gl,get errorReads(){return errorReads;},errorNextUpload(code,n=2){control.errorUploadAt=attempt+n;control.errorCode=code;},loseNextUpload(n=2){control.lostUploadAt=attempt+n;},get configurations(){return configurations;},get plans(){return plans;},get disposed(){return disposed;},failNextUpload(n=1){control.failUploadAt=attempt+n;}};
}

function assertReleasedSourcePlans(h){for(const plan of h.programPlans){assert.equal(plan.preparedSourceStats.sourceCharacters,0,'terminal plan retains no assembled source or analysis');assert.equal(plan.preparedSourceStats.released,true);}}
test('Bremen whole renderer admits source work before constructing GLSL and publishes complete MD family coverage',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),rows=[component(1),component(2)],original=structuredClone(rows);
  assert.equal(h.configurations,0);assert.equal(h.sources.length,0);assert.equal(h.programPlans.length,0);
  const prepared=await h.prepareBatch(r,rows);assert.equal(h.configurations,0);assert.equal(h.sources.length,0);
  h.commit(r,prepared,1);prepared.release();assert.equal(h.configurations,0);assert.equal(h.sources.length,0);assert.equal(h.uploads.length,0);assert.equal(r.getRevision().generation,0);
  assert.equal(h.programPlans.length,1);assert.equal(h.programPlans[0].sourcesBuilt,0);
  r.setEnabled(true);r.layer.onAdd({},h.gl);assert.equal(h.configurations,0);assert.equal(h.programPlans[0].sourcesBuilt,0);assert.equal(r.isPickReady(),false);
  h.control.onShader=()=>{assert.equal(r.getRevision().generation,0,'source build cannot publish the candidate');assert.equal(h.uploads.length,0);};
  await h.settle(r);h.control.onShader=undefined;
  assert.equal(r.stats.geometryPreparation.failure,undefined);assert.equal(r.getRevision().generation,1);
  // KHR mode two holds geometry publication until the visible colour families link
  // (DECISIONS 2026-11-02 23:50 (b)): the settle frames carry the visible matrix,
  // so both visible families are linked programs, not invented readiness.
  assert.equal(r.stats.paintProgramPartitions.cachedPrograms,2,'geometry publication waits for the linked visible colour families');
  assert.equal(h.uploads.length,5,'one core allocation per index/static/state/paint/progressive buffer');assert.equal(h.buffers.size,5);
  // The base program and both visible family programs are built before that
  // publication: three source builds, three source descriptions and three
  // compiles (vertex+fragment each), from one paint-run plan.
  assert.equal(h.configurations,3);assert.equal(h.plans,1);assert.equal(h.programPlans[0].sourcesBuilt,3);
  assert.equal(h.sources.length,6);assert.equal(h.phaseEvents.filter(phase=>phase==='compile-build').length,3);assert(h.clearSources>=1,'assembly clears facade scratch while the mode-2 plan awaits its first viewport');
  assert.equal(h.programPlans[0].inputs.some(input=>input.includes('vec3 paintedFacade')),false);
  assert.deepEqual(rows,original);assert.equal(prepared.scope.stats.ownerReleased,true);assert.equal(prepared.scope.stats.pins,1);
  r.setReducedMotion(true);await h.settleVisible(r);assert.equal(r.isPickReady(),true);assert.equal(r.stats.paintProgramPartitions.cachedPrograms,2,'both actually visible families are ready before drawing');assert.equal(h.programPlans[0].sourcesBuilt,3);assert.equal(h.programPlans[0].preparedSourceStats.sourceCharacters,0,'completed visible demand releases the reusable source and analysis');assert.equal(r.pick({x:307.2,y:204.8})?.objectId,rows[0].objectId);
  const oldCPU=r.borrowSurfaceComponent(rows[0]),oldGPU=[...h.buffers.keys()],beforeDraw=h.draws.length;
  const next=await h.prepareBatch(r,[component(3),component(4)]);h.commit(r,next,2);next.release();h.control.paused=true;
  h.renderVisible(r);assert.equal(r.getRevision().generation,1);assert.equal(r.isPickReady(),false);assertPublishedComponent(r.borrowSurfaceComponent(rows[0]),oldCPU);
  assert.equal(r.pick({x:307.2,y:204.8})?.objectId,rows[0].objectId);assert.equal(r.renderPlanarReflection({}).status,'active');assert(h.draws.length>beforeDraw);assert.deepEqual([...h.buffers.keys()],oldGPU);
  h.control.paused=false;await h.settle(r);assert.equal(r.getRevision().generation,2);assert.equal(prepared.scope.stats.disposed,true);assert.equal(h.programPlans[0].released,true);assert.deepEqual(h.programPlans[0].inputs,[]);
  h.collectRetired();assert(oldGPU.every(buffer=>h.deletedBuffers.has(buffer)));assert.equal(next.scope.stats.pins,1);r.destroy();assertReleasedSourcePlans(h);assert.equal(next.scope.stats.disposed,true);assert.equal(h.programPlans[1].released,true);h.collect();assert.equal(h.buffers.size,0);
 });
});

test('Bremen whole renderer cancellation, source failure and supersession keep the published CPU/GPU generation',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),first=await h.prepareBatch(r,[component(1)]);h.commit(r,first,1);first.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  const cpu=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],sourceBuilds=h.configurations;
  const abort=new AbortController(),cancelled=await h.prepareBatch(r,[component(2)],abort.signal);h.commit(r,cancelled,2);cancelled.release();abort.abort();
  assert.equal(cancelled.scope.stats.disposed,true);assert.equal(h.programPlans.at(-1).released,true);assert.equal(h.configurations,sourceBuilds);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),cpu);assert.deepEqual([...h.buffers.keys()],gpu);
  // Ready programs are reused across candidates (component 3 is family 2, already
  // linked for component 1, so it builds no source at all): the injected
  // source-description failure needs a candidate whose visible family (1) is not
  // linked yet.
  const failed=await h.prepareBatch(r,[component(6)]);h.control.failSpecialization=true;h.commit(r,failed,2);failed.release();await h.settle(r,()=>!!r.stats.geometryPreparation.failure);h.control.failSpecialization=false;
  assert.match(r.stats.geometryPreparation.failure,/tiny source-description failure/);assert.equal(failed.scope.stats.disposed,true);assert.equal(h.programPlans.at(-1).released,true);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),cpu);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(first.scope.stats.disposed,false);
  const earlier=await h.prepareBatch(r,[component(4)]);h.commit(r,earlier,2);earlier.release();const stale=h.programPlans.at(-1);
  const latest=await h.prepareBatch(r,[component(5)]);h.commit(r,latest,3);latest.release();assert.equal(earlier.scope.stats.disposed,true);assert.equal(stale.released,true);await h.settle(r);
  assert.equal(r.getRevision().generation,3);assert.equal(r.borrowSurfaceComponent(component(4)),undefined);assert(r.borrowSurfaceComponent(component(5)));assert.equal(first.scope.stats.disposed,true);
  r.setBatches([],4);assert.equal(latest.scope.stats.disposed,true);assert.equal(h.programPlans.at(-1).released,true);h.collect();assert.equal(h.buffers.size,0);r.destroy();assertReleasedSourcePlans(h);
 });
});

test('Bremen whole renderer source-work and GPU-upload reentrant aborts preserve the old scope, while upload failures roll back',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),first=await h.prepareBatch(r,[component(1)]);h.commit(r,first,1);first.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  const cpu=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()];
  for(const boundary of ['source','upload']){
   const abort=new AbortController(),candidate=await h.prepareBatch(r,[component(2)],abort.signal);h.commit(r,candidate,2);candidate.release();
   if(boundary==='source')h.control.onMaterials=()=>{h.control.onMaterials=undefined;abort.abort();assert.equal(first.scope.stats.disposed,false,'published scope stays pinned while globals transiently reference the candidate');};
   else h.control.onUpload=()=>{h.control.onUpload=undefined;abort.abort();};
   await h.settle(r,()=>candidate.scope.stats.disposed);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),cpu);assert.equal(r.getRevision().generation,1);assert.equal(first.scope.stats.disposed,false);assert.deepEqual([...h.buffers.keys()],gpu);assert(gpu.every(buffer=>!h.deletedBuffers.has(buffer)));assert.equal(h.programPlans.at(-1).released,true);
  }
  const failed=await h.prepareBatch(r,[component(3)]);h.commit(r,failed,2);failed.release();h.errorNextUpload(h.gl.OUT_OF_MEMORY);await h.settle(r,()=>!!r.stats.geometryPreparation.failure);
  assert.match(r.stats.geometryPreparation.failure,/WebGL error 0x505/);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),cpu);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(failed.scope.stats.disposed,true);assert.equal(first.scope.stats.disposed,false);assert.equal(h.programPlans.at(-1).released,true);r.destroy();assertReleasedSourcePlans(h);assert.equal(first.scope.stats.disposed,true);
 });
});

test('Bremen whole renderer context recovery uploads canonical arrays without source recovery or model reconstruction',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),prepared=await h.prepareBatch(r,[component(1),component(2)]);h.commit(r,prepared,1);prepared.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);
  const cpu=r.borrowSurfaceComponent(component(1)),geometry=h.uploads.find(upload=>upload.data.length===54).data,modelEvents=[...h.modelEvents],runs=h.plans,plan=h.programPlans[0],builds=plan.sourcesBuilt;
  h.handlers.get('webglcontextlost')();assert.equal(r.stats.contextRecovery.pending,false);assert.equal(prepared.scope.stats.disposed,false);assert.equal(plan.released,false);
  h.handlers.get('webglcontextrestored')();await h.settle(r,()=>!r.stats.geometryPreparation.pending&&r.stats.contextRecovery.successes===1);
  assert.strictEqual(h.uploads.findLast(upload=>upload.data.length===54).data,geometry);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),cpu);assert.deepEqual(h.modelEvents,modelEvents);assert.equal(h.plans,runs);assert.equal(h.programPlans.length,1);assert(plan.sourcesBuilt>builds);assert.equal(prepared.scope.stats.pins,1);assert.equal(r.getRevision().generation,1);r.destroy();assertReleasedSourcePlans(h);assert.equal(prepared.scope.stats.disposed,true);h.collect();assert.equal(h.buffers.size,0);
 });
});

test('Bremen whole renderer shadow core borrows main buffers, retains the old shadow on candidate failure, and deletes only its owned index',async()=>{
 const h=fixture();await h.environment(async()=>{
  h.control.sun=true;const r=h.create(),first=await h.prepareBatch(r,[component(1)]);h.commit(r,first,1);first.release();r.setEnabled(true);r.layer.onAdd({},h.gl);await h.settle(r);const main=[...h.buffers.keys()];
  r.setSolarShadowBoundary({boundarySHA256:'a'.repeat(64)});await h.settle(r,()=>r.stats.shadowGPUReady&&!r.stats.geometryPreparation.shadowPending);
  assert.equal(h.buffers.size,6);const shadow=[...h.buffers.keys()].find(buffer=>!main.includes(buffer));assert(shadow);assert(main.every(buffer=>!h.deletedBuffers.has(buffer)));
  const failed=await h.prepareBatch(r,[component(2)]);h.commit(r,failed,2);failed.release();h.errorNextUpload(h.gl.OUT_OF_MEMORY);await h.settle(r,()=>!!r.stats.geometryPreparation.failure);
  assert.equal(h.buffers.size,6);assert.equal(h.deletedBuffers.has(shadow),false);assert(main.every(buffer=>!h.deletedBuffers.has(buffer)));
  h.control.sun=false;r.setSunlightInstant('2026-01-01T00:00:00Z');assert.equal(h.deletedBuffers.has(shadow),true,'releasing the shadow view deletes its owned index');assert(main.every(buffer=>!h.deletedBuffers.has(buffer)),'borrowed main buffers survive shadow release');assert.equal(h.buffers.size,5);r.destroy();assertReleasedSourcePlans(h);h.collect();assert.equal(h.buffers.size,0);assert.equal(first.scope.stats.disposed,true);
 });
});

