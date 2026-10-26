import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F169_COMPLETION_IDS=[{"city":"dusseldorf","objectId":"osm/way/144140062","partId":"osm/way/144140062/component/35a96db629878e6ecb8a","origin":[6.77445815,51.2267206],"geometrySignature":"ff05dae9"}];
const ownerF169CompletionIdentity=(c:Identity)=>F169_COMPLETION_IDS.some(e=>e.objectId===c.objectId&&e.partId===c.partId);
export {ownerF169CompletionIdentity};
const reconstructionNeeded=(c:BuildingComponent)=>ownerF169CompletionIdentity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='dusseldorf'&&!!c.displayEstimates?.F169Completion;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF169CompletionReconstruction',needed,false,()=>import('./owner-f169-completion-reconstruction').then(m=>({reconstruct:m.ownerF169CompletionReconstruction,baseMaterials:m.ownerF169CompletionBaseMaterials})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF169CompletionReconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF169CompletionReconstruction=route.reconstruct;
export function ownerF169CompletionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return {objects:0,vertices:0,actualVisualAccepted:false};
 return route.baseMaterials(components,paint,frames);
}
