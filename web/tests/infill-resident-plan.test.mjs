import {f154Construction} from './support/f154-construction-boundary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import {loadInfillScopedFunctions,loadInfillDisplayBudget} from './fixtures/painted-residency-harness.mjs';
import {createSourceModules} from './support/fixtures-managers-b-source-modules.mjs';
import {createResidentCaptureOwnership,RENDERER_RUNTIME_MODULES,RENDERER_RUNTIME_DEPENDENCIES,rendererRuntime,fixtureChunkInput,solarShadowAdmissionDouble,tinyRathausProxyMasks} from './support/fixtures-managers-b-renderer-runtime.mjs';

const source=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
function evaluate(text,require=()=>{throw Error('Unexpected leaf import');}){const sf=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true),imports=sf.statements.filter(ts.isImportDeclaration),rest=sf.statements.filter(n=>!ts.isImportDeclaration(n));text=[...imports,...rest].map(n=>n.getText(sf)).join('\n');const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);return module.exports;}
// The shared runtime modules load with their actual relative imports (ledger,
// page store, shader-source budget); the allowlist keeps model data, renderers
// and browser modules out, as the former per-module require maps did.
const runtime=createSourceModules({allow:id=>[...RENDERER_RUNTIME_MODULES,...RENDERER_RUNTIME_DEPENDENCIES,'safety/frozen-data-scope','safety/resident-gpu-lifecycle','safety/family-paint-program','safety/render-runtime/resident-geometry','safety/prepared-source','safety/solar-shadow-preparation','safety/paint-program-idle-retirement','safety/building-focus-window'].includes(id)});
const chunkInputs=runtime.load('safety/renderer-chunk-input'),stores=runtime.load('safety/render-runtime/chunk-resource-store'),budgets=runtime.load('safety/render-runtime/resource-budget');
const scopeModule=runtime.load('safety/frozen-data-scope'),lifecycle=runtime.load('safety/resident-gpu-lifecycle');
const programs=runtime.load('safety/render-runtime/program-preparation'),families=runtime.load('safety/family-paint-program');
const geometry=runtime.load('safety/render-runtime/resident-geometry');
const preparedSources=runtime.load('safety/prepared-source'),shaderBudgets=runtime.load('safety/render-runtime/shader-source-budget');
const pick=evaluate(source('painted/root500/safety/indexed-pick-blocks70.ts'));
const visibility=evaluate(source('painted/root500/safety/paint-run-visibility.ts')),reflection=evaluate(source('safety/resident-planar-reflection.ts'));
const solarPreparation=runtime.load('safety/solar-shadow-preparation');
const colourFamily=resource=>resource.includes(':colour:')?resource.split(':').at(-1):undefined;
const resource={canonicalSHA256:'a'.repeat(64),file:'tiny/programs',occurrence:0,codec:'json'},key=c=>c.objectId+'|'+c.partId;
const count=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[],sourceRetained:true,actualVisualAccepted:false});
function component(id=1,diagnostic=false){const n=diagnostic?57:3,positions=new Float32Array(n*3),normals=new Float32Array(n*3);for(let i=0;i<n;i++){positions.set([i%3===1?1:0,i===0?-0:i%3===2?1:0,Math.floor(i/3)],i*3);normals.set([0,0,1],i*3);}return{city:'leipzig',objectId:diagnostic?'osm/way/1207797957':'osm/way/'+id,partId:diagnostic?'osm/way/1207797957/component/b56e09c7e8b907ba01ed':'osm/way/'+id+'/component/tiny',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:'osm/way/'+id,properties:{},geometry:{type:'Polygon',coordinates:[]}},batches:[{positions,normals,indices:Uint32Array.from({length:n},(_,i)=>i),color:[.4,.5,.6]}]};}
// This independent fixture loads the whole infill constructor and real
// program owner/scheduler/geometry owners; model/shader inputs remain tiny.
function fixture(){const provider='infill',programPlans=[],progressiveDemands=[],workRequests=[];
 const control={paused:false,failMaterials:false,failSpecialization:false,failUploadAt:0,abortOnAcquire:undefined,errors:[],lost:false,errorUploadAt:0,errorCode:0,lostUploadAt:0},uploads=[],subUploads=[],deletedBuffers=new Set(),deletedPrograms=[],buffers=new Map(),handlers=new Map(),scopes=[],ledgers=[];let serial=0,vao,array,element,currentProgram,attempt=0,plans=0,disposed=0,configurations=0,errorReads=0,admitted=false,mode=2,override=0,sourceBuilds=0,capture;const timers=new Map(),draws=[],submitted=[],shaderReads=[],deletedVAOs=new Set(),preparationEvents=[];let timerId=0,onUpload,sourceWorkRuns=0,materialBuilds=0,sourceClears=0;
 const layouts=new Map(),constants=['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','ARRAY_BUFFER_BINDING','VERTEX_ARRAY_BINDING','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','BUFFER_SIZE','VERTEX_ATTRIB_ARRAY_BUFFER_BINDING','VERTEX_ATTRIB_ARRAY_ENABLED','VERTEX_ATTRIB_ARRAY_SIZE','VERTEX_ATTRIB_ARRAY_STRIDE','VERTEX_ATTRIB_ARRAY_TYPE','VERTEX_ATTRIB_ARRAY_NORMALIZED','VERTEX_ATTRIB_ARRAY_INTEGER','VERTEX_ATTRIB_ARRAY_DIVISOR','VERTEX_ATTRIB_ARRAY_POINTER','CURRENT_PROGRAM'];
 const gl=Object.fromEntries(constants.map((v,i)=>[v,i+1]));Object.assign(gl,{
  // WebGL2 completion fences: submitted tiny work has always completed, so a page-store
  // GPU retirement finishes at the next frame-boundary collect instead of the fallback.
  SYNC_GPU_COMMANDS_COMPLETE:0x9117,ALREADY_SIGNALED:0x911A,TIMEOUT_EXPIRED:0x911B,CONDITION_SATISFIED:0x911C,WAIT_FAILED:0x911D,fenceSync:()=>({fence:++serial}),clientWaitSync:()=>gl.ALREADY_SIGNALED,deleteSync(){},flush(){},
  NO_ERROR:0,OUT_OF_MEMORY:0x0505,INVALID_OPERATION:0x0502,getError(){errorReads++;return control.errors.shift()??gl.NO_ERROR;},isContextLost:()=>control.lost,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),deleteVertexArray:v=>{if(v){assert(!deletedVAOs.has(v),'VAO deleted once');deletedVAOs.add(v);}layouts.delete(v);},deleteBuffer:b=>{assert(!deletedBuffers.has(b),'Buffer deleted once');deletedBuffers.add(b);buffers.delete(b);},deleteProgram:p=>deletedPrograms.push(p),
  bindVertexArray:v=>{vao=v;},bindBuffer:(target,b)=>{if(target===gl.ARRAY_BUFFER)array=b;else element=b;},getParameter:k=>k===gl.CURRENT_PROGRAM?currentProgram:k===gl.ARRAY_BUFFER_BINDING?array:vao,
  bufferData(target,data){attempt++;const buffer=target===gl.ARRAY_BUFFER?array:element;uploads.push({buffer,data,values:Array.from(data)});onUpload?.();buffers.set(buffer,new data.constructor(data));if(control.failUploadAt===attempt)throw Error('tiny replacement upload failure');if(control.errorUploadAt===attempt)control.errors.push(control.errorCode);if(control.lostUploadAt===attempt)control.lost=true;},bufferSubData(_target,_offset,data){subUploads.push({buffer:array,data,values:Array.from(data)});buffers.set(array,new data.constructor(data));},
  getAttribLocation:(_p,name)=>({'a_position':0,'a_normal':1,'a_color':2,'a_selected':3,'a_paint_frame':4,'a_paint_family':5,'a_progressive_color':6,'a_s402_frame':7,'a_s402_alpha':8})[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(index,size,type,normalized,stride,offset){if(!layouts.has(vao))layouts.set(vao,new Map());layouts.get(vao).set(index,{buffer:array,size,type,normalized,stride,offset});},getUniformLocation:()=>null,isEnabled:()=>false,useProgram(value){currentProgram=value;},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},uniformMatrix4fv(){},uniform1f(){},uniform1i(){},uniform2f(){},uniform3f(){},drawElements(){draws.push(vao);},
  getVertexAttrib(index,k){const a=layouts.get(vao)?.get(index);return k===gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING?a?.buffer:k===gl.VERTEX_ATTRIB_ARRAY_ENABLED?!!a:k===gl.VERTEX_ATTRIB_ARRAY_SIZE?a?.size:k===gl.VERTEX_ATTRIB_ARRAY_STRIDE?a?.stride:k===gl.VERTEX_ATTRIB_ARRAY_TYPE?a?.type:k===gl.VERTEX_ATTRIB_ARRAY_NORMALIZED?a?.normalized:k===gl.VERTEX_ATTRIB_ARRAY_INTEGER?false:0;},getVertexAttribOffset:index=>layouts.get(vao)?.get(index)?.offset??0,getBufferParameter:target=>buffers.get(target===gl.ARRAY_BUFFER?array:element)?.byteLength??0,
  getBufferSubData(target,offset,out){const data=buffers.get(target===gl.ARRAY_BUFFER?array:element);assert.ok(data,'diagnostic must read an existing allocation');new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(new Uint8Array(data.buffer,data.byteOffset+offset,out.byteLength));},
 });
 Object.assign(gl,{VERTEX_SHADER:301,FRAGMENT_SHADER:302,LINK_STATUS:303,COMPILE_STATUS:304,
  createShader:type=>({id:++serial,type}),shaderSource(shader,text){assert(admitted,'shader submission only runs in context scheduler');shader.text=text;submitted.push({type:shader.type,text});},compileShader(){},createProgram:()=>({id:++serial,shaders:new Set()}),attachShader:(p,s)=>p.shaders.add(s),detachShader:(p,s)=>p.shaders.delete(s),bindAttribLocation(){},linkProgram(p){p.fragment=[...p.shaders].find(s=>s.type===gl.FRAGMENT_SHADER)?.text;},getExtension:()=>null,getProgramParameter:()=>!control.failLink,getShaderParameter:()=>true,getProgramInfoLog:()=>control.failLink?'tiny required colour link failure':'',getShaderInfoLog:()=>'',deleteShader(){},deleteProgram(p){assert(!deletedPrograms.includes(p),'program deleted once');deletedPrograms.push(p);},
 });
 const frozenData={async acquire(ref,signal){assert.deepEqual(ref,resource);signal.throwIfAborted();const ledger={released:0,borrows:0};ledgers.push(ledger);control.abortOnAcquire?.abort();return{borrow(read){ledger.borrows++;return read({fragment:'tiny prepared fragment'});},release(){ledger.released++;}};}};
 const createScope=()=>{const scope=scopeModule.createFrozenDataScope(frozenData);scopes.push(scope);return scope;};
 const prepare=async(_rows,_city,signal,scope)=>scope.prepare([resource],signal),shader=(scope,key='base')=>{assert(admitted,'full source construction only runs in admitted compile.build');sourceBuilds++;shaderReads.push(scope);assert.ok(scope?.stats.pins>0);return scope.borrow(resource,()=>fixtureFragment(key));};
 const fixtureFragment=key=>`vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){if(abs(family-7.)<.25)return base+vec3(.2);if(abs(family-9.)<.25)return base+vec3(.9);return base;} // ${key}`;
 // The renderer awaits its owner-module preparation before any scope exists (DECISIONS 03:25);
 // these tiny rows load no owner module, so it only observes cancellation.
 const owner={root500DataFunctionArities:{},async prepareOwnerReconstructionModules(_rows,signal){signal.throwIfAborted();},prepareOwnerRecoveredSourceComponents:async()=>{},prepareOwnerReconstructionMaterials:async()=>{},ownerRecoveredSourceComponents:rows=>rows,ownerReconstructionComponents:rows=>({components:rows,stats:emptyStats()}),prepareOwnerReconstructionComponents:async rows=>({components:rows,stats:emptyStats()}),ownerReconstructionIdentity:()=>false,retireOwnerReconstructionConstruction(scope){assert.ok(scope.stats.pins>0);scope.retirePrepared([],[]);},ownerReconstructionBaseMaterials(){materialBuilds++;control.abortOnMaterials?.abort();if(control.failMaterials)throw Error('tiny material failure');}};
 const shaderModule={prepareInfillPaintPrograms:prepare,root500DataFunctionArities:{paintProgramFragment:2,facadePaintFragmentForCity:1,facadePaintSpecializationForCity:1,describeFacadePaintSource:3},paintProgramPartitionEnabled:()=>true,paintProgramFragment:(key,_city,scope)=>shader(scope,key),facadePaintFragmentForCity:(_city,scope)=>shader(scope),facadePaintSpecializationForCity:(city,scope)=>{assert.ok(scope?.stats.pins>0);configurations++;if(control.failSpecialization)throw Error('tiny specialization failure');return{city,fragmentBytes:null,fullFragmentBytes:null};},describeFacadePaintSource:(city,fragment,_kind,scope)=>{assert.ok(scope?.stats.pins>0);return{city,fragmentBytes:Buffer.byteLength(fragment),fullFragmentBytes:null};},paintProgramKey:()=> 'base',clearInfillPaintSources(){sourceClears++;}};
 // Bind authority to the existing tiny builder and resource, not model assets.
 // Upper bounds of the fixture's one tiny fragment; describing bounds builds and borrows nothing.
 shaderModule.describeFacadePaintSourceBounds=(_city,_key,scope)=>{assert(scope&&!scope.stats.disposed,'source bounds require the live candidate scope');return shaderBudgets.shaderSourceBounds(shaderBudgets.shaderSourceText(fixtureFragment(_key??'base'),['tiny-infill-resident-plan']));};
 shaderModule.INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY=programs.createProgramSourceAuthority({inputs:[resource.canonicalSHA256],builders:[shaderModule.paintProgramFragment,shaderModule.facadePaintFragmentForCity]});
 const programPlanModule=evaluate(source('painted/infill/safety/infill-prepared-program-plan.ts'),id=>{if(id==='./facade-paint-fragment')return shaderModule;if(id==='../../../safety/prepared-source')return preparedSources;if(id==='../../../safety/utf8-byte-length')return evaluate(source('safety/utf8-byte-length.ts'));throw Error('Unexpected infill plan dependency '+id);});
 const displayBudget=loadInfillDisplayBudget();
 const viewportModule=evaluate(source('safety/viewport-request.ts'));
 const modules={
  '../../../safety/paint-program-idle-retirement':runtime.load('safety/paint-program-idle-retirement'),
  './infill-equivalent-program-families':evaluate(source('painted/infill/safety/infill-equivalent-program-families.ts'),id=>{assert.equal(id,'./building-surface-style');return evaluate(source('painted/root500/safety/building-surface-style.ts'));}),
  '../../../safety/viewport-request':viewportModule,
  '../../../safety/render-runtime/program-grant-handoff':evaluate(source('safety/render-runtime/program-grant-handoff.ts')),
  './infill-prepared-program-plan':{createInfillPreparedProgramPlan(options){const plan=programPlanModule.createInfillPreparedProgramPlan(options);programPlans.push(plan);return plan;}},
  '../../../safety/solar-shadow-admission':solarShadowAdmissionDouble(),
  '../../../safety/solar-shadow-preparation':solarPreparation,
  '../../../safety/component-readback':evaluate(source('safety/component-readback.ts')),
  '../../../safety/frozen-data-scope':{...scopeModule,createFrozenDataScope:()=>createScope()},
  '../../../safety/resident-gpu-lifecycle':lifecycle,
  '../../../safety/render-runtime/program-preparation':{...programs,scheduleRenderResourceSteps(context,recipe){return programs.scheduleRenderResourceSteps(context,{...recipe,step(){if(control.holdAdmissionAfter!==undefined&&(control.admissionSteps??0)>=control.holdAdmissionAfter)return false;control.admissionSteps=(control.admissionSteps??0)+1;return recipe.step();}});},createProgramPreparationOwner(...args){const owner=programs.createProgramPreparationOwner(...args);control.queueOptional=(revision,current)=>owner.work(gl,{resource:'tiny-optional-capture',revision,current,priority:'capture',retainReady:false,work(){}});return{...owner,get stats(){assert(!control.forbidProgramStats,'draw readiness must not read full program stats');return owner.stats;},work(context,recipe){
   if(recipe.resource.startsWith('main-material-masks:')&&control.holdMainMasks)return false;
   if(recipe.resource.startsWith('candidate-pack:')&&control.holdSourceReady&&sourceWorkRuns){preparationEvents.push({kind:'held-source-ready',resource:recipe.resource,revision:recipe.revision});return false;}
   const request={resource:recipe.resource,revision:recipe.revision,current:recipe.current,executions:0};workRequests.push(request);const ready=owner.work(context,{...recipe,work(){request.executions++;if(recipe.resource.startsWith('candidate-pack:'))sourceWorkRuns++;recipe.work();}});preparationEvents.push({kind:'work',resource:recipe.resource,revision:recipe.revision,ready,retainReady:recipe.retainReady});return ready;
  },compile(context,recipe){preparationEvents.push({kind:'compile',resource:recipe.resource});return owner.compile(context,recipe);}};}},
  // This fixture is one page: its resident geometry owners use the page store that the
  // chunk input charges (in the product both are getPageChunkResourceStore()).
  '../../../safety/render-runtime/resident-capture':{createResidentCaptureOwnership},
  '../../../safety/render-runtime/resident-geometry':{...geometry,createResidentGeometryOwner:(options={})=>geometry.createResidentGeometryOwner({store,...options})},
  '../../../safety/family-paint-program':families,
  '../../../safety/custom-layer-render-error':{guardCustomLayerRender:(_map,_id,render)=>render},
  './owner-reconstruction':owner,'./indexed-pick-blocks70':pick,
  './f058-upper-paint312':evaluate(source('painted/infill/safety/f058-upper-paint312.ts'),id=>{if(id==='./progressive-native-signature')return evaluate(source('painted/infill/safety/progressive-native-signature.ts'),name=>{assert.equal(name,'../../root500/safety/progressive-native-signature');return evaluate(source('painted/root500/safety/progressive-native-signature.ts'));});if(id==='./owner-shape-patch-display')return{ownerShapePatchProfile:()=>undefined};throw Error(id);}),
  '../../root500/safety/root500-derived-display-data':{prepareRoot500DerivedDisplays:async()=>{}},
  './infill-paint-programs':{prepareInfillPaintPrograms:prepare},
  './facade-paint-fragment':shaderModule,
  './paint-run-visibility':{paintBoxOutsideClip:(box,matrix)=>control.realVisibility?visibility.paintBoxOutsideClip(box,matrix):false,paintRunIntersectsVisible:visibility.paintRunIntersectsVisible},
  '../../delegated500/safety/paint-run-visibility':evaluate(source('painted/delegated500/safety/paint-run-visibility.ts')),
  './progressive-paint':{isProgressivelyPainted:c=>control.paintedIDs?.has(key(c))??false,progressivePaintFingerprints:{},progressivePaintCount:()=>undefined,progressivePaintCityCount:()=>undefined,prepareRoot500ProgressiveData:prepare,prepareInfillProgressiveData:async(rows,city,signal,scope)=>{progressiveDemands.push([...rows]);return prepare(rows,city,signal,scope);},progressivePaintData:rows=>{control.progressiveRecords=Object.freeze(rows.filter(c=>control.paintedIDs?.has(key(c))).map(c=>Object.freeze({city:c.city,objectId:c.objectId,partId:c.partId,coloredVertices:count([c])})));return new Float32Array(count(rows)*4);},progressivePaintRejections:()=>[],progressiveRenderStatus:()=>structuredClone(control.progressiveRecords??[]),progressiveRenderView:()=>control.progressiveRecords??[],snapshotProgressiveRenderStatus:()=>control.progressiveRecords??[],progressiveAdmission:()=>undefined},
  './facade-paint-frame':{facadePaintData(rows){const data=new Float32Array(count(rows)*5);let at=0;for(const c of rows)for(let i=0;i<count([c]);i++){data[at*5+4]=control.familyByID?.get(c.objectId)??7;at++;}return data;}},
  './owner-display-budget':{...displayBudget,async prepareInfillData(rows,signal,scope){assert(scope&&!scope.stats.disposed,'budget preparation requires the real live batch scope');await displayBudget.prepareInfillData(rows,signal,scope);preparationEvents.push({kind:'display-budget-prepared',scope,rows:[...rows]});},fitOwnerDisplayBudget(rows,cap,options,scope){assert(scope&&!scope.stats.disposed&&scope.stats.pins>0,'budget fitting borrows the live candidate scope');preparationEvents.push({kind:'display-budget-fit',scope,rows:[...rows]});return displayBudget.fitOwnerDisplayBudget(rows,cap,options,scope);}},
  './source-role-display':{sourceRoleBatchIncluded:()=>true,sourceRoleDisplayProfile:()=>null},
  './source-part-display':{exactNativePartDisplay:rows=>({drawable:rows,held:[]})},
  './s434-aggregate-display':{s434AggregateBatchIncluded:()=>true},
  './s434-owner138-compat':{checkS434Owner138Replacement:()=>null},
  './f260-canopy-recovery267':{f260CanopyDisplay267:rows=>({drawable:rows,held:[]}),applyF260CanopyPaint267:()=>{}},
  './infill-f288-coplanar-roof':{infillF288ClipCoplanarFacilityRoofs:rows=>rows},
  './be-tv-base-repair':{beTVBaseRepairPlan1:()=>({enabled:false}),beTVBaseRepairDrawAlias1:c=>c,beTVBaseRepairBatchIncluded1:()=>true,beTVBaseRepairIdentity1:()=>false},
  './be-tv-base-westfold70':{beTVBaseWestFold70Transaction:rows=>({rows,enabled:false,legacyPlan:{enabled:false}}),beTVBaseWestFold70BaseRows:()=>[]},
  './source-partial-gate-gpu-diagnostic':evaluate(source(`painted/${provider}/safety/source-partial-gate-gpu-diagnostic.ts`)),
 };
 const factories={retainF154ReconstructionConstruction:f154Construction.retainF154ReconstructionConstruction,retireF154ReconstructionConstruction:f154Construction.retireF154ReconstructionConstruction,createResidentReflectionUniforms:()=>()=>{},createResidentReflectionObjects:()=>({}),defaultSceneEnvironment:()=>({instantISO:'2026-01-01T00:00:00Z',sunlight:true,shadows:true,motion:false}),sceneSolarLight:()=>({shadowVector:control.sun?[.2,.3]:undefined,direction:[0,1,0]}),createSceneLightUniforms:()=>()=>{},createProjectedShadowMask:()=>({release(){},draw(_gl,_m,_opacity,draw){draw();return true;},stats:{}}),createNativeSourceReadback:()=>({destroy(){},observe(){},stats:{}}),createRathausProxyMasks:()=>tinyRathausProxyMasks(control),createResidentCaptureRuntime:adapter=>{capture=adapter;return{invalidate(){},coverage(){return adapter.snapshot(true);},prepareSolar(){return{status:'ready'};}}},createSolarShadowPreparationBudget:()=>({})};
 function imported(name){if(name in factories)return factories[name];if(name==='root500DataFunctionArities')return{};if(name==='FROZEN_PAINT_IDS')return new Set();if(name==='DESCRIPTION_BINDINGS'||name==='OWNER_SHAPE_PATCH_PROFILES')return[];if(name==='SOURCE_SHADOW_VECTOR')return[1,1];if(name==='sourceShadowOpacity')return()=>.3;if(/GLSL|SOURCE_SHA/.test(name))return'';if(/^appendF\d+DerivedDisplay$/.test(name))return rows=>rows;if(name==='applyF018S036Compatibility')return(_r,_p,_f,_plan,current)=>current;if(/^apply/.test(name))return()=>({enabled:false});if(name==='paintRunIntersectsVisible')return()=>true;if(/^is|Identity$|Discard$|Intersects|Certified/.test(name))return()=>false;if(/Readback/.test(name))return()=>null;if(name==='nativePaintSignature')return()=> 'tiny';if(name==='acceptPaintComponent')return()=>true;if(name==='paintMode')return()=>mode;if(name==='paintOverride')return()=>override;if(name==='uploadFacadeLayouts')return()=>{};if(name==='withSceneSolarShadowReceiver')return(_gl,_matrix,draw)=>draw();if(name==='pruneOwner6307Fragment'||name==='withResidentReflectionClip')return value=>value;return()=>{throw Error('Unspecified tiny dependency '+name);};}
 // Chunk/packing/residency/store/shader-budget imports are the real runtime
 // modules of this graph (never stubbed); every other import keeps its double.
 const realRuntime=rendererRuntime(runtime,provider);
 const cache=new Map(),dependency=id=>{if(!cache.has(id)){const real=modules[id]?undefined:realRuntime(id);if(real){cache.set(id,real);return real;}const exports=modules[id]??(id==='./infill-scoped-functions'?loadInfillScopedFunctions(dependency):{});cache.set(id,new Proxy(exports,{get:(o,name)=>{if(!Reflect.has(o,name))o[name]=imported(String(name));return Reflect.get(o,name);}}));}return cache.get(id);};
 const renderer=evaluate(source(`painted/${provider}/safety/building-mesh-renderer.ts`),dependency),map={getCenter:()=>({lng:8,lat:53}),getCanvas:()=>({width:512,height:512,clientWidth:512,clientHeight:512,getBoundingClientRect:()=>({left:0,top:0,width:512,height:512})}),on:(name,fn)=>handlers.set(name,fn),off:(name,fn)=>{if(handlers.get(name)===fn)handlers.delete(name);},triggerRepaint(){}};
 const globals={setTimeout:(fn)=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),document:new EventTarget(),location:{search:'',hostname:'example.invalid'},window:{devicePixelRatio:1}};
 async function environment(run){const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});try{return await run();}finally{for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
 // The page owner collects page-store retirements at each map render and once more after
 // destroying its renderers (painted-map); this fixture is that owner for its renderers.
 const create=()=>{const r=renderer.createBuildingMeshRenderer(map,'leipzig',{clock:()=>1000,reducedMotion:true}),destroy=r.destroy;r.destroy=(...args)=>{try{return destroy.apply(r,args);}finally{store.collectRetired();}};return r;},signal=()=>new AbortController().signal;
 // The manager supplies an authoritative source chunk input with every batch;
 // its page store is this graph's store, so chunk CPU/GPU entries are charged.
 const store=stores.createChunkResourceStore({budget:budgets.createResourceBudget({limitBytes:256*1024**2,recentLimitBytes:0}),recentMaxEntries:0,recentMaxIdleMs:0});
 async function prepareBatch(r,rows,abortSignal=signal(),demand=rows,separateGroups=false){const scope=createScope();try{const input=fixtureChunkInput(chunkInputs,store,rows);if(separateGroups)input.groups=rows.flatMap(row=>fixtureChunkInput(chunkInputs,store,[row]).groups);return await r.prepareBatches(rows,abortSignal,scope,undefined,undefined,demand,input);}catch(error){scope.release();throw error;}}
 const commit=(r,b,g,shadow)=>r.setBatches(b.input,g,shadow,...Array(8).fill(undefined),b);
 function one(){const entry=timers.entries().next().value;if(!entry)return false;timers.delete(entry[0]);admitted=true;try{entry[1]();}finally{admitted=false;}return true;}
 const render=r=>renderLocal(r);
 function localMain(cameraX=control.cameraX??0){const unit=40075016.68557849*Math.cos(53*Math.PI/180),anchor=[188/360,(1-Math.log(Math.tan(Math.PI/4+53*Math.PI/360))/Math.PI)/2];return[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-anchor[0]*unit-cameraX,0,anchor[1]*unit,1];}
 function renderLocal(r){r.layer.render(gl,{defaultProjectionData:{mainMatrix:localMain()}});store.collectRetired();}
 // Chunk CPU packing and GPU residency settle through page-store promises, so
 // each frame or timer task is followed by its microtasks, as in a browser.
 const drain=()=>new Promise(resolve=>setImmediate(resolve));
 async function settle(r,predicate=()=>r.isPickReady()){for(let i=0;i<200;i++){render(r);await drain();if(predicate())return;one();await drain();}assert.fail('bounded synthetic scheduler did not settle: '+JSON.stringify(r.stats.geometryPreparation));}
 return{store,drain,viewport:viewportModule,environment,create,prepareBatch,commit,programPlans,progressiveDemands,get sourceClears(){return sourceClears;},control,preparationEvents,workRequests,get sourceWorkRuns(){return sourceWorkRuns;},get materialBuilds(){return materialBuilds;},uploads,subUploads,buffers,deletedBuffers,deletedPrograms,deletedVAOs,handlers,scopes,ledgers,gl,draws,submitted,shaderReads,one,render,renderLocal,localMain,settle,get capture(){return capture;},set mode(value){mode=value;},set override(value){override=value;},get sourceBuilds(){return sourceBuilds;},set onUpload(fn){onUpload=fn;},get configurations(){return configurations;},get disposed(){return disposed;},failNextUpload(n=1){control.failUploadAt=attempt+n;},loseNextUpload(n=2){control.lostUploadAt=attempt+n;}};
}

