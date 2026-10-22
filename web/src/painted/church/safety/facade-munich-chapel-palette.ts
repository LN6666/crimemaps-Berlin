import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichChapelPalette = {
  wall: RGB;
  roof: RGB;
};

const exactPartFamilies: Readonly<Record<string, number>> = {
  // Row 88: bind the extant chapel body only. The photographed tower is absent
  // from this component, so no tower or spire material is assigned.
  'osm/way/44888007|osm/way/44888007/component/1a423a369d2f73215647': 370,
};

const materialPalettes: Readonly<Record<number, MunichChapelPalette>> = {
  // Commons photo: white plaster body and red-brown terracotta gabled roof.
  370: {wall: [0.88, 0.87, 0.82], roof: [0.58, 0.29, 0.18]},
};

export function munichChapelPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return exactPartFamilies[c.objectId + '|' + c.partId];
}

export function munichChapelMaterialPalette(family: number): MunichChapelPalette | undefined {
  return materialPalettes[family];
}

export const MUNICH_CHAPEL_MISSING_GEOMETRY: Readonly<Record<number, readonly string[]>> = {
  370: ['attached square bell tower', 'dark gray-green pyramidal tower spire'],
};
