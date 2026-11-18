import {bremenRecipeDemand} from './bremen-recipe-demand';
import {bremenIdentityCandidate,bremenIdentityMatches} from './bremen-identity-metadata';
import type{FrozenDataScope}from'../../../safety/frozen-data-scope';
import{QUARTIER670_DATA_RESOURCE}from'./quartier670-data';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {nativePaintSignature} from './progressive-native-signature';
import {getQUARTIER670_DATA,QUARTIER670_SHA} from './quartier670-data';
type Leaf=(c:BuildingComponent)=>string|undefined;
const key=(c:Identity)=>c.objectId+'|'+c.partId;
const same=(a:any,b:any):boolean=>Array.isArray(a)||ArrayBuffer.isView(a)?(Array.isArray(b)||ArrayBuffer.isView(b))&&(a as any).length===(b as any).length&&Array.from(a as ArrayLike<number>).every((v,i)=>Object.is(v,(b as any)[i])):JSON.stringify(a)===JSON.stringify(b);
function sourceUnchanged(c:BuildingComponent,m:any,leaf:Leaf){return c.city==='bremen'&&leaf(c)===m.identity.leafSHA256&&nativePaintSignature(c)===m.identity.signature&&['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))&&c.batches.length===m.source.batches.length&&c.batches.every((b,bi)=>(['positions','normals','indices','color']as const).every(k=>same(b[k],m.source.batches[bi][k])));}
const displayBatch=(b:any)=>({positions:new Float32Array(b.positions),normals:new Float32Array(b.normals),indices:new Uint32Array(b.indices),color:[.78,.79,.755]as[number,number,number],paint:new Float32Array(b.paint),frames:new Float32Array(b.frames)});
function finite(c:BuildingComponent,m:any){const mark=c.displayEstimates?.bremenQuartier670 as any;if(c.city!=='bremen'||mark?.patchSHA256!==QUARTIER670_SHA||!['origin','componentGeometry','sourceFeature'].every(k=>same((c as any)[k],m.source[k]))||c.batches.length!==m.display.length)return false;return c.batches.every((b,bi)=>['positions','normals','indices'].every(k=>(b as any)[k].length===m.display[bi][k].length&&Array.from((b as any)[k]as ArrayLike<number>).every((v,j)=>Object.is(v,k==='indices'?m.display[bi][k][j]:Math.fround(m.display[bi][k][j])))));}

/** Full original recipe resources; city demand is deliberately coarse. */
export const QUARTIER670_SCOPE_RESOURCES=[QUARTIER670_DATA_RESOURCE] as const;
export const QUARTIER670_SCOPE_CITIES=["bremen"] as const;
export const MODULE_SCOPE_RESOURCES=QUARTIER670_SCOPE_RESOURCES;
export const MODULE_SCOPE_CITIES=QUARTIER670_SCOPE_CITIES;
export const MODULE_SCOPE_ARITY={"bremenQuartier670Identity":1,"bremenQuartier670CarrierIdentity":1,"bremenQuartier670HeldIdentity":1,"bremenQuartier670Reconstruction":2,"bremenQuartier670BaseMaterials":3,"bremenQuartier670DisplayCertificate":1} as const;
const RECIPE_KEY={};

function createRecipe(scope?:FrozenDataScope){
function scopeValue():FrozenDataScope{if(!scope)throw Error('quartier670-runtime requires a prepared frozen data scope');return scope;}
const model=(c:Identity)=>bremenIdentityCandidate("quartier670-runtime",c)?(getQUARTIER670_DATA(scope).models.find((m:any)=>key(c)===key(m.identity))):undefined;
const bremenQuartier670Identity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenQuartier670Identity",c);
const bremenQuartier670CarrierIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenQuartier670CarrierIdentity",c);
const bremenQuartier670HeldIdentity=(c:Identity&{city?:string})=>bremenIdentityMatches("bremenQuartier670HeldIdentity",c);
function ready(rows:BuildingComponent[],leaf:Leaf){return getQUARTIER670_DATA(scope).models.every((m:any)=>{const a=rows.filter(c=>c.city==='bremen'&&key(c)===key(m.identity));return a.length===1&&sourceUnchanged(a[0],m,leaf);});}
function bremenQuartier670Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf){
 const stats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[]as any[]};if(!bremenRecipeDemand("quartier670-runtime","bremenQuartier670Reconstruction",components))return{components,stats};
 if(!nativeLeafSHA||!ready(components,nativeLeafSHA))return{components,stats};
 const mapped=components.map(c=>{const m=c.city==='bremen'?model(c):undefined;if(!m)return c;const batches=m.display.map(displayBatch);const vertices=batches.reduce((n:number,b:any)=>n+b.positions.length/3,0),triangles=batches.reduce((n:number,b:any)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:QUARTIER670_SHA,vertices,triangles,geometryRole:m.role});return{...c,batches,displayEstimates:{...c.displayEstimates,bremenQuartier670:{patchSHA256:QUARTIER670_SHA,officialBuildingId:getQUARTIER670_DATA(scope).officialId,sourceRetained:true,nativeSourceIdentityUnchanged:true,geometryRole:m.role,sourceCarrier:getQUARTIER670_DATA(scope).sourceCarrier,officialGroundDatumM:getQUARTIER670_DATA(scope).groundDatumM,officialBodyGeometry:true,photoEstimatedBalconies:20,colourCoverageComplete:true,detail70Implemented:true,facadeDimensionsPhotoApproximate:true,actualVisualAccepted:false}}};});
 return{components:mapped,stats};
}
function bremenQuartier670BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){if(!bremenRecipeDemand("quartier670-runtime","bremenQuartier670BaseMaterials",components))return{objects:0,vertices:0,actualVisualAccepted:false};
 const carrier=components.find(c=>c.city==='bremen'&&bremenQuartier670CarrierIdentity(c));if(!carrier||!finite(carrier,model(carrier)))return{objects:0,vertices:0,actualVisualAccepted:false};
 let offset=0,objects=0,vertices=0;for(const c of components){const m=c.city==='bremen'?model(c):undefined;const ok=!!m&&finite(c,m);if(ok&&c.batches.length)objects++;c.batches.forEach((b,bi)=>{const n=b.positions.length/3;if(ok){paint.set(m.display[bi].paint,offset*4);frames.set(m.display[bi].frames,offset*5);vertices+=n;}offset+=n;});}return{objects,vertices,actualVisualAccepted:false};
}
function bremenQuartier670DisplayCertificate(c:BuildingComponent|undefined){if(!c||c.city!=='bremen'||!bremenQuartier670Identity(c))return null;const m=model(c);if(!finite(c,m))throw Error('Bremen Quartier670 finite DISPLAY certificate mismatch');return{patchSHA256:QUARTIER670_SHA,officialBuildingId:getQUARTIER670_DATA(scope).officialId,sourceRetained:true,sourceCarrier:getQUARTIER670_DATA(scope).sourceCarrier,nativeIdentity:{objectId:c.objectId,partId:c.partId},geometryRole:m.role,displayVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),displayTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),actualVisualAccepted:false};}
return{bremenQuartier670Identity,bremenQuartier670CarrierIdentity,bremenQuartier670HeldIdentity,bremenQuartier670Reconstruction,bremenQuartier670BaseMaterials,bremenQuartier670DisplayCertificate};
}
function recipe(scope?:FrozenDataScope){return scope?scope.memo(RECIPE_KEY,()=>createRecipe(scope)):createRecipe();}
export function bremenQuartier670Identity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenQuartier670Identity",c);}
export function bremenQuartier670CarrierIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenQuartier670CarrierIdentity",c);}
export function bremenQuartier670HeldIdentity(c:Identity&{city?:string},scope?:FrozenDataScope){return bremenIdentityMatches("bremenQuartier670HeldIdentity",c);}
export function bremenQuartier670Reconstruction(components:BuildingComponent[],nativeLeafSHA?:Leaf,scope?:FrozenDataScope){return recipe(scope).bremenQuartier670Reconstruction(components,nativeLeafSHA);}
export function bremenQuartier670BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){return recipe(scope).bremenQuartier670BaseMaterials(components,paint,frames);}
export function bremenQuartier670DisplayCertificate(c:BuildingComponent|undefined,scope?:FrozenDataScope){return recipe(scope).bremenQuartier670DisplayCertificate(c);}

export const MODULE_SCOPE_DEMAND=(name:string,components:readonly {city?:string;objectId?:string;partId?:string}[])=>bremenRecipeDemand("quartier670-runtime",name,components);
