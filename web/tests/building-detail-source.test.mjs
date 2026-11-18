import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';

async function module(name, exports = '') {
  const input = exports ? {stdin: {contents: `export * from './${name}';\n${exports}`, resolveDir: new URL('../src/safety/', import.meta.url).pathname, loader: 'ts'}} : {entryPoints: [new URL('../src/safety/' + name, import.meta.url).pathname]};
  const built = await build({...input, bundle: true, platform: 'node', format: 'esm', write: false});
  return import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
}
const {createBuildingDetailSource, createSharedNativeSourcePool, createChunkResourceStore, createResourceBudget} = await module('building-detail-source.ts', "export {createSharedNativeSourcePool} from './shared-native-source';\nexport {createChunkResourceStore} from './render-runtime/chunk-resource-store';\nexport {createResourceBudget} from './render-runtime/resource-budget';");
const {createBuildingDetailResidency} = await module('building-detail-residency.ts');
const {parseBuildingDetailDemand, selectBuildingDetailResource} = await module('building-detail-demand.ts');
const hash = value => createHash('sha256').update(value).digest('hex'), sha = digit => digit.repeat(64);
const bytes = value => new TextEncoder().encode(JSON.stringify(value));
const signal = () => new AbortController().signal;
const rawCost = {retainedPayloadEstimateBytes: 1, typedBufferBytes: 1, estimatedJsContainerBytes: 0, numericSlots: 0, stringCodeUnits: 0, measurement: 'exact-typed-buffers-plus-estimated-js-payload-not-heap'};
const bindings = {sourcePBFSHA256: sha('3'), boundarySHA256: sha('4'), compilerSHA256: sha('5'), sourceSnapshot: 'synthetic-source', materialSHA256: sha('6'), producerSHA256: sha('7'), protectionSHA256: sha('8'), sourceEquivalenceSHA256: sha('9')};
function component(id) {
  const geometry = {type: 'Polygon', coordinates: [[[13, 52], [13.001, 52], [13, 52.001], [13, 52]]]};
  return {city: 'berlin', objectId: `osm/way/${id}`, partId: `component/${id}`, origin: [13, 52], componentGeometry: geometry,
    sourceFeature: {type: 'Feature', id: `osm/way/${id}`, geometry, properties: {name: 'Synthetic source', height: '8'}, source_marker: 'original'},
    retainedMetadata: {protected: false, sourceRevision: 1},
    ...(id === 2 ? {displayEstimates: {source_label: 'retained'}} : {}),
    batches: [{positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], indices: [0, 1, 2], color: [.5, .6, .7], material_slot: {id: 'wall'}, uv: [0, 0, 1, 0, 0, 1]}]};
}
function fixture(compression = 'plain', mutate = () => {}) {
  const components = [component(1), component(2)];
  const header = {schema: 'crimemaps-building-detail-replacement-v1', level: 'coarse', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: sha('2'), geometrySHA256: sha('c'),
    materialSHA256: bindings.materialSHA256, sourceEquivalenceSHA256: bindings.sourceEquivalenceSHA256, producerSHA256: bindings.producerSHA256, protectionSHA256: bindings.protectionSHA256};
  const document = {schema_version: 1, city: 'berlin', components, detail_variant: header, shadow_profile: {old_canonical_signature: true}};
  mutate(document);
  const raw = bytes(document), physical = compression === 'gzip' ? new Uint8Array(gzipSync(raw)) : raw;
  const descriptor = {path: `/safety/buildings3d/detail/coarse.json${compression === 'gzip' ? '.gz' : ''}`, bytes: physical.byteLength, sha256: hash(physical),
    ...(compression === 'gzip' ? {compression: 'gzip', uncompressed_bytes: raw.byteLength, uncompressed_sha256: hash(raw)} : {})};
  const metadata = [1, 2].map(id => ({objectId: `osm/way/${id}`, partId: `component/${id}`, origin: [13, 52], box: [0, 0, 0, 1, 1, 0], protected: false}));
  const resource = {key: `synthetic-${descriptor.sha256}`, city: 'berlin', level: 'coarse', descriptor, geometrySHA256: sha('c'), canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: sha('2'), bindings, vertices: 6, triangles: 2, componentCount: 2, components: metadata};
  return {resource, document, physical, raw};
}
function adapter(data, overrides = {}) {
  const reads = [];
  const source = createBuildingDetailSource({city: 'berlin', readCanonical: async () => { throw Error('display variants must not read the canonical leaf'); },
    readBytes: async (path, currentSignal, maximum) => { reads.push({path, signal: currentSignal, maximum}); return data.physical; }, ...overrides});
  return {source, reads};
}
function encodedFixture(streamFor, mutate = () => {}) {
  const data = fixture('gzip'); data.document.encoding = 'meshopt-lossless-f32-v1';
  for (const component of data.document.components) for (const batch of component.batches) {
    batch.positions = streamFor(new Float32Array(batch.positions), 'vertex', 12);
    batch.normals = streamFor(new Float32Array(batch.normals), 'vertex', 12);
    batch.indices = streamFor(new Uint32Array(batch.indices), 'index-sequence', 4);
  }
  mutate(data.document);
  data.raw = bytes(data.document); data.physical = new Uint8Array(gzipSync(data.raw));
  Object.assign(data.resource.descriptor, {bytes: data.physical.byteLength, sha256: hash(data.physical), uncompressed_bytes: data.raw.byteLength, uncompressed_sha256: hash(data.raw)});
  return data;
}
const passthroughStream = (array, codec, stride) => {
  const raw = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  return {codec, count: raw.byteLength / stride, stride, decodedBytes: raw.byteLength, sha256: hash(raw), data: Buffer.from(raw).toString('base64')};
};

