import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c437-display-implementation');
const ids=new Set(["dresden|osm/way/23130684|osm/way/23130684/component/a936113b35cbd5b34807/owner-shape-C437"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c437-display",()=>import('./c437-display-implementation'));
export const prepareC437MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c437HasMaterialBinding:Implementation["c437HasMaterialBinding"]=c=>{const module=route.value();return module?module.c437HasMaterialBinding(c):needed(c)?route.required().c437HasMaterialBinding(c):false;};
export const applyC437MaterialFrames:Implementation["applyC437MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC437MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC437MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
