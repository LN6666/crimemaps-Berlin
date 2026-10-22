# Frozen building appearance integration

The integration preserves the accepted rendering sources from five workspaces:

| Implementation | Frozen scope |
| --- | --- |
| `root500` | The original window's 225 accepted full-detail buildings, including its final Exchange repair |
| `delegated500` | The other window's 159 accepted full-detail buildings, including its final courtyard/roof repairs |
| `tier300` | The 326 accepted 300-word buildings, including S262's final cream wall colour |
| `city` | The saved city-centre work, including the selected Munich and Dresden scope and C443's 68 native parts |
| `church` | Existing native church material and facade code from the shared church workspace |

These are overlapping source scopes, not a sum of unique newly painted buildings.
No collection work, painting, geometry reconstruction, or acceptance review was restarted.
Existing limitations in frozen artwork remain limitations; this integration does not
claim a new independent audit of every architectural detail.

## Conflict policy

Use the most detailed accepted implementation of the same building. Exact native
part identities precede object-level fallback. A later timestamp or a lower word
tier does not replace accepted full detail. Where the former 500 and 300 scopes
share source parts, the full-detail implementation is retained. The two full-detail
windows remain isolated so their shader family numbers and reconstruction hooks
cannot overwrite each other.

The runtime has one public camera/lifecycle owner. Frozen implementations retain
their own source verification, display preparation, and material contexts; an
ownership gate before GPU packing assigns each part to one implementation.
Network reads are shared with an overall concurrency limit of two and a 12 MiB
short-lived byte LRU. Supplemental GPU warm-up runs sequentially with a bounded
15-second draw deadline; a failed implementation rolls the whole scene back to
2D rather than leaving missing detailed layers. Every custom
building layer is exposed to context recovery and disposed with the public owner.

## Evidence

- `source-snapshot.json`: original source hashes before adapters and table packing.
- `accepted-targets.json`: frozen 500 and 300 target lists.
- `ownership-evidence.json`: native capture/profile evidence and overlap decisions.
- `packed-table-integrity.json`: exact source JSON text hashes for packed tables.
- `web/src/safety/paint-ownership-registry.json`: the runtime ownership registry.

Large JSON literals in the full-detail implementations are separate verified
tables. They load before their original modules and preserve independent JSON
initializer values between implementations. The integrity check verifies the
original literal bytes, including every numeric geometry and material value; it
does not replace these with approximations. Other packed tables retain their
original JSON text directly in their source modules.

## Data and deployment

This code change does not publish a new website or refresh police data. The current
public report-body loader, translations, selection inspector, transit stop lists,
and source validation remain in place. Generated city data remains in the existing
separate data/release workflow, as required by the repository's working agreement.
Native geometry, pinned owner-shape assets, projection sidecars, and material
assets must be available at their declared paths when preparing a city release.
Original workspaces, screenshots, shared data roots, and symlinks are preserved.

The final pinned custom assets are packaged separately as
`painted-assets-20261023.tar.gz`. Extract it into each prepared site's root before
performing the normal release acceptance checks. `asset-resolution.json` records
all pinned bytes and SHA-256 values; the runtime routes each frozen implementation
to the immutable content address in `paint-asset-registry.json`. This preserves
final preview-server overrides without relying on a running local preview server.
The package preserves 556 data files; its archive digest and release link are in
`asset-package.json`. The package also includes the frozen numeric tables declared in
`frozen-paint-table-manifest.json`. Run `python tools/verify-painted-assets.py
<unpacked-asset-root>` before preparing a city data release.

Run the existing navigation/statistics checks, `node --test
tests/painted-integration.test.mjs`, TypeScript, and the production build from `web/`.

Cold 3D initialization remains substantial: the frozen full-detail tables contain
approximately 584 MiB of original JSON and are checked before their modules load.
The compressed asset archive is approximately 60 MB. This code handoff does not
claim mobile performance acceptance or readiness to deploy a city site. The
current public sites remain on their existing accepted releases.
