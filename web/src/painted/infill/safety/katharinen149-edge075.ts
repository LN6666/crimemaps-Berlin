import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity,MeshBatch} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {katharinenEast149Official070Identity,katharinenEast149Official070Reconstruction as __infillFunctionDependency0,katharinenEast149Official070BaseMaterials as __infillFunctionDependency1} from './katharinen149-official070';
import {FRA149_OFFICIAL_SHA070 as BASE_SHA,FRA149_OFFICIAL_NATIVE070 as PINS} from './katharinen149-official070-data';
import {KATHARINEN149_EDGE_SHA075 as SHA,getKATHARINEN149_EDGE_DATA075 as __infillDataDependency0,KATHARINEN149_EDGE_BASE_OUTPUTS075 as BASE_OUTPUTS} from './katharinen149-edge075-data';
type Group={inputs:BuildingComponent[];outputs:BuildingComponent[]};
type Owned={group:Group;fingerprint:string;paint:Float32Array;frames:Float32Array};

export const katharinen149Edge075Identity=(c:Identity&{city?:string})=>katharinenEast149Official070Identity(c);


/** Replace ONLY the original070 reconstruction array slot with this wrapper.
 * The unchanged original complete6 exact SOURCE guard executes first. Its
 * private measured outputs/buffers remain immutable prefixes. Three explicitly
 * approved DOP perimeter domains gain same-original-plane approximate edges;
 * cross-height seams and unproved low turns remain separate unknowns. */

/** Existing070 BaseMaterials stays unchanged; it cannot paint changed clones.
 * This final writer seeds the exact prior private arrays and appends only the
 * approved geometry's frames. All6 private outputs are still required. */


import * as __infillResourceDependency0 from './katharinen149-official070';
import * as __infillResourceDependency1 from './katharinen149-official070';
import * as __infillResourceDependency2 from './katharinen149-edge075-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("katharinen149-edge075.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const katharinenEast149Official070Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const katharinenEast149Official070BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],args[1],args[2],scope);

