import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c345-display-implementation');
const ids=new Set(["munich|osm/relation/61204|osm/relation/61204/component/295e608607d3503aa92d/owner-shape-C345"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c345-display",()=>import('./c345-display-implementation'));
export const prepareC345MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c345HasMaterialBinding:Implementation["c345HasMaterialBinding"]=c=>{const module=route.value();return module?module.c345HasMaterialBinding(c):needed(c)?route.required().c345HasMaterialBinding(c):false;};
export const applyC345MaterialFrames:Implementation["applyC345MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC345MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC345MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
