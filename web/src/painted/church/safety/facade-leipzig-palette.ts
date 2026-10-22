import type {BuildingComponent} from './building-mesh-renderer';

type RGB = [number, number, number];
export type LeipzigMaterialPalette = {
  wall: RGB;
  roof: RGB;
  roofOnly?: boolean;
  wallOnly?: boolean;
  onlyRoofFaces?: boolean;
};

// Exact source-bound queue parts. Paint only locally supported native faces;
// unresolved wall hues remain unpainted. Missing geometry is never synthesized.
const PART_FAMILIES: Readonly<Record<string, number>> = {
 'osm/way/264893702|osm/way/264893702/component/8584769c9deefd213e3d': 610,
 'osm/way/270861319|osm/way/270861319/component/2425e3ac5f188250e3ca': 611,
 'osm/way/273002008|osm/way/273002008/component/9aa4d6bb74e80eb1e3af': 612,
 'osm/way/295164268|osm/way/295164268/component/c6d25ea3a70bc80e4e86': 613,
 'osm/way/37815753|osm/way/37815753/component/ff3a34247aba900f6101': 614,
 'osm/way/37962974|osm/way/37962974/component/5f0e5a858c509d258791': 615,
 'osm/way/398046914|osm/way/398046914/component/3f38dd8ae9f009fe1db7': 616,
 'osm/way/40330846|osm/way/40330846/component/521e8436cdb56fc8d6e8': 617,
 'osm/way/610063187|osm/way/610063187/component/426c79151502390336f5': 618,
 // Relation 8467977 explicitly binds these exact native parts to Heilandskirche.
 // Black-tagged roofs use 618; parts with roof:colour=#904116 use 625.
 'osm/way/189198497|osm/way/189198497/component/bad62ba83b4162c21730': 625,
 'osm/way/371121572|osm/way/371121572/component/ca2b7789efbfef23e638': 618,
 'osm/way/610063091|osm/way/610063091/component/ecda34467ade70b074cf': 625,
 'osm/way/610063095|osm/way/610063095/component/438f1af063b8d26a8ad3': 625,
 'osm/way/610063100|osm/way/610063100/component/74821c8745c3a00e07d1': 625,
 'osm/way/610063106|osm/way/610063106/component/3c59a30471f70d4691bf': 625,
 'osm/way/610063116|osm/way/610063116/component/bdeb4f4e73f5d26c7249': 618,
 'osm/way/610063119|osm/way/610063119/component/f55bdcdef7fcf9e27fd9': 625,
 'osm/way/610063125|osm/way/610063125/component/9833506749c73cf69ac0': 625,
 'osm/way/610063128|osm/way/610063128/component/8b8f533112d23e3e049b': 625,
 'osm/way/610063132|osm/way/610063132/component/83623572c9b63640f414': 625,
 'osm/way/610063136|osm/way/610063136/component/a57df93284dd3f957914': 625,
 'osm/way/610063139|osm/way/610063139/component/2d01b95716c7aafb3feb': 625,
 'osm/way/610063142|osm/way/610063142/component/94eefa36d7931ac59267': 625,
 'osm/way/610063143|osm/way/610063143/component/fe70092bb0b3088cff19': 625,
 'osm/way/610063145|osm/way/610063145/component/85da33eef332c27a69a9': 625,
 'osm/way/610063147|osm/way/610063147/component/9431ef931b43ef07703d': 625,
 'osm/way/610063148|osm/way/610063148/component/872e4e7d2ac4797aa5b0': 625,
 'osm/way/610063149|osm/way/610063149/component/b448d9a37180ed951ca6': 625,
 'osm/way/610063151|osm/way/610063151/component/ad9ee1836bd2d991e374': 625,
 'osm/way/610063153|osm/way/610063153/component/4dc9f12ab92d2c735c2d': 625,
 'osm/way/610063156|osm/way/610063156/component/8e4919ed232c155638e7': 625,
 'osm/way/610063158|osm/way/610063158/component/814262f04c71b988ed77': 625,
 // Four omitted attached parts lie inside the exact church outline and carry
 // the same explicit red wall and roof colors as the other Heilandskirche parts.
 'osm/way/610063164|osm/way/610063164/component/2a69de01250f89fcf089': 625,
 'osm/way/610063166|osm/way/610063166/component/0f973acfc1baf68f5453': 625,
 'osm/way/610063168|osm/way/610063168/component/281f132737d504dd7f76': 625,
 'osm/way/610063169|osm/way/610063169/component/ae2e0fad31f384c8cd9e': 625,
 'osm/way/610063171|osm/way/610063171/component/4b63e29c6d2ac0cd272b': 618,
 'osm/way/610063173|osm/way/610063173/component/1bc0ac151d1f7767e804': 618,
 'osm/way/610063176|osm/way/610063176/component/b6575a628b2c836c18c4': 618,
 'osm/way/610063180|osm/way/610063180/component/48c9130468c2d1f5ac66': 618,
 'osm/way/610063204|osm/way/610063204/component/ace0ffa7abc5b2a80218': 618,
 'osm/way/610063209|osm/way/610063209/component/fefcbddf638dfbba21f6': 618,
 'osm/way/610063212|osm/way/610063212/component/6f28d804d630a3b4457b': 618,
 'osm/way/610329909|osm/way/610329909/component/b341ffef0e5c7e3d48d9': 625,
 'osm/way/610329910|osm/way/610329910/component/40d09c68162ffce0ba67': 625,
 'osm/way/610329911|osm/way/610329911/component/e97081faa669676245fa': 625,
 'osm/way/610329912|osm/way/610329912/component/f9cf86c61d0d837771c1': 625,
 'osm/way/610329913|osm/way/610329913/component/42e3bcc5489239322d2b': 625,
 'osm/way/610329914|osm/way/610329914/component/af6ab39c48630df6b850': 625,
 'osm/way/610329915|osm/way/610329915/component/d0ab6eaf1faf3825fb23': 625,
 'osm/way/610329916|osm/way/610329916/component/1fc11e58f40d8769ccb3': 625,
 'osm/way/610331645|osm/way/610331645/component/1f303114a155f8c8b007': 625,
 'osm/way/610331646|osm/way/610331646/component/6afae31b2f6f877627ac': 625,
 'osm/way/610914668|osm/way/610914668/component/b7a2e29f609b96fae0d8': 618,
 'osm/way/610914669|osm/way/610914669/component/3b63a21c7ae35a60c156': 618,
 'osm/way/610914670|osm/way/610914670/component/0b3bbda40a0da430adee': 618,
 'osm/way/610914671|osm/way/610914671/component/90b6391a78e220f2e5f8': 618,
 'osm/way/610914672|osm/way/610914672/component/2c6c219d32adf31301da': 618,
 'osm/way/610914673|osm/way/610914673/component/0ebf37af40ece52c177f': 618,
 'osm/way/610914674|osm/way/610914674/component/e7f9dab706e530c97ff1': 618,
 'osm/way/610916600|osm/way/610916600/component/668666c85da497724ee5': 625,
 'osm/way/610916601|osm/way/610916601/component/bef9eef8bd4e7f0896fc': 625,
 // Relation 6406734 explicitly binds these native building parts to the Liebfrauen outline.
 // The source photo shows the three tall pyramidal tower roofs in green-gold glazed tile;
 // keep the two otherwise-red tower parts on the same muted cyan-green tower palette.
 'osm/way/430528115|osm/way/430528115/component/6df882e922667e3dd4ff': 623,
 'osm/way/430528117|osm/way/430528117/component/8e7903ffaf57f8199d09': 623,
 'osm/way/430528119|osm/way/430528119/component/3166974253a88fc098cd': 623,
 'osm/way/430927393|osm/way/430927393/component/338d0ac705767bb273c8': 631,
 'osm/way/430927396|osm/way/430927396/component/eba8eb2ef311ee85515e': 631,
 'osm/way/430927397|osm/way/430927397/component/938c64aab9a0e2e17219': 631,
 'osm/way/430927398|osm/way/430927398/component/84c0251e8f4891155288': 631,
 // The official exterior view shows the exact outline's pale plaster walls and red tiled nave roof.
 'osm/way/66690045|osm/way/66690045/component/5983c05ec4385700cd73': 631,
 // Relation 12541910 links the queue outline, a stone-tagged body part, and the exact dome-tower part.
 'osm/way/926570430|osm/way/926570430/component/50edd6225a2e6db90806': 622,
 'osm/way/926584008|osm/way/926584008/component/f9ffe1882138437b303e': 630,
 'osm/way/46721382|osm/way/46721382/component/4756e08fa94961a65703': 630,
 // Exact Taborkirche outline; a 2020 whole-building photo shows its nave roofs in dark gray.
 // The two tower parts below are contained by the church outline and share source OSM boundary
 // nodes with it, so they are mapped separately.
 'osm/way/99694087|osm/way/99694087/component/0ee99b175dac1e32f247': 624,
 // These eight building:part ways lie inside the exact church outline, and each
 // carries roof:colour=black in the frozen native source. The south/east and
 // whole-building photographs show them as the church's nave/tower roof volumes.
 'osm/way/212812013|osm/way/212812013/component/d32a52ae8a2536a06473': 628,
 'osm/way/212812014|osm/way/212812014/component/6c91e478cbb8e3aef5b4': 628,
 'osm/way/212812015|osm/way/212812015/component/6ffbb9d9df4902601de3': 628,
 'osm/way/212812016|osm/way/212812016/component/469eb7e8108c79bad03e': 628,
 'osm/way/212812017|osm/way/212812017/component/739018faeec77673fbe5': 628,
 'osm/way/212812019|osm/way/212812019/component/2906b4f24fa49693d992': 628,
 'osm/way/212812018|osm/way/212812018/component/2e32e88665d404fc7d77': 628,
 'osm/way/212812020|osm/way/212812020/component/278f00ac2ca03b0cadfd': 628,
 // Relation 10732838 explicitly groups the exact Heilig-Kreuz outline and these native parts.
 // Roof tiles follow the church photo; copper/no-roof parts receive wall color only.
 'osm/way/708069190|osm/way/708069190/component/676824f9013226c967e1': 619,
 // This brick building part lies inside the exact church outline; its adjoining roof
 // is visible as terracotta tile in the local exterior photo.
 'osm/way/708069194|osm/way/708069194/component/a62f21900f77373c71eb': 619,
 'osm/way/708069196|osm/way/708069196/component/87fbc87380001facff96': 619,
 'osm/way/708069200|osm/way/708069200/component/903abedb78f226a4d0e4': 619,
 'osm/way/708069202|osm/way/708069202/component/cdd2f4330d1ff5e61a1b': 619,
 'osm/way/708069203|osm/way/708069203/component/d56f6f14acc0e41b54b9': 619,
 // This taller overlapping target component is the central spire in the local exterior photo.
 'osm/way/708069189|osm/way/708069189/component/6e6b5bf6e4b9ef3e1e5d': 632,
 'osm/way/708069192|osm/way/708069192/component/07c65b9419544e8b40ac': 632,
 // Relation 10732838's main clock-tower part is red brick with a copper pyramidal roof.
 'osm/way/708069187|osm/way/708069187/component/cb36d5dbe660094489ba': 632,
 // Copper-tagged overlapping spire component; the local exterior photo shows its dark roof.
 'osm/way/708216251|osm/way/708216251/component/6e6b5bf6e4b9ef3e1e5d': 632,
 'osm/way/774950965|osm/way/774950965/component/e7141af0940fa9478987': 627,
 'osm/way/774950966|osm/way/774950966/component/78cfd4e3620322389069': 619,
 'osm/way/774950967|osm/way/774950967/component/bfd965c11adeb0b2573f': 619,
 'osm/way/774950968|osm/way/774950968/component/f42fc86c5ab60b6ec942': 627,
 'osm/way/774950969|osm/way/774950969/component/b70c29b00d464f87ca6a': 619,
 'osm/way/774950970|osm/way/774950970/component/6879c8189b9b46d146f4': 619,
 'osm/way/774950971|osm/way/774950971/component/82e1fb3be1f7db62ae6d': 619,
 // OSM marks these two small tower parts roof:material=copper; use the same dark
 // copper finish as the central spire while preserving their red-brick walls.
 'osm/way/774950972|osm/way/774950972/component/6bc83bfec2301375b89d': 632,
 'osm/way/774950973|osm/way/774950973/component/116c608b6209ea08b245': 632,
 'osm/way/774950974|osm/way/774950974/component/8286c976d01d399abafb': 619,
 'osm/way/774950975|osm/way/774950975/component/e856f8ead61203502d41': 619,
 'osm/way/774950976|osm/way/774950976/component/2a02d7c38366f3a9c900': 619,
};

