// Version 1: evaluate only in the external browser assigned by the operator.
// `binding` is supplied by candidate.py extract-js; no browser/GL state is mutated.
if (location.hostname !== '127.0.0.1' || !location.pathname.startsWith(binding.prefix))
  throw Error('Not the declared local candidate');
const response = await fetch(binding.prefix + '__render__/identity.json', {cache: 'no-store', redirect: 'error'});
if (!response.ok || response.headers.get('X-Render-Candidate') !== binding.candidate_id)
  throw Error('Candidate server binding failed');
const identity = await response.json();
if (identity.candidate_id !== binding.candidate_id) throw Error('Wrong candidate identity');
const raw = document.getElementById('scene-render-proof')?.textContent;
if (!raw || raw.length > 1000000) throw Error('Missing or oversized scene proof');
const proof = JSON.parse(raw), source = proof.scene?.solarShadow, core = source?.core;
if (proof.schemaVersion !== 1) throw Error('Unsupported scene proof schema');
const short = (value, limit = 1024) => typeof value === 'string' ? value.slice(0, limit) : undefined;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const boolean = value => typeof value === 'boolean' ? value : undefined;
const numbers = (value, keys) => record(value) ? Object.fromEntries(keys.map(key => [key, number(value[key])])) : undefined;
const providers = ['root500', 'delegated500', 'tier300', 'church', 'city', 'infill', 'bremen'];
const count = value => record(value) ? {triangles: number(value.triangles), draws: number(value.draws),
  complete: boolean(value.complete), reason: short(value.reason)} : undefined;
const preparation = value => record(value) ? {status: short(value.status, 32),
  pending: number(value.pending), failed: number(value.failed), reason: short(value.reason)} : undefined;

// These counters describe cumulative logical JSON handed to module initializers.
// Raw-store budgets, logical input and retained process/JS heap are different metrics.
const frozen = proof.frozenTableInputs, resolved = frozen?.resolvedInputs;
const frozenTableInputs = record(frozen) ? {
  ...numbers(frozen, ['retainedBytes', 'active', 'activeModules', 'queued', 'pendingInitializers',
    'completedInitializers', 'reads', 'parses', 'failures', 'selectedRawByteBudget', 'selectedRawInputBound']),
  sessionActive: boolean(frozen.sessionActive), parsedValuesShared: boolean(frozen.parsedValuesShared),
  resolvedInputs: record(resolved) ? {
    measurement: 'cumulative-logical-json-input-not-retained-heap', scope: short(resolved.scope, 96),
    ...numbers(resolved, ['performanceTimeOriginMs', 'resolvedJSONBytes', 'firstResolveMs',
      'lastResolveMs', 'maxDecodeParseMs']),
    byProvider: record(resolved.byProvider) ? Object.fromEntries(providers.filter(provider =>
      record(resolved.byProvider[provider])).map(provider => [provider,
      numbers(resolved.byProvider[provider], ['initializers', 'logicalJSONBytes'])])) : undefined,
    largest: Array.isArray(resolved.largest) ? resolved.largest.slice(0, 8).filter(record).map(value => ({
      file: short(value.file, 256), sha256: short(value.sha256, 64),
      ...numbers(value, ['bytes', 'occurrence', 'sessionEpoch', 'decodeParseStartMs',
        'resolvedAtMs', 'decodeParseElapsedMs'])})) : undefined,
    largestTruncated: Array.isArray(resolved.largest) ? resolved.largest.length > 8 : undefined,
    extractorLimit: 8,
  } : undefined,
} : undefined;
// This owner covers migrated assets only. Keep legacy initializer diagnostics
// separate; logical ready-cell input bytes are not retained/process memory.
const resources = proof.frozenDataResources;
const frozenDataResources = record(resources) ? {
  ...numbers(resources, ['active', 'queued', 'waiters', 'leases', 'valueCells', 'entries',
    'peakConcurrency', 'reads', 'parses', 'releasedValues', 'acquisitions',
    'logicalBytesWithLiveLease', 'cumulativeLogicalJSONBytes', 'clients']),
  measurement: short(resources.measurement, 128),
  source: 'scene-render-proof.frozenDataResources', snapshot: 'native-render',
  scope: 'migrated-assets-only; legacy-inputs-remain-separate',
  limitation: 'Resource cells/logical JSON input, not whole heap or current physical footprint; native counters are not recomputed from lease counts',
} : undefined;

