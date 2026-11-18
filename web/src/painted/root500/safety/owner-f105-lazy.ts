import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
const F105_SHA="b19375cb659a278d45b41f7d2685b0309506804a72853ae4ca6ee7781f3474c4";
const F105_IDS=[{"city":"munich","objectId":"osm/way/4647135","partId":"osm/way/4647135/component/f26c11747fd4b5b602a0","signature":"c64bc2db"}];
const ownerF105Identity=(c:Identity)=>F105_IDS.some(i=>i.objectId===c.objectId&&i.partId===c.partId);
export {ownerF105Identity};
const reconstructionNeeded=(c:BuildingComponent)=>c.city==="munich"&&ownerF105Identity(c);
const materialNeeded=(c:BuildingComponent)=>c.city==='munich'&&ownerF105Identity(c)&&(c.displayEstimates as any)?.F105Completion?.patchSHA256===F105_SHA;
const needed=(c:BuildingComponent)=>reconstructionNeeded(c)||materialNeeded(c);
const route=createLazyOwnerRoute('ownerF105Reconstruction',needed,true,()=>import('./owner-f105-reconstruction').then(m=>{const original=scopedOwnerBuilder(m,'ownerF105Reconstruction','ownerF105BaseMaterials');return{...original,baseMaterials:(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope)=>{original.baseMaterials(components,paint,frames,scope);return{objects:0,vertices:0,actualVisualAccepted:false};}};}));
/** Prepare at the original chain position; preserve identity and material-marker guards. */
export function prepareOwnerF105Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF105Reconstruction=route.reconstruct;
export function ownerF105BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){
 if(!components.some(materialNeeded))return undefined;
 route.baseMaterials(components,paint,frames,scope);
}
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF105Reconstruction":1,"ownerF105BaseMaterials":3};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
