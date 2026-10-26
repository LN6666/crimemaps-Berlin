import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c360-display-implementation');
const ids=new Set(["munich|osm/way/173135247|osm/way/173135247/component/d505d00db06f6ba8ee0c/owner-shape-C360"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c360-display",()=>import('./c360-display-implementation'));
export const prepareC360MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c360HasMaterialBinding:Implementation["c360HasMaterialBinding"]=c=>{const module=route.value();return module?module.c360HasMaterialBinding(c):needed(c)?route.required().c360HasMaterialBinding(c):false;};
export const applyC360MaterialFrames:Implementation["applyC360MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC360MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC360MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
