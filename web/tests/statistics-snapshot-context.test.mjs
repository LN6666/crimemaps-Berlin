import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

// Exercise the actual loader, snapshot validation and launcher. Only network,
// layout observers and the unrelated ordinary/macro/handoff panels are replaced.
const safety = new URL('../src/safety/', import.meta.url);
const bundled = await build({stdin: {contents: `
  export * from './statistics-loader';
  export * from './statistics-snapshot-context';
  export {mountContentTagLauncher} from './content-tag-launcher';
  export {CONTENT_TAGS, CONTENT_TAG_CITIES} from './content-tags';
  export {ALL_MACRO_TAGS} from './macro-tags';
  export {CONTENT_TAG_COPY} from './content-tag-copy';`, resolveDir: safety.pathname, loader: 'ts'},
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{name: 'snapshot-test-boundaries', setup(b) {
    b.onResolve({filter: /^\.\/(security|deployment|content-tag-panel|macro-tag-panel|official-gemini-handoff)$/}, args => ({path: args.path, namespace: 'snapshot-fixture'}));
    b.onLoad({filter: /.*/, namespace: 'snapshot-fixture'}, ({path}) => ({contents: ({
      './security': 'export const fetchDataJSON=(...args)=>globalThis.snapshotFetch(...args);',
      './deployment': 'export const assetPath=path=>path;',
      './content-tag-panel': 'export const mountContentTagPanel=()=>({update(){},updateSummary(){},invalidate(){},destroy(){}});',
      './macro-tag-panel': 'export const mountMacroTagPanel=()=>({updateSummary(){},invalidate(){},destroy(){}});',
      './official-gemini-handoff': 'export const mountOfficialGeminiHandoff=()=>({element:document.createElement("div"),refresh(){},destroy(){}});',
    })[path], loader: 'js'}));
  }}]});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const generation = '0123456789abcdef-20261105T000000', priorGeneration = 'fedcba9876543210-20260928T135600';
const mapping = 'a'.repeat(64), overlay = 'b'.repeat(64), ordinaryOverlay = 'e'.repeat(64), dates = 'c'.repeat(64);
const clone = value => structuredClone(value);
function fixture() {
  const records = city => city === 'berlin' ? 1100 : 1;
  const total = api.CONTENT_TAG_CITIES.reduce((sum, city) => sum + records(city), 0);
  const scopes = ['all14', ...api.CONTENT_TAG_CITIES];
  const count = key => key === 'all14' ? total : records(key);
  const counts = n => ({supported: 0, no_support: 0, uncertain: 0, not_evaluated: n});
  const ordinary = {summaries: scopes.map(key => ({version: 'content-tags-v2', key, records: count(key),
    fully_evaluated_records: 0, mapping_sha256: mapping, overlay_sha256: ordinaryOverlay,
    time_scope: 'all_selected_months', text_scope: 'mixed',
    tags: api.CONTENT_TAGS.map(tag => ({tag, counts: counts(count(key))}))}))};
  const macroTags = n => api.ALL_MACRO_TAGS.map(tag => ({tag, counts: counts(n), police_category_stated: 0, narrative_lead: 0}));
  const macro = {summaries: scopes.map(key => ({version: 'macro-social-tags-v1', key, records: count(key),
    fully_evaluated_records: 0, mapping_sha256: mapping, overlay_sha256: overlay,
    time_scope: 'all_selected_months', text_scope: 'mixed', tags: macroTags(count(key))}))};
  const periods = [['ytd2026', '2026-01-01'], ['last7', '2026-09-26'], ['last30', '2026-09-03'], ['last90', '2026-07-05']];
  const windows = {version: 'macro-window-summary-v1', mapping_sha256: mapping, overlay_sha256: overlay,
    publication_dates_sha256: dates, as_of: '2026-10-02', timezone: 'Europe/Berlin',
    date_basis: 'police_announcement_publication', inclusive_calendar_days: true, unknown_dates_excluded: true,
    scopes: scopes.map(key => ({key, total_selected_records: count(key), unknown_publication_dates: 0,
      windows: periods.map(([period, start]) => ({period, start, end: '2026-10-02', records: count(key),
        fully_evaluated_records: 0, records_with_any_evaluation: 0, tags: macroTags(count(key))}))}))};
  const briefs = {version: 'cached-city-briefs-v1', model: 'gemini-3.5-flash-lite', input_sha256: 'd'.repeat(64),
    mapping_sha256: mapping, overlay_sha256: overlay, publication_dates_sha256: dates,
    as_of: '2026-10-02', generated_at: '2026-10-02T22:00:00Z', visitor_model_calls: 0,
    scopes: scopes.map(key => ({key, briefs: periods.map(([period]) => ({period, status: 'awaiting_labels',
      de: 'Gespeicherter unveränderter Beispieltext.', en: 'Unchanged saved synthetic brief.', zh: '保持不变的合成测试简报文字。', referenced_tags: []}))}))};
  const manifest = {schema_version: 1, city: 'berlin', map_generation: priorGeneration, map_announcements: 1100,
    mapping_sha256: mapping, static_reports_checked: true, statistics_refresh_paused: true,
    current_map_binding_accepted: false, cached_reports_remain_bound_to_prior_scientific_checkpoint: true,
    requested_map_generation: generation, previous_map_generation: priorGeneration};
  return {manifest, ordinary, macro, windows, briefs};
}
async function load(f, options, city = 'berlin', gen = generation, count = 1160, signal = new AbortController().signal) {
  const values = {'manifest': f.manifest, 'content-tag-summary': f.ordinary, 'macro-tag-summary': f.macro,
    'window-summary': f.windows, 'cached-briefs': f.briefs};
  globalThis.snapshotFetch = async path => values[path.match(/([^/]+)\.json$/)[1]];
  return api.loadSavedStatistics(city, gen, count, signal, options);
}

