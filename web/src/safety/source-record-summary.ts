/** Saved announcement counts, independently of a crawl or a countable map point. */
export interface SourceRecordManifest {
  months: Readonly<Record<string, {count: number}>>;
  coverage: {discovered: number; fetched: number; pending: number; failed: number};
  retrieved_at: string;
  mappable_count?: number;
  metadata: Readonly<Record<string, unknown>>;
}
export interface SourceCoverageSnapshot {
  discovered: number;
  fetched: number;
  pending: number;
  failed: number;
  retrievedAt: string;
  scope: string;
}
export interface SourceRecordSummary {
  selectedRecords: number;
  sourceComposition: 'mixed-inherited-material' | 'inherited-material';
  acquisition: 'saved-source-adoption' | 'legacy-snapshot';
  countablePrimaryRecords?: number;
  withoutCountablePrimaryRecords?: number;
  acceptedSavedSourceRecordsAdded?: number;
  newPrimaryCountPoints?: number;
  historicalCoverage: SourceCoverageSnapshot;
}
function invalid(): never {throw Error('Invalid source record count metadata');}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || value.length > 64 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) invalid();
  return value;
}
function snapshot(value: unknown, retrievedAt: unknown, scope: unknown): SourceCoverageSnapshot {
  const source = object(value);
  if (typeof scope !== 'string' || !scope.trim() || scope.length > 1024) invalid();
  return {discovered: count(source.discovered), fetched: count(source.fetched),
    pending: count(source.pending), failed: count(source.failed), retrievedAt: timestamp(retrievedAt), scope};
}

/** Monthly announcement records are authoritative; neither mappable alias means hexagon points. */
export function sourceRecordSummary(manifest: SourceRecordManifest): SourceRecordSummary {
  const months = object(manifest.months), metadata = object(manifest.metadata);
  let selectedRecords = 0;
  for (const [month, value] of Object.entries(months)) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) invalid();
    selectedRecords = count(selectedRecords + count(object(value).count));
  }
  const scope = metadata.coverage_scope ?? 'historical_source_checkpoint';
  const current = snapshot(manifest.coverage, manifest.retrieved_at, scope);
  for (const value of [manifest.mappable_count, metadata.mappable_articles, metadata.selected_records_current_private])
    if (value !== undefined) count(value);
  const mixed = typeof metadata.provider_source === 'string' || typeof metadata.upstream_provider === 'string' ||
    (typeof scope === 'string' && scope.includes('mixed'));
  const saved = metadata.source_record_counts;
  if (saved === undefined) return {selectedRecords, sourceComposition: mixed ? 'mixed-inherited-material' : 'inherited-material',
    acquisition: 'legacy-snapshot', historicalCoverage: current};

  const value = object(saved), history = object(value.history);
  if (value.schema_version !== 1 || value.scope !== 'selected_current_saved_source_records' ||
      value.source_composition !== 'mixed_inherited_source_material' || value.fresh_fetch_performed !== false ||
      count(value.selected_records) !== selectedRecords ||
      metadata.selected_records_current_private !== selectedRecords || manifest.mappable_count !== selectedRecords ||
      metadata.mappable_articles !== selectedRecords || current.discovered !== selectedRecords ||
      current.fetched !== selectedRecords || current.pending !== 0 || current.failed !== 0 ||
      !current.scope.startsWith('selected_current_saved_source_records')) invalid();
  const primary = count(value.countable_primary_records), without = count(value.records_without_countable_primary);
  const added = count(value.accepted_saved_source_records_added), newPrimary = count(value.new_primary_count_points);
  if (primary > selectedRecords || primary + without !== selectedRecords || added > selectedRecords ||
      newPrimary > added || newPrimary > primary ||
      (metadata.primary_count_points !== undefined && metadata.primary_count_points !== primary)) invalid();
  if (count(history.mappable_count) + added !== selectedRecords || count(history.mappable_articles) > selectedRecords) invalid();
  const historicalCoverage = snapshot(history.coverage, history.retrieved_at, history.coverage_scope);
  if (historicalCoverage.retrievedAt !== current.retrievedAt) invalid();
  return {selectedRecords, sourceComposition: 'mixed-inherited-material', acquisition: 'saved-source-adoption',
    countablePrimaryRecords: primary, withoutCountablePrimaryRecords: without,
    acceptedSavedSourceRecordsAdded: added, newPrimaryCountPoints: newPrimary, historicalCoverage};
}

