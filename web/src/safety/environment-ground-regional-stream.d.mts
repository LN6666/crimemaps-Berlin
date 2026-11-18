/** Browser declarations for the frozen metadata stream. All wire/raw Assets
 * must be verified by the admitted reader. ACK transfers no budget authority.
 * Use manual next(): for-await discards the only closed terminal receipt.
 */
import type {Asset,BBox,SourceBinding,ExpectedBinding,DiscoveryBinding,RegionalCounts,
 RegionalGroundManifest,RegionalGroundCohort,SelectionTotals} from './environment-ground-regional.mjs';
export {REGIONAL_GROUND_LIMITS} from './environment-ground-regional.mjs';
export type {Asset,BBox,SourceBinding,RegionalGroundCohort};
export interface StreamExpectedBinding extends ExpectedBinding {
 readonly source_partition_proof:Asset;
 /** Actual regional implementation, independent of its geometry dependency. */
 readonly regional_implementation_sha256:string;
 readonly exact_geometry_producer_sha256:string;
}
export interface StreamRegionalGroundManifest extends RegionalGroundManifest {
 readonly source_partition_proof:Asset;
}
export interface CatalogDigest {
 readonly algorithm:'ground-overview-canonical-json-v1/sha256';readonly sha256:string;
}
export interface MembershipDigest {
 readonly algorithm:'sha256/ground-overview-canonical-json-lines-v1';
 readonly order:'features.id SQLite BINARY ascending';readonly rows:number;
 readonly representedRows:number;readonly sha256:string;
}
/** Public-safe terminal export; contains no local source paths. The producer
 * verifies its SQLite PK membership / actual cohort metadata bijection. This
 * stream pins that authority and does not independently rescan global IDs.
 */
export interface PublicSourcePartitionProof extends SourceBinding {
 readonly schema:'environment-ground-source-partition-proof-v1';readonly schema_version:1;
 readonly source_index:Asset;readonly discovery:DiscoveryBinding;readonly counts:RegionalCounts;
 readonly catalog_digest:CatalogDigest;readonly membership:MembershipDigest;
 readonly regional_implementation_sha256:string;readonly exact_geometry_producer_sha256:string;
 readonly proof_exporter_sha256:string;
}
export interface ReleasingMetadata {
 readonly value:unknown;
 /** Actual verification result from wire/raw bytes, never a request echo. */
 readonly identity:Asset;
 /** Clears admitted claims AND reader/cache references; idempotent owner hook. */
 release():void|Promise<void>;
}
export type StreamMetadataReader=(asset:Asset,signal?:AbortSignal)=>
 ReleasingMetadata|null|undefined|Promise<ReleasingMetadata|null|undefined>;
export interface RegionalStreamItem {
 readonly kind:'cohort';readonly sequence:number;readonly pageId:string;
 readonly rootSHA256:string;readonly sourcePartitionProofSHA256:string;
 readonly binding:SourceBinding;readonly cohort:RegionalGroundCohort;
}
export interface VerifiedSourcePartition {
 readonly proofSHA256:string;readonly regional_implementation_sha256:string;
 readonly exact_geometry_producer_sha256:string;readonly catalog_digest:CatalogDigest;
 readonly membership:MembershipDigest;readonly authority:'verified-producer-terminal-sqlite-membership';
 readonly runtimeMembershipRescanned:false;
}
export interface RegionalStreamClosure {
 readonly schema:'F-regional-ground-stream-closure-v1';readonly closed:true;
 readonly status:'complete'|'partial-source-held';
 readonly coverageComplete:boolean;readonly sourceCoverageComplete:boolean;
 readonly root:Asset;readonly sourcePartitionProof:Asset;readonly sourcePartition:VerifiedSourcePartition;
 readonly binding:SourceBinding;readonly viewport:BBox;readonly chunkCount:number;
 /** Cumulative totals, never one resident buffer or permission to raise caps. */
 readonly totals:SelectionTotals;readonly selectedPages:number;readonly sourceHeldGreen:number;
 readonly representedSourceGreen:number;
 readonly heldCountScope:'global-pinned-catalog; viewport-held-membership-not-read';
 readonly geometryDecoded:false;readonly fullCityOverviewRenderingAccepted:false;
 readonly metadataReads:number;readonly metadataTransferredBytes:number;
 readonly peakActiveMetadataDocs:number;readonly peakActiveMetadataBytes:number;
 readonly activeMetadataDocs:0;readonly activeMetadataBytes:0;
}
export interface RegionalGroundStream extends AsyncIterator<RegionalStreamItem,RegionalStreamClosure|undefined,void> {
 [Symbol.asyncIterator]():RegionalGroundStream;
 /** ACK previous item only after GPU fence retirement and decoded release. */
 next():Promise<IteratorResult<RegionalStreamItem,RegionalStreamClosure|undefined>>;
 /** Early return cancels traversal and releases metadata; never closed. */
 return(value?:unknown):Promise<IteratorResult<RegionalStreamItem,RegionalStreamClosure|undefined>>;
 throw(error?:unknown):Promise<IteratorResult<RegionalStreamItem,RegionalStreamClosure|undefined>>;
}
/** Root + current page + current cohort only; each <=1MiB, active <=16 docs /
 * 2MiB decoded payload policy. Individual cohorts keep 20k/60k/32/4MiB caps;
 * all intersecting cohorts are traversed regardless of their cumulative size.
 * Only done.value.closed may commit a staged target. Held stays partial.
 */
export function streamRegionalGroundCohorts(rootAsset:Asset,expected:StreamExpectedBinding,viewport:BBox,
 options:{readonly readMetadata:StreamMetadataReader;readonly signal?:AbortSignal}):RegionalGroundStream;
