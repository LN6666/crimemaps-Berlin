import type {S767Component} from './s767-display-profile';
import {S456_CANOPY_EXPECTED as S456_EXPECTED} from './s456-canopy-display-constants';
export type S456CanopyAttestation={sourceLeafSHA256:string;sourceRow:string};
export type S456CanopyDisplayProfile={readonly objectId:string;readonly partId:string;readonly signature:string;readonly preferredBatchIndices:readonly[0];readonly excludedBatchIndices:readonly[1];readonly reason:string;readonly geometryArraysModified:false;readonly sourcePhotoConfirmedOpenCanopy:true};
// Independent candidate, not installed. Original arrays remain intact.
// Caller must apply the same included-batch predicate to draw/pick/display bounds.
export async function prepareS456CanopyDisplay(c:S767Component,a:S456CanopyAttestation):Promise<S456CanopyDisplayProfile|null>{
 const E=S456_EXPECTED;if(c?.city!==E.city||c.objectId!==E.objectId||c.partId!==E.partId||c.batches?.length!==2||a.sourceLeafSHA256!==E.sourceLeafSHA256)return null;
 const enc=new TextEncoder(),sha=async (bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),x=>x.toString(16).padStart(2,'0')).join('');
 if(await sha(enc.encode(a.sourceRow))!==E.sourceRowSHA256)return null;
 let row;try{row=JSON.parse(a.sourceRow)}catch{return null}
 if(row.objectId!==E.objectId||row.partId!==E.partId||row.osmTags?.building!=='roof'||row.osmTags?.layer!=='1'||row.osmTags?.height!==undefined||row.osmTags?.min_height!==undefined)return null;
 if(c.sourceFeature?.properties?.building!=='roof'||c.sourceFeature.properties.layer!=='1')return null;
 let h=2166136261;const add=(bytes:Uint8Array)=>{for(const v of bytes)h=Math.imul(h^v,16777619)>>>0};add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));
 for(const [i,b]of c.batches.entries()){
  if(b.positions.length/3!==E.batchVertices[i])return null;
  let arrays:Uint8Array[]=[];for(const k of ['positions','normals','indices'] as const){const label=enc.encode(k),bytes=new Uint8Array(b[k].length*4),dv=new DataView(bytes.buffer);for(let j=0;j<b[k].length;j++)if(k==='indices')dv.setUint32(j*4,b[k][j],true);else dv.setFloat32(j*4,b[k][j],true);arrays.push(label,bytes);add(label);add(bytes)}
  let size=arrays.reduce((n,a)=>n+a.length,0),all=new Uint8Array(size),offset=0;for(const a of arrays){all.set(a,offset);offset+=a.length}if(await sha(all)!==E.batchArraySHA256[i])return null;
 }
 if(h.toString(16).padStart(8,'0')!==E.nativeSignature)return null;
 // Assert actual original role: cap is only horizontal at default7.5 m;
 // all sides are vertical from0 to7.5, with no native wall-height evidence.
 const cap=c.batches[0],sides=c.batches[1];for(let j=0;j<cap.positions.length;j+=3)if(Math.abs(cap.positions[j+1]-7.5)>.001||cap.normals[j+1]<.99)return null;
 for(let j=0;j<sides.positions.length;j+=3)if(Math.abs(sides.normals[j+1])>.01||![0,7.5].some(y=>Math.abs(sides.positions[j+1]-y)<.001))return null;
 return Object.freeze({objectId:E.objectId,partId:E.partId,signature:E.nativeSignature,preferredBatchIndices:Object.freeze([0] as const),excludedBatchIndices:Object.freeze([1] as const),reason:E.reason,geometryArraysModified:false,sourcePhotoConfirmedOpenCanopy:true});
}
export const s456CanopyBatchIncluded=(profile:S456CanopyDisplayProfile|null,index:number)=>!profile||!profile.excludedBatchIndices.some(i=>i===index);
