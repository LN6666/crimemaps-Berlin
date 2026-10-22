import type{BuildingComponent}from'./building-mesh-renderer';
import type{ProgressiveAdmission}from'./progressive-paint';
import{nativePaintSignature}from'./progressive-native-signature';
import{progressivePaintValidation}from'./progressive-paint-validation';
import{boundedBufferSHA256}from'./s528-projection-sha256';
import{prepareC194Packing,type C194Binding,type C194ProjectionResult}from'./c194-projection-sidecar';
import{C194_PROJECTION_REGISTRY as registry}from'./c194-projection-pin';
const parent=registry.referenceParent,digest=(v:unknown)=>boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(v)));
export const c194Replacement=(c:BuildingComponent)=>c.city==='bremen'&&registry.replacementSourceProof.some(p=>p.objectId===c.objectId);
export const c194Outline=(c:BuildingComponent)=>c.city==='bremen'&&c.objectId===parent.objectId&&c.partId===parent.partId;
export function c194ParentReadiness(components:readonly BuildingComponent[],binding:C194Binding|undefined,admissionOf:(c:BuildingComponent)=>ProgressiveAdmission|undefined,rawConsumers:unknown={},batchReady:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const empty=new Map<BuildingComponent,C194ProjectionResult>(),active=components.some(c=>c194Outline(c)||registry.replacementSourceProof.some(p=>p.objectId===c.objectId));if(!active)return{active:false,ready:false,reason:'inactive',entries:empty};
 try{const outlines=components.filter(c194Outline);if(outlines.length!==1)throw Error('exact parent missing/duplicate');const outline=outlines[0];if(!binding||binding.leafSHA(outline)!==parent.sourceSHA256||JSON.stringify(outline.origin)!==JSON.stringify(parent.origin)||nativePaintSignature(outline)!==parent.geometrySignature)throw Error('exact parent source drift');
 for(const pin of registry.replacementSourceProof){const matches=components.filter(c=>c.objectId===pin.objectId);if(matches.length!==1)throw Error('all8 exact replacements required');const c=matches[0],ad=admissionOf(c);if(c.city!=='bremen'||c.partId!==pin.partId||binding.leafSHA(c)!==pin.sourceSHA256||JSON.stringify(c.origin)!==JSON.stringify(pin.origin)||nativePaintSignature(c)!==pin.geometrySignature||!ad||progressivePaintValidation(c,ad)||digest(ad.surfaceFrames??[])!==pin.surfaceFramesSHA256)throw Error('replacement source/material drift');for(let bi=0;bi<c.batches.length;bi++)if(!batchReady(c,bi))throw Error('replacement batch masked');}
 const entries=prepareC194Packing(components,binding,admissionOf,rawConsumers);if(entries.size!==1)throw Error('exact roof numeric readiness required');return{active:true,ready:true,reason:'all8 exact materials and one pyramidal numerical map ready',entries};
 }catch(error){return{active:true,ready:false,reason:'generic retained: '+String(error instanceof Error?error.message:error).slice(0,180),entries:empty};}
}
