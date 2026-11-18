import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
/** Exact SOURCE and original wall triangles; balcony dimensions are photo approximations. */


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"79211c514ba7e3169c35b255bc7076a546b390617ede3aeed6f6ff70a0aa9233",file:"painted/infill/safety/handelshof-balconies103-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("handelshof-balconies103-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_HANDELSHOF_BALCONIES103_DATA=scopedInfillValue(()=>scope.borrow<{"city":"essen";"family":number;"groups":Array<{"officialFace":number;"officialPart":string;"triangles":Array<Array<Array<number>>>;"u":[number,number];"west":boolean;}>;"marker":number;"objectId":string;"oldPatch":string;"partId":string;"photoApprox":{"eastU":[number,number];"existingMainWindowRow":number;"existingUpperRowPreserved":number;"heightUncertainty":number;"hostTop":number;"noOutwardGeometry":boolean;"notMeasured":boolean;"railBase":number;"railSpacing":number;"railTop":number;"stoneBase":number;"stoneTop":number;"uUncertainty":number;"westU":[number,number];};"sourceKeys":Array<string>;"sourceSignature":string;"sourceSnapshot":string;},{"city":"essen";"family":number;"groups":Array<{"officialFace":number;"officialPart":string;"triangles":Array<Array<Array<number>>>;"u":[number,number];"west":boolean;}>;"marker":number;"objectId":string;"oldPatch":string;"partId":string;"photoApprox":{"eastU":[number,number];"existingMainWindowRow":number;"existingUpperRowPreserved":number;"heightUncertainty":number;"hostTop":number;"noOutwardGeometry":boolean;"notMeasured":boolean;"railBase":number;"railSpacing":number;"railTop":number;"stoneBase":number;"stoneTop":number;"uUncertainty":number;"westU":[number,number];};"sourceKeys":Array<string>;"sourceSignature":string;"sourceSnapshot":string;}>(infillOwnDataRefs[0],value=>value));

return {get HANDELSHOF_BALCONIES103_DATA(){return __infillRead_HANDELSHOF_BALCONIES103_DATA();}};
});}
export function getHANDELSHOF_BALCONIES103_DATA(scope:FrozenDataScope|undefined){return getInfillData(scope).HANDELSHOF_BALCONIES103_DATA;}
export const infillDataFunctionArities={"getHANDELSHOF_BALCONIES103_DATA":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
