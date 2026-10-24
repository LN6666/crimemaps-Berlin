import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {commerzbankParentDisplayPlan} from './commerzbank-parent-display';
import {nativePaintSignature} from './progressive-native-signature';
import {COMMERZBANK_PARENT_DISPLAY_SHA as SHA} from './commerzbank-parent-display-sha';

const PARENT='osm/way/183060777',PART=PARENT+'/component/832d07621aab6676b355';
type Owned={source:BuildingComponent;paint:Float32Array;frames:Float32Array;signature:string};
const owned=new WeakMap<BuildingComponent,Owned>(),cache=new WeakMap<BuildingComponent,BuildingComponent>();
export const commerzbankParent053Identity=(c:Identity&{city?:string})=>(c.city===undefined||c.city==='frankfurt')&&c.objectId===PARENT&&c.partId===PART;
export const commerzbankParent053OriginalSource=(c:BuildingComponent)=>owned.get(c)?.source;
const mode=(edge:number)=>edge>=3&&edge<=11?1:edge>=27&&edge<=35?2:edge>=48&&edge<=53?3:0;
const retained=(m:number):readonly (readonly [number,number,number])[]=>m===1?[[70,80,5306],[110,120,5306],[150,160,5306]]:m===2?[[60,70,5306],[100,110,5306]]:m===3?[[0,50,5307],[80,90,5306],[120,130,5306]]:[];
/** Exact SOURCE-bound DISPLAY clipping, not a modified native source or new admission.
 * Parent duplicates, the coarse259m roof and above-side-top envelope have no DISPLAY triangles.
 * Existing child tops/core/office parts are retained as their original objects and buffers. */
export function commerzbankParent053Reconstruction(components:BuildingComponent[],ctx?:{leafSHA:(c:BuildingComponent)=>string|undefined}){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const targets=components.filter(commerzbankParent053Identity);if(!targets.length)return {components,stats};
 const recovered=components.map(c=>owned.get(c)?.source??c);
 const gate=commerzbankParentDisplayPlan(recovered,{city:'frankfurt',leafSHA:ctx?.leafSHA});
 if(!gate.diagnostic.active){stats.error='Commerzbank053 exact23 original SOURCE required: '+gate.diagnostic.reason;return {components:recovered,stats};}
 const source=gate.hiddenOutlines[0],prior=cache.get(source);
 if(prior&&owned.get(prior)?.signature===nativePaintSignature(prior)){stats.objects=1;stats.vertices=prior.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.triangles=prior.batches.reduce((n,b)=>n+b.indices.length/3,0);stats.originalVertices=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'exact-native-parent-bounded-glass-skin-intervals-original-children-retained'});return {components:components.map(c=>commerzbankParent053Identity(c)?prior:c),stats};}
 const positions:number[]=[],normals:number[]=[],indices:number[]=[],paint:number[]=[],frames:number[]=[];
 const wall=source.batches[1],arcs=new Map<number,number>();let gardenQuads=0,unresolvedQuads=0;
 for(let edge=0;edge<62;edge++){
  const m=mode(edge);if(!m)continue;
  const j=edge*4,ax=wall.positions[j*3],az=wall.positions[j*3+2],bx=wall.positions[(j+1)*3],bz=wall.positions[(j+1)*3+2],width=Math.hypot(bx-ax,bz-az),arc=arcs.get(m)??0;
  for(const [lo,hi,marker]of retained(m)){
   const first=positions.length/3;positions.push(ax,lo,az,bx,lo,bz,bx,hi,bz,ax,hi,az);indices.push(first,first+1,first+2,first,first+2,first+3);
   const color=marker===5306?[.25,.40,.46]:[.73,.76,.76];
   for(let k=0;k<4;k++){normals.push(wall.normals[(j+k)*3],wall.normals[(j+k)*3+1],wall.normals[(j+k)*3+2]);paint.push(...color,2);frames.push(arc+(k===1||k===2?width:0),k<2?lo:hi,hi,marker,11379);}
   marker===5306?gardenQuads++:unresolvedQuads++;
  }
  arcs.set(m,arc+width);
 }
 const batch:MeshBatch={positions:new Float32Array(positions),normals:new Float32Array(normals),indices:new Uint32Array(indices),color:[.25,.40,.46],faceRole:'wall'};
 const clone:BuildingComponent={...source,batches:[batch],displayEstimates:{...source.displayEstimates,commerzbankParent053:{patchSHA:SHA,sourceRetained:true,sourceGeometryAltered:false,geometryRole:'exact-native-parent-bounded-glass-skin-intervals',originalVertices:310,originalTriangles:184,gardenQuads,unresolvedLowerQuads:unresolvedQuads,unresolvedLowerNE:'0..50m retained original silver; not visually accepted',topRole:'existing native child roofs/cores/antenna retained; full259m envelope roof omitted',actualVisualAccepted:false}}};
 owned.set(clone,{source,paint:new Float32Array(paint),frames:new Float32Array(frames),signature:nativePaintSignature(clone)});cache.set(source,clone);
 stats.objects=1;stats.vertices=positions.length/3;stats.triangles=indices.length/3;stats.originalVertices=source.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:source.objectId,partId:source.partId,sourcePartId:source.partId,patchSHA256:SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'exact-native-parent-bounded-glass-skin-intervals-original-children-retained'});
 return {components:components.map(c=>commerzbankParent053Identity(c)?clone:c),stats};
}
/** Rebind only privately owned exact DISPLAY geometry. No progressiveAdmission of derived arrays. */
export function commerzbankParent053BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let at=0,objects=0,vertices=0;
 for(const c of components){const n=c.batches.reduce((s,b)=>s+b.positions.length/3,0),record=owned.get(c);
  if(record){if(nativePaintSignature(c)!==record.signature||record.paint.length!==n*4||record.frames.length!==n*5)throw Error('Commerzbank053 owned DISPLAY arrays changed');if((at+n)*4>paint.length||(at+n)*5>frames.length)throw Error('Commerzbank053 material buffer too short');paint.set(record.paint,at*4);frames.set(record.frames,at*5);objects++;vertices+=n;}
  at+=n;
 }
 return {objects,vertices,sourceRetained:true,actualVisualAccepted:false};
}
