import {createGroundProjection} from './ground-projection';
import earcut, {deviation} from 'earcut';
import {ENVIRONMENT_LIMITS, sourceTreeHeight, type EnvironmentBox, type EnvironmentFeature} from './environment-scene-data';
import {coversProjectedGroundTriangle, type PreparedSolarBoundary} from './solar-shadow-admission';

const RAD = Math.PI / 180, R = 6378137;
const overlaps = (a: Readonly<EnvironmentBox>, b: Readonly<EnvironmentBox>) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
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
function coordinates(origin: readonly [number, number],boundarySHA256?:string) {
  return createGroundProjection(origin,boundarySHA256);
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
  const maxVertices = Math.min(ENVIRONMENT_LIMITS.greenVertices, remainingVertices), maxIndices = Math.min(ENVIRONMENT_LIMITS.greenIndices, remainingIndices), projection = coordinates(origin,boundary?.boundarySHA256);
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
      // Keep the existing per-polygon work ceiling. The remaining packed budget
      // is checked on referenced vertices, not duplicate or rejected source points.
      if (vertexCount > ENVIRONMENT_LIMITS.greenVertices || positions.length / 7 + 3 > maxVertices || indices.length + 3 > maxIndices) { omitted++; continue; }
      const xy: number[] = [], holes: number[] = [];
      for (const [ringIndex, ring] of polygon.entries()) {
        if (ringIndex) holes.push(xy.length / 2);
        for (const p of ring.slice(0, -1)) xy.push(...projection.local(p));
      }
      const triangles = earcut(xy, holes, 2);
      if (!triangles.length || !Number.isFinite(deviation(xy, holes, 2, triangles)) || deviation(xy, holes, 2, triangles) > 1e-8) { held++; continue; }
      const localBox = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i < xy.length; i += 2) { localBox[0] = Math.min(localBox[0], xy[i]); localBox[1] = Math.min(localBox[1], xy[i + 1]); localBox[2] = Math.max(localBox[2], xy[i]); localBox[3] = Math.max(localBox[3], xy[i + 1]); }
      const allCovered = boundary.covers(projection.geographic(localBox)), accepted: number[] = [];
      for (let i = 0; i < triangles.length; i += 3) {
        const a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        // A conservative rejection at a municipal edge never extends the source.
        const triangleBox = [Math.min(xy[a * 2], xy[b * 2], xy[c * 2]), Math.min(xy[a * 2 + 1], xy[b * 2 + 1], xy[c * 2 + 1]), Math.max(xy[a * 2], xy[b * 2], xy[c * 2]), Math.max(xy[a * 2 + 1], xy[b * 2 + 1], xy[c * 2 + 1])];
        if (allCovered || boundary.covers(projection.geographic(triangleBox)) || coversProjectedGroundTriangle(boundary,projection.geographic,xy[a*2],xy[a*2+1],xy[b*2],xy[b*2+1],xy[c*2],xy[c*2+1])) accepted.push(a, b, c); else held++;
      }
      if (!accepted.length) continue;
      if (indices.length + accepted.length > maxIndices) { omitted++; continue; }
      // Boundary filtering has copied every retained index into accepted. Reuse
      // earcut's output scratch for at most 20k remap slots instead of adding a
      // Map or array beside the already admitted construction working set.
      const remap = triangles;
      remap.length = vertexCount;
      remap.fill(-1);
      let referencedVertices = 0;
      for (const i of accepted) if (remap[i] === -1) { remap[i] = 0; referencedVertices++; }
      if (positions.length / 7 + referencedVertices > maxVertices) { omitted++; continue; }
      for (let i = 0; i < xy.length; i += 2) {
        if (remap[i / 2] === -1) continue;
        remap[i / 2] = positions.length / 7;
        positions.push(xy[i], .01, xy[i + 1], 0, 1, 0, role);
      }
      for (const i of accepted) indices.push(remap[i]);
      admitted++;
    }
  }
  return {positions, indices, admitted, held, omitted};
}

