import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{BREMEN_OLDTOWN70_DATA_RESOURCE}from'./oldtown70-data';
import{F260_ACCEPTED_RESTORE_SCOPE_RESOURCES as f260_accepted_restore_runtime_RESOURCES}from'./f260-accepted-restore-runtime';
import{KUNSTHALLE70_SCOPE_RESOURCES as kunsthalle70_runtime_RESOURCES}from'./kunsthalle70-runtime';
import{f260AcceptedRestoreIdentity,f260AcceptedRestoreDisplayCertificate}from'./f260-accepted-restore-runtime';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {bremenKunsthalle70DerivedIdentity,serializeBremenKunsthalle70DerivedReadback} from './kunsthalle70-runtime';
import {getBREMEN_OLDTOWN70_DATA,BREMEN_OLDTOWN70_SHA} from './oldtown70-data';
const key=(x:Identity)=>x.objectId+'|'+x.partId;
const same=(a:ArrayLike<number>,b:ArrayLike<number>)=>a.length===b.length&&Array.from(a).every((v,i)=>Object.is(v,b[i]));

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES=[BREMEN_OLDTOWN70_DATA_RESOURCE,...f260_accepted_restore_runtime_RESOURCES,...kunsthalle70_runtime_RESOURCES] as const;
export const BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_FINITE_DERIVED_DISPLAY_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"bremenFiniteDerivedIdentity":1,"serializeBremenFiniteDerivedReadback":2} as const;
const RECIPE_KEY={};
const bremen_finite_derived_display_absent_KEY={};
function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-finite-derived-display requires a prepared frozen data scope');return scope;}
function _scope_absent():any[]{return scopeValue().memo(bremen_finite_derived_display_absent_KEY,()=>(getBREMEN_OLDTOWN70_DATA(scope).models.filter((m:any)=>m.sourceBinding.nativeParentAbsent)));}
const oldModel=(x:Identity)=>bremenIdentityCandidate("bremen-finite-derived-display",x)?(_scope_absent().find(m=>m.displays.some((d:any)=>key(d)===key(x)))):undefined;
const bremenFiniteDerivedIdentity=(x:Identity)=>bremenIdentityMatches("bremenFiniteDerivedIdentity",x);
function serializeBremenFiniteDerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean){
 if(!c||c.city!=='bremen')return null;
 if(f260AcceptedRestoreIdentity(c,scope)){if(!sourceAbsent)throw Error('F260 accepted DISPLAY entered native SOURCE registry');const cert=f260AcceptedRestoreDisplayCertificate(c,scope);if(!cert)throw Error('F260 finite DISPLAY certificate unavailable');return{displayOnlyId:c.objectId,partId:c.partId,patchSHA256:cert.patchSHA256,sourceAbsent:true,nativeGetterCount:0,generation:c.generation??null,originalAcceptedAssetSHA256:cert.originalAcceptedAssetSHA256,sourceCarrier:cert.sourceCarrier,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices),color:Array.from(b.color),paint:Array.from((b as any).paint as ArrayLike<number>),frames:Array.from((b as any).frames as ArrayLike<number>)})),restoredHistoricalGeometry:true,newArtwork:false,actualVisualAccepted:false};}

 if(bremenKunsthalle70DerivedIdentity(c,scope))return serializeBremenKunsthalle70DerivedReadback(c,sourceAbsent,scope);
 const m=oldModel(c);if(!m)return null;if(!sourceAbsent)throw Error('Bremen oldtown finite DISPLAY entered native SOURCE registry');
 const d=m.displays.find((d:any)=>key(d)===key(c)),est=c.displayEstimates as any;
 const finite=est?.sourceNativeMeshAbsent===true&&est?.sourceRecordSHA256===m.sourceBinding.sourceRecordSHA256&&est?.sourceAuthoritySHA256===getBREMEN_OLDTOWN70_DATA(scope).sourceAuthoritySHA256&&est?.infillBremenOldtown70?.patchSHA256===BREMEN_OLDTOWN70_SHA&&same(c.origin,d.origin)&&JSON.stringify(c.componentGeometry)===JSON.stringify(m.componentGeometry)&&JSON.stringify(c.sourceFeature)===JSON.stringify(m.sourceFeature)&&c.batches.length===d.batches.length&&c.batches.every((b,i)=>(['positions','normals','indices'] as const).every(k=>same(b[k],d.batches[i][k])));
 if(!finite)throw Error('Bremen oldtown finite derived certificate mismatch');
 return{displayOnlyId:c.objectId,partId:c.partId,patchSHA256:BREMEN_OLDTOWN70_SHA,sourceAbsent:true,nativeGetterCount:0,referenceSourceId:m.sourceBinding.objectId,referenceSourcePartId:m.sourceBinding.partId,referenceSourceSHA256:m.sourceBinding.sourceRecordSHA256,sourceAuthoritySHA256:getBREMEN_OLDTOWN70_DATA(scope).sourceAuthoritySHA256,generation:c.generation??null,origin:c.origin,referenceFootprint:c.componentGeometry,batches:c.batches.map(b=>({positions:Array.from(b.positions),normals:Array.from(b.normals),indices:Array.from(b.indices)})),actualVisualAccepted:false};
}
return{bremenFiniteDerivedIdentity,serializeBremenFiniteDerivedReadback,_scope_absent};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function bremenFiniteDerivedIdentity(x:Identity,scope?:FrozenDataScope){return bremenIdentityMatches("bremenFiniteDerivedIdentity",x);}
export function serializeBremenFiniteDerivedReadback(c:(BuildingComponent&{generation?:number})|undefined,sourceAbsent:boolean,scope?:FrozenDataScope){return recipe(scope).serializeBremenFiniteDerivedReadback(c,sourceAbsent);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("bremen-finite-derived-display",name,components);
