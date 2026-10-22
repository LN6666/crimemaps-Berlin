import type{BuildingComponent}from'./building-mesh-renderer';
import type{ProgressiveAdmission}from'./progressive-paint';
import{nativePaintSignature}from'./progressive-native-signature';
import{progressivePaintValidation}from'./progressive-paint-validation';
import{boundedBufferSHA256}from'./s528-projection-sha256';
import{FROZEN_PAINT_IDS}from'./frozen-paint-ids';
import{prepareC139Packing,type C139Binding,type C139ProjectionResult}from'./c139-projection-sidecar';
import{C139_PROJECTION_REGISTRY as registry}from'./c139-projection-pin';
const parent=registry.referenceParent,digest=(v:unknown)=>boundedBufferSHA256(new TextEncoder().encode(JSON.stringify(v)));
export const c139Replacement=(c:BuildingComponent)=>c.city==='hannover'&&registry.replacementSourceProof.some(p=>p.objectId===c.objectId);
export const c139Outline=(c:BuildingComponent)=>c.city==='hannover'&&c.objectId===parent.objectId&&c.partId===parent.partId;
function exactSource(c:BuildingComponent,pin:typeof parent,binding:C139Binding){
 if(c.city!=='hannover'||c.partId!==pin.partId||FROZEN_PAINT_IDS.has(c.objectId)||binding.frozen?.(c)||binding.leafSHA(c)!==pin.sourceSHA256||JSON.stringify(c.origin)!==JSON.stringify(pin.origin)||nativePaintSignature(c)!==pin.geometrySignature||digest(c.componentGeometry)!==digest(pin.componentGeometry)||c.batches.length!==pin.batches.length)throw Error('exact whole source binding drift');
 for(const[bi,b]of c.batches.entries())for(const field of['positions','normals','indices']as const){const a=b[field];if(!(field==='indices'?a instanceof Uint32Array:a instanceof Float32Array))throw Error('exact whole typed raw buffer required');const typed=a as Float32Array|Uint32Array;if(boundedBufferSHA256(new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength))!==pin.batches[bi][field+'SHA256' as 'positionsSHA256'|'normalsSHA256'|'indicesSHA256'])throw Error('exact whole raw buffer SHA drift');}
}
export function c139ParentReadiness(components:readonly BuildingComponent[],binding:C139Binding|undefined,admissionOf:(c:BuildingComponent)=>ProgressiveAdmission|undefined,rawConsumers:unknown={},batchReady:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const empty=new Map<BuildingComponent,C139ProjectionResult>(),active=components.some(c=>c139Outline(c)||c139Replacement(c));if(!active)return{active:false,ready:false,reason:'inactive',entries:empty};
 try{
 if(!binding)throw Error('source leaf binding required');const outlines=components.filter(c139Outline);if(outlines.length!==1)throw Error('exact parent missing/duplicate');const outline=outlines[0];exactSource(outline,parent,binding);const parentAd=admissionOf(outline);if(!parentAd||progressivePaintValidation(outline,parentAd)||digest(parentAd.surfaceFrames??[])!==registry.parentSurfaceFramesSHA256)throw Error('parent base material drift');
 for(const pin of registry.replacementSourceProof){const matches=components.filter(c=>c.city==='hannover'&&c.objectId===pin.objectId);if(matches.length!==1)throw Error('all17 exact replacements required');const c=matches[0],ad=admissionOf(c);exactSource(c,pin as unknown as typeof parent,binding);if(!ad||progressivePaintValidation(c,ad)||digest(ad.surfaceFrames??[])!==pin.surfaceFramesSHA256)throw Error('replacement material drift');for(let bi=0;bi<c.batches.length;bi++)if(!batchReady(c,bi))throw Error('replacement batch masked');}
 const entries=prepareC139Packing(components,binding,admissionOf,rawConsumers);if(entries.size!==13)throw Error('all13 exact roof numeric maps required');return{active:true,ready:true,reason:'all17 exact sources/materials and13 roof numeric maps ready',entries};
 }catch(error){return{active:true,ready:false,reason:'generic retained: '+String(error instanceof Error?error.message:error).slice(0,180),entries:empty};}
}
