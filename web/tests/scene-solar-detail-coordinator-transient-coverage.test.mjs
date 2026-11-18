import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Bundle the live coordinator and its actual epoch dependency. Importing the
// existing test file would also run its unrelated cases, so only its small
// scalar-provider fixture shape is reused here.
const output = await build({
  entryPoints: [new URL('../src/safety/scene-solar-detail-coordinator.ts', import.meta.url).pathname],
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const {createSceneSolarDetailCoordinator} = await import('data:text/javascript;base64,' +
  Buffer.from(output.outputFiles[0].text).toString('base64'));

function fixture() {
  const providers = ['city', 'root500'], calls = [];
  const completeCoverage = {bounds: [0, 0, 0, 2, 2, 2], triangles: 12, draws: 2, complete: true};
  let coverage = completeCoverage;
  let sourceRevision = 'unchanged-unforced-geometry';
  const states = new Map(providers.map(provider => [provider, {
    ready: true,
    settlement: {
      requestRevision: 1, readyRequestRevision: 1,
      generation: 1, readyGeneration: 1, pending: false,
      // A nonempty native provider can have no additional detail envelope.
      canonical: {kind: 'empty', generation: 1},
    },
  }]));
  const core = createSceneSolarDetailCoordinator({
    providers,
    readProvider: provider => states.get(provider),
    requestRefresh: provider => {
      calls.push(provider);
      states.get(provider).settlement.pending = true;
    },
    readSourceRevision: () => sourceRevision,
    readUnforcedCoverage: () => coverage,
    requestRepaint() {},
  });
  core.setContext('unchanged-context');
  return {
    core, calls, completeCoverage, states,
    setCoverage(value) { coverage = value; },
    setSourceRevision(value) { sourceRevision = value; },
    beginDispatchedRequests() {
      for (const {settlement} of states.values()) {
        settlement.requestRevision++;
        // The old ready draw can remain visible while its successor is pending.
        settlement.pending = true;
      }
    },
    settleDispatchedRequests() {
      for (const {settlement} of states.values()) {
        settlement.readyRequestRevision = settlement.requestRevision;
        settlement.readyGeneration = settlement.generation;
        settlement.pending = false;
      }
    },
  };
}

test('transient undefined resident coverage preserves the dispatched epoch-zero request floor', () => {
  // The incomplete-object control runs first. Neither sequence changes context,
  // source revision, restored geometry/bounds, or the already-dispatched request.
  // This constructs a feedback condition; it is not a native-failure diagnosis.
  for (const transient of ['incomplete-object', 'undefined']) {
    const f = fixture();
    f.core.update();
    assert.deepEqual(f.calls, ['city', 'root500'], `${transient}: one initial dispatch`);
    assert.equal(f.core.state.epochId, undefined, 'no real capture has established an epoch');
    f.beginDispatchedRequests();
    f.setCoverage(transient === 'undefined' ? undefined : {...f.completeCoverage, complete: false});
    f.core.update();
    assert.equal(f.core.capturePending, true, `${transient}: unknown coverage must block capture`);
    assert.equal(f.core.capturePlan(), undefined, `${transient}: no plan while the request is unsettled`);

    f.settleDispatchedRequests();
    f.setCoverage(f.completeCoverage);
    f.core.update();
    assert.deepEqual(f.calls, ['city', 'root500'],
      `${transient}: completing request N+1 must acknowledge its original floor, not dispatch epoch zero again`);
    assert.equal(f.core.capturePlan()?.kind, 'witness', `${transient}: the completed original request can now capture`);
    f.core.update();
    assert.equal(f.calls.length, 2, `${transient}: stable evidence must not poll-refresh`);
  }
});

function proof(f, contextKey = 'unchanged-context') {
  const plan = f.core.capturePlan();
  assert(plan, 'a real issued plan must precede its publication event');
  return {kind: 'published-capture', contextKey, revision: plan.revision, bounds: plan.bounds, complete: true};
}

function readyReceiver(f) {
  f.core.update();
  f.beginDispatchedRequests();
  f.settleDispatchedRequests();
  f.core.update();
  assert.equal(f.core.capturePlan()?.kind, 'witness');
  f.core.publication(proof(f));
  f.core.update();
  f.beginDispatchedRequests();
  f.settleDispatchedRequests();
  f.core.update();
  assert.equal(f.core.capturePlan()?.kind, 'epoch');
  const currentProof = proof(f);
  f.core.publication(currentProof);
  f.core.update();
  assert.equal(f.core.state.receiverReady, true);
  return currentProof;
}

test('transient unknown coverage followed by cancellation or reset cannot dispatch or revive prior publication', () => {
  for (const cancel of ['inactive-context', 'reset']) {
    const f = fixture(), oldProof = readyReceiver(f), calls = f.calls.length;
    f.core.publication(oldProof);
    f.states.get('city').ready = false;
    f.setCoverage(undefined);
    f.core.update();
    assert.equal(f.core.capturePending, true);
    assert.equal(f.core.state.receiverReady, false);
    assert.equal(f.core.capturePlan(), undefined);
    assert.equal(f.core.projectionFor([0, 0, 0, 1, 1, 1]), undefined);
    if (cancel === 'reset') f.core.reset();
    else f.core.setContext(undefined);
    f.states.get('city').ready = true;
    f.setCoverage(f.completeCoverage);
    f.core.publication(oldProof);
    for (let frame = 0; frame < 3; frame++) f.core.update();
    assert.equal(f.calls.length, calls, cancel + ': inactive coordinator must not dispatch');
    assert.equal(f.core.state.epochId, undefined);
    assert.equal(f.core.state.receiverReady, false);
    assert.equal(f.core.capturePending, false);
    assert.equal(f.core.capturePlan(), undefined);
    assert.equal(f.core.projectionFor([0, 0, 0, 1, 1, 1]), undefined);
  }
});

test('a real context change after transient unknown coverage requires a new baseline request floor', () => {
  const f = fixture();
  f.core.update();
  f.beginDispatchedRequests();
  f.settleDispatchedRequests();
  f.core.update();
  const oldProof = proof(f);
  assert.equal(f.calls.length, 2);
  f.states.get('city').ready = false;
  f.setCoverage(undefined);
  f.core.update();
  f.core.setContext('replacement-context');
  f.states.get('city').ready = true;
  f.setCoverage(f.completeCoverage);
  f.core.publication(oldProof);
  f.core.update();
  assert.deepEqual(f.calls, ['city', 'root500', 'city', 'root500']);
  assert.equal(f.core.state.epochId, undefined);
  assert.equal(f.core.capturePending, true);
  // Clearing only pending at request 2 cannot acknowledge the new floor at 2.
  // Reusing the old context's floor at 1 would incorrectly issue a witness here.
  f.settleDispatchedRequests();
  f.core.update();
  assert.equal(f.core.capturePlan(), undefined);
  assert.equal(f.calls.length, 4);
  f.beginDispatchedRequests();
  f.settleDispatchedRequests();
  f.core.update();
  assert.equal(f.core.capturePlan()?.kind, 'witness');
  f.core.publication(oldProof);
  f.core.update();
  assert.equal(f.core.state.epochId, undefined, 'old-context proof cannot establish the new epoch');
  assert.equal(f.calls.length, 4, 'the replacement baseline must not poll-refresh');
});

test('verified complete-empty dedicated bypass becomes pending on unknown then dispatches nonempty geometry once', () => {
  const f = fixture();
  f.setCoverage(undefined);
  f.core.update();
  assert.equal(f.core.state.empty, true);
  assert.equal(f.core.capturePending, false, 'the existing complete-empty contract permits dedicated-only capture');
  assert.equal(f.core.capturePlan(), undefined);
  assert.equal(f.calls.length, 0);
  f.states.get('city').ready = false;
  f.core.update();
  assert.equal(f.core.capturePending, true, 'unknown evidence must not retain the dedicated bypass');
  assert.equal(f.core.capturePlan(), undefined);
  assert.equal(f.core.projectionFor([0, 0, 0, 1, 1, 1]), undefined);
  assert.equal(f.core.state.receiverReady, false);
  assert.equal(f.calls.length, 0);
  f.states.get('city').ready = true;
  f.setSourceRevision('new-nonempty-geometry');
  f.setCoverage(f.completeCoverage);
  f.core.update();
  assert.deepEqual(f.calls, ['city', 'root500']);
  assert.equal(f.core.capturePending, true);
  f.core.update();
  assert.equal(f.calls.length, 2);
  f.beginDispatchedRequests();
  f.settleDispatchedRequests();
  f.core.update();
  assert.equal(f.core.capturePlan()?.kind, 'witness');
  f.core.update();
  assert.equal(f.calls.length, 2, 'restored nonempty evidence consumes its one initial refresh floor');
});
