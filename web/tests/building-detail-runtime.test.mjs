import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';

const bundle = await build({entryPoints: [new URL('../src/safety/building-detail-runtime.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {createBuildingDetailRuntime, StaleBuildingDetailDemandError} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=building-detail-runtime-under-test.js').toString('base64'));
const sha = digit => digit.repeat(64), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
async function until(predicate) { for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setImmediate(resolve)); } assert.fail('bounded fixture event did not occur'); }
const streams = {
  positions: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: 'ccc97f68ac9d33c51f8267a805fa1b679f03818d19fc71a35c3285ffdc8ef4b3', data: 'ofr/+gD/X+gAgQIAACwAAABUAAAACN/AAIZ/AACPj6wA/gACAAAAAAAAAAAAAAAAgOrW/D0AAEjBAAAA'},
  normals: {codec: 'vertex', count: 4, stride: 12, decodedBytes: 48, sha256: '3ba85a1b18357b59d0e491fc3b4d9f9d697e54b3836dc4d5a263a71c94643a26', data: 'of/6/wAAGRoAAAgHAABqlgD/fgAA/wAAAIL/AAAAGRoAAAgHAP+VaQCB/4IAAAAAAAAAAAAAAACAAACAPwAAAAAAAAA='},
  indices: {codec: 'index-sequence', count: 6, stride: 4, decodedBytes: 24, sha256: '7daa62fa3584c0ab83d56383f6c5ba18d3451a2b72b144bec8c6c348fa5c3eb1', data: '0QgGBAgGAgAAAAA='},
};
function fixture() {
  const bindings = {sourcePBFSHA256: sha('3'), boundarySHA256: sha('4'), compilerSHA256: sha('5'), sourceSnapshot: 'fixture', materialSHA256: sha('6'), producerSHA256: sha('7'), protectionSHA256: sha('8'), sourceEquivalenceSHA256: sha('9')};
  const polygon = {type: 'Polygon', coordinates: [[[13, 52], [13.001, 52], [13, 52.001], [13, 52]]]};
  const component = {objectId: 'osm/way/1', partId: 'component/1', city: 'berlin', origin: [13, 52], componentGeometry: polygon, sourceFeature: {type: 'Feature', geometry: polygon, properties: {name: 'source'}}};
  const canonical = {id: 'leaf-1', path: '/safety/buildings3d/canonical.json', bytes: 100, sha256: sha('2')};
  const document = {schema_version: 1, city: 'berlin', encoding: 'meshopt-lossless-f32-v1', detail_variant: {
    schema: 'crimemaps-building-detail-replacement-v1', level: 'coarse', canonicalIndexSHA256: sha('1'), canonicalLeafSHA256: sha('2'), geometrySHA256: sha('c'),
    materialSHA256: bindings.materialSHA256, sourceEquivalenceSHA256: bindings.sourceEquivalenceSHA256, producerSHA256: bindings.producerSHA256, protectionSHA256: bindings.protectionSHA256},
    components: [{...component, batches: [{...streams, color: [.5, .6, .7], materialName: 'original', faceRole: 'roof'}]}]};
  const raw = new TextEncoder().encode(JSON.stringify(document)), physical = new Uint8Array(gzipSync(raw));
  const variant = {path: '/safety/buildings3d/detail/coarse.json.gz', bytes: physical.length, sha256: hash(physical), compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)};
  const indexDocument = {schema: 'crimemaps-building-detail-demand-v1', schemaVersion: 1, city: 'berlin', canonicalIndex: {path: '/safety/buildings3d/index.json', bytes: 100, sha256: sha('1')}, canonicalLeaf: {...canonical}, bindings,
    components: [{objectId: component.objectId, partId: component.partId, origin: component.origin, box: [0, 0, 0, 1, 1, 0], protected: false}],
    near: {level: 'near', asset: {...canonical}, geometrySHA256: sha('a'), vertices: 8, triangles: 6},
    variants: [{level: 'coarse', asset: variant, geometrySHA256: sha('c'), vertices: 4, triangles: 2, errors: [{componentIndex: 0, errorM: .01, normalDeviationRad: 0}]}]};
  delete indexDocument.near.asset.id;
  const nearRaw = {schema_version: 1, city: 'berlin', components: [{...component, batches: [{positions: new Float32Array(24), normals: new Float32Array(24), indices: new Uint32Array(18), color: [.5, .6, .7]}]}], decodedPayloadCost: {retainedPayloadEstimateBytes: 1, typedBufferBytes: 1}};
  const hooks = {}, reads = [], preparations = [], releases = [], fences = [], publications = [];
  let mode = 'far', canonicalReleases = 0, metadataReads = 0;
  const demands = () => mode === 'near' ? [{pass: 'picking', maxErrorCssPx: .5, maxErrorDrawingBufferPx: 1, project: () => undefined}] : [{pass: 'main', maxErrorCssPx: .5, maxErrorDrawingBufferPx: 1,
    project: () => ({matrix: [.01, 0, 0, 0, 0, .01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], viewport: {cssWidth: 100, cssHeight: 100, drawingBufferWidth: 200, drawingBufferHeight: 200}})}];
  const readCanonical = async (asset, signal) => { reads.push(['canonical', asset.path]); if (hooks.holdCanonical) await hooks.holdCanonical.promise; return {raw: nearRaw, verified: {shadow_profile: {canonical: true}}, physicalBytes: 100, release() { canonicalReleases++; }}; };
  const runtime = createBuildingDetailRuntime({city: 'berlin', vertexCap: 100,
    async resolveDetailIndex(indexSHA, leaf, signal) { metadataReads++; assert.equal(indexSHA, sha('1')); assert.equal(leaf.id, canonical.id); signal.throwIfAborted(); return hooks.noIndex ? undefined : indexDocument; },
    async readBytes(path, signal) { reads.push(['variant', path]); signal.throwIfAborted(); return physical; },
    readCanonical,
    getDemands: demands,
  });
  const resolve = () => runtime.resolveDetailIndex(sha('1'), canonical, {signal: new AbortController().signal});
  async function resident() {
    const index = await resolve();
    const owner = runtime.createResident(index, {
      async prepare(source, resource, {signal}) {
        const record = {resource, signal, bitExact: Object.is(source.raw.components[0].batches[0].positions[0], -0)}; preparations.push(record);
        if (hooks.failPrepare) throw Error('SOURCE/prepare failed');
        if (hooks.holdPrepare) await hooks.holdPrepare.promise;
        return {value: {level: resource.level, handle: preparations.length}, release() { releases.push(resource.level); }};
      },
      async publish(prepared, resource, context) {
        const gate = hooks.holdPublish ? deferred() : undefined; fences.push({prepared, resource, ...context, gate});
        if (gate) await gate.promise;
        context.signal.throwIfAborted();
        publications.push(resource?.level);
      },
    });
    return owner;
  }
  return {runtime, canonical, indexDocument, document, physical, demands, readCanonical, hooks, reads, preparations, releases, fences, publications, resolve, resident, setMode(value) { mode = value; }, get canonicalReleases() { return canonicalReleases; }, get metadataReads() { return metadataReads; }};
}

