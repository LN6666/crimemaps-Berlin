import {decodeResourceContentKey} from './support/resource-content-key.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
// The City renderer is flattened from its actual factory (support/
// fixtures-renderer-city.mjs). The resident pipeline runs as production code:
// prepared data receipt, chunk material/packing/state leases in a real chunk
// store, main program preparation, mesh-view upload and scene publication.
// Isolated: the GL driver (fake context below), the City material sidecar
// producer (zero sidecars of the exact CityChunkMaterial contract), CPU
// component validation, and the selection of render-only uniforms.
const harness=await import('./support/fixtures-renderer-harness.mjs');
const cityFixtures=await import('./support/fixtures-renderer-city.mjs');
const web=new URL('../',import.meta.url),filename='src/painted/city/safety/building-mesh-renderer.ts',text=fs.readFileSync(new URL(filename,web),'utf8'),ast=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true),nodes=[];
(function visit(node){nodes.push(node);ts.forEachChild(node,visit);})(ast);
function node(name){const matches=nodes.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name||ts.isVariableDeclaration(n)&&n.name.getText(ast)===name&&n.initializer&&ts.isArrowFunction(n.initializer));assert.equal(matches.length,1,name);return matches[0];}
function source(name){const n=node(name);return ts.isVariableDeclaration(n)?n.initializer.getText(ast):n.getText(ast);}
// Paint program keys are the production module's pure key encoding.
const {build}=(await import('node:module')).createRequire(new URL('../package.json',import.meta.url))('esbuild'),paintKeysBuild=await build({entryPoints:[new URL('src/painted/delegated500/safety/current-paint-program.ts',web).pathname],bundle:true,write:false,format:'esm',platform:'node'}),paintKeys=await import('data:text/javascript;base64,'+Buffer.from(paintKeysBuild.outputFiles[0].text).toString('base64'));
const mainProjection=Float64Array.from({length:16},(_,i)=>i%5===0?(i===15?1:.1):0);
// Main demand is driven by a real world projection, even while no successful
// draw matrix exists. Test-local views therefore enter through that boundary.
function recordLocalMain(S,view){const unit=S.anchorUnit,[x,y]=S.anchor;S.recordMainProjection(S.multiply(view,[unit,0,0,0,0,0,-unit,0,0,unit,0,0,-x*unit,0,y*unit,1]));S.updateMainViewport(view);}
// The specialization suite's actual-material base: the City dispatcher anchors
// that the production C311-C318 material hooks rewrite, then the fixture text.
const DISPATCH_MATERIAL='vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}\nvec3 paintedFacade(vec3 base,vec3 p,vec3 n,vec4 frame,float family){return progressiveFeatureDispatchCity(base,p,n,frame,family);}\noriginal material';
const fixtureObjectIds=new Map();
function component(id='next',city='berlin'){if(!fixtureObjectIds.has(id))fixtureObjectIds.set(id,'osm/way/'+(1000000+fixtureObjectIds.size));return{city,objectId:fixtureObjectIds.get(id),partId:'part',origin:[13.4,52.5],componentGeometry:{type:'Polygon',coordinates:[[[13.4,52.5],[13.40001,52.5],[13.4,52.50001],[13.4,52.5]]]},sourceFeature:{type:'Feature',properties:{}},batches:[{positions:new Float32Array([0,0,0,1,2,0,0,0,1]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),color:[.2,.3,.4],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]};}
function context(){let sequence=0,error=0,uploads=0;const control={lost:false,failUpload:0,failCompile:false},bindings={vao:null,array:null},deleted=[],data=[],updates=[],pointers=[],shaders=[],programs=[];
 const gl={NO_ERROR:0,ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,VERTEX_ARRAY_BINDING:3,ARRAY_BUFFER_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,VERTEX_SHADER:8,FRAGMENT_SHADER:9,COMPILE_STATUS:10,LINK_STATUS:11,MAX_VERTEX_ATTRIBS:12,
 isContextLost:()=>control.lost,getError(){const value=error;error=0;return value;},getParameter:k=>k===3?bindings.vao:k===12?16:bindings.array,createVertexArray:()=>({vao:++sequence}),createBuffer:()=>({buffer:++sequence}),bindVertexArray(v){bindings.vao=v;},bindBuffer(t,v){if(t===1)bindings.array=v;},bufferData(t,value,usage){data.push({t,value,usage,buffer:bindings.array});if(++uploads===control.failUpload)error=1285;},getAttribLocation:(p,name)=>p.attrs?.[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(...args){pointers.push({buffer:bindings.array,args});},deleteVertexArray:v=>deleted.push(v),deleteBuffer:v=>deleted.push(v),bufferSubData:(_t,_at,value)=>updates.push(value),
 createShader:type=>{const value={type};shaders.push(value);return value;},shaderSource:(shader,source)=>{shader.source=source;},compileShader(){},getShaderParameter:shader=>!(typeof control.failCompile==='function'?control.failCompile(shader):control.failCompile),getShaderInfoLog:()=> 'controlled compile error',createProgram:()=>{const value={attrs:{},shaders:[]};programs.push(value);return value;},attachShader:(p,s)=>p.shaders.push(s),detachShader:(p,s)=>{p.shaders=p.shaders.filter(v=>v!==s);},bindAttribLocation:(p,index,name)=>p.attrs[name]=index,
 // As WebGL linking does, every vertex input the program declares and did not
 // bind explicitly receives a free location (the shadow program binds none).
 linkProgram(p){p.failed=p.shaders.some(shader=>typeof control.failCompile==='function'?control.failCompile(shader):control.failCompile);if(p.failed)return;const used=new Set(Object.values(p.attrs)),vertex=p.shaders.find(shader=>shader.type===8)?.source??'';let next=0;for(const [,name]of vertex.matchAll(/\bin\s+(?:(?:highp|mediump|lowp)\s+)?\w+\s+(a_\w+)\s*;/g)){if(name in p.attrs)continue;while(used.has(next))next++;p.attrs[name]=next;used.add(next);}},getExtension:()=>null,getProgramParameter:p=>!p.failed,getProgramInfoLog:()=> 'controlled link error',deleteShader:s=>{s.deleted=true;},deleteProgram:p=>{p.deleted=true;deleted.push(p);}};
 return{gl,control,deleted,data,updates,pointers,shaders,programs,get uploads(){return uploads;}};
}
// The City material producer (sidecar projection over model fixtures) is the
// isolated stage: it returns the CityChunkMaterial contract with zero sidecars.
function produceFixtureMaterial(S,rows){
 const count=rows.reduce((n,c)=>n+c.batches.reduce((v,b)=>v+b.positions.length/3,0),0),mask=S.createRathausProxyMasks(),recipe=mask.cpuRecipe();mask.destroy();
 const material={costs:[],retainedBytes:0,paint:new Float32Array(count*5),progressive:new Float32Array(count*4),sidecars:{c311:new Float32Array(count*3),c312:new Float32Array(count*4),c313:new Float32Array(count*4),cbt:new Float32Array(count*3),c298:new Float32Array(count*3),c018:new Float32Array(count*3)},geometry:new Map(),maskRecipe:recipe,metadata:S.captureCityChunkMetadata()};
 material.costs=S.measureCityChunkMaterialCosts(material);material.retainedBytes=material.costs.reduce((n,cost)=>n+cost.bytes,0);return material;
}
// buildBatches keeps its actual chunk production tail; the sidecar validation
// prelude (owned by the City sidecar suites) becomes the minimal accounting it
// feeds the tail, and its nested material producer calls the fixture stage.
function rewriteBuildBatches(js){
 const fn=ts.createSourceFile('build.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),decl=fn.statements[0],body=decl.body.statements;
 const start=body.findIndex(n=>/^const input\s*=\s*residentChunkInput,\s*scope\s*=\s*currentDataScope\(\);/.test(n.getText(fn)));assert(start>0,'buildBatches production tail');
 let tail=body.slice(start).map(n=>n.getText(fn)).join('\n');
 // The production constructor's try/finally owns temporary derived leases;
 // esbuild expresses its block-local function as a let-bound function expression.
 // Replace only that initializer, preserving the constructor and its ownership.
 const tailAST=ts.createSourceFile('city-production-tail.js',tail,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),producers=[];
 (function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='produceMaterial'&&node.initializer&&ts.isFunctionExpression(node.initializer))producers.push(node.initializer);ts.forEachChild(node,visit);})(tailAST);
 assert.equal(producers.length,1,'one City numerical material stage');const producer=producers[0];
 tail=tail.slice(0,producer.getStart(tailAST))+'function(rows,signal){signal.throwIfAborted();return __produceFixtureMaterial(rows);}'+tail.slice(producer.end);
 const params=decl.parameters.map(p=>p.getText(fn)).join(',');
 return `function buildBatches(${params}){${body[0].getText(fn)}
if(__failCPU())throw Error('controlled CPU validation');gpuPreflightRequired=Boolean(c311Incoming||c312Incoming||c313Incoming);c311LastArgs=[components,nextGeneration,shadowAdmission,nativeDisplay,partialGatePlan,s402Plan,s434Plan,s036Plan,s240Plan,s528Binding,c018Plan,c248Coface,cbtPlan,c298Plan,c311Incoming,c313Incoming,c312Incoming,prepared];
let count=0,ic=0;const seen=new Set();for(const c of components){if(seen.has(key(c)))throw Error('Duplicate component identity');seen.add(key(c));for(const m of c.batches){count+=m.positions.length/3;ic+=m.indices.length;}}
const nextSourceLoaded=new Map(components.map(c=>[key(c),c])),s434Entries=[];s434DisplayProfile=null;const batchIncluded=(c,bi)=>sourceRoleBatchIncluded(c,bi)&&s434AggregateBatchIncluded(s434DisplayProfile,c,bi,s434Entries);
${tail}}`;
}
async function fixture(t,{city='berlin',bound=true,projection=true,preparationSignal}={}){
 const c=context(),events=[],masks=[];let failCPU=false;
 // Rathaus proxy mask GPU residency stays the fixture mask, as before; its CPU
 // recipe now travels with each chunk material and binds one mask per chunk.
 // Retirement is counted: detach (GPU residency only) and destroy (the whole
 // mask) are each recorded, so a placeholder can be required to retire once.
 const newMask=()=>{const residents=new Map(),value={detaches:0,destroys:0,prepared:[],residentRevision:'fixture-mask',prepare(context,programs){value.prepared.push([...programs]);if(c.control.lost)return{ready:false,reason:'context-lost'};let set=residents.get(context);if(!set)residents.set(context,set=new Set());for(const program of programs)set.add(program);return{ready:true};},isResident:(context,program)=>!c.control.lost&&!!residents.get(context)?.has(program),withResidentMasks:(_g,_p,draw)=>{draw();return true;},withMasks:(_g,_p,draw)=>draw(),retain(){return{...value,release(){}};},detach(){value.detaches++;residents.clear();},destroy(){value.destroys++;value.destroyed=true;residents.clear();},cpuRecipe(){return{costs:[],wordMasks:[],createBinding:()=>newMask(),release(){}};}};masks.push(value);return value;};
 const flat=await cityFixtures.flattenCity({city,imports:['s434AggregateBatchIncluded','C318_FIXTURE'],rewrite:{buildBatches:rewriteBuildBatches}}),S=flat.values,runtime=flat.runtime;
 const prog=cityFixtures.programOwner(flat,'actual city geometry fixture'),owner=prog.owner,releasedPrograms=[];
 S.programPreparation={...prog.api,releaseProgram:(...args)=>{releasedPrograms.push(args[1]);return prog.api.releaseProgram(...args);}};
 // The page chunk store owns chunk material, packed CPU, state and mesh-view
 // leases; the renderer's geometry owners and admission ledger use it too.
 const store=runtime.store.getPageChunkResourceStore();runtime.store.bindChunkResourceContext(c.gl,store);
 Object.assign(S,{rathausProxyMasks:newMask(),createRathausProxyMasks:newMask,gl:bound?c.gl:undefined,captureRuntime:{invalidate(){events.push('capture');}},syncFacadeResources(){events.push('textures');},c311Repack(){events.push('repack');},reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},VERTEX:'original vertex',HAMBURG_WHITE_VERTEX:'white vertex',HAMBURG_WHITE_FRAGMENT:'white fragment',fragment:(helper,paint)=>helper+'|'+paint,specializeCurrentPaintFragment:(s,f)=>s+'|family='+f,withResidentReflectionClip:s=>s+'|clip',baseSurfaceFragment:'original helper',familySurfaceHelper:'original helper',isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,__failCPU:()=>failCPU,__produceFixtureMaterial:rows=>produceFixtureMaterial(S,rows),
  // The S528 projection sidecar belongs to the isolated material stage: no
  // fixture row is an S528 projection candidate.
  s528ProjectionCandidate:()=>false});
 S.map.triggerRepaint=()=>events.push('repaint');
 // The display hook modules stay isolated. Their vertex stand-ins keep the
 // fixture marker and declare the display attribute the actual hook adds
 // ("in highp vecN a_<hook>_display;" before main), so a program whose
 // attributes are not bound explicitly links it as WebGL would.
 const displaySize={c018:3,cbt:3,c298:3,c311:3,c312:4,c313:4};
 S.cityVertexHooks=Object.freeze(Object.fromEntries(Object.entries(S.cityVertexHooks).map(([name,hook])=>[name,(source,city)=>{const next=hook(source,city);if(next===source)return source;const input='in highp vec'+displaySize[name]+' a_'+name+'_display;';return next.includes('void main(){')?next.replace('void main(){',input+'void main(){'):input+next;}])));
 // The material recipe is the production one (the factory's default hook list,
 // as the production initializer installs it, and its fallback chain). The
 // synthetic material keeps the real City dispatcher anchors (the base of the
 // specialization suite's actual C311-318 materials), so those actual material
 // hooks apply to it.
 const preparedData=await cityFixtures.preparedCityData(flat,{material:DISPATCH_MATERIAL});S.preparedDataFixture=preparedData;
 // This fixture's admitted paint table is explicitly empty. Every progressive
 // query still borrows the real prepared table before answering, as before.
 const emptyPaintView=Object.freeze([]),emptyPaint=scope=>scope.borrow(preparedData.resources.admissions,rows=>{assert.equal(rows.length,0);});
 S.cityData_isProgressivelyPainted=(_component,scope)=>{emptyPaint(scope);return false;};
 S.cityData_progressiveRenderView=scope=>{emptyPaint(scope);return emptyPaintView;};
 // The base material and its source description borrow the prepared city
 // table of the active data scope, as the original material callbacks do; the
 // base goes through the production scoped binding (currentDataScope()).
 S.baseFacadePaintFragmentForCity=S.scopedCityData((requested,scope)=>{assert.equal(requested,S.city);assert(scope&&!scope.stats.disposed,'the base material reads the prepared scope');return scope.borrow(preparedData.resources.extra,record=>{assert.equal(record.city,S.city);return S.fixtureMaterial;});},1);
 const describeSource=S.cityData_describeFacadePaintSource;S.cityData_describeFacadePaintSource=(requested,source,kind,scope)=>{scope.borrow(preparedData.resources.extra,record=>{assert.equal(record.city,S.city);});return describeSource(requested,source,kind,scope);};
 // Ingress-selected renderer chunk input: one authoritative source group.
 let sequence=0;const chunkInput=rows=>({store,groups:[{contentKey:'fixture-source:'+(++sequence)+':'+rows.map(row=>row.objectId).join(','),components:rows,parents:[],frame:runtime.chunkInput.rendererChunkFrame([13.4,52.5],'fixture-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]});
 const setPrepared=S.setBatches;
 S.setBatches=async(...args)=>{const prepared=args[0].length?await S.prepareBatches(args[0],preparationSignal??new AbortController().signal,undefined,undefined,chunkInput(args[0])):undefined;args[17]=prepared;try{return setPrepared(...args);}finally{prepared?.release();}};
 if(projection)S.recordMainProjection(mainProjection);
 S.residentGPU=runtime.lifecycle.createResidentGPULifecycle({bind:context=>S.gl=context,initialize:S.initializeResidentGPU,release:()=>{},ready:S.gpuReady,lost:context=>context.isContextLost(),hasResident:()=>S.sceneIndexCount()>0||!!S.pendingGeometryCandidate,needsPreflight:()=>S.gpuPreflightRequired,clearTransient(){},revision:()=>S.viewRevision});
 // Chunk material/packing production settles on promise turns (flush); the
 // A timer scheduled by another timer runs on the next turn, just as in the browser.
 // Draining future recent-cache expiry callbacks immediately would spin before their deadline.
 // The shared program/geometry preparation keeps its original bounds: fewer than
 // 200 queued steps per drain and fewer than 50 settle rounds.
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const drain=()=>prog.turn(()=>{const count=prog.queue.length;assert(count<200,'unbounded program/geometry preparation');for(let n=0;n<count;n++)prog.queue.shift()();return count;}),poll=()=>S.prepareGeometryUpload();
 const settle=async()=>{await flush();drain();await flush();poll();};
 const finish=async(ready=()=>!S.geometryUploadPending&&!S.pendingGeometryCandidate)=>{for(let n=0;n<50;n++){await flush();drain();poll();if(ready())return;}assert.fail('actual city geometry pipeline did not reach its bounded checkpoint');};
 t.after(()=>{S.clearResidentRollback?.();S.residentDataRelease?.();S.residentDataRelease=undefined;preparedData.release();prog.api.dispose();});
 return{S,c,setPrepared,queue:prog.queue,events,masks,releasedPrograms,owner,store,poll,drain,settle,finish,flush,component:id=>component(id,S.city),failCPU:value=>{failCPU=value;},async commit(rows=[component('next',S.city)],generation=S.generation+1){await S.setBatches(rows,generation);await finish();assert(S.program,JSON.stringify({candidateFailure:S.candidateFailure,geometryFailure:S.geometryFailure}));}};
}
// Chunk scene views of the former single-block state: the canonical packed CPU
// vertices and the selection state live on each resident chunk's leases, and a
// program's mask residency on each chunk's own mask binding.
const chunkVertices=S=>S.sceneChunks.map(chunk=>chunk.cpu.value.vertices);
const chunkMasksResident=(S,gl,program)=>S.sceneChunks.length>0&&S.sceneChunks.every(chunk=>chunk.masks.isResident(gl,program));

test('city growth lookup follows replacement and empty publications for the same identity',async t=>{
 const f=await fixture(t),{S}=f,identity=f.component('growth-publication');
 await f.commit([identity],1);
 const previous=S.localComponent(identity),oldChunk=previous.chunk;
 oldChunk.state.value[previous.row.firstVertex]=.25;
 assert.equal(S.growthSnapshot().minGrowth,.25);
 await f.commit([f.component('growth-publication')],2);
 const current=S.localComponent(identity);
 assert.notEqual(current.chunk,oldChunk);
 assert.equal(current.chunk,S.sceneChunks[0]);
 assert.equal(current.row,current.chunk.loaded.get(S.key(identity)));
 current.chunk.state.value[current.row.firstVertex]=.75;
 assert.equal(S.growthSnapshot().minGrowth,.75,'the same identity reads the replacement CPU state');
 await S.setBatches([],3);
 assert.equal(S.localComponent(identity),undefined);
 assert.equal(S.growthSnapshot().components,0);
 assert.equal(S.growthSnapshot().minGrowth,1);
});

test('city temporary candidate growth lookup restores the resident after rollback',async t=>{
 const f=await fixture(t),{S}=f,identity=f.component('growth-rollback');
 await f.commit([identity],1);
 const resident=S.localComponent(identity);
 resident.chunk.state.value[resident.row.firstVertex]=.25;
 const candidateKey=paintKeys.currentPaintProgramKey(13);
 S.paintProgramRuns=()=>[{key:candidateKey,firstIndex:0,indexCount:3}];
 await S.setBatches([f.component('growth-rollback')],2);
 await f.finish(()=>S.pendingGeometryCandidate?.mainKeys?.has(candidateKey));
 const candidate=S.pendingGeometryCandidate;assert(candidate);
 assert.equal(S.localComponent(identity).chunk,resident.chunk,'preparation leaves the resident lookup installed');
 S.withGeometryCandidate(candidate,()=>{
  const local=S.localComponent(identity);
  assert.notEqual(local.chunk,resident.chunk);
  assert.equal(local.chunk,S.sceneChunks[0]);
  local.chunk.state.value[local.row.firstVertex]=.75;
  assert.equal(S.growthSnapshot().minGrowth,.75);
 });
 assert.equal(S.localComponent(identity).chunk,resident.chunk);
 assert.equal(S.growthSnapshot().minGrowth,.25,'temporary candidate evaluation restores the resident CPU row');
 S.cancelCandidate(2);f.drain();
 assert.equal(S.pendingGeometryCandidate,undefined);
 assert.equal(S.generation,1);
 assert.equal(S.localComponent(identity).chunk,resident.chunk);
 assert.equal(S.growthSnapshot().minGrowth,.25,'cancelled work cannot reinstall the candidate lookup');
});

test('city shares numeric geometric visibility between frame and main preparation, with viewport and context invalidation',async t=>{
 const f=await fixture(t),{S,c}=f,keys=[9,11].map(paintKeys.currentPaintProgramKey),read=S.paintBoxOutsideClip,reads=new Map();
 S.paintBoxOutsideClip=(box,view)=>{reads.set(box,(reads.get(box)??0)+1);return read(box,view);};S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));
 const rows=[f.component('visible-left'),f.component('visible-right')];for(let i=0;i<rows[1].batches[0].positions.length;i+=3)rows[1].batches[0].positions[i]+=5;await f.commit(rows,1);
 const unit=S.anchorUnit,[x,y]=S.anchor,world=new Float64Array([unit,0,0,0,0,0,-unit,0,0,unit,0,0,-x*unit,0,y*unit,1]),view=S.multiply(world,[1/unit,0,0,0,0,0,1/unit,0,0,-1/unit,0,0,x,y,0,1]);S.recordMainProjection(world);
 const boxes=[...S.loaded.values()].map(row=>row.box),count=()=>boxes.reduce((n,box)=>n+(reads.get(box)??0),0);recordLocalMain(S,view);const first=count();assert.deepEqual([...S.mainFamilyProgramKeys()],[keys[0]]);
 for(let i=0;i<12;i++){recordLocalMain(S,new Float64Array(view));assert.equal(S.prepareResidentMain(),true);}assert.equal(count(),first,'frame and preparation share one result across equal matrix values');
 view[12]-=5;recordLocalMain(S,view);assert.equal(count(),first+2,'the same mutable matrix object is compared by its numeric values');assert.deepEqual([...S.mainFamilyProgramKeys()],[keys[1]]);recordLocalMain(S,view);assert.equal(count(),first+2);
 const canvas=S.map.getCanvas();S.map.getCanvas=()=>canvas;canvas.width++;recordLocalMain(S,view);assert.equal(count(),first+4,'drawing-buffer resize invalidates the view');S.window.devicePixelRatio=2;recordLocalMain(S,view);assert.equal(count(),first+6,'DPR changes also invalidate');
 const before=count();c.control.lost=true;S.contextLost();c.control.lost=false;recordLocalMain(S,view);assert.equal(count(),before+2,'the lost context incarnation cannot reuse an earlier result');assert.equal(S.mainDrawWitnessCurrent(),false,'geometric cache never certifies recovered program or GPU readiness');
});

test('city temporary candidate visibility stays independent of its resident and capture polling preserves live main priority',async t=>{
 const f=await fixture(t),{S,c}=f,keys=[9,11].map(paintKeys.currentPaintProgramKey),read=S.paintBoxOutsideClip,reads=new Map();S.paintBoxOutsideClip=(box,view)=>{reads.set(box,(reads.get(box)??0)+1);return read(box,view);};
 S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));const rows=[f.component('resident-left'),f.component('resident-right')];for(let i=0;i<rows[1].batches[0].positions.length;i+=3)rows[1].batches[0].positions[i]+=5;await f.commit(rows,1);
 const view=new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);recordLocalMain(S,view);const boxes=[...S.loaded.values()].map(row=>row.box),count=()=>boxes.reduce((n,box)=>n+(reads.get(box)??0),0);
 S.activeCaptureProgramKeys=()=>new Set(keys);const priorities=[],recipes=[],acquire=S.programPreparation.acquireReadyProgram;S.programPreparation.acquireReadyProgram=(context,recipe)=>{priorities.push(recipe.priority);recipes.push(recipe);return acquire(context,recipe);};
 for(const family of [9,11]){const program=S.compileGeometryProgram(S.familySurfaceHelper,false,family,true);S.programPreparation.releaseProgram(c.gl,program);}assert.deepEqual(priorities,['visible','capture'],'capture polling cannot downgrade an exact recipe that still serves the actual main view');
 const moved=new Float64Array(view);moved[12]=-5;recordLocalMain(S,moved);assert.deepEqual(recipes.map(recipe=>recipe.currentPriority()),['capture','visible'],'live roles change without another compile poll');recordLocalMain(S,view);assert.deepEqual(recipes.map(recipe=>recipe.currentPriority()),['visible','capture']);
 const candidateKey=paintKeys.currentPaintProgramKey(13);S.paintProgramRuns=()=>[{key:candidateKey,firstIndex:0,indexCount:3}];await S.setBatches([f.component('candidate')],2);await f.finish(()=>S.pendingGeometryCandidate?.mainKeys?.has(candidateKey));const candidate=S.pendingGeometryCandidate;assert(candidate);assert.equal(S.generation,1);
 recordLocalMain(S,view);const previous=count(),residentRuns=S.mainViewportRuns;S.withGeometryCandidate(candidate,()=>{recordLocalMain(S,view);assert.deepEqual([...S.mainFamilyProgramKeys()],[candidateKey]);const result=S.mainViewportRuns;recordLocalMain(S,new Float64Array(view));assert.equal(S.mainViewportRuns,result);});
 recordLocalMain(S,view);assert.equal(S.mainViewportRuns,residentRuns);assert.equal(count(),previous,'restoring the resident reuses its own unchanged geometry result');assert.deepEqual([...S.mainFamilyProgramKeys()],[keys[0]]);
 S.cancelCandidate(2);f.drain();recordLocalMain(S,view);assert.equal(S.generation,1);assert.equal(S.pendingGeometryCandidate,undefined);assert.deepEqual([...S.mainFamilyProgramKeys()],[keys[0]],'late cancelled work cannot install the candidate visibility');
});
// The page chunk store keeps a released mesh view (and the static geometry it
// borrows) in its recent cache until eviction. Eviction disposes the view's own
// handles at once; its static parent is released when that retirement
// completes (the fake driver has no fence, so the store's bounded 100 ms
// fallback applies; its clock is advanced instead of waited for) and is then
// evicted from the recent cache in turn.
function retireRecent(store){
 store.evictRecent();
 const now=performance.now;let clock=now.call(performance)+1000;performance.now=()=>clock;
 try{store.collectRetired();}finally{performance.now=now;}
 store.evictRecent();
}
// The solar admission stage is isolated: it hands a chunk the shadow index
// lease updateSolarShadowIndices produces (a CPU lease over the chunk's packed
// CPU parent), replacing the previous one.
function setChunkShadow(store,chunk,indices){
 const packed=chunk.cpu.value,next=store.acquire({contentKey:JSON.stringify([chunk.cpu.contentKey,'solar-indices-v1',[...indices]]),role:'solar',parents:[chunk.cpu],estimate:{category:'shadow',bytes:indices.byteLength,precision:'exact'},produce:()=>Uint32Array.from(indices,index=>packed.indices[index]),costs:value=>({category:'shadow',bytes:value.byteLength,precision:'exact',identity:value.buffer})});
 assert(next.value,'the shadow index lease is ready');chunk.shadowCPU?.release();chunk.shadowCPU=next;chunk.shadowIndices=next.value;
}
test('city actual packing keeps canonical9/state1 unpublished through compilation and uploads those same arrays once admitted',async t=>{
 // Chunk scene: the canonical 9-float vertices and 1-float state are the packed
 // chunk CPU and state leases; the mesh view uploads exactly those arrays.
 const f=await fixture(t),{S,c}=f,previous=S.snapshotResident();await S.setBatches([f.component()],1);const candidate=S.pendingGeometryCandidate;assert(candidate);assert.equal(S.sceneChunks.length,0);assert.equal(c.data.length,0);assert.equal(S.program,undefined);assert.equal(f.owner.stats.pending,1);await f.finish();assert.equal(S.pendingGeometryCandidate,undefined);
 assert.equal(S.sceneChunks.length,1,JSON.stringify(Object.fromEntries(['candidateFailure','geometryFailure','materialSourceFailure','mainDrawFailure'].map(name=>{const error=S[name];return[name,error===undefined?undefined:{name:error?.name??typeof error,message:String(error?.message??error).slice(0,800)}];}))).slice(0,3200));const chunk=S.sceneChunks[0],cpu=chunk.cpu.value,state=chunk.state.value,lease=S.geometryOwner.currentLeases[0];assert.equal(cpu.vertices.length,27);assert.equal(state.length,3);assert.equal(S.generation,1);
 assert.equal(c.data.filter(row=>row.value===cpu.vertices).length,1);assert.equal(c.data.filter(row=>row.value===state).length,1);assert.equal(c.data.filter(row=>row.value===cpu.indices).length,1);assert.equal(c.data.length,5,'index/static/state/paint/progressive only');
 assert.equal(chunk.geometry,lease);assert.deepEqual([...lease.value.buffers.keys()].sort(),['paint','progressive','state','vertex']);assert.equal(S.geometryOwner.currentLeases.length,1);assert.equal(S.geometryUploadPending,false);assert.equal(f.owner.stats.pending,0);assert.equal(S.residentGPU.stats.initialized,false,'fixture did not attach a context');
 assert.equal(previous.masks.detaches+previous.masks.destroys,1,'the previous resident mask placeholder retires exactly once on publication');
});

