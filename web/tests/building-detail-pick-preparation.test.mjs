import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const built = await build({entryPoints: [new URL('../src/safety/building-3d-selection.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {installBuilding3dSelection} = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const point = {x: 100, y: 150};
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }
function fixture() {
  // Synthetic, complete SOURCE/footprint data only; no actual incident/location
  // is created or inferred by these renderer-contract tests.
  const footprint = {type: 'Polygon', coordinates: [[[13, 52], [13.001, 52], [13, 52.001], [13, 52]]]};
  let revision = {generation: 1, viewRevision: 1}, ready = true, rays = 0, releases = 0, selections = 0, resolved = 0;
  const hit = () => ({objectId: 'osm/way/1', partId: 'synthetic/component/1', ...revision, hitLngLat: [13.0002, 52.0002], hitAltitudeM: 4, surface: 'wall', distance: 12, opacityContext: 'normal', surfaceOpacity: 1, occludesGround: true});
  const provider = {
    getRevision: () => ({...revision}), isPickReady: () => ready,
    pick: async () => { rays++; return hit(); },
    getComponent: identity => ({...identity, generation: revision.generation, city: 'berlin', componentGeometry: footprint, sourceFeature: {type: 'Feature', id: identity.objectId, geometry: footprint, properties: {name: 'Synthetic building', building: 'yes'}}}),
    setSelection() { selections++; }, clearSelection() {}, suspendSelection() {}, resumeSelection() {},
  };
  const selection = installBuilding3dSelection(provider, 'berlin', () => resolved++);
  return {provider, selection, hit, token: {release() { releases++; }},
    setRevision(next) { revision = next; }, setReady(value) { ready = value; }, ray() { rays++; },
    get rays() { return rays; }, get releases() { return releases; }, get selections() { return selections; }, get resolved() { return resolved; }};
}

test('canonical preparation may change generation before the ray captures its published revision', async () => {
  const f = fixture(); f.setReady(false);
  let preparationSignal;
  f.provider.preparePick = async (actualPoint, signal) => {
    assert.equal(actualPoint, point); preparationSignal = signal;
    f.setRevision({generation: 2, viewRevision: 3}); f.setReady(true); return f.token;
  };
  const result = await f.selection.probe(point);
  assert(result); assert.equal(result.hit.generation, 2); assert.equal(result.hit.viewRevision, 3);
  assert.equal(preparationSignal.aborted, false); assert.equal(f.rays, 1); assert.equal(f.releases, 1);
  assert.equal(f.selection.probeStatus, 'surface'); assert.equal(f.selections, 0, 'preparation/probing cannot select or show a panel');
  assert.deepEqual(f.selection.select(result), result); assert.equal(f.selections, 1); assert.equal(f.resolved, 1);
  f.selection.destroy(); assert.equal(f.releases, 1);
});

test('cancel, suspend and destroy abort the preparation request and release a late demand exactly once without a ray', async () => {
  for (const action of ['cancelPending', 'suspend', 'destroy']) {
    const f = fixture(), gate = deferred(); let preparationSignal;
    f.provider.preparePick = (_point, signal) => { preparationSignal = signal; return gate.promise; };
    const probing = f.selection.probe(point); f.selection[action]();
    assert.equal(preparationSignal.aborted, true, action);
    gate.resolve(f.token); assert.equal(await probing, undefined);
    assert.equal(f.rays, 0); assert.equal(f.releases, 1); assert.equal(f.selections, 0); assert.equal(f.resolved, 0);
    f.selection.destroy(); assert.equal(f.releases, 1);
  }
});

test('a generation change during the actual ray remains stale and still retires its picking demand', async () => {
  const f = fixture(), gate = deferred();
  f.provider.preparePick = async () => { f.setRevision({generation: 2, viewRevision: 1}); return f.token; };
  f.provider.pick = () => { f.ray(); return gate.promise; };
  const probing = f.selection.probe(point); await Promise.resolve();
  assert.equal(f.rays, 1);
  const oldHit = f.hit(); f.setRevision({generation: 3, viewRevision: 1}); gate.resolve(oldHit);
  assert.equal(await probing, undefined); assert.equal(f.selection.probeStatus, 'stale');
  assert.equal(f.releases, 1); assert.equal(f.selections, 0); assert.equal(f.resolved, 0);
  f.selection.destroy();
});

test('a combined UI revision accepts an owning provider hit without forging its generation', async () => {
  const f = fixture(); f.setRevision({generation: 2, viewRevision: 1});
  f.provider.getRevision = () => ({generation: 5, viewRevision: 1}); // Other engine B owns the maximum.
  f.provider.getPickRevision = () => ({generation: 101, viewRevision: 9});
  let ownerCurrent = true, componentGeneration = 2;
  f.provider.isPickGenerationCurrent = hit => ownerCurrent && hit.generation === 2;
  const component = f.provider.getComponent;
  f.provider.getComponent = identity => ({...component(identity), generation: componentGeneration});
  const result = await f.selection.probe(point);
  assert(result); assert.equal(result.hit.generation, 2); assert.equal(result.component.generation, 2);
  assert(f.selection.select(result)); assert.equal(f.selections, 1);
  ownerCurrent = false;
  assert.equal(await f.selection.probe(point), undefined); assert.equal(f.selection.probeStatus, 'invalid');
  ownerCurrent = true; componentGeneration = 5;
  assert.equal(await f.selection.probe(point), undefined); assert.equal(f.selection.probeStatus, 'invalid');
  assert.equal(f.selections, 1, 'neither a stale owner nor the unrelated global maximum can authorize the hit');
  f.selection.destroy();
});

test('a lower provider change invalidates the complete UI snapshot during a ray and before selection', async () => {
  const f = fixture(), gate = deferred(); let uiGeneration = 101;
  f.setRevision({generation: 2, viewRevision: 1});
  f.provider.getRevision = () => ({generation: 5, viewRevision: 1}); // B remains generation 5 throughout.
  f.provider.getPickRevision = () => ({generation: uiGeneration, viewRevision: 9});
  f.provider.isPickGenerationCurrent = hit => hit.generation === f.hit().generation;
  f.provider.pick = () => { f.ray(); return gate.promise; };
  const probing = f.selection.probe(point), oldHit = f.hit();
  f.setRevision({generation: 3, viewRevision: 1}); uiGeneration++;
  gate.resolve(oldHit);
  assert.equal(await probing, undefined); assert.equal(f.selection.probeStatus, 'stale');
  f.provider.pick = async () => { f.ray(); return f.hit(); };
  const result = await f.selection.probe(point); assert(result); assert.equal(result.hit.generation, 3);
  f.setRevision({generation: 4, viewRevision: 1}); uiGeneration++;
  assert.equal(f.selection.select(result), undefined, 'selection rechecks the saved complete UI snapshot');
  assert.equal(f.selections, 0); assert.equal(f.resolved, 0);
  f.selection.destroy();
});
