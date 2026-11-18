#!/usr/bin/env node
/**
 * Offline, bounded geometry detail producer. This file does not install data,
 * alter the canonical index, grant paint admission, or enable a runtime LOD.
 *
 * CLI: node scripts/render/building-detail-variants.mjs --plan /abs/plan.json --simplifier /abs/meshopt_simplifier.js
 * Plan: {schemaVersion:1, repoRoot, siteRoot, index:{path,sha256,bytes}, leafId,
 *        outputRoot, assetBasePath, levels?:[{level,ratio,maxErrorM}], limits?,
 *        geometryPolicy?:'boundary-aware-display-v1'}
 * The index and exactly one selected canonical leaf are bound by SHA/size.
 * outputRoot must not already exist. No canonical asset is copied or rewritten.
 *
 * Tests may inject MeshoptSimplifier into buildBuildingDetailVariants. The CLI
 * requires an explicit meshoptimizer 1.3.0 module from a separate installation
 * or integrity-verified package extraction. The prototype does not add a browser
 * dependency or modify the shared frontend dependency installation.
 */
import {createHash} from 'node:crypto';
import {readFile, stat, statfs, realpath, mkdir, writeFile, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {gunzipSync, gzipSync} from 'node:zlib';
import {setImmediate as yieldTurn} from 'node:timers/promises';

export const BUILDING_DETAIL_SCHEMA = 'crimemaps-building-detail-variants-v1';
export const MESHOPT_VERSION = '1.3.0';
export const DEFAULT_DETAIL_LEVELS = Object.freeze([
  Object.freeze({level: 'mid', ratio: .65, maxErrorM: .08}),
  Object.freeze({level: 'coarse', ratio: .35, maxErrorM: .25}),
]);
export const DETAIL_LIMITS = Object.freeze({
  maxInputBytes: 8 * 1024 ** 2,
  maxRawBytes: 8 * 1024 ** 2,
  maxOutputBytes: 16 * 1024 ** 2,
  maxMetadataBytes: 8 * 1024 ** 2,
  maxVertices: 200000,
  maxTriangles: 400000,
  maxComponents: 20000,
  maxBatchVertices: 100000,
  maxBatchTriangles: 200000,
  maxErrorSamples: 1200000,
  maxMilliseconds: 120000,
});
const SHA = /^[a-f0-9]{64}$/;
const OWNERS = new Set(['root500', 'delegated500', 'tier300', 'city', 'church', 'infill', 'bremen']);
const identity = c => `${c.city}|${c.objectId}|${c.partId}`;
const objectKey = c => `${c.city}|${c.objectId}`;
const hash = data => createHash('sha256').update(data).digest('hex');
const check = (condition, message) => { if (!condition) throw Error(message); };
// Captured with the loaded implementation; it is separate from the canonical
// source compiler fingerprint inherited from the immutable city index.
const PRODUCER_SHA256 = hash(await readFile(fileURLToPath(import.meta.url)));

/** Deterministic JSON, including signed zero in lossless SOURCE coordinates. */
export function detailJSON(value) {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    check(Number.isFinite(value), 'Non-finite JSON number');
    return Object.is(value, -0) ? '-0' : String(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (ArrayBuffer.isView(value)) return detailJSON(Array.from(value));
  if (Array.isArray(value)) return '[' + value.map(v => detailJSON(v)).join(',') + ']';
  check(value && typeof value === 'object', 'Unsupported JSON value');
  return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + detailJSON(value[k])).join(',') + '}';
}
const jsonHash = value => hash(detailJSON(value));
const serializable = value => JSON.parse(detailJSON(value));

export function limitsFor(overrides = {}) {
  check(overrides && typeof overrides === 'object' && !Array.isArray(overrides), 'Invalid limits');
  for (const [key, value] of Object.entries(overrides)) {
    check(key in DETAIL_LIMITS && Number.isSafeInteger(value) && value > 0 && value <= DETAIL_LIMITS[key], `Invalid limit: ${key}`);
  }
  return {...DETAIL_LIMITS, ...overrides};
}
export function levelsFor(levels = DEFAULT_DETAIL_LEVELS) {
  check(Array.isArray(levels) && levels.length > 0 && levels.length <= 2, 'Invalid detail levels');
  const names = new Set();
  for (const row of levels) {
    check(row && ['mid', 'coarse'].includes(row.level) && !names.has(row.level), 'Invalid/duplicate detail level');
    check(Number.isFinite(row.ratio) && row.ratio > 0 && row.ratio < 1, 'Invalid triangle ratio');
    check(Number.isFinite(row.maxErrorM) && row.maxErrorM > 0 && row.maxErrorM <= 1, 'Invalid absolute error limit');
    names.add(row.level);
  }
  const mid = levels.find(row => row.level === 'mid'), coarse = levels.find(row => row.level === 'coarse');
  if (mid && coarse) check(coarse.ratio < mid.ratio && coarse.maxErrorM >= mid.maxErrorM, 'Coarse target must be smaller than mid with no tighter error limit');
  return levels.map(row => ({level: row.level, ratio: row.ratio, maxErrorM: row.maxErrorM})).sort((a, b) => (a.level === 'mid' ? 0 : 1) - (b.level === 'mid' ? 0 : 1));
}
function abortCheck(signal, deadline) {
  if (signal?.aborted) throw new DOMException('Building detail generation aborted', 'AbortError');
  check(Date.now() <= deadline, 'Building detail generation time bound exceeded');
}
async function readyWithinBound(ready, signal, deadline) {
  abortCheck(signal, deadline);
  let timer, onAbort;
  const stop = new Promise((_, reject) => {
    onAbort = () => reject(new DOMException('Building detail generation aborted', 'AbortError'));
    signal?.addEventListener('abort', onAbort, {once: true});
    timer = setTimeout(() => reject(Error('Building detail generation time bound exceeded')), Math.max(1, deadline - Date.now()));
  });
  try { await Promise.race([Promise.resolve(ready), stop]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); }
  abortCheck(signal, deadline);
}
function arrayHash(array, integer = false) {
  const bytes = Buffer.allocUnsafe(array.length * 4);
  for (let i = 0; i < array.length; i++) integer ? bytes.writeUInt32LE(array[i], i * 4) : bytes.writeFloatLE(array[i], i * 4);
  return hash(bytes);
}
function batchReceipt(batch) {
  return {
    vertices: batch.positions.length / 3, triangles: batch.indices.length / 3,
    positionsSHA256: arrayHash(batch.positions), normalsSHA256: arrayHash(batch.normals),
    indicesSHA256: arrayHash(batch.indices, true), color: Array.from(batch.color),
    materialMetadataSHA256: jsonHash(Object.fromEntries(Object.entries(batch).filter(([k]) => !['positions', 'normals', 'indices'].includes(k)))),
  };
}
function componentReceipt(component) {
  const batches = component.batches.map(batchReceipt);
  return {
    city: component.city, objectId: component.objectId, partId: component.partId,
    origin: Array.from(component.origin),
    sourceFeatureSHA256: jsonHash(component.sourceFeature),
    componentGeometrySHA256: jsonHash(component.componentGeometry),
    metadataSHA256: jsonHash(Object.fromEntries(Object.entries(component).filter(([k]) => k !== 'batches'))),
    geometrySHA256: jsonHash(batches.map(({positionsSHA256, normalsSHA256, indicesSHA256}) => ({positionsSHA256, normalsSHA256, indicesSHA256}))),
    materialSHA256: jsonHash(batches.map(({color, materialMetadataSHA256}) => ({color, materialMetadataSHA256}))),
    vertices: batches.reduce((n, b) => n + b.vertices, 0),
    triangles: batches.reduce((n, b) => n + b.triangles, 0), batches,
  };
}
function boundsFor(batches) {
  const bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const batch of batches) for (const index of batch.indices) for (let a = 0; a < 3; a++) {
    const v = batch.positions[index * 3 + a];
    bbox[a] = Math.min(bbox[a], v); bbox[a + 3] = Math.max(bbox[a + 3], v);
  }
  return bbox;
}

function validateSource(source) {
  check(source?.type === 'Feature' && source.geometry && Object.hasOwn(source, 'properties'), 'Original SOURCE Feature must be explicit');
  check(source.properties === null || source.properties && typeof source.properties === 'object' && !Array.isArray(source.properties), 'Invalid SOURCE properties');
  const geometry = g => {
    check(g && typeof g === 'object', 'Invalid SOURCE geometry');
    if (g.type === 'GeometryCollection') { check(Array.isArray(g.geometries), 'Invalid SOURCE collection'); g.geometries.forEach(geometry); return; }
    check(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(g.type) && Array.isArray(g.coordinates), 'Invalid SOURCE coordinates');
    const coordinates = row => { check(Array.isArray(row) && row.length > 0, 'Empty SOURCE coordinates'); for (const value of row) Array.isArray(value) ? coordinates(value) : check(Number.isFinite(value), 'Invalid SOURCE coordinate'); };
    coordinates(g.coordinates);
  };
  geometry(source.geometry);
}
function validateComponents(components, city, limits) {
  check(Array.isArray(components) && components.length > 0 && components.length <= limits.maxComponents, 'Invalid component count');
  let vertices = 0, triangles = 0;
  const ids = new Set();
  for (const c of components) {
    check(c?.city === city && /^osm\/(way|relation)\/[1-9]\d*$/.test(c.objectId) && typeof c.partId === 'string' && c.partId.length > 0 && c.partId.length <= 256, 'Invalid source identity');
    check(!ids.has(identity(c)), 'Duplicate source identity'); ids.add(identity(c));
    check(Array.isArray(c.origin) && c.origin.length === 2 && c.origin.every(Number.isFinite), 'Invalid origin');
    check(c.componentGeometry?.type === 'Polygon', 'Explicit component polygon required');
    validateSource(c.sourceFeature);
    check(Array.isArray(c.batches) && c.batches.length > 0, 'Missing native batches');
    for (const b of c.batches) {
      check(b.positions instanceof Float32Array && b.normals instanceof Float32Array && b.indices instanceof Uint32Array, 'Use the canonical codec Float32/Uint32 arrays');
      check(b.positions.length > 0 && b.positions.length % 3 === 0 && b.normals.length === b.positions.length && b.indices.length > 0 && b.indices.length % 3 === 0, 'Invalid native array lengths');
      check(b.positions.every(Number.isFinite) && b.normals.every(Number.isFinite), 'Invalid native attributes');
      check(b.color?.length === 3 && Array.from(b.color).every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'Invalid native batch color');
      check(b.indices.every(i => i < b.positions.length / 3), 'Invalid native index');
      vertices += b.positions.length / 3; triangles += b.indices.length / 3;
      check(vertices <= limits.maxVertices && triangles <= limits.maxTriangles, 'Decoded geometry budget exceeded');
    }
  }
  return {vertices, triangles};
}

/** Complete runtime ownership/metadata coverage is required for negative answers.
 * Admission presence protects the canonical object; its old geometry signature
 * is never tested to authorize a modified mesh. */
