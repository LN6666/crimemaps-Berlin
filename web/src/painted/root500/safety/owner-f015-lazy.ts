import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F015_IDS=[{"city":"berlin","objectId":"osm/way/765450026","partId":"osm/way/765450026/component/5ea14b3babb27665894a","signature":"98f5f604"},{"city":"berlin","objectId":"osm/way/765450027","partId":"osm/way/765450027/component/09a34fafc97947d2fdd6","signature":"826f36e4"},{"city":"berlin","objectId":"osm/way/765450028","partId":"osm/way/765450028/component/e4a71daacd09041a0167","signature":"830b84a4"},{"city":"berlin","objectId":"osm/way/765450031","partId":"osm/way/765450031/component/22f70e623deef1c810c1","signature":"f025b995"},{"city":"berlin","objectId":"osm/way/15976892","partId":"osm/way/15976892/component/06c9260a8699203bc4b8","signature":"1a2877b4"},{"city":"berlin","objectId":"osm/way/765450029","partId":"osm/way/765450029/component/50a5398caed237081f0c","signature":"f9686528"},{"city":"berlin","objectId":"osm/way/765450030","partId":"osm/way/765450030/component/529a8198692015efbcb3","signature":"98b255c6"}];
export const ownerF015Identity=(c:Identity)=>F015_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF015Identity(c);
const route=createLazyOwnerRoute('ownerF015Reconstruction',needed,false,()=>import('./owner-f015-reconstruction').then(m=>({reconstruct:m.ownerF015Reconstruction,baseMaterials:m.ownerF015BaseMaterials})));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF015Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF015Reconstruction=route.reconstruct;
export function ownerF015BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 // A later builder may add this identity without this owner's display; the original material pass skips it.
 if(!components.some(c=>c.city==='berlin'&&ownerF015Identity(c)&&!!c.displayEstimates?.F015Exterior))return{objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
