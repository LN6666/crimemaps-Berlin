export const BUILDING_DETAIL_MESHOPT_ENCODING = 'meshopt-lossless-f32-v1';
export const BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING = 'meshopt-lossless-f32-dictionary-v1';
export type BuildingDetailMeshoptDecoder = {
  readonly ready: Promise<void>; readonly supported?: boolean;
  decodeVertexBuffer(target: Uint8Array, count: number, stride: number, source: Uint8Array): void;
  decodeIndexSequence(target: Uint8Array, count: number, stride: number, source: Uint8Array): void;
};
export type BuildingDetailMeshoptBatch = Record<string, unknown> & {
  positions: Float32Array; normals: Float32Array; indices: Uint32Array;
};
export type BuildingDetailMeshoptComponent = Record<string, unknown> & {batches: BuildingDetailMeshoptBatch[]};
export type DecodedBuildingDetailMeshopt = Record<string, unknown> & {
  encoding: typeof BUILDING_DETAIL_MESHOPT_ENCODING | typeof BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING;
  components: BuildingDetailMeshoptComponent[];
};
export type DecodedBuildingDetailJSON = Record<string, unknown> & {components: BuildingDetailMeshoptComponent[]};
export type BuildingDetailJSONInspection = {
  components: number; batches: number; vertices: number; triangles: number; streams: number;
  decodedTypedArrayBytes: number; sourceNumberArrayBytesEstimate: number;
  constructionTransientBytes: number; constructionPeakBytes: number;
};
type RecordValue = Record<string, unknown>;
type Stream = {codec: 'vertex' | 'index-sequence'; count: number; stride: number; decodedBytes: number; sha256: string; data: string; encodedBytes: number};
type BatchPlan = {metadata: RecordValue; positions: Stream; normals: Stream; indices: Stream};
type ComponentPlan = {metadata: RecordValue; batches: BatchPlan[]};
type DictionaryBatchPlan = {metadata: RecordValue; vertexOffset: number; vertices: number; indexOffset: number; indexCount: number};
type DictionaryComponentPlan = {metadata: RecordValue; batches: DictionaryBatchPlan[]};
const dictionaryKeys = ['positions', 'normals', 'positionReferences', 'normalReferences', 'indices'] as const;
type JSONBatchPlan = {metadata: RecordValue; positions: number[]; normals: number[]; indices: number[]};
type JSONComponentPlan = {metadata: RecordValue; batches: JSONBatchPlan[]};
export type BuildingDetailMeshoptInspection = {
  components: number; batches: number; vertices: number; triangles: number; streams: number;
  decodedTypedArrayBytes: number; encodedBufferBytes: number; encodedBase64CodeUnits: number;
  wireStringBytesEstimate: number; maxStreamDecodedBytes: number; maxStreamEncodedBytes: number;
  decoderScratchBytes: number; constructionTransientBytes: number; constructionPeakBytes: number;
};
type InspectionOptions = {vertexCap: number; geometryPositionCap?: number};
const littleEndian = new Uint32Array(new Uint8Array([1, 0, 0, 0]).buffer)[0] === 1;