function drawReadiness(h,r){h.control.forbidProgramStats=true;try{const state=r.getDrawReadiness();assert.equal(typeof state.ready,'boolean');assert.equal(typeof state.preparing,'boolean');if(state.ready){assert.equal(r.isPickReady(),true,'a complete current main draw must retain pick authority');assert.equal(state.preparing,false,'a complete main draw cannot still report preparation');}return state;}finally{h.control.forbidProgramStats=false;}}

function assertPublishedComponent(actual,expected){
 assert.deepEqual(actual,expected);if(!expected)return;
 for(const name of ['sourceFeature','componentGeometry','batches','origin','box'])assert.strictEqual(actual[name],expected[name],name+' retains its canonical reference');
 for(let i=0;i<expected.batches.length;i++)for(const name of ['positions','normals','indices','color'])assert.strictEqual(actual.batches[i][name],expected.batches[i][name],name+' retains its canonical buffer');
}
function assertPublicCopies(renderer,identity,source){
 const raw=renderer.borrowSurfaceComponent(identity),before=structuredClone(raw),sourceBefore=structuredClone(source),metadata=renderer.getComponent(identity),full=renderer.getSurfaceComponent(identity),other=renderer.getSurfaceComponent(identity);
 const names=['city','objectId','partId','generation','componentGeometry','sourceFeature','displayEstimates'];assert.deepEqual(Object.keys(metadata).sort(),[...names].sort());assert.deepEqual(metadata,Object.fromEntries(names.map(name=>[name,raw[name]])));assert.equal('batches'in metadata,false);
 assert.deepEqual(full,before);assert.deepEqual(other,before);for(const name of ['positions','normals','indices','color']){assert.notStrictEqual(full.batches[0][name],raw.batches[0][name]);assert.notStrictEqual(full.batches[0][name],other.batches[0][name]);}
 metadata.sourceFeature.properties.__publicMutation=true;metadata.componentGeometry.coordinates[0][0][0]+=1;metadata.displayEstimates={...metadata.displayEstimates,__publicMutation:true};full.batches[0].positions[0]=123;full.batches[0].normals[0]=.625;full.batches[0].indices[0]=2;full.batches[0].color[0]=.875;
 assert.deepEqual(renderer.getSurfaceComponent(identity),before);assert.deepEqual(other,before);assert.deepEqual(renderer.borrowSurfaceComponent(identity),before);assert.deepEqual(source,sourceBefore,'public metadata/full mutations cannot change canonical source input');
 const sourceCopy=renderer.getSourceComponent(identity);sourceCopy.batches[0].positions[0]=321;assert.deepEqual(renderer.getSurfaceComponent(identity),before);assert.deepEqual(source,sourceBefore);
}
function assertReleasedSourcePlans(h){for(const plan of h.programPlans){assert.equal(plan.preparedSourceStats.sourceCharacters,0,'terminal plan retains no assembled source or analysis');assert.equal(plan.preparedSourceStats.released,true);}}
// The capture adapter's snapshot is owned and chunk-shaped (resident-capture.ts): a pass takes it,
// reads it and releases it before returning, so an observation never pins the published scope or
// geometry. observeCapture does exactly that; components/runs are the chunks' own rows in order.
function observeCapture(h,solar=false){const snapshot=h.capture.snapshot(solar),{retain:_retain,release:_release,...observed}=snapshot;try{const chunks=observed.chunks??[];return{...observed,chunks,components:chunks.flatMap(chunk=>chunk.components),runs:chunks.flatMap(chunk=>chunk.runs)};}finally{snapshot.release?.();}}
function planCapture(observed,view,maxTriangles,maxDraws,cull=true){return reflection.planResidentReflectionChunks(observed.chunks.map(chunk=>({components:chunk.components,runs:chunk.runs,matrix:view?chunk.matrix(view):[],indexCount:chunk.indexCount,cull})),maxTriangles,maxDraws);}
function collectRetiredFrames(h){for(let i=0;i<4&&(h.buffers.size||h.store.stats.retiring);i++)h.store.collectRetired();assert.equal(h.store.stats.retiring,0,'page-store retirement completes within 4 frame boundaries');}
function assertSameChunkVAOs(actual,expected){assert.equal(actual.chunks.length,expected.chunks.length);assert(expected.chunks.length>0);actual.chunks.forEach((chunk,i)=>assert.strictEqual(chunk.vao,expected.chunks[i].vao,'the published chunk VAO is unchanged'));}
test('infill preparation retirement releases an unadopted workspace but preserves candidate and resident ownership',async()=>{
 const h=fixture(),availability=runtime.load('safety/render-runtime/pressure-availability'),register=availability.registerPressureAvailability,workspaces=new Set();
 // Observe the real lazy registration and release; shared page participants keep their own lifetime.
 availability.registerPressureAvailability=(...args)=>{const value=register(...args);if(args[1]!=='prepared-source')return value;const token={};workspaces.add(token);return Object.freeze({...value,release(){try{return value.release();}finally{workspaces.delete(token);}}});};
 await h.environment(async()=>{
  const r=h.create();let abandoned,adopted;
  try{
   abandoned=await h.prepareBatch(r,[component(1)]);
   assert.equal(workspaces.size,0,'cold preparation defers pressure registration until an admitted source build');
   abandoned.release();abandoned.scope.release();assert.equal(abandoned.programPlan.preparedSourceStats.released,true);assert.equal(workspaces.size,0);
   abandoned.release();assert.equal(workspaces.size,0,'retirement is idempotent');
   adopted=await h.prepareBatch(r,[component(2)]);h.commit(r,adopted,1);adopted.release();adopted.scope.release();
   assert.equal(adopted.programPlan.preparedSourceStats.released,false,'candidate keeps the handed-off workspace');assert.equal(workspaces.size,0);
   r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);adopted.release();
   assert.equal(adopted.programPlan.preparedSourceStats.released,false,'published renderer still owns its workspace');assert.equal(workspaces.size,1,'actual source build registers the retained workspace');
   r.destroy();assertReleasedSourcePlans(h);assert.equal(workspaces.size,0,'destroy releases the real workspace availability registration');
  }finally{r.destroy();abandoned?.release();abandoned?.scope.release();adopted?.release();adopted?.scope.release();availability.registerPressureAvailability=register;}
 });
});
test('infill cold preparation and pack defer every source build and GPU allocation until the actual context scheduler',async()=>{
 const h=fixture();h.control.realVisibility=true;await h.environment(async()=>{
  const publishedAttempt=new AbortController(),r=h.create();
  const a=await h.prepareBatch(r,[component(1)],publishedAttempt.signal);h.commit(r,a,1);a.scope.release();
  assert.equal(h.sourceBuilds,0);assert.equal(h.uploads.length,0);assert.equal(r.getRevision().generation,0);assert.equal(r.getComponent(component(1)),undefined);assert.equal(r.isPickReady(),false);
  assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:false},'disabled candidates do not wait forever');
  r.layer.onAdd({},h.gl);r.setEnabled(true);h.render(r);assert.equal(h.sourceBuilds,0,'render only submits demand');assert.equal(h.uploads.length,0);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true});
  h.control.holdSourceReady=true;h.one();assert.equal(h.sourceWorkRuns,1);assert.equal(r.stats.programPreparation.ready,1,'the real owner retains the completed source marker until its caller consumes it');const admittedMetadataReads=h.sourceBuilds;assert.equal(admittedMetadataReads,0,'scalar metadata preparation does not construct the unused full source');assert.equal(h.configurations,1,'metadata is still prepared in the admitted source work');const budgetPreparation=h.preparationEvents.filter(event=>event.kind==='display-budget-prepared');assert.equal(budgetPreparation.length,1);assert.strictEqual(budgetPreparation[0].scope,a.scope);assert.deepEqual(budgetPreparation[0].rows,a.displayComponents);budgetPreparation[0].rows.forEach((row,i)=>assert.strictEqual(row,a.displayComponents[i],'budget preparation retains the canonical DISPLAY cohort'));assert.equal(h.submitted.length,0,'metadata preparation submits no shader');
  h.render(r);assert.equal(h.preparationEvents.filter(e=>e.kind==='compile').length,0,'callback state alone cannot bypass a false source-ready result');assert.equal(h.sourceBuilds,admittedMetadataReads,'waiting on the source-ready result performs no extra source read');assert.equal(h.submitted.length,0);assert.equal(h.uploads.length,0);assert.equal(r.getRevision().generation,0);
  h.control.holdSourceReady=false;for(let i=0;i<200&&r.getRevision().generation!==1;i++){h.render(r);h.one();await h.drain();}assert.equal(r.getRevision().generation,1);h.render(r);
  const optionalGeneration=r.getRevision().generation;
  h.control.queueOptional(optionalGeneration,()=>!h.control.lost&&!a.scope.stats.disposed&&a.scope.stats.pins>0&&r.getRevision().generation===optionalGeneration);assert.equal(r.stats.programPreparation.pending,1);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'atomic publication includes the required visible MD program and optional work cannot override readiness');
  await h.settle(r);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});const sourceConsumed=h.preparationEvents.findIndex(e=>e.kind==='work'&&e.resource.startsWith('candidate-pack:')&&e.ready),firstCompile=h.preparationEvents.findIndex(e=>e.kind==='compile');assert(sourceConsumed>=0&&firstCompile>sourceConsumed);assert.equal(h.preparationEvents.filter(e=>e.kind==='work'&&e.resource.startsWith('candidate-pack:')&&e.ready).length,1);assert.equal(h.sourceWorkRuns,1);const budgetFits=h.preparationEvents.filter(event=>event.kind==='display-budget-fit');assert.equal(budgetFits.length,1);assert.strictEqual(budgetFits[0].scope,a.scope,'prepare and fit use the same pinned batch scope');assert.equal(r.stats.programPreparation.ready,0,'terminal publication leaves no source/geometry ready markers');assert.equal(r.getRevision().generation,1);assert.equal(h.buffers.size,5);assert.equal(h.uploads.length,5,'one canonical five-buffer allocation, no placeholder buffers');assert.equal(h.configurations,1);assert.equal(r.stats.gpuLifecycle.initialized,true);
  const vertex=h.uploads.find(x=>x.data.length===27),state=h.uploads.find(x=>x.data.length===3&&x.data instanceof Float32Array);assert(vertex);assert(state);assert(Object.is(vertex.data[1],-0));assert.equal(r.residentVertexCount,3);assertPublicCopies(r,a.input[0],a.input[0]);
  const capture=observeCapture(h);assert.equal(capture.status,'active');assert.equal(capture.chunks.length,1);assert.equal(capture.components[0].objectId,'osm/way/1');assert.equal(capture.runs.length,1);assert(capture.runs.every(run=>run.program));assert(capture.runs[0].program.fragment.includes('7.'));
  assert.equal(h.shaderReads.every(scope=>scope===a.scope),true);assert.equal(h.submitted.filter(x=>x.type===h.gl.FRAGMENT_SHADER).length,2,'base plus the current visible MD family are ready before draw readiness');
  publishedAttempt.abort();assert.equal(a.scope.stats.disposed,false,'Published state detaches the attempt cancellation listener');assert.equal(r.isPickReady(),true);
  assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'optional owner jobs never override ready');h.handlers.get('move')();assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true},'a changed view waits for its own complete main draw');await h.settle(r,()=>drawReadiness(h,r).ready);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'the actual fresh frame restores current-view readiness');
  h.override=2;h.control.failLink=true;h.render(r);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true},'a missing required visible colour program is preparing');await h.settle(r,()=>!!drawReadiness(h,r).failure);assert.match(drawReadiness(h,r).failure,/tiny required colour link failure/);
  h.control.failLink=false;h.mode=0;assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true},'inactive MD failure is no longer terminal, but the new paint mode still requires its own complete main draw');await h.settle(r,()=>drawReadiness(h,r).ready);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'the actual inactive-MD frame clears the old failure and signs its own main witness');
  r.setPageHidden(true);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:false});r.destroy();assertReleasedSourcePlans(h);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:false});assert.equal(a.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill atomic publication waits for visible MD readiness while offscreen colours remain capture-only',async()=>{
 const h=fixture();h.control.realVisibility=true;h.control.familyByID=new Map([['osm/way/1',7],['osm/way/2',9]]);await h.environment(async()=>{
  const first=component(1),offscreen=component(2);for(let i=0;i<offscreen.batches[0].positions.length;i+=3)offscreen.batches[0].positions[i]+=10;
  const r=h.create(),batch=await h.prepareBatch(r,[first,offscreen]);assert.deepEqual(h.progressiveDemands.at(-1),[first,offscreen].map(({city,objectId,partId})=>({city,objectId,partId})),'the closed scalar demand retains both canonical identities in original order, including the offscreen caster');h.commit(r,batch,1);batch.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);
  for(let i=0;i<200&&r.getRevision().generation!==1;i++){h.render(r);h.one();await h.drain();}
  assert.equal(r.getRevision().generation,1);h.render(r);assert.equal(h.buffers.size,5);assert(r.getComponent(first));assert(r.getComponent(offscreen));const conservative=r.getProgramPreparationStats()[0].resourceResidency;assert.equal(conservative.mainCount,1,'the atomic gate selects the current actual camera view');assert.equal(conservative.captureCount,0,'solar has not been enabled');
  assert.deepEqual(new Set(h.preparationEvents.filter(e=>e.kind==='compile').map(e=>colourFamily(e.resource))),new Set(['0','7']),'base and only the current visible MD family are demanded before atomic publication');assert.equal(h.submitted.filter(row=>row.type===h.gl.FRAGMENT_SHADER).length,2,'base and visible MD fragments are each submitted once');
  assert.equal(r.stats.programPreparation.ready,0,'source and terminal upload ready markers are consumed');assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});
  const published=observeCapture(h);assert.equal(published.components.length,2);assert.equal(published.runs.length,2);assert.equal(published.runs.filter(run=>run.program).length,1,'the exact prepared visible MD program transfers atomically; offscreen MD stays absent');
  const beforeDraw=h.draws.length;h.render(r);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});assert(h.draws.length>beforeDraw,'a published candidate draws its complete visible MD frame immediately');assert.equal(r.getReadinessDiagnostic().partition.required,1);assert.equal(r.getProgramPreparationStats()[0].resourceResidency.mainCount,1,'the actual camera clips only main demand');
  await h.settle(r);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});assert(!h.preparationEvents.some(e=>e.kind==='compile'&&colourFamily(e.resource)==='9'),'offscreen resident colour cannot delay geometry or first-screen readiness');
  const screenReady=observeCapture(h),incomplete=planCapture(screenReady,h.localMain(10),100,100);
  assert.equal(screenReady.runs.filter(run=>run.program).length,1);assert.equal(incomplete.complete,false);assert.equal(incomplete.reason,'missing-program');assert.equal(incomplete.triangles,0,'a reflection viewing the other resident run remains explicitly incomplete');
  const beforeDepth=h.preparationEvents.length;h.control.sun=true;r.setSunlightInstant('2026-01-02T00:00:00Z');r.setCaptureDemand({kind:'solar',token:'infill-complete-resident-solar',active:true});let solar;
  for(let i=0;i<200;i++){solar=r.prepareSolarShadow();if(solar.status==='ready'&&solar.ready===2)break;h.render(r);h.one();}
  assert.equal(solar.status,'ready');assert.equal(solar.ready,2);const solarDemand=r.getProgramPreparationStats()[0].resourceResidency;assert.equal(solarDemand.mainCount,1);assert.equal(solarDemand.captureCount,2,'full solar preparation includes the offscreen original colour recipe');assert.deepEqual(new Set(h.preparationEvents.slice(beforeDepth).filter(e=>e.kind==='compile').map(e=>colourFamily(e.resource))),new Set(['9']),'solar demand reuses ready colour7 and prepares only the missing original colour recipe');
  const depth=observeCapture(h,true),depthPlan=planCapture(depth,undefined,100,100,false);assert.equal(depthPlan.complete,true);assert.equal(depthPlan.components.length,2);assert.equal(depthPlan.triangles,2,'later solar preparation still covers both resident DISPLAY rows');
  assert.strictEqual(depth.runs[0].program,screenReady.runs[0].program,'capture retains the exact ready colour program');const compiled=h.preparationEvents.filter(e=>e.kind==='compile').length;
  h.control.cameraX=10;h.handlers.get('move')();await h.settle(r,()=>drawReadiness(h,r).ready);assert.equal(r.getRevision().generation,1);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'the newly visible family already has its original colour program from solar demand');
  assert.equal(h.preparationEvents.filter(e=>e.kind==='compile').length,compiled,'camera demand cannot submit a duplicate depth/colour executable');assert.equal(h.sourceWorkRuns,1);assert.equal(h.materialBuilds,1,'camera/capture preparation never re-derives the model');
  const allColours=observeCapture(h),allPlan=planCapture(allColours,undefined,100,100,false);assert.equal(allPlan.complete,true);assert.equal(allPlan.components.length,2);const mainColour=depth.runs[1].program;r.setCaptureDemand({kind:'solar',token:'obsolete-infill-solar',active:false});assert.equal(r.getProgramPreparationStats()[0].resourceResidency.captureCount,2);r.setCaptureDemand({kind:'solar',token:'infill-complete-resident-solar',active:false});const retired=r.getProgramPreparationStats()[0].resourceResidency;assert.equal(retired.mainCount,1);assert.equal(retired.captureCount,0);assert.equal(h.deletedPrograms.includes(mainColour),false);assert.strictEqual(observeCapture(h).runs[1].program,mainColour);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});r.destroy();assertReleasedSourcePlans(h);assert.equal(batch.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill candidate main-mask gate retains old residency and cancellation releases each borrowed grant',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
  const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],capture=observeCapture(h),before=r.getProgramPreparationStats()[0].shared;
  h.control.holdMainMasks=true;const b=await h.prepareBatch(r,[component(1)]);h.commit(r,b,2);b.scope.release();await h.settle(r,()=>r.getProgramPreparationStats()[0].resourceResidency.candidateMainProgramCount===1);
  const waiting=r.getProgramPreparationStats()[0];assert.equal(waiting.resourceResidency.candidateMainReady,false);assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assertSameChunkVAOs(observeCapture(h),capture);assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.disposed,false);assert(waiting.shared.heldReferences>before.heldReferences);
  r.cancelCandidate(99);assert.equal(r.stats.geometryPreparation.candidatePending,true);r.cancelCandidate(2);
  const cancelled=r.getProgramPreparationStats()[0].shared;assert.equal(b.scope.stats.disposed,true);assert.equal(a.scope.stats.disposed,false);assert.equal(cancelled.heldReferences,before.heldReferences);assert.equal(cancelled.releasedReferences-before.releasedReferences,cancelled.grantedReferences-before.grantedReferences,'cancel releases precisely the candidate grants');assert(capture.runs.every(run=>!h.deletedPrograms.includes(run.program)));assert.deepEqual([...h.buffers.keys()],gpu);h.render(r);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});
  h.control.holdMainMasks=false;const c=await h.prepareBatch(r,[component(1)]);h.commit(r,c,3);c.scope.release();await h.settle(r);assert.equal(r.getRevision().generation,3);assert.equal(a.scope.stats.disposed,true);assert(gpu.every(buffer=>h.deletedBuffers.has(buffer)));r.destroy();const final=r.getProgramPreparationStats()[0].shared;assert.equal(final.grantedReferences,final.releasedReferences);assertReleasedSourcePlans(h);assert.equal(c.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill complete factory registers every visible main recipe before waiting and polls ready roles without duplicate grants',async()=>{
 const h=fixture();h.control.familyByID=new Map([['osm/way/1',7],['osm/way/2',9],['osm/way/3',11],['osm/way/4',13]]);await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],first=h.preparationEvents.length;
  h.control.holdMainMasks=true;const b=await h.prepareBatch(r,[component(2),component(3),component(4)]);h.commit(r,b,2);b.scope.release();await h.settle(r,()=>r.getProgramPreparationStats()[0].resourceResidency.candidateMainRequiredCount===3);
  const actual=new Set(h.preparationEvents.slice(first).filter(row=>row.kind==='compile').map(row=>colourFamily(row.resource)));for(const family of ['9','11','13'])assert(actual.has(family),'Pending for one recipe cannot suppress registration of the rest of the actual visible set');assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(drawReadiness(h,r).ready,false);
  h.render(r);const before=r.getProgramPreparationStats()[0].shared.grantedReferences;h.render(r);h.render(r);assert.equal(r.getProgramPreparationStats()[0].shared.grantedReferences,before);
  h.control.holdMainMasks=false;await h.settle(r);assert.equal(r.getRevision().generation,2);assert.equal(a.scope.stats.disposed,true);r.destroy();const done=r.getProgramPreparationStats()[0].shared;assert.equal(done.grantedReferences,done.releasedReferences);assert.equal(b.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill published-resident restoration registers the complete visible set before waiting and requires a fresh full draw',async()=>{
 const h=fixture();h.control.familyByID=new Map([['osm/way/1',9],['osm/way/2',11],['osm/way/3',13]]);await h.environment(async()=>{
  const r=h.create(),rows=[component(1),component(2),component(3)],a=await h.prepareBatch(r,rows);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);r.setReducedMotion(true);await h.settle(r);h.render(r);assert.equal(drawReadiness(h,r).ready,true);
  const cpu=r.borrowSurfaceComponent(rows[0]),canonical=h.uploads.find(v=>v.data.length===81).data,plans=h.plans,epoch=r.getProgramPreparationStats()[0].context.epoch,recoveries=r.stats.contextRecovery.successes;
  h.control.lost=true;h.handlers.get('webglcontextlost')();h.buffers.clear();assertPublishedComponent(r.borrowSurfaceComponent(rows[0]),cpu);assert.equal(a.scope.stats.disposed,false);assert.equal(drawReadiness(h,r).ready,false);
  h.control.lost=false;h.handlers.get('webglcontextrestored')();const requests=h.preparationEvents.length,uploads=h.uploads.length;r.layer.render(h.gl,{defaultProjectionData:{}});assert.equal(h.preparationEvents.slice(requests).filter(row=>row.kind==='compile').length,0,'unknown projection cannot register restoration work');assert.equal(h.uploads.length,uploads);assert.equal(drawReadiness(h,r).ready,false);
  h.render(r);const required=new Set(h.preparationEvents.slice(requests).filter(row=>row.kind==='compile').map(row=>colourFamily(row.resource)));for(const family of ['0','9','11','13'])assert(required.has(family),'the first finite restoration pass registers every actual visible recipe despite Pending');assert.equal(h.uploads.length,uploads);assert.equal(drawReadiness(h,r).ready,false);assert.equal(r.getProgramPreparationStats()[0].context.epoch,epoch+1);assert.equal(r.stats.contextRecovery.successes,recoveries,'initialization and registered material roles are not a completed recovery');
  const grants=r.getProgramPreparationStats()[0].shared.grantedReferences;h.render(r);h.render(r);assert.equal(r.getProgramPreparationStats()[0].shared.grantedReferences,grants);assert.equal(drawReadiness(h,r).ready,false);
  await h.settle(r,()=>drawReadiness(h,r).ready);h.render(r);assert.equal(drawReadiness(h,r).ready,true);assert.equal(r.stats.contextRecovery.successes,recoveries+1,'only the fresh complete main draw completes recovery');assert.equal(r.getRevision().generation,1);assert.equal(h.plans,plans,'published restoration reuses canonical packing');assert.strictEqual(h.uploads.findLast(v=>v.data.length===81).data,canonical);assertPublishedComponent(r.borrowSurfaceComponent(rows[0]),cpu);assert.equal(h.buffers.size,5);assert.equal(r.getProgramPreparationStats()[0].pending,0);
  h.handlers.get('move')();assert.equal(drawReadiness(h,r).ready,false,'a previous full draw is not a witness for a new view');await h.settle(r,()=>drawReadiness(h,r).ready);assert.equal(drawReadiness(h,r).ready,true);r.destroy();assertReleasedSourcePlans(h);assert.equal(a.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill actual publication failure close and hidden cancellation drain adjacent grants without replacing the old resident',async()=>{
 const h=fixture();h.control.familyByID=new Map([['osm/way/1',7],['osm/way/2',9],['osm/way/3',11]]);await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],publishedHeld=r.getProgramPreparationStats()[0].shared.heldReferences;
  const continuation=h.viewport.createViewportRequestContinuation(()=>false),intent=new AbortController();h.control.holdMainMasks=true;
  const drive=async predicate=>{for(let i=0;i<200;i++){await Promise.resolve();await Promise.resolve();h.render(r);if(predicate())return;h.one();}assert.fail('actual infill publication did not reach its bounded checkpoint');};
  // The callback hides (supersedes) its own view. run() retries a callback
  // whose view was superseded even after it returns, so the completed
  // scenario must not re-enter on that retry.
  let completed=false,retries=0;
  await continuation.run(intent.signal,false,async view=>{
   if(completed){retries++;return;}
   try{
   const stage=async publication=>{let batch;publication.stage(async attempt=>{batch=await h.prepareBatch(r,[component(2),component(3)],attempt.signal);attempt.current();h.commit(r,batch,2);batch.scope.release();return new Promise((_,reject)=>{attempt.signal.addEventListener('abort',()=>reject(attempt.signal.reason),{once:true});});});await drive(()=>!!batch&&r.getProgramPreparationStats()[0].resourceResidency.candidateMainProgramCount===2);return batch;};
   const failed=continuation.publication(view.signal,()=>{}),b=await stage(failed),error=Error('successor failed before source preparation');await assert.rejects(failed.finish(()=>{throw error;}),value=>value===error);await Promise.resolve();assert.equal(b.scope.stats.disposed,true);assert.equal(r.getProgramPreparationStats()[0].shared.heldReferences,publishedHeld,'an aborted successor signal releases the transferred adjacent grants');assert.equal(r.getRevision().generation,1);
   const closed=continuation.publication(view.signal,()=>{}),c=await stage(closed);await closed.close();assert.equal(c.scope.stats.disposed,true);assert.equal(r.getProgramPreparationStats()[0].shared.heldReferences,publishedHeld,'close is cancellation, not a new adjacent publication');
   const hidden=continuation.publication(view.signal,()=>{}),d=await stage(hidden);continuation.setHidden(true);r.setPageHidden(true);await hidden.close();assert.equal(d.scope.stats.disposed,true);assert.equal(r.getProgramPreparationStats()[0].shared.heldReferences,publishedHeld,'viewport/visibility abort cannot keep an adjacency holder');assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);
   continuation.setHidden(false);r.setPageHidden(false);h.control.holdMainMasks=false;await h.settle(r,()=>drawReadiness(h,r).ready);assert.equal(drawReadiness(h,r).ready,true,'show returns to the independent published resident, without claiming a new candidate published');completed=true;
   }catch(error){
    // This test deliberately supersedes its view. An assertion after that
    // interruption must fail the test, not be mistaken for a retryable view.
    intent.abort(error);throw error;
   }
  });
  // run() re-attempts a callback whose view was superseded after it settled; the scenario
  // supersedes its view exactly once (setHidden(true)), so exactly one fresh-view retry
  // reaches the guard. More would be unbounded re-entry; none would mean the guard is dead.
  assert.equal(retries,1,'continuation.run() retries the superseded completed callback exactly once');
  r.destroy();const done=r.getProgramPreparationStats()[0].shared;assert.equal(done.grantedReferences,done.releasedReferences);assert.equal(a.scope.stats.disposed,true);assert.equal(h.buffers.size,0);assertReleasedSourcePlans(h);
 });
});

