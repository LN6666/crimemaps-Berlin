/** Browser declarations for the byte-exact, privately verified v2 helper.
 * Every input/read identity is still checked at runtime. These types do not
 * grant publication, ownership of read claims, or complete visual coverage.
 */
export type SHA256 = string;
export type BBox = readonly [west:number, south:number, east:number, north:number];
type AssetIdentity = Readonly<{path:string;sha256:SHA256;bytes:number}>;
export type Asset = AssetIdentity & (
  | Readonly<{compression:'gzip';uncompressed_bytes:number;uncompressed_sha256:SHA256}>
  | Readonly<{compression?:undefined;uncompressed_bytes?:number;uncompressed_sha256?:SHA256}>
);
export type TileAsset = Asset & Readonly<{
  id:string;tile_key:string;bbox:BBox;feature_count:number;kinds:Readonly<{green:number}>;
}>;
export interface SourceBinding {
  readonly city:string;
  readonly source_pbf_sha256:SHA256;
  readonly source_snapshot:string;
  readonly source_boundary_sha256:SHA256;
}
export interface DiscoveryBinding {
  readonly stateSHA256:SHA256;
  readonly coverageSHA256:SHA256;
}
export interface ExpectedBinding extends SourceBinding {
  readonly city_boundary:Asset;
  readonly source_index:Asset;
  readonly discovery:DiscoveryBinding;
}
export interface RegionalCounts {
  readonly inputDescriptors:number;
  readonly processedDescriptors:number;
  readonly uniqueGreen:number;
  /** Whole sources whose geometry passed completely. Disjoint from heldGreen. */
  readonly acceptedGreen:number;
  /** Includes partially represented sources; never silently relabeled excluded. */
  readonly heldGreen:number;
  readonly pendingGreen:number;
  readonly heldDescriptors:number;
  readonly cohorts:number;
  /** Unique IDs represented in cohorts, including safe triangles of held sources. */
  readonly representedGreen:number;
}
export interface PageDescriptor {
  readonly id:string;
  readonly bbox:BBox;
  readonly asset:Asset;
}
export interface RegionalGroundManifest extends SourceBinding {
  readonly schema:'environment-ground-regional-manifest-v1';
  readonly schema_version:1;
  readonly city_boundary:Asset;
  readonly source_index:Asset;
  readonly discovery:DiscoveryBinding;
  readonly status:'partial'|'complete';
  readonly discovery_complete:boolean;
  readonly cohort_catalog_complete:boolean;
  readonly catalog_closed:boolean;
  readonly source_coverage_complete:boolean;
  readonly counts:RegionalCounts;
  readonly pages:readonly PageDescriptor[];
  readonly held_pages:readonly PageDescriptor[];
}
export interface CohortHeader {
  readonly id:string;
  readonly bbox:BBox;
  readonly feature_count:number;
  readonly vertices:number;
  readonly index_count:number;
  /** Canonical plus packed asset raw bytes, excluding metadata/provenance. */
  readonly raw_bytes:number;
  readonly leaves:number;
  readonly metadata:Asset;
}
export interface RegionalGroundPage extends SourceBinding {
  readonly schema:'environment-ground-regional-page-v1';
  readonly schema_version:1;
  readonly cohorts:readonly CohortHeader[];
}
export interface CohortCounts {
  readonly features:number;
  readonly vertices:number;
  readonly indices:number;
  readonly rawBytes:number;
  readonly leaves:number;
}
export interface RegionalGroundCohortDocument extends SourceBinding {
  readonly schema:'environment-ground-regional-cohort-v1';
  readonly schema_version:1;
  readonly id:string;
  readonly bbox:BBox;
  readonly source_feature_ids:readonly string[];
  readonly canonical_ground_tiles:readonly TileAsset[];
  readonly ground_far_mesh?:Asset;
  readonly counts:CohortCounts;
  readonly provenance:Asset;
  readonly source_feature_bindings_sha256:SHA256;
}
/** Immutable projection returned by selection, not a decoded mesh or source lease. */
export interface RegionalGroundCohort extends CohortHeader {
  readonly source_feature_ids:readonly string[];
  readonly canonical_ground_tiles:readonly TileAsset[];
  readonly ground_far_mesh?:Asset;
  readonly provenance:Asset;
  readonly source_feature_bindings_sha256:SHA256;
}
declare const inspectedRoot:unique symbol;
/** Opaque inspector result; callers cannot construct a valid root structurally. */
export interface ValidatedRegionalGroundManifest {
  readonly [inspectedRoot]:true;
  readonly binding:SourceBinding;
  readonly source_index:Asset;
  readonly city_boundary:Asset;
  readonly discovery:DiscoveryBinding;
  readonly status:'partial'|'complete';
  readonly sourceCoverageComplete:boolean;
  readonly discoveryComplete:boolean;
  readonly cohortCatalogComplete:boolean;
  readonly catalogClosed:boolean;
  readonly representedCountDeclared:boolean;
  readonly counts:RegionalCounts;
  readonly pages:readonly PageDescriptor[];
  readonly heldPages:readonly PageDescriptor[];
}
export interface InspectOptions {readonly signal?:AbortSignal}
/** identity must be an actual wire/raw verification result from the existing
 * admitted reader, not an echo of the requested Asset. Caller owns all claims
 * and must retain metadata charges while a result remains referenced.
 */
