import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {WESTSTRIP253_SHA067 as SHA,WESTSTRIP253_NATIVE067 as PIN,WESTSTRIP253_DATA067 as DATA} from './weststrip253-measured067-data';
const owned=new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export const weststrip253Measured067Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PIN.objectId&&c.partId===PIN.partId;
function exactNative(c:BuildingComponent){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&nativePaintSignature(c)===PIN.signature&&c.origin.length===2&&PIN.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===PIN.geometryJSON&&JSON.stringify(c.sourceFeature)===PIN.sourceFeatureJSON&&c.batches.length===PIN.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===PIN.batchRoles[i])&&f.vertices===PIN.vertices&&f.indices===PIN.indices&&f.fingerprint===PIN.fingerprint;}catch{return false;}}
function exactOwned(c:BuildingComponent){const r=owned.get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
/** Only exact SOURCE174490253 is replaced by privately owned measured DISPLAY.
 * Verified low roofs and near-ground apron keep their independent absolute heights.
 * The DOP-supported recess stays open with no invented roof/floor; unknown walls
 * keep native RGB. No bank name, high-tower assignment or SOURCE mutation. */
export function weststrip253Measured067Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(weststrip253Measured067Identity);
 if(!targets.length)return{components,stats};if(targets.length!==1){stats.error='West-strip measured partition duplicate exact SOURCE';return{components,stats};}
 const source=targets[0];if(owned.has(source)){if(!exactOwned(source))stats.error='West-strip private DISPLAY changed';return{components,stats};}
 if(!exactNative(source)){stats.error='West-strip measured partition unchanged exact SOURCE required';return{components,stats};}
 let out=cache.get(source);if(out&&!exactOwned(out)){stats.error='West-strip cached DISPLAY changed';return{components,stats};}
 if(!out){
  const batches:MeshBatch[]=DATA.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
  out={...source,batches,displayEstimates:{...source.displayEstimates,weststrip253Measured067:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalNativeHeightM:7.5,originalHeightWasUnknownEstimate:true,geometryRole:'measured-low-roofs-and-near-ground-apron-open-recess',datumAbsoluteM:98.701,unfilledDarkRecessAreaM2:13.597768226909935,unknownBottomNotGenerated:true,highTowerBindingExcluded:true,unknownWallsUseNativeRGB:true,otherPartsChanged:false,actualVisualAccepted:false,quality500Accepted:false}}}
  owned.set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(DATA.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(DATA.batches.flatMap(b=>[...b.frames]))});cache.set(source,out);
 }
 stats.objects=1;stats.vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=PIN.vertices;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'measured-low-roofs-near-ground-apron-and-open-recess'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
/** Only private exact output can write packed45310/1/2. Public IDs/markers cannot grant paint. */
export function weststrip253Measured067BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('West-strip exact packed buffer lengths required');
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('West-strip private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=owned.get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
