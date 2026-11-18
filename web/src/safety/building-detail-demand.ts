import {classifyProjectedDetail, type ProjectedDetailViewport} from './projected-detail-policy';

export type BuildingDetailLevel = 'near' | 'mid' | 'coarse';
export type BuildingDetailMeshoptEncoding = 'meshopt-lossless-f32-v1' | 'meshopt-lossless-f32-dictionary-v1';
export type BuildingDetailEncoding = 'canonical' | 'json' | BuildingDetailMeshoptEncoding;

export function isBuildingDetailMeshoptEncoding(encoding: unknown): encoding is BuildingDetailMeshoptEncoding {
  return encoding === 'meshopt-lossless-f32-v1' || encoding === 'meshopt-lossless-f32-dictionary-v1';
}
export type BuildingDetailAsset = Readonly<{
  path: string; sha256: string; bytes: number; compression?: 'gzip';
  uncompressed_bytes?: number; uncompressed_sha256?: string;
}>;
export type BuildingDetailBindings = Readonly<{
  sourcePBFSHA256: string; boundarySHA256: string; compilerSHA256: string; sourceSnapshot: string;
  materialSHA256: string; producerSHA256: string; protectionSHA256: string; sourceEquivalenceSHA256: string;
}>;
export type BuildingDetailComponent = Readonly<{
  objectId: string; partId: string; origin: readonly [number, number];
  box: readonly [number, number, number, number, number, number]; protected: boolean;
}>;
export type BuildingDetailError = Readonly<{componentIndex: number; errorM: number; normalDeviationRad: number}>;
export type BuildingDetailVariant = Readonly<{
  level: 'mid' | 'coarse'; asset: BuildingDetailAsset; geometrySHA256: string;
  vertices: number; triangles: number; errors: readonly BuildingDetailError[];
  encoding?: Exclude<BuildingDetailEncoding, 'canonical'>; decodedBytes?: number;
  groupMetadata?: BuildingDetailAsset;
}>;
export type BuildingDetailDemandIndex = Readonly<{
  schema: 'crimemaps-building-detail-demand-v1'; schemaVersion: 1; city: string;
  canonicalIndex: BuildingDetailAsset; canonicalLeaf: BuildingDetailAsset & Readonly<{id: string}>;
  bindings: BuildingDetailBindings; components: readonly BuildingDetailComponent[];
  groupMetadata?: BuildingDetailAsset;
  near: Readonly<{level: 'near'; asset: BuildingDetailAsset; geometrySHA256: string; vertices: number; triangles: number;
    encoding?: 'canonical'; decodedBytes?: number; groupMetadata?: BuildingDetailAsset}>;
  variants: readonly BuildingDetailVariant[];
}>;
export type BuildingDetailPassDemand = Readonly<{
  pass: 'main' | 'shadow' | 'reflection' | 'picking';
  project(origin: readonly [number, number]): {matrix: ArrayLike<number>; viewport: ProjectedDetailViewport} | undefined;
  maxErrorCssPx: number; maxErrorDrawingBufferPx: number;
  forceCanonical?: boolean; selected?: boolean;
}>;
export type BuildingDetailResource = Readonly<{
  key: string; city: string; level: BuildingDetailLevel; descriptor: BuildingDetailAsset; geometrySHA256: string;
  vertices: number; triangles: number; maxErrorM: number;
  canonicalIndexSHA256: string; canonicalLeafSHA256: string; bindings: BuildingDetailBindings;
  componentCount: number; components: readonly BuildingDetailComponent[];
  encoding?: BuildingDetailEncoding; decodedBytes?: number; groupMetadata?: BuildingDetailAsset;
}>;
export type BuildingDetailSelection = Readonly<{
  resource: BuildingDetailResource;
  reason: 'empty-demand' | 'picking' | 'forced' | 'selected' | 'near' | 'unknown-projection' | 'near-plane' | 'error-budget' | 'coarse' | 'mid' | 'focus';
  passes: readonly BuildingDetailPassDemand['pass'][];
  /** The existing 32/48 CSS-pixel size thresholds still require real-scene calibration. */
  thresholdsCalibrated: false;
}>;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`Invalid ${label}`);
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw Error(`Unexpected ${label} field`);
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value.length > 512) throw Error(`Invalid ${label}`);
  return value;
}
function sha(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw Error(`Invalid ${label} SHA256`);
  return value;
}
function count(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw Error(`Invalid ${label}`);
  return value as number;
}
function asset(value: unknown, label: string, leaf = false): BuildingDetailAsset & {id?: string} {
  const raw = object(value, label);
  fields(raw, ['path', 'sha256', 'bytes', 'compression', 'uncompressed_bytes', 'uncompressed_sha256', ...(leaf ? ['id'] : [])], label);
  const path = text(raw.path, `${label} path`);
  if (!/^\/safety\/buildings3d\/[A-Za-z0-9_.\/-]+$/.test(path) || path.split('/').some(part => part === '..' || part === '.') || !/\.json(?:\.gz)?$/.test(path)) throw Error(`Invalid ${label} path`);
  const parsed = {path, sha256: sha(raw.sha256, label), bytes: count(raw.bytes, `${label} bytes`)};
  if (raw.compression === undefined) {
    if (raw.uncompressed_bytes !== undefined || raw.uncompressed_sha256 !== undefined || path.endsWith('.gz')) throw Error(`Invalid ${label} compression`);
    return Object.freeze({...parsed, ...(leaf ? {id: text(raw.id, `${label} id`)} : {})});
  }
  if (raw.compression !== 'gzip' || !path.endsWith('.gz')) throw Error(`Invalid ${label} compression`);
  return Object.freeze({...parsed, compression: 'gzip', uncompressed_bytes: count(raw.uncompressed_bytes, `${label} uncompressed bytes`),
    uncompressed_sha256: sha(raw.uncompressed_sha256, `${label} uncompressed`), ...(leaf ? {id: text(raw.id, `${label} id`)} : {})});
}

