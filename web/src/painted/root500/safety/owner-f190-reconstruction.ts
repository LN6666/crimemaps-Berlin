import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {F190_BATCHES,F190_FRAME_ROWS} from './owner-f190-data';
export const ownerF190Identity=(c:Identity)=>c.objectId==='osm/way/107760990'&&c.partId==='osm/way/107760990/component/b8a5b39679652dae93ff';
export const F190_RECONSTRUCTION_SHA='4c6688c43cb2ce83ac9889cb68d221361bd93385060b8544198d3b514f4ad57b';
export function ownerF190Reconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const drawable=components.map(c=>{if(c.city!=='stuttgart'||!ownerF190Identity(c))return c;
 if(nativePaintSignature(c)!=='a448a03d'){stats.error='Original F190 signature changed; reconstruction withheld';return c;}
 stats.objects++;stats.vertices+=180;stats.triangles+=98;stats.originalVertices+=100;
 stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:F190_RECONSTRUCTION_SHA,vertices:180,triangles:98,geometryRole:'owner-authorized-reconstruction'});
 return {...c,batches:F190_BATCHES,displayEstimates:{...c.displayEstimates,ownerAuthorizedReconstruction:{sourceFootprintRetained:true,originalHeightM:22.5,displayHeightM:40,dimensions:'Published nominal cube height40m; perimeter railing rises photo-estimated0.95m above roof; not surveyed',actualVisualAccepted:false}}};});return{components:drawable,stats};
}
export function ownerF190BaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){let offset=0;for(const c of components)for(const [bi,b]of c.batches.entries()){const count=b.positions.length/3;if(c.city==='stuttgart'&&ownerF190Identity(c)&&c.displayEstimates?.ownerAuthorizedReconstruction){if(F190_FRAME_ROWS[bi].length!==count*5)throw Error('F190 frames mismatch');for(let i=0;i<count;i++)paint.set(bi===0?[.63,.65,.62,2]:[.71,.72,.69,2],(offset+i)*4);frames.set(F190_FRAME_ROWS[bi],offset*5);}offset+=count;}}
