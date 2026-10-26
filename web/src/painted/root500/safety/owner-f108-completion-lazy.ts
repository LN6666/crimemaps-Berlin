import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F108_COMPLETION_IDS=[{"city":"munich","objectId":"osm/way/91268639","partId":"osm/way/91268639/component/705c5a3fd4362ac9c522","origin":[11.570780800000001,48.14081745],"geometrySignature":"ed83f358"}];
const ownerF108CompletionIdentity=(c:Identity)=>F108_COMPLETION_IDS.some(e=>e.objectId===c.objectId&&e.partId===c.partId);
export {ownerF108CompletionIdentity};
const reconstructionNeeded=(c:BuildingComponent)=>ownerF108CompletionIdentity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='munich'&&!!c.displayEstimates?.F108Completion;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF108CompletionReconstruction',needed,false,()=>import('./owner-f108-completion-reconstruction').then(m=>({reconstruct:m.ownerF108CompletionReconstruction,baseMaterials:m.ownerF108CompletionBaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF108CompletionReconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF108CompletionReconstruction=route.reconstruct;
export function ownerF108CompletionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