test('plain and physical gzip replacements retain full identity/SOURCE/material metadata and discard the old shadow admission', async () => {
  for (const encoding of ['plain', 'gzip']) {
    const data = fixture(encoding), {source, reads} = adapter(data), acquired = await source.acquire(data.resource, {signal: signal()});
    assert.equal(reads.length, 1); assert.equal(reads[0].maximum, 1024 ** 2);
    const value = acquired.value;
    assert.equal(value.admission.kind, 'display-variant'); assert.equal(value.admission.resourceKey, data.resource.key);
    assert.equal(value.admission.geometrySHA256, data.resource.geometrySHA256); assert.equal(value.verified, undefined);
    assert.equal(value.raw.components.length, 2);
    for (let i = 0; i < 2; i++) {
      const actual = value.raw.components[i], original = data.document.components[i];
      const {batches: _a, ...actualMetadata} = actual, {batches: _b, ...originalMetadata} = original;
      assert.deepEqual(actualMetadata, originalMetadata, 'the codec-added displayEstimates flags must not change the verified producer metadata');
      assert(actual.batches[0].positions instanceof Float32Array); assert(actual.batches[0].indices instanceof Uint32Array);
      assert.deepEqual(actual.batches[0].material_slot, original.batches[0].material_slot); assert.deepEqual(actual.batches[0].uv, original.batches[0].uv);
    }
    assert(value.raw.decodedPayloadCost.typedBufferBytes > 0);
    const publication = acquired.retain('main'), opaque = acquired.retainResource('picking'), metadataBeforeRelease = structuredClone(publication.value.raw.components[0].sourceFeature);
    assert.equal(opaque.role, 'picking'); assert.equal(opaque.context, undefined); assert.equal(opaque.epoch, undefined);
    acquired.release(); acquired.release();
    assert.throws(() => acquired.value, /released/);
    assert.deepEqual(publication.value.raw.components[0].sourceFeature, metadataBeforeRelease, 'a publication owns an independent live source lease');
    publication.release();
    assert(opaque.value, 'opaque CPU parent owns an independent lease after wrappers release');
    opaque.release(); assert.equal(opaque.value, undefined);
    assert.equal(value.raw, undefined, 'the final consumer clears the store value cell');
  }
});

