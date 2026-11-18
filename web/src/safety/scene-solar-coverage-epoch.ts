/** Scalar coordination only. The compositor supplies atomic provider receipts and
 * a receipt from a real completed capture; this module never reads a model or GL.
 * Unforced resident coverage is the candidate. A forced capture is only its
 * witness, so an old large epoch cannot prevent a later shrink. */
export type SceneSolarEpochBounds = readonly [number, number, number, number, number, number];
export type SceneSolarEpochAck = Readonly<{
  contextKey: string; epochId: number; requestRevision: number; generation: number;
}>;
export type SceneSolarEpochProvider = Readonly<{
  provider: string;
  requestRevision: number; readyRequestRevision: number;
  generation: number; readyGeneration: number;
  pending: boolean;
  /** `empty` requires the manager's complete-empty publication witness. An
   * absent/generation-mismatched getter result is never an empty witness. */
  canonical: Readonly<{kind: 'bounds'; generation: number; bounds: SceneSolarEpochBounds} |
    {kind: 'empty'; generation: number}>;
  /** Issued only after every chosen leaf has been revalidated and settled ready
   * for this epoch, even when its selected resource key did not change.
   * Epoch zero means that this context's canonical baseline is ready. */
  ack?: SceneSolarEpochAck;
}>;
export type SceneSolarEpochPublishedCapture = Readonly<{
  kind: 'published-capture'; contextKey: string; revision: string;
  bounds: SceneSolarEpochBounds; complete: true;
}>;
export type SceneSolarEpochObservation = Readonly<{
  contextKey: string;
  rawResidentCoverage: Readonly<{
    kind: 'unforced-resident'; revision: string; confirmedRevision: string;
    bounds: SceneSolarEpochBounds; triangles: number; draws: number; complete: boolean;
  }>;
  providers: readonly SceneSolarEpochProvider[];
  /** A current, still-published receipt/event, never a historical replay. Its
   * absence means no new event; explicit withdrawal uses revokePublication(). */
  publishedCapture?: SceneSolarEpochPublishedCapture;
}>;
export type SceneSolarEpochCapturePlan = Readonly<{
  kind: 'witness' | 'epoch'; epochId: number; bounds: SceneSolarEpochBounds; revision: string;
}>;
export type SceneSolarEpochState = Readonly<{
  epochId: number | undefined;
  /** An edge notification: request a full detail revalidation once, not once per
   * render. Consuming it is not an acknowledgement from any provider. */
  needsRefresh: boolean;
  capturePending: boolean;
  receiverReady: boolean;
  reason: string;
}>;

const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const key = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 65536;
const validBounds = (value: unknown): value is SceneSolarEpochBounds => Array.isArray(value) && value.length === 6 &&
  value.every(Number.isFinite) && value[0] <= value[3] && value[1] <= value[4] && value[2] <= value[5];
const copy = (value: SceneSolarEpochBounds): SceneSolarEpochBounds => Object.freeze([...value]) as unknown as SceneSolarEpochBounds;
const equal = (a: SceneSolarEpochBounds, b: SceneSolarEpochBounds) => a.every((value, i) => value === b[i]);
const contains = (a: SceneSolarEpochBounds, b: SceneSolarEpochBounds) => [0, 1, 2].every(i => a[i] <= b[i] && a[i + 3] >= b[i + 3]);
const union = (a: SceneSolarEpochBounds, b: SceneSolarEpochBounds): SceneSolarEpochBounds => Object.freeze([
  Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]),
  Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5]),
]) as SceneSolarEpochBounds;
let nextOwner = 0;

