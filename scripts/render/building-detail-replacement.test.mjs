import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {buildBuildingDetailReplacements, createBuildingDetailProtection, detailJSON, MESHOPT_VERSION, DETAIL_VARIANT_BENEFIT} from './building-detail-variants.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(path.join(repo, 'web/package.json'));
const {build} = require('esbuild');
const compiled = await build({stdin: {contents: [
  "export {parseBuildingDetailDemand,selectBuildingDetailResource,isBuildingDetailMeshoptEncoding} from './safety/building-detail-demand';",
  "export {createBuildingDetailSource} from './safety/building-detail-source';",
  "export {createBuildingDetailResidency} from './safety/building-detail-residency';",
  "export {decodeBuildingDetailMeshopt,decodeBuildingDetailJSON} from './safety/building-detail-meshopt';",
].join('\n'), resolveDir: path.join(repo, 'web/src'), loader: 'ts'}, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'});
const runtime = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const sha = 'a'.repeat(64), digest = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(objectId = 'osm/way/1') {
  const positions = [], normals = [], indices = [], n = 5;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) { positions.push(x * .02, 0, z * .02); normals.push(0, 1, 0); }
  for (let z = 0; z < n - 1; z++) for (let x = 0; x < n - 1; x++) { const a = z * n + x, b = a + 1, c = a + n, d = c + 1; indices.push(a, c, b, b, c, d); }
  const polygon = {type: 'Polygon', coordinates: [[[8.8, 53.1], [8.800001, 53.1], [8.800001, 53.100001], [8.8, 53.100001], [8.8, 53.1]]]};
  return {city: 'bremen', objectId, partId: `${objectId}/fixture`, origin: [8.8, 53.1], componentGeometry: polygon,
    sourceFeature: {id: objectId, type: 'Feature', geometry: polygon, properties: {building: 'yes', name: 'Original SOURCE', signedZero: -0}},
    batches: [{positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), color: [.3, .4, .5], materialName: 'fixture', faceRole: 'roof'}]};
}
function input(components, protectAll = false) {
  return {canonicalShard: {schema_version: 1, city: 'bremen', components},
    canonicalLeaf: {id: 'fixture', path: '/safety/buildings3d/bremen/fixture.json', sha256: sha, bytes: 1},
    provenance: {city: 'bremen', compilerSHA256: sha, sourcePBFSHA256: sha, boundarySHA256: sha, sourceSnapshot: 'synthetic-snapshot',
      canonicalIndex: {path: '/safety/buildings3d/bremen/index.json', sha256: sha, bytes: 1}},
    materialBinding: {kind: 'synthetic-current-material', sha256: sha},
    protection: createBuildingDetailProtection({paintIdentityOwner: (_city, objectId) => protectAll || objectId === 'osm/way/2' ? 'root500' : undefined,
      paintFamily: () => 0, progressiveRows: [], coverage: {city: 'bremen', completeForCity: true}, evidence: [{path: 'synthetic-protection', sha256: sha}]})};
}
const modulePath = process.env.CRIMEMAPS_MESHOPT_SIMPLIFIER;
test('a produced complete replacement survives actual demand selection, verified decode, lease replacement and return to original near geometry', {skip: !modulePath}, async () => {
  assert(path.isAbsolute(modulePath));
  const packageInfo = JSON.parse(await readFile(path.join(path.dirname(modulePath), 'package.json'), 'utf8'));
  assert.equal(packageInfo.name, 'meshoptimizer'); assert.equal(packageInfo.version, MESHOPT_VERSION);
  const libraryBytes = await readFile(modulePath), {MeshoptSimplifier} = await import(pathToFileURL(modulePath).href);
  const encoderPath = path.join(path.dirname(modulePath), 'meshopt_encoder.js'), decoderPath = path.join(path.dirname(modulePath), 'meshopt_decoder.mjs');
  const encoderBytes = await readFile(encoderPath), decoderBytes = await readFile(decoderPath), {MeshoptEncoder} = await import(pathToFileURL(encoderPath).href);
  const components = [fixture(), fixture('osm/way/2')], before = detailJSON(components);
  const result = await buildBuildingDetailReplacements(input(components), {simplifier: MeshoptSimplifier,
    simplifierBinding: {version: MESHOPT_VERSION, sha256: digest(libraryBytes), bytes: libraryBytes.length}, encoder: MeshoptEncoder,
    encoderBinding: {version: MESHOPT_VERSION, sha256: digest(encoderBytes), bytes: encoderBytes.length},
    decoderBinding: {version: MESHOPT_VERSION, sha256: digest(decoderBytes), bytes: decoderBytes.length}});
  assert(result.demandIndex, 'a genuinely reduced resource is required, not just renamed levels');
  assert.equal(result.sidecar.summary.protectedComponents, 1);
  assert.equal(result.sidecar.summary.canonicalAssetsWritten, 0);
  assert.equal(detailJSON(components), before);
  const indexAsset = result.assets.find(asset => asset.kind === 'demand-index');
  assert.equal(digest(indexAsset.bytes), indexAsset.sha256);
  const index = runtime.parseBuildingDetailDemand(JSON.parse(indexAsset.bytes), {city: 'bremen', canonicalIndexSHA256: sha, canonicalLeafSHA256: sha});
  assert.deepEqual(index.components.map(component => component.protected), [false, true]);
  for (const level of index.variants) {
    const reference = level.level === 'coarse' ? index.variants.find(row => row.level === 'mid') ?? index.near : index.near;
    assert(level.triangles <= reference.triangles * DETAIL_VARIANT_BENEFIT.maximumRetainedFraction.triangles &&
      level.decodedBytes <= reference.decodedBytes * DETAIL_VARIANT_BENEFIT.maximumRetainedFraction.decodedBytes, 'a published level saves at least the policy share of its reference');
    const asset = result.assets.find(asset => asset.path === level.asset.path);
    assert.equal(digest(asset.bytes), level.asset.sha256);
    const raw = gunzipSync(asset.bytes); assert.equal(digest(raw), level.asset.uncompressed_sha256);
    const doc = JSON.parse(raw);
    assert.equal(doc.encoding ?? 'json', level.encoding);
    assert(level.encoding === 'json' || runtime.isBuildingDetailMeshoptEncoding(level.encoding));
    assert.equal(doc.components.length, 2, 'a replacement includes held and unchanged canonical members');
    const decoded = runtime.isBuildingDetailMeshoptEncoding(doc.encoding)
      ? await runtime.decodeBuildingDetailMeshopt(doc, {signal: new AbortController().signal, vertexCap: 200000})
      : await runtime.decodeBuildingDetailJSON(doc, {signal: new AbortController().signal, vertexCap: 200000});
    assert.equal(detailJSON(decoded.components[1]), detailJSON(components[1]));
    assert.equal(doc.detail_variant.sourceEquivalenceSHA256, index.bindings.sourceEquivalenceSHA256);
    assert(level.vertices < index.near.vertices && level.triangles < index.near.triangles);
    assert(level.errors.every(error => error.componentIndex === 0));
  }
  const groupAsset = result.assets.find(asset => asset.kind === 'group-metadata');
  const groups = JSON.parse(groupAsset.descriptor.compression === 'gzip' ? gunzipSync(groupAsset.bytes) : groupAsset.bytes);
  const heldGroup = row => row.packingGroups.find(group => group.componentIndices.includes(1));
  const canonicalGroup = heldGroup(groups.levels.find(row => row.level === 'near'));
  assert(groups.levels.filter(row => row.level !== 'near').every(row => heldGroup(row).key === canonicalGroup.key),
    'an unchanged protected group keeps its physical content identity across resource LODs');
  assert(groups.publicationConstraints.every(row => row.closure === 'requires-runtime-cohort' && row.mayPublishIndependently === false));
  const matrix = [.01, 0, 0, 0, 0, .01, 0, 0, 0, 0, .01, 0, 0, 0, 0, 1];
  const demand = {pass: 'main', maxErrorCssPx: 1, maxErrorDrawingBufferPx: 2,
    project: () => ({matrix, viewport: {cssWidth: 800, cssHeight: 600, drawingBufferWidth: 1600, drawingBufferHeight: 1200}})};
  const distant = runtime.selectBuildingDetailResource(index, [demand]); assert.notEqual(distant.resource.level, 'near');
  const near = runtime.selectBuildingDetailResource(index, [{...demand, pass: 'picking'}]); assert.equal(near.resource.level, 'near');
  const originalRaw = {schema_version: 1, city: 'bremen', components, decodedPayloadCost: {retainedPayloadEstimateBytes: 0}};
  let nearReleases = 0; const acquired = [], publications = [];
  const source = runtime.createBuildingDetailSource({city: 'bremen',
    readCanonical: async () => ({raw: originalRaw, verified: {}, physicalBytes: 1, release() { nearReleases++; }}),
    readBytes: async route => result.assets.find(asset => asset.path === route).bytes});
  const residency = runtime.createBuildingDetailResidency({
    async acquire(resource, options) { const lease = await source.acquire(resource, options); const record = {resource, lease, releases: 0}; acquired.push(record);
      return {value: lease.value, release() { record.releases++; lease.release(); }}; },
    async publish(value, resource) { publications.push([value, resource]); },
  });
  await residency.select(near.resource); assert.equal(publications.at(-1)[0].raw, originalRaw);
  await residency.select(distant.resource);
  const display = publications.at(-1)[0]; assert.equal(display.admission.kind, 'display-variant'); assert.equal(display.verified, undefined);
  assert.equal(display.raw.components.length, 2); assert.equal(detailJSON(display.raw.components[1]), detailJSON(components[1]));
  assert.equal(display.raw.components.reduce((n, component) => n + component.batches.reduce((sum, batch) => sum + batch.positions.length / 3, 0), 0), distant.resource.vertices);
  assert.equal(display.raw.components.reduce((n, component) => n + component.batches.reduce((sum, batch) => sum + batch.indices.length / 3, 0), 0), distant.resource.triangles);
  const producedLevel = result.sidecar.variants.find(variant => variant.level === distant.resource.level);
  assert.equal(producedLevel.encodingStats.decodedTypedArrayBytes, display.raw.components.reduce((n, component) => n + component.batches.reduce((sum, batch) => sum + batch.positions.byteLength + batch.normals.byteLength + batch.indices.byteLength, 0), 0));
  assert.equal(producedLevel.encodingStats.quantization, false); assert.equal(producedLevel.encodingStats.reordered, false);
  assert.equal(nearReleases, 1); assert.equal(acquired[0].releases, 1);
  await residency.select(near.resource); assert.equal(publications.at(-1)[0].raw, originalRaw); assert.equal(acquired[1].releases, 1);
  await residency.destroy(); assert.equal(nearReleases, 2); assert(acquired.every(record => record.releases === 1));
  assert.equal(detailJSON(components), before);
});

