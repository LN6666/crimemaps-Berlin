import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const BUILDING_DETAIL_GROUP_SCHEMA = 'crimemaps-building-detail-groups-v1';
const SHA = /^[a-f0-9]{64}$/;
const check = (condition, message) => { if (!condition) throw Error(message); };
const coreAttributes = new Set(['positions', 'normals', 'indices']);
const runtimeFields = ['generation', 'viewRevision', 'requestId', 'contextEpoch'];
const sourceIdentity = c => `${c.city}|${c.objectId}|${c.partId}`;
const objectIdentity = c => `${c.city}|${c.objectId}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function stableJSON(value, depth = 0) {
  check(depth <= 40, 'Group metadata nesting exceeds bound');
  if (value === null) return 'null';
  if (typeof value === 'number') {
    check(Number.isFinite(value), 'Non-finite group metadata');
    return Object.is(value, -0) ? '-0' : String(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (ArrayBuffer.isView(value)) return stableJSON(Array.from(value), depth + 1);
  if (Array.isArray(value)) return '[' + value.map(v => stableJSON(v, depth + 1)).join(',') + ']';
  check(value && typeof value === 'object', 'Unsupported group metadata');
  return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + stableJSON(value[k], depth + 1)).join(',') + '}';
}

function assetBinding(value, label) {
  check(value && typeof value.path === 'string' && value.path.length > 0 && value.path.length <= 4096 &&
    SHA.test(value.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0, `Invalid ${label} binding`);
  check(value.compression === undefined || value.compression === 'gzip', `Invalid ${label} compression`);
  const result = {path: value.path, sha256: value.sha256, bytes: value.bytes};
  if (value.compression === 'gzip') {
    const rawSHA = value.uncompressed_sha256 ?? value.rawSHA256, rawBytes = value.uncompressed_bytes ?? value.rawBytes;
    check(SHA.test(rawSHA) && Number.isSafeInteger(rawBytes) && rawBytes > 0, `Missing ${label} raw binding`);
    Object.assign(result, {compression: 'gzip', uncompressed_sha256: rawSHA, uncompressed_bytes: rawBytes});
  }
  return result;
}

function attributeHash(array, integer = false) {
  // Match the existing producer's componentReceipt, independent of host endianness.
  const bytes = Buffer.allocUnsafe(array.byteLength);
  for (let i = 0; i < array.length; i++) integer ? bytes.writeUInt32LE(array[i], i * 4) : bytes.writeFloatLE(array[i], i * 4);
  return hash(bytes);
}

/** Same model as building-payload-cost.ts: backing buffers exact, JS payload estimated.
 * Per-group buffer costs can overlap; use the level cost for a deduplicated leaf total. */
export function buildingDetailMetadataCost(value) {
  const seen = new WeakSet(), buffers = new Set();
  let cpuTypedBufferBytes = 0, cpuTypedViewBytes = 0, cpuMetadataEstimateBytes = 0;
  const visit = (v, depth = 0) => {
    check(depth <= 40, 'Building payload nesting exceeds bound');
    if (typeof v === 'number') { cpuMetadataEstimateBytes += 8; return; }
    if (typeof v === 'string') { cpuMetadataEstimateBytes += 24 + v.length * 2; return; }
    if (typeof v === 'boolean') { cpuMetadataEstimateBytes += 4; return; }
    if (v === null || v === undefined || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      cpuTypedViewBytes += v.byteLength;
      if (!buffers.has(v.buffer)) { buffers.add(v.buffer); cpuTypedBufferBytes += v.buffer.byteLength; }
      cpuMetadataEstimateBytes += 64; return;
    }
    if (v instanceof ArrayBuffer) {
      if (!buffers.has(v)) { buffers.add(v); cpuTypedBufferBytes += v.byteLength; }
      cpuMetadataEstimateBytes += 32; return;
    }
    cpuMetadataEstimateBytes += Array.isArray(v) ? 32 + v.length * 8 : 64;
    if (Array.isArray(v)) for (const item of v) visit(item, depth + 1);
    else for (const [key, item] of Object.entries(v)) { cpuMetadataEstimateBytes += 16 + key.length * 2; visit(item, depth + 1); }
  };
  visit(value);
  return {cpuTypedBufferBytes, cpuTypedViewBytes, cpuMetadataEstimateBytes,
    retainedPayloadEstimateBytes: cpuTypedBufferBytes + cpuMetadataEstimateBytes,
    measurement: 'exact-unique-backing-buffers-and-estimated-js-payload-not-heap',
    crossGroupBufferBytesAdditive: false};
}

function inspectComponents(components, city, jsonHash) {
  check(Array.isArray(components) && components.length > 0 && components.length <= 20000, 'Invalid complete component set');
  const identities = new Set(); let vertices = 0, indices = 0;
  return components.map(c => {
    check(c?.city === city && /^osm\/(way|relation)\/[1-9]\d*$/.test(c.objectId) && typeof c.partId === 'string' &&
      c.partId.length > 0 && c.partId.length <= 256 && !identities.has(sourceIdentity(c)), 'Invalid or duplicate source identity');
    identities.add(sourceIdentity(c));
    check(!runtimeFields.some(field => Object.hasOwn(c, field)), 'Runtime revision is not content authority');
    check(Array.isArray(c.origin) && c.origin.length === 2 && c.origin.every(Number.isFinite) &&
      Math.abs(c.origin[0]) <= 180 && Math.abs(c.origin[1]) <= 85, 'Invalid original source origin');
    check(c.sourceFeature?.type === 'Feature' && c.sourceFeature.geometry && Object.hasOwn(c.sourceFeature, 'properties') &&
      c.componentGeometry?.type === 'Polygon', 'Missing explicit SOURCE or component geometry');
    check(Array.isArray(c.batches) && c.batches.length > 0, 'Missing complete component batches');
    const batches = c.batches.map(b => {
      check(b?.positions instanceof Float32Array && b.normals instanceof Float32Array && b.indices instanceof Uint32Array,
        'Canonical typed mesh arrays required');
      check(b.positions.length > 0 && b.positions.length % 3 === 0 && b.normals.length === b.positions.length &&
        b.indices.length > 0 && b.indices.length % 3 === 0 && b.positions.every(Number.isFinite) &&
        b.normals.every(Number.isFinite) && b.indices.every(index => index < b.positions.length / 3), 'Invalid native batch');
      check(b.color?.length === 3 && Array.from(b.color).every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'Invalid native material');
      vertices += b.positions.length / 3; indices += b.indices.length;
      check(vertices <= 200000 && indices <= 1200000, 'Building detail group geometry budget exceeded');
      return {vertices: b.positions.length / 3, triangles: b.indices.length / 3,
        positionsSHA256: attributeHash(b.positions), normalsSHA256: attributeHash(b.normals), indicesSHA256: attributeHash(b.indices, true),
        color: Array.from(b.color), materialMetadataSHA256: jsonHash(Object.fromEntries(Object.entries(b).filter(([key]) => !coreAttributes.has(key))))};
    });
    return {city, objectId: c.objectId, partId: c.partId, origin: [...c.origin],
      sourceFeatureSHA256: jsonHash(c.sourceFeature), componentGeometrySHA256: jsonHash(c.componentGeometry),
      metadataSHA256: jsonHash(Object.fromEntries(Object.entries(c).filter(([key]) => key !== 'batches'))),
      geometrySHA256: jsonHash(batches.map(({positionsSHA256, normalsSHA256, indicesSHA256}) => ({positionsSHA256, normalsSHA256, indicesSHA256}))),
      materialSHA256: jsonHash(batches.map(({color, materialMetadataSHA256}) => ({color, materialMetadataSHA256}))),
      vertices: batches.reduce((sum, b) => sum + b.vertices, 0), triangles: batches.reduce((sum, b) => sum + b.triangles, 0), batches};
  });
}

const geometryRows = rows => rows.map(({city, objectId, partId, geometrySHA256}) => ({city, objectId, partId, geometrySHA256}));
const sourceRows = rows => rows.map(({city, objectId, partId, sourceFeatureSHA256, componentGeometrySHA256, metadataSHA256, materialSHA256}) =>
  ({city, objectId, partId, sourceFeatureSHA256, componentGeometrySHA256, metadataSHA256, materialSHA256}));
const pointer = value => value.replace(/~/g, '~0').replace(/\//g, '~1');

/** The browser reads complete ranges from each physical packing group. The
 * level-wide table repeats those same ranges without group-local offsets.
 * The canonical batch hashes also repeat the near packing spans. Verify exact
 * reconstruction before omitting those duplicate fields from transport.
 * Source receipts, material hashes, cohort constraints and all actual packing
 * spans remain present. No mesh or runtime limit is changed. */
export function compactBuildingDetailGroupMetadata(document) {
  check(document?.schema === BUILDING_DETAIL_GROUP_SCHEMA && Array.isArray(document.levels), 'Invalid group metadata compaction input');
  const levels = document.levels.map(level => {
    check(Array.isArray(level.componentRanges) && Array.isArray(level.packingGroups), 'Missing complete group range tables');
    const reconstructed = level.packingGroups.flatMap(group => group.componentRanges.map(range => {
      const {packedVertexOffset, packedIndexOffset, batchSpans, ...original} = range;
      return {...original, batchSpans: batchSpans.map(span => {
        const {packedVertexOffset, packedIndexOffset, ...originalSpan} = span;
        return originalSpan;
      })};
    })).sort((a, b) => a.componentIndex - b.componentIndex);
    check(stableJSON(reconstructed) === stableJSON(level.componentRanges), 'Packing groups do not reconstruct complete level ranges');
    const {componentRanges, ...compact} = level;
    return compact;
  });
  const near = document.levels.find(level => level.level === 'near');
  check(near && Array.isArray(document.canonicalComponents), 'Missing canonical packing metadata');
  const canonicalRanges = new Map(near.componentRanges.map(range => [range.componentIndex, range]));
  const hashFields = ['positionsSHA256', 'normalsSHA256', 'indicesSHA256', 'materialMetadataSHA256'];
  const canonicalComponents = document.canonicalComponents.map(component => {
    const range = canonicalRanges.get(component.componentIndex);
    check(range && range.batchSpans.length === component.batches.length, 'Missing canonical batch hash witnesses');
    return {...component, batches: component.batches.map((batch, i) => {
      check(hashFields.every(field => SHA.test(batch[field]) && batch[field] === range.batchSpans[i][field]), 'Canonical batch hash witness mismatch');
      return Object.fromEntries(Object.entries(batch).filter(([field]) => !hashFields.includes(field)));
    })};
  });
  return compactDerivedMetadata({...document, canonicalComponents, levels});
}

function footprintBounds(component) {
  const geometry = component.componentGeometry, bounds = [Infinity, Infinity, -Infinity, -Infinity];
  check(Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0, 'Missing original component footprint');
  let count = 0;
  for (const ring of geometry.coordinates) {
    check(Array.isArray(ring) && ring.length >= 4, 'Invalid original component ring');
    for (const position of ring) {
      check(++count <= 20000 && Array.isArray(position) && position.length >= 2 && position.every(Number.isFinite) &&
        Math.abs(position[0]) <= 180 && Math.abs(position[1]) <= 90, 'Invalid original component coordinate');
      bounds[0] = Math.min(bounds[0], position[0]); bounds[1] = Math.min(bounds[1], position[1]);
      bounds[2] = Math.max(bounds[2], position[0]); bounds[3] = Math.max(bounds[3], position[1]);
    }
    check(ring[0].length === ring.at(-1).length && ring[0].every((value, i) => Object.is(value, ring.at(-1)[i])), 'Unclosed original component ring');
  }
  return bounds;
}

/** One bounded canonical leaf plus its already-produced, full same-order levels.
 * levels: [{level:'mid'|'coarse',components,geometrySHA256?,asset?}]; near is automatic.
 * serialize may be the existing detailJSON. This helper neither reads nor writes assets,
 * transforms coordinates, fabricates cohort closure, nor retains the input typed arrays. */
export function buildBuildingDetailGroupMetadata({city, canonicalIndex, canonicalLeaf, provenance, materialBinding,
  protectionSHA256, components, assessments, levels = [], serialize = stableJSON}) {
  check(typeof serialize === 'function', 'Deterministic metadata serializer required');
  const jsonHash = value => {
    const text = serialize(value);
    check(typeof text === 'string' && Buffer.byteLength(text) <= 8 * 1024 ** 2, 'Group metadata serialization budget exceeded');
    return hash(text);
  };
  const copy = value => JSON.parse(serialize(value));
  check(typeof city === 'string' && city.length > 0 && provenance?.city === city &&
    ['sourcePBFSHA256', 'boundarySHA256', 'compilerSHA256'].every(field => SHA.test(provenance[field])) &&
    typeof provenance.sourceSnapshot === 'string' && provenance.sourceSnapshot.length > 0, 'Missing canonical source authority');
  check(materialBinding && SHA.test(materialBinding.sha256) && SHA.test(protectionSHA256), 'Missing material or protection authority');
  const index = assetBinding(canonicalIndex ?? provenance.canonicalIndex, 'canonical index'), leaf = assetBinding(canonicalLeaf, 'canonical leaf');
  if (provenance.canonicalIndex) check(jsonHash(index) === jsonHash(assetBinding(provenance.canonicalIndex, 'provenance canonical index')), 'Canonical index provenance mismatch');
  const canonical = inspectComponents(components, city, jsonHash);
  check(Array.isArray(assessments) && assessments.length === components.length, 'One real protection assessment per component required');
  for (const a of assessments) check(a && typeof a.held === 'boolean' && Array.isArray(a.reasons) && a.reasons.every(v => typeof v === 'string') &&
    typeof a.groupKey === 'string' && a.groupKey.length > 0 && typeof a.owner === 'string' && Number.isFinite(a.family) &&
    Array.isArray(a.admissionIdentities), 'Invalid protection inspection assessment');
  const protectionAssessments = copy(assessments), heldAssessmentGroups = new Set(assessments.filter(a => a.held).map(a => a.groupKey));
  const objectMembers = new Map();
  components.forEach((component, i) => {
    const key = objectIdentity(component), members = objectMembers.get(key) ?? [];
    members.push(i); objectMembers.set(key, members);
  });
  const authority = {canonicalIndexSHA256: index.sha256, canonicalLeafSHA256: leaf.sha256,
    sourcePBFSHA256: provenance.sourcePBFSHA256, boundarySHA256: provenance.boundarySHA256, compilerSHA256: provenance.compilerSHA256,
    sourceSnapshot: provenance.sourceSnapshot, materialSHA256: materialBinding.sha256,
    materialBindingSHA256: jsonHash(materialBinding), protectionSHA256,
    sourceEquivalenceSHA256: jsonHash(sourceRows(canonical))};
  const publicationConstraints = [...objectMembers.values()].map(componentIndices => {
    const first = components[componentIndices[0]], canonicalOnly = componentIndices.some(i => heldAssessmentGroups.has(assessments[i].groupKey));
    const dependencyMetadataRefs = componentIndices.flatMap(i => {
      const c = components[i], base = `#/components/${i}`, refs = [];
      for (const key of Object.keys(c).filter(key => c[key] !== undefined && !['city', 'objectId', 'partId', 'origin', 'batches', 'componentGeometry', 'sourceFeature', 'displayEstimates'].includes(key)))
        refs.push({assetSHA256: leaf.sha256, representation: 'canonical-codec-decoded-components', ref: `${base}/${pointer(key)}`, sha256: jsonHash(c[key])});
      if (c.displayEstimates) for (const [key, value] of Object.entries(c.displayEstimates)) if (value !== undefined)
        refs.push({assetSHA256: leaf.sha256, representation: 'canonical-codec-decoded-components', ref: `${base}/displayEstimates/${pointer(key)}`, sha256: jsonHash(value)});
      return refs;
    });
    const row = {sourceObject: {city, objectId: first.objectId}, observedComponentIndices: [...componentIndices],
      observedMembers: componentIndices.map(i => ({objectId: components[i].objectId, partId: components[i].partId})),
      membershipScope: 'selected-canonical-leaf', completeAcrossLeaves: false, closure: 'requires-runtime-cohort',
      mayPublishIndependently: false, canonicalOnly,
      protectionAssessmentRefs: componentIndices.map(i => `#/protectionAssessments/${i}`), dependencyMetadataRefs,
      admissionIdentities: componentIndices.flatMap(i => protectionAssessments[i].admissionIdentities)};
    return {key: jsonHash({authority, ...row}), ...row};
  });
  const canonicalComponents = canonical.map((receipt, i) => ({componentIndex: i, ...receipt, geographicBounds: footprintBounds(components[i]),
    metadataRef: {assetSHA256: leaf.sha256, representation: 'canonical-codec-decoded-components', ref: `#/components/${i}`}}));
  const coordinateFrame = {schema: 'source-local-mercator-meters-v1', axes: {x: 'east', y: 'up', z: 'north'}, unit: 'meter',
    originOrder: ['longitude', 'latitude'], originUnit: 'degree', anchorPrecision: 'float64',
    packingTransform: 'existing-renderer-mercator-unit-v1', arithmetic: 'double-source-origin-minus-stable-anchor-before-float32',
    earthCircumferenceM: 2 * Math.PI * 6378137};
  check(Array.isArray(levels) && levels.length <= 2, 'Invalid replacement level set');
  const seenLevels = new Set();
  for (const selected of levels) {
    check(selected && ['mid', 'coarse'].includes(selected.level) && !seenLevels.has(selected.level), 'Duplicate or invalid detail level');
    seenLevels.add(selected.level);
  }
  const orderedLevels = [...levels].sort((a, b) => (a.level === 'mid' ? 0 : 1) - (b.level === 'mid' ? 0 : 1));
  const levelRows = [{level: 'near', components, asset: leaf}, ...orderedLevels].map(selected => {
    const receipts = selected.level === 'near' ? canonical : inspectComponents(selected.components, city, jsonHash);
    check(receipts.length === canonical.length && jsonHash(sourceRows(receipts)) === authority.sourceEquivalenceSHA256, 'Replacement SOURCE, metadata, material, order or membership changed');
    const geometrySHA256 = jsonHash(geometryRows(receipts));
    if (selected.geometrySHA256 !== undefined) check(selected.geometrySHA256 === geometrySHA256, 'Selected geometry authority mismatch');
    let vertexOffset = 0, indexOffset = 0;
    const componentRanges = receipts.map((receipt, componentIndex) => {
      const startVertex = vertexOffset, startIndex = indexOffset;
      const batchSpans = receipt.batches.map((batch, batchIndex) => {
        const row = {componentIndex, batchIndex, vertexOffset, vertexCount: batch.vertices, indexOffset, indexCount: batch.triangles * 3,
          sourceIndexBase: 'batch-local', positionsSHA256: batch.positionsSHA256, normalsSHA256: batch.normalsSHA256,
          indicesSHA256: batch.indicesSHA256, materialMetadataSHA256: batch.materialMetadataSHA256};
        vertexOffset += row.vertexCount; indexOffset += row.indexCount; return row;
      });
      return {componentIndex, objectId: receipt.objectId, partId: receipt.partId, origin: [...receipt.origin],
        vertexOffset: startVertex, vertexCount: vertexOffset - startVertex, indexOffset: startIndex, indexCount: indexOffset - startIndex, batchSpans};
    });
    const packingGroups = publicationConstraints.map(constraint => {
      const componentIndices = constraint.observedComponentIndices, anchor = [...components[componentIndices[0]].origin];
      let packedVertexOffset = 0, packedIndexOffset = 0;
      const ranges = componentIndices.map(i => {
        if (constraint.canonicalOnly) check(receipts[i].geometrySHA256 === canonical[i].geometrySHA256, 'Protected source object must remain canonical');
        const originalRange = componentRanges[i], groupVertexStart = packedVertexOffset, groupIndexStart = packedIndexOffset;
        const batchSpans = originalRange.batchSpans.map(batch => {
          const row = {...batch, packedVertexOffset, packedIndexOffset};
          packedVertexOffset += batch.vertexCount; packedIndexOffset += batch.indexCount; return row;
        });
        return {...originalRange, packedVertexOffset: groupVertexStart, packedIndexOffset: groupIndexStart, batchSpans};
      });
      const groupAuthority = {...authority, selectedGeometrySHA256: jsonHash(geometryRows(componentIndices.map(i => receipts[i])))};
      const geographicBounds = componentIndices.reduce((bounds, i) => {
        const next = canonicalComponents[i].geographicBounds;
        return [Math.min(bounds[0], next[0]), Math.min(bounds[1], next[1]), Math.max(bounds[2], next[2]), Math.max(bounds[3], next[3])];
      }, [Infinity, Infinity, -Infinity, -Infinity]);
      const canonicalGeometry = jsonHash(geometryRows(componentIndices.map(i => canonical[i])));
      // Leaf offsets vary when an earlier, unrelated object changes LOD. They describe
      // how to read this resource, not this group's immutable packed buffer identity.
      const packedLayout = ranges.map(({vertexOffset, indexOffset, batchSpans, ...range}) => ({...range,
        batchSpans: batchSpans.map(({vertexOffset, indexOffset, ...batch}) => batch)}));
      const identity = {schema: BUILDING_DETAIL_GROUP_SCHEMA, city,
        geometryRole: groupAuthority.selectedGeometrySHA256 === canonicalGeometry ? 'canonical' : 'display-variant', authority: groupAuthority,
        componentIndices, packedLayout, anchor, coordinateFrame, geographicBounds,
        boundsAuthority: 'original-component-footprints-not-display-cull-certificate', publicationConstraintKey: constraint.key};
      const descriptor = {...identity}; delete descriptor.packedLayout;
      return {key: jsonHash(identity), kind: 'physical-packing-group', ...descriptor, level: selected.level, componentRanges: ranges,
        unit: 'meter', componentOrder: componentIndices.map(i => sourceIdentity(components[i])),
        vertices: packedVertexOffset, indices: packedIndexOffset, triangles: packedIndexOffset / 3,
        cost: buildingDetailMetadataCost(componentIndices.map(i => selected.components[i]))};
    });
    const row = {level: selected.level, geometrySHA256, sourceEquivalenceSHA256: authority.sourceEquivalenceSHA256,
      componentCount: receipts.length, vertices: vertexOffset, indices: indexOffset, triangles: indexOffset / 3,
      componentRanges, packingGroups, cost: buildingDetailMetadataCost(selected.components)};
    if (selected.asset) row.asset = assetBinding(selected.asset, `${selected.level} asset`);
    return row;
  });
  const result = {schema: BUILDING_DETAIL_GROUP_SCHEMA, schemaVersion: 1, city, authority, canonicalIndex: index, canonicalLeaf: leaf,
    coordinateFrame, canonicalComponents, protectionAssessments, publicationConstraints, levels: levelRows};
  // CPU leaf identity, physical packing identity and semantic publication requirements stay distinct.
  return {key: jsonHash(result), ...result, metadataCost: buildingDetailMetadataCost(result)};
}

