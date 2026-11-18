import {bremenRecipeDemand,bremenDemandSourceAuthority,bremenExtra4OwnerTargets,withBremenRecipeDemand} from './bremen-recipe-demand';
import {EDGE70_RESOURCE} from './bremen-ag70-metadata';
import type {FrozenDataScope} from '../../../safety/frozen-data-scope';
import {bremenScopedCall,prepareBremenFunctions} from './bremen-recipe-stages';
import {ownerReconstructionIdentity as frozenOwnerReconstructionIdentity,ownerReconstructionComponents as frozenOwnerReconstructionComponents,ownerReconstructionBaseMaterials as frozenOwnerReconstructionBaseMaterials,prepareOwnerReconstructionComponents as prepareFrozenOwnerReconstructionComponents} from '../../root500/safety/owner-reconstruction';
import type {OwnerInitializationWait} from '../../root500/safety/lazy-owner-route';
import{lloydFrontCarrierIdentity,lloydFrontFinalReconstruction,lloydFrontFinalBaseMaterials}from'./lloyd-front-runtime';
import{marketCapMaterialIdentity,marketCapMaterialRepaint,marketCapMaterialBaseMaterials}from'./market-cap-runtime';
import{getBREMEN_OLDTOWN70_DATA as getMARKET_AUTH013}from'./oldtown70-data';
import{organistenIdentity,organistenFinalReconstruction,organistenFinalBaseMaterials}from'./organisten-runtime';
import{glockeKuesterIdentity,glockeKuesterOwnershipReconstruction,glockeKuesterOwnershipBaseMaterials}from'./glocke-kuester-runtime';
import{teerhofDetailReconstruction,teerhofDetailBaseMaterials}from'./bremen-teerhof-detail-runtime';
import{euroGableReframe,euroGableBaseMaterials}from'./euro-gable-runtime';
import{officialOpeningsReframe,officialOpeningsBaseMaterials}from'./official-openings-runtime';
import{utilityOfficialDetail70BaseMaterials}from'./utility-official-materials';
import{stephaniRowBoundaryReframe,stephaniRowBoundaryBaseMaterials}from'./stephani-row-runtime';
import{office7a70BaseMaterials,office7aContourReconstruction}from'./office7a70-materials';
import{hbfCourtMaterialReframe,hbfCourtMaterialBaseMaterials}from'./hbf-court-runtime';
import{boundary70Identity,boundary70Reconstruction,boundary70BaseMaterials}from'./bremen-boundary70-runtime';
import{edgeCoverageIdentity,edgeCoverageReconstruction,edgeCoverageBaseMaterials}from'./edge-coverage-runtime';
import{utility70Identity,utility70Reconstruction,utility70BaseMaterials}from'./bremen-utility70-runtime';
import{wsBackDetailReframe,wsBackDetailBaseMaterials}from'./ws-back-detail-runtime';
import{bremenGlockeDetailIdentity,bremenGlockeDetailReconstruction,bremenGlockeDetailBaseMaterials}from'./glocke-detail-runtime';
import {bremenEdgefill70Identity,bremenEdgefill70Reconstruction,bremenEdgefill70BaseMaterials} from './edgefill70-runtime';
import {edgeDb70Identity,edgeDb70Reconstruction,edgeDb70BaseMaterials} from './bremen-db70-runtime';
import {edgeAg70Identity,edgeAg70BaseMaterials} from './bremen-ag70-runtime';
import type {BremenOwnerRuntime} from './bremen-owner-runtime';
import {school70Identity,school70Reconstruction,school70BaseMaterials} from './bremen-school70-runtime';
import {karstadt70Identity,karstadt70Reconstruction,karstadt70BaseMaterials} from './bremen-karstadt70-runtime';
import {infillBremenOldtownChurchesIdentity,infillBremenOldtownChurchesReconstruction,infillBremenOldtownChurchesBaseMaterials} from './bremen-churches70-runtime';
import {ws70Identity,ws70Reconstruction,ws70BaseMaterials} from './bremen-ws70-runtime';
import {bremenFlemings70Identity,bremenFlemings70Reconstruction,bremenFlemings70BaseMaterials} from './flemings70-runtime';
import {bremenRadstation70Identity,bremenRadstation70Reconstruction,bremenRadstation70BaseMaterials} from './radstation70-runtime';
import {infillBremenOldtownRepairsIdentity,infillBremenOldtownRepairsReconstruction,infillBremenOldtownRepairsBaseMaterials} from './bremen-oldtown-repairs-runtime';
import {infillBremenOldtownExtra4Identity,infillBremenOldtownExtra4Reconstruction,infillBremenOldtownExtra4BaseMaterials} from './bremen-oldtown-extra4-runtime';
import {bremenWasserturm70Identity,bremenWasserturm70Reconstruction,bremenWasserturm70BaseMaterials} from './wasserturm70-runtime';
import {bremenQuartier670Identity,bremenQuartier670Reconstruction,bremenQuartier670BaseMaterials} from './quartier670-runtime';
import {europahafenkopf70Identity,europahafenkopf70Reconstruction,europahafenkopf70BaseMaterials} from './bremen-europahafenkopf70-runtime';
import {bremenKunsthalle70Identity,bremenKunsthalle70Reconstruction,bremenKunsthalle70BaseMaterials} from './kunsthalle70-runtime';
import {infillBremenOldtown70Identity,infillBremenOldtown70Reconstruction,infillBremenOldtown70BaseMaterials} from './bremen-oldtown70-runtime';
import {silberturmFullReconstruction051,infillSilberturmIdentity} from './infill-silberturm-full051-reconstruction';
import {silberturmSpecificMaterials050} from './infill-silberturm-full051-materials';
import {infillOmniturmIdentity,infillOmniturmReconstruction,infillOmniturmBaseMaterials} from './infill-omniturm';
import {marienturm050Identity,marienturm050Reconstruction,marienturm050BaseMaterials} from './marienturm-specific';
import {infillLow073RemoveDuplicateNativeParts} from './infill-low073-duplicate-native-parts';
import {infillLow009RemoveDuplicateNativeParts} from './infill-low009-duplicate-native-parts';
import {infillPremierIdentity,infillPremierReconstruction,infillPremierBaseMaterials} from './premier-runtime';
import {infillC032OriginalIdentity,infillC032OriginalBaseMaterials} from './infill-c032-original-runtime';
import {infillC032OfficialIdentity,infillC032OfficialReconstruction,infillC032OfficialBaseMaterials} from './infill-c032-official-runtime';
import {infillFrankfurtJunghof088Identity,infillFrankfurtJunghof088BaseMaterials} from './infill-frankfurt-junghof088';
import {infillFrankfurtBockenheimer084Identity,infillFrankfurtBockenheimer084BaseMaterials} from './infill-frankfurt-bockenheimer084';
import {infillF278OriginalIdentity,infillF278OriginalReconstruction,infillF278OriginalBaseMaterials} from './infill-f278-original';
import {infillF288OriginalIdentity,infillF288OriginalReconstruction,infillF288OriginalBaseMaterials} from './infill-f288-original';
import {infillEberhardHistoricalIdentity,infillEberhardHistoricalReconstruction,infillEberhardHistoricalBaseMaterials} from './infill-stuttgart-eberhard-historical';
import {infillGoethe34Identity,infillGoethe34Reconstruction,infillGoethe34BaseMaterials} from './infill-goethe34';
import {infillFrankfurtKettenhof065Identity,infillFrankfurtKettenhof065Reconstruction,infillFrankfurtKettenhof065BaseMaterials} from './infill-frankfurt-kettenhof065';
import {infillFrankfurtVCI051Identity,infillFrankfurtVCI051Reconstruction,infillFrankfurtVCI051BaseMaterials} from './infill-frankfurt-vci051';
import {infillFrankfurtML41SignarisIdentity,infillFrankfurtML41SignarisReconstruction,infillFrankfurtML41SignarisBaseMaterials} from './infill-frankfurt-ml41-signaris';
import {infillFrankfurtLowOfficeBulk70Identity,infillFrankfurtLowOfficeBulk70Reconstruction,infillFrankfurtLowOfficeBulk70BaseMaterials} from './infill-frankfurt-low-office-bulk70';
export {prepareInfillFrankfurtLowOfficeBulk70Reconstruction} from './infill-frankfurt-low-office-bulk70';
export {prepareNonBerlinOwnerRoutes} from '../../root500/safety/owner-nonberlin-lazy';
import {infillC121OriginalBaseMaterials} from './infill-c121-original-runtime';
import {infillSchneider076Identity,infillSchneider076Reconstruction,infillSchneider076BaseMaterials} from './infill-schneider076';
import {infillFrankfurtMaro80Identity,infillFrankfurtMaro80Reconstruction,infillFrankfurtMaro80BaseMaterials} from './infill-frankfurt-maro80';
import {infillFrankfurtMaro74Identity,infillFrankfurtMaro74Reconstruction,infillFrankfurtMaro74BaseMaterials} from './infill-frankfurt-maro74';
import {infillFrankfurtLowOfficeK26Identity,infillFrankfurtLowOfficeK26Reconstruction,infillFrankfurtLowOfficeK26BaseMaterials} from './infill-frankfurt-low-office-k26';
import {infillFrankfurtLowOfficeBatch2Identity,infillFrankfurtLowOfficeBatch2Reconstruction,infillFrankfurtLowOfficeBatch2BaseMaterials} from './infill-frankfurt-low-office-batch2';
import {infillFrankfurtLowOfficeIdentity,infillFrankfurtLowOfficeReconstruction,infillFrankfurtLowOfficeBaseMaterials} from './infill-frankfurt-low-office';
import {infillStJohannIdentity,infillStJohannReconstruction,infillStJohannBaseMaterials} from './infill-essen-st-johann';
import {infillGalerieIdentity,infillGalerieReconstruction,infillGalerieBaseMaterials} from './infill-essen-rathaus-galerie';
import {infillKatharinaSportsHallIdentity,infillKatharinaSportsHallReconstruction,infillKatharinaSportsHallBaseMaterials} from './infill-stuttgart-katharina-sports-hall';
import {infillRabbiIdentity,infillRabbiReconstruction,infillRabbiBaseMaterials} from './infill-essen-rabbinerhaus';
import {infillGrafEastBridgeIdentity,infillGrafEastBridgeReconstruction,infillGrafEastBridgeBaseMaterials} from './infill-stuttgart-graf-east-bridge';
import {infillGrafCourtyardMeasuredIdentity,infillGrafCourtyardMeasuredReconstruction,infillGrafCourtyardMeasuredBaseMaterials} from './infill-stuttgart-graf-courtyard-measured';
import {infillGrafWestMeasuredIdentity,infillGrafWestMeasuredReconstruction,infillGrafWestMeasuredBaseMaterials} from './infill-stuttgart-graf-west-measured';
import {infillFrankfurtSkyperIdentity,infillFrankfurtSkyperReconstruction,infillFrankfurtSkyperBaseMaterials} from './infill-frankfurt-skyper';
import {infillEurotowerIdentity,infillEurotowerReconstruction,infillEurotowerBaseMaterials} from './infill-frankfurt-eurotower';
import {infillJubilaeumssaeuleIdentity,infillJubilaeumssaeuleReconstruction,infillJubilaeumssaeuleBaseMaterials} from './infill-stuttgart-jubilaeumssaeule';
import {infillOpernturmIdentity,infillOpernturmReconstruction,infillOpernturmBaseMaterials} from './infill-frankfurt-opernturm';
import {infillFrankfurtSpinIdentity,infillFrankfurtSpinReconstruction,infillFrankfurtSpinBaseMaterials} from './infill-frankfurt-spin';
import {infillWinxIdentity,infillWinxReconstruction,infillWinxBaseMaterials} from './infill-frankfurt-winx';
import {infillOneIdentity,infillOneReconstruction,infillOneBaseMaterials} from './infill-frankfurt-one';
import {infillBoersenplatzBlockIdentity,infillBoersenplatzBlockReconstruction,infillBoersenplatzBlockBaseMaterials} from './infill-frankfurt-boersenplatz-block';
import {infillFrankfurtWestendgateIdentity,infillFrankfurtWestendgateReconstruction,infillFrankfurtWestendgateBaseMaterials} from './infill-frankfurt-westendgate';
import {infillMyzeilIdentity,infillMyzeilReconstruction,infillMyzeilBaseMaterials} from './infill-frankfurt-myzeil';
import {infillFrankfurtNextowerIdentity,infillFrankfurtNextowerReconstruction,infillFrankfurtNextowerBaseMaterials} from './infill-frankfurt-nextower';
import {infillFrankfurtDeutscheBankIdentity,infillFrankfurtDeutscheBankReconstruction,infillFrankfurtDeutscheBankBaseMaterials} from './infill-frankfurt-deutsche-bank';
import {infillWestend1Identity,infillWestend1Reconstruction,infillWestend1BaseMaterials} from './infill-frankfurt-westend1';
import {infillFrankfurtTrianonIdentity,infillFrankfurtTrianonReconstruction,infillFrankfurtTrianonBaseMaterials} from './infill-frankfurt-trianon';
import {infillFrankfurtFbcIdentity,infillFrankfurtFbcReconstruction,infillFrankfurtFbcBaseMaterials} from './infill-frankfurt-fbc';
import {infillTower185Identity,infillTower185Reconstruction,infillTower185BaseMaterials} from './infill-frankfurt-tower185';
import {infillBoerseIdentity,infillBoerseReconstruction,infillBoerseBaseMaterials} from './infill-frankfurt-boerse';
import {infillHauptwacheIdentity,infillHauptwacheReconstruction,infillHauptwacheBaseMaterials} from './infill-frankfurt-hauptwache';
import {infillGrafGeissIdentity,infillGrafGeissReconstruction,infillGrafGeissBaseMaterials} from './infill-stuttgart-graf-geiss';
import {infillGrafRearIdentity,infillGrafRearReconstruction,infillGrafRearBaseMaterials} from './infill-stuttgart-graf-rear';
import {infillBahndirektionIdentity,infillBahndirektionReconstruction,infillBahndirektionBaseMaterials} from './infill-stuttgart-bahndirektion';
import {infillKoenigsbauRepairIdentity,infillKoenigsbauRepairReconstruction,infillKoenigsbauRepairBaseMaterials} from './infill-stuttgart-koenigsbau-repair';
import {infillWlbOldIdentity,infillWlbOldReconstruction,infillWlbOldBaseMaterials} from './infill-stuttgart-wlb-old';
import {infillWlbExtensionIdentity,infillWlbExtensionReconstruction,infillWlbExtensionBaseMaterials} from './infill-stuttgart-wlb-extension';
import {infillEcbIdentity,infillEcbReconstruction,infillEcbBaseMaterials} from './infill-frankfurt-ecb';
import {infillMainTriangelIdentity,infillMainTriangelReconstruction,infillMainTriangelBaseMaterials} from './infill-frankfurt-main-triangel';
import {infillFrankfurtIdentity,infillFrankfurtReconstruction,infillFrankfurtBaseMaterials} from './infill-frankfurt-towers';
import {infillFrankfurtEastIdentity,infillFrankfurtEastReconstruction,infillFrankfurtEastBaseMaterials} from './infill-frankfurt-east';
import {infillSchauspielhausIdentity,infillSchauspielhausReconstruction,infillSchauspielhausBaseMaterials} from './infill-stuttgart-schauspielhaus';
import {infillKoenigsbauPassagenIdentity,infillKoenigsbauPassagenReconstruction,infillKoenigsbauPassagenBaseMaterials} from './infill-stuttgart-koenigsbau-passagen';
import {infillGustavIdentity,infillGustavReconstruction,infillGustavBaseMaterials} from './infill-stuttgart-gustav';
import {infillHmdkIdentity,infillHmdkReconstruction,infillHmdkBaseMaterials} from './infill-stuttgart-hmdk';
import {infillKatharinaIdentity,infillKatharinaReconstruction,infillKatharinaBaseMaterials} from './infill-stuttgart-katharina';
import {infillPhilharmonieIdentity,infillPhilharmonieReconstruction,infillPhilharmonieBaseMaterials} from './infill-philharmonie-reconstruction';
import {infillEssenIdentity,infillEssenReconstruction,infillEssenBaseMaterials} from './infill-essen-reconstruction';
import {infillSynagogeIdentity,infillSynagogeReconstruction,infillSynagogeBaseMaterials} from './infill-synagoge-reconstruction';

