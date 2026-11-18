import type {BuildingComponent} from '../../../safety/building-mesh-types';
import {createLazyOwnerRoute,scopedOwnerBuilder,type OwnerInitializationWait} from './lazy-owner-route';
import {ownerF036Identity} from './owner-f036-stateless';
export {ownerF036Identity,ownerF036BaseMaterials} from './owner-f036-stateless';
const needed=(c:BuildingComponent)=>c.city==='berlin'&&ownerF036Identity(c);
const route=createLazyOwnerRoute('ownerF036Reconstruction',needed,false,()=>import('./owner-f036-reconstruction').then(m=>scopedOwnerBuilder(m,'ownerF036Reconstruction','ownerF036BaseMaterials')));
export function prepareOwnerF036Reconstruction(components:readonly BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait){signal.throwIfAborted();return components.some(needed)?route.prepare(signal,wait):undefined;}
export const ownerF036Reconstruction=route.reconstruct;
/** Batch-scope hooks for the canonical and infill aggregates: each facade's scope
 * position (that of its original), the loaded original's data preparation for
 * the rows that need it, and a module-only start (undefined when loaded or unneeded). */
export const root500DataFunctionArities:Readonly<Record<string,number>>={"ownerF036Reconstruction":1};
export const prepareRoot500Data=route.prepareScope,startRoot500OwnerModule=route.prepareModule;