export function createBuildingDetailProtection({paintIdentityOwner, paintFamily, certificateCandidate = () => false, progressiveRows, coverage, evidence}) {
  check(typeof paintIdentityOwner === 'function' && typeof paintFamily === 'function' && typeof certificateCandidate === 'function', 'Runtime protection functions are required');
  check(coverage?.completeForCity === true && typeof coverage.city === 'string', 'Complete city admission coverage is required');
  check(Array.isArray(progressiveRows) && Array.isArray(evidence) && evidence.length > 0, 'Protection evidence is required');
  const admitted = new Map();
  for (const row of progressiveRows) {
    check(row && row.city === coverage.city && typeof row.objectId === 'string' && typeof row.partId === 'string', 'Invalid progressive identity metadata');
    const key = objectKey(row), values = admitted.get(key) ?? [];
    values.push({objectId: row.objectId, partId: row.partId, family: row.family ?? null, descriptionSHA256: row.descriptionSHA256 ?? null});
    admitted.set(key, values);
  }
  return {
    coverage: serializable(coverage), evidence: serializable(evidence),
    inspect(c) {
      check(c.city === coverage.city, 'Protection city mismatch');
      const reasons = [], owner = paintIdentityOwner(c.city, c.objectId, c.partId), family = paintFamily(c);
      check(owner === undefined || OWNERS.has(owner), 'Unknown paint owner');
      check(Number.isFinite(family), 'Invalid runtime paint family');
      if (owner !== undefined) reasons.push('registered-paint-owner');
      if (family !== 0) reasons.push('runtime-paint-family');
      if (certificateCandidate(c)) reasons.push('source-owner-certificate');
      const rows = admitted.get(objectKey(c));
      if (rows) reasons.push('progressive-material-admission');
      const tags = c.sourceFeature.properties ?? {};
      if (['church', 'cathedral', 'chapel'].includes(tags.building) || tags.amenity === 'place_of_worship') reasons.push('source-worship-building');
      const ordinaryFields = new Set(['positions', 'normals', 'indices', 'color', 'materialName', 'faceRole']);
      if (c.batches.some(b => Object.keys(b).some(k => !ordinaryFields.has(k)))) reasons.push('additional-material-or-frame-attributes');
      const estimate = c.displayEstimates ?? {};
      for (const key of ['ownerAuthorizedReconstruction', 'ownerReconstruction', 'sourceRoleDisplay', 'surfaceFrames', 'surfaceFrameProof', 'sourceCompiledGeometryProof']) {
        if (Object.hasOwn(estimate, key) || Object.hasOwn(c, key)) reasons.push(`source-certified-${key}`);
      }
      return {held: reasons.length > 0, reasons, owner: owner ?? 'city', family, admissionIdentities: rows ?? [], groupKey: objectKey(c)};
    },
  };
}

/** Weld only bit-identical position+normal tuples inside this single batch.
 * The surviving representative is an original vertex, never a new coordinate. */
function weldBatch(batch) {
  const n = batch.positions.length / 3, lookup = new Map(), positionNormals = new Map(), splitNormalPositions = new Set(), toWelded = new Uint32Array(n), original = [];
  const pbits = new Uint32Array(batch.positions.buffer, batch.positions.byteOffset, batch.positions.length);
  const nbits = new Uint32Array(batch.normals.buffer, batch.normals.byteOffset, batch.normals.length);
  for (let i = 0; i < n; i++) {
    const at = i * 3, positionKey = `${pbits[at]},${pbits[at + 1]},${pbits[at + 2]}`, normalKey = `${nbits[at]},${nbits[at + 1]},${nbits[at + 2]}`, key = `${positionKey}|${normalKey}`;
    const previousNormal = positionNormals.get(positionKey);
    if (previousNormal !== undefined && previousNormal !== normalKey) splitNormalPositions.add(positionKey);
    else if (previousNormal === undefined) positionNormals.set(positionKey, normalKey);
    let id = lookup.get(key);
    if (id === undefined) { id = original.length; lookup.set(key, id); original.push(i); }
    toWelded[i] = id;
  }
  const positions = new Float32Array(original.length * 3), normals = new Float32Array(original.length * 3);
  original.forEach((source, i) => { positions.set(batch.positions.subarray(source * 3, source * 3 + 3), i * 3); normals.set(batch.normals.subarray(source * 3, source * 3 + 3), i * 3); });
  return {positions, normals, indices: Uint32Array.from(batch.indices, i => toWelded[i]), original,
    positionGroups: positionNormals.size, splitNormalPositionGroups: splitNormalPositions.size};
}
function topology(indices, vertexCount) {
  const edges = new Map(), parent = new Int32Array(vertexCount).fill(-1), used = new Set();
  const root = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { a = root(a); b = root(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
  let degenerate = false;
  for (let i = 0; i < indices.length; i += 3) {
    const t = [indices[i], indices[i + 1], indices[i + 2]];
    if (new Set(t).size !== 3) degenerate = true;
    for (const v of t) { used.add(v); if (parent[v] < 0) parent[v] = v; }
    for (let j = 0; j < 3; j++) {
      const a = t[j], b = t[(j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const row = edges.get(key) ?? {a: Math.min(a, b), b: Math.max(a, b), count: 0, orientation: 0};
      row.count++; row.orientation += a < b ? 1 : -1; edges.set(key, row); union(a, b);
    }
  }
  const boundary = [...edges].filter(([, e]) => e.count === 1).map(([key]) => key).sort();
  const lock = new Uint8Array(vertexCount);
  for (const e of edges.values()) if (e.count === 1) lock[e.a] = lock[e.b] = 1;
  const roots = new Map(); for (const v of used) roots.set(v, root(v));
  return {boundary, lock, roots, components: new Set(roots.values()).size,
    euler: used.size - edges.size + indices.length / 3, degenerate,
    nonmanifold: [...edges.values()].some(e => e.count > 2 || e.count === 2 && e.orientation !== 0)};
}
function topologyPreserved(before, after) {
  if (after.degenerate || after.nonmanifold || before.euler !== after.euler || before.components !== after.components || detailJSON(before.boundary) !== detailJSON(after.boundary)) return false;
  const mapping = new Map();
  for (const [vertex, component] of after.roots) {
    const original = before.roots.get(vertex);
    if (original === undefined || mapping.has(component) && mapping.get(component) !== original) return false;
    mapping.set(component, original);
  }
  return new Set(mapping.values()).size === before.components;
}

const point = (p, i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm2 = a => dot(a, a);
function segmentDistance2(p, a, b) {
  const ab = sub(b, a), length = norm2(ab), t = length ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / length)) : 0;
  return norm2([p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]]);
}
function triangleDistance2(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return norm2(ap);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return norm2(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return segmentDistance2(p, a, b);
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return norm2(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return segmentDistance2(p, a, c);
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return segmentDistance2(p, b, c);
  const denominator = va + vb + vc;
  if (Math.abs(denominator) < 1e-25) return Math.min(segmentDistance2(p, a, b), segmentDistance2(p, a, c), segmentDistance2(p, b, c));
  const v = vb / denominator, w = vc / denominator;
  return norm2([ap[0] - v * ab[0] - w * ac[0], ap[1] - v * ab[1] - w * ac[1], ap[2] - v * ab[2] - w * ac[2]]);
}
function triangleTree(positions, indices) {
  const rows = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = point(positions, indices[i]), b = point(positions, indices[i + 1]), c = point(positions, indices[i + 2]);
    rows.push({a, b, c, center: a.map((v, k) => (v + b[k] + c[k]) / 3), min: a.map((v, k) => Math.min(v, b[k], c[k])), max: a.map((v, k) => Math.max(v, b[k], c[k]))});
  }
  function node(triangles) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const t of triangles) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], t.min[k]); max[k] = Math.max(max[k], t.max[k]); }
    if (triangles.length <= 8) return {min, max, triangles};
    let axis = 0; for (let k = 1; k < 3; k++) if (max[k] - min[k] > max[axis] - min[axis]) axis = k;
    triangles.sort((a, b) => a.center[axis] - b.center[axis]);
    const middle = Math.floor(triangles.length / 2);
    return {min, max, left: node(triangles.slice(0, middle)), right: node(triangles.slice(middle))};
  }
  return node(rows);
}
function nearestDistance2(tree, p) {
  const boxDistance = n => p.reduce((s, v, k) => s + Math.max(n.min[k] - v, 0, v - n.max[k]) ** 2, 0);
  let best = Infinity;
  const visit = n => {
    if (boxDistance(n) >= best) return;
    if (n.triangles) { for (const t of n.triangles) best = Math.min(best, triangleDistance2(p, t.a, t.b, t.c)); return; }
    if (boxDistance(n.left) < boxDistance(n.right)) { visit(n.left); visit(n.right); } else { visit(n.right); visit(n.left); }
  };
  visit(tree); return best;
}
/** Independent exhaustive referenced-vertex + triangle-centroid samples, in both
 * directions. This deliberately does not call the sample maximum Hausdorff. */
async function measureError(positions, before, after, context) {
  let maximum = 0, samples = 0;
  for (const [from, to] of [[before, after], [after, before]]) {
    abortCheck(context.signal, context.deadline);
    const tree = triangleTree(positions, to), used = new Set(from);
    const sample = p => {
      check(++context.samples <= context.limits.maxErrorSamples, 'Geometry error sample budget exceeded');
      samples++; maximum = Math.max(maximum, nearestDistance2(tree, p));
    };
    for (const index of used) {
      sample(point(positions, index));
      if (samples % 512 === 0) { await yieldTurn(); abortCheck(context.signal, context.deadline); }
    }
    for (let i = 0; i < from.length; i += 3) {
      const a = point(positions, from[i]), b = point(positions, from[i + 1]), c = point(positions, from[i + 2]);
      sample(a.map((v, k) => (v + b[k] + c[k]) / 3));
      if (samples % 512 === 0) { await yieldTurn(); abortCheck(context.signal, context.deadline); }
    }
  }
  return {metric: 'bidirectional-referenced-vertices-and-triangle-centroids', maximumSampledDistanceM: Math.sqrt(maximum), samples, exhaustiveReferencedVertices: true, exhaustiveTriangleCentroids: true, hausdorffBound: false};
}

/** Prepare once per unprotected batch, not once per requested detail level.
 * Exact attribute welding never joins different normals or material batches. */
