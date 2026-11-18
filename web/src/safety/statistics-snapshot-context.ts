import {statisticsBinding, type StatisticsBinding} from "./statistics-binding";
import {contentTagStatisticsForSummary, type ContentTagSummary} from "./content-tags";
import {validateMacroCatalogue, type MacroSummary} from "./macro-tags";
import {validateBriefCatalogues, type WindowCatalogue, type BriefCatalogue} from "./cached-city-briefs";

export interface StatisticsSnapshotContext {
  readonly kind: "current" | "historical";
  readonly city: string;
  /** The saved scientific snapshot, never relabelled with the current map identity. */
  readonly generation: string;
  readonly announcements: number;
  readonly mappingSHA256: string;
  readonly asOf: string;
  readonly allCitiesAnnouncements: number;
  readonly currentGeneration: string;
  readonly currentAnnouncements: number;
}
export interface StatisticsSnapshotOptions {allowHistoricalSnapshot?: boolean}

/** A historical read is opt-in and requires the manifest's explicit successor binding. */
export function bindStatisticsSnapshot(value: unknown, city: string, generation: string, announcements: number,
  options: StatisticsSnapshotOptions = {}) {
  try {
    return {kind: "current" as const, binding: statisticsBinding(value, city, generation, announcements)};
  } catch (error) {
    if (options.allowHistoricalSnapshot !== true || !value || typeof value !== "object" || Array.isArray(value)) throw error;
    const saved = value as StatisticsBinding & {
      statistics_refresh_paused?: boolean; current_map_binding_accepted?: boolean;
      cached_reports_remain_bound_to_prior_scientific_checkpoint?: boolean;
      requested_map_generation?: string; previous_map_generation?: string;
    };
    if (saved.city !== city || saved.requested_map_generation !== generation || saved.map_generation === generation ||
        saved.statistics_refresh_paused !== true || saved.current_map_binding_accepted !== false ||
        saved.cached_reports_remain_bound_to_prior_scientific_checkpoint !== true ||
        saved.previous_map_generation !== saved.map_generation) throw error;
    // Validate both identities; substituting the new denominator must never validate old payloads.
    statisticsBinding({...saved, map_generation: generation, map_announcements: announcements}, city, generation, announcements);
    return {kind: "historical" as const,
      binding: statisticsBinding(saved, city, saved.map_generation, saved.map_announcements)};
  }
}

/** Validate all four saved catalogues against their own snapshot before exposing historical prose. */
export function statisticsSnapshotContext(snapshot: ReturnType<typeof bindStatisticsSnapshot>, city: string,
  generation: string, announcements: number, ordinary: readonly ContentTagSummary[], macro: readonly MacroSummary[],
  windows: WindowCatalogue, briefs: BriefCatalogue): StatisticsSnapshotContext {
  const binding = snapshot.binding;
  if (!Array.isArray(ordinary) || !Array.isArray(macro)) throw Error("Missing saved statistics catalogues");
  validateMacroCatalogue(macro);
  validateBriefCatalogues(windows, briefs);
  const total = ordinary.find(item => item.key === "all14"), savedCity = ordinary.find(item => item.key === city);
  if (!total || !savedCity || ordinary.length !== macro.length || new Set(ordinary.map(item => item.key)).size !== ordinary.length ||
      savedCity.records !== binding.map_announcements) throw Error("Saved statistics snapshot denominators differ");
  for (const source of ordinary) {
    contentTagStatisticsForSummary(source);
    const social = macro.find(item => item.key === source.key), dated = windows.scopes.find(item => item.key === source.key);
    if (source.mapping_sha256 !== binding.mapping_sha256 || !social || !dated ||
        social.mapping_sha256 !== binding.mapping_sha256 || source.records !== social.records ||
        source.records !== dated.total_selected_records || source.overlay_sha256 !== total.overlay_sha256 ||
        social.overlay_sha256 !== windows.overlay_sha256) throw Error("Saved statistics catalogue bindings differ");
  }
  if (windows.mapping_sha256 !== binding.mapping_sha256 || briefs.mapping_sha256 !== binding.mapping_sha256 ||
      ordinary.filter(item => item.key !== "all14").reduce((sum, item) => sum + item.records, 0) !== total.records)
    throw Error("Saved statistics source/count bindings differ");
  return Object.freeze({kind: snapshot.kind, city, generation: binding.map_generation,
    announcements: binding.map_announcements, mappingSHA256: binding.mapping_sha256, asOf: windows.as_of,
    allCitiesAnnouncements: total.records, currentGeneration: generation, currentAnnouncements: announcements});
}

/** Reader-facing coverage and date only; internal generation/hash identities stay in the typed context. */
export function statisticsSnapshotLabel(context: StatisticsSnapshotContext | null, locale: "de" | "en" | "zh",
  cityLabel: string): string {
  if (!context || context.kind !== "historical") return "";
  const n = new Intl.NumberFormat(locale), old = n.format(context.announcements), current = n.format(context.currentAnnouncements);
  const all = n.format(context.allCitiesAnnouncements);
  return {
    de: `Historischer Datenstand · Stand: ${context.asOf}. ${cityLabel}: ${old} ausgewählte Polizeimeldungen; aktuelle Karte: ${current}. Historische Gesamtauswahl: ${all} Meldungen in 14 Städten. Statistik und gespeicherte KI-Kurzberichte wurden nicht aktualisiert.`,
    en: `Historical snapshot · Data as of ${context.asOf}. ${cityLabel}: ${old} selected police announcements; current map: ${current}. Historical total: ${all} announcements across 14 cities. The statistics and saved AI briefs have not been refreshed.`,
    zh: `历史快照 · 数据截至 ${context.asOf}。${cityLabel}：旧快照含 ${old} 条选定警方公告；当前地图含 ${current} 条。历史总范围为 14 城 ${all} 条公告。统计与已保存的 AI 简报尚未更新。`,
  }[locale];
}
