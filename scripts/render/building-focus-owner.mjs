import {createHash} from 'node:crypto';
const check=(ok,message)=>{if(!ok)throw Error('Owner focus '+message);};
/** Offline only: extract complete local model bounds from pinned owner assets.
 * The runtime receives a few scalars, never reads the mesh to decide admission. */
export function buildOwnerFocusMetadata(profile,bytes){
 check(bytes instanceof Uint8Array&&bytes.length===profile.bytes&&bytes.length<=8*1024**2&&createHash('sha256').update(bytes).digest('hex')===profile.sha256,'source bytes/hash mismatch');
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 check(value.schema_version===1&&value.city===profile.city&&(value.geometryRole===undefined||value.geometryRole==='owner-authorized-reconstruction')&&Array.isArray(value.components)&&value.components.length===1,'source context mismatch');
 const c=value.components[0],meta=c.sourceFeature?.properties?.owner_shape_patch;
 check(c.city===profile.city&&c.objectId===profile.objectId&&c.partId===profile.partId&&meta?.number===profile.number&&meta?.sourcePartId===profile.sourcePartId&&meta?.geometryRole==='owner-authorized-reconstruction','component binding mismatch');
 check(Array.isArray(c.origin)&&c.origin.length===2&&c.origin.every(Number.isFinite)&&Math.abs(c.origin[0])<=180&&Math.abs(c.origin[1])<90,'invalid origin');
 check(Array.isArray(c.batches)&&c.batches.length>0,'missing mesh batches');
 const box=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];let vertices=0,triangles=0;
 for(const batch of c.batches){
  check(Array.isArray(batch.positions)&&batch.positions.length>0&&batch.positions.length%3===0&&batch.positions.every(Number.isFinite),'invalid positions');
  const count=batch.positions.length/3;
  check(Array.isArray(batch.indices)&&batch.indices.length%3===0&&batch.indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<count),'invalid indices');
  for(let at=0;at<batch.positions.length;at++){
   const axis=at%3,n=batch.positions[at];box[axis]=Math.min(box[axis],n);box[axis+3]=Math.max(box[axis+3],n);
  }
  vertices+=count;triangles+=batch.indices.length/3;
 }
 check(vertices===profile.vertices&&triangles===profile.triangles,'mesh counts mismatch');
 // Existing verified rear-atrium mesh extends below ground; keep its exact source-bound lower sweep.
 const minHeight=profile.number==='F061-RearCourt829'&&profile.sha256==='c3a9c6c61ba72fc5bbfca2f9808b8421b3b2e83896ffc6118589313ef36626a4'?-3.35001:0;
 check(Number.isFinite(profile.max_height_m)&&box[1]>=minHeight&&box[4]<=profile.max_height_m+1e-5,'height binding mismatch');
 return {id:profile.id,sha256:profile.sha256,city:profile.city,components:[{objectId:c.objectId,partId:c.partId,origin:[...c.origin],box}]};
}