/** Integration requirements:
 * - Read unforced coverage between equal raw source revisions. Never feed the
 *   capture's forced epoch bounds back as rawResidentCoverage.
 * - Read provider request/readiness/canonical generation receipts atomically.
 *   Missing lazy providers, failed work and temporary missing bounds stay unknown.
 *   The compositor may attest these receipts from its existing flush/readiness
 *   barrier; this contract does not require a new method on every manager.
 * - Stamp a publishedCapture only after the issued capture plan really completed
 *   and published, using its actual bounds and exact plan revision.
 *   A real publication-withdrawn callback must synchronously revokePublication()
 *   and discard any queued frame-end proof. Never replay a withdrawn receipt.
 * - Consume publication receipts at frame end before changing the epoch. On the
 *   next prerender the new epoch/pending revision must unpublish the old snapshot
 *   before main draws. Otherwise the caller needs an explicit receiver barrier.
 * - reset on 2D, context loss/replacement and destroy. It does not release or
 *   disable any external resource; stale receiver/capture invalidation is owned
 *   by the compositor. No timer, resource lease or source reference lives here.
 */
export function createSceneSolarCoverageEpoch(providerIds: readonly string[]) {
  if (!Array.isArray(providerIds) || !providerIds.length || providerIds.length > 7 ||
      providerIds.some(id => !key(id)) || new Set(providerIds).size !== providerIds.length) throw Error('Invalid solar epoch providers');
  const expected = Object.freeze([...providerIds]), owner = ++nextOwner;
  let nextEpoch = 0, nextPlan = 0, contextKey: string | undefined;
  let epoch: {id: number; contextKey: string; bounds: SceneSolarEpochBounds} | undefined;
  let projectionSafe = false, publishedRevision: string | undefined;
  let issued: {plan: SceneSolarEpochCapturePlan; contextKey: string; rawRevision: string;
    providerStamp: string; candidate: SceneSolarEpochBounds} | undefined;
  let lastReason = 'no-evidence';

  const state = (needsRefresh = false): SceneSolarEpochState => Object.freeze({
    epochId: epoch?.id, needsRefresh, capturePending: !issued,
    receiverReady: !!issued && issued.plan.kind === 'epoch' && publishedRevision === issued.plan.revision,
    reason: lastReason,
  });
  function refuse(reason: string, keepProjection = false): SceneSolarEpochState {
    projectionSafe = keepProjection && epoch?.contextKey === contextKey;
    issued = undefined; publishedRevision = undefined; lastReason = reason; return state();
  }
  function observe(input: SceneSolarEpochObservation): SceneSolarEpochState {
    if (!input || !key(input.contextKey)) { contextKey = undefined; return refuse('invalid-context'); }
    if (contextKey !== input.contextKey) {
      contextKey = input.contextKey; epoch = undefined; issued = undefined; publishedRevision = undefined;
    }
    const raw = input.rawResidentCoverage;
    if (!raw || raw.kind !== 'unforced-resident') return refuse('unforced-coverage-required');
    if (!key(raw.revision) || raw.revision !== raw.confirmedRevision) return refuse('unstable-source-revision');
    if (!raw.complete || !validBounds(raw.bounds) || !integer(raw.triangles) || !integer(raw.draws)) return refuse('incomplete-resident-coverage');
    if (!Array.isArray(input.providers) || input.providers.length !== expected.length) return refuse('missing-provider');
    const rows = new Map<string, SceneSolarEpochProvider>();
    for (const provider of input.providers) {
      if (!provider || !expected.includes(provider.provider) || rows.has(provider.provider)) return refuse('invalid-provider');
      rows.set(provider.provider, provider);
    }
    let candidate = copy(raw.bounds), unsettled = false;
    const stamps = expected.map(id => {
      const row = rows.get(id)!; return [id, row.requestRevision, row.generation] as const;
    });
    for (const id of expected) {
      const row = rows.get(id)!;
      if (![row.requestRevision, row.readyRequestRevision, row.generation, row.readyGeneration].every(integer) || typeof row.pending !== 'boolean') return refuse('invalid-provider-stamp');
      const canonical = row.canonical;
      if (!canonical || !integer(canonical.generation) || canonical.generation !== row.generation) return refuse('canonical-generation-mismatch');
      if (canonical.kind === 'bounds') {
        if (!validBounds(canonical.bounds)) return refuse('invalid-canonical-bounds');
        candidate = union(candidate, canonical.bounds);
      } else if (canonical.kind !== 'empty') return refuse('canonical-witness-required');
      unsettled ||= row.pending || row.requestRevision !== row.readyRequestRevision || row.generation !== row.readyGeneration;
    }
    projectionSafe = epoch?.contextKey === contextKey;
    if (unsettled) return refuse('providers-pending', true);
    const requiredEpoch = epoch?.id ?? 0;
    for (const id of expected) {
      const row = rows.get(id)!, ack = row.ack;
      if (!ack || ack.contextKey !== contextKey || ack.epochId !== requiredEpoch ||
          ack.requestRevision !== row.requestRevision || ack.generation !== row.generation) return refuse('provider-ack-pending', true);
    }
    const kind = !epoch || !equal(epoch.bounds, candidate) ? 'witness' : 'epoch';
    const bounds = epoch ? union(epoch.bounds, candidate) : candidate, providerStamp = JSON.stringify(stamps);
    if (!issued || issued.contextKey !== contextKey || issued.rawRevision !== raw.revision ||
        issued.providerStamp !== providerStamp || issued.plan.kind !== kind || !equal(issued.plan.bounds, bounds) || !equal(issued.candidate, candidate)) {
      issued = {contextKey, rawRevision: raw.revision, providerStamp, candidate: copy(candidate), plan: Object.freeze({
        kind, epochId: requiredEpoch, bounds: copy(bounds), revision: `scene-solar-coverage-epoch:${owner}:${++nextPlan}`,
      })};
      publishedRevision = undefined;
    }
    const proof = input.publishedCapture;
    if (proof) {
      if (proof.kind !== 'published-capture' || proof.complete !== true || proof.contextKey !== contextKey ||
          proof.revision !== issued.plan.revision || !validBounds(proof.bounds) ||
          !contains(proof.bounds, issued.plan.bounds) || !contains(proof.bounds, candidate)) {
        lastReason = 'published-capture-mismatch'; return state();
      }
      if (kind === 'witness') {
        // The candidate comes only from the unforced resident/canonical union.
        // In particular a shrink witness may still include the previous epoch.
        epoch = {id: ++nextEpoch, contextKey, bounds: copy(candidate)};
        projectionSafe = true; issued = undefined; publishedRevision = undefined;
        lastReason = 'epoch-refresh-required'; return state(true);
      }
      publishedRevision = issued.plan.revision; lastReason = 'epoch-capture-published'; return state();
    }
    lastReason = kind === 'witness' ? 'witness-capture-required' : publishedRevision === issued.plan.revision ? 'epoch-capture-published' : 'epoch-capture-required';
    return state();
  }
  return {
    observe,
    projectionFor(leafBounds: SceneSolarEpochBounds): Readonly<{epochId: number; bounds: SceneSolarEpochBounds}> | undefined {
      if (!epoch || !projectionSafe || epoch.contextKey !== contextKey || !validBounds(leafBounds)) return;
      return Object.freeze({epochId: epoch.id, bounds: union(epoch.bounds, leafBounds)});
    },
    capturePlan(): SceneSolarEpochCapturePlan | undefined { return issued?.plan; },
    revokePublication() {
      publishedRevision = undefined; lastReason = 'publication-revoked';
    },
    /** Temporary missing coverage is not a new context or an empty scene. Drop
     * its projection/capture evidence while retaining the established epoch.
     * Restored evidence issues a fresh plan, so old publication proofs cannot
     * revive a withdrawn receiver or manufacture a new refresh edge. */
    withdrawObservation(): SceneSolarEpochState {
      return refuse('resident-coverage-unavailable');
    },
    get state(): SceneSolarEpochState { return state(); },
    reset() {
      contextKey = undefined; epoch = undefined; issued = undefined; publishedRevision = undefined;
      projectionSafe = false; lastReason = 'reset';
      // IDs remain monotone: a late receipt/ack cannot match a later reset cycle.
    },
  };
}
