import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {InfillDataModule} from './infill-data-contract';
import {prepareInfillOwnerModule} from './infill-owner-preparation';
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {getSOURCE,getDERIVED,prepareF278Source,prepareF278Derived,BINDINGS} from './f278-pinned-data';
import * as pinnedDataModule from './f278-pinned-data';
import {OWNER_SHAPE_PATCH_PROFILES as PROFILES} from './f278-original-profiles';
import {nativePaintSignature} from './f278-original-signature';
import {f278Ready594,f278Display594,f278Holds594} from './f278-original-recovery';
import {infillAaltoOriginalBaseMaterials as originalMaterials} from './infill-f278-original-materials';
import * as originalMaterialModule from './infill-f278-original-materials';
const PATCH='54141b8bae1865d0bf3e8e34d7cc78614934af932cf23a60d20e632033898abb';
const same=(a:Identity,b:Identity)=>a.objectId===b.objectId&&a.partId===b.partId;
export const infillF278OriginalIdentity=(c:Identity)=>BINDINGS.some(s=>same(c,s));
export const infillF278OriginalDerivedIdentity=(c:Identity)=>PROFILES.some(s=>same(c,s));
function exact(c:BuildingComponent,s:BuildingComponent){return nativePaintSignature(c)===nativePaintSignature(s)&&JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(s.sourceFeature)&&c.batches.length===s.batches.length&&c.batches.every((b,i)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],v=(s.batches[i] as any)[k];return a?.length===v?.length&&Array.from(a as ArrayLike<number>).every((x,j)=>Object.is(x,v[j]));}));}
export function infillF278OriginalReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const cs=components.filter(c=>c.city==='essen'&&infillF278OriginalIdentity(c));if(!cs.length)return{components,stats};
 const counts=BINDINGS.map(s=>cs.filter(c=>same(c,s)).length);if(counts.some(n=>n>1)){stats.error='F278 duplicate original source';return{components,stats};}if(counts.some(n=>n===0))return{components,stats};
 if(cs.every(c=>c.displayEstimates?.infillF278Original)){if(PROFILES.some(d=>components.filter(c=>same(c,d)&&c.displayEstimates?.infillF278Original).length!==1))stats.error='F278 restored derived group mismatch';return{components,stats};}
 if(components.some(c=>infillF278OriginalDerivedIdentity(c))||cs.some(c=>!exact(c,getSOURCE(scope).find(s=>same(c,s))))){stats.error='F278 original source changed or derived collision';return{components,stats};}
 const leaf=(c:BuildingComponent)=>BINDINGS.find(p=>same(c,p))?.leafSHA256,owner=(c:BuildingComponent)=>PROFILES.find(p=>same(c,p))?.sha256;
 const derived=getDERIVED(scope).map(c=>({...c,batches:c.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color]}))})) as BuildingComponent[],raw=[...cs,...derived];
 if(!f278Ready594(raw,leaf,owner)){stats.error='F278 original594 exact group rejected';return{components,stats};}
 const held=f278Holds594(raw,leaf,owner),draw=raw.filter(c=>!held.includes(c)&&f278Display594(c,raw,leaf,owner));const n=draw.reduce((s,c)=>s+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),paint=new Float32Array(n*4),frames=new Float32Array(n*5);let at=0;for(const c of draw)for(const b of c.batches)for(let j=0;j<b.positions.length/3;j++,at++)paint.set([...b.color,2],at*4);
 const applied=originalMaterials(draw,paint,frames,raw,leaf,owner,scope);if(!applied.ready){stats.error='F278 original paint rejected';return{components,stats};}
 const map=new Map<string,any[]>();at=0;for(const c of draw)map.set(c.partId,c.batches.map(b=>{const n=b.positions.length/3,out={...b,paint:Array.from(paint.subarray(at*4,(at+n)*4)),frames:Array.from(frames.subarray(at*5,(at+n)*5))};at+=n;return out;}));
 const restore=(c:BuildingComponent,isDerived:boolean)=>{const batches=map.get(c.partId)??[],vertices=batches.reduce((s,b)=>s+b.positions.length/3,0),triangles=batches.reduce((s,b)=>s+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=isDerived?0:c.batches.reduce((s,b)=>s+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:isDerived?PROFILES.find(p=>same(c,p))!.sourcePartId:c.partId,patchSHA256:PATCH,vertices,triangles,geometryRole:isDerived?'owner-authorized-derived-only-original-footprint':vertices?'owner-authorized-reconstruction':'owner-native-coface-display-mask'} as any);return{...c,batches,displayEstimates:{...c.displayEstimates,infillF278Original:true,restoredExistingAcceptedGeometry:true,sourceRetained:!isDerived,derivedOnly:isDerived,sourceAbsent:isDerived,F278DerivedOnly:isDerived?{sourceAbsent:true,nativeGetterCount:0,patchSHA256:PATCH,displayOnlyId:c.objectId,partId:c.partId}:undefined}};};
 return{components:[...components.map(c=>c.city==='essen'&&infillF278OriginalIdentity(c)?restore(c,false):c),...derived.map(c=>restore(c,true))],stats};
}
export function infillF278OriginalBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let at=0,objects=0,vertices=0;for(const c of components){const yes=c.city==='essen'&&!!c.displayEstimates?.infillF278Original;if(yes)objects++;for(const b of c.batches){const n=b.positions.length/3;if(yes){paint.set((b as any).paint,at*4);frames.set((b as any).frames,at*5);vertices+=n;}at+=n;}}return{objects,vertices,restoredOriginalProvider:true,actualVisualAccepted:false};}
export function infillF278OriginalSerializeDerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent=true){if(!c||!infillF278OriginalDerivedIdentity(c)||!c.displayEstimates?.infillF278Original)return undefined;if(!sourceAbsent)throw Error('F278 derived identity entered native source registry');return{displayOnlyId:c.objectId,objectId:c.objectId,partId:c.partId,patchSHA256:PATCH,originalAssetSHA256:PROFILES.find(p=>same(c,p))!.sha256,sourceAbsent:true,nativeGetterCount:0,generation:c.generation??null,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:[...b.color]}))};}