const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,Group>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function complete(cs:BuildingComponent[]){if(cs.length!==6)return false;const r=__infillRead_owned().get(cs[0]);return!!r&&PINS.every((p,i)=>cs.filter(c=>c.objectId===p.objectId&&c.partId===p.partId).length===1&&cs.includes(r.group.outputs[i])&&__infillRead_owned().get(r.group.outputs[i])?.group===r.group&&exactOwned(r.group.outputs[i]));}
function katharinen149Edge075Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 let targets=components.filter(katharinen149Edge075Identity);if(!targets.length||complete(targets))return{components,stats};
 for(const c of targets)if(__infillRead_owned().has(c)&&!exactOwned(c)){stats.error='FRA149 edge075 private DISPLAY changed';return{components,stats};}
 components=components.map(c=>{const r=__infillRead_owned().get(c);if(!r)return c;const i=r.group.outputs.indexOf(c);return i<0?c:r.group.inputs[i];});targets=components.filter(katharinen149Edge075Identity);
 if(BASE_SHA!=='fc525ea5c7c4f1401674434ac18dea84b93b9139eca07c9ac59058a5d1774caf'){stats.error='FRA149 edge075 frozen original070 patch changed';return{components,stats};}
 // No public native/ID guard has been duplicated or widened: require the
 // original070 function itself to authenticate and reconstruct all6 originals.
 const prior=katharinenEast149Official070Reconstruction(components,scope);
 if(prior.stats.objects!==6||prior.stats.error){stats.error=prior.stats.error??'FRA149 edge075 requires original070 full native6 admission';return{components,stats};}
 const inputs=PINS.map(p=>targets.find(c=>c.objectId===p.objectId&&c.partId===p.partId)!);
 const originals=PINS.map(p=>prior.components.find(c=>c.objectId===p.objectId&&c.partId===p.partId)!);
 if(originals.some((c,i)=>!c||ownerDisplayFingerprint(c).fingerprint!==BASE_OUTPUTS[i].fingerprint)){stats.error='FRA149 edge075 original measured DISPLAY fingerprint changed';return{components,stats};}
 let group=__infillRead_cache().get(inputs[0]);if(group&&!group.inputs.every((c,i)=>c===inputs[i]))group=undefined;
 if(group&&!group.outputs.every(exactOwned)){stats.error='FRA149 edge075 cached DISPLAY changed';return{components,stats};}
 if(!group){
  const nv=originals.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),pa=new Float32Array(nv*4),fr=new Float32Array(nv*5);
  if(katharinenEast149Official070BaseMaterials(originals,pa,fr,scope).objects!==6){stats.error='FRA149 edge075 original private ownership/material authentication failed';return{components,stats};}
  group={inputs,outputs:[]};let oldAt=0;
  for(let i=0;i<6;i++){
   const c=originals[i],entry=__infillRead_DATA()[c.partId as keyof ReturnType<typeof __infillRead_DATA>],oldN=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
   const added:MeshBatch[]=entry.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color]as[number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
   const out:BuildingComponent={...c,batches:[...c.batches,...added],displayEstimates:{...c.displayEstimates,katharinen149Edge075:{patchSHA:SHA,originalMeasuredPatchSHA:BASE_SHA,sourceRetained:true,sourceGeometryAltered:false,originalMeasuredBatchesRetainedByReference:true,sameOriginalRoofPlanePerimeterApproximation:true,unknownCrossHeightSeamsNotFilled:true,originalDomain3NotFilled:true,commonDatumAbsoluteM:100.672,unknownLowTurnRoofNotInvented:true,actualVisualAccepted:false,wholeOutlineAccepted:false,quality500Accepted:false}}};
   const paint=new Float32Array(oldN*4+entry.batches.reduce((n,b)=>n+b.paint.length,0)),frames=new Float32Array(oldN*5+entry.batches.reduce((n,b)=>n+b.frames.length,0));paint.set(pa.subarray(oldAt*4,(oldAt+oldN)*4));frames.set(fr.subarray(oldAt*5,(oldAt+oldN)*5));let pAt=oldN*4,fAt=oldN*5;for(const b of entry.batches){paint.set(b.paint,pAt);frames.set(b.frames,fAt);pAt+=b.paint.length;fAt+=b.frames.length;}oldAt+=oldN;
   __infillRead_owned().set(out,{group,fingerprint:ownerDisplayFingerprint(out).fingerprint,paint,frames});group.outputs.push(out);
  }
  __infillRead_cache().set(inputs[0],group);
 }
 for(let i=0;i<6;i++){const c=group.outputs[i],v=c.batches.reduce((n,b)=>n+b.positions.length/3,0),t=c.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=PINS[i].vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:'unchanged-original070-measured-prefix-plus-registered-same-plane-perimeter-approximation'});}
 return{components:components.map(c=>{const i=inputs.indexOf(c);return i<0?c:group!.outputs[i];}),stats};
}
function katharinen149Edge075BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const n=components.reduce((s,c)=>s+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==n*4||frames.length!==n*5)throw Error('FRA149 edge075 exact packed lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('FRA149 edge075 private DISPLAY changed before packed materials');
 if(!complete(components.filter(katharinen149Edge075Identity)))return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 let at=0,objects=0,vertices=0;for(const c of components){const count=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=count;}at+=count;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},katharinen149Edge075Reconstruction,katharinen149Edge075BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function katharinen149Edge075Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['katharinen149Edge075Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return katharinen149Edge075ReconstructionCold(args[0],scope);return getInfillData(scope).katharinen149Edge075Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['katharinen149Edge075Reconstruction']>);}
export function katharinen149Edge075BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['katharinen149Edge075BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return katharinen149Edge075BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).katharinen149Edge075BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['katharinen149Edge075BaseMaterials']>);}
export const infillDataFunctionArities={"katharinen149Edge075Reconstruction":1,"katharinen149Edge075BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1,__infillResourceDependency2];

function katharinen149Edge075ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
let targets=components.filter(katharinen149Edge075Identity);
return {components:components,stats};}

function katharinen149Edge075BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const n=components.reduce((s,c)=>s+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(paint.length!==n*4||frames.length!==n*5)throw Error('FRA149 edge075 exact packed lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("katharinen149-edge075.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
