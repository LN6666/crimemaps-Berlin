import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillFrankfurtTowersMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getMESSETURM_DATA as __infillDataDependency0,MESSETURM_SHA} from './infill-frankfurt-messeturm-data';





import * as __infillResourceDependency0 from './infill-frankfurt-messeturm-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-towers.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_MESSETURM_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_MODELS=scopedInfillValue(()=>[{data:__infillRead_MESSETURM_DATA(),sha:MESSETURM_SHA}]);
const infillFrankfurtIdentity=(c:Identity)=>infillFrankfurtTowersMetadata.infillFrankfurtIdentity(c);
function infillFrankfurtReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=__infillRead_MODELS().find(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);if(!model)return c;const source=model.data.source;
 const ready=components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&nativePaintSignature(c)===model.data.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify((source as any)[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(source.batches[bi] as any)[k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.data.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:model.sha,vertices,triangles,geometryRole:'owner-authorized-source-bound-photo-proportion-display'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtExterior:{sourceRetained:true,patchSHA:model.sha,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:true}}};});return{components:mapped,stats};
}
function infillFrankfurtBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return infillFrankfurtTowersMetadata.infillFrankfurtBaseMaterials(components,paint,frames);}

return {get MODELS(){return __infillRead_MODELS();},infillFrankfurtIdentity,infillFrankfurtReconstruction,infillFrankfurtBaseMaterials};
});}
function getMODELS(scope:FrozenDataScope|undefined){return getInfillData(scope).MODELS;}
export function infillFrankfurtIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtIdentity']>,scope?:FrozenDataScope]){return infillFrankfurtTowersMetadata.infillFrankfurtIdentity(args[0]);}
export function infillFrankfurtReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillFrankfurtReconstructionCold(...args.slice(0,1) as Parameters<typeof infillFrankfurtReconstructionCold>);return getInfillData(scope).infillFrankfurtReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtReconstruction']>);}
export function infillFrankfurtBaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtBaseMaterials']>,scope?:FrozenDataScope]){return infillFrankfurtTowersMetadata.infillFrankfurtBaseMaterials(args[0],args[1],args[2]);}
export const infillDataFunctionArities={"infillFrankfurtIdentity":1,"infillFrankfurtReconstruction":1,"infillFrankfurtBaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillFrankfurtReconstructionCold(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

const infillPreparationPairs=[["osm/way/23916129","osm/way/23916129/component/25439782f9aeec041316"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillFrankfurtTowersMetadata.infillFrankfurtIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillFrankfurtIdentity","infillFrankfurtBaseMaterials"] as const;
