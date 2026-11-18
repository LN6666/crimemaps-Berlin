import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';

export const PROGRESSIVE_INPUT_SHA="7da78c3156384cbe2b15916ef730aa580310bd2dc64e63f747f2721830631a35";

const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"1ad26874c7a52a4f5a5419e24a60785d90aa87a1bf4787de699a6acba73b177a",file:"painted/infill/safety/c032-original-admissions.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("c032-original-admissions.ts requires a prepared FrozenDataScope");

const read=()=>scope.borrow<Array<{"batchColors":{"0":[number,number,number];"1":[number,number,number];"2"?:[number,number,number];};"city":"essen";"descriptionSHA256":string;"family":number;"geometrySignature":string;"mode":"simplified";"objectId":string;"origin":[number,number];"ownerSelectedMaterialPriority":boolean;"partId":string;"surfaceFrames":Array<{"batchIndex":number;"family":number;"firstVertex":number;"height":number;"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;"tier":number;}>,Array<{"batchColors":{"0":[number,number,number];"1":[number,number,number];"2"?:[number,number,number];};"city":"essen";"descriptionSHA256":string;"family":number;"geometrySignature":string;"mode":"simplified";"objectId":string;"origin":[number,number];"ownerSelectedMaterialPriority":boolean;"partId":string;"surfaceFrames":Array<{"batchIndex":number;"family":number;"firstVertex":number;"height":number;"uAxis":[number,number,number];"uOrigin":number;"vAxis":[number,number,number];"vOrigin":number;"vertexCount":number;"width":number;}>;"tier":number;}>>(infillOwnDataRefs[0],value=>value);

// Borrow the prepared table directly; an accessor does not construct a copy
// of every geometry payload retained by this scope.
return {get PROGRESSIVE_ADMISSIONS(){return read();}};
}
export function getPROGRESSIVE_ADMISSIONS(scope:FrozenDataScope|undefined){return getInfillData(scope).PROGRESSIVE_ADMISSIONS;}
export const infillDataFunctionArities={"getPROGRESSIVE_ADMISSIONS":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
