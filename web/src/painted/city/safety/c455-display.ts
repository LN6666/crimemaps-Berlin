import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c455-display-implementation');
const needed=(c:{city:string;objectId:string;partId:string})=>c.city==='dresden'&&c.objectId==='osm/way/23059355'&&c.partId==='osm/way/23059355/component/92ecae6b8cb1d76ac942';
const route=createLazyCityMaterial<Implementation>('c455-display',()=>import('./c455-display-implementation'));
export const prepareC455MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c455HasMaterialBinding:Implementation['c455HasMaterialBinding']=c=>{const module=route.value();return module?module.c455HasMaterialBinding(c):needed(c)?route.required().c455HasMaterialBinding(c):false;};
export const applyC455MaterialFrames:Implementation['applyC455MaterialFrames']=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC455MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==='dresden'&&rows.some(needed))return route.required().applyC455MaterialFrames(rows,color,paint,x);return {painted:0,geometryAdded:0,sourceArraysUnchanged:true};};
