export type SceneSolarDetailBounds = readonly [number, number, number, number, number, number];
export type SceneSolarDetailSettlement = Readonly<{
  requestRevision: number;
  readyRequestRevision: number;
  generation: number;
  readyGeneration: number;
  pending: boolean;
  canonical?: Readonly<{generation: number; kind: 'bounds'; bounds: SceneSolarDetailBounds} |
    {generation: number; kind: 'empty'}>;
}>;
export type SceneSolarDetailSettlementInput = Readonly<{
  active: boolean;
  failed: boolean;
  requestRevision: number;
  readyRequestRevision: number | undefined;
  generation: number | undefined;
  readyGeneration: number | undefined;
  pending: boolean;
  publicationGeneration?: number;
  publicationBounds?: SceneSolarDetailBounds;
}>;

const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Copy already-observed scalar receipts. This neither records successful work
 * nor infers it from a resource key, a vertex count or the current generation.
 * A pending request may expose an older real ready ticket; it is not settled
 * until both ticket/generation pairs match and pending is false. */
export function deriveSceneSolarDetailSettlement(input: SceneSolarDetailSettlementInput): SceneSolarDetailSettlement | undefined {
  if (!input.active || input.failed || typeof input.pending !== 'boolean' ||
      !revision(input.requestRevision) || !revision(input.readyRequestRevision) ||
      !revision(input.generation) || !revision(input.readyGeneration) ||
      input.readyRequestRevision > input.requestRevision || input.readyGeneration > input.generation) return;
  let canonical: SceneSolarDetailSettlement['canonical'];
  if (input.publicationGeneration === input.generation) {
    const bounds = input.publicationBounds;
    if (bounds === undefined) canonical = Object.freeze({generation: input.generation, kind: 'empty'});
    else {
      if (!Array.isArray(bounds) || bounds.length !== 6 || !bounds.every(Number.isFinite) ||
          bounds[0] > bounds[3] || bounds[1] > bounds[4] || bounds[2] > bounds[5]) return;
      canonical = Object.freeze({generation: input.generation, kind: 'bounds',
        bounds: Object.freeze([...bounds]) as unknown as SceneSolarDetailBounds});
    }
  }
  return Object.freeze({requestRevision: input.requestRevision, readyRequestRevision: input.readyRequestRevision,
    generation: input.generation, readyGeneration: input.readyGeneration, pending: input.pending,
    ...(canonical ? {canonical} : {})});
}
