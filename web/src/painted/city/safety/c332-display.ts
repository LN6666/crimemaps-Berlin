import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c332-display-implementation');
const ids=new Set(["munich|osm/way/10053440|osm/way/10053440/component/d58fb5dd462e352279a2/owner-shape-C332"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c332-display",()=>import('./c332-display-implementation'));
export const prepareC332MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c332HasMaterialBinding:Implementation["c332HasMaterialBinding"]=c=>{const module=route.value();return module?module.c332HasMaterialBinding(c):needed(c)?route.required().c332HasMaterialBinding(c):false;};
export const applyC332MaterialFrames:Implementation["applyC332MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC332MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC332MaterialFrames(rows,color,paint,x);return {"painted":0,"reconstructed":true};};
