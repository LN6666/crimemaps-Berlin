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
import {FRA149_OFFICIAL_SHA070 as SHA,FRA149_OFFICIAL_NATIVE070 as PINS,getFRA149_OFFICIAL_DATA070 as __infillDataDependency0} from './katharinen149-official070-data';
type Group={inputs:BuildingComponent[];outputs:BuildingComponent[]};
type Owned={group:Group;fingerprint:string;paint:Float32Array;frames:Float32Array};

export const katharinenEast149Official070Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&PINS.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function exactNative(c:BuildingComponent,p:typeof PINS[number]){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&c.origin.length===2&&p.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===p.batchRoles[i])&&f.vertices===p.vertices&&f.indices===p.indices&&f.fingerprint===p.fingerprint;}catch{return false;}}


/** Complete6 exact SOURCE only. The default parent becomes SOURCE-held while
 * five original part identities carry disjoint measured surface domains.
 * This private DISPLAY partition does not alter sourceFeature relationships.
 * No estimated7.5m shell, unmatched roof fill or invented courtyard floor. */

/** Final packed writer also requires all6 exact private outputs from one group.
 * Missing/mixed/forged groups cannot gain paint from a public ID or marker. */


import * as __infillResourceDependency0 from './katharinen149-official070-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("katharinen149-official070.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_owned=scopedInfillValue(()=>new WeakMap<BuildingComponent,Owned>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,Group>());
function exactOwned(c:BuildingComponent){const r=__infillRead_owned().get(c);if(!r)return false;try{return ownerDisplayFingerprint(c).fingerprint===r.fingerprint;}catch{return false;}}
function completeOwned(targets:BuildingComponent[]){if(targets.length!==PINS.length)return false;const r=__infillRead_owned().get(targets[0]);return!!r&&PINS.every((p,i)=>targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId).length===1&&targets.includes(r.group.outputs[i])&&__infillRead_owned().get(r.group.outputs[i])?.group===r.group&&exactOwned(r.group.outputs[i]));}
function katharinenEast149Official070Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 let targets=components.filter(katharinenEast149Official070Identity);
 if(!targets.length)return{components,stats};
 if(completeOwned(targets))return{components,stats};
 // A later incomplete/mixed arrival must not retain a privately retired parent.
 // Restore only our authenticated private outputs to their original unchanged
 // SOURCE objects before evaluating the same strict complete native guard.
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c)){stats.error='FRA149 changed private DISPLAY cannot restore or paint';return{components,stats};}
 const restored=components.map(c=>{const r=__infillRead_owned().get(c);if(!r)return c;const at=r.group.outputs.indexOf(c);return at<0?c:r.group.inputs[at];});
 if(restored.some((c,i)=>c!==components[i])){components=restored;targets=components.filter(katharinenEast149Official070Identity);}
 const inputs=PINS.map(p=>targets.filter(c=>c.objectId===p.objectId&&c.partId===p.partId));
 if(targets.length!==PINS.length||inputs.some(cs=>cs.length!==1)){stats.error='FRA149 requires all6 unique unchanged exact SOURCE carriers';return{components,stats};}
 const sources=inputs.map(cs=>cs[0]);if(!sources.every((c,i)=>exactNative(c,PINS[i]))){stats.error='FRA149 complete unchanged original SOURCE records required; public or mixed clones rejected';return{components,stats};}
 let group=__infillRead_cache().get(sources[0]);if(group&&!group.inputs.every((c,i)=>c===sources[i]))group=undefined;
 if(group&&!group.outputs.every(exactOwned)){stats.error='FRA149 cached private DISPLAY changed';return{components,stats};}
 if(!group){
  group={inputs:sources,outputs:[]};
  for(const c of sources){const entry=__infillRead_DATA()[c.partId as keyof ReturnType<typeof __infillRead_DATA>];
   const batches:MeshBatch[]=entry.batches.map(b=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[...b.color] as[number,number,number],faceRole:b.faceRole,materialName:b.geometryRole}));
   const held=c.objectId==='osm/way/28426245',out:BuildingComponent={...c,batches,displayEstimates:{...c.displayEstimates,katharinenEast149Official070:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,completeSourceGroup:6,sourceHeldParent:held,commonDatumAbsoluteM:100.672,officialBuildingIds:['Building_DEHE06200001bLVl','Building_DEHE06200001bNaf','Building_DEHE06200001bNap'],distinctOfficialGroundOffsetsPreserved:true,geometryRole:held?'SOURCE-held-default-parent':'original-official-surfaces-partitioned-within-original-part-footprint',unmatchedSourceRoofDomainNotFilledM2:76.6582268776941,glassOnlyOriginal7940MaterialTagDomain:true,unknownWallOpeningsNotInvented:true,actualVisualAccepted:false,quality500Accepted:false}}};
   __infillRead_owned().set(out,{group,fingerprint:ownerDisplayFingerprint(out).fingerprint,paint:new Float32Array(entry.batches.flatMap(b=>[...b.paint])),frames:new Float32Array(entry.batches.flatMap(b=>[...b.frames]))});group.outputs.push(out);
  }
  __infillRead_cache().set(sources[0],group);
 }
 for(let i=0;i<sources.length;i++){const c=sources[i],out=group.outputs[i],v=out.batches.reduce((n,b)=>n+b.positions.length/3,0),t=out.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=v;stats.triangles+=t;stats.originalVertices+=PINS[i].vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:v,triangles:t,geometryRole:i===0?'SOURCE-held-default-parent':'original-measured-surfaces-in-disjoint-source-part-domain'});}
 const outputs=group.outputs;return{components:components.map(c=>{const at=sources.indexOf(c);return at<0?c:outputs[at];}),stats};
}
function katharinenEast149Official070BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(paint.length!==count*4||frames.length!==count*5)throw Error('FRA149 exact packed lengths required');
 for(const c of components)if(__infillRead_owned().has(c)&&!exactOwned(c))throw Error('FRA149 private DISPLAY changed before packed materials');
 const targets=components.filter(katharinenEast149Official070Identity);if(!completeOwned(targets))return{objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};
 let at=0,objects=0,vertices=0;for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),r=__infillRead_owned().get(c);if(r&&targets.includes(c)){paint.set(r.paint,at*4);frames.set(r.frames,at*5);objects++;vertices+=n;}at+=n;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}

return {get owned(){return __infillRead_owned();},get cache(){return __infillRead_cache();},katharinenEast149Official070Reconstruction,katharinenEast149Official070BaseMaterials};
});}
function getowned(scope:FrozenDataScope|undefined){return getInfillData(scope).owned;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
export function katharinenEast149Official070Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['katharinenEast149Official070Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return katharinenEast149Official070ReconstructionCold(args[0],scope);return getInfillData(scope).katharinenEast149Official070Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['katharinenEast149Official070Reconstruction']>);}
export function katharinenEast149Official070BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['katharinenEast149Official070BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return katharinenEast149Official070BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).katharinenEast149Official070BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['katharinenEast149Official070BaseMaterials']>);}
export const infillDataFunctionArities={"katharinenEast149Official070Reconstruction":1,"katharinenEast149Official070BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function katharinenEast149Official070ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
let targets=components.filter(katharinenEast149Official070Identity);
if(!targets.length)return{components,stats};
return {components:components,stats};}

function katharinenEast149Official070BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
if(paint.length!==count*4||frames.length!==count*5)throw Error('FRA149 exact packed lengths required');
return {objects:0,vertices:0,sourceRetained:true,actualVisualAccepted:false};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).owned.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("katharinen149-official070.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