test('runtime to source to real 1.3 decoder prepares exact attributes, then retires source only after the drawable fence', async () => {
  const f = fixture(), owner = await f.resident(); f.hooks.holdPublish = true;
  const first = owner.refresh(); await until(() => f.fences.length === 1);
  assert.equal(f.preparations[0].bitExact, true); assert.equal(f.preparations[0].resource.level, 'coarse');
  assert.equal(owner.state.status, 'loading'); assert.equal(owner.state.published, undefined); assert.equal(owner.stats.sourceLeases, 1); assert.equal(owner.stats.preparedLeases, 1);
  assert.deepEqual(Object.keys(f.fences[0].prepared), ['level', 'handle'], 'runtime does not append raw construction inputs to the prepared resident');
  f.fences[0].gate.resolve(); await first; assert.equal(owner.state.status, 'ready'); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1);
  f.setMode('near'); const next = owner.refresh(); await until(() => f.fences.length === 2);
  assert.equal(owner.state.published.level, 'coarse'); assert.deepEqual(f.releases, []); assert.equal(f.canonicalReleases, 0);
  f.fences[1].gate.resolve(); await next; assert.equal(f.canonicalReleases, 1); assert.deepEqual(f.releases, ['coarse']);
  assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1); assert.deepEqual(f.reads.map(([kind]) => kind), ['variant', 'canonical']);
  await owner.refresh(); assert.equal(owner.stats.acquisitions, 2, 'same published key does not decode or prepare again');
  f.hooks.holdPublish = false; await owner.destroy(); assert.equal(owner.stats.preparedLeases, 0); assert.deepEqual(f.releases, ['coarse', 'near']);
});
test('missing catalogs stay on the caller canonical path; resolved metadata is bound to exact leaf identity without a runtime cache', async () => {
  const f = fixture(); f.hooks.noIndex = true; assert.equal(await f.resolve(), undefined); assert.deepEqual(f.reads, []);
  f.hooks.noIndex = false; const index = await f.resolve(); assert.equal(index.canonicalLeaf.id, 'leaf-1'); assert.equal(f.metadataReads, 2);
  f.indexDocument.canonicalLeaf.id = 'other-leaf'; await assert.rejects(f.resolve(), /leaf descriptor mismatch/); assert.deepEqual(f.reads, []);
});
test('prepare failure and camera-demand staleness release new inputs and retain the old success without an automatic retry', async () => {
  const f = fixture(), owner = await f.resident(); await owner.refresh(); f.setMode('near'); f.hooks.failPrepare = true;
  await assert.rejects(owner.refresh(), /prepare failed/); assert.equal(owner.state.published.level, 'coarse'); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1);
  f.hooks.failPrepare = false; f.hooks.holdPrepare = deferred(); const stale = owner.refresh(); await until(() => f.preparations.length === 3);
  f.setMode('far'); f.hooks.holdPrepare.resolve(); await assert.rejects(stale, StaleBuildingDetailDemandError);
  assert.equal(owner.state.published.level, 'coarse'); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1); assert.equal(f.publications.length, 1); assert.equal(owner.stats.acquisitions, 3);
  await owner.destroy();
});
test('a rejected or cancelled pending publication fence preserves the old resident and late completion cannot install its resource', async () => {
  const f = fixture(), owner = await f.resident(); await owner.refresh(); f.setMode('near'); f.hooks.holdPublish = true;
  const rejected = owner.refresh(); await until(() => f.fences.length === 2); f.fences[1].gate.reject(Error('target not drawable'));
  await assert.rejects(rejected, /not drawable/); assert.equal(owner.state.published.level, 'coarse'); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1);
  const late = owner.refresh(); const lateRejection = assert.rejects(late, StaleBuildingDetailDemandError); await until(() => f.fences.length === 3);
  f.setMode('far'); await owner.refresh(); assert.equal(f.fences[2].signal.aborted, true); f.fences[2].gate.resolve(); await lateRejection;
  assert.equal(owner.state.published.level, 'coarse'); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 1); assert.deepEqual(f.publications, ['coarse']);
  f.hooks.holdPublish = false; await owner.destroy();
});
test('suspension waits for clearing the drawable publication and resume reacquires only the current desired level', async () => {
  const f = fixture(), owner = await f.resident(); await owner.refresh(); f.hooks.holdPublish = true;
  const paused = owner.suspend(); await until(() => f.fences.length === 2); assert.equal(owner.state.published.level, 'coarse'); assert.equal(owner.stats.preparedLeases, 1);
  f.fences[1].gate.resolve(); await paused; assert.equal(owner.state.published, undefined); assert.equal(owner.stats.preparedLeases, 0);
  f.setMode('near'); f.hooks.holdPublish = false; const resumed = await owner.resume(); assert.equal(resumed.resource.level, 'near'); assert.equal(f.reads.at(-1)[0], 'canonical');
  await owner.destroy(); assert.equal(owner.stats.preparedLeases, 0);
});
test('destroy during an uncancellable late canonical read never prepares or publishes and the canonical lease is released once', async () => {
  const f = fixture(); f.setMode('near'); const owner = await f.resident(); f.hooks.holdCanonical = deferred();
  const pending = owner.refresh(), rejected = assert.rejects(pending, {name: 'AbortError'}); await until(() => f.reads.length === 1);
  await owner.destroy(); f.hooks.holdCanonical.resolve(); await rejected;
  assert.equal(f.canonicalReleases, 1); assert.equal(f.preparations.length, 0); assert.equal(f.publications.length, 0); assert.equal(owner.stats.sourceLeases, 0); assert.equal(owner.stats.preparedLeases, 0);
});

