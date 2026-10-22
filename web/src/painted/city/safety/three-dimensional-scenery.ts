import type {Map as MapView} from 'maplibre-gl';
import type {createAnimatedVehicles} from './animated-vehicles';
import type {VehicleScenery} from './vehicle-scenery-data';
type Asset={path:string;sha256:string;bytes:number};
type SceneIndex={schema_version:1;city:string;role:'decorative-schematic';partial:true;snapshot:string;source_pbf_sha256:string;data:Asset};
const COPY={en:{loading:'Loading mapped roads for the car animation…',ready:'Car animation follows a subset of mapped roads.',none:'No saved animation roads in this view. Other map features remain available.',failed:'Car animation is unavailable. Other map features remain available.'},de:{loading:'Kartierte Straßen für die Autoanimation werden geladen…',ready:'Die Autoanimation folgt einem Teil der kartierten Straßen.',none:'Für diesen Ausschnitt sind keine Animationsstraßen gespeichert. Andere Kartenfunktionen bleiben verfügbar.',failed:'Die Autoanimation ist nicht verfügbar. Andere Kartenfunktionen bleiben verfügbar.'},zh:{loading:'正在加载小车动画所用的道路…',ready:'小车动画沿部分已保存的道路显示。',none:'此视野没有已保存的动画道路，其他地图功能仍可使用。',failed:'小车动画暂不可用，其他地图功能仍可使用。'}};
const valid=(v:any):v is Asset=>v&&typeof v.path==='string'&&/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+$/.test(v.path)&&!v.path.split('/').some((s:string)=>s==='..'||s==='.')&&/^[a-f0-9]{64}$/.test(v.sha256)&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=1024**2;
/** Optional scenery shares the map and the existing 3D request semaphore. */
export function installThreeDimensionalScenery(options:{map:MapView;city:string;locale:'zh'|'en'|'de';host:HTMLElement;read:(asset:string|Asset,signal:AbortSignal,max:number)=>Promise<unknown>;buildingLayer:()=>string|undefined;requested?:boolean;mobile?:boolean;reducedMotion?:boolean}){
 const {map,city}=options,c=COPY[options.locale],status=document.createElement('p');status.className='three-dimensional-scenery-status';status.setAttribute('role','status');options.host.append(status);
 let requested=options.requested!==false,mode=false,visible=!document.hidden,reduce=options.reducedMotion??false,destroyed=false,suspended=false,revision=0,request=new AbortController(),data:VehicleScenery|undefined;
 let vehicles:ReturnType<typeof createAnimatedVehicles>|undefined;
 let sourceBytes=0,state='idle';
 const active=()=>!destroyed&&!suspended&&mode&&requested&&visible&&!reduce&&map.getZoom()>=17;
 const bounds=():[number,number,number,number]=>{const b=map.getBounds();return[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()];};
 function stopped(){request.abort();revision++;vehicles?.setEnabled(false);status.textContent='';state='idle';}
 async function refresh(){
  if(!active()){stopped();return;}
  request.abort();const own=request=new AbortController(),ticket=++revision,signal=own.signal;
  const current=()=>{signal.throwIfAborted();if(ticket!==revision||!active())throw new DOMException('Aborted','AbortError');};
  try{
   state='loading';status.textContent=c.loading;
   if(!vehicles){const module=await import('./animated-vehicles');current();const created=module.createAnimatedVehicles(map,city,{mobile:options.mobile,reducedMotion:reduce});try{map.addLayer(created.layer as any,options.buildingLayer());vehicles=created;}catch(error){try{if(map.getLayer(created.layer.id))map.removeLayer(created.layer.id);}finally{created.destroy();}throw error;}}
   if(!data){const raw=await options.read('/safety/buildings3d/scenery-index.json',signal,64*1024) as SceneIndex;current();if(!raw||raw.schema_version!==1||raw.city!==city||raw.role!=='decorative-schematic'||raw.partial!==true||typeof raw.snapshot!=='string'||raw.snapshot.length>128||!/^[a-f0-9]{64}$/.test(raw.source_pbf_sha256)||!valid(raw.data))throw Error('Invalid scenery index');
    const parser=await import('./vehicle-scenery-data');current();const parsed=parser.parseVehicleScenery(await options.read(raw.data,signal,1024**2),city);current();if(parsed.source_snapshot!==raw.snapshot||parsed.source_pbf_sha256!==raw.source_pbf_sha256)throw Error('Scenery source binding mismatch');data=parsed;sourceBytes=raw.data.bytes;
   }
   current();vehicles.setRoads(data,bounds());vehicles.setVisible(visible);vehicles.setReducedMotion(reduce);vehicles.setEnabled(true);state='ready';status.textContent=vehicles.stats.allocatedVehicles?c.ready+' '+data.source_snapshot:c.none;
  }catch{if(!signal.aborted&&!destroyed&&ticket===revision){vehicles?.setEnabled(false);state='error';status.textContent=c.failed;}}
 }
 const moved=()=>{void refresh();};map.on('moveend',moved);
 return {
  setMode(value:boolean){if(mode===value)return;mode=value;void refresh();},
  setRequested(value:boolean){requested=value;void refresh();},
  setVisible(value:boolean){visible=value;vehicles?.setVisible(value);void refresh();},
  setReducedMotion(value:boolean){reduce=value;vehicles?.setReducedMotion(value);void refresh();},
  suspend(){suspended=true;stopped();},resume(){suspended=false;void refresh();},
  get customLayer(){return vehicles?.layer;},
  get stats(){return{positionSamples:vehicles?.positionSamples.map(p=>({...p,screen:(()=>{const q=map.project(p.lngLat as [number,number]);const r=map.getCanvas().getBoundingClientRect();return[r.left+q.x,r.top+q.y];})()})),state,sourceBytes,sourceRoads:data?.roads.length??0,sourcePositions:data?.roads.reduce((n,r)=>n+r.coordinates.length,0)??0,sourceSnapshot:data?.source_snapshot,role:'decorative-schematic',vehicles:vehicles?.stats};},
  destroy(){if(destroyed)return;destroyed=true;stopped();map.off('moveend',moved);if(vehicles){if(map.getLayer(vehicles.layer.id))map.removeLayer(vehicles.layer.id);vehicles.destroy();}data=undefined;status.remove();}
 };
}
