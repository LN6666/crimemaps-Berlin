import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const SCHNEIDER076_SHA="c0de20d418f67403d38dce691ee60c0883f739a5851a79da63722aa87a56fb2c";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"c0de20d418f67403d38dce691ee60c0883f739a5851a79da63722aa87a56fb2c",file:"painted/infill/safety/infill-schneider076-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-schneider076-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_SCHNEIDER076_DATA=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get SCHNEIDER076_DATA(){return __infillRead_SCHNEIDER076_DATA();}};
});}
export function getSCHNEIDER076_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).SCHNEIDER076_DATA;}
export const infillDataFunctionArities={"getSCHNEIDER076_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