function prepareBatch(batch, context) {
  if (batch.positions.length / 3 > context.limits.maxBatchVertices || batch.indices.length / 3 > context.limits.maxBatchTriangles) return {reason: 'batch-work-bound'};
  const welded = weldBatch(batch), before = topology(welded.indices, welded.original.length);
  const referencedVertices = before.roots.size, lockedReferencedVertices = [...before.roots.keys()].reduce((sum, index) => sum + before.lock[index], 0);
  const referencedWeldedVertices = new Set(welded.indices).size;
  const diagnostics = {canonicalVertices: batch.positions.length / 3, exactWeldedVertices: welded.original.length,
    referencedVertices, lockedReferencedVertices, boundaryEdges: before.boundary.length, exactPositionGroups: welded.positionGroups,
    splitNormalPositionGroups: welded.splitNormalPositionGroups,
    attributeBytesBefore: batch.positions.byteLength + batch.normals.byteLength,
    attributeBytesAfterExactWeld: welded.positions.byteLength + welded.normals.byteLength,
    indexBytesBefore: batch.indices.byteLength, indexBytesAfterExactWeld: welded.indices.byteLength,
    exactWeldAttributeBytesSaved: (batch.positions.length / 3 - welded.original.length) * 24,
    unusedWeldedAttributeBytes: (welded.original.length - referencedWeldedVertices) * 24};
  context.diagnostics.preparedBatches++;
  for (const [key, value] of Object.entries(diagnostics)) context.diagnostics.batchTotals[key] = (context.diagnostics.batchTotals[key] ?? 0) + value;
  if (referencedVertices > 0 && referencedVertices === lockedReferencedVertices) context.diagnostics.allReferencedVerticesBoundaryLockedBatches++;
  const reason = before.degenerate ? 'canonical-topology-degenerate' : before.nonmanifold ? 'canonical-topology-nonmanifold'
    : batch.indices.length <= 3 ? 'minimum-triangle-count'
    : referencedVertices === lockedReferencedVertices ? 'all-referenced-vertices-boundary-locked' : undefined;
  return {welded, before, reason};
}

async function simplifyBatch(batch, prepared, level, simplifier, context) {
  abortCheck(context.signal, context.deadline);
  const unchanged = (reason, extra = {}) => ({batch, changed: false, reason, ...extra});
  if (prepared.reason) return unchanged(prepared.reason);
  const {welded, before} = prepared;
  const targetCount = Math.max(3, Math.floor(batch.indices.length / 3 * level.ratio) * 3);
  // The function only returns indices. Its input copies cannot mutate canonical
  // arrays, and positions/normals/colors in the output come from original data.
  const positions = welded.positions.slice(), normals = welded.normals.slice(), input = welded.indices.slice();
  context.diagnostics.simplifierCalls++;
  const [indices, estimatedError] = simplifier.simplifyWithAttributes(input, positions, 3, normals, 3, [1, 1, 1], before.lock, targetCount, level.maxErrorM, ['LockBorder', 'ErrorAbsolute']);
  abortCheck(context.signal, context.deadline);
  check(indices instanceof Uint32Array && indices.length > 0 && indices.length % 3 === 0 && indices.every(i => i < welded.original.length), 'Simplifier returned invalid indices');
  check(Number.isFinite(estimatedError) && estimatedError >= 0, 'Simplifier returned invalid error');
  check(arrayHash(positions) === arrayHash(welded.positions) && arrayHash(normals) === arrayHash(welded.normals), 'Simplifier mutated original attributes');
  if (indices.length >= batch.indices.length) return unchanged('topology-or-error-limit-prevented-reduction');
  if (estimatedError > level.maxErrorM + 1e-7) return unchanged('simplifier-error-limit');
  const after = topology(indices, welded.original.length);
  if (!topologyPreserved(before, after)) return unchanged('topology-or-boundary-validation-failed');
  const error = await measureError(welded.positions, welded.indices, indices, context);
  if (error.maximumSampledDistanceM > level.maxErrorM + 1e-6) return unchanged('independent-error-limit', {error});
  const remappedIndices = indices.slice(), [remap, vertexCount] = simplifier.compactMesh(remappedIndices);
  check(remap instanceof Uint32Array && Number.isSafeInteger(vertexCount) && vertexCount > 0, 'Invalid compactMesh result');
  if (vertexCount >= batch.positions.length / 3) return unchanged('vertex-count-not-reduced');
  const outputPositions = new Float32Array(vertexCount * 3), outputNormals = new Float32Array(vertexCount * 3), originalVertices = new Uint32Array(vertexCount), filled = new Uint8Array(vertexCount);
  // compactMesh mutates the supplied index array and returns old-to-new remap.
  for (const oldIndex of new Set(indices)) {
    const nextIndex = remap[oldIndex], source = welded.original[oldIndex];
    check(nextIndex < vertexCount && !filled[nextIndex], 'Invalid compacted vertex mapping'); filled[nextIndex] = 1;
    outputPositions.set(batch.positions.subarray(source * 3, source * 3 + 3), nextIndex * 3);
    outputNormals.set(batch.normals.subarray(source * 3, source * 3 + 3), nextIndex * 3);
    originalVertices[nextIndex] = source;
  }
  check(filled.every(Boolean) && remappedIndices.every((v, i) => v < vertexCount && originalVertices[v] === welded.original[indices[i]]), 'Compact index mapping mismatch');
  return {changed: true, reason: 'reduced', batch: {...batch, positions: outputPositions, normals: outputNormals, indices: remappedIndices},
    originalVertices: Array.from(originalVertices), error: {...error, meshoptAbsoluteErrorM: estimatedError, maximumAllowedM: level.maxErrorM},
    topology: {boundaryEdges: before.boundary.length, boundarySHA256: jsonHash(before.boundary), connectedComponents: before.components, eulerCharacteristic: before.euler, exactBoundaryPreserved: true, topologyPreserved: true},
  };
}

/** Pure geometry production core; the codec and runtime protection are injected.
 * Returned buffers are immutable candidate artifacts, not published resources. */
