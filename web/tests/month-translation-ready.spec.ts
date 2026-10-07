import {createHash} from "node:crypto";
import {test, expect} from "./fixture";

test("category refresh cannot expose month rows before their translations are ready", async ({page}) => {
  const generation = "0123456789abcdef-20261007T000000";
  const empty = {type: "FeatureCollection", features: []};
  const original = "Original summary";
  const translated = "Translated summary";
  const source = "https://www.berlin.de/polizei/translation-race-fixture";
  let translationRequested!: () => void;
  const requested = new Promise<void>(resolve => {translationRequested = resolve;});
  let releaseTranslation!: () => void;
  const released = new Promise<void>(resolve => {releaseTranslation = resolve;});

  await page.route("http://127.0.0.1:4173/safety/**", async route => {
    const url = route.request().url();
    if (url.includes("/translations/en/")) {
      translationRequested();
      await released;
      return route.fulfill({json: {
        schema_version: 1, city: "berlin", month: "2026-09", locale: "en",
        source_generation: generation, texts: {}, fields: [{
          city: "berlin", source_id: "translation-race-fixture",
          source_sha256: "a".repeat(64), field: "/scene_locations/0/details",
          text_sha256: createHash("sha256").update(original).digest("hex"),
          translated_text: translated,
        }],
      }});
    }
    if (url.endsWith("manifest.json")) return route.fulfill({json: {
      schema_version: 2, city: "Berlin", generation,
      retrieved_at: "2026-09-30T12:00:00Z",
      coverage: {discovered: 1, fetched: 1, pending: 0, failed: 0},
      months: {"2026-09": {count: 1}},
      years: {"2026": {path: "years/2026.json", announcement_count: 1,
        countable_announcement_count: 0, sha256: "0".repeat(64)}},
      translations: {en: {"2026-09": "translations/en/2026-09.json"}},
      categories: ["raub"], tile_index: {pois: [], roads: []}, tile_size: [0.04, 0.025],
      catalog: {poi_types: {}, sources: [], coverage: [], exhaustive: false},
      zones: {places: [], features: [], geometry_status: "pending"},
      metadata: {zoom_threshold: 13},
    }});
    if (url.includes("/years/")) return route.fulfill({json: {
      schema_version: 1, city: "Berlin", source_generation: generation, year: "2026",
      announcement_count: 1, countable_announcement_count: 0,
      countable_event_ids: [], event_months: {}, event_categories: {},
      hex: {overview: empty, detail: empty},
    }});
    if (url.includes("/months/")) return route.fulfill({json: {
      event_ids: ["translation-race-fixture"], events: [{
        id: "translation-race-fixture", source_id: "translation-race-fixture",
        source_sha256: "a".repeat(64), source_url: source,
        title: "Fixture announcement", category: "raub", month: "2026-09",
        coordinates: null, location_precision: "unknown", location_label: "",
        poi_mentions: [], scene_locations: [{
          label: "Unknown location", role: "incident", location_precision: "unknown",
          geocode_method: "none", primary_for_count: false, coordinates: null,
          geometry_review: {verdict: "unresolved"}, details: original,
        }],
      }], hex: {overview: empty, detail: empty}, links: [],
    }});
    return route.fulfill({json: empty});
  });

  try {
    await page.goto("/?lang=en&month=2026-09");
    await requested;
    // This refresh used to make the untranslated source rows selectable.
    await page.getByRole("combobox", {name: "Report category", exact: true}).selectOption("raub");
    await expect(page.locator("#map-status")).toContainText("Loading the selected month…");
    await expect(page.getByRole("heading", {name: "Fixture announcement", exact: true})).toHaveCount(0);
    releaseTranslation();
    const card = page.getByRole("listitem").filter({has: page.locator(`a[href="${source}"]`)}).first();
    await expect(card).toBeVisible();
    await card.getByRole("button", {name: "Read this announcement", exact: true}).click();
    await expect(page.getByRole("dialog")).toContainText(translated);
    await expect(page.getByRole("dialog")).not.toContainText(original);
  } finally {
    releaseTranslation();
  }
});
