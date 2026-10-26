import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c476-display-implementation');
const ids=new Set(["dresden|osm/relation/6168|osm/relation/6168/component/fd4735b7a6ba6ec5c363/owner-shape-C438","dresden|osm/way/232647450|osm/way/232647450/component/72357ac667dc448eb785","dresden|osm/way/232647451|osm/way/232647451/component/49bc3051212d5f02a286","dresden|osm/relation/6168|osm/relation/6168/component/fd4735b7a6ba6ec5c363/owner-shape-C476-0","dresden|osm/relation/6168|osm/relation/6168/component/fd4735b7a6ba6ec5c363/owner-shape-C476-1"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c476-display",()=>import('./c476-display-implementation'));
export const prepareC476MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c476HasMaterialBinding:Implementation["c476HasMaterialBinding"]=c=>{const module=route.value();return module?module.c476HasMaterialBinding(c):needed(c)?route.required().c476HasMaterialBinding(c):false;};
export const applyC476MaterialFrames:Implementation["applyC476MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC476MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC476MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"sourceArraysUnchanged":true};};
