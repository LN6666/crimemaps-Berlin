import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c351-display-implementation');
const ids=new Set(["munich|osm/way/61408163|osm/way/61408163/component/e25d83c6307776ede765/owner-shape-C351"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c351-display",()=>import('./c351-display-implementation'));
export const prepareC351MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c351HasMaterialBinding:Implementation["c351HasMaterialBinding"]=c=>{const module=route.value();return module?module.c351HasMaterialBinding(c):needed(c)?route.required().c351HasMaterialBinding(c):false;};
export const applyC351MaterialFrames:Implementation["applyC351MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC351MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC351MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
