# Berlin Paul-Löbe material program reuse and distant detail

The first admitted cohort is delegated500 families 19401–19415 (Paul-Löbe-Haus). Native geometry, owner reconstruction, all component/index ranges, paint attributes, selection, shadow geometry and reflection clipping remain unchanged. Other material families, including 20801 with its circular and truss cutouts, retain their current detail programs.

## Full detail is shared without changing its shader

These 15 families currently produce identical complete specialized fragment programs, including the outer main, masks and lighting. The renderer checks exact assembled-source equality once for this finite cohort, retaining only a boolean. Only on equality does the cache use `current-family:19401` for the cohort; original family attributes remain in every vertex. A later repair which differentiates a family automatically disables the shared key. No general program deduplication framework or extra GPU ownership map is introduced: there is one key and one owned program, with the existing delete and reflection paths.

The reviewed assembled shader was 894,293 characters before specialization. Each full-detail result was 94,421 characters, SHA-256 `3d8882f19899e6f64549d0ac4969a44b5188a8e42efc2602168dcb33bfc5b491`. These are source sizes, not GPU allocation or renderer memory measurements.

## Distant detail is a finite, source-bound alternative

The current Paul-Löbe GLSL stays untouched. A narrow transformation derives a separate distant function only when the exact current source and dispatcher contract match. It retains concrete/glass principal colours, solar-roof panel regions and beams, principal windows, the circular hall grid and finite entrances. It removes only named finer seams, gaskets, solar-cell lines, handle and trim layers. This cohort has no material-level discard; structural clipping in the surrounding renderer is unchanged. A new discard, depth operation, family-dependent branch or unmatched source edit disables the distant contract.

`projected-detail-policy.ts` projects the actual component bounds with the current MVP. The initial conservative thresholds are 32 CSS px to enter distant and 48 CSS px to return to detail, with drawing-buffer pixel dimensions available from the helper. Unknown/invalid bounds, near-plane intersections and selected components request detail. If any visible component of one original family needs detail, that family uses detail. Classification is separate from the common cache key, so a nearby family does not cause an unrelated distant family to lose its own classification. The thresholds need a bounded browser visual check before release.

One program is shared by every admitted distant family. A mixed view therefore needs at most one complete-detail and one distant program for the cohort. Replacement is compiled before its unused alternative is retired. The previous complete material remains available during the existing one-program-per-frame compilation queue. A distant program stays protected when a resident reflection component still has no complete-detail program; it is released after a usable rich replacement exists or the resident geometry is gone. No new geometry buffer, source fetch, body cache or material framework is added.

## Verification boundary

`node --test web/tests/berlin-distant-paint.test.mjs` checks the finite admission, original detail preservation, coarse colour/roof/entry contract, exact equality failure case, quality ownership/deletion and renderer integration syntax. A private optional actual-build check uses a supplied local assembled-shader module (`CRIMEMAPS_ASSEMBLED_REVIEW_MODULE`) with SHA-verified city-profile payloads. That check confirmed identical full-detail results for all 15 families, an unchanged outer main and 92,628 characters for the shared distant program.

No browser, complete application build or performance measurement is implied by these source checks. This cohort-specific change does not implement geometry LoD, simplify complete visible buildings, cover every Berlin landmark, or prove a memory target. User-visible near-detail fidelity remains the current shader; all unknown cohorts stay detailed.

## Additional exact program sharing and residency

The church provider's Berlin families 200, 201, 202, 203, 204, 205, 208, 209, 210 and 211 also produced identical complete submitted fragment programs in the observed scene: 71,292 characters, SHA-256 `e486559399f8094478f3888495808c34fe7a261e3e23ecc7ad0fe55b1d4190cd`. The vertex source and attribute bindings are common. The same fragment assembly function now serves both the equality check and GPU compilation. A successful runtime equality check maps these finite keys to one owned program; a failed check keeps the original independent keys. Main drawing and reflection use the same mapping, while the original per-vertex family and all material code remain intact. The root500 owner6381 and base programs were different and are not shared.

An immediate historical-program retirement candidate was withdrawn. Partial shard commits can temporarily omit a material that the same viewport needs once its remaining shards arrive; treating that temporary set as final can trigger unnecessary recompilation. The existing program-cache behavior is retained here. This source-level issue was established separately from the measured peak: post-run church and delegated eviction counters were zero, so the observed process-memory rise is not attributed to it.

The overview transition releases all five providers' native source leases, decoded caches, component batches and GPU programs. A browser check confirmed zero native source entries/holders and zero provider components/programs/GPU buffer bytes at overview; the small empty picking index remains allocated. Returning near restores the accepted source geometry and original materials. This source lifecycle check is distinct from OS memory reclamation.

The route before church sharing reduced the first 300-second OS peak from 3,456,833,368 to 1,695,387,896 bytes, but the complete overview/return route reached 2,354,140,296 bytes and failed the overall half-peak target. Action timings differed, so these are bounded observations rather than isolated causal estimates. Church sharing requires a new complete route; program counts alone do not establish its memory savings.

`npm --prefix web run test:material-program-lifecycle` checks exact-sharing fallback, canonical ownership and main/reflection integration. The private actual-source check additionally binds the 71,292-character results to the accepted data without committing generated city payloads.
