import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {gardenAggregate086Identity as __infillFunctionDependency0,gardenAggregate086Reconstruction as __infillFunctionDependency1} from './garden-aggregate086';
import {GARDEN_UPPER_PHOTO087_FRAMES as DATA,GARDEN_UPPER_PHOTO087_SHA} from './garden-upper-photo087-data';
export {GARDEN_UPPER_PHOTO087_SHA} from './garden-upper-photo087-data';
/** Final width-slot marker only, exact24 vertices of six original SW quads.
 * Complete private086 reentry is the unforgeable ownership credential; public
 * markers/fingerprint-identical serialized DISPLAY cannot grant detail binding.
 * Geometry, original frames.xyz/family, all RGB/alpha and all other frames stay exact. */






import * as __infillResourceDependency0 from './garden-aggregate086';
import * as __infillResourceDependency1 from './garden-aggregate086';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("garden-upper-photo087.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const gardenAggregate086Identity=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const gardenAggregate086Reconstruction=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],scope);


function gardenUpperPhoto087BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Garden087 exact packed lengths required');
 const group=components.filter(component=>gardenAggregate086Identity(component)),result={objects:0,vertices:0,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};if(group.length!==5)return result;
 const probe=gardenAggregate086Reconstruction(group,scope);if(!probe.completeExactCohort||probe.components!==group||probe.stats.objects!==0)return result;
 const writes:{at:number;marker:number}[]=[];let at=0;
 for(const c of components){const n=c.batches.reduce((m,b)=>m+b.positions.length/3,0);for(const row of DATA){if(c.objectId!==row.objectId||c.partId!==row.partId)continue;if(!Number.isSafeInteger(row.componentVertex)||row.componentVertex<0||row.componentVertex>=n)return result;const p=(at+row.componentVertex)*5;
  if(row.frame.some((v,k)=>k===3?!(Object.is(frames[p+k],v)||Object.is(frames[p+k],row.marker)):!Object.is(frames[p+k],v)))return result;writes.push({at:p+3,marker:row.marker});}at+=n;}
 if(writes.length!==24)return result;for(const w of writes)frames[w.at]=w.marker;return{...result,objects:2,vertices:24,materialSHA256:GARDEN_UPPER_PHOTO087_SHA};
}

return {gardenUpperPhoto087BaseMaterials};
});}
export function gardenUpperPhoto087BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['gardenUpperPhoto087BaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return gardenUpperPhoto087BaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).gardenUpperPhoto087BaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['gardenUpperPhoto087BaseMaterials']>);}
export const infillDataFunctionArities={"gardenUpperPhoto087BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function gardenUpperPhoto087BaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){const total=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);if(!Number.isSafeInteger(total)||paint.length!==total*4||frames.length!==total*5)throw Error('Garden087 exact packed lengths required');return{objects:0,vertices:0,sourceRetained:true,geometryChanged:false,actualVisualAccepted:false};}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("garden-upper-photo087.ts",c)));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
