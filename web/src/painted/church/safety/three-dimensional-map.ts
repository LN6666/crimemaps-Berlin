import {StaleBuildingDetailDemandError} from '../../../safety/building-detail-runtime';
import {applyBuildingFocus,createBuildingFocusState,ownerFocusReplacements} from '../../../safety/building-focus-provider';
import type {BuildingFocusLocatedLeaf} from '../../../safety/building-focus-closure';
import type {BuildingFocusRuntime} from '../../../safety/building-focus-registry';
import {resourceContentKey} from '../../../safety/resource-content-key';
import {deriveSceneSolarDetailSettlement} from '../../../safety/scene-solar-detail-settlement';
import {resourceByteAdmittedEnvelope,resourceByteReadEnvelope,type ResourceByteAcquireOptions,type ResourceByteDeliveryRefusedError,type ResourceBytesAcquire,type ResourceBytesLease} from '../../../safety/resource-byte-transport';
import type {FacadeHelperSourceLease} from '../../../safety/facade-helper-source';
import {buildingDetailSolarCoverageBounds,mergeSceneSolarCoverageBounds,type SolarWorldBounds} from '../../../safety/prospective-solar-projection';
import {buildingDetailMayContainPick} from '../../../safety/building-detail-demand';
import {modelProjectionAtOrigin,type ModelViewProjectionSnapshot} from '../../../safety/model-view-projection';
import {ResourceBudgetExceededError,type ResourceBudgetCost,type ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import {acquireManagerBootstrap,ManagerAdmissionRetry,retryManagerAdmission} from '../../../safety/manager-ensure-admission';
import {admitSolarShadowBoundary,currentSolarShadowBoundary} from '../../../safety/solar-shadow-admission';
import type {RendererChunkInput,RendererSourceGroup} from '../../../safety/renderer-chunk-input';
import type {BuildingDetailGroups} from '../../../safety/building-detail-groups';
import type {BuildingDetailDemandIndex,BuildingDetailResource} from '../../../safety/building-detail-demand';
import type {createBuildingDetailRuntime,BuildingDetailSession} from '../../../safety/building-detail-runtime';
import {runAbortableReaders,createWantedResourceLeases,createViewportRequestContinuation,type ViewportPublicationAttempt} from '../../../safety/viewport-request';
import type {VisiblePreparationRun} from '../../../safety/visible-preparation-gate';
import {createRecoveryResidentReuse,recoveryResidentView,type ContextRecoveryOptions} from '../../../safety/recovery-resident-reuse';
import {createSharedNativeSourcePool,type NativeSourceClient} from '../../../safety/shared-native-source';
import {getPageChunkResourceStore,ChunkResourceContextLostError} from '../../../safety/render-runtime/chunk-resource-store';
import type {ChunkProductionContext,ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import {reichstagAppearanceVertexReservation} from './reichstag-appearance-budget';
import {nativePartDisplayPlan,type NativeGroupDisplayPlan} from './native-part-display';
import {NATIVE_PART_DISPLAY_PROFILES} from './native-part-display-profiles';
import {modelHeightQuery,validModelHeight} from './three-dimensional-query';
import {viewportComponents,viewportComponentDistance,componentViewportRecord} from './three-dimensional-viewport';
import {shadowAdmissionForDecodedShard,mergeShadowAdmissions} from './source-shadow-binding';
import {installThreeDimensionalPartitions,type ThreeDPartition} from './three-dimensional-partitions';
import {decodeBounded3DAssetJSON,type ThreeDCompressionDescriptor} from './bounded-3d-gzip';
import {waitForResidentDraw,type ResidentDrawObservation} from '../../../safety/resident-draw-readiness';
import {pageIsHidden} from './visible-readiness-deadline';
import {estimateRetainedBuildingPayload,THREE_D_DECODED_PAYLOAD_LIMITS} from './building-payload-cost';
import {normalizeBuildingShard} from './building-mesh-codec';
import {supplementStQuirinDisplay} from './munich-st-quirin-display';
import {supplementSanktTheresiaDisplay} from './munich-sankt-theresia-display';
import {supplementLeipzigRehbachDisplay} from './leipzig-rehbach-display';
import {supplementNurembergStLudwigDisplay} from './nuremberg-st-ludwig-display';
import {supplementMunichApprovedChurchDisplay} from './munich-approved-church-display';
import {supplementNurembergChurchDisplayRepairs} from './nuremberg-church-display-repairs';
import {supplementLeipzigChurchDisplay} from './leipzig-church-display';
import type {Map as MapView} from 'maplibre-gl';
import {containsPosition} from './geography-position';
import type {BuildingComponent} from './building-mesh-renderer';
import type {ThreeDControlState,ThreeDViewMode} from './three-dimensional-controls';

type DetailSelection={index:BuildingDetailDemandIndex;resource:BuildingDetailResource};
type BBox=[number,number,number,number];
/** requestMode's third argument: `true` (a manager's own camera-less picking
 * refresh) or a transition; {retainPrograms:true} marks the page's automatic 2D
 * rollback of every provider. Every automatic 2D fallback (that rollback, or this
 * manager's own failed or timed-out 3D request or hand-off) passes the reason
 * {retainPrograms:true} as its empty batch's third argument, so the renderer can
 * keep the compiled programs for the retry; an explicit 2D switch, the overview
 * release and teardown pass none (cross-writer agreement, DECISIONS 2026-11-02
 * 01:35). Until a renderer consumes it, the value lands in its shadow-admission
 * slot, which rejects every value without a verified profile exactly as it
 * rejects undefined. */
type ThreeDModeTransition=Readonly<{skipCamera?:boolean;retainPrograms?:boolean}>;
type Asset=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
type Shard=Asset&{id:string;vertices:number;max_height_m?:number;bbox:BBox;lod:1|2|3;tile_key:string};
type Manifest={max_model_height_m?:number;schema_version:1;city:string;source_snapshot:string;source_pbf_sha256:string;compiler_sha256:string;source?:{url?:string;attribution?:string};geometry_lod_aliases?:[1,2,3];actual_geometry_lod?:1;city_boundary:Asset;index_type?:'partitioned-city3d-v1';partitions?:ThreeDPartition[];shards:Shard[]};
const HASH=/^[a-f0-9]{64}$/;
const pathValid=(s:unknown):s is string=>typeof s==='string'&&s.length<=512&&/^\/safety\/(?:buildings3d\/[A-Za-z0-9_.\/-]+|environment\/[a-z-]+\/[A-Za-z0-9_.-]+)$/.test(s)&&!s.split('/').some(x=>x==='.'||x==='..');
function assetValid(a:Asset,max:number){return a&&pathValid(a.path)&&HASH.test(a.sha256)&&Number.isSafeInteger(a.bytes)&&a.bytes>0&&a.bytes<=max&&(a.compression===undefined?a.uncompressed_bytes===undefined&&a.uncompressed_sha256===undefined:a.compression==='gzip'&&Number.isSafeInteger(a.uncompressed_bytes)&&a.uncompressed_bytes!>0&&a.uncompressed_bytes!<=1024**2&&(a.uncompressed_sha256===undefined||HASH.test(a.uncompressed_sha256)));}
function bboxValid(b:BBox){return Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=-180&&b[2]<=180&&b[1]>=-85&&b[3]<=85&&b[0]<=b[2]&&b[1]<=b[3];}
const overlap=(a:BBox,b:BBox)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
function parseManifest(v:unknown,city:string):Manifest{
 const m=v as Manifest;if(m?.max_model_height_m!==undefined&&!validModelHeight(m.max_model_height_m))throw Error('Invalid city3D display height');if(!m||m.schema_version!==1||m.city!==city||!m.source_snapshot||!HASH.test(m.source_pbf_sha256)||!HASH.test(m.compiler_sha256)||!assetValid(m.city_boundary,4*1024**2)||(m.index_type==='partitioned-city3d-v1'?(!Array.isArray(m.partitions)||m.partitions.length>2048):(!Array.isArray(m.shards)||m.shards.length>50000)))throw Error('Invalid city3D manifest');
 if(m.index_type==='partitioned-city3d-v1'){m.shards=[];const ids=new Set<string>();for(const p of m.partitions!){if(!p.id||ids.has(p.id)||(p.max_height_m!==undefined&&!validModelHeight(p.max_height_m))||!assetValid(p,1024**2)||!bboxValid(p.bbox))throw Error('Invalid3D partition descriptor');ids.add(p.id);}}
 if(m.geometry_lod_aliases!==undefined&&(JSON.stringify(m.geometry_lod_aliases)!=='[1,2,3]'||m.actual_geometry_lod!==1||m.shards.some(s=>s.lod!==1)))throw Error('Invalid city3D detail alias');
 const seen=new Set<string>();for(const s of m.shards){if(typeof s.tile_key!=='string'||!s.tile_key||s.tile_key.length>256||!s.id||seen.has(s.id)||!assetValid(s,1024**2)||!bboxValid(s.bbox)||![1,2,3].includes(s.lod)||!Number.isSafeInteger(s.vertices)||s.vertices<0||s.vertices>200000||(s.max_height_m!==undefined&&!validModelHeight(s.max_height_m)))throw Error('Invalid city3D shard');seen.add(s.id);}return m;
}
function parseBoundary(v:any,city:string,sourceHash:string){if(v?.type==='FeatureCollection'&&(v.city!==city||v.source_pbf_sha256!==sourceHash||!Array.isArray(v.features)||v.features.length!==1))throw Error('Invalid city3D boundary binding');const g=v?.type==='FeatureCollection'?v.features[0]?.geometry:v?.geometry??v;if(!g||!['Polygon','MultiPolygon'].includes(g.type))throw Error('Invalid city3D boundary');let count=0;const scan=(a:any):void=>{if(!Array.isArray(a))throw Error('Invalid city3D boundary');if(typeof a[0]==='number'){if(++count>200000||a.length<2||!a.every(Number.isFinite)||Math.abs(a[0])>180||Math.abs(a[1])>85)throw Error('Invalid city3D boundary');}else a.forEach(scan);};scan(g.coordinates);return g;}
const decoded=(b:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
async function checkedBytes(bytes:Uint8Array,a:Pick<Asset,'bytes'|'sha256'>,signal:AbortSignal){signal.throwIfAborted();if(bytes.byteLength!==a.bytes)throw Error('3D asset byte mismatch');const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer));signal.throwIfAborted();if([...digest].map(n=>n.toString(16).padStart(2,'0')).join('')!==a.sha256)throw Error('3D asset hash mismatch');return bytes;}
async function checked(bytes:Uint8Array,a:Asset,signal:AbortSignal){await checkedBytes(bytes,a,signal);return decodeBounded3DAssetJSON(bytes,a,signal);}
// Bootstrap JSON parse working set, admitted from the delivered size before any
// part of it exists: the SHA-256 input copy plus WebCrypto's own copy, an
// optional gzip input copy/stream chunks/output/raw-digest copy, the UTF-16
// text and the parsed graph. Under estimateRetainedBuildingPayload's model the
// densest JSON, `[{},{},...]`, accounts 72 bytes (object 64 + slot 8) per 3
// input bytes, so 24 bytes per raw byte plus one container bounds any parse.
const BOOTSTRAP_JSON_EXPANSION=24;
function bootstrapParseCosts(bytes:{readonly byteLength:number},asset:ThreeDCompressionDescriptor,label:string):ResourceBudgetCost[]{const physical=bytes.byteLength,gzip=asset.compression==='gzip',raw=gzip?asset.uncompressed_bytes!:physical;return[{category:'construction' as const,bytes:2*physical,precision:'estimate' as const,label:label+' SHA-256 input copies'},...(gzip?[{category:'inflate' as const,bytes:physical+3*raw,precision:'estimate' as const,label:label+' gzip input copy, stream chunks, output and digest copy'}]:[]),{category:'construction' as const,bytes:2*raw,precision:'estimate' as const,label:label+' UTF-16 text upper bound'},{category:'decoded' as const,bytes:BOOTSTRAP_JSON_EXPANSION*raw+64,precision:'estimate' as const,label:label+' parsed JSON upper bound'}];}
// A parsed value the manager keeps, charged once under its own identity.
const bootstrapRetainedCost=(value:object,label:string):ResourceBudgetCost=>({category:'metadata',bytes:estimateRetainedBuildingPayload(value).retainedPayloadEstimateBytes,precision:'estimate',identity:value,label:label+' retained estimate'});
/** Owns one camera transition and bounded city-only source loading. The mesh compiler remains offline. */
export function installThreeDimensionalMap(options:{buildingFocus?:BuildingFocusRuntime;getModelViewProjection?:()=>ModelViewProjectionSnapshot|undefined;detailRuntime?:ReturnType<typeof createBuildingDetailRuntime>;runVisiblePreparation?:VisiblePreparationRun;nativeSources?:NativeSourceClient;resourceStore?:ChunkResourceStore;acquireBytes?:ResourceBytesAcquire;map:MapView;city:string;fetchBytes:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;onState?:(s:ThreeDControlState)=>void;onNativeGroupDisplay?:(plan:NativeGroupDisplayPlan)=>void;onRenderer?:(renderer:ReturnType<typeof import('./building-mesh-renderer').createBuildingMeshRenderer>)=>void;mobile?:boolean;manageCamera?:boolean}){
 const {map,city}=options;const mobile=options.mobile??matchMedia('(max-width:760px)').matches;
 const maxVisible=mobile?64:128,maxBytes=mobile?4*1024**2:8*1024**2,maxVertices=mobile?100000:200000;
 const reservedAppearanceVertices=reichstagAppearanceVertexReservation(city),nativeAdmissionVertexLimit=maxVertices-reservedAppearanceVertices;
 let preparingTicket:number|undefined,cameraMotionTicket:number|undefined,ownCameraStartingTicket:number|undefined;
 let pageHidden=pageIsHidden();
 const modeRequests=createViewportRequestContinuation(()=>pageHidden||Boolean(map.isMoving?.()));
 modeRequests.setHidden(pageHidden);
 let lastError:string|undefined;let wantedMode:ThreeDViewMode='2d';
 let lastReadyGeneration:number|undefined,lastReadyTicket:number|undefined;
 let nativeGroupDisplay:NativeGroupDisplayPlan={hiddenOutlines:[],groups:[],errors:[]};
 function showNativeGroupDisplay(value:NativeGroupDisplayPlan){nativeGroupDisplay=value;options.onNativeGroupDisplay?.(value);}
 let readyHandoff:{generation:number;sourceContentKeys:readonly string[];nativeGroupDisplay:NativeGroupDisplayPlan;visibleRetainedEstimateBytes:number;selectedShardIds:string[];partial:boolean}|undefined;
 function rememberReadyHandoff(targetGeneration:number){publishSourceDemand();publishedSourceContentKeys=stagedSourceContent();readyHandoff={generation:targetGeneration,sourceContentKeys:publishedSourceContentKeys,nativeGroupDisplay,visibleRetainedEstimateBytes,selectedShardIds:[...selectedShardIds],partial};}
 function clearReadyHandoff(){publishedSourceContentKeys=[];readyHandoff=undefined;lastReadyGeneration=undefined;lastReadyTicket=undefined;}
 function restoreReadyHandoff(){const value=readyHandoff;if(!value||renderer?.getRevision().generation!==value.generation)return false;publishedSourceContentKeys=value.sourceContentKeys;visibleRetainedEstimateBytes=value.visibleRetainedEstimateBytes;selectedShardIds=[...value.selectedShardIds];partial=value.partial;showNativeGroupDisplay(value.nativeGroupDisplay);return true;}
 let managerReadiness:(ResidentDrawObservation&{recordedAtMs:number;performanceTimeOriginMs:number;registered:boolean;expectedGeneration:number|undefined;actuallyPublishedGeneration:number|undefined;mainReady:boolean})|undefined;
 function observeDraw(value:ResidentDrawObservation,ticket:number,expectedGeneration:number|undefined,registered:boolean){if(destroyed||ticket!==revision)return;const actuallyPublishedGeneration=renderer?.getRevision().generation,mainReady=value.phase==='ready'&&value.snapshot.pickReady===true&&registered&&expectedGeneration!==undefined&&actuallyPublishedGeneration===expectedGeneration;managerReadiness={...value,recordedAtMs:performance.now(),performanceTimeOriginMs:performance.timeOrigin,registered,expectedGeneration,actuallyPublishedGeneration,mainReady};if(mainReady){lastReadyGeneration=expectedGeneration;lastReadyTicket=ticket;rememberReadyHandoff(expectedGeneration!);}}
 let mode:ThreeDViewMode='2d',destroyed=false,suspended=false,revision=0,generation=0,manifest:Manifest|undefined,boundary:any,request=new AbortController();
 let partitions:ReturnType<typeof installThreeDimensionalPartitions>|undefined;
 let renderer:ReturnType<typeof import('./building-mesh-renderer').createBuildingMeshRenderer>|undefined;
 // Surface/diffuse helper text held by this renderer, leased from the page budget until its teardown
 // returns; a teardown that throws may leave the renderer holding the text, so its claim stays charged.
 let facadeHelpers:FacadeHelperSourceLease|undefined;
 // This manager's lease on the page's one shared parsed manifest and boundary,
 // from its commit until teardown; the last lease returns their retained estimate.
 let bootstrapRetained:{readonly bytes:number;release():void}|undefined;
 let overviewReleased=false,adoptedDetailGeneration:number|undefined,publishedDetailGeneration:number|undefined,adoptedDetailSignal:AbortSignal|undefined;let adoptedDetailLevels:BuildingDetailResource['level'][]=[],publishedDetailLevels:BuildingDetailResource['level'][]=[];
 let active=0,peak=0,loadCount=0,partial=false,visibleRetainedEstimateBytes=0,stagingRetainedEstimateBytes=0,stagingTicket=0,selectedShardIds:string[]=[];
 const retainedShardCost=new WeakMap<BuildingComponent[],number>();
 let manifestSHA='';const sourceLeafByFeature=new WeakMap<object,string>();
 const sourceContentByShard=new Map<string,string>();
 let publishedSourceContentKeys:readonly string[]=[];let publishedSolarCoverageBounds:SolarWorldBounds|undefined,publishedSolarCoverageGeneration:number|undefined;
 // Verified source/detail authority is content identity; a view or request is not.
 function sourceContentKey(leaf:Shard,detail?:{resource:BuildingDetailResource}){
  const resource=detail?.resource,asset=resource?.descriptor??leaf;
  return JSON.stringify(['building-source-v1',city,manifestSHA,manifest!.source_pbf_sha256,manifest!.city_boundary.sha256,manifest!.compiler_sha256,manifest!.source_snapshot,leaf.tile_key,leaf.sha256,manifest!.actual_geometry_lod??leaf.lod,asset.sha256,asset.bytes,asset.compression??null,asset.uncompressed_sha256??null,asset.uncompressed_bytes??null,resource?[resource.level,resource.geometrySHA256,resource.bindings.materialSHA256,resource.bindings.producerSHA256,resource.bindings.protectionSHA256,resource.bindings.sourceEquivalenceSHA256,resource.maxErrorM,resource.groupMetadata?[resource.groupMetadata.sha256,resource.groupMetadata.bytes,resource.groupMetadata.compression??null,resource.groupMetadata.uncompressed_sha256??null,resource.groupMetadata.uncompressed_bytes??null]:null]:null]);
 }
 function stagedSourceContent(){return [...new Set(selectedShardIds.map(id=>sourceContentByShard.get(id)).filter((key):key is string=>key!==undefined))].sort();}

 const retainedComponentCost=new WeakMap<BuildingComponent,number>();
 const shadowByShard=new WeakMap<BuildingComponent[],ReturnType<typeof shadowAdmissionForDecodedShard>>();
 const detailResourceKeyByRows=new WeakMap<BuildingComponent[],string>();

 const queue:{signal:AbortSignal;start:()=>void}[]=[];
 function pump(){if(destroyed)return;while(active<2&&queue.length){const next=queue.shift()!;next.start();}}
 function scheduled<T>(fn:()=>Promise<T>,signal:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{let started=false,settled=false;const task={signal,start:()=>{if(signal.aborted){abort();return;}started=true;active++;peak=Math.max(peak,active);fn().then(v=>{if(!settled){settled=true;resolve(v);}},e=>{if(!settled){settled=true;reject(e);}}).finally(()=>{signal.removeEventListener('abort',abort);active--;pump();});}};function abort(){if(settled)return;settled=true;if(!started){const i=queue.indexOf(task);if(i>=0)queue.splice(i,1);}signal.removeEventListener('abort',abort);reject(new DOMException('Aborted','AbortError'));}signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}queue.push(task);pump();});}
 // One semaphore covers bootstrap and shard requests, including superseded work that has not settled.
 const fetchBounded=(path:string,signal:AbortSignal,max:number)=>scheduled(async()=>{for(let attempt=0;attempt<2;attempt++){try{return await options.fetchBytes(path,signal,max);}catch(error){if(signal.aborted)throw error;if(!(error instanceof Error&&error.name==='TypeError'&&!/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(error.message)&&(error as {code?:unknown}).code!=='RESOURCE_CONTRACT_VIOLATION')||attempt===1)throw new Error('3D asset '+path+': '+String(error));}}throw Error('Unreachable bounded3D read');},signal);
 // Bootstrap index, boundary and partition pages are page-ledger reads: the page
 // transport's exact byte lease when the page supplies one, otherwise the whole
 // two-copy read envelope is admitted before the raw read and shrinks to the
 // delivered buffer identity. A read stays charged until its last raw-byte use.
 // Every admission is made at once (manager-ensure-admission): a claim that could
 // fit only after other holders release throws ManagerAdmissionRetry once this
 // work has returned every claim it holds, so it waits holding nothing; an
 // invalidated request cancels its work and returns every claim.
 const bootstrapPressure=(label:string)=>{const pressure=resourceStore.budget.stats.lastPressure;return pressure?new ResourceBudgetExceededError(pressure):Error(label+' no longer fits the page budget');};
 // A claim that cannot coexist with the claims this request already holds can
 // never be admitted by waiting; it is reported as not fitting the page ledger.
 // refusedReadEnvelopes: per bootstrap path, the envelope a refused transport
 // delivery reported (its delivered buffer outgrew the read's own); the one retry
 // of that path admits it at once instead of the original size.
 const unfitBootstrap=(required:number,heldBytes:number,label:string)=>{const stats=resourceStore.budget.stats;return new ResourceBudgetExceededError({capacity:stats.limitBytes,required,current:stats.bytes,recentCapacity:stats.recentLimitBytes,recentRequired:stats.recentBytes,recentCurrent:stats.recentBytes,shortfallBytes:Math.max(0,required-stats.limitBytes),recentShortfallBytes:0,additionalBytes:Math.max(0,required-heldBytes),constraint:'total',label});},refusedReadEnvelopes=new Map<string,number>();
 /** Admits `costs` as one new claim, or replaces `claim`'s costs, at once. A refusal
  * leaves `claim` as it was, for the caller to release with everything else it
  * holds: not-fit when the costs cannot coexist with `heldBytes` inside the page
  * capacity, otherwise ManagerAdmissionRetry. It never waits. */
 function admitBootstrap(costs:readonly ResourceBudgetCost[],label:string,signal:AbortSignal,heldBytes=0,claim?:ResourceBudgetReservation):ResourceBudgetReservation{
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
  const budget=resourceStore.budget;
  if(claim){if(claim.adjust(costs))return claim;}else{const admitted=budget.tryReserve(costs,{label});if(admitted.ok)return admitted.reservation;}
  const required=heldBytes+costs.reduce((total,cost)=>total+cost.bytes,0);
  if(required>budget.stats.limitBytes)throw unfitBootstrap(required,heldBytes,label);
  throw new ManagerAdmissionRetry(required,label);
 }
 /** One bootstrap read. `stageBytes` (a descriptor's delivered bytes plus their
  * parse working set) widens its admission to max(envelope, stage), since the
  * envelope shrinks to the delivered buffer before that working set exists.
  * Through the page transport the read is caller-admitted: this request mints the
  * read's envelope (resourceByteAdmittedEnvelope), admits it with the stage beyond
  * it as one claim at once, and hands that claim to the transport with `keep`,
  * the costs that stay admitted beside the delivered buffer. The transport never
  * waits for capacity; its delivery replaces the claim's costs in place by
  * [...keep, delivered buffer], so a descriptor's working set needs no capacity
  * after its read. A delivery that outgrew the envelope is retried once, after a
  * wait holding nothing, with keep beside the delivered buffer's envelope; refused
  * again, or never fitting beside `heldBytes`, the read does not fit. A raw read
  * returns the claim of its two-copy envelope, which still covers its bytes. */
 async function acquireBounded(path:string,signal:AbortSignal,max:number,heldBytes=0,stageBytes=0,keep:readonly ResourceBudgetCost[]=[]):Promise<{bytes:Uint8Array;lease:ResourceBytesLease|undefined;claim:ResourceBudgetReservation|undefined}>{
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
  const label='3D bootstrap read '+path,acquire=options.acquireBytes;
  if(acquire){
   const refusedEnvelopeBytes=refusedReadEnvelopes.get(path);
   for(let attempt=0;attempt<2;attempt++){
    // One envelope per transport read; a retry after a refused delivery admits keep
    // beside the delivered buffer's envelope, never the original size again.
    const envelope=resourceByteAdmittedEnvelope(path,max,refusedEnvelopeBytes??0),envelopeBytes=envelope.reduce((total,cost)=>total+cost.bytes,0);
    const own:ResourceBudgetCost[]=refusedEnvelopeBytes!==undefined?[...keep]:stageBytes>envelopeBytes?[{category:'construction',bytes:stageBytes-envelopeBytes,precision:'estimate',label:path+' parse working set beyond its read envelope'}]:[];
    const required=heldBytes+envelopeBytes+own.reduce((total,cost)=>total+cost.bytes,0);
    if(required>resourceStore.budget.stats.limitBytes)throw unfitBootstrap(required,heldBytes,label+' beside held claims');
    const claim=admitBootstrap([...envelope,...own],label,signal,heldBytes);
    let lease:ResourceBytesLease;
    try{lease=await acquire(path,signal,max,{admitted:claim,envelope,keep});}
    catch(error){
     // The transport left the claim as it was and holds nothing of this read's.
     claim.release();
     if(signal.aborted)throw error;
     if(error instanceof ResourceBudgetExceededError&&(error as Partial<ResourceByteDeliveryRefusedError>).code==='RESOURCE_BYTE_DELIVERY_REFUSED'){
      const refused=error as ResourceByteDeliveryRefusedError,retry=heldBytes+refused.retryBytes;
      if(refusedEnvelopeBytes!==undefined||retry>resourceStore.budget.stats.limitBytes){refusedReadEnvelopes.delete(path);throw unfitBootstrap(retry,heldBytes,label+' delivered buffer');}
      refusedReadEnvelopes.set(path,refused.envelopeBytes);throw new ManagerAdmissionRetry(retry,label);
     }
     if(error instanceof ResourceBudgetExceededError)throw error;
     // A transient network failure that crossed the page store is a plain Error named
     // TypeError; the page transport's and ledger's own contract checks are TypeErrors
     // too, and a second read would only repeat or mask them, so they are never retried.
     if(!(error instanceof Error&&error.name==='TypeError'&&!/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(error.message)&&(error as {code?:unknown}).code!=='RESOURCE_CONTRACT_VIOLATION')||attempt===1)throw new Error('3D asset '+path+': '+String(error));
     continue;
    }
    refusedReadEnvelopes.delete(path);
    // Completion hands the lease to this caller; superseded work returns it.
    if(signal.aborted||destroyed){lease.release();claim.release();signal.throwIfAborted();throw new DOMException('Aborted','AbortError');}
    return{bytes:lease.bytes,lease,claim};
   }
   throw Error('Unreachable bounded3D read');
  }
  const envelope=resourceByteReadEnvelope(path,max),envelopeBytes=envelope.reduce((total,cost)=>total+cost.bytes,0);
  const beyond:ResourceBudgetCost[]=stageBytes>envelopeBytes?[{category:'construction',bytes:stageBytes-envelopeBytes,precision:'estimate',label:path+' parse working set beyond its read envelope'}]:[];
  const claim=admitBootstrap([...envelope,...beyond],label,signal,heldBytes);
  try{
   const bytes=await fetchBounded(path,signal,max);signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
   if(bytes.byteLength>max)throw Error('3D asset '+path+' exceeds its read limit');
   return{bytes,lease:undefined,claim};
  }catch(error){claim.release();throw error;}
 }
 /** Reads and parses one bootstrap JSON asset. A descriptor's delivered size lets
  * its read envelope and parse working set be admitted together before the read,
  * and the transport's delivery keeps that working set in the claim beside the
  * delivered buffer, so nothing grows after the read; the index, sized only once
  * read, admits its working set at once beside the exact read. The working set
  * precedes the SHA copy, text and parse; the raw read is released after its last
  * use and the caller shrinks or releases the claim. */
 async function parseBootstrap<T>(path:string,asset:ThreeDCompressionDescriptor&{bytes?:number},signal:AbortSignal,max:number,label:string,parse:(bytes:Uint8Array)=>Promise<T>,heldBytes=0):Promise<{value:T;claim:ResourceBudgetReservation}>{
  const size=asset.bytes,described=typeof size==='number'?bootstrapParseCosts({byteLength:size},asset,label):undefined;
  const stageSize=typeof size==='number'&&described?size+described.reduce((total,cost)=>total+cost.bytes,0):0;
  const read=await acquireBounded(path,signal,max,heldBytes,stageSize,described);
  let claim=read.claim;
  try{
   const bytes=read.bytes,working=bootstrapParseCosts(bytes,asset,label),exact:ResourceBudgetCost={category:'read',bytes:bytes.buffer.byteLength,precision:'exact',identity:bytes.buffer,label:path};
   // A transport lease charges the delivered bytes until it is released below, so
   // its claim keeps only the working set (for a descriptor, delivery already put it
   // there: this drops the buffer and never grows). A raw read keeps its exact bytes
   // in this claim until their last use.
   claim=admitBootstrap(read.lease?working:[exact,...working],label+' parse working set',signal,heldBytes+(read.lease?bytes.buffer.byteLength:0),claim);
   const value=await parse(bytes);signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
   if(!read.lease&&!claim.adjust(working))throw bootstrapPressure(label);
   return{value,claim};
  }catch(error){claim?.release();throw error;}finally{read.lease?.release();}
 }
 // The page store owns decoded values, pressure and recent retention. These
 // collections contain only live role tokens or scalar accounting metadata.
 const resourceStore=options.resourceStore??options.nativeSources?.resources??getPageChunkResourceStore({profile:mobile?'mobile':'desktop'});
 if(options.nativeSources&&options.nativeSources.resources!==resourceStore)throw Error('3D source/store page ownership mismatch');
 const ownedSourcePool=options.nativeSources?undefined:createSharedNativeSourcePool({read:fetchBounded,resourceStore,acquireBytes:options.acquireBytes});
 const sourceClient=options.nativeSources??ownedSourcePool!.client(city);
 let sourceValues=0;
 // Focus memory only (last admitted representations and the grace re-plan timer).
 // Without a configured registry nothing is created and behaviour is unchanged.
 const focusState=options.buildingFocus?.enabled?createBuildingFocusState({refresh:()=>requestDetailRefresh(),detailRuntime:options.detailRuntime}):undefined;
 function retireSourceClient(){if(destroyed&&sourceValues===0){sourceClient.destroy();ownedSourcePool?.destroy();}}
 type SourceResource={components:BuildingComponent[];packingComponents:BuildingComponent[];selectedResource:BuildingDetailResource|undefined;groups:BuildingDetailGroups|undefined;contentKey:string;selectedLOD:number|string;materialAuthority:string;recipeAuthority:string;release():void};
 const sourceMetrics=new Map<string,{bytes:number;inflatedBytes:number;retainedEstimateBytes:number}>();
 let mainSourceLeases:ChunkResourceLease<SourceResource>[]=[];
 const resourceKey=(contentKey:string)=>resourceContentKey('provider-source-v2','church',sourceClient.ownerKey,contentKey);
 type WantedSource={leaf:Shard;detail?:DetailSelection};
 const wantedSources=createWantedResourceLeases<WantedSource,SourceResource>({
  key:({leaf,detail})=>resourceKey(sourceContentKey(leaf,detail)),
  acquire:({leaf,detail})=>{
   const contentKey=resourceKey(sourceContentKey(leaf,detail));
   return resourceStore.acquire({contentKey,role:'source',allowRecent:false,
    estimate:{category:'metadata',bytes:256,precision:'estimate',identity:contentKey},
    produce:async context=>{sourceValues++;try{const value=await loadShard(leaf,context.signal,detail,context),release=value.release;let released=false;value.release=()=>{if(released)return;released=true;try{release();}finally{sourceValues--;retireSourceClient();}};return value;}catch(error){sourceMetrics.delete(contentKey);sourceValues--;retireSourceClient();throw error;}},
    costs:sourceResourceCosts,
    dispose:value=>{sourceMetrics.delete(contentKey);value.release();},
   });
  },
 });

 function sourceResourceCosts(value:SourceResource):ResourceBudgetCost[]{
  const rows=value.components,costs:ResourceBudgetCost[]=[{category:'metadata',bytes:512+rows.length*128+(shadowByShard.get(rows)?estimateRetainedBuildingPayload(shadowByShard.get(rows)).retainedPayloadEstimateBytes:0),precision:'estimate',identity:value}];
  const parentBuffers=new Set<ArrayBufferLike>(),ownedBuffers=new Set<ArrayBufferLike>();
  for(const row of rows)for(const batch of row.batches)for(const array of [batch.positions,batch.normals,batch.indices,batch.color])if(ArrayBuffer.isView(array))parentBuffers.add(array.buffer);
  for(const row of value.packingComponents)for(const batch of row.batches)for(const array of [batch.positions,batch.normals,batch.indices,batch.color])if(ArrayBuffer.isView(array)&&!parentBuffers.has(array.buffer)&&!ownedBuffers.has(array.buffer)){ownedBuffers.add(array.buffer);costs.push({category:'decoded',bytes:array.buffer.byteLength,precision:'exact',identity:array.buffer});}
  return costs;
 }
 function stableDisplayPacking(components:BuildingComponent[]){return supplementNurembergChurchDisplayRepairs(supplementNurembergStLudwigDisplay(supplementLeipzigChurchDisplay(supplementLeipzigRehbachDisplay(supplementMunichApprovedChurchDisplay(supplementSanktTheresiaDisplay(supplementStQuirinDisplay(components)))))));}
 function releaseMainSources(){const old=mainSourceLeases;mainSourceLeases=[];for(const lease of old)lease.release();}
 function clearSourceDemand(){focusState?.reset();wantedSources.reconcile([]);releaseMainSources();sourceContentByShard.clear();publishedSourceContentKeys=[];publishedSolarCoverageBounds=undefined;publishedSolarCoverageGeneration=undefined;}
 function publishSourceDemand(){
  const next:ChunkResourceLease<SourceResource>[]=[],added:ChunkResourceLease<SourceResource>[]=[];let nextBounds:SolarWorldBounds|undefined;
  try{for(const key of stagedSourceContent()){const identity=resourceKey(key),old=mainSourceLeases.find(lease=>lease.contentKey===identity);const lease=old??wantedSources.retain(identity,'main');next.push(lease);if(!old)added.push(lease);}nextBounds=computePublishedSolarCoverageBounds(next);}
  catch(error){for(const lease of added)lease.release();throw error;}
  const old=mainSourceLeases;mainSourceLeases=next;publishedSolarCoverageBounds=nextBounds;publishedSolarCoverageGeneration=renderer?.getRevision().generation;for(const lease of old)if(!next.includes(lease))lease.release();
 }

 function computePublishedSolarCoverageBounds(leases:readonly ChunkResourceLease<SourceResource>[]){let bounds:SolarWorldBounds|undefined;for(const lease of leases){const resource=lease.value?.selectedResource;if(!resource)continue;const next=buildingDetailSolarCoverageBounds(resource.components,resource.maxErrorM);if(!next)throw Error('Published detail canonical solar coverage is invalid');bounds=mergeSceneSolarCoverageBounds(bounds,next);if(!bounds)throw Error('Published detail solar coverage union is invalid');}return bounds;}
 function getRequiredSolarCoverageBounds(){return publishedSolarCoverageGeneration===renderer?.getRevision().generation?publishedSolarCoverageBounds:undefined;}
 function getDetailSettlement(){
  const draw=renderer?.getDrawReadiness();
  return deriveSceneSolarDetailSettlement({
   active:!destroyed&&!suspended&&!pageHidden&&!request.signal.aborted&&mode==='3d'&&wantedMode==='3d'&&!!renderer,
   failed:detailSettlementFailed||!!draw?.failure,
   requestRevision:revision,readyRequestRevision:lastReadyTicket,
   generation:renderer?.getRevision().generation,readyGeneration:lastReadyGeneration,
   pending:detailRefreshPending||visibleLoadsPending>0||preparingTicket!==undefined||cameraMotionTicket!==undefined||ownCameraStartingTicket!==undefined||Boolean(map.isMoving?.())||modeRequests.refreshBlocked||draw?.ready!==true||draw.preparing,
   publicationGeneration:publishedSolarCoverageGeneration,publicationBounds:publishedSolarCoverageBounds,
  });
 }

 function publishedContentFor(component:BuildingComponent){for(const lease of mainSourceLeases){const value=lease.value;if(value?.components.some(row=>row.sourceFeature===component.sourceFeature||row.objectId===component.objectId&&row.partId===component.partId))return value.contentKey;}return undefined;}
 function sourceRoleStats(){let serializedBytes=0,inflatedJSONBytes=0,retainedPayloadEstimateBytes=0;const keys=new Set([...wantedSources.keys,...mainSourceLeases.map(lease=>lease.contentKey)]);for(const key of keys){const row=sourceMetrics.get(key);if(row){serializedBytes+=row.bytes;inflatedJSONBytes+=row.inflatedBytes;retainedPayloadEstimateBytes+=row.retainedEstimateBytes;}}return {resources:keys.size,wanted:wantedSources.keys.length,main:mainSourceLeases.length,serializedBytes,inflatedJSONBytes,retainedPayloadEstimateBytes,scope:'manager-held-source-roles-not-independent-cache'};}

 function shadowMetadataReserve(verified:unknown){const header=verified&&typeof verified==='object'?verified as {shadow_profile?:unknown;shadow_admitted_component_indices?:unknown}:undefined;return estimateRetainedBuildingPayload({profile:header?.shadow_profile,admitted:header?.shadow_admitted_component_indices}).retainedPayloadEstimateBytes*2;}
 function sourceChunkInput(components:readonly BuildingComponent[],parents:readonly ChunkResourceLease<SourceResource>[]):RendererChunkInput<BuildingComponent>{
  const groups:RendererSourceGroup<BuildingComponent>[]=[],assigned=new Set<BuildingComponent>();
  const identity=(row:BuildingComponent)=>JSON.stringify([row.objectId,row.partId]);
  const requested=new Map<string,BuildingComponent[]>();for(const component of components){const key=identity(component),rows=requested.get(key);if(rows)rows.push(component);else requested.set(key,[component]);}
  for(const parent of parents){
   const value=parent.value;if(!value)continue;
   const append=(source:readonly BuildingComponent[],groupIdentity:string,origin:readonly[number,number],authority:string,geometryRole?:'canonical'|'display-variant')=>{
    const matched:BuildingComponent[]=[];for(const input of source)for(const component of requested.get(identity(input))??[])if(!assigned.has(component)){assigned.add(component);matched.push(component);}
    if(!matched.length)return;const rows=[...source];
    const displayRecipe=rows.map(row=>row.displaySupplement?[row.displaySupplement.id,row.displaySupplement.sourceObjectId,row.displaySupplement.addedVertices,row.displaySupplement.addedTriangles]:null);
    const recipeAuthority=JSON.stringify([geometryRole?['church-verified-group-recipe-v1',manifest!.compiler_sha256,authority]:value.recipeAuthority,displayRecipe]);
    const contentKey=JSON.stringify(['church-source-pack-v1',geometryRole?groupIdentity:value.contentKey,geometryRole?null:groupIdentity,value.materialAuthority,recipeAuthority,rows.map(row=>[row.objectId,row.partId])]);
    groups.push({contentKey,components:rows,parents:[parent],frame:{origin,unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority},cohortKeys:[],materialAuthority:value.materialAuthority,recipeAuthority,selectedLOD:rows.some(row=>row.displaySupplement)?'source-derived-display':geometryRole??value.selectedLOD});
   };
   if(value.groups){for(const packing of value.groups.packingGroups)append(packing.componentIndices.map(index=>(value.packingComponents??value.components)[index]),packing.key,packing.anchor,JSON.stringify([value.groups.coordinateFrame,packing.authority]),packing.geometryRole);}
   else if(value.components.length)append(value.packingComponents??value.components,'full-verified-leaf',value.components[0].origin,JSON.stringify(['verified-full-leaf-frame-v1',value.contentKey]));
  }
  // Current approved display recipes preserve their canonical row lineage.
  // An unknown derived row needs its own producer authority, not an arbitrary
  // dependency on every wanted source or a frame selected by camera order.
  if(components.some(component=>!assigned.has(component)))throw Error('Unbound source-derived component authority');
  // This is the manager's existing atomic publication boundary. Producer
  // packing constraints remain constraints, not cross-leaf closure receipts.
  const members=groups.map(group=>group.contentKey).sort(),key=resourceContentKey('church-manager-publication-v2',members);
  return {store:resourceStore,groups:groups.map(group=>({...group,cohortKeys:[key]})),cohorts:members.length?[{key,members,authority:JSON.stringify(['existing-manager-semantic-publication',manifestSHA,manifest!.compiler_sha256])}]:[]};
 }

 type ChurchPackingValue={components:BuildingComponent[];sources:BuildingComponent[]};
 // These are the exact cross-source reads in the approved Church producers:
 // Theresia relation/way, Heinrich canopy/host and the three orientation hosts.
 const churchRecipeDependencies:readonly(readonly{objectId:string;partId?:string}[])[]=[
  [{objectId:'osm/way/1293381718'},{objectId:'osm/relation/17731590'}],
  [{objectId:'osm/way/362745315'},{objectId:'osm/way/25474858',partId:'osm/way/25474858/component/08579b3fc87e67c3d42d'}],
  [{objectId:'osm/way/116783687',partId:'osm/way/116783687/component/7764bbfe6cc071ddd9ec'},{objectId:'osm/way/116783686',partId:'osm/way/116783686/component/58f2a281833d13b414c4'}],
  [{objectId:'osm/way/219543999',partId:'osm/way/219543999/component/c72ca761632a2a855fe8'},{objectId:'osm/way/40951695',partId:'osm/way/40951695/component/297de4746dd28a933c04'}],
  [{objectId:'osm/way/1033635375',partId:'osm/way/1033635375/component/7ac4e61a3e929da74dc7'},{objectId:'osm/way/96955006',partId:'osm/way/96955006/component/7d93cb7a83f0d3b75848'}],
 ];
 async function prepareChurchPacking(scene:BuildingComponent[],parents:readonly ChunkResourceLease<SourceResource>[],signal:AbortSignal,held:ChunkResourceLease<ChurchPackingValue>[]){
  const allSources=parents.flatMap(parent=>parent.value?.components??[]),allInput=sourceChunkInput(allSources,parents),selected=sourceChunkInput(scene,parents),groups:RendererSourceGroup<BuildingComponent>[]=[];
  const same=(row:BuildingComponent,query:{objectId:string;partId?:string})=>row.city==='munich'&&row.objectId===query.objectId&&(query.partId===undefined||row.partId===query.partId);
  const identity=(row:BuildingComponent)=>JSON.stringify([row.objectId,row.partId]);
  const replacements=new Map<string,BuildingComponent>();
  try{
   for(const group of selected.groups){
    const closure=new Set<RendererSourceGroup<BuildingComponent>>([group]);
    for(const dependencies of churchRecipeDependencies)if(group.components.some(row=>dependencies.some(query=>same(row,query)))){
     for(const query of dependencies){const related=allInput.groups.filter(candidate=>candidate.components.some(row=>same(row,query)));if(!related.length)throw Error('Church source display dependency is not resident: '+JSON.stringify(query));for(const candidate of related)closure.add(candidate);}
    }
    const contributors=[...new Map([...closure].map(value=>[value.contentKey,value])).values()].sort((a,b)=>a.contentKey.localeCompare(b.contentKey)),sources=[...new Map(contributors.flatMap(value=>value.components).map(row=>[identity(row),row])).values()];
    const recipeAuthority=JSON.stringify(['church-approved-complete-source-display-v1',manifest!.compiler_sha256,contributors.map(value=>[value.contentKey,value.recipeAuthority,value.materialAuthority])]);
    const contentKey=JSON.stringify(['church-derived-packing-v1',group.contentKey,recipeAuthority]),privateKey=JSON.stringify([sourceClient.ownerKey,contentKey]);
    const own=new Set(group.components.map(identity)),dependencyParents=[...new Set(contributors.flatMap(value=>value.parents))];
    const lease=resourceStore.acquire<ChurchPackingValue>({contentKey:privateKey,role:'candidate',allowRecent:false,parents:dependencyParents,
     estimate:{category:'construction',bytes:1024+sources.reduce((n,row)=>n+row.batches.reduce((m,batch)=>m+batch.positions.length*8+batch.indices.length*4,0),0)+maxVertices*64,precision:'estimate'},
     produce:()=>({components:stableDisplayPacking(sources).filter(row=>own.has(identity(row))),sources}),
     costs:value=>sourceResourceCosts({components:value.sources,packingComponents:value.components} as SourceResource),
    });held.push(lease);
    await new Promise<void>((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(signal.reason??new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',abort,{once:true});void lease.ready.then(()=>{signal.removeEventListener('abort',abort);resolve();},error=>{signal.removeEventListener('abort',abort);reject(error);});if(signal.aborted)abort();});signal.throwIfAborted();
    const value=lease.value;if(!value)throw Error('Church derived packing retired before preparation');for(const row of value.components)replacements.set(identity(row),row);
    const origin=group.components[0].origin;
    groups.push({...group,contentKey,components:value.components,parents:[lease],frame:{origin,unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority:JSON.stringify(['church-source-derived-frame-v1',group.frame.authority,origin])},recipeAuthority,selectedLOD:value.components.some(row=>row.displaySupplement)?'source-derived-display':group.selectedLOD});
   }
   const members=groups.map(group=>group.contentKey).sort(),key=JSON.stringify(['church-existing-semantic-publication-v1',members]);
   return {components:scene.map(row=>{const replacement=replacements.get(identity(row));if(!replacement)throw Error('Church drawable has no complete source packing row');return replacement;}),chunkInput:{store:resourceStore,groups:groups.map(group=>({...group,cohortKeys:[key]})),cohorts:members.length?[{key,members,authority:JSON.stringify(['existing-manager-semantic-publication',manifestSHA,manifest!.compiler_sha256])}]:[]} as RendererChunkInput<BuildingComponent>};
  }catch(error){for(const lease of held)lease.release();held.length=0;throw error;}
 }
 async function shard(s:Shard,signal:AbortSignal,detail:DetailSelection|undefined,session:BuildingDetailSession|undefined,candidates:ChunkResourceLease<SourceResource>[]){
  const key=sourceContentKey(s,detail),value=await wantedSources.value(resourceKey(key),signal),rows=value.components;
  signal.throwIfAborted();candidates.push(wantedSources.retain(resourceKey(key),'candidate'));
  sourceContentByShard.set(s.id,key);
  if(detail){if(!session)throw Error('Missing building detail session');session.registerCached(detail.index,detail.resource);}
  return rows;
 }

 async function readBinaryAsset(asset:{path:string;bytes:number;sha256:string},signal:AbortSignal):Promise<Uint8Array>{if(!/^\/assets\/3d-materials\/[A-Za-z0-9_-]+\.png$/.test(asset.path)||asset.path.length>256||!HASH.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<=0||asset.bytes>128*1024)throw Error('Invalid3D material asset');signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');return checkedBytes(await fetchBounded(asset.path,signal,128*1024),asset,signal);}

 // A context-only pause may retain the completed request's material witnesses.
 // Other cancellations and every fresh visible() keep their original abort path.
 const recoveryResident=createRecoveryResidentReuse(()=>{
  if(!manifest||!renderer||mode!=='3d'||wantedMode!=='3d'||map.getZoom()<14.5||!renderer.residentVertexCount)return;
  const view=recoveryResidentView(map);if(!view)return;
  return{view,source:[city,manifestSHA,manifest.source_pbf_sha256,manifest.city_boundary.sha256,manifest.compiler_sha256,manifest.source_snapshot,...publishedSourceContentKeys],generation,rendererGeneration:renderer.getRevision().generation};
 });
 function current(signal:AbortSignal,ticket:number){signal.throwIfAborted();if(ticket!==revision||destroyed||suspended||pageHidden&&wantedMode==='3d')throw new DOMException('Aborted','AbortError');}
 function drawn(signal:AbortSignal,ticket:number,targetGeneration:number):Promise<void>{return waitForResidentDraw({map,signal,current:()=>current(signal,ticket),renderer:()=>renderer?{getDrawReadiness(){const readiness=renderer!.getDrawReadiness();return readiness.failure||renderer!.getRevision().generation===targetGeneration?readiness:{ready:false,preparing:true};}}:undefined,drawTimeoutMs:15000,observe:value=>{if(!signal.aborted)observeDraw(value,ticket,targetGeneration,true);}});}
 let cameraReadiness:import('../../../safety/resident-draw-readiness').ResidentDrawObservation|undefined;
 async function moveCamera(signal:AbortSignal,ticket:number):Promise<void>{
  cameraMotionTicket=ticket;
  try{
   current(signal,ticket);ownCameraStartingTicket=ticket;
   try{map.easeTo({pitch:map.getZoom()>=15?45:map.getZoom()>=13?30:0,duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:300});}
   finally{ownCameraStartingTicket=undefined;}
   await waitForResidentDraw({map,signal,current:()=>current(signal,ticket),renderer:()=>({getDrawReadiness:()=>({ready:true,preparing:false})}),drawTimeoutMs:2000,observe:value=>{cameraReadiness=value;}});
  }finally{if(cameraMotionTicket===ticket)cameraMotionTicket=undefined;}
 }

 let detailSettlementFailed=false;
 function announce(status:ThreeDControlState['status']){if(['ready','partial','outside','overview'].includes(status)){lastError=undefined;detailSettlementFailed=false;}else if(status==='error')detailSettlementFailed=true;const value={mode,status};options.onState?.(value);return value;}
 async function ensure(signal:AbortSignal){
  if(!renderer){const [module,surface,windowModule,helperSource,diffuseModule]=await Promise.all([import('./building-mesh-renderer'),import('./building-surface-style'),import('./open-facade-window-texture'),import('../../../safety/facade-helper-source'),import('./open-facade-diffuse')]);signal.throwIfAborted();if(destroyed)throw Error('3D destroyed');const helpers=await helperSource.acquireFacadeHelperSource({budget:resourceStore.budget,baseSurfaceFragment:surface.BUILDING_SURFACE_FRAGMENT_GLSL,signal,owner:'church:'+city});try{signal.throwIfAborted();if(destroyed)throw Error('3D destroyed');renderer=module.createBuildingMeshRenderer(map,city,{id:'source-building-meshes-church',mobile,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,surfaceStyle:p=>diffuseModule.neutralSchematicFacadeStyle(p,surface.sourceSurfaceStyle(p)),baseSurfaceFragment:surface.BUILDING_SURFACE_FRAGMENT_GLSL,surfaceFragment:helpers.surfaceFragment,windowTexture:windowModule.createOpenFacadeWindowTexture({resourceStore,acquireBytes:options.acquireBytes,readBytes:readBinaryAsset,requestRepaint:()=>map.triggerRepaint()}),diffuseFragment:helpers.diffuseFragment,diffuseTexture:diffuseModule.createOpenFacadeDiffuse({resourceStore,acquireBytes:options.acquireBytes,readBytes:readBinaryAsset,requestRepaint:()=>map.triggerRepaint()})});}catch(error){helpers.release();throw error;}facadeHelpers?.release();facadeHelpers=helpers;options.onRenderer?.(renderer);const before=map.getStyle().layers?.find(l=>['scene-point-halo','scene-point','source-poi-reference-point','poi-center','poi-point','poi-association-label','kbo-navigation-point','kbo-navigation-label'].includes(l.id))?.id??map.getStyle().layers?.find(l=>l.type==='symbol')?.id;map.addLayer(renderer.layer as any,before);}
  if(manifest)return;
  // index.json and the city boundary are read and parsed once per page ledger and
  // city (manager-ensure-admission): the first waiting manager produces them for
  // every manager of the page, a waiting manager holds no claim, each stage is
  // admitted at once or waits holding nothing, and the parsed pair stays charged
  // once until its last manager returns its lease.
  for(;;){
   const shared=await acquireManagerBootstrap({budget:resourceStore.budget,key:JSON.stringify(['painted-3d-bootstrap-v1',city,'/safety/buildings3d/index.json']),signal,
    produce:async(attempt:AbortSignal)=>{
     let sha='';
     const indexParse=await parseBootstrap('/safety/buildings3d/index.json',{},attempt,1024**2,'3D manifest',async bytes=>{const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer));attempt.throwIfAborted();sha=[...digest].map(n=>n.toString(16).padStart(2,'0')).join('');return parseManifest(decoded(bytes),city);});
     let indexClaim:ResourceBudgetReservation|undefined=indexParse.claim;
     try{
      const value=indexParse.value,manifestCost=bootstrapRetainedCost(value,'3D manifest');if(!indexClaim.adjust(manifestCost))throw bootstrapPressure('3D manifest');
      const boundaryParse=await parseBootstrap(value.city_boundary.path,value.city_boundary,attempt,4*1024**2,'3D boundary',async bytes=>parseBoundary(await checked(bytes,value.city_boundary,attempt),city,value.source_pbf_sha256),indexClaim.bytes);
      // The boundary claim absorbs the manifest's same-identity estimate first, so
      // the hand-off never charges it twice and never needs new capacity.
      if(!boundaryParse.claim.adjust([manifestCost,bootstrapRetainedCost(boundaryParse.value,'3D boundary')])){boundaryParse.claim.release();throw bootstrapPressure('3D boundary');}
      indexClaim.release();indexClaim=undefined;
      return{value:{manifest:value,manifestSHA:sha,boundary:boundaryParse.value},claim:boundaryParse.claim};
     }finally{indexClaim?.release();}
    },
    solarBoundary:value=>({geometry:value.boundary,boundarySHA256:value.manifest.city_boundary.sha256})});
   try{
    const value=shared.value.manifest;
    // The lease returns with this boundary's solar index admitted and cached. The
    // page's two-entry index cache may evict it before this commit (a third
    // boundary hash on the page): the lease is then returned and the hand-off
    // runs again holding nothing, so the await below never waits beside the
    // lease and the renderer's synchronous preparation reaches the charged index.
    if(currentSolarShadowBoundary(value.city_boundary.sha256)){
     await admitSolarShadowBoundary({geometry:shared.value.boundary,boundarySHA256:value.city_boundary.sha256},{budget:resourceStore.budget,signal});signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
     if(currentSolarShadowBoundary(value.city_boundary.sha256)){bootstrapRetained?.release();bootstrapRetained=shared;manifestSHA=shared.value.manifestSHA;boundary=shared.value.boundary;manifest=value;renderer!.setSolarShadowBoundary({geometry:boundary,boundarySHA256:value.city_boundary.sha256});if(value.index_type==='partitioned-city3d-v1')partitions=installThreeDimensionalPartitions({city,sourceHash:value.source_pbf_sha256,boundaryHash:value.city_boundary.sha256,partitions:value.partitions!,mobile,
       // A page's working set is admitted with its read; its claim passes to the
       // partition owner as the cached rows' retained estimate until eviction or clear.
       read:(asset,signal)=>retryManagerAdmission(resourceStore.budget,signal,()=>parseBootstrap(asset.path,asset,signal,1024**2,'3D partition page',bytes=>checked(bytes,asset,signal))),
       validateLeaf:s=>Boolean(s.id&&s.tile_key&&assetValid(s,1024**2)&&bboxValid(s.bbox)&&[1,2,3].includes(s.lod)&&Number.isSafeInteger(s.vertices)&&s.vertices>=0&&s.vertices<=200000&&(s.max_height_m===undefined||validModelHeight(s.max_height_m)))});return;}
    }
   }catch(error){if(bootstrapRetained!==shared)shared.release();throw error;}
   shared.release();
  }
 }
 function recordSourceMetrics(key:string,_sha:string,components:BuildingComponent[],bytes:number,inflatedBytes:number,_detailKey?:string){sourceMetrics.set(resourceKey(key),{bytes,inflatedBytes,retainedEstimateBytes:retainedShardCost.get(components)??estimateRetainedBuildingPayload(components).retainedPayloadEstimateBytes});}
 async function loadShard(s:Shard,signal:AbortSignal,detail:DetailSelection|undefined,context:ChunkProductionContext){
  signal.throwIfAborted();const resource=detail?.resource,cacheKey=sourceContentKey(s,detail),transportSHA=resource?.descriptor.sha256??s.sha256,canonicalLeafSHA=resource?.canonicalLeafSHA256??s.sha256;
  const selected=detail?await options.detailRuntime!.acquireSelected(detail.resource,{signal}):undefined;
  const shared=selected?undefined:await sourceClient.acquire(s,signal,maxVertices,'dependency');
  let transferred=false;try{if(detail&&!buildingDetailSolarCoverageBounds(detail.resource.components,detail.resource.maxErrorM))throw Error('Selected detail canonical solar coverage is invalid');const opaque=selected?selected.retainResource?.('dependency'):shared?.retainResource('dependency');if(!opaque)throw Error('3D source dependency is not a page resource lease');try{context.retainParent(opaque);}finally{opaque.release();}const b=selected||shared?undefined:await fetchBounded(s.path,signal,1024**2);const verified=selected?selected.value.verified:shared?.verified??await checked(b!,s,signal);const raw=selected?selected.value.raw:shared?.raw??normalizeBuildingShard(verified,city,maxVertices,maxVertices);const physicalBytes=resource?.descriptor.bytes??shared?.physicalBytes??b!.byteLength;
  if(!context.adjust({category:'metadata',bytes:512+raw.components.length*512+shadowMetadataReserve(verified),precision:'estimate',identity:resourceKey(sourceContentKey(s,detail))}))throw resourceStore.budget.stats.lastPressure?new ResourceBudgetExceededError(resourceStore.budget.stats.lastPressure):Error('3D provider metadata admission budget exceeded');if(resource?.level==='near'&&resource.vertices!==s.vertices)throw Error('Canonical detail/manifest vertex mismatch');
const shadow=verified===undefined?undefined:shadowAdmissionForDecodedShard(verified,raw.components,city,manifest!.city_boundary.sha256);if(raw.schema_version!==1||raw.city!==city||!Array.isArray(raw.components)||raw.components.length>5000)throw Error('Invalid city3D shard body');let vertices=0,triangles=0;for(const c of raw.components){if(c.city!==city||c.componentGeometry?.type!=='Polygon'||!Array.isArray(c.batches))throw Error('Invalid city3D component');for(const batch of c.batches){vertices+=(batch.positions?.length??0)/3;triangles+=(batch.indices?.length??0)/3;}}if(vertices!==(resource?.vertices??s.vertices)||vertices>maxVertices||resource&&(triangles!==resource.triangles||triangles>maxVertices*2))throw Error('City3D selected-resource geometry count mismatch');if(s.max_height_m!==undefined){let actualMax=0;for(const c of raw.components)for(const batch of c.batches)for(let i=1;i<batch.positions.length;i+=3)actualMax=Math.max(actualMax,batch.positions[i]);if(actualMax>s.max_height_m+1e-6)throw Error('City3D display height bound mismatch');}signal.throwIfAborted();if(raw.decodedPayloadCost.retainedPayloadEstimateBytes>(mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop))throw Error('Decoded city3D shard exceeds retained payload budget');shadowByShard.set(raw.components,shadow);retainedShardCost.set(raw.components,raw.decodedPayloadCost.retainedPayloadEstimateBytes+(shadow?estimateRetainedBuildingPayload(shadow).retainedPayloadEstimateBytes:0));for(const c of raw.components)sourceLeafByFeature.set(c.sourceFeature,canonicalLeafSHA);loadCount++;if(resource)detailResourceKeyByRows.set(raw.components,resource.key);else detailResourceKeyByRows.delete(raw.components);recordSourceMetrics(cacheKey,transportSHA,raw.components,physicalBytes,resource?(resource.descriptor.uncompressed_bytes??physicalBytes):(s.uncompressed_bytes??physicalBytes),s.tile_key);let released=false;const value:SourceResource={components:raw.components as BuildingComponent[],packingComponents:raw.components as BuildingComponent[],selectedResource:detail?.resource,groups:selected?.value.groups,contentKey:sourceContentKey(s,detail),selectedLOD:detail?.resource.level??manifest!.actual_geometry_lod??s.lod,materialAuthority:detail?.resource.bindings.materialSHA256??s.sha256,recipeAuthority:JSON.stringify([manifest!.compiler_sha256,detail?.resource.bindings.producerSHA256??s.sha256,'church-source-display-v1']),release(){if(released)return;released=true;try{shared?.release();}finally{selected?.release();}}};if(!context.adjust(sourceResourceCosts(value)))throw resourceStore.budget.stats.lastPressure?new ResourceBudgetExceededError(resourceStore.budget.stats.lastPressure):Error('3D retained provider resource budget exceeded');transferred=true;return value;}catch(error){if(resource&&!signal.aborted&&!(error instanceof ResourceBudgetExceededError)&&!(error instanceof DOMException&&error.name==='AbortError'))throw Error('Selected detail resource admission failed ['+resource.key+']: '+String(error),{cause:error});throw error;}finally{if(!transferred){try{shared?.release();}finally{selected?.release();}}}}

 let visibleLoadsPending=0;
 // compositor F1, manager side (DECISIONS 2026-11-02 07:49): detailDemandHeld is
 // true only while every pending visible load of this manager is parked on a
 // page-ledger availability wake: its read with no staged or running commit while every
 // source no reader has taken yet is parked for capacity in the native source pool.
 // Queued, network, CPU, staging, gate or camera work makes it false, and so does
 // a pending refresh or mode request with no visible load. A parked state that
 // ends after detailDemandHeld was reported true (its removal, or a pool source
 // waking from its park: onUnparked) repaints the map once, so the
 // compositor, which stops requesting frames of its own while it reads true,
 // never waits on a silent frame loop.
 const detailDemand={probes:new Set<()=>boolean>(),reported:false,watch:undefined as (()=>void)|undefined,
  clear(){detailDemand.reported=false;const stop=detailDemand.watch;detailDemand.watch=undefined;stop?.();if(!destroyed)map.triggerRepaint();},
  park(parked:()=>boolean){detailDemand.probes.add(parked);let done=false;return()=>{if(done)return;done=true;detailDemand.probes.delete(parked);if(detailDemand.reported)detailDemand.clear();};},
  held(){if(destroyed||visibleLoadsPending<=0||detailDemand.probes.size!==visibleLoadsPending)return false;for(const parked of detailDemand.probes)if(!parked())return false;detailDemand.reported=true;if(!detailDemand.watch)detailDemand.watch=sourceClient?.onUnparked?.(()=>{if(detailDemand.reported&&!detailDemand.held())detailDemand.clear();});return true;}};
 async function visible(signal:AbortSignal,ticket:number,activate=false,notify=true){
  recoveryResident.invalidate();current(signal,ticket);visibleLoadsPending++;
  try{const run=()=>{current(signal,ticket);return visibleNow(signal,ticket,activate,notify,detailDemand);};return await (options.runVisiblePreparation?options.runVisiblePreparation(signal,run):run());}
  catch(error){if(error instanceof ChunkResourceContextLostError){if(ticket===revision)request.abort(error);throw error;}if(error instanceof StaleBuildingDetailDemandError&&ticket===revision&&!signal.aborted&&!destroyed){modeRequests.invalidateViewport(request);if(!map.isMoving?.()&&!modeRequests.settleViewport())queueMicrotask(()=>{if(ticket===revision&&!destroyed&&!map.isMoving?.())moved();});throw signal.reason;}throw error;}
  finally{visibleLoadsPending--;flushDetailRefresh();}
 }
 async function visibleNow(signal:AbortSignal,ticket:number,activate=false,notify=true,demand?:Parameters<NonNullable<NativeSourceClient['cohort']>>[0]){
  current(signal,ticket);if(!manifest||!renderer||mode!=='3d'&&!activate)throw Error('3D source is not prepared');
  const result=(status:ThreeDControlState['status'])=>{current(signal,ticket);return notify?announce(status):{mode,status};};
  const z=map.getZoom(),b=map.getBounds(),bounds:BBox=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
  const canvas=map.getCanvas(),camera={pitch:map.getPitch(),verticalFieldOfView:map.getVerticalFieldOfView(),aspectRatio:canvas.clientWidth/Math.max(1,canvas.clientHeight)};
  if(!Number.isFinite(z)||!bounds.every(Number.isFinite)||canvas.clientWidth<=0||canvas.clientHeight<=0||![camera.pitch,camera.verticalFieldOfView,camera.aspectRatio].every(Number.isFinite))return result('loading');
  // A configured focus registry must match the actual loaded source manifest.
  options.buildingFocus?.forIndex(manifestSHA);
  detailRefreshPending=false;
  // Keep regional information readable at overview scale. Detailed geometry is paid for only nearby.
  if(z<14.5){if(activate)return {mode,status:'overview' as const};if(!overviewReleased){clearReadyHandoff();renderer.setBatches([],++generation);adoptedDetailLevels=[];publishedDetailLevels=[];adoptedDetailGeneration=generation;publishedDetailGeneration=generation;adoptedDetailSignal=undefined;showNativeGroupDisplay({hiddenOutlines:[],groups:[],errors:[]});selectedShardIds=[];clearSourceDemand();partitions?.clear();visibleRetainedEstimateBytes=0;stagingRetainedEstimateBytes=0;partial=false;overviewReleased=true;}renderer.setEnabled(true);await drawn(signal,ticket,generation);return result('overview');}
  overviewReleased=false;
  const paged=partitions?await partitions.resolve(bounds,signal,camera,manifest.max_model_height_m):undefined;current(signal,ticket);
  const requestedLod:1|2|3=z>=18.5?3:z>=17?2:1,lod=manifest.geometry_lod_aliases?1:requestedLod;const candidates=(paged?.shards??manifest.shards).filter(s=>s.lod===lod&&modelHeightQuery(s,bounds,camera,manifest!.max_model_height_m).matches).sort((a,b)=>{const centre=map.getCenter();const distance=(s:Shard)=>Math.hypot((s.bbox[0]+s.bbox[2])/2-centre.lng,(s.bbox[1]+s.bbox[3])/2-centre.lat);return distance(a)-distance(b)||a.id.localeCompare(b.id);});
  const detailSelections=new Map<Shard,DetailSelection>();
  let bytes=0;const chosen:Shard[]=[];partial=paged?.partial??manifest.shards.some(s=>!modelHeightQuery(s,bounds,camera,manifest!.max_model_height_m).verified);
  for(const s of candidates){if(chosen.length>=maxVisible){partial=true;continue;}const index=await options.detailRuntime?.resolveDetailIndex(manifestSHA,s,{signal});current(signal,ticket);const resource=index?options.detailRuntime!.select(index).resource:undefined;if(resource&&(resource.bindings.sourcePBFSHA256!==manifest!.source_pbf_sha256||resource.bindings.boundarySHA256!==manifest!.city_boundary.sha256||resource.bindings.compilerSHA256!==manifest!.compiler_sha256||resource.bindings.sourceSnapshot!==manifest!.source_snapshot))throw Error('Detail/manifest SOURCE binding mismatch ['+resource.key+']');const effectiveBytes=resource?.descriptor.bytes??s.bytes;if(bytes+effectiveBytes>maxBytes){partial=true;continue;}if(index&&resource)detailSelections.set(s,{index,resource});chosen.push(s);bytes+=effectiveBytes;}

  const focusResolver=options.buildingFocus?.forIndex(manifestSHA);
  if(focusResolver){
   const frame=options.getModelViewProjection?.();if(!frame?.buildingFocus)throw Error('Church focus requires a current model-view frame');
   const known=[...new Map([...manifest.shards,...(paged?.shards??[])].map(leaf=>[leaf.id,leaf])).values()];
   // Out-of-window dependency members: their real descriptors come only from
   // their own index page through this manager's validated partition reader.
   const owner=partitions,resolveDescriptors=owner?async(requests:readonly BuildingFocusLocatedLeaf[],readSignal:AbortSignal)=>{const {leaves}=await owner.resolveLeaves(requests,readSignal);current(signal,ticket);return new Map(leaves.filter(leaf=>leaf.lod===lod).map(leaf=>[JSON.stringify([leaf.id,leaf.sha256]),leaf as Shard] as const));}:undefined;
   // Canonical-only files already are the available white-mesh representation;
   // a produced coarse/mid variant is the only simplified LOD that may be used.
   const focused=await applyBuildingFocus({provider:'Church',state:focusState!,resolver:focusResolver,frame,bounds,camera,chosen,canonical:known,ownerCohorts:[],ownerObjects:city==='munich'?churchRecipeDependencies:[],resolveDescriptors,
    display:{lists:[NATIVE_PART_DISPLAY_PROFILES],city,indexSHA:manifestSHA},budget:{maxVisible,maxBytes,maxVertices:nativeAdmissionVertexLimit},resourceStore,signal,
    detail:options.detailRuntime?{runtime:options.detailRuntime,bindings:detailSelections,previousLevel:()=>undefined,
     async resolve(leaf){const index=await options.detailRuntime!.resolveDetailIndex(manifestSHA,leaf,{signal});current(signal,ticket);if(index&&(index.bindings.sourcePBFSHA256!==manifest!.source_pbf_sha256||index.bindings.boundarySHA256!==manifest!.city_boundary.sha256||index.bindings.compilerSHA256!==manifest!.compiler_sha256||index.bindings.sourceSnapshot!==manifest!.source_snapshot))throw Error('Focus detail source binding mismatch');return index;}}:undefined,
    resourceKey:(leaf,binding)=>resourceKey(sourceContentKey(leaf,binding))});current(signal,ticket);
   chosen.splice(0,chosen.length,...focused.chosen);partial ||=focused.partial;
  }
  const wantedIds=new Set(chosen.map(leaf=>leaf.id));for(const id of sourceContentByShard.keys())if(!wantedIds.has(id))sourceContentByShard.delete(id);
  wantedSources.reconcile(chosen.map(leaf=>({leaf,detail:detailSelections.get(leaf)})));
  const sourceCandidates:ChunkResourceLease<SourceResource>[]=[];
  const results:(BuildingComponent[]|undefined)[]=[];const decodedCap=mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop;stagingTicket=ticket;stagingRetainedEstimateBytes=0;let index=0,finished=false,firstDrawPending=false;
  const publication=modeRequests.publication(signal,()=>{current(signal,ticket);if(pageHidden||wantedMode==='2d')throw new DOMException('Aborted','AbortError');});
  const subset=(original:BuildingComponent[],selected:BuildingComponent[])=>{if(selected===original)return selected;const resourceKey=detailResourceKeyByRows.get(original);if(resourceKey)detailResourceKeyByRows.set(selected,resourceKey);const sourceShadow=shadowByShard.get(original),ids=new Set(selected.map(c=>c.objectId+'|'+c.partId)),shadow=sourceShadow&&selected.length?{...sourceShadow,components:sourceShadow.components.filter(e=>ids.has(e.objectId+'|'+e.partId))}:undefined;shadowByShard.set(selected,shadow);let cost=32;for(const c of selected){let value=retainedComponentCost.get(c);if(value===undefined){value=estimateRetainedBuildingPayload(c).retainedPayloadEstimateBytes;retainedComponentCost.set(c,value);}cost+=value+8;}if(shadow)cost+=estimateRetainedBuildingPayload(shadow).retainedPayloadEstimateBytes;retainedShardCost.set(selected,cost);return selected;};
  const budgetRows=(original:BuildingComponent[],availableVertices:number,availableCost:number)=>{let count=0,cost=32;const selected:BuildingComponent[]=[],shadow=shadowByShard.get(original),shadowEntries=new Map(shadow?.components.map(e=>[e.objectId+'|'+e.partId,e])??[]);const commonShadowCost=shadow?estimateRetainedBuildingPayload(shadow.profile).retainedPayloadEstimateBytes:0;cost+=commonShadowCost;for(const c of [...original].sort((a,b)=>viewportComponentDistance(a,bounds)-viewportComponentDistance(b,bounds)||a.partId.localeCompare(b.partId))){const vertices=componentViewportRecord(c).vertices;let retained=retainedComponentCost.get(c);if(retained===undefined){retained=estimateRetainedBuildingPayload(c).retainedPayloadEstimateBytes;retainedComponentCost.set(c,retained);}const shadowEntry=shadowEntries.get(c.objectId+'|'+c.partId),next=retained+8+(shadowEntry?estimateRetainedBuildingPayload(shadowEntry).retainedPayloadEstimateBytes:0);if(count+vertices>availableVertices||cost+next+256>availableCost){partial=true;continue;}selected.push(c);count+=vertices;cost+=next;}let rows=subset(original,selected),retained=retainedShardCost.get(rows)!;while(rows.length&&retained+rows.length*8>availableCost){partial=true;count-=componentViewportRecord(selected.pop()!).vertices;rows=subset(original,selected);retained=retainedShardCost.get(rows)!;}return {rows,vertices:count,cost:retained+rows.length*8};};
  // Offscreen native components remain in page-owned source resources, outside staging/render buffers.
  // Admit real visible components under unchanged vertex and retained budgets, not whole leaf counts.
  const admit=(at:number,rows:BuildingComponent[])=>{current(signal,ticket);results[at]=subset(rows,viewportComponents(rows,bounds,camera));let retained=32,vertices=0;for(let i=0;i<chosen.length;i++){const item=results[i];if(!item)continue;const limited=budgetRows(item,nativeAdmissionVertexLimit-vertices,decodedCap-retained);results[i]=limited.rows;retained+=limited.cost;vertices+=limited.vertices;}stagingRetainedEstimateBytes=retained;};
  const detailKeysFor=(shown:readonly string[])=>{const keys=new Set<string>();for(let i=0;i<chosen.length;i++){const rows=results[i];if(!rows?.length||!shown.includes(chosen[i].id))continue;const key=detailResourceKeyByRows.get(rows);if(key)keys.add(key);}return[...keys];};
  const adoptDetail=(targetGeneration:number,resourceKeys:readonly string[],adoptionSignal:AbortSignal)=>{detailSession?.adopt({generation:targetGeneration,resourceKeys});if(renderer?.getRevision().generation===adoptedDetailGeneration){publishedDetailGeneration=adoptedDetailGeneration;publishedDetailLevels=adoptedDetailLevels;}adoptedDetailGeneration=targetGeneration;adoptedDetailSignal=adoptionSignal;const keys=new Set(resourceKeys);adoptedDetailLevels=[...detailSelections.values()].filter(value=>keys.has(value.resource.key)).map(value=>value.resource.level);};
  const settleDetailReady=(targetGeneration:number,ready:boolean,error?:unknown)=>{detailSession?.settleReady({generation:targetGeneration,ready,error});if(ready&&renderer?.getRevision().generation===targetGeneration&&adoptedDetailGeneration===targetGeneration){publishedDetailGeneration=targetGeneration;publishedDetailLevels=adoptedDetailLevels;}};
  const commitNow=async(attempt:ViewportPublicationAttempt)=>{
   const signal=attempt.signal;attempt.current();const visibleRenderer=renderer;if(!visibleRenderer)throw Error('church renderer is not installed');
   const derivedSourceLeases:ChunkResourceLease<ChurchPackingValue>[]=[];let drawRegistered=false,drawTargetGeneration:number|undefined,adoptedGeneration:number|undefined,prepared:Awaited<ReturnType<typeof visibleRenderer.prepareBatches>>|undefined;
   try{
   const drawCompletion=waitForResidentDraw({map,signal,current:()=>attempt.current(),renderer:()=>({getDrawReadiness(){if(!drawRegistered)return{ready:false,preparing:true};const readiness=visibleRenderer.getDrawReadiness();return readiness.failure||visibleRenderer.getRevision().generation===drawTargetGeneration?readiness:{ready:false,preparing:true};}}),drawTimeoutMs:15000,observe:value=>{if(attempt.isCurrent())observeDraw(value,ticket,drawTargetGeneration,drawRegistered);}});void drawCompletion.catch(()=>{});
   const cap=mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop,components:BuildingComponent[]=[],shown:string[]=[];let retainedEstimate=32;for(let i=0;i<chosen.length;i++){const rows=results[i];if(!rows)continue;const cost=retainedShardCost.get(rows);if(cost===undefined)throw Error('Missing decoded shard cost');const mergedContainer=rows.length*8;if(retainedEstimate+cost+mergedContainer>cap){partial=true;continue;}components.push(...rows);shown.push(chosen[i].id);retainedEstimate+=cost+mergedContainer;}const displayPacking=await prepareChurchPacking(components,sourceCandidates,signal,derivedSourceLeases);attempt.current();const displayComponents=displayPacking.components;const addedVertices=displayComponents.reduce((n,c)=>n+(c.displaySupplement?.addedVertices??0),0);retainedEstimate+=addedVertices*64;if(retainedEstimate>cap)throw Error('Display supplement exceeds retained payload budget');const nativePlan=nativePartDisplayPlan(displayComponents,NATIVE_PART_DISPLAY_PROFILES,{city,indexSHA:manifestSHA,sourcePBF:manifest!.source_pbf_sha256,boundarySHA:manifest!.city_boundary.sha256,sourceSnapshot:manifest!.source_snapshot,leafSHA:c=>sourceLeafByFeature.get(c.sourceFeature)});visibleRetainedEstimateBytes=retainedEstimate;const resourceKeys=displayComponents.length?detailKeysFor(shown):[];prepared=await visibleRenderer.prepareBatches(displayComponents,signal,displayPacking.chunkInput,{nativeDisplay:nativePlan});attempt.current();drawTargetGeneration=++generation;detailSession?.validateBeforeAdopt({resourceKeys});attempt.current();visibleRenderer.setBatches(displayComponents,drawTargetGeneration,mergeShadowAdmissions(chosen.filter(s=>shown.includes(s.id)).map(s=>{const rows=results[chosen.indexOf(s)];return rows?shadowByShard.get(rows):undefined;})),nativePlan,signal,prepared);attempt.current();adoptDetail(drawTargetGeneration,resourceKeys,signal);adoptedGeneration=drawTargetGeneration;drawRegistered=true;showNativeGroupDisplay(nativePlan);renderer!.setEnabled(true);selectedShardIds=shown;
   await drawCompletion;attempt.current();if(!drawRegistered||drawTargetGeneration===undefined||visibleRenderer.getRevision().generation!==drawTargetGeneration||!visibleRenderer.getDrawReadiness().ready)throw Error('church target generation is not draw-ready');settleDetailReady(drawTargetGeneration,true);
   if(!firstDrawPending){firstDrawPending=true;if(!finished)announce('loading');}
   }catch(error){if(drawTargetGeneration!==undefined)visibleRenderer.cancelCandidate(drawTargetGeneration);if(attempt.isCurrent())restoreReadyHandoff();if(adoptedGeneration!==undefined)settleDetailReady(adoptedGeneration,false,error);throw error;}finally{prepared?.releaseChunkDependencies();prepared?.release();for(const lease of derivedSourceLeases)lease.release();derivedSourceLeases.length=0;}
  };
  // Completed spatial batches appear while later requests continue. Bound uploads to one per50ms.
  // A staged commit (its timer) and a running one are CPU work, never parked demand.
  const staging={staged:false,commits:0},commit=(attempt:ViewportPublicationAttempt)=>{staging.staged=false;staging.commits++;return commitNow(attempt).finally(()=>{staging.commits--;});};
  const stage=()=>{if(finished||activate)return;publication.stage(commit,error=>{if(!publication.isCurrent())return;if(error instanceof StaleBuildingDetailDemandError&&ticket===revision&&!signal.aborted&&!destroyed){modeRequests.invalidateViewport(request);if(!map.isMoving?.()&&!modeRequests.settleViewport())queueMicrotask(()=>{if(ticket===revision&&!destroyed&&!map.isMoving?.())moved();});return;}lastError=String(error);announce('error');});};
  const detailSession=options.detailRuntime?.openSession({requestId:ticket,signal});
  const consumed=new Set<number>();
  const readers=runAbortableReaders(signal,[0,1].map(()=>async(readerSignal:AbortSignal)=>{while(index<chosen.length){readerSignal.throwIfAborted();const at=index++;const rows=await shard(chosen[at],readerSignal,detailSelections.get(chosen[at]),detailSession,sourceCandidates);current(readerSignal,ticket);consumed.add(at);if(finished)return;if(!activate){admit(at,rows);staging.staged=true;stage();}}}));
  // Parked while nothing is staged or committing and every source no reader has
  // taken yet waits for capacity in the pool.
  const unparkRead=demand?.park(()=>!staging.staged&&!staging.commits&&chosen.some((_,at)=>!consumed.has(at))&&chosen.every((leaf,at)=>consumed.has(at)||!detailSelections.has(leaf)&&sourceClient.parkedNeed?.(leaf)!==undefined));
  try{await readers;unparkRead?.();current(signal,ticket);if(mode!=='3d'&&!activate)throw new DOMException('Aborted','AbortError');
   const centre=map.getCenter(),outside=!chosen.length&&!containsPosition(boundary,[centre.lng,centre.lat]);
   // Preparation holds page-owned wanted leases before the camera transition.
   if(activate)return {mode,status:outside?'outside':partial?'partial':'ready'} as ThreeDControlState;
   current(signal,ticket);finished=true;await publication.finish(commit);current(signal,ticket);recoveryResident.complete();return result(outside?'outside':partial?'partial':'ready');
  }catch(error){detailSession?.fail(error);throw error;}finally{finished=true;try{await publication.close();}finally{results.length=0;detailSelections.clear();if(stagingTicket===ticket)stagingRetainedEstimateBytes=0;try{await Promise.allSettled([readers]);}finally{unparkRead?.();detailSession?.finish();for(const lease of sourceCandidates)lease.release();sourceCandidates.length=0;}}}
 }
 async function requestMode(next:ThreeDViewMode,external:AbortSignal,transition:boolean|ThreeDModeTransition=false):Promise<ThreeDControlState>{
  const skipCamera=transition===true||typeof transition==='object'&&transition?.skipCamera===true,retainPrograms=typeof transition==='object'&&transition?.retainPrograms===true;
  external.throwIfAborted();if(destroyed||suspended)throw new DOMException('Aborted','AbortError');
  recoveryResident.invalidate();wantedMode=next;request.abort();const previous=mode;
  return modeRequests.run(external,next==='3d',async own=>{
   if(destroyed||suspended)throw new DOMException('Aborted','AbortError');
   request.abort();request=own;const signal=own.signal,ticket=++revision;preparingTicket=next==='3d'?ticket:undefined;
   try{
    current(signal,ticket);if(next==='2d'){mode='2d';adoptedDetailLevels=[];publishedDetailLevels=[];adoptedDetailGeneration=undefined;publishedDetailGeneration=undefined;adoptedDetailSignal=undefined;renderer?.setEnabled(false);renderer?.suspendSelection();clearReadyHandoff();if(retainPrograms)renderer?.setBatches([],++generation,{retainPrograms:true} as never);else renderer?.setBatches([],++generation);showNativeGroupDisplay({hiddenOutlines:[],groups:[],errors:[]});clearSourceDemand();partitions?.clear();visibleRetainedEstimateBytes=0;stagingRetainedEstimateBytes=0;selectedShardIds=[];if(options.manageCamera!==false){map.stop();map.easeTo({pitch:0,duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:220});}return announce('ready');}
    await ensure(signal);current(signal,ticket);await visible(signal,ticket,true,false);current(signal,ticket);mode='3d';if(!skipCamera&&options.manageCamera!==false)await moveCamera(signal,ticket);current(signal,ticket);const result=await visible(signal,ticket,false,false);current(signal,ticket);return announce(result.status);
   }catch(error){if(signal.aborted||destroyed||ticket!==revision)throw error;lastError=String(error);restoreReadyHandoff();const keepReady=lastReadyTicket===ticket&&lastReadyGeneration!==undefined&&renderer?.getRevision().generation===lastReadyGeneration;mode=keepReady?'3d':previous;renderer?.setEnabled(mode==='3d');if(mode==='2d'){clearReadyHandoff();renderer?.setBatches([],++generation,{retainPrograms:true} as never);showNativeGroupDisplay({hiddenOutlines:[],groups:[],errors:[]});}announce('error');throw error;}finally{if(preparingTicket===ticket)preparingTicket=undefined;if(detailRefreshPending)map.triggerRepaint();}
  });
 }

 function pickingSources(point:{x:number;y:number}){
  const frame=options.getModelViewProjection?.();
  return mainSourceLeases.filter(lease=>{const resource=lease.value?.selectedResource;return !resource||buildingDetailMayContainPick(resource,point,origin=>modelProjectionAtOrigin(frame,origin));});
 }
 function retainSelectedSource(identity:{objectId:string;partId:string}):{contentKey:string;release():void}|undefined{
  const lease=mainSourceLeases.find(lease=>lease.value?.components.some(row=>row.objectId===identity.objectId&&row.partId===identity.partId)),value=lease?.value;
  if(value?.selectedResource&&value.selectedResource.level!=='near')throw Error('Selected source is not canonical detail');
  // A published DISPLAY keeps its packed graph, including recipe parents.
  // Hidden native selections retain their existing canonical SOURCE fallback.
  const packed=renderer?.retainPublishedSelection(identity);if(packed)return packed;
  if(!lease||!value)return;
  const pin=lease.retain('selected');return {contentKey:value.contentKey,release:()=>pin.release()};
 }
 async function prepareCanonicalPicking(point:{x:number;y:number},signal:AbortSignal):Promise<void>{
  signal.throwIfAborted();if(destroyed||suspended||pageHidden||mode!=='3d'||wantedMode!=='3d'||!options.detailRuntime||!renderer?.residentVertexCount)return;
  const before=options.getModelViewProjection?.(),candidates=pickingSources(point),pins:ChunkResourceLease<SourceResource>[]=[];
  try{
   for(const lease of candidates)pins.push(lease.retain('picking'));
   if(candidates.some(lease=>lease.value?.selectedResource&&lease.value.selectedResource.level!=='near')){
    await modeRequests.run(signal,true,async own=>{request.abort();request=own;const ticket=++revision;await visible(own.signal,ticket,false,false);current(own.signal,ticket);});
   }
   signal.throwIfAborted();const after=options.getModelViewProjection?.();
   if(before?.cameraKey&&after?.cameraKey&&before.cameraKey!==after.cameraKey)throw new DOMException('Picking camera superseded','AbortError');
   if(pickingSources(point).some(lease=>lease.value?.selectedResource&&lease.value.selectedResource.level!=='near'))throw Error('Canonical picking candidate did not publish canonical detail');
   if(!renderer.getDrawReadiness().ready)throw Error('Canonical picking target is not draw-ready');
  }finally{for(const pin of pins)pin.release();}
 }



 let detailRefreshPending=false;
 function requestDetailRefresh(){if(destroyed||wantedMode!=='3d')return;detailRefreshPending=true;map.triggerRepaint();}
 function flushDetailRefresh(){if(!detailRefreshPending||destroyed||suspended||pageHidden||mode!=='3d'||wantedMode!=='3d'||preparingTicket!==undefined||visibleLoadsPending>0||cameraMotionTicket!==undefined||ownCameraStartingTicket!==undefined||map.isMoving?.()||modeRequests.refreshBlocked)return;if(modeRequests.settleViewport())return;detailRefreshPending=false;moved();}
 const moveStarted=()=>{if(destroyed||suspended||pageHidden||modeRequests.refreshBlocked||ownCameraStartingTicket===revision||mode!=='3d'&&preparingTicket===undefined)return;recoveryResident.invalidate();if(options.buildingFocus?.enabled)focusState?.moveStarted(resourceStore);modeRequests.invalidateViewport(request);wantedSources.reconcile([]);revision++;announce('loading');if(mode!=='3d')renderer?.setEnabled(false);};
 const moved=()=>{if(destroyed||suspended||pageHidden||cameraMotionTicket===revision)return;if(modeRequests.settleViewport())return;if(mode!=='3d'){if(wantedMode==='3d')void requestMode('3d',new AbortController().signal).catch(()=>{});return;}request.abort();const own=request=new AbortController(),ticket=++revision;void visible(own.signal,ticket).catch(()=>{if(!destroyed&&!own.signal.aborted&&ticket===revision)announce('error');});};
 map.on('movestart',moveStarted);map.on('moveend',moved);map.on('render',flushDetailRefresh);

 return {getCameraReadinessDiagnostic:()=>cameraReadiness,getDrawReadinessDiagnostic:()=>managerReadiness?{...managerReadiness,renderer:renderer?.getReadinessDiagnostic()}:undefined,prepareCanonicalPicking,retainSelectedSource,getRequiredSolarCoverageBounds,getDetailSettlement,requestDetailRefresh,get detailDemandPending(){return detailRefreshPending||visibleLoadsPending>0||preparingTicket!==undefined;},get detailDemandHeld(){return detailDemand.held();},getSourceBinding(identity:{objectId:string;partId:string}){const c=renderer?.borrowSourceComponent(identity),leaf=c?sourceLeafByFeature.get(c.sourceFeature):undefined;if(!manifest||!c||!leaf)return undefined;return {city,objectId:c.objectId,partId:c.partId,sourcePBF:manifest.source_pbf_sha256,boundarySHA:manifest.city_boundary.sha256,nativeLeafSHA:leaf,contentKey:publishedContentFor(c)};},async readAsset(asset:string|Asset,signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions):Promise<unknown>{const path=typeof asset==='string'?asset:asset.path;if(!pathValid(path)||typeof asset!=='string'&&!assetValid(asset,max))throw Error('Invalid3D read asset');signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');/* A verified descriptor's own byte count is its read ceiling, so its read is sized by the asset, not by the caller's generic ceiling: limit=min(max, asset.bytes) for a descriptor, max for a plain path. Caller-admitted: each caller already holds its own claim for the integrity copy and the parse working set while it calls here; this reader admits nothing beside that claim and never waits holding it. With `admission` the caller has minted resourceByteAdmittedEnvelope(path, limit) and holds [...own costs, ...envelope] as one claim; it goes to the page transport unchanged ({admitted, envelope, keep}), whose delivery replaces the claim's costs in place by [...keep, delivered buffer] and which never waits for capacity, so this read takes no fetch slot (nothing queued behind a slot holds a claim). An abort, a failure or a refused delivery leaves that claim as it was and goes back to its caller unchanged, a transient TypeError included: that claim and envelope carried this one read, so only the caller can read again, with a newly minted envelope under its own admission. Without `admission` the transport's own envelope admission is the only wait, in this manager's fetch queue with the concurrency and disposal of its other fetches, and a lease delivered to an abandoned read is returned. Without the page transport the read is raw, under the caller's claim, which stays as it was. Either transport read holds its exact lease until decoding returns; the caller owns the value. */const limit=typeof asset==='string'?max:Math.min(max,asset.bytes),acquire=options.acquireBytes;if(!acquire){const bytes=await fetchBounded(path,signal,limit);return typeof asset==='string'?decoded(bytes):checked(bytes,asset,signal);}let lease:ResourceBytesLease;if(admission){lease=await acquire(path,signal,limit,admission);}else{let delivered:ResourceBytesLease|undefined,abandoned=false;lease=await scheduled(async(readSignal?:AbortSignal)=>{const own=readSignal??signal;for(let attempt=0;;attempt++){let read:ResourceBytesLease;try{read=await acquire(path,own,limit);}catch(error){if(own.aborted||error instanceof ResourceBudgetExceededError)throw error;if(!(error instanceof Error&&error.name==='TypeError'&&!/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(error.message)&&(error as {code?:unknown}).code!=='RESOURCE_CONTRACT_VIOLATION')||attempt===1)throw new Error('3D asset '+path+': '+String(error));continue;}if(own.aborted||destroyed){read.release();own.throwIfAborted();throw new DOMException('Aborted','AbortError');}delivered=read;if(abandoned){read.release();throw new DOMException('Aborted','AbortError');}return read;}},signal).catch((error:unknown)=>{abandoned=true;delivered?.release();throw error;});}try{signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');const bytes=lease.bytes;return typeof asset==='string'?decoded(bytes):await checked(bytes,asset,signal);}finally{lease.release();}},setPageHidden(value:boolean){if(pageHidden===value){renderer?.setPageHidden(value);return;}pageHidden=value;renderer?.setPageHidden(value);const pending=modeRequests.setHidden(value,request);if(value){recoveryResident.invalidate();revision++;}else if(!pending)moved();},setReducedMotion(value:boolean){renderer?.setReducedMotion(value);},requestMode,get wantedMode(){return wantedMode;},get sourceMetadata(){return manifest?{snapshot:manifest.source_snapshot,attribution:manifest.source?.attribution,url:manifest.source?.url}:undefined;},get mode(){return mode;},get renderer(){return renderer;},getRevision(){return renderer?.getRevision()??{generation,viewRevision:0};},setOpacityContext(value:'normal'|'route-selection'){renderer?.setOpacityContext(value);},cacheStats:()=>({visibleLoadsPending,lastError,managerReadiness,lastReadyGeneration,logicalLeafRequestGuard:maxVisible,visibleVertexLimit:maxVertices,reservedAppearanceVertices,nativeAdmissionVertexLimit,viewportBounds:(()=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];})(),mode,wantedMode,metadataPages:partitions?.stats,sourceRoles:sourceRoleStats(),tiles:sourceRoleStats().resources,bytes:sourceRoleStats().serializedBytes,physicalBytes:sourceRoleStats().serializedBytes,inflatedJSONBytes:sourceRoleStats().inflatedJSONBytes,retainedPayloadEstimateBytes:sourceRoleStats().retainedPayloadEstimateBytes,visibleRetainedPayloadEstimateBytes:visibleRetainedEstimateBytes,stagingRetainedPayloadEstimateBytes:stagingRetainedEstimateBytes,cachePlusVisibleConservativeEstimateBytes:sourceRoleStats().retainedPayloadEstimateBytes+visibleRetainedEstimateBytes,cacheVisibleStagingConservativeEstimateBytes:sourceRoleStats().retainedPayloadEstimateBytes+visibleRetainedEstimateBytes+stagingRetainedEstimateBytes,physicalShardFetchTransientMaxBytes:2*1024**2,measurement:'serialized-bytes-and-retained-payload-estimate-not-heap',active,peakConcurrency:peak,loadCount,visibleShardIds:selectedShardIds,partial,selected:renderer?.selected,revision:renderer?.getRevision(),renderer:renderer?.stats,rendererScreenSamples:renderer?.diagnosticScreenSamples(),zoom:map.getZoom(),pitch:map.getPitch(),queued:queue.length}),suspend(settings?:ContextRecoveryOptions){const keep=recoveryResident.suspend(settings?.contextRecovery===true&&!request.signal.aborted&&active===0&&queue.length===0&&preparingTicket===undefined&&cameraMotionTicket===undefined&&ownCameraStartingTicket===undefined&&visibleLoadsPending===0);suspended=true;if(!keep){modeRequests.cancel();revision++;request.abort();}renderer?.setEnabled(false);return keep;},resume(settings?:ContextRecoveryOptions){const keep=suspended&&recoveryResident.reuse(settings?.contextRecovery===true&&!request.signal.aborted&&active===0&&queue.length===0&&preparingTicket===undefined&&cameraMotionTicket===undefined&&ownCameraStartingTicket===undefined&&visibleLoadsPending===0);suspended=false;modeRequests.resume();renderer?.setEnabled(mode==='3d'&&!pageHidden);if(keep){map.triggerRepaint();return;}recoveryResident.invalidate();moved();},destroy(){if(destroyed)return;destroyed=true;focusState?.destroy();clearReadyHandoff();modeRequests.cancel();clearSourceDemand();wantedSources.destroy();retireSourceClient();showNativeGroupDisplay({hiddenOutlines:[],groups:[],errors:[]});revision++;request.abort();map.off('movestart',moveStarted);map.off('moveend',moved);map.off('render',flushDetailRefresh);partitions?.clear();visibleRetainedEstimateBytes=0;stagingRetainedEstimateBytes=0;if(renderer){if(map.getLayer(renderer.layer.id))map.removeLayer(renderer.layer.id);renderer.destroy();}facadeHelpers?.release();facadeHelpers=undefined;bootstrapRetained?.release();bootstrapRetained=undefined;}};
}
