import {inspectSharedDisplayCatalog,type SharedDisplayCatalog,type SharedDisplayEntry} from './environment-shared-display-catalog';
import {SHARED_DISPLAY_CONTRACT} from './environment-shared-display-contract.mjs';
import {streamRegionalGroundCohorts,type StreamExpectedBinding,type RegionalGroundStream,type Asset,type BBox} from './environment-ground-regional-stream.mjs';
import type {createRegionalGreenSource,RegionalSourceBorrow,RegionalDecodedValue,RegionalSharedDecodedValue} from './environment-regional-source';
import type {createGreenCoverageTarget,CoverageBinding} from './environment-green-coverage-target';
import {environmentAdmissionError,EnvironmentResourcePendingError} from './environment-resource-budget';
import type {createGroundChunkTurnstile} from './ground-chunk-turnstile';

type Frame=Readonly<{matrix:Float32Array;viewport:readonly[number,number,number,number];origin:readonly[number,number]}>;
type Input=Readonly<{generation:string;root:Asset;expected:StreamExpectedBinding;bounds:BBox;signal?:AbortSignal}>;
type Result=Readonly<{status:'complete'|'partial-source-held';coverageComplete:boolean;sourceHeldGreen:number;chunkCount:number;rootSHA256:string}>;
type Work={input:Input;abort:AbortController;begun:boolean;prepared:boolean;supplement?:SharedDisplayCatalog;supplementAsset?:Asset;supplementRelease?:()=>void;awaitingPublication:boolean;frame?:Frame;sequence:number;wake:number;steppedWake:number;error?:unknown;waiters:Set<()=>void>;iterator?:RegionalGroundStream};
const aborted=()=>new DOMException('Regional coverage cancelled','AbortError');

/** One verified cohort and one GPU retirement at a time. Rendering owns step;
 * there is no private animation loop, timer, or ACK before the actual fence. */