export {ownerF154RecoveredSources as ownerRecoveredSourceComponents,prepareOwnerF154RecoveredSources as prepareOwnerRecoveredSourceComponents} from './owner-f154-reconstruction';

import type {BuildingComponent,Identity} from "../../../safety/building-mesh-types";
import {type OwnerReconstructionStats} from './owner-f032-reconstruction';

export type {OwnerReconstructionStats};
export const ownerReconstructionIdentity=(c:Identity,scope?:FrozenDataScope)=>bremenScopedCall(boundary70Identity,[c],scope)||bremenScopedCall(edgeCoverageIdentity,[c],scope)||bremenScopedCall(utility70Identity,[c],scope)||bremenScopedCall(bremenGlockeDetailIdentity,[c],scope)||bremenScopedCall(bremenEdgefill70Identity,[c],scope)||bremenScopedCall(edgeDb70Identity,[c],scope)||bremenScopedCall(edgeAg70Identity,[c],scope)||bremenScopedCall(school70Identity,[c],scope)||bremenScopedCall(karstadt70Identity,[c],scope)||bremenScopedCall(infillBremenOldtownChurchesIdentity,[c],scope)||bremenScopedCall(ws70Identity,[c],scope)||bremenScopedCall(bremenFlemings70Identity,[c],scope)||bremenScopedCall(bremenRadstation70Identity,[c],scope)||bremenScopedCall(infillBremenOldtownRepairsIdentity,[c],scope)||bremenScopedCall(infillBremenOldtownExtra4Identity,[c],scope)||bremenScopedCall(bremenWasserturm70Identity,[c],scope)||bremenScopedCall(bremenQuartier670Identity,[c],scope)||bremenScopedCall(europahafenkopf70Identity,[c],scope)||bremenScopedCall(bremenKunsthalle70Identity,[c],scope)||bremenScopedCall(infillBremenOldtown70Identity,[c],scope)||bremenScopedCall(infillSilberturmIdentity,[c],scope)||bremenScopedCall(infillOmniturmIdentity,[c],scope)||bremenScopedCall(marienturm050Identity,[c],scope)||bremenScopedCall(infillPremierIdentity,[c],scope)||bremenScopedCall(infillC032OriginalIdentity,[c],scope)||bremenScopedCall(infillC032OfficialIdentity,[c],scope)||bremenScopedCall(infillFrankfurtJunghof088Identity,[c],scope)||bremenScopedCall(infillFrankfurtBockenheimer084Identity,[c],scope)||bremenScopedCall(infillF278OriginalIdentity,[c],scope)||bremenScopedCall(infillF288OriginalIdentity,[c],scope)||bremenScopedCall(infillEberhardHistoricalIdentity,[c],scope)||bremenScopedCall(infillGoethe34Identity,[c],scope)||bremenScopedCall(infillFrankfurtKettenhof065Identity,[c],scope)||bremenScopedCall(infillFrankfurtVCI051Identity,[c],scope)||bremenScopedCall(infillFrankfurtML41SignarisIdentity,[c],scope)||bremenScopedCall(infillFrankfurtLowOfficeBulk70Identity,[c],scope)||bremenScopedCall(infillSchneider076Identity,[c],scope)||bremenScopedCall(infillFrankfurtMaro80Identity,[c],scope)||bremenScopedCall(infillFrankfurtMaro74Identity,[c],scope)||bremenScopedCall(infillFrankfurtLowOfficeK26Identity,[c],scope)||bremenScopedCall(infillFrankfurtLowOfficeBatch2Identity,[c],scope)||bremenScopedCall(infillFrankfurtLowOfficeIdentity,[c],scope)||bremenScopedCall(infillStJohannIdentity,[c],scope)||bremenScopedCall(infillGalerieIdentity,[c],scope)||bremenScopedCall(infillKatharinaSportsHallIdentity,[c],scope)||bremenScopedCall(infillRabbiIdentity,[c],scope)||bremenScopedCall(infillGrafEastBridgeIdentity,[c],scope)||bremenScopedCall(infillGrafCourtyardMeasuredIdentity,[c],scope)||bremenScopedCall(infillGrafWestMeasuredIdentity,[c],scope)||bremenScopedCall(infillFrankfurtSkyperIdentity,[c],scope)||bremenScopedCall(infillEurotowerIdentity,[c],scope)||bremenScopedCall(infillJubilaeumssaeuleIdentity,[c],scope)||bremenScopedCall(infillOpernturmIdentity,[c],scope)||bremenScopedCall(infillFrankfurtSpinIdentity,[c],scope)||bremenScopedCall(infillWinxIdentity,[c],scope)||bremenScopedCall(infillOneIdentity,[c],scope)||bremenScopedCall(infillBoersenplatzBlockIdentity,[c],scope)||bremenScopedCall(infillFrankfurtWestendgateIdentity,[c],scope)||bremenScopedCall(infillMyzeilIdentity,[c],scope)||bremenScopedCall(infillFrankfurtNextowerIdentity,[c],scope)||bremenScopedCall(infillFrankfurtDeutscheBankIdentity,[c],scope)||bremenScopedCall(infillWestend1Identity,[c],scope)||bremenScopedCall(infillFrankfurtTrianonIdentity,[c],scope)||bremenScopedCall(infillFrankfurtFbcIdentity,[c],scope)||bremenScopedCall(infillTower185Identity,[c],scope)||bremenScopedCall(infillBoerseIdentity,[c],scope)||bremenScopedCall(infillHauptwacheIdentity,[c],scope)||bremenScopedCall(infillGrafGeissIdentity,[c],scope)||bremenScopedCall(infillGrafRearIdentity,[c],scope)||bremenScopedCall(infillBahndirektionIdentity,[c],scope)||bremenScopedCall(infillKoenigsbauRepairIdentity,[c],scope)||bremenScopedCall(infillWlbOldIdentity,[c],scope)||bremenScopedCall(infillWlbExtensionIdentity,[c],scope)||bremenScopedCall(infillEcbIdentity,[c],scope)||bremenScopedCall(infillMainTriangelIdentity,[c],scope)||bremenScopedCall(infillKatharinaIdentity,[c],scope)||bremenScopedCall(infillHmdkIdentity,[c],scope)||bremenScopedCall(infillGustavIdentity,[c],scope)||bremenScopedCall(infillKoenigsbauPassagenIdentity,[c],scope)||bremenScopedCall(infillSchauspielhausIdentity,[c],scope)||bremenScopedCall(infillFrankfurtEastIdentity,[c],scope)||bremenScopedCall(infillFrankfurtIdentity,[c],scope)||bremenScopedCall(infillPhilharmonieIdentity,[c],scope)||bremenScopedCall(infillEssenIdentity,[c],scope)||bremenScopedCall(infillSynagogeIdentity,[c],scope)||frozenOwnerReconstructionIdentity(c,scope);

