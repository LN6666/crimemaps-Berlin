export const INDEXED_PICK_BLOCK_TRIANGLES70=64;
const STEP=INDEXED_PICK_BLOCK_TRIANGLES70*3;
type Range={start:number;end:number};
/** Current packed generation only. Bounds include every indexed vertex at growth 0..1. */
export function createIndexedPickBlocks70<T extends Range>(vertices:Float32Array,indices:Uint32Array,components:Iterable<T>){
 const rows=[...components],ranges=new Map<T,{offset:number;blocks:number}>();let count=0,previous=0;
 for(const c of rows){if(!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<previous||c.start%3||c.end%3||c.end<=c.start||c.end>indices.length)throw Error('Invalid packed pick range');previous=c.end;count+=Math.ceil((c.end-c.start)/STEP);}
 const bounds=new Float64Array(count*6);let offset=0;
 for(const c of rows){const first=offset;for(let start=c.start;start<c.end;start+=STEP){const end=Math.min(c.end,start+STEP);let minX=Infinity,minY=0,minZ=Infinity,maxX=-Infinity,maxY=0,maxZ=-Infinity;
   for(let i=start;i<end;i++){const at=indices[i]*10,x=vertices[at],y=vertices[at+1],z=vertices[at+2];if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))throw Error('Invalid packed pick vertex');minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
   const pad=1e-9*(1+Math.max(Math.abs(minX),Math.abs(minY),Math.abs(minZ),Math.abs(maxX),Math.abs(maxY),Math.abs(maxZ)));bounds.set([minX-pad,minY-pad,minZ-pad,maxX+pad,maxY+pad,maxZ+pad],offset);offset+=6;
  }ranges.set(c,{offset:first,blocks:(offset-first)/6});}
 return {bounds,ranges,blockTriangles:INDEXED_PICK_BLOCK_TRIANGLES70,blockCount:count,typedBytes:bounds.byteLength,rangeCount:ranges.size};
}
/** Conservative slab test: exact-zero parallel test and outward double-precision bounds. */
export function indexedPickBlockHit70(origin:number[],direction:number[],bounds:Float64Array,offset:number){
 let near=-Infinity,far=Infinity;for(let i=0;i<3;i++){if(direction[i]===0){if(origin[i]<bounds[offset+i]||origin[i]>bounds[offset+i+3])return false;continue;}let a=(bounds[offset+i]-origin[i])/direction[i],b=(bounds[offset+i+3]-origin[i])/direction[i];if(a>b){const swap=a;a=b;b=swap;}near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return far>=0;
}
