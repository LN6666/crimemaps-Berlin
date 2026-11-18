import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {build, transform} from 'esbuild';
import ts from 'typescript';

const sourceRoot = new URL('../src/safety/', import.meta.url);
async function module(file) {
  const result = await build({entryPoints: [new URL(file, sourceRoot).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const {ReportBodyLoadError, reportBodySourceId} = await module('report-body-loader.ts');
const {pendingReportBodyLabel, reportBodyPresentation} = await module('report-body-presentation.ts');
const main = await readFile(new URL('main.ts', sourceRoot), 'utf8');
const ast = ts.createSourceFile('main.ts', main, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'appendLazyReportBody');
assert(declaration, 'exercise the actual production disclosure function');
const flow = (await transform(declaration.getText(ast), {loader: 'ts', format: 'cjs'})).code;

// This fixture models disclosure state and async request completion only. It does
// not claim native details activation, accessibility-tree or browser-layout proof.
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = new Map(); this.open = false; }
  get isConnected() { return this.tag === 'body' || Boolean(this.parentElement?.isConnected); }
  set textContent(value) { this.replaceChildren(); this.value = value; }
  get textContent() { return String(this.value ?? '') + this.children.map(node => node.textContent).join(''); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const node of this.children) node.parentElement = null; this.children = []; this.value = ''; this.append(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  toggle(open) { this.open = open; this.listeners.get('toggle')?.(); }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture({locale = 'en', load, event = {}}) {
  let calls = 0;
  const deps = {
    currentCity: 'berlin', locale, ReportBodyLoadError, reportBodySourceId, pendingReportBodyLabel, reportBodyPresentation,
    displayMonth: event => event.month,
    loadReportBody: (...args) => { calls++; return load(...args); },
    document: {createElement: tag => new Element(tag)},
    text(tag, value, parent) { const node = new Element(tag); node.textContent = value; parent.append(node); return node; },
  };
  const append = new Function('deps', `const {currentCity,locale,ReportBodyLoadError,reportBodySourceId,pendingReportBodyLabel,reportBodyPresentation,displayMonth,loadReportBody,document,text}=deps;\n${flow}\nreturn appendLazyReportBody;`)(deps);
  const parent = new Element('body');
  append(parent, {id: 'fixture-001', month: '2026-10', source_url: 'https://example.invalid/fixture-001', source_sha256: 'a'.repeat(64), ...event});
  const disclosure = parent.children[0], content = disclosure.children[1];
  return {disclosure, content, get calls() { return calls; }, get retry() { return content.children.find(node => node.tag === 'button'); }};
}

test('a missing exact source identity explains the absence without offering a futile retry', async () => {
  const f = fixture({event: {source_sha256: undefined}, load() { throw Error('must not request a body without source identity'); }});
  f.disclosure.toggle(true); await settle();
  assert.equal(f.calls, 0);
  assert.match(f.content.textContent, /source record.*revision/i);
  assert.equal(Boolean(f.retry), false, 'a missing identity cannot succeed by retrying');
});

for (const [locale, sourceHint] of [['de', /Zusammenfassung|Originalquelle/], ['en', /summary|original source/], ['zh', /摘要|原文链接/]]) {
  test(`${locale}: rejected source binding explains the limit and has no retry button`, async () => {
    const f = fixture({locale, load: async () => { throw new ReportBodyLoadError('INTERNAL source revision mismatch', false); }});
    f.disclosure.toggle(true); await settle();
    assert.equal(f.calls, 1);
    assert.equal(Boolean(f.retry), false, 'a rejected source binding cannot succeed by retrying');
    assert.match(f.content.textContent, sourceHint);
    assert.doesNotMatch(f.content.textContent, /INTERNAL/);
  });
}

test('a temporary network failure keeps the retry action and can load the body successfully', async () => {
  let attempts = 0;
  const f = fixture({load: async () => {
    if (++attempts === 1) throw new ReportBodyLoadError('HTTP 503');
    return {body: 'Verified announcement text.', contentClass: 'full_body'};
  }});
  f.disclosure.toggle(true); await settle();
  assert.equal(f.content.dataset.state, 'failed');
  assert(f.retry);
  assert.equal(f.retry.type, 'button');
  f.retry.onclick(); await settle();
  assert.equal(f.calls, 2);
  assert.equal(f.content.dataset.state, 'loaded');
  assert.equal(f.content.textContent, 'Verified announcement text.');
  assert.equal(f.retry, undefined);
});

test('closing a pending disclosure cancels it without rendering a failure or retry', async () => {
  let signal, rejectLoad;
  const f = fixture({load: (_identity, _locale, callerSignal) => {
    signal = callerSignal;
    return new Promise((_resolve, reject) => { rejectLoad = reject; });
  }});
  f.disclosure.toggle(true);
  assert.equal(f.content.dataset.state, 'loading');
  f.disclosure.toggle(false);
  assert(signal.aborted);
  rejectLoad(new DOMException('aborted', 'AbortError')); await settle();
  assert.equal(f.content.dataset.state, 'idle');
  assert.equal(f.content.textContent, '');
  assert.equal(f.retry, undefined);
});
