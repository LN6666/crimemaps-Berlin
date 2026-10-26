import type {EnvironmentBox, EnvironmentFeature} from './environment-scene-data';
import type {PreparedSolarBoundary} from './solar-shadow-admission';

/** A display lattice, never OSM tree nodes or a measured vegetation inventory. */
export const WOODLAND_DISPLAY_LIMITS = Object.freeze({instances: 2048, candidates: 8192, inputFeatures: 20000, inputVertices: 200000, polygons: 512, vertices: 65536, edgeChecks: 1000000, worldSpacingMetres: 18, separationMetres: 7});
export type WoodlandDisplayInstance = {id: string; sourceId: string; kind: 'wood'; lon: number; lat: number; x: number; z: number; height: number; heightStatus: 'display-default'; role: 'source-woodland-display-schematic-not-source-tree-point'};
type Box = readonly [number, number, number, number];
type Ring = {points: readonly (readonly number[])[]; box: Box};
type Polygon = {sourceId: string; rings: Ring[]; box: Box};
type Cursor = {polygon: Polygon; left: number; bottom: number; width: number; height: number; xBits: number; yBits: number; at: number; end: number};
const RAD = Math.PI / 180, R = 6378137, STEP = WOODLAND_DISPLAY_LIMITS.worldSpacingMetres;
const overlaps = (a: Box, b: Box) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const world = (lon: number, lat: number) => [lon * RAD * R, Math.log(Math.tan(Math.PI / 4 + lat * RAD / 2)) * R];
const geographic = (x: number, y: number) => [x / R / RAD, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / RAD];
const hash = (x: number, y: number, salt: number) => { let n = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const paved = new Set(['asphalt', 'concrete', 'paved', 'paving_stones', 'sett', 'cobblestone', 'metal', 'wood', 'gravel', 'fine_gravel', 'compacted']);
const grass = (t: Record<string, string>) => ['grass', 'meadow', 'village_green'].includes(t.landuse) || t.natural === 'grassland' || t.landcover === 'grass' || t.surface === 'grass';
const excluded = (f: EnvironmentFeature) => f.properties.kind === 'water' || f.properties.osmTags.natural === 'water' || f.properties.osmTags.landuse === 'reservoir' || grass(f.properties.osmTags) || paved.has(f.properties.osmTags.surface);
export const isWoodlandDisplaySource = (f: EnvironmentFeature) => f.properties.kind === 'green' && !excluded(f) && (f.properties.osmTags.natural === 'wood' || ['forest', 'orchard'].includes(f.properties.osmTags.landuse) || f.properties.osmTags.landcover === 'trees');

/** The same world's cells are visited in a two-dimensional, coarse-to-fine order.
 * No array proportional to forest area is allocated; rejected outside slots also
 * consume the hard candidate budget. Separate source polygons take turns. */
function nextCell(c: Cursor) {
  let bits = c.at++, x = 0, y = 0;
  for (let level = Math.max(c.xBits, c.yBits) - 1; level >= 0; level--) {
    if (level < c.xBits) { x += (bits % 2) * 2 ** level; bits = Math.floor(bits / 2); }
    if (level < c.yBits) { y += (bits % 2) * 2 ** level; bits = Math.floor(bits / 2); }
  }
  return x < c.width && y < c.height ? [c.left + x, c.bottom + y] : undefined;
}

/** Caller supplies its existing verified city boundary and only loaded source
 * features. crownRadius includes maximum wind. Explicit source exclusion areas,
 * native tree points and supplied row displays win over woodland illustration.
 * Missing road widths/building footprints cannot be inferred from forest tags.
 * Positions are world-anchored; a full budget may change the selected subset as
 * the viewport changes, but never moves an individual lattice point. */
export function woodlandDisplayInstances(features: readonly EnvironmentFeature[], origin: readonly [number, number], viewport: EnvironmentBox, boundary: PreparedSolarBoundary | undefined, capacity: number, crownRadius: number, rowInstances: readonly {x: number; z: number}[] = []) {
  const instances: WoodlandDisplayInstance[] = [];
  const stats = {eligibleSources: 0, sourcePolygons: 0, exclusionPolygons: 0, candidates: 0, held: 0, duplicate: 0, edgeChecks: 0, truncated: false, reason: 'ready', role: 'source-woodland-display-schematic-not-source-tree-point' as const};
  const result = () => ({instances, ...stats});
  if (!boundary || origin.length !== 2 || !origin.every(Number.isFinite) || Math.abs(origin[0]) > 180 || Math.abs(origin[1]) > 85 || viewport.length !== 4 || !viewport.every(Number.isFinite) || viewport[0] >= viewport[2] || viewport[1] >= viewport[3] || Math.abs(viewport[0]) > 180 || Math.abs(viewport[2]) > 180 || Math.abs(viewport[1]) > 85 || Math.abs(viewport[3]) > 85 || !Number.isFinite(crownRadius) || crownRadius <= 0 || crownRadius > 5 || !Number.isFinite(capacity) || capacity < 0) { stats.reason = 'invalid-or-unverified-input'; return result(); }
  const budget = Math.min(WOODLAND_DISPLAY_LIMITS.instances, Math.floor(capacity));
  if (!budget) { stats.reason = 'no-instance-budget'; return result(); }
  if (features.length > WOODLAND_DISPLAY_LIMITS.inputFeatures || rowInstances.length > WOODLAND_DISPLAY_LIMITS.inputFeatures) { stats.truncated = true; stats.reason = 'input-limit'; return result(); }
  const originWorld = world(origin[0], origin[1]), scale = Math.cos(origin[1] * RAD), local = (lon: number, lat: number) => { const p = world(lon, lat); return [Math.fround((p[0] - originWorld[0]) * scale), Math.fround((p[1] - originWorld[1]) * scale)]; };
  const boxFor = (x: number, z: number): Box => { const a = geographic(originWorld[0] + (x - crownRadius) / scale, originWorld[1] + (z - crownRadius) / scale), b = geographic(originWorld[0] + (x + crownRadius) / scale, originWorld[1] + (z + crownRadius) / scale); return [a[0], a[1], b[0], b[1]]; };
  const viewLow = local(viewport[0], viewport[1]), viewHigh = local(viewport[2], viewport[3]), lo = boxFor(viewLow[0], viewLow[1]), hi = boxFor(viewHigh[0], viewHigh[1]), crownView: Box = [lo[0], lo[1], hi[2], hi[3]];
  let vertices = 0, inputVertices = 0, polygonCount = 0;
  function ringBox(points: unknown): Box | undefined {
    if (!Array.isArray(points) || points.length < 4 || (inputVertices += points.length) > WOODLAND_DISPLAY_LIMITS.inputVertices) return;
    const box: EnvironmentBox = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of points) { if (!Array.isArray(p) || p.length < 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85) return; box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]); box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]); }
    if (points[0][0] !== points.at(-1)[0] || points[0][1] !== points.at(-1)[1] || box[0] >= box[2] || box[1] >= box[3]) return;
    return box;
  }
  function prepare(f: EnvironmentFeature): Polygon[] | undefined {
    if (!['Polygon', 'MultiPolygon'].includes(f.geometry.type)) return;
    const polys: unknown[] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (!Array.isArray(polys)) return;
    const out: Polygon[] = [];
    for (const poly of polys) {
      if (!Array.isArray(poly) || !poly.length) return;
      const outerBox = ringBox(poly[0]); if (!outerBox) return;
      // Loaded leaf extents can be much wider than this viewport. A valid outer
      // box wholly outside every visible crown cannot block a display instance.
      if (!overlaps(outerBox, crownView)) continue;
      if (++polygonCount > WOODLAND_DISPLAY_LIMITS.polygons) return;
      const rings: Ring[] = [];
      for (const [index, points] of poly.entries()) {
        const box = index ? ringBox(points) : outerBox;
        if (!box || (vertices += points.length) > WOODLAND_DISPLAY_LIMITS.vertices) return;
        rings.push({points, box});
      }
      out.push({sourceId: f.id, rings, box: rings[0].box});
    }
    return out;
  }
  const sources: Polygon[] = [], exclusions: Polygon[] = [], sorted = features.filter(f => isWoodlandDisplaySource(f) || excluded(f) && ['Polygon', 'MultiPolygon'].includes(f.geometry.type)).sort((a, b) => a.id.localeCompare(b.id)), seenSources = new Set<string>();
  // Exclusions are prepared first. An incomplete known exclusion fails closed;
  // no partial water/grass/pavement inventory is silently treated as empty.
  for (const exclusion of [true, false]) for (const f of sorted) {
    if (excluded(f) !== exclusion || f.properties.source_boundary_sha256 !== boundary.boundarySHA256 || seenSources.has(f.id)) continue;
    seenSources.add(f.id);
    const prepared = prepare(f);
    if (!prepared) { stats.held++; stats.truncated = true; if (exclusion) { stats.reason = 'incomplete-known-exclusions'; return result(); } continue; }
    if (exclusion) exclusions.push(...prepared); else if (prepared.length) { stats.eligibleSources++; sources.push(...prepared); }
  }
  stats.sourcePolygons = sources.length; stats.exclusionPolygons = exclusions.length;
  const edgeLimit = {};
  const tick = () => { if (stats.edgeChecks >= WOODLAND_DISPLAY_LIMITS.edgeChecks) throw edgeLimit; stats.edgeChecks++; };
  function inRing(r: Ring, x: number, y: number) { if (x <= r.box[0] || x >= r.box[2] || y <= r.box[1] || y >= r.box[3]) return false; let inside = false; for (let i = 1; i < r.points.length; i++) { tick(); const a = r.points[i - 1], b = r.points[i]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; }
  const contains = (p: Polygon, x: number, y: number) => inRing(p.rings[0], x, y) && !p.rings.slice(1).some(r => inRing(r, x, y));
  function edgeOverlap(p: Polygon, b: Box) { for (const r of p.rings) { if (!overlaps(r.box, b)) continue; for (let i = 1; i < r.points.length; i++) { tick(); const a = r.points[i - 1], c = r.points[i]; if (Math.min(a[0], c[0]) <= b[2] && Math.max(a[0], c[0]) >= b[0] && Math.min(a[1], c[1]) <= b[3] && Math.max(a[1], c[1]) >= b[1]) return true; } } return false; }
  // With no outer/hole edge box touching this connected rectangle, polygon
  // membership is constant throughout it: one interior point replaces four
  // repeated ring scans. Keep the same conservative edge rejection, including
  // holes/exclusion islands entirely enclosed by the crown rectangle.
  const covers = (p: Polygon, b: Box) => b[0] > p.box[0] && b[1] > p.box[1] && b[2] < p.box[2] && b[3] < p.box[3] && !edgeOverlap(p, b) && contains(p, (b[0]+b[2])*.5, (b[1]+b[3])*.5);
  const intersects = (p: Polygon, b: Box) => overlaps(p.box, b) && (edgeOverlap(p, b) || contains(p, (b[0]+b[2])*.5, (b[1]+b[3])*.5));
  const separation = Math.max(WOODLAND_DISPLAY_LIMITS.separationMetres, crownRadius * 2), grid = new Map<string, [number, number][]>();
  const add = (x: number, z: number) => { const key = Math.floor(x / separation) + ':' + Math.floor(z / separation), list = grid.get(key); if (list) list.push([x, z]); else grid.set(key, [[x, z]]); };
  const near = (x: number, z: number) => { const cx = Math.floor(x / separation), cz = Math.floor(z / separation); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const p of grid.get((cx + dx) + ':' + (cz + dz)) ?? []) if (Math.hypot(p[0] - x, p[1] - z) < separation) return true; return false; };
  for (const f of features) if (f.properties.kind === 'tree' && f.geometry.type === 'Point') { const p = f.geometry.coordinates; if (Array.isArray(p) && p.length >= 2 && p.slice(0, 2).every(Number.isFinite)) { const xy = local(p[0], p[1]); if (xy.every(Number.isFinite)) add(xy[0], xy[1]); } }
  for (const p of rowInstances) if (Number.isFinite(p.x) && Number.isFinite(p.z)) add(p.x, p.z);
  const cursors: Cursor[] = [];
  for (const polygon of sources) {
    if (!overlaps(polygon.box, viewport)) continue;
    const a = world(Math.max(polygon.box[0], viewport[0]), Math.max(polygon.box[1], viewport[1])), b = world(Math.min(polygon.box[2], viewport[2]), Math.min(polygon.box[3], viewport[3]));
    const left = Math.floor(a[0] / STEP), bottom = Math.floor(a[1] / STEP), width = Math.floor(b[0] / STEP) - left + 1, height = Math.floor(b[1] / STEP) - bottom + 1, xBits = Math.ceil(Math.log2(width)), yBits = Math.ceil(Math.log2(height));
    cursors.push({polygon, left, bottom, width, height, xBits, yBits, at: 0, end: 2 ** (xBits + yBits)});
  }
  const visited = new Set<string>();
  try {
    let active = true;
    while (active && instances.length < budget && stats.candidates < WOODLAND_DISPLAY_LIMITS.candidates) {
      active = false;
      for (const cursor of cursors) {
        if (instances.length >= budget || stats.candidates >= WOODLAND_DISPLAY_LIMITS.candidates) break;
        if (cursor.at >= cursor.end) continue;
        active = true; stats.candidates++; const cell = nextCell(cursor); if (!cell) continue;
        const id = 'woodland:' + cell[0] + ':' + cell[1]; if (visited.has(id)) { stats.duplicate++; continue; }
        const gx = (cell[0] + .5 + (hash(cell[0], cell[1], 137) - .5) * .32) * STEP, gz = (cell[1] + .5 + (hash(cell[0], cell[1], 761) - .5) * .32) * STEP;
        const x = Math.fround((gx - originWorld[0]) * scale), z = Math.fround((gz - originWorld[1]) * scale), point = geographic(originWorld[0] + x / scale, originWorld[1] + z / scale), box = boxFor(x, z);
        if (point[0] < viewport[0] || point[0] > viewport[2] || point[1] < viewport[1] || point[1] > viewport[3]) continue;
        if (!covers(cursor.polygon, box) || !boundary.covers(box) || exclusions.some(p => intersects(p, box))) { stats.held++; continue; }
        if (near(x, z)) { stats.duplicate++; continue; }
        const owner = sources.find(p => p.sourceId < cursor.polygon.sourceId && covers(p, box)) ?? cursor.polygon;
        visited.add(id); add(x, z); instances.push({id, sourceId: owner.sourceId, kind: 'wood', lon: point[0], lat: point[1], x, z, height: 7, heightStatus: 'display-default', role: 'source-woodland-display-schematic-not-source-tree-point'});
      }
    }
    if (cursors.some(c => c.at < c.end)) { stats.truncated = true; stats.reason = instances.length >= budget ? 'instance-budget' : 'candidate-budget'; }
  } catch (error) { if (error !== edgeLimit) throw error; stats.truncated = true; stats.reason = 'geometry-work-budget'; }
  return result();
}
