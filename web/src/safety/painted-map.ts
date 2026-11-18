import {createDetailRefreshTrace,type DetailRefreshReason} from './detail-refresh-trace';
import {createVisiblePreparationGate} from './visible-preparation-gate';
import type {ContextRecoveryOptions} from './recovery-resident-reuse';
import {createSharedNativeSourcePool} from './shared-native-source';
import {planarReflectionGroup} from './planar-reflection-group';
import type {installThreeDimensionalMap as CityInstaller} from '../painted/city/safety/three-dimensional-map';
import type {PaintProvider} from './paint-ownership';
import {paintOwner} from './paint-ownership';
import assetRegistry from './paint-asset-registry.json';
import {beginFrozenPaintTableInitialization,createFrozenDataResourceOwner,frozenPaintTableStats} from './frozen-paint-tables';
import {profileSHA256,buildingDetailCatalog,buildingFocusRegistry} from 'virtual:crimemaps-city-data';
import type {CustomLayerInterface} from 'maplibre-gl';
import {createModelViewProjection,modelProjectionAtOrigin,type ModelViewProjectionSnapshot} from './model-view-projection';
import {createBuildingFocusRegistry} from './building-focus-registry';
import {createBuildingDetailIndexResolver} from './building-detail-catalog';
import {createBuildingDetailRuntime,type BuildingDetailSelectionSnapshot} from './building-detail-runtime';
import type {BuildingDetailDemandIndex,BuildingDetailPassDemand} from './building-detail-demand';
import {buildingDetailMayContainPick} from './building-detail-demand';
import type {PlanarReflectionProjection,PlanarReflectionPass,SolarShadowPublication} from './planar-building-reflection';
import {createSolarShadowPreparationBudget,solarShadowPreparation,type SolarShadowPreparationBudget,type SolarShadowPreparationResult} from './solar-shadow-preparation';
import {mirrorMercatorProjection,planarReflectionBudget,planarReflectionSize} from './planar-building-reflection';
import {createProspectiveSceneSolarProjection,buildingDetailSolarCoverageBounds,mergeSceneSolarCoverageBounds,type SolarWorldBounds} from './prospective-solar-projection';
import {checkedSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import type {ResidentDrawReadiness} from './resident-draw-readiness';
import type {RecoveryReadyProvider,RecoveryReadySnapshot} from './custom-layer-recovery';
import {getPageChunkResourceStore,bindChunkResourceContext,ChunkResourceContextLostError} from './render-runtime/chunk-resource-store';
import {cityCacheIdleTiers} from './city-cache-retention';
import {releaseRecentPrograms,getRecentProgramStats} from './render-runtime/program-preparation';
import {createResourceByteTransport,type ResourceByteAcquireOptions} from './resource-byte-transport';
import {facadeHelperSourceStats} from './facade-helper-source';
import {withQaCustomLayerRenderTiming} from './qa-custom-layer-render-timing';
import {sceneSolarLight} from './scene-solar-light';
import {createSceneSolarDetailCoordinator,type SolarDetailSettlement} from './scene-solar-detail-coordinator';

type CityOptions = Parameters<typeof CityInstaller>[0];
/** A failed 3D request that this compositor rolled back to the retained 2D map.
 * The provider is diagnostic only; the public notice does not name it. */
export type ThreeDFallback = {readonly reason:'readiness-timeout'|'error';readonly provider:PaintProvider|'initialization'};
export type ThreeDCompositorState = Parameters<NonNullable<CityOptions['onState']>>[0]&{fallback?:ThreeDFallback};
type Options = Omit<CityOptions,'onState'>&{onState?:(state:ThreeDCompositorState)=>void};
/** One asset read through the City manager. A caller-admitted read passes the
 * transport's fourth argument {admitted, envelope, keep} (envelope minted by
 * resourceByteAdmittedEnvelope for min(max, asset.bytes)) only after
 * ensureReady(signal) resolved, holding nothing while it waited; undefined keeps
 * the three-argument path, which may itself wait for readiness. */
type ReadAsset=(asset:Parameters<ReturnType<typeof CityInstaller>['readAsset']>[0],signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions)=>Promise<unknown>;
/** Diagnostics only: one provider's program-preparation row reduced to its
 * page-ledger wait, recent-set and scheduler dispatch fields (no arrays). */
export type ProgramBudgetDigest=Readonly<{provider?:string;budget?:Readonly<Record<string,unknown>>;recent?:Readonly<Record<string,unknown>>;dispatch?:Readonly<Record<string,unknown>>}>;
/** Diagnostics only: the readiness timing, program waits and page ledger at the
 * moment a 3D request timed out, captured before its 2D rollback (local
 * diagnostics pages only; one row per provider). */
export type ReadinessTimeoutSnapshot=Readonly<{atMs:number;utc:string;provider:PaintProvider|'initialization';message:string;ledger:Readonly<Record<string,unknown>>;providers:readonly Readonly<{provider:PaintProvider;draw?:Readonly<Record<string,unknown>>;readiness?:Readonly<Record<string,unknown>>;programs:readonly ProgramBudgetDigest[]}>[]}>;
/** Bounded resource diagnostics of this compositor: retained executables per
 * bound GL context (at most 4), one digest per program-preparation row (at most
 * 16) and the last readiness-timeout snapshot. Reading never selects, repaints,
 * reads bytes or changes the ledger. */
/** Last failed transition, captured before rollback; exact error pressure and
 * the ledger's latest pressure are distinct observations, never substituted. */
export type TransitionFailureSnapshot=Readonly<{atMs:number;utc:string;provider:ThreeDFallback['provider'];message:string;errorName?:string;errorPressure?:Readonly<Record<string,unknown>>;ledger:Readonly<Record<string,unknown>>}>;
export type CompositorResourceDiagnostics=Readonly<{detailRefresh?:ReturnType<ReturnType<typeof createDetailRefreshTrace>['snapshot']>;recentPrograms:readonly ReturnType<typeof getRecentProgramStats>[];providers:readonly ProgramBudgetDigest[];readinessTimeout:ReadinessTimeoutSnapshot|undefined;transitionFailure?:TransitionFailureSnapshot}>;
type ProviderActual = Omit<ReturnType<typeof CityInstaller>,'prepareCanonicalPicking'|'readAsset'>&{readAsset:ReadAsset;getDetailSettlement?:()=>SolarDetailSettlement|undefined;readonly detailDemandPending?:boolean;readonly detailDemandHeld?:boolean;setViewportVisible?:(visible:boolean)=>void;getDrawReadinessDiagnostic?:()=>Record<string,unknown>|undefined;prepareCanonicalPicking?:(point:{x:number;y:number},signal:AbortSignal)=>Promise<void>};
// Canonical promotion is a provider-internal hook; public picking owns its token through renderer.preparePick.
type Engine = NonNullable<ProviderActual['renderer']>;
type PublicRenderer=Engine&{getDrawReadinessSnapshot:()=>RecoveryReadySnapshot};
/** One provider's detail runtime selection record beside that provider's own
 * renderer generation at the same read (null before its first renderer).
 * Compare rendererGeneration with the snapshot's top-level publishedGeneration
 * or a session leaf's; a resident leaf's residentPublications is that resident's
 * own count, never a renderer generation. */
export type ProviderBuildingDetailSelectionSnapshot = Readonly<{provider:PaintProvider;rendererGeneration:number|null;snapshot:BuildingDetailSelectionSnapshot}>;
export type BuildingDetailSolarSnapshot=Readonly<{
  state:ReturnType<typeof createSceneSolarDetailCoordinator>['state'];
  plan:ReturnType<ReturnType<typeof createSceneSolarDetailCoordinator>['capturePlan']>;
  providers:readonly Readonly<{provider:PaintProvider;settlement:SolarDetailSettlement|undefined}>[];
}>;
type Actual = Omit<ProviderActual,'getCameraReadinessDiagnostic'|'getDetailSettlement'|'getDrawReadinessDiagnostic'|'prepareCanonicalPicking'|'retainSelectedSource'|'getRequiredSolarCoverageBounds'|'requestDetailRefresh'|'detailDemandPending'|'detailDemandHeld'|'renderer'>&{readonly renderer:PublicRenderer|undefined;setViewportVisible:(visible:boolean)=>void;getDrawReadinessSnapshot:()=>RecoveryReadySnapshot;getFrozenDataResourceStats:()=>ReturnType<typeof createFrozenDataResourceOwner>['stats']|undefined;getNativeSourceDiagnostics:()=>ReturnType<typeof createSharedNativeSourcePool>['stats']|undefined;getManagerDrawReadiness:()=>{provider:PaintProvider;record:Record<string,unknown>}[]|undefined;getBuildingDetailSelectionSnapshots:()=>readonly ProviderBuildingDetailSelectionSnapshot[];getBuildingDetailSolarSnapshot:()=>BuildingDetailSolarSnapshot|undefined;
  /** A real new context loss may recover an already settled 2D fallback.
   * Keep its diagnostics, but exclude only that request's failure from readiness. */
  beginContextRecovery:()=>boolean;
  getRecoveryPreparationStats:()=>readonly ({provider:string}&Record<string,unknown>)[];
  /** Readiness only: resolves once every provider manager is installed (the
   * initialization readAsset would otherwise await), rejects on the caller's
   * abort or destroy. Holds no reservation and reads nothing. Call it only
   * after 3D was requested (the product callers run in 3D: the water profile
   * checks the mode, environment installs after 3D, scenery reads after
   * setMode(true)): before any 3D initialization it starts that initialization
   * itself under the caller's signal, importing and installing every provider
   * manager, and a 3D request that joins it fails with AbortError when that
   * caller aborts, as the three-argument readAsset always did. */
  ensureReady:(signal:AbortSignal)=>Promise<void>;
  getResourceDiagnostics:(programStats?:readonly unknown[])=>CompositorResourceDiagnostics};

/** One public lifecycle and camera owner; frozen painting implementations keep
 * their own source verification and shader contexts. Ownership is applied before
 * packing, so each native/display component appears in exactly one GPU layer.
 * Transport is shared and bounded across all implementations.
 */
export function installThreeDimensionalMap(options: Options): Actual {
  const resourceStore=options.resourceStore??getPageChunkResourceStore({profile:(options.mobile??matchMedia('(max-width:760px)').matches)?'mobile':'desktop',cacheIdleTiersMs:cityCacheIdleTiers(options.city)});
  const transport=createResourceByteTransport({namespace:JSON.stringify([options.city,profileSHA256]),resourceStore,read:options.fetchBytes});
  const fetchBytes=transport.readBytes,acquireBytes=transport.acquireBytes;
  const resourceLayers=new WeakSet<CustomLayerInterface>();
  // GL contexts bound to this page store by this compositor's layers. A context
  // restore keeps its object, so this holds one entry per map canvas.
  const boundContexts=new Set<WebGL2RenderingContext>();
  // Readiness-timeout snapshots are taken only on a local diagnostics page.
  const localDiagnostics=typeof location!=='undefined'&&location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('diagnostics');
  const detailRefreshTrace=localDiagnostics?createDetailRefreshTrace():undefined;
  function traceDetailRefresh(reason:DetailRefreshReason,provider?:string){detailRefreshTrace?.record(reason,performance.now(),provider);}
  // Only a provider that has consulted a pass demand can hold a decision made
  // under the old reflection or lighting inputs. New readers use the live inputs.
  const detailDemandReaders=new Set<PaintProvider>();
  const pendingDetailRefresh=new Set<PaintProvider>();
  function invalidateDetailDemands(reason:'reflection-state'|'reflection-plane'|'scene-environment'){
    if(!detailConfigured)return;
    traceDetailRefresh(reason);
    for(const provider of detailDemandReaders)pendingDetailRefresh.add(provider);
    options.map.triggerRepaint();
  }
  let readinessTimeout:ReadinessTimeoutSnapshot|undefined;
  let transitionFailure:TransitionFailureSnapshot|undefined;
  const collectRetiredResources=()=>{
    resourceStore.collectRetired();
    if(detailConfigured){syncSolarDetailContext();solarDetail.update();}
    if(pendingDetailRefresh.size&&projectionActive()){
      const providers=[...pendingDetailRefresh];
      pendingDetailRefresh.clear();
      traceDetailRefresh('broadcast-dispatch');
      for(const provider of providers)managers.get(provider)?.requestDetailRefresh?.();
    }
  };
  const providerOrder: PaintProvider[] = ['root500', 'delegated500', 'tier300', 'church', 'city', ...(['frankfurt','stuttgart','essen'].includes(options.city)?['infill' as const]:[]), ...(options.city==='bremen'?['bremen' as const]:[])];
  const preparationGate=createVisiblePreparationGate();
  const modelViewProjection=createModelViewProjection();
  const pickingDemands=new Set<{point:{x:number;y:number};cameraKey:string;release:()=>void}>();
  let detailSceneEnvironment:SceneEnvironmentState|undefined;
  let sceneSunlightFallback:{key:string;light:Engine['sceneSunlight']}|undefined;
  let detailReflection:Pick<ModelViewProjectionSnapshot,'mainMatrix'|'viewport'|'mercator'|'cameraKey'>|undefined;
  let detailReflectionPlane:number|undefined;
  let detailReflectionEnabled:boolean|undefined;
  let solarDetailContextGeneration=0;
  const detailMobile=options.mobile??matchMedia('(max-width:760px)').matches;
  let projectionSuspended=false;
  const managers = new Map<PaintProvider, ProviderActual>();
  // Read only by getBuildingDetailSelectionSnapshots; each manager owns its runtime.
  const detailRuntimes = new Map<PaintProvider, ReturnType<typeof createBuildingDetailRuntime>>();
  const renderers = new Map<PaintProvider, Engine>();
  const pickRevisions=new Map<PaintProvider,{generation:number;viewRevision:number}>();
  let selectedSource:{provider:PaintProvider;identity:{objectId:string;partId:string};pin:{contentKey:string;release():void}}|undefined;
  let selectionSuspended=false;
  let pickGeneration=0,pickViewRevision=0;
  let hidden = document.hidden, viewportVisible = true, reduced = false, opacityContext: 'normal' | 'route-selection' = 'normal';
  let destroyed = false, wanted: '2d' | '3d' = '2d', request = new AbortController();
  let initializing: Promise<void> | undefined, initializationSignal:AbortSignal|undefined, lastError: string | undefined, lastFallback: ThreeDFallback | undefined;
  let transition=0,preparing=0;
  let recoveryFallback:{transition:number;fallback:ThreeDFallback}|undefined;
  const states=new Map<PaintProvider,{mode:'2d'|'3d';status:'ready'|'loading'|'partial'|'outside'|'overview'|'error'}>();
  const abort = () => new DOMException('Aborted', 'AbortError');
  function syncManagerVisibility(manager:ProviderActual){
    if(manager.setViewportVisible){manager.setPageHidden(hidden);manager.setViewportVisible(viewportVisible);}
    else manager.setPageHidden(hidden||!viewportVisible);
  }
  function modelViewKey(){
    const map=options.map,center=map.getCenter(),padding=map.getPadding(),canvas=map.getCanvas();
    return JSON.stringify([center.lng,center.lat,map.getZoom(),map.getBearing(),map.getPitch(),map.getRoll(),map.getVerticalFieldOfView(),map.getCenterElevation(),padding.top,padding.right,padding.bottom,padding.left,map.getProjection()?.type??'mercator',canvas.clientWidth,canvas.clientHeight,canvas.width,canvas.height]);
  }
  const projectionActive=()=>!destroyed&&!projectionSuspended&&!hidden&&viewportVisible&&wanted==='3d';
  const getModelViewProjection=()=>projectionActive()?modelViewProjection.read(modelViewKey()):undefined;
  async function awaitCurrentModelView(signal:AbortSignal){
    signal.throwIfAborted();
    // Warm cache promises can all settle before MapLibre renders a moved camera.
    // Reuse the visible-preparation gate and wait for one frame, so admission
    // sees that camera's public projection instead of always taking unknown.
    if(!projectionActive()||getModelViewProjection())return;
    const map=options.map;
    await new Promise<void>((resolve,reject)=>{
      const finish=(error?:unknown)=>{map.off('render',rendered);signal.removeEventListener('abort',canceled);error?reject(error):resolve();};
      const rendered=()=>finish(),canceled=()=>finish(new DOMException('Aborted','AbortError'));
      map.on('render',rendered);signal.addEventListener('abort',canceled,{once:true});
      if(signal.aborted)canceled();else map.triggerRepaint();
    });
  }
  function bindModelViewProjection(layer:CustomLayerInterface){
    const original=layer.prerender;
    // Capture before the renderer's enabled/empty guards, including its first
    // CPU preparation. All providers share this public custom-layer matrix.
    layer.prerender=function(gl,input){
      if(projectionActive()){
        const canvas=options.map.getCanvas(),data=input.defaultProjectionData;
        modelViewProjection.publish(data?.mainMatrix,{cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,drawingBufferWidth:gl.drawingBufferWidth,drawingBufferHeight:gl.drawingBufferHeight},modelViewKey(),data?.projectionTransition===0);
      }else modelViewProjection.invalidate();
      original?.call(this,gl,input);
    };
  }
  function bindResourceContext(layer:CustomLayerInterface,provider?:string){
    if(resourceLayers.has(layer))return;
    resourceLayers.add(layer);
    // Observe the actual provider layers, including preparation before drawing.
    // Outside the explicit local qaPerf flag these return the original callbacks.
    if(layer.render)layer.render=withQaCustomLayerRenderTiming(0,layer.render,provider);
    if(layer.prerender)layer.prerender=withQaCustomLayerRenderTiming(2,layer.prerender,provider);
    const original=layer.onAdd;
    layer.onAdd=function(map,gl){
      const context=gl as WebGL2RenderingContext;
      bindChunkResourceContext(context,resourceStore);
      // destroy releases the retained executables of exactly these contexts.
      boundContexts.add(context);
      original?.call(this,map,gl);
    };
  }
  const clearBytes=()=>transport.clear();
  function aggregateState(){
    const values=[...states.values()],mode=managers.get('city')?.mode??'2d';
    const status=values.some(s=>s.status==='error')?'error':values.some(s=>s.status==='loading')?'loading':values.some(s=>s.status==='partial')?'partial':values.length&&values.every(s=>s.status==='outside')?'outside':values.length&&values.every(s=>s.status==='overview')?'overview':'ready';
    return {mode,status} as {mode:'2d'|'3d';status:'ready'|'loading'|'partial'|'outside'|'overview'|'error'};
  }

  const nativeSources=createSharedNativeSourcePool({read:fetchBytes,acquireBytes,resourceStore});
  const detailConfigured=buildingDetailCatalog?.city===options.city&&(buildingDetailCatalog.schemaVersion===2?buildingDetailCatalog.entryCount>0:buildingDetailCatalog.entries.length>0);
  const buildingFocus=createBuildingFocusRegistry({city:options.city,registry:buildingFocusRegistry,resourceStore,acquireBytes,discardBytes:path=>transport.discardIdle(path)});
  const resolveDetailIndex=createBuildingDetailIndexResolver({city:options.city,catalog:buildingDetailCatalog,readBytes:fetchBytes,acquireBytes,resourceStore});
  function recordDetailReflectionState(state:{enabled:boolean;planeWorldZ:number}|undefined){
    const enabled=state?.enabled,plane=state&&Number.isFinite(state.planeWorldZ)?state.planeWorldZ:undefined;
    if(enabled===detailReflectionEnabled&&plane===detailReflectionPlane)return;
    const previouslyDisabled=detailReflectionEnabled===false;
    detailReflectionEnabled=enabled;detailReflectionPlane=plane;detailReflection=undefined;
    if(!previouslyDisabled||enabled!==false)invalidateDetailDemands('reflection-state');
  }
  function recordDetailReflection(projection:PlanarReflectionProjection|undefined){
    const main=getModelViewProjection();
    if(!projection||!main||projection.sourceMainMatrix.length!==16){detailReflection=undefined;return;}
    for(let i=0;i<16;i++)if(projection.sourceMainMatrix[i]!==main.mainMatrix[i]){detailReflection=undefined;return;}
    if(Number.isFinite(projection.planeWorldZ)&&detailReflectionPlane!==projection.planeWorldZ){
      detailReflectionPlane=projection.planeWorldZ;
      if(detailReflectionEnabled!==false)invalidateDetailDemands('reflection-plane');
    }
    if(detailReflection?.cameraKey===main.cameraKey&&detailReflection.viewport.drawingBufferWidth===projection.width&&detailReflection.viewport.drawingBufferHeight===projection.height){
      let same=true;for(let i=0;i<16;i++)if(detailReflection.mainMatrix[i]!==projection.mainMatrix[i]){same=false;break;}if(same)return;
    }
    detailReflection={cameraKey:main.cameraKey,mainMatrix:new Float64Array(projection.mainMatrix),mercator:main.mercator,
      viewport:{...main.viewport,drawingBufferWidth:projection.width,drawingBufferHeight:projection.height}};
  }
  function prospectiveDetailReflection(main:ModelViewProjectionSnapshot|undefined){
    if(!main||detailReflectionPlane===undefined||!detailSceneEnvironment)return;
    const budget=planarReflectionBudget(detailSceneEnvironment.quality,detailMobile);
    // An actual device clamp can only reduce resolution. Using the requested
    // size gives a conservative pixel-error bound without waiting for capture.
    const [width,height]=planarReflectionSize(main.viewport.drawingBufferWidth,main.viewport.drawingBufferHeight,budget.pixels,budget.maxDimension);
    return{cameraKey:main.cameraKey,mainMatrix:mirrorMercatorProjection(main.mainMatrix,detailReflectionPlane),mercator:main.mercator,
      viewport:{...main.viewport,drawingBufferWidth:width,drawingBufferHeight:height}};
  }
  function requiredSolarCoverage(){
    let required:SolarWorldBounds|undefined;
    for(const manager of managers.values()){
      const bounds=manager.getRequiredSolarCoverageBounds?.();
      if(bounds)required=mergeSceneSolarCoverageBounds(required,bounds);
    }
    return required;
  }
  // Detail demand reaches the captures as pending. It is a held ledger wait
  // (budgetWaiting: the shadow layer and the reflection request no frame of
  // their own) only when the compositor has no refresh of its own pending (that
  // one is consumed by the next 'render') and every manager with demand reports
  // detailDemandHeld===true: all of its pending demand is parked on a page-ledger
  // onAvailable wake, and it repaints the map when its demand clears. Otherwise,
  // including a manager without the field, it is a plain pending whose next
  // frame retries. Every manager (all 7 providers) exposes detailDemandHeld;
  // City forwards it through its lazy adapter. When a held state ends
  // (including a pool source woken from its park), the manager repaints the
  // map once.
  function detailCapturePending(){return detailConfigured&&(pendingDetailRefresh.size>0||[...managers.values()].some(manager=>manager.detailDemandPending));}
  function detailCaptureHeld(){
    if(!detailConfigured||pendingDetailRefresh.size)return false;
    let held=false;
    for(const manager of managers.values())if(manager.detailDemandPending){if(manager.detailDemandHeld!==true)return false;held=true;}
    return held;
  }
  const detailPendingPreparation=():SolarShadowPreparationResult=>solarShadowPreparation(0,1,0,detailCaptureHeld()?1:0);
  function solarCoverage(){
    const actual=reflectionGroup.getSolarShadowCoverage?.(),required=requiredSolarCoverage();
    if(!actual)return actual;
    if(solarCapturePending())return{...actual,complete:false,reason:'detail-demand-or-solar-epoch-pending'};
    const plan=solarDetail.capturePlan();
    if(!required&&!plan)return actual;
    const canonical=required?mergeSceneSolarCoverageBounds(actual.bounds,required):actual.bounds;
    const bounds=canonical&&plan?mergeSceneSolarCoverageBounds(canonical,plan.bounds):canonical;
    return bounds?{...actual,bounds}:{...actual,complete:false,reason:'invalid-required-solar-coverage'};
  }
  function compositorSceneSunlight():Engine['sceneSunlight']|undefined{
    // An empty renderer still exposes its initialization origin (0,0). It
    // cannot supply the scene's location merely because it is the city owner.
    const preferred=renderers.get('city');
    if(preferred&&(preferred.residentVertexCount??0)>0){sceneSunlightFallback=undefined;return preferred.sceneSunlight;}
    for(const provider of providerOrder){
      const engine=renderers.get(provider);
      if(engine&&(engine.residentVertexCount??0)>0){sceneSunlightFallback=undefined;return engine.sceneSunlight;}
    }
    const initial=preferred?.sceneSunlight??[...renderers.values()].find(engine=>engine.sceneSunlight)?.sceneSunlight;
    if(!initial)return;
    const center=options.map.getCenter(),instant=detailSceneEnvironment?.instantISO??initial.instantISO;
    if(!Number.isFinite(center.lng)||!Number.isFinite(center.lat)||Math.abs(center.lng)>180||Math.abs(center.lat)>85){sceneSunlightFallback=undefined;return;}
    const key=JSON.stringify([center.lng,center.lat,instant,initial.quality,initial.shadowMode]);
    if(sceneSunlightFallback?.key===key)return sceneSunlightFallback.light;
    const light=sceneSolarLight(center.lng,center.lat,instant);
    sceneSunlightFallback={key,light:{...initial,...light,activeSunDirection:light.direction}};
    return sceneSunlightFallback.light;
  }
  function detailDemands(index:BuildingDetailDemandIndex,provider:PaintProvider):readonly BuildingDetailPassDemand[]{
    detailDemandReaders.add(provider);
    const main=getModelViewProjection(),selected=renderer.selected;
    const common={maxErrorCssPx:.5,maxErrorDrawingBufferPx:1};
    const demands:BuildingDetailPassDemand[]=[{...common,pass:'main',project:origin=>modelProjectionAtOrigin(main,origin),
      selected:!!selected&&index.components.some(c=>c.objectId===selected.objectId&&c.partId===selected.partId)}];
    const project:BuildingDetailPassDemand['project']=origin=>modelProjectionAtOrigin(main,origin);
    const cameraKey=main?.cameraKey??modelViewKey();
    if([...pickingDemands].some(pick=>pick.cameraKey===cameraKey&&buildingDetailMayContainPick(index,pick.point,project)))
      demands.push({...common,pass:'picking',project});
    if(!detailSceneEnvironment||detailSceneEnvironment.sunlight&&detailSceneEnvironment.shadows){
      const light=renderer.sceneSunlight;
      const current=detailSceneEnvironment&&light&&Date.parse(light.instantISO)===Date.parse(detailSceneEnvironment.instantISO);
      if(current&&detailSceneEnvironment&&light.altitudeDegrees>.5){
        // Only a completed scene capture establishes the epoch; new leaves
        // expand its envelope before the next full-cohort capture can publish.
        syncSolarDetailContext();
        const leafBounds=buildingDetailSolarCoverageBounds(index.components,0);
        const sceneCoverageBounds=leafBounds?solarDetail.projectionFor(leafBounds)?.bounds:undefined;
        const prospective=sceneCoverageBounds?createProspectiveSceneSolarProjection({components:index.components,direction:light.direction,
          quality:detailSceneEnvironment.quality,mobile:detailMobile,maximumGeometryErrorM:0,sceneCoverageBounds}):undefined;
        demands.push({...common,pass:'shadow',forceCanonical:!prospective,project:prospective?.project??(()=>undefined)});
      }else if(!current)demands.push({...common,pass:'shadow',forceCanonical:true,project:()=>undefined});
    }
    const reflected=prospectiveDetailReflection(main)??(main&&detailReflection?.cameraKey===main.cameraKey?detailReflection:undefined);
    if(detailReflectionEnabled!==false)demands.push({...common,pass:'reflection',project:origin=>modelProjectionAtOrigin(reflected,origin)});
    return demands;
  }
  async function prepareDetailPick(point:{x:number;y:number},signal:AbortSignal){
    signal.throwIfAborted();if(destroyed)throw abort();
    await awaitCurrentModelView(signal);
    signal.throwIfAborted();if(destroyed)throw abort();
    const own=new AbortController(),map=options.map,cameraKey=modelViewKey();
    let released=false;
    const release=()=>{
      if(released)return;released=true;pickingDemands.delete(token);
      signal.removeEventListener('abort',release);map.off('movestart',release);map.off('render',cameraChanged);
      own.abort(abort());
    };
    const cameraChanged=()=>{if(modelViewKey()!==cameraKey)release();};
    const token={point:{x:point.x,y:point.y},cameraKey,release};pickingDemands.add(token);
    signal.addEventListener('abort',release,{once:true});map.on('movestart',release);map.on('render',cameraChanged);
    try{
      if(detailConfigured)await Promise.all([...managers.values()].map(manager=>{
        if(!manager.prepareCanonicalPicking)throw Error('Canonical detail picking is unavailable');
        return manager.prepareCanonicalPicking(token.point,own.signal);
      }));
      cameraChanged();own.signal.throwIfAborted();signal.throwIfAborted();if(destroyed)throw abort();return{release};
    }catch(error){release();throw error;}
  }
  function getPickRevision(){
    let generationChanged=false,viewChanged=false;
    for(const provider of providerOrder){
      const engine=renderers.get(provider),previous=pickRevisions.get(provider);
      if(!engine){if(previous){pickRevisions.delete(provider);generationChanged=viewChanged=true;}continue;}
      const current=engine.getRevision();
      if(!previous||previous.generation!==current.generation)generationChanged=true;
      if(!previous||previous.viewRevision!==current.viewRevision)viewChanged=true;
      if(!previous||previous.generation!==current.generation||previous.viewRevision!==current.viewRevision)
        pickRevisions.set(provider,{generation:current.generation,viewRevision:current.viewRevision});
    }
    if(generationChanged)pickGeneration++;if(viewChanged)pickViewRevision++;
    return{generation:pickGeneration,viewRevision:pickViewRevision};
  }
  function isPickGenerationCurrent(hit:Parameters<Engine['getSourceComponent']>[0]&{generation:number}){
    for(const provider of providerOrder){
      const engine=renderers.get(provider);if(!engine)continue;
      const component=engine.borrowSourceComponent(hit)??engine.borrowSurfaceComponent(hit)??engine.borrowAddedDisplayComponent?.(hit);
      if(component&&paintOwner(component)===provider)return engine.getRevision().generation===hit.generation;
    }
    return false;
  }
  function releaseSelectedSource(){const previous=selectedSource;selectedSource=undefined;previous?.pin.release();}
  function selectionOwner(identity:{objectId:string;partId:string}){
    for(const provider of providerOrder){
      const engine=renderers.get(provider);if(!engine)continue;
      const component=engine.borrowSourceComponent(identity)??engine.borrowSurfaceComponent(identity)??engine.borrowAddedDisplayComponent?.(identity);
      if(component&&paintOwner(component)===provider)return{provider,engine};
    }
  }
  function syncSelectedSource(provider:PaintProvider){
    if(selectionSuspended||wanted!=='3d'||destroyed||selectedSource&&selectedSource.provider!==provider)return;
    const identity=renderers.get(provider)?.selected;if(!identity)return;
    const pin=managers.get(provider)?.retainSelectedSource?.(identity);if(!pin)return;
    const previous=selectedSource;
    if(previous&&previous.identity.objectId===identity.objectId&&previous.identity.partId===identity.partId&&previous.pin.contentKey===pin.contentKey){pin.release();return;}
    selectedSource={provider,identity:{objectId:identity.objectId,partId:identity.partId},pin};
    previous?.pin.release();
  }
  function setSelection(identity:{objectId:string;partId:string}){
    const owner=selectionOwner(identity);if(!owner)throw Error('Selection component not loaded');
    const pin=managers.get(owner.provider)?.retainSelectedSource?.(identity);
    try{owner.engine.setSelection(identity);}catch(error){pin?.release();throw error;}
    for(const [provider,engine]of renderers)if(provider!==owner.provider)engine.clearSelection();
    releaseSelectedSource();selectionSuspended=false;
    if(pin)selectedSource={provider:owner.provider,identity:{objectId:identity.objectId,partId:identity.partId},pin};
  }
  const frozenDataResources=createFrozenDataResourceOwner({city:options.city,profileSHA256,read:fetchBytes,acquireBytes,resourceStore});
  const lifetime = new AbortController();
  let frozenInitialization:ReturnType<typeof beginFrozenPaintTableInitialization>|undefined;
  // Initializer table inputs are admitted on this page ledger before each read
  // and hold their transport lease until the table's first initializer has
  // constructed from it, instead of a compat read released before return.
  const startFrozenInitialization=(signal:AbortSignal)=>frozenInitialization=beginFrozenPaintTableInitialization({acquireBytes,budget:resourceStore.budget},signal,providerOrder,error=>{if(!destroyed&&!signal.aborted&&!(error instanceof DOMException&&error.name==='AbortError')){lastError=String(error);options.onState?.({mode:managers.get('city')?.mode??'2d',status:'error'});}});
  // The managers' session-completion handle: awaited in visible() before the
  // page's single visible-preparation slot, holding nothing. It follows this
  // compositor's newest session; a session that is not active (closed,
  // replaced or never begun) resolves, as nothing was awaited before. A session
  // failure rejects; the loop is bounded by session replacements, no timer.
  async function paintInitializationSettled(signal:AbortSignal):Promise<void>{for(;;){signal.throwIfAborted();const session=frozenInitialization;if(!session?.active)return;try{return await session.settled(signal);}catch(error){if(signal.aborted||!(error instanceof DOMException&&error.name==='AbortError'))throw error;}}}

  let recoveryFrozenStamp:string|undefined;
  function quietFrozenStamp(){
    const state=frozenPaintTableStats();
    if(!frozenInitialization?.active||state.active||state.queued||state.pendingInitializers||state.activePhysicalBytes||state.declaredInFlightRawBytes)return;
    return JSON.stringify([state.completedInitializers,state.parses]);
  }
  const recoveryTransportIdle=()=>{const resources=frozenDataResources.stats;return resources.active===0&&resources.queued===0&&resources.waiters===0&&preparationGate.idle&&wanted==='3d'&&preparing===0&&managers.size===providerOrder.length&&transport.idle&&!request.signal.aborted;};

  const reflectionGroup=planarReflectionGroup(()=>providerOrder.map(provider=>renderers.get(provider)),{labels:providerOrder,requireAll:true});
  const solarDetail=createSceneSolarDetailCoordinator({providers:providerOrder,
    readProvider(id){
      const provider=id as PaintProvider,manager=managers.get(provider),engine=renderers.get(provider),state=states.get(provider);
      const draw=engine?.getDrawReadiness();
      return {ready:projectionActive()&&!!manager?.getDetailSettlement&&manager.mode==='3d'&&manager.wantedMode==='3d'&&draw?.ready===true&&!draw.failure&&state?.status!=='error'&&state?.status!=='loading',
        settlement:manager?.getDetailSettlement?.()};
    },
    requestRefresh(id){
      const provider=id as PaintProvider;
      // A solar epoch always requires the real manager's next settlement.
      // Its fresh selection also consumes pending reflection/lighting changes.
      pendingDetailRefresh.delete(provider);
      traceDetailRefresh('solar-coordinator',id);
      managers.get(provider)?.requestDetailRefresh?.();
    },
    readSourceRevision:()=>reflectionGroup.getSolarShadowRevision!(),
    readUnforcedCoverage:()=>reflectionGroup.getSolarShadowCoverage!(),
    requestRepaint:()=>options.map.triggerRepaint(),
  });
  function syncSolarDetailContext(){
    if(!detailConfigured){solarDetail.setContext(undefined);return;}
    const light=compositorSceneSunlight(),environment=detailSceneEnvironment;
    const active=projectionActive()&&environment?.sunlight&&environment.shadows&&light&&
      Date.parse(light.instantISO)===Date.parse(environment.instantISO)&&light.altitudeDegrees>.5;
    const context=active?JSON.stringify([solarDetailContextGeneration,environment.instantISO,environment.quality,light.direction]):undefined;
    solarDetail.setContext(context);return context;
  }
  function solarCapturePending(){syncSolarDetailContext();return detailCapturePending()||solarDetail.capturePending;}
  function solarSourceRevision(){
    const context=syncSolarDetailContext();
    return reflectionGroup.getSolarShadowRevision!()+'|canonical-envelope:'+(requiredSolarCoverage()?.join(',')??'none')+
      '|detail-pending:'+Number(solarCapturePending())+'|solar-epoch:'+(solarDetail.capturePlan()?.revision??(context?'pending:'+context:'inactive'));
  }
  function recordSolarPublication(publication:SolarShadowPublication|undefined){
    if(!publication){solarDetail.publication(undefined);return;}
    const context=syncSolarDetailContext(),plan=solarDetail.capturePlan(),light=compositorSceneSunlight();
    if(!context||!plan||publication.sourceRevision!==solarSourceRevision()||publication.targetSize>512||
       !light||publication.direction.some((value,index)=>value!==light.direction[index])){solarDetail.publication(undefined);return;}
    solarDetail.publication({kind:'published-capture',contextKey:context,revision:plan.revision,bounds:publication.bounds,complete:true});
  }
  function prepareSolarShadow(budget:SolarShadowPreparationBudget=createSolarShadowPreparationBudget()){
    if(detailCapturePending())return detailPendingPreparation();
    // Existing depth preparation may be needed for complete raw coverage.
    // Preserve its compile budget; only capture waits on the epoch proof.
    const result=reflectionGroup.prepareSolarShadow!(budget);
    return result.status==='ready'&&solarCapturePending()?detailPendingPreparation():result;
  }
  function beginContextRecovery(){
    recoveryFallback=undefined;
    if(destroyed||wanted!=='2d'||preparing!==0||initializing||!lastFallback||[...managers.values()].some(manager=>manager.mode!=='2d'||manager.wantedMode!=='2d'))return false;
    recoveryFallback={transition,fallback:lastFallback};return true;
  }
  function mainDrawReadiness(details=false):RecoveryReadySnapshot{
    const mode=managers.get('city')?.mode??'2d';
    if(destroyed)return{ready:false,preparing:false,failure:'3D compositor destroyed',mode,wantedMode:wanted};
    // Inactive 2D has no required 3D main frame. Empty active scenes are decided
    // by each actual renderer's finite-projection/complete-empty witness.
    if(wanted!=='3d'){
      const priorFallback=recoveryFallback!==undefined&&recoveryFallback.transition===transition&&recoveryFallback.fallback===lastFallback;
      const failure=!priorFallback&&(lastFallback||lastError)?lastError??'3D preparation fell back to 2D':undefined;
      return{ready:!failure,preparing:false,...(failure?{failure}:{}),mode,wantedMode:wanted,...(details?{providers:[]}: {})};
    }
    let ready=true,preparing=false,failure:string|undefined;
    const providers:RecoveryReadyProvider[]|undefined=details?[]:undefined;
    for(const provider of providerOrder){
      const manager=managers.get(provider),engine=renderers.get(provider);
      const covered=!!manager&&manager.wantedMode==='3d'&&manager.mode==='3d'&&!!engine;
      const draw:ResidentDrawReadiness|undefined=engine?.getDrawReadiness();
      const state=states.get(provider),pending=manager?.detailDemandPending===true||state?.status==='loading';
      const providerFailure=draw?.failure??(state?.status==='error'?'3D manager preparation failed':undefined);
      if(!covered||draw?.ready!==true||pending||providerFailure)ready=false;
      if(!covered||draw?.preparing||pending)preparing=true;
      if(!failure&&providerFailure)failure=`${provider}: ${providerFailure}`.slice(0,512);
      if(providers){
        const revision=engine?.getRevision();
        providers.push({provider,managerPresent:!!manager,rendererPresent:!!engine,mode:manager?.mode,wantedMode:manager?.wantedMode,ready:covered&&draw?.ready===true&&!pending&&!providerFailure,preparing:!providerFailure&&(!covered||draw?.preparing===true||pending),...(providerFailure?{failure:providerFailure.slice(0,512)}:{}),generation:revision?.generation??null,viewRevision:revision?.viewRevision??null});
      }
    }
    return{ready:ready&&!failure,preparing:!failure&&preparing,...(failure?{failure}:{}),mode,wantedMode:wanted,...(providers?{providers}:{})};
  }
  const renderer = new Proxy({} as PublicRenderer, {
    get(_target, property) {
      if(property==='sceneSunlight')return compositorSceneSunlight();
      if(property==='getDrawReadiness')return()=>mainDrawReadiness();
      if(property==='getDrawReadinessSnapshot')return()=>mainDrawReadiness(true);
      if(property==='residentVertexCount'){let count=0;for(const provider of providerOrder)count+=renderers.get(provider)?.residentVertexCount??0;return count;}
      if(property==='growthSnapshot'||property==='getGrowthSamplingState'){
        let renderer=renderers.get('city');
        if(!renderer)for(const provider of providerOrder){renderer=renderers.get(provider);if(renderer)break;}
        return renderer?renderer[property].bind(renderer):undefined;
      }
      const engines = providerOrder.map(p => renderers.get(p)).filter((r): r is Engine => !!r);
      if(property==='getProgramPreparationStats')return()=>engines.flatMap(engine=>engine.getProgramPreparationStats());
      if(property==='getProgressiveRenderStatus')return()=>engines.flatMap(engine=>engine.getProgressiveRenderStatus());
      if(property==='prepareSolarShadow')return prepareSolarShadow;
      if(property==='setSolarShadowPublication')return recordSolarPublication;
      if(property==='preparePlanarReflection')return(pass:PlanarReflectionPass,budget:SolarShadowPreparationBudget=createSolarShadowPreparationBudget())=>detailCapturePending()?{...detailPendingPreparation(),plannedTriangles:0,plannedDraws:0}:reflectionGroup.preparePlanarReflection!(pass,budget);
      if(property==='setCaptureDemand')return reflectionGroup.setCaptureDemand;
      if(property==='setPlanarReflectionProjection')return recordDetailReflection;
      if(property==='setPlanarReflectionState')return recordDetailReflectionState;
      if(property==='preparePick')return prepareDetailPick;
      if(property==='getPickRevision')return getPickRevision;
      if(property==='isPickGenerationCurrent')return isPickGenerationCurrent;
      if(property==='setSelection')return setSelection;
      if(property==='clearSelection')return()=>{for(const engine of engines)engine.clearSelection();releaseSelectedSource();selectionSuspended=false;};
      if(property==='suspendSelection')return()=>{selectionSuspended=true;for(const engine of engines)engine.suspendSelection();releaseSelectedSource();};
      if(property==='resumeSelection')return()=>{selectionSuspended=false;for(const engine of engines)engine.resumeSelection();for(const provider of providerOrder)syncSelectedSource(provider);};
      if(property==='setSceneEnvironment')return(value:SceneEnvironmentState)=>{const next=checkedSceneEnvironment(value),previous=detailSceneEnvironment;detailSceneEnvironment=next;for(const engine of engines)engine.setSceneEnvironment(next);if(!previous||previous.quality!==next.quality||previous.instantISO!==next.instantISO||previous.sunlight!==next.sunlight||previous.shadows!==next.shadows)invalidateDetailDemands('scene-environment');};
      if(property==='getSolarShadowCoverage')return solarCoverage;
      if(property==='getSolarShadowRevision')return solarSourceRevision;
      if(property==='getPlanarReflectionRevision')return reflectionGroup.getPlanarReflectionRevision;
      if(property==='renderPlanarReflection')return(pass:PlanarReflectionPass)=>detailCapturePending()?{triangles:0,draws:0,complete:false,pending:true,reason:'detail-demand-pending'}:reflectionGroup.renderPlanarReflection(pass);
      if (property === 'layer') return renderers.get('city')?.layer ?? engines[0]?.layer;
      if (property === 'stats') {
        const snapshots = new Map([...renderers].map(([provider,r])=>[provider,r.stats] as const));
        const stats = providerOrder.flatMap(provider=>{const value=snapshots.get(provider);return value?[value]:[];});
        const first = snapshots.get('city') ?? stats[0];
        return {...first, components: stats.reduce((n, s) => n + (s.components ?? 0), 0), vertices: stats.reduce((n, s) => n + (s.vertices ?? 0), 0), paintProviders: Object.fromEntries(snapshots)};
      }
      if (property === 'nativeGroupDisplay') return renderers.get('city')?.nativeGroupDisplay;
      if (property === 'selected') return engines.map(r=>r.selected).find(Boolean);
      if (property === 'isPickReady') return () => (wanted !== '3d' || providerOrder.every(p => managers.get(p)?.wantedMode === '3d' && managers.get(p)?.mode === '3d' && renderers.has(p))) && engines.length > 0 && engines.every(r => r.isPickReady());
      if (property === 'diagnosticScreenSamples') return (...args: unknown[]) => engines.flatMap(r => (r.diagnosticScreenSamples as Function)(...args));
      if (property === 'readPaintGPUDiagnostic') return (identities:unknown[]) => Object.fromEntries([...renderers].map(([provider,r])=>[provider,typeof (r as any).readPaintGPUDiagnostic==='function'?Array.from({length:Math.ceil(identities.length/8)},(_,i)=>(r as any).readPaintGPUDiagnostic(identities.slice(i*8,i*8+8))):undefined]));
      if (property === 'getRevision') return () => ({generation: Math.max(0,...engines.map(r=>r.getRevision().generation)),viewRevision: Math.max(0,...engines.map(r=>r.getRevision().viewRevision))});
      if (property === 'pick') return (...args: unknown[]) => engines.map(r => (r.pick as Function)(...args)).filter(Boolean).sort((a,b)=>(a.distance ?? Infinity)-(b.distance ?? Infinity))[0];
      if (typeof property === 'string' && /^(set|clear|suspend|resume|reset)/.test(property)) return (...args: unknown[]) => { for (const r of engines) {const fn=(r as any)[property];if(typeof fn==='function')fn.apply(r,args);} };
      if (typeof property === 'string' && /^(getComponent|getSourceComponent|getSurfaceComponent|getAddedDisplayComponent|borrowSourceComponent|borrowSurfaceComponent|borrowAddedDisplayComponent|getSolarShadowAdmission|isDerived|readPaintGPU)/.test(property)) return (...args: unknown[]) => {
        const identity=args[0] as Parameters<Engine['getSourceComponent']>[0];
        for (const p of providerOrder) {
          const r=renderers.get(p);if(!r)continue;
          const component=r.borrowSourceComponent(identity)??r.borrowSurfaceComponent(identity)??r.borrowAddedDisplayComponent?.(identity);
          if(component&&paintOwner(component)===p){const fn=(r as any)[property];return typeof fn==='function'?fn.apply(r,args):undefined;}
        }
        return undefined;
      };
      const value = ((renderers.get('city') as any)?.[property]!==undefined ? renderers.get('city') : engines.find(r=>(r as any)[property]!==undefined)) as any;
      return typeof value?.[property] === 'function' ? value[property].bind(value) : value?.[property];
    }
  });

  function ensure(signal:AbortSignal=lifetime.signal) {
    signal.throwIfAborted();if(destroyed)return Promise.reject(abort());if(managers.size)return Promise.resolve();
    if(initializing&&!initializationSignal?.aborted)return initializing;
    const next=(async () => {
      const tableSession=frozenInitialization?.active?frozenInitialization:startFrozenInitialization(signal);
      let modules;try {signal.throwIfAborted();
      const imports = await tableSession.wait(Promise.allSettled([
        import('../painted/root500/safety/three-dimensional-map'),
        import('../painted/delegated500/safety/three-dimensional-map'),
        import('../painted/tier300/safety/three-dimensional-map'),
        import('../painted/church/safety/three-dimensional-map'),
        import('../painted/city/safety/three-dimensional-map'),
        ...(['frankfurt','stuttgart','essen'].includes(options.city)?[import('../painted/infill/safety/three-dimensional-map')]:[]),
        ...(options.city==='bremen'?[import('../painted/bremen/safety/three-dimensional-map')]:[]),
        // Resolve the corresponding renderer module initializers in the same
        // lease. Their later public dynamic imports reuse these exact modules.
        import('../painted/root500/safety/building-mesh-renderer'),
        import('../painted/delegated500/safety/building-mesh-renderer'),
        import('../painted/tier300/safety/building-mesh-renderer'),
        import('../painted/church/safety/building-mesh-renderer'),
        import('../painted/city/safety/building-mesh-renderer'),
        ...(['frankfurt','stuttgart','essen'].includes(options.city)?[import('../painted/infill/safety/building-mesh-renderer')]:[]),
        ...(options.city==='bremen'?[import('../painted/bremen/safety/building-mesh-renderer')]:[]),
      ]));
      const failed=imports.find((r):r is PromiseRejectedResult=>r.status==='rejected');if(failed)throw failed.reason;
      modules=imports.slice(0,providerOrder.length).map(r=>(r as PromiseFulfilledResult<any>).value);
      } catch(error) {tableSession.close();throw error;}
      if (destroyed||signal.aborted) throw abort();
      modules.forEach((module, index) => {
        const provider = providerOrder[index];
        const assets=(assetRegistry as Record<string,Record<string,string>>)[provider]??{};
        const nativeClient=nativeSources.client(options.city,path=>assets[path]??path);
        const detailRuntime=detailConfigured?createBuildingDetailRuntime({city:options.city,resolveDetailIndex,readCanonical:nativeClient.read,variantLeavesOnly:true,
          readBytes:fetchBytes,acquireBytes,resourceStore,vertexCap:options.mobile?100000:200000,geometryPositionCap:options.mobile?100000:200000,
          getDemands:index=>detailDemands(index,provider)}):undefined;
        // Byte leases resolve a path through this provider's asset registry
        // exactly like fetchBytes; facade material PNGs are registry-mapped.
        // A caller-admitted read's {admitted, envelope, keep} passes through
        // unchanged (undefined stays the three-argument path).
        const manager = module.installThreeDimensionalMap({...options, resourceStore, acquireBytes:(path:string,signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions)=>acquireBytes(assets[path]??path,signal,max,admission), getModelViewProjection, detailRuntime, buildingFocus, runVisiblePreparation:(signal:AbortSignal,work:()=>Promise<any>)=>preparationGate.run(provider,signal,async()=>{await awaitCurrentModelView(signal);signal.throwIfAborted();return work();}), nativeSources:nativeClient, frozenData:frozenDataResources.client(provider), fetchBytes:(path:string,signal:AbortSignal,max:number)=>fetchBytes(assets[path]??path,signal,max), manageCamera: provider === 'city',
          awaitPaintInitialization: <T>(operation:Promise<T>)=>{const session=frozenInitialization;if(!session?.active)throw abort();return session.wait(operation);},
          paintInitializationSettled,
          onState: (state: any) => {states.set(provider,state);if(state.mode==='3d'&&(state.status==='ready'||state.status==='partial'))syncSelectedSource(provider);if(!preparing)options.onState?.(aggregateState());},
          onNativeGroupDisplay: provider === 'city' ? options.onNativeGroupDisplay : undefined,
          onRenderer: (r: any) => {if(r.layer){if(provider==='city')bindModelViewProjection(r.layer);bindResourceContext(r.layer,provider);}pickRevisions.delete(provider);pickGeneration++;pickViewRevision++;renderers.set(provider,r);r.setPageHidden(hidden||!viewportVisible);r.setReducedMotion(reduced);r.setOpacityContext(opacityContext);options.onRenderer?.(renderer);},
        } as any) as ProviderActual;
        managers.set(provider,manager);
        if(detailRuntime)detailRuntimes.set(provider,detailRuntime);
        syncManagerVisibility(manager);
      });
    })();
    initializing=next;initializationSignal=signal;
    const settled=()=>{if(initializing===next){initializing=undefined;initializationSignal=undefined;}};
    // Keep the original promise/error for callers; an older attempt settling
    // after cancellation must not clear a newer initialization's pending state.
    void next.then(settled,settled);
    return next;
  }

  async function requestMode(next: '2d' | '3d', external: AbortSignal) {
    external.throwIfAborted(); if (destroyed) throw abort();
    recoveryFrozenStamp=undefined;recoveryFallback=undefined;wanted=next;if(next==='2d'){solarDetailContextGeneration++;solarDetail.reset();}request.abort();let own=request=new AbortController();
    const ticket=++transition;preparing=ticket;let stage:ThreeDFallback['provider']='initialization';
    const cancel=()=>own.abort();external.addEventListener('abort',cancel,{once:true});
    try {
      if(next==='3d')startFrozenInitialization(own.signal);else {releaseSelectedSource();modelViewProjection.invalidate();frozenInitialization?.close();}
      if (!managers.size && next==='2d') {const state={mode:next,status:'ready' as const};options.onState?.(state);return state;}
      await ensure(own.signal);own.signal.throwIfAborted();
      // Finish the single camera movement before supplemental managers prepare.
      stage='city';const state=await managers.get('city')!.requestMode(next,own.signal);
      own.signal.throwIfAborted();
      // destroy aborts own before it clears managers: a provider that resolved
      // after destroy ends this loop with that abort, never a missing manager.
      // Bremen has the shorter visible-readiness budget. Prepare it immediately
      // after the camera owner rather than spending most of that budget waiting
      // behind the 15s providers. Keep one preparation at a time; installation,
      // drawing, picking and the 2D release order still use providerOrder.
      const preparationOrder=next==='3d'&&managers.has('bremen')
        ?['bremen' as const,...providerOrder.filter(p=>p!=='bremen')]:providerOrder;
      for(const p of preparationOrder)if(p!=='city'){stage=p;own.signal.throwIfAborted();await managers.get(p)!.requestMode(next,own.signal);}
      own.signal.throwIfAborted();lastError=undefined;lastFallback=undefined;if(next==='2d')clearBytes();const result=aggregateState();options.onState?.(result);return result;
    } catch(error) {if(error instanceof ChunkResourceContextLostError){own.abort(error);throw new DOMException('3D preparation interrupted by context loss','AbortError');}if(location.hostname==='127.0.0.1')console.warn('supplement-3d-transition',String(error),error instanceof Error?error.stack:'');if(!own.signal.aborted){lastError=String(error);
      // The newest failed 3D request keeps the retained 2D map as the wanted view, so a
      // later resume() (pageshow, GPU restore) cannot reissue it. Only this ticket may
      // publish the explicit fallback; a newer request or destroy aborts the rollback.
      const fallback:ThreeDFallback|undefined=next==='3d'?{reason:error instanceof Error&&/^3D (?:preparation|draw|camera) readiness timed out$/.test(error.message)?'readiness-timeout':'error',provider:stage}:undefined;if(fallback)wanted='2d';
      // Before the rollback changes them: the providers' readiness timing and waits.
      if(fallback){recordTransitionFailure(stage,error);if(fallback.reason==='readiness-timeout')recordReadinessTimeout(stage,error);}
      // The automatic 2D rollback of a failed or timed-out 3D request passes every
      // provider the reason {retainPrograms:true}, so its renderer may keep the
      // compiled programs for the retry; the rollback of a failed 2D request,
      // like an explicit 2D switch, passes none (DECISIONS 2026-11-02 01:35).
      own.abort();clearBytes();const rollback=own=request=new AbortController();await Promise.allSettled([...managers.values()].map(m=>fallback?m.requestMode('2d',rollback.signal,{retainPrograms:true}):m.requestMode('2d',rollback.signal)));if(ticket===transition&&!destroyed&&!rollback.signal.aborted){lastFallback=fallback;options.onState?.(fallback?{mode:'2d',status:'error',fallback}:{mode:'2d',status:'error'});}}throw error;}
    finally {external.removeEventListener('abort',cancel);if(preparing===ticket)preparing=0;}
  }
  /** Readiness only, for page installers that admit their own reads afterwards
   * (environment, scenery, the water profile): nothing is reserved or read
   * here, and the caller's abort or destroy rejects at once, also when it
   * joined an initialization another request started. */
  function ensureReady(signal:AbortSignal):Promise<void>{
    if(signal.aborted)return Promise.reject(signal.reason??abort());
    if(destroyed)return Promise.reject(abort());
    if(managers.size)return Promise.resolve();
    const ready=ensure(signal);
    return new Promise<void>((resolve,reject)=>{
      let done=false;
      const finish=(error?:unknown)=>{if(done)return;done=true;signal.removeEventListener('abort',cancel);if(error===undefined)resolve();else reject(error);};
      const cancel=()=>finish(signal.reason??abort());
      signal.addEventListener('abort',cancel,{once:true});
      ready.then(()=>finish(destroyed?abort():undefined),error=>finish(error??abort()));
    });
  }
  // Bounded diagnostics: scalar fields only, every list capped.
  const objectOf=(value:unknown)=>value!==null&&typeof value==='object'?value as Record<string,unknown>:undefined;
  const scalar=(value:unknown)=>typeof value==='number'||typeof value==='boolean'||value===null?value:typeof value==='string'?value.slice(0,256):undefined;
  const scalars=(value:unknown,keys:readonly string[])=>{const source=objectOf(value);return source&&Object.freeze(Object.fromEntries(keys.map(key=>[key,scalar(source[key])])));};
  const PRESSURE_FIELDS=['capacity','required','current','recentCapacity','recentRequired','recentCurrent','shortfallBytes','recentShortfallBytes','additionalBytes','constraint','label'];
  const RECENT_FIELDS=['entries','contextEntries','bytes','shareLimitBytes','maxEntries','draining','drainsStarted','retained','hits','evictedPressure','evictedCapacity','released','refused','lost','ownerHits','ownerDefault'];
  const DISPATCH_FIELDS=['visibleStartsTotal','captureStartsTotal','deferredCaptures','deferredCaptureJobs','deadlineCaptureStarts','visibleDeadlineActive'];
  const TURN_FIELDS=['elapsedMs','steps','yieldReason','source','resource','priority','phase','stepMs'];
  const READINESS_FIELDS=['ticket','phase','stage','inspections','reason','expectedGeneration','registered','published','mainReady','recordedAtMs'];
  const TIMING_FIELDS=['startedAtMs','observedAtMs','elapsedWallMs','visibleBudgetMs'];
  const DRAW_FIELDS=['managerPresent','rendererPresent','mode','wantedMode','ready','preparing','failure','generation','viewRevision'];
  const LEDGER_FIELDS=['profile','limitBytes','bytes','retiringBytes','recentBytes','availableBytes','reservations','pressureEvents','availabilityListeners'];
  /** One program-preparation row: its page-ledger waits (held wake, refused
   * recipes, unfit failures, last pressure), retained executables and dispatch. */
  function programBudgetDigest(value:unknown):ProgramBudgetDigest{
    const row=objectOf(value),budget=objectOf(row?.budget),dispatch=objectOf(objectOf(row?.context)?.dispatch);
    return Object.freeze({provider:typeof row?.provider==='string'?row.provider.slice(0,32):undefined,
      budget:budget&&Object.freeze({waitingForAvailability:scalar(budget.waitingForAvailability),budgetWaits:scalar(budget.budgetWaits),refusedRecipes:scalar(budget.refusedRecipes),unfitFailures:scalar(budget.unfitFailures),lastPressure:scalars(budget.lastPressure,PRESSURE_FIELDS)}),
      recent:scalars(row?.recent,RECENT_FIELDS),
      dispatch:dispatch&&Object.freeze({...scalars(dispatch,DISPATCH_FIELDS),longestTurn:scalars(dispatch.longestTurn,TURN_FIELDS)})});
  }
  function recordTransitionFailure(stage:ThreeDFallback['provider'],error:unknown){
    if(!localDiagnostics)return;
    try{
      const failure=objectOf(error),ledger=resourceStore.budget.stats;
      const pressure=(value:unknown)=>{
        const row=objectOf(value);if(!row)return undefined;
        return Object.freeze({...scalars(row,PRESSURE_FIELDS),requestedCostCount:scalar(row.requestedCostCount),requestedCosts:Object.freeze((Array.isArray(row.requestedCosts)?row.requestedCosts:[]).slice(0,4).map(cost=>scalars(cost,['category','bytes','precision','label'])))});
      };
      transitionFailure=Object.freeze({atMs:performance.now(),utc:new Date().toISOString(),provider:stage,message:String(error instanceof Error?error.message:error).slice(0,256),errorName:typeof failure?.name==='string'?failure.name.slice(0,128):undefined,
        errorPressure:failure?.name==='ResourceBudgetExceededError'?pressure(failure.details):undefined,
        ledger:Object.freeze({...scalars(ledger,LEDGER_FIELDS),lastPressure:pressure(ledger.lastPressure),categories:Object.freeze(Object.fromEntries(Object.entries(ledger.categories).slice(0,32).map(([name,cost])=>[name.slice(0,64),scalars(cost,['bytes','exactBytes','estimatedBytes'])])))})});
    }catch{/* Diagnostics must never change a transition or its fallback. */}
  }
  function recordReadinessTimeout(stage:ThreeDFallback['provider'],error:unknown){
    if(!localDiagnostics)return;
    try{
      const draw=mainDrawReadiness(true).providers??[],ledger=resourceStore.budget.stats;
      readinessTimeout=Object.freeze({atMs:performance.now(),utc:new Date().toISOString(),provider:stage,message:String(error instanceof Error?error.message:error).slice(0,256),
        ledger:Object.freeze({...scalars(ledger,LEDGER_FIELDS),lastPressure:scalars(ledger.lastPressure,PRESSURE_FIELDS)}),
        providers:Object.freeze(providerOrder.map(provider=>{
          const observation=objectOf(managers.get(provider)?.getDrawReadinessDiagnostic?.());
          return Object.freeze({provider,draw:scalars(draw.find(row=>row.provider===provider),DRAW_FIELDS),
            readiness:observation&&Object.freeze({...scalars(observation,READINESS_FIELDS),timing:scalars(observation.timing,TIMING_FIELDS)}),
            programs:Object.freeze((renderers.get(provider)?.getProgramPreparationStats?.()??[]).slice(0,2).map(programBudgetDigest))});
        }))});
    }catch{/* a diagnostic snapshot never changes the fallback */}
  }
  /** programStats: rows the caller already read from renderer.getProgramPreparationStats(). */
  function resourceDiagnostics(programStats?:readonly unknown[]):CompositorResourceDiagnostics{
    const rows=destroyed?[]:programStats??providerOrder.flatMap(provider=>renderers.get(provider)?.getProgramPreparationStats?.()??[]);
    return Object.freeze({detailRefresh:detailRefreshTrace?.snapshot(),recentPrograms:Object.freeze(destroyed?[]:[...boundContexts].slice(0,4).map(context=>getRecentProgramStats(context))),
      providers:Object.freeze(rows.slice(0,16).map(programBudgetDigest)),readinessTimeout,transitionFailure});
  }
  options.map.on('render',collectRetiredResources);
  // One registration for this compositor's life: a GPU retirement that waits
  // for its fence, or a deferred reclaimable wake, asks for exactly one frame,
  // whose 'render' collects above. A still map is woken without a timer.
  const stopRetirementFrames=resourceStore.onRetirementPending?.(()=>options.map.triggerRepaint(),lifetime.signal);
  return {
    requestMode,
    beginContextRecovery,
    getDrawReadinessSnapshot:()=>mainDrawReadiness(true),
    getFrozenDataResourceStats:()=>frozenDataResources.stats,
    getNativeSourceDiagnostics:()=>nativeSources.stats,
    // Read only already-recorded readiness; full cacheStats projects resident data.
    // Boundary-only diagnostics; never used as the live readiness gate.
    getRecoveryPreparationStats:()=>providerOrder.flatMap(provider=>renderers.get(provider)?.getProgramPreparationStats?.()??[]),
    getManagerDrawReadiness:()=>providerOrder.flatMap(provider=>{const record=managers.get(provider)?.getDrawReadinessDiagnostic?.();const camera=managers.get(provider)?.getCameraReadinessDiagnostic?.();return record?[{provider,record:{...record,...(camera?{camera}: {})}}]:[];}),
    getBuildingDetailSolarSnapshot:()=>Object.freeze({state:solarDetail.state,plan:solarDetail.capturePlan(),providers:Object.freeze(destroyed?[]:providerOrder.map(provider=>Object.freeze({provider,settlement:managers.get(provider)?.getDetailSettlement?.()})))}),
    // Diagnostics only: reads each detail runtime's recorded decisions and the
    // same provider's renderer revision. Never selects, refreshes or repaints.
    getBuildingDetailSelectionSnapshots:()=>Object.freeze(destroyed?[]:providerOrder.flatMap(provider=>{const runtime=detailRuntimes.get(provider);if(!runtime)return[];const revision=renderers.get(provider)?.getRevision();return[Object.freeze({provider,rendererGeneration:revision?.generation??null,snapshot:runtime.getBuildingDetailSelectionSnapshot()})];})),
    ensureReady,
    // Diagnostics only (local diagnostics proof): bounded, read-only.
    getResourceDiagnostics:resourceDiagnostics,
    getOwnerReconstructionBinding(identity) {for(const p of providerOrder){const value=managers.get(p)?.getOwnerReconstructionBinding?.(identity);if(value)return value;}},
    getSourceBinding(identity) {for(const p of providerOrder){const m=managers.get(p),component=m?.renderer?.borrowSourceComponent(identity);if(component&&paintOwner(component)===p){const value=m?.getSourceBinding?.(identity);if(value)return value;}}},
    // The fourth argument passes through unchanged. A caller-admitted read never
    // waits for initialization here: it holds its claim, so it must follow
    // ensureReady(signal), which waits holding nothing.
    async readAsset(asset,signal,max,admission){
      // A destroy between the resolved readiness and this continuation is an abort.
      if(admission===undefined){await ensure(signal);signal.throwIfAborted();if(destroyed)throw abort();}
      else{signal.throwIfAborted();if(destroyed)throw abort();if(!managers.size)throw Error('A caller-admitted 3D asset read needs ensureReady(signal) before its admission');}
      return managers.get('city')!.readAsset(asset,signal,max,admission);
    },
    setPageHidden(value){hidden=value;if(value)modelViewProjection.invalidate();managers.forEach(syncManagerVisibility);},
    setViewportVisible(value){viewportVisible=value;if(!value)modelViewProjection.invalidate();managers.forEach(syncManagerVisibility);},
    setReducedMotion(value){reduced=value;managers.forEach(m=>m.setReducedMotion(value));},
    setOpacityContext(value){opacityContext=value;managers.forEach(m=>m.setOpacityContext(value));},
    get mode(){return managers.get('city')?.mode??'2d';},get wantedMode(){return wanted;},
    get renderer(){return renderers.size?renderer:undefined;},get sourceMetadata(){return managers.get('city')?.sourceMetadata;},
    get paintLayers(){return [...renderers.values()].map(r=>r.layer);},
    getRevision:()=>renderer.getRevision(),
    cacheStats:()=>{
      // Collect each provider once: its full diagnostic getter also projects
      // resident screen samples and must not run for every aggregate field.
      const snapshots=new Map([...managers].map(([provider,manager])=>[provider,manager.cacheStats()]));
      const city=snapshots.get('city');
      const stats=providerOrder.flatMap(provider=>{const value=snapshots.get(provider)?.renderer;return value?[value]:[];});
      const first=city?.renderer??stats[0];
      const combined=renderers.size?{...first,components:stats.reduce((n,value)=>n+(value.components??0),0),vertices:stats.reduce((n,value)=>n+(value.vertices??0),0),paintProviders:Object.fromEntries(providerOrder.flatMap(provider=>{const value=snapshots.get(provider)?.renderer;return value?[[provider,value]]:[];}))}:undefined;
      return {...city,modeTransitionPending:preparing!==0,lastError,threeDFallback:lastFallback,ownerReconstruction:{notNative:true as const,geometryAdded:[...snapshots.values()].reduce((sum,value)=>sum+(value.ownerReconstruction?.geometryAdded??0),0),components:[...snapshots.values()].flatMap(value=>value.ownerReconstruction?.components??[])},paintProviders:Object.fromEntries(snapshots),frozenTableInputs:frozenPaintTableStats(),frozenDataResources:frozenDataResources.stats,visiblePreparation:preparationGate.stats,sharedNativeSources:nativeSources.stats,sharedTransport:transport.stats,resourceResidency:resourceStore.stats,facadeHelperSource:facadeHelperSourceStats(resourceStore.budget),
        // The inner painted group only (no dedicated source); while detail demand
        // is pending it keeps the last capture's value: read it with captures.
        reflectionBudget:reflectionGroup.reflectionBudgetStats,renderer:combined,rendererScreenSamples:providerOrder.flatMap(provider=>snapshots.get(provider)?.rendererScreenSamples??[]),revision:renderer.getRevision(),selected:renderers.size?renderer.selected:undefined};
    },
    suspend(settings?:ContextRecoveryOptions){
      projectionSuspended=true;solarDetailContextGeneration++;solarDetail.reset();modelViewProjection.invalidate();
      const stamp=settings?.contextRecovery&&recoveryTransportIdle()?quietFrozenStamp():undefined;
      recoveryFrozenStamp=stamp;const keep=stamp!==undefined;
      if(!keep){request.abort();frozenInitialization?.close();}
      managers.forEach(m=>m.suspend(keep?settings:undefined));return keep;
    },
    resume(settings?:ContextRecoveryOptions){if(destroyed)return;projectionSuspended=false;const incomplete=wanted==='3d'&&providerOrder.some(p=>managers.get(p)?.wantedMode!=='3d');
      const keep=settings?.contextRecovery===true&&recoveryFrozenStamp!==undefined&&recoveryTransportIdle()&&quietFrozenStamp()===recoveryFrozenStamp;recoveryFrozenStamp=undefined;
      if(!keep&&wanted==='3d'&&managers.size){request.abort();request=new AbortController();startFrozenInitialization(request.signal);}
      managers.forEach(m=>m.resume(keep?settings:undefined));if(incomplete)void requestMode('3d',new AbortController().signal).catch(()=>{});
    },
    destroy(){if(destroyed)return;destroyed=true;solarDetail.reset();options.map.off('render',collectRetiredResources);stopRetirementFrames?.();for(const pick of pickingDemands)pick.release();releaseSelectedSource();pickRevisions.clear();detailReflection=undefined;detailReflectionPlane=undefined;pendingDetailRefresh.clear();detailDemandReaders.clear();modelViewProjection.invalidate();request.abort();preparationGate.destroy();frozenInitialization?.close();lifetime.abort();managers.forEach(m=>m.destroy());frozenDataResources.destroy();nativeSources.destroy();transport.destroy();
      // Context scope: retained executables of this map's GL contexts only, never
      // another map's on the same page ledger (page teardown passes the store).
      for(const context of boundContexts)releaseRecentPrograms(context);boundContexts.clear();
      resourceStore.collectRetired();
      // The destroyed owners are no longer reachable from this compositor.
      managers.clear();renderers.clear();detailRuntimes.clear();states.clear();readinessTimeout=undefined;transitionFailure=undefined;},
  } as Actual;
}
