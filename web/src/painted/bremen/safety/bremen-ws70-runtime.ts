import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{WS70_DATA_RESOURCE}from'./ws70-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getWS70_DATA,WS70_SHA} from './ws70-data';
const eq=(a:any,b:any)=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
const unchanged=(c:BuildingComponent,m:any)=>nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>eq((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>eq((b as any)[k],m.source.batches[bi][k])));
export function ws70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&!!c.displayEstimates?.ws70;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){paint.set((b as any).paint,offset*4);frames.set((b as any).frames,offset*5);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_WS70_SCOPE_RESOURCES=[WS70_DATA_RESOURCE] as const;
export const BREMEN_WS70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_WS70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_WS70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"ws70Identity":1,"ws70Reconstruction":2,"ws70BaseMaterials":3} as const;
const RECIPE_KEY={};
const bremen_ws70_runtime_GROUPS_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-ws70-runtime requires a prepared frozen data scope');return scope;}
function _scope_GROUPS():any[]{return scopeValue().memo(bremen_ws70_runtime_GROUPS_KEY,()=>(getWS70_DATA(scope).groups));}
const ws70Identity=(c:Identity)=>bremenIdentityMatches("ws70Identity",c);
function ws70Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};if(!bremenRecipeDemand("bremen-ws70-runtime","ws70Reconstruction",components))return{components:components.map(c=>c),stats};
 // Complete source pair required per independent physical building. Changed/missing/duplicate siblings retain SOURCE.
 const ready=_scope_GROUPS().filter(g=>(!selectedQueueIds||selectedQueueIds.includes(g.id))&&g.geometryReadyForPreview&&g.models.every((m:any)=>{const rows=components.filter(c=>c.city==='bremen'&&c.objectId===m.identity.objectId&&c.partId===m.identity.partId);return rows.length===1&&unchanged(rows[0],m);}));
 const mapped=components.map(c=>{if(c.city!=='bremen')return c;const group=ready.find(g=>g.models.some((m:any)=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId));if(!group)return c;const m=group.models.find((m:any)=>c.objectId===m.identity.objectId&&c.partId===m.identity.partId);
 const batches=m.display.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:WS70_SHA,vertices,triangles,geometryRole:'exactofficial2025LoD2-wholegroup-nativeSOURCEretained'});
 return {...c,batches,displayEstimates:{...c.displayEstimates,ws70:{queueId:group.id,patchSHA:WS70_SHA,sourceRetained:true,officialBuildingId:group.officialId,officialGroundDatumM:group.groundDatumM,officialShape:true,facadeLayoutPhotoApproximation:true,materialsComplete:true,detail70Implemented:true,actualVisualAccepted:false}}};});
 return{components:mapped,stats};
}
return{ws70Identity,ws70Reconstruction,_scope_GROUPS};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function ws70Identity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("ws70Identity",c);}
export function ws70Reconstruction(components:BuildingComponent[],selectedQueueIds?:string[],scope?:FrozenDataScope){return recipe(scope).ws70Reconstruction(components,selectedQueueIds);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-ws70-runtime",name,components);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["ws70BaseMaterials"] as const;
