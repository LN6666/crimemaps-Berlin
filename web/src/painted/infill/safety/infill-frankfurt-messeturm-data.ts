import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';

export const MESSETURM_SHA="3855be2a6e9815457edb180d502827d466a2431ff1b683651651376c6e9c2d2e";

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"3855be2a6e9815457edb180d502827d466a2431ff1b683651651376c6e9c2d2e",file:"painted/infill/safety/infill-frankfurt-messeturm-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-messeturm-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_MESSETURM_DATA=scopedInfillValue(()=>scope.borrow<{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;"triangleProvenance":Array<{"displayEstimate":boolean;"role":number;"sourcePartId":string;}>;}>;"family":number;"identity":{"city":"frankfurt";"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"geometryProof":{"leafPath":string;"leafSHA256":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city":string;"addr:country":string;"addr:housenumber":string;"addr:postcode":string;"addr:street":string;"building":string;"height":string;"landmark":string;"loc_name":string;"name":string;"start_date":string;"website":string;"wikidata":string;"wikimedia_commons":string;"wikipedia":string;};"type":"Feature";};};},{"display":Array<{"color":Array<number>;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;"triangleProvenance":Array<{"displayEstimate":boolean;"role":number;"sourcePartId":string;}>;}>;"family":number;"identity":{"city":"frankfurt";"objectId":string;"partId":string;"signature":string;};"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"geometryProof":{"leafPath":string;"leafSHA256":string;};"geometrySignature":string;"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"addr:city":string;"addr:country":string;"addr:housenumber":string;"addr:postcode":string;"addr:street":string;"building":string;"height":string;"landmark":string;"loc_name":string;"name":string;"start_date":string;"website":string;"wikidata":string;"wikimedia_commons":string;"wikipedia":string;};"type":"Feature";};};}>(infillOwnDataRefs[0],value=>value));

return {get MESSETURM_DATA(){return __infillRead_MESSETURM_DATA();}};
});}
export function getMESSETURM_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).MESSETURM_DATA;}
export const infillDataFunctionArities={"getMESSETURM_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
