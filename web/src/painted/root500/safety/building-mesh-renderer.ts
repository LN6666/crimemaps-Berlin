import {createChunkAdmission} from '../../../safety/render-runtime/chunk-admission';
import {createResidentTriangleDrawBatch,residentTriangleGeometryKey} from '../../../safety/render-runtime/resident-index-convention';
import {createPaintProgramIdleRetirement} from '../../../safety/paint-program-idle-retirement';
import {partitionProgramFamilies} from '../../../safety/partition-program-groups';
import {BUILDING_SURFACE_FRAGMENT_GLSL} from './building-surface-style';
import {chunkUniforms,residentDrawRange,residentSpansInRange,surfaceUniforms} from '../../../safety/render-runtime/resident-draw-range';
import {retainReconstructionResourceParents,retainReconstructionPreparedInputs} from '../../../safety/reconstruction-resource-parents';
import {retainF154ReconstructionConstruction} from './owner-f154-reconstruction';
import {shaderSourceParts,emitShaderSource,type ShaderSourcePart} from '../../../safety/render-runtime/shader-source-budget';
import {shaderSourceBoundPart,describeShaderAssemblyBounds} from '../../../safety/render-runtime/shader-assembly-budget';
import type {PreparedSourceRecipe} from '../../../safety/prepared-source-contract';
import {appendContiguousRendererSpan,indexedResourceKey,rendererChunkGroups,coalesceRendererChunkGroups,rendererChunkPublicationCohorts,type RendererSourceGroup,type RendererChunkInput} from '../../../safety/renderer-chunk-input';
import {bindChunkResourceContext,ChunkResourceContextLostError} from '../../../safety/render-runtime/chunk-resource-store';
import type {ChunkResourceLease} from '../../../safety/render-runtime/chunk-resource-types';
import {retainChunkInput,acquirePackedMeshChunk,completeChunkSourceRows,visibleChunkDisplayKeys,orderVisibleChunkRows,retainChunkMaskBinding,type PackedMeshChunk,type PreparedChunkReceipt,type RetainedChunkInput} from './chunk-mesh-packing';
import {acquireChunkMeshState,allocateChunkMeshView,chunkMeshViewKey} from './chunk-mesh-residency';
import {rathausCoincidentWallFragmentMasks} from './facade-rathaus-display-masks';
import {adjacentViewportPublicationSignal} from '../../../safety/viewport-request';
import {createProgramGrantHandoff} from '../../../safety/render-runtime/program-grant-handoff';
import {copyBuildingComponentReadback,copyBuildingComponentMetadata} from '../../../safety/component-readback';
import type {CaptureDemandChange} from '../../../safety/capture-resource-demand';
import type {PlanarReflectionPreparationResult} from '../../../safety/planar-building-reflection';
import {progressiveRenderView as readRoot500ProgressiveRenderView} from './progressive-paint';
import {retireOwnerReconstructionConstruction} from './owner-reconstruction';
import {isProgressivelyPainted as readRoot500ProgressivelyPainted} from './progressive-paint';
import {createResidentGeometryOwner,type ResidentGeometryLease} from '../../../safety/render-runtime/resident-geometry';
import type {ResidentDrawReadiness} from '../../../safety/resident-draw-readiness';
import {createRoot500PreparedProgramPlan} from './root500-prepared-program-plan';
import {createFrozenDataScope,type FrozenDataScope} from '../../../safety/frozen-data-scope';
import type {FrozenDataClient} from '../../../safety/frozen-data-lease-store';
import {ProgramPreparationPending} from '../../../safety/render-runtime/program-preparation';
import {prepareOwnerRecoveredSourceComponents,prepareOwnerReconstructionMaterials,prepareOwnerReconstructionModules} from './owner-reconstruction';
import {prepareRoot500ProgressiveData,prepareRoot500MaterialData} from './progressive-paint';
import {prepareRoot500DerivedDisplays} from './root500-derived-display-data';
import * as root500DataModule0 from './indexed-pick-blocks70';
import * as root500DataModule1 from './be-tv-base-westfold70';
import * as root500DataModule2 from './be-tv-base-material70';
import * as root500DataModule3 from './be-tv-base-parent-material51';
import * as root500DataModule4 from './be-tv-base-repair';
import * as root500DataModule5 from './tv-base-repair-program';
import * as root500DataModule6 from './f058-upper-paint312';
import * as root500DataModule7 from './owner-shader-prune';
import * as root500DataModule8 from './f061-main-paint6370';
import * as root500DataModule9 from './f061-source-recovery-paint279';
import * as root500DataModule10 from './f063-source-recovery-paint272';
import * as root500DataModule11 from './f071-north-court-paint6438';
import * as root500DataModule12 from './f071-full-paint6374';
import * as root500DataModule13 from './f260-source-recovery-paint264';
import * as root500DataModule14 from './f260-canopy-recovery267';
import * as root500DataModule15 from './owner-display-budget';
import * as root500DataModule16 from './progressive-native-signature';
import * as root500DataModule17 from './owner-reconstruction';
import * as root500DataModule18 from './owner-f068-derived-display';
import * as root500DataModule19 from './owner-f075-derived-display';
import * as root500DataModule20 from './owner-f107-derived-display';
import * as root500DataModule21 from './owner-f082-derived-display';
import * as root500DataModule22 from './paint-run-visibility';
import * as root500DataModule23 from './f151-crown-display';
import * as root500DataModule24 from './s240-base-coface-display';
import * as root500DataModule25 from './owner-f018-completion';
import * as root500DataModule26 from './s036-north-coface-display';
import * as root500DataModule27 from './s402-connector-display';
import * as root500DataModule28 from './s196-arch-display';
import * as root500DataModule29 from './source-role-display';
import * as root500DataModule30 from './s434-aggregate-display';
import * as root500DataModule31 from './s434-owner138-compat';
import * as root500DataModule32 from './source-partial-gate-gpu-diagnostic';
import * as root500DataModule33 from './source-partial-gate-display';
import * as root500DataModule34 from './native-source-readback';
import * as root500DataModule35 from './progressive-paint';
import * as root500DataModule36 from './facade-rathaus-proxy-mask';
import * as root500DataModule37 from './facade-description-bindings';
import * as root500DataModule38 from './facade-layouts';
import * as root500DataModule39 from './facade-paint-frame';
import * as root500DataModule40 from './facade-paint-fragment';
import * as root500DataModule41 from './facade-paint-controls';
import * as root500DataModule42 from './source-glass-roof-style';
import * as root500DataModule43 from './source-part-display';
import * as root500DataModule44 from './facade-landmark-registry';
import * as root500DataModule45 from './source-shadow';
const createIndexedPickBlocks70=importedRoot500_createIndexedPickBlocks70;
const indexedPickBlockHit70=importedRoot500_indexedPickBlockHit70;
const applyBETVBaseWestFold70=importedRoot500_applyBETVBaseWestFold70;
const beTVBaseWestFold70Transaction=importedRoot500_beTVBaseWestFold70Transaction;
const beTVBaseWestFold70BaseRows=importedRoot500_beTVBaseWestFold70BaseRows;
const beTVBaseWestFold70ShadowAdmission=importedRoot500_beTVBaseWestFold70ShadowAdmission;
const applyBETVBaseMaterial70=importedRoot500_applyBETVBaseMaterial70;
const applyBETVBaseRepairParentMaterial51=importedRoot500_applyBETVBaseRepairParentMaterial51;
const applyBETVBaseRepair1=importedRoot500_applyBETVBaseRepair1;
const beTVBaseRepairPlan1=importedRoot500_beTVBaseRepairPlan1;
const beTVBaseRepairDrawAlias1=importedRoot500_beTVBaseRepairDrawAlias1;
const beTVBaseRepairBatchIncluded1=importedRoot500_beTVBaseRepairBatchIncluded1;
const beTVBaseRepairShadowAdmission1=importedRoot500_beTVBaseRepairShadowAdmission1;
const beTVBaseRepairIdentity1=importedRoot500_beTVBaseRepairIdentity1;
const tvBaseRepairProgramReady1=importedRoot500_tvBaseRepairProgramReady1;
const applyF058Upper312=importedRoot500_applyF058Upper312;
const pruneOwner6307Fragment=importedRoot500_pruneOwner6307Fragment;
const applyF061Main6370=importedRoot500_applyF061Main6370;
const applyF061RecoveryPaint279=importedRoot500_applyF061RecoveryPaint279;
const applyF063RecoveryPaint272=importedRoot500_applyF063RecoveryPaint272;
const applyF071NorthCourt6438=importedRoot500_applyF071NorthCourt6438;
const applyF071Full6374=importedRoot500_applyF071Full6374;
const applyF260RecoveryPaint264=importedRoot500_applyF260RecoveryPaint264;
const f260CanopyDisplay267=importedRoot500_f260CanopyDisplay267;
const applyF260CanopyPaint267=importedRoot500_applyF260CanopyPaint267;
const fitOwnerDisplayBudget=importedRoot500_fitOwnerDisplayBudget;
const sourceBoundsContainFocus=importedRoot500_sourceBoundsContainFocus;
const nativePaintSignature=importedRoot500_nativePaintSignature;
const ownerRecoveredSourceComponents=importedRoot500_ownerRecoveredSourceComponents;
const ownerReconstructionComponents=importedRoot500_ownerReconstructionComponents;
const prepareOwnerReconstructionComponents=importedRoot500_prepareOwnerReconstructionComponents;
const ownerReconstructionBaseMaterials=importedRoot500_ownerReconstructionBaseMaterials;
const ownerReconstructionIdentity=importedRoot500_ownerReconstructionIdentity;
const appendF068DerivedDisplay=importedRoot500_appendF068DerivedDisplay;
const isF068DerivedDisplayIdentity=importedRoot500_isF068DerivedDisplayIdentity;
const applyF068DerivedDisplayMaterials=importedRoot500_applyF068DerivedDisplayMaterials;
const serializeF068DerivedReadback=importedRoot500_serializeF068DerivedReadback;
const appendF075DerivedDisplay=importedRoot500_appendF075DerivedDisplay;
const isF075DerivedDisplayIdentity=importedRoot500_isF075DerivedDisplayIdentity;
const applyF075DerivedDisplayMaterials=importedRoot500_applyF075DerivedDisplayMaterials;
const serializeF075DerivedReadback=importedRoot500_serializeF075DerivedReadback;
const appendF107DerivedDisplay=importedRoot500_appendF107DerivedDisplay;
const isF107DerivedDisplayIdentity=importedRoot500_isF107DerivedDisplayIdentity;
const applyF107DerivedDisplayMaterials=importedRoot500_applyF107DerivedDisplayMaterials;
const serializeF107DerivedReadback=importedRoot500_serializeF107DerivedReadback;
const appendF082DerivedDisplay=importedRoot500_appendF082DerivedDisplay;
const isF082DerivedDisplayIdentity=importedRoot500_isF082DerivedDisplayIdentity;
const applyF082DerivedDisplayMaterials=importedRoot500_applyF082DerivedDisplayMaterials;
const serializeF082DerivedReadback=importedRoot500_serializeF082DerivedReadback;
const paintBoxOutsideClip=importedRoot500_paintBoxOutsideClip;
const paintRunIntersectsVisible=importedRoot500_paintRunIntersectsVisible;
const applyF151CrownMask=importedRoot500_applyF151CrownMask;
const f151CrownPickDiscard=importedRoot500_f151CrownPickDiscard;
const applyS240BaseCoface=importedRoot500_applyS240BaseCoface;
const applyF018S036Compatibility=importedRoot500_applyF018S036Compatibility;
const applyS036NorthCoface=importedRoot500_applyS036NorthCoface;
const s036Roof009PickDiscard=importedRoot500_s036Roof009PickDiscard;
const applyS402ConnectorMask=importedRoot500_applyS402ConnectorMask;
const s402ConnectorPickDiscard=importedRoot500_s402ConnectorPickDiscard;
const s196ArchShadowSubset=importedRoot500_s196ArchShadowSubset;
const sourceRoleBatchIncluded=importedRoot500_sourceRoleBatchIncluded;
const sourceRoleDisplayProfile=importedRoot500_sourceRoleDisplayProfile;
const s434AggregateBatchIncluded=importedRoot500_s434AggregateBatchIncluded;
const checkS434Owner138Replacement=importedRoot500_checkS434Owner138Replacement;
const readPaintGPUBufferDiagnostic=importedRoot500_readPaintGPUBufferDiagnostic;
const applyPartialGateMask=importedRoot500_applyPartialGateMask;
const partialGatePickDiscard=importedRoot500_partialGatePickDiscard;
const createNativeSourceReadback=importedRoot500_createNativeSourceReadback;
const progressiveAdmission=importedRoot500_progressiveAdmission;
const progressivePaintRejections=importedRoot500_progressivePaintRejections;
const progressivePaintData=importedRoot500_progressivePaintData;
const progressivePaintCount=importedRoot500_progressivePaintCount;
const progressiveRenderStatus=importedRoot500_progressiveRenderStatus;
const progressivePaintFingerprints=importedRoot500_progressivePaintFingerprints;
const createRathausProxyMasks=importedRoot500_createRathausProxyMasks;
const isDescribedBuilding=importedRoot500_isDescribedBuilding;
const uploadFacadeLayouts=importedRoot500_uploadFacadeLayouts;
const facadePaintData=importedRoot500_facadePaintData;
const facadePaintFragmentForCity=importedRoot500_facadePaintFragmentForCity;
const facadePaintSpecializationForCity=importedRoot500_facadePaintSpecializationForCity;
const paintProgramPartitionEnabled=importedRoot500_paintProgramPartitionEnabled;
const paintProgramKey=importedRoot500_paintProgramKey;
const paintProgramFragment=importedRoot500_paintProgramFragment;
const genericBerlinOwnerExclusionCertified=importedRoot500_genericBerlinOwnerExclusionCertified;
const genericDusseldorfProgramCertified=importedRoot500_genericDusseldorfProgramCertified;
const paintMode=importedRoot500_paintMode;
const paintOverride=importedRoot500_paintOverride;
const isSourceOnlyGlassRoof=importedRoot500_isSourceOnlyGlassRoof;
const exactNativePartDisplay=importedRoot500_exactNativePartDisplay;
const isFacadeLandmark=importedRoot500_isFacadeLandmark;
const sourceShadowOpacity=importedRoot500_sourceShadowOpacity;
type Root500ScopedValue<T>=T;
const root500RendererDataArities=new Map<Function,number>();
for(const exported of [root500DataModule0,root500DataModule1,root500DataModule2,root500DataModule3,root500DataModule4,root500DataModule5,root500DataModule6,root500DataModule7,root500DataModule8,root500DataModule9,root500DataModule10,root500DataModule11,root500DataModule12,root500DataModule13,root500DataModule14,root500DataModule15,root500DataModule16,root500DataModule17,root500DataModule18,root500DataModule19,root500DataModule20,root500DataModule21,root500DataModule22,root500DataModule23,root500DataModule24,root500DataModule25,root500DataModule26,root500DataModule27,root500DataModule28,root500DataModule29,root500DataModule30,root500DataModule31,root500DataModule32,root500DataModule33,root500DataModule34,root500DataModule35,root500DataModule36,root500DataModule37,root500DataModule38,root500DataModule39,root500DataModule40,root500DataModule41,root500DataModule42,root500DataModule43,root500DataModule44,root500DataModule45]){const module=exported as unknown as Record<string,unknown>,arities=module.root500DataFunctionArities as Record<string,number>|undefined;if(arities)for(const [name,arity]of Object.entries(arities)){const fn=module[name];if(typeof fn==='function')root500RendererDataArities.set(fn,arity);}}
for(const [fn,arity]of [[importedRoot500_ownerRecoveredSourceComponents,1],[importedRoot500_ownerReconstructionComponents,1],[importedRoot500_ownerReconstructionIdentity,1],[importedRoot500_ownerReconstructionBaseMaterials,3]]as const)root500RendererDataArities.set(fn,arity);
import {createProgramPreparationOwner,createProgramSourceAuthority,isProgramPreparationPending,type ProgramPreparationRecipe,ProgramPreparationFailure} from '../../../safety/render-runtime/program-preparation';
import {createResidentCaptureRuntime,createResidentCaptureOwnership,type ResidentCaptureAdapter,type ResidentCaptureChunk} from '../../../safety/render-runtime/resident-capture';
import {createSolarShadowPreparationBudget,solarShadowPreparation,prepareSolarShadowResources,type SolarShadowPreparationResult,type SolarShadowPreparationBudget} from '../../../safety/solar-shadow-preparation';
import {withSceneSolarShadowReceiver} from '../../../safety/scene-solar-shadow';
import {guardCustomLayerRender} from '../../../safety/custom-layer-render-error';
import type {OwnerInitializationWait} from './lazy-owner-route';
import {createProjectedShadowMask} from '../../../safety/projected-shadow-mask';
import {residentSolarShadowCoverage,planResidentReflectionChunks,withResidentReflectionClip,residentReflectionClipPlane,createResidentReflectionUniforms,planResidentReflection,createResidentReflectionObjects,type ResidentPlanarReflectionPass,type ResidentPlanarReflectionResult} from '../../../safety/resident-planar-reflection';
import {createResidentGPULifecycle} from '../../../safety/resident-gpu-lifecycle';
import {sceneSolarLight,SCENE_SHADOW_MIN_ALTITUDE_DEGREES} from '../../../safety/scene-solar-light';
import {SCENE_SURFACE_LIGHT_GLSL,createSceneLightUniforms} from '../../../safety/scene-surface-light';
import {defaultSceneEnvironment,checkedSceneEnvironment,type SceneEnvironmentState} from '../../../safety/scene-environment-state';
import {prepareSolarShadowBoundary,residentSolarShadowRanges,type PreparedSolarBoundary,type SolarShadowBoundary} from '../../../safety/solar-shadow-admission';
import {createIndexedPickBlocks70 as importedRoot500_createIndexedPickBlocks70,indexedPickBlockHit70 as importedRoot500_indexedPickBlockHit70,INDEXED_PICK_BLOCK_TRIANGLES70} from './indexed-pick-blocks70';
import {applyBETVBaseWestFold70 as importedRoot500_applyBETVBaseWestFold70,beTVBaseWestFold70Transaction as importedRoot500_beTVBaseWestFold70Transaction,beTVBaseWestFold70BaseRows as importedRoot500_beTVBaseWestFold70BaseRows,beTVBaseWestFold70ShadowAdmission as importedRoot500_beTVBaseWestFold70ShadowAdmission} from './be-tv-base-westfold70';
import {OWNER_SHAPE_PATCH_PROFILES} from './owner-shape-patch-profiles';
import {applyBETVBaseMaterial70 as importedRoot500_applyBETVBaseMaterial70} from './be-tv-base-material70';
import {applyBETVBaseRepairParentMaterial51 as importedRoot500_applyBETVBaseRepairParentMaterial51} from './be-tv-base-parent-material51';
import {applyBETVBaseRepair1 as importedRoot500_applyBETVBaseRepair1,beTVBaseRepairPlan1 as importedRoot500_beTVBaseRepairPlan1,beTVBaseRepairDrawAlias1 as importedRoot500_beTVBaseRepairDrawAlias1,beTVBaseRepairBatchIncluded1 as importedRoot500_beTVBaseRepairBatchIncluded1,beTVBaseRepairShadowAdmission1 as importedRoot500_beTVBaseRepairShadowAdmission1,beTVBaseRepairIdentity1 as importedRoot500_beTVBaseRepairIdentity1,type BETVBaseRepairPlan1} from './be-tv-base-repair';
import {TV_BASE_REPAIR_PROGRAM_KEY,tvBaseRepairProgramReady1 as importedRoot500_tvBaseRepairProgramReady1} from './tv-base-repair-program';
import {acceptPaintComponent} from '../../../safety/paint-ownership';
import {applyF058Upper312 as importedRoot500_applyF058Upper312} from './f058-upper-paint312';
import {pruneOwner6307Fragment as importedRoot500_pruneOwner6307Fragment} from './owner-shader-prune';
import {applyF061Main6370 as importedRoot500_applyF061Main6370} from './f061-main-paint6370';
import {applyF061RecoveryPaint279 as importedRoot500_applyF061RecoveryPaint279} from './f061-source-recovery-paint279';
import {applyF063RecoveryPaint272 as importedRoot500_applyF063RecoveryPaint272} from './f063-source-recovery-paint272';
import {applyF071NorthCourt6438 as importedRoot500_applyF071NorthCourt6438} from './f071-north-court-paint6438';
import {applyF071Full6374 as importedRoot500_applyF071Full6374} from './f071-full-paint6374';
import {applyF260RecoveryPaint264 as importedRoot500_applyF260RecoveryPaint264} from './f260-source-recovery-paint264';
import {f260CanopyDisplay267 as importedRoot500_f260CanopyDisplay267,applyF260CanopyPaint267 as importedRoot500_applyF260CanopyPaint267} from './f260-canopy-recovery267';
import {fitOwnerDisplayBudget as importedRoot500_fitOwnerDisplayBudget,sourceBoundsContainFocus as importedRoot500_sourceBoundsContainFocus,type OwnerDisplayBudgetDiagnostic} from './owner-display-budget';
import {FROZEN_PAINT_IDS} from './frozen-paint-ids';
import {nativePaintSignature as importedRoot500_nativePaintSignature} from './progressive-native-signature';
import {ownerRecoveredSourceComponents as importedRoot500_ownerRecoveredSourceComponents,ownerReconstructionComponents as importedRoot500_ownerReconstructionComponents,prepareOwnerReconstructionComponents as importedRoot500_prepareOwnerReconstructionComponents,ownerReconstructionBaseMaterials as importedRoot500_ownerReconstructionBaseMaterials,ownerReconstructionIdentity as importedRoot500_ownerReconstructionIdentity,type OwnerReconstructionStats} from './owner-reconstruction';
import {appendF068DerivedDisplay as importedRoot500_appendF068DerivedDisplay,isF068DerivedDisplayIdentity as importedRoot500_isF068DerivedDisplayIdentity,applyF068DerivedDisplayMaterials as importedRoot500_applyF068DerivedDisplayMaterials,serializeF068DerivedReadback as importedRoot500_serializeF068DerivedReadback,type F068DerivedAdmission} from './owner-f068-derived-display';
import {appendF075DerivedDisplay as importedRoot500_appendF075DerivedDisplay,isF075DerivedDisplayIdentity as importedRoot500_isF075DerivedDisplayIdentity,applyF075DerivedDisplayMaterials as importedRoot500_applyF075DerivedDisplayMaterials,serializeF075DerivedReadback as importedRoot500_serializeF075DerivedReadback} from './owner-f075-derived-display';
import {appendF107DerivedDisplay as importedRoot500_appendF107DerivedDisplay,isF107DerivedDisplayIdentity as importedRoot500_isF107DerivedDisplayIdentity,applyF107DerivedDisplayMaterials as importedRoot500_applyF107DerivedDisplayMaterials,serializeF107DerivedReadback as importedRoot500_serializeF107DerivedReadback} from './owner-f107-derived-display';
import {appendF082DerivedDisplay as importedRoot500_appendF082DerivedDisplay,isF082DerivedDisplayIdentity as importedRoot500_isF082DerivedDisplayIdentity,applyF082DerivedDisplayMaterials as importedRoot500_applyF082DerivedDisplayMaterials,serializeF082DerivedReadback as importedRoot500_serializeF082DerivedReadback} from './owner-f082-derived-display';
import {paintBoxOutsideClip as importedRoot500_paintBoxOutsideClip,paintRunIntersectsVisible as importedRoot500_paintRunIntersectsVisible} from './paint-run-visibility';
import {readPaintVisibility,forgetPaintVisibility} from '../../delegated500/safety/paint-run-visibility';
import {familyPaintRuns,familyPaintRecipe,familyPaintRecipeKey,overriddenFamilyPaintKey,trimInactivePaintPrograms,type FamilyPaintRun} from '../../../safety/family-paint-program';
import {applyF151CrownMask as importedRoot500_applyF151CrownMask,f151CrownPickDiscard as importedRoot500_f151CrownPickDiscard,type F151CrownPlan} from './f151-crown-display';
import {applyS240BaseCoface as importedRoot500_applyS240BaseCoface,type S240BasePlan} from './s240-base-coface-display';
import {applyF018S036Compatibility as importedRoot500_applyF018S036Compatibility} from './owner-f018-completion';
import {applyS036NorthCoface as importedRoot500_applyS036NorthCoface,s036Roof009PickDiscard as importedRoot500_s036Roof009PickDiscard,S036_ROOF009_MASK_GLSL,type S036NorthPlan} from './s036-north-coface-display';
import {applyS402ConnectorMask as importedRoot500_applyS402ConnectorMask,s402ConnectorPickDiscard as importedRoot500_s402ConnectorPickDiscard,S402_CONNECTOR_MASK_GLSL,type S402Plan} from './s402-connector-display';
import {s196ArchShadowSubset as importedRoot500_s196ArchShadowSubset} from './s196-arch-display';
import {sourceRoleBatchIncluded as importedRoot500_sourceRoleBatchIncluded,sourceRoleDisplayProfile as importedRoot500_sourceRoleDisplayProfile} from './source-role-display';
import {s434AggregateBatchIncluded as importedRoot500_s434AggregateBatchIncluded,type S434AggregateProfile} from './s434-aggregate-display';
import type {S434AggregatePackingState} from './s434-aggregate-lifecycle';
import {checkS434Owner138Replacement as importedRoot500_checkS434Owner138Replacement} from './s434-owner138-compat';
import {readPaintGPUDiagnostic as importedRoot500_readPaintGPUBufferDiagnostic} from './source-partial-gate-gpu-diagnostic';
import {applyPartialGateMask as importedRoot500_applyPartialGateMask,partialGatePickDiscard as importedRoot500_partialGatePickDiscard,PARTIAL_GATE_MASK_GLSL,type PartialGatePlan} from './source-partial-gate-display';
import {createNativeSourceReadback as importedRoot500_createNativeSourceReadback} from './native-source-readback';
import {progressiveAdmission as importedRoot500_progressiveAdmission,progressivePaintRejections as importedRoot500_progressivePaintRejections,progressivePaintData as importedRoot500_progressivePaintData,progressivePaintCount as importedRoot500_progressivePaintCount,progressiveRenderStatus as importedRoot500_progressiveRenderStatus,progressivePaintFingerprints as importedRoot500_progressivePaintFingerprints} from './progressive-paint';
import {createRathausProxyMasks as importedRoot500_createRathausProxyMasks,RATHAUS_PROXY_MASK_GLSL} from './facade-rathaus-proxy-mask';
import {DESCRIPTION_BINDINGS,isDescribedBuilding as importedRoot500_isDescribedBuilding} from './facade-description-bindings';
import {FACADE_OPENING_GLSL} from './facade-opening-primitives';
import {FACADE_LAYOUT_GLSL,uploadFacadeLayouts as importedRoot500_uploadFacadeLayouts} from './facade-layouts';
import {facadePaintData as importedRoot500_facadePaintData} from './facade-paint-frame';
import {facadePaintFragmentForCity as importedRoot500_facadePaintFragmentForCity,facadePaintSpecializationForCity as importedRoot500_facadePaintSpecializationForCity,paintProgramPartitionEnabled as importedRoot500_paintProgramPartitionEnabled,paintProgramKey as importedRoot500_paintProgramKey,paintProgramFragment as importedRoot500_paintProgramFragment,genericBerlinOwnerExclusionCertified as importedRoot500_genericBerlinOwnerExclusionCertified,genericDusseldorfProgramCertified as importedRoot500_genericDusseldorfProgramCertified} from './facade-paint-fragment';
import {paintMode as importedRoot500_paintMode,paintOverride as importedRoot500_paintOverride} from './facade-paint-controls';
import {isSourceOnlyGlassRoof as importedRoot500_isSourceOnlyGlassRoof} from './source-glass-roof-style';
import type {NativeGroupDisplayPlan} from './native-part-display';
import {exactNativePartDisplay as importedRoot500_exactNativePartDisplay} from './source-part-display';
import {isFacadeLandmark as importedRoot500_isFacadeLandmark} from './facade-landmark-registry';
import type {createOpenFacadeDiffuse} from './open-facade-diffuse';
import type {createOpenFacadeWindowTexture} from './open-facade-window-texture';
import {SOURCE_SHADOW_VECTOR,sourceShadowOpacity as importedRoot500_sourceShadowOpacity} from './source-shadow';
import {S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL} from './s402-connector-shadow';
/** Source-owned roof/wall meshes on the existing MapLibre WebGL2 context. No second map engine. */
export type ShadowBatchAdmission={verifiedBoundarySHA256:string;profile:{schema_version:1;city:string;source_boundary_sha256:string;fixed_vector:readonly number[];swept_bbox_actual_city_covered:true;includes_growth_zero_to_one:true;status:'display-schematic'};components:readonly{objectId:string;partId:string;triangleCount:number}[]};
export type Identity={objectId:string;partId:string};
export type Polygon={type:'Polygon';coordinates:number[][][]};
export type SourceFeature={type:'Feature';geometry:unknown;properties:Record<string,unknown>|null;id?:unknown};
export type MeshBatch={positions:number[]|Float32Array;normals:number[]|Float32Array;indices:number[]|Uint32Array;color:number[]|Float32Array;faceRole?:'wall'|'roof'|'mixed';materialName?:string};
export type BuildingComponent=Identity&{city:string;origin:[number,number];componentGeometry:Polygon;sourceFeature:SourceFeature;batches:MeshBatch[];displayEstimates?:Record<string,unknown>};
export type NativeNearbySourceRow={city:string;objectId:string;partId:string;nativeSignature:string;sourceVertices:number;sourceTriangles:number;componentGeometryBBox:[number,number,number,number];distanceM:number;tags:Record<string,string|number|boolean>};
/** Read-only summaries of original resident source components; geographic polygon distance, never tile origin. */
export function summarizeNearbyNativeSources(sources:Iterable<BuildingComponent>,center:readonly[number,number],radiusM=150){
 const limit=150,rows:NativeNearbySourceRow[]=[],valid=center.length===2&&center.every(Number.isFinite)&&Math.abs(center[0])<=180&&Math.abs(center[1])<=90&&Number.isFinite(radiusM)&&radiusM>=0;let loadedSources=0,invalidGeometrySources=0;const result=(error?:string)=>({center:[...center],radiusM,limit,loadedSources,invalidGeometrySources,matchedSources:rows.length,returned:Math.min(rows.length,limit),truncated:rows.length>limit,rows:rows.slice(0,limit),...(error?{error}:{})});if(!valid)return result('Invalid geographic center or radius');
 const R=6378137,rad=Math.PI/180,sx=R*rad*Math.cos(center[1]*rad),sy=R*rad,keys=['name','building','building:part','building:levels','height','min_height','roof:height','roof:shape']as const;
 const inside=(ring:number[][])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>0)!==(b[1]>0)&&0<(b[0]-a[0])*(-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 for(const c of sources){loadedSources++;const g=c.componentGeometry;if(g?.type!=='Polygon'||!Array.isArray(g.coordinates)||!g.coordinates.length||g.coordinates.some(r=>!Array.isArray(r)||r.length<3||r.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>90))){invalidGeometrySources++;continue;}const bbox:[number,number,number,number]=[Infinity,Infinity,-Infinity,-Infinity],rings=g.coordinates.map(r=>r.map(p=>{bbox[0]=Math.min(bbox[0],p[0]);bbox[1]=Math.min(bbox[1],p[1]);bbox[2]=Math.max(bbox[2],p[0]);bbox[3]=Math.max(bbox[3],p[1]);const dl=((p[0]-center[0]+540)%360)-180;return[dl*sx,(p[1]-center[1])*sy];}));let distance=Infinity;
 for(const ring of rings)for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/len)):0;distance=Math.min(distance,Math.hypot(a[0]+t*dx,a[1]+t*dy));}if(inside(rings[0])&&!rings.slice(1).some(inside))distance=0;if(distance>radiusM)continue;
 const props=c.sourceFeature?.properties??{},tags:Record<string,string|number|boolean>={};for(const k of keys){const v=props[k];if(typeof v==='string')tags[k]=v.slice(0,256);else if(typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')tags[k]=v as number|boolean;}
 rows.push({city:c.city,objectId:c.objectId,partId:c.partId,nativeSignature:nativePaintSignature(c),sourceVertices:c.batches.reduce((n,b)=>n+b.positions.length/3,0),sourceTriangles:c.batches.reduce((n,b)=>n+b.indices.length/3,0),componentGeometryBBox:bbox,distanceM:Math.round(distance*100)/100,tags});}
 rows.sort((a,b)=>a.distanceM-b.distanceM||a.objectId.localeCompare(b.objectId)||a.partId.localeCompare(b.partId));return result();
}

