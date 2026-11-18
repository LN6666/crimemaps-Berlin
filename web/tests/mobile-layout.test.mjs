import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../src/safety/mobile-layout.ts', import.meta.url), 'utf8');
const compiled = await transform(source, {loader: 'ts', format: 'esm'});
const {installMobileLayout, mobileLabels} = await import('data:text/javascript;base64,' + Buffer.from(compiled.code + '\n//# sourceURL=mobile-layout-under-test.js').toString('base64'));

class Events {
  listeners = new Map();
  addEventListener(type, callback, {signal} = {}) {
    const callbacks = this.listeners.get(type) || new Set();
    callbacks.add(callback); this.listeners.set(type, callbacks);
    signal?.addEventListener('abort', () => callbacks.delete(callback), {once: true});
  }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback(event);
  }
}
class Element extends Events {
  constructor(tag, className = '') {
    super(); this.tag = tag; this.className = className; this.childNodes = []; this.attributes = {};
    this.style = {setProperty() {}, removeProperty() {}};
    this.classList = {add() {}, remove() {}, contains: name => this.className.split(' ').includes(name)};
  }
  contains(node) { return this === node || this.childNodes.some(child => child.contains(node)); }
  append(...nodes) { for (const node of nodes) { node.remove(); this.childNodes.push(node); node.parentElement = this; } }
  prepend(node) { node.remove(); this.childNodes.unshift(node); node.parentElement = this; }
  before(node) {
    node.remove(); const parent = this.parentElement;
    parent.childNodes.splice(parent.childNodes.indexOf(this), 0, node); node.parentElement = parent;
  }
  replaceWith(...nodes) { for (const node of nodes) this.before(node); this.remove(); }
  remove() {
    if (!this.parentElement) return;
    const parent = this.parentElement;
    parent.childNodes.splice(parent.childNodes.indexOf(this), 1); this.parentElement = undefined;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  get open() { return this._open || false; }
  set open(value) {
    this._open = value;
    // Match the browser focus loss when an open details hides its active content.
    if (!value && this.contains(document.activeElement) && document.activeElement !== this.childNodes[0]) document.activeElement = document.body;
  }
  get hidden() { return this._hidden || false; }
  set hidden(value) {
    this._hidden = value;
    if (value && this.contains(document.activeElement)) document.activeElement = document.body;
  }
  focus(options) { document.activeElement = this; this.focusOptions = options; }
  scrollIntoView() {}
  getBoundingClientRect() { return {height: 40}; }
  querySelector(selector) {
    if (selector === 'label') return null;
    const match = node => selector.startsWith('.') ? node.className.split(' ').includes(selector.slice(1)) : selector.startsWith('#') ? node.id === selector.slice(1) : node.tag === selector;
    for (const node of this.childNodes) { if (match(node)) return node; const found = node.querySelector(selector); if (found) return found; }
    return null;
  }
  querySelectorAll() { return []; }
}
function fixture(t, isMobile = false) {
  const keys = ['document', 'window', 'matchMedia', 'MutationObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const body = new Element('body'), root = new Element('div'), header = new Element('header'), toolbar = new Element('div', 'toolbar');
  const main = new Element('main'), controls = new Element('aside', 'controls'), map = new Element('section', 'map-wrap'), details = new Element('aside', 'details');
  const city = new Element('select'), basemap = new Element('select'), picker = new Element('div', 'basemap-picker'), error = new Element('p'), search = new Element('input');
  city.id = 'city-switch'; city.selectedOptions = [{textContent: 'Berlin'}];
  error.id = 'basemap-error'; error._hidden = true;
  body.append(root); root.append(header, main); header.append(toolbar); toolbar.append(city);
  main.append(controls, map, details); controls.append(search); map.append(picker); picker.append(basemap, error);
  const media = new Events(); media.matches = isMobile;
  let frame = 0;
  class Observer { observe() {} disconnect() {} }
  const win = new Events(); win.innerHeight = 800;
  Object.assign(globalThis, {
    document: {body, documentElement: new Element('html'), activeElement: body, createElement: tag => new Element(tag)},
    window: win, matchMedia: () => media, MutationObserver: Observer, ResizeObserver: Observer,
    requestAnimationFrame: () => ++frame, cancelAnimationFrame() {},
  });
  const layout = installMobileLayout(root, {labels: mobileLabels.en});
  const destroy = layout.destroy; let destroyed = false;
  layout.destroy = () => { if (!destroyed) { destroyed = true; destroy(); } };
  const settings = root.querySelector('.mobile-view-settings'), basemapSettings = root.querySelector('.mobile-basemap-settings');
  const settingsSummary = settings.childNodes[0], basemapSummary = basemapSettings.childNodes[0];
  t.after(() => { layout.destroy(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return {layout, root, city, basemap, error, search, settings, settingsSummary, basemapSettings, basemapSummary,
    resize(matches) { media.matches = matches; media.dispatch('change'); },
  };
}
function escape(panel, defaultPrevented = false) {
  const event = {key: 'Escape', defaultPrevented, prevented: false, preventDefault() { this.prevented = true; }};
  panel.dispatch('keydown', event); return event;
}

test('desktop to phone returns focus from a hidden city selector to its visible summary', t => {
  const f = fixture(t); f.city.focus(); f.resize(true);
  assert.equal(f.settings.open, false); assert(document.activeElement === f.settingsSummary, 'focus must move to the visible header summary');
  assert.deepEqual(f.settingsSummary.focusOptions, {preventScroll: true});
});
test('desktop to phone returns focus from hidden basemap choices to their visible summary', t => {
  const f = fixture(t); f.basemap.focus(); f.resize(true);
  assert.equal(f.basemapSettings.open, false); assert(document.activeElement === f.basemapSummary, 'focus must move to the visible basemap summary');
  assert.deepEqual(f.basemapSummary.focusOptions, {preventScroll: true});
});
test('phone transition leaves the basemap open for a source error without moving focus', t => {
  const f = fixture(t); f.error.hidden = false; f.basemap.focus(); f.resize(true);
  assert.equal(f.basemapSettings.open, true); assert.equal(document.activeElement, f.basemap);
});
test('phone basemap Escape closes the disclosure and returns focus without scrolling', t => {
  const f = fixture(t, true); f.basemapSettings.open = true; f.basemap.focus();
  assert.equal(escape(f.basemapSettings).prevented, true);
  assert.equal(f.basemapSettings.open, false); assert.equal(document.activeElement, f.basemapSummary);
  assert.deepEqual(f.basemapSummary.focusOptions, {preventScroll: true});
});
test('phone header Escape retains its existing close and return-focus behavior', t => {
  const f = fixture(t, true); f.settings.open = true; f.city.focus();
  assert.equal(escape(f.settings).prevented, true);
  assert.equal(f.settings.open, false); assert.equal(document.activeElement, f.settingsSummary);
  assert.deepEqual(f.settingsSummary.focusOptions, {preventScroll: true});
});
test('desktop and already handled Escape do not close disclosures or steal focus', t => {
  const f = fixture(t); f.basemap.focus();
  assert.equal(escape(f.basemapSettings).prevented, false); assert.equal(f.basemapSettings.open, true);
  f.resize(true); f.settings.open = true; f.city.focus();
  assert.equal(escape(f.settings, true).prevented, false); assert.equal(f.settings.open, true); assert.equal(document.activeElement, f.city);
});
test('an unrelated focus target survives a breakpoint transition', t => {
  const f = fixture(t); const external = new Element('button'); f.root.append(external); external.focus(); f.resize(true);
  assert.equal(document.activeElement, external);
});
test('destroy removes disclosure and media listeners before any later interaction', t => {
  const f = fixture(t); f.layout.destroy(); f.city.focus(); f.resize(true);
  assert.equal(f.settings.open, true); assert.equal(document.activeElement, f.city);
  assert.equal(escape(f.settings).prevented, false);
});
