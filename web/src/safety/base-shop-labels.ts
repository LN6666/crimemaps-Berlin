import {createShopQueryDiagnostics} from './query-diagnostics.ts';
import type {Map as LibreMap, GeoJSONSource} from 'maplibre-gl';
import type {Feature, FeatureCollection, Point, Geometry, Position} from 'geojson';
import {VECTOR_SOURCE} from './vector-basemap';

export const SHOP_LABEL_LAYER='base-shop-labels';
const SOURCE='base-shop-label-source';
const RECORD_LAYER='base-shop-records';
const STORAGE='crimemaps.base-shop-labels.v1';
export const SHOP_DENSITY=[
 {minzoom:17.5,spacing:220,limit:60},{minzoom:17,spacing:180,limit:100},
 {minzoom:16.5,spacing:145,limit:160},{minzoom:16,spacing:112,limit:240},
 {minzoom:15.5,spacing:86,limit:360},{minzoom:14,spacing:64,limit:600},
] as const;
const inactiveShopTypes=new Set(['no','vacant','disused','abandoned']);
const foodTypes=new Set(['restaurant','fast_food','pub','bar','cafe','food_court','biergarten','pharmacy']);
export function baseShopKind(p:Record<string,unknown>):string|null {
 if(typeof p.shop==='string'&&p.shop.trim()&&!inactiveShopTypes.has(p.shop))return `shop:${p.shop}`;
 if(typeof p.amenity==='string'&&foodTypes.has(p.amenity))return `amenity:${p.amenity}`;
 return null;
}
export function baseShopName(p:Record<string,unknown>,locale:string):string|null {
 for(const key of [`name:${locale}`,`name_${locale}`,'name'])if(typeof p[key]==='string'&&p[key].trim())return p[key].trim().slice(0,160);
 return null;
}