export async function buildBuildingDetailVariants(input, {simplifier, simplifierBinding} = {}) {
  const {canonicalShard, canonicalLeaf, provenance, protection, materialBinding, signal} = input;
  const limits = limitsFor(input.limits), levels = levelsFor(input.levels), deadline = Date.now() + limits.maxMilliseconds;
  abortCheck(signal, deadline);
  check(canonicalLeaf && SHA.test(canonicalLeaf.sha256) && typeof canonicalLeaf.path === 'string' && Number.isSafeInteger(canonicalLeaf.bytes) && canonicalLeaf.bytes > 0 && canonicalLeaf.bytes <= limits.maxInputBytes, 'Invalid canonical leaf binding');
  check(provenance && ['compilerSHA256', 'sourcePBFSHA256', 'boundarySHA256'].every(k => SHA.test(provenance[k])) && typeof provenance.city === 'string', 'Missing canonical provenance');
  check(materialBinding && SHA.test(materialBinding.sha256) && typeof materialBinding.kind === 'string', 'Explicit material recipe binding required');
  check(protection?.coverage?.completeForCity === true && protection.coverage.city === provenance.city && typeof protection.inspect === 'function', 'Complete protection inspection is required');
  check(simplifier && typeof simplifier.simplifyWithAttributes === 'function' && typeof simplifier.compactMesh === 'function', 'MeshoptSimplifier with attribute support is required');
  if (simplifierBinding) check(simplifierBinding.version === MESHOPT_VERSION && SHA.test(simplifierBinding.sha256) && Number.isSafeInteger(simplifierBinding.bytes) && simplifierBinding.bytes > 0, 'Invalid simplifier implementation binding');
  await readyWithinBound(simplifier.ready, signal, deadline);
  abortCheck(signal, deadline);
  const components = canonicalShard?.components;
  check(canonicalShard?.city === provenance.city && canonicalShard.schema_version === 1, 'Canonical shard city/schema mismatch');
  const counts = validateComponents(components, provenance.city, limits), receipts = components.map(componentReceipt);
  const assessments = components.map(c => protection.inspect(c)), groupReasons = new Map();
  assessments.forEach((a, i) => { check(a && typeof a.held === 'boolean' && Array.isArray(a.reasons) && typeof a.groupKey === 'string', 'Invalid protection assessment'); if (a.held) groupReasons.set(a.groupKey, [...new Set([...(groupReasons.get(a.groupKey) ?? []), ...a.reasons])]); });
  const sidecar = {
    schema: BUILDING_DETAIL_SCHEMA, schemaVersion: 1, city: provenance.city,
    status: 'offline-geometry-candidate-runtime-admission-required',
    canonicalLeaf: serializable(canonicalLeaf), provenance: serializable(provenance),
    producer: {source: 'scripts/render/building-detail-variants.mjs', sourceSHA256: PRODUCER_SHA256, algorithm: 'meshoptimizer.simplifyWithAttributes', library: 'meshoptimizer', version: MESHOPT_VERSION,
      libraryBinding: simplifierBinding ? serializable(simplifierBinding) : {status: 'dependency-injected-unverified'},
      flags: ['LockBorder', 'ErrorAbsolute'], normalWeights: [1, 1, 1], originalAttributeSubsetOnly: true, crossBatchWelding: false, oldGeometryAdmissionReusable: false},
    protection: {coverage: protection.coverage, evidence: protection.evidence}, materialBinding: serializable(materialBinding),
    near: {level: 'near', asset: canonicalLeaf.path, sha256: canonicalLeaf.sha256, bytes: canonicalLeaf.bytes, referenceOnly: true, reencoded: false,
      vertices: counts.vertices, triangles: counts.triangles, sourceBindingsRef: '#/provenance', materialBindingRef: '#/materialBinding',
      geometrySHA256: jsonHash(receipts.map(r => ({city: r.city, objectId: r.objectId, partId: r.partId, geometrySHA256: r.geometrySHA256}))),
      bbox: canonicalLeaf.bbox ?? null, bboxCoordinates: 'canonical-index-geographic', decodedEquivalenceSHA256: jsonHash(receipts), components: receipts},
    levels, components: [], variants: [], limits,
  };
  const diagnostics = {inputBatchCount: components.reduce((sum, c) => sum + c.batches.length, 0),
    componentLevelAttempts: components.length * levels.length, batchLevelAttempts: 0, preparedBatches: 0, simplifierCalls: 0,
    allReferencedVerticesBoundaryLockedBatches: 0, batchTotals: {}, batchOutcomesByLevel: Object.fromEntries(levels.map(l => [l.level, {}]))};
  const outputs = new Map(levels.map(l => [l.level, []])), context = {signal, deadline, samples: 0, limits, diagnostics};
  for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
    await yieldTurn(); abortCheck(signal, deadline);
    const c = components[componentIndex], original = receipts[componentIndex], assessment = assessments[componentIndex];
    const reasons = groupReasons.get(assessment.groupKey), record = {
      city: c.city, objectId: c.objectId, partId: c.partId, canonicalComponentIndex: componentIndex,
      sourceFeatureSHA256: original.sourceFeatureSHA256, componentGeometrySHA256: original.componentGeometrySHA256,
      canonicalGeometrySHA256: original.geometrySHA256, canonicalMaterialSHA256: original.materialSHA256,
      atomicGroup: {key: assessment.groupKey, observedMembers: components.filter((_, i) => assessments[i].groupKey === assessment.groupKey).map(member => ({objectId: member.objectId, partId: member.partId})), membershipScope: 'selected-canonical-leaf', completeAcrossLeaves: false},
      protection: assessment, details: [],
    };
    const prepared = [];
    if (!reasons) for (const batch of c.batches) { await yieldTurn(); abortCheck(signal, deadline); prepared.push(prepareBatch(batch, context)); }
    for (const level of levels) {
      if (reasons) { record.details.push({level: level.level, status: 'held-canonical', reasons, asset: canonicalLeaf.path}); continue; }
      const results = [];
      for (const [batchIndex, batch] of c.batches.entries()) {
        await yieldTurn(); abortCheck(signal, deadline);
        const result = await simplifyBatch(batch, prepared[batchIndex], level, simplifier, context);
        results.push(result);
        diagnostics.batchLevelAttempts++;
        const outcomes = diagnostics.batchOutcomesByLevel[level.level]; outcomes[result.reason] = (outcomes[result.reason] ?? 0) + 1;
      }
      if (!results.some(r => r.changed)) { record.details.push({level: level.level, status: 'unchanged-canonical', reasons: [...new Set(results.map(r => r.reason))], asset: canonicalLeaf.path}); continue; }
      const outputComponent = {...c, batches: results.map(r => r.batch)}, receipt = componentReceipt(outputComponent);
      check(receipt.vertices < original.vertices && receipt.triangles < original.triangles, 'Detail registration requires genuine vertex and triangle reduction');
      check(receipt.sourceFeatureSHA256 === original.sourceFeatureSHA256 && receipt.componentGeometrySHA256 === original.componentGeometrySHA256 && receipt.materialSHA256 === original.materialSHA256 && receipt.metadataSHA256 === original.metadataSHA256, 'SOURCE/material/identity metadata changed');
      const sameGeometry = record.details.find(d => d.status === 'reduced' && d.geometrySHA256 === receipt.geometrySHA256);
      if (sameGeometry) {
        record.details.push({level: level.level, status: 'unchanged-existing-detail', reasons: ['no-distinct-geometry-at-requested-level'], existingLevel: sameGeometry.level, geometrySHA256: receipt.geometrySHA256});
        continue;
      }
      const mid = record.details.find(d => d.level === 'mid' && d.status === 'reduced');
      if (level.level === 'coarse' && mid && (receipt.vertices >= mid.vertices || receipt.triangles >= mid.triangles)) {
        record.details.push({level: level.level, status: 'unchanged-existing-detail', reasons: ['not-smaller-than-existing-mid-geometry'], existingLevel: 'mid', geometrySHA256: mid.geometrySHA256});
        continue;
      }
      const rows = outputs.get(level.level), variantComponentIndex = rows.length;
      rows.push(outputComponent);
      record.details.push({level: level.level, status: 'reduced', variantComponentIndex, geometrySHA256: receipt.geometrySHA256,
        vertices: receipt.vertices, triangles: receipt.triangles, bboxLocalMetres: boundsFor(outputComponent.batches),
        sourceBindingsRef: '#/provenance', materialBindingRef: '#/materialBinding', oldAdmissionReusable: false,
        batchMapping: results.map((result, batchIndex) => ({canonicalBatchIndex: batchIndex, variantBatchIndex: batchIndex, status: result.changed ? 'reduced' : 'unchanged', reason: result.reason,
          canonical: original.batches[batchIndex], variant: receipt.batches[batchIndex],
          originalVertexIndices: result.originalVertices ?? null, vertexMapping: result.changed ? 'explicit-original-subset' : 'identity',
          geometryError: result.error ?? {maximumSampledDistanceM: 0, meshoptAbsoluteErrorM: 0, exactUnchanged: true}, topology: result.topology ?? null})),
      });
    }
    sidecar.components.push(record);
  }
  // Re-check every original stream after the entire job, including the held set.
  check(jsonHash(components.map(componentReceipt)) === sidecar.near.decodedEquivalenceSHA256, 'Canonical input mutated');
  const assets = [], base = input.assetBasePath ?? '/safety/buildings3d/detail-variants';
  check(/^\/[a-zA-Z0-9/_-]+$/.test(base) && !base.includes('//'), 'Invalid output asset base path');
  let outputBytes = 0;
  for (const level of levels) {
    const rows = outputs.get(level.level); if (!rows.length) continue;
    const document = {schema_version: 1, city: provenance.city, components: rows,
      detail_variant: {schema: BUILDING_DETAIL_SCHEMA, level: level.level, canonical_leaf_sha256: canonicalLeaf.sha256, canonical_source_bindings: provenance, original_admission_reusable: false}};
    const bytes = Buffer.from(detailJSON(document) + '\n'), sha256 = hash(bytes), filename = `${level.level}-${sha256}.json`, assetPath = `${base}/${filename}`;
    outputBytes += bytes.length; check(outputBytes <= limits.maxOutputBytes, 'Detail output budget exceeded');
    assets.push({filename, path: assetPath, sha256, bytes});
    const descriptor = {level: level.level, asset: assetPath, sha256, bytes: bytes.length, encoding: 'plain-json',
      geometrySHA256: jsonHash(rows.map(c => { const r = componentReceipt(c); return {city: r.city, objectId: r.objectId, partId: r.partId, geometrySHA256: r.geometrySHA256}; })),
      sourceBindingsRef: '#/provenance', materialBindingRef: '#/materialBinding', componentCount: rows.length, vertices: rows.reduce((n, c) => n + c.batches.reduce((a, b) => a + b.positions.length / 3, 0), 0), triangles: rows.reduce((n, c) => n + c.batches.reduce((a, b) => a + b.indices.length / 3, 0), 0)};
    sidecar.variants.push(descriptor);
    for (const c of sidecar.components) for (const detail of c.details) if (detail.level === level.level && detail.status === 'reduced') detail.asset = assetPath;
  }
  sidecar.summary = {canonicalComponents: components.length, canonicalVertices: counts.vertices, canonicalTriangles: counts.triangles,
    reducedByLevel: Object.fromEntries(levels.map(l => [l.level, sidecar.components.filter(c => c.details.some(d => d.level === l.level && d.status === 'reduced')).length])),
    protectedComponents: sidecar.components.filter(c => c.details.some(d => d.status === 'held-canonical')).length,
    errorSamples: context.samples, candidateAssetBytes: outputBytes, canonicalAssetsWritten: 0,
    diagnostics: {...diagnostics, residentByteAlternative: {kind: 'bit-identical-position-normal-welding-within-unprotected-batch',
      attributeBytesBefore: diagnostics.batchTotals.attributeBytesBefore ?? 0,
      attributeBytesAfter: diagnostics.batchTotals.attributeBytesAfterExactWeld ?? 0,
      attributeBytesSavedPotential: diagnostics.batchTotals.exactWeldAttributeBytesSaved ?? 0,
      indexBytesBefore: diagnostics.batchTotals.indexBytesBefore ?? 0, indexBytesAfter: diagnostics.batchTotals.indexBytesAfterExactWeld ?? 0,
      indexBytesChanged: 0, emitted: false, triangleCountChanged: false, geometryLOD: false, classification: 'lossless-attribute-compaction-not-triangle-lod',
      scope: 'geometry-attribute-payload-only-not-process-memory-or-compression'}}};
  const manifest = Buffer.from(detailJSON(sidecar) + '\n'); outputBytes += manifest.length;
  check(outputBytes <= limits.maxOutputBytes, 'Detail manifest/output budget exceeded');
  abortCheck(signal, deadline);
  return {sidecar, assets, manifest, manifestSHA256: hash(manifest), totalOutputBytes: outputBytes};
}

export const BUILDING_DETAIL_DEMAND_SCHEMA = 'crimemaps-building-detail-demand-v1';
export const BUILDING_DETAIL_REPLACEMENT_SCHEMA = 'crimemaps-building-detail-replacement-v1';
export const BOUNDARY_DETAIL_POLICY = 'boundary-aware-display-v1';
const MAX_VARIANT_RAW_BYTES = 4 * 1024 ** 2;
const MAX_VARIANT_TRANSPORT_BYTES = 1024 ** 2;
/** A level is published only when it keeps at most this share of BOTH the
 * triangles and the decoded typed-array bytes of the finest published level it
 * would replace (near for mid; the published mid, else near, for coarse). A
 * smaller saving would still cost a separate decode, upload and transition
 * overlap at runtime. Provisional default pending a ROOT/owner decision; the
 * value is part of this producer file, so changing it changes the binding. */
export const DETAIL_VARIANT_BENEFIT = Object.freeze({maximumRetainedFraction: Object.freeze({triangles: .9, decodedBytes: .9}),
  reference: 'finest-published-level', decision: 'provisional-default-pending-root-owner'});
/** What variant errors[].errorM means; recorded with every leaf sidecar. */
export const DETAIL_ERROR_BOUND_SEMANTICS = Object.freeze({kind: 'certified-conservative-upper-bound', measuredDeviation: false,
  dependsOnLevelMaximum: true, method: 'per-branch bidirectional subdivision that accepts the first witness within the level maximum'});
const decodedTypedArrayBytes = components => components.reduce((n, c) => n + c.batches.reduce((m, b) => m + b.positions.byteLength + b.normals.byteLength + b.indices.byteLength, 0), 0);
const resourceAsset = asset => Object.fromEntries(['path', 'sha256', 'bytes', 'compression', 'uncompressed_bytes', 'uncompressed_sha256']
  .filter(key => asset[key] !== undefined).map(key => [key, asset[key]]));
const geometrySetHash = receipts => jsonHash(receipts.map(({city, objectId, partId, geometrySHA256}) => ({city, objectId, partId, geometrySHA256})));
const sourceSetHash = receipts => jsonHash(receipts.map(({city, objectId, partId, sourceFeatureSHA256, componentGeometrySHA256, metadataSHA256, materialSHA256}) =>
  ({city, objectId, partId, sourceFeatureSHA256, componentGeometrySHA256, metadataSHA256, materialSHA256})));

/** Complete, same-order replacement leaves. Unlike the legacy research sidecar,
 * every registered level can replace the canonical resource on its own. */
