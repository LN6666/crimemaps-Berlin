import {createResidentCaptureOwnership} from './support/fixtures-managers-b-renderer-runtime.mjs';
import {resourceContentKey,resourceContentKeys} from './support/resource-content-key.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const identity=Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const key=row=>row.objectId+'|'+row.partId;
function moduleFrom(source,deps={}){
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
 Function('module','exports','require',code)(module,module.exports,name=>{assert(name in deps,name);return deps[name];});return module.exports;
}
const {indexedResourceKey}=moduleFrom(read('safety/renderer-chunk-input.ts'),{'./resource-content-key':resourceContentKeys});
const ranges=moduleFrom(read('painted/delegated500/safety/renderer-state-ranges.ts'));
const drawRanges=moduleFrom(read('safety/render-runtime/resident-draw-range.ts'));
const indices=moduleFrom(read('safety/render-runtime/resident-index-convention.ts'));
const packed=moduleFrom(read('painted/delegated500/safety/renderer-packed-chunks.ts'),{'../../../safety/resource-content-key':resourceContentKeys,'../../../safety/renderer-chunk-input':{},'./indexed-pick-blocks70':moduleFrom(read('painted/delegated500/safety/indexed-pick-blocks70.ts'))});
const reflection=moduleFrom(read('safety/resident-planar-reflection.ts'));
const sourceBudget=moduleFrom(read('safety/render-runtime/shader-source-budget.ts'));
const assemblyBudget=moduleFrom(read('safety/render-runtime/shader-assembly-budget.ts'),{'../resident-planar-reflection':reflection,'./shader-source-budget':sourceBudget});
const parsed=new Map();
function bindProduction(provider,names,state,methods=[]){
 if(!parsed.has(provider))parsed.set(provider,ts.createSourceFile(provider,read(`painted/${provider}/safety/building-mesh-renderer.ts`),ts.ScriptTarget.Latest,true));
 const ast=parsed.get(provider),found=new Map();
 function walk(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));if(ts.isMethodDeclaration(node)&&methods.includes(node.name.getText(ast)))found.set(node.name.getText(ast),'function '+node.getText(ast));ts.forEachChild(node,walk);}walk(ast);
 const scope=new Proxy(state,{has:()=>true,get:(target,k)=>k===Symbol.unscopables?undefined:k in target?target[k]:globalThis[k],set:(target,k,v)=>(target[k]=v,true)});
 for(const name of [...names,...methods]){assert(found.has(name),provider+' '+name);const js=ts.transpileModule('('+found.get(name)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;state[name]=Function('scope','with(scope){return '+js+'}')(scope);}
 return state;
}
function fixture(provider){
 const writes=[],draws=[],coverage=[],uniforms=new Map();let array,vao,clip;
 const gl={ARRAY_BUFFER:1,ARRAY_BUFFER_BINDING:2,TRIANGLES:3,UNSIGNED_INT:4,DEPTH_TEST:5,LEQUAL:6,CULL_FACE:7,BLEND:8,SRC_ALPHA:9,ONE_MINUS_SRC_ALPHA:10,ONE:11,
  isContextLost:()=>false,getParameter:()=>array,bindBuffer(_target,value){array=value;},bufferSubData(_target,offset,data){writes.push({buffer:array,offset,data:[...data]});},bindVertexArray(value){vao=value;},
  getUniformLocation:(_program,name)=>name,uniformMatrix4fv(_location,_transpose,value){clip=[...value];},uniform1f(name,value){uniforms.set(name,value);},uniform2f(name,...value){uniforms.set(name,value);},
  useProgram(){},enable(){},disable(){},depthFunc(){},depthMask(){},blendFuncSeparate(){},drawElements(_mode,count,_type,offset){draws.push({vao,count,offset,clip,heightScale:uniforms.get('u_style_height_scale')});},
 };
 const makeChunk=(id,unit,count)=>{
  const rows=Array.from({length:count/3},(_,i)=>({objectId:id+'-'+i,partId:'part',city:'berlin',origin:[0,0],batches:[],generation:1,box:[-.5,.2,-.5,.5,.2,.5],start:i*3,end:i*3+3,firstVertex:i*3,lastVertex:i*3+3}));
  const state=new Float32Array(count).fill(1),data={contentKey:id,anchor:[0,0],frame:{unit,origin:[0,0]},vertices:new Float32Array(count*9),indices:Uint32Array.from({length:count},(_,i)=>i),paint:new Float32Array(count*5),progressive:new Float32Array(count*4),styles:[]};
  const geometry={contentKey:'main-'+id,value:{vao:{id},indexBuffer:{id,type:'index'},buffers:new Map(['vertex','static','state','paint','progressive'].map(type=>[type,{id,type}]))}};
  const masks={pins:0,residentRevision:id,prepare:()=>({ready:true}),withResidentMasks(_gl,_p,draw){draw();return true;},retain(){this.pins++;let released=false;return{...this,release:()=>{if(!released){released=true;this.pins--;}}};}};
  const metadata={c311Display:{enabled:false},c312Display:{enabled:false},c313Display:{enabled:false},cbtDisplay:{enabled:false},c298Display:{enabled:false},c018Display:{enabled:false}};
  return{contentKey:id,source:{frame:data.frame},cpu:{contentKey:id,value:data},state:{value:state},stateData:state,dynamic:{value:state},loaded:new Map(rows.map(row=>[key(row),row])),geometry,masks,anchor:data.anchor,unit,material:{value:{metadata,sidecars:{}}},shadow:geometry,shadowIndices:data.indices,shadowIndexCount:count};
 };
 const chunks=[makeChunk('a',1000,6),makeChunk('b',2000,3)],loaded=new Map(),spans=[];let at=0;
 for(const chunk of chunks)for(const row of chunk.loaded.values()){loaded.set(key(row),{...row,start:at,end:at+3,firstVertex:at,lastVertex:at+3});spans.push({chunk,firstIndex:at,indexCount:3,localFirstIndex:row.start});at+=3;}
 const owner={pins:0,scene:{version:7},capture(){this.pins++;let released=false;return{version:7,leases:chunks.map(chunk=>chunk.geometry),release:()=>{if(!released){released=true;this.pins--;}}};}};
 const scope={pins:0,retain(){this.pins++;let released=false;return()=>{if(!released){released=true;this.pins--;}};}},programPins=[];
 const program={},S={...ranges,...drawRanges,...indices,createResidentCaptureOwnership,resourceContentKey,indexedResourceKey,key,gl,program,sceneChunks:chunks,sceneSpans:spans,loaded,geometryOwner:owner,residentGeometry:owner,geometryResidentUploaded:true,mainWorldProjection:identity,mainWorldMatrix:identity,matrix:identity,anchor:[0,0],anchorUnit:1000,materialAnchor:[0,0],materialUnit:1000,
  enabled:true,selectionActive:true,selectedIdentity:undefined,destroyed:false,pageHidden:false,activeWhite:false,whiteModeEligible:false,geometryUploadPending:false,shadowUploadPending:false,captureStateRevision:0,reflectionResidentRevision:0,surfaceContentRevision:0,viewRevision:0,needsBirth:false,birth:new Map(),seenBirth:new Set(),BIRTH_LIMIT:20000,reducedMotion:false,clock:()=>150,
  map:{triggerRepaint(){},getCanvas:()=>({clientWidth:512,clientHeight:512})},shadowProgram:program,shadowDraws:0,shadowMask:{draw(_gl,matrix,height,draw){coverage.push({matrix:[...matrix],height});draw();return true;}},sceneSun:{instantISO:'old',shadowVector:[1,1]},sceneEnvironment:{sunlight:true,shadows:true},paintMode:()=>2,paintOverride:()=>0,
  opacity:1,opacityContext:'normal',city:'berlin',progressiveDiagnostic:undefined,gpuReady:()=>true,materialProgramsCurrent:()=>true,solarCaptureRevision:()=>'',materialSourceFailure:undefined,candidateFailure:undefined,mainDrawFailure:undefined,activeCaptureProgramKeys:()=>[],familyFailures:new Map(),captureFamilyFailures:new Map(),geometryUploadFailure:undefined,mainGeometryProgramFailure:undefined,solarCasterFailureReason:()=>undefined,
  windowTexture:undefined,diffuseTexture:undefined,texturedProgram:undefined,diffuseProgram:undefined,publishedDataPlan:{scope},residentPreparedData:{scope},withPreparedData:(_data,work)=>work(),splitChunkRuns:packed.splitChunkRuns,
  programPreparation:{retainProgram(_gl,p){programPins.push(p);let released=false;return()=>{if(!released){released=true;programPins.splice(programPins.indexOf(p),1);}};}},reflectionClipUniforms(){},uploadSceneLight(){},uploadFacadeLayouts(){},
  c311Display:{enabled:false},c311Revalidate(){},c312Revalidate(){},c313Revalidate(){},isPaintFamilyReady:()=>true,c312PickDiscard:()=>false,c313PickDiscard:()=>false,c311PickDiscard:()=>false,cbtPickDiscard:()=>false,c298PickDiscard:()=>false,c018PickDiscard:()=>false,partialGatePickDiscard:()=>false,s402ConnectorPickDiscard:()=>false,s036Roof009PickDiscard:()=>false,f151CrownPickDiscard:()=>false,f355ClipPick559:()=>false,f346ParentClipPick562:()=>false,isSourceOnlyGlassRoof:()=>false,
  sub:(a,b)=>a.map((v,i)=>v-b[i]),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot:(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),EPS:1e-9,geo:(x,y)=>[x,y],unit:()=>1,
  worldRayInMeshChunk:(chunk,origin,direction)=>({origin:[(origin[0]-chunk.anchor[0])*chunk.frame.unit,origin[2]*chunk.frame.unit,-(origin[1]-chunk.anchor[1])*chunk.frame.unit],direction:[direction[0]*chunk.frame.unit,direction[2]*chunk.frame.unit,-direction[1]*chunk.frame.unit]}),
 };
 const names=['multiply','inverse','project','triangle','boxHit','sceneIndexCount','localComponent','uploadState','paintSelection','grow','rememberFinishedBirth','reserveBirthSlot','drawProjectedShadows','residentCaptureAdapter'];
 if(provider==='city')names.push('writeChunkSelection','drawCitySceneRange','captureChunkComponents','captureChunkRuns','cityCaptureExtra');else names.push('updateSelectionData','writeChunkSelection','drawSceneRange','pickSurface');
 bindProduction(provider,names,S,provider==='city'?['pick']:[]);
 S.residentCaptureState=()=>({textureKind:0,runs:[{firstIndex:0,indexCount:9,program}],c290LowWing:[...loaded.values()][1],tieRows:[{firstIndex:3,indexCount:3,program}]});
 return{S,chunks,loaded,writes,draws,coverage,uniforms,owner,scope,programPins};
}

