import type {ResourceBudgetCost} from './render-runtime/resource-budget';
import {ENVIRONMENT_LIMITS,type EnvironmentFeature} from './environment-scene-data';
import {WOODLAND_DISPLAY_LIMITS} from './environment-woodland-display';
import {ENVIRONMENT_CONSTRUCTION_MODEL} from './environment-resource-budget';

/** Environment publication and fixed renderer storage bounds, computed from
 * actual inputs before the renderer allocates. Logical ledger bytes only. */
type Geometry=EnvironmentFeature['geometry'];
const polygonsOf=(g:Geometry):unknown[]|undefined=>g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'&&Array.isArray(g.coordinates)?g.coordinates:undefined;
const pathsOf=(g:Geometry):unknown[]|undefined=>g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'&&Array.isArray(g.coordinates)?g.coordinates:undefined;
export type EnvironmentPublicationBound=Readonly<{
 vertexBytes:number;indexBytes:number;packedBytes:number;constructionBytes:number;evidenceBytes:number;
 counts:Readonly<{features:number;waterVertices:number;waterIndices:number;greenVertices:number;greenIndices:number;largestPolygonVertices:number;greenFeatures:number;greenPolygons:number;nativeTrees:number;rowFeatures:number;rowVertices:number}>;
}>;
/** Upper bound of one setFeatures publication, computed from the actual input
 * before any construction. Packed bytes are a strict bound: earcut emits at
 * most n+2h-2 triangles for n ring vertices and h holes, lines emit 2(k-1)
 * indices, and the renderer's shared water/green vertex and index caps hold.
 * Construction bytes are an estimate of the transient JS containers. */
