import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE}from'./churches-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import type {OwnerReconstructionStats} from '../../../safety/owner-reconstruction-stats';
import {nativePaintSignature} from './progressive-native-signature';
import {getBREMEN_OLDTOWN_CHURCHES_DATA,BREMEN_OLDTOWN_CHURCHES_SHA} from './churches-data';
function nativeArray(value:string,uint=false){const raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),v=new DataView(raw.buffer);return Array.from({length:raw.length/4},(_,i)=>uint?v.getUint32(i*4,true):v.getFloat32(i*4,true));}
function exact(c:BuildingComponent,r:any){return c.city==='bremen'&&c.objectId===r.objectId&&c.partId===r.partId&&nativePaintSignature(c)===r.signature;}
export function infillBremenOldtownChurchesBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){let offset=0,objects=0,vertices=0;for(const c of components){const match=c.city==='bremen'&&!!c.displayEstimates?.infillBremenOldtownChurches;if(match)objects++;for(const b of c.batches){const count=b.positions.length/3;if(match){const authored=b as any;for(let i=0;i<count;i++){const a=i*4,t=(offset+i)*4,u=i*5,v=(offset+i)*5;paint[t]=authored.paint[a];paint[t+1]=authored.paint[a+1];paint[t+2]=authored.paint[a+2];paint[t+3]=2;frames[v]=authored.frames[u];frames[v+1]=authored.frames[u+1];frames[v+2]=authored.frames[u+2];frames[v+3]=authored.frames[u+3];frames[v+4]=authored.paint[a+3];}vertices+=count;}offset+=count;}}return {objects,vertices,actualVisualAccepted:false};}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_CHURCHES70_SCOPE_RESOURCES=[BREMEN_OLDTOWN_CHURCHES_DATA_RESOURCE] as const;
export const BREMEN_CHURCHES70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_CHURCHES70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_CHURCHES70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"infillBremenOldtownChurchesIdentity":1,"infillBremenOldtownChurchesReconstruction":3,"infillBremenOldtownChurchesBaseMaterials":3} as const;
const RECIPE_KEY={};
const bremen_churches70_runtime_MODELS_KEY={};
const bremen_churches70_runtime_frozen_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-churches70-runtime requires a prepared frozen data scope');return scope;}
function _scope_MODELS():any[]{return scopeValue().memo(bremen_churches70_runtime_MODELS_KEY,()=>(getBREMEN_OLDTOWN_CHURCHES_DATA(scope).models));}
function _scope_frozen(){return scopeValue().memo(bremen_churches70_runtime_frozen_KEY,()=>(new Set(getBREMEN_OLDTOWN_CHURCHES_DATA(scope).frozenExcluded)));}
const infillBremenOldtownChurchesIdentity=(c:Identity)=>bremenIdentityMatches("infillBremenOldtownChurchesIdentity",c);
function infillBremenOldtownChurchesReconstruction(components:BuildingComponent[],selectedTargetIds?:string[],sourceAuthoritySHA256?:string){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};if(!bremenRecipeDemand("bremen-churches70-runtime","infillBremenOldtownChurchesReconstruction",components))return{components:components.map(c=>c),stats};
 const ready=_scope_MODELS().filter(m=>(!selectedTargetIds||selectedTargetIds.includes(m.targetId))&&m.geometryReadyForPreview&&m.requiredNativeGroup.every((r:any)=>components.filter(c=>exact(c,r)).length===1)&&(!m.sourceBinding.nativeParentAbsent||sourceAuthoritySHA256===getBREMEN_OLDTOWN_CHURCHES_DATA(scope).sourceAuthoritySHA256));
 const clone=(d:any)=>d.batches.map((b:any)=>({...b,positions:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.positions):[...b.positions],normals:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.normals):[...b.normals],indices:d.originalNativeGeometryUnchanged&&b._nativeArraysBase64?nativeArray(b._nativeArraysBase64.indices,true):[...b.indices],paint:[...b.paint],frames:[...b.frames],color:[...b.color]}));
 const mark=(c:any,m:any,d:any)=>{const batches=clone(d),vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n:number,b:any)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:BREMEN_OLDTOWN_CHURCHES_SHA,vertices,triangles,geometryRole:d.photoEstimatedAddedGeometry?'official2025-LoD2-plus-photo-supported-cross-gable-display':d.originalNativeGeometryUnchanged?'exact-native-geometry-with-source-specific-paint':'official2025-LoD2-complete-building-triangles-nativeSOURCEretained'});return {...c,origin:[...d.origin],batches,displayEstimates:{...c.displayEstimates,infillBremenOldtownChurches:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN_CHURCHES_SHA,sourceRetained:true,sourceAuthoritySHA256:getBREMEN_OLDTOWN_CHURCHES_DATA(scope).sourceAuthoritySHA256,originalNativeGeometryUnchanged:!!d.originalNativeGeometryUnchanged,displayEstimate:!!d.photoEstimatedAddedGeometry||!d.officialLoD2Shape,officialLoD2Shape:!!d.officialLoD2Shape,detailTarget:.7,actualVisualAccepted:false}}};};
 const result=components.map(c=>{if(c.city!=='bremen'||_scope_frozen().has(c.objectId))return c;const m=ready.find(m=>m.requiredNativeGroup.some((r:any)=>r.objectId===c.objectId&&r.partId===c.partId));if(!m)return c;const d=m.displays.find((d:any)=>d.objectId===c.objectId&&d.partId===c.partId);if(d)return mark(c,m,d);if(m.sourceBinding.nativeParentAbsent||m.preserveNativePartIds?.includes(c.partId))return c;return {...c,batches:[],displayEstimates:{...c.displayEstimates,infillBremenOldtownChurchesSuppressed:{targetId:m.targetId,patchSHA256:BREMEN_OLDTOWN_CHURCHES_SHA,reason:'Exact source sibling covered by independently painted parent DISPLAY; original input arrays retained and white path unchanged'}}};});
 for(const m of ready.filter(m=>m.sourceBinding.nativeParentAbsent)){
  // No source-native mesh is fabricated. This explicit DISPLAY component carries original source geometry/tags.
  if(result.some(c=>c.city==='bremen'&&c.objectId===m.sourceBinding.objectId&&c.partId===m.sourceBinding.partId))continue;
  for(const d of m.displays){const sourceBound:any={city:'bremen',objectId:d.objectId,partId:d.partId,origin:d.origin,componentGeometry:m.componentGeometry,sourceFeature:m.sourceFeature,batches:[],displayEstimates:{sourceNativeMeshAbsent:true,sourceRecordSHA256:m.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:getBREMEN_OLDTOWN_CHURCHES_DATA(scope).sourceAuthoritySHA256}};result.push(mark(sourceBound,m,d));}
 }
 return {components:result,stats};
}
return{infillBremenOldtownChurchesIdentity,infillBremenOldtownChurchesReconstruction,_scope_MODELS,_scope_frozen};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function infillBremenOldtownChurchesIdentity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("infillBremenOldtownChurchesIdentity",c);}
export function infillBremenOldtownChurchesReconstruction(components:BuildingComponent[],selectedTargetIds?:string[],sourceAuthoritySHA256?:string,scope?:FrozenDataScope){return recipe(scope).infillBremenOldtownChurchesReconstruction(components,selectedTargetIds,sourceAuthoritySHA256);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-churches70-runtime",name,components);
export const MODULE_SCOPE_METADATA_FUNCTIONS=["infillBremenOldtownChurchesBaseMaterials"] as const;
