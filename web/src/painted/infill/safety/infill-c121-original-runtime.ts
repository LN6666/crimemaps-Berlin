import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from './infill-data-contract';
import * as originalPaintProvider from './c121-original-provider';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {progressiveAdmission,progressivePaintData,applyProgressiveFrames,progressiveRenderStatus,progressiveRenderView,progressivePaintRejections} from './c121-original-provider';
export const infillC121OriginalIdentity=(c:BuildingComponent,scope?:FrozenDataScope)=>!!progressiveAdmission(c,scope);
// Only copy the original four native admissions' original paint; leave all other renderer buffers unchanged.
export function infillC121OriginalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array<ArrayBufferLike>,scope?:FrozenDataScope){
 const original=progressivePaintData(components,scope);let vertices=0;
 for(let i=0;i<original.length;i+=4)if(original[i+3]>.5){paint.set(original.subarray(i,i+4),i);vertices++;}
 applyProgressiveFrames(components,frames,scope);
 return{objects:progressiveRenderView(scope).length,vertices,restoredExistingAcceptedStyle:true,actualVisualAccepted:false};
}
export const infillC121OriginalStatus=(scope?:FrozenDataScope)=>progressiveRenderStatus(scope);
export const infillC121OriginalRejections=(scope?:FrozenDataScope)=>progressivePaintRejections(scope);

export const infillDataRefs=originalPaintProvider.infillDataRefs;
export const infillDataMemoKeys:readonly object[]=[];
export const infillDataDependencies=():readonly InfillDataModule[]=>[originalPaintProvider];
export const infillDataFunctionArities={infillC121OriginalIdentity:1,infillC121OriginalBaseMaterials:3,infillC121OriginalStatus:0,infillC121OriginalRejections:0} as const;

export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 await originalPaintProvider.prepareInfillData(components,signal,scope);
}
