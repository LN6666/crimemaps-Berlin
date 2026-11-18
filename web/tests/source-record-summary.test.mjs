import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const source = await readFile(new URL('../src/safety/source-record-summary.ts', import.meta.url), 'utf8');
const {code} = await transform(source, {loader: 'ts', format: 'esm'});
const {sourceRecordSummary, sourceRecordSummaryText, sourceRecordFreshnessText} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
function fixture(added = 20) {
  const selected = 1140 + added;
  const coverage = {discovered: 1140, fetched: 1140, pending: 0, failed: 0};
  return {months: {'2026-09': {count: 1110}, '2026-10': {count: 30 + added}},
    coverage: {...coverage, discovered: selected, fetched: selected}, retrieved_at: '2026-10-05T17:15:51.328778+00:00', mappable_count: selected,
    metadata: {coverage_scope: 'selected_current_saved_source_records; mixed inherited source material',
      mappable_articles: selected, selected_records_current_private: selected, primary_count_points: 150,
      source_record_counts: {schema_version: 1, scope: 'selected_current_saved_source_records',
        source_composition: 'mixed_inherited_source_material', fresh_fetch_performed: false,
        selected_records: selected, countable_primary_records: 150, records_without_countable_primary: selected - 150,
        accepted_saved_source_records_added: added, new_primary_count_points: 0,
        history: {coverage, retrieved_at: '2026-10-05T17:15:51.328778+00:00',
          coverage_scope: 'selected_current_private_source_records; mixed inherited source material',
          mappable_count: 1140, mappable_articles: 1133}}}};
}

test('new announcements without a primary point increase records, not the hexagon denominator', () => {
  const before = sourceRecordSummary(fixture(0)), current = sourceRecordSummary(fixture());
  assert.equal(current.selectedRecords, 1160); assert.equal(current.selectedRecords - before.selectedRecords, 20);
  assert.equal(current.countablePrimaryRecords, 150); assert.equal(current.countablePrimaryRecords, before.countablePrimaryRecords);
  assert.equal(current.withoutCountablePrimaryRecords, 1010); assert.equal(current.newPrimaryCountPoints, 0);
  assert.equal(current.acceptedSavedSourceRecordsAdded, 20);
});

test('current saved adoption and historical acquisition snapshot retain distinct counts and time', () => {
  const manifest = fixture(), summary = sourceRecordSummary(manifest);
  assert.equal(summary.acquisition, 'saved-source-adoption'); assert.equal(summary.historicalCoverage.fetched, 1140);
  assert.equal(summary.historicalCoverage.retrievedAt, manifest.retrieved_at);
  assert.match(sourceRecordSummaryText(summary, 'en'), /Current selection: 1,160 announcements/);
  assert.match(sourceRecordSummaryText(summary, 'en'), /1,140 fetched/);
  assert.match(sourceRecordSummaryText(summary, 'en'), /not fetched again/);
  assert.match(sourceRecordSummaryText(summary, 'de'), /nicht neu abgerufen/);
  assert.match(sourceRecordSummaryText(summary, 'zh'), /并非重新抓取档案/);
  assert.match(sourceRecordFreshnessText(summary, 'en'), /Original 1,140-record source retrieval snapshot: 2026-10-05/);
  assert.match(sourceRecordFreshnessText(summary, 'en'), /not a collection timestamp for the 20/);
  assert.match(sourceRecordFreshnessText(summary, 'zh'), /不是新增 20 条已保存来源的采集时间/);
  assert.match(sourceRecordFreshnessText(summary, 'de'), /nicht der Erfassungszeitpunkt der 20/);
  const legacy = fixture(); delete legacy.metadata.source_record_counts; legacy.coverage.fetched = legacy.coverage.discovered = 1140;
  legacy.mappable_count = 1140; legacy.metadata.mappable_articles = 1133;
  const old = sourceRecordSummary(legacy);
  assert.equal(old.selectedRecords, 1160, 'month counts remain authoritative even for a legacy snapshot');
  assert.equal(old.acquisition, 'legacy-snapshot'); assert.equal(old.countablePrimaryRecords, undefined);
});

test('mixed official and provider material is explicit in all three locales', () => {
  const summary = sourceRecordSummary(fixture());
  assert.equal(summary.sourceComposition, 'mixed-inherited-material');
  assert.match(sourceRecordSummaryText(summary, 'en'), /official and third-party material/);
  assert.match(sourceRecordSummaryText(summary, 'de'), /Material von Drittanbietern/);
  assert.match(sourceRecordSummaryText(summary, 'zh'), /官方及第三方材料/);
  assert.match(sourceRecordSummaryText(summary, 'en'), /not a complete police archive/);
});

test('invalid, stale or internally inconsistent source counts are rejected', () => {
  const mutations = [
    m => {m.months['2026-10'].count = -1;}, m => {m.coverage.fetched = '1160';},
    m => {m.metadata.source_record_counts.selected_records = 1140;},
    m => {m.metadata.source_record_counts.countable_primary_records = 1161;},
    m => {m.metadata.source_record_counts.records_without_countable_primary = 990;},
    m => {m.metadata.source_record_counts.accepted_saved_source_records_added = 1161;},
    m => {m.metadata.source_record_counts.new_primary_count_points = 21;},
    m => {m.metadata.source_record_counts.history.coverage.failed = 0.5;},
    m => {m.mappable_count = 1140;}, m => {m.metadata.mappable_articles = 1133;},
    m => {m.metadata.source_record_counts.fresh_fetch_performed = true;},
  ];
  for (const mutate of mutations) {const manifest = fixture(); mutate(manifest); assert.throws(() => sourceRecordSummary(manifest), /Invalid source record/);}
});
