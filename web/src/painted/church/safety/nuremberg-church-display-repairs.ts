import type {BuildingComponent, MeshBatch} from './building-mesh-renderer';

type Point = [number, number];
type Vertex = [number, number, number];
type RowRepair = {
  row: number;
  objectId: string;
  partId: string;
  feature: 'tower' | 'church-roof' | 'chapel-roof-and-bellcote' | 'church-roof-and-tower';
  shaftRise: number;
  capRise: number;
  upperStoreyRise?: number;
  roofRise?: number;
  belfryRise?: number;
  capStyle?: 'pyramid' | 'spire';
  /** Tent-like churches use hipped end planes instead of vertical gable infill. */
  roofProfile?: 'gable' | 'tent';
  clock?: boolean;
  portalSide?: 'north';
  end?: 'min' | 'max' | 'ridge';
  capMaterialName?: string;
};

const EARTH = 40075016.686;
const REPAIRS: readonly RowRepair[] = [
  // The parish's Bartning history compares this exact church's silhouette to a
  // tent; add a low roof that slopes down at both ends, within its flat envelope.
  {row: 13, objectId: 'osm/way/233673556', partId: 'osm/way/233673556/component/cf24baf536a0342559ff', feature: 'church-roof', shaftRise: 0, capRise: 0, roofRise: 2.4, roofProfile: 'tent'},
  // The parish history documents a five-storey tower and a sandstone upper storey.
  // Keep the upper stage schematic at one fifth of the existing 20 m shaft. The
  // exact view is not locally verified, so do not invent a clock face or its side.
  {row: 21, objectId: 'osm/way/30126205', partId: 'osm/way/30126205/component/9bd58575de8332394efb', feature: 'tower', shaftRise: 20, upperStoreyRise: 4, capRise: 9, end: 'max'},
  // The city museum's exterior view supports the steep roof and small ridge
  // bellcote; its text also places the portal on the north side. Keep a simple
  // recessed portal marker within this exact component; no surround is inferred.
  {row: 45, objectId: 'osm/way/429378209', partId: 'osm/way/429378209/component/83083286386fcacbea1d', feature: 'chapel-roof-and-bellcote', shaftRise: 2.2, capRise: 1.9, roofRise: 3.1, end: 'ridge', portalSide: 'north', capMaterialName: 'church-display-copper-cap'},
  // The state-history record and exact church photo support the Wöhrd tower.
  {row: 56, objectId: 'osm/way/76132312', partId: 'osm/way/76132312/component/41ff97940372e0ea5fa8', feature: 'tower', shaftRise: 15, capRise: 8, clock: true, end: 'max'},
  // Site imagery shows the medieval chapel's pitched roof and compact ridge tower.
  {row: 61, objectId: 'osm/way/84052748', partId: 'osm/way/84052748/component/cede49b9424619c99c81', feature: 'church-roof-and-tower', shaftRise: 2.3, capRise: 1.8, roofRise: 3.2, end: 'ridge'},
  // City-history source and matching exterior photo show the tall overhanging cap.
  {row: 64, objectId: 'osm/way/90033898', partId: 'osm/way/90033898/component/8f92c0633964a219c92f', feature: 'church-roof-and-tower', shaftRise: 17, capRise: 10, roofRise: 4.0, clock: true, end: 'max'},
  // Parish photo identifies the Kornburg tower; the exact component stays the carrier.
  {row: 66, objectId: 'osm/way/92743627', partId: 'osm/way/92743627/component/175b32f81843f9c685cb', feature: 'tower', shaftRise: 14, belfryRise: 4, capRise: 9, capStyle: 'spire', clock: true, end: 'max'},
  // Parish history documents the late-medieval tower; current source way is retained.
  {row: 70, objectId: 'osm/way/96381744', partId: 'osm/way/96381744/component/795036d3faeb1c27d653', feature: 'church-roof-and-tower', shaftRise: 8, capRise: 5.5, roofRise: 2.7, end: 'max'},
];

