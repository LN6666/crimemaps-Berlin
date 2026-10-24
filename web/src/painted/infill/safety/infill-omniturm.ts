import type {BuildingComponent,Identity} from './building-mesh-renderer';
import type {OwnerReconstructionStats} from './owner-f032-reconstruction';
import {nativePaintSignature} from './progressive-native-signature';
import {OMNITURM_DATA as M,OMNITURM_SHA} from './infill-omniturm-data';
export const infillOmniturmIdentity=(c:Identity&{city?:string})=>c.city==='frankfurt'&&c.objectId===M.identity.objectId&&c.partId===M.identity.partId;
export function infillOmniturmReconstruction(components:BuildingComponent[]){
 const stats:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 const targets=components.filter(infillOmniturmIdentity);if(!targets.length)return{components,stats};
 if(targets.length===1&&(targets[0].displayEstimates?.infillOmniturm050 as any)?.patchSHA===OMNITURM_SHA)return{components,stats};
 const c=targets[0];if(targets.length!==1||nativePaintSignature(c)!==M.identity.signature||JSON.stringify(c.origin)!==JSON.stringify(M.sourceOrigin)||JSON.stringify(c.sourceFeature)!==JSON.stringify(M.sourceFeature)||JSON.stringify(c.componentGeometry)!==JSON.stringify(M.componentGeometry)){stats.error='Omniturm exact unique real SOURCE required';return{components,stats};}
 const b=M.display;const batch={...b,positions:[...b.positions],normals:[...b.normals],indices:[...b.indices],color:[...b.color],paint:[...b.paint],frames:[...b.frames]};
 const display={...c,batches:[batch],displayEstimates:{...c.displayEstimates,infillOmniturm050:{patchSHA:OMNITURM_SHA,sourceRetained:true,officialTop:true,ownerSideProfile:true,secondAxisUnknown:true,completeSilhouetteAccepted:false,approximateVisualOnly:true}}};
 stats.objects=1;stats.vertices=b.positions.length/3;stats.triangles=b.indices.length/3;stats.originalVertices=c.batches.reduce((n,b)=>n+b.positions.length/3,0);stats.components.push({objectId:c.objectId,partId:c.partId,sourcePartId:c.partId,patchSHA256:OMNITURM_SHA,vertices:stats.vertices,triangles:stats.triangles,geometryRole:'official-top-plus-owner-side-traced-offsets-second-axis-unverified'});
 return{components:components.map(x=>x===c?display:x),stats};
}
export function infillOmniturmBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 let offset=0,objects=0,vertices=0;
 for(const c of components){
  const match=infillOmniturmIdentity(c)&&!!c.displayEstimates?.infillOmniturm050;
  for(const b of c.batches){
   const n=b.positions.length/3;
   if(match){
    const ownedPaint=Array.from((b as any).paint as ArrayLike<number>),ownedFrames=Array.from((b as any).frames as ArrayLike<number>);
    // The sealed payload placed semantic family IDs in the red slot. Bind
    // those families to frame metadata while retaining the display base RGB.
    for(let j=0;j<n;j++){
     ownedPaint[j*4]=b.color[0];ownedPaint[j*4+1]=b.color[1];ownedPaint[j*4+2]=b.color[2];
     ownedFrames[j*5+4]=Math.abs(b.normals[j*3+1])>.4?45051:45050;
    }
    paint.set(ownedPaint,offset*4);frames.set(ownedFrames,offset*5);vertices+=n;objects++;
   }
   offset+=n;
  }
 }
 return{objects,vertices,actualVisualAccepted:false};
}
