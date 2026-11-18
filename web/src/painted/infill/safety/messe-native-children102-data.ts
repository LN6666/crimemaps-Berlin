import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
/** Eight actual native Messeturm children, originally missing material binding. Geometry is a SOURCE guard only. */
export const MESSE_CHILD_MATERIAL_PATCH102="3be7a9ce76e684b15369ed651ded246d2059f4b980a9a09102081f973c3f4ab0";
export const MESSE_PARENT_ORIGIN102=[8.6527169,50.1123769] as const;


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"f6ac163d272b9cb106edf48efb15a2780c8b28432a5853e04c464de933f88a52",file:"painted/infill/safety/messe-native-children102-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("messe-native-children102-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_MESSE_CHILD_SOURCES102=scopedInfillValue(()=>scope.borrow<Array<{"family":number;"objectId":string;"partId":string;"roofRGB":[number,number,number];"signature":string;"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building:colour"?:string;"building:facade:material"?:string;"building:material"?:string;"building:part":string;"height":string;"min_height"?:string;"note"?:string;"roof:colour"?:string;"roof:height"?:string;"roof:material"?:string;"roof:shape"?:string;"seamark:landmark:conspicuity"?:string;"seamark:landmark:name"?:string;"seamark:type"?:string;"source"?:string;};"type":"Feature";};};"wallRGB":[number,number,number];}>,Array<{"family":number;"objectId":string;"partId":string;"roofRGB":[number,number,number];"signature":string;"source":{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"city":"frankfurt";"componentGeometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"objectId":string;"origin":[number,number];"partId":string;"sourceFeature":{"geometry":{"coordinates":Array<Array<[number,number]>>;"type":"Polygon";};"id":string;"properties":{"building:colour"?:string;"building:facade:material"?:string;"building:material"?:string;"building:part":string;"height":string;"min_height"?:string;"note"?:string;"roof:colour"?:string;"roof:height"?:string;"roof:material"?:string;"roof:shape"?:string;"seamark:landmark:conspicuity"?:string;"seamark:landmark:name"?:string;"seamark:type"?:string;"source"?:string;};"type":"Feature";};};"wallRGB":[number,number,number];}>>(infillOwnDataRefs[0],value=>value));

return {get MESSE_CHILD_SOURCES102(){return __infillRead_MESSE_CHILD_SOURCES102();}};
});}
export function getMESSE_CHILD_SOURCES102(scope:FrozenDataScope|undefined){return getInfillData(scope).MESSE_CHILD_SOURCES102;}
export const infillDataFunctionArities={"getMESSE_CHILD_SOURCES102":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
