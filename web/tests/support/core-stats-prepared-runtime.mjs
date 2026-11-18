// Production modules for the core-stats prepared-source tests: the prepared
// source workspace, program preparation, the page store and its ledger, each
// compiled from source into one module registry, so they share module state as
// on the page. The fake GL driver supplies hardware calls only; nothing touches
// a GPU and no product shader or asset is read.
//
// CORE_STATS_PREPARED_SOURCE (absolute path) swaps prepared-source.ts for a
// negative control, e.g. its copy from before the idle-entry retirement; the
// copy's relative imports still resolve inside web/src/safety.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../src/safety'),preparedSourceFile=path.join(safety,'prepared-source.ts');
export const preparedSourceOverride=process.env.CORE_STATS_PREPARED_SOURCE?path.resolve(process.env.CORE_STATS_PREPARED_SOURCE):undefined;
const registry=new Map();
function load(filename){
 const previous=registry.get(filename);if(previous)return previous.exports;
 // Registered before it runs: the store and program preparation import each other.
 const module={exports:{}};registry.set(filename,module);
 try{
  const text=readFileSync(filename===preparedSourceFile&&preparedSourceOverride?preparedSourceOverride:filename,'utf8');
  const code=ts.transpileModule(text,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{
   assert(name.startsWith('.'),'only local production dependencies: '+name);
   const target=path.resolve(path.dirname(filename),name);return load(path.extname(target)?target:target+'.ts');
  });
  return module.exports;
 }catch(error){registry.delete(filename);throw error;}
}
export const programs=load(path.join(safety,'render-runtime/program-preparation.ts'));
export const budgets=load(path.join(safety,'render-runtime/resource-budget.ts'));
export const stores=load(path.join(safety,'render-runtime/chunk-resource-store.ts'));
export const shaderSources=load(path.join(safety,'render-runtime/shader-source-budget.ts'));
export const preparedSources=load(preparedSourceFile);

/** WebGL2 calls program preparation makes, with real attach/delete semantics. */
export function driver(){
 let id=0;const calls=[],created=[],deleted=[],fences=[],deletedSyncs=[];
 const gl={lost:false,complete:true,fenceComplete:true,linked:true,compiled:true,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,isContextLost(){return this.lost;}};
 const call=(name,fn)=>(...args)=>{assert(!gl.lost,name+' after context loss');calls.push({name,args});return fn?.(...args);};
 const releaseShader=shader=>{if(shader.deleteRequested&&!shader.attachments.size)shader.released=true;};
 const detach=(program,shader)=>{assert(program.shaders.delete(shader),'detaching a shader that was not attached');assert(shader.attachments.delete(program));releaseShader(shader);};
 Object.assign(gl,{
  createShader:call('createShader',type=>{const value={type,id:++id,attachments:new Set(),deleteRequested:false,released:false};created.push(value);return value;}),shaderSource:call('shaderSource'),compileShader:call('compileShader'),
  createProgram:call('createProgram',()=>{const value={program:true,id:++id,shaders:new Set(),deleted:false,linked:false};created.push(value);return value;}),
  attachShader:call('attachShader',(program,shader)=>{assert(!program.deleted&&!shader.released);assert(!program.shaders.has(shader));program.shaders.add(shader);shader.attachments.add(program);}),
  detachShader:call('detachShader',detach),getAttachedShaders:call('getAttachedShaders',program=>[...program.shaders]),
  bindAttribLocation:call('bindAttribLocation'),linkProgram:call('linkProgram',program=>program.linked=gl.linked),
  getExtension:call('getExtension',()=>null),getProgramParameter:call('getProgramParameter',(program,parameter)=>parameter===5?gl.complete:gl.linked),
  getProgramInfoLog:call('getProgramInfoLog',()=>''),getShaderParameter:call('getShaderParameter',(shader,parameter)=>parameter===5?gl.complete:gl.compiled),getShaderInfoLog:call('getShaderInfoLog',()=>''),
  deleteShader:call('deleteShader',shader=>{deleted.push(shader);shader.deleteRequested=true;releaseShader(shader);}),
  deleteProgram:call('deleteProgram',program=>{deleted.push(program);if(program.deleted)return;program.deleted=true;for(const shader of [...program.shaders])detach(program,shader);}),
  useProgram:call('useProgram',program=>assert(program.linked&&!program.deleted,'a linked executable stays usable')),
  fenceSync:call('fenceSync',()=>{const fence={sync:fences.length+1};fences.push(fence);return fence;}),flush:call('flush'),clientWaitSync:call('clientWaitSync',()=>gl.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED),deleteSync:call('deleteSync',fence=>deletedSyncs.push(fence)),
 });
 return{gl,calls,created,deleted};
}

/** Preparation turns run only when the test asks (setTimeout is captured). */
export function turns(){
 const queue=[],previous=globalThis.setTimeout,performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'),timeOrigin=performance.timeOrigin;let now=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin,now:()=>now}});
 globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 return{
  queue,
  all(){let n=0;while(queue.length){assert(++n<1000,'unbounded preparation turns');queue.shift()();}},
  restore(){globalThis.setTimeout=previous;if(performanceDescriptor)Object.defineProperty(globalThis,'performance',performanceDescriptor);else delete globalThis.performance;},
 };
}
