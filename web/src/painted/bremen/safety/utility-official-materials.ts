import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{UTILITY_DETAIL_DATA_RESOURCE}from'./utility-detail-data';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {getUTILITY_DETAIL_DATA} from './utility-detail-data';
const same=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));

/** Full original recipe resources; city demand is deliberately coarse. */
export const UTILITY_OFFICIAL_SCOPE_RESOURCES=[UTILITY_DETAIL_DATA_RESOURCE] as const;
export const UTILITY_OFFICIAL_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=UTILITY_OFFICIAL_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=UTILITY_OFFICIAL_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"utilityOfficialDetail70BaseMaterials":3} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('utility-official-materials requires a prepared frozen data scope');return scope;}
function exact(c:BuildingComponent){if(!bremenIdentityCandidate("utility-official-materials",c))return false;const meta=c.displayEstimates?.utility70 as {inScope?:unknown,patchSHA256?:unknown}|undefined;return c.city==='bremen'&&c.objectId===getUTILITY_DETAIL_DATA(scope).identity.objectId&&c.partId===getUTILITY_DETAIL_DATA(scope).identity.partId&&meta?.inScope===true&&meta.patchSHA256===getUTILITY_DETAIL_DATA(scope).expectedUtilitySHA256&&same(c.origin,getUTILITY_DETAIL_DATA(scope).expectedOrigin)&&JSON.stringify(c.sourceFeature)===JSON.stringify(getUTILITY_DETAIL_DATA(scope).expectedSourceFeature)&&JSON.stringify(c.componentGeometry)===JSON.stringify(getUTILITY_DETAIL_DATA(scope).expectedComponentGeometry)&&c.batches.length===getUTILITY_DETAIL_DATA(scope).expectedBatches.length&&c.batches.every((b,i)=>(['positions','normals','indices']as const).every(k=>same(b[k],getUTILITY_DETAIL_DATA(scope).expectedBatches[i][k])));}
function utilityOfficialDetail70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("utility-official-materials","utilityOfficialDetail70BaseMaterials",components))return{objects:0,vertices:0,geometryUnchanged:true,actualVisualAccepted:false};const matches=components.filter(exact);if(matches.length!==1)return{objects:0,vertices:0,geometryUnchanged:true,actualVisualAccepted:false};let offset=0,vertices=0;const target=matches[0];for(const c of components)for(const b of c.batches){const count=b.positions.length/3;if(c===target){paint.set(getUTILITY_DETAIL_DATA(scope).replacementPaint,offset*4);frames.set(getUTILITY_DETAIL_DATA(scope).replacementFrames,offset*5);vertices+=count;}offset+=count;}return{objects:1,vertices,geometryUnchanged:true,sourceRetained:true,actualVisualAccepted:false};}
return{utilityOfficialDetail70BaseMaterials};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function utilityOfficialDetail70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).utilityOfficialDetail70BaseMaterials(components,paint,frames);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("utility-official-materials",name,components);
