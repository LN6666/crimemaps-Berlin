import {assetPath} from "./deployment";
import {fetchDataJSON} from "./security";
import {bindStatisticsSnapshot, statisticsSnapshotContext, type StatisticsSnapshotOptions} from "./statistics-snapshot-context";
import type {ContentTagSummary} from "./content-tags";
import type {MacroSummary} from "./macro-tags";
import type {WindowCatalogue, BriefCatalogue} from "./cached-city-briefs";

/** One bounded, cancellable load per map snapshot. Period changes use the saved data. */
export async function loadSavedStatistics(city: string, generation: string, announcements: number, signal: AbortSignal,
  options: StatisticsSnapshotOptions = {}) {
  const path = (name: string) => assetPath(`/statistics/${name}.json`);
  const snapshot = bindStatisticsSnapshot(await fetchDataJSON<unknown>(path("manifest"), signal), city, generation, announcements, options);
  const [ordinary, macro, windows, briefs] = await Promise.all([
    fetchDataJSON<{summaries: ContentTagSummary[]}>(path("content-tag-summary"), signal),
    fetchDataJSON<{summaries: MacroSummary[]}>(path("macro-tag-summary"), signal),
    fetchDataJSON<WindowCatalogue>(path("window-summary"), signal),
    fetchDataJSON<BriefCatalogue>(path("cached-briefs"), signal),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const snapshotContext = statisticsSnapshotContext(snapshot, city, generation, announcements,
    ordinary.summaries, macro.summaries, windows, briefs);
  return {binding: snapshot.binding, snapshotContext, ordinary: ordinary.summaries, macro: macro.summaries, windows, briefs};
}
