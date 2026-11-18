import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../src/safety/building-detail-residency.ts', import.meta.url), 'utf8');
const compiled = await transform(source, {loader: 'ts', format: 'esm'});
const {createBuildingDetailResidency} = await import('data:text/javascript;base64,' + Buffer.from(compiled.code + '\n//# sourceURL=building-detail-residency-under-test.js').toString('base64'));
const resource = key => Object.freeze({key});
function fixture() {
  const requests = [], publications = [], order = [], releases = new Map(); let failPublish, failClear = false;
  const residency = createBuildingDetailResidency({
    acquire(resource, {signal}) {
      let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      const request = {resource, signal, reject, finish(value = resource.key) { resolve({value, release() {
        releases.set(request, (releases.get(request) || 0) + 1); order.push(['release', resource.key]);
      }}); }};
      requests.push(request); return promise;
    },
    async publish(value, resource) {
      if (failPublish !== undefined && resource?.key === failPublish) throw Error('publish failed');
      if (!resource && failClear) throw Error('clear failed');
      publications.push([value, resource]); order.push(['publish', resource?.key]);
    },
  });
  return {residency, requests, publications, releases, order, failPublish(key) { failPublish = key; }, failClear(value) { failClear = value; }};
}

test('same immutable key reuses pending and published resources; successful replacement publishes before releasing the old lease', async () => {
  const f = fixture(), a = resource('canonical:a:level:1'), b = resource('canonical:b:level:2');
  const first = f.residency.select(a); assert.equal(f.residency.select({...a}), first); assert.equal(f.requests.length, 1);
  f.requests[0].finish(); await first; await f.residency.select({...a}); assert.equal(f.requests.length, 1);
  const second = f.residency.select(b); assert.equal(f.residency.state.published, a); assert.equal(f.releases.size, 0);
  f.requests[1].finish(); await second;
  assert.deepEqual(f.order, [['publish', a.key], ['publish', b.key], ['release', a.key]]);
  assert.equal(f.residency.state.published, b); assert.equal(f.residency.state.status, 'ready');
  await f.residency.destroy(); assert.equal(f.releases.get(f.requests[0]), 1); assert.equal(f.releases.get(f.requests[1]), 1);
});
test('switch cancels old acquisition and a late success is released without publishing', async () => {
  const f = fixture(), a = resource('a'), b = resource('b');
  const first = f.residency.select(a), second = f.residency.select(b); assert.equal(f.requests[0].signal.aborted, true);
  f.requests[1].finish(); await second; f.requests[0].finish(); await first;
  assert.deepEqual(f.publications.map(([, selected]) => selected?.key), ['b']); assert.equal(f.releases.get(f.requests[0]), 1);
  await f.residency.destroy(); assert.equal(f.releases.get(f.requests[0]), 1); assert.equal(f.releases.get(f.requests[1]), 1);
});
test('a failed load or rejected publication keeps the previous success and releases only the failed new lease', async () => {
  const f = fixture(), a = resource('a'), b = resource('b'), c = resource('c');
  const first = f.residency.select(a); f.requests[0].finish(); await first;
  const failed = f.residency.select(b); f.requests[1].reject(Error('load failed')); await assert.rejects(failed, /load failed/);
  assert.equal(f.residency.state.published, a); assert.equal(f.releases.size, 0);
  f.failPublish('c'); const publication = f.residency.select(c); f.requests[2].finish(); await assert.rejects(publication, /publish failed/);
  assert.equal(f.residency.state.published, a); assert.equal(f.releases.get(f.requests[2]), 1); assert.equal(f.releases.has(f.requests[0]), false);
  f.failPublish(undefined); const retry = f.residency.select(c); assert.equal(f.requests.length, 4); f.requests[3].finish(); await retry;
  assert.equal(f.residency.state.published, c); assert.equal(f.residency.state.requested, c);
  await f.residency.destroy(); assert.equal(f.releases.get(f.requests[0]), 1);
});
test('returning to the already published key cancels a pending replacement without reacquiring', async () => {
  const f = fixture(), a = resource('a'); const first = f.residency.select(a); f.requests[0].finish(); await first;
  const replaced = f.residency.select(resource('b')); await f.residency.select({...a}); assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].signal.aborted, true); f.requests[1].finish(); await replaced;
  assert.equal(f.residency.state.published, a); assert.equal(f.residency.state.status, 'ready'); await f.residency.destroy();
});
test('suspension clears and releases current publication, rejects late publication, then reacquires the same requested identity on resume', async () => {
  const f = fixture(), a = resource('a'), b = resource('b');
  const first = f.residency.select(a); f.requests[0].finish(); await first;
  const second = f.residency.select(b); await f.residency.suspend(); await f.residency.suspend();
  assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.residency.state.status, 'suspended'); assert.equal(f.residency.state.published, undefined);
  assert.equal(f.releases.get(f.requests[0]), 1); f.requests[1].finish(); await second; assert.equal(f.releases.get(f.requests[1]), 1);
  const resumed = f.residency.resume(); assert.equal(f.requests[2].resource, b); f.requests[2].finish(); await resumed;
  assert.equal(f.residency.state.published, b); assert.deepEqual(f.publications.map(([, selected]) => selected?.key), ['a', undefined, 'b']);
  await f.residency.destroy(); assert.equal(f.releases.get(f.requests[2]), 1);
});
test('selection during suspension changes only the requested resource, while destroy makes all late leases release once', async () => {
  const f = fixture(); await f.residency.suspend(); const selected = resource('selected-while-suspended'); await f.residency.select(selected);
  assert.equal(f.requests.length, 0); const resumed = f.residency.resume(); assert.equal(f.requests[0].resource, selected);
  await f.residency.destroy(); await f.residency.destroy(); assert.equal(f.requests[0].signal.aborted, true);
  f.requests[0].finish(); await resumed; await f.residency.resume(); await f.residency.select(resource('ignored'));
  assert.equal(f.releases.get(f.requests[0]), 1); assert.equal(f.publications.length, 0); assert.equal(f.residency.state.status, 'destroyed'); assert.equal(f.requests.length, 1);
});
test('explicit empty selection clears publication before release and aborts pending work without a late commit', async () => {
  const f = fixture(); const first = f.residency.select(resource('a')); f.requests[0].finish(); await first;
  const second = f.residency.select(resource('b')); await f.residency.select(undefined);
  assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.residency.state.status, 'idle');
  assert.deepEqual(f.order, [['publish', 'a'], ['publish', undefined], ['release', 'a']]);
  f.requests[1].finish(); await second; assert.equal(f.releases.get(f.requests[1]), 1); await f.residency.destroy();
});
test('a rejected clear retains the consumer lease until suspension or destroy clearing can actually commit', async () => {
  const f = fixture(), a = resource('a'); const first = f.residency.select(a); f.requests[0].finish(); await first;
  f.failClear(true); await assert.rejects(f.residency.suspend(), /clear failed/);
  assert.equal(f.residency.state.published, a); assert.equal(f.releases.size, 0);
  f.failClear(false); await f.residency.suspend(); assert.equal(f.releases.get(f.requests[0]), 1);
  const resumed = f.residency.resume(); f.requests[1].finish(); await resumed;
  f.failClear(true); await assert.rejects(f.residency.destroy(), /clear failed/); assert.equal(f.releases.has(f.requests[1]), false);
  f.failClear(false); await f.residency.destroy(); await f.residency.destroy(); assert.equal(f.releases.get(f.requests[1]), 1);
});
test('a deferred drawable fence keeps the previous lease and loading status until success, and rejects without replacing it', async () => {
  const fences = [], released = [], residency = createBuildingDetailResidency({
    async acquire(resource) { return {value: resource.key, release() { released.push(resource.key); }}; },
    publish(value, resource, context) { return new Promise((resolve, reject) => fences.push({value, resource, ...context, resolve, reject})); },
  });
  const started = async count => { while (fences.length < count) await Promise.resolve(); };
  const a = resource('a'), b = resource('b'), c = resource('c');
  const first = residency.select(a); await started(1); assert.equal(residency.state.status, 'loading'); assert.equal(residency.state.published, undefined);
  fences[0].resolve(); await first;
  const second = residency.select(b); await started(2); assert.equal(residency.state.published, a); assert.equal(residency.state.status, 'loading'); assert.deepEqual(released, []);
  fences[1].reject(Error('not drawable')); await assert.rejects(second, /not drawable/); assert.equal(residency.state.published, a); assert.deepEqual(released, ['b']);
  const third = residency.select(c); await started(3); fences[2].resolve(); await third;
  assert.equal(residency.state.published, c); assert.deepEqual(released, ['b', 'a']);
  const destroy = residency.destroy(); await started(4); assert.deepEqual(released, ['b', 'a']); fences[3].resolve(); await destroy; assert.deepEqual(released, ['b', 'a', 'c']);
});
test('latest selection aborts a pending publication fence and a late success cannot become resident', async () => {
  const fences = [], released = [], residency = createBuildingDetailResidency({
    async acquire(resource) { return {value: resource.key, release() { released.push(resource.key); }}; },
    publish(value, resource, context) { return new Promise(resolve => fences.push({value, resource, ...context, resolve})); },
  });
  const started = async count => { while (fences.length < count) await Promise.resolve(); };
  const a = resource('a'), b = resource('b'), c = resource('c');
  const first = residency.select(a); await started(1); fences[0].resolve(); await first;
  const old = residency.select(b); await started(2); const latest = residency.select(c); await started(3);
  assert.equal(fences[1].signal.aborted, true); assert(fences[2].requestId > fences[1].requestId); assert.equal(residency.state.published, a);
  fences[2].resolve(); await latest; fences[1].resolve(); await old;
  assert.equal(residency.state.published, c); assert.deepEqual(released, ['a', 'b']);
  const paused = residency.suspend(); await started(4); assert.equal(residency.state.published, c); assert.equal(released.includes('c'), false);
  fences[3].resolve(); await paused; assert.equal(residency.state.published, undefined); assert.equal(released.filter(key => key === 'c').length, 1);
  await residency.destroy();
});

