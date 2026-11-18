import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/safety/main.ts', import.meta.url), 'utf8');
const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(ast);
const identifier = (node, name) => ts.isIdentifier(node) && node.text === name;
function one(matches, label) { assert.equal(matches.length, 1, label); return matches[0]; }
const declaration = name => one(nodes.filter(node => ts.isVariableDeclaration(node) && identifier(node.name, name)), name).parent.parent;
const assignment = name => one(nodes.filter(node => ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) &&
  node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && identifier(node.expression.left, name)), name);
function callOn(statement, owner, method) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) return false;
  const callee = statement.expression.expression;
  return ts.isPropertyAccessExpression(callee) && identifier(callee.expression, owner) && callee.name.text === method;
}
function segment(start, end) {
  const statements = start.parent.statements; assert(statements, 'integration statements share an actual block');
  const first = statements.indexOf(start), last = statements.indexOf(end);
  assert(first >= 0 && last >= first); return statements.slice(first, last + 1).map(node => node.getText(ast)).join('\n');
}
const observerInit = segment(assignment('sceneFrameClock'), one(nodes.filter(node => callOn(node, 'sceneViewportObserver', 'observe')), 'map observer subscription'));
const environmentStart = assignment('environmentScene');
const environmentEnd = environmentStart.parent.statements.slice(environmentStart.parent.statements.indexOf(environmentStart)).find(node =>
  ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression) && identifier(node.expression.left, 'environmentStatus'));
assert(environmentEnd, 'late environment installation has a terminal status');
const environmentInit = segment(environmentStart, environmentEnd);
const sceneryStart = assignment('threeDimensionalScenery');
const sceneryInit = segment(sceneryStart, one(sceneryStart.parent.statements.filter(node => callOn(node, 'threeDimensionalScenery', 'setViewportVisible')), 'late scenery viewport state'));
const controlsStart = assignment('sceneControls');
const controlsAfter = controlsStart.parent.statements[controlsStart.parent.statements.indexOf(controlsStart) + 1];
assert(ts.isExpressionStatement(controlsAfter) && ts.isCallExpression(controlsAfter.expression) && identifier(controlsAfter.expression.expression, 'syncSceneVisibility'), 'late scene controls immediately receive the merged pause state');
const controlsInit = segment(controlsStart, controlsAfter);

