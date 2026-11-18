import {createResidentTriangleDrawBatch,drawResidentTriangles} from '../../../safety/render-runtime/resident-index-convention';
import {chunkUniforms,residentSpansInRange,surfaceUniforms} from '../../../safety/render-runtime/resident-draw-range';
import {createPaintProgramIdleRetirement} from '../../../safety/paint-program-idle-retirement';
import {currentPaintProgramGroups} from '../../../safety/current-paint-program-groups';
import {resourceContentKey} from '../../../safety/resource-content-key';

/** Lossless column-wise prefix coding of the ordered contributor authorities.
 * Every row remains reconstructible, including empty strings and UTF16 units.
 * Shared source/compiler prefixes are stored once per adjacent row instead of
 * copied into every packed, GPU and shadow identity. No hash or global cache. */
function delegatedContributorAuthority(contributors:readonly {contentKey:string;recipeAuthority:string;materialAuthority:string}[]){
 const columns=(['contentKey','recipeAuthority','materialAuthority'] as const).map(field=>{
  let previous='';
  return contributors.map(row=>{
   const value=row[field];let prefix=0;
   while(prefix<previous.length&&prefix<value.length&&previous.charCodeAt(prefix)===value.charCodeAt(prefix))prefix++;
   previous=value;return[prefix,value.slice(prefix)] as const;
  });
 });
 return['delegated-contributors-prefix-v1',...columns];
}
import type {Identity,Polygon,SourceFeature,MeshBatch,BuildingComponent} from '../../../safety/building-mesh-types';
export type {Identity,Polygon,SourceFeature,MeshBatch,BuildingComponent} from '../../../safety/building-mesh-types';
import type {ShadowBatchAdmission} from '../../../safety/shadow-batch-types';
export type {ShadowBatchAdmission} from '../../../safety/shadow-batch-types';
import {resolveDelegatedSourceContext} from './renderer-source-context';
import {delegated500DemandClosure} from './delegated500-data-demand';
import {emitShaderSource,estimateShaderSourceWorkspace,shaderSourceBounds,shaderSourceParts,shaderSourceText,type ShaderSourceBounds,type ShaderSourcePart} from '../../../safety/render-runtime/shader-source-budget';
import {describeShaderAssemblyBounds,shaderSourceBoundPart} from '../../../safety/render-runtime/shader-assembly-budget';
import {createPreparedSourceWorkspace} from '../../../safety/prepared-source';
import type {PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import {DELEGATED_BERLIN_DISTANT_WRAPPERS,DELEGATED_F004_DETAIL_WRAPPERS,DELEGATED_F020_CHAPEL_WRAPPERS,DELEGATED_LEGACY_PARTITION_WRAPPERS,DELEGATED_MATERIAL_SOURCE_WRAPPERS,DelegatedPreparedSourceMap,admitDelegatedSourceText,applyDelegatedPaintWrappers,assertDelegatedCostsFit,assertDelegatedProgramBudgetFits,createContextPreparedSourceWorkspace,createDelegatedSourceBudgetGate,delegatedSourceTextCosts,describeDelegatedWrappedPaintBounds,existingShaderTextBoundPart,existingShaderTextBounds,newDelegatedSourceTextIdentities,tryAdmitDelegatedSourceText,waitForDelegatedSourceText,type DelegatedSourceBudgetGate,type DelegatedSourceTextClaim,type DelegatedSourceTextEstimate,type DelegatedSourceTextIdentities} from './delegated-shader-budget';
import {getChunkResourceStoreForContext} from '../../../safety/render-runtime/chunk-resource-store';
import type {ResourceBudgetCost,ResourceBudgetReservation} from '../../../safety/render-runtime/resource-budget';
import type {ProgramPreparationBudget} from '../../../safety/render-runtime/program-preparation';
import {mergeRendererStateRange,writeRendererSelection,uploadRendererStateRange,type RendererStateRange} from './renderer-state-ranges';
import {rathausCoincidentWallFragmentMasks} from '../../../safety/facade-rathaus-display-masks';
import {copyBuildingComponentMetadata,copyBuildingComponentReadback} from '../../../safety/component-readback';
import type {PlanarReflectionPreparationResult} from '../../../safety/planar-building-reflection';
import type {CaptureDemandChange} from '../../../safety/capture-resource-demand';
import {utf8ByteLength} from '../../../safety/utf8-byte-length';
import {createFrozenDataScope,type FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataClient} from '../../../safety/frozen-data-lease-store';
import {prepareDelegated500Data,prepareDelegated500Programs,type PreparedDelegated500Data as BasePreparedDelegated500Data,type Delegated500DataIdentity} from './delegated500-prepared-data';
import {delegated500ScopedFunctionArities} from './delegated500-scoped-functions';
import {createResidentGeometryOwner,type ResidentGeometryLease} from '../../../safety/render-runtime/resident-geometry';
import {appendContiguousRendererSpan,coalesceRendererChunkGroups,rendererChunkPublicationCohorts,type RendererChunkInput,type RendererSourceGroup} from '../../../safety/renderer-chunk-input';
import type {ChunkResourceLease,ChunkResourceStore} from '../../../safety/render-runtime/chunk-resource-types';
import {acquirePackedChunk,adoptPackedChunkRoles,packChunkGeometry,packedChunkContentKey,retainChunkBindings,selectedChunkGroups,splitChunkRuns,validateChunkCohorts,type PackedBuildingChunk,type PreparedChunkBindings} from './renderer-packed-chunks';
import type {ResidentDrawReadiness} from '../../../safety/resident-draw-readiness';
import {adjacentViewportPublicationSignal} from '../../../safety/viewport-request';
import {createProgramGrantHandoff} from '../../../safety/render-runtime/program-grant-handoff';
import {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,ProgramPreparationPending} from '../../../safety/render-runtime/program-preparation';
import {captureMainDrawBindings,sameMainDrawBindings,type MainDrawBindings} from '../../../safety/render-runtime/main-draw-bindings';
import {createResidentCaptureRuntime,createResidentCaptureOwnership,type ResidentCaptureAdapter} from '../../../safety/render-runtime/resident-capture';
import {createSolarShadowPreparationBudget,solarShadowPreparation,prepareSolarShadowResources,type SolarShadowPreparationBudget,type SolarShadowPreparationResult} from '../../../safety/solar-shadow-preparation';
import {withSceneSolarShadowReceiver} from '../../../safety/scene-solar-shadow';
import {guardCustomLayerRender} from '../../../safety/custom-layer-render-error';
import {createProjectedShadowMask} from '../../../safety/projected-shadow-mask';
import {residentSolarShadowCoverage,withResidentReflectionClip,residentReflectionClipPlane,createResidentReflectionUniforms,planResidentReflectionChunks,createResidentReflectionObjects,type ResidentPlanarReflectionPass,type ResidentPlanarReflectionResult} from '../../../safety/resident-planar-reflection';
import {createResidentGPULifecycle} from '../../../safety/resident-gpu-lifecycle';
import {sceneSolarLight,SCENE_SHADOW_MIN_ALTITUDE_DEGREES} from '../../../safety/scene-solar-light';
import {SCENE_SURFACE_LIGHT_GLSL,createSceneLightUniforms} from '../../../safety/scene-surface-light';
import {defaultSceneEnvironment,checkedSceneEnvironment,type SceneEnvironmentState} from '../../../safety/scene-environment-state';
import {prepareSolarShadowBoundary,residentSolarShadowRanges,type PreparedSolarBoundary,type SolarShadowBoundary} from '../../../safety/solar-shadow-admission';
import {applyKOLudwigWorkshop70 as importedDelegated_applyKOLudwigWorkshop70,koLudwigWorkshopReady70 as importedDelegated_koLudwigWorkshopReady70} from './ko-ludwig-workshop70';
import {KO_LUDWIG_WORKSHOP_GLSL70,KO_LUDWIG_WORKSHOP_GLSL70_SHA256} from './ko-ludwig-workshop70-glsl';
import {applyKOPantaleonGate70 as importedDelegated_applyKOPantaleonGate70,koPantaleonGateDisplay70 as importedDelegated_koPantaleonGateDisplay70,koPantaleonGateReady70 as importedDelegated_koPantaleonGateReady70} from './ko-pantaleon-gate';
import {KO_PANTALEON_GATE_GLSL,KO_PANTALEON_GATE_GLSL_SHA256} from './ko-pantaleon-gate-glsl';
import {applyKOMesseturmCrown70 as importedDelegated_applyKOMesseturmCrown70,koMesseturmCrownDisplay70 as importedDelegated_koMesseturmCrownDisplay70,koMesseturmCrownReady70 as importedDelegated_koMesseturmCrownReady70} from './ko-messeturm-crown';
import {KO_MESSETURM_CROWN_GLSL,KO_MESSETURM_CROWN_GLSL_SHA256} from './ko-messeturm-crown-glsl';
import {createIndexedPickBlocks70 as importedDelegated_createIndexedPickBlocks70,indexedPickBlockHit70 as importedDelegated_indexedPickBlockHit70,INDEXED_PICK_BLOCK_TRIANGLES70} from './indexed-pick-blocks70';
import {koRailUploadCapacity70 as importedDelegated_koRailUploadCapacity70,type KORailLineage70} from './ko-rail-upload-capacity70';
import {applyHHStrafjustiz70 as importedDelegated_applyHHStrafjustiz70,hhStrafjustizDisplay70 as importedDelegated_hhStrafjustizDisplay70} from './hh-strafjustiz';
import {applyHHSpiegelEricus70 as importedDelegated_applyHHSpiegelEricus70,hhSpiegelEricusDisplay70 as importedDelegated_hhSpiegelEricusDisplay70} from './hh-spiegel-ericus';
import {applyHHSchanzen70 as importedDelegated_applyHHSchanzen70,hhSchanzenDisplay70 as importedDelegated_hhSchanzenDisplay70} from './hh-schanzen';
import {applyHHOberlandesgericht70 as importedDelegated_applyHHOberlandesgericht70,hhOberlandesgerichtDisplay70 as importedDelegated_hhOberlandesgerichtDisplay70} from './hh-oberlandesgericht';
import {applyHHZiviljustiz70 as importedDelegated_applyHHZiviljustiz70,hhZiviljustizDisplay70 as importedDelegated_hhZiviljustizDisplay70} from './hh-ziviljustiz';
import {applyHHFlakbunker70 as importedDelegated_applyHHFlakbunker70,hhFlakbunkerDisplay70 as importedDelegated_hhFlakbunkerDisplay70} from './hh-flakbunker';
import {applyHHFontenay70 as importedDelegated_applyHHFontenay70,hhFontenayDisplay70 as importedDelegated_hhFontenayDisplay70} from './hh-fontenay';
import {applyHHMARKK70 as importedDelegated_applyHHMARKK70,hhMARKKDisplay70 as importedDelegated_hhMARKKDisplay70} from './hh-markk';
import {applyHHDammtor70 as importedDelegated_applyHHDammtor70,hhDammtorDisplay70 as importedDelegated_hhDammtorDisplay70} from './hh-dammtor';
import {applyHHESA1_70 as importedDelegated_applyHHESA1_70,hhESA1Display70 as importedDelegated_hhESA1Display70} from './hh-esa1';
import {applyHHESAEast70 as importedDelegated_applyHHESAEast70,hhESAEastDisplay70 as importedDelegated_hhESAEastDisplay70} from './hh-esa-east';
import {applyHHJohannesKronstadt70 as importedDelegated_applyHHJohannesKronstadt70,hhJohannesKronstadtDisplay70 as importedDelegated_hhJohannesKronstadtDisplay70} from './hh-johannes-kronstadt';
import {applyHHHotelHafen70 as importedDelegated_applyHHHotelHafen70,hhHotelHafenDisplay70 as importedDelegated_hhHotelHafenDisplay70} from './hh-hotel-hafen';
import {applyHHSeewetter70 as importedDelegated_applyHHSeewetter70,hhSeewetterDisplay70 as importedDelegated_hhSeewetterDisplay70} from './hh-seewetter';
import {applyHHLandungsbruecken70 as importedDelegated_applyHHLandungsbruecken70,hhLandungsbrueckenDisplay70 as importedDelegated_hhLandungsbrueckenDisplay70} from './hh-landungsbruecken';
import {applyHHFinanzamt70 as importedDelegated_applyHHFinanzamt70,hhFinanzamtDisplay70 as importedDelegated_hhFinanzamtDisplay70} from './hh-finanzamt';
import {applyHHFernsprechamt70 as importedDelegated_applyHHFernsprechamt70,hhFernsprechamtDisplay70 as importedDelegated_hhFernsprechamtDisplay70} from './hh-fernsprechamt';
import {applyHHBismarck70 as importedDelegated_applyHHBismarck70,hhBismarckDisplay70 as importedDelegated_hhBismarckDisplay70} from './hh-bismarck';
import {applyKOTriangle70 as importedDelegated_applyKOTriangle70,koTriangleDisplay70 as importedDelegated_koTriangleDisplay70} from './ko-triangle';
import {applyKOMusicalDome70 as importedDelegated_applyKOMusicalDome70,koMusicalDomeDisplay70 as importedDelegated_koMusicalDomeDisplay70} from './ko-musical-dome';
import {applyKORheinhallen70 as importedDelegated_applyKORheinhallen70,koRheinhallenDisplay70 as importedDelegated_koRheinhallenDisplay70} from './ko-rheinhallen';
import {applyKOAltHeribert70 as importedDelegated_applyKOAltHeribert70,koAltHeribertDisplay70 as importedDelegated_koAltHeribertDisplay70} from './ko-alt-heribert';
import {applyKOJohannesDeutz70 as importedDelegated_applyKOJohannesDeutz70,koJohannesDeutzDisplay70 as importedDelegated_koJohannesDeutzDisplay70} from './ko-johannes-deutz';
import {applyKOStPaul70 as importedDelegated_applyKOStPaul70,koStPaulDisplay70 as importedDelegated_koStPaulDisplay70} from './ko-st-paul';
import {applyKOLanxessTower70 as importedDelegated_applyKOLanxessTower70,koLanxessTowerDisplay70 as importedDelegated_koLanxessTowerDisplay70} from './ko-lanxess-tower';
import {applyKOMalakoffturm70 as importedDelegated_applyKOMalakoffturm70,koMalakoffturmDisplay70 as importedDelegated_koMalakoffturmDisplay70} from './ko-malakoffturm';
import {applyKONeuHeribert70 as importedDelegated_applyKONeuHeribert70,koNeuHeribertDisplay70 as importedDelegated_koNeuHeribertDisplay70} from './ko-neu-heribert';
import {applyKOArtotel70 as importedDelegated_applyKOArtotel70,koArtotelDisplay70 as importedDelegated_koArtotelDisplay70} from './ko-artotel';
import {applyKOHohenzollern70 as importedDelegated_applyKOHohenzollern70,koHohenzollernDisplay70 as importedDelegated_koHohenzollernDisplay70} from './ko-hohenzollern';
import {applyKOPantaleonAnnex70 as importedDelegated_applyKOPantaleonAnnex70,koPantaleonAnnexDisplay70 as importedDelegated_koPantaleonAnnexDisplay70,koPantaleonAnnexReady70 as importedDelegated_koPantaleonAnnexReady70} from './ko-pantaleon-annex';
import {KO_PANTALEON_ANNEX_GLSL,KO_PANTALEON_ANNEX_GLSL_SHA256} from './ko-pantaleon-annex-glsl';
import {prepareKORailConnectionBatch70 as importedDelegated_prepareKORailConnectionBatch70} from './ko-rail-batch70';
import {HC70_GLSL} from './supplement-hc70';
import {OWNER_SHAPE_PATCH_PROFILES as HC70_REGISTRY} from './owner-shape-patch-profiles';
import {applyHNReformierte1 as importedDelegated_applyHNReformierte1,hnReformierteDisplay1 as importedDelegated_hnReformierteDisplay1} from './hn-reformierte';
import {applyDORWE1 as importedDelegated_applyDORWE1,doRWEDisplay1 as importedDelegated_doRWEDisplay1} from './do-rwe';
import {applyBEStMichael1 as importedDelegated_applyBEStMichael1,beStMichaelDisplay1 as importedDelegated_beStMichaelDisplay1} from './be-st-michael';
import {applyDOSparkasse1 as importedDelegated_applyDOSparkasse1,doSparkasseDisplay1 as importedDelegated_doSparkasseDisplay1} from './do-sparkasse';
import {applyHNGalerie1 as importedDelegated_applyHNGalerie1,hnGalerieDisplay1 as importedDelegated_hnGalerieDisplay1} from './hn-galerie';
import {applyBEEmmaus1 as importedDelegated_applyBEEmmaus1,beEmmausDisplay1 as importedDelegated_beEmmausDisplay1} from './be-emmaus';
import {applyHNAltesRathaus1 as importedDelegated_applyHNAltesRathaus1,hnAltesRathausDisplay1 as importedDelegated_hnAltesRathausDisplay1} from './hn-altes-rathaus';
import {applyBECube1 as importedDelegated_applyBECube1,beCubeDisplay1 as importedDelegated_beCubeDisplay1} from './be-cube';
import {applyBESwissEmbassy1 as importedDelegated_applyBESwissEmbassy1,beSwissEmbassyDisplay1 as importedDelegated_beSwissEmbassyDisplay1} from './be-swiss-embassy';
import {applyBEAlexanderplatzStation1 as importedDelegated_applyBEAlexanderplatzStation1,beAlexanderplatzStationDisplay1 as importedDelegated_beAlexanderplatzStationDisplay1} from './be-alexanderplatz-station';
import {applyHNStateArchive1 as importedDelegated_applyHNStateArchive1,hnStateArchiveDisplay1 as importedDelegated_hnStateArchiveDisplay1} from './hn-state-archive';
import {applyBEPaulLobe1 as importedDelegated_applyBEPaulLobe1,bePaulLobeDisplay1 as importedDelegated_bePaulLobeDisplay1} from './be-paul-lobe';
import {applyBEJamesSimon1 as importedDelegated_applyBEJamesSimon1,beJamesSimonDisplay1 as importedDelegated_beJamesSimonDisplay1} from './be-james-simon';
import {applyBEAlteKommandantur1 as importedDelegated_applyBEAlteKommandantur1,beAlteKommandanturDisplay1 as importedDelegated_beAlteKommandanturDisplay1} from './be-alte-kommandantur';
import {applyBENewForeignOffice1 as importedDelegated_applyBENewForeignOffice1,beNewForeignOfficeDisplay1 as importedDelegated_beNewForeignOfficeDisplay1} from './be-new-foreign-office';
import {applyBELittenCourts1 as importedDelegated_applyBELittenCourts1,beLittenCourtsDisplay1 as importedDelegated_beLittenCourtsDisplay1} from './be-litten-courts';
import {applyBETitanic1 as importedDelegated_applyBETitanic1,beTitanicDisplay1 as importedDelegated_beTitanicDisplay1} from './be-titanic';
import {applyBEBCC1 as importedDelegated_applyBEBCC1,beBCCDisplay1 as importedDelegated_beBCCDisplay1} from './be-bcc';
import {applyBESchinkelplatz1 as importedDelegated_applyBESchinkelplatz1,beSchinkelplatzDisplay1 as importedDelegated_beSchinkelplatzDisplay1} from './be-schinkelplatz';
import {applyBEMoabitJVA1 as importedDelegated_applyBEMoabitJVA1,beMoabitJVADisplay1 as importedDelegated_beMoabitJVADisplay1} from './be-moabit-jva';
import {applyBESpreebogen1 as importedDelegated_applyBESpreebogen1,beSpreebogenDisplay1 as importedDelegated_beSpreebogenDisplay1} from './be-spreebogen';
import {applyHNNordlb1 as importedDelegated_applyHNNordlb1,hnNordlbDisplay1 as importedDelegated_hnNordlbDisplay1} from './hn-nordlb';
import {applyBESonyCenter1 as importedDelegated_applyBESonyCenter1,beSonyCenterDisplay1 as importedDelegated_beSonyCenterDisplay1} from './be-sony-center';
import {applyBESpielbankStage1 as importedDelegated_applyBESpielbankStage1,beSpielbankStageDisplay1 as importedDelegated_beSpielbankStageDisplay1} from './be-spielbank-stage';
import {applyBEHedwigEast1 as importedDelegated_applyBEHedwigEast1,beHedwigEastDisplay1 as importedDelegated_beHedwigEastDisplay1} from './be-hedwig-east';
import {applyBEMarieLuders1 as importedDelegated_applyBEMarieLuders1,beMarieLudersDisplay1 as importedDelegated_beMarieLudersDisplay1} from './be-marie-luders';
import {applyHNOberfinanzdirektion1 as importedDelegated_applyHNOberfinanzdirektion1,hnOberfinanzdirektionDisplay1 as importedDelegated_hnOberfinanzdirektionDisplay1} from './hn-oberfinanzdirektion';
import {applyHNHbfPlatforms1 as importedDelegated_applyHNHbfPlatforms1,hnHbfPlatformsDisplay1 as importedDelegated_hnHbfPlatformsDisplay1} from './hn-hbf-platforms';
import {hnStateArchiveBatchIncluded50 as importedDelegated_hnStateArchiveBatchIncluded50,hnStateArchiveShadowSubset50 as importedDelegated_hnStateArchiveShadowSubset50} from './hn-state-archive';
import {OWNER_SHAPE_PATCH_PROFILES as SUPPLEMENT_REGISTRY} from './owner-shape-patch-profiles';
import {SUPPLEMENT_BATCH1_GLSL} from './supplement-batch1';
import {acceptPaintComponent} from '../../../safety/paint-ownership';
import{applyF271Court827 as importedDelegated_applyF271Court827}from'./f271-courtyard827';
import{applyF340Crowns819 as importedDelegated_applyF340Crowns819}from'./f340-crowns819';
import{applyF025North801 as importedDelegated_applyF025North801}from'./f025-north801';
import{applyF025East797 as importedDelegated_applyF025East797}from'./f025-east797';
import{f232StructureHold752 as importedDelegated_f232StructureHold752,applyF232StructurePaint752 as importedDelegated_applyF232StructurePaint752}from'./f232-structure752';
import{f234EquipmentHold751 as importedDelegated_f234EquipmentHold751,applyF234EquipmentPaint751 as importedDelegated_applyF234EquipmentPaint751}from'./f234-equipment751';
import{applyF260Shelters745 as importedDelegated_applyF260Shelters745}from'./f260-shelters745';
import{f384DormersHold738 as importedDelegated_f384DormersHold738,applyF384DormersPaint738 as importedDelegated_applyF384DormersPaint738}from'./f384-dormers738';
import{f384CapsHold736 as importedDelegated_f384CapsHold736,applyF384CapsPaint736 as importedDelegated_applyF384CapsPaint736}from'./f384-caps736';
import{f384FinialsHold735 as importedDelegated_f384FinialsHold735,applyF384FinialsPaint735 as importedDelegated_applyF384FinialsPaint735}from'./f384-finials735';
import{applyF384Overlap732 as importedDelegated_applyF384Overlap732}from'./f384-overlap732';
import{f288PlatformsHold729 as importedDelegated_f288PlatformsHold729,applyF288Platforms729 as importedDelegated_applyF288Platforms729}from'./f288-platforms729';
import{f236PlatformsHold771 as importedDelegated_f236PlatformsHold771,applyF236Platforms771 as importedDelegated_applyF236Platforms771}from'./f236-platforms771';
import{f288BodyHold727 as importedDelegated_f288BodyHold727,applyF288Body727 as importedDelegated_applyF288Body727}from'./f288-body727';
import{f288LinkHold725 as importedDelegated_f288LinkHold725,applyF288Link725 as importedDelegated_applyF288Link725}from'./f288-link725';
import{f260FiguresHold715 as importedDelegated_f260FiguresHold715,applyF260FiguresPaint715 as importedDelegated_applyF260FiguresPaint715}from'./f260-figures715';
import{f260CapsHold710 as importedDelegated_f260CapsHold710,applyF260CapsPaint710 as importedDelegated_applyF260CapsPaint710}from'./f260-caps710';
import{f288SouthHold697 as importedDelegated_f288SouthHold697,applyF288South697 as importedDelegated_applyF288South697}from'./f288-south697';
import{f288TunnelHold692 as importedDelegated_f288TunnelHold692}from'./f288-tunnel692';
import{f236UndergroundHold683 as importedDelegated_f236UndergroundHold683}from'./f236-underground683';
import{f236CorridorHold784 as importedDelegated_f236CorridorHold784}from'./f236-corridor784';
import{applyF236Platforms681 as importedDelegated_applyF236Platforms681,f236PlatformsFragment681 as importedDelegated_f236PlatformsFragment681}from'./f236-platforms681';
import{applyF025Figure663 as importedDelegated_applyF025Figure663,f025FigureFragment663 as importedDelegated_f025FigureFragment663}from'./f025-figure663';
import{applyF020Step661 as importedDelegated_applyF020Step661}from'./f020-step661';
import{applyF020Stone660 as importedDelegated_applyF020Stone660,f020StoneFragment660 as importedDelegated_f020StoneFragment660}from'./f020-stone660';
import{applyF020Turret659 as importedDelegated_applyF020Turret659,f020TurretFragment659 as importedDelegated_f020TurretFragment659}from'./f020-turret659';
import{applyF020Annex658 as importedDelegated_applyF020Annex658,f020AnnexFragment658 as importedDelegated_f020AnnexFragment658}from'./f020-annex658';
import{applyF020Nave657 as importedDelegated_applyF020Nave657,f020NaveFragment657 as importedDelegated_f020NaveFragment657}from'./f020-nave657';
import{applyF020Apse656 as importedDelegated_applyF020Apse656,f020ApseFragment656 as importedDelegated_f020ApseFragment656}from'./f020-apse656';
import{applyF020Buttress655 as importedDelegated_applyF020Buttress655,f020ButtressFragment655 as importedDelegated_f020ButtressFragment655}from'./f020-buttress655';
import{applyF020Chapel654 as importedDelegated_applyF020Chapel654,f020ChapelFragment654 as importedDelegated_f020ChapelFragment654}from'./f020-chapel654';
import{applyF020Spire653 as importedDelegated_applyF020Spire653}from'./f020-spire653';
import{f020Fragment652 as importedDelegated_f020Fragment652}from'./f020-tower652';
import{applyF004Doors645 as importedDelegated_applyF004Doors645}from'./f004-doors645';
import{applyF004Tower645 as importedDelegated_applyF004Tower645}from'./f004-tower645';
import{f004Fragment645 as importedDelegated_f004Fragment645,F004_TOKEN645}from'./f004-detail645';
import{f269Fragment640 as importedDelegated_f269Fragment640,f269Plan640 as importedDelegated_f269Plan640,applyF269640 as importedDelegated_applyF269640,F269_TOKEN640}from'./f269-low-roof640';
import{f285Fragment634 as importedDelegated_f285Fragment634,f285Plan634 as importedDelegated_f285Plan634,applyF285634 as importedDelegated_applyF285634,F285_TOKEN634}from'./f285-restoration634';
import{f235Fragment631 as importedDelegated_f235Fragment631,f235Plan631 as importedDelegated_f235Plan631,applyF235631 as importedDelegated_applyF235631,F235_TOKEN631}from'./f235-upper631';
import{f244Fragment627 as importedDelegated_f244Fragment627,f244Plan627 as importedDelegated_f244Plan627,applyF244627 as importedDelegated_applyF244627,F244_TOKEN627}from'./f244-level627';
import{f244Fragment622 as importedDelegated_f244Fragment622,f244Plan622 as importedDelegated_f244Plan622,applyF244622 as importedDelegated_applyF244622,F244_TOKEN622}from'./f244-main622';
import{f244Fragment619 as importedDelegated_f244Fragment619,f244Plan619 as importedDelegated_f244Plan619,applyF244619 as importedDelegated_applyF244619,F244_TOKEN619}from'./f244-corners619';
import{applyF342Cascade618 as importedDelegated_applyF342Cascade618,f342CascadeFragment618 as importedDelegated_f342CascadeFragment618}from'./f342-cascade618';
import{applyF342Grotto617 as importedDelegated_applyF342Grotto617,f342GrottoFragment617 as importedDelegated_f342GrottoFragment617}from'./f342-grotto617';
import{applyF342Foyer615 as importedDelegated_applyF342Foyer615,f342FoyerFragment615 as importedDelegated_f342FoyerFragment615}from'./f342-foyer615';
import{applyF342Annex613 as importedDelegated_applyF342Annex613}from'./f342-annex613';
import{f358Rose612 as importedDelegated_f358Rose612}from'./f358-rose612';
import{applyF269Cofaces611 as importedDelegated_applyF269Cofaces611}from'./f269-cofaces611';
import{applyF269Connection610 as importedDelegated_applyF269Connection610}from'./f269-connection610';
import{applyF269Neighbors605 as importedDelegated_applyF269Neighbors605}from'./f269-neighbors605';
import{f358Fragment604 as importedDelegated_f358Fragment604,f358Plan604 as importedDelegated_f358Plan604,applyF358604 as importedDelegated_applyF358604,F358_TOKEN604}from'./f358-repair604';
import{applyF278594 as importedDelegated_applyF278594}from'./f278-recovery594';
import{f238Plan595 as importedDelegated_f238Plan595,applyF238Body595 as importedDelegated_applyF238Body595,F238_BODY595_GLSL}from'./f238-body595';
import{applyF242596 as importedDelegated_applyF242596}from'./f242-upper596';
import{applyF250590 as importedDelegated_applyF250590}from'./f250-recovery590';
import{applyF280582 as importedDelegated_applyF280582}from'./f280-recovery582';
import{f303Display465 as importedDelegated_f303Display465,f303Ready465 as importedDelegated_f303Ready465,f303Ready474 as importedDelegated_f303Ready474,f303Ready484 as importedDelegated_f303Ready484,f303SourceDiagnostics582 as importedDelegated_f303SourceDiagnostics582}from'./f303-pavilions465';
import{applyF358Normal579 as importedDelegated_applyF358Normal579,F358_NORMAL579_TOKEN}from'./f358-normal579';
import{applyF022574 as importedDelegated_applyF022574}from'./f022-repair574';
import{applyF269Roof575 as importedDelegated_applyF269Roof575}from'./f269-roof575';
import{f302Plan576 as importedDelegated_f302Plan576,applyF302Crown576 as importedDelegated_applyF302Crown576,f302Diagnostic580 as importedDelegated_f302Diagnostic580}from'./f302-crown576';
import{applyF354Details563 as importedDelegated_applyF354Details563}from'./f354-details563';
import{applyF358Details564 as importedDelegated_applyF358Details564}from'./f358-details564';
import{applyF346Annex562 as importedDelegated_applyF346Annex562,F346_ANNEX562_GLSL,F346_ANNEX562_CLIP,f346ParentClipPick562 as importedDelegated_f346ParentClipPick562}from'./f346-annex562';
import{f302Plan554 as importedDelegated_f302Plan554,applyF302Copy554 as importedDelegated_applyF302Copy554}from'./f302-copy554';
import{f355Plan559 as importedDelegated_f355Plan559,applyF355Hip559 as importedDelegated_applyF355Hip559,F355_HIP559_CLIP,f355ClipPick559 as importedDelegated_f355ClipPick559}from'./f355-hip559';
import{applyF269Roof556 as importedDelegated_applyF269Roof556}from'./f269-roof556';
import{f248Plan551 as importedDelegated_f248Plan551,applyF248Aux551 as importedDelegated_applyF248Aux551}from'./f248-aux551';
import{applyF355548 as importedDelegated_applyF355548}from'./f355-side548';
import{applyFrozenF231547 as importedDelegated_applyFrozenF231547,frozenF231Display547 as importedDelegated_frozenF231Display547,frozenF231Identity547 as importedDelegated_frozenF231Identity547,frozenF231Metadata547 as importedDelegated_frozenF231Metadata547}from'./frozen-leipzig547';
import{applyF236Wings546 as importedDelegated_applyF236Wings546}from'./f236-wings546';
import{applyF248Site534 as importedDelegated_applyF248Site534,F248_SITE_534_GLSL}from'./f248-site534';
import{applyF346540 as importedDelegated_applyF346540}from'./f346-side540';
import{applyFrozenHannover533 as importedDelegated_applyFrozenHannover533}from'./frozen-hannover533';
import{applyF346538 as importedDelegated_applyF346538}from'./f346-side538';
import{applyF236Details530 as importedDelegated_applyF236Details530}from'./f236-details530';
import{applyF236North768 as importedDelegated_applyF236North768}from'./f236-north768';
import{applyF248Site525 as importedDelegated_applyF248Site525,F248_SITE_525_GLSL}from'./f248-site525';
import{applyF236Display524 as importedDelegated_applyF236Display524}from'./f236-source-display524';
import{applyF382North519 as importedDelegated_applyF382North519}from'./f382-north519';
import{applyF373Details516 as importedDelegated_applyF373Details516}from'./f373-details516';
import{applyF315Front515 as importedDelegated_applyF315Front515}from'./f315-front515';
import{applyF372Details507 as importedDelegated_applyF372Details507}from'./f372-details507';
import{applyF331Neues503 as importedDelegated_applyF331Neues503}from'./f331-neues503';
import{applyF364Court505 as importedDelegated_applyF364Court505}from'./f364-court505';
import{applyF363501 as importedDelegated_applyF363501}from'./f363-native501';
import{f363Plan518 as importedDelegated_f363Plan518,applyF363Copy518 as importedDelegated_applyF363Copy518}from'./f363-copy518';
import{applyF315Details504 as importedDelegated_applyF315Details504}from'./f315-details504';
import{applyF356Entry495 as importedDelegated_applyF356Entry495,f356EntryPlan495 as importedDelegated_f356EntryPlan495}from'./f356-entry495';
import{applyF364Court498 as importedDelegated_applyF364Court498}from'./f364-court498';
import{f303Plan508 as importedDelegated_f303Plan508,applyF303Copy508 as importedDelegated_applyF303Copy508}from'./f303-gate508';
import{applyF331Bergpalais494 as importedDelegated_applyF331Bergpalais494}from'./f331-bergpalais494';
import{applyF329Details489 as importedDelegated_applyF329Details489}from'./f329-details489';
import{applyF323Entry488 as importedDelegated_applyF323Entry488,f323EntryPlan488 as importedDelegated_f323EntryPlan488}from'./f323-entry488';
import{applyF243482 as importedDelegated_applyF243482}from'./f243-sculptures482';
import{applyF363472 as importedDelegated_applyF363472}from'./f363-current472';
import{applyF327Details478 as importedDelegated_applyF327Details478}from'./f327-details478';
import{applyF323476 as importedDelegated_applyF323476,f323Plan476 as importedDelegated_f323Plan476}from'./f323-body476';
import{applyF322Details483 as importedDelegated_applyF322Details483}from'./f322-details483';
import{applyF248Machine469 as importedDelegated_applyF248Machine469,F248_MACHINE_469_GLSL}from'./f248-machine469';
import{applyF303465 as importedDelegated_applyF303465}from'./f303-pavilions465';
import{applyF345Repair467 as importedDelegated_applyF345Repair467}from'./f345-repair467';
import{applyF044463 as importedDelegated_applyF044463,applyF044527 as importedDelegated_applyF044527,f044Plan463 as importedDelegated_f044Plan463}from'./f044-native463';
import{applyF315Details461 as importedDelegated_applyF315Details461}from'./f315-details461';
import{applyF044447 as importedDelegated_applyF044447,f044Plan447 as importedDelegated_f044Plan447}from'./f044-native447';
import{applyF336431 as importedDelegated_applyF336431}from'./f336-castle431';
import{applyF360User420 as importedDelegated_applyF360User420}from'./f360-user420';
import{applyF044427 as importedDelegated_applyF044427,f044Plan427 as importedDelegated_f044Plan427}from'./f044-native427';
import{applyF059437 as importedDelegated_applyF059437}from'./f059-memorial437';
import{applyF336425 as importedDelegated_applyF336425}from'./f336-castle425';
import{applyF025417 as importedDelegated_applyF025417}from'./f025-dom417';
import{applyF237412 as importedDelegated_applyF237412}from'./f237-ruin412';
import{applyF349406 as importedDelegated_applyF349406}from'./f349-portico406';
import{applyF359East410 as importedDelegated_applyF359East410}from'./f359-east410';
import{applyF295419 as importedDelegated_applyF295419}from'./f295-headframe419';
import{applyF288Reception405 as importedDelegated_applyF288Reception405,f288Plan405 as importedDelegated_f288Plan405}from'./f288-reception405';
import{applyF288Reception399 as importedDelegated_applyF288Reception399}from'./f288-reception399';
import{applyF271Upper395 as importedDelegated_applyF271Upper395}from'./f271-upper395';
import{applyF310Recovery394 as importedDelegated_applyF310Recovery394}from'./f310-recovery394';
import{applyF382388 as importedDelegated_applyF382388}from'./f382-opera388';
import{applyF356Carve396 as importedDelegated_applyF356Carve396}from'./f356-carve396';
import{applyF337Current386 as importedDelegated_applyF337Current386,f337Plan386 as importedDelegated_f337Plan386}from'./f337-openruin386';
import{applyF327Recovery381 as importedDelegated_applyF327Recovery381}from'./f327-recovery381';
import{applyF329Current380 as importedDelegated_applyF329Current380}from'./f329-current380';
import{applyF258382 as importedDelegated_applyF258382}from'./f258-relief382';
import{applyF322Current372 as importedDelegated_applyF322Current372}from'./f322-current372';
import{applyF323Details373 as importedDelegated_applyF323Details373}from'./f323-details373';
import{applyF363Top369 as importedDelegated_applyF363Top369}from'./f363-top369';
import{applyF248Sidewing368 as importedDelegated_applyF248Sidewing368,F248_SIDEWING_368_GLSL}from'./f248-sidewing368';
import{applyF363Roof360 as importedDelegated_applyF363Roof360}from'./f363-roof360';
import{applyF363Native360 as importedDelegated_applyF363Native360}from'./f363-native360';
import{f331PhotoPlan344 as importedDelegated_f331PhotoPlan344,applyF331PhotoPaint344 as importedDelegated_applyF331PhotoPaint344}from'./f331-photo344';
import{PROGRESSIVE_FEATURE_GLSL as F331_PROGRAM344}from'./progressive-feature-glsl';
import{applyF372Repair350 as importedDelegated_applyF372Repair350,applyF372Gallery371 as importedDelegated_applyF372Gallery371}from'./f372-repair350';
import{s018Plan345 as importedDelegated_s018Plan345,applyS018Paint345 as importedDelegated_applyS018Paint345}from'./s018-owner345';
import{PROGRESSIVE_FEATURE_GLSL as S018_PROGRAM345}from'./progressive-feature-glsl';
import{applyF364East348 as importedDelegated_applyF364East348}from'./f364-east348';
import{applyF364Body338 as importedDelegated_applyF364Body338}from'./f364-body338';
import{applyF243Proxy330 as importedDelegated_applyF243Proxy330}from'./f243-proxy330';
import{applyF315AcceptedPartial332 as importedDelegated_applyF315AcceptedPartial332}from'./f315-accepted-partial332';
import{applyF364Front335 as importedDelegated_applyF364Front335}from'./f364-front335';
import{nativePaintSignature as importedDelegated_nativePaintSignature}from'./progressive-native-signature';
import{applyF364Coface331 as importedDelegated_applyF364Coface331}from'./f364-coface333';
import{applyF360Recovery401 as importedDelegated_applyF360Recovery401}from'./f360-recovery401';
import{applyF364Paint325 as importedDelegated_applyF364Paint325}from'./f364-native-paint325';
import{applyF305Native323 as importedDelegated_applyF305Native323}from'./f305-native-paint323';
import{f232MainPlan315 as importedDelegated_f232MainPlan315,applyF232Main315 as importedDelegated_applyF232Main315}from'./f232-main-recovery315';
import{applyF058Upper312 as importedDelegated_applyF058Upper312}from'./f058-upper-paint312';
import{applyF021Nave306 as importedDelegated_applyF021Nave306}from'./f021-nave-paint306';
import{applyF021Tower295 as importedDelegated_applyF021Tower295}from'./f021-tower-paint295';
import{applyF013Canopy294 as importedDelegated_applyF013Canopy294}from'./f013-canopy-paint294';
import {applyF003RecoveryPaint287 as importedDelegated_applyF003RecoveryPaint287}from'./f003-source-recovery-paint287';
import {applyF269RecoveryPaint284 as importedDelegated_applyF269RecoveryPaint284} from './f269-source-recovery-paint284';
import {applyF061RecoveryPaint279 as importedDelegated_applyF061RecoveryPaint279} from './f061-source-recovery-paint279';
import {applyF061Court829 as importedDelegated_applyF061Court829} from './f061-court829';
import {applyF061SideNative829 as importedDelegated_applyF061SideNative829} from './f061-side-native829';
import {applyF061Nave833 as importedDelegated_applyF061Nave833} from './f061-nave833';
import {f331RemainderPlan276 as importedDelegated_f331RemainderPlan276} from './f331-source-remainder276';
import {ownerShapePatchProfile as importedDelegated_f331Descriptor276} from './owner-shape-patch-display';
import {nativePaintSignature as importedDelegated_f331Signature276} from './progressive-native-signature';
import {applyF063RecoveryPaint272 as importedDelegated_applyF063RecoveryPaint272} from './f063-source-recovery-paint272';
import {f373LowerHeadPlan269 as importedDelegated_f373LowerHeadPlan269,applyF373LowerHeadPaint269 as importedDelegated_applyF373LowerHeadPaint269} from './f373-lower-head-recovery269';
import {f260CanopyDisplay267 as importedDelegated_f260CanopyDisplay267,applyF260CanopyPaint267 as importedDelegated_applyF260CanopyPaint267} from './f260-canopy-recovery267';
import {applyF355Tower220 as importedDelegated_applyF355Tower220,f355TowerDisplay220 as importedDelegated_f355TowerDisplay220} from './f355-tower220';
import {applyF248Recovery214 as importedDelegated_applyF248Recovery214,f248RecoveryDisplay214 as importedDelegated_f248RecoveryDisplay214,F248_RECOVERY_214_GLSL} from './f248-recovery214';
import {applyF348Detail181 as importedDelegated_applyF348Detail181,F348_DETAIL_GLSL} from './f348-detail181';
import {applyF46RecoveryPaint as importedDelegated_applyF46RecoveryPaint,F46_RECOVERY_SURFACE_GLSL} from './f46-recovery-paint';
import {applyF260RecoveryPaint264 as importedDelegated_applyF260RecoveryPaint264} from './f260-source-recovery-paint264';
import {paintBoxOutsideClip as importedDelegated_paintBoxOutsideClip,paintRunIntersectsVisible as importedDelegated_paintRunIntersectsVisible,readPaintVisibility,forgetPaintVisibility} from './paint-run-visibility';
import {paintProgramRuns as importedDelegated_paintProgramRuns,type PaintProgramRun} from './paint-program-runs';
import {applyF151CrownMask as importedDelegated_applyF151CrownMask,f151CrownPickDiscard as importedDelegated_f151CrownPickDiscard,type F151CrownPlan} from './f151-crown-display';
import {applyS240BaseCoface as importedDelegated_applyS240BaseCoface,type S240BasePlan} from './s240-base-coface-display';
import {applyS036NorthCoface as importedDelegated_applyS036NorthCoface,s036Roof009PickDiscard as importedDelegated_s036Roof009PickDiscard,S036_ROOF009_MASK_GLSL,type S036NorthPlan} from './s036-north-coface-display';
import {applyS402ConnectorMask as importedDelegated_applyS402ConnectorMask,s402ConnectorPickDiscard as importedDelegated_s402ConnectorPickDiscard,S402_CONNECTOR_MASK_GLSL,type S402Plan} from './s402-connector-display';
import {s196ArchShadowSubset as importedDelegated_s196ArchShadowSubset} from './s196-arch-display';
import {sourceRoleBatchIncluded as importedDelegated_sourceRoleBatchIncluded,sourceRoleDisplayProfile as importedDelegated_sourceRoleDisplayProfile} from './source-role-display';
import {s434AggregateBatchIncluded as importedDelegated_s434AggregateBatchIncluded,type S434AggregateProfile} from './s434-aggregate-display';
import type {S434AggregatePackingState} from './s434-aggregate-lifecycle';
import {readPaintGPUDiagnostic as importedDelegated_readPaintGPUBufferDiagnostic} from './source-partial-gate-gpu-diagnostic';
import {applyPartialGateMask as importedDelegated_applyPartialGateMask,partialGatePickDiscard as importedDelegated_partialGatePickDiscard,PARTIAL_GATE_MASK_GLSL,type PartialGatePlan} from './source-partial-gate-display';
import {createNativeSourceReadback as importedDelegated_createNativeSourceReadback} from './native-source-readback';
import {isProgressivelyPainted as importedDelegated_isProgressivelyPainted,progressivePaintRejections as importedDelegated_progressivePaintRejections,progressivePaintData as importedDelegated_progressivePaintData,progressivePaintCount as importedDelegated_progressivePaintCount,progressiveRenderView as importedDelegated_progressiveRenderView,progressivePaintFingerprints as importedDelegated_progressivePaintFingerprints} from './progressive-paint';
import {createRathausProxyMasks as importedDelegated_createRathausProxyMasks,RATHAUS_PROXY_MASK_GLSL} from './facade-rathaus-proxy-mask';
import {DESCRIPTION_BINDINGS} from './facade-description-bindings';
import {FACADE_OPENING_GLSL} from './facade-opening-primitives';
import {FACADE_LAYOUT_GLSL,uploadFacadeLayouts as importedDelegated_uploadFacadeLayouts} from './facade-layouts';
import {facadePaintData as importedDelegated_facadePaintData} from './facade-paint-frame';
import {describeFacadePaintSource,describeFacadePaintSourceBounds,getFacadePaintFragmentGLSL as importedDelegated_getFacadePaintFragmentGLSL,clearDelegated500PaintSources as clearDelegated500PaintSourcesForScope,facadePaintFragmentForCity as importedDelegated_facadePaintFragmentForCity,facadePaintSpecializationForCity as importedDelegated_facadePaintSpecializationForCity,paintProgramPartitionEnabled as importedDelegated_paintProgramPartitionEnabled,paintProgramKey as importedDelegated_paintProgramKey,paintProgramFragment as importedDelegated_paintProgramFragment} from './facade-paint-fragment';
import {exactCurrentPaintProgramKeys as importedDelegated_exactCurrentPaintProgramKeys,currentPaintProgramKey as importedDelegated_currentPaintProgramKey,currentPaintProgramFamily as importedDelegated_currentPaintProgramFamily,paintedFacadeDepthEffects as importedDelegated_paintedFacadeDepthEffects,specializeCurrentPaintProgram as importedDelegated_specializeCurrentPaintProgram,trimInactivePaintPrograms as importedDelegated_trimInactivePaintPrograms} from './current-paint-program';
import {classifyProjectedDetail,type ProjectedDetailQuality} from '../../../safety/projected-detail-policy';
import {hamburgPartitionFamily} from './hamburg-partition-family';
import {specializeRoundedPaintProgram} from './current-paint-program';
import {facadePaintToolsRequested} from '../../../safety/facade-paint-controls';
import {BERLIN_DISTANT_PAUL_LOBE_KEY,BERLIN_DISTANT_PAUL_LOBE_FAMILY,berlinDistantFamily as importedDelegated_berlinDistantFamily,berlinPaulLobeProgramsEqual as importedDelegated_berlinPaulLobeProgramsEqual,berlinExactRichProgramKeys as importedDelegated_berlinExactRichProgramKeys,berlinPaulLobeRichKey as importedDelegated_berlinPaulLobeRichKey,berlinDistantContractAvailable as importedDelegated_berlinDistantContractAvailable,berlinDistantPaintFragment as importedDelegated_berlinDistantPaintFragment,retireBerlinDistantAlternates as importedDelegated_retireBerlinDistantAlternates} from './berlin-distant-paint';
import {paintMode as importedDelegated_paintMode,paintOverride as importedDelegated_paintOverride} from './facade-paint-controls';
import {isSourceOnlyGlassRoof as importedDelegated_isSourceOnlyGlassRoof} from './source-glass-roof-style';
import type {NativeGroupDisplayPlan} from './native-part-display';
import {exactNativePartDisplay as importedDelegated_exactNativePartDisplay} from './source-part-display';
import {isFacadeLandmark as importedDelegated_isFacadeLandmark} from './facade-landmark-registry';
import type {createOpenFacadeDiffuse} from './open-facade-diffuse';
import type {createOpenFacadeWindowTexture} from './open-facade-window-texture';
import {SOURCE_SHADOW_VECTOR,sourceShadowOpacity as importedDelegated_sourceShadowOpacity} from './source-shadow';
import {S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL} from './s402-connector-shadow';
/** Source-owned roof/wall meshes on the existing MapLibre WebGL2 context. No second map engine. */
type PreparedDelegated500Data=BasePreparedDelegated500Data&{readonly chunkInput?:RendererChunkInput<BuildingComponent>;releaseChunkDependencies?:()=>void;release?:()=>void};
export type PreparedDelegated500Batches=PreparedDelegated500Data&{readonly chunkInput?:RendererChunkInput<BuildingComponent>;releaseChunkDependencies():void;release():void};
export type Delegated500ChunkPreparation={nextGeneration:number;shadowAdmission?:ShadowBatchAdmission;nativeDisplay?:NativeGroupDisplayPlan;partialGatePlan?:PartialGatePlan;s402Plan?:S402Plan;s434Plan?:S434AggregatePackingState;s036Plan?:S036NorthPlan;s240Plan?:S240BasePlan;f151Plan?:F151CrownPlan};
type DelegatedLoadedComponent=BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number};
type DelegatedPackedCPU=PackedBuildingChunk&{progressiveView:ReturnType<typeof importedDelegated_progressiveRenderView>;partialGateDisplay:ReturnType<typeof importedDelegated_applyPartialGateMask>;s402ConnectorDisplay:ReturnType<typeof importedDelegated_applyS402ConnectorMask>;s036NorthCofaceDisplay:ReturnType<typeof importedDelegated_applyS036NorthCoface>;s240BaseCofaceDisplay:ReturnType<typeof importedDelegated_applyS240BaseCoface>;f151CrownDisplay:ReturnType<typeof importedDelegated_applyF151CrownMask>};
type DelegatedPackedChunk={contentKey:string;source:RendererSourceGroup<BuildingComponent>;cpu:ChunkResourceLease<DelegatedPackedCPU>;dynamic:ChunkResourceLease<Float32Array>;stateData:Float32Array;loaded:Map<string,DelegatedLoadedComponent>;masks:ReturnType<typeof importedDelegated_createRathausProxyMasks>;maskBindingKey?:string;runs:ReturnType<typeof importedDelegated_paintProgramRuns>;anchor:[number,number];unit:number;geometry?:ResidentGeometryLease;shadow?:ResidentGeometryLease;shadowCPU?:ChunkResourceLease<Uint32Array>;shadowIndices:Uint32Array;shadowIndexCount?:number;dirtyState?:RendererStateRange};
type DelegatedSceneSpan={chunk:DelegatedPackedChunk;firstIndex:number;indexCount:number;localFirstIndex:number};
export type SurfaceHit=Identity&{generation:number;viewRevision:number;hitLngLat:[number,number];hitAltitudeM:number;surface:'roof'|'wall';distance:number;opacityContext:'normal'|'route-selection';surfaceOpacity:number;occludesGround:boolean};
export type MapSurface={getCanvas():HTMLCanvasElement;on(type:string,fn:()=>void):void;off(type:string,fn:()=>void):void;triggerRepaint():void};
const C=2*Math.PI*6378137,EPS=1e-9;
const merc=(q:[number,number]):[number,number]=>[(q[0]+180)/360,(1-Math.log(Math.tan(Math.PI/4+q[1]*Math.PI/360))/Math.PI)/2];
const geo=(x:number,y:number):[number,number]=>[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];
const unit=(lat:number)=>C*Math.cos(lat*Math.PI/180);
const key=(i:Identity)=>i.objectId+'|'+i.partId;
function multiply(a:ArrayLike<number>,b:ArrayLike<number>){const out=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function inverse(m:ArrayLike<number>){const rows=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?m[c*4+r]:Number(c-4===r)));for(let c=0;c<4;c++){let p=c;for(let r=c+1;r<4;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;if(Math.abs(rows[p][c])<1e-20)return;[rows[c],rows[p]]=[rows[p],rows[c]];const div=rows[c][c];for(let k=0;k<8;k++)rows[c][k]/=div;for(let r=0;r<4;r++)if(r!==c){const factor=rows[r][c];for(let k=0;k<8;k++)rows[r][k]-=factor*rows[c][k];}}return new Float64Array(Array.from({length:16},(_,i)=>rows[i%4][4+Math.floor(i/4)]));}
function project(m:ArrayLike<number>,x:number,y:number,z:number){const q=[x,y,z,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[r]+=m[c*4+r]*q[c];return o.slice(0,3).map(n=>n/o[3]);}
const sub=(a:number[],b:number[])=>a.map((n,i)=>n-b[i]);
function triangle(origin:number[],direction:number[],vertices:Float32Array,stateData:Float32Array,ia:number,ib:number,ic:number,nearest?:number){
 const a=ia*9,b=ib*9,c=ic*9,ax=vertices[a],ay=vertices[a+1]*(stateData[ia]%2),az=vertices[a+2],bx=vertices[b],by=vertices[b+1]*(stateData[ib]%2),bz=vertices[b+2],cx=vertices[c],cy=vertices[c+1]*(stateData[ic]%2),cz=vertices[c+2];
 const ex=bx-ax,ey=by-ay,ez=bz-az,fx=cx-ax,fy=cy-ay,fz=cz-az,px=direction[1]*fz-direction[2]*fy,py=direction[2]*fx-direction[0]*fz,pz=direction[0]*fy-direction[1]*fx,det=0+ex*px+ey*py+ez*pz;
 if(Math.abs(det)<EPS)return;
 const inv=1/det,tx=origin[0]-ax,ty=origin[1]-ay,tz=origin[2]-az,u=(0+tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)return;
 const qx=ty*ez-tz*ey,qy=tz*ex-tx*ez,qz=tx*ey-ty*ex,v=(0+direction[0]*qx+direction[1]*qy+direction[2]*qz)*inv;if(v<0||u+v>1)return;
 const distance=(0+fx*qx+fy*qy+fz*qz)*inv;if(!(distance>=0)||(nearest!==undefined&&distance>=nearest))return;
 return {distance,normal:[ey*fz-ez*fy,ez*fx-ex*fz,ex*fy-ey*fx],barycentric:[1-u-v,u,v]};
}
function boxHit(origin:number[],direction:number[],box:number[]){let near=-Infinity,far=Infinity;for(let i=0;i<3;i++){if(Math.abs(direction[i])<EPS){if(origin[i]<box[i]||origin[i]>box[i+3])return false;continue;}let a=(box[i]-origin[i])/direction[i],b=(box[i+3]-origin[i])/direction[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return far>=0;}
type DelegatedOptionalBusinessTail<A extends unknown[]>=A extends [...infer P,infer Last]?undefined extends Last?[...DelegatedOptionalBusinessTail<P>,value?:Exclude<Last,undefined>]:A:A;
type DelegatedBusinessArgs<A extends unknown[]>=A extends [...infer P,FrozenDataScope]?DelegatedOptionalBusinessTail<P>:A extends [...infer P,FrozenDataScope?]?DelegatedOptionalBusinessTail<P>:A;
type DelegatedScopedValue<T>=T extends (...args:infer A)=>infer R?Required<A> extends [...infer _P,infer Last]?[Last] extends [FrozenDataScope]?(...args:DelegatedBusinessArgs<A>)=>R:T:T:T;
const delegatedColourSourceAuthority=createProgramSourceAuthority({inputs:['delegated500-colour-assembly-v1','attributes:position-normal-color-selected-frame-family-progressive'],builders:[...delegated500ScopedFunctionArities.keys(),withResidentReflectionClip]});
// The admitted workspace and wrapper descriptors are part of each colour source.
const delegatedPreparedSourceAuthority=createProgramSourceAuthority({inputs:['delegated500-prepared-source-v1','wrappers:material-22-legacy-10-distant-1','specialize:current-paint-program'],builders:[createPreparedSourceWorkspace,applyDelegatedPaintWrappers,describeDelegatedWrappedPaintBounds,existingShaderTextBoundPart]});
const DELEGATED_COLOUR_ATTRIBUTES:readonly string[]=Object.freeze(['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);
type DelegatedColourSourceRecipe=PreparedSourceRecipe&{readonly paint:()=>string};
/** Components must already be admitted against the exact municipal polygon by the source compiler. */
let delegatedChunkInstanceSequence=0;
export function createBuildingMeshRenderer(map:MapSurface,city:string,{mobile=false,id='source-building-meshes',reducedMotion=false,clock=()=>performance.now(),surfaceStyle, surfaceFragment,baseSurfaceFragment,windowTexture,diffuseFragment,diffuseTexture,sourceLineage70,nativeLeaf,ownerPatchLeaf,frozenData}:{mobile?:boolean;frozenData?:FrozenDataClient;id?:string;reducedMotion?:boolean;clock?:()=>number;surfaceStyle?:(p:Record<string,unknown>|null)=>{styleId:number};surfaceFragment?:string;baseSurfaceFragment?:string;windowTexture?:ReturnType<typeof createOpenFacadeWindowTexture>;diffuseFragment?:string;diffuseTexture?:ReturnType<typeof createOpenFacadeDiffuse>;sourceLineage70?:()=>KORailLineage70|undefined;nativeLeaf?:(c:BuildingComponent)=>string|undefined;ownerPatchLeaf?:(c:BuildingComponent)=>string|undefined}={}){
 let solarCaptureToken:string|undefined,reflectionCaptureToken:string|undefined,reflectionDemandPlanned=false,surfaceContentRevision=0;
 let reflectionDemandKeys=new Set<string>(),heldCaptureDemandKeys=new Set<string>();const reflectionProgramFailures=new Map<string,string>();
 let residentPreparedData:PreparedDelegated500Data|undefined,committingPreparedData:PreparedDelegated500Data|undefined,residentScopeRelease:(()=>void)|undefined;
 let dataPreparationSequence=0,dataPreparationPending:{token:number;signal:AbortSignal;nextGeneration?:number;receipt?:PreparedDelegated500Data;scope?:FrozenDataScope;controller:AbortController;abortCleanup?:()=>void;cancelLoading?:()=>void}|undefined;
 let materialRequestSequence=0,residentLifecycleRevision=0,committedGeneration=0,batchPreparationFailure:string|undefined;
 function scopedCall(fn:Function,args:unknown[]){const arity=delegated500ScopedFunctionArities.get(fn);if(arity===undefined)return fn(...args);const data=committingPreparedData??residentPreparedData;if(!data)throw Error('Delegated500 data was not prepared for this operation');const values=args.slice(0,arity);while(values.length<arity)values.push(undefined);values.push(data.scope);return fn(...values);}
 function scopedValue<T>(value:T):DelegatedScopedValue<T>{return(typeof value==='function'?((...args:unknown[])=>scopedCall(value,args)):value)as unknown as DelegatedScopedValue<T>;}
 function withPreparedData<T>(data:PreparedDelegated500Data,run:()=>T):T{const previous=committingPreparedData,release=data.scope.retain();committingPreparedData=data;try{return run();}finally{committingPreparedData=previous;release();}}
 const applyKOLudwigWorkshop70=scopedValue(importedDelegated_applyKOLudwigWorkshop70);
 const koLudwigWorkshopReady70=scopedValue(importedDelegated_koLudwigWorkshopReady70);
 const applyKOPantaleonGate70=scopedValue(importedDelegated_applyKOPantaleonGate70);
 const koPantaleonGateDisplay70=scopedValue(importedDelegated_koPantaleonGateDisplay70);
 const koPantaleonGateReady70=scopedValue(importedDelegated_koPantaleonGateReady70);
 const applyKOMesseturmCrown70=scopedValue(importedDelegated_applyKOMesseturmCrown70);
 const koMesseturmCrownDisplay70=scopedValue(importedDelegated_koMesseturmCrownDisplay70);
 const koMesseturmCrownReady70=scopedValue(importedDelegated_koMesseturmCrownReady70);
 const createIndexedPickBlocks70=scopedValue(importedDelegated_createIndexedPickBlocks70);
 const indexedPickBlockHit70=scopedValue(importedDelegated_indexedPickBlockHit70);
 const koRailUploadCapacity70=scopedValue(importedDelegated_koRailUploadCapacity70);
 const applyHHStrafjustiz70=scopedValue(importedDelegated_applyHHStrafjustiz70);
 const hhStrafjustizDisplay70=scopedValue(importedDelegated_hhStrafjustizDisplay70);
 const applyHHSpiegelEricus70=scopedValue(importedDelegated_applyHHSpiegelEricus70);
 const hhSpiegelEricusDisplay70=scopedValue(importedDelegated_hhSpiegelEricusDisplay70);
 const applyHHSchanzen70=scopedValue(importedDelegated_applyHHSchanzen70);
 const hhSchanzenDisplay70=scopedValue(importedDelegated_hhSchanzenDisplay70);
 const applyHHOberlandesgericht70=scopedValue(importedDelegated_applyHHOberlandesgericht70);
 const hhOberlandesgerichtDisplay70=scopedValue(importedDelegated_hhOberlandesgerichtDisplay70);
 const applyHHZiviljustiz70=scopedValue(importedDelegated_applyHHZiviljustiz70);
 const hhZiviljustizDisplay70=scopedValue(importedDelegated_hhZiviljustizDisplay70);
 const applyHHFlakbunker70=scopedValue(importedDelegated_applyHHFlakbunker70);
 const hhFlakbunkerDisplay70=scopedValue(importedDelegated_hhFlakbunkerDisplay70);
 const applyHHFontenay70=scopedValue(importedDelegated_applyHHFontenay70);
 const hhFontenayDisplay70=scopedValue(importedDelegated_hhFontenayDisplay70);
 const applyHHMARKK70=scopedValue(importedDelegated_applyHHMARKK70);
 const hhMARKKDisplay70=scopedValue(importedDelegated_hhMARKKDisplay70);
 const applyHHDammtor70=scopedValue(importedDelegated_applyHHDammtor70);
 const hhDammtorDisplay70=scopedValue(importedDelegated_hhDammtorDisplay70);
 const applyHHESA1_70=scopedValue(importedDelegated_applyHHESA1_70);
 const hhESA1Display70=scopedValue(importedDelegated_hhESA1Display70);
 const applyHHESAEast70=scopedValue(importedDelegated_applyHHESAEast70);
 const hhESAEastDisplay70=scopedValue(importedDelegated_hhESAEastDisplay70);
 const applyHHJohannesKronstadt70=scopedValue(importedDelegated_applyHHJohannesKronstadt70);
 const hhJohannesKronstadtDisplay70=scopedValue(importedDelegated_hhJohannesKronstadtDisplay70);
 const applyHHHotelHafen70=scopedValue(importedDelegated_applyHHHotelHafen70);
 const hhHotelHafenDisplay70=scopedValue(importedDelegated_hhHotelHafenDisplay70);
 const applyHHSeewetter70=scopedValue(importedDelegated_applyHHSeewetter70);
 const hhSeewetterDisplay70=scopedValue(importedDelegated_hhSeewetterDisplay70);
 const applyHHLandungsbruecken70=scopedValue(importedDelegated_applyHHLandungsbruecken70);
 const hhLandungsbrueckenDisplay70=scopedValue(importedDelegated_hhLandungsbrueckenDisplay70);
 const applyHHFinanzamt70=scopedValue(importedDelegated_applyHHFinanzamt70);
 const hhFinanzamtDisplay70=scopedValue(importedDelegated_hhFinanzamtDisplay70);
 const applyHHFernsprechamt70=scopedValue(importedDelegated_applyHHFernsprechamt70);
 const hhFernsprechamtDisplay70=scopedValue(importedDelegated_hhFernsprechamtDisplay70);
 const applyHHBismarck70=scopedValue(importedDelegated_applyHHBismarck70);
 const hhBismarckDisplay70=scopedValue(importedDelegated_hhBismarckDisplay70);
 const applyKOTriangle70=scopedValue(importedDelegated_applyKOTriangle70);
 const koTriangleDisplay70=scopedValue(importedDelegated_koTriangleDisplay70);
 const applyKOMusicalDome70=scopedValue(importedDelegated_applyKOMusicalDome70);
 const koMusicalDomeDisplay70=scopedValue(importedDelegated_koMusicalDomeDisplay70);
 const applyKORheinhallen70=scopedValue(importedDelegated_applyKORheinhallen70);
 const koRheinhallenDisplay70=scopedValue(importedDelegated_koRheinhallenDisplay70);
 const applyKOAltHeribert70=scopedValue(importedDelegated_applyKOAltHeribert70);
 const koAltHeribertDisplay70=scopedValue(importedDelegated_koAltHeribertDisplay70);
 const applyKOJohannesDeutz70=scopedValue(importedDelegated_applyKOJohannesDeutz70);
 const koJohannesDeutzDisplay70=scopedValue(importedDelegated_koJohannesDeutzDisplay70);
 const applyKOStPaul70=scopedValue(importedDelegated_applyKOStPaul70);
 const koStPaulDisplay70=scopedValue(importedDelegated_koStPaulDisplay70);
 const applyKOLanxessTower70=scopedValue(importedDelegated_applyKOLanxessTower70);
 const koLanxessTowerDisplay70=scopedValue(importedDelegated_koLanxessTowerDisplay70);
 const applyKOMalakoffturm70=scopedValue(importedDelegated_applyKOMalakoffturm70);
 const koMalakoffturmDisplay70=scopedValue(importedDelegated_koMalakoffturmDisplay70);
 const applyKONeuHeribert70=scopedValue(importedDelegated_applyKONeuHeribert70);
 const koNeuHeribertDisplay70=scopedValue(importedDelegated_koNeuHeribertDisplay70);
 const applyKOArtotel70=scopedValue(importedDelegated_applyKOArtotel70);
 const koArtotelDisplay70=scopedValue(importedDelegated_koArtotelDisplay70);
 const applyKOHohenzollern70=scopedValue(importedDelegated_applyKOHohenzollern70);
 const koHohenzollernDisplay70=scopedValue(importedDelegated_koHohenzollernDisplay70);
 const applyKOPantaleonAnnex70=scopedValue(importedDelegated_applyKOPantaleonAnnex70);
 const koPantaleonAnnexDisplay70=scopedValue(importedDelegated_koPantaleonAnnexDisplay70);
 const koPantaleonAnnexReady70=scopedValue(importedDelegated_koPantaleonAnnexReady70);
 const prepareKORailConnectionBatch70=scopedValue(importedDelegated_prepareKORailConnectionBatch70);
 const applyHNReformierte1=scopedValue(importedDelegated_applyHNReformierte1);
 const hnReformierteDisplay1=scopedValue(importedDelegated_hnReformierteDisplay1);
 const applyDORWE1=scopedValue(importedDelegated_applyDORWE1);
 const doRWEDisplay1=scopedValue(importedDelegated_doRWEDisplay1);
 const applyBEStMichael1=scopedValue(importedDelegated_applyBEStMichael1);
 const beStMichaelDisplay1=scopedValue(importedDelegated_beStMichaelDisplay1);
 const applyDOSparkasse1=scopedValue(importedDelegated_applyDOSparkasse1);
 const doSparkasseDisplay1=scopedValue(importedDelegated_doSparkasseDisplay1);
 const applyHNGalerie1=scopedValue(importedDelegated_applyHNGalerie1);
 const hnGalerieDisplay1=scopedValue(importedDelegated_hnGalerieDisplay1);
 const applyBEEmmaus1=scopedValue(importedDelegated_applyBEEmmaus1);
 const beEmmausDisplay1=scopedValue(importedDelegated_beEmmausDisplay1);
 const applyHNAltesRathaus1=scopedValue(importedDelegated_applyHNAltesRathaus1);
 const hnAltesRathausDisplay1=scopedValue(importedDelegated_hnAltesRathausDisplay1);
 const applyBECube1=scopedValue(importedDelegated_applyBECube1);
 const beCubeDisplay1=scopedValue(importedDelegated_beCubeDisplay1);
 const applyBESwissEmbassy1=scopedValue(importedDelegated_applyBESwissEmbassy1);
 const beSwissEmbassyDisplay1=scopedValue(importedDelegated_beSwissEmbassyDisplay1);
 const applyBEAlexanderplatzStation1=scopedValue(importedDelegated_applyBEAlexanderplatzStation1);
 const beAlexanderplatzStationDisplay1=scopedValue(importedDelegated_beAlexanderplatzStationDisplay1);
 const applyHNStateArchive1=scopedValue(importedDelegated_applyHNStateArchive1);
 const hnStateArchiveDisplay1=scopedValue(importedDelegated_hnStateArchiveDisplay1);
 const applyBEPaulLobe1=scopedValue(importedDelegated_applyBEPaulLobe1);
 const bePaulLobeDisplay1=scopedValue(importedDelegated_bePaulLobeDisplay1);
 const applyBEJamesSimon1=scopedValue(importedDelegated_applyBEJamesSimon1);
 const beJamesSimonDisplay1=scopedValue(importedDelegated_beJamesSimonDisplay1);
 const applyBEAlteKommandantur1=scopedValue(importedDelegated_applyBEAlteKommandantur1);
 const beAlteKommandanturDisplay1=scopedValue(importedDelegated_beAlteKommandanturDisplay1);
 const applyBENewForeignOffice1=scopedValue(importedDelegated_applyBENewForeignOffice1);
 const beNewForeignOfficeDisplay1=scopedValue(importedDelegated_beNewForeignOfficeDisplay1);
 const applyBELittenCourts1=scopedValue(importedDelegated_applyBELittenCourts1);
 const beLittenCourtsDisplay1=scopedValue(importedDelegated_beLittenCourtsDisplay1);
 const applyBETitanic1=scopedValue(importedDelegated_applyBETitanic1);
 const beTitanicDisplay1=scopedValue(importedDelegated_beTitanicDisplay1);
 const applyBEBCC1=scopedValue(importedDelegated_applyBEBCC1);
 const beBCCDisplay1=scopedValue(importedDelegated_beBCCDisplay1);
 const applyBESchinkelplatz1=scopedValue(importedDelegated_applyBESchinkelplatz1);
 const beSchinkelplatzDisplay1=scopedValue(importedDelegated_beSchinkelplatzDisplay1);
 const applyBEMoabitJVA1=scopedValue(importedDelegated_applyBEMoabitJVA1);
 const beMoabitJVADisplay1=scopedValue(importedDelegated_beMoabitJVADisplay1);
 const applyBESpreebogen1=scopedValue(importedDelegated_applyBESpreebogen1);
 const beSpreebogenDisplay1=scopedValue(importedDelegated_beSpreebogenDisplay1);
 const applyHNNordlb1=scopedValue(importedDelegated_applyHNNordlb1);
 const hnNordlbDisplay1=scopedValue(importedDelegated_hnNordlbDisplay1);
 const applyBESonyCenter1=scopedValue(importedDelegated_applyBESonyCenter1);
 const beSonyCenterDisplay1=scopedValue(importedDelegated_beSonyCenterDisplay1);
 const applyBESpielbankStage1=scopedValue(importedDelegated_applyBESpielbankStage1);
 const beSpielbankStageDisplay1=scopedValue(importedDelegated_beSpielbankStageDisplay1);
 const applyBEHedwigEast1=scopedValue(importedDelegated_applyBEHedwigEast1);
 const beHedwigEastDisplay1=scopedValue(importedDelegated_beHedwigEastDisplay1);
 const applyBEMarieLuders1=scopedValue(importedDelegated_applyBEMarieLuders1);
 const beMarieLudersDisplay1=scopedValue(importedDelegated_beMarieLudersDisplay1);
 const applyHNOberfinanzdirektion1=scopedValue(importedDelegated_applyHNOberfinanzdirektion1);
 const hnOberfinanzdirektionDisplay1=scopedValue(importedDelegated_hnOberfinanzdirektionDisplay1);
 const applyHNHbfPlatforms1=scopedValue(importedDelegated_applyHNHbfPlatforms1);
 const hnHbfPlatformsDisplay1=scopedValue(importedDelegated_hnHbfPlatformsDisplay1);
 const hnStateArchiveBatchIncluded50=scopedValue(importedDelegated_hnStateArchiveBatchIncluded50);
 const hnStateArchiveShadowSubset50=scopedValue(importedDelegated_hnStateArchiveShadowSubset50);
 const applyF271Court827=scopedValue(importedDelegated_applyF271Court827);
 const applyF340Crowns819=scopedValue(importedDelegated_applyF340Crowns819);
 const applyF025North801=scopedValue(importedDelegated_applyF025North801);
 const applyF025East797=scopedValue(importedDelegated_applyF025East797);
 const f232StructureHold752=scopedValue(importedDelegated_f232StructureHold752);
 const applyF232StructurePaint752=scopedValue(importedDelegated_applyF232StructurePaint752);
 const f234EquipmentHold751=scopedValue(importedDelegated_f234EquipmentHold751);
 const applyF234EquipmentPaint751=scopedValue(importedDelegated_applyF234EquipmentPaint751);
 const applyF260Shelters745=scopedValue(importedDelegated_applyF260Shelters745);
 const f384DormersHold738=scopedValue(importedDelegated_f384DormersHold738);
 const applyF384DormersPaint738=scopedValue(importedDelegated_applyF384DormersPaint738);
 const f384CapsHold736=scopedValue(importedDelegated_f384CapsHold736);
 const applyF384CapsPaint736=scopedValue(importedDelegated_applyF384CapsPaint736);
 const f384FinialsHold735=scopedValue(importedDelegated_f384FinialsHold735);
 const applyF384FinialsPaint735=scopedValue(importedDelegated_applyF384FinialsPaint735);
 const applyF384Overlap732=scopedValue(importedDelegated_applyF384Overlap732);
 const f288PlatformsHold729=scopedValue(importedDelegated_f288PlatformsHold729);
 const applyF288Platforms729=scopedValue(importedDelegated_applyF288Platforms729);
 const f236PlatformsHold771=scopedValue(importedDelegated_f236PlatformsHold771);
 const applyF236Platforms771=scopedValue(importedDelegated_applyF236Platforms771);
 const f288BodyHold727=scopedValue(importedDelegated_f288BodyHold727);
 const applyF288Body727=scopedValue(importedDelegated_applyF288Body727);
 const f288LinkHold725=scopedValue(importedDelegated_f288LinkHold725);
 const applyF288Link725=scopedValue(importedDelegated_applyF288Link725);
 const f260FiguresHold715=scopedValue(importedDelegated_f260FiguresHold715);
 const applyF260FiguresPaint715=scopedValue(importedDelegated_applyF260FiguresPaint715);
 const f260CapsHold710=scopedValue(importedDelegated_f260CapsHold710);
 const applyF260CapsPaint710=scopedValue(importedDelegated_applyF260CapsPaint710);
 const f288SouthHold697=scopedValue(importedDelegated_f288SouthHold697);
 const applyF288South697=scopedValue(importedDelegated_applyF288South697);
 const f288TunnelHold692=scopedValue(importedDelegated_f288TunnelHold692);
 const f236UndergroundHold683=scopedValue(importedDelegated_f236UndergroundHold683);
 const f236CorridorHold784=scopedValue(importedDelegated_f236CorridorHold784);
 const applyF236Platforms681=scopedValue(importedDelegated_applyF236Platforms681);
 const f236PlatformsFragment681=scopedValue(importedDelegated_f236PlatformsFragment681);
 const applyF025Figure663=scopedValue(importedDelegated_applyF025Figure663);
 const f025FigureFragment663=scopedValue(importedDelegated_f025FigureFragment663);
 const applyF020Step661=scopedValue(importedDelegated_applyF020Step661);
 const applyF020Stone660=scopedValue(importedDelegated_applyF020Stone660);
 const f020StoneFragment660=scopedValue(importedDelegated_f020StoneFragment660);
 const applyF020Turret659=scopedValue(importedDelegated_applyF020Turret659);
 const f020TurretFragment659=scopedValue(importedDelegated_f020TurretFragment659);
 const applyF020Annex658=scopedValue(importedDelegated_applyF020Annex658);
 const f020AnnexFragment658=scopedValue(importedDelegated_f020AnnexFragment658);
 const applyF020Nave657=scopedValue(importedDelegated_applyF020Nave657);
 const f020NaveFragment657=scopedValue(importedDelegated_f020NaveFragment657);
 const applyF020Apse656=scopedValue(importedDelegated_applyF020Apse656);
 const f020ApseFragment656=scopedValue(importedDelegated_f020ApseFragment656);
 const applyF020Buttress655=scopedValue(importedDelegated_applyF020Buttress655);
 const f020ButtressFragment655=scopedValue(importedDelegated_f020ButtressFragment655);
 const applyF020Chapel654=scopedValue(importedDelegated_applyF020Chapel654);
 const f020ChapelFragment654=scopedValue(importedDelegated_f020ChapelFragment654);
 const applyF020Spire653=scopedValue(importedDelegated_applyF020Spire653);
 const f020Fragment652=scopedValue(importedDelegated_f020Fragment652);
 const applyF004Doors645=scopedValue(importedDelegated_applyF004Doors645);
 const applyF004Tower645=scopedValue(importedDelegated_applyF004Tower645);
 const f004Fragment645=scopedValue(importedDelegated_f004Fragment645);
 const f269Fragment640=scopedValue(importedDelegated_f269Fragment640);
 const f269Plan640=scopedValue(importedDelegated_f269Plan640);
 const applyF269640=scopedValue(importedDelegated_applyF269640);
 const f285Fragment634=scopedValue(importedDelegated_f285Fragment634);
 const f285Plan634=scopedValue(importedDelegated_f285Plan634);
 const applyF285634=scopedValue(importedDelegated_applyF285634);
 const f235Fragment631=scopedValue(importedDelegated_f235Fragment631);
 const f235Plan631=scopedValue(importedDelegated_f235Plan631);
 const applyF235631=scopedValue(importedDelegated_applyF235631);
 const f244Fragment627=scopedValue(importedDelegated_f244Fragment627);
 const f244Plan627=scopedValue(importedDelegated_f244Plan627);
 const applyF244627=scopedValue(importedDelegated_applyF244627);
 const f244Fragment622=scopedValue(importedDelegated_f244Fragment622);
 const f244Plan622=scopedValue(importedDelegated_f244Plan622);
 const applyF244622=scopedValue(importedDelegated_applyF244622);
 const f244Fragment619=scopedValue(importedDelegated_f244Fragment619);
 const f244Plan619=scopedValue(importedDelegated_f244Plan619);
 const applyF244619=scopedValue(importedDelegated_applyF244619);
 const applyF342Cascade618=scopedValue(importedDelegated_applyF342Cascade618);
 const f342CascadeFragment618=scopedValue(importedDelegated_f342CascadeFragment618);
 const applyF342Grotto617=scopedValue(importedDelegated_applyF342Grotto617);
 const f342GrottoFragment617=scopedValue(importedDelegated_f342GrottoFragment617);
 const applyF342Foyer615=scopedValue(importedDelegated_applyF342Foyer615);
 const f342FoyerFragment615=scopedValue(importedDelegated_f342FoyerFragment615);
 const applyF342Annex613=scopedValue(importedDelegated_applyF342Annex613);
 const f358Rose612=scopedValue(importedDelegated_f358Rose612);
 const applyF269Cofaces611=scopedValue(importedDelegated_applyF269Cofaces611);
 const applyF269Connection610=scopedValue(importedDelegated_applyF269Connection610);
 const applyF269Neighbors605=scopedValue(importedDelegated_applyF269Neighbors605);
 const f358Fragment604=scopedValue(importedDelegated_f358Fragment604);
 const f358Plan604=scopedValue(importedDelegated_f358Plan604);
 const applyF358604=scopedValue(importedDelegated_applyF358604);
 const applyF278594=scopedValue(importedDelegated_applyF278594);
 const f238Plan595=scopedValue(importedDelegated_f238Plan595);
 const applyF238Body595=scopedValue(importedDelegated_applyF238Body595);
 const applyF242596=scopedValue(importedDelegated_applyF242596);
 const applyF250590=scopedValue(importedDelegated_applyF250590);
 const applyF280582=scopedValue(importedDelegated_applyF280582);
 const f303Display465=scopedValue(importedDelegated_f303Display465);
 const f303Ready465=scopedValue(importedDelegated_f303Ready465);
 const f303Ready474=scopedValue(importedDelegated_f303Ready474);
 const f303Ready484=scopedValue(importedDelegated_f303Ready484);
 const f303SourceDiagnostics582=scopedValue(importedDelegated_f303SourceDiagnostics582);
 const applyF358Normal579=scopedValue(importedDelegated_applyF358Normal579);
 const applyF022574=scopedValue(importedDelegated_applyF022574);
 const applyF269Roof575=scopedValue(importedDelegated_applyF269Roof575);
 const f302Plan576=scopedValue(importedDelegated_f302Plan576);
 const applyF302Crown576=scopedValue(importedDelegated_applyF302Crown576);
 const f302Diagnostic580=scopedValue(importedDelegated_f302Diagnostic580);
 const applyF354Details563=scopedValue(importedDelegated_applyF354Details563);
 const applyF358Details564=scopedValue(importedDelegated_applyF358Details564);
 const applyF346Annex562=scopedValue(importedDelegated_applyF346Annex562);
 const f346ParentClipPick562=scopedValue(importedDelegated_f346ParentClipPick562);
 const f302Plan554=scopedValue(importedDelegated_f302Plan554);
 const applyF302Copy554=scopedValue(importedDelegated_applyF302Copy554);
 const f355Plan559=scopedValue(importedDelegated_f355Plan559);
 const applyF355Hip559=scopedValue(importedDelegated_applyF355Hip559);
 const f355ClipPick559=scopedValue(importedDelegated_f355ClipPick559);
 const applyF269Roof556=scopedValue(importedDelegated_applyF269Roof556);
 const f248Plan551=scopedValue(importedDelegated_f248Plan551);
 const applyF248Aux551=scopedValue(importedDelegated_applyF248Aux551);
 const applyF355548=scopedValue(importedDelegated_applyF355548);
 const applyFrozenF231547=scopedValue(importedDelegated_applyFrozenF231547);
 const frozenF231Display547=scopedValue(importedDelegated_frozenF231Display547);
 const frozenF231Identity547=scopedValue(importedDelegated_frozenF231Identity547);
 const frozenF231Metadata547=scopedValue(importedDelegated_frozenF231Metadata547);
 const applyF236Wings546=scopedValue(importedDelegated_applyF236Wings546);
 const applyF248Site534=scopedValue(importedDelegated_applyF248Site534);
 const applyF346540=scopedValue(importedDelegated_applyF346540);
 const applyFrozenHannover533=scopedValue(importedDelegated_applyFrozenHannover533);
 const applyF346538=scopedValue(importedDelegated_applyF346538);
 const applyF236Details530=scopedValue(importedDelegated_applyF236Details530);
 const applyF236North768=scopedValue(importedDelegated_applyF236North768);
 const applyF248Site525=scopedValue(importedDelegated_applyF248Site525);
 const applyF236Display524=scopedValue(importedDelegated_applyF236Display524);
 const applyF382North519=scopedValue(importedDelegated_applyF382North519);
 const applyF373Details516=scopedValue(importedDelegated_applyF373Details516);
 const applyF315Front515=scopedValue(importedDelegated_applyF315Front515);
 const applyF372Details507=scopedValue(importedDelegated_applyF372Details507);
 const applyF331Neues503=scopedValue(importedDelegated_applyF331Neues503);
 const applyF364Court505=scopedValue(importedDelegated_applyF364Court505);
 const applyF363501=scopedValue(importedDelegated_applyF363501);
 const f363Plan518=scopedValue(importedDelegated_f363Plan518);
 const applyF363Copy518=scopedValue(importedDelegated_applyF363Copy518);
 const applyF315Details504=scopedValue(importedDelegated_applyF315Details504);
 const applyF356Entry495=scopedValue(importedDelegated_applyF356Entry495);
 const f356EntryPlan495=scopedValue(importedDelegated_f356EntryPlan495);
 const applyF364Court498=scopedValue(importedDelegated_applyF364Court498);
 const f303Plan508=scopedValue(importedDelegated_f303Plan508);
 const applyF303Copy508=scopedValue(importedDelegated_applyF303Copy508);
 const applyF331Bergpalais494=scopedValue(importedDelegated_applyF331Bergpalais494);
 const applyF329Details489=scopedValue(importedDelegated_applyF329Details489);
 const applyF323Entry488=scopedValue(importedDelegated_applyF323Entry488);
 const f323EntryPlan488=scopedValue(importedDelegated_f323EntryPlan488);
 const applyF243482=scopedValue(importedDelegated_applyF243482);
 const applyF363472=scopedValue(importedDelegated_applyF363472);
 const applyF327Details478=scopedValue(importedDelegated_applyF327Details478);
 const applyF323476=scopedValue(importedDelegated_applyF323476);
 const f323Plan476=scopedValue(importedDelegated_f323Plan476);
 const applyF322Details483=scopedValue(importedDelegated_applyF322Details483);
 const applyF248Machine469=scopedValue(importedDelegated_applyF248Machine469);
 const applyF303465=scopedValue(importedDelegated_applyF303465);
 const applyF345Repair467=scopedValue(importedDelegated_applyF345Repair467);
 const applyF044463=scopedValue(importedDelegated_applyF044463);
 const applyF044527=scopedValue(importedDelegated_applyF044527);
 const f044Plan463=scopedValue(importedDelegated_f044Plan463);
 const applyF315Details461=scopedValue(importedDelegated_applyF315Details461);
 const applyF044447=scopedValue(importedDelegated_applyF044447);
 const f044Plan447=scopedValue(importedDelegated_f044Plan447);
 const applyF336431=scopedValue(importedDelegated_applyF336431);
 const applyF360User420=scopedValue(importedDelegated_applyF360User420);
 const applyF044427=scopedValue(importedDelegated_applyF044427);
 const f044Plan427=scopedValue(importedDelegated_f044Plan427);
 const applyF059437=scopedValue(importedDelegated_applyF059437);
 const applyF336425=scopedValue(importedDelegated_applyF336425);
 const applyF025417=scopedValue(importedDelegated_applyF025417);
 const applyF237412=scopedValue(importedDelegated_applyF237412);
 const applyF349406=scopedValue(importedDelegated_applyF349406);
 const applyF359East410=scopedValue(importedDelegated_applyF359East410);
 const applyF295419=scopedValue(importedDelegated_applyF295419);
 const applyF288Reception405=scopedValue(importedDelegated_applyF288Reception405);
 const f288Plan405=scopedValue(importedDelegated_f288Plan405);
 const applyF288Reception399=scopedValue(importedDelegated_applyF288Reception399);
 const applyF271Upper395=scopedValue(importedDelegated_applyF271Upper395);
 const applyF310Recovery394=scopedValue(importedDelegated_applyF310Recovery394);
 const applyF382388=scopedValue(importedDelegated_applyF382388);
 const applyF356Carve396=scopedValue(importedDelegated_applyF356Carve396);
 const applyF337Current386=scopedValue(importedDelegated_applyF337Current386);
 const f337Plan386=scopedValue(importedDelegated_f337Plan386<BuildingComponent>);
 const applyF327Recovery381=scopedValue(importedDelegated_applyF327Recovery381);
 const applyF329Current380=scopedValue(importedDelegated_applyF329Current380);
 const applyF258382=scopedValue(importedDelegated_applyF258382);
 const applyF322Current372=scopedValue(importedDelegated_applyF322Current372);
 const applyF323Details373=scopedValue(importedDelegated_applyF323Details373);
 const applyF363Top369=scopedValue(importedDelegated_applyF363Top369);
 const applyF248Sidewing368=scopedValue(importedDelegated_applyF248Sidewing368);
 const applyF363Roof360=scopedValue(importedDelegated_applyF363Roof360);
 const applyF363Native360=scopedValue(importedDelegated_applyF363Native360);
 const f331PhotoPlan344=scopedValue(importedDelegated_f331PhotoPlan344);
 const applyF331PhotoPaint344=scopedValue(importedDelegated_applyF331PhotoPaint344);
 const applyF372Repair350=scopedValue(importedDelegated_applyF372Repair350);
 const applyF372Gallery371=scopedValue(importedDelegated_applyF372Gallery371);
 const s018Plan345=scopedValue(importedDelegated_s018Plan345);
 const applyS018Paint345=scopedValue(importedDelegated_applyS018Paint345);
 const applyF364East348=scopedValue(importedDelegated_applyF364East348);
 const applyF364Body338=scopedValue(importedDelegated_applyF364Body338);
 const applyF243Proxy330=scopedValue(importedDelegated_applyF243Proxy330);
 const applyF315AcceptedPartial332=scopedValue(importedDelegated_applyF315AcceptedPartial332);
 const applyF364Front335=scopedValue(importedDelegated_applyF364Front335);
 const nativePaintSignature=scopedValue(importedDelegated_nativePaintSignature);
 const applyF364Coface331=scopedValue(importedDelegated_applyF364Coface331);
 const applyF360Recovery401=scopedValue(importedDelegated_applyF360Recovery401);
 const applyF364Paint325=scopedValue(importedDelegated_applyF364Paint325);
 const applyF305Native323=scopedValue(importedDelegated_applyF305Native323);
 const f232MainPlan315=scopedValue(importedDelegated_f232MainPlan315);
 const applyF232Main315=scopedValue(importedDelegated_applyF232Main315);
 const applyF058Upper312=scopedValue(importedDelegated_applyF058Upper312);
 const applyF021Nave306=scopedValue(importedDelegated_applyF021Nave306);
 const applyF021Tower295=scopedValue(importedDelegated_applyF021Tower295);
 const applyF013Canopy294=scopedValue(importedDelegated_applyF013Canopy294);
 const applyF003RecoveryPaint287=scopedValue(importedDelegated_applyF003RecoveryPaint287);
 const applyF269RecoveryPaint284=scopedValue(importedDelegated_applyF269RecoveryPaint284);
 const applyF061RecoveryPaint279=scopedValue(importedDelegated_applyF061RecoveryPaint279);
 const applyF061Court829=scopedValue(importedDelegated_applyF061Court829);
 const applyF061SideNative829=scopedValue(importedDelegated_applyF061SideNative829);
 const applyF061Nave833=scopedValue(importedDelegated_applyF061Nave833);
 const f331RemainderPlan276=scopedValue(importedDelegated_f331RemainderPlan276);
 const f331Descriptor276=scopedValue(importedDelegated_f331Descriptor276);
 const f331Signature276=scopedValue(importedDelegated_f331Signature276);
 const applyF063RecoveryPaint272=scopedValue(importedDelegated_applyF063RecoveryPaint272);
 const f373LowerHeadPlan269=scopedValue(importedDelegated_f373LowerHeadPlan269);
 const applyF373LowerHeadPaint269=scopedValue(importedDelegated_applyF373LowerHeadPaint269);
 const f260CanopyDisplay267=scopedValue(importedDelegated_f260CanopyDisplay267);
 const applyF260CanopyPaint267=scopedValue(importedDelegated_applyF260CanopyPaint267);
 const applyF355Tower220=scopedValue(importedDelegated_applyF355Tower220);
 const f355TowerDisplay220=scopedValue(importedDelegated_f355TowerDisplay220);
 const applyF248Recovery214=scopedValue(importedDelegated_applyF248Recovery214);
 const f248RecoveryDisplay214=scopedValue(importedDelegated_f248RecoveryDisplay214);
 const applyF348Detail181=scopedValue(importedDelegated_applyF348Detail181);
 const applyF46RecoveryPaint=scopedValue(importedDelegated_applyF46RecoveryPaint);
 const applyF260RecoveryPaint264=scopedValue(importedDelegated_applyF260RecoveryPaint264);
 const paintBoxOutsideClip=scopedValue(importedDelegated_paintBoxOutsideClip);
 const paintRunIntersectsVisible=scopedValue(importedDelegated_paintRunIntersectsVisible);
 const paintProgramRuns=scopedValue(importedDelegated_paintProgramRuns);
 const applyF151CrownMask=scopedValue(importedDelegated_applyF151CrownMask);
 const f151CrownPickDiscard=scopedValue(importedDelegated_f151CrownPickDiscard);
 const applyS240BaseCoface=scopedValue(importedDelegated_applyS240BaseCoface);
 const applyS036NorthCoface=scopedValue(importedDelegated_applyS036NorthCoface);
 const s036Roof009PickDiscard=scopedValue(importedDelegated_s036Roof009PickDiscard);
 const applyS402ConnectorMask=scopedValue(importedDelegated_applyS402ConnectorMask);
 const s402ConnectorPickDiscard=scopedValue(importedDelegated_s402ConnectorPickDiscard);
 const s196ArchShadowSubset=scopedValue(importedDelegated_s196ArchShadowSubset);
 const sourceRoleBatchIncluded=scopedValue(importedDelegated_sourceRoleBatchIncluded);
 const sourceRoleDisplayProfile=scopedValue(importedDelegated_sourceRoleDisplayProfile);
 const s434AggregateBatchIncluded=scopedValue(importedDelegated_s434AggregateBatchIncluded);
 const readPaintGPUBufferDiagnostic=scopedValue(importedDelegated_readPaintGPUBufferDiagnostic);
 const applyPartialGateMask=scopedValue(importedDelegated_applyPartialGateMask);
 const partialGatePickDiscard=scopedValue(importedDelegated_partialGatePickDiscard);
 const createNativeSourceReadback=scopedValue(importedDelegated_createNativeSourceReadback);
 const isProgressivelyPainted=scopedValue(importedDelegated_isProgressivelyPainted);
 const progressivePaintRejections=scopedValue(importedDelegated_progressivePaintRejections);
 const progressivePaintData=scopedValue(importedDelegated_progressivePaintData);
 const progressivePaintCount=scopedValue(importedDelegated_progressivePaintCount);
 const progressiveRenderView=scopedValue(importedDelegated_progressiveRenderView);
 let progressiveStatusSnapshot:ReturnType<typeof progressiveRenderView>=[];
 const progressivePaintFingerprints=scopedValue(importedDelegated_progressivePaintFingerprints);
 const createRathausProxyMasks=scopedValue(importedDelegated_createRathausProxyMasks);
 const uploadFacadeLayouts=scopedValue(importedDelegated_uploadFacadeLayouts);
 const facadePaintData=scopedValue(importedDelegated_facadePaintData);
 const facadePaintFragmentForCity=scopedValue(importedDelegated_facadePaintFragmentForCity);
 const facadePaintSpecializationForCity=scopedValue(importedDelegated_facadePaintSpecializationForCity);
 const paintProgramPartitionEnabled=scopedValue(importedDelegated_paintProgramPartitionEnabled);
 const paintProgramKey=scopedValue(importedDelegated_paintProgramKey);
 const paintProgramFragment=scopedValue(importedDelegated_paintProgramFragment);
 const exactCurrentPaintProgramKeys=scopedValue(importedDelegated_exactCurrentPaintProgramKeys);
 const currentPaintProgramKey=scopedValue(importedDelegated_currentPaintProgramKey);
 const currentPaintProgramFamily=scopedValue(importedDelegated_currentPaintProgramFamily);
 const paintedFacadeDepthEffects=scopedValue(importedDelegated_paintedFacadeDepthEffects);
 const specializeCurrentPaintProgram=scopedValue(importedDelegated_specializeCurrentPaintProgram);
 const trimInactivePaintPrograms=scopedValue(importedDelegated_trimInactivePaintPrograms);
 const berlinDistantFamily=scopedValue(importedDelegated_berlinDistantFamily);
 const berlinPaulLobeProgramsEqual=scopedValue(importedDelegated_berlinPaulLobeProgramsEqual);
 const berlinExactRichProgramKeys=scopedValue(importedDelegated_berlinExactRichProgramKeys);
 const berlinPaulLobeRichKey=scopedValue(importedDelegated_berlinPaulLobeRichKey);
 const berlinDistantContractAvailable=scopedValue(importedDelegated_berlinDistantContractAvailable);
 const berlinDistantPaintFragment=scopedValue(importedDelegated_berlinDistantPaintFragment);
 const retireBerlinDistantAlternates=scopedValue(importedDelegated_retireBerlinDistantAlternates);
 const paintMode=scopedValue(importedDelegated_paintMode);
 const paintOverride=scopedValue(importedDelegated_paintOverride);
 // Freeze the policy at renderer creation. Review controls can override a
 // partition's family and therefore keep their original full programs.
 const specializeHamburgPartitions=city==='hamburg'&&(typeof location==='undefined'||!facadePaintToolsRequested());
 const linkedPaint=currentPaintProgramGroups('delegated500',city);
 function colourSpecializationFamilies(sourceKey:string,currentFamily:number,unpruned:boolean):readonly number[]{
  if(unpruned)return [];
  if(currentFamilyPrograms)return sourceKey==='current'?linkedPaint.families(currentFamily):[currentFamily];
  const family=specializeHamburgPartitions?hamburgPartitionFamily(sourceKey):undefined;
  return family===undefined?[]:[family];
 }

 const isSourceOnlyGlassRoof=scopedValue(importedDelegated_isSourceOnlyGlassRoof);
 const exactNativePartDisplay=scopedValue(importedDelegated_exactNativePartDisplay);
 const isFacadeLandmark=scopedValue(importedDelegated_isFacadeLandmark);
 const sourceShadowOpacity=scopedValue(importedDelegated_sourceShadowOpacity);
 const getFacadePaintFragmentGLSL=scopedValue(importedDelegated_getFacadePaintFragmentGLSL);
 nativeLeaf=scopedValue(nativeLeaf);ownerPatchLeaf=scopedValue(ownerPatchLeaf);sourceLineage70=scopedValue(sourceLineage70);surfaceStyle=scopedValue(surfaceStyle);
function validate(c:BuildingComponent,city:string){if(c.city!==city||!/^osm\/(?:node|way|relation)\/[1-9]\d*$/.test(c.objectId)||!c.partId||c.partId.length>256||c.sourceFeature?.type!=='Feature'||c.componentGeometry?.type!=='Polygon'||!c.componentGeometry.coordinates.length||!c.origin.every(Number.isFinite)||Math.abs(c.origin[0])>180||Math.abs(c.origin[1])>85)throw Error('Invalid source component');const minAllowedY=c.city==='hamburg'&&c.objectId==='osm/way/45574500'&&c.partId==='osm/way/45574500/component/0e5473b3818ee68de406/owner-photoapprox-rear-atrium829'&&(c.sourceFeature?.properties?.owner_shape_patch as any)?.number==='F061-RearCourt829'&&nativePaintSignature(c)==='6203c308'?-3.35001:-.001;let positions=0;for(const ring of c.componentGeometry.coordinates){if(ring.length<4||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])throw Error('Invalid source ring');for(const p of ring)if(++positions>20000||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('Invalid source footprint');}for(const m of c.batches){if(!m.positions.length||m.positions.length%3||m.normals.length!==m.positions.length||m.indices.length%3||m.color.length!==3||!m.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!m.positions.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6)||!m.normals.every(Number.isFinite)||!m.indices.every(v=>Number.isSafeInteger(v)&&v>=0&&v<m.positions.length/3))throw Error('Invalid source mesh');for(let i=1;i<m.positions.length;i+=3)if(m.positions[i]<minAllowedY)throw Error('Below-ground mesh needs separate source review');}}
const VERTEX=`#version 300 es
in vec4 a_progressive_color;in vec4 a_paint_frame;in float a_paint_family;out vec4 v_paint_frame;flat out float v_paint_family;flat out float v_partial_gate_mask;uniform float u_paint_mode;in vec3 a_position;in vec3 a_normal;in vec3 a_color;in float a_selected;uniform mat4 u_matrix;uniform float u_style_scale;uniform float u_style_height_scale;uniform vec2 u_style_offset;out vec3 v_color;out vec3 v_normal;out vec3 v_local_position;out float v_growth;flat out float v_style;flat out float v_selected;void main(){float progressiveMaterialAlpha=mod(a_progressive_color.a,4.);float growth=mod(a_selected,2.);float selected=step(2.,mod(a_selected,4.));v_style=floor(a_selected/4.);v_partial_gate_mask=floor(a_progressive_color.a/4.);v_paint_frame=a_paint_frame;v_paint_frame.y*=growth;v_paint_family=a_paint_family;v_growth=growth;v_selected=selected;v_normal=normalize(vec3(a_normal.x,a_normal.y/max(growth,.005),a_normal.z));float light=.63+.37*max(0.,dot(v_normal,normalize(vec3(-.35,.8,.4))));float neutral=step(16.,mod(v_style,32.));vec3 paintBase=u_paint_mode>1.5&&progressiveMaterialAlpha>.5?a_progressive_color.rgb:a_color;vec3 neutralBase=mix(vec3(.94,.95,.97),vec3(1.,.99,.97),smoothstep(.25,.85,max(0.,v_normal.y)));v_color=(u_paint_mode<.5?neutralBase:u_paint_mode<1.5||abs(a_paint_family)<.5?mix(paintBase,neutralBase,neutral*(1.-step(1.5,u_paint_mode)*step(1.5,progressiveMaterialAlpha))):paintBase)*light;v_local_position=vec3(a_position.x*u_style_scale+u_style_offset.x,a_position.y*u_style_height_scale,a_position.z*u_style_scale+u_style_offset.y);gl_Position=u_matrix*vec4(a_position.x,a_position.y*growth,a_position.z,1.);}`;
const currentFacadePaintFragment=()=>{const data=committingPreparedData??residentPreparedData;if(!data)throw Error('Delegated500 facade source requires prepared data');return withPreparedData(data,()=>getFacadePaintFragmentGLSL());};
const fragmentParts=(helper:string,paintFragment:string|ShaderSourcePart)=>shaderSourceParts`#version 300 es
precision highp float;in vec4 v_paint_frame;flat in float v_paint_family;flat in float v_partial_gate_mask;uniform float u_paint_mode;uniform float u_paint_override;uniform float u_progressive_features;uniform float u_s182_mask_diagnostic;in vec3 v_color;in vec3 v_normal;in vec3 v_local_position;in float v_growth;flat in float v_style;flat in float v_selected;uniform float u_opacity;out vec4 color;
${helper}
${SCENE_SURFACE_LIGHT_GLSL}
${RATHAUS_PROXY_MASK_GLSL}
${PARTIAL_GATE_MASK_GLSL}
${S402_CONNECTOR_MASK_GLSL}
${S036_ROOF009_MASK_GLSL}
${paintFragment}
${FACADE_OPENING_GLSL}
${FACADE_LAYOUT_GLSL}
${F46_RECOVERY_SURFACE_GLSL}
${F248_MACHINE_469_GLSL}
${F248_SITE_525_GLSL}
${F248_SITE_534_GLSL}
${F346_ANNEX562_GLSL}${F238_BODY595_GLSL}
${F248_SIDEWING_368_GLSL}
${F248_RECOVERY_214_GLSL}
${F348_DETAIL_GLSL}
void main(){gl_FragDepth=gl_FragCoord.z;if(u_paint_mode>1.5&&v_paint_family>=4911.&&v_paint_family<=4926.)gl_FragDepth=max(0.,gl_FragCoord.z-0.0000001);if(v_growth<.005)discard;if(u_paint_mode>1.5&&v_partial_gate_mask>6.5&&v_partial_gate_mask<7.5)discard;if(u_s182_mask_diagnostic>.5&&v_partial_gate_mask>1.5&&v_partial_gate_mask<2.5){bool debugInside=s182CoveredGateRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005)));color=debugInside?vec4(1.,0.,0.,1.):vec4(0.,.2,1.,1.);return;}if(u_paint_mode>1.5&&((v_partial_gate_mask>.5&&v_partial_gate_mask<1.5)||(v_partial_gate_mask>1.5&&v_partial_gate_mask<2.5&&s182CoveredGateRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))))discard;if(u_paint_mode>1.5&&((v_partial_gate_mask>3.5&&v_partial_gate_mask<4.5)||(v_partial_gate_mask>4.5&&v_partial_gate_mask<5.5&&s402ConnectorRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))))discard;if(u_paint_mode>1.5&&v_partial_gate_mask>5.5&&v_partial_gate_mask<6.5&&s036Roof009(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))discard;float semanticFamily=v_paint_family>=1000000.?floor(v_paint_family/10000.):v_paint_family;${F346_ANNEX562_CLIP}${F355_HIP559_CLIP}if(u_paint_mode>1.5&&v_paint_family>=1000000.&&nrCoveredProxyFragment(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005)),v_paint_family))discard;vec3 styled=v_color;if(u_paint_mode>1.5){float paintLight=.63+.37*max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));styled=(semanticFamily>=1000.&&u_progressive_features<.5?v_color/max(paintLight,.01):(semanticFamily==3919.&&abs(v_paint_frame.w-562.)<.1?f346NorthRoof562(v_color/max(paintLight,.01),v_paint_frame):semanticFamily==3295.?f348Detail181(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):semanticFamily==9008.?(v_paint_frame.z>=90.?f248Site534(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):v_paint_frame.z>=80.?f248Site525(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):v_paint_frame.z>=60.?f248Machine469(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):v_paint_frame.z>=42.?f248Sidewing368(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):f248Recovery214(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame)):semanticFamily==3305.?f46RecoverySurface177(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame):${(typeof paintFragment!=='string'||(helper+paintFragment).includes('vec3 f260Station264('))?'(semanticFamily>=1638.&&semanticFamily<=1645.)?f260Station264(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame,semanticFamily):':''}(semanticFamily>=4773.&&semanticFamily<=4776.&&(v_paint_frame.z==595.||v_paint_frame.z==596.))?f238Body595(v_color/max(paintLight,.01),v_local_position,normalize(v_normal),v_paint_frame,semanticFamily):paintedFacade(v_color/max(paintLight,.01),v_local_position,(((semanticFamily==428.&&v_paint_frame.z==579.)||semanticFamily>=1000.||(semanticFamily>=120.&&semanticFamily<=123.)||semanticFamily==129.||semanticFamily==171.||(semanticFamily>=180.&&semanticFamily<=211.)||(semanticFamily>=220.&&semanticFamily<=233.)||(semanticFamily>=140.&&semanticFamily<=149.)||(semanticFamily>=150.&&semanticFamily<170.)||(semanticFamily>=134.&&semanticFamily<=139.))?normalize(v_normal):(v_style>=32.||(v_paint_family!=107.||v_local_position.y>=70.)&&abs(cross(dFdx(v_local_position),dFdy(v_local_position)).y)>.001*max(length(cross(dFdx(v_local_position),dFdy(v_local_position))),.00001))?vec3(0.,1.,0.):normalize(v_normal)),(semanticFamily==428.&&v_paint_frame.z==579.)?vec4(v_paint_frame.xy,14.,v_paint_frame.w):v_paint_frame,abs(u_paint_override)>.01?u_paint_override:semanticFamily)))*paintLight;}else if(u_paint_mode>.5&&step(16.,mod(v_style,32.))<.5&&!(v_style>=32.&&mod(v_style,8.)>6.5))styled=sourceFacade(v_color,v_local_position,normalize(v_normal),mod(v_style,8.),1.-step(8.,mod(v_style,16.)));float previousSceneLight=.63+.37*max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));styled=sceneSurfaceLight(styled/max(previousSceneLight,.01),normalize(v_normal),v_local_position.y*v_growth);color=vec4(mix(styled,vec3(.98,.78,.3),v_selected*.65),u_opacity);}`;
const fragment=(helper:string,paintFragment=currentFacadePaintFragment())=>emitShaderSource(fragmentParts(helper,paintFragment));
 let hc70ProgramReady=false,hc70PantaleonGateProgramReady=false,hc70PantaleonAnnexProgramReady=false,hc70LudwigWorkshopProgramReady=false,hc70MesseturmCrownProgramReady=false,supplementBatch1Ready=false;
 // One live material source belongs to this renderer's current source recipe.
 // Construction and certification enter the context's existing admission queue.
 // The same 22 wrappers, in the original innermost-first order, also describe
 // this source's bound before admission (delegated-shader-budget.ts).
 let materialSourceBuilder:()=>string=()=>applyDelegatedPaintWrappers(currentFamilyPrograms?facadePaintFragmentForCity(city):partitionEnabled?paintProgramFragment('base',city):facadePaintFragmentForCity(city),city,DELEGATED_MATERIAL_SOURCE_WRAPPERS);
 let materialRecipeRevision=0,materialSourceWorkRevision=0,materialSourceSettled=false;
 let materialSourceFailure:unknown;
 // A chunk construction's material source failure. It lives outside every
 // material snapshot (the construction's finally restores the resident one):
 // until setMaterialSourceBuilder replaces the recipe, a nonempty prepareBatches
 // is rejected with it before any admission or build (no automatic retry).
 let constructionSourceFailure:unknown;
 type PendingMaterialBatches={revision:number;args?:Parameters<typeof setBatches>;prepared?:PreparedDelegated500Data;signal:AbortSignal;releaseScope?:()=>void;abortCleanup?:()=>void;closed:boolean};
 let pendingMaterialBatches:PendingMaterialBatches|undefined;
 function clearMaterialSource(){const data=committingPreparedData??residentPreparedData;if(data)clearDelegated500PaintSourcesForScope(data.scope);materialSourceWorkRevision++;materialSourceSettled=false;cityPaintFragment='';cityPaintFragmentBytes=0;releaseMaterialSourceClaim();materialRebuildIdentities=undefined;clearProgramSources();casterBase.clear();casterFamily0=undefined;casterAnalysisPending.clear();casterPreparedSources.clear();}
 function ensureMaterialSourceWorkspace():string{
  if(cityPaintFragment)return cityPaintFragment;
  const data=committingPreparedData??residentPreparedData;if(!data)throw Error('Delegated500 source workspace requires prepared data');
  // A rebuild after a drain claims its wrapper-chain envelope and retained text
  // under this material state's rebuild identities. Colour and caster preflights
  // already hold those costs, so inside their admitted build it adds no bytes;
  // anywhere else a refusal throws the ledger's budget error for the caller to wait on.
  const identities=materialRebuildIdentities??=newDelegatedSourceTextIdentities(),claim=admitDelegatedSourceText(pageBudget(),materialRebuildEstimate(data),identities);let kept=false;
  try{const text=materialSourceBuilder(),described=describeFacadePaintSource(city,text,'city',data.scope);progressiveShaderSpecialization=described;
   claim.settle(text);releaseMaterialSourceClaim();cityPaintFragmentClaim=claim;cityPaintFragment=text;cityPaintFragmentBytes=described.fragmentBytes;materialRebuildIdentities=undefined;kept=true;
   return text;
  }finally{if(!kept)claim.release();clearDelegated500PaintSourcesForScope(data.scope);}
 }
 // Retained material text and its claim move together with the material state,
 // as do the identities a drained text will be rebuilt under.
 let cityPaintFragmentClaim:DelegatedSourceTextClaim|undefined,materialRebuildIdentities:DelegatedSourceTextIdentities|undefined;
 function releaseMaterialSourceClaim(){const claim=cityPaintFragmentClaim;cityPaintFragmentClaim=undefined;claim?.release();}
 // Wake-up only: an admission that did not fit waits for ledger availability and
 // the next repaint retries it. No timer, and nothing queued while blocked. Each
 // kind waits on its own refusal, so a refused capture classification never
 // stops a visible material preflight or a candidate pump that still fits.
 const sourceBudgetWake=new AbortController();
 const materialSourceGate=createDelegatedSourceBudgetGate(()=>{if(!destroyed)map.triggerRepaint();},sourceBudgetWake.signal),batchSourceGate=createDelegatedSourceBudgetGate(()=>{if(!destroyed)map.triggerRepaint();},sourceBudgetWake.signal),casterSourceGate=createDelegatedSourceBudgetGate(()=>{if(!destroyed)map.triggerRepaint();},sourceBudgetWake.signal);
 const sourceBudgetWaiting=()=>materialSourceGate.waiting||batchSourceGate.waiting||casterSourceGate.waiting;
 const paintBoundCache=new WeakMap<FrozenDataScope,Map<string,ShaderSourceBounds>>();
 // Raw paint descriptor + wrapper growth; reading a bound never emits a source.
 function delegatedPaintBounds(scope:FrozenDataScope,chain:'material'|'existing'|'legacy'|'f004'|'f020'|'distant',sourceKey?:string):ShaderSourceBounds{
  let byKey=paintBoundCache.get(scope);if(!byKey){byKey=new Map();paintBoundCache.set(scope,byKey);}
  const cacheKey=chain+'\u0000'+(sourceKey??'\u0001city'),cached=byKey.get(cacheKey);if(cached)return cached;
  const value=chain==='existing'?existingShaderTextBounds(delegatedPaintBounds(scope,'material',sourceKey)):chain==='distant'?describeDelegatedWrappedPaintBounds(delegatedPaintBounds(scope,'existing',sourceKey),city,DELEGATED_BERLIN_DISTANT_WRAPPERS):describeDelegatedWrappedPaintBounds(describeFacadePaintSourceBounds(city,sourceKey,scope),city,chain==='material'?DELEGATED_MATERIAL_SOURCE_WRAPPERS:chain==='legacy'?DELEGATED_LEGACY_PARTITION_WRAPPERS:chain==='f020'?DELEGATED_F020_CHAPEL_WRAPPERS:DELEGATED_F004_DETAIL_WRAPPERS);
  byKey.set(cacheKey,value);return value;
 }
 const materialBaseKey=(familyPrograms=currentFamilyPrograms,partitions=partitionEnabled)=>familyPrograms||!partitions?undefined:'base';
 const materialPaintBounds=(scope:FrozenDataScope)=>delegatedPaintBounds(scope,'material',materialBaseKey());
 /** A drained material text's rebuild in ensureMaterialSourceWorkspace: the
  * retained wrapped paint plus its wrapper-chain envelope. Bounds only. */
 function materialRebuildEstimate(data:PreparedDelegated500Data):DelegatedSourceTextEstimate{
  const paint=materialPaintBounds(data.scope);
  return{retainedCharactersUpperBound:paint.sourceCharactersUpperBound,transientBytesUpperBound:2*(paint.assemblyCharactersUpperBound-paint.sourceCharactersUpperBound),label:'delegated500 '+city+' material source rebuild'};
 }
 /** The retained material text a 'current' or distant source reads. Held text
  * is already claimed and stays held while that source waits; drained text is
  * rebuilt inside the admitted build, so its costs join the preflight under the
  * identities ensureMaterialSourceWorkspace then claims. */
 function materialTextRequirement(data:PreparedDelegated500Data):{costs:readonly ResourceBudgetCost[];heldBytes:number}{
  if(cityPaintFragment)return{costs:[],heldBytes:cityPaintFragmentClaim?.active?cityPaintFragmentClaim.bytes:0};
  materialRebuildIdentities??=newDelegatedSourceTextIdentities();
  return{costs:delegatedSourceTextCosts(materialRebuildEstimate(data),materialRebuildIdentities),heldBytes:0};
 }
 /** The material preflight's complete envelope: the wrapped paint it retains,
  * its chain emission, the one no-helper assembly used by Hannover/Dortmund
  * flags and Berlin's f004645 partition, rich-sharing analyses and distant
  * contract splits; for packing also Berlin's f020 1679 partition flags.
  * Bounds only; called before any of these sources exist. */
 function materialSourceEstimate(data:PreparedDelegated500Data,packing=false):DelegatedSourceTextEstimate{
  return withPreparedData(data,()=>{
   const familyPrograms=berlinCurrent||!paintProgramPartitionEnabled(city),partitions=familyPrograms||paintProgramPartitionEnabled(city);
   const paint=delegatedPaintBounds(data.scope,'material',materialBaseKey(familyPrograms,partitions)),existing=existingShaderTextBoundPart(paint,delegatedColourSourceAuthority);
   // Sequential phases beside the retained paint: the wrapper chain, Berlin's
   // f004645 partition, the one memoized no-helper assembly for flags, Berlin's
   // rich-sharing analysis (assembly, reference and current specialization plus
   // the custom specializer envelope) and one distant-contract split at a time.
   const phases=[2*(paint.assemblyCharactersUpperBound-paint.sourceCharactersUpperBound)];
   if(city==='hannover'||city==='dortmund'){const assembled=fragmentParts('',existing);phases.push(2*(assembled.emissionCharactersUpperBound??assembled.charactersUpperBound));}
   if(city==='berlin'){
    phases.push(2*delegatedPaintBounds(data.scope,'f004',paintProgramKey(1567,city)).assemblyCharactersUpperBound,2*paint.sourceCharactersUpperBound);
    // Packing's one f020 1679 partition paint and its f020652/654 chain.
    if(packing)phases.push(2*delegatedPaintBounds(data.scope,'f020',paintProgramKey(1679,city)).assemblyCharactersUpperBound);
   }
   // Exact full-source equality retains only aliases, but admits its assembly,
   // reference/current output and local analysis before construction.
   if(city==='berlin'||city==='essen'){
    const assembled=fragmentParts(baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',existing);
    phases.push(2*((assembled.emissionCharactersUpperBound??assembled.charactersUpperBound)+2*assembled.charactersUpperBound)+estimateShaderSourceWorkspace(shaderSourceBounds(assembled),undefined,{analysis:'custom',familyValues:1}).scratchBytesEstimate);
   }
   return{retainedCharactersUpperBound:paint.sourceCharactersUpperBound,transientBytesUpperBound:Math.max(...phases),label:'delegated500 '+city+' material source'};
  });
 }
 /** A synchronous source-build step admits before building, or reports that it
  * waits on its own gate for this exact request. An item larger than the whole
  * page budget throws an explicit error. */
 function admitMaterialSourceNow(data:PreparedDelegated500Data,gate:DelegatedSourceBudgetGate,key:unknown,packing=false):DelegatedSourceTextClaim|undefined{
  const ledger=pageBudget(),admission=tryAdmitDelegatedSourceText(ledger,materialSourceEstimate(data,packing));
  if(admission.ok!==true){gate.block(key,ledger);return undefined;}gate.clear();return admission.claim;
 }
 /** Test seam only: the renderer API does not expose it (the flattened fixtures
  * call it). An injected builder carries no bound of its own; its text must fit
  * the default chain's preflight bound, or its claim's settle rejects it
  * explicitly ('exceeded its pre-build bound') instead of under-counting it.
  * Replacing the recipe clears its cached failures, the construction's too. */
 function setMaterialSourceBuilder(build:()=>string){materialSourceFailure=undefined;constructionSourceFailure=undefined;mainDrawFailure=undefined;materialSourceBuilder=build;materialRecipeRevision++;clearMaterialSource();}
 // Packing's two f020 1679 partition flags are read once, under the material
 // claim, from one partition paint, instead of packing building that paint ten
 // times outside any claim. Its own frame ends the partition's phase.
 function f020PartitionFlags1679():readonly [boolean,boolean]{const partition=paintProgramFragment(paintProgramKey(1679,city),city);return[partition.includes('vec3 f020WholeNative321('),applyDelegatedPaintWrappers(partition,city,DELEGATED_F020_CHAPEL_WRAPPERS).includes('vec3 f020Chapel654(')];}
 function buildMaterialSource(claim:DelegatedSourceTextClaim,packing=false){const steps=buildMaterialSourceSteps(claim,packing);for(;;){const next=steps.next();if(next.done)return next.value;}}
 function* buildMaterialSourceSteps(claim:DelegatedSourceTextClaim,packing=false){const data=committingPreparedData??residentPreparedData;if(!data){claim.release();throw Error('Delegated500 material source requires prepared data');}const scope=data.scope;let retained=false,withoutHelper:string|undefined;const fragmentWithoutHelper=()=>withoutHelper??=fragment('',cityPaintFragment);try{
currentFamilyPrograms=berlinCurrent||!paintProgramPartitionEnabled(city);partitionEnabled=currentFamilyPrograms||paintProgramPartitionEnabled(city);legacySolarPartitions=!currentFamilyPrograms&&partitionEnabled&&(city==='hamburg'||city==='hannover');f004645Available=city==='berlin'&&f004Fragment645(paintProgramFragment(paintProgramKey(1567,city),city),city).includes(F004_TOKEN645);yield;
if(packing)[f020Whole1679Available,f020Chapel1679Available]=city==='berlin'?f020PartitionFlags1679():[false,false];yield;
hc70ProgramReady=["ppHHStrafjustiz70", "hhSpiegelEricusPaint70", "hhSchanzen70", "ppHHOberlandesgericht70", "ppHHZiviljustiz70", "ppHHFlakbunker70", "hhFontenayPaint70", "hhMARKK70", "hhDammtor70", "hhESA1_70", "hhESAEast70", "ppHHJohannesKronstadt70", "hhHotelHafenPaint70", "ppHHSeewetter70", "hhLandungsbrueckenPaint70", "ppHHFinanzamt70", "hhFernsprechamt70", "hhBismarckPaint70DispatchRGB", "ppKOTriangle70", "koMusicalDomePaint70DispatchRGB", "koRheinhallen70", "ppKOAltHeribert70", "koJohannesDeutzPaint70DispatchRGB", "koStPaulPaint70DispatchRGB", "ppKOLanxessTower70", "ppKOMalakoffturm70", "koNeuHeribert70", "koArtotelPaint70DispatchRGB", "koHohenzollern70", "koPantaleonAnnex70", "koRailConnection70"].every(fn=>HC70_GLSL.includes('vec3 '+fn+'('));yield;
hc70PantaleonGateProgramReady=koPantaleonGateReady70(KO_PANTALEON_GATE_GLSL_SHA256,hc70ProgramReady&&HC70_GLSL.includes(KO_PANTALEON_GATE_GLSL));yield;
hc70PantaleonAnnexProgramReady=koPantaleonAnnexReady70(KO_PANTALEON_ANNEX_GLSL_SHA256,hc70ProgramReady&&HC70_GLSL.includes(KO_PANTALEON_ANNEX_GLSL));yield;
hc70LudwigWorkshopProgramReady=koLudwigWorkshopReady70(KO_LUDWIG_WORKSHOP_GLSL70_SHA256,hc70ProgramReady&&HC70_GLSL.includes(KO_LUDWIG_WORKSHOP_GLSL70));yield;
hc70MesseturmCrownProgramReady=koMesseturmCrownReady70(KO_MESSETURM_CROWN_GLSL_SHA256,hc70ProgramReady&&HC70_GLSL.includes(KO_MESSETURM_CROWN_GLSL));yield;
supplementBatch1Ready=["hnReformierte1", "doRWE1", "beStMichael1", "doSparkasse1", "hnGalerie1", "beEmmaus1", "hnAltesRathaus1", "beCube1", "beSwissEmbassy1", "beAlexanderplatzStation1", "hnStateArchive1", "bePaulLobe1", "beJamesSimon1", "beAlteKommandantur1", "beNewForeignOffice1", "beLittenCourts1", "beTitanic1", "beBCC1", "beSchinkelplatz1", "beMoabitJVA1", "beSpreebogen1", "hnNordlb1", "beSonyCenter1", "beSpielbankStage1", "beHedwigEast1", "beMarieLuders1", "hnOberfinanzdirektion1", "hnHbfPlatforms1"].every(fn=>SUPPLEMENT_BATCH1_GLSL.includes('vec3 '+fn+'('));yield;
cityPaintFragment=materialSourceBuilder();yield;const described=describeFacadePaintSource(city,cityPaintFragment,'city',scope);cityPaintFragmentBytes=described.fragmentBytes;progressiveShaderSpecialization=described;yield;f269640Available=cityPaintFragment.includes(F269_TOKEN640);f285634Available=cityPaintFragment.includes(F285_TOKEN634);f235631Available=cityPaintFragment.includes(F235_TOKEN631);f244627Available=cityPaintFragment.includes(F244_TOKEN627);f244622Available=cityPaintFragment.includes(F244_TOKEN622);f244619Available=cityPaintFragment.includes(F244_TOKEN619);f358604Available=city==='hannover'&&fragmentWithoutHelper().includes(F358_TOKEN604);f238Body595Available=city==='dortmund'&&fragmentWithoutHelper().includes(F238_BODY595_GLSL)&&fragmentWithoutHelper().includes('?f238Body595(');f358Normal579Available=city==='hannover'&&fragmentWithoutHelper().includes(F358_NORMAL579_TOKEN);f346562Available=city==='hannover'&&fragmentWithoutHelper().includes(F346_ANNEX562_CLIP)&&fragmentWithoutHelper().includes(F346_ANNEX562_GLSL);f355Clip559Available=city==='hannover'&&fragmentWithoutHelper().includes(F355_HIP559_CLIP);withoutHelper=undefined;yield;({sharedPaulLobeRichProgram,exactRichProgramKeys}=(()=>{if(!berlinCurrent&&city!=='essen')return{sharedPaulLobeRichProgram:false,exactRichProgramKeys:currentFamilyPrograms?linkedPaint.aliases:new Map<string,string>()};const assembled=fragment(baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',cityPaintFragment);if(city==='essen')return{sharedPaulLobeRichProgram:false,exactRichProgramKeys:exactCurrentPaintProgramKeys(assembled,Array.from({length:26},(_,i)=>1603+i),false,true)};return{sharedPaulLobeRichProgram:berlinPaulLobeProgramsEqual(assembled),exactRichProgramKeys:berlinExactRichProgramKeys(assembled)};})());distantMaterialAvailable=sharedPaulLobeRichProgram&&berlinDistantContractAvailable(cityPaintFragment);
  claim.settle(cityPaintFragment);if(cityPaintFragmentClaim!==claim)releaseMaterialSourceClaim();cityPaintFragmentClaim=claim;materialRebuildIdentities=undefined;retained=true;
  materialSourceSettled=true;
 }finally{withoutHelper=undefined;if(!retained){claim.release();if(cityPaintFragmentClaim===claim)cityPaintFragmentClaim=undefined;cityPaintFragment='';cityPaintFragmentBytes=0;}if(scope)clearDelegated500PaintSourcesForScope(scope);}}
 function prepareMaterialSource(){
  if(materialSourceFailure!==undefined)throw materialSourceFailure;if(materialSourceSettled)return true;
  const data=committingPreparedData??residentPreparedData;if(!data||!gl||destroyed||pageHidden||!enabled)return false;
  const revision=materialSourceWorkRevision;if(materialSourceGate.blockedFor(revision))return false;
  // A refused admission completes this step without a source and waits for the
  // ledger; it is neither a cached failure nor a reason to requeue every frame.
  try{programPreparation.work(gl,{resource:'material-source-preflight',revision,phase:'source-build',retainReady:false,current:()=>revision===materialSourceWorkRevision&&residentPreparedData===data&&!destroyed&&!pageHidden&&enabled,work(){withPreparedData(data,()=>{const claim=admitMaterialSourceNow(data,materialSourceGate,revision);if(claim)buildMaterialSource(claim);});}});return materialSourceSettled;}
  catch(error){materialSourceFailure=error;releaseMaterialSourceClaim();cityPaintFragment='';cityPaintFragmentBytes=0;throw error;}
 }
 function replayMaterialBatches(){pumpPendingMaterialBatches();}

 const programPreparation=createProgramPreparationOwner('delegated500 '+city,()=>{if(!destroyed)map.triggerRepaint();});
 const programGrantHandoff=createProgramGrantHandoff<WebGL2RenderingContext,WebGLProgram>((context,value)=>programPreparation.releaseProgram(context,value));
 let grantHandoffGeneration:number|undefined,grantHandoffPreparationToken:number|undefined;
 function clearProgramGrantHandoff(expectedGeneration?:number,preparationToken?:number){if(expectedGeneration!==undefined&&grantHandoffGeneration!==expectedGeneration||preparationToken!==undefined&&grantHandoffPreparationToken!==preparationToken)return;grantHandoffGeneration=undefined;grantHandoffPreparationToken=undefined;programGrantHandoff.clear();}
const residentGeometry=createResidentGeometryOwner({firstVertexTriangles:true}),shadowGeometry=createResidentGeometryOwner({firstVertexTriangles:true});
 // The ledger of this renderer's own context store: the one its program tickets
 // and resident geometry reserve in. Reading it never fixes a store before a
 // context exists; every source admission runs with that context.
 const pageBudget=()=>{const context=gl;if(!context)throw Error('Delegated500 source budget requires its WebGL context');return getChunkResourceStoreForContext(context).budget;};
 /** One admitted assembled base per current colour recipe. The program ticket's
  * programBudget preflight reserves the same identities that prepareSource then
  * claims, so every paint builder runs only after that admission. Family
  * outputs belong to their program tickets; the base is cleared when drained.
  * The workspace binds to the context's ledger on first use. */
 let programSourcesRevision:number|undefined,programSourceUTF8Bytes=0;
 const programSources=createContextPreparedSourceWorkspace(pageBudget,{
  metadataHintSafe:true,
  current:()=>!destroyed&&!pageHidden&&enabled,
  build:recipe=>(recipe as DelegatedColourSourceRecipe).paint(),
  clear(){const data=committingPreparedData??residentPreparedData;if(data)clearDelegated500PaintSourcesForScope(data.scope);},
  specialize(source,families){
   if(!families.length)return {fragment:source,depthEffects:false};
   if(city==='hamburg'&&!currentFamilyPrograms){
    if(families.length!==1)throw Error('Rounded Hamburg programs require one partition');
    return specializeRoundedPaintProgram(source,families[0]);
   }
   return specializeCurrentPaintProgram(source,families.length===1?families[0]:families,false,!berlinCurrent);
  },
 });
 function clearProgramSources(){programSourcesRevision=undefined;programSourceUTF8Bytes=0;programSources.clearPreparedSource();}
 const createCasterPreparedSources=()=>new DelegatedPreparedSourceMap<{helper:string;revision:number;fragment:string;fragmentBytes:number;depthEffects:boolean}>(pageBudget);
 const colourAssemblyBounds=new WeakMap<ShaderSourceBounds,Map<string,ShaderSourceBounds>>();
 /** The colour recipe description: the real tagged shell over a descriptor of
  * this paint, plus the clip text. The preflight builds it for its caller's
  * data and the admitted build rebuilds it for its consumer's data; both claim
  * the same workspace identities, so equal bounds add no bytes in the build. */
 function colourSourceRecipe(helper:string,paintFragment:string|{key:string;build:()=>string}|undefined,data:PreparedDelegated500Data):DelegatedColourSourceRecipe{
  const sourceKey=paintFragment===undefined?'current':typeof paintFragment==='string'?paintFragment:paintFragment.key;
  const paint=paintFragment===undefined?delegatedPaintBounds(data.scope,'existing',materialBaseKey()):typeof paintFragment==='string'?shaderSourceBounds(shaderSourceText(paintFragment,['delegated500/explicit-paint'])):sourceKey==='partition:'+BERLIN_DISTANT_PAUL_LOBE_KEY?delegatedPaintBounds(data.scope,'distant',materialBaseKey()):delegatedPaintBounds(data.scope,'legacy',sourceKey.slice(10));
  let byHelper=colourAssemblyBounds.get(paint);if(!byHelper){byHelper=new Map();colourAssemblyBounds.set(paint,byHelper);}
  let sourceBounds=byHelper.get(helper);if(!sourceBounds){sourceBounds=describeShaderAssemblyBounds(paint,fragmentParts(helper,shaderSourceBoundPart(paint,delegatedColourSourceAuthority)),{reflectionClip:true});byHelper.set(helper,sourceBounds);}
  const revision=materialRecipeRevision,build=paintFragment===undefined?ensureMaterialSourceWorkspace:typeof paintFragment==='string'?()=>paintFragment:paintFragment.build;
  return{sourceKey,inputs:[helper,city,sourceKey,revision,currentFamilyPrograms,partitionEnabled,legacySolarPartitions,materialSourceBuilder,fragmentParts],sourceBounds,assemble(paintSource){const value=fragment(helper,paintSource);programSourcesRevision=revision;programSourceUTF8Bytes=utf8ByteLength(value);return value;},paint:build};
 }
 const chunkStateOwner=++delegatedChunkInstanceSequence;
 let sceneChunks:DelegatedPackedChunk[]=[],sceneSpans:DelegatedSceneSpan[]=[],sceneChunkBindings:PreparedChunkBindings<BuildingComponent>|undefined;
 let chunkStore:ChunkResourceStore|undefined;
 let packingChunkInput:RendererChunkInput<BuildingComponent>|undefined,preparingChunkProduction=false;
 type GroupProduction={source:RendererSourceGroup<BuildingComponent>;components:BuildingComponent[];cpu:ChunkResourceLease<DelegatedPackedCPU>};
 type ChunkConstruction={state:PackedResident;components:BuildingComponent[];shadowAdmission?:ShadowBatchAdmission;groups:GroupProduction[];bindings:PreparedChunkBindings<BuildingComponent>;closed:boolean;consumed:boolean};
 const preparedChunkConstructions=new WeakMap<PreparedDelegated500Data,ChunkConstruction>();
 let currentChunkConstruction:ChunkConstruction|undefined;
 let reflectionResidentRevision=0;const reflectionClipUniforms=createResidentReflectionUniforms(),reflectionObjectID=createResidentReflectionObjects();

 let sceneEnvironment=defaultSceneEnvironment(mobile),ownerReducedMotion=reducedMotion;let sceneSunInstant=sceneEnvironment.instantISO,sceneSunOrigin:[number,number]=[0,0],sceneSun=sceneSolarLight(0,0,sceneSunInstant);const uploadSceneLight=createSceneLightUniforms();
 let solarBoundary:PreparedSolarBoundary|undefined,shadowSourceBoundarySHA='',fixedShadowIndices=new Uint32Array(),fixedShadowRanges:{start:number;end:number;box:number[]}[]=[],solarShadowAdmitted=0,solarShadowWithheld=0,solarShadowMode='awaiting-boundary',solarShadowSignature='';let solarShadowAdmittedKeys=new Set<string>();
 // Every city whose frozen partition certificate is closed compiles one bounded program per
 // family; a whole-city program exceeds the Metal compile time the GPU watchdog allows.
 const berlinCurrent=city==='berlin';let currentFamilyPrograms=berlinCurrent;
 let partitionEnabled=berlinCurrent;
 const programKey=(family:number)=>currentFamilyPrograms?currentPaintProgramKey(family):paintProgramKey(family,city);
 const programOverrideKey=()=>{const value=Math.fround(paintOverride());return Math.abs(value)>Math.fround(.01)?programKey(currentFamilyPrograms?value:value>=1000?Math.floor(Math.fround(value+.5)):value):undefined;};
 let legacySolarPartitions=false;
 const legacyPartitionFragment=(key:string)=>applyDelegatedPaintWrappers(paintProgramFragment(key,city),city,DELEGATED_LEGACY_PARTITION_WRAPPERS);
 let cityPaintFragment='',cityPaintFragmentBytes=0;let f004645Available=false;let f020Whole1679Available=false,f020Chapel1679Available=false;let f269640Available=false;let f285634Available=false;let f235631Available=false;let f244627Available=false;let f244622Available=false;let f244619Available=false;let f358604Available=false;let f238Body595Available=false;let f358Normal579Available=false;let f346562Available=false;let f355Clip559Available=false;
 let {sharedPaulLobeRichProgram,exactRichProgramKeys}:{sharedPaulLobeRichProgram:boolean;exactRichProgramKeys:ReadonlyMap<string,string>}={sharedPaulLobeRichProgram:false,exactRichProgramKeys:new Map<string,string>()};
 const richPaintProgramKey=(baseKey:string)=>exactRichProgramKeys.get(baseKey)??berlinPaulLobeRichKey(baseKey,sharedPaulLobeRichProgram);
 let distantMaterialAvailable=false;
 const distantQuality=new Map<string,ProjectedDetailQuality>();
 const distantPaintProgramKey=(baseKey:string)=>distantMaterialAvailable&&distantQuality.get(baseKey)==='distant'?BERLIN_DISTANT_PAUL_LOBE_KEY:richPaintProgramKey(baseKey);
 const partitionPrograms=new Map<string,WebGLProgram>(),partitionFailures=new Map<string,string>();let currentVisibleProgramCount=0,currentProgramEvictions=0,currentInitialFragmentBytes=0,currentLastFragmentBytes=0;let partitionRuns:PaintProgramRun[]=[],partitionPending=false;let offscreenPaintRunsSkipped=0;let partitionCompileAttempt:{key:string;startedAt:string;state:'started'|'ready'|'failed';elapsedMs?:number;error?:string}|undefined;
 const programIdleRetirement=createPaintProgramIdleRetirement({
  programs:partitionPrograms,
  required:()=>(!mainWorldMatrix || !currentFamilyPrograms || !lastPartitionDrawKeys) && !destroyed && !pageHidden && enabled
   ? new Set(partitionPrograms.keys()) : new Set([...(lastPartitionDrawKeys ?? []), ...mainProtectedProgramKeys(), ...activeCaptureProgramKeys()]),
  release:value=>{if(gl)programPreparation.releaseProgram(gl, value);currentProgramEvictions++;}
 });

 let progressiveShaderSpecialization:ReturnType<typeof facadePaintSpecializationForCity>|undefined;
 const diagnosticParams=new URLSearchParams(location.search);const progressiveDiagnostic=location.hostname==='127.0.0.1'&&diagnosticParams.get('sample')?.startsWith('progressive-')?diagnosticParams.get('paintDiagnostic'):null;
 const finitePaintCompileTrace=location.hostname==='127.0.0.1'&&diagnosticParams.get('diagnostics')==='1';
 const diagnostic557=finitePaintCompileTrace&&city==='hamburg'&&diagnosticParams.get('review303')==='44';let compileStage557:Record<string,unknown>|undefined,contextLossSnapshot557:Record<string,unknown>|undefined;const compileEvents557:Record<string,unknown>[]=[];const recordCompile557=(event:Record<string,unknown>)=>{if(diagnostic557){compileEvents557.push(event);if(compileEvents557.length>24)compileEvents557.shift();}};

 const immutableAltesSourceReadback=createNativeSourceReadback(city==='stuttgart'&&location.hostname==='127.0.0.1'&&diagnosticParams.get('diagnostics')==='1'&&diagnosticParams.get('sample')==='progressive-stuttgart-22988');
 let rathausProxyMasks=createRathausProxyMasks();let s434DisplayProfile:S434AggregateProfile|null=null;let s434PackingDiagnostic:S434AggregatePackingState['diagnostic']|undefined;let s434DrawableCounts=new Map<string,number>();let partialGateDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s402ConnectorDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s036NorthCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s240BaseCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let f151CrownDisplay={enabled:false,reason:'not committed',maskedVertices:0,maskedTriangles:0,sourceRetained:true,sourceDisplayDifference:false};
 let generation=0,viewRevision=0,enabled=false,opacity=1,opacityContext:'normal'|'route-selection'='normal',destroyed=false,gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,texturedProgram:WebGLProgram|undefined,diffuseProgram:WebGLProgram|undefined,diffuseShaderFailure:string|undefined,diffuseShaderAttempted=false,textureShaderFailure:string|undefined,textureShaderAttempted=false;
 let mainGeometryProgramFailure:string|undefined,mainDrawFailure:string|undefined;
 // visibleCompileSlotFrame: the mainFrame whose one visible colour compile is
 // spent (prepareMainPrograms).
 let mainWorldMatrix:Float64Array|undefined,mainFrame=0,visibleCompileSlotFrame=-1,residentTextureStyles:number[]=[];
 // Resident visible keys whose compile in this mainFrame's prepareMainPrograms
 // was answered with a held page-ledger wait, and the last partition draw's own
 // programs (kept while hidden or disabled).
 let heldMainWaitKeys=new Set<string>(),heldMainWaitFrame=-1,lastPartitionDrawKeys:Set<string>|undefined;
 type MainFrameWitness={incarnation:number;generation:number;geometryRevision:number;viewRevision:number;projection:Float64Array;bindings:MainDrawBindings;programs:Map<string,WebGLProgram>;empty:boolean};
 let mainGPUIncarnation=0,residentMainMasksReady=false,mainFrameWitness:MainFrameWitness|undefined,pendingMainFrame:MainFrameWitness|undefined;
 function invalidateMainFrame(){mainFrameWitness=undefined;pendingMainFrame=undefined;}
 function takeCompletedMainFrame():MainFrameWitness|undefined{const value=pendingMainFrame;pendingMainFrame=undefined;return value;}
 function mainBindingStamp(){const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;return captureMainDrawBindings([paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),Number(facadeAttached),window?.residentRevision,window?.ready,window?.textureObjects,diffuse?.plaster.residentRevision,diffuse?.plaster.ready,diffuse?.brick.residentRevision,diffuse?.brick.ready,diffuse?.totalTextureObjects],sceneChunks);}
 function mainRolePrograms(){
  if(!program)return undefined;const roles=new Map<string,WebGLProgram>([['base',program]]);
  for(const key of mainPaintProgramKeys()){const value=key==='base'||key===currentPaintProgramKey(0)?program:partitionPrograms.get(key);if(!value)return undefined;roles.set(key,value);}
  if(paintMode()===1&&landmarkVisible&&facadeAttached&&windowTexture?.stats.textureObjects){if(surfaceFragment){if(texturedProgram)roles.set('material:window',texturedProgram);else if(true)return undefined;}if(diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment){if(diffuseProgram)roles.set('material:diffuse',diffuseProgram);else if(true)return undefined;}}
  return roles;
 }
 function hasRequiredMainFailure(){if(geometryUploadFailure!==undefined||mainGeometryProgramFailure!==undefined||mainDrawFailure!==undefined||batchPreparationFailure!==undefined||materialSourceFailure!==undefined||contextRecoveryFailure!==undefined)return true;for(const key of mainPaintProgramKeys())if(partitionFailures.has(key))return true;return false;}
 function mainWitnessCurrent(value:MainFrameWitness|undefined){
  if(!value||destroyed||pageHidden||!enabled||!gl||gl.isContextLost()||!mainWorldMatrix||value.incarnation!==mainGPUIncarnation||value.generation!==generation||value.geometryRevision!==geometryPublishedRevision||value.viewRevision!==viewRevision||!sameMainDrawBindings(value.bindings,mainBindingStamp())||hasRequiredMainFailure())return false;
  for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i])||value.projection[i]!==mainWorldMatrix[i])return false;
  if(value.empty)return !!residentGPU?.isEmptyReady();if(!gpuReady()||!matrix||!residentMainMasksReady)return false;const programs=mainRolePrograms();if(!programs||programs.size!==value.programs.size)return false;for(const [key,p]of programs)if(value.programs.get(key)!==p)return false;return true;
 }
 function mainFrameCurrent(){return mainWitnessCurrent(mainFrameWitness);}
 function captureMainFrameWitness(empty=false):MainFrameWitness|undefined{
  if(!mainWorldMatrix||!gl||gl.isContextLost()||destroyed||pageHidden||!enabled)return undefined;for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i]))return undefined;const programs=empty?new Map<string,WebGLProgram>():mainRolePrograms();if(!programs)return undefined;return{incarnation:mainGPUIncarnation,generation,geometryRevision:geometryPublishedRevision,viewRevision,projection:new Float64Array(mainWorldMatrix),bindings:mainBindingStamp(),programs,empty};
 }
 function recordCompleteMainFrame(empty=false,expected?:MainFrameWitness){
  if(!mainWorldMatrix||!gl||gl.isContextLost()||destroyed||pageHidden||!enabled||hasRequiredMainFailure())return;for(let i=0;i<16;i++)if(!Number.isFinite(mainWorldMatrix[i]))return;
  if(empty){if(sceneIndexCount()||pendingGeometry||pendingMaterialBatches||dataPreparationPending||!residentGPU?.isEmptyReady())return;}else if(pendingGeometry||pendingMaterialBatches||dataPreparationPending||geometryUploadPending||!gpuReady()||!matrix||!residentMainMasksReady)return;
  const value=expected??captureMainFrameWitness(empty);if(!value||!mainWitnessCurrent(value))return;mainFrameWitness=value;
  if(contextRecoveryPending&&!pendingGeometry&&!pendingMaterialBatches&&!dataPreparationPending&&mainFrameCurrent()){contextRecoveryPending=false;contextRecoverySuccesses++;}
 }

 let matrix:Float64Array|undefined,anchor:[number,number]=[0,0],anchorUnit=1,vertices=new Float32Array(),indices=new Uint32Array(),sourceLoaded=new Map<string,BuildingComponent>(),nativeGroupPlan:NativeGroupDisplayPlan|undefined,loaded=new Map<string,BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number}>();let pickBlocks70=createIndexedPickBlocks70(vertices,indices,loaded.values(),9);const vertexCap=mobile?100000:200000;let lastVisibleUploadCapacity70:ReturnType<typeof koRailUploadCapacity70>|undefined;let selectedIdentity:Identity|undefined,selectionActive=true;const birth=new Map<string,number>(),seenBirth=new Set<string>(),BIRTH_LIMIT=20000;let progressiveData=new Float32Array();let paintData=new Float32Array();let stateData=new Float32Array(),materialAnchor:[number,number]|undefined,materialUnit=1,needsBirth=true,pageHidden=false;
 function paintDetailQuality(components:Array<{box:number[];start:number;end:number;objectId:string;partId:string}>,runs:PaintProgramRun[],overrideKey:string|undefined,available:boolean,clip:Float64Array|undefined,previous:ReadonlyMap<string,ProjectedDetailQuality>){
  const next=new Map<string,ProjectedDetailQuality>();
  if(available&&!overrideKey){
   const canvas=map.getCanvas(),viewport={cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight,drawingBufferWidth:gl!.drawingBufferWidth,drawingBufferHeight:gl!.drawingBufferHeight};
   let first=0;
   for(const run of runs){
    if(berlinDistantFamily(run.key)===undefined||next.get(run.key)==='detail')continue;
    const end=run.firstIndex+run.indexCount;while(first<components.length&&components[first].end<=run.firstIndex)first++;
    let quality:ProjectedDetailQuality='distant',matched=false;
    for(let at=first;at<components.length&&components[at].start<end;at++){
     const c=components[at];matched=true;
     const selected=selectionActive&&!!selectedIdentity&&key(c)===key(selectedIdentity);
     if(classifyProjectedDetail(c.box,clip,viewport,previous.get(run.key)??'detail',selected).quality==='detail'){quality='detail';break;}
    }
    next.set(run.key,matched?quality:'detail');
   }
  }
  return next;
 }
 function updateDistantPaintQuality(components:Array<{box:number[];start:number;end:number;objectId:string;partId:string}>,runs:PaintProgramRun[],overrideKey:string|undefined){const next=paintDetailQuality(components,runs,overrideKey,distantMaterialAvailable,matrix,distantQuality);distantQuality.clear();for(const [key,quality]of next)distantQuality.set(key,quality);}
 const shadowMask=createProjectedShadowMask({requestRepaint:()=>map.triggerRepaint()});
 let shadowProgram:WebGLProgram|undefined,shadowIndices:Uint32Array=new Uint32Array(),shadowAdmittedComponents=0,shadowFailure=false,shadowDraws=0,shadowUploadedIndexCount=0;
 const repaintPaint=()=>{invalidateMainFrame();mainDrawFailure=undefined;pruneProgramPreparation();map.triggerRepaint();};const paintCamera=(event:Event)=>{const p=(event as CustomEvent<{bearing?:number;pitch?:number;zoom?:number;center?:[number,number]}>).detail;(map as MapSurface&{easeTo?:(p:{pitch:number;bearing:number;zoom:number;duration:number;center?:[number,number]})=>void}).easeTo?.({pitch:p?.pitch??60,bearing:p?.bearing??230,zoom:p?.zoom??17.2,duration:250,...(p?.center?{center:p.center}:{})});};document.addEventListener('facade-paint-camera',paintCamera);document.addEventListener('facade-paint-change',repaintPaint);const move=()=>{viewRevision++;matrix=undefined;mainWorldMatrix=undefined;invalidateMainFrame();pruneProgramPreparation();};map.on('move',move);map.on('resize',move);

 let shadowUploadRevision=0,shadowUploadPlan:{context:WebGL2RenderingContext;chunks:DelegatedPackedChunk[];signature:string;program:WebGLProgram;revision:number}|undefined;
 function clearShadowGeometry(){for(const chunk of sceneChunks){chunk.shadow=undefined;chunk.shadowIndexCount=0;}shadowUploadRevision++;shadowUploadPlan=undefined;shadowUploadPending=false;shadowGeometry.release();shadowUploadedIndexCount=0;shadowMask.release();}
 function releaseShadowGPU(){clearShadowGeometry();if(gl&&shadowProgram)programPreparation.releaseProgram(gl,shadowProgram);shadowProgram=undefined;}
 function admitShadow(value?:ShadowBatchAdmission){
  shadowIndices=new Uint32Array();fixedShadowIndices=new Uint32Array();fixedShadowRanges=[];shadowSourceBoundarySHA='';solarShadowSignature='';solarShadowAdmitted=solarShadowWithheld=0;shadowAdmittedComponents=0;shadowFailure=false;
  const p=value?.profile;
  if(!value||!p||p.schema_version!==1||p.city!==city||!/^([a-f0-9]{64})$/.test(value.verifiedBoundarySHA256)||p.source_boundary_sha256!==value.verifiedBoundarySHA256||p.status!=='display-schematic'||p.includes_growth_zero_to_one!==true||p.swept_bbox_actual_city_covered!==true||!Array.isArray(p.fixed_vector)||p.fixed_vector.length!==2||!p.fixed_vector.every((v,i)=>v===SOURCE_SHADOW_VECTOR[i])||!Array.isArray(value.components)||value.components.length>sourceLoaded.size)return;
  const admitted=new Map<string,number>();for(const e of value.components){if(!e||typeof e.objectId!=='string'||typeof e.partId!=='string'||!Number.isSafeInteger(e.triangleCount)||e.triangleCount<=0||admitted.has(key(e)))return;admitted.set(key(e),e.triangleCount);}
  const ranges=[];let count=0;for(const [id,c]of loaded){if(admitted.get(id)===(c.end-c.start)/3||hnStateArchiveShadowSubset50(sourceLoaded.get(id),admitted.get(id)??-1,(c.end-c.start)/3,[...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)||s196ArchShadowSubset(sourceLoaded.get(id),sourceLoaded.get(id)?sourceRoleDisplayProfile(sourceLoaded.get(id)!):null,admitted.get(id)??-1,(c.end-c.start)/3)){ranges.push(c);count+=c.end-c.start;}}
  if(count>sceneIndexCount())return;setChunkShadowRanges(ranges);shadowAdmittedComponents=ranges.length;fixedShadowIndices=new Uint32Array();fixedShadowRanges=ranges;shadowSourceBoundarySHA=value.verifiedBoundarySHA256;
 }
 function updateSolarShadowIndices(){
  solarShadowAdmittedKeys.clear();solarShadowAdmitted=0;solarShadowWithheld=loaded.size;
  const clear=(mode:string)=>{solarShadowMode=mode;solarShadowSignature='none';const changed=sceneChunks.some(c=>c.shadowIndices.length>0);if(changed)setChunkShadowRanges([]);return changed;};
  if(!sceneSun.shadowVector)return clear('sun-below-shadow-altitude');
  if(!solarBoundary)return clear('awaiting-matching-verified-boundary');
  // loaded contains the actual accepted native/owner/derived display triangles after
  // all existing source, owner-shape, group and material validation. This new proof
  // does not label those display meshes native or rewrite their source admissions.
  const ranges=residentSolarShadowRanges(sceneSunOrigin,loaded.values(),sceneSun,solarBoundary,generation,sceneIndexCount());
  for(const c of ranges)solarShadowAdmittedKeys.add(key(c));solarShadowAdmitted=ranges.length;solarShadowWithheld=loaded.size-ranges.length;solarShadowMode=solarShadowWithheld?'solar-projected-partial':'solar-projected';
  const signature=String(generation)+'|'+ranges.map(c=>key(c)+':'+c.start+':'+c.end).join('|');if(signature===solarShadowSignature)return false;solarShadowSignature=signature;
  setChunkShadowRanges(ranges);return true;
 }
 function setChunkShadowRanges(ranges:readonly Identity[]){const wanted=new Set(ranges.map(key));for(const chunk of sceneChunks){const data=chunk.cpu.value;if(!data){chunk.shadowCPU?.release();chunk.shadowCPU=undefined;chunk.shadowIndices=new Uint32Array();continue;}const rows=[...chunk.loaded.values()].filter(c=>wanted.has(key(c))),count=rows.reduce((n,c)=>n+c.end-c.start,0);if(count===data.indices.length){chunk.shadowCPU?.release();chunk.shadowCPU=undefined;chunk.shadowIndices=data.indices;continue;}const contentKey=chunk.contentKey+':shadow-indices:'+rows.map(c=>c.start+':'+c.end).join(',');if(chunk.shadowCPU?.contentKey===contentKey&&chunk.shadowCPU.value){chunk.shadowIndices=chunk.shadowCPU.value;continue;}const store=sceneChunkBindings?.store;if(!store)throw Error('Scene chunk source binding is absent');const next=store.acquire<Uint32Array>({contentKey,role:'dependency',parents:[chunk.cpu],estimate:{category:'shadow',bytes:count*4,precision:'exact'},produce(){const out=new Uint32Array(count);let at=0;for(const c of rows){out.set(data.indices.subarray(c.start,c.end),at);at+=c.end-c.start;}return out;},costs:value=>({category:'shadow',bytes:value.byteLength,precision:'exact',identity:value.buffer})});const value=next.value;if(!value){next.release();throw Error('Chunk shadow indices are unavailable');}chunk.shadowCPU?.release();chunk.shadowCPU=next;chunk.shadowIndices=value;}}
 function delegatedShadowKey(chunk:DelegatedPackedChunk){
  // Both parents normally extend the same large packed identity. Preserve that
  // identity once, with tagged suffixes; unrelated parent keys remain complete.
  const parent=(value:string|undefined)=>typeof value==='string'&&value.startsWith(chunk.contentKey)?['suffix',value.slice(chunk.contentKey.length)]:['full',value];
  return resourceContentKey('delegated-shadow-v4',chunk.contentKey,parent(chunk.geometry?.contentKey),parent(chunk.shadowCPU?.contentKey??chunk.contentKey+':indices-full'));
 }
 function uploadShadow(){
  shadowUploadPending=true;if(!gl||!sceneChunks.some(c=>c.shadowIndices.length)){releaseShadowGPU();return;}
  const context=gl,chunks=sceneChunks;
  try{
   if(!shadowProgram)shadowProgram=programPreparation.compile(context,{resource:'projected-shadow',sharedKey:'projected-shadow-v1',inputs:[S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL],current:()=>gl===context&&!destroyed&&!pageHidden&&enabled,build(){return{vertex:S402_SHADOW_VERTEX_GLSL,fragment:S402_SHADOW_FRAGMENT_GLSL,attributes:[]};}});
   if(!shadowUploadPlan||shadowUploadPlan.context!==context||shadowUploadPlan.chunks!==chunks||shadowUploadPlan.signature!==solarShadowSignature||shadowUploadPlan.program!==shadowProgram)shadowUploadPlan={context,chunks,signature:solarShadowSignature,program:shadowProgram,revision:++shadowUploadRevision};const plan=shadowUploadPlan,revision=plan.revision,current=()=>plan===shadowUploadPlan&&revision===shadowUploadRevision&&gl===context&&chunks===sceneChunks&&!destroyed&&!pageHidden&&enabled&&!context.isContextLost();
   const ready=programPreparation.work(context,{resource:'shadow-geometry-upload',revision,current,work(){const leases:ResidentGeometryLease[]=[];try{
    for(const chunk of chunks){if(!chunk.shadowIndices.length)continue;const parent=chunk.geometry,geometry=parent?.value,data=chunk.cpu.value;if(!parent||!geometry||!data)throw Error('Delegated shadow chunk has no live main parent');leases.push(shadowGeometry.allocate(context,shadowProgram!,{revision,contentKey:delegatedShadowKey(chunk),current,parents:[parent,...(chunk.shadowCPU?[chunk.shadowCPU]:[])],indices:chunk.shadowIndices,indexBuffer:chunk.shadowIndices===data.indices?geometry.indexBuffer:undefined,buffers:[
     {key:'static',buffer:geometry.buffers.get('static')!,attributes:[{name:'a_position',size:3,stride:36,offset:0}]},
     {key:'state',buffer:geometry.buffers.get('state')!,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]},
     {key:'paint',buffer:geometry.buffers.get('paint')!,attributes:[{name:'a_f384_frame',size:4,stride:20,offset:0},{name:'a_f384_family',size:1,stride:20,offset:16},{name:'a_s402_frame',size:2,stride:20,offset:0}]},
     {key:'progressive',buffer:geometry.buffers.get('progressive')!,attributes:[{name:'a_s402_alpha',size:1,stride:16,offset:12}]}
    ]}));}
    if(!shadowGeometry.publish(leases,{generation:revision,context,current}))throw new DOMException('Delegated shadow publication superseded','AbortError');const published=new Map(shadowGeometry.currentLeases.map(lease=>[lease.contentKey,lease]));let shadowIndex=0;for(const chunk of chunks){chunk.shadow=chunk.shadowIndices.length?published.get(leases[shadowIndex++].contentKey):undefined;chunk.shadowIndexCount=chunk.shadow?chunk.shadowIndices.length:0;}shadowUploadedIndexCount=chunks.reduce((n,c)=>n+c.shadowIndices.length,0);shadowFailure=false;
   }finally{for(const lease of leases)lease.release();}}});if(ready){shadowUploadPending=false;shadowUploadPlan=undefined;}
  }catch(error){if(isProgramPreparationPending(error))return;shadowUploadRevision++;shadowUploadPlan=undefined;shadowUploadPending=false;shadowFailure=true;}
 }

function uploadState(contentChanged=true){if(!gl||gl.isContextLost())return;let changed=false;const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);try{for(const chunk of sceneChunks){const buffer=chunk.geometry?.value?.buffers.get('state'),range=chunk.dirtyState;if(buffer&&range){uploadRendererStateRange(gl,buffer,chunk.stateData,range);chunk.dirtyState=undefined;changed=true;}}}finally{if(!gl.isContextLost())gl.bindBuffer(gl.ARRAY_BUFFER,old);}if(changed){if(contentChanged)surfaceContentRevision++;reflectionResidentRevision++;}}
 let geometryUploadRevision=0,geometryPublishedRevision=-1,geometryUploadPending=false,shadowUploadPending=false;
 let pendingGeometry:PackedCandidate|undefined;
 let geometryUploadFailure:string|undefined,residentPublicationFailure:string|undefined,candidateFailureGeneration:number|undefined;
 function candidateTexturePending(candidate:PackedCandidate){
  if(paintMode()!==1||!candidate.state.landmarkVisible)return false;
  const window=windowTexture?.stats,diffuse=diffuseTexture?.stats,styles=candidate.visibleStyles;
  if(window&&!window.ready&&!window.error)return true;
  if(diffuse&&styles.some(style=>style<32&&[0,3,4].includes(style%8))&&!diffuse.plaster.ready&&!diffuse.plaster.error)return true;
  if(diffuse&&styles.some(style=>style<32&&style%8===1)&&!diffuse.brick.ready&&!diffuse.brick.error)return true;
  return false;
 }
 function candidateMainReady(candidate:PackedCandidate){
  if(!mainWorldMatrix||!candidateCurrent(candidate)||!candidate.base||!candidate.maskReady||candidateTexturePending(candidate))return false;
  for(const key of candidatePaintDemand(candidate).keys)if(key!=='base'&&key!==currentPaintProgramKey(0)&&!candidate.partitions.has(key))return false;
  if(paintMode()===1&&candidate.state.landmarkVisible){const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;if(window?.textureObjects&&surfaceFragment&&!candidate.textured)return false;if(window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment&&!candidate.diffuse)return false;}
  return true;
 }
 function refreshCandidateCapture(candidate:PackedCandidate){
  if(candidate.resident){candidate.captureKeys=activeCaptureProgramKeys();return;}
  const data=candidate.preparedData;if(!gl||!mainWorldMatrix||!data||!candidateCurrent(candidate))return;
  const material=candidate.state.material,demand=candidatePaintDemand(candidate),value=Math.fround(paintOverride()),override=Math.abs(value)>Math.fround(.01)?material.currentFamilyPrograms?currentPaintProgramKey(value):paintProgramKey(value>=1000?Math.floor(Math.fround(value+.5)):value,city):undefined,possible=new Set<string>();
  if(paintMode()>1.5){for(const run of candidate.state.partitionRuns){const key=override??run.key;if(!(material.casterFamily0===false&&material.casterBase.get(key)===false))possible.add(key);possible.add(material.distantMaterialAvailable&&demand.quality.get(key)==='distant'?BERLIN_DISTANT_PAUL_LOBE_KEY:material.exactRichProgramKeys.get(key)??berlinPaulLobeRichKey(key,material.sharedPaulLobeRichProgram));}if(berlinCurrent)possible.add(BERLIN_FULL_CURRENT_CAPTURE_KEY);}
  else if(paintMode()===1&&candidate.state.landmarkVisible){possible.add('material:window');possible.add('material:diffuse');}
  candidate.captureKeys=new Set([...activeCaptureProgramKeys()].filter(key=>possible.has(key)));
  // Only a replacement candidate reaches this release (a resident plan returned
  // above): its own partitions serve only its own main demand.
  for(const [key,p]of candidate.partitions)if(!demand.keys.has(key)&&!candidate.captureKeys.has(key)){candidate.partitions.delete(key);programPreparation.releaseProgram(gl,p);}
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
  for(const key of candidate.captureKeys){
   if(key==='base'||key===currentPaintProgramKey(0)||candidate.partitions.has(key)||key==='material:window'&&candidate.textured||key==='material:diffuse'&&candidate.diffuse)continue;
   const materialHelper=key==='material:window'?surfaceFragment:key==='material:diffuse'?diffuseFragment:helper;if(!materialHelper)continue;
   const next=withSourceContext(data,material.materialRecipeRevision,()=>{const full=key===BERLIN_FULL_CURRENT_CAPTURE_KEY,isMaterial=key==='material:window'||key==='material:diffuse',source=full||isMaterial?undefined:currentFamilyPrograms?key===BERLIN_DISTANT_PAUL_LOBE_KEY?{key:'partition:'+key,build:()=>berlinDistantPaintFragment(ensureMaterialSourceWorkspace())!}:undefined:{key:'partition:'+key,build:()=>legacyPartitionFragment(key)},family=full||isMaterial?0:currentFamilyPrograms?key===BERLIN_DISTANT_PAUL_LOBE_KEY?BERLIN_DISTANT_PAUL_LOBE_FAMILY:currentPaintProgramFamily(key):0;return programPreparation.acquireReadyProgram(gl!,colourProgramRecipe(materialHelper,source,family,full,true,key));});
   if(!next)continue;if(!candidateCurrent(candidate)){programPreparation.releaseProgram(gl,next);return;}if(key==='material:window')candidate.textured=next;else if(key==='material:diffuse')candidate.diffuse=next;else candidate.partitions.set(key,next);
  }
 }
 function createResidentMainPlan():PackedCandidate|undefined{
  const data=residentPreparedData;if(!data)return undefined;const state=snapshotPackedResident();state.preparedData=data;
  return{resident:true,gpuIncarnation:mainGPUIncarnation,state,components:[],visibleStyles:residentTextureStyles,shadowAdmission:undefined,preparedData:data,partitions:partitionPrograms,captureKeys:new Set(),mainKeys:new Set(),materialKeys:new Set(),mainDemandKnown:false,closed:false,
   get base(){return program;},set base(value){program=value;},get textured(){return texturedProgram;},set textured(value){texturedProgram=value;textureShaderAttempted=!!value;},get diffuse(){return diffuseProgram;},set diffuse(value){diffuseProgram=value;diffuseShaderAttempted=!!value;},
   get textureFailure(){return textureShaderFailure;},set textureFailure(value){textureShaderFailure=value;textureShaderAttempted=!!value;},get diffuseFailure(){return diffuseShaderFailure;},set diffuseFailure(value){diffuseShaderFailure=value;diffuseShaderAttempted=!!value;},get quality(){return distantQuality;},set quality(value){if(value!==distantQuality){distantQuality.clear();for(const [key,quality]of value)distantQuality.set(key,quality);}},get maskReady(){return residentMainMasksReady;},set maskReady(value){residentMainMasksReady=value;}};
 }
 function prepareResidentMain(){
  if(!sceneIndexCount()||!residentPreparedData)return false;
  try{if(!prepareMaterialSource())return false;const plan=createResidentMainPlan();return !!plan&&prepareMainPrograms(plan);}catch(error){if(isProgramPreparationPending(error))return false;if(!gl?.isContextLost())mainGeometryProgramFailure=String(error).slice(0,512);invalidateMainFrame();return false;}
 }
 function candidateMaterialKeys(candidate:PackedCandidate){
  const keys=new Set<string>();if(paintMode()!==1||!candidate.state.landmarkVisible)return keys;
  const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;if(window?.textureObjects&&surfaceFragment)keys.add('material:window');if(window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment)keys.add('material:diffuse');return keys;
 }
 function candidateTextureRecipesKnown(candidate:PackedCandidate){
  if(paintMode()!==1||!candidate.state.landmarkVisible)return true;const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;if(window&&!window.textureObjects&&!window.error)return false;return !(window?.textureObjects&&diffuse&&diffuse.totalTextureObjects!==2&&!diffuse.plaster.error&&!diffuse.brick.error);
 }
 function prepareMainPrograms(candidate:PackedCandidate){
  const data=candidate.preparedData;if(!gl||!enabled||pageHidden||gl.isContextLost()||!mainWorldMatrix||!data||!candidateCurrent(candidate))return false;
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}',sourceRevision=candidate.state.material.materialRecipeRevision;
  syncFacadeResources();const demand=candidatePaintDemand(candidate);candidate.quality=demand.quality;candidate.mainKeys=demand.keys;candidate.materialKeys=candidateMaterialKeys(candidate);candidate.mainDemandKnown=true;
  refreshCandidateCapture(candidate);
  // A resident family-program plan keeps its invisible colour programs while its
  // partition draw runs: the partition map is that draw's 64-entry last-used set
  // (trimInactivePaintPrograms), so panning back draws the compiled program
  // instead of falling back to the base program while it is rebuilt. A kept
  // program keeps whatever reservation it already has; production colour recipes
  // carry no linked-program allowance, so today a kept program holds no ledger
  // bytes. A candidate's own partitions, legacy partition cities whose draw has
  // no last-used set, and a paint mode without the partition draw (nothing would
  // trim the set there) are still released here; while hidden or disabled,
  // pruneProgramPreparation keeps only the last partition draw's programs.
  if(!candidate.resident||!currentFamilyPrograms||!(partitionEnabled&&paintMode()>1.5)){const protectedKeys=candidate.resident?mainProtectedProgramKeys():demand.keys;for(const [key,p]of candidate.partitions)if(!protectedKeys.has(key)&&!candidate.captureKeys.has(key)){candidate.partitions.delete(key);programPreparation.releaseProgram(gl,p);candidate.maskReady=false;}}
  if(candidate.textured&&!candidate.materialKeys.has('material:window')&&!candidate.captureKeys.has('material:window')){const p=candidate.textured;candidate.textured=undefined;programPreparation.releaseProgram(gl,p);candidate.maskReady=false;}
  if(candidate.diffuse&&!candidate.materialKeys.has('material:diffuse')&&!candidate.captureKeys.has('material:diffuse')){const p=candidate.diffuse;candidate.diffuse=undefined;programPreparation.releaseProgram(gl,p);candidate.maskReady=false;}
  programPreparation.prune();let pending=false;
  if(!candidate.base){try{const next=withSourceContext(data,sourceRevision,()=>compileGeometryProgram(helper));if(!candidateCurrent(candidate)){programPreparation.releaseProgram(gl,next);return false;}candidate.base=next;candidate.maskReady=false;}catch(error){if(!isProgramPreparationPending(error))throw error;pending=true;if(!candidateCurrent(candidate)||gl.isContextLost())return false;}}
  // A resident key whose compile this frame is answered with a held ledger wait
  // (needsFrameAfter false: the owner's onAvailable wake repaints) is recorded,
  // so the draw does not poll it with frames of its own.
  if(candidate.resident){heldMainWaitKeys=new Set();heldMainWaitFrame=mainFrame;}
  // At most one visible colour compile per frame (DECISIONS 03:25), on top of
  // the context scheduler's pacing. Once a new demand this mainFrame leaves a
  // compile pending, the remaining keys
  // only adopt an already linked executable (acquireReadyProgram creates no
  // demand) and otherwise wait for a later frame, which the draw requests for
  // them. Taking a ready program or a held ledger wait (whose owner wake
  // repaints), or polling an already pending exact demand, does not spend the
  // frame's new compile slot. The context scheduler still bounds in-flight work.
  for(const key of demand.keys){if(key==='base'||key===currentPaintProgramKey(0)||candidate.partitions.has(key))continue;if(candidate.resident&&partitionFailures.has(key)){pending=true;continue;}const capped=visibleCompileSlotFrame===mainFrame,budgetWaits=programPreparation.budgetWaits,recipe=withSourceContext(data,sourceRevision,()=>colourProgramRecipe(helper,currentFamilyPrograms?key===BERLIN_DISTANT_PAUL_LOBE_KEY?{key:'partition:'+key,build:()=>berlinDistantPaintFragment(ensureMaterialSourceWorkspace())!}:undefined:{key:'partition:'+key,build:()=>legacyPartitionFragment(key)},currentFamilyPrograms?key===BERLIN_DISTANT_PAUL_LOBE_KEY?BERLIN_DISTANT_PAUL_LOBE_FAMILY:currentPaintProgramFamily(key):0,false,false,key)),alreadyPending=programPreparation.hasPendingProgram?.(gl,recipe)===true;try{const next=withSourceContext(data,sourceRevision,()=>capped?programPreparation.acquireReadyProgram?.(gl!,recipe):compilePartitionProgram(helper,key));if(!next){pending=true;continue;}if(!candidateCurrent(candidate)){programPreparation.releaseProgram(gl,next);return false;}candidate.partitions.set(key,next);partitionFailures.delete(key);if(casterFailures.delete(key))map.triggerRepaint();candidate.maskReady=false;}catch(error){if(!isProgramPreparationPending(error)){if(!candidate.resident)throw error;if(!gl.isContextLost()){partitionFailures.set(key,String(error).slice(0,256));console.error('[delegated500 family shader compile failed]',city,key,String(error));}pending=true;continue;}pending=true;const held=programPreparation.needsFrameAfter?.(budgetWaits)===false;if(!capped&&!held&&!alreadyPending)visibleCompileSlotFrame=mainFrame;if(candidate.resident&&held)heldMainWaitKeys.add(key);if(!candidateCurrent(candidate)||gl.isContextLost())return false;}}
  for(const kind of ['window','diffuse']as const){const key=kind==='window'?'material:window':'material:diffuse',materialHelper=kind==='window'?surfaceFragment:diffuseFragment;if(!candidate.materialKeys.has(key)||(kind==='window'?candidate.textured:candidate.diffuse))continue;if(candidate.resident&&(kind==='window'?candidate.textureFailure:candidate.diffuseFailure)){pending=true;continue;}try{const next=withSourceContext(data,sourceRevision,()=>compileGeometryProgram(materialHelper!,undefined,0,false,false,key));if(!candidateCurrent(candidate)){programPreparation.releaseProgram(gl,next);return false;}if(kind==='window')candidate.textured=next;else candidate.diffuse=next;candidate.maskReady=false;}catch(error){if(!isProgramPreparationPending(error)){if(!candidate.resident)throw error;if(kind==='window')candidate.textureFailure=String(error);else candidate.diffuseFailure=String(error);pending=true;continue;}pending=true;if(!candidateCurrent(candidate)||gl.isContextLost())return false;}}
  programPreparation.prune();if(candidateTextureRecipesKnown(candidate))clearProgramGrantHandoff(candidate.state.generation);
  // Optional image failures preserve the existing fallback; required delegated
  // material shader failures still follow the existing candidate failure path.
  if(pending||!candidate.base||candidateTexturePending(candidate))return false;
  const masks=prepareChunkMasks(candidate.state.sceneChunks,gl,[candidate.base,...[...candidate.partitions].filter(([key])=>demand.keys.has(key)).map(([,p])=>p),...(candidate.textured&&candidate.materialKeys.has('material:window')?[candidate.textured]:[]),...(candidate.diffuse&&candidate.materialKeys.has('material:diffuse')?[candidate.diffuse]:[])]);if(!masks.ready){if(gl.isContextLost()){clearCandidateGPU(candidate);return false;}throw Error(masks.reason??'Candidate mask preparation failed');}candidate.maskReady=true;
  return candidateMainReady(candidate);
 }
 function prepareGeometryUpload(){
  if(!gl||!geometryUploadPending)return;const candidate=pendingGeometry,budgetWaits=programPreparation.budgetWaits;
  try{
   if(candidate&&!sceneIndexCount(candidate.state.sceneChunks)){
    publishPackedResident(candidate);geometryUploadPending=false;releaseGPU();
    // The current draw already passed its empty-frame check while this candidate
    // was pending. Certify the published empty view on a fresh main frame.
    map.triggerRepaint();return;
   }
   // A program this attempt left waiting on the page ledger is repainted by the
   // owner's one onAvailable wake, and a resident material preflight refused for
   // this revision by its gate's wake; a frame now would only poll the refusal.
   if(candidate?!prepareMainPrograms(candidate):!prepareResidentMain()){if(programPreparation.needsFrameAfter?.(budgetWaits)!==false&&!(!candidate&&materialSourceFailure===undefined&&materialSourceGate.waiting&&materialSourceGate.blockedFor(materialSourceWorkRevision)))map.triggerRepaint();return;}
   const revision=geometryUploadRevision,activeProgram=candidate?.base??program;if(!activeProgram)return;
   const ready=programPreparation.work(gl,{resource:'geometry-upload',revision,retainReady:false,current:()=>revision===geometryUploadRevision&&!destroyed&&!pageHidden&&enabled&&!gl!.isContextLost()&&(candidate?candidateMainReady(candidate)&&candidate.base===activeProgram||geometryPublishedRevision===revision&&program===activeProgram:program===activeProgram),work:uploadPreparedGeometry});if(ready&&geometryPublishedRevision===revision)geometryUploadPending=false;
  }catch(error){if(gl.isContextLost()){if(candidate&&pendingGeometry===candidate)clearCandidateGPU(candidate);return;}if(isProgramPreparationPending(error))return;if(candidate&&pendingGeometry!==candidate)return;candidateFailureGeneration=candidate?.state.generation;geometryUploadFailure=String(error).slice(0,512);batchPreparationFailure='Geometry upload: '+geometryUploadFailure;discardGeometryCandidate();geometryUploadPending=false;mainGeometryProgramFailure=batchPreparationFailure;map.triggerRepaint();}
 }
 function upload(){invalidateMainFrame();captureRuntime.invalidate();geometryUploadRevision++;geometryUploadPending=true;if(!residentGPU?.beforeUpload())return;prepareGeometryUpload();}
 function uploadPreparedGeometry(){
  const candidate=pendingGeometry,state=candidate?.state??snapshotPackedResident(),context=gl,activeProgram=candidate?.base??program;if(!context||!activeProgram)throw Error('Geometry upload requires the current context program');if(candidate&&!candidateMainReady(candidate))return;if(candidate){refreshCandidateCapture(candidate);if(!candidateMainReady(candidate))return;}
  const release=candidate?.preparedData?.scope.retain(),revision=geometryUploadRevision,current=()=>gl===context&&revision===geometryUploadRevision&&!destroyed&&!pageHidden&&enabled&&!context.isContextLost()&&(candidate?candidateMainReady(candidate)&&candidate.base===activeProgram:program===activeProgram),leases:ResidentGeometryLease[]=[];
  try{
   if(candidate)writeChunkSelection(state.sceneChunks);
   for(const chunk of state.sceneChunks){const data=chunk.cpu.value;if(!data)throw Error('Packed chunk retired before upload');
    const staticLease=residentGeometry.allocate(context,activeProgram,{revision,contentKey:chunk.contentKey+':gpu-static-v2',current,parents:[chunk.cpu],indices:data.indices,buffers:[{key:'static',data:data.vertices,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24}]},{key:'paint',data:data.paint,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]},{key:'progressive',data:data.progressive,attributes:[{name:'a_progressive_color',size:4,stride:16,offset:0,required:false}]}]});
    try{const staticGeometry=staticLease.value;if(!staticGeometry)throw Error('Static chunk geometry is unavailable');leases.push(residentGeometry.allocate(context,activeProgram,{revision,contentKey:chunk.contentKey+':gpu-binding-v2:'+chunkStateOwner,current,parents:[staticLease,chunk.dynamic,...chunk.source.parents],indices:data.indices,indexBuffer:staticGeometry.indexBuffer,buffers:[{key:'static',buffer:staticGeometry.buffers.get('static')!,attributes:[{name:'a_position',size:3,stride:36,offset:0},{name:'a_normal',size:3,stride:36,offset:12},{name:'a_color',size:3,stride:36,offset:24}]},{key:'state',data:chunk.stateData,dynamic:true,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]},{key:'paint',buffer:staticGeometry.buffers.get('paint')!,attributes:[{name:'a_paint_frame',size:4,stride:20,offset:0,required:false},{name:'a_paint_family',size:1,stride:20,offset:16,required:false}]},{key:'progressive',buffer:staticGeometry.buffers.get('progressive')!,attributes:[{name:'a_progressive_color',size:4,stride:16,offset:0,required:false}]}]}));}finally{staticLease.release();}
   }
   if(!residentGeometry.publish(leases,{generation:state.generation,context,current,cohorts:state.sceneChunkBindings?rendererChunkPublicationCohorts(state.sceneChunkBindings,state.sceneChunks.map((chunk,i)=>({source:chunk.source,contentKey:leases[i].contentKey}))):[]}))throw new DOMException('Delegated chunk publication superseded','AbortError');
   const published=new Map(residentGeometry.currentLeases.map(lease=>[lease.contentKey,lease]));
   for(let i=0;i<state.sceneChunks.length;i++)state.sceneChunks[i].geometry=published.get(leases[i].contentKey);

   geometryPublishedRevision=revision;if(candidate)publishPackedResident(candidate);uploadState(false);clearShadowGeometry();geometryUploadPending=false;reflectionResidentRevision++;geometryUploadFailure=undefined;batchPreparationFailure=undefined;mainGeometryProgramFailure=undefined;mainDrawFailure=undefined;residentGPU?.published();
   try{trimSolarCasterState();uploadShadow();}catch(error){shadowFailure=true;residentPublicationFailure=String(error).slice(0,512);}
  }finally{for(const lease of leases)lease.release();release?.();}
 }
 function rememberFinishedBirth(k:string){if(seenBirth.has(k))seenBirth.delete(k);seenBirth.add(k);}
 function reserveBirthSlot(){while(seenBirth.size+birth.size>=BIRTH_LIMIT){let evicted=false;const selected=selectedIdentity?key(selectedIdentity):undefined;for(const old of seenBirth){if(!loaded.has(old)&&old!==selected){seenBirth.delete(old);evicted=true;break;}}if(!evicted)return false;}return true;}
 function retireUnloadedBirths(){for(const k of birth.keys())if(!loaded.has(k)){birth.delete(k);rememberFinishedBirth(k);}}
 function grow(){if(!needsBirth&&!birth.size)return;const now=clock(),finished=new Set<string>();let changed=false,growing=false;for(const[k,time]of birth)if(now-time>=300){birth.delete(k);finished.add(k);rememberFinishedBirth(k);}for(const c of loaded.values()){const k=key(c);if(!needsBirth&&!birth.has(k)&&!finished.has(k))continue;if(reducedMotion&&!seenBirth.has(k)){if(reserveBirthSlot())rememberFinishedBirth(k);}else if(seenBirth.has(k)){seenBirth.delete(k);seenBirth.add(k);}if(!reducedMotion&&!seenBirth.has(k)&&!birth.has(k)&&reserveBirthSlot())birth.set(k,now);const time=birth.get(k),t=reducedMotion||time===undefined?1:Math.max(0,Math.min(1,(now-time)/300)),growth=t*t*(3-2*t);growing ||= growth<1;const local=localComponent(c);if(!local)continue;const data=local.chunk.stateData,row=local.row;if(Math.abs((data[row.firstVertex]%2)-growth)<=1e-6)continue;for(let i=row.firstVertex;i<row.lastVertex;i++){const state=data[i],style=Math.floor(state/4),select=Math.floor((state%4)/2);data[i]=style*4+select*2+growth;}local.chunk.dirtyState=mergeRendererStateRange(local.chunk.dirtyState,row.firstVertex,row.lastVertex);changed=true;}needsBirth=false;if(changed){viewRevision++;uploadState();}
 // Solar prerender precedes this update: capture the ready mesh on one final
 // frame, including reduced motion with unchanged full-height vertices.
 if(!pageHidden&&(growing||birth.size===0))map.triggerRepaint();}
 function gpuReady(){return !!(gl&&program&&sceneChunks.length&&!gl.isContextLost()&&sceneChunks.every(c=>c.geometry&&!c.geometry.released&&c.geometry.context===gl&&c.geometry.epoch===residentGeometry.store.contextEpoch(gl!)&&!!c.geometry.value));}
 let contextRecoveryAttempts=0,contextRecoverySuccesses=0,contextRecoveryPending=false,contextRecoveryFailure:string|undefined;
 const drawEvents601:Record<string,unknown>[]=[];const seenDraw601=new Set<string>();let drawSequence601=0;
 const recordDraw601=(event:Record<string,unknown>)=>{const row={sequence:++drawSequence601,at:new Date().toISOString(),...event};drawEvents601.push(row);if(drawEvents601.length>512)drawEvents601.shift();console.info('[159 first draw601]',JSON.stringify(row));};
 function contextLost(){shadowGeometry.contextLost();residentGeometry.contextLost();programPreparation.contextLost();if(diagnostic557)contextLossSnapshot557={capturedAt:new Date().toISOString(),stage:compileStage557,lastCompileAttempt:partitionCompileAttempt?{...partitionCompileAttempt}:undefined,cachedKeys:[...partitionPrograms.keys()],cachedPrograms:partitionPrograms.size,components:loaded.size,sourceComponents:sourceLoaded.size,vertices:sceneVertexCount(),triangles:sceneIndexCount()/3,runs:partitionRuns.length,events:[...compileEvents557]};releaseGPU(true);}
 function contextRestored(){
  if(destroyed||!gl||gl.isContextLost())return;
  contextRecoveryAttempts++;contextRecoveryPending=true;contextRecoveryFailure=undefined;shadowGeometry.contextLost();residentGeometry.contextLost();releaseGPU(true);mainGeometryProgramFailure=undefined;geometryUploadFailure=undefined;batchPreparationFailure=undefined;
  try{layer.onAdd(map,gl);move();map.triggerRepaint();}
  catch(error){contextRecoveryPending=false;contextRecoveryFailure=String(error);mainGeometryProgramFailure='WebGL context recovery: '+contextRecoveryFailure;}
 }
 map.on('webglcontextlost',contextLost);map.on('webglcontextrestored',contextRestored);
 let heldSourceOutlines:ReturnType<typeof exactNativePartDisplay>['held']=[];let landmarkVisible=false,facadeAttached=false;
 function syncFacadeResources(){const candidate=pendingGeometry&&candidateCurrent(pendingGeometry)?pendingGeometry:undefined,want=enabled&&(landmarkVisible||!!candidate?.state.landmarkVisible)&&!pageHidden&&paintMode()===1;diffuseTexture?.setNeededMaterials([...residentTextureStyles,...(candidate?.visibleStyles??[])].map(style=>({material:style%8,roof:style>=32})));windowTexture?.setUploadSize(128);diffuseTexture?.setUploadSize(128);windowTexture?.setEnabled(want);diffuseTexture?.setEnabled(want);if(want&&gl&&!gl.isContextLost()&&!facadeAttached){windowTexture?.attach(gl);diffuseTexture?.attach(gl);facadeAttached=true;}else if(!want&&facadeAttached){windowTexture?.detach();diffuseTexture?.detach();facadeAttached=false;if(gl){if(texturedProgram)programPreparation.releaseProgram(gl,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl,diffuseProgram);}texturedProgram=undefined;diffuseProgram=undefined;textureShaderAttempted=false;diffuseShaderAttempted=false;}}
 let reusableVertex673:WebGLShader|undefined;
 const BERLIN_FULL_CURRENT_CAPTURE_KEY='berlin-full-current';
 let solarDepthHelper:string|undefined,solarDepthRevision=0;
 // The partition map owns each colour/capture grant once. Capture rows only
 // borrow these handles; base rows borrow program without inserting an alias.
 function compilePartitionProgram(helper:string,key:string,requiredCapture=false){
  const source=currentFamilyPrograms?(key===BERLIN_DISTANT_PAUL_LOBE_KEY?{key:'partition:'+key,build:()=>berlinDistantPaintFragment(ensureMaterialSourceWorkspace())!}:undefined):{key:'partition:'+key,build:()=>legacyPartitionFragment(key)};
  return compileGeometryProgram(helper,source,currentFamilyPrograms?(key===BERLIN_DISTANT_PAUL_LOBE_KEY?BERLIN_DISTANT_PAUL_LOBE_FAMILY:currentPaintProgramFamily(key)):0,false,requiredCapture,key);
 }
 // A family casts with family 0's program unless its specialized paint closure
 // can discard or write depth. Those families share their own colour program.
 let casterBase=new Map<string,boolean>(),casterFailures=new Map<string,string>(),casterAnalysisPending=new Set<string>(),casterPreparedSources:Map<string,{helper:string;revision:number;fragment:string;fragmentBytes:number;depthEffects:boolean}>=createCasterPreparedSources();let casterFamily0:boolean|undefined=undefined,drawFrame=0,casterCompileFrame=-1,casterRetry=false,casterRetryHeld=false,casterVisibleKnown=false;
 function casterIsBase(key:string){if(key==='base'||key===currentPaintProgramKey(0))return true;const effect=casterBase.get(key);return casterFamily0===false&&effect===false;}
 function solarCasterResidentKeys(){
  if(!sceneIndexCount()||paintMode()<=1.5)return new Set<string>();
  if(berlinCurrent)return new Set([BERLIN_FULL_CURRENT_CAPTURE_KEY]);
  const override=programOverrideKey();
  return new Set(partitionRuns.map(run=>override??run.key).filter(key=>!casterIsBase(key)));
 }
 function solarCaptureDemandActive(){return solarCaptureToken!==undefined&&!destroyed&&!pageHidden&&enabled;}
 function captureProgramDemandCurrent(key:string){return activeCaptureProgramKeys().has(key);}
 function reflectionMaterialKey(){if(paintMode()===1&&facadeAttached&&windowTexture?.stats.textureObjects&&surfaceFragment)return diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment?'material:diffuse':'material:window';return 'base';}
 function reflectionRunKeys(){if(partitionEnabled&&paintMode()>1.5){const override=programOverrideKey();return partitionRuns.map(run=>({firstIndex:run.firstIndex,indexCount:run.indexCount,program:distantPaintProgramKey(override??run.key)}));}return[{firstIndex:0,indexCount:sceneIndexCount(),program:reflectionMaterialKey()}];}
 function reflectionCaptureKeys(){return reflectionCaptureToken!==undefined&&!destroyed&&!pageHidden&&enabled?(reflectionDemandPlanned?reflectionDemandKeys:new Set(reflectionRunKeys().map(run=>run.program))):new Set<string>();}
 function activeCaptureProgramKeys(){return new Set([...(solarCaptureDemandActive()?(paintMode()>1.5?solarCasterResidentKeys():[reflectionMaterialKey()]):[]),...reflectionCaptureKeys()]);}
 function reflectionKeyProgram(key:string){return key==='base'||key===currentPaintProgramKey(0)?program:key==='material:window'?texturedProgram:key==='material:diffuse'?diffuseProgram:partitionPrograms.get(key);}
 function trimCapturePrograms(previous=heldCaptureDemandKeys){
  const capture=activeCaptureProgramKeys(),required=new Set([...mainProtectedProgramKeys(),...capture]),retired=new Set([...heldCaptureDemandKeys,...previous]);heldCaptureDemandKeys=capture;let changed=false;
  for(const key of retired){if(required.has(key))continue;const value=partitionPrograms.get(key);if(value){partitionPrograms.delete(key);if(gl)programPreparation.releaseProgram(gl,value);changed=true;}casterPreparedSources.delete(key);}
  if(changed){solarDepthRevision++;reflectionResidentRevision++;captureRuntime.invalidate();}
 }
 function retireCapturePrograms(previous:Set<string>){trimCapturePrograms(previous);captureRuntime.invalidate();pruneProgramPreparation();}
 function resetCaptureDemands(){solarCaptureToken=undefined;reflectionCaptureToken=undefined;reflectionDemandPlanned=false;reflectionDemandKeys.clear();heldCaptureDemandKeys.clear();reflectionProgramFailures.clear();}
 function setCaptureDemand(change:CaptureDemandChange){
  const previous=activeCaptureProgramKeys(),current=change.kind==='solar'?solarCaptureToken:reflectionCaptureToken;
  if(!change.active&&current!==change.token)return;
  if(change.kind==='solar')solarCaptureToken=change.active?change.token:undefined;
  else if(!change.active||current!==change.token){reflectionCaptureToken=change.active?change.token:undefined;reflectionDemandPlanned=false;reflectionDemandKeys=new Set();reflectionProgramFailures.clear();}
  retireCapturePrograms(previous);
 }
 function mainPaintDemand(){
  const scale=1/anchorUnit,clip=mainWorldMatrix?multiply(mainWorldMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]):matrix;
  const visible=readPaintVisibility(loaded,partitionRuns,clip,{publication:sceneSpans,generation,viewRevision,incarnation:mainGPUIncarnation,context:gl,active:!destroyed&&!pageHidden&&enabled}),components=visible.components,override=programOverrideKey();
  const runs=partitionEnabled&&paintMode()>1.5?visible.runs:[];
  return{components,runs,override};
 }
 function mainPaintProgramKeys(demand=mainPaintDemand()){return new Set(demand.runs.map(run=>distantPaintProgramKey(demand.override??run.key)));}
 function mainProtectedProgramKeys(demand=mainPaintDemand()){
  const keys=mainPaintProgramKeys(demand);
  for(const run of demand.runs){const baseKey=demand.override??run.key,key=distantPaintProgramKey(baseKey);if(berlinDistantFamily(baseKey)===undefined||partitionPrograms.has(key))continue;const alternate=key===BERLIN_DISTANT_PAUL_LOBE_KEY?richPaintProgramKey(baseKey):BERLIN_DISTANT_PAUL_LOBE_KEY;if(partitionPrograms.has(alternate))keys.add(alternate);}
  return keys;
 }
 function visibleProgramDemandKeys(){const keys=mainPaintProgramKeys();keys.delete('base');keys.delete(currentPaintProgramKey(0));return keys;}
 function visibleProgramDemandCurrent(key:string){return visibleProgramDemandKeys().has(key);}
 function materialProgramDemandCurrent(key:string){if(paintMode()!==1||!landmarkVisible||!facadeAttached||!windowTexture?.stats.textureObjects)return false;return key==='material:window'?!!surfaceFragment:key==='material:diffuse'&&!!diffuseFragment&&diffuseTexture?.stats.totalTextureObjects===2;}
 function pruneProgramPreparation(){
  trimCapturePrograms();
  // While hidden or disabled, the partition draw that trims its 64-entry
  // last-used set does not run: keep only the last partition draw's programs
  // (showing or re-enabling the same view draws them again) and active capture
  // keys, instead of holding the rest until releaseGPU.
  if(currentFamilyPrograms&&lastPartitionDrawKeys&&(pageHidden||!enabled)&&gl&&!gl.isContextLost()){const context=gl,keep=new Set([...lastPartitionDrawKeys,...activeCaptureProgramKeys()]);currentProgramEvictions+=trimInactivePaintPrograms(partitionPrograms,keep,p=>programPreparation.releaseProgram(context,p),0);}
  const visible=visibleProgramDemandKeys(),solar=solarCaptureDemandActive()?solarCasterResidentKeys():new Set<string>(),current=new Set([...visible,...activeCaptureProgramKeys()]);
  for(const key of casterPreparedSources.keys())if(!current.has(key))casterPreparedSources.delete(key);
  const analysis=new Set(currentFamilyPrograms&&!berlinCurrent?[...solar]:[]);if(analysis.size&&casterFamily0===undefined)analysis.add(currentPaintProgramKey(0));
  for(const key of casterAnalysisPending)if(casterBase.has(key)||!analysis.has(key))casterAnalysisPending.delete(key);
  programPreparation.prune();drainSourceWorkspaces();
 }
 function drainSourceWorkspaces(){
  const main=visibleProgramDemandKeys(),capture=activeCaptureProgramKeys();
  const mainPending=[...main].some(key=>!partitionPrograms.has(key)&&!partitionFailures.has(key)),capturePending=[...capture].some(key=>!reflectionKeyProgram(key)&&!casterFailures.has(key)&&!reflectionProgramFailures.has(key));
  const materialPending=materialProgramDemandCurrent('material:window')&&!texturedProgram&&!textureShaderFailure||materialProgramDemandCurrent('material:diffuse')&&!diffuseProgram&&!diffuseShaderFailure;
  const inactive=destroyed||pageHidden||!enabled;
  if((program||inactive)&&materialSourceSettled&&!mainPending&&!capturePending&&!materialPending){cityPaintFragment='';cityPaintFragmentBytes=0;releaseMaterialSourceClaim();if(!pendingGeometry||inactive)clearProgramSources();if(residentPreparedData)clearDelegated500PaintSourcesForScope(residentPreparedData.scope);}
  // A candidate keeps its one source workspace until its own main demand is
  // complete; compiling only family 0 does not settle the replacement.
 }
 function trimSolarCasterState(){const resident=solarCasterResidentKeys();for(const key of casterFailures.keys())if(!resident.has(key)){casterFailures.delete(key);solarDepthRevision++;}return resident;}
 function prepareCasterClassification(helper:string,key:string){
  const data=residentPreparedData;if(!data)return false;const sourceRevision=materialRecipeRevision,family=casterFamily0===undefined?0:currentPaintProgramFamily(key),analysisKey=currentPaintProgramKey(family),revision=materialSourceWorkRevision;
  if(!casterAnalysisPending.has(analysisKey)&&casterBase.has(analysisKey))return casterFamily0!==undefined&&casterBase.has(key);
  if(casterSourceGate.blockedFor(revision)&&!casterAnalysisPending.has(analysisKey))return false;
  casterAnalysisPending.add(analysisKey);
  const ready=programPreparation.work(gl!,{resource:'caster-source:'+analysisKey,revision,phase:'source-build',priority:'capture',retainReady:false,current:()=>sourceContextCurrent(data,sourceRevision)&&revision===materialSourceWorkRevision&&!casterBase.has(analysisKey)&&solarCaptureDemandActive()&&partitionRuns.some(run=>(programOverrideKey()??run.key)===key),work(){withPreparedData(data,()=>{let admission:ResourceBudgetReservation|undefined;try{
   if(casterBase.has(analysisKey)){casterAnalysisPending.delete(analysisKey);return;}
   // Like a colour ticket: one preflight claim of the workspace's own identities
   // plus any drained material rebuild, so prepareSource and the rebuild inside
   // it add no bytes. Never fitting the page is an explicit failure.
   const recipe=colourSourceRecipe(helper,undefined,data),ledger=pageBudget(),text=materialTextRequirement(data),families=currentFamilyPrograms?linkedPaint.families(family):[family],costs=[...(programSources.programBudget(recipe,'',[],families).workspaceCosts??[]),...text.costs];
   assertDelegatedCostsFit(ledger,costs,'delegated500 '+city+' caster classification '+analysisKey,text.heldBytes);
   const preflight=ledger.tryReserve(costs,{label:'delegated500 caster classification'});
   if(preflight.ok!==true){casterAnalysisPending.delete(analysisKey);casterSourceGate.block(revision,ledger);return;}
   admission=preflight.reservation;casterSourceGate.clear();
   const specialized=programSources.prepareSource(recipe,families);
   casterBase.set(analysisKey,specialized.depthEffects);if(family===0)casterFamily0=specialized.depthEffects;
   if(family!==0&&!(casterFamily0===false&&specialized.depthEffects===false))casterPreparedSources.set(analysisKey,{helper,revision,...specialized,fragmentBytes:utf8ByteLength(specialized.fragment)});
   casterAnalysisPending.delete(analysisKey);
  }catch(error){if(!(error instanceof Error&&error.name==='ResourceBudgetExceededError'))throw error;casterAnalysisPending.delete(analysisKey);casterSourceGate.block(revision,pageBudget());}finally{admission?.release();clearDelegated500PaintSourcesForScope(data.scope);}});}});
  if(!ready)return false;casterAnalysisPending.delete(analysisKey);return casterFamily0!==undefined&&casterBase.has(key);
 }
 const casterProgram=(key:string)=>casterIsBase(key)?program:partitionPrograms.get(key);
 function prepareFamilyCasters(helper:string,budget:SolarShadowPreparationBudget):SolarShadowPreparationResult{
  // Visible demand reports first; retain the existing one-program/frame cap.
  const resident=trimSolarCasterState(),missing=(key:string)=>casterAnalysisPending.has(key)||!partitionPrograms.has(key)&&!casterFailures.has(key),budgetWaits=programPreparation.budgetWaits;
  if(casterVisibleKnown&&casterCompileFrame!==drawFrame)for(const key of resident){if(!missing(key))continue;
   let next:WebGLProgram|undefined;
   try{const prepared=budget.compile('delegated500-solar:'+key,String(materialRecipeRevision),()=>{if(!prepareCasterClassification(helper,key))throw new ProgramPreparationPending();if(casterIsBase(key)||partitionPrograms.has(key))return undefined;casterCompileFrame=drawFrame;return compilePartitionProgram(helper,key,true);});if(prepared.status==='pending'){casterRetry=true;break;}next=prepared.value;if(!next)continue;if(gl!.isContextLost())return solarShadowPreparation(0,1);partitionPrograms.set(key,next);}
   catch(error){if(isProgramPreparationPending(error)){casterRetry=true;break;}casterAnalysisPending.delete(key);casterAnalysisPending.delete(currentPaintProgramKey(0));casterPreparedSources.delete(key);if(next&&!gl!.isContextLost())programPreparation.releaseProgram(gl!,next);casterFailures.set(key,String(error).slice(0,256));if(!gl!.isContextLost())console.error('[delegated500 solar caster shader compile failed]',city,key,String(error));}
   solarDepthRevision++;break;
  }
  let ready=0,pending=0,failed=0;for(const key of new Set(partitionRuns.map(run=>programOverrideKey()??run.key))){if(casterIsBase(key)||partitionPrograms.has(key))ready++;else if(casterFailures.has(key))failed++;else pending++;}
  // The one caster attempt per call: a ledger refusal wakes through the owner.
  // Every missing caster waits behind that one attempt, so all of them are
  // budget waiting: the capture needs no frame and the draw takes no revision
  // step for them until the owner's onAvailable wake repaints.
  const held=programPreparation.needsFrameAfter?.(budgetWaits)===false;casterRetryHeld=held;
  if(pending&&!failed){casterRetry=true;if(!held)map.triggerRepaint();}
  return solarShadowPreparation(ready,pending,failed,held?pending:0);
 }
 // Capture owns no second program collection. Cancelling its preparation keeps
 // already published colour grants alive for draw/reflection and normal LRU.
 function releaseSolarDepth(){casterFailures.clear();casterPreparedSources.clear();solarDepthHelper=undefined;solarDepthRevision++;}
 function prepareSolarPrograms(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  pruneProgramPreparation();
  if(solarCaptureToken===undefined||(!currentFamilyPrograms&&!legacySolarPartitions)||paintMode()<=1.5||destroyed||pageHidden||!enabled||!sceneIndexCount()||opacityContext==='route-selection'||opacity<.99||needsBirth||birth.size||!gl||gl.isContextLost()||!gpuReady()||!sceneEnvironment.sunlight||!sceneEnvironment.shadows||!sceneSun.shadowVector)return solarShadowPreparation();
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';if(solarDepthHelper!==helper){releaseSolarDepth();solarDepthHelper=helper;}
  if(!berlinCurrent&&!legacySolarPartitions)return prepareFamilyCasters(helper,budget);
  // A key the ledger refused with a held wake (needsFrameAfter false) is
  // budgetWaiting and gives this visit's one compile slot back (R2), so the next
  // key still gets its attempt. A key the slot then skips waits behind a ready or
  // started compile, not behind that wake: it is ordinary pending and keeps the
  // frame request, as in the other families.
  let ready=0,pending=0,failed=0,budgetWaiting=0;
  for(const key of trimSolarCasterState()){
   if(partitionPrograms.has(key)){ready++;continue;}
   if(casterFailures.has(key)){failed++;continue;}
   let next:WebGLProgram|undefined;const budgetWaits=programPreparation.budgetWaits;
   try{
    // Berlin's original complete fragment is not the specialized family-0
    // recipe. Keep it independent, with the original main/discard/depth writes.
    const prepared=budget.compile('delegated500-solar:'+key,String(materialRecipeRevision),()=>key===BERLIN_FULL_CURRENT_CAPTURE_KEY?compileGeometryProgram(helper,undefined,0,true,true,key):compilePartitionProgram(helper,key,true));if(prepared.status==='pending'){pending++;continue;}next=prepared.value;
    if(gl.isContextLost())return solarShadowPreparation(ready,pending+1,failed);
    partitionPrograms.set(key,next);solarDepthRevision++;ready++;
   }catch(error){if(isProgramPreparationPending(error)){pending++;if(programPreparation.needsFrameAfter?.(budgetWaits)===false)budgetWaiting++;continue;}if(next&&!gl.isContextLost())programPreparation.releaseProgram(gl,next);casterFailures.set(key,String(error).slice(0,256));solarDepthRevision++;failed++;if(gl.isContextLost())return solarShadowPreparation(ready,pending+1,failed);}
  }
  return solarShadowPreparation(ready,pending,failed,budgetWaiting);
 }
 function solarProgramStats(){const keys=[...solarCasterResidentKeys()],resident=keys.filter(key=>partitionPrograms.has(key));return{casters:currentFamilyPrograms&&!berlinCurrent?{own:resident.length,pending:keys.filter(key=>!partitionPrograms.has(key)&&!casterFailures.has(key)).length,failures:[...casterFailures]}:undefined,programs:resident.length,keys:resident,revision:solarDepthRevision,failures:[...casterFailures],legacyKeys:legacySolarPartitions?resident:[],sharedColourPrograms:true};}
 function releaseGPU(preserveCandidate=false){programIdleRetirement.reset();invalidateMainFrame();residentMainMasksReady=false;mainGPUIncarnation++;clearProgramGrantHandoff();resetCaptureDemands();if(!preserveCandidate){clearDataPreparation();if(pendingMaterialBatches||pendingGeometry)batchPreparationFailure??='Delegated candidate preparation cancelled';cancelPendingMaterialBatches();discardGeometryCandidate();}else if(pendingGeometry)clearCandidateGPU(pendingGeometry);mainDrawFailure=undefined;clearShadowGeometry();residentGeometry.release();clearMaterialSource();geometryUploadRevision++;geometryUploadPending=preserveCandidate&&!!pendingGeometry;shadowUploadPending=false;gpuInitializationPrepared=false;const withdrawnWake=programPreparation.waitingForBudget===true;programPreparation.cancel();captureRuntime.invalidate();releaseSolarDepth();casterRetry=false;casterVisibleKnown=false;casterCompileFrame=-1;casterRetryHeld=false;heldMainWaitFrame=-1;lastPartitionDrawKeys=undefined;residentGPU?.released();if(gl&&reusableVertex673)gl.deleteShader(reusableVertex673);reusableVertex673=undefined;if(gl)for(const p of partitionPrograms.values())programPreparation.releaseProgram(gl,p);partitionPrograms.clear();partitionFailures.clear();distantQuality.clear();currentVisibleProgramCount=0;for(const chunk of sceneChunks)chunk.masks.detach();rathausProxyMasks.detach();facadeAttached=false;diffuseTexture?.detach();windowTexture?.detach();matrix=undefined;mainWorldMatrix=undefined;viewRevision++;releaseShadowGPU();if(gl){if(program)programPreparation.releaseProgram(gl,program);if(texturedProgram)programPreparation.releaseProgram(gl,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl,diffuseProgram);}program=undefined;texturedProgram=undefined;textureShaderAttempted=false;diffuseProgram=undefined;diffuseShaderAttempted=false;
  // Cancelling withdrew a held page-ledger wake that this draw and the capture
  // owners wait on instead of polling: request the one frame it would have given.
  if(withdrawnWake&&!destroyed)map.triggerRepaint();}
 function selectColourProgramConsumer(helper:string,sourceKey:string,family:number,unpruned:boolean,expected:{currentFamilyPrograms:boolean;partitionEnabled:boolean;legacySolarPartitions:boolean},origin:PreparedDelegated500Data,originRevision:number,mainOnly=false){
  if(destroyed||pageHidden||!enabled)return undefined;
  const baseHelper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
  const consumes=(material:typeof expected,keys:ReadonlySet<string>,materials:ReadonlySet<string>,capture:ReadonlySet<string>,needsBase:boolean)=>{
   if(material.currentFamilyPrograms!==expected.currentFamilyPrograms||material.partitionEnabled!==expected.partitionEnabled||material.legacySolarPartitions!==expected.legacySolarPartitions)return false;
   if(!unpruned&&family===0&&sourceKey==='current'){if(needsBase&&helper===baseHelper)return true;if(helper===surfaceFragment&&(materials.has('material:window')||capture.has('material:window')))return true;if(helper===diffuseFragment&&(materials.has('material:diffuse')||capture.has('material:diffuse')))return true;}
   if(helper!==baseHelper)return false;
   for(const key of new Set([...keys,...capture])){
    if(key==='base'||key===currentPaintProgramKey(0)||key==='material:window'||key==='material:diffuse')continue;
    if(key===BERLIN_FULL_CURRENT_CAPTURE_KEY){if(unpruned&&family===0&&sourceKey==='current')return true;continue;}
    if(unpruned)continue;
    const keyFamily=material.currentFamilyPrograms?key===BERLIN_DISTANT_PAUL_LOBE_KEY?BERLIN_DISTANT_PAUL_LOBE_FAMILY:currentPaintProgramFamily(key):0,keySource=material.currentFamilyPrograms&&key!==BERLIN_DISTANT_PAUL_LOBE_KEY?'current':'partition:'+key;
    if(family===keyFamily&&sourceKey===keySource)return true;
   }
   return false;
  };
  const candidate=pendingGeometry,activeCapture=mainOnly?new Set<string>():activeCaptureProgramKeys();
  if(candidate&&candidateCurrent(candidate)&&candidate.mainDemandKnown&&candidate.preparedData&&!candidate.preparedData.scope.stats.disposed&&consumes(candidate.state.material,candidate.mainKeys,candidate.materialKeys,new Set([...candidate.captureKeys].filter(key=>activeCapture.has(key))),true))return{data:candidate.preparedData,revision:candidate.state.material.materialRecipeRevision};
  const data=residentPreparedData;if(data&&!data.scope.stats.disposed&&sceneIndexCount()){const materials=new Set<string>();if(materialProgramDemandCurrent('material:window')&&!textureShaderFailure)materials.add('material:window');if(materialProgramDemandCurrent('material:diffuse')&&!diffuseShaderFailure)materials.add('material:diffuse');if(consumes({currentFamilyPrograms,partitionEnabled,legacySolarPartitions},mainPaintProgramKeys(),materials,activeCapture,true))return{data,revision:materialRecipeRevision};}
  // Explicit raw source arguments have no independently described successor;
  // retain their original scope fence rather than assuming cross-view identity.
  if(!mainOnly&&sourceKey!=='current'&&!sourceKey.startsWith('partition:')&&sourceContextCurrent(origin,originRevision))return{data:origin,revision:originRevision};
  return undefined;
 }
 /** A program ticket that also holds the drained material text's rebuild. */
 const withMaterialTextCosts=(value:ProgramPreparationBudget,costs:readonly ResourceBudgetCost[]|undefined):ProgramPreparationBudget=>costs?.length?Object.freeze({...value,workspaceCosts:Object.freeze([...(value.workspaceCosts??[]),...costs])}):value;
 function colourProgramRecipe(helper:string,paintFragment:string|{key:string;build:()=>string}|undefined,currentFamily:number,unpruned:boolean,requiredCapture:boolean,demandKey:string|undefined,sourceRecipe?:DelegatedColourSourceRecipe,materialTextCosts?:readonly ResourceBudgetCost[]){
  const data=committingPreparedData??residentPreparedData;if(!data)throw new ProgramPreparationPending();const sourceRevision=materialRecipeRevision,prune=currentFamilyPrograms&&!unpruned,sourceKey=paintFragment===undefined?'current':typeof paintFragment==='string'?paintFragment:paintFragment.key,material={currentFamilyPrograms,partitionEnabled,legacySolarPartitions};
  return{sharedKey:'delegated500-colour',resource:'colour:'+currentFamily,inputs:[VERTEX,helper,city,sourceKey,String(currentFamily),String(currentFamilyPrograms),String(partitionEnabled),String(legacySolarPartitions),String(prune),String(!berlinCurrent),JSON.stringify(colourSpecializationFamilies(sourceKey,currentFamily,unpruned)),'attributes:a_position,a_normal,a_color,a_selected,a_paint_frame,a_paint_family,a_progressive_color','override:uniform-reset','mask:rathaus-per-draw','texture:helper-bindings','reflection-clip:per-draw','depth-bias:original-source'],provenance:[delegatedColourSourceAuthority,delegatedPreparedSourceAuthority],current:()=>!!selectColourProgramConsumer(helper,sourceKey,currentFamily,unpruned,material,data,sourceRevision),priority:requiredCapture&&!selectColourProgramConsumer(helper,sourceKey,currentFamily,unpruned,material,data,sourceRevision,true)?'capture' as const:'visible' as const,currentPriority:()=>selectColourProgramConsumer(helper,sourceKey,currentFamily,unpruned,material,data,sourceRevision,true)?'visible' as const:'capture' as const,
   // Acquire-only callers omit sourceRecipe; a compile preflights its exact source
   // and, when its material text is drained, that text's rebuild.
   budget:sourceRecipe?withMaterialTextCosts(programSources.programBudget(sourceRecipe,VERTEX,DELEGATED_COLOUR_ATTRIBUTES,colourSpecializationFamilies(sourceKey,currentFamily,unpruned)),materialTextCosts):undefined};
 }
 const compileGeometryProgram=(helper:string,paintFragment:string|{key:string;build:()=>string}|undefined=undefined,currentFamily=0,unpruned=false,requiredCapture=unpruned,demandKey?:string):WebGLProgram=>{
  if(!prepareMaterialSource())throw new ProgramPreparationPending();
  if(unpruned&&currentFamilyPrograms&&!berlinCurrent)throw Error('Family-program cities cast with their colour programs, never a whole-city program');
  const data=committingPreparedData??residentPreparedData;if(!data)throw new ProgramPreparationPending();if(destroyed||pageHidden||!enabled)throw new ProgramPreparationPending('cancelled');const sourceRevision=materialRecipeRevision,prune=currentFamilyPrograms&&!unpruned,sourceKey=paintFragment===undefined?'current':typeof paintFragment==='string'?paintFragment:paintFragment.key,material={currentFamilyPrograms,partitionEnabled,legacySolarPartitions},families=colourSpecializationFamilies(sourceKey,currentFamily,unpruned);
  // 'current' and Berlin distant sources read the retained material text, unless
  // this family consumes its already classified caster source instead.
  const classified=prune&&paintFragment===undefined?casterPreparedSources.get(currentPaintProgramKey(currentFamily)):undefined,consumesClassified=classified?.helper===helper&&classified.revision===materialSourceWorkRevision;
  const text=!consumesClassified&&(paintFragment===undefined||typeof paintFragment!=='string'&&paintFragment.key==='partition:'+BERLIN_DISTANT_PAUL_LOBE_KEY)?materialTextRequirement(data):undefined;
  const recipe=colourProgramRecipe(helper,paintFragment,currentFamily,unpruned,requiredCapture,demandKey,colourSourceRecipe(helper,paintFragment,data),text?.costs);
  // A single program that, with the material text it reads, exceeds the whole
  // page budget is an explicit failure instead of an endless wait.
  assertDelegatedProgramBudgetFits(pageBudget(),recipe.budget!,'delegated500 '+city+' '+recipe.resource,text?.heldBytes);
  const waiting=programPreparation.waitingForBudget,budgetWaits=programPreparation.budgetWaits;
  const buildFor=(consumer:NonNullable<ReturnType<typeof selectColourProgramConsumer>>)=>withSourceContext(consumer.data,consumer.revision,()=>{try{
   const preparedKey=currentPaintProgramKey(currentFamily),prepared=prune&&paintFragment===undefined?casterPreparedSources.get(preparedKey):undefined;
   if(prepared)casterPreparedSources.delete(preparedKey);
   // Only the admitted workspace calls the paint builder, assembly and specializer.
   const reusable=prepared?.helper===helper&&prepared.revision===materialSourceWorkRevision?prepared:undefined,specialized=reusable??programSources.prepareSource(colourSourceRecipe(helper,paintFragment,consumer.data),families);
   const rawFragment=specialized.fragment;
   if(prune&&paintFragment===undefined){if(currentFamily===0)casterFamily0=specialized.depthEffects;casterBase.set(preparedKey,specialized.depthEffects);}
   if(prune){currentLastFragmentBytes=reusable?.fragmentBytes??utf8ByteLength(rawFragment);if(!currentInitialFragmentBytes)currentInitialFragmentBytes=currentLastFragmentBytes;}
   if(diagnostic557)compileStage557={stage:'scheduled-source',sourceBytes:rawFragment.length,contextLost:gl!.isContextLost()};
   // The solar target has no colour attachment. Keep the identical colour main;
   // overriding its final output would only create a second executable.
   return{vertex:VERTEX,fragment:withResidentReflectionClip(rawFragment),attributes:DELEGATED_COLOUR_ATTRIBUTES};
  }finally{clearDelegated500PaintSourcesForScope(consumer.data.scope);}});
  const select=()=>selectColourProgramConsumer(helper,sourceKey,currentFamily,unpruned,material,data,sourceRevision);
  try{return programPreparation.compile(gl!,{...recipe,
   resolveSource(){
    const consumer=select();if(!consumer)throw new ProgramPreparationPending('cancelled');
    // The shared queue may now serve a successor scene. Reserve the workspace
    // and material rebuild belonging to that scene, not the enqueue-time one.
    const budget=withSourceContext(consumer.data,consumer.revision,()=>{
     const classified=prune&&paintFragment===undefined?casterPreparedSources.get(currentPaintProgramKey(currentFamily)):undefined;
     const reusable=classified?.helper===helper&&classified.revision===materialSourceWorkRevision;
     const text=!reusable&&(paintFragment===undefined||typeof paintFragment!=='string'&&paintFragment.key==='partition:'+BERLIN_DISTANT_PAUL_LOBE_KEY)?materialTextRequirement(consumer.data):undefined;
     const value=withMaterialTextCosts(programSources.programBudget(colourSourceRecipe(helper,paintFragment,consumer.data),VERTEX,DELEGATED_COLOUR_ATTRIBUTES,families),text?.costs);
     assertDelegatedProgramBudgetFits(pageBudget(),value,'delegated500 '+city+' '+recipe.resource,text?.heldBytes);return value;
    });
    const current=()=>{const active=select();return !!active&&active.data===consumer.data&&active.revision===consumer.revision;};
    return{budget,current,build(){if(!current())throw new ProgramPreparationPending('cancelled');return buildFor(consumer);}};
   },
   build(){const consumer=select();if(!consumer)throw new ProgramPreparationPending('cancelled');return buildFor(consumer);}
  });}
  catch(error){
   // A refusal that starts this owner's ledger wait first trims this renderer's
   // own last-used set, oldest first and never a visible or capture-protected
   // key, until the page ledger's committed bytes have dropped by the refused
   // shortfall, then waits on the owner's one onAvailable wake: a trimmed
   // program's retired reservation returns at the next collect and wakes it. A
   // release that returns nothing (a program still shared with a candidate,
   // borrowed by a capture snapshot or holding no charge) does not count, so the
   // trim moves on instead of waiting while older idle programs keep their bytes.
   // Only charged programs can cure a refusal, so nothing is trimmed while this
   // owner holds no charged program bytes. Budgeted colour recipes are charged:
   // each one held by this owner keeps its explicit driver allowance or, when it
   // has none, the LINKED_PROGRAM_POLICY_ALLOWANCE_BYTES policy estimate
   // (DECISIONS 2026-11-02 03:25), so they are what this trim returns.
   if(waiting===false&&programPreparation.needsFrameAfter?.(budgetWaits)===false&&currentFamilyPrograms&&gl&&!gl.isContextLost()){
    const held=programPreparation.stats.budget,shortfall=held.lastPressure?.shortfallBytes??0;
    if(shortfall>0&&held.heldDriverAllowanceBytes>0){
     const context=gl,ledger=pageBudget(),committed=()=>{const value=ledger.stats;return value.bytes-value.retiringBytes;},override=programOverrideKey(),keep=new Set([...mainProtectedProgramKeys(),...activeCaptureProgramKeys()]);
     if(partitionPrograms.has(BERLIN_DISTANT_PAUL_LOBE_KEY)&&partitionRuns.some(run=>{const rich=richPaintProgramKey(override??run.key);return berlinDistantFamily(rich)!==undefined&&!partitionPrograms.has(rich);}))keep.add(BERLIN_DISTANT_PAUL_LOBE_KEY);
     let returned=0;
     for(const [key,p]of [...partitionPrograms]){if(returned>=shortfall)break;if(keep.has(key))continue;const before=committed();partitionPrograms.delete(key);programPreparation.releaseProgram(context,p);currentProgramEvictions++;returned+=Math.max(0,before-committed());}
    }
   }
   throw error;
  }
 };
 let residentGPU:ReturnType<typeof createResidentGPULifecycle<WebGL2RenderingContext>>|undefined;
 let gpuPreflightRequired=false,gpuInitializationPrepared=false;
 function initializeResidentGPU(context:WebGLRenderingContext|WebGL2RenderingContext,repackResident:boolean){
  if(!('createVertexArray'in context))throw Error('WebGL2 required');if(gl&&gl!==context)releaseGPU();gl=context as WebGL2RenderingContext;if(!gpuInitializationPrepared)gpuInitializationPrepared=true;
  if(!residentPreparedData){pumpPendingMaterialBatches();if(pendingGeometry)prepareGeometryUpload();return;}
  if(pendingGeometry){prepareGeometryUpload();return;}
  if(sceneIndexCount()&&(repackResident||!gpuReady()||geometryUploadPending)){if(!geometryUploadPending){geometryUploadRevision++;geometryUploadPending=true;}prepareGeometryUpload();return;}
  prepareResidentMain();
 }
 function residentCaptureState(surfaceOpacity:number,solarDepth=false){const windowState=windowTexture?.stats,diffuseState=diffuseTexture?.stats;let materialProgram=program,textureKind=0;if(paintMode()===1&&facadeAttached&&windowTexture&&texturedProgram&&windowState?.textureObjects){materialProgram=texturedProgram;textureKind=1;if(diffuseTexture&&diffuseProgram&&diffuseState?.plaster.textureObjects&&diffuseState.brick.textureObjects){materialProgram=diffuseProgram;textureKind=2;}}let runs:{firstIndex:number;indexCount:number;program:WebGLProgram|undefined}[];
  if(solarDepth&&berlinCurrent&&paintMode()>1.5)runs=[{firstIndex:0,indexCount:sceneIndexCount(),program:partitionPrograms.get(BERLIN_FULL_CURRENT_CAPTURE_KEY)}];
  // Family caster preparation and retention use the original run keys.
  else if(partitionEnabled&&paintMode()>1.5){const overrideKey=programOverrideKey();runs=partitionRuns.map(run=>{const baseKey=overrideKey??run.key,key=solarDepth&&legacySolarPartitions?baseKey:distantPaintProgramKey(baseKey);return{firstIndex:run.firstIndex,indexCount:run.indexCount,program:solarDepth&&currentFamilyPrograms&&!berlinCurrent?casterProgram(baseKey):key==='base'||key===currentPaintProgramKey(0)?program:(partitionPrograms.get(key)??(berlinDistantFamily(baseKey)!==undefined?partitionPrograms.get(key===BERLIN_DISTANT_PAUL_LOBE_KEY?richPaintProgramKey(baseKey):BERLIN_DISTANT_PAUL_LOBE_KEY):undefined))};});}else runs=[{firstIndex:0,indexCount:sceneIndexCount(),program:materialProgram}];
  return {materialProgram,textureKind,runs};
 }
 function solarCasterFailureReason(){const failed=[...solarCasterResidentKeys()].filter(key=>!partitionPrograms.has(key)&&casterFailures.has(key));return failed.length?(currentFamilyPrograms&&!berlinCurrent?'solar-caster-compile-failed:':'solar-depth-compile-failed:')+failed.join(','):undefined;}
 function solarCaptureRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[solarDepthRevision,Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),generation,Number(needsBirth),birth.size,reflectionResidentRevision,reflectionObjectID(program),residentGeometry.scene.version,reflectionObjectID(texturedProgram),reflectionObjectID(diffuseProgram),paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),sceneEnvironment.quality,progressiveDiagnostic,[...distantQuality].map(([key,quality])=>key+':'+quality).join(','),Number(facadeAttached),sceneChunks.map(chunk=>chunk.masks.residentRevision).join('|'),w?.ready,w?.textureObjects,d?.plaster.ready,d?.brick.ready,d?.totalTextureObjects,paintMode()>1.5?[...solarCasterResidentKeys()].sort().map(key=>key+':'+reflectionObjectID(partitionPrograms.get(key))).join(','):''].join('|');}
 function residentCaptureAdapter():ResidentCaptureAdapter{return{revision:solarCaptureRevision,publicationVersion:()=>residentGeometry.scene.version,snapshot(solarDepth){
  if(geometryUploadPending)return{status:'blocked',reason:'geometry-upload-pending',pending:true};
  const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity;
  if(destroyed||pageHidden||!enabled||solarDepth&&(surfaceOpacity<.99||!sceneEnvironment.shadows||!sceneEnvironment.sunlight))return{status:'inactive'};
  if(!sceneIndexCount())return loaded.size?{status:'blocked',reason:'missing-packed-geometry',pending:false}:{status:'inactive'};
  if(solarDepth&&(needsBirth||birth.size))return{status:'blocked',reason:needsBirth?'needs-birth':'growing',pending:true};
  if(!gl||gl.isContextLost()||!gpuReady()||!program)return{status:'blocked',reason:'gpu-unready',pending:!geometryUploadFailure&&!mainGeometryProgramFailure};
  const context=gl,captureData=residentPreparedData,light=sceneSun,sunlight=sceneEnvironment.sunlight,mode=paintMode(),override=paintOverride(),heightUnit=anchorUnit;if(!captureData)return{status:'blocked',reason:'source-scope-unready',pending:true};const window=windowTexture,diffuse=diffuseTexture,windowProgram=texturedProgram,wallProgram=diffuseProgram,capture=residentCaptureState(surfaceOpacity,solarDepth),textureKind=capture.textureKind,order=new Map([...loaded.keys()].map((k,i)=>[k,i])),ownership=createResidentCaptureOwnership(()=>residentGeometry.capture(solarDepth?'solar':'reflection'),captureData.scope),hold=ownership.geometry,publicationVersion=hold.version;
  try{
   for(const p of new Set(capture.runs.flatMap(run=>run.program?[run.program]:[])))ownership.addRelease(programPreparation.retainProgram(context,p));
   const chunks=sceneChunks.map(chunk=>{
    const data=chunk.cpu.value,geometry=chunk.geometry?.value;if(!data||!geometry||!chunk.geometry)throw Error('Delegated capture chunk has no live geometry');
    const anchor=[...chunk.anchor]as[number,number],anchorUnit=chunk.unit,styleAnchor=materialAnchor?[...materialAnchor]as[number,number]:anchor,styleUnit=materialUnit,mask=chunk.masks.retain(solarDepth?'solar':'reflection');ownership.addRelease(()=>mask.release());
    const runs=splitChunkRuns<WebGLProgram,DelegatedPackedChunk>(sceneSpans,chunk,capture.runs);
    return{contentKey:chunk.contentKey,vao:geometry.vao,components:[...chunk.loaded.values()].map(c=>({...c,order:order.get(key(c))})),runs,indexCount:data.indices.length,anchor,unit:anchorUnit,opacity:surfaceOpacity,cull:true,skipMasks:false,masks:mask,planFailureReason:solarDepth?solarCasterFailureReason():undefined,
     bindingRevision:()=>[window?.stats.residentRevision,window?.stats.ready,window?.stats.textureObjects,diffuse?.stats.plaster.residentRevision,diffuse?.stats.brick.residentRevision,diffuse?.stats.totalTextureObjects,mask.residentRevision].join('|'),bindingsReady:()=>textureKind===0||!!(window?.isResident(context)&&window.stats.ready&&(textureKind!==2||diffuse?.isResident(context)&&(!diffuse.stats.neededMaterials.plaster||diffuse.stats.plaster.ready)&&(!diffuse.stats.neededMaterials.brick||diffuse.stats.brick.ready))),
     matrix(main:Float64Array){const scale=1/anchorUnit;return multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1]);},
     uniforms(p:WebGLProgram,matrix:Float64Array,plane:Float32Array|undefined,viewport:Int32Array){withPreparedData(captureData,()=>{context.useProgram(p);reflectionClipUniforms(context,p,plane,viewport);uploadSceneLight(context,p,light,sunlight);uploadFacadeLayouts(context,p);context.uniformMatrix4fv(context.getUniformLocation(p,'u_matrix'),false,new Float32Array(matrix));context.uniform1f(context.getUniformLocation(p,'u_opacity'),surfaceOpacity);context.uniform1f(context.getUniformLocation(p,'u_paint_mode'),mode);context.uniform1f(context.getUniformLocation(p,'u_progressive_features'),progressiveDiagnostic==='no-features'?0:1);context.uniform1f(context.getUniformLocation(p,'u_s182_mask_diagnostic'),city==='cologne'&&progressiveDiagnostic==='s182-mask-debug'?1:0);context.uniform1f(context.getUniformLocation(p,'u_paint_override'),override);context.uniform1f(context.getUniformLocation(p,'u_style_scale'),styleUnit/anchorUnit);context.uniform1f(context.getUniformLocation(p,'u_style_height_scale'),heightUnit/anchorUnit);context.uniform2f(context.getUniformLocation(p,'u_style_offset'),(anchor[0]-styleAnchor[0])*styleUnit,-(anchor[1]-styleAnchor[1])*styleUnit);});},
     resetClip(p:WebGLProgram){reflectionClipUniforms(context,p);},bind(p:WebGLProgram,draw:()=>void,unavailable:()=>void){if(textureKind===2&&p===wallProgram)window!.withResidentTexture(context,p,()=>diffuse!.withResidentTextures(context,p,draw,unavailable),unavailable);else if(textureKind===1&&p===windowProgram)window!.withResidentTexture(context,p,draw,unavailable);else draw();}
    };
   });return{status:'active',gl:context,publicationVersion,chunks,leases:hold.leases,retain:ownership.retain,release:ownership.release};
  }catch(error){ownership.release();throw error;}
 }};}
 const captureRuntime=createResidentCaptureRuntime(residentCaptureAdapter());

 function captureContentRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),generation,surfaceContentRevision,Number(needsBirth),birth.size,paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),Number(sceneEnvironment.shadows),sceneEnvironment.quality,materialRecipeRevision,progressiveDiagnostic,[...distantQuality].map(([key,quality])=>key+':'+quality).sort().join(','),w?.ready,d?.plaster.ready,d?.brick.ready].join('|');}
 function selectPhysicalReflection(pass:ResidentPlanarReflectionPass){const order=new Map([...loaded.keys()].map((key,index)=>[key,index])),runs=reflectionRunKeys(),physical=sceneChunks.map(chunk=>{const scale=1/chunk.unit;return{chunk,components:[...chunk.loaded.values()].map(component=>({...component,order:order.get(key(component))})),runs:splitChunkRuns<string,DelegatedPackedChunk>(sceneSpans,chunk,runs),matrix:multiply(pass.mainMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,chunk.anchor[0],chunk.anchor[1],0,1]),indexCount:chunk.cpu.value?.indices.length??0,cull:true};});return planResidentReflectionChunks<string,(typeof physical)[number]>(physical,pass.maxTriangles,pass.maxDraws??64);}
 function endCaptureDemands(){const previous=new Set([...heldCaptureDemandKeys,...activeCaptureProgramKeys()]);resetCaptureDemands();retireCapturePrograms(previous);}
 function preparePlanarReflection(pass:ResidentPlanarReflectionPass,budget=createSolarShadowPreparationBudget()):PlanarReflectionPreparationResult{
  if(destroyed||pageHidden||!enabled||!sceneIndexCount())return{...solarShadowPreparation(),plannedTriangles:0,plannedDraws:0};
  const select=()=>selectPhysicalReflection(pass);
  let selected=select();
  const finish=(ready=0,pending=0,failed=0,budgetWaiting=0):PlanarReflectionPreparationResult=>({...solarShadowPreparation(ready,pending,failed,budgetWaiting),plannedTriangles:selected.triangles,plannedDraws:selected.draws});
  const setPlan=()=>{const previous=activeCaptureProgramKeys();reflectionDemandKeys=new Set(selected.plan.map(row=>row.program));reflectionDemandPlanned=true;retireCapturePrograms(previous);};
  if(reflectionCaptureToken===undefined)return finish(0,1);setPlan();
  if(!gl||pass.gl!==gl||gl.isContextLost()||geometryUploadPending||!gpuReady())return finish(0,1);
  // Like the solar keys: a held ledger refusal is budgetWaiting and gives the
  // visit's slot back (R2); a key the slot skips behind a ready or started
  // compile is ordinary pending and keeps this renderer's frame request.
  let ready=0,pending=0,failed=0,budgetWaiting=0;
  for(const key of reflectionDemandKeys){
   if(reflectionKeyProgram(key)){reflectionProgramFailures.delete(key);ready++;continue;}
   if(reflectionProgramFailures.has(key)){failed++;continue;}
   const budgetWaits=programPreparation.budgetWaits;
   try{
    const prepared=budget.compile('delegated500-reflection:'+key,String(materialRecipeRevision),()=>{
     if(key==='material:window')return compileGeometryProgram(surfaceFragment!,undefined,0,false,true,key);
     if(key==='material:diffuse')return compileGeometryProgram(diffuseFragment!,undefined,0,false,true,key);
     const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';return compilePartitionProgram(helper,key,true);
    });
    if(prepared.status==='pending'){pending++;continue;}
    if(key==='material:window'){texturedProgram=prepared.value;textureShaderFailure=undefined;textureShaderAttempted=true;}
    else if(key==='material:diffuse'){diffuseProgram=prepared.value;diffuseShaderFailure=undefined;diffuseShaderAttempted=true;}
    else partitionPrograms.set(key,prepared.value);
    reflectionResidentRevision++;ready++;
   }catch(error){if(isProgramPreparationPending(error)||gl.isContextLost()){pending++;if(isProgramPreparationPending(error)&&programPreparation.needsFrameAfter?.(budgetWaits)===false)budgetWaiting++;continue;}reflectionProgramFailures.set(key,String(error).slice(0,512));failed++;}
  }
  if(pending||failed){if(pending>budgetWaiting)map.triggerRepaint();return finish(ready,pending,failed,budgetWaiting);}
  const programs=new Set<WebGLProgram>();for(const row of selected.plan){const value=reflectionKeyProgram(row.program);if(value)programs.add(value);}
  try{const masks=prepareChunkMasks(sceneChunks,gl,[...programs]);if(!masks.ready)return finish(ready,0,1);}catch{return finish(ready,0,1);}
  const snapshot=residentCaptureAdapter().snapshot(false);if(snapshot.status==='blocked'&&snapshot.pending===false)return finish(ready,0,1);if(snapshot.status!=='active')return finish(ready,1);
  try{if('chunks'in snapshot?!snapshot.chunks.every(chunk=>chunk.bindingsReady()):!snapshot.bindingsReady())return finish(ready,1);return finish(ready);}
  finally{snapshot.release?.();}
 }
 function prepareCaptureMaterial(budget:SolarShadowPreparationBudget):SolarShadowPreparationResult{
  if(solarCaptureToken===undefined||paintMode()!==1||destroyed||pageHidden||!enabled||!gl||gl.isContextLost()||!gpuReady()||needsBirth||birth.size)return solarShadowPreparation();
  const key=reflectionMaterialKey();if(key==='base'||reflectionKeyProgram(key))return solarShadowPreparation();if(reflectionProgramFailures.has(key))return solarShadowPreparation(0,0,1);
  const budgetWaits=programPreparation.budgetWaits;
  try{const prepared=budget.compile('delegated500-solar-material:'+key,String(materialRecipeRevision),()=>{
   return compileGeometryProgram(key==='material:window'?surfaceFragment!:diffuseFragment!,undefined,0,false,true,key);
  });if(prepared.status==='pending')return solarShadowPreparation(0,1);if(key==='material:window'){texturedProgram=prepared.value;textureShaderFailure=undefined;textureShaderAttempted=true;}else{diffuseProgram=prepared.value;diffuseShaderFailure=undefined;diffuseShaderAttempted=true;}reflectionResidentRevision++;return solarShadowPreparation(1);}
  catch(error){if(isProgramPreparationPending(error)||gl.isContextLost())return solarShadowPreparation(0,1,0,Number(isProgramPreparationPending(error)&&programPreparation.needsFrameAfter?.(budgetWaits)===false));reflectionProgramFailures.set(key,String(error).slice(0,512));return solarShadowPreparation(0,0,1);}
 }
 function prepareSolarShadow(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  if(solarCaptureToken===undefined)return solarShadowPreparation();
  pruneProgramPreparation();
  const material=prepareCaptureMaterial(budget),programs=prepareSolarPrograms(budget);
  const preparation=solarShadowPreparation(material.ready+programs.ready,material.pending+programs.pending,material.failed+programs.failed,(material.budgetWaiting??0)+(programs.budgetWaiting??0));
  return prepareSolarShadowResources(preparation,captureRuntime);
 }
 function solarCoverage(){return captureRuntime.coverage();}

const layer={id,type:'custom' as const,renderingMode:'3d' as const,onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){if(!('createVertexArray'in context))throw Error('WebGL2 required');residentGPU!.attach(context as WebGL2RenderingContext);},render(context:WebGLRenderingContext|WebGL2RenderingContext,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){mainFrame++;chunkStore?.collectRetired();const frameMain='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;mainWorldMatrix=frameMain?.length===16?Float64Array.from(frameMain):undefined;invalidateMainFrame();pruneProgramPreparation();if(destroyed||pageHidden||!enabled||!gl||gl.isContextLost()){matrix=undefined;return;}pumpPendingMaterialBatches();if(sceneIndexCount()&&!prepareMaterialSource()){matrix=undefined;return;}const emptyMain='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(residentGPU!.emptyFrame(emptyMain)){matrix=undefined;partitionPending=false;pendingMainFrame=captureMainFrameWitness(true);return;}partitionPending=false;casterVisibleKnown=false;if(!gpuReady())residentGPU!.attach(gl);if(geometryUploadPending){prepareGeometryUpload();if(geometryUploadPending&&!gpuReady()){matrix=undefined;return;}}if(shadowUploadPending)uploadShadow();if(destroyed||pageHidden||!enabled||!gpuReady()){matrix=undefined;return;}if(!gl||!program)return;syncFacadeResources();const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||main.length!==16)return;const scale=1/anchorUnit,model=[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1];matrix=undefined;grow();matrix=multiply(main,model);if(!sceneIndexCount())return;const mainPrepared=prepareResidentMain();partitionPending=[...mainPaintProgramKeys()].some(key=>key!=='base'&&key!==currentPaintProgramKey(0)&&!partitionPrograms.has(key)&&!partitionFailures.has(key));const drawWitness=mainPrepared?captureMainFrameWitness():undefined;let mainDrawComplete=mainPrepared,completedMain=false;const requiredRoles=mainRolePrograms();const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth:gl.isEnabled(gl.DEPTH_TEST),blend:gl.isEnabled(gl.BLEND),cull:gl.isEnabled(gl.CULL_FACE),mask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};
 const mainTriangles=createResidentTriangleDrawBatch(gl);
 try{
 const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity,shadowAlpha=sceneEnvironment.shadows?sourceShadowOpacity(surfaceOpacity,opacityContext):0;
 if(progressiveDiagnostic!=='no-shadow'&&shadowProgram&&shadowUploadedIndexCount&&shadowAlpha>0){try{drawProjectedShadows(shadowAlpha);}catch{shadowFailure=true;releaseShadowGPU();}}else if(shadowUploadedIndexCount)shadowMask.cancelPending();
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.depthMask(surfaceOpacity>=.99);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 const uniforms=(p:WebGLProgram)=>{
  const context=gl!;
  const chunk=chunkUniforms(context,p),surface=surfaceUniforms(context,p);
  context.useProgram(p);reflectionClipUniforms(context,p);
  uploadSceneLight(context,p,sceneSun,sceneEnvironment.sunlight);uploadFacadeLayouts(context,p);
  context.uniformMatrix4fv(chunk.matrix,false,new Float32Array(matrix!));
  context.uniform1f(surface.opacity,surfaceOpacity);
  context.uniform1f(surface.paintMode,paintMode());
  context.uniform1f(surface.features,progressiveDiagnostic==='no-features'?0:1);
  context.uniform1f(surface.maskDiagnostic,city==='cologne'&&progressiveDiagnostic==='s182-mask-debug'?1:0);
  context.uniform1f(surface.paintOverride,paintOverride());
  context.uniform1f(chunk.style_scale,materialUnit/anchorUnit);
  context.uniform1f(chunk.style_height_scale,1);
  context.uniform2f(chunk.style_offset,(anchor[0]-materialAnchor![0])*materialUnit,-(anchor[1]-materialAnchor![1])*materialUnit);
 };
 const draw=()=>{
 if(partitionEnabled&&paintMode()>1.5){
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
  drawFrame++;if(casterRetryHeld){casterRetry=false;casterRetryHeld=false;}offscreenPaintRunsSkipped=0;casterVisibleKnown=true;if(casterRetry){casterRetry=false;solarDepthRevision++;}
  const demand=mainPaintDemand(),visibleComponents=demand.components,visibleRuns=demand.runs,overrideKey=demand.override;offscreenPaintRunsSkipped=partitionRuns.length-visibleRuns.length;
  updateDistantPaintQuality(visibleComponents,visibleRuns,overrideKey);
   const visibleProgramKeys=mainPaintProgramKeys(demand),protectedProgramKeys=mainProtectedProgramKeys(demand);currentVisibleProgramCount=visibleProgramKeys.size;
   // Only a resident distant program may need protection or retirement when its rich replacements arrive.
   const residentRichKeys=partitionPrograms.has(BERLIN_DISTANT_PAUL_LOBE_KEY)
    ?new Set(partitionRuns.map(run=>richPaintProgramKey(overrideKey??run.key))):undefined;
   // Keep the previous quality until the replacement is compiled. It also stays
   // the complete coloured fallback while that replacement waits its turn:
   // prepareMainPrograms starts at most one visible compile per frame and the
   // context scheduler paces the rest.
  if(residentRichKeys&&[...residentRichKeys].some(key=>berlinDistantFamily(key)!==undefined&&!partitionPrograms.has(key)))protectedProgramKeys.add(BERLIN_DISTANT_PAUL_LOBE_KEY);
  lastPartitionDrawKeys=new Set(protectedProgramKeys);
  for(const key of activeCaptureProgramKeys())protectedProgramKeys.add(key);
  if(currentFamilyPrograms)currentProgramEvictions+=trimInactivePaintPrograms(partitionPrograms,protectedProgramKeys,p=>programPreparation.releaseProgram(gl!,p));programIdleRetirement.synchronize();
  for(const run of visibleRuns){
   const baseKey=overrideKey??run.key,key=distantPaintProgramKey(baseKey);let selected=key==='base'||key===currentPaintProgramKey(0)?program:partitionPrograms.get(key);
   if(!selected){mainDrawComplete=false;if(!partitionFailures.has(key))partitionPending=true;selected=berlinDistantFamily(baseKey)!==undefined?(partitionPrograms.get(key===BERLIN_DISTANT_PAUL_LOBE_KEY?richPaintProgramKey(baseKey):BERLIN_DISTANT_PAUL_LOBE_KEY)??program):program;}
   // A failed Paul-Loebe quality key keeps using its resident alternate (never stored under the failed key).
   if(selected===program&&partitionFailures.has(key)&&berlinDistantFamily(baseKey)!==undefined)selected=partitionPrograms.get(key===BERLIN_DISTANT_PAUL_LOBE_KEY?richPaintProgramKey(baseKey):BERLIN_DISTANT_PAUL_LOBE_KEY)??program;
   if(currentFamilyPrograms&&partitionPrograms.has(key)){partitionPrograms.delete(key);partitionPrograms.set(key,selected!);}
   const traceKey601=key+':'+run.firstIndex+':'+run.indexCount+':'+(selected===program?'fallback':'partition');const trace601=diagnostic557&&!seenDraw601.has(traceKey601)&&seenDraw601.size<256;const started601=trace601?performance.now():0;const mark601=(phase:string)=>{if(trace601)recordDraw601({key,actualProgram:selected===program?'base':key,firstIndex:run.firstIndex,indexCount:run.indexCount,phase,elapsedMs:performance.now()-started601});};if(trace601)seenDraw601.add(traceKey601);mark601('uniform-enter');uniforms(selected!);mark601('uniform-return');mark601('draw-enter');if(!drawSceneRange(mainTriangles,selected!,run.firstIndex,run.indexCount))mainDrawComplete=false;mark601('draw-return');mark601('mask-return');
  }
  if(currentFamilyPrograms&&residentRichKeys)currentProgramEvictions+=retireBerlinDistantAlternates(partitionPrograms,visibleProgramKeys,p=>programPreparation.releaseProgram(gl!,p),residentRichKeys);
  // A missing visible program whose compile this frame waits on the page ledger
  // with a held wake (recorded by prepareMainPrograms) is repainted by the
  // owner's onAvailable wake; only other missing programs keep the frame poll.
  if(partitionPending&&!(heldMainWaitFrame===mainFrame&&visibleRuns.every(run=>{const key=distantPaintProgramKey(overrideKey??run.key);return key==='base'||key===currentPaintProgramKey(0)||partitionPrograms.has(key)||partitionFailures.has(key)||heldMainWaitKeys.has(key);})))map.triggerRepaint();
  return;
 }
 return (()=>{
 // One source-bound counterfactual draw, localhost diagnostic only. Source arrays and resident records remain intact.
 const diagnosticParts=progressiveDiagnostic==='without-near-parts'?['osm/way/1560907616|osm/way/1560907616/component/c87db3a22f0446da7c25','osm/way/1560907617|osm/way/1560907617/component/76a6a166985a7a86b281','osm/way/1560907618|osm/way/1560907618/component/69f4a5bf601dd50df3ff']:progressiveDiagnostic==='without-candidate'?['osm/way/1560907616|osm/way/1560907616/component/c87db3a22f0446da7c25']:[];
 const omitted=city==='dortmund'&&diagnosticParams.get('sample')==='progressive-dortmund-30319077'?diagnosticParts.map(k=>loaded.get(k)).filter((c):c is NonNullable<typeof c>=>!!c).sort((a,b)=>a.start-b.start):[];
 if(omitted.length)mainDrawComplete=false;let drawStart=0;for(const c of omitted){if(c.start>drawStart)(!drawSceneRange(mainTriangles,gl!.getParameter(gl!.CURRENT_PROGRAM),drawStart,c.start-drawStart)&&(mainDrawComplete=false));drawStart=c.end;}
 if(drawStart<sceneIndexCount())(!drawSceneRange(mainTriangles,gl!.getParameter(gl!.CURRENT_PROGRAM),drawStart,sceneIndexCount()-drawStart)&&(mainDrawComplete=false));
 })();},fallbackDraw=()=>{uniforms(program!);draw();};
 const windowDraw=()=>{if(windowTexture&&texturedProgram){uniforms(texturedProgram);windowTexture.withTexture(gl!,texturedProgram,draw,()=>{if(requiredRoles?.has('material:window'))mainDrawComplete=false;fallbackDraw();});}else fallbackDraw();};const normalDraw=()=>{if(windowTexture&&diffuseTexture&&diffuseProgram){uniforms(diffuseProgram);windowTexture.withTexture(gl!,diffuseProgram,()=>diffuseTexture.withTextures(gl!,diffuseProgram,draw,()=>{if(requiredRoles?.has('material:diffuse'))mainDrawComplete=false;windowDraw();}),()=>{if(requiredRoles?.has('material:diffuse'))mainDrawComplete=false;windowDraw();});}else windowDraw();};if(paintMode()===1)normalDraw();else fallbackDraw();mainDrawFailure=undefined;completedMain=mainDrawComplete;}catch(error){matrix=undefined;if(!isProgramPreparationPending(error))mainDrawFailure=String(error).slice(0,512);throw error;}finally{mainTriangles.restore();drainSourceWorkspaces();gl.bindVertexArray(old.vao);gl.useProgram(old.program);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);old.blend?gl.enable(gl.BLEND):gl.disable(gl.BLEND);old.cull?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);gl.depthMask(old.mask);gl.depthFunc(old.depthFunc);gl.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);}if(completedMain&&drawWitness)pendingMainFrame=drawWitness;},onRemove(){releaseGPU();}};
 const renderWithSolarReceiver=layer.render;layer.render=guardCustomLayerRender(map,layer.id,(context,args)=>{pendingMainFrame=undefined;try{const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;const result=!main||!('createVertexArray'in context)?renderWithSolarReceiver(context,args):withSceneSolarShadowReceiver(context as WebGL2RenderingContext,main,()=>renderWithSolarReceiver(context,args));const completed=takeCompletedMainFrame();if(completed)recordCompleteMainFrame(completed.empty,completed);return result;}catch(error){invalidateMainFrame();if(!isProgramPreparationPending(error)&&!gl?.isContextLost())mainDrawFailure=String(error).slice(0,512);throw error;}},()=>Boolean(gl?.isContextLost()));

 residentGPU=createResidentGPULifecycle<WebGL2RenderingContext>({bind:context=>{gl=context;},initialize:initializeResidentGPU,release:releaseGPU,ready:gpuReady,lost:context=>context.isContextLost(),hasResident:()=>sceneIndexCount()>0||!!pendingMaterialBatches||!!pendingGeometry,needsPreflight:()=>gpuPreflightRequired,clearTransient:()=>{stateData=new Float32Array();partitionRuns=[];partitionPending=false;},revision:()=>viewRevision});
 const releaseResidentLayer=layer.onRemove;layer.onRemove=()=>{releaseResidentLayer();residentGPU!.detach();};

 function drawProjectedShadows(alpha:number){
  if(!gl||!shadowProgram||!matrix||!mainWorldMatrix||shadowUploadPending)return;
  const context=gl,p=shadowProgram,projection=mainWorldMatrix;
  context.useProgram(p);context.enable(context.DEPTH_TEST);context.depthFunc(context.LEQUAL);context.depthMask(false);context.disable(context.CULL_FACE);context.enable(context.BLEND);context.blendFuncSeparate(context.SRC_ALPHA,context.ONE_MINUS_SRC_ALPHA,context.ONE,context.ONE_MINUS_SRC_ALPHA);
  context.uniform1f(context.getUniformLocation(p,'u_shadow_opacity'),alpha);const vector=sceneSun.shadowVector;context.uniform2f(context.getUniformLocation(p,'u_shadow_vector'),vector?.[0]??0,vector?.[1]??0);context.uniform1f(context.getUniformLocation(p,'u_s402_paint_mode'),paintMode());
  // Blend one coverage union, with every local .03 plane aligned to the scene plane.
  if(shadowMask.draw(context,matrix,.03,()=>{for(const chunk of sceneChunks){const count=chunk.shadowIndexCount??0;if(!count)continue;const geometry=chunk.shadow?.value;const origin=chunk.anchor,unit=chunk.unit; if(!geometry)throw Error('Projected shadow chunk unavailable');const scale=1/unit,clip=multiply(projection,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,origin[0],origin[1],.03/anchorUnit-.03*scale,1]);context.bindVertexArray(geometry.vao);context.uniformMatrix4fv(context.getUniformLocation(p,'u_matrix'),false,new Float32Array(clip));drawResidentTriangles(context,geometry.vao,count,0);}}))shadowDraws++;
 }
 function drawSceneRange(batch:ReturnType<typeof createResidentTriangleDrawBatch>,p:WebGLProgram,firstIndex:number,indexCount:number){
  const context=gl,projection=mainWorldMatrix;
  if(!context||!projection)return false;
  const end=firstIndex+indexCount,locations=chunkUniforms(context,p);
  const rows:{chunk:DelegatedPackedChunk;first:number;count:number}[]=[];
  for(const span of residentSpansInRange(sceneSpans,firstIndex,end)){
   const first=Math.max(firstIndex,span.firstIndex),last=Math.min(end,span.firstIndex+span.indexCount);
   if(last<=first)continue;
   const local=span.localFirstIndex+first-span.firstIndex,previous=rows.at(-1);
   if(previous?.chunk===span.chunk&&previous.first+previous.count===local)previous.count+=last-first;
   else rows.push({chunk:span.chunk,first:local,count:last-first});
  }
  for(const row of rows){
   const chunk=row.chunk,geometry=chunk.geometry?.value;
   if(!geometry)return false;
   const scale=1/chunk.unit,clip=multiply(projection,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,chunk.anchor[0],chunk.anchor[1],0,1]);
   context.bindVertexArray(geometry.vao);
   context.uniformMatrix4fv(locations.matrix,false,new Float32Array(clip));
   context.uniform1f(locations.style_scale,materialUnit/chunk.unit);
   context.uniform1f(locations.style_height_scale,anchorUnit/chunk.unit);
   context.uniform2f(locations.style_offset,(chunk.anchor[0]-materialAnchor![0])*materialUnit,-(chunk.anchor[1]-materialAnchor![1])*materialUnit);
   if(!chunk.masks.withResidentMasks(context,p,()=>batch.draw(geometry.vao,row.count,row.first*4)))return false;
  }
  return true;
 }
 function pickSurface(point:{x:number;y:number},signal?:AbortSignal):SurfaceHit|undefined{
  if(destroyed||pageHidden||!enabled||!gpuReady()||!matrix||!mainWorldMatrix||signal?.aborted||opacity<.01)return;const canvas=map.getCanvas();if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)return;
  const inv=inverse(mainWorldMatrix);if(!inv)return;const x=2*point.x/canvas.clientWidth-1,y=1-2*point.y/canvas.clientHeight,worldOrigin=project(inv,x,y,-1),far=project(inv,x,y,1),d=sub(far,worldOrigin),len=Math.hypot(...d);if(!Number.isFinite(len)||!len)return;const worldDirection=d.map(v=>v/len),hold=residentGeometry.capture('picking');let hit:{c:DelegatedLoadedComponent;distance:number;worldDistance:number;normal:number[]}|undefined;
  try{for(const chunk of sceneChunks){const data=chunk.cpu.value;if(!data)continue;const origin=[(worldOrigin[0]-chunk.anchor[0])*chunk.unit,worldOrigin[2]*chunk.unit,-(worldOrigin[1]-chunk.anchor[1])*chunk.unit],direction=[worldDirection[0],worldDirection[2],-worldDirection[1]];
    for(const c of chunk.loaded.values()){const growth=chunk.stateData[c.firstVertex]%2;if(growth<.005)continue;const box=[...c.box];box[1]*=growth;box[4]*=growth;if(!boxHit(origin,direction,box))continue;const pick=data.indexedPick,range=pick?.ranges.get(key(c)),step=INDEXED_PICK_BLOCK_TRIANGLES70*3;
     for(let i=c.start;i<c.end;i+=3){if(range&&pick&&(i-c.start)%step===0&&!indexedPickBlockHit70(origin,direction,pick.bounds,range.offset+(i-c.start)/step*6)){i=Math.min(c.end,i+step)-3;continue;}
      const result=triangle(origin,direction,data.vertices,chunk.stateData,data.indices[i],data.indices[i+1],data.indices[i+2],hit?hit.worldDistance*chunk.unit:undefined);if(!result||hit&&result.distance/chunk.unit>=hit.worldDistance)continue;
      const triangleIds=[data.indices[i],data.indices[i+1],data.indices[i+2]],frameXY=[0,1].map(axis=>triangleIds.reduce((sum,id,k)=>sum+data.paint[id*5+axis]*result.barycentric[k],0)),alpha=data.progressive[triangleIds[2]*4+3];
      if(f151CrownPickDiscard(paintMode(),alpha)||partialGatePickDiscard(paintMode(),alpha,frameXY)||s402ConnectorPickDiscard(paintMode(),alpha,frameXY)||s036Roof009PickDiscard(paintMode(),alpha,frameXY))continue;
      if(paintMode()===2&&c.objectId==='osm/relation/147095'&&chunk.masks.origin){const o=chunk.masks.origin,m=merc(o),ratio=chunk.unit/unit(o[1]),dx=(m[0]-chunk.anchor[0])*chunk.unit,dz=-(m[1]-chunk.anchor[1])*chunk.unit,q=origin.map((v,k)=>v+direction[k]*result.distance);if(chunk.masks.covered(c,(q[0]-dx)/ratio,q[1]/ratio/Math.max(growth,.005),(q[2]-dz)/ratio))continue;}
      const sourceY=(origin[1]+direction[1]*result.distance)*unit(c.origin[1])/chunk.unit/Math.max(growth,.005),w=data.paint[triangleIds[2]*5+3],family=data.paint[triangleIds[2]*5+4];if(f355ClipPick559(c,sourceY,w,family)||f346ParentClipPick562(c,frameXY,sourceY,w,family))continue;hit={c,...result,worldDistance:result.distance/chunk.unit};
     }
    }
   }
   if(!hit||signal?.aborted)return;const q=worldOrigin.map((v,i)=>v+worldDirection[i]*hit!.worldDistance),lnglat=geo(q[0],q[1]);return{objectId:hit.c.objectId,partId:hit.c.partId,generation,viewRevision,hitLngLat:lnglat,hitAltitudeM:q[2]*unit(lnglat[1]),surface:isSourceOnlyGlassRoof(hit.c)||Math.abs(hit.normal[1])/Math.hypot(...hit.normal)>.2?'roof':'wall',distance:hit.worldDistance*anchorUnit,opacityContext,surfaceOpacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity,occludesGround:(opacityContext==='route-selection'?Math.min(opacity,.2):opacity)>=.99};
  }finally{hold.release();}
 }
 function readChunkPaintGPUDiagnostic(identities?:readonly Identity[]){
  if(!identities?.length)return readPaintGPUBufferDiagnostic({gl:undefined,progressiveBuffer:undefined,paintBuffer:undefined,getComponent:()=>undefined},identities);
  if(identities.length>8)throw Error('Too many GPU diagnostic identities');const hold=residentGeometry.capture('picking');
  try{const results=sceneChunks.filter(chunk=>identities.some(identity=>chunk.loaded.has(key(identity)))).map(chunk=>{const data=chunk.cpu.value,geometry=chunk.geometry?.value;return{contentKey:chunk.contentKey,...readPaintGPUBufferDiagnostic({gl:geometryUploadPending||!data||!geometry?undefined:gl,vao:geometry?.vao,program,progressiveBuffer:geometry?.buffers.get('progressive'),paintBuffer:geometry?.buffers.get('paint'),vertexBuffer:geometry?.buffers.get('static'),indexBuffer:geometry?.indexBuffer,packedVertices:data?.vertices,packedVertexStride:9,stateBuffer:geometry?.buffers.get('state'),packedState:chunk.stateData,packedIndices:data?.indices,getComponent:identity=>chunk.loaded.get(key(identity))},identities.filter(identity=>chunk.loaded.has(key(identity))))};});const first=results[0];if(!first)return readPaintGPUBufferDiagnostic({gl:undefined,progressiveBuffer:undefined,paintBuffer:undefined,getComponent:()=>undefined},identities);return results.length===1?first:{...first,available:results.every(row=>row.available),records:results.flatMap(row=>row.records),chunks:results};}finally{hold.release();}
 }
 function updateSelectionData(data:Float32Array,rows:Map<string,DelegatedLoadedComponent>){const selected=enabled&&selectionActive&&selectedIdentity?rows.get(key(selectedIdentity)):undefined;return writeRendererSelection(data,selected);}
 function writeChunkSelection(chunks=sceneChunks){let changed=false;for(const chunk of chunks){const range=updateSelectionData(chunk.stateData,chunk.loaded);if(range){chunk.dirtyState=mergeRendererStateRange(chunk.dirtyState,range.first,range.end);changed=true;}}return changed;}
 function paintSelection(){if(writeChunkSelection())uploadState();map.triggerRepaint();}
 function clearSelection(){selectedIdentity=undefined;paintSelection();}
 function diagnosticScreenSamples(identity?:Identity){if(!matrix||!gpuReady()||partitionPending)return [];const canvas=map.getCanvas(),w=canvas.clientWidth,h=canvas.clientHeight,out:{objectId:string;partId:string;box:number[];screenBox:number[];growth:number}[]=[];for(const c of loaded.values()){if(identity&&key(c)!==key(identity))continue;const growth=componentGrowth(c),box=c.box,screen=[Infinity,Infinity,-Infinity,-Infinity];let front=false;for(const x of [box[0],box[3]])for(const y of [box[1]*growth,box[4]*growth])for(const z of [box[2],box[5]]){const q=[x,y,z,1],clip=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=matrix[k*4+r]*q[k];if(clip[3]<=0)continue;front=true;const sx=(clip[0]/clip[3]+1)*w/2,sy=(1-clip[1]/clip[3])*h/2;screen[0]=Math.min(screen[0],sx);screen[1]=Math.min(screen[1],sy);screen[2]=Math.max(screen[2],sx);screen[3]=Math.max(screen[3],sy);}if(front&&screen[0]<=w&&screen[2]>=0&&screen[1]<=h&&screen[3]>=0){out.push({objectId:c.objectId,partId:c.partId,box:[...box],screenBox:screen,growth});if(out.length>=160)break;}}return out;}
 function growthSnapshot(){let min=1,max=0;for(const c of loaded.values()){const value=componentGrowth(c);min=Math.min(min,value);max=Math.max(max,value);}return {generation,components:loaded.size,activeBirths:birth.size,minGrowth:loaded.size?min:1,maxGrowth:loaded.size?max:1,enabled,ready:gpuReady(),pageHidden};}
 function isPickReady(){return !geometryUploadPending&&!destroyed&&!pageHidden&&enabled&&(residentGPU?.isEmptyReady()||(gpuReady()&&!!matrix))&&!partitionPending;}
 function getDrawReadiness():ResidentDrawReadiness{
  if(destroyed||pageHidden||gl?.isContextLost())return{ready:false,preparing:false};
  if(dataPreparationPending||pendingMaterialBatches)return{ready:false,preparing:true};
  if(!enabled)return{ready:false,preparing:false};
  const currentPreparation=!!pendingGeometry||geometryUploadPending;
  // A replacement owns readiness even while the previous resident mesh can pick.
  if(currentPreparation)return{ready:false,preparing:true};
  if(materialSourceFailure!==undefined&&!batchPreparationFailure)return{ready:false,preparing:false,failure:String(materialSourceFailure).slice(0,512)};
  const mainFailure=batchPreparationFailure??mainDrawFailure??mainGeometryProgramFailure??geometryUploadFailure??contextRecoveryFailure;
  if(mainFailure!==undefined)return{ready:false,preparing:false,failure:mainFailure||'Required main draw failed'};
  if(!sceneIndexCount())return{ready:isPickReady(),preparing:false};
  if(!materialSourceSettled||!gpuReady())return{ready:false,preparing:true};
  const mode=paintMode();
  if(mode===1&&landmarkVisible&&facadeAttached){
   // Match the existing optional material-program admission predicates. Texture
   // downloads retain their existing fallback and do not add a readiness gate.
   const windowObjects=windowTexture?.stats.textureObjects;
   const windowRequired=!!(windowObjects&&surfaceFragment),diffuseRequired=!!(windowObjects&&diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment);
   const windowFailure=windowRequired&&!texturedProgram&&textureShaderAttempted?textureShaderFailure:undefined,diffuseFailure=diffuseRequired&&!diffuseProgram&&diffuseShaderAttempted?diffuseShaderFailure:undefined;
   const materialFailure=windowFailure??diffuseFailure;
   if(materialFailure)return{ready:false,preparing:false,failure:materialFailure};
   if(windowRequired&&!texturedProgram||diffuseRequired&&!diffuseProgram)return{ready:false,preparing:true};
  }
  if(partitionEnabled&&mode>1.5){
   let visibleColourPending=false;
   for(const colourKey of mainPaintProgramKeys()){
    if(colourKey==='base'||colourKey===currentPaintProgramKey(0)||partitionPrograms.has(colourKey))continue;
    const failure=partitionFailures.get(colourKey);
    if(failure)return{ready:false,preparing:false,failure};
    visibleColourPending=true;
   }
   if(visibleColourPending)return{ready:false,preparing:true};
  }
  if(!mainFrameCurrent())return{ready:false,preparing:true};return{ready:isPickReady(),preparing:false};
 }
 function borrowSourceComponent(identity:Identity){return (residentPreparedData&&frozenF231Identity547(identity)&&sourceLoaded.has(key(identity))?{...sourceLoaded.get(key(identity))!,generation}:undefined)??loaded.get(key(identity))??(sourceLoaded.has(key(identity))?{...sourceLoaded.get(key(identity))!,generation}:undefined);}
 function borrowSurfaceComponent(identity:Identity){return loaded.get(key(identity));}
 function resourceResidency(programs:typeof programPreparation.stats){
  const main=mainProtectedProgramKeys(),capture=activeCaptureProgramKeys();
  if(sceneIndexCount()){main.add('base');if(texturedProgram)main.add('material:window');if(diffuseProgram)main.add('material:diffuse');}
  const bounded=(keys:Set<string>)=>{const values:string[]=[];for(const value of keys){if(values.length===12)break;values.push(value);}return values;};
  let workspaceCharacters=cityPaintFragment.length,workspaceUTF8Bytes=cityPaintFragmentBytes,workspaceRecords=Number(!!cityPaintFragment);
  const addSources=(sources:typeof casterPreparedSources)=>{for(const source of sources.values()){workspaceCharacters+=source.fragment.length;workspaceUTF8Bytes+=source.fragmentBytes;workspaceRecords++;}};addSources(casterPreparedSources);
  const candidate=pendingGeometry?.state;
  if(candidate){workspaceCharacters+=candidate.material.cityPaintFragment.length;workspaceUTF8Bytes+=candidate.material.cityPaintFragmentBytes;workspaceRecords+=Number(!!candidate.material.cityPaintFragment);if(candidate.material.casterPreparedSources!==casterPreparedSources)addSources(candidate.material.casterPreparedSources);}
  const programSourceStats=programSources.preparedSourceStats;workspaceCharacters+=programSourceStats.sourceCharacters;workspaceUTF8Bytes+=programSourceStats.sourceCharacters?programSourceUTF8Bytes:0;workspaceRecords+=Number(!!programSourceStats.sourceCharacters);
  const casterClaimBytes=(sources:typeof casterPreparedSources)=>sources instanceof DelegatedPreparedSourceMap?sources.budgetBytes:0,candidateClaim=candidate?.material.cityPaintFragmentClaim;
  const sourceBudget={accounting:'logical-shader-source-estimate' as const,physicalMemory:'unmeasured' as const,materialSourceBytes:(cityPaintFragmentClaim?.bytes??0)+(candidateClaim&&candidateClaim!==cityPaintFragmentClaim?candidateClaim.bytes:0),casterSourceBytes:casterClaimBytes(casterPreparedSources)+(candidate&&candidate.material.casterPreparedSources!==casterPreparedSources?casterClaimBytes(candidate.material.casterPreparedSources):0),programWorkspace:programSourceStats.budget,waitingForAvailability:sourceBudgetWaiting(),waitingKinds:[...(materialSourceGate.waiting?['material-preflight']:[]),...(batchSourceGate.waiting?['candidate-material']:[]),...(casterSourceGate.waiting?['caster-classification']:[])]};
  const currentGeometryLogicalBytes=sceneTypedBytes(),residentKeys=new Set(sceneChunks.map(c=>c.contentKey));let pendingGeometryLogicalBytes=0;if(candidate)for(const chunk of candidate.sceneChunks)if(!residentKeys.has(chunk.contentKey))pendingGeometryLogicalBytes+=sceneTypedBytes([chunk]);
  const mainGeometry=residentGeometry.stats,shadowGeometryResources=shadowGeometry.stats;
  return{publishedId:residentPreparedData?residentLifecycleRevision:null,publishedGeneration:residentPreparedData?generation:null,candidateId:pendingGeometry?'geometry:'+pendingGeometry.state.material.materialRecipeRevision:pendingMaterialBatches?'material:'+pendingMaterialBatches.revision:dataPreparationPending?'data:'+dataPreparationPending.token:null,candidateGeneration:pendingGeometry?.state.generation??pendingMaterialBatches?.args?.[1]??null,candidateOwnedProgramReferences:pendingGeometry?Number(!!pendingGeometry.base)+pendingGeometry.partitions.size+Number(!!pendingGeometry.textured)+Number(!!pendingGeometry.diffuse):0,activeMainCount:main.size,activeMainKeys:bounded(main),activeMainKeysTruncated:main.size>12,activeCaptureCount:capture.size,activeCaptureKeys:bounded(capture),activeCaptureKeysTruncated:capture.size>12,sourceWorkspaceRecords:workspaceRecords,sourceWorkspaceCharacters:workspaceCharacters,sourceWorkspaceUTF8Bytes:workspaceUTF8Bytes,sourceBudget,currentGeometryLogicalBytes,pendingGeometryLogicalBytes,cpuChunks:sceneChunks.length,candidateChunks:candidate?.sceneChunks.length??0,mainGeometryRevision:mainGeometry.revision,mainOwnedBufferBytes:mainGeometry.ownedBufferBytes,referencedStaticBufferLogicalBytes:sceneChunks.reduce((n,c)=>{const data=c.geometry?.value&&c.cpu.value;return n+(data?data.vertices.byteLength+data.indices.byteLength+data.paint.byteLength+data.progressive.byteLength:0);},0),mainOwnedBuffers:mainGeometry.ownedBuffers,mainBorrowedBuffers:mainGeometry.borrowedBuffers,shadowGeometryRevision:shadowGeometryResources.revision,shadowOwnedBufferBytes:shadowGeometryResources.ownedBufferBytes,shadowOwnedBuffers:shadowGeometryResources.ownedBuffers,shadowBorrowedBuffers:shadowGeometryResources.borrowedBuffers,programContextId:programs.resourceObjects?.contextId??null,createdPrograms:programs.resourceObjects?.createdPrograms??null,deleteProgramRequests:programs.resourceObjects?.deleteProgramRequests??null,programResourceObjectScope:programs.resourceObjects?.scope,sharedGrantedReferences:programs.shared.grantedReferences,sharedReleasedReferences:programs.shared.releasedReferences,mainGeometryContextId:mainGeometry.contextId,mainCreatedBuffers:mainGeometry.createdBuffers,mainDeleteBufferRequests:mainGeometry.deleteBufferRequests,mainCreatedVertexArrays:mainGeometry.createdVertexArrays,mainDeleteVertexArrayRequests:mainGeometry.deleteVertexArrayRequests,mainGeometryObjectScope:mainGeometry.lifetimeScope,shadowGeometryContextId:shadowGeometryResources.contextId,shadowCreatedBuffers:shadowGeometryResources.createdBuffers,shadowDeleteBufferRequests:shadowGeometryResources.deleteBufferRequests,shadowCreatedVertexArrays:shadowGeometryResources.createdVertexArrays,shadowDeleteVertexArrayRequests:shadowGeometryResources.deleteVertexArrayRequests,shadowGeometryObjectScope:shadowGeometryResources.lifetimeScope};
 }
 return {prepareBatches,cancelPreparation,getProgressiveRenderStatus(){return residentPreparedData?structuredClone(progressiveStatusSnapshot).map(row=>({...row})):[];},getProgressivePaintFingerprints:()=>({...progressivePaintFingerprints}),getProgramPreparationStats:()=>{const programs=programPreparation.stats;return[{provider:'delegated500',...programs,resourceResidency:resourceResidency(programs)}];},getReadinessDiagnostic:()=>({programPreparation:programPreparation.stats,geometryUploadFailure,residentPublicationFailure,geometryResources:{main:residentGeometry.stats,shadow:shadowGeometry.stats}}),layer,getGrowthSamplingState:()=>({activeBirths:birth.size,enabled,pageHidden}),growthSnapshot,diagnosticScreenSamples,getComponentDisplayState(identity:Identity){const sample=diagnosticScreenSamples(identity)[0];if(!enabled||pageHidden||!sample||!gpuReady())return undefined;return {visible:true,growth:sample.growth,selected:selectionActive&&!!selectedIdentity&&key(selectedIdentity)===key(identity),opacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity};},isPickReady,getDrawReadiness,cancelCandidate,getRevision:()=>({generation,viewRevision}),getComponent(identity:Identity){const component=loaded.get(key(identity)),readback=copyBuildingComponentMetadata(component);if(readback)readback.displayEstimates={...readback.displayEstimates,progressivePainted:component?.displayEstimates?.progressivePainted===true};return readback;},readPaintGPUDiagnostic:readChunkPaintGPUDiagnostic,getFrozenF231Metadata547:()=>residentPreparedData?withPreparedData(residentPreparedData,()=>frozenF231Metadata547([...loaded.values()])):[],borrowSourceComponent,borrowSurfaceComponent,getSourceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSourceComponent(identity)),getSurfaceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSurfaceComponent(identity)),get nativeGroupDisplay(){return copyBuildingComponentReadback(nativeGroupPlan);},setEnabled(value:boolean){if(!value){if(shadowUploadedIndexCount)shadowMask.cancelPending();clearDataPreparation();endCaptureDemands();cancelPendingMaterialBatches('Delegated candidate disabled');discardGeometryCandidate();pruneProgramPreparation();}if(value===enabled)return;invalidateMainFrame();viewRevision++;enabled=value;syncFacadeResources();matrix=undefined;pruneProgramPreparation();paintSelection();},setOpacity(value:number){if(!Number.isFinite(value)||value<0||value>1)throw Error('Invalid opacity');if(value===opacity)return;opacity=value;viewRevision++;matrix=undefined;pruneProgramPreparation();map.triggerRepaint();},setOpacityContext(value:'normal'|'route-selection'){if(value!=='normal'&&value!=='route-selection')throw Error('Invalid opacity context');if(value===opacityContext)return;opacityContext=value;viewRevision++;matrix=undefined;pruneProgramPreparation();map.triggerRepaint();},setBatches,retainPublishedSelection(identity:Identity){if(!loaded.has(key(identity)))return;const cpu=localComponent(identity)?.chunk.cpu;if(!cpu||cpu.released||cpu.state!=='ready')return;const pin=cpu.retain('selected');return{contentKey:pin.contentKey,release:()=>pin.release()};},setSelection(identity:Identity){const c=sourceLoaded.get(key(identity))??loaded.get(key(identity));if(!c)throw Error('Selection component not loaded');if(selectedIdentity&&key(selectedIdentity)===key(identity)&&selectionActive)return;selectedIdentity={...identity};selectionActive=true;paintSelection();},clearSelection,suspendSelection(){selectionActive=false;paintSelection();},resumeSelection(){selectionActive=true;paintSelection();},get selected(){return selectedIdentity?{...selectedIdentity}:undefined;},pick:pickSurface,getSolarShadowAdmission(identity:Identity){const c=loaded.get(key(identity));return {resident:!!c,admitted:solarShadowAdmittedKeys.has(key(identity)),enabled:sceneEnvironment.shadows,mode:solarShadowMode,boundarySHA256:solarBoundary?.boundarySHA256,legacyBoundarySHA256:shadowSourceBoundarySHA||undefined,geometryRole:'accepted-resident-display-mesh',sourceFeature:c?.sourceFeature,packedBounds:c?.box,instantISO:sceneSun.instantISO};},get sceneSunlight(){return {...sceneSun,quality:sceneEnvironment.quality,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,contactShading:'display-wall-foot'};},setSolarShadowBoundary(value:SolarShadowBoundary){const next=prepareSolarShadowBoundary(value);solarBoundary=next;if(updateSolarShadowIndices())uploadShadow();map.triggerRepaint();},setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value),light=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],next.instantISO);if(!next.shadows&&shadowUploadedIndexCount)shadowMask.cancelPending();const qualityChanged=sceneEnvironment.quality!==next.quality;sceneEnvironment=next;if(qualityChanged)syncFacadeResources();sceneSunInstant=next.instantISO;sceneSun=light;const nextReduced=ownerReducedMotion||!next.motion;if(nextReduced!==reducedMotion){reducedMotion=nextReduced;needsBirth=true;if(reducedMotion){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}}if(updateSolarShadowIndices())uploadShadow();pruneProgramPreparation();map.triggerRepaint();},setSunlightInstant(instantISO:string){const next=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],instantISO);sceneSunInstant=instantISO;sceneSun=next;if(updateSolarShadowIndices())uploadShadow();pruneProgramPreparation();map.triggerRepaint();},setPageHidden(value:boolean){if(value!==pageHidden||value)invalidateMainFrame();if(value){if(shadowUploadedIndexCount)shadowMask.cancelPending();clearDataPreparation();endCaptureDemands();}if(value){cancelPendingMaterialBatches('Delegated candidate hidden');discardGeometryCandidate();clearMaterialSource();}if(value===pageHidden){pruneProgramPreparation();return;}pageHidden=value;windowTexture?.setPageHidden(value);diffuseTexture?.setPageHidden(value);syncFacadeResources();viewRevision++;matrix=undefined;pruneProgramPreparation();if(!value)map.triggerRepaint();},setReducedMotion(value:boolean){ownerReducedMotion=value;const effective=value||!sceneEnvironment.motion;if(effective===reducedMotion)return;reducedMotion=effective;needsBirth=true;if(effective){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}viewRevision++;matrix=undefined;pruneProgramPreparation();map.triggerRepaint();},resetBirthHistory(){invalidateMainFrame();map.triggerRepaint();birth.clear();seenBirth.clear();needsBirth=true;pruneProgramPreparation();},prepareSolarShadow,getSolarShadowCoverage:solarCoverage,getSolarShadowRevision(){return captureContentRevision()+'|caster-failures:'+[...casterFailures.keys()].sort().join(',');},getPlanarReflectionRevision: captureContentRevision,preparePlanarReflection,setCaptureDemand,renderPlanarReflection(pass:ResidentPlanarReflectionPass):ResidentPlanarReflectionResult {return residentPreparedData?withPreparedData(residentPreparedData,()=>captureRuntime.render(pass)):captureRuntime.render(pass);},get residentVertexCount(){return sceneVertexCount();},get stats(){return {solarDepth:solarProgramStats(),programPreparation:programPreparation.stats,gpuLifecycle:residentGPU?.stats,indexedPickBlocks70:{blockTriangles:INDEXED_PICK_BLOCK_TRIANGLES70,blockCount:sceneChunks.reduce((n,c)=>n+(c.cpu.value?.indexedPick?.blockCount??0),0),rangeCount:sceneChunks.reduce((n,c)=>n+(c.cpu.value?.indexedPick?.rangeCount??0),0),typedBytes:sceneChunks.reduce((n,c)=>n+(c.cpu.value?.indexedPick?.typedBytes??0),0),growthEnvelope:[0,1],generation},koRailUploadCapacity70:lastVisibleUploadCapacity70,contextRecovery:{attempts:contextRecoveryAttempts,successes:contextRecoverySuccesses,contextRecoveryPending,failure:contextRecoveryFailure},mainGeometryProgramFailure,geometryContextLost:gl?.isContextLost()??false,f302CrownReadiness580:city==='dresden'&&residentPreparedData?f302Diagnostic580([...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf):undefined,f303SourceStages582:city==='dresden'&&residentPreparedData?{stage465:f303Ready465([...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf),stage474:f303Ready474([...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf),stage484:f303Ready484([...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf),details:f303SourceDiagnostics582([...sourceLoaded.values()],nativeLeaf,ownerPatchLeaf)}:undefined,sourceRoleCohort:s434PackingDiagnostic?{active:!!s434DisplayProfile,pending:s434PackingDiagnostic.pending,lastFailure:s434DisplayProfile?null:s434PackingDiagnostic.lastFailure??(s434PackingDiagnostic.active?'required-member-not-drawable':'profile-not-ready'),triggered:s434PackingDiagnostic.selection?.triggered,cohortEnabled:s434PackingDiagnostic.selection?.enabled,cohortReason:s434PackingDiagnostic.selection?.reason,minVertices:s434PackingDiagnostic.selection?.minVertices,reservedRetainedBytes:s434PackingDiagnostic.selection?.reservedRetainedBytes,requiredLeafIds:s434PackingDiagnostic.selection?.requiredLeafIds,identities:s434PackingDiagnostic.selection?.identities.map(row=>({...row,packingAfterDrawableFilters:s434DrawableCounts.get(key(row))??0,displayed:loaded.has(key(row))}))}:undefined,sourceRoleDisplay:[...[...sourceLoaded.values()].flatMap(c=>{const profile=sourceRoleDisplayProfile(c);return profile?[{...profile,sourceArraysRetained:true}]:[];}),...(s434DisplayProfile?[{...s434DisplayProfile}]:[])],partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,immutableAltesSourceReadback:immutableAltesSourceReadback.observe(sourceLoaded.get('osm/relation/22988|osm/relation/22988/component/adcf363724f0b4c7c037')),progressiveDiagnostic,progressivePaintDiagnosticState:residentPreparedData?'available':'unprepared',progressivePaintAppliedComponents:residentPreparedData?progressiveStatusSnapshot.map(row=>({...row})):[],progressivePaintRejectedAdmissions:residentPreparedData?progressivePaintRejections():[],progressivePaintAdmissions:residentPreparedData?progressivePaintCount():undefined,progressivePaintFingerprints,progressiveShaderSpecialization,progressivePaintCPUBytes:sceneChunks.reduce((n,c)=>n+(c.cpu.value?.progressive.byteLength??0),0),progressivePaintGPUBytes:sceneChunks.reduce((n,c)=>n+(c.geometry?.value?c.cpu.value?.progressive.byteLength??0:0),0),appearancePolicy:'md-admitted-native-facade-paint',rathausProxyFragments:rathausProxyMasks.stats,architecturalDescriptions:DESCRIPTION_BINDINGS.map(d=>({file:d.file,sha256:d.sha256})),facadePaintMode:paintMode(),facadePaintOverride:paintOverride(),facadePaintGPUBytes:sceneChunks.reduce((n,c)=>n+(c.geometry?.value?c.cpu.value?.paint.byteLength??0:0),0),facadePaintCPUBytes:sceneChunks.reduce((n,c)=>n+(c.cpu.value?.paint.byteLength??0),0),addedGeometryVertices:0,addedGeometryTriangles:0,heldSourceOutlines:heldSourceOutlines.map(r=>({objectId:r.outline.objectId,partId:r.outline.partId,visibleBody:{objectId:r.body.objectId,partId:r.body.partId},sourceRetained:true,reason:'exact-native-building-part-footprint'})),landmarkVisible,facadeAttached,diffuseShaderFailure,diffuseShaderAttempted,diffuseTexture:diffuseTexture?.stats,textureShaderFailure,textureShaderAttempted,drawSubmissionDiagnostic601:diagnostic557?{seenRuns:seenDraw601.size,events:[...drawEvents601],measurement:"CPU submission only; draw-return does not prove GPU completion"}:undefined,contextLossDiagnostic557:diagnostic557?{preRelease:contextLossSnapshot557,lastCompileStage:compileStage557,recentCompileEvents:[...compileEvents557]}:undefined,paintProgramPartitions:{lastCompileAttempt:partitionCompileAttempt,failures:[...partitionFailures],offscreenPaintRunsSkipped,conservativeClipCulling:true,enabled:partitionEnabled,currentSourceSpecialization:currentFamilyPrograms,initialCompiledFragmentChars:currentInitialFragmentBytes,lastCompiledFragmentChars:currentLastFragmentBytes,cacheTarget:currentFamilyPrograms?64:null,visiblePrograms:currentVisibleProgramCount,distantMaterial:{cohort:'berlin-paul-lobe-19401-19415',sharedFullDetailProgram:sharedPaulLobeRichProgram,available:distantMaterialAvailable,families:[...distantQuality].filter(([,quality])=>quality==='distant').map(([key])=>key),sharedProgramResident:partitionPrograms.has(BERLIN_DISTANT_PAUL_LOBE_KEY),thresholdsCssPx:[32,48]},evictedInactivePrograms:currentProgramEvictions,baseFragmentBytes:cityPaintFragmentBytes,pending:partitionPending,mainPreparation:'all-actual-required-recipes',cachedPrograms:partitionPrograms.size,cachedKeys:[...partitionPrograms.keys()],runs:partitionRuns.length,sourceIndicesPreserved:true,drawOrderPreserved:true},geometryPrograms:(program?1:0)+(texturedProgram?1:0)+(diffuseProgram?1:0)+partitionPrograms.size,windowTexture:windowTexture?.stats,pageHidden,needsBirth,growthHistory:seenBirth.size,growthHistoryLimit:BIRTH_LIMIT,activeBirths:birth.size,components:loaded.size,vertices:sceneVertexCount(),triangles:sceneIndexCount()/3,gpuBufferBytes:residentGeometry.stats.ownedBufferBytes+shadowGeometry.stats.ownedBufferBytes+rathausProxyMasks.stats.allocatedGPUBytes,cpuTypedArrayBytes:sceneTypedBytes()+rathausProxyMasks.stats.allocatedCPUBytes,shadowAdmittedComponents,shadowHeldComponents:loaded.size-shadowAdmittedComponents,shadowTriangles:shadowIndices.length/3,shadowIndexBytes:sceneChunks.reduce((bytes,chunk)=>bytes+chunk.shadowIndices.byteLength,0),shadowGPUReady:!!shadowProgram&&sceneChunks.some(chunk=>!!chunk.shadow?.value),shadowFailure,shadowDraws,shadowMask:shadowMask.stats,shadowDrawBatchesPerFrame:shadowProgram&&sourceShadowOpacity(opacity,opacityContext)>0?2:0,shadowRole:'date-time-solar-display',solarAdmissionRole:'accepted-resident-display-mesh; source and owner provenance unchanged',sceneEnvironment:{...sceneEnvironment,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,minimumShadowSolarAltitudeDegrees:SCENE_SHADOW_MIN_ALTITUDE_DEGREES,boundarySHA256:solarBoundary?.boundarySHA256,fixedShadowIndexBytes:fixedShadowIndices.byteLength,dynamicShadowIndexBytes:shadowIndices.byteLength},sourceObjectsStillRetained:true,sourceComponents:sourceLoaded.size,nativeGroupDisplay:nativeGroupPlan?.groups.map(g=>({relationId:g.relationId,outline:{objectId:g.outline.objectId,partId:g.outline.partId},declaredPartCount:g.declaredPartCount,compiledPartCount:g.compiledPartCount,residentPartCount:g.residentPartCount,missingPartIds:[...g.missingPartIds],unknownPartIds:[...g.unknownPartIds],ownershipUnverifiedPartIds:[...g.ownershipUnverifiedPartIds],viewportMissingPartIds:[...g.viewportMissingPartIds],complete:false})),nativeGroupDisplayErrors:copyBuildingComponentReadback(nativeGroupPlan?.errors),measurement:'allocated typed arrays; not total process/GPU heap' as const};},destroy(){if(destroyed)return;destroyed=true;progressiveStatusSnapshot=[];clearDataPreparation();cancelPendingMaterialBatches();discardGeometryCandidate();immutableAltesSourceReadback.destroy();enabled=false;selectedIdentity=undefined;document.removeEventListener('facade-paint-camera',paintCamera);document.removeEventListener('facade-paint-change',repaintPaint);map.off('move',move);map.off('resize',move);map.off('webglcontextlost',contextLost);map.off('webglcontextrestored',contextRestored);forgetPaintVisibility(loaded);loaded.clear();releasePackedChunks(sceneChunks,sceneChunkBindings);sceneChunks=[];sceneSpans=[];sceneChunkBindings=undefined;sourceLoaded.clear();s434DisplayProfile=null;s434PackingDiagnostic=undefined;s434DrawableCounts.clear();nativeGroupPlan=undefined;heldSourceOutlines=[];birth.clear();seenBirth.clear();vertices=new Float32Array();paintData=new Float32Array();progressiveData=new Float32Array();stateData=new Float32Array();indices=new Uint32Array();rathausProxyMasks.destroy();pickBlocks70=createIndexedPickBlocks70(vertices,indices,loaded.values(),9);shadowIndices=new Uint32Array();fixedShadowIndices=new Uint32Array();fixedShadowRanges=[];solarShadowAdmittedKeys.clear();solarBoundary=undefined;matrix=undefined;releaseGPU();residentGPU?.detach();windowTexture?.destroy();diffuseTexture?.destroy();programPreparation.dispose();programSources.release();releaseMaterialSourceClaim();sourceBudgetWake.abort();materialSourceGate.clear();batchSourceGate.clear();casterSourceGate.clear();if(residentPreparedData)clearDelegated500PaintSourcesForScope(residentPreparedData.scope);residentPreparedData=undefined;const release=residentScopeRelease;residentScopeRelease=undefined;release?.();}};
 function snapshotMaterial(){return {materialRecipeRevision,materialSourceWorkRevision,materialSourceSettled,materialSourceFailure,cityPaintFragment,cityPaintFragmentBytes,cityPaintFragmentClaim,materialRebuildIdentities,currentFamilyPrograms,partitionEnabled,legacySolarPartitions,progressiveShaderSpecialization,hc70ProgramReady,hc70PantaleonGateProgramReady,hc70PantaleonAnnexProgramReady,hc70LudwigWorkshopProgramReady,hc70MesseturmCrownProgramReady,supplementBatch1Ready,f004645Available,f020Whole1679Available,f020Chapel1679Available,f269640Available,f285634Available,f235631Available,f244627Available,f244622Available,f244619Available,f358604Available,f238Body595Available,f358Normal579Available,f346562Available,f355Clip559Available,sharedPaulLobeRichProgram,exactRichProgramKeys,distantMaterialAvailable,casterBase,casterFailures,casterAnalysisPending,casterPreparedSources,casterFamily0,solarDepthHelper};}
 function restoreMaterial(state:ReturnType<typeof snapshotMaterial>){({materialRecipeRevision,materialSourceWorkRevision,materialSourceSettled,materialSourceFailure,cityPaintFragment,cityPaintFragmentBytes,cityPaintFragmentClaim,materialRebuildIdentities,currentFamilyPrograms,partitionEnabled,legacySolarPartitions,progressiveShaderSpecialization,hc70ProgramReady,hc70PantaleonGateProgramReady,hc70PantaleonAnnexProgramReady,hc70LudwigWorkshopProgramReady,hc70MesseturmCrownProgramReady,supplementBatch1Ready,f004645Available,f020Whole1679Available,f020Chapel1679Available,f269640Available,f285634Available,f235631Available,f244627Available,f244622Available,f244619Available,f358604Available,f238Body595Available,f358Normal579Available,f346562Available,f355Clip559Available,sharedPaulLobeRichProgram,exactRichProgramKeys,distantMaterialAvailable,casterBase,casterFailures,casterAnalysisPending,casterPreparedSources,casterFamily0,solarDepthHelper}=state);
  // A returned claim means its text is no longer budgeted; rebuild on demand.
  if(cityPaintFragmentClaim&&!cityPaintFragmentClaim.active){cityPaintFragmentClaim=undefined;cityPaintFragment='';cityPaintFragmentBytes=0;}}
 function clearMaterialSnapshot(state:ReturnType<typeof snapshotMaterial>,scope?:FrozenDataScope){if(scope)clearDelegated500PaintSourcesForScope(scope);state.cityPaintFragment='';state.cityPaintFragmentBytes=0;state.cityPaintFragmentClaim?.release();state.cityPaintFragmentClaim=undefined;state.materialRebuildIdentities=undefined;if(programSourcesRevision===state.materialRecipeRevision)clearProgramSources();state.materialSourceSettled=false;state.casterBase.clear();state.casterFailures.clear();state.casterAnalysisPending.clear();state.casterPreparedSources.clear();}
 function candidateCurrent(candidate:PackedCandidate){if(candidate.resident)return candidate.gpuIncarnation===mainGPUIncarnation&&candidate.state.generation===generation&&candidate.state.indices===indices&&candidate.preparedData===residentPreparedData&&!destroyed;return pendingGeometry===candidate&&!candidate.closed&&!candidate.preparedData?.signal.aborted&&!destroyed;}
 function sourceContextCurrent(data:PreparedDelegated500Data,revision:number){return !destroyed&&!pageHidden&&enabled&&!data.scope.stats.disposed&&(pendingGeometry?.preparedData===data&&candidateCurrent(pendingGeometry)&&pendingGeometry.state.material.materialRecipeRevision===revision||residentPreparedData===data&&materialRecipeRevision===revision);}
 function withSourceContext<T>(data:PreparedDelegated500Data,revision:number,run:()=>T):T{
  const candidate=pendingGeometry;
  if(candidate?.preparedData===data&&candidate.state.material.materialRecipeRevision===revision){
   // A claim this run's lifecycle change or destroy returned leaves no unbudgeted
   // text in the kept candidate snapshot either (restoreMaterial's rule, applied
   // now instead of at the next restore): its text is rebuilt on demand.
   const previous=snapshotMaterial(),previousLifecycle=residentLifecycleRevision,release=data.scope.retain();try{return withPreparedData(data,()=>{restoreMaterial(candidate.state.material);try{return run();}finally{if(!candidate.closed)candidate.state.material=snapshotMaterial();else clearMaterialSnapshot(snapshotMaterial());if(destroyed||residentLifecycleRevision!==previousLifecycle)clearMaterialSource();else{restoreMaterial(previous);if(pageHidden||!enabled||gl?.isContextLost())clearMaterialSource();}const kept=candidate.state.material;if(!candidate.closed&&kept.cityPaintFragmentClaim&&!kept.cityPaintFragmentClaim.active){kept.cityPaintFragmentClaim=undefined;kept.cityPaintFragment='';kept.cityPaintFragmentBytes=0;}}});}finally{release();}
  }
  if(residentPreparedData!==data||materialRecipeRevision!==revision)throw new DOMException('Delegated source was superseded','AbortError');
  return withPreparedData(data,run);
 }
 function takeChunkConstruction():ChunkConstruction|undefined{const value=currentChunkConstruction;currentChunkConstruction=undefined;return value;}
 function releasePackedChunks(chunks:readonly DelegatedPackedChunk[],bindings?:PreparedChunkBindings<BuildingComponent>,keepMasks:ReadonlySet<ReturnType<typeof createRathausProxyMasks>>=new Set()){for(const chunk of chunks){chunk.cpu.release();chunk.dynamic.release();chunk.shadowCPU?.release();if(!keepMasks.has(chunk.masks))chunk.masks.destroy();}bindings?.release();}
 function releaseChunkConstruction(value:ChunkConstruction){if(value.closed)return;value.closed=true;for(const group of value.groups)group.cpu.release();value.groups=[];if(!value.consumed){releasePackedChunks(value.state.sceneChunks,value.bindings,new Set(sceneChunks.map(c=>c.masks)));if(!sceneChunks.some(c=>c.masks===value.state.rathausProxyMasks))value.state.rathausProxyMasks.destroy();clearMaterialSnapshot(value.state.material,value.state.preparedData?.scope);}value.state.preparedData=undefined;}
 function sceneIndexCount(chunks=sceneChunks){let count=0;for(const chunk of chunks)for(const row of chunk.loaded.values())count+=row.end-row.start;return count;}
 function sceneVertexCount(chunks=sceneChunks){let count=0;for(const chunk of chunks)for(const row of chunk.loaded.values())count+=row.lastVertex-row.firstVertex;return count;}
 function visibleChunkStyles(chunks=sceneChunks){const styles=new Set<number>();for(const chunk of chunks){const packed=chunk.cpu.value;if(!packed)continue;for(const component of chunk.loaded.values()){if(!isFacadeLandmark(component)||isSourceOnlyGlassRoof(component))continue;for(let vertex=component.firstVertex;vertex<component.lastVertex;vertex++)styles.add(Math.floor(packed.initialState[vertex]/4));}}return [...styles];}
 function sceneTypedBytes(chunks=sceneChunks){return chunks.reduce((n,c)=>{const p=c.cpu.value;return n+c.stateData.byteLength+(p&&c.shadowIndices===p.indices?0:c.shadowIndices.byteLength)+(p?p.vertices.byteLength+p.indices.byteLength+p.paint.byteLength+p.progressive.byteLength+p.initialState.byteLength+(p.indexedPick?.typedBytes??0):0);},0);}
 function localComponent(component:Identity,chunks=sceneChunks){const k=key(component),chunk=chunks.find(c=>c.loaded.has(k));return chunk?{chunk,row:chunk.loaded.get(k)!}:undefined;}
 function componentGrowth(component:Identity){const local=localComponent(component);return local?local.chunk.stateData[local.row.firstVertex]%2:1;}
 function prepareChunkMasks(chunks:readonly DelegatedPackedChunk[],context:WebGL2RenderingContext,programs:readonly WebGLProgram[]){for(const chunk of chunks){const result=chunk.masks.prepare(context,programs);if(!result.ready)return result;}return{ready:true};}
 function sceneProgramRuns(chunks=sceneChunks,spans=sceneSpans){const result:ReturnType<typeof paintProgramRuns>=[];for(const span of spans){const data=span.chunk.cpu.value;if(!data)continue;for(const run of paintProgramRuns(data.indices,data.paint,programKey,!currentFamilyPrograms)){const first=Math.max(span.localFirstIndex,run.firstIndex),end=Math.min(span.localFirstIndex+span.indexCount,run.firstIndex+run.indexCount);if(end>first){const firstIndex=span.firstIndex+first-span.localFirstIndex,previous=result.at(-1);if(previous?.key===run.key&&previous.firstIndex+previous.indexCount===firstIndex)previous.indexCount+=end-first;else result.push({key:run.key,firstIndex,indexCount:end-first});}}}return result;}
 function assembleChunkConstruction(construction:ChunkConstruction,previousChunks=sceneChunks){
  if(construction.closed)throw new DOMException('Delegated chunk construction cancelled','AbortError');
  const next:DelegatedPackedChunk[]=[],allComponents=construction.components,visibleKeys=new Set(allComponents.map(key)),bindings=construction.bindings;
  try{
   for(const group of construction.groups){const packed=group.cpu.value;if(!packed)throw Error('Delegated chunk is not ready');const cpu=group.cpu.retain('candidate'),contentKey=cpu.contentKey;let dynamic:ChunkResourceLease<Float32Array>|undefined,masks:ReturnType<typeof createRathausProxyMasks>|undefined,ownsMask=false,registered=false;try{dynamic=bindings.store.acquire<Float32Array>({contentKey:contentKey+':state:'+chunkStateOwner,role:'candidate',estimate:{category:'packed',bytes:packed.initialState.byteLength,precision:'exact'},produce:()=>packed.initialState.slice(),costs:value=>({category:'packed',bytes:value.byteLength,precision:'exact',identity:value.buffer})});if(!dynamic.value){dynamic.release();cpu.release();throw Error('Delegated dynamic chunk state is unavailable');}
    const local=new Map<string,DelegatedLoadedComponent>(),sources=new Map(group.components.map(c=>[key(c),c]));for(const row of packed.rows){const component=sources.get(key(row));if(!component){dynamic.release();cpu.release();throw Error('Delegated packed source row is absent');}if(!visibleKeys.has(key(row)))continue;local.set(key(row),{...component,displayEstimates:{...component.displayEstimates,progressivePainted:row.progressivePainted},generation:construction.state.generation,box:[...row.box],start:row.start,end:row.end,firstVertex:row.firstVertex,lastVertex:row.lastVertex});}
    if(!packed.maskRecipe){dynamic.release();cpu.release();throw Error('Delegated CPU chunk has no mask recipe');}const maskBindingKey=(packed.maskRecipe.wordMasks??packed.maskRecipe.masks).map(mask=>Number(visibleKeys.has(key(mask.preferred)))).join(''),old=previousChunks.find(c=>c.contentKey===contentKey&&c.maskBindingKey===maskBindingKey);masks=old?.masks??packed.maskRecipe.createBinding(allComponents);ownsMask=!old;
    next.push({contentKey,source:group.source,cpu,dynamic,stateData:dynamic.value,loaded:local,masks,maskBindingKey,runs:paintProgramRuns(packed.indices,packed.paint,programKey,!currentFamilyPrograms),anchor:merc([group.source.frame.origin[0],group.source.frame.origin[1]]),unit:group.source.frame.unit,shadowIndices:new Uint32Array()});registered=true;
    }finally{if(!registered){cpu.release();dynamic?.release();if(ownsMask)masks?.destroy();}}
   }
   sceneChunks=next;sceneSpans=[];sceneChunkBindings=bindings;loaded=new Map();partitionRuns=[];let sceneAt=0,sceneVertex=0;
   for(const component of allComponents){const chunk=next.find(c=>c.loaded.has(key(component)));if(!chunk)continue;const c=chunk.loaded.get(key(component))!,ratio=anchorUnit/chunk.unit,dx=(chunk.anchor[0]-anchor[0])*anchorUnit,dz=-(chunk.anchor[1]-anchor[1])*anchorUnit,box=c.box.map((v,i)=>v*ratio+(i%3===0?dx:i%3===2?dz:0)),indexCount=c.end-c.start;loaded.set(key(c),{...c,box,start:sceneAt,end:sceneAt+indexCount,firstVertex:sceneVertex,lastVertex:sceneVertex+c.lastVertex-c.firstVertex});appendContiguousRendererSpan(sceneSpans,{chunk,firstIndex:sceneAt,indexCount,localFirstIndex:c.start});sceneAt+=indexCount;sceneVertex+=c.lastVertex-c.firstVertex;}
   partitionRuns=partitionEnabled?sceneProgramRuns():[];
   const first=next[0];vertices=new Float32Array();indices=new Uint32Array();paintData=new Float32Array();progressiveData=new Float32Array();stateData=new Float32Array();if(!next.some(c=>c.masks===rathausProxyMasks)&&!previousChunks.some(c=>c.masks===rathausProxyMasks))rathausProxyMasks.destroy();rathausProxyMasks=first?.masks??createRathausProxyMasks();landmarkVisible=allComponents.some(component=>isFacadeLandmark(component)&&!isSourceOnlyGlassRoof(component));
   const values=next.map(c=>c.cpu.value!);const partial=values.find(v=>v.partialGateDisplay.enabled)??values[0],s402=values.find(v=>v.s402ConnectorDisplay.enabled)??values[0],s036=values.find(v=>v.s036NorthCofaceDisplay.enabled)??values[0],s240=values.find(v=>v.s240BaseCofaceDisplay.enabled)??values[0],f151=values.find(v=>v.f151CrownDisplay.enabled)??values[0];if(partial)partialGateDisplay=partial.partialGateDisplay;if(s402)s402ConnectorDisplay=s402.s402ConnectorDisplay;if(s036)s036NorthCofaceDisplay=s036.s036NorthCofaceDisplay;if(s240)s240BaseCofaceDisplay=s240.s240BaseCofaceDisplay;if(f151)f151CrownDisplay=f151.f151CrownDisplay;
   const recordByIdentity=new Map(values.flatMap(value=>value.progressiveView.map(row=>[row.city+"|"+row.objectId+"|"+row.partId,row]as const)));const progressiveView=allComponents.flatMap(component=>{const row=loaded.has(key(component))?recordByIdentity.get(component.city+"|"+key(component)):undefined;return row?[row]:[];});Object.freeze(progressiveView);progressiveStatusSnapshot=progressiveView;admitShadow(construction.shadowAdmission);updateSolarShadowIndices();construction.state=snapshotPackedResident();for(const group of construction.groups)group.cpu.release();construction.groups=[];
  }catch(error){releasePackedChunks(next,undefined,new Set(previousChunks.map(c=>c.masks)));throw error;}
 }
 function clearDataPreparation(record=dataPreparationPending,retireGrants=true){if(!record)return;if(dataPreparationPending===record){dataPreparationPending=undefined;if(retireGrants)clearProgramGrantHandoff(undefined,record.token);}record.abortCleanup?.();record.abortCleanup=undefined;if(retireGrants)record.receipt?.releaseChunkDependencies?.();record.receipt=undefined;record.scope=undefined;if(!record.controller.signal.aborted)record.controller.abort(new DOMException('Delegated preparation cancelled','AbortError'));const cancel=record.cancelLoading;record.cancelLoading=undefined;cancel?.();}
 async function prepareBatches(components:BuildingComponent[],signal:AbortSignal,providedScope?:FrozenDataScope,demand:readonly Delegated500DataIdentity[]=components,chunkInput?:RendererChunkInput<BuildingComponent>,preparation?:Delegated500ChunkPreparation):Promise<PreparedDelegated500Batches>{
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');if(components.length&&!chunkInput)throw Error('Delegated nonempty batches require authoritative renderer chunks');
  // Checked before this request supersedes anything, with setBatches' complete
  // generation guard plus the in-flight preparation's generation: an invalid or
  // older request reserves no source text and leaves newer valid work (the
  // in-flight preparation, queued batches, the unpublished candidate) intact.
  if(components.length&&!preparation)throw Error('Delegated chunk preparation requires the original publication plans');
  const nextGeneration=preparation?.nextGeneration;
  if(preparation&&(!Number.isSafeInteger(nextGeneration)||nextGeneration!<generation||nextGeneration!<(pendingGeometry?.state.generation??generation)||nextGeneration!<(pendingMaterialBatches?.args?.[1]??generation)||nextGeneration!<(dataPreparationPending?.nextGeneration??generation)))throw Error('Invalid generation');
  // A material source failure of this recipe is cached until setMaterialSourceBuilder
  // replaces it: this request is rejected with it and reserves and builds nothing.
  if(components.length&&constructionSourceFailure!==undefined){batchPreparationFailure=String(constructionSourceFailure).slice(0,512);candidateFailureGeneration=nextGeneration;throw constructionSourceFailure;}
  invalidateMainFrame();
  const previousPreparation=dataPreparationPending,record={token:++dataPreparationSequence,signal,nextGeneration,controller:new AbortController()}as NonNullable<typeof dataPreparationPending>;dataPreparationPending=record;if(previousPreparation)clearDataPreparation(previousPreparation);if(!pendingGeometry&&(previousPreparation||pendingMaterialBatches))clearProgramGrantHandoff();cancelPendingMaterialBatches('Delegated preparation superseded',true);discardGeometryCandidate(true,signal);if(dataPreparationPending!==record||record.controller.signal.aborted||destroyed)throw new DOMException('Superseded delegated preparation','AbortError');grantHandoffPreparationToken=record.token;
  let scope=providedScope,ownedScope:FrozenDataScope|undefined,retained:PreparedChunkBindings<BuildingComponent>|undefined,receiptInput:readonly BuildingComponent[]=components,construction:ChunkConstruction|undefined,preparedReceipt:PreparedDelegated500Batches|undefined,rawPreparationClaim:ResourceBudgetReservation|undefined,released=false,sourceFailure:unknown;
  const releaseChunkDependencies=()=>{if(released)return;released=true;if(preparedReceipt)preparedChunkConstructions.delete(preparedReceipt);preparedReceipt=undefined;if(construction)releaseChunkConstruction(construction);construction=undefined;rawPreparationClaim?.release();rawPreparationClaim=undefined;retained?.release();retained=undefined;receiptInput=[];const owned=ownedScope;ownedScope=undefined;owned?.release();};
  const abort=()=>{record.controller.abort(signal.reason??new DOMException('Aborted','AbortError'));releaseChunkDependencies();clearDataPreparation(record);};signal.addEventListener('abort',abort,{once:true});record.abortCleanup=()=>signal.removeEventListener('abort',abort);if(signal.aborted){abort();signal.throwIfAborted();}
  try{retained=chunkInput?retainChunkBindings(chunkInput):undefined;if(retained)chunkStore=retained.store;
   if(!scope){if(!frozenData)throw Error('Delegated500 CPU preparation requires FrozenDataClient');scope=createFrozenDataScope(frozenData);ownedScope=scope;const owned=scope;record.cancelLoading=()=>owned.release();}
   record.scope=scope;const rawCount=chunkInput?.groups.reduce((sum,group)=>sum+group.components.length,0)??components.length;if(chunkInput)rawPreparationClaim=chunkInput.store.budget.reserve({category:'construction',bytes:1024+rawCount*64,precision:'estimate',label:'delegated500 complete source cohort preparation'});const preparationSignal=record.controller.signal,physicalRaw=chunkInput?(chunkInput.groups.length===1?chunkInput.groups[0].components:chunkInput.groups.flatMap(group=>[...group.components])):components,physicalDemand=delegated500DemandClosure([...demand,...physicalRaw]).identities;await prepareDelegated500Data(physicalDemand,city,preparationSignal,scope,physicalRaw);preparationSignal.throwIfAborted();await prepareDelegated500Programs(physicalDemand,city,preparationSignal,scope);preparationSignal.throwIfAborted();
   const prepared:PreparedDelegated500Batches={get input(){return receiptInput;},city,scope,signal,get chunkInput(){return retained;},releaseChunkDependencies,release:releaseChunkDependencies};preparedReceipt=prepared;record.receipt=prepared;
   if(retained){
    if(!preparation)throw Error('Delegated chunk preparation requires the original publication plans');
    const resources=retained,sourceScope=scope,semantic=resources.store.acquire<ChunkConstruction>({contentKey:'delegated500-construction:'+chunkStateOwner+':'+record.token,role:'candidate',signal:preparationSignal,estimate:{category:'construction',bytes:4096+physicalRaw.length*512+resources.groups.length*256,precision:'estimate'},produce(context){
     const release=sourceScope.retain(),initialLifecycle=residentLifecycleRevision,sourceBuilder=materialSourceBuilder,sourceRecipeRevision=materialRecipeRevision;
     let admitted:DelegatedSourceTextClaim|undefined,scratch:PackedResident|undefined,scratchConstruction:ChunkConstruction|undefined,finished=false,started=false;
     function constructionCurrent(){
      context.signal.throwIfAborted();preparationSignal.throwIfAborted();
      if(destroyed||released||dataPreparationPending!==record||residentLifecycleRevision!==initialLifecycle||materialSourceBuilder!==sourceBuilder||materialRecipeRevision!==sourceRecipeRevision||preparation!.nextGeneration<generation||preparation!.nextGeneration<(pendingGeometry?.state.generation??generation)||preparation!.nextGeneration<(pendingMaterialBatches?.args?.[1]??generation))throw new DOMException('Superseded delegated construction','AbortError');
     }
     function* constructionSteps(){
      const claim=admitted;admitted=undefined;if(!claim)throw new DOMException('Delegated material source was not admitted','AbortError');
      try{constructionCurrent();}catch(error){claim.release();throw error;}
      materialRecipeRevision=++materialRequestSequence;materialSourceWorkRevision=materialRecipeRevision;materialSourceFailure=undefined;materialSourceSettled=false;cityPaintFragment='';cityPaintFragmentBytes=0;cityPaintFragmentClaim=claim;materialRebuildIdentities=undefined;casterBase=new Map();casterFailures=new Map();casterAnalysisPending=new Set();casterPreparedSources=createCasterPreparedSources();casterFamily0=undefined;solarDepthHelper=undefined;
      // Only an actual recipe build failure is cached. Cancellation, budget,
      // pending/lost preparation and context loss retain their existing paths.
      try{yield* buildMaterialSourceSteps(claim,true);}catch(error){const name=(error as {name?:unknown}|null|undefined)?.name;if(name!=='AbortError'&&name!=='ResourceBudgetExceededError'&&!isProgramPreparationPending(error)&&!gl?.isContextLost())constructionSourceFailure=sourceFailure=error;throw error;}
      loaded=new Map();solarShadowAdmittedKeys=new Set();rathausProxyMasks=createRathausProxyMasks();
      yield* packResidentBatchesSteps(components,preparation!.nextGeneration,preparation!.shadowAdmission,preparation!.nativeDisplay,preparation!.partialGatePlan,preparation!.s402Plan,preparation!.s434Plan,preparation!.s036Plan,preparation!.s240Plan,preparation!.f151Plan);
      const built=takeChunkConstruction();if(!built)throw Error('Delegated chunk construction did not register');construction=built;
      if(released){releaseChunkConstruction(built);throw new DOMException('Aborted','AbortError');}
      return built;
     }
     const steps=constructionSteps();
     /** One existing scheduler step; no live resident or packing control is left
      * installed while the iterator waits for its next admitted turn. */
     function advanceChunkConstruction(){
      constructionCurrent();
      const previous=snapshotPackedResident(),lifecycle=residentLifecycleRevision,previousInput=packingChunkInput,previousPreparing=preparingChunkProduction,previousConstruction=currentChunkConstruction;
      return withPreparedData(prepared,()=>{
       if(scratch)restorePackedResident(scratch);
       packingChunkInput=resources;preparingChunkProduction=true;currentChunkConstruction=scratchConstruction;
       try{started=true;const next=steps.next();if(next.done){finished=true;scratch=undefined;scratchConstruction=undefined;return true;}return false;}
       finally{
        if(!finished){scratch=snapshotPackedResident();scratchConstruction=currentChunkConstruction;}
        packingChunkInput=previousInput;preparingChunkProduction=previousPreparing;currentChunkConstruction=previousConstruction;
        if(!destroyed&&residentLifecycleRevision===lifecycle)restorePackedResident(previous);else clearMaterialSource();
       }
      });
     }
     // Tiny iterator yields should not each cost a browser timer turn. Keep
     // every existing guarded/snapshotted advance, but group at most sixteen
     // while the slice remains below one millisecond. The context scheduler
     // still applies its own total turn budget and fairness between jobs.
     function advanceChunkConstructionSlice(){
      const startedAt=performance.now();
      for(let count=0;count<16;count++){
       if(advanceChunkConstruction())return true;
       if(performance.now()-startedAt>=1)return false;
      }
      return false;
     }
     function closeChunkConstructionSteps(){
      if(finished||!started)return;
      const previous=snapshotPackedResident(),lifecycle=residentLifecycleRevision,enteredDestroyed=destroyed,previousInput=packingChunkInput,previousPreparing=preparingChunkProduction,previousConstruction=currentChunkConstruction;
      try{withPreparedData(prepared,()=>{
       if(scratch)restorePackedResident(scratch);
       packingChunkInput=resources;preparingChunkProduction=true;currentChunkConstruction=scratchConstruction;
       try{steps.return(undefined as never);}
       finally{
        const abandoned=currentChunkConstruction??scratchConstruction;
        if(abandoned){if(!abandoned.closed)releaseChunkConstruction(abandoned);}
        else{const masks=rathausProxyMasks;if(masks!==previous.rathausProxyMasks&&!previous.sceneChunks.some(chunk=>chunk.masks===masks))masks.destroy();}
        const material=snapshotMaterial();if(material.cityPaintFragmentClaim&&!material.cityPaintFragmentClaim.active)material.cityPaintFragmentClaim=undefined;
        clearMaterialSnapshot(material,sourceScope);
       }
      });}finally{
       scratch=undefined;scratchConstruction=undefined;
       packingChunkInput=previousInput;preparingChunkProduction=previousPreparing;currentChunkConstruction=previousConstruction;
       // This snapshot may already be the cleared post-destroy resident. Restore
       // that state too, unless teardown/lifecycle changed inside this close.
       if(destroyed===enteredDestroyed&&residentLifecycleRevision===lifecycle)restorePackedResident(previous);else clearMaterialSource();
      }
     }
     const completed=()=>{constructionCurrent();if(!construction||construction.closed)throw new DOMException('Aborted','AbortError');return construction;};
     // Admission precedes every expansion. A queued cancellation returns the
     // untouched claim; an iterator cancellation returns its own scratch only.
     try{const estimate=materialSourceEstimate(prepared,true);return waitForDelegatedSourceText(context.budget,estimate,context.signal).then(claim=>{admitted=claim;
      if(gl)return context.scheduleSteps(gl,advanceChunkConstructionSlice,{phase:'source-build',priority:'visible'}).then(completed);
      while(!advanceChunkConstruction()){}return completed();
     }).finally(()=>{try{closeChunkConstructionSteps();}finally{const claim=admitted;admitted=undefined;claim?.release();release();}});}catch(error){release();throw error;}
    }});
    try{await semantic.ready;construction=semantic.value;if(!construction)throw new DOMException('Aborted','AbortError');}finally{semantic.release();}
    await Promise.all(construction.groups.map(group=>group.cpu.ready));preparationSignal.throwIfAborted();
    const completed=construction;if(!completed||completed.closed)throw new DOMException('Aborted','AbortError');const previous=snapshotPackedResident(),lifecycle=residentLifecycleRevision;
    try{withPreparedData(prepared,()=>{restorePackedResident(completed.state);assembleChunkConstruction(completed,previous.sceneChunks);preparedChunkConstructions.set(prepared,completed);});}
    finally{if(!destroyed&&residentLifecycleRevision===lifecycle)restorePackedResident(previous);else clearMaterialSource();}
   }
   signal.throwIfAborted();if(destroyed||dataPreparationPending!==record)throw new DOMException('Superseded delegated preparation','AbortError');record.cancelLoading=undefined;rawPreparationClaim?.release();rawPreparationClaim=undefined;return prepared;
  }catch(error){const failed=sourceFailure!==undefined&&dataPreparationPending===record&&!destroyed;if(failed){batchPreparationFailure=String(sourceFailure).slice(0,512);candidateFailureGeneration=nextGeneration;}releaseChunkDependencies();if(scope)clearDelegated500PaintSourcesForScope(scope);clearDataPreparation(record);if(!providedScope)scope?.release();throw failed?sourceFailure:error;}
 }
 function cancelPendingMaterialBatches(reason?:string,preserveHandoff=false){const request=pendingMaterialBatches;pendingMaterialBatches=undefined;if(!request)return;const data=request.prepared,nextGeneration=request.args?.[1];if(!preserveHandoff&&nextGeneration!==undefined)clearProgramGrantHandoff(nextGeneration);request.closed=true;request.abortCleanup?.();request.abortCleanup=undefined;request.args=undefined;request.prepared=undefined;if(data){data.releaseChunkDependencies?.();preparedChunkConstructions.delete(data);clearDelegated500PaintSourcesForScope(data.scope);}if(reason){batchPreparationFailure=reason;candidateFailureGeneration=nextGeneration;}programPreparation.prune();const release=request.releaseScope;request.releaseScope=undefined;release?.();}
 function pumpPendingMaterialBatches(){
  const request=pendingMaterialBatches,data=request?.prepared;if(!request||!data||!gl||!enabled||pageHidden||destroyed||gl.isContextLost())return;
  if(batchSourceGate.blockedFor(request)&&!preparedChunkConstructions.get(data))return;
  try{programPreparation.work(gl,{resource:'batch-material-source',revision:request.revision,phase:'source-build',retainReady:false,current:()=>pendingMaterialBatches===request&&!request.closed&&!request.signal.aborted&&!destroyed&&!pageHidden&&enabled,work(){
   const previous=snapshotPackedResident(),previousLifecycle=residentLifecycleRevision;let candidate:PackedCandidate|undefined;let candidateMasks:typeof rathausProxyMasks|undefined;let ownedClaim:DelegatedSourceTextClaim|undefined;
   try{withPreparedData(data,()=>{
    if(!request.args)throw new DOMException('Aborted','AbortError');const construction=preparedChunkConstructions.get(data);let packed:{components:BuildingComponent[];visibleStyles:number[];shadowAdmission:ShadowBatchAdmission|undefined};
    if(construction){if(construction.closed||construction.consumed||construction.state.generation!==request.args[1])throw new DOMException('Delegated prepared chunks were superseded','AbortError');restorePackedResident(construction.state);packed={components:construction.components,visibleStyles:visibleChunkStyles(),shadowAdmission:construction.shadowAdmission};}
    else{if(data.chunkInput)throw Error('Delegated chunk receipt has no prepared static groups');const claim=admitMaterialSourceNow(data,batchSourceGate,request,true);if(!claim)return;ownedClaim=claim;materialRecipeRevision=request.revision;materialSourceWorkRevision=request.revision;materialSourceFailure=undefined;materialSourceSettled=false;cityPaintFragment='';cityPaintFragmentBytes=0;cityPaintFragmentClaim=claim;materialRebuildIdentities=undefined;casterBase=new Map();casterFailures=new Map();casterAnalysisPending=new Set();casterPreparedSources=createCasterPreparedSources();casterFamily0=undefined;solarDepthHelper=undefined;buildMaterialSource(claim,true);loaded=new Map();solarShadowAdmittedKeys=new Set();rathausProxyMasks=createRathausProxyMasks();candidateMasks=rathausProxyMasks;packed=packResidentBatches(...request.args.slice(0,10)as Parameters<typeof packResidentBatches>);}
    writeChunkSelection(sceneChunks);admitShadow(request.args[2]);updateSolarShadowIndices();if(partitionEnabled)partitionRuns=sceneProgramRuns();
    if(pendingMaterialBatches!==request||request.closed||request.signal.aborted||destroyed)throw new DOMException('Aborted','AbortError');candidate={state:snapshotPackedResident(),...packed,preparedData:data,releaseScope:request.releaseScope,partitions:new Map(),captureKeys:new Set(),mainKeys:new Set(),materialKeys:new Set(),mainDemandKnown:false,quality:new Map(),maskReady:false,closed:false};if(construction){construction.consumed=true;preparedChunkConstructions.delete(data);}
   });}finally{if(!candidate&&ownedClaim){ownedClaim.release();if(cityPaintFragmentClaim===ownedClaim)cityPaintFragmentClaim=undefined;}if(destroyed||residentLifecycleRevision!==previousLifecycle){clearResidentBatches(committedGeneration);if(previous.rathausProxyMasks!==rathausProxyMasks)previous.rathausProxyMasks.detach();}else{restorePackedResident(previous);if(pageHidden||!enabled||gl?.isContextLost())clearMaterialSource();}if(!candidate&&candidateMasks&&candidateMasks!==rathausProxyMasks){const scratch=candidateMasks;if(!sceneChunks.some(c=>c.masks===scratch)&&!previous.sceneChunks.some(c=>c.masks===scratch))scratch.destroy();else scratch.detach();}}
   if(!candidate)return;const preparedCandidate=candidate;pendingMaterialBatches=undefined;request.releaseScope=undefined;request.closed=true;request.abortCleanup?.();request.abortCleanup=undefined;request.args=undefined;request.prepared=undefined;pendingGeometry=preparedCandidate;data.releaseChunkDependencies?.();
   const abort=()=>{if(pendingGeometry===preparedCandidate){const successor=adjacentViewportPublicationSignal(data.signal);if(successor)discardGeometryCandidate(true,successor);else cancelCandidate(preparedCandidate.state.generation);map.triggerRepaint();}};data.signal.addEventListener('abort',abort,{once:true});preparedCandidate.abortCleanup=()=>data.signal.removeEventListener('abort',abort);
   geometryUploadRevision++;geometryUploadPending=true;geometryUploadFailure=undefined;mainDrawFailure=undefined;batchPreparationFailure=undefined;candidateFailureGeneration=undefined;map.triggerRepaint();
  }});}catch(error){if(isProgramPreparationPending(error))return;if(pendingMaterialBatches===request){candidateFailureGeneration=request.args?.[1];batchPreparationFailure=String(error).slice(0,512);cancelPendingMaterialBatches();}map.triggerRepaint();}
 }
 function clearResidentBatches(nextGeneration:number){
  residentLifecycleRevision++;committedGeneration=nextGeneration;contextRecoveryFailure=undefined;residentTextureStyles=[];clearDataPreparation();cancelPendingMaterialBatches();discardGeometryCandidate();captureRuntime.invalidate();const data=residentPreparedData,release=residentScopeRelease;residentScopeRelease=undefined;
  try{releaseGPU();releasePackedChunks(sceneChunks,sceneChunkBindings);sceneChunks=[];sceneSpans=[];sceneChunkBindings=undefined;sourceLoaded=new Map();loaded=new Map();nativeGroupPlan=undefined;heldSourceOutlines=[];s434DisplayProfile=null;s434PackingDiagnostic=undefined;s434DrawableCounts=new Map();lastVisibleUploadCapacity70=undefined;vertices=new Float32Array();indices=new Uint32Array();progressiveData=new Float32Array();paintData=new Float32Array();stateData=new Float32Array();rathausProxyMasks.destroy();partitionRuns=[];shadowIndices=new Uint32Array();fixedShadowIndices=new Uint32Array();fixedShadowRanges=[];solarShadowAdmittedKeys.clear();solarShadowAdmitted=solarShadowWithheld=shadowAdmittedComponents=0;shadowSourceBoundarySHA='';solarShadowSignature='';landmarkVisible=false;generation=nextGeneration;needsBirth=true;viewRevision++;matrix=undefined;pickBlocks70=createIndexedPickBlocks70(vertices,indices,loaded.values(),9);retireUnloadedBirths();batchPreparationFailure=undefined;materialSourceFailure=undefined;geometryUploadFailure=undefined;mainGeometryProgramFailure=undefined;residentPreparedData=undefined;progressiveStatusSnapshot=[];progressiveShaderSpecialization=undefined;sharedPaulLobeRichProgram=false;exactRichProgramKeys=new Map();distantMaterialAvailable=false;}
  finally{if(data)clearDelegated500PaintSourcesForScope(data.scope);release?.();}
 }
function snapshotPackedResident(){return {sceneChunks,sceneSpans,sceneChunkBindings,preparedData:committingPreparedData??residentPreparedData,material:snapshotMaterial(),progressiveStatusSnapshot,heldSourceOutlines,s434PackingDiagnostic,s434DrawableCounts,s434DisplayProfile,lastVisibleUploadCapacity70,nativeLeaf,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,progressiveData,paintData,stateData,partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,vertices,indices,pickBlocks70,landmarkVisible,loaded,rathausProxyMasks,shadowIndices,fixedShadowIndices,fixedShadowRanges,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowMode,solarShadowAdmittedKeys,partitionRuns};}
 type PackedResident=ReturnType<typeof snapshotPackedResident>;
 type PackedCandidate={resident?:boolean;gpuIncarnation?:number;textureFailure?:string;diffuseFailure?:string;state:PackedResident;components:BuildingComponent[];visibleStyles:number[];shadowAdmission:ShadowBatchAdmission|undefined;preparedData?:PreparedDelegated500Data;releaseScope?:()=>void;abortCleanup?:()=>void;base?:WebGLProgram;partitions:Map<string,WebGLProgram>;captureKeys:Set<string>;mainKeys:Set<string>;materialKeys:Set<string>;mainDemandKnown:boolean;textured?:WebGLProgram;diffuse?:WebGLProgram;quality:Map<string,ProjectedDetailQuality>;maskReady:boolean;closed:boolean};
 function candidatePaintDemand(candidate:PackedCandidate){
  const state=candidate.state,material=state.material,scale=1/state.anchorUnit,clip=mainWorldMatrix?multiply(mainWorldMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,state.anchor[0],state.anchor[1],0,1]):undefined;
  const visible=readPaintVisibility(state.loaded,state.partitionRuns,clip,{publication:state.sceneSpans,generation:state.generation,viewRevision,incarnation:mainGPUIncarnation,context:gl,active:true}),components=visible.components,value=Math.fround(paintOverride());
  const override=Math.abs(value)>Math.fround(.01)?material.currentFamilyPrograms?currentPaintProgramKey(value):paintProgramKey(value>=1000?Math.floor(Math.fround(value+.5)):value,city):undefined,runs=material.partitionEnabled&&paintMode()>1.5?visible.runs:[];
  const quality=paintDetailQuality(components,runs,override,material.distantMaterialAvailable,clip,candidate.quality),keys=new Set(runs.map(run=>{const key=override??run.key;return material.distantMaterialAvailable&&quality.get(key)==='distant'?BERLIN_DISTANT_PAUL_LOBE_KEY:material.exactRichProgramKeys.get(key)??berlinPaulLobeRichKey(key,material.sharedPaulLobeRichProgram);}));
  return{keys,quality};
 }
 function restorePackedResident(state:PackedResident){({sceneChunks,sceneSpans,sceneChunkBindings,progressiveStatusSnapshot,heldSourceOutlines,s434PackingDiagnostic,s434DrawableCounts,s434DisplayProfile,lastVisibleUploadCapacity70,nativeLeaf,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,progressiveData,paintData,stateData,partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,vertices,indices,pickBlocks70,landmarkVisible,loaded,rathausProxyMasks,shadowIndices,fixedShadowIndices,fixedShadowRanges,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowMode,solarShadowAdmittedKeys,partitionRuns}=state);residentPreparedData=state.preparedData;restoreMaterial(state.material);}
 function clearCandidateGPU(candidate:PackedCandidate){if(gl?.isContextLost())clearProgramGrantHandoff();if(gl&&!gl.isContextLost()){if(candidate.base)programPreparation.releaseProgram(gl,candidate.base);if(candidate.textured)programPreparation.releaseProgram(gl,candidate.textured);if(candidate.diffuse)programPreparation.releaseProgram(gl,candidate.diffuse);for(const p of candidate.partitions.values())programPreparation.releaseProgram(gl,p);}candidate.base=undefined;candidate.textured=undefined;candidate.diffuse=undefined;candidate.partitions.clear();candidate.maskReady=false;for(const chunk of candidate.state.sceneChunks)chunk.masks.detach();}
 function discardGeometryCandidate(handoff=false,successorSignal?:AbortSignal){
  const candidate=pendingGeometry;pendingGeometry=undefined;if(candidate){geometryUploadRevision++;geometryUploadPending=false;}
  const grants=candidate?[candidate.base,...candidate.partitions.values(),candidate.textured,candidate.diffuse]:[];
  if(candidate){candidate.closed=true;candidate.abortCleanup?.();candidate.abortCleanup=undefined;candidate.base=undefined;candidate.textured=undefined;candidate.diffuse=undefined;candidate.partitions.clear();candidate.mainKeys.clear();candidate.materialKeys.clear();candidate.captureKeys.clear();candidate.mainDemandKnown=false;}
  if(handoff){grantHandoffGeneration=undefined;grantHandoffPreparationToken=undefined;if(candidate||!programGrantHandoff.matches(successorSignal))programGrantHandoff.replace(gl,grants,successorSignal);}else{clearProgramGrantHandoff();if(gl)for(const p of grants)if(p)programPreparation.releaseProgram(gl,p);}
  if(!candidate)return;if(candidate.state.sceneChunks!==sceneChunks)releasePackedChunks(candidate.state.sceneChunks,candidate.state.sceneChunkBindings,new Set(sceneChunks.map(c=>c.masks)));const data=candidate.preparedData;candidate.preparedData=undefined;data?.releaseChunkDependencies?.();candidate.state.preparedData=undefined;clearMaterialSnapshot(candidate.state.material,data?.scope);programPreparation.prune();try{const candidateMasks=candidate.state.rathausProxyMasks;if(candidateMasks!==rathausProxyMasks){if(!sceneChunks.some(c=>c.masks===candidateMasks)&&!candidate.state.sceneChunks.some(c=>c.masks===candidateMasks))candidateMasks.destroy();else candidateMasks.detach();}syncFacadeResources();}finally{const release=candidate.releaseScope;candidate.releaseScope=undefined;release?.();}
 }
 // A manager deadline can expire before setBatches assigns a candidate
 // generation. Cancel by the exact preparation signal in that case, leaving
 // both a newer request and the already published resident untouched.
 function cancelPreparation(signal:AbortSignal){
  const pending=dataPreparationPending;
  if(pending?.signal!==signal)return;
  clearDataPreparation(pending);
  map.triggerRepaint();
 }
 function cancelCandidate(expectedGeneration:number){clearProgramGrantHandoff(expectedGeneration);if(pendingMaterialBatches?.args?.[1]===expectedGeneration)cancelPendingMaterialBatches();if(pendingGeometry?.state.generation===expectedGeneration)discardGeometryCandidate();if(candidateFailureGeneration===expectedGeneration){candidateFailureGeneration=undefined;batchPreparationFailure=undefined;geometryUploadFailure=undefined;mainGeometryProgramFailure=undefined;}map.triggerRepaint();}
 function publishPackedResident(candidate:PackedCandidate){
  if(!candidateCurrent(candidate)||sceneIndexCount(candidate.state.sceneChunks)&&!candidateMainReady(candidate))return;
  const previousChunks=sceneChunks,previousBindings=sceneChunkBindings,previousMasks=rathausProxyMasks,previousViewRevision=viewRevision,oldRelease=residentScopeRelease,oldData=residentPreparedData,oldProgram=program,oldTextured=texturedProgram,oldDiffuse=diffuseProgram,oldPartitions=[...partitionPrograms.values()],oldMaterial=snapshotMaterial();
  adoptPackedChunkRoles(candidate.state.sceneChunks);restorePackedResident(candidate.state);invalidateMainFrame();residentMainMasksReady=candidate.maskReady;surfaceContentRevision++;residentLifecycleRevision++;committedGeneration=generation;viewRevision=Math.max(previousViewRevision,viewRevision);matrix=undefined;pendingGeometry=undefined;residentPublicationFailure=undefined;residentScopeRelease=candidate.releaseScope;candidate.releaseScope=undefined;program=candidate.base;candidate.base=undefined;candidate.closed=true;candidate.abortCleanup?.();candidate.abortCleanup=undefined;candidate.preparedData=undefined;partitionPrograms.clear();lastPartitionDrawKeys=undefined;heldMainWaitFrame=-1;for(const [key,p]of candidate.partitions)partitionPrograms.set(key,p);candidate.partitions.clear();partitionFailures.clear();distantQuality.clear();for(const [key,quality]of candidate.quality)distantQuality.set(key,quality);texturedProgram=candidate.textured;diffuseProgram=candidate.diffuse;candidate.textured=undefined;candidate.diffuse=undefined;textureShaderAttempted=!!texturedProgram;diffuseShaderAttempted=!!diffuseProgram;textureShaderFailure=undefined;diffuseShaderFailure=undefined;partitionPending=false;candidateFailureGeneration=undefined;residentTextureStyles=candidate.visibleStyles;captureRuntime.invalidate();pruneProgramPreparation();
  try{if(gl){if(oldProgram)programPreparation.releaseProgram(gl,oldProgram);if(oldTextured)programPreparation.releaseProgram(gl,oldTextured);if(oldDiffuse)programPreparation.releaseProgram(gl,oldDiffuse);for(const p of oldPartitions)programPreparation.releaseProgram(gl,p);}if(previousChunks!==sceneChunks)releasePackedChunks(previousChunks,previousBindings,new Set(sceneChunks.map(c=>c.masks)));
   // A replaced scene-level mask that no chunk owns (the initial or empty-scene
   // scratch) has no other retirement path: destroy it and return its reservation.
   if(previousMasks!==rathausProxyMasks&&!sceneChunks.some(c=>c.masks===previousMasks)&&!previousChunks.some(c=>c.masks===previousMasks))previousMasks.destroy();
   retireUnloadedBirths();syncFacadeResources();}
  catch(error){residentPublicationFailure=String(error).slice(0,512);}
  finally{clearMaterialSnapshot(oldMaterial,oldData?.scope);oldRelease?.();}
 }
 function* filterConstructionComponents(rows:readonly BuildingComponent[],keep:(component:BuildingComponent)=>boolean){
  const kept:BuildingComponent[]=[];let checked=0;
  for(const component of rows){if(keep(component))kept.push(component);if(++checked%16===0)yield;}
  return kept;
 }
 function packResidentBatches(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan,partialGatePlan?:PartialGatePlan,s402Plan?:S402Plan,s434Plan?:S434AggregatePackingState,s036Plan?:S036NorthPlan,s240Plan?:S240BasePlan,f151Plan?:F151CrownPlan){
  const steps=packResidentBatchesSteps(components,nextGeneration,shadowAdmission,nativeDisplay,partialGatePlan,s402Plan,s434Plan,s036Plan,s240Plan,f151Plan);
  for(;;){const next=steps.next();if(next.done)return next.value;}
 }
 function* packResidentBatchesSteps(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan,partialGatePlan?:PartialGatePlan,s402Plan?:S402Plan,s434Plan?:S434AggregatePackingState,s036Plan?:S036NorthPlan,s240Plan?:S240BasePlan,f151Plan?:F151CrownPlan){let count=0,ic=0,checked=0;
const seen=new Set<string>();
for(const c of components){validate(c,city);if(seen.has(key(c)))throw Error('Duplicate component identity');seen.add(key(c));for(const m of c.batches){count+=m.positions.length/3;ic+=m.indices.length;}if(++checked%16===0)yield;}yield;
const nextSourceLoaded=new Map(components.map(c=>[key(c),c]));
const nextSourceComponents:readonly BuildingComponent[]=[...nextSourceLoaded.values()];
const koRailBatch70=prepareKORailConnectionBatch70(nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);yield;
components=yield*filterConstructionComponents(components,c=>hhStrafjustizDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhSpiegelEricusDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhSchanzenDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhOberlandesgerichtDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhZiviljustizDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhFlakbunkerDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhFontenayDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhMARKKDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhDammtorDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhESA1Display70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhESAEastDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhJohannesKronstadtDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhHotelHafenDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhSeewetterDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhLandungsbrueckenDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhFinanzamtDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhFernsprechamtDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&hhBismarckDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koTriangleDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koMusicalDomeDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koRheinhallenDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koAltHeribertDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koJohannesDeutzDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koStPaulDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koLanxessTowerDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koMalakoffturmDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koNeuHeribertDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koArtotelDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koHohenzollernDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY)&&koPantaleonAnnexDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70PantaleonAnnexProgramReady,HC70_REGISTRY)&&koPantaleonGateDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70PantaleonGateProgramReady,HC70_REGISTRY)&&koMesseturmCrownDisplay70(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70MesseturmCrownProgramReady,HC70_REGISTRY)&&koRailBatch70.display(c));yield;
components=yield*filterConstructionComponents(components,c=>hnReformierteDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&doRWEDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beStMichaelDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&doSparkasseDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnGalerieDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beEmmausDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnAltesRathausDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beCubeDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beSwissEmbassyDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beAlexanderplatzStationDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnStateArchiveDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&bePaulLobeDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beJamesSimonDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beAlteKommandanturDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beNewForeignOfficeDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beLittenCourtsDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beTitanicDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beBCCDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beSchinkelplatzDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beMoabitJVADisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beSpreebogenDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnNordlbDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beSonyCenterDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beSpielbankStageDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beHedwigEastDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&beMarieLudersDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnOberfinanzdirektionDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY)&&hnHbfPlatformsDisplay1(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY));yield;
// Empty exclusion cohorts retain the already validated ordered rows. Avoid
// hundreds of no-op scheduler yields per absent correction; nonempty passes
// retain the original predicate and 16-component cooperative bound.
const f269640=f269Plan640(components,nativeLeaf,ownerPatchLeaf,f269640Available);yield;
for(const c of f269640.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f269640.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f269640.suppressed.includes(c));yield;
const f285634=f285Plan634(components,nativeLeaf,ownerPatchLeaf,f285634Available);yield;
for(const c of f285634.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f285634.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f285634.suppressed.includes(c));yield;
const f235631=f235Plan631(components,nativeLeaf,ownerPatchLeaf,f235631Available);yield;
for(const c of f235631.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f235631.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f235631.suppressed.includes(c));yield;
const f244627=f244Plan627(components,nativeLeaf,ownerPatchLeaf,f244627Available);yield;
for(const c of f244627.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f244627.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f244627.suppressed.includes(c));yield;
const f244622=f244Plan622(components,nativeLeaf,ownerPatchLeaf,f244622Available);yield;
for(const c of f244622.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f244622.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f244622.suppressed.includes(c));yield;
const f244619=f244Plan619(components,nativeLeaf,ownerPatchLeaf,f244619Available);yield;
for(const c of f244619.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f244619.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f244619.suppressed.includes(c));yield;
const f358604=f358Plan604(components,nativeLeaf,ownerPatchLeaf,f358604Available);yield;
for(const c of f358604.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f358604.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f358604.suppressed.includes(c));yield;
const f238595=f238Plan595(nextSourceComponents,nativeLeaf,ownerPatchLeaf,f238Body595Available);yield;
for(const c of components.filter(c=>f238595.held.has(key(c))||f238595.suppressed.has(key(c))))for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f238595.held.size||f238595.suppressed.size)components=yield*filterConstructionComponents(components,c=>!f238595.held.has(key(c))&&!f238595.suppressed.has(key(c)));yield;
const f303Deferred582=components.filter(c=>!f303Display465(c,[...nextSourceLoaded.values()],nativeLeaf,ownerPatchLeaf));
for(const c of f303Deferred582)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f303Deferred582.length)components=yield*filterConstructionComponents(components,c=>!f303Deferred582.includes(c));yield;
const f355559=f355Plan559(components,nativeLeaf,ownerPatchLeaf,f355Clip559Available);yield;
for(const c of f355559.suppressed)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f355559.suppressed.length)components=yield*filterConstructionComponents(components,c=>!f355559.suppressed.includes(c));yield;
const f248551=f248Plan551(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of f248551.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f248551.held.length)components=yield*filterConstructionComponents(components,c=>!f248551.held.includes(c));yield;
components=frozenF231Display547(components,[...nextSourceLoaded.values()],nativeLeaf);yield;
count=0;
ic=0;
for(const c of components){validate(c,city);for(const b of c.batches){if(!b.positions.length)throw Error('Empty F231 display batch');count+=b.positions.length/3;ic+=b.indices.length;}}
const f363518=f363Plan518(components,nativeLeaf,ownerPatchLeaf);yield;
const f363Removed518=components.filter(c=>f363518.held.has(key(c))||f363518.suppressed.has(key(c)));
for(const c of f363Removed518)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f363518.held.size||f363518.suppressed.size)components=yield*filterConstructionComponents(components,c=>!f363518.held.has(key(c))&&!f363518.suppressed.has(key(c)));yield;
const f356EntryPlan=f356EntryPlan495(components,nextSourceComponents,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f356EntryPlan.held,...f356EntryPlan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f356EntryPlan.drawable;yield;
const f303492=f303Plan508(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f303492.held,...f303492.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f303492.drawable;yield;
const f302576=f302Plan576(nextSourceComponents,nativeLeaf,ownerPatchLeaf);yield;
for(const c of components.filter(c=>f302576.held.has(key(c))||f302576.suppressed.has(key(c))))for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f302576.held.size||f302576.suppressed.size)components=yield*filterConstructionComponents(components,c=>!f302576.held.has(key(c))&&!f302576.suppressed.has(key(c)));yield;
const f302554=f302Plan554(nextSourceComponents,nativeLeaf,ownerPatchLeaf);yield;
const f302Removed554=components.filter(c=>f302554.held.has(key(c))||f302554.suppressed.has(key(c)));
for(const c of f302Removed554)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(f302554.held.size||f302554.suppressed.size)components=yield*filterConstructionComponents(components,c=>!f302554.held.has(key(c))&&!f302554.suppressed.has(key(c)));yield;
const f323Plan=f323Plan476(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f323Plan.held,...f323Plan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f323Plan.drawable;yield;
const f323EntryPlan=f323EntryPlan488(components,nextSourceComponents,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f323EntryPlan.held,...f323EntryPlan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f323EntryPlan.drawable;yield;
const f044Plan=f044Plan463(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of f044Plan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f044Plan.drawable;yield;
const f288Plan=f288Plan405(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f288Plan.held,...f288Plan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f288Plan.drawable;yield;
const f337Plan=f337Plan386(components,nativeLeaf,ownerPatchLeaf);yield;
for(const c of [...f337Plan.held,...f337Plan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f337Plan.drawable;yield;
const nativeHeld=new Set(nativeDisplay?.hiddenOutlines??[]);
if([...nativeHeld].some(c=>nextSourceLoaded.get(key(c))!==c))throw Error('Unbound native display outline');
if(nativeHeld.size)components=yield*filterConstructionComponents(components,c=>!nativeHeld.has(c));yield;
for(const c of nativeHeld)for(const batch of c.batches){count-=batch.positions.length/3;ic-=batch.indices.length;}
const s018Plan=s018Plan345(components,{enabled:true,programSource:S018_PROGRAM345,profileOf:f331Descriptor276,signatureOf:nativePaintSignature,nativeLeaf:c=>nativeLeaf?.(c)});yield;
for(const c of [...s018Plan.held,...s018Plan.suppressed])for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=s018Plan.drawable;yield;
const f232Plan=f232MainPlan315(components);yield;
for(const c of f232Plan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f232Plan.drawable;yield;
const f331Raw344=components;
const f331Plan=f331RemainderPlan276(f331Raw344,f331Descriptor276,f331Signature276);yield;
const f331Photo344=f331PhotoPlan344(f331Raw344,{enabled:true,programSource:F331_PROGRAM344,legacyRemainderComplete:f331Plan.complete,profileOf:f331Descriptor276,signatureOf:nativePaintSignature,nativeLeaf:c=>nativeLeaf?.(c)});yield;
const f331Removed344=new Set([...f331Plan.suppressed,...f331Photo344.held,...f331Photo344.suppressed]);yield;
for(const c of f331Removed344)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f331Raw344.filter(c=>!f331Removed344.has(c));yield;
const f373Plan=f373LowerHeadPlan269(components);yield;
for(const c of f373Plan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f373Plan.drawable;yield;
const f260CanopyPlan=f260CanopyDisplay267(components);yield;
for(const c of f260CanopyPlan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f260CanopyPlan.drawable;yield;
const f248Plan=f248RecoveryDisplay214(components);yield;
for(const c of f248Plan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f248Plan.drawable;yield;
const f355Plan=f355TowerDisplay220(components);yield;
for(const c of f355Plan.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
components=f355Plan.drawable;yield;
const underground683=components.filter(c=>(f384DormersHold738(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f384CapsHold736(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f232StructureHold752(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f234EquipmentHold751(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f384FinialsHold735(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f260FiguresHold715(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f260CapsHold710(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f236UndergroundHold683(c,nativeLeaf)||f236CorridorHold784(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f288TunnelHold692(c,nativeLeaf)||f288PlatformsHold729(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f236PlatformsHold771(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f288BodyHold727(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f288LinkHold725(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)||f288SouthHold697(c,nextSourceComponents,nativeLeaf,ownerPatchLeaf)));
for(const c of underground683)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}
if(underground683.length)components=yield*filterConstructionComponents(components,c=>!underground683.includes(c));yield;
const partPlan=exactNativePartDisplay(components);yield;
heldSourceOutlines=partPlan.held;
components=partPlan.drawable;yield;
for(const row of heldSourceOutlines)for(const batch of row.outline.batches){count-=batch.positions.length/3;ic-=batch.indices.length;}
s434PackingDiagnostic=s434Plan?.diagnostic;
s434DrawableCounts=new Map();
for(const c of components)s434DrawableCounts.set(key(c),(s434DrawableCounts.get(key(c))??0)+1);
const s434Drawable=new Set<object>(components),s434Entries=s434Plan?.entries.filter(r=>s434Drawable.has(r.component))??[],s434Parent=components.find(c=>c.city==='frankfurt'&&c.objectId==='osm/way/72449471'&&c.partId==='osm/way/72449471/component/2137cfaabe8621cde1a7'),candidateS434=s434Plan?.profile??null;yield;
s434DisplayProfile=candidateS434&&s434Parent&&!s434AggregateBatchIncluded(candidateS434,s434Parent,0,s434Entries)?candidateS434:null;
const batchIncludedProfile=s434DisplayProfile,packingNativeLeaf=nativeLeaf,packingOwnerPatchLeaf=ownerPatchLeaf,packingSupplementBatch1Ready=supplementBatch1Ready,batchIncluded=(c:BuildingComponent,bi:number)=>sourceRoleBatchIncluded(c,bi)&&s434AggregateBatchIncluded(batchIncludedProfile,c,bi,s434Entries)&&hnStateArchiveBatchIncluded50(c,bi,nextSourceComponents,packingNativeLeaf,packingOwnerPatchLeaf,packingSupplementBatch1Ready,SUPPLEMENT_REGISTRY);
for(const c of components)for(const [batchIndex,batch]of c.batches.entries())if(!batchIncluded(c,batchIndex))ic-=batch.indices.length;
components=yield*filterConstructionComponents(components,c=>acceptPaintComponent('delegated500',c));yield;
count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);
ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+(batchIncluded(c,c.batches.indexOf(b))?b.indices.length:0),0),0);
const uploadCapacity70=koRailUploadCapacity70(nextSourceComponents,city,sourceLineage70?.(),nativeLeaf,ownerPatchLeaf,HC70_GLSL,vertexCap);
lastVisibleUploadCapacity70=uploadCapacity70;
if(count>uploadCapacity70.vertexCap||ic>uploadCapacity70.indexCap)throw Error('Visible mesh budget exceeded');
const allComponents=components,productionData=committingPreparedData??residentPreparedData;
if(!productionData)throw Error('Delegated chunk packing requires prepared source data');
const input=packingChunkInput??productionData.chunkInput;if(!input)throw Error('Delegated nonempty batches require authoritative renderer chunks');chunkStore=input.store;validateChunkCohorts(input);const physicalSourceComponents=input.groups.flatMap(group=>[...group.components]),f231Display=components.some(c=>!!c.displayEstimates?.F231),physicalCandidates=(f231Display?frozenF231Display547(physicalSourceComponents,physicalSourceComponents,nativeLeaf):physicalSourceComponents).filter(c=>acceptPaintComponent('delegated500',c));const dependencies:{members:BuildingComponent[];authority:string}[]=[];
const addDependency=(members:readonly unknown[],authority:string)=>{if(members.length&&members.every(row=>physicalCandidates.some(c=>c===row)))dependencies.push({members:physicalCandidates.filter(c=>members.includes(c)),authority});};
for(const mask of rathausCoincidentWallFragmentMasks(physicalCandidates).masks){const outline=physicalCandidates.find(c=>key(c)===key(mask.outline)),preferred=physicalCandidates.find(c=>key(c)===key(mask.preferred));if(!outline||!preferred)throw Error('Verified proxy mask has no accepted source member');addDependency([outline,preferred],'rathaus-proxy-fragment-mask-v1');}
if(partialGatePlan?.enabled&&partialGatePlan.parent&&partialGatePlan.cover)addDependency([partialGatePlan.parent,partialGatePlan.cover],'partial-gate-mask-v1');
if(s402Plan?.enabled&&s402Plan.parent&&s402Plan.cover)addDependency([s402Plan.parent,s402Plan.cover],'s402-connector-mask-v1');
if(s036Plan?.enabled&&s036Plan.members)addDependency(s036Plan.members,'s036-north-coface-mask-v1');
if(s240Plan?.enabled&&s240Plan.members)addDependency(s240Plan.members,'s240-base-coface-mask-v1');
if(s434DisplayProfile)addDependency(s434Entries.map(entry=>entry.component),'s434-aggregate-source-flags-v1');
const bindings=retainChunkBindings(input),groupedInput={...bindings,groups:coalesceRendererChunkGroups(bindings.groups,dependencies)};
sourceLoaded=nextSourceLoaded;nativeGroupPlan=nativeDisplay;generation=nextGeneration;needsBirth=true;viewRevision++;matrix=undefined;loaded=new Map();sceneChunks=[];sceneSpans=[];sceneChunkBindings=bindings;
vertices=new Float32Array();indices=new Uint32Array();paintData=new Float32Array();progressiveData=new Float32Array();stateData=new Float32Array();partitionRuns=[];shadowIndices=new Uint32Array();fixedShadowIndices=new Uint32Array();fixedShadowRanges=[];pickBlocks70=createIndexedPickBlocks70(vertices,indices,loaded.values(),9);
if(components.length){const first=input.groups.find(group=>group.components.some(c=>key(c)===key(components[0])));if(!first)throw Error('Delegated scene has no authoritative first group');sceneSunOrigin=[...first.frame.origin];sceneSun=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],sceneSunInstant);anchor=merc([first.frame.origin[0],first.frame.origin[1]]);anchorUnit=first.frame.unit;if(!materialAnchor){materialAnchor=[...anchor];materialUnit=anchorUnit;}}
const construction:ChunkConstruction={state:snapshotPackedResident(),components,shadowAdmission,groups:[],bindings,closed:false,consumed:false};currentChunkConstruction=construction;
const buildGroup=(group:{source:RendererSourceGroup<BuildingComponent>;components:BuildingComponent[];contextComponents:BuildingComponent[]},sharedSignal:AbortSignal):DelegatedPackedCPU=>{
 const {hc70ProgramReady,hc70PantaleonGateProgramReady,hc70PantaleonAnnexProgramReady,hc70LudwigWorkshopProgramReady,hc70MesseturmCrownProgramReady,supplementBatch1Ready,f004645Available,f020Whole1679Available,f020Chapel1679Available,f269640Available,f285634Available,f235631Available,f244627Available,f244622Available,f244619Available,f358604Available,f238Body595Available,f358Normal579Available,f346562Available,f355Clip559Available}=construction.state.material;const nativeLeaf=construction.state.nativeLeaf,ownerPatchLeaf=packingOwnerPatchLeaf;
 return withPreparedData(productionData,()=>{
 const components=group.components,nextSourceComponents=group.contextComponents,koRailBatch70=prepareKORailConnectionBatch70(nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
 const sharedS402=s402Plan?.context?{...s402Plan,context:{...s402Plan.context,signal:sharedSignal}}:s402Plan,sharedS036=s036Plan?.context?{...s036Plan,context:{...s036Plan.context,signal:sharedSignal}}:s036Plan,sharedS240=s240Plan?.context?{...s240Plan,context:{...s240Plan.context,signal:sharedSignal}}:s240Plan,sharedF151=f151Plan?.context?{...f151Plan,context:{...f151Plan.context,signal:sharedSignal}}:f151Plan;
const nextProgressiveData=progressivePaintData(components),nextPaintData=facadePaintData(components);
applyKOLudwigWorkshop70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70LudwigWorkshopProgramReady,HC70_REGISTRY);
applyHHStrafjustiz70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHSpiegelEricus70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHSchanzen70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHOberlandesgericht70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHZiviljustiz70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHFlakbunker70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHFontenay70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHMARKK70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHDammtor70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHESA1_70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHESAEast70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHJohannesKronstadt70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHHotelHafen70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHSeewetter70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHLandungsbruecken70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHFinanzamt70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHFernsprechamt70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyHHBismarck70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOTriangle70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOMusicalDome70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKORheinhallen70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOAltHeribert70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOJohannesDeutz70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOStPaul70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOLanxessTower70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOMalakoffturm70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKONeuHeribert70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOArtotel70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOHohenzollern70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70ProgramReady,HC70_REGISTRY);
applyKOPantaleonAnnex70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70PantaleonAnnexProgramReady,HC70_REGISTRY);
applyKOPantaleonGate70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70PantaleonGateProgramReady,HC70_REGISTRY);
koRailBatch70.apply(components,nextProgressiveData,nextPaintData);
applyKOMesseturmCrown70(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,hc70MesseturmCrownProgramReady,HC70_REGISTRY);
applyHNReformierte1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyDORWE1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEStMichael1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyDOSparkasse1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNGalerie1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEEmmaus1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNAltesRathaus1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBECube1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBESwissEmbassy1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEAlexanderplatzStation1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNStateArchive1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEPaulLobe1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEJamesSimon1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEAlteKommandantur1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBENewForeignOffice1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBELittenCourts1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBETitanic1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEBCC1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBESchinkelplatz1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEMoabitJVA1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBESpreebogen1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNNordlb1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBESonyCenter1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBESpielbankStage1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEHedwigEast1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyBEMarieLuders1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNOberfinanzdirektion1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyHNHbfPlatforms1(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,supplementBatch1Ready,SUPPLEMENT_REGISTRY);
applyF46RecoveryPaint(components,nextProgressiveData,nextPaintData);
applyF260RecoveryPaint264(components,nextProgressiveData,nextPaintData);
applyF260CanopyPaint267(components,nextProgressiveData,nextPaintData);
applyF260CapsPaint710(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF260FiguresPaint715(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF260Shelters745(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF373LowerHeadPaint269(components,nextProgressiveData,nextPaintData);
applyF063RecoveryPaint272(components,nextProgressiveData,nextPaintData);
applyF061RecoveryPaint279(components,nextProgressiveData,nextPaintData);
applyF061Court829(components,nextProgressiveData,nextPaintData);
applyF061SideNative829(components,nextProgressiveData,nextPaintData);
applyF061Nave833(components,nextProgressiveData,nextPaintData);
applyF003RecoveryPaint287(components,nextProgressiveData,nextPaintData);
applyF013Canopy294(components,nextProgressiveData,nextPaintData);
applyF021Tower295(components,nextProgressiveData,nextPaintData);
applyF021Nave306(components,nextProgressiveData,nextPaintData);
applyF058Upper312(components,nextProgressiveData,nextPaintData);
applyF305Native323(components,nextProgressiveData,nextPaintData);
applyF315AcceptedPartial332(components,nextProgressiveData,nextPaintData,{enabled:true,nativeLeaf:c=>nativeLeaf?.(c as BuildingComponent)});
applyF364Paint325(components,nextProgressiveData,nextPaintData);
applyF243Proxy330(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF243482(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF310Recovery394(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF356Carve396(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF356Entry495(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF327Recovery381(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF323Details373(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF323476(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF323Entry488(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF372Repair350(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF372Gallery371(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF372Details507(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF364Coface331(components,nextProgressiveData,nextPaintData,c=>nativePaintSignature(c),!!nativeLeaf&&allComponents.some(c=>c.objectId==='osm/way/205287846'&&nativeLeaf?.(c)==='fdf20d4f7f62e398190accc468fb2a93048d7024b02ce6f7950e524dbf94ac52')&&allComponents.some(c=>c.objectId==='osm/relation/7471820'&&nativeLeaf?.(c)==='4077e2c4c316ad302d6fc4193015e23c358ba0a79dc8dda4c353745d41812cd4'));
applyF364Front335(components,nextProgressiveData,nextPaintData,c=>nativePaintSignature(c),nativeLeaf,ownerPatchLeaf);
applyF364Body338(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF364East348(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF363Native360(components,nextProgressiveData,nextPaintData,nativeLeaf);
applyF363Top369(components,nextProgressiveData,nextPaintData,nativeLeaf);
applyF363472(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF363501(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF322Current372(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF329Current380(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF337Current386(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF271Upper395(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF288Reception399(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF288Reception405(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF288South697(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF288Link725(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF288Body727(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF288Platforms729(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF359East410(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF363Roof360(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF360Recovery401(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF360User420(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF232Main315(components,nextProgressiveData,nextPaintData);
applyF269RecoveryPaint284(components,nextProgressiveData,nextPaintData);
applyF269Roof556(components,nextProgressiveData,nextPaintData,[...nextSourceLoaded.values()],nativeLeaf);
applyF248Recovery214(components,nextProgressiveData,nextPaintData);
applyF248Sidewing368(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf);
applyF248Machine469(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF248Site525(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF248Site534(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF248Aux551(components,nextProgressiveData,nextPaintData,[...nextSourceLoaded.values()],nativeLeaf);
applyF355Tower220(components,nextProgressiveData,nextPaintData);
applyF348Detail181(components,nextProgressiveData,nextPaintData);
applyS018Paint345(components,nextProgressiveData,nextPaintData,s018Plan);
applyF331PhotoPaint344(components,nextProgressiveData,nextPaintData,f331Photo344);
applyF258382(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF382388(components,nextProgressiveData,nextPaintData,nextSourceComponents,ownerPatchLeaf);
applyF382North519(components,nextProgressiveData,nextPaintData,nextSourceComponents,ownerPatchLeaf);
applyF295419(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF349406(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF237412(components,nextProgressiveData,nextPaintData,nextSourceComponents,ownerPatchLeaf);
applyF303465(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF303Copy508(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF025417(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF336425(components,nextProgressiveData,nextPaintData,ownerPatchLeaf);
applyF059437(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF044427(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF044447(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF044463(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF336431(components,nextProgressiveData,nextPaintData,ownerPatchLeaf);
applyF315Details461(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF315Details504(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF315Front515(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF345Repair467(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF322Details483(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF327Details478(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF340Crowns819(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF271Court827(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF329Details489(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF331Bergpalais494(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF364Court498(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF364Court505(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF331Neues503(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF363Copy518(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF373Details516(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF236Display524(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF236Details530(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF236North768(components,nextProgressiveData,nextPaintData,nextSourceComponents,ownerPatchLeaf);
applyF236Wings546(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF236Platforms681(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF236Platforms771(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF384Overlap732(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF384FinialsPaint735(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF234EquipmentPaint751(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF232StructurePaint752(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF384CapsPaint736(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF384DormersPaint738(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF044527(components,nextProgressiveData,nextPaintData,nativeLeaf,ownerPatchLeaf,[...nextSourceLoaded.values()]);
applyF346538(components,nextProgressiveData,nextPaintData,nativeLeaf,[...nextSourceLoaded.values()]);
applyFrozenHannover533(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF346540(components,nextProgressiveData,nextPaintData,nativeLeaf,[...nextSourceLoaded.values()]);
applyF346Annex562(components,nextProgressiveData,nextPaintData,[...nextSourceLoaded.values()],nativeLeaf,f346562Available);
applyFrozenF231547(components,nextProgressiveData,nextPaintData,[...nextSourceLoaded.values()],nativeLeaf);
applyF355548(components,nextProgressiveData,nextPaintData,nativeLeaf,[...nextSourceLoaded.values()]);
applyF355Hip559(components,nextProgressiveData,nextPaintData,[...nextSourceLoaded.values()],nativeLeaf,ownerPatchLeaf,f355Clip559Available);
applyF302Copy554(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF302Crown576(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF358Details564(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF358604(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f358604Available);
applyF358Normal579(components,nextPaintData,nextSourceComponents,nativeLeaf,f358Normal579Available);
applyF354Details563(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF269Roof575(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF022574(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF280582(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF250590(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF242596(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF238Body595(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f238Body595Available);
applyF278594(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF269Neighbors605(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF269Connection610(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF269Cofaces611(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF342Annex613(components,nextProgressiveData,nextPaintData,nextSourceComponents,nativeLeaf);
applyF342Foyer615(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF342Grotto617(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF342Cascade618(components,nextPaintData,nextSourceComponents,nativeLeaf);
applyF244619(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f244619Available);
applyF244622(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f244622Available);
applyF244627(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f244627Available);
applyF235631(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f235631Available);
applyF285634(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f285634Available);
applyF269640(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,f269640Available);
applyF025North801(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF025East797(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF025Figure663(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf);
applyF020Step661(components,nextPaintData,nextSourceComponents,nativeLeaf,ownerPatchLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Stone660(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Turret659(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Annex658(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Nave657(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Apse656(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Buttress655(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF020Chapel654(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Chapel1679Available);
applyF020Spire653(components,nextPaintData,nextSourceComponents,nativeLeaf,city==='berlin'&&f020Whole1679Available);
applyF004Tower645(components,nextPaintData,nextSourceComponents,nativeLeaf,f004645Available);
applyF004Doors645(components,nextPaintData,nextSourceComponents,nativeLeaf,f004645Available);

 const partialGateDisplay=applyPartialGateMask(components,nextProgressiveData,nextPaintData,partialGatePlan),s402ConnectorDisplay=applyS402ConnectorMask(components,nextProgressiveData,nextPaintData,sharedS402),s036NorthCofaceDisplay=applyS036NorthCoface(components,nextProgressiveData,nextPaintData,sharedS036),s240BaseCofaceDisplay=applyS240BaseCoface(components,nextProgressiveData,nextPaintData,sharedS240),f151CrownDisplay=applyF151CrownMask(components,nextProgressiveData,sharedF151),masks=createRathausProxyMasks();
 try{masks.configure(components,nextPaintData,physicalCandidates);const geometry=packChunkGeometry<BuildingComponent>(components,group.source.frame,nextPaintData,nextProgressiveData,{merc:p=>merc([p[0],p[1]]),unit,included:batchIncluded,progressivePainted:isProgressivelyPainted,landmark:c=>isFacadeLandmark(c)&&!isSourceOnlyGlassRoof(c),indexedPick:true,style(c,m,j){const raw=c.sourceFeature.properties??{},landmark=isFacadeLandmark(c),glass=isSourceOnlyGlassRoof(c),wall=landmark?(surfaceStyle?.(raw).styleId??0)%16:24,roof=(landmark?(surfaceStyle?.({...raw,building:'roof','building:material':raw['roof:material']}).styleId??8)%16:24)+32;return glass||m.faceRole==='roof'||m.faceRole!=='wall'&&Math.abs(m.normals[j+1])>.2?roof:wall;}});return{...geometry,maskRecipe:masks.cpuRecipe(),progressiveView:progressiveRenderView(),partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay};}finally{masks.destroy();}
 });
};
let constructionFinished=false;
try{
 for(const selectedGroup of selectedChunkGroups(components,groupedInput,physicalCandidates)){
  const omittedBatches=selectedGroup.components.flatMap(component=>{const omitted=component.batches.flatMap((_,index)=>batchIncluded(component,index)?[]:[index]);return omitted.length?[[key(component),omitted]]:[];}),contains=(row:Identity|undefined)=>!!row&&selectedGroup.components.some(component=>key(component)===key(row));
  const activeMasks=[partialGatePlan?.enabled&&(contains(partialGatePlan.parent)||contains(partialGatePlan.cover))?'partial-gate-mask-v1':null,s402Plan?.enabled&&(contains(s402Plan.parent)||contains(s402Plan.cover))?'s402-connector-mask-v1':null,s036Plan?.enabled&&s036Plan.members?.some(contains)?'s036-north-coface-mask-v1':null,s240Plan?.enabled&&s240Plan.members?.some(contains)?'s240-base-coface-mask-v1':null,f151Plan?.enabled&&contains(f151Plan.member)?'f151-crown-mask-v1':null].filter(Boolean);
  const material=construction.state.material,flags=[material.hc70ProgramReady,material.hc70PantaleonGateProgramReady,material.hc70PantaleonAnnexProgramReady,material.hc70LudwigWorkshopProgramReady,material.hc70MesseturmCrownProgramReady,material.supplementBatch1Ready,material.f004645Available,material.f020Whole1679Available,material.f020Chapel1679Available,material.f269640Available,material.f285634Available,material.f235631Available,material.f244627Available,material.f244622Available,material.f244619Available,material.f358604Available,material.f238Body595Available,material.f358Normal579Available,material.f346562Available,material.f355Clip559Available];
  // The preparation input returns its parent grants before GPU upload; source
  // contributors must use this publication's independently retained bindings.
  const sourceContext=resolveDelegatedSourceContext(selectedGroup.components,bindings.groups),contributors=sourceContext.contributors,contextComponents=sourceContext.components;
  const recipeAuthority=resourceContentKey('delegated500-recipe-v3',selectedGroup.source.recipeAuthority,'delegated500-complete-source-candidates-v1',sourceContext.authority,delegatedContributorAuthority(contributors),flags,omittedBatches,activeMasks,selectedGroup.components.some(component=>!!component.displayEstimates?.F231)?'F231-verified-display':'source-geometry'),group={...selectedGroup,contextComponents,source:{...selectedGroup.source,sourceKeys:selectedGroup.source.sourceKeys??[selectedGroup.source.contentKey],parents:[...new Set([...selectedGroup.source.parents,...contributors.flatMap(source=>source.parents)])],contentKey:resourceContentKey('delegated500-source-group-v2',selectedGroup.source.contentKey,recipeAuthority),recipeAuthority}};
  // The derived group key already embeds recipeAuthority. Packing the original
  // source key plus that complete recipe retains the same identity information
  // once, while the derived group/parents stay intact for publication cohorts.
  const contentKey=packedChunkContentKey('delegated500:'+city,{...selectedGroup.source,recipeAuthority},'position9-paint5-progressive4-state1-source-flags-v1'),estimate=group.components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3*76+b.indices.length*4+Math.ceil(b.indices.length/(INDEXED_PICK_BLOCK_TRIANGLES70*3))*48,0),0),cpu=acquirePackedChunk(bindings.store,contentKey,estimate,context=>buildGroup(group,context.signal),productionData.signal,preparingChunkProduction?gl:undefined,()=>productionData.scope.retain(),group.components.length,group.source.parents);
  construction.groups.push({...group,cpu});yield;
 }
 if(!preparingChunkProduction){if(construction.groups.some(group=>!group.cpu.value))throw new ProgramPreparationPending();assembleChunkConstruction(construction);construction.consumed=true;currentChunkConstruction=undefined;}
 constructionFinished=true;return{components,visibleStyles:visibleChunkStyles(),shadowAdmission};
}finally{if(!constructionFinished)releaseChunkConstruction(construction);}
}
 function setBatches(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan,partialGatePlan?:PartialGatePlan,s402Plan?:S402Plan,s434Plan?:S434AggregatePackingState,s036Plan?:S036NorthPlan,s240Plan?:S240BasePlan,f151Plan?:F151CrownPlan,prepared?:PreparedDelegated500Data){
  if(destroyed||!Number.isSafeInteger(nextGeneration)||nextGeneration<generation||nextGeneration<(pendingGeometry?.state.generation??generation)||nextGeneration<(pendingMaterialBatches?.args?.[1]??generation))throw Error('Invalid generation');
  if(prepared){prepared.signal.throwIfAborted();const current=dataPreparationPending?dataPreparationPending.receipt:pendingMaterialBatches?pendingMaterialBatches.prepared:pendingGeometry?pendingGeometry.preparedData:residentPreparedData;if(current!==prepared)throw new DOMException('Superseded delegated preparation','AbortError');}
  invalidateMainFrame();contextRecoveryFailure=undefined;if(!components.length){clearResidentBatches(nextGeneration);map.triggerRepaint();return;}
  if(!prepared)throw Error('Delegated500 nonempty batches require prepared data');prepared.signal.throwIfAborted();if(prepared.city!==city||prepared.input.length!==components.length||!prepared.input.every((c,i)=>c===components[i]))throw Error('Prepared delegated input changed');
  const release=prepared.scope.retain(),replacingMaterial=!!pendingMaterialBatches,requestSequence=materialRequestSequence,preparationSequence=dataPreparationSequence,lifecycle=residentLifecycleRevision;cancelPendingMaterialBatches(undefined,true);if(destroyed||materialRequestSequence!==requestSequence||dataPreparationSequence!==preparationSequence||residentLifecycleRevision!==lifecycle||pendingMaterialBatches){release();throw new DOMException('Superseded delegated publication','AbortError');}if(pendingGeometry)discardGeometryCandidate(true,prepared.signal);else if(replacingMaterial||!programGrantHandoff.matches(prepared.signal))clearProgramGrantHandoff();try{prepared.signal.throwIfAborted();if(destroyed||materialRequestSequence!==requestSequence||dataPreparationSequence!==preparationSequence||residentLifecycleRevision!==lifecycle||pendingGeometry||pendingMaterialBatches)throw new DOMException('Superseded delegated publication','AbortError');}catch(error){release();throw error;}grantHandoffGeneration=nextGeneration;grantHandoffPreparationToken=undefined;
  const request:PendingMaterialBatches={revision:++materialRequestSequence,args:[components,nextGeneration,shadowAdmission,nativeDisplay,partialGatePlan,s402Plan,s434Plan,s036Plan,s240Plan,f151Plan,prepared],prepared,signal:prepared.signal,releaseScope:release,closed:false};pendingMaterialBatches=request;batchPreparationFailure=undefined;geometryUploadFailure=undefined;mainDrawFailure=undefined;clearDataPreparation(dataPreparationPending,false);
  const abort=()=>{if(pendingMaterialBatches===request){cancelPendingMaterialBatches('Aborted delegated preparation');map.triggerRepaint();}};prepared.signal.addEventListener('abort',abort,{once:true});request.abortCleanup=()=>prepared.signal.removeEventListener('abort',abort);if(prepared.signal.aborted)abort();pumpPendingMaterialBatches();map.triggerRepaint();
 }

}