test('infill queued geometry work rejects an obsolete view after the same candidate becomes main-ready again',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
  const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],first=h.workRequests.length,b=await h.prepareBatch(r,[component(1)]);h.commit(r,b,2);b.scope.release();
  const queued=async(offset,exclude)=>{h.control.cameraX=offset;let request;await h.settle(r,()=>{request=h.workRequests.slice(first).find(row=>row.resource.startsWith('geometry-candidate:')&&row.resource!==exclude);return !!request;});return request;};
  const previous=await queued(0);assert.equal(previous.current(),true);assert.equal(previous.executions,0);assert.equal(r.getRevision().generation,1);
  const current=await queued(.125,previous.resource);assert.equal(typeof previous.revision,'number');assert.equal(current.revision,previous.revision);assert.notEqual(current.resource,previous.resource);assert.equal(r.getReadinessDiagnostic().candidate.mainReady,true);
  const requests=h.workRequests.length,compiles=h.preparationEvents.filter(row=>row.kind==='compile').length;for(let i=0;i<2;i++){assert.equal(previous.current(),false,'old queued work cannot inherit a later main-ready view');assert.equal(current.current(),true);}assert.equal(h.workRequests.length,requests);assert.equal(h.preparationEvents.filter(row=>row.kind==='compile').length,compiles);assert.equal(previous.executions,0);assert.equal(current.executions,0);assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(a.scope.stats.disposed,false);
  await h.settle(r);assert.equal(r.getRevision().generation,2);assert.equal(previous.executions,0);assert.equal(current.executions,1);assert.equal(a.scope.stats.disposed,true);assert(gpu.every(buffer=>h.deletedBuffers.has(buffer)));r.destroy();assertReleasedSourcePlans(h);assert.equal(b.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill pending MD candidates leave published render/pick/capture intact, cancel by attempt signal and supersede without stale publication',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
  const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()],capture=observeCapture(h),beforeDraw=h.draws.length,controller=new AbortController(),b=await h.prepareBatch(r,[component(2)],controller.signal),builds=h.sourceBuilds;
  h.commit(r,b,2);b.scope.release();assert.equal(h.sourceBuilds,builds);assert.equal(r.isPickReady(),false);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true});assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assertSameChunkVAOs(observeCapture(h),capture);h.render(r);assert(h.draws.length>beforeDraw,'old published frame still draws while latest readiness is pending');assert.deepEqual([...h.buffers.keys()],gpu);h.renderLocal(r);const picked=await r.pick({x:320,y:192});assert.equal(picked?.objectId,'osm/way/1','Actual ray pick continues against the published generation');assert.equal(picked.generation,1);
  h.one();controller.abort();assert.equal(r.stats.geometryPreparation.candidatePending,false,'the attempt signal cancels the candidate synchronously');
  // The cancelled candidate's scope pin returns when its aborted preparation work settles: one
  // bounded macrotask turn (no timer), not at the abort call itself.
  await h.drain();assert.equal(b.scope.stats.disposed,true);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);h.render(r);assert.equal(r.isPickReady(),true);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(r.stats.programPreparation.ready,0,'attempt cancellation drains the completed source marker');
  const c=await h.prepareBatch(r,[component(3)]);h.commit(r,c,3);c.scope.release();h.one();const d=await h.prepareBatch(r,[component(4)]);h.commit(r,d,4);d.scope.release();await h.drain();assert.equal(c.scope.stats.disposed,true,'superseded multi-step source work releases its scope when cancellation settles');await h.settle(r);assert.equal(r.getRevision().generation,4);assert.equal(r.getComponent(component(3)),undefined);assert(r.getComponent(component(4)));assert.equal(a.scope.stats.disposed,true);assert.equal(h.buffers.size,5);assert.equal(r.stats.programPreparation.ready,0);r.destroy();assertReleasedSourcePlans(h);assert.equal(d.scope.stats.disposed,true);assert.equal(h.buffers.size,0);
 });
});

