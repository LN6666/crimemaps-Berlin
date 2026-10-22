import {munichMissingReferencePartFamily} from './facade-munich-missing-reference-palette';
import {munichKapernaumPartFamily} from './facade-munich-kapernaum-palette';
import {munichNazarethPartFamily} from './facade-munich-nazareth-palette';
import {munichMidqueuePartFamily} from './facade-munich-midqueue-palette';
import {munichChapelPartFamily} from './facade-munich-chapel-palette';
import {munichRemainingPartFamily} from './facade-munich-remaining-palette';
import {munichPriorPartFamily} from './facade-munich-prior-palette';
import {REICHSTAG_NATIVE_IDS,reichstagNativePaint} from './facade-reichstag-frame';
import {RESIDENZ_NATIVE_IDS,residenzNativePaint} from './facade-residenz-frame';
import {ELB_NATIVE_IDS,elbphilharmonieNativePaint,configureElbRoofPaint} from './facade-elbphilharmonie-frame';
import {MICHEL_NATIVE_IDS,michelNativePaint,configureMichelPaint} from './facade-michel-frame';
import {PETRI_NATIVE_IDS,petriNativePaint,configurePetriPaint} from './facade-petri-frame';
import {configureRathausRoofPaint} from './facade-rathaus-roof-paint';
import {FRAUEN_NATIVE_IDS,frauenNativePaint,RATHAUS_NATIVE_IDS,rathausNativePaint,rathausPaintReference,alignRathausWingPaint} from './facade-munich-frame';
import {isDescribedBuilding} from './facade-description-bindings';
import type {BuildingComponent} from './building-mesh-renderer';
import {munichCarolinenPartFamily} from './facade-munich-carolinen-palette';
import {munichMaterialPalette} from './facade-munich-palette';
import {nurembergMaterialPalette, nurembergNon500PartFamily} from './facade-nuremberg-palette';
import {leipzigMaterialPalette, leipzigNon500PartFamily} from './facade-leipzig-palette';
import {munichQueuePartFamily} from './facade-munich-queue-palette';

