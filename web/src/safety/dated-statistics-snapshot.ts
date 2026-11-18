import {DATED_TAG_SOURCE_VERSION_KEYS, validateDatedTagCatalogue,
  type DatedTagCatalogue, type DatedTagBindings} from "./dated-tag-statistics";

export interface DatedStatisticsMapBinding {city: string; generation: string; records: number}
export interface DatedStatisticsBuildBinding extends DatedStatisticsMapBinding {
  source_versions: DatedTagBindings;
  /** An explicit saved scientific range, distinct from the current map's records. */
  historical_snapshot?: {as_of: string; selected_records: number; all_selected_records: number};
}
export interface DatedStatisticsSnapshotContext {
  readonly kind: "current" | "historical";
  readonly city: string;
  readonly asOf: string;
  readonly selectedRecords: number;
  readonly allSelectedRecords: number;
  readonly currentRecords: number;
  readonly currentGeneration: string;
  readonly sourceVersions: Readonly<DatedTagBindings>;
}

/** No old vector is relabelled as a current count; historical display needs both permissions. */
export function bindDatedStatisticsSnapshot(catalogue: DatedTagCatalogue, binding: DatedStatisticsBuildBinding,
  current: DatedStatisticsMapBinding, options: {allowHistoricalSnapshot?: boolean} = {}): DatedStatisticsSnapshotContext {
  if (!binding || binding.city !== current.city || binding.generation !== current.generation || binding.records !== current.records ||
      !/^[a-f0-9]{16}-\d{8}T\d{6}$/.test(current.generation) ||
      !Number.isSafeInteger(current.records) || current.records < 0)
    throw Error("Dated statistics belong to another map snapshot");
  for (const key of DATED_TAG_SOURCE_VERSION_KEYS)
    if (!/^[a-f0-9]{64}$/.test(binding.source_versions?.[key])) throw Error("Missing dated statistics source binding");
  validateDatedTagCatalogue(catalogue, binding.source_versions);
  const city = catalogue.scopes.find(scope => scope.key === current.city), total = catalogue.scopes.find(scope => scope.key === "all14");
  if (!city || city.key === "all14" || !total) throw Error("Missing dated statistics city/total scope");
  const declared = binding.historical_snapshot;
  const historical = city.total_selected_records !== current.records || declared !== undefined;
  if (historical && (options.allowHistoricalSnapshot !== true || !declared || declared.as_of !== catalogue.as_of ||
      declared.selected_records !== city.total_selected_records || declared.all_selected_records !== total.total_selected_records))
    throw Error("Dated statistics require an explicit historical snapshot declaration");
  return Object.freeze({kind: historical ? "historical" : "current", city: current.city, asOf: catalogue.as_of,
    selectedRecords: city.total_selected_records, allSelectedRecords: total.total_selected_records,
    currentRecords: current.records, currentGeneration: current.generation,
    sourceVersions: Object.freeze({...binding.source_versions})});
}
