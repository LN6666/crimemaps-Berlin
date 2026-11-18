/** Display-only normal packing. Positions, colours, vertex order and indices
 * stay bit-identical. The signed-normalized error is at most 1/(2*32767)
 * per component. This is a GPU representation, not source geometry. */
export type NormalPackingAttribute={name:string;size:number;stride?:number;offset?:number};
export function canPackResidentNormals(data:Float32Array,attributes:readonly NormalPackingAttribute[],dynamic=false){
 if(dynamic||!data.length||data.length%9)return false;
 if(!attributes.some(a=>a.name==='a_normal'&&a.size===3&&a.stride===36&&a.offset===12))return false;
 if(attributes.some(a=>a.stride!==36||![0,12,24].includes(a.offset??0)||a.size>3))return false;
 for(let i=0;i<data.length;i+=9)for(let j=3;j<6;j++)if(!Number.isFinite(data[i+j])||Math.abs(data[i+j])>1)return false;
 return true;
}
export function packResidentNormals(data:Float32Array){
 const bytes=new Uint8Array(data.length/9*32),out=new DataView(bytes.buffer),source=new Uint32Array(data.buffer,data.byteOffset,data.length);
 for(let i=0,v=0;i<data.length;i+=9,v+=32){
  for(let j=0;j<3;j++){out.setUint32(v+j*4,source[i+j],true);out.setUint32(v+20+j*4,source[i+6+j],true);}
  for(let j=0;j<3;j++)out.setInt16(v+12+j*2,Math.round(data[i+3+j]*32767),true);
 }
 return bytes;
}
export function packedNormalAttribute(attribute:NormalPackingAttribute){
 const offset=attribute.offset??0;
 if(attribute.stride!==36||![0,12,24].includes(offset)||attribute.size>3)throw Error('Unsupported borrowed packed-normal attribute layout');
 return {stride:32,offset:offset===24?20:offset,short:offset===12};
}
