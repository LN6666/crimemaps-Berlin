import {createHash} from 'node:crypto';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {gzipSync} from 'node:zlib';

const check=(condition,message)=>{if(!condition)throw Error(message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function assertActive(signal,deadline){
  if(signal?.aborted)throw new DOMException('Building detail encoding aborted','AbortError');
  check(Date.now()<=deadline,'Building detail encoding time bound exceeded');
}
async function waitReady(encoder,signal,deadline){
  assertActive(signal,deadline);let timer,onAbort;
  const stop=new Promise((_,reject)=>{
    onAbort=()=>reject(new DOMException('Building detail encoding aborted','AbortError'));
    signal?.addEventListener('abort',onAbort,{once:true});
    timer=setTimeout(()=>reject(Error('Building detail encoding time bound exceeded')),Math.max(1,deadline-Date.now()));
  });
  try{await Promise.race([Promise.resolve(encoder.ready),stop]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
  assertActive(signal,deadline);
}
function littleEndianBytes(array,integer){
  const bytes=new Uint8Array(array.byteLength),view=new DataView(bytes.buffer);
  for(let i=0;i<array.length;i++)integer?view.setUint32(i*4,array[i],true):view.setFloat32(i*4,array[i],true);
  return bytes;
}

async function validateTypedLeaf(document,{signal,deadline,vertexCap}){
  check(Number.isSafeInteger(vertexCap)&&vertexCap>0&&vertexCap<=200000,'Invalid building detail vertex cap');
  check(document&&Array.isArray(document.components)&&document.components.length>0,'Complete decoded replacement components required');
  let vertices=0,indexCount=0,decodedTypedArrayBytes=0;
  // Validate the whole document before asking the encoder to process any stream.
  for(const component of document.components){
    check(component&&Array.isArray(component.batches)&&component.batches.length>0,'Nonempty component batches required');
    for(const batch of component.batches){
      assertActive(signal,deadline);
      check(batch&&batch.positions instanceof Float32Array&&batch.normals instanceof Float32Array&&batch.indices instanceof Uint32Array,'Expected Float32 position/normal and Uint32 index arrays');
      check(batch.positions.length>0&&batch.positions.length%3===0&&batch.normals.length===batch.positions.length&&batch.indices.length>0&&batch.indices.length%3===0,'Invalid nonempty triangle stream lengths');
      check(batch.positions.every(Number.isFinite)&&batch.normals.every(Number.isFinite),'Non-finite building detail attributes');
      const count=batch.positions.length/3;
      check(batch.indices.every(index=>index<count),'Building detail index outside vertex range');
      vertices+=count;indexCount+=batch.indices.length;
      check(vertices<=vertexCap&&indexCount<=vertexCap*6,'Building detail geometry encoding budget exceeded');
      decodedTypedArrayBytes+=batch.positions.byteLength+batch.normals.byteLength+batch.indices.byteLength;
      await yieldTurn();assertActive(signal,deadline);
    }
  }
  return {vertices,indexCount,decodedTypedArrayBytes};
}

/** Lossless transport encoding of one complete decoded replacement leaf.
 * No filtering, quantization, triangle rotation, reordering or retained cache.
 * The caller owns encoder/decoder implementation provenance and publication. */
export async function encodeBuildingDetailMeshopt(document,{encoder,signal,deadline=Date.now()+120000,vertexCap=200000}={}){
  check(Number.isFinite(deadline),'Invalid building detail encoding deadline');
  assertActive(signal,deadline);
  check(encoder&&typeof encoder.encodeVertexBuffer==='function'&&typeof encoder.encodeIndexSequence==='function'&&encoder.supported!==false,'Lossless vertex and index-sequence encoder required');
  const {vertices,indexCount,decodedTypedArrayBytes}=await validateTypedLeaf(document,{signal,deadline,vertexCap});
  let encodedBufferBytes=0,streams=0;
  await waitReady(encoder,signal,deadline);
  function encode(array,codec,count,stride){
    assertActive(signal,deadline);
    const raw=littleEndianBytes(array,codec==='index-sequence'),sha256=hash(raw);
    const encoded=codec==='vertex'?encoder.encodeVertexBuffer(raw,count,stride):encoder.encodeIndexSequence(raw,count,stride);
    assertActive(signal,deadline);
    check(encoded instanceof Uint8Array&&encoded.byteLength>0,'Encoder returned an invalid byte stream');
    check(hash(raw)===sha256,'Encoder mutated its lossless input stream');
    encodedBufferBytes+=encoded.byteLength;streams++;
    return {codec,count,stride,decodedBytes:raw.byteLength,sha256,data:Buffer.from(encoded.buffer,encoded.byteOffset,encoded.byteLength).toString('base64')};
  }
  const components=[];
  for(const component of document.components){
    const batches=[];
    for(const batch of component.batches){
      await yieldTurn();assertActive(signal,deadline);const count=batch.positions.length/3;
      batches.push({...batch,positions:encode(batch.positions,'vertex',count,12),normals:encode(batch.normals,'vertex',count,12),indices:encode(batch.indices,'index-sequence',batch.indices.length,4)});
    }
    components.push({...component,batches});
  }
  assertActive(signal,deadline);
  return {document:{...document,encoding:'meshopt-lossless-f32-v1',components},stats:{decodedTypedArrayBytes,encodedBufferBytes,vertices,triangles:indexCount/3,streams,quantization:false,reordered:false,filtered:false}};
}

const MAX_RAW_BYTES=4*1024**2,MAX_ENCODED_BYTES=1024**2;

/** Compare transports of the same complete typed leaf. serialize is the
 * producer's deterministic, signed-zero-preserving detailJSON, not JSON.stringify.
 * Dictionary transport is opt-in for callers with a compatible reader.
 * These are transport/payload byte counts, not process or native-memory readings.
 */
export async function chooseBuildingDetailTransport(document,{
  encoder,signal,deadline=Date.now()+120000,vertexCap=200000,serialize,dictionary=false,
  maxRawBytes=MAX_RAW_BYTES,maxEncodedBytes=MAX_ENCODED_BYTES,
}={}){
  check(typeof serialize==='function','A deterministic lossless detail serializer is required');
  check(Number.isSafeInteger(maxRawBytes)&&maxRawBytes>0&&maxRawBytes<=MAX_RAW_BYTES,'Invalid detail raw byte limit');
  check(Number.isSafeInteger(maxEncodedBytes)&&maxEncodedBytes>0&&maxEncodedBytes<=MAX_ENCODED_BYTES,'Invalid detail transport byte limit');
  check(Number.isFinite(deadline),'Invalid building detail encoding deadline');assertActive(signal,deadline);
  let selected,encoding;
  function measure(value,candidateEncoding){
    assertActive(signal,deadline);
    const json=serialize(value);check(typeof json==='string','Detail serializer must return JSON text');
    const rawBytes=Buffer.from(json+'\n');assertActive(signal,deadline);
    // An inadmissible inflated representation must never become a selected asset.
    if(rawBytes.length>maxRawBytes)return {rawLength:rawBytes.length,gzipLength:null,valid:false};
    const bytes=gzipSync(rawBytes,{level:9});assertActive(signal,deadline);
    const valid=bytes.length<=maxEncodedBytes;
    // Keep the earlier encoding on ties: JSON, inline Meshopt, then dictionary.
    if(valid&&(!selected||bytes.length<selected.bytes.length)){
      selected={rawBytes,bytes};
      encoding=candidateEncoding;
    }
    return {rawLength:rawBytes.length,gzipLength:bytes.length,valid};
  }
  // Whole-leaf typed/count validation precedes either serializer allocation.
  const options={encoder,signal,deadline,vertexCap};
  let plain,meshopt,inlineStats;
  {
    const encoded=await encodeBuildingDetailMeshopt(document,options);
    inlineStats=encoded.stats;
    plain=measure(document,'json');
    await yieldTurn();assertActive(signal,deadline);
    meshopt=measure(encoded.document,'meshopt-lossless-f32-v1');
  }
  let dictionaryComparison;
  if(dictionary===true){
    dictionaryComparison={dictionaryAttempted:false};
    if(typeof encoder.encodeVertexBufferLevel==='function'&&isDictionaryDocument(document)&&
      document.components.length<=20000&&!document.components.some(component=>component.batches.some(hasDictionaryOffsets))){
      const encoded=await encodeBuildingDetailMeshoptDictionary(document,options);
      const measured=measure(encoded.document,BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING);
      dictionaryComparison={dictionaryAttempted:true,dictionaryStats:encoded.stats,
        dictionaryJSONBytes:measured.rawLength,dictionaryJSONGzipBytes:measured.gzipLength,
        dictionaryWithinLimits:measured.valid};
    }
  }
  check(selected,'No building detail transport fits the raw/encoded byte limits');
  assertActive(signal,deadline);
  return {bytes:selected.bytes,rawBytes:selected.rawBytes,encoding,decodedBytes:inlineStats.decodedTypedArrayBytes,
    transportStats:{...inlineStats,plainJSONBytes:plain.rawLength,plainJSONGzipBytes:plain.gzipLength,
      encodedJSONBytes:meshopt.rawLength,meshoptJSONGzipBytes:meshopt.gzipLength,
      plainWithinLimits:plain.valid,meshoptWithinLimits:meshopt.valid,
      ...dictionaryComparison,
      selectedTransportBytes:selected.bytes.length,transportBytes:selected.bytes.length,selectedRawBytes:selected.rawBytes.length,
      selectedEncoding:encoding,measurement:'decoded-stream-payload-and-transport-only-not-process-memory'}};
}

export const BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING='meshopt-lossless-f32-dictionary-v1';

function isDictionaryDocument(document){
  return document?.schema_version===1&&document.partial!==true&&
    (document.encoding===undefined||document.encoding==='json')&&document.dictionaries===undefined;
}

function hasDictionaryOffsets(batch){
  return ['vertexOffset','vertices','indexOffset','indexCount'].some(key=>Object.hasOwn(batch,key));
}

// A tuple key is the exact 12-byte Float32 LE payload. In particular -0 and
// +0 keep different keys. First occurrence fixes the dictionary order.
function attributeDictionary(vertexCount) {
  const bytes=Buffer.allocUnsafe(vertexCount*12), references=new Uint32Array(vertexCount);
  const lookup=new Map();
  let distinct=0, next=0;
  return {
    append(array) {
      const source=littleEndianBytes(array,false);
      const raw=Buffer.from(source.buffer,source.byteOffset,source.byteLength);
      const offset=next;
      for(let start=0;start<raw.byteLength;start+=12){
        const tuple=raw.subarray(start,start+12), key=tuple.toString('base64');
        let index=lookup.get(key);
        if(index===undefined){
          index=distinct++;
          lookup.set(key,index);
          tuple.copy(bytes,index*12);
        }
        references[next++]=index;
      }
      return offset;
    },
    finish() {
      check(next===vertexCount,'Dictionary reference count differs from the input');
      return {values:bytes.subarray(0,distinct*12),references:littleEndianBytes(references,true),distinct};
    },
  };
}

/** Encode a complete already-selected replacement. The five streams encode
 * only render attributes. Component and batch order, SOURCE/material metadata
 * and the existing replacement/geometry identity are inherited verbatim. */
export async function encodeBuildingDetailMeshoptDictionary(document,{
  encoder,signal,deadline=Date.now()+120000,vertexCap=200000,
}={}){
  check(Number.isFinite(deadline),'Invalid building detail encoding deadline');
  assertActive(signal,deadline);
  check(isDictionaryDocument(document),'Expected a complete typed JSON replacement leaf');
  check(document.components?.length<=20000,'Building detail component cap exceeded');
  check(encoder&&typeof encoder.encodeVertexBufferLevel==='function'&&
    typeof encoder.encodeIndexSequence==='function'&&encoder.supported!==false,
  'Meshoptimizer level-3 version-1 vertex and index-sequence encoder required');
  const {vertices,indexCount,decodedTypedArrayBytes}=await validateTypedLeaf(document,{signal,deadline,vertexCap});
  await waitReady(encoder,signal,deadline);

  const positions=attributeDictionary(vertices),normals=attributeDictionary(vertices);
  const indexLookup=new Map(),indexBytes=Buffer.allocUnsafe(indexCount*4);
  let packedIndices=0,batchCount=0;
  const components=[];
  for(const component of document.components){
    const {batches:inputBatches,...metadata}=component,batches=[];
    for(const batch of inputBatches){
      await yieldTurn();assertActive(signal,deadline);
      const {positions:xyz,normals:nrm,indices,...batchMetadata}=batch;
      check(!hasDictionaryOffsets(batchMetadata),
        'Replacement batch metadata collides with dictionary offsets');
      const vertexOffset=positions.append(xyz);
      check(normals.append(nrm)===vertexOffset,'Position and normal reference offsets disagree');
      const source=littleEndianBytes(indices,true),raw=Buffer.from(source.buffer,source.byteOffset,source.byteLength);
      const key=raw.toString('base64');
      let indexOffset=indexLookup.get(key);
      if(indexOffset===undefined){
        indexOffset=packedIndices;
        indexLookup.set(key,indexOffset);
        raw.copy(indexBytes,packedIndices*4);
        packedIndices+=indices.length;
      }
      batches.push({...batchMetadata,vertexOffset,vertices:xyz.length/3,indexOffset,indexCount:indices.length});
      batchCount++;
    }
    components.push({...metadata,batches});
  }
  const xyz=positions.finish(), nrm=normals.finish();
  let encodedBufferBytes=0,dictionaryDecodedBytes=0;
  function encode(raw,codec,stride){
    assertActive(signal,deadline);
    const count=raw.byteLength/stride,sha256=hash(raw);
    check(Number.isSafeInteger(count)&&count>0,'Invalid dictionary stream element count');
    const encoded=codec==='vertex'
      ?encoder.encodeVertexBufferLevel(raw,count,stride,3,1)
      :encoder.encodeIndexSequence(raw,count,stride);
    assertActive(signal,deadline);
    check(encoded instanceof Uint8Array&&encoded.byteLength>0&&encoded.byteLength<=raw.byteLength*2+4096,
      'Encoder returned an invalid dictionary byte stream');
    check(hash(raw)===sha256,'Encoder mutated its lossless dictionary input');
    encodedBufferBytes+=encoded.byteLength;dictionaryDecodedBytes+=raw.byteLength;
    return {codec,count,stride,decodedBytes:raw.byteLength,sha256,
      data:Buffer.from(encoded.buffer,encoded.byteOffset,encoded.byteLength).toString('base64')};
  }
  const dictionaries={
    positions:encode(xyz.values,'vertex',12),normals:encode(nrm.values,'vertex',12),
    positionReferences:encode(xyz.references,'index-sequence',4),
    normalReferences:encode(nrm.references,'index-sequence',4),
    indices:encode(indexBytes.subarray(0,packedIndices*4),'index-sequence',4),
  };
  assertActive(signal,deadline);
  return {
    document:{...document,encoding:BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING,components,dictionaries},
    stats:{decodedTypedArrayBytes,dictionaryDecodedBytes,encodedBufferBytes,vertices,
      triangles:indexCount/3,streams:5,batches:batchCount,distinctPositionTriples:xyz.distinct,
      distinctNormalTriples:nrm.distinct,distinctIndexSequences:indexLookup.size,packedIndexElements:packedIndices,
      quantization:false,reordered:false,filtered:false},
  };
}

/** A re-encoding is admissible only if it beats the actual already-mounted
 * gzip, rather than a newly serialized/recompressed approximation of it. */
export async function chooseBuildingDetailDictionaryReplacement(document,{
  encoder,signal,deadline=Date.now()+120000,vertexCap=200000,serialize,baselineGzipBytes,
  maxRawBytes=MAX_RAW_BYTES,maxEncodedBytes=MAX_ENCODED_BYTES,
}={}){
  check(typeof serialize==='function','A deterministic lossless detail serializer is required');
  check(Number.isSafeInteger(maxRawBytes)&&maxRawBytes>0&&maxRawBytes<=MAX_RAW_BYTES,'Invalid detail raw byte limit');
  check(Number.isSafeInteger(maxEncodedBytes)&&maxEncodedBytes>0&&maxEncodedBytes<=MAX_ENCODED_BYTES,'Invalid detail transport byte limit');
  check(Number.isSafeInteger(baselineGzipBytes)&&baselineGzipBytes>0&&baselineGzipBytes<=maxEncodedBytes,
    'An admitted existing gzip byte count is required');
  const encoded=await encodeBuildingDetailMeshoptDictionary(document,{encoder,signal,deadline,vertexCap});
  const json=serialize(encoded.document);
  check(typeof json==='string','Detail serializer must return JSON text');
  const rawBytes=Buffer.from(json+'\n');
  assertActive(signal,deadline);
  if(rawBytes.byteLength>maxRawBytes)return undefined;
  const bytes=gzipSync(rawBytes,{level:9});
  assertActive(signal,deadline);
  if(bytes.byteLength>maxEncodedBytes||bytes.byteLength>=baselineGzipBytes)return undefined;
  const encoding=BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING;
  return {bytes,rawBytes,encoding,decodedBytes:encoded.stats.decodedTypedArrayBytes,
    transportStats:{...encoded.stats,baselineGzipBytes,selectedTransportBytes:bytes.byteLength,
      selectedRawBytes:rawBytes.byteLength,selectedEncoding:encoding,
      measurement:'decoded-stream-payload-and-transport-only-not-process-memory'}};
}
