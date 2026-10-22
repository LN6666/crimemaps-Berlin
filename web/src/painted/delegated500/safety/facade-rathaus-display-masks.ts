import type {BuildingComponent} from './building-mesh-renderer';

/** A render-only ownership mask on an original flat wall. No source geometry or
 * membership is changed. The caller may discard covered proxy fragments while
 * drawing the preferred original part, and must apply the same predicate to picks.
 * This isolated draft is not installed in the renderer. */
export type RathausWallFragmentMask={
 outline:{objectId:string;partId:string;batch:number;ring:number;edge:number};
 preferred:{objectId:string;partId:string;batch:number;ring:number;edge:number};
 normal:[number,number];planeDistance:number;u:[number,number];y:[number,number];
 maximumCoincidentPlaneErrorM:number;
};
type Rect={component:BuildingComponent;batch:number;ring:number;edge:number;
 normal:[number,number];a:[number,number];b:[number,number];y:[number,number]};
const PREFERRED_FLAT_IDS=new Set(['219431689','223907239','223907241','223907242','223907278','223907281','223907284']);
const circumference=(lat:number)=>40075016.686*Math.cos(lat*Math.PI/180);
const north=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI);

function originalFlatWallRectangles(c:BuildingComponent,origin:[number,number]):Rect[]{
 const precision=c.displayEstimates?.meshPrecision as {metric_rounding_m?:number}|undefined;
 if(precision?.metric_rounding_m!==.001||c.batches.length!==2)return [];
 const roof=c.batches[0],wall=c.batches[1],rings=c.componentGeometry.coordinates;
 const count=rings.reduce((n,r)=>n+r.length-1,0);
 if(Math.abs(roof.normals[1]-1)>.001||wall.positions.length!==count*12||wall.indices.length!==count*6)return [];
 // Admission is tied to the codec's existing four-vertex/six-index wall layout.
 for(let e=0;e<count;e++)for(let k=0;k<6;k++){
  const offsets=[0,1,2,0,2,3];
  if(wall.indices[e*6+k]!==e*4+offsets[k])return [];
 }
 const C=circumference(origin[1]),ratio=C/circumference(c.origin[1]);
 const dx=(c.origin[0]-origin[0])*C/360,dz=(north(c.origin[1])-north(origin[1]))*C;
 const xz=(j:number):[number,number]=>[dx+wall.positions[j]*ratio,dz+wall.positions[j+2]*ratio];
 const out:Rect[]=[];let offset=0;
 rings.forEach((ring,ri)=>{
  for(let edge=0;edge<ring.length-1;edge++){
   const j=(offset+edge)*12,nx=wall.normals[j],nz=wall.normals[j+2];
   if(Math.abs(wall.normals[j+1])>.001)continue;
   const ys=[0,1,2,3].map(k=>wall.positions[j+k*3+1]*ratio);
   out.push({component:c,batch:1,ring:ri,edge,normal:[nx,nz],a:xz(j),b:xz(j+3),y:[Math.min(...ys),Math.max(...ys)]});
  }offset+=ring.length-1;
 });
 return out;
}

export function rathausCoincidentWallFragmentMasks(components:readonly BuildingComponent[]){
 const outline=components.find(c=>c.city==='munich'&&c.objectId==='osm/relation/147095'&&c.partId==='osm/relation/147095/component/5e6b070df42914207582');
 if(!outline)return {origin:undefined,masks:[] as RathausWallFragmentMask[],sourceParentClaim:false as const};
 const proxy=originalFlatWallRectangles(outline,outline.origin);
 const parts=components.filter(c=>c.city==='munich'&&PREFERRED_FLAT_IDS.has(c.objectId.split('/').at(-1)!)&&c.sourceFeature.properties?.['building:part']==='yes');
 const preferred=parts.flatMap(c=>originalFlatWallRectangles(c,outline.origin));
 const masks:RathausWallFragmentMask[]=[];
 for(const low of proxy)for(const high of preferred){
  const [nx,nz]=low.normal;
  if(Math.hypot(nx-high.normal[0],nz-high.normal[1])>.001)continue;
  const distance=nx*low.a[0]+nz*low.a[1];
  const error=Math.max(Math.abs(nx*high.a[0]+nz*high.a[1]-distance),Math.abs(nx*high.b[0]+nz*high.b[1]-distance));
  // 15mm is the declared source packing/Float32 tolerance, not a geometry offset.
  if(error>.015)continue;
  const project=(p:[number,number])=>-nz*p[0]+nx*p[1];
  const lu=[project(low.a),project(low.b)].sort((a,b)=>a-b),hu=[project(high.a),project(high.b)].sort((a,b)=>a-b);
  const u:[number,number]=[Math.max(lu[0],hu[0]),Math.min(lu[1],hu[1])];
  const y:[number,number]=[Math.max(low.y[0],high.y[0]),Math.min(low.y[1],high.y[1])];
  if(u[1]-u[0]<.1||y[1]-y[0]<.1)continue;
  masks.push({outline:{objectId:outline.objectId,partId:outline.partId,batch:low.batch,ring:low.ring,edge:low.edge},
   preferred:{objectId:high.component.objectId,partId:high.component.partId,batch:high.batch,ring:high.ring,edge:high.edge},
   normal:[nx,nz],planeDistance:distance,u,y,maximumCoincidentPlaneErrorM:error});
 }
 return {origin:[...outline.origin] as [number,number],masks,sourceParentClaim:false as const};
}

/** The same predicate is usable by a fragment-discard path and native surface picking.
 * Coordinates are original display metres expressed in the returned outline origin. */
export function rathausProxyFragmentCovered(mask:RathausWallFragmentMask,x:number,y:number,z:number){
 const [nx,nz]=mask.normal,u=-nz*x+nx*z;
 return Math.abs(nx*x+nz*z-mask.planeDistance)<=.015&&u>=mask.u[0]&&u<=mask.u[1]&&y>=mask.y[0]&&y<=mask.y[1];
}
