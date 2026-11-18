import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{OFFICE7A_CONTOUR_DATA_RESOURCE}from'./office7a-contour-data';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {getOFFICE7A_CONTOUR_DATA,OFFICE7A_CONTOUR_SHA as SHA} from './office7a-contour-data';
import {getOFFICE7A70_DATA} from './office7a-data';
const same=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));

/** Full original recipe resources; city demand is deliberately coarse. */
export const OFFICE7A70_SCOPE_RESOURCES=[OFFICE7A_CONTOUR_DATA_RESOURCE] as const;
export const OFFICE7A70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=OFFICE7A70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=OFFICE7A70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"office7aContourReconstruction":1,"office7a70BaseMaterials":3} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('office7a70-materials requires a prepared frozen data scope');return scope;}
function exactBase(c:BuildingComponent,allowAdded=false){if(!bremenIdentityCandidate("office7a70-materials",c))return false;const meta=c.displayEstimates?.boundary70 as {inScope?:unknown,patchSHA256?:unknown}|undefined;return c.city==='bremen'&&c.objectId===getOFFICE7A_CONTOUR_DATA(scope).identity.objectId&&c.partId===getOFFICE7A_CONTOUR_DATA(scope).identity.partId&&meta?.inScope===true&&meta.patchSHA256===getOFFICE7A_CONTOUR_DATA(scope).expectedBoundaryDataSHA256&&same(c.origin,getOFFICE7A_CONTOUR_DATA(scope).expectedOrigin)&&JSON.stringify(c.sourceFeature)===JSON.stringify(getOFFICE7A_CONTOUR_DATA(scope).expectedSourceFeature)&&JSON.stringify(c.componentGeometry)===JSON.stringify(getOFFICE7A_CONTOUR_DATA(scope).expectedComponentGeometry)&&c.batches.length===(allowAdded?2:1)&&(allowAdded?[getOFFICE7A_CONTOUR_DATA(scope).bodyBatch]:getOFFICE7A_CONTOUR_DATA(scope).expectedBatches).every((b:any,i:number)=>(['positions','normals','indices']as const).every(k=>same(c.batches[i][k],b[k])));}
function office7aContourReconstruction(components:BuildingComponent[]){if(!bremenRecipeDemand("office7a70-materials","office7aContourReconstruction",components))return{components,objects:0,vertices:0,triangles:0,sourceRetained:true,actualVisualAccepted:false};
 const matches=components.filter(c=>exactBase(c));if(matches.length!==1)return{components,objects:0,vertices:0,triangles:0,sourceRetained:true,actualVisualAccepted:false};
 const original=matches[0];const result:BuildingComponent[]=components.map(c=>{if(c!==original)return c;return{...c,batches:[getOFFICE7A_CONTOUR_DATA(scope).bodyBatch,getOFFICE7A_CONTOUR_DATA(scope).railBatch].map((r:any)=>({...r,positions:[...r.positions],normals:[...r.normals],indices:[...r.indices],color:[...r.color],paint:[...r.paint],frames:[...r.frames]})),displayEstimates:{...c.displayEstimates,office7aContour:{patchSHA256:SHA,sourceRetained:true,photoSupportedTerraceOnly:true,officialUpperBodyRetained:true,actualVisualAccepted:false}}};});return{components:result,objects:1,vertices:(getOFFICE7A_CONTOUR_DATA(scope).bodyBatch.positions.length+getOFFICE7A_CONTOUR_DATA(scope).railBatch.positions.length)/3,triangles:(getOFFICE7A_CONTOUR_DATA(scope).bodyBatch.indices.length+getOFFICE7A_CONTOUR_DATA(scope).railBatch.indices.length)/3,sourceRetained:true,actualVisualAccepted:false};
}
function office7a70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("office7a70-materials","office7a70BaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 const matches=components.filter(c=>exactBase(c)||((c.displayEstimates?.office7aContour as {patchSHA256?:unknown}|undefined)?.patchSHA256===SHA&&exactBase(c,true)&&(['positions','normals','indices']as const).every(k=>same(c.batches[1][k],getOFFICE7A_CONTOUR_DATA(scope).railBatch[k]))));if(matches.length!==1)return{objects:0,vertices:0,actualVisualAccepted:false};let offset=0,objects=0,vertices=0;const target=matches[0];for(const c of components)for(let i=0;i<c.batches.length;i++){const b=c.batches[i],count=b.positions.length/3;if(c===target){paint.set(c.batches.length===1?getOFFICE7A70_DATA(scope).replacementPaint:i===0?getOFFICE7A_CONTOUR_DATA(scope).bodyBatch.paint:getOFFICE7A_CONTOUR_DATA(scope).railBatch.paint,offset*4);frames.set(c.batches.length===1?getOFFICE7A70_DATA(scope).replacementFrames:i===0?getOFFICE7A_CONTOUR_DATA(scope).bodyBatch.frames:getOFFICE7A_CONTOUR_DATA(scope).railBatch.frames,offset*5);objects+=i===0?1:0;vertices+=count;}offset+=count;}return{objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
return{office7aContourReconstruction,office7a70BaseMaterials};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function office7aContourReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).office7aContourReconstruction(components);}
export function office7a70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).office7a70BaseMaterials(components,paint,frames);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("office7a70-materials",name,components);
