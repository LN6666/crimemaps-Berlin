import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const OMNITURM_SHA="b2deef6f56e54183b1121b2c143f92fae515fd2def53d2d0b6b9903b0a837483";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"b2deef6f56e54183b1121b2c143f92fae515fd2def53d2d0b6b9903b0a837483",file:"painted/infill/safety/infill-omniturm-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-omniturm-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_OMNITURM_DATA=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get OMNITURM_DATA(){return __infillRead_OMNITURM_DATA();}};
});}
export function getOMNITURM_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).OMNITURM_DATA;}
export const infillDataFunctionArities={"getOMNITURM_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