function localPoint(c: BuildingComponent, p: Point): Point {
  const lat = c.origin[1] * Math.PI / 180;
  const x = (p[0] - c.origin[0]) * EARTH * Math.cos(lat) / 360;
  const y = p[1] * Math.PI / 180;
  return [x, (Math.log(Math.tan(Math.PI / 4 + y / 2)) - Math.log(Math.tan(Math.PI / 4 + lat / 2))) * EARTH * Math.cos(lat) / (2 * Math.PI)];
}

function topOf(c: BuildingComponent): number {
  let top = 0;
  for (const b of c.batches) for (let i = 1; i < b.positions.length; i += 3) top = Math.max(top, b.positions[i]);
  return top;
}

function empty() { return {positions: [] as number[], normals: [] as number[], indices: [] as number[]}; }

function triangle(batch: ReturnType<typeof empty>, a: Vertex, b: Vertex, c: Vertex, expected: Vertex): void {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let n: Vertex = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const length = Math.hypot(...n);
  if (length < 1e-7) return;
  n = n.map(v => v / length) as Vertex;
  if (n[0] * expected[0] + n[1] * expected[1] + n[2] * expected[2] < 0) n = n.map(v => -v) as Vertex;
  const at = batch.positions.length / 3;
  for (const p of [a, b, c]) { batch.positions.push(...p); batch.normals.push(...n); }
  batch.indices.push(at, at + 1, at + 2);
}

function quad(batch: ReturnType<typeof empty>, a: Vertex, b: Vertex, c: Vertex, d: Vertex, expected: Vertex): void {
  triangle(batch, a, b, c, expected); triangle(batch, a, c, d, expected);
}

function finish(batch: ReturnType<typeof empty>, materialName: string, faceRole: 'wall' | 'roof'): MeshBatch {
  return {positions: new Float32Array(batch.positions), normals: new Float32Array(batch.normals), indices: new Uint32Array(batch.indices), color: [1, 1, 1], faceRole, materialName};
}

