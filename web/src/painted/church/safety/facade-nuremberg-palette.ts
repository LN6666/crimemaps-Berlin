import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];
export type NurembergMaterialPalette = {
  wall: RGB;
  roof: RGB;
  roofOnly?: boolean;
  wallOnly?: boolean;
  onlyRoofFaces?: boolean;
};

/** Queue-exact church surface palettes; each color covers all rendered target faces. */
const PART_FAMILIES: Readonly<Record<string, number>> = {
  // Row 3: the exact outline way plus its seven contained native church parts.
  // The native parts carry the same roof color; the source outline carries both.
  'osm/way/14321884|osm/way/14321884/component/01af00d2257af97924ca': 500,
  'osm/way/372826779|osm/way/372826779/component/2b4dde45e0feaacd148d': 500,
  'osm/way/372826780|osm/way/372826780/component/41a12d7c17e5244d3958': 500,
  'osm/way/372826781|osm/way/372826781/component/c7048d178ff11bcb41b6': 500,
  'osm/way/372826782|osm/way/372826782/component/ea1899416ba634abfb0b': 500,
  'osm/way/372826784|osm/way/372826784/component/9567761f92cc9b523dec': 500,
  'osm/way/372826785|osm/way/372826785/component/cfb9577fdff4a55fca8d': 500,
  'osm/way/372826786|osm/way/372826786/component/59098ea58399e0512457': 500,
  // Row 15: OSM carries white walls and a grey roof.
  'osm/way/25007576|osm/way/25007576/component/c95dbda406893e12604d': 501,
  // Row 47: the architectural account identifies warm-grey concrete and a
  // titanium-zinc roof; OSM independently tags the roof grey.
  'osm/way/44063118|osm/way/44063118/component/688e26c6660add166d4c': 502,
  // Row 48: OSM carries white walls and a grey roof.
  'osm/way/44196926|osm/way/44196926/component/36391be8b4cb31ad16ee': 503,
  // Row 55: parish history identifies the red-sandstone wall and red-brown tiles.
  'osm/way/76132302|osm/way/76132302/component/ac10f80809fc580cb877': 504,
  // Row 4: preserve the distinct OSM colors of the church's four exact native parts.
  'osm/way/316788683|osm/way/316788683/component/10075f63aeb9bee9a72d': 505,
  'osm/way/316788684|osm/way/316788684/component/1eb51abff0ca3002c387': 506,
  'osm/way/316792803|osm/way/316792803/component/42bd3a685765b5a71677': 507,
  'osm/way/364304498|osm/way/364304498/component/8074ce947923c62b0315': 508,
  // Row 2: exact chapel mesh; sandstone body and dark tiled roof from the photo.
  'osm/way/137276710|osm/way/137276710/component/0084bf5b060519e5c0e0': 510,
  // Row 4: the 1 m wrapper under the four detailed native parts.
  'osm/way/148250367|osm/way/148250367/component/2e0c12240189406d04fb': 509,
  // Row 11: color the whole exact church shell and retain each confirmed roof part's own material.
  'osm/way/217500979|osm/way/217500979/component/b3b989cf615d6199ec5a': 553,
  'osm/way/294591599|osm/way/294591599/component/46eb3d32bfe48ffa7e42': 511,
  'osm/way/294591600|osm/way/294591600/component/4f2cc96d6f71ef99af43': 511,
  'osm/way/294591601|osm/way/294591601/component/dd354d674680dccefb80': 511,
  'osm/way/294591602|osm/way/294591602/component/732bc51bf28217b0125a': 511,
  'osm/way/294591908|osm/way/294591908/component/8e4c6b72c1a6496d6c2b': 512,
  'osm/way/294592786|osm/way/294592786/component/e6adf65369871bb100bf': 511,
  // Row 13: color the exact shell's walls only; both native roof components carry the roof color.
  'osm/way/233673556|osm/way/233673556/component/cf24baf536a0342559ff': 554,
  'osm/way/1459044511|osm/way/1459044511/component/c7d15cd9c87d6f6676d0': 513,
  'osm/way/1459044512|osm/way/1459044512/component/746701abdaad5987fbac': 513,
  // Row 18: brick church and tiled gabled roof, exact native geometry.
  'osm/way/279938777|osm/way/279938777/component/2ea7b64425ea5bab5a67': 514,
  // Row 21: sandstone body and source-tagged red roof; display repair adds a sandstone upper tower storey.
  'osm/way/30126205|osm/way/30126205/component/9bd58575de8332394efb': 515,
  // Row 25: full brick-wall and dark slate roof coverage; display geometry adds the paired towers.
  'osm/way/31344062|osm/way/31344062/component/e33baf4960932f44f969': 516,
  // Row 28: parent envelope plus the ten confirmed in-outline building parts.
  'osm/way/32044179|osm/way/32044179/component/92420a268a1ec8acd463': 517,
  'osm/way/328481738|osm/way/328481738/component/31bb7db510fa209d0901': 518,
  'osm/way/328481739|osm/way/328481739/component/c76838d8089bd3b19049': 518,
  'osm/way/328481744|osm/way/328481744/component/3ad1f36bafdb94d7507a': 519,
  'osm/way/328481745|osm/way/328481745/component/9c590f75412aceaaf0d2': 519,
  'osm/way/328481747|osm/way/328481747/component/5fbc649e5888ca4c3c49': 520,
  'osm/way/328481748|osm/way/328481748/component/bd403c0e13f804b376b3': 519,
  'osm/way/328481751|osm/way/328481751/component/3c38361a1c20a866730d': 519,
  'osm/way/328481756|osm/way/328481756/component/1def175c5843d901b8a2': 519,
  'osm/way/328481758|osm/way/328481758/component/930b2b79373eb15549c5': 518,
  'osm/way/328481759|osm/way/328481759/component/46131354d44de8d4548f': 518,
  // Row 32: parent shell, dark nave, and light plaster bell tower are distinct components.
  'osm/way/32729749|osm/way/32729749/component/a6cdeff63c2c347b7521': 521,
  'osm/way/1466887143|osm/way/1466887143/component/51b952d6b87ffdf52090': 522,
  'osm/way/1466887144|osm/way/1466887144/component/4b638d3f40013444f493': 523,
  // Row 34: exact church outline only; adjacent low-building ownership is unresolved.
  'osm/way/34685523|osm/way/34685523/component/fa292833a4e4e422af1f': 524,
  // Row 40: three in-outline native parts plus the outline wrapper.
  'osm/way/39345974|osm/way/39345974/component/def352d844fe5b7503b1': 526,
  'osm/way/1278490923|osm/way/1278490923/component/8ff041c17b4ad5541366': 527,
  'osm/way/1278490924|osm/way/1278490924/component/0e5a30c7b8a9230ecd3f': 527,
  'osm/way/1278490926|osm/way/1278490926/component/01822659e92bafd1d4bc': 527,
  // Row 42: paint the exact envelope and all eight contained parts; use the photographed green tower cap.
  'osm/way/400131928|osm/way/400131928/component/155776c31489559bfe1f': 530,
  'osm/way/400131926|osm/way/400131926/component/dbcac0d92a4034e23f55': 532,
  'osm/way/400131927|osm/way/400131927/component/c32dc7467f5c3571803f': 532,
  'osm/way/400131932|osm/way/400131932/component/d8ad083ee91160b864d2': 531,
  'osm/way/400131936|osm/way/400131936/component/12015d9fb8a36fb933d7': 531,
  'osm/way/400131939|osm/way/400131939/component/63d04b2855798cf99e9a': 531,
  'osm/way/400131941|osm/way/400131941/component/497642f27e3b4c241e06': 532,
  'osm/way/400131943|osm/way/400131943/component/a921a47fc56afd326364': 532,
  'osm/way/400131946|osm/way/400131946/component/ba2ec95cc1b40b35c88e': 532,
  // Row 43: exact target wrapper plus the nave and tower parts inside it.
  'osm/way/42210697|osm/way/42210697/component/2dd5995a7d63ce86421f': 533,
  'osm/way/1202494443|osm/way/1202494443/component/506131e98733bf637928': 534,
  'osm/way/1202494442|osm/way/1202494442/component/a957e4e9be66ea01ddc2': 534,
  // Row 44: all four component parts inside the exact outline.
  'osm/way/42747409|osm/way/42747409/component/275727be74c1f0e98c97': 536,
  'osm/way/1278483482|osm/way/1278483482/component/68884f7705ab79df539f': 537,
  'osm/way/1278483483|osm/way/1278483483/component/40a1e1d28671de2bfbd3': 538,
  'osm/way/1278483484|osm/way/1278483484/component/b0391b879fe0e284162c': 539,
  'osm/way/854535598|osm/way/854535598/component/e0ddaf8849cee94cac89': 540,
  // Row 45: sandstone wall only; the steep roof/turret are not represented by this flat mesh.
  'osm/way/429378209|osm/way/429378209/component/83083286386fcacbea1d': 541,
  // Row 50: paint only the exact church shell; the nearby tower way has no verified group link.
  'osm/way/68455456|osm/way/68455456/component/15f65d1a2e4495020541': 542,
  // Row 56: paint only the exact church shell; the separately mapped way has no verified group link.
  'osm/way/76132312|osm/way/76132312/component/41ff97940372e0ea5fa8': 544,
  // Rows 61, 64 and 69: paint existing flat shells with photo-supported dominant colors.
  'osm/way/84052748|osm/way/84052748/component/cede49b9424619c99c81': 546,
  'osm/way/90033898|osm/way/90033898/component/8f92c0633964a219c92f': 547,
  'osm/way/96249841|osm/way/96249841/component/07f78dcb59907e3b0a92': 548,
  // Row 70: the parish documents a vivid red exterior coat after the 1975 restoration.
  'osm/way/96381744|osm/way/96381744/component/795036d3faeb1c27d653': 549,
  // Row 66 has native wall and roof batches; the modeled roof is colored, but the tower is absent.
  'osm/way/92743627|osm/way/92743627/component/175b32f81843f9c685cb': 550,
  // Row 68 model matches the visible nave and its tiled roof.
  'osm/way/95782098|osm/way/95782098/component/1f458ba3b043a9507fbb': 551,
  // Row 72: the exact Maria Hilf church part; the exterior photo shows a light
  // facade and dark gabled roof. Do not extend this palette to connected wings.
  'osm/way/96644588|osm/way/96644588/component/77dfe0660571af5f34d7': 552,
};