type BremenReplacementStats={objects:number;vertices:number;triangles:number;originalVertices?:number;components:any[]};
type BremenReplacements={stats:BremenReplacementStats;replacements:Map<string,BuildingComponent>};
/** Only marked replacement rows survive the unrelated frozen/infill stages.
 * The temporary index owns no result array and keeps the original last-wins key. */
function captureBremenReplacements(result:{components:BuildingComponent[];stats:BremenReplacementStats}|undefined,markers:readonly string[]):BremenReplacements|undefined{
 if(!result?.stats.objects)return undefined;
 const replacements=new Map<string,BuildingComponent>();
 for(const c of result.components){const estimates=c.displayEstimates as Record<string,unknown>|undefined;if(markers.some(marker=>estimates?.[marker]))replacements.set(c.city+'|'+c.objectId+'|'+c.partId,c);}
 return{stats:result.stats,replacements};
}
function applyBremenReplacements(current:BuildingComponent[],stats:OwnerReconstructionStats,result:BremenReplacements|undefined):BuildingComponent[]{
 if(!result)return current;
 const next=current.map(c=>result.replacements.get(c.city+'|'+c.objectId+'|'+c.partId)??c);
 for(const key of ['objects','vertices','triangles','originalVertices']as const)stats[key]=(stats[key]??0)+result.stats[key]!;
 stats.components.push(...result.stats.components);
 result.replacements.clear();return next;
}

