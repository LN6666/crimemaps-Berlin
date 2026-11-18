import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../src/safety/compact-choices.ts', import.meta.url), 'utf8');
const compiled = await transform(source, {loader: 'ts', format: 'esm'});
const {compactChoices} = await import('data:text/javascript;base64,' + Buffer.from(compiled.code + '\n//# sourceURL=compact-choices-under-test.js').toString('base64'));

class Element extends EventTarget {
  constructor(tag) { super(); this.tag = tag; this.childNodes = []; this.attributes = {}; this.replacements = 0; }
  contains(node) { return this === node || this.childNodes.some(child => child.contains(node)); }
  append(...nodes) { for (const node of nodes) { node.remove(); this.childNodes.push(node); node.parentElement = this; } }
  after(node) {
    node.remove(); const parent = this.parentElement;
    parent.childNodes.splice(parent.childNodes.indexOf(this) + 1, 0, node); node.parentElement = parent;
  }
  remove() {
    if (!this.parentElement) return;
    if (this.contains(document.activeElement)) document.activeElement = document.body;
    const parent = this.parentElement;
    parent.childNodes.splice(parent.childNodes.indexOf(this), 1); this.parentElement = undefined;
  }
  replaceChildren(...nodes) { this.replacements++; for (const node of [...this.childNodes]) node.remove(); this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  get disabled() { return this._disabled || false; }
  set disabled(value) { this._disabled = value; if (value && document.activeElement === this) document.activeElement = document.body; }
  focus(options) { if (!this.disabled && !this.hidden) { document.activeElement = this; this.focusOptions = options; } }
}
const option = (value, text = value) => ({value, text, disabled: false});
function fixture(t) {
  const keys = ['document', 'window', 'MutationObserver'], previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const body = new Element('body'), select = new Element('select'), other = new Element('button'), win = new EventTarget();
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() { this.connected = true; }
    disconnect() { this.connected = false; }
  }
  Object.assign(globalThis, {document: {body, activeElement: body, createElement: tag => new Element(tag)}, window: win, MutationObserver: Observer});
  select.options = [option('de', 'Deutsch'), option('en', 'English'), option('zh', '中文')]; select.value = 'de';
  select.setAttribute('aria-label', 'Language'); body.append(select, other);
  const control = compactChoices(select, {de: 'DE', en: 'EN', zh: '中'}), group = body.childNodes[1];
  let changes = 0; select.addEventListener('change', () => { changes++; });
  t.after(() => { control.destroy(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return {control, select, group, other, observer: observers[0], win, get changes() { return changes; }};
}

test('keyboard activation updates selection without replacing or blurring its active button', t => {
  const f = fixture(t), before = [...f.group.childNodes], button = before[1], replacements = f.group.replacements;
  button.focus(); button.onclick();
  assert.equal(f.select.value, 'en'); assert.equal(f.changes, 1);
  assert(f.group.childNodes.every((node, index) => node === before[index]), 'the original option buttons must remain in the DOM');
  assert(document.activeElement === button, 'the current keyboard trigger must stay focused');
  assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.equal(before[0].getAttribute('aria-pressed'), 'false');
  assert.equal(f.group.replacements, replacements);
});
test('external value and label changes update existing options without stealing unrelated focus', t => {
  const f = fixture(t), before = [...f.group.childNodes]; f.other.focus();
  f.select.value = 'zh'; f.select.options[0].text = 'Deutsch aktualisiert'; f.select.options[1].disabled = true;
  f.select.setAttribute('aria-label', 'Updated language'); f.select.dispatchEvent(new Event('change'));
  assert(f.group.childNodes.every((node, index) => node === before[index])); assert(document.activeElement === f.other);
  assert.equal(before[0].title, 'Deutsch aktualisiert'); assert.equal(before[1].disabled, true); assert.equal(before[2].getAttribute('aria-pressed'), 'true');
  assert.equal(f.group.getAttribute('aria-label'), 'Updated language');
});
test('a changed option list restores only its active same-value operable choice', t => {
  const f = fixture(t), previous = f.group.childNodes[1]; previous.focus();
  f.select.options = [option('en', 'English updated'), option('zh', '中文')]; f.observer.callback();
  const next = f.group.childNodes[0];
  assert(document.activeElement === next, 'a replacement option with the same value must keep keyboard continuity');
  assert.deepEqual(next.focusOptions, {preventScroll: true}); assert.equal(previous.onclick, null);
  assert.equal(next.textContent, 'EN'); assert.equal(next.title, 'English updated');
});
test('structural option changes leave focus outside the choices untouched', t => {
  const f = fixture(t); f.other.focus(); f.select.options = [option('en')]; f.observer.callback();
  assert(document.activeElement === f.other);
});
test('a disabled replacement is not used as the focus restoration target', t => {
  const f = fixture(t), previous = f.group.childNodes[1]; previous.focus();
  const replacement = option('en'); replacement.disabled = true; f.select.options = [replacement]; f.observer.callback();
  assert.equal(f.group.childNodes[0].disabled, true); assert.equal(f.group.childNodes[0].focusOptions, undefined);
});
test('disabled choices and disabled select reject stale direct activations', t => {
  const f = fixture(t), button = f.group.childNodes[1];
  f.select.options[1].disabled = true; button.onclick(); assert.equal(f.select.value, 'de'); assert.equal(f.changes, 0);
  f.select.options[1].disabled = false; f.select.disabled = true; button.onclick(); assert.equal(f.select.value, 'de'); assert.equal(f.changes, 0);
});
test('removed option buttons cannot publish a stale value after the options change', t => {
  const f = fixture(t), previous = f.group.childNodes[1], oldHandler = previous.onclick;
  f.select.options = [option('de')]; f.control.synchronize(); oldHandler();
  assert.equal(previous.onclick, null); assert.equal(f.select.value, 'de'); assert.equal(f.changes, 0);
});
test('destroy disconnects observers and events and makes old callbacks inert', t => {
  const f = fixture(t), oldButtons = [...f.group.childNodes], oldHandler = oldButtons[1].onclick;
  f.control.destroy(); const replacements = f.group.replacements;
  f.select.value = 'zh'; f.select.dispatchEvent(new Event('change')); f.win.dispatchEvent(new Event('pageshow')); f.win.dispatchEvent(new Event('storage'));
  f.observer.callback(); f.control.synchronize(); oldHandler(); f.control.destroy();
  assert.equal(f.observer.connected, false); assert.equal(f.group.parentElement, undefined); assert.equal(f.select.hidden, false);
  assert(oldButtons.every(button => button.onclick === null)); assert.equal(f.select.value, 'zh'); assert.equal(f.changes, 1);
  assert.equal(f.group.replacements, replacements);
});
