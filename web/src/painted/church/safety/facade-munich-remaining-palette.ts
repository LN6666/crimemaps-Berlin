import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichRemainingMaterialPalette = {
  wall?: RGB;
  roof?: RGB;
  wallOnly?: true;
  onlyRoofFaces?: true;
};

/** Exact target components confirmed by the row-specific white-model receipts. */
export const MUNICH_REMAINING_PART_FAMILIES: Readonly<Record<string, number>> = {
  // Row 91, St. Georg.
  'osm/way/48439982|osm/way/48439982/component/208c2e4bfbc59f88f710': 390,
  // Row 94, St. Achaz.
  'osm/way/49202860|osm/way/49202860/component/106cf91aca17ab7392ad': 391,
  // Row 95, Neuapostolische Kirche.
  'osm/way/50816145|osm/way/50816145/component/3a6a28bb550127d125a2': 392,
  // Row 98, Stephanskirche am Alten Südfriedhof.
  'osm/way/53803415|osm/way/53803415/component/c166d0dd1bd950d34e5f': 393,
  // Row 99, Heilig-Kreuz-Kirche Fröttmaning.
  'osm/way/54226224|osm/way/54226224/component/6b4d021d7e964e4839f4': 394,
  // Row 101, St. Emmeram.
  'osm/way/58696483|osm/way/58696483/component/b1697cb340b909b2dadf': 395,
  // Row 104, Johanneskirche.
  'osm/way/66599464|osm/way/66599464/component/8c6ecdc1ea7674c02ace': 396,
  // Row 105, St. Willibald.
  'osm/way/76406788|osm/way/76406788/component/63bb3c84ab5ca058f55a': 397,
  // Row 109, Echardinger-Altöttinger-Großmayer-Kapelle.
  'osm/way/87252269|osm/way/87252269/component/bf505205907ddd361eb1': 398,
  // Row 113, St. Franziskus.
  'osm/way/94790072|osm/way/94790072/component/411c240c0b075421c892': 399,
  // Row 115, St. Barbara.
  'osm/way/97455678|osm/way/97455678/component/d01a58436e06e8e52696': 400,
  // Row 117, St. Nikolaus.
  'osm/way/98365637|osm/way/98365637/component/5cc2c164ac35aadb9c4b': 401,
  // Row 118, St. Lantpert.
  'osm/way/99525116|osm/way/99525116/component/f2c4c8d43afc4c6e1e9e': 402,
  // Row 116, Offenbarungskirche: Commons supports brick walls; the official
  // parish daylight view supports the pale patinated-copper nave roof.
  'osm/way/97702128|osm/way/97702128/component/8556b494b29f1fd175db': 403,
  // Row 111, former Karmeliterkirche: OSM supplies only roof:colour=#C07070.
  'osm/way/91010431|osm/way/91010431/component/a27878230aa7ae718978': 404,
};

export const MUNICH_REMAINING_MATERIAL_PALETTES: Readonly<
  Record<number, MunichRemainingMaterialPalette>
> = {
  390: {wall: [0.9, 0.9, 0.87], roof: [0.75, 0.28, 0.13]},
  391: {wall: [0.88, 0.84, 0.74], roof: [0.18, 0.19, 0.19]},
  392: {wall: [0.85, 0.84, 0.78], roof: [0.18, 0.2, 0.21]},
  393: {wall: [0.86, 0.8, 0.68], roof: [0.31, 0.53, 0.46]},
  394: {wall: [0.9, 0.89, 0.84], roof: [0.18, 0.19, 0.19]},
  395: {wall: [0.88, 0.85, 0.77], roof: [0.62, 0.28, 0.16]},
  396: {wall: [0.92, 0.91, 0.87], roof: [0.78, 0.3, 0.12]},
  397: {wall: [0.84, 0.84, 0.81], roof: [0.26, 0.24, 0.22]},
  398: {wall: [0.91, 0.89, 0.84], roof: [0.75, 0.31, 0.15]},
  399: {wall: [0.86, 0.86, 0.83], roof: [0.76, 0.29, 0.13]},
  400: {wall: [0.89, 0.79, 0.54], roof: [0.55, 0.28, 0.17]},
  401: {wall: [0.84, 0.82, 0.75], roof: [0.6, 0.29, 0.16]},
  402: {wall: [0.9, 0.9, 0.86], roof: [0.59, 0.29, 0.17]},
  403: {wall: [0.42, 0.23, 0.18], roof: [0.48, 0.68, 0.63]},
  404: {roof: [0.753, 0.439, 0.439], onlyRoofFaces: true},
};

export function munichRemainingPartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return MUNICH_REMAINING_PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function munichRemainingMaterialPalette(
  family: number,
): MunichRemainingMaterialPalette | undefined {
  return MUNICH_REMAINING_MATERIAL_PALETTES[family];
}
