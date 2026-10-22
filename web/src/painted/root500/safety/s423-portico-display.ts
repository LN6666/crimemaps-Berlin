import {S423_PORTICO_EXPECTED as E} from './s423-portico-display-constants';
export type S423PorticoAttestation={sourceLeafSHA256:string;roleRecord:string};
/** Exact sidecar only. Caller must consistently filter drawable/pick/bounds; retain all source arrays. */
export async function prepareS423PorticoDisplay(c:any,a:S423PorticoAttestation){
 if(c?.city!==E.city||c.objectId!==E.objectId||c.partId!==E.partId||c.batches?.length!==2||a.sourceLeafSHA256!==E.sourceLeafSHA256)return null;
 const enc=new TextEncoder(),sha=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),(x:number)=>x.toString(16).padStart(2,'0')).join('');
 if(await sha(enc.encode(a.roleRecord))!==E.roleRecordSHA256)return null;
 let role;try{role=JSON.parse(a.roleRecord)}catch{return null}
 if(role.kind!=='compiler-decoded-original-component-role-attestation-not-original-PBF-row'||role.city!==E.city||role.objectId!==E.objectId||role.partId!==E.partId||role.photoSHA256!==E.photoSHA256)return null;
 const tags=c.sourceFeature?.properties;if(tags?.['building:part']!=='yes'||tags.layer!=='1'||tags.height!==undefined||tags.min_height!==undefined||tags['building:levels']!==undefined)return null;
 if(JSON.stringify(role.componentGeometry)!==JSON.stringify(c.componentGeometry)||JSON.stringify(role.sourceProperties)!==JSON.stringify(tags))return null;
 let h=2166136261;const add=(bytes:Uint8Array)=>{for(const v of bytes)h=Math.imul(h^v,16777619)>>>0};add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));
 for(const[i,b]of c.batches.entries()){
  if(b.positions.length/3!==E.batchVertices[i])return null;
  const arrays:Uint8Array[]=[];for(const k of['positions','normals','indices']as const){const label=enc.encode(k),bytes=new Uint8Array(b[k].length*4),dv=new DataView(bytes.buffer);for(let j=0;j<b[k].length;j++){if(!Number.isFinite(b[k][j]))return null;if(k==='indices')dv.setUint32(j*4,b[k][j],true);else dv.setFloat32(j*4,b[k][j],true)}arrays.push(label,bytes);add(label);add(bytes)}
  const all=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const x of arrays){all.set(x,at);at+=x.length}if(await sha(all)!==E.batchArraySHA256[i])return null;
 }
 if(h.toString(16).padStart(8,'0')!==E.nativeSignature)return null;
 for(let j=0;j<c.batches[0].positions.length;j+=3)if(Math.abs(c.batches[0].positions[j+1]-7.5)>.001||c.batches[0].normals[j+1]<.99)return null;
 for(let j=0;j<c.batches[1].positions.length;j+=3)if(Math.abs(c.batches[1].normals[j+1])>.001||![0,7.5].some(y=>Math.abs(c.batches[1].positions[j+1]-y)<.001))return null;
 return Object.freeze({objectId:E.objectId,partId:E.partId,signature:E.nativeSignature,preferredBatchIndices:Object.freeze([0]as const),excludedBatchIndices:Object.freeze([1]as const),reason:E.reason,geometryArraysModified:false as const,sourcePhotoConfirmedOpenPortico:true as const});
}
export const s423PorticoBatchIncluded=(profile:Awaited<ReturnType<typeof prepareS423PorticoDisplay>>,index:number)=>!profile||!profile.excludedBatchIndices.some(i=>i===index);
