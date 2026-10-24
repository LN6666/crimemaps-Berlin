import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {KAISER18_NATIVE064,KAISER18_OFFICIAL_SHA064,KAISER18_OFFICIAL_DATA064} from './kaiser18-official064-data';
export {KAISER18_OFFICIAL_SHA064} from './kaiser18-official064-data';
const models=new Map<string,(typeof KAISER18_OFFICIAL_DATA064)[number]>(KAISER18_OFFICIAL_DATA064.map(m=>[m.objectId+'|'+m.partId,m]));
const pins=new Map<string,(typeof KAISER18_NATIVE064)[number]>(KAISER18_NATIVE064.map(m=>[m.objectId+'|'+m.partId,m]));
const owned=new WeakMap<BuildingComponent,{fingerprint:string}>();
export function kaiser1820Official064Identity(c:Identity):boolean{return models.has(c.objectId+'|'+c.partId);}
function exactNative(c:BuildingComponent):boolean{
 const r=pins.get(c.objectId+'|'+c.partId);if(!r||c.city!=='frankfurt'||c.origin.length!==2||!r.origin.every((v,i)=>Object.is(v,c.origin[i]))||JSON.stringify(c.componentGeometry)!==r.geometryJSON||JSON.stringify(c.sourceFeature)!==r.sourceFeatureJSON||c.batches.length!==r.batchRoles.length||c.batches.some((b,i)=>(b.faceRole??null)!==r.batchRoles[i]))return false;
 try{const f=ownerDisplayFingerprint(c);return f.vertices===r.vertices&&f.indices===r.indices&&f.fingerprint===r.fingerprint;}catch{return false;}
}
function exactOwned(c:BuildingComponent):boolean{const pin=owned.get(c);if(!pin)return false;try{return ownerDisplayFingerprint(c).fingerprint===pin.fingerprint;}catch{return false;}}
/** Each present exact historic-house SOURCE is independent. No absent neighbour
 * is recovered, no Commerzbank/tower identity is included, and all SOURCE data
 * remain unchanged beside the separate original HVBG LoD2 DISPLAY. */
export function kaiser1820Official064Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},seen=new Set<string>();
 for(const c of components){if(c.city!=='frankfurt'||!kaiser1820Official064Identity(c))continue;const key=c.objectId+'|'+c.partId;if(seen.has(key)){stats.error='Kaiser18/20 duplicate exact SOURCE identity; original rows retained';return{components,stats};}seen.add(key);if(!(owned.has(c)?exactOwned(c):exactNative(c))){stats.error='Kaiser18/20 requires unchanged exact native SOURCE or private unchanged DISPLAY';return{components,stats};}}
 const out=components.map(c=>{if(c.city!=='frankfurt'||!kaiser1820Official064Identity(c)||owned.has(c))return c;const m=models.get(c.objectId+'|'+c.partId)!;const batches=m.batches.map(b=>({positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color] as [number,number,number],paint:[...b.paint],frames:[...b.frames]}));
  const result:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,infillKaiser1820Official064:{patchSHA:KAISER18_OFFICIAL_SHA064,officialBuildingId:m.officialBuildingId,officialDatumAbsoluteM:m.datumAbsoluteM,photoDerivedRoofDetail065:m.photoDerivedRoofDetail065,sourceRetained:true,originalNativeHeightM:12.5,originalNativeHeightWasLevelDerivedEstimate:true,geometrySource:'Original HVBG geometry3DLoD2 plus separately marked photo-derived front roof dormers/end-gable065; no SOURCE edits',groundFacesOmitted:true,actualVisualAccepted:false,detail70Accepted:false,remainingLimits:'Photo-supported Kaiserstrasse street face only. Rear and party elevations are unknown. Front dormers and end gables are bounded author-photo-derived approximations, not official measurements. Rear dormers and precise carved ornament remain unknown; no whole red-frame500 acceptance.'}}};
  owned.set(result,{fingerprint:ownerDisplayFingerprint(result).fingerprint});const v=batches.reduce((n,b)=>n+b.positions.length/3,0),t=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:KAISER18_OFFICIAL_SHA064,vertices:v,triangles:t,geometryRole:'owner-authorized-official-kaiser18-20-historic-display'});return result;
 });return{components:out,stats};
}
/** Packed material attributes only for this module's privately owned unchanged output. */
export function kaiser1820Official064BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw new Error('Invalid Kaiser18/20 packed paint lengths');let at=0,objects=0,vertices=0;
 for(const c of components){const match=exactOwned(c);if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as unknown as {paint:number[]}).paint,at*4);frames.set((b as unknown as {frames:number[]}).frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,actualVisualAccepted:false};
}
