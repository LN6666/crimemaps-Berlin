import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rm,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';

// Output limits match the existing environment renderer. Input limits bound
// this offline source-subset job; they do not raise any page/runtime limit.
export const GROUND_OVERVIEW_LIMITS=Object.freeze({leaves:32,leafRawBytes:1024**2,rawBytes:4*1024**2,vertices:20000,indices:60000,inputLeaves:512,inputLeafBytes:1024**2,inputIndexBytes:1024**2,inputRawBytes:16*1024**2,inputFeatures:10000});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hash=/^[a-f0-9]{64}$/;
const cities=new Set(['berlin','bremen','cologne','dortmund','dresden','dusseldorf','essen','frankfurt','hamburg','hannover','leipzig','munich','nuremberg','stuttgart']);
function check(signal,deadline){signal?.throwIfAborted();if(deadline!==undefined&&Date.now()>=deadline)throw Error('Ground overview deadline exceeded');}
const yieldJob=()=>new Promise(resolve=>setImmediate(resolve));
function checkedCaps(caps){
 if(!caps||typeof caps!=='object'||Array.isArray(caps))throw Error('Invalid ground overview caps');
 const result={...GROUND_OVERVIEW_LIMITS};for(const [key,value]of Object.entries(caps)){if(!Object.hasOwn(result,key)||!Number.isSafeInteger(value)||value<0||value>GROUND_OVERVIEW_LIMITS[key])throw Error('Ground cap exceeds original limit or is invalid: '+key);result[key]=value;}return Object.freeze(result);
}
// Stable JSON retains array/ring order and Float64 values, including -0. No
// quantization, clipping, simplification, normalisation or attribute rewriting.
export function groundOverviewJSON(value){
 if(value===null)return'null';
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite ground JSON');return Object.is(value,-0)?'-0':String(value);}
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(Array.isArray(value))return'['+value.map(groundOverviewJSON).join(',')+']';
 if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+groundOverviewJSON(value[key])).join(',')+'}';
 throw Error('Non-JSON ground value');
}
async function geometryRuntime(signal,deadline){
 check(signal,deadline);
 const require=createRequire(new URL('../../web/package.json',import.meta.url)),{build}=require('esbuild');
 const safety=fileURLToPath(new URL('../../web/src/safety/',import.meta.url));
 const result=await build({stdin:{contents:"export {greenGroundGeometry} from './environment-greenery-geometry';export {compactGreenGroundMesh} from './environment-ground-lod';export {inspectEnvironmentGroundMesh,decodeEnvironmentGroundMesh,validateGroundMeshBoundary} from './environment-ground-mesh';export {parseEnvironmentSource,ENVIRONMENT_LIMITS} from './environment-scene-data';export {prepareSolarShadowBoundary} from './solar-shadow-admission';",resolveDir:safety,loader:'ts'},bundle:true,write:false,format:'cjs',platform:'node',target:'es2022',logLevel:'silent'});
 check(signal,deadline);
 // A job-local CommonJS closure, not a persistent data-URL module/cache holding
 // the job's prepared boundary after the returned assets/receipt are released.
 const module={exports:{}};new Function('module','exports','require',result.outputFiles[0].text)(module,module.exports,require);return module.exports;
}
function descriptor(asset,city){
 if(!asset||typeof asset.path!=='string'||!new RegExp('^/safety/environment/'+city+'/[A-Za-z0-9_.-]+$').test(asset.path)||!hash.test(asset.sha256??'')||!Number.isSafeInteger(asset.bytes)||asset.bytes<1)throw Error('Invalid ground input asset');
 if(asset.compression!==undefined&&(asset.compression!=='gzip'||!Number.isSafeInteger(asset.uncompressed_bytes)||asset.uncompressed_bytes<1||!hash.test(asset.uncompressed_sha256??'')))throw Error('Invalid ground input gzip binding');
 return asset.uncompressed_bytes??asset.bytes;
}
async function readDocument(asset,city,readAsset,signal,deadline,limits){
 if(descriptor(asset,city)>limits.inputLeafBytes||asset.bytes>limits.inputLeafBytes)throw Error('Ground input asset exceeds single-document budget');
 check(signal,deadline);const bytes=await readAsset(asset,signal);check(signal,deadline);
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==asset.bytes||sha(bytes)!==asset.sha256)throw Error('Ground input byte/SHA mismatch: '+asset.path);
 const raw=asset.compression==='gzip'?gunzipSync(bytes,{maxOutputLength:limits.inputLeafBytes}):bytes;
 if(raw.byteLength!==(asset.uncompressed_bytes??asset.bytes)||asset.compression==='gzip'&&sha(raw)!==asset.uncompressed_sha256)throw Error('Ground input raw byte/SHA mismatch: '+asset.path);
 check(signal,deadline);return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
}
function featureMeasure(feature,project){
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 const bbox=[Infinity,Infinity,-Infinity,-Infinity];let area=0;
 for(const polygon of polygons){
  for(let r=0;r<polygon.length;r++){
   const ring=polygon[r];let twice=0;
   if(ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])return;
   for(let i=1;i<ring.length;i++){
    const a=project(ring[i-1]),b=project(ring[i]);twice+=a[0]*b[1]-b[0]*a[1];
    if(!r){bbox[0]=Math.min(bbox[0],ring[i][0]);bbox[1]=Math.min(bbox[1],ring[i][1]);bbox[2]=Math.max(bbox[2],ring[i][0]);bbox[3]=Math.max(bbox[3],ring[i][1]);}
   }
   area+=(r?-1:1)*Math.abs(twice)/2;
  }
 }
 return Number.isFinite(area)&&area>0?{bbox,area}:undefined;
}
function meshArea(mesh){let area=0;for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(v=>[mesh.positions[v*7],mesh.positions[v*7+2]]);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}return area;}
const collection=(city,features)=>({type:'FeatureCollection',schema_version:1,city,features});

