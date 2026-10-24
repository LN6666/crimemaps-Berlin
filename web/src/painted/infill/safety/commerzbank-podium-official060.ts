import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {commerzbankPodiumExactNative060} from './commerzbank-podium-native060';
import {COMMERZBANK_PODIUM_OFFICIAL_SHA060,COMMERZBANK_PODIUM_OFFICIAL_DATA060} from './commerzbank-podium-official060-data';
export {COMMERZBANK_PODIUM_OFFICIAL_SHA060} from './commerzbank-podium-official060-data';
const models=new Map<string,(typeof COMMERZBANK_PODIUM_OFFICIAL_DATA060)[number]>(COMMERZBANK_PODIUM_OFFICIAL_DATA060.map(r=>[r.objectId+'|'+r.partId,r]));
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string}>();
export function commerzbankPodiumOfficial060Identity(c:Identity):boolean{return models.has(c.objectId+'|'+c.partId);}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
/** Five verified HVBG solids under two unchanged native SOURCE identities. Ground
 * polygons are omitted from DISPLAY. The existing23 tower/fan/steps are untouched.
 * No estimated source height or generic box is substituted for official levels. */
export function commerzbankPodiumOfficial060Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},seen=new Set<string>();
 const selected=components.filter(c=>c.city==='frankfurt'&&commerzbankPodiumOfficial060Identity(c));
 // The two official groups are independent. Never reconstruct a missing SOURCE or wait for its neighbour.
 for(const c of selected){const key=c.objectId+'|'+c.partId;if(seen.has(key)){stats.error='Commerzbank podium duplicate exact native identity; original rows retained';return{components,stats};}seen.add(key);
  if(!(owned.has(c)?exactOwned(c):commerzbankPodiumExactNative060(c))){stats.error='Commerzbank podium requires unchanged exact native SOURCE or private unchanged official DISPLAY';return{components,stats};}}
 const drawable=components.map(c=>{if(c.city!=='frankfurt'||!commerzbankPodiumOfficial060Identity(c)||owned.has(c))return c;const m=models.get(c.objectId+'|'+c.partId)!;
  const batches=m.batches.map(b=>({positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color] as [number,number,number],frames:[...b.frames],paint:[...b.paint]}));
  const out:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,infillCommerzbankPodiumOfficial060:{patchSHA:COMMERZBANK_PODIUM_OFFICIAL_SHA060,officialBuildingIds:m.officialBodies.map(b=>b.officialBuildingId),officialSharedDatumAbsoluteM:m.officialBodies[0].sharedDatumAbsoluteM,sourceRetained:true,originalNativeHeightMetres:7.5,originalNativeHeightWasUnknownDisplayDefault:true,geometrySource:'HVBG INSPIRE Building geometry3DLoD2; source polygons retained independently',groundFacesOmitted:true,actualVisualAccepted:false,detail70Accepted:false,remainingLimits:'Photographic curved crown/entrance-height transitions and approximately2percent source/official plan discrepancies remain unaccepted; no whole-compound500 completion claim.'}}};
  owned.set(out,{source:c,fingerprint:ownerDisplayFingerprint(out).fingerprint});const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:COMMERZBANK_PODIUM_OFFICIAL_SHA060,vertices,triangles,geometryRole:'owner-authorized-official-podium-display'});return out;
 });return{components:drawable,stats};
}
/** Never trusts a public marker: only this module's privately owned, unchanged
 * clones can write RGBA/family attributes. Original native buffers stay untouched. */
export function commerzbankPodiumOfficial060BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Invalid Commerzbank official podium paint buffer lengths');let at=0,objects=0,vertices=0;
 for(const c of components){const match=exactOwned(c);if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as unknown as {paint:number[]}).paint,at*4);frames.set((b as unknown as {frames:number[]}).frames,at*5);vertices+=n;}at+=n;}}
 return{objects,vertices,actualVisualAccepted:false};
}
