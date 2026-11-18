import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// One bounded original inline recipe, not a generated model or a provider graph.
// All exact SOURCE, complete-group, recovery and material guards remain real.
test('cold F278 inline resources prepare original SOURCE then DERIVED for a new scope and feed the actual guarded reconstruction and materials', async t => {
  const web = new URL('../', import.meta.url).pathname;
  const built = await build({absWorkingDir: web, stdin: {contents: `
    export {createFrozenDataScope} from './src/safety/frozen-data-scope';
    export {getSOURCE,getDERIVED,prepareF278Source,BINDINGS} from './src/painted/infill/safety/f278-pinned-data';
    export {OWNER_SHAPE_PATCH_PROFILES as PROFILES} from './src/painted/infill/safety/f278-original-profiles';
    export {nativePaintSignature} from './src/painted/infill/safety/f278-original-signature';
    export {f278Ready594} from './src/painted/infill/safety/f278-original-recovery';
    export {prepareInfillData,infillF278OriginalReconstruction,infillF278OriginalBaseMaterials} from './src/painted/infill/safety/infill-f278-original';
  `, resolveDir: web, sourcefile: 'f278-real-resource-entry.ts', loader: 'ts'}, bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', target: 'es2022'});
  const inputBytes = Object.values(built.metafile.inputs).reduce((sum, input) => sum + input.bytes, 0);
  assert(inputBytes < 1024 * 1024, 'the original inline recipe stays below this bounded one-MiB fixture input');
  const originalParse = JSON.parse, modelParses = [];
  let phase = 'cold', acquisitions = 0, fetches = 0;
  t.mock.method(JSON, 'parse', function(value, ...args) {
    if (typeof value === 'string' && /"positions"\s*:\s*\[/.test(value) && /"indices"\s*:\s*\[/.test(value)) {
      assert.notEqual(phase, 'cold', 'cold import must not decode original model JSON');
      modelParses.push({phase, characters: value.length});
    }
    return Reflect.apply(originalParse, this, [value, ...args]);
  });
  t.mock.method(globalThis, 'fetch', () => { fetches++; throw Error('Inline F278 preparation must not fetch an asset'); });
  const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text + '\n//# sourceURL=infill-cold-resource-preparation-under-test.js').toString('base64'));
  assert.deepEqual(modelParses, []);
  const client = {acquire() { acquisitions++; throw Error('Inline F278 preparation must not acquire a frozen model'); }};
  const seed = api.createFrozenDataScope(client), selected = api.createFrozenDataScope(client), wrong = api.createFrozenDataScope(client), changed = api.createFrozenDataScope(client);
  t.after(() => { for (const scope of [seed, selected, wrong, changed]) scope.release(); });
  const signal = new AbortController().signal;
  for (const scope of [seed, selected, wrong]) {
    assert.throws(() => api.getSOURCE(scope), /SOURCE payload was not prepared/);
    assert.throws(() => api.getDERIVED(scope), /DERIVED payload was not prepared/);
  }
  assert.throws(() => api.getSOURCE(undefined), /prepared FrozenDataScope/);
  phase = 'seed-source'; await api.prepareF278Source(signal, seed);
  const source = api.getSOURCE(seed), original = structuredClone(source);
  assert.equal(source.length, api.BINDINGS.length); assert.equal(source.length, 2);
  for (const binding of api.BINDINGS) {
    const component = source.find(row => row.objectId === binding.objectId && row.partId === binding.partId);
    assert(component); assert.equal(api.nativePaintSignature(component), binding.geometrySignature); assert.deepEqual(component.origin, binding.origin);
  }
  assert.equal(api.getSOURCE(seed), source); assert.throws(() => api.getDERIVED(seed), /not prepared/);
  assert.deepEqual(modelParses, [], 'the SOURCE literal does not implicitly decode DERIVED');
  phase = 'selected-prepare'; await api.prepareInfillData(source, signal, selected);
  const selectedSource = api.getSOURCE(selected), derived = api.getDERIVED(selected);
  assert.deepEqual(selectedSource, source); assert.notStrictEqual(selectedSource, source); assert.notStrictEqual(selectedSource[0].batches[0].positions, source[0].batches[0].positions);
  assert.equal(derived.length, api.PROFILES.length); assert.equal(derived.length, 2); assert(modelParses.length > 0);
  assert(modelParses.every(row => row.phase === 'selected-prepare'));
  const parses = modelParses.length;
  await api.prepareInfillData(source, signal, selected);
  assert.strictEqual(api.getSOURCE(selected), selectedSource); assert.strictEqual(api.getDERIVED(selected), derived); assert.equal(modelParses.length, parses);
  assert.throws(() => api.getSOURCE(wrong), /not prepared/); assert.throws(() => api.getDERIVED(wrong), /not prepared/);
  const same = (a, b) => a.objectId === b.objectId && a.partId === b.partId;
  const native = component => api.BINDINGS.find(binding => same(component, binding))?.leafSHA256;
  const owner = component => api.PROFILES.find(profile => same(component, profile))?.sha256;
  const raw = [...source, ...derived];
  assert.equal(api.f278Ready594(raw, native, owner), true, 'the original complete SOURCE, derived signatures, GLSL and profile guards all pass');
  assert.equal(api.f278Ready594(raw.slice(1), native, owner), false, 'an incomplete original group remains rejected');
  const result = api.infillF278OriginalReconstruction(source, selected);
  assert.equal(result.stats.error, undefined); assert.equal(result.stats.objects, 4); assert(result.stats.vertices > 0); assert.equal(result.stats.actualVisualAccepted, false);
  assert.deepEqual(result.components.map(row => [row.objectId, row.partId]), raw.map(row => [row.objectId, row.partId]));
  assert.deepEqual(source, original, 'the guarded consumer preserves its original SOURCE input');
  const vertices = result.components.reduce((sum, component) => sum + component.batches.reduce((count, batch) => count + batch.positions.length / 3, 0), 0);
  const paint = new Float32Array(vertices * 4).fill(-1), frames = new Float32Array(vertices * 5).fill(-1);
  const material = api.infillF278OriginalBaseMaterials(result.components, paint, frames);
  assert.equal(material.objects, 4); assert.equal(material.vertices, vertices);
  assert.deepEqual(paint, Float32Array.from(result.components.flatMap(component => component.batches.flatMap(batch => batch.paint))));
  assert.deepEqual(frames, Float32Array.from(result.components.flatMap(component => component.batches.flatMap(batch => batch.frames))));
  const badSource = structuredClone(source); badSource[0].batches[0].positions[0] += 1;
  phase = 'changed-source'; await api.prepareInfillData(badSource, signal, changed);
  assert.equal(api.getSOURCE(changed).length, 2); assert.throws(() => api.getDERIVED(changed), /not prepared/); assert.equal(modelParses.length, parses, 'the exact SOURCE guard runs before DERIVED preparation');
  const rejected = api.infillF278OriginalReconstruction(badSource, changed);
  assert.equal(rejected.components, badSource); assert.match(rejected.stats.error, /original source changed/); assert.equal(rejected.stats.objects, 0);
  selected.release(); assert.equal(selected.stats.disposed, true);
  assert.throws(() => api.getSOURCE(selected), {name: 'AbortError'}); assert.throws(() => api.getDERIVED(selected), {name: 'AbortError'});
  assert.strictEqual(api.getSOURCE(seed), source, 'disposing one scope does not invalidate another prepared scope');
  assert.equal(acquisitions, 0); assert.equal(fetches, 0);
  t.diagnostic(JSON.stringify({inputBytes, sourceRows: source.length, derivedRows: derived.length, modelParses: parses, restoredObjects: result.stats.objects, vertices, acquisitions, fetches, actualVisualAccepted: false}));
});
