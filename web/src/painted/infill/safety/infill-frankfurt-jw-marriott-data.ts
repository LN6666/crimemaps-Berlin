import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const JW_MARRIOTT_SHA="5fcad8d2423494ef51f7066649387e7e7e27a988635bb363798bf71c7b372cc7";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"5fcad8d2423494ef51f7066649387e7e7e27a988635bb363798bf71c7b372cc7",file:"painted/infill/safety/infill-frankfurt-jw-marriott-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-jw-marriott-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_JW_MARRIOTT_DATA=scopedInfillValue(()=>scope.borrow<{"actualVisualAccepted":boolean;"displayEstimates":{"main":string;"materials":string;"westpart":string;};"excludedNeighbors":[string,string,string,string];"fineTextureDeferred":boolean;"models":Array<{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"identity":{"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"geometryProof":{"leafPath":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city"?:string;"addr:country"?:string;"addr:housenumber"?:string;"addr:place"?:string;"addr:postcode"?:string;"building"?:string;"building:part"?:string;"height"?:string;};"type":"Feature";};};}>;"parentDedup":{"childObjectId":string;"removedParentFootprintVertices":[number,number,number];"retainedSource":boolean;"sharedSourceNodes":number;};"sourceRetained":boolean;},{"actualVisualAccepted":boolean;"displayEstimates":{"main":string;"materials":string;"westpart":string;};"excludedNeighbors":[string,string,string,string];"fineTextureDeferred":boolean;"models":Array<{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"identity":{"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"geometryProof":{"leafPath":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city"?:string;"addr:country"?:string;"addr:housenumber"?:string;"addr:place"?:string;"addr:postcode"?:string;"building"?:string;"building:part"?:string;"height"?:string;};"type":"Feature";};};}>;"parentDedup":{"childObjectId":string;"removedParentFootprintVertices":[number,number,number];"retainedSource":boolean;"sharedSourceNodes":number;};"sourceRetained":boolean;}>(infillOwnDataRefs[0],value=>value));

return {get JW_MARRIOTT_DATA(){return __infillRead_JW_MARRIOTT_DATA();}};
});}
export function getJW_MARRIOTT_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).JW_MARRIOTT_DATA;}
export const infillDataFunctionArities={"getJW_MARRIOTT_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
