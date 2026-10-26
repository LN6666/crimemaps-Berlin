import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c327-display-implementation');
const ids=new Set(["munich|osm/way/244969498|osm/way/244969498/component/c9afe2bfdbda14dd88e5/owner-shape-C327"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c327-display",()=>import('./c327-display-implementation'));
export const prepareC327MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c327HasMaterialBinding:Implementation["c327HasMaterialBinding"]=c=>{const module=route.value();return module?module.c327HasMaterialBinding(c):needed(c)?route.required().c327HasMaterialBinding(c):false;};
export const applyC327MaterialFrames:Implementation["applyC327MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC327MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC327MaterialFrames(rows,color,paint,x);return {"painted":0,"reconstructed":true};};