// Owner-selected infill runs after the unchanged frozen providers.
type BremenScopeStage={kind:'prepare';fns:((...args:any[])=>any)[];components:BuildingComponent[]}|{kind:'frozen';components:BuildingComponent[]}|{kind:'call';fn:(...args:any[])=>any;args:any[];components:BuildingComponent[];prepared?:boolean};
function* bremenOwnerStages(components:BuildingComponent[],nativeLeafSHA:((c:BuildingComponent)=>string|undefined)|undefined,ownerRuntime:BremenOwnerRuntime|undefined,scope:FrozenDataScope|undefined):Generator<BremenScopeStage,{components:BuildingComponent[];stats:OwnerReconstructionStats},any>{
 yield {kind:"prepare",fns:[edgeAg70Identity],components:components};
const edgeAg70Reconstruction=(rows:BuildingComponent[],selectedTargetIds?:string[],leaf?:((c:BuildingComponent)=>string|undefined))=>{if(!rows.some(c=>c.city==='bremen'&&bremenScopedCall(edgeAg70Identity,[c],scope)))return{components:rows.map(c=>c),stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[]}};if(!ownerRuntime)throw Error('Bremen AG70 owner runtime was not provided');return ownerRuntime.edgeAg70Reconstruction(rows,selectedTargetIds,leaf,scope);};
 yield {kind:"prepare",fns:[infillBremenOldtownRepairsReconstruction],components:components};
