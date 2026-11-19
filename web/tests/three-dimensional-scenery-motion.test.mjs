import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const built = await build({entryPoints: [new URL('../src/safety/three-dimensional-scenery.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{name: 'scenery-motion-vehicle-fixture', setup(build) {
  build.onResolve({filter: /^\.\/animated-vehicles$/}, () => ({path: 'vehicles', namespace: 'scenery-motion'}));
  build.onLoad({filter: /.*/, namespace: 'scenery-motion'}, () => ({contents: 'export const createAnimatedVehicles=(...args)=>globalThis.__sceneryMotionVehicleFactory(...args);', loader: 'js'}));
}}]});
const {installThreeDimensionalScenery} = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

// Reuse the runtime-performance scenery fixture's bounded read/timer/layer model.
// Vehicle drawing is replaced; map-motion callbacks and actual scenery logic
// execute without a GPU, real animation timer or public source-data mutation.
function fixture(t, holdFirstRoadRead = false, tiles = false) {
  const keys = ['document', 'setTimeout', 'clearTimeout', '__sceneryMotionVehicleFactory'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const timers = new Map(), events = new Map(), layers = new Map(), reads = [], commits = [];
  let timerId = 0, enabled = false, roadReads = 0, finishFirstRoadRead,currentBounds=[12,51,14,53];
  const roadGate = new Promise(resolve => { finishFirstRoadRead = resolve; });
  globalThis.document = {hidden: false, createElement: () => ({setAttribute() {}, remove() {}})};
  globalThis.setTimeout = (fn, delay) => { timers.set(++timerId, {fn, delay}); return timerId; };
  globalThis.clearTimeout = id => timers.delete(id);
  globalThis.__sceneryMotionVehicleFactory = () => ({
    layer: {id: 'synthetic-cars'}, setEnabled(value) { enabled = value; }, setVisible() {}, setReducedMotion() {}, setZoom() {}, setFrameLoad() {},
    setRoads(value) { commits.push(value); }, setValidatedRoads(roads) { commits.push({roads}); }, positionSamples: [], stats: {allocatedVehicles: 1}, destroy() {},
  });
  t.after(() => { for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; } });
  const index = {schema_version: 1, city: 'berlin', role: 'decorative-schematic', partial: true, snapshot: 'synthetic', source_pbf_sha256: 'a'.repeat(64), data: {path: '/safety/buildings3d/roads.json', bytes: 100, sha256: 'b'.repeat(64)}};
  const roads = {schema_version: 1, city: 'berlin', source_snapshot: 'synthetic', source_pbf_sha256: 'a'.repeat(64), source_url: 'https://www.openstreetmap.org', city_boundary_sha256: 'b'.repeat(64), role: 'decorative-schematic', partial: true, roads: [{id: 'osm/way/1/clip/0', source_way_id: 1, coordinates: [[13, 52], [13.002, 52.002]], direction: 1, source_tags: {highway: 'residential'}, source_url: 'https://www.openstreetmap.org/way/1'}]};
  const asset = (name, hex) => ({path:'/safety/buildings3d/'+name+'.json', bytes:100, sha256:hex.repeat(64)});
  const west = {bbox:[12,51,14,53], data:asset('west','c')};
  const east = {bbox:[16,51,18,53], data:asset('east','d')};
  const header = {schema_version:2, city:index.city, role:index.role, snapshot:index.snapshot,
    source_pbf_sha256:index.source_pbf_sha256, city_boundary_sha256:roads.city_boundary_sha256};
  const group = {...east,data:asset('east-index','e')};
  const westGroup = {...west,data:asset('west-index','f')};
  const tileFiles = new Map([
    [westGroup.data.path,{...header,tiles:[west]}], [group.data.path,{...header,tiles:[east]}], [west.data.path,roads],
    [east.data.path,{...roads,roads:[{...roads.roads[0],id:'osm/way/2/clip/0',source_way_id:2,
      source_url:'https://www.openstreetmap.org/way/2',coordinates:[[17,52],[17.002,52.002]]}]}]
  ]);
  const map = {on: (type, listener) => events.set(type, listener), off: type => events.delete(type), getZoom: () => 18, getBounds: () => ({getWest: () => currentBounds[0], getSouth: () => currentBounds[1], getEast: () => currentBounds[2], getNorth: () => currentBounds[3]}), getLayer: id => layers.get(id), addLayer: layer => layers.set(layer.id, layer), removeLayer: id => layers.delete(id)};
  const scenery = installThreeDimensionalScenery({map, city: 'berlin', locale: 'en', host: {append() {}}, buildingLayer: () => undefined,
    read: async (asset, signal) => { reads.push({asset, signal}); if(tiles)return typeof asset==='string'?{...header,partitions:[westGroup,group]}:tileFiles.get(asset.path); if (typeof asset === 'string') return index; if (++roadReads === 1 && holdFirstRoadRead) await roadGate; return roads; },
  });
  t.after(() => scenery.destroy());
  return {scenery, events, reads, commits, timers, get enabled() { return enabled; }, finishFirstRoadRead,setBounds(value){currentBounds=value;},
    runSettled() { assert.equal(timers.size, 1); const [id, timer] = [...timers][0]; assert.equal(timer.delay, 100); timers.delete(id); timer.fn(); },
    async ready() { for (let count = 0; count < 10 && scenery.stats.state !== 'ready'; count++) await tick(); assert.equal(scenery.stats.state, 'ready'); },
  };
}

