// Support for core-solar-handover and core-program-held-wait: the production
// TypeScript modules loaded as they are (transpiled one by one, relative
// imports resolved from the source tree), a fake WebGL2 context, a captured
// scheduler turn queue, and single renderer declarations evaluated in a scope.
//
// `createLoader(overrides)` takes an optional Map from an absolute module path
// to replacement source text or to a ready exports object. The suites call it
// without overrides; a reverse check can load an earlier revision of one module
// (or a provider double) under the same paths.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

export const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const src=(...parts)=>path.join(web,'src',...parts);

export function createLoader(overrides=new Map()){
 const modules=new Map();
 function load(file){
  const filename=file instanceof URL?fileURLToPath(file):file,previous=modules.get(filename);if(previous)return previous.exports;
  const override=overrides.get(filename);
  if(override!==undefined&&typeof override!=='string'){modules.set(filename,{exports:override});return override;}
  const module={exports:{}};modules.set(filename,module);
  try{
   const text=override??readFileSync(filename,'utf8');
   // The synchronous loader evaluates CommonJS. TypeScript otherwise keeps
   // ESM imports whenever the file name ends in .mjs, regardless of moduleKind.
   const compilerFilename=filename.endsWith('.mjs')?filename.slice(0,-4)+'.cts':filename;
   const code=ts.transpileModule(text,{fileName:compilerFilename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
   Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only local production dependencies: '+name);const target=path.resolve(path.dirname(filename),name);return load(path.extname(target)?target:target+'.ts');});
   return module.exports;
  }catch(error){modules.delete(filename);throw error;}
 }
 return load;
}

/** A WebGL2 stand-in: every shader compiles and every program links at once. */
export function fakeGL(){
 let id=0;const linked=[],deleted=[];
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,
  lost:false,isContextLost(){return this.lost;},getExtension:()=>null,createShader:type=>({id:++id,type}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({id:++id,program:true}),attachShader(){},detachShader(){},deleteShader(){},bindAttribLocation(){},linkProgram(program){linked.push(program);},getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  deleteProgram(program){program.deleted=true;deleted.push(program);},fenceSync:()=>({}),flush(){},clientWaitSync:()=>7,deleteSync(){}};
 return{gl,linked,deleted};
}

/** The context scheduler's setTimeout turns, run only when a case asks. */
export function turns(){
 const queue=[],previous=globalThis.setTimeout;globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 return{queue,all(){let n=0;while(queue.length){assert(++n<1000,'unbounded scheduler turns');queue.shift()();}},restore(){globalThis.setTimeout=previous;}};
}

/** Every queued microtask (and the ones they queue) has run. */
export const microtasks=()=>new Promise(resolve=>setImmediate(resolve));

const declarations=new Map();
/** The one function declaration `name` of a production source file, as text. */
export function declarationText(file,name){
 const key=file+'#'+name;if(declarations.has(key))return declarations.get(key);
 const text=readFileSync(file,'utf8'),ast=ts.createSourceFile(path.basename(file),text,ts.ScriptTarget.Latest,true),rows=[];
 (function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)rows.push(node.getText(ast));ts.forEachChild(node,visit);})(ast);
 assert.equal(rows.length,1,'one declaration '+name+' in '+path.relative(web,file));
 declarations.set(key,rows[0]);return rows[0];
}
/** Evaluate a declaration's TypeScript text with `state` as its enclosing scope
 * (free names read and write state; anything else falls back to globalThis). */
export function evaluateDeclaration(source,state){
 const js=ts.transpileModule('('+source+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');
 const scope=new Proxy(state,{has:()=>true,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:globalThis[key],set:(target,key,value)=>(target[key]=value,true)});
 return Function('scope','with(scope){return '+js+'}')(scope);
}