test('near acquisition returns the original canonical raw/header and releases a late cancelled result', async () => {
  const data = fixture(), descriptor = {path: '/safety/buildings3d/canonical.json', bytes: 100, sha256: sha('2')};
  const near = {...data.resource, key: 'canonical', level: 'near', descriptor};
  const raw = {schema_version: 1, city: 'berlin', components: [component(1), component(2)], decodedPayloadCost: rawCost}, verified = {shadow_profile: {canonical: true}};
  let released = 0, complete, retiredLate;
  const lateRetirement = new Promise(resolve => {retiredLate = resolve;});
  const source = createBuildingDetailSource({city: 'berlin', vertexCap: 300, readBytes: async () => { throw Error('near does not read variant bytes'); },
    readCanonical: async (asset, currentSignal, vertexCap) => { assert.equal(asset, descriptor); assert.equal(vertexCap, 300); return {raw, verified, physicalBytes: 100, release() { released++; }}; }});
  const acquired = await source.acquire(near, {signal: signal()});
  assert.equal(acquired.value.raw, raw); assert.equal(acquired.value.verified, verified); assert.equal(acquired.value.admission.kind, 'canonical');
  acquired.release(); acquired.release(); assert.equal(released, 1);
  const deferred = createBuildingDetailSource({city: 'berlin', readBytes: async () => { throw Error('near only'); }, readCanonical: () => new Promise(resolve => { complete = resolve; })});
  const controller = new AbortController(), pending = deferred.acquire(near, {signal: controller.signal}); controller.abort();
  complete({raw, verified, physicalBytes: 100, release() { released++; retiredLate(); }});
  await assert.rejects(pending, {name: 'AbortError'}); await lateRetirement; assert.equal(released, 2);
});

test('transport/raw integrity, physical/inflated caps and source render budgets fail closed', async () => {
  const mutations = [
    data => { data.resource.descriptor.sha256 = sha('f'); },
    data => { data.resource.descriptor.bytes++; },
    data => { data.resource.descriptor.uncompressed_sha256 = sha('f'); },
    data => { data.resource.descriptor.uncompressed_bytes--; },
    data => { data.resource.descriptor.bytes = 1024 ** 2 + 1; },
    data => { data.resource.descriptor.uncompressed_bytes = 4 * 1024 ** 2 + 1; },
  ];
  for (const mutate of mutations) { const data = fixture('gzip'); mutate(data); await assert.rejects(adapter(data).source.acquire(data.resource, {signal: signal()})); }
  const data = fixture();
  await assert.rejects(adapter(data, {vertexCap: 5}).source.acquire(data.resource, {signal: signal()}), /budget/);
  await assert.rejects(adapter(data, {geometryPositionCap: 3}).source.acquire(data.resource, {signal: signal()}), /position budget/);
  for (const value of [0, 200001, NaN]) assert.throws(() => adapter(data, {vertexCap: value}), /cap/);
});

test('all replacement header bindings and complete ordered component identities are mandatory', async () => {
  const invalid = [
    doc => { doc.detail_variant.schema = 'crimemaps-building-detail-variants-v1'; },
    doc => { doc.detail_variant.level = 'mid'; },
    ...['canonicalIndexSHA256', 'canonicalLeafSHA256', 'geometrySHA256', 'materialSHA256', 'sourceEquivalenceSHA256', 'producerSHA256', 'protectionSHA256'].map(key => doc => { doc.detail_variant[key] = sha('f'); }),
    doc => { doc.city = 'bremen'; }, doc => { doc.partial = true; }, doc => { doc.components = []; },
    doc => { doc.components.pop(); }, doc => { doc.components.reverse(); }, doc => { doc.components[1].city = 'bremen'; },
    doc => { doc.components[1].objectId = doc.components[0].objectId; }, doc => { doc.components[1].partId = 'wrong-part'; },
    doc => { doc.components[1].origin[0] = 14; }, doc => { doc.components[0].batches = []; },
    doc => { doc.components[0].batches[0].indices = []; }, doc => { doc.components[0].sourceFeature.geometry = null; },
  ];
  for (const mutate of invalid) { const data = fixture('plain', mutate); await assert.rejects(adapter(data).source.acquire(data.resource, {signal: signal()})); }
});

