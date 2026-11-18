// Read-only white-box view of the actual Bremen renderer module, for the
// construction harness (fixtures/bremen-renderer-construction-harness.mjs), which
// evaluates the entire production module text and calls its constructor.
//
// The only change to the production text is one inserted statement directly
// before the constructor's public return: it hands a getter object over the
// constructor's own closure state (and a few of its lifecycle function
// declarations) to an injected fixture module. No product statement is removed,
// reordered or replaced, so commit, chunk packing (packBremenChunkMaterials,
// installBremenChunkScene, releaseBremenChunks), scene* state and the page chunk
// store all run as written. Every inspected name must be declared at the top
// level of createBuildingMeshRenderer; a rename fails here loudly.
import assert from 'node:assert/strict';
import ts from 'typescript';

export const F6BREMEN_INSPECT_MODULE='f6bremen:renderer-inspect';

// Closure variables (read-only unless listed in WRITABLE) and lifecycle functions.
const STATE=['sourceLoaded','loaded','currentDataScope','configuredDataScope','transientResidentScope','generation','viewRevision','residentScopePins','residentProgramPlan','progressiveShaderSpecialization','progressivePaintDiagnosticState','ownerReconstruction','lastRenderedProjection','sceneChunks','sceneSpans','sceneChunkDependencies','pendingCandidate','candidateFailure','gl','programPreparation'];
const WRITABLE=new Set(['lastRenderedProjection']);
const FUNCTIONS=['releaseGPU','contextLost','initializeResidentGPU','gpuReady','sceneVertexCount','sceneIndexCount'];

function topLevelNames(factory){
 const names=new Set();
 for(const statement of factory.body.statements){
  if(ts.isFunctionDeclaration(statement)&&statement.name)names.add(statement.name.text);
  else if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name))names.add(declaration.name.text);
 }
 return names;
}

/** Returns the actual renderer source with the inspection statement inserted. */
export function inspectableRendererSource(text,{writable=[]}={}){
 const ast=ts.createSourceFile('building-mesh-renderer.ts',text,ts.ScriptTarget.Latest,true);
 const factories=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createBuildingMeshRenderer');
 assert.equal(factories.length,1,'actual Bremen renderer constructor');
 const factory=factories[0],declared=topLevelNames(factory);
 for(const name of [...STATE,...FUNCTIONS])assert(declared.has(name),'actual Bremen renderer declares '+name+' at constructor scope');
 const returns=factory.body.statements.filter(ts.isReturnStatement);
 assert.equal(returns.length,1,'actual Bremen renderer has one public return');
 // Only a suite that deliberately sets closure state (named in `writable`) gets a setter.
 for(const name of writable)assert(STATE.includes(name),'writable inspected state '+name);
 const getters=STATE.map(name=>`get ${name}(){return ${name};}`+(WRITABLE.has(name)||writable.includes(name)?`,set ${name}(value){${name}=value;}`:''));
 const hook=`__f6bremenInspect({${[...getters,...FUNCTIONS].join(',')}});`;
 const at=returns[0].getStart(ast);
 return `import {__f6bremenInspect} from '${F6BREMEN_INSPECT_MODULE}';\n`+text.slice(0,at)+hook+text.slice(at);
}

/** Dependency override that records each constructed renderer's inspection view. */
export function inspectionRecorder(){
 const views=[];
 return{views,override:{[F6BREMEN_INSPECT_MODULE]:{__f6bremenInspect:view=>{views.push(view);}}},get latest(){return views.at(-1);}};
}

// Chunk-scene equivalents of the former whole-scene arrays. A published scene is
// a list of page-store chunks; each packed chunk holds its own vertices (9 floats
// per vertex), indices, paint (5), progressive (4) and dynamic state (1). The
// scene draws its spans in order, so the scene-order arrays are each chunk's
// arrays in sceneChunks order, and scene indices are each span's local indices
// shifted by the vertex base of its chunk.
export function sceneArrays(view){
 const chunks=view.sceneChunks,bases=new Map();let base=0;
 for(const chunk of chunks){bases.set(chunk,base);base+=(chunk.cpu.value?.vertices.length??0)/9;}
 const concat=(Type,pick)=>{const parts=chunks.map(pick).filter(Boolean),out=new Type(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;};
 const indices=[];
 for(const span of view.sceneSpans){const packed=span.chunk.cpu.value;for(let i=0;i<span.indexCount;i++)indices.push(packed.indices[span.localFirstIndex+i]+bases.get(span.chunk));}
 return{
  vertices:concat(Float32Array,chunk=>chunk.cpu.value?.vertices),
  paintData:concat(Float32Array,chunk=>chunk.cpu.value?.paint),
  progressiveData:concat(Float32Array,chunk=>chunk.cpu.value?.progressive),
  stateData:concat(Float32Array,chunk=>chunk.state?.value),
  indices:Uint32Array.from(indices),
 };
}

/** The identity of the published chunk arrays: the same resident scene keeps the
 * same packed arrays (strict identity per chunk), a replacement does not. */
export function residentArrayIdentity(view){
 return view.sceneChunks.map(chunk=>({cpu:chunk.cpu.value,vertices:chunk.cpu.value?.vertices,state:chunk.state?.value}));
}
export function assertSameResidentArrays(actual,expected,message='resident chunk arrays'){
 assert.equal(actual.length,expected.length,message+' chunk count');
 actual.forEach((entry,i)=>{for(const name of ['cpu','vertices','state'])assert.strictEqual(entry[name],expected[i][name],message+' chunk '+i+' '+name);});
}

/** GPU allocation sizes as WebGL defines them: bufferData (re)allocates the bound
 * buffer, bufferSubData writes inside the existing allocation without resizing
 * it, deleteBuffer frees it. The construction harness's tiny GL records the last
 * written data per buffer (a sub-range write replaces its record), so a suite
 * that drains the page store after partial state uploads passes this map to
 * drainPage instead. Uniform buffers are not chunk resources and are excluded,
 * as in the harness. Call before the context is attached. */
export function trackLiveBuffers(gl){
 const live=new Map();let array,element;
 const {bindBuffer,bufferData,deleteBuffer}=gl;
 gl.bindBuffer=(target,buffer)=>{if(target===gl.ARRAY_BUFFER)array=buffer;else if(target===gl.ELEMENT_ARRAY_BUFFER)element=buffer;return bindBuffer.call(gl,target,buffer);};
 gl.bufferData=(target,data,...rest)=>{const result=bufferData.call(gl,target,data,...rest);if(target===gl.ARRAY_BUFFER||target===gl.ELEMENT_ARRAY_BUFFER)live.set(target===gl.ARRAY_BUFFER?array:element,{byteLength:data.byteLength});return result;};
 gl.deleteBuffer=buffer=>{live.delete(buffer);return deleteBuffer.call(gl,buffer);};
 return live;
}
