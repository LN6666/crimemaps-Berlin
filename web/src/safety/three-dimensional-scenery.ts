import type {DisplayFrameClock} from './display-frame-clock';
import type {Map as MapView} from 'maplibre-gl';
import type {createAnimatedVehicles} from './animated-vehicles';
import type {VehicleScenery} from './vehicle-scenery-data';
import type {VehicleFrameLoad} from './vehicle-frame-budget';
import type {ChunkResourceLease,ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';
import {attemptEnvironmentAdmission,createEnvironmentAdmissionStats,createEnvironmentReadEnvelopes,environmentAdmissionError,environmentDecodedCost,environmentJsonReadCosts,environmentResourceStore,environmentRetainedEstimate,reserveEnvironmentCosts,waitForEnvironmentBudget,waitForEnvironmentLease,EnvironmentResourcePendingError,EnvironmentResourceUnfitError} from './environment-resource-budget';
import type {ResourceByteAcquireOptions} from './resource-byte-transport';
type Asset={path:string;sha256:string;bytes:number};
type SceneIndex={schema_version:1;city:string;role:'decorative-schematic';partial:true;snapshot:string;source_pbf_sha256:string;data:Asset};
const valid=(v:any):v is Asset=>v&&typeof v.path==='string'&&/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+$/.test(v.path)&&!v.path.split('/').some((s:string)=>s==='..'||s==='.')&&/^[a-f0-9]{64}$/.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=1024**2;

const COPY={en:{loading:'Loading mapped roads for the car animation…',ready:'Car animation follows a subset of mapped roads.',none:'No saved animation roads in this view. Other map features remain available.',retained:'Roads could not be refreshed. Previously loaded animation roads remain visible.',failed:'Car animation is unavailable. Other map features remain available.'},de:{loading:'Kartierte Straßen für die Autoanimation werden geladen…',ready:'Die Autoanimation folgt einem Teil der kartierten Straßen.',none:'Für diesen Ausschnitt sind keine Animationsstraßen gespeichert. Andere Kartenfunktionen bleiben verfügbar.',retained:'Die Straßen konnten nicht aktualisiert werden. Die zuvor geladenen Animationsstraßen bleiben sichtbar.',failed:'Die Autoanimation ist nicht verfügbar. Andere Kartenfunktionen bleiben verfügbar.'},zh:{loading:'正在加载小车动画所用的道路…',ready:'小车动画沿部分已保存的道路显示。',none:'此视野没有已保存的动画道路，其他地图功能仍可使用。',retained:'道路暂未刷新，仍显示此前加载的道路动画。',failed:'小车动画暂不可用，其他地图功能仍可使用。'}};
/** Optional scenery shares the map and the existing 3D request semaphore.
 * read/ensureRead follow the environment manager's contract: with ensureRead
 * every read carries the transport's caller-admitted 4th argument for the one
 * claim admitted for it (the scenery index claim, or the road entry's
 * production context), envelope minted per read. */
export function installThreeDimensionalScenery(options:{map:MapView;city:string;locale:'zh'|'en'|'de';host:HTMLElement;read:(asset:string|{path:string;sha256:string;bytes:number},signal:AbortSignal,max:number,admission?:ResourceByteAcquireOptions)=>Promise<unknown>;ensureRead?:(signal:AbortSignal)=>Promise<void>;buildingLayer:()=>string|undefined;frameLoad?:()=>VehicleFrameLoad|undefined;frameClock?:DisplayFrameClock;requested?:boolean;mobile?:boolean;reducedMotion?:boolean;resourceStore?:ChunkResourceStore}){
 const {map,city}=options,c=COPY[options.locale],status=document.createElement('p');status.className='three-dimensional-scenery-status';status.setAttribute('role','status');options.host.append(status);
 let requested=options.requested!==false,mode=false,visible=!document.hidden,viewportVisible=true,reduce=options.reducedMotion??false,destroyed=false,suspended=false,revision=0,request=new AbortController(),data:VehicleScenery|undefined;
 let vehicles:ReturnType<typeof createAnimatedVehicles>|undefined;
 let cameraMoving=false,cameraGestureActive=false,settleTimer:ReturnType<typeof setTimeout>|undefined;
 let sourceBytes=0,state='idle';
 // Decoded scenery roads are one page-store value held by a 'source' lease for
 // as long as this owner and its vehicles' sourceRoads keep them; reads are
 // admitted on the same page ledger before they start.
 const resources=environmentResourceStore(options.mobile,options.resourceStore),admission=createEnvironmentAdmissionStats('vehicle-scenery',()=>committedBytes());
 const callerAdmitted=typeof options.ensureRead==='function',envelopes=createEnvironmentReadEnvelopes();
 type SceneryValue={scenery:VehicleScenery;retained:number};let dataLease:ChunkResourceLease<SceneryValue>|undefined;
 // Visibility/context pauses reuse this exact source/view commit and its cohort;
 // changed roads, bounds or zoom still rebuild through the original renderer.
 let publishedRoads:VehicleScenery|undefined,publishedBounds:readonly number[]|undefined,publishedZoom:number|undefined;
 /** Bytes of completed items this owner committed in its 3D lifetime and keeps
  * while a wait for its next item registers (counted as committed-hold waits,
  * see createEnvironmentAdmissionStats): the vehicle renderer's fixed CPU
  * storage, program allowance, viewport roads and GPU storage, and the decoded
  * scenery roads. A road production in flight is a store entry, not counted. */
 function committedBytes(){
  const own=vehicles?.stats.resources;let bytes=own?(own.fixedCPUBytes??0)+(own.programAllowanceBytes??0)+(own.roadBytes??0)+(own.gpuBytes??0):0;
  const value=dataLease&&!dataLease.released?dataLease.value:undefined;if(value)bytes+=Math.ceil(value.retained);
  return bytes;
 }
 const active=()=>!destroyed&&!suspended&&mode&&requested&&visible&&viewportVisible&&!reduce&&map.getZoom()>=14.5;
 const bounds=():[number,number,number,number]=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];};
 function stopped(){clearTimeout(settleTimer);settleTimer=undefined;request.abort();revision++;vehicles?.setEnabled(false);status.textContent='';state='idle';}
 // Cars whose GPU storage still waits for the page budget are not drawn: keep
 // the loading copy until the renderer reports that its storage exists.
 function readyStatus(){const stats=vehicles?.stats;return !stats||!data?'':stats.resources?.gpuDeferred?c.loading:stats.allocatedVehicles?c.ready+' '+data.source_snapshot:c.none;}
 // Explicit 2D owns the lifetime boundary; gesture/short hidden pauses retain warm roads.
 function releaseSceneryResources(){
  const oldVehicles=vehicles;
  vehicles=undefined;data=undefined;sourceBytes=0;publishedRoads=undefined;publishedBounds=undefined;publishedZoom=undefined;
  try{if(oldVehicles){try{if(map.getLayer(oldVehicles.layer.id))map.removeLayer(oldVehicles.layer.id);}finally{oldVehicles.destroy();}}}
  finally{const lease=dataLease;dataLease=undefined;lease?.release();}
 }
 async function loadSceneryRoads(raw:SceneIndex,parse:(value:unknown,city:string)=>VehicleScenery,signal:AbortSignal,current:()=>void):Promise<SceneryValue>{
  const key=JSON.stringify(['vehicle-scenery-v1',city,raw.data.sha256,raw.data.bytes,raw.snapshot,raw.source_pbf_sha256]);
  for(;;){
   // A caller-admitted read's minted envelope joins the entry's estimate and the
   // production context is its claim: delivery replaces the envelope in place by
   // the bytes, beside the read set it keeps, until the decoded roads replace both.
   const readCosts=environmentJsonReadCosts(raw.data,'vehicle scenery roads'),roadsMax=Math.min(1024**2,raw.data.bytes),envelope=callerAdmitted?envelopes.mint(raw.data.path,roadsMax):undefined;
   const acquire=()=>resources.acquire<SceneryValue>({contentKey:key,role:'source',allowRecent:false,signal,estimate:envelope?[...envelope,...readCosts]:readCosts,
    produce:async context=>{
     const {signal:work,adjust,budget}=context;let input:unknown;
     try{input=await (envelope?options.read(raw.data,work,roadsMax,{admitted:context,envelope,keep:readCosts}):options.read(raw.data,work,1024**2));}
     catch(error){if(!envelope||work.aborted)throw error;const failed=envelopes.failure(raw.data.path,'vehicle scenery roads',error);if(failed.retry)throw error;if(failed.error instanceof EnvironmentResourceUnfitError)admission.unfit('vehicle scenery roads',failed.error);throw failed.error;}
     work.throwIfAborted();if(envelope)envelopes.delivered(raw.data.path);
     const scenery=parse(input,city);if(scenery.source_snapshot!==raw.snapshot||scenery.source_pbf_sha256!==raw.source_pbf_sha256)throw Error('Scenery source binding mismatch');
     const value:SceneryValue={scenery,retained:environmentRetainedEstimate(scenery)};
     if(!adjust([environmentDecodedCost(value.retained,value,'vehicle scenery roads')])){const pressure=budget.stats.lastPressure;throw pressure?new ResourceBudgetExceededError(pressure):Error('Vehicle scenery roads no longer fit the page budget');}
     return value;
    },
    costs:value=>[environmentDecodedCost(value.retained,value,'vehicle scenery roads')]});
   const attempt=attemptEnvironmentAdmission(resources.budget,signal,'vehicle scenery roads',acquire,admission),lease=attempt.admitted?attempt.value:await attempt.pending;
   try{await waitForEnvironmentLease(lease,signal);current();}
   catch(error){
    lease.release();
    const refusal=signal.aborted?undefined:environmentAdmissionError(error,'vehicle scenery decode');
    if(!(refusal instanceof EnvironmentResourcePendingError)){if(refusal instanceof EnvironmentResourceUnfitError)admission.unfit('scenery-decode',refusal);throw refusal??error;}
    admission.pending('scenery-decode',refusal);try{await waitForEnvironmentBudget(resources.budget,signal);}finally{admission.settled('scenery-decode');}
    current();continue;
   }
   const value=lease.value;if(!value){lease.release();throw new DOMException('Aborted','AbortError');}
   // Ownership outlives this refresh signal: keep an unbound role, drop the bound one.
   const owned=lease.retain('source');lease.release();dataLease?.release();dataLease=owned;return value;
  }
 }
 async function refresh(){
  if(!active()){stopped();return;}
  if(cameraMoving||cameraGestureActive||settleTimer!==undefined)return;
  request.abort();const own=request=new AbortController(),ticket=++revision,signal=own.signal;
  const current=()=>{signal.throwIfAborted();if(ticket!==revision||!active()||cameraMoving||cameraGestureActive||settleTimer!==undefined)throw new DOMException('Aborted','AbortError');};
  try{
   state='loading';status.textContent=c.loading;
   if(!vehicles){const module=await import('./animated-vehicles');current();const create=()=>module.createAnimatedVehicles(map,city,{mobile:options.mobile,reducedMotion:reduce,frameClock:options.frameClock,resourceStore:resources,onRenderError:()=>{if(destroyed||!mode||!requested||!visible)return;request.abort();revision++;vehicles?.setEnabled(false);state='error';status.textContent=c.failed;},onGpuStateChange:()=>{if(destroyed||state!=='ready'||!vehicles)return;status.textContent=readyStatus();}});const attempt=attemptEnvironmentAdmission(resources.budget,signal,'vehicle renderer',create,admission),created=attempt.admitted?attempt.value:await attempt.pending;try{current();map.addLayer(created.layer as any,options.buildingLayer());vehicles=created;}catch(error){try{if(map.getLayer(created.layer.id))map.removeLayer(created.layer.id);}finally{created.destroy();}throw error;}}
   if(vehicles.stats.renderFailure){if(map.getLayer(vehicles.layer.id))map.removeLayer(vehicles.layer.id);map.addLayer(vehicles.layer as any,options.buildingLayer());}
   if(!data){
    // The caller-admitted protocol readies the reader holding no claim first.
    if(callerAdmitted){await options.ensureRead!(signal);current();}
    const indexPath='/safety/buildings3d/scenery-index.json',indexCosts=environmentJsonReadCosts({bytes:64*1024},'vehicle scenery index');let raw!:SceneIndex;
    // One claim for the index read set and, caller-admitted, its minted envelope;
    // a refused delivery is retried holding nothing with the envelope it named.
    for(;;){const indexEnvelope=callerAdmitted?envelopes.mint(indexPath,64*1024):undefined,indexClaimCosts=indexEnvelope?[...indexCosts,...indexEnvelope]:indexCosts,indexAttempt=attemptEnvironmentAdmission(resources.budget,signal,'vehicle scenery index',()=>reserveEnvironmentCosts(resources.budget,indexClaimCosts,'vehicle scenery index'),admission),indexClaim=indexAttempt.admitted?indexAttempt.value:await indexAttempt.pending;
     try{try{raw=await (indexEnvelope?options.read(indexPath,signal,64*1024,{admitted:indexClaim,envelope:indexEnvelope,keep:indexCosts}):options.read(indexPath,signal,64*1024)) as SceneIndex;}catch(error){if(!indexEnvelope||signal.aborted)throw error;const failed=envelopes.failure(indexPath,'vehicle scenery index',error);if(failed.retry)continue;if(failed.error instanceof EnvironmentResourceUnfitError)admission.unfit('vehicle scenery index',failed.error);throw failed.error;}
      current();if(indexEnvelope)envelopes.delivered(indexPath);if(!raw||raw.schema_version!==1||raw.city!==city||raw.role!=='decorative-schematic'||raw.partial!==true||typeof raw.snapshot!=='string'||raw.snapshot.length>128||!/^[a-f0-9]{64}$/.test(raw.source_pbf_sha256)||!valid(raw.data))throw Error('Invalid scenery index');break;}finally{indexClaim.release();}}
    const parser=await import('./vehicle-scenery-data');current();const loaded=await loadSceneryRoads(raw,parser.parseVehicleScenery,signal,current);data=loaded.scenery;sourceBytes=raw.data.bytes;
   }
   current();const zoom=map.getZoom(),view=bounds();vehicles.setZoom(zoom);const frameLoad=options.frameLoad?.();if(frameLoad)vehicles.setFrameLoad(frameLoad);if(publishedRoads!==data||publishedZoom!==zoom||!publishedBounds||view.some((value,index)=>value!==publishedBounds![index])){const roads=data,target=vehicles,attempt=attemptEnvironmentAdmission(resources.budget,signal,'vehicle viewport roads',()=>target.setRoads(roads,view),admission);if(!attempt.admitted){await attempt.pending;current();}publishedRoads=data;publishedBounds=view;publishedZoom=zoom;}vehicles.setVisible(visible&&viewportVisible);vehicles.setReducedMotion(reduce);vehicles.setEnabled(true);state='ready';status.textContent=readyStatus();
  }catch{if(!signal.aborted&&!destroyed&&ticket===revision){state='error';status.textContent=data?c.retained:c.failed;/* Keep the previous good roads; never commit a failed or cancelled view. */}}
 }
 const motionActive=()=>cameraMoving||cameraGestureActive;
 const cancelForMotion=()=>{clearTimeout(settleTimer);settleTimer=undefined;request.abort();revision++;};
 const settle=()=>{clearTimeout(settleTimer);settleTimer=undefined;if(motionActive())return;if(!active()){stopped();return;}settleTimer=setTimeout(()=>{settleTimer=undefined;if(!motionActive())void refresh();},100);};
 const moving=()=>{const wasMoving=motionActive();cameraMoving=true;if(!wasMoving)cancelForMotion();};
 const moved=()=>{cameraMoving=false;settle();};map.on('movestart',moving);map.on('moveend',moved);
 return {
  setGestureActive(value:boolean){if(cameraGestureActive===value)return;const wasMoving=motionActive();cameraGestureActive=value;if(value){if(!wasMoving)cancelForMotion();}else if(!motionActive()&&active())settle();},
  setMode(value:boolean){if(destroyed||mode===value)return;mode=value;if(!value){stopped();releaseSceneryResources();return;}void refresh();},
  setRequested(value:boolean){if(destroyed||requested===value)return;requested=value;void refresh();},
  setVisible(value:boolean){if(destroyed||visible===value)return;visible=value;vehicles?.setVisible(value&&viewportVisible);void refresh();},
  setViewportVisible(value:boolean){if(destroyed||viewportVisible===value)return;viewportVisible=value;vehicles?.setVisible(visible&&viewportVisible);void refresh();},
  setReducedMotion(value:boolean){if(destroyed||reduce===value)return;reduce=value;vehicles?.setReducedMotion(value);void refresh();},
  suspend(){if(destroyed||suspended)return;suspended=true;stopped();},resume(){if(destroyed||!suspended)return;suspended=false;void refresh();},
  get customLayer(){return vehicles?.layer;},
  getProofSettlementKey(){return [state,revision,requested,mode,visible,viewportVisible,suspended,destroyed,cameraMoving,cameraGestureActive,settleTimer!==undefined,vehicles?.getProofSettlementKey()] as const;},
  get stats(){
   // Report the waiting reason, not 'ready', while committed roads cannot draw.
   const vehicleStats=vehicles?.stats,gpuWaiting=state==='ready'&&vehicleStats?.resources?.gpuDeferred===true?{phase:'vehicle GPU buffers',label:vehicleStats.resources.gpuPending?.label,requiredBytes:vehicleStats.resources.gpuPending?.requiredBytes,publishedState:state}:undefined;
   return{positionSamples:vehicles?.positionSamples.map(p=>({...p,screen:(()=>{const q=map.project(p.lngLat as [number,number]);const r=map.getCanvas().getBoundingClientRect();return[r.left+q.x,r.top+q.y];})()})),state:gpuWaiting?'waiting-gpu-budget':state,cameraMoving,cameraGestureActive,settlePending:settleTimer!==undefined,sourceBytes,sourceRoads:data?.roads.length??0,sourcePositions:data?.roads.reduce((n,r)=>n+r.coordinates.length,0)??0,sourceSnapshot:data?.source_snapshot,role:'decorative-schematic',vehicles:vehicleStats,resources:{ledger:'page-resource-budget',decodedOwner:'page-chunk-resource-store',sourceLease:dataLease?.state,sourceRetainedEstimateBytes:dataLease?.value?.retained??0,gpuWaiting,admission:admission.stats,readAdmission:callerAdmitted?'caller-admitted':'reader-admitted',readEnvelopeRetries:envelopes.pendingRetries,physicalMemory:'unmeasured'}};},
  destroy(){if(destroyed)return;destroyed=true;stopped();map.off('moveend',moved);map.off('movestart',moving);try{releaseSceneryResources();}finally{status.remove();}}
 };
}
