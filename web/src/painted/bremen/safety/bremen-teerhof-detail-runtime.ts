import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{TEERHOF_DETAIL_DATA_RESOURCE}from'./bremen-teerhof-detail-data';
import type {BuildingComponent} from "../../../safety/building-mesh-types";
import {getTEERHOF_DETAIL_DATA,TEERHOF_DETAIL_SHA as SHA} from './bremen-teerhof-detail-data';
const same=(a:ArrayLike<number>|undefined,b:ArrayLike<number>)=>!!a&&a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));
const exactBatches=(c:BuildingComponent,expected:any[])=>c.batches.length===expected.length&&c.batches.every((b,bi)=>(['positions','normals','indices','paint','frames']as const).every(k=>same((b as any)[k]as ArrayLike<number>|undefined,expected[bi][k])));

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_TEERHOF_DETAIL_SCOPE_RESOURCES=[TEERHOF_DETAIL_DATA_RESOURCE] as const;
export const BREMEN_TEERHOF_DETAIL_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_TEERHOF_DETAIL_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_TEERHOF_DETAIL_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"teerhofDetailFinite":1,"teerhofDetailReconstruction":1,"teerhofDetailBaseMaterials":3,"teerhofDetailCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-teerhof-detail-runtime requires a prepared frozen data scope');return scope;}
const identity=(c:BuildingComponent)=>bremenIdentityCandidate("bremen-teerhof-detail-runtime",c)?(c.city==='bremen'&&c.objectId===getTEERHOF_DETAIL_DATA(scope).identity.objectId&&c.partId===getTEERHOF_DETAIL_DATA(scope).identity.partId):false;
const metaSame=(c:BuildingComponent)=>same(c.origin,getTEERHOF_DETAIL_DATA(scope).expectedOrigin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(getTEERHOF_DETAIL_DATA(scope).expectedComponentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(getTEERHOF_DETAIL_DATA(scope).expectedSourceFeature);
function exactBase(c:BuildingComponent){if(!bremenIdentityCandidate("bremen-teerhof-detail-runtime",c))return false;const marker=c.displayEstimates?.bremenEdgefill70 as{patchSHA256?:unknown,group?:unknown}|undefined;return identity(c)&&marker?.patchSHA256===getTEERHOF_DETAIL_DATA(scope).expectedBasePatchSHA256&&marker?.group==='teerhof22-26'&&metaSame(c)&&exactBatches(c,getTEERHOF_DETAIL_DATA(scope).expectedBatches);}
function teerhofDetailFinite(c:BuildingComponent|undefined){const marker=c?.displayEstimates?.teerhofDetail as{patchSHA256?:unknown}|undefined;return!!c&&identity(c)&&marker?.patchSHA256===SHA&&metaSame(c)&&exactBatches(c,getTEERHOF_DETAIL_DATA(scope).batches);}
function teerhofDetailReconstruction(components:BuildingComponent[]){if(!bremenRecipeDemand("bremen-teerhof-detail-runtime","teerhofDetailReconstruction",components))return{components,stats:{objects:0,vertices:0,triangles:0,components:[],sourceRetained:true,actualVisualAccepted:false}};
 const found=components.filter(c=>identity(c));if(found.length!==1||!exactBase(found[0]))return{components,stats:{objects:0,vertices:0,triangles:0,components:[],sourceRetained:true,actualVisualAccepted:false}};
 const target=found[0],vertices=getTEERHOF_DETAIL_DATA(scope).batches.reduce((s:number,b:any)=>s+b.positions.length/3,0),triangles=getTEERHOF_DETAIL_DATA(scope).batches.reduce((s:number,b:any)=>s+b.indices.length/3,0);
 const result:BuildingComponent[]=components.map(c=>c!==target?c:{...c,batches:getTEERHOF_DETAIL_DATA(scope).batches.map((b:any)=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),paint:new Float32Array(b.paint),frames:new Float32Array(b.frames),color:[.62,.39,.31]as[number,number,number]})),displayEstimates:{...c.displayEstimates,teerhofDetail:{patchSHA256:SHA,sourceRetained:true,sourceIdentityUnchanged:true,officialSixDormerStationsRetained:true,photographedSouthWestFacadeOnly:true,dimensionsPhotoApproximate:true,actualVisualAccepted:false}}});
 return{components:result,stats:{objects:1,vertices,triangles,components:[{objectId:target.objectId,partId:target.partId,sourcePartId:target.partId,patchSHA256:SHA,geometryRole:'finite-photographed-facade-dormer-detail',vertices,triangles}],sourceRetained:true,actualVisualAccepted:false}};
}
function teerhofDetailBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("bremen-teerhof-detail-runtime","teerhofDetailBaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 const found=components.filter(c=>identity(c));if(found.length!==1||!teerhofDetailFinite(found[0]))return{objects:0,vertices:0,actualVisualAccepted:false};let offset=0,vertices=0;for(const c of components)for(let bi=0;bi<c.batches.length;bi++){const n=c.batches[bi].positions.length/3;if(c===found[0]){paint.set(getTEERHOF_DETAIL_DATA(scope).batches[bi].paint,offset*4);frames.set(getTEERHOF_DETAIL_DATA(scope).batches[bi].frames,offset*5);vertices+=n;}offset+=n;}return{objects:1,vertices,actualVisualAccepted:false};
}
function teerhofDetailCertificate(c:BuildingComponent|undefined){if(!c||!identity(c))return null;if(!teerhofDetailFinite(c))return null;return{patchSHA256:SHA,group:'teerhof22-26',sourceRetained:true,nativeIdentity:{objectId:c.objectId,partId:c.partId},geometryRole:'finite-photographed-facade-dormer-detail',officialBuildingIds:['DEHB01ALs00038dy'],displayVertices:c.batches.reduce((s,b)=>s+b.positions.length/3,0),displayTriangles:c.batches.reduce((s,b)=>s+b.indices.length/3,0),actualVisualAccepted:false};}
return{teerhofDetailFinite,teerhofDetailReconstruction,teerhofDetailBaseMaterials,teerhofDetailCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function teerhofDetailFinite(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).teerhofDetailFinite(c);}
export function teerhofDetailReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).teerhofDetailReconstruction(components);}
export function teerhofDetailBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).teerhofDetailBaseMaterials(components,paint,frames);}
export function teerhofDetailCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).teerhofDetailCertificate(c);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-teerhof-detail-runtime",name,components);
