import {reichstagAppearanceVertexReservation} from './reichstag-appearance-budget';
import type {installThreeDimensionalMap as InstallActualMap} from './three-dimensional-map';
type Installer=typeof InstallActualMap;
type Options=Parameters<Installer>[0];
type Actual=ReturnType<Installer>;
type Module={installThreeDimensionalMap:Installer};
/** A small 2D initial adapter. One actual manager owns every 3D/scenery/material read
 * after first use; no second semaphore, engine, source cache or fake renderer. */
export function installThreeDimensionalMap(options:Options,loadModule:()=>Promise<Module>=()=>import('./three-dimensional-map')):Actual{
 const mobile=options.mobile??matchMedia('(max-width:760px)').matches;
 const reservedAppearanceVertices=reichstagAppearanceVertexReservation(options.city),nativeAdmissionVertexLimit=(mobile?100000:200000)-reservedAppearanceVertices;
 let actual:Actual|undefined,modulePromise:Promise<Module>|undefined,destroyed=false,suspended=false;
 let lastError:string|undefined;let ownsUnloaded2DTransition=false;
 let wanted:'2d'|'3d'='2d',revision=0,modeRequest=new AbortController();
 let hidden:boolean|undefined,reduced:boolean|undefined,opacityContext:'normal'|'route-selection'='normal';
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
  if(!actual){actual=module.installThreeDimensionalMap({...options,mobile,onRenderer:renderer=>{if(hidden!==undefined)renderer.setPageHidden(hidden);if(reduced!==undefined)renderer.setReducedMotion(reduced);renderer.setOpacityContext(opacityContext);options.onRenderer?.(renderer);}});if(hidden!==undefined)actual.setPageHidden(hidden);if(reduced!==undefined)actual.setReducedMotion(reduced);actual.setOpacityContext(opacityContext);}
  return actual;
 }
 async function requestMode(next:'2d'|'3d',external:AbortSignal){
  if(destroyed)throw aborted();external.throwIfAborted();wanted=next;modeRequest.abort();const own=modeRequest=new AbortController(),ticket=++revision,cancel=()=>own.abort();external.addEventListener('abort',cancel,{once:true});if(external.aborted)own.abort();
  try{
   if(next==='2d'&&!actual){own.signal.throwIfAborted();if(suspended)throw aborted();ownsUnloaded2DTransition=true;options.map.stop();options.map.easeTo({pitch:0,duration:matchMedia('(prefers-reduced-motion:reduce)').matches?0:220});const state={mode:'2d' as const,status:'ready' as const};options.onState?.(state);if(!own.signal.aborted&&!destroyed&&ticket===revision)lastError=undefined;return state;}
   if(next==='3d'&&ownsUnloaded2DTransition){ownsUnloaded2DTransition=false;options.map.stop();}
   const owner=actual??await ensure(own.signal);own.signal.throwIfAborted();if(ticket!==revision||destroyed||suspended)throw aborted();
   const result=await owner.requestMode(next,own.signal);if(!own.signal.aborted&&!destroyed&&ticket===revision)lastError=undefined;return result;
  }catch(error){if(!own.signal.aborted&&!canceled(error))lastError=String(error);if(!own.signal.aborted&&!canceled(error)&&!destroyed&&ticket===revision&&!actual)options.onState?.({mode:'2d',status:'error'});throw error;}
  finally{external.removeEventListener('abort',cancel);}
 }
 return {
  requestMode,
  getOwnerReconstructionBinding(identity){return actual?.getOwnerReconstructionBinding(identity);},
  getSourceBinding(identity){return actual?.getSourceBinding(identity);},
  async readAsset(asset,signal,max){signal.throwIfAborted();return (actual??await ensure(signal)).readAsset(asset,signal,max);},
  setPageHidden(value){hidden=value;actual?.setPageHidden(value);},
  setReducedMotion(value){reduced=value;actual?.setReducedMotion(value);},
  setOpacityContext(value){opacityContext=value;actual?.setOpacityContext(value);},
  get mode(){return actual?.mode??'2d';},get wantedMode(){return actual?.wantedMode??wanted;},
  get renderer(){return actual?.renderer;},get sourceMetadata(){return actual?.sourceMetadata;},
  getRevision:()=>actual?.getRevision()??{generation:0,viewRevision:0},
  cacheStats(){if(actual)return {...actual.cacheStats(),lazyAdapterError:lastError};const b=options.map.getBounds();return{lastError,visibleLoadsPending:0,ownerReconstruction:{components:[],geometryAdded:0,notNative:true as const},sourceEdgeAssemblyDisplay:{groups:[],errors:[]},lazyAdapterError:lastError,logicalLeafRequestGuard:mobile?64:128,visibleVertexLimit:mobile?100000:200000,reservedAppearanceVertices,nativeAdmissionVertexLimit,viewportBounds:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],mode:'2d',wantedMode:wanted,metadataPages:undefined,tiles:0,bytes:0,physicalBytes:0,inflatedJSONBytes:0,retainedPayloadEstimateBytes:0,visibleRetainedPayloadEstimateBytes:0,stagingRetainedPayloadEstimateBytes:0,cachePlusVisibleConservativeEstimateBytes:0,cacheVisibleStagingConservativeEstimateBytes:0,physicalShardFetchTransientMaxBytes:2*1024**2,measurement:'serialized-bytes-and-retained-payload-estimate-not-heap',active:0,peakConcurrency:0,loadCount:0,visibleShardIds:[],partial:false,selected:undefined,revision:{generation:0,viewRevision:0},renderer:undefined,rendererScreenSamples:[],zoom:options.map.getZoom(),pitch:options.map.getPitch(),queued:0};},
  suspend(){if(destroyed)return false;suspended=true;modeRequest.abort();revision++;actual?.suspend();return false;},
  resume(){if(destroyed)return;suspended=false;if(actual)actual.resume();else if(wanted==='3d')void requestMode('3d',new AbortController().signal).catch(()=>{});},
  destroy(){if(destroyed)return;destroyed=true;modeRequest.abort();revision++;actual?.destroy();}
 };
}
