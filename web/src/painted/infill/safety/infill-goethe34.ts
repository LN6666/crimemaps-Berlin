import {prepareInfillDataResources,infillMetadataCandidate} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import {infillGoethe34Metadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getGOETHE34_DATA as __infillDataDependency0,GOETHE34_SHA} from './infill-goethe34-data';
type LowGroup={queueId:string;models:any[];requiredNativeGroup:string[];geometryReadyForPreview:boolean;materialsComplete:boolean;detail70Implemented?:boolean};

const unchanged=(c:BuildingComponent,s:any,sig:string)=>nativePaintSignature(c)===sig&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=s.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));


export function infillGoethe34BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&!!c.displayEstimates?.infillGoethe34;if(match)objects++;for(const b of c.batches){const n=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=n;}offset+=n;}}return {objects,vertices,actualVisualAccepted:false};}

import * as __infillResourceDependency0 from './infill-goethe34-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-goethe34.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_GOETHE34_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_GROUPS=scopedInfillValue<LowGroup[]>(()=>[__infillRead_GOETHE34_DATA()]);
const infillGoethe34Identity=(c:Identity)=>infillGoethe34Metadata.infillGoethe34Identity(c);
function infillGoethe34Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 // Each independent group fails closed. An absent/changed sibling can never remove its SOURCE.
 const ready=__infillRead_GROUPS().filter(g=>(!selectedQueueIds||selectedQueueIds.includes(g.queueId))&&g.geometryReadyForPreview&&g.models.length===g.requiredNativeGroup.length&&g.models.every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m.source,m.identity.signature);}));
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const group=ready.find(g=>g.models.some(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));if(!group)return c;const m=group.models.find(m=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId)!;
 const batches:any[]=m.display.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:GOETHE34_SHA,vertices,triangles,geometryRole:'source-bound-official-with-photo-estimated-curved-roof'});
 return {...c,batches,displayEstimates:{...c.displayEstimates,infillGoethe34:{queueId:group.queueId,patchSHA:GOETHE34_SHA,sourceRetained:true,officialGeometryWithExplicitEstimatedInterpolation:true,actualVisualAccepted:false,materialsComplete:group.materialsComplete,detail70Complete:!!group.detail70Implemented}}};});return {components:mapped,stats};
}

return {get GROUPS(){return __infillRead_GROUPS();},infillGoethe34Identity,infillGoethe34Reconstruction};
});}
function getGROUPS(scope:FrozenDataScope|undefined){return getInfillData(scope).GROUPS;}
export function infillGoethe34Identity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillGoethe34Identity']>,scope?:FrozenDataScope]){return infillGoethe34Metadata.infillGoethe34Identity(args[0]);}
export function infillGoethe34Reconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillGoethe34Reconstruction']>,scope?:FrozenDataScope]){const scope=args[2] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillGoethe34ReconstructionCold(...args.slice(0,2) as Parameters<typeof infillGoethe34ReconstructionCold>);return getInfillData(scope).infillGoethe34Reconstruction(...args.slice(0,2) as Parameters<ReturnType<typeof getInfillData>['infillGoethe34Reconstruction']>);}
export const infillDataFunctionArities={"infillGoethe34Identity":1,"infillGoethe34Reconstruction":2} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillGoethe34ReconstructionCold(components:BuildingComponent[],selectedQueueIds?:string[]){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

const infillPreparationPairs=[["osm/way/174618901","osm/way/174618901/component/30a196682a5541ccbcde"],["osm/way/174618902","osm/way/174618902/component/b19c78be59d7631f719f"],["osm/way/279950182","osm/way/279950182/component/debb290f50e76a39aedb"]] as const;
export function mayMatchInfillData(components:readonly BuildingComponent[]){return infillMetadataCandidate(components,infillGoethe34Metadata.infillGoethe34Identity,infillPreparationPairs);}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=["infillGoethe34Identity"] as const;
