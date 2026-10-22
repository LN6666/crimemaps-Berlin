import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];

export type MunichMissingReferenceMaterialPalette = {
  wall?: RGB;
  roof?: RGB;
  wallOnly?: true;
  roofOnly?: boolean;
};

/** Exact target components backed by newly collected exterior photographs. */
export const MUNICH_MISSING_REFERENCE_PART_FAMILIES: Readonly<Record<string, number>> = {
  // Row 92, St. Johannes, Preysingstrasse 17. The lookup contains one target
  // component and no explicit group links; do not admit neighbouring objects.
  'osm/way/48441761|osm/way/48441761/component/e6c510694a82e94964f1': 430,
  // Row 93, Allerheiligenkirche am Kreuz. The exact lookup likewise contains
  // one component and no reliable independently bound tower part.
  'osm/way/48605346|osm/way/48605346/component/68beb3dd73ef96f2f27f': 431,
  // Row 97, Herzogspitalkirche. The photographed Baroque courtyard tower is
  // not an independently bound part of this exact target. Satellite imagery
  // independently verifies red tile on the exact main-way roof footprint.
  'osm/way/53157733|osm/way/53157733/component/203768bac3792933e50e': 432,
  // Row 102, Magdalenenklause. The exact target is a single component with no
  // reliable face partition for its differently covered roof volumes.
  'osm/way/58723509|osm/way/58723509/component/448d1fc69e4251077297': 433,
  // Row 107, Damenstiftskirche St. Anna. The photograph supports a pale
  // stucco base across the principal wall fields and a muted red hipped roof.
  'osm/way/83892492|osm/way/83892492/component/ee8285f66f720c9b9322': 434,
  // Row 110, Salvatorkirche main church component. Its separately tagged,
  // contained bell-tower part is bound below as family 438.
  'osm/way/88438056|osm/way/88438056/component/23f47d2e5c69457d854c': 435,
  // Row 111, former Karmeliterkirche. This photo-backed family supersedes the
  // roof-only family 404 for the same exact part when integrated first.
  'osm/way/91010431|osm/way/91010431/component/a27878230aa7ae718978': 436,
  // Row 94, St. Achaz bell tower. Its native footprint is contained in the
  // church outline and shares five consecutive outline vertices. OSM tags the
  // separate way as building:part=yes, man_made=tower, bell_tower.
  'osm/way/1366637511|osm/way/1366637511/component/b97ae1ba9649c552c03c': 437,
  // Row 110, Salvatorkirche bell tower. Its native footprint is contained in
  // the church outline and shares the outline edge from 11.5749173,48.1417323
  // to 11.5750053,48.1417116. OSM explicitly tags building:part=tower.
  'osm/way/497514970|osm/way/497514970/component/f141f9cbb95441dbbb1f': 438,
  // Row 75, Koenigin des Friedens bell tower. The separately tagged tower is
  // contained in the target outline and shares three exact outline edges.
  'osm/way/1012786188|osm/way/1012786188/component/f45f28fbc0bae1d88bd5': 450,
  // Row 76, St. Raphael bell tower. The separately tagged tower adjoins the
  // target at two exact outline edges and is verified by the exterior photo.
  'osm/way/521630668|osm/way/521630668/component/73363cc2ac07fea216c0': 451,
  // Row 91, St. Georg bell tower. The separately tagged tower is contained in
  // the target outline and shares one exact outline edge.
  'osm/way/126855128|osm/way/126855128/component/b9547dd286f19e267753': 452,
};

export const MUNICH_MISSING_REFERENCE_MATERIAL_PALETTES: Readonly<
  Record<number, MunichMissingReferenceMaterialPalette>
> = {
  // The inspected exterior shows weathered, desaturated brown-red brick walls
  // and red clay tiles. A green metal spire is visible, but the exact target's
  // native mesh is one low component with no separately bound tower surface.
  430: {wall: [0.48, 0.37, 0.33], roof: [0.56, 0.27, 0.18]},
  // The inspected Kreuzkirche exterior shows brown-red exposed brick and a
  // red clay main roof. Its green copper spire is not assigned because the
  // exact native target has no separate, reliable tower component.
  431: {wall: [0.50, 0.30, 0.24], roof: [0.68, 0.27, 0.13]},
  // The modern church volume is red exposed brick. Google Maps satellite at
  // the exact component centroid shows red clay tile across the target's long
  // main roof. Exclude the green copper historic-tower cap to its south-west
  // and the grey-green metal roof on the separate south/left neighbour.
  432: {wall: [0.50, 0.25, 0.17], roof: [0.60, 0.29, 0.22]},
  // The artificial-ruin facade is predominantly worn pale grey-beige plaster
  // interspersed with exposed red brick. A uniform brick treatment would be
  // false. Fragment family372 preserves the source-supported material split between
  // the dark main roof and the exact southern red-tile circular roof zone.
  433: {wall: [0.70, 0.66, 0.56], roof: [0.23, 0.22, 0.21]},
  // The inspected front and left return show pale warm stucco as the wall
  // field and a muted rose-red tile roof. This intentionally omits the
  // grey-beige orders, reddish stone portal, brown door and gilded details;
  // those features have no independently addressable native mesh surfaces.
  434: {wall: [0.88, 0.87, 0.84], roof: [0.58, 0.33, 0.27]},
  // The supported main volume is brown-red exposed brick under red clay tile;
  // the tower's grey-green metal cap is isolated in family 438.
  435: {wall: [0.48, 0.29, 0.23], roof: [0.64, 0.27, 0.15]},
  // The low-angle exterior still exposes the principal cream plaster fields
  // and the full red-clay main roof. Use the field colour, not an average with
  // white trim; the green metal tower cap has no independent bound surface.
  436: {wall: [0.84, 0.78, 0.64], roof: [0.68, 0.27, 0.14]},
  // The inspected St. Achaz exterior shows the bell tower in the same pale
  // cream stucco as the church, capped by a very dark slate/metal onion dome.
  437: {wall: [0.88, 0.84, 0.74], roof: [0.18, 0.19, 0.19]},
  // The inspected Salvatorkirche exterior shows red exposed brick on the
  // tower shaft and a separate weathered grey-green metal spire.
  438: {wall: [0.48, 0.29, 0.23], roof: [0.42, 0.48, 0.46]},
  // The inspected Koenigin des Friedens exterior shows grey Nagelfluh on the
  // bell tower and a red clay-tile pyramidal cap.
  450: {wall: [0.43, 0.43, 0.40], roof: [0.56, 0.27, 0.17]},
  // The inspected St. Raphael exterior shows a white plaster bell tower with
  // dark louvres and a shallow dark-grey cap.
  451: {wall: [0.89, 0.88, 0.83], roof: [0.22, 0.23, 0.23]},
  // The inspected St. Georg exterior and OSM roof:colour=#6EBE9F support a
  // white tower shaft and a green patinated-copper onion dome.
  452: {wall: [0.90, 0.90, 0.87], roof: [0.431, 0.745, 0.624]},
};

export function munichMissingReferencePartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'munich') return undefined;
  return MUNICH_MISSING_REFERENCE_PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function munichMissingReferenceMaterialPalette(
  family: number,
): MunichMissingReferenceMaterialPalette | undefined {
  return MUNICH_MISSING_REFERENCE_MATERIAL_PALETTES[family];
}
