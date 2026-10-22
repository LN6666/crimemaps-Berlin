import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichNazarethWallBand = {
  minHeightFraction: number;
  maxHeightFraction: number;
  color: RGB;
  role: 'recessed-base' | 'stone-body' | 'dark-fascia' | 'upper-screen';
};

export type MunichNazarethMaterialPalette = {
  wallBands: readonly MunichNazarethWallBand[];
  roof: RGB;
  roofFacesOnly: true;
  frontWall: {
    /** Source-polygon edge C -> D, the photographed entrance elevation. */
    sourceEdge: readonly [readonly [number, number], readonly [number, number]];
    /** Exact outward X/Z normal produced by flatMesh after millimetre rounding. */
    outwardNormalXZ: readonly [number, number];
    normalDotMinimum: number;
  };
};

export const MUNICH_NAZARETH_FAMILY = 440;

/** Row 112: the named church component only; the detached campanile is unlinked. */
export const MUNICH_NAZARETH_PART_FAMILIES: Readonly<Record<string, number>> = {
  'osm/way/94619078|osm/way/94619078/component/70ff318ef5912ff47d93': MUNICH_NAZARETH_FAMILY,
};

/**
 * Height bands follow the inspected front elevation: a recessed lower zone,
 * gray-brown masonry body, thin dark fascia, then pale triangular screens.
 * The patinated green is restricted to triangles classified as real roofs.
 */
export const MUNICH_NAZARETH_MATERIAL_PALETTES: Readonly<
  Record<number, MunichNazarethMaterialPalette>
> = {
  [MUNICH_NAZARETH_FAMILY]: {
    wallBands: [
      {
        minHeightFraction: 0,
        maxHeightFraction: 0.18,
        color: [0.35, 0.36, 0.34],
        role: 'recessed-base',
      },
      {
        minHeightFraction: 0.18,
        maxHeightFraction: 0.76,
        color: [0.49, 0.46, 0.39],
        role: 'stone-body',
      },
      {
        minHeightFraction: 0.76,
        maxHeightFraction: 0.82,
        color: [0.18, 0.2, 0.19],
        role: 'dark-fascia',
      },
      {
        minHeightFraction: 0.82,
        maxHeightFraction: 1,
        color: [0.8, 0.79, 0.72],
        role: 'upper-screen',
      },
    ],
    roof: [0.44, 0.64, 0.57],
    roofFacesOnly: true,
    frontWall: {
      sourceEdge: [
        [11.6181917, 48.1403555],
        [11.6179092, 48.1404243],
      ],
      outwardNormalXZ: [-0.3428534484381286, -0.9393889039658088],
      normalDotMinimum: 0.999,
    },
  },
};

export function munichNazarethPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return MUNICH_NAZARETH_PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function munichNazarethMaterialPalette(
  family: number,
): MunichNazarethMaterialPalette | undefined {
  return MUNICH_NAZARETH_MATERIAL_PALETTES[family];
}

/**
 * Resolve a row-112 wall colour only for the photographed entrance elevation.
 * The flat-mesh codec duplicates vertices per footprint edge, so its exact
 * outward normal isolates this wall without leaking the bands onto the other
 * three elevations. Roof vertices are rejected by their non-horizontal normal.
 */
export function munichNazarethFrontWallColor(
  family: number,
  nx: number,
  ny: number,
  nz: number,
  heightFraction: number,
): RGB | undefined {
  const palette = munichNazarethMaterialPalette(family);
  if (!palette || ![nx, ny, nz, heightFraction].every(Number.isFinite)) return undefined;
  if (Math.abs(ny) > 0.01 || heightFraction < 0 || heightFraction > 1) return undefined;
  const [frontX, frontZ] = palette.frontWall.outwardNormalXZ;
  if (nx * frontX + nz * frontZ < palette.frontWall.normalDotMinimum) return undefined;
  return palette.wallBands.find(
    (band) =>
      heightFraction >= band.minHeightFraction &&
      (heightFraction < band.maxHeightFraction || band.maxHeightFraction === 1),
  )?.color;
}
