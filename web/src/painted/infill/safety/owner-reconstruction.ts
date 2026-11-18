import {root500NumericMemoKeys as f259NumericMemoKeys} from './owner-f259-reconstruction';
import {root500NumericMemoKeys as f261NumericMemoKeys} from './owner-f261-reconstruction';
import {root500NumericMemoKeys as f274NumericMemoKeys} from './owner-f274-reconstruction';
import {prepareInfillOwnerFunction} from './infill-owner-preparation';
import type {InfillDataModule} from './infill-data-contract';
// The 81 certified non-Bremen city builders stay behind the root500 registry's
// dynamic imports and the 35 stage builders behind their root500 wrappers; the
// Bremen four and every other builder keep their direct imports. The registry
// prepares the one route a stage recipe names; a wrapper prepares its own.
import * as infillNonBerlinOwnerRegistry from '../../root500/safety/owner-nonberlin-lazy';
import * as infillOwnerModule0 from "./handelshof-balconies103";
import * as infillOwnerModule1 from "./messe-native-children102";
import * as infillOwnerModule2 from "./westhafen-original102";
import * as infillOwnerModule3 from "./frankfurt-lowoffice-stop100";
import * as infillOwnerModule4 from "./ml61-entry092";
import * as infillOwnerModule5 from "./gallusanlage8-children089";
import * as infillOwnerModule6 from "./gallusanlage8-material088";
import * as infillOwnerModule7 from "./garden-upper-photo087";
import * as infillOwnerModule8 from "./fra145-return087";
import * as infillOwnerModule9 from "./maintor-porta-original087";
import * as infillOwnerModule10 from "./garden-aggregate086";
import * as infillOwnerModule11 from "./fra144-residual-materials086";
import * as infillOwnerModule12 from "./kiosk-glazing084";
import * as infillOwnerModule13 from "./infill-frankfurt-hbf-lowwing082";
import * as infillOwnerModule14 from "./kiosk-canopy080";
import * as infillOwnerModule15 from "./fra144-wall-overlap079";
import * as infillOwnerModule16 from "./ecb-loop-junction077";
import * as infillOwnerModule17 from "./katharinen149-facades078";
import * as infillOwnerModule18 from "./senckenberg-part-display076";
import * as infillOwnerModule19 from "./frankfurt-groups144146-official073";
import * as infillOwnerModule20 from "./katharinen149-edge075";
import * as infillOwnerModule21 from "./ecb-entrance-aggregate073";
import * as infillOwnerModule22 from "./ecb-ancillary073";
import * as infillOwnerModule23 from "./senckenberg-selected074";
import * as infillOwnerModule24 from "./katharinen149-official070";
import * as infillOwnerModule25 from "./ticket148-material070";
import * as infillOwnerModule26 from "./ecb-press072";
import * as infillOwnerModule27 from "./hausdom-official070";
import * as infillOwnerModule28 from "./weststrip253-measured067";
import * as infillOwnerModule29 from "./infill-frankfurt-office-principals069";
import * as infillOwnerModule30 from "./infill-frankfurt-globaltower071";
import * as infillOwnerModule31 from "./kaiser16-canopy067";
import * as infillOwnerModule32 from "./commerzbank-fan-official066";
import * as infillOwnerModule33 from "./kaiser18-official064";
import * as infillOwnerModule34 from "./commerzbank-podium-official060";
import * as infillOwnerModule35 from "./main11369-display058";
import * as infillOwnerModule36 from "./infill-frankfurt-maintower-podium";
import * as infillOwnerModule37 from "./infill-frankfurt-jw-marriott";
import * as infillOwnerModule38 from "./infill-frankfurt-japan-center";
import * as infillOwnerModule39 from "./helvetia-b56-055";
import * as infillOwnerModule40 from "./infill-frankfurt-gallileo";
import * as infillOwnerModule41 from "./infill-marienturm054-duplicate-native-parts";
import * as infillOwnerModule42 from "./commerzbank-parent053-reconstruction";
import * as infillOwnerModule43 from "./infill-frankfurt-myzeil-gridshell053";
import * as infillOwnerModule44 from "./infill-silberturm-full051-reconstruction";
import * as infillOwnerModule45 from "./infill-silberturm-full051-materials";
import * as infillOwnerModule46 from "./infill-omniturm";
import * as infillOwnerModule47 from "./marienturm-specific";
import * as infillOwnerModule48 from "./infill-low073-duplicate-native-parts";
import * as infillOwnerModule49 from "./infill-low009-duplicate-native-parts";
import * as infillOwnerModule50 from "./premier-runtime";
import * as infillOwnerModule51 from "./infill-c032-original-runtime";
import * as infillOwnerModule52 from "./infill-c032-official-runtime";
import * as infillOwnerModule53 from "./infill-frankfurt-junghof088";
import * as infillOwnerModule54 from "./infill-frankfurt-bockenheimer084";
import * as infillOwnerModule55 from "./infill-f278-original";
import * as infillOwnerModule56 from "./infill-f288-original";
import * as infillOwnerModule57 from "./infill-stuttgart-eberhard-historical";
import * as infillOwnerModule58 from "./infill-goethe34";
import * as infillOwnerModule59 from "./infill-frankfurt-kettenhof065";
import * as infillOwnerModule60 from "./infill-frankfurt-vci-roof095";
import * as infillOwnerModule61 from "./infill-frankfurt-vci051";
import * as infillOwnerModule62 from "./infill-frankfurt-ml41-signaris";
import * as infillOwnerModule63 from "./infill-frankfurt-low-office-bulk70";
import * as infillOwnerModule64 from "./infill-c121-original-runtime";
import * as infillOwnerModule65 from "./infill-schneider076";
import * as infillOwnerModule66 from "./infill-frankfurt-maro80";
import * as infillOwnerModule67 from "./infill-frankfurt-maro74";
import * as infillOwnerModule68 from "./infill-frankfurt-low-office-k26";
import * as infillOwnerModule69 from "./infill-frankfurt-low-office-batch2";
import * as infillOwnerModule70 from "./infill-frankfurt-low-office";
import * as infillOwnerModule71 from "./infill-essen-st-johann";
import * as infillOwnerModule72 from "./infill-essen-rathaus-galerie";
import * as infillOwnerModule73 from "./infill-stuttgart-katharina-sports-hall";
import * as infillOwnerModule74 from "./infill-essen-rabbinerhaus";
import * as infillOwnerModule75 from "./infill-stuttgart-graf-east-bridge";
import * as infillOwnerModule76 from "./infill-stuttgart-graf-courtyard-measured";
import * as infillOwnerModule77 from "./infill-stuttgart-graf-west-measured";
import * as infillOwnerModule78 from "./infill-frankfurt-skyper";
import * as infillOwnerModule79 from "./infill-frankfurt-eurotower";
import * as infillOwnerModule80 from "./infill-stuttgart-jubilaeumssaeule";
import * as infillOwnerModule81 from "./infill-frankfurt-opernturm";
import * as infillOwnerModule82 from "./infill-frankfurt-spin";
import * as infillOwnerModule83 from "./infill-frankfurt-winx";
import * as infillOwnerModule84 from "./infill-frankfurt-one";
import * as infillOwnerModule85 from "./infill-frankfurt-boersenplatz-block";
import * as infillOwnerModule86 from "./infill-frankfurt-westendgate";
import * as infillOwnerModule87 from "./infill-frankfurt-myzeil";
import * as infillOwnerModule88 from "./infill-frankfurt-nextower";
import * as infillOwnerModule89 from "./infill-frankfurt-deutsche-bank";
import * as infillOwnerModule90 from "./infill-frankfurt-westend1";
import * as infillOwnerModule91 from "./infill-frankfurt-trianon";
import * as infillOwnerModule92 from "./infill-frankfurt-fbc";
import * as infillOwnerModule93 from "./infill-frankfurt-tower185";
import * as infillOwnerModule94 from "./infill-frankfurt-boerse";
import * as infillOwnerModule95 from "./infill-frankfurt-hauptwache";
import * as infillOwnerModule96 from "./infill-stuttgart-graf-geiss";
import * as infillOwnerModule97 from "./infill-stuttgart-graf-rear";
import * as infillOwnerModule98 from "./infill-stuttgart-bahndirektion";
import * as infillOwnerModule99 from "./infill-stuttgart-koenigsbau-repair";
import * as infillOwnerModule100 from "./infill-stuttgart-wlb-old";
import * as infillOwnerModule101 from "./infill-stuttgart-wlb-extension";
import * as infillOwnerModule102 from "./infill-frankfurt-ecb";
import * as infillOwnerModule103 from "./infill-frankfurt-main-triangel";
import * as infillOwnerModule104 from "./infill-frankfurt-towers";
import * as infillOwnerModule105 from "./infill-frankfurt-east";
import * as infillOwnerModule106 from "./infill-stuttgart-schauspielhaus";
import * as infillOwnerModule107 from "./infill-stuttgart-koenigsbau-passagen";
import * as infillOwnerModule108 from "./infill-stuttgart-gustav";
import * as infillOwnerModule109 from "./infill-stuttgart-hmdk";
import * as infillOwnerModule110 from "./infill-stuttgart-katharina";
import * as infillOwnerModule111 from "./infill-philharmonie-reconstruction";
import * as infillOwnerModule112 from "./infill-essen-reconstruction";
import * as infillOwnerModule113 from "./infill-synagoge-reconstruction";
import * as infillOwnerModule114 from "./owner-f045-exchange-reconstruction";
import * as infillOwnerModule115 from "../../root500/safety/owner-f105-lazy";
import * as infillOwnerModule116 from "../../root500/safety/owner-f029-lazy";
import * as infillOwnerModule118 from "./owner-f071-height-reconstruction";
import * as infillOwnerModule120 from "../../root500/safety/owner-f034-lazy";
import * as infillOwnerModule121 from "../../root500/safety/owner-f033-lazy";
import * as infillOwnerModule123 from "./owner-f040-reconstruction";
import * as infillOwnerModule128 from "../../root500/safety/owner-f065-platform-lazy";
import * as infillOwnerModule129 from "../../root500/safety/owner-f027-lazy";
import * as infillOwnerModule130 from "../../root500/safety/owner-f031-lazy";
import * as infillOwnerModule132 from "./owner-f111-reconstruction";
import * as infillOwnerModule139 from "./infill-frankfurt-hbf075";
import * as infillOwnerModule140 from "./owner-f138-reconstruction";
import * as infillOwnerModule142 from "../../root500/safety/owner-f140-lazy";
import * as infillOwnerModule150 from "./owner-f054-reconstruction";
import * as infillOwnerModule152 from "./owner-f047-reconstruction";
import * as infillOwnerModule163 from "./owner-f133-reconstruction";
import * as infillOwnerModule164 from "../../root500/safety/owner-f035-lazy";
import * as infillOwnerModule171 from "../../root500/safety/owner-f026-lazy";
import * as infillOwnerModule177 from "../../root500/safety/owner-f036-lazy";
import * as infillOwnerModule178 from "../../root500/safety/owner-f037-lazy";
import * as infillOwnerModule179 from "./owner-f028-reconstruction";
import * as infillOwnerModule180 from "../../root500/safety/owner-f017-lazy";
import * as infillOwnerModule181 from "../../root500/safety/owner-f016-lazy";
import * as infillOwnerModule182 from "../../root500/safety/owner-f015-lazy";
import * as infillOwnerModule183 from "./owner-f012-reconstruction";
import * as infillOwnerModule184 from "../../root500/safety/owner-f011-lazy";
import * as infillOwnerModule185 from "./owner-f010-reconstruction";
import * as infillOwnerModule186 from "../../root500/safety/owner-f009-lazy";
import * as infillOwnerModule187 from "../../root500/safety/owner-extra6304-lazy";
import * as infillOwnerModule188 from "./owner-extra6305-reconstruction";
import * as infillOwnerModule189 from "../../root500/safety/owner-extra6306-lazy";
import * as infillOwnerModule190 from "../../root500/safety/owner-f008-lazy";
import * as infillOwnerModule191 from "../../root500/safety/owner-f007-lazy";
import * as infillOwnerModule192 from "../../root500/safety/owner-f006-lazy";
import * as infillOwnerModule193 from "../../root500/safety/owner-f005-lazy";
import * as infillOwnerModule194 from "./owner-f024-reconstruction";
import * as infillOwnerModule195 from "../../root500/safety/owner-f030-lazy";
import * as infillOwnerModule196 from "./f46-recovery-paint";
import * as infillOwnerModule197 from "./owner-f001-reconstruction";
import * as infillOwnerModule205 from "./owner-f314-reconstruction";
import * as infillOwnerModule210 from "./owner-f274-reconstruction";
import * as infillOwnerModule211 from "./owner-f261-reconstruction";
import * as infillOwnerModule212 from "./owner-f259-reconstruction";
import * as infillOwnerModule213 from "./owner-f257-reconstruction";
import * as infillOwnerModule215 from "./f348-detail181";
import * as infillOwnerModule217 from "./owner-f228-reconstruction";
import * as infillOwnerModule225 from "./owner-f219-reconstruction";
import * as infillOwnerModule226 from "./owner-f218-reconstruction";
import * as infillOwnerModule227 from "../../root500/safety/owner-f216-annex-lazy";
import * as infillOwnerModule230 from "./owner-f215-reconstruction";
import * as infillOwnerModule233 from "./owner-f212-reconstruction";
import * as infillOwnerModule234 from "../../root500/safety/owner-f231-lazy";
import * as infillOwnerModule235 from "./owner-f211-reconstruction";
import * as infillOwnerModule236 from "./owner-f210-reconstruction";
import * as infillOwnerModule237 from "../../root500/safety/owner-f209-lazy";
import * as infillOwnerModule238 from "./owner-f208-reconstruction";
import * as infillOwnerModule239 from "./owner-f207-reconstruction";
import * as infillOwnerModule240 from "./owner-f222-reconstruction";
import * as infillOwnerModule241 from "./owner-f206-reconstruction";
import * as infillOwnerModule242 from "./owner-f205-reconstruction";
import * as infillOwnerModule243 from "./owner-f204-reconstruction";
import * as infillOwnerModule244 from "./owner-f193-foot-reconstruction";
import * as infillOwnerModule245 from "./owner-f203-reconstruction";
import * as infillOwnerModule246 from "./owner-f202-reconstruction";
import * as infillOwnerModule247 from "./owner-f199-reconstruction";
import * as infillOwnerModule248 from "./owner-f200-reconstruction";
import * as infillOwnerModule249 from "./owner-f201-reconstruction";
import * as infillOwnerModule250 from "./owner-f198-reconstruction";
import * as infillOwnerModule251 from "./owner-f195-reconstruction";
import * as infillOwnerModule252 from "./owner-f197-reconstruction";
import * as infillOwnerModule253 from "../../root500/safety/owner-f192-lazy";
import * as infillOwnerModule254 from "./owner-f194-reconstruction";
import * as infillOwnerModule255 from "./owner-f193-reconstruction";
import * as infillOwnerModule256 from "./owner-f187-reconstruction";
import * as infillOwnerModule257 from "../../root500/safety/owner-f189-lazy";
import * as infillOwnerModule258 from "./owner-f191-reconstruction";
import * as infillOwnerModule259 from "./owner-f185-reconstruction";
import * as infillOwnerModule260 from "./owner-f184-reconstruction";
import * as infillOwnerModule261 from "./owner-f183-reconstruction";
import * as infillOwnerModule262 from "./owner-f188-reconstruction";
import * as infillOwnerModule263 from "./owner-f186-reconstruction";
import * as infillOwnerModule264 from "./owner-f177-reconstruction";
import * as infillOwnerModule265 from "./owner-f182-reconstruction";
import * as infillOwnerModule266 from "./owner-f179-reconstruction";
import * as infillOwnerModule267 from "./owner-f159-reconstruction";
import * as infillOwnerModule268 from "./owner-f176-reconstruction";
import * as infillOwnerModule269 from "./owner-f181-reconstruction";
import * as infillOwnerModule270 from "./owner-f180-reconstruction";
import * as infillOwnerModule271 from "./owner-f175-reconstruction";
import * as infillOwnerModule272 from "./owner-f178-reconstruction";
import * as infillOwnerModule273 from "./owner-f158-reconstruction";
import * as infillOwnerModule274 from "./owner-f174-reconstruction";
import * as infillOwnerModule275 from "./owner-f152-complete-windows";
import * as infillOwnerModule276 from "./owner-f160-reconstruction";
import * as infillOwnerModule277 from "./owner-f157-reconstruction";
import * as infillOwnerModule278 from "./owner-f152-coface";
import * as infillOwnerModule279 from "./owner-f156-reconstruction";
import * as infillOwnerModule280 from "./owner-f155-reconstruction";
import * as infillOwnerModule281 from "./owner-f154-reconstruction";
import * as infillOwnerModule282 from "./owner-f150-reconstruction";
import * as infillOwnerModule283 from "./owner-f152-reconstruction";
import * as infillOwnerModule284 from "./owner-f149-reconstruction";
import * as infillOwnerModule285 from "./owner-f147-reconstruction";
import * as infillOwnerModule286 from "./owner-f145-reconstruction";
import * as infillOwnerModule287 from "./owner-f146-reconstruction";
import * as infillOwnerModule288 from "./owner-f153-reconstruction";
import * as infillOwnerModule289 from "./owner-f078-reconstruction";
import * as infillOwnerModule290 from "./owner-f064-reconstruction";
import * as infillOwnerModule291 from "./owner-f148-reconstruction";
import * as infillOwnerModule292 from "./owner-f148-materials";
import * as infillOwnerModule293 from "./owner-f196-materials";
import * as infillOwnerModule294 from "./owner-f135-garden";
import * as infillOwnerModule295 from "./owner-f190-reconstruction";
import * as infillOwnerModule296 from "./owner-f032-reconstruction";
import * as infillOwnerModule297 from "./owner-f135-reconstruction";
import * as infillOwnerModule298 from "./owner-f173-materials";
import * as infillOwnerModule299 from "../../root500/safety/owner-f165-lazy";
import * as infillOwnerModule300 from "./owner-f023-pergola";
import * as infillOwnerModule301 from "./owner-f173-reconstruction";
import * as infillOwnerModule302 from "./owner-f073-materials";
import * as infillOwnerModule303 from "./owner-f071-narziss-reconstruction";
import * as infillOwnerModule304 from "./owner-f077-completion";
import * as infillOwnerModule305 from "./owner-f085-completion";
import * as infillOwnerModule306 from "./owner-f081-completion";
import * as infillOwnerModule308 from "./owner-f116-completion";
import * as infillOwnerModule309 from "./owner-f115-reconstruction";
import * as infillOwnerModule311 from "./owner-f128-roof-reconstruction";
import * as infillOwnerModule312 from "./owner-f088-completion";
import * as infillOwnerModule314 from "./owner-f115-exterior-reconstruction";
import * as infillOwnerModule315 from "./owner-f128-completion";
import * as infillOwnerModule316 from "./owner-f120-reconstruction";
import * as infillOwnerModule318 from "./owner-f122-completion";
import * as infillOwnerModule319 from "./owner-f121-completion-reconstruction";
import * as infillOwnerModule321 from "./owner-f126-completion";
import * as infillOwnerModule323 from "./owner-f131-completion";
import * as infillOwnerModule325 from "../../root500/safety/owner-f124-completion-lazy";
import * as infillOwnerModule327 from "./owner-f161-roof";
import * as infillOwnerModule328 from "./owner-f143-completion";
import * as infillOwnerModule330 from "../../root500/safety/owner-f141-completion-lazy";
import * as infillOwnerModule332 from "./owner-f171-completion";
import * as infillOwnerModule334 from "../../root500/safety/owner-f169-completion-lazy";
import * as infillOwnerModule335 from "./owner-f170-completion";
import * as infillOwnerModule336 from "../../root500/safety/owner-f108-completion-lazy";
import * as infillOwnerModule337 from "./owner-f106-completion";
import * as infillOwnerModule339 from "./owner-f086-completion";
import * as infillOwnerModule340 from "../../root500/safety/owner-f089-lazy";
import * as infillOwnerModule341 from "./owner-f018-completion";
type InfillOwnerStage={components:readonly BuildingComponent[];recipe:Function};
import type {FrozenDataRef} from '../../../safety/frozen-data-lease-store';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {handelshofBalconies103Reconstruction as __infillFunctionDependency0,handelshofBalconies103BaseMaterials as __infillFunctionDependency1} from './handelshof-balconies103';
import {messeNativeChildren102Identity as __infillFunctionDependency2,messeNativeChildren102Reconstruction as __infillFunctionDependency3,messeNativeChildren102BaseMaterials as __infillFunctionDependency4} from './messe-native-children102';
import {westhafenOriginal102Identity,westhafenOriginal102Reconstruction,westhafenOriginal102BaseMaterials} from './westhafen-original102';
import {frankfurtLowOfficeStop100BaseMaterials} from './frankfurt-lowoffice-stop100';
import {ml61Entry092Reconstruction as __infillFunctionDependency5,ml61Entry092MaterialFrames as __infillFunctionDependency6} from './ml61-entry092';
import {gallusanlage8Children089Identity as __infillFunctionDependency7,gallusanlage8Children089Reconstruction as __infillFunctionDependency8,gallusanlage8Children089BaseMaterials as __infillFunctionDependency9} from './gallusanlage8-children089';
import {gallusanlage8Material088Identity,gallusanlage8Material088Reconstruction,gallusanlage8Material088BaseMaterials} from './gallusanlage8-material088';
import {gardenUpperPhoto087BaseMaterials as __infillFunctionDependency10} from './garden-upper-photo087';
import {fra145Return087MaterialFrames as __infillFunctionDependency11} from './fra145-return087';
import {mainTorPortaOriginal087Identity,mainTorPortaOriginal087Reconstruction as __infillFunctionDependency12,mainTorPortaOriginal087BaseMaterials as __infillFunctionDependency13} from './maintor-porta-original087';
import {gardenAggregate086Identity as __infillFunctionDependency14,gardenAggregate086Reconstruction as __infillFunctionDependency15} from './garden-aggregate086';
import {fra144ResidualMaterials086Identity as __infillFunctionDependency16,fra144ResidualMaterials086Reconstruction as __infillFunctionDependency17,fra144ResidualMaterials086MaterialFrames as __infillFunctionDependency18} from './fra144-residual-materials086';
import {kioskGlazing084BaseMaterials as __infillFunctionDependency19} from './kiosk-glazing084';
import {frankfurtHbfLowwing082Reconstruction as __infillFunctionDependency20,frankfurtHbfLowwing082MaterialFrames as __infillFunctionDependency21}from'./infill-frankfurt-hbf-lowwing082';
import {kioskCanopy080Identity,kioskCanopy080Reconstruction as __infillFunctionDependency22,kioskCanopy080BaseMaterials as __infillFunctionDependency23}from'./kiosk-canopy080';
import {fra144WallOverlap079Identity,fra144WallOverlap079Reconstruction as __infillFunctionDependency24}from'./fra144-wall-overlap079';
import {ecbLoopJunction077Reconstruction as __infillFunctionDependency25,ecbLoopJunction077BaseMaterials as __infillFunctionDependency26} from './ecb-loop-junction077';
import {katharinen149Facades078MaterialFrames as __infillFunctionDependency27} from './katharinen149-facades078';
import {senckenbergPartDisplay076Identity,senckenbergPartDisplay076Reconstruction as __infillFunctionDependency28} from './senckenberg-part-display076';
import {frankfurtGroups144146Official073Identity as __infillFunctionDependency29,frankfurtGroups144146Official073BaseMaterials as __infillFunctionDependency30} from './frankfurt-groups144146-official073';
import {katharinen149Edge075Reconstruction as __infillFunctionDependency31,katharinen149Edge075BaseMaterials as __infillFunctionDependency32} from './katharinen149-edge075';
import {ecbEntranceAggregate073Identity as __infillFunctionDependency33,ecbEntranceAggregate073BaseMaterials as __infillFunctionDependency34} from './ecb-entrance-aggregate073';
import {ecbAncillary073Identity as __infillFunctionDependency35,ecbAncillary073Reconstruction as __infillFunctionDependency36,ecbAncillary073BaseMaterials as __infillFunctionDependency37} from './ecb-ancillary073';
import {senckenbergSelected074Identity,senckenbergSelected074BaseMaterials as __infillFunctionDependency38} from './senckenberg-selected074';
import {katharinenEast149Official070Identity,katharinenEast149Official070BaseMaterials as __infillFunctionDependency39} from './katharinen149-official070';
import {domturmTicket148070Identity,domturmTicket148070Reconstruction,domturmTicket148070BaseMaterials} from './ticket148-material070';
import {ecbPress072Identity,ecbPress072Reconstruction as __infillFunctionDependency40,ecbPress072BaseMaterials as __infillFunctionDependency41} from './ecb-press072';
import {hausdomOfficial070Identity,hausdomOfficial070Reconstruction as __infillFunctionDependency42,hausdomOfficial070BaseMaterials as __infillFunctionDependency43} from './hausdom-official070';
import {weststrip253Measured067Identity,weststrip253Measured067Reconstruction as __infillFunctionDependency44,weststrip253Measured067BaseMaterials as __infillFunctionDependency45} from './weststrip253-measured067';
import {frankfurtOfficePrincipals069Identity as __infillFunctionDependency46,frankfurtOfficePrincipals069Reconstruction as __infillFunctionDependency47,frankfurtOfficePrincipals069BaseMaterials as __infillFunctionDependency48} from './infill-frankfurt-office-principals069';
import {globalTowerOfficial071Identity as __infillFunctionDependency49,globalTowerOfficial071Reconstruction as __infillFunctionDependency50,globalTowerOfficial071BaseMaterials as __infillFunctionDependency51} from './infill-frankfurt-globaltower071';
import {kaiser16Canopy067Identity,kaiser16Canopy067Reconstruction,kaiser16Canopy067BaseMaterials} from './kaiser16-canopy067';
import {commerzbankFan066Identity,commerzbankFan066AfterParent053Reconstruction as __infillFunctionDependency52,commerzbankFan066BaseMaterials as __infillFunctionDependency53} from './commerzbank-fan-official066';
import {kaiser1820Official064Identity as __infillFunctionDependency54,kaiser1820Official064Reconstruction as __infillFunctionDependency55,kaiser1820Official064BaseMaterials as __infillFunctionDependency56} from './kaiser18-official064';
import {commerzbankPodiumOfficial060Identity as __infillFunctionDependency57,commerzbankPodiumOfficial060Reconstruction as __infillFunctionDependency58,commerzbankPodiumOfficial060BaseMaterials as __infillFunctionDependency59} from './commerzbank-podium-official060';
import {main11369Display058Identity as __infillFunctionDependency60,main11369Display058Reconstruction as __infillFunctionDependency61,main11369Display058BaseMaterials as __infillFunctionDependency62} from './main11369-display058';
import {infillMainTowerPodiumIdentity,infillMainTowerPodiumReconstruction,infillMainTowerPodiumBaseMaterials} from './infill-frankfurt-maintower-podium';
import {infillFrankfurtJwMarriottIdentity as __infillFunctionDependency63,infillFrankfurtJwMarriottReconstruction as __infillFunctionDependency64,infillFrankfurtJwMarriottBaseMaterials as __infillFunctionDependency65} from './infill-frankfurt-jw-marriott';
import {infillJapanCenterIdentity,infillJapanCenterReconstruction as __infillFunctionDependency66,infillJapanCenterBaseMaterials} from './infill-frankfurt-japan-center';
import {helvetiaB56Identity055,helvetiaB56Reconstruction055,helvetiaB56BaseMaterials055} from './helvetia-b56-055';
import {infillGallileoIdentity,infillGallileoReconstruction,infillGallileoBaseMaterials} from './infill-frankfurt-gallileo';
import {infillMarienturm054RemoveDuplicateNativeParts as __infillFunctionDependency67} from './infill-marienturm054-duplicate-native-parts';
import {commerzbankParent053Identity,commerzbankParent053Reconstruction,commerzbankParent053BaseMaterials} from './commerzbank-parent053-reconstruction';
import {applyMyzeilGridshell053} from './infill-frankfurt-myzeil-gridshell053';
import {silberturmFullReconstruction051 as __infillFunctionDependency68,infillSilberturmIdentity} from './infill-silberturm-full051-reconstruction';
import {silberturmSpecificMaterials050 as __infillFunctionDependency69} from './infill-silberturm-full051-materials';
import {infillOmniturmIdentity as __infillFunctionDependency70,infillOmniturmReconstruction as __infillFunctionDependency71,infillOmniturmBaseMaterials as __infillFunctionDependency72} from './infill-omniturm';
import {marienturm050Identity as __infillFunctionDependency73,marienturm050Reconstruction as __infillFunctionDependency74,marienturm050BaseMaterials as __infillFunctionDependency75} from './marienturm-specific';
import {infillLow073RemoveDuplicateNativeParts} from './infill-low073-duplicate-native-parts';
import {infillLow009RemoveDuplicateNativeParts} from './infill-low009-duplicate-native-parts';
import {infillPremierIdentity,infillPremierReconstruction as __infillScopedOwner_infillPremierReconstruction,infillPremierBaseMaterials} from './premier-runtime';
import {infillC032OriginalIdentity as __infillFunctionDependency76,infillC032OriginalBaseMaterials as __infillScopedOwner_infillC032OriginalBaseMaterials} from './infill-c032-original-runtime';
import {infillC032OfficialIdentity as __infillFunctionDependency77,infillC032OfficialReconstruction as __infillFunctionDependency78,infillC032OfficialBaseMaterials} from './infill-c032-official-runtime';
import {infillFrankfurtJunghof088Identity as __infillFunctionDependency79,infillFrankfurtJunghof088Reconstruction as __infillFunctionDependency80,infillFrankfurtJunghof088BaseMaterials,infillFrankfurtJunghof088RoofMaterialFrames062 as __infillFunctionDependency81} from './infill-frankfurt-junghof088';
import {infillFrankfurtBockenheimer084Identity as __infillFunctionDependency82,infillFrankfurtBockenheimer084Reconstruction as __infillFunctionDependency83,infillFrankfurtBockenheimer084BaseMaterials} from './infill-frankfurt-bockenheimer084';
import {infillF278OriginalIdentity,infillF278OriginalReconstruction as __infillScopedOwner_infillF278OriginalReconstruction,infillF278OriginalBaseMaterials} from './infill-f278-original';
import {infillF288OriginalIdentity as __infillFunctionDependency84,infillF288OriginalReconstruction as __infillFunctionDependency85,infillF288OriginalBaseMaterials} from './infill-f288-original';
import {infillEberhardHistoricalIdentity,infillEberhardHistoricalReconstruction as __infillFunctionDependency86,infillEberhardHistoricalBaseMaterials} from './infill-stuttgart-eberhard-historical';
import {infillGoethe34Identity as __infillFunctionDependency87,infillGoethe34Reconstruction as __infillFunctionDependency88,infillGoethe34BaseMaterials} from './infill-goethe34';
import {infillFrankfurtKettenhof065Identity as __infillFunctionDependency89,infillFrankfurtKettenhof065Reconstruction as __infillFunctionDependency90,infillFrankfurtKettenhof065BaseMaterials} from './infill-frankfurt-kettenhof065';
import {infillFrankfurtVCIRoof095Reconstruction as __infillFunctionDependency91,infillFrankfurtVCIRoof095MaterialFrames as __infillFunctionDependency92} from './infill-frankfurt-vci-roof095';
import {infillFrankfurtVCI051Identity as __infillFunctionDependency93,infillFrankfurtVCI051Reconstruction as __infillFunctionDependency94,infillFrankfurtVCI051BaseMaterials} from './infill-frankfurt-vci051';
import {infillFrankfurtML41SignarisIdentity as __infillFunctionDependency95,infillFrankfurtML41SignarisReconstruction as __infillFunctionDependency96,infillFrankfurtML41SignarisBaseMaterials} from './infill-frankfurt-ml41-signaris';
import {infillFrankfurtLowOfficeBulk70Identity as __infillFunctionDependency97,infillFrankfurtLowOfficeBulk70BaseMaterials} from './infill-frankfurt-low-office-bulk70';
import {infillC121OriginalBaseMaterials as __infillScopedOwner_infillC121OriginalBaseMaterials} from './infill-c121-original-runtime';
import {infillSchneider076Identity as __infillFunctionDependency98,infillSchneider076Reconstruction as __infillFunctionDependency99,infillSchneider076BaseMaterials} from './infill-schneider076';
import {infillFrankfurtMaro80Identity,infillFrankfurtMaro80Reconstruction,infillFrankfurtMaro80BaseMaterials} from './infill-frankfurt-maro80';
import {infillFrankfurtMaro74Identity as __infillFunctionDependency100,infillFrankfurtMaro74Reconstruction as __infillFunctionDependency101,infillFrankfurtMaro74BaseMaterials} from './infill-frankfurt-maro74';
import {infillFrankfurtLowOfficeK26Identity as __infillFunctionDependency102,infillFrankfurtLowOfficeK26Reconstruction as __infillFunctionDependency103,infillFrankfurtLowOfficeK26BaseMaterials} from './infill-frankfurt-low-office-k26';
import {infillFrankfurtLowOfficeBatch2Identity as __infillFunctionDependency104,infillFrankfurtLowOfficeBatch2Reconstruction as __infillFunctionDependency105,infillFrankfurtLowOfficeBatch2BaseMaterials} from './infill-frankfurt-low-office-batch2';
import {infillFrankfurtLowOfficeIdentity as __infillFunctionDependency106,infillFrankfurtLowOfficeReconstruction as __infillFunctionDependency107,infillFrankfurtLowOfficeBaseMaterials} from './infill-frankfurt-low-office';
import {infillStJohannIdentity,infillStJohannReconstruction as __infillFunctionDependency108,infillStJohannBaseMaterials} from './infill-essen-st-johann';
import {infillGalerieIdentity as __infillFunctionDependency109,infillGalerieReconstruction as __infillFunctionDependency110,infillGalerieBaseMaterials} from './infill-essen-rathaus-galerie';
import {infillKatharinaSportsHallIdentity,infillKatharinaSportsHallReconstruction,infillKatharinaSportsHallBaseMaterials} from './infill-stuttgart-katharina-sports-hall';
import {infillRabbiIdentity,infillRabbiReconstruction as __infillFunctionDependency111,infillRabbiBaseMaterials} from './infill-essen-rabbinerhaus';
import {infillGrafEastBridgeIdentity,infillGrafEastBridgeReconstruction,infillGrafEastBridgeBaseMaterials} from './infill-stuttgart-graf-east-bridge';
import {infillGrafCourtyardMeasuredIdentity,infillGrafCourtyardMeasuredReconstruction as __infillFunctionDependency112,infillGrafCourtyardMeasuredBaseMaterials} from './infill-stuttgart-graf-courtyard-measured';
import {infillGrafWestMeasuredIdentity,infillGrafWestMeasuredReconstruction as __infillFunctionDependency113,infillGrafWestMeasuredBaseMaterials} from './infill-stuttgart-graf-west-measured';
import {infillFrankfurtSkyperIdentity as __infillFunctionDependency114,infillFrankfurtSkyperReconstruction as __infillFunctionDependency115,infillFrankfurtSkyperBaseMaterials as __infillFunctionDependency116} from './infill-frankfurt-skyper';
import {infillEurotowerIdentity,infillEurotowerReconstruction as __infillFunctionDependency117,infillEurotowerBaseMaterials} from './infill-frankfurt-eurotower';
import {getinfillJubilaeumssaeuleIdentity as __infillDataDependency0,infillJubilaeumssaeuleReconstruction as __infillFunctionDependency118,infillJubilaeumssaeuleBaseMaterials as __infillFunctionDependency119} from './infill-stuttgart-jubilaeumssaeule';
import {infillOpernturmIdentity,infillOpernturmReconstruction as __infillFunctionDependency120,infillOpernturmBaseMaterials} from './infill-frankfurt-opernturm';
import {infillFrankfurtSpinIdentity as __infillFunctionDependency121,infillFrankfurtSpinReconstruction as __infillFunctionDependency122,infillFrankfurtSpinBaseMaterials as __infillFunctionDependency123} from './infill-frankfurt-spin';
import {infillWinxIdentity,infillWinxReconstruction,infillWinxBaseMaterials} from './infill-frankfurt-winx';
import {infillOneIdentity,infillOneReconstruction as __infillFunctionDependency124,infillOneBaseMaterials} from './infill-frankfurt-one';
import {infillBoersenplatzBlockIdentity,infillBoersenplatzBlockReconstruction as __infillFunctionDependency125,infillBoersenplatzBlockBaseMaterials} from './infill-frankfurt-boersenplatz-block';
import {infillFrankfurtWestendgateIdentity as __infillFunctionDependency126,infillFrankfurtWestendgateReconstruction as __infillFunctionDependency127,infillFrankfurtWestendgateBaseMaterials as __infillFunctionDependency128} from './infill-frankfurt-westendgate';
import {infillMyzeilIdentity,infillMyzeilReconstruction as __infillFunctionDependency129,infillMyzeilBaseMaterials} from './infill-frankfurt-myzeil';
import {infillFrankfurtNextowerIdentity as __infillFunctionDependency130,infillFrankfurtNextowerReconstruction as __infillFunctionDependency131,infillFrankfurtNextowerBaseMaterials as __infillFunctionDependency132} from './infill-frankfurt-nextower';
import {infillFrankfurtDeutscheBankIdentity as __infillFunctionDependency133,infillFrankfurtDeutscheBankReconstruction as __infillFunctionDependency134,infillFrankfurtDeutscheBankBaseMaterials as __infillFunctionDependency135} from './infill-frankfurt-deutsche-bank';
import {infillWestend1Identity,infillWestend1Reconstruction as __infillFunctionDependency136,infillWestend1BaseMaterials} from './infill-frankfurt-westend1';
import {infillFrankfurtTrianonIdentity as __infillFunctionDependency137,infillFrankfurtTrianonReconstruction as __infillFunctionDependency138,infillFrankfurtTrianonBaseMaterials as __infillFunctionDependency139} from './infill-frankfurt-trianon';
import {infillFrankfurtFbcIdentity as __infillFunctionDependency140,infillFrankfurtFbcReconstruction as __infillFunctionDependency141,infillFrankfurtFbcBaseMaterials as __infillFunctionDependency142} from './infill-frankfurt-fbc';
import {infillTower185Identity,infillTower185Reconstruction as __infillFunctionDependency143,infillTower185BaseMaterials} from './infill-frankfurt-tower185';
import {infillBoerseIdentity,infillBoerseReconstruction as __infillFunctionDependency144,infillBoerseBaseMaterials} from './infill-frankfurt-boerse';
import {infillHauptwacheIdentity,infillHauptwacheReconstruction,infillHauptwacheBaseMaterials} from './infill-frankfurt-hauptwache';
import {infillGrafGeissIdentity,infillGrafGeissReconstruction as __infillFunctionDependency145,infillGrafGeissBaseMaterials} from './infill-stuttgart-graf-geiss';
import {infillGrafRearIdentity,infillGrafRearReconstruction as __infillFunctionDependency146,infillGrafRearBaseMaterials} from './infill-stuttgart-graf-rear';
import {infillBahndirektionIdentity,infillBahndirektionReconstruction,infillBahndirektionBaseMaterials} from './infill-stuttgart-bahndirektion';
import {infillKoenigsbauRepairIdentity,infillKoenigsbauRepairReconstruction as __infillFunctionDependency147,infillKoenigsbauRepairBaseMaterials} from './infill-stuttgart-koenigsbau-repair';
import {infillWlbOldIdentity,infillWlbOldReconstruction as __infillFunctionDependency148,infillWlbOldBaseMaterials} from './infill-stuttgart-wlb-old';
import {infillWlbExtensionIdentity,infillWlbExtensionReconstruction as __infillFunctionDependency149,infillWlbExtensionBaseMaterials} from './infill-stuttgart-wlb-extension';
import {infillEcbIdentity,infillEcbReconstruction as __infillFunctionDependency150,infillEcbBaseMaterials} from './infill-frankfurt-ecb';
import {infillMainTriangelIdentity,infillMainTriangelReconstruction,infillMainTriangelBaseMaterials} from './infill-frankfurt-main-triangel';
import {infillFrankfurtIdentity as __infillFunctionDependency151,infillFrankfurtReconstruction as __infillFunctionDependency152,infillFrankfurtBaseMaterials as __infillFunctionDependency153} from './infill-frankfurt-towers';
import {infillFrankfurtEastIdentity as __infillFunctionDependency154,infillFrankfurtEastReconstruction as __infillFunctionDependency155,infillFrankfurtEastBaseMaterials as __infillFunctionDependency156} from './infill-frankfurt-east';
import {infillSchauspielhausIdentity,infillSchauspielhausReconstruction as __infillFunctionDependency157,infillSchauspielhausBaseMaterials} from './infill-stuttgart-schauspielhaus';
import {infillKoenigsbauPassagenIdentity,infillKoenigsbauPassagenReconstruction as __infillFunctionDependency158,infillKoenigsbauPassagenBaseMaterials} from './infill-stuttgart-koenigsbau-passagen';
import {infillGustavIdentity,infillGustavReconstruction as __infillFunctionDependency159,infillGustavBaseMaterials} from './infill-stuttgart-gustav';
import {infillHmdkIdentity,infillHmdkReconstruction as __infillFunctionDependency160,infillHmdkBaseMaterials} from './infill-stuttgart-hmdk';
import {infillKatharinaIdentity,infillKatharinaReconstruction as __infillFunctionDependency161,infillKatharinaBaseMaterials} from './infill-stuttgart-katharina';
import {infillPhilharmonieIdentity,infillPhilharmonieReconstruction as __infillFunctionDependency162,infillPhilharmonieBaseMaterials} from './infill-philharmonie-reconstruction';
import {infillEssenIdentity as __infillFunctionDependency163,infillEssenReconstruction as __infillFunctionDependency164,infillEssenBaseMaterials} from './infill-essen-reconstruction';
import {infillSynagogeIdentity as __infillFunctionDependency165,infillSynagogeReconstruction as __infillFunctionDependency166,infillSynagogeBaseMaterials} from './infill-synagoge-reconstruction';
import {ownerF045ExchangeIdentity,ownerF045ExchangeReconstruction as __infillRoot500Owner_ownerF045ExchangeReconstruction,ownerF045ExchangeBaseMaterials as __infillRoot500Owner_ownerF045ExchangeBaseMaterials} from './owner-f045-exchange-reconstruction';
import {ownerF105Identity,ownerF105Reconstruction as __infillRoot500Owner_ownerF105Reconstruction,ownerF105BaseMaterials as __infillRoot500Owner_ownerF105BaseMaterials} from '../../root500/safety/owner-f105-lazy';
import {ownerF029Identity,ownerF029Reconstruction as __infillRoot500Owner_ownerF029Reconstruction,ownerF029BaseMaterials as __infillRoot500Owner_ownerF029BaseMaterials} from '../../root500/safety/owner-f029-lazy';
import {ownerF072Identity,ownerF072Reconstruction as __infillRoot500Owner_ownerF072Reconstruction,ownerF072BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF071HeightIdentity as __infillRoot500Owner_ownerF071HeightIdentity,ownerF071HeightReconstruction as __infillRoot500Owner_ownerF071HeightReconstruction,ownerF071HeightBaseMaterials as __infillRoot500Owner_ownerF071HeightBaseMaterials} from './owner-f071-height-reconstruction';
import {ownerF060Identity,ownerF060Reconstruction as __infillRoot500Owner_ownerF060Reconstruction,ownerF060BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF034Identity,ownerF034Reconstruction as __infillRoot500Owner_ownerF034Reconstruction,ownerF034BaseMaterials} from '../../root500/safety/owner-f034-lazy';
import {ownerF033Identity,ownerF033Reconstruction as __infillRoot500Owner_ownerF033Reconstruction,ownerF033BaseMaterials} from '../../root500/safety/owner-f033-lazy';
import {ownerF039BIdentity,ownerF039BReconstruction as __infillRoot500Owner_ownerF039BReconstruction,ownerF039BBaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF040Identity,ownerF040Reconstruction as __infillRoot500Owner_ownerF040Reconstruction,ownerF040BaseMaterials} from './owner-f040-reconstruction';
import {ownerF043Identity,ownerF043Reconstruction as __infillRoot500Owner_ownerF043Reconstruction,ownerF043BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF039CIdentity,ownerF039CReconstruction as __infillRoot500Owner_ownerF039CReconstruction,ownerF039CBaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF039DIdentity,ownerF039DReconstruction as __infillRoot500Owner_ownerF039DReconstruction,ownerF039DBaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF065Identity,ownerF065Reconstruction as __infillRoot500Owner_ownerF065Reconstruction,ownerF065BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF065PlatformIdentity,ownerF065PlatformReconstruction as __infillRoot500Owner_ownerF065PlatformReconstruction,ownerF065PlatformBaseMaterials} from '../../root500/safety/owner-f065-platform-lazy';
import {ownerF027Identity,ownerF027Reconstruction as __infillRoot500Owner_ownerF027Reconstruction,ownerF027BaseMaterials} from '../../root500/safety/owner-f027-lazy';
import {ownerF031Identity,ownerF031Reconstruction as __infillRoot500Owner_ownerF031Reconstruction,ownerF031BaseMaterials} from '../../root500/safety/owner-f031-lazy';
import {ownerF079Identity,ownerF079Reconstruction as __infillRoot500Owner_ownerF079Reconstruction,ownerF079BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF111Identity,ownerF111Reconstruction as __infillRoot500Owner_ownerF111Reconstruction,ownerF111BaseMaterials} from './owner-f111-reconstruction';
import {ownerF112Identity,ownerF112Reconstruction as __infillRoot500Owner_ownerF112Reconstruction,ownerF112BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF113Identity,ownerF113Reconstruction as __infillRoot500Owner_ownerF113Reconstruction,ownerF113BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF110Identity,ownerF110Reconstruction as __infillRoot500Owner_ownerF110Reconstruction,ownerF110BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF132Identity,ownerF132Reconstruction as __infillRoot500Owner_ownerF132Reconstruction,ownerF132BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF136Identity,ownerF136Reconstruction as __infillRoot500Owner_ownerF136Reconstruction,ownerF136BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF114Identity,ownerF114Reconstruction as __infillRoot500Owner_ownerF114Reconstruction,ownerF114BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {frankfurtHbf075Identity,frankfurtHbf075Reconstruction as __infillFunctionDependency167,frankfurtHbf075BaseMaterials as __infillFunctionDependency168} from './infill-frankfurt-hbf075';
import {ownerF138Identity,ownerF138Reconstruction as __infillRoot500Owner_ownerF138Reconstruction,ownerF138BaseMaterials} from './owner-f138-reconstruction';
import {ownerF144Identity,ownerF144Reconstruction as __infillRoot500Owner_ownerF144Reconstruction,ownerF144BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF140Identity,ownerF140Reconstruction as __infillRoot500Owner_ownerF140Reconstruction,ownerF140BaseMaterials} from '../../root500/safety/owner-f140-lazy';
import {ownerF162Identity,ownerF162Reconstruction as __infillRoot500Owner_ownerF162Reconstruction,ownerF162BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF164Identity,ownerF164Reconstruction as __infillRoot500Owner_ownerF164Reconstruction,ownerF164BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF163Identity,ownerF163Reconstruction as __infillRoot500Owner_ownerF163Reconstruction,ownerF163BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF166Identity,ownerF166Reconstruction as __infillRoot500Owner_ownerF166Reconstruction,ownerF166BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF040HIdentity,ownerF040HReconstruction as __infillRoot500Owner_ownerF040HReconstruction,ownerF040HBaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF049Identity,ownerF049Reconstruction as __infillRoot500Owner_ownerF049Reconstruction,ownerF049BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF051Identity,ownerF051Reconstruction as __infillRoot500Owner_ownerF051Reconstruction,ownerF051BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF054Identity,ownerF054Reconstruction as __infillRoot500Owner_ownerF054Reconstruction,ownerF054BaseMaterials} from './owner-f054-reconstruction';
import {ownerF056Identity,ownerF056Reconstruction as __infillRoot500Owner_ownerF056Reconstruction,ownerF056BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF047Identity,ownerF047Reconstruction as __infillRoot500Owner_ownerF047Reconstruction,ownerF047BaseMaterials} from './owner-f047-reconstruction';
import {ownerF048Identity,ownerF048Reconstruction as __infillRoot500Owner_ownerF048Reconstruction,ownerF048BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF052Identity,ownerF052Reconstruction as __infillRoot500Owner_ownerF052Reconstruction,ownerF052BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF055Identity,ownerF055Reconstruction as __infillRoot500Owner_ownerF055Reconstruction,ownerF055BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF057Identity,ownerF057Reconstruction as __infillRoot500Owner_ownerF057Reconstruction,ownerF057BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF059Identity,ownerF059Reconstruction as __infillRoot500Owner_ownerF059Reconstruction,ownerF059BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF062Identity,ownerF062Reconstruction as __infillRoot500Owner_ownerF062Reconstruction,ownerF062BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF067Identity,ownerF067Reconstruction as __infillRoot500Owner_ownerF067Reconstruction,ownerF067BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF070Identity,ownerF070Reconstruction as __infillRoot500Owner_ownerF070Reconstruction,ownerF070BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF083Identity,ownerF083Reconstruction as __infillRoot500Owner_ownerF083Reconstruction,ownerF083BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF118Identity,ownerF118Reconstruction as __infillRoot500Owner_ownerF118Reconstruction,ownerF118BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF133Identity,ownerF133Reconstruction,ownerF133BaseMaterials} from './owner-f133-reconstruction';
import {ownerF035Identity,ownerF035Reconstruction as __infillRoot500Owner_ownerF035Reconstruction,ownerF035BaseMaterials} from '../../root500/safety/owner-f035-lazy';
import {ownerF130Identity,ownerF130Reconstruction as __infillRoot500Owner_ownerF130Reconstruction,ownerF130BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF076Identity,ownerF076Reconstruction as __infillRoot500Owner_ownerF076Reconstruction,ownerF076BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF142Identity,ownerF142Reconstruction as __infillRoot500Owner_ownerF142Reconstruction,ownerF142BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF167Identity,ownerF167Reconstruction as __infillRoot500Owner_ownerF167Reconstruction,ownerF167BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF039EIdentity,ownerF039EReconstruction as __infillRoot500Owner_ownerF039EReconstruction,ownerF039EBaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF053Identity,ownerF053Reconstruction as __infillRoot500Owner_ownerF053Reconstruction,ownerF053BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF026Identity,ownerF026Reconstruction as __infillRoot500Owner_ownerF026Reconstruction,ownerF026BaseMaterials} from '../../root500/safety/owner-f026-lazy';
import {ownerF039Identity,ownerF039Reconstruction as __infillRoot500Owner_ownerF039Reconstruction,ownerF039BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF038Identity,ownerF038Reconstruction as __infillRoot500Owner_ownerF038Reconstruction,ownerF038BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF041Identity,ownerF041Reconstruction as __infillRoot500Owner_ownerF041Reconstruction,ownerF041BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF042Identity,ownerF042Reconstruction as __infillRoot500Owner_ownerF042Reconstruction,ownerF042BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF044Identity,ownerF044Reconstruction as __infillRoot500Owner_ownerF044Reconstruction,ownerF044BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF036Identity,ownerF036Reconstruction as __infillRoot500Owner_ownerF036Reconstruction,ownerF036BaseMaterials} from '../../root500/safety/owner-f036-lazy';
import {ownerF037Identity,ownerF037Reconstruction as __infillRoot500Owner_ownerF037Reconstruction,ownerF037BaseMaterials} from '../../root500/safety/owner-f037-lazy';
import {ownerF028Identity,ownerF028Reconstruction as __infillRoot500Owner_ownerF028Reconstruction,ownerF028BaseMaterials} from './owner-f028-reconstruction';
import {ownerF017Identity,ownerF017Reconstruction as __infillRoot500Owner_ownerF017Reconstruction,ownerF017BaseMaterials} from '../../root500/safety/owner-f017-lazy';
import {ownerF016Identity,ownerF016Reconstruction as __infillRoot500Owner_ownerF016Reconstruction,ownerF016BaseMaterials} from '../../root500/safety/owner-f016-lazy';
import {ownerF015Identity,ownerF015Reconstruction as __infillRoot500Owner_ownerF015Reconstruction,ownerF015BaseMaterials} from '../../root500/safety/owner-f015-lazy';
import {ownerF012Identity,ownerF012Reconstruction as __infillRoot500Owner_ownerF012Reconstruction,ownerF012BaseMaterials} from './owner-f012-reconstruction';
import {ownerF011Identity,ownerF011Reconstruction as __infillRoot500Owner_ownerF011Reconstruction,ownerF011BaseMaterials} from '../../root500/safety/owner-f011-lazy';
import {ownerF010Identity,ownerF010Reconstruction as __infillRoot500Owner_ownerF010Reconstruction,ownerF010BaseMaterials} from './owner-f010-reconstruction';
import {ownerF009Identity,ownerF009Reconstruction as __infillRoot500Owner_ownerF009Reconstruction,ownerF009BaseMaterials} from '../../root500/safety/owner-f009-lazy';
import {ownerE6304Identity,ownerE6304Reconstruction as __infillRoot500Owner_ownerE6304Reconstruction,ownerE6304BaseMaterials} from '../../root500/safety/owner-extra6304-lazy';
import {ownerKUPFER6305Identity,ownerKUPFER6305Reconstruction as __infillRoot500Owner_ownerKUPFER6305Reconstruction,ownerKUPFER6305BaseMaterials} from './owner-extra6305-reconstruction';
import {ownerE6306Identity,ownerE6306Reconstruction as __infillRoot500Owner_ownerE6306Reconstruction,ownerE6306BaseMaterials} from '../../root500/safety/owner-extra6306-lazy';
import {ownerF008Identity,ownerF008Reconstruction as __infillRoot500Owner_ownerF008Reconstruction,ownerF008BaseMaterials} from '../../root500/safety/owner-f008-lazy';
import {ownerF007Identity,ownerF007Reconstruction as __infillRoot500Owner_ownerF007Reconstruction,ownerF007BaseMaterials} from '../../root500/safety/owner-f007-lazy';
import {ownerF006Identity,ownerF006Reconstruction as __infillRoot500Owner_ownerF006Reconstruction,ownerF006BaseMaterials} from '../../root500/safety/owner-f006-lazy';
import {ownerF005Identity,ownerF005Reconstruction as __infillRoot500Owner_ownerF005Reconstruction,ownerF005BaseMaterials} from '../../root500/safety/owner-f005-lazy';
import {ownerF024Identity,ownerF024Reconstruction as __infillRoot500Owner_ownerF024Reconstruction,ownerF024BaseMaterials} from './owner-f024-reconstruction';
import {ownerF030Identity,ownerF030Reconstruction as __infillRoot500Owner_ownerF030Reconstruction,ownerF030BaseMaterials} from '../../root500/safety/owner-f030-lazy';
import {applyF46RecoveryPaint} from './f46-recovery-paint';
import {ownerF001Identity,ownerF001Reconstruction as __infillRoot500Owner_ownerF001Reconstruction,ownerF001BaseMaterials} from './owner-f001-reconstruction';
import {ownerF371Identity,ownerF371Reconstruction as __infillRoot500Owner_ownerF371Reconstruction,ownerF371BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF369Identity,ownerF369Reconstruction as __infillRoot500Owner_ownerF369Reconstruction,ownerF369BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF352Identity,ownerF352Reconstruction as __infillRoot500Owner_ownerF352Reconstruction,ownerF352BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF350Identity,ownerF350Reconstruction as __infillRoot500Owner_ownerF350Reconstruction,ownerF350BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF320Identity,ownerF320Reconstruction as __infillRoot500Owner_ownerF320Reconstruction,ownerF320BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF316Identity,ownerF316Reconstruction as __infillRoot500Owner_ownerF316Reconstruction,ownerF316BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF318Identity,ownerF318Reconstruction as __infillRoot500Owner_ownerF318Reconstruction,ownerF318BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF314Identity,ownerF314Reconstruction as __infillRoot500Owner_ownerF314Reconstruction,ownerF314BaseMaterials as __infillRoot500Owner_ownerF314BaseMaterials} from './owner-f314-reconstruction';
import {ownerF299Identity,ownerF299Reconstruction as __infillRoot500Owner_ownerF299Reconstruction,ownerF299BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF308Identity,ownerF308Reconstruction as __infillRoot500Owner_ownerF308Reconstruction,ownerF308BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF306Identity,ownerF306Reconstruction as __infillRoot500Owner_ownerF306Reconstruction,ownerF306BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF297Identity,ownerF297Reconstruction as __infillRoot500Owner_ownerF297Reconstruction,ownerF297BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF274Identity,ownerF274Reconstruction as __infillRoot500Owner_ownerF274Reconstruction,ownerF274BaseMaterials} from './owner-f274-reconstruction';
import {ownerF261Identity,ownerF261Reconstruction as __infillRoot500Owner_ownerF261Reconstruction,ownerF261BaseMaterials} from './owner-f261-reconstruction';
import {ownerF259Identity,ownerF259Reconstruction as __infillRoot500Owner_ownerF259Reconstruction,ownerF259BaseMaterials} from './owner-f259-reconstruction';
import {ownerF257Identity,ownerF257Reconstruction as __infillRoot500Owner_ownerF257Reconstruction,ownerF257BaseMaterials} from './owner-f257-reconstruction';
import {ownerF252Identity,ownerF252Reconstruction as __infillRoot500Owner_ownerF252Reconstruction,ownerF252BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {applyF348Detail181} from './f348-detail181';
import {ownerF249Identity,ownerF249Reconstruction as __infillRoot500Owner_ownerF249Reconstruction,ownerF249BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF228Identity,ownerF228Reconstruction as __infillRoot500Owner_ownerF228Reconstruction,ownerF228BaseMaterials} from './owner-f228-reconstruction';
import {ownerF227Identity,ownerF227Reconstruction as __infillRoot500Owner_ownerF227Reconstruction,ownerF227BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF226Identity,ownerF226Reconstruction as __infillRoot500Owner_ownerF226Reconstruction,ownerF226BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF225Identity,ownerF225Reconstruction as __infillRoot500Owner_ownerF225Reconstruction,ownerF225BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF224Identity,ownerF224Reconstruction as __infillRoot500Owner_ownerF224Reconstruction,ownerF224BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF223Identity,ownerF223Reconstruction as __infillRoot500Owner_ownerF223Reconstruction,ownerF223BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF221Identity,ownerF221Reconstruction as __infillRoot500Owner_ownerF221Reconstruction,ownerF221BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF220Identity,ownerF220Reconstruction as __infillRoot500Owner_ownerF220Reconstruction,ownerF220BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF219Identity,ownerF219Reconstruction as __infillRoot500Owner_ownerF219Reconstruction,ownerF219BaseMaterials} from './owner-f219-reconstruction';
import {ownerF218Identity as __infillRoot500Owner_ownerF218Identity,ownerF218Reconstruction as __infillRoot500Owner_ownerF218Reconstruction,ownerF218BaseMaterials as __infillRoot500Owner_ownerF218BaseMaterials} from './owner-f218-reconstruction';
import {ownerF216AnnexIdentity,ownerF216AnnexReconstruction as __infillRoot500Owner_ownerF216AnnexReconstruction,ownerF216AnnexBaseMaterials} from '../../root500/safety/owner-f216-annex-lazy';
import {ownerF217Identity,ownerF217Reconstruction as __infillRoot500Owner_ownerF217Reconstruction,ownerF217BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF216Identity,ownerF216Reconstruction as __infillRoot500Owner_ownerF216Reconstruction,ownerF216BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF215Identity as __infillRoot500Owner_ownerF215Identity,ownerF215Reconstruction as __infillRoot500Owner_ownerF215Reconstruction,ownerF215BaseMaterials as __infillRoot500Owner_ownerF215BaseMaterials} from './owner-f215-reconstruction';
import {ownerF214Identity,ownerF214Reconstruction as __infillRoot500Owner_ownerF214Reconstruction,ownerF214BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF213Identity,ownerF213Reconstruction as __infillRoot500Owner_ownerF213Reconstruction,ownerF213BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF212Identity,ownerF212Reconstruction as __infillRoot500Owner_ownerF212Reconstruction,ownerF212BaseMaterials} from './owner-f212-reconstruction';
import {ownerF231Identity,ownerF231Reconstruction as __infillRoot500Owner_ownerF231Reconstruction,ownerF231BaseMaterials} from '../../root500/safety/owner-f231-lazy';
import {ownerF211Identity,ownerF211Reconstruction as __infillRoot500Owner_ownerF211Reconstruction,ownerF211BaseMaterials} from './owner-f211-reconstruction';
import {ownerF210Identity,ownerF210Reconstruction as __infillRoot500Owner_ownerF210Reconstruction,ownerF210BaseMaterials} from './owner-f210-reconstruction';
import {ownerF209Identity,ownerF209Reconstruction as __infillRoot500Owner_ownerF209Reconstruction,ownerF209BaseMaterials} from '../../root500/safety/owner-f209-lazy';
import {ownerF208Identity,ownerF208Reconstruction as __infillRoot500Owner_ownerF208Reconstruction,ownerF208BaseMaterials} from './owner-f208-reconstruction';
import {ownerF207Identity as __infillRoot500Owner_ownerF207Identity,ownerF207Reconstruction as __infillRoot500Owner_ownerF207Reconstruction,ownerF207BaseMaterials as __infillRoot500Owner_ownerF207BaseMaterials} from './owner-f207-reconstruction';
import {ownerF222Identity,ownerF222Reconstruction as __infillRoot500Owner_ownerF222Reconstruction,ownerF222BaseMaterials} from './owner-f222-reconstruction';
import {ownerF206Identity,ownerF206Reconstruction,ownerF206BaseMaterials} from './owner-f206-reconstruction';
import {ownerF205Identity as __infillRoot500Owner_ownerF205Identity,ownerF205Reconstruction as __infillRoot500Owner_ownerF205Reconstruction,ownerF205BaseMaterials as __infillRoot500Owner_ownerF205BaseMaterials} from './owner-f205-reconstruction';
import {ownerF204Identity as __infillRoot500Owner_ownerF204Identity,ownerF204Reconstruction as __infillRoot500Owner_ownerF204Reconstruction,ownerF204BaseMaterials as __infillRoot500Owner_ownerF204BaseMaterials} from './owner-f204-reconstruction';
import {ownerF193FootIdentity,ownerF193FootReconstruction as __infillRoot500Owner_ownerF193FootReconstruction,ownerF193FootBaseMaterials} from './owner-f193-foot-reconstruction';
import {ownerF203Identity as __infillRoot500Owner_ownerF203Identity,ownerF203Reconstruction as __infillRoot500Owner_ownerF203Reconstruction,ownerF203BaseMaterials as __infillRoot500Owner_ownerF203BaseMaterials} from './owner-f203-reconstruction';
import {ownerF202Identity as __infillRoot500Owner_ownerF202Identity,ownerF202Reconstruction as __infillRoot500Owner_ownerF202Reconstruction,ownerF202BaseMaterials as __infillRoot500Owner_ownerF202BaseMaterials} from './owner-f202-reconstruction';
import {ownerF199Identity,ownerF199Reconstruction as __infillRoot500Owner_ownerF199Reconstruction,ownerF199BaseMaterials} from './owner-f199-reconstruction';
import {ownerF200Identity,ownerF200Reconstruction,ownerF200BaseMaterials} from './owner-f200-reconstruction';
import {ownerF201Identity as __infillRoot500Owner_ownerF201Identity,ownerF201Reconstruction as __infillRoot500Owner_ownerF201Reconstruction,ownerF201BaseMaterials as __infillRoot500Owner_ownerF201BaseMaterials} from './owner-f201-reconstruction';
import {ownerF198Identity as __infillRoot500Owner_ownerF198Identity,ownerF198Reconstruction as __infillRoot500Owner_ownerF198Reconstruction,ownerF198BaseMaterials as __infillRoot500Owner_ownerF198BaseMaterials} from './owner-f198-reconstruction';
import {ownerF195Identity,ownerF195Reconstruction as __infillRoot500Owner_ownerF195Reconstruction,ownerF195BaseMaterials} from './owner-f195-reconstruction';
import {ownerF197Identity,ownerF197Reconstruction as __infillRoot500Owner_ownerF197Reconstruction,ownerF197BaseMaterials as __infillRoot500Owner_ownerF197BaseMaterials} from './owner-f197-reconstruction';
import {ownerF192Identity,ownerF192Reconstruction as __infillRoot500Owner_ownerF192Reconstruction,ownerF192BaseMaterials} from '../../root500/safety/owner-f192-lazy';
import {ownerF194Identity,ownerF194Reconstruction as __infillRoot500Owner_ownerF194Reconstruction,ownerF194BaseMaterials as __infillRoot500Owner_ownerF194BaseMaterials} from './owner-f194-reconstruction';
import {ownerF193Identity,ownerF193Reconstruction as __infillRoot500Owner_ownerF193Reconstruction,ownerF193BaseMaterials} from './owner-f193-reconstruction';
import {ownerF187Identity,ownerF187Reconstruction as __infillRoot500Owner_ownerF187Reconstruction,ownerF187BaseMaterials} from './owner-f187-reconstruction';
import {ownerF189Identity,ownerF189Reconstruction as __infillRoot500Owner_ownerF189Reconstruction,ownerF189BaseMaterials} from '../../root500/safety/owner-f189-lazy';
import {ownerF191Identity as __infillRoot500Owner_ownerF191Identity,ownerF191Reconstruction as __infillRoot500Owner_ownerF191Reconstruction,ownerF191BaseMaterials as __infillRoot500Owner_ownerF191BaseMaterials} from './owner-f191-reconstruction';
import {ownerF185Identity,ownerF185Reconstruction,ownerF185BaseMaterials as __infillRoot500Owner_ownerF185BaseMaterials} from './owner-f185-reconstruction';
import {ownerF184Identity,ownerF184Reconstruction,ownerF184BaseMaterials} from './owner-f184-reconstruction';
import {ownerF183Identity,ownerF183Reconstruction as __infillRoot500Owner_ownerF183Reconstruction,ownerF183BaseMaterials} from './owner-f183-reconstruction';
import {ownerF188Identity as __infillRoot500Owner_ownerF188Identity,ownerF188Reconstruction as __infillRoot500Owner_ownerF188Reconstruction,ownerF188BaseMaterials} from './owner-f188-reconstruction';
import {ownerF186Identity,ownerF186Reconstruction as __infillRoot500Owner_ownerF186Reconstruction,ownerF186BaseMaterials} from './owner-f186-reconstruction';
import {ownerF177Identity as __infillRoot500Owner_ownerF177Identity,ownerF177Reconstruction as __infillRoot500Owner_ownerF177Reconstruction,ownerF177BaseMaterials as __infillRoot500Owner_ownerF177BaseMaterials} from './owner-f177-reconstruction';
import {ownerF182Identity,ownerF182Reconstruction,ownerF182BaseMaterials} from './owner-f182-reconstruction';
import {ownerF179Identity,ownerF179Reconstruction as __infillRoot500Owner_ownerF179Reconstruction,ownerF179BaseMaterials} from './owner-f179-reconstruction';
import {ownerF159Identity,ownerF159Reconstruction,ownerF159BaseMaterials} from './owner-f159-reconstruction';
import {ownerF176Identity,ownerF176Reconstruction,ownerF176BaseMaterials} from './owner-f176-reconstruction';
import {ownerF181Identity,ownerF181Reconstruction,ownerF181BaseMaterials} from './owner-f181-reconstruction';
import {ownerF180Identity,ownerF180Reconstruction as __infillRoot500Owner_ownerF180Reconstruction,ownerF180BaseMaterials as __infillRoot500Owner_ownerF180BaseMaterials} from './owner-f180-reconstruction';
import {ownerF175Identity,ownerF175Reconstruction,ownerF175BaseMaterials} from './owner-f175-reconstruction';
import {ownerF178Identity,ownerF178Reconstruction as __infillRoot500Owner_ownerF178Reconstruction,ownerF178BaseMaterials} from './owner-f178-reconstruction';
import {ownerF158Identity,ownerF158Reconstruction,ownerF158BaseMaterials} from './owner-f158-reconstruction';
import {ownerF174Identity,ownerF174Reconstruction,ownerF174BaseMaterials} from './owner-f174-reconstruction';
import {ownerF152CompleteWindowMaterials} from './owner-f152-complete-windows';
import {ownerF160Identity,ownerF160Reconstruction as __infillRoot500Owner_ownerF160Reconstruction,ownerF160BaseMaterials} from './owner-f160-reconstruction';
import {ownerF157Identity,ownerF157Reconstruction,ownerF157BaseMaterials} from './owner-f157-reconstruction';
import {ownerF152CofaceIdentity as __infillRoot500Owner_ownerF152CofaceIdentity,ownerF152CofaceReconstruction as __infillRoot500Owner_ownerF152CofaceReconstruction} from './owner-f152-coface';
import {ownerF156Identity,ownerF156Reconstruction,ownerF156BaseMaterials} from './owner-f156-reconstruction';
import {ownerF155Identity,ownerF155Reconstruction as __infillRoot500Owner_ownerF155Reconstruction,ownerF155BaseMaterials} from './owner-f155-reconstruction';
import {retireF154ReconstructionConstruction,ownerF154Identity,ownerF154Reconstruction as __infillRoot500Owner_ownerF154Reconstruction,ownerF154BaseMaterials as __infillRoot500Owner_ownerF154BaseMaterials} from './owner-f154-reconstruction';
export {ownerF154RecoveredSources as ownerRecoveredSourceComponents,prepareOwnerF154RecoveredSources as prepareOwnerRecoveredSourceComponents} from './owner-f154-reconstruction';
import {ownerF150Identity,ownerF150Reconstruction,ownerF150BaseMaterials} from './owner-f150-reconstruction';
import {ownerF152Identity,ownerF152Reconstruction as __infillRoot500Owner_ownerF152Reconstruction,ownerF152BaseMaterials as __infillRoot500Owner_ownerF152BaseMaterials} from './owner-f152-reconstruction';
import {ownerF149Identity,ownerF149Reconstruction,ownerF149BaseMaterials} from './owner-f149-reconstruction';
import {ownerF147Identity,ownerF147Reconstruction,ownerF147BaseMaterials} from './owner-f147-reconstruction';
import {ownerF145Identity,ownerF145Reconstruction,ownerF145BaseMaterials as __infillRoot500Owner_ownerF145BaseMaterials} from './owner-f145-reconstruction';
import {ownerF146Identity,ownerF146Reconstruction,ownerF146BaseMaterials} from './owner-f146-reconstruction';
import {ownerF153Identity,ownerF153Reconstruction,ownerF153BaseMaterials as __infillRoot500Owner_ownerF153BaseMaterials} from './owner-f153-reconstruction';
import {ownerF078Identity,ownerF078Reconstruction,ownerF078BaseMaterials} from './owner-f078-reconstruction';
import {ownerF064Identity,ownerF064Reconstruction,ownerF064BaseMaterials} from './owner-f064-reconstruction';
import {ownerF148Identity,ownerF148Reconstruction as __infillRoot500Owner_ownerF148Reconstruction,ownerF148BaseMaterials} from './owner-f148-reconstruction';
import {ownerF148Materials} from './owner-f148-materials';
import {ownerF196Materials} from './owner-f196-materials';
import {ownerF135GardenIdentity,ownerF135GardenReconstruction as __infillRoot500Owner_ownerF135GardenReconstruction,ownerF135GardenMaterials as __infillRoot500Owner_ownerF135GardenMaterials} from './owner-f135-garden';
import {ownerF190Identity,ownerF190Reconstruction as __infillRoot500Owner_ownerF190Reconstruction,ownerF190BaseMaterials as __infillRoot500Owner_ownerF190BaseMaterials} from './owner-f190-reconstruction';
import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {ownerF032Identity,ownerF032Reconstruction as __infillRoot500Owner_ownerF032Reconstruction,ownerF032BaseMaterials as __infillRoot500Owner_ownerF032BaseMaterials,type OwnerReconstructionStats} from './owner-f032-reconstruction';
import {ownerF135Identity,ownerF135WestCompletionIdentity,ownerF135Reconstruction as __infillRoot500Owner_ownerF135Reconstruction,ownerF135BaseMaterials as __infillRoot500Owner_ownerF135BaseMaterials,ownerF135WestMaterials as __infillRoot500Owner_ownerF135WestMaterials} from './owner-f135-reconstruction';
import {ownerF173BaseMaterials} from './owner-f173-materials';
import {ownerF165Identity,ownerF165Reconstruction as __infillRoot500Owner_ownerF165Reconstruction,ownerF165BaseMaterials} from '../../root500/safety/owner-f165-lazy';
import {ownerF023PergolaIdentity as __infillRoot500Owner_ownerF023PergolaIdentity,ownerF023PergolaReconstruction as __infillRoot500Owner_ownerF023PergolaReconstruction,ownerF023PergolaBaseMaterials as __infillRoot500Owner_ownerF023PergolaBaseMaterials} from './owner-f023-pergola';
import {ownerF173Identity,ownerF173Reconstruction as __infillRoot500Owner_ownerF173Reconstruction} from './owner-f173-reconstruction';
import {ownerF073SupplementMaterials as __infillRoot500Owner_ownerF073SupplementMaterials} from './owner-f073-materials';
import {ownerF071NarzissIdentity as __infillRoot500Owner_ownerF071NarzissIdentity,ownerF071NarzissReconstruction as __infillRoot500Owner_ownerF071NarzissReconstruction,ownerF071NarzissMaterials as __infillRoot500Owner_ownerF071NarzissMaterials} from './owner-f071-narziss-reconstruction';
import {ownerF077CompletionIdentity,ownerF077CompletionReconstruction as __infillFunctionDependency169,ownerF077CompletionMaterials as __infillFunctionDependency170} from './owner-f077-completion';
import {ownerF085CompletionIdentity as __infillRoot500Owner_ownerF085CompletionIdentity,ownerF085CompletionReconstruction as __infillRoot500Owner_ownerF085CompletionReconstruction,ownerF085CompletionMaterials as __infillRoot500Owner_ownerF085CompletionMaterials} from './owner-f085-completion';
import {ownerF081CompletionIdentity as __infillFunctionDependency171,ownerF081CompletionReconstruction as __infillFunctionDependency172,ownerF081CompletionMaterials as __infillFunctionDependency173} from './owner-f081-completion';
import {ownerF084Identity,ownerF084Reconstruction as __infillRoot500Owner_ownerF084Reconstruction,ownerF084BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF116CompletionIdentity,ownerF116CompletionReconstruction as __infillFunctionDependency174,ownerF116CompletionMaterials as __infillFunctionDependency175} from './owner-f116-completion';
import {ownerF115Identity as __infillRoot500Owner_ownerF115Identity,ownerF115Reconstruction as __infillRoot500Owner_ownerF115Reconstruction,ownerF115BaseMaterials as __infillRoot500Owner_ownerF115BaseMaterials} from './owner-f115-reconstruction';
import {ownerF117Identity,ownerF117Reconstruction as __infillRoot500Owner_ownerF117Reconstruction,ownerF117BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF128RoofIdentity as __infillRoot500Owner_ownerF128RoofIdentity,ownerF128RoofReconstruction as __infillRoot500Owner_ownerF128RoofReconstruction,ownerF128RoofMaterials as __infillRoot500Owner_ownerF128RoofMaterials} from './owner-f128-roof-reconstruction';
import {ownerF088CompletionIdentity,ownerF088CompletionReconstruction as __infillFunctionDependency176,ownerF088CompletionMaterials as __infillFunctionDependency177} from './owner-f088-completion';
import {ownerF127Identity,ownerF127Reconstruction as __infillRoot500Owner_ownerF127Reconstruction,ownerF127BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF115ExteriorIdentity as __infillRoot500Owner_ownerF115ExteriorIdentity,ownerF115ExteriorReconstruction as __infillRoot500Owner_ownerF115ExteriorReconstruction,ownerF115ExteriorBaseMaterials as __infillRoot500Owner_ownerF115ExteriorBaseMaterials} from './owner-f115-exterior-reconstruction';
import {ownerF128CompletionIdentity,ownerF128CompletionReconstruction as __infillFunctionDependency178,ownerF128CompletionMaterials as __infillFunctionDependency179} from './owner-f128-completion';
import {ownerF120Identity,ownerF120Reconstruction as __infillRoot500Owner_ownerF120Reconstruction,ownerF120BaseMaterials} from './owner-f120-reconstruction';
import {ownerF123Identity,ownerF123Reconstruction as __infillRoot500Owner_ownerF123Reconstruction,ownerF123BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF122CompletionIdentity as __infillFunctionDependency180,ownerF122CompletionReconstruction as __infillFunctionDependency181,ownerF122CompletionMaterials as __infillFunctionDependency182} from './owner-f122-completion';
import {ownerF121CompletionIdentity,ownerF121CompletionReconstruction as __infillRoot500Owner_ownerF121CompletionReconstruction,ownerF121CompletionBaseMaterials as __infillRoot500Owner_ownerF121CompletionBaseMaterials} from './owner-f121-completion-reconstruction';
import {ownerF125Identity,ownerF125Reconstruction as __infillRoot500Owner_ownerF125Reconstruction,ownerF125BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF126CompletionIdentity as __infillFunctionDependency183,ownerF126CompletionReconstruction as __infillFunctionDependency184,ownerF126CompletionMaterials as __infillFunctionDependency185} from './owner-f126-completion';
import {ownerF129Identity,ownerF129Reconstruction as __infillRoot500Owner_ownerF129Reconstruction,ownerF129BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF131CompletionIdentity as __infillFunctionDependency186,ownerF131CompletionReconstruction as __infillFunctionDependency187,ownerF131CompletionMaterials as __infillFunctionDependency188} from './owner-f131-completion';
import {ownerF134Identity,ownerF134Reconstruction as __infillRoot500Owner_ownerF134Reconstruction,ownerF134BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF124CompletionIdentity,ownerF124CompletionReconstruction as __infillRoot500Owner_ownerF124CompletionReconstruction,ownerF124CompletionBaseMaterials as __infillRoot500Owner_ownerF124CompletionBaseMaterials} from '../../root500/safety/owner-f124-completion-lazy';
import {ownerF139Identity,ownerF139Reconstruction as __infillRoot500Owner_ownerF139Reconstruction,ownerF139BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF161Identity as __infillRoot500Owner_ownerF161Identity,ownerF161Reconstruction as __infillRoot500Owner_ownerF161Reconstruction,ownerF161BaseMaterials as __infillRoot500Owner_ownerF161BaseMaterials} from './owner-f161-roof';
import {ownerF143Identity as __infillRoot500Owner_ownerF143Identity,ownerF143Reconstruction as __infillRoot500Owner_ownerF143Reconstruction,ownerF143BaseMaterials as __infillRoot500Owner_ownerF143BaseMaterials} from './owner-f143-completion';
import {ownerF151Identity,ownerF151Reconstruction as __infillRoot500Owner_ownerF151Reconstruction,ownerF151BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF141CompletionIdentity,ownerF141CompletionReconstruction as __infillRoot500Owner_ownerF141CompletionReconstruction,ownerF141CompletionBaseMaterials as __infillRoot500Owner_ownerF141CompletionBaseMaterials} from '../../root500/safety/owner-f141-completion-lazy';
import {ownerF168Identity,ownerF168Reconstruction as __infillRoot500Owner_ownerF168Reconstruction,ownerF168BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF171Identity as __infillRoot500Owner_ownerF171Identity,ownerF171Reconstruction as __infillRoot500Owner_ownerF171Reconstruction,ownerF171BaseMaterials as __infillRoot500Owner_ownerF171BaseMaterials} from './owner-f171-completion';
import {ownerF172Identity,ownerF172Reconstruction as __infillRoot500Owner_ownerF172Reconstruction,ownerF172BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF169CompletionIdentity,ownerF169CompletionReconstruction as __infillRoot500Owner_ownerF169CompletionReconstruction,ownerF169CompletionBaseMaterials as __infillRoot500Owner_ownerF169CompletionBaseMaterials} from '../../root500/safety/owner-f169-completion-lazy';
import {ownerF170Identity as __infillRoot500Owner_ownerF170Identity,ownerF170Reconstruction as __infillRoot500Owner_ownerF170Reconstruction,ownerF170BaseMaterials as __infillRoot500Owner_ownerF170BaseMaterials} from './owner-f170-completion';
import {ownerF108CompletionIdentity,ownerF108CompletionReconstruction as __infillRoot500Owner_ownerF108CompletionReconstruction,ownerF108CompletionBaseMaterials as __infillRoot500Owner_ownerF108CompletionBaseMaterials} from '../../root500/safety/owner-f108-completion-lazy';
import {ownerF106Identity as __infillRoot500Owner_ownerF106Identity,ownerF106Reconstruction as __infillRoot500Owner_ownerF106Reconstruction,ownerF106BaseMaterials as __infillRoot500Owner_ownerF106BaseMaterials} from './owner-f106-completion';
import {ownerF109Identity,ownerF109Reconstruction as __infillRoot500Owner_ownerF109Reconstruction,ownerF109BaseMaterials} from '../../root500/safety/owner-nonberlin-lazy';
import {ownerF086Identity as __infillRoot500Owner_ownerF086Identity,ownerF086Reconstruction as __infillRoot500Owner_ownerF086Reconstruction,ownerF086BaseMaterials as __infillRoot500Owner_ownerF086BaseMaterials} from './owner-f086-completion';
import {ownerF089Identity,ownerF089Reconstruction as __infillRoot500Owner_ownerF089Reconstruction,ownerF089BaseMaterials} from '../../root500/safety/owner-f089-lazy';
import {ownerF018Identity as __infillFunctionDependency189,ownerF018Reconstruction as __infillFunctionDependency190,ownerF018BaseMaterials as __infillFunctionDependency191} from './owner-f018-completion';
export type {OwnerReconstructionStats};




// Owner-selected infill runs after the unchanged frozen providers.






































































































































































































const infillDataMemoKey=Object.freeze({});
const infillOwnDataRefs:readonly FrozenDataRef[]=[];
export const infillDataRefs:readonly FrozenDataRef[]=[...infillOwnDataRefs];
export const infillDataMemoKeys:readonly object[]=[infillDataMemoKey];
export function getInfillData(scope:FrozenDataScope|undefined){if(!scope)throw Error("owner-reconstruction.ts requires a prepared FrozenDataScope");return scope.memo(infillDataMemoKey,()=>{
const handelshofBalconies103Reconstruction=(...args:Parameters<typeof __infillFunctionDependency0>)=>__infillFunctionDependency0(args[0],scope);
const handelshofBalconies103BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency1>)=>__infillFunctionDependency1(args[0],args[1],args[2],scope);
const messeNativeChildren102Identity=(...args:Parameters<typeof __infillFunctionDependency2>)=>__infillFunctionDependency2(args[0],scope);
const messeNativeChildren102Reconstruction=(...args:Parameters<typeof __infillFunctionDependency3>)=>__infillFunctionDependency3(args[0],scope);
const messeNativeChildren102BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency4>)=>__infillFunctionDependency4(args[0],args[1],args[2],scope);
const ml61Entry092Reconstruction=(...args:Parameters<typeof __infillFunctionDependency5>)=>__infillFunctionDependency5(args[0],args[1],scope);
const ml61Entry092MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency6>)=>__infillFunctionDependency6(args[0],args[1],args[2],scope);
const gallusanlage8Children089Identity=(...args:Parameters<typeof __infillFunctionDependency7>)=>__infillFunctionDependency7(args[0],scope);
const gallusanlage8Children089Reconstruction=(...args:Parameters<typeof __infillFunctionDependency8>)=>__infillFunctionDependency8(args[0],scope);
const gallusanlage8Children089BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency9>)=>__infillFunctionDependency9(args[0],args[1],args[2],scope);
const gardenUpperPhoto087BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency10>)=>__infillFunctionDependency10(args[0],args[1],args[2],scope);
const fra145Return087MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency11>)=>__infillFunctionDependency11(args[0],args[1],args[2],scope);
const mainTorPortaOriginal087Reconstruction=(...args:Parameters<typeof __infillFunctionDependency12>)=>__infillFunctionDependency12(args[0],scope);
const mainTorPortaOriginal087BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency13>)=>__infillFunctionDependency13(args[0],args[1],args[2],scope);
const gardenAggregate086Identity=(...args:Parameters<typeof __infillFunctionDependency14>)=>__infillFunctionDependency14(args[0],scope);
const gardenAggregate086Reconstruction=(...args:Parameters<typeof __infillFunctionDependency15>)=>__infillFunctionDependency15(args[0],scope);
const fra144ResidualMaterials086Identity=(...args:Parameters<typeof __infillFunctionDependency16>)=>__infillFunctionDependency16(args[0],scope);
const fra144ResidualMaterials086Reconstruction=(...args:Parameters<typeof __infillFunctionDependency17>)=>__infillFunctionDependency17(args[0],scope);
const fra144ResidualMaterials086MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency18>)=>__infillFunctionDependency18(args[0],args[1],args[2],scope);
const kioskGlazing084BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency19>)=>__infillFunctionDependency19(args[0],args[1],args[2],scope);
const frankfurtHbfLowwing082Reconstruction=(...args:Parameters<typeof __infillFunctionDependency20>)=>__infillFunctionDependency20(args[0],scope);
const frankfurtHbfLowwing082MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency21>)=>__infillFunctionDependency21(args[0],args[1],args[2],scope);
const kioskCanopy080Reconstruction=(...args:Parameters<typeof __infillFunctionDependency22>)=>__infillFunctionDependency22(args[0],scope);
const kioskCanopy080BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency23>)=>__infillFunctionDependency23(args[0],args[1],args[2],scope);
const fra144WallOverlap079Reconstruction=(...args:Parameters<typeof __infillFunctionDependency24>)=>__infillFunctionDependency24(args[0],scope);
const ecbLoopJunction077Reconstruction=(...args:Parameters<typeof __infillFunctionDependency25>)=>__infillFunctionDependency25(args[0],scope);
const ecbLoopJunction077BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency26>)=>__infillFunctionDependency26(args[0],args[1],args[2],scope);
const katharinen149Facades078MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency27>)=>__infillFunctionDependency27(args[0],args[1],args[2],scope);
const senckenbergPartDisplay076Reconstruction=(...args:Parameters<typeof __infillFunctionDependency28>)=>__infillFunctionDependency28(args[0],scope);
const frankfurtGroups144146Official073Identity=(...args:Parameters<typeof __infillFunctionDependency29>)=>__infillFunctionDependency29(args[0],scope);
const frankfurtGroups144146Official073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency30>)=>__infillFunctionDependency30(args[0],args[1],args[2],scope);
const katharinen149Edge075Reconstruction=(...args:Parameters<typeof __infillFunctionDependency31>)=>__infillFunctionDependency31(args[0],scope);
const katharinen149Edge075BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency32>)=>__infillFunctionDependency32(args[0],args[1],args[2],scope);
const ecbEntranceAggregate073Identity=(...args:Parameters<typeof __infillFunctionDependency33>)=>__infillFunctionDependency33(args[0],scope);
const ecbEntranceAggregate073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency34>)=>__infillFunctionDependency34(args[0],args[1],args[2],scope);
const ecbAncillary073Identity=(...args:Parameters<typeof __infillFunctionDependency35>)=>__infillFunctionDependency35(args[0],scope);
const ecbAncillary073Reconstruction=(...args:Parameters<typeof __infillFunctionDependency36>)=>__infillFunctionDependency36(args[0],scope);
const ecbAncillary073BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency37>)=>__infillFunctionDependency37(args[0],args[1],args[2],scope);
const senckenbergSelected074BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency38>)=>__infillFunctionDependency38(args[0],args[1],args[2],scope);
const katharinenEast149Official070BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency39>)=>__infillFunctionDependency39(args[0],args[1],args[2],scope);
const ecbPress072Reconstruction=(...args:Parameters<typeof __infillFunctionDependency40>)=>__infillFunctionDependency40(args[0],scope);
const ecbPress072BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency41>)=>__infillFunctionDependency41(args[0],args[1],args[2],scope);
const hausdomOfficial070Reconstruction=(...args:Parameters<typeof __infillFunctionDependency42>)=>__infillFunctionDependency42(args[0],scope);
const hausdomOfficial070BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency43>)=>__infillFunctionDependency43(args[0],args[1],args[2],scope);
const weststrip253Measured067Reconstruction=(...args:Parameters<typeof __infillFunctionDependency44>)=>__infillFunctionDependency44(args[0],scope);
const weststrip253Measured067BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency45>)=>__infillFunctionDependency45(args[0],args[1],args[2],scope);
const frankfurtOfficePrincipals069Identity=(...args:Parameters<typeof __infillFunctionDependency46>)=>__infillFunctionDependency46(args[0],scope);
const frankfurtOfficePrincipals069Reconstruction=(...args:Parameters<typeof __infillFunctionDependency47>)=>__infillFunctionDependency47(args[0],scope);
const frankfurtOfficePrincipals069BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency48>)=>__infillFunctionDependency48(args[0],args[1],args[2],scope);
const globalTowerOfficial071Identity=(...args:Parameters<typeof __infillFunctionDependency49>)=>__infillFunctionDependency49(args[0],scope);
const globalTowerOfficial071Reconstruction=(...args:Parameters<typeof __infillFunctionDependency50>)=>__infillFunctionDependency50(args[0],scope);
const globalTowerOfficial071BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency51>)=>__infillFunctionDependency51(args[0],args[1],args[2],scope);
const commerzbankFan066AfterParent053Reconstruction=(...args:Parameters<typeof __infillFunctionDependency52>)=>__infillFunctionDependency52(args[0],scope);
const commerzbankFan066BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency53>)=>__infillFunctionDependency53(args[0],args[1],args[2],scope);
const kaiser1820Official064Identity=(...args:Parameters<typeof __infillFunctionDependency54>)=>__infillFunctionDependency54(args[0],scope);
const kaiser1820Official064Reconstruction=(...args:Parameters<typeof __infillFunctionDependency55>)=>__infillFunctionDependency55(args[0],scope);
const kaiser1820Official064BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency56>)=>__infillFunctionDependency56(args[0],args[1],args[2],scope);
const commerzbankPodiumOfficial060Identity=(...args:Parameters<typeof __infillFunctionDependency57>)=>__infillFunctionDependency57(args[0],scope);
const commerzbankPodiumOfficial060Reconstruction=(...args:Parameters<typeof __infillFunctionDependency58>)=>__infillFunctionDependency58(args[0],scope);
const commerzbankPodiumOfficial060BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency59>)=>__infillFunctionDependency59(args[0],args[1],args[2],scope);
const main11369Display058Identity=(...args:Parameters<typeof __infillFunctionDependency60>)=>__infillFunctionDependency60(args[0],scope);
const main11369Display058Reconstruction=(...args:Parameters<typeof __infillFunctionDependency61>)=>__infillFunctionDependency61(args[0],scope);
const main11369Display058BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency62>)=>__infillFunctionDependency62(args[0],args[1],args[2],scope);
const infillFrankfurtJwMarriottIdentity=(...args:Parameters<typeof __infillFunctionDependency63>)=>__infillFunctionDependency63(args[0],scope);
const infillFrankfurtJwMarriottReconstruction=(...args:Parameters<typeof __infillFunctionDependency64>)=>__infillFunctionDependency64(args[0],scope);
const infillFrankfurtJwMarriottBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency65>)=>__infillFunctionDependency65(args[0],args[1],args[2],scope);
const infillJapanCenterReconstruction=(...args:Parameters<typeof __infillFunctionDependency66>)=>__infillFunctionDependency66(args[0],scope);
const infillMarienturm054RemoveDuplicateNativeParts=(...args:Parameters<typeof __infillFunctionDependency67>)=>__infillFunctionDependency67(args[0],scope);
const silberturmFullReconstruction051=(...args:Parameters<typeof __infillFunctionDependency68>)=>__infillFunctionDependency68(args[0],scope);
const silberturmSpecificMaterials050=(...args:Parameters<typeof __infillFunctionDependency69>)=>__infillFunctionDependency69(args[0],args[1],args[2],scope);
const infillOmniturmIdentity=(...args:Parameters<typeof __infillFunctionDependency70>)=>__infillFunctionDependency70(args[0],scope);
const infillOmniturmReconstruction=(...args:Parameters<typeof __infillFunctionDependency71>)=>__infillFunctionDependency71(args[0],scope);
const infillOmniturmBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency72>)=>__infillFunctionDependency72(args[0],args[1],args[2],scope);
const marienturm050Identity=(...args:Parameters<typeof __infillFunctionDependency73>)=>__infillFunctionDependency73(args[0],scope);
const marienturm050Reconstruction=(...args:Parameters<typeof __infillFunctionDependency74>)=>__infillFunctionDependency74(args[0],scope);
const marienturm050BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency75>)=>__infillFunctionDependency75(args[0],args[1],args[2],scope);
const infillC032OriginalIdentity=(...args:Parameters<typeof __infillFunctionDependency76>)=>__infillFunctionDependency76(args[0],scope);
const infillC032OfficialIdentity=(...args:Parameters<typeof __infillFunctionDependency77>)=>__infillFunctionDependency77(args[0],scope);
const infillC032OfficialReconstruction=(...args:Parameters<typeof __infillFunctionDependency78>)=>__infillFunctionDependency78(args[0],scope);
const infillFrankfurtJunghof088Identity=(...args:Parameters<typeof __infillFunctionDependency79>)=>__infillFunctionDependency79(args[0],scope);
const infillFrankfurtJunghof088Reconstruction=(...args:Parameters<typeof __infillFunctionDependency80>)=>__infillFunctionDependency80(args[0],args[1],scope);
const infillFrankfurtJunghof088RoofMaterialFrames062=(...args:Parameters<typeof __infillFunctionDependency81>)=>__infillFunctionDependency81(args[0],args[1],scope);
const infillFrankfurtBockenheimer084Identity=(...args:Parameters<typeof __infillFunctionDependency82>)=>__infillFunctionDependency82(args[0],scope);
const infillFrankfurtBockenheimer084Reconstruction=(...args:Parameters<typeof __infillFunctionDependency83>)=>__infillFunctionDependency83(args[0],args[1],scope);
const infillF288OriginalIdentity=(...args:Parameters<typeof __infillFunctionDependency84>)=>__infillFunctionDependency84(args[0],scope);
const infillF288OriginalReconstruction=(...args:Parameters<typeof __infillFunctionDependency85>)=>__infillFunctionDependency85(args[0],scope);
const infillEberhardHistoricalReconstruction=(...args:Parameters<typeof __infillFunctionDependency86>)=>__infillFunctionDependency86(args[0],scope);
const infillGoethe34Identity=(...args:Parameters<typeof __infillFunctionDependency87>)=>__infillFunctionDependency87(args[0],scope);
const infillGoethe34Reconstruction=(...args:Parameters<typeof __infillFunctionDependency88>)=>__infillFunctionDependency88(args[0],args[1],scope);
const infillFrankfurtKettenhof065Identity=(...args:Parameters<typeof __infillFunctionDependency89>)=>__infillFunctionDependency89(args[0],scope);
const infillFrankfurtKettenhof065Reconstruction=(...args:Parameters<typeof __infillFunctionDependency90>)=>__infillFunctionDependency90(args[0],args[1],scope);
const infillFrankfurtVCIRoof095Reconstruction=(...args:Parameters<typeof __infillFunctionDependency91>)=>__infillFunctionDependency91(args[0],args[1],scope);
const infillFrankfurtVCIRoof095MaterialFrames=(...args:Parameters<typeof __infillFunctionDependency92>)=>__infillFunctionDependency92(args[0],args[1],args[2],scope);
const infillFrankfurtVCI051Identity=(...args:Parameters<typeof __infillFunctionDependency93>)=>__infillFunctionDependency93(args[0],scope);
const infillFrankfurtVCI051Reconstruction=(...args:Parameters<typeof __infillFunctionDependency94>)=>__infillFunctionDependency94(args[0],args[1],scope);
const infillFrankfurtML41SignarisIdentity=(...args:Parameters<typeof __infillFunctionDependency95>)=>__infillFunctionDependency95(args[0],scope);
const infillFrankfurtML41SignarisReconstruction=(...args:Parameters<typeof __infillFunctionDependency96>)=>__infillFunctionDependency96(args[0],args[1],scope);
const infillFrankfurtLowOfficeBulk70Identity=(...args:Parameters<typeof __infillFunctionDependency97>)=>__infillFunctionDependency97(args[0],scope);
const infillSchneider076Identity=(...args:Parameters<typeof __infillFunctionDependency98>)=>__infillFunctionDependency98(args[0],scope);
const infillSchneider076Reconstruction=(...args:Parameters<typeof __infillFunctionDependency99>)=>__infillFunctionDependency99(args[0],args[1],scope);
const infillFrankfurtMaro74Identity=(...args:Parameters<typeof __infillFunctionDependency100>)=>__infillFunctionDependency100(args[0],scope);
const infillFrankfurtMaro74Reconstruction=(...args:Parameters<typeof __infillFunctionDependency101>)=>__infillFunctionDependency101(args[0],args[1],scope);
const infillFrankfurtLowOfficeK26Identity=(...args:Parameters<typeof __infillFunctionDependency102>)=>__infillFunctionDependency102(args[0],scope);
const infillFrankfurtLowOfficeK26Reconstruction=(...args:Parameters<typeof __infillFunctionDependency103>)=>__infillFunctionDependency103(args[0],args[1],scope);
const infillFrankfurtLowOfficeBatch2Identity=(...args:Parameters<typeof __infillFunctionDependency104>)=>__infillFunctionDependency104(args[0],scope);
const infillFrankfurtLowOfficeBatch2Reconstruction=(...args:Parameters<typeof __infillFunctionDependency105>)=>__infillFunctionDependency105(args[0],args[1],scope);
const infillFrankfurtLowOfficeIdentity=(...args:Parameters<typeof __infillFunctionDependency106>)=>__infillFunctionDependency106(args[0],scope);
const infillFrankfurtLowOfficeReconstruction=(...args:Parameters<typeof __infillFunctionDependency107>)=>__infillFunctionDependency107(args[0],args[1],scope);
const infillStJohannReconstruction=(...args:Parameters<typeof __infillFunctionDependency108>)=>__infillFunctionDependency108(args[0],scope);
const infillGalerieIdentity=(...args:Parameters<typeof __infillFunctionDependency109>)=>__infillFunctionDependency109(args[0],scope);
const infillGalerieReconstruction=(...args:Parameters<typeof __infillFunctionDependency110>)=>__infillFunctionDependency110(args[0],scope);
const infillRabbiReconstruction=(...args:Parameters<typeof __infillFunctionDependency111>)=>__infillFunctionDependency111(args[0],scope);
const infillGrafCourtyardMeasuredReconstruction=(...args:Parameters<typeof __infillFunctionDependency112>)=>__infillFunctionDependency112(args[0],scope);
const infillGrafWestMeasuredReconstruction=(...args:Parameters<typeof __infillFunctionDependency113>)=>__infillFunctionDependency113(args[0],scope);
const infillFrankfurtSkyperIdentity=(...args:Parameters<typeof __infillFunctionDependency114>)=>__infillFunctionDependency114(args[0],scope);
const infillFrankfurtSkyperReconstruction=(...args:Parameters<typeof __infillFunctionDependency115>)=>__infillFunctionDependency115(args[0],scope);
const infillFrankfurtSkyperBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency116>)=>__infillFunctionDependency116(args[0],args[1],args[2],scope);
const infillEurotowerReconstruction=(...args:Parameters<typeof __infillFunctionDependency117>)=>__infillFunctionDependency117(args[0],scope);
const infillJubilaeumssaeuleReconstruction=(...args:Parameters<typeof __infillFunctionDependency118>)=>__infillFunctionDependency118(args[0],scope);
const infillJubilaeumssaeuleBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency119>)=>__infillFunctionDependency119(args[0],args[1],args[2],scope);
const infillOpernturmReconstruction=(...args:Parameters<typeof __infillFunctionDependency120>)=>__infillFunctionDependency120(args[0],scope);
const infillFrankfurtSpinIdentity=(...args:Parameters<typeof __infillFunctionDependency121>)=>__infillFunctionDependency121(args[0],scope);
const infillFrankfurtSpinReconstruction=(...args:Parameters<typeof __infillFunctionDependency122>)=>__infillFunctionDependency122(args[0],scope);
const infillFrankfurtSpinBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency123>)=>__infillFunctionDependency123(args[0],args[1],args[2],scope);
const infillOneReconstruction=(...args:Parameters<typeof __infillFunctionDependency124>)=>__infillFunctionDependency124(args[0],scope);
const infillBoersenplatzBlockReconstruction=(...args:Parameters<typeof __infillFunctionDependency125>)=>__infillFunctionDependency125(args[0],scope);
const infillFrankfurtWestendgateIdentity=(...args:Parameters<typeof __infillFunctionDependency126>)=>__infillFunctionDependency126(args[0],scope);
const infillFrankfurtWestendgateReconstruction=(...args:Parameters<typeof __infillFunctionDependency127>)=>__infillFunctionDependency127(args[0],scope);
const infillFrankfurtWestendgateBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency128>)=>__infillFunctionDependency128(args[0],args[1],args[2],scope);
const infillMyzeilReconstruction=(...args:Parameters<typeof __infillFunctionDependency129>)=>__infillFunctionDependency129(args[0],scope);
const infillFrankfurtNextowerIdentity=(...args:Parameters<typeof __infillFunctionDependency130>)=>__infillFunctionDependency130(args[0],scope);
const infillFrankfurtNextowerReconstruction=(...args:Parameters<typeof __infillFunctionDependency131>)=>__infillFunctionDependency131(args[0],scope);
const infillFrankfurtNextowerBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency132>)=>__infillFunctionDependency132(args[0],args[1],args[2],scope);
const infillFrankfurtDeutscheBankIdentity=(...args:Parameters<typeof __infillFunctionDependency133>)=>__infillFunctionDependency133(args[0],scope);
const infillFrankfurtDeutscheBankReconstruction=(...args:Parameters<typeof __infillFunctionDependency134>)=>__infillFunctionDependency134(args[0],scope);
const infillFrankfurtDeutscheBankBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency135>)=>__infillFunctionDependency135(args[0],args[1],args[2],scope);
const infillWestend1Reconstruction=(...args:Parameters<typeof __infillFunctionDependency136>)=>__infillFunctionDependency136(args[0],scope);
const infillFrankfurtTrianonIdentity=(...args:Parameters<typeof __infillFunctionDependency137>)=>__infillFunctionDependency137(args[0],scope);
const infillFrankfurtTrianonReconstruction=(...args:Parameters<typeof __infillFunctionDependency138>)=>__infillFunctionDependency138(args[0],scope);
const infillFrankfurtTrianonBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency139>)=>__infillFunctionDependency139(args[0],args[1],args[2],scope);
const infillFrankfurtFbcIdentity=(...args:Parameters<typeof __infillFunctionDependency140>)=>__infillFunctionDependency140(args[0],scope);
const infillFrankfurtFbcReconstruction=(...args:Parameters<typeof __infillFunctionDependency141>)=>__infillFunctionDependency141(args[0],scope);
const infillFrankfurtFbcBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency142>)=>__infillFunctionDependency142(args[0],args[1],args[2],scope);
const infillTower185Reconstruction=(...args:Parameters<typeof __infillFunctionDependency143>)=>__infillFunctionDependency143(args[0],scope);
const infillBoerseReconstruction=(...args:Parameters<typeof __infillFunctionDependency144>)=>__infillFunctionDependency144(args[0],scope);
const infillGrafGeissReconstruction=(...args:Parameters<typeof __infillFunctionDependency145>)=>__infillFunctionDependency145(args[0],scope);
const infillGrafRearReconstruction=(...args:Parameters<typeof __infillFunctionDependency146>)=>__infillFunctionDependency146(args[0],scope);
const infillKoenigsbauRepairReconstruction=(...args:Parameters<typeof __infillFunctionDependency147>)=>__infillFunctionDependency147(args[0],scope);
const infillWlbOldReconstruction=(...args:Parameters<typeof __infillFunctionDependency148>)=>__infillFunctionDependency148(args[0],scope);
const infillWlbExtensionReconstruction=(...args:Parameters<typeof __infillFunctionDependency149>)=>__infillFunctionDependency149(args[0],scope);
const infillEcbReconstruction=(...args:Parameters<typeof __infillFunctionDependency150>)=>__infillFunctionDependency150(args[0],scope);
const infillFrankfurtIdentity=(...args:Parameters<typeof __infillFunctionDependency151>)=>__infillFunctionDependency151(args[0],scope);
const infillFrankfurtReconstruction=(...args:Parameters<typeof __infillFunctionDependency152>)=>__infillFunctionDependency152(args[0],scope);
const infillFrankfurtBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency153>)=>__infillFunctionDependency153(args[0],args[1],args[2],scope);
const infillFrankfurtEastIdentity=(...args:Parameters<typeof __infillFunctionDependency154>)=>__infillFunctionDependency154(args[0],scope);
const infillFrankfurtEastReconstruction=(...args:Parameters<typeof __infillFunctionDependency155>)=>__infillFunctionDependency155(args[0],scope);
const infillFrankfurtEastBaseMaterials=(...args:Parameters<typeof __infillFunctionDependency156>)=>__infillFunctionDependency156(args[0],args[1],args[2],scope);
const infillSchauspielhausReconstruction=(...args:Parameters<typeof __infillFunctionDependency157>)=>__infillFunctionDependency157(args[0],scope);
const infillKoenigsbauPassagenReconstruction=(...args:Parameters<typeof __infillFunctionDependency158>)=>__infillFunctionDependency158(args[0],scope);
const infillGustavReconstruction=(...args:Parameters<typeof __infillFunctionDependency159>)=>__infillFunctionDependency159(args[0],scope);
const infillHmdkReconstruction=(...args:Parameters<typeof __infillFunctionDependency160>)=>__infillFunctionDependency160(args[0],scope);
const infillKatharinaReconstruction=(...args:Parameters<typeof __infillFunctionDependency161>)=>__infillFunctionDependency161(args[0],scope);
const infillPhilharmonieReconstruction=(...args:Parameters<typeof __infillFunctionDependency162>)=>__infillFunctionDependency162(args[0],scope);
const infillEssenIdentity=(...args:Parameters<typeof __infillFunctionDependency163>)=>__infillFunctionDependency163(args[0],scope);
const infillEssenReconstruction=(...args:Parameters<typeof __infillFunctionDependency164>)=>__infillFunctionDependency164(args[0],scope);
const infillSynagogeIdentity=(...args:Parameters<typeof __infillFunctionDependency165>)=>__infillFunctionDependency165(args[0],scope);
const infillSynagogeReconstruction=(...args:Parameters<typeof __infillFunctionDependency166>)=>__infillFunctionDependency166(args[0],scope);
const frankfurtHbf075Reconstruction=(...args:Parameters<typeof __infillFunctionDependency167>)=>__infillFunctionDependency167(args[0],scope);
const frankfurtHbf075BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency168>)=>__infillFunctionDependency168(args[0],args[1],args[2],scope);
const ownerF077CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency169>)=>__infillFunctionDependency169(args[0],scope);
const ownerF077CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency170>)=>__infillFunctionDependency170(args[0],args[1],args[2],scope);
const ownerF081CompletionIdentity=(...args:Parameters<typeof __infillFunctionDependency171>)=>__infillFunctionDependency171(args[0],scope);
const ownerF081CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency172>)=>__infillFunctionDependency172(args[0],scope);
const ownerF081CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency173>)=>__infillFunctionDependency173(args[0],args[1],args[2],scope);
const ownerF116CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency174>)=>__infillFunctionDependency174(args[0],scope);
const ownerF116CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency175>)=>__infillFunctionDependency175(args[0],args[1],args[2],scope);
const ownerF088CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency176>)=>__infillFunctionDependency176(args[0],scope);
const ownerF088CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency177>)=>__infillFunctionDependency177(args[0],args[1],args[2],scope);
const ownerF128CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency178>)=>__infillFunctionDependency178(args[0],scope);
const ownerF128CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency179>)=>__infillFunctionDependency179(args[0],args[1],args[2],scope);
const ownerF122CompletionIdentity=(...args:Parameters<typeof __infillFunctionDependency180>)=>__infillFunctionDependency180(args[0],scope);
const ownerF122CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency181>)=>__infillFunctionDependency181(args[0],scope);
const ownerF122CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency182>)=>__infillFunctionDependency182(args[0],args[1],args[2],scope);
const ownerF126CompletionIdentity=(...args:Parameters<typeof __infillFunctionDependency183>)=>__infillFunctionDependency183(args[0],scope);
const ownerF126CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency184>)=>__infillFunctionDependency184(args[0],scope);
const ownerF126CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency185>)=>__infillFunctionDependency185(args[0],args[1],args[2],scope);
const ownerF131CompletionIdentity=(...args:Parameters<typeof __infillFunctionDependency186>)=>__infillFunctionDependency186(args[0],scope);
const ownerF131CompletionReconstruction=(...args:Parameters<typeof __infillFunctionDependency187>)=>__infillFunctionDependency187(args[0],scope);
const ownerF131CompletionMaterials=(...args:Parameters<typeof __infillFunctionDependency188>)=>__infillFunctionDependency188(args[0],args[1],args[2],scope);
const ownerF018Identity=(...args:Parameters<typeof __infillFunctionDependency189>)=>__infillFunctionDependency189(args[0],scope);
const ownerF018Reconstruction=(...args:Parameters<typeof __infillFunctionDependency190>)=>__infillFunctionDependency190(args[0],scope);
const ownerF018BaseMaterials=(...args:Parameters<typeof __infillFunctionDependency191>)=>__infillFunctionDependency191(args[0],args[1],args[2],scope);

