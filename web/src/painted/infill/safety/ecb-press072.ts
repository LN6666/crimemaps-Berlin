import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {ECB_PRESS_SHA072 as SHA,ECB_PRESS_NATIVE072 as PIN,getECB_PRESS_DATA072 as __infillDataDependency0} from './ecb-press072-data';

export const ecbPress072Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PIN.objectId&&c.partId===PIN.partId;
function exactNative(c:BuildingComponent){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&nativePaintSignature(c)===PIN.signature&&c.origin.length===2&&PIN.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===PIN.geometryJSON&&JSON.stringify(c.sourceFeature)===PIN.sourceFeatureJSON&&c.batches.length===PIN.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===PIN.batchRoles[i])&&f.vertices===PIN.vertices&&f.indices===PIN.indices&&f.fingerprint===PIN.fingerprint;}catch{return false;}}

/** Exact SOURCE press-centre volume from official LoD2, source-boundary closures explicit.
 * North glazing and aluminium zones follow primary ECB material description.
 * Double curvature is missing from LoD2; a15m soffit is derived from the architect section and as-built photo, not surveyed. */

/** Only private exact output can write packed45370/1/2. Public IDs/markers cannot grant paint. */


import * as __infillResourceDependency0 from './ecb-press072-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("ecb-press072.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function ecbPress072Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(ecbPress072Identity);
 if(!targets.length)return{components,stats};if(targets.length!==1){stats.error='ECB press measured partition duplicate exact SOURCE';return{components,stats};}
 const source=targets[0];if(__infillRead_owned().has(source)){if(!exactOwned(source))stats.error='ECB press private DISPLAY changed';return{components,stats};}
 if(!exactNative(source)){stats.error='ECB press measured partition unchanged exact SOURCE required';return{components,stats};}
 let out=__infillRead_cache().get(source);if(out&&!exactOwned(out)){stats.error='ECB press cached DISPLAY changed';return{components,stats};}
 if(!out){
  const batches:MeshBatch[]=__infillRead_DATA().batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
  out={...source,batches,displayEstimates:{...source.displayEstimates,ecbPress072:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalNativeHeightM:7.5,originalHeightWasUnknownEstimate:true,geometryRole:'official-measured-press-volume',datumAbsoluteM:98.601,officialRoofRelativeM:27.562,panoramaCurvatureNotReconstructed:true,cantileverRecessPhotoApproximation:true,soffitRelativeM:15,soffitVisualUncertaintyM:1,booleanClosuresAreDerived:true,otherPartsChanged:false,actualVisualAccepted:false,quality500Accepted:false}}}
  __infillRead_owned().set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.paint])),frames:new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.frames]))});__infillRead_cache().set(source,out);
 }
 stats.objects=1;stats.vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=PIN.vertices;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'official-measured-press-volume'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
function ecbPress072BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('ECB press exact packed buffer lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('ECB press private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},ecbPress072Reconstruction,ecbPress072BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function ecbPress072Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['ecbPress072Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ecbPress072ReconstructionCold(args[0],scope);return getInfillData(scope).ecbPress072Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['ecbPress072Reconstruction']>);}
export function ecbPress072BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['ecbPress072BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return ecbPress072BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).ecbPress072BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['ecbPress072BaseMaterials']>);}
export const infillDataFunctionArities={"ecbPress072Reconstruction":1,"ecbPress072BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function ecbPress072ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(ecbPress072Identity);
if(!targets.length)return{components,stats};
if(targets.length!==1){stats.error='ECB press measured partition duplicate exact SOURCE';return{components,stats};}
const source=targets[0];
return {components:components,stats};}

function ecbPress072BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(paint.length!==count*4||frames.length!==count*5)throw Error('ECB press exact packed buffer lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city===undefined||c.city==='frankfurt')&&(c.objectId===PIN.objectId||c.partId===PIN.partId||c.displayEstimates?.ecbPress072));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["ecbPress072Identity"] as const;
