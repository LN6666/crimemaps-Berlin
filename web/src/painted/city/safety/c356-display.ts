import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c356-display-implementation');
const ids=new Set(["munich|osm/way/264566973|osm/way/264566973/component/4f90595429efe04bcfc9/owner-shape-C356"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c356-display",()=>import('./c356-display-implementation'));
export const prepareC356MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c356HasMaterialBinding:Implementation["c356HasMaterialBinding"]=c=>{const module=route.value();return module?module.c356HasMaterialBinding(c):needed(c)?route.required().c356HasMaterialBinding(c):false;};
export const applyC356MaterialFrames:Implementation["applyC356MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC356MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="munich"&&rows.some(needed))return route.required().applyC356MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"ownerAuthorizedReconstruction":false,"sourceArraysUnchanged":true};};