const digest = value => createHash('sha256').update(stableJSON(value)).digest('hex');
function witnesses(document) {
  const near = document.levels.find(level => level.level === 'near');
  assert(near && Array.isArray(near.packingGroups));
  const ranges = new Map(near.packingGroups.flatMap(group => group.componentRanges).map(range => [range.componentIndex, range]));
  assert.equal(ranges.size, document.canonicalComponents.length);
  return ranges;
}
function componentHashes(component, range) {
  assert.equal(component.batches.length, range.batchSpans.length);
  const geometry = range.batchSpans.map(({positionsSHA256,normalsSHA256,indicesSHA256}) => ({positionsSHA256,normalsSHA256,indicesSHA256}));
  const materials = component.batches.map((batch, i) => ({color:batch.color, materialMetadataSHA256:range.batchSpans[i].materialMetadataSHA256}));
  return {geometrySHA256:digest(geometry), materialSHA256:digest(materials)};
}
function constraintDuplicates(constraint, document) {
  const ids = constraint.observedComponentIndices;
  return {
    observedMembers: ids.map(i => ({objectId:document.canonicalComponents[i].objectId, partId:document.canonicalComponents[i].partId})),
    protectionAssessmentRefs: ids.map(i => `#/protectionAssessments/${i}`),
    admissionIdentities: ids.flatMap(i => document.protectionAssessments[i].admissionIdentities),
  };
}
export function compactDerivedMetadata(document) {
  const ranges = witnesses(document);
  const canonicalComponents = document.canonicalComponents.map(component => {
    const calculated = componentHashes(component, ranges.get(component.componentIndex));
    assert.equal(component.geometrySHA256, calculated.geometrySHA256, 'Canonical geometry hash witness mismatch');
    assert.equal(component.materialSHA256, calculated.materialSHA256, 'Canonical material hash witness mismatch');
    const {geometrySHA256, materialSHA256, ...retained} = component;
    return retained;
  });
  const publicationConstraints = document.publicationConstraints.map(constraint => {
    const calculated = constraintDuplicates(constraint, document);
    for (const field of Object.keys(calculated)) assert.equal(stableJSON(constraint[field]), stableJSON(calculated[field]), field+' witness mismatch');
    const {observedMembers, protectionAssessmentRefs, admissionIdentities, ...retained} = constraint;
    return retained;
  });
  const compact = {...document, canonicalComponents, publicationConstraints};
  assert.equal(stableJSON(restoreDerivedMetadata(compact)), stableJSON(document), 'Exact metadata reconstruction failed');
  return compact;
}
export function restoreDerivedMetadata(document) {
  const ranges = witnesses(document);
  const canonicalComponents = document.canonicalComponents.map(component => ({...component, ...componentHashes(component, ranges.get(component.componentIndex))}));
  const publicationConstraints = document.publicationConstraints.map(constraint => ({...constraint, ...constraintDuplicates(constraint, document)}));
  return {...document, canonicalComponents, publicationConstraints};
}
