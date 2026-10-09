/** Candidate view projection only: no mutation, statistic rewrite, cohort or geometry operation. */
export type Locale = 'zh' | 'en' | 'de';
export type Text = Readonly<Record<Locale, string>>;
export interface Metric {
  value: number | string;
  year: number;
  unit: string;
  label: Text;
  source_url: string;
  source_sha256?: string;
  reference_date?: string;
}
export interface Context { city: string; level: string; nativeAreaId: string }
interface Member { nativeAreaId: string; level: string; sourceRowId: string; originalValue: number | string; originalYear: number }
interface Rule {
  city: string;
  conceptId: string;
  stage: 'neutral-label' | 'limitation-only';
  levels: string[];
  equals: Record<string, unknown>;
  requiredAbsent: string[];
  members: Member[];
  viewLabel: Text | null;
  originalSourceTitle: string;
  originalSourceTitleLanguage: 'de';
  visibleLimitations: Text[];
  requireVisibleLimitation: true;
}
export interface ProjectedView {
  readonly metric: Metric;
  readonly context: Readonly<Context>;
  readonly conceptId: string;
  readonly stage: Rule['stage'];
  readonly displayLabel: Text;
  readonly originalViewLabel: Text;
  readonly originalSourceTitle: string;
  readonly originalSourceTitleLanguage: 'de';
  readonly originalSourceURL: string;
  readonly originalSourceSHA256: string;
  readonly visibleLimitations: readonly Text[];
  readonly requireVisibleLimitation: true;
  readonly genericAllBodilyInjuryConceptAllowed: false;
}
const locales: readonly Locale[] = ['zh', 'en', 'de'];
function obj(x: unknown): Record<string, unknown> | undefined { return x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : undefined; }
function field(value: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    const o = obj(value);
    if (!o || ['__proto__', 'constructor', 'prototype'].includes(part) || !Object.hasOwn(o, part)) return undefined;
    value = o[part];
  }
  return value;
}
function text(x: unknown): x is Text { const o = obj(x); return !!o && locales.every(l => typeof o[l] === 'string' && (o[l] as string).trim().length > 0); }
function freeze<T>(x: T): T { if (x && typeof x === 'object' && !Object.isFrozen(x)) { for (const v of Object.values(x as object)) freeze(v); Object.freeze(x); } return x; }
async function sha256(value: string): Promise<string> { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join(''); }
function stamp(view: ProjectedView): string { return JSON.stringify([view.context, view.metric.value, view.metric.year, view.metric.reference_date, view.metric.unit, view.metric.label, view.metric.source_url, view.metric.source_sha256, field(view.metric, 'definition'), field(view.metric, 'source_row_id'), field(view.metric, 'source_field'), field(view.metric, 'series_id'), field(view.metric, 'metric_id'), field(view.metric, 'integration_batch'), field(view.metric, 'category'), field(view.metric, 'source_dataset_url')]); }

