import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c438-display-implementation');
const ids=new Set(["dresden|osm/relation/6168|osm/relation/6168/component/fd4735b7a6ba6ec5c363/owner-shape-C438"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c438-display",()=>import('./c438-display-implementation'));
export const prepareC438MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c438HasMaterialBinding:Implementation["c438HasMaterialBinding"]=c=>{const module=route.value();return module?module.c438HasMaterialBinding(c):needed(c)?route.required().c438HasMaterialBinding(c):false;};
export const applyC438MaterialFrames:Implementation["applyC438MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC438MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC438MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