function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`Invalid meshopt ${label}`);
  return value as RecordValue;
}
function cap(value: number | undefined, label: string) {
  if (!Number.isSafeInteger(value) || value! < 1 || value! > 200000) throw Error(`Invalid meshopt ${label} cap`);
  return value!;
}
function stream(value: unknown, codec: Stream['codec'], stride: number, countCap: number): Stream {
  const raw = object(value, 'stream');
  if (Object.keys(raw).some(key => !['codec', 'count', 'stride', 'decodedBytes', 'sha256', 'data'].includes(key)) || raw.codec !== codec || raw.stride !== stride ||
      !Number.isSafeInteger(raw.count) || (raw.count as number) < 1 || (raw.count as number) > countCap ||
      raw.decodedBytes !== (raw.count as number) * stride || typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256)) throw Error('Invalid meshopt stream identity/count');
  const decodedBytes = raw.decodedBytes as number, maximumEncodedBytes = decodedBytes * 2 + 4096;
  if (typeof raw.data !== 'string' || !raw.data.length || raw.data.length % 4 || raw.data.length > Math.ceil(maximumEncodedBytes / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw.data)) throw Error('Invalid meshopt encoded byte length/base64');
  const encodedBytes = raw.data.length / 4 * 3 - (raw.data.endsWith('==') ? 2 : raw.data.endsWith('=') ? 1 : 0);
  if (encodedBytes > maximumEncodedBytes) throw Error('Meshopt encoded stream budget exceeded');
  return {codec, count: raw.count as number, stride, decodedBytes, sha256: raw.sha256, data: raw.data, encodedBytes};
}
function wait<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const aborted = () => { cleanup(); reject(signal.reason); };
    const cleanup = () => signal.removeEventListener('abort', aborted);
    signal.addEventListener('abort', aborted, {once: true});
    promise.then(value => { cleanup(); if (signal.aborted) reject(signal.reason); else resolve(value); }, error => { cleanup(); reject(error); });
  });
}
async function checkpoint(signal: AbortSignal) { await Promise.resolve(); signal.throwIfAborted(); }
async function decodeStream(plan: Stream, decoder: BuildingDetailMeshoptDecoder, signal: AbortSignal) {
  signal.throwIfAborted();
  const binary = atob(plan.data), encoded = new Uint8Array(plan.encodedBytes);
  for (let i = 0; i < encoded.length; i++) encoded[i] = binary.charCodeAt(i);
  const decoded = new Uint8Array(plan.decodedBytes);
  if (plan.codec === 'vertex') decoder.decodeVertexBuffer(decoded, plan.count, plan.stride, encoded);
  else decoder.decodeIndexSequence(decoded, plan.count, plan.stride, encoded);
  signal.throwIfAborted();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', decoded)); signal.throwIfAborted();
  const actual = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== plan.sha256) throw Error('Meshopt decoded stream SHA256 mismatch');
  // Hash LE wire bytes first. Native typed views then preserve those exact bits.
  if (!littleEndian) for (let i = 0; i < decoded.length; i += 4) {
    const a = decoded[i], b = decoded[i + 1]; decoded[i] = decoded[i + 3]; decoded[i + 1] = decoded[i + 2]; decoded[i + 2] = b; decoded[i + 3] = a;
  }
  return decoded.buffer;
}

// meshoptimizer 1.3.0 decode() requests a four-element-padded target and
// one source allocation in WASM, excluding the module/heap baseline.
function streamDecoderScratch(item: Stream) {
  return Math.ceil(item.count / 4) * 4 * item.stride + item.encodedBytes;
}
function streamTransient(item: Stream, scratch: number) {
  // atob UTF-16 string, encoded Uint8Array, WASM scratch and digest input/result.
  // The decoded target itself is charged separately.
  return item.encodedBytes * 3 + scratch + item.decodedBytes + 32;
}

