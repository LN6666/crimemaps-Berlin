import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichCarolinenRoofZone = {
  role: 'north-main-membrane' | 'west-and-south-weathered-wing';
  color: RGB;
  minLocalX?: number;
  minLocalZ?: number;
};

export type MunichCarolinenMaterialPalette = {
  wall: RGB;
  wallOnly?: true;
  /**
   * Satellite-supported roof zones, retained separately until the paint-frame
   * evaluates them per fragment. Whole-triangle assignment would cross the
   * concave footprint boundary and bleed one roof material into the other.
   */
  roofZones: readonly MunichCarolinenRoofZone[];
  roofZonesRequireFragmentPosition: true;
};

export const MUNICH_CAROLINEN_FAMILY = 369;

/**
 * Bind only the named church footprint. The adjacent way 37703631 appears in
 * the same receipt, but no OSM relation or local evidence identifies it as a
 * physical Carolinenkirche part.
 */
export const MUNICH_CAROLINEN_PART_FAMILIES: Readonly<Record<string, number>> = {
  'osm/way/37703630|osm/way/37703630/component/697885e4f61bc6826de0': MUNICH_CAROLINEN_FAMILY,
};

/**
 * Photo-supported weathered light-gray exposed concrete. Google Maps satellite
 * inspection (2026-10-17, north-up at the 10 m scale) resolves two roof zones.
 * The thresholds are the native footprint's concave corners, rather than an
 * estimated visual split. The shared paint-frame carries local X/Z to fragment family374, which
 * evaluates the material split without changing the native roof triangles.
 */
export const MUNICH_CAROLINEN_MATERIAL_PALETTES: Readonly<
  Record<number, MunichCarolinenMaterialPalette>
> = {
  [MUNICH_CAROLINEN_FAMILY]: {
    wall: [0.62, 0.62, 0.59],
    roofZones: [
      {
        role: 'north-main-membrane',
        color: [0.54, 0.54, 0.52],
        minLocalX: -12.567218,
        minLocalZ: 4.11884,
      },
      {
        role: 'west-and-south-weathered-wing',
        color: [0.45, 0.4, 0.34],
      },
    ],
    roofZonesRequireFragmentPosition: true,
  },
};

export function munichCarolinenPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return MUNICH_CAROLINEN_PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function munichCarolinenMaterialPalette(
  family: number,
): MunichCarolinenMaterialPalette | undefined {
  return MUNICH_CAROLINEN_MATERIAL_PALETTES[family];
}

/** Resolve a true roof fragment in component-local meters. */
export function munichCarolinenRoofColorAt(
  family: number,
  localX: number,
  localZ: number,
): RGB | undefined {
  const palette = MUNICH_CAROLINEN_MATERIAL_PALETTES[family];
  if (!palette || !Number.isFinite(localX) || !Number.isFinite(localZ)) return undefined;
  const main = palette.roofZones[0];
  return localX >= main.minLocalX! && localZ >= main.minLocalZ!
    ? main.color
    : palette.roofZones[1].color;
}
