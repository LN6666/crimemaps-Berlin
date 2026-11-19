import {inflateBounded3DGzip} from './bounded-3d-gzip';
import {estimateRetainedBuildingPayload} from './building-payload-cost';
import {BUILDING_DETAIL_GROUP_RAW_LIMIT, isBuildingDetailMeshoptEncoding, validateBuildingDetailGroupMetadataAsset, type BuildingDetailAsset, type BuildingDetailResource} from './building-detail-demand';
import type {BuildingDetailLease} from './building-detail-residency';
import type {NativeSourceDescriptor, NativeSourceResult} from './shared-native-source';
import {getPageChunkResourceStore} from './render-runtime/chunk-resource-store';
import type {ChunkProductionContext, ChunkResourceLease, ChunkResourceRole, ChunkResourceStore} from './render-runtime/chunk-resource-types';
import {ResourceBudgetExceededError, type ResourceBudget, type ResourceBudgetCost, type ResourceBudgetReservation} from './render-runtime/resource-budget';
import {parseBuildingDetailGroups, type BuildingDetailGroups} from './building-detail-groups';
import {resourceByteAdmittedEnvelope, resourceByteReadEnvelope, type ResourceByteDeliveryRefusedError, type ResourceByteEnvelope, type ResourceBytesAcquire, type ResourceBytesLease} from './resource-byte-transport';

const PHYSICAL_LIMIT = 1024 ** 2, RAW_LIMIT = 4 * 1024 ** 2, HASH = /^[a-f0-9]{64}$/;
/** Per raw (inflated) byte of one group metadata read: what it holds beyond the
 * read buffer and the inflate estimate (2 raw + transport) while it decodes,
 * parses, validates (parseBuildingDetailGroups) and settles. Calibrated on
 * substitute documents, to be re-measured on real groups-*.json.gz
 * (calibrate-native, 2026-11-02, Node 22 cold processes, the real near pass of
 * this source with the real native pool, byte transport, page store and
 * ledger, 3 runs per document): no real group metadata exists on this
 * machine, so the real producer (buildBuildingDetailGroupMetadata +
 * detailJSON) made 9 documents from real 4caae82 leaves of three cities,
 * near-only to three levels, up to the 500000-byte wire limit (raw 1.1-3.7 MB,
 * raw/wire 6.4-7.9): six with unheld protection assessments, three with held
 * rows in the real inspect() shape (real reason names, owners and families,
 * two admission identities each; all or half of the components held).
 * Stand-ins: authority hashes, mid/coarse rows that reuse the canonical
 * geometry. k = (physical high-water - read P - inflate 2d+P) / d is at most
 * 6.69 (all held); ceil(6.69 x 1.25 + 1 decoded copy for a Blink TextDecoder)
 * = 10. It is calibrated for gzip documents, whose 2d+P inflate estimate
 * exceeds the real inflate buffer d by d+P; a plain document is charged no
 * inflate, so its margin is about 1.12x (deducting only the real buffers,
 * k <= 7.83), and its 500000-byte raw = wire cap keeps that shortfall under
 * 1 MB. At the 8 MiB raw limit the ledger admits about 97.4 MiB, inside the
 * 256 MiB page cap used for the original calibration. This is ledger
 * arithmetic. No measured document came near that raw size. */
export const DETAIL_GROUP_EXPANSION = 10;
/** Per raw byte of one display-variant read and parse (JSON text, parsed
 * document, metadata and plain attributes). Not calibrated: no display-variant
 * documents exist on this machine; it keeps the former 40. */
export const DETAIL_VARIANT_EXPANSION = 40;
const REPLACEMENT_SCHEMA = 'crimemaps-building-detail-replacement-v1';
type RecordValue = Record<string, unknown>;
export type BuildingDetailSourceValue = {
  raw: NativeSourceResult['raw'];
  admission: Readonly<{
    kind: 'canonical' | 'display-variant'; resourceKey: string; city: string;
    level: BuildingDetailResource['level']; geometrySHA256: string;
    canonicalIndexSHA256: string; canonicalLeafSHA256: string;
    bindings: BuildingDetailResource['bindings'];
  }>;
  /** Only canonical reads carry their original shadow header. Display geometry
   * needs independent variant-shadow evidence; its canonical signature is invalid.
   */
  verified?: NativeSourceResult['verified'];
  groups?: BuildingDetailGroups;
};