function planDocument(value: unknown, options: InspectionOptions, keepPlans = false) {
  const raw = object(value, 'document'), vertexCap = cap(options.vertexCap, 'vertex');
  if (options.geometryPositionCap !== undefined) cap(options.geometryPositionCap, 'geometry position');
  if (raw.schema_version !== 1 || raw.encoding !== BUILDING_DETAIL_MESHOPT_ENCODING || !Array.isArray(raw.components) || !raw.components.length || raw.components.length > 20000) throw Error('Invalid meshopt detail document');
  let vertices = 0, indexCount = 0, decodedTypedArrayBytes = 0, encodedBufferBytes = 0, encodedBase64CodeUnits = 0;
  let batchesCount = 0, maxStreamDecodedBytes = 0, maxStreamEncodedBytes = 0, decoderScratchBytes = 0, constructionTransientBytes = 0;
  const plans: ComponentPlan[] = [];
  for (const value of raw.components) {
    const component = object(value, 'component');
    if (!Array.isArray(component.batches) || !component.batches.length || component.batches.length > vertexCap) throw Error('Invalid meshopt component batches');
    const batches: BatchPlan[] = [];
    for (const value of component.batches) {
      const batch = object(value, 'batch'), positions = stream(batch.positions, 'vertex', 12, vertexCap), normals = stream(batch.normals, 'vertex', 12, vertexCap), indices = stream(batch.indices, 'index-sequence', 4, vertexCap * 6);
      if (positions.count !== normals.count || indices.count % 3) throw Error('Meshopt attribute/triangle count mismatch');
      vertices += positions.count; indexCount += indices.count; batchesCount++;
      for (const item of [positions, normals, indices]) {
        decodedTypedArrayBytes += item.decodedBytes; encodedBufferBytes += item.encodedBytes; encodedBase64CodeUnits += item.data.length;
        maxStreamDecodedBytes = Math.max(maxStreamDecodedBytes, item.decodedBytes);
        maxStreamEncodedBytes = Math.max(maxStreamEncodedBytes, item.encodedBytes);
        const scratch = streamDecoderScratch(item);
        decoderScratchBytes = Math.max(decoderScratchBytes, scratch);
        constructionTransientBytes = Math.max(constructionTransientBytes, streamTransient(item, scratch));
      }
      if (vertices > vertexCap || indexCount > vertexCap * 6 || decodedTypedArrayBytes > vertexCap * 48 || encodedBufferBytes > vertexCap * 96 + 4096) throw Error('Meshopt detail cumulative buffer budget exceeded');
      if (keepPlans) batches.push({metadata: batch, positions, normals, indices});
    }
    if (keepPlans) plans.push({metadata: component, batches});
  }
  const inspection: BuildingDetailMeshoptInspection = {
    components: raw.components.length, batches: batchesCount, vertices, triangles: indexCount / 3, streams: batchesCount * 3,
    decodedTypedArrayBytes, encodedBufferBytes, encodedBase64CodeUnits, wireStringBytesEstimate: encodedBase64CodeUnits * 2,
    maxStreamDecodedBytes, maxStreamEncodedBytes, decoderScratchBytes, constructionTransientBytes,
    constructionPeakBytes: decodedTypedArrayBytes + constructionTransientBytes,
  };
  return {raw, plans, inspection};
}

function integer(value: unknown, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) throw Error('Invalid meshopt dictionary batch offset/count');
  return value as number;
}

