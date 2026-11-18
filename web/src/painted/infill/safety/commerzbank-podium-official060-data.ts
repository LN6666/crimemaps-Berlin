import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const COMMERZBANK_PODIUM_OFFICIAL_SHA060="6b4a7af38918f63bb5f77beb2a97013319d825df910678acf22002e8fa8871fc";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"6b4a7af38918f63bb5f77beb2a97013319d825df910678acf22002e8fa8871fc",file:"painted/infill/safety/commerzbank-podium-official060-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("commerzbank-podium-official060-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_COMMERZBANK_PODIUM_OFFICIAL_DATA060=scopedInfillValue(()=>scope.borrow<Array<{"batches":Array<{"color":[number,number,number];"family":number;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"objectId":string;"officialBodies":Array<{"absoluteHeightRange":[number,number];"emittedFaces":Array<number>;"groundFacesOmitted":Array<number>;"officialBuildingId":string;"relativeHeightSpanM":number;"sharedDatumAbsoluteM":number;}>;"partId":string;}>,Array<{"batches":Array<{"color":[number,number,number];"family":number;"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"objectId":string;"officialBodies":Array<{"absoluteHeightRange":[number,number];"emittedFaces":Array<number>;"groundFacesOmitted":Array<number>;"officialBuildingId":string;"relativeHeightSpanM":number;"sharedDatumAbsoluteM":number;}>;"partId":string;}>>(infillOwnDataRefs[0],value=>value));

return {get COMMERZBANK_PODIUM_OFFICIAL_DATA060(){return __infillRead_COMMERZBANK_PODIUM_OFFICIAL_DATA060();}};
});}
export function getCOMMERZBANK_PODIUM_OFFICIAL_DATA060(scope:FrozenDataScope|undefined){return getInfillData(scope).COMMERZBANK_PODIUM_OFFICIAL_DATA060;}
export const infillDataFunctionArities={"getCOMMERZBANK_PODIUM_OFFICIAL_DATA060":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
