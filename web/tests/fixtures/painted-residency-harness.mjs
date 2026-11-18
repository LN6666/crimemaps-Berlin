import {f154Construction} from '../support/f154-construction-boundary.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createSourceModules} from '../support/fixtures-managers-b-source-modules.mjs';
import {createResidentCaptureOwnership,RENDERER_RUNTIME_MODULES,RENDERER_RUNTIME_DEPENDENCIES,rendererRuntime,fixtureChunkInput,solarShadowAdmissionDouble,tinyRathausProxyMasks} from '../support/fixtures-managers-b-renderer-runtime.mjs';

const source=path=>fs.readFileSync(new URL('../../src/'+path,import.meta.url),'utf8');
export function evaluate(text,require=()=>{throw Error('Unexpected leaf import');}){const sf=ts.createSourceFile('fixture.ts',text,ts.ScriptTarget.Latest,true),imports=sf.statements.filter(ts.isImportDeclaration),rest=sf.statements.filter(n=>!ts.isImportDeclaration(n));text=[...imports,...rest].map(n=>n.getText(sf)).join('\n');const code=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);return module.exports;}
const infillScopeMetadata=new Map();
export function loadInfillScopedFunctions(dependency){
 // Bind actual business arities to the caller's stable tiny function exports.
 // Only metadata literals are evaluated; no model or renderer is initialized.
 return evaluate(source('painted/infill/safety/infill-scoped-functions.ts'),moduleId=>{
  if(!infillScopeMetadata.has(moduleId)){
   const text=source('painted/infill/safety/'+moduleId.slice(2)+'.ts'),ast=ts.createSourceFile(moduleId,text,ts.ScriptTarget.Latest,true);
   const field=ast.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).find(node=>node.name.getText(ast)==='infillDataFunctionArities');assert(field?.initializer,moduleId+' publishes its actual Infill scoped arities');
   infillScopeMetadata.set(moduleId,evaluate('export const value='+field.initializer.getText(ast)).value);
  }
  const arities=infillScopeMetadata.get(moduleId),target=dependency(moduleId);
  return new Proxy(target,{get:(o,name)=>name==='infillDataFunctionArities'?arities:name==='infillProgressiveObjectDemand'&&!Object.hasOwn(o,name)?undefined:Reflect.get(o,name)});
 });
}
let infillDisplayBudget;
export function loadInfillDisplayBudget(){
 if(infillDisplayBudget)return infillDisplayBudget;
 const allowed=new Set(['owner-display-budget','infill-bulk-budget-credit','infill-owner055-budget-credit','infill-finite-owner-budget-credit','owner-display-fingerprint','infill-finite-owner-budget-data','infill-frankfurt-low-office-bulk70-budget-metadata','infill-frankfurt-low-office-bulk70-metadata','infill-frankfurt-low-office-bulk70-identities','infill-frankfurt-low-office-bulk70-data','infill-frankfurt-bockenheimer084-data','infill-frankfurt-junghof088-data','infill-frankfurt-jw-marriott-data','infill-data-contract']),cache=new Map();
 const load=id=>{
  if(cache.has(id))return cache.get(id);
  const name=id.slice(2);let text=source('painted/infill/safety/'+name+'.ts');
  if(name==='infill-frankfurt-japan-center'){
   // Only its declared descriptor and lazy catalogue accessor are needed here.
   // Its actual top-level SOURCE decode is covered by the separate cold probe.
   // No Japan SOURCE is admitted by these tiny fixtures: a positive read fails.
   const tree=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true),names=new Set(['INFILL_JAPAN_CENTER_SHA','infillDataMemoKey','infillOwnDataRefs','infillDataRefs','infillDataMemoKeys','getINFILL_JAPAN_CENTER_BUDGET_MODELS']);
   text="function getInfillData(){throw Error('Budget fixture has no admitted Japan SOURCE model');}\n"+tree.statements.filter(node=>ts.isVariableStatement(node)?node.declarationList.declarations.some(item=>names.has(item.name.getText(tree))):ts.isFunctionDeclaration(node)&&names.has(node.name?.text)).map(node=>node.getText(tree)).join('\n');
  }else assert(allowed.has(name),'unexpected actual budget dependency '+id);
  const value=evaluate(text,load);cache.set(id,value);return value;
 };
 return infillDisplayBudget=load('./owner-display-budget');
}
function rootConstructionBoundary(page){
 const file='painted/root500/safety/owner-f257-reconstruction.ts',text=source(file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const names=new Set(['__root500MemoKey','__root500OwnRefs','root500DataRefs','root500ConstructionRetirement','retireRoot500Construction']);
 const metadata=ast.statements.filter(node=>ts.isVariableStatement(node)?node.declarationList.declarations.some(item=>names.has(item.name.getText(ast))):ts.isFunctionDeclaration(node)&&names.has(node.name?.text)).map(node=>node.getText(ast));
 assert.equal(metadata.length,5,'use the actual F257 retirement refs, memo identity and capability');const own=evaluate(metadata.join('\n'));
 const aggregateFile='painted/root500/safety/owner-reconstruction.ts',aggregateText=source(aggregateFile),aggregateAst=ts.createSourceFile(aggregateFile,aggregateText,ts.ScriptTarget.Latest,true);
 const numericImports=aggregateAst.statements.filter(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.propertyName?.text==='root500NumericMemoKeys'));
 assert.equal(numericImports.length,6,'bind all six actual imported numeric retirement token sets');
 const numericSpecifiers=new Set(numericImports.map(node=>node.moduleSpecifier.text)),numericRequire=page.requireFrom('painted/root500/safety/owner-reconstruction');
 const imported=aggregateAst.statements.find(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.name.text==='retireF257Construction'));
 const retire=aggregateAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='retireOwnerReconstructionConstruction');assert(imported&&retire);
 const f154Import=aggregateAst.statements.find(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.name.text==='retireF154ReconstructionConstruction'));assert(f154Import);
 const api=evaluate([...numericImports,imported,f154Import,retire].map(node=>node.getText(aggregateAst)).join('\n'),id=>numericSpecifiers.has(id)?numericRequire(id):id===f154Import.moduleSpecifier.text?f154Construction:(assert.equal(id,imported.moduleSpecifier.text),own));
 return{...own.root500ConstructionRetirement,retire:api.retireOwnerReconstructionConstruction};
}
function infillConstructionBoundary(dependency,page){
 const text=source('painted/infill/safety/owner-reconstruction.ts'),ast=ts.createSourceFile('infill-owner.ts',text,ts.ScriptTarget.Latest,true);
 const numericImports=ast.statements.filter(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.propertyName?.text==='root500NumericMemoKeys'));
 assert.equal(numericImports.length,3,'bind all three actual imported numeric retirement token sets');
 const numericSpecifiers=new Set(numericImports.map(node=>node.moduleSpecifier.text)),numericRequire=page.requireFrom('painted/infill/safety/owner-reconstruction');
 // Owner modules are recognised by their relative import specifier (owner-lazy-2 R5), not by the
 // infillOwnerModuleN binding numbers, so a semantic binding name (e.g. the non-Berlin registry) stays bound.
 const imports=ast.statements.filter(node=>ts.isImportDeclaration(node)&&!node.importClause?.isTypeOnly&&node.importClause?.namedBindings&&(ts.isNamespaceImport(node.importClause.namedBindings)||ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(item=>item.name.text==='retireF154ReconstructionConstruction'))&&node.moduleSpecifier.text.startsWith('.'));
 const functions=['infillDataDependencies','retireOwnerReconstructionConstruction'].map(name=>ast.statements.find(node=>ts.isFunctionDeclaration(node)?node.name?.text===name:ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)===name)));assert(imports.length>0&&functions.every(Boolean));
 // Use the actual aggregate over the explicitly bound tiny namespaces. An
 // absent opt-in remains absent; F154 SOURCE/material refs are never inferred
 // to be construction merely because this fixture holds their real leases.
 return evaluate([...numericImports,...imports,...functions].map(node=>node.getText(ast)).join('\n'),id=>new Proxy(dependency(id),{get:(target,name)=>name==='root500NumericMemoKeys'&&numericSpecifiers.has(id)?numericRequire(id).root500NumericMemoKeys:['infillDataDependencies','infillDataConstructionRetirement'].includes(name)&&!Object.hasOwn(target,name)?undefined:Reflect.get(target,name)})).retireOwnerReconstructionConstruction;
}
// Pure leaf modules are shared by every fixture. Their real relative graph is
// loaded, never a hand-maintained require map; nothing else may be reached.
const leafRuntime=new Set(['painted/delegated500/safety/paint-run-visibility','safety/resident-gpu-lifecycle','safety/utf8-byte-length','safety/family-paint-program','safety/render-runtime/shader-source-budget']);
const leaves=createSourceModules({allow:id=>leafRuntime.has(id)});
const lifecycle=leaves.load('safety/resident-gpu-lifecycle'),utf8=leaves.load('safety/utf8-byte-length');
const family=leaves.load('safety/family-paint-program');
const shaderBudget=leaves.load('safety/render-runtime/shader-source-budget');
// Each residency fixture is a fresh page: its own ledger, page store, program
// scheduler and frozen scope module, sharing only the pure leaves above.
const pageRuntime=new Set(['safety/prepared-source','safety/family-paint-program','safety/utf8-byte-length',...RENDERER_RUNTIME_MODULES,...RENDERER_RUNTIME_DEPENDENCIES,'safety/frozen-data-scope','safety/render-runtime/preparation-scheduler','safety/render-runtime/submitted-program-completion','safety/render-runtime/program-preparation','safety/render-runtime/chunk-resource-store','safety/render-runtime/resident-geometry','safety/viewport-request','safety/render-runtime/program-grant-handoff','safety/component-readback']);
// The aggregate's named retirement tokens come from these exact cold modules;
// their reconstruction functions and frozen data getters are never invoked here.
for(const provider of ['infill','root500'])for(const number of ['259','261','274'])pageRuntime.add(`painted/${provider}/safety/owner-f${number}-reconstruction`);
for(const number of ['077','081','126'])pageRuntime.add(`painted/root500/safety/owner-f${number}-completion`);
pageRuntime.add('painted/root500/safety/progressive-native-signature');
pageRuntime.add('painted/root500/safety/progressive-paint-admissions');
const pageModules=()=>createSourceModules({overrides:{...Object.fromEntries([...leafRuntime].map(id=>[id,leaves.load(id)])),
 // Loading the real admission module for a retirement token must stay cold;
 // querying its full-table metadata would leave this tiny fixture's boundary.
 'safety/frozen-paint-tables':{frozenPaintTableRowCounts(){throw Error('Retirement token loading unexpectedly queried full frozen table metadata');}},
},allow:id=>pageRuntime.has(id)});
const pick=evaluate(source('painted/root500/safety/indexed-pick-blocks70.ts'));
export const residencyResource={canonicalSHA256:'a'.repeat(64),file:'tiny/programs',occurrence:0,codec:'json'};const resource=residencyResource,key=c=>c.objectId+'|'+c.partId;
const count=rows=>rows.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
const emptyStats=()=>({objects:0,vertices:0,triangles:0,originalVertices:0,components:[],sourceRetained:true,actualVisualAccepted:false});
export function component(id=1,diagnostic=false){const n=diagnostic?57:3,positions=new Float32Array(n*3),normals=new Float32Array(n*3);for(let i=0;i<n;i++){positions.set([i%3===1?1:0,i===0?-0:i%3===2?1:0,Math.floor(i/3)],i*3);normals.set([0,0,1],i*3);}return{city:'leipzig',objectId:diagnostic?'osm/way/1207797957':'osm/way/'+id,partId:diagnostic?'osm/way/1207797957/component/b56e09c7e8b907ba01ed':'osm/way/'+id+'/component/tiny',origin:[8,53],componentGeometry:{type:'Polygon',coordinates:[[[8,53],[8.001,53],[8,53.001],[8,53]]]},sourceFeature:{type:'Feature',id:'osm/way/'+id,properties:{},geometry:{type:'Polygon',coordinates:[]}},batches:[{positions,normals,indices:Uint32Array.from({length:n},(_,i)=>i),color:[.4,.5,.6]}]};}
export function residencyFixture(provider='root500',{city='leipzig',dependencyOverrides={},resourceValue,onRelease,onInvalidate,rendererSourcePath}={}){
 const page=pageModules(),scopeModule=page.load('safety/frozen-data-scope'),preparedSource=page.load('safety/prepared-source');
 const control={mode:2,failFamily:undefined,paused:false,failMaterials:false,failSpecialization:false,failMetadata:false,failUploadAt:0,abortOnAcquire:undefined,errors:[],lost:false,errorUploadAt:0,errorCode:0,lostUploadAt:0},uploads=[],subUploads=[],deletedBuffers=new Set(),deletedPrograms=[],buffers=new Map(),handlers=new Map(),scopes=[],ledgers=[];let serial=0,vao,array,element,attempt=0,plans=0,disposed=0,configurations=0,errorReads=0,phase,clearSources=0;const timers=new Map(),sources=[],compileRequests=[],phaseEvents=[],draws=[];let timerID=0,planCount=0;const inPhase=(value,run)=>{const before=phase;phase=value;phaseEvents.push(value);try{return run();}finally{phase=before;}};
 const layouts=new Map(),constants=['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','ARRAY_BUFFER_BINDING','VERTEX_ARRAY_BINDING','STATIC_DRAW','DYNAMIC_DRAW','FLOAT','BUFFER_SIZE','VERTEX_ATTRIB_ARRAY_BUFFER_BINDING','VERTEX_ATTRIB_ARRAY_ENABLED','VERTEX_ATTRIB_ARRAY_SIZE','VERTEX_ATTRIB_ARRAY_STRIDE','VERTEX_ATTRIB_ARRAY_TYPE','VERTEX_ATTRIB_ARRAY_NORMALIZED','VERTEX_ATTRIB_ARRAY_INTEGER','VERTEX_ATTRIB_ARRAY_DIVISOR','VERTEX_ATTRIB_ARRAY_POINTER'];
 const gl=Object.fromEntries(constants.map((v,i)=>[v,i+1]));Object.assign(gl,{
  // WebGL2 completion fences: submitted tiny work has always completed, so a page-store
  // GPU retirement finishes at the next frame-boundary collect instead of the fallback.
  SYNC_GPU_COMMANDS_COMPLETE:0x9117,ALREADY_SIGNALED:0x911A,TIMEOUT_EXPIRED:0x911B,CONDITION_SATISFIED:0x911C,WAIT_FAILED:0x911D,fenceSync:()=>({fence:++serial}),clientWaitSync:()=>gl.ALREADY_SIGNALED,deleteSync(){},flush(){},
  VERTEX_SHADER:100,FRAGMENT_SHADER:101,COMPILE_STATUS:102,LINK_STATUS:103,NO_ERROR:0,OUT_OF_MEMORY:0x0505,INVALID_OPERATION:0x0502,getError(){errorReads++;return control.errors.shift()??gl.NO_ERROR;},isContextLost:()=>control.lost,createVertexArray:()=>({vao:++serial}),createBuffer:()=>({buffer:++serial}),deleteVertexArray:v=>layouts.delete(v),deleteBuffer:b=>{deletedBuffers.add(b);buffers.delete(b);},deleteProgram:p=>deletedPrograms.push(p),createShader:type=>({type,id:++serial}),shaderSource(shader,text){sources.push({phase,text});shader.text=text;},compileShader(){},attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(){},createProgram:()=>({program:++serial}),getExtension:()=>null,getProgramParameter:()=>true,getShaderParameter:()=>true,getProgramInfoLog:()=>'',getShaderInfoLog:()=>'',deleteShader(){},
  bindVertexArray:v=>{vao=v;},bindBuffer:(target,b)=>{if(target===gl.ARRAY_BUFFER)array=b;else element=b;},getParameter:k=>k===gl.ARRAY_BUFFER_BINDING?array:vao,
  bufferData(target,data){attempt++;control.onUpload?.();const buffer=target===gl.ARRAY_BUFFER?array:element;uploads.push({buffer,data,values:Array.from(data)});buffers.set(buffer,new data.constructor(data));if(control.failUploadAt===attempt)throw Error('tiny replacement upload failure');if(control.errorUploadAt===attempt)control.errors.push(control.errorCode);if(control.lostUploadAt===attempt)control.lost=true;},bufferSubData(_target,offset,data){subUploads.push({buffer:array,offset,data,values:Array.from(data)});buffers.set(array,new data.constructor(data));},
  getAttribLocation:(_p,name)=>({'a_position':0,'a_normal':1,'a_color':2,'a_selected':3,'a_paint_frame':4,'a_paint_family':5,'a_progressive_color':6,'a_s402_frame':4,'a_s402_alpha':6})[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(index,size,type,normalized,stride,offset){if(!layouts.has(vao))layouts.set(vao,new Map());layouts.get(vao).set(index,{buffer:array,size,type,normalized,stride,offset});},getUniformLocation:()=>null,isEnabled:()=>false,useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},uniformMatrix4fv(){},uniform1f(){},uniform1i(){},uniform2f(){},uniform3f(){},drawElements(_mode,count,_type,offset){draws.push({count,offset});},
  getVertexAttrib(index,k){const a=layouts.get(vao)?.get(index);return k===gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING?a?.buffer:k===gl.VERTEX_ATTRIB_ARRAY_ENABLED?!!a:k===gl.VERTEX_ATTRIB_ARRAY_SIZE?a?.size:k===gl.VERTEX_ATTRIB_ARRAY_STRIDE?a?.stride:k===gl.VERTEX_ATTRIB_ARRAY_TYPE?a?.type:k===gl.VERTEX_ATTRIB_ARRAY_NORMALIZED?a?.normalized:k===gl.VERTEX_ATTRIB_ARRAY_INTEGER?false:0;},getVertexAttribOffset:index=>layouts.get(vao)?.get(index)?.offset??0,getBufferParameter:target=>buffers.get(target===gl.ARRAY_BUFFER?array:element)?.byteLength??0,
  getBufferSubData(target,offset,out){const data=buffers.get(target===gl.ARRAY_BUFFER?array:element);assert.ok(data,'diagnostic must read an existing allocation');new Uint8Array(out.buffer,out.byteOffset,out.byteLength).set(new Uint8Array(data.buffer,data.byteOffset+offset,out.byteLength));},
 });
 const construction=provider==='root500'?rootConstructionBoundary(page):undefined,constructionRefs=construction?.refs??[];
 const frozenData={async acquire(ref,signal){const constructionIndex=constructionRefs.findIndex(candidate=>candidate.canonicalSHA256===ref.canonicalSHA256&&candidate.file===ref.file&&candidate.occurrence===ref.occurrence&&candidate.codec===ref.codec),role=constructionIndex<0?'material':'construction';assert.deepEqual(ref,role==='material'?resource:constructionRefs[constructionIndex]);signal.throwIfAborted();const ledger={ref:{...ref},role,released:0,borrows:0};ledgers.push(ledger);const value=role==='construction'?{fixtureConstruction:constructionIndex}:resourceValue?resourceValue(ref,ledger):{fragment:'vec3 paintedFacade(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}'};control.abortOnAcquire?.abort();return{borrow(read){assert.equal(ledger.released,0,'released tiny lease cannot be borrowed');ledger.borrows++;return read(value);},release(){if(ledger.released)return;ledger.released++;onRelease?.(value,ledger);}};}};
 const createScope=()=>{const scope=scopeModule.createFrozenDataScope(frozenData);scopes.push(scope);return scope;};
 const preparationStages=[],observePreparation=(name,rows,signal,scope)=>{signal.throwIfAborted();assert(scope,'preparation keeps its exact scope');preparationStages.push({name,rows,scope});};
 const prepare=async(_rows,_city,signal,scope)=>scope.prepare([resource],signal),shader=scope=>{assert.ok(phase==='source-build'||phase==='compile-build','shader body read outside admitted source phase: '+phase);assert.ok(scope,'program configuration requires scope');assert.ok(scope.stats.pins>0);return scope.borrow(resource,v=>v.fragment);};
 const owner={root500DataFunctionArities:{},async prepareOwnerRecoveredSourceComponents(rows,signal,_wait,scope){observePreparation('recovered-source',rows,signal,scope);},async prepareOwnerReconstructionMaterials(rows,signal,_wait,scope){observePreparation('reconstructed-materials',rows,signal,scope);},ownerRecoveredSourceComponents:rows=>{control.onConsumer?.('ownerRecoveredSourceComponents');return rows;},ownerReconstructionComponents:rows=>{control.onConsumer?.('ownerReconstructionComponents');return{components:rows,stats:emptyStats()};},async prepareOwnerReconstructionComponents(rows,signal,_wait,scope){observePreparation('reconstructed-source',rows,signal,scope);control.onConsumer?.('prepareOwnerReconstructionComponents');if(construction&&rows.length){await scope.prepare(constructionRefs,signal);for(const key of construction.memoKeys)scope.memo(key,()=>constructionRefs.map(ref=>scope.borrow(ref,value=>value)));}return{components:rows,stats:emptyStats()};},async prepareOwnerReconstructionModules(_rows,signal){signal.throwIfAborted();},ownerReconstructionIdentity:()=>false,ownerReconstructionBaseMaterials(){if(control.failMaterials)throw Error('tiny material failure');},...(construction?{retireOwnerReconstructionConstruction:construction.retire}:{})};
 const sourceMetadata=city=>({city,specialized:null,sourceSHA256:null,generatedSourceSHA256:null,sourceKind:null,fragmentBytes:null,fullFragmentBytes:null,baselinePreservedVerbatim:null});
 const shaderModule={prepareRoot500ProgramData:prepare,prepareInfillPaintPrograms:prepare,root500DataFunctionArities:{paintProgramFragment:2,facadePaintFragmentForCity:1,facadePaintSpecializationForCity:1,describeFacadePaintSource:3},paintProgramPartitionEnabled:()=>true,paintProgramFragment:(key,_city,scope)=>{if(control.failFamily===key)throw Error('tiny family failure '+key);return shader(scope);},facadePaintFragmentForCity:(_city,scope)=>shader(scope),facadePaintSpecializationForCity:city=>{/* Reachable plan-configuration failure: every candidate plan queries this metadata once in its own source-build phase, while describeFacadePaintSource runs only when a program source is actually built (a resident shared program skips it). */if(control.failMetadata)throw Error('tiny specialization-metadata failure');return sourceMetadata(city);},
  describeFacadePaintSource(city,source,kind,scope){
   assert.ok(phase==='source-build'||phase==='compile-build','source description must observe admitted source work');assert.equal(typeof source,'string');assert(scope&&!scope.stats.disposed);
   configurations++;control.onConsumer?.('source-description',scope);if(control.failSpecialization)throw Error('tiny source-description failure');
   // This boundary measures only the supplied synthetic source. Querying
   // metadata never borrows/builds another source or invents baseline bytes.
   const fragmentBytes=new TextEncoder().encode(source).byteLength;return{...sourceMetadata(city),sourceKind:kind,fragmentBytes,fullFragmentBytes:kind==='full'?fragmentBytes:null};
  },
  // Upper bounds of the exact tiny fragment this fixture's resource supplies; reading
  // bounds borrows the prepared lease only and never builds a program source.
  describeFacadePaintSourceBounds(_city,_sourceKey,scope){assert(scope&&!scope.stats.disposed,'source bounds require the live candidate scope');return shaderBudget.shaderSourceBounds(shaderBudget.shaderSourceText(scope.borrow(resource,v=>v.fragment),['tiny-residency-fixture']));},
  clearRoot500PaintSources(){clearSources++;},clearInfillPaintSources(){clearSources++;},paintProgramKey:raw=>'family-'+raw};
 shaderModule.prepareInfillPaintPrograms=async(rows,city,signal,scope)=>{observePreparation('paint-programs',rows,signal,scope);await prepare(rows,city,signal,scope);};
 // Immutable program-source provenance in the production shape (kind, frozen string
 // inputs, frozen builders): the tiny fragment resource and this module's builders.
 const fixtureProgramAuthority=Object.freeze({kind:'immutable-program-source',inputs:Object.freeze(['tiny-residency-fixture',JSON.stringify(resource)]),builders:Object.freeze([shaderModule.paintProgramPartitionEnabled,shaderModule.paintProgramFragment,shaderModule.facadePaintFragmentForCity])});
 shaderModule.ROOT500_FACADE_PROGRAM_SOURCE_AUTHORITY=fixtureProgramAuthority;shaderModule.INFILL_FACADE_PROGRAM_SOURCE_AUTHORITY=fixtureProgramAuthority;
 const preparedPlan=name=>evaluate(source(`painted/${name}/safety/${name}-prepared-program-plan.ts`),id=>{if(id==='./facade-paint-fragment')return shaderModule;if(id==='../../../safety/utf8-byte-length')return utf8;assert.equal(id,'../../../safety/prepared-source');return preparedSource;});
 const programModule=page.load('safety/render-runtime/program-preparation');
 const progressiveView=Object.freeze([]);
 const viewportModule=page.load('safety/viewport-request');
 const modules={
  '../../delegated500/safety/paint-run-visibility':leaves.load('painted/delegated500/safety/paint-run-visibility'),
  '../../../safety/viewport-request':viewportModule,
  '../../../safety/render-runtime/program-grant-handoff':page.load('safety/render-runtime/program-grant-handoff'),
  '../../../safety/frozen-data-scope':{...scopeModule,createFrozenDataScope:()=>createScope()},
  '../../../safety/resident-gpu-lifecycle':lifecycle,
  '../../../safety/component-readback':page.load('safety/component-readback'),
  '../../../safety/prepared-source':preparedSource,
  '../../../safety/utf8-byte-length':utf8,
  '../../../safety/render-runtime/resident-geometry':page.load('safety/render-runtime/resident-geometry'),
  '../../../safety/render-runtime/program-preparation':{...programModule,createProgramPreparationOwner(...args){const owner=programModule.createProgramPreparationOwner(...args);return{...owner,get hasPending(){return owner.hasPending;},get stats(){return owner.stats;},dispose(){disposed++;owner.dispose();},compile(context,recipe){compileRequests.push({resource:recipe.resource,inputs:[...recipe.inputs]});return owner.compile(context,{...recipe,...(recipe.resolveSource?{resolveSource(){const selected=recipe.resolveSource();return{...selected,build:()=>inPhase('compile-build',selected.build)};}}:{}),build:()=>inPhase('compile-build',recipe.build)});},work(context,recipe){return owner.work(context,{...recipe,work:()=>inPhase(recipe.phase??'upload',recipe.work)});}};}},
  '../../../safety/family-paint-program':{...family,familyPaintRuns(...args){plans++;return family.familyPaintRuns(...args);}},
  './root500-prepared-program-plan':preparedPlan('root500'),
  './infill-prepared-program-plan':preparedPlan('infill'),
  '../../../safety/custom-layer-render-error':{guardCustomLayerRender:(_map,_id,render)=>render},
  './owner-reconstruction':owner,'./indexed-pick-blocks70':pick,
  './root500-derived-display-data':{prepareRoot500DerivedDisplays:async()=>{}},
  './infill-paint-programs':{prepareInfillPaintPrograms:shaderModule.prepareInfillPaintPrograms},
  './facade-paint-fragment':shaderModule,
  './progressive-paint':{root500DataFunctionArities:{progressivePaintData:1,progressiveRenderStatus:0,progressiveRenderView:0,progressivePaintCount:0,progressiveAdmission:1,progressivePaintRejections:0},progressivePaintFingerprints:{},progressivePaintCount:provider==='root500'?()=>0:0,prepareRoot500ProgressiveData:prepare,prepareRoot500MaterialData:async(components,city,signal,scope)=>{assert(Array.isArray(components),'full source/display material rows are forwarded');assert.equal(typeof city,'string');assert(scope,'material admission preparation requires its exact scope');await prepare(components,city,signal,scope);},progressivePaintData:rows=>new Float32Array(count(rows)*4),progressivePaintRejections:()=>[],progressiveRenderStatus:scope=>{control.onConsumer?.('progressiveRenderStatus',scope);return[];},progressiveRenderView:scope=>{control.onConsumer?.('progressiveRenderStatus',scope);return progressiveView;},progressiveAdmission:()=>undefined},
  './facade-paint-frame':{facadePaintData:rows=>{if(control.failConsumer==='facadePaintData')throw Error('tiny material failure');const data=new Float32Array(count(rows)*5);let at=0;for(const row of rows)for(let i=0;i<count([row]);i++)data[at++*5+4]=Number(row.objectId.split('/').at(-1))%2+1;return data;}},
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
  './source-partial-gate-gpu-diagnostic':evaluate(source(`painted/${provider}/safety/source-partial-gate-gpu-diagnostic.ts`)),
 };
 Object.assign(modules['./progressive-paint'],{
  isProgressivelyPainted:()=>false,progressivePaintCount:()=>0,
  async prepareInfillProgressiveData(rows,city,signal,scope){observePreparation('progressive-admissions',rows,signal,scope);await prepare(rows,city,signal,scope);},
 });
 modules['../../root500/safety/root500-derived-display-data']=modules['./root500-derived-display-data'];
 if(provider==='infill'){
  const native=evaluate(source('painted/root500/safety/progressive-native-signature.ts'));
  const upper=evaluate(source('painted/infill/safety/f058-upper-paint312.ts'),id=>{
   if(id==='./progressive-native-signature')return native;
   assert.equal(id,'./owner-shape-patch-display');return{ownerShapePatchProfile:()=>undefined}; // No Hamburg profile is present in these Leipzig/Frankfurt fixtures.
  });
  modules['./f058-upper-paint312']={...upper,async prepareInfillData(rows,signal,scope){observePreparation('resident-upper-frames',rows,signal,scope);await upper.prepareInfillData(rows,signal,scope);}};
  const budget=loadInfillDisplayBudget();modules['./owner-display-budget']={...budget,async prepareInfillData(rows,signal,scope){observePreparation('display-budget',rows,signal,scope);await budget.prepareInfillData(rows,signal,scope);},fitOwnerDisplayBudget(rows,cap,options,scope){assert(scope&&!scope.stats.disposed&&scope.stats.pins>0,'budget fitting receives the live candidate scope');return budget.fitOwnerDisplayBudget(rows,cap,options,scope);}};
 }
 const factories={retainF154ReconstructionConstruction:f154Construction.retainF154ReconstructionConstruction,retireF154ReconstructionConstruction:f154Construction.retireF154ReconstructionConstruction,createResidentReflectionUniforms:()=>()=>{},createResidentReflectionObjects:()=>{const ids=new WeakMap();let id=0;return value=>{if(!value)return 0;if(!ids.has(value))ids.set(value,++id);return ids.get(value);};},defaultSceneEnvironment:()=>({instantISO:'2026-01-01T00:00:00Z'}),sceneSolarLight:()=>({shadowVector:control.sun?[1,1]:undefined}),createSceneLightUniforms:()=>()=>{},createProjectedShadowMask:()=>({release(){},stats:{}}),createNativeSourceReadback:()=>({destroy(){control.onConsumer?.('source.clear');},observe(){},stats:{}}),createRathausProxyMasks:()=>tinyRathausProxyMasks(control),createResidentCaptureRuntime:adapter=>({invalidate(){onInvalidate?.();},render(){return adapter.snapshot(false);}}),createSolarShadowPreparationBudget:()=>({})};
 function imported(name){if(name in factories)return factories[name];if(name==='root500DataFunctionArities')return{};if(name==='FROZEN_PAINT_IDS')return new Set();if(name==='DESCRIPTION_BINDINGS'||name==='OWNER_SHAPE_PATCH_PROFILES')return[];if(name==='SOURCE_SHADOW_VECTOR')return[1,1];if(/GLSL|SOURCE_SHA/.test(name))return'';if(/^appendF\d+DerivedDisplay$/.test(name))return rows=>{control.onConsumer?.(name);return rows;};if(name==='applyF018S036Compatibility')return(_r,_p,_f,_plan,current)=>current;if(/^apply/.test(name))return()=>{if(control.failConsumer===name)throw Error('tiny material failure');return{enabled:false};};if(/^is|Identity$|Discard$|Intersects|Certified/.test(name))return()=>false;if(/Readback/.test(name))return()=>null;if(name==='nativePaintSignature')return()=> 'tiny';if(name==='acceptPaintComponent')return()=>true;if(name==='paintMode')return()=>control.mode;if(name==='paintOverride')return()=>0;if(name==='uploadFacadeLayouts')return()=>{};if(name==='paintBoxOutsideClip')return()=>false;if(name==='paintRunIntersectsVisible')return()=>true;if(name==='sourceShadowOpacity')return value=>value;if(name==='pruneOwner6307Fragment')return text=>text;if(name==='withSceneSolarShadowReceiver')return(_gl,_matrix,draw)=>draw();return()=>{throw Error('Unspecified tiny dependency '+name);};}
 if(provider==='infill')modules['./infill-equivalent-program-families']=evaluate(source('painted/infill/safety/infill-equivalent-program-families.ts'),id=>{assert.equal(id,'./building-surface-style');return evaluate(source('painted/root500/safety/building-surface-style.ts'));});
 modules['../../../safety/paint-program-idle-retirement']=evaluate(source('safety/paint-program-idle-retirement.ts'),id=>{assert.equal(id,'./building-focus-window');return evaluate(source('safety/building-focus-window.ts'));});
 const captureModule='../../../safety/render-runtime/resident-capture';
 modules[captureModule]={createResidentCaptureOwnership,createResidentCaptureRuntime:factories.createResidentCaptureRuntime,...modules[captureModule]};
 for(const[id,value]of Object.entries(dependencyOverrides))modules[id]={...(modules[id]??{}),...value};
 // Chunk/packing/residency/store/shader-budget imports are this page's real
 // runtime modules (never stubbed); every other import keeps its double.
 const realRuntime=rendererRuntime(page,provider);
 const cache=new Map(),dependency=id=>{
  if(!cache.has(id)){
   const real=modules[id]?undefined:realRuntime(id);
   if(real)cache.set(id,real);
   else if(provider==='infill'&&id==='./infill-scoped-functions'){
    // The actual registry binds business arities to the same tiny imported
    // functions used by the renderer. Evaluate metadata literals, never models.
    cache.set(id,loadInfillScopedFunctions(dependency));
   }else{
    const fallback=new Map();cache.set(id,new Proxy(modules[id]??{},{get:(o,name)=>{if(Reflect.has(o,name))return Reflect.get(o,name);if(!fallback.has(name))fallback.set(name,imported(String(name)));return fallback.get(name);}}));
   }
  }
  return cache.get(id);
 };
 if(provider==='infill')Object.assign(dependency('./owner-reconstruction'),{retireOwnerReconstructionConstruction:infillConstructionBoundary(dependency,page)});
 const renderer=evaluate(rendererSourcePath?fs.readFileSync(rendererSourcePath,'utf8'):source(`painted/${provider}/safety/building-mesh-renderer.ts`),dependency),map={getCenter:()=>({lng:8,lat:53}),getCanvas:()=>({width:512,height:512,clientWidth:512,clientHeight:512,getBoundingClientRect:()=>({left:0,top:0,width:512,height:512})}),on:(name,fn)=>handlers.set(name,fn),off:(name,fn)=>{if(handlers.get(name)===fn)handlers.delete(name);},triggerRepaint(){}};
 const globals={setTimeout:(fn)=>{const id=++timerID;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),document:new EventTarget(),location:{search:'',hostname:'example.invalid'},window:{devicePixelRatio:1}};
 async function environment(run){const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});try{return await run();}finally{for(const[k,d]of saved)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
 // The page owner (painted-map) collects page-store retirements at each map render and
 // once more after destroying its renderers; this fixture is that owner for its renderers.
 const create=()=>{const r=renderer.createBuildingMeshRenderer(map,city,{frozenData,clock:()=>1}),destroy=r.destroy;r.destroy=(...args)=>{try{return destroy.apply(r,args);}finally{chunkStore.collectRetired();}};return r;},signal=()=>new AbortController().signal;
 // The manager supplies an authoritative source chunk input with every batch;
 // its page store is this fixture's store, so chunk CPU/GPU entries are charged.
 // It is this fresh page's own page store (getPageChunkResourceStore), so a resident
 // geometry owner that resolves the page store before attach charges the same ledger.
 const chunkStore=page.load('safety/render-runtime/chunk-resource-store').getPageChunkResourceStore({limitBytes:256*1024**2,recentLimitBytes:0,recentMaxEntries:0,recentMaxIdleMs:0}),chunkInputs=page.load('safety/renderer-chunk-input');
 // The product frozen client always carries this page's resource store (frozen-data-lease-store
 // createFrozenDataClient); scope memos and resource memos reserve against the same ledger.
 Object.defineProperty(frozenData,'resources',{value:chunkStore,enumerable:true});
 // As on the page, this context's sole resource store is the page store that the
 // manager's chunk input, the resident geometry owners and the frozen client share.
 page.load('safety/render-runtime/chunk-resource-store').bindChunkResourceContext(gl,chunkStore);
 async function prepareBatch(r,rows,abortSignal=signal(),demand,inputOverride){const input=inputOverride??fixtureChunkInput(chunkInputs,chunkStore,rows);if(provider==='root500')return r.prepareBatches(rows,abortSignal,undefined,undefined,demand,input);const scope=createScope();try{return await r.prepareBatches(rows,abortSignal,scope,undefined,undefined,demand,input);}catch(error){scope.release();throw error;}}
 // Chunk CPU packing and GPU residency settle through page-store promises, so
 // each frame or timer task is followed by its microtasks, as in a browser.
 const drain=()=>new Promise(resolve=>setImmediate(resolve));
 // A non-empty candidate publishes only after a finite main view has been recorded
 // (recordCandidateMainView); settle frames carry the map's current main matrix, while a bare
 // frame(r) keeps the view unknown (no main matrix), as before any map camera exists.
 const unit=2*Math.PI*6378137*Math.cos(53*Math.PI/180),ax=(8+180)/360,ay=(1-Math.log(Math.tan(Math.PI/4+53*Math.PI/360))/Math.PI)/2,mainMatrix=Object.freeze([unit,0,0,0,0,0,-unit,0,0,unit,0,0,-ax*unit,0,ay*unit,1]);
 function frame(r,view=false){r.layer.render(gl,{defaultProjectionData:view?{mainMatrix}:{}});chunkStore.collectRetired();}
 function tick(){if(control.paused)return false;const entry=timers.entries().next().value;if(!entry)return false;timers.delete(entry[0]);entry[1]();return true;}
 async function settle(r,ready=()=>{const state=r.stats.geometryPreparation;if(state.candidateFailure)throw Error('Candidate did not publish: '+state.candidateFailure);return !state.pending&&!state.candidatePending;}){for(let i=0;i<160;i++){frame(r,true);await drain();tick();await drain();if(ready())return;}throw Error('bounded candidate did not settle: '+JSON.stringify(r.stats.geometryPreparation));}
 function renderVisible(r){r.layer.render(gl,[...mainMatrix]);}
 const commit=(r,b,g,shadow)=>r.setBatches(b.input,g,shadow,...Array(8).fill(undefined),b);
 return{viewport:viewportModule,chunkStore,chunkInputs,environment,create,prepareBatch,resource,constructionRefs,preparationStages,dependency,overrideDependency:(id,values)=>Object.assign(dependency(id),values),commit,frame,tick,settle,renderVisible,timers,sources,compileRequests,phaseEvents,draws,get clearSources(){return clearSources;},control,uploads,subUploads,buffers,deletedBuffers,deletedPrograms,handlers,scopes,ledgers,gl,get errorReads(){return errorReads;},errorNextUpload(code,n=2){control.errorUploadAt=attempt+n;control.errorCode=code;},loseNextUpload(n=2){control.lostUploadAt=attempt+n;},get configurations(){return configurations;},get plans(){return plans;},get disposed(){return disposed;},failNextUpload(n=1){control.failUploadAt=attempt+n;}};
}

