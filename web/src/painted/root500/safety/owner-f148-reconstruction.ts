import type {BuildingComponent,Identity,MeshBatch} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
export const ownerF148Identity=(c:Identity)=>c.objectId==='osm/way/23901923'&&c.partId==='osm/way/23901923/component/9f7e45e31c96a4a9923f';
// Photo-estimated silhouette only; no claim of measured dimensions or equipment function.
export const F148_ROOF_ESTIMATES=[{x0:-53.8,x1:-40.2,z0:-8.86,z1:8.86,y0:54,y1:56.6,role:'west-solid-core-crown'},{x0:40.2,x1:53.8,z0:-8.86,z1:8.86,y0:54,y1:56.6,role:'east-solid-core-crown'},{x0:-24,x1:24,z0:-8.86,z1:8.86,y0:54,y1:55.4,role:'central-low-solid-cap'}];
export const F148_RECONSTRUCTION_SHA='a5a67e4345b683351e1e2e7d333a3c4964b112ac90b84eedc0fc96fd3903e33a';
function roofBatches():MeshBatch[]{return F148_ROOF_ESTIMATES.map(box=>{const b:MeshBatch={positions:[],normals:[],indices:[],color:[.70,.70,.66],faceRole:'mixed',materialName:'F148-photo-estimated-solid-roof-relief'};
 const p=b.positions as number[],n=b.normals as number[],ix=b.indices as number[];
 const quad=(v:number[][],normal:number[])=>{const i=p.length/3;for(const q of v){p.push(...q);n.push(...normal);}ix.push(i,i+1,i+2,i,i+2,i+3);};
 const {x0,x1,z0,z1,y0,y1}=box;
 quad([[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]],[0,0,-1]);
 quad([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],[1,0,0]);
 quad([[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1]],[0,0,1]);
 quad([[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],[-1,0,0]);
 quad([[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]],[0,1,0]);return b;});}
export function ownerF148Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city!=='frankfurt'||!ownerF148Identity(c))return c;
  if(c.origin[0]!==8.6598241||c.origin[1]!==50.1339987||nativePaintSignature(c)!=='a192fdd2'){stats.error='Original F148 source changed; roof relief withheld';return c;}
  const batches=[...c.batches,...roofBatches()],vertices=batches.reduce((n,b)=>n+b.positions.length/3,0),triangles=batches.reduce((n,b)=>n+b.indices.length/3,0);
  stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=40;
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F148_RECONSTRUCTION_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
  return {...c,batches,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,originalHeightM:54,displayHeightM:56.6,originalBatchCount:c.batches.length,dimensions:'Roof relief photo-estimated; original slab unchanged; no equipment function inferred',actualVisualAccepted:false}}};
 });return{components:drawable,stats};
}
// Call after the ordinary F148 native materials, or use this alone for both original and added batches.
export function ownerF148BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0;
 for(const c of components)for(const [bi,b]of c.batches.entries()){
  const count=b.positions.length/3;
  if(c.city==='frankfurt'&&ownerF148Identity(c)&&(c.displayEstimates?.ownerAuthorizedReconstruction as {originalBatchCount?:number}|undefined)?.originalBatchCount===2){
   for(let v=0;v<count;v++){
    const i=v*3,x=b.positions[i],y=b.positions[i+1],z=b.positions[i+2],nx=b.normals[i],ny=b.normals[i+1],nz=b.normals[i+2];
    const added=bi>=2,kind=added?5:ny>.9?0:Math.abs(nz)>.9?(nz>0?1:2):(nx<0?3:4);
    paint.set(bi===0?[.48,.49,.46,2]:[.70,.70,.66,2],(offset+v)*4);
    frames.set(added?[0,0,217.7,5,6202]:[kind===3||kind===4?z:x,kind===0?z:y,kind===3||kind===4?17.72:217.7,kind,6202],(offset+v)*5);
   }
  }offset+=count;
 }
}