test('infill real geometry owner preserves old buffers on upload failure and reentrant abort, then publishes a new complete plan',async()=>{
 const h=fixture();h.control.paintedIDs=new Set([key(component(1))]);await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);const old=r.borrowSurfaceComponent(component(1)),gpu=[...h.buffers.keys()];
  const paint=r.getProgressiveRenderStatus();assert.equal(old.displayEstimates.progressivePainted,true);assert.strictEqual(old.sourceFeature,a.input[0].sourceFeature);assert.strictEqual(old.batches[0].positions,a.input[0].batches[0].positions);assert.equal(paint.length,1);assert.equal(paint[0].objectId,'osm/way/1');assert.deepEqual(r.getProgressivePaintFingerprints(),{});h.control.paintedIDs=new Set();
  const sourceFailed=await h.prepareBatch(r,[component(10)]);h.control.failMaterials=true;h.commit(r,sourceFailed,2);sourceFailed.scope.release();await h.settle(r,()=>!!r.stats.geometryPreparation.candidateFailure);h.control.failMaterials=false;assert.match(r.getDrawReadiness().failure,/tiny material failure/);assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(sourceFailed.scope.stats.disposed,true);
  // Existing base/family7 handles are exact cache hits. A new finite candidate family11 forces the actual link path without changing source authority.
  h.control.familyByID=new Map([['osm/way/11',11]]);const colourFailed=await h.prepareBatch(r,[component(11)]);h.control.failLink=true;h.commit(r,colourFailed,2);colourFailed.scope.release();await h.settle(r,()=>!!r.stats.geometryPreparation.candidateFailure);h.control.failLink=false;assert(h.preparationEvents.some(event=>event.kind==='compile'&&colourFamily(event.resource)==='11'),'the newly required original MD recipe reached the real driver');assert.match(r.getDrawReadiness().failure,/tiny required colour link failure/);assert.equal(r.getRevision().generation,1);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(colourFailed.scope.stats.disposed,true);assert.deepEqual(h.control.progressiveRecords,[]);assert.deepEqual(r.getProgressiveRenderStatus(),paint,'failed candidate records cannot replace the published UI receipt');assert.equal(old.displayEstimates.progressivePainted,true);
  const b=await h.prepareBatch(r,[component(2)]);h.failNextUpload(2);h.commit(r,b,2);b.scope.release();await h.settle(r,()=>!!r.stats.geometryPreparation.candidateFailure);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(b.scope.stats.disposed,true);assert.equal(r.isPickReady(),false);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:false,failure:r.stats.geometryPreparation.candidateFailure});
  const packAbort=new AbortController(),packed=await h.prepareBatch(r,[component(30)],packAbort.signal);h.control.abortOnMaterials=packAbort;h.commit(r,packed,3);packed.scope.release();await h.settle(r,()=>!r.stats.geometryPreparation.candidatePending);h.control.abortOnMaterials=undefined;assert.equal(packed.scope.stats.disposed,true);assert.equal(a.scope.stats.disposed,false,'Reentrant pack abort cannot release published SOURCE scope');assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);
  const abort=new AbortController(),c=await h.prepareBatch(r,[component(3)],abort.signal);h.commit(r,c,3);c.scope.release();h.onUpload=()=>{h.onUpload=undefined;abort.abort();};await h.settle(r,()=>!r.stats.geometryPreparation.candidatePending);assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.deepEqual([...h.buffers.keys()],gpu);assert.equal(c.scope.stats.disposed,true);assert.equal(h.deletedBuffers.has(gpu[0]),false);
  h.control.paintedIDs=new Set([key(component(4))]);const d=await h.prepareBatch(r,[component(4)]);h.commit(r,d,4);d.scope.release();await h.settle(r);assert.equal(r.getRevision().generation,4);assert.equal(r.stats.mainGeometryProgramFailure,undefined,'Successful publication clears only prior candidate/upload failures');assert(gpu.every(buffer=>h.deletedBuffers.has(buffer)));assert.equal(h.buffers.size,5);assert.equal(r.getComponent(component(4)).displayEstimates.progressivePainted,true);assert.equal(r.getProgressiveRenderStatus()[0].objectId,'osm/way/4');r.destroy();assert.deepEqual(r.getProgressiveRenderStatus(),[]);assertReleasedSourcePlans(h);assert.equal(h.buffers.size,0);
 });
});

