import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// REPORT F3: the Bremen idle view has 256 loaded schematic roads but none in
// view, so zero cars is correct. Stats now say so explicitly; speed, density,
// roads and drawing are unchanged. inactiveReason names the first condition,
// in data-to-display order, that leaves no decorative car active.
async function module(name) {
  const result = await build({entryPoints: [new URL('../src/safety/' + name + '.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + `\n//# sourceURL=${name}-inactive-reason.js`).toString('base64'));
}
async function load(contents, label) {
  const result = await build({stdin: {contents, resolveDir: new URL('../src/safety/', import.meta.url).pathname, loader: 'ts'}, bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + `\n//# sourceURL=${label}.js`).toString('base64'));
}
const {createAnimatedVehicles} = await module('animated-vehicles');
const {createDisplayFrameClock} = await module('display-frame-clock');
const scenery = {
  schema_version: 1, city: 'berlin', source_snapshot: 'test', source_pbf_sha256: 'a'.repeat(64),
  source_url: 'https://www.openstreetmap.org', city_boundary_sha256: 'b'.repeat(64), role: 'decorative-schematic', partial: true,
  roads: [{id: 'osm/way/1/clip/0', source_way_id: 1, coordinates: [[13, 52], [13.002, 52.002]], direction: 1, source_tags: {highway: 'residential'}, source_url: 'https://www.openstreetmap.org/way/1'}],
};
const farView = [13.5, 52.5, 13.51, 52.51], nearView = [12.999, 51.999, 13.003, 52.003];
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
// A valid camera whose frustum excludes every road point (review probe of finding F4).
const away = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1e9, 1e9, 0, 1]);
function fakeGL(overrides = {}) {
  let lost = false, drawCalls = 0;
  const gl = {createVertexArray: () => ({}), createBuffer: () => ({}), createShader: () => ({}), createProgram: () => ({}), getShaderParameter: () => true,
    getProgramParameter: () => true, getParameter: () => null, getUniformLocation: () => ({}), getAttribLocation: () => 0, isContextLost: () => lost,
    drawElementsInstanced: () => { drawCalls++; }, setLost(value) { lost = value; }, get drawCalls() { return drawCalls; }};
  for (const key of ['shaderSource', 'compileShader', 'attachShader','detachShader', 'linkProgram', 'deleteShader', 'bindVertexArray', 'bindBuffer', 'bufferData', 'enableVertexAttribArray',
    'vertexAttribPointer', 'vertexAttribDivisor', 'bufferSubData', 'useProgram', 'enable', 'depthFunc', 'depthMask', 'disable', 'uniformMatrix4fv', 'deleteBuffer', 'deleteVertexArray', 'deleteProgram']) gl[key] = () => {};
  for (const [index, key] of ['VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS', 'VERTEX_ARRAY_BINDING', 'ARRAY_BUFFER_BINDING', 'ARRAY_BUFFER',
    'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW', 'DYNAMIC_DRAW', 'FLOAT', 'DEPTH_TEST', 'LEQUAL', 'BLEND', 'CULL_FACE', 'TRIANGLES', 'UNSIGNED_SHORT'].entries()) gl[key] = index + 1;
  return Object.assign(gl, overrides);
}
function fixture(t, {gl = fakeGL(), create = createAnimatedVehicles, options = {}} = {}) {
  let now = 0, serial = 0, repaints = 0;
  const timers = new Map(), errors = [];
  const frameClock = createDisplayFrameClock({clock: () => now, requestRepaint: () => { repaints++; }, setTimer: (fn, delay) => {
    const id = ++serial; timers.set(id, {fn, at: now + delay}); return id;
  }, clearTimer: id => timers.delete(id)});
  const vehicles = create({triggerRepaint() { repaints++; }, fire(_type, event) { errors.push(event.error); }}, 'berlin', {clock: () => now, frameClock, ...options});
  const render = (matrix = identity) => vehicles.layer.render(gl, matrix);
  const advance = (ms, matrix) => { now += ms; render(matrix); };
  t.after(() => { vehicles.destroy(); frameClock.destroy(); });
  return {vehicles, gl, render, advance, errors, get drawCalls() { return gl.drawCalls; }, get repaints() { return repaints; }, get timers() { return timers.size; }};
}
const pick = stats => ({viewportRoads: stats.viewportRoads, inactiveReason: stats.inactiveReason, roads: stats.roads, loadedSourceRoads: stats.loadedSourceRoads, candidateSlots: stats.candidateSlots, activeVehicles: stats.activeVehicles});

test('a view whose loaded schematic roads all lie outside it reports no-source-roads-in-view', t => {
  const f = fixture(t);
  assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-source-roads', 'nothing loaded yet');
  f.vehicles.setRoads({...scenery, roads: []});
  assert.equal(f.vehicles.stats.inactiveReason, 'no-source-roads', 'a loaded source without any road');
  f.vehicles.setRoads(scenery, farView); f.vehicles.setEnabled(true); f.vehicles.layer.onAdd({}, f.gl); f.advance(0); f.advance(1000);
  const stats = f.vehicles.stats;
  assert.deepEqual(pick(stats), {viewportRoads: 0, inactiveReason: 'no-source-roads-in-view', roads: 0, loadedSourceRoads: 1, candidateSlots: 0, activeVehicles: 0});
  assert.equal(f.drawCalls, 0); assert.equal(stats.draws, 0);
  // The legacy field keeps its value; its meaning is now stated next to it.
  assert.equal(stats.sourceCapacityLimited, true);
  assert.match(stats.sourceCapacityLimitedMeaning, /true only while candidateSlots is 0/); assert.match(stats.sourceCapacityLimitedMeaning, /not a fleet or source capacity limit/);
  // The early-return artefacts named in REPORT F3 are unchanged, now explained by inactiveReason.
  assert.equal(stats.densityPending, true); assert.equal(stats.projectionBound, false);
});

test('moving the view onto a road activates cars and clears the reason without changing motion settings', t => {
  const f = fixture(t);
  f.vehicles.setRoads(scenery, farView); f.vehicles.setEnabled(true); f.vehicles.layer.onAdd({}, f.gl); f.advance(0);
  const before = f.vehicles.stats;
  f.vehicles.setViewport(nearView);
  assert.equal(f.vehicles.stats.viewportRoads, 1); assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-first-frame');
  f.advance(0); f.advance(1000);
  const stats = f.vehicles.stats;
  assert.equal(stats.inactiveReason, null); assert(stats.activeVehicles > 0); assert(f.drawCalls > 0);
  assert.equal(stats.sourceCapacityLimited, false); assert.equal(stats.viewportRoads, stats.roads);
  for (const key of ['maxAnimationFPS', 'cap', 'baselineCap', 'reservoirCap', 'baselineCandidateSpacingMetres', 'baselineMinimumCandidateSpacingMetres', 'meshTrianglesPerVehicle', 'modelScale'])
    assert.deepEqual(stats[key], before[key], key);
  assert.deepEqual(stats.speedRangeMetresPerSecond, [3.5625, 6.09375]);
  // Reading stats has no side effects on motion, timers or repaints.
  const repaints = f.repaints, timers = f.timers, samples = JSON.stringify(f.vehicles.positionSamples);
  for (let i = 0; i < 3; i++) void f.vehicles.stats;
  assert.equal(f.repaints, repaints); assert.equal(f.timers, timers); assert.equal(JSON.stringify(f.vehicles.positionSamples), samples);
  // Without a viewport the whole loaded source is in scope.
  f.vehicles.setRoads(scenery); assert.equal(f.vehicles.stats.viewportRoads, 1);
});

test('display states name why loaded in-view cars are inactive', t => {
  const f = fixture(t);
  f.vehicles.setRoads(scenery, nearView);
  assert.equal(f.vehicles.stats.inactiveReason, 'disabled');
  f.vehicles.setEnabled(true); assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-gpu');
  f.vehicles.layer.onAdd({}, f.gl); f.advance(0); f.advance(1000); assert.equal(f.vehicles.stats.inactiveReason, null);
  f.vehicles.setVisible(false); assert.equal(f.vehicles.stats.inactiveReason, 'hidden'); assert.equal(f.vehicles.stats.activeVehicles, 0);
  f.vehicles.setVisible(true); f.vehicles.setReducedMotion(true); assert.equal(f.vehicles.stats.inactiveReason, 'reduced-motion');
  f.vehicles.setReducedMotion(false); f.advance(1000); assert.equal(f.vehicles.stats.inactiveReason, null);
  f.vehicles.destroy(); assert.equal(f.vehicles.stats.inactiveReason, 'destroyed'); assert.equal(f.vehicles.stats.viewportRoads, 0);
});

// Review finding F4: roads inside the viewport box can all lie outside the
// six-plane camera frustum; the first-frame density scan then leaves zero slots.
test('roads inside the viewport box but outside the camera frustum report no-candidate-slots-in-view', t => {
  const f = fixture(t);
  f.vehicles.setRoads(scenery, nearView); f.vehicles.setEnabled(true); f.vehicles.layer.onAdd({}, f.gl);
  const before = f.vehicles.stats;
  assert.equal(before.inactiveReason, 'awaiting-first-frame'); assert.ok(before.candidateSlots > 0, 'box-clipped density admits the road before the first frame');
  f.advance(1000, away);
  const stats = f.vehicles.stats;
  assert.deepEqual(pick(stats), {viewportRoads: 1, inactiveReason: 'no-candidate-slots-in-view', roads: 1, loadedSourceRoads: 1, candidateSlots: 0, activeVehicles: 0});
  assert.equal(stats.densityPending, false); assert.equal(stats.densityScans, 1); assert.equal(stats.frustumRoadLengthM, 0);
  assert.equal(f.drawCalls, 0); assert.equal(stats.draws, 0);
  // The legacy field reads false here although there are zero slots, and its stated meaning now says exactly that.
  assert.equal(stats.sourceCapacityLimited, false);
  assert.match(stats.sourceCapacityLimitedMeaning, /reads false once an update has run, including after the first-frame frustum density scan leaves zero slots/);
  // A visibility round trip resets the update clock, so the legacy value flips back; the reason does not.
  f.vehicles.setVisible(false); f.vehicles.setVisible(true); f.advance(1000, away);
  assert.equal(f.vehicles.stats.sourceCapacityLimited, true); assert.equal(f.vehicles.stats.inactiveReason, 'no-candidate-slots-in-view');
  // The next source/view commit rescans density with the then-current camera and brings cars back.
  f.vehicles.setViewport(nearView); f.advance(0); f.advance(1000);
  assert.equal(f.vehicles.stats.inactiveReason, null); assert.equal(f.vehicles.stats.densityScans, 2); assert.ok(f.vehicles.stats.activeVehicles > 0);
});

test('cars that the last CPU cull left outside the camera report no-visible-candidates', t => {
  const f = fixture(t);
  f.vehicles.setRoads(scenery, nearView); f.vehicles.setEnabled(true); f.vehicles.layer.onAdd({}, f.gl); f.advance(0); f.advance(1000);
  assert.equal(f.vehicles.stats.inactiveReason, null);
  const slots = f.vehicles.stats.candidateSlots, draws = f.drawCalls;
  f.advance(1000, away);
  const stats = f.vehicles.stats;
  assert.equal(stats.inactiveReason, 'no-visible-candidates'); assert.equal(stats.activeVehicles, 0);
  assert.equal(stats.candidateSlots, slots, 'a camera move alone never re-allocates'); assert.equal(stats.densityScans, 1);
  assert.equal(f.drawCalls, draws, 'nothing is drawn');
  f.advance(1000); assert.equal(f.vehicles.stats.inactiveReason, null, 'the same cohort draws again when the camera returns');
});

// Review finding F5: a failed onAdd and a lost context used to read as waiting states.
test('failed GPU initialisation and a lost context are named instead of shown as waiting', t => {
  const f = fixture(t);
  f.vehicles.setRoads(scenery, nearView); f.vehicles.setEnabled(true);
  assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-gpu', 'no context attached yet');
  const compileFails = fakeGL({getShaderParameter: () => false, getShaderInfoLog: () => 'injected compile failure'}), buffersFail = fakeGL({createVertexArray: () => null});
  for (const [gl, message] of [[compileFails, /injected compile failure/], [buffersFail, /Vehicle buffer allocation failed/]]) {
    assert.throws(() => f.vehicles.layer.onAdd({}, gl), message);
    const stats = f.vehicles.stats;
    assert.equal(stats.inactiveReason, 'gpu-init-failed', String(message));
    assert.equal(stats.renderFailure, undefined, 'an onAdd failure is not a render failure');
    f.vehicles.layer.render(gl, identity); assert.equal(gl.drawCalls, 0);
    f.vehicles.layer.onRemove(); assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-gpu', 'a removed layer has no context');
  }
  f.vehicles.layer.onAdd({}, f.gl); assert.equal(f.vehicles.stats.inactiveReason, 'awaiting-first-frame', 'a successful onAdd clears the failure');
  f.advance(0); f.advance(1000); assert.equal(f.vehicles.stats.inactiveReason, null);
  f.gl.setLost(true); f.advance(1000);
  assert.equal(f.vehicles.stats.inactiveReason, 'context-lost'); assert.equal(f.vehicles.stats.activeVehicles, 0);
  f.gl.setLost(false); f.advance(1000); assert.equal(f.vehicles.stats.inactiveReason, null, 'the reason follows the current context state');
});

test('a render exception is named render-failure', async t => {
  const f = fixture(t, {gl: fakeGL({drawElementsInstanced: () => { throw Error('injected draw failure'); }})});
  f.vehicles.setRoads(scenery, nearView); f.vehicles.setEnabled(true); f.vehicles.layer.onAdd({}, f.gl); f.advance(0); f.advance(1000);
  const stats = f.vehicles.stats;
  assert.equal(stats.inactiveReason, 'render-failure'); assert.match(stats.renderFailure, /injected draw failure/); assert.equal(stats.activeVehicles, 0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.errors.length, 1, 'reported once through the map error event');
});

test('page ledger pressure on the vehicle GPU buffers is named gpu-budget-deferred', async t => {
  const ledger = await load(`export {createAnimatedVehicles} from './animated-vehicles';export {createChunkResourceStore} from './render-runtime/chunk-resource-store';export {createResourceBudget} from './render-runtime/resource-budget';`, 'vehicle-inactive-reason-ledger');
  const MiB = 1024 * 1024, budget = ledger.createResourceBudget({limitBytes: 64 * MiB, recentLimitBytes: 8 * MiB}), store = ledger.createChunkResourceStore({budget});
  const gl = fakeGL({fenceSync: () => ({}), flush() {}, deleteSync() {}, clientWaitSync: () => gl.ALREADY_SIGNALED,
    SYNC_GPU_COMMANDS_COMPLETE: 101, ALREADY_SIGNALED: 102, CONDITION_SATISFIED: 103, TIMEOUT_EXPIRED: 104, WAIT_FAILED: 105});
  const f = fixture(t, {gl, create: ledger.createAnimatedVehicles, options: {resourceStore: store}});
  f.vehicles.setRoads(scenery, nearView); f.vehicles.setEnabled(true);
  const blocker = budget.reserve({category: 'texture', bytes: budget.stats.availableBytes - 16, precision: 'exact'});
  f.vehicles.layer.onAdd({}, gl);
  assert.equal(f.vehicles.stats.resources.gpuDeferred, true); assert.equal(f.vehicles.stats.inactiveReason, 'gpu-budget-deferred');
  for (let i = 0; i < 3; i++) f.advance(100);
  assert.equal(f.vehicles.stats.inactiveReason, 'gpu-budget-deferred', 'frames before the ledger wake-up stay deferred'); assert.equal(f.drawCalls, 0);
  blocker.release(); await new Promise(resolve => setImmediate(resolve));
  f.advance(0); f.advance(1000);
  assert.equal(f.vehicles.stats.resources.gpuDeferred, false); assert.equal(f.vehicles.stats.inactiveReason, null); assert.ok(f.drawCalls > 0);
  f.vehicles.destroy(); store.collectRetired(); store.destroy();
});