test('city registers every actual main recipe in the same pending poll without duplicate grants',async t=>{
 const f=await fixture(t),{S,c}=f,requested=new Set(),compile=S.programPreparation.compile,keys=[9,11,13].map(paintKeys.currentPaintProgramKey);
 S.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));
 await S.setBatches([f.component('required-9'),f.component('required-11'),f.component('required-13')],1);
 // The shared packer now settles through several source steps. Stop the existing
 // bounded driver at the first actual main registration, before any later GL turn.
 await f.finish(()=>S.pendingGeometryCandidate?.mainKeys?.size===keys.length);
 const candidate=S.pendingGeometryCandidate;assert(candidate);assert.deepEqual([...candidate.mainKeys],keys);for(const family of [0,9,11,13])assert(requested.has('city:berlin:colour:'+family),'all current main recipes register before the next GL preparation turn');
 assert.equal(S.generation,0);assert.equal(c.data.length,0);const grants=f.owner.stats.shared.grantedReferences;f.poll();f.poll();assert.equal(f.owner.stats.shared.grantedReferences,grants,'repeated pending polls do not acquire duplicate ready roles');assert.equal(S.generation,0);
 await f.finish();assert.equal(S.generation,1);for(const key of keys)assert(S.familyPrograms.has(key));assert.equal(S.pendingGeometryCandidate,undefined);
});