let bremenRepairsOriginal=captureBremenReplacements(components.some(c=>c.city==='bremen')?bremenScopedCall(infillBremenOldtownRepairsReconstruction,[components],scope):undefined,['infillBremenOldtownRepairs', 'infillBremenOldtownRepairsSuppressed']);
 yield {kind:"prepare",fns:[infillBremenOldtownChurchesReconstruction,ws70Reconstruction,bremenFlemings70Reconstruction,bremenRadstation70Reconstruction],components:components};
const bremenOriginal004=components.some(c=>c.city==='bremen')?[captureBremenReplacements(bremenScopedCall(infillBremenOldtownChurchesReconstruction,[components],scope),['infillBremenOldtownChurches', 'infillBremenOldtownChurchesSuppressed', 'ws70', 'bremenFlemings70', 'bremenRadstation70']),captureBremenReplacements(bremenScopedCall(ws70Reconstruction,[components],scope),['infillBremenOldtownChurches', 'infillBremenOldtownChurchesSuppressed', 'ws70', 'bremenFlemings70', 'bremenRadstation70']),captureBremenReplacements(bremenScopedCall(bremenFlemings70Reconstruction,[components,nativeLeafSHA],scope),['infillBremenOldtownChurches', 'infillBremenOldtownChurchesSuppressed', 'ws70', 'bremenFlemings70', 'bremenRadstation70']),captureBremenReplacements(bremenScopedCall(bremenRadstation70Reconstruction,[components,nativeLeafSHA],scope),['infillBremenOldtownChurches', 'infillBremenOldtownChurchesSuppressed', 'ws70', 'bremenFlemings70', 'bremenRadstation70'])]:[];
 yield {kind:"prepare",fns:[bremenEdgefill70Reconstruction,edgeDb70Reconstruction,school70Reconstruction,karstadt70Reconstruction],components:components};
const bremenOriginal005=components.some(c=>c.city==='bremen')?[captureBremenReplacements(bremenScopedCall(bremenEdgefill70Reconstruction,[components,nativeLeafSHA],scope),['bremenEdgefill70', 'edgeDb70', 'edgeDb70Suppressed', 'edgeAg70', 'edgeAg70Suppressed', 'school70', 'karstadt70', 'karstadt70Suppressed']),captureBremenReplacements(bremenScopedCall(edgeDb70Reconstruction,[components,undefined,nativeLeafSHA],scope),['bremenEdgefill70', 'edgeDb70', 'edgeDb70Suppressed', 'edgeAg70', 'edgeAg70Suppressed', 'school70', 'karstadt70', 'karstadt70Suppressed']),captureBremenReplacements(edgeAg70Reconstruction(components,undefined,nativeLeafSHA),['bremenEdgefill70', 'edgeDb70', 'edgeDb70Suppressed', 'edgeAg70', 'edgeAg70Suppressed', 'school70', 'karstadt70', 'karstadt70Suppressed']),captureBremenReplacements(bremenScopedCall(school70Reconstruction,[components],scope),['bremenEdgefill70', 'edgeDb70', 'edgeDb70Suppressed', 'edgeAg70', 'edgeAg70Suppressed', 'school70', 'karstadt70', 'karstadt70Suppressed']),captureBremenReplacements(bremenScopedCall(karstadt70Reconstruction,[components,undefined,nativeLeafSHA],scope),['bremenEdgefill70', 'edgeDb70', 'edgeDb70Suppressed', 'edgeAg70', 'edgeAg70Suppressed', 'school70', 'karstadt70', 'karstadt70Suppressed'])]:[];
 yield {kind:"prepare",fns:[bremenGlockeDetailReconstruction],components:components};
let bremenOriginal006=captureBremenReplacements(components.some(c=>c.city==='bremen')?bremenScopedCall(bremenGlockeDetailReconstruction,[components,nativeLeafSHA],scope):undefined,['bremenGlockeDetail']);
 yield {kind:"prepare",fns:[boundary70Reconstruction],components:components};
let bremenBoundaryOriginal008=captureBremenReplacements(bremenScopedCall(boundary70Reconstruction,[components,undefined,nativeLeafSHA],scope),['boundary70', 'boundary70Suppressed']);
 yield {kind:"prepare",fns:[utility70Reconstruction],components:components};
