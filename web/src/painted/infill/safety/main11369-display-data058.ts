import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const MAIN11369_DISPLAY_SHA058="90af076a4166902d56a30e701a956ccc13e4b579e59335c9df3952faf0cfc6ab";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"bbef8c9a0953528b2a5aa2dcc1ab325cd1620d0d8856051e8d0ca6afde7585a5",file:"painted/infill/safety/main11369-display-data058.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("main11369-display-data058.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_MAIN11369_DISPLAY_DATA058=scopedInfillValue(()=>scope.borrow<Array<{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"faceReceipt":Array<{"derivedFirstVertex":number;"family":number;"heightM":[number,number];"role":null|string;"sourceFirstVertex":number;}>;"frames":Array<number>;"geometryChanged":boolean;"objectId":string;"partId":string;"selected":Array<{"family":number;"sourceBatchIndex":number;"sourceVertex":number;"vertex":number;}>;"sourceVertexMap":Array<Array<number>>;}>,Array<{"batches":Array<{"color":[number,number,number];"indices":Array<number>;"normals":Array<number>;"positions":Array<number>;}>;"faceReceipt":Array<{"derivedFirstVertex":number;"family":number;"heightM":[number,number];"role":null|string;"sourceFirstVertex":number;}>;"frames":Array<number>;"geometryChanged":boolean;"objectId":string;"partId":string;"selected":Array<{"family":number;"sourceBatchIndex":number;"sourceVertex":number;"vertex":number;}>;"sourceVertexMap":Array<Array<number>>;}>>(infillOwnDataRefs[0],value=>value));

return {get MAIN11369_DISPLAY_DATA058(){return __infillRead_MAIN11369_DISPLAY_DATA058();}};
});}
export function getMAIN11369_DISPLAY_DATA058(scope:FrozenDataScope|undefined){return getInfillData(scope).MAIN11369_DISPLAY_DATA058;}
export const infillDataFunctionArities={"getMAIN11369_DISPLAY_DATA058":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
