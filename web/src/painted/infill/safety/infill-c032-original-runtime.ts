import {PROGRESSIVE_ADMISSIONS} from './c032-original-admissions';
import type {Identity,BuildingComponent} from './building-mesh-renderer';
import {progressiveAdmission,progressivePaintData,applyProgressiveFrames,progressiveRenderStatus,progressivePaintRejections} from './c032-original-provider';
const C032_IDENTITIES=new Set(PROGRESSIVE_ADMISSIONS.map(c=>c.objectId+'|'+c.partId));
export const infillC032OriginalIdentity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='essen')&&C032_IDENTITIES.has(c.objectId+'|'+c.partId);
// Only copy the original four native admissions' original paint; leave all other renderer buffers unchanged.
export function infillC032OriginalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const original=progressivePaintData(components);let vertices=0;
 for(let i=0;i<original.length;i+=4)if(original[i+3]>.5){paint.set(original.subarray(i,i+4),i);vertices++;}
 applyProgressiveFrames(components,frames);
 return{objects:progressiveRenderStatus().length,vertices,restoredExistingAcceptedStyle:true,actualVisualAccepted:false};
}
export const infillC032OriginalStatus=progressiveRenderStatus;
export const infillC032OriginalRejections=progressivePaintRejections;
