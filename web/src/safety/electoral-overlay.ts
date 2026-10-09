import type {Map as MapView,GeoJSONSource} from 'maplibre-gl';
import {electoralControls} from './electoral-controls';
import {parseElectoralCatalog,parseElectoralDataset,electionWinner,canRenderElection,type ElectionEntry,type ElectoralCatalog,type ElectoralDataset} from './electoral-data';
import {containsPosition} from './geography-position';
type Locale='zh'|'en'|'de';
export type ElectionPalette=Record<string,{color:string;logo?:string}>;
const empty=()=>({type:'FeatureCollection' as const,features:[] as any[]});
const COPY={zh:{unavailable:'该场次的结果与边界尚未完成核验，暂不能显示。',source:'来源',scope:'统计范围',tie:'并列；无单一获胜党',unknown:'结果或党色尚未核验',votes:'票',notSpatial:'无可定位边界的记录不画在地图上。灰色表示党色尚未核验，并非无选举结果。'},en:{unavailable:'Results and boundaries for this election are not yet verified for display.',source:'Source',scope:'Statistical scope',tie:'Tie; no single winning party',unknown:'Result or party colour not verified',votes:'votes',notSpatial:'Records without a verified spatial boundary are not mapped. Grey means an unverified party colour, not missing election results.'},de:{unavailable:'Ergebnisse und Grenzen dieser Wahl sind noch nicht zur Darstellung geprüft.',source:'Quelle',scope:'Statistischer Bezugsraum',tie:'Gleichstand; keine einzelne stärkste Partei',unknown:'Ergebnis oder Parteifarbe noch nicht geprüft',votes:'Stimmen',notSpatial:'Datensätze ohne geprüfte räumliche Grenze werden nicht kartiert. Grau bedeutet ungeprüfte Parteifarbe, nicht fehlendes Wahlergebnis.'}};
/** Original unit IDs and polygons only; grid is a clipped texture, never a result cell. */
function installSingleElectoralOverlay(options:{map:MapView;host:HTMLElement;city:string;locale:Locale;fetchJSON:(path:string,signal:AbortSignal)=>Promise<unknown>;fetchVerifiedJSON:(path:string,hash:string,signal:AbortSignal)=>Promise<unknown>;assetURL:(path:string)=>string;palette:ElectionPalette},namespace:string,onStatus:(text:string)=>void,boundaryOnly=false,onFailure?:()=>void){
 const {map,city,locale}=options,c=COPY[locale];let catalog:ElectoralCatalog|undefined,current:ElectionEntry|undefined,data:ElectoralDataset|undefined,geometry:any,enabled=false,revision=0,request:AbortController|undefined,destroyed=false;
 const addedPartyImages=new Set<string>();
 const qaEnabled=['127.0.0.1','localhost','[::1]'].includes(location.hostname)&&new URLSearchParams(location.search).get('qaElection')==='1';
 const qa=qaEnabled?document.createElement('output'):undefined;let qaAreaCount=0;
 if(qa){qa.hidden=true;qa.setAttribute('data-election-qa',namespace);options.host.append(qa);}
 const ids=[(namespace+'electoral-fill'),(namespace+'electoral-grid'),(namespace+'electoral-boundary'),(namespace+'electoral-logo')],visibleIds=boundaryOnly?[ids[2]]:ids;
 const controls={status:onStatus,loading:()=>onStatus(({zh:'正在加载选举图层…',en:'Loading election layer…',de:'Wahlebene wird geladen…'})[locale]),failed:()=>{onStatus(({zh:'选举图层加载失败；关闭后重新开启可重试。',en:'Election layer could not be loaded. Turn it off and on to retry.',de:'Wahlebene konnte nicht geladen werden. Zum Wiederholen aus- und einschalten.'})[locale]);onFailure?.();},setChoices:(_values:unknown[])=>{},destroy:()=>{}};
 const inspect=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');summary.textContent=c.scope;inspect.append(summary,body);options.host.append(inspect);
 const before=['roads-line','community-line'].find(id=>map.getLayer(id));
 map.addSource((namespace+'electoral-areas'),{type:'geojson',data:empty()});map.addSource((namespace+'electoral-centres'),{type:'geojson',data:empty()});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d')!;ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(16,0);ctx.moveTo(0,0);ctx.lineTo(0,16);ctx.stroke();if(!boundaryOnly)map.addImage((namespace+'electoral-grid-texture'),ctx.getImageData(0,0,16,16));
 if(!boundaryOnly)map.addLayer({id:ids[0],type:'fill',source:(namespace+'electoral-areas'),layout:{visibility:'none'},paint:{'fill-color':['get','electoral_color'],'fill-opacity':.28}},before);
 if(!boundaryOnly)map.addLayer({id:ids[1],type:'fill',source:(namespace+'electoral-areas'),layout:{visibility:'none'},paint:{'fill-pattern':(namespace+'electoral-grid-texture'),'fill-opacity':.6}},before);
 map.addLayer({id:ids[2],type:'line',source:(namespace+'electoral-areas'),layout:{visibility:'none'},paint:{'line-color':['get','electoral_color'],'line-width':1.25}},before);
 if(!boundaryOnly)map.addLayer({id:ids[3],type:'symbol',source:(namespace+'electoral-centres'),layout:{visibility:'none','icon-image':['get','electoral_icon'],'icon-size':.25,'icon-allow-overlap':false,'icon-ignore-placement':false}},before);
 const clear=()=>{qaAreaCount=0;for(const source of [(namespace+'electoral-areas'),(namespace+'electoral-centres')])(map.getSource(source)as GeoJSONSource).setData(empty());body.replaceChildren();updateQa();};
 const visible=(value:boolean)=>{visibleIds.forEach(id=>map.setLayoutProperty(id,'visibility',value?'visible':'none'));updateQa();};
 function updateQa(){if(!qa||destroyed)return;const logoLayer=!boundaryOnly&&map.getLayer(ids[3]);const logoVisible=logoLayer&&map.getLayoutProperty(ids[3],'visibility')==='visible';const logoCount=logoVisible?map.queryRenderedFeatures(undefined,{layers:[ids[3]]}).length:0;qa.setAttribute('data-election-id',current?.id??'');qa.value=JSON.stringify({id:current?.id??'',boundaryOnly,visibleLayers:visibleIds.filter(id=>map.getLayoutProperty(id,'visibility')==='visible'),areaFeatures:qaAreaCount,renderedLogos:logoCount,partyImages:addedPartyImages.size});}
 function render(){if(!enabled||!geometry||!data||!current||destroyed)return;
  const bounds=map.getBounds(),rows=new Map(data.units.map(u=>[u.id,u])),areas=empty(),centres=empty();
  for(const f of geometry.features){const unit=rows.get(String(f.properties.id));if(!unit?.spatial)continue;const b=f.properties.electoral_bbox;if(b[2]<bounds.getWest()||b[0]>bounds.getEast()||b[3]<bounds.getSouth()||b[1]>bounds.getNorth())continue;
   const winner=electionWinner(unit),party=winner.party_id&&options.palette[winner.party_id],color=party&&/^#[0-9a-f]{6}$/i.test(party.color)?party.color:'#7b8792',icon=winner.party_id&&map.hasImage((namespace+'electoral-party-')+winner.party_id)?(namespace+'electoral-party-')+winner.party_id:'';
   const properties={...f.properties,electoral_color:color,electoral_icon:icon};areas.features.push({...f,properties});
   const point=f.properties.label_point;if(icon&&Array.isArray(point)&&containsPosition(f.geometry,point))centres.features.push({type:'Feature',geometry:{type:'Point',coordinates:point},properties});
  }(map.getSource((namespace+'electoral-areas'))as GeoJSONSource).setData(areas);(map.getSource((namespace+'electoral-centres'))as GeoJSONSource).setData(centres);qaAreaCount=areas.features.length;visible(true);
 }
 async function loadLogos(signal:AbortSignal){
  for(const [id,party]of Object.entries(options.palette).slice(0,64)){if(signal.aborted||destroyed)return;if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id)||!party.logo||!/^\/safety\/elections\/assets\/[a-z0-9_-]+\.(?:png|svg)$/.test(party.logo)||map.hasImage((namespace+'electoral-party-')+id))continue;
   try{const original=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();const aborted=()=>{image.src='';reject(new DOMException('Aborted','AbortError'));};signal.addEventListener('abort',aborted,{once:true});image.onload=()=>{signal.removeEventListener('abort',aborted);resolve(image);};image.onerror=()=>{signal.removeEventListener('abort',aborted);reject(Error('Election logo unavailable'));};image.src=options.assetURL(party.logo!);});if(signal.aborted||destroyed)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d')!;const width=original.width,height=original.height,scale=Math.min(32/width,32/height);ctx.drawImage(original as CanvasImageSource,(32-width*scale)/2,(32-height*scale)/2,width*scale,height*scale);map.addImage((namespace+'electoral-party-')+id,ctx.getImageData(0,0,32,32));addedPartyImages.add((namespace+'electoral-party-')+id);}catch{/* Keep visible party name in details; no invented logo. */}
  }
 }
 async function select(id:string){const ticket=++revision;request?.abort();request=new AbortController();const signal=request.signal;visible(false);clear();geometry=data=undefined;current=catalog?.elections.find(e=>e.id===id);if(!enabled||!current)return;if(!canRenderElection(current)){controls.status(c.unavailable);return;}controls.loading();
  try{const entry=current;const raw=await options.fetchVerifiedJSON(entry.geometry!.path,entry.geometry!.sha256,signal)as any;if(signal.aborted||ticket!==revision)return;
   if(raw?.type!=='FeatureCollection'||raw.city!==city||raw.election_id!==entry.id||!Array.isArray(raw.features)||raw.features.length>2048)throw Error('Invalid electoral geometry');
   const seen=new Set<string>();let positions=0;
   for(const f of raw.features){if(typeof f?.properties?.id!=='string'||seen.has(f.properties.id)||!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw Error('Invalid unit');seen.add(f.properties.id);
    let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;const scan=(v:any):void=>{if(!Array.isArray(v))throw Error('Invalid geometry');if(typeof v[0]==='number'){if(++positions>1000000||v.length<2||!Number.isFinite(v[0])||!Number.isFinite(v[1])||Math.abs(v[0])>180||Math.abs(v[1])>90)throw Error('Invalid position');west=Math.min(west,v[0]);east=Math.max(east,v[0]);south=Math.min(south,v[1]);north=Math.max(north,v[1]);}else v.forEach(scan);};scan(f.geometry.coordinates);f.properties.electoral_bbox=[west,south,east,north];
   }const result=parseElectoralDataset(await options.fetchVerifiedJSON(entry.results!.path,entry.results!.sha256,signal),entry,city);if(signal.aborted||ticket!==revision)return;
   const spatialIds=new Set(result.units.filter(u=>u.spatial).map(u=>u.id));if(spatialIds.size!==seen.size||[...seen].some(id=>!spatialIds.has(id)))throw Error('Election geometry/result identities differ');
   geometry=raw;data=result;if(!boundaryOnly)await loadLogos(signal);if(signal.aborted||ticket!==revision)return;controls.status(entry.labels[locale]+' · '+entry.coverage[locale]+' '+c.notSpatial);render();
  }catch{if(!signal.aborted&&ticket===revision)controls.failed();}
 }
 function clicked(event:any){if(!enabled||!data||!current)return;const id=String(event.features?.[0]?.properties?.id??''),unit=data.units.find(u=>u.id===id);if(!unit)return;body.replaceChildren();const title=document.createElement('h4');title.textContent=current.labels[locale]+' · '+String(geometry?.features.find((f:any)=>f.properties.id===id)?.properties.name??id);body.append(title);const note=document.createElement('p');note.textContent=current.coverage[locale];body.append(note);
  const winner=electionWinner(unit),result=document.createElement('p');result.textContent=winner.party_id?unit.parties.find(p=>p.party_id===winner.party_id)?.label??winner.party_id:winner.tied_party_ids.length?c.tie:c.unknown;body.append(result);
  for(const p of unit.parties){const row=document.createElement('p');const share=p.share??(p.count!==undefined&&unit.valid_votes!==undefined&&unit.valid_votes>0?p.count/unit.valid_votes*100:undefined);row.textContent=p.label+': '+(p.count===undefined?'':new Intl.NumberFormat(locale).format(p.count)+' '+c.votes)+(share===undefined?'':' · '+new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(share)+' %');body.append(row);}for(const s of current.sources){const a=document.createElement('a');a.textContent=c.source+': '+s.name;a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}inspect.open=true;
 }
 map.on('idle',updateQa);map.on('moveend',render);map.on('click',boundaryOnly?ids[2]:ids[0],clicked);
 return {activate(id:string){enabled=true;return select(id);},async load(){request?.abort();request=new AbortController();try{catalog=parseElectoralCatalog(await options.fetchJSON('/safety/elections/index.json',request.signal),city);if(!destroyed)controls.setChoices(catalog.elections.map(e=>({id:e.id,type:e.type,year:e.year,label:e.labels})));}catch{if(!destroyed)controls.setChoices([]);}},suspend(){request?.abort();},resume(){if(enabled&&current&&!data)void select(current.id);else render();},destroy(){destroyed=true;request?.abort();map.off('idle',updateQa);qa?.remove();map.off('moveend',render);map.off('click',boundaryOnly?ids[2]:ids[0],clicked);controls.destroy();inspect.remove();for(const id of [...ids].reverse())if(map.getLayer(id))map.removeLayer(id);for(const source of [(namespace+'electoral-areas'),(namespace+'electoral-centres')])if(map.getSource(source))map.removeSource(source);if(map.hasImage((namespace+'electoral-grid-texture')))map.removeImage((namespace+'electoral-grid-texture'));for(const id of addedPartyImages)if(map.hasImage(id))map.removeImage(id);addedPartyImages.clear();}};
}

