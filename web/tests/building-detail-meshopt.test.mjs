import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';

const {MeshoptDecoder} = await import(new URL('../src/vendor/meshoptimizer-1.3.0/meshopt_decoder.mjs', import.meta.url));
await MeshoptDecoder.ready;
const compiled = await build({entryPoints: [new URL('../src/safety/building-detail-meshopt.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {decodeBuildingDetailMeshopt, inspectBuildingDetailMeshopt, decodeBuildingDetailJSON, inspectBuildingDetailJSON} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text + '\n//# sourceURL=building-detail-meshopt-under-test.js').toString('base64'));
const rawBytes = values => new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
// Verified meshoptimizer 1.3.0 vectors; default CI needs only the vendored decoder.
const vectors = {
  positions: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: 'ccc97f68ac9d33c51f8267a805fa1b679f03818d19fc71a35c3285ffdc8ef4b3', data: 'ofr/+gD/X+gAgQIAACwAAABUAAAACN/AAIZ/AACPj6wA/gACAAAAAAAAAAAAAAAAgOrW/D0AAEjBAAAA'},
  normals: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: '3ba85a1b18357b59d0e491fc3b4d9f9d697e54b3836dc4d5a263a71c94643a26', data: 'of/6/wAAGRoAAAgHAABqlgD/fgAA/wAAAIL/AAAAGRoAAAgHAP+VaQCB/4IAAAAAAAAAAAAAAACAAACAPwAAAAAAAAA='},
  indices: {codec: 'index-sequence', count: 6, stride: 4, decodedBytes: 24, sha256: '7daa62fa3584c0ab83d56383f6c5ba18d3451a2b72b144bec8c6c348fa5c3eb1', data: '0QgGBAgGAgAAAAA='},
  invalidIndex: {codec: 'index-sequence', count: 3, stride: 4, decodedBytes: 12, sha256: 'e9df879ac2410b03261a92cd22d1f967bc107f8a4cdfa343f43027fa5e654156', data: '0QAEDAAAAAA='},
};
function fixture() {
  const positions = new Float32Array([-0, 0.123456791, -12.5, 1, -0, 2, 3.25, 4.5, 5.75, 6.125, 7.5, 8.875]);
  const normals = new Float32Array([-0, 1, 0, 0, -0, -1, 0.707106769, 0, 0.707106769, 1, 0, -0]);
  const indices = new Uint32Array([2, 0, 1, 3, 1, 0]);
  const batch = {positions: {...vectors.positions}, normals: {...vectors.normals}, indices: {...vectors.indices}, color: [.4, .5, .6], materialName: 'original', faceRole: 'roof', arbitraryBatchMetadata: {unchanged: true}};
  const component = {objectId: 'osm/way/1', partId: 'component/1', city: 'berlin', origin: [13, 52], componentGeometry: {type: 'Polygon', coordinates: []}, sourceFeature: {type: 'Feature', geometry: null, properties: {name: 'source'}}, arbitraryComponentMetadata: {unchanged: true}, batches: [batch]};
  return {positions, normals, indices, document: {schema_version: 1, city: 'berlin', encoding: 'meshopt-lossless-f32-v1', detail_variant: {geometrySHA256: 'a'.repeat(64)}, components: [component]}};
}
const options = (extra = {}) => ({signal: new AbortController().signal, vertexCap: 20, decoder: MeshoptDecoder, ...extra});

test('synchronous preflight counts exact wire/typed payloads and conservative sequential construction before atob or decoder use', () => {
  const f = fixture(), values = [vectors.positions, vectors.normals, vectors.indices];
  const streams = values.map(value => ({...value, encodedBytes: Buffer.from(value.data, 'base64').length}));
  const decodedBytes = streams.reduce((sum, value) => sum + value.decodedBytes, 0), encodedBytes = streams.reduce((sum, value) => sum + value.encodedBytes, 0);
  const scratch = value => Math.ceil(value.count / 4) * 4 * value.stride + value.encodedBytes;
  const transient = Math.max(...streams.map(value => value.encodedBytes * 3 + scratch(value) + value.decodedBytes + 32));
  const originalAtob = globalThis.atob;let inspection;
  globalThis.atob = () => { throw Error('preflight must not decode base64'); };
  try { inspection = inspectBuildingDetailMeshopt(f.document, {vertexCap: 4, geometryPositionCap: 20}); }
  finally { globalThis.atob = originalAtob; }
  assert.deepEqual(inspection, {components: 1, batches: 1, vertices: 4, triangles: 2, streams: 3,
    decodedTypedArrayBytes: decodedBytes, encodedBufferBytes: encodedBytes,
    encodedBase64CodeUnits: values.reduce((sum, value) => sum + value.data.length, 0),
    wireStringBytesEstimate: values.reduce((sum, value) => sum + value.data.length * 2, 0),
    maxStreamDecodedBytes: Math.max(...streams.map(value => value.decodedBytes)), maxStreamEncodedBytes: Math.max(...streams.map(value => value.encodedBytes)),
    decoderScratchBytes: Math.max(...streams.map(scratch)), constructionTransientBytes: transient, constructionPeakBytes: decodedBytes + transient});
  assert.equal(f.document.components[0].batches[0].positions.codec, 'vertex');
  assert.throws(() => inspectBuildingDetailMeshopt(f.document, {vertexCap: 3}), /meshopt|Meshopt/);
  assert.throws(() => inspectBuildingDetailMeshopt(f.document, {vertexCap: 200001}), /cap/);
  assert.throws(() => inspectBuildingDetailMeshopt(f.document, {vertexCap: 4, geometryPositionCap: 200001}), /cap/);
});

test('verified meshoptimizer 1.3 vectors decode exact Float32 bits, negative zero, triangle order and metadata', async () => {
  const f = fixture(), decoded = await decodeBuildingDetailMeshopt(f.document, options());
  const original = f.document.components[0], component = decoded.components[0], batch = component.batches[0];
  assert(batch.positions instanceof Float32Array); assert(batch.normals instanceof Float32Array); assert(batch.indices instanceof Uint32Array);
  assert.deepEqual(rawBytes(batch.positions), rawBytes(f.positions)); assert.deepEqual(rawBytes(batch.normals), rawBytes(f.normals)); assert.deepEqual(rawBytes(batch.indices), rawBytes(f.indices));
  assert(Object.is(batch.positions[0], -0)); assert(Object.is(batch.normals[4], -0)); assert.deepEqual([...batch.indices], [2, 0, 1, 3, 1, 0]);
  assert.equal(component.sourceFeature, original.sourceFeature); assert.equal(component.componentGeometry, original.componentGeometry); assert.equal(component.arbitraryComponentMetadata, original.arbitraryComponentMetadata);
  assert.equal(batch.arbitraryBatchMetadata, original.batches[0].arbitraryBatchMetadata); assert.equal(batch.color, original.batches[0].color); assert.equal(batch.materialName, 'original'); assert.equal(batch.faceRole, 'roof');
  assert.equal(decoded.encoding, f.document.encoding); assert.equal(decoded.detail_variant, f.document.detail_variant);
  assert.equal(f.document.components[0].batches[0].positions.codec, 'vertex', 'the caller wire object is not rewritten or decoded into plain arrays');
});
test('default browser decoder is loaded lazily for a valid meshopt leaf and restores the same exact attributes', async () => {
  const f = fixture(), decoded = await decodeBuildingDetailMeshopt(f.document, {signal: new AbortController().signal, vertexCap: 20});
  assert.deepEqual(rawBytes(decoded.components[0].batches[0].positions), rawBytes(f.positions));
});
test('wire identity, count, encoded size and cumulative allocation fail before decoder readiness or decode work', async () => {
  const mutations = [
    doc => { doc.components[0].batches[0].positions.count = 200001; },
    doc => { doc.components[0].batches[0].normals.count = 3; doc.components[0].batches[0].normals.decodedBytes = 36; },
    doc => { doc.components[0].batches[0].indices.count = 5; doc.components[0].batches[0].indices.decodedBytes = 20; },
    doc => { doc.components[0].batches[0].positions.decodedBytes++; },
    doc => { doc.components[0].batches[0].positions.data = 'A'.repeat(12000); },
    doc => { doc.components[0].batches[0].positions.data = '!!!!'; },
    doc => { doc.components[0].batches[0].positions.filter = 'EXPONENTIAL'; },
    doc => { doc.components[0].batches.push(doc.components[0].batches[0]); },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f.document); let readyReads = 0;
    const decoder = {get ready() { readyReads++; throw Error('decoder must not initialize'); }};
    assert.throws(() => inspectBuildingDetailMeshopt(f.document, {vertexCap: 4}), /meshopt|Meshopt/);
    await assert.rejects(decodeBuildingDetailMeshopt(f.document, options({vertexCap: 4, decoder})), /meshopt|Meshopt/); assert.equal(readyReads, 0);
  }
});
test('decoded raw SHA and triangle indices are independently checked even when encoded streams are valid', async () => {
  const badHash = fixture(); badHash.document.components[0].batches[0].positions.sha256 = '0'.repeat(64);
  await assert.rejects(decodeBuildingDetailMeshopt(badHash.document, options()), /SHA256 mismatch/);
  const badIndex = fixture(); badIndex.document.components[0].batches[0].indices = {...vectors.invalidIndex};
  await assert.rejects(decodeBuildingDetailMeshopt(badIndex.document, options()), /index range/);
});
test('aborting pending decoder readiness rejects promptly and its late completion cannot decode or return a resource', async () => {
  const f = fixture(), abort = new AbortController(); let finish, entered, calls = 0;
  const ready = new Promise(resolve => { finish = resolve; }), readyEntered = new Promise(resolve => { entered = resolve; });
  const decoder = {get ready() { entered(); return ready; }, decodeVertexBuffer() { calls++; }, decodeIndexSequence() { calls++; }};
  const pending = decodeBuildingDetailMeshopt(f.document, options({signal: abort.signal, decoder}));
  await readyEntered; abort.abort(); await assert.rejects(pending, /abort/i); finish(); await Promise.resolve(); assert.equal(calls, 0);
});
test('cancellation between real stream decodes stops later batches, and canonical/plain input never acquires a decoder', async () => {
  const f = fixture(), abort = new AbortController(); let calls = 0;
  const decoder = {ready: Promise.resolve(), decodeVertexBuffer(...args) { calls++; MeshoptDecoder.decodeVertexBuffer(...args); abort.abort(); }, decodeIndexSequence(...args) { calls++; MeshoptDecoder.decodeIndexSequence(...args); }};
  await assert.rejects(decodeBuildingDetailMeshopt(f.document, options({signal: abort.signal, decoder})), /abort/i); assert.equal(calls, 1);
  const plain = fixture().document; delete plain.encoding; let acquisitions = 0;
  await assert.rejects(decodeBuildingDetailMeshopt(plain, {...options(), get decoder() { acquisitions++; return MeshoptDecoder; }}), /Invalid meshopt detail document/);
  assert.equal(acquisitions, 0);
});

function jsonFixture(encoding) {
  const f = fixture();delete f.document.encoding;
  if (encoding !== undefined) f.document.encoding = encoding;
  const component = f.document.components[0], batch = component.batches[0];
  for (const key of ['positions', 'normals', 'indices']) batch[key] = Array.from(f[key]);
  component.displayEstimates = {footprintAreaM2: 0.1, source: 'unchanged normalized metadata'};
  return f;
}

test('normalized JSON restores exact streams and preserves every metadata key without canonical flags', async () => {
  for (const encoding of [undefined, 'json']) {
    const f = jsonFixture(encoding), original = f.document.components[0], before = original.batches[0];
    const inspection = inspectBuildingDetailJSON(f.document, {vertexCap: 4, geometryPositionCap: 20});
    const bytes = f.positions.byteLength + f.normals.byteLength + f.indices.byteLength;
    assert.deepEqual(inspection, {components: 1, batches: 1, vertices: 4, triangles: 2, streams: 3,
      decodedTypedArrayBytes: bytes, sourceNumberArrayBytesEstimate: bytes * 2, constructionTransientBytes: 0, constructionPeakBytes: bytes});
    const decoded = await decodeBuildingDetailJSON(f.document, {signal: new AbortController().signal, vertexCap: 4});
    const component = decoded.components[0], batch = component.batches[0];
    assert.deepEqual(Object.keys(decoded), Object.keys(f.document));
    assert.deepEqual(Object.keys(component), Object.keys(original));assert.deepEqual(Object.keys(batch), Object.keys(before));
    for (const key of Object.keys(f.document).filter(key => key !== 'components')) assert.equal(decoded[key], f.document[key]);
    for (const key of Object.keys(original).filter(key => key !== 'batches')) assert.equal(component[key], original[key]);
    for (const key of Object.keys(before).filter(key => !['positions', 'normals', 'indices'].includes(key))) assert.equal(batch[key], before[key]);
    for (const key of ['positions', 'normals', 'indices']) assert.deepEqual(rawBytes(batch[key]), rawBytes(f[key]));
    assert(Object.is(batch.positions[0], -0));assert(Object.is(batch.normals[4], -0));
    assert.equal(component.displayEstimates, original.displayEstimates);assert.equal(Object.hasOwn(component.displayEstimates, 'render_attributes_float32'), false);
    assert.equal(Object.hasOwn(decoded, 'encoding'), encoding !== undefined);assert.equal(decoded.encoding, encoding);
    assert(Array.isArray(before.positions));assert(Object.is(before.positions[0], -0));
  }
});

test('normalized JSON rejects invalid whole-leaf counts, non-Float32 numbers and indices before typed expansion', async () => {
  const mutations = [
    doc => { doc.components[0].batches[0].normals.pop(); },
    doc => { doc.components[0].batches[0].indices.push(0); },
    doc => { doc.components[0].batches[0].indices[0] = 4; },
    doc => { doc.components[0].batches[0].indices[0] = 0.5; },
    doc => { doc.components[0].batches[0].positions[0] = NaN; },
    doc => { doc.components[0].batches[0].positions[0] = 0.1; },
    doc => { doc.components[0].batches[0].normals[0] = 0.1; },
    doc => { doc.components[0].batches[0].indices = Array(27).fill(0); },
    doc => { doc.components[0].batches.push(doc.components[0].batches[0]); },
    doc => { doc.encoding = 'meshopt-lossless-f32-v1'; },
  ];
  for (const mutate of mutations) {
    const f = jsonFixture();mutate(f.document);
    assert.throws(() => inspectBuildingDetailJSON(f.document, {vertexCap: 4}), /JSON/);
    await assert.rejects(decodeBuildingDetailJSON(f.document, {signal: new AbortController().signal, vertexCap: 4}), /JSON/);
  }
  const invalidTail = jsonFixture();invalidTail.document.components.push(jsonFixture().document.components[0]);
  invalidTail.document.components[1].batches[0].normals[0] = 0.1;
  const NativeFloat32Array = globalThis.Float32Array;let allocations = 0;
  globalThis.Float32Array = class extends NativeFloat32Array { constructor(...args) { allocations++;super(...args); } };
  try {
    await assert.rejects(decodeBuildingDetailJSON(invalidTail.document, {signal: new AbortController().signal, vertexCap: 8}), /Float32 normal/);
  } finally { globalThis.Float32Array = NativeFloat32Array; }
  assert.equal(allocations, 0, 'an invalid later component prevents even the first component allocation');
});

test('normalized JSON observes abort before validation and before the first allocation checkpoint', async () => {
  const f = jsonFixture(), already = new AbortController();already.abort();
  await assert.rejects(decodeBuildingDetailJSON(f.document, {signal: already.signal, vertexCap: 4}), /abort/i);
  const controller = new AbortController(), pending = decodeBuildingDetailJSON(f.document, {signal: controller.signal, vertexCap: 4});
  controller.abort();await assert.rejects(pending, /abort/i);
  assert(Array.isArray(f.document.components[0].batches[0].positions));
  assert(Object.is(f.document.components[0].batches[0].normals[0], -0));
});

const encoderPath = process.env.CRIMEMAPS_MESHOPT_ENCODER ?? (process.env.CRIMEMAPS_MESHOPT_TOOLING ? path.join(process.env.CRIMEMAPS_MESHOPT_TOOLING, 'meshopt_encoder.js') : undefined);
test('optional explicit meshoptimizer 1.3 encoder reproduces the lossless roundtrip', {skip: encoderPath ? false : 'Set CRIMEMAPS_MESHOPT_ENCODER or CRIMEMAPS_MESHOPT_TOOLING to an absolute local path'}, async () => {
  assert(path.isAbsolute(encoderPath), 'the optional encoder path must be explicitly absolute');
  const metadata = JSON.parse(await readFile(path.join(path.dirname(encoderPath), 'package.json'), 'utf8'));
  assert.equal(metadata.name, 'meshoptimizer'); assert.equal(metadata.version, '1.3.0');
  const {MeshoptEncoder} = await import(pathToFileURL(encoderPath).href); await MeshoptEncoder.ready;
  const f = fixture(), batch = f.document.components[0].batches[0];
  for (const key of ['positions', 'normals', 'indices']) {
    const bytes = rawBytes(f[key]), index = key === 'indices', count = index ? f[key].length : f[key].length / 3, stride = index ? 4 : 12;
    const encoded = index ? MeshoptEncoder.encodeIndexSequence(bytes, count, stride) : MeshoptEncoder.encodeVertexBuffer(bytes, count, stride);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), batch[key].sha256);
    batch[key].data = Buffer.from(encoded).toString('base64');
  }
  const decoded = await decodeBuildingDetailMeshopt(f.document, options());
  for (const key of ['positions', 'normals', 'indices']) assert.deepEqual(rawBytes(decoded.components[0].batches[0][key]), rawBytes(f[key]));
});
