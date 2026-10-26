import {createLazyCityMaterial,type CityMaterialWait} from './lazy-city-material';
type Implementation=typeof import('./c459-display-implementation');
const needed=(c:{city:string;objectId:string;partId:string})=>c.city==='dresden'&&c.objectId==='osm/way/23059354'&&c.partId==='osm/way/23059354/component/7bad7616b5ba3e9d5847';
const route=createLazyCityMaterial<Implementation>('c459-display',()=>import('./c459-display-implementation'));
export const prepareC459MaterialFrames=(signal:AbortSignal,wait?:CityMaterialWait)=>route.prepare(signal,wait);
export const c459HasMaterialBinding:Implementation['c459HasMaterialBinding']=c=>{const module=route.value();return module?module.c459HasMaterialBinding(c):needed(c)?route.required().c459HasMaterialBinding(c):false;};
export const applyC459MaterialFrames:Implementation['applyC459MaterialFrames']=(rows,color,paint,x)=>{const module=route.value();if(module)return module.applyC459MaterialFrames(rows,color,paint,x);if(!x.signal?.aborted&&x.city==='dresden'&&rows.some(needed))return route.required().applyC459MaterialFrames(rows,color,paint,x);return {painted:0,geometryAdded:0,sourceArraysUnchanged:true};};