/** expectedHash must come from the owner's reviewed candidate/accepted manifest. */
export async function loadSemanticProjection(dataText: string, expectedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || await sha256(dataText) !== expectedHash) throw new Error('Semantic projection packet hash mismatch');
  const packet = obj(JSON.parse(dataText));
  if (!packet || packet.schemaVersion !== 1 || !Array.isArray(packet.rules)) throw new Error('Invalid semantic projection packet');
  const rules = packet.rules as Rule[];
  for (const rule of rules) {
    if (rule.city !== 'leipzig' || !obj(rule.equals) || !Array.isArray(rule.members) || !Array.isArray(rule.requiredAbsent) ||
        !['neutral-label', 'limitation-only'].includes(rule.stage) || !rule.originalSourceTitle || rule.originalSourceTitleLanguage !== 'de' ||
        rule.requireVisibleLimitation !== true || !Array.isArray(rule.visibleLimitations) || !rule.visibleLimitations.length || !rule.visibleLimitations.every(text) ||
        (rule.stage === 'neutral-label' && !text(rule.viewLabel))) throw new Error('Missing reviewed label/limitation contract');
    freeze(rule);
  }
  const views = new WeakMap<ProjectedView, string>();
  function project(context: Context, metric: Metric): { status: 'not-applicable' } | { status: 'projected'; view: ProjectedView } {
    const matching = rules.filter(r => r.city === context.city && r.levels.includes(context.level) &&
      Object.entries(r.equals).every(([k, v]) => field(metric, k) === v) &&
      r.requiredAbsent.every(k => field(metric, k) === undefined || field(metric, k) === null) &&
      r.members.some(m => m.level === context.level && m.nativeAreaId === context.nativeAreaId && m.sourceRowId === field(metric, 'source_row_id') && m.originalValue === metric.value && m.originalYear === metric.year));
    if (matching.length !== 1) return { status: 'not-applicable' };
    const rule = matching[0];
    const view = Object.freeze({ metric, context: Object.freeze({ ...context }), conceptId: rule.conceptId, stage: rule.stage,
      displayLabel: rule.viewLabel ?? metric.label, originalViewLabel: metric.label,
      originalSourceTitle: rule.originalSourceTitle, originalSourceTitleLanguage: rule.originalSourceTitleLanguage,
      originalSourceURL: metric.source_url, originalSourceSHA256: metric.source_sha256!,
      visibleLimitations: rule.visibleLimitations, requireVisibleLimitation: true as const, genericAllBodilyInjuryConceptAllowed: false as const });
    views.set(view, stamp(view));
    return { status: 'projected', view };
  }
  function render(host: HTMLElement, view: ProjectedView, locale: Locale, formatOriginalValue: (metric: Metric, locale: Locale) => string, appendSingleVisual?: (host:HTMLElement, view:ProjectedView, locale:Locale)=>void): { status: 'rendered' | 'withheld' } {
    if (!views.has(view) || views.get(view) !== stamp(view) || !locales.includes(locale) || !view.visibleLimitations.every(text)) return { status: 'withheld' };
    const section = document.createElement('section');
    section.className = 'lis-semantic-projection';
    try {
      const heading = document.createElement('h4');
      heading.textContent = view.displayLabel[locale]; // Never use raw narrow caption as the item197 headline.
      section.append(heading);
      const note = document.createElement('aside');
      note.style.display = 'block';
      note.style.visibility = 'visible';
      for (const limitation of view.visibleLimitations) { const p = document.createElement('p'); p.textContent = limitation[locale]; note.append(p); }
      section.append(note); // Mandatory scope conflict directly adjacent to the neutral headline.
      const value = document.createElement('p');
      value.textContent = formatOriginalValue(view.metric, locale);
      section.append(value);
      if(typeof view.metric.value==='number'&&Number.isFinite(view.metric.value))appendSingleVisual?.(section,view,locale); // Detached atomic section; no source/cohort mutation.
      const period = document.createElement('p');
      period.textContent = String(view.metric.year) + (view.metric.reference_date ? ' · ' + view.metric.reference_date : '') + ' · ' + view.context.level + ' · ' + view.context.nativeAreaId;
      section.append(period);
      const source = document.createElement('a');
      const label: Record<Locale, string> = { zh: '来源原题名（非核实口径）', en: 'Original source title (scope not verified)', de: 'Originaler Quelltitel (Umfang nicht bestätigt)' };
      source.textContent = label[locale] + ': ' + view.originalSourceTitle;
      source.href = view.originalSourceURL;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      section.append(source);
      if (views.get(view) !== stamp(view) || !view.visibleLimitations.every(t => note.textContent?.includes(t[locale]))) return { status: 'withheld' };
      host.append(section);
      if (section.parentNode !== host) return { status: 'withheld' };
      return { status: 'rendered' };
    } catch { if (section.parentNode === host) host.removeChild(section); return { status: 'withheld' }; }
  }
  return { project, render, sourcePacketSHA256: expectedHash, rules: Object.freeze(rules) };
}
