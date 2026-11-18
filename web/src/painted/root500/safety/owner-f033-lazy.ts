export {ownerF033BaseMaterials} from './owner-f033-stateless';
import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
import {ownerF033Identity} from './owner-f033-identities';
export {ownerF033Identity} from './owner-f033-identities';
// F033 keeps its own same-container no-match contract; the shared route replaces
// the former F033-only loader with the same prepare/cancel/retry behaviour.
const needed=(c:BuildingComponent)=>c.city==='berlin'&&ownerF033Identity(c);
const route=createLazyOwnerRoute('ownerF033Reconstruction',needed,false,()=>import('./owner-f033-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF033Reconstruction','ownerF033BaseMaterials')));
export function prepareOwnerF033Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF033Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF033Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
