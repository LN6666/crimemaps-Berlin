import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{KARSTADT70_DATA_RESOURCE}from'./karstadt-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getKARSTADT70_DATA,KARSTADT70_SHA} from './karstadt-data';
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function originalArray(value:string,uint=false){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/4},(_,i)=>uint?v.getUint32(i*4,true):v.getFloat32(i*4,true));}
export function karstadt70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&(c.displayEstimates?.karstadt70 as {inScope?:unknown}|undefined)?.inScope===true;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_KARSTADT70_SCOPE_RESOURCES=[KARSTADT70_DATA_RESOURCE] as const;
export const BREMEN_KARSTADT70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_KARSTADT70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_KARSTADT70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"karstadt70Identity":1,"karstadt70Reconstruction":3,"karstadt70BaseMaterials":3} as const;
const RECIPE_KEY={};
const bremen_karstadt70_runtime_MODELS_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-karstadt70-runtime requires a prepared frozen data scope');return scope;}
function _scope_MODELS():any[]{return scopeValue().memo(bremen_karstadt70_runtime_MODELS_KEY,()=>(getKARSTADT70_DATA(scope).models));}
const exact=(c:BuildingComponent,r:any,leaf:((c:BuildingComponent)=>string|undefined)|undefined)=>{if(!bremenIdentityCandidate("bremen-karstadt70-runtime",c))return false;const s=_scope_MODELS().flatMap(m=>m.nativeSourceComponents).find((s:any)=>s.objectId===r.objectId&&s.partId===r.partId);return !!leaf&&leaf(c)===r.sourceLeafSHA256&&!!s&&c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],s[k]))&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],s.batches[bi]._nativeArraysBase64?.[k]?originalArray(s.batches[bi]._nativeArraysBase64[k],k==='indices'):s.batches[bi][k])));};
const karstadt70Identity=(c:Identity)=>bremenIdentityMatches("karstadt70Identity",c);
function karstadt70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],nativeLeafSHA?:(c:BuildingComponent)=>string|undefined){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};if(!bremenRecipeDemand("bremen-karstadt70-runtime","karstadt70Reconstruction",components))return{components:components.map(c=>c),stats};
 const ready=_scope_MODELS().filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r,nativeLeafSHA)).length===1));
 const result:BuildingComponent[]=components.map(c=>{const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;
 const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);
 if(!d)return {...c,batches:[],displayEstimates:{...c.displayEstimates,karstadt70Suppressed:{patchSHA256:KARSTADT70_SHA,sourceRetained:true,reason:'Exact guarded native component covered by official whole-group DISPLAY'}}};
 const batches=d.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 if(d.inScope){stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:KARSTADT70_SHA,vertices,triangles,geometryRole:'official-whole-group-with-photo-specific-detail'});}
 return {...c,origin:[...d.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,karstadt70:{patchSHA256:KARSTADT70_SHA,sourceRetained:true,inScope:d.inScope,officialLoD2Shape:!!d.officialLoD2Shape,detailTarget:.7,actualVisualAccepted:false,outsideBankGeometryRetained:!!d.outsideBankGeometryRetained}}};});
 return {components:result,stats};
}
return{karstadt70Identity,karstadt70Reconstruction,_scope_MODELS};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function karstadt70Identity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("karstadt70Identity",c);}
export function karstadt70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],nativeLeafSHA?:(c:BuildingComponent)=>string|undefined,scope?:FrozenDataScope){return recipe(scope).karstadt70Reconstruction(components,selectedTargetIds,nativeLeafSHA);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-karstadt70-runtime",name,components);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["karstadt70BaseMaterials"] as const;
