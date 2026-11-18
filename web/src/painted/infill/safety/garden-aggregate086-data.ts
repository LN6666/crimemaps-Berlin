import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
/* Canonical original SOURCE/admissions; only C. No new geometry or material design. */
export const GARDEN_AGGREGATE086_SHA="912d24ab530840ed77dbf04925caec9a525e0f5f537921c23088494552c61f17";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"9846d0a79ba8111c0ab42fa0052203fdd96a0ce32a3e862806dcee8559621a51",file:"painted/infill/safety/garden-aggregate086-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("garden-aggregate086-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_GARDEN_AGGREGATE086_ROWS=scopedInfillValue(()=>scope.borrow<Array<{"admission":{"city":"frankfurt";"descriptionSHA256":string;"family":number;"geometrySignature":string;"mode":"simplified";"objectId":string;"origin":[number,number];"ownerSelectedMaterialPriority":boolean;"partId":string;"surfaceFrames":Array<{"batchIndex":number;"family":number;"firstVertex":number;"height":number;"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;"tier":number;};"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"objectId":string;"origin":[number,number];"parent":boolean;"partId":string;"signature":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city"?:string;"addr:housenumber"?:string;"addr:postcode"?:string;"addr:street"?:string;"building"?:string;"building:levels"?:string;"building:part"?:string;"height"?:string;"name"?:string;"roof:levels"?:string;"wikidata"?:string;"wikimedia_commons"?:string;"wikipedia"?:string;};"type":"Feature";};}>,Array<{"admission":{"city":"frankfurt";"descriptionSHA256":string;"family":number;"geometrySignature":string;"mode":"simplified";"objectId":string;"origin":[number,number];"ownerSelectedMaterialPriority":boolean;"partId":string;"surfaceFrames":Array<{"batchIndex":number;"family":number;"firstVertex":number;"height":number;"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;"tier":number;};"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"objectId":string;"origin":[number,number];"parent":boolean;"partId":string;"signature":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city"?:string;"addr:housenumber"?:string;"addr:postcode"?:string;"addr:street"?:string;"building"?:string;"building:levels"?:string;"building:part"?:string;"height"?:string;"name"?:string;"roof:levels"?:string;"wikidata"?:string;"wikimedia_commons"?:string;"wikipedia"?:string;};"type":"Feature";};}>>(infillOwnDataRefs[0],value=>value));

return {get GARDEN_AGGREGATE086_ROWS(){return __infillRead_GARDEN_AGGREGATE086_ROWS();}};
});}
export function getGARDEN_AGGREGATE086_ROWS(scope:FrozenDataScope|undefined){return getInfillData(scope).GARDEN_AGGREGATE086_ROWS;}
export const infillDataFunctionArities={"getGARDEN_AGGREGATE086_ROWS":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
