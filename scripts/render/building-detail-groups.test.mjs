import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBuildingDetailGroupMetadata, buildingDetailMetadataCost, compactBuildingDetailGroupMetadata, restoreDerivedMetadata} from './building-detail-groups.mjs';
import {createRequire} from 'node:module';
import {createBuildingDetailProtection, detailJSON} from './building-detail-variants.mjs';

const sha = digit => digit.repeat(64);
function batch(size = 4) {
  return {positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1].slice(0, size * 3)),
    normals: new Float32Array(Array.from({length: size}, () => [0, 1, 0]).flat()),
    indices: new Uint32Array(size === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]), color: [.3, .4, .5], materialName: 'synthetic'};
}
function component(objectId, partId, batches = [batch()]) {
  const geometry = {type: 'Polygon', coordinates: [[[8.8, 53.1], [8.801, 53.1], [8.801, 53.101], [8.8, 53.1]]]};
  return {city: 'bremen', objectId, partId, origin: [8.800000000000003, 53.10000000000001], componentGeometry: geometry,
    sourceFeature: {type: 'Feature', geometry, properties: {building: 'yes', name: 'Synthetic fixture only'}}, batches};
}
function fixture(components, protectionOptions = {}) {
  const protection = createBuildingDetailProtection({paintIdentityOwner: () => undefined, paintFamily: () => 0, progressiveRows: [],
    coverage: {city: 'bremen', completeForCity: true}, evidence: [{path: 'synthetic-protection', sha256: sha('a')}], ...protectionOptions});
  const canonicalIndex = {path: '/synthetic/index.json', sha256: sha('b'), bytes: 100};
  return {city: 'bremen', canonicalIndex, canonicalLeaf: {path: '/synthetic/leaf.json', sha256: sha('c'), bytes: 100},
    provenance: {city: 'bremen', canonicalIndex, sourcePBFSHA256: sha('d'), boundarySHA256: sha('e'), compilerSHA256: sha('f'), sourceSnapshot: 'synthetic'},
    materialBinding: {kind: 'synthetic-material-authority', sha256: sha('1')}, protectionSHA256: sha('2'),
    components, assessments: components.map(c => protection.inspect(c)), serialize: detailJSON};
}

