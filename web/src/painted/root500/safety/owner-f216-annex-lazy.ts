import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F216Annex_IDS=[{"city": "leipzig", "objectId": "osm/way/349182437", "partId": "osm/way/349182437/component/8c5992bab6dae5abf159", "signature": "d0db6d80"}, {"city": "leipzig", "objectId": "osm/way/349182442", "partId": "osm/way/349182442/component/b05b922f506851b727e6", "signature": "bb13587e"}];
const ownerF216AnnexIdentity=(c:Identity)=>F216Annex_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF216AnnexIdentity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="leipzig"&&ownerF216AnnexIdentity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='leipzig'&&ownerF216AnnexIdentity(c)&&!!c.displayEstimates?.F216AnnexExterior;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF216AnnexReconstruction',needed,false,()=>import('./owner-f216-annex-reconstruction').then(m=>({reconstruct:m.ownerF216AnnexReconstruction,baseMaterials:m.ownerF216AnnexBaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF216AnnexReconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF216AnnexReconstruction=route.reconstruct;
export function ownerF216AnnexBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