let bremenUtilityOriginal007=captureBremenReplacements(bremenScopedCall(utility70Reconstruction,[components],scope),['utility70']);
 const frozen=(yield {kind:"frozen",components}) as {components:BuildingComponent[];stats:OwnerReconstructionStats}; let current=frozen.components;
 const stats={...frozen.stats,components:[...frozen.stats.components]};
 // Frankfurt Bulk70 reads its original builder's data through this batch's
 // scope (DECISIONS 2026-11-02 01:35, fix one); the manager prepared it in that
 // same scope. The selected-queue argument stays undefined, as before.
 for(const reconstruct of [silberturmFullReconstruction051,infillOmniturmReconstruction,marienturm050Reconstruction,infillPremierReconstruction,infillC032OfficialReconstruction,infillF278OriginalReconstruction,infillF288OriginalReconstruction,infillEberhardHistoricalReconstruction,infillGoethe34Reconstruction,infillFrankfurtKettenhof065Reconstruction,infillFrankfurtVCI051Reconstruction,infillFrankfurtML41SignarisReconstruction,infillFrankfurtLowOfficeBulk70Reconstruction,infillSchneider076Reconstruction,infillFrankfurtMaro80Reconstruction,infillFrankfurtMaro74Reconstruction,infillFrankfurtLowOfficeK26Reconstruction,infillFrankfurtLowOfficeBatch2Reconstruction,infillFrankfurtLowOfficeReconstruction,infillStJohannReconstruction,infillGalerieReconstruction,infillKatharinaSportsHallReconstruction,infillRabbiReconstruction,infillGrafCourtyardMeasuredReconstruction,infillGrafWestMeasuredReconstruction,infillGrafEastBridgeReconstruction,infillFrankfurtSkyperReconstruction,infillEurotowerReconstruction,infillJubilaeumssaeuleReconstruction,infillOpernturmReconstruction,infillFrankfurtSpinReconstruction,infillWinxReconstruction,infillOneReconstruction,infillBoersenplatzBlockReconstruction,infillFrankfurtWestendgateReconstruction,infillMyzeilReconstruction,infillFrankfurtNextowerReconstruction,infillFrankfurtDeutscheBankReconstruction,infillWestend1Reconstruction,infillFrankfurtTrianonReconstruction,infillFrankfurtFbcReconstruction,infillTower185Reconstruction,infillBoerseReconstruction,infillHauptwacheReconstruction,infillGrafGeissReconstruction,infillGrafRearReconstruction,infillBahndirektionReconstruction,infillKoenigsbauRepairReconstruction,infillWlbOldReconstruction,infillWlbExtensionReconstruction,infillEcbReconstruction,infillMainTriangelReconstruction,infillEssenReconstruction,infillSynagogeReconstruction,infillPhilharmonieReconstruction,infillKatharinaReconstruction,infillHmdkReconstruction,infillGustavReconstruction,infillKoenigsbauPassagenReconstruction,infillSchauspielhausReconstruction,infillFrankfurtEastReconstruction,infillFrankfurtReconstruction]){const next=(yield {kind:"call",fn:reconstruct,args:reconstruct===infillFrankfurtLowOfficeBulk70Reconstruction?[current,undefined,scope]:[current],components:current});current=next.components;for(const key of ['objects','vertices','triangles','originalVertices'] as const)stats[key]=(stats[key]??0)+next.stats[key];stats.components.push(...next.stats.components);stats.error=stats.error||next.stats.error;}
if(current.some(c=>c.city==='bremen')){
 const stages:[(...args:any[])=>any,(rows:BuildingComponent[])=>any[]][]=[
  [infillBremenOldtownExtra4Reconstruction,rows=>[rows,bremenExtra4OwnerTargets(),bremenDemandSourceAuthority('extra4')]],
  [bremenWasserturm70Reconstruction,rows=>[rows,nativeLeafSHA]],
  [bremenQuartier670Reconstruction,rows=>[rows,nativeLeafSHA]],
  [europahafenkopf70Reconstruction,rows=>[rows]],
  [infillBremenOldtown70Reconstruction,rows=>[rows,undefined,bremenDemandSourceAuthority('oldtown')]],
  [bremenKunsthalle70Reconstruction,rows=>[rows,nativeLeafSHA]],
 ];
 for(const [reconstruct,args]of stages){
  // Each complete group sees the actual output of its predecessor, including
  // newly generated DISPLAY identities, before selecting its resource union.
  const next=(yield {kind:'call',fn:reconstruct,args:args(current),components:current});
  current=next.components;for(const key of ['objects','vertices','triangles','originalVertices'] as const)stats[key]=(stats[key]??0)+next.stats[key];stats.components.push(...next.stats.components);
 }
 }
 current=applyBremenReplacements(current,stats,bremenRepairsOriginal);bremenRepairsOriginal=undefined;
 for(const result of bremenOriginal004)current=applyBremenReplacements(current,stats,result);bremenOriginal004.length=0;
 for(const result of bremenOriginal005)current=applyBremenReplacements(current,stats,result);bremenOriginal005.length=0;
 current=applyBremenReplacements(current,stats,bremenOriginal006);bremenOriginal006=undefined;
 yield {kind:"prepare",fns:[wsBackDetailReframe],components:current};
const bremenWSBackDetail=bremenScopedCall(wsBackDetailReframe,[current,components,nativeLeafSHA],scope);current=bremenWSBackDetail.components;(stats as any).bremenWSBackDetail=bremenWSBackDetail.stats;
 current=applyBremenReplacements(current,stats,bremenBoundaryOriginal008);bremenBoundaryOriginal008=undefined;
 current=applyBremenReplacements(current,stats,bremenUtilityOriginal007);bremenUtilityOriginal007=undefined;
 yield {kind:"prepare",fns:[office7aContourReconstruction],components:current};
const office7aContour010=bremenScopedCall(office7aContourReconstruction,[current],scope);current=office7aContour010.components;(stats as any).office7aContour=office7aContour010;
 yield {kind:"prepare",fns:[edgeCoverageReconstruction],components:current};
const coverage007=bremenScopedCall(edgeCoverageReconstruction,[current,components,nativeLeafSHA],scope);current=coverage007.components;(stats as any).bremenEdgeCoverage=coverage007.stats;
 yield {kind:"prepare",fns:[hbfCourtMaterialReframe],components:current};
const hbfCourt009=bremenScopedCall(hbfCourtMaterialReframe,[current,components,nativeLeafSHA],scope);current=hbfCourt009.components;(stats as any).hbfCourtMaterial=hbfCourt009.stats;
 yield {kind:"prepare",fns:[stephaniRowBoundaryReframe],components:current};
const stephaniRows010=bremenScopedCall(stephaniRowBoundaryReframe,[current,components,nativeLeafSHA],scope);current=stephaniRows010.components;(stats as any).stephaniRowBoundary=stephaniRows010.stats;
 yield {kind:"prepare",fns:[officialOpeningsReframe],components:current};
const officialOpenings011=bremenScopedCall(officialOpeningsReframe,[current,components,nativeLeafSHA],scope);current=officialOpenings011.components;(stats as any).officialOpenings=officialOpenings011.stats;
 yield {kind:"prepare",fns:[glockeKuesterOwnershipReconstruction],components:current};