/** The old retrieval instant is a scoped historical snapshot, not new-source freshness. */
export function sourceRecordFreshnessText(summary: SourceRecordSummary, locale: 'zh' | 'en' | 'de'): string {
  const historical = summary.historicalCoverage;
  const n = (value: number) => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale).format(value);
  const date = historical.retrievedAt.slice(0, 10), records = n(historical.discovered);
  if (locale === 'zh') return `原 ${records} 条来源的抓取快照日期：${date}。` +
    (summary.acquisition === 'saved-source-adoption' ? `这不是新增 ${n(summary.acceptedSavedSourceRecordsAdded!)} 条已保存来源的采集时间。` : '');
  if (locale === 'de') return `Abrufstand der ursprünglichen ${records} Quellen: ${date}.` +
    (summary.acquisition === 'saved-source-adoption' ? ` Dies ist nicht der Erfassungszeitpunkt der ${n(summary.acceptedSavedSourceRecordsAdded!)} neu übernommenen, bereits gespeicherten Quellen.` : '');
  return `Original ${records}-record source retrieval snapshot: ${date}.` +
    (summary.acquisition === 'saved-source-adoption' ? ` This is not a collection timestamp for the ${n(summary.acceptedSavedSourceRecordsAdded!)} newly adopted saved sources.` : '');
}

/** Readable counts without calling the mixed selection a fresh official archive crawl. */
export function sourceRecordSummaryText(summary: SourceRecordSummary, locale: 'zh' | 'en' | 'de'): string {
  const n = (value: number) => new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale).format(value);
  const historical = summary.historicalCoverage, date = historical.retrievedAt.slice(0, 10);
  const primary = summary.countablePrimaryRecords, without = summary.withoutCountablePrimaryRecords;
  if (locale === 'zh') return [
    `当前收录 ${n(summary.selectedRecords)} 条公告。`,
    primary === undefined ? '' : `其中 ${n(primary)} 条有可计数主点，${n(without!)} 条没有。`,
    summary.sourceComposition === 'mixed-inherited-material' ? '来源包含继承的官方及第三方材料。' : '',
    summary.acquisition === 'saved-source-adoption' ? `本次采用 ${n(summary.acceptedSavedSourceRecordsAdded!)} 条已保存且已接受的来源记录，并非重新抓取档案。` : '',
    `较早来源快照（${date}）：发现 ${n(historical.discovered)} 条、取得 ${n(historical.fetched)} 条、待取 ${n(historical.pending)} 条、失败 ${n(historical.failed)} 条；不代表完整警方档案。`,
  ].filter(Boolean).join('');
  if (locale === 'de') return [
    `Aktuelle Auswahl: ${n(summary.selectedRecords)} Meldungen.`,
    primary === undefined ? '' : `${n(primary)} haben einen zählbaren Hauptpunkt, ${n(without!)} keinen.`,
    summary.sourceComposition === 'mixed-inherited-material' ? 'Die Quellen enthalten übernommenes amtliches Material und Material von Drittanbietern.' : '',
    summary.acquisition === 'saved-source-adoption' ? `${n(summary.acceptedSavedSourceRecordsAdded!)} bereits gespeicherte und akzeptierte Quellen wurden übernommen; das Archiv wurde hierfür nicht neu abgerufen.` : '',
    `Früherer Quellenstand (${date}): ${n(historical.discovered)} entdeckt, ${n(historical.fetched)} abgerufen, ${n(historical.pending)} ausstehend, ${n(historical.failed)} fehlgeschlagen; kein vollständiges Polizeiarchiv.`,
  ].filter(Boolean).join(' ');
  return [
    `Current selection: ${n(summary.selectedRecords)} announcements.`,
    primary === undefined ? '' : `${n(primary)} have a countable primary point; ${n(without!)} do not.`,
    summary.sourceComposition === 'mixed-inherited-material' ? 'Sources include inherited official and third-party material.' : '',
    summary.acquisition === 'saved-source-adoption' ? `${n(summary.acceptedSavedSourceRecordsAdded!)} accepted, previously saved source records were adopted; the archive was not fetched again for this update.` : '',
    `Earlier source snapshot (${date}): ${n(historical.discovered)} discovered, ${n(historical.fetched)} fetched, ${n(historical.pending)} pending, ${n(historical.failed)} failed; this is not a complete police archive.`,
  ].filter(Boolean).join(' ');
}