const sourceDescription = value => record(value) ? {characters: number(value.characters),
  hash: short(value.hash, 64)} : undefined;
const synchronousPhases = ['source-build', 'source-description', 'vertex-submit', 'fragment-submit',
  'link-submit', 'completion-query', 'link-status', 'vertex-status', 'fragment-status', 'upload', 'cleanup'];
const synchronousPhase = value => record(value) && synchronousPhases.includes(value.phase) ? {
  phase: value.phase, ...numbers(value, ['startedAtMs', 'endedAtMs', 'durationMs']),
} : undefined;
const preparationTiming = value => record(value) ? {
  ...numbers(value, ['queuedAtMs', 'startedAtMs', 'settledAtMs', 'queueWaitMs', 'wallMs',
    'synchronousMs', 'khrCompletionWaitMs', 'khrCompletionQueries']),
  lastSynchronousPhase: synchronousPhase(value.lastSynchronousPhase),
  longestSynchronousPhase: synchronousPhase(value.longestSynchronousPhase),
} : undefined;
const terminalIdentity = value => ({provider: short(value.provider, 64), source: short(value.source, 128),
  resource: short(value.resource, 256), epoch: number(value.epoch),
  priority: short(value.priority, 32), status: short(value.status, 32)});
const terminalPhases = value => record(value) ? Object.fromEntries(
  ['ready', 'failed', 'cancelled', 'lost'].filter(status => record(value[status])).map(status => {
    const slot = value[status], synchronous = synchronousPhase(slot.longestSynchronousPhase);
    return [status, {
      lastSettledAtMs: number(slot.lastSettledAtMs),
      longestSynchronousPhase: synchronous ? {...terminalIdentity(slot.longestSynchronousPhase), ...synchronous} : undefined,
      longestKHRCompletionWait: record(slot.longestKHRCompletionWait) ? {
        ...terminalIdentity(slot.longestKHRCompletionWait),
        ...numbers(slot.longestKHRCompletionWait, ['startedAtMs', 'endedAtMs', 'durationMs']),
      } : undefined,
    }];
  })) : undefined;
