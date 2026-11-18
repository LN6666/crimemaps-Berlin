import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {build, transform} from 'esbuild';
import ts from 'typescript';

const sourceRoot = new URL('../src/safety/', import.meta.url);
const bundle = await build({entryPoints: [new URL('report-list-pager.ts', sourceRoot).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {appendReportListPager} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const main = await readFile(new URL('main.ts', sourceRoot), 'utf8');
const ast = ts.createSourceFile('main.ts', main, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function find(root, predicate) {
  if (predicate(root)) return root;
  return ts.forEachChild(root, node => find(node, predicate));
}
const wrapper = find(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'appendPagedReports');
const openReports = find(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'openReportsDialog');
const readAction = find(ast, node => ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && ts.isPropertyAccessExpression(node.expression.left) && node.expression.left.expression.getText(ast) === 'reportsButton' && node.expression.left.name.text === 'onclick');
const notice = find(ast, node => ts.isCallExpression(node) && node.expression.getText(ast) === 'mountMapRecoveryNotice');
const recovery = notice?.arguments[0]?.properties?.find(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'onReports');
const refresh = find(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === 'refresh');
const unknown = refresh && find(refresh, node => ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left) && node.left.expression.getText(ast) === 'btn' && node.left.name.text === 'onclick');
assert(wrapper && openReports && readAction && recovery?.initializer && unknown, 'extract the actual list helpers and normal, recovery and unknown-list handlers');
const flow = (await transform(`${wrapper.getText(ast)}\n${openReports.getText(ast)}\n${readAction.getText(ast)}\nconst onReports=${recovery.initializer.getText(ast)};\nconst onUnknown=${unknown.right.getText(ast)};`, {loader: 'ts', format: 'cjs'})).code;

// Only report rendering/data and dialog setup are replaced. The production
// helpers, all three handlers and real pager execute; no native layout is simulated.
class Element {
  constructor(doc, tag) { this.ownerDocument = doc; this.tag = tag; this.children = []; this.attributes = {}; this.disabled = false; this.dataset = {}; }
  get isConnected() { return this.tag === 'body' || Boolean(this.parentElement?.isConnected); }
  get textContent() { return String(this.value ?? '') + this.children.map(node => node.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this.value = String(value); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  replaceChildren(...nodes) { if (this.children.some(node => node.contains(this.ownerDocument.activeElement))) this.ownerDocument.activeElement = this.ownerDocument.body; for (const node of this.children) node.parentElement = null; this.children = []; this.value = ''; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  focus(options) { if (this.isConnected && !this.disabled) { this.ownerDocument.activeElement = this; this.focusOptions = options; } }
}
const copy = (key, values) => `copy:${key}${values ? ' ' + JSON.stringify(values) : ''}`;
const descendants = node => [node, ...node.children.flatMap(descendants)];
function fixture({ids, sceneAware = true, provider = 'official'} = {}) {
  const doc = {createElement(tag) { return new Element(doc, tag); }};
  doc.body = doc.createElement('body'); doc.activeElement = doc.body;
  const sourceRow = id => ({id, source_url: `https://example.invalid/police/${encodeURIComponent(id)}`});
  let rows = ids.map(sourceRow);
  const dialogs = [], dialogCalls = [], timeline = [], rendered = [], renderedSources = [];
  const filters = {period: '2026-10', category: 'all'};
  const reportsButton = doc.createElement('button'); doc.body.append(reportsButton);
  const text = (tag, value, parent) => { const node = doc.createElement(tag); node.textContent = value; parent.append(node); return node; };
  const deps = {
    appendReportListPager, t: copy, number: value => String(value), events: () => rows, sceneAware, data: {metadata: {upstream_provider: provider}}, unmapped: rows, text, reportsButton,
    el: () => ({value: filters.category}), periodLabel: () => filters.period, categoryLabel: category => `category:${category}`,
    abortPendingReportBodyLoads() { timeline.push('abort'); },
    listReports(host, pageIds) { timeline.push('render'); rendered.push([...pageIds]); for (const id of pageIds) { const row = rows.find(row => row.id === id); assert(row, 'render only supplied source identities'); const article = text('article', id, host); article.dataset.sourceId = id; const link = text('a', 'Original source', article); link.href = row.source_url; renderedSources.push({id, source_url: link.href}); } },
    openDialog(title, returnFocus) { const panel = doc.createElement('div'); doc.body.append(panel); text('h2', title, panel).id = 'drawer-title'; dialogs.push(panel); dialogCalls.push({title, returnFocus}); return panel; },
  };
  const handlers = new Function('deps', `const {appendReportListPager,t,number,events,sceneAware,data,unmapped,text,reportsButton,el,periodLabel,categoryLabel,abortPendingReportBodyLoads,listReports,openDialog}=deps;\n${flow}\nreturn {onReports,onUnknown,onRead:reportsButton.onclick};`)(deps);
  return {doc, handlers, dialogs, dialogCalls, timeline, rendered, renderedSources, filters, reportsButton, setFilteredIds(ids) { rows = ids.map(sourceRow); }};
}
function checkPages(f, handler, ids) {
  handler();
  const panel = f.dialogs[0], title = panel.children.find(node => node.id === 'drawer-title');
  const navigation = panel.children.find(node => node.tag === 'nav');
  assert(navigation); assert.equal(navigation.getAttribute('aria-label'), copy('report.listTitle'));
  const [previous, status, next] = navigation.children;
  assert.deepEqual(f.rendered[0], ids.slice(0, 20));
  assert.equal(status.textContent, copy('unknown.page', {page: '1', pages: '3'}));
  next.focus(); next.onclick();
  assert.equal(f.doc.activeElement, next, 'the middle-page button retains its existing DOM focus');
  assert.deepEqual(f.rendered[1], ids.slice(20, 40));
  next.onclick();
  assert.deepEqual(f.rendered[2], ids.slice(40));
  assert.equal(next.disabled, true); assert.equal(previous.disabled, false);
  assert.equal(status.textContent, copy('unknown.page', {page: '3', pages: '3'}));
  assert.equal(panel.children.find(node => node.tag === 'nav'), navigation);
  assert.equal(navigation.children[0], previous); assert.equal(navigation.children[2], next);
  assert.equal(panel.children.find(node => node.id === 'drawer-title'), title, 'paging preserves the existing dialog label target');
  assert(title.isConnected); assert(navigation.isConnected);
  assert.deepEqual(f.rendered.flat(), ids, 'every input identity reaches the renderer once in its original order');
  assert.deepEqual(f.timeline, ['abort', 'render', 'abort', 'render', 'abort', 'render'], 'the real wrapper cancels pending bodies before each page renders');
  return panel;
}

test('map-recovery Reports renders bounded pages while retaining its title and navigation', () => {
  const ids = Array.from({length: 45}, (_, index) => `synthetic-recovery-${index + 1}`);
  const f = fixture({ids});
  const panel = checkPages(f, f.handlers.onReports, ids);
  assert(panel.textContent.includes(copy('selection.announcementCount', {count: '45'})));
  assert.equal(panel.children.find(node => node.id === 'drawer-title').textContent, copy('report.listTitle'));
  assert(panel.textContent.includes(`2026-10 · ${copy('filter.allReports')}`));
  assert(panel.textContent.includes(copy('coverage.partial')));
  assert.equal(f.dialogCalls[0].returnFocus, undefined);
});

test('the normal Read reports action uses current filtered IDs and passes its original return-focus button', () => {
  const ids = Array.from({length: 45}, (_, index) => `synthetic-current-filter-${index + 1}`);
  const f = fixture({ids: ['synthetic-outdated-filter']});
  f.filters.period = '2026-all'; f.filters.category = 'gewalt'; f.setFilteredIds(ids);
  const panel = checkPages(f, f.handlers.onRead, ids);
  assert.equal(f.dialogCalls[0].returnFocus, f.reportsButton, 'the actual normal-entry handler passes its own return-focus target');
  assert.equal(f.dialogCalls[0].title, copy('report.listTitle'));
  assert(panel.textContent.includes('2026-all · category:gewalt'));
  assert(panel.textContent.includes(copy('selection.announcementCount', {count: '45'})));
  assert(panel.textContent.includes(copy('coverage.partial')));
  assert.deepEqual(f.renderedSources, ids.map(id => ({id, source_url: `https://example.invalid/police/${encodeURIComponent(id)}`})));
});

test('the no-count-point dialog pages only the supplied identities and preserves its reading note', () => {
  const ids = Array.from({length: 45}, (_, index) => `synthetic-no-count-point-${index + 1}`);
  const f = fixture({ids});
  const panel = checkPages(f, f.handlers.onUnknown, ids);
  assert.equal(panel.children.find(node => node.id === 'drawer-title').textContent, copy('coverage.noPointTitle'));
  assert(panel.textContent.includes(copy('coverage.noPointNote')));
});

test('provider-only and legacy unresolved lists retain their original source-limit explanations', () => {
  for (const [sceneAware, provider, title, note] of [
    [true, 'POLIZEIKARTE', 'coverage.noPointTitle', 'coverage.munichUnknown'],
    [false, 'official', 'coverage.unresolvedTitle', 'coverage.roadUnknownNote'],
  ]) {
    const ids = ['synthetic-source-limit'];
    const f = fixture({ids, sceneAware, provider}); f.handlers.onUnknown();
    const panel = f.dialogs[0];
    assert.equal(panel.children.find(node => node.id === 'drawer-title').textContent, copy(title));
    assert(panel.textContent.includes(copy(note)));
    assert.deepEqual(f.rendered, [ids]);
    assert.deepEqual(f.timeline, ['abort', 'render']);
  }
});
