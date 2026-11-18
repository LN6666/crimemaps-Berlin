import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';

// The read-only selection snapshot of the real detail runtime: it records the
// runtime's own level decisions beside the resource of the newest READY
// publication, so a fixed-candidate browser acceptance can prove a LOD variant
// was really used. The runtime and the demand selector are the actual bundled
// modules; only bytes, demands and the publication fences are fixtures.
async function bundle(entry){
  const result = await build({entryPoints: [new URL('../src/safety/' + entry, import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + '\n//# sourceURL=' + entry + '-under-test.js').toString('base64'));
}
const {createBuildingDetailRuntime} = await bundle('building-detail-runtime.ts');
const {parseBuildingDetailDemand, selectBuildingDetailResource} = await bundle('building-detail-demand.ts');
const sha = digit => digit.repeat(64), hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function until(predicate) { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setImmediate(resolve)); } assert.fail('bounded fixture event did not occur'); }
// Real meshopt-lossless streams of one quad, as in building-detail-runtime.test.mjs.
const streams = {
  positions: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: 'ccc97f68ac9d33c51f8267a805fa1b679f03818d19fc71a35c3285ffdc8ef4b3', data: 'ofr/+gD/X+gAgQIAACwAAABUAAAACN/AAIZ/AACPj6wA/gACAAAAAAAAAAAAAAAAgOrW/D0AAEjBAAAA'},
  normals: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: '3ba85a1b18357b59d0e491fc3b4d9f9d697e54b3836dc4d5a263a71c94643a26', data: 'of/6/wAAGRoAAAgHAABqlgD/fgAA/wAAAIL/AAAAGRoAAAgHAP+VaQCB/4IAAAAAAAAAAAAAAACAAACAPwAAAAAAAAA='},
  indices: {codec: 'index-sequence', count: 6, stride: 4, decodedBytes: 24, sha256: '7daa62fa3584c0ab83d56383f6c5ba18d3451a2b72b144bec8c6c348fa5c3eb1', data: '0QgGBAgGAgAAAAA='},
};
const bindings = {sourcePBFSHA256: sha('3'), boundarySHA256: sha('4'), compilerSHA256: sha('5'), sourceSnapshot: 'fixture', materialSHA256: sha('6'), producerSHA256: sha('7'), protectionSHA256: sha('8'), sourceEquivalenceSHA256: sha('9')};
const polygon = {type: 'Polygon', coordinates: [[[13, 52], [13.001, 52], [13, 52.001], [13, 52]]]};
const component = {objectId: 'osm/way/1', partId: 'component/1', city: 'berlin', origin: [13, 52], componentGeometry: polygon, sourceFeature: {type: 'Feature', geometry: polygon, properties: {name: 'source'}}};
function demandDocument(leafId = 'leaf-1', leafSHA = sha('2')) {
  const canonical = {id: leafId, path: '/safety/buildings3d/' + leafId + '.json', bytes: 100, sha256: leafSHA};
  const document = {schema_version: 1, city: 'berlin', encoding: 'meshopt-lossless-f32-v1', detail_variant: {
    schema: 'crimemaps-building-detail-replacement-v1', level: 'coarse', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: leafSHA, geometrySHA256: sha('c'),
    materialSHA256: bindings.materialSHA256, sourceEquivalenceSHA256: bindings.sourceEquivalenceSHA256, producerSHA256: bindings.producerSHA256, protectionSHA256: bindings.protectionSHA256},
    components: [{...component, batches: [{...streams, color: [.5, .6, .7], materialName: 'original', faceRole: 'roof'}]}]};
  const raw = new TextEncoder().encode(JSON.stringify(document)), physical = new Uint8Array(gzipSync(raw));
  const variant = {path: '/safety/buildings3d/detail/' + leafId + '-coarse.json.gz', bytes: physical.length, sha256: hash(physical), compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)};
  const index = {schema: 'crimemaps-building-detail-demand-v1', schemaVersion: 1, city: 'berlin', canonicalIndex: {path: '/safety/buildings3d/index.json', bytes: 100, sha256: sha('1')}, canonicalLeaf: {...canonical}, bindings,
    components: [{objectId: component.objectId, partId: component.partId, origin: component.origin, box: [0, 0, 0, 1, 1, 0], protected: false}],
    near: {level: 'near', asset: {path: canonical.path, bytes: canonical.bytes, sha256: canonical.sha256}, geometrySHA256: sha('a'), vertices: 8, triangles: 6},
    variants: [{level: 'coarse', asset: variant, geometrySHA256: sha('c'), vertices: 4, triangles: 2, errors: [{componentIndex: 0, errorM: .01, normalDeviationRad: 0}]}]};
  return {canonical, index, physical};
}
function fixture() {
  const {canonical, index: indexDocument, physical} = demandDocument();
  let mode = 'far';
  const demands = () => mode === 'near' ? [{pass: 'picking', maxErrorCssPx: .5, maxErrorDrawingBufferPx: 1, project: () => undefined}] : [{pass: 'main', maxErrorCssPx: .5, maxErrorDrawingBufferPx: 1,
    project: () => ({matrix: [.01, 0, 0, 0, 0, .01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], viewport: {cssWidth: 100, cssHeight: 100, drawingBufferWidth: 200, drawingBufferHeight: 200}})}];
  const nearRaw = {schema_version: 1, city: 'berlin', components: [{...component, batches: [{positions: new Float32Array(24), normals: new Float32Array(24), indices: new Uint32Array(18), color: [.5, .6, .7]}]}], decodedPayloadCost: {retainedPayloadEstimateBytes: 1, typedBufferBytes: 1}};
  const runtime = createBuildingDetailRuntime({city: 'berlin', vertexCap: 100,
    async resolveDetailIndex(_indexSHA, _leaf, signal) { signal.throwIfAborted(); return structuredClone(indexDocument); },
    async readBytes(_path, signal) { signal.throwIfAborted(); return physical; },
    async readCanonical() { return {raw: nearRaw, verified: {shadow_profile: {canonical: true}}, physicalBytes: 100, release() {}}; },
    getDemands: demands,
  });
  const resolve = () => runtime.resolveDetailIndex(sha('1'), canonical, {signal: new AbortController().signal});
  return {runtime, canonical, demands, resolve, setMode(value) { mode = value; }};
}
const leafOf = (snapshot, leafId = 'leaf-1') => snapshot.leaves.find(leaf => leaf.leafId === leafId);
const adoptCached = (runtime, index, resource, generation, requestId = generation) => {
  const session = runtime.openSession({requestId, signal: new AbortController().signal});
  session.registerCached(index, resource); session.validateBeforeAdopt({resourceKeys: [resource.key]}); session.adopt({generation, resourceKeys: [resource.key]});
  return session;
};