export interface MetadataReadResult {readonly value:unknown;readonly identity:Asset}
export type MetadataReadOutcome = MetadataReadResult|null|undefined;
export type MetadataReader = (asset:Asset,signal?:AbortSignal) => MetadataReadOutcome|Promise<MetadataReadOutcome>;
export interface SelectionOptions {
  readonly readMetadata:MetadataReader;
  readonly signal?:AbortSignal;
}
export interface PlanOptions extends SelectionOptions {
  readonly allowCatalogClosedSourceHeld?:boolean;
}
export interface SelectionTotals {
  readonly vertices:number;
  readonly indices:number;
  readonly rawBytes:number;
  readonly leaves:number;
  readonly features:number;
}
interface PlanBase {
  readonly reason:string;
  /** All intersecting cohort IDs, including on a budget refusal. */
  readonly requiredCohortIds:readonly string[];
  readonly totals:SelectionTotals;
  readonly metadataReads?:number;
  /** May report the required size on a metadata refusal, before those reads. */
  readonly metadataBytes?:number;
}
export interface StrictCompletePlan extends PlanBase {
  readonly status:'complete';
  readonly canReplacePublication:true;
  readonly keepPreviousPublication:false;
  readonly cohorts:readonly RegionalGroundCohort[];
  readonly sourceCoverageComplete:true;
  readonly geometryDecoded:false;
  readonly fullCityOverviewRenderingAccepted:false;
}
export interface ExplicitCompletePlan extends StrictCompletePlan {
  readonly coverageComplete:true;
  readonly sourceHeldGreen:0;
}
export interface PartialSourceHeldPlan extends PlanBase {
  readonly status:'partial-source-held';
  readonly canReplacePublication:true;
  readonly keepPreviousPublication:false;
  readonly cohorts:readonly RegionalGroundCohort[];
  readonly coverageComplete:false;
  readonly sourceCoverageComplete:false;
  /** Global source truth; held membership of this viewport was not read. */
  readonly sourceHeldGreen:number;
  readonly representedSourceGreen:number;
  readonly acceptedWholeSourceGreen:number;
  readonly heldCountScope:'global-pinned-catalog; viewport-held-membership-not-read';
  readonly heldPageCandidates:readonly PageDescriptor[];
  readonly geometryDecoded:false;
  readonly fullCityOverviewRenderingAccepted:false;
}
interface RefusedPlan extends PlanBase {
  readonly canReplacePublication:false;
  readonly keepPreviousPublication:true;
  /** Refused plans never expose a publishable prefix. */
  readonly cohorts:readonly [];
}
export interface UnfitPlan extends RefusedPlan {
  readonly status:'unfit';
  readonly requiredPageIds?:readonly string[];
  readonly exceeded?:readonly ('vertices'|'indices'|'leaves'|'rawBytes')[];
}
export interface MissingPlan extends RefusedPlan {readonly status:'missing'}
export interface CancelledPlan extends RefusedPlan {readonly status:'cancelled'}
export type FailedPlan = UnfitPlan|MissingPlan|CancelledPlan;
export type StrictSelectionResult = StrictCompletePlan|FailedPlan;
export type RegionalGroundPlan = ExplicitCompletePlan|PartialSourceHeldPlan|FailedPlan;
export const REGIONAL_GROUND_LIMITS:Readonly<{
  vertices:20000;indices:60000;leaves:32;rawBytes:4194304;
  metadataBytes:2097152;metadataAssetBytes:1048576;pages:16;
}>;
/** Input root wire/raw identity must already be verified before parsing. */
export function inspectRegionalGroundManifest(value:unknown,expected:ExpectedBinding,options?:InspectOptions):ValidatedRegionalGroundManifest;
/** Default strict behavior: partial roots remain missing. */
export function selectRegionalGroundCohorts(root:ValidatedRegionalGroundManifest,viewport:BBox,options:SelectionOptions):Promise<StrictSelectionResult>;
/** Explicit source-held mode requires a closed catalog and all original caps. */
export function planRegionalGroundCohorts(root:ValidatedRegionalGroundManifest,viewport:BBox,options:SelectionOptions&{readonly allowCatalogClosedSourceHeld:true}):Promise<RegionalGroundPlan>;
export function planRegionalGroundCohorts(root:ValidatedRegionalGroundManifest,viewport:BBox,options:SelectionOptions&{readonly allowCatalogClosedSourceHeld?:false}):Promise<ExplicitCompletePlan|FailedPlan>;
export function planRegionalGroundCohorts(root:ValidatedRegionalGroundManifest,viewport:BBox,options:PlanOptions):Promise<RegionalGroundPlan>;
