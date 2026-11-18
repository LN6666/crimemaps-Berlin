import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillOmniturmMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getOMNITURM_DATA as __infillDataDependency0,OMNITURM_SHA} from './infill-omniturm-data';




import * as __infillResourceDependency0 from './infill-omniturm-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-omniturm.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_M=scopedInfillValue(()=>__infillDataDependency0(scope));
const infillOmniturmIdentity=(c:Identity&{city?:string})=>infillOmniturmMetadata.infillOmniturmIdentity(c);
function infillOmniturmReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const targets=components.filter(component=>infillOmniturmIdentity(component));if(!targets.length)return{components,stats};
 if(targets.length===1&&(targets[0].displayEstimates?.infillOmniturm050 as any)?.patchSHA===OMNITURM_SHA)return{components,stats};
 const c=targets[0];if(targets.length!==1||nativePaintSignature(c)!==__infillRead_M().identity.signature||JSON.stringify(c.origin)!==JSON.stringify(__infillRead_M().sourceOrigin)||JSON.stringify(c.sourceFeature)!==JSON.stringify(__infillRead_M().sourceFeature)||JSON.stringify(c.componentGeometry)!==JSON.stringify(__infillRead_M().componentGeometry)){stats.error='Omniturm exact unique real SOURCE required';return{components,stats};}
 const b=__infillRead_M().display;const batch={...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]};
 const display={...c,batches:[batch],displayEstimates:{...c.displayEstimates,infillOmniturm050:{patchSHA:OMNITURM_SHA,sourceRetained:true,officialTop:true,ownerSideProfile:true,secondAxisUnknown:true,completeSilhouetteAccepted:false,approximateVisualOnly:true}}};
 stats.objects=1;stats.vertices=b.positions.length/3;stats.triangles=b.indices.length/3;stats.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:OMNITURM_SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'official-top-plus-owner-side-traced-offsets-second-axis-unverified'});
 return{components:components.map(x=>x===c?display:x),stats};
}
function infillOmniturmBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return infillOmniturmMetadata.infillOmniturmBaseMaterials(components,paint,frames);}

return {infillOmniturmIdentity,infillOmniturmReconstruction,infillOmniturmBaseMaterials};
});}
export function infillOmniturmIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillOmniturmIdentity']>,scope?:FrozenDataScope]){return infillOmniturmMetadata.infillOmniturmIdentity(args[0]);}
export function infillOmniturmReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillOmniturmReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillOmniturmReconstructionCold(...args.slice(0,1) as Parameters<typeof infillOmniturmReconstructionCold>);return getInfillData(scope).infillOmniturmReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillOmniturmReconstruction']>);}
export function infillOmniturmBaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['infillOmniturmBaseMaterials']>,scope?:FrozenDataScope]){return infillOmniturmMetadata.infillOmniturmBaseMaterials(args[0],args[1],args[2]);}
export const infillDataFunctionArities={"infillOmniturmIdentity":1,"infillOmniturmReconstruction":1,"infillOmniturmBaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillOmniturmReconstructionCold(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const targets=components.filter(component=>infillOmniturmIdentity(component));
if(!targets.length)return{components,stats};
if(targets.length===1&&(targets[0].displayEstimates?.infillOmniturm050 as any)?.patchSHA===OMNITURM_SHA)return{components,stats};
const c=targets[0];
return {components:components,stats};}

const infillPreparationPairs=[["osm/way/598133203","osm/way/598133203/component/d339f7dc1f96a3bab9bf"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillOmniturmMetadata.infillOmniturmIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillOmniturmIdentity","infillOmniturmBaseMaterials"] as const;
