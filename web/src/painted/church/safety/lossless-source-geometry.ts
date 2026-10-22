export type SourceGeometry = { type: string; coordinates?: unknown; geometries?: SourceGeometry[]; [key: string]: unknown } | null;
export type PackedSourceGeometry = null | { type: string; coordinate_layout?: unknown; coordinates_base64?: string; coordinate_type?: 'i32-e7' | 'f64-le'; geometries?: PackedSourceGeometry[]; extra?: Record<string, unknown> };
const TYPES = new Set(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']);
const encodeBytes = (b: Uint8Array) => { let text = ''; for (let i = 0; i < b.length; i += 16384) text += String.fromCharCode(...b.subarray(i, i + 16384)); return btoa(text); };
function payload(v: unknown, cap: number) { if (typeof v !== 'string' || v.length > Math.ceil(cap / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(v)) throw Error('Invalid source geometry payload'); const text = atob(v); if (text.length > cap) throw Error('Source geometry payload exceeds bound'); return Uint8Array.from(text, c => c.charCodeAt(0)); }
/** Preserve exact parsed numeric values, including clipped Float64 points and -0. */
export function packLosslessSourceGeometry(geometry: SourceGeometry, positionCap = 200_000, collectionDepth = 0): PackedSourceGeometry {
  if (!Number.isSafeInteger(collectionDepth) || collectionDepth < 0 || collectionDepth > 8) throw Error('Source collection nesting exceeds bound');
  if (geometry === null) return null;
  if (!geometry || !TYPES.has(geometry.type)) throw Error('Invalid source geometry');
  const extra = Object.fromEntries(Object.entries(geometry).filter(([k]) => !['type', 'coordinates', 'geometries'].includes(k)));
  if (geometry.type === 'GeometryCollection') { if (!Array.isArray(geometry.geometries) || geometry.geometries.length > 20000) throw Error('Invalid source geometry collection'); return { type: geometry.type, geometries: geometry.geometries.map(g => packLosslessSourceGeometry(g, positionCap, collectionDepth + 1)), extra }; }
  const values: number[] = []; let positions = 0;
  const layout = (a: unknown, depth = 0): unknown => { if (!Array.isArray(a) || depth > 6) throw Error('Invalid source coordinate layout'); if (a.length && typeof a[0] === 'number') { if (++positions > positionCap || a.length < 2 || a.length > 16 || !a.every(Number.isFinite) || Math.abs(a[0]) > 180 || Math.abs(a[1]) > 90) throw Error('Invalid source position'); values.push(...a); return a.length; } return a.map(v => layout(v, depth + 1)); };
  const shape = layout(geometry.coordinates), grid = values.every(v => { const q = Math.round(v * 1e7); return !Object.is(v, -0) && Number.isSafeInteger(q) && q >= -2147483648 && q <= 2147483647 && Object.is(q / 1e7, v); });
  const b = new Uint8Array(values.length * (grid ? 4 : 8)), view = new DataView(b.buffer); values.forEach((v, i) => grid ? view.setInt32(i * 4, Math.round(v * 1e7), true) : view.setFloat64(i * 8, v, true));
  return { type: geometry.type, coordinate_layout: shape, coordinate_type: grid ? 'i32-e7' : 'f64-le', coordinates_base64: encodeBytes(b), extra };
}
export function unpackLosslessSourceGeometry(value: PackedSourceGeometry, positionCap = 200_000, onPositions?: (count: number) => void, collectionDepth = 0): SourceGeometry {
  if (!Number.isSafeInteger(collectionDepth) || collectionDepth < 0 || collectionDepth > 8) throw Error('Source collection nesting exceeds bound');
  if (value === null) return null;
  if (!value || !TYPES.has(value.type) || value.extra && (typeof value.extra !== 'object' || Array.isArray(value.extra) || Object.keys(value.extra).some(k => ['type', 'coordinates', 'geometries'].includes(k)))) throw Error('Invalid packed source geometry');
  if (value.type === 'GeometryCollection') { if (!Array.isArray(value.geometries) || value.geometries.length > 20000) throw Error('Invalid packed geometry collection'); return { ...value.extra, type: value.type, geometries: value.geometries.map(g => unpackLosslessSourceGeometry(g, positionCap, onPositions, collectionDepth + 1)) as Exclude<SourceGeometry, null>[] }; }
  if (!['i32-e7', 'f64-le'].includes(value.coordinate_type ?? '')) throw Error('Invalid source coordinate encoding');
  const width = value.coordinate_type === 'i32-e7' ? 4 : 8, b = payload(value.coordinates_base64, positionCap * 16 * width); if (b.length % width) throw Error('Invalid source coordinate bytes'); const view = new DataView(b.buffer); let cursor = 0, positions = 0;
  const restore = (shape: unknown, depth = 0): unknown => { if (depth > 6) throw Error('Invalid packed source layout'); if (typeof shape === 'number') { if (!Number.isSafeInteger(shape) || shape < 2 || shape > 16 || ++positions > positionCap || (cursor + shape) * width > b.length) throw Error('Invalid packed source position'); const p = Array.from({ length: shape }, () => { const i = cursor++; return width === 4 ? view.getInt32(i * width, true) / 1e7 : view.getFloat64(i * width, true); }); if (!p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90) throw Error('Invalid restored source position'); return p; } if (!Array.isArray(shape) || shape.length > positionCap) throw Error('Invalid packed source nesting'); return shape.map(s => restore(s, depth + 1)); };
  const coordinates = restore(value.coordinate_layout); if (cursor * width !== b.length) throw Error('Source coordinate trailing bytes'); onPositions?.(positions); return { ...value.extra, type: value.type, coordinates };
}