test('infill context loss retains published CPU and latest candidate scopes, reuses canonical arrays, and 2D/destroy drain every owner',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);const old=r.borrowSurfaceComponent(component(1)),canonical=h.uploads.find(x=>x.data.length===27).data;
  const b=await h.prepareBatch(r,[component(2)]);h.commit(r,b,2);b.scope.release();h.one();assert.equal(r.stats.programPreparation.ready,1,'loss occurs after source callback completion but before ready consumption');const materialBuilds=h.materialBuilds;h.control.lost=true;h.handlers.get('webglcontextlost')();h.buffers.clear();assertPublishedComponent(r.borrowSurfaceComponent(component(1)),old);assert.equal(a.scope.stats.disposed,false);assert.equal(b.scope.stats.disposed,false);assert.equal(r.isPickReady(),false);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true});
  h.control.lost=false;h.handlers.get('webglcontextrestored')();for(let i=0;i<200&&r.getRevision().generation!==2;i++){h.render(r);h.one();await h.drain();}assert.equal(r.getRevision().generation,2);h.render(r);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false},'restored candidate publication includes the current visible MD program');await h.settle(r);assert(r.getComponent(component(2)));assert.equal(a.scope.stats.disposed,true);assert.equal(h.buffers.size,5);assert(h.uploads.filter(x=>x.data===canonical).length<=2,'recovery never repacks old canonical vertices');assert.equal(h.materialBuilds,materialBuilds,'a lost source marker is restored without re-running already completed material preparation');assert.equal(r.stats.programPreparation.ready,0);
  const c=await h.prepareBatch(r,[component(3)]);h.commit(r,c,3);c.scope.release();r.setBatches([],4);assert.equal(c.scope.stats.disposed,true);assert.equal(b.scope.stats.disposed,true);
  // Page-store GPU retirement: the empty batch retires the resident chunk buffers, which the page
  // owner deletes at its frame-boundary collect (bounded, at most 4 frames), never through destroy.
  collectRetiredFrames(h);assert.equal(h.buffers.size,0);assert.equal(r.getRevision().generation,4);assert.deepEqual(drawReadiness(h,r),{ready:false,preparing:true},'empty resident resources await their own finite empty-frame witness');h.render(r);assert.equal(r.isPickReady(),true);assert.deepEqual(drawReadiness(h,r),{ready:true,preparing:false});r.destroy();assertReleasedSourcePlans(h);assert.equal(h.buffers.size,0);
 });
});

