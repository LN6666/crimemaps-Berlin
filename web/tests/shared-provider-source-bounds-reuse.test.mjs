import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Evaluate the actual plan factory, without importing city data or GPU code.
function fixture(provider) {
  const root = provider === 'root500';
  const file = root ? 'root500-prepared-program-plan' : 'tier300-prepared-data-plan';
  const name = root ? 'createRoot500PreparedProgramPlan' : 'createTier300PreparedDataPlan';
  const source = fs.readFileSync(new URL(`../src/painted/${provider}/safety/${file}.ts`, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file + '.ts', source, ts.ScriptTarget.Latest, true);
  const factory = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(factory);
  let descriptions = 0, held = 0, allow = true, disposed = false;
  const scope = {get stats() { return {disposed}; }};
  const budget = {tryReserve(cost, options) {
    assert.equal(cost.category, 'metadata'); assert.equal(options.evict, false);
    if (!allow) return {ok: false};
    held += cost.bytes; let live = true;
    return {ok: true, reservation: {release() { if (live) { live = false; held -= cost.bytes; } }}};
  }};
  const deps = {
    createPreparedSourceWorkspace: () => ({release() {}, clearPreparedSource() {}, preparedSourceStats: {sourceCharacters: 0}}),
    paintProgramPartitionEnabled: () => true,
    facadePaintSpecializationForCity: () => ({}),
    describeFacadePaintSourceBounds: (_city, key) => {
      descriptions++;
      return Object.freeze({sourceCharactersUpperBound: 100, paintSourceCharactersUpperBound: 100,
        assemblyCharactersUpperBound: 500, authorityTrace: Object.freeze(['fixture', key ?? 'city'])});
    },
    clearRoot500PaintSources() {}, clearTier300PaintSources() {},
    prepareRoot500ProgramData: async () => {},
    PROGRAM_SOURCE_PROVENANCE: [], nextPlan: 0,
  };
  const module = {exports: {}};
  const code = ts.transpileModule(factory.getText(ast), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  new Function(...Object.keys(deps), 'module', 'exports', code)(...Object.values(deps), module, module.exports);
  const make = () => {
    const plan = module.exports[name]({identity: 'test', id: 1, city: 'berlin', scope, budget});
    plan.prepareMetadata(); return plan;
  };
  return {make, descriptions: () => descriptions, held: () => held,
    deny: () => { allow = false; }, dispose: () => { disposed = true; }};
}

for (const provider of ['root500', 'tier300']) {
  test(`${provider}: pending families reuse a metered raw descriptor`, () => {
    const f = fixture(provider), plan = f.make(), first = plan.describeSourceBounds('base');
    for (let i = 0; i < 45; i++) assert.strictEqual(plan.describeSourceBounds('base'), first);
    assert.equal(f.descriptions(), 1, 'unchanged plan/source must not rescan shader text for each pending family');
    assert.ok(f.held() > 0, 'retained metadata needs a page-budget reservation');
    plan.release(); assert.equal(f.held(), 0);
    assert.throws(() => plan.describeSourceBounds('base'), {name: 'AbortError'});
  });
  test(`${provider}: a denied descriptor reservation falls back without retained metadata`, () => {
    const f = fixture(provider); f.deny(); const plan = f.make();
    assert.deepEqual(plan.describeSourceBounds('base'), plan.describeSourceBounds('base'));
    assert.equal(f.descriptions(), 2); assert.equal(f.held(), 0);
    plan.release();
  });
  test(`${provider}: descriptor ownership does not cross plans or outlive a disposed scope`, () => {
    const f = fixture(provider), a = f.make(), b = f.make();
    a.describeSourceBounds('base'); b.describeSourceBounds('base');
    assert.equal(f.descriptions(), 2);
    f.dispose(); assert.throws(() => a.describeSourceBounds('base'), {name: 'AbortError'});
    a.release(); b.release(); assert.equal(f.held(), 0);
  });
}

test('root500: source selection replaces the single retained descriptor', () => {
  const f = fixture('root500'), plan = f.make();
  plan.describeSourceBounds('base'); plan.describeSourceBounds('owner'); plan.describeSourceBounds('base');
  assert.equal(f.descriptions(), 3); plan.release(); assert.equal(f.held(), 0);
});

test('root500: repair and program-data preparation invalidate retained source descriptions', async () => {
  const f = fixture('root500'), plan = f.make();
  plan.describeSourceBounds('base');
  plan.prepareRepair(() => true); plan.describeSourceBounds('base');
  assert.equal(f.descriptions(), 2);
  await plan.preparePrograms(['base'], new AbortController().signal);
  plan.describeSourceBounds('base'); assert.equal(f.descriptions(), 3);
  plan.release(); assert.equal(f.held(), 0);
});

for (const provider of ['root500', 'tier300']) {
  test(`${provider}: family requests share an assembly envelope but different helpers do not`, () => {
    const f = fixture(provider), plan = f.make(); let builds = 0;
    const build = raw => { builds++; return Object.freeze({...raw, assemblyCharactersUpperBound: 800}); };
    const describe = helper => provider === 'root500'
      ? plan.describeAssemblyBounds('base', helper, false, build)
      : plan.describeAssemblyBounds(helper, build);
    const first = describe('helper');
    for (let i = 0; i < 45; i++) assert.strictEqual(describe('helper'), first);
    assert.equal(builds, 1);
    describe('other'); describe('helper'); assert.equal(builds, 3, 'single-entry bounded retention');
    if (provider === 'root500') {
      plan.describeAssemblyBounds('base', 'helper', true, build);
      plan.describeAssemblyBounds('owner', 'helper', true, build);
      assert.equal(builds, 5, 'pruning and source selection change the assembly');
    }
    plan.release(); assert.equal(f.held(), 0);
    assert.throws(() => describe('helper'), {name: 'AbortError'});
  });
}
