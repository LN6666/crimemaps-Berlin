import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{STEPHANI_ROW_DATA_RESOURCE}from'./stephani-row-data';
import{OFFICIAL_OPENINGS_DATA_RESOURCE}from'./official-openings-data';
import type {BuildingComponent,Identity}from "../../../safety/building-mesh-types";
import {nativePaintSignature}from './progressive-native-signature';
import {getSTEPHANI_ROW_DATA,STEPHANI_ROW_SHA}from './stephani-row-data';
import {getOFFICIAL_OPENINGS_DATA,OFFICIAL_OPENINGS_SHA}from './official-openings-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function sourceExact(c:BuildingComponent,m:any,leaf:Leaf){return c.city==='bremen'&&leaf(c)===m.identity.leafSHA256&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>['positions','normals','indices','color'].every(k=>same((b as any)[k],m.source.batches[bi][k])));}

/** Full original recipe resources; city demand is deliberately coarse. */
export const OFFICIAL_OPENINGS_SCOPE_RESOURCES=[STEPHANI_ROW_DATA_RESOURCE,OFFICIAL_OPENINGS_DATA_RESOURCE] as const;
export const OFFICIAL_OPENINGS_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=OFFICIAL_OPENINGS_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=OFFICIAL_OPENINGS_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"officialOpeningsIdentity":1,"officialOpeningsReframe":3,"officialOpeningsBaseMaterials":3,"officialOpeningsDisplayCertificate":1,"officialOpeningsGroupDisplayCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('official-openings-runtime requires a prepared frozen data scope');return scope;}
const group=(c:Identity)=>bremenIdentityCandidate("official-openings-runtime",c)?(getSTEPHANI_ROW_DATA(scope).groups.find((g:any)=>g.models.some((m:any)=>key(c)===key(m.identity)))):undefined;
const model=(c:Identity)=>group(c)?.models.find((m:any)=>key(c)===key(m.identity));
const override=(m:any)=>m&&getOFFICIAL_OPENINGS_DATA(scope).objectOverrides[m.identity.objectId.split('/').pop()];
const officialOpeningsIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("officialOpeningsIdentity",c);
function displayExact(c:BuildingComponent,m:any,patched=false){
 const g=group(c),edge=c.displayEstimates?.bremenEdgefill70 as any,cov=c.displayEstimates?.edgeCoverage as any,parent=g.inputKind==='coverage'?m.sourceCarrier:{objectId:m.identity.objectId,partId:m.identity.partId};
 if(c.city!=='bremen'||(g.inputKind==='coverage'?(cov?.patchSHA256!==getSTEPHANI_ROW_DATA(scope).expectedCoverageSHA||cov?.group!==g.key||!same(cov?.sourceCarrier,parent)):(edge?.patchSHA256!==getSTEPHANI_ROW_DATA(scope).expectedEdgefill70SHA||edge?.group!==g.key||!same(edge?.sourceCarrier,parent)))||!['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))||c.batches.length!==m.display.length)return false;
 if(m.display.length&&(c.displayEstimates?.stephaniRowBoundary as any)?.patchSHA256!==STEPHANI_ROW_SHA)return false;
 return c.batches.every((b,bi)=>['positions','normals','indices','color','paint','frames'].every(field=>{const arr=(b as any)[field],ex=m.display[bi][field];return arr?.length===ex.length&&Array.from(arr as ArrayLike<number>).every((v,i)=>{let e=ex[i];if(field==='frames'){const vi=String(Math.floor(i/5)),old=m.frameOverrides[vi],next=patched&&override(m)?.[vi];if(next)e=next[i%5];else if(old)e=old[i%5];}return Object.is(v,e)||(field!=='indices'&&Object.is(v,Math.fround(e)));});}));
}
function finite(c:BuildingComponent,m:any){return displayExact(c,m,!!override(m))&&(!override(m)||(c.displayEstimates?.officialOpenings as any)?.patchSHA256===OFFICIAL_OPENINGS_SHA);}
function officialOpeningsReframe(components:BuildingComponent[],originalSOURCE:BuildingComponent[],nativeLeafSHA?:Leaf){
 const stats={groups:[]as string[],objects:0,wallVertices:0,geometryUnchanged:true as const,sourceRetained:true as const,allRoofsUnchanged:true as const,protected8Unchanged:true as const,newPhysicalGroups:0,actualVisualAccepted:false as const,fineOpenings70Accepted:false as const};if(!bremenRecipeDemand("official-openings-runtime","officialOpeningsReframe",components))return{components,stats};if(!nativeLeafSHA||getOFFICIAL_OPENINGS_DATA(scope).expectedPriorFrameSHA256!==STEPHANI_ROW_SHA)return{components,stats};
 const allowed=new Set<string>(getSTEPHANI_ROW_DATA(scope).groups.filter((g:any)=>g.models.every((m:any)=>{const s=originalSOURCE.filter(c=>c.city==='bremen'&&key(c)===key(m.identity)),a=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return s.length===1&&a.length===1&&sourceExact(s[0],m,nativeLeafSHA)&&displayExact(a[0],m);})).map((g:any)=>g.key));if(!allowed.size)return{components,stats};stats.groups=[...allowed];
 const mapped=components.map(c=>{const g=c.city==='bremen'?group(c):undefined,m=model(c),changes=override(m);if(!g||!allowed.has(g.key)||!changes)return c;const batches=c.batches.map(b=>{const frames=Array.from((b as any).frames as ArrayLike<number>);for(const[j,f]of Object.entries(changes))frames.splice(Number(j)*5,5,...f as number[]);return{...b,frames};});stats.objects++;stats.wallVertices+=Object.keys(changes).length;return{...c,batches,displayEstimates:{...c.displayEstimates,officialOpenings:{patchSHA256:OFFICIAL_OPENINGS_SHA,group:g.key,geometryUnchanged:true,sourceUnchanged:true,allRoofsUnchanged:true,evidence:'exact municipal2025 textured LoD2 target UV projection; procedural only',actualVisualAccepted:false,fineOpenings70Accepted:false}}};});return{components:mapped,stats};
}
function officialOpeningsBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("official-openings-runtime","officialOpeningsBaseMaterials",components))return{objects:0,vertices:0,retainedPriorWallVertices:0,paintUnchanged:true,geometryUnchanged:true,actualVisualAccepted:false};let offset=0,objects=0,vertices=0,retainedPriorWallVertices=0;for(const c of components){const m=c.city==='bremen'?model(c):undefined,changes=override(m),ok=!!changes&&finite(c,m);if(ok)objects++;for(const b of c.batches){if(ok){/* The old exact frame certificate correctly rejects this new layer. Restore its unchanged finite wall frames before overriding the evidenced subset. */for(const[j,f]of Object.entries(m.frameOverrides)){frames.set(f as number[],(offset+Number(j))*5);retainedPriorWallVertices++;}for(const[j,f]of Object.entries(changes)){frames.set(f as number[],(offset+Number(j))*5);vertices++;}}offset+=b.positions.length/3;}}return{objects,vertices,retainedPriorWallVertices,paintUnchanged:true,geometryUnchanged:true,actualVisualAccepted:false};}
function officialOpeningsDisplayCertificate(c:BuildingComponent|undefined){if(!c||!officialOpeningsIdentity(c))return null;const m=model(c);if(!finite(c,m))throw Error('Official openings finite DISPLAY certificate mismatch');return{patchSHA256:OFFICIAL_OPENINGS_SHA,sourceCarrier:{objectId:c.objectId,partId:c.partId},derivedGeometry:false,sourceUnchanged:true,geometryUnchanged:true,allRoofFramesUnchanged:true,wallVertices:Object.keys(override(m)).length,observedFaces:getOFFICIAL_OPENINGS_DATA(scope).faces.filter((f:any)=>'osm/way/'+f.objectId===c.objectId).map((f:any)=>f.selector),actualVisualAccepted:false,fineOpenings70Accepted:false};}
function officialOpeningsGroupDisplayCertificate(components:BuildingComponent[]){return getSTEPHANI_ROW_DATA(scope).groups.map((g:any)=>{const members=g.models.map((m:any)=>{const a=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return{objectId:m.identity.objectId,partId:m.identity.partId,count:a.length,finite:a.length===1&&finite(a[0],m),changed:!!override(m)};});return{group:g.key,patchSHA256:OFFICIAL_OPENINGS_SHA,status:members.every((m:any)=>m.finite)?'complete':members.some((m:any)=>m.count>0)?'partial-or-invalid':'not-loaded',expectedMembers:g.models.length,presentMembers:members.filter((m:any)=>m.count>0).length,members,newPhysicalGroups:0,actualVisualAccepted:false,fineOpenings70Accepted:false};});}
return{officialOpeningsIdentity,officialOpeningsReframe,officialOpeningsBaseMaterials,officialOpeningsDisplayCertificate,officialOpeningsGroupDisplayCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function officialOpeningsIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("officialOpeningsIdentity",c);}
export function officialOpeningsReframe(components:BuildingComponent[],originalSOURCE:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).officialOpeningsReframe(components,originalSOURCE,nativeLeafSHA);}
export function officialOpeningsBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).officialOpeningsBaseMaterials(components,paint,frames);}
export function officialOpeningsDisplayCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).officialOpeningsDisplayCertificate(c);}
export function officialOpeningsGroupDisplayCertificate(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).officialOpeningsGroupDisplayCertificate(components);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("official-openings-runtime",name,components);
