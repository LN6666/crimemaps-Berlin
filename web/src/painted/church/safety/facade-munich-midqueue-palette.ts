import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichMidqueueWallBand = {
  fromNormalizedHeight: number;
  toNormalizedHeight: number;
  color: RGB;
  material: string;
};

export type MunichMidqueueUnsupportedSurface = {
  surface: string;
  reason: string;
  photoColor?: RGB;
};

export type MunichMidqueuePaintProfile = {
  wall?: RGB;
  roof: RGB;
  roofOnly?: boolean;
  wallBands?: readonly MunichMidqueueWallBand[];
  unsupportedSurfaces?: readonly MunichMidqueueUnsupportedSurface[];
};

const exactPartFamilies: Readonly<Record<string, number>> = {
  // Row 73, Himmelfahrtskirche Pasing: extant low church mass only.
  'osm/way/34139602|osm/way/34139602/component/db10fffa4f8ad7802dae': 420,
  // Row 75, Koenigin des Friedens: roof is safe to identify. The photo's
  // gray entrance front and pale side walls are not separable in this part.
  'osm/way/34869985|osm/way/34869985/component/6b03db97495b852beb53': 421,
  // Row 76, St. Raphael: extant church mass only; the missing tower is excluded.
  'osm/way/35667149|osm/way/35667149/component/7c37c8ceeb471f84db32': 422,
  // Row 80, St. Franz-Xaver: height bands retain the brick base instead of
  // averaging brick and white concrete over every wall vertex.
  'osm/way/40222857|osm/way/40222857/component/82189f3521ee7aa3c52b': 423,
};

const paintProfiles: Readonly<Record<number, MunichMidqueuePaintProfile>> = {
  420: {
    wall: [0.86, 0.84, 0.78],
    roof: [0.56, 0.28, 0.18],
  },
  421: {
    roof: [0.56, 0.27, 0.17],
    wall: [0.86, 0.84, 0.76],
    unsupportedSurfaces: [
      {
        surface: 'entrance facade',
        reason: 'Implemented by fragment family373 using the exact entrance-end normal and native local position bounds.',
        photoColor: [0.43, 0.43, 0.40],
      },
      {
        surface: 'side walls',
        reason: 'Implemented as pale plaster outside the exact entrance-end mask; unseen stone wrapping remains unknown.',
        photoColor: [0.86, 0.84, 0.76],
      },
    ],
  },
  422: {
    wall: [0.89, 0.88, 0.83],
    roof: [0.59, 0.28, 0.18],
  },
  423: {
    roof: [0.20, 0.29, 0.25],
    wallBands: [
      {
        fromNormalizedHeight: 0.0,
        toNormalizedHeight: 0.24,
        color: [0.45, 0.22, 0.15],
        material: 'red-brown brick lower band',
      },
      {
        fromNormalizedHeight: 0.24,
        toNormalizedHeight: 1.0,
        color: [0.88, 0.88, 0.84],
        material: 'white concrete upper wall',
      },
    ],
  },
};

export function munichMidqueuePartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return exactPartFamilies[c.objectId + '|' + c.partId];
}

export function munichMidqueuePaintProfile(family: number): MunichMidqueuePaintProfile | undefined {
  return paintProfiles[family];
}

export const MUNICH_MIDQUEUE_FAMILY_RANGE = [420, 429] as const;
