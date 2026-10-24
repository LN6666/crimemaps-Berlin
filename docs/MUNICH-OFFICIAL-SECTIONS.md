# Munich official announcement sections

`munich_official_sections.import_sections` accepts a reviewed official announcement
candidate against an existing, hash-verified `reports` checkpoint. It writes an
additive `munich_official_section_reviews` ledger keyed by native source ID, body
version and candidate digest. Reimporting identical evidence is idempotent;
changed source bytes cannot reuse an old review.

This path preserves the reviewed sections, action phases, location roles and raw
time wording without converting section totals into incident totals. Its input
contract requires an explicitly unasserted incident count, complete review of the
saved narrative, literal source quotes with hashes, resolvable section/location
references, null coordinates and explicit unresolved geometry. The caller must
supply a candidate already reviewed against its source; validation checks evidence
and structure and does not perform semantic review.

The schema is `crimemaps.private-provisional-munich-scene-review.v1`. The adapter
returns `source_binding_accepted: true`, `canonical_event_adopted: false`,
`owner_approved: false`, and `publication_ready: false`. It is an evidence-receiving
entry point, not a map builder or publication approval. Candidate files and SQLite
ledgers stay outside code Git.

The generic city importer continues to exclude Munich. Existing POLIZEIKARTE /
Tickerkarte scan tables and upstream semantics remain unchanged and independently
attributed; an official announcement must not be disguised as a provider entry.
