import type {ResourceBudget} from './render-runtime/resource-budget';

/** Logical construction estimate for one synchronous Q192/depth18 proof.
 * These are modelled live values, not observed engine allocations or a physical
 * memory cap. The existing page limit is unchanged. The bound on series/work
 * iterations limits computation, not cumulative allocation or GC retention.
 *
 * Q192 values normally use ~193-327 bits. Exact conversion of a binary64
 * subnormal may construct a 883-bit denominator; 1024 bits allows limb slack.
 * 256 live integer slots conservatively covers projection constants, fullPi,
 * exp/atan accumulators, endpoint products/quotients and conversion temporaries.
 * Recursive intervals contain Numbers, not BigInts; their 19 live levels are
 * estimated separately. Extra array/object workspace and adapters are included.
 * The subtotal is rounded up to the next power of two as an estimate margin.
 * Certified closures/fullPi must be local to this work; retained caches need
 * their own lifetime claim and are not authorized by this temporary estimate. */
export const GROUND_PROOF_WORK_MODEL=Object.freeze({
 fractionBits:192,
 maxLiveSubdivisionLevels:19,
 maxExtraCoverageQueries:4095,
 maxSeriesIterations:1_441_664,
 bigIntMagnitudeBitsEstimate:1024,
 liveBigIntSlotsEstimate:256,
 bigIntObjectOverheadBytesEstimate:64,
 bigIntWorkspaceBytesEstimate:256*(1024/8+64),
 subdivisionBytesPerLevelEstimate:1024,
 subdivisionWorkspaceBytesEstimate:19*1024,
 arrayObjectWorkspaceBytesEstimate:64*1024,
 contextAdapterBytesEstimate:8*1024,
 subtotalBytesEstimate:256*(1024/8+64)+19*1024+64*1024+8*1024,
 reservationBytesEstimate:256*1024,
 precision:'estimate' as const,
 measurement:'logical live scratch estimate; engine/GC/physical memory unmeasured' as const,
});
export const GROUND_PROOF_WORK_LABEL='ground proof Q192 construction scratch estimate';

/** Execute only synchronous proof work. Admission uses the actual prepared
 * boundary's ResourceBudget, supplied by its owner. Each call has a distinct
 * allocation identity, so overlapping/reentrant work is charged separately.
 * Quiet refusal throws ResourceBudgetExceededError before work and never emits
 * a false geometric result. The caller owns retry/cancellation policy. */
export function withGroundProofWorkBudget<T>(budget:ResourceBudget,work:()=>T):T{
 const claim=budget.reserve({category:'construction',bytes:GROUND_PROOF_WORK_MODEL.reservationBytesEstimate,precision:'estimate',identity:{},label:GROUND_PROOF_WORK_LABEL},{label:GROUND_PROOF_WORK_LABEL,evict:false});
 try{return work();}finally{claim.release();}
}
