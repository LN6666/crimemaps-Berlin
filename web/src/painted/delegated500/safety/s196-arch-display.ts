import {S196_ARCH_EXPECTED as E} from './s196-arch-display-constants';
/** Display-only batch precedence for the exactly pinned original named bow. No source-array edits. */
export async function prepareS196ArchDisplay(c:any,a:{sourceLeafSHA256:string;signal?:AbortSignal}){
 if(a.signal?.aborted||c?.city!==E.city||c.objectId!==E.objectId||c.partId!==E.partId||a.sourceLeafSHA256!==E.sourceLeafSHA256||!Array.isArray(c.batches)||c.batches.length!==2||JSON.stringify(c.sourceFeature?.properties)!==JSON.stringify(E.sourceProperties))return null;
 const enc=new TextEncoder(),sha=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),x=>x.toString(16).padStart(2,'0')).join('');let h=2166136261;const add=(bytes:Uint8Array)=>{for(const v of bytes)h=Math.imul(h^v,16777619)>>>0};add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));
 for(const[i,b]of c.batches.entries()){
  if(!b.positions||!b.normals||!b.indices||b.positions.length/3!==E.batchVertices[i])return null;const arrays:Uint8Array[]=[];
  for(const k of['positions','normals','indices']as const){const label=enc.encode(k),bytes=new Uint8Array(b[k].length*4),dv=new DataView(bytes.buffer);for(let j=0;j<b[k].length;j++){const v=b[k][j];if(!Number.isFinite(v)||k==='indices'&&(!Number.isInteger(v)||v<0))return null;if(k==='indices')dv.setUint32(j*4,v,true);else dv.setFloat32(j*4,v,true)}add(label);add(bytes);arrays.push(label,bytes)}
  const all=new Uint8Array(arrays.reduce((n,x)=>n+x.length,0));let offset=0;for(const bytes of arrays){all.set(bytes,offset);offset+=bytes.length}if(await sha(all)!==E.batchArraySHA256[i]||a.signal?.aborted)return null;
 }
 if(h.toString(16).padStart(8,'0')!==E.nativeSignature)return null;
 for(let v=0;v<c.batches[0].positions.length/3;v++)if(Math.abs(c.batches[0].normals[v*3+1])>.001)return null;
 let low=Infinity,high=-Infinity;for(let v=0;v<c.batches[1].positions.length/3;v++){if(c.batches[1].normals[v*3+1]<.22)return null;const y=c.batches[1].positions[v*3+1];low=Math.min(low,y);high=Math.max(high,y)}if(low!==0||high!==76||a.signal?.aborted)return null;
 return Object.freeze({objectId:E.objectId,partId:E.partId,signature:E.nativeSignature,preferredBatchIndices:Object.freeze([1]as const),excludedBatchIndices:Object.freeze([0]as const),reason:E.reason,geometryArraysModified:false as const,sourcePhotoConfirmedOpenArch:true as const});
}
export const s196ArchBatchIncluded=(p:Awaited<ReturnType<typeof prepareS196ArchDisplay>>,i:number)=>!p||!p.excludedBatchIndices.some(j=>j===i);
/** Original municipal admission covers the exact retained original index subset; no expanded shadow bounds. */
export function s196ArchShadowSubset(c:any,p:any,admittedTriangles:number,renderedTriangles:number){
 return !!p&&p.sourcePhotoConfirmedOpenArch===true&&p.signature===E.nativeSignature&&p.objectId===E.objectId&&p.partId===E.partId&&c?.objectId===E.objectId&&c.partId===E.partId&&admittedTriangles===620&&renderedTriangles===308&&c.batches?.length===2&&c.batches[0].positions.length/3===936&&c.batches[1].positions.length/3===924&&c.batches[0].indices.length/3===312&&c.batches[1].indices.length/3===308&&p.excludedBatchIndices?.length===1&&p.excludedBatchIndices[0]===0&&p.preferredBatchIndices?.length===1&&p.preferredBatchIndices[0]===1;
}