function wordsLE(words){const bytes=new Uint8Array(words.length*4),view=new DataView(bytes.buffer);for(let i=0;i<words.length;i++)view.setUint32(i*4,words[i],true);return bytes;}
function decodedWords(base64){const bytes=Buffer.from(base64,'base64'),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),words=new Uint32Array(bytes.length/4);for(let i=0;i<words.length;i++)words[i]=view.getUint32(i*4,true);return words;}
function triangleKeys(indices,vertexWords,checkpoint){
 const keys=new Set();for(let i=0;i<indices.length;i+=3){if(!(i%768))checkpoint();const a=vertexWords(indices[i]),b=vertexWords(indices[i+1]),c=vertexWords(indices[i+2]),rotations=[a+'|'+b+'|'+c,b+'|'+c+'|'+a,c+'|'+a+'|'+b];keys.add(rotations.sort()[0]);}return keys;
}
function packedFarMesh({runtime,baseline,origin,boundary,index,groundTiles,featureIds,canonicalRawBytes,L,signal,deadline}){
 check(signal,deadline);
 const compacted=runtime.compactGreenGroundMesh(baseline,{signal,deadline,maxVertices:L.vertices,maxIndices:L.indices});
 const held=reason=>({receipt:{requested:true,status:'held',reason,stats:compacted.stats,
  classification:'lossless packed geometry representation, not tolerance LOD',sourceGeometryChanged:false}});
 if(!baseline.admitted||!baseline.indices.length)return held('no-admitted-canonical-geometry');
 if(!compacted.changed&&compacted.reason!=='no-exact-redundancy')return held(compacted.reason);
 const canonical=new Float32Array(baseline.positions),canonicalBits=new Uint32Array(canonical.buffer);
 const packed7=new Float32Array(compacted.mesh.positions),packed7Bits=new Uint32Array(packed7.buffer),v=packed7.length/7,i=compacted.mesh.indices.length;
 for(let at=0;at<canonicalBits.length;at+=7)if(canonicalBits[at+3]!==0||canonicalBits[at+4]!==0x3f800000||canonicalBits[at+5]!==0)return held('non-fixed-up-normal-bits');
 const words4=new Uint32Array(v*4);for(let vertex=0;vertex<v;vertex++)for(const [out,input]of [0,1,2,6].entries())words4[vertex*4+out]=packed7Bits[vertex*7+input];
 const vertices_f32le_base64=Buffer.from(wordsLE(words4)).toString('base64'),indices_u32le_base64=Buffer.from(wordsLE(compacted.mesh.indices)).toString('base64');
 // Verify the actual LE/base64 representation, including -0, rather than only
 // comparing the in-memory candidate that preceded encoding.
 const decoded4=decodedWords(vertices_f32le_base64),decodedIndices=decodedWords(indices_u32le_base64);
 const originalKeys=triangleKeys(baseline.indices,vertex=>Array.from(canonicalBits.subarray(vertex*7,vertex*7+7)).map(n=>n.toString(16).padStart(8,'0')).join(':'),()=>check(signal,deadline));
 const packedKeys=triangleKeys(decodedIndices,vertex=>[decoded4[vertex*4],decoded4[vertex*4+1],decoded4[vertex*4+2],0,0x3f800000,0,decoded4[vertex*4+3]].map(n=>n.toString(16).padStart(8,'0')).join(':'),()=>check(signal,deadline));
 if(originalKeys.size!==packedKeys.size||[...originalKeys].some(key=>!packedKeys.has(key)))throw Error('Far ground expanded oriented triangle bits changed');
 const canonicalVertices=canonical.length/7,canonicalIndices=baseline.indices.length,canonicalBytes=28*canonicalVertices+4*canonicalIndices,packedBytes=16*v+4*i;
 if(packedBytes+12>=canonicalBytes)return held('no-packed-gpu-byte-benefit');
 check(signal,deadline);
 const proof={canonical_vertices:canonicalVertices,canonical_indices:canonicalIndices,canonical_bytes_7stride:canonicalBytes,
  packed_bytes_4stride:packedBytes,fixed_up_normal_bytes:12,packed_bytes_including_up_normal:packedBytes+12,
  position_error_m:0,welded_vertices:canonicalVertices-v,duplicate_triangles:(canonicalIndices-i)/3,
  expanded_unique_oriented_triangles_equal:true,all_seven_attributes_bit_exact:true};
 const document={schema:'environment-ground-far-mesh-v1',encoding:'f32le-xyz-role4-u32le',city:index.city,source_pbf_sha256:index.source_pbf_sha256,
  source_boundary_sha256:index.city_boundary.sha256,source_snapshot:index.source_snapshot,origin,source_polygon_count:baseline.admitted,
  canonical_ground_tiles:groundTiles.map(t=>({path:t.path,sha256:t.sha256,uncompressed_sha256:t.uncompressed_sha256})),
  source_feature_ids:[...featureIds].sort(),vertex_count:v,index_count:i,vertices_f32le_base64,indices_u32le_base64,proof};
 if(new Set(document.source_feature_ids).size!==document.source_feature_ids.length)throw Error('Far ground source feature IDs are not unique');
 try{
  const inspected=runtime.inspectEnvironmentGroundMesh(document,{city:index.city,sourceSHA256:index.source_pbf_sha256,boundarySHA256:index.city_boundary.sha256,snapshot:index.source_snapshot,
   canonicalGroundTiles:document.canonical_ground_tiles,sourceFeatureCount:featureIds.length});
  if(!runtime.validateGroundMeshBoundary(runtime.decodeEnvironmentGroundMesh(inspected),boundary))return held('far-float32-boundary-held');
 }catch(error){check(signal,deadline);const failure=held('far-consumer-validation-held');failure.receipt.consumerFailure=String(error).slice(0,1024);return failure;}
 const raw=Buffer.from(groundOverviewJSON(document));check(signal,deadline);
 const reason=raw.length>L.leafRawBytes?'far-single-leaf-byte-budget':groundTiles.length+1>L.leaves?'combined-geometry-leaf-budget':canonicalRawBytes+raw.length>L.rawBytes?'combined-geometry-raw-byte-budget':undefined;
 if(reason)return held(reason);
 const encoded=gzipSync(raw,{level:9});check(signal,deadline);if(encoded.length>L.leafRawBytes)return held('far-single-leaf-byte-budget');
 const digest=sha(encoded),assetPath='/safety/environment/'+index.city+'/ground-overview-'+digest+'.json.gz';
 const asset={path:assetPath,sha256:digest,bytes:encoded.length,compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw)};
 return{asset,file:{path:assetPath,bytes:encoded},receipt:{requested:true,status:'prepared-not-runtime-adopted',reason:'lossless-packed-benefit',
  classification:'lossless packed geometry representation, not tolerance LOD',stats:compacted.stats,proof,sourcePolygonCount:baseline.admitted,
  canonicalSourceFeatures:featureIds.length,encodedVertexBytes:words4.byteLength,encodedIndexBytes:decodedIndices.byteLength,
  base64Characters:vertices_f32le_base64.length+indices_u32le_base64.length,rawBytes:raw.length,transportBytes:encoded.length,
  triangleVerification:{canonicalUnique:originalKeys.size,packedUnique:packedKeys.size,comparison:'all seven actual Float32 attributes, oriented cyclic triangles; exact Set equality after LE/base64 roundtrip'},
  sourceGeometryChanged:false,consumerStatus:'requires explicit parser/manager/renderer support; canonical source cohort stays available'}};
}

