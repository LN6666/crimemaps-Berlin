/** Retained payload accounting. Typed buffers are exact; JS containers/strings are an estimate, not heap. */
export function estimateRetainedBuildingPayload(value: unknown) {
  const seen = new WeakSet<object>(), buffers = new Set<ArrayBufferLike>(); let typedBufferBytes = 0, estimatedJsContainerBytes = 0, numericSlots = 0, stringCodeUnits = 0;
  const visit = (v: unknown, depth = 0): void => {
    if (depth > 40) throw Error('Building payload nesting exceeds bound');
    if (typeof v === 'number') { numericSlots++; estimatedJsContainerBytes += 8; return; }
    if (typeof v === 'string') { stringCodeUnits += v.length; estimatedJsContainerBytes += 24 + v.length * 2; return; }
    if (typeof v === 'boolean') { estimatedJsContainerBytes += 4; return; }
    if (v === null || v === undefined || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) { if (!buffers.has(v.buffer)) { buffers.add(v.buffer); typedBufferBytes += v.buffer.byteLength; } estimatedJsContainerBytes += 64; return; }
    if (v instanceof ArrayBuffer) { if (!buffers.has(v)) { buffers.add(v); typedBufferBytes += v.byteLength; } estimatedJsContainerBytes += 32; return; }
    estimatedJsContainerBytes += Array.isArray(v) ? 32 + v.length * 8 : 64;
    if (Array.isArray(v)) for (const item of v) visit(item, depth + 1);
    else for (const [k, item] of Object.entries(v)) { estimatedJsContainerBytes += 16 + k.length * 2; visit(item, depth + 1); }
  };
  visit(value);
  return { retainedPayloadEstimateBytes: typedBufferBytes + estimatedJsContainerBytes, typedBufferBytes, estimatedJsContainerBytes, numericSlots, stringCodeUnits, measurement: 'exact-typed-buffers-plus-estimated-js-payload-not-heap' as const };
}
export const THREE_D_DECODED_PAYLOAD_LIMITS = Object.freeze({ desktop: 32 * 1024 * 1024, mobile: 16 * 1024 * 1024 });