function fixture(withManagers = true) {
  const calls = [], hidden = [], controlsHidden = [], pauseOrder = [], observers = [], container = {}, foreign = {}, environment = [], scenery = [], buildingHidden = [], buildingViewport = [], dedicatedHidden = [], solarHidden = [], reclamationHidden = [];
  const environmentManager = {
    setOffscreen: value => { environment.push(['offscreen', value]); calls.push(['environment', value]); },
    setReflectionSource() {}, setSceneEnvironment() {}, setVisible() {}, setReducedMotion() {},
    setMode: value => environment.push(['mode', value]),
  };
  const sceneryManager = {setVisible() {}, setViewportVisible: value => { scenery.push(value); calls.push(['scenery', value]); }};
  const sceneControls = {setPageHidden: value => { controlsHidden.push(value); pauseOrder.push(['controls', value]); }};
  class Observer {
    constructor(callback) { this.callback = callback; this.observed = []; observers.push(this); }
    observe(target) { this.observed.push(target); }
  }
  const context = vm.createContext({
    document: {hidden: false}, mapGPUUnavailable: false, sceneFrameClock: undefined,
    environmentScene: withManagers ? environmentManager : undefined, threeDimensionalScenery: withManagers ? sceneryManager : undefined,
    sceneControls: withManagers ? sceneControls : undefined,
    map: {getContainer: () => container, triggerRepaint() {}}, IntersectionObserver: Observer,
    createDisplayFrameClock: () => ({setPageHidden: value => { hidden.push(value); pauseOrder.push(['clock', value]); }}),
    module: {installEnvironmentScene: () => environmentManager}, installThreeDimensionalScenery: () => sceneryManager,
    installSceneControls: () => sceneControls, syncSceneEnvironment() {},
    currentCity: 'berlin', locale: 'zh', matchMedia: () => ({matches: false}), app: {querySelector: () => ({})}, mapRetry: undefined,
    threeDimensional: {renderer: {}, setPageHidden: value => buildingHidden.push(value), setViewportVisible: value => buildingViewport.push(value)}, dedicatedAppearance: {setPageHidden: value => dedicatedHidden.push(value)}, buildingSolarShadow: {setPageHidden: value => solarHidden.push(value)}, planarReflectionGroup: () => ({}), profile: {},
    sceneEnvironment: {}, threeDimensionalMotion: {matches: false}, environmentStatus: 'idle',
    idleContextReclamation: {setHidden: value => reclamationHidden.push(value)}, threeDimensionalRecovery: undefined, localPalaceGarden: undefined, building3dInteraction: undefined,
    dedicatedInitRequest: {abort() {}}, environmentRequest: {abort() {}}, dedicatedWanted: false, environmentWanted: false,
  });
  const run = code => vm.runInContext(ts.transpileModule(code, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText, context);
  run([declaration('sceneViewportVisible'), declaration('syncSceneVisibility'), declaration('syncSceneViewportVisibility'), declaration('syncThreeDimensionalVisibility')].map(node => node.getText(ast)).join('\n') + '\n' + observerInit);
  assert.equal(observers.length, 1); assert.deepEqual(observers[0].observed, [container]);
  return {context, run, calls, hidden, controlsHidden, pauseOrder, environment, scenery, buildingHidden, buildingViewport, dedicatedHidden, solarHidden, reclamationHidden, container, foreign, emit: entries => observers[0].callback(entries)};
}

test('actual map observer forwards only changed map visibility to both managers and the shared clock', () => {
  const f = fixture(); assert.deepEqual(f.hidden, [false]);
  f.emit([{target: f.foreign, isIntersecting: false}]); assert.deepEqual(f.calls, []); assert.deepEqual(f.hidden, [false]);
  f.emit([{target: f.foreign, isIntersecting: true}, {target: f.container, isIntersecting: false}]);
  assert.deepEqual(f.calls, [['environment', true], ['scenery', false]]); assert.deepEqual(f.hidden, [false, true]);
  f.emit([{target: f.container, isIntersecting: false}]); assert.equal(f.calls.length, 2); assert.equal(f.hidden.length, 2);
  f.emit([{target: f.container, isIntersecting: true}]);
  assert.deepEqual(f.calls.slice(2), [['environment', false], ['scenery', true]]); assert.deepEqual(f.hidden, [false, true, false]);
  assert.deepEqual(f.controlsHidden, f.hidden, 'playback and the shared clock receive the same visibility pause');
  for (const values of [f.dedicatedHidden, f.solarHidden]) assert.deepEqual(values, f.hidden, 'building preparation and capture preserve the same offscreen pause');
  assert(f.buildingHidden.every(value => value === false), 'offscreen does not masquerade as document hidden');
   assert.deepEqual(f.buildingViewport, [true, false, true]);
   assert.deepEqual(f.pauseOrder, f.hidden.flatMap(value => [['controls', value], ['clock', value]]), 'playback resets its time origin before the clock can resume');
});
test('document/GPU pauses take priority and late managers receive the retained offscreen state before activation', () => {
  const f = fixture(false);
  f.emit([{target: f.container, isIntersecting: false}]); assert.equal(f.hidden.at(-1), true); assert.deepEqual(f.calls, []);
  f.run(environmentInit); f.run(sceneryInit); f.run(controlsInit);
  assert.deepEqual(f.environment, [['offscreen', true], ['mode', true]], 'late environment applies offscreen before enabling 3D');
  assert.deepEqual(f.scenery, [false], 'late scenery inherits the actual observer state');
  assert.deepEqual(f.controlsHidden, [true], 'late playback controls inherit offscreen pause before any frame resumes');
  assert.deepEqual(f.pauseOrder.slice(-2), [['controls', true], ['clock', true]]);
  assert.equal(f.hidden.at(-1), true, 'late installation cannot unpause the offscreen shared clock');
  f.context.document.hidden = true; f.run('syncThreeDimensionalVisibility();');
  f.context.document.hidden = false; f.run('syncThreeDimensionalVisibility();');
  assert.deepEqual(f.reclamationHidden, [true, false], 'idle context reclamation tracks document visibility even when the map is offscreen');
  for (const values of [f.dedicatedHidden, f.solarHidden]) assert.equal(values.at(-1), true, 'document visibility cannot resume an offscreen building preparation');
  f.context.document.hidden = true; f.emit([{target: f.container, isIntersecting: true}]);
  assert.equal(f.controlsHidden.at(-1), true); assert.equal(f.hidden.at(-1), true);
  f.context.document.hidden = false; f.context.mapGPUUnavailable = true; f.run('syncThreeDimensionalVisibility();');
  assert.equal(f.controlsHidden.at(-1), true); assert.equal(f.hidden.at(-1), true);
  assert.equal(f.buildingHidden.at(-1), false, 'context loss must not invalidate a resident generation via the document pause path');
   assert.equal(f.buildingViewport.at(-1), true);
   f.context.mapGPUUnavailable = false; f.run('syncThreeDimensionalVisibility();');
  assert.equal(f.controlsHidden.at(-1), false); assert.equal(f.hidden.at(-1), false);
  for (const values of [f.dedicatedHidden, f.solarHidden]) assert.deepEqual(values, f.hidden, 'document and GPU changes cannot override the retained viewport state');
});