/** Display templates. These choices do not change raw source architecture or measured geometry. */
const rathausHamburg = new Set(['142944431','255885434','255885435','284404494','284404495','255659998','284404483','284404484','284404485','284404486','284404487','284404488','284404490','284404492','284404493','284404496','284404497','284404498','284404499','284404500']);
// Native church building-part ways inside the exact St. Agnes outline (155424472).
// The three measured-height tower parts are separate source surfaces and receive the tower stone tone.
const cologneStAgnesTowerParts=new Set(['osm/way/691070120','osm/way/691070121','osm/way/691070127']);
const cologneStAgnesOtherParts=new Set(['osm/way/250275501','osm/way/691070113','osm/way/691070114','osm/way/691070116','osm/way/691070118','osm/way/691070119','osm/way/691070122','osm/way/691070123','osm/way/691070124','osm/way/691070125','osm/way/691070126','osm/way/691070128','osm/way/691070129','osm/way/691070130','osm/way/691070131','osm/way/691070132','osm/way/691070133','osm/way/691070134']);
// Exact owner-queued Hamburg church objects with local, target-specific photo support.
// Decimal suffixes select only the documented roof/tower cue position in the paint shader.
const hamburgNon500ChurchLayouts:Record<string,number>={
 'osm/way/101558362':247.05,'osm/way/101558370':249.55,'osm/way/101568936':248.13,'osm/way/101813286':247.1,
 'osm/way/105080485':247.4,'osm/way/115892951':250.0,'osm/way/124198439':253.0,'osm/way/137445430':247.1,
 'osm/way/143018790':248.5,'osm/way/1431555591':247.1,'osm/way/158257826':247.0,'osm/way/179159355':256.0,
 'osm/way/215280268':247.2,'osm/way/23533586':247.2,'osm/way/252909384':247.6,'osm/way/25700751':251.1,
 'osm/way/26636168':251.13,'osm/way/273406949':248.0,'osm/way/28712015':247.16,'osm/way/28765199':249.0,
 'osm/way/30161776':250.2,'osm/way/303052509':252.3,'osm/way/30572986':258.0,'osm/way/30641453':255.5,
 'osm/way/309807917':247.0,'osm/way/32141271':256.0,'osm/way/32613956':247.4,'osm/way/32810030':247.2,
 'osm/way/33168046':256.38,'osm/way/34327929':248.1,'osm/way/34928846':247.6,'osm/way/35962577':248.5,
 'osm/way/36002524':257.1,'osm/way/363620213':253.0,'osm/way/37800418':251.2,'osm/way/43393858':248.1,
 'osm/way/44018506':249.5,'osm/way/45032734':247.5,'osm/way/45183579':251.3,'osm/way/45184883':247.1,
 'osm/way/45246768':259.0,'osm/way/48539671':260.0,'osm/way/51366040':247.2,'osm/way/52313744':251.1,
 'osm/way/53762523':247.2,'osm/way/55171767':247.2,'osm/way/55697842':248.5,'osm/way/56466641':247.1,
 'osm/way/60844682':249.1,'osm/way/61266438':250.5,'osm/way/61403412':251.0,'osm/way/67549782':247.2,
 'osm/way/68326730':257.0,'osm/way/70463522':247.31,'osm/way/775570932':257.0,'osm/way/82209169':248.1,
 'osm/way/82822267':248.52,'osm/way/83289976':254.0,'osm/way/83377523':247.0,'osm/way/90967615':261.0,
 'osm/way/93908408':248.1,'osm/way/96793110':255.05
};
// Exact Bremen candidate cleared by the contour screen: low brick hall with a slate roof.
// Face code 5 paints openings only on the two faces visible in the local reference angle.
const bremenNon500ChurchLayouts:Record<string,number>={
 'osm/way/225780901':251.05,
 'osm/way/25117355':251.03,
 'osm/way/156296177':284
};
// Frankfurt St. Hedwig: the mapped low brick hall matches the broad church body;
// keep the separately framed entrance out of this exact object and paint only two reference-facing walls.
const frankfurtNon500ChurchLayouts:Record<string,number>={
 'osm/way/99055306':251.08,
 // Kreuzkirche: pale plaster, dark slate-like roof line shading and arched openings
 // on the southwest photo-facing walls; keep the native irregular joined plan.
 'osm/way/30137444':249.57
};
// St. Maria in den Benden: the low closed parish complex and inner-court outline
// match the native model; paint only the documented pale brick and slate cues.
const dusseldorfNon500ChurchLayouts:Record<string,number>={
 'osm/way/170469393':288.11,
 'osm/way/758762136':288
};
const berlinStChristophorusLayouts:Record<string,number>={
 'osm/way/30608770':270,
 'osm/way/204513230':271,
 'osm/way/204513233':272,
 'osm/way/204513228':273,
 'osm/way/204513229':274,
 'osm/way/204513231':275,
 'osm/way/204513232':276,
 'osm/way/561007776':277,
};
// Exact OSM members of the already complete St. Ursula silhouette in the live Munich model.
// Keep the adjacent Pater-Rupert-Mayer dormitory (way 32972870) and other nearby buildings out.
const munichStUrsulaPaintIds=new Set([
 'osm/way/32945956',
 'osm/way/251986554','osm/way/251986873','osm/way/251981487',
 'osm/way/252006638','osm/way/252006644','osm/way/252006646','osm/way/252006648',
 'osm/way/252006651','osm/way/252006653','osm/way/252006657',
 'osm/way/255401631','osm/way/255401632','osm/way/255401633','osm/way/255404783',
 'osm/way/256162694','osm/way/256162695','osm/way/256164336',
 'osm/way/256316290','osm/way/256316291','osm/way/256316880','osm/way/256316883','osm/way/256316885',
 'osm/way/257118246','osm/way/257122535','osm/way/257127290','osm/way/257127295',
 'osm/way/257127303','osm/way/257127304','osm/way/257127308','osm/way/257127309',
 'osm/way/257127311','osm/way/257127314','osm/way/257127316','osm/way/257127318',
 'osm/way/257127323','osm/way/257127324','osm/way/257287474','osm/way/257287476','osm/way/258253700'
]);
// User-selected Munich queue targets. The main way establishes identity; the
// verified building:part map below completes the same physical church without
// admitting nearby buildings. Families change existing mesh surfaces only.
const munichSelectedPaintFamilies:Record<string,number>={
 'osm/way/110682504':310, // St. Joachim: pale walls, green metal roof
 'osm/way/112171623':311, // St. Bernhard: white render, dark flat roof
 'osm/way/113852876':371, // Emmauskirche: pale walls; neutral roof while integrated-PV replacement is unfinished
 'osm/way/116783686':313, // St. Gertrud: white render, OSM muted-red roof
 'osm/way/1191302452':314, // St. Stephan: warm off-white walls; roof surface unknown
 'osm/way/143422530':315, // St. Michael: warm pale walls, terracotta roof
 'osm/way/146963351':316, // Alte St. Margaret: pale stone walls, dark roof
 'osm/way/150393341':317, // Wallfahrtskirche St. Anna: ochre walls, red tiles
 'osm/way/172199964':319, // Namen Jesu: light walls, dark roof
 'osm/way/319152770':342, // Namen Jesu's separate OSM bell tower: white shaft and green copper roof
 'osm/way/19330628':320, // St. Lukas: red-brown brick with green/gray metal roofs
 'osm/way/207657334':321, // Alte St. Johann Baptist: cream walls, red tiles
 'osm/way/214423599':322, // Hl. Kreuz Forstenried: pale walls, red tiles
 'osm/way/24513641':323, // St. Paul: pale limestone, red-tile roof
 'osm/way/24825218':324, // Mariä Geburt: white plaster, dark slate
 'osm/way/25440202':325, // Ludwigskirche (St. Ludwig): pale limestone; roof left neutral
 'osm/way/25474858':326, // St. Heinrich: white lower facade; no invented gable color
 'osm/way/29257470':327, // Maria Schutz: warm white plaster and red-orange tiles
 'osm/way/30419789':328, // St. Rupert: exposed brick, dark roof
 'osm/way/34835333':329, // Christuskirche: white walls, dark roof
 'osm/way/37795569':330, // Zwölf Aposteln: white walls; roof not established
 'osm/way/400412297':331, // St. Willibrord: brown brick, dark roof
 'osm/way/40951695':332, // St. Leonhard: white render, dark roof
 'osm/way/4239284':333, // St. Matthäus: warm red facade, neutral roof
 'osm/way/53015643':334, // St. Margaret group: pale walls; leave unverified roofs neutral
 'osm/way/62216236':335, // Heilig Kreuz Giesing: red-brown brick, terracotta tiles
 'osm/way/77907154':336, // Maria Rosenkranzkönigin: warm pale walls, dark roof
 'osm/way/84303369':337, // Maria Heimsuchung: white walls, red tiles
 'osm/way/96955006':338, // Alte Pfarrkirche St. Martin: off-white walls, terracotta tiles
};
// Visible Munich church envelopes are commonly split into a main outline and
// independent building:part ways. Bind every photo-verified part so roofs,
// towers and side wings receive the same building palette. Families 339-356
// retain the documented cap/roof material where it differs from the body.
const munichSelectedPartFamilies:Record<string,number>={
 // St. Joachim
 'osm/way/549330491':310,'osm/way/549330492':310,'osm/way/549330493':310,
 // St. Bernhard parts are not relation-bound or fully contained; color only its exact queue outline.
 // Emmauskirche candidate adjacent ways retain their own profiles: the bell-tower shaft is wall-only,
 // while the low annex remains on its pre-existing gray-roof profile.
 'osm/way/165404826':311,'osm/way/328266441':312,
 // St. Gertrud
 'osm/way/145686671':313,'osm/way/116783687':313,
 // St. Stephan
 'osm/way/59695983':314,'osm/way/277816516':314,
 // St. Michael
 'osm/way/235179903':340,'osm/way/1022168594':315,
 'osm/way/1060311308':315,'osm/way/1060311309':315,'osm/way/1060311310':315,
 'osm/way/1060311311':315,'osm/way/1060311314':339,'osm/way/1060311315':339,
 // Alte Pfarrkirche St. Margaret, relation 11760065
 'osm/way/859567658':316,'osm/way/859567657':316,'osm/way/859567656':316,
 'osm/way/447306919':316,'osm/way/859980927':316,'osm/way/859980928':316,
 // Wallfahrtskirche St. Anna
 'osm/way/1463471305':317,
 // Namen Jesu
 'osm/way/379174388':319,'osm/way/319152770':342,'osm/way/378496279':341,
 // St. Lukas: green copper parts use a separate roof material family.
 'osm/way/420056329':347,'osm/way/420056330':347,'osm/way/420056331':367,
 'osm/way/420056332':347,'osm/way/420056333':320,'osm/way/420056334':347,
 'osm/way/420056335':347,'osm/way/420056336':320,'osm/way/420056337':347,
 'osm/way/420056338':347,'osm/way/420056339':347,'osm/way/420056340':347,
 'osm/way/420056341':347,'osm/way/420056342':347,'osm/way/420056343':347,
 'osm/way/420056345':320,'osm/way/420056346':320,'osm/way/420056347':320,
 'osm/way/420056348':347,'osm/way/420056349':320,'osm/way/420056350':320,
 'osm/way/420056351':347,'osm/way/420056352':320,'osm/way/420056353':320,
 'osm/way/420056354':320,'osm/way/420056355':347,'osm/way/420056356':347,
 'osm/way/420056357':347,'osm/way/420056358':347,'osm/way/420056359':347,
 'osm/way/420056360':367,'osm/way/420056361':367,'osm/way/420056362':347,
 'osm/way/420559811':347,'osm/way/420577966':347,'osm/way/420577967':347,
 'osm/way/420577968':320,'osm/way/420577969':320,
 // Alte St. Johann Baptist
 'osm/way/207657336':348,'osm/way/295504841':321,'osm/way/295504843':321,'osm/way/305352903':321,
 // Hl. Kreuz Forstenried
 'osm/relation/5752040':322,'osm/way/400342477':349,'osm/way/214423601':322,
 'osm/way/166011714':322,'osm/way/214423603':350,
 // St. Paul
 'osm/way/305459315':351,'osm/way/305459317':351,'osm/way/305459915':323,
 'osm/way/305459916':323,'osm/way/305459917':323,'osm/way/305462614':323,
 'osm/way/305466303':358,'osm/way/1186970960':351,'osm/way/1427138663':323,
 // Friedenskirche
 'osm/way/1458758611':293,'osm/way/1458758612':293,'osm/way/1458758616':352,'osm/way/798119943':352,
 // St. Ludwig
 'osm/way/358879139':353,'osm/way/358879140':353,'osm/way/580947522':353,
 'osm/way/580947520':354,'osm/way/580947521':354,'osm/way/124735806':325,'osm/way/124735810':325,
 // St. Heinrich
 'osm/way/362745315':356,'osm/way/362745320':355,'osm/way/362745322':326,
 // Maria Schutz
 'osm/way/156810445':327,'osm/way/157253680':327,'osm/way/157253689':327,
 'osm/way/157253690':327,'osm/way/157253692':327,'osm/way/204797869':327,
 'osm/way/204797890':327,'osm/way/204797936':327,'osm/way/204797951':327,
 // St. Rupert
 'osm/way/147727388':328,
 // Christuskirche
 'osm/way/1417481490':342,'osm/way/1417481491':342,
 'osm/way/1417481492':329,'osm/way/1417481493':329,'osm/way/1417481494':329,'osm/way/1417481495':329,
 // Zu den heiligen zwölf Aposteln
 'osm/way/684672499':362,'osm/way/684672500':330,'osm/way/684672501':330,'osm/way/684672502':330,
 // St. Willibrord, relation 6010805
 'osm/way/93979505':331,'osm/way/194281240':331,'osm/way/400412294':331,'osm/way/400412295':331,
 // St. Leonhard
 'osm/way/219543999':344,
 // Sankt Theresia: four copper-green side roofs plus the remaining ochre/terracotta part.
 'osm/way/1293114656':345,'osm/way/1293114657':345,'osm/way/1293114658':345,
 'osm/way/1293380941':345,'osm/way/1293380942':296,
 // St. Matthäus campanile
 'osm/way/421473138':333,
 // St. Margaret, relation 6256518: green copper tower roofs and red tiled body roofs.
 'osm/way/420917942':343,'osm/way/420917941':343,'osm/relation/6256524':343,'osm/way/420917649':343,
 'osm/way/420917646':334,'osm/way/420917648':334,'osm/way/420917650':334,
 'osm/way/420917647':334,'osm/way/192718545':334,
 // Heilig Kreuz Giesing
 'osm/way/378467919':335,'osm/way/378467912':335,'osm/way/378467921':335,
 'osm/way/378668274':335,'osm/way/378668806':335,
 // Maria Rosenkranzkönigin bell tower
 'osm/way/225015706':346,
 // Alte Pfarrkirche Sankt Martin bell tower
 'osm/way/1033635375':338,
};
export const PAINT_FAMILIES = ['原材色','砖墙与拱窗','古典石材与柱式','哥特式窗拱与扶壁线','巴洛克墙面与窗套','木构与灰泥','工业砖墙与大窗','玻璃幕墙','砖基座与玻璃上部','普通现代墙面'] as const;
export function paintFamily(c:BuildingComponent):number {
 const missingRefFamily=munichMissingReferencePartFamily(c);if(missingRefFamily!==undefined)return missingRefFamily;
 const kapernaumFamily=munichKapernaumPartFamily(c);if(kapernaumFamily!==undefined)return kapernaumFamily;
 const nazarethFamily=munichNazarethPartFamily(c);if(nazarethFamily!==undefined)return nazarethFamily;
 const midqueueFamily=munichMidqueuePartFamily(c);if(midqueueFamily!==undefined)return midqueueFamily;
 const chapelFamily=munichChapelPartFamily(c);if(chapelFamily!==undefined)return chapelFamily;
 const remainingFamily=munichRemainingPartFamily(c);if(remainingFamily!==undefined)return remainingFamily;
 const priorPartFamily=munichPriorPartFamily(c);if(priorPartFamily!==undefined)return priorPartFamily;
 const queuePartFamily=munichQueuePartFamily(c);if(queuePartFamily!==undefined)return queuePartFamily;
 const nurembergPartFamily=nurembergNon500PartFamily(c);if(nurembergPartFamily!==undefined)return nurembergPartFamily;
 const leipzigPartFamily=leipzigNon500PartFamily(c);if(leipzigPartFamily!==undefined)return leipzigPartFamily;
 if(c.city==='cologne'&&(c.objectId==='osm/way/155424472'||cologneStAgnesOtherParts.has(c.objectId)))return c.sourceFeature.properties?.['roof:material']==='slate'?300.2:300;
 if(c.city==='cologne'&&cologneStAgnesTowerParts.has(c.objectId))return 300.1;
 if(c.city==='munich'&&munichStUrsulaPaintIds.has(c.objectId))return 290;
 const carolinenFamily=munichCarolinenPartFamily(c);if(carolinenFamily!==undefined)return carolinenFamily;
 if(c.city==='munich'&&munichSelectedPartFamilies[c.objectId]!==undefined)return munichSelectedPartFamilies[c.objectId];
 if(c.city==='munich'&&munichSelectedPaintFamilies[c.objectId]!==undefined)return munichSelectedPaintFamilies[c.objectId];
 // Target-only paint profiles for the two screened non500 Munich churches.
 if(c.city==='munich'&&c.objectId==='osm/way/24796397')return 293;
 if(c.city==='munich'&&c.objectId==='osm/way/46620561')return 295;
 if(c.city==='munich'&&c.objectId==='osm/way/41398526')return 296;
 if(c.city==='munich'&&c.objectId==='osm/way/1293381718')return 297;
 if(c.city==='munich'&&c.objectId==='osm/relation/17731590')return 298;
 if(c.city==='munich'&&(c.objectId==='osm/way/29553428'||c.objectId==='osm/way/1155040012'))return c.objectId==='osm/way/29553428'?286:287;
 if(c.city==='berlin'&&c.objectId==='osm/way/36878854')return 289;
 // Paint every rendered surface in the exact target way; never exclude a represented tower part.
 // Do not synthesize architectural geometry absent from the source model.
 if(c.city==='berlin'&&c.objectId==='osm/way/37826765')return 299;
 if(c.city==='berlin'&&c.objectId==='osm/way/105810910')return 291;
 if(c.city==='berlin'&&c.objectId==='osm/way/35444548')return 285;
 // Detached St. Ansgar bell tower: separate 26 m native tower way only.
 if(c.city==='berlin'&&c.objectId==='osm/way/404905998')return 301;
 if(c.city==='berlin'&&c.objectId==='osm/way/326747488')return 281;
 // The exact photograph and OSM tower:type identify this adjacent shaft as St. Benedikt's campanile.
 if(c.city==='berlin'&&c.objectId==='osm/way/326747491')return 282;
 if(c.city==='berlin'&&c.objectId==='osm/way/334114500')return 283;
 if(c.city==='berlin'&&berlinStChristophorusLayouts[c.objectId]!==undefined)return berlinStChristophorusLayouts[c.objectId];
 if(c.city==='berlin'&&c.objectId==='osm/way/267429555')return 268;
 // OSM2World part geometry is co-located with, and matches the hipped-roof core of, canonical target way 30432465.
 if(c.city==='berlin'&&c.objectId==='osm/way/1539624491')return 269;
 if(c.city==='berlin'&&c.objectId==='osm/way/25038927')return 267;
 if(c.city==='berlin'&&['osm/way/25015133','osm/way/1525013491','osm/way/1525013492','osm/way/1525013494'].includes(c.objectId))return 263;
 if(c.city==='berlin'&&(c.objectId==='osm/way/1525013495'||c.objectId==='osm/way/1535199775'))return 264;
 if(c.city==='berlin'&&c.objectId==='osm/way/1535199776')return 265;
 if(c.city==='berlin'&&(c.objectId==='osm/way/1525013493'||c.objectId==='osm/way/1539616383'))return 266;
 if(c.city==='berlin'&&c.objectId==='osm/way/24964784')return 262;
 if(c.city==='berlin'&&c.objectId==='osm/way/54633597')return 235;
 if(c.city==='berlin'&&c.objectId==='osm/way/58523377')return 236;
 if(c.city==='berlin'&&c.objectId==='osm/way/45664095')return 234;
 const ownerApprovedMoorburg=c.city==='hamburg'&&c.objectId==='osm/way/101264815';
 const lutherkirche=c.city==='hamburg'&&c.objectId==='osm/way/101264816';
 const michaeliskirche=c.city==='hamburg'&&c.objectId==='osm/way/101558357';
 const hamburgNon500Church=c.city==='hamburg'?hamburgNon500ChurchLayouts[c.objectId]:undefined;
 const bremenNon500Church=c.city==='bremen'?bremenNon500ChurchLayouts[c.objectId]:undefined;
 const frankfurtNon500Church=c.city==='frankfurt'?frankfurtNon500ChurchLayouts[c.objectId]:undefined;
 const dusseldorfNon500Church=c.city==='dusseldorf'?dusseldorfNon500ChurchLayouts[c.objectId]:undefined;
 if(!isDescribedBuilding(c)&&!ownerApprovedMoorburg&&!lutherkirche&&!michaeliskirche&&hamburgNon500Church===undefined&&bremenNon500Church===undefined&&frankfurtNon500Church===undefined&&dusseldorfNon500Church===undefined)return 0;
 if(c.city==='hannover'&&c.objectId==='osm/way/190740082')return 280;
 // Exact owner-approved visual approximation; the native schematic geometry is unchanged.
 if(ownerApprovedMoorburg)return 240;
 if(lutherkirche)return 243;
 if(michaeliskirche)return 245;
 if(hamburgNon500Church!==undefined)return hamburgNon500Church;
 if(bremenNon500Church!==undefined)return bremenNon500Church;
 if(frankfurtNon500Church!==undefined)return frankfurtNon500Church;
 if(dusseldorfNon500Church!==undefined)return dusseldorfNon500Church;
 const p=c.sourceFeature.properties??{}, id=c.objectId.split('/').at(-1)!;
 if(c.city==='berlin'&&REICHSTAG_NATIVE_IDS.has(id))return 200;
 if(c.city==='munich'&&RESIDENZ_NATIVE_IDS.has(id))return 180;
 if(c.city==='munich'&&RATHAUS_NATIVE_IDS.has(id))return 120;
 if(c.city==='munich'&&FRAUEN_NATIVE_IDS.has(id))return 124;
 if(c.city==='hamburg'&&MICHEL_NATIVE_IDS.has(id))return 160;
 if(c.city==='hamburg'&&rathausHamburg.has(id))return 100;
 if(c.city==='hamburg'&&PETRI_NATIVE_IDS.has(id))return 150;
 if(c.city==='hamburg'&&c.objectId==='osm/relation/19883203')return 108;
 if(c.city==='hamburg'&&ELB_NATIVE_IDS.has(id))return 140;
 if(c.city==='munich'&&c.objectId==='osm/relation/147095')return -3;
 const architecture=String(p['building:architecture']??p['architectural_style']??p['architecture']??'').toLowerCase();
 const material=String(p['building:material']??'').toLowerCase(),kind=String(p.building??'');
 if(['roof','shed','carport','garage','garages'].includes(kind))return 0;
 if(/gothic|gotik/.test(architecture))return -3;
 if(/baroque|barock|rococo|rokoko/.test(architecture))return -4;
 if(/renaissance|classical|klassiz|roman|antique/.test(architecture))return -2;
 if(/timber|wood|fachwerk/.test(architecture+' '+material))return -5;
 if(material==='glass'||p['facade:material']==='glass')return 7;
 if(['industrial','warehouse','factory'].includes(kind))return -6;
 if(material==='brick')return -1;
 if(/stone|sandstone|limestone|granite/.test(material))return -2;
 if(kind==='church'||kind==='cathedral')return -3;
 return -9;
}

