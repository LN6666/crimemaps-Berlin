import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillC032OfficialRuntimeMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {progressiveAdmission} from './c032-original-provider';
import * as originalPaintProvider from './c032-original-provider';
import {getC032_OFFICIAL_BATCH as __infillDataDependency0} from './c032-official-data';
export const INFILL_C032_OFFICIAL_SHA="5700f80de1ee690e7d942a3da9693d13e4f42d11638f509a7e83035453982406";
const MAIN='osm/relation/2181079';




export function infillC032OfficialBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=!!(c.displayEstimates as any)?.infillC032Official;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);for(let vi=0;vi<n;vi++){const family=(b as any).paint[vi*4+3];if(family>=26100&&family<=26103){paint[(offset+vi)*4+3]=2;frames[(offset+vi)*5+4]=family;}}vertices+=n;}offset+=n;}}return{objects,vertices,actualVisualAccepted:false};}

import * as __infillResourceDependency0 from './c032-official-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-c032-official-runtime.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_C032_OFFICIAL_BATCH=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_LETTERS=scopedInfillValue(()=>new Set(["osm/way/519940997", "osm/way/519941004", "osm/way/519941007", "osm/way/519941011", "osm/way/519941015", "osm/way/519941027", "osm/way/519941040", "osm/way/519941056", "osm/way/520260875", "osm/way/520260886", "osm/way/530332851", "osm/way/530332854", "osm/way/530332856", "osm/way/530332859", "osm/way/530332860", "osm/way/530332864", "osm/way/530332868", "osm/way/530332869", "osm/way/530332870", "osm/way/530332872", "osm/way/530332875", "osm/way/530332876", "osm/way/530332880", "osm/way/530332881", "osm/way/530332886", "osm/way/530332888", "osm/way/530332890", "osm/way/530332891", "osm/way/530332892", "osm/way/530332894", "osm/way/530332895", "osm/way/530332901", "osm/way/530332908", "osm/way/530332912", "osm/way/530332916", "osm/way/530332924", "osm/way/530332934", "osm/way/530332938", "osm/way/530332941", "osm/way/530332946", "osm/way/530471288", "osm/way/530471290", "osm/way/530471291", "osm/way/1050053118", "osm/way/1050053120", "osm/way/1050053121"]));
const __infillRead_BODIES=scopedInfillValue(()=>new Set(['osm/way/452269645','osm/way/452269646','osm/way/452269647','osm/way/519941075']));
const infillC032OfficialIdentity=(c:any)=>infillC032OfficialRuntimeMetadata.infillC032OfficialIdentity(c);
function infillC032OfficialReconstruction(components:BuildingComponent[]){
 const stats:any={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const main=components.find(c=>c.objectId===MAIN&&c.city==='essen');
 if(!main||!progressiveAdmission(main,scope))return{components,stats};
 if((main.displayEstimates as any)?.infillC032Official?.patchSHA===INFILL_C032_OFFICIAL_SHA)return{components,stats};
 const result=components.map(c=>{if(!infillC032OfficialIdentity(c)||!progressiveAdmission(c,scope))return c;
 const admission:any=progressiveAdmission(c,scope);
 const batches=c.objectId===MAIN?[{...__infillRead_C032_OFFICIAL_BATCH(),...Object.fromEntries(['positions','normals','indices','color','frames','paint'].map(k=>[k,[...__infillRead_C032_OFFICIAL_BATCH()[k]]]))}]:__infillRead_LETTERS().has(c.objectId)?c.batches.map((b:any,bi:number)=>{const positions=Array.from(b.positions as ArrayLike<number>);for(let i=1;i<positions.length;i+=3)positions[i]+=1.7526790433737431;const count=positions.length/3,color=admission.batchColors?.[bi]||b.color,family=admission.family;return{...b,positions,normals:Array.from(b.normals),indices:Array.from(b.indices),color:[...b.color],frames:Array.from({length:count},()=>[0,0,1,1,1]).flat(),paint:Array.from({length:count},()=>[...color,family]).flat()};}):[];
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,vertices,triangles,patchSHA256:INFILL_C032_OFFICIAL_SHA,geometryRole:vertices?'official-28-part-complete-shell-or-reanchored-original-letters':'SOURCE-retained-official-shell-replaces-coarse-overlap'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillC032Official:{patchSHA:INFILL_C032_OFFICIAL_SHA,officialParent:'8150547',sourceRetained:true,sourceOnly:!vertices}}};});return{components:result,stats};
}

return {get LETTERS(){return __infillRead_LETTERS();},get BODIES(){return __infillRead_BODIES();},infillC032OfficialIdentity,infillC032OfficialReconstruction};
});}
function getLETTERS(scope:FrozenDataScope|undefined){return getInfillData(scope).LETTERS;}
function getBODIES(scope:FrozenDataScope|undefined){return getInfillData(scope).BODIES;}
export function infillC032OfficialIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillC032OfficialIdentity']>,scope?:FrozenDataScope]){return infillC032OfficialRuntimeMetadata.infillC032OfficialIdentity(args[0]);}
export function infillC032OfficialReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillC032OfficialReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillC032OfficialReconstructionCold(...args.slice(0,1) as Parameters<typeof infillC032OfficialReconstructionCold>);return getInfillData(scope).infillC032OfficialReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillC032OfficialReconstruction']>);}
export const infillDataFunctionArities={"infillC032OfficialIdentity":1,"infillC032OfficialReconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0,originalPaintProvider];

function infillC032OfficialReconstructionCold(components:BuildingComponent[]){const stats:any={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
// The metadata guard already excluded every candidate; no scoped data is needed.
return {components:components,stats};}

const infillPreparationPairs=[] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillC032OfficialRuntimeMetadata.infillC032OfficialIdentity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillC032OfficialIdentity"] as const;
