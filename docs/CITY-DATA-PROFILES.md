# City data profiles

Each city publication selects its own admission rows and city shader dictionaries before the browser downloads or parses them. Source identity remains the original canonical SHA-256. The generated profile separately records the selected raw SHA-256 and physical gzip SHA-256; the existing frozen-input reader verifies both. Unknown cross-city model contracts are unchanged. The historical non-Berlin Hamburg shader fallback is retained explicitly.

The compiler validates the complete canonical admissions with the existing admission initializer before selecting rows. It preserves the original row lexemes, order, numeric values, provenance fields and global admission count. Runtime diagnostics expose the retained city count separately. A reduction in serialized input bytes is not a measured heap or process-memory reduction.

Generated profiles and gzip payloads belong in the ignored runtime workspace and detached accepted site. Do not commit generated city data or raw report bodies. The profile compiler and recipes are source code. Use verified canonical painted assets from the accepted source package; there is no network download or paid service in this step.

From the repository root, generate one city's profile (or use `--all` for the fourteen-city integration):

```sh
node scripts/city-data-profile.mjs generate \
  --web-root web \
  --asset-root /absolute/path/to/verified-painted-assets \
  --asset-root /absolute/path/to/additional-canonical-assets \
  --output .runtime/city-data \
  --city berlin
```

Every `--asset-root` contains `safety/buildings3d/painted-tables/`. Roots can be repeated. The requested city must match `city-config.json` when building. Use an absolute profile path because the build command runs in `web/`:

```sh
CRIMEMAPS_CITY_PROFILE="$PWD/.runtime/city-data/berlin/profile.json" \
  npm --prefix web run build
```

The build emits `city-data-build-receipt.json` with the selected city and exact profile SHA-256. A normal production build fails without a matching profile. CI explicitly uses `CRIMEMAPS_BUILD_PURPOSE=code-check` to type-check and bundle source without generated assets; that output is not a publishable site and cannot pass the profile activation gate.

After the existing production assembler has verified the accepted city data and copied the actual city frontend, apply the generated overlay to that new private site:

```sh
node scripts/city-data-profile.mjs assemble \
  --profile .runtime/city-data/berlin/profile.json \
  --build web/dist \
  --site .runtime/accepted-site \
  --apply
python3 scripts/migration/verify_city_data_profile.py \
  --site .runtime/accepted-site --city berlin
```

The generated `runtime-table-manifest.json` is the current city's complete active frozen-table descriptor list. If running the existing appearance-asset verifier on the assembled city, pass this manifest explicitly; the repository's canonical manifest intentionally also describes unselected source inputs:

```sh
python3 tools/verify-painted-assets.py .runtime/accepted-site \
  --manifest .runtime/accepted-site/city-data-tables.json
```

The overlay verifies each selected asset and removes a replaced canonical input only when no active unprojected consumer needs it, and only if its existing size and SHA-256 match. It writes the small profile, build receipt, overlay receipt and `city-data-tables.json` into the site. The overlay receipt binds that effective table manifest by SHA-256; the Pages profile gate checks the binding. Run the existing SEO, capacity, scientific and product acceptance checks after assembly; include these files in the final detached integrity manifest. Pages verifies the ordinary accepted release first, then checks the city profile and selected asset identities. This additional gate does not replace any source-review or publication approval gate.

Focused source check:

```sh
npm --prefix web run test:city-data-profile
```

The portable test uses synthetic fixtures to cover selection, lexical fidelity, global-count validation, cancellation/retry, independent parsed values and activation failures. Actual release inputs additionally require the integration's exact per-city equivalence receipt; a synthetic test alone does not establish real-data equivalence or browser memory acceptance.
