import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F037_IDS=[{"city":"berlin","objectId":"osm/way/58608090","partId":"osm/way/58608090/component/11289cc7091e8a0ee6a1","signature":"9add9677"},{"city":"berlin","objectId":"osm/way/207890917","partId":"osm/way/207890917/component/748cf5ac0bb42cca4b75","signature":"f28b449f"},{"city":"berlin","objectId":"osm/way/207890915","partId":"osm/way/207890915/component/f5bb3f111a9ab3190be4","signature":"e73e6343"},{"city":"berlin","objectId":"osm/way/207890916","partId":"osm/way/207890916/component/21e930bb1a10efe15ac6","signature":"f9584744"},{"city":"berlin","objectId":"osm/way/207890918","partId":"osm/way/207890918/component/32cc967cc7e6991c1ec2","signature":"432fed24"}];
export const ownerF037Identity=(c:Identity)=>F037_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF037Identity(c);
const route=createLazyOwnerRoute('ownerF037Reconstruction',needed,false,()=>import('./owner-f037-reconstruction').then(m=>({reconstruct:m.ownerF037Reconstruction,baseMaterials:m.ownerF037BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF037Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF037Reconstruction=route.reconstruct;
export function ownerF037BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF037Identity(c)&&!!c.displayEstimates?.F037Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