test('infill facade exports a lazy full source builder and retains no scope-owned generated string map',()=>{
 const text=source('painted/infill/safety/facade-paint-fragment.ts'),ast=ts.createSourceFile('facade',text,99,true),node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fullFacadePaintFragment');assert(node);assert(!text.includes('infillProgramData('));assert(!ast.statements.some(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='FACADE_PAINT_FRAGMENT_GLSL')));
 let calls=0;const api=evaluate(node.getText(ast),name=>{throw Error(name);});assert.equal(typeof api.fullFacadePaintFragment,'function');assert.equal(calls,0);
 const body=ts.transpileModule(node.getText(ast).replace(/^export\s+/,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;const fn=Function('makeFacadePaintFragment','fullProgressiveCompatibility','PROGRESSIVE_FEATURE_GLSL','return '+body)((source,entry)=>{calls++;return source+entry;},value=>value,'tiny');assert.equal(calls,0);assert.equal(fn(),'tinyprogressiveFeatureDispatch');assert.equal(calls,1);
});

test('infill shadow geometry owns only its index allocation and retires borrowed views after successful main publication',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),a=await h.prepareBatch(r,[component(1)]);h.commit(r,a,1);a.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
  h.control.sun=true;r.setSunlightInstant('2026-01-02T00:00:00Z');r.setSolarShadowBoundary({boundarySHA256:'tiny'});await h.settle(r,()=>r.stats.shadowGPUReady&&!r.stats.geometryPreparation.shadowPending);
  assert.equal(r.stats.programPreparation.ready,0,'shadow publication does not retain a terminal ready marker');assert.equal(h.buffers.size,6);const before=[...h.buffers.keys()],shadowWrites=h.uploads.length;assert.equal(h.uploads.slice(5).filter(row=>row.data instanceof Float32Array).length,0,'shadow borrows every appearance/static/state buffer');
  const b=await h.prepareBatch(r,[component(2)]);h.failNextUpload(2);h.commit(r,b,2);b.scope.release();await h.settle(r,()=>!!r.stats.geometryPreparation.candidateFailure);assert.deepEqual([...h.buffers.keys()],before);assert.equal(r.stats.shadowGPUReady,true,'failed main candidates never retire the old shadow view');
  const c=await h.prepareBatch(r,[component(3)]);h.commit(r,c,3);c.scope.release();await h.settle(r);await h.settle(r,()=>r.stats.shadowGPUReady&&!r.stats.geometryPreparation.shadowPending);assert.equal(h.buffers.size,6);assert(before.every(buffer=>h.deletedBuffers.has(buffer)));assert(h.uploads.length>shadowWrites);assert.equal(r.stats.programPreparation.ready,0);r.destroy();assertReleasedSourcePlans(h);collectRetiredFrames(h);assert.equal(h.buffers.size,0);
 });
});