export function createEnvironmentRegionalController(options:{source:ReturnType<typeof createRegionalGreenSource>;target:ReturnType<typeof createGreenCoverageTarget>;gate:ReturnType<typeof createGroundChunkTurnstile>;requestFrame:()=>void;onState?:()=>void}){
 const {source,target,gate,requestFrame}=options;let current:Work|undefined,destroyed=false;
 const origins=new Map<string,readonly[number,number]>();
 function pulse(w:Work){for(const notify of [...w.waiters])notify();options.onState?.();}
 function alive(w:Work){if(destroyed||current!==w||w.abort.signal.aborted)throw w.error??aborted();}
 function wait(w:Work,predicate:()=>boolean):Promise<void>{
  alive(w);if(predicate())return Promise.resolve();
  return new Promise((resolve,reject)=>{const check=()=>{try{alive(w);if(!predicate())return;cleanup();resolve();}catch(e){cleanup();reject(e);}};
   const cleanup=()=>{w.waiters.delete(check);w.abort.signal.removeEventListener('abort',check);};
   w.waiters.add(check);w.abort.signal.addEventListener('abort',check,{once:true});check();});
 }
 function cancel(){const w=current;if(!w)return;current=undefined;w.abort.abort();target.cancel('regional controller cancelled');pulse(w);void w.iterator?.return().catch(()=>{});}
 async function prepareSupplement(w:Work){
  const root=await source.metadata(w.input.root,w.abort.signal);try{
   alive(w);const raw=root.value as {shared_display_catalog?:Asset};
   if(raw.shared_display_catalog){const held=await source.metadata(raw.shared_display_catalog,w.abort.signal);w.supplementRelease=held.release;
    alive(w);w.supplement=inspectSharedDisplayCatalog(held.value,w.input.expected);w.supplementAsset=held.identity;
   }
  }finally{root.release();}
  alive(w);w.prepared=true;
 }
 async function submitShared(w:Work,entry:SharedDisplayEntry,ordinal:number){
  const signal=w.abort.signal,retryGate=await gate.createBudgetRetry('green',signal);
  try{for(;;){alive(w);const permit=await gate.acquire('green',signal);let held:RegionalSourceBorrow<RegionalSharedDecodedValue>|undefined,submitted=false,retry=false,retired=false,pending:Promise<void>|undefined;
   try{held=await source.sharedDecoded({asset:entry.asset,trusted:entry.trusted},signal);alive(w);const borrow=held,mesh=borrow.value.mesh,e=w.input.expected;
    const binding:CoverageBinding={city:e.city,sourceSHA256:e.source_pbf_sha256,boundarySHA256:e.source_boundary_sha256,snapshot:e.source_snapshot,origin:mesh.origin};
    const release=()=>{try{borrow.release();}finally{try{permit.release();}finally{retired=true;pulse(w);}}};
    gate.assertCanEverFitChunk(mesh.positions.byteLength);
    if(target.enqueueSharedDisplay({ordinal,key:'shared:'+entry.city+':'+entry.id,binding,decoded:mesh,displayDomain:borrow.value.domain,release})){
     submitted=true;try{borrow.transferOwnership();}catch(error){target.cancel('Shared display transfer failed');throw error;}
     requestFrame();await wait(w,()=>retired);alive(w);return;
    }retry=true;
   }catch(error){if(!submitted&&!signal.aborted&&environmentAdmissionError(error,'shared display chunk') instanceof EnvironmentResourcePendingError)retry=true;else throw error;}
   finally{if(!submitted){const cleanup=()=>{try{held?.release();}finally{permit.release();}};if(retry)pending=retryGate.afterRelease(cleanup);else cleanup();}}
   if(pending)await pending;
  }}finally{retryGate.release();}
 }
 async function run(w:Work):Promise<Result>{
  const {input}=w;const signal=w.abort.signal;
  try{
   await prepareSupplement(w);requestFrame();await wait(w,()=>w.begun&&target.stats.pendingGeneration===input.generation&&target.stats.state==='building');alive(w);
   const iterator=w.iterator=streamRegionalGroundCohorts(input.root,input.expected,input.bounds,{signal,readMetadata:(asset,readSignal)=>source.metadata(asset,readSignal??signal)});
   for(;;){
    alive(w);const next=await iterator.next();alive(w);
    if(next.done){const closure=next.value;if(!closure?.closed)throw Error('Regional stream did not close');
     let chunkCount=closure.chunkCount;for(const entry of w.supplement?.entries??[])await submitShared(w,entry,chunkCount++);
     w.awaitingPublication=true;target.finish({closed:true,streamId:input.root.sha256,sourcePartitionProofSHA256:input.expected.source_partition_proof.sha256,chunkCount,displaySupplementCatalogSHA256:w.supplementAsset?.sha256,status:closure.status,coverageComplete:closure.coverageComplete,sourceHeldGreen:closure.sourceHeldGreen});
     requestFrame();await wait(w,()=>target.stats.generation===input.generation);alive(w);
     return {status:closure.status,coverageComplete:closure.coverageComplete,sourceHeldGreen:closure.sourceHeldGreen,chunkCount,rootSHA256:closure.root.sha256};
    }
    const item=next.value,c=item.cohort;if(!c.ground_far_mesh)throw Error('Regional cohort has no packed geometry');
    const b=item.binding,retryGate=await gate.createBudgetRetry('green',signal);
    try{alive(w);for(;;){
     const permit=await gate.acquire('green',signal);let held:RegionalSourceBorrow<RegionalDecodedValue>|undefined,submitted=false,retry=false,retired=false,pending:Promise<void>|undefined;
     try{
      alive(w);held=await source.decoded({asset:c.ground_far_mesh,expected:{city:b.city,sourceSHA256:b.source_pbf_sha256,boundarySHA256:b.source_boundary_sha256,snapshot:b.source_snapshot,canonicalGroundTiles:c.canonical_ground_tiles.map(t=>({path:t.path,sha256:t.sha256,uncompressed_sha256:t.uncompressed_sha256??t.sha256})),sourceFeatureCount:c.source_feature_ids.length},sourceFeatureIds:c.source_feature_ids,vertices:c.vertices,indexCount:c.index_count},signal);alive(w);
      const borrow=held,mesh=borrow.value.mesh,binding:CoverageBinding={city:b.city,sourceSHA256:b.source_pbf_sha256,boundarySHA256:b.source_boundary_sha256,snapshot:b.source_snapshot,origin:mesh.origin};
      const release=()=>{try{borrow.release();}finally{try{permit.release();}finally{retired=true;pulse(w);}}};
      gate.assertCanEverFitChunk(mesh.positions.byteLength+mesh.indices.byteLength);
      if(target.enqueue({ordinal:item.sequence,key:c.id,binding,decoded:mesh,release})){
       submitted=true;try{borrow.transferOwnership();}catch(error){target.cancel('Regional lease transfer failed');throw error;}
       requestFrame();await wait(w,()=>retired);alive(w);break;
      }
      retry=true;
     }catch(error){if(!submitted&&!signal.aborted&&environmentAdmissionError(error,'regional decoded chunk') instanceof EnvironmentResourcePendingError)retry=true;else throw error;}
     finally{if(!submitted){const cleanup=()=>{try{held?.release();}finally{permit.release();}};if(retry)pending=retryGate.afterRelease(cleanup);else cleanup();}}
     if(pending)await pending;
    }}finally{retryGate.release();}
   }
  }catch(error){if(current===w){target.cancel('regional controller failed');}throw error;}
  finally{w.supplement=undefined;w.supplementAsset=undefined;w.supplementRelease?.();w.supplementRelease=undefined;void w.iterator?.return().catch(()=>{});if(current===w){current=undefined;pulse(w);}}
 }
 function start(input:Input):Promise<Result>{
  if(destroyed)return Promise.reject(aborted());cancel();const w:Work={input,abort:new AbortController(),begun:false,prepared:false,awaitingPublication:false,sequence:0,wake:0,steppedWake:-1,waiters:new Set()};current=w;
  const onAbort=()=>{if(current===w)cancel();};if(input.signal?.aborted)onAbort();else input.signal?.addEventListener('abort',onAbort,{once:true});
  return run(w).finally(()=>input.signal?.removeEventListener('abort',onAbort));
 }
 function step(frame:Frame,time?:number){const w=current;try{
  if(w&&w.prepared&&!w.begun){alive(w);w.frame={matrix:new Float32Array(frame.matrix),viewport:[...frame.viewport],origin:[...frame.origin]};
   const e=w.input.expected,binding:CoverageBinding={city:e.city,sourceSHA256:e.source_pbf_sha256,boundarySHA256:e.source_boundary_sha256,snapshot:e.source_snapshot,origin:w.frame.origin};
   origins.set(w.input.generation,w.frame.origin);target.begin({generation:w.input.generation,streamId:w.input.root.sha256,sourcePartitionProofSHA256:e.source_partition_proof.sha256,binding,matrix:w.frame.matrix,viewport:w.frame.viewport,...(w.supplement&&w.supplementAsset?{displaySupplement:{contract:SHARED_DISPLAY_CONTRACT,catalogSHA256:w.supplementAsset.sha256,inputBundleSHA256:w.supplement.inputBundleSHA256}}:{})});w.begun=true;
  }
  if(!w||target.stats.state!=='pending-budget'||w.wake>w.steppedWake)target.step(time);if(w){w.sequence++;w.steppedWake=w.wake;pulse(w);}const published=target.stats.generation;
  for(const key of origins.keys())if(key!==published&&key!==current?.input.generation)origins.delete(key);
 }catch(error){if(w&&current===w){current=undefined;w.error=error;w.abort.abort();target.cancel(String(error));pulse(w);}throw error;}}
 return {start,step,notifyTargetChange(){if(current){current.wake++;pulse(current);}},cancel,destroy(){if(destroyed)return;cancel();destroyed=true;origins.clear();},originForGeneration(generation:string|undefined){return generation===undefined?undefined:origins.get(generation);},get stats(){const s=target.stats,w=current;return {active:!!w,needsFrame:!!w&&(w.prepared&&!w.begun||s.currentChunk||s.retiring>0||w.awaitingPublication||s.state==='pending-budget'&&w.wake>w.steppedWake),generation:current?.input.generation,physicalMemory:'unmeasured' as const};}};
}
