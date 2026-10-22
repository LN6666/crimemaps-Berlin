import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {F135_BATCHES as F135_OLD_BATCHES,F135_FRAME_ROWS as F135_OLD_FRAMES} from './owner-f135-data';
import {F135_COMPLETION_BATCHES,F135_COMPLETION_FRAMES,F135_COMPLETION_SHA,ownerF135WestCompletionIdentity,reconstructF135WestCompletion,applyF135WestCompletionMaterials} from './owner-f135-completion';
export {ownerF135WestCompletionIdentity};
const F135_BATCHES=[...F135_OLD_BATCHES,...F135_COMPLETION_BATCHES],F135_FRAME_ROWS=[...F135_OLD_FRAMES,...F135_COMPLETION_FRAMES];
export const ownerF135Identity=(c:Identity)=>c.objectId==='osm/way/794404905'&&c.partId==='osm/way/794404905/component/9cb52822b1a971cc298e';
export const F135_RECONSTRUCTION_SHA=F135_COMPLETION_SHA;
export function ownerF135Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{
  if(c.city==='frankfurt'&&ownerF135WestCompletionIdentity(c))return reconstructF135WestCompletion(c,stats);
  if(c.city!=='frankfurt'||!ownerF135Identity(c))return c;
  if(nativePaintSignature(c)!=='15a8e777'){stats.error='Original F135 signature changed; reconstruction withheld';return c;}
  const vertices=F135_BATCHES.reduce((n,b)=>n+b.positions.length/3,0),triangles=F135_BATCHES.reduce((n,b)=>n+b.indices.length/3,0);
  stats.objects++;stats.vertices+=vertices;stats.triangles+=triangles;stats.originalVertices+=c.batches.reduce((n,b)=>n+b.positions.length/3,0);
  stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F135_RECONSTRUCTION_SHA,vertices,triangles,geometryRole:'owner-authorized-reconstruction'});
  return {...c,batches:F135_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{selectedObjectId:'osm/node/144346893',sourceFootprintRetained:true,dimensions:'photo-estimated, not surveyed',originalHeightM:7.5,actualVisualAccepted:false}}};
 });return{components:drawable,stats};
}
export function ownerF135BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let offset=0;
 for(const c of components)for(const [bi,b]of c.batches.entries()){
  const count=b.positions.length/3;
  if(c.city==='frankfurt'&&ownerF135Identity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){
   if(F135_FRAME_ROWS[bi].length!==count*5)throw Error('F135 frame length mismatch');
   for(let v=0;v<count;v++)paint.set([...b.color,2],(offset+v)*4);
   frames.set(F135_FRAME_ROWS[bi],offset*5);
  }offset+=count;
 }
}

// Source-preserving paint only for the museum's native Peichl west wing.
export function ownerF135WestMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 applyF135WestCompletionMaterials(components,paint,frames);
 let offset=0;
 for(const c of components){
  const eligible=c.city==='frankfurt'&&c.objectId==='osm/way/35322719'&&c.partId==='osm/way/35322719/component/b8bc22d879d26164d91c'&&nativePaintSignature(c)==='55280882';
  for(const b of c.batches){const count=b.positions.length/3;
   if(eligible)for(let i=0;i<count;i++){
    const x=b.positions[i*3],y=b.positions[i*3+1],z=b.positions[i*3+2],nx=b.normals[i*3],ny=b.normals[i*3+1],nz=b.normals[i*3+2];
    const u=.804*x+.595*z,v=-.595*x+.804*z;
    const roof=ny>.9,garden=nx*.804+nz*.595>.96;
    paint.set(roof?[.48,.51,.50,2]:[.81,.80,.73,2],(offset+i)*4);
    frames.set(roof?[u,v,60,12,4779]:[v,y,60,garden?11:10,4779],(offset+i)*5);
   }offset+=count;
  }
 }
}