function planDictionaryDocument(value: unknown, options: InspectionOptions, keepPlans = false) {
  const raw = object(value, 'dictionary document'), vertexCap = cap(options.vertexCap, 'vertex');
  if (options.geometryPositionCap !== undefined) cap(options.geometryPositionCap, 'geometry position');
  if (raw.schema_version !== 1 || raw.encoding !== BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING ||
      !Array.isArray(raw.components) || !raw.components.length || raw.components.length > 20000) throw Error('Invalid meshopt dictionary detail document');
  const tables = object(raw.dictionaries, 'dictionaries'), keys = Object.keys(tables);
  if (keys.length !== dictionaryKeys.length || dictionaryKeys.some(key => !Object.hasOwn(tables, key))) throw Error('Invalid meshopt dictionary stream keys');

  let vertices = 0, indexCount = 0, batchesCount = 0, maxIndexEnd = 0;
  const plans: DictionaryComponentPlan[] = [];
  for (const value of raw.components) {
    const component = object(value, 'dictionary component');
    if (!Array.isArray(component.batches) || !component.batches.length || component.batches.length > vertexCap) throw Error('Invalid meshopt dictionary component batches');
    const batches: DictionaryBatchPlan[] = [];
    for (const value of component.batches) {
      const batch = object(value, 'dictionary batch');
      if (Object.hasOwn(batch, 'positions') || Object.hasOwn(batch, 'normals') || Object.hasOwn(batch, 'indices')) throw Error('Unexpected inline meshopt dictionary batch stream');
      const count = integer(batch.vertices, 1, vertexCap - vertices), indices = integer(batch.indexCount, 3, vertexCap * 6 - indexCount);
      const vertexOffset = integer(batch.vertexOffset, vertices, vertices), indexOffset = integer(batch.indexOffset, 0, vertexCap * 6 - indices);
      if (indices % 3) throw Error('Meshopt dictionary triangle count mismatch');
      vertices += count; indexCount += indices; batchesCount++;
      maxIndexEnd = Math.max(maxIndexEnd, indexOffset + indices);
      if (keepPlans) batches.push({metadata: batch, vertexOffset, vertices: count, indexOffset, indexCount: indices});
    }
    if (keepPlans) plans.push({metadata: component, batches});
  }

  const positions = stream(tables.positions, 'vertex', 12, vertices), normals = stream(tables.normals, 'vertex', 12, vertices);
  const positionReferences = stream(tables.positionReferences, 'index-sequence', 4, vertices), normalReferences = stream(tables.normalReferences, 'index-sequence', 4, vertices);
  const indices = stream(tables.indices, 'index-sequence', 4, indexCount);
  if (positionReferences.count !== vertices || normalReferences.count !== vertices) throw Error('Meshopt dictionary vertex reference count mismatch');
  if (maxIndexEnd > indices.count) throw Error('Meshopt dictionary index slice exceeds stream');
  const streams = [positions, normals, positionReferences, normalReferences, indices];
  let dictionaryBytes = 0, encodedBufferBytes = 0, encodedBase64CodeUnits = 0;
  let maxStreamDecodedBytes = 0, maxStreamEncodedBytes = 0, decoderScratchBytes = 0, maxStreamTransient = 0;
  for (const item of streams) {
    dictionaryBytes += item.decodedBytes; encodedBufferBytes += item.encodedBytes; encodedBase64CodeUnits += item.data.length;
    maxStreamDecodedBytes = Math.max(maxStreamDecodedBytes, item.decodedBytes);
    maxStreamEncodedBytes = Math.max(maxStreamEncodedBytes, item.encodedBytes);
    const scratch = streamDecoderScratch(item);
    decoderScratchBytes = Math.max(decoderScratchBytes, scratch);
    maxStreamTransient = Math.max(maxStreamTransient, streamTransient(item, scratch));
  }
  const decodedTypedArrayBytes = vertices * 24 + indexCount * 4;
  if (decodedTypedArrayBytes > vertexCap * 48 || encodedBufferBytes > vertexCap * 96 + 4096) throw Error('Meshopt dictionary cumulative buffer budget exceeded');
  // All five decoded input tables stay live through expansion. None is part of
  // the final batch arrays, so charge them in addition to those arrays.
  const constructionTransientBytes = dictionaryBytes + maxStreamTransient;
  const inspection: BuildingDetailMeshoptInspection = {
    components: raw.components.length, batches: batchesCount, vertices, triangles: indexCount / 3, streams: streams.length,
    decodedTypedArrayBytes, encodedBufferBytes, encodedBase64CodeUnits, wireStringBytesEstimate: encodedBase64CodeUnits * 2,
    maxStreamDecodedBytes, maxStreamEncodedBytes, decoderScratchBytes, constructionTransientBytes,
    constructionPeakBytes: decodedTypedArrayBytes + constructionTransientBytes,
  };
  return {raw, plans, positions, normals, positionReferences, normalReferences, indices, inspection};
}

function isDictionaryDocument(value: unknown) {
  return object(value, 'document').encoding === BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING;
}

/** Synchronous admission before codec import, atob or decoded buffer allocation.
 * Counts are exact stream payload lengths; string/transient figures are logical
 * conservative estimates, excluding existing wire metadata, JS containers and
 * the decoder module/retained WASM heap baseline. SOURCE geometry admission stays
 * with the source adapter. Callers reserve through their page-owned ledger before
 * decode and release/transfer that reservation under the same source lease.
 */
export function inspectBuildingDetailMeshopt(value: unknown, options: InspectionOptions): BuildingDetailMeshoptInspection {
  return (isDictionaryDocument(value) ? planDictionaryDocument(value, options) : planDocument(value, options)).inspection;
}

type DecodeOptions = InspectionOptions & {signal: AbortSignal; decoder?: BuildingDetailMeshoptDecoder};
async function readyDecoder(options: DecodeOptions) {
  const {signal} = options;
  const decoder = options.decoder ?? (await wait(import('../vendor/meshoptimizer-1.3.0/meshopt_decoder.mjs'), signal)).MeshoptDecoder;
  if (decoder.supported === false) throw Error('Meshopt decoder is not supported');
  await wait(decoder.ready, signal); signal.throwIfAborted();
  return decoder;
}

function expandAttribute(dictionary: Uint32Array, references: Uint32Array, first: number, count: number) {
  const output = new Uint32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const source = references[first + i] * 3, target = i * 3;
    output[target] = dictionary[source];
    output[target + 1] = dictionary[source + 1];
    output[target + 2] = dictionary[source + 2];
  }
  return new Float32Array(output.buffer);
}

