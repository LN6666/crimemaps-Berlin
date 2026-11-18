import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const LOW_OFFICE_SHA="024b2add1a236edd82f12e655b4f092ef498b77d8b7c213331b65cfe0fd2638c";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"024b2add1a236edd82f12e655b4f092ef498b77d8b7c213331b65cfe0fd2638c",file:"painted/infill/safety/infill-frankfurt-vci051-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-vci051-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_LOW_OFFICE_DATA=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get LOW_OFFICE_DATA(){return __infillRead_LOW_OFFICE_DATA();}};
});}
export function getLOW_OFFICE_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).LOW_OFFICE_DATA;}
export const infillDataFunctionArities={"getLOW_OFFICE_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
