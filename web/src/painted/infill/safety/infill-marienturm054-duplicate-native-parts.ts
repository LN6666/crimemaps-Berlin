import {marienturmSpecificMetadata} from './bremen-infill-owner-metadata';
import * as marienturm054DuplicateData from './infill-marienturm054-duplicate-data';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {nativePaintSignature} from './progressive-native-signature';
import {getMARIENTURM050_DATA as __infillDataDependency0,MARIENTURM050_SHA as SHA} from './marienturm-specific-data';
import {getMARIENTURM054_DUPLICATES as readMarienturm054Duplicates} from './infill-marienturm054-duplicate-data';

const same=(a:ArrayLike<number>|undefined,b:ArrayLike<number>|undefined)=>!!a&&!!b&&a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));
const metadataExact=(c:BuildingComponent,s:any)=>['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]));
const batchesExact=(c:BuildingComponent,expected:any[],fields:string[])=>c.batches.length===expected.length&&c.batches.every((b,i)=>fields.every(k=>same((b as any)[k],expected[i][k])));

/** Omit only three unchanged duplicate DISPLAY carriers after the exact parent DISPLAY exists.
 * The renderer records original sourceLoaded before owner reconstruction; SOURCE getters retain
 * these original native records. The independent osm/way/1073205488 canopy is never selected. */


import * as __infillResourceDependency0 from './marienturm-specific-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-marienturm054-duplicate-native-parts.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_M=scopedInfillValue(()=>__infillDataDependency0(scope));
function infillMarienturm054RemoveDuplicateNativeParts(components:BuildingComponent[]){
 const parents=components.filter(c=>c.city==='frankfurt'&&c.objectId===__infillRead_M().identity.objectId&&c.partId===__infillRead_M().identity.partId);
 if(parents.length!==1)return components;
 const parent=parents[0];
 if(parent.displayEstimates?.marienturm050!==SHA||nativePaintSignature(parent)!=='f78109c2'||!metadataExact(parent,__infillRead_M().source)||!batchesExact(parent,__infillRead_M().display,['positions','normals','indices','color','paint','frames']))return components;
 const DUPLICATES=readMarienturm054Duplicates(scope);
 const targets=components.filter(c=>c.city==='frankfurt'&&DUPLICATES.some(r=>c.objectId===r.objectId&&c.partId===r.partId));
 if(targets.length!==DUPLICATES.length||!DUPLICATES.every(s=>{
  const rows=targets.filter(c=>c.objectId===s.objectId&&c.partId===s.partId);
  return rows.length===1&&nativePaintSignature(rows[0])===s.geometrySignature&&metadataExact(rows[0],s)&&batchesExact(rows[0],s.batches,['positions','normals','indices','color']);
 }))return components;
 const exact=new Set(targets);
 return components.filter(c=>!exact.has(c));
}

function validatedMarienturm054Parent(components:BuildingComponent[]){const parents=components.filter(c=>c.city==='frankfurt'&&c.objectId===__infillRead_M().identity.objectId&&c.partId===__infillRead_M().identity.partId);
if(parents.length!==1)return false;
const parent=parents[0];
if(parent.displayEstimates?.marienturm050!==SHA||nativePaintSignature(parent)!=='f78109c2'||!metadataExact(parent,__infillRead_M().source)||!batchesExact(parent,__infillRead_M().display,['positions','normals','indices','color','paint','frames']))return false;
return true;}
return {infillMarienturm054RemoveDuplicateNativeParts,validatedMarienturm054Parent};
});}
export function infillMarienturm054RemoveDuplicateNativeParts(...args:[...Parameters<ReturnType<typeof getInfillData>['infillMarienturm054RemoveDuplicateNativeParts']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillMarienturm054RemoveDuplicateNativePartsCold(args[0],scope);return getInfillData(scope).infillMarienturm054RemoveDuplicateNativeParts(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillMarienturm054RemoveDuplicateNativeParts']>);}
export const infillDataFunctionArities={"infillMarienturm054RemoveDuplicateNativeParts":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,marienturm054DuplicateData];

function infillMarienturm054RemoveDuplicateNativePartsCold(components:BuildingComponent[],scope?:FrozenDataScope){
return components;}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(component=>component.city==='frankfurt'&&marienturmSpecificMetadata.marienturm050Identity(component));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies:()=>[__infillResourceDependency0]},components,signal,scope,context);if(!getInfillData(scope).validatedMarienturm054Parent(components as BuildingComponent[]))return;await marienturm054DuplicateData.prepareInfillDataPayload(signal,scope);signal.throwIfAborted();}
export const infillDataMetadataFunctions=[] as const;