test('infill chunk admission yields between groups, preserves published geometry and cancels a partial successor',async()=>{
 const h=fixture();await h.environment(async()=>{
  const r=h.create(),controller=new AbortController();let old,next;
  try{
   old=await h.prepareBatch(r,[component(1)]);h.commit(r,old,1);old.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
   const published=r.getRevision().generation,rows=[component(2),component(3),component(4)];
   h.control.admissionSteps=0;h.control.holdAdmissionAfter=1;
   next=await h.prepareBatch(r,rows,controller.signal,rows,true);h.commit(r,next,2);next.scope.release();
   await h.settle(r,()=>h.control.admissionSteps===1);
   assert.equal(r.getRevision().generation,published,'partially admitted candidate cannot replace the old scene');
   assert(r.getComponent(component(1)));assert.equal(r.getComponent(component(2)),undefined);
   controller.abort();h.control.holdAdmissionAfter=undefined;
   for(let i=0;i<20;i++){h.one();await h.drain();}
   assert.equal(h.control.admissionSteps,1,'abort cancels remaining group admissions');
   assert.equal(r.getRevision().generation,published);
   const replacement=await h.prepareBatch(r,rows,undefined,rows,true);h.control.admissionSteps=0;h.commit(r,replacement,3);replacement.scope.release();await h.settle(r);
   assert(h.control.admissionSteps>=4,'three groups plus completion advance independently');
   for(const row of rows)assert(r.getComponent(row));
  }finally{controller.abort();h.control.holdAdmissionAfter=undefined;r.destroy();old?.release();next?.release();collectRetiredFrames(h);}
 });
});