test('compact transport retains the exact actual runtime groups for all produced levels', async () => {
  const components = [component('osm/way/1', 'first'), component('osm/way/2', 'middle'), component('osm/way/1', 'last')];
  const input = fixture(components), full = buildBuildingDetailGroupMetadata({...input,
    levels: [{level: 'mid', components: components.map(c => ({...c, batches: [batch(3)]}))}]});
  const before = detailJSON(full), compact = compactBuildingDetailGroupMetadata(full);
  assert.equal(detailJSON(full), before, 'source metadata is never mutated');
  assert(Buffer.byteLength(detailJSON(compact)) < Buffer.byteLength(before));
  assert(compact.levels.every(level => !Object.hasOwn(level, 'componentRanges')));
  const restored = restoreDerivedMetadata(compact);
  for (const [i, component] of restored.canonicalComponents.entries()) {
    const fullComponent = full.canonicalComponents[i];
    const {batches, ...identity} = component, {batches: fullBatches, ...fullIdentity} = fullComponent;
    assert.deepEqual(identity, fullIdentity);
    for (const [b, batch] of batches.entries()) {
      const witness = full.levels[0].componentRanges[i].batchSpans[b];
      const hashes = Object.fromEntries(['positionsSHA256', 'normalsSHA256', 'indicesSHA256', 'materialMetadataSHA256'].map(field => [field, witness[field]]));
      assert.deepEqual({...batch, ...hashes}, fullBatches[b], 'omitted hashes reconstruct exactly from the retained near ranges');
    }
  }
  assert.deepEqual(restored.publicationConstraints, full.publicationConstraints);
  for (const field of ["geometrySHA256", "materialSHA256"]) {
    const tampered = structuredClone(full); tampered.canonicalComponents[0][field] = "0".repeat(64);
    assert.throws(() => compactBuildingDetailGroupMetadata(tampered), /hash witness mismatch/);
  }
  assert.deepEqual(compact.protectionAssessments, full.protectionAssessments);
  const require = createRequire(new URL('../../web/package.json', import.meta.url));
  const {build} = require('esbuild');
  const built = await build({entryPoints: [new URL('../../web/src/safety/building-detail-groups.ts', import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'esm', write: false});
  const {parseBuildingDetailGroups} = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
  for (const level of full.levels) {
    const source = {components: level.level === 'near' ? components : components.map(c => ({...c, batches: [batch(3)]}))};
    const resource = {city: input.city, level: level.level, descriptor: level.asset, ...full.authority,
      bindings: full.authority, components: full.canonicalComponents, componentCount: components.length,
      geometrySHA256: level.geometrySHA256, vertices: level.vertices, triangles: level.triangles};
    assert.deepEqual(parseBuildingDetailGroups(compact, resource, source), parseBuildingDetailGroups(full, resource, source));
  }
});

test('compaction refuses mismatched or incomplete duplicate ranges instead of hiding them', () => {
  for (const mutate of [d => d.levels[0].componentRanges.pop(),
    d => {d.levels[0].componentRanges[0].batchSpans[0].vertexCount++;},
    d => d.levels[0].packingGroups.pop()]) {
    const d = buildBuildingDetailGroupMetadata(fixture([component('osm/way/1', 'a'), component('osm/way/2', 'b')]));
    // Round trip to break producer sharing before injecting a real disagreement.
    const copied = JSON.parse(detailJSON(d)); mutate(copied);
    assert.throws(() => compactBuildingDetailGroupMetadata(copied), /reconstruct complete level ranges/);
  }
  const mismatched = buildBuildingDetailGroupMetadata(fixture([component('osm/way/1', 'a')]));
  mismatched.canonicalComponents[0].batches[0].positionsSHA256 = sha('0');
  assert.throws(() => compactBuildingDetailGroupMetadata(mismatched), /Canonical batch hash witness mismatch/);
});

test('noncontiguous same-object parts have exact group spans and stable original anchors without claiming cohort closure', () => {
  const a = component('osm/way/1', 'first', [batch(), batch(3)]), b = component('osm/way/2', 'other'), c = component('osm/way/1', 'last');
  c.origin = [8.800000001000003, 53.10000000200001];
  a.displayEstimates = {surfaceFrameProof: {certificateSHA256: sha('3'), dependency: 'synthetic-owner-reference'}};
  const input = fixture([a, b, c], {paintFamily: () => 7}), before = detailJSON(input.components);
  const result = buildBuildingDetailGroupMetadata(input), near = result.levels[0], [group, other] = near.packingGroups;
  assert.deepEqual(group.componentIndices, [0, 2]);
  assert.deepEqual(group.componentOrder, ['bremen|osm/way/1|first', 'bremen|osm/way/1|last']);
  assert.deepEqual(group.componentRanges.map(r => [r.vertexOffset, r.indexOffset, r.packedVertexOffset, r.packedIndexOffset]), [[0, 0, 0, 0], [11, 15, 7, 9]]);
  assert.deepEqual(group.componentRanges[0].batchSpans.map(r => [r.vertexOffset, r.vertexCount, r.indexOffset, r.indexCount]), [[0, 4, 0, 6], [4, 3, 6, 3]]);
  assert.deepEqual(group.anchor, a.origin); assert.notEqual(group.anchor, a.origin);
  assert.deepEqual(group.componentRanges[1].origin, c.origin);
  assert.deepEqual(result.coordinateFrame.axes, {x: 'east', y: 'up', z: 'north'});
  assert.equal(group.unit, 'meter'); assert.equal(result.coordinateFrame.originUnit, 'degree');
  assert.equal(result.coordinateFrame.anchorPrecision, 'float64');
  assert.equal(result.publicationConstraints.length, 2, 'equal paint family never merges distinct source objects');
  const constraint = result.publicationConstraints[0];
  assert.equal(constraint.completeAcrossLeaves, false); assert.equal(constraint.closure, 'requires-runtime-cohort');
  assert.equal(constraint.mayPublishIndependently, false);
  assert.deepEqual(constraint.dependencyMetadataRefs.map(r => r.ref), ['#/components/0/displayEstimates/surfaceFrameProof']);
  assert.equal(constraint.dependencyMetadataRefs[0].assetSHA256, input.canonicalLeaf.sha256);
  assert.deepEqual(result.canonicalComponents[0].metadataRef, {assetSHA256: input.canonicalLeaf.sha256,
    representation: 'canonical-codec-decoded-components', ref: '#/components/0'});
  assert.equal(group.publicationConstraintKey, constraint.key); assert.notEqual(group.key, other.key);
  assert.equal(buildBuildingDetailGroupMetadata({...input, generation: 101, viewRevision: 7}).key, result.key);
  assert.equal(detailJSON(input.components), before, 'no rebasing, mutation or replacement of source arrays');
  a.origin[0] = 0;
  assert.notEqual(group.anchor[0], 0, 'published metadata does not alias mutable producer inputs');
});

test('selected levels bind actual geometry and preserve all SOURCE/material metadata while real protection holds sibling parts', () => {
  const ordinary = component('osm/way/1', 'ordinary'), protectedA = component('osm/relation/2', 'owner'), protectedB = component('osm/relation/2', 'sibling');
  const input = fixture([ordinary, protectedA, protectedB], {
    paintIdentityOwner: (_city, _object, part) => part === 'owner' ? 'root500' : undefined,
    progressiveRows: [{city: 'bremen', objectId: 'osm/relation/2', partId: 'owner', family: 'synthetic-admission', descriptionSHA256: sha('4')}],
  });
  const replacement = [{...ordinary, batches: [batch(3)]}, protectedA, protectedB];
  const result = buildBuildingDetailGroupMetadata({...input, levels: [{level: 'mid', components: replacement}]});
  const [near, mid] = result.levels;
  assert.notEqual(near.geometrySHA256, mid.geometrySHA256); assert.equal(near.sourceEquivalenceSHA256, mid.sourceEquivalenceSHA256);
  assert.notEqual(near.packingGroups[0].key, mid.packingGroups[0].key);
  assert.equal(near.packingGroups[1].key, mid.packingGroups[1].key, 'unchanged protected data survives an earlier group changing LOD and leaf offsets');
  assert.notEqual(near.packingGroups[1].componentRanges[0].vertexOffset, mid.packingGroups[1].componentRanges[0].vertexOffset);
  assert.equal(mid.packingGroups[1].geometryRole, 'canonical');
  assert.equal(result.publicationConstraints[1].canonicalOnly, true);
  assert.equal(result.publicationConstraints[1].admissionIdentities[0].descriptionSHA256, sha('4'));
  assert.equal(result.protectionAssessments[1].owner, 'root500');
  const changedSibling = [...replacement]; changedSibling[2] = {...protectedB, batches: [batch(3)]};
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'mid', components: changedSibling}]}), /must remain canonical/);
  const changedSource = [...replacement]; changedSource[0] = {...replacement[0], sourceFeature: {...ordinary.sourceFeature, properties: {building: 'yes'}}};
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'mid', components: changedSource}]}), /SOURCE, metadata, material, order or membership/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'mid', components: replacement, geometrySHA256: sha('0')}]}), /geometry authority mismatch/);
  const materialChange = buildBuildingDetailGroupMetadata({...input, materialBinding: {...input.materialBinding, sha256: sha('5')}});
  assert.notEqual(materialChange.levels[0].packingGroups[0].key, near.packingGroups[0].key);
});

