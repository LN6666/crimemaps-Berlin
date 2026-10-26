import earcut, {deviation} from 'earcut';
import {ENVIRONMENT_LIMITS, sourceTreeHeight, type EnvironmentBox, type EnvironmentFeature} from './environment-scene-data';
import type {PreparedSolarBoundary} from './solar-shadow-admission';

const RAD = Math.PI / 180, R = 6378137;
const overlaps = (a: EnvironmentBox, b: EnvironmentBox) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
function segmentInterval(a: number[], b: number[], box: number[]) {
  let enter = 0, leave = 1;
  for (let axis = 0; axis < 2; axis++) {
    const delta = b[axis] - a[axis];
    if (!delta) { if (a[axis] < box[axis] || a[axis] > box[axis + 2]) return; continue; }
    const t0 = (box[axis] - a[axis]) / delta, t1 = (box[axis + 2] - a[axis]) / delta;
    enter = Math.max(enter, Math.min(t0, t1)); leave = Math.min(leave, Math.max(t0, t1));
    if (enter > leave) return;
  }
  return [enter, leave];
}
function coordinates(origin: readonly [number, number]) {
  const scale = R * Math.cos(origin[1] * RAD), y = Math.log(Math.tan(Math.PI / 4 + origin[1] * RAD / 2));
  return {
    local: (p: readonly number[]) => [Math.fround((p[0] - origin[0]) * RAD * scale), Math.fround((Math.log(Math.tan(Math.PI / 4 + p[1] * RAD / 2)) - y) * scale)],
    geographic: (box: readonly number[]): EnvironmentBox => [origin[0] + box[0] / scale / RAD, (2 * Math.atan(Math.exp(y + box[1] / scale)) - Math.PI / 2) / RAD, origin[0] + box[2] / scale / RAD, (2 * Math.atan(Math.exp(y + box[3] / scale)) - Math.PI / 2) / RAD],
  };
}

/** Packed display material only; these codes never change source land-cover tags.
 * Conflicting vegetation tags keep the neutral cover instead of claiming lawn. */
export function greenGroundMaterialRole(tags: Record<string, string>): number {
  const grass = ['grass', 'meadow', 'village_green'].includes(tags.landuse) || tags.natural === 'grassland' || tags.landcover === 'grass' || tags.surface === 'grass';
  const wood = tags.natural === 'wood' || ['forest', 'orchard'].includes(tags.landuse) || tags.landcover === 'trees';
  const lowVegetation = ['scrub', 'heath'].includes(tags.natural);
  if (Number(grass) + Number(wood) + Number(lowVegetation) !== 1) return 3;
  return grass ? 4 : wood ? 5 : 6;
}

/** Source green polygons only, including their holes. No grass blades, park-wide
 * tree scatter, source changes or long-lived cache. Float32 triangle envelopes
 * must remain inside the already verified municipality, including its holes. */
export function greenGroundGeometry(features: readonly EnvironmentFeature[], origin: readonly [number, number], viewport: EnvironmentBox, boundary: PreparedSolarBoundary | undefined, remainingVertices: number, remainingIndices: number) {
  const positions: number[] = [], indices: number[] = [], seen = new Set<string>();
  let admitted = 0, held = 0, omitted = 0;
  const maxVertices = Math.min(ENVIRONMENT_LIMITS.greenVertices, remainingVertices), maxIndices = Math.min(ENVIRONMENT_LIMITS.greenIndices, remainingIndices), projection = coordinates(origin);
  // The equal-depth pass keeps the first cover. Draw specific source cover
  // before general park polygons, with stable ID order inside each class.
  const ordered = features.filter(f => f.properties.kind === 'green').map(feature => ({feature, role: greenGroundMaterialRole(feature.properties.osmTags)}));
  ordered.sort((a, b) => Number(a.role === 3) - Number(b.role === 3) || a.feature.id.localeCompare(b.feature.id));
  for (const {feature, role} of ordered) {
    if (seen.has(feature.id)) continue;
    seen.add(feature.id);
    if (['asphalt', 'concrete', 'paved', 'paving_stones', 'sett', 'cobblestone', 'metal', 'wood'].includes(feature.properties.osmTags.surface)) { held++; continue; }
    if (!boundary || boundary.boundarySHA256 !== feature.properties.source_boundary_sha256 || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) { held++; continue; }
    // A park is green ground cover, not proof that every interior point is lawn.
    const polygons: number[][][][] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) {
      if (!polygon.length || polygon.some(ring => ring.length < 4 || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1])) { held++; continue; }
      const box: EnvironmentBox = [Infinity, Infinity, -Infinity, -Infinity];
      for (const p of polygon[0]) { box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]); box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]); }
      if (!overlaps(box, viewport)) continue;
      const vertexCount = polygon.reduce((n, ring) => n + ring.length - 1, 0);
      if (positions.length / 7 + vertexCount > maxVertices) { omitted++; continue; }
      const xy: number[] = [], holes: number[] = [];
      for (const [ringIndex, ring] of polygon.entries()) {
        if (ringIndex) holes.push(xy.length / 2);
        for (const p of ring.slice(0, -1)) xy.push(...projection.local(p));
      }
      const triangles = earcut(xy, holes, 2);
      if (!triangles.length || !Number.isFinite(deviation(xy, holes, 2, triangles)) || deviation(xy, holes, 2, triangles) > 1e-8) { held++; continue; }
      if (indices.length + triangles.length > maxIndices) { omitted++; continue; }
      const localBox = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i < xy.length; i += 2) { localBox[0] = Math.min(localBox[0], xy[i]); localBox[1] = Math.min(localBox[1], xy[i + 1]); localBox[2] = Math.max(localBox[2], xy[i]); localBox[3] = Math.max(localBox[3], xy[i + 1]); }
      const allCovered = boundary.covers(projection.geographic(localBox)), accepted: number[] = [];
      for (let i = 0; i < triangles.length; i += 3) {
        const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        // A conservative rejection at a municipal edge never extends the source.
        const triangleBox = [Math.min(xy[a * 2], xy[b * 2], xy[c * 2]), Math.min(xy[a * 2 + 1], xy[b * 2 + 1], xy[c * 2 + 1]), Math.max(xy[a * 2], xy[b * 2], xy[c * 2]), Math.max(xy[a * 2 + 1], xy[b * 2 + 1], xy[c * 2 + 1])];
        if (allCovered || boundary.covers(projection.geographic(triangleBox))) accepted.push(a, b, c); else held++;
      }
      if (!accepted.length) continue;
      const start = positions.length / 7;
      for (let i = 0; i < xy.length; i += 2) positions.push(xy[i], .01, xy[i + 1], 0, 1, 0, role);
      for (const i of accepted) indices.push(start + i);
      admitted++;
    }
  }
  return {positions, indices, admitted, held, omitted};
}

