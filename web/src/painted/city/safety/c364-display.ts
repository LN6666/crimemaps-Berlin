import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c364-display-implementation');
const ids=new Set(["munich|osm/way/1432551061|osm/way/1432551061/component/fa99c685d9df6a0a7df0/owner-shape-C364"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c364-display",()=>import('./c364-display-implementation'));
export const prepareC364MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c364HasMaterialBinding:Implementation["c364HasMaterialBinding"]=c=>{const module=route.value();return module?module.c364HasMaterialBinding(c):needed(c)?route.required().c364HasMaterialBinding(c):false;};
export const applyC364MaterialFrames:Implementation["applyC364MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC364MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC364MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
