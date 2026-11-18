import {bremenRecipeDemand,type BremenDemandComponent} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{BREMEN_OLDTOWN70_DATA_RESOURCE}from'./oldtown70-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getBREMEN_OLDTOWN70_DATA,BREMEN_OLDTOWN70_SHA} from './oldtown70-data';
function nativeArray(value:string,uint=false){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/4},(_,i)=>uint?v.getUint32(i*4,true):v.getFloat32(i*4,true));}
function exact(c:BuildingComponent,r:any){return c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature;}
export function infillBremenOldtown70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&!!c.displayEstimates?.infillBremenOldtown70;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){const bp=(b as any).paint,bf=(b as any).frames;for(let i=0;i<count;i++){paint.set([bp[i*4],bp[i*4+1],bp[i*4+2],2],(offset+i)*4);frames.set([bf[i*5],bf[i*5+1],bf[i*5+2],bf[i*5+3],bp[i*4+3]],(offset+i)*5);}vertices+=count;}offset+=count;}}return {objects,vertices,actualVisualAccepted:false};}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_OLDTOWN70_SCOPE_RESOURCES=[BREMEN_OLDTOWN70_DATA_RESOURCE] as const;
export const BREMEN_OLDTOWN70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_OLDTOWN70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_OLDTOWN70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"infillBremenOldtown70Identity":1,"infillBremenOldtown70Reconstruction":3,"infillBremenOldtown70BaseMaterials":3} as const;
const RECIPE_KEY={};
const bremen_oldtown70_runtime_MODELS_KEY={};
const bremen_oldtown70_runtime_frozen_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-oldtown70-runtime requires a prepared frozen data scope');return scope;}
function _scope_MODELS():any[]{return scopeValue().memo(bremen_oldtown70_runtime_MODELS_KEY,()=>(getBREMEN_OLDTOWN70_DATA(scope).models));}
function _scope_frozen(){return scopeValue().memo(bremen_oldtown70_runtime_frozen_KEY,()=>(new Set(getBREMEN_OLDTOWN70_DATA(scope).frozenExcluded)));}
const infillBremenOldtown70Identity=(c:Identity)=>bremenIdentityMatches("infillBremenOldtown70Identity",c);
function infillBremenOldtown70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],sourceAuthoritySHA256?:string){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 if(!bremenRecipeDemand('bremen-oldtown70-runtime','infillBremenOldtown70Reconstruction',components,[components,selectedTargetIds,sourceAuthoritySHA256]))return{components:components.map(c=>c),stats};
 const ready=_scope_MODELS().filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.geometryReadyForPreview&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r)).length===1)&&(!m.sourceBinding.nativeParentAbsent||sourceAuthoritySHA256===getBREMEN_OLDTOWN70_DATA(scope).sourceAuthoritySHA256));
 const clone=(d:any)=>d.batches.map((b:any)=>({...b,positions:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.positions):[...b.positions],normals:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.normals):[...b.normals],indices:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.indices,true):[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const mark=(c:any,m:any,d:any)=>{const batches=clone(d),vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:BREMEN_OLDTOWN70_SHA,vertices,triangles,geometryRole:d.originalNativeGeometryUnchanged?'exact-native-geometry-with-source-specific-paint':'exact-source-footprint-photo-estimated-independent-display'});return {...c,origin:[...d.origin],batches,displayEstimates:{...c.displayEstimates,infillBremenOldtown70:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN70_SHA,sourceRetained:true,sourceAuthoritySHA256:getBREMEN_OLDTOWN70_DATA(scope).sourceAuthoritySHA256,originalNativeGeometryUnchanged:!!d.originalNativeGeometryUnchanged,displayEstimate:!d.originalNativeGeometryUnchanged,detailTarget:.7,actualVisualAccepted:false}}};};
 const result=components.map(c=>{if(c.city!=='bremen'||_scope_frozen().has(c.objectId))return c;const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);if(d)return mark(c,m,d);if(m.sourceBinding.nativeParentAbsent&&!m.suppressCoveredNativeSiblings)return c;return {...c,batches:[],displayEstimates:{...c.displayEstimates,infillBremenOldtown70Suppressed:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN70_SHA,reason:'Exact source sibling covered by independently painted parent DISPLAY; original input arrays retained and white path unchanged'}}};});
 for(const m of ready.filter(m=>m.sourceBinding.nativeParentAbsent)){
  // No source-native mesh is fabricated. This explicit DISPLAY component carries original source geometry/tags.
  if(result.some(c=>c.city==='bremen'&&c.objectId===m.sourceBinding.objectId&&c.partId===m.sourceBinding.partId))continue;
  for(const d of m.displays){const sourceBound:any={city:'bremen',objectId:d.objectId,partId:d.partId,origin:d.origin,componentGeometry:m.componentGeometry,sourceFeature:m.sourceFeature,batches:[],displayEstimates:{sourceNativeMeshAbsent:true,sourceRecordSHA256:m.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:getBREMEN_OLDTOWN70_DATA(scope).sourceAuthoritySHA256}};result.push(mark(sourceBound,m,d));}
 }
 return {components:result,stats};
}
return{infillBremenOldtown70Identity,infillBremenOldtown70Reconstruction,_scope_MODELS,_scope_frozen};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function infillBremenOldtown70Identity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("infillBremenOldtown70Identity",c);}
export function infillBremenOldtown70Reconstruction(components:BuildingComponent[],selectedTargetIds?:string[],sourceAuthoritySHA256?:string,scope?:FrozenDataScope){return recipe(scope).infillBremenOldtown70Reconstruction(components,selectedTargetIds,sourceAuthoritySHA256);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly BremenDemandComponent[],args?:readonly unknown[])=>bremenRecipeDemand('bremen-oldtown70-runtime',name,components,args);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["infillBremenOldtown70BaseMaterials"] as const;
