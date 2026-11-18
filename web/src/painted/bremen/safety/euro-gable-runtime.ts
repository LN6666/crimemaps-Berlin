import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{EURO_GABLE_DATA_RESOURCE}from'./euro-gable-data';
import type{BuildingComponent,Identity}from"../../../safety/building-mesh-types";
import{nativePaintSignature}from'./progressive-native-signature';
import{getEURO_GABLE_DATA,EURO_GABLE_SHA}from'./euro-gable-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
const changed=(m:any)=>m&&Object.keys(m.frameOverrides).length>0;

/** Full original recipe resources; city demand is deliberately coarse. */
export const EURO_GABLE_SCOPE_RESOURCES=[EURO_GABLE_DATA_RESOURCE] as const;
export const EURO_GABLE_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=EURO_GABLE_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=EURO_GABLE_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"euroGableIdentity":1,"euroGableReframe":3,"euroGableBaseMaterials":3,"euroGableDisplayCertificate":1,"euroGableGroupDisplayCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('euro-gable-runtime requires a prepared frozen data scope');return scope;}
const group=(c:Identity)=>bremenIdentityCandidate("euro-gable-runtime",c)?(getEURO_GABLE_DATA(scope).groups.find((g:any)=>g.models.some((m:any)=>key(c)===key(m.identity)))):undefined;
const model=(c:Identity)=>group(c)?.models.find((m:any)=>key(c)===key(m.identity));
const euroGableIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("euroGableIdentity",c);
function sourceExact(c:BuildingComponent,m:any,leaf:Leaf){return c.city==='bremen'&&leaf(c)===group(c).nativeLeafSHA256&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>same((b as any)[k],m.source.batches[bi][k])));}
function displayExact(c:BuildingComponent,m:any,patched=false){const g=group(c),mark=c.displayEstimates?.europahafenkopf70 as any;if(c.city!=='bremen'||mark?.patchSHA!==getEURO_GABLE_DATA(scope).expectedEuroSHA256||mark?.queueId!==g.queueId||!['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))||c.batches.length!==m.display.length)return false;return c.batches.every((b,bi)=>['positions','normals','indices','color','paint','frames'].every(field=>{const arr=(b as any)[field],ex=m.display[bi][field];return arr?.length===ex.length&&Array.from(arr as ArrayLike<number>).every((v,i)=>{let e=ex[i];if(patched&&field==='frames'){const f=m.frameOverrides[String(Math.floor(i/5))];if(f)e=f[i%5];}return Object.is(v,e)||(field!=='indices'&&Object.is(v,Math.fround(e)));});}));}
function finite(c:BuildingComponent,m:any){return displayExact(c,m,changed(m))&&(!changed(m)||(c.displayEstimates?.euroGableOpenings as any)?.patchSHA256===EURO_GABLE_SHA);}
function euroGableReframe(components:BuildingComponent[],originalSOURCE:BuildingComponent[],nativeLeafSHA?:Leaf){const stats={groups:[]as string[],objects:0,wallVertices:0,geometryUnchanged:true as const,SOURCEUnchanged:true as const,allRoofsUnchanged:true as const,newPhysicalGroups:0,actualVisualAccepted:false as const};if(!bremenRecipeDemand("euro-gable-runtime","euroGableReframe",components))return{components,stats};if(!nativeLeafSHA)return{components,stats};const allowed=new Set<string>(getEURO_GABLE_DATA(scope).groups.filter((g:any)=>g.models.every((m:any)=>{const s=originalSOURCE.filter(c=>c.city==='bremen'&&key(c)===key(m.identity)),a=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return s.length===1&&a.length===1&&sourceExact(s[0],m,nativeLeafSHA)&&displayExact(a[0],m);})).map((g:any)=>g.queueId));if(!allowed.size)return{components,stats};stats.groups=[...allowed];const mapped=components.map(c=>{const g=c.city==='bremen'?group(c):undefined,m=model(c);if(!g||!allowed.has(g.queueId)||!changed(m))return c;stats.objects++;stats.wallVertices+=Object.keys(m.frameOverrides).length;return{...c,batches:c.batches.map(b=>{const frames=Array.from((b as any).frames as ArrayLike<number>);for(const[j,f]of Object.entries(m.frameOverrides))frames.splice(Number(j)*5,5,...f as number[]);return{...b,frames};}),displayEstimates:{...c.displayEstimates,euroGableOpenings:{patchSHA256:EURO_GABLE_SHA,group:g.queueId,verticalFrontOnly:true,geometryUnchanged:true,SOURCEUnchanged:true,allRoofFramesUnchanged:true,actualVisualAccepted:false}}};});return{components:mapped,stats};}
function euroGableBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("euro-gable-runtime","euroGableBaseMaterials",components))return{objects:0,vertices:0,paintUnchanged:true,geometryUnchanged:true,actualVisualAccepted:false};let offset=0,objects=0,vertices=0;for(const c of components){const m=c.city==='bremen'?model(c):undefined,ok=changed(m)&&finite(c,m);if(ok)objects++;for(const b of c.batches){if(ok)for(const[j,f]of Object.entries(m.frameOverrides)){frames.set(f as number[],(offset+Number(j))*5);vertices++;}offset+=b.positions.length/3;}}return{objects,vertices,paintUnchanged:true,geometryUnchanged:true,actualVisualAccepted:false};}
function euroGableDisplayCertificate(c:BuildingComponent|undefined){if(!c||!euroGableIdentity(c))return null;const m=model(c);if(!finite(c,m))throw Error('Euro upper-aperture finite DISPLAY certificate mismatch');return{patchSHA256:EURO_GABLE_SHA,group:group(c).queueId,sourceCarrier:{objectId:c.objectId,partId:c.partId},derivedGeometry:false,sourceUnchanged:true,geometryUnchanged:true,allRoofsUnchanged:true,changedWallVertices:Object.keys(m.frameOverrides).length,actualVisualAccepted:false};}
function euroGableGroupDisplayCertificate(components:BuildingComponent[]){return getEURO_GABLE_DATA(scope).groups.map((g:any)=>{const members=g.models.map((m:any)=>{const a=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return{objectId:m.identity.objectId,partId:m.identity.partId,count:a.length,finite:a.length===1&&finite(a[0],m)};});return{group:g.queueId,patchSHA256:EURO_GABLE_SHA,status:members.every((m:any)=>m.finite)?'complete':members.some((m:any)=>m.count>0)?'partial-or-invalid':'not-loaded',expectedMembers:g.models.length,members,geometryUnchanged:true,actualVisualAccepted:false};});}
return{euroGableIdentity,euroGableReframe,euroGableBaseMaterials,euroGableDisplayCertificate,euroGableGroupDisplayCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function euroGableIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("euroGableIdentity",c);}
export function euroGableReframe(components:BuildingComponent[],originalSOURCE:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).euroGableReframe(components,originalSOURCE,nativeLeafSHA);}
export function euroGableBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).euroGableBaseMaterials(components,paint,frames);}
export function euroGableDisplayCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).euroGableDisplayCertificate(c);}
export function euroGableGroupDisplayCertificate(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).euroGableGroupDisplayCertificate(components);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("euro-gable-runtime",name,components);
