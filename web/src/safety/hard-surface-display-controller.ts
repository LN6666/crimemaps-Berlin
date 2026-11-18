import {REVIEWED_HARD_SURFACES} from './hard-surface-display-policy';
import {reserveEnvironmentCosts,environmentAdmissionError,EnvironmentResourcePendingError} from './environment-resource-budget';
import type {createGroundChunkTurnstile} from './ground-chunk-turnstile';
import type {ResourceBudget} from './render-runtime/resource-budget';
import type {createHardSurfaceDisplaySource,RegionalAsset} from './environment-hard-surface-source';
import type {createHardSurfaceDisplayTarget,CoverageBinding} from './environment-hard-surface-target';
type Frame=Readonly<{matrix:Float32Array;viewport:readonly[number,number,number,number];origin:readonly[number,number]}>;
type Expected={city:string;source_pbf_sha256:string;source_boundary_sha256:string;source_snapshot:string;original_nonself_source_index:RegionalAsset;original_green_root:RegionalAsset;membership_proof:RegionalAsset};
type Input={generation:string;root:RegionalAsset;expected:Expected;signal?:AbortSignal};
type Member={id:string;source_feature_sha256:string;geometry_sha256:string;surface:string;disposition:'displayed'|'partial-held'|'source-held';mesh?:RegionalAsset;vertices?:number;index_count?:number;canonical_native_tiles:readonly{path:string;sha256:string;uncompressed_sha256:string}[]};
type Catalog={schema:string;schema_version:number;city:string;source_pbf_sha256:string;source_boundary_sha256:string;source_snapshot:string;original_nonself_source_index:RegionalAsset;original_green_root:RegionalAsset;boundary:RegionalAsset;members:Member[];membership_proof:RegionalAsset;catalog_closed:true;original_green_held_preserved:true;origin:readonly[number,number]};
const SHA=/^[a-f0-9]{64}$/,need=(ok:unknown,message:string)=>{if(!ok)throw Error('Hard surface display: '+message);};
// Compare the pinned metadata without constructing two duplicate canonical
// JSON graphs. Only the source-owned records are retained by this controller.
function same(a:unknown,b:unknown,depth=0):boolean{
 if(a===b)return true;if(depth>40||!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a)){if(a.length!==(b as unknown[]).length)return false;for(let i=0;i<a.length;i++)if(!same(a[i],(b as unknown[])[i],depth+1))return false;return true;}
 let count=0;for(const key in a)if(Object.hasOwn(a,key)){count++;if(!Object.hasOwn(b,key)||!same((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],depth+1))return false;}
 for(const key in b)if(Object.hasOwn(b,key))count--;return count===0;
}
function checkCatalog(value:any,proof:any,expected:Expected):Catalog{
 need(value?.schema==='environment-hard-surface-display-catalog-v1'&&value.schema_version===1&&value.catalog_closed===true&&value.original_green_held_preserved===true,'Unclosed or foreign display catalog');
 for(const k of ['city','source_pbf_sha256','source_boundary_sha256','source_snapshot'] as const)need(value[k]===expected[k]&&proof?.[k]===expected[k],'Original source generation differs');
 need(proof?.schema==='environment-hard-surface-display-membership-proof-v1'&&proof.schema_version===1&&proof.original_source_held===true&&proof.original_green_held_preserved===true,'Foreign display membership proof');
 for(const k of ['original_nonself_source_index','original_green_root'] as const)need(same(value[k],expected[k])&&same(proof[k],expected[k]),'Original nonself/native/green authority differs');
 need(same(value.membership_proof,expected.membership_proof)&&same(proof.members,value.members),'Display member proof differs');
 need(value.boundary?.sha256===expected.source_boundary_sha256&&Array.isArray(value.origin)&&value.origin.length===2&&value.origin.every(Number.isFinite),'Original municipality/origin absent');
 const original=REVIEWED_HARD_SURFACES.filter(r=>r.city===expected.city&&r.decision==='declared-paving-ground').sort((a,b)=>a.id.localeCompare(b.id));
 need(Array.isArray(value.members)&&value.members.length===original.length&&original.length>0&&original.length<=12,'Display catalog is not the complete city12-subset');
 for(let i=0;i<original.length;i++){
  const r=original[i],m=value.members[i];need(m&&m.id===r.id&&m.source_feature_sha256===r.sourceFeatureSHA256&&m.geometry_sha256===r.geometrySHA256&&m.surface===r.tags.surface,'Original display member/version/geometry/surface differs');
  need(['displayed','partial-held','source-held'].includes(m.disposition)&&Array.isArray(m.canonical_native_tiles)&&m.canonical_native_tiles.length>0&&m.canonical_native_tiles.length<=32,'Original native occurrence absent');
  for(const t of m.canonical_native_tiles)need(typeof t.path==='string'&&t.path.startsWith('/safety/environment/'+expected.city+'/')&&SHA.test(t.sha256)&&SHA.test(t.uncompressed_sha256),'Invalid original native occurrence identity');
  if(m.disposition==='source-held')need(m.mesh===undefined,'Held-only member exposes a mesh');else need(m.mesh&&Number.isSafeInteger(m.vertices)&&m.vertices>=3&&m.vertices<=20000&&Number.isSafeInteger(m.index_count)&&m.index_count>=3&&m.index_count<=60000&&m.index_count%3===0,'Pre-read canonical geometry admission bound absent');
 }
 return value;
}
/** Catalog and one actual decoded source lease at a time. Renderer exclusively
 * owns step; source ownership moves to target only after successful enqueue. */
