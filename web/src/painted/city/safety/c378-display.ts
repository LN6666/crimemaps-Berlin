import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c378-display-implementation');
const ids=new Set(["munich|osm/relation/1644123|osm/relation/1644123/original-source-recovery/3b75a7e1670c479bf1400d8a412a4912c4da55609bc042fd2a26d02330dfe00f/owner-shape-C378"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c378-display",()=>import('./c378-display-implementation'));
export const prepareC378MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c378HasMaterialBinding:Implementation["c378HasMaterialBinding"]=c=>{const module=route.value();return module?module.c378HasMaterialBinding(c):needed(c)?route.required().c378HasMaterialBinding(c):false;};
export const applyC378MaterialFrames:Implementation["applyC378MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC378MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC378MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