test('delegated fixed-camera ranges reuse uniforms and the owned triangle convention across draws',()=>{
 const {S,chunks,draws}=fixture('delegated500');
 const gl=S.gl, key=91, first=92, last=93;
 let mode=last,lookups=0,reads=0,transitions=0;
 const extension={PROVOKING_VERTEX_WEBGL:key,FIRST_VERTEX_CONVENTION_WEBGL:first,provokingVertexWEBGL(next){mode=next;transitions++;}};
 const locate=gl.getUniformLocation,get=gl.getParameter;
 gl.getUniformLocation=(p,name)=>{lookups++;return locate(p,name);};
 gl.getParameter=id=>{if(id===key){reads++;return mode;}return get(id);};
 for(const chunk of chunks){
  const {vao,indexBuffer}=chunk.geometry.value;
  indices.markResidentFirstVertexBuffer(gl,indexBuffer,extension);
  indices.bindResidentIndexConvention(gl,vao,indexBuffer);
 }
 const batch=indices.createResidentTriangleDrawBatch(gl);
 try{
  for(let i=0;i<32;i++)assert.equal(S.drawSceneRange(batch,S.program,6,3),true);
  assert.equal(mode,first);
 }finally{batch.restore();}
 assert.equal(draws.length,32);
 assert(draws.every(row=>row.vao.id==='b'&&row.count===3&&row.offset===0));
 assert.equal(lookups,4);
 assert.equal(reads,1);
 assert.equal(transitions,2);
 assert.equal(mode,last);
});

