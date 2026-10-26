import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c362-display-implementation');
const ids=new Set(["munich|osm/way/17973243|osm/way/17973243/component/44effac34ff9e9818c1a/owner-shape-C362"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c362-display",()=>import('./c362-display-implementation'));
export const prepareC362MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c362HasMaterialBinding:Implementation["c362HasMaterialBinding"]=c=>{const module=route.value();return module?module.c362HasMaterialBinding(c):needed(c)?route.required().c362HasMaterialBinding(c):false;};
export const applyC362MaterialFrames:Implementation["applyC362MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC362MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC362MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
