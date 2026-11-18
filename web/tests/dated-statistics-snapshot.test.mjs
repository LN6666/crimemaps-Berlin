import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: `
  export * from './dated-statistics-snapshot';
  export * from './dated-tag-statistics';
  export {CONTENT_TAGS, CONTENT_TAG_CITIES} from './content-tags';
  export {ALL_MACRO_TAGS} from './macro-tags';`,
  resolveDir: new URL('../src/safety/', import.meta.url).pathname, loader: 'ts'},
  bundle: true, platform: 'node', format: 'esm', write: false});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const generation = '0123456789abcdef-20261105T000000';
const hashes = Object.fromEntries(api.DATED_TAG_SOURCE_VERSION_KEYS.map((key, i) => [key, String(i + 1).repeat(64)]));
const current = {city: 'berlin', generation, records: 1160};
const clone = value => structuredClone(value);
function fixture() {
  // Synthetic per-city vectors: only the saved Berlin and all-city denominators
  // resemble the real checkpoint. No actual city tag findings are fabricated.
  const records = city => city === 'berlin' ? 1140 : city === 'stuttgart' ? 796 : 600;
  const ordinary = n => api.CONTENT_TAGS.map(tag => ({tag,
    counts: {supported: 0, no_support: 0, uncertain: 0, not_evaluated: n}, content_index: n ? 0 : null,
    documented_share: {numerator: 0, denominator: n, value: n ? 0 : null}}));
  const macro = n => api.ALL_MACRO_TAGS.map(tag => ({tag,
    counts: {supported: 0, no_support: 0, uncertain: 0, not_evaluated: n}, content_index: n ? 0 : null,
    police_category_stated: 0, narrative_lead: 0, share: n ? 0 : null}));
  const catalogue = {schema: 'current14-dated-tag-statistics-v1', source_versions: {...hashes},
    as_of: '2026-10-06', timezone: 'Europe/Berlin', date_basis: 'official police announcement publication day',
    inclusive_calendar_days: true,
    unknown_publication_dates_excluded_from_dated_windows_but_retained_in_all_selected_denominators: true,
    layers: {ordinary_dimensions: 20, macro_dimensions: 12, total_tag_dimensions: 32},
    scopes: ['all14', ...api.CONTENT_TAG_CITIES].map(key => ({key,
      total_selected_records: key === 'all14' ? 9136 : records(key), unknown_publication_dates: 0,
      windows: [['ytd2026', '2026-01-01'], ['last7', '2026-09-30'], ['last30', '2026-09-07'], ['last90', '2026-07-09']]
        .map(([period, start]) => {
          const n = period === 'ytd2026' ? key === 'all14' ? 9136 : records(key) : 0;
          return {period, start, end: '2026-10-06', records: n, fully_evaluated_records: 0, records_with_any_evaluation: 0,
            ordinary: {records: n, tags: ordinary(n)}, macro: {records: n, tags: macro(n)}};
        })}))};
  const binding = {...current, source_versions: {...hashes},
    historical_snapshot: {as_of: '2026-10-06', selected_records: 1140, all_selected_records: 9136}};
  return {catalogue, binding};
}
const bind = (f, options = {allowHistoricalSnapshot: true}, map = current) =>
  api.bindDatedStatisticsSnapshot(f.catalogue, f.binding, map, options);

test('default current binding stays strict; only explicit historical display preserves 1140/9136 beside current 1160', () => {
  const f = fixture(), before = clone(f);
  assert.throws(() => bind(f, {}), /historical snapshot declaration/);
  const noDeclaration = clone(f); delete noDeclaration.binding.historical_snapshot;
  assert.throws(() => bind(noDeclaration, {}), /historical snapshot declaration/);
  assert.throws(() => bind(noDeclaration), /historical snapshot declaration/);
  const context = bind(f);
  assert.deepEqual(context, {kind: 'historical', city: 'berlin', asOf: '2026-10-06', selectedRecords: 1140,
    allSelectedRecords: 9136, currentRecords: 1160, currentGeneration: generation, sourceVersions: hashes});
  assert(Object.isFrozen(context)); assert(Object.isFrozen(context.sourceVersions));
  assert.deepEqual(f, before, 'the display binding cannot rewrite saved vectors or date');
  noDeclaration.binding.records = 1140;
  assert.equal(bind(noDeclaration, {}, {...current, records: 1140}).kind, 'current');
});