test('native camera motion blocks toggle/resume refreshes and cancelled reads until one settled refresh', async t => {
  const f = fixture(t, true); f.scenery.setMode(true);
  for (let count = 0; count < 10 && f.reads.length < 2; count++) await tick();
  assert.equal(f.reads.length, 2);
  f.events.get('movestart')();
  assert.equal(f.reads[1].signal.aborted, true);
  f.scenery.setRequested(true); f.scenery.resume(); f.scenery.setVisible(true); await tick();
  assert.equal(f.reads.length, 2, 'moving cannot start another road read through control callbacks');
  f.finishFirstRoadRead(); await tick(); assert.equal(f.commits.length, 0, 'the superseded read cannot publish roads');
  f.events.get('moveend')();
  f.scenery.setRequested(true); f.scenery.resume(); f.scenery.setVisible(true); await tick();
  assert.equal(f.reads.length, 2, 'callbacks also retain the existing 100ms settle boundary');
  f.runSettled(); await f.ready();
  assert.equal(f.reads.length, 4, 'one replacement index/road read');
  assert.equal(f.commits.length, 1); assert.equal(f.timers.size, 0);
});

test('external gesture and native motion wait for each other without stopping warm vehicles', async t => {
  const f = fixture(t); f.scenery.setMode(true); await f.ready();
  assert.equal(f.commits.length, 1); assert.equal(f.enabled, true);
  f.scenery.setGestureActive(true); f.events.get('movestart')();
  f.scenery.setGestureActive(false); f.scenery.setRequested(true); await tick();
  assert.equal(f.timers.size, 0); assert.equal(f.commits.length, 1, 'ending the external flag cannot bypass native movement');
  f.scenery.setGestureActive(true); f.events.get('moveend')();
  assert.equal(f.timers.size, 0, 'native moveend still waits for the external gesture');
  assert.equal(f.enabled, true, 'retained vehicles continue along their existing roads');
  f.scenery.setGestureActive(false); f.scenery.setGestureActive(false);
  assert.equal(f.commits.length, 1); f.runSettled(); await f.ready();
  assert.equal(f.commits.length, 1,'the unchanged settled view keeps the original road/cohort commit'); assert.equal(f.reads.length, 2, 'the settled refresh reuses warm source roads');
  assert.equal(f.timers.size, 0);
});

test('unchanged scenery setters and warm resumes retain one road commit; a new view still commits',async t=>{
 const f=fixture(t);f.scenery.setMode(true);await f.ready();assert.equal(f.commits.length,1);
 f.scenery.setRequested(true);f.scenery.setVisible(true);f.scenery.setReducedMotion(false);f.scenery.resume();await tick();assert.equal(f.commits.length,1);
 for(const [pause,resume] of [[()=>f.scenery.setVisible(false),()=>f.scenery.setVisible(true)],[()=>f.scenery.setViewportVisible(false),()=>f.scenery.setViewportVisible(true)],[()=>f.scenery.setReducedMotion(true),()=>f.scenery.setReducedMotion(false)],[()=>f.scenery.suspend(),()=>f.scenery.resume()]]){
  pause();assert.equal(f.enabled,false);resume();await f.ready();assert.equal(f.enabled,true);assert.equal(f.commits.length,1,'warm pause does not reset the original view/cohort');
 }
 f.setBounds([12.1,51.1,14.1,53.1]);f.events.get('moveend')();f.runSettled();await f.ready();assert.equal(f.commits.length,2);assert.equal(f.reads.length,2);
 f.scenery.setMode(false);f.scenery.setMode(true);await f.ready();assert.equal(f.commits.length,3);assert.equal(f.reads.length,4,'explicit 2D releases the source/vehicle binding');
});


test('citywide traffic follows a pan to another partition and releases out-of-view tiles', async t => {
  const f=fixture(t,false,true);
  f.scenery.setMode(true); await f.ready();
  assert.deepEqual(f.commits.at(-1).roads.map(r=>r.source_way_id),[1]);
  assert.equal(f.scenery.stats.resources.viewportTiles,1);
  assert.equal(f.reads.filter(r=>typeof r.asset!=='string').length,2);
  f.events.get('movestart')();f.setBounds([16,51,18,53]);f.events.get('moveend')();
  f.runSettled();await f.ready();
  assert.deepEqual(f.commits.at(-1).roads.map(r=>r.source_way_id),[2]);
  assert.equal(f.scenery.stats.resources.viewportTiles,1);
  f.events.get('movestart')();f.setBounds([20,51,21,53]);f.events.get('moveend')();
  f.runSettled();await f.ready();
  assert.deepEqual(f.commits.at(-1).roads,[]);
  assert.equal(f.scenery.stats.resources.viewportTiles,0);
  assert.equal(f.scenery.stats.resources.sourceRetainedEstimateBytes,0);
});
