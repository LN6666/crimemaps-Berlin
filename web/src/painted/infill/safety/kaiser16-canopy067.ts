import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {KAISER16_CANOPY_SHA067 as SHA,KAISER16_CANOPY_NATIVE067 as PIN,KAISER16_CANOPY_DATA067 as DATA} from './kaiser16-canopy067-data';
const owned=new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export const kaiser16Canopy067Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PIN.objectId&&c.partId===PIN.partId;
function exactNative(c:BuildingComponent){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&nativePaintSignature(c)===PIN.signature&&c.origin.length===2&&PIN.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===PIN.geometryJSON&&JSON.stringify(c.sourceFeature)===PIN.sourceFeatureJSON&&c.batches.length===PIN.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===PIN.batchRoles[i])&&f.vertices===PIN.vertices&&f.indices===PIN.indices&&f.fingerprint===PIN.fingerprint;}catch{return false;}}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
/** Kaiser16 is SOURCE building=roof, not an office-wall or an invented bank relation.
 * Keep the SOURCE roof plan; use the matched upper GML plane and a separately recorded
 * registration margin, thin perimeter frame and only the photo-visible upper glass screen.
 * Retire the schematic enclosed0..7.5m DISPLAY walls: the entrance below stays open. */
export function kaiser16Canopy067Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(kaiser16Canopy067Identity);
 if(!targets.length)return{components,stats};if(targets.length!==1){stats.error='Kaiser16 canopy duplicate exact SOURCE';return{components,stats};}
 const source=targets[0];if(owned.has(source)){if(!exactOwned(source))stats.error='Kaiser16 private DISPLAY changed';return{components,stats};}
 if(!exactNative(source)){stats.error='Kaiser16 canopy unchanged exact SOURCE required';return{components,stats};}
 let out=cache.get(source);if(out&&!exactOwned(out)){stats.error='Kaiser16 cached DISPLAY changed';return{components,stats};}
 if(!out){
  const batches:MeshBatch[]=DATA.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
  out={...source,batches,displayEstimates:{...source.displayEstimates,kaiser16Canopy067:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalNativeHeightM:7.5,originalHeightWasUnknownEstimate:true,geometryRole:'photo-supported-upper-glass-canopy-and-suspended-screen-open-entry-below',officialRoofAbsoluteM:118.89,sharedKaiserDatumAbsoluteM:98.701,roofDisplayM:20.189,measuredSamePlanePlanCoverage:'93.0045percent from storedbMiu/bMiE roof planes',registrationMargin:'6.9955percent originalSOURCE roof plan extends the same horizontal plane; explicitDISPLAY approximation,not originalGML or inheritedfan066margin',screenLowerEdge:'8.10m photographic estimate,not surveyed floor',groundAndLowPlatformOmitted:true,otherPartsChanged:false,actualVisualAccepted:false,quality500Accepted:false}}};
  owned.set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(DATA.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(DATA.batches.flatMap(b=>[...b.frames]))});cache.set(source,out);
 }
 stats.objects=1;stats.vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=PIN.vertices;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'upper-canopy-suspended-glass-screen-open-below'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
/** Only private exact output can write packed45300/1/2. Public IDs/markers cannot grant paint. */
export function kaiser16Canopy067BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('Kaiser16 exact packed buffer lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('Kaiser16 private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