async function decodeDictionaryDocument(value: unknown, options: DecodeOptions): Promise<DecodedBuildingDetailMeshopt> {
  const {signal} = options, plan = planDictionaryDocument(value, options, true);
  signal.throwIfAborted();
  const decoder = await readyDecoder(options);
  const positionBits = new Uint32Array(await decodeStream(plan.positions, decoder, signal));
  const normalBits = new Uint32Array(await decodeStream(plan.normals, decoder, signal));
  const positionRefs = new Uint32Array(await decodeStream(plan.positionReferences, decoder, signal));
  const normalRefs = new Uint32Array(await decodeStream(plan.normalReferences, decoder, signal));
  const indexTable = new Uint32Array(await decodeStream(plan.indices, decoder, signal));
  for (const position of new Float32Array(positionBits.buffer)) if (!Number.isFinite(position) || Math.abs(position) > 1e6) throw Error('Invalid meshopt dictionary position');
  for (const normal of new Float32Array(normalBits.buffer)) if (!Number.isFinite(normal)) throw Error('Invalid meshopt dictionary normal');
  for (const reference of positionRefs) if (reference >= plan.positions.count) throw Error('Meshopt dictionary position reference range exceeded');
  for (const reference of normalRefs) if (reference >= plan.normals.count) throw Error('Meshopt dictionary normal reference range exceeded');

  const components: BuildingDetailMeshoptComponent[] = [];
  for (const component of plan.plans) {
    const batches: BuildingDetailMeshoptBatch[] = [];
    for (const batch of component.batches) {
      await checkpoint(signal);
      const end = batch.indexOffset + batch.indexCount;
      for (let i = batch.indexOffset; i < end; i++) if (indexTable[i] >= batch.vertices) throw Error('Meshopt dictionary triangle index range exceeded');
      const positions = expandAttribute(positionBits, positionRefs, batch.vertexOffset, batch.vertices);
      const normals = expandAttribute(normalBits, normalRefs, batch.vertexOffset, batch.vertices);
      const indices = indexTable.slice(batch.indexOffset, end);
      const {vertexOffset, vertices, indexOffset, indexCount, ...metadata} = batch.metadata;
      batches.push({...metadata, positions, normals, indices});
    }
    components.push({...component.metadata, batches}); await checkpoint(signal);
  }
  signal.throwIfAborted();
  const {dictionaries, ...metadata} = plan.raw;
  return {...metadata, encoding: BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING, components};
}

/** Lossless render attributes only. SOURCE geometry/identity and material admission
 * remain the source adapter's responsibility. No quantization, filters, cache,
 * worker pool, alternate levels or plain-number attribute copies are created.
 */
export async function decodeBuildingDetailMeshopt(value: unknown, options: DecodeOptions): Promise<DecodedBuildingDetailMeshopt> {
  const {signal} = options; signal.throwIfAborted();
  if (isDictionaryDocument(value)) return decodeDictionaryDocument(value, options);
  // Validate the entire selected leaf's declared allocation before decoder import or buffers.
  const {raw, plans} = planDocument(value, options, true); signal.throwIfAborted();
  const decoder = await readyDecoder(options);
  const components: BuildingDetailMeshoptComponent[] = [];
  for (const component of plans) {
    const batches: BuildingDetailMeshoptBatch[] = [];
    for (const batch of component.batches) {
      await checkpoint(signal);
      const positions = new Float32Array(await decodeStream(batch.positions, decoder, signal)), normals = new Float32Array(await decodeStream(batch.normals, decoder, signal)), indices = new Uint32Array(await decodeStream(batch.indices, decoder, signal));
      for (const position of positions) if (!Number.isFinite(position) || Math.abs(position) > 1e6) throw Error('Invalid meshopt position');
      for (const normal of normals) if (!Number.isFinite(normal)) throw Error('Invalid meshopt normal');
      for (const index of indices) if (index >= batch.positions.count) throw Error('Meshopt triangle index range exceeded');
      batches.push({...batch.metadata, positions, normals, indices});
    }
    components.push({...component.metadata, batches}); await checkpoint(signal);
  }
  signal.throwIfAborted();
  return {...raw, encoding: BUILDING_DETAIL_MESHOPT_ENCODING, components};
}