test('session two-reader cohort acquires three real meshopt leaves without awaiting adoption or draw readiness', async () => {
  const base = fixture(), documents = new Map(), leaves = [], calls = []; let inFlight = 0, peak = 0;
  for (let id = 1; id <= 3; id++) {
    const index = structuredClone(base.indexDocument), canonicalHash = hash(`canonical-${id}`), doc = structuredClone(base.document);
    index.canonicalLeaf = {...index.canonicalLeaf, id: `leaf-${id}`, path: `/safety/buildings3d/canonical-${id}.json`, sha256: canonicalHash};
    index.near.asset = {...index.near.asset, path: index.canonicalLeaf.path, sha256: canonicalHash};
    index.components[0].objectId = `osm/way/${id}`; index.components[0].partId = `component/${id}`;
    Object.assign(doc.components[0], {objectId: `osm/way/${id}`, partId: `component/${id}`}); doc.detail_variant.canonicalLeafSHA256 = canonicalHash;
    const raw = new TextEncoder().encode(JSON.stringify(doc)), physical = new Uint8Array(gzipSync(raw));
    index.variants[0].asset = {path: `/safety/buildings3d/detail/coarse-${id}.json.gz`, bytes: physical.length, sha256: hash(physical), compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)};
    documents.set(index.variants[0].asset.path, physical); leaves.push(index);
  }
  const runtime = createBuildingDetailRuntime({city: 'berlin', vertexCap: 100, getDemands: base.demands,
    resolveDetailIndex: async (_sha, leaf) => leaves.find(index => index.canonicalLeaf.id === leaf.id), readCanonical: async () => { throw Error('far session uses selected variants only'); },
    async readBytes(path) { inFlight++; peak = Math.max(peak, inFlight); calls.push(path); await new Promise(resolve => setImmediate(resolve)); inFlight--; return documents.get(path); },
  });
  const indexes = await Promise.all(leaves.map(index => runtime.resolveDetailIndex(sha('1'), index.canonicalLeaf, {signal: new AbortController().signal})));
  const session = runtime.openSession({requestId: 17, signal: new AbortController().signal}), union = []; let cursor = 0;
  await Promise.all([0, 1].map(async () => { while (cursor < indexes.length) union.push(await session.acquireLeaf(indexes[cursor++])); }));
  assert.equal(union.length, 3); assert.equal(calls.length, 3); assert.equal(peak, 2); assert.equal(session.state.status, 'open'); assert.equal(session.stats.sourceLeases, 3);
  assert(union.every(leaf => Object.is(leaf.value.raw.components[0].batches[0].positions[0], -0)), 'each selected leaf follows the real source/gzip/1.3 decoder path');
  session.validateBeforeAdopt(); const managerPrepared = union.map(leaf => ({key: leaf.resource.key, independentlyOwned: true}));
  session.adopt({generation: 9, resourceKeys: managerPrepared.map(prepared => prepared.key)});
  assert.equal(session.state.committed, true); assert.equal(session.state.status, 'adopted'); assert.equal(session.stats.sourceLeases, 0); assert.equal(session.stats.sourceReleases, 3); assert.equal(session.stats.trackedResources, 3, 'only lightweight fresh-demand bindings remain until finish');
  assert.equal(managerPrepared.length, 3, 'adoption only retires session extra source borrows, not manager-owned prepared/GPU scope');
  session.settleReady({generation: 9, ready: true}); assert.equal(session.state.status, 'ready'); session.finish(); assert.equal(session.stats.trackedResources, 0);
});
test('session validates the complete current demand union and releases stale or failed pre-adoption borrows', async () => {
  const f = fixture(), index = await f.resolve(), session = f.runtime.openSession({requestId: 20, signal: new AbortController().signal});
  const pending = session.acquireLeaf(index), resourceKey = f.runtime.select(index).resource.key;
  assert.throws(() => session.validateBeforeAdopt({resourceKeys: [resourceKey]}), /readers have not completed/);
  await pending; assert.throws(() => session.adopt({generation: 1, resourceKeys: [resourceKey]}), /validated settled subset/);
  f.setMode('near'); assert.throws(() => session.validateBeforeAdopt(), StaleBuildingDetailDemandError);
  assert.equal(session.state.committed, false); assert.equal(session.state.status, 'failed-before-publication'); assert.equal(session.stats.sourceLeases, 0); assert.equal(session.stats.trackedResources, 0);
  f.setMode('far'); const failed = f.runtime.openSession({requestId: 21, signal: new AbortController().signal}); await failed.acquireLeaf(index); failed.fail(Error('cohort SOURCE rejected'));
  assert.equal(failed.state.status, 'failed-before-publication'); assert.equal(failed.stats.sourceLeases, 0); failed.finish(); assert.equal(failed.state.status, 'failed-before-publication', 'finally cleanup must not erase the failure outcome');
  const midDocument = structuredClone(f.indexDocument); midDocument.variants[0].level = 'mid';
  const hysteresis = createBuildingDetailRuntime({city: 'berlin', resolveDetailIndex: async () => midDocument,
    readCanonical: async () => { throw Error('selection-only fixture'); }, readBytes: async () => { throw Error('selection-only fixture'); },
    getDemands: () => [{pass: 'main', maxErrorCssPx: 100, maxErrorDrawingBufferPx: 100,
      project: () => ({matrix: [.8, 0, 0, 0, 0, .8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], viewport: {cssWidth: 100, cssHeight: 100, drawingBufferWidth: 100, drawingBufferHeight: 100}})}],
    acquireSelected: async () => ({value: {fixture: 'selected-identity-only'}, release() {}}),
  });
  const midIndex = await hysteresis.resolveDetailIndex(sha('1'), f.canonical, {signal: new AbortController().signal});
  const kept = hysteresis.select(midIndex, undefined, 'mid').resource; assert.equal(kept.level, 'mid');
  const selectedSession = hysteresis.openSession({requestId: 22, signal: new AbortController().signal});
  assert.equal((await selectedSession.acquireSelected(kept, {index: midIndex})).resource.level, 'mid'); selectedSession.validateBeforeAdopt(); selectedSession.abort();
  const leafSession = hysteresis.openSession({requestId: 23, signal: new AbortController().signal});
  assert.equal((await leafSession.acquireLeaf(midIndex, {previousLevel: 'mid'})).resource.level, 'mid'); leafSession.abort();
  const defaultSession = hysteresis.openSession({requestId: 24, signal: new AbortController().signal});
  assert.equal((await defaultSession.acquireLeaf(midIndex)).resource.level, 'near'); defaultSession.abort();
});
test('session same-key reads share only this request; local abort and late source completion release once without cancelling another session', async () => {
  const f = fixture(), index = await f.resolve(), gate = deferred(), readerSignals = []; let extraReleases = 0, entered = 0;
  const runtime = createBuildingDetailRuntime({city: 'berlin', getDemands: f.demands, resolveDetailIndex: async () => undefined,
    readCanonical: async () => { throw Error('override only'); }, readBytes: async () => { throw Error('override only'); },
    async acquireSelected(resource, context) { readerSignals.push(context.signal); const lease = await f.runtime.acquireSelected(resource, context); entered++; await gate.promise; return {get value() { return lease.value; }, release() { extraReleases++; lease.release(); }}; },
  });
  const external = new AbortController(), first = runtime.openSession({requestId: 30, signal: external.signal}), second = runtime.openSession({requestId: 31, signal: external.signal});
  const pending = first.acquireLeaf(index), rejected = assert.rejects(pending, {name: 'AbortError'}); assert.equal(first.acquireLeaf(index), pending);
  const alive = second.acquireLeaf(index); await until(() => entered === 2); first.abort(); assert.equal(external.signal.aborted, false);
  assert.equal(readerSignals[0].aborted, true); assert.equal(readerSignals[1].aborted, false, 'session cancellation releases only its own source consumer');
  gate.resolve(); await rejected; await alive; assert.equal(extraReleases, 1); assert.equal(first.stats.sourceLeases, 0); assert.equal(second.stats.sourceLeases, 1);
  second.abort(); second.abort(); assert.equal(extraReleases, 2); assert.equal(second.stats.sourceLeases, 0);
});
test('session post-adoption readiness failure and abort remain committed without pretending to roll back manager GPU state', async () => {
  const f = fixture(), index = await f.resolve(), external = new AbortController(), session = f.runtime.openSession({requestId: 40, signal: external.signal});
  await session.acquireLeaf(index); session.validateBeforeAdopt(); session.adopt({generation: 12});
  const managerGPU = {generation: 12, ownsPublishedGeometry: true};
  assert.doesNotThrow(() => session.settleReady({generation: 11, ready: true})); assert.equal(session.state.status, 'adopted');
  session.settleReady({generation: 12, ready: false, error: Error('draw readiness timeout')});
  assert.equal(session.state.status, 'committed-not-ready'); assert.equal(session.state.committed, true); assert.match(session.state.error, /timeout/);
  assert.equal(session.stats.sourceLeases, 0); assert.equal(managerGPU.ownsPublishedGeometry, true);
  const aborted = f.runtime.openSession({requestId: 41, signal: external.signal}); await aborted.acquireLeaf(index); aborted.validateBeforeAdopt(); aborted.adopt({generation: 13});
  external.abort(); aborted.settleReady({generation: 13, ready: true});
  assert.equal(aborted.state.status, 'committed-not-ready'); assert.equal(aborted.state.committed, true); assert.equal(aborted.stats.sourceLeases, 0);
  session.finish(); aborted.finish();
});

