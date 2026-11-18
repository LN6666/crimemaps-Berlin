import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// The isolated codec copy uses the unchanged product dependency and vendored 1.3 decoder.
const product = process.env.CRIMEMAPS_PRODUCT_ROOT ?? fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(product, 'web/package.json'));
const {build} = require('esbuild');
const vendor = path.join(product, 'web/src/vendor/meshoptimizer-1.3.0/meshopt_decoder.mjs');
const {MeshoptDecoder} = await import(pathToFileURL(vendor));
await MeshoptDecoder.ready;
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/safety/building-detail-meshopt.ts', import.meta.url))],
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{name: 'unchanged-meshopt-vendor', setup(builder) {
    builder.onResolve({filter: /^\.\.\/vendor\/meshoptimizer-1\.3\.0\/meshopt_decoder\.mjs$/}, () => ({path: vendor}));
  }}],
});
const {
  BUILDING_DETAIL_MESHOPT_DICTIONARY_ENCODING: dictionaryEncoding,
  decodeBuildingDetailMeshopt: decode, inspectBuildingDetailMeshopt: inspect,
} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const vertex = (count, sha256, data) => ({codec: 'vertex', count, stride: 12, decodedBytes: count * 12, sha256, data});
const sequence = (count, sha256, data) => ({codec: 'index-sequence', count, stride: 4, decodedBytes: count * 4, sha256, data});
// Verified meshoptimizer 1.3 vectors, independent of an encoder installation.
const streams = {
  positions: vertex(4, 'ccc97f68ac9d33c51f8267a805fa1b679f03818d19fc71a35c3285ffdc8ef4b3', 'ofr/+gD/X+gAgQIAACwAAABUAAAACN/AAIZ/AACPj6wA/gACAAAAAAAAAAAAAAAAgOrW/D0AAEjBAAAA'),
  normals: vertex(4, '3ba85a1b18357b59d0e491fc3b4d9f9d697e54b3836dc4d5a263a71c94643a26', 'of/6/wAAGRoAAAgHAABqlgD/fgAA/wAAAIL/AAAAGRoAAAgHAP+VaQCB/4IAAAAAAAAAAAAAAACAAACAPwAAAAAAAAA='),
  positionReferences: sequence(8, '49c89efb9318fef1cf819aa681a36923946dfb71503d9a1c520e25f56e8f9cc9', '0QAEAgwCBgwGAAAAAA=='),
  normalReferences: sequence(8, '72f05e782e29a40c1eb83200f15e3407e29bdd3123b6cf17dc6ec934cf73f093', '0QQCBAQEBgQGAAAAAA=='),
  indices: sequence(6, '7daa62fa3584c0ab83d56383f6c5ba18d3451a2b72b144bec8c6c348fa5c3eb1', '0QgGBAgGAgAAAAA='),
};
const bad = {
  reference: sequence(8, 'b3e7d255dc49a3c1ada4425f5479b9025d1e74bece017c6c4be410dfc4160a73', '0RAKAgwCBgwGAAAAAA=='),
  index: sequence(6, 'aa99e173ec3ca763aca7ae2de408e15e1891bc8f45b536d4e358d4be65e7cbea', '0RAOBAgGAgAAAAA='),
  position: vertex(1, 'a77f0f81f951939f31f2ab23afc46f87f870ba95960289048d680e525a49cd25', 'oaqqqgAAAAAAAAAAABAkdMkAAAAAAAAAAAAAAA=='),
  normal: vertex(1, 'e1281377c62ef575f0405c8e4e50d29f6fee061f808f5748a62d4321fb7492ab', 'oaqqqgAAAAAAAAAAAAAAgH8AAAAAAAAAAAAAAA=='),
};
const dictionaries = () => structuredClone(streams);
const positions = [-0, 0.123456791, -12.5, 1, -0, 2, 3.25, 4.5, 5.75, 6.125, 7.5, 8.875];
const normals = [-0, 1, 0, 0, -0, -1, 0.707106769, 0, 0.707106769, 1, 0, -0];
const expand = (values, refs) => Float32Array.from(refs.flatMap(i => values.slice(i * 3, i * 3 + 3)));
const bytes = value => new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
const options = (extra = {}) => ({signal: new AbortController().signal, vertexCap: 8, ...extra});

function document() {
  const batches = [0, 1].map(i => ({vertexOffset: i * 4, vertices: 4, indexOffset: i * 3, indexCount: 3,
    color: [.4, .5, .6], materialName: 'original', faceRole: 'roof'}));
  return {schema_version: 1, city: 'dusseldorf', encoding: dictionaryEncoding,
    detail_variant: {geometrySHA256: 'a'.repeat(64)}, dictionaries: dictionaries(),
    components: batches.map((batch, i) => ({objectId: `osm/way/${i + 1}`, partId: `part/${i}`,
      sourceFeature: {type: 'Feature', geometry: null}, batches: [batch]}))};
}

