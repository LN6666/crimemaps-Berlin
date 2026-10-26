import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F009_IDS=[{"city":"berlin","objectId":"osm/way/128396192","partId":"osm/way/128396192/component/79857ccf94a339059294"},{"city":"berlin","objectId":"osm/way/217541314","partId":"osm/way/217541314/component/34f4e184454e32c43b8f"},{"city":"berlin","objectId":"osm/way/217541315","partId":"osm/way/217541315/component/617137bdcd4f6b02603f"},{"city":"berlin","objectId":"osm/way/222813052","partId":"osm/way/222813052/component/35ce9d93e0cfff461bfd"},{"city":"berlin","objectId":"osm/relation/4211905","partId":"osm/relation/4211905/component/05a9da707f8c86e9f35b"},{"city":"berlin","objectId":"osm/way/222813049","partId":"osm/way/222813049/component/d02fb8da0f3c976569e4"},{"city":"berlin","objectId":"osm/way/222813051","partId":"osm/way/222813051/component/402c7b683a9c015358b6"},{"city":"berlin","objectId":"osm/way/230838701","partId":"osm/way/230838701/component/44c3fd687411ab7554d5"}];
export const ownerF009Identity=(c:Identity)=>F009_IDS.some(x=>x.objectId===c.objectId&&x.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF009Identity(c);
const route=createLazyOwnerRoute('ownerF009Reconstruction',needed,false,()=>import('./owner-f009-reconstruction').then(m=>({reconstruct:m.ownerF009Reconstruction,baseMaterials:m.ownerF009BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF009Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF009Reconstruction=route.reconstruct;
export function ownerF009BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF009Identity(c)&&!!c.displayEstimates?.F009Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
