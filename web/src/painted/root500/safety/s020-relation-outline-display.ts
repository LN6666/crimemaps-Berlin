import type {BuildingComponent} from './building-mesh-renderer';
import type {ProgressiveAdmission} from './progressive-paint';
import {progressiveAdmission} from './progressive-paint';
import {nativePaintSignature} from './progressive-native-signature';
import type {SourceEdgeAssemblyProfile,SourceEdgeAssemblyBinding,SourceEdgeAssemblyDisplayPlan} from './source-edge-assembly-display';
import {S020_RELATION_OUTLINE_PROFILES} from './s020-relation-outline-profile';
export type S020RelationOutlineProfile=SourceEdgeAssemblyProfile&{groupIdentity:'osm/relation/8102166';outlineEvidenceKind:'exact-original-source-boundary-edge-union-relation-outline';entranceSurfaceVerified:true;guardVersion:'s020-exact-three-native-parts-v1'};
type AdmissionReader=(c:BuildingComponent)=>ProgressiveAdmission|undefined;
const key=(c:{objectId:string;partId:string})=>c.objectId+'|'+c.partId;
const allowedFamilies:Readonly<Record<string,readonly number[]>>={
 'osm/way/1245266797':[4488,4490,4491],
 'osm/way/1245266798':[4490,4591],
 'osm/way/1245266799':[4490,4590]
};
const rgb=(c:readonly number[]|undefined)=>!!c&&c.length===3&&c.every(v=>Number.isFinite(v)&&v>=0&&v<=1);
/** Rendering-route readiness only. Unknown native-base finish remains unknown. */
export function s020FullOriginalBatchRouteReady(c:BuildingComponent,row:ProgressiveAdmission|undefined=progressiveAdmission(c)){
 const families=allowedFamilies[c.objectId];
 if(!row||!families||row.city!==c.city||row.objectId!==c.objectId||row.partId!==c.partId||row.origin[0]!==c.origin[0]||row.origin[1]!==c.origin[1]||row.geometrySignature!==nativePaintSignature(c))return false;
 for(const f of row.surfaceFrames??[]){const b=c.batches[f.batchIndex];if(!b||!Number.isSafeInteger(f.firstVertex)||!Number.isSafeInteger(f.vertexCount)||f.firstVertex<0||f.vertexCount<1||f.firstVertex+f.vertexCount>b.positions.length/3||!families.includes(f.family)||f.width<=0||f.height<=0||![...f.uAxis,...f.vAxis,f.uOrigin,f.vOrigin,f.width,f.height].every(Number.isFinite))return false;}
 for(const r of row.vertexRanges??[]){const b=c.batches[r.batchIndex];if(!b||!Number.isSafeInteger(r.firstVertex)||!Number.isSafeInteger(r.vertexCount)||r.firstVertex<0||r.vertexCount<1||r.firstVertex+r.vertexCount>b.positions.length/3||!rgb(r.color))return false;}
 for(let bi=0;bi<c.batches.length;bi++){
  const b=c.batches[bi],count=b.positions.length/3;if(!Number.isSafeInteger(count)||count<1)return false;
  const color=row.batchColors?.[String(bi)]??(b.faceRole==='wall'?row.wallColor:b.faceRole==='roof'?row.roofColor:undefined);
  if(color&&!rgb(color))return false;
  const covered=new Uint8Array(count);if(color)covered.fill(1);
  for(const r of row.vertexRanges??[])if(r.batchIndex===bi)covered.fill(1,r.firstVertex,r.firstVertex+r.vertexCount);
  for(const f of row.surfaceFrames??[])if(f.batchIndex===bi)covered.fill(1,f.firstVertex,f.firstVertex+f.vertexCount);
  if(covered.some(v=>v===0))return false;
 }
 return true;
}
function canonical(v:unknown):string{if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}';return JSON.stringify(v)??'undefined';}
/** Only this reviewed multipolygon outline. Never broadens the way-only planner. */
export function s020RelationOutlineDisplayPlan(components:readonly BuildingComponent[],profiles:readonly S020RelationOutlineProfile[],binding:SourceEdgeAssemblyBinding,admission:AdmissionReader=progressiveAdmission):SourceEdgeAssemblyDisplayPlan{
 const plan:SourceEdgeAssemblyDisplayPlan={hiddenOutlines:[],groups:[],errors:[]};
 if(binding.city!=='berlin')return plan;
 const expected=S020_RELATION_OUTLINE_PROFILES[0],outline=components.find(c=>key(c)===key(expected.outline));if(!outline)return plan;
 const fail=(reason:string)=>{plan.errors.push('S020 exact relation source-boundary: '+reason);return plan;};
 if(profiles.length!==1||canonical(profiles[0])!==canonical(expected))return fail('reviewed profile/78-edge proof differs');
 const p=profiles[0];
 if(p.groupIdentity!=='osm/relation/8102166'||p.outline.objectId!==p.groupIdentity||p.formalRelationMembership!==false||p.completenessClaim!==false||p.entranceSurfaceVerified!==true||p.guardVersion!=='s020-exact-three-native-parts-v1')return fail('explicit relation source-role binding failed');
 if(p.city!==binding.city||p.indexSHA!==binding.indexSHA||p.sourcePBF!==binding.sourcePBF||p.boundarySHA!==binding.boundarySHA||p.sourceSnapshot!==binding.sourceSnapshot)return fail('index/source binding failed');
 const loaded=new Map<string,BuildingComponent>(),duplicates=new Set<string>();for(const c of components){const k=key(c);if(loaded.has(k))duplicates.add(k);else loaded.set(k,c);}
 const exact=(c:BuildingComponent,m:S020RelationOutlineProfile['outline'])=>c.city===p.city&&!duplicates.has(key(m))&&binding.leafSHA(c)===m.leafSHA&&c.partId===m.objectId+'/component/'+m.geometryFingerprint&&nativePaintSignature(c)===m.nativePaintSignature;
 if(!exact(outline,p.outline))return fail('outline leaf/native signature/uniqueness failed');
 const parts:BuildingComponent[]=[];
 for(const m of p.parts){const c=loaded.get(key(m));if(!c||!exact(c,m))return fail('all three original parts must be resident and exact');if(!binding.materialReady(c)||!s020FullOriginalBatchRouteReady(c,admission(c)))return fail('all original batches require exact nonzero rendering routes');parts.push(c);}
 if(parts.length!==3)return fail('three-member set incomplete');
 // Keep original arrays and cache/source identities; only omit redundant outline in this display plan.
 plan.hiddenOutlines.push(outline);plan.groups.push({groupIdentity:p.groupIdentity,name:p.name,outline,parts,complete:false});return plan;
}