const infillJubilaeumssaeuleIdentity=__infillDataDependency0(scope);
const ownerReconstructionIdentity=(c:Identity)=>messeNativeChildren102Identity(c,scope)||westhafenOriginal102Identity(c)||gallusanlage8Children089Identity(c,scope)||gallusanlage8Material088Identity(c)||mainTorPortaOriginal087Identity(c)||gardenAggregate086Identity(c,scope)||fra144ResidualMaterials086Identity(c,scope)||kioskCanopy080Identity(c)||fra144WallOverlap079Identity(c)||senckenbergPartDisplay076Identity(c)||frankfurtGroups144146Official073Identity(c,scope)||ecbEntranceAggregate073Identity(c,scope)||ecbAncillary073Identity(c,scope)||senckenbergSelected074Identity(c)||katharinenEast149Official070Identity(c)||domturmTicket148070Identity(c)||ecbPress072Identity(c)||hausdomOfficial070Identity(c)||weststrip253Measured067Identity(c)||frankfurtOfficePrincipals069Identity(c,scope)||globalTowerOfficial071Identity(c,scope)||kaiser16Canopy067Identity(c)||commerzbankFan066Identity(c)||kaiser1820Official064Identity(c,scope)||commerzbankPodiumOfficial060Identity(c,scope)||main11369Display058Identity(c,scope)||infillJapanCenterIdentity(c)||infillFrankfurtJwMarriottIdentity(c,scope)||infillMainTowerPodiumIdentity(c)||helvetiaB56Identity055(c)||infillGallileoIdentity(c)||commerzbankParent053Identity(c)||infillSilberturmIdentity(c)||infillOmniturmIdentity(c,scope)||marienturm050Identity(c,scope)||infillPremierIdentity(c)||infillC032OriginalIdentity(c,scope)||infillC032OfficialIdentity(c,scope)||infillFrankfurtJunghof088Identity(c,scope)||infillFrankfurtBockenheimer084Identity(c,scope)||infillF278OriginalIdentity(c)||infillF288OriginalIdentity(c,scope)||infillEberhardHistoricalIdentity(c)||infillGoethe34Identity(c,scope)||infillFrankfurtKettenhof065Identity(c,scope)||infillFrankfurtVCI051Identity(c,scope)||infillFrankfurtML41SignarisIdentity(c,scope)||infillFrankfurtLowOfficeBulk70Identity(c,scope)||infillSchneider076Identity(c,scope)||infillFrankfurtMaro80Identity(c)||infillFrankfurtMaro74Identity(c,scope)||infillFrankfurtLowOfficeK26Identity(c,scope)||infillFrankfurtLowOfficeBatch2Identity(c,scope)||infillFrankfurtLowOfficeIdentity(c,scope)||infillStJohannIdentity(c)||infillGalerieIdentity(c,scope)||infillKatharinaSportsHallIdentity(c)||infillRabbiIdentity(c)||infillGrafEastBridgeIdentity(c)||infillGrafCourtyardMeasuredIdentity(c)||infillGrafWestMeasuredIdentity(c)||infillFrankfurtSkyperIdentity(c,scope)||infillEurotowerIdentity(c)||infillJubilaeumssaeuleIdentity(c)||infillOpernturmIdentity(c)||infillFrankfurtSpinIdentity(c,scope)||infillWinxIdentity(c)||infillOneIdentity(c)||infillBoersenplatzBlockIdentity(c)||infillFrankfurtWestendgateIdentity(c,scope)||infillMyzeilIdentity(c)||infillFrankfurtNextowerIdentity(c,scope)||infillFrankfurtDeutscheBankIdentity(c,scope)||infillWestend1Identity(c)||infillFrankfurtTrianonIdentity(c,scope)||infillFrankfurtFbcIdentity(c,scope)||infillTower185Identity(c)||infillBoerseIdentity(c)||infillHauptwacheIdentity(c)||infillGrafGeissIdentity(c)||infillGrafRearIdentity(c)||infillBahndirektionIdentity(c)||infillKoenigsbauRepairIdentity(c)||infillWlbOldIdentity(c)||infillWlbExtensionIdentity(c)||infillEcbIdentity(c)||infillMainTriangelIdentity(c)||infillKatharinaIdentity(c)||infillHmdkIdentity(c)||infillGustavIdentity(c)||infillKoenigsbauPassagenIdentity(c)||infillSchauspielhausIdentity(c)||infillFrankfurtEastIdentity(c,scope)||infillFrankfurtIdentity(c,scope)||infillPhilharmonieIdentity(c)||infillEssenIdentity(c,scope)||infillSynagogeIdentity(c,scope)||ownerF045ExchangeIdentity(c)||ownerF018Identity(c,scope)||ownerF089Identity(c)||ownerF086Identity(c)||ownerF109Identity(c)||ownerF106Identity(c)||ownerF108CompletionIdentity(c)||ownerF170Identity(c)||ownerF169CompletionIdentity(c)||ownerF172Identity(c)||ownerF171Identity(c)||ownerF168Identity(c)||ownerF141CompletionIdentity(c)||ownerF151Identity(c)||ownerF143Identity(c)||ownerF161Identity(c)||ownerF139Identity(c)||ownerF135WestCompletionIdentity(c)||ownerF124CompletionIdentity(c)||ownerF134Identity(c)||ownerF131CompletionIdentity(c,scope)||ownerF129Identity(c)||ownerF126CompletionIdentity(c,scope)||ownerF125Identity(c)||ownerF121CompletionIdentity(c)||ownerF122CompletionIdentity(c,scope)||ownerF123Identity(c)||ownerF120Identity(c)||ownerF128CompletionIdentity(c)||ownerF115ExteriorIdentity(c)||ownerF127Identity(c)||ownerF088CompletionIdentity(c)||ownerF128RoofIdentity(c)||ownerF117Identity(c)||ownerF115Identity(c)||ownerF116CompletionIdentity(c)||ownerF084Identity(c)||ownerF105Identity(c)||ownerF081CompletionIdentity(c,scope)||ownerF029Identity(c)||ownerF085CompletionIdentity(c)||ownerF077CompletionIdentity(c)||ownerF071NarzissIdentity(c)||ownerF023PergolaIdentity(c)||ownerF165Identity(c)||ownerF173Identity(c)||ownerF167Identity(c)||ownerF130Identity(c)||ownerF076Identity(c)||ownerF142Identity(c)||ownerF118Identity(c)||ownerF133Identity(c)||ownerF035Identity(c)||ownerF083Identity(c)||ownerF072Identity(c)||ownerF071HeightIdentity(c)||ownerF070Identity(c)||ownerF067Identity(c)||ownerF062Identity(c)||ownerF060Identity(c)||ownerF059Identity(c)||ownerF057Identity(c)||ownerF056Identity(c)||ownerF055Identity(c)||ownerF054Identity(c)||ownerF051Identity(c)||ownerF052Identity(c)||ownerF049Identity(c)||ownerF040HIdentity(c)||ownerF048Identity(c)||ownerF166Identity(c)||ownerF163Identity(c)||ownerF164Identity(c)||ownerF162Identity(c)||ownerF140Identity(c)||ownerF144Identity(c)||ownerF138Identity(c)||frankfurtHbf075Identity(c)||ownerF114Identity(c)||ownerF136Identity(c)||ownerF132Identity(c)||ownerF110Identity(c)||ownerF113Identity(c)||ownerF112Identity(c)||ownerF111Identity(c)||ownerF079Identity(c)||ownerF065PlatformIdentity(c)||ownerF065Identity(c)||ownerF026Identity(c)||ownerF031Identity(c)||ownerF027Identity(c)||ownerF053Identity(c)||ownerF047Identity(c)||ownerF039EIdentity(c)||ownerF039DIdentity(c)||ownerF043Identity(c)||ownerF039CIdentity(c)||ownerF040Identity(c)||ownerF039BIdentity(c)||ownerF039Identity(c)||ownerF034Identity(c)||ownerF033Identity(c)||ownerF038Identity(c)||ownerF041Identity(c)||ownerF042Identity(c)||ownerF044Identity(c)||ownerF036Identity(c)||ownerF028Identity(c)||ownerF037Identity(c)||ownerF015Identity(c)||ownerF016Identity(c)||ownerF017Identity(c)||ownerF011Identity(c)||ownerF012Identity(c)||ownerF010Identity(c)||ownerF009Identity(c)||ownerE6304Identity(c)||ownerKUPFER6305Identity(c)||ownerE6306Identity(c)||ownerF008Identity(c)||ownerF007Identity(c)||ownerF006Identity(c)||ownerF005Identity(c)||ownerF024Identity(c)||ownerF030Identity(c)||ownerF032Identity(c)||ownerF135Identity(c)||ownerF190Identity(c)||ownerF135GardenIdentity(c)||ownerF148Identity(c)||ownerF064Identity(c)||ownerF078Identity(c)||ownerF153Identity(c)||ownerF146Identity(c)||ownerF145Identity(c)||ownerF147Identity(c)||ownerF149Identity(c)||ownerF150Identity(c)||ownerF152Identity(c)||ownerF154Identity(c)||ownerF155Identity(c)||ownerF156Identity(c)||ownerF152CofaceIdentity(c)||ownerF157Identity(c)||ownerF160Identity(c)||ownerF174Identity(c)||ownerF158Identity(c)||ownerF178Identity(c)||ownerF175Identity(c)||ownerF180Identity(c)||ownerF181Identity(c)||ownerF176Identity(c)||ownerF159Identity(c)||ownerF179Identity(c)||ownerF182Identity(c)||ownerF177Identity(c)||ownerF186Identity(c)||ownerF188Identity(c)||ownerF183Identity(c)||ownerF184Identity(c)||ownerF185Identity(c)||ownerF187Identity(c)||ownerF189Identity(c)||ownerF191Identity(c)||ownerF193Identity(c)||ownerF194Identity(c)||ownerF192Identity(c)||ownerF197Identity(c)||ownerF195Identity(c)||ownerF198Identity(c)||ownerF199Identity(c)||ownerF200Identity(c)||ownerF201Identity(c)||ownerF202Identity(c)||ownerF203Identity(c)||ownerF193FootIdentity(c)||ownerF204Identity(c)||ownerF205Identity(c)||ownerF206Identity(c)||ownerF222Identity(c)||ownerF207Identity(c)||ownerF208Identity(c)||ownerF209Identity(c)||ownerF210Identity(c)||ownerF211Identity(c)||ownerF212Identity(c)||ownerF213Identity(c)||ownerF214Identity(c)||ownerF215Identity(c)||ownerF216Identity(c)||ownerF216AnnexIdentity(c)||ownerF217Identity(c)||ownerF218Identity(c)||ownerF219Identity(c)||ownerF220Identity(c)||ownerF221Identity(c)||ownerF223Identity(c)||ownerF224Identity(c)||ownerF225Identity(c)||ownerF226Identity(c)||ownerF227Identity(c)||ownerF228Identity(c)||ownerF249Identity(c)||ownerF252Identity(c)||ownerF257Identity(c)||ownerF259Identity(c)||ownerF261Identity(c)||ownerF274Identity(c)||ownerF297Identity(c)||ownerF306Identity(c)||ownerF308Identity(c)||ownerF299Identity(c)||ownerF314Identity(c)||ownerF318Identity(c)||ownerF316Identity(c)||ownerF320Identity(c)||ownerF350Identity(c)||ownerF352Identity(c)||ownerF369Identity(c)||ownerF371Identity(c)||ownerF001Identity(c)||ownerF231Identity(c);


