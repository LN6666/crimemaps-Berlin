import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {ownerDisplayFingerprint} from './owner-display-fingerprint';
import {senckenbergSelected074Reconstruction as __infillFunctionDependency0,senckenbergSelected074BaseMaterials as __infillFunctionDependency1} from './senckenberg-selected074';
import {SENCKENBERG_PART_SHA076 as SHA,SENCKENBERG_PART_GROUPS076 as GROUPS} from './senckenberg-part-display076-data';
type Pin=typeof GROUPS[number]['children'][number];

const allPins:readonly Pin[]=GROUPS.flatMap(g=>[...g.children] as Pin[]);
export const senckenbergPartDisplay076Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&allPins.some(p=>p.objectId===c.objectId&&p.partId===c.partId);
function exactNative(c:BuildingComponent,p:Pin){try{const f=ownerDisplayFingerprint(c);return c.city==='frankfurt'&&c.objectId===p.objectId&&c.partId===p.partId&&nativePaintSignature(c)===p.signature&&c.origin.length===2&&p.origin.every((v,i)=>Object.is(v,c.origin[i]))&&JSON.stringify(c.componentGeometry)===p.geometryJSON&&JSON.stringify(c.sourceFeature)===p.sourceFeatureJSON&&c.batches.length===p.batchRoles.length&&c.batches.every((b,i)=>(b.faceRole??null)===p.batchRoles[i])&&f.vertices===p.vertices&&f.indices===p.indices&&f.fingerprint===p.fingerprint;}catch{return false;}}
function exactHeld(c:BuildingComponent,r:{source:BuildingComponent;pin:Pin}){return c.batches.length===0&&c.sourceFeature===r.source.sourceFeature&&c.componentGeometry===r.source.componentGeometry&&exactNative({...c,batches:r.source.batches},r.pin)&&exactNative(r.source,r.pin);}


/** Replaces the single old074 reconstruction slot and calls old074 unchanged.
 * Exact native child parts partition the two parent footprints. Their coarse
 * 7.5/15/102.5/106m DISPLAY must not cover the authenticated primary/photo parent.
 * Each present exact child is independently held; partial arrival cannot revoke
 * the separately authorized parent. Missing/drifted parent restores private SOURCE.
 * No relation is invented; all original SOURCE records and old074 geometry remain.
 */


import * as __infillResourceDependency0 from './senckenberg-selected074';
import * as __infillResourceDependency1 from './senckenberg-selected074';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("senckenberg-part-display076.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const senckenbergSelected074Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const senckenbergSelected074BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],args[1],args[2],scope);


const __infillRead_held=scopedInfillValue(()=>new WeakMap<BuildingComponent,{source:BuildingComponent;pin:Pin}>()),__infillRead_cache=scopedInfillValue(()=>new WeakMap<BuildingComponent,BuildingComponent>());
let scratchPaint=new Float32Array(0),scratchFrames=new Float32Array(0);
function privateParent(c:BuildingComponent,g:typeof GROUPS[number]){try{if(c.city!=='frankfurt'||c.objectId!==g.parentObjectId||c.partId!==g.parentPartId||c.origin.length!==2||!g.parentOrigin.every((v,i)=>Object.is(v,c.origin[i]))||JSON.stringify(c.componentGeometry)!==g.parentGeometryJSON||JSON.stringify(c.sourceFeature)!==g.parentSourceFeatureJSON)return false;const f=ownerDisplayFingerprint(c);if(f.fingerprint!==g.parentFingerprint||f.vertices!==g.parentVertices||f.indices!==g.parentIndices)return false;if(scratchPaint.length!==f.vertices*4){scratchPaint=new Float32Array(f.vertices*4);scratchFrames=new Float32Array(f.vertices*5);}return senckenbergSelected074BaseMaterials([c],scratchPaint,scratchFrames,scope).objects===1;}catch{return false;}}
function senckenbergPartDisplay076Reconstruction(components:BuildingComponent[]){
 const original=senckenbergSelected074Reconstruction(components,scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]},outputs=new Map<BuildingComponent,BuildingComponent>();
 for(const g of GROUPS){
  const parents=original.components.filter(c=>c.objectId===g.parentObjectId&&c.partId===g.parentPartId),ready=parents.length===1&&privateParent(parents[0],g);
  for(const p of g.children){
   const targets=original.components.filter(c=>c.objectId===p.objectId&&c.partId===p.partId);if(targets.length!==1)continue;const c=targets[0],previous=__infillRead_held().get(c);
   if(previous){if(!exactHeld(c,previous)){stats.error='Senckenberg part076 changed private SOURCE-held DISPLAY';if(exactNative(previous.source,previous.pin))outputs.set(c,previous.source);continue;}if(!ready)outputs.set(c,previous.source);continue;}
   if(!ready||!exactNative(c,p))continue;let out=__infillRead_cache().get(c);if(out&&!exactHeld(out,__infillRead_held().get(out)!)){stats.error='Senckenberg part076 cached private SOURCE-held DISPLAY changed';continue;}
   if(!out){out={...c,batches:[],displayEstimates:{...c.displayEstimates,senckenbergPartDisplay076:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'coarse-part-SOURCE-held-under-authenticated-private074-parent',parentObjectId:g.parentObjectId,parentPartId:g.parentPartId,parentPatchSHA256:g.parentPatchSHA256,originalSourceHeightEstimateM:p.defaultSourceHeightM,metadataRelationInvented:false,actualVisualAccepted:false,quality500Accepted:false}}};__infillRead_held().set(out,{source:c,pin:p});__infillRead_cache().set(c,out);}
   outputs.set(c,out);stats.objects++;stats.originalVertices+=p.vertices;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:SHA,vertices:0,triangles:0,geometryRole:'coarse-part-SOURCE-held-under-authenticated-private074-parent'});
  }
 }
 return{components:outputs.size?original.components.map(c=>outputs.get(c)??c):original.components,stats};
}

return {get held(){return __infillRead_held();},get cache(){return __infillRead_cache();},scratchPaint,scratchFrames,senckenbergPartDisplay076Reconstruction};
});}
function getheld(scope:FrozenDataScope|undefined){return getInfillData(scope).held;}
function getcache(scope:FrozenDataScope|undefined){return getInfillData(scope).cache;}
function getscratchPaint(scope:FrozenDataScope|undefined){return getInfillData(scope).scratchPaint;}
function getscratchFrames(scope:FrozenDataScope|undefined){return getInfillData(scope).scratchFrames;}
export function senckenbergPartDisplay076Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['senckenbergPartDisplay076Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent])&&!hasRetainedInfillOwner(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent],scope))return senckenbergPartDisplay076ReconstructionCold(args[0],scope);return getInfillData(scope).senckenbergPartDisplay076Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['senckenbergPartDisplay076Reconstruction']>);}
export const infillDataFunctionArities={"senckenbergPartDisplay076Reconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function senckenbergPartDisplay076ReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const original=__infillFunctionDependency0(components,scope),stats:OwnerReconstructionStats={...original.stats,components:[...original.stats.components]},outputs=new Map<BuildingComponent,BuildingComponent>();
return {components:components,stats};}

function hasRetainedInfillOwner(components:readonly BuildingComponent[],scope?:FrozenDataScope){return !!scope&&!scope.stats.disposed&&components.some(c=>getInfillData(scope).held.has(c)||getInfillData(scope).cache.has(c));}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(c.city==='frankfurt')&&(infillResourceIdentityCandidate("senckenberg-part-display076.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components)&&!hasRetainedInfillOwner(components,scope))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
