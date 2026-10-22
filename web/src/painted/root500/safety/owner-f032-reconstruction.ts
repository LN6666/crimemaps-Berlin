import {F032_RECONSTRUCTION_FRAMES} from './owner-f032-frame-data';
import type {BuildingComponent,Identity} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
import {F032_RECONSTRUCTION_BATCHES} from './owner-f032-reconstruction-data';

// Owner authorization: scope/owner-full500-priority-and-reconstruction-authorization.json.
// Original source arrays remain in sourceLoaded; only this exact drawable is replaced.
export const ownerF032Identity=(c:Identity)=>c.objectId==='osm/way/43000923'&&c.partId==='osm/way/43000923/component/0cd335c1c1044c09c23d';
export const F032_RECONSTRUCTION_SHA='1013d75e1b05e8ac9776ab9b56022b81fc66a89703a91bf4b2ac69ae059e3d27';
export type OwnerReconstructionStats={objects:number;vertices:number;triangles:number;originalVertices:number;sourceRetained:true;actualVisualAccepted:false;components:{objectId:string;partId:string;sourcePartId:string;patchSHA256:string;vertices:number;triangles:number;geometryRole:string}[];error?:string};
export function ownerF032Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city!=='berlin'||!ownerF032Identity(c))return c;
  if(nativePaintSignature(c)!=='20976902'){stats.error='Original F032 signature changed; reconstruction withheld';return c;}
  stats.objects++;stats.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  stats.vertices=F032_RECONSTRUCTION_BATCHES.reduce((n,b)=>n+b.positions.length/3,0);
  stats.triangles=F032_RECONSTRUCTION_BATCHES.reduce((n,b)=>n+b.indices.length/3,0);
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F032_RECONSTRUCTION_SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'owner-authorized-reconstruction'});
  return {...c,batches:F032_RECONSTRUCTION_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceBuildingId:'DEBE01YYK0000047',officialModelMaxHeightM:29.457,officialDatumShiftM:.002,restoredTowerMaxHeightM:65,upperTowerDimensions:'photo-approximate, not surveyed',actualVisualAccepted:false}}};
 });
 return {components:drawable,stats};
}
export function ownerF032BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let offset=0;
 for(const c of components)for(const [bi,batch] of c.batches.entries()){
  if(c.city==='berlin'&&ownerF032Identity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){
   for(let v=0;v<batch.positions.length/3;v++){
    paint.set([...batch.color,2],(offset+v)*4);
    frames.fill(0,(offset+v)*5,(offset+v+1)*5);
   }
   for(const f of F032_RECONSTRUCTION_FRAMES){if(f.batchIndex!==bi)continue;for(let v=f.firstVertex;v<f.firstVertex+f.vertexCount;v++){const u=f.uAxis.reduce((n,a,j)=>n+a*batch.positions[v*3+j],0)-f.uOrigin;frames.set([u,batch.positions[v*3+1],f.height,f.width,f.family],(offset+v)*5);}}
  }
  offset+=batch.positions.length/3;
 }
}
