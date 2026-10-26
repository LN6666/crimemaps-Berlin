import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F016_IDS=[{"city":"berlin","objectId":"osm/way/175464203","partId":"osm/way/175464203/component/9a504052436e63921943","signature":"f6b4995b"},{"city":"berlin","objectId":"osm/way/237687067","partId":"osm/way/237687067/component/cd7ae4300ae2d553152c","signature":"19587c60"},{"city":"berlin","objectId":"osm/way/237687068","partId":"osm/way/237687068/component/4f1f9115b0ba6cae0f7f","signature":"71d8ffbf"}];
export const ownerF016Identity=(c:Identity)=>F016_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF016Identity(c);
const route=createLazyOwnerRoute('ownerF016Reconstruction',needed,false,()=>import('./owner-f016-reconstruction').then(m=>({reconstruct:m.ownerF016Reconstruction,baseMaterials:m.ownerF016BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF016Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF016Reconstruction=route.reconstruct;
export function ownerF016BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF016Identity(c)&&!!c.displayEstimates?.F016Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
