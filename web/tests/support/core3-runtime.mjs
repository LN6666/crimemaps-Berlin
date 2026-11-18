// shared-core-3: real production modules (program preparation, its context
// scheduler, the chunk store, the page ledger and the byte transport) loaded
// as one CommonJS graph from their TypeScript sources, plus a fake WebGL2
// driver and a manual task queue for the scheduler's turns.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const productionModules=new Map();
export function loadProductionModule(file){
 const filename=file instanceof URL?fileURLToPath(file):file,previous=productionModules.get(filename);if(previous)return previous.exports;
 const module={exports:{}};productionModules.set(filename,module);
 try{
  const code=ts.transpileModule(readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  Function('module','exports','require',code+'\n//# sourceURL='+filename)(module,module.exports,name=>{assert(name.startsWith('.'),'only real local production dependencies');const target=path.resolve(path.dirname(filename),name);return loadProductionModule(path.extname(target)?target:target+'.ts');});
  return module.exports;
 }catch(error){productionModules.delete(filename);throw error;}
}
// CORE3_SAFETY_DIR (an absolute directory with the same layout as src/safety)
// lets a negative control load an earlier copy of these modules.
const safety=process.env.CORE3_SAFETY_DIR?new URL('file://'+path.resolve(process.env.CORE3_SAFETY_DIR)+'/'):new URL('../../src/safety/',import.meta.url);
export const preparation=loadProductionModule(new URL('render-runtime/program-preparation.ts',safety));
export const ledger=loadProductionModule(new URL('render-runtime/resource-budget.ts',safety));
export const stores=loadProductionModule(new URL('render-runtime/chunk-resource-store.ts',safety));
export const transport=loadProductionModule(new URL('resource-byte-transport.ts',safety));
export const MiB=1024*1024,KiB=1024;

/** A fake WebGL2 context: synchronous compile/link, fences that pass at once. */
export function driver(){
 let id=0;const created=[],deleted=[];
 const gl={lost:false,linked:true,fenceComplete:true,VERTEX_SHADER:1,FRAGMENT_SHADER:2,LINK_STATUS:3,COMPILE_STATUS:4,SYNC_GPU_COMMANDS_COMPLETE:6,ALREADY_SIGNALED:7,CONDITION_SATISFIED:8,TIMEOUT_EXPIRED:9,WAIT_FAILED:10,isContextLost(){return this.lost;}};
 Object.assign(gl,{
  createShader:type=>{const value={type,id:++id};created.push(value);return value;},shaderSource(){},compileShader(){},
  createProgram:()=>{const value={program:true,id:++id,deleted:false};created.push(value);return value;},
  attachShader(){},detachShader(){},bindAttribLocation(){},linkProgram(){},getExtension:()=>null,
  getProgramParameter:()=>gl.linked,getProgramInfoLog:()=>'',getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  deleteShader:value=>deleted.push(value),deleteProgram:value=>{assert(!value.deleted,'one delete per executable');value.deleted=true;deleted.push(value);},
  fenceSync:()=>({sync:++id}),flush(){},clientWaitSync:()=>gl.fenceComplete?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED,deleteSync(){},
 });
 return{gl,created,deleted,programs:()=>created.filter(value=>value.program)};
}
/** The scheduler's setTimeout turns, run by hand. */
export function turns(){
 const queue=[],previous=globalThis.setTimeout;
 globalThis.setTimeout=fn=>(queue.push(fn),queue.length);
 return{queue,all(){let n=0;while(queue.length){assert(++n<1000,'bounded turns');queue.shift()();}},restore(){globalThis.setTimeout=previous;}};
}
/** One page: a ledger with a recent subset and its chunk store bound to gl. */
export function page(f,{limitBytes=8*MiB,recentLimitBytes=2*MiB}={}){
 const budget=ledger.createResourceBudget({limitBytes,recentLimitBytes}),store=stores.createChunkResourceStore({budget});
 if(f)stores.bindChunkResourceContext(f.gl,store);
 return{budget,store};
}
export const pending=(fn,status='pending')=>assert.throws(fn,error=>preparation.isProgramPreparationPending(error)&&error.status===status);
/** Compile, run the scheduler, and take the linked executable. */
export function linked(t,owner,f,recipe){pending(()=>owner.compile(f.gl,recipe));t.all();const program=owner.compile(f.gl,recipe);assert(program.program,'a linked executable');return program;}
const authority=preparation.createProgramSourceAuthority({inputs:['core3 ABI'],builders:[function build(){}]});
/** A budgeted recipe; budget overrides (e.g. submittedAllowanceBytes) merge in. */
export function recipe(resource,counter={builds:0},{shared=true,unbudgeted=false,budget={sourceBytesUpperBound:4*KiB},...extra}={}){
 return{...(shared?{sharedKey:'core3-abi',provenance:[authority]}:{}),resource,inputs:['vertex:v1','helper:'+resource],priority:'visible',...(unbudgeted?{}:{budget}),build(){counter.builds++;return{vertex:'v '+resource,fragment:'f '+resource,attributes:['a_position']};},...extra};
}
export const programCategory=budget=>budget.stats.categories.program?.bytes??0;
