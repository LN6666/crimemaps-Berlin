import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{GLOCKE_DETAIL_DATA_RESOURCE}from'./glocke-detail-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {nativePaintSignature} from './progressive-native-signature';
import {getGLOCKE_DETAIL_DATA,GLOCKE_DETAIL_SHA} from './glocke-detail-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function sourceUnchanged(c:BuildingComponent,m:any,leaf:Leaf){return c.city==='bremen'&&leaf(c)===m.identity.leafSHA256&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],m.source.batches[bi][k])));}
const displayBatch=(b:any)=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[.37,.245,.215]as[number,number,number],paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)});
function finite(c:BuildingComponent,m:any){const mark=c.displayEstimates?.bremenGlockeDetail as any;if(c.city!=='bremen'||mark?.patchSHA256!==GLOCKE_DETAIL_SHA||!['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))||c.batches.length!==m.display.length)return false;return c.batches.every((b,bi)=>['positions','normals','indices'].every(k=>(b as any)[k].length===m.display[bi][k].length&&Array.from((b as any)[k]as ArrayLike<number>).every((v,j)=>Object.is(v,k==='indices'?m.display[bi][k][j]:Math.fround(m.display[bi][k][j])))));}

/** Full original recipe resources; city demand is deliberately coarse. */
export const GLOCKE_DETAIL_SCOPE_RESOURCES=[GLOCKE_DETAIL_DATA_RESOURCE] as const;
export const GLOCKE_DETAIL_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=GLOCKE_DETAIL_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=GLOCKE_DETAIL_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"bremenGlockeDetailIdentity":1,"bremenGlockeDetailCarrierIdentity":1,"bremenGlockeDetailHeldIdentity":1,"bremenGlockeDetailReconstruction":2,"bremenGlockeDetailBaseMaterials":3,"bremenGlockeDetailDisplayCertificate":1,"bremenGlockeDetailGroupDisplayCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('glocke-detail-runtime requires a prepared frozen data scope');return scope;}
const model=(c:Identity)=>bremenIdentityCandidate("glocke-detail-runtime",c)?(getGLOCKE_DETAIL_DATA(scope).models.find((m:any)=>key(c)===key(m.identity))):undefined;
const bremenGlockeDetailIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenGlockeDetailIdentity",c);
const bremenGlockeDetailCarrierIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenGlockeDetailCarrierIdentity",c);
const bremenGlockeDetailHeldIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenGlockeDetailHeldIdentity",c);
function ready(rows:BuildingComponent[],leaf:Leaf){return getGLOCKE_DETAIL_DATA(scope).models.every((m:any)=>{const a=rows.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return a.length===1&&sourceUnchanged(a[0],m,leaf);});}
function bremenGlockeDetailReconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf){
 const stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[]as any[]};if(!bremenRecipeDemand("glocke-detail-runtime","bremenGlockeDetailReconstruction",components))return{components,stats};
 if(!nativeLeafSHA||!ready(components,nativeLeafSHA))return{components,stats};
 const mapped=components.map(c=>{const m=c.city==='bremen'?model(c):undefined;if(!m)return c;const batches=m.display.map(displayBatch);const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:GLOCKE_DETAIL_SHA,vertices,triangles,geometryRole:m.role});return{...c,batches,displayEstimates:{...c.displayEstimates,bremenGlockeDetail:{patchSHA256:GLOCKE_DETAIL_SHA,officialBuildingIds:getGLOCKE_DETAIL_DATA(scope).officialIds,sourceRetained:true,nativeSourceIdentityUnchanged:true,geometryRole:m.role,sourceCarrier:getGLOCKE_DETAIL_DATA(scope).sourceCarrier,officialGroundDatumM:getGLOCKE_DETAIL_DATA(scope).layout.groundDatumM,officialCoreWithFrozenClipAndPhotoParapet:true,colourCoverageComplete:true,detail70Implemented:true,facadeDimensionsPhotoApproximate:true,actualVisualAccepted:false}}};});
 return{components:mapped,stats};
}
function bremenGlockeDetailBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("glocke-detail-runtime","bremenGlockeDetailBaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 const carrier=components.find(c=>c.city==='bremen'&&bremenGlockeDetailCarrierIdentity(c));if(!carrier||!finite(carrier,model(carrier)))return{objects:0,vertices:0,actualVisualAccepted:false};
 let offset=0,objects=0,vertices=0;for(const c of components){const m=c.city==='bremen'?model(c):undefined;const ok=!!m&&finite(c,m);if(ok&&c.batches.length)objects++;c.batches.forEach((b,bi)=>{const n=b.positions.length/3;if(ok){paint.set(m.display[bi].paint,offset*4);frames.set(m.display[bi].frames,offset*5);vertices+=n;}offset+=n;});}return{objects,vertices,actualVisualAccepted:false};
}
function bremenGlockeDetailDisplayCertificate(c:BuildingComponent|undefined){if(!c||c.city!=='bremen'||!bremenGlockeDetailIdentity(c))return null;const m=model(c);if(!finite(c,m))throw Error('Bremen GlockeDetail finite DISPLAY certificate mismatch');return{patchSHA256:GLOCKE_DETAIL_SHA,officialBuildingIds:getGLOCKE_DETAIL_DATA(scope).officialIds,sourceRetained:true,sourceCarrier:getGLOCKE_DETAIL_DATA(scope).sourceCarrier,nativeIdentity:{objectId:c.objectId,partId:c.partId},geometryRole:m.role,displayVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),displayTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),actualVisualAccepted:false};}
function bremenGlockeDetailGroupDisplayCertificate(components:BuildingComponent[]){const members=getGLOCKE_DETAIL_DATA(scope).models.map((m:any)=>{const found=components.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return{objectId:m.identity.objectId,partId:m.identity.partId,count:found.length,finite:found.length===1&&finite(found[0],m)};});const present=members.filter((m:any)=>m.count>0).length;return{patchSHA256:GLOCKE_DETAIL_SHA,status:members.every((m:any)=>m.finite)?'complete':present?'partial-or-invalid':'not-loaded',expectedMembers:getGLOCKE_DETAIL_DATA(scope).models.length,presentMembers:present,verifiedMembers:members.filter((m:any)=>m.finite).length,members,actualVisualAccepted:false};}
return{bremenGlockeDetailIdentity,bremenGlockeDetailCarrierIdentity,bremenGlockeDetailHeldIdentity,bremenGlockeDetailReconstruction,bremenGlockeDetailBaseMaterials,bremenGlockeDetailDisplayCertificate,bremenGlockeDetailGroupDisplayCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function bremenGlockeDetailIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenGlockeDetailIdentity",c);}
export function bremenGlockeDetailCarrierIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenGlockeDetailCarrierIdentity",c);}
export function bremenGlockeDetailHeldIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenGlockeDetailHeldIdentity",c);}
export function bremenGlockeDetailReconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).bremenGlockeDetailReconstruction(components,nativeLeafSHA);}
export function bremenGlockeDetailBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).bremenGlockeDetailBaseMaterials(components,paint,frames);}
export function bremenGlockeDetailDisplayCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).bremenGlockeDetailDisplayCertificate(c);}
export function bremenGlockeDetailGroupDisplayCertificate(components:BuildingComponent[],scope?:FrozenDataScope){return recipe(scope).bremenGlockeDetailGroupDisplayCertificate(components);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("glocke-detail-runtime",name,components);