test('infill releases a chunk acquired during reentrant candidate cancellation',async()=>{
 const h=fixture(),packing=runtime.load('painted/root500/safety/chunk-mesh-packing'),acquire=packing.acquirePackedMeshChunk;
 await h.environment(async()=>{
  const r=h.create(),controller=new AbortController();let releases=0;
  try{
   const old=await h.prepareBatch(r,[component(1)]);h.commit(r,old,1);old.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r);
   const generation=r.getRevision().generation;
   packing.acquirePackedMeshChunk=(...args)=>{const lease=acquire(...args);controller.abort();return new Proxy(lease,{get(target,name){return name==='release'?()=>{releases++;target.release();}:Reflect.get(target,name,target);}});};
   const next=await h.prepareBatch(r,[component(2)],controller.signal);h.commit(r,next,2);next.scope.release();
   await h.settle(r,()=>controller.signal.aborted);
   for(let i=0;i<12;i++){h.one();await h.drain();}
   assert.equal(releases,1,'the just-acquired lease is returned even before joining candidate.chunks');
   assert.equal(r.getRevision().generation,generation);assert(r.getComponent(component(1)));assert.equal(r.getComponent(component(2)),undefined);
  }finally{packing.acquirePackedMeshChunk=acquire;controller.abort();r.destroy();collectRetiredFrames(h);}
 });
});


test('infill keeps prepared buildings visible while a pan exposes an unprepared family',async()=>{
 const h=fixture();h.control.realVisibility=true;h.control.familyByID=new Map([['osm/way/1',7],['osm/way/2',9]]);
 await h.environment(async()=>{
  const first=component(1),next=component(2);for(let i=0;i<next.batches[0].positions.length;i+=3)next.batches[0].positions[i]+=1.5;
  const r=h.create(),batch=await h.prepareBatch(r,[first,next]);h.commit(r,batch,1);batch.scope.release();r.layer.onAdd({},h.gl);r.setEnabled(true);await h.settle(r,()=>drawReadiness(h,r).ready);
  assert(!h.preparationEvents.some(e=>e.kind==='compile'&&colourFamily(e.resource)==='9'));
  h.control.cameraX=.75;h.handlers.get('move')();const before=h.draws.length;h.render(r);
  assert(h.preparationEvents.some(e=>e.kind==='compile'&&colourFamily(e.resource)==='9'),'pan demands the newly visible exact material');
  assert(h.draws.length>before,'the previously visible building still draws while the new family is pending');
  assert.equal(drawReadiness(h,r).ready,false,'partial draw is not reported as complete');
  await h.settle(r,()=>drawReadiness(h,r).ready);assert.equal(r.getRevision().generation,1,'camera preparation preserves resident geometry');
  r.destroy();assertReleasedSourcePlans(h);assert.equal(h.buffers.size,0);
 });
});
