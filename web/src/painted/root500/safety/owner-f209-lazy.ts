import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F209_IDS=[{"city": "stuttgart", "objectId": "osm/way/9862220", "partId": "osm/way/9862220/component/b61b87233a2a16da4d24", "signature": "a4df0751"}, {"city": "stuttgart", "objectId": "osm/way/677177084", "partId": "osm/way/677177084/component/b26d9e098a6d02877a1c", "signature": "1eca215a"}];
const ownerF209Identity=(c:Identity)=>F209_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF209Identity};
const reconstructionNeeded=(c:BuildingComponent)=>ownerF209Identity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='stuttgart'&&ownerF209Identity(c)&&!!c.displayEstimates?.F209Exterior;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF209Reconstruction',needed,false,()=>import('./owner-f209-reconstruction').then(m=>({reconstruct:m.ownerF209Reconstruction,baseMaterials:m.ownerF209BaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF209Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF209Reconstruction=route.reconstruct;
export function ownerF209BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
