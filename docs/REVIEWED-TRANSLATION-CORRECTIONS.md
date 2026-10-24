# Reviewed translation corrections

`config/reviewed-translation-corrections.v1.json` delivers 29 reviewed field
corrections: nine titles, eighteen summaries and two body sentences, across
fourteen source cards. Source URLs, source response/text hashes and old/new
translated-field hashes bind every correction to its reviewed revision.

Private intake consumers can call
`crimemapsberlin.translation_corrections.apply_correction(record, correction)`.
The field record supplies `text` and the six identity fields documented by the
function. Wrong identities, stale translations and altered patch output fail
closed. Applying an already corrected record is idempotent. Body patches replace
one sentence and preserve all other paragraphs; full source bodies and runtime
archives are not included in Git.

The October 25, 2026 private preview passed 126 title/summary/body display checks
(14 affected cards in German, English and Chinese), with no console errors.
The patch bundle is independently reusable; merging it does not rebuild or
publish city datasets, resolve unknown geometry, or promote statistical counts.
Four source-scene ambiguities remain held and seven outside-city exclusions
remain in the private source ledger.
