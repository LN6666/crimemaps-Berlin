import type {BuildingComponent} from './building-mesh-renderer';
import {progressiveAdmission,progressivePaintData,applyProgressiveFrames,progressiveRenderStatus,progressivePaintRejections} from './c121-original-provider';
export const infillC121OriginalIdentity=(c:BuildingComponent)=>!!progressiveAdmission(c);
// Only copy the original four native admissions' original paint; leave all other renderer buffers unchanged.
export function infillC121OriginalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const original=progressivePaintData(components);let vertices=0;
 for(let i=0;i<original.length;i+=4)if(original[i+3]>.5){paint.set(original.subarray(i,i+4),i);vertices++;}
 applyProgressiveFrames(components,frames);
 return{objects:progressiveRenderStatus().length,vertices,restoredExistingAcceptedStyle:true,actualVisualAccepted:false};
}
export const infillC121OriginalStatus=progressiveRenderStatus;
export const infillC121OriginalRejections=progressivePaintRejections;