const programDiagnostic = value => record(value) ? {
  provider: short(value.provider, 64), priority: short(value.priority, 32),
  source: short(value.source, 128), resource: short(value.resource, 256), phase: short(value.phase, 64),
  status: short(value.status, 32), epoch: number(value.epoch), reason: short(value.reason, 512),
  vertex: sourceDescription(value.vertex), fragment: sourceDescription(value.fragment),
  timing: preparationTiming(value.timing),
} : undefined;
const programStats = (value, failureBudget) => {
  if (!record(value)) return undefined;
  const failures = Array.isArray(value.failures) ? value.failures.slice(0, Math.min(4, failureBudget.remaining))
    .filter(record).map(programDiagnostic) : undefined;
  failureBudget.remaining -= failures?.length ?? 0;
  const pending = value.pendingResources;
  return {
    ...numbers(value, ['schemaVersion', 'revision', 'pending', 'failed', 'ready',
      'performanceTimeOriginMs', 'observedAtMs']), timingScope: short(value.timingScope, 32),
    pendingResources: Array.isArray(pending) ? pending.slice(0, 8).filter(row =>
      record(row) && row.status === 'pending').map(row => ({...programDiagnostic(row),
      schedulingState: short(row.schedulingState, 32)})) : undefined,
    pendingResourcesTruncated: value.pendingResourcesTruncated === true ||
      (Array.isArray(pending) && pending.length > 8) ? true : boolean(value.pendingResourcesTruncated),
    phaseTimings: record(value.phaseTimings) ? Object.fromEntries(synchronousPhases.filter(phase =>
      record(value.phaseTimings[phase])).map(phase => [phase,
      numbers(value.phaseTimings[phase], ['calls', 'totalMs', 'maxMs'])])) : undefined,
    terminalPhases: terminalPhases(value.terminalPhases),
    failures, failuresTruncated: Array.isArray(value.failures) ? value.failures.length > failures.length : undefined,
    last: programDiagnostic(value.last),
    context: record(value.context) ? {
      ...numbers(value.context, ['epoch', 'pending', 'inFlight', 'maxInFlight', 'visibleStarts']),
      scheduled: boolean(value.context.scheduled),
    } : undefined,
  };
};
// The independent idle proof is optional. Read it at most once, and only for
// diagnostics absent from the native proof; a present empty native field wins.
let detail, detailRead = false, detailUnavailableReason;
const readDetail = () => {
  if (detailRead) return detail;
  detailRead = true;
  const raw = document.getElementById('map-detail-proof')?.textContent;
  if (!raw) detailUnavailableReason = 'missing-idle-proof';
  else if (raw.length > 1000000) detailUnavailableReason = 'oversized-idle-proof';
  else {try {detail = JSON.parse(raw);} catch {detailUnavailableReason = 'invalid-idle-proof';}}
  return detail;
};
// Live rows belong to the same native render/monotonic snapshot as solar.
// Never fill a partial/empty live snapshot from an older independent idle proof.
const programPreparation = {available: false}, programProviders = {};
let programRows = [];
const livePrograms = Object.prototype.hasOwnProperty.call(proof, 'programPreparation');
if (livePrograms) {
  Object.assign(programPreparation, {source: 'scene-render-proof.programPreparation',
    snapshot: 'native-render', freshness: 'same-render-proof',
    proof_sequence: number(proof.sequence), proof_monotonic_ms: number(proof.monotonicMs)});
  if (Array.isArray(proof.programPreparation)) {
    programRows = proof.programPreparation.slice(0, 7).filter(record)
      .map(value => ({provider: value.provider, value}));
    programPreparation.providersTruncated = proof.programPreparation.length > 7;
  } else programPreparation.unavailable_reason = 'invalid-live-program-preparation';
} else {
  Object.assign(programPreparation, {
    source: 'map-detail-proof.threeDimensional.paintProviders.*.renderer.programPreparation',
    snapshot: 'independent-idle', freshness: 'not-reported; may be stale or absent during startup'});
  const ownerStats = readDetail()?.threeDimensional?.paintProviders;
  if (detailUnavailableReason) programPreparation.unavailable_reason = detailUnavailableReason;
  programRows = providers.map(provider => ({provider, value: ownerStats?.[provider]?.renderer?.programPreparation}));
}
const failureBudget = {remaining: 8};
for (const {provider, value} of programRows) {
  if (!providers.includes(provider) || programProviders[provider] || !record(value)) continue;
  programProviders[provider] = programStats(value, failureBudget);
}
if (Object.keys(programProviders).length) {
  programPreparation.available = true; programPreparation.providers = programProviders;
} else if (!programPreparation.unavailable_reason) programPreparation.unavailable_reason = livePrograms
  ? 'no-live-provider-records' : 'missing-program-preparation';
programPreparation.limits = {providers: 7, failuresPerProvider: 4, failuresTotal: 8,
  pendingResourcesPerProvider: 8, synchronousPhaseKinds: 11, terminalSlots: 4};
programPreparation.timing_limitation = 'Provider clocks are native performanceTimeOriginMs/observedAtMs; synchronous phases are CPU wall measurements; KHR completion wait includes timer/query/other CPU intervals, is not GPU compile time and is not additive with synchronousMs';

const booleans = (value, keys) => record(value)
  ? Object.fromEntries(keys.map(key => [key, boolean(value[key])])) : undefined;
