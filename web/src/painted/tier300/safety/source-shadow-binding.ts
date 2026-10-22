import {SOURCE_SHADOW_VECTOR} from './source-shadow';
import type {BuildingComponent,ShadowBatchAdmission} from './building-mesh-renderer';
/** Compact SHA-checked asset protocol: one common header and one integer index list.
 * No repeated source IDs/boundary strings per serialized component; raw tags remain exact. */
export function shadowAdmissionForDecodedShard(value:unknown,components:readonly BuildingComponent[],city:string,boundarySHA256:string):ShadowBatchAdmission|undefined{
 const raw=value as {shadow_profile?:ShadowBatchAdmission['profile'];shadow_admitted_component_indices?:unknown}|undefined,p=raw?.shadow_profile,list=raw?.shadow_admitted_component_indices;
 if(!p||p.schema_version!==1||p.city!==city||!/^[a-f0-9]{64}$/.test(boundarySHA256)||p.source_boundary_sha256!==boundarySHA256||p.status!=='display-schematic'||p.includes_growth_zero_to_one!==true||p.swept_bbox_actual_city_covered!==true||!Array.isArray(p.fixed_vector)||p.fixed_vector.length!==2||!p.fixed_vector.every((v,i)=>v===SOURCE_SHADOW_VECTOR[i])||!Array.isArray(list)||list.length>components.length)return;
 const seen=new Set<number>(),entries:ShadowBatchAdmission['components'][number][]=[];
 for(const i of list){if(!Number.isSafeInteger(i)||i<0||i>=components.length||seen.has(i))return;seen.add(i);const c=components[i];if(c.city!==city)return;entries.push({objectId:c.objectId,partId:c.partId,triangleCount:c.batches.reduce((n,b)=>n+b.indices.length/3,0)});}
 return {verifiedBoundarySHA256:boundarySHA256,profile:p,components:entries};
}
/** Merge only already verified active decoded shards with the same current city boundary. */
export function mergeShadowAdmissions(groups:readonly(ShadowBatchAdmission|undefined)[]):ShadowBatchAdmission|undefined{
 const present=groups.filter((g):g is ShadowBatchAdmission=>!!g);if(!present.length)return;
 const first=present[0],entries:ShadowBatchAdmission['components'][number][]=[],seen=new Set<string>();
 for(const g of present){if(g.verifiedBoundarySHA256!==first.verifiedBoundarySHA256||g.profile.city!==first.profile.city)return;for(const e of g.components){const key=e.objectId+'|'+e.partId;if(seen.has(key))return;seen.add(key);entries.push(e);}}
 return {...first,components:entries};
}