test('session streams validated partial subsets across generations while two readers and later leaves remain active', async () => {
  const f = fixture(), baseIndex = await f.resolve(), acquired = [], released = [], indexes = [baseIndex, ...[2, 3].map(id => {
    const index = structuredClone(baseIndex); index.canonicalLeaf.id = `leaf-${id}`; index.canonicalLeaf.sha256 = hash(`canonical-${id}`); index.near.asset.sha256 = index.canonicalLeaf.sha256; return index;
  })];
  const runtime = createBuildingDetailRuntime({city: 'berlin', getDemands: f.demands, resolveDetailIndex: async () => undefined,
    readCanonical: async () => { throw Error('borrow fixture only'); }, readBytes: async () => { throw Error('borrow fixture only'); },
    acquireSelected(resource, {signal}) { const gate = deferred(); acquired.push({resource, signal, gate}); return gate.promise.then(() => ({value: {key: resource.key}, release() { released.push(resource.key); }})); },
  });
  const session = runtime.openSession({requestId: 50, signal: new AbortController().signal});
  const first = session.acquireLeaf(indexes[0]), second = session.acquireLeaf(indexes[1]); acquired[0].gate.resolve(); const readyFirst = await first;
  session.validateBeforeAdopt({resourceKeys: [readyFirst.resource.key]});
  const third = session.acquireLeaf(indexes[2]);
  session.adopt({generation: 1, resourceKeys: [readyFirst.resource.key]}); assert.equal(session.stats.sourceLeases, 0); assert.equal(released.length, 1);
  acquired[1].gate.resolve(); acquired[2].gate.resolve(); await Promise.all([second, third]); assert.equal(session.stats.sourceLeases, 2);
  session.validateBeforeAdopt(); session.adopt({generation: 2}); assert.equal(released.length, 3); assert.equal(new Set(released).size, 3); assert.equal(session.stats.sourceLeases, 0);
  session.settleReady({generation: 1, ready: false, error: Error('obsolete partial generation')}); assert.equal(session.state.generation, 2); assert.equal(session.state.status, 'adopted');
  session.settleReady({generation: 2, ready: true}); session.finish(); assert.equal(session.state.status, 'ready'); assert.equal(session.stats.trackedResources, 0);
});
test('session registers manager-owned cache bindings without reads or borrows and still validates their full current resource key', async () => {
  const f = fixture(), index = await f.resolve(), session = f.runtime.openSession({requestId: 60, signal: new AbortController().signal}), resource = f.runtime.select(index).resource;
  session.registerCached(index, resource); assert.equal(f.reads.length, 0); assert.equal(session.stats.acquisitions, 0); assert.equal(session.stats.sourceLeases, 0);
  session.validateBeforeAdopt(); session.adopt({generation: 3, resourceKeys: [resource.key]}); assert.equal(session.state.committed, true); assert.equal(session.stats.sourceReleases, 0);
  session.registerCached(index, resource); f.setMode('near'); assert.throws(() => session.validateBeforeAdopt(), StaleBuildingDetailDemandError);
  assert.equal(session.state.status, 'committed-not-ready'); assert.equal(session.state.committed, true); assert.equal(session.stats.sourceLeases, 0); assert.equal(f.reads.length, 0); assert.equal(session.stats.trackedResources, 0);
  session.close();
});

