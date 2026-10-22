import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichKapernaumWallBand = {
  minNormalizedHeight: number;
  maxNormalizedHeight: number;
  color: RGB;
  material: 'blue-gray-glazing' | 'light-gray-concrete-fascia';
};

export type MunichKapernaumSupportedWallFaces = {
  axis: 'local-z';
  minAbsoluteNormal: number;
  bands: readonly MunichKapernaumWallBand[];
};

export type MunichKapernaumMaterialPalette = {
  roof: RGB;
  onlyRoofFaces: true;
  /** The two photographed opposite long facades; short end walls stay native. */
  supportedWallFaces: MunichKapernaumSupportedWallFaces;
};

export const MUNICH_KAPERNAUM_FAMILY = 441;

/** The named building=church way; neighboring campus blocks remain excluded. */
export const MUNICH_KAPERNAUM_PART_FAMILIES: Readonly<Record<string, number>> = {
  'osm/way/46713761|osm/way/46713761/component/e5658ade08a3afdb4f24': MUNICH_KAPERNAUM_FAMILY,
};

/**
 * Both opposite long facades are photographed. They support a blue-gray glazed
 * base below a light concrete fascia. The short end walls remain unverified.
 */
export const MUNICH_KAPERNAUM_MATERIAL_PALETTES: Readonly<
  Record<number, MunichKapernaumMaterialPalette>
> = {
  [MUNICH_KAPERNAUM_FAMILY]: {
    roof: [0.25, 0.48, 0.42],
    onlyRoofFaces: true,
    supportedWallFaces: {
      axis: 'local-z',
      minAbsoluteNormal: 0.9,
      bands: [
        {
          minNormalizedHeight: 0,
          maxNormalizedHeight: 0.68,
          color: [0.22, 0.35, 0.4],
          material: 'blue-gray-glazing',
        },
        {
          minNormalizedHeight: 0.68,
          maxNormalizedHeight: 1,
          color: [0.7, 0.69, 0.64],
          material: 'light-gray-concrete-fascia',
        },
      ],
    },
  },
};

export function munichKapernaumPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return MUNICH_KAPERNAUM_PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function munichKapernaumMaterialPalette(
  family: number,
): MunichKapernaumMaterialPalette | undefined {
  return MUNICH_KAPERNAUM_MATERIAL_PALETTES[family];
}

/** Resolve only photographed long-wall fragments; short end walls return undefined. */
export function munichKapernaumWallColorAt(
  family: number,
  normalZ: number,
  normalizedHeight: number,
): RGB | undefined {
  const faces = MUNICH_KAPERNAUM_MATERIAL_PALETTES[family]?.supportedWallFaces;
  if (
    !faces ||
    !Number.isFinite(normalZ) ||
    !Number.isFinite(normalizedHeight) ||
    Math.abs(normalZ) < faces.minAbsoluteNormal ||
    normalizedHeight < 0 ||
    normalizedHeight > 1
  ) return undefined;
  return faces.bands.find(
    (band, index) =>
      normalizedHeight >= band.minNormalizedHeight &&
      (normalizedHeight < band.maxNormalizedHeight ||
        (index === faces.bands.length - 1 && normalizedHeight === band.maxNormalizedHeight)),
  )?.color;
}
