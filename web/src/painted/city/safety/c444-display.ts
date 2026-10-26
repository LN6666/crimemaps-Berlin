import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c444-display-implementation');
const ids=new Set(["dresden|osm/way/346227912|osm/way/346227912/component/8b05722f55b6658a9b2d/owner-shape-C444-hotel","dresden|osm/way/23160237|osm/way/23160237/component/7c5540415a29ad7c904f/owner-shape-C444-anton37","dresden|osm/way/37553549|osm/way/37553549/component/db42444ad867eb1e77b0/owner-shape-C444-hain5"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c444-display",()=>import('./c444-display-implementation'));
export const prepareC444MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c444HasMaterialBinding:Implementation["c444HasMaterialBinding"]=c=>{const module=route.value();return module?module.c444HasMaterialBinding(c):needed(c)?route.required().c444HasMaterialBinding(c):false;};
export const applyC444MaterialFrames:Implementation["applyC444MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC444MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC444MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