export function environmentPublicationBound(features:readonly EnvironmentFeature[],waterAdmitted:ReadonlySet<EnvironmentFeature>|undefined,detail:'full'|'ground',treeCap:number):EnvironmentPublicationBound{
 let waterVertices=0,waterIndices=0,greenVertices=0,greenIndices=0,largest=0,ringCopies=0,greenFeatures=0,greenPolygons=0,nativeTrees=0,rowFeatures=0,rowVertices=0;
 const polygons=(rows:unknown[],water:boolean)=>{
  for(const polygon of rows){
   if(!Array.isArray(polygon))continue;let vertices=0,holes=0;
   for(let ring=0;ring<polygon.length;ring++){const points=polygon[ring];if(!Array.isArray(points))continue;vertices+=Math.max(0,points.length-1);if(ring)holes++;}
   const triangulated=vertices+2*holes;largest=Math.max(largest,triangulated);
   if(water){waterVertices+=vertices;waterIndices+=3*triangulated;ringCopies+=vertices;}else{greenVertices+=vertices;greenIndices+=3*triangulated;greenPolygons++;}
  }
 };
 for(const feature of features){
  const kind=feature.properties.kind,geometry=feature.geometry,rings=polygonsOf(geometry);
  if(kind==='green'){greenFeatures++;if(rings)polygons(rings,false);continue;}
  if(detail!=='full')continue;
  if(kind==='water'){if(rings&&waterAdmitted?.has(feature)===true)polygons(rings,true);continue;}
  const paths=pathsOf(geometry);
  if(kind==='water_line'){if(paths&&waterAdmitted?.has(feature)===true)for(const path of paths)if(Array.isArray(path)){waterVertices+=path.length;waterIndices+=2*Math.max(0,path.length-1);}continue;}
  if(kind==='tree'){if(geometry.type==='Point')nativeTrees++;continue;}
  if(kind==='tree_row'&&paths){rowFeatures++;for(const path of paths)if(Array.isArray(path))rowVertices+=path.length;}
 }
 const L=ENVIRONMENT_LIMITS,M=ENVIRONMENT_CONSTRUCTION_MODEL,slot=M.numberSlotBytes,grow=M.arrayGrowthPeakFactor;
 const waterV=Math.min(L.waterVertices,waterVertices),greenV=Math.min(L.greenVertices,greenVertices),vertices=Math.min(L.waterVertices,waterV+greenV);
 const waterI=Math.min(L.waterIndices,waterIndices),greenI=Math.min(L.greenIndices,greenIndices),indices=Math.min(L.waterIndices,waterI+greenI);
 const vertexBytes=vertices*28,indexBytes=indices*4;
 // wp/green positions, water/green index arrays, the green remap and spread copy.
 const arrays=(7*vertices+7*greenV)*slot*grow+(waterI+greenI+indices)*slot*grow+greenI*slot;
 // One polygon is triangulated at a time: earcut nodes, xy, output and accepted rows.
 const triangulation=largest*(M.earcutNodeBytes+8*slot*grow)+ringCopies*slot;
 const green=greenFeatures*(M.objectBytes+M.setEntryBytes);
 let trees=0,candidates=0;
 if(detail==='full'){
  const rows=rowFeatures?ENVIRONMENT_LIMITS.treeRowCandidateLimit:0,wood=greenPolygons?WOODLAND_DISPLAY_LIMITS.candidates:0;
  candidates=nativeTrees+rows+wood;
  const retained=Math.min(3*treeCap,candidates);
  trees=nativeTrees*(M.setEntryBytes+2*M.gridEntryBytes)+rowFeatures*M.rowSourceBytes+rowVertices*M.rowVertexBytes+rows*(2*M.gridEntryBytes+M.pointArrayBytes)+wood*(M.setEntryBytes+M.gridEntryBytes)+Math.min(WOODLAND_DISPLAY_LIMITS.polygons,greenPolygons)*M.polygonBytes*2+features.length*slot*2+retained*(M.candidateBytes+M.bucketBytes)+Math.min(treeCap,candidates)*slot;
 }
 const evidenceBytes=Math.ceil(Math.min(treeCap,candidates)*(M.evidenceBytes+slot));
 return Object.freeze({vertexBytes,indexBytes,packedBytes:vertexBytes+indexBytes,constructionBytes:Math.ceil(arrays+triangulation+green+trees),evidenceBytes,counts:Object.freeze({features:features.length,waterVertices,waterIndices,greenVertices,greenIndices,largestPolygonVertices:largest,greenFeatures,greenPolygons,nativeTrees,rowFeatures,rowVertices})});
}
/** Manager-side publication input slots that may point at ONE decoded leaf's
 * features while a refresh holds it: the flatMap array and the ground filter
 * array (8-byte slots, push growth) plus one admitted-water Set entry. The
 * manager charges this with the decoded leaf, from the descriptor's feature
 * count before the read and the parsed count after it, so building a
 * publication input never needs a separate claim that a refused publication
 * would have to release (a release that would wake every waiter for nothing).
 * It stays charged while the leaf is warm: a bounded, conservative overcharge. */
export function environmentLeafReferenceBytes(featureCount:number):number{
 const M=ENVIRONMENT_CONSTRUCTION_MODEL,count=Number.isSafeInteger(featureCount)&&featureCount>0?featureCount:0;
 return Math.ceil(count*(2*M.numberSlotBytes*M.arrayGrowthPeakFactor+M.setEntryBytes));
}
/** Fixed per-renderer CPU storage, sized from treeCap before allocation. */
export function environmentRendererFixedCosts(treeCap:number):ResourceBudgetCost[]{
 if(!Number.isSafeInteger(treeCap)||treeCap<1)throw new RangeError('Invalid environment tree capacity');
 return[
  {category:'packed',bytes:treeCap*3*4*2,precision:'exact',identity:{},label:'environment tree instance and surface LOD staging'},
  // Solar-shadow instances, masks, per-tree bounds, union/box scratch.
  {category:'construction',bytes:treeCap*3*4+treeCap*2+treeCap*4*8+8*8,precision:'exact',identity:{},label:'environment tree solar-shadow scratch'},
  // View inverse cache, LOD matrix and far flags.
  {category:'construction',bytes:16*8+16*8+treeCap,precision:'exact',identity:{},label:'environment view and tree LOD state'},
  {category:'metadata',bytes:treeCap*ENVIRONMENT_CONSTRUCTION_MODEL.setEntryBytes,precision:'estimate',identity:{},label:'environment tree LOD membership map'},
 ];
}