test('chunk packing keeps local indices and converts positions using its authoritative frame',()=>{
 const component={objectId:'one',partId:'part',origin:[2,3],batches:[{positions:[0,2,0,1,2,0,0,2,1],normals:[0,1,0,0,1,0,0,1,0],indices:[0,1,2],color:[1,1,1]}]};
 const value=packed.packChunkGeometry([component],{origin:[1,1],unit:4},new Float32Array(15),new Float32Array(12),{merc:p=>p,unit:()=>2,included:()=>true,style:()=>3,progressivePainted:()=>false,landmark:()=>true});
 assert.deepEqual([...value.indices],[0,1,2]);assert.deepEqual([...value.vertices.slice(0,3)],[4,4,-8]);assert.deepEqual([...value.initialState],[13,13,13]);assert.equal(value.rows[0].firstVertex,0);
});
test('capture splitting handles missing programs and keeps offsets local across interleaved chunks',()=>{
 const a={},b={},spans=[{chunk:a,firstIndex:0,indexCount:3,localFirstIndex:0},{chunk:b,firstIndex:3,indexCount:3,localFirstIndex:0},{chunk:a,firstIndex:6,indexCount:3,localFirstIndex:3}];
 assert.deepEqual(packed.splitChunkRuns(spans,a,[{program:undefined,firstIndex:0,indexCount:9}]),[{program:undefined,firstIndex:0,indexCount:6}]);
 assert.deepEqual(packed.splitChunkRuns(spans,b,[{program:'p',firstIndex:0,indexCount:9}]),[{program:'p',firstIndex:0,indexCount:3}]);
});
for(const provider of ['city','delegated500']){
 test(provider+' source descriptor includes the real shell and raw bound without emitting source',()=>{
  fixture(provider);const ast=parsed.get(provider);let initializer;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='fragmentParts')initializer=node.initializer;ts.forEachChild(node,visit);}visit(ast);assert(initializer);
  const values={...sourceBudget},seen=new Set();function identifiers(node){if(ts.isIdentifier(node)&&/^[A-Z_0-9]+$/.test(node.text))seen.add(node.text);ts.forEachChild(node,identifiers);}identifiers(initializer);for(const name of seen)values[name]='/* '+name+' */';
  const code=ts.transpileModule('('+initializer.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const parts=Function(...Object.keys(values),'return '+code)(...Object.values(values)),raw=sourceBudget.shaderSourceBounds(sourceBudget.shaderSourceText('vec3 f260Station264(){return vec3(1.);}\n'));
  const descriptor=assemblyBudget.shaderSourceBoundPart(raw,{}),shell=parts('/* helper */',descriptor),bounds=assemblyBudget.describeShaderAssemblyBounds(raw,shell,{prune:true,reflectionClip:true});
  const emitted=sourceBudget.emitShaderSource(parts('/* helper */','vec3 f260Station264(){return vec3(1.);}\n'));assert(bounds.sourceCharactersUpperBound>=emitted.length);assert(shell.charactersUpperBound>raw.sourceCharactersUpperBound);assert.throws(()=>descriptor.emit(),/cannot emit/);
 });
 test(provider+' draws local index ranges and preserves scene material height units',()=>{
  const {S,draws}=fixture(provider),draw=provider==='city'?S.drawCitySceneRange:S.drawSceneRange;
  const batch=S.createResidentTriangleDrawBatch(S.gl);
  try{assert.equal(draw(batch,S.program,0,9),true);}finally{batch.restore();}
  assert.deepEqual(draws.map(row=>[row.vao.id,row.count,row.offset,row.heightScale]),[['a',6,0,1],['b',3,0,.5]]);
  assert.equal(draws[1].clip[0],Math.fround(1/2000));
 });
 test(provider+' selection and growth upload only the changed local state interval',()=>{
  const {S,chunks,writes}=fixture(provider);S.selectedIdentity=[...chunks[0].loaded.values()][1];S.paintSelection();assert.deepEqual(writes.map(row=>[row.buffer.id,row.offset,row.data]),[['a',12,[3,3,3]]]);
  S.paintSelection();assert.equal(writes.length,1,'unchanged selection produces no upload');S.birth.set(key(S.selectedIdentity),0);S.grow();assert.deepEqual(writes.at(-1).data,[2.5,2.5,2.5]);assert.equal(writes.at(-1).offset,12);assert(chunks[1].stateData.every(value=>value===1));
 });
 test(provider+' shadow chunks share one blend union and draw only their uploaded index count',()=>{
  const {S,chunks,draws,coverage}=fixture(provider);chunks[1].shadowIndices=new Uint32Array(30);S.drawProjectedShadows(.5);
  assert.equal(coverage.length,1);assert.deepEqual(draws.map(row=>row.count),[6,3]);assert.equal(draws[1].clip[14],Math.fround(.03/1000-.03/2000));
 });
 test(provider+' capture freezes all physical frames and holds source, masks and programs',()=>{
  const {S,chunks,scope,programPins,owner,uniforms}=fixture(provider),snapshot=S.residentCaptureAdapter().snapshot(false);assert.equal(snapshot.status,'active');assert.equal(snapshot.chunks.length,2);
  assert.deepEqual(snapshot.chunks.map(chunk=>chunk.components.map(row=>row.start)),[[0,3],[0]]);assert.deepEqual(snapshot.chunks.flatMap(chunk=>chunk.components.map(row=>row.order)),[0,1,2]);
  const second=snapshot.chunks[1],oldMatrix=[...second.matrix(identity)];chunks[1].cpu.value.frame.unit=9000;chunks[1].unit=9000;chunks[1].anchor[0]=.7;S.sceneChunks=[];S.sceneSun={instantISO:'new'};S.paintMode=()=>0;second.uniforms({},identity,undefined,new Int32Array([0,0,1,1]));
  assert.deepEqual([...second.matrix(identity)],oldMatrix);assert.equal(uniforms.get('u_paint_mode'),2);assert.equal(uniforms.get('u_style_height_scale'),.5);assert.equal(S.gl.isContextLost(),false);assert.equal(scope.pins,1);assert.equal(programPins.length,1);
  if(provider==='city'){const extra=snapshot.chunks[0].extra;assert.strictEqual(extra.component,snapshot.chunks[0].components[1],'tie draw must reference the actual selected component');const selected=reflection.planResidentReflectionChunks(snapshot.chunks.map(chunk=>({...chunk,matrix:identity,cull:false})),3,3);assert(selected.components.some(row=>row.component===extra.component));}
  snapshot.release();snapshot.release();assert.equal(scope.pins,0);assert.equal(programPins.length,0);assert(chunks.every(chunk=>chunk.masks.pins===0));assert.equal(owner.pins,0);
 });
 test(provider+' picking compares hits in one world-ray distance despite different chunk units',()=>{
  const {S,chunks,owner}=fixture(provider);for(let i=0;i<2;i++){const chunk=chunks[i],unit=i+1,y=i===0?.6:.4;chunk.unit=unit;chunk.cpu.value.frame.unit=unit;const row=[...chunk.loaded.values()][0];chunk.loaded=new Map([[key(row),{...row,start:0,end:3,firstVertex:0,lastVertex:3,box:[-.5,y,-.5,.5,y,.5]}]]);chunk.cpu.value.vertices=Float32Array.from([-.5,y,-.5,0,1,0,1,1,1,.5,y,-.5,0,1,0,1,1,1,0,y,.5,0,1,0,1,1,1]);chunk.cpu.value.indices=new Uint32Array([0,1,2]);chunk.cpu.value.paint=new Float32Array(15);chunk.cpu.value.progressive=new Float32Array(12);}
  S.anchorUnit=1;const hit=(provider==='city'?S.pick:S.pickSurface)({x:256,y:256});assert.equal(hit?.objectId,'b-0');assert(Math.abs(hit.distance-1.2)<1e-6);assert.equal(owner.pins,0);
 });
}


