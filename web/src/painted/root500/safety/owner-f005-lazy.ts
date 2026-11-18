import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
import {ownerF005Identity} from './owner-f005-stateless';
export {F005_IDS,F005_RECONSTRUCTION_SHA,ownerF005Identity,ownerF005BaseMaterials} from './owner-f005-stateless';
const needed=(c:BuildingComponent)=>c.city==='berlin'&&ownerF005Identity(c);
const route=createLazyOwnerRoute('ownerF005Reconstruction',needed,false,()=>import('./owner-f005-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF005Reconstruction','ownerF005BaseMaterials')));
/** Called at the original F005 chain position; completion stays inside its original builder. */
export function prepareOwnerF005Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF005Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF005Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