export function sourceShopPoints(geometry:Geometry):Position[] {
 const coordinates=geometry.type==='Point'?[geometry.coordinates]:geometry.type==='MultiPoint'?geometry.coordinates:[];
 return coordinates.filter(p=>p.length>=2&&p.length<=3&&p.every(Number.isFinite)&&p[1]>=-90&&p[1]<=90);
}
export type LabelCandidate={feature:Feature<Point>;x:number;y:number;name:string;key:string};
export type ScreenBox={left:number;top:number;right:number;bottom:number};
export function labelBox(c:LabelCandidate):ScreenBox {
 // 11px font, at most 24 Unicode characters, 2em wrap / conservative line envelope.
 const chars=Math.min(24,[...c.name].length);const width=Math.min(180,Math.max(30,chars*11))+12;
 const rows=Math.min(3,Math.max(1,Math.ceil(chars*11/168)));
 return {left:c.x-width/2,right:c.x+width/2,top:c.y-7,bottom:c.y+12+rows*14};
}
export function overlaps(a:ScreenBox,b:ScreenBox){return a.left<=b.right&&a.right>=b.left&&a.top<=b.bottom&&a.bottom>=b.top;}
class BoxIndex {
 cells=new Map<string,ScreenBox[]>();
 keys(b:ScreenBox){const keys:string[]=[];for(let x=Math.floor(b.left/64);x<=Math.floor(b.right/64);x++)for(let y=Math.floor(b.top/64);y<=Math.floor(b.bottom/64);y++)keys.push(`${x},${y}`);return keys;}
 add(b:ScreenBox){for(const k of this.keys(b)){const v=this.cells.get(k)??[];v.push(b);this.cells.set(k,v);}}
 hit(b:ScreenBox){return this.keys(b).some(k=>(this.cells.get(k)??[]).some(a=>overlaps(a,b)));}
}
export function selectShopLabels(candidates:LabelCandidate[],blockers:ScreenBox[],density:number):Feature<Point>[] {
 const preset=SHOP_DENSITY[Math.max(0,Math.min(5,Math.round(density)-1))];
 const boxes=new BoxIndex();for(const b of blockers)boxes.add(b);
 const out:Feature<Point>[]=[];const seen=new Set<string>();
 for(const c of [...candidates].sort((a,b)=>a.key.localeCompare(b.key))){
  if(seen.has(c.key))continue;seen.add(c.key);const b=labelBox(c);if(boxes.hit(b))continue;
  out.push(c.feature);boxes.add(b);boxes.add({left:c.x-preset.spacing/2,right:c.x+preset.spacing/2,top:c.y-preset.spacing/2,bottom:c.y+preset.spacing/2});
  if(out.length>=preset.limit)break;
 }
 return out;
}
const copy={
 zh:{toggle:'基础店铺名称',density:'店铺名称密度',note:'1 最少 · 6 最多；放大后显示已有 OSM 名称，避让现有 POI。',zoom:'继续放大可显示此档名称。',off:'已隐藏基础店铺名称。',unavailable:'当前底图不提供基础店铺名称。'},
 en:{toggle:'Base shop names',density:'Shop name density',note:'1 fewest · 6 most; zoom in for available OSM names. Existing POIs take priority.',zoom:'Zoom in to show names at this density.',off:'Base shop names are hidden.',unavailable:'Shop names are unavailable on this basemap.'},
 de:{toggle:'Geschäftsnamen der Grundkarte',density:'Dichte der Geschäftsnamen',note:'1 wenige · 6 viele; beim Vergrößern verfügbare OSM-Namen. Bestehende POIs haben Vorrang.',zoom:'Für diese Dichte weiter vergrößern.',off:'Geschäftsnamen sind ausgeblendet.',unavailable:'Diese Grundkarte bietet keine Geschäftsnamen.'},
};
export function installBaseShopLabels({map,host,locale,diagnostics=false}:{map:LibreMap;host:HTMLElement;locale:string;diagnostics?:boolean}) {
 const text=copy[locale as keyof typeof copy]??copy.en;
 let enabled=true,density=3,active=false,destroyed=false,moving=false,frame=0;
 let pois:FeatureCollection={type:'FeatureCollection',features:[]};
 try{const s=JSON.parse(localStorage.getItem(STORAGE)??'null');if(s&&typeof s.enabled==='boolean'&&Number.isInteger(s.density)&&s.density>=1&&s.density<=6){enabled=s.enabled;density=s.density;}}catch{/* storage unavailable */}
 const wrapper=document.createElement('div');wrapper.className='base-shop-label-controls';
 const sampleQueryDiagnostics=createShopQueryDiagnostics(map,wrapper,VECTOR_SOURCE,diagnostics);
 const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=enabled;label.append(toggle,document.createTextNode(text.toggle));
 const densityLabel=document.createElement('label'),slider=document.createElement('input'),output=document.createElement('output');
 slider.type='range';slider.min='1';slider.max='6';slider.step='1';slider.value=String(density);slider.setAttribute('aria-label',text.density);output.textContent=String(density);
 densityLabel.append(document.createTextNode(text.density+' '),slider,output);
 const note=document.createElement('p');note.textContent=text.note;const status=document.createElement('p');status.setAttribute('role','status');
 wrapper.append(label,densityLabel,note,status);host.append(wrapper);
 const empty=():FeatureCollection=>({type:'FeatureCollection',features:[]});
 function clear(){const s=map.getSource(SOURCE) as GeoJSONSource|undefined;s?.setData(empty());wrapper.setAttribute('data-shop-label-selected','0');}
 function ensureRecords(){
  // MapLibre 6 overzoom re-encodes only source layers registered in the style.
  // Keep pois registered even with labels hidden so building clicks use real loaded points.
  // This transparent circle does not draw names, participate in label collision, or fetch another source.
  if(active&&map.getSource(VECTOR_SOURCE)&&!map.getLayer(RECORD_LAYER))map.addLayer({id:RECORD_LAYER,type:'circle',source:VECTOR_SOURCE,'source-layer':'pois',minzoom:14,paint:{'circle-radius':0,'circle-opacity':0,'circle-stroke-width':0}});
 }
 function removeRecords(){if(map.getLayer(RECORD_LAYER))map.removeLayer(RECORD_LAYER);}
 function ensure(){if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:empty()});if(!map.getLayer(SHOP_LABEL_LAYER))map.addLayer({id:SHOP_LABEL_LAYER,type:'symbol',source:SOURCE,layout:{'text-field':['get','display_name'],'text-font':['Noto Sans Regular'],'text-size':11,'text-max-width':15,'text-anchor':'top','text-offset':[0,0.9],'text-allow-overlap':false,'text-ignore-placement':false,'symbol-sort-key':10},paint:{'text-color':'#59656a','text-halo-color':'#ffffff','text-halo-width':1}},map.getLayer('poi-association-label')?'poi-association-label':undefined);}
 function render(){
  frame=0;if(destroyed)return;slider.disabled=!enabled;wrapper.setAttribute('data-shop-label-zoom',String(map.getZoom()));wrapper.setAttribute('data-shop-label-density',String(density));
  if(!active||!map.getSource(VECTOR_SOURCE)){clear();wrapper.setAttribute('data-shop-label-state','unavailable');status.textContent=text.unavailable;return;}
  ensure();if(!enabled||moving){clear();wrapper.setAttribute('data-shop-label-state',moving?'moving':'off');status.textContent=enabled?'':text.off;return;}
  if(map.getZoom()<SHOP_DENSITY[density-1].minzoom){clear();wrapper.setAttribute('data-shop-label-state','zoom');status.textContent=text.zoom;return;}
  const canvas=map.getCanvas(),width=canvas.clientWidth,height=canvas.clientHeight;
  const blockers:ScreenBox[]=[];
  for(const f of pois.features){if(f.geometry.type!=='Point')continue;const p=map.project(f.geometry.coordinates as [number,number]);if(p.x< -200||p.y< -200||p.x>width+200||p.y>height+200)continue;const roman=String(f.properties?.association_roman??'');const w=Math.max(16,roman.length*7/2+8);blockers.push({left:p.x-w,right:p.x+w,top:p.y-14,bottom:p.y+(roman?36:14)});}
  const raw=getLoadedShopRecords();
  const candidates:LabelCandidate[]=[];
  for(const f of raw){if(f.geometry.type!=='Point')continue;const kind=baseShopKind(f.properties??{}),name=baseShopName(f.properties??{},locale);if(!kind||!name)continue;const xy=map.project(f.geometry.coordinates as [number,number]);if(xy.x<10||xy.y<10||xy.x>width-10||xy.y>height-10)continue;
   const coordinates=f.geometry.coordinates;const key=`${kind}|${coordinates.join(',')}|${name}`;
   const feature:Feature<Point>={type:'Feature',geometry:f.geometry,properties:{...f.properties,display_name:[...name].length>24?[...name].slice(0,23).join('')+'…':name,base_shop_kind:kind,base_shop_label:true,source_origin:'OSM Shortbread pois; label point, not building footprint'}};
   candidates.push({feature,x:xy.x,y:xy.y,name,key});
  }
  const selected=selectShopLabels(candidates,blockers,density);(map.getSource(SOURCE) as GeoJSONSource).setData({type:'FeatureCollection',features:selected});wrapper.setAttribute('data-shop-label-selected',String(selected.length));wrapper.setAttribute('data-shop-label-blockers',String(blockers.length));wrapper.setAttribute('data-shop-label-state','rendered');status.textContent='';
 }
 function getLoadedShopRecords():readonly Feature<Point>[] {
  if(destroyed||!active||!map.getSource(VECTOR_SOURCE))return [];
  ensureRecords();
  let raw:ReturnType<LibreMap['querySourceFeatures']>;try{raw=map.querySourceFeatures(VECTOR_SOURCE,{sourceLayer:'pois'});}catch{wrapper.setAttribute('data-shop-label-query-state','error');return [];}
  wrapper.setAttribute('data-shop-label-query-state','ok');wrapper.setAttribute('data-shop-label-queried',String(raw.length));if(raw.length===0)sampleQueryDiagnostics();
  const canvas=map.getCanvas(),seen=new Set<string>(),out:Feature<Point>[]=[],types:Record<string,number>={};let eligible=0;
  for(const f of raw.slice(0,12000)){
   types[f.geometry.type]=(types[f.geometry.type]??0)+1;
   const p=f.properties??{},kind=baseShopKind(p),name=baseShopName(p,locale);if(!kind)continue;
   for(const coordinates of sourceShopPoints(f.geometry)){
    eligible++;
    const xy=map.project(coordinates as [number,number]);if(xy.x<0||xy.y<0||xy.x>canvas.clientWidth||xy.y>canvas.clientHeight)continue;
    // Shortbread supplies no documented OSM object ID: this is a loaded tile record key,
    // never an OSM identifier, tenant claim, or inferred building association.
    // Nameless records remain available to the building chooser; no tenant/name is invented.
    // Without a reliable object ID or name, coincident records cannot safely be merged.
    const key=`${kind}|${coordinates.join(',')}|${name??''}`;if(name&&seen.has(key))continue;if(name)seen.add(key);
    out.push({type:'Feature',geometry:{type:'Point',coordinates:[...coordinates]},properties:{...p,base_shop_record_key:key,base_shop_kind:kind,base_shop_label:true,source_origin:'OSM Shortbread pois; label point, not building footprint'}});
   }
  }
  wrapper.setAttribute('data-shop-label-geometry-types',JSON.stringify(types));wrapper.setAttribute('data-shop-label-eligible',String(eligible));wrapper.setAttribute('data-shop-label-visible-records',String(out.length));wrapper.setAttribute('data-shop-label-scan-limited',String(raw.length>12000));
  return out;
 }
 function schedule(){if(!frame&&!destroyed)frame=requestAnimationFrame(render);}
 function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({enabled,density}));}catch{}schedule();}
 toggle.addEventListener('change',()=>{enabled=toggle.checked;persist();});slider.addEventListener('input',()=>{density=Number(slider.value);output.textContent=String(density);persist();});
 const start=()=>{moving=true;clear();},end=()=>{moving=false;schedule();};
 const source=(event:{sourceId?:string})=>{if(event.sourceId===VECTOR_SOURCE)schedule();};
 map.on('movestart',start);map.on('moveend',end);map.on('resize',schedule);map.on('sourcedata',source);schedule();
 return {getLoadedShopRecords,updateExistingPois(value:FeatureCollection){pois=value;schedule();},setBasemapActive(value:boolean){active=value;if(active)ensureRecords();else{clear();removeRecords();}schedule();},refresh:schedule,destroy(){destroyed=true;if(frame)cancelAnimationFrame(frame);map.off('movestart',start);map.off('moveend',end);map.off('resize',schedule);map.off('sourcedata',source);wrapper.remove();removeRecords();if(map.getLayer(SHOP_LABEL_LAYER))map.removeLayer(SHOP_LABEL_LAYER);if(map.getSource(SOURCE))map.removeSource(SOURCE);}};
}
