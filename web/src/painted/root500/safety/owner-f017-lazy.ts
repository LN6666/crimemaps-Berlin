import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F017_IDS=[{"city":"berlin","objectId":"osm/way/18578139","partId":"osm/way/18578139/component/34042660390634af5ee3","signature":"34ce6e8e"},{"city":"berlin","objectId":"osm/way/133885752","partId":"osm/way/133885752/component/1bb9437084dca85fcbc3","signature":"eab8d315"}];
export const ownerF017Identity=(c:Identity)=>F017_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF017Identity(c);
const route=createLazyOwnerRoute('ownerF017Reconstruction',needed,false,()=>import('./owner-f017-reconstruction').then(m=>({reconstruct:m.ownerF017Reconstruction,baseMaterials:m.ownerF017BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF017Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF017Reconstruction=route.reconstruct;
export function ownerF017BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF017Identity(c)&&!!c.displayEstimates?.F017Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