test('the actual demand selector and residency publish one level, release the old lease and reject cancelled late acquisition', async () => {
  const data = fixture('gzip'), canonical = {path: '/safety/buildings3d/canonical.json', bytes: 100, sha256: sha('2')};
  const index = parseBuildingDetailDemand({schema: 'crimemaps-building-detail-demand-v1', schemaVersion: 1, city: 'berlin', canonicalIndex: {path: '/safety/buildings3d/index.json', bytes: 100, sha256: sha('1')}, canonicalLeaf: {id: 'synthetic-leaf', ...canonical}, bindings,
    components: data.resource.components, near: {level: 'near', asset: canonical, geometrySHA256: sha('a'), vertices: 12, triangles: 4},
    variants: [{level: 'coarse', asset: data.resource.descriptor, geometrySHA256: sha('c'), vertices: 6, triangles: 2, errors: [{componentIndex: 0, errorM: .01, normalDeviationRad: 0}, {componentIndex: 1, errorM: .01, normalDeviationRad: 0}]}]}, {city: 'berlin', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: sha('2')});
  const far = selectBuildingDetailResource(index, [{pass: 'main', project: () => ({matrix: [.01, 0, 0, 0, 0, .01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], viewport: {cssWidth: 100, cssHeight: 100, drawingBufferWidth: 100, drawingBufferHeight: 100}}), maxErrorCssPx: 1, maxErrorDrawingBufferPx: 1}]).resource;
  const near = selectBuildingDetailResource(index, [{pass: 'picking'}]).resource;
  assert.equal(far.level, 'coarse'); assert.equal(near.level, 'near');
  let releaseCanonical = 0, finishRead, hold = false;
  // The canonical near leaf is declared above as 12 vertices / 4 triangles; the
  // source now verifies every acquired allocation against its descriptor, so
  // the canonical stream carries exactly that geometry (two triangles per part).
  const canonicalComponent = id => { const value = component(id); value.batches = [value.batches[0], structuredClone(value.batches[0])]; return value; };
  const source = createBuildingDetailSource({city: 'berlin', readCanonical: async () => ({raw: {schema_version: 1, city: 'berlin', components: [canonicalComponent(1), canonicalComponent(2)], decodedPayloadCost: rawCost}, verified: {}, physicalBytes: 100, release() { releaseCanonical++; }}),
    readBytes: async () => { if (hold) await new Promise(resolve => { finishRead = resolve; }); return data.physical; }});
  let published;
  const publications = [], acquired = [], residency = createBuildingDetailResidency({async acquire(...args) { const lease = await source.acquire(...args); acquired.push(lease); return lease; }, async publish(value, resource) { published = value; publications.push(resource?.level); }});
  await residency.select(near); assert.equal(published.admission.kind, 'canonical');
  await residency.select(far); assert.equal(releaseCanonical, 1); const farValue = published;
  await residency.select(near); assert.notEqual(published, farValue); assert.deepEqual(publications, ['near', 'coarse', 'near']);
  assert.throws(() => acquired[1].value, /released/, 'publishing near releases the selected display payload lease');
  hold = true; const pending = residency.select(far);
  await residency.select(near); assert.equal(residency.state.published.level, 'near');
  finishRead(); await pending; assert.equal(published.admission.kind, 'canonical'); assert.deepEqual(publications, ['near', 'coarse', 'near']);
  await residency.destroy(); assert.equal(published, undefined); assert.equal(releaseCanonical, 2);
});

test('Meshopt typed attributes enter source validation without another attribute copy or plain normalization', async () => {
  const buffers = [], decoder = {ready: Promise.resolve(), decodeVertexBuffer(target, _count, _stride, input) { target.set(input); buffers.push(target.buffer); }, decodeIndexSequence(target, _count, _stride, input) { target.set(input); buffers.push(target.buffer); }};
  const data = encodedFixture(passthroughStream), {source} = adapter(data, {meshoptDecoder: decoder});
  const acquired = await source.acquire(data.resource, {signal: signal()});
  for (let index = 0; index < 2; index++) {
    const component = acquired.value.raw.components[index], batch = component.batches[0];
    assert.equal(batch.positions.buffer, buffers[index * 3]); assert.equal(batch.normals.buffer, buffers[index * 3 + 1]); assert.equal(batch.indices.buffer, buffers[index * 3 + 2]);
    assert.deepEqual(component.sourceFeature, data.document.components[index].sourceFeature);
    assert.deepEqual(batch.material_slot, {id: 'wall'}); assert.deepEqual(batch.uv, [0, 0, 1, 0, 0, 1]);
  }
  assert.equal(Object.hasOwn(acquired.value.raw.components[0], 'displayEstimates'), false);
  assert.equal(acquired.value.admission.kind, 'display-variant'); assert.equal(acquired.value.verified, undefined);
  acquired.release(); assert.throws(() => acquired.value, /released/);
  const invalid = encodedFixture(passthroughStream, document => { document.components[0].sourceFeature.geometry = null; });
  await assert.rejects(adapter(invalid, {meshoptDecoder: decoder}).source.acquire(invalid.resource, {signal: signal()}), /source geometry/);
});

