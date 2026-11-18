import type {BuildingComponent} from '../../../safety/building-mesh-types';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
import {ownerF029Identity} from './owner-f029-identities';
export {ownerF029Identity} from './owner-f029-identities';
// F029 keeps its copied no-match container; the shared route replaces the former
// F029-only loader with the same prepare/cancel/retry behaviour.
const needed=(c:BuildingComponent)=>c.city==='berlin'&&ownerF029Identity(c);
const route=createLazyOwnerRoute('ownerF029Reconstruction',needed,true,()=>import('./owner-f029-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF029Reconstruction','ownerF029BaseMaterials')));
export function prepareOwnerF029Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF029Reconstruction=route.reconstruct;
export function ownerF029BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){route.baseMaterials(components,paint,frames,scope);}
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF029Reconstruction":1,"ownerF029BaseMaterials":3};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
