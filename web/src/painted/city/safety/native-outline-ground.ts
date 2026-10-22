import type {Map,GeoJSONSource} from 'maplibre-gl';
import type {BuildingComponent} from './building-mesh-renderer';
import {nativeOutlineGroundFeatures,type NativeGroupDisplayPlan,type NativeGroupDisplayState} from './native-part-display';
const EMPTY:NativeGroupDisplayPlan={hiddenOutlines:[],groups:[],errors:[]};
const COPY={en:{outline:'Original building outline information',partial:'Native building parts are shown. This is an incomplete display.',missing:'Parts without an independently assigned model',resident:'Loaded native parts / declared parts',viewport:'Compiled parts not loaded in the current view',unknown:'Source lookup not verified',ownership:'The converter may combine surfaces from several parts; individual surface ownership is not verified.'},de:{outline:'Informationen zum ursprünglichen Gebäudegrundriss',partial:'Native Gebäudeteile werden angezeigt. Die Darstellung ist unvollständig.',missing:'Teile ohne eigenständig zugeordnetes Modell',resident:'Geladene native Teile / deklarierte Teile',viewport:'Kompilierte Teile in der aktuellen Ansicht noch nicht geladen',unknown:'Quellennachweis nicht bestätigt',ownership:'Der Konverter kann Flächen mehrerer Teile zusammenfassen; die Zuordnung einzelner Flächen ist nicht bestätigt.'},zh:{outline:'原建筑轮廓信息',partial:'显示已有原生建筑部件，当前展示不完整。',missing:'尚无独立归属模型的部件',resident:'已载入原生部件／声明部件',viewport:'当前视野尚未载入的已编译部件',unknown:'来源查找尚未核验',ownership:'转换器可能合并多个部件的表面，单个表面归属尚未核验。'}};
export function appendNativeGroupNotice(panel:HTMLElement,g:NativeGroupDisplayState,locale:'en'|'de'|'zh',inspectOutline?:()=>void){
 const c=COPY[locale],note=document.createElement('section');note.dataset.nativeGroup=String(g.relationId);
 const line=(text:string)=>{const p=document.createElement('p');p.textContent=text;note.append(p);};
 line(c.partial);line(`${c.resident}: ${g.residentPartCount} / ${g.declaredPartCount}`);
 for(const [label,ids]of [[c.missing,g.missingPartIds],[c.viewport,g.viewportMissingPartIds],[c.unknown,g.unknownPartIds]] as const)if(ids.length)line(label+': '+ids.join(', '));
 if(g.ownershipUnverifiedPartIds.length)line(c.ownership);
 if(inspectOutline){const button=document.createElement('button');button.type='button';button.textContent=c.outline;button.dataset.nativeOutlineAccess=String(g.relationId);button.style.minHeight='44px';button.onclick=()=>{if(note.isConnected)inspectOutline();};note.append(button);}
 panel.append(note);return note;
}
/** Ground-outline only. Inspect after visible annotations, actual surface pick, and route/election
 * chooser. Never creates a synthetic SurfaceHit or changes any source identity or source tags. */
