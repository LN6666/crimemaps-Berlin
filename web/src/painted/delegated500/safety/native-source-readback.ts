import type {BuildingComponent} from './building-mesh-renderer';

/** Diagnostic-only copies of decoded native source attributes; not GPU/transformed geometry. */
export function createNativeSourceReadback(enabled:boolean){
 let resident:BuildingComponent|undefined;
 let result:Record<string,unknown>={status:enabled?'not-resident':'disabled'};
 let disposed=false;
 const expected={positions:'23e02d18f4f72f405eb07ef39d713f525f52a2a9ac1669c93f7cf86db44440f5',normals:'662ac33ad2ca95f238cc95ea3e0cdd577476738e2cc1bc641cc558903bebf720',indices:'8781ff6e243cfb966e8c02d45194135cc270f178c9669625caded2e333cec9b2'};
 async function digest(c:BuildingComponent,field:'positions'|'normals'|'indices'){
  const count=c.batches.reduce((n,b)=>n+b[field].length,0);
  const bytes=new ArrayBuffer(count*4),view=new DataView(bytes);let at=0;
  for(const batch of c.batches)for(const n of batch[field]){
   if(field==='indices')view.setUint32(at,n,true);else view.setFloat32(at,n,true);at+=4;
  }
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 }
 return {
  observe(c:BuildingComponent|undefined){
   if(!enabled||disposed)return result;
   if(!c){resident=undefined;result={status:'not-resident'};return result;}
   if(c===resident)return result;
   resident=c;
   result={status:'pending',objectId:c.objectId,partId:c.partId,scope:'decoded-native-source-attributes-not-GPU-buffer-readback'};
   void Promise.all((['positions','normals','indices'] as const).map(field=>digest(c,field))).then(hashes=>{
    if(disposed||resident!==c)return;
    const attributes=Object.fromEntries((['positions','normals','indices'] as const).map((field,i)=>[field,{sha256:hashes[i],expectedSHA256:expected[field],matches:hashes[i]===expected[field]}]));
    result={status:'ready',objectId:c.objectId,partId:c.partId,origin:[...c.origin],sourceVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),sourceTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),attributes,allMatch:hashes.every((h,i)=>h===Object.values(expected)[i]),sourceArraysModified:false,scope:'decoded-native-source-attributes-not-GPU-buffer-readback',hashEncoding:'native batch order; Float32LE positions/normals, Uint32LE batch-local indices'};
   }).catch(error=>{if(!disposed&&resident===c)result={status:'error',reason:String(error),scope:'decoded-native-source-attributes-not-GPU-buffer-readback'};});
   return result;
  },
  destroy(){disposed=true;resident=undefined;result={status:'disposed'};}
 };
}
