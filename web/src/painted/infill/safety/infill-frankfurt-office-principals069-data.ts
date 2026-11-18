import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
type OfficeSurfaceFrame069={batchIndex:number;firstVertex:number;vertexCount:number;family:number;uAxis:number[];vAxis:number[];uOrigin:number;vOrigin:number;width:number;height:number};
export type OfficeNativeRow069={city:string;objectId:string;partId:string;name:string;origin:number[];componentGeometry:unknown;sourceFeature:unknown;signature:string;vertexCount:number;indexCount:number;batches:{positions:number[];normals:number[];indices:number[];color:number[];faceRole:string|null}[];admission:{surfaceFrames:OfficeSurfaceFrame069[]}};
export const FRANKFURT_OFFICE_PRINCIPALS_SHA069="7b61d50df767ddae85d0d124917eb18062824d1c33c3256be82f0cca42d35883";


const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"105cec6479b4f08a501732b22abf2476db0aeabbfb8fb19431b8ff8c19f026f1",file:"painted/infill/safety/infill-frankfurt-office-principals069-data.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-office-principals069-data.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_FRANKFURT_OFFICE_PRINCIPALS_DATA069=scopedInfillValue<OfficeNativeRow069[]>(()=>scope.borrow<OfficeNativeRow069[],OfficeNativeRow069[]>(infillOwnDataRefs[0],value=>value));

return {get FRANKFURT_OFFICE_PRINCIPALS_DATA069(){return __infillRead_FRANKFURT_OFFICE_PRINCIPALS_DATA069();}};
});}
export function getFRANKFURT_OFFICE_PRINCIPALS_DATA069(scope:FrozenDataScope|undefined){return getInfillData(scope).FRANKFURT_OFFICE_PRINCIPALS_DATA069;}
export const infillDataFunctionArities={"getFRANKFURT_OFFICE_PRINCIPALS_DATA069":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

/** Invoked only after a consumer has selected this exact payload phase. */
export async function prepareInfillDataPayload(signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();await scope.prepare(infillOwnDataRefs,signal);signal.throwIfAborted();
}
