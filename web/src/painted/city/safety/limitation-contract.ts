/** Candidate only. Call for the selected detail/reference, not every city at startup. */
export type Scope = 'local' | 'merged' | 'context' | 'municipal' | 'regional';
export type Locale = 'zh' | 'en' | 'de';
export type Text = Readonly<Record<Locale, string>>;
export interface Metric {
  value: number | string;
  unit: string;
  label: Text;
  year: number;
  source_url: string;
  source_sha256?: string;
  source_name: string;
  reference_date?: string;
  reference_start?: string;
  reference_end?: string;
  reference_period?: string;
  observation_period?: string;
  definition: Text;
}
export interface Observation {
  conceptId: string;
  city: string;
  scope: Scope;
  scopeId: string;
  scopeName: Text;
  metric: Metric;
  sourceEvidence: string;
  nativeAreaId?: string;
  memberAreaIds?: readonly string[];
  membershipEvidence?: string;
  observedThrough?: string;
  contextPoint?: readonly [number, number];
  contextGeometrySha256?: string;
  contextBoundaryAreaM2?: number;
  contextContainsPointVerified?: boolean;
}
export interface Rule {
  city: string;
  scope: Scope;
  scopeId?: string | null;
  conceptId: string;
  title: Text;
  equals: Record<string, unknown>;
  requiredAbsent: string[];
  levels: string[];
  sourceEvidence: unknown;
  requireVisibleLimitation?: unknown;
  requireVisibleLimitations?: unknown;
  limitation?: unknown;
  limitations?: unknown;
  visibleLimitation?: unknown;
  visibleLimitations?: unknown;
}
export interface QualifiedObservation extends Observation {
  readonly visibleLimitations: readonly Text[];
  readonly limitationRequired: boolean;
  readonly limitationProof: string;
}
export type Qualification =
  | { status: 'qualified'; observation: QualifiedObservation }
  | { status: 'withheld'; reason: string; knownValueNotUnpublished: true };
