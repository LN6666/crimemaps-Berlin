import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichPriorMaterialPalette = {
  wall: RGB;
  roof: RGB;
  roofOnly?: boolean;
};

const partFamilies: Readonly<Record<string, number>> = {
  // Row 72, St. Johann Baptist (Haidhausen). The second church way shares
  // boundary vertices with the main outline; the layer-1 way is the labelled
  // bell tower inside the same footprint.
  'osm/way/33418524|osm/way/33418524/component/aab3ab3b6c968a7aad70': 380,
  'osm/way/122304302|osm/way/122304302/component/f2a3fda4b435853e0858': 380,
  'osm/way/122304532|osm/way/122304532/component/872b1c63d25c14c74631': 381,

  // Row 100, St. Jakob am Anger. Keep the adjoining convent and school out.
  'osm/way/55802676|osm/way/55802676/component/5fc97fcad99102b2e9bb': 382,
};

const materialPalettes: Readonly<Record<number, MunichPriorMaterialPalette>> = {
  // Photo and city descriptions establish red-brown brick with a subdued dark
  // nave roof. The native mesh is a low flat extrusion, so this changes only
  // represented surfaces and does not claim the missing 91 m tower geometry.
  380: {wall: [0.49, 0.27, 0.21], roof: [0.20, 0.21, 0.22]},
  // The exact native tower part is also a low flat extrusion; its top receives
  // the photo-supported green metal cue while the shaft remains brick.
  381: {wall: [0.49, 0.27, 0.21], roof: [0.31, 0.53, 0.46]},
  // The inspected St. Jakob image supports exposed red-brown brick and a dark,
  // shallow roof edge. No neighbouring monastery volume is admitted.
  382: {wall: [0.49, 0.27, 0.21], roof: [0.20, 0.21, 0.22]},
};

export function munichPriorPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return partFamilies[c.objectId + '|' + c.partId];
}

export function munichPriorMaterialPalette(family: number): MunichPriorMaterialPalette | undefined {
  return materialPalettes[family];
}
