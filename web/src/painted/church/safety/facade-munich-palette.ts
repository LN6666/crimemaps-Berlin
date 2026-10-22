import {munichMissingReferenceMaterialPalette} from './facade-munich-missing-reference-palette';
import {munichKapernaumMaterialPalette} from './facade-munich-kapernaum-palette';
import {munichNazarethMaterialPalette} from './facade-munich-nazareth-palette';
import {munichMidqueuePaintProfile} from './facade-munich-midqueue-palette';
import {munichChapelMaterialPalette} from './facade-munich-chapel-palette';
import {munichRemainingMaterialPalette} from './facade-munich-remaining-palette';
import {munichPriorMaterialPalette} from './facade-munich-prior-palette';
import {munichCarolinenMaterialPalette} from './facade-munich-carolinen-palette';
import {munichQueueMaterialPalette} from './facade-munich-queue-palette';

type RGB = [number, number, number];

export type MunichMaterialPalette = {
  wall?: RGB;
  roof?: RGB;
  roofOnly?: boolean;
  wallOnly?: boolean;
  onlyRoofFaces?: boolean;
};

const PALE_WALL: RGB = [0.88, 0.87, 0.82];
const DARK_ROOF: RGB = [0.2, 0.21, 0.22];
const NEUTRAL_UNFINISHED_ROOF: RGB = [0.82, 0.82, 0.8];
const RED_TILE: RGB = [0.75, 0.31, 0.15];

