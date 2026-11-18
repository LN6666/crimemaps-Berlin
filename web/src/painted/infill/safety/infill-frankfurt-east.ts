import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillFrankfurtEastMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getMAIN_PLAZA_DATA as __infillDataDependency0,MAIN_PLAZA_SHA} from './infill-frankfurt-main-plaza-data';
import {getCOLOSSEO_DATA as __infillDataDependency1,COLOSSEO_SHA} from './infill-frankfurt-colosseo-data';

const unchanged=(c:BuildingComponent,source:any,signature:string)=>nativePaintSignature(c)===signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(source[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=source.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));




import * as __infillResourceDependency0 from './infill-frankfurt-main-plaza-data';
import * as __infillResourceDependency1 from './infill-frankfurt-colosseo-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-east.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_MAIN_PLAZA_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_COLOSSEO_DATA=scopedInfillValue(()=>__infillDataDependency1(scope));
const __infillRead_MODELS=scopedInfillValue(()=>[{data:__infillRead_MAIN_PLAZA_DATA(),sha:MAIN_PLAZA_SHA,cohort:'main-plaza'},...__infillRead_COLOSSEO_DATA().models.map(data=>({data,sha:COLOSSEO_SHA,cohort:'colosseo'}))]);
const infillFrankfurtEastIdentity=(c:Identity)=>infillFrankfurtEastMetadata.infillFrankfurtEastIdentity(c);
function infillFrankfurtEastReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const colosseoReady=__infillRead_MODELS().filter(m=>m.cohort==='colosseo').every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);return rows.length===1&&unchanged(rows[0],m.data.source,m.data.identity.signature);});
 const groupMissing=__infillRead_MODELS().some(m=>!components.some(c=>c.city==='frankfurt'&&c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId));
 if(groupMissing)return{components,stats}; // Incomplete streaming group: no replacement; target SHA gate remains unsatisfied.
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=__infillRead_MODELS().find(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);if(!model)return c;const source=model.data.source;
 const ready=(model.cohort!=='colosseo'||colosseoReady)&&components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&unchanged(c,source,model.data.identity.signature);
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.data.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:model.sha,vertices,triangles,geometryRole:model.cohort==='colosseo'?'exact-native-child-group-display-deduplication':'owner-authorized-source-bound-photo-proportion-display'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtExterior:{sourceRetained:true,patchSHA:model.sha,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:true}}};});return{components:mapped,stats};
}
function infillFrankfurtEastBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){return infillFrankfurtEastMetadata.infillFrankfurtEastBaseMaterials(components,paint,frames);}

return {get MODELS(){return __infillRead_MODELS();},infillFrankfurtEastIdentity,infillFrankfurtEastReconstruction,infillFrankfurtEastBaseMaterials};
});}
function getMODELS(scope:FrozenDataScope|undefined){return getInfillData(scope).MODELS;}
export function infillFrankfurtEastIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtEastIdentity']>,scope?:FrozenDataScope]){return infillFrankfurtEastMetadata.infillFrankfurtEastIdentity(args[0]);}
export function infillFrankfurtEastReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtEastReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillFrankfurtEastReconstructionCold(...args.slice(0,1) as Parameters<typeof infillFrankfurtEastReconstructionCold>);return getInfillData(scope).infillFrankfurtEastReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtEastReconstruction']>);}
export function infillFrankfurtEastBaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtEastBaseMaterials']>,scope?:FrozenDataScope]){return infillFrankfurtEastMetadata.infillFrankfurtEastBaseMaterials(args[0],args[1],args[2]);}
export const infillDataFunctionArities={"infillFrankfurtEastIdentity":1,"infillFrankfurtEastReconstruction":1,"infillFrankfurtEastBaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,__infillResourceDependency1];

function infillFrankfurtEastReconstructionCold(components:BuildingComponent[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components,stats};}

const infillPreparationPairs=[["osm/way/28269144","osm/way/28269144/component/6463c3a2861e251b2035"],["osm/way/28359490","osm/way/28359490/component/6bc060b0c533d4739f1c"],["osm/way/827425009","osm/way/827425009/component/c73d84b5e040a5e1b648"],["osm/relation/123836","osm/relation/123836/component/a8e444e1fe911e39ca5a"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillFrankfurtEastMetadata.infillFrankfurtEastIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillFrankfurtEastIdentity","infillFrankfurtEastBaseMaterials"] as const;