export const BUILDING_DETAIL_GROUP_WIRE_LIMIT = 500000;
export const BUILDING_DETAIL_GROUP_RAW_LIMIT = 8 * 1024 ** 2;
/** Independent group metadata may use physical gzip, with separate bounded
 * wire/raw hashes. Demand documents and catalogue pages retain their old caps. */
export function validateBuildingDetailGroupMetadataAsset(value: unknown): BuildingDetailAsset {
  const parsed = asset(value, 'packing group metadata');
  if (parsed.bytes > BUILDING_DETAIL_GROUP_WIRE_LIMIT || (parsed.uncompressed_bytes ?? parsed.bytes) > BUILDING_DETAIL_GROUP_RAW_LIMIT) throw Error('Invalid building detail packing group metadata size/codec');
  return parsed;
}

function resourceAllocation(raw: Record<string, unknown>, near: boolean, vertices: number, triangles: number) {
  const encoding = raw.encoding;
  if (encoding !== undefined && (near ? encoding !== 'canonical' : encoding !== 'json' && !isBuildingDetailMeshoptEncoding(encoding))) throw Error('Invalid building detail resource encoding');
  const decodedBytes = raw.decodedBytes === undefined ? undefined : count(raw.decodedBytes, 'decoded typed payload bytes');
  // This field counts positions, normals and Uint32 triangle elements only.
  // SOURCE polygons, private metadata and construction overlap are separate
  // reservations; a producer cannot hide those costs in this exact quantity.
  if (decodedBytes !== undefined && decodedBytes !== vertices * 24 + triangles * 12) throw Error('Building detail decoded payload size mismatch');
  const groupMetadata = raw.groupMetadata === undefined ? undefined : validateBuildingDetailGroupMetadataAsset(raw.groupMetadata);
  return {...(encoding === undefined ? {} : {encoding: encoding as BuildingDetailEncoding}),
    ...(decodedBytes === undefined ? {} : {decodedBytes}), ...(groupMetadata === undefined ? {} : {groupMetadata})};
}