/** Independent elections retain their own source, boundary, request and inspection. */
export function installElectoralOverlay(options:Parameters<typeof installSingleElectoralOverlay>[0]){
 let catalog:ElectoralCatalog|undefined,destroyed=false,suspended=false,generation=0;
 let request=new AbortController();
 const active=new Map<string,ReturnType<typeof installSingleElectoralOverlay>>();let primaryId='';
 let selected:string[]=[];
 const statuses=new Map<string,string>();
 const controls=electoralControls(options.host,options.locale,(enabled,id,overlays)=>{
  selected=enabled?[id,...overlays].filter(Boolean):[];
  sync();
 },()=>{void loadCatalog();for(const [id,overlay]of active)void overlay.activate(id);});
 function sync(){
  if(destroyed||suspended||!catalog)return;
  if(primaryId!==selected[0]){for(const overlay of active.values())overlay.destroy();active.clear();statuses.clear();primaryId=selected[0]??'';}const ids=new Set(selected);
  for(const [id,overlay]of active)if(!ids.has(id)){overlay.destroy();active.delete(id);statuses.delete(id);}
  for(const id of selected){
   if(active.has(id)||!catalog.elections.some(e=>e.id===id))continue;
   const entry=catalog.elections.find(e=>e.id===id)!;
   const overlay=installSingleElectoralOverlay({...options,fetchJSON:(path,signal)=>path==='/safety/elections/index.json'?Promise.resolve(catalog):options.fetchJSON(path,signal)},'election-'+entry.id+'-',text=>{
    if(destroyed)return;statuses.set(id,text);controls.status(selected.map(key=>statuses.get(key)).filter(Boolean).join(' · '));
   },id!==primaryId,()=>controls.failed());
   active.set(id,overlay);
   void overlay.load().then(()=>{if(!destroyed&&!suspended&&active.get(id)===overlay)return overlay.activate(id);});
  }
  if(!selected.length)controls.status('');
 }
 async function loadCatalog(){controls.loading();const ticket=++generation;request.abort();request=new AbortController();try{
   const value=parseElectoralCatalog(await options.fetchJSON('/safety/elections/index.json',request.signal),options.city);
   if(destroyed||request.signal.aborted||ticket!==generation)return;catalog=value;controls.setChoices(value.elections.map(e=>({id:e.id,type:e.type,year:e.year,label:e.labels})));sync();
  }catch{if(!destroyed&&!request.signal.aborted&&ticket===generation)controls.failed();}}
 return {load:loadCatalog,
  suspend(){if(destroyed)return;suspended=true;request.abort();for(const overlay of active.values())overlay.suspend();},
  resume(){if(destroyed)return;suspended=false;for(const overlay of active.values())overlay.resume();if(catalog)sync();else void loadCatalog();},
  destroy(){if(destroyed)return;destroyed=true;generation++;request.abort();for(const overlay of active.values())overlay.destroy();active.clear();statuses.clear();controls.destroy();}
 };
}
