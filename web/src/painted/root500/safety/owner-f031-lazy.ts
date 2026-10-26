import type {BuildingComponent} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F031_IDS=[{"city":"berlin","objectId":"osm/way/36055031","partId":"osm/way/36055031/component/515883abc43450111d38","signature":"1c50bbc7"},{"city":"berlin","objectId":"osm/way/328639704","partId":"osm/way/328639704/component/0c21730fc97b5b3bbfbc","signature":"e5c60c68"},{"city":"berlin","objectId":"osm/way/328639705","partId":"osm/way/328639705/component/0629cb123438ad9371b4","signature":"f78e35cf"}];
export const ownerF031Identity=(c:{objectId:string;partId:string})=>F031_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==='berlin'&&ownerF031Identity(c);
const route=createLazyOwnerRoute('ownerF031Reconstruction',needed,false,()=>import('./owner-f031-reconstruction').then(m=>({reconstruct:m.ownerF031Reconstruction,baseMaterials:m.ownerF031BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF031Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF031Reconstruction=route.reconstruct;
export function ownerF031BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>needed(c)&&!!c.displayEstimates?.F031Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