test('the snapshot records the runtime decision for each leaf without altering it', async () => {
  const f = fixture(), index = await f.resolve();
  assert.deepEqual(f.runtime.getBuildingDetailSelectionSnapshot().leaves, [], 'nothing observed before a decision');
  const far = f.runtime.select(index), expectedFar = selectBuildingDetailResource(index, f.demands(index));
  assert.deepEqual([far.resource.level, far.reason, far.resource.key, far.passes], [expectedFar.resource.level, expectedFar.reason, expectedFar.resource.key, expectedFar.passes], 'same decision as the unobserved selector');
  assert.equal(far.resource.level, 'coarse');
  let leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.deepEqual({city: leaf.city, leafId: leaf.leafId, canonicalIndexSHA256: leaf.canonicalIndexSHA256, canonicalLeafSHA256: leaf.canonicalLeafSHA256, selectedLevel: leaf.selectedLevel, resourceKey: leaf.resourceKey, geometrySHA256: leaf.geometrySHA256, descriptorSHA256: leaf.descriptorSHA256, reason: leaf.reason, published: leaf.published, selections: leaf.selections},
    {city: 'berlin', leafId: 'leaf-1', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: sha('2'), selectedLevel: 'coarse', resourceKey: far.resource.key, geometrySHA256: sha('c'), descriptorSHA256: far.resource.descriptor.sha256, reason: 'coarse', published: false, selections: 1});
  assert.deepEqual(leaf.passes, ['main']);
  f.setMode('near');
  const near = f.runtime.select(index), expectedNear = selectBuildingDetailResource(index, f.demands(index), 'near');
  assert.deepEqual([near.resource.level, near.reason, near.resource.key], [expectedNear.resource.level, expectedNear.reason, expectedNear.resource.key]);
  leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.deepEqual([leaf.selectedLevel, leaf.reason, leaf.geometrySHA256, leaf.selections, leaf.published], ['near', 'picking', sha('a'), 2, false]);
  // Taking snapshots between decisions changes no later decision.
  const twin = fixture(), twinIndex = await twin.resolve(), trace = [];
  for (const value of ['far', 'near', 'far', 'far', 'near']) {
    f.setMode(value); twin.setMode(value);
    const observed = f.runtime.select(index), unobserved = twin.runtime.select(twinIndex); f.runtime.getBuildingDetailSelectionSnapshot();
    assert.deepEqual([observed.resource.key, observed.reason], [unobserved.resource.key, unobserved.reason], value);
    trace.push(observed.resource.level);
  }
  assert.deepEqual(trace, ['coarse', 'near', 'coarse', 'coarse', 'near']);
});