/** CPU-side equivalents of the solid Munich material branches in the facade shader. */
const MUNICH_MATERIAL_PALETTES: Record<number, MunichMaterialPalette> = {
  310: {wall: PALE_WALL, roof: [0.31, 0.53, 0.46]},
  311: {wall: PALE_WALL, roof: [0.16, 0.17, 0.18]},
  // The separate bell-tower shaft is pale; its current spire finish is not established.
  312: {wall: PALE_WALL, wallOnly: true},
  // The main tent roof is under integrated-PV replacement. Suppress the obsolete cyan OSM
  // color in the display while the finished roof material remains undocumented.
  371: {wall: PALE_WALL, roof: NEUTRAL_UNFINISHED_ROOF},
  313: {wall: PALE_WALL, roof: [0.61, 0.49, 0.49]},
  // St. Stephan photo supports the light walls but shows only a dark roof
  // coping, not the roof surface; preserve the native roof material.
  314: {wall: [0.82, 0.81, 0.76], roof: DARK_ROOF, wallOnly: true},
  315: {wall: [0.88, 0.85, 0.77], roof: RED_TILE},
  316: {wall: [0.85, 0.82, 0.74], roof: DARK_ROOF},
  317: {wall: [0.78, 0.58, 0.31], roof: RED_TILE},
  // Namen Jesu is white-to-light-gray plaster. Use a visible cool gray so its
  // painted walls read against the neutral white-map buildings.
  319: {wall: [0.94, 0.94, 0.92], roof: [0.31, 0.32, 0.34]},
  320: {wall: [0.49, 0.27, 0.21], roof: [0.37, 0.56, 0.51]},
  321: {wall: [0.87, 0.84, 0.76], roof: RED_TILE},
  322: {wall: [0.87, 0.84, 0.76], roof: RED_TILE},
  323: {wall: [0.78, 0.76, 0.69], roof: [0.69, 0.29, 0.18]},
  // Mariä Geburt's exact Commons view shows warm-white render and blue-gray slate.
  324: {wall: [0.91, 0.9, 0.86], roof: [0.29, 0.32, 0.36]},
  325: {wall: [0.85, 0.82, 0.74], roof: [0.66, 0.88, 0.79]},
  // St. Heinrich's source tags specify a muted brown-gray roof (#7F5F5F).
  // The photo also shows white lower plaster, a brick gable, and a pale cross.
  326: {wall: [0.94, 0.93, 0.9], roof: [127/255, 95/255, 95/255]},
  327: {wall: [0.85, 0.82, 0.74], roof: RED_TILE},
  // St. Rupert's roof renewal documents fired clay tiles; keep the schematic
  // base roof a muted warm brown while the four modeled cones carry the tile tone.
  328: {wall: [0.55, 0.28, 0.22], roof: [0.67, 0.33, 0.22]},
  // Christuskirche's reference shows white plaster and a dark nave roof.
  329: {wall: [0.95, 0.95, 0.93], roof: DARK_ROOF},
  // The target photo and building:colour=white support the bright plaster
  // walls; the roof surface is hidden, so leave its native material intact.
  330: {wall: [0.95, 0.95, 0.93], roof: DARK_ROOF, wallOnly: true},
  331: {wall: [0.49, 0.27, 0.21], roof: DARK_ROOF},
  // St. Leonhard's reference confirms bright white plaster, while its front
  // elevation does not establish the color of the full roof surface.
  332: {wall: [0.95, 0.95, 0.93], roof: DARK_ROOF, wallOnly: true},
  333: {wall: [0.66, 0.31, 0.25], roof: DARK_ROOF},
  334: {wall: [0.85, 0.82, 0.74], roof: RED_TILE},
  // Heilig Kreuz's reference shows red-brown brick, lighter than the old dark
  // wall swatch; the terracotta roof remains independently represented.
  335: {wall: [0.62, 0.31, 0.23], roof: RED_TILE},
  // Maria Rosenkranzkönigin's verified partial view shows pale yellow/cream plaster.
  336: {wall: [0.88, 0.82, 0.68], roof: DARK_ROOF},
  // Maria Heimsuchung's street-facing facade is white stucco with red-tiled wings.
  337: {wall: [0.96, 0.96, 0.94], roof: RED_TILE},
  // The exact Moosach church photo shows cream walls and weathered dark-red tiles.
  338: {wall: [0.9, 0.87, 0.8], roof: [0.68, 0.34, 0.18]},
  339: {wall: [0.88, 0.85, 0.77], roof: [0.18, 0.34, 0.33]},
  340: {wall: [0.88, 0.85, 0.77], roof: DARK_ROOF},
  341: {wall: [0.28, 0.5, 0.43], roof: [0.28, 0.5, 0.43], roofOnly: true},
  // The same reference shows a white bell tower with a green copper spire.
  342: {wall: [0.95, 0.95, 0.93], roof: [0.25, 0.47, 0.4]},
  343: {wall: [0.85, 0.82, 0.74], roof: [0.31, 0.53, 0.46]},
  // St. Leonhard's bound tower has white plaster and a green copper spire.
  344: {wall: [0.95, 0.95, 0.93], roof: [0.31, 0.53, 0.46]},
  345: {wall: [0.82, 0.7, 0.43], roof: [0.38, 0.58, 0.5]},
  346: {wall: [0.9, 0.9, 0.86], roof: [0.16, 0.17, 0.18]},
  347: {wall: [0.44, 0.29, 0.25], roof: [0.37, 0.56, 0.51]},
  348: {wall: [0.91, 0.89, 0.84], roof: [0.4, 0.63, 0.59]},
  349: {wall: [0.87, 0.84, 0.76], roof: [0.25, 0.47, 0.42]},
  350: {wall: [0.87, 0.84, 0.76], roof: [0.2, 0.22, 0.23]},
  351: {wall: [0.78, 0.76, 0.69], roof: [0.3, 0.55, 0.48]},
  352: {wall: [0.93, 0.92, 0.9], roof: [0.37, 0.56, 0.51]},
  353: {wall: [0.85, 0.78, 0.64], roof: [0.66, 0.88, 0.79]},
  354: {wall: [0.85, 0.78, 0.64], roof: [0.29, 0.27, 0.25]},
  // St. Heinrich's gable is red-brown brick; keep it distinct from the pale
  // lower plaster walls and dark roof.
  355: {wall: [0.62, 0.31, 0.23], roof: DARK_ROOF},
  // St. Heinrich's separate entrance canopy (OSM building=roof) is dark timber,
  // matching the target photo; it is not another brick gable.
  356: {wall: DARK_ROOF, roof: DARK_ROOF, roofOnly: true},
  357: {wall: [0.31, 0.53, 0.46], roof: [0.31, 0.53, 0.46], roofOnly: true},
  358: {wall: [0.37, 0.56, 0.51], roof: [0.37, 0.56, 0.51], roofOnly: true},
  359: {wall: [0.62, 0.62, 0.59], roof: [0.28, 0.29, 0.29]},
  360: {wall: [0.79, 0.75, 0.69], roof: [0.37, 0.56, 0.51]},
  361: {wall: [0.79, 0.75, 0.69], roof: [0.28, 0.29, 0.29]},
  367: {wall: [0.49, 0.27, 0.21], roof: [0.28, 0.29, 0.29]},
  362: {wall: [0.44, 0.43, 0.4], roof: [0.29, 0.29, 0.29]},
};

export function munichMaterialPalette(family: number): MunichMaterialPalette | undefined {
  const missingRef=munichMissingReferenceMaterialPalette(family);
  if(missingRef)return {...missingRef,roofOnly:false,onlyRoofFaces:missingRef.roofOnly};
  const nazareth=munichNazarethMaterialPalette(family);
  if(nazareth)return {roof:nazareth.roof,onlyRoofFaces:true};
  const kapernaum=munichKapernaumMaterialPalette(family);if(kapernaum)return kapernaum;
  const midqueue=munichMidqueuePaintProfile(family);
  if(midqueue)return {...midqueue,roofOnly:false,onlyRoofFaces:midqueue.roofOnly,wall:midqueue.wall??midqueue.wallBands?.at(-1)?.color};
  return munichChapelMaterialPalette(family) ?? munichRemainingMaterialPalette(family) ?? munichPriorMaterialPalette(family) ?? munichQueueMaterialPalette(family) ?? munichCarolinenMaterialPalette(family) ?? MUNICH_MATERIAL_PALETTES[family];
}
