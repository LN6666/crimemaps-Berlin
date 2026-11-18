type PoiHit={
  readonly layer:{readonly id:string};
  readonly properties:Record<string,unknown>|null;
};
type PoiRecord={readonly properties:Record<string,unknown>|null;readonly geometry?:{readonly type:string}|null};

export type PoiHitChoice={id:string;name:string;centerHit:boolean};
export type PoiChoiceGeometry='point'|'line'|'area'|'unknown';

/** Distinguish same-named source objects without treating a display center as
 * their actual geometry. Identical geometry labels retain original IDs. */
export function poiHitChoiceLabels(choices:readonly PoiHitChoice[],pois:readonly PoiRecord[],describe:(geometry:PoiChoiceGeometry)=>string):Map<string,string>{
  const normalize=(name:string)=>name.normalize('NFC').trim().replace(/\s+/gu,' ');
  const groups=new Map<string,PoiHitChoice[]>();
  for(const choice of choices){const key=normalize(choice.name);groups.set(key,[...(groups.get(key)??[]),choice]);}
  if([...groups.values()].every(group=>group.length===1))return new Map(choices.map(choice=>[choice.id,choice.name]));
  const geometryById=new Map<string,PoiChoiceGeometry>();
  for(const poi of pois){
    const id=poi.properties?.id;
    if(typeof id!=='string'||geometryById.has(id))continue;
    const type=poi.geometry?.type;
    geometryById.set(id,type==='Point'||type==='MultiPoint'?'point':type==='LineString'||type==='MultiLineString'?'line':type==='Polygon'||type==='MultiPolygon'?'area':'unknown');
  }
  const labels=new Map<string,string>();
  for(const group of groups.values())for(const choice of group){
    if(group.length===1){labels.set(choice.id,choice.name);continue;}
    const kind=geometryById.get(choice.id)??'unknown';
    const sameKind=group.filter(other=>(geometryById.get(other.id)??'unknown')===kind).length>1;
    labels.set(choice.id,`${choice.name} — ${describe(kind)}${sameKind?` · ${choice.id}`:''}`);
  }
  return labels;
}

const poiLayers=new Set(['poi-center','poi-association-label','poi-fill','poi-line','poi-circle','poi-point']);
const centerLayers=new Set(['poi-center','poi-association-label']);

/** Keep every POI actually hit, even when another POI's center has priority.
 * Loaded source records supply names only; they never create another hit. */
export function collectPoiHitChoices(hits:readonly PoiHit[],pois:readonly PoiRecord[]):{
  choices:PoiHitChoice[];
  centerPrimary:PoiHitChoice|undefined;
}{
  const byId=new Map<string,PoiHitChoice>();
  for(const hit of hits){
    if(!poiLayers.has(hit.layer.id))continue;
    const id=hit.properties?.id;
    if(typeof id!=='string'||id.length===0)continue;
    const centerHit=centerLayers.has(hit.layer.id),previous=byId.get(id);
    if(previous){previous.centerHit||=centerHit;continue;}
    byId.set(id,{id,name:String(hit.properties?.name??id),centerHit});
  }
  const named=new Set<string>();
  for(const poi of pois){
    const id=poi.properties?.id;
    if(typeof id!=='string'||named.has(id))continue;
    const choice=byId.get(id);
    if(!choice)continue;
    if(poi.properties?.name!=null)choice.name=String(poi.properties.name);
    named.add(id);
  }
  const choices=[...byId.values()].sort((a,b)=>Number(b.centerHit)-Number(a.centerHit)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const centers=choices.filter(choice=>choice.centerHit);
  return{choices,centerPrimary:centers.length===1?centers[0]:undefined};
}
