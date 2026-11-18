import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const web=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(path.join(web,'package.json')),ts=require('typescript');
// The shared entry (src/safety) re-exports the production city implementation, so `base` resolves to that file.
const providers={base:'src/safety',city:'src/painted/city/safety',delegated500:'src/painted/delegated500/safety',tier300:'src/painted/tier300/safety'};
const identity={objectId:'osm/way/1207797957',partId:'osm/way/1207797957/component/b56e09c7e8b907ba01ed'};
const key=x=>x.objectId+'|'+x.partId;
const unavailable={requested:true,available:false,reason:'GPU buffers/context unavailable',records:[]};
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
async function resolveProviderDir(dir){
 const source=await readFile(path.join(web,dir,'building-mesh-renderer.ts'),'utf8'),reexport=/^\s*export \* from '([^']+)\/building-mesh-renderer';?\s*$/m.exec(source.replace(/^\s*\/\/.*$/mg,''));
 if(!reexport)return dir;
 assert.equal(source.replace(/^\s*\/\/.*$/mg,'').trim().split('\n').length,1,dir+' shared entry is a pure re-export');
 return path.relative(web,path.resolve(web,dir,reexport[1]));
}
const production=Object.fromEntries(await Promise.all(Object.entries(providers).map(async([provider,declared])=>{
 const dir=await resolveProviderDir(declared);if(provider==='base')assert.equal(dir,providers.city,'shared entry resolves to the city implementation');
 const source=await readFile(path.join(web,dir,'building-mesh-renderer.ts'),'utf8'),ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true),matches=[],declarations=new Map();
 function visit(node){
  if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='readPaintGPUDiagnostic')matches.push(node.initializer.getText(ast));
  if(ts.isShorthandPropertyAssignment(node)&&node.name.getText(ast)==='readPaintGPUDiagnostic')matches.push('readPaintGPUDiagnostic');
  if(ts.isFunctionDeclaration(node)&&node.name&&node.body){const list=declarations.get(node.name.text)??[];list.push(node.getText(ast));declarations.set(node.name.text,list);}
  ts.forEachChild(node,visit);
 }
 visit(ast);assert.equal(matches.length,1,provider+' public readback entry');
 const declaration=name=>{const list=declarations.get(name)??[];assert.equal(list.length,1,provider+' declares '+name+' once');return list[0];};
 const readName=/^[A-Za-z_$][\w$]*$/.test(matches[0])?matches[0]:undefined,getter=transpile('('+(readName?declaration(readName):matches[0])+')'),ready=transpile('('+declaration('gpuReady')+')');
 const helperImport=/import \{readPaintGPUDiagnostic as [\w$]+\} from '(\.\/source-partial-gate-gpu-diagnostic)';/.exec(source);assert(helperImport,provider+' imports its GPU readback helper');
 const helperSource=await readFile(path.join(web,dir,helperImport[1]+'.ts'),'utf8');
 const helper=(await import('data:text/javascript;base64,'+Buffer.from(transpile(helperSource)+'\n//# sourceURL=provider-readback-'+provider+'.mjs').toString('base64'))).readPaintGPUDiagnostic;
 return[provider,{getter:getter.trim().replace(/;$/,''),ready:ready.trim().replace(/;$/,''),helper,dir}];
})));
// Chunk-resident readback: each scene chunk owns its CPU arrays, canonical state and GPU geometry lease.
const delegatedChunkShape=provider=>provider==='delegated500';
function chunkFor(provider,{gl,loaded,vertices=new Float32Array(),indices=new Uint32Array(),stateData=new Float32Array(),buffers,contentKey='chunk:'+provider}){
 const geometry=buffers===null?{released:true,context:gl,epoch:1,value:undefined}:{released:false,context:gl,epoch:1,value:buffers&&{vao:buffers.vao,indexBuffer:buffers.indexBuffer,buffers:new Map(Object.entries({progressive:buffers.progressiveBuffer,paint:buffers.paintBuffer,[delegatedChunkShape(provider)?'static':'vertex']:buffers.vertexBuffer,state:buffers.stateBuffer}).filter(([,value])=>value!==undefined))}};
 return{contentKey,loaded,cpu:{value:{vertices,indices}},...(delegatedChunkShape(provider)?{stateData}:{state:{value:stateData}}),geometry};
}
// Expected unavailable result: delegated500 tags each chunk report with its content key.
const unavailableFor=(provider,chunk)=>delegatedChunkShape(provider)&&chunk?{contentKey:chunk.contentKey,...unavailable}:unavailable;
function entry(provider,values){
 const {getter,ready,helper}=production[provider],contexts=[];
 const env={key,vao:undefined,program:{},geometryUploadPending:false,progressiveBuffer:undefined,paintBuffer:undefined,sceneChunks:[],...values,
  geometryOwner:{get currentLeases(){return env.sceneChunks.map(chunk=>chunk.geometry);}},
  residentGeometry:{store:{contextEpoch:()=>1},capture:()=>({release(){}})},
  readPaintGPUBufferDiagnostic(context,identities){contexts.push(context);return helper(context,identities);}};
 const scope=new Proxy(env,{has:()=>true,get:(o,k)=>k===Symbol.unscopables?undefined:k in o?o[k]:globalThis[k],set:(o,k,v)=>{o[k]=v;return true;}});
 env.gpuReady=Function('env','with(env){return '+ready+'}')(scope);
 const read=Function('env','with(env){return '+getter+'}')(scope);
 return{env,read,contexts};
}
function forbiddenGL(){const access=[];return{access,gl:new Proxy({},{get(_o,name){access.push(name);throw Error('pending readback touched GL: '+String(name));}})};}
// Context-state probe only: production checks gl.isContextLost() before deciding that released or
// missing chunk buffers are unavailable; every buffer, binding or attribute access still throws.
function contextStateOnlyGL(){const access=[];return{access,gl:new Proxy({},{get(_o,name){access.push(name);if(name==='isContextLost')return()=>false;throw Error('released readback touched GL: '+String(name));}})};}
function resident(provider){
 const progressiveBuffer={},paintBuffer={},vertexBuffer={},indexBuffer={},stateBuffer={},previousArray={},previousVAO={},vao={},program={};
 const component={...identity,firstVertex:2,lastVertex:59,start:0,end:3,batches:[{positions:new Float32Array(57*3)}]};
 const vertexStride=9,vertices=Float32Array.from({length:59*vertexStride},(_,i)=>i/4),stateData=Float32Array.from({length:59},(_,i)=>2+(i%5)/8),indices=new Uint32Array([2,3,4]);
 const progressive=new Float32Array(59*4).fill(.5),paint=new Float32Array(59*5).fill(1.25);
 const data=new Map([[progressiveBuffer,progressive],[paintBuffer,paint],[vertexBuffer,vertices],[stateBuffer,stateData.slice()],[indexBuffer,indices]]),calls=[];
 let array=previousArray,boundVAO=previousVAO;
 const gl={ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,ARRAY_BUFFER_BINDING:3,VERTEX_ARRAY_BINDING:4,BUFFER_SIZE:5,FLOAT:6,VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:7,VERTEX_ATTRIB_ARRAY_ENABLED:8,VERTEX_ATTRIB_ARRAY_SIZE:9,VERTEX_ATTRIB_ARRAY_STRIDE:10,VERTEX_ATTRIB_ARRAY_TYPE:11,VERTEX_ATTRIB_ARRAY_NORMALIZED:12,VERTEX_ATTRIB_ARRAY_INTEGER:13,VERTEX_ATTRIB_ARRAY_DIVISOR:14,VERTEX_ATTRIB_ARRAY_POINTER:15,
  isContextLost(){calls.push('isContextLost');return false;},
  getParameter(name){calls.push('getParameter');return name===3?array:boundVAO;},
  bindVertexArray(value){calls.push('bindVertexArray');boundVAO=value;},
  bindBuffer(target,value){calls.push('bindBuffer');if(target===1)array=value;},
  getBufferParameter(){calls.push('getBufferParameter');return data.get(array).byteLength;},
  getBufferSubData(target,offset,destination){calls.push('getBufferSubData');const source=data.get(target===1?array:indexBuffer);destination.set(source.subarray(offset/4,offset/4+destination.length));},
  getAttribLocation(_program,name){calls.push('getAttribLocation');return name==='a_selected'?3:-1;},getVertexAttrib(_location,parameter){return({7:stateBuffer,8:true,9:1,10:4,11:6,12:false,13:false,14:0})[parameter];},getVertexAttribOffset(){return 0;},getUniformLocation(){calls.push('getUniformLocation');return null;},getAttachedShaders(){calls.push('getAttachedShaders');return[];},
 };
 const buffers={vao,progressiveBuffer,paintBuffer,vertexBuffer,indexBuffer,stateBuffer};
 const makeChunk=(variant=buffers)=>chunkFor(provider,{gl,loaded:new Map([[key(identity),component]]),vertices,indices,stateData,buffers:variant});
 const chunk=makeChunk();
 const f=entry(provider,{gl,geometryUploadPending:false,program,sceneChunks:[chunk]});
 return{...f,gl,data,calls,chunk,buffers,makeChunk,progressiveBuffer,stateBuffer,previousArray,previousVAO,get bindings(){return{array,vao:boundVAO};}};
}
const stateOf=(provider,chunk)=>delegatedChunkShape(provider)?chunk.stateData:chunk.state.value;
// city/tier300 merge chunk reports (records plus attributes); delegated500 returns its single chunk report with the content key.
const mergedUnavailable=(provider,chunk)=>delegatedChunkShape(provider)?{contentKey:chunk.contentKey,...unavailable}:{...unavailable,attributes:[]};
for(const provider of Object.keys(providers)){
 test(`${provider}: pending readback never inspects stale GL after pending, failed or superseded upload`,()=>{
  const blocked=forbiddenGL(),stale=chunkFor(provider,{gl:blocked.gl,loaded:new Map([[key(identity),{...identity,firstVertex:2,lastVertex:59}]]),buffers:{progressiveBuffer:{},paintBuffer:{}}});
  const f=entry(provider,{gl:blocked.gl,geometryUploadPending:true,geometryUploadRevision:1,sceneChunks:[stale]});
  for(const state of ['pending','failed','superseded']){
   if(state==='failed')f.env.mainGeometryProgramFailure='controlled geometry upload failure';
   if(state==='superseded'){f.env.geometryUploadRevision++;f.env.sceneChunks=[chunkFor(provider,{gl:blocked.gl,contentKey:'chunk:superseded',vertices:new Float32Array(1000),loaded:new Map([[key(identity),{...identity,firstVertex:100,lastVertex:200}]]),buffers:{progressiveBuffer:{},paintBuffer:{}}})];}
   assert.deepEqual(f.read([identity]),unavailableFor(provider,f.env.sceneChunks[0]),state);
  }
  assert.deepEqual(blocked.access,[]);assert.equal(f.contexts.length,3);
 });
 test(`${provider}: released and missing required buffers avoid GL, then restored buffers resume real readback`,()=>{
  const f=resident(provider),blocked=contextStateOnlyGL();
  f.env.gl=blocked.gl;f.env.geometryUploadPending=false;
  const variants=[['released',null,()=>delegatedChunkShape(provider)?unavailableFor(provider,f.env.sceneChunks[0]):unavailable],
   ...[['missing both',{progressiveBuffer:undefined,paintBuffer:undefined}],['missing progressive',{progressiveBuffer:undefined}],['missing paint',{paintBuffer:undefined}]].map(([name,missing])=>[name,{...f.buffers,...missing},()=>mergedUnavailable(provider,f.env.sceneChunks[0])])];
  for(const [name,buffers,expected] of variants){
   f.env.sceneChunks=[chunkFor(provider,{gl:blocked.gl,loaded:f.chunk.loaded,vertices:f.chunk.cpu.value.vertices,indices:f.chunk.cpu.value.indices,stateData:stateOf(provider,f.chunk),buffers})];
   assert.deepEqual(f.read([identity]),expected(),name);
  }
  assert(blocked.access.every(name=>name==='isContextLost'),'only the context-state probe ran: '+blocked.access.join(','));assert.deepEqual(f.calls,[]);
  Object.assign(f.env,{gl:f.gl,sceneChunks:[f.chunk]});const result=f.read([identity]);
  assert.equal(result.available,true);assert.equal(result.records.length,1);assert(f.calls.includes('getBufferSubData'));
 });
 test(`${provider}: absent requests and original eight identity limit run before any GL access`,()=>{
  for(const pending of [true,false]){
   const blocked=forbiddenGL(),chunk=chunkFor(provider,{gl:blocked.gl,loaded:new Map([[key(identity),{...identity,firstVertex:2,lastVertex:59}]]),buffers:{progressiveBuffer:{},paintBuffer:{}}}),f=entry(provider,{gl:blocked.gl,geometryUploadPending:pending,sceneChunks:[chunk]});
   assert.deepEqual(f.read(),{requested:false,records:[]});assert.deepEqual(f.read([]),{requested:false,records:[]});
   assert.throws(()=>f.read(Array(9).fill(identity)),/Too many GPU diagnostic identities/);
   if(pending)assert.deepEqual(f.read(Array(8).fill(identity)),unavailableFor(provider,chunk));
   assert.deepEqual(blocked.access,[]);
  }
 });
 test(`${provider}: ready readback delegates actual ranges, restores bindings and preserves helper errors`,()=>{
  const f=resident(provider),result=f.read([identity]),context=f.contexts.at(-1);
  assert.equal(context.gl,f.gl);assert.equal(context.progressiveBuffer,f.buffers.progressiveBuffer);assert.equal(context.paintBuffer,f.buffers.paintBuffer);
  assert.equal(result.available,true);assert.equal(result.records.length,1);assert.equal(result.records[0].globalFirstVertex,2);
  assert.deepEqual(result.records[0].progressive.values,Array(57*4).fill(.5));assert.deepEqual(result.records[0].paint.values,Array(57*5).fill(1.25));
  assert.equal(context.packedVertices,f.chunk.cpu.value.vertices);assert.equal(context.packedIndices,f.chunk.cpu.value.indices);assert.equal(context.packedVertexStride,9);assert.equal(context.packedState,stateOf(provider,f.chunk));assert.equal(context.stateBuffer,f.stateBuffer);assert.equal(result.records[0].packedGeometry.strideFloats,9);assert.equal(result.records[0].packedGeometry.allValuesMatchCPU,true);assert.equal(result.records[0].packedState.strideFloats,1);assert.equal(result.records[0].packedState.allValuesMatchCPU,true);assert.equal(result.records[0].packedIndex.allValuesMatchCPU,true);assert(result.attributes.some(row=>row.name==='a_selected'&&row.matchesExpected));
  const direct=production[provider].helper(context,[identity]);
  assert.deepEqual(result,delegatedChunkShape(provider)?{contentKey:f.chunk.contentKey,...direct}:direct);assert.deepEqual(f.read(Array(8).fill(identity)),result);
  assert.deepEqual(f.bindings,{array:f.previousArray,vao:f.previousVAO});assert(f.calls.includes('getBufferSubData'));
  f.data.set(f.progressiveBuffer,new Float32Array(1));assert.throws(()=>f.read([identity]),/GPU diagnostic byte range exceeds buffer/);
  assert.deepEqual(f.bindings,{array:f.previousArray,vao:f.previousVAO});
 });
}
for(const provider of ['city','delegated500','tier300'])test(`${provider}: canonical state readback observes the GPU value separately from immutable geometry`,()=>{
 const f=resident(provider),vertices=f.chunk.cpu.value.vertices.slice(),state=stateOf(provider,f.chunk).slice();f.data.get(f.stateBuffer)[2]+=1;
 const result=f.read([identity]);assert.equal(result.records[0].packedGeometry.allValuesMatchCPU,true);assert.equal(result.records[0].packedState.allValuesMatchCPU,false);assert.deepEqual(f.chunk.cpu.value.vertices,vertices);assert.deepEqual(stateOf(provider,f.chunk),state);assert.deepEqual(f.bindings,{array:f.previousArray,vao:f.previousVAO});
});
for(const provider of ['city','delegated500','tier300'])test(`${provider}: canonical nine-float pick bounds match the same original indexed vertices`,async()=>{
 const source=await readFile(path.join(web,providers[provider],'indexed-pick-blocks70.ts'),'utf8'),helper=await import('data:text/javascript;base64,'+Buffer.from(transpile(source)).toString('base64'));
 const canonical=Float32Array.from([-2,-4,-6,0,1,0,.2,.3,.4,3,7,11,0,1,0,.2,.3,.4,1,-1,2,0,1,0,.2,.3,.4,999,999,999,0,1,0,.2,.3,.4]),legacy=new Float32Array(40);
 for(let i=0;i<4;i++){legacy.set(canonical.subarray(i*9,(i+1)*9),i*10);legacy[i*10+9]=2.5;}
 const indices=new Uint32Array([0,1,2]),rows=[{start:0,end:3}],a=helper.createIndexedPickBlocks70(canonical,indices,rows,9),b=helper.createIndexedPickBlocks70(legacy,indices,rows);
 assert.deepEqual(a.bounds,b.bounds);assert.equal(a.blockCount,1);assert.equal(a.typedBytes,b.typedBytes);assert(a.bounds[3]<999,'unindexed outlier is not included');
 for(const ray of [[[0,20,0],[0,-1,0]],[[50,20,0],[0,-1,0]]])assert.equal(helper.indexedPickBlockHit70(...ray,a.bounds,0),helper.indexedPickBlockHit70(...ray,b.bounds,0));
});
