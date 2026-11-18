import type {LoadedBuildingComponent} from './building-3d-selection';

/** Selection needs metadata only. Do not clone resident mesh batches just to
 * select a building, and do not return aliases into its shared source data. */
export function copyBuildingComponentMetadata(value:LoadedBuildingComponent|undefined):LoadedBuildingComponent|undefined{
 if(value===undefined)return undefined;
 const {city,objectId,partId,generation,componentGeometry,sourceFeature,displayEstimates}=value;
 return structuredClone({city,objectId,partId,generation,componentGeometry,sourceFeature,displayEstimates});
}

/** Explicit full readbacks preserve geometry, material and provenance fields.
 * Components contain decoded data and typed arrays, never renderer GL handles.
 * No memoization: each public readback is independently mutable by its caller. */
export function copyBuildingComponentReadback<T extends object|undefined>(value:T):T{
 return value===undefined?value:structuredClone(value);
}
