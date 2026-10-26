import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c366-display-implementation');
const ids=new Set(["munich|osm/way/24152122|osm/way/24152122/component/c3345d1de1946e74d5e6/owner-shape-C366"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c366-display",()=>import('./c366-display-implementation'));
export const prepareC366MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c366HasMaterialBinding:Implementation["c366HasMaterialBinding"]=c=>{const module=route.value();return module?module.c366HasMaterialBinding(c):needed(c)?route.required().c366HasMaterialBinding(c):false;};
export const applyC366MaterialFrames:Implementation["applyC366MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC366MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC366MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
