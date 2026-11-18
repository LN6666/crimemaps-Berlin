import {parseBuildingDetailDemand, selectBuildingDetailResource, selectBuildingDetailFocusResource, buildingDetailPeripheralLevel, type BuildingDetailDemandIndex, type BuildingDetailLevel, type BuildingDetailPassDemand, type BuildingDetailResource, type BuildingDetailSelection} from './building-detail-demand';
import {createBuildingDetailResidency, type BuildingDetailLease, type BuildingDetailPublisher} from './building-detail-residency';
import {createBuildingDetailSource, type BuildingDetailSourceValue} from './building-detail-source';
import type {NativeSourceClient, NativeSourceDescriptor} from './shared-native-source';
import type {ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import type {BuildingDetailIndexResolver} from './building-detail-catalog';
import type {ResourceBytesLease} from './resource-byte-transport';
import {ResourceBudgetExceededError} from './render-runtime/resource-budget';

export type BuildingDetailCanonicalLeaf = NativeSourceDescriptor & {id: string};
export type BuildingDetailSessionAdoption = {generation: number; resourceKeys?: readonly string[]};
export type BuildingDetailSessionReadiness = {generation: number; ready: boolean; error?: unknown};
export type BuildingDetailSessionOptions = {requestId: number; signal: AbortSignal};
export type BuildingDetailSessionSubset = {resourceKeys?: readonly string[]};
export type BuildingDetailSessionLeaf = {value: BuildingDetailSourceValue; resource: BuildingDetailResource; selection: BuildingDetailSelection};
export type BuildingDetailSessionStatus = 'open' | 'adopted' | 'ready' | 'finished' | 'aborted' | 'failed-before-publication' | 'committed-not-ready';
export class StaleBuildingDetailDemandError extends Error {
  constructor(readonly preparedKey: string, readonly currentKey: string | undefined) {
    super('Building detail demand changed before drawable publication'); this.name = 'StaleBuildingDetailDemandError';
  }
}
type SelectedAcquisition = (resource: BuildingDetailResource, context: {signal: AbortSignal}) => Promise<BuildingDetailLease<BuildingDetailSourceValue>>;
const aborted = () => new DOMException('Aborted', 'AbortError');
/** One canonical leaf: this runtime's latest level decision beside the resource
 * of its newest ready publication. `published` holds only when both agree. */
export type BuildingDetailSelectionSnapshotLeaf = Readonly<{
  city: string; leafId: string; canonicalIndexSHA256: string; canonicalLeafSHA256: string;
  selectedLevel: BuildingDetailLevel; resourceKey: string; geometrySHA256: string; descriptorSHA256: string;
  reason: BuildingDetailSelection['reason']; passes: BuildingDetailSelection['passes']; selections: number;
  published: boolean; publishedBy?: 'session' | 'resident'; publishedLevel?: BuildingDetailLevel; publishedResourceKey?: string;
  publishedGeometrySHA256?: string;
  /** Session publications only: the renderer generation the session adopted. */
  publishedGeneration?: number;
  /** Resident publications only: that resident's own publication count, never a renderer generation. */
  residentPublications?: number;
}>;
export type BuildingDetailSelectionSnapshot = Readonly<{
  schema: 'crimemaps-building-detail-selection-snapshot-v1'; city: string; leaves: readonly BuildingDetailSelectionSnapshotLeaf[];
  /** Newest generation a manager session settled ready; compare it with the renderer revision. */
  publishedGeneration?: number; observedLeaves: number; maxObservedLeaves: number; droppedObservations: number;
  thresholdsCalibrated: false; evidence: 'runtime-selection-and-ready-publication-not-pixels';
}>;
/** Diagnostics only: the snapshot observes decisions and never feeds selection.
 * The cap bounds observed decisions; published leaves are listed in addition,
 * bounded by one adoption's resource keys plus the live residents. */
const MAX_OBSERVED_DETAIL_LEAVES = 512;

/** One entry point for detail metadata, selection, source acquisition and fenced
 * resident lifetime. No catalog, decoded geometry or alternative-level cache is owned.
 */
export function createBuildingDetailRuntime(options: {
  city: string;
  resolveDetailIndex: BuildingDetailIndexResolver;
  /** An independent native client, never a callback routed through this runtime. */
  readCanonical: NativeSourceClient['read'];
  readBytes(path: string, signal: AbortSignal, max: number): Promise<Uint8Array>;
  vertexCap?: number; geometryPositionCap?: number;
  /** Native fallback already covers canonical-only leaves. Avoid loading their
   * extra group metadata when the caller only needs actual geometry switching. */
  variantLeavesOnly?: boolean;
  resourceStore?: ChunkResourceStore;
  acquireBytes?: (path: string, signal: AbortSignal, max: number) => Promise<ResourceBytesLease>;
  acquireSelected?: SelectedAcquisition;
  getDemands(index: BuildingDetailDemandIndex): readonly BuildingDetailPassDemand[];
}) {
  const resourceStore = options.resourceStore ?? getPageChunkResourceStore();
  const source = createBuildingDetailSource({...options, resourceStore});
  const acquireSelected: SelectedAcquisition = options.acquireSelected ?? source.acquire;
  // Read-only record of what this runtime decided and what a ready publication
  // actually adopted, so an external acceptance run can prove that a LOD variant
  // was used. Only strings are kept; observations are capped (published leaves
  // are listed in addition), failure-isolated and never consulted.
  type ObservedLeaf = {city: string; leafId: string; canonicalIndexSHA256: string; canonicalLeafSHA256: string; level: BuildingDetailLevel; resourceKey: string;
    geometrySHA256: string; descriptorSHA256: string; reason: BuildingDetailSelection['reason']; passes: BuildingDetailSelection['passes']; selections: number};
  // A session leaf carries the renderer generation it adopted; a resident leaf
  // carries only that resident's own publication count.
  type PublishedLeaf = ObservedLeaf & ({by: 'session'; generation: number} | {by: 'resident'; publications: number});
  type AdoptedLeaf = readonly [key: string, leaf: ObservedLeaf];
  const observedLeaves = new Map<string, ObservedLeaf>(), residentPublished = new Map<string, PublishedLeaf>();
  let sessionPublished = new Map<string, PublishedLeaf>(), sessionPublishedGeneration: number | undefined, droppedObservations = 0;
  const leafKey = (index: BuildingDetailDemandIndex) => JSON.stringify([index.canonicalIndex.sha256, index.canonicalLeaf.sha256, index.canonicalLeaf.id]);
  const describe = (index: BuildingDetailDemandIndex, selection: BuildingDetailSelection, selections: number): ObservedLeaf => ({city: selection.resource.city, leafId: index.canonicalLeaf.id,
    canonicalIndexSHA256: selection.resource.canonicalIndexSHA256, canonicalLeafSHA256: selection.resource.canonicalLeafSHA256, level: selection.resource.level, resourceKey: selection.resource.key,
    geometrySHA256: selection.resource.geometrySHA256, descriptorSHA256: selection.resource.descriptor.sha256, reason: selection.reason, passes: selection.passes, selections});
  function observeSelection(index: BuildingDetailDemandIndex, selection: BuildingDetailSelection) {
    try {
      const key = leafKey(index), previous = observedLeaves.get(key);
      observedLeaves.delete(key); observedLeaves.set(key, describe(index, selection, (previous?.selections ?? 0) + 1));
      while (observedLeaves.size > MAX_OBSERVED_DETAIL_LEAVES) { observedLeaves.delete(observedLeaves.keys().next().value!); droppedObservations++; }
    } catch { droppedObservations++; }
    return selection;
  }
  function adoptedLeaves(rows: readonly {index?: BuildingDetailDemandIndex; selection?: BuildingDetailSelection}[]): readonly AdoptedLeaf[] | undefined {
    try { return rows.map(({index, selection}) => [leafKey(index!), describe(index!, selection!, 0)] as const); } catch { droppedObservations++; return undefined; }
  }
  function observeSessionPublication(generation: number, adopted: readonly AdoptedLeaf[]) {
    try {
      if (sessionPublishedGeneration !== undefined && generation < sessionPublishedGeneration) return;
      const next = new Map<string, PublishedLeaf>();
      for (const [key, leaf] of adopted) next.set(key, {...leaf, by: 'session', generation});
      sessionPublished = next; sessionPublishedGeneration = generation;
    } catch { droppedObservations++; }
  }
  function getBuildingDetailSelectionSnapshot(): BuildingDetailSelectionSnapshot {
    const leaves: BuildingDetailSelectionSnapshotLeaf[] = [];
    for (const key of new Set([...observedLeaves.keys(), ...sessionPublished.keys(), ...residentPublished.keys()])) {
      const shown = sessionPublished.get(key) ?? residentPublished.get(key), selected = observedLeaves.get(key) ?? shown!;
      leaves.push(Object.freeze({city: selected.city, leafId: selected.leafId, canonicalIndexSHA256: selected.canonicalIndexSHA256, canonicalLeafSHA256: selected.canonicalLeafSHA256,
        selectedLevel: selected.level, resourceKey: selected.resourceKey, geometrySHA256: selected.geometrySHA256, descriptorSHA256: selected.descriptorSHA256,
        reason: selected.reason, passes: selected.passes, selections: selected.selections, published: shown?.resourceKey === selected.resourceKey,
        ...(shown ? {publishedBy: shown.by, publishedLevel: shown.level, publishedResourceKey: shown.resourceKey, publishedGeometrySHA256: shown.geometrySHA256,
          ...(shown.by === 'session' ? {publishedGeneration: shown.generation} : {residentPublications: shown.publications})} : {})}));
    }
    return Object.freeze({schema: 'crimemaps-building-detail-selection-snapshot-v1' as const, city: options.city, leaves: Object.freeze(leaves),
      ...(sessionPublishedGeneration === undefined ? {} : {publishedGeneration: sessionPublishedGeneration}),
      observedLeaves: observedLeaves.size, maxObservedLeaves: MAX_OBSERVED_DETAIL_LEAVES, droppedObservations,
      thresholdsCalibrated: false as const, evidence: 'runtime-selection-and-ready-publication-not-pixels' as const});
  }
  // Focus plan pins: leaf -> exact admitted level (peripheral sample, grace or
  // unknown-projection hold). Every acquisition, cached registration,
  // validation and resident check below uses this same select, so a pinned
  // representation is the one that is loaded, validated and published.
  const focusPins = new Map<string, BuildingDetailLevel>();
  const select = (index: BuildingDetailDemandIndex, demands = options.getDemands(index), previousLevel?: BuildingDetailLevel) => {
    const pinned = focusPins.get(leafKey(index));
    return observeSelection(index, pinned ? selectBuildingDetailFocusResource(index, demands, pinned) : selectBuildingDetailResource(index, demands, previousLevel));
  };
  function assertCanonicalPicking(index: BuildingDetailDemandIndex, resource: BuildingDetailResource) {
    if (options.getDemands(index).some(demand => demand.pass === 'picking') && resource.level !== 'near') throw Error('Canonical picking target did not select canonical geometry');
  }
  function openSession({requestId, signal}: BuildingDetailSessionOptions) {
    if (!Number.isSafeInteger(requestId) || requestId < 0) throw Error('Invalid building detail session request');
    signal.throwIfAborted();
    type Entry = {index?: BuildingDetailDemandIndex; resource?: BuildingDetailResource; selection?: BuildingDetailSelection; pending: boolean; cached: boolean; adopted: boolean; validated: boolean;
      promise?: Promise<BuildingDetailSessionLeaf>; lease?: BuildingDetailLease<BuildingDetailSourceValue>};
    const entries = new Map<string, Entry>();
    let status: BuildingDetailSessionStatus = 'open', committed = false, generation: number | undefined, error: string | undefined;
    let closed = false, acquisitions = 0, sourceLeases = 0, sourceReleases = 0, cachedRegistrations = 0;
    const controller = new AbortController();
    let validatedKeys: readonly string[] = [], hasValidation = false;
    let resourceKeys: readonly string[] = [], adopted: readonly AdoptedLeaf[] | undefined;
    const release = (entry: Entry) => {
      const lease = entry.lease; entry.lease = undefined;
      if (lease) { sourceLeases--; sourceReleases++; lease.release(); }
    };
    function clearBorrows() {
      for (const entry of entries.values()) { release(entry); entry.index = undefined; entry.resource = undefined; entry.selection = undefined; entry.promise = undefined; }
      entries.clear();
    }
    function finish() {
      closed = true; controller.abort(aborted()); clearBorrows(); validatedKeys = []; hasValidation = false;
      if (!committed && status === 'open') status = 'finished';
      if (!committed || status === 'ready' || status === 'committed-not-ready') signal.removeEventListener('abort', abort);
    }
    function fail(reason?: unknown) {
      closed = true; status = committed ? 'committed-not-ready' : 'failed-before-publication';
      error = reason === undefined ? undefined : String(reason instanceof Error ? reason.message : reason).slice(0, 1024);
      controller.abort(aborted()); signal.removeEventListener('abort', abort); clearBorrows();
    }
    function abort() {
      closed = true; status = committed ? 'committed-not-ready' : 'aborted';
      controller.abort(aborted()); signal.removeEventListener('abort', abort); clearBorrows();
    }
    signal.addEventListener('abort', abort, {once: true});
    function borrow(entry: Entry): BuildingDetailSessionLeaf {
      const lease = entry.lease, resource = entry.resource, selection = entry.selection;
      if (!lease || !resource || !selection) throw Error('Building detail session has no live source borrow');
      const value = lease.value;
      // A custom lease getter may reenter finish/abort. Never return the value
      // after that getter released this session's claim.
      signal.throwIfAborted(); if (closed || entry.lease !== lease) throw aborted();
      return {value, resource, selection};
    }
    function acquire(index: BuildingDetailDemandIndex, resource: BuildingDetailResource, selection: BuildingDetailSelection): Promise<BuildingDetailSessionLeaf> {
      signal.throwIfAborted(); if (closed) return Promise.reject(aborted());
      const existing = entries.get(resource.key); if (existing?.promise) return existing.promise;
      if (existing?.lease) {
        try { return Promise.resolve(borrow(existing)); }
        catch (reason) { if (!closed) fail(reason); return Promise.reject(reason); }
      }
      const entry: Entry = {index, resource, selection, pending: true, cached: false, adopted: false, validated: false}; entries.set(resource.key, entry); acquisitions++;
      const operation = (async () => {
        const lease = await acquireSelected(resource, {signal: controller.signal}); sourceLeases++; entry.lease = lease; entry.pending = false;
        if (closed || signal.aborted) { release(entry); throw aborted(); }
        return borrow(entry);
      })().catch(reason => { entry.pending = false; release(entry); if (!closed) fail(reason); throw reason; }).finally(() => {
        entry.pending = false;
        // Only in-flight work is shared. A fulfilled leaf contains the large
        // source value; settled entries borrow their existing live lease anew.
        if (entry.promise === operation) entry.promise = undefined;
      });
      entry.promise = operation; return operation;
    }
    function validateBeforeAdopt(settings: BuildingDetailSessionSubset = {}) {
      signal.throwIfAborted(); if (closed) throw aborted();
      const keys = settings.resourceKeys ? [...settings.resourceKeys] : [...entries].filter(([, entry]) => !entry.pending).map(([key]) => key);
      if (new Set(keys).size !== keys.length) throw Error('Duplicate building detail validation resource');
      for (const key of keys) {
        const entry = entries.get(key);
        if (!entry || entry.pending || !entry.lease && !entry.cached && !entry.adopted || !entry.index || !entry.resource || !entry.selection) throw Error('Building detail session readers have not completed');
        const current = select(entry.index, options.getDemands(entry.index), entry.selection.resource.level);
        if (current.resource.key !== entry.resource.key) { const stale = new StaleBuildingDetailDemandError(entry.resource.key, current.resource.key); fail(stale); throw stale; }
        assertCanonicalPicking(entry.index, entry.resource);
        entry.validated = true;
      }
      validatedKeys = keys; hasValidation = true;
    }
    return {
      acquireLeaf(index: BuildingDetailDemandIndex, settings: {previousLevel?: BuildingDetailLevel} = {}) {
        const selection = select(index, options.getDemands(index), settings.previousLevel); return acquire(index, selection.resource, selection);
      },
      acquireSelected(resource: BuildingDetailResource, {index}: {index: BuildingDetailDemandIndex}) {
        const selection = select(index, options.getDemands(index), resource.level);
        if (selection.resource.key !== resource.key) { const stale = new StaleBuildingDetailDemandError(resource.key, selection.resource.key); fail(stale); return Promise.reject(stale); }
        return acquire(index, resource, selection);
      },
      registerCached(index: BuildingDetailDemandIndex, resource: BuildingDetailResource) {
        signal.throwIfAborted(); if (closed) throw aborted();
        const selection = select(index, options.getDemands(index), resource.level);
        if (selection.resource.key !== resource.key) { const stale = new StaleBuildingDetailDemandError(resource.key, selection.resource.key); fail(stale); throw stale; }
        const existing = entries.get(resource.key);
        if (existing) { existing.validated = false; if (!existing.pending && !existing.lease) { existing.cached = true; existing.adopted = false; } }
        else entries.set(resource.key, {index, resource, selection, pending: false, cached: true, adopted: false, validated: false});
        cachedRegistrations++;
      },
      validateBeforeAdopt,
      adopt(adoption: BuildingDetailSessionAdoption) {
        signal.throwIfAborted(); if (closed) throw aborted();
        const keys = adoption.resourceKeys ? [...adoption.resourceKeys] : [...validatedKeys];
        if (!adoption.resourceKeys && !hasValidation || !Number.isSafeInteger(adoption.generation) || adoption.generation < 0 || generation !== undefined && adoption.generation < generation || new Set(keys).size !== keys.length || keys.some(key => { const entry = entries.get(key); return !entry || entry.pending || !entry.validated; })) throw Error('Building detail adoption requires a validated settled subset and nondecreasing generation');
        committed = true; generation = adoption.generation; status = 'adopted'; error = undefined; resourceKeys = Object.freeze(keys);
        adopted = adoptedLeaves(keys.map(key => entries.get(key)!));
        // The manager now owns its prepared/source scope independently. Retire
        // only this session's extra construction borrows, never manager/GPU data.
        for (const key of keys) { const entry = entries.get(key)!; release(entry); entry.promise = undefined; entry.adopted = true; entry.validated = false; }
        validatedKeys = []; hasValidation = false;
      },
      settleReady(readiness: BuildingDetailSessionReadiness) {
        if (committed && readiness.generation < generation!) return;
        if (!committed || readiness.generation !== generation) throw Error('Building detail readiness generation mismatch');
        if (status === 'committed-not-ready' || signal.aborted) { status = 'committed-not-ready'; return; }
        status = readiness.ready ? 'ready' : 'committed-not-ready';
        if (status === 'ready' && adopted) observeSessionPublication(generation!, adopted);
        if (readiness.error !== undefined) error = String(readiness.error instanceof Error ? readiness.error.message : readiness.error).slice(0, 1024);
        if (closed) signal.removeEventListener('abort', abort);
      },
      finish,
      close: finish,
      abort,
      fail,
      get state() { return {requestId, status, committed, generation, resourceKeys, error}; },
      get stats() { return {acquisitions, sourceLeases, sourceReleases, cachedRegistrations, trackedResources: entries.size}; },
    };
  }
  return {
    openSession,
    async resolveDetailIndex(canonicalIndexSHA256: string, leaf: BuildingDetailCanonicalLeaf, {signal}: {signal: AbortSignal}): Promise<BuildingDetailDemandIndex | undefined> {
      signal.throwIfAborted();
      const metadata = options.resolveDetailIndex.acquire ? await options.resolveDetailIndex.acquire(canonicalIndexSHA256, leaf, signal) : undefined;
      let reservation: ReturnType<typeof resourceStore.budget.reserve> | undefined;
      try {
        let raw = options.resolveDetailIndex.acquire ? metadata?.value : await options.resolveDetailIndex(canonicalIndexSHA256, leaf, signal);
        signal.throwIfAborted(); if (raw === undefined) return undefined;
        if (metadata?.groupMetadata) {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid catalogue-bound detail demand');
          const document = raw as Record<string, unknown>, bound = document.groupMetadata, boundAsset = metadata.groupMetadata;
          if (bound !== undefined && (!bound || typeof bound !== 'object' || ['path', 'sha256', 'bytes', 'compression', 'uncompressed_bytes', 'uncompressed_sha256'].some(field => (bound as Record<string, unknown>)[field] !== (boundAsset as unknown as Record<string, unknown>)[field]))) throw Error('Detail catalogue group metadata binding mismatch');
          if (bound === undefined) raw = {...document, groupMetadata: boundAsset};
        }
        // Parsing clones authority/component descriptors. Reserve before those
        // copies exist; their request role ends on cancellation of this view.
        reservation = resourceStore.budget.reserve({category: 'metadata', bytes: estimateRetainedBuildingPayload(raw).estimatedJsContainerBytes * 2 + 4096, precision: 'estimate'}, {label: 'selected detail demand descriptors'});
        const index = parseBuildingDetailDemand(raw, {city: options.city, canonicalIndexSHA256, canonicalLeafSHA256: leaf.sha256});
        if (index.canonicalLeaf.id !== leaf.id || ['path', 'bytes', 'compression', 'uncompressed_bytes'].some(key => (index.canonicalLeaf as Record<string, unknown>)[key] !== (leaf as Record<string, unknown>)[key]) ||
            leaf.uncompressed_sha256 !== undefined && index.canonicalLeaf.uncompressed_sha256 !== leaf.uncompressed_sha256) throw Error('Building detail canonical leaf descriptor mismatch');
        // Fully validate the authority before opting out. An invalid or stale
        // catalogue must still fail; an unchanged model uses the manager's
        // existing native path, without a group read or retained LOD descriptor.
        if (options.variantLeavesOnly && index.variants.length === 0) return undefined;
        if (!reservation.adjust({category: 'metadata', bytes: estimateRetainedBuildingPayload(index).estimatedJsContainerBytes, precision: 'estimate', identity: index})) throw resourceStore.budget.stats.lastPressure ? new ResourceBudgetExceededError(resourceStore.budget.stats.lastPressure) : Error('Selected detail demand exceeds page metadata budget');
        const held = reservation; reservation = undefined;
        const release = () => {signal.removeEventListener('abort', release); held.release();};
        signal.addEventListener('abort', release, {once: true}); if (signal.aborted) {release();signal.throwIfAborted();}
        return index;
      } finally {metadata?.release();reservation?.release();}
    },
    select,
    /** Focus planning query, neither observed nor affected by pins: the
     * ordinary demand selection, the cheapest real level the passes permit,
     * and the exact resource of an existing level (for a retained hold). */
    focusRepresentations(index: BuildingDetailDemandIndex, previousLevel?: BuildingDetailLevel) {
      const demands = options.getDemands(index);
      return {
        detail: selectBuildingDetailResource(index, demands, previousLevel).resource,
        peripheral: selectBuildingDetailFocusResource(index, demands, buildingDetailPeripheralLevel(index, demands)).resource,
        level(level: BuildingDetailLevel): BuildingDetailResource | undefined {
          if (level !== 'near' && !index.variants.some(variant => variant.level === level)) return undefined;
          const resource = selectBuildingDetailFocusResource(index, demands, level).resource;
          return resource.level === level ? resource : undefined;
        },
      };
    },
    /** The error a focus plan raises when a demand (picking, selection) changed
     * the representation it had planned for a leaf: every provider already
     * answers it by planning again instead of reporting a failure. */
    staleFocusDemand(preparedKey: string, currentKey: string | undefined): Error {
      return new StaleBuildingDetailDemandError(preparedKey, currentKey);
    },
    /** Replace this runtime's focus pins with the levels of the current plan's
     * admissions that differ from the ordinary demand selection. */
    pinFocusLevels(rows: readonly {index: BuildingDetailDemandIndex; level: BuildingDetailLevel}[]) {
      const next = new Map<string, BuildingDetailLevel>();
      for (const {index, level} of rows) {
        if (level !== 'near' && !index.variants.some(variant => variant.level === level)) throw Error('Focus pin names a missing detail level');
        const key = leafKey(index), previous = next.get(key);
        if (previous !== undefined && previous !== level) throw Error('Conflicting focus pins for one detail leaf');
        next.set(key, level);
      }
      focusPins.clear(); for (const [key, level] of next) focusPins.set(key, level);
    },
    get focusPinCount() { return focusPins.size; },
    getBuildingDetailSelectionSnapshot,
    assertCanonicalPicking,
    acquireSelected,
    createResident<T>(index: BuildingDetailDemandIndex, consumer: {
      /** Performs the owner's actual SOURCE admission, construction and upload. */
      prepare(value: BuildingDetailSourceValue, resource: BuildingDetailResource, context: {signal: AbortSignal}): Promise<BuildingDetailLease<T>>;
      /** Resolve only at the drawable manager ticket/generation fence. Rejection
       * or abort must leave/restore the previous publication, including clear.
       */
      publish: BuildingDetailPublisher<BuildingDetailResource, T>;
    }) {
      let generation = 0, suspended = false, destroyed = false, committedLevel: BuildingDetailLevel = 'near';
      let lastSelection: BuildingDetailSelection | undefined;
      let acquisitions = 0, sourceLeases = 0, preparedLeases = 0, sourceReleases = 0, preparedReleases = 0, publications = 0;
      type PreparedValue = {prepared: T; afterPublish(): void};
      // Snapshot only: at most one described record per level of this leaf.
      const describedByKey = new Map<string, ObservedLeaf>();
      const currentSelection = () => {
        const selection = select(index, options.getDemands(index), committedLevel);
        try { describedByKey.set(selection.resource.key, describe(index, selection, 0)); } catch { droppedObservations++; }
        return selection;
      };
      const observeResidentPublication = (resourceKey: string | undefined) => {
        try {
          const key = leafKey(index), leaf = resourceKey === undefined ? undefined : describedByKey.get(resourceKey);
          if (leaf) residentPublished.set(key, {...leaf, by: 'resident', publications}); else residentPublished.delete(key);
        } catch { droppedObservations++; }
      };
      const checkDemand = (resource: BuildingDetailResource) => {
        const current = currentSelection();
        if (current.resource.key !== resource.key) throw new StaleBuildingDetailDemandError(resource.key, current.resource.key);
      };
      const residency = createBuildingDetailResidency<BuildingDetailResource, PreparedValue>({
        async acquire(resource, {signal}) {
          const own = ++generation; acquisitions++;
          let sourceLease: BuildingDetailLease<BuildingDetailSourceValue> | undefined, preparedLease: BuildingDetailLease<T> | undefined;
          const releaseSource = () => {
            const lease = sourceLease; sourceLease = undefined;
            if (lease) { sourceLeases--; sourceReleases++; lease.release(); }
          };
          const releasePrepared = () => {
            const lease = preparedLease; preparedLease = undefined;
            if (lease) { preparedLeases--; preparedReleases++; lease.release(); }
          };
          const check = () => { signal.throwIfAborted(); if (destroyed || suspended || own !== generation) throw aborted(); };
          try {
            sourceLease = await acquireSelected(resource, {signal}); sourceLeases++; check();
            preparedLease = await consumer.prepare(sourceLease.value, resource, {signal}); preparedLeases++; check();
            checkDemand(resource);
            let held: PreparedValue | undefined = {prepared: preparedLease.value, afterPublish: releaseSource};
            return {
              get value() { if (!held) throw Error('Building detail prepared lease has been released'); return held; },
              release() { if (!held) return; held = undefined; try { releasePrepared(); } finally { releaseSource(); } },
            };
          } catch (error) { try { releasePrepared(); } finally { releaseSource(); } throw error; }
        },
        async publish(value, resource, context) {
          if (value && resource) checkDemand(resource);
          await consumer.publish(value?.prepared, resource, context);
          context.signal.throwIfAborted();
          // Construction inputs retire only after the actual drawable fence;
          // T is consumer-owned and is never extended with raw/source references.
          if (value && resource) { value.afterPublish(); committedLevel = resource.level; publications++; }
          observeResidentPublication(value && resource ? resource.key : undefined);
        },
      });
      const completed = (selection: BuildingDetailSelection) => {
        if (destroyed || suspended) throw aborted();
        if (residency.state.published?.key !== selection.resource.key) throw new StaleBuildingDetailDemandError(selection.resource.key, residency.state.published?.key);
        return selection;
      };
      return {
        async refresh(settings: {releaseBeforeAcquire?:boolean} = {}): Promise<BuildingDetailSelection> {
          if (destroyed) throw aborted();
          const selection = currentSelection(); lastSelection = selection;
          await residency.select(selection.resource, settings);
          return completed(selection);
        },
        suspend(): Promise<void> { suspended = true; generation++; return residency.suspend(); },
        async resume(): Promise<BuildingDetailSelection | undefined> {
          if (destroyed) return undefined;
          if (!suspended) return lastSelection;
          const selection = currentSelection(); lastSelection = selection;
          await residency.select(selection.resource); suspended = false;
          await residency.resume(); return completed(selection);
        },
        destroy(): Promise<void> { destroyed = true; generation++; observeResidentPublication(undefined); describedByKey.clear(); return residency.destroy(); },
        get state() { return residency.state; },
        get stats() { return {acquisitions, sourceLeases, preparedLeases, sourceReleases, preparedReleases, publications}; },
      };
    },
  };
}
export type BuildingDetailSession = ReturnType<ReturnType<typeof createBuildingDetailRuntime>['openSession']>;