function inside(p: Point, ring: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

function makeFrame(c: BuildingComponent) {
  const ring = c.componentGeometry.coordinates[0].slice(0, -1).map(p => localPoint(c, [p[0], p[1]]));
  if (ring.length < 4) return undefined;
  const mx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const mz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  let xx = 0, zz = 0, xz = 0;
  for (const p of ring) { const x = p[0] - mx, z = p[1] - mz; xx += x * x; zz += z * z; xz += x * z; }
  const angle = .5 * Math.atan2(2 * xz, xx - zz), ux = Math.cos(angle), uz = Math.sin(angle), vx = -uz, vz = ux;
  const uv = ring.map(p => [(p[0] - mx) * ux + (p[1] - mz) * uz, (p[0] - mx) * vx + (p[1] - mz) * vz] as Point);
  const u0 = Math.min(...uv.map(p => p[0])), u1 = Math.max(...uv.map(p => p[0]));
  const v0 = Math.min(...uv.map(p => p[1])), v1 = Math.max(...uv.map(p => p[1]));
  if (u1 - u0 < 5 || v1 - v0 < 3) return undefined;
  const local = (u: number, v: number): Point => [mx + u * ux + v * vx, mz + u * uz + v * vz];
  const xyz = (u: number, v: number, y: number): Vertex => { const p = local(u, v); return [p[0], y, p[1]]; };
  const polygonUV = uv;
  const section = (u: number): [number, number] | undefined => {
    const hits: number[] = [];
    for (let i = 0; i < polygonUV.length; i++) {
      const a = polygonUV[i], b = polygonUV[(i + 1) % polygonUV.length];
      if ((a[0] <= u && b[0] > u) || (b[0] <= u && a[0] > u)) hits.push(a[1] + (u - a[0]) * (b[1] - a[1]) / (b[0] - a[0]));
    }
    hits.sort((a, b) => a - b);
    let best: [number, number] | undefined;
    for (let i = 0; i + 1 < hits.length; i += 2) if (!best || hits[i + 1] - hits[i] > best[1] - best[0]) best = [hits[i], hits[i + 1]];
    return best;
  };
  // The containment ring is already expressed in PCA-local UV coordinates.
  // Applying `local()` here transformed the query back to metres while leaving
  // the ring in UV, so every end-tower fit failed and silently added no geometry.
  return {ring: polygonUV, u0, u1, v0, v1, length: u1 - u0, width: v1 - v0, xyz, section, local, inside: (u: number, v: number) => inside([u, v], polygonUV)};
}

function addPitchedRoof(c: BuildingComponent, frame: NonNullable<ReturnType<typeof makeFrame>>, roof: ReturnType<typeof empty>, walls: ReturnType<typeof empty>, roofRise: number, hippedEnds = false): void {
  const {u0, u1, xyz, section} = frame;
  const start = u0 + Math.max(1, frame.length * .08), end = u1 - Math.max(1, frame.length * .08);
  const segments = Math.max(4, Math.min(18, Math.ceil((end - start) / 4)));
  const base = topOf(c) + .15, eave = base + .4, ridge = eave + roofRise;
  const hipLength = hippedEnds ? Math.min(frame.width * .5, (end - start) * .34) : 0;
  const ridgeHeight = (u: number): number => hippedEnds && hipLength > 0
    ? eave + roofRise * Math.max(0, Math.min(1, (u - start) / hipLength, (end - u) / hipLength))
    : ridge;
  const line = Array.from({length: segments + 1}, (_, i) => {
    const u = start + (end - start) * i / segments, s = section(u);
    return s ? {u, v0: s[0] + .25, v1: s[1] - .25, vc: (s[0] + s[1]) / 2, ridgeY: ridgeHeight(u)} : undefined;
  }).filter((x): x is {u: number; v0: number; v1: number; vc: number; ridgeY: number} => Boolean(x && x.v1 - x.v0 > 1.5));
  if (line.length < 2) return;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1];
    quad(roof, xyz(a.u, a.v0, eave), xyz(b.u, b.v0, eave), xyz(b.u, b.vc, b.ridgeY), xyz(a.u, a.vc, a.ridgeY), [0, 1, 0]);
    quad(roof, xyz(a.u, a.vc, a.ridgeY), xyz(b.u, b.vc, b.ridgeY), xyz(b.u, b.v1, eave), xyz(a.u, a.v1, eave), [0, 1, 0]);
  }
  const a = line[0], b = line.at(-1)!;
  if (hippedEnds) {
    const firstRidgeU = Math.min(a.u + hipLength, b.u), lastRidgeU = Math.max(b.u - hipLength, a.u);
    const first = section(firstRidgeU), last = section(lastRidgeU);
    if (first) triangle(roof, xyz(a.u, a.v0, eave), xyz(a.u, a.v1, eave), xyz(firstRidgeU, (first[0] + first[1]) / 2, ridgeHeight(firstRidgeU)), [0, 1, 0]);
    if (last) triangle(roof, xyz(b.u, b.v1, eave), xyz(b.u, b.v0, eave), xyz(lastRidgeU, (last[0] + last[1]) / 2, ridgeHeight(lastRidgeU)), [0, 1, 0]);
  } else {
    const startCenter = xyz(a.u, a.vc, eave), endCenter = xyz(b.u, b.vc, eave);
    const along: Vertex = [endCenter[0] - startCenter[0], 0, endCenter[2] - startCenter[2]];
    triangle(walls, xyz(a.u, a.v0, eave), xyz(a.u, a.v1, eave), xyz(a.u, a.vc, ridge), [-along[0], 0, -along[2]]);
    triangle(walls, xyz(b.u, b.v1, eave), xyz(b.u, b.v0, eave), xyz(b.u, b.vc, ridge), along);
  }
}

