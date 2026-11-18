/** DISPLAY_LIST scalar projection, canonical fbf21988fd24e9d63197feeaf15da5f3085bb7e331546adadff2ffdbad45215a. */
const INFILL_GALERIE_DISPLAY_COUNT=9;
import {bremenIdentityMatches} from '../../bremen/safety/bremen-identity-metadata';
import {scopedInfillValue} from './infill-data-contract';
import type {InfillDataModule} from './infill-data-contract';
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {decodeBuildingShard} from './building-mesh-codec';



export const INFILL_GALERIE_SHA="fbf21988fd24e9d63197feeaf15da5f3085bb7e331546adadff2ffdbad45215a";

const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));

export function infillGalerieBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillGalerieExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[{canonicalSHA256:"fbf21988fd24e9d63197feeaf15da5f3085bb7e331546adadff2ffdbad45215a",file:"painted/infill/safety/infill-essen-rathaus-galerie.ts",occurrence:0,codec:'json'},{canonicalSHA256:"ef6aa3af04f88158d20d51e6dad903876e4f6895f14dca1388533bc0667bbb26",file:"painted/infill/safety/infill-essen-rathaus-galerie.ts",occurrence:0,codec:'json'}];
export const infillDataRefs:readonly FrozenDataRef[]=infillOwnDataRefs;
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("infill-essen-rathaus-galerie.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{

const __infillRead_DISPLAY_LIST=scopedInfillValue<any[]>(()=>scope.borrow<any[],any[]>(infillOwnDataRefs[0],value=>value));
const __infillRead_SOURCE_SHARD=scopedInfillValue<any>(()=>scope.borrow<any,any>(infillOwnDataRefs[1],value=>value));
const __infillRead_ORIGINAL=scopedInfillValue(()=>decodeBuildingShard(__infillRead_SOURCE_SHARD(),"essen").components);
const infillGalerieIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("infillGalerieIdentity",c);

function infillSourceReadyForDisplay(components:BuildingComponent[]):boolean{
    const stats: OwnerReconstructionStats = { objects: 0, vertices: 0, triangles: 0, originalVertices: 0, sourceRetained: true, actualVisualAccepted: false, components: [] };
    if (!components.some(infillGalerieIdentity))
        return false;
    const loaded = components.filter(infillGalerieIdentity);
    if (loaded.length === INFILL_GALERIE_DISPLAY_COUNT && loaded.every(c => (c.displayEstimates?.infillGalerieExterior as {
        patchSHA?: string;
    } | undefined)?.patchSHA === INFILL_GALERIE_SHA))
        return false;
    if (__infillRead_ORIGINAL().some(s => !loaded.some(c => c.objectId === s.objectId && c.partId === s.partId)))
        return false;
    if (!__infillRead_ORIGINAL().every(s => loaded.filter(c => c.objectId === s.objectId && c.partId === s.partId).length === 1 && loaded.some(c => c.objectId === s.objectId && c.partId === s.partId && equalSource(c, s)))) {
        stats.error = 'Galerie requires complete unchanged real native source group';
        return false;
    }

return true;
}
function infillGalerieReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!components.some(infillGalerieIdentity))return{components,stats};
 const loaded=components.filter(infillGalerieIdentity);
 if(loaded.length===INFILL_GALERIE_DISPLAY_COUNT&&loaded.every(c=>(c.displayEstimates?.infillGalerieExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_GALERIE_SHA))return{components,stats};
 // Streaming can expose a proper subset before the remaining real carriers arrive. Do not admit DISPLAY or report a geometry failure during that state.
 if(__infillRead_ORIGINAL().some(s=>!loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId)))return{components,stats};
 if(!__infillRead_ORIGINAL().every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='Galerie requires complete unchanged real native source group';return{components,stats};}
 const replacements=__infillRead_DISPLAY_LIST().map((display:any)=>{const batches=display.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:display.objectId,partId:display.partId,sourcePartId:display.partId,patchSHA256:INFILL_GALERIE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction-per-real-source-identity'});const source=loaded.find(c=>c.objectId===display.objectId&&c.partId===display.partId)!;return{...source,...display,batches,sourceFeature:source.sourceFeature,displayEstimates:{...display.displayEstimates,infillGalerieExterior:{...display.displayEstimates.infillGalerieExterior,patchSHA:INFILL_GALERIE_SHA}}} as BuildingComponent;});
 stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 return{components:[...components.filter(c=>!infillGalerieIdentity(c)),...replacements],stats};
}

return {infillSourceReadyForDisplay,get DISPLAY_LIST(){return __infillRead_DISPLAY_LIST();},get SOURCE_SHARD(){return __infillRead_SOURCE_SHARD();},get ORIGINAL(){return __infillRead_ORIGINAL();},infillGalerieIdentity,infillGalerieReconstruction};
});}
function getDISPLAY_LIST(scope:FrozenDataScope|undefined){return getInfillData(scope).DISPLAY_LIST;}
function getSOURCE_SHARD(scope:FrozenDataScope|undefined){return getInfillData(scope).SOURCE_SHARD;}
function getORIGINAL(scope:FrozenDataScope|undefined){return getInfillData(scope).ORIGINAL;}
export function infillGalerieIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['infillGalerieIdentity']>,scope?:FrozenDataScope]){return bremenIdentityMatches("infillGalerieIdentity",args[0]);}
export function infillGalerieReconstruction(...args:[...Parameters<ReturnType<typeof getInfillData>['infillGalerieReconstruction']>,scope?:FrozenDataScope]){if(!mayMatchInfillData(args[0])){const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};return{components:args[0],stats};}const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).infillGalerieReconstruction(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['infillGalerieReconstruction']>);}
export const infillDataFunctionArities={"infillGalerieIdentity":1,"infillGalerieReconstruction":1} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[];

export const mayMatchInfillData=(components:readonly BuildingComponent[]):boolean=>components.some(c=>infillGalerieIdentity(c));
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();if(!mayMatchInfillData(components))return;
 await scope.prepare([infillOwnDataRefs[1]],signal);signal.throwIfAborted();
 if(getInfillData(scope).infillSourceReadyForDisplay(components as BuildingComponent[]))await scope.prepare([infillOwnDataRefs[0]],signal);
 signal.throwIfAborted();
}