test('a certified reduction too small to pay for a separate resource stays canonical-only and writes no replacement asset', async () => {
  // One reducible grid among nine protected ones: the certified collapse saves
  // well under a tenth of the leaf, so neither level may be published. No
  // encoder is supplied; reaching the encoding step would throw.
  const components = Array.from({length: 10}, (_, i) => fixture(`osm/way/${i + 1}`)), before = detailJSON(components);
  const base = input(components);
  base.protection = createBuildingDetailProtection({paintIdentityOwner: (_city, objectId) => objectId === 'osm/way/1' ? undefined : 'root500',
    paintFamily: () => 0, progressiveRows: [], coverage: {city: 'bremen', completeForCity: true}, evidence: [{path: 'synthetic-protection', sha256: sha}]});
  const simplifier = {ready: Promise.resolve(), simplifyWithAttributes() { throw Error('coordinated collapse decides this fixture'); }, compactMesh() { throw Error('Unexpected compaction'); }};
  const result = await buildBuildingDetailReplacements(base, {simplifier});
  assert.equal(result.sidecar.summary.protectedComponents, 9);
  for (const level of ['mid', 'coarse']) assert.equal(result.sidecar.summary.outcomes[level]['certified-coordinated-component-collapse'], 1, 'a genuine certified reduction exists');
  assert.deepEqual(result.demandIndex.variants, [], 'no level is registered as a variant');
  assert.deepEqual(result.assets.map(asset => asset.kind).sort(), ['demand-index', 'group-metadata']);
  const rejected = result.sidecar.variants;
  assert.deepEqual(rejected.map(row => [row.level, row.status]), [['mid', 'insufficient-benefit'], ['coarse', 'insufficient-benefit']]);
  for (const row of rejected) {
    assert.equal(row.reference.level, 'near', 'with no published mid, coarse is compared with near');
    assert(row.triangles < row.reference.triangles && row.retainedFraction.triangles > DETAIL_VARIANT_BENEFIT.maximumRetainedFraction.triangles);
    assert.equal(row.retainedFraction.decodedBytes, row.decodedBytes / result.demandIndex.near.decodedBytes);
  }
  assert.equal(result.sidecar.summary.insufficientBenefitLevels, 2); assert.equal(result.sidecar.summary.completeReplacementLevels, 0);
  assert.equal(result.sidecar.benefitPolicy, DETAIL_VARIANT_BENEFIT); assert.equal(result.sidecar.errorBound.measuredDeviation, false);
  assert.equal(detailJSON(components), before);
});

