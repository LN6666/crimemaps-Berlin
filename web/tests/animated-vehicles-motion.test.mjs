import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

async function module(name) {
  const result = await build({entryPoints: [new URL('../src/safety/' + name + '.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text + `\n//# sourceURL=${name}-under-test.js`).toString('base64'));
}
const {createAnimatedVehicles} = await module('animated-vehicles');
const {createDisplayFrameClock} = await module('display-frame-clock');
const scenery = {
  schema_version: 1, city: 'berlin', source_snapshot: 'test', source_pbf_sha256: 'a'.repeat(64),
  source_url: 'https://www.openstreetmap.org', city_boundary_sha256: 'b'.repeat(64), role: 'decorative-schematic', partial: true,
  roads: [{id: 'osm/way/1/clip/0', source_way_id: 1, coordinates: [[13, 52], [13.002, 52.002]], direction: 1, source_tags: {highway: 'residential'}, source_url: 'https://www.openstreetmap.org/way/1'}],
};
function fixture(t) {
  let now = 0, serial = 0, repaint = false, lost = false;
  const timers = new Map();
  const frameClock = createDisplayFrameClock({clock: () => now, requestRepaint: () => { repaint = true; }, setTimer: (fn, delay) => {
    const id = ++serial; timers.set(id, {fn, at: now + delay}); return id;
  }, clearTimer: id => timers.delete(id)});
  const gl = {createVertexArray: () => ({}), createBuffer: () => ({}), createShader: () => ({}), createProgram: () => ({}), getShaderParameter: () => true,
    getProgramParameter: () => true, getParameter: () => null, getUniformLocation: () => ({}), getAttribLocation: () => 0, isContextLost: () => lost};
  for (const key of ['shaderSource', 'compileShader', 'attachShader','detachShader', 'linkProgram', 'deleteShader', 'bindVertexArray', 'bindBuffer', 'bufferData', 'enableVertexAttribArray',
    'vertexAttribPointer', 'vertexAttribDivisor', 'bufferSubData', 'useProgram', 'enable', 'depthFunc', 'depthMask', 'disable', 'uniformMatrix4fv', 'drawElementsInstanced', 'deleteBuffer', 'deleteVertexArray', 'deleteProgram']) gl[key] = () => {};
  for (const [index, key] of ['VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS', 'VERTEX_ARRAY_BINDING', 'ARRAY_BUFFER_BINDING', 'ARRAY_BUFFER',
    'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW', 'DYNAMIC_DRAW', 'FLOAT', 'DEPTH_TEST', 'LEQUAL', 'BLEND', 'CULL_FACE', 'TRIANGLES', 'UNSIGNED_SHORT'].entries()) gl[key] = index + 1;
  const vehicles = createAnimatedVehicles({triggerRepaint() { repaint = true; }}, 'berlin', {clock: () => now, frameClock});
  const matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const render = () => { repaint = false; vehicles.layer.render(gl, matrix); };
  function advance(ms) {
    const end = now + ms;
    if (repaint) render();
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (timer.at > end) break;
      timers.delete(id); now = timer.at; timer.fn(); if (repaint) render();
    }
    now = end;
  }
  vehicles.setRoads(scenery); vehicles.setEnabled(true); vehicles.layer.onAdd({}, gl); advance(0);
  t.after(() => { vehicles.destroy(); frameClock.destroy(); });
  const positions = () => vehicles.positionSamples.map(sample => ({road: sample.sourceRoadId, candidate: sample.sourceCandidateOrdinal, position: sample.lngLat}));
  return {vehicles, frameClock, gl, advance, render, positions, setLost(value) { lost = value; }, get timerCount() { return timers.size; }};
}

for (const [name, pause, resume] of [
  ['page-hidden or offscreen', vehicles => vehicles.setVisible(false), vehicles => vehicles.setVisible(true)],
  ['disabled', vehicles => vehicles.setEnabled(false), vehicles => vehicles.setEnabled(true)],
  ['reduced-motion', vehicles => vehicles.setReducedMotion(true), vehicles => vehicles.setReducedMotion(false)],
]) test(`${name} pause resumes from retained source-road positions using the single shared clock`, t => {
  const f = fixture(t); f.advance(1000); const before = f.positions(); assert(before.length > 0);
  const fps = f.vehicles.stats.maxAnimationFPS, speeds = f.vehicles.stats.speedRangeMetresPerSecond;
  pause(f.vehicles); assert.equal(f.timerCount, 0); f.advance(10000); assert.equal(f.timerCount, 0);
  resume(f.vehicles); assert.equal(f.frameClock.stats.subscriptions, 1); f.advance(0);
  assert.deepEqual(f.positions(), before, 'background time must not advance the decorative motion phase');
  f.advance(1000); assert.notDeepEqual(f.positions(), before, 'active display time must continue advancing source-road positions');
  assert.equal(f.vehicles.stats.maxAnimationFPS, fps); assert.deepEqual(f.vehicles.stats.speedRangeMetresPerSecond, speeds);
});
test('context/layer pauses freeze the same phase and restore one clock subscription after GPU resources return', t => {
  const f = fixture(t); f.advance(1000); const before = f.positions(); assert(before.length > 0);
  f.setLost(true); f.render(); assert.equal(f.timerCount, 0); f.vehicles.layer.onRemove(); f.advance(10000);
  f.setLost(false); f.vehicles.layer.onAdd({}, f.gl); f.advance(0);
  assert.equal(f.frameClock.stats.subscriptions, 1); assert.deepEqual(f.positions(), before);
  f.advance(1000); assert.notDeepEqual(f.positions(), before);
});
