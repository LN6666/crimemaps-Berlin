import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

type QueueMaterialPalette = {
  wall: RGB;
  roof: RGB;
  roofOnly?: boolean;
};

const partFamilies: Readonly<Record<string, number>> = {
  // Row 55, Lätare-Kirche: exact live-selected native component only.
  'osm/way/27685666|osm/way/27685666/component/2467c2abf846721acb3b': 368,
};

const materialPalettes: Readonly<Record<number, QueueMaterialPalette>> = {
  // Photo-supported warm brown brick body and dark metal flat roof/parapet.
  368: {wall: [0.48, 0.32, 0.23], roof: [0.16, 0.18, 0.19]},
};

export function munichQueuePartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return partFamilies[c.objectId + '|' + c.partId];
}

export function munichQueueMaterialPalette(family: number): QueueMaterialPalette | undefined {
  return materialPalettes[family];
}
