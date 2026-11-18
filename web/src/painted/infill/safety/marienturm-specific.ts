import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {marienturmSpecificMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getMARIENTURM050_DATA as __infillDataDependency0,MARIENTURM050_SHA as SHA} from './marienturm-specific-data';





import * as __infillResourceDependency0 from './marienturm-specific-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("marienturm-specific.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_M=scopedInfillValue(()=>__infillDataDependency0(scope));
const marienturm050Identity=(c:Identity)=>marienturmSpecificMetadata.marienturm050Identity(c);
const sourceExact=(c:BuildingComponent)=>nativePaintSignature(c)===__infillRead_M().identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(__infillRead_M().source[k]))&&c.batches.length===__infillRead_M().source.batches.length&&c.batches.every((b,i)=>['positions','normals','indices','color'].every(k=>Array.from((b as any)[k] as ArrayLike<number>).every((n,j)=>Object.is(n,__infillRead_M().source.batches[i][k][j]))&&(b as any)[k].length===__infillRead_M().source.batches[i][k].length));
function marienturm050Reconstruction(cs:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};const targets=cs.filter(c=>c.city==='frankfurt'&&marienturm050Identity(c));if(!targets.length)return{components:cs,stats};if(targets.length!==1||!sourceExact(targets[0])){stats.error='Marienturm050 requires exactly one unchanged source';return{components:cs,stats};}const old=targets[0],batches=__infillRead_M().display.map((b:any)=>Object.fromEntries(Object.entries(b).map(([k,v])=>[k,[...(v as number[])]])));stats.objects=1;stats.vertices=batches.reduce((s:number,b:any)=>s+b.positions.length/3,0);stats.triangles=batches.reduce((s:number,b:any)=>s+b.indices.length/3,0);stats.originalVertices=old.batches.reduce((s,b)=>s+b.positions.length/3,0);stats.components.push({objectId:old.objectId,partId:old.partId,sourcePartId:old.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'exact-source-bound-architect-plan-estimated-display'});return{components:cs.map(c=>c===old?{...c,batches,displayEstimates:{...c.displayEstimates,marienturm050:SHA,marienturm050Quality:{actualVisualAccepted:false,geometryMeasured:false,outlinePlanRegistered:true,roofHeightsPhotoEstimated:true,hiddenRearDetailsVerified:false,canopyAndDoorsDimensionsPhotoEstimated:true}}}:c),stats};}
function marienturm050BaseMaterials(cs:BuildingComponent[],paint:Float32Array,frames:Float32Array){return marienturmSpecificMetadata.marienturm050BaseMaterials(cs,paint,frames);}

return {marienturm050Identity,marienturm050Reconstruction,marienturm050BaseMaterials};
});}
export function marienturm050Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['marienturm050Identity']>,scope?:FrozenDataScope]){return marienturmSpecificMetadata.marienturm050Identity(args[0]);}
export function marienturm050Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['marienturm050Reconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return marienturm050ReconstructionCold(...args.slice(0,1) as Parameters<typeof marienturm050ReconstructionCold>);return getInfillData(scope).marienturm050Reconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['marienturm050Reconstruction']>);}
export function marienturm050BaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['marienturm050BaseMaterials']>,scope?:FrozenDataScope]){return marienturmSpecificMetadata.marienturm050BaseMaterials(args[0],args[1],args[2]);}
export const infillDataFunctionArities={"marienturm050Identity":1,"marienturm050Reconstruction":1,"marienturm050BaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function marienturm050ReconstructionCold(cs:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
const targets=cs.filter(c=>c.city==='frankfurt'&&marienturm050Identity(c));
if(!targets.length)return{components:cs,stats};

return {components:cs,stats};}

const infillPreparationPairs=[["osm/way/400466121","osm/way/400466121/component/1069a4c328f6fa00fddf"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,marienturmSpecificMetadata.marienturm050Identity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["marienturm050Identity","marienturm050BaseMaterials"] as const;
