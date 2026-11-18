import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{KUNSTHALLE70_DATA_RESOURCE}from'./kunsthalle70-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {nativePaintSignature} from './progressive-native-signature';
import {getKUNSTHALLE70_DATA,KUNSTHALLE70_SHA} from './kunsthalle70-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;

/** Full original recipe resources; city demand is deliberately coarse. */
export const KUNSTHALLE70_SCOPE_RESOURCES=[KUNSTHALLE70_DATA_RESOURCE] as const;
export const KUNSTHALLE70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=KUNSTHALLE70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=KUNSTHALLE70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"bremenKunsthalle70DerivedIdentity":1,"bremenKunsthalle70Identity":1,"bremenKunsthalle70Reconstruction":2,"bremenKunsthalle70BaseMaterials":3,"serializeBremenKunsthalle70DerivedReadback":2} as const;
const RECIPE_KEY={};
const kunsthalle70_runtime_BREMEN_KUNSTHALLE70_DERIVED_ID_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('kunsthalle70-runtime requires a prepared frozen data scope');return scope;}
function _scope_BREMEN_KUNSTHALLE70_DERIVED_ID(){return scopeValue().memo(kunsthalle70_runtime_BREMEN_KUNSTHALLE70_DERIVED_ID_KEY,()=>(getKUNSTHALLE70_DATA(scope).derivedIdentity));}
const bremenKunsthalle70DerivedIdentity=(c:Identity)=>bremenIdentityMatches("bremenKunsthalle70DerivedIdentity",c);
const bremenKunsthalle70Identity=(c:Identity)=>bremenIdentityMatches("bremenKunsthalle70Identity",c);
function ready(rows:BuildingComponent[],leaf:Leaf){return getKUNSTHALLE70_DATA(scope).requiredNativeGroup.every((r:any)=>{const matches=rows.filter(c=>c.city==='bremen'&&key(c)===key(r));if(matches.length!==1)return false;const c=matches[0];return leaf(c)===r.leafSHA256&&nativePaintSignature(c)===r.signature&&c.origin.every((v,j)=>Object.is(v,r.origin[j]))&&JSON.stringify(c.sourceFeature)===JSON.stringify(r.sourceFeature);});}
const batch=()=>({positions:new Float32Array(getKUNSTHALLE70_DATA(scope).batch.positions),normals:new Float32Array(getKUNSTHALLE70_DATA(scope).batch.normals),indices:new Uint32Array(getKUNSTHALLE70_DATA(scope).batch.indices),color:[.77,.735,.65] as [number,number,number],paint:new Float32Array(getKUNSTHALLE70_DATA(scope).batch.paint),frames:new Float32Array(getKUNSTHALLE70_DATA(scope).batch.frames)});
function bremenKunsthalle70Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf){
 const stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[] as any[]};if(!bremenRecipeDemand("kunsthalle70-runtime","bremenKunsthalle70Reconstruction",components))return{components,stats};
 if(!nativeLeafSHA||!ready(components,nativeLeafSHA))return{components,stats};
 if(components.some(bremenKunsthalle70DerivedIdentity))throw Error('Duplicate finite Bremen Kunsthalle70 derived DISPLAY identity');
 const b=batch(),vertices=b.positions.length/3,triangles=b.indices.length/3;
 const derived:BuildingComponent={city:'bremen',...getKUNSTHALLE70_DATA(scope).derivedIdentity,origin:[...getKUNSTHALLE70_DATA(scope).origin],componentGeometry:getKUNSTHALLE70_DATA(scope).referenceFootprint,sourceFeature:{id:'display-only/Bremen-Kunsthalle70',type:'Feature',geometry:getKUNSTHALLE70_DATA(scope).referenceFootprint,properties:{name:'Kunsthalle Bremen upper-wall SOURCE313504594 recovery DISPLAY',__derived_display_only:true,__not_native_source:true,__reference_source_object:getKUNSTHALLE70_DATA(scope).referenceSourceId,__reference_source_part:getKUNSTHALLE70_DATA(scope).referenceSourcePartId,__reference_source_sha256:getKUNSTHALLE70_DATA(scope).referenceSourceSHA256,__source_carrier:getKUNSTHALLE70_DATA(scope).sourceCarrier}},batches:[b],displayEstimates:{bremenKunsthalle70:{patchSHA256:KUNSTHALLE70_SHA,sourceAbsent:true,nativeGetterCount:0,sourceCarrier:getKUNSTHALLE70_DATA(scope).sourceCarrier,sourceExactOutline:true,upperBandM:[getKUNSTHALLE70_DATA(scope).base_m,getKUNSTHALLE70_DATA(scope).eaves_m],sourceBodyHeightNotSurvey:true,colorCoverageComplete:true,detail70Implemented:true,actualVisualAccepted:false}}};
 stats.objects=1;stats.vertices=vertices;stats.triangles=triangles;stats.components.push({objectId:derived.objectId,partId:derived.partId,sourcePartId:getKUNSTHALLE70_DATA(scope).referenceSourcePartId,patchSHA256:KUNSTHALLE70_SHA,vertices,triangles,geometryRole:'source-exact-outline-upper-wall-DISPLAY-only'});
 return{components:[...components,derived],stats};
}
type Data=ReturnType<typeof getKUNSTHALLE70_DATA>;
function candidate(c:BuildingComponent|undefined):c is BuildingComponent{return !!c&&c.city==='bremen'&&bremenKunsthalle70DerivedIdentity(c)&&(c.displayEstimates?.bremenKunsthalle70 as any)?.patchSHA256===KUNSTHALLE70_SHA;}
function finite(c:BuildingComponent|undefined,prepared?:Data){
 if(!candidate(c))return false;
 // This frozen table belongs to the current synchronous scope. Borrow it once,
 // rather than acquiring a temporary resource pin for every compared number.
 const data=prepared??getKUNSTHALLE70_DATA(scope);
 if(JSON.stringify(c.componentGeometry)!==JSON.stringify(data.referenceFootprint)||!c.origin.every((v,j)=>Object.is(v,data.origin[j]))||c.batches.length!==1)return false;
 const b=c.batches[0];
 for(const k of ['positions','normals','indices'] as const){
  const actual=b[k],expected=data.batch[k];if(actual.length!==expected.length)return false;
  for(let j=0;j<actual.length;j++)if(!Object.is(actual[j],k==='indices'?expected[j]:Math.fround(expected[j])))return false;
 }
 return true;
}
function bremenKunsthalle70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("kunsthalle70-runtime","bremenKunsthalle70BaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 if(!components.some(candidate))return{objects:0,vertices:0,actualVisualAccepted:false};
 const data=getKUNSTHALLE70_DATA(scope),verified=components.map(c=>finite(c,data));
 if(!verified.some(Boolean))return{objects:0,vertices:0,actualVisualAccepted:false};
 const patches=new Map<string,Data['metadataPatches']>();for(const patch of data.metadataPatches){const id=key(patch),rows=patches.get(id);if(rows)rows.push(patch);else patches.set(id,[patch]);}
 let offset=0,objects=0,vertices=0;
 for(const [index,c] of components.entries()){const isDerived=verified[index],matching=c.city==='bremen'?patches.get(key(c)):undefined,signature=matching?.length?nativePaintSignature(c):undefined,patch=matching?.find((r:any)=>signature===r.signature);if(isDerived||patch)objects++;
  c.batches.forEach((b,bi)=>{const n=b.positions.length/3;if(isDerived){paint.set(data.batch.paint,offset*4);frames.set(data.batch.frames,offset*5);vertices+=n;}else if(patch){for(const p of patch.patches){if(p.batchIndex!==bi)continue;if(p.firstVertex+p.vertexCount>n)throw Error('Bremen Kunsthalle70 native metadata range exceeded');paint.set(p.paint,(offset+p.firstVertex)*4);frames.set(p.frames,(offset+p.firstVertex)*5);vertices+=p.vertexCount;}}offset+=n;});
 }return{objects,vertices,actualVisualAccepted:false};
}
function serializeBremenKunsthalle70DerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean){if(!c||!bremenKunsthalle70DerivedIdentity(c))return null;if(!sourceAbsent)throw Error('Bremen Kunsthalle70 derived DISPLAY entered native SOURCE registry');if(!finite(c))throw Error('Bremen Kunsthalle70 finite derived certificate mismatch');return{displayOnlyId:c.objectId,partId:c.partId,patchSHA256:KUNSTHALLE70_SHA,sourceAbsent:true,nativeGetterCount:0,sourceCarrier:getKUNSTHALLE70_DATA(scope).sourceCarrier,referenceSourceId:getKUNSTHALLE70_DATA(scope).referenceSourceId,referenceSourcePartId:getKUNSTHALLE70_DATA(scope).referenceSourcePartId,referenceSourceSHA256:getKUNSTHALLE70_DATA(scope).referenceSourceSHA256,generation:c.generation??null,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices)})),actualVisualAccepted:false};}
return{bremenKunsthalle70DerivedIdentity,bremenKunsthalle70Identity,bremenKunsthalle70Reconstruction,bremenKunsthalle70BaseMaterials,serializeBremenKunsthalle70DerivedReadback,_scope_BREMEN_KUNSTHALLE70_DERIVED_ID};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function getBREMEN_KUNSTHALLE70_DERIVED_ID(scope?:FrozenDataScope){return recipe(scope)._scope_BREMEN_KUNSTHALLE70_DERIVED_ID();}
export function bremenKunsthalle70DerivedIdentity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("bremenKunsthalle70DerivedIdentity",c);}
export function bremenKunsthalle70Identity(c:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("bremenKunsthalle70Identity",c);}
export function bremenKunsthalle70Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).bremenKunsthalle70Reconstruction(components,nativeLeafSHA);}
export function bremenKunsthalle70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).bremenKunsthalle70BaseMaterials(components,paint,frames);}
export function serializeBremenKunsthalle70DerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean,scope?:FrozenDataScope){return recipe(scope).serializeBremenKunsthalle70DerivedReadback(c,sourceAbsent);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("kunsthalle70-runtime",name,components);
