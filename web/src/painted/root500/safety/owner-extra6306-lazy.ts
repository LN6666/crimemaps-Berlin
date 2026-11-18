import {ownerE6306Identity} from './owner-extra6306-identities';
export {ownerE6306Identity} from './owner-extra6306-identities';
export {ownerE6306BaseMaterials} from './owner-extra6306-materials';
import type {BuildingComponent,Identity} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';


const needed=(c:BuildingComponent)=>c.city==="berlin"&&ownerE6306Identity(c);
const route=createLazyOwnerRoute('ownerE6306Reconstruction',needed,false,()=>import('./owner-extra6306-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerE6306Reconstruction','ownerE6306BaseMaterials')));
/** Called at this owner's original chain position, after every preceding builder. */
export function prepareOwnerE6306Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerE6306Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerE6306Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
