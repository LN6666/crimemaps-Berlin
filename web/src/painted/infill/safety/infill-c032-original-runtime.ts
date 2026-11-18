import * as originalPaintProvider from './c032-original-provider';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import {infillC032OriginalRuntimeMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {getPROGRESSIVE_ADMISSIONS as __infillDataDependency0} from './c032-original-admissions';
import type {Identity,BuildingComponent} from "../../../safety/building-mesh-types";
import {progressiveAdmission,progressivePaintData,applyProgressiveFrames,progressiveRenderStatus,progressiveRenderView,progressivePaintRejections} from './c032-original-provider';


// Only copy the original four native admissions' original paint; leave all other renderer buffers unchanged.
export function infillC032OriginalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array<ArrayBufferLike>,scope?:FrozenDataScope){
 const original=progressivePaintData(components,scope);let vertices=0;
 for(let i=0;i<original.length;i+=4)if(original[i+3]>.5){paint.set(original.subarray(i,i+4),i);vertices++;}
 applyProgressiveFrames(components,frames,scope);
 return{objects:progressiveRenderView(scope).length,vertices,restoredExistingAcceptedStyle:true,actualVisualAccepted:false};
}
export const infillC032OriginalStatus=(scope?:FrozenDataScope)=>progressiveRenderStatus(scope);
export const infillC032OriginalRejections=(scope?:FrozenDataScope)=>progressivePaintRejections(scope);

import * as __infillResourceDependency0 from './c032-original-admissions';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-c032-original-runtime.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_PROGRESSIVE_ADMISSIONS=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_C032_IDENTITIES=scopedInfillValue(()=>new Set(__infillRead_PROGRESSIVE_ADMISSIONS().map(c=>c.objectId+'|'+c.partId)));
const infillC032OriginalIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&__infillRead_C032_IDENTITIES().has(c.objectId+'|'+c.partId);

return {get C032_IDENTITIES(){return __infillRead_C032_IDENTITIES();},infillC032OriginalIdentity};
});}
function getC032_IDENTITIES(scope:FrozenDataScope|undefined){return getInfillData(scope).C032_IDENTITIES;}
export function infillC032OriginalIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillC032OriginalIdentity']>,scope?:FrozenDataScope]){return infillC032OriginalRuntimeMetadata.infillC032OriginalIdentity(args[0]);}
export const infillDataFunctionArities={"infillC032OriginalIdentity":1,"infillC032OriginalBaseMaterials":3,"infillC032OriginalStatus":0,"infillC032OriginalRejections":0} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,originalPaintProvider];

export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 await originalPaintProvider.prepareInfillData(components,signal,scope);
}