const nullableBoolean = value => value === null ? null : boolean(value);
const cachedFailureBudget = {remaining: 8};
const readinessRenderer = value => record(value) ? {
  ...booleans(value, ['destroyed', 'pageHidden', 'enabled', 'hasGL', 'hasProgram', 'hasVAO',
    'hasVertexBuffer', 'hasIndexBuffer', 'hasStateBuffer', 'hasMatrix', 'contextLost',
    'partitionPending', 'geometryUploadPending', 'shadowUploadPending']),
  ...numbers(value, ['geometryUploadRevision', 'generation', 'viewRevision', 'components', 'vertices', 'indices']),
  geometryUploadFailure: short(value.geometryUploadFailure, 512),
  mainGeometryProgramFailure: short(value.mainGeometryProgramFailure, 512),
  contextRecoveryFailure: short(value.contextRecoveryFailure, 512),
  programPreparation: programStats(value.programPreparation, cachedFailureBudget),
  partition: record(value.partition) ? {
    ...booleans(value.partition, ['enabled', 'pending']),
    ...numbers(value.partition, ['renderCount', 'cached', 'required', 'missing']),
    lastRenderAt: short(value.partition.lastRenderAt, 40),
    lastCompile: record(value.partition.lastCompile) ? {
      key: short(value.partition.lastCompile.key, 256), startedAt: short(value.partition.lastCompile.startedAt, 40),
      state: short(value.partition.lastCompile.state, 32), elapsedMs: number(value.partition.lastCompile.elapsedMs),
      error: short(value.partition.lastCompile.error, 512),
    } : undefined,
  } : undefined,
  projection: record(value.projection) ? {
    lastMatrixInvalidation: record(value.projection.lastMatrixInvalidation) ? {
      ...numbers(value.projection.lastMatrixInvalidation, ['generation', 'viewRevision']),
      reason: short(value.projection.lastMatrixInvalidation.reason, 128),
      at: short(value.projection.lastMatrixInvalidation.at, 40),
    } : undefined,
    lastRenderedProjection: record(value.projection.lastRenderedProjection) ? {
      ...numbers(value.projection.lastRenderedProjection, ['generation', 'viewRevision']),
      at: short(value.projection.lastRenderedProjection.at, 40),
      partitionPending: boolean(value.projection.lastRenderedProjection.partitionPending),
    } : undefined,
  } : undefined,
} : undefined;
const readinessProviders = {}, liveReadiness = Object.prototype.hasOwnProperty.call(proof, 'managerDrawReadiness');
const observedAtMs = number(performance.now()), documentTimeOriginMs = number(performance.timeOrigin);
const publicationMs = number(proof.monotonicMs);
const cacheClock = value => {
  const recordedAtMs = number(value.recordedAtMs), originMs = number(value.performanceTimeOriginMs);
  const sameClock = recordedAtMs !== undefined && recordedAtMs >= 0 && originMs !== undefined && originMs >= 0 &&
    originMs === documentTimeOriginMs && observedAtMs !== undefined && publicationMs !== undefined &&
    recordedAtMs <= publicationMs && publicationMs <= observedAtMs;
  const epochMs = sameClock ? number(originMs + recordedAtMs) : undefined;
  const timestamp = epochMs !== undefined ? new Date(epochMs) : undefined;
  const valid = timestamp !== undefined && Number.isFinite(timestamp.getTime());
  return {...numbers(value, ['recordedAtMs', 'performanceTimeOriginMs']),
    cache_recorded_at: valid ? timestamp.toISOString() : null,
    cache_age_ms: valid ? observedAtMs - recordedAtMs : null};
};
let cachedDetail, readinessRows = [], readinessUnavailableReason, readinessProvidersTruncated;
if (liveReadiness) {
  if (Array.isArray(proof.managerDrawReadiness)) {
    readinessRows = proof.managerDrawReadiness.slice(0, 7).filter(record)
      .map(value => ({provider: value.provider, value: value.record}));
    readinessProvidersTruncated = proof.managerDrawReadiness.length > 7;
  } else readinessUnavailableReason = 'invalid-live-manager-draw-readiness';
} else {
  cachedDetail = readDetail();
  readinessRows = providers.map(provider => ({provider,
    value: cachedDetail?.threeDimensional?.paintProviders?.[provider]?.drawReadiness}));
  readinessUnavailableReason = detailUnavailableReason;
}
for (const {provider, value} of readinessRows) {
  if (!providers.includes(provider) || readinessProviders[provider] || !record(value) ||
    !['waiting', 'ready', 'timeout', 'error'].includes(value.phase)) continue;
  readinessProviders[provider] = {
    ...numbers(value, ['ticket', 'inspections']), phase: value.phase,
    snapshot: record(value.snapshot) ? {
      ...booleans(value.snapshot, ['pageVisible', 'rendererPresent', 'pickReadyEvaluated']),
      mapMoving: nullableBoolean(value.snapshot.mapMoving), pickReady: nullableBoolean(value.snapshot.pickReady),
    } : undefined,
    renderer: readinessRenderer(value.renderer),
    ...(liveReadiness ? cacheClock(value) : {}),
  };
}
const idleCapture = cachedDetail?.idleCapture;
const managerDrawReadiness = {
  available: Object.keys(readinessProviders).length > 0,
  source: liveReadiness ? 'scene-render-proof.managerDrawReadiness'
    : 'map-detail-proof.threeDimensional.paintProviders.*.drawReadiness',
  snapshot: liveReadiness ? 'manager-cached-via-native-render' : 'manager-cached-via-independent-idle',
  freshness: liveReadiness ? 'per-provider cache clocks; render publication is not cache recording time'
    : 'cache-recording-time-not-reported; may be stale',
  cache_recorded_at: null, cache_age_ms: null,
  providersTruncated: readinessProvidersTruncated,
  render_publication: liveReadiness ? {sequence: number(proof.sequence), monotonicMs: publicationMs} : undefined,
  observation: liveReadiness ? {performanceTimeOriginMs: documentTimeOriginMs, monotonicMs: observedAtMs} : undefined,
  idle_publication: record(idleCapture) ? {
    ...numbers(idleCapture, ['sequence', 'idleSequence', 'monotonicMs']),
    utc: short(idleCapture.utc, 40), documentHidden: boolean(idleCapture.documentHidden),
  } : undefined,
  timing_limitation: 'Publication clocks date publication only; native provider cache_age_ms is measured at extraction only with matching document origin and recording <= publication <= observation; unknown clocks remain null; aggregate cache time is not reported. Legacy idle_publication does not date its cache. cache.snapshot is the last inspection; cache.renderer and its native programPreparation clock are recorded at phase finish/update; partition.lastCompile.elapsedMs is one compile call, not GPU time; nested KHR wait is non-additive wall time',
  providers: Object.keys(readinessProviders).length ? readinessProviders : undefined,
  unavailable_reason: Object.keys(readinessProviders).length ? undefined
    : readinessUnavailableReason ?? (liveReadiness ? 'no-live-manager-draw-readiness-records'
      : 'missing-or-invalid-manager-draw-readiness'),
  limits: {providers: 7, errorCharacters: 512, pendingResourcesPerProvider: 8,
    programFailuresPerProvider: 4, programFailuresTotal: 8, synchronousPhaseKinds: 11, terminalSlots: 4},
};
const solar = record(source) ? {mode: short(source.mode, 32), hidden: boolean(source.hidden), suspended: boolean(source.suspended),
  destroyed: boolean(source.destroyed), faulted: boolean(source.faulted), lastError: short(source.lastError),
  core: record(core) ? {status: short(core.status, 32), published: boolean(core.published), lastError: short(core.lastError),
    preparation: preparation(core.preparation), coverage: count(core.coverage), captureResult: count(core.captureResult),
    captures: number(core.captures), failures: number(core.failures)} : undefined} : undefined;
return {schema_version: 1, candidate_id: binding.candidate_id, server_candidate_id: identity.candidate_id,
  proof_schema_version: proof.schemaVersion,
  extractor_sha256: binding.extractor_sha256, url: short(location.href, 2048), captured_at: new Date().toISOString(),
  proof_age_ms: performance.now() - proof.monotonicMs, sequence: number(proof.sequence),
  document_hidden: document.hidden, mode: short(proof.mode, 32), wanted_mode: short(proof.wantedMode, 32),
  gpu_unavailable: boolean(proof.gpuUnavailable), recovery: short(proof.recovery, 32), recovery_revision: number(proof.recoveryRevision), solar,
  frozen_table_inputs: frozenTableInputs, program_preparation: programPreparation,
  frozen_data_resources: frozenDataResources,
  manager_draw_readiness: managerDrawReadiness,
  browser: {user_agent: short(navigator.userAgent, 512), platform: short(navigator.platform, 128),
    viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
    gpu_backend: 'not measured by this read-only extractor'},
  limitation: 'Runtime readiness observation; no GPU backend, visual or performance acceptance claim'};
