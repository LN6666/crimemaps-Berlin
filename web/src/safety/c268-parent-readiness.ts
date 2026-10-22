import type{BuildingComponent}from'./building-mesh-renderer';
import type{ProgressiveAdmission}from'./progressive-paint';
import{nativePaintSignature}from'./progressive-native-signature';
import{progressivePaintValidation}from'./progressive-paint-validation';
import{boundedBufferSHA256}from'./s528-projection-sha256';
import{prepareC268Packing,type C268Binding,type C268ProjectionResult}from'./c268-projection-sidecar';
import{C268_PROJECTION_REGISTRY as registry}from'./c268-projection-pin';
const digest=(v:unknown)=>boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(v)));
export const c268Outline=(c:BuildingComponent)=>c.city==='dortmund'&&registry.outlineSourcePairs.some(p=>c.objectId===p.objectId&&c.partId===p.partId);
/** Both exact original generic outlines remain until all six source/material bindings and all four original roof numerical adapters are ready. Never mutates original arrays. */
export function c268ParentReadiness(components:readonly BuildingComponent[],binding:C268Binding|undefined,admissionOf:(c:BuildingComponent)=>ProgressiveAdmission|undefined,rawConsumers:unknown={},batchReady:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const empty=new Map<BuildingComponent,C268ProjectionResult>(),active=components.some(c=>c.city==='dortmund'&&registry.fullOriginalSourceProof.some(p=>p.objectId===c.objectId));if(!active)return{active:false,ready:false,reason:'inactive',entries:empty};
 try{if(!binding)throw Error('sourcebinding missing');for(const pin of registry.fullOriginalSourceProof){const matches=components.filter(c=>c.objectId===pin.objectId);if(matches.length!==1)throw Error('all six exact original sources required');const c=matches[0],ad=admissionOf(c);if(c.city!=='dortmund'||c.partId!==pin.partId||binding.leafSHA(c)!==pin.sourceSHA256||JSON.stringify(c.origin)!==JSON.stringify(pin.origin)||nativePaintSignature(c)!==pin.geometrySignature||JSON.stringify(c.sourceFeature.properties)!==JSON.stringify(pin.sourceProperties)||!ad||progressivePaintValidation(c,ad)||digest(ad.surfaceFrames??[])!==pin.surfaceFramesSHA256)throw Error('exactsource/materialdrift');for(let bi=0;bi<c.batches.length;bi++)if(!batchReady(c,bi))throw Error('originalbody batchmasked');}const entries=prepareC268Packing(components,binding,admissionOf,rawConsumers);if(entries.size!==4)throw Error('all four numerical roofs required');return{active:true,ready:true,reason:'all six original source materials and four exact numerical roofs ready',entries};}catch(error){return{active:true,ready:false,reason:'both generic outlines retained: '+String(error instanceof Error?error.message:error).slice(0,180),entries:empty};}
}