export async function buildBuildingDetailReplacements(input, {simplifier, simplifierBinding, encoder, encoderBinding, decoderBinding} = {}) {
  const {canonicalShard, canonicalLeaf, provenance, protection, materialBinding, signal} = input;
  const limits = limitsFor(input.limits), levels = levelsFor(input.levels), deadline = Date.now() + limits.maxMilliseconds;
  abortCheck(signal, deadline);
  for (const level of levels) check(level.maxErrorM <= DEFAULT_DETAIL_LEVELS.find(row => row.level === level.level).maxErrorM, 'Replacement cannot enlarge the original per-level geometry error limit');
  check(canonicalShard?.schema_version === 1 && canonicalShard.city === provenance?.city, 'Canonical shard city/schema mismatch');
  check(canonicalLeaf && SHA.test(canonicalLeaf.sha256) && typeof canonicalLeaf.id === 'string' && typeof canonicalLeaf.path === 'string' &&
    Number.isSafeInteger(canonicalLeaf.bytes) && canonicalLeaf.bytes > 0 && canonicalLeaf.bytes <= limits.maxInputBytes, 'Invalid canonical leaf binding');
  check(provenance && ['compilerSHA256', 'sourcePBFSHA256', 'boundarySHA256'].every(key => SHA.test(provenance[key])) &&
    typeof provenance.sourceSnapshot === 'string' && provenance.sourceSnapshot.length > 0 && provenance.canonicalIndex &&
    SHA.test(provenance.canonicalIndex.sha256) && typeof provenance.canonicalIndex.path === 'string' &&
    Number.isSafeInteger(provenance.canonicalIndex.bytes) && provenance.canonicalIndex.bytes > 0, 'Missing canonical index/source provenance');
  check(materialBinding && SHA.test(materialBinding.sha256), 'Explicit material binding required');
  check(protection?.coverage?.completeForCity === true && protection.coverage.city === provenance.city && typeof protection.inspect === 'function', 'Complete protection inspection required');
  check(simplifier && typeof simplifier.simplifyWithAttributes === 'function' && typeof simplifier.compactMesh === 'function', 'Attribute-aware simplifier required');
  if (simplifierBinding) check(simplifierBinding.version === MESHOPT_VERSION && SHA.test(simplifierBinding.sha256) && Number.isSafeInteger(simplifierBinding.bytes) && simplifierBinding.bytes > 0, 'Invalid simplifier binding');
  await readyWithinBound(simplifier.ready, signal, deadline);
  const {simplifyBuildingDetailComponent} = await import('./building-detail-boundary.mjs');
  const {chooseBuildingDetailTransport} = await import('./building-detail-meshopt.mjs');
  const {buildBuildingDetailGroupMetadata, buildingDetailMetadataCost, compactBuildingDetailGroupMetadata} = await import('./building-detail-groups.mjs');
  const boundaryBytes = await readFile(new URL('./building-detail-boundary.mjs', import.meta.url));
  const encoderProducerBytes = await readFile(new URL('./building-detail-meshopt.mjs', import.meta.url));
  const groupProducerBytes = await readFile(new URL('./building-detail-groups.mjs', import.meta.url));
  const producerFiles = [{path: 'scripts/render/building-detail-variants.mjs', sha256: PRODUCER_SHA256},
    {path: 'scripts/render/building-detail-boundary.mjs', sha256: hash(boundaryBytes)},
    {path: 'scripts/render/building-detail-meshopt.mjs', sha256: hash(encoderProducerBytes)},
    {path: 'scripts/render/building-detail-groups.mjs', sha256: hash(groupProducerBytes)}];
  const components = canonicalShard.components, counts = validateComponents(components, provenance.city, limits);
  const original = components.map(componentReceipt), sourceEquivalenceSHA256 = sourceSetHash(original);
  const assessments = components.map(component => protection.inspect(component)), heldGroups = new Map();
  for (const assessment of assessments) {
    check(assessment && typeof assessment.held === 'boolean' && Array.isArray(assessment.reasons) && typeof assessment.groupKey === 'string', 'Invalid protection assessment');
    if (assessment.held) heldGroups.set(assessment.groupKey, [...new Set([...(heldGroups.get(assessment.groupKey) ?? []), ...assessment.reasons])]);
  }
  const protectedRows = assessments.map(assessment => heldGroups.has(assessment.groupKey));
  const bindings = {sourcePBFSHA256: provenance.sourcePBFSHA256, boundarySHA256: provenance.boundarySHA256, compilerSHA256: provenance.compilerSHA256,
    sourceSnapshot: provenance.sourceSnapshot, materialSHA256: materialBinding.sha256, producerSHA256: jsonHash(producerFiles),
    protectionSHA256: jsonHash({coverage: protection.coverage, evidence: protection.evidence, assessments}), sourceEquivalenceSHA256};
  const canonical = {...resourceAsset(canonicalLeaf), id: canonicalLeaf.id};
  if (canonical.compression === 'gzip') {
    check(SHA.test(canonicalLeaf.rawSHA256) && Number.isSafeInteger(canonicalLeaf.rawBytes) && canonicalLeaf.rawBytes > 0, 'Verified canonical raw binding required');
    canonical.uncompressed_sha256 = canonicalLeaf.rawSHA256; canonical.uncompressed_bytes = canonicalLeaf.rawBytes;
  }
  const canonicalDecodedBytes = components.reduce((n, c) => n + c.batches.reduce((m, b) => m + b.positions.byteLength + b.normals.byteLength + b.indices.byteLength, 0), 0);
  const index = {schema: BUILDING_DETAIL_DEMAND_SCHEMA, schemaVersion: 1, city: provenance.city,
    canonicalIndex: resourceAsset(provenance.canonicalIndex), canonicalLeaf: canonical, bindings,
    components: components.map((component, i) => ({objectId: component.objectId, partId: component.partId, origin: Array.from(component.origin),
      box: boundsFor(component.batches), protected: protectedRows[i]})),
    near: {level: 'near', asset: resourceAsset(canonical), geometrySHA256: geometrySetHash(original), vertices: counts.vertices, triangles: counts.triangles,
      encoding: 'canonical', decodedBytes: canonicalDecodedBytes}, variants: []};
  const groupInputs = {city: provenance.city, canonicalIndex: index.canonicalIndex, canonicalLeaf: canonical,
    provenance, materialBinding, protectionSHA256: bindings.protectionSHA256, components, assessments, serialize: detailJSON};
  const initialGroups = buildBuildingDetailGroupMetadata({...groupInputs, levels: []});
  const {key: initialGroupKey, metadataCost: initialGroupCost, ...groupDocument} = initialGroups;
  const sidecar = {schema: BUILDING_DETAIL_REPLACEMENT_SCHEMA, schemaVersion: 1, city: provenance.city,
    status: 'complete-replacement-assets-require-current-runtime-demand-admission', geometryPolicy: BOUNDARY_DETAIL_POLICY,
    canonicalLeaf: serializable(canonicalLeaf), provenance: serializable(provenance), materialBinding: serializable(materialBinding), bindings,
    producer: {files: producerFiles, library: 'meshoptimizer', version: MESHOPT_VERSION, libraryBinding: simplifierBinding ?? {status: 'dependency-injected-unverified'},
      encoderBinding: encoderBinding ?? {status: 'dependency-injected-unverified'}, decoderBinding: decoderBinding ?? {status: 'dependency-injected-unverified'},
      attributeEncoding: 'smallest-valid-json-or-meshopt', quantization: false, indexReordering: false},
    protection: {coverage: protection.coverage, evidence: protection.evidence}, near: index.near, levels, components: [], variants: [], limits,
    benefitPolicy: DETAIL_VARIANT_BENEFIT, errorBound: DETAIL_ERROR_BOUND_SEMANTICS};
  const base = input.assetBasePath ?? '/safety/buildings3d/detail-variants';
  check(/^\/[a-zA-Z0-9/_-]+$/.test(base) && !base.includes('//'), 'Invalid output asset base path');
  const assets = [], outcomes = Object.fromEntries(levels.map(level => [level.level, {}]));
  const statistics = Object.fromEntries(levels.map(level => [level.level, {}])), work = {errorSamples: 0, intersectionTests: 0};
  let outputBytes = 0;
  // Only the accepted collapse pairs of the previous level survive into the
  // next level (small metadata); its decoded replacement arrays do not.
  const seeds = new Map();
  for (const level of levels) {
    const replacement = [], receipts = [], errors = [], decisions = [];
    for (let componentIndex = 0; componentIndex < components.length; componentIndex++) {
      await yieldTurn(); abortCheck(signal, deadline);
      const component = components[componentIndex];
      const result = protectedRows[componentIndex] ? {component, changed: false, reason: 'held-canonical', errorBoundM: 0, normalDeviationRad: 0}
        : await simplifyBuildingDetailComponent(component, level, {simplifier, signal, deadline, limits, work, seed: seeds.get(componentIndex)});
      abortCheck(signal, deadline);
      if (result.changed && Array.isArray(result.collapseSequence) && result.collapseSequence.length) seeds.set(componentIndex, result.collapseSequence);
      else seeds.delete(componentIndex);
      const output = result.changed ? result.component : component, receipt = componentReceipt(output), before = original[componentIndex];
      validateComponents([output], provenance.city, limits);
      check(receipt.city === before.city && receipt.objectId === before.objectId && receipt.partId === before.partId &&
        receipt.metadataSHA256 === before.metadataSHA256 && receipt.sourceFeatureSHA256 === before.sourceFeatureSHA256 &&
        receipt.componentGeometrySHA256 === before.componentGeometrySHA256 && receipt.materialSHA256 === before.materialSHA256, 'Replacement changed SOURCE, material, identity or component metadata');
      if (result.changed) {
        check(!protectedRows[componentIndex] && receipt.vertices < before.vertices && receipt.triangles < before.triangles, 'Replacement must genuinely reduce vertices and triangles');
        check(result.proof?.hausdorffBound === true && result.proof?.topologyPreserved === true && result.proof?.holesPreserved === true &&
          result.proof?.attributeBranchesPreserved === true && result.proof?.selfIntersectionsExcluded === true &&
          Number.isFinite(result.errorBoundM) && result.errorBoundM >= 0 && result.errorBoundM <= level.maxErrorM &&
          result.normalDeviationRad === 0, 'Replacement lacks a conservative surface/topology/attribute certificate');
        errors.push({componentIndex, errorM: result.errorBoundM, normalDeviationRad: result.normalDeviationRad});
      } else check(receipt.geometrySHA256 === before.geometrySHA256, 'Unchanged member geometry changed');
      replacement.push(output); receipts.push(receipt);
      const reason = result.reason ?? (result.changed ? 'reduced' : 'unchanged');
      outcomes[level.level][reason] = (outcomes[level.level][reason] ?? 0) + 1;
      for (const [key, value] of Object.entries(result.stats ?? {})) {
        if (Number.isFinite(value)) statistics[level.level][key] = (statistics[level.level][key] ?? 0) + value;
      }
      decisions.push({componentIndex, level: level.level, changed: result.changed, reason, geometrySHA256: receipt.geometrySHA256,
        vertices: receipt.vertices, triangles: receipt.triangles, errorBoundM: result.changed ? result.errorBoundM : 0, ...(result.proof ? {proof: result.proof} : {})});
    }
    check(sourceSetHash(receipts) === sourceEquivalenceSHA256, 'Replacement source/material equivalence mismatch');
    const vertices = receipts.reduce((n, receipt) => n + receipt.vertices, 0), triangles = receipts.reduce((n, receipt) => n + receipt.triangles, 0);
    const geometrySHA256 = geometrySetHash(receipts), mid = index.variants.find(row => row.level === 'mid');
    let reason;
    if (!errors.length) reason = 'no-safe-reduction';
    else if (vertices >= counts.vertices || triangles >= counts.triangles || geometrySHA256 === index.near.geometrySHA256) reason = 'unreduced-leaf';
    else if (index.variants.some(row => row.geometrySHA256 === geometrySHA256)) reason = 'same-existing-geometry';
    else if (level.level === 'coarse' && mid && (vertices >= mid.vertices || triangles >= mid.triangles)) reason = 'not-smaller-than-mid';
    const decodedBytes = decodedTypedArrayBytes(replacement), reference = mid ?? index.near;
    const retainedFraction = {triangles: triangles / reference.triangles, decodedBytes: decodedBytes / reference.decodedBytes};
    const {maximumRetainedFraction} = DETAIL_VARIANT_BENEFIT;
    if (!reason && (retainedFraction.triangles > maximumRetainedFraction.triangles || retainedFraction.decodedBytes > maximumRetainedFraction.decodedBytes)) reason = 'insufficient-benefit';
    sidecar.components.push(...decisions);
    if (reason) {
      // Rejected before encoding: no asset is written and the level never counts as a variant.
      sidecar.variants.push({level: level.level, status: reason, ...(reason === 'insufficient-benefit' ? {geometrySHA256, vertices, triangles, decodedBytes,
        reference: {level: reference.level, triangles: reference.triangles, decodedBytes: reference.decodedBytes}, retainedFraction, maximumRetainedFraction} : {})});
      continue;
    }
    const header = {schema: BUILDING_DETAIL_REPLACEMENT_SCHEMA, level: level.level, canonicalIndexSHA256: index.canonicalIndex.sha256,
      canonicalLeafSHA256: canonical.sha256, geometrySHA256, materialSHA256: bindings.materialSHA256,
      sourceEquivalenceSHA256, producerSHA256: bindings.producerSHA256, protectionSHA256: bindings.protectionSHA256};
    check(encoder && typeof encoder.encodeVertexBuffer === 'function' && typeof encoder.encodeIndexSequence === 'function', 'A lossless meshoptimizer encoder is required for display replacements');
    if (encoderBinding) check(encoderBinding.version === MESHOPT_VERSION && SHA.test(encoderBinding.sha256), 'Invalid lossless encoder binding');
    if (decoderBinding) check(decoderBinding.version === MESHOPT_VERSION && SHA.test(decoderBinding.sha256), 'Invalid lossless decoder binding');
    const plainDocument = {schema_version: 1, city: provenance.city, components: replacement, detail_variant: header};
    const transport = await chooseBuildingDetailTransport(plainDocument, {encoder, signal, deadline, vertexCap: limits.maxVertices,
      serialize: detailJSON, maxRawBytes: MAX_VARIANT_RAW_BYTES, maxEncodedBytes: MAX_VARIANT_TRANSPORT_BYTES, dictionary: true});
    const {bytes, rawBytes: raw, encoding} = transport;
    check(transport.decodedBytes === decodedBytes, 'Replacement decoded byte accounting mismatch');
    const sha256 = hash(bytes), filename = `${level.level}-${sha256}.json.gz`;
    const asset = {path: `${base}/${filename}`, sha256, bytes: bytes.length, compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)};
    outputBytes += bytes.length; check(outputBytes <= limits.maxOutputBytes, 'Replacement output budget exceeded');
    assets.push({kind: 'replacement', filename, path: asset.path, sha256, bytes, descriptor: asset});
    const variant = {level: level.level, asset, geometrySHA256, vertices, triangles, errors, encoding, decodedBytes};
    index.variants.push(variant); sidecar.variants.push({...variant, status: 'complete-replacement', componentCount: replacement.length,
      encodingStats: {...transport.transportStats, transportBytes: bytes.length, measurement: 'decoded-stream-payload-and-transport-only-not-process-memory'}});
    // Only metadata survives this iteration; mid/coarse decoded arrays are not
    // retained together simply to construct a multi-level catalogue.
    const selectedGroups = buildBuildingDetailGroupMetadata({...groupInputs,
      levels: [{level: level.level, components: replacement, geometrySHA256, asset}]});
    groupDocument.levels.push(selectedGroups.levels.find(row => row.level === level.level));
  }
  check(jsonHash(components.map(componentReceipt)) === jsonHash(original), 'Canonical input mutated');
  {
    const transportDocument = compactBuildingDetailGroupMetadata(groupDocument);
    const groupMetadata = {key: jsonHash(transportDocument), ...transportDocument, metadataCost: buildingDetailMetadataCost(transportDocument)};
    const raw = Buffer.from(detailJSON(groupMetadata) + '\n');
    check(raw.length <= limits.maxMetadataBytes, 'Group metadata exceeds decoded metadata bound');
    const gzip = gzipSync(raw, {level: 9}), compressed = gzip.length < raw.length, bytes = compressed ? gzip : raw;
    check(bytes.length <= 500000, 'Group metadata exceeds original wire metadata bound');
    const sha256 = hash(bytes), filename = `groups-${sha256}.json${compressed ? '.gz' : ''}`;
    const descriptor = {path: `${base}/${filename}`, sha256, bytes: bytes.length,
      ...(compressed ? {compression: 'gzip', uncompressed_bytes: raw.length, uncompressed_sha256: hash(raw)} : {})};
    outputBytes += bytes.length; check(outputBytes <= limits.maxOutputBytes, 'Group metadata output budget exceeded');
    assets.push({kind: 'group-metadata', filename, path: descriptor.path, sha256, bytes, descriptor});
    index.groupMetadata = sidecar.groupMetadata = descriptor;
  }
  // Canonical-only leaves still provide real grouping authority. Their empty
  // variants array is explicit and is never counted as a new geometry LOD.
  {
    const bytes = Buffer.from(detailJSON(index) + '\n'), sha256 = hash(bytes), filename = `demand-${sha256}.json`;
    outputBytes += bytes.length; check(outputBytes <= limits.maxOutputBytes, 'Demand index output budget exceeded');
    assets.push({kind: 'demand-index', filename, path: `${base}/${filename}`, sha256, bytes});
    sidecar.demandIndex = {path: `${base}/${filename}`, sha256, bytes: bytes.length};
  }
  sidecar.summary = {canonicalComponents: components.length, canonicalVertices: counts.vertices, canonicalTriangles: counts.triangles,
    protectedComponents: protectedRows.filter(Boolean).length, reducedByLevel: Object.fromEntries(levels.map(level => [level.level,
      index.variants.find(row => row.level === level.level)?.errors.length ?? 0])), outcomes, statistics,
    canonicalDecodedTypedArrayBytes: components.reduce((n, component) => n + component.batches.reduce((sum, batch) => sum + batch.positions.byteLength + batch.normals.byteLength + batch.indices.byteLength, 0), 0),
    canonicalTransportBytes: canonicalLeaf.bytes,
    candidateAssetBytes: assets.filter(asset => asset.kind === 'replacement').reduce((n, asset) => n + asset.bytes.length, 0),
    completeReplacementLevels: index.variants.length, insufficientBenefitLevels: sidecar.variants.filter(row => row.status === 'insufficient-benefit').length,
    errorSamples: work.errorSamples, intersectionTests: work.intersectionTests, canonicalAssetsWritten: 0};
  const manifest = Buffer.from(detailJSON(sidecar) + '\n'); outputBytes += manifest.length;
  check(manifest.length <= 500000 && outputBytes <= limits.maxOutputBytes, 'Replacement manifest/output budget exceeded');
  abortCheck(signal, deadline);
  return {sidecar, demandIndex: index, assets, manifest, manifestSHA256: hash(manifest), totalOutputBytes: outputBytes};
}