test('default stays strict; explicit historical read retains old identity, count, date and all four payloads', async () => {
  const f = fixture();
  await assert.rejects(load(f), /different map snapshot/);
  const snapshot = await load(f, {allowHistoricalSnapshot: true});
  assert.equal(snapshot.binding.map_generation, priorGeneration);
  assert.equal(snapshot.binding.map_announcements, 1100);
  assert.notEqual(snapshot.ordinary[0].overlay_sha256, snapshot.macro[0].overlay_sha256,
    'ordinary and macro layers retain their independent reviewed overlays');
  assert.deepEqual(snapshot.snapshotContext, {kind: 'historical', city: 'berlin', generation: priorGeneration,
    announcements: 1100, mappingSHA256: mapping, asOf: '2026-10-02', allCitiesAnnouncements: 1113,
    currentGeneration: generation, currentAnnouncements: 1160});
  assert.equal(snapshot.ordinary, f.ordinary.summaries); assert.equal(snapshot.briefs, f.briefs);
  const current = fixture(); current.manifest.map_generation = generation; current.manifest.map_announcements = 1100;
  assert.equal((await load(current, undefined, 'berlin', generation, 1100)).snapshotContext.kind, 'current');
});

test('historical opt-in cannot turn an ordinary stale, cross-city or unacknowledged manifest into a snapshot', async () => {
  const changes = {statistics_refresh_paused: false, current_map_binding_accepted: true,
    cached_reports_remain_bound_to_prior_scientific_checkpoint: false, requested_map_generation: priorGeneration,
    previous_map_generation: generation};
  for (const [key, value] of Object.entries(changes)) {
    const f = fixture(); f.manifest[key] = value;
    await assert.rejects(load(f, {allowHistoricalSnapshot: true}), /different map snapshot/);
    delete f.manifest[key];
    await assert.rejects(load(f, {allowHistoricalSnapshot: true}), /different map snapshot/);
  }
  await assert.rejects(load(fixture(), {allowHistoricalSnapshot: true}, 'bremen'), /different map snapshot/);
});

test('historical payloads must agree on saved counts, mapping, publication dates, periods and as-of; abort still rejects', async () => {
  const mutations = [
    f => {f.manifest.map_announcements = 1160;},
    f => {f.ordinary.summaries.find(s => s.key === 'berlin').records = 1160;},
    f => {f.ordinary.summaries.find(s => s.key === 'berlin').overlay_sha256 = 'f'.repeat(64);},
    f => {f.ordinary.summaries.find(s => s.key === 'berlin').overlay_sha256 = 'invalid';},
    f => {for (const source of f.macro.summaries) source.overlay_sha256 = 'f'.repeat(64);},
    f => {f.macro.summaries.find(s => s.key === 'berlin').mapping_sha256 = 'e'.repeat(64);},
    f => {f.windows.mapping_sha256 = f.briefs.mapping_sha256 = 'e'.repeat(64);},
    f => {f.briefs.as_of = '2026-10-06';},
    f => {f.briefs.publication_dates_sha256 = 'e'.repeat(64);},
    f => {f.windows.scopes[0].windows[0].end = '2026-10-06';},
    f => {f.briefs.scopes[0].briefs[1].period = 'ytd2026';},
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    await assert.rejects(load(f, {allowHistoricalSnapshot: true}));
  }
  const abort = new AbortController(); abort.abort();
  await assert.rejects(load(fixture(), {allowHistoricalSnapshot: true}, 'berlin', generation, 1160, abort.signal), {name: 'AbortError'});
});

