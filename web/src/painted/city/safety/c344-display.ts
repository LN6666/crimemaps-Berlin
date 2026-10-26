import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c344-display-implementation');
const ids=new Set(["munich|osm/relation/14897|osm/relation/14897/component/1e456c207b32a9f31d8a/owner-shape-C344"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c344-display",()=>import('./c344-display-implementation'));
export const prepareC344MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c344HasMaterialBinding:Implementation["c344HasMaterialBinding"]=c=>{const module=route.value();return module?module.c344HasMaterialBinding(c):needed(c)?route.required().c344HasMaterialBinding(c):false;};
export const applyC344MaterialFrames:Implementation["applyC344MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC344MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC344MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