test('an all-protected leaf emits canonical-only grouping without alias LODs and respects cancellation', async () => {
  const components = [fixture()], before = detailJSON(components);
  const simplifier = {ready: Promise.resolve(), simplifyWithAttributes() { throw Error('Protected geometry must not reach the simplifier'); }, compactMesh() { throw Error('Unexpected compaction'); }};
  const result = await buildBuildingDetailReplacements(input(components, true), {simplifier});
  assert(result.demandIndex); assert.deepEqual(result.demandIndex.variants, []);
  assert.equal(result.demandIndex.near.asset.path, input(components, true).canonicalLeaf.path);
  assert.deepEqual(result.assets.map(asset => asset.kind).sort(), ['demand-index', 'group-metadata']);
  const groupAsset = result.assets.find(asset => asset.kind === 'group-metadata');
  const groups = JSON.parse(groupAsset.descriptor.compression === 'gzip' ? gunzipSync(groupAsset.bytes) : groupAsset.bytes);
  assert.deepEqual(groups.levels.map(row => row.level), ['near']);
  assert(groups.publicationConstraints.every(row => row.canonicalOnly));
  assert.equal(result.sidecar.summary.completeReplacementLevels, 0);
  assert.equal(result.sidecar.summary.outcomes.mid['held-canonical'], 1);
  assert.equal(detailJSON(components), before);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(buildBuildingDetailReplacements({...input(components), signal: controller.signal}, {simplifier}), {name: 'AbortError'});
});