test('focus exit clears and releases old detail before starting replacement acquisition',async()=>{
 const f=fixture();const first=f.residency.select(resource('old-near'));f.requests[0].finish();await first;
 const next=f.residency.select(resource('new-near'),{releaseBeforeAcquire:true});
 assert.equal(f.requests.length,1,'no new allocation before the clear fence');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.requests.length,2);assert.equal(f.releases.get(f.requests[0]),1);
 assert.deepEqual(f.order,[['publish','old-near'],['publish',undefined],['release','old-near']]);
 f.requests[1].finish();await next;await f.residency.destroy();
 assert.equal(f.releases.get(f.requests[1]),1);
});
test('failed focus-exit clear cannot release visible resources or start a replacement',async()=>{
 const f=fixture();const first=f.residency.select(resource('old'));f.requests[0].finish();await first;
 f.failClear(true);await assert.rejects(f.residency.select(resource('next'),{releaseBeforeAcquire:true}),/clear failed/);
 assert.equal(f.requests.length,1);assert.equal(f.releases.size,0);assert.equal(f.residency.state.published.key,'old');
 f.failClear(false);await f.residency.destroy();assert.equal(f.releases.get(f.requests[0]),1);
});
test('rapid focus changes cannot start an obsolete replacement after clearing',async()=>{
 const f=fixture();const first=f.residency.select(resource('old'));f.requests[0].finish();await first;
 const middle=f.residency.select(resource('middle'),{releaseBeforeAcquire:true});
 const latest=f.residency.select(resource('latest'),{releaseBeforeAcquire:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.requests.length,2);assert.equal(f.requests[1].resource.key,'latest');
 f.requests[1].finish();await Promise.all([middle,latest]);await f.residency.destroy();
 assert.equal(f.releases.get(f.requests[0]),1);assert.equal(f.releases.get(f.requests[1]),1);
});
