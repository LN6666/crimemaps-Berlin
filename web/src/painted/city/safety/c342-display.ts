import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c342-display-implementation');
const ids=new Set(["munich|osm/way/228534603|osm/way/228534603/component/19187ba35eb6899d21b9/owner-shape-C342"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c342-display",()=>import('./c342-display-implementation'));
export const prepareC342MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c342HasMaterialBinding:Implementation["c342HasMaterialBinding"]=c=>{const module=route.value();return module?module.c342HasMaterialBinding(c):needed(c)?route.required().c342HasMaterialBinding(c):false;};
export const applyC342MaterialFrames:Implementation["applyC342MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC342MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC342MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
