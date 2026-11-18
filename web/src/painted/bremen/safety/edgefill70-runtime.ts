import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{EDGEFILL70_DATA_RESOURCE}from'./edgefill70-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {nativePaintSignature} from './progressive-native-signature';
import {getEDGEFILL70_DATA,EDGEFILL70_SHA} from './edgefill70-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function sourceUnchanged(c:BuildingComponent,m:any,leaf:Leaf){return c.city==='bremen'&&leaf(c)===m.identity.leafSHA256&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],m.source.batches[bi][k])));}
function ready(g:any,rows:BuildingComponent[],leaf:Leaf){return g.models.every((m:any)=>{const a=rows.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return a.length===1&&sourceUnchanged(a[0],m,leaf);});}
const displayBatch=(b:any)=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[.5,.5,.5]as[number,number,number],paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)});

/** Full original recipe resources; city demand is deliberately coarse. */
export const EDGEFILL70_SCOPE_RESOURCES=[EDGEFILL70_DATA_RESOURCE] as const;
export const EDGEFILL70_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=EDGEFILL70_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=EDGEFILL70_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"bremenEdgefill70Identity":1,"bremenEdgefill70CarrierIdentity":1,"bremenEdgefill70HeldIdentity":1,"bremenEdgefill70Reconstruction":2,"bremenEdgefill70BaseMaterials":3,"bremenEdgefill70DisplayCertificate":1,"bremenEdgefill70GroupDisplayCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('edgefill70-runtime requires a prepared frozen data scope');return scope;}
const group=(c:Identity)=>bremenIdentityCandidate("edgefill70-runtime",c)?(getEDGEFILL70_DATA(scope).groups.find((g:any)=>g.models.some((m:any)=>key(c)===key(m.identity)))):undefined;
const model=(c:Identity)=>group(c)?.models.find((m:any)=>key(c)===key(m.identity));
const bremenEdgefill70Identity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenEdgefill70Identity",c);
const bremenEdgefill70CarrierIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenEdgefill70CarrierIdentity",c);
const bremenEdgefill70HeldIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenEdgefill70HeldIdentity",c);
function bremenEdgefill70Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf){
 const stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,groups:[]as string[],components:[]as any[]};if(!bremenRecipeDemand("edgefill70-runtime","bremenEdgefill70Reconstruction",components))return{components,stats};
 if(!nativeLeafSHA)return{components,stats};const allowed=new Set<string>(getEDGEFILL70_DATA(scope).groups.filter((g:any)=>ready(g,components,nativeLeafSHA)).map((g:any)=>g.key));if(!allowed.size)return{components,stats};stats.groups=[...allowed];
 const mapped=components.map(c=>{const g=c.city==='bremen'?group(c):undefined;if(!g||!allowed.has(g.key))return c;const m=model(c),batches=m.display.map(displayBatch),vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:EDGEFILL70_SHA,vertices,triangles,geometryRole:m.role,group:g.key});return{...c,batches,displayEstimates:{...c.displayEstimates,bremenEdgefill70:{patchSHA256:EDGEFILL70_SHA,group:g.key,officialBuildingIds:g.officialIds,sourceRetained:true,nativeSourceIdentityUnchanged:true,geometryRole:m.role,sourceCarrier:m.display.length?{objectId:c.objectId,partId:c.partId}:{objectId:g.models[0].identity.objectId,partId:g.models[0].identity.partId},officialCoreGeometry:true,colourCoverageComplete:true,detailTarget70:true,exactFacadeDimensionsPhotoApproximate:true,unphotographedOpeningsNotInvented:true,actualVisualAccepted:false}}};});return{components:mapped,stats};
}
function finite(c:BuildingComponent,m:any){const mark=c.displayEstimates?.bremenEdgefill70 as any;if(c.city!=='bremen'||mark?.patchSHA256!==EDGEFILL70_SHA||mark?.group!==group(c)?.key||!['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))||c.batches.length!==m.display.length)return false;return c.batches.every((b,bi)=>['positions','normals','indices'].every(k=>(b as any)[k].length===m.display[bi][k].length&&Array.from((b as any)[k]as ArrayLike<number>).every((v,j)=>Object.is(v,k==='indices'?m.display[bi][k][j]:Math.fround(m.display[bi][k][j])))));}
function bremenEdgefill70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("edgefill70-runtime","bremenEdgefill70BaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 let offset=0,objects=0,vertices=0;for(const c of components){const m=c.city==='bremen'?model(c):undefined;const ok=!!m&&finite(c,m);if(ok&&c.batches.length)objects++;c.batches.forEach((b,bi)=>{const n=b.positions.length/3;if(ok){paint.set(m.display[bi].paint,offset*4);frames.set(m.display[bi].frames,offset*5);vertices+=n;}offset+=n;});}return{objects,vertices,actualVisualAccepted:false};
}
function bremenEdgefill70DisplayCertificate(c:BuildingComponent|undefined){if(!c||c.city!=='bremen'||!bremenEdgefill70Identity(c))return null;const m=model(c),g=group(c);if(!finite(c,m))throw Error('Bremen Edgefill70 finite DISPLAY certificate mismatch');return{patchSHA256:EDGEFILL70_SHA,group:g.key,officialBuildingIds:g.officialIds,sourceRetained:true,nativeIdentity:{objectId:c.objectId,partId:c.partId},geometryRole:m.role,displayVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),displayTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),actualVisualAccepted:false};}
function bremenEdgefill70GroupDisplayCertificate(components:BuildingComponent[]){return getEDGEFILL70_DATA(scope).groups.map((g:any)=>{const members=g.models.map((m:any)=>{const found=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return{objectId:m.identity.objectId,partId:m.identity.partId,count:found.length,finite:found.length===1&&finite(found[0],m)};});const present=members.filter((m:any)=>m.count>0).length,complete=members.every((m:any)=>m.finite);return{group:g.key,patchSHA256:EDGEFILL70_SHA,status:complete?'complete':present?'partial-or-invalid':'not-loaded',expectedMembers:g.models.length,presentMembers:present,verifiedMembers:members.filter((m:any)=>m.finite).length,members,actualVisualAccepted:false};});}
return{bremenEdgefill70Identity,bremenEdgefill70CarrierIdentity,bremenEdgefill70HeldIdentity,bremenEdgefill70Reconstruction,bremenEdgefill70BaseMaterials,bremenEdgefill70DisplayCertificate,bremenEdgefill70GroupDisplayCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function bremenEdgefill70Identity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenEdgefill70Identity",c);}
export function bremenEdgefill70CarrierIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenEdgefill70CarrierIdentity",c);}
export function bremenEdgefill70HeldIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenEdgefill70HeldIdentity",c);}
export function bremenEdgefill70Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).bremenEdgefill70Reconstruction(components,nativeLeafSHA);}
export function bremenEdgefill70BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).bremenEdgefill70BaseMaterials(components,paint,frames);}
export function bremenEdgefill70DisplayCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).bremenEdgefill70DisplayCertificate(c);}
export function bremenEdgefill70GroupDisplayCertificate(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).bremenEdgefill70GroupDisplayCertificate(components);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("edgefill70-runtime",name,components);
