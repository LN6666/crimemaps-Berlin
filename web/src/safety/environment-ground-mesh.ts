import {createGroundProjection} from './ground-projection';
import type {EnvironmentPublicationBound} from './environment-resource-publication';
import {coversProjectedGroundTriangle, type PreparedSolarBoundary} from './solar-shadow-admission';

const MAX_VERTICES=20000,MAX_INDICES=60000,MAX_RAW_BYTES=1024**2,R=6378137,RAD=Math.PI/180;
const SHA=/^[a-f0-9]{64}$/;
export type GroundCanonicalTileBinding=Readonly<{path:string;sha256:string;uncompressed_sha256:string}>;
export type GroundMeshExpectedBinding=Readonly<{
  city:string;sourceSHA256:string;boundarySHA256:string;snapshot:string;
  canonicalGroundTiles:readonly GroundCanonicalTileBinding[];sourceFeatureCount?:number;
}>;
export type EncodedEnvironmentGroundMesh=Readonly<{
  schema:'environment-ground-far-mesh-v1';encoding:'f32le-xyz-role4-u32le';city:string;
  source_pbf_sha256:string;source_boundary_sha256:string;source_snapshot:string;
  canonical_ground_tiles:readonly GroundCanonicalTileBinding[];source_feature_ids:readonly string[];
  source_polygon_count:number;origin:readonly [number,number];vertex_count:number;index_count:number;
  vertices_f32le_base64:string;indices_u32le_base64:string;
  proof:Readonly<{canonical_vertices:number;canonical_indices:number;canonical_bytes_7stride:number;
    packed_bytes_4stride:number;fixed_up_normal_bytes:12;packed_bytes_including_up_normal:number;
    position_error_m:0;welded_vertices:number;duplicate_triangles:number;
    expanded_unique_oriented_triangles_equal:true;all_seven_attributes_bit_exact:true}>;
}>;
/** Validated references to ONE encoded source. The manager retains its source lease.
 * Neither inspection nor this wrapper decodes/copies the base64 streams. */
export type ValidatedEnvironmentGroundMesh=Readonly<{
  data:EncodedEnvironmentGroundMesh;vertexCount:number;indexCount:number;
  origin:readonly [number,number];sourceFeatureIds:readonly string[];sourcePolygonCount:number;
  boundarySHA256:string;sourceSHA256:string;snapshot:string;city:string;
}>;
export type DecodedEnvironmentGroundMesh=Readonly<{
  /** Four floats per vertex, followed by ONE constant normal [0,1,0]. */
  positions:Float32Array<ArrayBuffer>;indices:Uint32Array<ArrayBuffer>;vertexCount:number;indexCount:number;
  origin:readonly [number,number];sourceFeatureIds:readonly string[];sourcePolygonCount:number;
  boundarySHA256:string;
}>;

