import type {EnvironmentBox} from './environment-scene-data';

export type EnvironmentTreeKind = 'native' | 'row' | 'wood';
/** Candidates have already passed their source, municipality, hole and overlap
 * checks. IDs are unique display identities (row IDs include their sample). */
export type EnvironmentTreeCandidate = {id: string; kind: EnvironmentTreeKind; lon: number; lat: number};
const kinds: readonly EnvironmentTreeKind[] = ['native', 'row', 'wood'];
const radius = 6378137, radians = Math.PI / 180;
const world = (lon: number, lat: number) => [radius * lon * radians, radius * Math.log(Math.tan(Math.PI / 4 + lat * radians / 2))] as const;
const hash = (id: string) => {let value = 2166136261; for (let i = 0; i < id.length; i++) value = Math.imul(value ^ id.charCodeAt(i), 16777619); return value >>> 0;};
const textOrder = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
type Ranked<T> = {candidate: T; rank: number};
type Bucket<T> = {key: string; x: number; y: number; tier: number; distance: number; items: Ranked<T>[]; heapIndex: number};

/** Transient, bounded spatial selection. It never creates geometry or a cache.
 * Each kind keeps at most capacity original references in spatial reservoirs;
 * the final shared budget remains capacity, not three times capacity. */
export function selectEnvironmentTrees<T extends EnvironmentTreeCandidate>(candidates: Iterable<T>, ground: EnvironmentBox, capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 2048) throw Error('Invalid environment tree capacity');
  if (ground.length !== 4 || !ground.every(Number.isFinite) || ground[0] > ground[2] || ground[1] > ground[3] || ground[0] < -180 || ground[2] > 180 || ground[1] < -85 || ground[3] > 85) throw Error('Invalid environment ground bounds');
  const low = world(ground[0], ground[1]), high = world(ground[2], ground[3]);
  const centre = [(low[0] + high[0]) / 2, (low[1] + high[1]) / 2];
  // A world-aligned rectangle crossing both axes occupies at least four cells
  // at any finite cell size, even when the requested instance capacity is one.
  const targetCells = Math.max(4, Math.min(128, capacity));
  let cellSizeMetres = 16;
  const cellCount = () => (Math.floor(high[0] / cellSizeMetres) - Math.floor(low[0] / cellSizeMetres) + 1) * (Math.floor(high[1] / cellSizeMetres) - Math.floor(low[1] / cellSizeMetres) + 1);
  while (cellCount() > targetCells) cellSizeMetres *= 2;
  const eligibleByKind = {native: 0, row: 0, wood: 0}, selectedByKind = {native: 0, row: 0, wood: 0};
  let examined = 0, invalid = 0, groundCandidates = 0, overscanCandidates = 0, peakRetainedCandidates = 0, retained = 0;
  const states = kinds.map(() => ({buckets: new Map<string, Bucket<T>>(), heap: [] as Bucket<T>[], count: 0}));
  // Larger buckets surrender their worst ID first. Equal-size cells surrender
  // from farther cells first, independently of tile/arrival order. Ground wins
  // over overscan. The indexed heap bounds an insertion to log(resident cells).
  const worse = (a: Bucket<T>, b: Bucket<T>) => a.tier - b.tier || a.items.length - b.items.length || a.distance - b.distance || a.y - b.y || a.x - b.x;
  const itemOrder = (a: Ranked<T>, b: Ranked<T>) => a.rank - b.rank || textOrder(a.candidate.id, b.candidate.id) || a.candidate.lon - b.candidate.lon || a.candidate.lat - b.candidate.lat;
  const fix = (heap: Bucket<T>[], bucket: Bucket<T>) => {
    const swap = (a: number, b: number) => {const t = heap[a]; heap[a] = heap[b]; heap[b] = t; heap[a].heapIndex = a; heap[b].heapIndex = b;};
    let i = bucket.heapIndex;
    while (i > 0) {const parent = (i - 1) >> 1; if (worse(heap[i], heap[parent]) <= 0) break; swap(i, parent); i = parent;}
    for (;;) {let next = i, left = i * 2 + 1, right = left + 1; if (left < heap.length && worse(heap[left], heap[next]) > 0) next = left; if (right < heap.length && worse(heap[right], heap[next]) > 0) next = right; if (next === i) break; swap(i, next); i = next;}
  };
  if (capacity) for (const candidate of candidates) {
    examined++;
    const kind = kinds.indexOf(candidate.kind);
    if (kind < 0 || typeof candidate.id !== 'string' || !candidate.id || !Number.isFinite(candidate.lon) || !Number.isFinite(candidate.lat) || Math.abs(candidate.lon) > 180 || Math.abs(candidate.lat) > 85) {invalid++; continue;}
    eligibleByKind[candidate.kind]++;
    const tier = candidate.lon >= ground[0] && candidate.lon <= ground[2] && candidate.lat >= ground[1] && candidate.lat <= ground[3] ? 0 : 1;
    if (tier) overscanCandidates++; else groundCandidates++;
    const point = world(candidate.lon, candidate.lat), x = Math.floor(point[0] / cellSizeMetres), y = Math.floor(point[1] / cellSizeMetres), key = `${tier}:${x}:${y}`, state = states[kind];
    let bucket = state.buckets.get(key);
    if (!bucket) {
      const dx = (x + .5) * cellSizeMetres - centre[0], dy = (y + .5) * cellSizeMetres - centre[1];
      bucket = {key, x, y, tier, distance: dx * dx + dy * dy, items: [], heapIndex: -1};
    }
    const item = {candidate, rank: hash(candidate.id)};
    let a = 0, b = bucket.items.length;
    while (a < b) {const m = (a + b) >>> 1; if (itemOrder(bucket.items[m], item) < 0) a = m + 1; else b = m;}
    // Exact repeated display identity is harmless. Callers supply unique source
    // identities; eligible/omitted counts describe input candidates, not sources.
    if (a < bucket.items.length && itemOrder(bucket.items[a], item) === 0) continue;
    bucket.items.splice(a, 0, item); state.count++; retained++;
    if (bucket.heapIndex < 0) {state.buckets.set(key, bucket); bucket.heapIndex = state.heap.length; state.heap.push(bucket);}
    fix(state.heap, bucket);
    if (state.count > capacity) {
      const victim = state.heap[0]; victim.items.pop(); state.count--; retained--;
      if (!victim.items.length) {
        state.buckets.delete(victim.key);
        const last = state.heap.pop()!;
        if (state.heap.length) {state.heap[0] = last; last.heapIndex = 0; fix(state.heap, last);}
      } else fix(state.heap, victim);
    }
    peakRetainedCandidates = Math.max(peakRetainedCandidates, retained);
  }
  const cells = new Map<string, {x: number; y: number; tier: number; distance: number; queues: Ranked<T>[][]; positions: number[]; nextKind: number}>();
  for (let kind = 0; kind < states.length; kind++) for (const bucket of states[kind].buckets.values()) {
    let cell = cells.get(bucket.key);
    if (!cell) {cell = {x: bucket.x, y: bucket.y, tier: bucket.tier, distance: bucket.distance, queues: [[], [], []], positions: [0, 0, 0], nextKind: 0}; cells.set(bucket.key, cell);}
    cell.queues[kind] = bucket.items;
  }
  const ordered = [...cells.values()].sort((a, b) => a.tier - b.tier || a.distance - b.distance || a.y - b.y || a.x - b.x), selected: T[] = [];
  let groundSelected = 0;
  for (const tier of [0, 1]) {
    const active = ordered.filter(cell => cell.tier === tier);
    let progress = true;
    while (selected.length < capacity && progress) {
      progress = false;
      for (const cell of active) {
        if (selected.length >= capacity) break;
        for (let turn = 0; turn < kinds.length; turn++) {
          const kind = (cell.nextKind + turn) % kinds.length, queue = cell.queues[kind], position = cell.positions[kind];
          if (position >= queue.length) continue;
          const candidate = queue[position].candidate; cell.positions[kind]++; cell.nextKind = (kind + 1) % kinds.length;
          selected.push(candidate); selectedByKind[candidate.kind]++; if (!tier) groundSelected++; progress = true; break;
        }
      }
    }
  }
  return {selected, examined, invalid, eligible: examined - invalid, omitted: examined - invalid - selected.length,
    eligibleByKind, selectedByKind, omittedByKind: {native: eligibleByKind.native - selectedByKind.native, row: eligibleByKind.row - selectedByKind.row, wood: eligibleByKind.wood - selectedByKind.wood},
    groundCandidates, overscanCandidates, groundSelected, overscanSelected: selected.length - groundSelected, cellSizeMetres, occupiedRetainedCells: cells.size,
    peakRetainedCandidates, retainedCandidateLimit: capacity * kinds.length, retainedCandidates: retained};
}