/** Validates a compact producer-bound demand index, without fetching or decoding any leaf.
 * Component-order, material and source-equivalence claims remain producer bindings;
 * parsing alone is not proof of the generated replacement geometry.
 */
export function parseBuildingDetailDemand(value: unknown, expected: {city: string; canonicalIndexSHA256: string; canonicalLeafSHA256: string}): BuildingDetailDemandIndex {
  const raw = object(value, 'building detail demand');
  fields(raw, ['schema', 'schemaVersion', 'city', 'canonicalIndex', 'canonicalLeaf', 'bindings', 'components', 'near', 'variants', 'groupMetadata'], 'demand');
  if (raw.schema !== 'crimemaps-building-detail-demand-v1' || raw.schemaVersion !== 1 || raw.city !== expected.city || !/^[a-z][a-z-]+$/.test(expected.city)) throw Error('Invalid detail demand identity');
  const canonicalIndex = asset(raw.canonicalIndex, 'canonical index'), canonicalLeaf = asset(raw.canonicalLeaf, 'canonical leaf', true) as BuildingDetailDemandIndex['canonicalLeaf'];
  if (canonicalIndex.sha256 !== sha(expected.canonicalIndexSHA256, 'expected index') || canonicalLeaf.sha256 !== sha(expected.canonicalLeafSHA256, 'expected leaf')) throw Error('Detail demand canonical binding mismatch');
  const binding = object(raw.bindings, 'bindings'), hashFields = ['sourcePBFSHA256', 'boundarySHA256', 'compilerSHA256', 'materialSHA256', 'producerSHA256', 'protectionSHA256', 'sourceEquivalenceSHA256'] as const;
  fields(binding, [...hashFields, 'sourceSnapshot'], 'bindings');
  const bindings = Object.freeze({...Object.fromEntries(hashFields.map(key => [key, sha(binding[key], key)])), sourceSnapshot: text(binding.sourceSnapshot, 'source snapshot')}) as BuildingDetailBindings;
  if (!Array.isArray(raw.components) || !raw.components.length || raw.components.length > 20000) throw Error('Invalid detail components');
  const identities = new Set<string>();
  const components = Object.freeze(raw.components.map((value, index): BuildingDetailComponent => {
    const component = object(value, `component ${index}`); fields(component, ['objectId', 'partId', 'origin', 'box', 'protected'], 'component');
    const objectId = text(component.objectId, 'component object'), partId = text(component.partId, 'component part');
    if (!/^osm\/(node|way|relation)\/[1-9]\d*$/.test(objectId) || typeof component.protected !== 'boolean') throw Error('Invalid detail component identity');
    const identity = JSON.stringify([objectId, partId]); if (identities.has(identity)) throw Error('Duplicate detail component'); identities.add(identity);
    if (!Array.isArray(component.origin) || component.origin.length !== 2 || !component.origin.every(Number.isFinite) || Math.abs(component.origin[0]) > 180 || Math.abs(component.origin[1]) > 85) throw Error('Invalid component origin');
    if (!Array.isArray(component.box) || component.box.length !== 6 || !component.box.every(Number.isFinite) || component.box.slice(0, 3).some((minimum, axis) => minimum > (component.box as number[])[axis + 3])) throw Error('Invalid canonical component box');
    return Object.freeze({objectId, partId, origin: Object.freeze([...component.origin]) as readonly [number, number], box: Object.freeze([...component.box]) as BuildingDetailComponent['box'], protected: component.protected});
  }));
  const groupMetadata = raw.groupMetadata === undefined ? undefined : validateBuildingDetailGroupMetadataAsset(raw.groupMetadata);
  const original = object(raw.near, 'near'); fields(original, ['level', 'asset', 'geometrySHA256', 'vertices', 'triangles', 'encoding', 'decodedBytes', 'groupMetadata'], 'near');
  if (original.level !== 'near') throw Error('Invalid near detail level');
  const nearVertices = count(original.vertices, 'near vertices'), nearTriangles = count(original.triangles, 'near triangles');
  const near = Object.freeze({level: 'near' as const, asset: asset(original.asset, 'near asset'), geometrySHA256: sha(original.geometrySHA256, 'near geometry'), vertices: nearVertices, triangles: nearTriangles,
    ...resourceAllocation(original, true, nearVertices, nearTriangles), encoding: original.encoding as 'canonical' | undefined});
  if (near.vertices > 200000 || near.triangles > 400000) throw Error('Near detail geometry budget exceeded');
  if (['path', 'sha256', 'bytes', 'compression', 'uncompressed_bytes', 'uncompressed_sha256'].some(key => (near.asset as Record<string, unknown>)[key] !== (canonicalLeaf as Record<string, unknown>)[key])) throw Error('Near resource must be the canonical leaf');
  if (!Array.isArray(raw.variants) || raw.variants.length > 2) throw Error('Invalid detail variants');
  const levels = new Set<string>(), paths = new Set([canonicalLeaf.path, near.asset.path]), hashes = new Set([canonicalLeaf.sha256, near.asset.sha256]), geometryHashes = new Set([near.geometrySHA256]);
  const variants = Object.freeze(raw.variants.map((value): BuildingDetailVariant => {
    const variant = object(value, 'variant'); fields(variant, ['level', 'asset', 'geometrySHA256', 'vertices', 'triangles', 'errors', 'encoding', 'decodedBytes', 'groupMetadata'], 'variant');
    if (variant.level !== 'mid' && variant.level !== 'coarse' || levels.has(variant.level)) throw Error('Invalid or duplicate detail level'); levels.add(variant.level);
    const descriptor = asset(variant.asset, `${variant.level} asset`), geometrySHA256 = sha(variant.geometrySHA256, 'variant geometry');
    const vertices = count(variant.vertices, 'variant vertices'), triangles = count(variant.triangles, 'variant triangles');
    if (vertices > 200000 || triangles > 400000 || vertices >= near.vertices || triangles >= near.triangles || paths.has(descriptor.path) || hashes.has(descriptor.sha256) || geometryHashes.has(geometrySHA256)) throw Error('Aliased, over-budget or unreduced detail variant');
    paths.add(descriptor.path); hashes.add(descriptor.sha256); geometryHashes.add(geometrySHA256);
    if (!Array.isArray(variant.errors) || variant.errors.length > components.length) throw Error('Invalid variant errors');
    const seen = new Set<number>();
    const errors = Object.freeze(variant.errors.map((value): BuildingDetailError => {
      const error = object(value, 'component error'); fields(error, ['componentIndex', 'errorM', 'normalDeviationRad'], 'component error');
      const componentIndex = error.componentIndex as number, errorM = error.errorM as number, normalDeviationRad = error.normalDeviationRad as number;
      if (!Number.isSafeInteger(componentIndex) || componentIndex < 0 || componentIndex >= components.length || seen.has(componentIndex) || !Number.isFinite(errorM) || errorM < 0 || !Number.isFinite(normalDeviationRad) || normalDeviationRad < 0 || normalDeviationRad > Math.PI) throw Error('Invalid component error bound');
      if (components[componentIndex].protected && (errorM > 0 || normalDeviationRad > 0)) throw Error('Protected component detail changed');
      seen.add(componentIndex); return Object.freeze({componentIndex, errorM, normalDeviationRad});
    }));
    return Object.freeze({level: variant.level, asset: descriptor, geometrySHA256, vertices, triangles, errors,
      ...resourceAllocation(variant, false, vertices, triangles), encoding: variant.encoding as BuildingDetailVariant['encoding']});
  }));
  const mid = variants.find(variant => variant.level === 'mid'), coarse = variants.find(variant => variant.level === 'coarse');
  if (mid && coarse && (coarse.vertices >= mid.vertices || coarse.triangles >= mid.triangles)) throw Error('Detail levels do not reduce geometry');
  return Object.freeze({schema: 'crimemaps-building-detail-demand-v1', schemaVersion: 1, city: expected.city, canonicalIndex, canonicalLeaf, bindings, components, near, variants, ...(groupMetadata ? {groupMetadata} : {})});
}

