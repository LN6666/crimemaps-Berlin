import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c445-display-implementation');
const ids=new Set(["dresden|osm/relation/10054811|osm/relation/10054811/component/e432d1da306f1c67b7c4/owner-shape-C445","dresden|osm/way/244099047|osm/way/244099047/component/c5887dcd1aa7a7de993f","dresden|osm/way/387419957|osm/way/387419957/component/f9e2dace5194d145cc61","dresden|osm/way/1499303212|osm/way/1499303212/component/c556542541fa4143acac","dresden|osm/way/1499303213|osm/way/1499303213/component/295bec775fae4ed128e8"]);
const needed=(c:{city:string;objectId:string;partId:string})=>ids.has(c.city+'|'+c.objectId+'|'+c.partId);
const route=createLazyCityMaterial<Implementation>("c445-display",()=>import('./c445-display-implementation'));
export const prepareC445MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c445HasMaterialBinding:Implementation["c445HasMaterialBinding"]=c=>{const module=route.value();return module?module.c445HasMaterialBinding(c):needed(c)?route.required().c445HasMaterialBinding(c):false;};
export const applyC445MaterialFrames:Implementation["applyC445MaterialFrames"]=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC445MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==="dresden"&&rows.some(needed))return route.required().applyC445MaterialFrames(rows,color,paint,x);return {"painted":0,"geometryAdded":0,"sourceArraysUnchanged":true};};