test('cancellation while the lazily selected decoder is becoming ready cannot return or publish detail', async () => {
  const data = encodedFixture(passthroughStream), controller = new AbortController();
  let start, ready, decoded = 0;
  const began = new Promise(resolve => { start = resolve; }), gate = new Promise(resolve => { ready = resolve; });
  const decoder = {get ready() { start(); return gate; }, decodeVertexBuffer() { decoded++; }, decodeIndexSequence() { decoded++; }};
  const source = adapter(data, {meshoptDecoder: decoder}).source;
  const pending = source.acquire(data.resource, {signal: controller.signal});
  await began; controller.abort(); await assert.rejects(pending, {name: 'AbortError'});
  ready(); await Promise.resolve(); assert.equal(decoded, 0);
});

test('the default meshoptimizer 1.3 decoder consumes a verified gzip replacement through the actual source adapter', async () => {
  // Saved by the decoder owner from its existing 1.3 encoder fixture; no encoder,
  // tooling package, producer execution or generated public leaf is loaded here.
  const streams = {
    positions: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: 'ccc97f68ac9d33c51f8267a805fa1b679f03818d19fc71a35c3285ffdc8ef4b3', data: 'ofr/+gD/X+gAgQIAACwAAABUAAAACN/AAIZ/AACPj6wA/gACAAAAAAAAAAAAAAAAgOrW/D0AAEjBAAAA'},
    normals: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: '3ba85a1b18357b59d0e491fc3b4d9f9d697e54b3836dc4d5a263a71c94643a26', data: 'of/6/wAAGRoAAAgHAABqlgD/fgAA/wAAAIL/AAAAGRoAAAgHAP+VaQCB/4IAAAAAAAAAAAAAAACAAACAPwAAAAAAAAA='},
    indices: {codec: 'index-sequence', count: 6, stride: 4, decodedBytes: 24, sha256: '7daa62fa3584c0ab83d56383f6c5ba18d3451a2b72b144bec8c6c348fa5c3eb1', data: '0QgGBAgGAgAAAAA='},
  };
  const data = encodedFixture(passthroughStream, document => {
    for (const component of document.components) Object.assign(component.batches[0], structuredClone(streams));
  });
  // The saved 1.3 streams decode to 4 vertices / 6 indices per part, so the
  // selected descriptor declares that actual allocation (2 parts: 8 / 4).
  Object.assign(data.resource, {vertices: 2 * streams.positions.count, triangles: 2 * streams.indices.count / 3});
  const acquired = await adapter(data).source.acquire(data.resource, {signal: signal()});
  for (const component of acquired.value.raw.components) {
    const batch = component.batches[0];
    for (const field of ['positions', 'normals', 'indices']) {
      const view = batch[field];
      assert.equal(hash(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)), streams[field].sha256);
    }
    assert(Object.is(batch.positions[0], -0)); assert(Object.is(batch.normals[4], -0));
    assert.deepEqual([...batch.indices], [2, 0, 1, 3, 1, 0]);
    assert.equal(component.sourceFeature.properties.name, 'Synthetic source');
    assert.deepEqual(batch.material_slot, {id: 'wall'});
  }
  assert.equal(acquired.value.raw.decodedPayloadCost.typedBufferBytes, 240);
  assert.equal(acquired.value.verified, undefined);
  acquired.release();
  // The same verified stream under a descriptor that misstates its geometry is
  // rejected (a stated decode size before decoding, counts after it), never
  // returned or published as detail.
  for (const [misdeclared, error] of [[{vertices: data.resource.vertices - 2}, /actual allocation disagrees with selected descriptor/], [{triangles: data.resource.triangles + 1}, /actual allocation disagrees with selected descriptor/], [{decodedBytes: 1}, /decoded allocation mismatch/]])
    await assert.rejects(adapter(data).source.acquire({...data.resource, ...misdeclared, key: data.resource.key + ':' + Object.keys(misdeclared)[0]}, {signal: signal()}), error);
});