test('exact typed-buffer costs deduplicate shared backing stores and keep JS metadata estimates separate', () => {
  const shared = batch(), first = component('osm/way/1', 'first', [shared]), second = component('osm/way/2', 'second', [shared]);
  const result = buildBuildingDetailGroupMetadata(fixture([first, second])), cost = result.levels[0].cost;
  const exactBytes = shared.positions.buffer.byteLength + shared.normals.buffer.byteLength + shared.indices.buffer.byteLength;
  assert.equal(cost.cpuTypedBufferBytes, exactBytes); assert.equal(cost.cpuTypedViewBytes, exactBytes);
  assert.deepEqual(buildingDetailMetadataCost([first, second]), cost);
  assert(cost.cpuMetadataEstimateBytes > 0);
  assert.equal(cost.retainedPayloadEstimateBytes, exactBytes + cost.cpuMetadataEstimateBytes);
  assert.equal(cost.crossGroupBufferBytesAdditive, false);
  assert.equal(result.levels[0].packingGroups.reduce((sum, group) => sum + group.cost.cpuTypedBufferBytes, 0), exactBytes * 2);
  const withMoreMetadata = component('osm/way/1', 'first', [shared]); withMoreMetadata.sourceFeature.properties.description = 'extra synthetic metadata';
  const larger = buildBuildingDetailGroupMetadata(fixture([withMoreMetadata, second]));
  assert.equal(larger.levels[0].cost.cpuTypedBufferBytes, exactBytes);
  assert(larger.levels[0].cost.cpuMetadataEstimateBytes > cost.cpuMetadataEstimateBytes);
});

test('partial, reordered, ambiguous runtime identities and mismatched authority are rejected before metadata publication', () => {
  const first = component('osm/way/1', 'first'), second = component('osm/way/1', 'second'), input = fixture([first, second]);
  for (const replacement of [[first], [second, first]])
    assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'coarse', components: replacement}]}), /SOURCE, metadata, material, order or membership/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, components: [first, first]}), /duplicate source identity/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, components: [{...first, generation: 2}, second]}), /Runtime revision/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, assessments: []}), /protection assessment/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, canonicalIndex: {...input.canonicalIndex, sha256: sha('0')}}), /provenance mismatch/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, protectionSHA256: undefined}), /protection authority/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'mid', components: input.components}, {level: 'mid', components: input.components}]}), /Duplicate or invalid/);
  assert.throws(() => buildBuildingDetailGroupMetadata({...input, levels: [{level: 'near', components: input.components}]}), /Duplicate or invalid/);
});
