import type{BuildingComponent}from'./building-mesh-renderer';
import type{ProgressiveAdmission}from'./progressive-paint';
import{nativePaintSignature}from'./progressive-native-signature';
import{prepareC179Packing,type C179Binding,type C179ProjectionResult}from'./c179-projection-sidecar';
import{C179_PROJECTION_REGISTRY as registry}from'./c179-projection-pin';
const parent=registry.referenceSourceProof;
const replacementIDs=['osm/way/136698313','osm/way/136698314'] as const;
export const c179Replacement=(c:BuildingComponent)=>c.city==='nuremberg'&&replacementIDs.some(id=>id===c.objectId);
export const c179Outline=(c:BuildingComponent)=>c.city==='nuremberg'&&c.objectId===parent.objectId&&c.partId===parent.partId;
/** Own eastern parent only: numerical or UV failures retain the original shell. Bounded production caller contract. */
export function c179ParentReadiness(components:readonly BuildingComponent[],binding:C179Binding|undefined,admissionOf:(c:BuildingComponent)=>ProgressiveAdmission|undefined,rawConsumers:unknown={},batchReady:(c:BuildingComponent,bi:number)=>boolean=()=>true){
 const empty=new Map<BuildingComponent,C179ProjectionResult>();
 const active=components.some(c=>c179Outline(c)||replacementIDs.some(id=>id===c.objectId));
 if(!active)return{active:false,ready:false,reason:'inactive',entries:empty};
 try{
  const parents=components.filter(c179Outline);if(parents.length!==1)throw Error('exact parent missing/duplicate');
  const p=parents[0];if(!binding||binding.leafSHA(p)!==parent.sourceSHA256||JSON.stringify(p.origin)!==JSON.stringify(parent.origin)||nativePaintSignature(p)!==parent.geometrySignature)throw Error('exact parent source drift');
  const own:BuildingComponent[]=[];
  for(const id of replacementIDs){const matches=components.filter(c=>c.objectId===id);if(matches.length!==1)throw Error('both exact replacements required');const c=matches[0];for(let bi=0;bi<c.batches.length;bi++)if(!batchReady(c,bi))throw Error('replacement batch masked');own.push(c);}
  const entries=prepareC179Packing(own,binding,admissionOf,rawConsumers);
  if(entries.size!==2)throw Error('both roof numeric and material frames required');
  return{active:true,ready:true,reason:'both exact eastern replacements numerically and materially ready',entries};
 }catch(error){return{active:true,ready:false,reason:'generic retained: '+String(error instanceof Error?error.message:error).slice(0,180),entries:empty};}
}