function addNorthPortal(frame: NonNullable<ReturnType<typeof makeFrame>>, dark: ReturnType<typeof empty>, wallHeight: number): void {
  const {ring, local, xyz} = frame;
  let bestIndex = -1, bestNorth = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const north = (local(a[0], a[1])[1] + local(b[0], b[1])[1]) / 2;
    if (north > bestNorth) { bestNorth = north; bestIndex = i; }
  }
  if (bestIndex < 0) return;
  const a = ring[bestIndex], b = ring[(bestIndex + 1) % ring.length];
  const du = b[0] - a[0], dv = b[1] - a[1], length = Math.hypot(du, dv);
  if (length < 2.2) return;
  const tangent: Point = [du / length, dv / length];
  const midpoint: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const centroid: Point = [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length];
  let outward: Point = [-tangent[1], tangent[0]];
  if ((midpoint[0] - centroid[0]) * outward[0] + (midpoint[1] - centroid[1]) * outward[1] < 0) outward = [-outward[0], -outward[1]];
  const center: Point = [midpoint[0] + outward[0] * .035, midpoint[1] + outward[1] * .035];
  const halfWidth = Math.min(.62, length * .18), height = Math.min(2.25, wallHeight * .32);
  const point = (side: number, y: number): Vertex => xyz(center[0] + tangent[0] * halfWidth * side, center[1] + tangent[1] * halfWidth * side, y);
  const centerWorld = xyz(center[0], center[1], 0), outWorld = xyz(center[0] + outward[0], center[1] + outward[1], 0);
  quad(dark, point(-1, 0), point(1, 0), point(1, height), point(-1, height), [outWorld[0] - centerWorld[0], 0, outWorld[2] - centerWorld[2]]);
}

