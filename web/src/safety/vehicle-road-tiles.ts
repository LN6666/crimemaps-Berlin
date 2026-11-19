/** Immutable assets for citywide decorative traffic. Leaf files keep the v1 road schema. */
export type RoadBounds = readonly [number, number, number, number];
export type RoadAsset = {path: string; bytes: number; sha256: string};
type Entry = {bbox: RoadBounds; data: RoadAsset};
type ScenerySource = {
  city: string;
  role: 'decorative-schematic';
  snapshot: string;
  source_pbf_sha256: string;
};
export type RoadFile = ScenerySource & {schema_version: 1; partial: true; data: RoadAsset};
export type RoadIndex = ScenerySource & {
  schema_version: 2;
  city_boundary_sha256: string;
  tiles?: Entry[];
  partitions?: Entry[];
};

const hash = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
function asset(v: unknown, max: number): v is RoadAsset {
  return object(v) && typeof v.path === 'string' && /^\/safety\/buildings3d\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.json$/.test(v.path) &&
    hash(v.sha256) && typeof v.bytes === 'number' && Number.isSafeInteger(v.bytes) && v.bytes > 0 && v.bytes <= max;
}
function bounds(v: unknown): v is RoadBounds {
  return Array.isArray(v) && v.length === 4 && v.every(Number.isFinite) &&
    v[0] >= -180 && v[2] <= 180 && v[1] >= -85 && v[3] <= 85 && v[0] <= v[2] && v[1] <= v[3];
}
export function readRoadIndex(value: unknown, city: string, parent?: RoadIndex): RoadFile | RoadIndex {
  if (!object(value) || value.city !== city || value.role !== 'decorative-schematic' ||
      typeof value.snapshot !== 'string' || !value.snapshot || value.snapshot.length > 128 || !hash(value.source_pbf_sha256))
    throw Error('Invalid vehicle road source');
  if (value.schema_version === 1 && !parent && value.partial === true && asset(value.data, 1024 ** 2))
    return value as RoadFile;
  if (value.schema_version !== 2 || !hash(value.city_boundary_sha256) ||
      (parent && (value.snapshot !== parent.snapshot || value.source_pbf_sha256 !== parent.source_pbf_sha256 ||
        value.city_boundary_sha256 !== parent.city_boundary_sha256 || value.partitions !== undefined)))
    throw Error('Invalid vehicle road index binding');
  const groups = value.partitions !== undefined;
  const entries = groups ? value.partitions : value.tiles;
  if ((groups && value.tiles !== undefined) || !Array.isArray(entries) ||
      !entries.every(e => object(e) && bounds(e.bbox) && asset(e.data, groups ? 64 * 1024 : 1024 ** 2)))
    throw Error('Invalid vehicle road index entries');
  return value as RoadIndex;
}
export function intersectRoadBounds(a: RoadBounds, b: RoadBounds) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
export async function viewportRoadFiles(root: RoadIndex, view: RoadBounds, readPage: (a: RoadAsset) => Promise<unknown>) {
  const files = new Map<string, RoadAsset>();
  function select(entries: Entry[]) {
    for (const e of entries) {
      if (!intersectRoadBounds(e.bbox, view)) continue;
      const seen = files.get(e.data.path);
      if (seen && (seen.sha256 !== e.data.sha256 || seen.bytes !== e.data.bytes)) throw Error('Conflicting vehicle road tile');
      files.set(e.data.path, e.data);
    }
  }
  if (root.tiles) select(root.tiles);
  else for (const entry of root.partitions!) {
    if (!intersectRoadBounds(entry.bbox, view)) continue;
    const page = readRoadIndex(await readPage(entry.data), root.city, root);
    if (page.schema_version !== 2 || !page.tiles) throw Error('Expected a vehicle road index page');
    select(page.tiles);
  }
  return [...files.values()];
}