async function buildFarFromCohort(index,indexBytes,readAsset,{signal,deadline,L}){
 const city=index.city,tiles=index.ground_tiles;
 if(index.schema_version!==1||!cities.has(city)||!hash.test(index.source_pbf_sha256??'')||typeof index.source_snapshot!=='string'||index.source_snapshot.length>128||
   index.ground_far_mesh!==undefined||!Array.isArray(tiles)||!tiles.length||tiles.length>L.leaves||tiles.length>L.inputLeaves)throw Error('Invalid canonical ground cohort for far mesh');
 let sourceRaw=0,declaredFeatures=0;const seenPaths=new Set();for(const tile of tiles){const raw=descriptor(tile,city);if(raw>L.leafRawBytes||tile.bytes>L.leafRawBytes||!tile.compression||
  !Number.isSafeInteger(tile.feature_count)||tile.feature_count<1||!tile.kinds||Object.keys(tile.kinds).length!==1||tile.kinds.green!==tile.feature_count||seenPaths.has(tile.path)||
  !Array.isArray(tile.bbox)||tile.bbox.length!==4||!tile.bbox.every(Number.isFinite)||tile.bbox[0]>tile.bbox[2]||tile.bbox[1]>tile.bbox[3]||Math.abs(tile.bbox[0])>180||Math.abs(tile.bbox[2])>180||Math.abs(tile.bbox[1])>85||Math.abs(tile.bbox[3])>85)throw Error('Invalid canonical ground cohort descriptor');sourceRaw+=raw;seenPaths.add(tile.path);}
 for(const tile of tiles)declaredFeatures+=tile.feature_count;if(declaredFeatures>L.inputFeatures)throw Error('Canonical ground declared feature budget exceeded');
 const boundaryBytes=descriptor(index.city_boundary,city),inputRawBytes=indexBytes.length+boundaryBytes+sourceRaw;
 if(sourceRaw>L.rawBytes||inputRawBytes>L.inputRawBytes||boundaryBytes>L.inputLeafBytes||index.city_boundary.bytes>L.inputLeafBytes)throw Error('Canonical ground cohort input budget exceeded');
 const runtime=await geometryRuntime(signal,deadline);
 if(L.vertices>runtime.ENVIRONMENT_LIMITS.greenVertices||L.indices>runtime.ENVIRONMENT_LIMITS.greenIndices||L.rawBytes>runtime.ENVIRONMENT_LIMITS.visibleBytes||L.leafRawBytes>runtime.ENVIRONMENT_LIMITS.tileRawBytes)throw Error('Ground caps exceed the actual runtime limits');
 const document=await readDocument(index.city_boundary,city,readAsset,signal,deadline,L),geometry=document.geometry;
 if(document.source_pbf_sha256!==undefined&&document.source_pbf_sha256!==index.source_pbf_sha256||!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))throw Error('Ground cohort boundary source binding mismatch');
 const box=[Infinity,Infinity,-Infinity,-Infinity];let points=0;
 const scan=v=>{if(!Array.isArray(v))throw Error('Invalid ground cohort boundary');if(typeof v[0]==='number'){if(++points>200000||v.length<2||!v.every(Number.isFinite)||Math.abs(v[0])>180||Math.abs(v[1])>85)throw Error('Ground cohort boundary budget');box[0]=Math.min(box[0],v[0]);box[1]=Math.min(box[1],v[1]);box[2]=Math.max(box[2],v[0]);box[3]=Math.max(box[3],v[1]);}else v.forEach(scan);};scan(geometry.coordinates);
 const origin=[(box[0]+box[2])/2,(box[1]+box[3])/2];if(!origin.every(Number.isFinite)||box[0]>=box[2]||box[1]>=box[3])throw Error('Invalid ground cohort origin');
 const boundary=runtime.prepareSolarShadowBoundary({boundarySHA256:index.city_boundary.sha256,geometry},{whenRefused:'throw'}),features=[],ids=new Set();
 for(const tile of tiles){
  check(signal,deadline);const source=runtime.parseEnvironmentSource(await readDocument(tile,city,readAsset,signal,deadline,L),city,index.city_boundary.sha256,index.source_pbf_sha256,index.source_snapshot);
  if(source.features.length!==tile.feature_count||source.features.some(feature=>feature.properties.kind!=='green'))throw Error('Canonical ground cohort kind/count mismatch');
  for(const feature of source.features){if(ids.has(feature.id))throw Error('Canonical ground cohort contains duplicate source IDs');ids.add(feature.id);features.push(feature);if(features.length>L.inputFeatures)throw Error('Canonical ground feature budget exceeded');}
  await yieldJob();
 }
 const baseline=runtime.greenGroundGeometry(features,origin,box,boundary,L.vertices,L.indices);
 if(baseline.omitted)throw Error('Canonical ground cohort exceeds original packed caps');
 const result=packedFarMesh({runtime,baseline,origin,boundary,index,groundTiles:tiles,featureIds:[...ids],canonicalRawBytes:sourceRaw,L,signal,deadline});
 const outputIndex={...index,...(result.asset?{ground_far_mesh:result.asset}:{})};if(Buffer.byteLength(groundOverviewJSON(outputIndex))+1>L.inputIndexBytes)throw Error('Far ground index byte budget exceeded');
 const files=result.file?[result.file]:[],receipt={schema:'existing-cohort-ground-far-mesh-v1',city,sourceIndexSHA256:sha(indexBytes),sourcePbfSHA256:index.source_pbf_sha256,
  sourceSnapshot:index.source_snapshot,boundarySHA256:index.city_boundary.sha256,origin,inputMode:'existing-canonical-ground-cohort-only',
  canonicalGroundTiles:tiles,inputLeaves:tiles.map(tile=>({...tile,rawBytes:tile.uncompressed_bytes})),inputDocuments:tiles.length,inputRawBytes,
  nativeTilesOrPartitionsRead:false,canonicalAssetsRewritten:false,sourceFeatures:features.length,sourcePolygonCount:baseline.admitted,
  baseline:{vertices:baseline.positions.length/7,indices:baseline.indices.length,admitted:baseline.admitted,held:baseline.held,omitted:baseline.omitted},
  displayCompaction:result.receipt,output:{leaves:tiles.length+files.length,newLeaves:files.length,canonicalRawBytes:sourceRaw,
   rawBytes:sourceRaw+(result.asset?.uncompressed_bytes??0),transportBytes:files.reduce((sum,file)=>sum+file.bytes.length,0)},caps:L,
  sourceGeometryChanged:false,coverage:'same existing canonical cohort only; no native source rediscovery or expanded geographic coverage; not browser/visual acceptance'};
 return{index:outputIndex,files,receipt};
}

