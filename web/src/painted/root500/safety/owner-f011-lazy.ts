import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F011_IDS=[{"city":"berlin","objectId":"osm/way/127184907","partId":"osm/way/127184907/component/ce3688bfda97580847b3","signature":"691a3c70"}];
export const ownerF011Identity=(c:Identity)=>F011_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF011Identity(c);
const route=createLazyOwnerRoute('ownerF011Reconstruction',needed,false,()=>import('./owner-f011-reconstruction').then(m=>({reconstruct:m.ownerF011Reconstruction,baseMaterials:m.ownerF011BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF011Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF011Reconstruction=route.reconstruct;
export function ownerF011BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF011Identity(c)&&!!c.displayEstimates?.F011Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
