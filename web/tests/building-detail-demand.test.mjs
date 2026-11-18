import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const compiled = await build({entryPoints: [new URL('../src/safety/building-detail-demand.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {parseBuildingDetailDemand, selectBuildingDetailResource, buildingDetailMayContainPick, buildingDetailPeripheralLevel, selectBuildingDetailFocusResource} = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text + '\n//# sourceURL=building-detail-demand-under-test.js').toString('base64'));
const hash = digit => digit.repeat(64);
const descriptor = (name, digit) => ({path: `/safety/buildings3d/detail/${name}.json`, sha256: hash(digit), bytes: 100});
function input() {
  const canonicalLeaf = {id: 'leaf-1', ...descriptor('canonical', '2')};
  return {schema: 'crimemaps-building-detail-demand-v1', schemaVersion: 1, city: 'berlin', canonicalIndex: descriptor('index', '1'), canonicalLeaf,
    bindings: {sourcePBFSHA256: hash('3'), boundarySHA256: hash('4'), compilerSHA256: hash('5'), sourceSnapshot: 'fixture', materialSHA256: hash('6'), producerSHA256: hash('7'), protectionSHA256: hash('8'), sourceEquivalenceSHA256: hash('9')},
    components: [{objectId: 'osm/way/1', partId: 'component/1', origin: [13, 52], box: [-.1, 0, -.1, .1, .2, .1], protected: false}],
    near: {level: 'near', asset: descriptor('canonical', '2'), geometrySHA256: hash('a'), vertices: 100, triangles: 80},
    variants: [{level: 'mid', asset: descriptor('mid', 'b'), geometrySHA256: hash('c'), vertices: 60, triangles: 40, errors: [{componentIndex: 0, errorM: .1, normalDeviationRad: .01}]},
      {level: 'coarse', asset: descriptor('coarse', 'd'), geometrySHA256: hash('e'), vertices: 30, triangles: 20, errors: [{componentIndex: 0, errorM: .5, normalDeviationRad: .02}]}]};
}
const expected = {city: 'berlin', canonicalIndexSHA256: hash('1'), canonicalLeafSHA256: hash('2')};
const parse = value => parseBuildingDetailDemand(value, expected);
const matrix = scale => [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
const viewport = {cssWidth: 100, cssHeight: 100, drawingBufferWidth: 100, drawingBufferHeight: 100};
const demand = (overrides = {}) => ({pass: 'main', project: () => ({matrix: matrix(.01), viewport}), maxErrorCssPx: 1, maxErrorDrawingBufferPx: 1, ...overrides});
const level = (index, demands, previous) => selectBuildingDetailResource(index, demands, previous).resource.level;

test('single-level choice checks every declared pass and both actual pixel budgets', () => {
  const index = parse(input());
  assert.equal(level(index, [demand()]), 'coarse');
  assert.equal(level(index, [demand({maxErrorCssPx: .2, maxErrorDrawingBufferPx: .2})]), 'mid');
  assert.equal(level(index, [demand({project: () => ({matrix: matrix(.01), viewport: {...viewport, drawingBufferWidth: 400, drawingBufferHeight: 400}})})]), 'mid', 'DPR/buffer scaling is measured independently of CSS size');
  const passes = [demand(), demand({pass: 'reflection', project: () => ({matrix: matrix(.1), viewport})})];
  assert.equal(level(index, passes), 'mid', 'a more detailed reflection pass prevents a coarse main-only choice');
  assert.equal(level(index, [...passes, demand({pass: 'shadow', maxErrorCssPx: .01})]), 'near');
  const chosen = selectBuildingDetailResource(index, passes);
  assert.deepEqual(chosen.passes, ['main', 'reflection']); assert.equal(chosen.thresholdsCalibrated, false);
  assert.equal(chosen.resource.componentCount, 1); assert.equal(chosen.resource.components, index.components);
  const far = selectBuildingDetailResource(index, [demand()]).resource, near = selectBuildingDetailResource(index, [demand({pass: 'picking'})]).resource;
  assert.deepEqual([far.vertices, far.triangles], [30, 20]);
  assert.deepEqual([near.vertices, near.triangles], [100, 80]);
});
test('perspective Jacobian includes depth sensitivity and bounds nonlinear displacement over the expanded box', () => {
  const raw = input(); raw.components[0].box = [-.01, 0, 0, .01, .01, .01]; raw.variants = [raw.variants[0]];
  const index = parse(raw), perspective = matrix(.01); perspective[12] = 1; perspective[11] = .9;
  assert.equal(level(index, [demand({project: () => ({matrix: perspective, viewport}), maxErrorCssPx: 1, maxErrorDrawingBufferPx: 1})]), 'near', 'small extent does not imply small perspective error');
  assert.equal(level(index, [demand({project: () => ({matrix: perspective, viewport}), maxErrorCssPx: 20, maxErrorDrawingBufferPx: 20})]), 'mid');
  const directDisplacement = Math.abs(1 / (1 - .9 * .1) - 1) * viewport.cssWidth / 2;
  assert(directDisplacement > 1, 'the source displacement can exceed the rejected pixel budget');
});
test('unknown projection, nonpositive budgets, and canonical or expanded near-plane crossings retain canonical geometry', () => {
  const index = parse(input());
  for (const invalid of [demand({project: () => undefined}), demand({maxErrorCssPx: 0}), demand({maxErrorDrawingBufferPx: undefined}), demand({project: () => ({matrix: [1], viewport})})]) assert.equal(level(index, [invalid]), 'near');
  const behind = matrix(.01); behind[15] = -1;
  assert.equal(selectBuildingDetailResource(index, [demand({project: () => ({matrix: behind, viewport})})]).reason, 'near-plane');
  const crossing = matrix(.01); crossing[10] = 1; crossing[14] = -.85;
  assert.equal(selectBuildingDetailResource(index, [demand({project: () => ({matrix: crossing, viewport})})]).reason, 'near-plane', 'the epsilon-expanded error domain also must stay before the near plane');
});
test('picking, selected, forced, empty and existing 32/48 projected near hysteresis all retain canonical as required', () => {
  const index = parse(input());
  for (const demands of [[], [demand({pass: 'picking'})], [demand({selected: true})], [demand({forceCanonical: true})]]) assert.equal(level(index, demands), 'near');
  const size40 = demand({project: () => ({matrix: matrix(4), viewport}), maxErrorCssPx: 1000, maxErrorDrawingBufferPx: 1000});
  assert.equal(level(index, [size40], 'near'), 'near'); assert.equal(level(index, [size40], 'mid'), 'coarse');
});
test('every component origin is projected, while sparse exact-planar errors can select a genuine reduced resource', () => {
  const raw = input(); raw.components.push({...raw.components[0], objectId: 'osm/way/2', partId: 'component/2', origin: [14, 53], protected: true});
  raw.variants[1].errors[0].errorM = 0; raw.variants[1].errors[0].normalDeviationRad = 0;
  const index = parse(raw), origins = [];
  assert.equal(level(index, [demand({project: origin => { origins.push(origin); return {matrix: matrix(.01), viewport}; }})]), 'coarse');
  assert.deepEqual(origins, [[13, 52], [14, 53]]);
  assert.equal(level(index, [demand({project: origin => origin[0] === 14 ? undefined : {matrix: matrix(.01), viewport}})]), 'near');
});
test('resource keys bind canonical, selected geometry, material, producer, protection and source-equivalence identities', () => {
  const original = parse(input()), chosen = selectBuildingDetailResource(original, [demand()]).resource;
  for (const field of ['materialSHA256', 'producerSHA256', 'protectionSHA256', 'sourceEquivalenceSHA256', 'sourcePBFSHA256', 'boundarySHA256', 'compilerSHA256']) {
    const changed = input(); changed.bindings[field] = hash('f'); assert.notEqual(selectBuildingDetailResource(parse(changed), [demand()]).resource.key, chosen.key);
  }
  assert.notEqual(selectBuildingDetailResource(original, [demand({pass: 'picking'})]).resource.key, chosen.key);
  assert(Object.isFrozen(original)); assert(Object.isFrozen(original.components[0].box)); assert(Object.isFrozen(chosen));
});
test('parser rejects unbound identities, old aliases, fake reductions, invalid sparse errors and changed protected components', () => {
  const invalid = [
    value => { value.canonicalLeaf.sha256 = hash('f'); }, value => { value.bindings.producerSHA256 = 'bad'; },
    value => { value.near.asset.bytes++; }, value => { value.variants[0].asset = {...value.near.asset}; },
    value => { value.variants[0].asset.path = '/safety/buildings3d/../old.json'; }, value => { value.variants[0].vertices = value.near.vertices; },
    value => { value.variants[1].triangles = value.variants[0].triangles; }, value => { value.variants[0].errors.push({...value.variants[0].errors[0]}); },
    value => { value.variants[0].errors[0].componentIndex = 1; }, value => { value.variants[0].errors[0].errorM = -1; },
    value => { value.components[0].protected = true; }, value => { value.variants[0].geometrySHA256 = value.near.geometrySHA256; },
    value => { value.components[0].protected = true; value.variants[0].errors[0].errorM = 0; },
    value => { value.components = Array.from({length: 20001}, (_, i) => ({...value.components[0], partId: `part/${i}`})); },
    value => { value.near.vertices = 200001; }, value => { value.near.triangles = 400001; },
    value => { value.variants[0].vertices = 200001; }, value => { value.variants[0].triangles = 400001; },
  ];
  for (const mutate of invalid) { const value = input(); mutate(value); assert.throws(() => parse(value)); }
  const protectedExact = input(); protectedExact.components[0].protected = true;
  for (const variant of protectedExact.variants) for (const error of variant.errors) { error.errorM = 0; error.normalDeviationRad = 0; }
  assert.doesNotThrow(() => parse(protectedExact));
});


test('canonical pick demand uses CSS projection candidates and preserves unknown/near-plane demand', () => {
 const index=parse(input()), project=()=>({matrix:matrix(.01),viewport:{...viewport,drawingBufferWidth:400,drawingBufferHeight:400}});
 assert.equal(buildingDetailMayContainPick(index,{x:50,y:50},project),true);
 assert.equal(buildingDetailMayContainPick(index,{x:5,y:5},project),false,'DPR does not rescale a CSS pick point');
 assert.equal(buildingDetailMayContainPick(index,{x:5,y:5},()=>undefined),true);
 const near=matrix(.01);near[15]=0;
 assert.equal(buildingDetailMayContainPick(index,{x:5,y:5},()=>({matrix:near,viewport})),true);
 const grow={components:[{...index.components[0],box:[-.1,1,0,.1,2,.1]}]};
 assert.equal(buildingDetailMayContainPick(grow,{x:50,y:50},()=>({matrix:matrix(.5),viewport})),true,'canonical ground/grow envelope includes y=0');
});


test('independent group metadata keeps wire and inflated bounds separate', () => {
 const raw=input(), asset={path:'/safety/buildings3d/detail/groups-'+hash('a')+'.json.gz',sha256:hash('a'),bytes:500000,compression:'gzip',uncompressed_bytes:8*1024**2,uncompressed_sha256:hash('b')};
 raw.groupMetadata=asset;
 const selected=selectBuildingDetailResource(parse(raw),[demand()]).resource;
 assert.deepEqual(selected.groupMetadata,asset);
 for(const change of [{bytes:500001},{uncompressed_bytes:8*1024**2+1},{uncompressed_sha256:'invalid'}]) {
  assert.throws(()=>parse({...raw,groupMetadata:{...asset,...change}}),/metadata|uncompressed|SHA256/);
 }
});

test('focus selection keeps the plan level unless a pass requires canonical geometry', () => {
  const index = parse(input());
  assert.equal(buildingDetailPeripheralLevel(index, [demand()]), 'coarse');
  const noCoarse = parse({...input(), variants: [input().variants[0]]}); assert.equal(buildingDetailPeripheralLevel(noCoarse, [demand()]), 'mid');
  const none = parse({...input(), variants: []}); assert.equal(buildingDetailPeripheralLevel(none, [demand()]), 'near', 'canonical-only stays the real canonical leaf');
  for (const hard of [demand({pass: 'picking'}), demand({forceCanonical: true}), demand({selected: true})]) {
    assert.equal(buildingDetailPeripheralLevel(index, [hard]), 'near');
    assert.equal(selectBuildingDetailFocusResource(index, [hard], 'coarse').resource.level, 'near', 'picking, selection and forced canonical passes win over a plan');
  }
  assert.equal(buildingDetailPeripheralLevel(index, []), 'near');
  const tight = [demand({maxErrorCssPx: .01, maxErrorDrawingBufferPx: .01})];
  assert.equal(selectBuildingDetailResource(index, tight).resource.level, 'near', 'the ordinary error budget wants canonical geometry');
  const pinned = selectBuildingDetailFocusResource(index, tight, 'coarse');
  assert.equal(pinned.resource.level, 'coarse'); assert.equal(pinned.reason, 'focus');
  assert.equal(pinned.resource.key, selectBuildingDetailResource(index, [demand()]).resource.key, 'one level has one resource identity whichever path selects it');
  assert.equal(selectBuildingDetailFocusResource(noCoarse, tight, 'coarse').resource.level, 'near', 'a missing level never invents geometry');
});
