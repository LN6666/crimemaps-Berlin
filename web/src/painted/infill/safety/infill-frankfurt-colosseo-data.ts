import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';

export const COLOSSEO_SHA="64a2e55ebdba2f5215373744b7570eb4f2526b613c3d4df35a416a26c5f38987";

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"64a2e55ebdba2f5215373744b7570eb4f2526b613c3d4df35a416a26c5f38987",file:"painted/infill/safety/infill-frankfurt-colosseo-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-colosseo-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_COLOSSEO_DATA=scopedInfillValue(()=>scope.borrow<{"actualVisualAccepted":boolean;"groupIds":[string,string,string];"models":Array<{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;"triangleProvenance":Array<{"geometryRole":"exact-native-roof-with-source-courtyard"|number;"sourceBound":boolean;"sourcePartId":string;}>;}>;"family":number;"identity":{"city":"frankfurt";"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate"|"source-shape";};"window_pattern":string;};"geometryProof":{"leafPath":string;"leafSHA256":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building"?:string;"building:levels":string;"building:part"?:string;"description"?:string;"height"?:string;"name"?:string;"note"?:string;"roof:material"?:string;"roof:shape"?:string;"source"?:string;"type"?:"multipolygon";};"type":"Feature";};};}>;"sourceRetained":boolean;},{"actualVisualAccepted":boolean;"groupIds":[string,string,string];"models":Array<{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;"triangleProvenance":Array<{"geometryRole":"exact-native-roof-with-source-courtyard"|number;"sourceBound":boolean;"sourcePartId":string;}>;}>;"family":number;"identity":{"city":"frankfurt";"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate"|"source-shape";};"window_pattern":string;};"geometryProof":{"leafPath":string;"leafSHA256":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building"?:string;"building:levels":string;"building:part"?:string;"description"?:string;"height"?:string;"name"?:string;"note"?:string;"roof:material"?:string;"roof:shape"?:string;"source"?:string;"type"?:"multipolygon";};"type":"Feature";};};}>;"sourceRetained":boolean;}>(infillOwnDataRefs[0],value=>value));

return {get COLOSSEO_DATA(){return __infillRead_COLOSSEO_DATA();}};
});}
export function getCOLOSSEO_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).COLOSSEO_DATA;}
export const infillDataFunctionArities={"getCOLOSSEO_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
