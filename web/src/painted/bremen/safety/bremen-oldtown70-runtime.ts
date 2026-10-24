import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {BREMEN_OLDTOWN70_DATA,BREMEN_OLDTOWN70_SHA} from './oldtown70-data';

const MODELS:any[]=BREMEN_OLDTOWN70_DATA.models;
const frozen=new Set(BREMEN_OLDTOWN70_DATA.frozenExcluded);
function nativeArray(value:string,uint=false){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/4},(_,i)=>uint?v.getUint32(i*4,true):v.getFloat32(i*4,true));}
function exact(c:BuildingComponent,r:any){return c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature;}
export const infillBremenOldtown70Identity=(c:Identity)=>!frozen.has(c.objectId)&&MODELS.some(m=>m.sourceBinding.objectId===c.objectId&&m.sourceBinding.partId===c.partId||m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));

/**
 * Call only in the independent paint DISPLAY path. SOURCE/white path uses input unchanged.
 * Additive parents missing from native are admitted only with the exact source-authority SHA.
 * Per-target all-or-none signature guard prevents a partially loaded group erasing siblings.
 */
export function infillBremenOldtown70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],sourceAuthoritySHA256?:string){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const ready=MODELS.filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.geometryReadyForPreview&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r)).length===1)&&(!m.sourceBinding.nativeParentAbsent||sourceAuthoritySHA256===BREMEN_OLDTOWN70_DATA.sourceAuthoritySHA256));
 const clone=(d:any)=>d.batches.map((b:any)=>({...b,positions:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.positions):[...b.positions],normals:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.normals):[...b.normals],indices:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.indices,true):[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const mark=(c:any,m:any,d:any)=>{const batches=clone(d),vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:BREMEN_OLDTOWN70_SHA,vertices,triangles,geometryRole:d.originalNativeGeometryUnchanged?'exact-native-geometry-with-source-specific-paint':'exact-source-footprint-photo-estimated-independent-display'});return {...c,origin:[...d.origin],batches,displayEstimates:{...c.displayEstimates,infillBremenOldtown70:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN70_SHA,sourceRetained:true,sourceAuthoritySHA256:BREMEN_OLDTOWN70_DATA.sourceAuthoritySHA256,originalNativeGeometryUnchanged:!!d.originalNativeGeometryUnchanged,displayEstimate:!d.originalNativeGeometryUnchanged,detailTarget:.7,actualVisualAccepted:false}}};};
 const result=components.map(c=>{if(c.city!=='bremen'||frozen.has(c.objectId))return c;const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);if(d)return mark(c,m,d);if(m.sourceBinding.nativeParentAbsent&&!m.suppressCoveredNativeSiblings)return c;return {...c,batches:[],displayEstimates:{...c.displayEstimates,infillBremenOldtown70Suppressed:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN70_SHA,reason:'Exact source sibling covered by independently painted parent DISPLAY; original input arrays retained and white path unchanged'}}};});
 for(const m of ready.filter(m=>m.sourceBinding.nativeParentAbsent)){
  // No source-native mesh is fabricated. This explicit DISPLAY component carries original source geometry/tags.
  if(result.some(c=>c.city==='bremen'&&c.objectId===m.sourceBinding.objectId&&c.partId===m.sourceBinding.partId))continue;
  for(const d of m.displays){const sourceBound:any={city:'bremen',objectId:d.objectId,partId:d.partId,origin:d.origin,componentGeometry:m.componentGeometry,sourceFeature:m.sourceFeature,batches:[],displayEstimates:{sourceNativeMeshAbsent:true,sourceRecordSHA256:m.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:BREMEN_OLDTOWN70_DATA.sourceAuthoritySHA256}};result.push(mark(sourceBound,m,d));}
 }
 return {components:result,stats};
}
export function infillBremenOldtown70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&!!c.displayEstimates?.infillBremenOldtown70;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){const bp=(b as any).paint,bf=(b as any).frames;for(let i=0;i<count;i++){paint.set([bp[i*4],bp[i*4+1],bp[i*4+2],2],(offset+i)*4);frames.set([bf[i*5],bf[i*5+1],bf[i*5+2],bf[i*5+3],bp[i*4+3]],(offset+i)*5);}vertices+=count;}offset+=count;}}return {objects,vertices,actualVisualAccepted:false};}