test('published holds only after the adopting session settles ready, for the newest ready generation', async () => {
  const f = fixture(), index = await f.resolve(), coarse = f.runtime.select(index).resource;
  const first = adoptCached(f.runtime, index, coarse, 4);
  let snapshot = f.runtime.getBuildingDetailSelectionSnapshot(), leaf = leafOf(snapshot);
  assert.equal(leaf.published, false, 'adoption alone is not a drawable publication'); assert.equal(snapshot.publishedGeneration, undefined);
  first.settleReady({generation: 4, ready: true}); first.finish();
  snapshot = f.runtime.getBuildingDetailSelectionSnapshot(); leaf = leafOf(snapshot);
  assert.deepEqual([leaf.published, leaf.publishedBy, leaf.publishedLevel, leaf.publishedResourceKey, leaf.publishedGeometrySHA256, leaf.publishedGeneration, snapshot.publishedGeneration],
    [true, 'session', 'coarse', coarse.key, sha('c'), 4, 4], 'the coarse LOD variant is the ready publication');
  assert.equal(leaf.residentPublications, undefined, 'a session leaf carries the adopted renderer generation, never a resident count');
  // A newer committed-but-not-ready publication and an older ready one leave generation 4 shown.
  const notReady = adoptCached(f.runtime, index, coarse, 5); notReady.settleReady({generation: 5, ready: false, error: Error('fixture draw timeout')}); notReady.finish();
  const older = adoptCached(f.runtime, index, coarse, 3); older.settleReady({generation: 3, ready: true}); older.finish();
  assert.equal(f.runtime.getBuildingDetailSelectionSnapshot().publishedGeneration, 4);
  // The demand moves to canonical geometry; the shown publication stays coarse until a ready one replaces it.
  f.setMode('near'); const near = f.runtime.select(index).resource;
  leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.deepEqual([leaf.selectedLevel, leaf.reason, leaf.published, leaf.publishedLevel], ['near', 'picking', false, 'coarse']);
  const canonical = adoptCached(f.runtime, index, near, 6); canonical.settleReady({generation: 6, ready: true}); canonical.finish();
  leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.deepEqual([leaf.selectedLevel, leaf.published, leaf.publishedLevel, leaf.publishedGeneration], ['near', true, 'near', 6]);
  // A ready publication without this leaf withdraws it.
  const empty = f.runtime.openSession({requestId: 7, signal: new AbortController().signal}); empty.adopt({generation: 7, resourceKeys: []}); empty.settleReady({generation: 7, ready: true}); empty.finish();
  snapshot = f.runtime.getBuildingDetailSelectionSnapshot(); leaf = leafOf(snapshot);
  assert.deepEqual([snapshot.publishedGeneration, leaf.published, leaf.publishedLevel], [7, false, undefined]);
});