function object(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`Invalid building detail ${label}`);
  return value as RecordValue;
}
function hash(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !HASH.test(value)) throw Error(`Invalid building detail ${label} SHA256`);
}
function cap(value: number | undefined, label: string): number {
  const result = value ?? 200000;
  if (!Number.isSafeInteger(result) || result < 1 || result > 200000) throw Error(`Invalid building detail ${label} cap`);
  return result;
}
function descriptor(asset: NativeSourceDescriptor) {
  if (!asset || typeof asset.path !== 'string' || !/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+\.json(?:\.gz)?$/.test(asset.path) ||
      asset.path.slice(1).split('/').some(part => !part || part === '.' || part === '..') ||
      !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > PHYSICAL_LIMIT) throw Error('Invalid building detail asset descriptor');
  hash(asset.sha256, 'transport');
  if (asset.compression === 'gzip') {
    if (!asset.path.endsWith('.gz') || !Number.isSafeInteger(asset.uncompressed_bytes) || asset.uncompressed_bytes! < 1 || asset.uncompressed_bytes! > RAW_LIMIT) throw Error('Invalid building detail gzip descriptor');
    hash(asset.uncompressed_sha256, 'raw');
  } else if (asset.compression !== undefined || asset.path.endsWith('.gz') || asset.uncompressed_bytes !== undefined || asset.uncompressed_sha256 !== undefined) throw Error('Invalid building detail compression');
}
function resourceIdentity(resource: BuildingDetailResource, city: string) {
  if (!resource || resource.city !== city || typeof resource.key !== 'string' || !resource.key || resource.key.length > 8192 ||
      !['near', 'mid', 'coarse'].includes(resource.level)) throw Error('Invalid building detail resource identity');
  if (!Number.isSafeInteger(resource.vertices) || resource.vertices < 1 || resource.vertices > 200000 || !Number.isSafeInteger(resource.triangles) || resource.triangles < 1 || resource.triangles > 400000) throw Error('Invalid building detail selected geometry allocation');
  descriptor(resource.descriptor);
  for (const field of ['geometrySHA256', 'canonicalIndexSHA256', 'canonicalLeafSHA256'] as const) hash(resource[field], field);
  const bindings = object(resource.bindings, 'bindings');
  for (const field of ['sourcePBFSHA256', 'boundarySHA256', 'compilerSHA256', 'materialSHA256', 'producerSHA256', 'protectionSHA256', 'sourceEquivalenceSHA256']) hash(bindings[field], field);
  if (typeof bindings.sourceSnapshot !== 'string' || !bindings.sourceSnapshot || bindings.sourceSnapshot.length > 512) throw Error('Invalid building detail source snapshot');
  if (!Number.isSafeInteger(resource.componentCount) || resource.componentCount < 1 || resource.componentCount > 20000 || !Array.isArray(resource.components) || resource.components.length !== resource.componentCount) throw Error('Invalid building detail component count');
  if (resource.level === 'near' && resource.descriptor.sha256 !== resource.canonicalLeafSHA256) throw Error('Canonical building detail descriptor mismatch');
}
async function verify(bytes: Uint8Array, expected: string, signal: AbortSignal) {
  const result = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
  signal.throwIfAborted();
  if ([...result].map(byte => byte.toString(16).padStart(2, '0')).join('') !== expected) throw Error('Building detail transport SHA256 mismatch');
}
function replacementHeader(raw: RecordValue, resource: BuildingDetailResource) {
  const header = object(raw.detail_variant, 'replacement header');
  if (header.schema !== REPLACEMENT_SCHEMA || header.level !== resource.level) throw Error('Building detail replacement schema/level mismatch');
  for (const field of ['canonicalIndexSHA256', 'canonicalLeafSHA256', 'geometrySHA256'] as const) if (header[field] !== resource[field]) throw Error(`Building detail replacement ${field} mismatch`);
  for (const field of ['materialSHA256', 'sourceEquivalenceSHA256', 'producerSHA256', 'protectionSHA256'] as const) if (header[field] !== resource.bindings[field]) throw Error(`Building detail replacement ${field} mismatch`);
}
function componentIdentities(values: unknown, resource: BuildingDetailResource): RecordValue[] {
  if (!Array.isArray(values) || values.length !== resource.componentCount) throw Error('Building detail component count mismatch');
  const seen = new Set<string>();
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const component = object(value, 'component'), expected = resource.components[index];
    if (!expected || component.city !== resource.city || component.objectId !== expected.objectId || component.partId !== expected.partId ||
        !/^osm\/(way|relation)\/[1-9]\d*$/.test(String(component.objectId)) || typeof component.partId !== 'string' || !component.partId || component.partId.length > 256) throw Error('Building detail component identity/order mismatch');
    const key = `${component.objectId}|${component.partId}`;
    if (seen.has(key)) throw Error('Duplicate building detail component identity'); seen.add(key);
    if (!Array.isArray(component.origin) || component.origin.length !== 2 || !component.origin.every(Number.isFinite) || component.origin.some((value, axis) => value !== expected.origin[axis])) throw Error('Building detail component origin mismatch');
  }
  return values as RecordValue[];
}

/** Plain replacement geometry is bounded independently of render vertices.
 * SOURCE and component polygons remain the producer's original JSON values.
 */