/** Exact-source overview subset. readAsset returns the descriptor's transport
 * bytes, never decoded/normalised features. No source or output files are
 * changed here. deadline, when supplied, is an absolute Date.now() millisecond.
 * Returned files are an overlay over the unchanged sealed source site. */
export async function buildEnvironmentGroundOverview({indexBytes,readAsset},{signal,deadline,caps={},farCompaction=false,coordinateFrame}={}){
 check(signal,deadline);if(deadline!==undefined&&!Number.isFinite(deadline))throw Error('Invalid ground deadline');
 if(typeof farCompaction!=='boolean')throw Error('Invalid ground far compaction option');
 const L=checkedCaps(caps);if(!(indexBytes instanceof Uint8Array)||!indexBytes.length||indexBytes.length>L.inputIndexBytes||typeof readAsset!=='function')throw Error('Invalid ground overview inputs');
 const index=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(indexBytes)),city=index?.city;
 if(coordinateFrame!==undefined&&(!coordinateFrame||coordinateFrame.mode!=='single-source-bbox-center'||!/^osm\/(?:node|way|relation)\/[1-9]\d*$/.test(coordinateFrame.sourceID??'')||!hash.test(coordinateFrame.sourceSHA256??'')||!Array.isArray(coordinateFrame.origin)||coordinateFrame.origin.length!==2||!coordinateFrame.origin.every(Number.isFinite)||Math.abs(coordinateFrame.origin[0])>180||Math.abs(coordinateFrame.origin[1])>85||index.ground_tiles!==undefined))throw Error('Invalid single-source precision frame');
 if(index.ground_tiles!==undefined&&farCompaction)return buildFarFromCohort(index,indexBytes,readAsset,{signal,deadline,L});
 const partitioned=index.index_type==='viewport-partitioned-v1';
 if(index.schema_version!==1||!cities.has(city)||!hash.test(index.source_pbf_sha256??'')||typeof index.source_snapshot!=='string'||index.source_snapshot.length>128||index.ground_tiles!==undefined||index.ground_far_mesh!==undefined||
   (partitioned?(!Array.isArray(index.partitions)||index.partitions.length>2048||index.tiles!==undefined):(!Array.isArray(index.tiles)||index.tiles.length>50000||index.partitions!==undefined||index.index_type!==undefined)))throw Error('Ground overview requires an original tiles or viewport-partitioned environment index');
 const boundaryRawBytes=descriptor(index.city_boundary,city);
 let inputRawBytes=indexBytes.length+boundaryRawBytes,sourceLeafRawBytes=0,partitionRawBytes=0,inputDocuments=0,inputDeclaredFeatures=0,inputDecodedFeatures=0;
 if(!L.inputLeaves||!L.inputFeatures||index.city_boundary.bytes>L.inputLeafBytes||boundaryRawBytes>L.inputLeafBytes||inputRawBytes>L.inputRawBytes)throw Error('Ground overview input budget exceeded');
 const kinds=['green','tree','tree_row','water','water_line'],paths=new Map([[index.city_boundary.path,index.city_boundary]]),duplicateInputs=[],unreadInputs=[],leaves=[],partitions=[];
 const box=v=>Array.isArray(v)&&v.length===4&&v.every(Number.isFinite)&&v[0]<=v[2]&&v[1]<=v[3];
 function register(asset){
  const previous=paths.get(asset.path);if(previous){if(groundOverviewJSON(previous)!==groundOverviewJSON(asset))throw Error('Conflicting ground input path: '+asset.path);duplicateInputs.push({path:asset.path,sha256:asset.sha256});return false;}
  paths.set(asset.path,asset);return true;
 }
 function greenInputs(tiles){
  const result=[];
  for(const tile of tiles){
   if(!tile.kinds||typeof tile.kinds!=='object'||Array.isArray(tile.kinds)||!Number.isSafeInteger(tile.feature_count)||tile.feature_count<1||Object.keys(tile.kinds).some(k=>!kinds.includes(k))||Object.values(tile.kinds).some(n=>!Number.isSafeInteger(n)||n<0)||Object.values(tile.kinds).reduce((n,v)=>n+v,0)!==tile.feature_count)throw Error('Ground overview requires complete kind inventories');
   descriptor(tile,city);if(!box(tile.bbox))throw Error('Invalid ground input tile bounds');
   if(register(tile)&&tile.kinds.green)result.push(tile);
  }
  return result.sort((a,b)=>a.path.localeCompare(b.path));
 }
 const rootLeaves=partitioned?undefined:greenInputs(index.tiles),pages=partitioned?[...index.partitions].sort((a,b)=>String(a.path).localeCompare(String(b.path))):[];
 for(const page of pages){descriptor(page,city);if(!box(page.bbox)||page.tile_count!==undefined&&(!Number.isSafeInteger(page.tile_count)||page.tile_count<0||page.tile_count>5000)||!register(page))throw Error('Invalid ground input partition');}
 function admit(asset,kind,parent){
  check(signal,deadline);
  const rawBytes=descriptor(asset,city);
  const reason=asset.bytes>L.inputLeafBytes||rawBytes>L.inputLeafBytes?'input-single-document-budget':inputDocuments>=L.inputLeaves?'input-document-budget':inputRawBytes+rawBytes>L.inputRawBytes?'input-raw-byte-budget':kind==='leaf'&&inputDeclaredFeatures+asset.feature_count>L.inputFeatures?'input-feature-budget':undefined;
  if(reason){unreadInputs.push({kind,descriptor:asset,reason,...(parent?{partitionSHA256:parent.sha256}:{})});return false;}
  // Reserve the complete declared document, including non-green mixed members,
  // before any read/parse. Pages share the original 512/16MiB input allowance.
  inputDocuments++;inputRawBytes+=rawBytes;
  if(kind==='partition'){partitions.push(asset);partitionRawBytes+=rawBytes;}
  else{leaves.push(asset);sourceLeafRawBytes+=rawBytes;inputDeclaredFeatures+=asset.feature_count;}
  return true;
 }
 const runtime=await geometryRuntime(signal,deadline);
 if(L.vertices>runtime.ENVIRONMENT_LIMITS.greenVertices||L.indices>runtime.ENVIRONMENT_LIMITS.greenIndices||L.rawBytes>runtime.ENVIRONMENT_LIMITS.visibleBytes||L.leafRawBytes>runtime.ENVIRONMENT_LIMITS.tileRawBytes)throw Error('Ground caps exceed the actual runtime limits');
 const boundaryDocument=await readDocument(index.city_boundary,city,readAsset,signal,deadline,L),geometry=boundaryDocument.geometry;
 if(boundaryDocument.source_pbf_sha256!==undefined&&boundaryDocument.source_pbf_sha256!==index.source_pbf_sha256||!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))throw Error('Ground boundary source binding mismatch');
 const cityBox=[Infinity,Infinity,-Infinity,-Infinity];let boundaryPoints=0;
 function scan(v){if(!Array.isArray(v))throw Error('Invalid ground boundary coordinate');if(typeof v[0]==='number'){if(++boundaryPoints>200000||v.length<2||!v.every(Number.isFinite)||Math.abs(v[0])>180||Math.abs(v[1])>85)throw Error('Ground boundary coordinate budget');cityBox[0]=Math.min(cityBox[0],v[0]);cityBox[1]=Math.min(cityBox[1],v[1]);cityBox[2]=Math.max(cityBox[2],v[0]);cityBox[3]=Math.max(cityBox[3],v[1]);}else v.forEach(scan);}
 scan(geometry.coordinates);const origin=coordinateFrame?[...coordinateFrame.origin]:[(cityBox[0]+cityBox[2])/2,(cityBox[1]+cityBox[3])/2];
 if(!origin.every(Number.isFinite)||cityBox[0]>=cityBox[2]||cityBox[1]>=cityBox[3])throw Error('Empty ground municipal boundary');
 const boundary=runtime.prepareSolarShadowBoundary({boundarySHA256:index.city_boundary.sha256,geometry},{whenRefused:'throw'}),rad=Math.PI/180,scale=6378137*Math.cos(origin[1]*rad),baseY=Math.log(Math.tan(Math.PI/4+origin[1]*rad/2));
 const project=p=>[(p[0]-origin[0])*rad*scale,(Math.log(Math.tan(Math.PI/4+p[1]*rad/2))-baseY)*scale];
 const candidates=[],byId=new Map(),held=[],omitted=[],duplicates=[];
 async function readLeaf(tile,parent){
  if(!admit(tile,'leaf',parent))return;
  check(signal,deadline);const source=runtime.parseEnvironmentSource(await readDocument(tile,city,readAsset,signal,deadline,L),city,index.city_boundary.sha256,index.source_pbf_sha256,index.source_snapshot);
  const actualKinds={};for(const feature of source.features)actualKinds[feature.properties.kind]=(actualKinds[feature.properties.kind]??0)+1;
  if(source.features.length!==tile.feature_count||kinds.some(kind=>(actualKinds[kind]??0)!==(tile.kinds[kind]??0)))throw Error('Ground leaf kind/count mismatch');
  inputDecodedFeatures+=source.features.length;
  for(const feature of source.features){
   if(feature.properties.kind!=='green')continue;
   if(byId.has(feature.id)){if(groundOverviewJSON(byId.get(feature.id))!==groundOverviewJSON(feature))throw Error('Conflicting ground source ID: '+feature.id);duplicates.push(feature.id);continue;}
   byId.set(feature.id,feature);if(byId.size>L.inputFeatures)throw Error('Ground overview input feature budget exceeded');
   const measure=featureMeasure(feature,project);if(!measure){held.push({id:feature.id,reason:'invalid-or-empty-source-rings'});continue;}
   const x=Math.max(0,Math.min(7,Math.floor(((measure.bbox[0]+measure.bbox[2])/2-cityBox[0])/(cityBox[2]-cityBox[0])*8))),y=Math.max(0,Math.min(3,Math.floor(((measure.bbox[1]+measure.bbox[3])/2-cityBox[1])/(cityBox[3]-cityBox[1])*4)));
   candidates.push({feature,...measure,cell:y*8+x,parentSHA256:tile.sha256});
  }
  await yieldJob();
 }
 if(rootLeaves)for(const tile of rootLeaves)await readLeaf(tile);
 else for(const page of pages){
  if(!admit(page,'partition'))continue;
  const document=await readDocument(page,city,readAsset,signal,deadline,L);
  if(document?.schema_version!==1||document.city!==city||!Array.isArray(document.tiles)||document.tiles.length>5000||page.tile_count!==undefined&&document.tiles.length!==page.tile_count)throw Error('Ground partition city/schema/count mismatch');
  // Existing native pages carry city/schema/tiles only. Their exact bytes are
  // bound by the root descriptor; any additional declared source pins must agree.
  for(const [key,value]of Object.entries({source_pbf_sha256:index.source_pbf_sha256,source_snapshot:index.source_snapshot,city_boundary_sha256:index.city_boundary.sha256,source_boundary_sha256:index.city_boundary.sha256}))if(document[key]!==undefined&&document[key]!==value)throw Error('Ground partition source binding mismatch');
  if(document.city_boundary!==undefined&&groundOverviewJSON(document.city_boundary)!==groundOverviewJSON(index.city_boundary))throw Error('Ground partition boundary binding mismatch');
  for(const tile of greenInputs(document.tiles))await readLeaf(tile,page);
  await yieldJob();check(signal,deadline);
 }
 if(coordinateFrame){const feature=byId.get(coordinateFrame.sourceID),entry=candidates.find(c=>c.feature.id===coordinateFrame.sourceID);if(byId.size!==1||!feature||!entry||sha(Buffer.from(groundOverviewJSON(feature)))!==coordinateFrame.sourceSHA256||origin[0]!==((entry.bbox[0]+entry.bbox[2])/2)||origin[1]!==((entry.bbox[1]+entry.bbox[3])/2))throw Error('Precision frame must exactly bind the single original source and its bbox center');}
 // Each occupied source-space cell takes a turn; within it, the largest exact
 // polygon is tried first. Cells are admission order only, never new geometry.
 const cells=Array.from({length:32},()=>[]);for(const c of candidates)cells[c.cell].push(c);
 for(const cell of cells)cell.sort((a,b)=>b.area-a.area||a.feature.id.localeCompare(b.feature.id));
 const order=[];for(let rank=0;order.length<candidates.length;rank++)for(const cell of cells)if(cell[rank])order.push(cell[rank]);
 const selected=[];let vertices=0,indices=0,serializedFeatureBytes=0,sourceAreaSumM2=0,triangleAreaSumM2=0,heldTriangles=0;
 const wrapperBytes=Buffer.byteLength(groundOverviewJSON(collection(city,[])));
 const packing=Array.from({length:L.leaves},()=>({bytes:wrapperBytes,count:0}));
 for(const [at,c]of order.entries()){
  check(signal,deadline);if(at%8===0)await yieldJob();check(signal,deadline);
  const text=groundOverviewJSON(c.feature),bytes=Buffer.byteLength(text);
  if(bytes+wrapperBytes>L.leafRawBytes||serializedFeatureBytes+bytes+selected.length+1+L.leaves*wrapperBytes>L.rawBytes){omitted.push({id:c.feature.id,reason:'raw-byte-budget'});continue;}
  const packSlot=packing.findIndex(p=>p.bytes+bytes+(p.count?1:0)<=L.leafRawBytes);if(packSlot<0){omitted.push({id:c.feature.id,reason:'leaf-pack-budget'});continue;}
  // Use the actual product triangulation, holes and Float32 municipality guard.
  // A whole source feature is accepted or omitted; never keep a triangle prefix.
  const mesh=runtime.greenGroundGeometry([c.feature],origin,c.bbox,boundary,L.vertices,L.indices),v=mesh.positions.length/7,i=mesh.indices.length;
  if(mesh.omitted){omitted.push({id:c.feature.id,reason:'individual-packed-budget'});continue;}
  if(!mesh.admitted||!i){held.push({id:c.feature.id,reason:'source-geometry-or-boundary-held',heldCounter:mesh.held});continue;}
  if(vertices+v>L.vertices||indices+i>L.indices){omitted.push({id:c.feature.id,reason:'cohort-packed-budget'});continue;}
  selected.push({...c,text,packSlot,vertices:v,indices:i,heldCounter:mesh.held,admittedPolygons:mesh.admitted});packing[packSlot].bytes+=bytes+(packing[packSlot].count?1:0);packing[packSlot].count++;vertices+=v;indices+=i;serializedFeatureBytes+=bytes;sourceAreaSumM2+=c.area;triangleAreaSumM2+=meshArea(mesh);heldTriangles+=mesh.held;
 }
 if(!selected.length)throw Error('No safe exact-source ground overview benefit');
 selected.sort((a,b)=>a.feature.id.localeCompare(b.feature.id));
 const files=[],groundTiles=[];
 function emit(chunk){
  if(!chunk.length)return;const raw=Buffer.from(groundOverviewJSON(collection(city,chunk.map(c=>c.feature)))),bytes=gzipSync(raw,{level:9}),digest=sha(bytes),assetPath='/safety/environment/'+city+'/ground-overview-'+digest+'.json.gz';
  if(raw.length>L.leafRawBytes||bytes.length>L.leafRawBytes)throw Error('Ground overview single-leaf byte budget exceeded');
  const bbox=[Infinity,Infinity,-Infinity,-Infinity];for(const c of chunk){bbox[0]=Math.min(bbox[0],c.bbox[0]);bbox[1]=Math.min(bbox[1],c.bbox[1]);bbox[2]=Math.max(bbox[2],c.bbox[2]);bbox[3]=Math.max(bbox[3],c.bbox[3]);}
  const id='ground-overview-'+groundTiles.length;groundTiles.push({id,tile_key:id,bbox,path:assetPath,sha256:digest,bytes:bytes.length,compression:'gzip',uncompressed_bytes:raw.length,uncompressed_sha256:sha(raw),feature_count:chunk.length,kinds:{green:chunk.length}});files.push({path:assetPath,bytes});
 }
 for(let slot=0;slot<packing.length;slot++)emit(selected.filter(c=>c.packSlot===slot));
 const rawBytes=groundTiles.reduce((n,t)=>n+t.uncompressed_bytes,0);if(groundTiles.length>L.leaves||rawBytes>L.rawBytes)throw Error('Ground overview output budget exceeded');
 let farMesh;let displayCompaction={requested:farCompaction,status:'disabled'};
 if(farCompaction){
  check(signal,deadline);await yieldJob();check(signal,deadline);
  // This is the same actual canonical renderer geometry, not a projection of
  // source tags or a new grass footprint. Per-feature admission remains above.
  const baseline=runtime.greenGroundGeometry(selected.map(c=>c.feature),origin,cityBox,boundary,L.vertices,L.indices);
  if(baseline.positions.length/7!==vertices||baseline.indices.length!==indices||baseline.omitted)throw Error('Combined ground mesh differs from individually admitted source cohort');
  const result=packedFarMesh({runtime,baseline,origin,boundary,index,groundTiles,featureIds:selected.map(c=>c.feature.id),canonicalRawBytes:rawBytes,L,signal,deadline});
  farMesh=result.asset;displayCompaction=result.receipt;if(result.file)files.push(result.file);
 }
 check(signal,deadline);
 const inputRecord=t=>({...t,rawBytes:t.uncompressed_bytes??t.bytes});
 const receipt={schema:'exact-source-ground-overview-v1',city,sourceIndexSHA256:sha(indexBytes),sourcePbfSHA256:index.source_pbf_sha256,sourceSnapshot:index.source_snapshot,boundarySHA256:index.city_boundary.sha256,origin,sourceBoundaryBBox:cityBox,inputMode:partitioned?'viewport-partitioned-v1':'tiles',inputStatus:unreadInputs.length?'partial':'complete',inputComplete:unreadInputs.length===0,inputLeaves:leaves.map(inputRecord),inputPartitions:partitions.map(inputRecord),unreadInputs,duplicateInputs,inputDocuments,inputDeclaredFeatures,inputDecodedFeatures,inputPartitionRawBytes:partitionRawBytes,inputRawBytes,inputSourceLeafRawBytes:sourceLeafRawBytes,inputBoundaryRawBytes:boundaryRawBytes,inputIndexRawBytes:indexBytes.length,inputFeatures:byId.size,inputAccounting:'inputDocuments counts pages plus source leaves; raw bytes also include root and boundary; declared/decoded features include non-green and duplicate IDs, inputFeatures counts unique green',selected:selected.map(c=>({id:c.feature.id,parentSHA256:c.parentSHA256,vertices:c.vertices,indices:c.indices,admittedPolygons:c.admittedPolygons,heldCounter:c.heldCounter})),omitted,held,duplicates,output:{leaves:groundTiles.length,rawBytes,transportBytes:files.reduce((n,f)=>n+f.bytes.length,0),vertices,indices,sourceAreaSumM2,triangleAreaSumM2,heldCounter:heldTriangles},caps:L,deadline:deadline??null,cancellation:'AbortSignal checked around each read/bundle and each geometry step; yield after every page/leaf and at most 8 feature attempts; CLI SIGINT/SIGTERM cancels and removes only its new output directory',sourceGeometryChanged:false,areaMeasurement:'local Mercator scaled by cos(municipal bbox midpoint latitude); sums, not polygon union/geodesic/pixel coverage',coverage:'selected exact-source overview subset; inputComplete covers green discovery only and unread partition descendants remain unknown; not all source features or a visual/viewport acceptance'};
 const outputIndex={...index,ground_tiles:groundTiles,...(farMesh?{ground_far_mesh:farMesh}:{})};
 if(coordinateFrame){receipt.coordinateFrame={...coordinateFrame,sourceNodeOrderUnchanged:true,sourceGeoCoordinatesUnchanged:true};receipt.areaMeasurement='local Mercator scaled by cos(single original source bbox midpoint latitude); no source point/order edits';}
 receipt.displayCompaction=displayCompaction;receipt.output.canonicalRawBytes=rawBytes;
 receipt.output.rawBytes=rawBytes+(farMesh?.uncompressed_bytes??0);receipt.output.leaves=files.length;
 receipt.output.transportBytes=files.reduce((n,file)=>n+file.bytes.length,0);
 if(receipt.output.leaves>L.leaves||receipt.output.rawBytes>L.rawBytes)throw Error('Combined ground geometry output budget exceeded');
 if(Buffer.byteLength(groundOverviewJSON(outputIndex))+1>1024**2)throw Error('Ground overview index byte budget exceeded');
 return{index:outputIndex,files,receipt};
}