/** Fast, source-specific paint frames for Lutherkirche's exact flat extrusion. */
function lutherkircheNativePaint(c:BuildingComponent):Float32Array{
 const total=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(total*5);
 const axisX=.968147,axisZ=.25038;let top=-Infinity,u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
 for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3)top=Math.max(top,b.positions[j+1]);
 const isRoof=c.batches.map(b=>new Uint8Array(b.positions.length/3));
 c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
  const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],roof=ids.every(id=>Math.abs(b.positions[id*3+1]-top)<.02&&b.normals[id*3+1]>.98);
  if(!roof)continue;
  for(const id of ids){const p=id*3,x=b.positions[p],z=b.positions[p+2],u=axisX*x+axisZ*z,v=-axisZ*x+axisX*z;isRoof[bi][id]=1;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
 }});
 const roofH=Math.max(.1,v1-v0),roofW=Math.max(.1,u1-u0);let at=0;
 c.batches.forEach((b,bi)=>{for(let id=0;id<b.positions.length/3;id++){
  const p=id*3,x=b.positions[p],y=b.positions[p+1],z=b.positions[p+2];
  if(isRoof[bi][id]){const u=axisX*x+axisZ*z,v=-axisZ*x+axisX*z;out.set([u-u0,v-v0,roofH,roofW,244],at);}
  else {
   // The native flat-mesh decoder emits independent four-vertex wall quads.
   // Keep each original quad's brick courses aligned to its own wall axis.
   const edgeBase=Math.floor(id/4)*4,a=edgeBase*3,bx=(edgeBase+1)*3,dx=b.positions[bx]-b.positions[a],dz=b.positions[bx+2]-b.positions[a+2],length=Math.max(.1,Math.hypot(dx,dz));
   const along=((x-b.positions[a])*dx+(z-b.positions[a+2])*dz)/length;
   out.set([along,y,Math.max(.1,top),length,243],at);
  }
  at+=5;
 }});
 return out;
}

