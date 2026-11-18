import type {ContextRecoveryOptions} from './recovery-resident-reuse';
import {reichstagAppearanceVertexReservation} from './reichstag-appearance-budget';
import {checkedSceneEnvironment,type SceneEnvironmentState} from './scene-environment-state';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import {cityCacheIdleTiers} from './city-cache-retention';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import type {installThreeDimensionalMap as InstallActualMap} from './three-dimensional-map';
type Installer=typeof InstallActualMap;
type Options=Parameters<Installer>[0];
type Actual=ReturnType<Installer>&{readonly paintLayers?:{id:string}[]};
type Module={installThreeDimensionalMap:Installer};
/** A small 2D initial adapter. The actual owner coordinates the frozen painting
 * implementations and their shared bounded asset transport after first use. */
export function installThreeDimensionalMap(options:Options,loadModule:()=>Promise<Module>=()=>import('./three-dimensional-map')):Actual&{setSceneEnvironment:(value:SceneEnvironmentState)=>void;readonly resourceStore:ChunkResourceStore}{
 const mobile=options.mobile??matchMedia('(max-width:760px)').matches;
 const resourceStore=options.resourceStore??getPageChunkResourceStore({profile:mobile?'mobile':'desktop',cacheIdleTiersMs:cityCacheIdleTiers(options.city)});
 const reservedAppearanceVertices=reichstagAppearanceVertexReservation(options.city),nativeAdmissionVertexLimit=(mobile?100000:200000)-reservedAppearanceVertices;
 let actual:Actual|undefined,modulePromise:Promise<Module>|undefined,destroyed=false,suspended=false;
 let lastError:string|undefined;let ownsUnloaded2DTransition=false;
 let pendingModeRequest:number|undefined,unloadedFallback:{request:number}|undefined,recoveryFallback:typeof unloadedFallback;
 let wanted:'2d'|'3d'='2d',revision=0,modeRequest=new AbortController();
 let sceneEnvironment:SceneEnvironmentState|undefined;
 let hidden:boolean|undefined,viewportVisible=true,reduced:boolean|undefined,opacityContext:'normal'|'route-selection'='normal';
 const aborted=()=>new DOMException('Aborted','AbortError');
 const canceled=(error:unknown)=>!!error&&typeof error==='object'&&'name'in error&&error.name==='AbortError';
 function waitModule(signal:AbortSignal):Promise<Module>{
  signal.throwIfAborted();if(destroyed)return Promise.reject(aborted());
  if(!modulePromise){modulePromise=loadModule().catch(error=>{modulePromise=undefined;throw error;});}
  return new Promise((resolve,reject)=>{let settled=false;const done=(error?:unknown,value?:Module)=>{if(settled)return;settled=true;signal.removeEventListener('abort',cancel);error?reject(error):resolve(value!);};const cancel=()=>done(aborted());signal.addEventListener('abort',cancel,{once:true});if(signal.aborted){cancel();return;}modulePromise!.then(m=>done(undefined,m),e=>done(e));});
 }
 async function ensure(signal:AbortSignal){
  if(actual)return actual;
  const module=await waitModule(signal);signal.throwIfAborted();if(destroyed||suspended)throw aborted();
  if(!actual){actual=module.installThreeDimensionalMap({...options,mobile,resourceStore,onRenderer:renderer=>{if(sceneEnvironment)renderer.setSceneEnvironment(sceneEnvironment);renderer.setPageHidden((hidden??document.hidden)||!viewportVisible);if(reduced!==undefined)renderer.setReducedMotion(reduced);renderer.setOpacityContext(opacityContext);options.onRenderer?.(renderer);}});if(hidden!==undefined)actual.setPageHidden(hidden);actual.setViewportVisible(viewportVisible);if(reduced!==undefined)actual.setReducedMotion(reduced);actual.setOpacityContext(opacityContext);}
  return actual;
 }
 async function requestMode(next:'2d'|'3d',external:AbortSignal){
  if(destroyed)throw aborted();external.throwIfAborted();wanted=next;modeRequest.abort();const own=modeRequest=new AbortController(),ticket=++revision,cancel=()=>own.abort();external.addEventListener('abort',cancel,{once:true});if(external.aborted)own.abort();
  pendingModeRequest=ticket;unloadedFallback=recoveryFallback=undefined;
  try{
   if(next==='2d'&&!actual){own.signal.throwIfAborted();if(suspended)throw aborted();ownsUnloaded2DTransition=true;options.map.stop();options.map.easeTo({pitch:0,duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:220});const state={mode:'2d' as const,status:'ready' as const};options.onState?.(state);if(!own.signal.aborted&&!destroyed&&ticket===revision)lastError=undefined;return state;}
   if(next==='3d'&&ownsUnloaded2DTransition){ownsUnloaded2DTransition=false;options.map.stop();}
   const owner=actual??await ensure(own.signal);own.signal.throwIfAborted();if(ticket!==revision||destroyed||suspended)throw aborted();
   const result=await owner.requestMode(next,own.signal);if(!own.signal.aborted&&!destroyed&&ticket===revision)lastError=undefined;return result;
  }catch(error){if(!own.signal.aborted&&!canceled(error))lastError=String(error);if(!own.signal.aborted&&!canceled(error)&&!destroyed&&ticket===revision&&!actual){
    // The 3D owner never loaded: 2D stays the wanted view, so resume() cannot reissue this request.
    if(next==='3d'){wanted='2d';unloadedFallback={request:ticket};}options.onState?.(next==='3d'?{mode:'2d',status:'error',fallback:{reason:'error',provider:'initialization'}}:{mode:'2d',status:'error'});}throw error;}
  finally{external.removeEventListener('abort',cancel);if(pendingModeRequest===ticket)pendingModeRequest=undefined;}
 }
 return {
  requestMode,
  beginContextRecovery(){
   recoveryFallback=undefined;if(destroyed||pendingModeRequest!==undefined)return false;
   if(actual)return actual.beginContextRecovery();
   if(wanted!=='2d'||!unloadedFallback)return false;
   recoveryFallback=unloadedFallback;return true;
  },
  getDrawReadinessSnapshot(){
   if(actual)return actual.getDrawReadinessSnapshot();
   const failure=unloadedFallback&&recoveryFallback===unloadedFallback?undefined:lastError;
   return{ready:!failure&&wanted!=='3d',preparing:!failure&&wanted==='3d',...(failure?{failure}:{}),mode:'2d' as const,wantedMode:wanted,providers:[]};
  },
  getFrozenDataResourceStats:()=>actual?.getFrozenDataResourceStats(),
  getNativeSourceDiagnostics:()=>actual?.getNativeSourceDiagnostics(),
  getManagerDrawReadiness:()=>actual?.getManagerDrawReadiness(),
  getRecoveryPreparationStats:()=>actual?.getRecoveryPreparationStats()??Object.freeze([]),
  getBuildingDetailSelectionSnapshots:()=>actual?.getBuildingDetailSelectionSnapshots()??Object.freeze([]),
  getBuildingDetailSolarSnapshot:()=>actual?.getBuildingDetailSolarSnapshot(),
  getOwnerReconstructionBinding(identity){return actual?.getOwnerReconstructionBinding(identity);},
  getSourceBinding(identity){return actual?.getSourceBinding(identity);},
  // The fourth argument passes through unchanged. A caller-admitted read holds
  // its claim, so it never waits here for the 3D owner to load: it follows
  // ensureReady(signal), which loads and installs the owner holding nothing.
  async readAsset(asset,signal,max,admission){signal.throwIfAborted();if(admission!==undefined&&!actual)throw Error('A caller-admitted 3D asset read needs ensureReady(signal) before its admission');return (actual??await ensure(signal)).readAsset(asset,signal,max,admission);},
  // Readiness only, holding nothing; call it after 3D was requested: before
  // that it loads the 3D owner and installs every provider manager itself.
  async ensureReady(signal){signal.throwIfAborted();const owner=actual??await ensure(signal);signal.throwIfAborted();await owner.ensureReady(signal);},
  // Before the 3D owner loads it owns no context, program row or timeout.
  getResourceDiagnostics:programStats=>actual?.getResourceDiagnostics(programStats)??Object.freeze({recentPrograms:Object.freeze([]),providers:Object.freeze([]),readinessTimeout:undefined}),
  setSceneEnvironment(value){sceneEnvironment=checkedSceneEnvironment(value);actual?.renderer?.setSceneEnvironment(sceneEnvironment);},
  setPageHidden(value){hidden=value;actual?.setPageHidden(value);},
  setViewportVisible(value){viewportVisible=value;actual?.setViewportVisible(value);},
  setReducedMotion(value){reduced=value;actual?.setReducedMotion(value);},
  setOpacityContext(value){opacityContext=value;actual?.setOpacityContext(value);},
  get mode(){return actual?.mode??'2d';},get wantedMode(){return actual?.wantedMode??wanted;},
  get renderer(){return actual?.renderer;},get sourceMetadata(){return actual?.sourceMetadata;},
  get paintLayers(){return actual?.paintLayers??[];},
  // The page store this adapter hands the 3D owner, available before it loads,
  // so page-level installers can pass the same ledger explicitly.
  get resourceStore(){return resourceStore;},
  getRevision:()=>actual?.getRevision()??{generation:0,viewRevision:0},
  cacheStats(){if(actual)return {...actual.cacheStats(),lazyAdapterError:lastError};const b=options.map.getBounds();return{handoff:{expectedGeneration:null,registeredTicket:null,currentTicket:0,actuallyPublished:null,mainReadyGeneration:null,mainReadyTicket:null},lastError,visibleLoadsPending:0,ownerReconstruction:{components:[],geometryAdded:0,notNative:true as const},sourceEdgeAssemblyDisplay:{groups:[],errors:[]},lazyAdapterError:lastError,logicalLeafRequestGuard:mobile?64:128,visibleVertexLimit:mobile?100000:200000,reservedAppearanceVertices,nativeAdmissionVertexLimit,viewportBounds:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],mode:'2d',wantedMode:wanted,metadataPages:undefined,sourceRoles:{resources:0,wanted:0,main:0,serializedBytes:0,inflatedJSONBytes:0,retainedPayloadEstimateBytes:0,scope:'manager-held-source-roles-not-independent-cache'},tiles:0,bytes:0,physicalBytes:0,inflatedJSONBytes:0,retainedPayloadEstimateBytes:0,visibleRetainedPayloadEstimateBytes:0,stagingRetainedPayloadEstimateBytes:0,cachePlusVisibleConservativeEstimateBytes:0,cacheVisibleStagingConservativeEstimateBytes:0,physicalShardFetchTransientMaxBytes:2*1024**2,measurement:'serialized-bytes-and-retained-payload-estimate-not-heap',active:0,peakConcurrency:0,loadCount:0,visibleShardIds:[],partial:false,selected:undefined,revision:{generation:0,viewRevision:0},renderer:undefined,rendererScreenSamples:[],zoom:options.map.getZoom(),pitch:options.map.getPitch(),queued:0};},
  suspend(settings?:ContextRecoveryOptions){if(destroyed)return false;suspended=true;const keep=actual?.suspend(settings)===true;if(!keep){modeRequest.abort();revision++;}return keep;},
  resume(settings?:ContextRecoveryOptions){if(destroyed)return;suspended=false;if(actual)actual.resume(settings);else if(wanted==='3d')void requestMode('3d',new AbortController().signal).catch(()=>{});},
  destroy(){if(destroyed)return;destroyed=true;modeRequest.abort();revision++;actual?.destroy();}
 };
}
