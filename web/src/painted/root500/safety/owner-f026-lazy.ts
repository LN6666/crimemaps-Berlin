import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
import {ownerF026Identity} from './owner-f026-stateless';
export {ownerF026Identity,ownerF026BaseMaterials} from './owner-f026-stateless';
const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF026Identity(c);
const route=createLazyOwnerRoute('ownerF026Reconstruction',needed,false,()=>import('./owner-f026-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF026Reconstruction','ownerF026BaseMaterials')));
export function prepareOwnerF026Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF026Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF026Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
