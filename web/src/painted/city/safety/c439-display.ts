import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c439-display-implementation');
const ids=new Set(["dresden|osm/relation/6170|osm/relation/6170/component/7c05a63c855fc7ca4444/owner-shape-C439"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c439-display",()=>import('./c439-display-implementation'));
export const prepareC439MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c439HasMaterialBinding:Implementation["c439HasMaterialBinding"]=c=>{const module=route.value();return module?module.c439HasMaterialBinding(c):needed(c)?route.required().c439HasMaterialBinding(c):false;};
export const applyC439MaterialFrames:Implementation["applyC439MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC439MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC439MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
