import {ENVIRONMENT_LIMITS} from './environment-scene-data';

export type GreenGroundPackedMesh={positions:ArrayLike<number>;indices:ArrayLike<number>};
type Options={signal?:AbortSignal;deadline?:number;maxVertices?:number;maxIndices?:number};
export type GreenGroundCompactionStats={inputVertices:number;outputVertices:number;inputTriangles:number;outputTriangles:number;
  inputGPUBytes:number;outputGPUBytes:number;weldedVertices:number;duplicateTriangles:number;
  workingTypedArrayPeakUpperBoundBytes:number;vertexKeys:number;triangleKeys:number};
export type GreenGroundCompaction={mesh:GreenGroundPackedMesh;changed:boolean;reason:'compacted'|'no-exact-redundancy'|'packed-cap'|'input-not-reference-compact';
  stats:GreenGroundCompactionStats;proof:{additionalPositionErrorM:0;allSevenFloat32AttributesPreserved:true;
    orientedTriangleSetUnchanged:true;firstDrawPriorityPreserved:true;additionalQuantization:false}|undefined};

/** Lossless far-display compaction, not tolerance LOD. Existing per-polygon
 * referenced-vertex compaction cannot weld across polygon/source boundaries.
 * Every key includes all seven actual GPU Float32 bits, including -0 and role.
 * Only later identical cyclic (never reversed) triangles may be removed. */
export function compactGreenGroundMesh(mesh:GreenGroundPackedMesh,{signal,deadline,maxVertices=ENVIRONMENT_LIMITS.greenVertices,maxIndices=ENVIRONMENT_LIMITS.greenIndices}:Options={}):GreenGroundCompaction {
  const check=()=>{signal?.throwIfAborted();if(deadline!==undefined&&Date.now()>=deadline)throw Error('Ground compaction deadline exceeded');};
  check();
  if(deadline!==undefined&&!Number.isFinite(deadline)||!Number.isSafeInteger(maxVertices)||maxVertices<0||maxVertices>ENVIRONMENT_LIMITS.greenVertices||
    !Number.isSafeInteger(maxIndices)||maxIndices<0||maxIndices>ENVIRONMENT_LIMITS.greenIndices)throw Error('Invalid ground compaction limits');
  const n=mesh.positions.length/7,count=mesh.indices.length;
  if(!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(count)||count<0||count%3)throw Error('Invalid seven-float ground mesh');
  const stats:GreenGroundCompactionStats={inputVertices:n,outputVertices:n,inputTriangles:count/3,outputTriangles:count/3,
    inputGPUBytes:n*28+count*4,outputGPUBytes:n*28+count*4,weldedVertices:0,duplicateTriangles:0,
    workingTypedArrayPeakUpperBoundBytes:0,vertexKeys:0,triangleKeys:0};
  const held=(reason:GreenGroundCompaction['reason']):GreenGroundCompaction=>({mesh,changed:false,reason,stats,proof:undefined});
  if(n>maxVertices||count>maxIndices)return held('packed-cap');
  const referenced=new Uint8Array(n);
  stats.workingTypedArrayPeakUpperBoundBytes=referenced.byteLength;
  for(let i=0;i<count;i++){
    if(!(i%512))check();const index=mesh.indices[i];
    if(!Number.isSafeInteger(index)||index<0||index>=n)throw Error('Invalid ground mesh index');
    referenced[index]=1;
  }
  // Do not count the already-delivered per-polygon unused-vertex cleanup as a
  // new benefit. The real green packer supplies reference-compact input.
  if(referenced.some(value=>value===0))return held('input-not-reference-compact');
  const packed=new Float32Array(n*7),bits=new Uint32Array(packed.buffer),remap=new Uint16Array(n),nextIndices=new Uint32Array(count);
  for(let i=0;i<packed.length;i++){
    if(!(i%1024))check();const value=mesh.positions[i];
    if(!Number.isFinite(value)||!Number.isFinite(Math.fround(value)))throw Error('Invalid ground Float32 attribute');
    packed[i]=value;
  }
  const vertices=new Map<string,number>();let unique=0;
  for(let vertex=0;vertex<n;vertex++){
    if(!(vertex%256))check();let key='';
    for(let channel=0;channel<7;channel++)key+=bits[vertex*7+channel].toString(16).padStart(8,'0');
    let id=vertices.get(key);
    if(id===undefined){id=unique++;vertices.set(key,id);for(let channel=0;channel<7;channel++)bits[id*7+channel]=bits[vertex*7+channel];}
    remap[vertex]=id;
  }
  const triangles=new Set<string>();let kept=0;
  for(let i=0;i<count;i+=3){
    if(!(i%768))check();const a=remap[mesh.indices[i]],b=remap[mesh.indices[i+1]],c=remap[mesh.indices[i+2]];
    // Minimum cyclic rotation is used for detection only. The retained triangle
    // keeps its original corner order, winding and first-occurrence draw order.
    const key=a<=b&&a<=c?`${a},${b},${c}`:b<=c?`${b},${c},${a}`:`${c},${a},${b}`;
    if(triangles.has(key))continue;
    triangles.add(key);nextIndices[kept++]=a;nextIndices[kept++]=b;nextIndices[kept++]=c;
  }
  stats.vertexKeys=vertices.size;stats.triangleKeys=triangles.size;
  stats.workingTypedArrayPeakUpperBoundBytes=referenced.byteLength+packed.byteLength+remap.byteLength+nextIndices.byteLength+unique*28+kept*4;
  // Maps are bounded by n<=20k / triangles<=20k; these counts are not JS heap
  // measurements. No map, source object or scratch buffer escapes this call.
  if(unique===n&&kept===count)return held('no-exact-redundancy');
  stats.outputVertices=unique;stats.outputTriangles=kept/3;stats.weldedVertices=n-unique;stats.duplicateTriangles=(count-kept)/3;
  stats.outputGPUBytes=unique*28+kept*4;check();
  return{mesh:{positions:packed.slice(0,unique*7),indices:nextIndices.slice(0,kept)},changed:true,reason:'compacted',stats,
    proof:{additionalPositionErrorM:0,allSevenFloat32AttributesPreserved:true,orientedTriangleSetUnchanged:true,firstDrawPriorityPreserved:true,additionalQuantization:false}};
}
