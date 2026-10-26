import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {createLazyOwnerRoute,type OwnerInitializationWait} from './lazy-owner-route';
const F105_SHA="b19375cb659a278d45b41f7d2685b0309506804a72853ae4ca6ee7781f3474c4";
const F105_IDS=[{"city":"munich","objectId":"osm/way/4647135","partId":"osm/way/4647135/component/f26c11747fd4b5b602a0","signature":"c64bc2db"}];
const ownerF105Identity=(c:Identity)=>F105_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF105Identity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="munich"&&ownerF105Identity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='munich'&&ownerF105Identity(c)&&(c.displayEstimates as any)?.F105Completion?.patchSHA256===F105_SHA;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF105Reconstruction',needed,true,()=>import('./owner-f105-reconstruction').then(m=>({reconstruct:m.ownerF105Reconstruction,baseMaterials:(components:BuildingComponent[],paint:Float32Array,frames:Float32Array)=>{m.ownerF105BaseMaterials(components,paint,frames);return{objects:0,vertices:0,actualVisualAccepted:false};}})));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF105Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF105Reconstruction=route.reconstruct;
export function ownerF105BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 if(!components.some(materialNeeded))return undefined;
 route.baseMaterials(components,paint,frames);
}
