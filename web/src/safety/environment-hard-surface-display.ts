import earcut,{deviation} from 'earcut';
import {createGroundProjection} from './ground-projection';
import {coversProjectedGroundTriangle,type PreparedSolarBoundary} from './solar-shadow-admission';
import {ENVIRONMENT_LIMITS,type EnvironmentFeature,type EnvironmentBox} from './environment-scene-data';
import {REVIEWED_HARD_SURFACES} from './hard-surface-display-policy';
export const HARD_SURFACE_DISPLAY_ROLE=7;
/** This policy retains original use/vegetation tags; only an explicit,
 * nonconflicting source surface declaration authorizes this separate display. */
export function hardSurfaceDisplayDecision(feature:EnvironmentFeature){
 const row=REVIEWED_HARD_SURFACES.find(row=>row.id===feature.id);if(!row)return 'not-reviewed';
 const p=feature.properties,keys=Object.keys(p.osmTags).sort(),expectedKeys=Object.keys(row.tags).sort();
 if(p.kind!=='green'||p.source_pbf_sha256!==row.source.source_pbf_sha256||p.source_boundary_sha256!==row.source.source_boundary_sha256||p.source_snapshot!==row.source.source_snapshot||keys.length!==expectedKeys.length||keys.some((key,i)=>key!==expectedKeys[i]||p.osmTags[key]!==((row.tags as unknown) as Record<string,string>)[key]))return 'source-generation-or-tags-mismatch';
 if(row.decision!=='declared-paving-ground')return row.decision;
 if(p.displayClip||!['Polygon','MultiPolygon'].includes(feature.geometry.type)||p.osmTags.bridge&&p.osmTags.bridge!=='no'||p.osmTags.tunnel&&p.osmTags.tunnel!=='no'||p.osmTags.layer&&Number(p.osmTags.layer)!==0||p.osmTags.location&&p.osmTags.location!=='surface')return 'structure-or-original-ring-mapping-unproved';
 return 'declared-paving-ground';
}
/** Separate native display mesh. Original green filtering/dispositions stay
 * untouched; it is not a green regional mesh and cannot enter that wire type.
 * Uses the actual shared projection/earcut/strict municipal gate on unchanged
 * original rings. Existing publication bound already counts every kind=green
 * input; renderer constrains green+hard union to the original20k/60k caps. */
export function hardSurfaceDisplayGeometry(features:readonly EnvironmentFeature[],origin:readonly[number,number],viewport:EnvironmentBox,boundary:PreparedSolarBoundary|undefined,remainingVertices:number,remainingIndices:number){
 const positions:number[]=[],indices:number[]=[],seen=new Set<string>();let admitted=0,heldTriangles=0,heldPolygons=0,omitted=0,conflicting=0,structural=0,sourceMismatch=0;
 const maxVertices=Math.max(0,Math.min(ENVIRONMENT_LIMITS.greenVertices,remainingVertices)),maxIndices=Math.max(0,Math.min(ENVIRONMENT_LIMITS.greenIndices,remainingIndices)),projection=createGroundProjection(origin,boundary?.boundarySHA256);
 for(const feature of features){
  const decision=hardSurfaceDisplayDecision(feature);if(decision==='not-reviewed'||seen.has(feature.id))continue;seen.add(feature.id);
  if(decision==='conflicting-landcover-surface'){conflicting++;continue;}if(decision==='wood-or-elevated-structure-unresolved'||decision==='structure-or-original-ring-mapping-unproved'){structural++;continue;}if(decision!=='declared-paving-ground'){sourceMismatch++;continue;}
  if(!boundary||boundary.boundarySHA256!==feature.properties.source_boundary_sha256){heldPolygons++;continue;}
  const polygons:number[][][][]=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  for(const polygon of polygons){
   if(!polygon.length||polygon.some(ring=>ring.length<4||ring.some(p=>p.length<2||!p.every(Number.isFinite))||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])){heldPolygons++;continue;}
   const box:EnvironmentBox=[Infinity,Infinity,-Infinity,-Infinity];for(const p of polygon[0]){box[0]=Math.min(box[0],p[0]);box[1]=Math.min(box[1],p[1]);box[2]=Math.max(box[2],p[0]);box[3]=Math.max(box[3],p[1]);}if(box[0]>viewport[2]||box[2]<viewport[0]||box[1]>viewport[3]||box[3]<viewport[1])continue;
   const vertices=polygon.reduce((n,ring)=>n+ring.length-1,0);if(vertices>ENVIRONMENT_LIMITS.greenVertices||positions.length/7+3>maxVertices||indices.length+3>maxIndices){omitted++;continue;}
   const xy:number[]=[],holes:number[]=[];for(const [ringIndex,ring]of polygon.entries()){if(ringIndex)holes.push(xy.length/2);for(const p of ring.slice(0,-1))xy.push(...projection.local(p));}
   const triangles=earcut(xy,holes,2),error=deviation(xy,holes,2,triangles);if(!triangles.length||!Number.isFinite(error)||error>1e-8){heldPolygons++;continue;}
   const localBox=[Infinity,Infinity,-Infinity,-Infinity];for(let i=0;i<xy.length;i+=2){localBox[0]=Math.min(localBox[0],xy[i]);localBox[1]=Math.min(localBox[1],xy[i+1]);localBox[2]=Math.max(localBox[2],xy[i]);localBox[3]=Math.max(localBox[3],xy[i+1]);}
   const covered=boundary.covers(projection.geographic(localBox)),accepted:number[]=[];
   for(let i=0;i<triangles.length;i+=3){const a=triangles[i],b=triangles[i+1],c=triangles[i+2],triangleBox=[Math.min(xy[a*2],xy[b*2],xy[c*2]),Math.min(xy[a*2+1],xy[b*2+1],xy[c*2+1]),Math.max(xy[a*2],xy[b*2],xy[c*2]),Math.max(xy[a*2+1],xy[b*2+1],xy[c*2+1])];if(covered||boundary.covers(projection.geographic(triangleBox))||coversProjectedGroundTriangle(boundary,projection.geographic,xy[a*2],xy[a*2+1],xy[b*2],xy[b*2+1],xy[c*2],xy[c*2+1]))accepted.push(a,b,c);else heldTriangles++;}
   if(!accepted.length)continue;if(indices.length+accepted.length>maxIndices){omitted++;continue;}const remap=triangles;remap.length=vertices;remap.fill(-1);let referenced=0;for(const i of accepted)if(remap[i]===-1){remap[i]=0;referenced++;}if(positions.length/7+referenced>maxVertices){omitted++;continue;}
   for(let i=0;i<xy.length;i+=2){if(remap[i/2]===-1)continue;remap[i/2]=positions.length/7;positions.push(xy[i],.01,xy[i+1],0,1,0,HARD_SURFACE_DISPLAY_ROLE);}for(const i of accepted)indices.push(remap[i]);admitted++;
  }
 }
 return {positions,indices,admitted,heldTriangles,heldPolygons,omitted,conflicting,structural,sourceMismatch};
}