export async function readBoundFile(filename, descriptor, cap) {
  check(descriptor && SHA.test(descriptor.sha256) && Number.isSafeInteger(descriptor.bytes) && descriptor.bytes > 0 && descriptor.bytes <= cap, 'Invalid bounded file descriptor');
  const metadata = await stat(filename); check(metadata.isFile() && metadata.size === descriptor.bytes, `Input size mismatch: ${filename}`);
  const bytes = await readFile(filename); check(bytes.length === descriptor.bytes && hash(bytes) === descriptor.sha256, `Input hash mismatch: ${filename}`); return bytes;
}
export async function sitePath(root, route) {
  check(typeof route === 'string' && route.startsWith('/') && !route.includes('\\') && !route.includes('\0') && !route.split('/').includes('..'), 'Invalid site path');
  const resolvedRoot = await realpath(root), resolved = await realpath(path.join(resolvedRoot, route));
  check(resolved.startsWith(resolvedRoot + path.sep), 'Site path escapes selected root'); return resolved;
}
async function boundedJSON(root, descriptor, limits) {
  const transport = descriptor.transport;
  if (transport) {
    check(transport.encoding === 'gzip', 'Unsupported metadata compression');
    const bytes = await readBoundFile(await sitePath(root, transport.path), transport, limits.maxMetadataBytes);
    const raw = gunzipSync(bytes, {maxOutputLength: limits.maxMetadataBytes});
    check(raw.length === descriptor.bytes && hash(raw) === descriptor.sha256, 'Decompressed metadata hash/size mismatch'); return JSON.parse(raw.toString('utf8'));
  }
  return JSON.parse((await readBoundFile(await sitePath(root, descriptor.path), descriptor, limits.maxMetadataBytes)).toString('utf8'));
}

/** Only explicitly pinned input mounts are used. Overlay entries describe
 * physical files; their public route is not guessed to be a disk path. */
export async function createBuildingDetailInputMount(plan, limits = limitsFor(plan.limits)) {
  const siteRoot = await realpath(plan.siteRoot), overlay = new Map();
  let overlayRoot, overlaySHA256;
  if (plan.resourceOverlay) {
    overlayRoot = await realpath(plan.resourceOverlay.root);
    const descriptor = plan.resourceOverlay.manifest;
    check(path.resolve(descriptor.path) === path.join(overlayRoot, 'asset-manifest.json'), 'Overlay manifest root mismatch');
    const bytes = await readBoundFile(descriptor.path, descriptor, limits.maxMetadataBytes), value = JSON.parse(bytes.toString('utf8'));
    check(value.schemaVersion === 1 && value.city === plan.city && Array.isArray(value.assets), 'Invalid city input overlay');
    if (plan.profile) check(value.profileSHA256 === plan.profile.sha256, 'Overlay/profile input binding mismatch');
    overlaySHA256 = hash(bytes);
    for (const row of value.assets) {
      check(row && typeof row.path === 'string' && typeof row.source === 'string' && row.source === 'assets' + row.path &&
        !overlay.has(row.path), 'Invalid/duplicate overlay resource route');
      overlay.set(row.path, row);
    }
  }
  async function bytes(descriptor, maximum = limits.maxMetadataBytes) {
    const row = overlay.get(descriptor.path);
    if (row) {
      check(row.sha256 === descriptor.sha256 && row.bytes === descriptor.bytes, 'Overlay resource identity mismatch');
      return readBoundFile(await sitePath(overlayRoot, '/' + row.source), descriptor, maximum);
    }
    return readBoundFile(await sitePath(siteRoot, descriptor.path), descriptor, maximum);
  }
  async function json(descriptor) {
    const physical = descriptor.transport ?? descriptor, compressed = descriptor.transport || descriptor.compression === 'gzip';
    if (descriptor.transport) check(descriptor.transport.encoding === 'gzip', 'Unsupported input metadata encoding');
    const input = await bytes(physical), raw = compressed ? gunzipSync(input, {maxOutputLength: limits.maxMetadataBytes}) : input;
    const expectedSize = descriptor.transport ? descriptor.bytes : descriptor.uncompressed_bytes ?? descriptor.bytes;
    const expectedSHA = descriptor.transport ? descriptor.sha256 : descriptor.uncompressed_sha256 ?? (compressed ? undefined : descriptor.sha256);
    check(raw.length <= limits.maxMetadataBytes && raw.length === expectedSize && (!expectedSHA || hash(raw) === expectedSHA), 'Input metadata raw binding mismatch');
    return JSON.parse(raw.toString('utf8'));
  }
  return {siteRoot, overlayRoot, overlaySHA256, bytes, json};
}