test('city published-resident restoration registers every main recipe without treating recovered buffers as a full-draw witness',async t=>{
 const f=await fixture(t),{S,c}=f,keys=[9,11,13].map(paintKeys.currentPaintProgramKey),requested=new Set(),compile=S.programPreparation.compile;S.paintProgramRuns=()=>keys.map((key,i)=>({key,firstIndex:i*3,indexCount:3}));S.programPreparation.compile=(context,recipe)=>{requested.add(recipe.resource);return compile(context,recipe);};await f.commit([f.component('restore9'),f.component('restore11'),f.component('restore13')],1);const vertices=chunkVertices(S),plan=S.publishedDataPlan;assert(vertices.length>0);
 c.control.lost=true;S.contextLost();c.control.lost=false;requested.clear();const uploads=c.data.length;S.invalidateMainProjection();S.initializeResidentGPU(c.gl,true);assert.equal(requested.size,0,'unknown main projection cannot register restored programs');assert.equal(c.data.length,uploads);assert.equal(S.mainDrawWitnessCurrent(),false);S.recordMainProjection(mainProjection);
 let candidate;for(let i=0;i<16;i++){S.initializeResidentGPU(c.gl,true);candidate=S.pendingGeometryCandidate;if(candidate?.mainKeys?.size===3)break;f.drain();}assert(candidate);for(const family of [0,9,11,13])assert(requested.has('city:berlin:colour:'+family),'the first main registration pass includes all required restored roles');assert.equal(c.data.length,uploads);assert.equal(S.mainDrawWitnessCurrent(),false);const grants=f.owner.stats.shared.grantedReferences;S.initializeResidentGPU(c.gl,true);S.initializeResidentGPU(c.gl,true);assert.equal(f.owner.stats.shared.grantedReferences,grants);
 await f.finish();assert.equal(S.generation,1);assert.equal(S.sceneChunks.length,vertices.length);S.sceneChunks.forEach((chunk,i)=>assert.strictEqual(chunk.cpu.value.vertices,vertices[i],'restoration keeps the canonical packed CPU chunk'));assert.strictEqual(S.publishedDataPlan,plan);assert.equal(plan.scope.stats.disposed,false);for(const key of keys)assert(S.familyPrograms.has(key));assert.equal(f.owner.stats.pending,0);assert.equal(S.mainDrawWitnessCurrent(),false,'real initialization/upload is not a substitute for the production full main draw');
});

