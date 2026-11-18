import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"44025c321657fc90b9fc058e96da0c760cfe4624b328e02ad76f5acf66a7e98f",file:"painted/infill/safety/infill-silberturm-full051-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-silberturm-full051-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_SILBERTURM_DISPLAY_050=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));

return {get SILBERTURM_DISPLAY_050(){return __infillRead_SILBERTURM_DISPLAY_050();}};
});}
export function getSILBERTURM_DISPLAY_050(scope:FrozenDataScope|undefined){return getInfillData(scope).SILBERTURM_DISPLAY_050;}
export const infillDataFunctionArities={"getSILBERTURM_DISPLAY_050":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
