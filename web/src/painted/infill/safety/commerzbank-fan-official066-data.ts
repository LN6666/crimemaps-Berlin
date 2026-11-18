import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const COMMERZBANK_FAN_OFFICIAL_SHA066="3829c114143c70939cd4510229ee9fbb2f1ea1db69febe1a411401352576083d";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"3829c114143c70939cd4510229ee9fbb2f1ea1db69febe1a411401352576083d",file:"painted/infill/safety/commerzbank-fan-official066-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("commerzbank-fan-official066-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_COMMERZBANK_FAN_OFFICIAL_DATA066=scopedInfillValue(()=>scope.borrow<{"batches":Array<{"color":[number,number,number];"frames":Array<number>;"geometryRole":"original-official-GML-clipped-to-exact-SOURCE-roof"|"original-official-GML-clipped-to-exact-SOURCE-wall"|"root-authorized-registration-margin-plane-extension-roof"|"root-authorized-registration-margin-plane-extension-wall"|"root-authorized-registration-margin-two-plane-step-wall";"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"bodies":Array<{"absoluteHeightRangeM":[number,number];"faceIndices":Array<number>;"officialBuildingId":string;"rawGMLSHA256":string;}>;"datumAbsoluteM":number;"objectId":string;"partId":string;},{"batches":Array<{"color":[number,number,number];"frames":Array<number>;"geometryRole":"original-official-GML-clipped-to-exact-SOURCE-roof"|"original-official-GML-clipped-to-exact-SOURCE-wall"|"root-authorized-registration-margin-plane-extension-roof"|"root-authorized-registration-margin-plane-extension-wall"|"root-authorized-registration-margin-two-plane-step-wall";"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"bodies":Array<{"absoluteHeightRangeM":[number,number];"faceIndices":Array<number>;"officialBuildingId":string;"rawGMLSHA256":string;}>;"datumAbsoluteM":number;"objectId":string;"partId":string;}>(infillOwnDataRefs[0],value=>value));

return {get COMMERZBANK_FAN_OFFICIAL_DATA066(){return __infillRead_COMMERZBANK_FAN_OFFICIAL_DATA066();}};
});}
export function getCOMMERZBANK_FAN_OFFICIAL_DATA066(scope:FrozenDataScope|undefined){return getInfillData(scope).COMMERZBANK_FAN_OFFICIAL_DATA066;}
export const infillDataFunctionArities={"getCOMMERZBANK_FAN_OFFICIAL_DATA066":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