type Projection = {matrix: ArrayLike<number>; viewport: ProjectedDetailViewport};
type ErrorBound = {css: number; buffer: number} | 'unknown-projection' | 'near-plane';
/** Mean-value bound on perspective x/w,y/w over the epsilon-expanded canonical box.
 * Each numerator derivative is affine, so its absolute maximum is at a corner.
 * Divide that bound by min(w)^2, then use the Jacobian Frobenius norm as an
 * upper bound on displacement for any Euclidean source error <= epsilon.
 */
function projectedError(component: BuildingDetailComponent, epsilon: number, projection: Projection): ErrorBound {
  const {matrix: m, viewport: v} = projection;
  if (!m || m.length !== 16 || ![v.cssWidth, v.cssHeight, v.drawingBufferWidth, v.drawingBufferHeight].every(value => Number.isFinite(value) && value > 0)) return 'unknown-projection';
  for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i])) return 'unknown-projection';
  const box = component.box, lower = [box[0] - epsilon, Math.min(0, box[1]) - epsilon, box[2] - epsilon], upper = [box[3] + epsilon, Math.max(0, box[4]) + epsilon, box[5] + epsilon];
  let minW = Infinity; const derivative = [[0, 0, 0], [0, 0, 0]];
  for (let corner = 0; corner < 8; corner++) {
    const p = [0, 1, 2].map(axis => corner & (1 << axis) ? upper[axis] : lower[axis]);
    const a = [0, 1, 2, 3].map(row => m[row] * p[0] + m[row + 4] * p[1] + m[row + 8] * p[2] + m[row + 12]);
    if (!a.every(Number.isFinite)) return 'unknown-projection';
    const tolerance = 1e-5 * Math.max(1, ...a.map(Math.abs));
    if (a[3] <= tolerance || a[2] + a[3] <= tolerance) return 'near-plane';
    minW = Math.min(minW, a[3]);
    for (let row = 0; row < 2; row++) for (let axis = 0; axis < 3; axis++) derivative[row][axis] = Math.max(derivative[row][axis], Math.abs(m[row + axis * 4] * a[3] - a[row] * m[3 + axis * 4]));
  }
  const x = Math.hypot(...derivative[0]) / (minW * minW), y = Math.hypot(...derivative[1]) / (minW * minW);
  const css = epsilon * Math.hypot(x * v.cssWidth / 2, y * v.cssHeight / 2), buffer = epsilon * Math.hypot(x * v.drawingBufferWidth / 2, y * v.drawingBufferHeight / 2);
  return Number.isFinite(css) && Number.isFinite(buffer) ? {css, buffer} : 'unknown-projection';
}

