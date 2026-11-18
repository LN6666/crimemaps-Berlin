import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import ts from 'typescript';

// Reuse only the existing self-contained GL fake. No other suite is imported or run.
const fixtureText = await readFile(new URL('./environment-visual-renderer.test.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('existing-gl-fixture.mjs', fixtureText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fakeGL');
assert(declaration);
const existingFakeGL = Function(`${declaration.getText(ast)};return fakeGL;`)();
function fakeGL() {
  const gl = existingFakeGL(), layouts = new Map(), divisors = new Map(); let vao;
  const bind = gl.bindVertexArray, pointer = gl.vertexAttribPointer, divisor = gl.vertexAttribDivisor;
  gl.bindVertexArray = value => {vao = value; bind(value);};
  gl.vertexAttribPointer = (at, size, type, normalized, stride, offset) => {
    pointer(at, size, type, normalized, stride, offset);
    layouts.set(`${vao?.id}:${at}`, {size, type, normalized, stride, offset});
  };
  gl.vertexAttribDivisor = (at, value) => {divisor(at, value); divisors.set(`${vao?.id}:${at}`, value);};
  return Object.assign(gl, {layouts, divisors});
}
const built = await build({stdin: {contents: `
  export {createEnvironmentSceneRenderer} from './environment-scene-renderer';
  export * from './environment-ground-mesh';
  export {greenGroundGeometry} from './environment-greenery-geometry';
  export {prepareSolarShadowBoundary} from './solar-shadow-admission';
  export {createResourceBudget} from './render-runtime/resource-budget';
  export {createChunkResourceStore} from './render-runtime/chunk-resource-store';`,
  resolveDir: new URL('../src/safety/', import.meta.url).pathname, loader: 'ts'},
  bundle: true, write: false, platform: 'node', format: 'esm', target: 'es2022', preserveSymlinks: true});
const m = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const origin = [13.4, 52.5], bounds = [13.3, 52.4, 13.5, 52.6], sourceSHA = 'a'.repeat(64), boundarySHA = 'b'.repeat(64);
const square = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const boundary = m.prepareSolarShadowBoundary({boundarySHA256: boundarySHA,
  geometry: {type: 'Polygon', coordinates: [square(...bounds)]}});
const properties = {source_boundary_sha256: boundarySHA, source_pbf_sha256: sourceSHA,
  source_snapshot: 'synthetic-ground-renderer', displayClip: false, osmTags: {height: '12', landuse: 'grass'}, tree_crown_display_5m_guard: true};
const tree = {type: 'Feature', id: 'osm/node/1', geometry: {type: 'Point', coordinates: origin}, properties: {...properties, kind: 'tree'}};
const water = {type: 'Feature', id: 'osm/way/2', geometry: {type: 'Polygon',
  coordinates: [square(13.4001, 52.5001, 13.4005, 52.5005)]}, properties: {...properties, kind: 'water'}};
const ground = {...water, id: 'osm/way/3', properties: {...properties, kind: 'green'}};
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function encode(values, float) {
  const raw = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => float ? raw.writeFloatLE(value, i * 4) : raw.writeUInt32LE(value, i * 4));
  return raw.toString('base64');
}
function packedFixture() {
  // The tiny fixture's actual native geometry supplies all seven original
  // attributes. Production parsing and decoding remain the real parent helper.
  const generated = m.greenGroundGeometry([ground], origin, bounds, boundary, 20000, 60000);
  const native = {...generated, positions: new Float32Array(generated.positions), indices: new Uint32Array(generated.indices)};
  const vertices = native.positions.length / 7;
  assert(vertices >= 3); assert(native.indices.length >= 3);
  const positions = [];
  for (let i = 0; i < vertices; i++) {
    const at = i * 7;
    assert.equal(native.positions[at + 3], 0); assert.equal(native.positions[at + 4], 1); assert.equal(native.positions[at + 5], 0);
    positions.push(native.positions[at], native.positions[at + 1], native.positions[at + 2], native.positions[at + 6]);
  }
  const canonical = [{path: `/safety/environment/berlin/ground-overview-${sourceSHA}.json.gz`,
    sha256: sourceSHA, uncompressed_sha256: 'c'.repeat(64)}];
  const packedBytes = vertices * 16 + native.indices.length * 4;
  const data = {schema: 'environment-ground-far-mesh-v1', encoding: 'f32le-xyz-role4-u32le', city: 'berlin',
    source_pbf_sha256: sourceSHA, source_boundary_sha256: boundarySHA, source_snapshot: properties.source_snapshot,
    canonical_ground_tiles: canonical, source_feature_ids: [ground.id], source_polygon_count: native.admitted,
    origin, vertex_count: vertices, index_count: native.indices.length,
    vertices_f32le_base64: encode(positions, true), indices_u32le_base64: encode([...native.indices], false),
    proof: {canonical_vertices: vertices, canonical_indices: native.indices.length,
      canonical_bytes_7stride: native.positions.byteLength + native.indices.byteLength,
      packed_bytes_4stride: packedBytes, fixed_up_normal_bytes: 12, packed_bytes_including_up_normal: packedBytes + 12,
      position_error_m: 0, welded_vertices: 0, duplicate_triangles: 0,
      expanded_unique_oriented_triangles_equal: true, all_seven_attributes_bit_exact: true}};
  const expected = {city: 'berlin', sourceSHA256: sourceSHA, boundarySHA256: boundarySHA,
    snapshot: properties.source_snapshot, canonicalGroundTiles: canonical, sourceFeatureCount: 1};
  return {data, expected, native, mesh: m.inspectEnvironmentGroundMesh(data, expected)};
}
function fixture() {
  const budget = m.createResourceBudget({limitBytes: 64 * 1024 * 1024, recentLimitBytes: 8 * 1024 * 1024});
  const store = m.createChunkResourceStore({budget}), gl = fakeGL();
  const r = m.createEnvironmentSceneRenderer({triggerRepaint() {}}, {origin, verifiedBoundary: boundary, resourceStore: store});
  r.layer.onAdd({}, gl);
  r.setSceneEnvironment({instantISO: '2026-06-21T12:00:00+02:00', sunlight: true, shadows: false, motion: true, quality: 'economy'});
  const full = () => r.setFeatures([tree, water, ground], bounds, new Set([water]));
  full(); r.setEnabled(true);
  return {r, gl, store, budget, full, close() {r.destroy(); store.destroy();}};
}
function renderFar(r, gl, mesh) {
  gl.draws.length = 0; r.layer.render(gl, identity);
  assert.equal(r.stats.renderFailure, undefined);
  const draw = gl.draws.find(d => !d.composite && d.count === mesh.indexCount);
  assert(draw, 'the real packed ground draw reaches the existing program/VAO');
  assert.equal(draw.type, gl.UNSIGNED_INT); assert.equal(draw.instances, 1);
  const layout = at => gl.layouts.get(`${draw.vao.id}:${at}`);
  assert.deepEqual(layout(0), {size: 3, type: gl.FLOAT, normalized: false, stride: 16, offset: 0});
  assert.deepEqual(layout(2), {size: 1, type: gl.FLOAT, normalized: false, stride: 16, offset: 12});
  assert.deepEqual(layout(1), {size: 3, type: gl.FLOAT, normalized: false, stride: 0, offset: mesh.vertexCount * 16});
  assert.equal(gl.divisors.get(`${draw.vao.id}:1`), 1);
  const buffer = gl.attributes.get(`${draw.vao.id}:0`), bytes = mesh.vertexCount * 16 + 12;
  assert.equal(gl.writes.filter(w => w.target === gl.ARRAY_BUFFER && w.buffer === buffer).at(-1).bytes, bytes);
  return draw;
}