test('City correction readiness uses every chunk and survives retirement of compiled source text',()=>{
 const {S,chunks}=fixture('city');S.city='munich';S.cityPaintFragment='';S.cityMaterialFeatures=new Set(['c311Staatskanzlei','c312Stadtsparkasse']);S.c311ShaderActive=S.c312ShaderActive=S.c311ShadowShaderActive=S.c312ShadowShaderActive=true;S.c311ShadowProofReady=S.c312ShadowProofReady=true;S.c311Failure=S.c312Failure=undefined;S.gl.getProgramParameter=()=>true;S.gl.getAttribLocation=()=>0;S.ensureC311ShadowProgram=()=>{};S.c311PickDiscard=S.c312PickDiscard=()=>false;chunks[1].geometry.value.buffers.set('c311',{});chunks[1].geometry.value.buffers.set('c312',{});
 bindProduction('city',['c311Paths','c312Paths'],S);assert.deepEqual(S.c311Paths(),{color:true,shadow:true,preparing:false,pick:true});assert.deepEqual(S.c312Paths(),{color:true,shadow:true,preparing:false,pick:true});
});
test('delegated nonempty preparation cannot invent a whole-scene source identity',async()=>{
 const S=bindProduction('delegated500',['prepareBatches'],{destroyed:false});await assert.rejects(S.prepareBatches([{}],new AbortController().signal),/authoritative renderer chunks/);
});
