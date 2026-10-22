import type{BuildingComponent}from'./building-mesh-renderer';
import type{ProgressiveAdmission}from'./progressive-paint';
import{nativePaintSignature}from'./progressive-native-signature';
import{prepareC094Packing,type C094Binding,type C094ProjectionResult}from'./c094-projection-sidecar';
import{C094_PROJECTION_REGISTRY as registry}from'./c094-projection-pin';
const parent=registry.referenceSourceProof;
export const c094Outline=(c:BuildingComponent)=>c.city==='cologne'&&c.objectId===parent.objectId&&c.partId===parent.partId;
/** Exact C094 only. Runs before parent removal; failed readiness retains raw fallback. */
export function c094ParentReadiness(components:readonly BuildingComponent[],binding:C094Binding|undefined,admissionOf:(c:BuildingComponent)=>ProgressiveAdmission|undefined,rawConsumers:unknown={},batchReady:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const empty=new Map<BuildingComponent,C094ProjectionResult>(),active=components.some(c=>c.city==='cologne'&&(c.objectId===parent.objectId||registry.targets.some(p=>p.objectId===c.objectId)));
 if(!active)return{active:false,ready:false,reason:'inactive',entries:empty};
 try{
  const outlines=components.filter(c094Outline);if(outlines.length!==1)throw Error('exact original parent missing/duplicate');const outline=outlines[0];
  if(!binding||binding.leafSHA(outline)!==parent.sourceSHA256||JSON.stringify(outline.origin)!==JSON.stringify(parent.origin)||nativePaintSignature(outline)!==parent.geometrySignature)throw Error('exact original parent binding drift');
  const targets=components.filter(c=>registry.targets.some(p=>p.objectId===c.objectId));if(targets.length!==3)throw Error('all3 original parts required');
  for(const c of targets)for(let bi=0;bi<c.batches.length;bi++)if(!batchReady(c,bi))throw Error('original part batch masked');
  const entries=prepareC094Packing(components,binding,admissionOf,rawConsumers);if(entries.size!==3)throw Error('all3 numerical surfaces and materials required');
  return{active:true,ready:true,reason:'all3 exact numerical surfaces and original materials ready',entries};
 }catch(error){return{active:true,ready:false,reason:'generic retained: '+String(error instanceof Error?error.message:error).slice(0,180),entries:empty};}
}
