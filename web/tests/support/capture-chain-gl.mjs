// Shared by capture-chain-*.test.mjs. One module graph of the real capture
// owners (planar reflection core, scene solar shadow core and layer), the
// planar reflection groups, the resident reflection planner, program
// preparation owners, the page ledger and the chunk resource store, on a fake
// WebGL2 context: no GPU, browser, visual or physical memory evidence.
// Depends on ./solar-reflection-wait-gl.mjs (commit both together).
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createWaitGL,captureTimers} from './solar-reflection-wait-gl.mjs';
export {captureTimers};

const safety=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../src/safety');
export const MiB=1024*1024;

export async function loadCaptureChain(){
 const entry=[
  "export {planarReflectionGroup} from './planar-reflection-group';",
  "export {createPlanarBuildingReflection,planarReflectionBudget,planarReflectionSize} from './planar-building-reflection';",
  "export {installSceneSolarShadowLayer} from './scene-solar-shadow-layer';",
  "export {sceneSolarLight} from './scene-solar-light';",
  "export {planResidentReflectionChunks} from './resident-planar-reflection';",
  "export {solarShadowPreparation,solarShadowPreparationNeedsFrame,solarShadowPreparationHeldWait} from './solar-shadow-preparation';",
  "export {createProgramPreparationOwner,isProgramPreparationPending} from './render-runtime/program-preparation';",
  "export {createChunkResourceStore,bindChunkResourceContext} from './render-runtime/chunk-resource-store';",
  "export {createResourceBudget,ResourceBudgetExceededError} from './render-runtime/resource-budget';",
 ].join('\n');
 const built=await build({stdin:{contents:entry,resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',preserveSymlinks:true});
 return import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
}

/** createWaitGL whose fences behave like a GPU queue: a fence never signals in
 * the frame that created it, only after advanceGPU() moved past that frame, and
 * stall(true) keeps every fence unsignaled. A map frame calls advanceGPU()
 * first, then renders, then the 'render' boundary collects. */
export function createFencedGL(options){
 const gl=createWaitGL(options);let gpuFrame=0,stalled=false;const fences=[];
 return Object.assign(gl,{fences,
  fenceSync(){gl.counts.fences++;const fence={kind:'fence',frame:gpuFrame,deleted:false};fences.push(fence);return fence;},
  clientWaitSync:fence=>!stalled&&fence.frame<gpuFrame?gl.ALREADY_SIGNALED:gl.TIMEOUT_EXPIRED,
  deleteSync(fence){if(fence)fence.deleted=true;},
  advanceGPU(){gpuFrame++;},stall(value){stalled=value;},
 });
}

/** One page ledger and store bound to one fake context. */
export function createLedger(m,{limitBytes=16*MiB,gl=createWaitGL(),store:storeOptions={}}={}){
 const budget=m.createResourceBudget({limitBytes,recentLimitBytes:0}),store=m.createChunkResourceStore({budget,...storeOptions});
 m.bindChunkResourceContext(gl,store);
 return{budget,store,gl,
  /** Leaves `leave` bytes free. */
  block:(leave=64)=>budget.reserve({category:'construction',bytes:budget.stats.availableBytes-leave,precision:'exact',label:'capture-chain blocker'}),
  textureBytes:()=>budget.stats.categories.texture?.bytes??0};
}

export const depthRecipe=resource=>({resource,priority:'visible',inputs:['input:'+resource],budget:{sourceBytesUpperBound:512,submittedAllowanceBytes:128},build:()=>({vertex:'vertex '+resource,fragment:'fragment '+resource,attributes:['a_position']})});

/** Programs of one provider through a real owner. A demand counts as a held
 * wait (budgetWaiting) exactly when the owner answered it with a budget wait
 * whose wake it holds (owner.budgetWaits read before, then needsFrameAfter),
 * the ROOT convention every production provider follows. */
export function programPreparer(m,gl,owner,resources){
 const programs=new Map();let compiles=0;
 return{programs,get compiles(){return compiles;},
  prepare(budget){
   let ready=0,pending=0,failed=0,waiting=0;
   for(const resource of resources){
    if(programs.has(resource)){ready++;continue;}
    const before=owner.budgetWaits;
    try{const result=budget.compile(resource,'capture-chain-epoch',()=>{compiles++;return owner.compile(gl,depthRecipe(resource));});if(result.status==='pending'){pending++;continue;}programs.set(resource,result.value);ready++;}
    catch(error){if(!m.isProgramPreparationPending(error))throw error;pending++;if(!owner.needsFrameAfter(before))waiting++;}
   }
   return m.solarShadowPreparation(ready,pending,failed,waiting);
  },
  release(){for(const program of programs.values())owner.releaseProgram(gl,program);programs.clear();},
 };
}
