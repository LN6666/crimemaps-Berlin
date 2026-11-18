import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

async function bundled(path, suffix = '') {
  const result = await build({entryPoints: [new URL(path, import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', write: false});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${suffix}`);
}
const {locationScopeTranslationKey} = await bundled('../src/safety/location-scope-presentation.ts');
const translators = {};
for (const language of ['zh', 'en', 'de']) {
  globalThis.location = {search: `?lang=${language}`};
  translators[language] = (await bundled('../src/safety/i18n.ts', language)).t;
}
delete globalThis.location;

function upstream(overrides = {}) {
  return {location_scope: 'in_city', location_precision: 'city', coordinates: null,
    upstream_provider: 'POLIZEIKARTE', upstream_public_precision: 'CITY',
    upstream_coordinates: [11.58, 48.14], incident_basis: 'owner_accepted_polizeikarte_upstream',
    semantic_basis: 'owner_accepted_polizeikarte_upstream', source_status: 'polizeikarte_complete_365_day_snapshot',
    geocode_method: 'polizeikarte_supplied_nonpoint_location', geocode_evidence: [], ...overrides};
}

test('coarse provider coordinates use reference-only copy in all three languages', () => {
  const cities = {zh: '慕尼黑', en: 'Munich', de: 'München'};
  const checks = {
    zh: [/参考坐标/, /只表示城市或行政区/, /不能据此确定事件地点/],
    en: [/reference coordinate/, /only a city or district/, /does not establish the incident location/],
    de: [/Referenzkoordinate/, /nur eine Stadt oder einen Stadtteil/, /belegt keinen Ereignisort/],
  };
  for (const precision of ['city', 'district']) for (const scope of ['in_city', 'outside_city']) {
    const event = upstream({location_precision: precision, upstream_public_precision: precision.toUpperCase(), location_scope: scope});
    const before = structuredClone(event);
    const key = locationScopeTranslationKey(event);
    assert.equal(key, `scope.provider_reference_${scope}`);
    for (const language of ['zh', 'en', 'de']) {
      const result = translators[language](key, {city: cities[language]});
      for (const pattern of checks[language]) assert.match(result, pattern);
      assert.doesNotMatch(result, /\{city\}/);
      if (scope === 'outside_city') {
        assert.ok(result.includes(cities[language]));
        assert.match(result, {zh: /不计入市域六边形/, en: /not counted in city hexagons/, de: /im städtischen Raster nicht gezählt/}[language]);
      }
    }
    assert.deepEqual(event, before, 'presentation must not alter event data or count fields');
  }
});

test('street, missing-coordinate, unknown scope and ordinary outside behavior remain unchanged', () => {
  const cases = [
    [upstream({location_precision: 'street', upstream_public_precision: 'STREET', coordinates: [11.58, 48.14]}), 'scope.in_city'],
    [upstream({location_scope: 'outside_city', location_precision: 'street', upstream_public_precision: 'STREET'}), 'scope.outside_city'],
    [upstream({location_scope: 'unresolved_no_upstream_coordinate', upstream_coordinates: null}), 'scope.unresolved_no_upstream_coordinate'],
    [upstream({location_scope: 'unrecognized'}), undefined], [upstream({location_scope: undefined}), undefined],
  ];
  for (const [event, expected] of cases) assert.equal(locationScopeTranslationKey(event), expected);
  for (const language of ['zh', 'en', 'de']) {
    assert.notEqual(translators[language]('scope.unresolved_no_upstream_coordinate'), 'scope.unresolved_no_upstream_coordinate');
    assert.notEqual(translators[language]('scope.outside_city', {city: 'X'}), 'scope.outside_city');
  }
});

test('records outside the provider-reference contract retain their existing scope mapping', () => {
  const overrides = [
    {upstream_provider: 'another-provider'}, {incident_basis: undefined}, {semantic_basis: undefined},
    {geocode_method: 'reviewed_scene'},
    {upstream_public_precision: 'STREET'}, {upstream_coordinates: null},
    {upstream_coordinates: [181, 48]}, {coordinates: [11.58, 48.14]},
  ];
  for (const change of overrides) {
    const event = upstream(change); const before = structuredClone(event);
    assert.equal(locationScopeTranslationKey(event), 'scope.in_city', JSON.stringify(change));
    assert.deepEqual(event, before);
  }
});

test('narrative stages, extra evidence and uncertain scope do not prove city membership', () => {
  const additions = [
    {source_scope_verdict: 'uncertain'}, {source_scope_verdict: 'in_city'},
    {source_incidents: [{details: 'Unlocated phase'}]}, {incidents: [{details: 'Unlocated phase'}]},
    {source_sections: [{phases: []}]}, {other_scene_candidates: [{name: 'unresolved'}]},
    {geocode_evidence: ['unresolved']}, {location_selection: 'unresolved'},
    {reported_location_geometry: {}}, {candidate_road_geometry: {}},
    {source_status: 'complete_official_archive_source_and_geometry_reviewed', source_scope_verdict: 'uncertain'},
  ];
  for (const addition of additions) for (const scope of ['in_city', 'outside_city']) {
    const event = upstream({...addition, location_scope: scope}); const before = structuredClone(event);
    assert.equal(locationScopeTranslationKey(event), `scope.provider_reference_${scope}`, JSON.stringify(addition));
    assert.deepEqual(event, before, 'other reviewed and narrative data must be preserved');
  }
});

test('an independently listed scene is preserved without inventing its count status', () => {
  const scene = {role: 'incident', actual_event_position_known: true, primary_for_count: true,
    geometry_review: {verdict: 'resolved'}, coordinates: [11.58, 48.14], location_precision: 'street'};
  const inside = upstream({scene_locations: [scene]});
  assert.equal(locationScopeTranslationKey(inside), 'scope.provider_reference_in_city');
  const outside = upstream({location_scope: 'outside_city', scene_locations: [scene]});
  const before = structuredClone(outside), key = locationScopeTranslationKey(outside);
  assert.equal(key, 'scope.provider_reference_outside_city_with_scenes');
  for (const language of ['zh', 'en', 'de']) {
    const value = translators[language](key, {city: 'X'});
    assert.ok(value.includes('X'));
    assert.doesNotMatch(value, {zh: /不计入/, en: /not counted/, de: /nicht gezählt/}[language]);
  }
  assert.deepEqual(outside, before);
  const separatelyReviewed = upstream({geocode_method: 'reviewed_scene', source_scope_verdict: 'in_city', scene_locations: [scene]});
  assert.equal(locationScopeTranslationKey(separatelyReviewed), 'scope.in_city');
});

test('report card calls the selector and the existing i18n function', async () => {
  const source = await readFile(new URL('../src/safety/main.ts', import.meta.url), 'utf8');
  assert.match(source, /import\s*\{locationScopeTranslationKey\}\s*from\s*["']\.\/location-scope-presentation["']/);
  assert.match(source, /const scopeKey = locationScopeTranslationKey\(e\);\s*if \(scopeKey\) text\("small", t\(scopeKey,\{city:localizedCity\}\), card\);/);
  assert.doesNotMatch(source, /locationScopeLabels\[e\.location_scope\]/);
});
