import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {SENCKENBERG_SELECTED_SHA074 as SHA,SENCKENBERG_SELECTED_NATIVE074 as PINS,SENCKENBERG_SELECTED_DATA074 as DATA} from './senckenberg-selected074-data';
const owned=new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export const senckenbergSelected074Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&PINS.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function exactNative(c:BuildingComponent,p:typeof PINS[number]){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&c.origin.length===2&&p.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===p.batchRoles[i])&&f.vertices===p.vertices&&f.indices===p.indices&&f.fingerprint===p.fingerprint;}catch{return false;}}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
/** The two selected SOURCE are separate physical towers, not Marriott wings.
 * Each has its own complete exact guard. Native SOURCE, outline, metadata and
 * original WestendGate6 remain unchanged. This is primary/photo-approx DISPLAY,
 * not surveyed completed LoD2 or an additional principal-count claim. */
export function senckenbergSelected074Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const outputs=new Map<BuildingComponent,BuildingComponent>();
 for(const p of PINS){
  const targets=components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);if(!targets.length)continue;
  if(targets.length!==1){stats.error='Senckenberg selected074 duplicate exact SOURCE identity';continue;}
  const c=targets[0];if(owned.has(c)){if(!exactOwned(c))stats.error='Senckenberg selected074 changed private DISPLAY';continue;}
  if(!exactNative(c,p)){stats.error='Senckenberg selected074 unchanged exact original SOURCE required';continue;}
  let out=cache.get(c);if(out&&!exactOwned(out)){stats.error='Senckenberg selected074 cached private DISPLAY changed';continue;}
  if(!out){
   const entry=DATA[c.partId as keyof typeof DATA],batches:MeshBatch[]=entry.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color]as[number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
   out={...c,batches,displayEstimates:{...c.displayEstimates,senckenbergSelected074:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalSourceHeightEstimatePreserved:true,geometryRole:'own-primary-photo-approx-completed-envelope',ownDescription:entry.description,notMarriottAnnex:true,independentSelectedSource:true,independentPrincipalCountChanged:false,completedOfficialGMLUnavailable:true,finishedHeightsNotInferredFromFoundationGML:true,unknownOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
   owned.set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(entry.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(entry.batches.flatMap(b=>[...b.frames]))});cache.set(c,out);
  }
  outputs.set(c,out);const v=out.batches.reduce((n,b)=>n+b.positions.length/3,0),t=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=p.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:'separate-selected-tower-own-primary-photo-approx-completed-envelope'});
 }
 return{components:outputs.size?components.map(c=>outputs.get(c)??c):components,stats};
}
/** Only authenticated unchanged private output may write these final frames.
 * Public identities, copied markers and cloned output arrays confer no paint. */
export function senckenbergSelected074BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('Senckenberg selected074 exact packed lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('Senckenberg selected074 private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
