import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {SENCKENBERG_SELECTED_SHA074 as SHA,SENCKENBERG_SELECTED_NATIVE074 as PINS,getSENCKENBERG_SELECTED_DATA074 as __infillDataDependency0} from './senckenberg-selected074-data';

export const senckenbergSelected074Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&PINS.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function exactNative(c:BuildingComponent,p:typeof PINS[number]){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&c.origin.length===2&&p.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===p.batchRoles[i])&&f.vertices===p.vertices&&f.indices===p.indices&&f.fingerprint===p.fingerprint;}catch{return false;}}

/** The two selected SOURCE are separate physical towers, not Marriott wings.
 * Each has its own complete exact guard. Native SOURCE, outline, metadata and
 * original WestendGate6 remain unchanged. This is primary/photo-approx DISPLAY,
 * not surveyed completed LoD2 or an additional principal-count claim. */

/** Only authenticated unchanged private output may write these final frames.
 * Public identities, copied markers and cloned output arrays confer no paint. */


import * as __infillResourceDependency0 from './senckenberg-selected074-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("senckenberg-selected074.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,{fingerprint:string;paint:Float32Array;frames:Float32Array}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function senckenbergSelected074Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const outputs=new Map<BuildingComponent,BuildingComponent>();
 for(const p of PINS){
  const targets=components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);if(!targets.length)continue;
  if(targets.length!==1){stats.error='Senckenberg selected074 duplicate exact SOURCE identity';continue;}
  const c=targets[0];if(__infillRead_owned().has(c)){if(!exactOwned(c))stats.error='Senckenberg selected074 changed private DISPLAY';continue;}
  if(!exactNative(c,p)){stats.error='Senckenberg selected074 unchanged exact original SOURCE required';continue;}
  let out=__infillRead_cache().get(c);if(out&&!exactOwned(out)){stats.error='Senckenberg selected074 cached private DISPLAY changed';continue;}
  if(!out){
   const entry=__infillRead_DATA()[c.partId as keyof ReturnType<typeof __infillRead_DATA>],batches:MeshBatch[]=entry.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color]as[number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
   out={...c,batches,displayEstimates:{...c.displayEstimates,senckenbergSelected074:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,originalSourceHeightEstimatePreserved:true,geometryRole:'own-primary-photo-approx-completed-envelope',ownDescription:entry.description,notMarriottAnnex:true,independentSelectedSource:true,independentPrincipalCountChanged:false,completedOfficialGMLUnavailable:true,finishedHeightsNotInferredFromFoundationGML:true,unknownOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
   __infillRead_owned().set(out,{fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(entry.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(entry.batches.flatMap(b=>[...b.frames]))});__infillRead_cache().set(c,out);
  }
  outputs.set(c,out);const v=out.batches.reduce((n,b)=>n+b.positions.length/3,0),t=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=p.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:'separate-selected-tower-own-primary-photo-approx-completed-envelope'});
 }
 return{components:outputs.size?components.map(c=>outputs.get(c)??c):components,stats};
}
function senckenbergSelected074BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('Senckenberg selected074 exact packed lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('Senckenberg selected074 private DISPLAY changed before materials');
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},senckenbergSelected074Reconstruction,senckenbergSelected074BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function senckenbergSelected074Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['senckenbergSelected074Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return senckenbergSelected074ReconstructionCold(args[0],scope);return getInfillData(scope).senckenbergSelected074Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['senckenbergSelected074Reconstruction']>);}
export function senckenbergSelected074BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['senckenbergSelected074BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return senckenbergSelected074BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).senckenbergSelected074BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['senckenbergSelected074BaseMaterials']>);}
export const infillDataFunctionArities={"senckenbergSelected074Reconstruction":1,"senckenbergSelected074BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function senckenbergSelected074ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const outputs=new Map<BuildingComponent,BuildingComponent>();
return {components:components.map(component=>component),stats};}

function senckenbergSelected074BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(paint.length!==count*4||frames.length!==count*5)throw Error('Senckenberg selected074 exact packed lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("senckenberg-selected074.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