const PALETTES: Readonly<Record<number, NurembergMaterialPalette>> = {
  500: {wall: [0.741, 0.710, 0.686], roof: [0.549, 0.675, 0.663]},
  501: {wall: [0.933, 0.933, 0.918], roof: [0.647, 0.651, 0.651]},
  502: {wall: [0.49, 0.48, 0.45], roof: [0.647, 0.651, 0.651]},
  503: {wall: [0.933, 0.933, 0.918], roof: [0.647, 0.651, 0.651]},
  504: {wall: [0.55, 0.34, 0.27], roof: [0.58, 0.32, 0.24]},
  505: {wall: [0x66 / 255, 0x54 / 255, 0x44 / 255], roof: [0xf7 / 255, 0xea / 255, 0xbe / 255]},
  506: {wall: [0x9a / 255, 0x79 / 255, 0x66 / 255], roof: [0xb2 / 255, 0x85 / 255, 0x6e / 255]},
  507: {wall: [0xf7 / 255, 0xea / 255, 0xbe / 255], roof: [0xf7 / 255, 0xea / 255, 0xbe / 255]},
  508: {wall: [0x99 / 255, 0x9a / 255, 0x9e / 255], roof: [0x99 / 255, 0x9a / 255, 0x9e / 255]},
  509: {wall: [0x91 / 255, 0x7e / 255, 0x6a / 255], roof: [0xe7 / 255, 0xe3 / 255, 0xd8 / 255]},
  510: {wall: [0xa7 / 255, 0x8c / 255, 0x73 / 255], roof: [0x59 / 255, 0x51 / 255, 0x4a / 255]},
  // Row 11: the parish exterior description/photo identifies grey roofing;
  // override the stale tan/mint source roof colors on the six exact roof parts.
  511: {wall: [0xa0 / 255, 0x48 / 255, 0x3a / 255], roof: [0x77 / 255, 0x73 / 255, 0x6e / 255]},
  512: {wall: [0xa0 / 255, 0x48 / 255, 0x3a / 255], roof: [0x77 / 255, 0x73 / 255, 0x6e / 255]},
  513: {wall: [0.5, 0.5, 0.5], roof: [0x77 / 255, 0x78 / 255, 0x75 / 255], onlyRoofFaces: true},
  514: {wall: [0xa0 / 255, 0x48 / 255, 0x3a / 255], roof: [0x55 / 255, 0x53 / 255, 0x50 / 255]},
  515: {wall: [0xa3 / 255, 0x89 / 255, 0x70 / 255], roof: [0xb8 / 255, 0x5a / 255, 0x43 / 255]},
  516: {wall: [0x9c / 255, 0x51 / 255, 0x45 / 255], roof: [0x58 / 255, 0x55 / 255, 0x51 / 255]},
  517: {wall: [0x7a / 255, 0x34 / 255, 0x2f / 255], roof: [0x72 / 255, 0x72 / 255, 0x72 / 255]},
  518: {wall: [0x7a / 255, 0x34 / 255, 0x2f / 255], roof: [0xbc / 255, 0x72 / 255, 0x4e / 255]},
  519: {wall: [0x7a / 255, 0x34 / 255, 0x2f / 255], roof: [0x6b / 255, 0x85 / 255, 0x83 / 255]},
  520: {wall: [0x7a / 255, 0x34 / 255, 0x2f / 255], roof: [0x52 / 255, 0x56 / 255, 0x5b / 255]},
  521: {wall: [0xe8 / 255, 0xe4 / 255, 0xda / 255], roof: [0xe8 / 255, 0xe4 / 255, 0xda / 255]},
  522: {wall: [0x39 / 255, 0x33 / 255, 0x2d / 255], roof: [0x8b / 255, 0x44 / 255, 0x33 / 255]},
  523: {wall: [0xe8 / 255, 0xe4 / 255, 0xda / 255], roof: [0x8b / 255, 0x44 / 255, 0x33 / 255]},
  524: {wall: [0x8d / 255, 0x5a / 255, 0x42 / 255], roof: [0x55 / 255, 0x58 / 255, 0x5a / 255]},
  526: {wall: [0xe6 / 255, 0xe3 / 255, 0xd9 / 255], roof: [0xe6 / 255, 0xe3 / 255, 0xd9 / 255]},
  527: {wall: [0xe6 / 255, 0xe3 / 255, 0xd9 / 255], roof: [0x4a / 255, 0x49 / 255, 0x47 / 255]},
  530: {wall: [0xe2 / 255, 0xc3 / 255, 0xa2 / 255], roof: [0x8d / 255, 0x4c / 255, 0x38 / 255]},
  531: {wall: [0xe2 / 255, 0xc3 / 255, 0xa2 / 255], roof: [0x9d / 255, 0x49 / 255, 0x34 / 255]},
  532: {wall: [0xe2 / 255, 0xc3 / 255, 0xa2 / 255], roof: [0x54 / 255, 0x70 / 255, 0x5b / 255]},
  533: {wall: [0x9c / 255, 0x84 / 255, 0x69 / 255], roof: [0x8c / 255, 0x49 / 255, 0x33 / 255]},
  534: {wall: [0x9c / 255, 0x84 / 255, 0x69 / 255], roof: [0x8c / 255, 0x49 / 255, 0x33 / 255]},
  536: {wall: [0x9b / 255, 0x68 / 255, 0x4e / 255], roof: [0xc7 / 255, 0xc3 / 255, 0xb9 / 255]},
  537: {wall: [0x9b / 255, 0x68 / 255, 0x4e / 255], roof: [0xc7 / 255, 0xc3 / 255, 0xb9 / 255]},
  538: {wall: [0x9b / 255, 0x68 / 255, 0x4e / 255], roof: [0xaa / 255, 0xa9 / 255, 0xa3 / 255]},
  539: {wall: [0xc7 / 255, 0xc3 / 255, 0xb9 / 255], roof: [0xc7 / 255, 0xc3 / 255, 0xb9 / 255]},
  540: {wall: [0x9b / 255, 0x68 / 255, 0x4e / 255], roof: [0xc7 / 255, 0xc3 / 255, 0xb9 / 255]},
  541: {wall: [0xa6 / 255, 0x7b / 255, 0x61 / 255], roof: [0x68 / 255, 0x43 / 255, 0x37 / 255], wallOnly: true}, // Landauerkapelle photo: sandstone, red-brown tiles; wallOnly keeps the flat native top neutral while the added pitched roof uses this tile color.
  542: {wall: [0xe5 / 255, 0xe3 / 255, 0xdd / 255], roof: [0xb1 / 255, 0xb1 / 255, 0xac / 255]},
  544: {wall: [0x9b / 255, 0x6e / 255, 0x55 / 255], roof: [0x4a / 255, 0x45 / 255, 0x41 / 255]},
  546: {wall: [0xb4 / 255, 0x5d / 255, 0x49 / 255], roof: [0x98 / 255, 0x4e / 255, 0x39 / 255]},
  547: {wall: [0xe7 / 255, 0xe3 / 255, 0xd8 / 255], roof: [0xb5 / 255, 0x53 / 255, 0x38 / 255]},
  // Row 69: the parish/diocese exterior photos show a light stone church body
  // and red tile roof; the separate red-brick tower is not in this exact shell.
  548: {wall: [0xe7 / 255, 0xe3 / 255, 0xd8 / 255], roof: [0xb5 / 255, 0x53 / 255, 0x38 / 255]},
  549: {wall: [0xc3 / 255, 0x46 / 255, 0x36 / 255], roof: [0x6e / 255, 0x50 / 255, 0x46 / 255]},
  550: {wall: [0x91 / 255, 0x76 / 255, 0x6a / 255], roof: [0xa1 / 255, 0x4f / 255, 0x39 / 255]},
  551: {wall: [0xa9 / 255, 0x53 / 255, 0x39 / 255], roof: [0x8d / 255, 0x4c / 255, 0x38 / 255]},
  552: {wall: [0xd8 / 255, 0xd7 / 255, 0xd1 / 255], roof: [0x4e / 255, 0x4c / 255, 0x47 / 255]},
  553: {wall: [0xa0 / 255, 0x48 / 255, 0x3a / 255], roof: [0x78 / 255, 0x70 / 255, 0x66 / 255]},
  554: {wall: [0xd8 / 255, 0xd4 / 255, 0xca / 255], roof: [0x4b / 255, 0x4c / 255, 0x4a / 255], wallOnly: true},
};

export function nurembergNon500PartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'nuremberg') return undefined;
  return PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function nurembergMaterialPalette(family: number): NurembergMaterialPalette | undefined {
  return PALETTES[family];
}
