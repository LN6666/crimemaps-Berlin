import {containsPosition} from './geography-position.ts';

type Locale='zh'|'en'|'de';
/** Original loaded point objects are returned unchanged to the caller. */
export type BuildingShopRecord={geometry:unknown;properties?:Record<string,unknown>|null;id?:unknown};
const services=new Set(['restaurant','fast_food','pub','bar','cafe','food_court','biergarten','pharmacy']);
const kinds=new Set(['shop','supermarket','convenience','bakery','butcher','clothes','hairdresser','beauty','books','florist','kiosk','mall','restaurant','fast_food','pub','bar','cafe','food_court','biergarten','pharmacy']);
const copy={
 zh:{title:'当前轮廓范围内已加载的 OSM 店铺点',note:'点位落在当前显示轮廓内，不是店铺与建筑租户关系的证明，也不代表全部店铺。',empty:'已加载数据没有匹配店铺记录。',unnamed:'未命名店铺点',boundary:'落在轮廓边界上的点未列入，归属尚不能确认。',more:(n:number)=>`另有 ${n} 个匹配点，本次最多列出 24 个。`},
 en:{title:'Loaded OSM shop points within this displayed outline',note:'Points fall within the displayed outline. This does not prove a tenant relationship or represent all shops.',empty:'No matching shop records in the loaded data.',unnamed:'Unnamed shop point',boundary:'Points on the outline boundary are excluded because their membership is uncertain.',more:(n:number)=>`${n} additional matching points; at most 24 are listed.`},
 de:{title:'Geladene OSM-Geschäftspunkte innerhalb dieses angezeigten Umrisses',note:'Die Punkte liegen innerhalb des angezeigten Umrisses. Das belegt kein Mietverhältnis und umfasst nicht alle Geschäfte.',empty:'Keine passenden Geschäftseinträge in den geladenen Daten.',unnamed:'Unbenannter Geschäftspunkt',boundary:'Punkte auf der Umrissgrenze sind ausgeschlossen, da ihre Zuordnung unklar ist.',more:(n:number)=>`${n} weitere passende Punkte; höchstens 24 werden angezeigt.`},
};
function meaningful(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
function shop(p:Record<string,unknown>){
 return (meaningful(p.shop)&&!['no','vacant','disused','abandoned'].includes(p.shop))
  ||(typeof p.amenity==='string'&&services.has(p.amenity))
  ||(typeof p.kind==='string'&&kinds.has(p.kind));
}
function point(record:BuildingShopRecord):number[]|undefined{
 const g=record.geometry as {type?:unknown;coordinates?:unknown}|undefined;
 if(g?.type!=='Point'||!Array.isArray(g.coordinates)||g.coordinates.length<2)return;
 const [x,y]=g.coordinates;if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>90)return;
 return [x,y];
}
function polygons(geometry:unknown):number[][][][]|undefined{
 const g=geometry as {type?:unknown;coordinates?:unknown}|undefined;
 const values=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:undefined;
 if(!Array.isArray(values)||!values.length)return;
 for(const p of values){if(!Array.isArray(p)||!p.length)return;for(const ring of p){if(!Array.isArray(ring)||ring.length<4)return;for(const c of ring){if(!Array.isArray(c)||typeof c[0]!=='number'||typeof c[1]!=='number'||!Number.isFinite(c[0])||!Number.isFinite(c[1]))return;}}}
 return values;
}
function onBoundary(polys:number[][][][],q:number[]){
 for(const polygon of polys)for(const ring of polygon)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i],cross=(q[0]-a[0])*(b[1]-a[1])-(q[1]-a[1])*(b[0]-a[0]);
  if(Math.abs(cross)<1e-12&&q[0]>=Math.min(a[0],b[0])&&q[0]<=Math.max(a[0],b[0])&&q[1]>=Math.min(a[1],b[1])&&q[1]<=Math.max(a[1],b[1]))return true;
 }return false;
}
function name(p:Record<string,unknown>,locale:Locale){for(const k of [`name:${locale}`,`name_${locale}`,'name'])if(meaningful(p[k]))return p[k] as string;return undefined;}
function reliableId(record:BuildingShopRecord,p:Record<string,unknown>){
 for(const candidate of [p.id,record.id])if(typeof candidate==='string'&&/^osm\/(node|way|relation)\/[1-9]\d*$/.test(candidate))return candidate;
 // Numeric tile feature IDs are not guaranteed to be OSM IDs.
 return undefined;
}
export function buildingShopMatches<T extends BuildingShopRecord>(geometry:unknown,records:readonly T[]){
 const polys=polygons(geometry);const matches:T[]=[];let boundaryCount=0;const seen=new Set<string>();
 if(!polys)return {matches,boundaryCount};
 for(const record of records){const p=record.properties??{},q=point(record);if(!q||!shop(p))continue;
  if(onBoundary(polys,q)){boundaryCount++;continue;}if(!containsPosition(geometry,q))continue;
  const id=reliableId(record,p);const rawName=meaningful(p.name)?p.name:undefined;
  // No coordinate rounding or unnamed co-location merging. Different explicit IDs stay distinct.
  const key=id?`id:${id}`:rawName?JSON.stringify([q[0],q[1],rawName]):undefined;
  if(key&&seen.has(key))continue;if(key)seen.add(key);matches.push(record);
 }return {matches,boundaryCount};
}
export function appendBuildingShopChoices<T extends BuildingShopRecord>(panel:HTMLElement,geometry:unknown,records:readonly T[],locale:Locale,onChoose:(record:T)=>void){
 const c=copy[locale]??copy.en,{matches,boundaryCount}=buildingShopMatches(geometry,records);
 const section=document.createElement('section');section.className='building-shop-choices';section.setAttribute('data-building-shop-matches',String(matches.length));
 const title=document.createElement('h4');title.textContent=c.title;const note=document.createElement('p');note.textContent=c.note;section.append(title,note);
 if(!matches.length){const empty=document.createElement('p');empty.textContent=c.empty;section.append(empty);}
 for(const record of matches.slice(0,24)){const button=document.createElement('button');button.type='button';button.textContent=name(record.properties??{},locale)??c.unnamed;button.addEventListener('click',()=>onChoose(record));section.append(button);}
 if(matches.length>24){const more=document.createElement('p');more.textContent=c.more(matches.length-24);section.append(more);}
 if(boundaryCount){const boundary=document.createElement('p');boundary.textContent=c.boundary;section.append(boundary);}
 panel.append(section);return {matches:matches.length,shown:Math.min(matches.length,24),boundaryCount};
}
