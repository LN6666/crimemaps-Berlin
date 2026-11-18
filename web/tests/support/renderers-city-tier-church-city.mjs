// The flattened City factory with production Rathaus masks on its page store,
// shared by renderer-budget-wait-city-tier-church.test.mjs and its scope probe.
// It runs over support/fixtures-renderer-city.mjs (the fixtures-renderer
// owner's flattening harness), which has to be integrated with this module.
// `t` is anything with after(fn): node:test's context, or a probe's own list.
import assert from 'node:assert/strict';
import {ts} from './renderers-city-tier-church-scope.mjs';

const cityFixtures=await import('./fixtures-renderer-city.mjs');
const mainProjection=Float64Array.from({length:16},(_,i)=>i%5===0?(i===15?1:.1):0);
const DISPATCH_MATERIAL='vec3 progressiveFeatureDispatchCity(vec3 base,vec3 p,vec3 normal,vec4 frame,float family){return base;}\nvec3 paintedFacade(vec3 base,vec3 p,vec3 n,vec4 frame,float family){return progressiveFeatureDispatchCity(base,p,n,frame,family);}\noriginal material';
const fixtureObjectIds=new Map();
export function component(id,city='berlin'){if(!fixtureObjectIds.has(id))fixtureObjectIds.set(id,'osm/way/'+(1000000+fixtureObjectIds.size));return{city,objectId:fixtureObjectIds.get(id),partId:'part',origin:[13.4,52.5],componentGeometry:{type:'Polygon',coordinates:[[[13.4,52.5],[13.40001,52.5],[13.4,52.50001],[13.4,52.5]]]},sourceFeature:{type:'Feature',properties:{}},batches:[{positions:new Float32Array([0,0,0,1,2,0,0,0,1]),normals:new Float32Array([0,1,0,0,1,0,0,1,0]),color:[.2,.3,.4],indices:new Uint32Array([0,1,2]),faceRole:'wall'}]};}
function cityContext(){let sequence=0;const bindings={vao:null,array:null};
 const gl={NO_ERROR:0,ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,VERTEX_ARRAY_BINDING:3,ARRAY_BUFFER_BINDING:4,STATIC_DRAW:5,DYNAMIC_DRAW:6,FLOAT:7,VERTEX_SHADER:8,FRAGMENT_SHADER:9,COMPILE_STATUS:10,LINK_STATUS:11,MAX_VERTEX_ATTRIBS:12,INVALID_INDEX:4294967295,
  // Released GPU views retire behind a completion fence; these complete at once.
  SYNC_GPU_COMMANDS_COMPLETE:20,ALREADY_SIGNALED:21,CONDITION_SATISFIED:22,TIMEOUT_EXPIRED:23,WAIT_FAILED:24,fenceSync:()=>({fence:true}),flush(){},clientWaitSync:()=>21,deleteSync(){},
  isContextLost:()=>false,getError:()=>0,getParameter:k=>k===3?bindings.vao:k===12?16:bindings.array,createVertexArray:()=>({vao:++sequence}),createBuffer:()=>({buffer:++sequence}),bindVertexArray(v){bindings.vao=v;},bindBuffer(t,v){if(t===1)bindings.array=v;},bufferData(){},getAttribLocation:(p,name)=>p.attrs?.[name]??-1,enableVertexAttribArray(){},vertexAttribPointer(){},deleteVertexArray(){},deleteBuffer(){},bufferSubData(){},
  // The production Rathaus mask asks each program for its uniform block; these
  // fixture programs expose none, so no mask UBO is needed.
  getUniformBlockIndex:()=>4294967295,
  createShader:type=>({type}),shaderSource:(shader,source)=>{shader.source=source;},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',createProgram:()=>({attrs:{},shaders:[]}),attachShader:(p,s)=>p.shaders.push(s),detachShader:(p,s)=>{p.shaders=p.shaders.filter(v=>v!==s);},bindAttribLocation:(p,index,name)=>p.attrs[name]=index,linkProgram(){},getExtension:()=>null,getProgramParameter:()=>true,getProgramInfoLog:()=>'',deleteShader(){},deleteProgram(){}};
 return gl;
}
// The City material producer (sidecar projection over model fixtures) is the
// isolated stage; its Rathaus mask recipe comes from the production mask.
function produceFixtureMaterial(S,rows){
 const count=rows.reduce((n,c)=>n+c.batches.reduce((v,b)=>v+b.positions.length/3,0),0),mask=S.createRathausProxyMasks(),recipe=mask.cpuRecipe();mask.destroy();
 const material={costs:[],retainedBytes:0,paint:new Float32Array(count*5),progressive:new Float32Array(count*4),sidecars:{c311:new Float32Array(count*3),c312:new Float32Array(count*4),c313:new Float32Array(count*4),cbt:new Float32Array(count*3),c298:new Float32Array(count*3),c018:new Float32Array(count*3)},geometry:new Map(),maskRecipe:recipe,metadata:S.captureCityChunkMetadata()};
 material.costs=S.measureCityChunkMaterialCosts(material);material.retainedBytes=material.costs.reduce((n,cost)=>n+cost.bytes,0);return material;
}
// buildBatches keeps its production chunk tail; the sidecar validation prelude
// becomes the minimal accounting it feeds the tail (as city-resident-geometry).
export function rewriteBuildBatches(js){
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
gpuPreflightRequired=Boolean(c311Incoming||c312Incoming||c313Incoming);c311LastArgs=[components,nextGeneration,shadowAdmission,nativeDisplay,partialGatePlan,s402Plan,s434Plan,s036Plan,s240Plan,s528Binding,c018Plan,c248Coface,cbtPlan,c298Plan,c311Incoming,c313Incoming,c312Incoming,prepared];
let count=0,ic=0;const seen=new Set();for(const c of components){if(seen.has(key(c)))throw Error('Duplicate component identity');seen.add(key(c));for(const m of c.batches){count+=m.positions.length/3;ic+=m.indices.length;}}
const nextSourceLoaded=new Map(components.map(c=>[key(c),c])),s434Entries=[];s434DisplayProfile=null;const batchIncluded=(c,bi)=>sourceRoleBatchIncluded(c,bi)&&s434AggregateBatchIncluded(s434DisplayProfile,c,bi,s434Entries);
${tail}}`;
}
let cityFixtures_=0;
/** `rewrite` maps a City function declaration to a text transform; a
 * buildBatches transform applies after the fixture's own prelude rewrite. */
export async function cityFixture(t,rewrite={}){
 const gl=cityContext(),{buildBatches:buildRewrite,...rest}=rewrite;
 const flat=await cityFixtures.flattenCity({city:'berlin',imports:['s434AggregateBatchIncluded'],rewrite:{buildBatches:js=>{const out=rewriteBuildBatches(js);return buildRewrite?buildRewrite(out):out;},...rest}}),S=flat.values,runtimeGraph=flat.runtime;
 const prog=cityFixtures.programOwner(flat,'renderers city mask ledger');S.programPreparation=prog.api;
 const store=runtimeGraph.store.getPageChunkResourceStore();runtimeGraph.store.bindChunkResourceContext(gl,store);
 Object.assign(S,{gl,captureRuntime:{invalidate(){}},syncFacadeResources(){},c311Repack(){},reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},VERTEX:'original vertex',HAMBURG_WHITE_VERTEX:'white vertex',HAMBURG_WHITE_FRAGMENT:'white fragment',fragment:(helper,paint)=>helper+'|'+paint,specializeCurrentPaintFragment:(s,f)=>s+'|family='+f,withResidentReflectionClip:s=>s+'|clip',baseSurfaceFragment:'original helper',familySurfaceHelper:'original helper',isFacadeLandmark:()=>false,isSourceOnlyGlassRoof:()=>false,__produceFixtureMaterial:rows=>produceFixtureMaterial(S,rows),s528ProjectionCandidate:()=>false});
 const preparedData=await cityFixtures.preparedCityData(flat,{material:DISPATCH_MATERIAL});
 const emptyPaintView=Object.freeze([]),emptyPaint=scope=>scope.borrow(preparedData.resources.admissions,rows=>{assert.equal(rows.length,0);});
 S.cityData_isProgressivelyPainted=(_component,scope)=>{emptyPaint(scope);return false;};S.cityData_progressiveRenderView=scope=>{emptyPaint(scope);return emptyPaintView;};
 S.baseFacadePaintFragmentForCity=S.scopedCityData((requested,scope)=>scope.borrow(preparedData.resources.extra,()=>S.fixtureMaterial),1);
 const fixture=++cityFixtures_;let sequence=0;const chunkInput=rows=>({store,groups:[{contentKey:'mask-ledger-source:'+fixture+':'+(++sequence)+':'+rows.map(row=>row.objectId).join(','),components:rows,parents:[],frame:runtimeGraph.chunkInput.rendererChunkFrame([13.4,52.5],'fixture-frame'),cohortKeys:[],materialAuthority:'fixture-material',recipeAuthority:'fixture-recipe',selectedLOD:0}],cohorts:[]});
 const setPrepared=S.setBatches;
 S.setBatches=async(...args)=>{const prepared=args[0].length?await S.prepareBatches(args[0],new AbortController().signal,undefined,undefined,chunkInput(args[0])):undefined;args[17]=prepared;try{return setPrepared(...args);}finally{prepared?.release();}};
 S.recordMainProjection(mainProjection);
 S.residentGPU=runtimeGraph.lifecycle.createResidentGPULifecycle({bind:context=>S.gl=context,initialize:S.initializeResidentGPU,release:()=>{},ready:S.gpuReady,lost:context=>context.isContextLost(),hasResident:()=>S.sceneIndexCount()>0||!!S.pendingGeometryCandidate,needsPreflight:()=>S.gpuPreflightRequired,clearTransient(){},revision:()=>S.viewRevision});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 // This queue also captures the store's wall-clock recent-entry expiry.
 // Drain preparation work only; repeatedly executing a future expiry without
 // advancing its deadline is not a program/geometry preparation failure.
 const drain=()=>prog.turn(()=>{let count=0;while(prog.queue.length&&(prog.owner.stats.pending>0||(prog.owner.stats.context?.pending??0)>0)){assert(++count<200,'unbounded program/geometry preparation');prog.queue.shift()();}return count;});
 const finish=async()=>{for(let n=0;n<50;n++){await flush();drain();S.prepareGeometryUpload();if(!S.geometryUploadPending&&!S.pendingGeometryCandidate)return;}assert.fail('city geometry pipeline did not settle');};
 // The page store at rest: retired GPU views pass their fence (returning
 // their parents), and released recent entries are evicted. Each round
 // settles one parent layer (view, static view, state, CPU, material).
 const settle=()=>{let last='';for(let round=0;round<16;round++){store.collectRetired();store.evictRecent();const stats=store.stats,next=[stats.resources,stats.recent,stats.retiring,store.budget.stats.bytes].join('|');if(next===last)return;last=next;}assert.fail('page store did not come to rest');};
 // Mask claims of the page ledger at rest.
 const maskBytes=()=>{settle();return store.budget.stats.categories.mask?.bytes??0;};
 // The renderer is torn down too, so the page store keeps no placeholder of
 // this suite for the next one: destroy() retires the current one and releases
 // the resident data receipt itself, so it runs while that receipt is live.
 t.after(()=>{S.clearResidentRollback?.();flat.api.destroy();S.residentDataRelease?.();S.residentDataRelease=undefined;preparedData.release();prog.api.dispose();});
 return{S,flat,store,settle,maskBytes,drain,finish,async publish(id,generation){await S.setBatches([component(id)],generation);await finish();assert.equal(S.generation,generation);assert.equal(S.pendingGeometryCandidate,undefined);}};
}