/** Conservative CSS-pixel candidate demand only. A false result requires
 * every canonical box to project safely away from the point; final picking
 * still uses canonical geometry. Ground/grow extends the same vertical envelope
 * as rendering. Unknown projection or a near-plane crossing stays a candidate. */
export function buildingDetailMayContainPick(
 index: Pick<BuildingDetailDemandIndex, 'components'>,
 point: Readonly<{x: number; y: number}>,
 project: BuildingDetailPassDemand['project'],
): boolean {
 if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !index.components.length) return true;
 for (const component of index.components) {
  let projection: ReturnType<BuildingDetailPassDemand['project']>;
  try {projection = project(component.origin);} catch {return true;}
  if (!projection) return true;
  const {matrix: m, viewport: v} = projection;
  if (!m || m.length !== 16 || ![v.cssWidth, v.cssHeight, v.drawingBufferWidth, v.drawingBufferHeight].every(n => Number.isFinite(n) && n > 0)) return true;
  for (let i = 0; i < 16; i++) if (!Number.isFinite(m[i])) return true;
  const box = component.box;
  if (!box || box.length !== 6 || !box.every(Number.isFinite) || box.slice(0, 3).some((n, i) => n > box[i + 3])) return true;
  const lower = [box[0], Math.min(0, box[1]), box[2]], upper = [box[3], Math.max(0, box[4]), box[5]];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let corner = 0; corner < 8; corner++) {
   const p = [0, 1, 2].map(axis => corner & (1 << axis) ? upper[axis] : lower[axis]);
   const a = [0, 1, 2, 3].map(row => m[row] * p[0] + m[row + 4] * p[1] + m[row + 8] * p[2] + m[row + 12]);
   if (!a.every(Number.isFinite)) return true;
   const tolerance = 1e-5 * Math.max(1, ...a.map(Math.abs));
   if (a[3] <= tolerance || a[2] + a[3] <= tolerance) return true;
   const x = (a[0] / a[3] + 1) * v.cssWidth / 2, y = (1 - a[1] / a[3]) * v.cssHeight / 2;
   if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
   minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  // One CSS pixel is a conservative raster/numerical margin, independent of DPR.
  if (point.x >= minX - 1 && point.x <= maxX + 1 && point.y >= minY - 1 && point.y <= maxY + 1) return true;
 }
 return false;
}

