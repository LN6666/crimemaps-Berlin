import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const result = await build({entryPoints: [new URL('../src/safety/model.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
const {displayMonth, monthEvents} = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const provider = {id: 'provider:1', month: null, event_date: null, published_at: null, category: 'theft', upstream_provider: 'POLIZEIKARTE', time_basis: 'polizeikarte_listing_display_metadata_only', provider_display_month: '2026-10'};
test('provider display metadata enables browsing while official dates stay unknown', () => {
  const before = structuredClone(provider);
  assert.equal(displayMonth(provider), '2026-10');
  assert.deepEqual(monthEvents({events: [provider]}, '2026-10', 'all'), [provider]);
  assert.deepEqual(monthEvents({events: [provider]}, '2026-10', 'theft'), [provider]);
  assert.deepEqual(monthEvents({events: [provider]}, '2026-10', 'assault'), []);
  assert.deepEqual(monthEvents({events: [provider]}, '2026-09', 'all'), []);
  assert.deepEqual(provider, before);
});
test('existing source month takes precedence and untrusted metadata is excluded', () => {
  assert.equal(displayMonth({...provider, month: '2026-09'}), '2026-09');
  for (const changed of [{upstream_provider: 'other'}, {upstream_provider: undefined}, {time_basis: 'official'}, {time_basis: undefined}, ...[undefined, null, 202610, '2026-00', '2026-13', '2026-1', '2026-10-01'].map(provider_display_month => ({provider_display_month}))]) {
    const invalid = {...provider, ...changed};
    assert.equal(displayMonth(invalid), null);
    assert.deepEqual(monthEvents({events: [invalid]}, '2026-10', 'all'), []);
  }
});
