import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c353-display-implementation');
const ids=new Set(["munich|osm/way/31095009|osm/way/31095009/component/23ca89aa48fed4520bf9/owner-shape-C353"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c353-display",()=>import('./c353-display-implementation'));
export const prepareC353MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c353HasMaterialBinding:Implementation["c353HasMaterialBinding"]=c=>{const module=route.value();return module?module.c353HasMaterialBinding(c):needed(c)?route.required().c353HasMaterialBinding(c):false;};
export const applyC353MaterialFrames:Implementation["applyC353MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC353MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC353MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
