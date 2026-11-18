import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {ownerF137Identity,ownerF137Reconstruction as __infillRootFunction0,ownerF137BaseMaterials} from './owner-f137-reconstruction';
import * as __infillRootDependency0 from './owner-f137-reconstruction';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {HBF075_PATCH_SHA,HBF075_OLD_PATCH,getHBF075_ROWS as __infillDataDependency0,HBF075_PINS} from './infill-frankfurt-hbf075-data';
export {HBF075_PATCH_SHA} from './infill-frankfurt-hbf075-data';
type Batch=MeshBatch&{paint:number[];frames:number[];writeMask:boolean[];role:number};
const key=(c:Identity)=>c.objectId+'|'+c.partId;

export const frankfurtHbf075Identity=ownerF137Identity;


/** Replaces the F137 reconstruction call, and calls its unchanged exact SOURCE
 * implementation once.17 SOURCEs/five vaults/aliases and existing front assets
 * survive. Each loaded carrier is independent; no absent native parent is made.
 */

/** Replace original F137 materials hook. Its accepted writers are preserved;
 * new public DISPLAY clones cannot acquire this private output ownership.
 */


import * as __infillResourceDependency0 from './infill-frankfurt-hbf075-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-hbf075.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const ownerF137Reconstruction=(...args:Parameters<typeof __infillRootFunction0>)=>__infillRootFunction0(args[0],scope);

const __infillRead_HBF075_ROWS=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_rows=scopedInfillValue(()=>new Map(__infillRead_HBF075_ROWS().map(r=>[key(r),r]))),__infillRead_pins=scopedInfillValue(()=>new Map(HBF075_PINS.map(r=>[key(r),r])));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;fingerprint:string}>());
function exactOwned(c:BuildingComponent){const p=__infillRead_owned().get(c);if(!p)return false;try{return c.city==='frankfurt'&&ownerDisplayFingerprint(c).fingerprint===p.fingerprint&&(__infillRead_rows().has(key(c))?(c.displayEstimates?.infillFrankfurtHbf075 as{patchSHA?:string}|undefined)?.patchSHA===HBF075_PATCH_SHA:(c.displayEstimates?.F137Exterior as{patchSHA?:string}|undefined)?.patchSHA===HBF075_OLD_PATCH)&&ownerDisplayFingerprint(p.source).fingerprint===__infillRead_pins().get(key(c))?.sourceFingerprint.fingerprint;}catch{return false;}}
function exactOldOutput(c:BuildingComponent){const pin=__infillRead_pins().get(key(c));try{return !!pin&&(c.displayEstimates?.F137Exterior as{patchSHA?:string}|undefined)?.patchSHA===HBF075_OLD_PATCH&&ownerDisplayFingerprint(c).fingerprint===pin.oldOutputFingerprint.fingerprint;}catch{return false;}}
function frankfurtHbf075Reconstruction(components:BuildingComponent[]):{components:BuildingComponent[];stats:OwnerReconstructionStats}{
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))return{components,stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[],error:'Changed private Hbf075 DISPLAY'}};
 const source=components.map(c=>__infillRead_owned().get(c)?.source??c),base=ownerF137Reconstruction(source),stats={...base.stats,components:base.stats.components.map(r=>({...r}))};
 const out=base.components.map((c,i)=>{const d=__infillRead_rows().get(key(c));if(!exactOldOutput(c))return c;const previous=components[i];if(__infillRead_owned().has(previous)&&exactOwned(previous))return previous;if(!d){__infillRead_owned().set(c,{source:source[i],fingerprint:ownerDisplayFingerprint(c).fingerprint});return c;}
  const batches:Batch[]=[];
  for(const f of d.retainedCentralFilters){const b=c.batches.find(b=>(b as Batch).role===f.role)as Batch|undefined;if(!b||b.positions.length/3!==f.expectedOriginalVertices)throw Error('Hbf075 original central batch changed');const copy=(a:ArrayLike<number>,stride:number)=>{const out:number[]=[];for(const i of f.oldVertexIndices)for(let j=0;j<stride;j++)out.push(a[i*stride+j]);return out;};const q:Batch={...b,positions:[...copy(b.positions,3),...f.append.positions],normals:[...copy(b.normals,3),...f.append.normals],indices:[...f.indices],color:[...b.color]as[number,number,number],paint:[...copy(b.paint,4),...f.append.paint],frames:[...copy(b.frames,5),...f.append.frames],writeMask:[...f.oldVertexIndices.map(i=>b.writeMask[i]),...f.append.writeMask]};if(f.upgradeCentralStoneFamily)for(let j=4;j<q.frames.length;j+=5)q.frames[j]=45420;batches.push(q);}
  for(const b of c.batches)if(d.retainedWholeOldAssetRoles.includes((b as Batch).role))batches.push(b as Batch);
  for(const b of d.measuredBatches)batches.push({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color]as[number,number,number],paint:[...b.paint],frames:[...b.frames],writeMask:[...b.writeMask],faceRole:b.faceRole as 'wall'|'roof'});
  const original=source[i],result:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,F137Exterior:{...(c.displayEstimates?.F137Exterior as Record<string,unknown>),patchSHA:HBF075_PATCH_SHA,originalAcceptedPatchSHA:HBF075_OLD_PATCH},infillFrankfurtHbf075:{patchSHA:HBF075_PATCH_SHA,sourceRetained:true,sourceGeometryAltered:false,original17SourceContract:true,originalParentGetterStillAbsent:true,centralPhotoBarrelAndFiveNativeVaultsRetained:true,originalClockDBLettersSculptureGeometryAndRegistrationUnchanged:true,flatCentralOfficialPrototypeRejected:true,smallCarrierRoofWallBatchOrderBugCorrectedByRealNormals:true,officialLowWingDatumM:100.113,actualGroundDifferencesRetained:true,registrationMarginsExplicitApproximation:true,unknownOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
  __infillRead_owned().set(result,{source:original,fingerprint:ownerDisplayFingerprint(result).fingerprint});return result;
 });
 for(const r of stats.components){const c=out.find(c=>key(c)===key(r));if(!c||!__infillRead_owned().has(c)||!__infillRead_rows().has(key(c)))continue;const f=ownerDisplayFingerprint(c);r.patchSHA256=HBF075_PATCH_SHA;r.vertices=f.vertices;r.triangles=f.indices/3;r.geometryRole='owner-authorized-Hbf075-measured-low-wings-with-retained-photo-front';}
 stats.vertices=stats.components.reduce((n,r)=>n+r.vertices,0);stats.triangles=stats.components.reduce((n,r)=>n+r.triangles,0);stats.objects=stats.components.filter(r=>r.vertices>0).length;return{components:out,stats};
}
function frankfurtHbf075BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Changed private Hbf075 materials');
 const safe=components.map(c=>!__infillRead_owned().has(c)&&(c.displayEstimates?.infillFrankfurtHbf075||__infillRead_rows().has(key(c))&&c.displayEstimates?.F137Exterior&&!exactOldOutput(c))?{...c,displayEstimates:{...c.displayEstimates,F137Exterior:undefined}}:c);return ownerF137BaseMaterials(safe,paint,frames);
}