export function createHardSurfaceDisplayController(options:{source:ReturnType<typeof createHardSurfaceDisplaySource>;target:ReturnType<typeof createHardSurfaceDisplayTarget>;budget:ResourceBudget;gate:ReturnType<typeof createGroundChunkTurnstile>;requestFrame:()=>void;onState?:()=>void}){
 // At most the published and pending generations, each with <=12 members.
 const metadataClaim=reserveEnvironmentCosts(options.budget,[{category:'metadata',bytes:8192,precision:'estimate',identity:{},label:'hard surface controller generations and disposition ranges'}],'hard surface controller metadata');
 const {source,target,gate,requestFrame}=options,origins=new Map<string,{origin:readonly[number,number];matrix:Float32Array;viewport:readonly[number,number,number,number]}>(),dispositions=new Map<string,ReadonlyMap<string,Member['disposition']>>();let work:any,destroyed=false,running=0,pendingAcks=0;
 const releaseMetadataWhenIdle=()=>{if(destroyed&&running===0&&pendingAcks===0)metadataClaim.release();};
 const abort=()=>new DOMException('Hard surface display cancelled','AbortError');
 const pulse=(w:any)=>{for(const f of [...w.waiters] as (()=>void)[])f();options.onState?.();};
 const alive=(w:any)=>{if(destroyed||work!==w||w.abort.signal.aborted)throw w.error??abort();};
 function wait(w:any,predicate:()=>boolean):Promise<void>{alive(w);if(predicate())return Promise.resolve();return new Promise((resolve,reject)=>{const check=()=>{try{alive(w);if(!predicate())return;cleanup();resolve();}catch(error){cleanup();reject(error);}},cleanup=()=>{w.waiters.delete(check);w.abort.signal.removeEventListener('abort',check);};w.waiters.add(check);w.abort.signal.addEventListener('abort',check,{once:true});check();});}
 function cancel(){const w=work;if(!w)return;work=undefined;w.abort.abort();target.cancel('Hard display controller cancelled');pulse(w);}
 async function run(w:any){
  let rootBorrow:Awaited<ReturnType<typeof source.metadata>>|undefined,proofBorrow:Awaited<ReturnType<typeof source.metadata>>|undefined;
  try{requestFrame();await wait(w,()=>w.begun&&target.stats.pendingGeneration===w.input.generation&&target.stats.state==='building');alive(w);
   rootBorrow=await source.metadata(w.input.root,w.abort.signal);proofBorrow=await source.metadata(w.input.expected.membership_proof,w.abort.signal);const catalog=checkCatalog(rootBorrow.value,proofBorrow.value,w.input.expected),held=catalog.members.filter(m=>m.disposition!=='displayed').length;dispositions.set(w.input.generation,new Map(catalog.members.map(m=>[m.id,m.disposition])));let chunks=0;
   for(const member of catalog.members){alive(w);if(!member.mesh)continue;const e=w.input.expected,retryGate=await gate.createBudgetRetry('hard',w.abort.signal);
    try{alive(w);for(;;){
     // A single permit spans verified decode, upload and the real fence ACK.
     const permit=await gate.acquire('hard',w.abort.signal);let held:Awaited<ReturnType<typeof source.decoded>>|undefined,submitted=false,retry=false,retired=false,ackPending=false,pending:Promise<void>|undefined;
     try{
      alive(w);held=await source.decoded({asset:member.mesh,expected:{city:e.city,sourceSHA256:e.source_pbf_sha256,boundarySHA256:e.source_boundary_sha256,snapshot:e.source_snapshot,canonicalNativeTiles:member.canonical_native_tiles,sourceFeatureCount:1,sourceID:member.id,sourceFeatureSHA256:member.source_feature_sha256,geometrySHA256:member.geometry_sha256,surface:member.surface},sourceFeatureIds:[member.id],vertices:member.vertices!,indexCount:member.index_count!},w.abort.signal);alive(w);
      const borrow=held,mesh=borrow.value.mesh;need(mesh.origin[0]===catalog.origin[0]&&mesh.origin[1]===catalog.origin[1],'Mesh origin differs from catalog');
      const binding:CoverageBinding={city:e.city,sourceSHA256:e.source_pbf_sha256,boundarySHA256:e.source_boundary_sha256,snapshot:e.source_snapshot,origin:mesh.origin};
      const release=()=>{try{borrow.release();}finally{try{permit.release();}finally{retired=true;if(ackPending){ackPending=false;pendingAcks--;releaseMetadataWhenIdle();}pulse(w);}}};
      gate.assertCanEverFitChunk(mesh.positions.byteLength+mesh.indices.byteLength);
      if(target.enqueue({ordinal:chunks,key:member.id,binding,decoded:mesh,release})){
       submitted=true;ackPending=true;pendingAcks++;try{borrow.transferOwnership();}catch(error){target.cancel('Hard display lease transfer failed');throw error;}
       requestFrame();await wait(w,()=>retired);alive(w);chunks++;break;
      }
      retry=true;
     }catch(error){
      if(!submitted&&!w.abort.signal.aborted&&environmentAdmissionError(error,'hard surface decoded chunk') instanceof EnvironmentResourcePendingError)retry=true;else throw error;
     }finally{if(!submitted){const cleanup=()=>{try{held?.release();}finally{permit.release();}};if(retry)pending=retryGate.afterRelease(cleanup);else cleanup();}}
     if(pending)await pending;
    }}finally{retryGate.release();}
   }
   w.awaitingPublication=true;target.finish({closed:true,streamId:w.input.root.sha256,sourceDisplayProofSHA256:w.input.expected.membership_proof.sha256,chunkCount:chunks,status:held?'partial-source-held':'complete',coverageComplete:held===0,sourceHeldHardSurface:held});requestFrame();await wait(w,()=>target.stats.generation===w.input.generation);alive(w);
   return {status:held?'partial-display-held':'display-complete',displayComplete:held===0,sourceHeldHardSurface:held,originalGreenHeldPreserved:true,chunkCount:chunks,rootSHA256:w.input.root.sha256};
  }catch(error){if(work===w)target.cancel('Hard display controller failed');throw error;}finally{proofBorrow?.release();rootBorrow?.release();if(work===w){work=undefined;pulse(w);}}
 }
 return {start(input:Input){if(destroyed)return Promise.reject(abort());cancel();const w={input,abort:new AbortController(),begun:false,awaitingPublication:false,wake:0,steppedWake:-1,waiters:new Set<()=>void>(),error:undefined as unknown};work=w;const onAbort=()=>{if(work===w)cancel();};if(input.signal?.aborted)onAbort();else input.signal?.addEventListener('abort',onAbort,{once:true});running++;return run(w).finally(()=>{input.signal?.removeEventListener('abort',onAbort);running--;releaseMetadataWhenIdle();});},
  step(frame:Frame,time?:number){const w=work;try{if(w&&!w.begun){alive(w);const e=w.input.expected,binding:CoverageBinding={city:e.city,sourceSHA256:e.source_pbf_sha256,boundarySHA256:e.source_boundary_sha256,snapshot:e.source_snapshot,origin:frame.origin};origins.set(w.input.generation,{origin:[...frame.origin],matrix:new Float32Array(frame.matrix),viewport:[...frame.viewport]});target.begin({generation:w.input.generation,streamId:w.input.root.sha256,sourceDisplayProofSHA256:e.membership_proof.sha256,binding,matrix:frame.matrix,viewport:frame.viewport});w.begun=true;}if(!w||target.stats.state!=='pending-budget'||w.wake>w.steppedWake)target.step(time);if(w){w.steppedWake=w.wake;pulse(w);}for(const key of origins.keys())if(key!==target.stats.generation&&key!==work?.input.generation){origins.delete(key);dispositions.delete(key);}}catch(error){if(w&&work===w){work=undefined;w.error=error;w.abort.abort();target.cancel(String(error));pulse(w);}throw error;}},
  notifyTargetChange(){if(work){work.wake++;pulse(work);}},cancel,destroy(){if(destroyed)return;cancel();destroyed=true;origins.clear();dispositions.clear();releaseMetadataWhenIdle();},originForGeneration(generation:string|undefined){return generation?origins.get(generation)?.origin:undefined;},captureMatchesGeneration(generation:string|undefined,matrix:ArrayLike<number>,viewport:ArrayLike<number>){const capture=generation?origins.get(generation):undefined;if(!capture||matrix.length!==16||viewport.length!==4)return false;for(let i=0;i<16;i++)if(capture.matrix[i]!==Math.fround(matrix[i]))return false;for(let i=0;i<4;i++)if(capture.viewport[i]!==viewport[i])return false;return true;},dispositionForGeneration(generation:string|undefined,id:string){return generation?dispositions.get(generation)?.get(id):undefined;},get stats(){const s=target.stats,w=work;return {active:!!w,needsFrame:!!w&&(!w.begun||s.currentChunk||s.retiring>0||w.awaitingPublication||s.state==='pending-budget'&&w.wake>w.steppedWake),generation:work?.input.generation,ownedLiveBytes:metadataClaim.active?metadataClaim.bytes:0,pendingAcks};}};
}