test('city main-ready gate keeps the prior resident until an actual finite main projection admits the candidate',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();const previous=S.snapshotResident(),vertices=S.vertices,gpu=S.geometryOwner.current,program=S.program,uploads=c.data.length;
 S.invalidateMainProjection();await S.setBatches([f.component('projection-wait')],2);await f.settle();const candidate=S.pendingGeometryCandidate;assert(candidate);assert.equal(S.candidateMainStamp(),undefined);assert.equal(S.candidateMainCurrent(candidate),false);assert.equal(S.generation,1);assert.equal(S.vertices,vertices);assert.equal(S.geometryOwner.current,gpu);assert.equal(S.program,program);assert.equal(c.data.length,uploads);
 const invalid=mainProjection.slice();invalid[3]=NaN;S.recordMainProjection(invalid);assert.equal(S.candidateMainStamp(),undefined);
 S.recordMainProjection(mainProjection);await f.finish();assert.equal(S.generation,2);assert.equal(S.pendingGeometryCandidate,undefined);assert.notEqual(S.geometryOwner.current,gpu);assert(chunkMasksResident(S,c.gl,S.program),'every published chunk mask is resident for the admitted main program');previous.clear();
});

test('city main-ready gate waits for exact texture bindings and publishes prewarmed material programs atomically',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();const gpu=S.geometryOwner.current,vertices=S.vertices,program=S.program,uploads=c.data.length;
 S.paintMode=()=>1;S.isFacadeLandmark=()=>true;S.surfaceFragment='window helper';S.diffuseFragment='diffuse helper';
 const textureControls={setUploadSize(value){assert.equal(value,256);},setEnabled(){},attach(){},detach(){}};S.windowTexture={...textureControls,stats:{ready:false,loading:true,residentRevision:1}};S.diffuseTexture={...textureControls,stats:{plaster:{ready:false,loading:true,residentRevision:1},brick:{ready:true,residentRevision:1}},setNeededMaterials(){}};
 await S.setBatches([f.component('texture-wait')],2);for(let i=0;i<20&&!S.pendingGeometryCandidate?.needsWindow;i++){await f.settle();}
 const candidate=S.pendingGeometryCandidate;assert(candidate?.needsWindow);assert(candidate.needsDiffuse);assert.equal(S.candidateTexturesReady(candidate),false);assert.equal(S.generation,1);assert.equal(S.vertices,vertices);assert.equal(S.program,program);assert.equal(S.geometryOwner.current,gpu);assert.equal(c.data.length,uploads);
 S.windowTexture.stats.ready=true;S.windowTexture.stats.loading=false;S.windowTexture.stats.residentRevision++;S.diffuseTexture.stats.plaster.ready=true;S.diffuseTexture.stats.plaster.loading=false;S.diffuseTexture.stats.plaster.residentRevision++;await f.finish();
 assert.equal(S.generation,2);assert(S.texturedProgram);assert(S.diffuseProgram);assert.notEqual(S.geometryOwner.current,gpu);for(const p of [S.program,S.texturedProgram,S.diffuseProgram])assert(chunkMasksResident(S,c.gl,p));
});

