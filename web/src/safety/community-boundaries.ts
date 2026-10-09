import type {FC,Properties} from "./model";
import type {Polygon,MultiPolygon} from "geojson";
export interface CommunityReference {
  available:boolean; boundaries:FC; labels:FC; metadata:Properties;
}
const empty=():FC=>({type:"FeatureCollection",features:[]});
const point=(p:unknown):p is number[]=>Array.isArray(p)&&p.length>=2&&
  Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
function ringValid(r:unknown):r is number[][] {
  return Array.isArray(r)&&r.length>=4&&r.every(point)&&r[0][0]===r[r.length-1][0]&&r[0][1]===r[r.length-1][1];
}
function insideRing(p:number[],r:number[][]) {
  let inside=false;
  for(let i=0,j=r.length-1;i<r.length;j=i++) {
    const a=r[i],b=r[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
/** Separate cartographic reference only; no announcement/POI position or count is derived here. */
export function communityReference(value:unknown,city:string):CommunityReference {
  const absent={available:false,boundaries:empty(),labels:empty(),metadata:{}};
  if(!value||typeof value!=="object")return absent;
  const v=value as Record<string,any>;
  if(v.type!=="FeatureCollection"||v.available!==true||typeof v.city!=="string"||v.city.toLowerCase()!==city.toLowerCase()||
      !Array.isArray(v.features)||!v.features.length||v.features.length>2048)return absent;
  const boundaries:FC=empty(),labels:FC=empty();const seen=new Set<string>();
  for(const f of v.features) {
    const g=f?.geometry as Polygon|MultiPolygon|undefined,p=f?.properties;
    if(f?.type!=="Feature"||!g||!["Polygon","MultiPolygon"].includes(g.type)||!p||typeof p.id!=="string"||seen.has(p.id)||
        typeof p.name!=="string"||!p.name.trim()||!point(p.label_point))return absent;
    const polygons=g.type==="Polygon"?[g.coordinates]:g.coordinates;
    if(!Array.isArray(polygons)||!polygons.length||!polygons.every(poly=>Array.isArray(poly)&&poly.length&&poly.every(ringValid))||
        !polygons.some(poly=>insideRing(p.label_point,poly[0])&&!poly.slice(1).some(ring=>insideRing(p.label_point,ring))))return absent;
    seen.add(p.id);boundaries.features.push(f);
    labels.features.push({type:"Feature",geometry:{type:"Point",coordinates:[...p.label_point]},properties:p});
  }
  return {available:true,boundaries,labels,metadata:{division_level:v.division_level,admin_level:v.admin_level,
    coverage_note:v.coverage_note,source_name:v.source_name,source_url:v.source_url,snapshot:v.snapshot,
    boundary_reference_year:v.boundary_reference_year,retrieved:v.retrieved}};
}