export type SurfaceHit=Identity&{generation:number;viewRevision:number;hitLngLat:[number,number];hitAltitudeM:number;surface:'roof'|'wall';distance:number;opacityContext:'normal'|'route-selection';surfaceOpacity:number;occludesGround:boolean};
export type MapSurface={getCenter?:()=>{lng:number;lat:number};getCanvas():HTMLCanvasElement;on(type:string,fn:()=>void):void;off(type:string,fn:()=>void):void;triggerRepaint():void};
const C=2*Math.PI*6378137,EPS=1e-9;
/** Preserve the exact failed commit step instead of a silent readiness wait. */
type Root500ProgramPlan=ReturnType<typeof createRoot500PreparedProgramPlan>;
let root500ProgramPlanSequence=0;
let chunkStateOwnerSequence=0;
type PreparedOwnerBatches=PreparedChunkReceipt<BuildingComponent>&{releaseReconstructionInputs?():void;scope:FrozenDataScope;signal?:AbortSignal;displayComponents:BuildingComponent[];input:readonly BuildingComponent[];visibleSourceKeys?:readonly string[];visibleDisplayKeys?:readonly string[];source:BuildingComponent[];sourceLoaded:Map<string,BuildingComponent>;originalSourceVertices:number;originalSourceIndices:number;reconstructed:ReturnType<typeof importedRoot500_ownerReconstructionComponents>};
function ownerCommitStep<T>(step:string,run:()=>T):T{try{return run();}catch(error){throw new Error('3D commit ['+step+']: '+String(error).slice(0,1000));}}
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
function validate(c:BuildingComponent,city:string){if(c.city!==city||!/^osm\/(?:node|way|relation)\/[1-9]\d*$/.test(c.objectId)||!c.partId||c.partId.length>256||c.sourceFeature?.type!=='Feature'||c.componentGeometry?.type!=='Polygon'||!c.componentGeometry.coordinates.length||!c.origin.every(Number.isFinite)||Math.abs(c.origin[0])>180||Math.abs(c.origin[1])>85)throw Error('Invalid source component');let positions=0;for(const ring of c.componentGeometry.coordinates){if(ring.length<4||ring[0][0]!==ring.at(-1)![0]||ring[0][1]!==ring.at(-1)![1])throw Error('Invalid source ring');for(const p of ring)if(++positions>20000||p.length<2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('Invalid source footprint');}for(const m of c.batches){if(!m.positions.length||m.positions.length%3||m.normals.length!==m.positions.length||m.indices.length%3||m.color.length!==3||!m.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!m.positions.every(v=>Number.isFinite(v)&&Math.abs(v)<=1e6)||!m.normals.every(Number.isFinite)||!m.indices.every(v=>Number.isSafeInteger(v)&&v>=0&&v<m.positions.length/3))throw Error('Invalid source mesh');for(let i=1;i<m.positions.length;i+=3)if(m.positions[i]<-0.001)throw Error('Below-ground mesh needs separate source review');}}
const VERTEX=`#version 300 es
in vec4 a_progressive_color;in vec4 a_paint_frame;in float a_paint_family;out vec4 v_paint_frame;flat out float v_paint_family;flat out float v_partial_gate_mask;uniform float u_paint_mode;in vec3 a_position;in vec3 a_normal;in vec3 a_color;in float a_selected;uniform mat4 u_matrix;uniform float u_style_scale;uniform float u_style_height_scale;uniform vec2 u_style_offset;out vec3 v_color;out vec3 v_normal;out vec3 v_local_position;out float v_growth;flat out float v_style;flat out float v_selected;void main(){float progressiveMaterialAlpha=mod(a_progressive_color.a,4.);float growth=mod(a_selected,2.);float selected=step(2.,mod(a_selected,4.));v_style=floor(a_selected/4.);v_partial_gate_mask=floor(a_progressive_color.a/4.);v_paint_frame=a_paint_frame;v_paint_frame.y*=growth;v_paint_family=a_paint_family;v_growth=growth;v_selected=selected;v_normal=normalize(vec3(a_normal.x,a_normal.y/max(growth,.005),a_normal.z));float light=.63+.37*max(0.,dot(v_normal,normalize(vec3(-.35,.8,.4))));float neutral=step(16.,mod(v_style,32.));vec3 paintBase=u_paint_mode>1.5&&progressiveMaterialAlpha>.5?a_progressive_color.rgb:a_color;vec3 neutralBase=mix(vec3(.94,.95,.97),vec3(1.,.99,.97),smoothstep(.25,.85,max(0.,v_normal.y)));v_color=(u_paint_mode<.5?neutralBase:u_paint_mode<1.5||abs(a_paint_family)<.5?mix(paintBase,neutralBase,neutral*(1.-step(1.5,u_paint_mode)*step(1.5,progressiveMaterialAlpha))):paintBase)*light;v_local_position=vec3(a_position.x*u_style_scale+u_style_offset.x,a_position.y*u_style_height_scale,a_position.z*u_style_scale+u_style_offset.y);gl_Position=u_matrix*vec4(a_position.x,a_position.y*growth,a_position.z,1.);}`;
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
void main(){gl_FragDepth=gl_FragCoord.z;if(u_paint_mode>1.5&&v_paint_family>=4911.&&v_paint_family<=4926.)gl_FragDepth=max(0.,gl_FragCoord.z-0.0000001);if(v_growth<.005)discard;if(u_paint_mode>1.5&&v_partial_gate_mask>6.5&&v_partial_gate_mask<7.5)discard;if(u_s182_mask_diagnostic>.5&&v_partial_gate_mask>1.5&&v_partial_gate_mask<2.5){bool debugInside=s182CoveredGateRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005)));color=debugInside?vec4(1.,0.,0.,1.):vec4(0.,.2,1.,1.);return;}if(u_paint_mode>1.5&&((v_partial_gate_mask>.5&&v_partial_gate_mask<1.5)||(v_partial_gate_mask>1.5&&v_partial_gate_mask<2.5&&s182CoveredGateRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))))discard;if(u_paint_mode>1.5&&((v_partial_gate_mask>3.5&&v_partial_gate_mask<4.5)||(v_partial_gate_mask>4.5&&v_partial_gate_mask<5.5&&s402ConnectorRoof(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))))discard;if(u_paint_mode>1.5&&v_partial_gate_mask>5.5&&v_partial_gate_mask<6.5&&s036Roof009(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005))))discard;float semanticFamily=v_paint_family>=1000000.?floor(v_paint_family/10000.):v_paint_family;if(u_paint_mode>1.5&&v_paint_family>=1000000.&&nrCoveredProxyFragment(vec2(v_paint_frame.x,v_paint_frame.y/max(v_growth,.005)),v_paint_family))discard;vec3 styled=v_color;if(u_paint_mode>1.5){float paintLight=.63+.37*max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));styled=(semanticFamily>=1000.&&u_progressive_features<.5?v_color/max(paintLight,.01):paintedFacade(v_color/max(paintLight,.01),v_local_position,((semanticFamily>=1000.||(semanticFamily>=120.&&semanticFamily<=123.)||semanticFamily==129.||semanticFamily==171.||(semanticFamily>=180.&&semanticFamily<=211.)||(semanticFamily>=220.&&semanticFamily<=233.)||(semanticFamily>=140.&&semanticFamily<=149.)||(semanticFamily>=150.&&semanticFamily<170.)||(semanticFamily>=134.&&semanticFamily<=139.))?normalize(v_normal):(v_style>=32.||(v_paint_family!=107.||v_local_position.y>=70.)&&abs(cross(dFdx(v_local_position),dFdy(v_local_position)).y)>.001*max(length(cross(dFdx(v_local_position),dFdy(v_local_position))),.00001))?vec3(0.,1.,0.):normalize(v_normal)),v_paint_frame,abs(u_paint_override)>.01?u_paint_override:semanticFamily))*paintLight;}else if(u_paint_mode>.5&&step(16.,mod(v_style,32.))<.5&&!(v_style>=32.&&mod(v_style,8.)>6.5))styled=sourceFacade(v_color,v_local_position,normalize(v_normal),mod(v_style,8.),1.-step(8.,mod(v_style,16.)));float previousSceneLight=.63+.37*max(0.,dot(normalize(v_normal),normalize(vec3(-.35,.8,.4))));styled=sceneSurfaceLight(styled/max(previousSceneLight,.01),normalize(v_normal),v_local_position.y*v_growth);color=vec4(mix(styled,vec3(.98,.78,.3),v_selected*.65),u_opacity);}`;
const fragment=(helper:string,paintFragment:string)=>emitShaderSource(fragmentParts(helper,paintFragment));
/** Components must already be admitted against the exact municipal polygon by the source compiler. */
const COLOUR_PROGRAM_ATTRIBUTES=Object.freeze(['a_position','a_normal','a_color','a_selected','a_paint_frame','a_paint_family','a_progressive_color']);
const COLOUR_ASSEMBLY_AUTHORITY=createProgramSourceAuthority({inputs:['root500-colour-assembly-v2'],builders:[fragment,pruneOwner6307Fragment,withResidentReflectionClip]});
/** Context-free release of one packed chunk's auxiliary mask recipe. The packed
 * payload keeps this closure for its lifetime, so it retains only `aux`, never
 * the material pass's scope (components, paint, progressive, plans). */
const releaseAuxiliary=(aux:{readonly masks:{release():void};readonly releaseF154?:()=>void})=>()=>{try{aux.masks.release();}finally{aux.releaseF154?.();}};
/** One preparation pass's frame need. `ledger` counts compile attempts answered
 * with a page-ledger wait whose onAvailable wake the program owner holds (the
 * wake repaints); `other` records any other not-ready cause. A caller requests
 * a frame unless every cause was such a held wait. Optional owner calls keep a
 * fixture owner without budgetWaits/needsFrameAfter on the every-frame path. */
type PreparationWaits={ledger:number;other:boolean};
export function createBuildingMeshRenderer(map:MapSurface,city:string,{mobile=false,id='source-building-meshes',reducedMotion=false,clock=()=>performance.now(),surfaceStyle, surfaceFragment,baseSurfaceFragment,windowTexture,diffuseFragment,diffuseTexture,nativeLeaf,ownerPatchSHA,frozenData}:{frozenData?:FrozenDataClient;mobile?:boolean;id?:string;reducedMotion?:boolean;clock?:()=>number;surfaceStyle?:(p:Record<string,unknown>|null)=>{styleId:number};surfaceFragment?:string;baseSurfaceFragment?:string;windowTexture?:ReturnType<typeof createOpenFacadeWindowTexture>;diffuseFragment?:string;diffuseTexture?:ReturnType<typeof createOpenFacadeDiffuse>;nativeLeaf?:(c:BuildingComponent)=>string|undefined;ownerPatchSHA?:(c:BuildingComponent)=>string|undefined}={}){
 let residentScope:FrozenDataScope|undefined,committingScope:FrozenDataScope|undefined,transientResidentScope:FrozenDataScope|undefined;
 let residentChunkDependencies:RetainedChunkInput<BuildingComponent>|undefined;
 let residentProgressiveStatus:ReturnType<typeof readRoot500ProgressiveRenderView>=[];
 const generationScopePins=new Map<FrozenDataScope,()=>void>();
 function scopedCall(fn:(...args:any[])=>any,args:any[]){const arity=root500RendererDataArities.get(fn);if(arity===undefined)return fn(...args);const padded=args.slice(0,arity);while(padded.length<arity)padded.push(undefined);padded.push(committingScope??residentScope);return fn(...padded);}
 function scopedValue<T>(value:T):Root500ScopedValue<T>{return(typeof value==='function'?((...args:any[])=>scopedCall(value as (...args:any[])=>any,args)):value)as Root500ScopedValue<T>;}
 const createIndexedPickBlocks70=scopedValue(importedRoot500_createIndexedPickBlocks70);
 const indexedPickBlockHit70=scopedValue(importedRoot500_indexedPickBlockHit70);
 const applyBETVBaseWestFold70=scopedValue(importedRoot500_applyBETVBaseWestFold70);
 const beTVBaseWestFold70Transaction=scopedValue(importedRoot500_beTVBaseWestFold70Transaction);
 const beTVBaseWestFold70BaseRows=scopedValue(importedRoot500_beTVBaseWestFold70BaseRows);
 const beTVBaseWestFold70ShadowAdmission=scopedValue(importedRoot500_beTVBaseWestFold70ShadowAdmission);
 const applyBETVBaseMaterial70=scopedValue(importedRoot500_applyBETVBaseMaterial70);
 const applyBETVBaseRepairParentMaterial51=scopedValue(importedRoot500_applyBETVBaseRepairParentMaterial51);
 const applyBETVBaseRepair1=scopedValue(importedRoot500_applyBETVBaseRepair1);
 const beTVBaseRepairPlan1=scopedValue(importedRoot500_beTVBaseRepairPlan1);
 const beTVBaseRepairDrawAlias1=scopedValue(importedRoot500_beTVBaseRepairDrawAlias1);
 const beTVBaseRepairBatchIncluded1=scopedValue(importedRoot500_beTVBaseRepairBatchIncluded1);
 const beTVBaseRepairShadowAdmission1=scopedValue(importedRoot500_beTVBaseRepairShadowAdmission1);
 const beTVBaseRepairIdentity1=scopedValue(importedRoot500_beTVBaseRepairIdentity1);
 const tvBaseRepairProgramReady1=scopedValue(importedRoot500_tvBaseRepairProgramReady1);
 const applyF058Upper312=scopedValue(importedRoot500_applyF058Upper312);
 const pruneOwner6307Fragment=scopedValue(importedRoot500_pruneOwner6307Fragment);
 const applyF061Main6370=scopedValue(importedRoot500_applyF061Main6370);
 const applyF061RecoveryPaint279=scopedValue(importedRoot500_applyF061RecoveryPaint279);
 const applyF063RecoveryPaint272=scopedValue(importedRoot500_applyF063RecoveryPaint272);
 const applyF071NorthCourt6438=scopedValue(importedRoot500_applyF071NorthCourt6438);
 const applyF071Full6374=scopedValue(importedRoot500_applyF071Full6374);
 const applyF260RecoveryPaint264=scopedValue(importedRoot500_applyF260RecoveryPaint264);
 const f260CanopyDisplay267=scopedValue(importedRoot500_f260CanopyDisplay267);
 const applyF260CanopyPaint267=scopedValue(importedRoot500_applyF260CanopyPaint267);
 const fitOwnerDisplayBudget=scopedValue(importedRoot500_fitOwnerDisplayBudget);
 const sourceBoundsContainFocus=scopedValue(importedRoot500_sourceBoundsContainFocus);
 const nativePaintSignature=scopedValue(importedRoot500_nativePaintSignature);
 const ownerRecoveredSourceComponents=scopedValue(importedRoot500_ownerRecoveredSourceComponents);
 const ownerReconstructionComponents=scopedValue(importedRoot500_ownerReconstructionComponents);
 const prepareOwnerReconstructionComponents=scopedValue(importedRoot500_prepareOwnerReconstructionComponents);
 const ownerReconstructionBaseMaterials=scopedValue(importedRoot500_ownerReconstructionBaseMaterials);
 const ownerReconstructionIdentity=scopedValue(importedRoot500_ownerReconstructionIdentity);
 const appendF068DerivedDisplay=scopedValue(importedRoot500_appendF068DerivedDisplay);
 const isF068DerivedDisplayIdentity=scopedValue(importedRoot500_isF068DerivedDisplayIdentity);
 const applyF068DerivedDisplayMaterials=scopedValue(importedRoot500_applyF068DerivedDisplayMaterials);
 const serializeF068DerivedReadback=scopedValue(importedRoot500_serializeF068DerivedReadback);
 const appendF075DerivedDisplay=scopedValue(importedRoot500_appendF075DerivedDisplay);
 const isF075DerivedDisplayIdentity=scopedValue(importedRoot500_isF075DerivedDisplayIdentity);
 const applyF075DerivedDisplayMaterials=scopedValue(importedRoot500_applyF075DerivedDisplayMaterials);
 const serializeF075DerivedReadback=scopedValue(importedRoot500_serializeF075DerivedReadback);
 const appendF107DerivedDisplay=scopedValue(importedRoot500_appendF107DerivedDisplay);
 const isF107DerivedDisplayIdentity=scopedValue(importedRoot500_isF107DerivedDisplayIdentity);
 const applyF107DerivedDisplayMaterials=scopedValue(importedRoot500_applyF107DerivedDisplayMaterials);
 const serializeF107DerivedReadback=scopedValue(importedRoot500_serializeF107DerivedReadback);
 const appendF082DerivedDisplay=scopedValue(importedRoot500_appendF082DerivedDisplay);
 const isF082DerivedDisplayIdentity=scopedValue(importedRoot500_isF082DerivedDisplayIdentity);
 const applyF082DerivedDisplayMaterials=scopedValue(importedRoot500_applyF082DerivedDisplayMaterials);
 const serializeF082DerivedReadback=scopedValue(importedRoot500_serializeF082DerivedReadback);
 const paintBoxOutsideClip=scopedValue(importedRoot500_paintBoxOutsideClip);
 const paintRunIntersectsVisible=scopedValue(importedRoot500_paintRunIntersectsVisible);
 const applyF151CrownMask=scopedValue(importedRoot500_applyF151CrownMask);
 const f151CrownPickDiscard=scopedValue(importedRoot500_f151CrownPickDiscard);
 const applyS240BaseCoface=scopedValue(importedRoot500_applyS240BaseCoface);
 const applyF018S036Compatibility=scopedValue(importedRoot500_applyF018S036Compatibility);
 const applyS036NorthCoface=scopedValue(importedRoot500_applyS036NorthCoface);
 const s036Roof009PickDiscard=scopedValue(importedRoot500_s036Roof009PickDiscard);
 const applyS402ConnectorMask=scopedValue(importedRoot500_applyS402ConnectorMask);
 const s402ConnectorPickDiscard=scopedValue(importedRoot500_s402ConnectorPickDiscard);
 const s196ArchShadowSubset=scopedValue(importedRoot500_s196ArchShadowSubset);
 const sourceRoleBatchIncluded=scopedValue(importedRoot500_sourceRoleBatchIncluded);
 const sourceRoleDisplayProfile=scopedValue(importedRoot500_sourceRoleDisplayProfile);
 const s434AggregateBatchIncluded=scopedValue(importedRoot500_s434AggregateBatchIncluded);
 const checkS434Owner138Replacement=scopedValue(importedRoot500_checkS434Owner138Replacement);
 const readPaintGPUBufferDiagnostic=scopedValue(importedRoot500_readPaintGPUBufferDiagnostic);
 const applyPartialGateMask=scopedValue(importedRoot500_applyPartialGateMask);
 const partialGatePickDiscard=scopedValue(importedRoot500_partialGatePickDiscard);
 const createNativeSourceReadback=scopedValue(importedRoot500_createNativeSourceReadback);
 const progressiveAdmission=scopedValue(importedRoot500_progressiveAdmission);
 const progressivePaintRejections=scopedValue(importedRoot500_progressivePaintRejections);
 const progressivePaintData=scopedValue(importedRoot500_progressivePaintData);
 const progressivePaintCount=scopedValue(importedRoot500_progressivePaintCount);
 const progressiveRenderStatus=scopedValue(importedRoot500_progressiveRenderStatus);
 const progressivePaintFingerprints=scopedValue(importedRoot500_progressivePaintFingerprints);
 const createRathausProxyMasks=scopedValue(importedRoot500_createRathausProxyMasks);
 const isDescribedBuilding=scopedValue(importedRoot500_isDescribedBuilding);
 const uploadFacadeLayouts=scopedValue(importedRoot500_uploadFacadeLayouts);
 const facadePaintData=scopedValue(importedRoot500_facadePaintData);
 const facadePaintFragmentForCity=scopedValue(importedRoot500_facadePaintFragmentForCity);
 const facadePaintSpecializationForCity=scopedValue(importedRoot500_facadePaintSpecializationForCity);
 const paintProgramPartitionEnabled=scopedValue(importedRoot500_paintProgramPartitionEnabled);
 const paintProgramKey=scopedValue(importedRoot500_paintProgramKey);
 const paintProgramFragment=scopedValue(importedRoot500_paintProgramFragment);
 const genericBerlinOwnerExclusionCertified=scopedValue(importedRoot500_genericBerlinOwnerExclusionCertified);
 const genericDusseldorfProgramCertified=scopedValue(importedRoot500_genericDusseldorfProgramCertified);
 const paintMode=scopedValue(importedRoot500_paintMode);
 const paintOverride=scopedValue(importedRoot500_paintOverride);
 const isSourceOnlyGlassRoof=scopedValue(importedRoot500_isSourceOnlyGlassRoof);
 const exactNativePartDisplay=scopedValue(importedRoot500_exactNativePartDisplay);
 const isFacadeLandmark=scopedValue(importedRoot500_isFacadeLandmark);
 const sourceShadowOpacity=scopedValue(importedRoot500_sourceShadowOpacity);
 function packChunkMaterials(components:BuildingComponent[],plans:{scope:FrozenDataScope;repairReady?:boolean;partialGate?:PartialGatePlan;s402?:S402Plan;s036?:S036NorthPlan;s240?:S240BasePlan;f151?:F151CrownPlan;source?:BuildingComponent[];cohort?:readonly BuildingComponent[]},signal?:AbortSignal){
  const previousScope=committingScope;let keepF154=false,releaseF154:(()=>void)|undefined;let materialMasks:ReturnType<typeof createRathausProxyMasks>|undefined,materialRecipe:ReturnType<ReturnType<typeof createRathausProxyMasks>['cpuRecipe']>|undefined;committingScope=plans.scope;try{releaseF154=retainF154ReconstructionConstruction(plans.scope,components);
  const s036=signal&&plans.s036?.context?{...plans.s036,context:{...plans.s036.context,signal}}:plans.s036,s240=signal&&plans.s240?.context?{...plans.s240,context:{...plans.s240.context,signal}}:plans.s240,f151=signal&&plans.f151?.context?{...plans.f151,context:{...plans.f151.context,signal}}:plans.f151;
  const progressive=ownerCommitStep('progressive data',()=>progressivePaintData(components)),paint=ownerCommitStep('facade frames',()=>facadePaintData(components));
  const partialGate=applyPartialGateMask(components,progressive,paint,plans.partialGate),connector=applyS402ConnectorMask(components,progressive,paint,plans.s402),north=applyF018S036Compatibility(components,progressive,paint,s036,applyS036NorthCoface(components,progressive,paint,s036)),base=applyS240BaseCoface(components,progressive,paint,s240),crown=applyF151CrownMask(components,progressive,f151);
  ownerCommitStep('owner materials',()=>ownerReconstructionBaseMaterials(components,progressive,paint));
  applyF068DerivedDisplayMaterials(components,progressive,paint);applyF075DerivedDisplayMaterials(components,progressive,paint);applyF107DerivedDisplayMaterials(components,progressive,paint);applyF082DerivedDisplayMaterials(components,progressive,paint);
  applyF058Upper312(components,progressive,paint);applyF061RecoveryPaint279(components,progressive,paint);applyF061Main6370(components,progressive,paint);applyF063RecoveryPaint272(components,progressive,paint);applyF071Full6374(components,progressive,paint);applyF071NorthCourt6438(components,progressive,paint);applyF260RecoveryPaint264(components,progressive,paint);applyF260CanopyPaint267(components,progressive,paint);
  const maskOwner=createRathausProxyMasks();materialMasks=maskOwner;maskOwner.configure(components,paint,plans.cohort??components);const masks=maskOwner.cpuRecipe();materialRecipe=masks;maskOwner.destroy();
  const source=plans.source??[],repair=applyBETVBaseRepair1(components,progressive,paint,source,nativeLeaf,undefined,(plans.repairReady??false),[]);
  applyBETVBaseRepairParentMaterial51(components,progressive,paint,source,nativeLeaf,undefined,(plans.repairReady??false),[]);applyBETVBaseMaterial70(components,progressive,paint,source,nativeLeaf,undefined,(plans.repairReady??false),[]);applyBETVBaseWestFold70(components,progressive,paint,source,nativeLeaf,ownerPatchSHA,(plans.repairReady??false),OWNER_SHAPE_PATCH_PROFILES);
  const count=components.reduce((sum,c)=>sum+c.batches.reduce((n,b)=>n+b.positions.length/3,0),0);if(paint.length!==count*5||progressive.length!==count*4){masks.release();throw Error('Chunk material metadata count mismatch');}
  const identities=new Set(components.map(key)),progressiveStatus=Object.freeze(readRoot500ProgressiveRenderView(committingScope??residentScope).filter(row=>row.city===city&&identities.has(key(row))));
  const auxiliary={releaseF154,masks,partialGate,connector,north,base,crown,progressiveStatus,repair};keepF154=true;return{paint,progressive,auxiliary,release:releaseAuxiliary(auxiliary)};
  }catch(error){materialRecipe?.release();materialMasks?.destroy();throw error;}finally{if(!keepF154)releaseF154?.();committingScope=previousScope;}
 }
 type StreamPacked=PackedMeshChunk<BuildingComponent,ReturnType<typeof packChunkMaterials>['auxiliary']>;
 type StreamLoaded=BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number};
 type StreamPickBlocks=Omit<ReturnType<typeof createIndexedPickBlocks70>,'ranges'>&{ranges:Map<string,{offset:number;blocks:number}>};
 type StreamChunk={pick?:ChunkResourceLease<StreamPickBlocks>;masks?:ReturnType<ReturnType<typeof packChunkMaterials>['auxiliary']['masks']['createBinding']>;source:RendererSourceGroup<BuildingComponent>;cpu:ChunkResourceLease<StreamPacked>;state?:ChunkResourceLease<Float32Array>;loaded:Map<string,StreamLoaded>;geometry?:ResidentGeometryLease;shadow?:ResidentGeometryLease;shadowCPU?:ChunkResourceLease<Uint32Array>;shadowIndices:Uint32Array};
 type StreamSpan={chunk:StreamChunk;firstIndex:number;indexCount:number;localFirstIndex:number};
 let sceneChunks:StreamChunk[]=[],sceneSpans:StreamSpan[]=[],sceneChunkInput:RendererChunkInput<BuildingComponent>|undefined;
 const chunkStateOwner='root500:'+city+':'+(++chunkStateOwnerSequence);
 function publishStreamGeometry(context:WebGL2RenderingContext,target:WebGLProgram,chunks:readonly StreamChunk[],nextGeneration:number,current:()=>boolean,input=sceneChunkInput){
  const leases:ResidentGeometryLease[]=[],promoted:{chunk:StreamChunk;cpu:ChunkResourceLease<StreamPacked>;state:ChunkResourceLease<Float32Array>}[]=[];
  try{
   for(const chunk of chunks){if(!chunk.cpu.value||!chunk.state?.value)throw Error('Chunk geometry dependencies are not ready');const cpu=chunk.cpu.retain('main');try{promoted.push({chunk,cpu,state:chunk.state.retain('main')});}catch(error){cpu.release();throw error;}}
   for(const chunk of chunks){const contentKey=residentTriangleGeometryKey(context,chunkMeshViewKey(chunkStateOwner,chunk.cpu.contentKey)),existing=geometryOwner.currentLeases.find(lease=>lease.contentKey===contentKey&&lease.context===context&&lease.epoch===input?.store.contextEpoch(context)&&lease.value);
    leases.push(existing?existing.retain('candidate'):allocateChunkMeshView({context,program:target,owner:chunkStateOwner,source:chunk.cpu,state:chunk.state!,staticGeometry:staticGeometryOwner,geometry:geometryOwner,current}));
   }
   const cohorts=input?rendererChunkPublicationCohorts(input,chunks.map((chunk,index)=>({source:chunk.source,contentKey:leases[index].contentKey}))):undefined;
   if(!geometryOwner.publish(leases,{generation:nextGeneration,context,cohorts,current}))throw new DOMException('Chunk geometry publication superseded','AbortError');
   for(const value of promoted){const previousCPU=value.chunk.cpu,previousState=value.chunk.state;value.chunk.cpu=value.cpu;value.chunk.state=value.state;previousCPU.release();previousState?.release();value.chunk.geometry=geometryOwner.currentLeases.find(lease=>lease.contentKey===residentTriangleGeometryKey(context,chunkMeshViewKey(chunkStateOwner,value.cpu.contentKey)));}
   promoted.length=0;for(const chunk of chunks)if(chunk.pick){const held=chunk.pick.retain('main');chunk.pick.release();chunk.pick=held;}return geometryOwner.currentGeometries[0];
  }finally{for(const lease of leases)lease.release();for(const value of promoted){value.cpu.release();value.state.release();}}
 }
 function sceneIndexCount(){return sceneSpans.reduce((sum,span)=>sum+span.indexCount,0);}
 function chunkTypedBytes(field:'vertices'|'indices'|'paint'|'progressive'|'baseState'|'state'){return sceneChunks.reduce((sum,chunk)=>sum+((field==='state'?chunk.state?.value?.byteLength:chunk.cpu.value?.[field].byteLength)??0),0);}
 function chunkMaskBytes(kind:'allocatedGPUBytes'|'allocatedCPUBytes'){return sceneChunks.reduce((sum,chunk)=>sum+(chunk.masks?.stats[kind]??0),0);}
 function chunkPickStats(){return sceneChunks.reduce((sum,chunk)=>{const value=chunk.pick?.value;sum.blockCount+=value?.blockCount??0;sum.rangeCount+=value?.rangeCount??0;sum.typedBytes+=value?.typedBytes??0;return sum;},{blockTriangles:INDEXED_PICK_BLOCK_TRIANGLES70,blockCount:0,rangeCount:0,typedBytes:0});}
 function sceneVertexCount(){return sceneChunks.reduce((sum,chunk)=>sum+(chunk.cpu.value?.vertices.length??0)/9,0);}
 function localComponent(identity:Identity){for(const chunk of sceneChunks){const row=chunk.loaded.get(key(identity));if(row)return{chunk,row};}return undefined;}
 function releaseStreamChunks(chunks:readonly StreamChunk[]){for(const chunk of chunks){chunk.pick?.release();chunk.cpu.release();chunk.state?.release();chunk.shadowCPU?.release();chunk.masks?.destroy();chunk.masks=undefined;}}
 function acquireChunkPickBlocks(chunk:StreamChunk){const packed=chunk.cpu.value!;return sceneChunkInput!.store.acquire<StreamPickBlocks>({contentKey:JSON.stringify([packed.contentKey,'indexed-pick-blocks70-v1']),role:'candidate',parents:[chunk.cpu],estimate:[{category:'metadata',bytes:packed.rows.reduce((n,row)=>n+Math.ceil((row.end-row.start)/(INDEXED_PICK_BLOCK_TRIANGLES70*3))*6*8,0),precision:'exact'},{category:'metadata',bytes:packed.rows.length*128,precision:'estimate'}],produce(){const value=createIndexedPickBlocks70(packed.vertices,packed.indices,packed.rows,9);return{...value,ranges:new Map([...value.ranges].map(([row,range])=>[key(row.component),range]))};},costs:value=>[{category:'metadata',bytes:value.bounds.buffer.byteLength,precision:'exact',identity:value.bounds.buffer},{category:'metadata',bytes:value.ranges.size*128,precision:'estimate'}]});}
 function installChunkScene(chunks:StreamChunk[],components:readonly BuildingComponent[],nextGeneration:number){
  const visibleKeys=new Set(components.map(key));loaded=new Map();sceneSpans=[];partitionRuns=[];sceneChunks=chunks;
  if(chunks.length){const frame=chunks[0].source.frame;anchor=merc([frame.origin[0],frame.origin[1]]);anchorUnit=frame.unit;sceneSunOrigin=[frame.origin[0],frame.origin[1]];sceneSun=sceneSolarLight(...sceneSunOrigin,sceneSunInstant);if(!materialAnchor){materialAnchor=[...anchor];materialUnit=anchorUnit;}}
  const visibleStyles=new Set<number>();
  for(const chunk of chunks){const packed=chunk.cpu.value;if(!packed)throw Error('Packed group retired before scene assembly');chunk.masks??=retainChunkMaskBinding(packed.auxiliary.masks,components,chunkStateOwner);chunk.loaded=new Map(packed.rows.filter(row=>visibleKeys.has(key(row.component))).map(row=>[key(row.component),{...row.component,displayEstimates:{...row.component.displayEstimates,progressivePainted:row.progressivePainted},generation:nextGeneration,box:[...row.box],start:row.start,end:row.end,firstVertex:row.firstVertex,lastVertex:row.lastVertex}]));chunk.pick??=acquireChunkPickBlocks(chunk);if(!chunk.pick.value)throw Error('Chunk pick blocks not ready');for(const row of packed.rows)if(visibleKeys.has(key(row.component))&&isFacadeLandmark(row.component)&&!isSourceOnlyGlassRoof(row.component))for(let vertex=row.firstVertex;vertex<row.lastVertex;vertex++)visibleStyles.add(Math.floor(packed.baseState[vertex]/4));}
  let at=0,vertex=0;
  for(const component of components){const local=localComponent(component);if(!local)continue;const{chunk,row}=local,packed=chunk.cpu.value!,q=packed.anchor,ratio=anchorUnit/chunk.source.frame.unit,dx=(q[0]-anchor[0])*anchorUnit,dz=-(q[1]-anchor[1])*anchorUnit,count=row.end-row.start;
   loaded.set(key(component),{...row,box:row.box.map((value,i)=>value*ratio+(i%3===0?dx:i%3===2?dz:0)),start:at,end:at+count,firstVertex:vertex,lastVertex:vertex+row.lastVertex-row.firstVertex});appendContiguousRendererSpan(sceneSpans,{chunk,firstIndex:at,indexCount:count,localFirstIndex:row.start});
   for(const run of packed.runs){const first=Math.max(row.start,run.firstIndex),end=Math.min(row.end,run.firstIndex+run.indexCount);if(end<=first)continue;const firstIndex=at+first-row.start,previous=partitionRuns.at(-1);if(previous?.key===run.key&&previous.firstIndex+previous.indexCount===firstIndex)previous.indexCount+=end-first;else partitionRuns.push({key:run.key,firstIndex,indexCount:end-first});}at+=count;vertex+=row.lastVertex-row.firstVertex;
  }
  const first=chunks[0];if(first?.masks)rathausProxyMasks=first.masks;
  residentProgressiveStatus=Object.freeze(chunks.flatMap(chunk=>chunk.cpu.value?.auxiliary.progressiveStatus??[]).filter(row=>loaded.has(key(row))));landmarkVisible=components.some(c=>isFacadeLandmark(c)&&!isSourceOnlyGlassRoof(c));residentMaterialStyles=[...visibleStyles];
 }
 function startChunkPacking(candidate:Candidate,prepared:PreparedOwnerBatches,staticComponents:BuildingComponent[],accepted:BuildingComponent[],batchIncluded:(component:BuildingComponent,index:number)=>boolean,plans:{sourceRows:BuildingComponent[];sourceIndex:Map<string,BuildingComponent>;nativeDisplay?:NativeGroupDisplayPlan;shadowAdmission?:ShadowBatchAdmission;s434Plan?:S434AggregatePackingState;partialGate?:PartialGatePlan;s402?:S402Plan;s036?:S036NorthPlan;s240?:S240BasePlan;f151?:F151CrownPlan}){
  const attempt=candidate.sourceAttempt??0;
  const context=gl,dependencies=candidate.chunkDependencies?.input;if(!context||!dependencies)throw Error('Authoritative chunk input and attached context are required for mesh production');bindChunkResourceContext(context,dependencies.store);
  const scope=prepared.scope,legacy=candidate.plan.legacy,repairReady=tvBaseRepairProgramReady,nextChunks:StreamChunk[]=[],included=new Map(staticComponents.map(component=>[key(component),component.batches.map((_,index)=>batchIncluded(component,index))]));
  const reconstruction=ownerReconstruction;
  const lineage=(component:BuildingComponent)=>{const receipt=reconstruction.components.find(row=>row.objectId===component.objectId&&row.partId===component.partId);if(!receipt?.patchSHA256||!receipt.sourcePartId)return undefined;const source=plans.sourceRows.find(row=>row.objectId===component.objectId&&row.partId===receipt.sourcePartId);return source?{sources:[source],authority:receipt.patchSHA256}:undefined;};
  try{
   const groups=coalesceRendererChunkGroups(rendererChunkGroups(dependencies,staticComponents,lineage),[
    ...(plans.partialGate?.enabled&&plans.partialGate.parent&&plans.partialGate.cover?[{members:[plans.partialGate.parent,plans.partialGate.cover],authority:'partial-gate-verified-recipe-v1'}]:[]),
    ...(plans.s402?.enabled&&plans.s402.parent&&plans.s402.cover?[{members:[plans.s402.parent,plans.s402.cover],authority:'s402-verified-recipe-v1'}]:[]),
    ...(plans.s036?.enabled&&plans.s036.members?.length?[{members:plans.s036.members as BuildingComponent[],authority:'s036-verified-recipe-v1'}]:[]),
    ...(plans.s240?.enabled&&plans.s240.members?.length?[{members:plans.s240.members as BuildingComponent[],authority:'s240-verified-recipe-v1'}]:[]),
    ...(plans.s434Plan?.profile&&plans.s434Plan.entries.some(row=>acceptPaintComponent('root500',row.component as BuildingComponent))?[{members:plans.s434Plan.entries.map(row=>row.component),authority:'s434-verified-owner138-v1'}]:[]),
   ].filter(dependency=>dependency.members.some(component=>acceptPaintComponent('root500',component as BuildingComponent)))),maskProof=rathausCoincidentWallFragmentMasks(staticComponents);
   const ingress=new Map(dependencies.groups.flatMap(group=>group.components.map(component=>[key(component),group]as const)));
   candidate.advanceAdmission=createChunkAdmission(groups,original=>{
    candidate.signal?.throwIfAborted();
    const preferred=maskProof.masks.filter(mask=>original.components.some(component=>key(component)===key(mask.outline))).flatMap(mask=>groups.filter(group=>group.components.some(component=>key(component)===key(mask.preferred)))),maskParents=[...new Set(preferred)];
    const group=maskParents.length?{...original,contentKey:JSON.stringify(['rathaus-mask-dependencies-v1',original.contentKey,maskParents.map(parent=>parent.contentKey).sort()]),parents:[...new Set([...original.parents,...maskParents.flatMap(parent=>parent.parents)])]}:original;
    const rawGroups=new Set(group.components.flatMap(component=>{const direct=ingress.get(key(component));if(direct)return[direct];const proof=lineage(component);return proof?.sources.flatMap(source=>{const sourceGroup=ingress.get(key(source));return sourceGroup?[sourceGroup]:[];})??[];})),rawKeys=new Set([...rawGroups].flatMap(source=>source.components.map(key))),sourceRows=plans.sourceRows.filter(row=>rawKeys.has(key(row))),cohortComponents=[...new Set([group,...maskParents].flatMap(value=>value.components))];
    const {parents:reconstructionParents,authority:reconstructionAuthority}=retainReconstructionResourceParents(scope,group.components);let cpu:ChunkResourceLease<StreamPacked>;
    try{cpu=acquirePackedMeshChunk(dependencies.store,context,{provider:'root500:'+city,group:reconstructionParents.length?{...group,parents:[...group.parents,...reconstructionParents],recipeAuthority:JSON.stringify(['reconstruction-parents-v1',group.recipeAuthority,reconstructionAuthority])}:group,components:group.components,batchIncluded:(component,index)=>included.get(key(component))?.[index]??false,
     sourceCurrent(){if(scope.stats.disposed)throw Error('Chunk source scope retired during material production');},retainSource:()=>scope.retain(),
     materials:(rows,signal)=>packChunkMaterials([...rows],{scope,repairReady,source:sourceRows,cohort:cohortComponents,partialGate:plans.partialGate,s402:plans.s402,s036:plans.s036,s240:plans.s240,f151:plans.f151},signal),
     auxiliaryEstimate:[{category:'mask',bytes:2048,precision:'exact'},{category:'metadata',bytes:group.components.length*512+1024,precision:'estimate'}],auxiliaryCosts:auxiliary=>[...auxiliary.masks.costs,{category:'metadata',bytes:auxiliary.progressiveStatus.length*512+1024,precision:'estimate'}],
     progressivePainted:component=>readRoot500ProgressivelyPainted(component,scope),
     styles(component){const raw=component.sourceFeature.properties??{},landmark=isFacadeLandmark(component),sourceGlassRoof=isSourceOnlyGlassRoof(component);return{wall:landmark?(surfaceStyle?.(raw).styleId??0)%16:24,roof:(landmark?((surfaceStyle?.({...raw,building:'roof','building:material':raw['roof:material']}).styleId??8)%16):24)+32,landmark,sourceGlassRoof};},
     runs(localIndices,localPaint){const previousScope=committingScope;committingScope=scope;try{return familyPaintRuns(localIndices,localPaint,raw=>{const semantic=raw>=1000000?Math.floor(Math.fround(raw/10000)):raw;return legacy?paintProgramKey(semantic>=1000?Math.floor(Math.fround(semantic+.5)):semantic,city):'base';});}finally{committingScope=previousScope;}}
    },prepared.signal,repaintMap);}finally{for(const parent of reconstructionParents)parent.release();}
    nextChunks.push({source:group,cpu,loaded:new Map(),shadowIndices:new Uint32Array()});void cpu.ready.catch(error=>{if(pendingCandidate===candidate&&(candidate.sourceAttempt??0)===attempt){if(!(error instanceof ChunkResourceContextLostError))candidate.chunkFailure=error;if(!destroyed)map.triggerRepaint();}});
   });
   sourceLoaded=new Map(orderVisibleChunkRows([...plans.sourceIndex.values()],prepared.visibleSourceKeys).map(row=>[key(row),row]));nativeGroupPlan=plans.nativeDisplay;s434Owner138Plan=plans.s434Plan;residentScope=scope;generation=candidate.generation;needsBirth=true;viewRevision++;matrix=undefined;sceneChunks=nextChunks;sceneSpans=[];sceneChunkInput=dependencies;loaded=new Map();partitionRuns=[];
   const semantic=snapshotResident();candidate.chunks=nextChunks;candidate.finishChunkPack=()=>{
    semantic.restore();installChunkScene(nextChunks,accepted,candidate.generation);
    const auxiliary=nextChunks.flatMap(chunk=>chunk.cpu.value?[chunk.cpu.value.auxiliary]:[]);partialGateDisplay=auxiliary.find(row=>row.partialGate.enabled)?.partialGate??auxiliary[0]?.partialGate??partialGateDisplay;s402ConnectorDisplay=auxiliary.find(row=>row.connector.enabled)?.connector??auxiliary[0]?.connector??s402ConnectorDisplay;s036NorthCofaceDisplay=auxiliary.find(row=>row.north.enabled)?.north??auxiliary[0]?.north??s036NorthCofaceDisplay;s240BaseCofaceDisplay=auxiliary.find(row=>row.base.enabled)?.base??auxiliary[0]?.base??s240BaseCofaceDisplay;f151CrownDisplay=auxiliary.find(row=>row.crown.enabled)?.crown??auxiliary[0]?.crown??f151CrownDisplay;
    tvBaseRepairPaint=auxiliary.find(row=>row.repair.written>0)?.repair??auxiliary[0]?.repair??tvBaseRepairPaint;
    solarShadowAdmittedKeys=new Set();admitShadow(plans.shadowAdmission);updateSolarShadowIndices();paintSelection(false);candidate.indexCount=sceneIndexCount();candidate.sourceKeys=[...new Set([...(sceneIndexCount()?['base']:[]),...partitionRuns.flatMap(run=>[familySource(run.key).sourceKey,familySource(activeFamilyKey(run.key)).sourceKey])])];retireOwnerReconstructionConstruction(scope);return snapshotResident();
   };
  }catch(error){releaseStreamChunks(nextChunks);throw error;}
 }
 function retryLostCandidateChunks(candidate:Candidate){
  if(!candidate.chunks?.some(chunk=>chunk.cpu.state==='lost'||chunk.state?.state==='lost'))return;
  releaseStreamChunks(candidate.chunks);candidate.chunks=undefined;candidate.advanceAdmission=undefined;candidate.finishChunkPack=undefined;candidate.chunkFailure=undefined;candidate.sourceAttempt=(candidate.sourceAttempt??0)+1;candidate.sourceWorkConsumed=false;
  candidate.sourceReady=false;candidate.snapshot=undefined;
 }
 function finishCandidateChunkPacking(candidate:Candidate){
  if(candidate.chunkFailure!==undefined)throw candidate.chunkFailure;if(!candidate.finishChunkPack)return true;if(candidate.advanceAdmission&&!candidate.advanceAdmission()){map.triggerRepaint();return false;}candidate.advanceAdmission=undefined;const attempt=candidate.sourceAttempt??0,context=gl,dependencies=candidate.chunkDependencies?.input;if(!context||!dependencies)return false;
  for(const chunk of candidate.chunks??[]){if(chunk.cpu.state==='failed'||chunk.cpu.state==='released')throw Error('Chunk CPU production failed: '+chunk.cpu.contentKey);if(!chunk.cpu.value)return false;if(!chunk.state){chunk.state=acquireChunkMeshState(dependencies.store,context,chunkStateOwner,chunk.cpu,candidate.signal,repaintMap);void chunk.state.ready.catch(error=>{if(pendingCandidate===candidate&&(candidate.sourceAttempt??0)===attempt){if(!(error instanceof ChunkResourceContextLostError))candidate.chunkFailure=error;if(!destroyed)map.triggerRepaint();}});}}
  if(candidate.chunks?.some(chunk=>!chunk.state?.value))return false;const previous=snapshotResident(),finish=candidate.finishChunkPack,reset=residentResetRevision,version=geometryOwner.scene.version,previousTransient=transientResidentScope;transientResidentScope=previous.scope;
  try{const state=finish();candidate.snapshot=state;candidate.sourceReady=true;candidate.finishChunkPack=undefined;candidate.args=undefined;if(residentResetRevision!==reset||pendingCandidate!==candidate||candidate.signal?.aborted)throw new DOMException('Candidate superseded during chunk assembly','AbortError');return true;}finally{if(residentResetRevision===reset&&geometryOwner.scene.version===version)previous.restore();transientResidentScope=residentResetRevision===reset?previousTransient:undefined;}
 }
function packPreparedBatches(components:BuildingComponent[],nextGeneration:number,shadowAdmission?:ShadowBatchAdmission,nativeDisplay?:NativeGroupDisplayPlan,partialGatePlan?:PartialGatePlan,s402Plan?:S402Plan,s434Plan?:S434AggregatePackingState,s036Plan?:S036NorthPlan,s240Plan?:S240BasePlan,f151Plan?:F151CrownPlan,f068Admission?:F068DerivedAdmission,prepared?:PreparedOwnerBatches){
 if(destroyed||!Number.isSafeInteger(nextGeneration)||nextGeneration<generation)throw Error('Invalid generation');
 if(!components.length&&!prepared){clearResidentBatches(nextGeneration);return;}
 if(!prepared)throw Error('Root500 nonempty batches require prepared owner data');prepared.signal?.throwIfAborted();if(prepared.input.length!==components.length||!prepared.input.every((c,i)=>c===components[i]))throw Error('Prepared owner input changed');
 const previous=snapshotResident(),previousResetRevision=residentResetRevision,previousGeometry=geometryOwner.current,previousGeometryPending=geometryUploadPending,previousTransientScope=transientResidentScope;transientResidentScope=previous.scope;const incoming=prepared,previousCommittingScope=committingScope;if(!generationScopePins.has(incoming.scope))generationScopePins.set(incoming.scope,incoming.scope.retain());committingScope=incoming.scope;
 try{configurePreparedData();const originalSourceVertices=incoming.originalSourceVertices,originalSourceIndices=incoming.originalSourceIndices,nextSourceLoaded=incoming.sourceLoaded,tvBaseRepairRaw=[...nextSourceLoaded.values()],reconstructed=incoming.reconstructed;let count=0,ic=0;components=incoming.displayComponents;
 ownerReconstruction={...reconstructed.stats,components:[...reconstructed.stats.components]};count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);let ownerDeltaVertices=count-originalSourceVertices,ownerDeltaIndices=ic-originalSourceIndices;const nativeHeld=new Set(nativeDisplay?.hiddenOutlines??[]);if([...nativeHeld].some(c=>nextSourceLoaded.get(key(c))!==c))throw Error('Unbound native display outline');components=components.filter(c=>!nativeHeld.has(c));const childF260Canopy=f260CanopyDisplay267(components);for(const c of childF260Canopy.held)for(const b of c.batches){count-=b.positions.length/3;ic-=b.indices.length;}components=childF260Canopy.drawable;const partPlan=ownerCommitStep('exact part display',()=>exactNativePartDisplay(components));heldSourceOutlines=partPlan.held;components=partPlan.drawable;count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);s434PackingDiagnostic=s434Plan?.diagnostic;s434DrawableCounts=new Map();for(const c of components)s434DrawableCounts.set(key(c),(s434DrawableCounts.get(key(c))??0)+1);const s434Drawable=new Set<object>(components),s434Entries=s434Plan?.entries.filter(r=>s434Drawable.has(r.component))??[],s434Parent=components.find(c=>c.city==='frankfurt'&&c.objectId==='osm/way/72449471'&&c.partId==='osm/way/72449471/component/2137cfaabe8621cde1a7'),candidateS434=s434Plan?.profile??null;s434DisplayProfile=candidateS434&&s434Parent&&!s434AggregateBatchIncluded(candidateS434,s434Parent,0,s434Entries)?candidateS434:null;tvBaseRepairPlan=beTVBaseRepairPlan1(components,tvBaseRepairRaw,nativeLeaf,tvBaseRepairProgramReady);if(tvBaseRepairPlan.enabled){components=components.map(c=>beTVBaseRepairDrawAlias1(c,tvBaseRepairPlan));count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);tvBaseRepairPlan=beTVBaseRepairPlan1(components,tvBaseRepairRaw,nativeLeaf,tvBaseRepairProgramReady);}const west70Initial=beTVBaseWestFold70Transaction(components,tvBaseRepairRaw,nativeLeaf,ownerPatchSHA,tvBaseRepairProgramReady,OWNER_SHAPE_PATCH_PROFILES);components=west70Initial.rows;tvBaseRepairPlan=west70Initial.legacyPlan;tvBaseWest70Active=west70Initial.enabled;count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);ownerDeltaVertices=count-originalSourceVertices;ownerDeltaIndices=ic-originalSourceIndices;const batchIncluded=(c:BuildingComponent,bi:number)=>sourceRoleBatchIncluded(c,bi)&&s434AggregateBatchIncluded(s434DisplayProfile,c,bi,s434Entries)&&beTVBaseRepairBatchIncluded1(c,bi,tvBaseRepairPlan);for(const c of components)for(const [batchIndex,batch]of c.batches.entries())if(!batchIncluded(c,batchIndex))ic-=batch.indices.length;const focus=map.getCenter?.(),cohort=new Set(s434Entries.map(r=>r.component));components=components.filter(c=>acceptPaintComponent('root500',c));count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b,bi)=>m+(batchIncluded(c,bi)?b.indices.length:0),0),0);const staticComponents=components;components=orderVisibleChunkRows(components,incoming.visibleDisplayKeys);count=components.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0);ic=components.reduce((n,c)=>n+c.batches.reduce((m,b,bi)=>m+(batchIncluded(c,bi)?b.indices.length:0),0),0);ownerDeltaVertices=count-originalSourceVertices;ownerDeltaIndices=ic-originalSourceIndices;const budget=fitOwnerDisplayBudget(components,vertexCap,{vertices:count,indices:ic,originalSourceVertices,originalSourceIndices,ownerDeltaVertices,ownerDeltaIndices,protected:c=>beTVBaseRepairIdentity1(c)||isF107DerivedDisplayIdentity(c)||isF082DerivedDisplayIdentity(c)||isF075DerivedDisplayIdentity(c)||isF068DerivedDisplayIdentity(c)||ownerReconstructionIdentity(c)||isFacadeLandmark(c)||FROZEN_PAINT_IDS.has(c.objectId)||isDescribedBuilding(c)||!!progressiveAdmission(c)||!!sourceRoleDisplayProfile(c)||cohort.has(c)||!!selectedIdentity&&key(selectedIdentity)===key(c)||sourceBoundsContainFocus(c,focus),batchIncluded});components=budget.components;count=budget.vertices;ic=budget.indices;ownerDisplayBudget=budget.diagnostic;components=components.filter(c=>acceptPaintComponent('root500',c));if(!buildingCandidate||!candidateCurrent(buildingCandidate))throw new DOMException('Candidate superseded','AbortError');startChunkPacking(buildingCandidate,incoming,staticComponents,components,batchIncluded,{sourceRows:tvBaseRepairRaw,sourceIndex:nextSourceLoaded,nativeDisplay,shadowAdmission,s434Plan,partialGate:partialGatePlan,s402:s402Plan,s036:s036Plan,s240:s240Plan,f151:f151Plan});}finally{const candidateMasks=rathausProxyMasks;if(residentResetRevision===previousResetRevision){previous.restore();if(geometryOwner.current!==previousGeometry){previous.masks.detach();previous.plan?.clearPreparedSource();}geometryUploadPending=previousGeometryPending;committingScope=previousCommittingScope;transientResidentScope=previousTransientScope;}else{previous.masks.detach();if(previous.plan!==publishedProgramPlan&&previous.plan!==pendingCandidate?.plan)previous.plan?.release();committingScope=undefined;transientResidentScope=undefined;}if(!buildingCandidate?.snapshot&&candidateMasks!==rathausProxyMasks)candidateMasks.detach();releaseSupersededScopes();}
}
 function configurePreparedData(){const plan=buildingCandidate?.plan??publishedProgramPlan;if(!plan)throw Error('Root500 batch has no prepared program plan');configuredDataScope=plan.scope;publishedProgramPlan=plan;legacyPartitionEnabled=plan.legacy;tvBaseRepairProgramReady=plan.repairReady;progressiveShaderSpecialization=plan.specialization;}
 function resetPreparedData(){publishedProgramPlan?.release();configuredDataScope=undefined;publishedProgramPlan=undefined;legacyPartitionEnabled=false;tvBaseRepairProgramReady=false;progressiveShaderSpecialization=undefined;}
 function releaseGenerationScopes(){residentChunkDependencies?.release();residentChunkDependencies=undefined;residentScope=undefined;committingScope=undefined;configuredDataScope=undefined;for(const release of generationScopePins.values())release();generationScopePins.clear();}


 const geometryOwner=createResidentGeometryOwner({firstVertexTriangles:true}),shadowGeometryOwner=createResidentGeometryOwner({firstVertexTriangles:true}),staticGeometryOwner=createResidentGeometryOwner({firstVertexTriangles:true});
 let publishedProgramPlan:Root500ProgramPlan|undefined,buildingCandidate:Candidate|undefined,pendingCandidate:Candidate|undefined,candidateSequence=0,candidateFailure:string|undefined,candidateFailureGeneration:number|undefined;
 const planObjectIDs=new WeakMap<object,number>();let planObjectSequence=0;
 const planID=(value:unknown)=>{if(typeof value==='string'){let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return value.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}if((typeof value!=='object'||value===null)&&typeof value!=='function')return String(value);let id=planObjectIDs.get(value as object);if(id===undefined){id=++planObjectSequence;planObjectIDs.set(value as object,id);}return String(id);};
 type Candidate={advanceAdmission?:()=>boolean;sourceAttempt?:number;chunks?:StreamChunk[];finishChunkPack?:()=>ReturnType<typeof snapshotResident>;chunkFailure?:unknown;chunkDependencies?:RetainedChunkInput<BuildingComponent>;handoffRevision:number;mainPrograms?:Map<string,WebGLProgram>;requiredCaptureKeys?:Set<string>;captureRoles?:Map<CaptureDemandChange['kind'],{token:string;keys:Set<string>}>;requiredMainKeys?:ReadonlySet<string>;mainContext?:WebGL2RenderingContext;mainReadyStamp?:string;mainTextureWanted?:boolean;mainMaterialStyles?:readonly number[];windowFailure?:string;diffuseFailure?:string;revision:number;generation:number;scope:FrozenDataScope;signal?:AbortSignal;plan:Root500ProgramPlan;args?:Parameters<typeof packPreparedBatches>;snapshot?:ReturnType<typeof snapshotResident>;base?:WebGLProgram;baseContext?:WebGL2RenderingContext;published?:boolean;indexCount:number;sourceReady:boolean;sourceWorkConsumed:boolean;sourceKeys?:readonly string[];programDataController:AbortController;programDataPending?:Promise<void>;programDataReady?:boolean;programDataFailure?:unknown;closed:boolean;abortCleanup?:()=>void};
 function candidateCurrent(candidate:Candidate){return pendingCandidate===candidate&&!candidate.closed&&!candidate.signal?.aborted&&!destroyed;}
 type GeometryRecipeIdentity=Pick<ProgramPreparationRecipe,'sharedKey'|'resource'|'inputs'|'provenance'>;
 type GeometryConsumerRecipe=ProgramPreparationRecipe&{mainCurrent:()=>boolean};
 // Live-plan recipe metadata only; admission always selects a still-live source scope.
 const geometryRecipeConsumers=new WeakMap<Root500ProgramPlan,GeometryConsumerRecipe[]>();
 let transientGeometryDemand:{plan:Root500ProgramPlan;scope:FrozenDataScope;main:ReadonlySet<string>;capture:Set<string>;material:boolean;geometry:boolean}|undefined;
 function sameGeometryRecipe(a:GeometryRecipeIdentity,b:GeometryRecipeIdentity){return a.sharedKey===b.sharedKey&&a.resource===b.resource&&a.inputs.length===b.inputs.length&&a.inputs.every((value,index)=>value===b.inputs[index])&&(a.provenance?.length??0)===(b.provenance?.length??0)&&(a.provenance??[]).every((value,index)=>value===b.provenance?.[index]);}
 function liveGeometryRecipe(identity:GeometryRecipeIdentity,mainOnly=false){for(const plan of [pendingCandidate?.plan,publishedProgramPlan,transientGeometryDemand?.plan]){if(!plan)continue;const recipe=geometryRecipeConsumers.get(plan)?.find(value=>sameGeometryRecipe(value,identity)&&(!value.current||value.current())&&(!mainOnly||value.mainCurrent()));if(recipe)return recipe;}}
 function rememberGeometryRecipe(plan:Root500ProgramPlan,recipe:GeometryConsumerRecipe){let rows=geometryRecipeConsumers.get(plan);if(!rows){rows=[];geometryRecipeConsumers.set(plan,rows);}const index=rows.findIndex(value=>sameGeometryRecipe(value,recipe));if(index<0)rows.push(recipe);else rows[index]=recipe;}
 function coordinateGeometryRecipe(plan:Root500ProgramPlan,recipe:GeometryConsumerRecipe):ProgramPreparationRecipe{rememberGeometryRecipe(plan,recipe);const identity:GeometryRecipeIdentity={sharedKey:recipe.sharedKey,resource:recipe.resource,inputs:recipe.inputs,provenance:recipe.provenance};return{...recipe,priority:liveGeometryRecipe(identity,true)?'visible':'capture',currentPriority:()=>liveGeometryRecipe(identity,true)?'visible':'capture',current:()=>!!liveGeometryRecipe(identity),resolveSource(){const active=liveGeometryRecipe(identity);if(!active)throw new ProgramPreparationPending('cancelled');return{budget:active.budget,current:active.current,build:active.build};},build(){const active=liveGeometryRecipe(identity);if(!active)throw new ProgramPreparationPending('cancelled');return active.build();}};}
 function pruneGeometryRecipeConsumers(){for(const plan of [pendingCandidate?.plan,publishedProgramPlan,transientGeometryDemand?.plan]){if(!plan)continue;const rows=geometryRecipeConsumers.get(plan);if(rows)geometryRecipeConsumers.set(plan,rows.filter(value=>!value.current||value.current()));}programPreparation.prune();}
 function capturePublishedGeometryDemand(){const plan=publishedProgramPlan;return plan?{plan,scope:plan.scope,main:residentMainRequiredKeys??mainPaintKeys(),capture:capturePaintKeys(),material:paintMode()===1&&landmarkVisible&&facadeAttached,geometry:sceneIndexCount()>0}:undefined;}
 function withPlan<T>(plan:Root500ProgramPlan,run:()=>T):T{const previous=committingScope,legacy=legacyPartitionEnabled;committingScope=plan.scope;legacyPartitionEnabled=plan.legacy;try{return run();}finally{committingScope=previous;legacyPartitionEnabled=legacy;}}
 // Snapshot restoration can temporarily alias publishedProgramPlan during an
 // upload. A disposed candidate never completed the ownership transfer.
 let residentResetRevision=0;
 function clearAbandonedCandidateFailure(){candidateFailure=undefined;candidateFailureGeneration=undefined;if(mainGeometryProgramFailure?.startsWith('Candidate preparation: '))mainGeometryProgramFailure=undefined;}
 let candidateMainMatrix:readonly number[]|undefined,candidateMainViewRevision=0;
 function recordCandidateMainView(value:ArrayLike<number>|undefined){if(!value||value.length!==16||!Array.from(value).every(Number.isFinite)){invalidateMainDraw();residentMainPreparedStamp=undefined;candidateMainMatrix=undefined;candidateMainViewRevision++;if(pendingCandidate){pendingCandidate.mainReadyStamp=undefined;}return;}if(!candidateMainMatrix||candidateMainMatrix.some((n,i)=>!Object.is(n,value[i]))){invalidateMainDraw();residentMainPreparedStamp=undefined;candidateMainMatrix=Array.from(value);candidateMainViewRevision++;}}
 function candidateMainStamp(){return candidateMainViewRevision+':'+paintMode()+':'+paintOverride()+':'+Number(partitionEnabled);}
 function releaseCandidatePrograms(candidate:Candidate){if(candidate.base&&candidate.baseContext)programPreparation.releaseProgram(candidate.baseContext,candidate.base);candidate.base=undefined;candidate.baseContext=undefined;if(candidate.mainContext)for(const value of candidate.mainPrograms?.values()??[])programPreparation.releaseProgram(candidate.mainContext,value);candidate.mainPrograms?.clear();candidate.captureRoles=undefined;candidate.requiredCaptureKeys=undefined;candidate.mainContext=undefined;candidate.mainReadyStamp=undefined;candidate.windowFailure=candidate.diffuseFailure=undefined;}
 function disposeCandidate(candidate:Candidate){releaseStreamChunks(candidate.chunks??[]);candidate.chunks=undefined;candidate.advanceAdmission=undefined;candidate.finishChunkPack=undefined;candidate.chunkDependencies?.release();candidate.chunkDependencies=undefined;candidate.closed=true;candidate.programDataController.abort();candidate.programDataPending=undefined;candidate.sourceKeys=undefined;candidate.abortCleanup?.();candidate.abortCleanup=undefined;candidate.args=undefined;candidate.snapshot=undefined;releaseCandidatePrograms(candidate);candidate.plan.release();}
 function handoffCandidateGrants(candidate:Candidate,signal?:AbortSignal){const context=candidate.baseContext??candidate.mainContext,programs=[candidate.base,...(candidate.mainPrograms?.values()??[])];candidate.base=undefined;candidate.baseContext=undefined;candidate.mainPrograms?.clear();candidate.mainContext=undefined;const revision=++programHandoffRevision;programGrantHandoff.replace(context,programs,signal);return revision;}
 function cancelCandidate(keepReady=false,successor?:AbortSignal){const candidate=pendingCandidate;pendingCandidate=undefined;const revision=keepReady?(candidate?handoffCandidateGrants(candidate,successor):programGrantHandoff.matches(successor)?++programHandoffRevision:clearProgramGrantHandoff()):clearProgramGrantHandoff();if(candidate){candidateFailure??='Candidate preparation cancelled';pruneGeometryRecipeConsumers();disposeCandidate(candidate);}syncFacadeResources();releaseSupersededScopes();return revision;}
 function cancelCandidateGeneration(expectedGeneration:number){if(pendingCandidate?.generation===expectedGeneration){cancelCandidate();clearAbandonedCandidateFailure();}else if(candidateFailureGeneration===expectedGeneration)clearAbandonedCandidateFailure();}
 function requestCandidate(args:Parameters<typeof packPreparedBatches>){
  const [components,nextGeneration]=args,prepared=args[11];if(destroyed||!Number.isSafeInteger(nextGeneration)||nextGeneration<generation||nextGeneration<(pendingCandidate?.generation??generation))throw Error('Invalid generation');
  if(!components.length&&!prepared){const handoffRevision=cancelCandidate();if(handoffRevision!==programHandoffRevision)throw new DOMException('Candidate superseded during handoff','AbortError');candidateFailure=undefined;candidateFailureGeneration=undefined;programPreparation.cancel();clearResidentBatches(nextGeneration);return;}
  if(!prepared)throw Error('Root500 nonempty batches require prepared owner data');prepared.signal?.throwIfAborted();if(prepared.input.length!==components.length||!prepared.input.every((c,i)=>c===components[i]))throw Error('Prepared owner input changed');
  invalidateMainDraw();const handoffRevision=cancelCandidate(true,prepared.signal);let chunkDependencies:RetainedChunkInput<BuildingComponent>|undefined;try{if(handoffRevision!==programHandoffRevision)throw new DOMException('Candidate superseded during handoff','AbortError');candidateFailure=undefined;candidateFailureGeneration=undefined;if(!generationScopePins.has(prepared.scope))generationScopePins.set(prepared.scope,prepared.scope.retain());
  chunkDependencies=retainChunkInput(prepared.chunkInput);const identity=['root500',++root500ProgramPlanSequence,city,'scope',planID(prepared.scope),'source',planID(prepared.sourceLoaded),'display',planID(prepared.displayComponents),'profiles',...args.slice(2,11).map(planID),'material',planID(surfaceStyle),planID(nativeLeaf),planID(ownerPatchSHA),planID(surfaceFragment),planID(baseSurfaceFragment),planID(diffuseFragment)].join(':');
  const plan=createRoot500PreparedProgramPlan({identity,scope:prepared.scope,city,budget:prepared.chunkInput?.store.budget});pendingCandidate={chunkDependencies,handoffRevision,revision:++candidateSequence,generation:nextGeneration,scope:prepared.scope,signal:prepared.signal,plan,args,indexCount:0,sourceReady:false,sourceWorkConsumed:false,programDataController:new AbortController(),closed:false};
  const candidate=pendingCandidate,signal=prepared.signal;if(signal){const abort=()=>{if(pendingCandidate===candidate&&!candidate.closed){const successor=adjacentViewportPublicationSignal(signal);cancelCandidate(successor!==undefined,successor);clearAbandonedCandidateFailure();map.triggerRepaint();}};signal.addEventListener('abort',abort,{once:true});candidate.abortCleanup=()=>signal.removeEventListener('abort',abort);}
  pumpCandidate();map.triggerRepaint();}catch(error){chunkDependencies?.release();clearProgramGrantHandoff(handoffRevision);throw error;}
 }
 function prepareCandidateSource(candidate:Candidate){
  retryLostCandidateChunks(candidate);if(!gl||candidate.sourceWorkConsumed)return;
  const consumed=programPreparation.work(gl,{resource:'batch-source-plan:'+(candidate.sourceAttempt??0),revision:candidate.revision,phase:'source-build',current:()=>candidateCurrent(candidate)&&!pageHidden,work(){
   if(!candidate.args)return;const plan=candidate.plan;
   withPlan(plan,()=>{plan.prepareMetadata();plan.prepareRepair(()=>tvBaseRepairProgramReady1(paintProgramFragment(TV_BASE_REPAIR_PROGRAM_KEY,city)));});
   const previousDemand=transientGeometryDemand;transientGeometryDemand=capturePublishedGeometryDemand();buildingCandidate=candidate;try{packPreparedBatches(...candidate.args);if(!candidate.finishChunkPack){candidate.sourceReady=true;candidate.args=undefined;}}finally{buildingCandidate=undefined;transientGeometryDemand=previousDemand;}
  }});if(consumed)candidate.sourceWorkConsumed=true;
 }
 function prepareCandidatePrograms(candidate:Candidate){
  if(candidate.programDataFailure!==undefined)throw candidate.programDataFailure;
  if(candidate.programDataReady)return true;
  if(!candidate.programDataPending){
   const pending=candidate.plan.preparePrograms(candidate.sourceKeys??[],candidate.programDataController.signal);candidate.programDataPending=pending;
   void pending.then(()=>{if(!candidateCurrent(candidate))return;candidate.programDataReady=true;map.triggerRepaint();},error=>{if(!candidateCurrent(candidate))return;candidate.programDataFailure=error??Error('Root500 program data preparation failed');map.triggerRepaint();});
  }
  return false;
 }
 function pruneCandidateCaptureRoles(candidate:Candidate){
  const required=new Set<string>();
  for(const[kind,role]of candidate.captureRoles??[]){const demand=captureDemands.get(kind);if(!demand||demand.token!==role.token||destroyed||pageHidden||!enabled||paintMode()<=1.5||kind==='solar'&&!solarProgramDemandActive())continue;for(const key of role.keys)if(kind==='solar'||demand.keys?.has(key))required.add(key);}
  candidate.requiredCaptureKeys=required;
  for(const[key,value]of candidate.mainPrograms??[])if(!key.startsWith('@')&&!candidate.requiredMainKeys?.has(key)&&!required.has(key)){if(candidate.mainContext)programPreparation.releaseProgram(candidate.mainContext,value);candidate.mainPrograms!.delete(key);}
 }
 function transferCandidateCaptureRoles(candidate:Candidate){
  for(const key of candidate.requiredCaptureKeys??[])if(!candidate.requiredMainKeys?.has(key)&&candidate.mainPrograms?.has(key))heldCaptureDemandKeys.add(key);
  for(const[kind,role]of candidate.captureRoles??[]){const demand=captureDemands.get(kind);if(demand?.token===role.token)for(const key of role.keys)if(heldCaptureDemandKeys.has(key))demand.heldKeys.add(key);}
 }
 type MainProgramRoles={base?:WebGLProgram;window?:WebGLProgram;diffuse?:WebGLProgram;windowFailure?:string;diffuseFailure?:string;colours:Map<string,WebGLProgram>;textureWanted:boolean;styles:readonly number[]};
 let residentMainMaskChunks:readonly StreamChunk[]=[];
 let residentMainRequiredKeys:ReadonlySet<string>|undefined,residentMainRequiredStamp:string|undefined,residentMainPreparedStamp:string|undefined,residentMainFailure:string|undefined;
 let mainGPUIncarnation=0,mainGeometryIdentity=0;
 type MainFrameCompletion={context:WebGL2RenderingContext;incarnation:number;geometry:number;generation:number;stamp:string;empty:boolean};
 let firstCompleteMain:MainFrameCompletion|undefined,pendingMainFrame:MainFrameCompletion|undefined;
 function invalidateMainDraw(){firstCompleteMain=undefined;pendingMainFrame=undefined;}
 function mainPreparationStamp(){return mainGPUIncarnation+':'+candidateMainStamp();}
 function mainDrawStamp(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[mainPreparationStamp(),viewRevision,captureStateRevision,opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),progressiveDiagnostic,w?.residentRevision,w?.ready,w?.error,d?.residentRevision,d?.neededMaterials.plaster,d?.neededMaterials.brick,d?.plaster.ready,d?.plaster.error,d?.brick.ready,d?.brick.error,residentMainMaskChunks.map(chunk=>chunk.masks?.residentRevision??'').join(',')].join('|');}
 function requiredMainFailure(){return candidateFailure??residentMainFailure??mainGeometryProgramFailure??geometryUploadFailure??contextRecoveryFailure??(residentMainRequiredStamp===mainPreparationStamp()&&partitionEnabled&&paintMode()>1.5?[...(residentMainRequiredKeys??[])].map(key=>partitionFailures.get(key)).find(Boolean):undefined);}
 function mainDrawComplete(){const value=firstCompleteMain;return!requiredMainFailure()&&!!value&&value.context===gl&&value.incarnation===mainGPUIncarnation&&value.geometry===mainGeometryIdentity&&value.generation===generation&&value.stamp===mainDrawStamp()&&!pendingCandidate&&!candidateFailure&&!geometryUploadPending&&!!candidateMainMatrix&&!destroyed&&!pageHidden&&enabled&&(value.empty?!sceneIndexCount()&&!partitionPending&&!!residentGPU?.isEmptyReady():gpuReady()&&!!matrix);}
 function stageCompleteMainDraw(context:WebGL2RenderingContext,stamp:string,geometry:number,empty=false){pendingMainFrame={context,incarnation:mainGPUIncarnation,geometry,generation,stamp,empty};}
 function recordCompleteMainDraw(frame:MainFrameCompletion){const{context,stamp,geometry,empty}=frame;if(gl!==context||context.isContextLost()||destroyed||pageHidden||!enabled||!candidateMainMatrix||frame.incarnation!==mainGPUIncarnation||frame.generation!==generation||geometry!==mainGeometryIdentity||stamp!==mainDrawStamp()||requiredMainFailure())return;if(empty?!!pendingCandidate||geometryUploadPending||sceneIndexCount()>0||partitionPending||!residentGPU?.isEmptyReady():!gpuReady()||!matrix||residentMainPreparedStamp!==mainPreparationStamp())return;firstCompleteMain=frame;residentMainFailure=undefined;if(contextRecoveryPending){contextRecoveryPending=false;contextRecoveryFailure=undefined;contextRecoverySuccesses++;}}
 function mainTexturesReady(roles:MainProgramRoles){
  if(!roles.textureWanted)return true;const window=windowTexture?.stats,diffuse=diffuseTexture?.stats,needPlaster=roles.styles.some(style=>style<32&&[0,3,4].includes(style%8)),needBrick=roles.styles.some(style=>style<32&&style%8===1);
  if(window?.error)roles.windowFailure??=window.error;if(diffuse?.plaster.error)roles.diffuseFailure??=diffuse.plaster.error;if(diffuse?.brick.error)roles.diffuseFailure??=diffuse.brick.error;
  if(windowTexture&&surfaceFragment&&!window?.error&&(!gl||!windowTexture.isResident(gl)||!window?.ready))return false;
  if(windowTexture&&diffuseTexture&&diffuseFragment&&(!diffuse?.plaster.error&&!diffuse?.brick.error&&(!gl||!diffuseTexture.isResident(gl))||needPlaster&&!diffuse?.plaster.ready&&!diffuse?.plaster.error||needBrick&&!diffuse?.brick.ready&&!diffuse?.brick.error))return false;return true;
 }
 function mainMaskChunks(){
  const runs=partitionEnabled&&paintMode()>1.5?mainPaintRuns():[{firstIndex:0,indexCount:sceneIndexCount()}],visible=new Set<StreamChunk>();
  // Both lists follow the published index order. One cursor covers all spans,
  // including a single material run crossing several chunk boundaries.
  let runIndex=0;
  for(const span of sceneSpans){
   while(runIndex<runs.length&&runs[runIndex].firstIndex+runs[runIndex].indexCount<=span.firstIndex)runIndex++;
   if(runIndex===runs.length)break;
   if(runs[runIndex].firstIndex<span.firstIndex+span.indexCount)visible.add(span.chunk);
  }
  return sceneChunks.filter(chunk=>visible.has(chunk));
 }
 function chunkMainMasks(chunks:readonly StreamChunk[]):Pick<ReturnType<typeof createRathausProxyMasks>,'prepare'|'isResident'>{return{prepare(context,programs){for(const chunk of chunks){if(!chunk.masks)return{ready:false,reason:'chunk-mask-binding-unavailable'};const result=chunk.masks.prepare(context,programs);if(!result.ready)return result;}return{ready:true};},isResident:(context,program)=>chunks.every(chunk=>chunk.masks?.isResident(context,program))};}
 function prepareMainPrograms(request:{plan:Root500ProgramPlan;roles:MainProgramRoles;required:ReadonlySet<string>;masks:Pick<ReturnType<typeof createRathausProxyMasks>,'prepare'|'isResident'>;context:WebGL2RenderingContext;revision:number;stamp:string;preparedStamp?:string;markPrepared:(value:string|undefined)=>void;current:()=>boolean;failures?:Map<string,string>;waits?:PreparationWaits}):boolean{
  const{plan,roles,required,masks,context,waits}=request,helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';let pending=false;
  // A pending attempt is a held page-ledger wait only when the owner's budget
  // wait count moved and its wake is held; every other not-ready cause is `other`.
  const other=()=>{if(waits)waits.other=true;return false;},pended=(before:number|undefined)=>{pending=true;if(waits){if(programPreparation.needsFrameAfter?.(before)===false)waits.ledger++;else waits.other=true;}};
  if(!request.current())return other();const accept=(value:WebGLProgram)=>{if(!request.current()){programPreparation.releaseProgram(context,value);throw new ProgramPreparationPending();}return value;};
  if(!roles.base){const before=programPreparation.budgetWaits;try{roles.base=accept(compileGeometryProgram(helper,'base',plan.legacy,false,[0],plan));}catch(error){if(!request.current())return other();if(!isProgramPreparationPending(error))throw error;pended(before);}}
  for(const key of required){if(roles.colours.has(key))continue;if(request.failures?.has(key)){pending=true;other();continue;}const before=programPreparation.budgetWaits;try{const recipe=familySource(key);roles.colours.set(key,accept(compileGeometryProgram(helper,recipe.sourceKey,false,false,recipe.families,plan,recipe.sourceKey)));}catch(error){if(!request.current())return other();if(isProgramPreparationPending(error)){pended(before);continue;}if(!request.failures)throw error;request.failures.set(key,(error instanceof ProgramPreparationFailure?error.diagnostic.phase+': '+(error.diagnostic.reason??String(error)):String(error)).slice(0,256));partitionCompileAttempt={key,startedAt:new Date().toISOString(),state:'failed',error:String(error)};console.error('[root500 family shader compile failed]',city,key,String(error));pending=true;other();}}
  if(roles.textureWanted&&windowTexture?.stats.textureObjects&&surfaceFragment&&!roles.window&&!roles.windowFailure){const before=programPreparation.budgetWaits;try{roles.window=accept(compileGeometryProgram(surfaceFragment,'base',plan.legacy,false,[0],plan));}catch(error){if(!request.current())return other();if(isProgramPreparationPending(error))pended(before);else roles.windowFailure=String(error);}}
  if(roles.textureWanted&&windowTexture?.stats.textureObjects&&diffuseTexture?.stats.totalTextureObjects===2&&diffuseFragment&&!roles.diffuse&&!roles.diffuseFailure){const before=programPreparation.budgetWaits;try{roles.diffuse=accept(compileGeometryProgram(diffuseFragment,'base',plan.legacy,false,[0],plan));}catch(error){if(!request.current())return other();if(isProgramPreparationPending(error))pended(before);else roles.diffuseFailure=String(error);}}
  if(!roles.base||pending||[...required].some(key=>!roles.colours.has(key)))return false;if(!mainTexturesReady(roles))return other();
  const actual=[roles.base,...[...required].map(key=>roles.colours.get(key)!),...(roles.textureWanted&&roles.window?[roles.window]:[]),...(roles.textureWanted&&roles.diffuse?[roles.diffuse]:[])];
  if(request.preparedStamp===request.stamp&&actual.every(value=>masks.isResident(context,value)))return request.current()||other();request.markPrepared(undefined);
  const ready=programPreparation.work(context,{resource:'main-material-masks:'+plan.identity+':'+request.stamp,revision:request.revision,current:request.current,work(){const result=masks.prepare(context,actual);if(!result.ready){if(context.isContextLost())throw new ProgramPreparationPending();throw Error(result.reason??'Main mask preparation failed');}}});
  if(!ready||!actual.every(value=>masks.isResident(context,value))||!request.current())return other();request.markPrepared(request.stamp);return true;
 }
 function candidateMainRoles(candidate:Candidate,context:WebGL2RenderingContext,programs:Map<string,WebGLProgram>):MainProgramRoles{return{get base(){return candidate.base;},set base(value){candidate.base=value;candidate.baseContext=value?context:undefined;},get window(){return programs.get('@window');},set window(value){if(value)programs.set('@window',value);else programs.delete('@window');},get diffuse(){return programs.get('@diffuse');},set diffuse(value){if(value)programs.set('@diffuse',value);else programs.delete('@diffuse');},get windowFailure(){return candidate.windowFailure;},set windowFailure(value){candidate.windowFailure=value;},get diffuseFailure(){return candidate.diffuseFailure;},set diffuseFailure(value){candidate.diffuseFailure=value;},colours:programs,textureWanted:!!candidate.mainTextureWanted,styles:candidate.mainMaterialStyles??[]};}
 function prepareResidentMain(context:WebGL2RenderingContext):boolean{
  const plan=publishedProgramPlan;if(!plan||!candidateMainMatrix||context!==gl||context.isContextLost()||destroyed||pageHidden||!enabled)return false;
  const previousMatrix=matrix;let required:ReadonlySet<string>,maskChunks:StreamChunk[];try{const scale=1/anchorUnit,model=[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1];matrix=multiply(candidateMainMatrix,model);required=partitionEnabled&&paintMode()>1.5?paintKeysForRuns(mainPaintRuns()):new Set<string>();maskChunks=mainMaskChunks();}finally{matrix=previousMatrix;}
  residentMainMaskChunks=maskChunks;residentMainRequiredKeys=required;residentMainRequiredStamp=mainPreparationStamp();partitionVisibleKeys=[...required];pruneGeometryRecipeConsumers();syncFacadeResources();const stamp=mainPreparationStamp(),incarnation=mainGPUIncarnation;
  const roles:MainProgramRoles={get base(){return program;},set base(value){program=value;},get window(){return texturedProgram;},set window(value){texturedProgram=value;textureShaderAttempted=!!value||!!textureShaderFailure;if(value)forgetCaptureRole('@window');},get diffuse(){return diffuseProgram;},set diffuse(value){diffuseProgram=value;diffuseShaderAttempted=!!value||!!diffuseShaderFailure;if(value)forgetCaptureRole('@diffuse');},get windowFailure(){return textureShaderFailure;},set windowFailure(value){textureShaderFailure=value;textureShaderAttempted=!!texturedProgram||!!value;},get diffuseFailure(){return diffuseShaderFailure;},set diffuseFailure(value){diffuseShaderFailure=value;diffuseShaderAttempted=!!diffuseProgram||!!value;},colours:partitionPrograms,textureWanted:paintMode()===1&&landmarkVisible,styles:residentMaterialStyles};
  const waits:PreparationWaits={ledger:0,other:false};try{const ready=prepareMainPrograms({plan,roles,required,masks:chunkMainMasks(maskChunks),context,revision:geometryUploadRevision,stamp,preparedStamp:residentMainPreparedStamp,markPrepared:value=>{residentMainPreparedStamp=value;},current:()=>!destroyed&&!pageHidden&&enabled&&gl===context&&!context.isContextLost()&&publishedProgramPlan===plan&&mainGPUIncarnation===incarnation&&mainPreparationStamp()===stamp,failures:partitionFailures,waits});partitionPending=!ready;if(!ready){invalidateMainDraw();if(waits.other||!waits.ledger)map.triggerRepaint();}else{residentMainFailure=undefined;contextRecoveryFailure=undefined;}return ready;}catch(error){if(context.isContextLost()){invalidateMainDraw();residentMainPreparedStamp=undefined;return false;}if(isProgramPreparationPending(error)){partitionPending=true;map.triggerRepaint();return false;}residentMainFailure=String(error).slice(0,512);invalidateMainDraw();if(contextRecoveryPending){contextRecoveryPending=false;contextRecoveryFailure=residentMainFailure;}throw error;}
 }
 function prepareCandidateMain(candidate:Candidate,waits?:PreparationWaits):boolean{
  const state=candidate.snapshot,context=gl;if(!state||!context||context.isContextLost())return false;candidate.mainContext=context;
  const empty=!candidate.indexCount;if(empty){candidate.mainReadyStamp=mainPreparationStamp();return true;}
  if(!candidateMainMatrix)return false;
  const previous=snapshotResident();let required:ReadonlySet<string>,maskChunks:StreamChunk[];
  try{state.restore();const scale=1/anchorUnit,model=[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1];matrix=multiply(candidateMainMatrix,model);required=partitionEnabled&&paintMode()>1.5?paintKeysForRuns(mainPaintRuns()):new Set<string>();maskChunks=mainMaskChunks();candidate.mainTextureWanted=paintMode()===1&&landmarkVisible;candidate.mainMaterialStyles=residentMaterialStyles;const casters=solarResidentKeys(),roles=new Map<CaptureDemandChange['kind'],{token:string;keys:Set<string>}>();if(partitionEnabled&&paintMode()>1.5)for(const[kind,demand]of captureDemands){const keys=kind==='solar'?(solarProgramDemandActive()?new Set(casters):new Set<string>()):new Set([...demand.keys??[]].filter(key=>casters.has(key)));roles.set(kind,{token:demand.token,keys});}candidate.captureRoles=roles;}finally{previous.restore();}
  candidate.requiredMainKeys=required;candidate.mainContext=context;const programs=candidate.mainPrograms??=new Map<string,WebGLProgram>();pruneCandidateCaptureRoles(candidate);
  for(const [key,value]of programs)if(key.startsWith('@')?!candidate.mainTextureWanted:!required.has(key)&&!candidate.requiredCaptureKeys?.has(key)){programPreparation.releaseProgram(context,value);programs.delete(key);candidate.mainReadyStamp=undefined;}
  pruneGeometryRecipeConsumers();syncFacadeResources();
  const stampReady=mainPreparationStamp(),roles=candidateMainRoles(candidate,context,programs);const ready=prepareMainPrograms({plan:candidate.plan,roles,required,masks:chunkMainMasks(maskChunks),context,revision:candidate.revision,stamp:stampReady,preparedStamp:candidate.mainReadyStamp,markPrepared:value=>{candidate.mainReadyStamp=value;},current:()=>pendingCandidate===candidate&&!candidate.signal?.aborted&&!destroyed&&!pageHidden&&gl===context&&!context.isContextLost()&&mainPreparationStamp()===stampReady,waits});
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
  for(const key of candidate.requiredCaptureKeys??[]){if(programs.has(key))continue;try{const recipe=familySource(key),value=acquireGeometryProgram(helper,recipe.sourceKey,false,true,recipe.families,candidate.plan,recipe.sourceKey);if(value)programs.set(key,value);}catch(error){if(context.isContextLost())return false;/* A capture-only renewal cannot fail or delay the main handoff. */}}

  clearProgramGrantHandoff(candidate.handoffRevision);return ready;
 }
 function candidateMainReady(candidate:Candidate){return candidate.mainReadyStamp===mainPreparationStamp()&&candidate.mainContext===gl;}
 function pumpCandidate(){
  const candidate=pendingCandidate;if(!candidate||!gl||pageHidden)return;if(gl.isContextLost()){clearProgramGrantHandoff(candidate.handoffRevision);releaseCandidatePrograms(candidate);return;}const context=gl;
  try{
   prepareCandidateSource(candidate);if(!finishCandidateChunkPacking(candidate)||!candidate.sourceReady||!candidate.snapshot)return;
   if(!prepareCandidatePrograms(candidate))return;
   if(!candidate.indexCount){publishCandidate(candidate);return;}
   if(!candidateMainMatrix){map.triggerRepaint();return;}
   if(candidate.base&&candidate.baseContext!==context)releaseCandidatePrograms(candidate);
   if(gl!==context||context.isContextLost())return;
   const waits:PreparationWaits={ledger:0,other:false};if(!prepareCandidateMain(candidate,waits)){if(waits.other||!waits.ledger)map.triggerRepaint();return;}const mainStamp=candidate.mainReadyStamp;
   programPreparation.work(context,{resource:'candidate-geometry-upload:'+mainStamp,revision:candidate.revision,retainReady:false,current:()=>candidateCurrent(candidate)&&gl===context&&!context.isContextLost()&&!pageHidden&&candidateMainReady(candidate)&&candidate.mainReadyStamp===mainStamp&&mainPreparationStamp()===mainStamp,work(){publishCandidate(candidate);}});
  }catch(error){if(context.isContextLost()){clearProgramGrantHandoff(candidate.handoffRevision);releaseCandidatePrograms(candidate);geometryOwner.contextLost();geometryResidentUploaded=false;geometryUploadPending=sceneIndexCount()>0;return;}if(isProgramPreparationPending(error))return;if(candidate.published){if(!pendingCandidate&&publishedProgramPlan===candidate.plan&&gl===context)geometryUploadFailure=String(error).slice(0,512);return;}if(!candidateCurrent(candidate)||gl!==context)return;clearProgramGrantHandoff(candidate.handoffRevision);candidateFailure=String(error).slice(0,512);candidateFailureGeneration=candidate.generation;mainGeometryProgramFailure='Candidate preparation: '+candidateFailure;pendingCandidate=undefined;disposeCandidate(candidate);syncFacadeResources();releaseSupersededScopes();map.triggerRepaint();}
 }
 function publishCandidate(candidate:Candidate){clearProgramGrantHandoff(candidate.handoffRevision);
  if(!candidateCurrent(candidate)||!candidate.snapshot||!gl||candidate.indexCount&&(!candidate.base||candidate.baseContext!==gl||!candidateMainReady(candidate)))return;const context=gl;
  pruneCandidateCaptureRoles(candidate);const oldChunks=sceneChunks,oldChunkDependencies=residentChunkDependencies,previous=snapshotResident(),oldPlan=publishedProgramPlan,oldProgram=program,oldPartitions=new Map(partitionPrograms),oldTextured=texturedProgram,oldDiffuse=diffuseProgram,oldViewRevision=viewRevision,oldGeometryPending=geometryUploadPending,previousTransientScope=transientResidentScope;let published=false;transientResidentScope=previous.scope;
  candidate.snapshot.restore();try{
   geometryUploadPending=true;paintSelection();sceneSun=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],sceneSunInstant);solarShadowAdmittedKeys=new Set();updateSolarShadowIndices();
   if(sceneIndexCount()){const uploaded=publishStreamGeometry(context,candidate.base!,sceneChunks,candidate.generation,()=>candidateCurrent(candidate)&&gl===context&&!context.isContextLost()&&candidateMainReady(candidate));if(uploaded)assignGeometry(uploaded);geometryResidentUploaded=true;}else{retireShadowGeometry();geometryOwner.release();clearGeometryHandles();}
   program=candidate.base;candidate.base=undefined;candidate.baseContext=undefined;partitionPrograms.clear();for(const[key,value]of candidate.mainPrograms??[])if(!key.startsWith('@'))partitionPrograms.set(key,value);heldCaptureDemandKeys.clear();for(const demand of captureDemands.values())demand.heldKeys.clear();transferCandidateCaptureRoles(candidate);partitionFailures.clear();partitionVisibleKeys=[];partitionPending=false;partitionCompileAttempt=undefined;texturedProgram=candidate.mainPrograms?.get('@window');diffuseProgram=candidate.mainPrograms?.get('@diffuse');textureShaderFailure=candidate.windowFailure;diffuseShaderFailure=candidate.diffuseFailure;textureShaderAttempted=!!texturedProgram||!!textureShaderFailure;diffuseShaderAttempted=!!diffuseProgram||!!diffuseShaderFailure;candidate.mainPrograms?.clear();candidate.mainContext=undefined;geometryUploadPending=false;geometryUploadFailure=undefined;residentMainRequiredKeys=new Set(candidate.requiredMainKeys??[]);residentMainRequiredStamp=candidate.mainReadyStamp;residentMainPreparedStamp=candidate.mainReadyStamp;residentMainFailure=undefined;invalidateMainDraw();viewRevision=Math.max(viewRevision,oldViewRevision)+1;matrix=undefined;residentChunkDependencies=candidate.chunkDependencies;candidate.chunkDependencies=undefined;published=true;pendingCandidate=undefined;candidate.closed=true;candidate.published=true;candidate.abortCleanup?.();candidate.abortCleanup=undefined;candidate.snapshot=undefined;candidate.chunks=undefined;candidate.args=undefined;candidate.programDataPending=undefined;candidate.sourceKeys=undefined;candidateFailure=undefined;candidateFailureGeneration=undefined;mainGeometryProgramFailure=undefined;captureRuntime.invalidate();reflectionResidentRevision++;
   if(oldProgram)programPreparation.releaseProgram(context,oldProgram);for(const p of oldPartitions.values())programPreparation.releaseProgram(context,p);if(oldTextured)programPreparation.releaseProgram(context,oldTextured);if(oldDiffuse)programPreparation.releaseProgram(context,oldDiffuse);releaseSolarPrograms();
   // A replaced scene-level mask that no chunk owns (the initial or empty-scene
   // scratch) has no other retirement path: destroy it and return its reservation.
   if(previous.masks!==rathausProxyMasks&&!sceneChunks.some(c=>c.masks===previous.masks)&&!oldChunks.some(c=>c.masks===previous.masks))previous.masks.destroy();
   releaseStreamChunks(oldChunks);oldChunkDependencies?.release();if(oldPlan!==publishedProgramPlan)oldPlan?.release();finishResidentUpload();residentGPU?.published();uploadShadow();map.triggerRepaint();
  }finally{if(!published){previous.restore();geometryUploadPending=oldGeometryPending;if(gl.isContextLost())geometryResidentUploaded=false;}transientResidentScope=previousTransientScope;releaseSupersededScopes();}
 }
 function assignGeometry(value:NonNullable<ReturnType<typeof geometryOwner.upload>>){mainGeometryIdentity++;invalidateMainDraw();vao=value.vao;indexBuffer=value.indexBuffer;vertexBuffer=value.buffers.get('vertex');stateBuffer=value.buffers.get('state');paintBuffer=value.buffers.get('paint');progressiveBuffer=value.buffers.get('progressive');}
 function clearGeometryHandles(){mainGeometryIdentity++;invalidateMainDraw();vao=undefined;vertexBuffer=undefined;indexBuffer=undefined;stateBuffer=undefined;paintBuffer=undefined;progressiveBuffer=undefined;geometryResidentUploaded=false;}

 const programPreparation=createProgramPreparationOwner('root500 '+city,()=>{if(!destroyed)map.triggerRepaint();});
 // Store listeners (packed chunk and chunk state leases) keep their onChange for
 // the lease's whole life. A renderer-scope callback captures no packing or
 // candidate scope; an inline arrow would pin its enclosing loop/candidate.
 const repaintMap=()=>{if(!destroyed)map.triggerRepaint();};
 const programGrantHandoff=createProgramGrantHandoff<WebGL2RenderingContext,WebGLProgram>((context,value)=>programPreparation.releaseProgram(context,value));
 let programHandoffRevision=0;
 function clearProgramGrantHandoff(expectedRevision=programHandoffRevision){if(expectedRevision!==programHandoffRevision)return expectedRevision;const revision=++programHandoffRevision;programGrantHandoff.clear();return revision;}
 let captureStateRevision=0,reflectionResidentRevision=0;const reflectionClipUniforms=createResidentReflectionUniforms(),reflectionObjectID=createResidentReflectionObjects();

 let sceneEnvironment=defaultSceneEnvironment(mobile),ownerReducedMotion=reducedMotion;let sceneSunInstant=sceneEnvironment.instantISO,sceneSunOrigin:[number,number]=[0,0],sceneSun=sceneSolarLight(0,0,sceneSunInstant);const uploadSceneLight=createSceneLightUniforms();
 let solarBoundary:PreparedSolarBoundary|undefined,shadowSourceBoundarySHA='',fixedShadowIndexBytes=0,solarShadowAdmitted=0,solarShadowWithheld=0,solarShadowMode='awaiting-boundary',solarShadowSignature='';let solarShadowAdmittedKeys=new Set<string>();
 let ownerDisplayBudget:OwnerDisplayBudgetDiagnostic|undefined;
 let legacyPartitionEnabled=false;
 const partitionEnabled=true; // Every root500 city uses explicit family recipes, including first use.
 let tvBaseRepairProgramReady=false;let tvBaseRepairPlan:BETVBaseRepairPlan1={enabled:false,reason:'not committed'},tvBaseRepairPaint:any={written:0},tvBaseWest70Active=false;

 // Initial/non-paint programs retain the exact main and non-paint closure. They
 // are never a substitute for an unprepared mode-2 family draw.

 function legacyProgramKey(raw:number){const semantic=raw>=1000000?Math.floor(Math.fround(raw/10000)):raw;return legacyPartitionEnabled?paintProgramKey(semantic>=1000?Math.floor(Math.fround(semantic+.5)):semantic,city):'base';}
 function overrideSourceKey(value:number){return legacyPartitionEnabled?paintProgramKey(value>=1000?Math.floor(Math.fround(value+.5)):value,city):'base';}
 function activeFamilyKey(key:string){const value=paintOverride();return value===0?key:overriddenFamilyPaintKey(key,value,overrideSourceKey);}
 function familySource(key:string){return familyPaintRecipe(key);}
 function pruneFamilySource(key:string){return legacyPartitionEnabled&&(key==='base'||genericBerlinOwnerExclusionCertified(key,city)||genericDusseldorfProgramCertified(key,city)||(city==='dusseldorf'&&key==='owner6353')||(city==='dusseldorf'&&key==='owner6426')||(city==='dusseldorf'&&key==='owner6386')||(city==='dusseldorf'&&key==='owner6356')||(city==='dusseldorf'&&key==='owner6354')||(city==='dusseldorf'&&key==='owner6355')||(city==='frankfurt'&&key==='owner6417')||(city==='frankfurt'&&key==='owner6350')||(city==='frankfurt'&&(key==='owner6348'||key==='owner6349'||key==='owner6352'||key==='owner6424'||key==='owner6421'||key==='owner6428'||key==='owner6434'||key==='owner6436'||key==='owner6430'||key==='owner6427'))||(city==='cologne'&&key==='owner6403')||(city==='cologne'&&key==='owner6408')||(city==='cologne'&&key==='owner6411')||(city==='cologne'&&key==='owner6345')||(city==='cologne'&&(key==='owner6343'||key==='owner6342'||key==='owner6347'))||(city==='hamburg'&&(key==='child1681'||key==='owner6319'||key==='owner6384'||key==='owner6399'||key==='owner6394'||key==='owner6398'||key==='owner6391'||key==='owner6381'||key==='owner6380'||key==='owner6375'||key==='owner6373'||key==='owner6371'||key==='owner6368'||key==='owner6366'||key==='owner6364'||key==='owner6362'||key==='owner6358'||key==='owner6331'||key==='owner6327'||key==='owner6326'||key==='owner6324'||key==='owner6321'||key==='owner6365'||key==='owner6363'||key==='owner6361'||key==='owner6360'||key==='owner6359'||key==='owner6323'||key==='owner6320'||key==='owner6335'||key==='owner6332'||key==='owner6330'||key==='owner6329'||key==='owner6325'||key==='owner6322'))||(city==='cologne'&&key==='owner6344')||(city==='cologne'&&key==='owner6346')||(city==='frankfurt'&&key==='owner6351')||(city==='munich'&&key==='owner6431')||(city==='munich'&&key==='owner6433')||(city==='munich'&&key==='owner6437')||(city==='munich'&&(key==='owner6337'||key==='owner6338'||key==='owner6339'||key==='owner6340'||key==='owner6341'))||city==='berlin'&&(key==='owner6333'||key==='owner6334'||key==='owner6300'||key==='owner6301'||key==='owner6302'||key==='owner6303'||key==='owner6304'||key==='owner6305'||key==='owner6306'||key==='owner6307'||key==='owner6308'||key==='owner6309'||key==='owner6310'||key==='owner6317'||key==='owner6316'||key==='owner6318'||key==='owner6314'||key==='owner6315'||key==='owner6311'||key==='owner6312'||key==='owner6313'));}
 const partitionPrograms=new Map<string,WebGLProgram>(),partitionFailures=new Map<string,string>();let partitionRuns:FamilyPaintRun[]=[],partitionPending=false;let partitionVisibleKeys:string[]=[],partitionRenderCount=0,partitionLastRenderAt:string|undefined;let offscreenPaintRunsSkipped=0;let partitionCompileAttempt:{key:string;startedAt:string;state:'started'|'ready'|'failed';elapsedMs?:number;error?:string}|undefined;
 const programIdleRetirement=createPaintProgramIdleRetirement({
  programs:partitionPrograms,
  required:()=>(!matrix) && !destroyed && !pageHidden && enabled
   ? new Set(partitionPrograms.keys()) : retainedPaintKeys(),
  release:value=>{if(gl)programPreparation.releaseProgram(gl, value);}
 });

 let progressiveShaderSpecialization:ReturnType<typeof importedRoot500_facadePaintSpecializationForCity>|undefined;
 const diagnosticParams=new URLSearchParams(location.search);const progressiveDiagnostic=location.hostname==='127.0.0.1'&&diagnosticParams.get('sample')?.startsWith('progressive-')?diagnosticParams.get('paintDiagnostic'):null;
 const immutableAltesSourceReadback=createNativeSourceReadback(city==='stuttgart'&&location.hostname==='127.0.0.1'&&diagnosticParams.get('diagnostics')==='1'&&diagnosticParams.get('sample')==='progressive-stuttgart-22988');
 let rathausProxyMasks=createRathausProxyMasks();let s434DisplayProfile:S434AggregateProfile|null=null;let s434PackingDiagnostic:S434AggregatePackingState['diagnostic']|undefined;let s434Owner138Plan:S434AggregatePackingState|undefined;let s434DrawableCounts=new Map<string,number>();let partialGateDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s402ConnectorDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s036NorthCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let s240BaseCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};let f151CrownDisplay={enabled:false,reason:'not committed',maskedVertices:0,maskedTriangles:0,sourceRetained:true,sourceDisplayDifference:false};
 let generation=0,viewRevision=0,enabled=false,opacity=1,opacityContext:'normal'|'route-selection'='normal',destroyed=false,gl:WebGL2RenderingContext|undefined,program:WebGLProgram|undefined,texturedProgram:WebGLProgram|undefined,diffuseProgram:WebGLProgram|undefined,diffuseShaderFailure:string|undefined,diffuseShaderAttempted=false,textureShaderFailure:string|undefined,textureShaderAttempted=false,vao:WebGLVertexArrayObject|undefined,vertexBuffer:WebGLBuffer|undefined,indexBuffer:WebGLBuffer|undefined,stateBuffer:WebGLBuffer|undefined,paintBuffer:WebGLBuffer|undefined;
 let mainGeometryProgramFailure:string|undefined;
 let ownerReconstruction:OwnerReconstructionStats={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};
 let matrix:Float64Array|undefined,anchor:[number,number]=[0,0],anchorUnit=1,sourceLoaded=new Map<string,BuildingComponent>(),nativeGroupPlan:NativeGroupDisplayPlan|undefined,loaded=new Map<string,BuildingComponent&{generation:number;box:number[];start:number;end:number;firstVertex:number;lastVertex:number}>();const vertexCap=mobile?100000:200000;let selectedIdentity:Identity|undefined,selectionActive=true;const birth=new Map<string,number>(),seenBirth=new Set<string>(),BIRTH_LIMIT=20000;let progressiveBuffer:WebGLBuffer|undefined;let materialAnchor:[number,number]|undefined,materialUnit=1,needsBirth=true,pageHidden=false;
 const shadowMask=createProjectedShadowMask({requestRepaint:()=>{if(!destroyed)map.triggerRepaint();}});
 let shadowProgram:WebGLProgram|undefined,shadowVao:WebGLVertexArrayObject|undefined,shadowIndexBuffer:WebGLBuffer|undefined,shadowAdmittedComponents=0,shadowFailure=false,shadowDraws=0;
 const repaintPaint=()=>{reconcileProgramDemand();map.triggerRepaint();};const paintCamera=(event:Event)=>{const p=(event as CustomEvent<{bearing?:number;pitch?:number;zoom?:number;center?:[number,number]}>).detail;(map as MapSurface&{easeTo?:(p:{pitch:number;bearing:number;zoom:number;duration:number;center?:[number,number]})=>void}).easeTo?.({pitch:p?.pitch??60,bearing:p?.bearing??230,zoom:p?.zoom??17.2,duration:250,...(p?.center?{center:p.center}:{})});};document.addEventListener('facade-paint-camera',paintCamera);document.addEventListener('facade-paint-change',repaintPaint);const move=()=>{viewRevision++;matrix=undefined;recordCandidateMainView(undefined);reconcileProgramDemand();};map.on('move',move);map.on('resize',move);

 function retireShadowGeometry(){streamShadowRevision++;shadowPreparationSignature='';shadowMask.release();if(gl?.isContextLost())shadowGeometryOwner.contextLost();else shadowGeometryOwner.release();for(const chunk of sceneChunks)chunk.shadow=undefined;shadowVao=undefined;shadowIndexBuffer=undefined;}
 function releaseShadowGPU(){retireShadowGeometry();if(gl&&shadowProgram)programPreparation.releaseProgram(gl,shadowProgram);shadowProgram=undefined;}
 function admitShadow(value?:ShadowBatchAdmission){
  fixedShadowIndexBytes=0;shadowSourceBoundarySHA='';solarShadowSignature='';solarShadowAdmitted=solarShadowWithheld=0;shadowAdmittedComponents=0;shadowFailure=false;
  const p=value?.profile;
  if(!value||!p||p.schema_version!==1||p.city!==city||!/^([a-f0-9]{64})$/.test(value.verifiedBoundarySHA256)||p.source_boundary_sha256!==value.verifiedBoundarySHA256||p.status!=='display-schematic'||p.includes_growth_zero_to_one!==true||p.swept_bbox_actual_city_covered!==true||!Array.isArray(p.fixed_vector)||p.fixed_vector.length!==2||!p.fixed_vector.every((v,i)=>v===SOURCE_SHADOW_VECTOR[i])||!Array.isArray(value.components)||value.components.length>sourceLoaded.size)return;
  const admitted=new Map<string,number>();for(const e of value.components){if(!e||typeof e.objectId!=='string'||typeof e.partId!=='string'||!Number.isSafeInteger(e.triangleCount)||e.triangleCount<=0||admitted.has(key(e)))return;admitted.set(key(e),e.triangleCount);}
  const ranges=[];let count=0;for(const [id,c]of loaded){if(admitted.get(id)===(c.end-c.start)/3||s196ArchShadowSubset(sourceLoaded.get(id),sourceLoaded.get(id)?sourceRoleDisplayProfile(sourceLoaded.get(id)!):null,admitted.get(id)??-1,(c.end-c.start)/3)||!!sourceLoaded.get(id)&&(beTVBaseRepairShadowAdmission1(sourceLoaded.get(id)!,admitted.get(id)??-1,(c.end-c.start)/3,tvBaseRepairPlan)||beTVBaseWestFold70ShadowAdmission(sourceLoaded.get(id)!,admitted.get(id)??-1,(c.end-c.start)/3,tvBaseWest70Active))){ranges.push(c);count+=c.end-c.start;}}
  if(count>sceneIndexCount())return;fixedShadowIndexBytes=count*Uint32Array.BYTES_PER_ELEMENT;shadowAdmittedComponents=ranges.length;shadowSourceBoundarySHA=value.verifiedBoundarySHA256;
 }
 function sceneShadowIndexCount(){return sceneChunks.reduce((sum,chunk)=>sum+chunk.shadowIndices.length,0);}
 function updateSolarShadowIndices(){
  solarShadowAdmittedKeys.clear();solarShadowAdmitted=0;solarShadowWithheld=loaded.size;
  const clear=(mode:string)=>{solarShadowMode=mode;solarShadowSignature='none';const changed=sceneShadowIndexCount()>0;for(const chunk of sceneChunks){chunk.shadowCPU?.release();chunk.shadowCPU=undefined;chunk.shadowIndices=new Uint32Array();}return changed;};
  if(!sceneSun.shadowVector)return clear('sun-below-shadow-altitude');if(!solarBoundary)return clear('awaiting-matching-verified-boundary');
  const ranges=residentSolarShadowRanges(sceneSunOrigin,loaded.values(),sceneSun,solarBoundary,generation,sceneIndexCount());for(const row of ranges)solarShadowAdmittedKeys.add(key(row));solarShadowAdmitted=ranges.length;solarShadowWithheld=loaded.size-ranges.length;solarShadowMode=solarShadowWithheld?'solar-projected-partial':'solar-projected';
  const signature=indexedResourceKey('solar-shadow-rows-v1',ranges,component=>{const local=localComponent(component);return local?.chunk.cpu?[local.chunk.cpu.contentKey,[local.row.start,local.row.end]]:undefined;});if(signature===solarShadowSignature)return false;
  const next:{chunk:StreamChunk;lease?:ChunkResourceLease<Uint32Array>}[]=[];
  try{for(const chunk of sceneChunks){const packed=chunk.cpu.value;if(!packed)throw Error('Root500 shadow source retired');const rows=ranges.flatMap(component=>{const row=chunk.loaded.get(key(component));return row?[row]:[];}),size=rows.reduce((n,row)=>n+row.end-row.start,0);if(!size){next.push({chunk});continue;}
   const lease=sceneChunkInput!.store.acquire<Uint32Array>({contentKey:JSON.stringify([packed.contentKey,'solar-indices-v2',rows.map(row=>[row.start,row.end])]),role:'solar',parents:[chunk.cpu],estimate:{category:'shadow',bytes:size*4,precision:'exact'},produce(){const value=new Uint32Array(size);let at=0;for(const row of rows){value.set(packed.indices.subarray(row.start,row.end),at);at+=row.end-row.start;}return value;},costs:value=>({category:'shadow',bytes:value.buffer.byteLength,precision:'exact',identity:value.buffer})});next.push({chunk,lease});if(!lease.value)throw Error('Root500 shadow indices not ready');
  }for(const row of next){row.chunk.shadowCPU?.release();row.chunk.shadowCPU=row.lease;row.chunk.shadowIndices=row.lease?.value??new Uint32Array();}solarShadowSignature=signature;return true;}catch(error){for(const row of next)row.lease?.release();throw error;}
 }
 let shadowPreparationSignature='',streamShadowRevision=0;
 function uploadShadow(){shadowUploadPending=true;prepareShadowUpload();}
 function prepareShadowUpload(){
  if(!shadowUploadPending)return;if(!gl||!sceneShadowIndexCount()){shadowUploadPending=false;releaseShadowGPU();return;}const context=gl,signature=solarShadowSignature,mainVersion=geometryOwner.scene.version;
  if(!sceneChunks.every(chunk=>!chunk.shadowIndices.length||chunk.geometry?.value))return;
  try{if(!shadowProgram)shadowProgram=programPreparation.compile(context,{resource:'projected-shadow',inputs:[S402_SHADOW_VERTEX_GLSL,S402_SHADOW_FRAGMENT_GLSL],budget:{sourceBytesUpperBound:2*(S402_SHADOW_VERTEX_GLSL.length+S402_SHADOW_FRAGMENT_GLSL.length)},priority:'visible',build(){return{vertex:S402_SHADOW_VERTEX_GLSL,fragment:S402_SHADOW_FRAGMENT_GLSL,attributes:[]};}});
   const selected=shadowProgram,preparation=signature+'|'+mainVersion;if(preparation!==shadowPreparationSignature){shadowPreparationSignature=preparation;streamShadowRevision++;}const revision=streamShadowRevision,current=()=>!destroyed&&!pageHidden&&gl===context&&!context.isContextLost()&&streamShadowRevision===revision&&solarShadowSignature===signature&&geometryOwner.scene.version===mainVersion;
   programPreparation.work(context,{resource:'shadow-geometry-upload',revision,retainReady:false,current,work(){
    const leases:ResidentGeometryLease[]=[],owners:StreamChunk[]=[];try{for(const chunk of sceneChunks){if(!chunk.shadowIndices.length)continue;const main=chunk.geometry!,geometry=main.value!;owners.push(chunk);leases.push(shadowGeometryOwner.allocate(context,selected,{revision,contentKey:JSON.stringify([main.contentKey,'projected-shadow-v2',chunk.shadowCPU!.contentKey]),parents:[main,chunk.shadowCPU!],current,indices:chunk.shadowIndices,buffers:[
     {key:'vertex',buffer:geometry.buffers.get('vertex')!,attributes:[{name:'a_position',size:3,stride:36,offset:0}]},
     {key:'state',buffer:geometry.buffers.get('state')!,attributes:[{name:'a_selected',size:1,stride:4,offset:0}]},
     {key:'paint',buffer:geometry.buffers.get('paint')!,attributes:[{name:'a_s402_frame',size:2,stride:20,offset:0}]},
     {key:'progressive',buffer:geometry.buffers.get('progressive')!,attributes:[{name:'a_s402_alpha',size:1,stride:16,offset:12}]},
    ]}));}if(!shadowGeometryOwner.publish(leases,{generation,context,current}))throw new DOMException('Root500 shadow publication superseded','AbortError');for(const chunk of sceneChunks)chunk.shadow=undefined;for(let i=0;i<owners.length;i++)owners[i].shadow=shadowGeometryOwner.currentLeases.find(lease=>lease.contentKey===leases[i].contentKey);const first=shadowGeometryOwner.currentGeometries[0];shadowVao=first?.vao;shadowIndexBuffer=first?.indexBuffer;shadowUploadPending=false;shadowFailure=false;}finally{for(const lease of leases)lease.release();}
   }});
  }catch(error){if(isProgramPreparationPending(error))return;shadowUploadPending=false;shadowFailure=true;releaseShadowGPU();}
 }
 function drawProjectedShadows(alpha:number){
  if(!gl||!shadowProgram||!matrix||!candidateMainMatrix||shadowUploadPending)return;const context=gl,p=shadowProgram,projection=candidateMainMatrix;context.useProgram(p);context.enable(context.DEPTH_TEST);context.depthFunc(context.LEQUAL);context.depthMask(false);context.disable(context.CULL_FACE);context.enable(context.BLEND);context.blendFuncSeparate(context.SRC_ALPHA,context.ONE_MINUS_SRC_ALPHA,context.ONE,context.ONE_MINUS_SRC_ALPHA);context.uniform1f(context.getUniformLocation(p,'u_shadow_opacity'),alpha);const vector=sceneSun.shadowVector;context.uniform2f(context.getUniformLocation(p,'u_shadow_vector'),vector?.[0]??0,vector?.[1]??0);context.uniform1f(context.getUniformLocation(p,'u_s402_paint_mode'),paintMode());
  // All chunks contribute to one coverage union. Align their local .03 plane
  // to the scene plane so overlap opacity and depth are unchanged.
  if(shadowMask.draw(context,matrix,.03,()=>{
   const batch=createResidentTriangleDrawBatch(context);
   const matrixLocation=chunkUniforms(context,p).matrix;
   try{
    for(const chunk of sceneChunks){
     if(!chunk.shadowIndices.length)continue;
     const geometry=chunk.shadow?.value,packed=chunk.cpu.value;
     if(!geometry||!packed)throw Error('Root500 projected shadow chunk unavailable');
     const scale=1/chunk.source.frame.unit;
     const clip=multiply(projection,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,packed.anchor[0],packed.anchor[1],.03/anchorUnit-.03*scale,1]);
     context.bindVertexArray(geometry.vao);
     context.uniformMatrix4fv(matrixLocation,false,new Float32Array(clip));
     batch.draw(geometry.vao,chunk.shadowIndices.length,0);
    }
   }finally{batch.restore();}
  }))shadowDraws++;
 }


 // CPU arrays are already in their GPU layout. A pending replacement keeps one uploaded fallback by reference.
 let configuredDataScope:FrozenDataScope|undefined;
 let residentMaterialStyles:number[]=[];
 function releaseSupersededScopes(){for(const [scope,release]of generationScopePins)if(scope!==residentScope&&scope!==transientResidentScope&&scope!==pendingCandidate?.scope){generationScopePins.delete(scope);release();}}
 function snapshotResident(){const values=[sceneChunks,sceneSpans,sceneChunkInput,residentProgressiveStatus,residentScope,configuredDataScope,publishedProgramPlan,legacyPartitionEnabled,progressiveShaderSpecialization,ownerReconstruction,heldSourceOutlines,s434PackingDiagnostic,s434DrawableCounts,s434DisplayProfile,ownerDisplayBudget,s434Owner138Plan,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,loaded,landmarkVisible,rathausProxyMasks,partitionRuns,fixedShadowIndexBytes,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowAdmittedKeys,solarShadowMode,residentMaterialStyles,tvBaseRepairProgramReady,tvBaseRepairPlan,tvBaseRepairPaint,tvBaseWest70Active]as const,scope=residentScope,masks=rathausProxyMasks;return{scope,masks,chunks:sceneChunks,plan:publishedProgramPlan,restore(){[sceneChunks,sceneSpans,sceneChunkInput,residentProgressiveStatus,residentScope,configuredDataScope,publishedProgramPlan,legacyPartitionEnabled,progressiveShaderSpecialization,ownerReconstruction,heldSourceOutlines,s434PackingDiagnostic,s434DrawableCounts,s434DisplayProfile,ownerDisplayBudget,s434Owner138Plan,sourceLoaded,nativeGroupPlan,generation,needsBirth,viewRevision,matrix,sceneSunOrigin,sceneSun,anchor,anchorUnit,materialAnchor,materialUnit,partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,loaded,landmarkVisible,rathausProxyMasks,partitionRuns,fixedShadowIndexBytes,shadowSourceBoundarySHA,solarShadowSignature,solarShadowAdmitted,solarShadowWithheld,shadowAdmittedComponents,shadowFailure,solarShadowAdmittedKeys,solarShadowMode,residentMaterialStyles,tvBaseRepairProgramReady,tvBaseRepairPlan,tvBaseRepairPaint,tvBaseWest70Active]=values;}};}
 function finishResidentUpload(){retireUnloadedBirths();releaseSupersededScopes();syncFacadeResources();syncCandidateMaterials();}
 function componentGrowth(identity:Identity){const local=localComponent(identity),state=local?.chunk.state?.value;return local&&state?state[local.row.firstVertex]%2:0;}
 function uploadChunkState(chunk:StreamChunk,first:number,last:number){const data=chunk.state?.value,buffer=chunk.geometry?.value?.buffers.get('state');if(geometryUploadPending||!gl||!buffer||!data||last<=first)return;const context=gl,old=context.getParameter(context.ARRAY_BUFFER_BINDING);try{context.bindBuffer(context.ARRAY_BUFFER,buffer);context.bufferSubData(context.ARRAY_BUFFER,first*4,data.subarray(first,last));}finally{if(!context.isContextLost())context.bindBuffer(context.ARRAY_BUFFER,old);}reflectionResidentRevision++;}
 let geometryUploadRevision=0,geometryResidentUploaded=false,geometryUploadPending=false,geometryUploadFailure:string|undefined,shadowUploadPending=false;
 function prepareGeometryUpload(){
  if(!gl||!programsReady()||!geometryUploadPending||geometryUploadFailure)return;
  const revision=geometryUploadRevision;
  try{programPreparation.work(gl,{resource:'geometry-upload',revision,retainReady:false,current:()=>revision===geometryUploadRevision&&!destroyed&&!pageHidden&&programsReady(),work(){uploadPreparedGeometry();geometryUploadPending=false;if(mainGeometryProgramFailure?.startsWith('Geometry upload: '))mainGeometryProgramFailure=undefined;}});}
  catch(error){if(gl?.isContextLost())geometryResidentUploaded=false;geometryUploadFailure=String(error).slice(0,512);mainGeometryProgramFailure='Geometry upload: '+geometryUploadFailure;}
 }
 function upload(){captureRuntime.invalidate();geometryUploadRevision++;geometryUploadPending=true;geometryUploadFailure=undefined;if(!gl)return;if(!programsReady()){residentGPU?.beforeUpload();if(!programsReady())return;}prepareGeometryUpload();}
 function uploadPreparedGeometry(){if(!gl||!program)return;const context=gl,plan=publishedProgramPlan,revision=geometryUploadRevision,uploaded=publishStreamGeometry(context,program,sceneChunks,generation,()=>publishedProgramPlan===plan&&geometryUploadRevision===revision&&!destroyed&&!pageHidden&&gl===context&&!context.isContextLost());if(uploaded)assignGeometry(uploaded);geometryResidentUploaded=sceneIndexCount()>0;reflectionResidentRevision++;trimSolarPrograms();finishResidentUpload();residentGPU?.published();uploadShadow();}
 function rememberFinishedBirth(k:string){if(seenBirth.has(k))seenBirth.delete(k);seenBirth.add(k);}
 function reserveBirthSlot(){while(seenBirth.size+birth.size>=BIRTH_LIMIT){let evicted=false;const selected=selectedIdentity?key(selectedIdentity):undefined;for(const old of seenBirth){if(!loaded.has(old)&&old!==selected){seenBirth.delete(old);evicted=true;break;}}if(!evicted)return false;}return true;}
 function retireUnloadedBirths(){for(const k of birth.keys())if(!loaded.has(k)){birth.delete(k);rememberFinishedBirth(k);}}
 function grow(){if(!needsBirth&&!birth.size)return;const now=clock(),finished=new Set<string>();let changed=false,growing=false;for(const[k,time]of birth)if(now-time>=300){birth.delete(k);finished.add(k);rememberFinishedBirth(k);}for(const c of loaded.values()){const k=key(c);if(!needsBirth&&!birth.has(k)&&!finished.has(k))continue;const local=localComponent(c),state=local?.chunk.state?.value;if(!local||!state)continue;const row=local.row;if(reducedMotion&&!seenBirth.has(k)){if(reserveBirthSlot())rememberFinishedBirth(k);}else if(seenBirth.has(k)){seenBirth.delete(k);seenBirth.add(k);}if(!reducedMotion&&!seenBirth.has(k)&&!birth.has(k)&&reserveBirthSlot())birth.set(k,now);const time=birth.get(k),t=reducedMotion||time===undefined?1:Math.max(0,Math.min(1,(now-time)/300)),growth=t*t*(3-2*t);growing ||= growth<1;if(Math.abs((state[row.firstVertex]%2)-growth)<=1e-6)continue;for(let i=row.firstVertex;i<row.lastVertex;i++){const value=state[i],style=Math.floor(value/4),select=Math.floor((value%4)/2);state[i]=style*4+select*2+growth;}uploadChunkState(local.chunk,row.firstVertex,row.lastVertex);changed=true;}needsBirth=false;if(changed){captureStateRevision++;viewRevision++;}if(!pageHidden&&(growing||birth.size===0))map.triggerRepaint();}
 function programsReady(){return !!(publishedProgramPlan&&configuredDataScope===residentScope&&gl&&program&&!gl.isContextLost());}
 function gpuReady(){return programsReady()&&geometryResidentUploaded&&!!(vao&&vertexBuffer&&indexBuffer&&stateBuffer&&paintBuffer&&progressiveBuffer)&&sceneChunks.length>0&&sceneChunks.every(chunk=>!!chunk.geometry?.value&&chunk.geometry.context===gl&&chunk.geometry.epoch===sceneChunkInput?.store.contextEpoch(gl!));}
 let contextRecoveryAttempts=0,contextRecoverySuccesses=0,contextRecoveryPending=false,contextRecoveryFailure:string|undefined;
 function contextLost(){contextRecoveryPending=false;programPreparation.contextLost();releaseGPU();}
 function contextRestored(){
  if(destroyed||!gl||gl.isContextLost())return;
  contextRecoveryAttempts++;contextRecoveryPending=true;contextRecoveryFailure=undefined;const before=programPreparation.budgetWaits;
  try{layer.onAdd(map,gl);move();map.triggerRepaint();}
  catch(error){if(isProgramPreparationPending(error)){if(programPreparation.needsFrameAfter?.(before)!==false)map.triggerRepaint();return;}contextRecoveryPending=false;contextRecoveryFailure=String(error);mainGeometryProgramFailure='WebGL context recovery: '+contextRecoveryFailure;}
 }
 map.on('webglcontextlost',contextLost);map.on('webglcontextrestored',contextRestored);
 let heldSourceOutlines:ReturnType<typeof exactNativePartDisplay>['held']=[];let landmarkVisible=false,facadeAttached=false;
 function syncCandidateMaterials(){const styles=[...residentMaterialStyles,...(pendingCandidate?.mainMaterialStyles??[])];diffuseTexture?.setNeededMaterials(styles.map(style=>({material:style%8,roof:style>=32})));}
 function syncFacadeResources(){syncCandidateMaterials();const want=enabled&&(landmarkVisible||!!pendingCandidate?.mainTextureWanted)&&!pageHidden&&paintMode()===1;windowTexture?.setUploadSize(128);diffuseTexture?.setUploadSize(128);windowTexture?.setEnabled(want);diffuseTexture?.setEnabled(want);if(want&&gl&&!facadeAttached){windowTexture?.attach(gl);diffuseTexture?.attach(gl);facadeAttached=true;}else if(!want&&facadeAttached){windowTexture?.detach();diffuseTexture?.detach();facadeAttached=false;if(gl){if(texturedProgram)programPreparation.releaseProgram(gl!,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl!,diffuseProgram);}texturedProgram=undefined;diffuseProgram=undefined;textureShaderAttempted=false;diffuseShaderAttempted=false;}}
 // Solar capture owns no second program cache. The same colour recipe keeps
 // its original main/discard/gl_FragDepth; the solar target disables all colour writes.
 const solarProgramFailures=new Map<string,string>();let solarProgramRevision=0;
 let solarPreparationIndex:{generation:number;planIdentity:string|undefined;legacy:boolean;helper:string;override:number;runs:readonly FamilyPaintRun[];keys:readonly string[]}|undefined;
 function releaseSolarPrograms(){solarPreparationIndex=undefined;solarProgramFailures.clear();solarProgramRevision++;}
 // One conservative main-view demand serves draw, preparation, liveness and trim.
 function mainPaintRuns(){
  if(!matrix)return partitionRuns;
  // installChunkScene replaces loaded/spans/runs together; snapshot restore
  // keeps that publication identity. Growth/selection only update state arrays.
  return readPaintVisibility(loaded,partitionRuns,matrix,{publication:sceneSpans,generation,viewRevision,incarnation:mainGPUIncarnation,context:gl,active:true,retainNearPlane:true}).runs;
 }
 function borrowSourceComponent(identity:Identity){if(!sourceLoaded.size&&!loaded.size)return undefined;return (isF107DerivedDisplayIdentity(identity)||isF082DerivedDisplayIdentity(identity)||isF075DerivedDisplayIdentity(identity)||isF068DerivedDisplayIdentity(identity))?undefined:sourceLoaded.has(key(identity))&&(ownerReconstructionIdentity(sourceLoaded.get(key(identity))!)||beTVBaseRepairIdentity1(sourceLoaded.get(key(identity))!))?{...sourceLoaded.get(key(identity))!,generation}:loaded.get(key(identity))??(sourceLoaded.has(key(identity))?{...sourceLoaded.get(key(identity))!,generation}:undefined);}
 function borrowSurfaceComponent(identity:Identity){return loaded.get(key(identity));}
 function resourceResidency(preparation=programPreparation.stats){
  const main=new Set([...mainPaintKeys(),...mainMaterialKeys()]),capture=new Set([...capturePaintKeys(),...captureMaterialKeys()]),resident=publishedProgramPlan,candidate=pendingCandidate;
  return{mainProjectionKnown:!!matrix,captureTokens:[...captureDemands].map(([kind,value])=>({kind,token:value.token.slice(0,256),heldCount:value.heldKeys.size,heldKeys:[...value.heldKeys].slice(0,32)})),programObjects:preparation.resourceObjects,grantedReferences:preparation.shared.grantedReferences,releasedReferences:preparation.shared.releasedReferences,generation,viewRevision,publishedPlan:resident?.identity,candidatePlan:candidate?.plan.identity,candidateRevision:candidate?.revision,mainKeys:[...main].slice(0,32),mainCount:main.size,captureKeys:[...capture].slice(0,32),captureCount:capture.size,cachedPrograms:partitionPrograms.size,captureOwnedCount:heldCaptureDemandKeys.size,captureOwnedKeys:[...heldCaptureDemandKeys].slice(0,32),publishedSourceCharacters:resident?.preparedSourceStats.sourceCharacters??0,publishedSourceBytes:resident?.sourceWorkingSetBytes??0,candidateMainRequiredCount:candidate?.requiredMainKeys?.size??0,candidateMainProgramCount:candidate?.mainPrograms?.size??0,candidateMainReady:!!candidate&&candidateMainReady(candidate),candidateMainViewRevision:candidateMainViewRevision,candidateSharesPublishedSourceOwner:!!candidate&&candidate.plan===resident,candidateSourceCharacters:candidate?.plan===resident?0:candidate?.plan.preparedSourceStats.sourceCharacters??0,candidateSourceBytes:candidate?.plan===resident?0:candidate?.plan.sourceWorkingSetBytes??0,geometry:{main:geometryOwner.stats,shadow:shadowGeometryOwner.stats}};
 }
 // Published runs and the visible subsets are immutable. Keep only their keys;
 // replacing a publication or changing an override cannot reuse its old demand.
 const keysByPaintRuns=new WeakMap<readonly FamilyPaintRun[],{override:number;legacy:boolean;keys:ReadonlySet<string>}>();
 function paintKeysForRuns(runs:readonly FamilyPaintRun[]):ReadonlySet<string>{
  const override=paintOverride(),cached=keysByPaintRuns.get(runs);
  if(cached?.override===override&&cached.legacy===legacyPartitionEnabled)return cached.keys;
  const keys=new Set<string>();
  for(const run of runs)keys.add(override===0?run.key:overriddenFamilyPaintKey(run.key,override,overrideSourceKey));
  keysByPaintRuns.set(runs,{override,legacy:legacyPartitionEnabled,keys});
  return keys;
 }
 function mainPaintKeys(){return !destroyed&&!pageHidden&&enabled&&partitionEnabled&&paintMode()>1.5?paintKeysForRuns(mainPaintRuns()):new Set<string>();}
 const heldCaptureDemandKeys=new Set<string>();
 const captureDemands=new Map<CaptureDemandChange['kind'],{token:string;keys?:Set<string>;heldKeys:Set<string>}>();
 function setCaptureDemand(change:CaptureDemandChange){
  const previous=captureDemands.get(change.kind);
  if(change.active){if(previous?.token!==change.token){captureRuntime.invalidate();captureDemands.set(change.kind,{token:change.token,keys:previous?.keys,heldKeys:previous?.heldKeys??new Set()});}}
  else{if(previous?.token!==change.token)return;captureDemands.delete(change.kind);captureRuntime.invalidate();}
  reconcileCaptureDemand();
 }
 function capturePaintKeys(){
  if(destroyed||pageHidden||!enabled||!partitionEnabled||paintMode()<=1.5)return new Set<string>();
  return new Set([...(solarProgramDemandActive()?solarResidentKeys():[]),...(captureDemands.get('reflection')?.keys??[])]);
 }
 function mainMaterialKeys(){return !destroyed&&!pageHidden&&enabled&&paintMode()===1&&landmarkVisible&&facadeAttached?[...(windowTexture&&surfaceFragment?['@window']:[]),...(windowTexture&&diffuseTexture&&diffuseFragment?['@diffuse']:[])]:[];}
 function captureMaterialKeys(){return captureDemands.size?mainMaterialKeys():[];}
 function forgetCaptureRole(key:string){heldCaptureDemandKeys.delete(key);for(const demand of captureDemands.values())demand.heldKeys.delete(key);}
 function retireInactiveCaptureRoles(){
  const required=new Set([...retainedPaintKeys(),...mainMaterialKeys(),...captureMaterialKeys()]);
  const retired=[...heldCaptureDemandKeys].filter(key=>!required.has(key));
  if(retired.length)captureRuntime.invalidate();
  for(const key of retired){
   const value=key==='@window'?texturedProgram:key==='@diffuse'?diffuseProgram:partitionPrograms.get(key);
   if(key==='@window'){texturedProgram=undefined;textureShaderAttempted=false;}else if(key==='@diffuse'){diffuseProgram=undefined;diffuseShaderAttempted=false;}else partitionPrograms.delete(key);
   forgetCaptureRole(key);if(value&&gl)programPreparation.releaseProgram(gl,value);
  }
  for(const key of [...heldCaptureDemandKeys])if(key==='@window'?!texturedProgram:key==='@diffuse'?!diffuseProgram:!partitionPrograms.has(key))forgetCaptureRole(key);
 }

 function retainedPaintKeys(){return new Set([...mainPaintKeys(),...capturePaintKeys()]);}
 function clearProgramSources(){publishedProgramPlan?.clearPreparedSource();if(pendingCandidate?.plan!==publishedProgramPlan)pendingCandidate?.plan.clearPreparedSource();}
 function clearSettledProgramSources(){
  const plan=publishedProgramPlan;if(!plan)return;
  if(destroyed||pageHidden||!enabled){plan.clearPreparedSource();return;}
  if(sceneIndexCount()&&!program&&!mainGeometryProgramFailure)return;
  if(partitionEnabled&&paintMode()>1.5){
   if([...mainPaintKeys()].some(key=>!partitionPrograms.has(key)&&!partitionFailures.has(key)))return;
   if([...capturePaintKeys()].some(key=>!partitionPrograms.has(key)&&!solarProgramFailures.has(key)))return;
  }
  if(captureMaterialKeys().some(key=>!(key==='@window'?texturedProgram:diffuseProgram)&&!solarProgramFailures.has(key)))return;
  if(paintMode()===1&&landmarkVisible&&facadeAttached){
   const window=windowTexture?.stats,diffuse=diffuseTexture?.stats;
   if(window?.textureObjects&&surfaceFragment&&!texturedProgram&&!textureShaderFailure)return;
   if(window?.textureObjects&&diffuse?.totalTextureObjects===2&&diffuseFragment&&!diffuseProgram&&!diffuseShaderFailure)return;
  }
  plan.clearPreparedSource();
 }
 function reconcileCaptureDemand(){if(pendingCandidate)pruneCandidateCaptureRoles(pendingCandidate);pruneGeometryRecipeConsumers();retireInactiveCaptureRoles();clearSettledProgramSources();}
 function reconcileProgramDemand(){if(pendingCandidate)pruneCandidateCaptureRoles(pendingCandidate);pruneGeometryRecipeConsumers();retireInactiveCaptureRoles();if(gl)trimInactivePaintPrograms(partitionPrograms,retainedPaintKeys(),p=>programPreparation.releaseProgram(gl!,p));programIdleRetirement.synchronize();clearSettledProgramSources();}
 function solarProgramDemandActive(){return captureDemands.has('solar')&&partitionEnabled&&paintMode()>1.5&&!destroyed&&!pageHidden&&enabled&&opacityContext!=='route-selection'&&opacity>=.99&&sceneEnvironment.sunlight&&sceneEnvironment.shadows&&!!sceneSun.shadowVector;}
 function geometryProgramDemand(planIdentity:string,recipeKey:string,baseRecipe:boolean,materialRecipe:boolean,mainOnly=false){
  if(destroyed||pageHidden||!gl||gl.isContextLost())return false;
  const transient=transientGeometryDemand;if(transient?.plan.identity===planIdentity&&!transient.scope.stats.disposed)return materialRecipe?transient.material:baseRecipe?transient.geometry||gpuPreflightRequired:transient.main.has(recipeKey)||!mainOnly&&transient.capture.has(recipeKey);
  const candidate=pendingCandidate;if(candidate?.plan.identity===planIdentity&&!candidate.closed&&!candidate.signal?.aborted&&!candidate.scope.stats.disposed)return materialRecipe?!!candidate.mainTextureWanted&&paintMode()===1:baseRecipe||!!candidate.requiredMainKeys?.has(recipeKey)||!mainOnly&&!!candidate.requiredCaptureKeys?.has(recipeKey);
  if(!enabled||publishedProgramPlan?.identity!==planIdentity||publishedProgramPlan.scope.stats.disposed)return false;
  if(materialRecipe)return paintMode()===1&&landmarkVisible&&facadeAttached;
  if(baseRecipe)return sceneIndexCount()>0||gpuPreflightRequired;
  if(!partitionEnabled||paintMode()<=1.5)return false;
  if((residentMainRequiredKeys??mainPaintKeys()).has(recipeKey))return true;
  if(mainOnly)return false;
  return captureDemands.get('reflection')?.keys?.has(recipeKey)===true||solarProgramDemandActive()&&solarResidentKeys().has(recipeKey);
 }
 function solarResidentKeys(){return paintKeysForRuns(partitionRuns);}
 function solarPreparationKeys(helper:string,resident:ReadonlySet<string>){
  const planIdentity=publishedProgramPlan?.identity,override=paintOverride(),previous=solarPreparationIndex;
  if(previous&&previous.keys.length===resident.size&&previous.keys.every(key=>resident.has(key))&&previous.generation===generation&&previous.planIdentity===planIdentity&&previous.legacy===legacyPartitionEnabled&&previous.helper===helper&&previous.override===override&&previous.runs===partitionRuns)return previous.keys;
  // Helper/material and pruning are fixed by this plan and sourceKey. Keep
  // first-seen recipe order, then the original family order inside each recipe.
  // This is only a light preparation index; capture and draw rows stay untouched.
  const groups=new Map<string,string[]>();
  for(const key of resident){const sourceKey=familySource(key).sourceKey,group=groups.get(sourceKey);if(group)group.push(key);else groups.set(sourceKey,[key]);}
  const keys=[...groups.values()].flat();solarPreparationIndex={generation,planIdentity,legacy:legacyPartitionEnabled,helper,override,runs:partitionRuns,keys};return keys;
 }
 function trimSolarPrograms(){const resident=solarResidentKeys();for(const key of solarProgramFailures.keys())if(!key.startsWith('@')&&(!resident.has(key)||partitionPrograms.has(key))){solarProgramFailures.delete(key);solarProgramRevision++;}return resident;}
 function prepareSolarPrograms(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  reconcileCaptureDemand();if(!solarProgramDemandActive()||needsBirth||birth.size)return solarShadowPreparation();
  return prepareCapturePrograms(trimSolarPrograms(),budget,'solar');
 }
 function prepareCapturePrograms(required:ReadonlySet<string>,budget:SolarShadowPreparationBudget,kind:CaptureDemandChange['kind']):SolarShadowPreparationResult{
  const demand=captureDemands.get(kind);if(demand){demand.keys=new Set(required);for(const key of [...demand.heldKeys])if(!key.startsWith('@')&&!required.has(key))demand.heldKeys.delete(key);}
  reconcileCaptureDemand();if(!required.size)return solarShadowPreparation();
  if(destroyed||pageHidden||!enabled)return solarShadowPreparation();
  if(!gl||gl.isContextLost()||!gpuReady())return solarShadowPreparation(0,required.size);
  const helper=baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}';
  let ready=0,pending=0,failed=0,budgetWaiting=0;
  for(const key of solarPreparationKeys(helper,required)){
   if(partitionPrograms.has(key)){if(heldCaptureDemandKeys.has(key))captureDemands.get(kind)?.heldKeys.add(key);ready++;continue;}
   if(solarProgramFailures.has(key)){failed++;continue;}
   const before=programPreparation.budgetWaits;try{
    const attempt=budget.compile('root500:'+city+':'+key,generation+':'+solarProgramRevision,()=>{const recipe=familySource(key);return compileGeometryProgram(helper,recipe.sourceKey,false,true,recipe.families,publishedProgramPlan,recipe.sourceKey);});
    if(attempt.status==='pending'){pending++;continue;}
    if(gl.isContextLost()){programPreparation.releaseProgram(gl,attempt.value);return solarShadowPreparation(ready,pending+1,failed);}
    partitionPrograms.set(key,attempt.value);heldCaptureDemandKeys.add(key);captureDemands.get(kind)?.heldKeys.add(key);solarProgramRevision++;ready++;
   }catch(error){if(isProgramPreparationPending(error)){pending++;if(programPreparation.needsFrameAfter?.(before)===false)budgetWaiting++;continue;}solarProgramFailures.set(key,String(error).slice(0,256));solarProgramRevision++;failed++;if(gl.isContextLost())return solarShadowPreparation(ready,pending+1,failed);}
  }
  clearSettledProgramSources();
  return solarShadowPreparation(ready,pending,failed,budgetWaiting);
 }
 function prepareCaptureMaterials(budget:SolarShadowPreparationBudget,kind:CaptureDemandChange['kind']):SolarShadowPreparationResult{
  let ready=0,pending=0,failed=0,budgetWaiting=0;
  for(const key of captureMaterialKeys()){
   if(key==='@window'?texturedProgram:diffuseProgram){if(heldCaptureDemandKeys.has(key))captureDemands.get(kind)?.heldKeys.add(key);ready++;continue;}
   if(solarProgramFailures.has(key)){failed++;continue;}
   if(!gl||gl.isContextLost()||!gpuReady()){pending++;continue;}
   const before=programPreparation.budgetWaits;try{
    const helper=key==='@window'?surfaceFragment!:diffuseFragment!,attempt=budget.compile('root500:'+city+':capture-material:'+key,generation+':'+solarProgramRevision,()=>compileGeometryProgram(helper,'base',undefined,true));
    if(attempt.status==='pending'){pending++;continue;}
    if(gl.isContextLost()){programPreparation.releaseProgram(gl,attempt.value);pending++;continue;}
    if(key==='@window'){texturedProgram=attempt.value;textureShaderFailure=undefined;}else{diffuseProgram=attempt.value;diffuseShaderFailure=undefined;}
    heldCaptureDemandKeys.add(key);captureDemands.get(kind)?.heldKeys.add(key);solarProgramFailures.delete(key);solarProgramRevision++;ready++;
   }catch(error){if(isProgramPreparationPending(error)){pending++;if(programPreparation.needsFrameAfter?.(before)===false)budgetWaiting++;continue;}solarProgramFailures.set(key,String(error).slice(0,256));solarProgramRevision++;failed++;}
  }
  clearSettledProgramSources();return solarShadowPreparation(ready,pending,failed,budgetWaiting);
 }
 function releaseGPU(){programIdleRetirement.reset();for(const chunk of [...sceneChunks,...(pendingCandidate?.chunks??[])]){chunk.masks?.detach();chunk.geometry=undefined;chunk.shadow=undefined;}if(gl?.isContextLost())staticGeometryOwner.contextLost();else staticGeometryOwner.release();mainGPUIncarnation++;invalidateMainDraw();residentMainPreparedStamp=undefined;residentMainFailure=undefined;clearProgramGrantHandoff();candidateMainMatrix=undefined;candidateMainViewRevision++;if(pendingCandidate)releaseCandidatePrograms(pendingCandidate);captureDemands.clear();geometryResidentUploaded=false;geometryUploadRevision++;geometryUploadPending=false;geometryUploadFailure=undefined;shadowUploadPending=false;programPreparation.cancel();clearProgramSources();captureRuntime.invalidate();releaseSolarPrograms();residentGPU?.released();if(gl)for(const p of partitionPrograms.values())programPreparation.releaseProgram(gl!,p);partitionPrograms.clear();heldCaptureDemandKeys.clear();for(const demand of captureDemands.values())demand.heldKeys.clear();partitionFailures.clear();rathausProxyMasks.detach();facadeAttached=false;diffuseTexture?.detach();windowTexture?.detach();matrix=undefined;viewRevision++;releaseShadowGPU();if(gl){if(program)programPreparation.releaseProgram(gl!,program);if(texturedProgram)programPreparation.releaseProgram(gl!,texturedProgram);if(diffuseProgram)programPreparation.releaseProgram(gl!,diffuseProgram);}if(gl?.isContextLost())geometryOwner.contextLost();else geometryOwner.release();clearGeometryHandles();program=undefined;texturedProgram=undefined;textureShaderAttempted=false;diffuseProgram=undefined;diffuseShaderAttempted=false;}
 const geometryProgramRecipe=(helper:string,sourceKey='base',pruneOwner6307=legacyPartitionEnabled,solarDepth=false,families:readonly number[]=[0],plan=publishedProgramPlan,pruneSourceKey?:string):GeometryConsumerRecipe=>{
  if(!gl||!plan)throw new ProgramPreparationPending();
  const selectedFamilies=[...new Set(families)].sort((a,b)=>a-b),activePlan=plan,ownerPrune=pruneOwner6307||pruneSourceKey==='base'&&plan.legacy,sourcePruneKey=ownerPrune||pruneSourceKey==='base'?'':pruneSourceKey??'',resolvedPrune=withPlan(plan,()=>ownerPrune||!!sourcePruneKey&&pruneFamilySource(sourcePruneKey)),planIdentity=plan.identity,recipeKey=familyPaintRecipeKey(sourceKey,selectedFamilies),baseRecipe=sourceKey==='base'&&selectedFamilies.length===1&&selectedFamilies[0]===0,materialRecipe=helper!==(baseSurfaceFragment??surfaceFragment??'vec3 sourceFacade(vec3 base,vec3 p,vec3 n,float material,float windows){return base;}');
  const sourceRecipe:PreparedSourceRecipe={sourceKey,inputs:[VERTEX,helper,resolvedPrune,fragment,pruneOwner6307Fragment,withResidentReflectionClip],sourceBounds:activePlan.describeAssemblyBounds(sourceKey,helper,resolvedPrune,rawBounds=>describeShaderAssemblyBounds(rawBounds,fragmentParts(helper,shaderSourceBoundPart(rawBounds,activePlan)),{prune:resolvedPrune,reflectionClip:true})),assemble(paintFragment){const original=fragment(helper,paintFragment);return withResidentReflectionClip(resolvedPrune?pruneOwner6307Fragment(original):original);}};
  const linkedFamilies=partitionProgramFamilies('root500',city,sourceKey,resolvedPrune,selectedFamilies,helper===BUILDING_SURFACE_FRAGMENT_GLSL);
  const familyKey=linkedFamilies.join(',');
  const recipe:GeometryConsumerRecipe={sharedKey:'root500-colour-recipe-v2',resource:city+':colour:'+sourceKey+':'+familyKey,inputs:[...plan.programSourceInputs,VERTEX,helper,sourceKey,familyKey,String(resolvedPrune),COLOUR_PROGRAM_ATTRIBUTES.join(',')],provenance:[...plan.programSourceProvenance,COLOUR_ASSEMBLY_AUTHORITY],priority:solarDepth?'capture':'visible',budget:activePlan.programBudget!(sourceRecipe,VERTEX,COLOUR_PROGRAM_ATTRIBUTES,linkedFamilies),current:()=>geometryProgramDemand(planIdentity,recipeKey,baseRecipe,materialRecipe),mainCurrent:()=>geometryProgramDemand(planIdentity,recipeKey,baseRecipe,materialRecipe,true),build(){return withPlan(activePlan,()=>{const prepared=activePlan.prepareSource(sourceRecipe,linkedFamilies);return{vertex:VERTEX,fragment:prepared.fragment,attributes:COLOUR_PROGRAM_ATTRIBUTES};});}};
  return recipe;
 };
 const acquireGeometryProgram=(...args:Parameters<typeof geometryProgramRecipe>):WebGLProgram|undefined=>{if(!gl)return undefined;const plan=args[5]??publishedProgramPlan;if(!plan)return undefined;const recipe=geometryProgramRecipe(...args),value=programPreparation.acquireReadyProgram(gl,recipe);if(value)rememberGeometryRecipe(plan,recipe);return value;};
 const compileGeometryProgram=(...args:Parameters<typeof geometryProgramRecipe>):WebGLProgram=>{if(!gl)throw new ProgramPreparationPending();const plan=args[5]??publishedProgramPlan;if(!plan)throw new ProgramPreparationPending();const recipe=coordinateGeometryRecipe(plan,geometryProgramRecipe(...args));return programPreparation.acquireReadyProgram(gl,recipe)??programPreparation.compile(gl,recipe);};

 let residentGPU:ReturnType<typeof createResidentGPULifecycle<WebGL2RenderingContext>>|undefined;
 let gpuPreflightRequired=false;
 function initializeResidentGPU(context:WebGLRenderingContext|WebGL2RenderingContext,repackResident:boolean){
  if(!('createVertexArray'in context))throw Error('WebGL2 required');if(gl&&gl!==context)releaseGPU();gl=context as WebGL2RenderingContext;if(!publishedProgramPlan){pumpCandidate();return;}
  if(!candidateMainMatrix)return;
  let before=programPreparation.budgetWaits;try{prepareResidentMain(gl);before=programPreparation.budgetWaits;if(program){if(repackResident&&!geometryResidentUploaded&&!geometryUploadPending)upload();else if(geometryUploadPending)prepareGeometryUpload();}if(!mainGeometryProgramFailure?.startsWith('Geometry upload: '))mainGeometryProgramFailure=undefined;
  }catch(error){if(gl?.isContextLost()){invalidateMainDraw();return;}if(isProgramPreparationPending(error)){if(programPreparation.needsFrameAfter?.(before)!==false)map.triggerRepaint();return;}mainGeometryProgramFailure=String(error);invalidateMainDraw();throw error;}
 }
 function residentCaptureState(surfaceOpacity:number){const windowState=windowTexture?.stats,diffuseState=diffuseTexture?.stats;let materialProgram=program,textureKind=0;if(paintMode()===1&&facadeAttached&&windowTexture&&texturedProgram&&windowState?.textureObjects){materialProgram=texturedProgram;textureKind=1;if(diffuseTexture&&diffuseProgram&&diffuseState?.plaster.textureObjects&&diffuseState.brick.textureObjects){materialProgram=diffuseProgram;textureKind=2;}}let runs:{firstIndex:number;indexCount:number;program:WebGLProgram|undefined}[];if(partitionEnabled&&paintMode()>1.5){runs=partitionRuns.map(run=>{const key=paintOverride()===0?run.key:activeFamilyKey(run.key);return{firstIndex:run.firstIndex,indexCount:run.indexCount,program:partitionPrograms.get(key)};});}else runs=[{firstIndex:0,indexCount:sceneIndexCount(),program:materialProgram}];
 return {materialProgram,textureKind,runs};
 }
 function semanticCaptureRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[geometryUploadRevision,generation,viewRevision,captureStateRevision,Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),Number(needsBirth),birth.size,paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),Number(sceneEnvironment.shadows),sceneEnvironment.quality,progressiveDiagnostic,Number(facadeAttached),w?.ready,d?.plaster.ready,d?.brick.ready,d?.neededMaterials.plaster,d?.neededMaterials.brick].join('|');}
 function solarCaptureRevision(){const w=windowTexture?.stats,d=diffuseTexture?.stats;return[solarProgramRevision,geometryUploadRevision,Number(geometryUploadPending),geometryUploadFailure,Number(enabled),Number(pageHidden),Number(destroyed),Number(gl?.isContextLost()??false),generation,Number(needsBirth),birth.size,reflectionResidentRevision,reflectionObjectID(program),reflectionObjectID(vao),reflectionObjectID(texturedProgram),reflectionObjectID(diffuseProgram),paintMode(),paintOverride(),opacity,opacityContext,sceneSun.instantISO,Number(sceneEnvironment.sunlight),sceneEnvironment.quality,progressiveDiagnostic,Number(facadeAttached),sceneChunks.map(chunk=>chunk.masks?.residentRevision??0).join(','),w?.ready,w?.textureObjects,d?.plaster.ready,d?.brick.ready,d?.totalTextureObjects,[...partitionPrograms].map(([key,p])=>key+':'+reflectionObjectID(p)).join(',')].join('|');}
 function captureChunkComponents(chunk:StreamChunk){let order=0;const rows=[];for(const component of loaded.values()){const local=chunk.loaded.get(key(component));if(local)rows.push({...local,order});order++;}return rows;}
 function captureChunkRuns<P>(chunk:StreamChunk,runs:readonly{program:P;firstIndex:number;indexCount:number}[]){const rows:{program:P;firstIndex:number;indexCount:number}[]=[];for(const span of sceneSpans){if(span.chunk!==chunk)continue;for(const run of runs){const first=Math.max(run.firstIndex,span.firstIndex),end=Math.min(run.firstIndex+run.indexCount,span.firstIndex+span.indexCount);if(end<=first)continue;const firstIndex=span.localFirstIndex+first-span.firstIndex,prior=rows.at(-1);if(prior&&prior.program===run.program&&prior.firstIndex+prior.indexCount===firstIndex)prior.indexCount+=end-first;else rows.push({program:run.program,firstIndex,indexCount:end-first});}}return rows;}
 function residentCaptureAdapter():ResidentCaptureAdapter{return{revision:solarCaptureRevision,publicationVersion:()=>geometryOwner.scene.version,snapshot(solarDepth){
  if(geometryUploadPending)return{status:'blocked',pending:!geometryUploadFailure,reason:geometryUploadFailure?'geometry-upload-failed:'+geometryUploadFailure:'geometry-upload-pending'};
  const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity;
  if(destroyed||pageHidden||!enabled||solarDepth&&(surfaceOpacity<.99||sceneEnvironment.shadows===false||sceneEnvironment.sunlight===false))return{status:'inactive'};
  if(!loaded.size&&pendingCandidate)return{status:'blocked',pending:true,reason:'geometry-upload-pending'};
  if(!loaded.size&&candidateFailure)return{status:'blocked',pending:false,reason:'geometry-upload-failed:'+candidateFailure};
  if(!sceneIndexCount())return loaded.size?{status:'blocked',reason:'missing-packed-geometry'}:{status:'inactive'};
  if(solarDepth&&(needsBirth||birth.size))return{status:'blocked',pending:true,reason:needsBirth?'needs-birth':'growing'};
  if(!gl||gl.isContextLost()||!gpuReady()||!program)return{status:'blocked',pending:!mainGeometryProgramFailure&&!geometryUploadFailure&&!contextRecoveryFailure,reason:'gpu-unready'};
  const capture=residentCaptureState(surfaceOpacity);if(!capture)return{status:'blocked',pending:true,reason:'material-state-unready'};
  const context=gl,window=windowTexture,diffuse=diffuseTexture,windowProgram=texturedProgram,wallProgram=diffuseProgram,textureKind=capture.textureKind,light=sceneSun,sunlight=sceneEnvironment.sunlight,mode=paintMode(),override=paintOverride(),styleAnchor=[...materialAnchor!]as[number,number],styleUnit=materialUnit,heightUnit=anchorUnit,features=progressiveDiagnostic!=='no-features',maskDiagnostic=city==='cologne'&&progressiveDiagnostic==='s182-mask-debug',scope=committingScope??residentScope,ownership=createResidentCaptureOwnership(()=>geometryOwner.capture(solarDepth?'solar':'reflection'),scope),hold=ownership.geometry,chunks:ResidentCaptureChunk[]=[];
  const {release,retain}=ownership;
  try{for(const value of new Set(capture.runs.flatMap(run=>run.program?[run.program]:[])))ownership.addRelease(programPreparation.retainProgram(context,value));for(const chunk of sceneChunks){const packed=chunk.cpu.value,geometry=chunk.geometry?.value;if(!packed||!geometry)throw Error('Root500 capture group retired');const masks=chunk.masks!.retain(solarDepth?'solar':'reflection');ownership.addRelease(()=>masks.release());const frame={...chunk.source.frame},q=[...packed.anchor],scale=1/frame.unit;
   chunks.push({contentKey:packed.contentKey,vao:geometry.vao,components:captureChunkComponents(chunk),runs:captureChunkRuns(chunk,capture.runs),indexCount:packed.indices.length,anchor:q,unit:frame.unit,opacity:surfaceOpacity,cull:true,skipMasks:false,masks,
    bindingRevision:()=>[Number(gl===context),window?.stats.residentRevision,window?.stats.ready,diffuse?.stats.plaster.residentRevision,diffuse?.stats.plaster.ready,diffuse?.stats.brick.residentRevision,diffuse?.stats.brick.ready,masks.residentRevision].join('|'),bindingsReady:()=>textureKind===0||!!(window?.isResident(context)&&window.stats.ready&&(textureKind!==2||diffuse?.isResident(context)&&(!diffuse.stats.neededMaterials.plaster||diffuse.stats.plaster.ready)&&(!diffuse.stats.neededMaterials.brick||diffuse.stats.brick.ready))),planFailureReason:[...solarResidentKeys()].some(key=>!partitionPrograms.has(key)&&solarProgramFailures.has(key))?'solar-depth-compile-failed':undefined,
    matrix(main){return multiply(main,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,q[0],q[1],0,1]);},
    uniforms(p,matrix,plane,viewport){context.useProgram(p);reflectionClipUniforms(context,p,plane,viewport);uploadSceneLight(context,p,light,sunlight);const previous=committingScope;committingScope=scope;try{uploadFacadeLayouts(context,p);}finally{committingScope=previous;}context.uniformMatrix4fv(context.getUniformLocation(p,'u_matrix'),false,new Float32Array(matrix));context.uniform1f(context.getUniformLocation(p,'u_opacity'),surfaceOpacity);context.uniform1f(context.getUniformLocation(p,'u_paint_mode'),mode);context.uniform1f(context.getUniformLocation(p,'u_progressive_features'),Number(features));context.uniform1f(context.getUniformLocation(p,'u_s182_mask_diagnostic'),Number(maskDiagnostic));context.uniform1f(context.getUniformLocation(p,'u_paint_override'),override);context.uniform1f(context.getUniformLocation(p,'u_style_scale'),styleUnit/frame.unit);context.uniform1f(context.getUniformLocation(p,'u_style_height_scale'),heightUnit/frame.unit);context.uniform2f(context.getUniformLocation(p,'u_style_offset'),(q[0]-styleAnchor[0])*styleUnit,-(q[1]-styleAnchor[1])*styleUnit);},resetClip(p){reflectionClipUniforms(context,p);},
    bind(p,draw,unavailable){if(textureKind===2&&p===wallProgram)window!.withResidentTexture(context,p,()=>diffuse!.withResidentTextures(context,p,draw,unavailable),unavailable);else if(textureKind===1&&p===windowProgram)window!.withResidentTexture(context,p,draw,unavailable);else draw();}
   });}
   return{status:'active',gl:context,publicationVersion:hold.version,chunks,leases:hold.leases,retain,release};
  }catch(error){release();throw error;}
 }};}

 const captureRuntime=createResidentCaptureRuntime(residentCaptureAdapter());

 function prepareSolarShadow(budget=createSolarShadowPreparationBudget()):SolarShadowPreparationResult{
  const programs=prepareSolarPrograms(budget),materials=prepareCaptureMaterials(budget,'solar');
  const preparation=solarShadowPreparation(programs.ready+materials.ready,programs.pending+materials.pending,programs.failed+materials.failed,(programs.budgetWaiting??0)+(materials.budgetWaiting??0));
  return prepareSolarShadowResources(preparation,captureRuntime);
 }
 function preparePlanarReflection(pass:ResidentPlanarReflectionPass,budget:SolarShadowPreparationBudget):PlanarReflectionPreparationResult{
  const empty={...solarShadowPreparation(),plannedTriangles:0,plannedDraws:0};if(destroyed||pageHidden||!enabled||!sceneIndexCount())return empty;
  const recipes=partitionEnabled&&paintMode()>1.5?partitionRuns.map(run=>({firstIndex:run.firstIndex,indexCount:run.indexCount,program:activeFamilyKey(run.key)})):[{firstIndex:0,indexCount:sceneIndexCount(),program:'base'}];
  const physical=sceneChunks.flatMap(chunk=>{const packed=chunk.cpu.value;if(!packed)return[];const scale=1/chunk.source.frame.unit,q=packed.anchor;return[{components:captureChunkComponents(chunk),runs:captureChunkRuns(chunk,recipes),matrix:multiply(pass.mainMatrix,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,q[0],q[1],0,1]),indexCount:packed.indices.length,cull:true}];});
  const planned=planResidentReflectionChunks<string,(typeof physical)[number]>(physical,pass.maxTriangles,pass.maxDraws??64),cost={plannedTriangles:planned.triangles,plannedDraws:planned.draws},demand=captureDemands.get('reflection');if(demand)demand.keys=new Set(partitionEnabled&&paintMode()>1.5?planned.plan.map(row=>row.program):[]);reconcileCaptureDemand();if(!demand)return{...solarShadowPreparation(0,1),...cost};
  const programs=prepareCapturePrograms(demand.keys??new Set(),budget,'reflection'),materials=prepareCaptureMaterials(budget,'reflection');if(programs.pending||programs.failed||materials.pending||materials.failed)return{...solarShadowPreparation(programs.ready+materials.ready,programs.pending+materials.pending,programs.failed+materials.failed,(programs.budgetWaiting??0)+(materials.budgetWaiting??0)),...cost};
  const snapshot=residentCaptureAdapter().snapshot(false);if(snapshot.status==='inactive')return{...solarShadowPreparation(),...cost};if(snapshot.status==='blocked')return{...solarShadowPreparation(0,Number(snapshot.pending!==false),Number(snapshot.pending===false)),...cost};
  try{if(pass.gl!==snapshot.gl||snapshot.gl.isContextLost())return{...solarShadowPreparation(0,1),...cost};const chunks='chunks'in snapshot?snapshot.chunks:[snapshot],physicalCapture=chunks.map(chunk=>({...chunk,matrix:chunk.matrix(pass.mainMatrix)})),selected=planResidentReflectionChunks<WebGLProgram,(typeof physicalCapture)[number]>(physicalCapture,pass.maxTriangles,pass.maxDraws??64);let ready=true;for(const chunk of chunks){const required=[...new Set(selected.plan.filter(row=>row.chunk.vao===chunk.vao).map(row=>row.program))];if(!chunk.skipMasks&&!chunk.masks.prepare(snapshot.gl,required).ready)ready=false;}return{...solarShadowPreparation(programs.ready+materials.ready,Number(ready&&chunks.some(chunk=>!chunk.bindingsReady())),Number(!ready)),...cost};}catch{return{...solarShadowPreparation(0,0,1),...cost};}finally{snapshot.release?.();}
 }
 function solarCoverage(){return captureRuntime.coverage();}

function retainMainFrame(){
  const scope=committingScope??residentScope,releases:(()=>void)[]=[];let geometry:ReturnType<typeof geometryOwner.captureReady>|undefined,shadow:ReturnType<typeof shadowGeometryOwner.captureReady>|undefined,scopeRelease:(()=>void)|undefined,live=true;
  const release=()=>{if(!live)return;live=false;let failure:unknown;for(const dispose of [...releases,()=>geometry?.release(),()=>shadow?.release(),()=>scopeRelease?.()])try{dispose();}catch(error){failure??=error;}if(failure!==undefined)throw failure;};
  try{geometry=geometryOwner.captureReady('main');if(sceneShadowIndexCount())shadow=shadowGeometryOwner.captureReady('main');scopeRelease=scope?.retain();for(const chunk of sceneChunks){const held=chunk.masks?.retainReady('main');if(held)releases.push(()=>held.release());}for(const p of new Set([program,shadowProgram,texturedProgram,diffuseProgram,...partitionPrograms.values()].filter((p):p is WebGLProgram=>!!p)))releases.push(programPreparation.retainProgram(gl!,p));return{version:geometry.version,shadowVersion:shadow?.version,release};}catch(error){release();throw error;}
 }
 let activeMainFrameVersion:number|undefined;
 function drawSceneRange(batch:ReturnType<typeof createResidentTriangleDrawBatch>,p:WebGLProgram,firstIndex:number,indexCount:number){
  const context=gl,projection=candidateMainMatrix;
  if(!context||!projection||activeMainFrameVersion!==geometryOwner.scene.version)return false;
  const end=firstIndex+indexCount,locations=chunkUniforms(context,p);
  let drawn=0;
  for(const span of residentSpansInRange(sceneSpans,firstIndex,end)){
   if(activeMainFrameVersion!==geometryOwner.scene.version)return false;
   const first=Math.max(firstIndex,span.firstIndex),last=Math.min(end,span.firstIndex+span.indexCount);
   if(last<=first)continue;
   const chunk=span.chunk,packed=chunk.cpu.value,gpu=chunk.geometry?.value;
   if(!gpu||!packed||!chunk.masks)return false;
   const scale=1/chunk.source.frame.unit;
   const clip=multiply(projection,[scale,0,0,0,0,0,scale,0,0,-scale,0,0,packed.anchor[0],packed.anchor[1],0,1]);
   context.bindVertexArray(gpu.vao);
   context.uniformMatrix4fv(locations.matrix,false,new Float32Array(clip));
   context.uniform1f(locations.style_scale,materialUnit/chunk.source.frame.unit);
   context.uniform1f(locations.style_height_scale,anchorUnit/chunk.source.frame.unit);
   context.uniform2f(locations.style_offset,(packed.anchor[0]-materialAnchor![0])*materialUnit,-(packed.anchor[1]-materialAnchor![1])*materialUnit);
   const offset=(span.localFirstIndex+first-span.firstIndex)*4;
   if(!chunk.masks.withResidentMasks(context,p,()=>batch.draw(gpu.vao,last-first,offset)))return false;
   drawn+=last-first;
  }
  return drawn===indexCount;
 }
 const layer={id,type:'custom' as const,renderingMode:'3d' as const,onAdd(_map:unknown,context:WebGLRenderingContext|WebGL2RenderingContext){if(!('createVertexArray'in context))throw Error('WebGL2 required');residentGPU!.attach(context as WebGL2RenderingContext);},render(context:WebGLRenderingContext|WebGL2RenderingContext,args:{defaultProjectionData?:{mainMatrix:ArrayLike<number>}}|ArrayLike<number>){recordCandidateMainView('defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>);reconcileProgramDemand();if(destroyed||pageHidden||!enabled||!gl||gl.isContextLost()){matrix=undefined;return;}pumpCandidate();const emptyMain='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(residentGPU!.emptyFrame(emptyMain)){matrix=undefined;partitionPending=false;residentMainRequiredKeys=new Set();residentMainRequiredStamp=undefined;residentMainPreparedStamp=undefined;invalidateMainDraw();if(candidateMainMatrix&&residentGPU!.isEmptyReady()&&!requiredMainFailure())stageCompleteMainDraw(context as WebGL2RenderingContext,mainDrawStamp(),mainGeometryIdentity,true);return;}partitionPending=false;if(!gpuReady())residentGPU!.attach(gl);if(geometryUploadPending){prepareGeometryUpload();if(geometryUploadPending){matrix=undefined;return;}}if(shadowUploadPending)prepareShadowUpload();if(destroyed||pageHidden||!enabled||!gpuReady()){matrix=undefined;return;}if(!gl||!program||!vao)return;const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!candidateMainMatrix||!main||main.length!==16)return;const scale=1/anchorUnit,model=[scale,0,0,0,0,0,scale,0,0,-scale,0,0,anchor[0],anchor[1],0,1];matrix=undefined;grow();matrix=multiply(main,model);if(!sceneIndexCount())return;const mainPrepared=prepareResidentMain(gl);if(!mainPrepared&&(!(partitionEnabled&&paintMode()>1.5&&publishedProgramPlan)||gl.isContextLost()))return;const drawStamp=mainDrawStamp(),drawGeometry=mainGeometryIdentity;let mainPassComplete=false;const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),depth:gl.isEnabled(gl.DEPTH_TEST),blend:gl.isEnabled(gl.BLEND),cull:gl.isEnabled(gl.CULL_FACE),mask:gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc:gl.getParameter(gl.DEPTH_FUNC),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA)};const frame=retainMainFrame();activeMainFrameVersion=frame.version;try{
 const surfaceOpacity=opacityContext==='route-selection'?Math.min(opacity,.2):opacity,shadowAlpha=sceneEnvironment.shadows?sourceShadowOpacity(surfaceOpacity,opacityContext):0;
 if(progressiveDiagnostic!=='no-shadow'&&shadowProgram&&sceneShadowIndexCount()&&shadowAlpha>0){try{drawProjectedShadows(shadowAlpha);}catch{shadowFailure=true;releaseShadowGPU();}}else shadowMask.cancelPending?.();
 gl.bindVertexArray(vao);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.depthMask(surfaceOpacity>=.99);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 const uniforms=(p:WebGLProgram)=>{
  const context=gl!,chunk=chunkUniforms(context,p),surface=surfaceUniforms(context,p);
  context.useProgram(p);
  reflectionClipUniforms(context,p);
  uploadSceneLight(context,p,sceneSun,sceneEnvironment.sunlight);
  uploadFacadeLayouts(context,p);
  context.uniformMatrix4fv(chunk.matrix,false,new Float32Array(matrix!));
  context.uniform1f(surface.opacity,surfaceOpacity);
  context.uniform1f(surface.paintMode,paintMode());
  context.uniform1f(surface.features,progressiveDiagnostic==='no-features'?0:1);
  context.uniform1f(surface.maskDiagnostic,city==='cologne'&&progressiveDiagnostic==='s182-mask-debug'?1:0);
  context.uniform1f(surface.paintOverride,paintOverride());
  context.uniform1f(chunk.style_scale,materialUnit/anchorUnit);
  context.uniform2f(chunk.style_offset,(anchor[0]-materialAnchor![0])*materialUnit,-(anchor[1]-materialAnchor![1])*materialUnit);
 };
 const draw=()=>{
 const batch=createResidentTriangleDrawBatch(gl!);
 try{
 if(partitionEnabled&&paintMode()>1.5){
  partitionRenderCount++;partitionLastRenderAt=new Date().toISOString();
  const visibleRuns=mainPaintRuns();offscreenPaintRunsSkipped=partitionRuns.length-visibleRuns.length;
  partitionVisibleKeys=[...paintKeysForRuns(visibleRuns)];
  partitionPending=!mainPrepared;
  let group:{program:WebGLProgram;firstIndex:number;indexCount:number}|undefined;
  const flushGroup=()=>{
   if(!group)return;
   uniforms(group.program);
   if(!drawSceneRange(batch,group.program,group.firstIndex,group.indexCount))throw Error('Main mask resource changed after preparation');
   group=undefined;
  };
  for(const run of visibleRuns){
   const runKey=activeFamilyKey(run.key),selected=partitionPrograms.get(runKey);
   if(!selected||(!mainPrepared&&!residentDrawRange(sceneSpans,run.firstIndex,run.indexCount,gl!,selected))){
    flushGroup();partitionPending=true;continue;
   }
   forgetCaptureRole(runKey);
   if(group&&group.program===selected&&group.firstIndex+group.indexCount===run.firstIndex)group.indexCount+=run.indexCount;
   else{flushGroup();group={program:selected,firstIndex:run.firstIndex,indexCount:run.indexCount};}
  }
  flushGroup();
  if(partitionPending)invalidateMainDraw();
  mainPassComplete=!partitionPending;return;
 }
 const selected=gl!.getParameter(gl!.CURRENT_PROGRAM)as WebGLProgram;const drawRange=(first:number,count:number)=>{if(!drawSceneRange(batch,selected,first,count))throw Error('Main chunk changed after preparation');};{
 // One source-bound counterfactual draw, localhost diagnostic only. Source arrays and resident records remain intact.
 const diagnosticParts=progressiveDiagnostic==='without-near-parts'?['osm/way/1560907616|osm/way/1560907616/component/c87db3a22f0446da7c25','osm/way/1560907617|osm/way/1560907617/component/76a6a166985a7a86b281','osm/way/1560907618|osm/way/1560907618/component/69f4a5bf601dd50df3ff']:progressiveDiagnostic==='without-candidate'?['osm/way/1560907616|osm/way/1560907616/component/c87db3a22f0446da7c25']:[];
 const omitted=city==='dortmund'&&diagnosticParams.get('sample')==='progressive-dortmund-30319077'?diagnosticParts.map(k=>loaded.get(k)).filter((c):c is NonNullable<typeof c>=>!!c).sort((a,b)=>a.start-b.start):[];
 let drawStart=0;for(const c of omitted){if(c.start>drawStart)drawRange(drawStart,c.start-drawStart);drawStart=c.end;}
 if(drawStart<sceneIndexCount())drawRange(drawStart,sceneIndexCount()-drawStart);mainPassComplete=true;
 }
 }finally{batch.restore();}
 },fallbackDraw=()=>{uniforms(program!);draw();};
 const windowDraw=()=>{if(windowTexture&&texturedProgram){uniforms(texturedProgram);windowTexture.withTexture(gl!,texturedProgram,draw,fallbackDraw);}else fallbackDraw();};const normalDraw=()=>{if(windowTexture&&diffuseTexture&&diffuseProgram){uniforms(diffuseProgram);windowTexture.withTexture(gl!,diffuseProgram,()=>diffuseTexture.withTextures(gl!,diffuseProgram,draw,windowDraw),windowDraw);}else windowDraw();};if(paintMode()===1){if(texturedProgram)forgetCaptureRole('@window');if(diffuseProgram)forgetCaptureRole('@diffuse');normalDraw();}else fallbackDraw();}catch(error){invalidateMainDraw();if(!gl.isContextLost()){residentMainFailure=String(error).slice(0,512);if(contextRecoveryPending){contextRecoveryPending=false;contextRecoveryFailure=residentMainFailure;}}matrix=undefined;throw error;}finally{activeMainFrameVersion=undefined;frame.release();reconcileProgramDemand();gl.bindVertexArray(old.vao);gl.useProgram(old.program);old.depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);old.blend?gl.enable(gl.BLEND):gl.disable(gl.BLEND);old.cull?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);gl.depthMask(old.mask);gl.depthFunc(old.depthFunc);gl.blendFuncSeparate(old.src,old.dst,old.srcA,old.dstA);}if(mainPassComplete)stageCompleteMainDraw(context as WebGL2RenderingContext,drawStamp,drawGeometry);},onRemove(){releaseGPU();}};
 const renderWithSolarReceiver=layer.render;layer.render=guardCustomLayerRender(map,layer.id,(context,args)=>{pendingMainFrame=undefined;try{const main='defaultProjectionData'in args?args.defaultProjectionData?.mainMatrix:args as ArrayLike<number>;if(!main||!('createVertexArray'in context))renderWithSolarReceiver(context,args);else withSceneSolarShadowReceiver(context as WebGL2RenderingContext,main,()=>renderWithSolarReceiver(context,args));const completed=pendingMainFrame;pendingMainFrame=undefined;if(completed)recordCompleteMainDraw(completed);}catch(error){invalidateMainDraw();throw error;}finally{pendingMainFrame=undefined;}},()=>Boolean(gl?.isContextLost()));

 residentGPU=createResidentGPULifecycle<WebGL2RenderingContext>({bind:context=>{gl=context;},initialize:initializeResidentGPU,release:releaseGPU,ready:gpuReady,lost:context=>context.isContextLost(),hasResident:()=>sceneIndexCount()>0||!!pendingCandidate,needsPreflight:()=>gpuPreflightRequired,clearTransient:()=>{partitionRuns=[];partitionPending=false;},revision:()=>viewRevision});
 const releaseResidentLayer=layer.onRemove;layer.onRemove=()=>{cancelCandidate();clearAbandonedCandidateFailure();releaseResidentLayer();residentGPU!.detach();};

 function paintSelection(upload=true){let changed=false;for(const chunk of sceneChunks){const state=chunk.state?.value;if(!state)continue;const selected=selectedIdentity&&loaded.has(key(selectedIdentity))?chunk.loaded.get(key(selectedIdentity)):undefined;let first=-1;for(let i=0;i<=state.length;i++){if(i<state.length){const next=Math.fround(Math.floor(state[i]/4)*4+(state[i]%2)+2*Number(enabled&&selectionActive&&!!selected&&i>=selected.firstVertex&&i<selected.lastVertex));if(next!==state[i]){state[i]=next;changed=true;if(first<0)first=i;continue;}}if(first>=0){if(upload)uploadChunkState(chunk,first,i);first=-1;}}}if(changed&&upload)captureStateRevision++;if(upload)map.triggerRepaint();}
 function clearSelection(){selectedIdentity=undefined;paintSelection();}
 function isPickReady(){return !pendingCandidate&&!candidateFailure&&!geometryUploadPending&&!destroyed&&!pageHidden&&enabled&&Boolean(residentGPU?.isEmptyReady()||(gpuReady()&&matrix))&&!partitionPending&&(paintMode()<=1.5||[...mainPaintKeys()].every(key=>partitionPrograms.has(key)));}
 function getDrawReadiness():ResidentDrawReadiness{
  if(destroyed||pageHidden||!enabled)return{ready:false,preparing:false};
  if(pendingCandidate&&!candidateFailure)return{ready:false,preparing:true};
  const failure=requiredMainFailure();if(failure)return{ready:false,preparing:false,failure:failure.slice(0,512)};
  if(mainDrawComplete())return{ready:true,preparing:false};
  return{ready:false,preparing:!!pendingCandidate||geometryUploadPending||sceneIndexCount()>0||!candidateMainMatrix};
 }
 function partitionWarmupDiagnostic(){const missing=partitionVisibleKeys.filter(key=>!partitionPrograms.has(key));return{enabled:partitionEnabled,pending:partitionPending,renderCount:partitionRenderCount,lastRenderAt:partitionLastRenderAt,cached:partitionPrograms.size,cachedKeys:[...partitionPrograms.keys()].slice(0,64),required:partitionVisibleKeys.length,requiredKeys:partitionVisibleKeys.slice(0,32),missing:missing.length,missingKeys:missing.slice(0,32),lastCompile:partitionCompileAttempt?{...partitionCompileAttempt,error:partitionCompileAttempt.error?.slice(0,512)}:undefined};}
 function readChunkPaintDiagnostic(identities?:readonly Identity[]){
  if(!identities?.length)return{requested:false,records:[]};if(identities.length>8)throw Error('Too many GPU diagnostic identities');
  const groups=new Map<StreamChunk|undefined,Identity[]>();for(const identity of identities){const chunk=localComponent(identity)?.chunk;const rows=groups.get(chunk)??[];rows.push(identity);groups.set(chunk,rows);}
  const chunks=[...groups].map(([chunk,rows])=>{const gpu=chunk?.geometry?.value,packed=chunk?.cpu.value;return{contentKey:chunk?.cpu.contentKey,...readPaintGPUBufferDiagnostic({gl:geometryUploadPending||!gpu?undefined:gl,vao:gpu?.vao,program,progressiveBuffer:gpu?.buffers.get('progressive'),paintBuffer:gpu?.buffers.get('paint'),vertexBuffer:gpu?.buffers.get('vertex'),indexBuffer:gpu?.indexBuffer,packedVertices:packed?.vertices,packedVertexStride:9,packedIndices:packed?.indices,getComponent:identity=>chunk?.loaded.get(key(identity))},rows)};});
  return{...chunks[0],requested:true,available:chunks.every(row=>row.available),records:chunks.flatMap(row=>row.records),attributes:chunks.flatMap(row=>row.attributes??[]),chunks};
 }
 function diagnosticScreenSamples(identity?:Identity){if(!matrix||!gpuReady()||partitionPending||geometryUploadPending)return [];const canvas=map.getCanvas(),w=canvas.clientWidth,h=canvas.clientHeight,out:{objectId:string;partId:string;box:number[];screenBox:number[];growth:number}[]=[];for(const c of loaded.values()){if(identity&&key(c)!==key(identity))continue;const growth=componentGrowth(c),box=c.box,screen=[Infinity,Infinity,-Infinity,-Infinity];let front=false;for(const x of [box[0],box[3]])for(const y of [box[1]*growth,box[4]*growth])for(const z of [box[2],box[5]]){const q=[x,y,z,1],clip=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=matrix[k*4+r]*q[k];if(clip[3]<=0)continue;front=true;const sx=(clip[0]/clip[3]+1)*w/2,sy=(1-clip[1]/clip[3])*h/2;screen[0]=Math.min(screen[0],sx);screen[1]=Math.min(screen[1],sy);screen[2]=Math.max(screen[2],sx);screen[3]=Math.max(screen[3],sy);}if(front&&screen[0]<=w&&screen[2]>=0&&screen[1]<=h&&screen[3]>=0){out.push({objectId:c.objectId,partId:c.partId,box:[...box],screenBox:screen,growth});if(out.length>=160)break;}}return out;}
 function growthSnapshot(){let min=1,max=0;for(const c of loaded.values()){const value=componentGrowth(c);min=Math.min(min,value);max=Math.max(max,value);}return {generation,components:loaded.size,activeBirths:birth.size,minGrowth:loaded.size?min:1,maxGrowth:loaded.size?max:1,enabled,ready:!geometryUploadPending&&gpuReady(),pageHidden};}
 // CPU preparation owns no renderer state; a superseded request cannot alter the displayed scene.
 function clearResidentBatches(nextGeneration:number){releaseStreamChunks(sceneChunks);sceneChunks=[];sceneSpans=[];sceneChunkInput=undefined;residentMainMaskChunks=[];invalidateMainDraw();residentMainRequiredKeys=undefined;residentMainRequiredStamp=undefined;residentMainPreparedStamp=undefined;residentMainFailure=undefined;mainGeometryProgramFailure=undefined;contextRecoveryFailure=undefined;residentResetRevision++;residentMaterialStyles=[];partitionRuns=[];captureRuntime.invalidate();sourceLoaded=new Map();forgetPaintVisibility(loaded);loaded.clear();residentProgressiveStatus=[];s434DisplayProfile=null;s434PackingDiagnostic=undefined;s434Owner138Plan=undefined;s434DrawableCounts.clear();nativeGroupPlan=undefined;heldSourceOutlines=[];ownerDisplayBudget=undefined;ownerReconstruction={objects:0,vertices:0,triangles:0,originalVertices:0,sourceRetained:true,actualVisualAccepted:false,components:[]};tvBaseRepairPlan={enabled:false,reason:'not committed'};tvBaseRepairPaint={written:0};partialGateDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};s402ConnectorDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};s036NorthCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};s240BaseCofaceDisplay={enabled:false,reason:'not committed',wallVertices:0,roofVertices:0,wholeParentHidden:false};f151CrownDisplay={enabled:false,reason:'not committed',maskedVertices:0,maskedTriangles:0,sourceRetained:true,sourceDisplayDifference:false};tvBaseWest70Active=false;generation=nextGeneration;needsBirth=true;viewRevision++;matrix=undefined;fixedShadowIndexBytes=0;solarShadowAdmittedKeys.clear();solarShadowAdmitted=solarShadowWithheld=shadowAdmittedComponents=0;shadowSourceBoundarySHA='';solarShadowSignature='';landmarkVisible=false;if(!(pendingCandidate?.chunks??[]).some(c=>c.masks===rathausProxyMasks))rathausProxyMasks.destroy();rathausProxyMasks=createRathausProxyMasks();rathausProxyMasks.configure([],new Float32Array());retireUnloadedBirths();try{releaseGPU();syncFacadeResources();}finally{resetPreparedData();releaseGenerationScopes();}}
async function prepareBatches(components:BuildingComponent[],signal:AbortSignal,wait?:OwnerInitializationWait,admission?:F068DerivedAdmission,demand?:readonly BuildingComponent[],chunkInput?:RendererChunkInput<BuildingComponent>):Promise<PreparedOwnerBatches>{
 const requestInput=components;components=completeChunkSourceRows(chunkInput,components);
 signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');if(!frozenData)throw Error('Root500 CPU preparation requires FrozenDataClient');const current=()=>{signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');};
 // Lazy owner route modules first, holding nothing: no FrozenDataScope, no
 // chunk input and no progressive lease waits on an import (DECISIONS
 // 2026-11-02 04:29 [0]). The staged preparation below then finds them loaded;
 // rows that only appear after source recovery still load at their stage.
 // Optional call: a renderer fixture may inject an owner stub without it.
 await prepareOwnerReconstructionModules?.(components,signal,wait);current();
 const scope=createFrozenDataScope(frozenData);let chunkDependencies:RetainedChunkInput<BuildingComponent>|undefined,releaseReconstructionInputs:(()=>void)|undefined;
 try{
  chunkDependencies=retainChunkInput(chunkInput);const input=[...requestInput],originalSourceVertices=requestInput.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.positions.length/3,0),0),originalSourceIndices=requestInput.reduce((n,c)=>n+c.batches.reduce((m,b)=>m+b.indices.length,0),0);
  await prepareRoot500ProgressiveData(components,city,signal,scope);current();
  await prepareOwnerRecoveredSourceComponents(components,signal,wait,scope);current();
  const requestedSource=importedRoot500_ownerRecoveredSourceComponents(requestInput,scope),source=importedRoot500_ownerRecoveredSourceComponents(completeChunkSourceRows(chunkInput,requestedSource),scope),seen=new Set<string>();
  for(const c of source){ownerCommitStep('validate '+c.objectId+'|'+c.partId,()=>validate(c,city));if(seen.has(key(c)))throw Error('Duplicate component identity');seen.add(key(c));}
  const sourceLoaded=new Map<string,BuildingComponent>(source.map((c:BuildingComponent)=>[key(c),c]));
  const visibleSource=orderVisibleChunkRows(source,requestedSource.map(key)),visibleSourceKeys=visibleSource.map(key);
  const reconstructed=await importedRoot500_prepareOwnerReconstructionComponents(source,signal,wait,scope);current();
  await prepareRoot500DerivedDisplays(reconstructed.components,city,admission,signal,scope);current();
  const displayComponents=importedRoot500_appendF107DerivedDisplay(importedRoot500_appendF082DerivedDisplay(importedRoot500_appendF075DerivedDisplay(importedRoot500_appendF068DerivedDisplay(reconstructed.components,city,admission,scope),city,admission,scope),city,admission,scope),city,admission,scope);
  await prepareRoot500MaterialData([...source,...displayComponents],city,signal,scope);current();
  await prepareOwnerReconstructionMaterials(displayComponents,signal,wait,scope);current();
  signal.throwIfAborted();if(destroyed)throw new DOMException('Aborted','AbortError');
  releaseReconstructionInputs=retainReconstructionPreparedInputs(scope,[...source,...displayComponents]);
  return{releaseReconstructionInputs,scope,signal,input,visibleSourceKeys,visibleDisplayKeys:visibleChunkDisplayKeys(visibleSource,source,displayComponents,reconstructed.stats.components,c=>isF068DerivedDisplayIdentity(c)||isF075DerivedDisplayIdentity(c)||isF082DerivedDisplayIdentity(c)||isF107DerivedDisplayIdentity(c)),source,sourceLoaded,originalSourceVertices,originalSourceIndices,reconstructed,displayComponents,chunkInput:chunkDependencies?.input,releaseChunkDependencies(){chunkDependencies?.release();},release(){chunkDependencies?.release();releaseReconstructionInputs?.();scope.release();}};
 }catch(error){chunkDependencies?.release();releaseReconstructionInputs?.();scope.release();throw error;}
}
 return {layer,getProgramPreparationStats:()=>{const preparation=programPreparation.stats;return[{provider:'root500',...preparation,resourceResidency:resourceResidency(preparation)}];},prepareBatches,getGrowthSamplingState:()=>({activeBirths:birth.size,enabled,pageHidden}),growthSnapshot,diagnosticScreenSamples,getComponentDisplayState(identity:Identity){const sample=diagnosticScreenSamples(identity)[0];if(!enabled||pageHidden||!sample||!gpuReady())return undefined;return {visible:true,growth:sample.growth,selected:selectionActive&&!!selectedIdentity&&key(selectedIdentity)===key(identity),opacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity};},isPickReady,getDrawReadiness,cancelCandidate:cancelCandidateGeneration,getRevision:()=>({generation,viewRevision}),getReadinessDiagnostic:()=>({mainDraw:{incarnation:mainGPUIncarnation,geometryIdentity:mainGeometryIdentity,projectionKnown:!!candidateMainMatrix,prepared:residentMainPreparedStamp===mainPreparationStamp(),firstComplete:mainDrawComplete(),failure:residentMainFailure},candidate:pendingCandidate?{generation:pendingCandidate.generation,mainRequiredCount:pendingCandidate.requiredMainKeys?.size??0,mainProgramCount:pendingCandidate.mainPrograms?.size??0,mainReady:candidateMainReady(pendingCandidate),windowFailure:pendingCandidate.windowFailure,diffuseFailure:pendingCandidate.diffuseFailure}:undefined,candidateFailure,candidateFailureGeneration,preparedSourceStats:{resident:publishedProgramPlan?.preparedSourceStats,candidate:pendingCandidate?.plan.preparedSourceStats},geometryResources:{main:geometryOwner.stats,shadow:shadowGeometryOwner.stats},programPreparation:programPreparation.stats,partition:partitionWarmupDiagnostic(),destroyed,pageHidden,enabled,hasGL:!!gl,hasProgram:!!program,hasVAO:!!vao,hasVertexBuffer:!!vertexBuffer,hasIndexBuffer:!!indexBuffer,hasStateBuffer:!!stateBuffer,hasMatrix:!!matrix,contextLost:gl?.isContextLost()??false,partitionPending,geometryUploadPending,geometryUploadRevision,geometryUploadFailure,shadowUploadPending,generation,viewRevision,components:loaded.size,vertices:sceneVertexCount(),indices:sceneIndexCount(),mainGeometryProgramFailure:mainGeometryProgramFailure?.slice(0,512),contextRecoveryFailure:contextRecoveryFailure?.slice(0,512)}),getComponent:(identity:Identity)=>copyBuildingComponentMetadata(loaded.get(key(identity))),getProgressiveRenderStatus:()=>structuredClone(residentProgressiveStatus),getProgressivePaintFingerprints:()=>({...importedRoot500_progressivePaintFingerprints}),readPaintGPUDiagnostic:readChunkPaintDiagnostic,getNearbySourceSummaries(center:readonly[number,number],radiusM=150){return summarizeNearbyNativeSources(sourceLoaded.values(),center,radiusM);},getDerivedDisplayReadback:(identity:Identity)=>serializeF107DerivedReadback(loaded.get(key(identity)),!sourceLoaded.has(key(identity)))??serializeF082DerivedReadback(loaded.get(key(identity)),!sourceLoaded.has(key(identity)))??serializeF075DerivedReadback(loaded.get(key(identity)),!sourceLoaded.has(key(identity)))??serializeF068DerivedReadback(loaded.get(key(identity)),!sourceLoaded.has(key(identity))),isDerivedDisplayIdentity:(identity:Identity)=>city==='munich'&&(isF068DerivedDisplayIdentity(identity)||isF075DerivedDisplayIdentity(identity)||isF082DerivedDisplayIdentity(identity)||isF107DerivedDisplayIdentity(identity)),borrowSourceComponent,borrowSurfaceComponent,getSourceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSourceComponent(identity)),getSurfaceComponent:(identity:Identity)=>copyBuildingComponentReadback(borrowSurfaceComponent(identity)),get nativeGroupDisplay(){return copyBuildingComponentReadback(nativeGroupPlan);},setEnabled(value:boolean){if(!value){invalidateMainDraw();residentMainPreparedStamp=undefined;captureDemands.clear();captureRuntime.invalidate();cancelCandidate();clearAbandonedCandidateFailure();programPreparation.cancel();clearProgramSources();shadowMask.cancelPending?.();}if(value===enabled)return;viewRevision++;enabled=value;syncFacadeResources();matrix=undefined;paintSelection();reconcileProgramDemand();},setOpacity(value:number){if(!Number.isFinite(value)||value<0||value>1)throw Error('Invalid opacity');if(value===opacity)return;opacity=value;viewRevision++;matrix=undefined;reconcileProgramDemand();map.triggerRepaint();},setOpacityContext(value:'normal'|'route-selection'){if(value!=='normal'&&value!=='route-selection')throw Error('Invalid opacity context');if(value===opacityContext)return;opacityContext=value;viewRevision++;matrix=undefined;reconcileProgramDemand();map.triggerRepaint();},setBatches(...args:Parameters<typeof packPreparedBatches>){requestCandidate(args);},retainPublishedSelection(identity:Identity){if(!loaded.has(key(identity)))return;const cpu=localComponent(identity)?.chunk.cpu;if(!cpu||cpu.released||cpu.state!=='ready')return;const pin=cpu.retain('selected');return{contentKey:pin.contentKey,release:()=>pin.release()};},setSelection(identity:Identity){const c=sourceLoaded.get(key(identity))??loaded.get(key(identity));if(!c)throw Error('Selection component not loaded');if(selectedIdentity&&key(selectedIdentity)===key(identity)&&selectionActive)return;selectedIdentity={...identity};selectionActive=true;paintSelection();},clearSelection,suspendSelection(){selectionActive=false;paintSelection();},resumeSelection(){selectionActive=true;paintSelection();},get selected(){return selectedIdentity?{...selectedIdentity}:undefined;},pick(point:{x:number;y:number},signal?:AbortSignal):SurfaceHit|undefined{if(destroyed||pageHidden||!enabled||partitionPending||geometryUploadPending||!gpuReady()||!matrix||signal?.aborted||opacity<.01)return;const canvas=map.getCanvas();if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.y<0||point.x>canvas.clientWidth||point.y>canvas.clientHeight)return;const inv=inverse(matrix);if(!inv)return;const x=2*point.x/canvas.clientWidth-1,y=1-2*point.y/canvas.clientHeight,origin=project(inv,x,y,-1),far=project(inv,x,y,1),d=sub(far,origin),len=Math.hypot(...d),direction=d.map(n=>n/len);let hit:{c:typeof loaded extends Map<string,infer T>?T:never;distance:number;normal:number[]}|undefined;for(const c of loaded.values()){const local=localComponent(c),packed=local?.chunk.cpu.value,state=local?.chunk.state?.value;if(!local||!packed||!state)continue;const {chunk,row}=local,vertices=packed.vertices,indices=packed.indices,paintData=packed.paint,progressiveData=packed.progressive,stateData=state,rathausProxyMasks=chunk.masks!,ratio=anchorUnit/chunk.source.frame.unit,dx=(packed.anchor[0]-anchor[0])*anchorUnit,dz=-(packed.anchor[1]-anchor[1])*anchorUnit,localOrigin=[(origin[0]-dx)/ratio,origin[1]/ratio,(origin[2]-dz)/ratio],localDirection=direction.map(value=>value/ratio);const growth=componentGrowth(c);if(growth<.005)continue;const box=[...row.box];box[1]*=growth;box[4]*=growth;if(!boxHit(localOrigin,localDirection,box))continue;const pickBlocks70=chunk.pick!.value!,pickRange70=pickBlocks70.ranges.get(key(c)),pickStep70=INDEXED_PICK_BLOCK_TRIANGLES70*3;for(let i=row.start;i<row.end;i+=3){if(pickRange70&&(i-row.start)%pickStep70===0&&!indexedPickBlockHit70(localOrigin,localDirection,pickBlocks70.bounds,pickRange70.offset+(i-row.start)/pickStep70*6)){i=Math.min(row.end,i+pickStep70)-3;continue;}const result=triangle(localOrigin,localDirection,vertices,stateData,indices[i],indices[i+1],indices[i+2],hit?.distance);if(result&&(!hit||result.distance<hit.distance)){
 const triangleIds=[indices[i],indices[i+1],indices[i+2]],frameXY=[0,1].map(axis=>triangleIds.reduce((sum,id,k)=>sum+paintData[id*5+axis]*result.barycentric[k],0));if(f151CrownPickDiscard(paintMode(),progressiveData[triangleIds[2]*4+3])||partialGatePickDiscard(paintMode(),progressiveData[triangleIds[2]*4+3],frameXY)||s402ConnectorPickDiscard(paintMode(),progressiveData[triangleIds[2]*4+3],frameXY)||s036Roof009PickDiscard(paintMode(),progressiveData[triangleIds[2]*4+3],frameXY))continue;
 if(paintMode()===2&&c.objectId==='osm/relation/147095'&&rathausProxyMasks.origin){const o=rathausProxyMasks.origin,m=merc(o),r=anchorUnit/unit(o[1]),dx=(m[0]-anchor[0])*anchorUnit,dz=-(m[1]-anchor[1])*anchorUnit,q=origin.map((v,i)=>v+direction[i]*result.distance);if(rathausProxyMasks.covered(c,(q[0]-dx)/r,q[1]/r/Math.max(growth,.005),(q[2]-dz)/r))continue;}
 hit={c,...result};} }}if(!hit||signal?.aborted)return;const q=origin.map((n,i)=>n+direction[i]*hit!.distance),lnglat=geo(anchor[0]+q[0]/anchorUnit,anchor[1]-q[2]/anchorUnit);return {objectId:hit.c.objectId,partId:hit.c.partId,generation,viewRevision,hitLngLat:lnglat,hitAltitudeM:q[1]*unit(lnglat[1])/anchorUnit,surface:isSourceOnlyGlassRoof(hit.c)||Math.abs(hit.normal[1])/Math.hypot(...hit.normal)>.2?'roof':'wall',distance:hit.distance,opacityContext,surfaceOpacity:opacityContext==='route-selection'?Math.min(opacity,.2):opacity,occludesGround:(opacityContext==='route-selection'?Math.min(opacity,.2):opacity)>=.99};},getSolarShadowAdmission(identity:Identity){const c=loaded.get(key(identity));return {resident:!!c,admitted:solarShadowAdmittedKeys.has(key(identity)),enabled:sceneEnvironment.shadows,mode:solarShadowMode,boundarySHA256:solarBoundary?.boundarySHA256,legacyBoundarySHA256:shadowSourceBoundarySHA||undefined,geometryRole:'accepted-resident-display-mesh',sourceFeature:c?.sourceFeature,packedBounds:c?.box,instantISO:sceneSun.instantISO};},get sceneSunlight(){return {...sceneSun,quality:sceneEnvironment.quality,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,contactShading:'display-wall-foot'};},setSolarShadowBoundary(value:SolarShadowBoundary){const next=prepareSolarShadowBoundary(value);solarBoundary=next;if(updateSolarShadowIndices())uploadShadow();reconcileProgramDemand();map.triggerRepaint();},setSceneEnvironment(value:SceneEnvironmentState){const next=checkedSceneEnvironment(value),light=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],next.instantISO);const qualityChanged=sceneEnvironment.quality!==next.quality;sceneEnvironment=next;if(qualityChanged)syncFacadeResources();if(!next.shadows)shadowMask.cancelPending?.();sceneSunInstant=next.instantISO;sceneSun=light;const nextReduced=ownerReducedMotion||!next.motion;if(nextReduced!==reducedMotion){reducedMotion=nextReduced;needsBirth=true;if(reducedMotion){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}}if(updateSolarShadowIndices())uploadShadow();reconcileProgramDemand();map.triggerRepaint();},setSunlightInstant(instantISO:string){const next=sceneSolarLight(sceneSunOrigin[0],sceneSunOrigin[1],instantISO);sceneSunInstant=instantISO;sceneSun=next;if(updateSolarShadowIndices())uploadShadow();reconcileProgramDemand();map.triggerRepaint();},setPageHidden(value:boolean){if(value){invalidateMainDraw();residentMainPreparedStamp=undefined;captureDemands.clear();captureRuntime.invalidate();cancelCandidate();clearAbandonedCandidateFailure();programPreparation.cancel();shadowMask.cancelPending?.();}if(value===pageHidden)return;pageHidden=value;if(value)clearProgramSources();windowTexture?.setPageHidden(value);diffuseTexture?.setPageHidden(value);syncFacadeResources();viewRevision++;matrix=undefined;reconcileProgramDemand();if(!value)map.triggerRepaint();},setReducedMotion(value:boolean){ownerReducedMotion=value;const effective=value||!sceneEnvironment.motion;if(effective===reducedMotion)return;reducedMotion=effective;needsBirth=true;if(effective){for(const k of birth.keys())rememberFinishedBirth(k);birth.clear();}viewRevision++;matrix=undefined;map.triggerRepaint();},resetBirthHistory(){birth.clear();seenBirth.clear();needsBirth=true;},setCaptureDemand,preparePlanarReflection,prepareSolarShadow,getSolarShadowCoverage:solarCoverage,getSolarShadowRevision(){return semanticCaptureRevision();},getPlanarReflectionRevision(){return semanticCaptureRevision();},renderPlanarReflection(pass:ResidentPlanarReflectionPass):ResidentPlanarReflectionResult {const scope=committingScope??residentScope,release=scope?.retain();try{return captureRuntime.render(pass);}finally{release?.();}},get residentVertexCount(){return sceneVertexCount();},get stats(){const ownerS434=checkS434Owner138Replacement(s434Owner138Plan?.profile??null,s434Owner138Plan?.entries??[],sourceLoaded,[...loaded.values()],committingScope??residentScope);return {solarDepth:{programs:[...solarResidentKeys()].filter(key=>partitionPrograms.has(key)).length,keys:[...solarResidentKeys()].filter(key=>partitionPrograms.has(key)),sharedWithColour:true,failures:[...solarProgramFailures],revision:solarProgramRevision},programPreparation:programPreparation.stats,geometryPreparation:{revision:geometryUploadRevision,uploaded:geometryResidentUploaded,pending:geometryUploadPending||!!pendingCandidate,candidateGeneration:pendingCandidate?.generation,candidateFailure,failure:geometryUploadFailure,shadowPending:shadowUploadPending},gpuLifecycle:residentGPU?.stats,indexedPickBlocks70:{blockTriangles:chunkPickStats().blockTriangles,blockCount:chunkPickStats().blockCount,rangeCount:chunkPickStats().rangeCount,typedBytes:chunkPickStats().typedBytes,growthEnvelope:[0,1],generation},contextRecovery:{attempts:contextRecoveryAttempts,successes:contextRecoverySuccesses,pending:contextRecoveryPending,failure:contextRecoveryFailure},mainGeometryProgramFailure,geometryContextLost:gl?.isContextLost()??false,sourceRoleCohort:s434PackingDiagnostic?{active:!!s434DisplayProfile||!!ownerS434,displayResolution:ownerS434??null,legacyAggregateMaskActive:!!s434DisplayProfile,pending:s434PackingDiagnostic.pending,lastFailure:s434DisplayProfile||ownerS434?null:s434PackingDiagnostic.lastFailure??(s434PackingDiagnostic.active?'required-member-not-drawable':'profile-not-ready'),triggered:s434PackingDiagnostic.selection?.triggered,cohortEnabled:s434PackingDiagnostic.selection?.enabled,cohortReason:s434PackingDiagnostic.selection?.reason,minVertices:s434PackingDiagnostic.selection?.minVertices,reservedRetainedBytes:s434PackingDiagnostic.selection?.reservedRetainedBytes,requiredLeafIds:s434PackingDiagnostic.selection?.requiredLeafIds,identities:s434PackingDiagnostic.selection?.identities.map(row=>({...row,packingAfterDrawableFilters:s434DrawableCounts.get(key(row))??0,displayed:loaded.has(key(row))}))}:undefined,sourceRoleDisplay:copyBuildingComponentReadback([...[...sourceLoaded.values()].flatMap(c=>{const profile=sourceRoleDisplayProfile(c);return profile?[{...profile,sourceArraysRetained:true}]:[];}),...(s434DisplayProfile?[{...s434DisplayProfile}]:[])]),partialGateDisplay,s402ConnectorDisplay,s036NorthCofaceDisplay,s240BaseCofaceDisplay,f151CrownDisplay,immutableAltesSourceReadback:immutableAltesSourceReadback.observe(sourceLoaded.get('osm/relation/22988|osm/relation/22988/component/adcf363724f0b4c7c037')),progressiveDiagnostic,progressivePaintDiagnosticState:residentScope?'available':'unprepared',progressivePaintAppliedComponents:structuredClone(residentProgressiveStatus),progressivePaintRejectedAdmissions:residentScope?progressivePaintRejections():[],progressivePaintAdmissions:residentScope?progressivePaintCount():undefined,tvBaseRepair:{programReady:tvBaseRepairProgramReady,programKey:TV_BASE_REPAIR_PROGRAM_KEY,plan:tvBaseRepairPlan,paint:tvBaseRepairPaint},progressivePaintFingerprints,progressiveShaderSpecialization,progressivePaintCPUBytes:chunkTypedBytes('progressive'),progressivePaintGPUBytes:progressiveBuffer?chunkTypedBytes('progressive'):0,appearancePolicy:'md-admitted-native-facade-paint',rathausProxyFragments:rathausProxyMasks.stats,architecturalDescriptions:DESCRIPTION_BINDINGS.map(d=>({file:d.file,sha256:d.sha256})),facadePaintMode:paintMode(),facadePaintOverride:paintOverride(),facadePaintGPUBytes:paintBuffer?chunkTypedBytes('paint'):0,facadePaintCPUBytes:chunkTypedBytes('paint'),addedGeometryVertices:ownerReconstruction.vertices,addedGeometryTriangles:ownerReconstruction.triangles,ownerAuthorizedReconstruction:copyBuildingComponentReadback(ownerReconstruction),ownerDisplayBudget,heldSourceOutlines:heldSourceOutlines.map(r=>({objectId:r.outline.objectId,partId:r.outline.partId,visibleBody:{objectId:r.body.objectId,partId:r.body.partId},sourceRetained:true,reason:'exact-native-building-part-footprint'})),landmarkVisible,facadeAttached,diffuseShaderFailure,diffuseShaderAttempted,diffuseTexture:diffuseTexture?.stats,textureShaderFailure,textureShaderAttempted,paintProgramPartitions:{lastCompileAttempt:partitionCompileAttempt,failures:[...partitionFailures],offscreenPaintRunsSkipped,conservativeClipCulling:true,enabled:partitionEnabled,legacyPartitions:legacyPartitionEnabled,initialFamily:[0],missingDrawPolicy:'pending-no-substitute',baseFragmentBytes:progressiveShaderSpecialization?.fragmentBytes??0,plan:publishedProgramPlan?.identity,pending:partitionPending,mainPreparation:'all-actual-required-recipes',cachedPrograms:partitionPrograms.size,captureOwnedCount:heldCaptureDemandKeys.size,captureOwnedKeys:[...heldCaptureDemandKeys].slice(0,32),cachedKeys:[...partitionPrograms.keys()],runs:partitionRuns.length,sourceIndicesPreserved:true,drawOrderPreserved:true},geometryPrograms:new Set([program,texturedProgram,diffuseProgram,...partitionPrograms.values()].filter(Boolean)).size,windowTexture:windowTexture?.stats,pageHidden,needsBirth,growthHistory:seenBirth.size,growthHistoryLimit:BIRTH_LIMIT,activeBirths:birth.size,components:loaded.size,vertices:sceneVertexCount(),triangles:sceneIndexCount()/3,gpuBufferBytes:chunkTypedBytes('progressive')+chunkTypedBytes('paint')+chunkTypedBytes('vertices')+chunkTypedBytes('state')+chunkTypedBytes('indices')+(shadowIndexBuffer?sceneShadowIndexCount()*4:0)+chunkMaskBytes('allocatedGPUBytes'),cpuTypedArrayBytes:chunkTypedBytes('baseState')+chunkPickStats().typedBytes+chunkTypedBytes('progressive')+chunkTypedBytes('paint')+chunkTypedBytes('vertices')+chunkTypedBytes('indices')+chunkTypedBytes('state')+sceneShadowIndexCount()*4+chunkMaskBytes('allocatedCPUBytes'),shadowAdmittedComponents,shadowHeldComponents:loaded.size-shadowAdmittedComponents,shadowTriangles:sceneShadowIndexCount()/3,shadowIndexBytes:sceneShadowIndexCount()*4,shadowGPUReady:!!(shadowProgram&&shadowVao&&shadowIndexBuffer),shadowFailure,shadowDraws,shadowMask:shadowMask.stats,shadowDrawBatchesPerFrame:shadowProgram&&sourceShadowOpacity(opacity,opacityContext)>0?2:0,shadowRole:'date-time-solar-display',solarAdmissionRole:'accepted-resident-display-mesh; source and owner provenance unchanged',sceneEnvironment:{...sceneEnvironment,activeSunDirection:sceneSun.direction,shadowMode:sceneEnvironment.shadows?solarShadowMode:'disabled',dynamicShadowAdmitted:solarShadowAdmitted,dynamicShadowWithheld:solarShadowWithheld,minimumShadowSolarAltitudeDegrees:SCENE_SHADOW_MIN_ALTITUDE_DEGREES,boundarySHA256:solarBoundary?.boundarySHA256,fixedShadowIndexBytes,dynamicShadowIndexBytes:sceneShadowIndexCount()*4},sourceObjectsStillRetained:true,sourceComponents:sourceLoaded.size,nativeGroupDisplay:nativeGroupPlan?.groups.map(g=>({relationId:g.relationId,outline:{objectId:g.outline.objectId,partId:g.outline.partId},declaredPartCount:g.declaredPartCount,compiledPartCount:g.compiledPartCount,residentPartCount:g.residentPartCount,missingPartIds:g.missingPartIds,unknownPartIds:g.unknownPartIds,ownershipUnverifiedPartIds:g.ownershipUnverifiedPartIds,viewportMissingPartIds:g.viewportMissingPartIds,complete:false})),nativeGroupDisplayErrors:copyBuildingComponentReadback(nativeGroupPlan?.errors),measurement:'allocated typed arrays; not total process/GPU heap' as const};},destroy(){if(destroyed)return;releaseStreamChunks(sceneChunks);sceneChunks=[];sceneSpans=[];sceneChunkInput=undefined;residentMainMaskChunks=[];residentResetRevision++;destroyed=true;cancelCandidate();residentMaterialStyles=[];partitionRuns=[];captureRuntime.invalidate();immutableAltesSourceReadback.destroy();enabled=false;selectedIdentity=undefined;document.removeEventListener('facade-paint-camera',paintCamera);document.removeEventListener('facade-paint-change',repaintPaint);map.off('move',move);map.off('resize',move);map.off('webglcontextlost',contextLost);map.off('webglcontextrestored',contextRestored);forgetPaintVisibility(loaded);loaded.clear();residentProgressiveStatus=[];sourceLoaded=new Map();s434DisplayProfile=null;s434PackingDiagnostic=undefined;s434Owner138Plan=undefined;s434DrawableCounts.clear();nativeGroupPlan=undefined;heldSourceOutlines=[];birth.clear();seenBirth.clear();rathausProxyMasks.destroy();fixedShadowIndexBytes=0;solarShadowAdmittedKeys.clear();solarBoundary=undefined;matrix=undefined;try{releaseGPU();programPreparation.dispose();residentGPU?.detach();windowTexture?.destroy();diffuseTexture?.destroy();}finally{resetPreparedData();releaseGenerationScopes();}}};
}
