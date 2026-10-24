import type {BuildingComponent} from './building-mesh-renderer';
import {nativePaintSignature} from './progressive-native-signature';
import {MYZEIL_GRIDSHELL_BINDING_053 as B} from './infill-frankfurt-myzeil-gridshell053-binding';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),tubeCodes=new DataView(bytes(B.tubeParamU16LE).buffer),tubeArc=new DataView(bytes(B.tubeArcF32LE).buffer),sideUV=new DataView(bytes(B.sideUVF32LE).buffer);
/** Metadata only. The steel lattice is independent of earcut/render triangles. */
export function applyMyzeilGridshell053(components:BuildingComponent[],frames:Float32Array){
 const targets=components.filter(c=>c.city==='frankfurt'&&B.members.some(m=>m.objectId===c.objectId&&m.partId===c.partId));
 if(targets.length!==B.members.length||!B.members.every(m=>{const rows=targets.filter(c=>c.objectId===m.objectId&&c.partId===m.partId);return rows.length===1&&(rows[0].displayEstimates?.infillMyzeilExterior as {patchSHA?:string}|undefined)?.patchSHA===B.sourcePatchSHA256&&nativePaintSignature(rows[0])===m.displaySignature;}))return{objects:0,vertices:0,reason:'complete exact MyZeil DISPLAY required',actualVisualAccepted:false};
 const target=targets.find(c=>c.objectId===B.target.objectId&&c.partId===B.target.partId)!,batch=target.batches[B.target.batchIndex],writes:{id:number;values:number[]}[]=[],counts:Record<number,number>={};
 for(const range of B.target.ranges)for(let id=range.firstVertex;id<range.firstVertex+range.vertexCount;id++){
  const p=Array.from(batch.positions.slice(id*3,id*3+3)),dx=p[0]-B.basis.anchor[0],dz=p[2]-B.basis.anchor[2],x=dx*B.basis.u[0]+dz*B.basis.u[1],z=dx*B.basis.v[0]+dz*B.basis.v[1];let uv:number[],region:number=range.region;
  if(region===1)uv=[x,z];
  else if(region===2)uv=[x,p[1]];
  else if(region===3){const code=tubeCodes.getUint16((id-range.firstVertex)*2,true),ring=Math.floor(code/(B.tubeSegments+1)),angle=code%(B.tubeSegments+1);uv=[angle/B.tubeSegments*B.tubeCircumferenceCells*B.edgeM,tubeArc.getFloat32(code*4,true)];region+=ring/(B.tubeRings-1)*.125;}
  else uv=[sideUV.getFloat32((id-range.firstVertex)*8,true),sideUV.getFloat32((id-range.firstVertex)*8+4,true)];
  const values=[uv[0],uv[1],region,B.marker];if(!values.every(Number.isFinite))return{objects:0,vertices:0,reason:'invalid MyZeil surface coordinate',actualVisualAccepted:false};writes.push({id,values});counts[range.region]=(counts[range.region]??0)+1;
 }
 let offset=0;for(const c of components)for(const [bi,b]of c.batches.entries()){if(c===target&&bi===B.target.batchIndex){if(writes.some(w=>frames[(offset+w.id)*5+4]!==((b as any).frames[w.id*5+4])))return{objects:0,vertices:0,reason:'MyZeil prior material family mismatch',actualVisualAccepted:false};for(const w of writes)frames.set(w.values,(offset+w.id)*5);}offset+=b.positions.length/3;}
 return{objects:1,vertices:writes.length,regions:counts,constructionTriangleEdgesUsed:false,actualVisualAccepted:false,measurement:B.measurement};
}
