import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from './infill-data-contract';
import * as originalPaintProvider from './f278-original-provider';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {f278Ready594,f278Display594,f278Holds594,applyF278594} from './f278-original-recovery';
import {progressivePaintData,applyProgressiveFrames,progressiveAdmission} from './f278-original-provider';
export {OWNER_SHAPE_PATCH_PROFILES as INFILL_AALTO_ORIGINAL_PROFILES} from './f278-original-profiles';
export const infillAaltoOriginalIdentity=(c:BuildingComponent)=>c.city==='essen'&&(c.objectId==='osm/way/25716195'||c.objectId==='osm/way/1037505172');
export const infillAaltoOriginalReady=f278Ready594;
export const infillAaltoOriginalDisplay=f278Display594;
export const infillAaltoOriginalHolds=f278Holds594;
// raw includes original native and both SHA-verified owner assets; draw excludes the held native canopy.
export function infillAaltoOriginalBaseMaterials(draw:BuildingComponent[],paint:Float32Array,frames:Float32Array,raw:BuildingComponent[],native:(c:BuildingComponent)=>string|undefined,owner:(c:BuildingComponent)=>string|undefined,scope?:FrozenDataScope){
 if(!f278Ready594(raw,native,owner))return{vertices:0,ready:false};
 const colors=progressivePaintData(draw,scope),originalFrames=new Float32Array(frames.length);applyProgressiveFrames(draw,originalFrames,scope);
 let offset=0;for(const c of draw){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0);if(progressiveAdmission(c,scope)){for(let i=offset;i<offset+n;i++){if(colors[i*4+3]>.5)paint.set(colors.subarray(i*4,i*4+4),i*4);if(originalFrames[i*5+4]>0)frames.set(originalFrames.subarray(i*5,i*5+5),i*5);}}offset+=n;}
 return{vertices:applyF278594(draw,paint,frames,raw,native,owner),ready:true,restoredOriginalAccepted:true};
}

export const infillDataRefs=originalPaintProvider.infillDataRefs;
export const infillDataMemoKeys:readonly object[]=[];
export const infillDataDependencies=():readonly InfillDataModule[]=>[originalPaintProvider];
export const infillDataFunctionArities={infillAaltoOriginalBaseMaterials:6} as const;

export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 await originalPaintProvider.prepareInfillData(components,signal,scope);
}
