import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';

import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {decodeBuildingShard} from './building-mesh-codec';
export const INFILL_GALERIE_SHA="8e86b1bd41ba3e66019029d0c250717f7a484b88ebebb37b918e08e6f4be1bb6";
const equalSource=(c:BuildingComponent,s:BuildingComponent)=>JSON.stringify(c.origin)===JSON.stringify(s.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(s.componentGeometry)&&c.batches.length===s.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>{const a=(b as any)[k],e=(s.batches[bi] as any)[k];return a?.length===e?.length&&Array.from(a as ArrayLike<number>).every((v,j)=>Object.is(v,e[j]));}));
export function infillGalerieBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='essen'&&!!c.displayEstimates?.infillGalerieExterior;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){frames.set((b as any).frames,offset*5);paint.set((b as any).paint,offset*4);vertices+=count;}offset+=count;}}return{objects,vertices,actualVisualAccepted:false};}
export const DISPLAY_LIST_RESOURCE={canonicalSHA256:"8e86b1bd41ba3e66019029d0c250717f7a484b88ebebb37b918e08e6f4be1bb6",file:"painted/bremen/safety/infill-essen-rathaus-galerie.ts",occurrence:0,codec:'json'} as const;
export const SOURCE_SHARD_RESOURCE={canonicalSHA256:"ef6aa3af04f88158d20d51e6dad903876e4f6895f14dca1388533bc0667bbb26",file:"painted/bremen/safety/infill-essen-rathaus-galerie.ts",occurrence:0,codec:'json'} as const;
/** Full original recipe resources; city demand is deliberately coarse. */
export const INFILL_ESSEN_RATHAUS_GALERIE_SCOPE_RESOURCES=[DISPLAY_LIST_RESOURCE,SOURCE_SHARD_RESOURCE] as const;
export const INFILL_ESSEN_RATHAUS_GALERIE_SCOPE_CITIES=["essen"] as const;
export const MODULE_SCOPE_RESOURCES=INFILL_ESSEN_RATHAUS_GALERIE_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=INFILL_ESSEN_RATHAUS_GALERIE_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"infillGalerieIdentity":1,"infillGalerieReconstruction":1,"infillGalerieBaseMaterials":3} as const;
const RECIPE_KEY={};
const infill_essen_rathaus_galerie_DISPLAY_LIST_KEY={};
const infill_essen_rathaus_galerie_SOURCE_SHARD_KEY={};
const infill_essen_rathaus_galerie_ORIGINAL_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('infill-essen-rathaus-galerie requires a prepared frozen data scope');return scope;}
function _scope_DISPLAY_LIST(){return scopeValue().memo(infill_essen_rathaus_galerie_DISPLAY_LIST_KEY,()=>(scopeValue().borrow<any,any>(DISPLAY_LIST_RESOURCE,value=>value)));}
function _scope_SOURCE_SHARD(){return scopeValue().memo(infill_essen_rathaus_galerie_SOURCE_SHARD_KEY,()=>(scopeValue().borrow<any,any>(SOURCE_SHARD_RESOURCE,value=>value)));}
function _scope_ORIGINAL(){return scopeValue().memo(infill_essen_rathaus_galerie_ORIGINAL_KEY,()=>(decodeBuildingShard(_scope_SOURCE_SHARD(),"essen").components));}
const infillGalerieIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("infillGalerieIdentity",c);
function infillGalerieReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};if(!bremenRecipeDemand("infill-essen-rathaus-galerie","infillGalerieReconstruction",components))return{components,stats};
 if(!components.some(infillGalerieIdentity))return{components,stats};
 const loaded=components.filter(infillGalerieIdentity);
 if(loaded.length===_scope_DISPLAY_LIST().length&&loaded.every(c=>(c.displayEstimates?.infillGalerieExterior as {patchSHA?:string}|undefined)?.patchSHA===INFILL_GALERIE_SHA))return{components,stats};
 // Streaming can expose a proper subset before the remaining real carriers arrive. Do not admit DISPLAY or report a geometry failure during that state.
 if(_scope_ORIGINAL().some(s=>!loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId)))return{components,stats};
 if(!_scope_ORIGINAL().every(s=>loaded.filter(c=>c.objectId===s.objectId&&c.partId===s.partId).length===1&&loaded.some(c=>c.objectId===s.objectId&&c.partId===s.partId&&equalSource(c,s)))){stats.error='Galerie requires complete unchanged real native source group';return{components,stats};}
 const replacements=_scope_DISPLAY_LIST().map((display:any)=>{const batches=display.batches.map((b:any)=>({...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],frames:[...b.frames],paint:[...b.paint]}));const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.components.push({objectId:display.objectId,partId:display.partId,sourcePartId:display.partId,patchSHA256:INFILL_GALERIE_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction-per-real-source-identity'});const source=loaded.find(c=>c.objectId===display.objectId&&c.partId===display.partId)!;return{...source,...display,batches,sourceFeature:source.sourceFeature,displayEstimates:{...display.displayEstimates,infillGalerieExterior:{...display.displayEstimates.infillGalerieExterior,patchSHA:INFILL_GALERIE_SHA}}} as BuildingComponent;});
 stats.originalVertices=loaded.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
 return{components:[...components.filter(c=>!infillGalerieIdentity(c)),...replacements],stats};
}
return{infillGalerieIdentity,infillGalerieReconstruction,_scope_DISPLAY_LIST,_scope_SOURCE_SHARD,_scope_ORIGINAL};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function infillGalerieIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("infillGalerieIdentity",c);}
export function infillGalerieReconstruction(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).infillGalerieReconstruction(components);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("infill-essen-rathaus-galerie",name,components);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["infillGalerieBaseMaterials"] as const;