function addTower(frame: NonNullable<ReturnType<typeof makeFrame>>, walls: ReturnType<typeof empty>, upperStorey: ReturnType<typeof empty>, roof: ReturnType<typeof empty>, capFaces: ReturnType<typeof empty>, windows: ReturnType<typeof empty>, clock: ReturnType<typeof empty>, repair: RowRepair, base: number): void {
  const {u0, u1, length, width, section, xyz, inside: isInside} = frame;
  const ridgeBellcote = repair.end === 'ridge';
  const depth = ridgeBellcote ? Math.max(1.6, Math.min(2.6, length * .09)) : Math.max(3.6, Math.min(8.5, length * .18));
  let uA = ridgeBellcote ? (u0 + u1 - depth) / 2 : repair.end === 'min' ? u0 : u1 - depth;
  let uB = uA + depth, endU = (uA + uB) / 2;
  let half = 0, vC = 0, fitted = false;
  const minimumHalf = ridgeBellcote ? .3 : .9;
  // Footprints often taper or step at the ends. Walk inward from the sourced
  // end until a complete tower footprint fits; never relax the exact polygon.
  const maxInset = ridgeBellcote ? 0 : Math.min(6, length * .16);
  for (let inset = 0; inset <= maxInset + 1e-6 && !fitted; inset += .5) {
    uA = ridgeBellcote ? (u0 + u1 - depth) / 2 : repair.end === 'min' ? u0 + inset : u1 - depth - inset;
    uB = uA + depth;
    endU = (uA + uB) / 2;
    const sec = section(endU);
    if (!sec) continue;
    vC = (sec[0] + sec[1]) / 2;
    half = ridgeBellcote ? Math.min(width * .075, (sec[1] - sec[0]) * .14, depth * .35) : Math.min(width * .21, (sec[1] - sec[0]) * .32, depth * .46);
    for (let i = 0; i < 8 && half > minimumHalf; i++, half *= .82) {
      if ([uA, uB].every(u => [vC - half, vC + half].every(v => isInside(u, v)))) { fitted = true; break; }
    }
  }
  if (!fitted) return;
  const shaftTop = base + repair.shaftRise;
  // The Nuremberg parish source identifies St. Georg's sandstone upper storey;
  // its exact measured height is not available, so only the storey split is schematic.
  const upperStoreyBase = repair.upperStoreyRise && repair.upperStoreyRise < repair.shaftRise ? shaftTop - repair.upperStoreyRise : shaftTop;
  const verts: [number, number][] = [[uA, vC - half], [uB, vC - half], [uB, vC + half], [uA, vC + half]];
  for (let i = 0; i < 4; i++) {
    const p = verts[i], q = verts[(i + 1) % 4], midU = (p[0] + q[0]) / 2, midV = (p[1] + q[1]) / 2;
    const lowA = xyz(p[0], p[1], base), lowB = xyz(q[0], q[1], base), lowerHighB = xyz(q[0], q[1], upperStoreyBase), lowerHighA = xyz(p[0], p[1], upperStoreyBase);
    const center = xyz(endU, vC, base), faceCenter: Vertex = [(lowA[0] + lowB[0]) / 2, base, (lowA[2] + lowB[2]) / 2];
    const normal: Vertex = [faceCenter[0] - center[0], 0, faceCenter[2] - center[2]];
    quad(walls, lowA, lowB, lowerHighB, lowerHighA, normal);
    if (upperStoreyBase < shaftTop) {
      quad(upperStorey, lowerHighA, lowerHighB, xyz(q[0], q[1], shaftTop), xyz(p[0], p[1], shaftTop), normal);
    }
    if (i === 0 || i === 1) {
      const w = half * .23;
      const h0 = ridgeBellcote ? base + repair.shaftRise * .25 : shaftTop - 4.2;
      const h1 = ridgeBellcote ? base + repair.shaftRise * .78 : shaftTop - 1.4;
      quad(windows, xyz(midU - w, midV, h0), xyz(midU + w, midV, h0), xyz(midU + w, midV, h1), xyz(midU - w, midV, h1), normal);
    }
  }
  let capBase = shaftTop;
  let belfryCreated = false;
  if (repair.belfryRise && repair.belfryRise > 0) {
    // St. Nikolaus-Kornburg's exact exterior photo shows a square lower tower,
    // an octagonal bell stage, and a tall spire. The stage stays inside the
    // exact way footprint; its height is schematic pending the unselected view.
    const sides = 8, y0 = shaftTop, y1 = shaftTop + repair.belfryRise;
    const ringAt = (scale: number): Point[] => Array.from({length: sides}, (_, i) => {
      const a = Math.PI / sides + i * Math.PI * 2 / sides;
      const radius = half * scale / Math.cos(Math.PI / sides);
      return [endU + Math.cos(a) * radius, vC + Math.sin(a) * radius] as Point;
    });
    let scale = 1, ring = ringAt(scale);
    for (let i = 0; i < 8 && !ring.every(([u, v]) => isInside(u, v)); i++) { scale *= .82; ring = ringAt(scale); }
    if (ring.every(([u, v]) => isInside(u, v))) {
      const upper = ring.map(([u, v]) => [endU + (u - endU) * .9, vC + (v - vC) * .9] as Point);
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        const p = ring[i], q = ring[j];
        const pu = upper[i], qu = upper[j];
        const midU = (p[0] + q[0] + pu[0] + qu[0]) / 4, midV = (p[1] + q[1] + pu[1] + qu[1]) / 4;
        const center = xyz(endU, vC, y0), midpoint = xyz(midU, midV, y0);
        const normal: Vertex = [midpoint[0] - center[0], 0, midpoint[2] - center[2]];
        quad(walls, xyz(p[0], p[1], y0), xyz(q[0], q[1], y0), xyz(qu[0], qu[1], y1), xyz(pu[0], pu[1], y1), normal);
      }
      capBase = y1;
      belfryCreated = true;
      if (repair.capStyle === 'spire') {
        const tip = xyz(endU, vC, capBase + repair.capRise);
        for (let i = 0; i < sides; i++) {
          const j = (i + 1) % sides, p = upper[i], q = upper[j];
          triangle(capFaces, xyz(p[0], p[1], capBase), xyz(q[0], q[1], capBase), tip, [0, 1, 0]);
        }
      }
    }
  }
  if (!belfryCreated || repair.capStyle !== 'spire') {
    const capHalf = half * (repair.feature === 'church-roof-and-tower' && repair.row === 64 ? 1.35 : 1.08);
    const peak = xyz(endU, vC, capBase + repair.capRise);
    const capCorners = [[uA, vC - capHalf], [uB, vC - capHalf], [uB, vC + capHalf], [uA, vC + capHalf]] as Point[];
    for (let i = 0; i < 4; i++) {
      const p = capCorners[i], q = capCorners[(i + 1) % 4];
      triangle(capFaces, xyz(p[0], p[1], capBase), xyz(q[0], q[1], capBase), peak, [0, 1, 0]);
    }
  }
  if (repair.clock && !ridgeBellcote) {
    const faceU = repair.end === 'min' ? uA - .06 : uB + .06, cy = shaftTop - 6.5, r = half * .38, face = empty(), center = xyz(faceU, vC, cy), ring: Vertex[] = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * 2 * i / 16; ring.push(xyz(faceU, vC + Math.cos(a) * r, cy + Math.sin(a) * r)); }
    const towerCenter = xyz(endU, vC, cy), outward: Vertex = [center[0] - towerCenter[0], 0, center[2] - towerCenter[2]];
    for (let i = 0; i < 16; i++) triangle(face, center, ring[i], ring[i + 1], outward);
    clock.positions.push(...face.positions); clock.normals.push(...face.normals); clock.indices.push(...face.indices.map(i => i + (clock.positions.length - face.positions.length) / 3));
  }
}

