import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
/**091: only4 main east-chord material vertices rebind to its own known facade; all geometry intact. */
export const GALLUSANLAGE8_CHILDREN_SHA089="99f8653d58973800049fbbdaace299e22eb1f13dbabc2d6a80e13b279960697b";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"fec4677d14076756bcf2fb90ba195e64148b8182e60b05074f0772dd8af97912",file:"painted/infill/safety/gallusanlage8-children089-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("gallusanlage8-children089-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_GALLUSANLAGE8_CHILDREN_ROWS089=scopedInfillValue(()=>scope.borrow<Array<{"frames":Array<number>;"paint":Array<number>;"parent":boolean;"signature":string;"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-estimate"|"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building"?:string;"building:levels":string;"building:min_level"?:string;"building:part"?:string;"height"?:string;"layer"?:string;};"type":"Feature";};};}>,Array<{"frames":Array<number>;"paint":Array<number>;"parent":boolean;"signature":string;"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"displayEstimates":{"geometry_detail_lod":number;"height":{"method":string;"status":"display-estimate"|"source-tag-metres";};"meshPrecision":{"float32_render_attributes":boolean;"metric_rounding_m":number;"normals_quantized_1_over_127":boolean;"source_geometry_lossless":boolean;"status":"display-precision";};"minimum":{"status":"display-estimate"|"display-ground-default";};"roof":{"display":string;"source":string;"status":"display-estimate";};"window_pattern":string;};"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building"?:string;"building:levels":string;"building:min_level"?:string;"building:part"?:string;"height"?:string;"layer"?:string;};"type":"Feature";};};}>>(infillOwnDataRefs[0],value=>value));

return {get GALLUSANLAGE8_CHILDREN_ROWS089(){return __infillRead_GALLUSANLAGE8_CHILDREN_ROWS089();}};
});}
export function getGALLUSANLAGE8_CHILDREN_ROWS089(scope:FrozenDataScope|undefined){return getInfillData(scope).GALLUSANLAGE8_CHILDREN_ROWS089;}
export const infillDataFunctionArities={"getGALLUSANLAGE8_CHILDREN_ROWS089":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
