import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import ts from 'typescript';

// Reuse only the existing self-contained GL state fake, not its test module or
// assertions. The real renderer, motion owner and page budget run in this suite.
const fixtureSource = await readFile(new URL('./environment-visual-renderer.test.mjs', import.meta.url), 'utf8');
const ast = ts.createSourceFile('existing-gl-fixture.mjs', fixtureSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fakeGL');
assert(declaration, 'reuse the actual existing GL state fixture');
const fakeGL = Function(`${declaration.getText(ast)};return fakeGL;`)();
const built = await build({stdin: {contents: `
  export {createEnvironmentSceneRenderer} from './environment-scene-renderer';
  export {prepareSolarShadowBoundary} from './solar-shadow-admission';
  export {createResourceBudget} from './render-runtime/resource-budget';
  export {createChunkResourceStore} from './render-runtime/chunk-resource-store';`,
  resolveDir: new URL('../src/safety/', import.meta.url).pathname, loader: 'ts'},
  bundle: true, write: false, platform: 'node', format: 'esm', target: 'es2022', preserveSymlinks: true});
const m = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const origin = [13.4, 52.5], bounds = [13.3, 52.4, 13.5, 52.6], boundarySHA = 'd'.repeat(64);
const square = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
m.prepareSolarShadowBoundary({boundarySHA256: boundarySHA,
  geometry: {type: 'Polygon', coordinates: [square(...bounds)]}});
const properties = {source_boundary_sha256: boundarySHA, source_pbf_sha256: 'e'.repeat(64),
  source_snapshot: 'synthetic phase fixture', displayClip: false, osmTags: {height: '12'}, tree_crown_display_5m_guard: true};
const tree = {type: 'Feature', id: 'synthetic/tree', geometry: {type: 'Point', coordinates: origin},
  properties: {...properties, kind: 'tree'}};
const water = {type: 'Feature', id: 'synthetic/water', geometry: {type: 'Polygon',
  coordinates: [square(13.4001, 52.5001, 13.4005, 52.5005)]}, properties: {...properties, kind: 'water'}};
const ground = {...water, id: 'synthetic/ground', properties: {...properties, kind: 'green'}};
const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function fixture() {
  const budget = m.createResourceBudget({limitBytes: 64 * 1024 * 1024, recentLimitBytes: 8 * 1024 * 1024});
  const store = m.createChunkResourceStore({budget}); let wakes = 0;
  const r = m.createEnvironmentSceneRenderer({triggerRepaint() {}}, {origin, resourceStore: store,
    onFrameNeeded() {wakes++;}}), gl = fakeGL();
  r.layer.onAdd({}, gl);
  r.setSceneEnvironment({instantISO: '2026-06-21T12:00:00+02:00', sunlight: true, shadows: false, motion: true, quality: 'economy'});
  r.setFeatures([tree, water], bounds, new Set([water])); r.setEnabled(true);
  return {r, gl, store, get wakes() {return wakes;}, close() {r.destroy(); store.destroy();}};
}
const seconds = r => r.stats.animation.elapsedSeconds;
test('empty/ground-only publications freeze the same phase and full re-publication wakes the shared frame owner', () => {
  const f = fixture(), {r, gl} = f;
  try {
    r.animationFrame(0); r.animationFrame(100); const phase = seconds(r);
    assert.equal(phase, .1);
    for (const [features, detail, restart] of [[[], 'full', 10000], [[ground], 'ground', 20000]]) {
      r.setFeatures(features, bounds, undefined, undefined, detail);
      assert.equal(r.stats.animationActive, false); assert.equal(r.stats.animation.active, false);
      const paused = seconds(r), wakes = f.wakes;
      // The shared clock legitimately makes no frame calls during this interval.
      r.setFeatures([tree, water], bounds, new Set([water]));
      r.setEnabled(true); // Real manager repeats this value after publication.
      assert(f.wakes > wakes, 'publication wakes the existing clock once it becomes drawable');
      assert.equal(r.stats.animationActive, true);
      r.animationFrame(restart); assert.equal(seconds(r), paused, 'first resumed frame excludes the empty interval');
      r.layer.render(gl, identity); assert.equal(gl.uniforms.get('u_environment_time'), paused);
      r.animationFrame(restart + 100); assert(Math.abs(seconds(r) - paused - .1) < 1e-12);
    }
    assert.equal(r.stats.noNewTimer, true);
  } finally {f.close();}
});

test('GPU loss/removal preserves elapsed phase and allocation restore wakes and resumes without offline time', () => {
  const f = fixture(), {r, gl} = f;
  try {
    r.animationFrame(0); r.animationFrame(100);
    const phase = seconds(r), evidence = r.waterAdmissionEvidence;
    let lost = true; gl.isContextLost = () => lost;
    r.layer.render(gl, identity); assert.equal(r.stats.animation.active, false);
    r.animationFrame(10000); assert.equal(seconds(r), phase);
    r.layer.onRemove(); assert.equal(r.stats.animationActive, false);
    const restored = fakeGL(), wakes = f.wakes;
    r.layer.onAdd({}, restored);
    assert(f.wakes > wakes, 'successful allocation wakes the same subscribed owner after GPU recovery');
    assert.equal(r.stats.animationActive, true);
    r.animationFrame(20000); assert.equal(seconds(r), phase);
    r.layer.render(restored, identity); assert.equal(restored.uniforms.get('u_environment_time'), phase);
    assert.deepEqual(r.waterAdmissionEvidence, evidence, 'context recovery never reauthors source water geometry');
    r.animationFrame(20100); assert(Math.abs(seconds(r) - phase - .1) < 1e-12);
    assert.equal(r.stats.noNewTimer, true);
    lost = false;
  } finally {f.close();}
});
