import {StaleBuildingDetailDemandError} from '../../../safety/building-detail-runtime';
import {applyBuildingFocus,createBuildingFocusState,ownerFocusReplacements} from '../../../safety/building-focus-provider';
import type {BuildingFocusLocatedLeaf} from '../../../safety/building-focus-closure';
import {projectBuildingFocusCohort} from '../../../safety/building-focus-admission';
import type {BuildingFocusRuntime} from '../../../safety/building-focus-registry';
import {resourceContentKey} from '../../../safety/resource-content-key';
import {F154_RECONSTRUCTION_SHA,getRoot500Data as getF154RecoveredSourceData,retainF154RecoveredSourceResource} from './owner-f154-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {resourceByteAdmittedEnvelope,resourceByteReadEnvelope,type ResourceByteAcquireOptions,type ResourceByteDeliveryRefusedError,type ResourceBytesAcquire,type ResourceBytesLease} from '../../../safety/resource-byte-transport';
import type {FacadeHelperSourceLease} from '../../../safety/facade-helper-source';
import {buildingDetailSolarCoverageBounds,mergeSceneSolarCoverageBounds,type SolarWorldBounds} from '../../../safety/prospective-solar-projection';
import {buildingDetailMayContainPick} from '../../../safety/building-detail-demand';
import {deriveSceneSolarDetailSettlement} from '../../../safety/scene-solar-detail-settlement';
import {modelProjectionAtOrigin,type ModelViewProjectionSnapshot} from '../../../safety/model-view-projection';
import {F068_DERIVED_HEADER,root500DataRefs as f068DerivedRefs} from './owner-f068-derived-pack';
import {F075_DERIVED_HEADER,root500DataRefs as f075DerivedRefs} from './owner-f075-derived-pack';
import {F082_DERIVED_HEADER,root500DataRefs as f082DerivedRefs} from './owner-f082-derived-pack';
import {F107_DERIVED_HEADER,root500DataRefs as f107DerivedRefs} from './owner-f107-derived-pack';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {retainRendererChunkInput} from '../../../safety/renderer-chunk-input';
import type {RendererChunkInput,RendererSourceGroup} from '../../../safety/renderer-chunk-input';
import type {BuildingDetailSourceValue} from '../../../safety/building-detail-source';
import {getPageChunkResourceStore,ChunkResourceContextLostError} from '../../../safety/render-runtime/chunk-resource-store';
import {ResourceBudgetExceededError,type ResourceBudgetCost,type ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import {acquireManagerBootstrap,ManagerAdmissionRetry,retryManagerAdmission} from '../../../safety/manager-ensure-admission';
import {admitSolarShadowBoundary,currentSolarShadowBoundary} from '../../../safety/solar-shadow-admission';
import type {ChunkProductionContext,ChunkResourceLease,ChunkResourceRole,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import type {BuildingDetailSession,createBuildingDetailRuntime} from '../../../safety/building-detail-runtime';
import type {BuildingDetailDemandIndex,BuildingDetailResource} from '../../../safety/building-detail-demand';
import {createFrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataClient} from '../../../safety/frozen-data-lease-store';
import type {PreparedInfillBatches} from './building-mesh-renderer';
import type {OwnerInitializationWait} from '../../root500/safety/lazy-owner-route';
import {runAbortableReaders,createPreparedConsumerLifetime,createViewportRequestContinuation,createWantedResourceLeases,type ViewportPublicationAttempt} from '../../../safety/viewport-request';
import type {NativeSourceClient} from '../../../safety/shared-native-source';
import type {VisiblePreparationRun} from '../../../safety/visible-preparation-gate';
import {createRecoveryResidentReuse,recoveryResidentView,type ContextRecoveryOptions} from '../../../safety/recovery-resident-reuse';
import {prepareFrankfurtCohortSelection} from './frankfurt-cohort-residency';
import {f151CrownPlan} from './f151-crown-display';
import {ownerShapePatchFocusComponents,ownerShapePatchProfiles,ownerShapePatchProfile,verifyOwnerShapePatchRows,ownerShapePatchDisplayRows,ownerShapePatchMetadata,type OwnerShapePatchProfile} from './owner-shape-patch-display';
import {prepareSourceRoleDisplay,sourceRoleDisplayProfile} from './source-role-display';
import {createS434AggregateLifecycle} from './s434-aggregate-lifecycle';
import {prepareS434CohortSelection} from './s434-cohort-residency';
import {prepareF288CohortSelection} from './f288-cohort-residency';
import {s036NorthCofacePlan} from './s036-north-coface-display';
import {s402ConnectorPlan} from './s402-connector-display';
import {partialGateDisplayPlan} from './source-partial-gate-display';
import {sourceEdgeAssemblyDisplayPlan} from './source-edge-assembly-display';
import {SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES} from './source-edge-assembly-display-profiles';
import {s020RelationOutlineDisplayPlan,s020FullOriginalBatchRouteReady} from './s020-relation-outline-display';
import {S020_RELATION_OUTLINE_PROFILES} from './s020-relation-outline-profile';
import {progressiveAdmission} from './progressive-paint';
import {verifiedInteriorSourceHolds} from './native-interior-source-holds';
import {reichstagAppearanceVertexReservation} from './reichstag-appearance-budget';
import {s240BaseCofacePlan} from './s240-base-coface-display';
import {nativePartDisplayPlan,type NativeGroupDisplayPlan} from './native-part-display';
import {NATIVE_PART_DISPLAY_PROFILES} from './native-part-display-profiles';
import {modelHeightQuery,validModelHeight} from './three-dimensional-query';
import {viewportComponents,viewportComponentDistance,componentViewportRecord} from './three-dimensional-viewport';
import {shadowAdmissionForDecodedShard,mergeShadowAdmissions} from './source-shadow-binding';
import {installThreeDimensionalPartitions,type ThreeDPartition} from './three-dimensional-partitions';
import {decodeBounded3DAssetJSON,type ThreeDCompressionDescriptor} from './bounded-3d-gzip';
import {pageIsHidden} from './visible-readiness-deadline';
import {waitForResidentDraw} from '../../../safety/resident-draw-readiness';
import {estimateRetainedBuildingPayload,THREE_D_DECODED_PAYLOAD_LIMITS} from './building-payload-cost';
import type {Map as MapView} from 'maplibre-gl';
import {containsPosition} from './geography-position';
import type {BuildingComponent} from './building-mesh-renderer';
import type {ThreeDControlState,ThreeDViewMode} from './three-dimensional-controls';

type BBox=[number,number,number,number];
/** requestMode's third argument: `true` (a manager's own camera-less picking
 * refresh) or a transition; {retainPrograms:true} marks the page's automatic 2D
 * rollback of every provider. Every automatic 2D fallback (that rollback, or this
 * manager's own failed or timed-out 3D request or hand-off) passes the reason
 * {retainPrograms:true} as its empty batch's third argument, and as the second
 * argument of its earlier renderer.setEnabled(false) (call order unchanged), so the renderer can
 * keep the compiled programs for the retry; an explicit 2D switch, the overview
 * release and teardown pass none (cross-writer agreement, DECISIONS 2026-11-02
 * 01:35). Until a renderer consumes it, the value lands in its shadow-admission
 * slot, which rejects every value without a verified profile exactly as it
 * rejects undefined. */
type ThreeDModeTransition=Readonly<{skipCamera?:boolean;retainPrograms?:boolean}>;
type Asset=ThreeDCompressionDescriptor&{path:string;sha256:string;bytes:number};
type DetailBinding={index:BuildingDetailDemandIndex;resource:BuildingDetailResource};
type Shard=Asset&{id:string;vertices:number;max_height_m?:number;bbox:BBox;lod:1|2|3;tile_key:string};
type Manifest={max_model_height_m?:number;schema_version:1;city:string;source_snapshot:string;source_pbf_sha256:string;compiler_sha256:string;source?:{url?:string;attribution?:string};geometry_lod_aliases?:[1,2,3];actual_geometry_lod?:1;city_boundary:Asset;index_type?:'partitioned-city3d-v1';partitions?:ThreeDPartition[];shards:Shard[]};
// Decoded component instances are immutable within one visible task; callbacks for real aggregate changes still force a pack.
function sameStageComponents(a:readonly BuildingComponent[]|undefined,b:readonly BuildingComponent[]){return !!a&&a.length===b.length&&a.every((c,i)=>c===b[i]);}
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
let nextSourceOwner=0;
export function installThreeDimensionalMap(options:{buildingFocus?:BuildingFocusRuntime;acquireBytes?:ResourceBytesAcquire;getModelViewProjection?:()=>ModelViewProjectionSnapshot|undefined;resourceStore?:ChunkResourceStore;detailRuntime?:ReturnType<typeof createBuildingDetailRuntime>;runVisiblePreparation?:VisiblePreparationRun;nativeSources?:NativeSourceClient;frozenData?:FrozenDataClient;awaitPaintInitialization?:OwnerInitializationWait;paintInitializationSettled?:(signal:AbortSignal)=>Promise<void>;map:MapView;city:string;fetchBytes:(path:string,signal:AbortSignal,max:number)=>Promise<Uint8Array>;onState?:(s:ThreeDControlState)=>void;onNativeGroupDisplay?:(plan:NativeGroupDisplayPlan)=>void;onRenderer?:(renderer:ReturnType<typeof import('./building-mesh-renderer').createBuildingMeshRenderer>)=>void;mobile?:boolean;manageCamera?:boolean}){
 const {map,city}=options;const mobile=options.mobile??matchMedia('(max-width:760px)').matches;
 const maxVisible=mobile?64:128,maxBytes=mobile?4*1024**2:8*1024**2,maxVertices=mobile?100000:200000;
 const reservedAppearanceVertices=reichstagAppearanceVertexReservation(city),nativeAdmissionVertexLimit=maxVertices-reservedAppearanceVertices;
 let visibleLoadsPending=0,duplicatePackSkips=0,detailRefreshPending=false,detailSettlementFailed=false;
 let requiredSolarCoverageBounds:SolarWorldBounds|undefined,requiredSolarCoverageGeneration:number|undefined;
 let lastReadyTicket:number|undefined;
 let preparingTicket:number|undefined,cameraMotionTicket:number|undefined,ownCameraStartingTicket:number|undefined;
 let documentHidden=pageIsHidden(),viewportVisible=true,pageHidden=documentHidden;
 const modeRequests=createViewportRequestContinuation(()=>pageHidden||Boolean(map.isMoving?.()));
 modeRequests.setHidden(pageHidden);
 let drawReadiness:Record<string,unknown>|undefined;let lastError:string|undefined;let wantedMode:ThreeDViewMode='2d';
 let mode:ThreeDViewMode='2d',destroyed=false,suspended=false,revision=0,generation=0,manifest:Manifest|undefined,boundary:any,request=new AbortController();
 let partitions:ReturnType<typeof installThreeDimensionalPartitions>|undefined;
 let renderer:ReturnType<typeof import('./building-mesh-renderer').createBuildingMeshRenderer>|undefined;
 // Surface/diffuse helper text held by this renderer, leased from the page budget until its teardown
 // returns; a teardown that throws may leave the renderer holding the text, so its claim stays charged.
 let facadeHelpers:FacadeHelperSourceLease|undefined;
 // This manager's lease on the page's one shared parsed manifest and boundary,
 // from its commit until teardown; the last lease returns their retained estimate.
 let bootstrapRetained:{readonly bytes:number;release():void}|undefined;
 let residentPreparation:PreparedInfillBatches|undefined,releaseResidentPreparation:(()=>void)|undefined,preparedAdmissionKey:string|undefined;
 let lastPackedComponents:readonly BuildingComponent[]|undefined,lastPackedAggregateProfile:unknown,lastPackedAggregateDiagnostic='',lastPackedViewKey:string|undefined,lastPackedSourceRoles:readonly ReturnType<typeof sourceRoleDisplayProfile>[]|undefined;
 const preparedConsumers=createPreparedConsumerLifetime<PreparedInfillBatches>(prepared=>{if(residentPreparation===prepared)return;retireChunkInput(prepared);prepared.release?.();prepared.input=[];prepared.sourceComponents=[];prepared.displayComponents=[];prepared.reconstructed={...prepared.reconstructed,components:[],stats:{...prepared.reconstructed.stats,components:[]}};prepared.originalSourceVertices=0;prepared.originalSourceIndices=0;});
 function retirePreparedBatches(prepared:PreparedInfillBatches){preparedConsumers.retire(prepared);}
 function clearPreparedBatches(keep?:PreparedInfillBatches){const previous=residentPreparation;residentPreparation=undefined;preparedAdmissionKey=undefined;lastPackedComponents=undefined;lastPackedAggregateProfile=undefined;lastPackedAggregateDiagnostic='';lastPackedViewKey=undefined;lastPackedSourceRoles=undefined;const release=releaseResidentPreparation;releaseResidentPreparation=undefined;if(previous&&previous!==keep)retirePreparedBatches(previous);release?.();}
 function keepPreparedBatches(prepared:PreparedInfillBatches){const release=preparedConsumers.retain(prepared,()=>prepared.scope.retain());clearPreparedBatches(prepared);residentPreparation=prepared;releaseResidentPreparation=release;}

 let active=0,peak=0,loadCount=0,partial=false,visibleRetainedEstimateBytes=0,stagingRetainedEstimateBytes=0,stagingTicket=0,selectedShardIds:string[]=[];
 const retainedShardCost=new WeakMap<BuildingComponent[],number>();
 let sourceEdgeAssemblyDisplay:{groups:{groupIdentity:string;outline:{objectId:string;partId:string};partCount:number;complete:false}[];errors:string[]}={groups:[],errors:[]};
 const ownerProfileByComponent=new WeakMap<BuildingComponent,OwnerShapePatchProfile>();let ownerReconstruction=ownerShapePatchMetadata([],()=>undefined);
 // Focus memory only (last admitted representations and the grace re-plan timer).
 // Without a configured registry nothing is created and behaviour is unchanged.
 const focusState=options.buildingFocus?.enabled?createBuildingFocusState({refresh:()=>requestDetailRefresh(),detailRuntime:options.detailRuntime}):undefined;
 let manifestSHA='';const sourceLeafByFeature=new WeakMap<object,string>();const s434Aggregate=createS434AggregateLifecycle();
 const retainedComponentCost=new WeakMap<BuildingComponent,number>();
 const shadowByShard=new WeakMap<BuildingComponent[],ReturnType<typeof shadowAdmissionForDecodedShard>>();
 const adoptedDetailResources=new Map<string,BuildingDetailResource>();
 type SourceDescriptor={leaf:Shard;detail?:DetailBinding;contentKey:string};
 type SourceContent={contentKey:string;resourceKey:string;selectedResourceKey?:string;selectedLOD:string|number;materialAuthority:string;recipeAuthority:string;groups?:BuildingDetailSourceValue['groups'];components:BuildingComponent[];bytes:number;inflatedBytes:number;retainedEstimateBytes:number;ownedMetadataBytes:number;releaseDependency:(()=>void)|undefined};
 const resources=options.resourceStore??options.nativeSources?.resources??getPageChunkResourceStore({profile:mobile?'mobile':'desktop'});
 const sourceOwnerKey=options.nativeSources?.ownerKey??'infill:'+city+':'+String(++nextSourceOwner);
 if(options.nativeSources&&options.nativeSources.resources!==resources)throw Error('3D source and manager must share the page resource store');
 if(options.frozenData?.resources&&options.frozenData.resources!==resources)throw Error('3D recipes and manager must share the page resource store');
 const sourceDiagnostics=new Map<string,{bytes:number;inflatedBytes:number;retainedEstimateBytes:number}>();
 const mainSourceLeases=new Map<string,ChunkResourceLease<SourceContent>>();
 const wantedSources=createWantedResourceLeases<SourceDescriptor,SourceContent>({
  key:descriptor=>descriptor.contentKey,
  acquire:descriptor=>{const contentKey=descriptor.contentKey;let production:SourceDescriptor|undefined=descriptor;return resources.acquire<SourceContent>({contentKey,role:'source',allowRecent:false,
   estimate:{category:'metadata',bytes:256,precision:'estimate',label:'provider source binding before admitted metadata expansion'},
   async produce(context){const input=production;if(!input)throw Error('Building source production descriptor was retired');try{return await loadSourceContent(input.leaf,context,input.detail);}finally{production=undefined;}},
   costs:value=>({category:'metadata',bytes:value.ownedMetadataBytes,precision:'estimate',identity:value}),
   dispose(value){sourceDiagnostics.delete(contentKey);value.components=[];value.groups=undefined;const release=value.releaseDependency;value.releaseDependency=undefined;release?.();},
  });},
 });
 type ExplicitSourceBinding={objectId:string;partId:string;contentKey:string;tag:string;signature:string;kind:'patch'|'recovered';parent:ChunkResourceLease<unknown>};
 const mainExplicitSources=new Map<string,ExplicitSourceBinding>();
 let stagedExplicitSources:readonly ExplicitSourceBinding[]=[],stagedExplicitGeneration:number|undefined,stagedExplicitCurrent:(()=>boolean)|undefined,publishedExplicitGeneration:number|undefined;
 function clearExplicitSources(){for(const binding of mainExplicitSources.values())binding.parent.release();mainExplicitSources.clear();stagedExplicitSources=[];stagedExplicitGeneration=undefined;stagedExplicitCurrent=undefined;publishedExplicitGeneration=undefined;}
 function stageExplicitSources(input:RendererChunkInput<BuildingComponent>|undefined,nextGeneration:number,isCurrent:()=>boolean){
  const bindings:ExplicitSourceBinding[]=[];
  for(const group of input?.groups??[]){if(group.selectedLOD!=='explicit-derived-patch'&&group.selectedLOD!=='explicit-recovered-source')continue;for(const component of group.components){
   if(group.parents.length!==1)throw Error('Explicit source group has no single verified parent');
   if(group.selectedLOD==='explicit-recovered-source'){const authority=JSON.parse(group.contentKey) as unknown[];if(authority[0]!=='f154-recovered-source-group-v1'||authority[1]!==F154_RECONSTRUCTION_SHA||typeof authority[3]!=='string'||authority[4]!==component.objectId||authority[5]!==component.partId)throw Error('F154 explicit resource descriptor mismatch');bindings.push({objectId:component.objectId,partId:component.partId,contentKey:group.contentKey,tag:'F154PhotoEstimate',signature:authority[3],kind:'recovered',parent:group.parents[0]});}
   else{const patch=sourceAbsentPatches.find(patch=>patch.header.displayOnlyId===component.objectId);if(!patch)throw Error('Explicit source group has no verified patch descriptor');bindings.push({objectId:component.objectId,partId:component.partId,contentKey:group.contentKey,tag:patch.tag,signature:patch.header.patchSHA256,kind:'patch',parent:group.parents[0]});}
  }}
  stagedExplicitSources=bindings;stagedExplicitGeneration=nextGeneration;stagedExplicitCurrent=isCurrent;
 }
 function explicitSourceMatches(binding:ExplicitSourceBinding,component:{displayEstimates?:Record<string,unknown>}|undefined){const diagnostic=component?.displayEstimates?.[binding.tag] as {sourceAbsent?:unknown;patchSHA256?:unknown;sourceSignature?:unknown;nativeLeafAbsent?:unknown;recoveredExactFootprint?:unknown}|undefined;return binding.kind==='recovered'?diagnostic?.nativeLeafAbsent===true&&diagnostic.recoveredExactFootprint===true&&diagnostic.sourceSignature===binding.signature:diagnostic?.sourceAbsent===true&&diagnostic.patchSHA256===binding.signature;}
 function synchronizePublishedExplicitSources(){
  const actual=renderer?.getRevision().generation;if(actual===undefined||actual===publishedExplicitGeneration||actual!==stagedExplicitGeneration||!stagedExplicitCurrent?.()||!renderer?.getDrawReadiness().ready)return;
  const next=new Map<string,ExplicitSourceBinding>(),added:ChunkResourceLease<unknown>[]=[];
  try{for(const binding of stagedExplicitSources){const component=renderer.getComponent(binding);if(!component)continue;if(!explicitSourceMatches(binding,component))throw Error('Published explicit SOURCE identity mismatch');const key=JSON.stringify([binding.objectId,binding.partId]),previous=mainExplicitSources.get(key);if(previous?.contentKey===binding.contentKey)next.set(key,previous);else{const parent=binding.parent.retain('main');added.push(parent);next.set(key,{...binding,parent});}}}
  catch(error){for(const lease of added)lease.release();throw error;}
  for(const[key,binding]of mainExplicitSources)if(next.get(key)!==binding)binding.parent.release();mainExplicitSources.clear();for(const[key,binding]of next)mainExplicitSources.set(key,binding);publishedExplicitGeneration=actual;
 }
 function retainSelectedExplicitSource(identity:{objectId:string;partId:string}):{contentKey:string;release():void}|undefined{
  synchronizePublishedExplicitSources();const binding=mainExplicitSources.get(JSON.stringify([identity.objectId,identity.partId]));if(!binding)return;
  const component=renderer?.getComponent(identity);if(!explicitSourceMatches(binding,component))return;
  const contentKey=binding.contentKey;let selected:ChunkResourceLease<unknown>|undefined=binding.parent.retain('selected');return{contentKey,release(){const previous=selected;selected=undefined;previous?.release();}};
 }
  function retainSelectedSource(identity:{objectId:string;partId:string}):{contentKey:string;release():void}|undefined{
  // Enforce canonical native detail before taking any published CPU pin.
  for(const source of mainSourceLeases.values()){const value=source.value;if(!value?.components.some(component=>component.objectId===identity.objectId&&component.partId===identity.partId))continue;
   if(value.selectedLOD==='mid'||value.selectedLOD==='coarse')throw Error('Selected source requires published canonical detail');
   const packed=renderer?.retainPublishedSelection(identity);if(packed)return packed;
   const contentKey=value.contentKey;let selected:ChunkResourceLease<SourceContent>|undefined=source.retain('selected');
   return{contentKey,release(){const previous=selected;selected=undefined;previous?.release();}};
  }
  return renderer?.retainPublishedSelection(identity)??retainSelectedExplicitSource(identity);
 }
 function retainSourceContent(key:string,role:ChunkResourceRole){const resident=mainSourceLeases.get(key);return resident&&!resident.released?resident.retain(role):wantedSources.retain(key,role);}
 function publishSourceContent(keys:readonly string[]){
  const next=new Map<string,ChunkResourceLease<SourceContent>>();
  try{for(const key of keys)next.set(key,mainSourceLeases.get(key)??wantedSources.retain(key,'main'));}
  catch(error){for(const[key,lease]of next)if(mainSourceLeases.get(key)!==lease)lease.release();throw error;}
  for(const[key,lease]of mainSourceLeases)if(!next.has(key))lease.release();
  mainSourceLeases.clear();for(const[key,lease]of next)mainSourceLeases.set(key,lease);publishedContentKeys=keys.map(key=>{const value=next.get(key)!.value;if(!value)throw Error('Published source content has no live value');return value.contentKey;});
 }
 function clearSourceDemand(){focusState?.reset();clearExplicitSources();if(!destroyed)wantedSources.reconcile([]);for(const lease of mainSourceLeases.values())lease.release();mainSourceLeases.clear();publishedContentKeys=[];clearRequiredSolarCoverage();}
 function sourceStats(){const wanted=wantedSources.keys,keys=[...new Set([...wanted,...mainSourceLeases.keys()])],values=keys.flatMap(key=>{const value=sourceDiagnostics.get(key);return value?[value]:[];});return{tiles:keys.length,bytes:values.reduce((n,v)=>n+v.bytes,0),physicalBytes:null,inflatedJSONBytes:null,retainedPayloadEstimateBytes:values.reduce((n,v)=>n+v.retainedEstimateBytes,0),wantedContentKeys:wanted,publishedContentKeys,sourceRoles:wanted.length,mainSourceRoles:mainSourceLeases.size,resourceBudget:resources.budget.stats,measurement:'descriptor-bytes-and-logical-page-budget-not-retained-raw-or-heap'};}
 // Content authority is independent of viewport/request and GPU incarnation.
 // These maps contain scalar bindings only; they do not retain decoded leaves.
 const sourceContentByFeature=new WeakMap<object,string>(),sourceResourceByFeature=new WeakMap<object,string>();
 function sourceContentKey(leaf:Shard,detail?:DetailBinding){
  const asset=detail?.resource.descriptor??leaf,resource=detail?.resource;
  return JSON.stringify(['building-source-v1','infill',city,manifestSHA,manifest!.source_pbf_sha256,manifest!.city_boundary.sha256,manifest!.compiler_sha256,manifest!.source_snapshot,leaf.tile_key,leaf.sha256,manifest!.actual_geometry_lod??leaf.lod,asset.sha256,asset.bytes,asset.compression??null,asset.uncompressed_sha256??null,asset.uncompressed_bytes??null,resource?[resource.level,resource.geometrySHA256,resource.maxErrorM,resource.groupMetadata?[resource.groupMetadata.sha256,resource.groupMetadata.bytes,resource.groupMetadata.compression??null,resource.groupMetadata.uncompressed_sha256??null,resource.groupMetadata.uncompressed_bytes??null]:null,resource.bindings.materialSHA256,resource.bindings.producerSHA256,resource.bindings.protectionSHA256,resource.bindings.sourceEquivalenceSHA256]:null]);
 }
 function sourceResourceKey(leaf:Shard,detail?:DetailBinding){return resourceContentKey('provider-source-owner-v2',sourceOwnerKey,sourceContentKey(leaf,detail));}
 function bindSourceContent(leaf:Shard,components:readonly BuildingComponent[],key:string,detail?:DetailBinding){const contentKey=sourceContentKey(leaf,detail);for(const component of components){sourceContentByFeature.set(component.sourceFeature,contentKey);sourceResourceByFeature.set(component.sourceFeature,key);}}
 let publishedContentKeys:readonly string[]=[];
 function sourceResourceKeys(shown:readonly string[],chosen:readonly Shard[],bindings:ReadonlyMap<Shard,DetailBinding>){return [...new Set(shown.map(id=>{const leaf=chosen.find(leaf=>leaf.id===id);if(!leaf)throw Error('Missing stable building source binding');return sourceResourceKey(leaf,bindings.get(leaf));}))].sort();}
 function publishedSourceContent(){return publishedContentKeys;}
   function retireChunkInput(prepared:{chunkInput?:RendererChunkInput<BuildingComponent>;releaseChunkDependencies():void}){const release=prepared.releaseChunkDependencies;prepared.chunkInput=undefined;prepared.releaseChunkDependencies=()=>{};release();}
 const sourceAbsentPatches=[{tag:'F068DerivedOnly',header:F068_DERIVED_HEADER,ref:f068DerivedRefs[0]},{tag:'F075DerivedOnly',header:F075_DERIVED_HEADER,ref:f075DerivedRefs[0]},{tag:'F082DerivedOnly',header:{...F082_DERIVED_HEADER,city:'munich'},ref:f082DerivedRefs[0]},{tag:'F107DerivedOnly',header:F107_DERIVED_HEADER,ref:f107DerivedRefs[0]}] as const;
 function sourceAbsentDisplay(component:BuildingComponent){return component.sourceFeature.properties?.__not_native_source===true||component.sourceFeature.properties?.__derived_display_only===true;}
 function bindDerivedChunkInput(prepared:{scope:FrozenDataScope;source?:readonly BuildingComponent[];sourceComponents?:readonly BuildingComponent[];chunkInput?:RendererChunkInput<BuildingComponent>;releaseChunkDependencies():void},components:readonly BuildingComponent[]){
  const derived=components.filter(component=>sourceAbsentDisplay(component)&&!(prepared.chunkInput?.groups??[]).some(group=>group.derivationAuthorities?.length&&group.components.some(row=>row.objectId===component.objectId&&row.partId===component.partId))),recoveredInput=(prepared.source??prepared.sourceComponents??[]).find(component=>component.city==='frankfurt'&&component.objectId==='osm/way/384153099'&&component.partId==='osm/way/384153099/component/83cb7aff2638e3f41f2b'&&component.sourceFeature.properties?.nativeLeafAbsent===true);if(!derived.length&&!recoveredInput)return;
  const parents:ChunkResourceLease<unknown>[]=[],groups:RendererSourceGroup<BuildingComponent>[]=[...(prepared.chunkInput?.groups??[])];
  try{for(const component of derived){
   const patch=sourceAbsentPatches.find(patch=>patch.header.displayOnlyId===component.objectId);
   if(!patch)throw Error('Source-absent display has no explicit verified patch descriptor');
   const diagnostic=component.displayEstimates?.[patch.tag] as {sourceAbsent?:unknown;nativeGetterCount?:unknown;patchSHA256?:unknown;displayOnlyId?:unknown}|undefined;
   if(component.city!==patch.header.city||component.partId!==patch.header.displayOnlyId+'/surface'||diagnostic?.sourceAbsent!==true||diagnostic.nativeGetterCount!==0||diagnostic.patchSHA256!==patch.header.patchSHA256||diagnostic.displayOnlyId!==patch.header.displayOnlyId||!component.origin.every(Number.isFinite))throw Error('Explicit derived patch binding mismatch');
   const parent=prepared.scope.retainResource(patch.ref,'dependency');parents.push(parent);
   const authority=JSON.stringify(['explicit-source-absent-patch-v1',patch.ref.canonicalSHA256,patch.ref.file,patch.ref.occurrence,patch.ref.codec,patch.header.patchSHA256,component.city,component.objectId,component.partId]);
   groups.push({contentKey:authority,components:[component],parents:[parent],frame:{origin:component.origin,unit:2*Math.PI*6378137*Math.cos(component.origin[1]*Math.PI/180),authority:JSON.stringify(['source-local-mercator-meters-v1',authority,component.origin])},cohortKeys:[],materialAuthority:JSON.stringify([patch.ref.canonicalSHA256,patch.header.patchSHA256]),recipeAuthority:JSON.stringify(['infill-explicit-patch-recipe-v1',manifest!.compiler_sha256,patch.ref.canonicalSHA256,patch.header.patchSHA256]),selectedLOD:'explicit-derived-patch'});
  }
   if(recoveredInput){
    const {record,recovered,F154_RECOVERED_SOURCE_SIGNATURE:signature}=getF154RecoveredSourceData(prepared.scope);
    if(record.source_pbf_sha256!==manifest!.source_pbf_sha256||record.source_boundary_sha256!==manifest!.city_boundary.sha256||record.source_snapshot!==manifest!.source_snapshot||recoveredInput.objectId!==record.objectId||recoveredInput.partId!==record.partId||nativePaintSignature(recoveredInput)!==signature||recoveredInput.origin.some((n,i)=>n!==recovered.origin[i]))throw Error('F154 recovered SOURCE authority mismatch');
    const parent=retainF154RecoveredSourceResource(prepared.scope,'dependency');parents.push(parent);
    const display=components.find(component=>component.objectId===recovered.objectId&&component.partId===recovered.partId),diagnostic=display?.displayEstimates?.F154PhotoEstimate as {sourceSignature?:unknown;nativeLeafAbsent?:unknown;recoveredExactFootprint?:unknown;retiredMainWallEdges?:unknown}|undefined;
    if(display&&(diagnostic?.sourceSignature!==signature||diagnostic.nativeLeafAbsent!==true||diagnostic.recoveredExactFootprint!==true))throw Error('F154 recovered display does not match its exact SOURCE');
    const authority=JSON.stringify(['f154-recovered-source-group-v1',F154_RECONSTRUCTION_SHA,parent.contentKey,signature,recovered.objectId,recovered.partId]);
    groups.push({contentKey:authority,components:[recovered],parents:[parent],frame:{origin:recovered.origin,unit:2*Math.PI*6378137*Math.cos(recovered.origin[1]*Math.PI/180),authority:JSON.stringify(['source-local-mercator-meters-v1',parent.contentKey,recovered.origin])},cohortKeys:[],materialAuthority:JSON.stringify([F154_RECONSTRUCTION_SHA,parent.contentKey]),recipeAuthority:JSON.stringify(['infill-f154-owner-reconstruction-v1',F154_RECONSTRUCTION_SHA,signature,diagnostic?.retiredMainWallEdges??null]),selectedLOD:'explicit-recovered-source'});
   }
   const members=groups.map(group=>group.contentKey).sort(),key=resourceContentKey('infill-manager-publication-v2',members);
   let retained=retainRendererChunkInput({store:resources,groups:groups.map(group=>({...group,cohortKeys:[key]})),cohorts:[{key,members,authority:JSON.stringify(['existing-manager-semantic-publication',manifestSHA,manifest!.compiler_sha256])}]});
   if(!retained)throw Error('Derived patch input was not retained');
   const previousRelease=prepared.releaseChunkDependencies;prepared.chunkInput=retained;prepared.releaseChunkDependencies=()=>{const held=retained;retained=undefined;held?.release();};previousRelease();
  }finally{for(const parent of parents)parent.release();}
 }
 function sourceChunkDemand(parents:readonly ChunkResourceLease<SourceContent>[]){const seen=new Set<BuildingComponent>(),rows:BuildingComponent[]=[];for(const parent of parents)for(const row of parent.value?.components??[])if(!seen.has(row)){seen.add(row);rows.push(row);}return rows;}
 function sourceChunkInput(components:readonly BuildingComponent[],parents:readonly ChunkResourceLease<SourceContent>[],derivedRecipe?:unknown):RendererChunkInput<BuildingComponent>{
  const groups:RendererSourceGroup<BuildingComponent>[]=[],assigned=new Set<BuildingComponent>();
  const matches=(source:BuildingComponent,row:BuildingComponent)=>source.sourceFeature===row.sourceFeature||source.objectId===row.objectId&&source.partId===row.partId;
  for(const parent of parents){const value=parent.value;if(!value)continue;
   const append=(source:readonly BuildingComponent[],identity:string,origin:readonly[number,number],authority:string,physical=false,canonicalGeometry=false)=>{
    const visible=components.filter(row=>!assigned.has(row)&&(!sourceResourceByFeature.has(row.sourceFeature)||sourceResourceByFeature.get(row.sourceFeature)===value.resourceKey)&&source.some(component=>matches(component,row)));if(!visible.length)return;const rows=ownerShapePatchDisplayRows([...source],row=>ownerProfileByComponent.get(row),row=>sourceLeafByFeature.get(row.sourceFeature));
    for(const row of visible)assigned.add(row);
    const derived=visible.some(row=>{const original=source.find(component=>matches(component,row));return !original||row.origin.some((n,i)=>n!==original.origin[i])||row.batches.length!==original.batches.length||row.batches.some((batch,i)=>batch.positions!==original.batches[i].positions||batch.normals!==original.batches[i].normals||batch.indices!==original.batches[i].indices);});
    if(derived)throw Error('Modified source rows require explicit renderer ancestry');
    const recipeAuthority=value.recipeAuthority;
    const contentKey=JSON.stringify(['infill-source-pack-v1',physical?identity:[value.contentKey,identity],rows.map(row=>[row.objectId,row.partId]),recipeAuthority]);
    groups.push({contentKey,components:rows,parents:[parent],frame:{origin,unit:2*Math.PI*6378137*Math.cos(origin[1]*Math.PI/180),authority},cohortKeys:[],materialAuthority:value.materialAuthority,recipeAuthority,selectedLOD:canonicalGeometry?'canonical':value.selectedLOD});
   };
   if(value.groups){for(const packing of value.groups.packingGroups){append(packing.componentIndices.map(index=>value.components[index]),packing.key,packing.anchor,JSON.stringify(['source-local-mercator-meters-v1',value.groups.coordinateFrame,packing.anchor,packing.unit,packing.authority]),true,packing.geometryRole==='canonical');}}
   else if(value.components.length)append(value.components,'verified-source-leaf',value.components[0].origin,JSON.stringify(['verified-source-frame-v1',value.contentKey]));
  }
  // Later owner reconstruction is bound by the renderer's verified ancestry.
  // An unmatched row cannot borrow every currently wanted source as authority.
  if(components.some(component=>!assigned.has(component)&&!sourceAbsentDisplay(component)))throw Error('Unbound source-derived component authority');
  // The whole existing manager publication remains atomic. Physical packing
  // metadata with requires-runtime-cohort is not cross-leaf closure evidence.
  const members=groups.map(group=>group.contentKey).sort(),key=resourceContentKey('infill-manager-publication-v2',members);
  return{store:resources,groups:groups.map(group=>({...group,cohortKeys:[key]})),cohorts:members.length?[{key,members,authority:JSON.stringify(['existing-manager-semantic-publication',manifestSHA,manifest!.compiler_sha256])}]:[]};
 }
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
 const bootstrapPressure=(label:string)=>{const pressure=resources.budget.stats.lastPressure;return pressure?new ResourceBudgetExceededError(pressure):Error(label+' no longer fits the page budget');};
 // A claim that cannot coexist with the claims this request already holds can
 // never be admitted by waiting; it is reported as not fitting the page ledger.
 // refusedReadEnvelopes: per bootstrap path, the envelope a refused transport
 // delivery reported (its delivered buffer outgrew the read's own); the one retry
 // of that path admits it at once instead of the original size.
 const unfitBootstrap=(required:number,heldBytes:number,label:string)=>{const stats=resources.budget.stats;return new ResourceBudgetExceededError({capacity:stats.limitBytes,required,current:stats.bytes,recentCapacity:stats.recentLimitBytes,recentRequired:stats.recentBytes,recentCurrent:stats.recentBytes,shortfallBytes:Math.max(0,required-stats.limitBytes),recentShortfallBytes:0,additionalBytes:Math.max(0,required-heldBytes),constraint:'total',label});},refusedReadEnvelopes=new Map<string,number>();
 /** Admits `costs` as one new claim, or replaces `claim`'s costs, at once. A refusal
  * leaves `claim` as it was, for the caller to release with everything else it
  * holds: not-fit when the costs cannot coexist with `heldBytes` inside the page
  * capacity, otherwise ManagerAdmissionRetry. It never waits. */
 function admitBootstrap(costs:readonly ResourceBudgetCost[],label:string,signal:AbortSignal,heldBytes=0,claim?:ResourceBudgetReservation):ResourceBudgetReservation{
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
  const budget=resources.budget;
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
    if(required>resources.budget.stats.limitBytes)throw unfitBootstrap(required,heldBytes,label+' beside held claims');
    const claim=admitBootstrap([...envelope,...own],label,signal,heldBytes);
    let lease:ResourceBytesLease;
    try{lease=await acquire(path,signal,max,{admitted:claim,envelope,keep});}
    catch(error){
     // The transport left the claim as it was and holds nothing of this read's.
     claim.release();
     if(signal.aborted)throw error;
     if(error instanceof ResourceBudgetExceededError&&(error as Partial<ResourceByteDeliveryRefusedError>).code==='RESOURCE_BYTE_DELIVERY_REFUSED'){
      const refused=error as ResourceByteDeliveryRefusedError,retry=heldBytes+refused.retryBytes;
      if(refusedEnvelopeBytes!==undefined||retry>resources.budget.stats.limitBytes){refusedReadEnvelopes.delete(path);throw unfitBootstrap(retry,heldBytes,label+' delivered buffer');}
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
 async function readBinaryAsset(asset:{path:string;bytes:number;sha256:string},signal:AbortSignal):Promise<Uint8Array>{if(!/^\/assets\/3d-materials\/[A-Za-z0-9_-]+\.png$/.test(asset.path)||asset.path.length>256||!HASH.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<=0||asset.bytes>128*1024)throw Error('Invalid3D material asset');signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');return checkedBytes(await fetchBounded(asset.path,signal,128*1024),asset,signal);}

 // A context-only pause may retain the completed request's material witnesses.
 // Other cancellations and every fresh visible() keep their original abort path.
 const recoveryResident=createRecoveryResidentReuse(()=>{
  if(!manifest||!renderer||mode!=='3d'||wantedMode!=='3d'||map.getZoom()<14.5||!renderer.residentVertexCount)return;
  const view=recoveryResidentView(map);if(!view)return;
  return{view,source:[city,manifestSHA,manifest.source_pbf_sha256,manifest.city_boundary.sha256,manifest.source_snapshot,...publishedSourceContent()],generation,rendererGeneration:renderer.getRevision().generation};
 });
 function current(signal:AbortSignal,ticket:number){signal.throwIfAborted();if(ticket!==revision||destroyed||suspended||pageHidden&&wantedMode==='3d')throw new DOMException('Aborted','AbortError');}
 type DrawTarget={preparation?:{stage:string;stageStartedAtMs:number;completed:{stage:string;startedAtMs:number;endedAtMs:number}[]};sourceResourceKeys?:readonly string[];ticket:number;generation?:number;registered:boolean;readyGeneration?:number;detailResources?:ReadonlyMap<string,BuildingDetailResource>;managerState?:{owner:typeof ownerReconstruction;edge:typeof sourceEdgeAssemblyDisplay;retainedBytes:number;selected:string[];native:NativeGroupDisplayPlan|undefined};current:()=>boolean};
 let latestDrawTarget:DrawTarget|undefined,lastRegistered:DrawTarget|undefined,lastReadyGeneration:number|undefined,clearedFailedTicket=-1;
 const publishedDetailResources=new Map<string,BuildingDetailResource>();let publishedDetailGeneration:number|undefined,publishedManagerState:DrawTarget['managerState'],currentNativeGroupDisplay:NativeGroupDisplayPlan|undefined;
 function rememberPublishedDetails(){const actual=renderer?.getRevision().generation;if(actual!==undefined&&lastRegistered?.generation===actual&&lastRegistered.detailResources){publishedDetailResources.clear();for(const[key,value]of lastRegistered.detailResources)publishedDetailResources.set(key,value);publishedDetailGeneration=actual;if(lastRegistered.managerState)publishedManagerState=lastRegistered.managerState;}return actual;}
 function restorePublishedDetails(actual:number|undefined){adoptedDetailResources.clear();if(actual===publishedDetailGeneration){for(const[key,value]of publishedDetailResources)adoptedDetailResources.set(key,value);if(publishedManagerState){ownerReconstruction=publishedManagerState.owner;sourceEdgeAssemblyDisplay=publishedManagerState.edge;visibleRetainedEstimateBytes=publishedManagerState.retainedBytes;selectedShardIds=publishedManagerState.selected;currentNativeGroupDisplay=publishedManagerState.native;options.onNativeGroupDisplay?.(currentNativeGroupDisplay??{hiddenOutlines:[],groups:[],errors:[]});}}}

 function drawn(signal:AbortSignal,ticket:number,target?:DrawTarget):Promise<void>{return waitForResidentDraw({
  map,signal,current:()=>current(signal,ticket),renderer:()=>renderer?{getDrawReadiness:()=>{
   if(target&&(!target.registered||!target.current()))return{ready:false,preparing:true};
   const state=renderer!.getDrawReadiness();if(state.failure)return state;
   return target&&renderer!.getRevision().generation!==target.generation?{ready:false,preparing:true}:state;
  }}:undefined,drawTimeoutMs:8000,
  observe:value=>{const publishedGeneration=rememberPublishedDetails(),mainReady=value.phase==='ready'&&(!target||target.registered&&target.current()&&publishedGeneration===target.generation);if(mainReady&&publishedGeneration!==undefined){if(ticket===revision)lastReadyTicket=ticket;synchronizePublishedExplicitSources();lastReadyGeneration=publishedGeneration;if(target?.sourceResourceKeys)publishSourceContent(target.sourceResourceKeys);if(target)target.readyGeneration=publishedGeneration;publishRequiredSolarCoverage(publishedDetailResources.values(),publishedGeneration);}drawReadiness={ticket,...value,...(target?.preparation?{preparation:{...target.preparation,completed:target.preparation.completed.map(row=>({...row}))}}:{}),expectedGeneration:target?.generation,registered:target?.registered??false,published:!!target?.registered&&publishedGeneration===target.generation,mainReady,renderer:renderer?.getReadinessDiagnostic(),recordedAtMs:performance.now(),performanceTimeOriginMs:performance.timeOrigin};},
 });}

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

 function announce(status:ThreeDControlState['status']){if(status==='error')detailSettlementFailed=true;else if(['ready','partial','outside','overview'].includes(status))detailSettlementFailed=false;if(['ready','partial','outside','overview'].includes(status))lastError=undefined;const value={mode,status};options.onState?.(value);return value;}
 async function ensure(signal:AbortSignal){
  if(!renderer){const [module,surface,windowModule,helperSource,diffuseModule]=await Promise.all([import('./building-mesh-renderer'),import('./building-surface-style'),import('./open-facade-window-texture'),import('../../../safety/facade-helper-source'),import('./open-facade-diffuse')]);signal.throwIfAborted();if(destroyed)throw Error('3D destroyed');const helpers=await helperSource.acquireFacadeHelperSource({budget:resources.budget,baseSurfaceFragment:surface.BUILDING_SURFACE_FRAGMENT_GLSL,signal,owner:'infill:'+city});try{signal.throwIfAborted();if(destroyed)throw Error('3D destroyed');renderer=module.createBuildingMeshRenderer(map,city,{id:'source-building-meshes-infill',mobile,nativeLeafSHA:c=>sourceLeafByFeature.get(c.sourceFeature),reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,surfaceStyle:p=>diffuseModule.neutralSchematicFacadeStyle(p,surface.sourceSurfaceStyle(p)),baseSurfaceFragment:surface.BUILDING_SURFACE_FRAGMENT_GLSL,surfaceFragment:helpers.surfaceFragment,windowTexture:windowModule.createOpenFacadeWindowTexture({resourceStore:resources,acquireBytes:options.acquireBytes,readBytes:readBinaryAsset,requestRepaint:()=>map.triggerRepaint()}),diffuseFragment:helpers.diffuseFragment,diffuseTexture:diffuseModule.createOpenFacadeDiffuse({resourceStore:resources,acquireBytes:options.acquireBytes,readBytes:readBinaryAsset,requestRepaint:()=>map.triggerRepaint()})});}catch(error){helpers.release();throw error;}facadeHelpers?.release();facadeHelpers=helpers;options.onRenderer?.(renderer);const before=map.getStyle().layers?.find(l=>['scene-point-halo','scene-point','source-poi-reference-point','poi-center','poi-point','poi-association-label','kbo-navigation-point','kbo-navigation-label'].includes(l.id))?.id??map.getStyle().layers?.find(l=>l.type==='symbol')?.id;map.addLayer(renderer.layer as any,before);}
  if(manifest)return;
  // index.json and the city boundary are read and parsed once per page ledger and
  // city (manager-ensure-admission): the first waiting manager produces them for
  // every manager of the page, a waiting manager holds no claim, each stage is
  // admitted at once or waits holding nothing, and the parsed pair stays charged
  // once until its last manager returns its lease.
  for(;;){
   const shared=await acquireManagerBootstrap({budget:resources.budget,key:JSON.stringify(['painted-3d-bootstrap-v1',city,'/safety/buildings3d/index.json']),signal,
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
     await admitSolarShadowBoundary({geometry:shared.value.boundary,boundarySHA256:value.city_boundary.sha256},{budget:resources.budget,signal});signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
     if(currentSolarShadowBoundary(value.city_boundary.sha256)){bootstrapRetained?.release();bootstrapRetained=shared;manifestSHA=shared.value.manifestSHA;boundary=shared.value.boundary;manifest=value;renderer!.setSolarShadowBoundary({geometry:boundary,boundarySHA256:value.city_boundary.sha256});if(value.index_type==='partitioned-city3d-v1')partitions=installThreeDimensionalPartitions({city,sourceHash:value.source_pbf_sha256,boundaryHash:value.city_boundary.sha256,partitions:value.partitions!,mobile,
       // A page's working set is admitted with its read; its claim passes to the
       // partition owner as the cached rows' retained estimate until eviction or clear.
       read:(asset,signal)=>retryManagerAdmission(resources.budget,signal,()=>parseBootstrap(asset.path,asset,signal,1024**2,'3D partition page',bytes=>checked(bytes,asset,signal))),
       validateLeaf:s=>Boolean(s.id&&s.tile_key&&assetValid(s,1024**2)&&bboxValid(s.bbox)&&[1,2,3].includes(s.lod)&&Number.isSafeInteger(s.vertices)&&s.vertices>=0&&s.vertices<=200000&&(s.max_height_m===undefined||validModelHeight(s.max_height_m)))});return;}
    }
   }catch(error){if(bootstrapRetained!==shared)shared.release();throw error;}
   shared.release();
  }
 }
 async function loadSourceContent(s:Shard,context:ChunkProductionContext,detail?:DetailBinding):Promise<SourceContent>{const {signal}=context;signal.throwIfAborted();const key=sourceResourceKey(s,detail),asset=detail?.resource.descriptor??s;if(!detail&&!options.nativeSources)throw Error('3D canonical source requires the page native source client');const acquired=detail?await options.detailRuntime!.acquireSelected(detail.resource,{signal}):undefined;const shared=detail?undefined:await options.nativeSources!.acquire(s,signal,maxVertices,'dependency');let transferred=false;try{const parent=acquired?acquired.retainResource?.('dependency'):shared!.retainResource('dependency');if(!parent)throw Error('Building detail source has no page resource parent');try{context.retainParent(parent);}finally{parent.release();}const verified=acquired?acquired.value.verified:shared!.verified;const raw=acquired?acquired.value.raw:shared!.raw;const physicalBytes=detail?.resource.descriptor.bytes??shared!.physicalBytes;const ownedMetadataBytes=1024+raw.components.reduce((n,c)=>n+512+2*(c.objectId.length+c.partId.length),0);if(!context.adjust({category:'metadata',bytes:ownedMetadataBytes,precision:'estimate',label:'provider SOURCE shadow and binding metadata'})){signal.throwIfAborted();const pressure=context.budget.stats.lastPressure;if(pressure)throw new ResourceBudgetExceededError(pressure);throw Error('Provider source metadata reservation is no longer active');}if(detail){let actualVertices=0,actualTriangles=0;for(const component of raw.components)for(const batch of component.batches){actualVertices+=batch.positions.length/3;actualTriangles+=batch.indices.length/3;}if(actualVertices!==detail.resource.vertices||actualTriangles!==detail.resource.triangles||actualVertices>maxVertices)throw Error('Building detail geometry cost mismatch');}const ownerProfile=ownerShapePatchProfile(s.path);if(ownerProfile){verifyOwnerShapePatchRows(raw.components,ownerProfile);signal.throwIfAborted();for(const c of raw.components)ownerProfileByComponent.set(c,ownerProfile);retainedShardCost.set(raw.components,raw.decodedPayloadCost.retainedPayloadEstimateBytes);loadCount++;bindSourceContent(s,raw.components,key,detail);const value:SourceContent={contentKey:sourceContentKey(s,detail),resourceKey:key,selectedResourceKey:detail?.resource.key,selectedLOD:detail?.resource.level??manifest!.actual_geometry_lod??s.lod,materialAuthority:detail?.resource.bindings.materialSHA256??JSON.stringify([manifestSHA,manifest!.compiler_sha256]),recipeAuthority:JSON.stringify(['infill-source-recipe-v1',manifestSHA,manifest!.compiler_sha256,ownerShapePatchProfile(s.path)?.sha256??null]),groups:acquired?.value.groups,components:raw.components,bytes:physicalBytes,inflatedBytes:asset.uncompressed_bytes??physicalBytes,retainedEstimateBytes:retainedShardCost.get(raw.components)!,ownedMetadataBytes,releaseDependency:()=>{shared?.release();acquired?.release();}};sourceDiagnostics.set(key,{bytes:value.bytes,inflatedBytes:value.inflatedBytes,retainedEstimateBytes:value.retainedEstimateBytes});transferred=true;return value;}const shadow=verified?shadowAdmissionForDecodedShard(verified,raw.components,city,manifest!.city_boundary.sha256):undefined;if(raw.schema_version!==1||raw.city!==city||!Array.isArray(raw.components)||raw.components.length>5000)throw Error('Invalid city3D shard body');let vertices=0;for(const c of raw.components){if(c.city!==city||c.componentGeometry?.type!=='Polygon'||!Array.isArray(c.batches))throw Error('Invalid city3D component');for(const batch of c.batches)vertices+=(batch.positions?.length??0)/3;}if(vertices!==(detail?.resource.vertices??s.vertices)||vertices>maxVertices)throw Error('City3D vertex mismatch');if(s.max_height_m!==undefined){let actualMax=0;for(const c of raw.components)for(const batch of c.batches)for(let i=1;i<batch.positions.length;i+=3)actualMax=Math.max(actualMax,batch.positions[i]);if(actualMax>s.max_height_m+1e-6)throw Error('City3D display height bound mismatch');}signal.throwIfAborted();if(raw.decodedPayloadCost.retainedPayloadEstimateBytes>(mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop))throw Error('Decoded city3D shard exceeds retained payload budget');shadowByShard.set(raw.components,shadow);retainedShardCost.set(raw.components,raw.decodedPayloadCost.retainedPayloadEstimateBytes+(shadow?estimateRetainedBuildingPayload(shadow).retainedPayloadEstimateBytes:0));for(const c of raw.components)sourceLeafByFeature.set(c.sourceFeature,s.sha256);loadCount++;bindSourceContent(s,raw.components,key,detail);const value:SourceContent={contentKey:sourceContentKey(s,detail),resourceKey:key,selectedResourceKey:detail?.resource.key,selectedLOD:detail?.resource.level??manifest!.actual_geometry_lod??s.lod,materialAuthority:detail?.resource.bindings.materialSHA256??JSON.stringify([manifestSHA,manifest!.compiler_sha256]),recipeAuthority:JSON.stringify(['infill-source-recipe-v1',manifestSHA,manifest!.compiler_sha256,ownerShapePatchProfile(s.path)?.sha256??null]),groups:acquired?.value.groups,components:raw.components,bytes:physicalBytes,inflatedBytes:asset.uncompressed_bytes??physicalBytes,retainedEstimateBytes:retainedShardCost.get(raw.components)!,ownedMetadataBytes,releaseDependency:()=>{shared?.release();acquired?.release();}};sourceDiagnostics.set(key,{bytes:value.bytes,inflatedBytes:value.inflatedBytes,retainedEstimateBytes:value.retainedEstimateBytes});transferred=true;return value;}finally{if(!transferred){shared?.release();acquired?.release();}}}
 async function shard(s:Shard,signal:AbortSignal,session?:BuildingDetailSession,detail?:DetailBinding){const key=sourceResourceKey(s,detail),value=await wantedSources.value(key,signal);signal.throwIfAborted();if(detail)session!.registerCached(detail.index,detail.resource);bindSourceContent(s,value.components,key,detail);return value.components;}

 function clearFailedHandoff(ticket:number){const publishedGeneration=rememberPublishedDetails(),target=latestDrawTarget;if(!target||target.ticket!==ticket||lastRegistered!==target||!target.registered||target.generation===undefined){s434Aggregate.clear();restorePublishedDetails(publishedGeneration);return;}renderer?.cancelCandidate(target.generation);if(publishedGeneration!==target.generation){s434Aggregate.clear();clearPreparedBatches();restorePublishedDetails(publishedGeneration);return;}if(publishedGeneration===lastReadyGeneration)return;clearedFailedTicket=ticket;publishedDetailResources.clear();publishedDetailGeneration=undefined;publishedManagerState=undefined;currentNativeGroupDisplay=undefined;adoptedDetailResources.clear();mode='2d';renderer?.setEnabled(false,{retainPrograms:true});s434Aggregate.clear();renderer?.setBatches([],++generation,{retainPrograms:true} as never);publishedContentKeys=[];clearRequiredSolarCoverage();clearPreparedBatches();ownerReconstruction=ownerShapePatchMetadata([],()=>undefined);sourceEdgeAssemblyDisplay={groups:[],errors:[]};options.onNativeGroupDisplay?.({hiddenOutlines:[],groups:[],errors:[]});selectedShardIds=[];visibleRetainedEstimateBytes=0;}
 // compositor F1, manager side (DECISIONS 2026-11-02 07:49): detailDemandHeld is
 // true only while every pending visible load of this manager is parked on a
 // page-ledger availability wake: its cohort waiting holding nothing for its batch, or its read while every
 // source not yet ready is parked for capacity in the native source pool.
 // Queued, network, CPU, staging, gate or camera work makes it false, and so does
 // a pending refresh or mode request with no visible load. A parked state that
 // ends after detailDemandHeld was reported true (its removal, or a pool source
 // waking from its park: onUnparked) repaints the map once, so the
 // compositor, which stops requesting frames of its own while it reads true,
 // never waits on a silent frame loop.
 const detailDemand={probes:new Set<()=>boolean>(),reported:false,watch:undefined as (()=>void)|undefined,
  clear(){detailDemand.reported=false;const stop=detailDemand.watch;detailDemand.watch=undefined;stop?.();if(!destroyed)map.triggerRepaint();},
  park(parked:()=>boolean){detailDemand.probes.add(parked);let done=false;return()=>{if(done)return;done=true;detailDemand.probes.delete(parked);if(detailDemand.reported)detailDemand.clear();};},
  held(){if(destroyed||visibleLoadsPending<=0||detailDemand.probes.size!==visibleLoadsPending)return false;for(const parked of detailDemand.probes)if(!parked())return false;detailDemand.reported=true;if(!detailDemand.watch)detailDemand.watch=options.nativeSources?.onUnparked?.(()=>{if(detailDemand.reported&&!detailDemand.held())detailDemand.clear();});return true;}};
 async function visible(signal:AbortSignal,ticket:number,activate=false,notify=true){
  recoveryResident.invalidate();current(signal,ticket);detailRefreshPending=false;visibleLoadsPending++;const session=options.detailRuntime?.openSession({requestId:ticket,signal});
  try{
   // The page's paint initialization settles before the visible preparation gate
   // and before any source is acquired or decoded: nothing is held while it is
   // awaited and the gate's one slot stays free (core-frozen; DECISIONS 03:25).
   if(options.paintInitializationSettled){await options.paintInitializationSettled(signal);current(signal,ticket);}
   // IA-R1: a cohort that returned its whole batch waits here, outside the
   // visible preparation gate and holding nothing, then reads again.
   const cohort=options.nativeSources?.cohort?.(detailDemand),run=()=>{current(signal,ticket);return visibleNow(signal,ticket,activate,notify,session,cohort,detailDemand);};
   for(;;){try{return await (options.runVisiblePreparation?options.runVisiblePreparation(signal,run):run());}catch(error){const room=cohort?.retry(error,signal);if(!room)throw error;await room;current(signal,ticket);}}}
  catch(error){if(error instanceof ChunkResourceContextLostError){if(ticket===revision)request.abort(error);throw error;}if(error instanceof StaleBuildingDetailDemandError&&ticket===revision&&!signal.aborted&&!destroyed){modeRequests.invalidateViewport(request);if(!map.isMoving?.()&&!modeRequests.settleViewport())queueMicrotask(()=>{if(ticket===revision&&!destroyed&&!map.isMoving?.())moved();});throw signal.reason;}session?.fail(error);if(!signal.aborted&&!destroyed&&ticket===revision)clearFailedHandoff(ticket);throw error;}finally{session?.finish();visibleLoadsPending--;if(detailRefreshPending)map.triggerRepaint();}
 }
 async function visibleNow(signal:AbortSignal,ticket:number,activate=false,notify=true,session?:BuildingDetailSession,cohort?:ReturnType<NonNullable<NativeSourceClient['cohort']>>,demand?:Parameters<NonNullable<NativeSourceClient['cohort']>>[0]){
  current(signal,ticket);if(!manifest||!renderer||mode!=='3d'&&!activate)throw Error('3D source is not prepared');
  const result=(status:ThreeDControlState['status'])=>{current(signal,ticket);return notify?announce(status):{mode,status};};
  const z=map.getZoom(),b=map.getBounds(),bounds:BBox=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];
  const canvas=map.getCanvas(),camera={pitch:map.getPitch(),verticalFieldOfView:map.getVerticalFieldOfView(),aspectRatio:canvas.clientWidth/Math.max(1,canvas.clientHeight)};
  // Unknown demand must preserve the preceding wanted/published set.
  if(![z,...bounds,camera.pitch,camera.verticalFieldOfView,camera.aspectRatio].every(Number.isFinite)||camera.verticalFieldOfView<=0||camera.aspectRatio<=0||canvas.clientWidth<=0||canvas.clientHeight<=0)return result('loading');
  // Keep regional information readable at overview scale. Detailed geometry is paid for only nearby.
  if(z<14.5){if(activate)return {mode,status:'overview' as const};adoptedDetailResources.clear();s434Aggregate.clear();renderer.setBatches([],++generation);focusState?.reset();publishedContentKeys=[];clearRequiredSolarCoverage();clearPreparedBatches();ownerReconstruction=ownerShapePatchMetadata([],()=>undefined);options.onNativeGroupDisplay?.({hiddenOutlines:[],groups:[],errors:[]});renderer.setEnabled(true);selectedShardIds=[];visibleRetainedEstimateBytes=0;partial=false;await drawn(signal,ticket);return result('overview');}
  const paged=partitions?await partitions.resolve(bounds,signal,camera,manifest.max_model_height_m):undefined;current(signal,ticket);
  const requestedLod:1|2|3=z>=18.5?3:z>=17?2:1,lod=manifest.geometry_lod_aliases?1:requestedLod;const ownerCandidates:Shard[]=ownerShapePatchProfiles(city).map(p=>({...p,bbox:[...p.bbox] as BBox,lod}));const baseCandidates:Shard[]=[...(paged?.shards??manifest.shards),...ownerCandidates].filter(s=>s.lod===lod&&modelHeightQuery(s,bounds,camera,manifest!.max_model_height_m).matches).sort((a,b)=>{const centre=map.getCenter();const distance=(s:Shard)=>Math.hypot((s.bbox[0]+s.bbox[2])/2-centre.lng,(s.bbox[1]+s.bbox[3])/2-centre.lat);return distance(a)-distance(b)||a.id.localeCompare(b.id);});
  const s434CohortSelection=prepareS434CohortSelection(baseCandidates,[...(paged?.shards??manifest.shards),...manifest.shards],{city,bounds,camera,maxVisible,maxBytes,vertexCap:nativeAdmissionVertexLimit,retainedCap:mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop,lod});const f288CohortSelection=prepareF288CohortSelection(s434CohortSelection.candidates,[...(paged?.shards??manifest.shards),...manifest.shards],{city,bounds,camera,maxVisible,maxBytes,vertexCap:nativeAdmissionVertexLimit,retainedCap:mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop,lod}),frankfurtCohortSelection=prepareFrankfurtCohortSelection(f288CohortSelection.candidates,[...(paged?.shards??manifest.shards),...manifest.shards],{city,bounds,camera,maxVisible,maxBytes,vertexCap:nativeAdmissionVertexLimit,retainedCap:mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop,lod}),cohortSelection=city==='frankfurt'?frankfurtCohortSelection:city==='essen'?f288CohortSelection:s434CohortSelection,candidates=cohortSelection.candidates;
  const detailBindings=new Map<Shard,DetailBinding>();
  if(options.detailRuntime&&session)for(const leaf of candidates){const index=await options.detailRuntime.resolveDetailIndex(manifestSHA,leaf,{signal});current(signal,ticket);if(index){if(index.bindings.sourcePBFSHA256!==manifest.source_pbf_sha256||index.bindings.boundarySHA256!==manifest.city_boundary.sha256||index.bindings.compilerSHA256!==manifest.compiler_sha256||index.bindings.sourceSnapshot!==manifest.source_snapshot)throw Error('Building detail SOURCE manifest binding mismatch');const previous=adoptedDetailResources.get(leaf.tile_key),resource=options.detailRuntime.select(index,undefined,previous?.level).resource;detailBindings.set(leaf,{index,resource});}}
  let bytes=0;const chosen:Shard[]=[];partial=paged?.partial??manifest.shards.some(s=>!modelHeightQuery(s,bounds,camera,manifest!.max_model_height_m).verified);for(const s of candidates){if(chosen.length>=maxVisible||bytes+(detailBindings.get(s)?.resource.descriptor.bytes??s.bytes)>maxBytes){partial=true;continue;}chosen.push(s);bytes+=detailBindings.get(s)?.resource.descriptor.bytes??s.bytes;}
  const focusResolver=options.buildingFocus?.forIndex(manifestSHA);
  if(focusResolver){
   const frame=options.getModelViewProjection?.();if(!frame?.buildingFocus)throw Error('infill focus requires a current model-view frame');
   const canonical=[...new Map([...manifest.shards,...(paged?.shards??[]),...candidates.filter(leaf=>!ownerCandidates.includes(leaf))].map(leaf=>[leaf.id,leaf])).values()],known=[...canonical,...ownerCandidates];
   const ownerCohorts=[s434CohortSelection.requiredLeafIds,f288CohortSelection.requiredLeafIds,...frankfurtCohortSelection.requiredLeafGroups].filter(ids=>ids.length).map(ids=>ids.map(id=>{const leaf=known.find(row=>row.id===id);if(!leaf)throw Error('Missing infill focus owner dependency');return leaf;}));
   const externalSources=ownerCandidates.map(leaf=>{
    const profile=ownerShapePatchProfiles(city).find(profile=>profile.id===leaf.id&&profile.sha256===leaf.sha256);if(!profile)throw Error('Missing infill owner focus source');
    const bounds=projectBuildingFocusCohort(frame,ownerShapePatchFocusComponents(profile))??{left:NaN,top:NaN,right:NaN,bottom:NaN};return{leaf,bounds,replaces:ownerFocusReplacements(profile),objectId:profile.objectId};
   });
   // Out-of-window dependency members: their real descriptors come only from
   // their own index page through this manager's validated partition reader.
   const owner=partitions,resolveDescriptors=owner?async(requests:readonly BuildingFocusLocatedLeaf[],readSignal:AbortSignal)=>{const {leaves}=await owner.resolveLeaves(requests,readSignal);current(signal,ticket);return new Map(leaves.filter(leaf=>leaf.lod===lod).map(leaf=>[JSON.stringify([leaf.id,leaf.sha256]),leaf as Shard] as const));}:undefined;
   const focused=await applyBuildingFocus({provider:'infill',state:focusState!,resolver:focusResolver,frame,bounds,camera,chosen,canonical,externalSources,ownerCohorts,resolveDescriptors,
    display:{lists:[NATIVE_PART_DISPLAY_PROFILES,SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES,S020_RELATION_OUTLINE_PROFILES],city,indexSHA:manifestSHA},budget:{maxVisible,maxBytes,maxVertices:nativeAdmissionVertexLimit},resourceStore:resources,signal,
    detail:options.detailRuntime&&session?{runtime:options.detailRuntime,bindings:detailBindings,skip:leaf=>ownerCandidates.includes(leaf),previousLevel:leaf=>adoptedDetailResources.get(leaf.tile_key)?.level,
     async resolve(leaf){const index=await options.detailRuntime!.resolveDetailIndex(manifestSHA,leaf,{signal});current(signal,ticket);if(index&&(index.bindings.sourcePBFSHA256!==manifest!.source_pbf_sha256||index.bindings.boundarySHA256!==manifest!.city_boundary.sha256||index.bindings.compilerSHA256!==manifest!.compiler_sha256||index.bindings.sourceSnapshot!==manifest!.source_snapshot))throw Error('Focus detail source binding mismatch');return index;}}:undefined,
    resourceKey:(leaf,binding)=>sourceResourceKey(leaf,binding)});current(signal,ticket);
   chosen.splice(0,chosen.length,...focused.chosen);partial ||=focused.partial;
  }
  wantedSources.reconcile(chosen.map(leaf=>({leaf,detail:detailBindings.get(leaf),contentKey:sourceResourceKey(leaf,detailBindings.get(leaf))})));
  const sourceCandidates=new Map<string,ChunkResourceLease<SourceContent>>();
  const results:(BuildingComponent[]|undefined)[]=[];const decodedCap=mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop;stagingTicket=ticket;stagingRetainedEstimateBytes=0;let index=0,finished=false,firstDrawPending=false;
  // pendingPreparations: CPU preparation this request's commits started. Each one
  // settles before the request returns and releases the visible preparation gate,
  // also after an abort or a refused draw, so two providers' preparations never
  // overlap (DECISIONS 2026-11-02 01:35).
  const publication=modeRequests.publication(signal,()=>{current(signal,ticket);if(pageHidden||wantedMode==='2d')throw new DOMException('Aborted','AbortError');}),pendingPreparations=new Set<Promise<unknown>>();
  const subset=(original:BuildingComponent[],selected:BuildingComponent[])=>{if(selected===original)return selected;const sourceShadow=shadowByShard.get(original),ids=new Set(selected.map(c=>c.objectId+'|'+c.partId)),shadow=sourceShadow&&selected.length?{...sourceShadow,components:sourceShadow.components.filter(e=>ids.has(e.objectId+'|'+e.partId))}:undefined;shadowByShard.set(selected,shadow);let cost=32;for(const c of selected){let value=retainedComponentCost.get(c);if(value===undefined){value=estimateRetainedBuildingPayload(c).retainedPayloadEstimateBytes;retainedComponentCost.set(c,value);}cost+=value+8;}if(shadow)cost+=estimateRetainedBuildingPayload(shadow).retainedPayloadEstimateBytes;retainedShardCost.set(selected,cost);return selected;};
  const budgetRows=(original:BuildingComponent[],availableVertices:number,availableCost:number)=>{let count=0,cost=32;const selected:BuildingComponent[]=[],shadow=shadowByShard.get(original),shadowEntries=new Map(shadow?.components.map(e=>[e.objectId+'|'+e.partId,e])??[]);const commonShadowCost=shadow?estimateRetainedBuildingPayload(shadow.profile).retainedPayloadEstimateBytes:0;cost+=commonShadowCost;for(const c of [...original].sort((a,b)=>cohortSelection.priority(a,b)||viewportComponentDistance(a,bounds)-viewportComponentDistance(b,bounds)||a.partId.localeCompare(b.partId))){const vertices=componentViewportRecord(c).vertices;let retained=retainedComponentCost.get(c);if(retained===undefined){retained=estimateRetainedBuildingPayload(c).retainedPayloadEstimateBytes;retainedComponentCost.set(c,retained);}const shadowEntry=shadowEntries.get(c.objectId+'|'+c.partId),next=retained+8+(shadowEntry?estimateRetainedBuildingPayload(shadowEntry).retainedPayloadEstimateBytes:0);if(count+vertices>availableVertices||cost+next+256>availableCost){partial=true;continue;}selected.push(c);count+=vertices;cost+=next;}let rows=subset(original,selected),retained=retainedShardCost.get(rows)!;while(rows.length&&retained+rows.length*8>availableCost){partial=true;count-=componentViewportRecord(selected.pop()!).vertices;rows=subset(original,selected);retained=retainedShardCost.get(rows)!;}return {rows,vertices:count,cost:retained+rows.length*8};};
  // Offscreen source storage is retained only by explicit page-store roles.
  // Admit real visible components under unchanged vertex and retained budgets, not whole leaf counts.
  const admit=(at:number,rows:BuildingComponent[])=>{current(signal,ticket);const viewportRows=viewportComponents(rows,bounds,camera),cohortRows=cohortSelection.viewportRows(rows,viewportRows);cohortSelection.note('rawCandidate',at,rows);cohortSelection.note('viewportEligible',at,viewportRows);cohortSelection.note('afterCohortViewport',at,cohortRows);results[at]=subset(rows,cohortRows);let retained=32,vertices=0;for(let i=0;i<chosen.length;i++){const item=results[i];if(!item)continue;const reserve=cohortSelection.reserveAfter(chosen,i),limited=budgetRows(item,nativeAdmissionVertexLimit-vertices-reserve.vertices,decodedCap-retained-reserve.bytes);results[i]=limited.rows;retained+=limited.cost;vertices+=limited.vertices;}stagingRetainedEstimateBytes=retained;};
  const prepareCommit=async(components:BuildingComponent[],admission:Parameters<NonNullable<typeof renderer>['prepareBatches']>[4],attempt:ViewportPublicationAttempt,publish:(prepared:PreparedInfillBatches)=>void,markPreparation:(stage:string)=>void)=>{
   const admissionKey=JSON.stringify(admission);attempt.current();
   if(residentPreparation&&!residentPreparation.scope.stats.disposed&&sameStageComponents(residentPreparation.input,components)&&preparedAdmissionKey===admissionKey){const prepared=residentPreparation;prepared.signal=attempt.signal;attempt.current();publish(prepared);return;}
   if(!options.frozenData)throw Error('Infill frozen data client is unavailable');
   const scope=createFrozenDataScope(options.frozenData);let prepared:PreparedInfillBatches|undefined;
   try{
    prepared=await renderer!.prepareBatches(components,attempt.signal,scope,options.awaitPaintInitialization,admission,sourceChunkDemand([...sourceCandidates.values()]),sourceChunkInput(components,[...sourceCandidates.values()],admission),markPreparation);markPreparation('bind-derived-input');bindDerivedChunkInput(prepared,prepared.displayComponents);
    attempt.current();prepared.signal=attempt.signal;publish(prepared);
   }finally{if(prepared&&residentPreparation!==prepared)retirePreparedBatches(prepared);scope.release();}
  };
  const captureDetailSubset=(shown:readonly string[])=>chosen.filter(leaf=>shown.includes(leaf.id)).flatMap(leaf=>{const binding=detailBindings.get(leaf);return binding?[{leaf,binding}]:[];});
  const validateDetail=(shown:readonly string[])=>{const subset=captureDetailSubset(shown);for(const {binding}of subset)if(!buildingDetailSolarCoverageBounds(binding.resource.components,binding.resource.maxErrorM))throw Error('Selected detail has invalid canonical solar coverage bounds');session?.validateBeforeAdopt({resourceKeys:[...new Set(subset.map(({binding})=>binding.resource.key))]});return subset;};
  const adoptDetail=(shown:readonly string[],nextGeneration:number)=>{const subset=captureDetailSubset(shown);session?.adopt({generation:nextGeneration,resourceKeys:[...new Set(subset.map(({binding})=>binding.resource.key))]});adoptedDetailResources.clear();for(const {leaf,binding}of subset)adoptedDetailResources.set(leaf.tile_key,binding.resource);if(latestDrawTarget?.ticket===ticket)latestDrawTarget.detailResources=new Map(adoptedDetailResources);};
  const settleDetail=async(ready:Promise<void>,target:DrawTarget)=>{try{await ready;if(target.registered&&target.generation!==undefined)session?.settleReady({generation:target.generation,ready:true});}catch(error){if(target.registered&&target.generation!==undefined)session?.settleReady({generation:target.generation,ready:false,error});throw error;}};
  const commit=async(attempt:ViewportPublicationAttempt)=>{
   const signal=attempt.signal;attempt.current();const drawTarget:DrawTarget={ticket,registered:false,current:attempt.isCurrent};rememberPublishedDetails();latestDrawTarget=drawTarget;
   // Fixed per-attempt scalar stages; no geometry/source payload or frame log.
   const markPreparation=(stage:string)=>{const at=performance.now(),previous=drawTarget.preparation,completed=previous?.completed??[];if(previous&&completed.length<20)completed.push({stage:previous.stage,startedAtMs:previous.stageStartedAtMs,endedAtMs:at});drawTarget.preparation={stage,stageStartedAtMs:at,completed};};
   markPreparation('source-demand');const drawReady=drawn(signal,ticket,drawTarget);void drawReady.catch(()=>{});const work=async()=>{
   const cap=mobile?THREE_D_DECODED_PAYLOAD_LIMITS.mobile:THREE_D_DECODED_PAYLOAD_LIMITS.desktop,components:BuildingComponent[]=[],shown:string[]=[];let retainedEstimate=32;
   for(let i=0;i<chosen.length;i++){const rows=results[i];if(!rows)continue;const cost=retainedShardCost.get(rows);if(cost===undefined)throw Error('Missing decoded shard cost');const mergedContainer=rows.length*8;if(retainedEstimate+cost+mergedContainer>cap){partial=true;continue;}components.push(...rows);shown.push(chosen[i].id);retainedEstimate+=cost+mergedContainer;}
   const displayRows=ownerShapePatchDisplayRows(components,c=>ownerProfileByComponent.get(c),c=>sourceLeafByFeature.get(c.sourceFeature));components.splice(0,components.length,...displayRows);
   const sourceRoleRows=new Map<string,BuildingComponent[]>();for(const c of sourceChunkInput(components,[...sourceCandidates.values()]).groups.flatMap(group=>group.components)){const leaf=sourceLeafByFeature.get(c.sourceFeature);if(!leaf)continue;const rows=sourceRoleRows.get(leaf)??[];rows.push(c);sourceRoleRows.set(leaf,rows);}
   markPreparation('source-role-display');
   for(const [leaf,rows]of sourceRoleRows){attempt.current();await prepareSourceRoleDisplay(rows,leaf,signal);attempt.current();}
   const nextOwnerReconstruction=ownerShapePatchMetadata(components,c=>ownerProfileByComponent.get(c));
   const f068Admission={sourcePbfSHA256:manifest!.source_pbf_sha256,bounds:(()=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()] as [number,number,number,number];})(),zoom:map.getZoom()};
   await prepareCommit(components,f068Admission,attempt,prepared=>{
    markPreparation('display-plans');attempt.current();const scope=prepared.scope,packingComponents=sourceChunkInput(components,[...sourceCandidates.values()]).groups.flatMap(group=>group.components);
    // Every material/native gate consumes the same closed admission demand and scope.
    const nativePlan=nativePartDisplayPlan(packingComponents,NATIVE_PART_DISPLAY_PROFILES,{city,indexSHA:manifestSHA,sourcePBF:manifest!.source_pbf_sha256,boundarySHA:manifest!.city_boundary.sha256,sourceSnapshot:manifest!.source_snapshot,leafSHA:c=>sourceLeafByFeature.get(c.sourceFeature)});
    nativePlan.hiddenOutlines.push(...verifiedInteriorSourceHolds(packingComponents,c=>sourceLeafByFeature.get(c.sourceFeature)));
    const edgePlan=sourceEdgeAssemblyDisplayPlan(packingComponents,SOURCE_EDGE_ASSEMBLY_DISPLAY_PROFILES,{city,indexSHA:manifestSHA,sourcePBF:manifest!.source_pbf_sha256,boundarySHA:manifest!.city_boundary.sha256,sourceSnapshot:manifest!.source_snapshot,leafSHA:c=>sourceLeafByFeature.get(c.sourceFeature),materialReady:c=>!!progressiveAdmission(c,scope)});nativePlan.hiddenOutlines.push(...edgePlan.hiddenOutlines);
    const s020Plan=s020RelationOutlineDisplayPlan(packingComponents,S020_RELATION_OUTLINE_PROFILES,{city,indexSHA:manifestSHA,sourcePBF:manifest!.source_pbf_sha256,boundarySHA:manifest!.city_boundary.sha256,sourceSnapshot:manifest!.source_snapshot,leafSHA:c=>sourceLeafByFeature.get(c.sourceFeature),materialReady:c=>s020FullOriginalBatchRouteReady(c,undefined,scope)},undefined,scope);
    for(const outline of s020Plan.hiddenOutlines)if(!nativePlan.hiddenOutlines.some(c=>c.objectId===outline.objectId&&c.partId===outline.partId))nativePlan.hiddenOutlines.push(outline);
    const nextSourceEdgeAssemblyDisplay:typeof sourceEdgeAssemblyDisplay={groups:[...edgePlan.groups,...s020Plan.groups].map(g=>({groupIdentity:g.groupIdentity,outline:{objectId:g.outline.objectId,partId:g.outline.partId},partCount:g.parts.length,complete:false})),errors:[...edgePlan.errors,...s020Plan.errors]};
    let lastS434PackedGeneration=-1;
    const packedArgs=[mergeShadowAdmissions(chosen.filter(s=>shown.includes(s.id)).map(s=>{const rows=results[chosen.indexOf(s)];return rows?shadowByShard.get(rows):undefined;})),nativePlan,partialGateDisplayPlan(packingComponents,city,c=>sourceLeafByFeature.get(c.sourceFeature),scope),s402ConnectorPlan(packingComponents,{city,signal,leafSHA:(c:any)=>sourceLeafByFeature.get(c.sourceFeature),admissionSignature:(c:any)=>progressiveAdmission(c,scope)?.geometrySignature})] as const;
    const sourceRoles=components.map(c=>sourceRoleDisplayProfile(c)),packViewKey=JSON.stringify([f068Admission,(()=>{const c=map.getCenter();return[c.lng,c.lat];})(),shown,renderer!.selected]);
    const repackS434=(reason:'initial'|'ready'|'invalidated'='initial')=>{
     if(!publication.isCurrent()||!attempt.isCurrent()||destroyed||suspended||pageHidden||wantedMode==='2d'||!renderer)return;
     if(reason!=='initial'&&(generation!==lastS434PackedGeneration||residentPreparation!==prepared))return;
     const aggregatePacking=s434Aggregate.packing(),aggregateDiagnostic=JSON.stringify(aggregatePacking?.diagnostic??null);
     if(reason==='initial'&&renderer.getRevision().generation===generation&&renderer.getDrawReadiness().ready&&renderer.isPickReady?.()!==false&&residentPreparation===prepared&&sameStageComponents(lastPackedComponents,components)&&lastPackedAggregateProfile===aggregatePacking?.profile&&lastPackedAggregateDiagnostic===aggregateDiagnostic&&lastPackedViewKey===packViewKey&&lastPackedSourceRoles&&lastPackedSourceRoles.length===sourceRoles.length&&lastPackedSourceRoles.every((p,i)=>p===sourceRoles[i])){duplicatePackSkips++;rememberPublishedDetails();validateDetail(shown);lastS434PackedGeneration=generation;drawTarget.generation=generation;drawTarget.registered=true;drawTarget.sourceResourceKeys=sourceResourceKeys(shown,chosen,detailBindings);stageExplicitSources(prepared.chunkInput,drawTarget.generation!,drawTarget.current);lastRegistered=drawTarget;adoptDetail(shown,lastS434PackedGeneration);return;}
     attempt.current();prepared.signal=signal;rememberPublishedDetails();validateDetail(shown);lastS434PackedGeneration=++generation;
     renderer.setBatches(components,lastS434PackedGeneration,...packedArgs,aggregatePacking,s036NorthCofacePlan(packingComponents,{city,signal,leafSHA:(c:any)=>sourceLeafByFeature.get(c.sourceFeature),admissionSignature:(c:any)=>progressiveAdmission(c,scope)?.geometrySignature}),s240BaseCofacePlan(packingComponents,{city,signal,leafSHA:(c:any)=>sourceLeafByFeature.get(c.sourceFeature),admissionSignature:(c:any)=>progressiveAdmission(c,scope)?.geometrySignature}),f151CrownPlan(packingComponents,{city,signal,leafSHA:(c:any)=>sourceLeafByFeature.get(c.sourceFeature)}),f068Admission,prepared);
     drawTarget.generation=lastS434PackedGeneration;drawTarget.registered=true;drawTarget.sourceResourceKeys=sourceResourceKeys(shown,chosen,detailBindings);stageExplicitSources(prepared.chunkInput,drawTarget.generation!,drawTarget.current);lastRegistered=drawTarget;adoptDetail(shown,lastS434PackedGeneration);keepPreparedBatches(prepared);preparedAdmissionKey=JSON.stringify(f068Admission);
     lastPackedComponents=components;lastPackedAggregateProfile=aggregatePacking?.profile;lastPackedAggregateDiagnostic=aggregateDiagnostic;lastPackedViewKey=packViewKey;lastPackedSourceRoles=sourceRoles;
    };
    s434Aggregate.update(packingComponents,{city,signal,cohortDiagnostic:s434CohortSelection.diagnostic(packingComponents),leafSHA:c=>sourceLeafByFeature.get(c.sourceFeature),admission:c=>progressiveAdmission(c as BuildingComponent,scope),onChange:reason=>repackS434(reason)});
    repackS434();attempt.current();ownerReconstruction=nextOwnerReconstruction;sourceEdgeAssemblyDisplay=nextSourceEdgeAssemblyDisplay;visibleRetainedEstimateBytes=retainedEstimate;currentNativeGroupDisplay=nativePlan;options.onNativeGroupDisplay?.(nativePlan);renderer!.setEnabled(true);selectedShardIds=shown;if(latestDrawTarget?.ticket===ticket)latestDrawTarget.managerState={owner:ownerReconstruction,edge:sourceEdgeAssemblyDisplay,retainedBytes:visibleRetainedEstimateBytes,selected:selectedShardIds,native:currentNativeGroupDisplay};
    if(!firstDrawPending){firstDrawPending=true;void drawReady.then(()=>{current(signal,ticket);if(!finished)announce('loading');}).catch(()=>{});}
   },markPreparation);
   markPreparation('draw');await settleDetail(drawReady,drawTarget);attempt.current();
  };const running=work();publication.trackPreparation(attempt,running);pendingPreparations.add(running);void running.then(()=>{pendingPreparations.delete(running);},()=>{pendingPreparations.delete(running);});await Promise.race([running,new Promise<never>((_resolve,reject)=>{void drawReady.catch(reject);})]);};
  // Keep the selected runtime cohort atomic: the chunk-input authority groups are
  // built for the whole selected cohort, so the request stages once every selected
  // leaf is read rather than once per leaf as the other four managers do
  // (DECISIONS 2026-11-02 01:35).
  const stage=()=>{if(finished||activate||results.filter(Boolean).length!==chosen.length||new URLSearchParams(location.search).has('review303'))return;publication.stage(commit,error=>{if(!publication.isCurrent())return;if(error instanceof StaleBuildingDetailDemandError&&ticket===revision&&!signal.aborted&&!destroyed){modeRequests.invalidateViewport(request);if(!map.isMoving?.()&&!modeRequests.settleViewport())queueMicrotask(()=>{if(ticket===revision&&!destroyed&&!map.isMoving?.())moved();});return;}lastError=String(error);announce('error');});};
  // IA-R1 (DECISIONS 2026-11-02 07:49 (b)): until every selected source is
  // ready, the ready ones not yet published are page-level reclaimable through
  // the native source pool's cohort registry (the lease store's composition age
  // order). The cohort returns its whole batch (the readers end with the yield
  // and every source role is returned below) instead of holding ready sources
  // while one of its own waits for capacity; visible() then waits holding
  // nothing outside the gate and reads again.
  const chosenKeys=new Map(chosen.map(leaf=>[leaf,sourceResourceKey(leaf,detailBindings.get(leaf))])),sourceReady=(leaf:Shard)=>sourceDiagnostics.has(chosenKeys.get(leaf)!);
  let readsDone=false;const cohortRead=cohort?.attempt({metadataHintSafe:true,metadataHintMaxPending:chosen.length,held:()=>{let held=0;for(const key of chosenKeys.values())if(!mainSourceLeases.has(key))held+=sourceDiagnostics.get(key)?.retainedEstimateBytes??0;return held;},pending:()=>chosen.flatMap(leaf=>sourceReady(leaf)?[]:detailBindings.has(leaf)?[{label:chosenKeys.get(leaf)!}]:[{asset:leaf,label:sourceResourceKey(leaf,undefined)}])},signal),readSignal=cohortRead?.signal??signal;
  const readers=runAbortableReaders(readSignal,[0,1].map(()=>async(readerSignal:AbortSignal)=>{while(index<chosen.length){readerSignal.throwIfAborted();const at=index++,sourceKey=sourceResourceKey(chosen[at],detailBindings.get(chosen[at]));if(!sourceCandidates.has(sourceKey))sourceCandidates.set(sourceKey,wantedSources.retain(sourceKey,'candidate'));const rows=await shard(chosen[at],readerSignal,session,detailBindings.get(chosen[at]));current(readerSignal,ticket);cohortRead?.check();readerSignal.throwIfAborted();if(finished)return;if(!activate){admit(at,rows);stage();}}}));
  // Parked while every source not yet ready waits for capacity in the pool.
  const unparkRead=demand?.park(()=>chosen.some(leaf=>!sourceReady(leaf))&&chosen.every(leaf=>sourceReady(leaf)||!detailBindings.has(leaf)&&options.nativeSources?.parkedNeed?.(leaf)!==undefined));
  try{await readers;readsDone=true;unparkRead?.();cohortRead?.close();current(signal,ticket);if(mode!=='3d'&&!activate)throw new DOMException('Aborted','AbortError');
   const centre=map.getCenter(),outside=!chosen.length&&!containsPosition(boundary,[centre.lng,centre.lat]);
   // Preparation acquires wanted source roles without publishing on the flat camera.
   if(activate)return {mode,status:outside?'outside':partial?'partial':'ready'} as ThreeDControlState;
   current(signal,ticket);finished=true;await publication.finish(commit);current(signal,ticket);recoveryResident.complete();return result(outside?'outside':partial?'partial':'ready');
  }finally{finished=true;session=undefined;try{await publication.close();}finally{await Promise.allSettled([readers]);await Promise.allSettled([...pendingPreparations]);results.length=0;for(const lease of sourceCandidates.values())lease.release();sourceCandidates.clear();if(stagingTicket===ticket)stagingRetainedEstimateBytes=0;unparkRead?.();cohortRead?.close();if(cohortRead?.yielded&&!readsDone&&!destroyed){wantedSources.reconcile([]);void wantedSources.keys;}}}
 }
 async function requestMode(next:ThreeDViewMode,external:AbortSignal,transition:boolean|ThreeDModeTransition=false):Promise<ThreeDControlState>{
  const skipCamera=transition===true||typeof transition==='object'&&transition?.skipCamera===true,retainPrograms=typeof transition==='object'&&transition?.retainPrograms===true;
  external.throwIfAborted();if(destroyed||suspended)throw new DOMException('Aborted','AbortError');
  recoveryResident.invalidate();wantedMode=next;request.abort();const previous=mode;
  return modeRequests.run(external,next==='3d',async own=>{
   if(destroyed||suspended)throw new DOMException('Aborted','AbortError');
   request.abort();request=own;const signal=own.signal,ticket=++revision;preparingTicket=next==='3d'?ticket:undefined;
   try{
    current(signal,ticket);if(next==='2d'){publishedDetailResources.clear();publishedDetailGeneration=undefined;publishedManagerState=undefined;currentNativeGroupDisplay=undefined;adoptedDetailResources.clear();mode='2d';renderer?.setEnabled(false,retainPrograms?{retainPrograms:true}:undefined);renderer?.suspendSelection();s434Aggregate.clear();if(retainPrograms)renderer?.setBatches([],++generation,{retainPrograms:true} as never);else renderer?.setBatches([],++generation);publishedContentKeys=[];clearRequiredSolarCoverage();clearPreparedBatches();ownerReconstruction=ownerShapePatchMetadata([],()=>undefined);options.onNativeGroupDisplay?.({hiddenOutlines:[],groups:[],errors:[]});clearSourceDemand();partitions?.clear();visibleRetainedEstimateBytes=0;stagingRetainedEstimateBytes=0;selectedShardIds=[];if(options.manageCamera!==false){map.stop();map.easeTo({pitch:0,duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:220});}return announce('ready');}
    await ensure(signal);current(signal,ticket);await visible(signal,ticket,true,false);current(signal,ticket);mode='3d';if(!skipCamera&&options.manageCamera!==false)await moveCamera(signal,ticket);current(signal,ticket);const result=await visible(signal,ticket,false,false);current(signal,ticket);return announce(result.status);
   }catch(error){if(signal.aborted||destroyed||ticket!==revision)throw error;lastError=String(error);const retainedReady=lastReadyGeneration!==undefined&&renderer?.getRevision().generation===lastReadyGeneration;const fallback=clearedFailedTicket===ticket?'2d':retainedReady?'3d':previous;mode=fallback;renderer?.setEnabled(fallback==='3d',fallback==='2d'?{retainPrograms:true}:undefined);if(fallback==='2d'&&clearedFailedTicket!==ticket){adoptedDetailResources.clear();s434Aggregate.clear();renderer?.setBatches([],++generation,{retainPrograms:true} as never);publishedContentKeys=[];clearRequiredSolarCoverage();clearPreparedBatches();ownerReconstruction=ownerShapePatchMetadata([],()=>undefined);options.onNativeGroupDisplay?.({hiddenOutlines:[],groups:[],errors:[]});}announce('error');throw error;}finally{if(preparingTicket===ticket)preparingTicket=undefined;if(detailRefreshPending)map.triggerRepaint();}
  });
 }
 function clearRequiredSolarCoverage(){requiredSolarCoverageBounds=undefined;requiredSolarCoverageGeneration=undefined;}
 function publishRequiredSolarCoverage(detailResources:Iterable<BuildingDetailResource>,publishedGeneration:number){
  let bounds:SolarWorldBounds|undefined;
  for(const resource of detailResources){const next=buildingDetailSolarCoverageBounds(resource.components,resource.maxErrorM);if(!next)throw Error('Published detail has invalid canonical solar coverage bounds');bounds=mergeSceneSolarCoverageBounds(bounds,next);if(!bounds)throw Error('Published detail solar coverage cannot be merged');}
  requiredSolarCoverageBounds=bounds;requiredSolarCoverageGeneration=publishedGeneration;
 }
 function getRequiredSolarCoverageBounds():SolarWorldBounds|undefined{return !destroyed&&mode==='3d'&&renderer?.getRevision().generation===requiredSolarCoverageGeneration?requiredSolarCoverageBounds:undefined;}
 function getDetailSettlement(){
  const draw=renderer?.getDrawReadiness();
  return deriveSceneSolarDetailSettlement({
   active:!destroyed&&!suspended&&!pageHidden&&!request.signal.aborted&&mode==='3d'&&wantedMode==='3d'&&!!renderer,
   failed:detailSettlementFailed||!!draw?.failure,
   requestRevision:revision,readyRequestRevision:lastReadyTicket,
   generation:renderer?.getRevision().generation,readyGeneration:lastReadyGeneration,
   pending:detailRefreshPending||visibleLoadsPending>0||preparingTicket!==undefined||cameraMotionTicket!==undefined||ownCameraStartingTicket!==undefined||Boolean(map.isMoving?.())||modeRequests.refreshBlocked||s434Aggregate.pending||draw?.ready!==true||draw.preparing,
   publicationGeneration:requiredSolarCoverageGeneration,publicationBounds:requiredSolarCoverageBounds,
  });
 }
 function requestDetailRefresh(){if(destroyed||wantedMode!=='3d')return;detailRefreshPending=true;if(!visibleLoadsPending&&preparingTicket===undefined)map.triggerRepaint();}
 function flushDetailRefresh(){
  synchronizePublishedExplicitSources();
  const actual=renderer?.getRevision().generation;if(actual!==undefined&&actual!==requiredSolarCoverageGeneration&&renderer?.getDrawReadiness().ready)publishRequiredSolarCoverage(currentPickingResources(),actual);
  if(!detailRefreshPending||destroyed||suspended||pageHidden||mode!=='3d'||wantedMode!=='3d'||modeRequests.refreshBlocked||visibleLoadsPending||preparingTicket!==undefined||cameraMotionTicket!==undefined||ownCameraStartingTicket!==undefined||map.isMoving?.()||s434Aggregate.pending)return;
  if(modeRequests.settleViewport())return;
  // A configured focus registry must match the actual loaded source manifest.
  options.buildingFocus?.forIndex(manifestSHA);
  detailRefreshPending=false;moved();
 }
 function currentPickingResources():BuildingDetailResource[]{const actual=rememberPublishedDetails();if(actual===publishedDetailGeneration)return [...publishedDetailResources.values()];if(adoptedDetailResources.size)throw Error('Published detail picking binding is unavailable');return [];}
 function pickingNeedsCanonical(point:{x:number;y:number}){const projection=options.getModelViewProjection?.();return currentPickingResources().some(resource=>resource.level!=='near'&&buildingDetailMayContainPick(resource,point,origin=>modelProjectionAtOrigin(projection,origin)));}
 async function prepareCanonicalPicking(point:{x:number;y:number},signal:AbortSignal):Promise<void>{
  signal.throwIfAborted();if(destroyed||suspended||pageHidden||mode!=='3d'||wantedMode!=='3d'||!options.detailRuntime||!pickingNeedsCanonical(point))return;
  const cameraKey=options.getModelViewProjection?.()?.cameraKey,projection=options.getModelViewProjection?.(),candidateResources=new Set(currentPickingResources().filter(resource=>buildingDetailMayContainPick(resource,point,origin=>modelProjectionAtOrigin(projection,origin))).map(resource=>resource.key));
  const picking:ChunkResourceLease<SourceContent>[]=[];for(const source of mainSourceLeases.values())if(source.value?.selectedResourceKey&&candidateResources.has(source.value.selectedResourceKey))picking.push(source.retain('picking'));
  try{
  await requestMode('3d',signal,true);signal.throwIfAborted();
  if(cameraKey!==options.getModelViewProjection?.()?.cameraKey)throw new DOMException('Canonical picking viewport changed','AbortError');
  if(pickingNeedsCanonical(point))throw Error('Canonical picking candidate did not publish near geometry');
  }finally{for(const lease of picking)lease.release();}
 }
 const moveStarted=()=>{if(destroyed||suspended||pageHidden||modeRequests.refreshBlocked||ownCameraStartingTicket===revision||mode!=='3d'&&preparingTicket===undefined)return;recoveryResident.invalidate();if(options.buildingFocus?.enabled)focusState?.moveStarted(resources);modeRequests.invalidateViewport(request);s434Aggregate.clear();clearPreparedBatches();wantedSources.reconcile([]);revision++;announce('loading');if(mode!=='3d')renderer?.setEnabled(false);};
 const moved=()=>{if(destroyed||suspended||pageHidden||cameraMotionTicket===revision)return;if(modeRequests.settleViewport())return;if(mode!=='3d'){if(wantedMode==='3d')void requestMode('3d',new AbortController().signal).catch(()=>{});return;}request.abort();const own=request=new AbortController(),ticket=++revision;void visible(own.signal,ticket).catch(error=>{if(!destroyed&&!own.signal.aborted&&ticket===revision){lastError=String(error).slice(0,1400);announce('error');}});};
 function setWorkHidden(value:boolean){if(value===pageHidden){renderer?.setPageHidden(value);return;}pageHidden=value;renderer?.setPageHidden(value);const pending=modeRequests.setHidden(value,request);if(value){wantedSources.reconcile([]);if(wantedMode==='3d'){recoveryResident.invalidate();revision++;renderer?.setEnabled(false);}}else if(!destroyed&&!suspended){renderer?.setEnabled(mode==='3d');if(!pending&&wantedMode==='3d')moved();}}
 map.on('movestart',moveStarted);map.on('moveend',moved);map.on('render',flushDetailRefresh);

 return {get detailDemandPending(){return detailRefreshPending||visibleLoadsPending>0||preparingTicket!==undefined;},get detailDemandHeld(){return detailDemand.held();},getRequiredSolarCoverageBounds,getDetailSettlement,requestDetailRefresh,retainSelectedSource,retainSourceContent,prepareCanonicalPicking,getCameraReadinessDiagnostic:()=>cameraReadiness,getDrawReadinessDiagnostic:()=>drawReadiness,getOwnerReconstructionBinding(identity:{objectId:string;partId:string}){return ownerReconstruction.components.find(c=>c.objectId===identity.objectId&&c.partId===identity.partId);},getSourceBinding(identity:{objectId:string;partId:string}){const c=renderer?.borrowSourceComponent(identity),leaf=c?sourceLeafByFeature.get(c.sourceFeature):undefined;if(!manifest||!c||!leaf)return undefined;return {city,objectId:c.objectId,partId:c.partId,sourcePBF:manifest.source_pbf_sha256,boundarySHA:manifest.city_boundary.sha256,nativeLeafSHA:leaf,contentKey:sourceContentByFeature.get(c.sourceFeature),resourceKey:sourceResourceByFeature.get(c.sourceFeature)};},async readAsset(asset:string|Asset,signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions):Promise<unknown>{const path=typeof asset==='string'?asset:asset.path;if(!pathValid(path)||typeof asset!=='string'&&!assetValid(asset,max))throw Error('Invalid3D read asset');signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');/* A verified descriptor's own byte count is its read ceiling, so its read is sized by the asset, not by the caller's generic ceiling: limit=min(max, asset.bytes) for a descriptor, max for a plain path. Caller-admitted: each caller already holds its own claim for the integrity copy and the parse working set while it calls here; this reader admits nothing beside that claim and never waits holding it. With `admission` the caller has minted resourceByteAdmittedEnvelope(path, limit) and holds [...own costs, ...envelope] as one claim; it goes to the page transport unchanged ({admitted, envelope, keep}), whose delivery replaces the claim's costs in place by [...keep, delivered buffer] and which never waits for capacity, so this read takes no fetch slot (nothing queued behind a slot holds a claim). An abort, a failure or a refused delivery leaves that claim as it was and goes back to its caller unchanged, a transient TypeError included: that claim and envelope carried this one read, so only the caller can read again, with a newly minted envelope under its own admission. Without `admission` the transport's own envelope admission is the only wait, in this manager's fetch queue with the concurrency and disposal of its other fetches, and a lease delivered to an abandoned read is returned. Without the page transport the read is raw, under the caller's claim, which stays as it was. Either transport read holds its exact lease until decoding returns; the caller owns the value. */const limit=typeof asset==='string'?max:Math.min(max,asset.bytes),acquire=options.acquireBytes;if(!acquire){const bytes=await fetchBounded(path,signal,limit);return typeof asset==='string'?decoded(bytes):checked(bytes,asset,signal);}let lease:ResourceBytesLease;if(admission){lease=await acquire(path,signal,limit,admission);}else{let delivered:ResourceBytesLease|undefined,abandoned=false;lease=await scheduled(async(readSignal?:AbortSignal)=>{const own=readSignal??signal;for(let attempt=0;;attempt++){let read:ResourceBytesLease;try{read=await acquire(path,own,limit);}catch(error){if(own.aborted||error instanceof ResourceBudgetExceededError)throw error;if(!(error instanceof Error&&error.name==='TypeError'&&!/caller-admitted|read envelope|unmeasured resource|resource (?:budget|allocation|cost|reservation|eviction|availability)|reservation flag|must be (?:an? |boolean)/i.test(error.message)&&(error as {code?:unknown}).code!=='RESOURCE_CONTRACT_VIOLATION')||attempt===1)throw new Error('3D asset '+path+': '+String(error));continue;}if(own.aborted||destroyed){read.release();own.throwIfAborted();throw new DOMException('Aborted','AbortError');}delivered=read;if(abandoned){read.release();throw new DOMException('Aborted','AbortError');}return read;}},signal).catch((error:unknown)=>{abandoned=true;delivered?.release();throw error;});}try{signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');const bytes=lease.bytes;return typeof asset==='string'?decoded(bytes):await checked(bytes,asset,signal);}finally{lease.release();}},setPageHidden(value:boolean){documentHidden=value;setWorkHidden(documentHidden||!viewportVisible);},setViewportVisible(value:boolean){viewportVisible=value;setWorkHidden(documentHidden||!viewportVisible);},setReducedMotion(value:boolean){renderer?.setReducedMotion(value);},requestMode,get wantedMode(){return wantedMode;},get sourceMetadata(){return manifest?{snapshot:manifest.source_snapshot,attribution:manifest.source?.attribution,url:manifest.source?.url}:undefined;},get mode(){return mode;},get renderer(){return renderer;},getRevision(){return renderer?.getRevision()??{generation,viewRevision:0};},setOpacityContext(value:'normal'|'route-selection'){renderer?.setOpacityContext(value);},cacheStats:()=>({documentHidden,viewportVisible,pageHidden,lastError,drawReadiness,visibleLoadsPending,duplicatePackSkips,sourceEdgeAssemblyDisplay,ownerReconstruction,logicalLeafRequestGuard:maxVisible,visibleVertexLimit:maxVertices,reservedAppearanceVertices,nativeAdmissionVertexLimit,viewportBounds:(()=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];})(),mode,wantedMode,metadataPages:partitions?.stats,...sourceStats(),visibleRetainedPayloadEstimateBytes:visibleRetainedEstimateBytes,stagingRetainedPayloadEstimateBytes:stagingRetainedEstimateBytes,physicalShardFetchTransientMaxBytes:2*1024**2,active,peakConcurrency:peak,loadCount,visibleShardIds:selectedShardIds,partial,selected:renderer?.selected,revision:renderer?.getRevision(),renderer:renderer?.stats,rendererScreenSamples:renderer?.diagnosticScreenSamples(),zoom:map.getZoom(),pitch:map.getPitch(),queued:queue.length}),suspend(settings?:ContextRecoveryOptions){const keep=recoveryResident.suspend(settings?.contextRecovery===true&&!request.signal.aborted&&active===0&&queue.length===0&&preparingTicket===undefined&&cameraMotionTicket===undefined&&ownCameraStartingTicket===undefined&&visibleLoadsPending===0&&!s434Aggregate.pending);suspended=true;if(settings?.contextRecovery!==true)wantedSources.reconcile([]);if(!keep){modeRequests.cancel();revision++;request.abort();}renderer?.setEnabled(false);return keep;},resume(settings?:ContextRecoveryOptions){const keep=suspended&&recoveryResident.reuse(settings?.contextRecovery===true&&!request.signal.aborted&&active===0&&queue.length===0&&preparingTicket===undefined&&cameraMotionTicket===undefined&&ownCameraStartingTicket===undefined&&visibleLoadsPending===0&&!s434Aggregate.pending);suspended=false;modeRequests.resume();renderer?.setEnabled(mode==='3d'&&!pageHidden);if(keep){map.triggerRepaint();return;}if(!pageHidden||settings?.contextRecovery!==true)lastPackedViewKey=undefined;recoveryResident.invalidate();moved();},destroy(){if(destroyed)return;destroyed=true;focusState?.destroy();clearExplicitSources();detailRefreshPending=false;clearRequiredSolarCoverage();wantedSources.destroy();publishedDetailResources.clear();publishedDetailGeneration=undefined;publishedManagerState=undefined;currentNativeGroupDisplay=undefined;adoptedDetailResources.clear();modeRequests.cancel();options.nativeSources?.destroy();options.onNativeGroupDisplay?.({hiddenOutlines:[],groups:[],errors:[]});revision++;request.abort();map.off('movestart',moveStarted);map.off('moveend',moved);map.off('render',flushDetailRefresh);clearSourceDemand();partitions?.clear();visibleRetainedEstimateBytes=0;stagingRetainedEstimateBytes=0;if(renderer){if(map.getLayer(renderer.layer.id))map.removeLayer(renderer.layer.id);renderer.destroy();}facadeHelpers?.release();facadeHelpers=undefined;bootstrapRetained?.release();bootstrapRetained=undefined;s434Aggregate.clear();clearPreparedBatches();options.frozenData?.dispose();}};
}