return {get rows(){return __infillRead_rows();},get pins(){return __infillRead_pins();},get owned(){return __infillRead_owned();},frankfurtHbf075Reconstruction,frankfurtHbf075BaseMaterials};
});}
function getrows(scope:FrozenDataScope|undefined){return getInfillData(scope).rows;}
function getpins(scope:FrozenDataScope|undefined){return getInfillData(scope).pins;}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
export function frankfurtHbf075Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtHbf075Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtHbf075ReconstructionCold(args[0],scope);return getInfillData(scope).frankfurtHbf075Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['frankfurtHbf075Reconstruction']>);}
export function frankfurtHbf075BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['frankfurtHbf075BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return frankfurtHbf075BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).frankfurtHbf075BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['frankfurtHbf075BaseMaterials']>);}
export const infillDataFunctionArities={"frankfurtHbf075Reconstruction":1,"frankfurtHbf075BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillRootDependency0];

function frankfurtHbf075ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const source=components.map(component=>component),base=__infillRootDependency0.ownerF137Reconstruction(source,scope),stats={...base.stats,components:base.stats.components.map(r=>({...r}))},out=base.components.map(component=>component);stats.vertices=stats.components.reduce((n,r)=>n+r.vertices,0);stats.triangles=stats.components.reduce((n,r)=>n+r.triangles,0);stats.objects=stats.components.filter(r=>r.vertices>0).length;return{components:out,stats};}

function frankfurtHbf075BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return __infillRootDependency0.ownerF137BaseMaterials(components,paint,frames);}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&((infillResourceIdentityCandidate("infill-frankfurt-hbf075.ts",c)||__infillRootDependency0.ownerF137Identity(c))||c.displayEstimates?.infillFrankfurtHbf075||c.displayEstimates?.F137Exterior));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
