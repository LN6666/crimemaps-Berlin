import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerF137Identity,ownerF137Reconstruction,ownerF137BaseMaterials} from './owner-f137-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {HBF075_PATCH_SHA,HBF075_OLD_PATCH,HBF075_ROWS,HBF075_PINS} from './infill-frankfurt-hbf075-data';
export {HBF075_PATCH_SHA} from './infill-frankfurt-hbf075-data';
type Batch=MeshBatch&{paint:number[];frames:number[];writeMask:boolean[];role:number};
const key=(c:Identity)=>c.objectId+'|'+c.partId,rows=new Map(HBF075_ROWS.map(r=>[key(r),r])),pins=new Map(HBF075_PINS.map(r=>[key(r),r]));
const owned=new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string}>();
export const frankfurtHbf075Identity=ownerF137Identity;
function exactOwned(c:BuildingComponent){const p=owned.get(c);if(!p)return false;try{return c.city==='frankfurt'&&ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&(rows.has(key(c))?(c.displayEstimates?.infillFrankfurtHbf075 as{patchSHA?:string}|undefined)?.patchSHA===HBF075_PATCH_SHA:(c.displayEstimates?.F137Exterior as{patchSHA?:string}|undefined)?.patchSHA===HBF075_OLD_PATCH)&&ownerDisplayFingerprint(p.source).fingerprint===pins.get(key(c))?.sourceFingerprint.fingerprint;}catch{return false;}}
function exactOldOutput(c:BuildingComponent){const pin=pins.get(key(c));try{return !!pin&&(c.displayEstimates?.F137Exterior as{patchSHA?:string}|undefined)?.patchSHA===HBF075_OLD_PATCH&&ownerDisplayFingerprint(c).fingerprint===pin.oldOutputFingerprint.fingerprint;}catch{return false;}}
/** Replaces the F137 reconstruction call, and calls its unchanged exact SOURCE
 * implementation once.17 SOURCEs/five vaults/aliases and existing front assets
 * survive. Each loaded carrier is independent; no absent native parent is made.
 */
export function frankfurtHbf075Reconstruction(components:BuildingComponent[]):{components:BuildingComponent[];stats:OwnerReconstructionStats}{
 for(const c of components)if(owned.has(c)&&!exactOwned(c))return{components,stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[],error:'Changed private Hbf075 DISPLAY'}};
 const source=components.map(c=>owned.get(c)?.source??c),base=ownerF137Reconstruction(source),stats={...base.stats,components:base.stats.components.map(r=>({...r}))};
 const out=base.components.map((c,i)=>{const d=rows.get(key(c));if(!exactOldOutput(c))return c;const previous=components[i];if(owned.has(previous)&&exactOwned(previous))return previous;if(!d){owned.set(c,{source:source[i],fingerprint:ownerDisplayFingerprint(c).fingerprint});return c;}
  const batches:Batch[]=[];
  for(const f of d.retainedCentralFilters){const b=c.batches.find(b=>(b as Batch).role===f.role)as Batch|undefined;if(!b||b.positions.length/3!==f.expectedOriginalVertices)throw Error('Hbf075 original central batch changed');const copy=(a:ArrayLike<number>,stride:number)=>{const out:number[]=[];for(const i of f.oldVertexIndices)for(let j=0;j<stride;j++)out.push(a[i*stride+j]);return out;};const q:Batch={...b,positions:[...copy(b.positions,3),...f.append.positions],normals:[...copy(b.normals,3),...f.append.normals],indices:[...f.indices],color:[...b.color]as[number,number,number],paint:[...copy(b.paint,4),...f.append.paint],frames:[...copy(b.frames,5),...f.append.frames],writeMask:[...f.oldVertexIndices.map(i=>b.writeMask[i]),...f.append.writeMask]};if(f.upgradeCentralStoneFamily)for(let j=4;j<q.frames.length;j+=5)q.frames[j]=45420;batches.push(q);}
  for(const b of c.batches)if(d.retainedWholeOldAssetRoles.includes((b as Batch).role))batches.push(b as Batch);
  for(const b of d.measuredBatches)batches.push({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color]as[number,number,number],paint:[...b.paint],frames:[...b.frames],writeMask:[...b.writeMask],faceRole:b.faceRole as 'wall'|'roof'});
  const original=source[i],result:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,F137Exterior:{...(c.displayEstimates?.F137Exterior as Record<string,unknown>),patchSHA:HBF075_PATCH_SHA,originalAcceptedPatchSHA:HBF075_OLD_PATCH},infillFrankfurtHbf075:{patchSHA:HBF075_PATCH_SHA,sourceRetained:true,sourceGeometryAltered:false,original17SourceContract:true,originalParentGetterStillAbsent:true,centralPhotoBarrelAndFiveNativeVaultsRetained:true,originalClockDBLettersSculptureGeometryAndRegistrationUnchanged:true,flatCentralOfficialPrototypeRejected:true,smallCarrierRoofWallBatchOrderBugCorrectedByRealNormals:true,officialLowWingDatumM:100.113,actualGroundDifferencesRetained:true,registrationMarginsExplicitApproximation:true,unknownOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
  owned.set(result,{source:original,fingerprint:ownerDisplayFingerprint(result).fingerprint});return result;
 });
 for(const r of stats.components){const c=out.find(c=>key(c)===key(r));if(!c||!owned.has(c)||!rows.has(key(c)))continue;const f=ownerDisplayFingerprint(c);r.patchSHA256=HBF075_PATCH_SHA;r.vertices=f.vertices;r.triangles=f.indices/3;r.geometryRole='owner-authorized-Hbf075-measured-low-wings-with-retained-photo-front';}
 stats.vertices=stats.components.reduce((n,r)=>n+r.vertices,0);stats.triangles=stats.components.reduce((n,r)=>n+r.triangles,0);stats.objects=stats.components.filter(r=>r.vertices>0).length;return{components:out,stats};
}
/** Replace original F137 materials hook. Its accepted writers are preserved;
 * new public DISPLAY clones cannot acquire this private output ownership.
 */
export function frankfurtHbf075BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 for(const c of components)if(owned.has(c)&&!exactOwned(c))throw Error('Changed private Hbf075 materials');
 const safe=components.map(c=>!owned.has(c)&&(c.displayEstimates?.infillFrankfurtHbf075||rows.has(key(c))&&c.displayEstimates?.F137Exterior&&!exactOldOutput(c))?{...c,displayEstimates:{...c.displayEstimates,F137Exterior:undefined}}:c);return ownerF137BaseMaterials(safe,paint,frames);
}
