import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
/** Exact original SOURCE pins and SOURCE-clipped official/photo DISPLAY. */
export type Groups144146Native073={objectId:string;partId:string;city:string;origin:[number,number];geometryJSON:string;sourceFeatureJSON:string;signature:string;fingerprint:string;vertices:number;indices:number;batches:{positions:number[];normals:number[];indices:number[];color:number[];faceRole:string|null}[]};
export type Groups144146Model073={objectId:string;partId:string;origin:[number,number];datumAbsoluteM:number;group:string;batches:{positions:number[];normals:number[];indices:number[];color:[number,number,number];paint:number[];frames:number[];faceRole:'mixed';geometryRole:string}[]};
export const FRANKFURT_GROUPS144146_SHA073="dbd96e4217bc72335414916fab50b3669af420cfa4c5e020137c60bd7ad752d1";



const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"bf14b4159a54ec060cb42fff468d2298982cfa02f7b8181dc88343559096c6ca",file:"painted/infill/safety/frankfurt-groups144146-official073-data.ts",occurrence:0,codec:'json'},{canonicalSHA256:"e4fd8288fc7fc75d46cdb7103bb677e50987b050911300d7e770369c36aef89e",file:"painted/infill/safety/frankfurt-groups144146-official073-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("frankfurt-groups144146-official073-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_FRANKFURT_GROUPS144146_NATIVE073=scopedInfillValue<Groups144146Native073[]>(()=>scope.borrow<Groups144146Native073[],Groups144146Native073[]>(infillOwnDataRefs[0],value=>value));
const __infillRead_FRANKFURT_GROUPS144146_DATA073=scopedInfillValue<Groups144146Model073[]>(()=>scope.borrow<Groups144146Model073[],Groups144146Model073[]>(infillOwnDataRefs[1],value=>value));

return {get FRANKFURT_GROUPS144146_NATIVE073(){return __infillRead_FRANKFURT_GROUPS144146_NATIVE073();},get FRANKFURT_GROUPS144146_DATA073(){return __infillRead_FRANKFURT_GROUPS144146_DATA073();}};
});}
export function getFRANKFURT_GROUPS144146_NATIVE073(scope:FrozenDataScope|undefined){return getInfillData(scope).FRANKFURT_GROUPS144146_NATIVE073;}
export function getFRANKFURT_GROUPS144146_DATA073(scope:FrozenDataScope|undefined){return getInfillData(scope).FRANKFURT_GROUPS144146_DATA073;}
export const infillDataFunctionArities={"getFRANKFURT_GROUPS144146_NATIVE073":0,"getFRANKFURT_GROUPS144146_DATA073":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** SOURCE and DISPLAY are independent original canonical resources. */
export async function prepareFrankfurtGroups144146Native(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{signal.throwIfAborted();await scope.prepare([infillOwnDataRefs[0]],signal);signal.throwIfAborted();}
export async function prepareFrankfurtGroups144146Display(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{signal.throwIfAborted();await scope.prepare([infillOwnDataRefs[1]],signal);signal.throwIfAborted();}