class Element {
  constructor(tag) {this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.dataset = {};}
  append(...nodes) {for (const node of nodes) {node.parentElement = this; this.children.push(node);}}
  insertBefore(node, before) {this.children.splice(this.children.indexOf(before), 0, node); node.parentElement = this;}
  replaceChildren(...nodes) {this.children = []; this.valueText = ''; this.append(...nodes);}
  set textContent(value) {this.children = []; this.valueText = String(value);}
  get textContent() {return (this.valueText ?? '') + this.children.map(node => node.textContent).join('');}
  setAttribute(key, value) {this.attributes[key] = String(value);}
  removeAttribute(key) {delete this.attributes[key];}
  getAttribute(key) {return this.attributes[key] ?? null;}
  addEventListener(type, listener) {this.listeners[type] = listener;}
  focus() {}
  remove() {if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(node => node !== this);}
  getBoundingClientRect() {return {left: 0, top: 0, right: 1000, bottom: 800, width: 40, height: 40};}
}
const descendants = node => [node, ...node.children.flatMap(descendants)];
test('actual launcher keeps historical disclosure through scope, period and fallback; fresh/unavailable states clear it in all languages', async () => {
  const original = Object.fromEntries(['document', 'window', 'requestAnimationFrame', 'ResizeObserver', 'MutationObserver'].map(key => [key, globalThis[key]]));
  globalThis.document = {createElement: tag => new Element(tag)};
  globalThis.window = {innerWidth: 1000, innerHeight: 800, addEventListener() {}, removeEventListener() {}};
  globalThis.requestAnimationFrame = () => 0;
  globalThis.ResizeObserver = globalThis.MutationObserver = class {observe() {} disconnect() {}};
  try {
    for (const locale of ['de', 'en', 'zh']) {
      const f = fixture(), snapshot = await load(f, {allowHistoricalSnapshot: true}), before = clone(f);
      const launcher = api.mountContentTagLauncher(new Element('body'), {locale, copy: api.CONTENT_TAG_COPY[locale], eagleUrl: '/eagle.png', id: `snapshot-${locale}`});
      const labels = Object.fromEntries(['all14', ...api.CONTENT_TAG_CITIES].map(key => [key, key === 'berlin' ? 'Berlin' : key]));
      launcher.setSummaries(snapshot.ordinary, labels, 'berlin'); launcher.setMacroSummaries(snapshot.macro);
      launcher.setCachedBriefs(snapshot.windows, snapshot.briefs); launcher.setSnapshotContext(snapshot.snapshotContext);
      const nodes = descendants(launcher.element), note = nodes.find(node => node.className === 'content-tag-snapshot');
      const drawer = nodes.find(node => node.className === 'content-tag-drawer');
      assert.equal(note.hidden, false); assert.equal(drawer.getAttribute('aria-describedby'), note.id);
      for (const text of ['2026-10-02', 'Berlin', new Intl.NumberFormat(locale).format(1100), new Intl.NumberFormat(locale).format(1160)]) assert(note.textContent.includes(text));
      for (const privateIdentity of [generation, priorGeneration, mapping]) assert(!note.textContent.includes(privateIdentity));
      const disclosure = note.textContent;
      const scope = nodes.find(node => node.className === 'content-tag-scope').children[0];
      scope.value = 'all14'; scope.listeners.change();
      const brief = nodes.find(node => node.className === 'content-tag-city-brief'), period = descendants(brief).find(node => node.tag === 'select');
      period.value = 'last7'; period.listeners.change();
      launcher.showStatisticsFallback(); assert.equal(note.textContent, disclosure); assert.equal(note.hidden, false);
      assert.deepEqual(f, before, 'read-only UI never rewrites historical counts or prose');
      launcher.setSnapshotContext({...snapshot.snapshotContext, kind: 'current'}); assert.equal(note.hidden, true);
      launcher.setSnapshotContext(snapshot.snapshotContext);
      assert.throws(() => launcher.setSummaries([], labels, 'berlin')); assert.equal(note.hidden, true);
      assert.equal(drawer.getAttribute('aria-describedby'), null);
      launcher.destroy();
    }
  } finally {
    for (const [key, value] of Object.entries(original)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    delete globalThis.snapshotFetch;
  }
});