export interface Options {
  /** Owner-controlled loader; it must resolve only approved runtime/URL resources. */
  loadSidecar: (path: string) => Promise<string>;
  maxCachedSidecars?: number;
}
const locales: readonly Locale[] = ['zh', 'en', 'de'];
const textFields = ['limitation', 'limitations', 'visibleLimitation', 'visibleLimitations'] as const;
const flagFields = ['requireVisibleLimitation', 'requireVisibleLimitations'] as const;
const hashPattern = /^[a-f0-9]{64}$/;
function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
function field(value: unknown, key: string): unknown {
  let current = value;
  for (const part of key.split('.')) {
    const obj = record(current);
    if (!obj || ['__proto__', 'constructor', 'prototype'].includes(part) || !Object.hasOwn(obj, part)) return undefined;
    current = obj[part];
  }
  return current;
}
function validText(value: unknown): value is Text {
  const obj = record(value);
  return !!obj && locales.every(l => typeof obj[l] === 'string' && (obj[l] as string).trim().length > 0 && (obj[l] as string).length <= 5000);
}
function freezeTree<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
export async function sha256Text(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
/** Existing Python receipts use sorted keys, UTF-8 and default spaced separators. */
function definitionReceiptText(text: Text): string {
  return '{' + [...locales].sort().map(l => JSON.stringify(l) + ': ' + JSON.stringify(text[l])).join(', ') + '}';
}
function localizedFields(obj: Record<string, unknown>): { required: boolean; texts: Text[]; valid: boolean } {
  let required = false;
  const texts: Text[] = [];
  for (const key of flagFields) {
    if (obj[key] !== undefined && typeof obj[key] !== 'boolean') return { required: true, texts, valid: false };
    required ||= obj[key] === true;
  }
  for (const key of textFields) {
    if (obj[key] === undefined) continue;
    const entries = Array.isArray(obj[key]) ? obj[key] as unknown[] : [obj[key]];
    for (const item of entries) {
      // Supported shapes are literal Text or an explicitly wrapped {text: Text}.
      const candidate = record(item)?.text ?? item;
      if (!validText(candidate)) return { required: true, texts, valid: false };
      texts.push(candidate);
    }
  }
  return { required, texts, valid: true };
}
async function validDefinitionProof(obj: Record<string, unknown>): Promise<boolean> {
  const hashes = obj.definition_hashes;
  const definitions = obj.original_three_language_definitions;
  if (!Array.isArray(hashes) || !hashes.length || !hashes.every(x => typeof x === 'string' && hashPattern.test(x)) ||
      !Array.isArray(definitions) || definitions.length !== hashes.length || !definitions.every(validText)) return false;
  const actual = await Promise.all(definitions.map(x => sha256Text(definitionReceiptText(x))));
  return actual.every((value, index) => value === hashes[index]);
}
function selectorMatches(rule: Rule, observation: Observation, level?: string): boolean {
  if (rule.city !== observation.city || rule.scope !== observation.scope || rule.conceptId !== observation.conceptId ||
      (rule.scopeId && rule.scopeId !== observation.scopeId) ||
      (rule.levels.length && (!level || !rule.levels.includes(level)))) return false;
  return Object.entries(rule.equals).every(([key, value]) => field(observation.metric, key) === value) &&
    rule.requiredAbsent.every(key => field(observation.metric, key) === undefined || field(observation.metric, key) === null);
}
function viewStamp(observation: Observation): string {
  const m = observation.metric;
  return JSON.stringify([m.value, m.year, m.reference_date, m.reference_start, m.reference_end, m.reference_period, m.observation_period, m.source_sha256, m.source_url, m.definition, observation.city, observation.scope, observation.scopeId, observation.scopeName, observation.nativeAreaId, observation.memberAreaIds, observation.membershipEvidence, observation.contextPoint, observation.contextGeometrySha256, observation.contextBoundaryAreaM2, observation.contextContainsPointVerified]);
}
const withheld = (reason: string): Qualification => ({ status: 'withheld', reason, knownValueNotUnpublished: true });

export function createLimitationContract(options: Options) {
  const maxCached = options.maxCachedSidecars ?? 4;
  if (!Number.isInteger(maxCached) || maxCached < 1 || maxCached > 32) throw new Error('Invalid sidecar cache bound');
  const trustedRules = new WeakMap<Rule, string>();
  const resolutions = new WeakMap<Rule, Promise<{ texts: readonly Text[]; required: boolean; proof: string } | undefined>>();
  const views = new WeakMap<QualifiedObservation, { rule: Rule; level?: string; stamp: string }>();
  const sidecars = new Map<string, Promise<Record<string, unknown>>>();
  let sidecarLoads = 0;
  let sidecarBytes = 0;

  /** expectedHash comes from the owner's accepted manifest, never from the fetched packet itself. */
  async function loadVerifiedRules(packetText: string, expectedHash: string, city?: string): Promise<readonly Rule[]> {
    if (!hashPattern.test(expectedHash) || await sha256Text(packetText) !== expectedHash) throw new Error('Rule packet hash mismatch');
    const packet = record(JSON.parse(packetText));
    if (!packet || !Array.isArray(packet.rules)) throw new Error('Missing rule array');
    const rules = packet.rules.filter(x => !city || record(x)?.city === city) as Rule[];
    for (const rule of rules) {
      if (!record(rule) || !rule.city || !['local', 'merged', 'context', 'municipal', 'regional'].includes(rule.scope) || !rule.conceptId || !validText(rule.title) || !record(rule.equals) ||
          !Array.isArray(rule.requiredAbsent) || !rule.requiredAbsent.every(x => typeof x === 'string') || !Array.isArray(rule.levels) || !rule.levels.every(x => typeof x === 'string') || !record(rule.sourceEvidence)) throw new Error('Invalid rule contract');
      freezeTree(rule); // A copied/injected/mutated object cannot inherit this private trust binding.
      trustedRules.set(rule, expectedHash);
    }
    return Object.freeze(rules);
  }
  async function sidecar(path: string, hash: string): Promise<Record<string, unknown>> {
    if (!path || !hashPattern.test(hash)) throw new Error('Missing sidecar proof');
    const key = path + '\0' + hash;
    let pending = sidecars.get(key);
    if (pending) { sidecars.delete(key); sidecars.set(key, pending); return pending; }
    pending = (async () => {
      sidecarLoads++;
      const text = await options.loadSidecar(path);
      sidecarBytes += new TextEncoder().encode(text).length;
      if (await sha256Text(text) !== hash) throw new Error('Sidecar hash mismatch');
      const data = record(JSON.parse(text));
      if (!data) throw new Error('Invalid sidecar');
      return freezeTree(data);
    })();
    sidecars.set(key, pending);
    if (sidecars.size > maxCached) sidecars.delete(sidecars.keys().next().value as string);
    try { return await pending; } catch (error) { if (sidecars.get(key) === pending) sidecars.delete(key); throw error; }
  }
  async function resolve(rule: Rule): Promise<{ texts: readonly Text[]; required: boolean; proof: string } | undefined> {
    const packetHash = trustedRules.get(rule);
    if (!packetHash) return undefined;
    const evidence = record(rule.sourceEvidence)!;
    const top = localizedFields(record(rule)!);
    const nested = localizedFields(evidence);
    if (!top.valid || !nested.valid) return undefined;
    let required = top.required || nested.required;
    const collected = [...top.texts, ...nested.texts];
    let proofValid = await validDefinitionProof(evidence);
    let proof = 'verified-rule-packet:' + packetHash;
    const reviewPath = evidence.sourceReviewPath;
    const reviewHash = evidence.sourceReviewSha256;
    if (reviewPath !== undefined || reviewHash !== undefined) {
      if (typeof reviewPath !== 'string' || typeof reviewHash !== 'string') return undefined;
      try {
        const document = await sidecar(reviewPath, reviewHash);
        const familyKey = evidence.reviewFamilyKey;
        if (typeof familyKey !== 'string') return undefined;
        const family = record(record(document.fieldFamilies)?.[familyKey]);
        if (!family || family.city !== rule.city || family.conceptId !== rule.conceptId) return undefined;
        const fromFamily = localizedFields(family);
        if (!fromFamily.valid) return undefined;
        required ||= fromFamily.required;
        collected.push(...fromFamily.texts);
        // Hash-bound family identity + its reviewed definition hashes are the source proof.
        proofValid = await validDefinitionProof(family);
        proof = reviewPath + '#'+ familyKey + '@' + reviewHash;
      } catch { return undefined; }
    }
    if (required && (!proofValid || !collected.length)) return undefined;
    if (collected.length && !proofValid) return undefined;
    const unique = new Map(collected.map(text => [JSON.stringify(locales.map(l => text[l])), text]));
    const texts = freezeTree([...unique.values()].map(text => ({ zh: text.zh, en: text.en, de: text.de })));
    return { texts, required: required || texts.length > 0, proof };
  }
  async function qualify(rule: Rule, observation: Observation, level?: string): Promise<Qualification> {
    if (!trustedRules.has(rule)) return withheld('unverified-or-injected-rule');
    if (!selectorMatches(rule, observation, level)) return withheld('source-selector-mismatch');
    const evidence = record(rule.sourceEvidence)!;
    const metricHash = observation.metric.source_sha256;
    if (typeof metricHash !== 'string' || !hashPattern.test(metricHash) || rule.equals.source_sha256 !== metricHash ||
        (evidence.source_sha256 !== undefined && evidence.source_sha256 !== metricHash) ||
        (evidence.source_url !== undefined && evidence.source_url !== observation.metric.source_url)) return withheld('source-proof-guard-mismatch');
    let pending = resolutions.get(rule);
    if (!pending) { pending = resolve(rule); resolutions.set(rule, pending); }
    let result: Awaited<typeof pending>;
    try { result = await pending; } catch { resolutions.delete(rule); return withheld('source-proof-validation-failed'); }
    if (!result) { resolutions.delete(rule); return withheld('required-limitation-or-source-proof-incomplete'); }
    const qualified = Object.freeze({ ...observation, visibleLimitations: result.texts, limitationRequired: result.required, limitationProof: result.proof });
    // Only the observation view wrapper is copied/frozen; the metric is the original object.
    views.set(qualified, { rule, level, stamp: viewStamp(qualified) });
    return { status: 'qualified', observation: qualified };
  }
  function render(
    host: HTMLElement,
    observation: QualifiedObservation,
    locale: Locale,
    renderOriginal: (detached: HTMLElement, original: QualifiedObservation) => boolean,
  ): { status: 'rendered' | 'withheld'; reason?: string } {
    const binding = views.get(observation);
    if (!binding || binding.stamp !== viewStamp(observation) || !selectorMatches(binding.rule, observation, binding.level) || !locales.includes(locale) ||
        (observation.limitationRequired && (!observation.visibleLimitations.length || !observation.visibleLimitations.every(validText)))) {
      return { status: 'withheld', reason: 'unqualified-or-injected-view' };
    }
    const labels: Record<Locale, string> = { zh: '已知限制', en: 'Known limitations', de: 'Bekannte Einschränkungen' };
    const section = document.createElement('section');
    section.className = 'reference-limitation-contract';
    try {
      // The value renderer works detached. A failed value/limitation append emits no number.
      if (!renderOriginal(section, observation)) return { status: 'withheld', reason: 'original-value-render-failed' };
      const provenance = document.createElement('p');
      const metric = observation.metric;
      const range = typeof metric.reference_start === 'string' && typeof metric.reference_end === 'string' ? metric.reference_start + ' – ' + metric.reference_end : undefined;
      const period = metric.reference_date ?? metric.reference_period ?? metric.observation_period ?? range;
      provenance.textContent = observation.scopeName[locale] + ' · ' + metric.year + (period ? ' · ' + period : '');
      section.append(provenance);
      if (observation.visibleLimitations.length) {
        const aside = document.createElement('aside');
        aside.hidden = false;
        aside.style.display = 'block';
        aside.style.visibility = 'visible';
        const heading = document.createElement('strong');
        heading.textContent = labels[locale];
        aside.append(heading);
        for (const text of observation.visibleLimitations) {
          const paragraph = document.createElement('p');
          paragraph.textContent = text[locale];
          aside.append(paragraph);
        }
        section.append(aside);
        if (!observation.visibleLimitations.every(text => aside.textContent?.includes(text[locale]))) return { status: 'withheld', reason: 'visible-limitation-append-failed' };
      }
      if (binding.stamp !== viewStamp(observation)) return { status: 'withheld', reason: 'source-view-mutated-during-render' };
      host.append(section);
      if (section.parentNode !== host) return { status: 'withheld', reason: 'reference-append-failed' };
      return { status: 'rendered' };
    } catch {
      if (section.parentNode === host) host.removeChild(section);
      return { status: 'withheld', reason: 'atomic-reference-render-failed' };
    }
  }
  return { loadVerifiedRules, qualify, render, cacheInfo: () => ({ cachedSidecars: sidecars.size, sidecarLoads, sidecarBytes, bound: maxCached }) };
}
