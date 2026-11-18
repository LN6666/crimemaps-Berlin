import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const result = await build({entryPoints: [new URL('../src/safety/electoral-controls.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {electoralControls} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

// Model focus acceptance and the loss of focus when a control is hidden. Native
// keyboard activation and accessibility-tree announcements still need a browser.
class Element {
  constructor(doc, tag) { this.ownerDocument = doc; this.tag = tag; this.children = []; this.attributes = {}; this.disabled = false; this.checked = false; this._hidden = false; }
  get isConnected() { return this.tag === 'body' || Boolean(this.parentElement?.isConnected); }
  get hidden() { return this._hidden; }
  set hidden(value) { this._hidden = value; if (value && this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body; }
  get value() { return this.tag === 'select' ? (this._value === undefined ? this.children[0]?.value ?? '' : this.children.some(child => child.value === this._value) ? this._value : '') : this._value ?? ''; }
  set value(value) { this._value = String(value); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const node of this.children) node.parentElement = null; this.children = []; if (this.tag === 'select') this._value = undefined; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  set tabIndex(value) { this.attributes.tabindex = String(value); }
  focus(options) {
    if (!this.isConnected || this.disabled || !(['input', 'select', 'button'].includes(this.tag) || 'tabindex' in this.attributes)) return;
    for (let node = this; node; node = node.parentElement) if (node.hidden) return;
    this.ownerDocument.activeElement = this; this.focusOptions = options;
  }
  remove() { if (this.parentElement) { this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; } }
}
const choices = [
  {id: 'federal-2025', type: 'federal', year: 2025, label: {en: 'Federal 2025', de: 'Bund 2025', zh: '联邦2025'}},
  {id: 'state-2026', type: 'state', year: 2026, label: {en: 'State 2026', de: 'Land 2026', zh: '州2026'}},
];
function fixture(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const doc = {activeElement: null, createElement(tag) { return new Element(doc, tag); }, createTextNode(text) { const node = new Element(doc, '#text'); node.textContent = text; return node; }};
  doc.body = doc.createElement('body'); doc.activeElement = doc.body;
  globalThis.document = doc;
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const changes = []; let retries = 0;
  const controls = electoralControls(doc.body, 'en', (...args) => changes.push(args), () => retries++);
  const section = doc.body.children[0];
  const [toggle, type, instance] = [1, 2, 3].map(index => section.children[index].children.find(node => node.tag !== '#text'));
  const overlays = section.children[4], status = section.children[5], retry = section.children.at(-1);
  const outside = doc.createElement('button'); doc.body.append(outside);
  return {doc, controls, section, toggle, type, instance, overlays, status, retry, outside, changes, get retries() { return retries; }};
}

for (const operation of ['click', 'loading', 'setChoices']) test(`${operation} keeps focus in the election controls when hiding a focused retry`, t => {
  const f = fixture(t); f.controls.setChoices(choices); f.controls.failed(); f.retry.focus();
  if (operation === 'click') f.retry.onclick(); else if (operation === 'loading') f.controls.loading(); else f.controls.setChoices(choices);
  assert.equal(f.retry.hidden, true);
  assert.equal(f.doc.activeElement === f.toggle, true, 'an available election toggle receives the displaced focus');
  assert.deepEqual(f.toggle.focusOptions, {preventScroll: true});
  assert.equal(f.retries, operation === 'click' ? 1 : 0);
  assert.equal(f.changes.length, 0);
});

test('loading without choices uses a focusable local status rather than a disabled toggle', t => {
  const f = fixture(t); f.controls.failed(); f.retry.focus(); f.controls.loading();
  assert.equal(f.toggle.disabled, true);
  assert.equal(f.doc.activeElement === f.status, true);
  assert.deepEqual(f.status.focusOptions, {preventScroll: true});
});

test('newly loaded choices make the toggle available before restoring retry focus', t => {
  const f = fixture(t); f.controls.failed(); f.retry.focus(); f.controls.setChoices(choices);
  assert.equal(f.toggle.disabled, false);
  assert.equal(f.doc.activeElement === f.toggle, true);
});

test('background loading and choices updates do not steal focus from another control', t => {
  const f = fixture(t); f.controls.setChoices(choices); f.controls.failed(); f.outside.focus();
  f.controls.loading(); f.controls.setChoices(choices);
  assert.equal(f.doc.activeElement, f.outside);
  assert.equal(f.changes.length, 0);
});

test('destroy clears handlers and makes already captured callbacks inert', t => {
  const f = fixture(t); f.controls.setChoices(choices); f.controls.failed();
  const overlay = f.overlays.children[2].children[0];
  const oldCallbacks = [f.retry.onclick, f.toggle.onchange, f.type.onchange, f.instance.onchange, overlay.onchange];
  f.controls.destroy(); f.controls.destroy();
  for (const callback of oldCallbacks) callback();
  assert.equal(f.retries, 0);
  assert.equal(f.changes.length, 0);
  for (const node of [f.retry, f.toggle, f.type, f.instance, overlay]) assert.equal(node.onclick ?? node.onchange ?? null, null);
  assert.equal(f.section.isConnected, false);
});

test('choice refresh preserves type, instance and valid overlays without firing a selection change', t => {
  const f = fixture(t); f.controls.setChoices(choices);
  f.toggle.checked = true; f.toggle.onchange();
  f.type.value = 'state'; f.type.onchange();
  const federalOverlay = f.overlays.children[1].children[0];
  federalOverlay.checked = true; federalOverlay.onchange();
  const count = f.changes.length;
  f.controls.setChoices([...choices].reverse());
  assert.equal(f.type.value, 'state'); assert.equal(f.instance.value, 'state-2026');
  assert.equal(f.changes.length, count);
  const keptOverlay = f.overlays.children.find(node => node.tag === 'label' && node.children[0].value === 'federal-2025').children[0];
  assert.equal(keptOverlay.checked, true); assert.equal(keptOverlay.disabled, false);
  f.instance.onchange();
  assert.deepEqual(f.changes.at(-1), [true, 'state-2026', new Set(['federal-2025'])]);
});