test('a resident publication of the real decoded coarse variant is reported, then withdrawn on destroy', async () => {
  const f = fixture(), index = await f.resolve(), published = [];
  const owner = f.runtime.createResident(index, {
    async prepare(source, resource) { return {value: {level: resource.level, components: source.raw.components.length}, release() {}}; },
    async publish(prepared, resource) { published.push(resource?.level); },
  });
  const selection = await owner.refresh();
  assert.equal(selection.resource.level, 'coarse'); await until(() => published.length === 1);
  let leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.deepEqual([leaf.selectedLevel, leaf.published, leaf.publishedBy, leaf.publishedLevel, leaf.publishedResourceKey], ['coarse', true, 'resident', 'coarse', selection.resource.key]);
  // A resident's count is not a renderer generation: comparing it with
  // renderer.getRevision().generation would misjudge the leaf.
  assert.deepEqual([leaf.publishedGeneration, leaf.residentPublications], [undefined, 1], 'a resident leaf reports its own publication count under its own field');
  assert.equal(f.runtime.getBuildingDetailSelectionSnapshot().publishedGeneration, undefined, 'no session generation is implied by a resident publication');
  await owner.destroy();
  leaf = leafOf(f.runtime.getBuildingDetailSelectionSnapshot());
  assert.equal(leaf.published, false); assert.equal(leaf.publishedBy, undefined); assert.equal(leaf.residentPublications, undefined);
});

test('the snapshot is frozen, holds only identity strings and stays bounded', async () => {
  const f = fixture(), index = await f.resolve(), resource = f.runtime.select(index).resource;
  const session = adoptCached(f.runtime, index, resource, 2); session.settleReady({generation: 2, ready: true}); session.finish();
  const snapshot = f.runtime.getBuildingDetailSelectionSnapshot(), leaf = leafOf(snapshot);
  assert(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.leaves) && Object.isFrozen(leaf));
  assert.throws(() => { leaf.selectedLevel = 'near'; }, TypeError); assert.throws(() => { snapshot.leaves.push(leaf); }, TypeError);
  assert.equal(leafOf(f.runtime.getBuildingDetailSelectionSnapshot()).selectedLevel, 'coarse');
  for (const [key, value] of Object.entries(leaf)) assert(['string', 'number', 'boolean'].includes(typeof value) || key === 'passes' && Object.isFrozen(value) && value.every(item => typeof item === 'string'), key + ' holds no geometry or index reference');
  assert.deepEqual([snapshot.schema, snapshot.city, snapshot.thresholdsCalibrated, snapshot.evidence], ['crimemaps-building-detail-selection-snapshot-v1', 'berlin', false, 'runtime-selection-and-ready-publication-not-pixels']);
  // 520 distinct leaves: the oldest observations are dropped, the published leaf stays visible.
  for (let i = 0; i < 520; i++) {
    const leafSHA = createHash('sha256').update('leaf ' + i).digest('hex'), {index: document} = demandDocument('bounded-' + i, leafSHA);
    f.runtime.select(parseBuildingDetailDemand(document, {city: 'berlin', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: leafSHA}));
  }
  const bounded = f.runtime.getBuildingDetailSelectionSnapshot();
  assert.deepEqual([bounded.observedLeaves, bounded.maxObservedLeaves, bounded.droppedObservations], [512, 512, 9]);
  // The cap bounds observed decisions only; published leaves are listed in
  // addition, bounded by one adoption's resource keys plus the live residents.
  assert.equal(bounded.leaves.length, 513, '512 observed leaves plus the published leaf whose observation was dropped');
  const kept = leafOf(bounded);
  assert.deepEqual([kept.published, kept.publishedLevel, kept.reason, kept.selectedLevel], [true, 'coarse', 'coarse', 'coarse'], 'a published leaf survives observation eviction with its adopted decision');
  assert.equal(leafOf(bounded, 'bounded-0'), undefined); assert.equal(leafOf(bounded, 'bounded-519').selectedLevel, 'coarse');
});
