import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import {infillSynagogeReconstructionMetadata} from './bremen-infill-owner-metadata';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {decodeBuildingShard} from './building-mesh-codec';



export const INFILL_SYNAGOGE_SHA="884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc";

const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));

export function infillSynagogeBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillSynagogeExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"884a5230c8385146354e876296f429bc1d5e99da2f7f58a977eaa8a53d362ecc",file:"painted/infill/safety/infill-synagoge-reconstruction.ts",occurrence:0,codec:'json'},{canonicalSHA256:"430157f3e3cca56f8100e852ba513f4e492392c2c281f68cd25813ce178542ce",file:"painted/infill/safety/infill-synagoge-reconstruction.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-synagoge-reconstruction.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_DISPLAY=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[0],value=>value));
const __infillRead_SOURCE_SHARD=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[1],value=>value));
const __infillRead_ORIGINAL=scopedInfillValue(()=>decodeBuildingShard(__infillRead_SOURCE_SHARD(),"essen").components);
const infillSynagogeIdentity=(c:Identity&{city?:string})=>infillSynagogeReconstructionMetadata.infillSynagogeIdentity(c);

function infillSourceReadyForDisplay(components:BuildingComponent[]):boolean{
    const stats: OwnerReconstructionStats = { objects: 0, vertices: 0, triangles: 0, originalVertices: 0, sourceRetained: true, actualVisualAccepted: false, components: [] };
    if (!components.some(infillSynagogeIdentity) || components.some(c => c.displayEstimates?.infillSynagogeExterior))
        return false;
    const loaded = components.filter(infillSynagogeIdentity);
    if (!__infillRead_ORIGINAL().every(s => loaded.filter(c => c.objectId === s.objectId && c.partId === s.partId).length === 1 && loaded.some(c => c.objectId === s.objectId && c.partId === s.partId && equalSource(c, s)))) {
        stats.error = 'Alte Synagoge requires all19 unchanged real native source carriers';
        return false;
    }

return true;
}
function infillSynagogeReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillSynagogeIdentity)||components.some(c=>c.displayEstimates?.infillSynagogeExterior))return{components,stats};
 const loaded=components.filter(infillSynagogeIdentity);
 if(!__infillRead_ORIGINAL().every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='Alte Synagoge requires all19 unchanged real native source carriers';return{components,stats};}
 const batches=__infillRead_DISPLAY().batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));
 const source=loaded.find(c=>c.objectId===__infillRead_DISPLAY().objectId&&c.partId===__infillRead_DISPLAY().partId)!;
 const replacement={...source,...__infillRead_DISPLAY(),batches,sourceFeature:source.sourceFeature,displayEstimates:{...__infillRead_DISPLAY().displayEstimates,infillSynagogeExterior:{...__infillRead_DISPLAY().displayEstimates.infillSynagogeExterior,patchSHA:INFILL_SYNAGOGE_SHA}}} as BuildingComponent;
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 stats.objects=1;stats.vertices=vertices;stats.triangles=triangles;stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);stats.components.push({objectId:__infillRead_DISPLAY().objectId,partId:__infillRead_DISPLAY().partId,sourcePartId:__infillRead_DISPLAY().partId,patchSHA256:INFILL_SYNAGOGE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
 return{components:[...components.filter(c=>!infillSynagogeIdentity(c)),replacement],stats};
}

return {infillSourceReadyForDisplay,get DISPLAY(){return __infillRead_DISPLAY();},get SOURCE_SHARD(){return __infillRead_SOURCE_SHARD();},get ORIGINAL(){return __infillRead_ORIGINAL();},infillSynagogeIdentity,infillSynagogeReconstruction};
});}
function getDISPLAY(scope:FrozenDataScope|undefined){return getInfillData(scope).DISPLAY;}
function getSOURCE_SHARD(scope:FrozenDataScope|undefined){return getInfillData(scope).SOURCE_SHARD;}
function getORIGINAL(scope:FrozenDataScope|undefined){return getInfillData(scope).ORIGINAL;}
export function infillSynagogeIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillSynagogeIdentity']>,scope?:FrozenDataScope]){return infillSynagogeReconstructionMetadata.infillSynagogeIdentity(args[0]);}
export function infillSynagogeReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillSynagogeReconstruction']>,scope?:FrozenDataScope]){if(!mayMatchInfillData(args[0])){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:args[0],stats};}const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).infillSynagogeReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillSynagogeReconstruction']>);}
export const infillDataFunctionArities={"infillSynagogeIdentity":1,"infillSynagogeReconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

export const mayMatchInfillData=(components:readonly BuildingComponent[]):boolean=>components.some(c=>infillSynagogeIdentity(c));
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!mayMatchInfillData(components))return;
 await scope.prepare([infillOwnDataRefs[1]],signal);signal.throwIfAborted();
 if(getInfillData(scope).infillSourceReadyForDisplay(components as BuildingComponent[]))await scope.prepare([infillOwnDataRefs[0]],signal);
 signal.throwIfAborted();
}
