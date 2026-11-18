import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle = await build({entryPoints: [new URL('../src/safety/base-shop-labels.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {installBaseShopLabels} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=base-shop-labels-under-test.js').toString('base64'));
class Element extends EventTarget {
  constructor(tag) { super(); this.tag = tag; this.children = []; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  remove() {}
}
const shop = (name, coordinates) => ({type: 'Feature', geometry: {type: 'Point', coordinates}, properties: {shop: 'bakery', name}});
function fixture(t) {
  const keys = ['document', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame'], saved = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let serial = 0, moving = false, movementQueries = 0;
  const frames = new Map(), events = new Map(), layers = new Map(), sources = new Map([['basemap-vector', {}]]);
  const loaded = [shop('Blocked by existing POI', [13, 52]), shop('Loaded shop', [13.003, 52.003])], host = new Element('div');
  Object.assign(globalThis, {
    document: {createElement: tag => new Element(tag), createTextNode: text => ({textContent: text})},
    localStorage: {getItem: () => null, setItem() {}},
    requestAnimationFrame: callback => { const id = ++serial; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id),
  });
  const map = {
    getZoom: () => 18, getCanvas: () => ({clientWidth: 800, clientHeight: 600}), isMoving: () => { movementQueries++; return moving; },
    project: coordinates => ({x: 100 + (coordinates[0] - 13) * 100000, y: 100 + (coordinates[1] - 52) * 100000}),
    getSource: id => sources.get(id), addSource: (id, spec) => sources.set(id, {data: spec.data, setData(data) { this.data = data; }}), removeSource: id => sources.delete(id),
    getLayer: id => layers.get(id), addLayer: spec => layers.set(spec.id, spec), removeLayer: id => layers.delete(id), querySourceFeatures: () => loaded,
    on: (name, callback) => events.set(name, callback), off: name => events.delete(name),
  };
  const labels = installBaseShopLabels({map, host, locale: 'en'}), wrapper = host.children[0];
  labels.updateExistingPois({type: 'FeatureCollection', features: [{type: 'Feature', geometry: {type: 'Point', coordinates: [13, 52]}, properties: {}}]});
  labels.setBasemapActive(true);
  const flush = () => { while (frames.size) { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(); } };
  flush();
  t.after(() => { labels.destroy(); for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return {labels, wrapper, flush, sources, loaded, emit: name => events.get(name)(), setMoving: value => { moving = value; }, get movementQueries() { return movementQueries; }};
}

test('3D recovery after an interrupted camera move restores the existing shop-label cohort without requiring a new moveend', t => {
  const f = fixture(t), source = f.sources.get('base-shop-label-source');
  const before = source.data.features; assert.equal(before.length, 1); assert.equal(before[0].properties.name, 'Loaded shop');
  f.setMoving(true); f.emit('movestart'); assert.equal(source.data.features.length, 0);
  f.labels.suspend(); f.setMoving(false); f.labels.resume(); f.flush();
  assert.equal(f.movementQueries, 1); assert.equal(f.wrapper.getAttribute('data-shop-label-state'), 'rendered');
  assert.equal(f.wrapper.getAttribute('data-shop-label-density'), '3');
  assert.deepEqual(source.data.features, before, 'restore the original loaded points, names and POI collision priority');
  assert.deepEqual(f.labels.getLoadedShopRecords().map(record => record.geometry.coordinates), f.loaded.map(record => record.geometry.coordinates), 'the building chooser still receives the original loaded shop points');
});
test('recovery while the camera is actually moving keeps labels hidden until the real moveend', t => {
  const f = fixture(t), source = f.sources.get('base-shop-label-source');
  f.setMoving(true); f.emit('movestart'); f.labels.suspend(); f.labels.resume(); f.flush();
  assert.equal(source.data.features.length, 0); assert.equal(f.wrapper.getAttribute('data-shop-label-state'), 'moving');
  f.setMoving(false); f.emit('moveend'); f.flush();
  assert.equal(source.data.features.length, 1); assert.equal(source.data.features[0].properties.name, 'Loaded shop');
});