/** Bundle existing decoder/ownership logic only; no second packed mesh decoder. */
export async function loadBuildingDetailRuntime(repoRoot, city, limits = DETAIL_LIMITS) {
  const require = createRequire(path.join(repoRoot, 'web/package.json')), {build} = require('esbuild');
  const entry = [
    "export {normalizeBuildingShard} from './painted/city/safety/building-mesh-codec';",
    "export {parseBuildingDetailDemand,isBuildingDetailMeshoptEncoding} from './safety/building-detail-demand';",
    "export {decodeBuildingDetailMeshopt,decodeBuildingDetailJSON} from './safety/building-detail-meshopt';",
    "export {paintIdentityOwner} from './safety/paint-ownership';",
    "export {paintFamily} from './painted/church/safety/facade-paint-frame';",
    ...(city === 'bremen' ? ["export {bremenCertificateIdentityCandidate as certificateCandidate} from './painted/bremen/safety/bremen-identity-metadata';"] : []),
  ].join('\n');
  const result = await build({stdin: {contents: entry, resolveDir: path.join(repoRoot, 'web/src'), sourcefile: 'building-detail-offline-entry.ts', loader: 'ts'}, bundle: true, write: false, format: 'esm', platform: 'node', target: 'node22', metafile: true, treeShaking: true, logLevel: 'silent'});
  check(result.outputFiles.length === 1 && result.outputFiles[0].contents.length <= limits.maxMetadataBytes, 'Offline codec/protection bundle exceeds bound');
  const files = [];
  for (const source of Object.keys(result.metafile.inputs).sort()) {
    if (source.endsWith('building-detail-offline-entry.ts')) continue;
    const absolute = path.resolve(source), bytes = await readFile(absolute);
    check(bytes.length <= limits.maxMetadataBytes && absolute.startsWith(path.resolve(repoRoot) + path.sep), 'Unexpected offline bundle dependency');
    files.push({path: path.relative(repoRoot, absolute).split(path.sep).join('/'), sha256: hash(bytes), bytes: bytes.length});
  }
  const module = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].contents).toString('base64'));
  // This metadata literal is intentionally read without executing its unrelated
  // runtime table-count import (which depends on a Vite virtual module).
  const resourceFile = 'web/src/painted/city/safety/progressive-paint-admissions.ts';
  const resourceBytes = await readFile(path.join(repoRoot, resourceFile));
  check(resourceBytes.length <= limits.maxMetadataBytes, 'Admission metadata module exceeds bound');
  const resources = [...resourceBytes.toString('utf8').matchAll(/export const PROGRESSIVE_ADMISSIONS_RESOURCE\s*=\s*(\{[^\n]+?\})\s*as const;/g)];
  check(resources.length === 1, 'Exact progressive admission resource metadata required');
  const resource = JSON.parse(resources[0][1]);
  check(SHA.test(resource.canonicalSHA256) && resource.file === 'painted/city/safety/progressive-paint-admissions.ts' && resource.occurrence === 0 && resource.codec === 'json', 'Invalid progressive admission resource');
  files.push({path: resourceFile, sha256: hash(resourceBytes), bytes: resourceBytes.length}); files.sort((a, b) => a.path.localeCompare(b.path));
  return {...module, PROGRESSIVE_ADMISSIONS_RESOURCE: resource, evidence: files, closureSHA256: jsonHash(files), bundleSHA256: hash(result.outputFiles[0].contents)};
}

async function loadCityAdmissions({siteRoot, city, runtime, limits, profile, mount}) {
  const filename = profile?.path ?? path.join(siteRoot, 'city-data-profile.json'), info = await stat(filename);
  check(info.size <= limits.maxMetadataBytes, 'City profile exceeds bound');
  const bytes = profile ? await readBoundFile(filename, profile, limits.maxMetadataBytes) : await readFile(filename);
  const selectedProfile = JSON.parse(bytes.toString('utf8')), ref = runtime.PROGRESSIVE_ADMISSIONS_RESOURCE;
  check(selectedProfile.schemaVersion === 1 && selectedProfile.city === city && Array.isArray(selectedProfile.routes), 'Invalid selected city profile');
  const matches = selectedProfile.routes.filter(r => r.file === ref.file && r.canonicalSHA256 === ref.canonicalSHA256 && r.occurrence === ref.occurrence);
  check(matches.length === 1 && matches[0].selector === 'city-rows', 'Complete matching city admission route required');
  const route = matches[0], rows = await (mount ? mount.json(route.descriptor) : boundedJSON(siteRoot, route.descriptor, limits));
  check(Array.isArray(rows) && rows.length === route.retainedCount && rows.every(r => r.city === city), 'Incomplete city admission rows');
  return {rows, coverage: {completeForCity: true, city, source: 'current-city-profile-progressive-admissions', canonicalSHA256: ref.canonicalSHA256, selectedSHA256: route.descriptor.sha256, retainedCount: rows.length},
    evidence: [{path: 'city-data-profile.json', sha256: hash(bytes), bytes: bytes.length}, {path: route.descriptor.path, sha256: route.descriptor.sha256, bytes: route.descriptor.bytes}]};
}

export async function prepareBuildingDetailCityInput(plan) {
  const limits = limitsFor(plan.limits), city = plan.city;
  check(typeof city === 'string' && /^[a-z][a-z-]+$/.test(city), 'Explicit city required for production input');
  const mount = await createBuildingDetailInputMount(plan, limits);
  const runtime = await loadBuildingDetailRuntime(plan.repoRoot, city, limits);
  const admissions = await loadCityAdmissions({...plan, siteRoot: mount.siteRoot, runtime, limits, mount});
  const evidence = [...runtime.evidence, ...admissions.evidence];
  const protection = createBuildingDetailProtection({...runtime, progressiveRows: admissions.rows, coverage: admissions.coverage, evidence});
  const fingerprint = jsonHash({city, runtime: runtime.closureSHA256, coverage: admissions.coverage, evidence, overlaySHA256: mount.overlaySHA256 ?? null});
  return {city, mount, runtime, admissions, protection, fingerprint, evidence};
}

export async function buildingDetailOutputSpace(directory, bytes, reserve = 32 * 1024 ** 3) {
  check(Number.isSafeInteger(bytes) && bytes >= 0 && Number.isSafeInteger(reserve) && reserve >= 32 * 1024 ** 3, 'Invalid detail output/reserve budget');
  const info = await statfs(directory, {bigint: true}), free = info.bavail * info.bsize;
  check(free >= BigInt(reserve) + BigInt(bytes), 'Building detail output needs the 32 GiB disk reserve');
  return free;
}

