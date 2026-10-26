import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c449-display-implementation');
const ids=new Set(["dresden|osm/relation/5801|osm/relation/5801/component/546998e2b2f34854f305/owner-shape-C449","dresden|osm/way/384208416|osm/way/384208416/component/1e18ccf19dc0c7e89811","dresden|osm/way/384208417|osm/way/384208417/component/603fd4b776dd8a082866"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c449-display",()=>import('./c449-display-implementation'));
export const prepareC449MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c449HasMaterialBinding:Implementation["c449HasMaterialBinding"]=c=>{const module=route.value();return module?module.c449HasMaterialBinding(c):needed(c)?route.required().c449HasMaterialBinding(c):false;};
export const applyC449MaterialFrames:Implementation["applyC449MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC449MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC449MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"sourceArraysUnchanged":true};};