function scopedInfillOwnerImport<Args extends unknown[],Result>(fn:(...args:Args)=>Result,arity:number):(...args:Args)=>Result{
 return(...args:Args)=>{const parameters:unknown[]=args.slice(0,arity);while(parameters.length<arity)parameters.push(undefined);parameters.push(scope);return fn(...parameters as Args);};
}
const ownerF045ExchangeReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF045ExchangeReconstruction,1);
const ownerF045ExchangeBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF045ExchangeBaseMaterials,3);
const ownerF105Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF105Reconstruction,1);
const ownerF105BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF105BaseMaterials,3);
const ownerF029Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF029Reconstruction,1);
const ownerF029BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF029BaseMaterials,3);
const ownerF072Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF072Reconstruction,1);
const ownerF071HeightIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071HeightIdentity,1);
const ownerF071HeightReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071HeightReconstruction,2);
const ownerF071HeightBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071HeightBaseMaterials,3);
const ownerF060Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF060Reconstruction,1);
const ownerF034Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF034Reconstruction,1);
const ownerF033Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF033Reconstruction,1);
const ownerF039BReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF039BReconstruction,1);
const ownerF040Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF040Reconstruction,1);
const ownerF043Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF043Reconstruction,1);
const ownerF039CReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF039CReconstruction,1);
const ownerF039DReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF039DReconstruction,1);
const ownerF065Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF065Reconstruction,1);
const ownerF065PlatformReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF065PlatformReconstruction,1);
const ownerF027Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF027Reconstruction,1);
const ownerF031Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF031Reconstruction,1);
const ownerF079Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF079Reconstruction,1);
const ownerF111Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF111Reconstruction,1);
const ownerF112Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF112Reconstruction,1);
const ownerF113Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF113Reconstruction,1);
const ownerF110Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF110Reconstruction,1);
const ownerF132Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF132Reconstruction,1);
const ownerF136Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF136Reconstruction,1);
const ownerF114Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF114Reconstruction,1);
const ownerF138Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF138Reconstruction,1);
const ownerF144Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF144Reconstruction,1);
const ownerF140Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF140Reconstruction,1);
const ownerF162Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF162Reconstruction,1);
const ownerF164Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF164Reconstruction,1);
const ownerF163Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF163Reconstruction,1);
const ownerF166Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF166Reconstruction,1);
const ownerF040HReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF040HReconstruction,1);
const ownerF049Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF049Reconstruction,1);
const ownerF051Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF051Reconstruction,1);
const ownerF054Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF054Reconstruction,1);
const ownerF056Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF056Reconstruction,1);
const ownerF047Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF047Reconstruction,1);
const ownerF048Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF048Reconstruction,1);
const ownerF052Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF052Reconstruction,1);
const ownerF055Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF055Reconstruction,1);
const ownerF057Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF057Reconstruction,1);
const ownerF059Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF059Reconstruction,1);
const ownerF062Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF062Reconstruction,1);
const ownerF067Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF067Reconstruction,1);
const ownerF070Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF070Reconstruction,1);
const ownerF083Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF083Reconstruction,1);
const ownerF118Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF118Reconstruction,1);
const ownerF035Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF035Reconstruction,1);
const ownerF130Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF130Reconstruction,1);
const ownerF076Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF076Reconstruction,1);
const ownerF142Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF142Reconstruction,1);
const ownerF167Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF167Reconstruction,1);
const ownerF039EReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF039EReconstruction,1);
const ownerF053Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF053Reconstruction,1);
const ownerF026Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF026Reconstruction,1);
const ownerF039Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF039Reconstruction,1);
const ownerF038Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF038Reconstruction,1);
const ownerF041Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF041Reconstruction,1);
const ownerF042Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF042Reconstruction,1);
const ownerF044Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF044Reconstruction,1);
const ownerF036Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF036Reconstruction,1);
const ownerF037Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF037Reconstruction,1);
const ownerF028Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF028Reconstruction,1);
const ownerF017Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF017Reconstruction,1);
const ownerF016Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF016Reconstruction,1);
const ownerF015Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF015Reconstruction,1);
const ownerF012Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF012Reconstruction,1);
const ownerF011Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF011Reconstruction,1);
const ownerF010Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF010Reconstruction,1);
const ownerF009Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF009Reconstruction,1);
const ownerE6304Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerE6304Reconstruction,1);
const ownerKUPFER6305Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerKUPFER6305Reconstruction,1);
const ownerE6306Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerE6306Reconstruction,1);
const ownerF008Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF008Reconstruction,1);
const ownerF007Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF007Reconstruction,1);
const ownerF006Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF006Reconstruction,1);
const ownerF005Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF005Reconstruction,1);
const ownerF024Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF024Reconstruction,1);
const ownerF030Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF030Reconstruction,1);
const ownerF001Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF001Reconstruction,1);
const ownerF371Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF371Reconstruction,1);
const ownerF369Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF369Reconstruction,1);
const ownerF352Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF352Reconstruction,1);
const ownerF350Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF350Reconstruction,1);
const ownerF320Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF320Reconstruction,1);
const ownerF316Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF316Reconstruction,1);
const ownerF318Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF318Reconstruction,1);
const ownerF314Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF314Reconstruction,1);
const ownerF314BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF314BaseMaterials,3);
const ownerF299Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF299Reconstruction,1);
const ownerF308Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF308Reconstruction,1);
const ownerF306Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF306Reconstruction,1);
const ownerF297Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF297Reconstruction,1);
const ownerF274Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF274Reconstruction,1);
const ownerF261Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF261Reconstruction,1);
const ownerF259Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF259Reconstruction,1);
const ownerF257Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF257Reconstruction,1);
const ownerF252Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF252Reconstruction,1);
const ownerF249Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF249Reconstruction,1);
const ownerF228Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF228Reconstruction,1);
const ownerF227Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF227Reconstruction,1);
const ownerF226Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF226Reconstruction,1);
const ownerF225Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF225Reconstruction,1);
const ownerF224Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF224Reconstruction,1);
const ownerF223Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF223Reconstruction,1);
const ownerF221Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF221Reconstruction,1);
const ownerF220Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF220Reconstruction,1);
const ownerF219Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF219Reconstruction,1);
const ownerF218Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF218Identity,1);
const ownerF218Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF218Reconstruction,1);
const ownerF218BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF218BaseMaterials,3);
const ownerF216AnnexReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF216AnnexReconstruction,1);
const ownerF217Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF217Reconstruction,1);
const ownerF216Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF216Reconstruction,1);
const ownerF215Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF215Identity,1);
const ownerF215Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF215Reconstruction,1);
const ownerF215BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF215BaseMaterials,3);
const ownerF214Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF214Reconstruction,1);
const ownerF213Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF213Reconstruction,1);
const ownerF212Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF212Reconstruction,1);
const ownerF231Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF231Reconstruction,1);
const ownerF211Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF211Reconstruction,1);
const ownerF210Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF210Reconstruction,1);
const ownerF209Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF209Reconstruction,1);
const ownerF208Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF208Reconstruction,1);
const ownerF207Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF207Identity,1);
const ownerF207Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF207Reconstruction,1);
const ownerF207BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF207BaseMaterials,3);
const ownerF222Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF222Reconstruction,1);
const ownerF205Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF205Identity,1);
const ownerF205Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF205Reconstruction,1);
const ownerF205BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF205BaseMaterials,3);
const ownerF204Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF204Identity,1);
const ownerF204Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF204Reconstruction,1);
const ownerF204BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF204BaseMaterials,3);
const ownerF193FootReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF193FootReconstruction,1);
const ownerF203Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF203Identity,1);
const ownerF203Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF203Reconstruction,1);
const ownerF203BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF203BaseMaterials,3);
const ownerF202Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF202Identity,1);
const ownerF202Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF202Reconstruction,1);
const ownerF202BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF202BaseMaterials,3);
const ownerF199Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF199Reconstruction,1);
const ownerF201Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF201Identity,1);
const ownerF201Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF201Reconstruction,1);
const ownerF201BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF201BaseMaterials,3);
const ownerF198Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF198Identity,1);
const ownerF198Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF198Reconstruction,1);
const ownerF198BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF198BaseMaterials,3);
const ownerF195Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF195Reconstruction,1);
const ownerF197Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF197Reconstruction,1);
const ownerF197BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF197BaseMaterials,3);
const ownerF192Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF192Reconstruction,1);
const ownerF194Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF194Reconstruction,1);
const ownerF194BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF194BaseMaterials,3);
const ownerF193Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF193Reconstruction,1);
const ownerF187Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF187Reconstruction,1);
const ownerF189Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF189Reconstruction,1);
const ownerF191Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF191Identity,1);
const ownerF191Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF191Reconstruction,1);
const ownerF191BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF191BaseMaterials,3);
const ownerF185BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF185BaseMaterials,3);
const ownerF183Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF183Reconstruction,1);
const ownerF188Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF188Identity,1);
const ownerF188Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF188Reconstruction,1);
const ownerF186Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF186Reconstruction,1);
const ownerF177Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF177Identity,1);
const ownerF177Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF177Reconstruction,1);
const ownerF177BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF177BaseMaterials,3);
const ownerF179Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF179Reconstruction,1);
const ownerF180Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF180Reconstruction,1);
const ownerF180BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF180BaseMaterials,3);
const ownerF178Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF178Reconstruction,1);
const ownerF160Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF160Reconstruction,1);
const ownerF152CofaceIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF152CofaceIdentity,1);
const ownerF152CofaceReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF152CofaceReconstruction,1);
const ownerF155Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF155Reconstruction,1);
const ownerF154Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF154Reconstruction,1);
const ownerF154BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF154BaseMaterials,3);
const ownerF152Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF152Reconstruction,1);
const ownerF152BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF152BaseMaterials,3);
const ownerF145BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF145BaseMaterials,3);
const ownerF153BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF153BaseMaterials,3);
const ownerF148Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF148Reconstruction,1);
const ownerF135GardenReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF135GardenReconstruction,1);
const ownerF135GardenMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF135GardenMaterials,3);
const ownerF190Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF190Reconstruction,1);
const ownerF190BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF190BaseMaterials,3);
const ownerF032Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF032Reconstruction,1);
const ownerF032BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF032BaseMaterials,3);
const ownerF135Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF135Reconstruction,1);
const ownerF135BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF135BaseMaterials,3);
const ownerF135WestMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF135WestMaterials,3);
const ownerF165Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF165Reconstruction,1);
const ownerF023PergolaIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF023PergolaIdentity,1);
const ownerF023PergolaReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF023PergolaReconstruction,1);
const ownerF023PergolaBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF023PergolaBaseMaterials,3);
const ownerF173Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF173Reconstruction,1);
const ownerF073SupplementMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF073SupplementMaterials,3);
const ownerF071NarzissIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071NarzissIdentity,1);
const ownerF071NarzissReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071NarzissReconstruction,1);
const ownerF071NarzissMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF071NarzissMaterials,3);
const ownerF085CompletionIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF085CompletionIdentity,1);
const ownerF085CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF085CompletionReconstruction,1);
const ownerF085CompletionMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF085CompletionMaterials,3);
const ownerF084Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF084Reconstruction,1);
const ownerF115Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115Identity,1);
const ownerF115Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115Reconstruction,1);
const ownerF115BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115BaseMaterials,3);
const ownerF117Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF117Reconstruction,1);
const ownerF128RoofIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF128RoofIdentity,1);
const ownerF128RoofReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF128RoofReconstruction,1);
const ownerF128RoofMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF128RoofMaterials,3);
const ownerF127Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF127Reconstruction,1);
const ownerF115ExteriorIdentity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115ExteriorIdentity,1);
const ownerF115ExteriorReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115ExteriorReconstruction,1);
const ownerF115ExteriorBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF115ExteriorBaseMaterials,3);
const ownerF120Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF120Reconstruction,1);
const ownerF123Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF123Reconstruction,1);
const ownerF121CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF121CompletionReconstruction,1);
const ownerF121CompletionBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF121CompletionBaseMaterials,3);
const ownerF125Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF125Reconstruction,1);
const ownerF129Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF129Reconstruction,1);
const ownerF134Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF134Reconstruction,1);
const ownerF124CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF124CompletionReconstruction,1);
const ownerF124CompletionBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF124CompletionBaseMaterials,3);
const ownerF139Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF139Reconstruction,1);
const ownerF161Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF161Identity,1);
const ownerF161Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF161Reconstruction,1);
const ownerF161BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF161BaseMaterials,3);
const ownerF143Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF143Identity,1);
const ownerF143Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF143Reconstruction,1);
const ownerF143BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF143BaseMaterials,3);
const ownerF151Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF151Reconstruction,1);
const ownerF141CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF141CompletionReconstruction,1);
const ownerF141CompletionBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF141CompletionBaseMaterials,3);
const ownerF168Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF168Reconstruction,1);
const ownerF171Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF171Identity,1);
const ownerF171Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF171Reconstruction,1);
const ownerF171BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF171BaseMaterials,3);
const ownerF172Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF172Reconstruction,1);
const ownerF169CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF169CompletionReconstruction,1);
const ownerF169CompletionBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF169CompletionBaseMaterials,3);
const ownerF170Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF170Identity,1);
const ownerF170Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF170Reconstruction,1);
const ownerF170BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF170BaseMaterials,3);
const ownerF108CompletionReconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF108CompletionReconstruction,1);
const ownerF108CompletionBaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF108CompletionBaseMaterials,3);
const ownerF106Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF106Identity,1);
const ownerF106Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF106Reconstruction,1);
const ownerF106BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF106BaseMaterials,3);
const ownerF109Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF109Reconstruction,1);
const ownerF086Identity=scopedInfillOwnerImport(__infillRoot500Owner_ownerF086Identity,1);
const ownerF086Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF086Reconstruction,1);
const ownerF086BaseMaterials=scopedInfillOwnerImport(__infillRoot500Owner_ownerF086BaseMaterials,3);
const ownerF089Reconstruction=scopedInfillOwnerImport(__infillRoot500Owner_ownerF089Reconstruction,1);
const infillC032OriginalBaseMaterials=scopedInfillOwnerImport(__infillScopedOwner_infillC032OriginalBaseMaterials,3);
const infillF278OriginalReconstruction=scopedInfillOwnerImport(__infillScopedOwner_infillF278OriginalReconstruction,1);
const infillC121OriginalBaseMaterials=scopedInfillOwnerImport(__infillScopedOwner_infillC121OriginalBaseMaterials,3);
const infillPremierReconstruction=scopedInfillOwnerImport(__infillScopedOwner_infillPremierReconstruction,1);
const infillOwnerRecipeOrigins=new WeakMap<Function,Function>([[handelshofBalconies103Reconstruction,__infillFunctionDependency0],[handelshofBalconies103BaseMaterials,__infillFunctionDependency1],[messeNativeChildren102Identity,__infillFunctionDependency2],[messeNativeChildren102Reconstruction,__infillFunctionDependency3],[messeNativeChildren102BaseMaterials,__infillFunctionDependency4],[ml61Entry092Reconstruction,__infillFunctionDependency5],[ml61Entry092MaterialFrames,__infillFunctionDependency6],[gallusanlage8Children089Identity,__infillFunctionDependency7],[gallusanlage8Children089Reconstruction,__infillFunctionDependency8],[gallusanlage8Children089BaseMaterials,__infillFunctionDependency9],[gardenUpperPhoto087BaseMaterials,__infillFunctionDependency10],[fra145Return087MaterialFrames,__infillFunctionDependency11],[mainTorPortaOriginal087Reconstruction,__infillFunctionDependency12],[mainTorPortaOriginal087BaseMaterials,__infillFunctionDependency13],[gardenAggregate086Identity,__infillFunctionDependency14],[gardenAggregate086Reconstruction,__infillFunctionDependency15],[fra144ResidualMaterials086Identity,__infillFunctionDependency16],[fra144ResidualMaterials086Reconstruction,__infillFunctionDependency17],[fra144ResidualMaterials086MaterialFrames,__infillFunctionDependency18],[kioskGlazing084BaseMaterials,__infillFunctionDependency19],[frankfurtHbfLowwing082Reconstruction,__infillFunctionDependency20],[frankfurtHbfLowwing082MaterialFrames,__infillFunctionDependency21],[kioskCanopy080Reconstruction,__infillFunctionDependency22],[kioskCanopy080BaseMaterials,__infillFunctionDependency23],[fra144WallOverlap079Reconstruction,__infillFunctionDependency24],[ecbLoopJunction077Reconstruction,__infillFunctionDependency25],[ecbLoopJunction077BaseMaterials,__infillFunctionDependency26],[katharinen149Facades078MaterialFrames,__infillFunctionDependency27],[senckenbergPartDisplay076Reconstruction,__infillFunctionDependency28],[frankfurtGroups144146Official073Identity,__infillFunctionDependency29],[frankfurtGroups144146Official073BaseMaterials,__infillFunctionDependency30],[katharinen149Edge075Reconstruction,__infillFunctionDependency31],[katharinen149Edge075BaseMaterials,__infillFunctionDependency32],[ecbEntranceAggregate073Identity,__infillFunctionDependency33],[ecbEntranceAggregate073BaseMaterials,__infillFunctionDependency34],[ecbAncillary073Identity,__infillFunctionDependency35],[ecbAncillary073Reconstruction,__infillFunctionDependency36],[ecbAncillary073BaseMaterials,__infillFunctionDependency37],[senckenbergSelected074BaseMaterials,__infillFunctionDependency38],[katharinenEast149Official070BaseMaterials,__infillFunctionDependency39],[ecbPress072Reconstruction,__infillFunctionDependency40],[ecbPress072BaseMaterials,__infillFunctionDependency41],[hausdomOfficial070Reconstruction,__infillFunctionDependency42],[hausdomOfficial070BaseMaterials,__infillFunctionDependency43],[weststrip253Measured067Reconstruction,__infillFunctionDependency44],[weststrip253Measured067BaseMaterials,__infillFunctionDependency45],[frankfurtOfficePrincipals069Identity,__infillFunctionDependency46],[frankfurtOfficePrincipals069Reconstruction,__infillFunctionDependency47],[frankfurtOfficePrincipals069BaseMaterials,__infillFunctionDependency48],[globalTowerOfficial071Identity,__infillFunctionDependency49],[globalTowerOfficial071Reconstruction,__infillFunctionDependency50],[globalTowerOfficial071BaseMaterials,__infillFunctionDependency51],[commerzbankFan066AfterParent053Reconstruction,__infillFunctionDependency52],[commerzbankFan066BaseMaterials,__infillFunctionDependency53],[kaiser1820Official064Identity,__infillFunctionDependency54],[kaiser1820Official064Reconstruction,__infillFunctionDependency55],[kaiser1820Official064BaseMaterials,__infillFunctionDependency56],[commerzbankPodiumOfficial060Identity,__infillFunctionDependency57],[commerzbankPodiumOfficial060Reconstruction,__infillFunctionDependency58],[commerzbankPodiumOfficial060BaseMaterials,__infillFunctionDependency59],[main11369Display058Identity,__infillFunctionDependency60],[main11369Display058Reconstruction,__infillFunctionDependency61],[main11369Display058BaseMaterials,__infillFunctionDependency62],[infillFrankfurtJwMarriottIdentity,__infillFunctionDependency63],[infillFrankfurtJwMarriottReconstruction,__infillFunctionDependency64],[infillFrankfurtJwMarriottBaseMaterials,__infillFunctionDependency65],[infillJapanCenterReconstruction,__infillFunctionDependency66],[infillMarienturm054RemoveDuplicateNativeParts,__infillFunctionDependency67],[silberturmFullReconstruction051,__infillFunctionDependency68],[silberturmSpecificMaterials050,__infillFunctionDependency69],[infillOmniturmIdentity,__infillFunctionDependency70],[infillOmniturmReconstruction,__infillFunctionDependency71],[infillOmniturmBaseMaterials,__infillFunctionDependency72],[marienturm050Identity,__infillFunctionDependency73],[marienturm050Reconstruction,__infillFunctionDependency74],[marienturm050BaseMaterials,__infillFunctionDependency75],[infillC032OriginalIdentity,__infillFunctionDependency76],[infillC032OfficialIdentity,__infillFunctionDependency77],[infillC032OfficialReconstruction,__infillFunctionDependency78],[infillFrankfurtJunghof088Identity,__infillFunctionDependency79],[infillFrankfurtJunghof088Reconstruction,__infillFunctionDependency80],[infillFrankfurtJunghof088RoofMaterialFrames062,__infillFunctionDependency81],[infillFrankfurtBockenheimer084Identity,__infillFunctionDependency82],[infillFrankfurtBockenheimer084Reconstruction,__infillFunctionDependency83],[infillF288OriginalIdentity,__infillFunctionDependency84],[infillF288OriginalReconstruction,__infillFunctionDependency85],[infillEberhardHistoricalReconstruction,__infillFunctionDependency86],[infillGoethe34Identity,__infillFunctionDependency87],[infillGoethe34Reconstruction,__infillFunctionDependency88],[infillFrankfurtKettenhof065Identity,__infillFunctionDependency89],[infillFrankfurtKettenhof065Reconstruction,__infillFunctionDependency90],[infillFrankfurtVCIRoof095Reconstruction,__infillFunctionDependency91],[infillFrankfurtVCIRoof095MaterialFrames,__infillFunctionDependency92],[infillFrankfurtVCI051Identity,__infillFunctionDependency93],[infillFrankfurtVCI051Reconstruction,__infillFunctionDependency94],[infillFrankfurtML41SignarisIdentity,__infillFunctionDependency95],[infillFrankfurtML41SignarisReconstruction,__infillFunctionDependency96],[infillFrankfurtLowOfficeBulk70Identity,__infillFunctionDependency97],[infillSchneider076Identity,__infillFunctionDependency98],[infillSchneider076Reconstruction,__infillFunctionDependency99],[infillFrankfurtMaro74Identity,__infillFunctionDependency100],[infillFrankfurtMaro74Reconstruction,__infillFunctionDependency101],[infillFrankfurtLowOfficeK26Identity,__infillFunctionDependency102],[infillFrankfurtLowOfficeK26Reconstruction,__infillFunctionDependency103],[infillFrankfurtLowOfficeBatch2Identity,__infillFunctionDependency104],[infillFrankfurtLowOfficeBatch2Reconstruction,__infillFunctionDependency105],[infillFrankfurtLowOfficeIdentity,__infillFunctionDependency106],[infillFrankfurtLowOfficeReconstruction,__infillFunctionDependency107],[infillStJohannReconstruction,__infillFunctionDependency108],[infillGalerieIdentity,__infillFunctionDependency109],[infillGalerieReconstruction,__infillFunctionDependency110],[infillRabbiReconstruction,__infillFunctionDependency111],[infillGrafCourtyardMeasuredReconstruction,__infillFunctionDependency112],[infillGrafWestMeasuredReconstruction,__infillFunctionDependency113],[infillFrankfurtSkyperIdentity,__infillFunctionDependency114],[infillFrankfurtSkyperReconstruction,__infillFunctionDependency115],[infillFrankfurtSkyperBaseMaterials,__infillFunctionDependency116],[infillEurotowerReconstruction,__infillFunctionDependency117],[infillJubilaeumssaeuleReconstruction,__infillFunctionDependency118],[infillJubilaeumssaeuleBaseMaterials,__infillFunctionDependency119],[infillOpernturmReconstruction,__infillFunctionDependency120],[infillFrankfurtSpinIdentity,__infillFunctionDependency121],[infillFrankfurtSpinReconstruction,__infillFunctionDependency122],[infillFrankfurtSpinBaseMaterials,__infillFunctionDependency123],[infillOneReconstruction,__infillFunctionDependency124],[infillBoersenplatzBlockReconstruction,__infillFunctionDependency125],[infillFrankfurtWestendgateIdentity,__infillFunctionDependency126],[infillFrankfurtWestendgateReconstruction,__infillFunctionDependency127],[infillFrankfurtWestendgateBaseMaterials,__infillFunctionDependency128],[infillMyzeilReconstruction,__infillFunctionDependency129],[infillFrankfurtNextowerIdentity,__infillFunctionDependency130],[infillFrankfurtNextowerReconstruction,__infillFunctionDependency131],[infillFrankfurtNextowerBaseMaterials,__infillFunctionDependency132],[infillFrankfurtDeutscheBankIdentity,__infillFunctionDependency133],[infillFrankfurtDeutscheBankReconstruction,__infillFunctionDependency134],[infillFrankfurtDeutscheBankBaseMaterials,__infillFunctionDependency135],[infillWestend1Reconstruction,__infillFunctionDependency136],[infillFrankfurtTrianonIdentity,__infillFunctionDependency137],[infillFrankfurtTrianonReconstruction,__infillFunctionDependency138],[infillFrankfurtTrianonBaseMaterials,__infillFunctionDependency139],[infillFrankfurtFbcIdentity,__infillFunctionDependency140],[infillFrankfurtFbcReconstruction,__infillFunctionDependency141],[infillFrankfurtFbcBaseMaterials,__infillFunctionDependency142],[infillTower185Reconstruction,__infillFunctionDependency143],[infillBoerseReconstruction,__infillFunctionDependency144],[infillGrafGeissReconstruction,__infillFunctionDependency145],[infillGrafRearReconstruction,__infillFunctionDependency146],[infillKoenigsbauRepairReconstruction,__infillFunctionDependency147],[infillWlbOldReconstruction,__infillFunctionDependency148],[infillWlbExtensionReconstruction,__infillFunctionDependency149],[infillEcbReconstruction,__infillFunctionDependency150],[infillFrankfurtIdentity,__infillFunctionDependency151],[infillFrankfurtReconstruction,__infillFunctionDependency152],[infillFrankfurtBaseMaterials,__infillFunctionDependency153],[infillFrankfurtEastIdentity,__infillFunctionDependency154],[infillFrankfurtEastReconstruction,__infillFunctionDependency155],[infillFrankfurtEastBaseMaterials,__infillFunctionDependency156],[infillSchauspielhausReconstruction,__infillFunctionDependency157],[infillKoenigsbauPassagenReconstruction,__infillFunctionDependency158],[infillGustavReconstruction,__infillFunctionDependency159],[infillHmdkReconstruction,__infillFunctionDependency160],[infillKatharinaReconstruction,__infillFunctionDependency161],[infillPhilharmonieReconstruction,__infillFunctionDependency162],[infillEssenIdentity,__infillFunctionDependency163],[infillEssenReconstruction,__infillFunctionDependency164],[infillSynagogeIdentity,__infillFunctionDependency165],[infillSynagogeReconstruction,__infillFunctionDependency166],[frankfurtHbf075Reconstruction,__infillFunctionDependency167],[frankfurtHbf075BaseMaterials,__infillFunctionDependency168],[ownerF077CompletionReconstruction,__infillFunctionDependency169],[ownerF077CompletionMaterials,__infillFunctionDependency170],[ownerF081CompletionIdentity,__infillFunctionDependency171],[ownerF081CompletionReconstruction,__infillFunctionDependency172],[ownerF081CompletionMaterials,__infillFunctionDependency173],[ownerF116CompletionReconstruction,__infillFunctionDependency174],[ownerF116CompletionMaterials,__infillFunctionDependency175],[ownerF088CompletionReconstruction,__infillFunctionDependency176],[ownerF088CompletionMaterials,__infillFunctionDependency177],[ownerF128CompletionReconstruction,__infillFunctionDependency178],[ownerF128CompletionMaterials,__infillFunctionDependency179],[ownerF122CompletionIdentity,__infillFunctionDependency180],[ownerF122CompletionReconstruction,__infillFunctionDependency181],[ownerF122CompletionMaterials,__infillFunctionDependency182],[ownerF126CompletionIdentity,__infillFunctionDependency183],[ownerF126CompletionReconstruction,__infillFunctionDependency184],[ownerF126CompletionMaterials,__infillFunctionDependency185],[ownerF131CompletionIdentity,__infillFunctionDependency186],[ownerF131CompletionReconstruction,__infillFunctionDependency187],[ownerF131CompletionMaterials,__infillFunctionDependency188],[ownerF018Identity,__infillFunctionDependency189],[ownerF018Reconstruction,__infillFunctionDependency190],[ownerF018BaseMaterials,__infillFunctionDependency191],[ownerReconstructionIdentity,westhafenOriginal102Identity],[ownerF045ExchangeReconstruction,__infillRoot500Owner_ownerF045ExchangeReconstruction],[ownerF045ExchangeBaseMaterials,__infillRoot500Owner_ownerF045ExchangeBaseMaterials],[ownerF105Reconstruction,__infillRoot500Owner_ownerF105Reconstruction],[ownerF105BaseMaterials,__infillRoot500Owner_ownerF105BaseMaterials],[ownerF029Reconstruction,__infillRoot500Owner_ownerF029Reconstruction],[ownerF029BaseMaterials,__infillRoot500Owner_ownerF029BaseMaterials],[ownerF072Reconstruction,__infillRoot500Owner_ownerF072Reconstruction],[ownerF071HeightIdentity,__infillRoot500Owner_ownerF071HeightIdentity],[ownerF071HeightReconstruction,__infillRoot500Owner_ownerF071HeightReconstruction],[ownerF071HeightBaseMaterials,__infillRoot500Owner_ownerF071HeightBaseMaterials],[ownerF060Reconstruction,__infillRoot500Owner_ownerF060Reconstruction],[ownerF034Reconstruction,__infillRoot500Owner_ownerF034Reconstruction],[ownerF033Reconstruction,__infillRoot500Owner_ownerF033Reconstruction],[ownerF039BReconstruction,__infillRoot500Owner_ownerF039BReconstruction],[ownerF040Reconstruction,__infillRoot500Owner_ownerF040Reconstruction],[ownerF043Reconstruction,__infillRoot500Owner_ownerF043Reconstruction],[ownerF039CReconstruction,__infillRoot500Owner_ownerF039CReconstruction],[ownerF039DReconstruction,__infillRoot500Owner_ownerF039DReconstruction],[ownerF065Reconstruction,__infillRoot500Owner_ownerF065Reconstruction],[ownerF065PlatformReconstruction,__infillRoot500Owner_ownerF065PlatformReconstruction],[ownerF027Reconstruction,__infillRoot500Owner_ownerF027Reconstruction],[ownerF031Reconstruction,__infillRoot500Owner_ownerF031Reconstruction],[ownerF079Reconstruction,__infillRoot500Owner_ownerF079Reconstruction],[ownerF111Reconstruction,__infillRoot500Owner_ownerF111Reconstruction],[ownerF112Reconstruction,__infillRoot500Owner_ownerF112Reconstruction],[ownerF113Reconstruction,__infillRoot500Owner_ownerF113Reconstruction],[ownerF110Reconstruction,__infillRoot500Owner_ownerF110Reconstruction],[ownerF132Reconstruction,__infillRoot500Owner_ownerF132Reconstruction],[ownerF136Reconstruction,__infillRoot500Owner_ownerF136Reconstruction],[ownerF114Reconstruction,__infillRoot500Owner_ownerF114Reconstruction],[ownerF138Reconstruction,__infillRoot500Owner_ownerF138Reconstruction],[ownerF144Reconstruction,__infillRoot500Owner_ownerF144Reconstruction],[ownerF140Reconstruction,__infillRoot500Owner_ownerF140Reconstruction],[ownerF162Reconstruction,__infillRoot500Owner_ownerF162Reconstruction],[ownerF164Reconstruction,__infillRoot500Owner_ownerF164Reconstruction],[ownerF163Reconstruction,__infillRoot500Owner_ownerF163Reconstruction],[ownerF166Reconstruction,__infillRoot500Owner_ownerF166Reconstruction],[ownerF040HReconstruction,__infillRoot500Owner_ownerF040HReconstruction],[ownerF049Reconstruction,__infillRoot500Owner_ownerF049Reconstruction],[ownerF051Reconstruction,__infillRoot500Owner_ownerF051Reconstruction],[ownerF054Reconstruction,__infillRoot500Owner_ownerF054Reconstruction],[ownerF056Reconstruction,__infillRoot500Owner_ownerF056Reconstruction],[ownerF047Reconstruction,__infillRoot500Owner_ownerF047Reconstruction],[ownerF048Reconstruction,__infillRoot500Owner_ownerF048Reconstruction],[ownerF052Reconstruction,__infillRoot500Owner_ownerF052Reconstruction],[ownerF055Reconstruction,__infillRoot500Owner_ownerF055Reconstruction],[ownerF057Reconstruction,__infillRoot500Owner_ownerF057Reconstruction],[ownerF059Reconstruction,__infillRoot500Owner_ownerF059Reconstruction],[ownerF062Reconstruction,__infillRoot500Owner_ownerF062Reconstruction],[ownerF067Reconstruction,__infillRoot500Owner_ownerF067Reconstruction],[ownerF070Reconstruction,__infillRoot500Owner_ownerF070Reconstruction],[ownerF083Reconstruction,__infillRoot500Owner_ownerF083Reconstruction],[ownerF118Reconstruction,__infillRoot500Owner_ownerF118Reconstruction],[ownerF035Reconstruction,__infillRoot500Owner_ownerF035Reconstruction],[ownerF130Reconstruction,__infillRoot500Owner_ownerF130Reconstruction],[ownerF076Reconstruction,__infillRoot500Owner_ownerF076Reconstruction],[ownerF142Reconstruction,__infillRoot500Owner_ownerF142Reconstruction],[ownerF167Reconstruction,__infillRoot500Owner_ownerF167Reconstruction],[ownerF039EReconstruction,__infillRoot500Owner_ownerF039EReconstruction],[ownerF053Reconstruction,__infillRoot500Owner_ownerF053Reconstruction],[ownerF026Reconstruction,__infillRoot500Owner_ownerF026Reconstruction],[ownerF039Reconstruction,__infillRoot500Owner_ownerF039Reconstruction],[ownerF038Reconstruction,__infillRoot500Owner_ownerF038Reconstruction],[ownerF041Reconstruction,__infillRoot500Owner_ownerF041Reconstruction],[ownerF042Reconstruction,__infillRoot500Owner_ownerF042Reconstruction],[ownerF044Reconstruction,__infillRoot500Owner_ownerF044Reconstruction],[ownerF036Reconstruction,__infillRoot500Owner_ownerF036Reconstruction],[ownerF037Reconstruction,__infillRoot500Owner_ownerF037Reconstruction],[ownerF028Reconstruction,__infillRoot500Owner_ownerF028Reconstruction],[ownerF017Reconstruction,__infillRoot500Owner_ownerF017Reconstruction],[ownerF016Reconstruction,__infillRoot500Owner_ownerF016Reconstruction],[ownerF015Reconstruction,__infillRoot500Owner_ownerF015Reconstruction],[ownerF012Reconstruction,__infillRoot500Owner_ownerF012Reconstruction],[ownerF011Reconstruction,__infillRoot500Owner_ownerF011Reconstruction],[ownerF010Reconstruction,__infillRoot500Owner_ownerF010Reconstruction],[ownerF009Reconstruction,__infillRoot500Owner_ownerF009Reconstruction],[ownerE6304Reconstruction,__infillRoot500Owner_ownerE6304Reconstruction],[ownerKUPFER6305Reconstruction,__infillRoot500Owner_ownerKUPFER6305Reconstruction],[ownerE6306Reconstruction,__infillRoot500Owner_ownerE6306Reconstruction],[ownerF008Reconstruction,__infillRoot500Owner_ownerF008Reconstruction],[ownerF007Reconstruction,__infillRoot500Owner_ownerF007Reconstruction],[ownerF006Reconstruction,__infillRoot500Owner_ownerF006Reconstruction],[ownerF005Reconstruction,__infillRoot500Owner_ownerF005Reconstruction],[ownerF024Reconstruction,__infillRoot500Owner_ownerF024Reconstruction],[ownerF030Reconstruction,__infillRoot500Owner_ownerF030Reconstruction],[ownerF001Reconstruction,__infillRoot500Owner_ownerF001Reconstruction],[ownerF371Reconstruction,__infillRoot500Owner_ownerF371Reconstruction],[ownerF369Reconstruction,__infillRoot500Owner_ownerF369Reconstruction],[ownerF352Reconstruction,__infillRoot500Owner_ownerF352Reconstruction],[ownerF350Reconstruction,__infillRoot500Owner_ownerF350Reconstruction],[ownerF320Reconstruction,__infillRoot500Owner_ownerF320Reconstruction],[ownerF316Reconstruction,__infillRoot500Owner_ownerF316Reconstruction],[ownerF318Reconstruction,__infillRoot500Owner_ownerF318Reconstruction],[ownerF314Reconstruction,__infillRoot500Owner_ownerF314Reconstruction],[ownerF314BaseMaterials,__infillRoot500Owner_ownerF314BaseMaterials],[ownerF299Reconstruction,__infillRoot500Owner_ownerF299Reconstruction],[ownerF308Reconstruction,__infillRoot500Owner_ownerF308Reconstruction],[ownerF306Reconstruction,__infillRoot500Owner_ownerF306Reconstruction],[ownerF297Reconstruction,__infillRoot500Owner_ownerF297Reconstruction],[ownerF274Reconstruction,__infillRoot500Owner_ownerF274Reconstruction],[ownerF261Reconstruction,__infillRoot500Owner_ownerF261Reconstruction],[ownerF259Reconstruction,__infillRoot500Owner_ownerF259Reconstruction],[ownerF257Reconstruction,__infillRoot500Owner_ownerF257Reconstruction],[ownerF252Reconstruction,__infillRoot500Owner_ownerF252Reconstruction],[ownerF249Reconstruction,__infillRoot500Owner_ownerF249Reconstruction],[ownerF228Reconstruction,__infillRoot500Owner_ownerF228Reconstruction],[ownerF227Reconstruction,__infillRoot500Owner_ownerF227Reconstruction],[ownerF226Reconstruction,__infillRoot500Owner_ownerF226Reconstruction],[ownerF225Reconstruction,__infillRoot500Owner_ownerF225Reconstruction],[ownerF224Reconstruction,__infillRoot500Owner_ownerF224Reconstruction],[ownerF223Reconstruction,__infillRoot500Owner_ownerF223Reconstruction],[ownerF221Reconstruction,__infillRoot500Owner_ownerF221Reconstruction],[ownerF220Reconstruction,__infillRoot500Owner_ownerF220Reconstruction],[ownerF219Reconstruction,__infillRoot500Owner_ownerF219Reconstruction],[ownerF218Identity,__infillRoot500Owner_ownerF218Identity],[ownerF218Reconstruction,__infillRoot500Owner_ownerF218Reconstruction],[ownerF218BaseMaterials,__infillRoot500Owner_ownerF218BaseMaterials],[ownerF216AnnexReconstruction,__infillRoot500Owner_ownerF216AnnexReconstruction],[ownerF217Reconstruction,__infillRoot500Owner_ownerF217Reconstruction],[ownerF216Reconstruction,__infillRoot500Owner_ownerF216Reconstruction],[ownerF215Identity,__infillRoot500Owner_ownerF215Identity],[ownerF215Reconstruction,__infillRoot500Owner_ownerF215Reconstruction],[ownerF215BaseMaterials,__infillRoot500Owner_ownerF215BaseMaterials],[ownerF214Reconstruction,__infillRoot500Owner_ownerF214Reconstruction],[ownerF213Reconstruction,__infillRoot500Owner_ownerF213Reconstruction],[ownerF212Reconstruction,__infillRoot500Owner_ownerF212Reconstruction],[ownerF231Reconstruction,__infillRoot500Owner_ownerF231Reconstruction],[ownerF211Reconstruction,__infillRoot500Owner_ownerF211Reconstruction],[ownerF210Reconstruction,__infillRoot500Owner_ownerF210Reconstruction],[ownerF209Reconstruction,__infillRoot500Owner_ownerF209Reconstruction],[ownerF208Reconstruction,__infillRoot500Owner_ownerF208Reconstruction],[ownerF207Identity,__infillRoot500Owner_ownerF207Identity],[ownerF207Reconstruction,__infillRoot500Owner_ownerF207Reconstruction],[ownerF207BaseMaterials,__infillRoot500Owner_ownerF207BaseMaterials],[ownerF222Reconstruction,__infillRoot500Owner_ownerF222Reconstruction],[ownerF205Identity,__infillRoot500Owner_ownerF205Identity],[ownerF205Reconstruction,__infillRoot500Owner_ownerF205Reconstruction],[ownerF205BaseMaterials,__infillRoot500Owner_ownerF205BaseMaterials],[ownerF204Identity,__infillRoot500Owner_ownerF204Identity],[ownerF204Reconstruction,__infillRoot500Owner_ownerF204Reconstruction],[ownerF204BaseMaterials,__infillRoot500Owner_ownerF204BaseMaterials],[ownerF193FootReconstruction,__infillRoot500Owner_ownerF193FootReconstruction],[ownerF203Identity,__infillRoot500Owner_ownerF203Identity],[ownerF203Reconstruction,__infillRoot500Owner_ownerF203Reconstruction],[ownerF203BaseMaterials,__infillRoot500Owner_ownerF203BaseMaterials],[ownerF202Identity,__infillRoot500Owner_ownerF202Identity],[ownerF202Reconstruction,__infillRoot500Owner_ownerF202Reconstruction],[ownerF202BaseMaterials,__infillRoot500Owner_ownerF202BaseMaterials],[ownerF199Reconstruction,__infillRoot500Owner_ownerF199Reconstruction],[ownerF201Identity,__infillRoot500Owner_ownerF201Identity],[ownerF201Reconstruction,__infillRoot500Owner_ownerF201Reconstruction],[ownerF201BaseMaterials,__infillRoot500Owner_ownerF201BaseMaterials],[ownerF198Identity,__infillRoot500Owner_ownerF198Identity],[ownerF198Reconstruction,__infillRoot500Owner_ownerF198Reconstruction],[ownerF198BaseMaterials,__infillRoot500Owner_ownerF198BaseMaterials],[ownerF195Reconstruction,__infillRoot500Owner_ownerF195Reconstruction],[ownerF197Reconstruction,__infillRoot500Owner_ownerF197Reconstruction],[ownerF197BaseMaterials,__infillRoot500Owner_ownerF197BaseMaterials],[ownerF192Reconstruction,__infillRoot500Owner_ownerF192Reconstruction],[ownerF194Reconstruction,__infillRoot500Owner_ownerF194Reconstruction],[ownerF194BaseMaterials,__infillRoot500Owner_ownerF194BaseMaterials],[ownerF193Reconstruction,__infillRoot500Owner_ownerF193Reconstruction],[ownerF187Reconstruction,__infillRoot500Owner_ownerF187Reconstruction],[ownerF189Reconstruction,__infillRoot500Owner_ownerF189Reconstruction],[ownerF191Identity,__infillRoot500Owner_ownerF191Identity],[ownerF191Reconstruction,__infillRoot500Owner_ownerF191Reconstruction],[ownerF191BaseMaterials,__infillRoot500Owner_ownerF191BaseMaterials],[ownerF185BaseMaterials,__infillRoot500Owner_ownerF185BaseMaterials],[ownerF183Reconstruction,__infillRoot500Owner_ownerF183Reconstruction],[ownerF188Identity,__infillRoot500Owner_ownerF188Identity],[ownerF188Reconstruction,__infillRoot500Owner_ownerF188Reconstruction],[ownerF186Reconstruction,__infillRoot500Owner_ownerF186Reconstruction],[ownerF177Identity,__infillRoot500Owner_ownerF177Identity],[ownerF177Reconstruction,__infillRoot500Owner_ownerF177Reconstruction],[ownerF177BaseMaterials,__infillRoot500Owner_ownerF177BaseMaterials],[ownerF179Reconstruction,__infillRoot500Owner_ownerF179Reconstruction],[ownerF180Reconstruction,__infillRoot500Owner_ownerF180Reconstruction],[ownerF180BaseMaterials,__infillRoot500Owner_ownerF180BaseMaterials],[ownerF178Reconstruction,__infillRoot500Owner_ownerF178Reconstruction],[ownerF160Reconstruction,__infillRoot500Owner_ownerF160Reconstruction],[ownerF152CofaceIdentity,__infillRoot500Owner_ownerF152CofaceIdentity],[ownerF152CofaceReconstruction,__infillRoot500Owner_ownerF152CofaceReconstruction],[ownerF155Reconstruction,__infillRoot500Owner_ownerF155Reconstruction],[ownerF154Reconstruction,__infillRoot500Owner_ownerF154Reconstruction],[ownerF154BaseMaterials,__infillRoot500Owner_ownerF154BaseMaterials],[ownerF152Reconstruction,__infillRoot500Owner_ownerF152Reconstruction],[ownerF152BaseMaterials,__infillRoot500Owner_ownerF152BaseMaterials],[ownerF145BaseMaterials,__infillRoot500Owner_ownerF145BaseMaterials],[ownerF153BaseMaterials,__infillRoot500Owner_ownerF153BaseMaterials],[ownerF148Reconstruction,__infillRoot500Owner_ownerF148Reconstruction],[ownerF135GardenReconstruction,__infillRoot500Owner_ownerF135GardenReconstruction],[ownerF135GardenMaterials,__infillRoot500Owner_ownerF135GardenMaterials],[ownerF190Reconstruction,__infillRoot500Owner_ownerF190Reconstruction],[ownerF190BaseMaterials,__infillRoot500Owner_ownerF190BaseMaterials],[ownerF032Reconstruction,__infillRoot500Owner_ownerF032Reconstruction],[ownerF032BaseMaterials,__infillRoot500Owner_ownerF032BaseMaterials],[ownerF135Reconstruction,__infillRoot500Owner_ownerF135Reconstruction],[ownerF135BaseMaterials,__infillRoot500Owner_ownerF135BaseMaterials],[ownerF135WestMaterials,__infillRoot500Owner_ownerF135WestMaterials],[ownerF165Reconstruction,__infillRoot500Owner_ownerF165Reconstruction],[ownerF023PergolaIdentity,__infillRoot500Owner_ownerF023PergolaIdentity],[ownerF023PergolaReconstruction,__infillRoot500Owner_ownerF023PergolaReconstruction],[ownerF023PergolaBaseMaterials,__infillRoot500Owner_ownerF023PergolaBaseMaterials],[ownerF173Reconstruction,__infillRoot500Owner_ownerF173Reconstruction],[ownerF073SupplementMaterials,__infillRoot500Owner_ownerF073SupplementMaterials],[ownerF071NarzissIdentity,__infillRoot500Owner_ownerF071NarzissIdentity],[ownerF071NarzissReconstruction,__infillRoot500Owner_ownerF071NarzissReconstruction],[ownerF071NarzissMaterials,__infillRoot500Owner_ownerF071NarzissMaterials],[ownerF085CompletionIdentity,__infillRoot500Owner_ownerF085CompletionIdentity],[ownerF085CompletionReconstruction,__infillRoot500Owner_ownerF085CompletionReconstruction],[ownerF085CompletionMaterials,__infillRoot500Owner_ownerF085CompletionMaterials],[ownerF084Reconstruction,__infillRoot500Owner_ownerF084Reconstruction],[ownerF115Identity,__infillRoot500Owner_ownerF115Identity],[ownerF115Reconstruction,__infillRoot500Owner_ownerF115Reconstruction],[ownerF115BaseMaterials,__infillRoot500Owner_ownerF115BaseMaterials],[ownerF117Reconstruction,__infillRoot500Owner_ownerF117Reconstruction],[ownerF128RoofIdentity,__infillRoot500Owner_ownerF128RoofIdentity],[ownerF128RoofReconstruction,__infillRoot500Owner_ownerF128RoofReconstruction],[ownerF128RoofMaterials,__infillRoot500Owner_ownerF128RoofMaterials],[ownerF127Reconstruction,__infillRoot500Owner_ownerF127Reconstruction],[ownerF115ExteriorIdentity,__infillRoot500Owner_ownerF115ExteriorIdentity],[ownerF115ExteriorReconstruction,__infillRoot500Owner_ownerF115ExteriorReconstruction],[ownerF115ExteriorBaseMaterials,__infillRoot500Owner_ownerF115ExteriorBaseMaterials],[ownerF120Reconstruction,__infillRoot500Owner_ownerF120Reconstruction],[ownerF123Reconstruction,__infillRoot500Owner_ownerF123Reconstruction],[ownerF121CompletionReconstruction,__infillRoot500Owner_ownerF121CompletionReconstruction],[ownerF121CompletionBaseMaterials,__infillRoot500Owner_ownerF121CompletionBaseMaterials],[ownerF125Reconstruction,__infillRoot500Owner_ownerF125Reconstruction],[ownerF129Reconstruction,__infillRoot500Owner_ownerF129Reconstruction],[ownerF134Reconstruction,__infillRoot500Owner_ownerF134Reconstruction],[ownerF124CompletionReconstruction,__infillRoot500Owner_ownerF124CompletionReconstruction],[ownerF124CompletionBaseMaterials,__infillRoot500Owner_ownerF124CompletionBaseMaterials],[ownerF139Reconstruction,__infillRoot500Owner_ownerF139Reconstruction],[ownerF161Identity,__infillRoot500Owner_ownerF161Identity],[ownerF161Reconstruction,__infillRoot500Owner_ownerF161Reconstruction],[ownerF161BaseMaterials,__infillRoot500Owner_ownerF161BaseMaterials],[ownerF143Identity,__infillRoot500Owner_ownerF143Identity],[ownerF143Reconstruction,__infillRoot500Owner_ownerF143Reconstruction],[ownerF143BaseMaterials,__infillRoot500Owner_ownerF143BaseMaterials],[ownerF151Reconstruction,__infillRoot500Owner_ownerF151Reconstruction],[ownerF141CompletionReconstruction,__infillRoot500Owner_ownerF141CompletionReconstruction],[ownerF141CompletionBaseMaterials,__infillRoot500Owner_ownerF141CompletionBaseMaterials],[ownerF168Reconstruction,__infillRoot500Owner_ownerF168Reconstruction],[ownerF171Identity,__infillRoot500Owner_ownerF171Identity],[ownerF171Reconstruction,__infillRoot500Owner_ownerF171Reconstruction],[ownerF171BaseMaterials,__infillRoot500Owner_ownerF171BaseMaterials],[ownerF172Reconstruction,__infillRoot500Owner_ownerF172Reconstruction],[ownerF169CompletionReconstruction,__infillRoot500Owner_ownerF169CompletionReconstruction],[ownerF169CompletionBaseMaterials,__infillRoot500Owner_ownerF169CompletionBaseMaterials],[ownerF170Identity,__infillRoot500Owner_ownerF170Identity],[ownerF170Reconstruction,__infillRoot500Owner_ownerF170Reconstruction],[ownerF170BaseMaterials,__infillRoot500Owner_ownerF170BaseMaterials],[ownerF108CompletionReconstruction,__infillRoot500Owner_ownerF108CompletionReconstruction],[ownerF108CompletionBaseMaterials,__infillRoot500Owner_ownerF108CompletionBaseMaterials],[ownerF106Identity,__infillRoot500Owner_ownerF106Identity],[ownerF106Reconstruction,__infillRoot500Owner_ownerF106Reconstruction],[ownerF106BaseMaterials,__infillRoot500Owner_ownerF106BaseMaterials],[ownerF109Reconstruction,__infillRoot500Owner_ownerF109Reconstruction],[ownerF086Identity,__infillRoot500Owner_ownerF086Identity],[ownerF086Reconstruction,__infillRoot500Owner_ownerF086Reconstruction],[ownerF086BaseMaterials,__infillRoot500Owner_ownerF086BaseMaterials],[ownerF089Reconstruction,__infillRoot500Owner_ownerF089Reconstruction],[infillC032OriginalBaseMaterials,__infillScopedOwner_infillC032OriginalBaseMaterials],[infillF278OriginalReconstruction,__infillScopedOwner_infillF278OriginalReconstruction],[infillC121OriginalBaseMaterials,__infillScopedOwner_infillC121OriginalBaseMaterials],[infillPremierReconstruction,__infillScopedOwner_infillPremierReconstruction]]);
const infillOwnerRecipeIdentity=(recipe:Function):Function=>{let original=recipe,next:Function|undefined;while((next=infillOwnerRecipeOrigins.get(original))&&next!==original)original=next;return original;};
function infillPreparedOwnerRecipe<F extends Function>(recipe:F,original:Function):F{infillOwnerRecipeOrigins.set(recipe,original);return recipe;}
function* frozenOwnerReconstructionStages(components:BuildingComponent[]):Generator<InfillOwnerStage,{components:BuildingComponent[];stats:OwnerReconstructionStats;cofaceStats:unknown},void>{
 const a=((yield {components:components,recipe:infillOwnerRecipeIdentity(ownerF032Reconstruction)}),ownerF032Reconstruction(components)),b=((yield {components:a.components,recipe:infillOwnerRecipeIdentity(ownerF135Reconstruction)}),ownerF135Reconstruction(a.components)),d=((yield {components:b.components,recipe:infillOwnerRecipeIdentity(ownerF190Reconstruction)}),ownerF190Reconstruction(b.components)),g=((yield {components:d.components,recipe:infillOwnerRecipeIdentity(ownerF135GardenReconstruction)}),ownerF135GardenReconstruction(d.components)),h=((yield {components:g.components,recipe:infillOwnerRecipeIdentity(ownerF148Reconstruction)}),ownerF148Reconstruction(g.components)),j=((yield {components:h.components,recipe:infillOwnerRecipeIdentity(ownerF064Reconstruction)}),ownerF064Reconstruction(h.components)),k=((yield {components:j.components,recipe:infillOwnerRecipeIdentity(ownerF078Reconstruction)}),ownerF078Reconstruction(j.components)),l=((yield {components:k.components,recipe:infillOwnerRecipeIdentity(ownerF153Reconstruction)}),ownerF153Reconstruction(k.components)),m=((yield {components:l.components,recipe:infillOwnerRecipeIdentity(ownerF146Reconstruction)}),ownerF146Reconstruction(l.components)),n=((yield {components:m.components,recipe:infillOwnerRecipeIdentity(ownerF145Reconstruction)}),ownerF145Reconstruction(m.components)),o=((yield {components:n.components,recipe:infillOwnerRecipeIdentity(ownerF147Reconstruction)}),ownerF147Reconstruction(n.components)),r=((yield {components:o.components,recipe:infillOwnerRecipeIdentity(ownerF149Reconstruction)}),ownerF149Reconstruction(o.components)),t=((yield {components:r.components,recipe:infillOwnerRecipeIdentity(ownerF150Reconstruction)}),ownerF150Reconstruction(r.components)),u=((yield {components:t.components,recipe:infillOwnerRecipeIdentity(ownerF152Reconstruction)}),ownerF152Reconstruction(t.components)),co=((yield {components:u.components,recipe:infillOwnerRecipeIdentity(ownerF152CofaceReconstruction)}),ownerF152CofaceReconstruction(u.components)),v=((yield {components:co.components,recipe:infillOwnerRecipeIdentity(ownerF154Reconstruction)}),ownerF154Reconstruction(co.components,scope)),w=((yield {components:v.components,recipe:infillOwnerRecipeIdentity(ownerF155Reconstruction)}),ownerF155Reconstruction(v.components)),z=((yield {components:w.components,recipe:infillOwnerRecipeIdentity(ownerF156Reconstruction)}),ownerF156Reconstruction(w.components)),f157=((yield {components:z.components,recipe:infillOwnerRecipeIdentity(ownerF157Reconstruction)}),ownerF157Reconstruction(z.components)),f160=((yield {components:f157.components,recipe:infillOwnerRecipeIdentity(ownerF160Reconstruction)}),ownerF160Reconstruction(f157.components)),f174=((yield {components:f160.components,recipe:infillOwnerRecipeIdentity(ownerF174Reconstruction)}),ownerF174Reconstruction(f160.components)),f158=((yield {components:f174.components,recipe:infillOwnerRecipeIdentity(ownerF158Reconstruction)}),ownerF158Reconstruction(f174.components)),f178=((yield {components:f158.components,recipe:infillOwnerRecipeIdentity(ownerF178Reconstruction)}),ownerF178Reconstruction(f158.components)),f175=((yield {components:f178.components,recipe:infillOwnerRecipeIdentity(ownerF175Reconstruction)}),ownerF175Reconstruction(f178.components)),f180=((yield {components:f175.components,recipe:infillOwnerRecipeIdentity(ownerF180Reconstruction)}),ownerF180Reconstruction(f175.components)),f181=((yield {components:f180.components,recipe:infillOwnerRecipeIdentity(ownerF181Reconstruction)}),ownerF181Reconstruction(f180.components)),f176=((yield {components:f181.components,recipe:infillOwnerRecipeIdentity(ownerF176Reconstruction)}),ownerF176Reconstruction(f181.components)),f159=((yield {components:f176.components,recipe:infillOwnerRecipeIdentity(ownerF159Reconstruction)}),ownerF159Reconstruction(f176.components)),f179=((yield {components:f159.components,recipe:infillOwnerRecipeIdentity(ownerF179Reconstruction)}),ownerF179Reconstruction(f159.components)),f182=((yield {components:f179.components,recipe:infillOwnerRecipeIdentity(ownerF182Reconstruction)}),ownerF182Reconstruction(f179.components)),f177=((yield {components:f182.components,recipe:infillOwnerRecipeIdentity(ownerF177Reconstruction)}),ownerF177Reconstruction(f182.components)),f186=((yield {components:f177.components,recipe:infillOwnerRecipeIdentity(ownerF186Reconstruction)}),ownerF186Reconstruction(f177.components)),f188=((yield {components:f186.components,recipe:infillOwnerRecipeIdentity(ownerF188Reconstruction)}),ownerF188Reconstruction(f186.components)),f183=((yield {components:f188.components,recipe:infillOwnerRecipeIdentity(ownerF183Reconstruction)}),ownerF183Reconstruction(f188.components)),f184=((yield {components:f183.components,recipe:infillOwnerRecipeIdentity(ownerF184Reconstruction)}),ownerF184Reconstruction(f183.components)),f185=((yield {components:f184.components,recipe:infillOwnerRecipeIdentity(ownerF185Reconstruction)}),ownerF185Reconstruction(f184.components)),f187=((yield {components:f185.components,recipe:infillOwnerRecipeIdentity(ownerF187Reconstruction)}),ownerF187Reconstruction(f185.components)),f189=((yield {components:f187.components,recipe:infillOwnerRecipeIdentity(ownerF189Reconstruction)}),ownerF189Reconstruction(f187.components)),f191=((yield {components:f189.components,recipe:infillOwnerRecipeIdentity(ownerF191Reconstruction)}),ownerF191Reconstruction(f189.components)),f193=((yield {components:f191.components,recipe:infillOwnerRecipeIdentity(ownerF193Reconstruction)}),ownerF193Reconstruction(f191.components)),f194=((yield {components:f193.components,recipe:infillOwnerRecipeIdentity(ownerF194Reconstruction)}),ownerF194Reconstruction(f193.components)),f192=((yield {components:f194.components,recipe:infillOwnerRecipeIdentity(ownerF192Reconstruction)}),ownerF192Reconstruction(f194.components)),f197=((yield {components:f192.components,recipe:infillOwnerRecipeIdentity(ownerF197Reconstruction)}),ownerF197Reconstruction(f192.components)),f195=((yield {components:f197.components,recipe:infillOwnerRecipeIdentity(ownerF195Reconstruction)}),ownerF195Reconstruction(f197.components)),f198=((yield {components:f195.components,recipe:infillOwnerRecipeIdentity(ownerF198Reconstruction)}),ownerF198Reconstruction(f195.components)),f199=((yield {components:f198.components,recipe:infillOwnerRecipeIdentity(ownerF199Reconstruction)}),ownerF199Reconstruction(f198.components)),f200=((yield {components:f199.components,recipe:infillOwnerRecipeIdentity(ownerF200Reconstruction)}),ownerF200Reconstruction(f199.components)),f201=((yield {components:f200.components,recipe:infillOwnerRecipeIdentity(ownerF201Reconstruction)}),ownerF201Reconstruction(f200.components)),f202=((yield {components:f201.components,recipe:infillOwnerRecipeIdentity(ownerF202Reconstruction)}),ownerF202Reconstruction(f201.components)),f203=((yield {components:f202.components,recipe:infillOwnerRecipeIdentity(ownerF203Reconstruction)}),ownerF203Reconstruction(f202.components)),f193foot=((yield {components:f203.components,recipe:infillOwnerRecipeIdentity(ownerF193FootReconstruction)}),ownerF193FootReconstruction(f203.components)),f204=((yield {components:f193foot.components,recipe:infillOwnerRecipeIdentity(ownerF204Reconstruction)}),ownerF204Reconstruction(f193foot.components)),f205=((yield {components:f204.components,recipe:infillOwnerRecipeIdentity(ownerF205Reconstruction)}),ownerF205Reconstruction(f204.components)),f206=((yield {components:f205.components,recipe:infillOwnerRecipeIdentity(ownerF206Reconstruction)}),ownerF206Reconstruction(f205.components)),f222=((yield {components:f206.components,recipe:infillOwnerRecipeIdentity(ownerF222Reconstruction)}),ownerF222Reconstruction(f206.components)),f207=((yield {components:f222.components,recipe:infillOwnerRecipeIdentity(ownerF207Reconstruction)}),ownerF207Reconstruction(f222.components)),f208=((yield {components:f207.components,recipe:infillOwnerRecipeIdentity(ownerF208Reconstruction)}),ownerF208Reconstruction(f207.components)),f209=((yield {components:f208.components,recipe:infillOwnerRecipeIdentity(ownerF209Reconstruction)}),ownerF209Reconstruction(f208.components)),f210=((yield {components:f209.components,recipe:infillOwnerRecipeIdentity(ownerF210Reconstruction)}),ownerF210Reconstruction(f209.components)),f211=((yield {components:f210.components,recipe:infillOwnerRecipeIdentity(ownerF211Reconstruction)}),ownerF211Reconstruction(f210.components)),f212=((yield {components:f211.components,recipe:infillOwnerRecipeIdentity(ownerF212Reconstruction)}),ownerF212Reconstruction(f211.components)),f213=((yield {components:f212.components,recipe:infillOwnerRecipeIdentity(ownerF213Reconstruction)}),ownerF213Reconstruction(f212.components)),f214=((yield {components:f213.components,recipe:infillOwnerRecipeIdentity(ownerF214Reconstruction)}),ownerF214Reconstruction(f213.components)),f215=((yield {components:f214.components,recipe:infillOwnerRecipeIdentity(ownerF215Reconstruction)}),ownerF215Reconstruction(f214.components)),f216=((yield {components:f215.components,recipe:infillOwnerRecipeIdentity(ownerF216Reconstruction)}),ownerF216Reconstruction(f215.components)),f216annex=((yield {components:f216.components,recipe:infillOwnerRecipeIdentity(ownerF216AnnexReconstruction)}),ownerF216AnnexReconstruction(f216.components)),f217=((yield {components:f216annex.components,recipe:infillOwnerRecipeIdentity(ownerF217Reconstruction)}),ownerF217Reconstruction(f216annex.components)),f218=((yield {components:f217.components,recipe:infillOwnerRecipeIdentity(ownerF218Reconstruction)}),ownerF218Reconstruction(f217.components)),f219=((yield {components:f218.components,recipe:infillOwnerRecipeIdentity(ownerF219Reconstruction)}),ownerF219Reconstruction(f218.components)),f220=((yield {components:f219.components,recipe:infillOwnerRecipeIdentity(ownerF220Reconstruction)}),ownerF220Reconstruction(f219.components)),f221=((yield {components:f220.components,recipe:infillOwnerRecipeIdentity(ownerF221Reconstruction)}),ownerF221Reconstruction(f220.components,scope)),f223=((yield {components:f221.components,recipe:infillOwnerRecipeIdentity(ownerF223Reconstruction)}),ownerF223Reconstruction(f221.components)),f224=((yield {components:f223.components,recipe:infillOwnerRecipeIdentity(ownerF224Reconstruction)}),ownerF224Reconstruction(f223.components)),f225=((yield {components:f224.components,recipe:infillOwnerRecipeIdentity(ownerF225Reconstruction)}),ownerF225Reconstruction(f224.components)),f226=((yield {components:f225.components,recipe:infillOwnerRecipeIdentity(ownerF226Reconstruction)}),ownerF226Reconstruction(f225.components)),f227=((yield {components:f226.components,recipe:infillOwnerRecipeIdentity(ownerF227Reconstruction)}),ownerF227Reconstruction(f226.components)),f228=((yield {components:f227.components,recipe:infillOwnerRecipeIdentity(ownerF228Reconstruction)}),ownerF228Reconstruction(f227.components)),f249=((yield {components:f228.components,recipe:infillOwnerRecipeIdentity(ownerF249Reconstruction)}),ownerF249Reconstruction(f228.components)),f252=((yield {components:f249.components,recipe:infillOwnerRecipeIdentity(ownerF252Reconstruction)}),ownerF252Reconstruction(f249.components)),f257=((yield {components:f252.components,recipe:infillOwnerRecipeIdentity(ownerF257Reconstruction)}),ownerF257Reconstruction(f252.components)),f259=((yield {components:f257.components,recipe:infillOwnerRecipeIdentity(ownerF259Reconstruction)}),ownerF259Reconstruction(f257.components)),f261=((yield {components:f259.components,recipe:infillOwnerRecipeIdentity(ownerF261Reconstruction)}),ownerF261Reconstruction(f259.components)),f274=((yield {components:f261.components,recipe:infillOwnerRecipeIdentity(ownerF274Reconstruction)}),ownerF274Reconstruction(f261.components)),f297=((yield {components:f274.components,recipe:infillOwnerRecipeIdentity(ownerF297Reconstruction)}),ownerF297Reconstruction(f274.components)),f306=((yield {components:f297.components,recipe:infillOwnerRecipeIdentity(ownerF306Reconstruction)}),ownerF306Reconstruction(f297.components)),f308=((yield {components:f306.components,recipe:infillOwnerRecipeIdentity(ownerF308Reconstruction)}),ownerF308Reconstruction(f306.components)),f299=((yield {components:f308.components,recipe:infillOwnerRecipeIdentity(ownerF299Reconstruction)}),ownerF299Reconstruction(f308.components)),f314=((yield {components:f299.components,recipe:infillOwnerRecipeIdentity(ownerF314Reconstruction)}),ownerF314Reconstruction(f299.components)),f318=((yield {components:f314.components,recipe:infillOwnerRecipeIdentity(ownerF318Reconstruction)}),ownerF318Reconstruction(f314.components)),f316=((yield {components:f318.components,recipe:infillOwnerRecipeIdentity(ownerF316Reconstruction)}),ownerF316Reconstruction(f318.components)),f320=((yield {components:f316.components,recipe:infillOwnerRecipeIdentity(ownerF320Reconstruction)}),ownerF320Reconstruction(f316.components)),f350=((yield {components:f320.components,recipe:infillOwnerRecipeIdentity(ownerF350Reconstruction)}),ownerF350Reconstruction(f320.components)),f352=((yield {components:f350.components,recipe:infillOwnerRecipeIdentity(ownerF352Reconstruction)}),ownerF352Reconstruction(f350.components)),f369=((yield {components:f352.components,recipe:infillOwnerRecipeIdentity(ownerF369Reconstruction)}),ownerF369Reconstruction(f352.components)),f371=((yield {components:f369.components,recipe:infillOwnerRecipeIdentity(ownerF371Reconstruction)}),ownerF371Reconstruction(f369.components)),f001=((yield {components:f371.components,recipe:infillOwnerRecipeIdentity(ownerF001Reconstruction)}),ownerF001Reconstruction(f371.components)),f231=((yield {components:f001.components,recipe:infillOwnerRecipeIdentity(ownerF231Reconstruction)}),ownerF231Reconstruction(f001.components)),f030=((yield {components:f231.components,recipe:infillOwnerRecipeIdentity(ownerF030Reconstruction)}),ownerF030Reconstruction(f231.components)),f024=((yield {components:f030.components,recipe:infillOwnerRecipeIdentity(ownerF024Reconstruction)}),ownerF024Reconstruction(f030.components)),f008=((yield {components:f024.components,recipe:infillOwnerRecipeIdentity(ownerF008Reconstruction)}),ownerF008Reconstruction(f024.components)),f007=((yield {components:f008.components,recipe:infillOwnerRecipeIdentity(ownerF007Reconstruction)}),ownerF007Reconstruction(f008.components)),f006=((yield {components:f007.components,recipe:infillOwnerRecipeIdentity(ownerF006Reconstruction)}),ownerF006Reconstruction(f007.components)),f005=((yield {components:f006.components,recipe:infillOwnerRecipeIdentity(ownerF005Reconstruction)}),ownerF005Reconstruction(f006.components)),e6304=((yield {components:f005.components,recipe:infillOwnerRecipeIdentity(ownerE6304Reconstruction)}),ownerE6304Reconstruction(f005.components)),e6305=((yield {components:e6304.components,recipe:infillOwnerRecipeIdentity(ownerKUPFER6305Reconstruction)}),ownerKUPFER6305Reconstruction(e6304.components)),e6306=((yield {components:e6305.components,recipe:infillOwnerRecipeIdentity(ownerE6306Reconstruction)}),ownerE6306Reconstruction(e6305.components)),f009=((yield {components:e6306.components,recipe:infillOwnerRecipeIdentity(ownerF009Reconstruction)}),ownerF009Reconstruction(e6306.components)),f010=((yield {components:f009.components,recipe:infillOwnerRecipeIdentity(ownerF010Reconstruction)}),ownerF010Reconstruction(f009.components)),f011=((yield {components:f010.components,recipe:infillOwnerRecipeIdentity(ownerF011Reconstruction)}),ownerF011Reconstruction(f010.components)),f012=((yield {components:f011.components,recipe:infillOwnerRecipeIdentity(ownerF012Reconstruction)}),ownerF012Reconstruction(f011.components)),f015=((yield {components:f012.components,recipe:infillOwnerRecipeIdentity(ownerF015Reconstruction)}),ownerF015Reconstruction(f012.components)),f016=((yield {components:f015.components,recipe:infillOwnerRecipeIdentity(ownerF016Reconstruction)}),ownerF016Reconstruction(f015.components)),f017=((yield {components:f016.components,recipe:infillOwnerRecipeIdentity(ownerF017Reconstruction)}),ownerF017Reconstruction(f016.components)),f028=((yield {components:f017.components,recipe:infillOwnerRecipeIdentity(ownerF028Reconstruction)}),ownerF028Reconstruction(f017.components)),f037=((yield {components:f028.components,recipe:infillOwnerRecipeIdentity(ownerF037Reconstruction)}),ownerF037Reconstruction(f028.components)),f036=((yield {components:f037.components,recipe:infillOwnerRecipeIdentity(ownerF036Reconstruction)}),ownerF036Reconstruction(f037.components)),f034=((yield {components:f036.components,recipe:infillOwnerRecipeIdentity(ownerF034Reconstruction)}),ownerF034Reconstruction(f036.components)),f033=((yield {components:f034.components,recipe:infillOwnerRecipeIdentity(ownerF033Reconstruction)}),ownerF033Reconstruction(f034.components)),f038=((yield {components:f033.components,recipe:infillOwnerRecipeIdentity(ownerF038Reconstruction)}),ownerF038Reconstruction(f033.components)),f039=((yield {components:f038.components,recipe:infillOwnerRecipeIdentity(ownerF039Reconstruction)}),ownerF039Reconstruction(f038.components)),f041=((yield {components:f039.components,recipe:infillOwnerRecipeIdentity(ownerF041Reconstruction)}),ownerF041Reconstruction(f039.components)),f039b=((yield {components:f041.components,recipe:infillOwnerRecipeIdentity(ownerF039BReconstruction)}),ownerF039BReconstruction(f041.components)),f040=((yield {components:f039b.components,recipe:infillOwnerRecipeIdentity(ownerF040Reconstruction)}),ownerF040Reconstruction(f039b.components)),f042=((yield {components:f040.components,recipe:infillOwnerRecipeIdentity(ownerF042Reconstruction)}),ownerF042Reconstruction(f040.components)),f039c=((yield {components:f042.components,recipe:infillOwnerRecipeIdentity(ownerF039CReconstruction)}),ownerF039CReconstruction(f042.components)),f043=((yield {components:f039c.components,recipe:infillOwnerRecipeIdentity(ownerF043Reconstruction)}),ownerF043Reconstruction(f039c.components)),f044=((yield {components:f043.components,recipe:infillOwnerRecipeIdentity(ownerF044Reconstruction)}),ownerF044Reconstruction(f043.components)),f039d=((yield {components:f044.components,recipe:infillOwnerRecipeIdentity(ownerF039DReconstruction)}),ownerF039DReconstruction(f044.components)),f039e=((yield {components:f039d.components,recipe:infillOwnerRecipeIdentity(ownerF039EReconstruction)}),ownerF039EReconstruction(f039d.components)),f047=((yield {components:f039e.components,recipe:infillOwnerRecipeIdentity(ownerF047Reconstruction)}),ownerF047Reconstruction(f039e.components)),f053=((yield {components:f047.components,recipe:infillOwnerRecipeIdentity(ownerF053Reconstruction)}),ownerF053Reconstruction(f047.components)),f027=((yield {components:f053.components,recipe:infillOwnerRecipeIdentity(ownerF027Reconstruction)}),ownerF027Reconstruction(f053.components)),f031=((yield {components:f027.components,recipe:infillOwnerRecipeIdentity(ownerF031Reconstruction)}),ownerF031Reconstruction(f027.components)),f026=((yield {components:f031.components,recipe:infillOwnerRecipeIdentity(ownerF026Reconstruction)}),ownerF026Reconstruction(f031.components)),f065=((yield {components:f026.components,recipe:infillOwnerRecipeIdentity(ownerF065Reconstruction)}),ownerF065Reconstruction(f026.components)),f065platform=((yield {components:f065.components,recipe:infillOwnerRecipeIdentity(ownerF065PlatformReconstruction)}),ownerF065PlatformReconstruction(f065.components)),f079=((yield {components:f065platform.components,recipe:infillOwnerRecipeIdentity(ownerF079Reconstruction)}),ownerF079Reconstruction(f065platform.components)),f111=((yield {components:f079.components,recipe:infillOwnerRecipeIdentity(ownerF111Reconstruction)}),ownerF111Reconstruction(f079.components)),f112=((yield {components:f111.components,recipe:infillOwnerRecipeIdentity(ownerF112Reconstruction)}),ownerF112Reconstruction(f111.components)),f113=((yield {components:f112.components,recipe:infillOwnerRecipeIdentity(ownerF113Reconstruction)}),ownerF113Reconstruction(f112.components)),f110=((yield {components:f113.components,recipe:infillOwnerRecipeIdentity(ownerF110Reconstruction)}),ownerF110Reconstruction(f113.components)),f132=((yield {components:f110.components,recipe:infillOwnerRecipeIdentity(ownerF132Reconstruction)}),ownerF132Reconstruction(f110.components)),f136=((yield {components:f132.components,recipe:infillOwnerRecipeIdentity(ownerF136Reconstruction)}),ownerF136Reconstruction(f132.components)),f114=((yield {components:f136.components,recipe:infillOwnerRecipeIdentity(ownerF114Reconstruction)}),ownerF114Reconstruction(f136.components)),f137=((yield {components:f114.components,recipe:infillOwnerRecipeIdentity(frankfurtHbfLowwing082Reconstruction)}),frankfurtHbfLowwing082Reconstruction(f114.components,scope)),f138=((yield {components:f137.components,recipe:infillOwnerRecipeIdentity(ownerF138Reconstruction)}),ownerF138Reconstruction(f137.components)),f144=((yield {components:f138.components,recipe:infillOwnerRecipeIdentity(ownerF144Reconstruction)}),ownerF144Reconstruction(f138.components)),f140=((yield {components:f144.components,recipe:infillOwnerRecipeIdentity(ownerF140Reconstruction)}),ownerF140Reconstruction(f144.components)),f162=((yield {components:f140.components,recipe:infillOwnerRecipeIdentity(ownerF162Reconstruction)}),ownerF162Reconstruction(f140.components)),f164=((yield {components:f162.components,recipe:infillOwnerRecipeIdentity(ownerF164Reconstruction)}),ownerF164Reconstruction(f162.components)),f163=((yield {components:f164.components,recipe:infillOwnerRecipeIdentity(ownerF163Reconstruction)}),ownerF163Reconstruction(f164.components)),f166=((yield {components:f163.components,recipe:infillOwnerRecipeIdentity(ownerF166Reconstruction)}),ownerF166Reconstruction(f163.components)),f048=((yield {components:f166.components,recipe:infillOwnerRecipeIdentity(ownerF048Reconstruction)}),ownerF048Reconstruction(f166.components)),f040h=((yield {components:f048.components,recipe:infillOwnerRecipeIdentity(ownerF040HReconstruction)}),ownerF040HReconstruction(f048.components)),f049=((yield {components:f040h.components,recipe:infillOwnerRecipeIdentity(ownerF049Reconstruction)}),ownerF049Reconstruction(f040h.components)),f052=((yield {components:f049.components,recipe:infillOwnerRecipeIdentity(ownerF052Reconstruction)}),ownerF052Reconstruction(f049.components)),f051=((yield {components:f052.components,recipe:infillOwnerRecipeIdentity(ownerF051Reconstruction)}),ownerF051Reconstruction(f052.components)),f054=((yield {components:f051.components,recipe:infillOwnerRecipeIdentity(ownerF054Reconstruction)}),ownerF054Reconstruction(f051.components)),f055=((yield {components:f054.components,recipe:infillOwnerRecipeIdentity(ownerF055Reconstruction)}),ownerF055Reconstruction(f054.components)),f056=((yield {components:f055.components,recipe:infillOwnerRecipeIdentity(ownerF056Reconstruction)}),ownerF056Reconstruction(f055.components)),f057=((yield {components:f056.components,recipe:infillOwnerRecipeIdentity(ownerF057Reconstruction)}),ownerF057Reconstruction(f056.components)),f059=((yield {components:f057.components,recipe:infillOwnerRecipeIdentity(ownerF059Reconstruction)}),ownerF059Reconstruction(f057.components)),f060=((yield {components:f059.components,recipe:infillOwnerRecipeIdentity(ownerF060Reconstruction)}),ownerF060Reconstruction(f059.components)),f062=((yield {components:f060.components,recipe:infillOwnerRecipeIdentity(ownerF062Reconstruction)}),ownerF062Reconstruction(f060.components)),f067=((yield {components:f062.components,recipe:infillOwnerRecipeIdentity(ownerF067Reconstruction)}),ownerF067Reconstruction(f062.components)),f070=((yield {components:f067.components,recipe:infillOwnerRecipeIdentity(ownerF070Reconstruction)}),ownerF070Reconstruction(f067.components)),f071=((yield {components:f070.components,recipe:infillOwnerRecipeIdentity(ownerF071HeightReconstruction)}),ownerF071HeightReconstruction(f070.components)),f072=((yield {components:f071.components,recipe:infillOwnerRecipeIdentity(ownerF072Reconstruction)}),ownerF072Reconstruction(f071.components)),f083=((yield {components:f072.components,recipe:infillOwnerRecipeIdentity(ownerF083Reconstruction)}),ownerF083Reconstruction(f072.components)),f035=((yield {components:f083.components,recipe:infillOwnerRecipeIdentity(ownerF035Reconstruction)}),ownerF035Reconstruction(f083.components)),f133=((yield {components:f035.components,recipe:infillOwnerRecipeIdentity(ownerF133Reconstruction)}),ownerF133Reconstruction(f035.components)),f118=((yield {components:f133.components,recipe:infillOwnerRecipeIdentity(ownerF118Reconstruction)}),ownerF118Reconstruction(f133.components)),f142=((yield {components:f118.components,recipe:infillOwnerRecipeIdentity(ownerF142Reconstruction)}),ownerF142Reconstruction(f118.components)),f076=((yield {components:f142.components,recipe:infillOwnerRecipeIdentity(ownerF076Reconstruction)}),ownerF076Reconstruction(f142.components)),f130=((yield {components:f076.components,recipe:infillOwnerRecipeIdentity(ownerF130Reconstruction)}),ownerF130Reconstruction(f076.components)),f167=((yield {components:f130.components,recipe:infillOwnerRecipeIdentity(ownerF167Reconstruction)}),ownerF167Reconstruction(f130.components)),f173=((yield {components:f167.components,recipe:infillOwnerRecipeIdentity(ownerF173Reconstruction)}),ownerF173Reconstruction(f167.components)),f165=((yield {components:f173.components,recipe:infillOwnerRecipeIdentity(ownerF165Reconstruction)}),ownerF165Reconstruction(f173.components)),f023Pergola=((yield {components:f165.components,recipe:infillOwnerRecipeIdentity(ownerF023PergolaReconstruction)}),ownerF023PergolaReconstruction(f165.components)),f071n=((yield {components:f023Pergola.components,recipe:infillOwnerRecipeIdentity(ownerF071NarzissReconstruction)}),ownerF071NarzissReconstruction(f023Pergola.components)),f077c=((yield {components:f071n.components,recipe:infillOwnerRecipeIdentity(ownerF077CompletionReconstruction)}),ownerF077CompletionReconstruction(f071n.components,scope)),f085c=((yield {components:f077c.components,recipe:infillOwnerRecipeIdentity(ownerF085CompletionReconstruction)}),ownerF085CompletionReconstruction(f077c.components)),f029=((yield {components:f085c.components,recipe:infillOwnerRecipeIdentity(ownerF029Reconstruction)}),ownerF029Reconstruction(f085c.components)),f081c=((yield {components:f029.components,recipe:infillOwnerRecipeIdentity(ownerF081CompletionReconstruction)}),ownerF081CompletionReconstruction(f029.components,scope)),f105=((yield {components:f081c.components,recipe:infillOwnerRecipeIdentity(ownerF105Reconstruction)}),ownerF105Reconstruction(f081c.components)),f084=((yield {components:f105.components,recipe:infillOwnerRecipeIdentity(ownerF084Reconstruction)}),ownerF084Reconstruction(f105.components)),f116c=((yield {components:f084.components,recipe:infillOwnerRecipeIdentity(ownerF116CompletionReconstruction)}),ownerF116CompletionReconstruction(f084.components,scope)),f115=((yield {components:f116c.components,recipe:infillOwnerRecipeIdentity(ownerF115Reconstruction)}),ownerF115Reconstruction(f116c.components)),f117=((yield {components:f115.components,recipe:infillOwnerRecipeIdentity(ownerF117Reconstruction)}),ownerF117Reconstruction(f115.components)),f128r=((yield {components:f117.components,recipe:infillOwnerRecipeIdentity(ownerF128RoofReconstruction)}),ownerF128RoofReconstruction(f117.components)),f088c=((yield {components:f128r.components,recipe:infillOwnerRecipeIdentity(ownerF088CompletionReconstruction)}),ownerF088CompletionReconstruction(f128r.components,scope)),f127=((yield {components:f088c.components,recipe:infillOwnerRecipeIdentity(ownerF127Reconstruction)}),ownerF127Reconstruction(f088c.components)),f115e=((yield {components:f127.components,recipe:infillOwnerRecipeIdentity(ownerF115ExteriorReconstruction)}),ownerF115ExteriorReconstruction(f127.components)),f128c=((yield {components:f115e.components,recipe:infillOwnerRecipeIdentity(ownerF128CompletionReconstruction)}),ownerF128CompletionReconstruction(f115e.components,scope)),f120=((yield {components:f128c.components,recipe:infillOwnerRecipeIdentity(ownerF120Reconstruction)}),ownerF120Reconstruction(f128c.components)),f123=((yield {components:f120.components,recipe:infillOwnerRecipeIdentity(ownerF123Reconstruction)}),ownerF123Reconstruction(f120.components)),f122c=((yield {components:f123.components,recipe:infillOwnerRecipeIdentity(ownerF122CompletionReconstruction)}),ownerF122CompletionReconstruction(f123.components,scope)),f121c=((yield {components:f122c.components,recipe:infillOwnerRecipeIdentity(ownerF121CompletionReconstruction)}),ownerF121CompletionReconstruction(f122c.components)),f125=((yield {components:f121c.components,recipe:infillOwnerRecipeIdentity(ownerF125Reconstruction)}),ownerF125Reconstruction(f121c.components)),f126c=((yield {components:f125.components,recipe:infillOwnerRecipeIdentity(ownerF126CompletionReconstruction)}),ownerF126CompletionReconstruction(f125.components,scope)),f129=((yield {components:f126c.components,recipe:infillOwnerRecipeIdentity(ownerF129Reconstruction)}),ownerF129Reconstruction(f126c.components)),f131c=((yield {components:f129.components,recipe:infillOwnerRecipeIdentity(ownerF131CompletionReconstruction)}),ownerF131CompletionReconstruction(f129.components,scope)),f134=((yield {components:f131c.components,recipe:infillOwnerRecipeIdentity(ownerF134Reconstruction)}),ownerF134Reconstruction(f131c.components)),f124c=((yield {components:f134.components,recipe:infillOwnerRecipeIdentity(ownerF124CompletionReconstruction)}),ownerF124CompletionReconstruction(f134.components)),f139=((yield {components:f124c.components,recipe:infillOwnerRecipeIdentity(ownerF139Reconstruction)}),ownerF139Reconstruction(f124c.components)),f161=((yield {components:f139.components,recipe:infillOwnerRecipeIdentity(ownerF161Reconstruction)}),ownerF161Reconstruction(f139.components)),f143=((yield {components:f161.components,recipe:infillOwnerRecipeIdentity(ownerF143Reconstruction)}),ownerF143Reconstruction(f161.components)),f151=((yield {components:f143.components,recipe:infillOwnerRecipeIdentity(ownerF151Reconstruction)}),ownerF151Reconstruction(f143.components)),f141c=((yield {components:f151.components,recipe:infillOwnerRecipeIdentity(ownerF141CompletionReconstruction)}),ownerF141CompletionReconstruction(f151.components)),f168=((yield {components:f141c.components,recipe:infillOwnerRecipeIdentity(ownerF168Reconstruction)}),ownerF168Reconstruction(f141c.components)),f171=((yield {components:f168.components,recipe:infillOwnerRecipeIdentity(ownerF171Reconstruction)}),ownerF171Reconstruction(f168.components)),f172=((yield {components:f171.components,recipe:infillOwnerRecipeIdentity(ownerF172Reconstruction)}),ownerF172Reconstruction(f171.components)),f169c=((yield {components:f172.components,recipe:infillOwnerRecipeIdentity(ownerF169CompletionReconstruction)}),ownerF169CompletionReconstruction(f172.components)),f170=((yield {components:f169c.components,recipe:infillOwnerRecipeIdentity(ownerF170Reconstruction)}),ownerF170Reconstruction(f169c.components)),f108c=((yield {components:f170.components,recipe:infillOwnerRecipeIdentity(ownerF108CompletionReconstruction)}),ownerF108CompletionReconstruction(f170.components)),f106c=((yield {components:f108c.components,recipe:infillOwnerRecipeIdentity(ownerF106Reconstruction)}),ownerF106Reconstruction(f108c.components)),f109=((yield {components:f106c.components,recipe:infillOwnerRecipeIdentity(ownerF109Reconstruction)}),ownerF109Reconstruction(f106c.components)),f086c=((yield {components:f109.components,recipe:infillOwnerRecipeIdentity(ownerF086Reconstruction)}),ownerF086Reconstruction(f109.components)),f089c=((yield {components:f086c.components,recipe:infillOwnerRecipeIdentity(ownerF089Reconstruction)}),ownerF089Reconstruction(f086c.components)),f018c=((yield {components:f089c.components,recipe:infillOwnerRecipeIdentity(ownerF018Reconstruction)}),ownerF018Reconstruction(f089c.components,scope));
 // A successful same-part completion supersedes the roof-only receipt entry; its material and SOURCE guards stay intact.
 if(f128c.stats.objects===1)f128r.stats={...f128r.stats,objects:0,vertices:0,triangles:0,originalVertices:0,components:[]};if(f115e.stats.objects>0){f115.stats.objects=0;f115.stats.vertices=0;f115.stats.triangles=0;f115.stats.originalVertices=0;f115.stats.components=[];}
 const stats:OwnerReconstructionStats={objects:a.stats.objects+b.stats.objects+d.stats.objects+g.stats.objects+h.stats.objects+j.stats.objects+k.stats.objects+l.stats.objects+m.stats.objects+n.stats.objects+o.stats.objects+r.stats.objects+t.stats.objects+u.stats.objects+v.stats.objects+w.stats.objects+z.stats.objects+f157.stats.objects+f160.stats.objects+f174.stats.objects+f158.stats.objects+f178.stats.objects+f175.stats.objects+f180.stats.objects+f181.stats.objects+f176.stats.objects+f159.stats.objects+f179.stats.objects+f182.stats.objects+f177.stats.objects+f186.stats.objects+f188.stats.objects+f183.stats.objects+f184.stats.objects+f185.stats.objects+f187.stats.objects+f189.stats.objects+f191.stats.objects+f193.stats.objects+f194.stats.objects+f192.stats.objects+f197.stats.objects+f195.stats.objects+f198.stats.objects+f199.stats.objects+f200.stats.objects+f201.stats.objects+f202.stats.objects+f203.stats.objects+f193foot.stats.objects+f204.stats.objects+f205.stats.objects+f206.stats.objects+f222.stats.objects+f207.stats.objects+f208.stats.objects+f209.stats.objects+f210.stats.objects+f211.stats.objects+f212.stats.objects+f213.stats.objects+f214.stats.objects+f215.stats.objects+f216.stats.objects+f216annex.stats.objects+f217.stats.objects+f218.stats.objects+f219.stats.objects+f220.stats.objects+f221.stats.objects+f223.stats.objects+f224.stats.objects+f225.stats.objects+f226.stats.objects+f227.stats.objects+f228.stats.objects+f249.stats.objects+f252.stats.objects+f257.stats.objects+f259.stats.objects+f261.stats.objects+f274.stats.objects+f297.stats.objects+f306.stats.objects+f308.stats.objects+f299.stats.objects+f314.stats.objects+f318.stats.objects+f316.stats.objects+f320.stats.objects+f350.stats.objects+f352.stats.objects+f369.stats.objects+f371.stats.objects+f001.stats.objects+f231.stats.objects+f030.stats.objects+f024.stats.objects+f005.stats.objects+f006.stats.objects+f007.stats.objects+f008.stats.objects+e6304.stats.objects+e6305.stats.objects+e6306.stats.objects+f009.stats.objects+f010.stats.objects+f011.stats.objects+f012.stats.objects+f015.stats.objects+f016.stats.objects+f017.stats.objects+f028.stats.objects+f037.stats.objects+f036.stats.objects+f044.stats.objects+f039d.stats.objects+f039e.stats.objects+f047.stats.objects+f053.stats.objects+f027.stats.objects+f031.stats.objects+f026.stats.objects+f065.stats.objects+f065platform.stats.objects+f079.stats.objects+f111.stats.objects+f112.stats.objects+f113.stats.objects+f110.stats.objects+f132.stats.objects+f136.stats.objects+f114.stats.objects+f137.stats.objects+f138.stats.objects+f144.stats.objects+f140.stats.objects+f162.stats.objects+f164.stats.objects+f163.stats.objects+f166.stats.objects+f048.stats.objects+f040h.stats.objects+f049.stats.objects+f052.stats.objects+f051.stats.objects+f054.stats.objects+f055.stats.objects+f056.stats.objects+f057.stats.objects+f059.stats.objects+f060.stats.objects+f062.stats.objects+f067.stats.objects+f070.stats.objects+f071.stats.objects+f072.stats.objects+f083.stats.objects+f035.stats.objects+f133.stats.objects+f118.stats.objects+f142.stats.objects+f076.stats.objects+f130.stats.objects+f167.stats.objects+f173.stats.objects+f165.stats.objects+f023Pergola.stats.objects+f071n.stats.objects+f077c.stats.objects+f085c.stats.objects+f029.stats.objects+f115.stats.objects+f117.stats.objects+f128r.stats.objects+f115e.stats.objects+f120.stats.objects+f123.stats.objects+f125.stats.objects+f126c.stats.objects+f129.stats.objects+f124c.stats.objects+f143.stats.objects+f139.stats.objects+f141c.stats.objects+f161.stats.objects+f151.stats.objects+f168.stats.objects+f169c.stats.objects+f170.stats.objects+f108c.stats.objects+f106c.stats.objects+f109.stats.objects+f086c.stats.objects+f089c.stats.objects+f018c.stats.objects+f172.stats.objects+f171.stats.objects+f131c.stats.objects+f134.stats.objects+f121c.stats.objects+f122c.stats.objects+f127.stats.objects+f128c.stats.objects+f088c.stats.objects+f081c.stats.objects+f105.stats.objects+f084.stats.objects+f116c.stats.objects+f042.stats.objects+f039c.stats.objects+f043.stats.objects+f041.stats.objects+f039b.stats.objects+f038.stats.objects+f039.stats.objects+f040.stats.objects+f033.stats.objects+f034.stats.objects,vertices:a.stats.vertices+b.stats.vertices+d.stats.vertices+g.stats.vertices+h.stats.vertices+j.stats.vertices+k.stats.vertices+l.stats.vertices+m.stats.vertices+n.stats.vertices+o.stats.vertices+r.stats.vertices+t.stats.vertices+u.stats.vertices+v.stats.vertices+w.stats.vertices+z.stats.vertices+f157.stats.vertices+f160.stats.vertices+f174.stats.vertices+f158.stats.vertices+f178.stats.vertices+f175.stats.vertices+f180.stats.vertices+f181.stats.vertices+f176.stats.vertices+f159.stats.vertices+f179.stats.vertices+f182.stats.vertices+f177.stats.vertices+f186.stats.vertices+f188.stats.vertices+f183.stats.vertices+f184.stats.vertices+f185.stats.vertices+f187.stats.vertices+f189.stats.vertices+f191.stats.vertices+f193.stats.vertices+f194.stats.vertices+f192.stats.vertices+f197.stats.vertices+f195.stats.vertices+f198.stats.vertices+f199.stats.vertices+f200.stats.vertices+f201.stats.vertices+f202.stats.vertices+f203.stats.vertices+f193foot.stats.vertices+f204.stats.vertices+f205.stats.vertices+f206.stats.vertices+f222.stats.vertices+f207.stats.vertices+f208.stats.vertices+f209.stats.vertices+f210.stats.vertices+f211.stats.vertices+f212.stats.vertices+f213.stats.vertices+f214.stats.vertices+f215.stats.vertices+f216.stats.vertices+f216annex.stats.vertices+f217.stats.vertices+f218.stats.vertices+f219.stats.vertices+f220.stats.vertices+f221.stats.vertices+f223.stats.vertices+f224.stats.vertices+f225.stats.vertices+f226.stats.vertices+f227.stats.vertices+f228.stats.vertices+f249.stats.vertices+f252.stats.vertices+f257.stats.vertices+f259.stats.vertices+f261.stats.vertices+f274.stats.vertices+f297.stats.vertices+f306.stats.vertices+f308.stats.vertices+f299.stats.vertices+f314.stats.vertices+f318.stats.vertices+f316.stats.vertices+f320.stats.vertices+f350.stats.vertices+f352.stats.vertices+f369.stats.vertices+f371.stats.vertices+f001.stats.vertices+f231.stats.vertices+f030.stats.vertices+f024.stats.vertices+f005.stats.vertices+f006.stats.vertices+f007.stats.vertices+f008.stats.vertices+e6304.stats.vertices+e6305.stats.vertices+e6306.stats.vertices+f009.stats.vertices+f010.stats.vertices+f011.stats.vertices+f012.stats.vertices+f015.stats.vertices+f016.stats.vertices+f017.stats.vertices+f028.stats.vertices+f037.stats.vertices+f036.stats.vertices+f044.stats.vertices+f039d.stats.vertices+f039e.stats.vertices+f047.stats.vertices+f053.stats.vertices+f027.stats.vertices+f031.stats.vertices+f026.stats.vertices+f065.stats.vertices+f065platform.stats.vertices+f079.stats.vertices+f111.stats.vertices+f112.stats.vertices+f113.stats.vertices+f110.stats.vertices+f132.stats.vertices+f136.stats.vertices+f114.stats.vertices+f137.stats.vertices+f138.stats.vertices+f144.stats.vertices+f140.stats.vertices+f162.stats.vertices+f164.stats.vertices+f163.stats.vertices+f166.stats.vertices+f048.stats.vertices+f040h.stats.vertices+f049.stats.vertices+f052.stats.vertices+f051.stats.vertices+f054.stats.vertices+f055.stats.vertices+f056.stats.vertices+f057.stats.vertices+f059.stats.vertices+f060.stats.vertices+f062.stats.vertices+f067.stats.vertices+f070.stats.vertices+f071.stats.vertices+f072.stats.vertices+f083.stats.vertices+f035.stats.vertices+f133.stats.vertices+f118.stats.vertices+f142.stats.vertices+f076.stats.vertices+f130.stats.vertices+f167.stats.vertices+f173.stats.vertices+f165.stats.vertices+f023Pergola.stats.vertices+f071n.stats.vertices+f077c.stats.vertices+f085c.stats.vertices+f029.stats.vertices+f115.stats.vertices+f117.stats.vertices+f128r.stats.vertices+f115e.stats.vertices+f120.stats.vertices+f123.stats.vertices+f125.stats.vertices+f126c.stats.vertices+f129.stats.vertices+f124c.stats.vertices+f143.stats.vertices+f139.stats.vertices+f141c.stats.vertices+f161.stats.vertices+f151.stats.vertices+f168.stats.vertices+f169c.stats.vertices+f170.stats.vertices+f108c.stats.vertices+f106c.stats.vertices+f109.stats.vertices+f086c.stats.vertices+f089c.stats.vertices+f018c.stats.vertices+f172.stats.vertices+f171.stats.vertices+f131c.stats.vertices+f134.stats.vertices+f121c.stats.vertices+f122c.stats.vertices+f127.stats.vertices+f128c.stats.vertices+f088c.stats.vertices+f081c.stats.vertices+f105.stats.vertices+f084.stats.vertices+f116c.stats.vertices+f042.stats.vertices+f039c.stats.vertices+f043.stats.vertices+f041.stats.vertices+f039b.stats.vertices+f038.stats.vertices+f039.stats.vertices+f040.stats.vertices+f033.stats.vertices+f034.stats.vertices,triangles:a.stats.triangles+b.stats.triangles+d.stats.triangles+g.stats.triangles+h.stats.triangles+j.stats.triangles+k.stats.triangles+l.stats.triangles+m.stats.triangles+n.stats.triangles+o.stats.triangles+r.stats.triangles+t.stats.triangles+u.stats.triangles+v.stats.triangles+w.stats.triangles+z.stats.triangles+f157.stats.triangles+f160.stats.triangles+f174.stats.triangles+f158.stats.triangles+f178.stats.triangles+f175.stats.triangles+f180.stats.triangles+f181.stats.triangles+f176.stats.triangles+f159.stats.triangles+f179.stats.triangles+f182.stats.triangles+f177.stats.triangles+f186.stats.triangles+f188.stats.triangles+f183.stats.triangles+f184.stats.triangles+f185.stats.triangles+f187.stats.triangles+f189.stats.triangles+f191.stats.triangles+f193.stats.triangles+f194.stats.triangles+f192.stats.triangles+f197.stats.triangles+f195.stats.triangles+f198.stats.triangles+f199.stats.triangles+f200.stats.triangles+f201.stats.triangles+f202.stats.triangles+f203.stats.triangles+f193foot.stats.triangles+f204.stats.triangles+f205.stats.triangles+f206.stats.triangles+f222.stats.triangles+f207.stats.triangles+f208.stats.triangles+f209.stats.triangles+f210.stats.triangles+f211.stats.triangles+f212.stats.triangles+f213.stats.triangles+f214.stats.triangles+f215.stats.triangles+f216.stats.triangles+f216annex.stats.triangles+f217.stats.triangles+f218.stats.triangles+f219.stats.triangles+f220.stats.triangles+f221.stats.triangles+f223.stats.triangles+f224.stats.triangles+f225.stats.triangles+f226.stats.triangles+f227.stats.triangles+f228.stats.triangles+f249.stats.triangles+f252.stats.triangles+f257.stats.triangles+f259.stats.triangles+f261.stats.triangles+f274.stats.triangles+f297.stats.triangles+f306.stats.triangles+f308.stats.triangles+f299.stats.triangles+f314.stats.triangles+f318.stats.triangles+f316.stats.triangles+f320.stats.triangles+f350.stats.triangles+f352.stats.triangles+f369.stats.triangles+f371.stats.triangles+f001.stats.triangles+f231.stats.triangles+f030.stats.triangles+f024.stats.triangles+f005.stats.triangles+f006.stats.triangles+f007.stats.triangles+f008.stats.triangles+e6304.stats.triangles+e6305.stats.triangles+e6306.stats.triangles+f009.stats.triangles+f010.stats.triangles+f011.stats.triangles+f012.stats.triangles+f015.stats.triangles+f016.stats.triangles+f017.stats.triangles+f028.stats.triangles+f037.stats.triangles+f036.stats.triangles+f044.stats.triangles+f039d.stats.triangles+f039e.stats.triangles+f047.stats.triangles+f053.stats.triangles+f027.stats.triangles+f031.stats.triangles+f026.stats.triangles+f065.stats.triangles+f065platform.stats.triangles+f079.stats.triangles+f111.stats.triangles+f112.stats.triangles+f113.stats.triangles+f110.stats.triangles+f132.stats.triangles+f136.stats.triangles+f114.stats.triangles+f137.stats.triangles+f138.stats.triangles+f144.stats.triangles+f140.stats.triangles+f162.stats.triangles+f164.stats.triangles+f163.stats.triangles+f166.stats.triangles+f048.stats.triangles+f040h.stats.triangles+f049.stats.triangles+f052.stats.triangles+f051.stats.triangles+f054.stats.triangles+f055.stats.triangles+f056.stats.triangles+f057.stats.triangles+f059.stats.triangles+f060.stats.triangles+f062.stats.triangles+f067.stats.triangles+f070.stats.triangles+f071.stats.triangles+f072.stats.triangles+f083.stats.triangles+f035.stats.triangles+f133.stats.triangles+f118.stats.triangles+f142.stats.triangles+f076.stats.triangles+f130.stats.triangles+f167.stats.triangles+f173.stats.triangles+f165.stats.triangles+f023Pergola.stats.triangles+f071n.stats.triangles+f077c.stats.triangles+f085c.stats.triangles+f029.stats.triangles+f115.stats.triangles+f117.stats.triangles+f128r.stats.triangles+f115e.stats.triangles+f120.stats.triangles+f123.stats.triangles+f125.stats.triangles+f126c.stats.triangles+f129.stats.triangles+f124c.stats.triangles+f143.stats.triangles+f139.stats.triangles+f141c.stats.triangles+f161.stats.triangles+f151.stats.triangles+f168.stats.triangles+f169c.stats.triangles+f170.stats.triangles+f108c.stats.triangles+f106c.stats.triangles+f109.stats.triangles+f086c.stats.triangles+f089c.stats.triangles+f018c.stats.triangles+f172.stats.triangles+f171.stats.triangles+f131c.stats.triangles+f134.stats.triangles+f121c.stats.triangles+f122c.stats.triangles+f127.stats.triangles+f128c.stats.triangles+f088c.stats.triangles+f081c.stats.triangles+f105.stats.triangles+f084.stats.triangles+f116c.stats.triangles+f042.stats.triangles+f039c.stats.triangles+f043.stats.triangles+f041.stats.triangles+f039b.stats.triangles+f038.stats.triangles+f039.stats.triangles+f040.stats.triangles+f033.stats.triangles+f034.stats.triangles,originalVertices:a.stats.originalVertices+b.stats.originalVertices+d.stats.originalVertices+g.stats.originalVertices+h.stats.originalVertices+j.stats.originalVertices+k.stats.originalVertices+l.stats.originalVertices+m.stats.originalVertices+n.stats.originalVertices+o.stats.originalVertices+r.stats.originalVertices+t.stats.originalVertices+u.stats.originalVertices+v.stats.originalVertices+w.stats.originalVertices+z.stats.originalVertices+f157.stats.originalVertices+f160.stats.originalVertices+f174.stats.originalVertices+f158.stats.originalVertices+f178.stats.originalVertices+f175.stats.originalVertices+f180.stats.originalVertices+f181.stats.originalVertices+f176.stats.originalVertices+f159.stats.originalVertices+f179.stats.originalVertices+f182.stats.originalVertices+f177.stats.originalVertices+f186.stats.originalVertices+f188.stats.originalVertices+f183.stats.originalVertices+f184.stats.originalVertices+f185.stats.originalVertices+f187.stats.originalVertices+f189.stats.originalVertices+f191.stats.originalVertices+f193.stats.originalVertices+f194.stats.originalVertices+f192.stats.originalVertices+f197.stats.originalVertices+f195.stats.originalVertices+f198.stats.originalVertices+f199.stats.originalVertices+f200.stats.originalVertices+f201.stats.originalVertices+f202.stats.originalVertices+f203.stats.originalVertices+f193foot.stats.originalVertices+f204.stats.originalVertices+f205.stats.originalVertices+f206.stats.originalVertices+f222.stats.originalVertices+f207.stats.originalVertices+f208.stats.originalVertices+f209.stats.originalVertices+f210.stats.originalVertices+f211.stats.originalVertices+f212.stats.originalVertices+f213.stats.originalVertices+f214.stats.originalVertices+f215.stats.originalVertices+f216.stats.originalVertices+f216annex.stats.originalVertices+f217.stats.originalVertices+f218.stats.originalVertices+f219.stats.originalVertices+f220.stats.originalVertices+f221.stats.originalVertices+f223.stats.originalVertices+f224.stats.originalVertices+f225.stats.originalVertices+f226.stats.originalVertices+f227.stats.originalVertices+f228.stats.originalVertices+f249.stats.originalVertices+f252.stats.originalVertices+f257.stats.originalVertices+f259.stats.originalVertices+f261.stats.originalVertices+f274.stats.originalVertices+f297.stats.originalVertices+f306.stats.originalVertices+f308.stats.originalVertices+f299.stats.originalVertices+f314.stats.originalVertices+f318.stats.originalVertices+f316.stats.originalVertices+f320.stats.originalVertices+f350.stats.originalVertices+f352.stats.originalVertices+f369.stats.originalVertices+f371.stats.originalVertices+f001.stats.originalVertices+f231.stats.originalVertices+f030.stats.originalVertices+f024.stats.originalVertices+f005.stats.originalVertices+f006.stats.originalVertices+f007.stats.originalVertices+f008.stats.originalVertices+e6304.stats.originalVertices+e6305.stats.originalVertices+e6306.stats.originalVertices+f009.stats.originalVertices+f010.stats.originalVertices+f011.stats.originalVertices+f012.stats.originalVertices+f015.stats.originalVertices+f016.stats.originalVertices+f017.stats.originalVertices+f028.stats.originalVertices+f037.stats.originalVertices+f036.stats.originalVertices+f044.stats.originalVertices+f039d.stats.originalVertices+f039e.stats.originalVertices+f047.stats.originalVertices+f053.stats.originalVertices+f027.stats.originalVertices+f031.stats.originalVertices+f026.stats.originalVertices+f065.stats.originalVertices+f065platform.stats.originalVertices+f079.stats.originalVertices+f111.stats.originalVertices+f112.stats.originalVertices+f113.stats.originalVertices+f110.stats.originalVertices+f132.stats.originalVertices+f136.stats.originalVertices+f114.stats.originalVertices+f137.stats.originalVertices+f138.stats.originalVertices+f144.stats.originalVertices+f140.stats.originalVertices+f162.stats.originalVertices+f164.stats.originalVertices+f163.stats.originalVertices+f166.stats.originalVertices+f048.stats.originalVertices+f040h.stats.originalVertices+f049.stats.originalVertices+f052.stats.originalVertices+f051.stats.originalVertices+f054.stats.originalVertices+f055.stats.originalVertices+f056.stats.originalVertices+f057.stats.originalVertices+f059.stats.originalVertices+f060.stats.originalVertices+f062.stats.originalVertices+f067.stats.originalVertices+f070.stats.originalVertices+f071.stats.originalVertices+f072.stats.originalVertices+f083.stats.originalVertices+f035.stats.originalVertices+f133.stats.originalVertices+f118.stats.originalVertices+f142.stats.originalVertices+f076.stats.originalVertices+f130.stats.originalVertices+f167.stats.originalVertices+f173.stats.originalVertices+f165.stats.originalVertices+f023Pergola.stats.originalVertices+f071n.stats.originalVertices+f077c.stats.originalVertices+f085c.stats.originalVertices+f029.stats.originalVertices+f115.stats.originalVertices+f117.stats.originalVertices+f128r.stats.originalVertices+f115e.stats.originalVertices+f120.stats.originalVertices+f123.stats.originalVertices+f125.stats.originalVertices+f126c.stats.originalVertices+f129.stats.originalVertices+f124c.stats.originalVertices+f143.stats.originalVertices+f139.stats.originalVertices+f141c.stats.originalVertices+f161.stats.originalVertices+f151.stats.originalVertices+f168.stats.originalVertices+f169c.stats.originalVertices+f170.stats.originalVertices+f108c.stats.originalVertices+f106c.stats.originalVertices+f109.stats.originalVertices+f086c.stats.originalVertices+f089c.stats.originalVertices+f018c.stats.originalVertices+f172.stats.originalVertices+f171.stats.originalVertices+f131c.stats.originalVertices+f134.stats.originalVertices+f121c.stats.originalVertices+f122c.stats.originalVertices+f127.stats.originalVertices+f128c.stats.originalVertices+f088c.stats.originalVertices+f081c.stats.originalVertices+f105.stats.originalVertices+f084.stats.originalVertices+f116c.stats.originalVertices+f042.stats.originalVertices+f039c.stats.originalVertices+f043.stats.originalVertices+f041.stats.originalVertices+f039b.stats.originalVertices+f038.stats.originalVertices+f039.stats.originalVertices+f040.stats.originalVertices+f033.stats.originalVertices+f034.stats.originalVertices,sourceRetained:true,actualVisualAccepted:false,components:[...a.stats.components,...b.stats.components,...d.stats.components,...g.stats.components,...h.stats.components,...j.stats.components,...k.stats.components,...l.stats.components,...m.stats.components,...n.stats.components,...o.stats.components,...r.stats.components,...t.stats.components,...u.stats.components,...v.stats.components,...w.stats.components,...z.stats.components,...f157.stats.components,...f160.stats.components,...f174.stats.components,...f158.stats.components,...f178.stats.components,...f175.stats.components,...f180.stats.components,...f181.stats.components,...f176.stats.components,...f159.stats.components,...f179.stats.components,...f182.stats.components,...f177.stats.components,...f186.stats.components,...f188.stats.components,...f183.stats.components,...f184.stats.components,...f185.stats.components,...f187.stats.components,...f189.stats.components,...f191.stats.components,...f193.stats.components,...f194.stats.components,...f192.stats.components,...f197.stats.components,...f195.stats.components,...f198.stats.components,...f199.stats.components,...f200.stats.components,...f201.stats.components,...f202.stats.components,...f203.stats.components,...f193foot.stats.components,...f204.stats.components,...f205.stats.components,...f206.stats.components,...f222.stats.components,...f207.stats.components,...f208.stats.components,...f209.stats.components,...f210.stats.components,...f211.stats.components,...f212.stats.components,...f213.stats.components,...f214.stats.components,...f215.stats.components,...f216.stats.components,...f216annex.stats.components,...f217.stats.components,...f218.stats.components,...f219.stats.components,...f220.stats.components,...f221.stats.components,...f223.stats.components,...f224.stats.components,...f225.stats.components,...f226.stats.components,...f227.stats.components,...f228.stats.components,...f249.stats.components,...f252.stats.components,...f257.stats.components,...f259.stats.components,...f261.stats.components,...f274.stats.components,...f297.stats.components,...f306.stats.components,...f308.stats.components,...f299.stats.components,...f314.stats.components,...f318.stats.components,...f316.stats.components,...f320.stats.components,...f350.stats.components,...f352.stats.components,...f369.stats.components,...f371.stats.components,...f001.stats.components,...f231.stats.components,...f030.stats.components,...f024.stats.components,...f005.stats.components,...f006.stats.components,...f007.stats.components,...f008.stats.components,...e6304.stats.components,...e6305.stats.components,...e6306.stats.components,...f009.stats.components,...f010.stats.components,...f011.stats.components,...f012.stats.components,...f015.stats.components,...f016.stats.components,...f017.stats.components,...f028.stats.components,...f037.stats.components,...f036.stats.components,...f044.stats.components,...f039d.stats.components,...f039e.stats.components,...f047.stats.components,...f053.stats.components,...f027.stats.components,...f031.stats.components,...f026.stats.components,...f065.stats.components,...f065platform.stats.components,...f079.stats.components,...f111.stats.components,...f112.stats.components,...f113.stats.components,...f110.stats.components,...f132.stats.components,...f136.stats.components,...f114.stats.components,...f137.stats.components,...f138.stats.components,...f144.stats.components,...f140.stats.components,...f162.stats.components,...f164.stats.components,...f163.stats.components,...f166.stats.components,...f048.stats.components,...f040h.stats.components,...f049.stats.components,...f052.stats.components,...f051.stats.components,...f054.stats.components,...f055.stats.components,...f056.stats.components,...f057.stats.components,...f059.stats.components,...f060.stats.components,...f062.stats.components,...f067.stats.components,...f070.stats.components,...f071.stats.components,...f072.stats.components,...f083.stats.components,...f035.stats.components,...f133.stats.components,...f118.stats.components,...f142.stats.components,...f076.stats.components,...f130.stats.components,...f167.stats.components,...f173.stats.components,...f165.stats.components,...f023Pergola.stats.components,...f071n.stats.components,...f077c.stats.components,...f085c.stats.components,...f029.stats.components,...f115.stats.components,...f117.stats.components,...f128r.stats.components,...f115e.stats.components,...f120.stats.components,...f123.stats.components,...f125.stats.components,...f126c.stats.components,...f129.stats.components,...f124c.stats.components,...f143.stats.components,...f139.stats.components,...f141c.stats.components,...f161.stats.components,...f151.stats.components,...f168.stats.components,...f169c.stats.components,...f170.stats.components,...f108c.stats.components,...f106c.stats.components,...f109.stats.components,...f086c.stats.components,...f089c.stats.components,...f018c.stats.components,...f172.stats.components,...f171.stats.components,...f131c.stats.components,...f134.stats.components,...f121c.stats.components,...f122c.stats.components,...f127.stats.components,...f128c.stats.components,...f088c.stats.components,...f081c.stats.components,...f105.stats.components,...f084.stats.components,...f116c.stats.components,...f042.stats.components,...f039c.stats.components,...f043.stats.components,...f041.stats.components,...f039b.stats.components,...f038.stats.components,...f039.stats.components,...f040.stats.components,...f033.stats.components,...f034.stats.components,...co.stats.components]};
 if(a.stats.error||b.stats.error||d.stats.error||g.stats.error||h.stats.error||j.stats.error||k.stats.error||l.stats.error||m.stats.error||n.stats.error||o.stats.error||r.stats.error||t.stats.error||u.stats.error||v.stats.error||w.stats.error||z.stats.error||co.stats.error||f157.stats.error||f160.stats.error||f174.stats.error||f158.stats.error||f178.stats.error||f175.stats.error||f180.stats.error||f181.stats.error||f176.stats.error||f159.stats.error||f179.stats.error||f182.stats.error||f177.stats.error||f186.stats.error||f188.stats.error||f183.stats.error||f184.stats.error||f185.stats.error||f187.stats.error||f189.stats.error||f191.stats.error||f193.stats.error||f194.stats.error||f192.stats.error||f197.stats.error||f195.stats.error||f198.stats.error||f199.stats.error||f200.stats.error||f201.stats.error||f202.stats.error||f203.stats.error||f193foot.stats.error||f204.stats.error||f205.stats.error||f206.stats.error||f222.stats.error||f207.stats.error||f208.stats.error||f209.stats.error||f210.stats.error||f211.stats.error||f212.stats.error||f213.stats.error||f214.stats.error||f215.stats.error||f216.stats.error||f216annex.stats.error||f217.stats.error||f218.stats.error||f219.stats.error||f220.stats.error||f221.stats.error||f223.stats.error||f224.stats.error||f225.stats.error||f226.stats.error||f227.stats.error||f228.stats.error||f249.stats.error||f252.stats.error||f257.stats.error||f259.stats.error||f261.stats.error||f274.stats.error||f297.stats.error||f306.stats.error||f308.stats.error||f299.stats.error||f314.stats.error||f318.stats.error||f316.stats.error||f320.stats.error||f350.stats.error||f352.stats.error||f369.stats.error||f371.stats.error||f001.stats.error||f231.stats.error||f030.stats.error||f024.stats.error||f005.stats.error||f006.stats.error||f007.stats.error||f008.stats.error||e6304.stats.error||e6305.stats.error||e6306.stats.error||f009.stats.error||f010.stats.error||f011.stats.error||f012.stats.error||f015.stats.error||f016.stats.error||f017.stats.error||f028.stats.error||f037.stats.error||f036.stats.error||f044.stats.error||f042.stats.error||f041.stats.error||f038.stats.error||f033.stats.error||f034.stats.error||f039.stats.error||f039b.stats.error||f040.stats.error||f039c.stats.error||f043.stats.error||f039d.stats.error||f039e.stats.error||f047.stats.error||f053.stats.error||f027.stats.error||f031.stats.error||f026.stats.error||f065.stats.error||f079.stats.error||f111.stats.error||f112.stats.error||f113.stats.error||f110.stats.error||f132.stats.error||f136.stats.error||f114.stats.error||f137.stats.error||f138.stats.error||f144.stats.error||f140.stats.error||f162.stats.error||f164.stats.error||f163.stats.error||f166.stats.error||f048.stats.error||f040h.stats.error||f049.stats.error||f052.stats.error||f051.stats.error||f054.stats.error||f055.stats.error||f056.stats.error||f057.stats.error||f059.stats.error||f060.stats.error||f062.stats.error||f067.stats.error||f070.stats.error||f072.stats.error||f083.stats.error||f035.stats.error||f133.stats.error||f118.stats.error||f142.stats.error||f076.stats.error||f130.stats.error||f167.stats.error||f173.stats.error||f165.stats.error||f023Pergola.stats.error||f071n.stats.error||f077c.stats.error||f085c.stats.error||f029.stats.error||f081c.stats.error||f105.stats.error||f084.stats.error||f116c.stats.error||f115.stats.error||f117.stats.error||f128r.stats.error||f088c.stats.error||f127.stats.error||f115e.stats.error||f128c.stats.error||f120.stats.error||f123.stats.error||f122c.stats.error||f121c.stats.error||f125.stats.error||f126c.stats.error||f129.stats.error||f131c.stats.error||f134.stats.error||f124c.stats.error||f139.stats.error||f161.stats.error||f143.stats.error||f151.stats.error||f141c.stats.error||f168.stats.error||f171.stats.error||f172.stats.error||f169c.stats.error||f170.stats.error||f108c.stats.error||f106c.stats.error||f109.stats.error||f086c.stats.error||f089c.stats.error||f018c.stats.error)stats.error=[a.stats.error,b.stats.error,d.stats.error,g.stats.error,h.stats.error,j.stats.error,k.stats.error,l.stats.error,m.stats.error,n.stats.error,o.stats.error,r.stats.error,t.stats.error,u.stats.error,v.stats.error,w.stats.error,z.stats.error,co.stats.error,f157.stats.error,f160.stats.error,f174.stats.error,f158.stats.error,f178.stats.error,f175.stats.error,f180.stats.error,f181.stats.error,f176.stats.error,f159.stats.error,f179.stats.error,f182.stats.error,f177.stats.error,f186.stats.error,f188.stats.error,f183.stats.error,f184.stats.error,f185.stats.error,f187.stats.error,f189.stats.error,f191.stats.error,f193.stats.error,f194.stats.error,f192.stats.error,f197.stats.error,f195.stats.error,f198.stats.error,f199.stats.error,f200.stats.error,f201.stats.error,f202.stats.error,f203.stats.error,f193foot.stats.error,f204.stats.error,f205.stats.error,f206.stats.error,f222.stats.error,f207.stats.error,f208.stats.error,f209.stats.error,f210.stats.error,f211.stats.error,f212.stats.error,f213.stats.error,f214.stats.error,f215.stats.error,f216.stats.error,f216annex.stats.error,f217.stats.error,f218.stats.error,f219.stats.error,f220.stats.error,f221.stats.error,f223.stats.error,f224.stats.error,f225.stats.error,f226.stats.error,f227.stats.error,f228.stats.error,f249.stats.error,f252.stats.error,f257.stats.error,f259.stats.error,f261.stats.error,f274.stats.error,f297.stats.error,f306.stats.error,f308.stats.error,f299.stats.error,f314.stats.error,f318.stats.error,f316.stats.error,f320.stats.error,f350.stats.error,f352.stats.error,f369.stats.error,f371.stats.error,f001.stats.error,f231.stats.error,f030.stats.error,f024.stats.error,f005.stats.error,f006.stats.error,f007.stats.error,f008.stats.error,e6304.stats.error,e6305.stats.error,e6306.stats.error,f009.stats.error,f010.stats.error,f011.stats.error,f012.stats.error,f015.stats.error,f016.stats.error,f017.stats.error,f028.stats.error,f037.stats.error,f036.stats.error,f044.stats.error,f042.stats.error,f041.stats.error,f038.stats.error,f033.stats.error,f034.stats.error,f039.stats.error,f039b.stats.error,f040.stats.error,f039c.stats.error,f043.stats.error,f039d.stats.error,f039e.stats.error,f047.stats.error,f053.stats.error,f027.stats.error,f031.stats.error,f026.stats.error,f065.stats.error,f065platform.stats.error,f079.stats.error,f111.stats.error,f112.stats.error,f113.stats.error,f110.stats.error,f132.stats.error,f136.stats.error,f114.stats.error,f137.stats.error,f138.stats.error,f144.stats.error,f140.stats.error,f162.stats.error,f164.stats.error,f163.stats.error,f166.stats.error,f048.stats.error,f040h.stats.error,f049.stats.error,f052.stats.error,f051.stats.error,f054.stats.error,f055.stats.error,f056.stats.error,f057.stats.error,f059.stats.error,f060.stats.error,f062.stats.error,f067.stats.error,f070.stats.error,f071.stats.error,f072.stats.error,f083.stats.error,f035.stats.error,f133.stats.error,f118.stats.error,f142.stats.error,f076.stats.error,f130.stats.error,f167.stats.error,f173.stats.error,f165.stats.error,f023Pergola.stats.error,f071n.stats.error,f077c.stats.error,f085c.stats.error,f029.stats.error,f081c.stats.error,f105.stats.error,f084.stats.error,f116c.stats.error,f115.stats.error,f117.stats.error,f128r.stats.error,f088c.stats.error,f127.stats.error,f115e.stats.error,f128c.stats.error,f120.stats.error,f123.stats.error,f122c.stats.error,f121c.stats.error,f125.stats.error,f126c.stats.error,f129.stats.error,f131c.stats.error,f134.stats.error,f124c.stats.error,f139.stats.error,f161.stats.error,f143.stats.error,f151.stats.error,f141c.stats.error,f168.stats.error,f171.stats.error,f172.stats.error,f169c.stats.error,f170.stats.error,f108c.stats.error,f106c.stats.error,f109.stats.error,f086c.stats.error,f089c.stats.error,f018c.stats.error].filter(Boolean).join('; ');
 const f045ex=((yield {components:f018c.components,recipe:infillOwnerRecipeIdentity(ownerF045ExchangeReconstruction)}),ownerF045ExchangeReconstruction(f018c.components));for(const k of ['objects','vertices','triangles','originalVertices'] as const)stats[k]+=f045ex.stats[k];stats.components.push(...f045ex.stats.components);if(f045ex.stats.error)stats.error=[stats.error,f045ex.stats.error].filter(Boolean).join('; ');
 return{components:f045ex.components.filter(c=>!(c.city==='berlin'&&ownerF005Identity(c)&&!!c.displayEstimates?.F005Exterior&&c.batches.length===0)),stats,cofaceStats:co.cofaceStats};
}
function frozenOwnerReconstructionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){ownerF018BaseMaterials(components,paint,frames,scope);ownerF089BaseMaterials(components,paint,frames);ownerF086BaseMaterials(components,paint,frames);ownerF109BaseMaterials(components,paint,frames);ownerF106BaseMaterials(components,paint,frames);ownerF170BaseMaterials(components,paint,frames);ownerF172BaseMaterials(components,paint,frames);ownerF171BaseMaterials(components,paint,frames);ownerF168BaseMaterials(components,paint,frames);ownerF151BaseMaterials(components,paint,frames);ownerF143BaseMaterials(components,paint,frames);ownerF139BaseMaterials(components,paint,frames);ownerF161BaseMaterials(components,paint,frames);ownerF134BaseMaterials(components,paint,frames);ownerF131CompletionMaterials(components,paint,frames,scope);ownerF129BaseMaterials(components,paint,frames);ownerF126CompletionMaterials(components,paint,frames,scope);ownerF125BaseMaterials(components,paint,frames);ownerF122CompletionMaterials(components,paint,frames,scope);ownerF123BaseMaterials(components,paint,frames);ownerF120BaseMaterials(components,paint,frames);ownerF128CompletionMaterials(components,paint,frames,scope);ownerF127BaseMaterials(components,paint,frames);ownerF088CompletionMaterials(components,paint,frames,scope);ownerF128RoofMaterials(components,paint,frames);ownerF117BaseMaterials(components,paint,frames);ownerF115BaseMaterials(components,paint,frames);ownerF116CompletionMaterials(components,paint,frames,scope);ownerF084BaseMaterials(components,paint,frames);ownerF105BaseMaterials(components,paint,frames);ownerF081CompletionMaterials(components,paint,frames,scope);ownerF029BaseMaterials(components,paint,frames);ownerF085CompletionMaterials(components,paint,frames);ownerF077CompletionMaterials(components,paint,frames,scope);ownerF071NarzissMaterials(components,paint,frames);ownerF023PergolaBaseMaterials(components,paint,frames);ownerF073SupplementMaterials(components,paint,frames);ownerF173BaseMaterials(components,paint,frames);ownerF165BaseMaterials(components,paint,frames);ownerF032BaseMaterials(components,paint,frames);ownerF135BaseMaterials(components,paint,frames);ownerF135WestMaterials(components,paint,frames);ownerF190BaseMaterials(components,paint,frames);ownerF135GardenMaterials(components,paint,frames);ownerF196Materials(components,paint,frames);ownerF148Materials(components,paint,frames);ownerF148BaseMaterials(components,paint,frames);ownerF064BaseMaterials(components,paint,frames);ownerF078BaseMaterials(components,paint,frames);ownerF153BaseMaterials(components,paint,frames);ownerF146BaseMaterials(components,paint,frames);ownerF145BaseMaterials(components,paint,frames);ownerF147BaseMaterials(components,paint,frames);ownerF149BaseMaterials(components,paint,frames);ownerF150BaseMaterials(components,paint,frames);ownerF152BaseMaterials(components,paint,frames);ownerF152CompleteWindowMaterials(components,paint,frames);ownerF154BaseMaterials(components,paint,frames,scope);ownerF155BaseMaterials(components,paint,frames);ownerF156BaseMaterials(components,paint,frames);ownerF157BaseMaterials(components,paint,frames);ownerF160BaseMaterials(components,paint,frames);ownerF174BaseMaterials(components,paint,frames);ownerF158BaseMaterials(components,paint,frames);ownerF178BaseMaterials(components,paint,frames);ownerF175BaseMaterials(components,paint,frames);ownerF180BaseMaterials(components,paint,frames);ownerF181BaseMaterials(components,paint,frames);ownerF176BaseMaterials(components,paint,frames);ownerF159BaseMaterials(components,paint,frames);ownerF179BaseMaterials(components,paint,frames);ownerF182BaseMaterials(components,paint,frames);ownerF177BaseMaterials(components,paint,frames);ownerF186BaseMaterials(components,paint,frames);ownerF188BaseMaterials(components,paint,frames);ownerF183BaseMaterials(components,paint,frames);ownerF184BaseMaterials(components,paint,frames);ownerF185BaseMaterials(components,paint,frames);ownerF187BaseMaterials(components,paint,frames);ownerF189BaseMaterials(components,paint,frames);ownerF191BaseMaterials(components,paint,frames);ownerF193BaseMaterials(components,paint,frames);ownerF194BaseMaterials(components,paint,frames);ownerF192BaseMaterials(components,paint,frames);ownerF197BaseMaterials(components,paint,frames);ownerF195BaseMaterials(components,paint,frames);ownerF198BaseMaterials(components,paint,frames);ownerF199BaseMaterials(components,paint,frames);ownerF200BaseMaterials(components,paint,frames);ownerF201BaseMaterials(components,paint,frames);ownerF202BaseMaterials(components,paint,frames);ownerF203BaseMaterials(components,paint,frames);ownerF193FootBaseMaterials(components,paint,frames);ownerF204BaseMaterials(components,paint,frames);ownerF205BaseMaterials(components,paint,frames);ownerF206BaseMaterials(components,paint,frames);ownerF222BaseMaterials(components,paint,frames);ownerF207BaseMaterials(components,paint,frames);ownerF208BaseMaterials(components,paint,frames);ownerF209BaseMaterials(components,paint,frames);ownerF210BaseMaterials(components,paint,frames);ownerF211BaseMaterials(components,paint,frames);ownerF212BaseMaterials(components,paint,frames);ownerF213BaseMaterials(components,paint,frames);ownerF214BaseMaterials(components,paint,frames);ownerF215BaseMaterials(components,paint,frames);ownerF216BaseMaterials(components,paint,frames);ownerF216AnnexBaseMaterials(components,paint,frames);ownerF217BaseMaterials(components,paint,frames);ownerF218BaseMaterials(components,paint,frames);ownerF219BaseMaterials(components,paint,frames);ownerF220BaseMaterials(components,paint,frames);ownerF221BaseMaterials(components,paint,frames);ownerF223BaseMaterials(components,paint,frames);ownerF224BaseMaterials(components,paint,frames);ownerF225BaseMaterials(components,paint,frames);ownerF226BaseMaterials(components,paint,frames);ownerF227BaseMaterials(components,paint,frames);ownerF228BaseMaterials(components,paint,frames);ownerF249BaseMaterials(components,paint,frames);ownerF252BaseMaterials(components,paint,frames);ownerF257BaseMaterials(components,paint,frames);ownerF259BaseMaterials(components,paint,frames);ownerF261BaseMaterials(components,paint,frames);ownerF274BaseMaterials(components,paint,frames);ownerF297BaseMaterials(components,paint,frames);ownerF306BaseMaterials(components,paint,frames);ownerF308BaseMaterials(components,paint,frames);ownerF299BaseMaterials(components,paint,frames);ownerF314BaseMaterials(components,paint,frames);ownerF318BaseMaterials(components,paint,frames);ownerF316BaseMaterials(components,paint,frames);ownerF320BaseMaterials(components,paint,frames);ownerF350BaseMaterials(components,paint,frames);ownerF352BaseMaterials(components,paint,frames);ownerF369BaseMaterials(components,paint,frames);ownerF371BaseMaterials(components,paint,frames);ownerF001BaseMaterials(components,paint,frames);ownerF231BaseMaterials(components,paint,frames);ownerF030BaseMaterials(components,paint,frames);ownerF024BaseMaterials(components,paint,frames);ownerF005BaseMaterials(components,paint,frames);ownerF006BaseMaterials(components,paint,frames);ownerF007BaseMaterials(components,paint,frames);ownerF008BaseMaterials(components,paint,frames);ownerE6304BaseMaterials(components,paint,frames);ownerKUPFER6305BaseMaterials(components,paint,frames);ownerE6306BaseMaterials(components,paint,frames);ownerF010BaseMaterials(components,paint,frames);ownerF011BaseMaterials(components,paint,frames);ownerF012BaseMaterials(components,paint,frames);ownerF015BaseMaterials(components,paint,frames);ownerF016BaseMaterials(components,paint,frames);ownerF017BaseMaterials(components,paint,frames);ownerF028BaseMaterials(components,paint,frames);ownerF037BaseMaterials(components,paint,frames);ownerF036BaseMaterials(components,paint,frames);ownerF044BaseMaterials(components,paint,frames);ownerF042BaseMaterials(components,paint,frames);ownerF041BaseMaterials(components,paint,frames);ownerF038BaseMaterials(components,paint,frames);ownerF039BaseMaterials(components,paint,frames);ownerF026BaseMaterials(components,paint,frames);ownerF053BaseMaterials(components,paint,frames);ownerF039EBaseMaterials(components,paint,frames);ownerF167BaseMaterials(components,paint,frames);ownerF142BaseMaterials(components,paint,frames);ownerF076BaseMaterials(components,paint,frames);ownerF130BaseMaterials(components,paint,frames);ownerF035BaseMaterials(components,paint,frames);ownerF133BaseMaterials(components,paint,frames);ownerF118BaseMaterials(components,paint,frames);ownerF083BaseMaterials(components,paint,frames);ownerF070BaseMaterials(components,paint,frames);ownerF072BaseMaterials(components,paint,frames);ownerF071HeightBaseMaterials(components,paint,frames);ownerF067BaseMaterials(components,paint,frames);ownerF062BaseMaterials(components,paint,frames);ownerF059BaseMaterials(components,paint,frames);ownerF060BaseMaterials(components,paint,frames);ownerF057BaseMaterials(components,paint,frames);ownerF055BaseMaterials(components,paint,frames);ownerF052BaseMaterials(components,paint,frames);ownerF048BaseMaterials(components,paint,frames);ownerF047BaseMaterials(components,paint,frames);ownerF056BaseMaterials(components,paint,frames);ownerF054BaseMaterials(components,paint,frames);ownerF051BaseMaterials(components,paint,frames);ownerF049BaseMaterials(components,paint,frames);ownerF040HBaseMaterials(components,paint,frames);ownerF166BaseMaterials(components,paint,frames);ownerF163BaseMaterials(components,paint,frames);ownerF164BaseMaterials(components,paint,frames);ownerF162BaseMaterials(components,paint,frames);ownerF140BaseMaterials(components,paint,frames);ownerF144BaseMaterials(components,paint,frames);ownerF138BaseMaterials(components,paint,frames);frankfurtHbf075BaseMaterials(components,paint,frames,scope);ownerF114BaseMaterials(components,paint,frames);ownerF136BaseMaterials(components,paint,frames);ownerF132BaseMaterials(components,paint,frames);ownerF110BaseMaterials(components,paint,frames);ownerF113BaseMaterials(components,paint,frames);ownerF112BaseMaterials(components,paint,frames);ownerF111BaseMaterials(components,paint,frames);ownerF079BaseMaterials(components,paint,frames);ownerF031BaseMaterials(components,paint,frames);ownerF027BaseMaterials(components,paint,frames);ownerF065BaseMaterials(components,paint,frames);ownerF065PlatformBaseMaterials(components,paint,frames);ownerF039DBaseMaterials(components,paint,frames);ownerF039CBaseMaterials(components,paint,frames);ownerF043BaseMaterials(components,paint,frames);ownerF040BaseMaterials(components,paint,frames);ownerF039BBaseMaterials(components,paint,frames);ownerF033BaseMaterials(components,paint,frames);ownerF034BaseMaterials(components,paint,frames);ownerF009BaseMaterials(components,paint,frames);applyF348Detail181(components,paint,frames);applyF46RecoveryPaint(components,paint,frames);ownerF115ExteriorBaseMaterials(components,paint,frames);ownerF121CompletionBaseMaterials(components,paint,frames);ownerF124CompletionBaseMaterials(components,paint,frames);ownerF141CompletionBaseMaterials(components,paint,frames);ownerF169CompletionBaseMaterials(components,paint,frames);ownerF108CompletionBaseMaterials(components,paint,frames);ownerF045ExchangeBaseMaterials(components,paint,frames);}
function* ownerReconstructionStages(components:BuildingComponent[]):Generator<InfillOwnerStage,{components:BuildingComponent[];stats:OwnerReconstructionStats},void>{
 const frozen=(yield* frozenOwnerReconstructionStages(components)); let current=frozen.components;
 const stats={...frozen.stats,components:[...frozen.stats.components]};
 for(const reconstruct of [senckenbergPartDisplay076Reconstruction,katharinen149Edge075Reconstruction,domturmTicket148070Reconstruction,ecbPress072Reconstruction,hausdomOfficial070Reconstruction,main11369Display058Reconstruction,commerzbankFan066AfterParent053Reconstruction,commerzbankPodiumOfficial060Reconstruction,kaiser1820Official064Reconstruction,kaiser16Canopy067Reconstruction,weststrip253Measured067Reconstruction,globalTowerOfficial071Reconstruction,frankfurtOfficePrincipals069Reconstruction,infillJapanCenterReconstruction,infillFrankfurtJwMarriottReconstruction,infillMainTowerPodiumReconstruction,infillGallileoReconstruction,helvetiaB56Reconstruction055,infillFrankfurtBockenheimer084Reconstruction,infillFrankfurtJunghof088Reconstruction,silberturmFullReconstruction051,infillOmniturmReconstruction,marienturm050Reconstruction,infillPremierReconstruction,handelshofBalconies103Reconstruction,infillF278OriginalReconstruction,infillF288OriginalReconstruction,infillEberhardHistoricalReconstruction,infillGoethe34Reconstruction,infillFrankfurtKettenhof065Reconstruction,infillFrankfurtVCIRoof095Reconstruction,infillFrankfurtML41SignarisReconstruction,ml61Entry092Reconstruction,infillSchneider076Reconstruction,infillFrankfurtMaro80Reconstruction,infillFrankfurtMaro74Reconstruction,infillFrankfurtLowOfficeK26Reconstruction,infillFrankfurtLowOfficeBatch2Reconstruction,infillFrankfurtLowOfficeReconstruction,infillStJohannReconstruction,infillGalerieReconstruction,infillKatharinaSportsHallReconstruction,infillRabbiReconstruction,infillGrafCourtyardMeasuredReconstruction,infillGrafWestMeasuredReconstruction,infillGrafEastBridgeReconstruction,infillFrankfurtSkyperReconstruction,infillEurotowerReconstruction,infillJubilaeumssaeuleReconstruction,infillOpernturmReconstruction,infillFrankfurtSpinReconstruction,infillWinxReconstruction,infillOneReconstruction,infillBoersenplatzBlockReconstruction,infillFrankfurtWestendgateReconstruction,infillMyzeilReconstruction,infillFrankfurtNextowerReconstruction,infillFrankfurtDeutscheBankReconstruction,infillWestend1Reconstruction,infillFrankfurtTrianonReconstruction,infillFrankfurtFbcReconstruction,infillTower185Reconstruction,infillBoerseReconstruction,infillHauptwacheReconstruction,infillGrafGeissReconstruction,infillGrafRearReconstruction,infillBahndirektionReconstruction,infillKoenigsbauRepairReconstruction,infillWlbOldReconstruction,infillWlbExtensionReconstruction,infillEcbReconstruction,infillMainTriangelReconstruction,infillEssenReconstruction,infillSynagogeReconstruction,infillPhilharmonieReconstruction,infillKatharinaReconstruction,infillHmdkReconstruction,infillGustavReconstruction,infillKoenigsbauPassagenReconstruction,infillSchauspielhausReconstruction,infillFrankfurtEastReconstruction,infillFrankfurtReconstruction]){const next=((yield {components:current,recipe:infillOwnerRecipeIdentity(reconstruct)}),reconstruct(current));current=next.components;for(const key of ['objects','vertices','triangles','originalVertices'] as const)stats[key]=(stats[key]??0)+next.stats[key];stats.components.push(...next.stats.components);stats.error=stats.error||next.stats.error;}
 current=((yield {components:current,recipe:infillOwnerRecipeIdentity(infillLow009RemoveDuplicateNativeParts)}),infillLow009RemoveDuplicateNativeParts(current));
 current=((yield {components:current,recipe:infillOwnerRecipeIdentity(infillLow073RemoveDuplicateNativeParts)}),infillLow073RemoveDuplicateNativeParts(current));
 current=((yield {components:current,recipe:infillOwnerRecipeIdentity(infillMarienturm054RemoveDuplicateNativeParts)}),infillMarienturm054RemoveDuplicateNativeParts(current,scope));
 for(const reconstruct of [ecbLoopJunction077Reconstruction,ecbAncillary073Reconstruction,fra144ResidualMaterials086Reconstruction,kioskCanopy080Reconstruction,infillPreparedOwnerRecipe(((...args:any[])=>gardenAggregate086Reconstruction(args[0],scope)),infillOwnerRecipeIdentity(gardenAggregate086Reconstruction)),infillPreparedOwnerRecipe(((...args:any[])=>mainTorPortaOriginal087Reconstruction(args[0],scope)),infillOwnerRecipeIdentity(mainTorPortaOriginal087Reconstruction)),gallusanlage8Material088Reconstruction,gallusanlage8Children089Reconstruction,westhafenOriginal102Reconstruction,messeNativeChildren102Reconstruction]){const next=((yield {components:current,recipe:infillOwnerRecipeIdentity(reconstruct)}),reconstruct(current));current=next.components;for(const key of ['objects','vertices','triangles','originalVertices'] as const)stats[key]=(stats[key]??0)+next.stats[key];stats.components.push(...next.stats.components);stats.error=stats.error||next.stats.error;}
 return{components:current,stats};
}
function ownerReconstructionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array){
 frozenOwnerReconstructionBaseMaterials(components,paint,frames);
 infillF278OriginalBaseMaterials(components,paint,frames);
 infillF288OriginalBaseMaterials(components,paint,frames);
 infillEberhardHistoricalBaseMaterials(components,paint,frames);
 infillGoethe34BaseMaterials(components,paint,frames);
 infillFrankfurtKettenhof065BaseMaterials(components,paint,frames);
 infillFrankfurtBockenheimer084BaseMaterials(components,paint,frames);
 infillFrankfurtJunghof088BaseMaterials(components,paint,frames);
 infillFrankfurtVCI051BaseMaterials(components,paint,frames);
 infillFrankfurtML41SignarisBaseMaterials(components,paint,frames);
 infillFrankfurtLowOfficeBulk70BaseMaterials(components,paint,frames);
 infillC121OriginalBaseMaterials(components,paint,frames);
 infillC032OriginalBaseMaterials(components,paint,frames);
 infillC032OfficialBaseMaterials(components,paint,frames);
 infillPremierBaseMaterials(components,paint,frames);
 infillSchneider076BaseMaterials(components,paint,frames);
 infillFrankfurtMaro80BaseMaterials(components,paint,frames);
 infillFrankfurtMaro74BaseMaterials(components,paint,frames);
 infillFrankfurtLowOfficeK26BaseMaterials(components,paint,frames);
 infillFrankfurtLowOfficeBatch2BaseMaterials(components,paint,frames);
 infillFrankfurtLowOfficeBaseMaterials(components,paint,frames);
 infillStJohannBaseMaterials(components,paint,frames);
 infillGalerieBaseMaterials(components,paint,frames);
 infillKatharinaSportsHallBaseMaterials(components,paint,frames);
 infillRabbiBaseMaterials(components,paint,frames);
 infillGrafCourtyardMeasuredBaseMaterials(components,paint,frames);
 infillGrafWestMeasuredBaseMaterials(components,paint,frames);
 infillGrafEastBridgeBaseMaterials(components,paint,frames);
 infillFrankfurtSkyperBaseMaterials(components,paint,frames,scope);
 infillEurotowerBaseMaterials(components,paint,frames);
 infillJubilaeumssaeuleBaseMaterials(components,paint,frames,scope);
 infillOpernturmBaseMaterials(components,paint,frames);
 infillFrankfurtSpinBaseMaterials(components,paint,frames,scope);
 infillWinxBaseMaterials(components,paint,frames);
 infillOneBaseMaterials(components,paint,frames);
 infillBoersenplatzBlockBaseMaterials(components,paint,frames);
 infillFrankfurtWestendgateBaseMaterials(components,paint,frames,scope);
 infillMyzeilBaseMaterials(components,paint,frames);
 infillFrankfurtNextowerBaseMaterials(components,paint,frames,scope);
 infillFrankfurtDeutscheBankBaseMaterials(components,paint,frames,scope);
 infillWestend1BaseMaterials(components,paint,frames);
 infillFrankfurtTrianonBaseMaterials(components,paint,frames,scope);
 infillFrankfurtFbcBaseMaterials(components,paint,frames,scope);
 infillTower185BaseMaterials(components,paint,frames);
 infillBoerseBaseMaterials(components,paint,frames);
 infillHauptwacheBaseMaterials(components,paint,frames);
 infillGrafGeissBaseMaterials(components,paint,frames);
 infillGrafRearBaseMaterials(components,paint,frames);
 infillBahndirektionBaseMaterials(components,paint,frames);
 infillKoenigsbauRepairBaseMaterials(components,paint,frames);
 infillWlbOldBaseMaterials(components,paint,frames);
 infillWlbExtensionBaseMaterials(components,paint,frames);
 infillEcbBaseMaterials(components,paint,frames);
 infillMainTriangelBaseMaterials(components,paint,frames);
 infillEssenBaseMaterials(components,paint,frames);
 infillSynagogeBaseMaterials(components,paint,frames);
 infillPhilharmonieBaseMaterials(components,paint,frames);
 infillKatharinaBaseMaterials(components,paint,frames);
 infillHmdkBaseMaterials(components,paint,frames);
 infillGustavBaseMaterials(components,paint,frames);
 infillKoenigsbauPassagenBaseMaterials(components,paint,frames);
 infillSchauspielhausBaseMaterials(components,paint,frames);
 infillFrankfurtEastBaseMaterials(components,paint,frames,scope);
 infillFrankfurtBaseMaterials(components,paint,frames,scope);
 infillOmniturmBaseMaterials(components,paint,frames,scope);
 marienturm050BaseMaterials(components,paint,frames,scope);
 silberturmSpecificMaterials050(components,paint,frames,scope);
 infillGallileoBaseMaterials(components,paint,frames);
 commerzbankParent053BaseMaterials(components,paint,frames);
 helvetiaB56BaseMaterials055(components,paint,frames);
 infillJapanCenterBaseMaterials(components,paint,frames);
 infillFrankfurtJwMarriottBaseMaterials(components,paint,frames,scope);
 infillMainTowerPodiumBaseMaterials(components,paint,frames);
 commerzbankPodiumOfficial060BaseMaterials(components,paint,frames,scope);
 kaiser1820Official064BaseMaterials(components,paint,frames,scope);
 main11369Display058BaseMaterials(components,paint,frames,scope);
 commerzbankFan066BaseMaterials(components,paint,frames,scope);
 kaiser16Canopy067BaseMaterials(components,paint,frames);
 globalTowerOfficial071BaseMaterials(components,paint,frames,scope);
 frankfurtOfficePrincipals069BaseMaterials(components,paint,frames,scope);
 weststrip253Measured067BaseMaterials(components,paint,frames,scope);
 hausdomOfficial070BaseMaterials(components,paint,frames,scope);
 ecbPress072BaseMaterials(components,paint,frames,scope);
 domturmTicket148070BaseMaterials(components,paint,frames);
 katharinenEast149Official070BaseMaterials(components,paint,frames,scope);
 senckenbergSelected074BaseMaterials(components,paint,frames,scope);
 katharinen149Edge075BaseMaterials(components,paint,frames,scope);
 ecbLoopJunction077BaseMaterials(components,paint,frames,scope);
 applyMyzeilGridshell053(components,frames);
 frankfurtHbfLowwing082MaterialFrames(components,paint,frames,scope);
 infillFrankfurtJunghof088RoofMaterialFrames062(components,frames,scope);
 ecbEntranceAggregate073BaseMaterials(components,paint,frames,scope);
 ecbAncillary073BaseMaterials(components,paint,frames,scope);
 frankfurtGroups144146Official073BaseMaterials(components,paint,frames,scope);
 katharinen149Facades078MaterialFrames(components,paint,frames,scope);
 kioskCanopy080BaseMaterials(components,paint,frames,scope);
 kioskGlazing084BaseMaterials(components,paint,frames,scope);
 fra144ResidualMaterials086MaterialFrames(components,paint,frames,scope);
 fra145Return087MaterialFrames(components,paint,frames,scope);
 mainTorPortaOriginal087BaseMaterials(components,paint,frames,scope);
 gardenUpperPhoto087BaseMaterials(components,paint,frames,scope);
 gallusanlage8Material088BaseMaterials(components,paint,frames);
 gallusanlage8Children089BaseMaterials(components,paint,frames,scope);
 ml61Entry092MaterialFrames(components,paint,frames,scope);
 infillFrankfurtVCIRoof095MaterialFrames(components,paint,frames,scope);
 westhafenOriginal102BaseMaterials(components,paint,frames);
 messeNativeChildren102BaseMaterials(components,paint,frames,scope);
 handelshofBalconies103BaseMaterials(components,paint,frames,scope);
 frankfurtLowOfficeStop100BaseMaterials(components,paint,frames);
}
function ownerReconstructionComponents(components:BuildingComponent[]){const stages=ownerReconstructionStages(components);let next=stages.next();while(!next.done)next=stages.next();return next.value;}
function* ownerMaterialPreparationStages(components:BuildingComponent[]):Generator<InfillOwnerStage,void,void>{
yield {components,recipe:infillOwnerRecipeIdentity(ownerF018BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF089BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF086BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF109BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF106BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF170BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF172BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF171BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF168BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF151BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF143BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF139BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF161BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF134BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF131CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF129BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF126CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF125BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF122CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF123BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF120BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF128CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF127BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF088CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF128RoofMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF117BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF115BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF116CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF084BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF105BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF081CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF029BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF085CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF077CompletionMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF071NarzissMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF023PergolaBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF073SupplementMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF173BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF165BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF032BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF135BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF135WestMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF190BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF135GardenMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF196Materials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF148Materials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF148BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF064BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF078BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF153BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF146BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF145BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF147BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF149BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF150BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF152BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF152CompleteWindowMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF154BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF155BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF156BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF157BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF160BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF174BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF158BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF178BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF175BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF180BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF181BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF176BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF159BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF179BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF182BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF177BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF186BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF188BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF183BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF184BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF185BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF187BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF189BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF191BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF193BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF194BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF192BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF197BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF195BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF198BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF199BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF200BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF201BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF202BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF203BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF193FootBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF204BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF205BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF206BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF222BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF207BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF208BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF209BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF210BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF211BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF212BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF213BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF214BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF215BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF216BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF216AnnexBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF217BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF218BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF219BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF220BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF221BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF223BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF224BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF225BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF226BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF227BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF228BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF249BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF252BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF257BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF259BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF261BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF274BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF297BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF306BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF308BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF299BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF314BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF318BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF316BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF320BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF350BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF352BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF369BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF371BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF001BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF231BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF030BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF024BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF005BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF006BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF007BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF008BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerE6304BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerKUPFER6305BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerE6306BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF010BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF011BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF012BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF015BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF016BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF017BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF028BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF037BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF036BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF044BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF042BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF041BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF038BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF039BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF026BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF053BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF039EBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF167BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF142BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF076BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF130BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF035BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF133BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF118BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF083BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF070BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF072BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF071HeightBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF067BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF062BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF059BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF060BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF057BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF055BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF052BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF048BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF047BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF056BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF054BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF051BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF049BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF040HBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF166BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF163BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF164BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF162BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF140BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF144BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF138BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(frankfurtHbf075BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF114BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF136BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF132BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF110BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF113BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF112BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF111BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF079BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF031BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF027BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF065BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF065PlatformBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF039DBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF039CBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF043BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF040BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF039BBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF033BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF034BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF009BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(applyF348Detail181)};
yield {components,recipe:infillOwnerRecipeIdentity(applyF46RecoveryPaint)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF115ExteriorBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF121CompletionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF124CompletionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF141CompletionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF169CompletionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF108CompletionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ownerF045ExchangeBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillF278OriginalBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillF288OriginalBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillEberhardHistoricalBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGoethe34BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtKettenhof065BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtBockenheimer084BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtJunghof088BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtVCI051BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtML41SignarisBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtLowOfficeBulk70BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillC121OriginalBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillC032OriginalBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillC032OfficialBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillPremierBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillSchneider076BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtMaro80BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtMaro74BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtLowOfficeK26BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtLowOfficeBatch2BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtLowOfficeBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillStJohannBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGalerieBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillKatharinaSportsHallBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillRabbiBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGrafCourtyardMeasuredBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGrafWestMeasuredBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGrafEastBridgeBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtSkyperBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillEurotowerBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillJubilaeumssaeuleBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillOpernturmBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtSpinBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillWinxBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillOneBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillBoersenplatzBlockBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtWestendgateBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillMyzeilBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtNextowerBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtDeutscheBankBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillWestend1BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtTrianonBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtFbcBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillTower185BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillBoerseBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillHauptwacheBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGrafGeissBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGrafRearBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillBahndirektionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillKoenigsbauRepairBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillWlbOldBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillWlbExtensionBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillEcbBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillMainTriangelBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillEssenBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillSynagogeBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillPhilharmonieBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillKatharinaBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillHmdkBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGustavBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillKoenigsbauPassagenBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillSchauspielhausBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtEastBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillOmniturmBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(marienturm050BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(silberturmSpecificMaterials050)};
yield {components,recipe:infillOwnerRecipeIdentity(infillGallileoBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(commerzbankParent053BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(helvetiaB56BaseMaterials055)};
yield {components,recipe:infillOwnerRecipeIdentity(infillJapanCenterBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtJwMarriottBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(infillMainTowerPodiumBaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(commerzbankPodiumOfficial060BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(kaiser1820Official064BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(main11369Display058BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(commerzbankFan066BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(kaiser16Canopy067BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(globalTowerOfficial071BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(frankfurtOfficePrincipals069BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(weststrip253Measured067BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(hausdomOfficial070BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ecbPress072BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(domturmTicket148070BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(katharinenEast149Official070BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(senckenbergSelected074BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(katharinen149Edge075BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ecbLoopJunction077BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(applyMyzeilGridshell053)};
yield {components,recipe:infillOwnerRecipeIdentity(frankfurtHbfLowwing082MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtJunghof088RoofMaterialFrames062)};
yield {components,recipe:infillOwnerRecipeIdentity(ecbEntranceAggregate073BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ecbAncillary073BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(frankfurtGroups144146Official073BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(katharinen149Facades078MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(kioskCanopy080BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(kioskGlazing084BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(fra144ResidualMaterials086MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(fra145Return087MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(mainTorPortaOriginal087BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(gardenUpperPhoto087BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(gallusanlage8Material088BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(gallusanlage8Children089BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(ml61Entry092MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(infillFrankfurtVCIRoof095MaterialFrames)};
yield {components,recipe:infillOwnerRecipeIdentity(westhafenOriginal102BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(messeNativeChildren102BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(handelshofBalconies103BaseMaterials)};
yield {components,recipe:infillOwnerRecipeIdentity(frankfurtLowOfficeStop100BaseMaterials)};
}


return {ownerReconstructionIdentity,ownerReconstructionComponents,ownerReconstructionBaseMaterials,ownerReconstructionStages,ownerMaterialPreparationStages};
});}
export function ownerReconstructionIdentity(...args:[...Parameters<ReturnType<typeof getInfillData>['ownerReconstructionIdentity']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).ownerReconstructionIdentity(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['ownerReconstructionIdentity']>);}
export function ownerReconstructionComponents(...args:[...Parameters<ReturnType<typeof getInfillData>['ownerReconstructionComponents']>,scope?:FrozenDataScope]){const scope=args[1] as FrozenDataScope|undefined;return getInfillData(scope).ownerReconstructionComponents(...args.slice(0,1) as Parameters<ReturnType<typeof getInfillData>['ownerReconstructionComponents']>);}
export function ownerReconstructionBaseMaterials(...args:[...Parameters<ReturnType<typeof getInfillData>['ownerReconstructionBaseMaterials']>,scope?:FrozenDataScope]){const scope=args[3] as FrozenDataScope|undefined;return getInfillData(scope).ownerReconstructionBaseMaterials(...args.slice(0,3) as Parameters<ReturnType<typeof getInfillData>['ownerReconstructionBaseMaterials']>);}
export const infillDataFunctionArities={"prepareOwnerReconstructionComponents":3,"prepareOwnerReconstructionMaterials":3,"ownerReconstructionIdentity":1,"ownerReconstructionComponents":1,"ownerReconstructionBaseMaterials":3} as const;

export const infillDataDependencies=():readonly InfillDataModule[]=>[infillOwnerModule0,infillOwnerModule1,infillOwnerModule2,infillOwnerModule3,infillOwnerModule4,infillOwnerModule5,infillOwnerModule6,infillOwnerModule7,infillOwnerModule8,infillOwnerModule9,infillOwnerModule10,infillOwnerModule11,infillOwnerModule12,infillOwnerModule13,infillOwnerModule14,infillOwnerModule15,infillOwnerModule16,infillOwnerModule17,infillOwnerModule18,infillOwnerModule19,infillOwnerModule20,infillOwnerModule21,infillOwnerModule22,infillOwnerModule23,infillOwnerModule24,infillOwnerModule25,infillOwnerModule26,infillOwnerModule27,infillOwnerModule28,infillOwnerModule29,infillOwnerModule30,infillOwnerModule31,infillOwnerModule32,infillOwnerModule33,infillOwnerModule34,infillOwnerModule35,infillOwnerModule36,infillOwnerModule37,infillOwnerModule38,infillOwnerModule39,infillOwnerModule40,infillOwnerModule41,infillOwnerModule42,infillOwnerModule43,infillOwnerModule44,infillOwnerModule45,infillOwnerModule46,infillOwnerModule47,infillOwnerModule48,infillOwnerModule49,infillOwnerModule50,infillOwnerModule51,infillOwnerModule52,infillOwnerModule53,infillOwnerModule54,infillOwnerModule55,infillOwnerModule56,infillOwnerModule57,infillOwnerModule58,infillOwnerModule59,infillOwnerModule60,infillOwnerModule61,infillOwnerModule62,infillOwnerModule63,infillOwnerModule64,infillOwnerModule65,infillOwnerModule66,infillOwnerModule67,infillOwnerModule68,infillOwnerModule69,infillOwnerModule70,infillOwnerModule71,infillOwnerModule72,infillOwnerModule73,infillOwnerModule74,infillOwnerModule75,infillOwnerModule76,infillOwnerModule77,infillOwnerModule78,infillOwnerModule79,infillOwnerModule80,infillOwnerModule81,infillOwnerModule82,infillOwnerModule83,infillOwnerModule84,infillOwnerModule85,infillOwnerModule86,infillOwnerModule87,infillOwnerModule88,infillOwnerModule89,infillOwnerModule90,infillOwnerModule91,infillOwnerModule92,infillOwnerModule93,infillOwnerModule94,infillOwnerModule95,infillOwnerModule96,infillOwnerModule97,infillOwnerModule98,infillOwnerModule99,infillOwnerModule100,infillOwnerModule101,infillOwnerModule102,infillOwnerModule103,infillOwnerModule104,infillOwnerModule105,infillOwnerModule106,infillOwnerModule107,infillOwnerModule108,infillOwnerModule109,infillOwnerModule110,infillOwnerModule111,infillOwnerModule112,infillOwnerModule113,infillOwnerModule114,infillOwnerModule115,infillOwnerModule116,infillNonBerlinOwnerRegistry,infillOwnerModule118,infillOwnerModule120,infillOwnerModule121,infillOwnerModule123,infillOwnerModule128,infillOwnerModule129,infillOwnerModule130,infillOwnerModule132,infillOwnerModule139,infillOwnerModule140,infillOwnerModule142,infillOwnerModule150,infillOwnerModule152,infillOwnerModule163,infillOwnerModule164,infillOwnerModule171,infillOwnerModule177,infillOwnerModule178,infillOwnerModule179,infillOwnerModule180,infillOwnerModule181,infillOwnerModule182,infillOwnerModule183,infillOwnerModule184,infillOwnerModule185,infillOwnerModule186,infillOwnerModule187,infillOwnerModule188,infillOwnerModule189,infillOwnerModule190,infillOwnerModule191,infillOwnerModule192,infillOwnerModule193,infillOwnerModule194,infillOwnerModule195,infillOwnerModule196,infillOwnerModule197,infillOwnerModule205,infillOwnerModule210,infillOwnerModule211,infillOwnerModule212,infillOwnerModule213,infillOwnerModule215,infillOwnerModule217,infillOwnerModule225,infillOwnerModule226,infillOwnerModule227,infillOwnerModule230,infillOwnerModule233,infillOwnerModule234,infillOwnerModule235,infillOwnerModule236,infillOwnerModule237,infillOwnerModule238,infillOwnerModule239,infillOwnerModule240,infillOwnerModule241,infillOwnerModule242,infillOwnerModule243,infillOwnerModule244,infillOwnerModule245,infillOwnerModule246,infillOwnerModule247,infillOwnerModule248,infillOwnerModule249,infillOwnerModule250,infillOwnerModule251,infillOwnerModule252,infillOwnerModule253,infillOwnerModule254,infillOwnerModule255,infillOwnerModule256,infillOwnerModule257,infillOwnerModule258,infillOwnerModule259,infillOwnerModule260,infillOwnerModule261,infillOwnerModule262,infillOwnerModule263,infillOwnerModule264,infillOwnerModule265,infillOwnerModule266,infillOwnerModule267,infillOwnerModule268,infillOwnerModule269,infillOwnerModule270,infillOwnerModule271,infillOwnerModule272,infillOwnerModule273,infillOwnerModule274,infillOwnerModule275,infillOwnerModule276,infillOwnerModule277,infillOwnerModule278,infillOwnerModule279,infillOwnerModule280,infillOwnerModule281,infillOwnerModule282,infillOwnerModule283,infillOwnerModule284,infillOwnerModule285,infillOwnerModule286,infillOwnerModule287,infillOwnerModule288,infillOwnerModule289,infillOwnerModule290,infillOwnerModule291,infillOwnerModule292,infillOwnerModule293,infillOwnerModule294,infillOwnerModule295,infillOwnerModule296,infillOwnerModule297,infillOwnerModule298,infillOwnerModule299,infillOwnerModule300,infillOwnerModule301,infillOwnerModule302,infillOwnerModule303,infillOwnerModule304,infillOwnerModule305,infillOwnerModule306,infillOwnerModule308,infillOwnerModule309,infillOwnerModule311,infillOwnerModule312,infillOwnerModule314,infillOwnerModule315,infillOwnerModule316,infillOwnerModule318,infillOwnerModule319,infillOwnerModule321,infillOwnerModule323,infillOwnerModule325,infillOwnerModule327,infillOwnerModule328,infillOwnerModule330,infillOwnerModule332,infillOwnerModule334,infillOwnerModule335,infillOwnerModule336,infillOwnerModule337,infillOwnerModule339,infillOwnerModule340,infillOwnerModule341];
type InfillOwnerInitializationWait=<T>(operation:Promise<T>)=>Promise<T>;
const infillOwnerStageWrappers=[infillOwnerModule187,infillOwnerModule189,infillOwnerModule193,infillOwnerModule192,infillOwnerModule191,infillOwnerModule190,infillOwnerModule186,infillOwnerModule184,infillOwnerModule182,infillOwnerModule181,infillOwnerModule180,infillOwnerModule171,infillOwnerModule129,infillOwnerModule116,infillOwnerModule195,infillOwnerModule130,infillOwnerModule121,infillOwnerModule120,infillOwnerModule164,infillOwnerModule177,infillOwnerModule178,infillOwnerModule128,infillOwnerModule340,infillOwnerModule115,infillOwnerModule336,infillOwnerModule325,infillOwnerModule142,infillOwnerModule330,infillOwnerModule299,infillOwnerModule334,infillOwnerModule257,infillOwnerModule253,infillOwnerModule237,infillOwnerModule227,infillOwnerModule234];
/** One parallel wave importing the lazy originals these rows need (no data, no
 * scope), registry routes and stage wrappers alike, under one observed wait;
 * undefined, without a wait, when none is missing. The calls stay optional for
 * fixtures that stub a module by its named bindings only. */
function infillOwnerRouteModules(components:readonly BuildingComponent[],signal:AbortSignal,wait?:InfillOwnerInitializationWait):Promise<void>|undefined{
 signal.throwIfAborted();const loading:Promise<void>[]=[],registry=infillNonBerlinOwnerRegistry.startNonBerlinOwnerRouteModules?.(components,signal);if(registry)loading.push(registry);
 for(const wrapper of infillOwnerStageWrappers){const operation=wrapper.startRoot500OwnerModule?.(components,signal);if(operation)loading.push(operation);}
 if(!loading.length)return undefined;
 const all=Promise.all(loading).then(()=>undefined);void all.catch(()=>undefined);
 return wait?wait(all):all;
}
/** Module-only preparation (no data, no scope) for a caller that holds no batch
 * reservation yet, as the canonical aggregate's export of the same name: the
 * renderer can finish this wave before it builds its FrozenDataScope, so the
 * stage preparation that follows finds every original these rows need loaded
 * and imports nothing while it holds a lease. Rows that only appear after
 * source recovery still load at their own stage (fallback). */
export async function prepareOwnerReconstructionModules(components:readonly BuildingComponent[],signal:AbortSignal,wait?:InfillOwnerInitializationWait){
 signal.throwIfAborted();const modules=infillOwnerRouteModules(components,signal,wait);if(modules)await modules;signal.throwIfAborted();
}
/** Prepare each original recipe against the exact preceding recipe output. */
export async function prepareOwnerReconstructionComponents(components:BuildingComponent[],signal:AbortSignal,wait?:InfillOwnerInitializationWait,scope?:FrozenDataScope){
 if(!scope)throw Error('Infill owner preparation requires a FrozenDataScope');signal.throwIfAborted();
 // All lazy originals these rows need first, in one wave; a stage input that still needs an unloaded original loads it at that stage.
 const modules=infillOwnerRouteModules(components,signal,wait);if(modules){await modules;signal.throwIfAborted();}
 const stages=getInfillData(scope).ownerReconstructionStages(components);let next=stages.next();
 // A synchronous session refusal must not leave a stage operation unobserved.
 while(!next.done){const operation=prepareInfillOwnerFunction(next.value.recipe,next.value.components,signal,scope,infillDataDependencies);void operation.catch(()=>undefined);await(wait?wait(operation):operation);signal.throwIfAborted();next=stages.next();}
 return next.value;
}
/** Match the original material/frame ordering without running material writes. */
export async function prepareOwnerReconstructionMaterials(components:BuildingComponent[],signal:AbortSignal,wait?:InfillOwnerInitializationWait,scope?:FrozenDataScope){
 if(!scope)throw Error('Infill owner material preparation requires a FrozenDataScope');signal.throwIfAborted();
 const modules=infillOwnerRouteModules(components,signal,wait);if(modules){await modules;signal.throwIfAborted();}
 for(const stage of getInfillData(scope).ownerMaterialPreparationStages(components)){const operation=prepareInfillOwnerFunction(stage.recipe,stage.components,signal,scope,infillDataDependencies);void operation.catch(()=>undefined);await(wait?wait(operation):operation);signal.throwIfAborted();}
}

/** Final resident hand-off only. These opt-in descriptors exclude persistent
 * material/frame state and its private ownership maps. */
export function retireOwnerReconstructionConstruction(scope:FrozenDataScope):void{
 retireF154ReconstructionConstruction(scope);
 const visited=new Set<InfillDataModule>(),refs=new Map<string,(typeof infillDataRefs)[number]>(),memoKeys=new Set<object>();
 const visit=(module:InfillDataModule):void=>{
  if(visited.has(module))return;visited.add(module);
  const retirement=module.infillDataConstructionRetirement;
  if(retirement){for(const ref of retirement.refs)refs.set(JSON.stringify([ref.canonicalSHA256,ref.file,ref.occurrence,ref.codec]),ref);for(const key of retirement.memoKeys)memoKeys.add(key);}
  for(const dependency of module.infillDataDependencies?.()??[])visit(dependency);
 };
 for(const module of infillDataDependencies())visit(module);
 scope.retirePrepared([...refs.values()],[...memoKeys,...f259NumericMemoKeys,...f261NumericMemoKeys,...f274NumericMemoKeys]);
}
