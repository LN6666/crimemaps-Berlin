import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F189_IDS=[{"city":"stuttgart","objectId":"osm/way/106702067","partId":"osm/way/106702067/component/c4e6dd1b753cc6fccec9","signature":"55105caf"},{"city":"stuttgart","objectId":"osm/way/962892731","partId":"osm/way/962892731/component/7aee47b329f5845b039c","signature":"8e1d0279"},{"city":"stuttgart","objectId":"osm/way/962892732","partId":"osm/way/962892732/component/71b9bf9ce108ba941d35","signature":"3b53bb9d"},{"city":"stuttgart","objectId":"osm/way/677177551","partId":"osm/way/677177551/component/867f6dc2be92393009b7","signature":"dfdfd2b8"},{"city":"stuttgart","objectId":"osm/way/1021593000","partId":"osm/way/1021593000/component/477b446c871899e60957","signature":"f634016f"}];
const ownerF189Identity=(c:Identity)=>F189_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF189Identity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="stuttgart"&&ownerF189Identity(c);
const materialNeeded=(c:BuildingComponent)=>F189_IDS.some(i=>c.city===i.city&&c.objectId===i.objectId&&c.partId===i.partId&&(c.displayEstimates?.F189PhotoEstimate as {sourceSignature?:string}|undefined)?.sourceSignature===i.signature);
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF189Reconstruction',needed,true,()=>import('./owner-f189-reconstruction').then(m=>({reconstruct:m.ownerF189Reconstruction,baseMaterials:m.ownerF189BaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF189Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF189Reconstruction=route.reconstruct;
export function ownerF189BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