/** Exact source-only frame for Michaeliskirche's flat cross-plan extrusion. */
function michaeliskircheNativePaint(c:BuildingComponent):Float32Array{
 const total=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(total*5);
 const axisX=.90,axisZ=-.435,sideX=.435,sideZ=.90;
 let top=-Infinity,u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
 for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3)top=Math.max(top,b.positions[j+1]);
 const roof=c.batches.map(b=>new Uint8Array(b.positions.length/3));
 c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
  const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]];
  const isRoof=ids.every(id=>Math.abs(b.positions[id*3+1]-top)<.02&&b.normals[id*3+1]>.98);
  if(!isRoof)continue;
  for(const id of ids){const p=id*3,x=b.positions[p],z=b.positions[p+2],u=axisX*x+axisZ*z,v=sideX*x+sideZ*z;roof[bi][id]=1;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
 }});
 let at=0;
 c.batches.forEach((b,bi)=>{for(let id=0;id<b.positions.length/3;id++){
  const p=id*3,x=b.positions[p],y=b.positions[p+1],z=b.positions[p+2];
  if(roof[bi][id]){
   out.set([axisX*x+axisZ*z-u0,sideX*x+sideZ*z-v0,Math.max(.1,v1-v0),Math.max(.1,u1-u0),245],at);
  }else{
   // Flat mesh wall batches retain one four-vertex quad per original outline edge.
   const edge=Math.floor(id/4),base=edge*4,a=base*3,bx=(base+1)*3,dx=b.positions[bx]-b.positions[a],dz=b.positions[bx+2]-b.positions[a+2],length=Math.max(.1,Math.hypot(dx,dz));
   const along=((x-b.positions[a])*dx+(z-b.positions[a+2])*dz)/length;
   out.set([along,y,Math.max(.1,top),length,246],at);
  }
  at+=5;
 }});
 return out;
}

/** Stable wall and apex-centred roof frames for the exact Zehlendorf native hipped-roof part. */
function dorfkircheZehlendorfNativePaint(c:BuildingComponent):Float32Array{
 const total=c.batches.reduce((n,b)=>n+b.positions.length/3,0),out=new Float32Array(total*5);
 const roof=c.batches.map(b=>new Uint8Array(b.positions.length/3));
 let roofTop=-Infinity,wallTop=-Infinity,apexX=0,apexZ=0,apexN=0,radius=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
  const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
  const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);
  if(len<1e-7||ny/len<=.18)continue;
  for(const id of ids){const p=id*3;roof[bi][id]=1;roofTop=Math.max(roofTop,b.positions[p+1]);}
 }});
 c.batches.forEach((b,bi)=>{for(let id=0;id<b.positions.length/3;id++){
  const p=id*3,x=b.positions[p],y=b.positions[p+1],z=b.positions[p+2];
  if(roof[bi][id]){
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
   if(y>=roofTop-.025){apexX+=x;apexZ+=z;apexN++;}
  }else wallTop=Math.max(wallTop,y);
 }});
 if(apexN){apexX/=apexN;apexZ/=apexN;}else{apexX=(minX+maxX)*.5;apexZ=(minZ+maxZ)*.5;}
 c.batches.forEach((b,bi)=>{for(let id=0;id<b.positions.length/3;id++)if(roof[bi][id]){const p=id*3;radius=Math.max(radius,Math.hypot(b.positions[p]-apexX,b.positions[p+2]-apexZ));}});
 radius=Math.max(radius,.2);if(!Number.isFinite(wallTop)||wallTop<=0)wallTop=Number.isFinite(roofTop)?roofTop:1;
 let at=0;
 c.batches.forEach((b,bi)=>{for(let id=0;id<b.positions.length/3;id++){
  const p=id*3,x=b.positions[p],y=b.positions[p+1],z=b.positions[p+2];
  if(roof[bi][id])out.set([x-apexX,z-apexZ,radius,-1,269],at);
  else out.set([x,y,wallTop,Math.max(maxX-minX,maxZ-minZ,1),269],at);
  at+=5;
 }});
 return out;
}

