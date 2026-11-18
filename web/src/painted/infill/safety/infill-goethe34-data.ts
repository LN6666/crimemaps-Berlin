import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const GOETHE34_SHA="f37332afb47d4fa7d1023060be8dbecf1cb8059d6e0ff14abb1a88a9823e25d0";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"f37332afb47d4fa7d1023060be8dbecf1cb8059d6e0ff14abb1a88a9823e25d0",file:"painted/infill/safety/infill-goethe34-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-goethe34-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_GOETHE34_DATA=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get GOETHE34_DATA(){return __infillRead_GOETHE34_DATA();}};
});}
export function getGOETHE34_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).GOETHE34_DATA;}
export const infillDataFunctionArities={"getGOETHE34_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