test('preflight admits the final independent buffers, all five decoded dictionaries and max stream overlap before atob', () => {
  const doc = document();
  const encoded = Object.values(streams).map(s => ({...s, bytes: Buffer.from(s.data, 'base64').length}));
  const scratch = s => Math.ceil(s.count / 4) * 4 * s.stride + s.bytes;
  const dictionaryBytes = encoded.reduce((n, s) => n + s.decodedBytes, 0);
  const overlap = Math.max(...encoded.map(s => s.bytes * 3 + scratch(s) + s.decodedBytes + 32));
  const final = 8 * 24 + 6 * 4;
  const originalAtob = globalThis.atob;
  try {
    globalThis.atob = () => assert.fail('preflight must not decode');
    const result = inspect(doc, options());
    assert.equal(result.streams, 5);
    assert.equal(result.vertices, 8);
    assert.equal(result.triangles, 2);
    assert.equal(result.decodedTypedArrayBytes, final);
    assert.equal(result.constructionTransientBytes, dictionaryBytes + overlap);
    assert.equal(result.constructionPeakBytes, final + dictionaryBytes + overlap);
  } finally {
    globalThis.atob = originalAtob;
  }
});

test('actual vendored decoder restores global vertex references and local triangle slices bit-for-bit', async () => {
  const doc = document(), decoded = await decode(doc, options());
  assert.equal(decoded.encoding, dictionaryEncoding);
  assert.equal(decoded.detail_variant, doc.detail_variant);
  assert(!Object.hasOwn(decoded, 'dictionaries'));
  const seen = new Set();
  for (const [i, component] of decoded.components.entries()) {
    assert.equal(component.sourceFeature, doc.components[i].sourceFeature);
    const batch = component.batches[0];
    const p = i ? [2,0,3,1] : [0,1,0,3], n = i ? [3,1,2,0] : [1,0,1,2];
    assert.deepEqual(bytes(batch.positions), bytes(expand(positions, p)));
    assert.deepEqual(bytes(batch.normals), bytes(expand(normals, n)));
    assert.deepEqual([...batch.indices], i ? [3,1,0] : [2,0,1]);
    assert.equal(batch.materialName, 'original');
    assert.equal(batch.faceRole, 'roof');
    assert(!Object.hasOwn(batch, 'vertexOffset') && !Object.hasOwn(batch, 'indexCount'));
    for (const array of [batch.positions, batch.normals, batch.indices]) {
      assert.equal(array.byteOffset, 0);
      assert.equal(array.byteLength, array.buffer.byteLength);
      assert(!seen.has(array.buffer));
      seen.add(array.buffer);
    }
  }
  assert(Object.is(decoded.components[0].batches[0].positions[0], -0));
  assert(Object.is(decoded.components[0].batches[0].normals[1], -0));
  assert.equal(doc.components[1].batches[0].vertexOffset, 4);
  doc.components[1].batches[0].indexOffset = 0;
  const shared = await decode(doc, options());
  assert.deepEqual([...shared.components[1].batches[0].indices], [2,0,1]);
  assert.notEqual(shared.components[0].batches[0].indices.buffer, shared.components[1].batches[0].indices.buffer);
});

test('bad dictionary metadata is rejected before any decoder lookup', async () => {
  const mutations = [
    doc => { delete doc.dictionaries.normalReferences; },
    doc => { doc.dictionaries.extra = {...streams.positions}; },
    doc => { doc.dictionaries.positionReferences = {...streams.indices}; },
    doc => { doc.dictionaries.positions.decodedBytes++; },
    doc => { doc.dictionaries.normals.data = 'A'.repeat(10000); },
    doc => { doc.components[1].batches[0].vertexOffset = 5; },
    doc => { doc.components[0].batches[0].vertices = 9; },
    doc => { doc.components[0].batches[0].indexCount = 4; },
    doc => { doc.components[1].batches[0].indexOffset = 4; },
    doc => { doc.components[1].batches[0].indices = {...streams.indices}; },
  ];
  for (const mutate of mutations) {
    const doc = document(); mutate(doc);
    assert.throws(() => inspect(doc, options()), /meshopt/i);
    await assert.rejects(decode(doc, {...options(), get decoder() { assert.fail('decoder must not be acquired'); }}), /meshopt/i);
  }
});

test('valid compressed streams independently check raw SHA, reference range, local indices and finite attributes', async () => {
  const mutations = [
    [doc => { doc.dictionaries.indices.sha256 = '0'.repeat(64); }, /SHA256 mismatch/],
    [doc => { doc.dictionaries.positionReferences = bad.reference; }, /position reference range/],
    [doc => { doc.dictionaries.normalReferences = bad.reference; }, /normal reference range/],
    [doc => { doc.dictionaries.indices = bad.index; }, /triangle index range/],
    [doc => { doc.dictionaries.positions = bad.position; }, /dictionary position/],
    [doc => { doc.dictionaries.normals = bad.normal; }, /dictionary normal/],
  ];
  for (const [mutate, reason] of mutations) {
    const doc = document(); mutate(doc);
    assert.equal(inspect(doc, options()).streams, 5);
    await assert.rejects(decode(doc, options({decoder: MeshoptDecoder})), reason);
  }
});

test('abort after the first actual dictionary stream prevents later decode and publication', async () => {
  const abort = new AbortController(); let calls = 0;
  const decoder = {
    ready: Promise.resolve(),
    decodeVertexBuffer(...args) {
      calls++;
      MeshoptDecoder.decodeVertexBuffer(...args);
      abort.abort();
    },
    decodeIndexSequence() { assert.fail('a later stream must not decode'); },
  };
  await assert.rejects(decode(document(), options({signal: abort.signal, decoder})), /abort/i);
  assert.equal(calls, 1);
});