test('cross-city/generation/current guard, false new denominator, missing declarations and wrong dates fail closed', () => {
  for (const mutate of [
    f => {f.binding.city = 'bremen';},
    f => {f.binding.generation = 'fedcba9876543210-20261006T000000';},
    f => {f.binding.records = 1140;},
    f => {f.binding.historical_snapshot.selected_records = 1160;},
    f => {f.binding.historical_snapshot.all_selected_records = 9156;},
    f => {f.binding.historical_snapshot.as_of = '2026-10-02';},
    f => {delete f.binding.historical_snapshot.all_selected_records;},
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => bind(f));
  }
  assert.throws(() => bind(fixture(), {allowHistoricalSnapshot: 'true'}));
  assert.throws(() => bind(fixture(), {allowHistoricalSnapshot: true}, {...current, city: 'bremen'}));
  const aggregateAsCity = fixture(); aggregateAsCity.binding.city = 'all14'; aggregateAsCity.binding.records = 9136;
  assert.throws(() => bind(aggregateAsCity, {allowHistoricalSnapshot: true}, {...current, city: 'all14', records: 9136}));
});

test('the actual dated validator still binds all five source hashes, window/date formulas and city/total counts', () => {
  for (const key of api.DATED_TAG_SOURCE_VERSION_KEYS) {
    const wrong = fixture(); wrong.binding.source_versions[key] = 'a'.repeat(64);
    assert.throws(() => bind(wrong), /dated|catalogue/);
    const missing = fixture(); delete missing.binding.source_versions[key]; delete missing.catalogue.source_versions[key];
    assert.throws(() => bind(missing), /source binding/);
  }
  for (const mutate of [
    f => {f.catalogue.scopes[0].total_selected_records = 9156;},
    f => {f.catalogue.scopes[0].windows[0].end = '2026-10-07';},
    f => {f.catalogue.scopes[0].windows[0].ordinary.tags[0].documented_share.denominator = 9156;},
    f => {f.catalogue.as_of = '2026-10-07'; f.binding.historical_snapshot.as_of = '2026-10-07';},
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => bind(f));
  }
});

class Element {
  constructor(tag) {this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {};}
  append(...nodes) {for (const node of nodes) {node.parentElement = this; this.children.push(node);}}
  replaceChildren(...nodes) {this.children = []; this.valueText = ''; this.append(...nodes);}
  set textContent(value) {this.children = []; this.valueText = String(value);}
  get textContent() {return (this.valueText ?? '') + this.children.map(node => node.textContent).join('');}
  set value(value) {this.valueStored = String(value);}
  get value() {return this.valueStored ?? (this.tag === 'select' ? this.children[0]?.value ?? '' : '');}
  setAttribute(key, value) {this.attributes[key] = String(value);}
  addEventListener(type, listener) {this.listeners[type] = listener;}
  querySelectorAll(selector) {return this.children.flatMap(descendants).filter(node => selector.startsWith('.') && node.className?.split(' ').includes(selector.slice(1)));}
  remove() {if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this);}
}
const descendants = node => [node, ...node.children.flatMap(descendants)];
test('actual panel retains three-language historical date/range through scope/period changes and clears on reload/failure', () => {
  const originalDocument = globalThis.document;
  globalThis.document = {createElement: tag => new Element(tag)};
  try {
    for (const locale of ['de', 'en', 'zh']) {
      const f = fixture(), context = bind(f), before = clone(f.catalogue), parent = new Element('body');
      const panel = api.mountDatedTagStatistics(parent, {locale});
      assert.throws(() => panel.setSnapshotContext(context), /differs/);
      assert.equal(panel.setCatalogue(f.catalogue, hashes), true); panel.setScope('berlin'); panel.setSnapshotContext(context);
      const root = parent.children[0], note = descendants(root).find(node => node.className === 'dated-statistics-snapshot');
      assert.equal(note.hidden, false);
      for (const text of ['2026-10-06', ...[1140, 1160, 9136].map(n => new Intl.NumberFormat(locale).format(n))]) assert(note.textContent.includes(text));
      for (const privateValue of [generation, ...Object.values(hashes)]) assert(!note.textContent.includes(privateValue));
      const savedNote = note.textContent;
      panel.setScope('all14');
      const selects = descendants(root).filter(node => node.tag === 'select'), period = selects[1];
      period.value = 'last7'; period.listeners.change();
      assert.equal(note.textContent, savedNote); assert.equal(note.hidden, false);
      assert.deepEqual(f.catalogue, before, 'historical display leaves every vector and period unchanged');
      assert.throws(() => panel.setSnapshotContext({...context, asOf: '2026-10-02'}), /differs/);
      assert.equal(note.hidden, true);
      panel.setSnapshotContext(context); panel.setSnapshotContext(null); assert.equal(note.hidden, true);
      panel.setSnapshotContext(context); assert.equal(panel.setCatalogue(f.catalogue, hashes), true); assert.equal(note.hidden, true);
      panel.setSnapshotContext(context);
      const bad = clone(f.catalogue); bad.scopes[0].total_selected_records++;
      assert.equal(panel.setCatalogue(bad, hashes), false); assert.equal(note.hidden, true);
      panel.setCatalogue(f.catalogue, hashes); panel.setSnapshotContext(context); panel.invalidate(); assert.equal(note.hidden, true);
      panel.destroy();
    }
  } finally {
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
});