test('session shares only an in-flight promise and reborrows the completed live lease without reacquisition', async () => {
  const f = fixture(), index = await f.resolve(), session = f.runtime.openSession({requestId: 70, signal: new AbortController().signal});
  const pending = session.acquireLeaf(index); assert.equal(session.acquireLeaf(index), pending);
  const first = await pending, repeated = session.acquireLeaf(index);
  assert.notEqual(repeated, pending, 'a fulfilled leaf promise is no longer stored in the entry');
  const second = await repeated; assert.notEqual(second, first); assert.equal(second.value, first.value); assert.equal(second.resource, first.resource);
  assert.equal(session.stats.acquisitions, 1); assert.equal(session.stats.sourceLeases, 1); assert.equal(session.stats.sourceReleases, 0); assert.equal(f.reads.length, 1);
  session.validateBeforeAdopt(); session.adopt({generation: 7}); assert.equal(session.stats.sourceLeases, 0); assert.equal(session.stats.sourceReleases, 1);
  session.settleReady({generation: 7, ready: true}); session.finish(); assert.equal(session.stats.trackedResources, 0); assert.equal(session.state.status, 'ready');
});

test('session finish cancels its waiter and releases an uncancellable late lease without reading its value', async () => {
  const f = fixture(), index = await f.resolve(), gate = deferred(); let entered = false, readerSignal, releases = 0, valueReads = 0;
  const runtime = createBuildingDetailRuntime({city: 'berlin', getDemands: f.demands, resolveDetailIndex: async () => undefined,
    readCanonical: async () => { throw Error('override only'); }, readBytes: async () => { throw Error('override only'); },
    async acquireSelected(resource, context) { readerSignal = context.signal; const lease = await f.runtime.acquireSelected(resource, context); entered = true; await gate.promise;
      return {get value() { valueReads++; return lease.value; }, release() { releases++; lease.release(); }}; },
  });
  const external = new AbortController(), session = runtime.openSession({requestId: 71, signal: external.signal}), pending = session.acquireLeaf(index), rejected = assert.rejects(pending, {name: 'AbortError'});
  await until(() => entered); session.finish(); session.finish(); assert.equal(readerSignal.aborted, true); assert.equal(external.signal.aborted, false);
  assert.equal(session.stats.trackedResources, 0); gate.resolve(); await rejected;
  assert.equal(valueReads, 0); assert.equal(releases, 1); assert.equal(session.stats.sourceLeases, 0); assert.equal(session.stats.sourceReleases, 1); assert.equal(session.state.status, 'finished');
});