test('city main-ready cancellation and context loss cannot publish or delete a candidate into the old resident',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();const vertices=S.vertices,program=S.program,gpu=S.geometryOwner.current;
 S.invalidateMainProjection();await S.setBatches([f.component('cancelled')],2);await f.settle();const candidate=S.pendingGeometryCandidate;assert(candidate);assert.equal(candidate.targetGeneration,2);S.cancelCandidate(99);assert.equal(S.pendingGeometryCandidate,candidate);
 const epoch=S.geometryOwner.store.contextEpoch(c.gl),publishedLeases=[...S.geometryOwner.currentLeases],publishedGeneration=S.geometryOwner.stats.publishedGeneration;assert.equal(publishedLeases.length,1);assert.equal(publishedLeases[0].value,gpu);
 c.control.lost=true;const deleted=c.deleted.length,uploadsAtLoss=c.data.length;assert.equal(S.candidateMainCurrent(candidate),false);S.cancelCandidate(2);f.drain();assert.equal(S.pendingGeometryCandidate,undefined);assert.equal(c.deleted.length,deleted,'context-lost cancellation must not issue deletes against invalid GL objects');assert.equal(S.vertices,vertices);assert.equal(S.program,program);assert.equal(S.generation,1);
 // ROOT accepted (stage-3 shared-core-3 CDR[1]): once the program side detects the loss, the charged
 // program claim invalidates that context epoch in the page store, so the old resident lease becomes
 // lost instead of staying current. The candidate is still neither published nor deleted.
 assert(S.geometryOwner.store.contextEpoch(c.gl)>epoch,'the program side invalidated the lost context epoch');
 assert.equal(S.geometryOwner.current,undefined,'the old resident lease of the lost epoch is no longer current');assert.equal(S.geometryOwner.currentGeometries.length,0,'a lost resident exposes no live geometry');
 assert.deepEqual(S.geometryOwner.currentLeases,publishedLeases,'no candidate lease was published into the lost resident scene');assert.equal(S.geometryOwner.stats.publishedGeneration,publishedGeneration,'the resident scene generation did not advance to the candidate');assert.equal(c.data.length,uploadsAtLoss,'nothing was uploaded into the lost context');c.control.lost=false;
});

test('city main-ready hook fallback retires the prewarm and publishes the exact final base source',async t=>{
 const f=await fixture(t,{city:'munich'}),{S,c}=f,programShaders=new Map(),grants=[],releases=[];
 const attach=c.gl.attachShader;c.gl.attachShader=(program,shader)=>{const list=programShaders.get(program)??[];list.push(shader);programShaders.set(program,list);attach(program,shader);};
 const submitted=program=>{const shaders=programShaders.get(program);assert(shaders,'the program must come from actual mock shaderSource/attach calls');return{vertex:shaders.find(shader=>shader.type===c.gl.VERTEX_SHADER)?.source,fragment:shaders.find(shader=>shader.type===c.gl.FRAGMENT_SHADER)?.source};};
 for(const method of ['compile','acquireReadyProgram']){const original=S.programPreparation[method];S.programPreparation[method]=(...args)=>{const value=original(...args);if(value)grants.push({program:value,resource:args[1].resource,inputs:[...args[1].inputs]});return value;};}
 const release=S.programPreparation.releaseProgram;S.programPreparation.releaseProgram=(...args)=>{releases.push(args[1]);return release(...args);};
 await f.commit();const oldProgram=S.program,oldGPU=S.geometryOwner.current,oldSource=submitted(oldProgram);
 S.paintProgramRuns=()=>[{key:paintKeys.currentPaintProgramKey(42),firstIndex:0,indexCount:3}];
 c.control.failCompile=shader=>shader.type===c.gl.FRAGMENT_SHADER&&shader.source?.includes('|family=42')&&shader.source?.includes('|c313');await S.setBatches([f.component('family-fallback')],2);assert.equal(S.program,oldProgram);assert.equal(S.geometryOwner.current,oldGPU);await f.finish();
 assert.equal(S.generation,2);assert.equal(S.c313ShaderActive,false);assert.equal(S.programHookSignature,'1:1:0');const family=S.familyPrograms.get(paintKeys.currentPaintProgramKey(42));assert(family);const familySource=submitted(family);assert.match(familySource.fragment,/\|family=42\|clip$/,'the existing fixture specialization changes only this final family suffix');
 const expectedBase={vertex:familySource.vertex,fragment:familySource.fragment.replace(/\|family=42\|clip$/,'|family=0|clip')};
 assert.deepEqual(submitted(S.program),expectedBase,'the committed base must have the same actual fallback shader bytes as the selected family, with only its family dispatch suffix changed');
 if(S.program===oldProgram)assert.deepEqual(oldSource,expectedBase,'reusing the initial handle is valid only when its submitted vertex and fragment bytes exactly match the final base');
 assert(c.shaders.some(shader=>shader.type===c.gl.FRAGMENT_SHADER&&shader.source?.includes('|family=42')&&shader.source?.includes('|c313')),'the controlled failing hook source was actually submitted');
 assert(chunkMasksResident(S,c.gl,family));assert(chunkMasksResident(S,c.gl,S.program));
 const held=new Map();for(const {program}of grants)held.set(program,(held.get(program)??0)+1);for(const program of releases)held.set(program,(held.get(program)??0)-1);for(const [program,count]of held)if(count===0)held.delete(program);
 const expected=new Map();for(const program of [S.program,family])expected.set(program,(expected.get(program)??0)+1);assert.deepEqual(held,expected,'every successful grant is retired or belongs to exactly one committed base/family role');assert(releases.includes(oldProgram),'the previous resident grant is retired even when a new exact grant reuses its program object');assert(grants.some(row=>row.program===S.program&&row.resource==='city:munich:colour:0'));assert(grants.some(row=>row.program===family&&row.resource==='city:munich:colour:42'));
 assert.equal(f.owner.stats.shared.heldReferences,2);assert.equal(f.owner.stats.shared.grantedReferences-f.owner.stats.shared.releasedReferences,2);
});

test('actual empty-resident bootstrap compiles, uploads and publishes through the existing lifecycle without a gpuReady cycle',async t=>{
 const f=await fixture(t,{bound:false}),{S,c}=f;await S.setBatches([f.component()],1);assert(S.pendingGeometryCandidate);assert.equal(c.data.length,0);S.residentGPU.attach(c.gl);assert.equal(S.gpuReady(),false);await f.finish();assert.equal(S.gpuReady(),true);assert.equal(S.residentGPU.stats.initialized,true);assert.equal(S.residentGPU.stats.initializations,1);assert.equal(S.sceneVertexCount(),3);assert.equal(c.programs.length,1);
});

test('city CPU validation, candidate compile and upload failures preserve the uploaded CPU/GPU/program generation',async t=>{
 for(const failure of ['cpu','compile','upload']){const f=await fixture(t),{S,c}=f;await f.commit();const vertices=S.vertices,state=S.stateData,loaded=S.loaded,program=S.program,gpu=S.geometryOwner.current,masks=S.rathausProxyMasks;if(failure==='cpu'){f.failCPU(true);await S.setBatches([f.component('failed')],2);await f.finish();assert.match(S.candidateFailure??S.geometryFailure??'',/CPU validation/,'the renderer records the candidate failure without throwing through the render loop');}else{if(failure==='compile'){S.materialRecipeRevision++;S.familySurfaceHelper+='|controlled-new-compile';c.control.failCompile=true;}else c.control.failUpload=c.uploads+2;await S.setBatches([f.component('failed')],2);try{await f.finish();}catch(error){assert.match(String(error),/controlled|link|compile|WebGL/);}}
  assert.equal(S.vertices,vertices,failure);assert.equal(S.stateData,state,failure);assert.equal(S.loaded,loaded,failure);assert.equal(S.program,program,failure);assert.equal(S.generation,1,failure);assert.equal(S.geometryOwner.current,gpu,failure);assert.equal(S.rathausProxyMasks,masks,failure);assert.equal(masks.detaches,0,failure);assert.equal(S.pendingGeometryCandidate,undefined,failure);assert(!program.deleted,failure);
 }
});

