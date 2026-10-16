export type ReportSummaryPresentation = { text: string; kind: 'summary' | 'provider_summary' };

/** Prefer the reviewed display summary; fall back to stored provider summary without implying it is a full article. */
export function reportSummaryPresentation(summary: unknown, sourceSummary: unknown): ReportSummaryPresentation | undefined {
  if (typeof summary === 'string' && summary.trim()) return { text: summary, kind: 'summary' };
  if (typeof sourceSummary === 'string' && sourceSummary.trim()) return { text: sourceSummary, kind: 'provider_summary' };
  return undefined;
}