export type TreeRowDisplayInstance = {id: string; rowSample: number; x: number; z: number; height: number; heightStatus: string; sourceHeight?: string; role: 'source-line-display-schematic-not-source-tree-point'};
/** Deterministic line illustration, never a new source tree inventory. Native
 * points win; near duplicates are omitted. Every displayed crown + maximum wind
 * is checked after Float32 packing, with no unverified-boundary fallback. */
export function treeRowDisplayInstances(features: readonly EnvironmentFeature[], origin: readonly [number, number], viewport: EnvironmentBox, boundary: PreparedSolarBoundary | undefined, capacity: number, crownRadius: number) {
  const instances: TreeRowDisplayInstance[] = [], seen = new Set<string>(), projection = coordinates(origin), spacing = ENVIRONMENT_LIMITS.treeRowSpacingMetres, separation = ENVIRONMENT_LIMITS.treeRowSeparationMetres;
  const grid = new Map<string, number[][]>();
  const lower = projection.local([viewport[0], viewport[1]]), upper = projection.local([viewport[2], viewport[3]]), localView = [lower[0] - crownRadius, lower[1] - crownRadius, upper[0] + crownRadius, upper[1] + crownRadius];
  let held = 0, duplicate = 0, candidates = 0, truncated = false;
  const add = (x: number, z: number) => { const key = Math.floor(x / separation) + ':' + Math.floor(z / separation); const list = grid.get(key); if (list) list.push([x, z]); else grid.set(key, [[x, z]]); };
  const near = (x: number, z: number) => { const cx = Math.floor(x / separation), cz = Math.floor(z / separation); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const p of grid.get((cx + dx) + ':' + (cz + dz)) ?? []) if (Math.hypot(p[0] - x, p[1] - z) < separation) return true; return false; };
  // Include native points even if the current point budget excluded their models.
  for (const f of features) if (f.properties.kind === 'tree' && f.geometry.type === 'Point') { const p = projection.local(f.geometry.coordinates); add(p[0], p[1]); }
  const rowFeatures = features.filter(f => f.properties.kind === 'tree_row').sort((a, b) => a.id.localeCompare(b.id));
  for (const f of rowFeatures) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    if (!boundary || boundary.boundarySHA256 !== f.properties.source_boundary_sha256 || !['LineString', 'MultiLineString'].includes(f.geometry.type) || !Number.isFinite(crownRadius) || crownRadius <= 0 || crownRadius > 5) { held++; continue; }
    const paths: number[][][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates, height = sourceTreeHeight(f.properties.osmTags);
    let rowSample = 0;
    for (const path of paths) {
      let distance = 0;
      for (let i = 1; i < path.length; i++) {
        const a = projection.local(path[i - 1]), b = projection.local(path[i]), dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), end = distance + length;
        const interval = length > 0 ? segmentInterval(a, b, localView) : undefined;
        if (interval) {
          const first = Math.max(distance + 1e-6, distance + interval[0] * length), last = Math.min(end, distance + interval[1] * length);
          for (let at = Math.ceil(first / spacing) * spacing; at <= last; at += spacing) {
            if (instances.length >= capacity || candidates >= ENVIRONMENT_LIMITS.treeRowCandidateLimit) { truncated = true; return {instances, held, duplicate, candidates, truncated}; }
            const t = (at - distance) / length, x = Math.fround(a[0] + dx * t), z = Math.fround(a[1] + dz * t), geographic = projection.geographic([x - crownRadius, z - crownRadius, x + crownRadius, z + crownRadius]);
            rowSample++;
            if (!overlaps(geographic, viewport)) continue;
            candidates++;
            if (!boundary.covers(geographic)) { held++; continue; }
            if (near(x, z)) { duplicate++; continue; }
            add(x, z); instances.push({id: f.id, rowSample, x, z, height: height.metres, heightStatus: height.status, sourceHeight: height.raw, role: 'source-line-display-schematic-not-source-tree-point'});
          }
        }
        distance = end;
      }
    }
  }
  return {instances, held, duplicate, candidates, truncated};
}
