import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c343-display-implementation');
const ids=new Set(["munich|osm/way/25514390|osm/way/25514390/component/adf57eb3f504a742b681/owner-shape-C343"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c343-display",()=>import('./c343-display-implementation'));
export const prepareC343MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c343HasMaterialBinding:Implementation["c343HasMaterialBinding"]=c=>{const module=route.value();return module?module.c343HasMaterialBinding(c):needed(c)?route.required().c343HasMaterialBinding(c):false;};
export const applyC343MaterialFrames:Implementation["applyC343MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC343MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC343MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