/** The one resource identity of a level: every selection path, including a
 * focus pin, derives the same key, descriptor and material/source bindings. */
function chooseBuildingDetailLevel(index: BuildingDetailDemandIndex, level: BuildingDetailDemandIndex['near'] | BuildingDetailVariant, reason: BuildingDetailSelection['reason'], passes: BuildingDetailSelection['passes']): BuildingDetailSelection {
  const groupMetadata = level.groupMetadata ?? index.groupMetadata;
  const maxErrorM = level.level === 'near' ? 0 : level.errors.reduce((maximum, error) => Math.max(maximum, error.errorM), 0);
  const key = JSON.stringify([index.city, index.canonicalIndex.sha256, index.canonicalLeaf.sha256, level.level, level.asset.sha256, level.geometrySHA256,
    index.bindings.materialSHA256, index.bindings.protectionSHA256, index.bindings.producerSHA256, index.bindings.sourceEquivalenceSHA256,
    index.bindings.sourcePBFSHA256, index.bindings.boundarySHA256, index.bindings.compilerSHA256, index.bindings.sourceSnapshot,
    level.encoding ?? null, level.decodedBytes ?? null, maxErrorM, groupMetadata ? [groupMetadata.sha256, groupMetadata.bytes, groupMetadata.compression ?? null, groupMetadata.uncompressed_sha256 ?? null, groupMetadata.uncompressed_bytes ?? null] : null]);
  return Object.freeze({resource: Object.freeze({key, city: index.city, level: level.level, descriptor: level.asset, geometrySHA256: level.geometrySHA256, vertices: level.vertices, triangles: level.triangles, maxErrorM,
    canonicalIndexSHA256: index.canonicalIndex.sha256, canonicalLeafSHA256: index.canonicalLeaf.sha256, bindings: index.bindings,
    componentCount: index.components.length, components: index.components,
    ...(level.encoding === undefined ? {} : {encoding: level.encoding}),
    ...(level.decodedBytes === undefined ? {} : {decodedBytes: level.decodedBytes}),
    ...(groupMetadata === undefined ? {} : {groupMetadata})}), reason, passes, thresholdsCalibrated: false});
}
/** Pass demands that require canonical geometry whatever a plan prefers. */
function canonicalRequirement(demands: readonly BuildingDetailPassDemand[]): BuildingDetailSelection['reason'] | undefined {
  if (!demands.length) return 'empty-demand';
  if (demands.some(demand => demand.pass === 'picking')) return 'picking';
  if (demands.some(demand => demand.forceCanonical)) return 'forced';
  if (demands.some(demand => demand.selected)) return 'selected';
  return undefined;
}
/** The cheapest real level of this leaf that every declared pass permits: the
 * coarsest produced variant, or canonical geometry when a pass requires it or
 * no variant exists. This is a representation choice for the focus periphery,
 * never an invented LOD. */