export async function runBuildingDetailPlan(plan, {simplifier, simplifierBinding, encoder, encoderBinding, decoderBinding, signal = new AbortController().signal} = {}) {
  check(plan?.schemaVersion === 1 && ['repoRoot', 'siteRoot', 'outputRoot', 'assetBasePath', 'leafId'].every(k => typeof plan[k] === 'string' && plan[k].length > 0), 'Invalid detail production plan');
  check(plan.geometryPolicy === undefined || plan.geometryPolicy === BOUNDARY_DETAIL_POLICY, 'Unsupported detail geometry policy');
  check(['repoRoot', 'siteRoot', 'outputRoot'].every(k => path.isAbsolute(plan[k])), 'Plan roots must be absolute');
  const limits = limitsFor(plan.limits), initialDeadline = Date.now() + limits.maxMilliseconds;
  abortCheck(signal, initialDeadline);
  const mount = await createBuildingDetailInputMount(plan, limits), index = await mount.json(plan.index);
  check(index.schema_version === 1 && typeof index.city === 'string', 'Invalid canonical index');
  if (plan.city) check(plan.city === index.city, 'Canonical index city mismatch');
  let selectedIndex = index;
  check(plan.indexChain === undefined || Array.isArray(plan.indexChain) && plan.indexChain.length <= 4, 'Invalid canonical index partition chain');
  for (const descriptor of plan.indexChain ?? []) {
    check(Array.isArray(selectedIndex.partitions) && selectedIndex.partitions.some(row => row.path === descriptor.path && row.sha256 === descriptor.sha256 && row.bytes === descriptor.bytes), 'Partition is not admitted by its parent index');
    selectedIndex = await mount.json(descriptor);
    check(selectedIndex.schema_version === 1 && (selectedIndex.city === undefined || selectedIndex.city === index.city), 'Partition city/schema mismatch');
  }
  check(Array.isArray(selectedIndex.shards), 'Canonical leaf index must contain actual shards');
  const matches = selectedIndex.shards.filter(row => row.id === plan.leafId); check(matches.length === 1, 'Canonical leaf must be selected exactly once');
  const leaf = matches[0];
  check(leaf.bytes <= limits.maxInputBytes && (!leaf.uncompressed_bytes || leaf.uncompressed_bytes <= limits.maxRawBytes) && leaf.vertices <= limits.maxVertices, 'Selected leaf exceeds decode bound');
  const context = await prepareBuildingDetailCityInput({...plan, city: index.city}), {runtime, admissions, protection} = context;
  if (plan.sourceContextSHA256) check(plan.sourceContextSHA256 === context.fingerprint, 'Producer source/admission context changed during batch');
  abortCheck(signal, initialDeadline);
  const rawBytes = await mount.bytes(leaf, limits.maxInputBytes);
  check(leaf.compression === undefined || leaf.compression === 'gzip', 'Unsupported canonical compression');
  const inflated = leaf.compression === 'gzip' ? gunzipSync(rawBytes, {maxOutputLength: limits.maxRawBytes}) : rawBytes;
  check(inflated.length <= limits.maxRawBytes && (!leaf.uncompressed_bytes || inflated.length === leaf.uncompressed_bytes), 'Canonical raw size mismatch/bound');
  const raw = JSON.parse(inflated.toString('utf8'));
  if (raw.encoding === 'packed-json-v1') check(Array.isArray(raw.components) && raw.components.every(c => c.source_same_geometry === true || c.source_geometry !== undefined || c.source_geometry_ref !== undefined), 'Legacy packed component lacks explicit original SOURCE');
  const canonicalShard = runtime.normalizeBuildingShard(raw, index.city, limits.maxVertices, 200000);
  // The plain runtime adapter intentionally strips optional batch fields. Restore
  // their original values here so preservation/guarding can inspect them too.
  if (!raw.encoding) canonicalShard.components.forEach((c, i) => c.batches.forEach((b, j) => {
    for (const [key, value] of Object.entries(raw.components[i].batches[j])) if (!['positions', 'normals', 'indices', 'color'].includes(key)) b[key] = value;
  }));
  const decodedVertices = canonicalShard.components.reduce((n, c) => n + c.batches.reduce((sum, b) => sum + b.positions.length / 3, 0), 0);
  check(decodedVertices === leaf.vertices, 'Canonical index/decoded vertex count mismatch');
  const provenance = {city: index.city, compilerSHA256: index.compiler_sha256, compilerRole: 'immutable-canonical-source-compiler-not-variant-producer', sourcePBFSHA256: index.source_pbf_sha256, boundarySHA256: index.city_boundary?.sha256, sourceSnapshot: index.source_snapshot, canonicalIndex: plan.index,
    originalActualGeometryLOD: index.actual_geometry_lod, originalGeometryAliases: index.geometry_lod_aliases};
  const materialBinding = {kind: 'canonical-batch-colors-and-current-runtime-protection-closure', sha256: jsonHash({runtime: runtime.closureSHA256, admissions: admissions.coverage.selectedSHA256}), runtimeClosureSHA256: runtime.closureSHA256, cityAdmissionSHA256: admissions.coverage.selectedSHA256, modifiedGeometryRequiresNewAdmission: true};
  const buildVariants = plan.geometryPolicy === BOUNDARY_DETAIL_POLICY ? buildBuildingDetailReplacements : buildBuildingDetailVariants;
  const result = await buildVariants({canonicalShard, canonicalLeaf: {...leaf, rawSHA256: hash(inflated), rawBytes: inflated.length}, provenance, protection, materialBinding, signal, limits, levels: plan.levels, assetBasePath: plan.assetBasePath}, {simplifier, simplifierBinding, encoder, encoderBinding, decoderBinding});
  // Decode the candidate with the same real consumer adapter and compare every
  // retained SOURCE carrier, RGB and all compacted attributes after serialization.
  for (const asset of result.assets) {
    if (asset.kind === 'group-metadata') {
      const raw = asset.descriptor?.compression === 'gzip' ? gunzipSync(asset.bytes, {maxOutputLength: limits.maxMetadataBytes}) : asset.bytes;
      check(raw.length === (asset.descriptor?.uncompressed_bytes ?? asset.bytes.length) &&
        hash(raw) === (asset.descriptor?.uncompressed_sha256 ?? asset.sha256), 'Group metadata round-trip binding mismatch');
      const groups = JSON.parse(raw.toString('utf8'));
      check(groups.schema === 'crimemaps-building-detail-groups-v1' && groups.city === index.city &&
        groups.authority.canonicalIndexSHA256 === plan.index.sha256 && groups.authority.canonicalLeafSHA256 === leaf.sha256,
      'Group metadata source authority mismatch');
      continue;
    }
    if (asset.kind === 'demand-index') {
      runtime.parseBuildingDetailDemand(JSON.parse(asset.bytes.toString('utf8')), {city: index.city, canonicalIndexSHA256: plan.index.sha256, canonicalLeafSHA256: leaf.sha256});
      continue;
    }
    if (asset.kind === 'replacement') {
      const document = JSON.parse(gunzipSync(asset.bytes, {maxOutputLength: MAX_VARIANT_RAW_BYTES}).toString('utf8'));
      const decoded = runtime.isBuildingDetailMeshoptEncoding(document.encoding)
        ? await runtime.decodeBuildingDetailMeshopt(document, {signal, vertexCap: limits.maxVertices, geometryPositionCap: 200000})
        : await runtime.decodeBuildingDetailJSON(document, {signal, vertexCap: limits.maxVertices, geometryPositionCap: 200000});
      check(decoded.components.length === canonicalShard.components.length, 'Replacement omitted a canonical member');
      const receipts = decoded.components.map(componentReceipt);
      const registered = result.demandIndex.variants.find(row => row.asset.path === asset.path);
      check(registered && geometrySetHash(receipts) === registered.geometrySHA256 && sourceSetHash(receipts) === result.sidecar.bindings.sourceEquivalenceSHA256, 'Replacement codec SOURCE/material/geometry round-trip mismatch');
      continue;
    }
    const decoded = runtime.normalizeBuildingShard(JSON.parse(asset.bytes.toString('utf8')), index.city, limits.maxVertices, 200000);
    for (const c of decoded.components) {
      const row = result.sidecar.components.find(r => identity(r) === identity(c)), detail = row.details.find(d => d.asset === asset.path), receipt = componentReceipt(c);
      check(receipt.geometrySHA256 === detail.geometrySHA256 && receipt.sourceFeatureSHA256 === row.sourceFeatureSHA256, 'Candidate codec round-trip mismatch');
      check(c.batches.every((b, i) => detailJSON(Array.from(b.color)) === detailJSON(detail.batchMapping[i].canonical.color)), 'Candidate color round-trip mismatch');
    }
  }
  const root = path.resolve(plan.outputRoot), siteRoot = await realpath(plan.siteRoot), repoRoot = await realpath(plan.repoRoot);
  check(root !== siteRoot && !root.startsWith(siteRoot + path.sep) && root !== repoRoot && !root.startsWith(repoRoot + path.sep), 'Output must be outside canonical site and product checkout');
  const parent = await realpath(path.dirname(root)); check(parent === path.dirname(root), 'Output parent must be explicit and canonical');
  await buildingDetailOutputSpace(parent, limits.maxOutputBytes, plan.minFreeBytes);
  try { await stat(root); throw Error('Output directory already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  abortCheck(signal, initialDeadline);
  // Exclusive directory creation avoids rename replacing a directory created by
  // another producer after the earlier existence check. Manifest is written last.
  await mkdir(root, {recursive: false});
  try {
    for (const asset of result.assets) { abortCheck(signal, initialDeadline); await buildingDetailOutputSpace(root, asset.bytes.length, plan.minFreeBytes); await writeFile(path.join(root, asset.filename), asset.bytes, {flag: 'wx'}); }
    abortCheck(signal, initialDeadline); await buildingDetailOutputSpace(root, result.manifest.length, plan.minFreeBytes);
    await writeFile(path.join(root, 'detail-variants.json'), result.manifest, {flag: 'wx'});
    abortCheck(signal, initialDeadline);
  } catch (error) { await rm(root, {recursive: true, force: true}); throw error; }
  return {outputRoot: root, manifestSHA256: result.manifestSHA256, totalOutputBytes: result.totalOutputBytes,
    ...(plan.geometryPolicy ? {geometryPolicy: plan.geometryPolicy, demandIndex: result.sidecar.demandIndex ?? null, groupMetadata: result.sidecar.groupMetadata ?? null} : {}),
    sourceContextSHA256: context.fingerprint, sourceEvidence: context.evidence,
    files: result.assets.map(a => ({kind: a.kind, filename: a.filename, path: a.path, sha256: a.sha256, bytes: a.bytes.length})),
    summary: result.sidecar.summary, variants: result.sidecar.variants};
}

async function main(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--receipt-only') {check(!parsed.receiptOnly, 'Duplicate receipt option'); parsed.receiptOnly = true; continue;}
    const name = args[i];
    check(['--plan', '--simplifier'].includes(name) && args[i + 1] && !parsed[name], 'Usage: --plan /abs/plan.json --simplifier /abs/meshopt_simplifier.js [--receipt-only]');
    parsed[name] = args[++i];
  }
  check(parsed['--plan'] && path.isAbsolute(parsed['--plan']), 'An absolute production plan is required');
  const planInfo = await stat(parsed['--plan']); check(planInfo.size <= 65536, 'Production plan exceeds bound');
  check(parsed['--simplifier'] && path.isAbsolute(parsed['--simplifier']), 'An absolute simplifier module is required');
  const plan = JSON.parse(await readFile(parsed['--plan'], 'utf8'));
  const modulePath = parsed['--simplifier'];
  const packageInfo = JSON.parse(await readFile(path.join(path.dirname(modulePath), 'package.json'), 'utf8'));
  check(packageInfo.name === 'meshoptimizer' && packageInfo.version === MESHOPT_VERSION, 'Exact meshoptimizer 1.3.0 package required');
  const moduleBytes = await readFile(modulePath), simplifierBinding = {package: 'meshoptimizer', version: MESHOPT_VERSION, path: 'meshopt_simplifier.js', sha256: hash(moduleBytes), bytes: moduleBytes.length};
  const {MeshoptSimplifier} = await import(pathToFileURL(modulePath).href), controller = new AbortController();
  let encoder, encoderBinding, decoderBinding;
  if (plan.geometryPolicy === BOUNDARY_DETAIL_POLICY) {
    const encoderPath = path.join(path.dirname(modulePath), 'meshopt_encoder.js'), decoderPath = path.join(path.dirname(modulePath), 'meshopt_decoder.mjs');
    const encoderBytes = await readFile(encoderPath), decoderBytes = await readFile(decoderPath);
    const vendorDecoderBytes = await readFile(path.join(plan.repoRoot, 'web/src/vendor/meshoptimizer-1.3.0/meshopt_decoder.mjs'));
    check(hash(vendorDecoderBytes) === hash(decoderBytes), 'Browser/offline decoder implementation mismatch');
    encoderBinding = {package: 'meshoptimizer', version: MESHOPT_VERSION, path: 'meshopt_encoder.js', sha256: hash(encoderBytes), bytes: encoderBytes.length};
    decoderBinding = {package: 'meshoptimizer', version: MESHOPT_VERSION, path: 'meshopt_decoder.mjs', sha256: hash(decoderBytes), bytes: decoderBytes.length};
    ({MeshoptEncoder: encoder} = await import(pathToFileURL(encoderPath).href));
  }
  process.once('SIGINT', () => controller.abort()); process.once('SIGTERM', () => controller.abort());
  const result = await runBuildingDetailPlan(plan, {simplifier: MeshoptSimplifier, simplifierBinding, encoder, encoderBinding, decoderBinding, signal: controller.signal});
  const receipt = parsed.receiptOnly ? {...result, variants: result.variants.map(row => ({level: row.level, status: row.status,
    geometrySHA256: row.geometrySHA256, encoding: row.encoding, decodedBytes: row.decodedBytes}))} : result;
  console.log(JSON.stringify(receipt, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(`${error.name}: ${error.message}`); process.exitCode = 1; });
