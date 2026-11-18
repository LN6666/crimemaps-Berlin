import {infillResourceIdentityCandidate} from './infill-resource-header-metadata';
import {prepareInfillDataResources} from './infill-owner-preparation';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule,InfillDataPreparationContext} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getJW_MARRIOTT_DATA as __infillDataDependency0,JW_MARRIOTT_SHA} from './infill-frankfurt-jw-marriott-data';

const unchanged=(c:BuildingComponent,source:any,signature:string)=>nativePaintSignature(c)===signature&&['origin','componentGeometry','sourceFeature'].every(k=>JSON.stringify((c as any)[k])===JSON.stringify(source[k]))&&c.batches.length===source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=source.batches[bi][k];return a.length===e.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));




import * as __infillResourceDependency0 from './infill-frankfurt-jw-marriott-data';
const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-frankfurt-jw-marriott.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const __infillRead_JW_MARRIOTT_DATA=scopedInfillValue(()=>__infillDataDependency0(scope));
const __infillRead_MODELS=scopedInfillValue(()=>__infillRead_JW_MARRIOTT_DATA().models.map(data=>({data,sha:JW_MARRIOTT_SHA})));
const infillFrankfurtJwMarriottIdentity=(c:Identity)=>__infillRead_MODELS().some(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);
function infillFrankfurtJwMarriottReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const colosseoReady=__infillRead_MODELS().every(m=>{const rows=components.filter(c=>c.city==='frankfurt'&&c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);return rows.length===1&&unchanged(rows[0],m.data.source,m.data.identity.signature);});
 const mapped=components.map(c=>{if(c.city!=='frankfurt')return c;const model=__infillRead_MODELS().find(m=>c.objectId===m.data.identity.objectId&&c.partId===m.data.identity.partId);if(!model)return c;const source=model.data.source;
 const ready=colosseoReady&&components.filter(q=>q.city===c.city&&q.objectId===c.objectId&&q.partId===c.partId).length===1&&unchanged(c,source,model.data.identity.signature);
 if(!ready){stats.error='Frankfurt infill requires one unchanged exact native carrier per target';return c;}
 const batches=model.data.display.map(b=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:model.sha,vertices,triangles,geometryRole:'source-bound-jw-marriott-hotel-slab-and-west-lowpart'});
 return{...c,batches,displayEstimates:{...c.displayEstimates,infillFrankfurtJwMarriottExterior:{sourceRetained:true,patchSHA:model.sha,displayEstimate:true,surveyed:false,materialsComplete:true,fineTextureDeferred:true}}};});return{components:mapped,stats};
}
function infillFrankfurtJwMarriottBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtJwMarriottIdentity(c)&&!!c.displayEstimates?.infillFrankfurtJwMarriottExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

return {get MODELS(){return __infillRead_MODELS();},infillFrankfurtJwMarriottIdentity,infillFrankfurtJwMarriottReconstruction,infillFrankfurtJwMarriottBaseMaterials};
});}
function getMODELS(scope:FrozenDataScope|undefined){return getInfillData(scope).MODELS;}
export function infillFrankfurtJwMarriottIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottIdentity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillFrankfurtJwMarriottIdentityCold(args[0],scope);return getInfillData(scope).infillFrankfurtJwMarriottIdentity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottIdentity']>);}
export function infillFrankfurtJwMarriottReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottReconstruction']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillFrankfurtJwMarriottReconstructionCold(args[0],scope);return getInfillData(scope).infillFrankfurtJwMarriottReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottReconstruction']>);}
export function infillFrankfurtJwMarriottBaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottBaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;if(scope?.stats.disposed)getInfillData(scope);if(!mayMatchInfillData(Array.isArray(args[0])?args[0]:[args[0] as BuildingComponent]))return infillFrankfurtJwMarriottBaseMaterialsCold(args[0],args[1],args[2],scope);return getInfillData(scope).infillFrankfurtJwMarriottBaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['infillFrankfurtJwMarriottBaseMaterials']>);}
export const infillDataFunctionArities={"infillFrankfurtJwMarriottIdentity":1,"infillFrankfurtJwMarriottReconstruction":1,"infillFrankfurtJwMarriottBaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[__infillResourceDependency0];

function infillFrankfurtJwMarriottIdentityCold(c:Identity,scope?:FrozenDataScope){
return false;}

function infillFrankfurtJwMarriottReconstructionCold(components:BuildingComponent[],scope?:FrozenDataScope){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
return {components:components.map(component=>component),stats};}

function infillFrankfurtJwMarriottBaseMaterialsCold(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;
for(const c of components){const match=c.city==='frankfurt'&&infillFrankfurtJwMarriottIdentity(c)&&!!c.displayEstimates?.infillFrankfurtJwMarriottExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}
return{objects,vertices,actualVisualAccepted:false};
return {objects:0,vertices:0,actualVisualAccepted:false};}
export function mayMatchInfillData(components:readonly BuildingComponent[]){return components.some(c=>(infillResourceIdentityCandidate("infill-frankfurt-jw-marriott.ts",c)||c.displayEstimates?.infillFrankfurtJwMarriottExterior));}
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope,context?:InfillDataPreparationContext){signal.throwIfAborted();if(!mayMatchInfillData(components))return;await prepareInfillDataResources({infillDataRefs,infillDataDependencies},components,signal,scope,context);}
export const infillDataMetadataFunctions=[] as const;
