import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../src/safety/three-dimensional-controls.ts', import.meta.url), 'utf8');
const compiled = await transform(source, {loader: 'ts', format: 'esm'});
const {installThreeDimensionalControls} = await import('data:text/javascript;base64,' + Buffer.from(compiled.code + '\n//# sourceURL=three-dimensional-controls-under-test.js').toString('base64'));
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; }
  append(...nodes) {
    for (const node of nodes) { node.remove(); this.children.push(node); node.parentElement = this; }
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  contains(node) { return node===this||this.children.some(child=>child.contains(node)); }
  remove() {
    if (!this.parentElement) return;
    const parent = this.parentElement;
    parent.children.splice(parent.children.indexOf(this), 1); this.parentElement = undefined;
  }
  get hidden() { return this._hidden || false; }
  set hidden(value) { this._hidden = value; if (value && document.activeElement === this) document.activeElement = document.body; }
  get disabled() { return this._disabled || false; }
  set disabled(value) { this._disabled = value; if (value && document.activeElement === this) document.activeElement = document.body; }
  focus(options) {
    if (this.hidden || this.disabled) return;
    document.activeElement = this; this.focusOptions = options;
  }
}
function fixture(t, requestMode = () => new Promise(() => {})) {
  const keys = ['document', 'matchMedia'], previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const body = new Element('body'), host = new Element('div'); body.append(host);
  Object.assign(globalThis, {document: {body, activeElement: body, createElement: tag => new Element(tag), createTextNode: () => new Element('#text')}, matchMedia: () => ({matches: false, addEventListener() {}, removeEventListener() {}})});
  const controls = installThreeDimensionalControls({host, locale: 'en', requestMode});
  const group = controls.element.children[0], flat = group.children[0], three = group.children[1];
  const feedback = controls.element.children.find(node => node.className === 'three-dimensional-feedback'), retry = feedback.children[1];
  const other = new Element('button'); body.append(other);
  t.after(() => { controls.destroy(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return {controls, flat, three, retry, other};
}

test('ordinary choice of the current ready mode is idempotent across real mode switches', async t => {
  const requests=[];
  const f=fixture(t,async(mode,signal)=>{requests.push({mode,signal});return{mode,status:'ready'};});
  f.flat.onclick();assert.equal(requests.length,0);
  for(const mode of ['3d','2d','3d']){
    const button=mode==='3d'?f.three:f.flat,previous=requests.length;
    button.onclick();await Promise.resolve();
    assert.equal(requests.length,previous+1);assert.equal(requests.at(-1).mode,mode);
    assert.deepEqual(f.controls.state,{mode,status:'ready'});
    button.focus();button.onclick();
    assert.equal(requests.length,previous+1);
    assert.equal(requests.at(-1).signal.aborted,false,'a repeated ready choice must not cancel or replace the owner request');
    assert.equal(document.activeElement,button);
  }
});
test('non-ready choices, explicit retry and public mode requests still reach the owner', async t => {
  const requests=[];
  const f=fixture(t,async(mode,signal)=>{requests.push({mode,signal});return{mode,status:'ready'};});
  for(const status of ['error','partial','outside','overview']){
    f.controls.setState({mode:'3d',status});const previous=requests.length;
    f.three.onclick();await Promise.resolve();
    assert.equal(requests.length,previous+1);assert.deepEqual(f.controls.state,{mode:'3d',status:'ready'});
  }
  f.controls.setState({mode:'3d',status:'error'});assert.equal(f.retry.hidden,false);
  const beforeRetry=requests.length;f.retry.onclick();await Promise.resolve();
  assert.equal(requests.length,beforeRetry+1);
  await f.controls.requestMode('3d');
  assert.equal(requests.length,beforeRetry+2,'an explicit public request must remain actionable even when the same mode is ready');
});

test('focused 3D activation keeps keyboard focus on usable 2D before disabling 3D', t => {
  const f = fixture(t); f.three.focus(); f.three.onclick();
  assert.equal(f.controls.state.status, 'loading'); assert.equal(f.three.disabled, true); assert.equal(f.flat.disabled, false);
  assert(document.activeElement === f.flat, 'the active 3D trigger must transfer focus before becoming disabled');
  assert.deepEqual(f.flat.focusOptions, {preventScroll: true});
});
test('focused internal retry transfers focus before its trigger is hidden', t => {
  const f = fixture(t); f.controls.setState({mode: '2d', status: 'error'}); f.retry.focus(); f.retry.onclick();
  assert.equal(f.retry.hidden, true); assert.equal(f.controls.state.status, 'loading');
  assert(document.activeElement === f.flat, 'the active retry trigger must transfer focus before becoming hidden');
  assert.deepEqual(f.flat.focusOptions, {preventScroll: true});
});
test('ready publication does not steal focus back after a pending 3D request', async t => {
  let resolve;
  const f = fixture(t, () => new Promise(done => { resolve = done; }));
  f.three.focus(); f.three.onclick(); f.other.focus(); resolve({mode: '3d', status: 'ready'});
  await Promise.resolve();
  assert.equal(f.controls.state.status, 'ready'); assert.equal(f.three.disabled, false); assert(document.activeElement === f.other);
});
test('an external request leaves unrelated focus and the pending request lifecycle intact', async t => {
  let requested, signal;
  const f = fixture(t, (mode, currentSignal) => { requested = mode; signal = currentSignal; return new Promise(() => {}); });
  f.other.focus(); void f.controls.requestMode('3d');
  assert.equal(requested, '3d'); assert.equal(signal.aborted, false); assert(document.activeElement === f.other);
  const firstSignal = signal;
  f.flat.onclick(); assert.equal(firstSignal.aborted, true); assert.equal(signal.aborted, false); assert.equal(requested, '2d'); assert(document.activeElement === f.other);
});
test('authoritative ready publication preserves focus when hiding the active retry', t => {
  const f = fixture(t); f.controls.setState({mode: '2d', status: 'error'}); f.retry.focus();
  f.controls.reportState({mode: '2d', status: 'ready'});
  assert.equal(f.retry.hidden, true); assert(document.activeElement === f.flat);
});
test('map unavailability disables all map controls without choosing a new focus target', t => {
  const f = fixture(t); f.three.focus(); f.controls.setMapAvailable(false);
  assert.equal(f.flat.disabled, true); assert.equal(f.three.disabled, true); assert.equal(f.retry.hidden, true);
  assert.equal(f.flat.focusOptions, undefined, 'there is no usable mode button while the map is unavailable');
});
test('unsupported 3D moves only its active focus to the available 2D control', t => {
  const f = fixture(t); f.three.focus(); f.controls.setSupported(false);
  assert.equal(f.three.disabled, true); assert.equal(f.flat.disabled, false); assert(document.activeElement === f.flat);
  f.other.focus(); f.controls.setSupported(true); assert(document.activeElement === f.other);
});

test('an intermediate loading publication retains the current request completion', async t => {
  let resolve;
  const f = fixture(t, () => new Promise(done => { resolve = done; }));
  const pending = f.controls.requestMode('3d');
  f.controls.reportState({mode: '2d', status: 'loading'});
  resolve({mode: '3d', status: 'partial'}); await pending;
  assert.deepEqual(f.controls.state, {mode: '3d', status: 'partial'});
  assert.equal(f.three.disabled, false);
});

test('a request failure after an intermediate publication remains retryable instead of stuck loading', async t => {
  let reject;
  const f = fixture(t, () => new Promise((_done, fail) => { reject = fail; }));
  const pending = f.controls.requestMode('3d');
  f.controls.reportState({mode: '2d', status: 'loading'});
  reject(Error('preparation failed')); await pending;
  assert.deepEqual(f.controls.state, {mode: '2d', status: 'error'});
  assert.equal(f.retry.hidden, false);
});

test('a terminal owner fallback cannot be overwritten by a late request result', async t => {
  let resolve;
  const f = fixture(t, () => new Promise(done => { resolve = done; }));
  const pending = f.controls.requestMode('3d');
  f.controls.reportState({mode: '2d', status: 'ready'});
  resolve({mode: '3d', status: 'ready'}); await pending;
  assert.deepEqual(f.controls.state, {mode: '2d', status: 'ready'});
  assert.equal(f.three.attributes['aria-pressed'], 'false');
});

test('an internally cancelled request restores the last published partial state without claiming ready', async t => {
  let reject;
  const f = fixture(t, () => new Promise((_done, fail) => { reject = fail; }));
  f.controls.setState({mode: '3d', status: 'partial'});
  const pending = f.controls.requestMode('2d');
  f.controls.reportState({mode: '3d', status: 'loading'});
  reject(new DOMException('Superseded', 'AbortError')); await pending;
  assert.deepEqual(f.controls.state, {mode: '3d', status: 'partial'});
  assert.equal(f.retry.hidden, true);
});