test('session adopts one canonical picking target while another real decoded leaf remains a variant', async () => {
  const f = fixture(), other = structuredClone(f.indexDocument), document = structuredClone(f.document), variantReads = [];
  other.canonicalLeaf = {...other.canonicalLeaf, id: 'leaf-2', path: '/safety/buildings3d/canonical-2.json', sha256: hash('canonical-2')};
  other.near.asset = {...other.near.asset, path: other.canonicalLeaf.path, sha256: other.canonicalLeaf.sha256};
  Object.assign(other.components[0], {objectId: 'osm/way/2', partId: 'component/2'});
  Object.assign(document.components[0], {objectId: 'osm/way/2', partId: 'component/2'}); document.components[0].sourceFeature.id = 'osm/way/2';
  document.detail_variant.canonicalLeafSHA256 = other.canonicalLeaf.sha256;
  const raw = new TextEncoder().encode(JSON.stringify(document)), physical = new Uint8Array(gzipSync(raw));
  other.variants[0].asset = {path: '/safety/buildings3d/detail/coarse-2.json.gz', bytes: physical.length, sha256: hash(physical), compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)};
  const runtime = createBuildingDetailRuntime({city: 'berlin', vertexCap: 100,
    resolveDetailIndex: async (_sha, leaf) => leaf.id === 'leaf-1' ? f.indexDocument : other,
    readCanonical: f.readCanonical,
    async readBytes(path, signal) { signal.throwIfAborted(); assert.equal(path, other.variants[0].asset.path); variantReads.push(path); return physical; },
    getDemands: index => index.canonicalLeaf.id === 'leaf-1' ? [{pass: 'picking', maxErrorCssPx: .5, maxErrorDrawingBufferPx: 1, project: () => undefined}] : f.demands(),
  });
  const indexes = await Promise.all([f.canonical, other.canonicalLeaf].map(leaf => runtime.resolveDetailIndex(sha('1'), leaf, {signal: new AbortController().signal}))), session = runtime.openSession({requestId: 72, signal: new AbortController().signal});
  const [target, neighbour] = await Promise.all(indexes.map(index => session.acquireLeaf(index)));
  assert.equal(target.resource.level, 'near'); assert.equal(neighbour.resource.level, 'coarse'); assert(Object.is(neighbour.value.raw.components[0].batches[0].positions[0], -0));
  assert.deepEqual(f.reads.map(([kind]) => kind), ['canonical']); assert.equal(variantReads.length, 1);
  session.validateBeforeAdopt(); session.adopt({generation: 8}); assert.equal(session.stats.sourceReleases, 2); assert.equal(session.stats.sourceLeases, 0);
  assert.equal(session.state.resourceKeys.length, 2); session.settleReady({generation: 8, ready: true}); session.finish(); assert.equal(session.state.status, 'ready'); assert.equal(session.stats.trackedResources, 0);
});