export function buildingDetailPeripheralLevel(index: BuildingDetailDemandIndex, demands: readonly BuildingDetailPassDemand[]): BuildingDetailLevel {
  if (canonicalRequirement(demands)) return 'near';
  return index.variants.some(variant => variant.level === 'coarse') ? 'coarse' : index.variants.some(variant => variant.level === 'mid') ? 'mid' : 'near';
}
/** Exactly the level a focus plan admitted for this leaf (peripheral sample,
 * grace hold or unknown-projection hold). Picking, a selected building and a
 * pass that forces canonical geometry still win; the screen-error budget is
 * deliberately not consulted because the focus plan owns that decision. A
 * level the index does not contain selects canonical geometry. */
export function selectBuildingDetailFocusResource(index: BuildingDetailDemandIndex, demands: readonly BuildingDetailPassDemand[], level: BuildingDetailLevel): BuildingDetailSelection {
  const passes = Object.freeze(demands.map(demand => demand.pass)), required = canonicalRequirement(demands);
  if (required) return chooseBuildingDetailLevel(index, index.near, required, passes);
  const target = level === 'near' ? index.near : index.variants.find(variant => variant.level === level);
  return chooseBuildingDetailLevel(index, target ?? index.near, 'focus', passes);
}

/** One leaf uses one complete same-order resource level across all declared passes.
 * Call again after camera/revision changes; undeclared passes are not certified.
 */
export function selectBuildingDetailResource(index: BuildingDetailDemandIndex, demands: readonly BuildingDetailPassDemand[], previousLevel: BuildingDetailLevel = 'near'): BuildingDetailSelection {
  const passes = Object.freeze(demands.map(demand => demand.pass));
  const choose = (level: typeof index.near | BuildingDetailVariant, reason: BuildingDetailSelection['reason']) => chooseBuildingDetailLevel(index, level, reason, passes);
  const required = canonicalRequirement(demands);
  if (required) return choose(index.near, required);
  const projections: Projection[][] = [];
  for (const demand of demands) {
    if (!['main', 'shadow', 'reflection'].includes(demand.pass) || typeof demand.project !== 'function' || ![demand.maxErrorCssPx, demand.maxErrorDrawingBufferPx].every(value => Number.isFinite(value) && value > 0)) return choose(index.near, 'unknown-projection');
    const projected: Projection[] = [];
    for (const component of index.components) {
      const projection = demand.project(component.origin); if (!projection?.viewport) return choose(index.near, 'unknown-projection');
      const safe = projectedError(component, 0, projection); if (typeof safe === 'string') return choose(index.near, safe);
      if (demand.pass === 'main') {
        const classification = classifyProjectedDetail(component.box, projection.matrix, projection.viewport, previousLevel === 'near' ? 'detail' : 'distant');
        if (classification.quality === 'detail') return choose(index.near, classification.reason === 'near-plane' ? 'near-plane' : classification.reason === 'invalid' ? 'unknown-projection' : 'near');
      }
      projected.push(projection);
    }
    projections.push(projected);
  }
  let rejection: BuildingDetailSelection['reason'] = 'error-budget';
  for (const level of ['coarse', 'mid'] as const) {
    const variant = index.variants.find(variant => variant.level === level); if (!variant) continue;
    const fits = demands.every((demand, passIndex) => variant.errors.every(error => {
      if (!error.errorM) return true;
      const bound = projectedError(index.components[error.componentIndex], error.errorM, projections[passIndex][error.componentIndex]);
      if (typeof bound === 'string') rejection = bound;
      return typeof bound !== 'string' && bound.css <= demand.maxErrorCssPx && bound.buffer <= demand.maxErrorDrawingBufferPx;
    }));
    if (fits) return choose(variant, level);
  }
  return choose(index.near, rejection);
}