test('city replacement and cancellation release only the unpublished candidate and its source work',async t=>{
 const f=await fixture(t),{S}=f;await f.commit();const vertices=S.vertices,program=S.program;S.materialRecipeRevision++;await S.setBatches([f.component('obsolete')],2);const obsolete=S.pendingGeometryCandidate,obsoleteMasks=obsolete.state.masks;await S.setBatches([f.component('latest')],3);assert.equal(obsoleteMasks.detaches+obsoleteMasks.destroys,1,'a disposed candidate placeholder retires exactly once (destroy also releases its budget)');assert.equal(obsolete.state.masks,undefined,'disposed snapshots release their held references');const latest=S.pendingGeometryCandidate,latestMasks=latest.state.masks;S.rollbackResidentUpload();f.drain();assert.equal(latestMasks.detaches+latestMasks.destroys,1);assert.equal(latest.state.masks,undefined);assert.equal(S.pendingGeometryCandidate,undefined);assert.equal(S.vertices,vertices);assert.equal(S.program,program);assert.equal(S.generation,1);assert.equal(f.owner.stats.pending,0);
});

test('city empty publication with a display context clears GPU preflight and accepts a valid empty frame',async t=>{
 const f=await fixture(t),{S,c}=f;
 S.residentGPU.attach(c.gl);
 const args=[[],1];args[14]={city:'cologne'};
 await S.setBatches(...args);
 assert.equal(S.sceneIndexCount(),0);
 assert.equal(S.pendingGeometryCandidate,undefined);
 assert.equal(S.residentGPU.stats.preflightRequired,false,'a display context alone cannot hold an empty publication pending');
 const programs=c.programs.length;
 assert.equal(S.residentGPU.emptyFrame(mainProjection),true);
 assert.equal(S.residentGPU.isEmptyReady(),true);
 assert.equal(c.programs.length,programs,'empty readiness requires no shader');
 S.residentGPU.emptyFrame(undefined);
 assert.equal(S.residentGPU.isEmptyReady(),false,'a missing main frame still cannot pass');
 S.residentGPU.attach(c.gl);
 S.recordMainProjection(mainProjection);
 await f.commit([f.component('after-empty')],2);
 assert.equal(S.sceneIndexCount(),3,'later nonempty publication still prepares and uploads');
 assert.equal(S.gpuReady(),true);
});

test('city empty publication retires its source workspace and pressure listener before discarding the data plan',async t=>{
 const f=await fixture(t),{S,store}=f,budget=store.budget,listeners=new Set(),onPressure=budget.onPressure;
 budget.onPressure=listener=>{listeners.add(listener);const off=onPressure(listener);return()=>{listeners.delete(listener);off();};};t.after(()=>{budget.onPressure=onPressure;});
 await f.commit();const plan=S.publishedDataPlan,sourceOwner=S.programSources.get(plan),before=listeners.size;
 assert(sourceOwner);assert.equal(sourceOwner.stats.released,false);assert(before>0,'the real source owner registers for budget pressure');
 await S.setBatches([],2);
 assert.equal(sourceOwner.stats.released,true);assert.equal(sourceOwner.stats.sourceCharacters,0);assert.equal(S.programSources.get(plan),undefined);
 assert.equal(listeners.size,before-1,'empty publication unbinds precisely its source workspace');assert.equal(S.residentDataPlan,undefined);assert.equal(S.publishedDataPlan,undefined);
 await S.setBatches([],3);assert.equal(listeners.size,before-1,'repeated empty publication cannot retain or release another workspace');
});

test('city pending selection uses current state at publication and never rewrites canonical geometry',async t=>{
 // Chunk form: the resident chunk's state lease is the selection buffer that
 // paintSelection rewrites and uploads (a dirty sub-range of that same array);
 // its packed CPU vertices are the canonical geometry that is never rewritten.
 const f=await fixture(t),{S,c}=f;await f.commit();const resident=S.sceneChunks[0],residentState=resident.state.value,vertices=resident.cpu.value.vertices.slice();await S.setBatches([f.component()],2);S.selectedIdentity={objectId:f.component().objectId,partId:'part'};S.paintSelection();assert.deepEqual(resident.cpu.value.vertices,vertices);const update=c.updates.at(-1);assert(update instanceof Float32Array&&update.buffer===residentState.buffer,'the selection upload is a range of the resident chunk state');assert(residentState.every(value=>Math.floor(value%4/2)===1));await f.finish();assert.notEqual(S.sceneChunks[0],resident);const states=S.sceneChunks.map(chunk=>chunk.state.value);assert(states.length&&states.every(state=>state.every(value=>Math.floor(value%4/2)===1)),'the published chunk state carries the current selection');for(const state of states)assert.equal(c.data.filter(row=>row.value===state).length,1);const published=chunkVertices(S).map(values=>values.slice()),hit=S.triangle([.25,2,.25],[0,-1,0],new Float32Array([0,0,0,0,1,0,1,1,1,1,2,0,0,1,0,1,1,1,0,0,1,0,1,0,1,1,1]),new Float32Array([.5,.5,.5]),0,1,2);assert(hit);assert.equal(hit.distance,1.75);assert.deepEqual(chunkVertices(S),published);
});

test('city main and shadow views keep exact sidecar layouts and shadow borrows without copying main buffers',async t=>{
 // Chunk form: the sidecar buffers are the resident chunk mesh view's static
 // buffers; the chunk shadow view borrows them from that main view.
 const f=await fixture(t,{city:'munich'}),{S,c}=f;await f.commit();const chunk=S.sceneChunks[0],main=chunk.geometry.value;assert.equal(S.sceneChunks.length,1);assert.equal(S.geometryOwner.current,main);for(const [name,size]of [['c311',3],['c312',4],['c313',4]]){const buffer=main.buffers.get(name);assert(buffer,name);assert(c.pointers.some(row=>row.buffer===buffer&&row.args[1]===size&&row.args[4]===size*4),name);}
 // The shadow program compiles on the shared bounded preparation turns; the
 // index buffer is the only shadow upload.
 const shadowReady=()=>{for(let i=0;i<20&&!S.shadowGeometryOwner.currentLeases.length;i++){S.uploadShadow();f.drain();}};
 setChunkShadow(f.store,chunk,Uint32Array.from([0,1,2]));const before=c.data.length;shadowReady();assert.equal(c.data.length,before+1,'shadow owns its index upload only');assert.equal(S.shadowResidentIndexCount,3);const view=S.shadowGeometryOwner.current;assert(view);assert.equal(view.buffers.get('vertices'),main.buffers.get('vertex'));assert.equal(view.buffers.get('c312'),main.buffers.get('c312'));const mainBuffers=[main.indexBuffer,...main.buffers.values()];setChunkShadow(f.store,chunk,Uint32Array.from([0,1,2,0,1,2]));c.control.failUpload=c.uploads+1;const queuedAt=c.data.length;S.uploadShadow();assert.equal(c.data.length,queuedAt,'shadow upload is a separate scheduler work item');assert.equal(S.shadowUploadPending,true);f.drain();S.uploadShadow();assert.equal(S.shadowGeometryOwner.current,view);assert.equal(S.shadowResidentIndexCount,3,'failed queued shadow must not expose new CPU count');assert.equal(S.shadowFailure,true);S.releaseShadowGPU();assert(mainBuffers.every(buffer=>!c.deleted.includes(buffer)));
 // Evicting the released shadow view deletes its own index storage only.
 retireRecent(f.store);assert(c.deleted.includes(view.indexBuffer),'the shadow index buffer is released with its view');assert(mainBuffers.every(buffer=>!c.deleted.includes(buffer)),'the borrowed main buffers stay with the resident main view');
});

test('city publishes main geometry before shadow work and fences obsolete shadow uploads',async t=>{
 const f=await fixture(t),{S,c}=f;await f.commit();const chunk=S.sceneChunks[0],main=S.geometryOwner.current;
 assert(main);assert.equal(S.shadowUploadPending,true,'main publication leaves explicit auxiliary demand');assert.equal(S.shadowGeometryOwner.current,undefined);assert(!source('uploadPreparedGeometry').includes('uploadShadow()'),'main upload never inlines shadow preparation');
 setChunkShadow(f.store,chunk,Uint32Array.from([0,1,2]));
 for(let i=0;i<20&&!S.shadowProgram;i++){try{S.ensureC311ShadowProgram();}catch(error){assert(S.isProgramPreparationPending(error));}f.drain();}assert(S.shadowProgram);
 const uploads=c.data.length;S.uploadShadow();assert.equal(c.data.length,uploads);assert.equal(S.shadowGeometryOwner.current,undefined);
 S.solarShadowSignature+='|new-demand';f.drain();assert.equal(c.data.length,uploads,'superseded signature is rejected before any GPU allocation');assert.equal(S.geometryOwner.current,main);
 S.uploadShadow();f.drain();const published=S.shadowGeometryOwner.current;assert(published);assert.equal(c.data.length,uploads+1);assert.equal(S.shadowUploadPending,false);
 setChunkShadow(f.store,chunk,Uint32Array.from([0,1,2,0,1,2]));S.solarShadowSignature+='|lost-demand';S.uploadShadow();const beforeLoss=c.data.length;c.control.lost=true;f.drain();assert.equal(c.data.length,beforeLoss,'lost context prevents queued shadow writes');assert.equal(S.shadowUploadPending,true);c.control.lost=false;S.releaseShadowGPU();
});