export function installNativeOutlineGround(options:{map:Map;locale:'en'|'de'|'zh';inspect:(feature:unknown,outline:BuildingComponent)=>{panel:HTMLElement};onSelect?:(g:NativeGroupDisplayState)=>void;canInspect?:()=>boolean}){
 const {map}=options,source='native-group-outlines',layer=source+'-line',hitLayer=source+'-hit';let plan=EMPTY,destroyed=false,dirty=false,syncing=false,lastError:string|undefined;
 function sync(){
  if(destroyed||!dirty||syncing)return;
  const style=map.getStyle();if(!style||!Array.isArray(style.layers)||!style.sources)return;
  syncing=true;
  try{
   // isStyleLoaded also waits for vector tile caches: it is not structural readiness.
   if(!map.getSource(source))map.addSource(source,{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   const before=style.layers.find(l=>l.type==='symbol')?.id;
   if(!map.getLayer(hitLayer))map.addLayer({id:hitLayer,type:'fill',source,paint:{'fill-opacity':0}},before);
   if(!map.getLayer(layer))map.addLayer({id:layer,type:'line',source,paint:{'line-color':'#737c86','line-width':1.3,'line-opacity':.7}},before);
   (map.getSource(source)as GeoJSONSource).setData(nativeOutlineGroundFeatures(plan)as any);
   dirty=false;lastError=undefined;
  }catch(error){
   lastError=String(error);
   // Retry the documented structural style-loading race on style.load / idle only.
   // Other failures stay observable, without repeated idle work until a new update/style.
   dirty=/style.*(?:not.*load|load.*(?:progress|ready))/i.test(lastError);
  }finally{syncing=false;}
 }
 type BoundNotice={panel:HTMLElement;note:HTMLElement;relationId:number;objectId:string;partId:string;outlineAccess:boolean};
 const notices=new Set<BoundNotice>();
 function currentGroup(relationId:number,expected?:{objectId:string;partId:string}){
  if(destroyed||options.canInspect?.()===false)return undefined;
  return plan.groups.find(g=>g.relationId===relationId&&(!expected||(g.outline.objectId===expected.objectId&&g.outline.partId===expected.partId)));
 }
 function inspectGroup(relationId:number,expected?:{objectId:string;partId:string}){
  const g=currentGroup(relationId,expected);if(!g)return false;
  options.onSelect?.(g);
  const view=options.inspect({...g.outline.sourceFeature,geometry:g.outline.componentGeometry},g.outline);
  appendGroupNotice(view.panel,g,false);return true;
 }
 function appendGroupNotice(panel:HTMLElement,g:NativeGroupDisplayState,outlineAccess=true){
  for(const row of notices)if(!row.note.isConnected||row.panel===panel){if(row.panel===panel)row.note.remove();notices.delete(row);}
  const expected={objectId:g.outline.objectId,partId:g.outline.partId};
  const note=appendNativeGroupNotice(panel,g,options.locale,outlineAccess?()=>{inspectGroup(g.relationId,expected);}:undefined);
  notices.add({panel,note,relationId:g.relationId,...expected,outlineAccess});return note;
 }
 function refreshNotices(){
  for(const row of [...notices]){
   const g=plan.groups.find(g=>g.relationId===row.relationId&&g.outline.objectId===row.objectId&&g.outline.partId===row.partId);
   if(!row.note.isConnected||!g){row.note.remove();notices.delete(row);continue;}
   appendGroupNotice(row.panel,g,row.outlineAccess);
  }
 }
 const styleLoaded=()=>{dirty=true;sync();};
 map.on('style.load',styleLoaded);map.on('idle',sync);
 return {update(next:NativeGroupDisplayPlan){plan=next;dirty=true;sync();refreshNotices();},inspectGroup,appendGroupNotice,inspectAt(point:{x:number;y:number}){if(destroyed||!map.getLayer(layer))return false;const hit=map.queryRenderedFeatures([[point.x-4,point.y-4],[point.x+4,point.y+4]],{layers:[hitLayer,layer]})[0];if(!hit)return false;const g=plan.groups.find(g=>g.outline.partId===hit.properties?.partId);if(!g)return false;return inspectGroup(g.relationId,{objectId:g.outline.objectId,partId:g.outline.partId});},get state(){return plan;},get diagnostics(){return {dirty,lastError,destroyed};},destroy(){destroyed=true;dirty=false;for(const row of notices)row.note.remove();notices.clear();map.off('style.load',styleLoaded);map.off('idle',sync);if(map.getLayer(layer))map.removeLayer(layer);if(map.getLayer(hitLayer))map.removeLayer(hitLayer);if(map.getSource(source))map.removeSource(source);plan=EMPTY;}};
}