const rgb = (r: number, g: number, b: number): RGB => [r / 255, g / 255, b / 255];
const PALETTES: Readonly<Record<number, LeipzigMaterialPalette>> = {
 610: {wall: rgb(210,198,154), roof: rgb(167,83,59)}, // Liebertwolkwitz, local photos
 611: {wall: rgb(200,154,61), roof: rgb(62,64,60)}, // Althen, local photo
 612: {wall: rgb(244,235,215), roof: rgb(166,75,52)}, // Rehbach, warm white plaster and terracotta tiles, local photo
 613: {wall: rgb(241,235,222), roof: rgb(163,74,52)}, // Lausen, whitewashed plaster and red tiles
 614: {wall: rgb(232,222,198), roof: rgb(111,62,52)}, // Holzhausen, pale cream plaster and dark red-brown tiles
 615: {wall: rgb(222,216,205), roof: rgb(151,72,52)}, // Jacobstraße, pale cream-gray walls and red-brown roof
 616: {wall: rgb(201,199,186), roof: rgb(69,68,63)}, // Gustav-Adolf, local photo
 617: {wall: rgb(232,220,195), roof: rgb(200,97,62)}, // ESG, warm-beige plaster and orange-red tiles
  618: {wall: rgb(132,57,49), roof: rgb(39,41,42)}, // Heilandskirche, dark red brick and charcoal-black tile, building-specific description
  619: {wall: rgb(129,64,57), roof: rgb(172,73,51)}, // Heilig-Kreuz, reddish-brown brick and terracotta tile, local exterior photo
 622: {wall: rgb(242,236,222), roof: rgb(42,44,45)}, // Official Gedächtniskirche view: pale tower and dark onion dome
 623: {wall: rgb(242,236,222), roof: rgb(80,104,100)}, // Liebfrauen tower: pale plaster and muted cyan-green roof from source tag and exterior photo
 630: {wall: rgb(242,236,222), roof: rgb(82,76,68)}, // Gedächtniskirche group: pale Neoclassical walls and dark roof from official exterior views
 631: {wall: rgb(218,203,176), roof: rgb(164,76,53)}, // Liebfrauen group parts: cream plaster and red tile roof from the exterior photo
  624: {wall: rgb(204,190,166), roof: rgb(73,72,69)}, // Taborkirche outline, warm light stone and dark gray nave roofs from the 2020 whole-building photo
  628: {wall: rgb(204,190,166), roof: rgb(70,61,58)}, // Taborkirche twin towers, light stone and dark brown-charcoal copper roofs in the 2024 south-facade photo
  625: {wall: rgb(132,57,49), roof: rgb(144,65,22)}, // Heilandskirche parts with explicit roof:colour=#904116
  627: {wall: rgb(129,64,57), roof: rgb(129,64,57), wallOnly: true}, // Heilig-Kreuz brick walls; preserve copper and untagged roof faces
  632: {wall: rgb(129,64,57), roof: rgb(48,48,46)}, // Heilig-Kreuz central spire: brick tower and dark copper roof from local exterior photo
};

export function leipzigNon500PartFamily(c: BuildingComponent): number | undefined {
  if (c.city !== 'leipzig') return undefined;
  return PART_FAMILIES[c.objectId + '|' + c.partId];
}

export function leipzigMaterialPalette(family: number): LeipzigMaterialPalette | undefined {
  return PALETTES[family];
}