/** Adds only photo- and description-backed church roof/tower massing inside each exact source component.
 * No source polygon, mesh vertices or indices are changed. Added display faces remain unverified until a fresh capture.
 */
export function supplementNurembergChurchDisplayRepairs(components: BuildingComponent[]): BuildingComponent[] {
  return components.map(c => {
    const repair = REPAIRS.find(r => c.city === 'nuremberg' && c.objectId === r.objectId && c.partId === r.partId);
    if (!repair) return c;
    const frame = makeFrame(c);
    if (!frame) return c;
    const walls = empty(), upperStorey = empty(), roof = empty(), cap = empty(), windows = empty(), clock = empty();
    const base = topOf(c);
    if (repair.feature === 'church-roof') addPitchedRoof(c, frame, roof, walls, repair.roofRise ?? 3.2, repair.roofProfile === 'tent');
    else if (repair.feature !== 'tower') {
      addPitchedRoof(c, frame, roof, walls, repair.roofRise ?? 3.2, repair.roofProfile === 'tent');
      const towerBase = repair.end === 'ridge' ? base + .55 + (repair.roofRise ?? 3.2) : base;
      addTower(frame, walls, upperStorey, roof, cap, windows, clock, repair, towerBase);
    } else addTower(frame, walls, upperStorey, roof, cap, windows, clock, repair, base);
    if (repair.portalSide === 'north') addNorthPortal(frame, windows, base);
    const additions = [finish(walls, 'church-display-wall', 'wall'), finish(upperStorey, 'church-display-stone', 'wall'), finish(roof, 'church-display-roof', 'roof'), finish(cap, repair.capMaterialName ?? 'church-display-roof', 'roof'), finish(windows, 'church-display-window', 'wall'), finish(clock, 'church-display-clock', 'wall')].filter(b => b.indices.length > 0);
    if (!additions.length) return c;
    const addedVertices = additions.reduce((n, b) => n + b.positions.length / 3, 0);
    const addedTriangles = additions.reduce((n, b) => n + b.indices.length / 3, 0);
    return {
      ...c,
      batches: [...c.batches, ...additions],
      displaySupplement: {id: `nuremberg-row-${repair.row}-church-roof-tower-${repair.row === 21 || repair.row === 45 || repair.roofProfile === 'tent' ? 'v3' : 'v2'}`, sourceObjectId: c.objectId, addedVertices, addedTriangles},
    };
  });
}
