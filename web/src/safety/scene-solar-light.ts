/** Approximate, display-only solar direction. NOAA fractional-year equations.
 * No weather, atmospheric refraction, terrain or measured irradiance is implied.
 * Local mesh axes are x east, y up, z north. The instant must carry an offset.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF */
export type SceneSolarLight = {
  instantISO: string;
  longitude: number;
  latitude: number;
  azimuthDegrees: number;
  altitudeDegrees: number;
  direction: readonly [number, number, number];
  daylight: number;
  /** Ground displacement east/north per metre of mesh height. */
  shadowVector?: readonly [number, number];
  method: 'NOAA-fractional-year-display';
};
export const SCENE_REFERENCE_INSTANT = '2026-06-21T13:00:00Z';
/** Geometric solar centre; refraction/terrain are intentionally not modelled.
 * At 0.5 degrees a shadow is already 114.6 times the object's height. Below this
 * threshold there is no finite local display projection; never use a fixed one.
 * Above it use the unshortened physical projection and the verified city gate. */
export const SCENE_SHADOW_MIN_ALTITUDE_DEGREES = .5;
const RAD = Math.PI / 180;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function sceneSolarLight(longitude: number, latitude: number, instantISO = SCENE_REFERENCE_INSTANT): SceneSolarLight {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 85 ||
      typeof instantISO !== 'string' || !/(?:Z|[+-]\d\d:\d\d)$/.test(instantISO)) throw Error('Invalid scene sunlight location or timezone');
  const instant = new Date(instantISO), ms = instant.getTime();
  if (!Number.isFinite(ms)) throw Error('Invalid scene sunlight instant');
  const year = instant.getUTCFullYear();
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  const day = Math.floor((ms - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const hours = instant.getUTCHours() + instant.getUTCMinutes() / 60 + instant.getUTCSeconds() / 3600;
  const gamma = 2 * Math.PI / days * (day - 1 + (hours - 12) / 24);
  const equationMinutes = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const solarMinutes = ((hours * 60 + equationMinutes + 4 * longitude) % 1440 + 1440) % 1440;
  const hourAngle = (solarMinutes / 4 - 180) * RAD, lat = latitude * RAD;
  const east = -Math.cos(declination) * Math.sin(hourAngle);
  const north = Math.cos(lat) * Math.sin(declination) - Math.sin(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const up = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const length = Math.hypot(east, up, north);
  const direction: [number, number, number] = [east / length, up / length, north / length];
  const altitudeDegrees = Math.asin(clamp(direction[1], -1, 1)) / RAD;
  const azimuthDegrees = (Math.atan2(east, north) / RAD + 360) % 360;
  const shadowVector: [number, number] | undefined = altitudeDegrees > SCENE_SHADOW_MIN_ALTITUDE_DEGREES ? [-direction[0] / direction[1], -direction[2] / direction[1]] : undefined;
  return {instantISO: instant.toISOString(), longitude, latitude, azimuthDegrees, altitudeDegrees, direction,
    daylight: clamp((altitudeDegrees + 4) / 16, 0, 1), shadowVector, method: 'NOAA-fractional-year-display'};
}

/** Local Mercator mesh projection envelope, including the whole growth interval.
 * This computes evidence only. A caller must cover this envelope with the current
 * hash-checked municipal polygon before admitting a new solar shadow direction. */
export function solarShadowSweptBBox(origin: readonly [number, number], batches: readonly {positions: ArrayLike<number>}[], light: SceneSolarLight): [number, number, number, number] | undefined {
  if (!light.shadowVector) return;
  if (!origin.every(Number.isFinite) || Math.abs(origin[0]) > 180 || Math.abs(origin[1]) > 85) throw Error('Invalid solar shadow origin');
  const scale = 6378137 * Math.cos(origin[1] * RAD), originY = Math.log(Math.tan(Math.PI / 4 + origin[1] * RAD / 2));
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity, count = 0;
  for (const batch of batches) {
    if (batch.positions.length % 3) throw Error('Invalid solar shadow mesh');
    for (let i = 0; i < batch.positions.length; i += 3) {
      const x = batch.positions[i], y = batch.positions[i + 1], z = batch.positions[i + 2];
      if (![x, y, z].every(Number.isFinite) || y < 0 || ++count > 200000) throw Error('Solar shadow mesh budget or height');
      for (const growth of [0, 1]) {
        const lng = origin[0] + (x + light.shadowVector[0] * y * growth) / scale / RAD;
        const lat = (2 * Math.atan(Math.exp(originY + (z + light.shadowVector[1] * y * growth) / scale)) - Math.PI / 2) / RAD;
        west = Math.min(west, lng); east = Math.max(east, lng); south = Math.min(south, lat); north = Math.max(north, lat);
      }
    }
  }
  if (!count || west < -180 || east > 180 || south < -85 || north > 85) throw Error('Invalid solar shadow bounds');
  return [west, south, east, north];
}