test('city material source owns one budgeted full identity alongside its numeric recipe',async t=>{
 const f=await fixture(t),{S,store}=f,acquire=store.acquire,requests=[];let productions=0;
 store.acquire=request=>{if(!request.contentKey.includes('city-material-source-v2'))return acquire.call(store,request);requests.push(request);return acquire.call(store,{...request,produce(context){productions++;return request.produce(context);}});};t.after(()=>{store.acquire=acquire;});
 // The page store is shared by fixtures. Use a unique source identity so this
 // descriptor belongs to the production we observe, not a prior cached entry.
 await f.commit([f.component('material-key-owned-allocation')]);assert.equal(requests.length,1);assert.equal(productions,1,'the inspected material request actually produces its own allocation');const request=requests[0],identity=request.estimate.find(cost=>cost.label==='city material identity UTF16 logical payload'),material=S.sceneChunks[0].material.value,costs=request.costs(material);
 assert(identity);assert.equal(identity.bytes,request.contentKey.length*2);assert.strictEqual(costs.at(-1),identity);assert.deepEqual(costs.slice(0,-1),material.costs,'existing numeric/recipe costs are unchanged');assert.equal(costs.filter(cost=>cost.identity===identity.identity).length,1);
 const [namespace,parent,materialAuthority,recipeAuthority]=decodeResourceContentKey(request.contentKey);assert.equal(namespace,'city-material-source-v2');assert.equal(parent,S.sceneChunks[0].source.contentKey);assert.equal(materialAuthority,S.sceneChunks[0].source.materialAuthority);assert.equal(recipeAuthority,S.sceneChunks[0].source.recipeAuthority);
 // Store holder labels use the reservation's content key, not an individual
 // cost label. A second claim on this exact allocation must add no page bytes.
 const heldBytes=store.budget.stats.bytes,claim=store.budget.reserve(identity);try{assert.equal(store.budget.stats.bytes,heldBytes,'the actual page ledger already owns the independent material key allocation');}finally{claim.release();}assert.equal(store.budget.stats.bytes,heldBytes,'the diagnostic claim cannot retire the material-owned allocation');
});

test('city geometry ownership replaces old main storage only after success, and has no legacy allocation or static/state split',async t=>{
 // Chunk store contract: the replaced mesh view leaves the scene for the
 // recent cache (retained, an evictable charge) and its storage is deleted
 // only through the store's retirement, never before the replacement succeeds.
 const f=await fixture(t),{S,c}=f;await f.commit();const old=S.geometryOwner.current,oldHandles=[old.vao,old.indexBuffer,...old.buffers.values()];await S.setBatches([f.component('new')],2);assert.equal(S.geometryOwner.current,old);assert(oldHandles.every(handle=>!c.deleted.includes(handle)),'nothing of the resident storage is deleted before the replacement succeeds');await f.finish();assert.notEqual(S.geometryOwner.current,old);assert(oldHandles.every(handle=>!c.deleted.includes(handle)),'the recent cache retains the just-released view');retireRecent(f.store);assert(c.deleted.includes(old.vao));for(const buffer of [old.indexBuffer,...old.buffers.values()])assert(c.deleted.includes(buffer));
 for(const name of ['uploadPreparedGeometry','initializeResidentGPU','releaseGPU','uploadShadow','releaseShadowGPU']){const body=source(name);assert(!body.includes('.createBuffer('),name);assert(!body.includes('.createVertexArray('),name);assert(!body.includes('.deleteBuffer('),name);assert(!body.includes('.deleteVertexArray('),name);}assert(!source('uploadPreparedGeometry').includes('new Float32Array'));assert(!text.includes('vertices.length/10'));assert(!text.includes('vertices[vi*10'));
});

test('city late hook fallback links and uploads the replacement before releasing the previous complete material generation',async t=>{
 const f=await fixture(t,{city:'munich'}),{S,c}=f;await f.commit();const oldProgram=S.program,oldGeometry=S.geometryOwner.current,oldVertices=S.vertices;S.materialRecipeRevision++;S.familySurfaceHelper+='|controlled-hook-recipe';c.control.failCompile=shader=>shader.type===c.gl.FRAGMENT_SHADER&&shader.source?.includes('|c313');await S.setBatches([f.component('replacement')],2);assert.equal(S.program,oldProgram);assert.equal(S.geometryOwner.current,oldGeometry);assert.equal(S.vertices,oldVertices);assert(!oldProgram.deleted);await f.finish();assert.equal(S.generation,2);assert.equal(S.c313ShaderActive,false);assert.notEqual(S.program,oldProgram);assert(oldProgram.deleted);assert.notEqual(S.geometryOwner.current,oldGeometry);assert.equal(S.pendingGeometryCandidate,undefined);assert.equal(f.owner.stats.pending,0);assert.equal(S.programHookSignature,'1:1:0');
});

test('Hamburg white and normal modes share one geometry owner while retaining their separate exact programs',async t=>{
 const f=await fixture(t,{city:'hamburg'}),{S,c}=f;S.paintMode=()=>0;await f.commit();const white=S.program,old=S.geometryOwner.current;assert.equal(S.activeWhite,true);assert.equal(S.geometryPairs.get(true).program,white);S.paintMode=()=>2;S.queueGeometryCandidate(S.snapshotResident(),false);assert.equal(S.program,white);assert.equal(S.geometryOwner.current,old);await f.finish();assert.equal(S.activeWhite,false);assert.notEqual(S.program,white);assert.equal(S.geometryPairs.size,2);
 // Chunk store contract: the released white mesh view waits in the recent
 // cache (not deleted) and returning to white is a cache hit on that view.
 assert.notEqual(S.geometryOwner.current,old);assert(!c.deleted.includes(old.vao),'the released white view stays in the recent cache');assert(!white.deleted);const normal=S.program,normalView=S.geometryOwner.current;S.paintMode=()=>0;S.queueGeometryCandidate(S.snapshotResident(),true);await f.finish();assert.equal(S.program,white);assert.equal(S.geometryOwner.current,old,'returning to white reuses the cached white view');assert(!c.deleted.includes(normalView.vao),'the released normal view stays in the recent cache');assert.equal(S.geometryPairs.get(false).program,normal);assert.equal(c.programs.length,2,'mode changes reuse linked programs and their cached mesh views');for(const pair of S.geometryPairs.values())assert.equal('vao' in pair,false);
 assert.equal(f.owner.stats.shared.heldReferences,2);const grants=f.owner.stats.shared.grantedReferences,released=f.owner.stats.shared.releasedReferences;S.queueGeometryCandidate(S.snapshotResident(),true);await f.finish();assert.equal(S.program,white);assert.equal(f.owner.stats.shared.grantedReferences,grants+1);assert.equal(f.owner.stats.shared.releasedReferences,released+1,'reacquiring the same white program retires precisely the previous grant');assert.equal(f.owner.stats.shared.heldReferences,2);S.releaseGPU();assert.equal(f.owner.stats.shared.heldReferences,0);assert.equal(f.owner.stats.shared.grantedReferences,f.owner.stats.shared.releasedReferences);
});


test('city published source can repack after its viewport publication is cancelled',async t=>{
 const controller=new AbortController(),f=await fixture(t,{preparationSignal:controller.signal}),{S}=f;
 await f.commit();const plan=S.publishedDataPlan,vertices=chunkVertices(S);
 assert.strictEqual(plan.signal,controller.signal);assert.equal(plan.scope.stats.disposed,false);
 // Run the production repack, including the receipt refresh, synchronously as
 // bindBatchSignals does when a published material context is cancelled.
 S.setBatches=f.setPrepared;S.c311Repack=harness.evaluateTS(source('c311Repack'),S);
 controller.abort(new DOMException('Viewport superseded','AbortError'));
 assert.doesNotThrow(()=>S.c311Repack());await f.finish();
 assert.strictEqual(S.publishedDataPlan,plan);assert.equal(plan.scope.stats.disposed,false);
 assert.equal(S.sceneChunks.length,vertices.length);
 S.sceneChunks.forEach((chunk,i)=>assert.strictEqual(chunk.cpu.value.vertices,vertices[i]));
 assert.equal(S.candidateFailure,undefined);assert.equal(S.geometryFailure,undefined);
 const pins=plan.scope.stats.pins,resources=S.sceneChunks.map(chunk=>chunk.cpu);
 S.c311Repack();assert(S.pendingGeometryCandidate);
 assert.equal(S.rollbackResidentUpload(),true);await f.flush();f.drain();await f.flush();
 assert.equal(S.pendingGeometryCandidate,undefined);assert.equal(plan.scope.stats.pins,pins,'rollback releases the repack source pin');
 resources.forEach((lease,i)=>{assert.strictEqual(S.sceneChunks[i].cpu,lease);assert.equal(lease.released,false);});
});

