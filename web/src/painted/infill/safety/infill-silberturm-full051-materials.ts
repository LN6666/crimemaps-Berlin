import type {BuildingComponent} from './building-mesh-renderer';
import {SILBERTURM_DISPLAY_050} from './infill-silberturm-full051-data';
const same=(a:ArrayLike<number>,b:number[])=>a.length===b.length&&b.every((v,i)=>Object.is(a[i],v));
/** Only the complete, exact four-source crown-repaired DISPLAY is eligible. */
export function silberturmSpecificMaterials050(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 const expected=SILBERTURM_DISPLAY_050 as any[];
 const matches=components.filter(c=>c.city==='frankfurt'&&expected.some(r=>r.objectId===c.objectId&&r.partId===c.partId));
 const eligible=expected.every(r=>{const cs=matches.filter(c=>c.objectId===r.objectId&&c.partId===r.partId);if(cs.length!==1)return false;const c=cs[0];return !!c.displayEstimates?.infillSilberturm&&same(c.origin,r.origin)&&c.batches.length===r.batches.length&&c.batches.every((b,i)=>same(b.positions,r.batches[i].positions)&&same(b.normals,r.batches[i].normals)&&same(b.indices,r.batches[i].indices));});
 if(!eligible)return{objects:0,vertices:0,reason:'complete exact crown-repaired group required',actualVisualAccepted:false};
 let offset=0,vertices=0;
 for(const c of components){const k=expected.findIndex(r=>r.objectId===c.objectId&&r.partId===c.partId&&c.city==='frankfurt');
  for(const [bi,b]of c.batches.entries()){
   const n=b.positions.length/3;
   if(k>=0){let u=0;for(let j=0;j<n;j++){
    const x=b.positions[j*3],y=b.positions[j*3+1],z=b.positions[j*3+2];let along=u;
    if(bi===1){const q=Math.floor(j/4)*4;const x0=b.positions[q*3],z0=b.positions[q*3+2];along=u+Math.hypot(x-x0,z-z0);if(j%4===3){const x1=b.positions[(q+1)*3],z1=b.positions[(q+1)*3+2];u+=Math.hypot(x1-x0,z1-z0);}}
    if(k===0&&bi===1)along=expected[k].batches[bi].uv[j];
    const family=bi===0?30413:k===0?30410:k===2?30411:k===3?30412:30410;
    paint.set(bi===0?[.60,.62,.63,2]:[.74,.76,.77,2],(offset+j)*4);
    frames.set([along,y,x,z,family],(offset+j)*5);vertices++;
   }}offset+=n;
  }
 }
 return{objects:4,vertices,actualVisualAccepted:false,dimensionsPhotoApproximate:true};
}