export type TreeRowDisplayInstance = {id: string; rowSample: number; x: number; z: number; height: number; heightStatus: string; sourceHeight?: string; role: 'source-line-display-schematic-not-source-tree-point'};
export const TREE_ROW_DISPLAY_INPUT_LIMITS = Object.freeze({features: 20000, vertices: 200000});
type RowSpan = {a: number[]; dx: number; dz: number; distance: number; length: number; samples:Generator<number>; remaining:number; offset: number};
/** Bit-reversed source-distance order, pruning arithmetic progressions wholly
 * outside the visible interval. The rank domain never follows the viewport. */
function* sourceRowSlots(first:number,last:number,bits:number,prefix=0,stride=1):Generator<number>{
  if(Math.ceil((first-prefix)/stride)>Math.floor((last-prefix)/stride))return;
  if(!bits){yield prefix;return;}
  yield* sourceRowSlots(first,last,bits-1,prefix,stride*2);
  yield* sourceRowSlots(first,last,bits-1,prefix+stride,stride*2);
}
/** Deterministic line illustration, never a new source tree inventory. Native
 * points win; near duplicates are omitted. Every displayed crown + maximum wind
 * is checked after Float32 packing, with no unverified-boundary fallback. */
function treeRowDisplayCandidateStream(features: readonly EnvironmentFeature[], origin: readonly [number, number], viewport: EnvironmentBox, boundary: PreparedSolarBoundary | undefined, capacity: number, crownRadius: number) {
  const stats = {held: 0, duplicate: 0, candidates: 0, scannedSlots: 0, truncated: false};
  function* iterate():Generator<TreeRowDisplayInstance>{
  if(features.length>TREE_ROW_DISPLAY_INPUT_LIMITS.features){stats.truncated=true;return;}
  const seen = new Set<string>(), projection = coordinates(origin), spacing = ENVIRONMENT_LIMITS.treeRowSpacingMetres, separation = ENVIRONMENT_LIMITS.treeRowSeparationMetres;
  const grid = new Map<string, number[][]>();
  const lower = projection.local([viewport[0], viewport[1]]), upper = projection.local([viewport[2], viewport[3]]), localView = [lower[0] - crownRadius, lower[1] - crownRadius, upper[0] + crownRadius, upper[1] + crownRadius];
  const add = (x: number, z: number) => { const key = Math.floor(x / separation) + ':' + Math.floor(z / separation); const list = grid.get(key); if (list) list.push([x, z]); else grid.set(key, [[x, z]]); };
  const near = (x: number, z: number) => { const cx = Math.floor(x / separation), cz = Math.floor(z / separation); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const p of grid.get((cx + dx) + ':' + (cz + dz)) ?? []) if (Math.hypot(p[0] - x, p[1] - z) < separation) return true; return false; };
  // Include native points even if the current point budget excluded their models.
  for (const f of features) if (f.properties.kind === 'tree' && f.geometry.type === 'Point') { const p = projection.local(f.geometry.coordinates); add(p[0], p[1]); }
  const rowFeatures = features.filter(f => f.properties.kind === 'tree_row').sort((a, b) => a.id.localeCompare(b.id));
  const sources=new Map<string,{id:string;height:ReturnType<typeof sourceTreeHeight>;spans:Map<number,RowSpan>}>();
  let vertices=0;
  for (const f of rowFeatures) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    if (!boundary || boundary.boundarySHA256 !== f.properties.source_boundary_sha256 || !['LineString', 'MultiLineString'].includes(f.geometry.type) || !Number.isFinite(crownRadius) || crownRadius <= 0 || crownRadius > 5) { stats.held++; continue; }
    const paths: number[][][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates, height = sourceTreeHeight(f.properties.osmTags);
    const spans=new Map<number,RowSpan>();
    // Reserve each source path's complete distance slots, including invisible
    // ones. Viewport clipping must not renumber an existing world-position ID.
    let pathSampleOffset = 0;
    for (const path of paths) {
      vertices+=path.length;
      if(vertices>TREE_ROW_DISPLAY_INPUT_LIMITS.vertices){stats.truncated=true;return;}
      let distance = 0;
      for (let i = 1; i < path.length; i++) {
        const a = projection.local(path[i - 1]), b = projection.local(path[i]), dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), end = distance + length;
        const interval = length > 0 ? segmentInterval(a, b, localView) : undefined;
        if (interval) {
          const first = Math.max(distance + 1e-6, distance + interval[0] * length), last = Math.min(end, distance + interval[1] * length);
          const firstSample=Math.ceil(first/spacing),count=Math.floor(last/spacing)-firstSample+1;
          if(count>0){const bits=Math.ceil(Math.log2(Math.floor(end/spacing)+1));spans.set(spans.size,{a,dx,dz,distance,length,samples:sourceRowSlots(firstSample,firstSample+count-1,bits),remaining:count,offset:pathSampleOffset});}
        }
        distance = end;
      }
      // A separate slot also separates empty/degenerate MultiLineString paths.
      pathSampleOffset += Math.floor(distance / spacing) + 1;
    }
    if(spans.size)sources.set(f.id,{id:f.id,height,spans});
  }
  let generated=0;
  // Each source and visible segment takes a turn. Source-anchored slot order
  // reaches both ends of a long row without changing any source-distance ID.
  // Pruning costs at most the source-domain bit depth per visible slot.
  while(sources.size&&generated<capacity&&stats.scannedSlots<ENVIRONMENT_LIMITS.treeRowCandidateLimit){
    const id=sources.keys().next().value!,source=sources.get(id)!;sources.delete(id);
    const key=source.spans.keys().next().value!,span=source.spans.get(key)!;source.spans.delete(key);
    const sample=span.samples.next().value!;
    if(--span.remaining)source.spans.set(key,span);
    if(source.spans.size)sources.set(id,source);
    stats.scannedSlots++;
    const at=sample*spacing,t=(at-span.distance)/span.length;
    const x=Math.fround(span.a[0]+span.dx*t),z=Math.fround(span.a[1]+span.dz*t),geographic=projection.geographic([x-crownRadius,z-crownRadius,x+crownRadius,z+crownRadius]);
    if(!overlaps(geographic,viewport))continue;
    stats.candidates++;
    if(!boundary!.covers(geographic)){stats.held++;continue;}
    if(near(x,z)){stats.duplicate++;continue;}
    add(x,z);generated++;
    yield {id:source.id,rowSample:span.offset+sample,x,z,height:source.height.metres,heightStatus:source.height.status,sourceHeight:source.height.raw,role:'source-line-display-schematic-not-source-tree-point'};
  }
  if(sources.size)stats.truncated=true;
  }
  return {instances:iterate(),stats};
}

/** Lazy preselection candidates: at most 8192 examined slots, never treeCap. */
export function treeRowDisplayCandidates(features:readonly EnvironmentFeature[],origin:readonly [number,number],viewport:EnvironmentBox,boundary:PreparedSolarBoundary|undefined,crownRadius:number){
  return treeRowDisplayCandidateStream(features,origin,viewport,boundary,ENVIRONMENT_LIMITS.treeRowCandidateLimit,crownRadius);
}

/** Small standalone display collector; the renderer uses the candidate stream. */
export function treeRowDisplayInstances(features:readonly EnvironmentFeature[],origin:readonly [number,number],viewport:EnvironmentBox,boundary:PreparedSolarBoundary|undefined,capacity:number,crownRadius:number){
  const stream=treeRowDisplayCandidateStream(features,origin,viewport,boundary,capacity,crownRadius),instances=[...stream.instances];
  return {instances,...stream.stats};
}
