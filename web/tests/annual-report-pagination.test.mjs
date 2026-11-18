import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {build, transform} from 'esbuild';
import ts from 'typescript';

const root = new URL('../src/safety/', import.meta.url);
const bundle = await build({entryPoints: [new URL('report-list-pager.ts', root).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {appendReportListPager} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const main = await readFile(new URL('main.ts', root), 'utf8');
const ast = ts.createSourceFile('main.ts', main, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function find(node, predicate) {
  if (predicate(node)) return node;
  return ts.forEachChild(node, child => find(child, predicate));
}
const showSelection = find(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'showSelection');
const branch = showSelection && find(showSelection, node => ts.isIfStatement(node) && ts.isBinaryExpression(node.expression) && ts.isPropertyAccessExpression(node.expression.left) && node.expression.left.expression.getText(ast) === 'selection' && node.expression.left.name.text === 'type' && ts.isStringLiteral(node.expression.right) && node.expression.right.text === 'hex');
assert(branch, 'extract only the actual first annual selection.type === hex branch');
const flow = (await transform(`function renderAnnualSelection(){${branch.getText(ast)}}`, {loader: 'ts', format: 'cjs'})).code;

// Run the production annual branch and real pager without loading the map graph.
// The fixture models connection state, deferred source reads and rendered IDs;
// native keyboard focus, accessibility output and GPU behavior are not covered.
class Element {
  constructor(document, tag) { this.ownerDocument = document; this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.disabled = false; }
  get isConnected() { return this.tag === 'body' || Boolean(this.parentElement?.isConnected); }
  get textContent() { return String(this.value ?? '') + this.children.map(node => node.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this.value = String(value); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const node of this.children) node.parentElement = null; this.children = []; this.value = ''; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  focus() { if (this.isConnected && !this.disabled) this.ownerDocument.activeElement = this; }
  remove() { if (this.parentElement) { this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; } }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const copy = (key, values) => `copy:${key}${values ? ' ' + JSON.stringify(values) : ''}`;
function fixture() {
  const document = {createElement(tag) { return new Element(document, tag); }};
  document.body = document.createElement('body'); document.activeElement = document.body;
  const panel = document.createElement('section'); document.body.append(panel);
  const orderedIds = Array.from({length: 45}, (_, index) => `synthetic-annual-${String(index + 1).padStart(3, '0')}`);
  const eventMonths = Object.fromEntries(orderedIds.map((id, index) => [id, ['2026-10', '2026-08', '2026-09'][index % 3]]));
  const originalIds = Object.freeze([...orderedIds].reverse());
  const expected = [0, 2, 1].flatMap(remainder => orderedIds.filter((_id, index) => index % 3 === remainder));
  const properties = {event_ids: originalIds, count: originalIds.length, edge_m: 275};
  const reads = [], renders = [], timeline = [], errors = [];
  const previousRequest = new AbortController();
  previousRequest.signal.addEventListener('abort', () => timeline.push('abort-year'));
  const text = (tag, value, host) => { const node = document.createElement(tag); node.textContent = value; host.append(node); return node; };
  const deps = {
    appendReportListPager, panel, properties, selected: {type: 'hex', id: 'synthetic-hex'}, annual: {event_months: Object.freeze(eventMonths)}, yearReportRequest: previousRequest,
    text, t: copy, number: value => String(value), el: () => ({value: '2026'}), console: {error: error => errors.push(error)},
    abortPendingReportBodyLoads() { timeline.push('abort-bodies'); },
    annualReports(ids, signal) {
      timeline.push('read');
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      reads.push({ids, signal, resolve, reject}); return promise;
    },
    listReports(host, ids, rows, missing) {
      renders.push({host, ids, rows, missing});
      for (const row of rows) { const card = text('article', row.id, host); card.dataset.sourceId = row.id; }
    },
  };
  const api = new Function('deps', `const {appendReportListPager,panel,properties:p,annual,text,t,number,el,console,abortPendingReportBodyLoads,annualReports,listReports}=deps;let {selected,yearReportRequest}=deps;const selection=selected;\n${flow}\nreturn {render:renderAnnualSelection,setSelected(value){selected=value;}};`)(deps);
  return {api, panel, reads, renders, timeline, errors, originalIds, expected, previousRequest, eventMonths};
}
function snapshot(f, read) {
  const rows = read.ids.map(id => Object.freeze({id, month: f.eventMonths[id], source_sha256: 'a'.repeat(64)}));
  return {rows, missing: new Map([[read.ids[0], 1]])};
}

test('annual hex sorts a copied identity list and reads exactly twenty reports per page', async () => {
  const f = fixture(), original = [...f.originalIds]; f.api.render();
  const navigation = f.panel.children.find(node => node.tag === 'nav'); assert(navigation);
  const next = navigation.children.at(-1);
  for (let page = 0; page < 3; page++) {
    const read = f.reads[page], value = snapshot(f, read);
    assert.deepEqual(read.ids, f.expected.slice(page * 20, page * 20 + 20));
    read.resolve(value); await settle();
    const rendered = f.renders[page];
    assert.deepEqual(rendered.ids, read.ids, 'only this page enters listReports');
    assert.equal(rendered.rows, value.rows); assert.equal(rendered.missing, value.missing);
    assert.deepEqual(value.rows.map(row => row.month), read.ids.map(id => f.eventMonths[id]));
    if (page < 2) next.onclick();
  }
  assert.deepEqual(f.reads.map(read => read.ids.length), [20, 20, 5]);
  assert.deepEqual(f.originalIds, original, 'the original annual event array is not sorted in place');
  assert.deepEqual(f.reads.flatMap(read => read.ids), f.expected);
  for (const value of [copy('legend.yearHex', {year: '2026'}), copy('selection.announcementCount', {count: '45'}), copy('selection.yearHexSize', {year: '2026', metres: '275'}), copy('selection.outcomeUnknown')]) assert(f.panel.textContent.includes(value));
  assert.equal(f.previousRequest.signal.aborted, true);
  assert.deepEqual(f.timeline.slice(0, 3), ['abort-bodies', 'abort-year', 'read']);
  assert.equal(f.errors.length, 0);
});

test('rapid page changes abort the previous read and its late completion cannot replace the new page', async () => {
  const f = fixture(); f.api.render();
  f.panel.children.find(node => node.tag === 'nav').children.at(-1).onclick();
  const [oldRead, currentRead] = f.reads;
  assert.equal(oldRead.signal.aborted, true); assert.equal(currentRead.signal.aborted, false);
  const current = snapshot(f, currentRead); currentRead.resolve(current); await settle();
  assert.equal(f.renders.length, 1); assert.equal(f.renders[0].rows, current.rows); assert.equal(f.renders[0].missing, current.missing);
  oldRead.resolve(snapshot(f, oldRead)); await settle();
  assert.equal(f.renders.length, 1);
  assert.deepEqual(f.renders[0].ids, f.expected.slice(20, 40));
  assert.equal(f.timeline.filter(item => item === 'abort-bodies').length, 2);
  assert.equal(f.errors.length, 0);
});

test('a changed selection identity or disconnected annual list cannot publish a late result', async () => {
  for (const change of ['selection', 'connection']) {
    const f = fixture(); f.api.render();
    if (change === 'selection') f.api.setSelected({type: 'hex', id: 'synthetic-hex'});
    else f.panel.remove();
    f.reads[0].resolve(snapshot(f, f.reads[0])); await settle();
    assert.equal(f.renders.length, 0, change);
    assert.equal(f.errors.length, 0);
  }
});