test('catalogue group metadata conflicts include gzip wire and raw bindings before selected-source acquisition', async () => {
  const f = fixture(), bound = {path: '/safety/buildings3d/detail/groups.json.gz', bytes: 100, sha256: sha('d'), compression: 'gzip', uncompressed_bytes: 1024, uncompressed_sha256: sha('e')}; let releases = 0;
  const resolve = Object.assign(async () => { throw Error('lease-based catalogue path required'); }, {async acquire() { return {value: {...f.indexDocument, groupMetadata: {...bound, uncompressed_sha256: sha('f')}}, groupMetadata: bound, release() { releases++; }}; }});
  const runtime = createBuildingDetailRuntime({city: 'berlin', resolveDetailIndex: resolve, getDemands: f.demands,
    readCanonical: async () => { throw Error('metadata conflict must precede canonical read'); }, readBytes: async () => { throw Error('metadata conflict must precede variant read'); },
  });
  await assert.rejects(runtime.resolveDetailIndex(sha('1'), f.canonical, {signal: new AbortController().signal}), /catalogue group metadata binding mismatch/); assert.equal(releases, 1);
});

test('variant-only integration returns native fallback for unchanged leaves, releases metadata, and keeps actual variants', async () => {
  const f = fixture(); let releases = 0, document = {...f.indexDocument, variants: []};
  const resolver = Object.assign(async () => { throw Error('leased path required'); }, {
    async acquire() { return {value: document, release() { releases++; }}; },
  });
  const runtime = createBuildingDetailRuntime({city: 'berlin', variantLeavesOnly: true,
    resolveDetailIndex: resolver, getDemands: f.demands,
    readCanonical: async () => { throw Error('resolution must not load geometry'); },
    readBytes: async () => { throw Error('canonical-only resolution must not load group or variant assets'); },
  });
  const controller = new AbortController();
  try {
    assert.equal(await runtime.resolveDetailIndex(sha('1'), f.canonical, {signal: controller.signal}), undefined);
    assert.equal(releases, 1); assert.deepEqual(runtime.getBuildingDetailSelectionSnapshot().leaves, []);
    document = f.indexDocument;
    const index = await runtime.resolveDetailIndex(sha('1'), f.canonical, {signal: controller.signal});
    assert(index.variants.length > 0); assert.equal(releases, 2);
    assert.notEqual(runtime.select(index).resource.level, 'near');
    document = {...f.indexDocument, variants: [], canonicalLeaf: {...f.canonical, bytes: f.canonical.bytes + 1},
      near: {...f.indexDocument.near, asset: {...f.indexDocument.near.asset, bytes: f.canonical.bytes + 1}}};
    await assert.rejects(runtime.resolveDetailIndex(sha('1'), f.canonical, {signal: controller.signal}), /canonical leaf descriptor mismatch/);
    assert.equal(releases, 3, 'invalid canonical-only authority is rejected and released, not hidden by fallback');
  } finally {controller.abort();}
});

