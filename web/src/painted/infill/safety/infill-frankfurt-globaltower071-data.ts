import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
export const GLOBAL_TOWER_OFFICIAL_PATCH_SHA071="a755da178518e08d20f38922ccfb1edc912dc032727513266dec43491d267be5";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"28c63427a9a4a865a0de53a003038febe2cefae96831c5e215a4c4db985191d1",file:"painted/infill/safety/infill-frankfurt-globaltower071-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-globaltower071-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_GLOBAL_TOWER_OFFICIAL_DATA071=scopedInfillValue(()=>scope.borrow<Array<{"batches":Array<{"color":[number,number,number];"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"families":{"45260":number;"45261":number;"45262":number;"45263":number;"45264":number;"45265":number;};"indexCount":number;"objectId":string;"origin":[number,number];"partId":string;"vertexCount":number;}>,Array<{"batches":Array<{"color":[number,number,number];"frames":Array<number>;"indices":Array<number>;"normals":Array<number>;"paint":Array<number>;"positions":Array<number>;}>;"families":{"45260":number;"45261":number;"45262":number;"45263":number;"45264":number;"45265":number;};"indexCount":number;"objectId":string;"origin":[number,number];"partId":string;"vertexCount":number;}>>(infillOwnDataRefs[0],value=>value));

return {get GLOBAL_TOWER_OFFICIAL_DATA071(){return __infillRead_GLOBAL_TOWER_OFFICIAL_DATA071();}};
});}
export function getGLOBAL_TOWER_OFFICIAL_DATA071(scope:FrozenDataScope|undefined){return getInfillData(scope).GLOBAL_TOWER_OFFICIAL_DATA071;}
export const infillDataFunctionArities={"getGLOBAL_TOWER_OFFICIAL_DATA071":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
