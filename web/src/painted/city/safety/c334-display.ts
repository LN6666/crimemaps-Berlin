import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c334-display-implementation');
const ids=new Set(["munich|osm/way/14186618|osm/way/14186618/component/985eb2d4ec4c581129f5/owner-shape-C334"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c334-display",()=>import('./c334-display-implementation'));
export const prepareC334MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c334HasMaterialBinding:Implementation["c334HasMaterialBinding"]=c=>{const module=route.value();return module?module.c334HasMaterialBinding(c):needed(c)?route.required().c334HasMaterialBinding(c):false;};
export const applyC334MaterialFrames:Implementation["applyC334MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC334MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC334MaterialFrames(rows,color,paint,x);return {"painted":0,"reconstructed":true};};
