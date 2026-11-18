import {ownerF030Identity} from './owner-f030-identities';
export {ownerF030Identity} from './owner-f030-identities';
export {ownerF030BaseMaterials} from './owner-f030-materials';
import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';


const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerF030Identity(c);
const route=createLazyOwnerRoute('ownerF030Reconstruction',needed,false,()=>import('./owner-f030-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF030Reconstruction','ownerF030BaseMaterials')));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerF030Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF030Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF030Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
