import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const MARIENTURM050_SHA="a10e9bc3b793ddfe1a4ec2620d7b2fde576950efd2eff677cc9b71fa47716d05";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"a10e9bc3b793ddfe1a4ec2620d7b2fde576950efd2eff677cc9b71fa47716d05",file:"painted/infill/safety/marienturm-specific-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("marienturm-specific-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_MARIENTURM050_DATA=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get MARIENTURM050_DATA(){return __infillRead_MARIENTURM050_DATA();}};
});}
export function getMARIENTURM050_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).MARIENTURM050_DATA;}
export const infillDataFunctionArities={"getMARIENTURM050_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