test('selected content shares one in-flight producer and cancellation only retires its own waiter', async () => {
  const data = fixture('gzip'); let complete, started, reads = 0;
  const entered = new Promise(resolve => {started = resolve;});
  const source = createBuildingDetailSource({city: 'berlin', readCanonical: async () => {throw Error('variant only');},
    readBytes: async () => {reads++; started(); return new Promise(resolve => {complete = resolve;});}});
  const canceled = new AbortController(), live = new AbortController();
  const first = source.acquire(data.resource, {signal: canceled.signal});
  const rejected = assert.rejects(first, {name: 'AbortError'});
  await entered;
  const second = source.acquire(data.resource, {signal: live.signal});
  canceled.abort(); await rejected;
  assert.equal(reads, 1, 'another consumer keeps the current producer alive');
  complete(data.physical);
  const lease = await second;
  assert.equal(reads, 1); assert.equal(lease.value.raw.components.length, 2);
  live.abort();
  assert.equal(lease.value.raw.components.length, 2, 'settled lease is independent of the acquiring request signal');
  const value = lease.value; lease.release();
  assert.equal(value.raw, undefined);
});

test('detail opaque parent includes real native and group metadata ancestors in the recent envelope', async () => {
  const data = fixture(), canonicalBytes = bytes({schema_version: 1, city: 'berlin', components: data.document.components, shadow_profile: {canonical: true}});
  const descriptor = {path: '/safety/buildings3d/canonical-envelope.json', bytes: canonicalBytes.length, sha256: hash(canonicalBytes)}, budget = createResourceBudget(), resources = createChunkResourceStore({budget});
  const pool = createSharedNativeSourcePool({resourceStore: resources, read: async () => canonicalBytes}), client = pool.client('berlin'), seed = await client.acquire(descriptor, signal(), 200000);
  const resource = {...data.resource, key: 'near-parent-envelope-' + descriptor.sha256, level: 'near', descriptor, canonicalLeafSHA256: descriptor.sha256, geometrySHA256: sha('a')}, authority = {...bindings, canonicalIndexSHA256: resource.canonicalIndexSHA256, canonicalLeafSHA256: resource.canonicalLeafSHA256};
  const constraints = seed.raw.components.map((component, i) => ({key: hash('constraint-' + i), observedComponentIndices: [i], sourceObject: {city: component.city, objectId: component.objectId}, completeAcrossLeaves: false, closure: 'requires-runtime-cohort', mayPublishIndependently: false, canonicalOnly: true}));
  const groups = seed.raw.components.map((component, i) => {
    let vertices = 0, indices = 0;
    const spans = component.batches.map((batch, b) => {
      const {positions, normals, indices: elements, ...material} = batch;
      const span = {componentIndex: i, batchIndex: b, sourceIndexBase: 'batch-local', vertexCount: positions.length / 3, indexCount: elements.length, packedVertexOffset: vertices, packedIndexOffset: indices,
        positionsSHA256: hash(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength)), normalsSHA256: hash(new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength)), indicesSHA256: hash(new Uint8Array(elements.buffer, elements.byteOffset, elements.byteLength)), materialMetadataSHA256: hash(bytes(material))};
      vertices += span.vertexCount; indices += span.indexCount; return span;
    });
    return {key: hash('packing-' + i), kind: 'physical-packing-group', geometryRole: 'canonical', unit: 'meter', level: 'near', componentIndices: [i], publicationConstraintKey: constraints[i].key,
      authority: {...authority, selectedGeometrySHA256: resource.geometrySHA256}, anchor: [...component.origin], vertices, indices, triangles: indices / 3,
      componentRanges: [{componentIndex: i, objectId: component.objectId, partId: component.partId, packedVertexOffset: 0, packedIndexOffset: 0, vertexCount: vertices, indexCount: indices, batchSpans: spans}]};
  });
  const document = {schema: 'crimemaps-building-detail-groups-v1', schemaVersion: 1, city: 'berlin', key: hash('selected-groups'), authority,
    coordinateFrame: {schema: 'source-local-mercator-meters-v1', unit: 'meter', axes: {x: 'east', y: 'up', z: 'north'}, anchorPrecision: 'float64', arithmetic: 'double-source-origin-minus-stable-anchor-before-float32', earthCircumferenceM: 2 * Math.PI * 6378137},
    canonicalComponents: resource.components.map((component, i) => ({componentIndex: i, city: 'berlin', objectId: component.objectId, partId: component.partId, origin: component.origin})), publicationConstraints: constraints,
    levels: [{level: 'near', asset: descriptor, geometrySHA256: resource.geometrySHA256, sourceEquivalenceSHA256: bindings.sourceEquivalenceSHA256, componentCount: 2, vertices: 6, triangles: 2, indices: 6, packingGroups: groups}]};
  const groupBytes = bytes(document); resource.groupMetadata = {path: '/safety/buildings3d/detail/groups-envelope.json', bytes: groupBytes.length, sha256: hash(groupBytes)};
  const source = createBuildingDetailSource({city: 'berlin', resourceStore: resources, readCanonical: client.read, async readBytes(path) { assert.equal(path, resource.groupMetadata.path); return groupBytes; }}), acquired = await source.acquire(resource, {signal: signal()}), parent = acquired.retainResource();
  assert.equal(acquired.value.groups.packingGroups.length, 2); assert.equal(parent.context, undefined); assert.equal(parent.epoch, undefined);
  const child = resources.acquire({contentKey: 'detail-parent-envelope-boundary', role: 'main', parents: [parent], allowRecent: true, estimate: {category: 'metadata', bytes: 1, precision: 'estimate'}, produce: () => ({boundary: true}), costs: value => ({category: 'metadata', bytes: 1, precision: 'estimate', identity: value})});
  await child.ready; acquired.release(); seed.release(); parent.release(); client.destroy(); pool.destroy(); assert.equal(child.state, 'ready');
  child.release(); assert(budget.stats.recentBytes > 0); assert.equal(budget.stats.recentBytes, budget.stats.bytes, 'the cache envelope includes both native ancestry and parsed group metadata');
  resources.evictRecent(); assert.equal(budget.stats.bytes, 0); resources.destroy();
});

