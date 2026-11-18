import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{UTILITY70_DATA_RESOURCE}from'./utility-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getUTILITY70_DATA,UTILITY70_SHA} from './utility-data';
const exact=(c:BuildingComponent,r:any)=>c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature;
export function utility70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&(c.displayEstimates?.utility70 as {inScope?:unknown}|undefined)?.inScope===true;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_UTILITY70_SCOPE_RESOURCES=[UTILITY70_DATA_RESOURCE] as const;
export const BREMEN_UTILITY70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_UTILITY70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_UTILITY70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"utility70Identity":1,"utility70Reconstruction":2,"utility70BaseMaterials":3} as const;
const RECIPE_KEY={};
const bremen_utility70_runtime_MODELS_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-utility70-runtime requires a prepared frozen data scope');return scope;}
function _scope_MODELS():any[]{return scopeValue().memo(bremen_utility70_runtime_MODELS_KEY,()=>(getUTILITY70_DATA(scope).models));}
const utility70Identity=(c:Identity)=>bremenIdentityMatches("utility70Identity",c);
function utility70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};if(!bremenRecipeDemand("bremen-utility70-runtime","utility70Reconstruction",components))return{components:components.map(c=>c),stats};
 const ready=_scope_MODELS().filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r)).length===1));
 const result:BuildingComponent[]=components.map(c=>{const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;
 const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);
 if(!d)return {...c,batches:[],displayEstimates:{...c.displayEstimates,utility70Suppressed:{patchSHA256:UTILITY70_SHA,sourceRetained:true,reason:'Exact guarded native component covered by official whole-group DISPLAY'}}};
 const batches=d.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);
 if(d.inScope){stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:UTILITY70_SHA,vertices,triangles,geometryRole:'official-whole-building-shape-with-source-supported-material-detail-pending'});}
 return {...c,origin:[...d.origin] as [number,number],batches,displayEstimates:{...c.displayEstimates,utility70:{patchSHA256:UTILITY70_SHA,sourceRetained:true,inScope:d.inScope,officialLoD2Shape:!!d.officialLoD2Shape,detailTarget:.7,detail70Ready:false,actualVisualAccepted:false}}};});
 return {components:result,stats};
}
return{utility70Identity,utility70Reconstruction,_scope_MODELS};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function utility70Identity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("utility70Identity",c);}
export function utility70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],scope?:FrozenDataScope){return recipe(scope).utility70Reconstruction(components,selectedTargetIds);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-utility70-runtime",name,components);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["utility70BaseMaterials"] as const;
