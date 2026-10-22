import {S364_STAIR_EXPECTED as E} from './s364-stair-display-constants';
export type StairComponent={city:string;objectId:string;partId:string;origin:readonly number[];componentGeometry:unknown;sourceFeature?:{properties?:Record<string,unknown>|null};batches:readonly{positions:ArrayLike<number>;normals:ArrayLike<number>;indices:ArrayLike<number>}[]};
export type StairAttestation={sourceLeafSHA256:string;sourceRow:string;parentSourceRow:string;photoRegistration:string};
export type S364StairDisplayProfile={readonly objectId:string;readonly partId:string;readonly signature:string;readonly preferredBatchIndices:readonly[];readonly excludedBatchIndices:readonly[0,1];readonly reason:string;readonly geometryArraysModified:false;readonly geometryAdded:0;readonly stairReconstructed:false;readonly photoInferredRole:true};
export async function prepareS364StairDisplay(c:StairComponent,a:StairAttestation):Promise<S364StairDisplayProfile|null>{
 if(c.city!==E.city||c.objectId!==E.objectId||c.partId!==E.partId||a.sourceLeafSHA256!==E.sourceLeafSHA256||c.batches.length!==2)return null;
 const enc=new TextEncoder(),sha=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),x=>x.toString(16).padStart(2,'0')).join('');
 if(await sha(enc.encode(a.sourceRow))!==E.sourceRowSHA256||await sha(enc.encode(a.parentSourceRow))!==E.parentSourceRowSHA256||await sha(enc.encode(a.photoRegistration))!==E.photoRegistrationSHA256)return null;
 let row,parent,photo;try{row=JSON.parse(a.sourceRow);parent=JSON.parse(a.parentSourceRow);photo=JSON.parse(a.photoRegistration)}catch{return null;}
 if(row.objectId!==E.objectId||row.partId!==E.partId||parent.objectId!==E.parentObjectId||row.osmTags?.building!=='yes'||Object.keys(row.osmTags).length!==1||c.sourceFeature?.properties?.building!=='yes'||Object.keys(c.sourceFeature.properties).length!==1||photo.objectId!==E.objectId||photo.noStairGeometryReconstructed!==true)return null;
 const geometry=c.componentGeometry as {type?:string;coordinates?:unknown};if(row.componentGeometry?.type!==geometry?.type||JSON.stringify(row.componentGeometry.coordinates)!==JSON.stringify(geometry.coordinates))return null;
 const shared=Array.from(new Set<number>((row.node_ids as number[]).filter(id=>(parent.node_ids as number[]).includes(id)))).sort((a,b)=>a-b);if(JSON.stringify(shared)!==JSON.stringify(E.sharedNodeIds))return null;
 let h=2166136261;const add=(bytes:Uint8Array)=>{for(const x of bytes)h=Math.imul(h^x,16777619)>>>0};add(enc.encode(JSON.stringify([c.origin,c.componentGeometry])));
 for(const[i,b]of c.batches.entries()){
  if(b.positions.length/3!==E.batchVertices[i]||b.normals.length!==b.positions.length)return null;const arrays:Uint8Array[]=[];
  for(const k of ['positions','normals','indices'] as const){const label=enc.encode(k),bytes=new Uint8Array(b[k].length*4),dv=new DataView(bytes.buffer);for(let j=0;j<b[k].length;j++){if(!Number.isFinite(b[k][j]))return null;if(k==='indices')dv.setUint32(j*4,b[k][j],true);else dv.setFloat32(j*4,b[k][j],true);}arrays.push(label,bytes);add(label);add(bytes);}
  const all=new Uint8Array(arrays.reduce((n,v)=>n+v.length,0));let at=0;for(const v of arrays){all.set(v,at);at+=v.length;}if(await sha(all)!==E.batchArraySHA256[i])return null;
 }
 if(h.toString(16).padStart(8,'0')!==E.nativeSignature)return null;
 const cap=c.batches[0],sides=c.batches[1];for(let j=0;j<cap.positions.length;j+=3)if(Math.abs(cap.positions[j+1]-7.5)>.001||cap.normals[j+1]<.99)return null;
 for(let j=0;j<sides.positions.length;j+=3)if(Math.abs(sides.normals[j+1])>.01||![0,7.5].some(y=>Math.abs(sides.positions[j+1]-y)<.001))return null;
 return Object.freeze({objectId:E.objectId,partId:E.partId,signature:E.nativeSignature,preferredBatchIndices:Object.freeze([] as const),excludedBatchIndices:Object.freeze([0,1] as const),reason:E.reason,geometryArraysModified:false,geometryAdded:0,stairReconstructed:false,photoInferredRole:true});
}
export const s364StairBatchIncluded=(profile:S364StairDisplayProfile|null,index:number)=>!profile||!profile.excludedBatchIndices.some(i=>i===index);