test('focus pins make loading, cached registration and validation agree on the plan level; hard demands still win', async () => {
  const f = fixture(), index = await f.resolve(), reps = f.runtime.focusRepresentations(index);
  assert.equal(reps.peripheral.level, 'coarse'); assert.equal(reps.level('near').level, 'near'); assert.equal(reps.level('mid'), undefined, 'a level the producer never made is not offered');
  assert.equal(f.runtime.select(index).resource.level, 'coarse');
  f.runtime.pinFocusLevels([{index, level: 'near'}]); assert.equal(f.runtime.focusPinCount, 1);
  assert.equal(f.runtime.select(index).resource.level, 'near'); assert.equal(f.runtime.select(index).reason, 'focus');
  assert.equal(f.runtime.focusRepresentations(index).detail.level, 'coarse', 'the planning query ignores pins');
  const session = f.runtime.openSession({requestId: 61, signal: new AbortController().signal}), held = reps.level('near');
  session.registerCached(index, held); session.validateBeforeAdopt(); session.adopt({generation: 4, resourceKeys: [held.key]});
  assert.equal(session.state.committed, true, 'the held representation validates without a stale-demand failure');
  f.setMode('near'); assert.equal(f.runtime.select(index).reason, 'picking', 'canonical picking overrides any pin'); f.setMode('far');
  f.runtime.pinFocusLevels([{index, level: 'coarse'}]); assert.equal(f.runtime.select(index).resource.key, reps.peripheral.key);
  assert.throws(() => f.runtime.pinFocusLevels([{index, level: 'mid'}]), /missing detail level/);
  assert.throws(() => f.runtime.pinFocusLevels([{index, level: 'near'}, {index, level: 'coarse'}]), /Conflicting/);
  assert.equal(f.runtime.focusPinCount, 1, 'a rejected pin set leaves the previous pins');
  f.runtime.pinFocusLevels([]); assert.equal(f.runtime.focusPinCount, 0); assert.equal(f.runtime.select(index).resource.level, 'coarse');
  session.close();
});