const kg012=bremenScopedCall(glockeKuesterOwnershipReconstruction,[current,components,nativeLeafSHA],scope);current=kg012.components;yield {kind:"prepare",fns:[glockeKuesterIdentity],components:current};
if(kg012.stats.objects){const removed=stats.components.filter(c=>bremenScopedCall(glockeKuesterIdentity,[c],scope));stats.components=stats.components.filter(c=>!bremenScopedCall(glockeKuesterIdentity,[c],scope));stats.components.push(...kg012.stats.components);stats.objects+=kg012.stats.objects-removed.length;stats.vertices+=kg012.stats.vertices-removed.reduce((n,c)=>n+c.vertices,0);stats.triangles+=kg012.stats.triangles-removed.reduce((n,c)=>n+c.triangles,0);}(stats as any).glockeKuesterOwnership=kg012.stats;
 yield {kind:"prepare",fns:[teerhofDetailReconstruction],components:current};
const teer012=bremenScopedCall(teerhofDetailReconstruction,[current],scope);current=teer012.components;if(teer012.stats.objects){const ids=new Set(teer012.stats.components.map(c=>c.objectId+'|'+c.partId)),removed=stats.components.filter(c=>ids.has(c.objectId+'|'+c.partId));stats.components=stats.components.filter(c=>!ids.has(c.objectId+'|'+c.partId));stats.components.push(...teer012.stats.components);stats.objects+=teer012.stats.objects-removed.length;stats.vertices+=teer012.stats.vertices-removed.reduce((n,c)=>n+c.vertices,0);stats.triangles+=teer012.stats.triangles-removed.reduce((n,c)=>n+c.triangles,0);}(stats as any).teerhofDetail=teer012.stats;
 yield {kind:"prepare",fns:[euroGableReframe],components:current};
const euro012=bremenScopedCall(euroGableReframe,[current,components,nativeLeafSHA],scope);current=euro012.components;(stats as any).euroGableOpenings=euro012.stats;
 yield {kind:"prepare",fns:[marketCapMaterialRepaint],components:current};
const cap013=bremenScopedCall(marketCapMaterialRepaint,[current,components,nativeLeafSHA,bremenRecipeDemand('market-cap-runtime','marketCapMaterialRepaint',current)?(bremenDemandSourceAuthority('oldtown')??getMARKET_AUTH013(scope).sourceAuthoritySHA256):undefined],scope);current=cap013.components;yield {kind:"prepare",fns:[marketCapMaterialIdentity],components:current};
if(cap013.stats.objects){const removed=stats.components.filter(c=>bremenScopedCall(marketCapMaterialIdentity,[c],scope));stats.components=stats.components.filter(c=>!bremenScopedCall(marketCapMaterialIdentity,[c],scope));stats.components.push(...cap013.stats.components);stats.objects+=cap013.stats.objects-removed.length;stats.vertices+=cap013.stats.vertices-removed.reduce((n,c)=>n+c.vertices,0);stats.triangles+=cap013.stats.triangles-removed.reduce((n,c)=>n+c.triangles,0);}(stats as any).marketCapStone=cap013.stats;
 yield {kind:"prepare",fns:[organistenFinalReconstruction],components:current};
const org013=bremenScopedCall(organistenFinalReconstruction,[current,components,nativeLeafSHA],scope);current=org013.components;yield {kind:"prepare",fns:[organistenIdentity],components:current};
if(org013.stats.objects){const removed=stats.components.filter(c=>bremenScopedCall(organistenIdentity,[c],scope));stats.components=stats.components.filter(c=>!bremenScopedCall(organistenIdentity,[c],scope));stats.components.push(...org013.stats.components);stats.objects+=org013.stats.objects-removed.length;stats.vertices+=org013.stats.vertices-removed.reduce((n,c)=>n+c.vertices,0);stats.triangles+=org013.stats.triangles-removed.reduce((n,c)=>n+c.triangles,0);}(stats as any).organistenFinal=org013.stats;
 yield {kind:"prepare",fns:[lloydFrontFinalReconstruction],components:current};
const lloyd014=bremenScopedCall(lloydFrontFinalReconstruction,[current,components,nativeLeafSHA],scope);current=lloyd014.components;yield {kind:"prepare",fns:[lloydFrontCarrierIdentity],components:current};
if(lloyd014.stats.objects){const removed=stats.components.filter(c=>bremenScopedCall(lloydFrontCarrierIdentity,[c],scope));stats.components=stats.components.filter(c=>!bremenScopedCall(lloydFrontCarrierIdentity,[c],scope));stats.components.push(...lloyd014.stats.components);stats.objects+=lloyd014.stats.objects-removed.length;stats.vertices+=lloyd014.stats.vertices-removed.reduce((n,c)=>n+c.vertices,0);stats.triangles+=lloyd014.stats.triangles-removed.reduce((n,c)=>n+c.triangles,0);}(stats as any).lloydFrontFinal=lloyd014.stats;
 yield {kind:"prepare",fns:[infillLow009RemoveDuplicateNativeParts],components:current};
current=bremenScopedCall(infillLow009RemoveDuplicateNativeParts,[current],scope);
 yield {kind:"prepare",fns:[infillLow073RemoveDuplicateNativeParts],components:current};
current=bremenScopedCall(infillLow073RemoveDuplicateNativeParts,[current],scope);
 return{components:current,stats};
}
export function ownerReconstructionComponents(components:BuildingComponent[],nativeLeafSHA?:(c:BuildingComponent)=>string|undefined,ownerRuntime?:BremenOwnerRuntime,scope?:FrozenDataScope){
 if(!components.length)return {components:components.map(c=>c),stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[]}};
 const stages=bremenOwnerStages(components,nativeLeafSHA,ownerRuntime,scope);
 try{
  let next=withBremenRecipeDemand(components,()=>stages.next());
  while(next.done!==true){
   const stage=next.value;
   next=withBremenRecipeDemand(stage.components,()=>{
    const value=stage.kind==='frozen'?frozenOwnerReconstructionComponents(stage.components,scope):stage.kind==='call'?bremenScopedCall(stage.fn,stage.args,scope):undefined;
    return stages.next(value);
   });
  }
  return next.value;
 }finally{stages.return(undefined as never);}
}

export function ownerReconstructionBaseMaterials(components:BuildingComponent[],paint:Float32Array,frames:Float32Array,scope?:FrozenDataScope){
 if(!components.length)return;
 return withBremenRecipeDemand(components,()=>{
  frozenOwnerReconstructionBaseMaterials(components,paint,frames,scope);
  for(const fn of BREMEN_MATERIAL_SCOPE_CONSUMERS)bremenScopedCall(fn,[components,paint,frames],scope);
 });
}