test('city unpublished source still refuses cancelled chunk refresh',async t=>{
 const f=await fixture(t),{S}=f;await f.commit();
 const published=S.publishedDataPlan,controller=new AbortController();
 const pending=await S.prepareBatches(published.input,controller.signal,undefined,undefined,S.residentChunkInput);
 controller.abort(new DOMException('Viewport superseded','AbortError'));
 assert.throws(()=>pending.refreshChunkInput(S.residentChunkInput),{name:'AbortError'});
 assert.strictEqual(S.publishedDataPlan,published);pending.release();
});

 test('city delayed packing uses the material-owned source chain after temporary derived handles retire',async t=>{
 const f=await fixture(t),{store,S}=f,acquire=store.acquire;let disposed=0,temporary;
 store.acquire=request=>{
  if(!request.contentKey.includes('city-material-source-v2'))return acquire.call(store,request);
  temporary=acquire.call(store,{contentKey:'temporary-derived-packing-parent',role:'candidate',allowRecent:false,estimate:{category:'decoded',bytes:16,precision:'exact'},produce:()=>new Uint8Array(16),dispose(){disposed++;}});
  request.parents.push(temporary);
  const material=acquire.call(store,request);temporary.release();return material;
 };t.after(()=>{store.acquire=acquire;});
 await f.commit([f.component('derived-parent-lifetime')]);
 assert(temporary.released);assert.equal(disposed,0,'material and packed mesh retain the actual source allocation');
 assert(S.sceneChunks[0].cpu.value,'delayed mesh packing reaches a complete resident scene');
 });


test('resident detail drift cannot repeatedly replace an unfinished successor',async t=>{
 const f=await fixture(t),{S}=f;
 await f.commit();
 await S.setBatches([f.component('detail-replacement')],2);
 const pending=S.pendingGeometryCandidate,revision=S.geometryUploadRevision;
 assert(pending&&!pending.closed);
 const repack=S.c311Repack;let requests=0;S.c311Repack=()=>{requests++;};
 try{
  for(let i=0;i<100;i++)S.requestResidentDetailRepack();
  assert.equal(requests,0,'old resident checks leave the successor alive');
  assert.equal(S.pendingGeometryCandidate,pending);assert.equal(S.geometryUploadRevision,revision);
  await f.finish();assert.equal(S.generation,2);
  S.requestResidentDetailRepack();assert.equal(requests,1,'genuine drift can request repair after publication');
 }finally{S.c311Repack=repack;}
});

test('resident readiness checks do not latch failure while a successor is unfinished',async t=>{
 const f=await fixture(t),{S}=f;
 await f.commit();
 await S.setBatches([f.component('readiness-successor')],2);
 const pending=S.pendingGeometryCandidate;
 assert(pending&&!pending.closed);
 const names=['c311','c312','c313'],saved=new Map();
 const repack=S.c311Repack;let requests=0;S.c311Repack=()=>{requests++;};
 try{
  for(const name of names){
   saved.set(name,{display:S[name+'Display'],refresh:S[name+'RefreshContext'],failure:S[name+'Failure']});
   S[name+'Display']={enabled:true};S[name+'RefreshContext']=()=>undefined;S[name+'Failure']=undefined;
   S[name+'Revalidate']();
   assert.equal(S[name+'Failure'],undefined,name+' must not poison the successor with old-resident drift');
  }
  assert.equal(requests,0);assert.equal(S.pendingGeometryCandidate,pending);
  await f.finish();assert.equal(S.generation,2);
  for(const name of names){
   S[name+'Display']={enabled:true};S[name+'Failure']=undefined;
   S[name+'Revalidate']();
   assert.match(S[name+'Failure'],/resident .* readiness drift/,name+' still detects genuine drift after publication');
  }
  assert.equal(requests,3);
 }finally{
  S.c311Repack=repack;
  for(const [name,old]of saved){S[name+'Display']=old.display;S[name+'RefreshContext']=old.refresh;S[name+'Failure']=old.failure;}
 }
});

test('resident readiness waits for pending shader preparation without declaring drift',async t=>{
 const f=await fixture(t),{S}=f;
 await f.commit();
 const names=['c311','c312','c313'],saved=new Map();
 const repack=S.c311Repack;let requests=0;S.c311Repack=()=>{requests++;};
 try{
  for(const name of names){
   saved.set(name,{display:S[name+'Display'],refresh:S[name+'RefreshContext'],failure:S[name+'Failure']});
   S[name+'Display']={enabled:true};S[name+'Failure']=undefined;
   S[name+'RefreshContext']=()=>({pathsReady:{color:false,shadow:false,pick:true,preparing:true}});
   S[name+'Revalidate']();
   assert.equal(S[name+'Failure'],undefined,name+' must not turn asynchronous preparation into a permanent failure');
  }
  assert.equal(requests,0);
  for(const name of names){
   S[name+'RefreshContext']=()=>undefined;
   S[name+'Revalidate']();
   assert.match(S[name+'Failure'],/resident .* readiness drift/);
  }
  assert.equal(requests,3);
 }finally{
  S.c311Repack=repack;
  for(const [name,old]of saved){S[name+'Display']=old.display;S[name+'RefreshContext']=old.refresh;S[name+'Failure']=old.failure;}
 }
});

test('resident correction paths distinguish shader preparation, readiness and terminal errors',async t=>{
 const f=await fixture(t,{city:'munich'}),{S}=f;
 await f.commit();
 const keys=['sceneChunks','program','shadowProgram','cityMaterialFeatures','ensureC311ShadowProgram'];
 for(const name of ['c311','c312','c313'])keys.push(name+'Failure',name+'ShaderActive',name+'ShadowShaderActive',name+'ShadowProofReady');
 const saved=new Map(keys.map(key=>[key,S[key]]));
 try{
  S.sceneChunks=[{geometry:{value:{buffers:new Map(['c311','c312','c313'].map(name=>[name,{}]))}}}];
  S.cityMaterialFeatures=new Set(['c311Staatskanzlei','c312Stadtsparkasse','c313LoehrsCarre']);
  S.program={attrs:{a_c311_display:0,a_c312_display:1,a_c313_display:2}};
  S.shadowProgram=S.program;
  for(const name of ['c311','c312','c313']){
   S[name+'Failure']=undefined;S[name+'ShaderActive']=true;S[name+'ShadowShaderActive']=true;S[name+'ShadowProofReady']=true;
   S.ensureC311ShadowProgram=()=>{throw new S.ProgramPreparationPending();};
   const pending=S[name+'Paths']();
   assert.equal(pending.preparing,true);assert.equal(pending.color,false);assert.equal(pending.shadow,false);
   assert.equal(S[name+'Failure'],undefined);
   S.ensureC311ShadowProgram=()=>{};
   const ready=S[name+'Paths']();
   assert.equal(ready.preparing,false);assert.equal(ready.color,true);assert.equal(ready.shadow,true);
   S.ensureC311ShadowProgram=()=>{throw new Error('controlled terminal shadow error');};
   const failed=S[name+'Paths']();
   assert.equal(failed.preparing,false);assert.equal(failed.shadow,false);
   assert.match(S[name+'Failure'],/controlled terminal shadow error/);
  }
 }finally{for(const [key,value]of saved)S[key]=value;}
});

test('delayed correction material checks retain their creating input across resident switches',async t=>{
 const f=await fixture(t),{S}=f;
 await f.commit();
 const row=f.component('delayed-material'),names=['c311','c312','c313'];
 for(const name of names){
  const saved={input:S[name+'Input'],paths:S[name+'Paths'],binding:S[name+'HasMaterialBinding']};
  let ownReads=0,otherReads=0;
  try{
   S[name+'Paths']=()=>({color:true,shadow:true,pick:true});
   S[name+'HasMaterialBinding']=()=>true;
   const creatingInput={materialReady:c=>{assert.equal(c,row);ownReads++;return true;}};
   S[name+'Input']=creatingInput;
   const delayed=S[name+'RefreshContext']();
   // Async chunk material production restores its own frozen scope, while
   // renderer globals can already describe another published viewport.
   S[name+'Input']={materialReady:()=>{otherReads++;throw Error('Frozen data resource was not prepared for this scope');}};
   assert.equal(delayed.materialReady(row),true,name+' must use its captured input, not the currently published viewport input');
   assert.equal(ownReads,1);assert.equal(otherReads,0);
   S[name+'Input']=undefined;
   assert.equal(delayed.materialReady(row),true,name+' remains bound even after the global input clears');
   assert.equal(ownReads,2);
  }finally{S[name+'Input']=saved.input;S[name+'Paths']=saved.paths;S[name+'HasMaterialBinding']=saved.binding;}
 }
});