/** Read original surfaces to attach paint coordinates; never create, move, remove or retriangulate a vertex. */
export function facadePaintData(components:BuildingComponent[]):Float32Array<ArrayBuffer> {
 const vertices=components.reduce((n,c)=>n+c.batches.reduce((k,b)=>k+b.positions.length/3,0),0),out=new Float32Array(vertices*5);let at=0;
 configureElbRoofPaint(components);configurePetriPaint(components);configureMichelPaint(components);
 const rathausParent=components.find(c=>c.city==='munich'&&c.objectId==='osm/relation/147095');configureRathausRoofPaint(rathausParent);
 const rathausReference=rathausPaintReference(rathausParent);
 for(const c of components){
  const family=paintFamily(c);if(family===0){at+=c.batches.reduce((n,b)=>n+b.positions.length/3,0)*5;continue;}
  // These profiles paint materials, not repeated facade openings. Every native
  // vertex keeps its family, including curved caps and narrow/ambiguous faces;
  // no wall-plane grouping is needed for this batch.
  if((c.city==='munich'&&(family===293||(family>=296&&family<=298)||munichMaterialPalette(family)!==undefined))||(c.city==='nuremberg'&&nurembergMaterialPalette(family)!==undefined)||(c.city==='leipzig'&&leipzigMaterialPalette(family)!==undefined)){
   const tags=c.sourceFeature.properties??{},bodyColor=String(tags['building:colour']??'').toLowerCase();
   const paletteFamily=(family===320||family===347)?(bodyColor==='green'?358:bodyColor==='gray'?359:bodyColor==='sand'?(family===347?360:361):family):family;
   let low=Infinity,high=-Infinity;
   for(const b of c.batches)for(let j=1;j<b.positions.length;j+=3){low=Math.min(low,b.positions[j]);high=Math.max(high,b.positions[j]);}
   const palette=c.city==='nuremberg'?nurembergMaterialPalette(paletteFamily):c.city==='leipzig'?leipzigMaterialPalette(paletteFamily):munichMaterialPalette(paletteFamily);
   for(const b of c.batches){
    const roles=new Uint8Array(b.positions.length/3);
    if(b.faceRole==='roof')roles.fill(2);
    else if(b.faceRole==='wall')roles.fill(1);
    else for(let tri=0;tri<b.indices.length;tri+=3){
     const ids=[b.indices[tri],b.indices[tri+1],b.indices[tri+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
     const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
     const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
     const role=Math.abs(ny)>.001*Math.hypot(nx,ny,nz)?2:1;
     for(const id of ids)roles[id]|=role;
    }
    for(let j=0;j<b.positions.length;j+=3){
    if([369,421,433,440,441].includes(paletteFamily)){
     const roof=roles[j/3]===2||(roles[j/3]===3&&Math.abs(b.normals[j+1])>.2);
     // These source-specific material boundaries cross native roof triangles.
     // Interpolate original component-local X/Z for exact per-fragment masks.
     const fragmentFamily=paletteFamily===433?372:paletteFamily===421?373:paletteFamily===369?374:paletteFamily===440?376:375;
     out.set([b.positions[j],b.positions[j+1]-low,b.positions[j+2],Math.max(.1,high-low)*(roof?-1:1),fragmentFamily],at);
    }else if(palette){
     // Pack both material colors; fragment triangle geometry chooses the
     // actual face role. Quantized vertex normals cannot classify wall/roof
     // colors reliably near the eaves or on nearly vertical surfaces.
     const pack=(rgb:number[])=>Math.round(rgb[0]*255)*65536+Math.round(rgb[1]*255)*256+Math.round(rgb[2]*255);
     const roof=palette.roofOnly||roles[j/3]===2||(roles[j/3]===3&&Math.abs(b.normals[j+1])>.2);
     const displayRGB=b.materialName==='church-display-cap'?[.12,.15,.18]:b.materialName==='church-display-terracotta-cap'?[.68,.34,.18]:b.materialName==='church-display-rupert-tiles'?[.71,.36,.22]:b.materialName==='church-display-brick-gable'?[.60,.32,.24]:b.materialName==='church-display-tower-cap'?[.29,.37,.34]:b.materialName==='church-display-copper-cap'?[.29,.48,.39]:b.materialName==='church-display-window'?[.045,.065,.075]:b.materialName==='church-display-door'?[.22,.105,.07]:b.materialName==='church-display-louver'?[.27,.28,.27]:b.materialName==='church-display-ivy'?[.2,.36,.17]:b.materialName==='church-display-ivy-light'?[.32,.47,.23]:b.materialName==='church-display-clock'?[.75,.62,.36]:b.materialName==='church-display-pale-trim'?[.93,.90,.82]:b.materialName==='church-display-canopy-roof'?[.12,.115,.11]:b.materialName==='church-display-canopy-wood'?[.2,.15,.12]:b.materialName==='church-display-stone'&&paletteFamily===632?[.51,.25,.22]:b.materialName==='church-display-stone'?[.73,.68,.58]:b.materialName==='church-display-martin-ochre-band'?[.78,.59,.29]:b.materialName==='church-display-martin-red-band'?[.61,.31,.2]:b.materialName==='church-display-finial'?[.55,.48,.30]:undefined;
     if(displayRGB)out.set([pack(displayRGB),b.positions[j+1]-low,pack(displayRGB),Math.max(.1,high-low)*(roof?-1:1),377],at);
     else if(b.materialName==='church-display-roof')out.set([pack(palette.wall??palette.roof??[0,0,0]),b.positions[j+1]-low,pack(palette.roof??palette.wall??[0,0,0]),Math.max(.1,high-low)*(roof?-1:1),377],at);
     else if(!((palette.wallOnly&&roof)||(palette.onlyRoofFaces&&!roof)))out.set([pack(palette.wall??palette.roof??[0,0,0]),b.positions[j+1]-low,pack(palette.roof??palette.wall??[0,0,0]),Math.max(.1,high-low)*(roof?-1:1),paletteFamily===355?366:paletteFamily===368?369:paletteFamily===423?370:365],at);
    }else {const roof=roles[j/3]===2||(roles[j/3]===3&&Math.abs(b.normals[j+1])>.2);out.set([b.positions[j],b.positions[j+1]-low,0,Math.max(.1,high-low)*(roof?-1:1),paletteFamily],at);}
    at+=5;
   }}
   continue;
  }
  if(family===200){const paint=reichstagNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===180){const paint=residenzNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===140){const paint=elbphilharmonieNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===160){const paint=michelNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===150){const paint=petriNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===120){const paint=alignRathausWingPaint(c,rathausNativePaint(c),rathausReference);out.set(paint,at);at+=paint.length;continue;}
  if(family===124){const paint=frauenNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  // St. Agnes has high-vertex-count native church polygons whose vertical wall vertices
  // are shared across adjacent planes. Keep the exact object family on every original
  // vertex; the fragment shader paints vertical faces and preserves roof-facing normals.
  if(family>=300&&family<301){for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3){out.set([b.positions[j],b.positions[j+1],0,0,family],at);at+=5;}continue;}
  if(family===243){const paint=lutherkircheNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===245){const paint=michaeliskircheNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  if(family===269){const paint=dorfkircheZehlendorfNativePaint(c);out.set(paint,at);at+=paint.length;continue;}
  const raw=c.sourceFeature.properties??{},clockOwner=c.city==='hamburg'&&c.objectId==='osm/way/255659998',sourceHeight=Number(raw.height),sourceRoofHeight=Number(raw['roof:height']),sourceMinHeight=Number(raw.min_height??0);
  // Native eaves bound the painted wall zone even when a vertical gable face narrows at its peak.
  const wallTop=family===100&&Number.isFinite(sourceHeight)&&Number.isFinite(sourceRoofHeight)&&sourceRoofHeight>0&&sourceHeight-sourceRoofHeight>sourceMinHeight?sourceHeight-sourceRoofHeight:undefined;
  const groups=new Map<string,{nx:number;nz:number;planeNx:number;planeNy:number;planeNz:number;distance:number;u0:number;u1:number;y0:number;y1:number;bottom0:number;bottom1:number;top0:number;top1:number;clockOnly:boolean}>();
  const exactPlanes=new Map<string,string>(),directionBuckets=new Map<string,string[]>(),normalTolerance=.008,planeTolerance=.25;
  const mappings=c.batches.map(b=>Array<string|undefined>(b.positions.length/3)),ambiguous=c.batches.map(()=>new Set<number>()),roofMarks=c.batches.map(b=>new Uint8Array(b.positions.length/3));
  let moorburgTop=-Infinity,moorburgX0=Infinity,moorburgX1=-Infinity,moorburgZ0=Infinity,moorburgZ1=-Infinity;
  let hamburgRoofX0=Infinity,hamburgRoofX1=-Infinity,hamburgRoofZ0=Infinity,hamburgRoofZ1=-Infinity;
  let lietzowSlopeXX=0,lietzowSlopeXZ=0,lietzowSlopeZZ=0;
  if(family>=247&&family<=261||family===288||family===289){for(const b of c.batches)for(let i=0;i<b.positions.length;i+=3)if(b.faceRole!=='wall'&&b.normals[i+1]>.15){hamburgRoofX0=Math.min(hamburgRoofX0,b.positions[i]);hamburgRoofX1=Math.max(hamburgRoofX1,b.positions[i]);hamburgRoofZ0=Math.min(hamburgRoofZ0,b.positions[i+2]);hamburgRoofZ1=Math.max(hamburgRoofZ1,b.positions[i+2]);if(family===289){const horizontal=Math.hypot(b.normals[i],b.normals[i+2]);if(horizontal>.12){const nx=b.normals[i]/horizontal,nz=b.normals[i+2]/horizontal;lietzowSlopeXX+=nx*nx;lietzowSlopeXZ+=nx*nz;lietzowSlopeZZ+=nz*nz;}}}}
  const lietzowSlopeAngle=.5*Math.atan2(2*lietzowSlopeXZ,lietzowSlopeXX-lietzowSlopeZZ),lietzowSlopeX=Math.cos(lietzowSlopeAngle),lietzowSlopeZ=Math.sin(lietzowSlopeAngle),lietzowRidgeX=-lietzowSlopeZ,lietzowRidgeZ=lietzowSlopeX;
  const christophorusRoofMarks=c.batches.map(b=>new Uint8Array(b.positions.length/3));
  let christophorusRoofX0=Infinity,christophorusRoofX1=-Infinity,christophorusRoofZ0=Infinity,christophorusRoofZ1=-Infinity;
  if(family>=271&&family<=277)c.batches.forEach((b,bi)=>{for(let i=0;i<b.positions.length;i+=3){if(b.faceRole==='wall'||b.normals[i+1]<=.15)continue;christophorusRoofMarks[bi][i/3]=1;christophorusRoofX0=Math.min(christophorusRoofX0,b.positions[i]);christophorusRoofX1=Math.max(christophorusRoofX1,b.positions[i]);christophorusRoofZ0=Math.min(christophorusRoofZ0,b.positions[i+2]);christophorusRoofZ1=Math.max(christophorusRoofZ1,b.positions[i+2]);}});
  const katharinenRoofMarks=c.batches.map(b=>new Uint8Array(b.positions.length/3));
  let katharinenRoofX0=Infinity,katharinenRoofX1=-Infinity,katharinenRoofZ0=Infinity,katharinenRoofZ1=-Infinity;
  if(family===291)c.batches.forEach((b,bi)=>{for(let i=0;i<b.positions.length;i+=3){if(b.faceRole==='wall'||(b.faceRole!=='roof'&&b.normals[i+1]<=.15))continue;katharinenRoofMarks[bi][i/3]=1;katharinenRoofX0=Math.min(katharinenRoofX0,b.positions[i]);katharinenRoofX1=Math.max(katharinenRoofX1,b.positions[i]);katharinenRoofZ0=Math.min(katharinenRoofZ0,b.positions[i+2]);katharinenRoofZ1=Math.max(katharinenRoofZ1,b.positions[i+2]);}});
  if(family===240){
   for(const b of c.batches)for(let j=0;j<b.positions.length;j+=3)if(b.normals[j+1]>.98)moorburgTop=Math.max(moorburgTop,b.positions[j+1]);
   if(Number.isFinite(moorburgTop))c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
    const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],top=ids.every(id=>Math.abs(b.positions[id*3+1]-moorburgTop)<.03&&b.normals[id*3+1]>.98);if(!top)continue;
    for(const id of ids){const p=id*3;roofMarks[bi][id]=1;moorburgX0=Math.min(moorburgX0,b.positions[p]);moorburgX1=Math.max(moorburgX1,b.positions[p]);moorburgZ0=Math.min(moorburgZ0,b.positions[p+2]);moorburgZ1=Math.max(moorburgZ1,b.positions[p+2]);}
   }});
  }
  const copperRoofPlanes=new Map<string,{nx:number;ny:number;nz:number;distance:number;ux:number;uz:number;vx:number;vy:number;vz:number;u0:number;u1:number;s0:number;s1:number}>(),copperRoofMappings=c.batches.map(b=>Array<string|undefined>(b.positions.length/3)),copperRoofAmbiguous=c.batches.map(()=>new Set<number>()),copperRoofExact=new Map<string,string>(),copperRoofDirections=new Map<string,string[]>();
  let roofTop=-Infinity,roofU0=Infinity,roofU1=-Infinity,roofV0=Infinity,roofV1=-Infinity,roofUX=.73,roofUZ=-.68,roofVX=-.68,roofVZ=-.73;
  // The Börse source object is a flat extrusion. Use only its original upward top faces for the three roof paint cues.
  if(family===108){
   c.batches.forEach(b=>{for(let i=0;i<b.indices.length;i+=3){const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(len<1e-7||Math.abs(ny/len)<.995)continue;
    roofTop=Math.max(roofTop,b.positions[a+1],b.positions[j+1],b.positions[k+1]);
   }});
   // Recover the Börse's dominant orthogonal axes from its original outer roof-ring edges.
   // Ignoring sub-3m ornamental steps keeps the painted halls aligned with the main native walls.
   const ringCount=c.componentGeometry.coordinates[0].length-1,roofBatch=c.batches.find(b=>b.positions.length>=ringCount*3&&Math.abs(b.positions[1]-roofTop)<.08&&b.normals[1]>.90);
   if(roofBatch){let cosine=0,sine=0;for(let i=0;i<ringCount;i++){const a=i*3,j=((i+1)%ringCount)*3,dx=roofBatch.positions[j]-roofBatch.positions[a],dz=roofBatch.positions[j+2]-roofBatch.positions[a+2],length=Math.hypot(dx,dz);if(length<3)continue;const angle=Math.atan2(dz,dx);cosine+=length*Math.cos(4*angle);sine+=length*Math.sin(4*angle);}
    if(Math.hypot(cosine,sine)>1e-7){const angle=Math.atan2(sine,cosine)/4;roofUX=Math.sin(angle);roofUZ=-Math.cos(angle);if(roofUX*.73-roofUZ*.68<0){roofUX=-roofUX;roofUZ=-roofUZ;}roofVX=roofUZ;roofVZ=-roofUX;}}
   if(Number.isFinite(roofTop))c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    const ux=b.positions[j]-b.positions[a],uy=b.positions[j+1]-b.positions[a+1],uz=b.positions[j+2]-b.positions[a+2],vx=b.positions[k]-b.positions[a],vy=b.positions[k+1]-b.positions[a+1],vz=b.positions[k+2]-b.positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);if(len<1e-7||Math.abs(ny/len)<.995||ids.some(id=>Math.abs(b.positions[id*3+1]-roofTop)>.08))continue;
    for(const id of ids){roofMarks[bi][id]=1;const p=id*3,u=roofUX*b.positions[p]+roofUZ*b.positions[p+2],v=roofVX*b.positions[p]+roofVZ*b.positions[p+2];roofU0=Math.min(roofU0,u);roofU1=Math.max(roofU1,u);roofV0=Math.min(roofV0,v);roofV1=Math.max(roofV1,v);}
   }});
  }
  // Broad native copper roof planes receive painted dormers in their own slope coordinates.
  // Their mesh positions, triangle indices and roof silhouette remain unchanged.
  if(family===100&&!clockOwner&&raw.man_made!=='tower')c.batches.forEach((b,bi)=>{
   const copper=b.color[1]>b.color[0]*1.12&&b.color[1]>b.color[2]*1.06;
   if(!copper||b.faceRole==='wall')return;
   for(let i=0;i<b.indices.length;i+=3){
    const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
    if(b.faceRole!=='roof'&&ids.some(id=>Math.abs(b.normals[id*3+1])<=.2))continue;
    const ax=b.positions[j]-b.positions[a],ay=b.positions[j+1]-b.positions[a+1],az=b.positions[j+2]-b.positions[a+2],bx0=b.positions[k]-b.positions[a],by=b.positions[k+1]-b.positions[a+1],bz0=b.positions[k+2]-b.positions[a+2];
    let nx=ay*bz0-az*by,ny=az*bx0-ax*bz0,nz=ax*by-ay*bx0;const len=Math.hypot(nx,ny,nz);if(len<1e-7)continue;nx/=len;ny/=len;nz/=len;
    if(nx*b.normals[a]+ny*b.normals[a+1]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
    if(ny<=.15||ny>=.98)continue;
    const distance=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2],exact=bi+'|'+Math.round(nx*10000)+','+Math.round(ny*10000)+','+Math.round(nz*10000)+','+Math.round(distance*20),bx=Math.round(nx/normalTolerance),bz=Math.round(nz/normalTolerance);
    let key=copperRoofExact.get(exact),g=key?copperRoofPlanes.get(key):undefined;
    if(!g){
     for(let dx=-1;dx<=1&&!g;dx++)for(let dz=-1;dz<=1&&!g;dz++)for(const candidate of copperRoofDirections.get(bi+'|'+(bx+dx)+','+(bz+dz))??[]){
      const plane=copperRoofPlanes.get(candidate)!;
      if(Math.hypot(nx-plane.nx,ny-plane.ny,nz-plane.nz)>normalTolerance||ids.some(id=>{const p=id*3;return Math.abs(plane.nx*b.positions[p]+plane.ny*b.positions[p+1]+plane.nz*b.positions[p+2]-plane.distance)>planeTolerance;}))continue;
      key=candidate;g=plane;break;
     }
     if(!g){key=String(copperRoofPlanes.size);const dl=Math.hypot(nx,nz);g={nx,ny,nz,distance,ux:-nz/dl,uz:nx/dl,vx:-ny*nx/dl,vy:dl,vz:-ny*nz/dl,u0:Infinity,u1:-Infinity,s0:Infinity,s1:-Infinity};copperRoofPlanes.set(key,g);const bucket=bi+'|'+bx+','+bz,list=copperRoofDirections.get(bucket)??[];list.push(key);copperRoofDirections.set(bucket,list);}
     copperRoofExact.set(exact,key!);
    }
    for(const id of ids){const p=id*3,u=g.ux*b.positions[p]+g.uz*b.positions[p+2],s=g.vx*b.positions[p]+g.vy*b.positions[p+1]+g.vz*b.positions[p+2];g.u0=Math.min(g.u0,u);g.u1=Math.max(g.u1,u);g.s0=Math.min(g.s0,s);g.s1=Math.max(g.s1,s);const old=copperRoofMappings[bi][id];if(old&&old!==key)copperRoofAmbiguous[bi].add(id);else copperRoofMappings[bi][id]=key;}
   }
  });
  // Original triangle planes provide stable wall directions despite quantized display normals.
  c.batches.forEach((b,bi)=>{for(let i=0;i<b.indices.length;i+=3){
   const ids=[b.indices[i],b.indices[i+1],b.indices[i+2]],a=ids[0]*3,j=ids[1]*3,k=ids[2]*3;
   const u=[b.positions[j]-b.positions[a],b.positions[j+1]-b.positions[a+1],b.positions[j+2]-b.positions[a+2]],v=[b.positions[k]-b.positions[a],b.positions[k+1]-b.positions[a+1],b.positions[k+2]-b.positions[a+2]];
   let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];const len=Math.hypot(nx,ny,nz);
   // Steep roofs can have near-horizontal normals. Only geometrically vertical faces receive windows.
   const slope=Math.abs(ny/len),stoneClockCandidate=clockOwner&&slope<=.15&&b.color[0]>.6&&b.color[1]>.55&&b.color[2]>.4&&Math.max(...b.color)/Math.max(.01,Math.min(...b.color))<1.45&&Math.max(b.positions[a+1],b.positions[j+1],b.positions[k+1])>48&&Math.min(b.positions[a+1],b.positions[j+1],b.positions[k+1])<70;
   if(len<1e-7||(slope>.001&&!stoneClockCandidate))continue;nx/=len;ny/=len;nz/=len;
   if(nx*b.normals[a]+nz*b.normals[a+2]<0){nx=-nx;ny=-ny;nz=-nz;}
   const distance=nx*b.positions[a]+ny*b.positions[a+1]+nz*b.positions[a+2],exactKey=Math.round(nx*10000)+','+Math.round(ny*10000)+','+Math.round(nz*10000)+','+Math.round(distance*20),bx=Math.round(nx/normalTolerance),bz=Math.round(nz/normalTolerance);
   let key=exactPlanes.get(exactKey),g=key?groups.get(key):undefined;
   if(!g){
    // Group cm-quantized triangles into one paint plane; original mesh arrays are read only.
    for(let dx=-1;dx<=1&&!g;dx++)for(let dz=-1;dz<=1&&!g;dz++)for(const candidate of directionBuckets.get((bx+dx)+','+(bz+dz))??[]){
     const plane=groups.get(candidate)!;
     if(Math.hypot(nx-plane.planeNx,nz-plane.planeNz)>normalTolerance||Math.abs(ny-plane.planeNy)>(stoneClockCandidate ? .008 : .002))continue;
     if(ids.some(id=>{const p=id*3;return Math.abs(plane.planeNx*b.positions[p]+plane.planeNy*b.positions[p+1]+plane.planeNz*b.positions[p+2]-plane.distance)>planeTolerance;}))continue;
     key=candidate;g=plane;break;
    }
    if(!g){key=String(groups.size);const dl=Math.hypot(nx,nz);g={nx:nx/dl,nz:nz/dl,planeNx:nx,planeNy:ny,planeNz:nz,distance,u0:Infinity,u1:-Infinity,y0:Infinity,y1:-Infinity,bottom0:Infinity,bottom1:-Infinity,top0:Infinity,top1:-Infinity,clockOnly:slope>.001};groups.set(key,g);const bucket=bx+','+bz,list=directionBuckets.get(bucket)??[];list.push(key);directionBuckets.set(bucket,list);}
    exactPlanes.set(exactKey,key!);
   }
   g.clockOnly||=slope>.001;
   for(const id of ids){const p=id*3,x=-g.nz*b.positions[p]+g.nx*b.positions[p+2],y=b.positions[p+1];g.u0=Math.min(g.u0,x);g.u1=Math.max(g.u1,x);
    if(y<g.y0-.02){g.y0=y;g.bottom0=x;g.bottom1=x;}else if(Math.abs(y-g.y0)<=.02){g.bottom0=Math.min(g.bottom0,x);g.bottom1=Math.max(g.bottom1,x);}
    if(y>g.y1+.02){g.y1=y;g.top0=x;g.top1=x;}else if(Math.abs(y-g.y1)<=.02){g.top0=Math.min(g.top0,x);g.top1=Math.max(g.top1,x);}
    const old=mappings[bi][id];if(old&&old!==key)ambiguous[bi].add(id);else mappings[bi][id]=key;}
  }});
  let moorburgFacadeKey:string|undefined;if(family===240){let widest=0;for(const[key,g]of groups)if(!g.clockOnly&&g.nz<-.85&&Math.abs(g.nx)<.35&&g.u1-g.u0>widest){moorburgFacadeKey=key;widest=g.u1-g.u0;}}
  c.batches.forEach((b,bi)=>{for(let j=0;j<b.positions.length;j+=3){const id=j/3,key=mappings[bi][id],g=key?groups.get(key):undefined,taper=g&&(g.y1-g.y0)>1.5*(g.u1-g.u0)&&(g.top1-g.top0)<.55*Math.max(.1,g.bottom1-g.bottom0),clockOnly=clockOwner&&g&&g.y0<58&&g.y1>58&&(g.y1-g.y0)>48&&(g.u1-g.u0)>=5&&(g.u1-g.u0)<24&&b.color[0]>.6&&b.color[1]>.55&&b.color[2]>.4&&Math.max(...b.color)/Math.max(.01,Math.min(...b.color))<1.45,wallY1=g?Math.min(g.y1,wallTop??g.y1):0,wallHeight=g?wallY1-g.y0:0,valid=g&&(!taper||clockOnly||wallTop!==undefined||(family>=270&&family<=277)||family===281||family===282||family===283||family===288||family===289||family===291)&&!ambiguous[bi].has(id)&&wallHeight>.4&&g.u1-g.u0>.6;
   const hamburgRoof=(family>=247&&family<=261||family===288)&&b.normals[j+1]>.15&&hamburgRoofX1-hamburgRoofX0>.6&&hamburgRoofZ1-hamburgRoofZ0>.6;
   const altLietzowRoof=family===289&&b.faceRole!=='wall'&&b.normals[j+1]>.15&&hamburgRoofX1-hamburgRoofX0>.6&&hamburgRoofZ1-hamburgRoofZ0>.6;
   const christophorusRoof=family>=271&&family<=277&&christophorusRoofMarks[bi][id]===1&&christophorusRoofX1-christophorusRoofX0>.6&&christophorusRoofZ1-christophorusRoofZ0>.6;
   const katharinenRoof=family===291&&katharinenRoofMarks[bi][id]===1&&katharinenRoofX1-katharinenRoofX0>.6&&katharinenRoofZ1-katharinenRoofZ0>.6;
   const moorburgRoof=family===240&&roofMarks[bi][id]===1&&moorburgX1-moorburgX0>.6&&moorburgZ1-moorburgZ0>.6;
   const rooftop=family===108&&roofMarks[bi][id]===1&&b.normals[j+1]>.90&&roofU1-roofU0>.6&&roofV1-roofV0>.6;
   const copperKey=copperRoofMappings[bi][id],copperPlane=copperKey?copperRoofPlanes.get(copperKey):undefined,copperDirection=copperPlane?(copperPlane.nx*.68+copperPlane.nz*.73)/Math.hypot(copperPlane.nx,copperPlane.nz):0,copperAdmitted=copperPlane&&!copperRoofAmbiguous[bi].has(id)&&copperPlane.u1-copperPlane.u0>=25&&copperPlane.s1-copperPlane.s0>=5&&Math.abs(copperDirection)>.52;
   let profile=family;if(family===240&&valid&&g)profile=key===moorburgFacadeKey?240:242;if(clockOnly)profile=107;else if(valid&&g){const H=wallHeight,W=g.u1-g.u0;if(family===100){if(H>48&&W>=5&&W<24)profile=103;else if(H>=12&&W>=20){const front=g.nx*.68+g.nz*.73;profile=front>.52?100:front<-.52?101:102;}else if(H>=12&&W>=6)profile=102;else profile=-2;}else if(family===104){if(H>1.8*W&&H>30&&W>=5)profile=105;else if(H>=12&&W>=14)profile=104;else profile=-1;}else if(family===108){if(W<4||H<3)profile=-2;else profile=(g.nx*(-.68)+g.nz*(-.73))>.52?108:109;}}
   if(family===289&&valid&&g){const ridgeAlignment=Math.abs(g.nx*lietzowRidgeX+g.nz*lietzowRidgeZ);profile=lietzowSlopeXX+lietzowSlopeZZ>.1&&ridgeAlignment>.72?289.1:289.2;}
   if(katharinenRoof)out.set([b.positions[j]-katharinenRoofX0,b.positions[j+2]-katharinenRoofZ0,katharinenRoofZ1-katharinenRoofZ0,katharinenRoofX1-katharinenRoofX0,292],at);
   else if(altLietzowRoof)out.set([b.positions[j]-hamburgRoofX0,b.positions[j+2]-hamburgRoofZ0,hamburgRoofZ1-hamburgRoofZ0,hamburgRoofX1-hamburgRoofX0,family],at);
   else if(christophorusRoof)out.set([b.positions[j]-christophorusRoofX0,b.positions[j+2]-christophorusRoofZ0,christophorusRoofZ1-christophorusRoofZ0,christophorusRoofX1-christophorusRoofX0,family],at);
   else if(hamburgRoof)out.set([b.positions[j]-hamburgRoofX0,b.positions[j+2]-hamburgRoofZ0,hamburgRoofZ1-hamburgRoofZ0,hamburgRoofX1-hamburgRoofX0,family],at);
   else if(moorburgRoof)out.set([b.positions[j]-moorburgX0,b.positions[j+2]-moorburgZ0,moorburgZ1-moorburgZ0,moorburgX1-moorburgX0,241],at);
   else if(rooftop)out.set([roofUX*b.positions[j]+roofUZ*b.positions[j+2]-roofU0,roofVX*b.positions[j]+roofVZ*b.positions[j+2]-roofV0,roofV1-roofV0,roofU1-roofU0,110],at);
   else if(copperAdmitted&&copperPlane)out.set([copperPlane.ux*b.positions[j]+copperPlane.uz*b.positions[j+2]-copperPlane.u0,copperPlane.vx*b.positions[j]+copperPlane.vy*b.positions[j+1]+copperPlane.vz*b.positions[j+2]-copperPlane.s0,copperPlane.s1-copperPlane.s0,copperPlane.u1-copperPlane.u0,copperDirection>.52?111:112],at);
   // Palette-only Munich profiles also apply to narrow, tapered, curved and
   // shared-vertex faces that cannot carry a regular facade coordinate frame.
   // Preserve their family instead of dropping those original surfaces to -99.
   else out.set(valid?[-g!.nz*b.positions[j]+g!.nx*b.positions[j+2]-g!.u0,b.positions[j+1]-g!.y0,wallHeight,g!.u1-g!.u0,profile]:[b.positions[j],b.positions[j+1],0,0,family===290||family===293||(family>=296&&family<=298)||(family>=310&&family<=367)?family:(Math.abs(b.normals[j+1])>.2?family:(family!==0?-99:0))],at);at+=5;
  }});
 }
 return out;
}