export const infillDataRefs=[] as const;
export const infillDataMemoKeys=[] as const;
export const infillDataDependencies=():readonly InfillDataModule[]=>[originalMaterialModule,pinnedDataModule];
export const infillDataFunctionArities={infillF278OriginalReconstruction:1} as const;
export const mayMatchInfillData=(components:readonly BuildingComponent[])=>components.some(c=>c.city==='essen'&&infillF278OriginalIdentity(c));
/** Original pinned literals are immutable code data. Prepare the independent
 * material resource only on the original complete, unchanged source path. */
export async function prepareInfillData(components:readonly BuildingComponent[],signal:AbortSignal,scope:FrozenDataScope):Promise<void>{
 signal.throwIfAborted();const cs=components.filter(c=>c.city==='essen'&&infillF278OriginalIdentity(c));signal.throwIfAborted();if(!cs.length)return;
 const counts=BINDINGS.map(s=>cs.filter(c=>same(c,s)).length),skip=counts.some(n=>n!==1)||cs.every(c=>c.displayEstimates?.infillF278Original);signal.throwIfAborted();if(skip)return;
 const collision=components.some(c=>infillF278OriginalDerivedIdentity(c));signal.throwIfAborted();if(collision)return;
 await prepareF278Source(signal,scope);signal.throwIfAborted();
 const changed=cs.some(c=>!exact(c,getSOURCE(scope).find(s=>same(c,s))));signal.throwIfAborted();if(changed)return;
 await prepareF278Derived(signal,scope);signal.throwIfAborted();
 const leaf=(c:BuildingComponent)=>BINDINGS.find(p=>same(c,p))?.leafSHA256,owner=(c:BuildingComponent)=>PROFILES.find(p=>same(c,p))?.sha256;
 const raw=[...cs,...getDERIVED(scope)] as BuildingComponent[],ready=f278Ready594(raw,leaf,owner);signal.throwIfAborted();if(!ready)return;
 await prepareInfillOwnerModule(originalMaterialModule,raw,signal,scope);signal.throwIfAborted();
}

export function infillProgressiveObjectDemand(components:readonly {city:string;objectId:string;partId:string}[]){if(!components.some(c=>c.city==='essen'&&infillF278OriginalIdentity(c)))return[];return[...BINDINGS,...PROFILES].map(row=>({city:'essen',objectId:row.objectId as string,partId:row.partId as string}));}

export const infillDataResidentMemoKeys=pinnedDataModule.infillDataResidentMemoKeys;