function invalid():never{throw Error('Invalid source-bound far green mesh');}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function count(value:unknown,min:number,max:number):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;}
function stream(value:unknown,bytes:number):value is string{
  if(typeof value!=='string'||value.length>Math.ceil(MAX_RAW_BYTES/3)*4||value.length%4||
     !/^[A-Za-z0-9+/]*={0,2}$/.test(value))return false;
  const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
  return value.length/4*3-padding===bytes;
}
function tuple(value:unknown):value is GroundCanonicalTileBinding{
  return record(value)&&typeof value.path==='string'&&value.path.startsWith('/safety/environment/')&&
    !/[\\?#\0]/.test(value.path)&&!value.path.includes('..')&&
    typeof value.sha256==='string'&&SHA.test(value.sha256)&&
    typeof value.uncompressed_sha256==='string'&&SHA.test(value.uncompressed_sha256);
}

/** Asset gzip/raw SHA and 1 MiB read bounds are enforced by the existing reader.
 * This checks source identity, the exact canonical cohort, costs and stream sizes.
 * The producer proves triangle equivalence; this is not an independent re-read of
 * the unchanged canonical GeoJSON or a second geometry engine. */
export function inspectEnvironmentGroundMesh(value:unknown,expected:GroundMeshExpectedBinding):ValidatedEnvironmentGroundMesh{
  if(!expected||typeof expected.city!=='string'||!/^[a-z][a-z0-9-]*$/.test(expected.city)||
    typeof expected.snapshot!=='string'||!expected.snapshot||expected.snapshot.length>128||
    !Array.isArray(expected.canonicalGroundTiles)||
    expected.sourceFeatureCount!==undefined&&!count(expected.sourceFeatureCount,1,10000)||
    !record(value)||value.schema!=='environment-ground-far-mesh-v1'||value.encoding!=='f32le-xyz-role4-u32le'||
    value.city!==expected.city||value.source_pbf_sha256!==expected.sourceSHA256||
    value.source_boundary_sha256!==expected.boundarySHA256||value.source_snapshot!==expected.snapshot||
    !SHA.test(expected.sourceSHA256)||!SHA.test(expected.boundarySHA256)||
    !Array.isArray(value.origin)||value.origin.length!==2||!value.origin.every(n=>typeof n==='number'&&Number.isFinite(n))||
    Math.abs(value.origin[0])>180||Math.abs(value.origin[1])>85||
    !count(value.vertex_count,3,MAX_VERTICES)||!count(value.index_count,3,MAX_INDICES)||value.index_count%3||
    !count(value.source_polygon_count,1,MAX_INDICES/3))invalid();
  const canonical=value.canonical_ground_tiles;
  if(!Array.isArray(canonical)||!canonical.length||canonical.length>32||canonical.length!==expected.canonicalGroundTiles.length||
    canonical.some((ref,i)=>!tuple(ref)||!tuple(expected.canonicalGroundTiles[i])||
      !ref.path.startsWith('/safety/environment/'+expected.city+'/')||
      ref.path!==expected.canonicalGroundTiles[i].path||ref.sha256!==expected.canonicalGroundTiles[i].sha256||
      ref.uncompressed_sha256!==expected.canonicalGroundTiles[i].uncompressed_sha256))invalid();
  const ids=value.source_feature_ids;
  if(!Array.isArray(ids)||!ids.length||ids.length>10000||
    ids.some((id,i)=>typeof id!=='string'||!/^osm\/(node|way|relation)\/[1-9]\d*$/.test(id)||(i>0&&ids[i-1]>=id))||
    expected.sourceFeatureCount!==undefined&&ids.length!==expected.sourceFeatureCount)invalid();
  const vertices=value.vertex_count,indices=value.index_count,p=value.proof;
  const packed=vertices*16+indices*4;
  if(!record(p)||!count(p.canonical_vertices,vertices,MAX_VERTICES)||!count(p.canonical_indices,indices,MAX_INDICES)||
    !count(p.canonical_bytes_7stride,1,MAX_VERTICES*28+MAX_INDICES*4)||
    p.canonical_indices%3||p.canonical_bytes_7stride!==p.canonical_vertices*28+p.canonical_indices*4||
    p.packed_bytes_4stride!==packed||p.fixed_up_normal_bytes!==12||p.packed_bytes_including_up_normal!==packed+12||
    p.position_error_m!==0||p.welded_vertices!==p.canonical_vertices-vertices||
    p.duplicate_triangles!==(p.canonical_indices-indices)/3||
    p.expanded_unique_oriented_triangles_equal!==true||p.all_seven_attributes_bit_exact!==true||
    packed+12>=p.canonical_bytes_7stride||
    !stream(value.vertices_f32le_base64,vertices*16)||!stream(value.indices_u32le_base64,indices*4))invalid();
  const data=value as unknown as EncodedEnvironmentGroundMesh;
  return Object.freeze({data,vertexCount:vertices,indexCount:indices,origin:data.origin,
    sourceFeatureIds:data.source_feature_ids,sourcePolygonCount:data.source_polygon_count,
    boundarySHA256:data.source_boundary_sha256,sourceSHA256:data.source_pbf_sha256,
    snapshot:data.source_snapshot,city:data.city});
}

/** JSON strings/ID arrays retained by the manager, separate from renderer-owned
 * decoded arrays. Four raw bytes per retained JSON byte is conservative here. */
export function environmentGroundMeshEncodedRetainedBytes(rawBytes:number):number{
  if(!count(rawBytes,1,MAX_RAW_BYTES))invalid();
  return rawBytes*4+4096;
}

/** Reserve before decode/upload. No tessellation or compaction Maps at runtime.
 * Decode scratch covers atob's string, byte array and final typed storage; the
 * source's original base64 strings are charged by its manager source lease. */
export function environmentGroundMeshPublicationBound(mesh:ValidatedEnvironmentGroundMesh):EnvironmentPublicationBound{
  const vertexBytes=mesh.vertexCount*16+12,indexBytes=mesh.indexCount*4;
  return Object.freeze({vertexBytes,indexBytes,packedBytes:vertexBytes+indexBytes,
    constructionBytes:4*(vertexBytes+indexBytes),evidenceBytes:0,
    counts:Object.freeze({features:mesh.sourceFeatureIds.length,waterVertices:0,waterIndices:0,
      greenVertices:mesh.vertexCount,greenIndices:mesh.indexCount,largestPolygonVertices:0,
      greenFeatures:mesh.sourceFeatureIds.length,greenPolygons:mesh.sourcePolygonCount,
      nativeTrees:0,rowFeatures:0,rowVertices:0})});
}
function bytes(encoded:string):Uint8Array{
  const text=atob(encoded),result=new Uint8Array(text.length);
  for(let i=0;i<text.length;i++)result[i]=text.charCodeAt(i);
  return result;
}
/** Call only inside the admitted publication construction claim. LE is explicit;
 * Float32 values (including -0) and uint32 indices are never quantized. */
export function decodeEnvironmentGroundMesh(mesh:ValidatedEnvironmentGroundMesh):DecodedEnvironmentGroundMesh{
  const positions=new Float32Array(mesh.vertexCount*4+3),indices=new Uint32Array(mesh.indexCount);
  {
    const raw=bytes(mesh.data.vertices_f32le_base64),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
    if(raw.byteLength!==mesh.vertexCount*16)invalid();
    for(let i=0;i<mesh.vertexCount;i++){
      const at=i*4;
      for(let c=0;c<4;c++){const value=view.getFloat32((at+c)*4,true);if(!Number.isFinite(value))invalid();positions[at+c]=value;}
      if(!Object.is(positions[at+1],Math.fround(.01))||![3,4,5,6].includes(positions[at+3]))invalid();
    }
  }
  {
    const raw=bytes(mesh.data.indices_u32le_base64),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
    if(raw.byteLength!==mesh.indexCount*4)invalid();
    for(let i=0;i<indices.length;i++){const index=view.getUint32(i*4,true);if(index>=mesh.vertexCount)invalid();indices[i]=index;}
  }
  for(let i=0;i<indices.length;i+=3)if(indices[i]===indices[i+1]||indices[i]===indices[i+2]||indices[i+1]===indices[i+2])invalid();
  positions.set([0,1,0],mesh.vertexCount*4);
  return Object.freeze({positions,indices,vertexCount:mesh.vertexCount,indexCount:mesh.indexCount,
    origin:mesh.origin,sourceFeatureIds:mesh.sourceFeatureIds,sourcePolygonCount:mesh.sourcePolygonCount,
    boundarySHA256:mesh.boundarySHA256});
}

/** The same conservative Float32 triangle-envelope/city-hole test used by the
 * original ground builder, applied in the exact prepacked origin. */
export function validateGroundMeshBoundary(mesh:DecodedEnvironmentGroundMesh,boundary:PreparedSolarBoundary):boolean{
  if(boundary.boundarySHA256!==mesh.boundarySHA256)return false;
  const geographic=createGroundProjection(mesh.origin,boundary.boundarySHA256).geographic;
  const box=(minX:number,minZ:number,maxX:number,maxZ:number)=>geographic([minX,minZ,maxX,maxZ]);
  let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
  for(let i=0;i<mesh.vertexCount;i++){const at=i*4;minX=Math.min(minX,mesh.positions[at]);maxX=Math.max(maxX,mesh.positions[at]);minZ=Math.min(minZ,mesh.positions[at+2]);maxZ=Math.max(maxZ,mesh.positions[at+2]);}
  if(boundary.covers(box(minX,minZ,maxX,maxZ)))return true;
  for(let i=0;i<mesh.indices.length;i+=3){
    const a=mesh.indices[i]*4,b=mesh.indices[i+1]*4,c=mesh.indices[i+2]*4;
    if(!boundary.covers(box(Math.min(mesh.positions[a],mesh.positions[b],mesh.positions[c]),
      Math.min(mesh.positions[a+2],mesh.positions[b+2],mesh.positions[c+2]),
      Math.max(mesh.positions[a],mesh.positions[b],mesh.positions[c]),
      Math.max(mesh.positions[a+2],mesh.positions[b+2],mesh.positions[c+2])))&&
      !coversProjectedGroundTriangle(boundary,geographic,
        mesh.positions[a],mesh.positions[a+2],mesh.positions[b],mesh.positions[b+2],mesh.positions[c],mesh.positions[c+2]))return false;
  }
  return true;
}