test('far ground uses the real 16-byte stream plus one UP normal; native full restores water/tree layout and far can return', () => {
  const f = fixture(), {r, gl} = f, p = packedFixture();
  try {
    const waterBefore = r.waterAdmissionEvidence, handles = gl.buffers.length, inputBefore = JSON.stringify(p.data);
    r.setGroundMesh(p.mesh); renderFar(r, gl, p.mesh);
    const bytes = p.mesh.vertexCount * 16 + 12 + p.mesh.indexCount * 4;
    assert.equal(r.stats.greenGround.vertexBufferBytes, p.mesh.vertexCount * 16 + 12);
    assert.equal(r.stats.greenGround.indexBufferBytes, p.mesh.indexCount * 4);
    assert.equal(r.stats.resources.publicationBytes, bytes); assert.equal(r.stats.resources.gpu.claims.water, bytes);
    assert.equal(r.stats.greenGround.vertices, p.mesh.vertexCount); assert.equal(r.stats.greenGround.admitted, p.native.admitted);
    assert.equal(r.stats.waterVertices, 0); assert.equal(r.stats.waterTriangles, 0); assert.equal(r.stats.trees, 0);
    assert.equal(r.stats.animationActive, false); assert.equal(r.stats.buildingReflection.allocatedGPUBytes, 0);
    assert(bytes < p.data.proof.canonical_bytes_7stride, 'assert exact reduction, not a universal 30% or U16 claim');
    assert.equal(gl.buffers.length, handles, 'no extra buffer or per-vertex normal allocation');
    f.full(); gl.draws.length = 0; r.layer.render(gl, identity);
    assert.equal(r.stats.renderFailure, undefined); assert.deepEqual(r.waterAdmissionEvidence, waterBefore);
    const native = gl.draws.find(d => !d.composite && d.tree === 0 && d.shadow === 0);
    const surface = gl.draws.find(d => !d.composite && d.tree === 1 && d.shadow === 0);
    assert(native && surface);
    assert.equal(gl.layouts.get(`${native.vao.id}:1`).stride, 28);
    assert.equal(gl.layouts.get(`${native.vao.id}:1`).offset, 12);
    assert.equal(gl.divisors.get(`${native.vao.id}:1`), 0);
    assert.equal(gl.layouts.get(`${surface.vao.id}:1`).stride, 28);
    assert.equal(gl.divisors.get(`${surface.vao.id}:1`) ?? 0, 0, 'tree VAO remains the native seven-float layout');
    r.setGroundMesh(p.mesh); renderFar(r, gl, p.mesh);
    assert.equal(JSON.stringify(p.data), inputBefore, 'renderer never rewrites or clones ownership of the encoded source');
    assert.equal(p.mesh.data, p.data); assert.equal(gl.buffers.length, handles);
  } finally {f.close();}
});

