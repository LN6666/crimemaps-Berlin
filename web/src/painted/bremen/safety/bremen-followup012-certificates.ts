import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{EDGEFILL70_DATA_RESOURCE}from'./edgefill70-data';
import{EURO_GABLE_DATA_RESOURCE}from'./euro-gable-data';
import{BREMEN_TEERHOF_DETAIL_SCOPE_RESOURCES as bremen_teerhof_detail_runtime_RESOURCES}from'./bremen-teerhof-detail-runtime';
import{EURO_GABLE_SCOPE_RESOURCES as euro_gable_runtime_RESOURCES}from'./euro-gable-runtime';
import type{BuildingComponent,Identity}from"../../../safety/building-mesh-types";
import{nativePaintSignature}from'./progressive-native-signature';
import{getEDGEFILL70_DATA}from'./edgefill70-data';
import{TEERHOF_DETAIL_SHA}from'./bremen-teerhof-detail-data';
import{teerhofDetailFinite}from'./bremen-teerhof-detail-runtime';
import{getEURO_GABLE_DATA,EURO_GABLE_SHA}from'./euro-gable-data';
import{euroGableGroupDisplayCertificate}from'./euro-gable-runtime';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>{if(!Array.isArray(a)&&!ArrayBuffer.isView(a))return JSON.stringify(a)===JSON.stringify(b);if((!Array.isArray(b)&&!ArrayBuffer.isView(b))||(a as any).length!==(b as any).length)return false;for(let i=0;i<(a as any).length;i++)if(!Object.is((a as any)[i],(b as any)[i]))return false;return true;};
function exact(c:BuildingComponent,m:any,leaf:Leaf,sha:string){return c.city==='bremen'&&leaf(c)===sha&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],m.source.batches[bi][k])));}

/** Full original recipe resources; city demand is deliberately coarse. */
export const BREMEN_FOLLOWUP012_CERTIFICATES_SCOPE_RESOURCES=[EDGEFILL70_DATA_RESOURCE,EURO_GABLE_DATA_RESOURCE,...bremen_teerhof_detail_runtime_RESOURCES,...euro_gable_runtime_RESOURCES] as const;
export const BREMEN_FOLLOWUP012_CERTIFICATES_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=BREMEN_FOLLOWUP012_CERTIFICATES_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=BREMEN_FOLLOWUP012_CERTIFICATES_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"teerhofDetailSourceBoundGroupCertificate":3,"euroGableSourceBoundGroupCertificates":3} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('bremen-followup012-certificates requires a prepared frozen data scope');return scope;}
function teerhofDetailSourceBoundGroupCertificate(components:BuildingComponent[],source:BuildingComponent[],leaf:Leaf|undefined){const group=getEDGEFILL70_DATA(scope).groups.find((g:any)=>g.key==='teerhof22-26'),m=group.models[0],cc=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity)),ss=source.filter(c=>c.city==='bremen'&&key(c)===key(m.identity)),sourceExact=!!leaf&&ss.length===1&&exact(ss[0],m,leaf,m.identity.leafSHA256),finite=cc.length===1&&teerhofDetailFinite(cc[0],scope);return{group:'teerhof22-26',patchSHA256:TEERHOF_DETAIL_SHA,status:finite&&sourceExact?'complete':cc.length||ss.length?'partial-or-invalid':'not-loaded',expectedMembers:1,presentMembers:cc.length===1?1:0,verifiedMembers:finite&&sourceExact?1:0,members:[{objectId:m.identity.objectId,partId:m.identity.partId,count:cc.length,finite,sourceCount:ss.length,sourceExact}],actualVisualAccepted:false};}
function euroGableSourceBoundGroupCertificates(components:BuildingComponent[],source:BuildingComponent[],leaf:Leaf|undefined){return euroGableGroupDisplayCertificate(components,scope).map((g:any)=>{const model=getEURO_GABLE_DATA(scope).groups.find((m:any)=>m.queueId===g.group),members=g.members.map((r:any)=>{const m=model.models.find((m:any)=>key(m.identity)===key(r)),ss=source.filter(c=>c.city==='bremen'&&key(c)===key(r));return{...r,sourceCount:ss.length,sourceExact:!!leaf&&ss.length===1&&exact(ss[0],m,leaf,model.nativeLeafSHA256)};});return{...g,patchSHA256:EURO_GABLE_SHA,status:members.every((m:any)=>m.count===1&&m.finite&&m.sourceExact)?'complete':members.some((m:any)=>m.count||m.sourceCount)?'partial-or-invalid':'not-loaded',presentMembers:members.filter((m:any)=>m.count===1).length,verifiedMembers:members.filter((m:any)=>m.finite&&m.sourceExact).length,members};});}
return{teerhofDetailSourceBoundGroupCertificate,euroGableSourceBoundGroupCertificates};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function teerhofDetailSourceBoundGroupCertificate(components:BuildingComponent[],source:BuildingComponent[],leaf:Leaf|undefined,scope?:FrozenDataScope){return recipe(scope).teerhofDetailSourceBoundGroupCertificate(components,source,leaf);}
export function euroGableSourceBoundGroupCertificates(components:BuildingComponent[],source:BuildingComponent[],leaf:Leaf|undefined,scope?:FrozenDataScope){return recipe(scope).euroGableSourceBoundGroupCertificates(components,source,leaf);}
