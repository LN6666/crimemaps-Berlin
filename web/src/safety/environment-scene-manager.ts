import {currentSolarShadowBoundary,solarShadowBoundaryCosts,solarShadowBoundaryIndexBytes,tryAdmitSolarShadowBoundary,SOLAR_BOUNDARY_INDEX_MODEL,type PreparedSolarBoundary} from './solar-shadow-admission';
import {createRegionalGreenSource,regionalReadFromVerifiedProduct} from './environment-regional-source';
import {createEnvironmentRegionalController} from './environment-regional-controller';
import {createHardSurfaceDisplaySource,hardSurfaceReadFromVerifiedProduct} from './environment-hard-surface-source';
import {createHardSurfaceDisplayController} from './hard-surface-display-controller';
import {hasHardSurfaceNativeCandidate,verifyHardSurfaceNativeFeature} from './hard-surface-native-proof';
import type {PlanarReflectionSource} from './planar-building-reflection';
import type {DisplayFrameClock} from './display-frame-clock';
import {defaultSceneEnvironment,checkedSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import {SCENE_QUALITY_PROFILES} from './scene-environment-quality';
import {viewportQueryBounds} from './three-dimensional-viewport';
import type {ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {getPageResourceBudget,ResourceBudgetExceededError,type ResourceBudget,type ResourceBudgetCost,type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {admitEnvironmentCosts,createEnvironmentAdmissionStats,createEnvironmentReadEnvelopes,environmentAdmissionError,environmentClaimBytes,environmentDecodedCost,environmentJsonReadCosts,environmentRecentFits,environmentResourceStore,environmentRetainedEstimate,environmentWaterProfileCost,reserveEnvironmentCosts,retryEnvironmentAdmission,waitForEnvironmentBudget,waitForEnvironmentLease,EnvironmentResourcePendingError,EnvironmentResourceUnfitError,ENVIRONMENT_CONSTRUCTION_MODEL,ENVIRONMENT_WATER_PROFILE_LABEL,type EnvironmentJsonDescriptor} from './environment-resource-budget';
import type {ResourceByteAcquireOptions,ResourceByteAdmittedClaim,ResourceByteEnvelope} from './resource-byte-transport';
import {environmentLeafReferenceBytes,environmentPublicationBound} from './environment-resource-publication';
import {inspectEnvironmentGroundMesh,environmentGroundMeshEncodedRetainedBytes,type ValidatedEnvironmentGroundMesh} from './environment-ground-mesh';
import {parseEnvironmentSource,ENVIRONMENT_LIMITS,type EnvironmentSource,type EnvironmentFeature,type EnvironmentBox} from './environment-scene-data';
type Asset=import('./environment-ground-regional.mjs').Asset;
type RegionalGroundReference={root:Asset;source_index:Asset;discovery:{stateSHA256:string;coverageSHA256:string};source_partition_proof:Asset;regional_implementation_sha256:string;exact_geometry_producer_sha256:string};
type Tile=Asset&{id:string;tile_key:string;bbox:EnvironmentBox;feature_count:number;kinds?:Partial<Record<'water'|'water_line'|'green'|'tree'|'tree_row',number>>};
type Manifest={schema_version:1;city:string;source_snapshot:string;source_pbf_sha256:string;city_boundary:Asset;tiles?:Tile[];ground_tiles?:Tile[];ground_far_mesh?:Asset;ground_regional?:RegionalGroundReference;hard_surface_display?:{root:Asset;membership_proof:Asset};index_type?:string;partitions?:(Asset&{id:string;bbox:EnvironmentBox})[]};
// Match the page's existing city-overview camera. Below the full-detail tier,
// only source green ground is read and published under the same leaf/byte caps.
const GROUND_MIN_ZOOM=10.5;
type MapSurface={getZoom():number;getPitch():number;getVerticalFieldOfView():number;getCanvas():{clientWidth:number;clientHeight:number};getBounds():{getWest():number;getSouth():number;getEast():number;getNorth():number};getCenter():{lng:number;lat:number};getLayer(id:string):unknown;addLayer(layer:unknown,before?:string):void;removeLayer(id:string):void;on(name:string,fn:()=>void):void;off(name:string,fn:()=>void):void;triggerRepaint():void};
const overlap=(a:EnvironmentBox,b:EnvironmentBox)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
/** Admission priority only: keep source geometry and all existing byte/count caps.
 * A long river's envelope centre may be remote while its near end is on screen.
 * Keep visible ground cover before dense point leaves, so a point budget cannot
 * remove the woodland/lawn beneath it. Existing 32-leaf and byte caps still apply. */
const environmentBoxDistance=(box:EnvironmentBox,centre:{lng:number;lat:number})=>Math.hypot(Math.max(box[0]-centre.lng,0,centre.lng-box[2])*Math.cos(centre.lat*Math.PI/180),Math.max(box[1]-centre.lat,0,centre.lat-box[3]));
const environmentTilePriority=(tile:Tile,ground:EnvironmentBox)=>!overlap(tile.bbox,ground)?3:[tile.kinds?.water,tile.kinds?.water_line].some(n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0)?0:typeof tile.kinds?.green==='number'&&Number.isSafeInteger(tile.kinds.green)&&tile.kinds.green>0?1:2;
// Only a complete, valid kind inventory can exclude a leaf without reading it.
// Older or incomplete metadata is read conservatively, then filtered by source kind.
const environmentTileMayHaveGround=(tile:Tile)=>{
 const counts=Object.entries(tile.kinds??{});
 if(!counts.length||counts.some(([kind,n])=>!['water','water_line','green','tree','tree_row'].includes(kind)||!Number.isSafeInteger(n)||n<0)||counts.reduce((sum,[,n])=>sum+n,0)!==tile.feature_count)return true;
 return (tile.kinds?.green??0)>0;
};
// Compare duplicate source identities without another JSON/string/Map copy.
// The unused ground publication Set allowance covers the in-place sort scratch.
function sameEnvironmentValue(a:unknown,b:unknown,depth=0):boolean{
 if(a===b)return true;if(depth>32||!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a)&&Array.isArray(b)){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!sameEnvironmentValue(a[i],b[i],depth+1))return false;return true;}
 let size=0;for(const key in a)if(Object.hasOwn(a,key)){size++;if(!Object.hasOwn(b,key)||!sameEnvironmentValue((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],depth+1))return false;}
 for(const key in b)if(Object.hasOwn(b,key))size--;return size===0;
}
function uniqueGreenFeatures(features:EnvironmentFeature[]){
 const green=features.filter(f=>f.properties.kind==='green');green.sort((a,b)=>a.id.localeCompare(b.id));let used=0;
 for(const feature of green){const previous=used?green[used-1]:undefined;if(previous?.id===feature.id){if(!sameEnvironmentValue(previous,feature))throw Error('Conflicting native environment green source identity');}else green[used++]=feature;}
 green.length=used;return green;
}

/** read: one asset read. With ensureRead the caller follows the page byte
 * transport's caller-admitted protocol: ensureRead(signal) readies the reader
 * holding nothing, and then every read carries the 4th argument
 * {admitted, envelope, keep} for the one claim this manager admitted for it,
 * envelope minted per read for the read's ceiling (min(1 MiB, asset.bytes) for a
 * descriptor). Without ensureRead reads keep the 3-argument form and the reader
 * admits its own envelope. */
export function installEnvironmentScene(options:{map:MapSurface;city:string;mobile?:boolean;read:(asset:string|Asset,signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions)=>Promise<unknown>;ensureRead?:(signal:AbortSignal)=>Promise<void>;beforeLayer:()=>string|undefined;reflectionSource?:PlanarReflectionSource;frameClock?:DisplayFrameClock;waterAdmission?:{boundarySHA256:string;origin:[number,number];sourcePbfSHA256:string;physicalTileSHA256:readonly string[]};resourceStore?:ChunkResourceStore}){
 const {map,city}=options;let reflectionSource=options.reflectionSource;let sceneEnvironment=defaultSceneEnvironment(options.mobile),ownerReducedMotion=false,offscreen=false,unsubscribeFrame:(()=>void)|undefined;const cityNames:Record<string,string>={berlin:'Berlin',bremen:'Bremen',hamburg:'Hamburg',munich:'München',cologne:'Köln',frankfurt:'Frankfurt am Main',dusseldorf:'Düsseldorf',essen:'Essen',dortmund:'Dortmund',hannover:'Hannover',nuremberg:'Nürnberg',stuttgart:'Stuttgart',dresden:'Dresden',leipzig:'Leipzig'};if(!cityNames[city])throw Error('Environment outside supported municipalities');let mode=false,visible=true,destroyed=false,suspended=false,revision=0,request=new AbortController(),manifest:Manifest|undefined,cityOrigin:[number,number]|undefined,cityBoundary:PreparedSolarBoundary|undefined,renderer:ReturnType<typeof import('./environment-scene-renderer').createEnvironmentSceneRenderer>|undefined;
 // Decoded leaves are values of the ONE page ChunkResourceStore. This manager
 // keeps role leases only: 'source' while a refresh needs a leaf, a revocable
 // 'cache' lease for warm reuse, plus scalar accounting. The manifest and the
 // metadata pages carry page-budget claims admitted before their reads.
 const resources=environmentResourceStore(options.mobile,options.resourceStore),admission=createEnvironmentAdmissionStats('environment-scene',()=>committedBytes(),()=>inFlightProductions());
 // Caller-admitted reads: ONE claim per read carries the read working set and
 // the read's minted envelope; the transport shrinks it in place at delivery.
 const callerAdmitted=typeof options.ensureRead==='function',envelopes=createEnvironmentReadEnvelopes();
 // The decoded water-admission profile stays in these options until destroy. Its
 // retained value is charged as environmentWaterProfileCost(profile), under the
 // profile's own identity, so a caller that lists that same cost is counted once.
 // The product caller shrinks its read claim in place to exactly that cost,
 // installs, and only then releases its claim: this reservation then adds no
 // byte, even on a full ledger, and no availability wave runs between its read
 // and this take-over. A caller that released first may lose the bytes to a
 // reserver inside that release's wave; then the first active refresh admits the
 // profile before any other claim of this manager exists, so its wait holds
 // nothing, and a profile larger than the page limit is reported unfit there;
 // until then the decoded profile is uncharged.
 const waterProfile=options.waterAdmission,waterProfileLabel=ENVIRONMENT_WATER_PROFILE_LABEL,waterProfileCosts:ResourceBudgetCost[]=waterProfile!==null&&typeof waterProfile==='object'?[environmentWaterProfileCost(waterProfile)]:[];
 let waterProfileClaim:ResourceBudgetReservation|undefined;
 if(waterProfileCosts.length)try{waterProfileClaim=reserveEnvironmentCosts(resources.budget,waterProfileCosts,waterProfileLabel);}catch(error){if(!environmentAdmissionError(error,waterProfileLabel))throw error;}
 // charge = the decoded leaf's whole page claim: retained estimate plus the
 // publication reference slots that may point at its features.
 type LeafValue={source:EnvironmentSource;hardVerified:EnvironmentFeature[];retained:number;bytes:number;charge:number};type LeafLease=ChunkResourceLease<LeafValue>;
 type GroundMeshValue={mesh:ValidatedEnvironmentGroundMesh;retained:number;bytes:number};type GroundMeshLease=ChunkResourceLease<GroundMeshValue>;
 let regionalSource:ReturnType<typeof createRegionalGreenSource>|undefined,regional:ReturnType<typeof createEnvironmentRegionalController>|undefined;
 type RegionalResult=Awaited<ReturnType<ReturnType<typeof createEnvironmentRegionalController>['start']>>;
 let regionalResult:RegionalResult|undefined,regionalError:string|undefined,regionalPendingTicket:number|undefined,regionalDeferredTicket:number|undefined;
 let hardSource:ReturnType<typeof createHardSurfaceDisplaySource>|undefined,hardController:ReturnType<typeof createHardSurfaceDisplayController>|undefined;
 type HardResult=Awaited<ReturnType<ReturnType<typeof createHardSurfaceDisplayController>['start']>>;
 let hardResult:HardResult|undefined,hardError:string|undefined,hardPendingTicket:number|undefined;
 let meshDemand:{key:string;lease:GroundMeshLease;ticket:number}|undefined,meshPublished:{key:string;lease:GroundMeshLease}|undefined,meshLoads=0;
 const metadata=new Map<string,{tiles:Tile[];rawBytes:number;claim:ResourceBudgetReservation}>();let metadataBytes=0,manifestClaim:ResourceBudgetReservation|undefined,selectionClaim:ResourceBudgetReservation|undefined;
 const warm=new Map<string,{key:string;lease:LeafLease;bytes:number;retained:number}>();
 let demand=new Map<string,{lease:LeafLease;ticket:number}>(),demandDetail:'ground'|'full'|undefined,handoff=new Map<string,LeafLease>(),handoffDetail:'ground'|'full'|undefined;
 let loads=0,warmSkipped=0,hardProofCandidates=0,hardProofVerified=0,hardProofRefused=0,partial=false,state='idle';let lastError:string|undefined;
 // Only bounded published leaf identities and actual setFeatures inputs are
 // retained here, never a second reference graph of decoded source features.
 let publishedDetail:'ground'|'full'|undefined,publishedGeometryKey:string|undefined,publishedGroundSource:'exact-source-overview'|'native-tiles'|'packed-source-mesh'|'regional-source-coverage'|undefined;
 let groundSelection:{route:'overview'|'native'|'mesh';reason:string;nativeClosureComplete:boolean;candidateLeaves:number;selectedLeaves:number;rawBytes:number}|undefined;
 const detail=()=>map.getZoom()>=15?'full' as const:'ground' as const;
 const active=()=>mode&&visible&&!offscreen&&!destroyed&&!suspended&&Number.isFinite(map.getZoom())&&map.getZoom()>=GROUND_MIN_ZOOM;
 const asset=(v:Asset)=>v&&/^\/safety\/environment\/[a-z-]+\/[A-Za-z0-9_.-]+$/.test(v.path)&&/^[a-f0-9]{64}$/.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=1024**2&&(v.compression===undefined||v.compression==='gzip'&&Number.isSafeInteger(v.uncompressed_bytes)&&v.uncompressed_bytes!>0&&v.uncompressed_bytes!<=1024**2);
 const bounds=():EnvironmentBox=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];};
 function syncFrameClock(){unsubscribeFrame?.();unsubscribeFrame=undefined;if(renderer&&options.frameClock)unsubscribeFrame=options.frameClock.subscribe({fps:SCENE_QUALITY_PROFILES.economy.environmentFPS,active:()=>Boolean(renderer?.stats.animationActive)&&active(),frame:now=>renderer?.animationFrame(now).changed??false});options.frameClock?.wake();}
 // A render failure follows stop()'s exit for leaves no refresh owns any more:
 // the aborted refresh releases its own demand, the unadopted handoff goes now.
 function renderFailed(error:unknown){request.abort();regional?.cancel();hardController?.cancel();revision++;releaseMeshDemand();releaseHandoff();renderer?.setEnabled(false);state='error';lastError=(error instanceof Error?error.message:String(error)).slice(0,2048);}
 function stop(){request.abort();regional?.cancel();hardController?.cancel();revision++;releaseMeshDemand();renderer?.setEnabled(false);options.frameClock?.wake();state='idle';releaseHandoff();}
 // Explicit 2D and completed 3D overview own teardown; visibility and context pauses keep resumable resources.
 function releaseEnvironmentResources(){
  regional?.destroy();regional=undefined;regionalSource?.destroy();regionalSource=undefined;regionalResult=undefined;regionalError=undefined;regionalPendingTicket=undefined;regionalDeferredTicket=undefined;
  hardController?.destroy();hardController=undefined;hardSource?.destroy();hardSource=undefined;hardResult=undefined;hardError=undefined;hardPendingTicket=undefined;
  const oldRenderer=renderer;renderer=undefined;publishedDetail=undefined;publishedGeometryKey=undefined;publishedGroundSource=undefined;groundSelection=undefined;
  unsubscribeFrame?.();unsubscribeFrame=undefined;
  releaseMeshDemand();releaseDemand();releaseHandoff();for(const row of warm.values())row.lease.release();warm.clear();
  for(const hit of metadata.values())hit.claim.release();metadata.clear();metadataBytes=0;manifestClaim?.release();manifestClaim=undefined;selectionClaim?.release();selectionClaim=undefined;admission.reset();
  manifest=undefined;cityOrigin=undefined;cityBoundary=undefined;partial=false;
  try{if(oldRenderer){try{if(map.getLayer(oldRenderer.layer.id))map.removeLayer(oldRenderer.layer.id);}finally{oldRenderer.destroy();}}}finally{replacePublishedMesh(undefined);}
 }
 function releaseMeshDemand(ticket?:number){const row=meshDemand;if(row&&(ticket===undefined||row.ticket===ticket)){meshDemand=undefined;row.lease.release();}}
 function replacePublishedMesh(next:typeof meshPublished){const old=meshPublished;meshPublished=next;if(old&&old.lease!==next?.lease)old.lease.release();}
 function releaseHandoff(){for(const lease of handoff.values())lease.release();handoff.clear();handoffDetail=undefined;}
 function releaseDemand(ticket?:number){for(const [key,row]of [...demand])if(ticket===undefined||row.ticket===ticket){demand.delete(key);row.lease.release();}}
 /** A same-tier successor keeps loaded and in-flight leaves until its chosen
  * set is known, then cancels only the difference. A tier change or teardown
  * cancels the old demand immediately. Old refreshes never release leases they
  * no longer own. */
 function takeDemand(next:'ground'|'full'){
  if(handoffDetail!==undefined&&handoffDetail!==next)releaseHandoff();
  const previous=demand,previousDetail=demandDetail;demand=new Map();demandDetail=next;
  for(const [key,row]of previous){if(previousDetail===next&&!handoff.has(key)){handoff.set(key,row.lease);handoffDetail=next;}else row.lease.release();}
 }
 function adoptHandoff(keys:ReadonlySet<string>,ticket:number){
  for(const [key,lease]of handoff){if(keys.has(key)&&!demand.has(key)&&!lease.released)demand.set(key,{lease,ticket});else lease.release();}
  handoff.clear();handoffDetail=undefined;
 }
 // Content identity: physical/inflated leaf and the source binding it is
 // validated against. Viewport, camera, request generation are never part of it.
 const leafKey=(m:Manifest,t:Tile)=>JSON.stringify(['environment-leaf-v1',city,t.sha256,t.bytes,t.compression??null,t.uncompressed_bytes??null,t.uncompressed_sha256??null,t.feature_count,m.source_pbf_sha256,m.city_boundary.sha256,m.source_snapshot]);
 const readDescriptor=(v:Partial<Asset>|undefined):EnvironmentJsonDescriptor=>v&&Number.isSafeInteger(v.bytes)&&v.bytes!>0&&v.bytes!<=1024**2&&(v.compression===undefined||v.compression==='gzip'&&Number.isSafeInteger(v.uncompressed_bytes)&&v.uncompressed_bytes!>0&&v.uncompressed_bytes!<=1024**2)?{bytes:v.bytes!,compression:v.compression,uncompressed_bytes:v.uncompressed_bytes}:{bytes:1024**2};
 /** Synchronous admission keeps the original read order; only a Pending
  * refusal falls back to the event-driven wait. */
 function admitNow(costs:ResourceBudgetCost[],label:string):ResourceBudgetReservation|undefined{
  try{return reserveEnvironmentCosts(resources.budget,costs,label);}
  catch(error){const refusal=environmentAdmissionError(error,label);if(refusal instanceof EnvironmentResourcePendingError)return undefined;if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit(label,refusal);throw refusal??error;}
 }
 /** ONE claim carries the whole bootstrap and is atomically replaced per step:
  * the manifest read+parse working set; then the retained manifest plus the
  * municipal boundary read+parse set; then the retained manifest, the parsed
  * boundary and the exact solar index, admitted before the index is built; and
  * finally the retained manifest plus that index for this 3D lifetime. A
  * caller-admitted read (see options.read) also lists its minted envelope on
  * this claim, so the read's whole working set is admitted once, before the
  * read starts; the transport shrinks the claim in place at delivery to what it
  * keeps plus the delivered bytes, and the next step replaces both. A step that
  * must grow and is refused releases everything the attempt holds, and its
  * bytes (a read step's envelope included) become the learned peak. Until an
  * attempt commits, each of its steps then holds max(its own bytes, the peak):
  * the first step admits that much (its own envelope on top) before the
  * manifest read, and what a smaller step would give back stays with the
  * attempt as headroom, so no step up to a refused one grows again. A delivery
  * keeps that headroom and, while a peak is held, the envelope beyond the
  * delivered bytes, so what the delivery frees is never what a later step
  * needs. Only a step above every peak learned so far can grow, and be
  * refused, again: each growing step restarts the bootstrap at most once. The
  * final step drops the headroom; success clears the peak. None of the
  * manager's own ledger waits holds a bootstrap claim, and a caller-admitted
  * reader admits and waits for nothing beside it: ensureRead readied the
  * reader before this claim existed. */
 let bootstrapPeak=0,bootstrapRestarts=0;
 /** `costs` plus construction headroom up to the learned peak; `covered` is the
  * whole step, including an index placeholder this claim hands to the module. */
 function withPeakHeadroom(costs:readonly ResourceBudgetCost[],covered=environmentClaimBytes(costs)):ResourceBudgetCost[]{
  const bytes=bootstrapPeak-covered;
  return bytes>0?[...costs,{category:'construction',bytes,precision:'estimate',identity:{},label:'environment bootstrap headroom up to the peak learned from a refused step'}]:[...costs];
 }
 /** Adjusts the bootstrap claim to one step: `costs`, a read step's minted
  * envelope, and headroom up to the learned peak (none in the final step).
  * Returns what the claim keeps beside the read's delivered bytes, or undefined
  * when the step was refused and the attempt restarts. */
 function bootstrapStep(claim:ResourceBudgetReservation,costs:readonly ResourceBudgetCost[],label:string,final=false,read?:Readonly<{envelope:ResourceByteEnvelope;deliverable:number}>):readonly ResourceBudgetCost[]|undefined{
  const step=read?[...costs,...read.envelope]:[...costs],target=final?step:withPeakHeadroom(step);
  if(claim.adjust(target)){
   if(!read)return target;
   const keep=target.filter(cost=>!read.envelope.includes(cost)),beyond=environmentClaimBytes(read.envelope)-read.deliverable;
   if(bootstrapPeak>0&&beyond>0)keep.push({category:'construction',bytes:beyond,precision:'estimate',identity:{},label:'environment bootstrap headroom: the read envelope beyond its delivered bytes, kept to the next step'});
   return keep;
  }
  const required=environmentClaimBytes(step),limit=resources.budget.stats.limitBytes;
  if(required>limit){const error=new EnvironmentResourceUnfitError(label,required,limit,false);admission.unfit(label,error);throw error;}
  bootstrapPeak=Math.max(bootstrapPeak,required);bootstrapRestarts++;return undefined;
 }
 /** Free plus reclaimable bytes (pressure evicts the recent cache) can hold `bytes`. */
 const moduleRoom=(budget:ResourceBudget,bytes:number)=>{const stats=budget.stats;return stats.availableBytes+stats.recentBytes>=bytes;};
 /** One wait, holding nothing, for a separate module ledger to have room for
  * `bytes`: one registration, one deferred check per wake-up wave, a wave that
  * cannot hold it keeps waiting. No timer, polling or deadline. */
 function waitForModuleRoom(budget:ResourceBudget,bytes:number,signal:AbortSignal):Promise<void>{
  return new Promise<void>((resolve,reject)=>{
   const reason=()=>signal.reason??new DOMException('Aborted','AbortError');
   if(signal.aborted){reject(reason());return;}
   let done=false,queued=false,off:(()=>void)|undefined;
   const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);const stop=off;off=undefined;stop?.();if(error===undefined)resolve();else reject(error);};
   const abort=()=>finish(reason());
   signal.addEventListener('abort',abort,{once:true});
   off=budget.onAvailable(()=>{if(done||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!done&&moduleRoom(budget,bytes))finish();});},signal);
  });
 }
 type AdmittedRead=Readonly<{envelope:ResourceByteEnvelope;max:number}>;
 /** One read on `claim`: caller-admitted with its envelope, which the claim lists
  * beside keep, or the 3-argument form. */
 function readOn(asset:string|Asset,signal:AbortSignal,claim:ResourceByteAdmittedClaim,read:AdmittedRead|undefined,keep:readonly ResourceBudgetCost[]){
  return read?options.read(asset,signal,read.max,{admitted:claim,envelope:read.envelope,keep}):options.read(asset,signal,1024**2);
 }
 /** A failed caller-admitted read: returns when it may be retried, holding
  * nothing, with the larger envelope its refused delivery named (minted from now
  * on); otherwise throws the failure (an unfit one is counted). */
 function retryRefusedRead(path:string,label:string,error:unknown,signal:AbortSignal){
  if(signal.aborted)throw error;
  const failed=envelopes.failure(path,label,error);if(failed.retry)return;
  if(failed.error instanceof EnvironmentResourceUnfitError)admission.unfit(label,failed.error);
  throw failed.error;
 }
 /** Bounded refresh selection containers (pointer slots, never heap
  * measurements): a filtered copy grows like a pushed array and its sort may
  * hold one scratch slot per element. They are charged with the retained
  * metadata that bounds them, never admitted per refresh, so a refresh (the
  * unchanged warm view after a visibility, offscreen or resume pause included)
  * adds no wait point and no availability wave:
  * - the partition selection (a filtered, sorted partition list and the
  *   selected pages' tile lists) with the retained manifest;
  * - each metadata page's share of a tile selection (its descriptors copied
  *   into one list, then filtered and sorted) with that page's retained claim;
  * - an unpartitioned manifest's tile selection (filtered and sorted) and the
  *   chosen list (at most 32 leaves, used through publication) on a selection
  *   claim split off the committed bootstrap claim (see bootstrap). */
 const slot=ENVIRONMENT_CONSTRUCTION_MODEL.numberSlotBytes,pushedSlotBytes=(n:number)=>Math.ceil(n*slot*ENVIRONMENT_CONSTRUCTION_MODEL.arrayGrowthPeakFactor),sortedSlotBytes=(n:number)=>pushedSlotBytes(n)+n*slot;
 const partitionSelectionCosts=(m:Manifest):ResourceBudgetCost[]=>m.index_type==='viewport-partitioned-v1'&&m.partitions?.length?[{category:'metadata',bytes:sortedSlotBytes(m.partitions.length)+pushedSlotBytes(m.partitions.length),precision:'estimate',identity:{},label:'environment partition selection slots (filtered and sorted partitions, selected page lists)'}]:[];
 // The manifest claim includes the actual additive descriptor objects. Only
 // one native/overview selection is built at a time, so charge their maximum.
 const tileSelectionCosts=(m:Manifest):ResourceBudgetCost[]=>[{category:'metadata',bytes:sortedSlotBytes(Math.max(m.index_type==='viewport-partitioned-v1'?0:(m.tiles??[]).length,m.ground_tiles?.length??0))+pushedSlotBytes(32),precision:'estimate',identity:{},label:'environment tile selection slots (native or overview filtered and sorted tiles, chosen leaves)'}];
 const pageSelectionCost=(tiles:readonly Tile[]):ResourceBudgetCost=>({category:'metadata',bytes:pushedSlotBytes(tiles.length)+sortedSlotBytes(tiles.length),precision:'estimate',identity:{},label:'environment page tile selection slots (descriptor list, filtered and sorted candidates)'});
 async function bootstrap(signal:AbortSignal,current:()=>void):Promise<Manifest>{
  // The shared module's cache is module-global and admits on the page ledger,
  // which is this manager's ledger on the product page (its page store). The
  // admitted index bytes are handed to the module atomically: a reservation of
  // the same cost objects on the module's ledger (on one ledger it adds no byte
  // beside this claim) becomes the module's claim in place
  // (tryAdmitSolarShadowBoundary), after this claim dropped them, keeping its
  // headroom. Nothing is given back, so no availability wave runs, and no other
  // reserver can take the bytes, before the index exists. On a separate ledger
  // that reservation may be refused: then the attempt restarts and first waits,
  // holding nothing, for room for the index on the module's ledger (an index
  // larger than that whole ledger is reported unfit instead). Free bytes are
  // checked once in the same turn as the refusal, before that registration;
  // reclaimable bytes count from the next wave on, as the refused reservation
  // has just run the pressure callbacks without reclaiming enough.
  const moduleBudget=getPageResourceBudget(),sameLedger=moduleBudget===resources.budget;let moduleRefusal:EnvironmentResourcePendingError|undefined;
  for(;;){
   current();
   if(moduleRefusal){const phase='environment solar boundary index',refusal=moduleRefusal;moduleRefusal=undefined;if(moduleBudget.stats.availableBytes<refusal.requiredBytes){admission.pending(phase,refusal);try{await waitForModuleRoom(moduleBudget,refusal.requiredBytes,signal);}finally{admission.settled(phase);}current();}}
   const manifestPath='/safety/environment/'+city+'/index.json',manifestRead=environmentJsonReadCosts({bytes:1024**2},'environment manifest'),retry=bootstrapPeak>environmentClaimBytes(manifestRead);
   // A caller-admitted read lists its envelope on top of the read set and its
   // headroom; the delivered claim keeps both, so it still holds the peak.
   const manifestKeep=withPeakHeadroom(manifestRead),manifestAdmitted=callerAdmitted?{envelope:envelopes.mint(manifestPath,1024**2),max:1024**2}:undefined;
   const costs=manifestAdmitted?[...manifestKeep,...manifestAdmitted.envelope]:manifestKeep,label=retry?'environment bootstrap':'environment manifest';
   const claim=admitNow(costs,label)??await admitEnvironmentCosts(resources.budget,costs,label,signal,admission);let kept=false;
   try{
    let raw:Manifest;
    try{raw=await readOn(manifestPath,signal,claim,manifestAdmitted,manifestKeep) as Manifest;}
    catch(error){if(!manifestAdmitted)throw error;retryRefusedRead(manifestPath,'environment manifest',error,signal);bootstrapRestarts++;continue;}
    current();if(manifestAdmitted)envelopes.delivered(manifestPath);
    if(!raw||raw.schema_version!==1||raw.city!==city||!/^[a-f0-9]{64}$/.test(raw.source_pbf_sha256)||typeof raw.source_snapshot!=='string'||!raw.city_boundary||!/^[a-f0-9]{64}$/.test(raw.city_boundary.sha256)||(raw.index_type==='viewport-partitioned-v1'?(!Array.isArray(raw.partitions)||raw.partitions.length>2048):(!Array.isArray(raw.tiles)||raw.tiles.length>50000)))throw Error('Invalid native environment manifest');
    const ids=new Set();for(const t of raw.tiles??raw.partitions??[]){if(ids.has(t.id)||!asset(t)||!Array.isArray(t.bbox)||t.bbox.length!==4||!t.bbox.every(Number.isFinite)||('feature_count'in t&&!Number.isSafeInteger(t.feature_count)))throw Error('Invalid environment tile');ids.add(t.id);}
    if(raw.ground_tiles!==undefined){
     if(!Array.isArray(raw.ground_tiles)||!raw.ground_tiles.length||raw.ground_tiles.length>32)throw Error('Invalid environment ground overview tiles');
     let bytes=0;const groundIds=new Set<string>(),paths=new Set<string>();
     for(const t of raw.ground_tiles){
      if(t?.compression===undefined&&(t?.uncompressed_bytes!==undefined||t?.uncompressed_sha256!==undefined))throw Error('Invalid environment ground overview raw binding');
      if(!t||typeof t.id!=='string'||!t.id||groundIds.has(t.id)||paths.has(t.path)||!asset(t)||!t.path.startsWith('/safety/environment/'+city+'/')||t.compression==='gzip'&&!/^[a-f0-9]{64}$/.test(t.uncompressed_sha256??'')||!Array.isArray(t.bbox)||t.bbox.length!==4||!t.bbox.every(Number.isFinite)||t.bbox[0]>t.bbox[2]||t.bbox[1]>t.bbox[3]||Math.abs(t.bbox[0])>180||Math.abs(t.bbox[2])>180||Math.abs(t.bbox[1])>85||Math.abs(t.bbox[3])>85||!Number.isSafeInteger(t.feature_count)||t.feature_count<1||!t.kinds||t.kinds.green!==t.feature_count||Object.entries(t.kinds).some(([kind,n])=>kind!=='green'||!Number.isSafeInteger(n)||n<1))throw Error('Invalid environment ground overview tile');
      groundIds.add(t.id);paths.add(t.path);bytes+=t.uncompressed_bytes??t.bytes;
     }
     if(bytes>ENVIRONMENT_LIMITS.visibleBytes)throw Error('Environment ground overview raw budget exceeded');
    }
    if(raw.ground_far_mesh!==undefined){
     const mesh=raw.ground_far_mesh,total=(raw.ground_tiles??[]).reduce((sum,t)=>sum+(t.kinds?.green??0),0);
     if(!raw.ground_tiles?.length||!asset(mesh)||!mesh.path.startsWith('/safety/environment/'+city+'/')||
        mesh.compression==='gzip'&&!/^[a-f0-9]{64}$/.test(mesh.uncompressed_sha256??'')||
        mesh.compression===undefined&&(mesh.uncompressed_bytes!==undefined||mesh.uncompressed_sha256!==undefined)||
        !Number.isSafeInteger(total)||total<1||total>10000)throw Error('Invalid environment far ground mesh asset');
    }
    // The new manifest pins the immutable pre-adoption native index. It cannot
    // refer to its own new index SHA; adoption separately preserves that native
    // descriptor inventory and adds only this regional-source reference.
    if(raw.ground_regional!==undefined){
     const r=raw.ground_regional,hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),cityAsset=(v:Asset)=>asset(v)&&v.path.startsWith('/safety/environment/'+city+'/')&&(v.compression!=='gzip'||hash(v.uncompressed_sha256));
     if(!r||!cityAsset(r.root)||!cityAsset(r.source_index)||!cityAsset(r.source_partition_proof)||
        r.source_index.path!=='/safety/environment/'+city+'/index.json'||r.root.path===r.source_index.path||r.root.path===r.source_partition_proof.path||r.source_partition_proof.path===r.source_index.path||
        !r.discovery||!hash(r.discovery.stateSHA256)||!hash(r.discovery.coverageSHA256)||!hash(r.regional_implementation_sha256)||!hash(r.exact_geometry_producer_sha256))throw Error('Invalid environment regional ground reference');
    }
    if(raw.hard_surface_display!==undefined){
     const h=raw.hard_surface_display,g=raw.ground_regional,hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),cityAsset=(v:Asset)=>asset(v)&&v.path.startsWith('/safety/environment/'+city+'/')&&(v.compression!=='gzip'||hash(v.uncompressed_sha256))&&(v.compression!==undefined||v.uncompressed_bytes===undefined&&v.uncompressed_sha256===undefined);
     if(!h||!g||!cityAsset(h.root)||!cityAsset(h.membership_proof)||new Set([h.root.path,h.membership_proof.path,g.root.path,g.source_index.path]).size!==4)throw Error('Invalid hard surface display reference');
    }
    const manifestCost=environmentDecodedCost(environmentRetainedEstimate(raw),raw,'environment manifest','metadata'),manifestCosts=[manifestCost,...partitionSelectionCosts(raw)],boundaryDescriptor=readDescriptor(raw.city_boundary),boundaryCosts=environmentJsonReadCosts(boundaryDescriptor,'environment municipal boundary');
    const boundaryPath=String(raw.city_boundary.path),boundaryMax=Math.min(1024**2,boundaryDescriptor.bytes),boundaryAdmitted=callerAdmitted?{envelope:envelopes.mint(boundaryPath,boundaryMax),max:boundaryMax}:undefined;
    const boundaryKeep=bootstrapStep(claim,[...manifestCosts,...boundaryCosts],'environment municipal boundary',false,boundaryAdmitted&&{envelope:boundaryAdmitted.envelope,deliverable:envelopes.deliverable(boundaryPath,boundaryMax)});
    if(!boundaryKeep)continue;
    let boundary:any;
    try{boundary=await readOn(raw.city_boundary,signal,claim,boundaryAdmitted,boundaryKeep);}
    catch(error){if(!boundaryAdmitted)throw error;retryRefusedRead(boundaryPath,'environment municipal boundary',error,signal);bootstrapRestarts++;continue;}
    current();if(boundaryAdmitted)envelopes.delivered(boundaryPath);
    if(boundary.source_pbf_sha256!==raw.source_pbf_sha256||boundary.name!==cityNames[city]||boundary.within_expected_area!==true||!/^osm\/relation\/[1-9]\d*$/.test(boundary.id))throw Error('Environment source municipality binding mismatch');
    const g=boundary?.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))throw Error('Invalid environment municipal boundary');
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,count=0;const scan=(v:any)=>{if(!Array.isArray(v))throw Error('Invalid environment boundary coordinate');if(typeof v[0]==='number'){if(++count>200000||!v.every(Number.isFinite))throw Error('Environment boundary budget');x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1]);}else v.forEach(scan);};scan(g.coordinates);
    const origin:[number,number]=[(x0+x1)/2,(y0+y1)/2],value={boundarySHA256:raw.city_boundary.sha256,geometry:g};
    let prepared=currentSolarShadowBoundary(value.boundarySHA256);
    if(!prepared){
     // The parsed boundary stays charged at its decoded upper bound until the
     // index is built from it; the index is sized exactly before allocation.
     const parsed=boundaryCosts.find(cost=>cost.category==='decoded')!,index:ResourceBudgetCost[]=[{category:'shadow',bytes:solarShadowBoundaryIndexBytes(value),precision:'exact',identity:{},label:'environment solar boundary index (admitted before allocation)'},{category:'shadow',bytes:SOLAR_BOUNDARY_INDEX_MODEL.wrapperEstimateBytes,precision:'estimate',identity:{},label:'environment solar boundary index views (admitted before allocation)'}];
     const indexStep=[...manifestCosts,parsed,...index];
     if(!bootstrapStep(claim,indexStep,'environment solar boundary index'))continue;
     // Atomic hand-over, in order: split, this claim drops the two index costs,
     // hand-over, then the split is released (it changes no byte by then).
     const split=moduleBudget.tryReserve(index,{label:'environment solar boundary index hand-off'}); // the same cost objects: on one ledger deduplicated, adding no byte, never refused
     if(!split.ok){ // only on a separate ledger
      const need=environmentClaimBytes(index),limit=moduleBudget.stats.limitBytes;
      if(need>limit){const error=new EnvironmentResourceUnfitError('environment solar boundary index',need,limit,false);admission.unfit('environment solar boundary index',error);throw error;} // unfit: an explicit failure, never a wait
      bootstrapPeak=Math.max(bootstrapPeak,environmentClaimBytes(indexStep));bootstrapRestarts++;
      moduleRefusal=new EnvironmentResourcePendingError('environment solar boundary index',need,split.error.details);continue; // the finally below releases this claim; the next attempt waits on the module ledger holding nothing
     }
     try{
      if(sameLedger&&!claim.adjust(withPeakHeadroom([...manifestCosts,parsed],environmentClaimBytes(indexStep))))throw Error('Environment bootstrap claim could not drop the handed-off solar index costs');
      prepared=tryAdmitSolarShadowBoundary(value,{budget:moduleBudget,claim:split.reservation});
     }finally{split.reservation.release();} // after the hand-over: no byte changes
     current();
    }
    // Held while cityBoundary is held and returned with the manifest: the index
    // under the module's own identities, so it counts once with the module cache
    // claim and stays charged here if that cache drops it first. No headroom.
    // The final step also carries the tile selection slots; they are then split
    // off onto their own claim (the same cost objects: no byte changes, no wave),
    // so the manifest claim keeps exactly the manifest and its index.
    const retainedCosts=[...manifestCosts,...solarShadowBoundaryCosts(prepared)],selectionCosts=tileSelectionCosts(raw);
    if(!bootstrapStep(claim,[...retainedCosts,...selectionCosts],'environment solar boundary index',true))continue;
    const selection=resources.budget.tryReserve(selectionCosts,{label:'environment tile selection slots'});
    if(!selection.ok)throw Error('Environment tile selection slots could not be split off the bootstrap claim');
    if(!claim.adjust(retainedCosts)){selection.reservation.release();throw Error('Environment bootstrap claim could not drop the split-off tile selection slots');}
    cityOrigin=origin;cityBoundary=prepared;bootstrapPeak=0;manifestClaim?.release();manifestClaim=claim;selectionClaim?.release();selectionClaim=selection.reservation;manifest=raw;kept=true;return raw;
   }finally{if(!kept)claim.release();}
  }
 }
 function pruneWarm(){for(const [sha,row]of [...warm])if(row.lease.released||!row.lease.value)warm.delete(sha);}
 /** Warm reuse is a revocable page-store cache role inside the shared recent
  * subset (pressure/expiry may evict it); the old count/raw/retained caps stay.
  * It is the lowest-priority holder: a warm copy is only kept when it fits the
  * recent subset without pressure, so it never flushes another owner's cache. */
 function rememberWarm(t:Tile,key:string,value:LeafValue){
  const existing=warm.get(t.sha256);
  if(existing&&existing.key===key&&!existing.lease.released&&existing.lease.value){warm.delete(t.sha256);warm.set(t.sha256,existing);return;}
  if(existing){warm.delete(t.sha256);existing.lease.release();}
  if(!environmentRecentFits(resources,value.charge)){warmSkipped++;return;}
  let lease:LeafLease;
  // Classify the validated source, not the descriptor's optional kind hints.
  // A mixed leaf containing green shares its complete source's 17s idle tier;
  // actual water/tree-only leaves tighten the provisional tier to 13s.
  const cacheRetention=value.source.features.some(feature=>feature.properties.kind==='green')?'reupload':'redecode';
  try{lease=resources.acquire<LeafValue>({contentKey:key,role:'cache',allowRecent:false,cacheRetention,estimate:[],produce:()=>{throw Error('Environment warm reuse requires a loaded leaf');},onChange:()=>{const row=warm.get(t.sha256);if(row&&row.lease===lease&&(row.lease.released||!row.lease.value))warm.delete(t.sha256);}});}catch{return;}
  if(!lease.value){lease.release();return;}
  warm.set(t.sha256,{key,lease,bytes:value.bytes,retained:value.retained});
  let bytes=0,retained=0;for(const row of warm.values()){bytes+=row.bytes;retained+=row.retained;}
  while(warm.size&&(retained>24*1024**2||bytes>ENVIRONMENT_LIMITS.cacheBytes||warm.size>64)){const [sha,row]=warm.entries().next().value!;warm.delete(sha);bytes-=row.bytes;retained-=row.retained;row.lease.release();}
 }
 /** The read+parse working set is reserved from the leaf descriptor before the
  * read starts and shrinks to the retained decoded estimate after parsing. The
  * same claim carries the publication reference slots for the leaf's features
  * (descriptor count before the read, parsed count after it). A
  * caller-admitted read's minted envelope joins the entry's estimate, and the
  * production context is the read's claim: the transport replaces the envelope
  * in place by the delivered bytes, beside the read set it keeps, until the
  * decoded leaf replaces both. */
 const leafReferenceCost=(value:LeafValue)=>({category:'construction' as const,bytes:environmentLeafReferenceBytes(value.source.features.length),precision:'estimate' as const,identity:value.source,label:'environment publication reference slots'});
 const hardVerifiedCost=(value:LeafValue):ResourceBudgetCost=>({category:'metadata',bytes:64+value.hardVerified.length*256,precision:'estimate',identity:value.hardVerified,label:'environment native hard verification references'});
 const leafCosts=(value:LeafValue)=>[environmentDecodedCost(value.retained,value,'environment decoded leaf'),leafReferenceCost(value),hardVerifiedCost(value)];
 function acquireLeaf(t:Tile,key:string,m:Manifest):LeafLease{
  const boundarySHA=m.city_boundary.sha256,sourceSHA=m.source_pbf_sha256,snapshot=m.source_snapshot,descriptor=readDescriptor(t);
  // A missing/invalid count fails the parse check below; until then bound it by
  // the text size (no valid feature object is shorter than 16 bytes).
  const referenceBound=environmentLeafReferenceBytes(Number.isSafeInteger(t.feature_count)&&t.feature_count>=0?t.feature_count:Math.ceil((descriptor.compression==='gzip'?descriptor.uncompressed_bytes??0:descriptor.bytes)/16));
  const readCosts:ResourceBudgetCost[]=[...environmentJsonReadCosts(descriptor,'environment leaf '+t.id),{category:'construction',bytes:referenceBound,precision:'estimate',identity:{},label:'environment publication reference slots bound'}];
  const leafMax=Math.min(1024**2,descriptor.bytes),envelope=callerAdmitted?envelopes.mint(t.path,leafMax):undefined;
  // The source is not parsed yet: start at the possible-green 17s tier so the
  // store's minimum-tier merge cannot pin real green to 13s. rememberWarm uses
  // the validated features to tighten non-green sources; no new cache is added.
  return resources.acquire<LeafValue>({contentKey:key,role:'source',allowRecent:false,cacheRetention:'reupload',estimate:envelope?[...envelope,...readCosts]:readCosts,
   produce:async context=>{
    const {signal:work,adjust,budget}=context;let raw:unknown;
    try{raw=await (envelope?options.read(t,work,leafMax,{admitted:context,envelope,keep:readCosts}):options.read(t,work,1024**2));}
    catch(error){
     // A refused delivery leaves the entry's claim unchanged and fails it; the
     // demand then waits holding nothing and reacquires with the larger envelope.
     if(!envelope||work.aborted)throw error;const failed=envelopes.failure(t.path,'environment leaf read',error);if(failed.retry)throw error;
     if(failed.error instanceof EnvironmentResourceUnfitError)admission.unfit('environment leaf read',failed.error);throw failed.error;
    }
    work.throwIfAborted();if(envelope)envelopes.delivered(t.path);
    const source=parseEnvironmentSource(raw,city,boundarySHA,sourceSHA,snapshot);if(source.features.length!==t.feature_count)throw Error('Environment feature count mismatch');
    const retained=environmentRetainedEstimate(source);if(retained>24*1024**2)throw Error('Environment decoded tile budget exceeded');
    // Each candidate must reproduce the exact raw cohort feature SHA. The
    // source feature came from the product's verified descriptor read above;
    // this check binds every coordinate/property to the reviewed identity.
    // Reserve writer, traversal and WebCrypto scratch before constructing it.
    const hardVerified:EnvironmentFeature[]=[],candidates=source.features.filter(hasHardSurfaceNativeCandidate);
    if(candidates.length){const capacity=Math.min(4*1024**2,Math.max(4096,4*(t.uncompressed_bytes??t.bytes)));
     const scratch:ResourceBudgetCost={category:'construction',bytes:capacity*8+8192,precision:'estimate',identity:{},label:'environment hard native canonical digest scratch'};
     hardProofCandidates+=candidates.length;
     if(adjust([...readCosts,scratch]))for(const feature of candidates)if(await verifyHardSurfaceNativeFeature(feature,capacity,work))hardVerified.push(feature);
     hardProofVerified+=hardVerified.length;hardProofRefused+=candidates.length-hardVerified.length;
    }
    const value:LeafValue={source,hardVerified,retained,bytes:t.uncompressed_bytes??t.bytes,charge:0};value.charge=Math.ceil(retained)+leafReferenceCost(value).bytes+hardVerifiedCost(value).bytes;
    if(!adjust(leafCosts(value))){const pressure=budget.stats.lastPressure;throw pressure?new ResourceBudgetExceededError(pressure):Error('Environment decoded leaf no longer fits the page budget');}
    loads++;return value;
   },
   costs:leafCosts});
 }
 /** Leaf read+decode productions in flight for the current demand, adopted
  * same-tier productions included: at most the original two workers' worth.
  * A worker that needs a new production waits for one of them to settle (or
  * be released); this is an event wait on their own promises, never a timer. */
 const LEAF_PRODUCTIONS=2;
 function leafProductionsInFlight(){const busy=new Set<LeafLease>();for(const lease of [...[...demand.values()].map(row=>row.lease),...handoff.values()])if(!lease.released&&lease.state==='preparing')busy.add(lease);return [...busy];}
 function leafProductionSettled(busy:readonly LeafLease[],signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
   let done=false;const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',abort);if(error===undefined)resolve();else reject(error);};
   const abort=()=>finish(signal.reason??new DOMException('Aborted','AbortError'));
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
   for(const lease of busy)lease.ready.then(()=>finish(),()=>finish());
  });
 }
 async function loadLeaf(t:Tile,m:Manifest,ticket:number,signal:AbortSignal,current:()=>void):Promise<LeafValue>{
  const key=leafKey(m,t);
  for(;;){
   let held=demand.get(key);
   while(!held){
    const reuse=warm.get(t.sha256);
    if(reuse&&reuse.key===key&&!reuse.lease.released&&reuse.lease.value){held={lease:reuse.lease.retain('source'),ticket};demand.set(key,held);break;}
    // The slot count, the admission and the demand entry are one synchronous
    // step, so two woken workers can never both take the last slot. A full set
    // waits for one production to settle and then re-checks everything.
    const busy=leafProductionsInFlight();
    const limit=hardPendingTicket===ticket?1:LEAF_PRODUCTIONS;
    if(busy.length>=limit){await leafProductionSettled(busy,signal);current();held=demand.get(key);continue;}
    try{held={lease:acquireLeaf(t,key,m),ticket};demand.set(key,held);}
    catch(error){
     const refusal=environmentAdmissionError(error,'environment leaf read');
     if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit('environment leaf read',refusal);throw refusal??error;}
     admission.pending('environment leaf read',refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled('environment leaf read');}
     current();held=demand.get(key);
    }
   }
   try{await waitForEnvironmentLease(held.lease,signal);}
   catch(error){
    const refusal=signal.aborted?undefined:environmentAdmissionError(error,'environment leaf decode');
    if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit('leaf-decode',refusal);throw refusal??error;}
    // The ledger refused the decoded value after expansion; that production is
    // gone. This still-current demand waits for a real release and reacquires.
    if(demand.get(key)===held)demand.delete(key);held.lease.release();
    admission.pending('leaf-decode',refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled('leaf-decode');}
    current();continue;
   }
   current();
   const value=held.lease.value;if(!value)throw new DOMException('Aborted','AbortError');
   rememberWarm(t,key,value);return value;
  }
 }
 const canonicalGroundBindings=(m:Manifest)=>(m.ground_tiles??[]).map(t=>({path:t.path,sha256:t.sha256,uncompressed_sha256:t.uncompressed_sha256??t.sha256}));
 const groundMeshKey=(m:Manifest,t:Asset)=>JSON.stringify(['environment-ground-mesh-v1',city,t.path,t.sha256,t.bytes,t.compression??null,t.uncompressed_bytes??null,t.uncompressed_sha256??null,m.source_pbf_sha256,m.city_boundary.sha256,m.source_snapshot,canonicalGroundBindings(m)]);
 const groundMeshCosts=(value:GroundMeshValue)=>[environmentDecodedCost(value.retained,value,'environment encoded far ground mesh')];
 function acquireGroundMesh(t:Asset,m:Manifest,key:string):GroundMeshLease{
  const descriptor=readDescriptor(t),readCosts=environmentJsonReadCosts(descriptor,'environment far ground mesh'),max=Math.min(1024**2,descriptor.bytes),envelope=callerAdmitted?envelopes.mint(t.path,max):undefined;
  return resources.acquire<GroundMeshValue>({contentKey:key,role:'source',allowRecent:false,cacheRetention:'reupload',estimate:envelope?[...envelope,...readCosts]:readCosts,produce:async context=>{
   const {signal:work,adjust,budget}=context;let raw:unknown;
   try{raw=await (envelope?options.read(t,work,max,{admitted:context,envelope,keep:readCosts}):options.read(t,work,1024**2));}
   catch(error){if(!envelope||work.aborted)throw error;const failed=envelopes.failure(t.path,'environment far ground mesh read',error);if(failed.retry)throw error;if(failed.error instanceof EnvironmentResourceUnfitError)admission.unfit('environment far ground mesh read',failed.error);throw failed.error;}
   work.throwIfAborted();if(envelope)envelopes.delivered(t.path);
   const mesh=inspectEnvironmentGroundMesh(raw,{city,sourceSHA256:m.source_pbf_sha256,boundarySHA256:m.city_boundary.sha256,snapshot:m.source_snapshot,canonicalGroundTiles:canonicalGroundBindings(m),sourceFeatureCount:(m.ground_tiles??[]).reduce((sum,t)=>sum+(t.kinds?.green??0),0)});
   // Keep only encoded JSON/wrapper references here. Renderer admission owns all
   // atob, typed decode, boundary verification, packing and GPU storage.
   const bytes=t.uncompressed_bytes??t.bytes,value:GroundMeshValue={mesh,bytes,retained:environmentGroundMeshEncodedRetainedBytes(bytes)};
   if(!adjust(groundMeshCosts(value))){const pressure=budget.stats.lastPressure;throw pressure?new ResourceBudgetExceededError(pressure):Error('Encoded ground mesh no longer fits the page budget');}
   meshLoads++;return value;
  },costs:groundMeshCosts});
 }
 async function loadGroundMesh(t:Asset,m:Manifest,ticket:number,signal:AbortSignal,current:()=>void){
  const key=groundMeshKey(m,t),phase='environment far ground mesh';
  for(;;){
   current();let held=meshDemand;
   if(!held){
    try{held={key,ticket,lease:acquireGroundMesh(t,m,key)};meshDemand=held;}
    catch(error){const refusal=environmentAdmissionError(error,phase);if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit(phase,refusal);throw refusal??error;}admission.pending(phase,refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled(phase);}current();continue;}
   }
   if(held.key!==key||held.ticket!==ticket)throw new DOMException('Aborted','AbortError');
   try{await waitForEnvironmentLease(held.lease,signal);}
   catch(error){const refusal=signal.aborted?undefined:environmentAdmissionError(error,phase);if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit(phase,refusal);throw refusal??error;}releaseMeshDemand(ticket);admission.pending(phase,refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled(phase);}current();continue;}
   current();const value=held.lease.value;if(!value)throw new DOMException('Aborted','AbortError');return{held,value};
  }
 }
 /** One metadata page: its read working set (a caller-admitted read's minted
  * envelope included) is admitted at once before the read and shrinks to the
  * retained tile descriptors, with their tile selection slots, once they are
  * validated. A refused delivery is
  * retried holding nothing with the larger envelope it named. */
 async function loadPage(p:Asset&{id:string},size:number,signal:AbortSignal,current:()=>void){
  const descriptor=readDescriptor(p),pageCosts=environmentJsonReadCosts(descriptor,'environment page '+p.id),pageMax=Math.min(1024**2,descriptor.bytes);
  for(;;){
   const read=callerAdmitted?{envelope:envelopes.mint(p.path,pageMax),max:pageMax}:undefined,costs=read?[...pageCosts,...read.envelope]:pageCosts;
   const claim=admitNow(costs,'environment page')??await admitEnvironmentCosts(resources.budget,costs,'environment page',signal,admission);
   let raw:{schema_version:number;city:string;tiles:Tile[]};
   try{raw=await readOn(p,signal,claim,read,pageCosts) as {schema_version:number;city:string;tiles:Tile[]};}
   catch(error){claim.release();if(!read)throw error;retryRefusedRead(p.path,'environment page',error,signal);current();continue;}
   try{current();if(read)envelopes.delivered(p.path);if(raw?.schema_version!==1||raw.city!==city||!Array.isArray(raw.tiles)||raw.tiles.length>5000||raw.tiles.some(t=>!asset(t)||!Array.isArray(t.bbox)||t.bbox.length!==4||!t.bbox.every(Number.isFinite)))throw Error('Invalid environment page');
    const pins=raw as typeof raw&{source_pbf_sha256?:unknown;source_snapshot?:unknown;city_boundary_sha256?:unknown;source_boundary_sha256?:unknown};
    if(pins.source_pbf_sha256!==undefined&&pins.source_pbf_sha256!==manifest?.source_pbf_sha256||pins.source_snapshot!==undefined&&pins.source_snapshot!==manifest?.source_snapshot||pins.city_boundary_sha256!==undefined&&pins.city_boundary_sha256!==manifest?.city_boundary.sha256||pins.source_boundary_sha256!==undefined&&pins.source_boundary_sha256!==manifest?.city_boundary.sha256)throw Error('Environment page source binding mismatch');
    if(!claim.adjust([environmentDecodedCost(environmentRetainedEstimate(raw.tiles),raw.tiles,'environment page '+p.id,'metadata'),pageSelectionCost(raw.tiles)]))throw Error('Environment metadata page no longer fits the page budget');}
   catch(error){claim.release();throw error;}
   const hit={tiles:raw.tiles,rawBytes:size,claim};metadata.set(p.sha256,hit);metadataBytes+=size;
   while(metadataBytes>2*1024**2||metadata.size>16){const key=metadata.keys().next().value!,old=metadata.get(key)!;metadataBytes-=old.rawBytes;old.claim.release();metadata.delete(key);}
   return hit;
  }
 }
 /** Bytes of completed items this manager committed in its 3D lifetime (the
  * retained manifest and its index, the tile selection slots, metadata pages,
  * decoded leaves, the renderer's own storage). A wait that registers while any
  * is kept is counted as a committed-hold wait (see
  * createEnvironmentAdmissionStats). The water profile is not one: the caller
  * handed it over at install and it is kept for the page lifetime, whatever
  * this manager waits for, so counting it would mark nearly every wait. */
 function committedBytes(){
  let bytes=(manifestClaim?.active?manifestClaim.bytes:0)+(selectionClaim?.active?selectionClaim.bytes:0);
  for(const hit of metadata.values())if(hit.claim.active)bytes+=hit.claim.bytes;
  const leaves=new Set<LeafValue>();
  for(const lease of [...[...demand.values()].map(row=>row.lease),...handoff.values(),...[...warm.values()].map(row=>row.lease)]){const value=lease.value;if(value)leaves.add(value);}
  for(const value of leaves)bytes+=value.charge;
  const pendingMesh=meshDemand?.lease.value,publishedMesh=meshPublished?.lease.value;
  if(pendingMesh)bytes+=pendingMesh.retained;if(publishedMesh&&publishedMesh!==pendingMesh)bytes+=publishedMesh.retained;
  const own=renderer?.stats.resources;if(own)bytes+=own.fixedCPUBytes+own.publicationBytes+own.gpuBytes;bytes+=renderer?.regionalCoverageTarget?.stats.ownedLiveBytes??0;bytes+=renderer?.hardSurfaceDisplayTarget?.stats.ownedLiveBytes??0;bytes+=hardController?.stats.ownedLiveBytes??0;
  return bytes;
 }
 /** Leaf productions this manager keeps in flight (preparing: demand leases,
  * adopted or not, and an unadopted same-tier handoff). A wait that registers
  * beside one is not the committed-item exception; it is counted apart as an
  * in-flight hold wait (see createEnvironmentAdmissionStats). */
 function inFlightProductions(){
  const preparing=new Set<LeafLease>();
  for(const lease of [...[...demand.values()].map(row=>row.lease),...handoff.values()])if(!lease.released&&lease.state==='preparing')preparing.add(lease);
  return preparing.size+Number(meshDemand?.lease.state==='preparing');
 }
 async function refresh(){if(!active()){stop();return;}request.abort();regional?.cancel();hardController?.cancel();releaseMeshDemand();const own=request=new AbortController(),ticket=++revision,requestedDetail=detail(),signal=own.signal,current=()=>{signal.throwIfAborted();if(ticket!==revision||!active()||detail()!==requestedDetail)throw new DOMException('Aborted','AbortError');};let flushTimer:ReturnType<typeof setTimeout>|undefined;
 takeDemand(requestedDetail);
 try{state='loading';lastError=undefined;if(requestedDetail==='full')groundSelection=undefined;
 // Clear full-detail geometry before any manifest/page/leaf await. Old requests
 // are already invalidated, so they cannot bring trees or water back in this tier.
 if(requestedDetail==='ground'&&publishedDetail==='full'&&renderer){renderer.setFeatures([],bounds(),undefined,undefined,'ground');replacePublishedMesh(undefined);publishedDetail='ground';publishedGeometryKey=undefined;options.frameClock?.wake();}
 // A water profile the install hand-off could not charge is admitted before any
 // other claim of this manager exists; it is kept until destroy.
 if(waterProfileCosts.length&&!waterProfileClaim){const claim=admitNow(waterProfileCosts,waterProfileLabel)??await admitEnvironmentCosts(resources.budget,waterProfileCosts,waterProfileLabel,signal,admission);if(destroyed||waterProfileClaim)claim.release();else waterProfileClaim=claim;current();}
 // The caller-admitted protocol first readies the reader, holding no claim of
 // this refresh; every read below then admits its whole working set once.
 if(callerAdmitted){await options.ensureRead!(signal);current();}
 // The manifest/boundary parse working sets and the solar index are admitted
 // before each read or allocation; the decoded manifest and the index stay
 // charged for this 3D lifetime.
 const loaded=manifest??await bootstrap(signal,current);
 if(!renderer){const module=await import('./environment-scene-renderer');current();const create=()=>module.createEnvironmentSceneRenderer(map,{mobile:options.mobile,origin:cityOrigin,reducedMotion:ownerReducedMotion,verifiedBoundary:cityBoundary,onRenderError:renderFailed,onRegionalCoverageInvalidated:()=>{regional?.destroy();regional=undefined;hardController?.destroy();hardController=undefined;queueMicrotask(()=>{if(active()&&(manifest?.ground_regional||manifest?.hard_surface_display))void refresh();});},onFrameNeeded:()=>options.frameClock?.wake(),resourceStore:resources});let candidate:ReturnType<typeof create>|undefined;
 // Fixed renderer storage is admitted inside the constructor; Pending waits for
 // one ledger wake-up and the creation is retried, never polled.
 while(!candidate){try{candidate=create();}catch(error){const refusal=environmentAdmissionError(error,'environment renderer');if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit('renderer',refusal);throw refusal??error;}admission.pending('renderer',refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled('renderer');}current();}}
 try{map.addLayer(candidate.layer,options.beforeLayer());renderer=candidate;candidate.setReflectionSource(reflectionSource);candidate.setSceneEnvironment(sceneEnvironment);candidate.setOffscreen(offscreen);syncFrameClock();}catch(error){try{if(map.getLayer(candidate.layer.id))map.removeLayer(candidate.layer.id);}finally{candidate.destroy();}
 // onAdd's one GPU decision (programs, fixed, water) can be unfit where the
 // fixed CPU construction fitted (the mobile profile): an explicit failure,
 // counted, never a wait.
 if(error instanceof EnvironmentResourceUnfitError)admission.unfit('renderer GPU',error);throw error;}}
 partial=false;const box=bounds(),centre=map.getCenter(),canvas=map.getCanvas(),camera={pitch:map.getPitch(),verticalFieldOfView:map.getVerticalFieldOfView(),aspectRatio:canvas.clientWidth/Math.max(1,canvas.clientHeight)},query=requestedDetail==='ground'?box:viewportQueryBounds(box,102.1,camera),overview=requestedDetail==='ground'?loaded.ground_tiles:undefined;
 // The hard catalog is an independent material stream. Its source and target
 // share the page store and the renderer's one-chunk green/hard turnstile.
 let hardTask:Promise<HardResult|undefined>|undefined;
 if(loaded.hard_surface_display){
  const ref=loaded.hard_surface_display,green=loaded.ground_regional!;hardPendingTicket=ticket;hardError=undefined;hardResult=undefined;
  // Hard bootstrap, including its metadata-budget wait, must never block the
  // native path. Reserve one of the existing two source-production slots for
  // it while pending; older in-flight leaves are allowed to settle first.
  hardTask=(async()=>{
   let busy=leafProductionsInFlight();while(busy.length>=LEAF_PRODUCTIONS){await leafProductionSettled(busy,signal);current();busy=leafProductionsInFlight();}
   current();const target=renderer?.hardSurfaceDisplayTarget;if(!target)throw Error('Hard surface display requires the environment WebGL2 target');
   if(!hardSource)hardSource=createHardSurfaceDisplaySource({store:resources,boundary:cityBoundary,readVerifiedJSON:hardSurfaceReadFromVerifiedProduct((asset,work,max,claim)=>options.read(asset,work,max,claim))});
   if(!hardController){await retryEnvironmentAdmission(resources.budget,signal,'hard surface controller metadata',()=>{current();
    hardController=createHardSurfaceDisplayController({source:hardSource!,target,budget:resources.budget,gate:renderer!.groundChunkTurnstile,requestFrame:()=>{options.frameClock?.wake();map.triggerRepaint();}});
    try{renderer!.setHardSurfaceDisplayController(hardController);}catch(error){hardController.destroy();hardController=undefined;throw error;}
   },admission);current();}
   current();renderer!.setEnabled(true);const controller=hardController;if(!controller)throw Error('Hard surface controller unavailable');
   return controller.start({generation:String(ticket),root:ref.root,expected:{city,source_pbf_sha256:loaded.source_pbf_sha256,source_boundary_sha256:loaded.city_boundary.sha256,source_snapshot:loaded.source_snapshot,original_nonself_source_index:green.source_index,original_green_root:green.root,membership_proof:ref.membership_proof},signal});
  })().then(result=>{current();hardResult=result;return result;}).catch(error=>{if(signal.aborted||ticket!==revision)throw error;hardError=(error instanceof Error?error.message:String(error)).slice(0,2048);return undefined;}).finally(()=>{if(hardPendingTicket===ticket)hardPendingTicket=undefined;});
  void hardTask.catch(()=>{});options.frameClock?.wake();map.triggerRepaint();
 }
 const settleHard=async()=>{if(!hardTask)return;const result=await hardTask;current();if(!result){partial=true;lastError=hardError??'Hard surface display unavailable';}else partial ||= !result.displayComplete;return result;};
 // In full detail, keep one original source-production slot for native
 // leaves while hard is running. Green starts after native publication and
 // source-lease release, then shares the existing one-chunk gate with hard.
 let regionalTask:Promise<RegionalResult|undefined>|undefined;
 const deferRegional=requestedDetail==='full'&&!!hardTask&&!!loaded.ground_regional;
 const startRegional=()=>{
  if(regionalTask||!loaded.ground_regional)return;const ref=loaded.ground_regional;
  if(regionalDeferredTicket===ticket)regionalDeferredTicket=undefined;
  regionalTask=(async()=>{current();const target=renderer?.regionalCoverageTarget;if(!target)throw Error('Regional green coverage requires the environment WebGL2 target');
   if(!regionalSource)regionalSource=createRegionalGreenSource({store:resources,boundary:cityBoundary,readVerifiedJSON:regionalReadFromVerifiedProduct((asset,work,max,claim)=>options.read(asset,work,max,claim))});
   if(!regional){regional=createEnvironmentRegionalController({source:regionalSource,target,gate:renderer!.groundChunkTurnstile,requestFrame:()=>{options.frameClock?.wake();map.triggerRepaint();}});renderer!.setRegionalController(regional);}
   current();renderer!.setEnabled(true);return regional.start({generation:String(ticket),root:ref.root,expected:{city,source_pbf_sha256:loaded.source_pbf_sha256,source_boundary_sha256:loaded.city_boundary.sha256,source_snapshot:loaded.source_snapshot,city_boundary:loaded.city_boundary,source_index:ref.source_index,discovery:ref.discovery,source_partition_proof:ref.source_partition_proof,regional_implementation_sha256:ref.regional_implementation_sha256,exact_geometry_producer_sha256:ref.exact_geometry_producer_sha256},bounds:box,signal});
  })().then(result=>{current();regionalResult=result;replacePublishedMesh(undefined);return result;}).catch(error=>{if(signal.aborted||ticket!==revision)throw error;regionalError=(error instanceof Error?error.message:String(error)).slice(0,2048);return undefined;}).finally(()=>{if(regionalPendingTicket===ticket)regionalPendingTicket=undefined;});
  void regionalTask.catch(()=>{});options.frameClock?.wake();map.triggerRepaint();
 };
 const settleRegional=async()=>{if(!regionalTask)return;const result=await regionalTask;current();if(!result){partial=true;lastError=regionalError??'Regional green coverage unavailable';}else partial ||= !result.coverageComplete;return result;};
 if(loaded.ground_regional){
  regionalPendingTicket=ticket;regionalError=undefined;regionalResult=undefined;
  if(deferRegional)regionalDeferredTicket=ticket;else startRegional();
  if(requestedDetail==='ground'){
   const result=await settleRegional();current();if(!result)throw Error(regionalError??'Regional green coverage unavailable');
   publishedDetail='ground';publishedGroundSource='regional-source-coverage';publishedGeometryKey=JSON.stringify(['regional',loaded.ground_regional.root.sha256,box]);
   groundSelection={route:'mesh',reason:'closed-regional-source-stream',nativeClosureComplete:result.coverageComplete,candidateLeaves:result.chunkCount,selectedLeaves:result.chunkCount,rawBytes:0};
   partial ||= !result.coverageComplete;renderer.setEnabled(true);options.frameClock?.wake();
   if(hardTask){const groundPartial=partial;partial=true;state='partial';const hard=await settleHard();current();partial=groundPartial||!hard?.displayComplete;}
   state=partial?'partial':'ready';return;
  }
  if(!deferRegional){await settleRegional();current();}
 }

 if(!query)partial=true;
 let selectedPages:Tile[][]|undefined,nativeComplete=true,nativeReason='complete-visible-native-closure';
 if(loaded.index_type==='viewport-partitioned-v1'){
  const pages=(loaded.partitions??[]).filter(p=>!query||overlap(p.bbox,query)).sort((a,b)=>Number(!overlap(a.bbox,box))-Number(!overlap(b.bbox,box))||environmentBoxDistance(a.bbox,centre)-environmentBoxDistance(b.bbox,centre)||a.id.localeCompare(b.id));
  // A local replacement requires ALL visible metadata, not a priority subset.
  // Refuse that probe before I/O when it cannot fit the original metadata cache.
  const completePagesFit=pages.length<=16&&pages.reduce((sum,p)=>sum+(p.uncompressed_bytes??p.bytes),0)<=2*1024**2;
  if(overview&&!completePagesFit){nativeComplete=false;nativeReason='visible-native-metadata-budget';}
  else{selectedPages=[];let rawBudget=0;for(const p of pages){current();
   // A previous-generation native leaf may still be finishing. A metadata
   // page is the one native producer while hard occupies the other slot.
   if(deferRegional&&hardPendingTicket===ticket){let busy=leafProductionsInFlight();while(busy.length){await leafProductionSettled(busy,signal);current();busy=leafProductionsInFlight();}}
   const size=p.uncompressed_bytes??p.bytes;if(rawBudget+size>2*1024**2){partial=true;nativeComplete=false;continue;}rawBudget+=size;try{const hit=metadata.get(p.sha256)??await loadPage(p,size,signal,current);selectedPages.push(hit.tiles);}catch(error){current();if(!overview)throw error;nativeComplete=false;lastError=(error instanceof Error?error.message:String(error)).slice(0,2048);nativeReason='native-metadata-unavailable: '+lastError;selectedPages=undefined;break;}}}
 }
 // The tile selection containers are already charged: with the selection claim
 // split off the bootstrap, or with the metadata pages they are built from (see
 // tileSelectionCosts). Nothing is admitted or awaited here.
 current();const chosen:Tile[]=[];let groundTiles:Tile[]|undefined,localGround=false,nativeCandidates=0,chosenBytes=0;
 {let tileDescriptors=loaded.tiles??[];if(selectedPages){tileDescriptors=[];for(const tiles of selectedPages)tileDescriptors.push(...tiles);}
  // Scalar preflight does not construct both a native and an overview selection.
  if(overview&&nativeComplete){let bytes=0;for(const t of tileDescriptors)if((!query||overlap(t.bbox,query))&&environmentTileMayHaveGround(t)){nativeCandidates++;bytes+=t.uncompressed_bytes??t.bytes;}if(!nativeCandidates){nativeComplete=false;nativeReason='no-visible-native-green-leaves';}else if(nativeCandidates>32||bytes>ENVIRONMENT_LIMITS.visibleBytes){nativeComplete=false;nativeReason='visible-native-leaf-budget';}}
  localGround=!!overview&&nativeComplete;
  groundTiles=overview&&!localGround?overview:undefined;
  if(groundTiles){tileDescriptors=groundTiles;partial=true;}
  const all=tileDescriptors.filter(t=>(!query||overlap(t.bbox,query))&&(requestedDetail==='full'||environmentTileMayHaveGround(t))).sort((a,b)=>environmentTilePriority(a,box)-environmentTilePriority(b,box)||environmentBoxDistance(a.bbox,centre)-environmentBoxDistance(b.bbox,centre)||a.id.localeCompare(b.id));
  for(const t of all){const cost=t.uncompressed_bytes??t.bytes;if(chosen.length>=32||chosenBytes+cost>ENVIRONMENT_LIMITS.visibleBytes){partial=true;continue;}chosen.push(t);chosenBytes+=cost;}
 }selectedPages=undefined;
 if(overview&&!chosen.length&&!loaded.ground_far_mesh)throw Error('No visible green source in the bounded environment overview');
 if(requestedDetail==='ground')groundSelection={route:groundTiles?'overview':'native',reason:overview?nativeReason:'native-source-without-overview',nativeClosureComplete:localGround,candidateLeaves:nativeCandidates,selectedLeaves:chosen.length,rawBytes:chosenBytes};
 const m=loaded;
 const publishPackedGround=async(reason:string)=>{
  const descriptor=m.ground_far_mesh;if(!descriptor)throw Error('Missing environment far ground mesh');
  partial=true;groundSelection={route:'mesh',reason,nativeClosureComplete:false,candidateLeaves:nativeCandidates,selectedLeaves:1,rawBytes:descriptor.uncompressed_bytes??descriptor.bytes};
  adoptHandoff(new Set(),ticket);
  const contentKey=groundMeshKey(m,descriptor),geometryKey=JSON.stringify(['ground-mesh',contentKey]);
  // A camera-only change reuses the one published encoded input and packed
  // geometry. It never reads or decodes the unchanged canonical leaf cohort.
  if(publishedDetail==='ground'&&publishedGeometryKey===geometryKey&&meshPublished?.key===contentKey&&meshPublished.lease.value){
   current();renderer!.setEnabled(true);options.frameClock?.wake();state='partial';return;
  }
  const {held,value}=await loadGroundMesh(descriptor,m,ticket,signal,current);
  await retryEnvironmentAdmission(resources.budget,signal,'environment packed ground publication',()=>{
   current();renderer!.setGroundMesh(value.mesh);current();
   if(meshDemand!==held)throw new DOMException('Aborted','AbortError');
   // Move (do not copy/cache) the one source lease into publication ownership.
   meshDemand=undefined;replacePublishedMesh({key:contentKey,lease:held.lease});
   publishedDetail='ground';publishedGroundSource='packed-source-mesh';publishedGeometryKey=geometryKey;
   renderer!.setEnabled(true);options.frameClock?.wake();
  },admission);
  current();state='partial';
 };
 if(groundTiles&&m.ground_far_mesh){await publishPackedGround(nativeReason);return;}
 // An unchanged warm view keeps its published CPU/GPU geometry: no leaf is read
 // or decoded again, even after revocable warm leaves were evicted.
 if(renderer&&publishedDetail===requestedDetail&&publishedGeometryKey===JSON.stringify([requestedDetail,box,camera,chosen.map(t=>t.sha256)])){adoptHandoff(new Set(),ticket);current();publishedGroundSource=requestedDetail==='ground'?(groundTiles?'exact-source-overview':'native-tiles'):undefined;renderer.setEnabled(true);options.frameClock?.wake();partial ||= !!renderer.stats.omittedTrees||!!renderer.stats.heldWater||!!renderer.stats.greenGround.held||!!renderer.stats.greenGround.omitted||!!renderer.stats.treeRows.truncated||!!renderer.stats.woodland.truncated;
  if(hardTask){const nativePartial=partial;partial=true;state='partial';releaseDemand(ticket);if(deferRegional)startRegional();const [green,hard]=await Promise.all([settleRegional(),settleHard()]);current();partial=nativePartial||!!regionalTask&&!green?.coverageComplete||!hard?.displayComplete;}
  state=partial?'partial':'ready';return;}
 adoptHandoff(new Set(chosen.map(t=>leafKey(m,t))),ticket);
 let lastCommit=0,sourceRetained=0;const sources:(LeafValue|undefined)[]=[],admittedWater=new Set<import('./environment-scene-data').EnvironmentFeature>(),publish=()=>{current();const key=JSON.stringify([requestedDetail,box,camera,sources.map((source,at)=>source?chosen[at].sha256:null)]);if(key!==publishedGeometryKey){
 // Every referenced feature belongs to a held leaf whose claim already carries
 // these reference slots. Nothing is reserved here, so a refused setFeatures
 // releases nothing and cannot wake other waiters without a real release.
 const features=sources.flatMap(s=>s?.source.features??[]);renderer!.setFeatures(requestedDetail==='ground'?uniqueGreenFeatures(features):features,box,admittedWater,camera,requestedDetail,feature=>sources.some(source=>source?.hardVerified.includes(feature)===true));replacePublishedMesh(undefined);publishedDetail=requestedDetail;publishedGroundSource=requestedDetail==='ground'?(groundTiles?'exact-source-overview':'native-tiles'):undefined;publishedGeometryKey=key;}renderer!.setEnabled(true);options.frameClock?.wake();lastCommit=performance.now();};const stage=()=>{if(flushTimer!==undefined)return;flushTimer=setTimeout(()=>{flushTimer=undefined;try{publish();}catch{}},Math.max(16,50-(performance.now()-lastCommit)));};
 const loadSources=async()=>{let i=0,failed=false,firstFailure:unknown;await Promise.allSettled([0,1].map(async()=>{try{while(i<chosen.length&&!failed){const at=i++,t=chosen[at];current();const hit=await loadLeaf(t,m,ticket,signal,current);if(failed)return;if(groundTiles&&hit.source.features.some(f=>f.properties.kind!=='green'))throw Error('Environment ground overview contains a non-green feature');if(sourceRetained+hit.retained>24*1024**2){if(localGround)throw Error('Visible native green closure exceeds decoded budget');partial=true;continue;}sourceRetained+=hit.retained;if(requestedDetail==='full'&&options.waterAdmission&&options.waterAdmission.boundarySHA256===m.city_boundary.sha256&&options.waterAdmission.sourcePbfSHA256===m.source_pbf_sha256&&cityOrigin?.every((v,i)=>v===options.waterAdmission!.origin[i])&&options.waterAdmission.physicalTileSHA256.includes(t.sha256))for(const f of hit.source.features)if(['water','water_line'].includes(f.properties.kind))admittedWater.add(f);sources[at]=hit;current();if(requestedDetail==='full')stage();}}catch(error){if(!failed)firstFailure=error;failed=true;releaseDemand(ticket);throw error;}}));if(failed)throw firstFailure;};
 try{await loadSources();current();if(localGround){const features=uniqueGreenFeatures(sources.flatMap(s=>s?.source.features??[])),count=environmentPublicationBound(features,undefined,'ground',0).counts;if(!features.length)throw Error('Visible native leaves contain no green source');if(count.greenVertices>ENVIRONMENT_LIMITS.greenVertices||count.greenIndices>ENVIRONMENT_LIMITS.greenIndices||count.largestPolygonVertices>ENVIRONMENT_LIMITS.greenVertices)throw Error('Visible native green closure exceeds geometry budget');}}
 catch(error){current();if(!localGround||!overview)throw error;
  // No native feature has been published. Drop that attempt's source leases
  // before reading the bounded overview; the previous publication stays live.
  lastError=(error instanceof Error?error.message:String(error)).slice(0,2048);partial=true;localGround=false;groundTiles=overview;releaseDemand(ticket);sources.length=0;sourceRetained=0;chosen.length=0;chosenBytes=0;
  for(const t of overview)if(!query||overlap(t.bbox,query)){chosen.push(t);chosenBytes+=t.uncompressed_bytes??t.bytes;}
  if(!chosen.length&&!m.ground_far_mesh)throw Error('No visible green source in the bounded environment overview');
  groundSelection={route:'overview',reason:'native-source-unavailable: '+lastError,nativeClosureComplete:false,candidateLeaves:nativeCandidates,selectedLeaves:chosen.length,rawBytes:chosenBytes};
  if(m.ground_far_mesh){await publishPackedGround(groundSelection.reason);return;}
  await loadSources();current();
 }
 if(flushTimer!==undefined){clearTimeout(flushTimer);flushTimer=undefined;}await retryEnvironmentAdmission(resources.budget,signal,'environment publication',publish,admission);current();partial ||= !!renderer.stats.omittedTrees||!!renderer.stats.heldWater||!!renderer.stats.greenGround.held||!!renderer.stats.greenGround.omitted||!!renderer.stats.treeRows.truncated||!!renderer.stats.woodland.truncated;
 if(hardTask){const nativePartial=partial;partial=true;state='partial';
  // Release native source ownership before starting the deferred green stream
  // or waiting on hard, so no third current-generation producer is introduced.
  sources.length=0;admittedWater.clear();releaseDemand(ticket);if(deferRegional)startRegional();
  const [green,hard]=await Promise.all([settleRegional(),settleHard()]);current();partial=nativePartial||!!regionalTask&&!green?.coverageComplete||!hard?.displayComplete;
 }
 state=partial?'partial':'ready';
 }catch(error){if(!signal.aborted&&!destroyed&&ticket===revision&&active()&&detail()===requestedDetail){own.abort();const keepGround=requestedDetail==='ground'&&publishedDetail==='ground'&&publishedGeometryKey!==undefined||!!renderer?.regionalCoverageTarget?.stats.generation;if(!keepGround)renderer?.setEnabled(false);partial=keepGround;state=keepGround?'partial':'error';lastError=error instanceof Error?error.message:String(error);}}finally{if(flushTimer!==undefined)clearTimeout(flushTimer);if(regionalDeferredTicket===ticket){regionalDeferredTicket=undefined;if(regionalPendingTicket===ticket)regionalPendingTicket=undefined;}if(ticket===revision)releaseHandoff();releaseMeshDemand(ticket);releaseDemand(ticket);}}
 const moved=()=>{const zoom=map.getZoom();if(mode&&visible&&!offscreen&&!destroyed&&!suspended&&Number.isFinite(zoom)&&zoom<GROUND_MIN_ZOOM){stop();releaseEnvironmentResources();return;}void refresh();};map.on('moveend',moved);
 return{setReflectionSource(value:PlanarReflectionSource|undefined){reflectionSource=value;renderer?.setReflectionSource(value);options.frameClock?.wake();},setMode(v:boolean){if(mode===v)return;mode=v;if(!mode){stop();releaseEnvironmentResources();return;}void refresh();},setVisible(v:boolean){if(visible===v)return;visible=v;renderer?.setVisible(v);void refresh();},setReducedMotion(v:boolean){ownerReducedMotion=v;renderer?.setReducedMotion(v);options.frameClock?.wake();},setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value),changedQuality=next.quality!==sceneEnvironment.quality;sceneEnvironment=next;renderer?.setSceneEnvironment(sceneEnvironment);if(changedQuality)syncFrameClock();else options.frameClock?.wake();},setOffscreen(value:boolean){if(offscreen===value)return;offscreen=value;renderer?.setOffscreen(value);void refresh();options.frameClock?.wake();},suspend(){if(destroyed||suspended)return;suspended=true;stop();renderer?.resetPlanarReflectionGPU();},resume(){if(destroyed||!suspended)return;suspended=false;void refresh();},getWaterProbe(lonlat:[number,number]){return renderer?.getWaterProbe(lonlat);},get customLayer(){return renderer?.layer;},getProofSettlementKey(){return [state,revision,partial,lastError,publishedDetail,publishedGeometryKey,regionalError,regionalResult?.status,regionalResult?.rootSHA256,regionalPendingTicket===revision&&!request.signal.aborted,regionalDeferredTicket===revision,hardError,hardResult?.status,hardResult?.rootSHA256,hardPendingTicket===revision,renderer?.getProofSettlementKey()] as const;},get stats(){pruneWarm();let cacheBytes=0,cacheRetained=0,metadataClaimBytes=0;for(const row of warm.values()){cacheBytes+=row.bytes;cacheRetained+=row.retained;}for(const hit of metadata.values())metadataClaimBytes+=hit.claim.bytes;
 // A published CPU scene whose GPU storage still waits for the page budget is
 // not drawn: report that waiting reason instead of ready/partial.
 const rendererStats=renderer?.stats,hardViewPartial=rendererStats?.hardSurfaceDisplay.captureStale===true,gpuWaiting=(state==='ready'||state==='partial')&&rendererStats?.resources?.gpuDeferred===true?{phase:'environment GPU buffers',label:rendererStats.resources.gpuPending?.label,requiredBytes:rendererStats.resources.gpuPending?.requiredBytes,publishedState:state}:undefined,groundSource=publishedDetail==='ground'?publishedGroundSource:undefined;
 const pendingMesh=meshDemand?.lease.value,publishedMesh=meshPublished?.lease.value,encodedMeshRetained=(pendingMesh?.retained??0)+(publishedMesh&&publishedMesh!==pendingMesh?publishedMesh.retained:0);
 return{state:gpuWaiting?'waiting-gpu-budget':hardViewPartial&&state==='ready'?'partial':state,lastError,groundSource,groundSelection:groundSelection?{...groundSelection}:undefined,groundOverviewTiles:manifest?.ground_tiles?.length??0,regionalGreen:{configured:!!manifest?.ground_regional,pending:regionalPendingTicket===revision&&!request.signal.aborted,deferredForNative:regionalDeferredTicket===revision,result:regionalResult,error:regionalError,controller:regional?.stats,source:regionalSource?.stats},hardSurfaceDisplay:{configured:!!manifest?.hard_surface_display,pending:hardPendingTicket===revision,result:hardResult,error:hardError,controller:hardController?.stats,source:hardSource?.stats,nativeProof:{candidates:hardProofCandidates,verified:hardProofVerified,refused:hardProofRefused}},cacheTiles:warm.size,metadataRawBytes:metadataBytes,cacheRawBytes:cacheBytes,cacheRetainedEstimateBytes:cacheRetained,loads,partial:partial||hardViewPartial,renderer:rendererStats,sharedReadScheduler:true,resources:{ledger:'page-resource-budget',decodedOwner:'page-chunk-resource-store',demandLeaves:demand.size,handoffLeaves:handoff.size,warmLeaves:warm.size,warmSkipped,leafProductionLimit:LEAF_PRODUCTIONS,nativeLeafLimitWhileHardPending:hardPendingTicket===revision?1:LEAF_PRODUCTIONS,leafProductionsInFlight:leafProductionsInFlight().length+Number(meshDemand?.lease.state==='preparing'),encodedGroundMesh:{loads:meshLoads,pendingSourceLeases:Number(!!meshDemand),publishedSourceLeases:Number(!!meshPublished),retainedEstimateBytes:encodedMeshRetained},manifestClaimBytes:manifestClaim?.bytes??0,selectionClaimBytes:selectionClaim?.active?selectionClaim.bytes:0,boundaryIndexBytes:environmentClaimBytes(solarShadowBoundaryCosts(cityBoundary)),bootstrapRestarts,bootstrapPeakBytes:bootstrapPeak,waterAdmissionClaimBytes:waterProfileClaim?.active?waterProfileClaim.bytes:0,metadataClaimBytes,gpuWaiting,admission:admission.stats,readAdmission:callerAdmitted?'caller-admitted':'reader-admitted',readEnvelopeRetries:envelopes.pendingRetries,physicalMemory:'unmeasured'}};},destroy(){if(destroyed)return;destroyed=true;stop();map.off('moveend',moved);releaseEnvironmentResources();waterProfileClaim?.release();waterProfileClaim=undefined;}};
}