function planJSONDocument(value: unknown, options: InspectionOptions, keepPlans = false) {
  const raw = object(value, 'JSON document'), vertexCap = cap(options.vertexCap, 'vertex');
  if (options.geometryPositionCap !== undefined) cap(options.geometryPositionCap, 'geometry position');
  if (raw.schema_version !== 1 || (raw.encoding !== undefined && raw.encoding !== 'json') ||
      !Array.isArray(raw.components) || !raw.components.length || raw.components.length > 20000) throw Error('Invalid normalized JSON detail document');
  let vertices = 0, indexCount = 0, elements = 0, batchesCount = 0;
  const plans: JSONComponentPlan[] = [];
  for (const value of raw.components) {
    const component = object(value, 'JSON component');
    if (!Array.isArray(component.batches) || !component.batches.length || component.batches.length > vertexCap) throw Error('Invalid normalized JSON component batches');
    const batches: JSONBatchPlan[] = [];
    for (const value of component.batches) {
      const batch = object(value, 'JSON batch'), {positions, normals, indices} = batch;
      if (!Array.isArray(positions) || !positions.length || positions.length % 3 || !Array.isArray(normals) || normals.length !== positions.length ||
          !Array.isArray(indices) || !indices.length || indices.length % 3) throw Error('Invalid normalized JSON attribute/triangle counts');
      const count = positions.length / 3;
      vertices += count; indexCount += indices.length; elements += positions.length + normals.length + indices.length; batchesCount++;
      if (vertices > vertexCap || indexCount > vertexCap * 6 || elements * 4 > vertexCap * 48) throw Error('Normalized JSON detail cumulative buffer budget exceeded');
      // JSON numbers must already be the exact values of the original Float32
      // attributes. fround is only an equality test here, never a conversion.
      for (const position of positions) if (typeof position !== 'number' || !Number.isFinite(position) || Math.abs(position) > 1e6 || !Object.is(Math.fround(position), position)) throw Error('Invalid normalized JSON Float32 position');
      for (const normal of normals) if (typeof normal !== 'number' || !Number.isFinite(normal) || !Object.is(Math.fround(normal), normal)) throw Error('Invalid normalized JSON Float32 normal');
      for (const index of indices) if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw Error('Normalized JSON triangle index range exceeded');
      if (keepPlans) batches.push({metadata: batch, positions, normals, indices});
    }
    if (keepPlans) plans.push({metadata: component, batches});
  }
  const inspection: BuildingDetailJSONInspection = {
    components: raw.components.length, batches: batchesCount, vertices, triangles: indexCount / 3, streams: batchesCount * 3,
    decodedTypedArrayBytes: elements * 4, sourceNumberArrayBytesEstimate: elements * 8,
    constructionTransientBytes: 0, constructionPeakBytes: elements * 4,
  };
  return {raw, plans, inspection};
}

/** Admission for a producer-normalized JSON replacement, not a canonical shard.
 * The typed payload is exact. Existing number-array payload is estimated at eight
 * bytes per element; JS containers, wire strings, SOURCE geometry and metadata
 * remain with the caller's source reservation. Construction directly fills the
 * final typed arrays, without codec scratch or intermediate attribute copies.
 */
export function inspectBuildingDetailJSON(value: unknown, options: InspectionOptions): BuildingDetailJSONInspection {
  return planJSONDocument(value, options).inspection;
}

/** Restore only the three render streams. Do not run the canonical normalizer:
 * normalized SOURCE/material metadata is part of the replacement's proof hash.
 */
export async function decodeBuildingDetailJSON(value: unknown, options: InspectionOptions & {signal: AbortSignal}): Promise<DecodedBuildingDetailJSON> {
  const {signal} = options; signal.throwIfAborted();
  const {raw, plans} = planJSONDocument(value, options, true); signal.throwIfAborted();
  const components: BuildingDetailMeshoptComponent[] = [];
  for (const component of plans) {
    const batches: BuildingDetailMeshoptBatch[] = [];
    for (const batch of component.batches) {
      await checkpoint(signal); signal.throwIfAborted();
      const positions = new Float32Array(batch.positions), normals = new Float32Array(batch.normals), indices = new Uint32Array(batch.indices);
      batches.push({...batch.metadata, positions, normals, indices});
    }
    components.push({...component.metadata, batches});
  }
  signal.throwIfAborted();
  return {...raw, components};
}