function geometryChecker(positionCap: number) {
  let positions = 0;
  const seen = new WeakSet<object>();
  function coordinates(value: unknown, depth: number) {
    if (!Array.isArray(value) || !value.length || depth > 40) throw Error('Invalid building detail source coordinates');
    if (typeof value[0] === 'number') {
      if (++positions > positionCap || value.length < 2 || !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) throw Error('Building detail source geometry position budget/coordinate');
    } else for (const row of value) coordinates(row, depth + 1);
  }
  return function geometry(value: unknown, depth = 0): void {
    const raw = object(value, 'source geometry');
    if (depth > 40) throw Error('Building detail source geometry depth');
    if (seen.has(raw)) return; seen.add(raw);
    if (raw.type === 'GeometryCollection') {
      if (!Array.isArray(raw.geometries) || !raw.geometries.length) throw Error('Invalid building detail source collection');
      for (const child of raw.geometries) geometry(child, depth + 1);
    } else {
      if (!['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(String(raw.type))) throw Error('Invalid building detail source geometry type');
      coordinates(raw.coordinates, depth);
    }
  };
}
/** Admission of a document already restored by the producer's own codec
 * (decodeBuildingDetailMeshopt or decodeBuildingDetailJSON): both encodings
 * arrive here as typed render streams with every other producer field intact,
 * so the runtime value is exactly what the producer's round-trip validated.
 */
function replacementComponents(raw: RecordValue, resource: BuildingDetailResource, vertexCap: number, positionCap: number) {
  // Plain JSON replacements carry no encoding tag, or the codec's 'json' tag.
  const encoding = raw.encoding === undefined || raw.encoding === 'json' || isBuildingDetailMeshoptEncoding(raw.encoding);
  if (raw.schema_version !== 1 || raw.city !== resource.city || !encoding || raw.partial === true || !Array.isArray(raw.components) || raw.components.length !== resource.componentCount) throw Error('Building detail replacement is not a complete supported shard');
  const geometry = geometryChecker(positionCap);
  const original = componentIdentities(raw.components, resource);
  let vertices = 0, indices = 0;
  for (const component of original) {
    const footprint = object(component.componentGeometry, 'component polygon');
    if (footprint.type !== 'Polygon') throw Error('Building detail component polygon required');
    geometry(footprint);
    const source = object(component.sourceFeature, 'SOURCE Feature');
    if (source.type !== 'Feature' || !Object.hasOwn(source, 'properties') || source.properties !== null && (typeof source.properties !== 'object' || Array.isArray(source.properties))) throw Error('Invalid building detail SOURCE Feature');
    geometry(source.geometry);
    if (!Array.isArray(component.batches) || !component.batches.length) throw Error('Empty building detail component batches');
    for (const value of component.batches) {
      const batch = object(value, 'batch');
      const {positions, normals, indices: elements, color} = batch;
      if (!(positions instanceof Float32Array) || !(normals instanceof Float32Array) || !(elements instanceof Uint32Array) ||
          !positions.length || positions.length % 3 || normals.length !== positions.length || !elements.length || elements.length % 3 ||
          !positions.every(value => Number.isFinite(value) && Math.abs(value) <= 1e6) || !normals.every(Number.isFinite) ||
          !Array.isArray(color) || color.length !== 3 || !color.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw Error('Invalid decoded building detail render attributes');
      const count = positions.length / 3;
      vertices += count; indices += elements.length;
      if (vertices > vertexCap || indices > vertexCap * 6 || !elements.every(value => value < count)) throw Error('Decoded building detail render budget/index');
    }
  }
  const components = raw.components as NativeSourceResult['raw']['components'];
  return {schema_version: 1 as const, city: resource.city, components, decodedPayloadCost: estimateRetainedBuildingPayload(components)};
}

/** Buffer identities refer to whole backing allocations, including shared views. */
function payloadCosts(value: BuildingDetailSourceValue): ResourceBudgetCost[] {
  const cost = estimateRetainedBuildingPayload(value.raw.components), buffers = new Set<ArrayBufferLike>();
  for (const component of value.raw.components) for (const batch of component.batches)
    for (const array of [batch.positions, batch.normals, batch.indices]) if (ArrayBuffer.isView(array)) buffers.add(array.buffer);
  const costs: ResourceBudgetCost[] = [...buffers].map(buffer => ({category: 'decoded', bytes: buffer.byteLength, precision: 'exact', identity: buffer as object}));
  costs.push({category: 'metadata', bytes: cost.estimatedJsContainerBytes, precision: 'estimate', identity: value.raw.components});
  return costs;
}
function assertAllocation(raw: NativeSourceResult['raw'], resource: BuildingDetailResource) {
  let vertices = 0, triangles = 0;
  for (const component of raw.components) for (const batch of component.batches) {
    vertices += batch.positions.length / 3; triangles += batch.indices.length / 3;
  }
  if (vertices !== resource.vertices || triangles !== resource.triangles ||
      resource.decodedBytes !== undefined && resource.decodedBytes !== vertices * 24 + triangles * 12) throw Error('Building detail actual allocation disagrees with selected descriptor');
}
function consumerLease(source: ChunkResourceLease<BuildingDetailSourceValue>): BuildingDetailLease<BuildingDetailSourceValue> {
  let held: ChunkResourceLease<BuildingDetailSourceValue> | undefined = source;
  return {
    get value() { const value = held?.value; if (!value) throw Error('Building detail lease has been released'); return value; },
    retain(role: ChunkResourceRole = 'dependency') { if (!held) throw Error('Building detail lease has been released'); return consumerLease(held.retain(role)); },
    retainResource(role: ChunkResourceRole = 'dependency') { if (!held) throw Error('Building detail lease has been released'); return held.retain(role); },
    release() { const previous = held; held = undefined; previous?.release(); },
  };
}

type CapacityWake = {readonly promise: Promise<void>; cancel(): void};
const aborted = () => new DOMException('Building detail demand was released', 'AbortError');
/** One wake-up on the next availability wave, or a rejection when signal
 * aborts. A hint only, no timer: the waiter retries its exact admission. It is
 * always subscribed in the refusal's own synchronous segment, after the
 * production returned what it held, so no later release is missed and its own
 * release never wakes it. */
function capacityWake(budget: ResourceBudget, signal: AbortSignal): CapacityWake {
  let off: (() => void) | undefined, done = false, settle!: (error?: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    settle = error => {
      if (done) return; done = true; signal.removeEventListener('abort', abort);
      const stop = off; off = undefined; stop?.();
      if (error === undefined) resolve(); else reject(error);
    };
  });
  void promise.catch(() => {});
  const abort = () => settle(signal.reason ?? aborted());
  if (signal.aborted) abort(); else { signal.addEventListener('abort', abort, {once: true}); off = budget.onAvailable(() => settle(), signal); }
  return {promise, cancel: () => settle(aborted())};
}
/** An admission that cannot fit even on an empty page: reported, never waited for. */
function unfitError(budget: ResourceBudget, bytes: number, label: string): ResourceBudgetExceededError {
  const stats = budget.stats;
  return new ResourceBudgetExceededError(Object.freeze({capacity: stats.limitBytes, required: bytes, current: stats.bytes, recentCapacity: stats.recentLimitBytes,
    recentRequired: stats.recentBytes, recentCurrent: stats.recentBytes, shortfallBytes: Math.max(0, bytes - stats.limitBytes), recentShortfallBytes: 0,
    additionalBytes: bytes, constraint: 'total' as const, label: label.slice(0, 256)}));
}
/** A refused caller-admitted delivery, by its stable code and fields. */
function deliveryRefusal(error: unknown): ResourceByteDeliveryRefusedError | undefined {
  const refused = error as Partial<ResourceByteDeliveryRefusedError> | null;
  return refused?.code === 'RESOURCE_BYTE_DELIVERY_REFUSED' && Number.isSafeInteger(refused.envelopeBytes) && Number.isSafeInteger(refused.retryBytes) &&
    typeof refused.unfit === 'boolean' ? refused as ResourceByteDeliveryRefusedError : undefined;
}
const costBytes = (costs: readonly ResourceBudgetCost[]) => costs.reduce((bytes, cost) => bytes + cost.bytes, 0);
/** Thrown inside one production pass: everything the pass held was returned
 * and its wake-up is subscribed; the production waits, then starts a new pass. */
class CapacityWait extends Error {
  constructor(readonly wake: CapacityWake) { super('Building detail source waits for page capacity'); this.name = 'BuildingDetailCapacityWait'; }
}
/** A group metadata read's whole working set under identities its own entry
 * lists again (its estimate), so admitting it beside the decode leaves the group
 * read nothing to wait for. */
type GroupWorkingSet = {readonly envelope: readonly ResourceBudgetCost[]; readonly keep: readonly ResourceBudgetCost[]; readonly costs: readonly ResourceBudgetCost[]; readonly minted: boolean};
/** The last refusal of one group metadata read: the envelope a retry mints, or
 * not fitting. The page store keeps only the failure's name and pressure, and a
 * group entry may serve several detail sources (any source on the page with
 * the same resource key), so the refusal is recorded per page store and group
 * content key for every pass that waited on that entry, not in the closure of
 * the source whose production read it. `serial` tells a pass a new refusal
 * from one it already acted on; a successful read of the entry deletes it. */
type GroupRefusal = {readonly envelopeBytes: number; readonly unfit: boolean; readonly serial: number};
const groupRefusals = new WeakMap<ChunkResourceStore, Map<string, GroupRefusal>>();
let nextGroupRefusal = 0;
function recordGroupRefusal(store: ChunkResourceStore, key: string, envelopeBytes: number, unfit: boolean) {
  let rows = groupRefusals.get(store); if (!rows) { rows = new Map(); groupRefusals.set(store, rows); }
  rows.set(key, {envelopeBytes, unfit, serial: ++nextGroupRefusal});
}
function clearGroupRefusal(store: ChunkResourceStore, key: string) {
  const rows = groupRefusals.get(store); if (!rows) return;
  rows.delete(key); if (!rows.size) groupRefusals.delete(store);
}

/** Selected CPU content shares the page store. A caller's cancellation retires
 * only its waiting role; another view/pass can keep the same producer alive.
 * Every page-ledger admission of one source production is made before the work
 * it covers and never while waiting: the display-variant read and its parse
 * expansion together (with a byte transport as a caller-admitted read, its
 * envelope minted per read; without one, the two-copy read envelope shrunk to
 * the delivered buffer by identity), then, as one growth of that claim, the
 * decode together with the group metadata read's working set beyond the parse
 * expansion it reuses (the group read starts after the decode); the group
 * entry takes that working set over by identity.
 * A refused admission returns everything the production holds beyond its
 * descriptor estimate (reservations, byte lease, canonical source) and waits
 * on the page ledger's availability with the production's own signal, then
 * starts the pass again; a working set that cannot fit the page even alone is
 * reported as not fitting. acquireBytes must forward its 4th argument. */
export function createBuildingDetailSource(options: {
  city: string;
  readCanonical: (asset: NativeSourceDescriptor, signal: AbortSignal, vertexCap: number) => Promise<NativeSourceResult>;
  readBytes: (path: string, signal: AbortSignal, max: number) => Promise<Uint8Array>;
  resourceStore?: ChunkResourceStore;
  acquireBytes?: ResourceBytesAcquire;
  vertexCap?: number;
  geometryPositionCap?: number;
  meshoptDecoder?: Parameters<typeof import('./building-detail-meshopt').decodeBuildingDetailMeshopt>[1]['decoder'];
}) {
  if (!/^[a-z][a-z0-9-]*$/.test(options.city)) throw Error('Invalid building detail city');
  const vertexCap = cap(options.vertexCap, 'vertex'), positionCap = cap(options.geometryPositionCap, 'geometry position');
  const resources = options.resourceStore ?? getPageChunkResourceStore();
  let capacityWaits = 0, unfit = 0, deliveryRefusals = 0, unadmittedDeliveries = 0;
  /** Refused: report not fitting when `need` exceeds the whole page, otherwise
   * subscribe the wake-up now and leave the pass (its caller already returned
   * what the pass held). */
  function refuse(budget: ResourceBudget, signal: AbortSignal, need: number, what: string): never {
    if (need > budget.stats.limitBytes) { unfit++; throw unfitError(budget, need, 'building detail ' + what + ' does not fit the page'); }
    capacityWaits++; throw new CapacityWait(capacityWake(budget, signal));
  }
  function groupWorkingSet(asset: BuildingDetailAsset, envelopeBytes: number): GroupWorkingSet {
    const rawSize = asset.uncompressed_bytes ?? asset.bytes;
    const keep: ResourceBudgetCost[] = [
      {category: 'inflate', bytes: asset.compression === 'gzip' ? rawSize * 2 + asset.bytes : 0, precision: 'estimate', identity: {}},
      {category: 'metadata', bytes: rawSize * DETAIL_GROUP_EXPANSION, precision: 'estimate', identity: {}},
    ];
    const envelope: readonly ResourceBudgetCost[] = options.acquireBytes ? resourceByteAdmittedEnvelope(asset.path, asset.bytes, envelopeBytes)
      : resourceByteReadEnvelope(asset.path, Math.max(asset.bytes, envelopeBytes)).map(cost => ({...cost, identity: {}}));
    return {envelope, keep, costs: [...envelope, ...keep], minted: Boolean(options.acquireBytes)};
  }
  return {
    get stats() { return {capacityWaits, unfit, deliveryRefusals, unadmittedDeliveries, measurement: 'logical page-ledger admissions of building detail sources' as const}; },
    async acquire(resource: BuildingDetailResource, {signal}: {signal: AbortSignal}): Promise<BuildingDetailLease<BuildingDetailSourceValue>> {
      signal.throwIfAborted(); resourceIdentity(resource, options.city);
      const admission: BuildingDetailSourceValue['admission'] = Object.freeze({kind: resource.level === 'near' ? 'canonical' : 'display-variant', resourceKey: resource.key,
        city: resource.city, level: resource.level, geometrySHA256: resource.geometrySHA256, canonicalIndexSHA256: resource.canonicalIndexSHA256,
        canonicalLeafSHA256: resource.canonicalLeafSHA256, bindings: resource.bindings});
      let canonical: NativeSourceResult | undefined, groupLease: ChunkResourceLease<BuildingDetailGroups> | undefined, canonicalInGraph = false;
      const descriptorMetadataBytes = estimateRetainedBuildingPayload(resource).estimatedJsContainerBytes + 2048;
      const descriptorCost: ResourceBudgetCost = {category: 'metadata', bytes: descriptorMetadataBytes, precision: 'estimate', identity: resource};
      const groupAsset = resource.groupMetadata ? validateBuildingDetailGroupMetadataAsset(resource.groupMetadata) : undefined;
      // After a refused delivery: the envelopes the next pass mints (0 when
      // none). A group read refused for its delivery (recorded for its entry,
      // see GroupRefusal) sets groupRetry for the pass waiting on it; a second
      // such refusal seen by this source does not fit.
      const retry = {envelopeBytes: 0, readBytes: 0, groupEnvelopeBytes: 0, groupRetry: false, groupUnfit: false, groupSerial: 0};
      const groupKey = groupAsset ? JSON.stringify(['building-detail-groups-v1', groupAsset.sha256, groupAsset.bytes, groupAsset.compression ?? null, groupAsset.uncompressed_sha256 ?? null, groupAsset.uncompressed_bytes ?? null, resource.key]) : '';
      /** A pass's group read failed: whether its entry recorded a refusal this
       * source has not acted on yet; if so, one retry with an envelope that
       * covers the response, or not fitting. */
      function groupRefused(): boolean {
        const refusal = groupRefusals.get(resources)?.get(groupKey);
        if (!refusal || refusal.serial <= retry.groupSerial) return false;
        retry.groupSerial = refusal.serial;
        if (refusal.unfit || retry.groupEnvelopeBytes > 0) retry.groupUnfit = true; else retry.groupEnvelopeBytes = refusal.envelopeBytes;
        retry.groupRetry = true; return true;
      }
      function retainedCosts(value: BuildingDetailSourceValue): ResourceBudgetCost[] {
        const costs: ResourceBudgetCost[] = [descriptorCost];
        if (resource.level !== 'near' || !canonicalInGraph) costs.push(...payloadCosts(value));
        if (resource.level === 'near' && !canonicalInGraph && value.verified) costs.push({category: 'metadata', bytes: estimateRetainedBuildingPayload(value.verified).retainedPayloadEstimateBytes, precision: 'estimate', identity: value.verified});
        return costs;
      }
      /** The group entry's estimate is the working set the source pre-admitted
       * (same identities): its read never needs a byte the source did not admit.
       * Once the entry exists it lists that working set itself, so `handOff`
       * drops it from the source's own claim at once, before the read can
       * deliver: the entry's delivery then shrinks its envelope to the response
       * instead of adding the response beside an envelope the source still lists. */
      async function loadGroups(raw: NativeSourceResult['raw'], signal: AbortSignal, working: GroupWorkingSet | undefined, handOff: () => void) {
        if (!groupAsset || !working) return undefined;
        const asset = groupAsset, rawSize = asset.uncompressed_bytes ?? asset.bytes, envelope = working.envelope;
        const own = resources.acquire<BuildingDetailGroups>({
          contentKey: groupKey, role: 'dependency', allowRecent: false,
          estimate: working.costs,
          async produce(context) {
            let readLease: ResourceBytesLease | undefined;
            try {
              let bytes: Uint8Array;
              if (options.acquireBytes && working.minted) {
                try { readLease = await options.acquireBytes(asset.path, context.signal, asset.bytes, {admitted: context, envelope: envelope as ResourceByteEnvelope, keep: working.keep}); }
                catch (error) {
                  // The response exceeded the envelope: the source pass that
                  // waits on this fails over to a new pass with a larger one.
                  const refused = deliveryRefusal(error);
                  if (refused && !context.signal.aborted) { deliveryRefusals++; recordGroupRefusal(resources, groupKey, refused.envelopeBytes, refused.unfit); }
                  throw error;
                }
                bytes = readLease.bytes;
              } else bytes = await options.readBytes(asset.path, context.signal, asset.bytes);
              context.signal.throwIfAborted();
              if (bytes.byteLength !== asset.bytes) throw Error('Building detail group metadata size mismatch');
              await verify(bytes, asset.sha256, context.signal); context.signal.throwIfAborted();
              // The read envelope (or, after a caller-admitted delivery, the
              // response already listed) becomes the delivered buffer's identity.
              if (!readLease?.cost) unadmittedDeliveries += options.acquireBytes ? 1 : 0;
              if (!context.adjust([{category: 'read', bytes: bytes.buffer.byteLength, precision: 'exact', identity: bytes.buffer as object}, ...working.keep])) {
                recordGroupRefusal(resources, groupKey, Math.max(costBytes(envelope), bytes.buffer.byteLength), false);
                const pressure = context.budget.stats.lastPressure;
                throw pressure ? new ResourceBudgetExceededError(pressure) : unfitError(context.budget, costBytes(working.keep) + bytes.buffer.byteLength, 'building detail group metadata exceeds its admitted read');
              }
              const rawBytes = asset.compression === 'gzip' ? await inflateBounded3DGzip(bytes, rawSize, context.signal, asset.uncompressed_sha256, BUILDING_DETAIL_GROUP_RAW_LIMIT) : bytes;
              context.signal.throwIfAborted();
              const parsed = parseBuildingDetailGroups(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(rawBytes)), resource, raw);
              clearGroupRefusal(resources, groupKey); return parsed;
            } finally {readLease?.release();}
          },
          costs: value => ({category: 'metadata', bytes: estimateRetainedBuildingPayload(value).estimatedJsContainerBytes, precision: 'estimate', identity: value}),
        });
        // No byte moves: the entry (or one already producing for another source,
        // charged under its own identities) now lists the group read.
        handOff();
        let abort = () => {};
        try {
          await new Promise<void>((resolve, reject) => {abort = () => {own.release();reject(signal.reason);};signal.addEventListener('abort', abort, {once: true});void own.ready.then(resolve, reject);if(signal.aborted)abort();});
          signal.throwIfAborted(); if (!own.value) throw Error('Building detail groups retired'); groupLease = own; return own.value;
        } catch (error) {
          // Only a capacity failure (the store keeps its class) consults the refusal record.
          own.release(); if (!signal.aborted && error instanceof ResourceBudgetExceededError) groupRefused(); throw error;
        }
        finally { signal.removeEventListener('abort', abort); }
      }
      /** Admits `extra` together with the group read's working set (if any). */
      function admitGroups(budget: ResourceBudget, extra: readonly ResourceBudgetCost[], label: string) {
        const working = groupAsset ? groupWorkingSet(groupAsset, retry.groupEnvelopeBytes) : undefined;
        const result = budget.tryReserve([...extra, ...(working?.costs ?? [])], {label});
        return {working, result};
      }
      /** One near pass: the canonical source first (holding only the descriptor
       * estimate while it is read), then the legacy header charge and the group
       * read admitted before the canonical becomes a parent of this entry. */
      async function nearPass(context: ChunkProductionContext): Promise<BuildingDetailSourceValue> {
        const signal = context.signal, budget = context.budget;
        const result = await options.readCanonical(resource.descriptor, signal, vertexCap);
        let pre: ResourceBudgetReservation | undefined;
        try {
          result.transfer?.('dependency');
          signal.throwIfAborted();
          if (result.raw.schema_version !== 1 || result.raw.city !== resource.city) throw Error('Canonical building detail source identity mismatch');
          const components = componentIdentities(result.raw.components, resource), geometry = geometryChecker(positionCap);
          for (const component of components) { geometry(component.componentGeometry); geometry(object(component.sourceFeature, 'canonical SOURCE Feature').geometry); }
          assertAllocation(result.raw, resource);
          const graph = typeof result.retainResource === 'function';
          if (!graph) {
            // Legacy reader seams have no page-store parent to register.
            // Charge their entire observed raw/header before handing off;
            // this path never claims to expose a canonical ancestor.
            const legacy = retainedCosts({raw: result.raw, verified: result.verified, admission});
            if (!context.adjust(legacy)) {
              const need = costBytes(legacy) + (groupAsset ? costBytes(groupWorkingSet(groupAsset, retry.groupEnvelopeBytes).costs) : 0);
              result.release(); context.adjust([descriptorCost]); refuse(budget, signal, need, 'legacy canonical payload');
            }
          }
          const {working, result: admitted} = admitGroups(budget, [], 'building detail group metadata read');
          if (!admitted.ok) {
            const need = descriptorMetadataBytes + (graph ? 0 : costBytes(retainedCosts({raw: result.raw, verified: result.verified, admission})) - descriptorMetadataBytes) + costBytes(working?.costs ?? []);
            result.release(); context.adjust([descriptorCost]); refuse(budget, signal, need, 'group metadata read');
          }
          pre = admitted.reservation;
          // Loaded before the canonical becomes a parent of this entry, so a
          // pass that must start again leaves nothing registered behind.
          const groups = await loadGroups(result.raw, signal, working, () => { pre?.release(); pre = undefined; }); signal.throwIfAborted();
          if (graph) {
            const parent = result.retainResource('dependency');
            try { context.retainParent(parent); canonicalInGraph = true; } finally { parent.release(); }
          }
          if (groupLease) context.retainParent(groupLease);
          canonical = result;
          return {raw: result.raw, verified: result.verified, admission, groups};
        } catch (error) { pre?.release(); const metadata = groupLease; groupLease = undefined; metadata?.release(); result.release(); throw error; }
      }
      /** One display-variant pass, from read to retained payload and groups. */
      async function variantPass(context: ChunkProductionContext): Promise<BuildingDetailSourceValue> {
        const signal = context.signal, budget = context.budget;
        const asset = resource.descriptor, rawSize = asset.uncompressed_bytes ?? asset.bytes;
        // Reserve before network delivery, inflate, string/JSON expansion and
        // normalization, in one claim: the parse expansion and the read.
        const expansion: readonly ResourceBudgetCost[] = [
          {category: 'inflate', bytes: asset.compression === 'gzip' ? rawSize * 2 + asset.bytes : 0, precision: 'estimate', identity: {}},
          {category: 'normalize', bytes: rawSize * DETAIL_VARIANT_EXPANSION, precision: 'estimate', label: 'JSON string, metadata and plain attribute expansion', identity: {}},
        ];
        const normalize = expansion[1];
        // The byte transport admits nothing itself for this read: its envelope
        // is minted from this ceiling, the descriptor size validated above (<=
        // PHYSICAL_LIMIT), never the fixed 1 MiB limit for every detail read.
        const envelope = options.acquireBytes ? resourceByteAdmittedEnvelope(asset.path, asset.bytes, retry.envelopeBytes) : undefined;
        const read: readonly ResourceBudgetCost[] = envelope ?? resourceByteReadEnvelope(asset.path, Math.max(asset.bytes, retry.readBytes));
        const first = budget.tryReserve([...expansion, ...read], {label: 'building detail read and parse'});
        if (!first.ok) refuse(budget, signal, descriptorMetadataBytes + costBytes(expansion) + costBytes(read), 'read and parse expansion');
        const claim = first.reservation;
        let readLease: ResourceBytesLease | undefined;
        try {
          let bytes: Uint8Array | undefined;
          if (options.acquireBytes && envelope) {
            try { readLease = await options.acquireBytes(asset.path, signal, asset.bytes, {admitted: claim, envelope, keep: expansion}); }
            catch (error) {
              const refused = deliveryRefusal(error);
              if (!refused || signal.aborted) throw error;
              // The response exceeded the envelope; the claim is unchanged.
              deliveryRefusals++; claim.release();
              if (refused.unfit || retry.envelopeBytes > 0) { unfit++; throw unfitError(budget, descriptorMetadataBytes + refused.retryBytes, 'building detail delivery does not fit the page'); }
              retry.envelopeBytes = refused.envelopeBytes; refuse(budget, signal, descriptorMetadataBytes + refused.retryBytes, 'delivery');
            }
            bytes = readLease.bytes;
          } else bytes = await options.readBytes(asset.path, signal, PHYSICAL_LIMIT);
          signal.throwIfAborted();
          if (!(bytes instanceof Uint8Array) || bytes.byteLength !== asset.bytes || bytes.byteLength > PHYSICAL_LIMIT) throw Error('Building detail transport byte length mismatch');
          const delivered: ResourceBudgetCost = {category: 'read', bytes: bytes.buffer.byteLength, precision: 'exact', identity: bytes.buffer as object};
          if (!readLease?.cost) {
            // Without a caller-admitted delivery (no transport, or one that
            // ignored the 4th argument) the claim still lists the read
            // envelope: list the delivered buffer's own identity in its place.
            if (options.acquireBytes) unadmittedDeliveries++;
            if (!claim.adjust([...expansion, delivered])) {
              const prior = options.acquireBytes ? retry.envelopeBytes : retry.readBytes;
              readLease?.release(); readLease = undefined; claim.release();
              if (prior > 0) { unfit++; throw unfitError(budget, descriptorMetadataBytes + costBytes(expansion) + delivered.bytes, 'building detail delivery does not fit the page'); }
              if (options.acquireBytes) retry.envelopeBytes = Math.max(costBytes(read), delivered.bytes); else retry.readBytes = delivered.bytes;
              refuse(budget, signal, descriptorMetadataBytes + costBytes(expansion) + Math.max(costBytes(read), delivered.bytes), 'delivery');
            }
          }
          await verify(bytes, asset.sha256, signal); signal.throwIfAborted();
          let rawBytes: Uint8Array | undefined = asset.compression === 'gzip' ? await inflateBounded3DGzip(bytes, rawSize, signal, asset.uncompressed_sha256, RAW_LIMIT) : bytes;
          signal.throwIfAborted();
          const parseCosts: ResourceBudgetCost[] = [{category: 'inflate', bytes: asset.compression === 'gzip' ? rawBytes.buffer.byteLength : 0, precision: 'exact', identity: rawBytes.buffer as object}, normalize, delivered];
          if (!claim.adjust(parseCosts)) {
            readLease?.release(); readLease = undefined; claim.release();
            refuse(budget, signal, descriptorMetadataBytes + costBytes(parseCosts), 'parse expansion');
          }
          let parsed: RecordValue | undefined = object(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(rawBytes)), 'document');
          rawBytes = undefined; bytes = undefined; readLease?.release(); readLease = undefined;
          // A shrink: the response and the inflated text are no longer listed.
          claim.adjust([normalize]);
          signal.throwIfAborted(); replacementHeader(parsed, resource);
          let raw: NativeSourceResult['raw'];
          const encoding = parsed.encoding === undefined ? 'json' : parsed.encoding;
          const meshopt = isBuildingDetailMeshoptEncoding(encoding);
          if (resource.encoding !== undefined && resource.encoding !== encoding) throw Error('Building detail transport encoding mismatch');
          // One codec module, the one the producer runs on every candidate
          // before publication: its inspection sizes the typed allocation and
          // its decoder restores the render streams for both encodings, so the
          // runtime never re-normalizes a plain document by another path.
          const codec = await import('./building-detail-meshopt'); signal.throwIfAborted();
          const limits = {vertexCap, geometryPositionCap: positionCap};
          const plan = meshopt ? codec.inspectBuildingDetailMeshopt(parsed, limits) : codec.inspectBuildingDetailJSON(parsed, limits);
          const decodedBytes = plan.decodedTypedArrayBytes, constructionBytes = plan.constructionTransientBytes;
          if (resource.decodedBytes !== undefined && resource.decodedBytes !== decodedBytes) throw Error('Building detail decoded allocation mismatch');
          // The decode and the group metadata read in one in-place growth of
          // this pass's claim, beside the parse expansion it still lists for the
          // parsed document. The group read starts only after the decode, when
          // that expansion is no longer needed, so its working set reuses it and
          // only what it needs beyond it is added: the claim peaks at
          // max(parse expansion, group working set) + decode + construction.
          const construction: readonly ResourceBudgetCost[] = [
            {category: 'decoded', bytes: decodedBytes, precision: 'exact'},
            {category: 'construction', bytes: constructionBytes, precision: 'estimate'},
          ];
          const working = groupAsset ? groupWorkingSet(groupAsset, retry.groupEnvelopeBytes) : undefined, groupBytes = costBytes(working?.costs ?? []);
          const beyond: ResourceBudgetCost[] = groupBytes > normalize.bytes ? [{category: 'metadata', bytes: groupBytes - normalize.bytes, precision: 'estimate', label: 'group metadata read beyond the parse expansion it reuses'}] : [];
          if (!claim.adjust([normalize, ...construction, ...beyond])) {
            const need = descriptorMetadataBytes + Math.max(normalize.bytes, groupBytes) + costBytes(construction);
            parsed = undefined; claim.release(); refuse(budget, signal, need, 'decode');
          }
          const decoded = meshopt
            ? await codec.decodeBuildingDetailMeshopt(parsed, {signal, ...limits, decoder: options.meshoptDecoder})
            : await codec.decodeBuildingDetailJSON(parsed, {signal, ...limits});
          signal.throwIfAborted(); replacementHeader(object(decoded, 'decoded document'), resource);
          raw = replacementComponents(decoded, resource, vertexCap, positionCap);
          signal.throwIfAborted();
          parsed = undefined;
          assertAllocation(raw, resource);
          const value = {raw, admission};
          // Convert construction ownership atomically before temporary buffers
          // retire: one in-place adjust lists the retained payload and the group
          // read's working set, which the group entry takes over by identity.
          const retained = payloadCosts(value);
          if (!claim.adjust([...retained, ...(working?.costs ?? [])]) || !context.adjust([descriptorCost, ...retained])) {
            const need = descriptorMetadataBytes + costBytes(retained) + groupBytes;
            claim.release(); context.adjust([descriptorCost]);
            refuse(budget, signal, need, 'retained payload');
          }
          const groups = await loadGroups(raw, signal, working, () => { claim.adjust(retained); }); claim.release(); signal.throwIfAborted();
          if (groupLease) context.retainParent(groupLease);
          return {...value, groups};
        } catch (error) { const metadata = groupLease; groupLease = undefined; metadata?.release(); throw error; }
        finally { claim.release(); readLease?.release(); }
      }
      const request = () => resources.acquire<BuildingDetailSourceValue>({
        contentKey: JSON.stringify(['building-detail-source-v2', resource.key, resource.city, resource.level, resource.descriptor.path, resource.descriptor.sha256, resource.descriptor.bytes, resource.descriptor.compression ?? null, resource.descriptor.uncompressed_sha256 ?? null, resource.descriptor.uncompressed_bytes ?? null, resource.geometrySHA256, resource.canonicalIndexSHA256, resource.canonicalLeafSHA256, resource.bindings, resource.encoding ?? null, resource.decodedBytes ?? null, resource.groupMetadata ?? null, vertexCap, positionCap]), role: 'source', allowRecent: false,
        estimate: descriptorCost,
        async produce(context) {
          for (;;) {
            try { return await (resource.level === 'near' ? nearPass(context) : variantPass(context)); }
            catch (error) {
              // A group read refused for its delivery restarts the pass with a
              // larger envelope; a pass that returned what it held waits first.
              if (error instanceof CapacityWait) { await error.wake.promise; continue; }
              if (retry.groupRetry && !context.signal.aborted) {
                retry.groupRetry = false;
                const need = descriptorMetadataBytes + (groupAsset ? costBytes(groupWorkingSet(groupAsset, retry.groupEnvelopeBytes).costs) : 0);
                if (retry.groupUnfit) { unfit++; throw unfitError(context.budget, need, 'building detail group metadata delivery does not fit the page'); }
                // The pass returned everything (its finally); wait, then start again.
                context.adjust([descriptorCost]);
                if (need > context.budget.stats.limitBytes) { unfit++; throw unfitError(context.budget, need, 'building detail group metadata read does not fit the page'); }
                capacityWaits++; await capacityWake(context.budget, context.signal).promise;
                continue;
              }
              throw error;
            }
          }
        },
        costs: retainedCosts,
        dispose(value) {
          // No fulfilled payload promise or cache survives this last store consumer.
          const parent = canonical; canonical = undefined;
          value.raw = undefined as unknown as BuildingDetailSourceValue['raw']; value.verified = undefined; value.groups = undefined;
          const metadata = groupLease; groupLease = undefined; metadata?.release(); parent?.release();
        },
      });
      let source: ChunkResourceLease<BuildingDetailSourceValue>;
      for (;;) {
        try { source = request(); break; }
        catch (error) {
          // The descriptor estimate itself was refused: wait holding nothing.
          if (!(error instanceof ResourceBudgetExceededError)) throw error;
          if (descriptorMetadataBytes > resources.budget.stats.limitBytes) { unfit++; throw unfitError(resources.budget, descriptorMetadataBytes, 'building detail descriptor does not fit the page'); }
          capacityWaits++; await capacityWake(resources.budget, signal).promise;
        }
      }
      let abort: () => void = () => {};
      try {
        await new Promise<void>((resolve, reject) => {
          abort = () => { source.release(); reject(signal.reason); };
          signal.addEventListener('abort', abort, {once: true});
          void source.ready.then(resolve, reject);
          if (signal.aborted) abort();
        });
        signal.throwIfAborted();
        if (!source.value) throw Error('Building detail source retired before acquisition');
        return consumerLease(source);
      } catch (error) { source.release(); throw error; }
      finally { signal.removeEventListener('abort', abort); }
    },
  };
}
