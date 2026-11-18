import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const compiled = await build({entryPoints: [new URL('../src/safety/uncertainty-panel.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {mountUncertaintyPanel} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text + '\n//# sourceURL=uncertainty-pagination-under-test.js').toString('base64'));
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.replacements = 0; }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  append(...nodes) { for (const node of nodes) { node.remove(); this.children.push(node); node.parentElement = this; } }
  remove() {
    if (!this.parentElement) return;
    if (this.contains(document.activeElement)) document.activeElement = document.body;
    const parent = this.parentElement;
    parent.children.splice(parent.children.indexOf(this), 1); this.parentElement = undefined;
  }
  replaceChildren(...nodes) { this.replacements++; for (const node of [...this.children]) node.remove(); this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  get value() { return this._value ?? this.children.find(child => child.tag === 'option')?.value ?? ''; }
  set value(value) { this._value = value; }
  get disabled() { return this._disabled || false; }
  set disabled(value) { this._disabled = value; if (value && document.activeElement === this) document.activeElement = document.body; }
  focus(options) { if (!this.disabled) { document.activeElement = this; this.focusOptions = options; } }
}
function fixture(t) {
  const keys = ['document', 'Option'], previousGlobals = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const body = new Element('body'), host = new Element('div'), other = new Element('button'); body.append(host, other);
  class TestOption extends Element { constructor(text, value) { super('option'); this.textContent = text; this.value = value; } }
  Object.assign(globalThis, {document: {body, activeElement: body, createElement: tag => new Element(tag)}, Option: TestOption});
  const panel = mountUncertaintyPanel(host, {locale: 'zh', city: 'berlin', onSelect() {}}), section = host.children[0];
  const list = section.children.find(node => node.className === 'uncertainty-list');
  const nav = section.children.find(node => node.className === 'uncertainty-pagination');
  const filter = section.children.find(node => node.className === 'uncertainty-filter-label').children[0];
  t.after(() => { panel.destroy(); for (const [key, descriptor] of previousGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return {panel, list, filter, previous: nav.children[0], status: nav.children[1], next: nav.children[2], other};
}
const events = count => Array.from({length: count}, (_, index) => ({
  id: `test-${index}`, title: `Test ${index}`, category: 'test', month: '2026-10', published_at: '2026-10-01T12:00:00+02:00',
  coordinates: null, location_precision: 'unknown', location_label: '', source_url: `https://example.test/source/${index}`,
  scene_locations: [{label: 'Unspecified test scene', role: 'incident', location_precision: 'unknown', geocode_method: 'unresolved', primary_for_count: false, geometry_review: {verdict: 'unresolved'}}],
}));

test('Next reaching the last page moves focus to the newly available Previous before disabling itself', t => {
  const f = fixture(t); f.panel.update(events(21)); assert.equal(f.list.children.length, 20); assert.equal(f.previous.disabled, true);
  f.next.focus(); f.next.onclick();
  assert.equal(f.list.children.length, 1); assert.equal(f.next.disabled, true); assert.equal(f.previous.disabled, false);
  assert(document.activeElement === f.previous); assert.deepEqual(f.previous.focusOptions, {preventScroll: true});
  assert.equal(f.status.textContent, '第2页，共2页');
  assert.equal(f.status.getAttribute('role'), 'status'); assert.equal(f.status.getAttribute('aria-live'), 'polite'); assert.equal(f.status.getAttribute('aria-atomic'), 'true');
});
test('Previous reaching the first page moves focus to the newly available Next', t => {
  const f = fixture(t); f.panel.update(events(21)); f.next.onclick(); f.previous.focus(); f.previous.onclick();
  assert.equal(f.list.children.length, 20); assert.equal(f.previous.disabled, true); assert.equal(f.next.disabled, false);
  assert(document.activeElement === f.next); assert.deepEqual(f.next.focusOptions, {preventScroll: true}); assert.equal(f.status.textContent, '第1页，共2页');
});
test('a focused pagination button falls back to this panel filter when a replacement has only one page', t => {
  const f = fixture(t); f.panel.update(events(21)); f.next.focus(); f.panel.update(events(1));
  assert.equal(f.previous.disabled, true); assert.equal(f.next.disabled, true);
  assert(document.activeElement === f.filter); assert.deepEqual(f.filter.focusOptions, {preventScroll: true}); assert.equal(f.status.textContent, '第1页，共1页');
});
test('ordinary filtering keeps its own focus while resetting the page', t => {
  const f = fixture(t); f.panel.update(events(21)); f.next.onclick(); f.filter.value = 'street'; f.filter.focus(); f.filter.onchange();
  assert(document.activeElement === f.filter); assert.equal(f.filter.focusOptions, undefined);
  assert.equal(f.previous.disabled, true); assert.equal(f.next.disabled, true); assert.equal(f.status.textContent, '第1页，共1页');
});
test('pagination and data replacement never move focus from an external control', t => {
  const f = fixture(t); f.panel.update(events(21)); f.other.focus(); f.next.onclick();
  assert(document.activeElement === f.other); f.panel.update(events(1)); assert(document.activeElement === f.other);
});
test('unchanged row signatures preserve the current page, live row nodes and focused report action', t => {
  const f = fixture(t), input = events(21); f.panel.update(input); f.next.onclick();
  const row = f.list.children[0], actions = row.children.find(node => node.className === 'uncertainty-actions'), action = actions.children.find(node => node.tag === 'button');
  const replacements = f.list.replacements; action.focus(); f.panel.update(events(21));
  assert(f.list.children[0] === row); assert(document.activeElement === action); assert.equal(f.list.replacements, replacements); assert.equal(f.status.textContent, '第2页，共2页');
});
