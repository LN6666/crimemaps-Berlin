import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {F135_GARDEN_BATCHES,F135_GARDEN_FRAMES} from './owner-f135-garden-data';
export const ownerF135GardenIdentity=(c:Identity)=>c.objectId==='osm/way/232461876'&&c.partId==='osm/way/232461876/component/81f7486b51fa0e51c16d';
export const F135_GARDEN_SHA='ab953b932388369bd07253d0d4a5dc3d89aabd275970e6304dd40c0b74a91a43';
export function ownerF135GardenReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{if(c.city!=='frankfurt'||!ownerF135GardenIdentity(c))return c;if(nativePaintSignature(c)!=='43d743b1'){stats.error='Original Garden source changed; correction withheld';return c;}
 const triangles=F135_GARDEN_BATCHES.reduce((n,b)=>n+b.indices.length/3,0);stats.objects++;stats.vertices+=110;stats.originalVertices+=110;stats.triangles+=triangles;stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F135_GARDEN_SHA,vertices:110,triangles,geometryRole:'owner-authorized-reconstruction'});
 return {...c,batches:F135_GARDEN_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,sourceArraysRetained:true,originalHeightM:7.5,displayHeightM:15.5,dimensions:'Photo-estimated relative height; not surveyed',existingWindowLayoutPreserved:true,actualVisualAccepted:false}}};});return{components:drawable,stats};
}
export function ownerF135GardenMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0;for(const c of components)for(const [bi,b]of c.batches.entries()){const count=b.positions.length/3;if(c.city==='frankfurt'&&ownerF135GardenIdentity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){for(let j=0;j<count;j++)paint.set([...b.color,2],(offset+j)*4);frames.set(F135_GARDEN_FRAMES[bi],offset*5);}offset+=count;}}