test('decode, boundary and pre-decode budget refusal preserve the previously published native scene', () => {
  const f = fixture(), {r, gl, budget} = f, p = packedFixture(); let hold;
  try {
    const before = r.waterAdmissionEvidence, trees = r.treeDisplayEvidence, writes = gl.writes.length;
    const bad = structuredClone(p.data), raw = Buffer.from(bad.vertices_f32le_base64, 'base64');
    raw.writeFloatLE(NaN, 0); bad.vertices_f32le_base64 = raw.toString('base64');
    const beforeBytes = budget.stats.bytes;
    assert.throws(() => r.setGroundMesh(m.inspectEnvironmentGroundMesh(bad, p.expected)), /source-bound/);
    assert.equal(budget.stats.bytes, beforeBytes);
    const outside = structuredClone(p.data), outsideRaw = Buffer.from(outside.vertices_f32le_base64, 'base64');
    for (let i = 0; i < outside.vertex_count; i++) outsideRaw.writeFloatLE(1000000 + i, i * 16);
    outside.vertices_f32le_base64 = outsideRaw.toString('base64');
    assert.throws(() => r.setGroundMesh(m.inspectEnvironmentGroundMesh(outside, p.expected)), /boundary coverage/);
    assert.equal(budget.stats.bytes, beforeBytes);
    const result = budget.tryReserve({category: 'metadata', bytes: budget.stats.availableBytes - 16,
      precision: 'exact', identity: {}, label: 'synthetic external pressure'});
    assert.equal(result.ok, true); hold = result.reservation;
    assert.throws(() => r.setGroundMesh(p.mesh), /waits|budget|logical bytes/);
    assert.deepEqual(r.waterAdmissionEvidence, before); assert.deepEqual(r.treeDisplayEvidence, trees);
    assert.equal(gl.writes.length, writes, 'all refusals precede mutation/upload of the old publication');
  } finally {hold?.release(); f.close();}
});

test('context restore reuses the packed CPU buffer and restores its normal tail/divisor without starting a ground clock', () => {
  const f = fixture(), {r, gl} = f, p = packedFixture();
  try {
    r.animationFrame(0); r.animationFrame(100); const phase = r.stats.animation.elapsedSeconds;
    r.setGroundMesh(p.mesh); renderFar(r, gl, p.mesh);
    const bytes = r.stats.resources.publicationBytes, source = JSON.stringify(p.data);
    gl.isContextLost = () => true; r.layer.render(gl, identity); r.layer.onRemove();
    r.animationFrame(10000); assert.equal(r.stats.animation.elapsedSeconds, phase);
    const restored = fakeGL(); r.layer.onAdd({}, restored); renderFar(r, restored, p.mesh);
    assert.equal(r.stats.resources.publicationBytes, bytes); assert.equal(r.stats.animationActive, false);
    assert.equal(r.stats.animation.elapsedSeconds, phase); assert.equal(JSON.stringify(p.data), source);
    f.full(); r.animationFrame(20000); assert.equal(r.stats.animation.elapsedSeconds, phase);
  } finally {f.close();}
});