/** Both providers use the same unchanged frozen owner stage sequence. Bremen
 * rows need none of the newly lazy stages. Other cities retain canonical stage
 * preparation if this shared aggregate is called with their rows. */
export async function prepareBremenOwnerReconstructionComponents(components:BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait,scope?:FrozenDataScope,nativeLeafSHA?:((c:BuildingComponent)=>string|undefined),ownerRuntime?:BremenOwnerRuntime){
 signal.throwIfAborted();
 if(!components.length)return {components:components.map(c=>c),stats:{objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true as const,actualVisualAccepted:false as const,components:[]}};
 if(!scope)throw Error('Bremen reconstruction requires a batch data scope');
 if(components.some(c=>c.city==='bremen'&&edgeAg70Identity(c)))await scope.prepare([EDGE70_RESOURCE],signal);
 const stages=bremenOwnerStages(components,nativeLeafSHA,ownerRuntime,scope);
 try{
  let next=withBremenRecipeDemand(components,()=>stages.next());
  while(next.done!==true){
   const stage=next.value;let value:any;
   if(stage.kind==='prepare')await prepareBremenFunctions(scope,stage.fns,stage.components,signal);
   else if(stage.kind==='frozen')value=await prepareFrozenOwnerReconstructionComponents(stage.components,signal,wait,scope);
   else if(!stage.prepared)await prepareBremenFunctions(scope,[stage.fn],stage.components,signal,stage.args);
   // Reuse demand only until the next suspension. The next stage always selects
   // against its actual predecessor output, including newly generated rows.
   next=withBremenRecipeDemand(stage.components,()=>{
    if(stage.kind==='call')value=bremenScopedCall(stage.fn,stage.args,scope);
    signal.throwIfAborted();return stages.next(value);
   });
  }
  return next.value;
 }finally{stages.return(undefined as never);}
}

/** Actual material consumers, used after the last derived stage. */
export const BREMEN_MATERIAL_SCOPE_CONSUMERS=[infillF278OriginalBaseMaterials,infillF288OriginalBaseMaterials,infillEberhardHistoricalBaseMaterials,infillGoethe34BaseMaterials,infillFrankfurtKettenhof065BaseMaterials,infillFrankfurtBockenheimer084BaseMaterials,infillFrankfurtJunghof088BaseMaterials,infillFrankfurtVCI051BaseMaterials,infillFrankfurtML41SignarisBaseMaterials,infillFrankfurtLowOfficeBulk70BaseMaterials,infillC121OriginalBaseMaterials,infillC032OriginalBaseMaterials,infillC032OfficialBaseMaterials,infillPremierBaseMaterials,infillSchneider076BaseMaterials,infillFrankfurtMaro80BaseMaterials,infillFrankfurtMaro74BaseMaterials,infillFrankfurtLowOfficeK26BaseMaterials,infillFrankfurtLowOfficeBatch2BaseMaterials,infillFrankfurtLowOfficeBaseMaterials,infillStJohannBaseMaterials,infillGalerieBaseMaterials,infillKatharinaSportsHallBaseMaterials,infillRabbiBaseMaterials,infillGrafCourtyardMeasuredBaseMaterials,infillGrafWestMeasuredBaseMaterials,infillGrafEastBridgeBaseMaterials,infillFrankfurtSkyperBaseMaterials,infillEurotowerBaseMaterials,infillJubilaeumssaeuleBaseMaterials,infillOpernturmBaseMaterials,infillFrankfurtSpinBaseMaterials,infillWinxBaseMaterials,infillOneBaseMaterials,infillBoersenplatzBlockBaseMaterials,infillFrankfurtWestendgateBaseMaterials,infillMyzeilBaseMaterials,infillFrankfurtNextowerBaseMaterials,infillFrankfurtDeutscheBankBaseMaterials,infillWestend1BaseMaterials,infillFrankfurtTrianonBaseMaterials,infillFrankfurtFbcBaseMaterials,infillTower185BaseMaterials,infillBoerseBaseMaterials,infillHauptwacheBaseMaterials,infillGrafGeissBaseMaterials,infillGrafRearBaseMaterials,infillBahndirektionBaseMaterials,infillKoenigsbauRepairBaseMaterials,infillWlbOldBaseMaterials,infillWlbExtensionBaseMaterials,infillEcbBaseMaterials,infillMainTriangelBaseMaterials,infillEssenBaseMaterials,infillSynagogeBaseMaterials,infillPhilharmonieBaseMaterials,infillKatharinaBaseMaterials,infillHmdkBaseMaterials,infillGustavBaseMaterials,infillKoenigsbauPassagenBaseMaterials,infillSchauspielhausBaseMaterials,infillFrankfurtEastBaseMaterials,infillFrankfurtBaseMaterials,infillOmniturmBaseMaterials,marienturm050BaseMaterials,silberturmSpecificMaterials050,europahafenkopf70BaseMaterials,infillBremenOldtown70BaseMaterials,bremenKunsthalle70BaseMaterials,infillBremenOldtownExtra4BaseMaterials,bremenWasserturm70BaseMaterials,bremenQuartier670BaseMaterials,infillBremenOldtownRepairsBaseMaterials,infillBremenOldtownChurchesBaseMaterials,ws70BaseMaterials,bremenFlemings70BaseMaterials,bremenRadstation70BaseMaterials,bremenEdgefill70BaseMaterials,edgeDb70BaseMaterials,edgeAg70BaseMaterials,school70BaseMaterials,karstadt70BaseMaterials,bremenGlockeDetailBaseMaterials,wsBackDetailBaseMaterials,utility70BaseMaterials,utilityOfficialDetail70BaseMaterials,edgeCoverageBaseMaterials,boundary70BaseMaterials,office7a70BaseMaterials,hbfCourtMaterialBaseMaterials,stephaniRowBoundaryBaseMaterials,officialOpeningsBaseMaterials,glockeKuesterOwnershipBaseMaterials,teerhofDetailBaseMaterials,euroGableBaseMaterials,organistenFinalBaseMaterials,marketCapMaterialBaseMaterials,lloydFrontFinalBaseMaterials] as const;