test('legacy near reader without an opaque parent admits its entire header before group loading', async () => {
  const data = fixture(), budget = createResourceBudget(), resources = createChunkResourceStore({budget}), descriptor = {path: '/safety/buildings3d/legacy-canonical.json', bytes: 100, sha256: sha('2')}; let releases = 0, groupReads = 0;
  const resource = {...data.resource, key: 'legacy-no-opaque-parent-budget', level: 'near', descriptor, groupMetadata: {path: '/safety/buildings3d/detail/legacy-groups.json', bytes: 2, sha256: hash('[]')}};
  const source = createBuildingDetailSource({city: 'berlin', resourceStore: resources,
    readCanonical: async () => ({raw: {schema_version: 1, city: 'berlin', components: data.document.components, decodedPayloadCost: rawCost}, verified: {shadow_profile: {proof: 'x'.repeat(10000)}}, physicalBytes: 100, release() { releases++; }}),
    async readBytes() { groupReads++; assert(budget.stats.categories.metadata.bytes > 20000, 'legacy raw/header ownership is charged before downstream group acquisition'); throw Error('stop-after-legacy-admission'); },
  });
  await assert.rejects(source.acquire(resource, {signal: signal()}), /stop-after-legacy-admission/); assert.equal(groupReads, 1); assert.equal(releases, 1); assert.equal(budget.stats.bytes, 0); resources.destroy();
});