async function cli(){
 const args=process.argv.slice(2),values={};for(let i=0;i<args.length;i+=2){if(!['--site','--city','--out','--caps','--deadline-ms','--far-compaction'].includes(args[i])||!args[i+1]||values[args[i]])throw Error('Usage: --site SEALED_SITE --city CITY --out NEW_OVERLAY_DIRECTORY [--caps JSON] [--deadline-ms 120000] [--far-compaction lossless-f32-v1]');values[args[i]]=args[i+1];}
 if(!values['--site']||!cities.has(values['--city'])||!values['--out'])throw Error('Usage: --site SEALED_SITE --city CITY --out NEW_OVERLAY_DIRECTORY');
 const site=await realpath(values['--site']),requestedOut=path.resolve(values['--out']),out=path.join(await realpath(path.dirname(requestedOut)),path.basename(requestedOut)),city=values['--city'],inside=(root,file)=>file===root||file.startsWith(root+path.sep);
 const caps=checkedCaps(values['--caps']?JSON.parse(values['--caps']):{}),duration=values['--deadline-ms']===undefined?120000:Number(values['--deadline-ms']);if(!Number.isSafeInteger(duration)||duration<1||duration>120000)throw Error('Ground CLI deadline must be 1..120000 milliseconds');const deadline=Date.now()+duration;
 if(values['--far-compaction']!==undefined&&values['--far-compaction']!=='lossless-f32-v1')throw Error('Unsupported ground far compaction');
 if(inside(site,out)||inside(out,site))throw Error('Ground output must be separate from the sealed site');
 try{await stat(out);throw Error('Ground output must not exist');}catch(error){if(error.code!=='ENOENT')throw error;}
 const controller=new AbortController(),cancel=()=>controller.abort(new DOMException('Ground production cancelled','AbortError'));process.on('SIGINT',cancel);process.on('SIGTERM',cancel);let created=false;
 try{
  const signal=controller.signal,indexPath=await realpath(path.join(site,'safety/environment',city,'index.json'));if(!inside(site,indexPath)||(await stat(indexPath)).size>caps.inputIndexBytes)throw Error('Ground input index leaves sealed site or exceeds budget');
  const indexBytes=await readFile(indexPath,{signal}),readAsset=async(asset,ownSignal)=>{const file=await realpath(path.join(site,asset.path.slice(1)));if(!inside(site,file)||(await stat(file)).size!==asset.bytes)throw Error('Ground input leaves sealed site or size differs');return readFile(file,{signal:ownSignal});};
  const result=await buildEnvironmentGroundOverview({indexBytes,readAsset},{signal,deadline,caps,farCompaction:values['--far-compaction']==='lossless-f32-v1'});check(signal,deadline);await mkdir(out);created=true;
  for(const file of result.files){check(signal,deadline);const target=path.join(out,file.path.slice(1));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,file.bytes,{flag:'wx',signal});}
  check(signal,deadline);const target=path.join(out,'safety/environment',city,'index.json');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,groundOverviewJSON(result.index)+'\n',{flag:'wx',signal});check(signal,deadline);await writeFile(path.join(out,'ground-overview-receipt.json'),JSON.stringify(result.receipt,null,2)+'\n',{flag:'wx',signal});check(signal,deadline);console.log(JSON.stringify({out,city,caps,inputRawBytes:result.receipt.inputRawBytes,deadline,output:result.receipt.output,selected:result.receipt.selected?.length??result.receipt.sourceFeatures,omitted:result.receipt.omitted?.length??result.receipt.baseline?.omitted,held:result.receipt.held?.length??result.receipt.baseline?.held}));
 }catch(error){if(created)await rm(out,{recursive:true,force:true});throw error;}finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(error=>{console.error(String(error));process.exitCode=1;});
