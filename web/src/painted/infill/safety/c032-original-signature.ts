import type {BuildingComponent} from './building-mesh-renderer';
/** Runtime substitution guard. Cryptographic leaf/array SHA proofs are validated by the admission builder. */
export function nativePaintSignature(c:BuildingComponent){
 let hash=2166136261;const add=(bytes:Uint8Array)=>{for(const v of bytes)hash=Math.imul(hash^v,16777619)>>>0;};
 add(new TextEncoder().encode(JSON.stringify([c.origin,c.componentGeometry])));
 for(const b of c.batches)for(const [field,kind]of [['positions','float'],['normals','float'],['indices','uint']]as const){
  add(new TextEncoder().encode(field));const data=new Uint8Array(b[field].length*4),view=new DataView(data.buffer);b[field].forEach((n,i)=>kind==='uint'?view.setUint32(i*4,n,true):view.setFloat32(i*4,n,true));add(data);
 }
 return hash.toString(16).padStart(8,'0');
}
