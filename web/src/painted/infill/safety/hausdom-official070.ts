import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {HAUSDOM_OFFICIAL_SHA070 as SHA,HAUSDOM_OFFICIAL_NATIVE070 as PIN,getHAUSDOM_OFFICIAL_DATA070 as __infillDataDependency0} from './hausdom-official070-data';

export const hausdomOfficial070Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PIN.objectId&&c.partId===PIN.partId;
function exactNative(c:BuildingComponent){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&nativePaintSignature(c)===PIN.signature&&c.origin.length===2&&PIN.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===PIN.geometryJSON&&JSON.stringify(c.sourceFeature)===PIN.sourceFeatureJSON&&c.batches.length===PIN.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===PIN.batchRoles[i])&&f.vertices===PIN.vertices&&f.indices===PIN.indices&&f.fingerprint===PIN.fingerprint;}catch{return false;}}

/** Only unchanged HausamDom SOURCE147571481 becomes privately owned DISPLAY.
 * All three official parts are clipped to SOURCE, with closed actual cut faces.
 * Original 7.5m estimate is retired; unmatched SOURCE domain is not roof-filled.
 * Named photo planes alone receive openings; hidden walls keep plaster base. */

/** Only private exact output can write packed45330..45335. Public IDs/markers cannot grant paint. */


import * as __infillResourceDependency0 from './hausdom-official070-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("hausdom-official070.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function hausdomOfficial070Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(hausdomOfficial070Identity);
 if(!targets.length)return{components,stats};if(targets.length!==1){stats.error='HausamDom measured partition duplicate exact SOURCE';return{components,stats};}
 const source=targets[0];if(__infillRead_owned().has(source)){if(!exactOwned(source))stats.error='HausamDom private DISPLAY changed';return{components,stats};}
 if(!exactNative(source)){stats.error='HausamDom measured partition unchanged exact SOURCE required';return{components,stats};}
 let out=__infillRead_cache().get(source);if(out&&!exactOwned(out)){stats.error='HausamDom cached DISPLAY changed';return{components,stats};}
 if(!out){
  const batches:MeshBatch[]=__infillRead_DATA().batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as [number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
  out={...source,batches,displayEstimates:{...source.displayEstimates,hausdomOfficial070:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalNativeHeightM:7.5,originalHeightWasUnknownEstimate:true,geometryRole:'three-original-official-parts-clipped-to-SOURCE-with-cut-closure',datumAbsoluteM:97.806,officialPartHeightsM:[29.04,18.665,23.204],unmatchedSourceDomainNotRoofFilled:true,photoOpeningsApproximate:true,hiddenWallOpeningsUnknown:true,otherPartsChanged:false,actualVisualAccepted:false,quality500Accepted:false}}}
  __infillRead_owned().set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.paint])),frames:new Float32Array(__infillRead_DATA().batches.flatMap(b=>[...b.frames]))});__infillRead_cache().set(source,out);
 }
 stats.objects=1;stats.vertices=out.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=PIN.vertices;stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'three-official-parts-exact-SOURCE-cut-closure'});
 return{components:components.map(c=>c===source?out!:c),stats};
}
function hausdomOfficial070BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('HausamDom exact packed buffer lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('HausamDom private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},hausdomOfficial070Reconstruction,hausdomOfficial070BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function hausdomOfficial070Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['hausdomOfficial070Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return hausdomOfficial070ReconstructionCold(args[0],scope);return getInfillData(scope).hausdomOfficial070Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['hausdomOfficial070Reconstruction']>);}
export function hausdomOfficial070BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['hausdomOfficial070BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return hausdomOfficial070BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).hausdomOfficial070BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['hausdomOfficial070BaseMaterials']>);}
export const infillDataFunctionArities={"hausdomOfficial070Reconstruction":1,"hausdomOfficial070BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function hausdomOfficial070ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]},targets=components.filter(hausdomOfficial070Identity);
if(!targets.length)return{components,stats};
if(targets.length!==1){stats.error='HausamDom measured partition duplicate exact SOURCE';return{components,stats};}
const source=targets[0];
return {components:components,stats};}

function hausdomOfficial070BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(paint.length!==count*4||frames.length!==count*5)throw Error('HausamDom exact packed buffer lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city===undefined||c.city==='frankfurt')&&(c.objectId===PIN.objectId||c.partId===PIN.partId||c.displayEstimates?.hausdomOfficial070));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["hausdomOfficial070Identity"] as const;
