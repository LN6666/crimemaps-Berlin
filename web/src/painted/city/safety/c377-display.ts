import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c377-display-implementation');
const ids=new Set(["munich|osm/way/14186618|osm/way/14186618/component/985eb2d4ec4c581129f5/owner-shape-C377"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c377-display",()=>import('./c377-display-implementation'));
export const prepareC377MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c377HasMaterialBinding:Implementation["c377HasMaterialBinding"]=c=>{const module=route.value();return module?module.c377HasMaterialBinding(c):needed(c)?route.required().c377HasMaterialBinding(c):false;};
export const applyC377MaterialFrames:Implementation["applyC377MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC377MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC377MaterialFrames(rows,color,paint,x);return {"painted":0,"reconstructed":true};};
