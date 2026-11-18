"""Tiny committed repositories and metadata; no build, browser or real city copy."""
import importlib.util
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / 'scripts/render/city_assembly.py'
SPEC = importlib.util.spec_from_file_location('city_assembly', MODULE)
assembly = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(assembly)
BASE_SPEC = importlib.util.spec_from_file_location('assembly_candidate_fixture',
                                                  Path(__file__).with_name('test_candidate.py'))
base = importlib.util.module_from_spec(BASE_SPEC)
BASE_SPEC.loader.exec_module(base)


def commit(repo):
    subprocess.run(['git', '-C', str(repo), 'add', '.'], check=True)
    subprocess.run(['git', '-C', str(repo), '-c', 'user.name=Fixture', '-c',
                    'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                    'commit', '-qm', 'assembly fixture'], check=True)
    return assembly.candidate.git(repo, 'rev-parse', 'HEAD').decode().strip()


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    f = base.fixture.__wrapped__(tmp_path, monkeypatch)
    for name, source in assembly.SOURCE_TOOLS.items():
        path = f['repo'] / name
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, path)
    source_commit = commit(f['repo'])
    run = tmp_path / 'run'
    data = run / 'sites/crimemaps-Bremen'
    data.parent.mkdir(parents=True)
    f['data'].rename(data)
    overrides = tmp_path / 'sources'
    overrides.mkdir()
    f['overrides'].rename(overrides / 'bremen')
    for directory in ('statistics', 'report-bodies', 'about'):
        base.put(data / directory / 'tiny.json', {'synthetic': True})
    base.put(data / 'discovery.css', b'body{color:inherit}')
    base.put(data / 'sitemap.xml', b'<urlset/>')
    base.put(data / 'assets/3d-materials/original-window.png', b'synthetic original texture')
    base.put(data / 'assets/old-frontend.js', b'must not serve historical frontend')
    for route in f['tables']['profile']['routes']:
        base.put(data / route['descriptor']['path'][1:],
                 assembly.candidate.canonical(f['tables']['selected'][route['selector']]))
    contract = assembly.candidate.profile_resource_contract(f['tables']['profile'],
                 f['tables']['dependencies'], f['tables']['manifest'], 'bremen')
    base.put(data / 'city-data-tables.json', list(contract['runtime'].values()))
    geometry = base.put(data / 'safety/buildings3d/bremen/tiny.json', b'{"synthetic":true}')
    descriptor = {'path': '/safety/buildings3d/bremen/tiny.json',
                  **assembly.candidate.file_binding(geometry)}
    index = {'city': 'bremen', 'actual_geometry_lod': 1, 'shards': [descriptor]}
    for name in ('safety/buildings3d/index.json', 'safety/buildings3d/bremen/index.json'):
        base.put(data / name, index)
    scenery = base.put(data / 'safety/buildings3d/scenery.json', b'{"schematic":true}')
    base.put(data / 'safety/buildings3d/scenery-index.json',
             {'city': 'bremen', 'partial': True, 'data':
              {'path': '/safety/buildings3d/scenery.json',
               **assembly.candidate.file_binding(scenery)}})
    inventory = base.put(run / 'receipts/bremen-site-inventory.json',
                         {'files': assembly.candidate.tree(data)})
    base.put(run / 'DERIVATION.json', {'local_source_commit': source_commit})
    base.put(run / 'FINAL14-CAPACITY.json',
             {'local_source_commit': source_commit, 'all_fourteen_assembled': True})
    value = assembly.catalog(run, overrides, tmp_path / 'environment.json',
                             profiles={'bremen': f['profile']})
    catalog_path = base.put(tmp_path / 'catalog.json', value)
    return {**f, 'data': data, 'run': run, 'catalog': catalog_path, 'value': value,
            'commit': source_commit, 'geometry': geometry, 'inventory': inventory}


def freeze(fixture, name='assembly', cities=None):
    return assembly.freeze(fixture['catalog'], fixture['repo'], fixture['commit'],
                           cities or ['bremen'], fixture['root'] / name)


def test_catalog_has_fourteen_independent_city_roots_and_berlin_portal(fixture):
    value = fixture['value']
    assert set(value['cities']) == assembly.candidate.CITIES
    roots = {row['data']['root'] for row in value['cities'].values()}
    assert len(roots) == 14
    berlin, hamburg = value['cities']['berlin'], value['cities']['hamburg']
    assert berlin['frontend_routes'] == ['map', 'map/', 'map/index.html']
    assert 'index.html' in berlin['data']['files']
    assert {'portal-cities.js', 'goatcounter-client.mjs', 'portal-time.mjs',
            'portal-appearance.mjs', 'portal-locales.js', 'contract.mjs'} <= set(berlin['data']['files'])
    assert 'portal-assets/' in berlin['data']['prefixes']
    assert hamburg['frontend_routes'][0] == ''
    assert 'crimemaps-Hamburg/' in hamburg['profile']['path']
    assert set(hamburg['overrides']['files']) == set(assembly.candidate.CITY_FILES)
    assert hamburg['profile']['missing'] is True
    assert value['builds_performed'] is False


def test_real_input_gate_outputs_usable_recipe_without_building(fixture):
    result = freeze(fixture)
    row = result['cities']['bremen']
    assert result['status'] == row['status'] == 'inputs-pinned'
    assert result['source_commit'] == fixture['commit']
    assert result['working_tree_used'] is False
    assert row['entry'] == '/crimemaps-Bremen/'
    assert row['three_d_entry'] == '/crimemaps-Bremen/map/?view=3d'
    assert row['three_d']['direct_index_and_provider_resources'] >= 2
    assert row['three_d']['far_detail_scope'] == 'no-detail-sidecar'
    assert row['candidate_built'] is False
    spec = json.loads(Path(row['inputs']['path']).read_text())
    core, _, _, _, env, _, mounts = assembly.candidate.inputs(spec)
    assert core['city'] == env['VITE_CRIMEMAPS_CITY'] == 'bremen'
    assert 'NODE_OPTIONS' not in env
    assert 'about/tiny.json' in mounts
    assert 'discovery.css' in mounts
    assert 'sitemap.xml' in mounts
    assert 'assets/3d-materials/original-window.png' in mounts
    assert 'assets/old-frontend.js' not in mounts
    assert 'private-not-mounted.json' not in mounts
    assert 'physical-memory' in result['not_run']
    assert not list((fixture['root'] / 'assembly').rglob('node_modules'))
    assert not list((fixture['root'] / 'assembly').rglob('source.tar.gz'))


def test_missing_original_texture_directory_cannot_produce_a_pinned_city(fixture):
    path = fixture['data'] / 'assets/3d-materials/original-window.png'
    path.unlink()
    base.put(fixture['inventory'], {'files': assembly.candidate.tree(fixture['data'])})
    value = fixture['value']
    value['cities']['bremen']['data']['inventory'] = assembly.pin(fixture['inventory'])
    base.put(fixture['catalog'], value)
    result = freeze(fixture)
    assert result['status'] == 'partial'
    assert 'Empty data mount prefix' in result['cities']['bremen']['reason']
    assert not (fixture['root'] / 'assembly/bremen/inputs.json').exists()


def test_dirty_working_tree_is_not_adopted_and_full_commit_is_required(fixture):
    (fixture['repo'] / 'scripts/render/candidate.py').write_text('uncommitted and unused')
    assert freeze(fixture)['status'] == 'inputs-pinned'
    with pytest.raises(ValueError, match='explicit full source commit'):
        assembly.freeze(fixture['catalog'], fixture['repo'], 'HEAD', ['bremen'],
                        fixture['root'] / 'not-created')
    assert not (fixture['root'] / 'not-created').exists()


def test_commit_with_different_assembly_tool_is_rejected(fixture):
    (fixture['repo'] / 'scripts/render/city_assembly.py').write_text('different committed tool')
    other = commit(fixture['repo'])
    with pytest.raises(ValueError, match='differs from the selected source commit'):
        assembly.freeze(fixture['catalog'], fixture['repo'], other, ['bremen'],
                        fixture['root'] / 'not-created')
    assert not (fixture['root'] / 'not-created').exists()


def test_missing_geometry_never_produces_ready_or_an_empty_city(fixture):
    fixture['geometry'].unlink()
    result = freeze(fixture)
    assert result['status'] == 'partial'
    row = result['cities']['bremen']
    assert row['status'] == 'missing-or-incompatible-input'
    assert 'Missing ordinary file' in row['reason']
    assert not (fixture['root'] / 'assembly/bremen/inputs.json').exists()


def test_wrong_city_profile_and_other_missing_city_have_no_bremen_fallback(fixture):
    profile = json.loads(fixture['profile'].read_text())
    profile['city'] = 'hamburg'
    base.put(fixture['profile'], profile)
    value = fixture['value']
    value['cities']['bremen']['profile'] = assembly.pin(fixture['profile'])
    base.put(fixture['catalog'], value)
    result = freeze(fixture, cities=['bremen', 'hamburg'])
    assert result['status'] == 'partial'
    assert all(row['status'] == 'missing-or-incompatible-input' for row in result['cities'].values())
    assert 'profile route closure mismatch' in result['cities']['bremen']['reason']
    assert not any((fixture['root'] / 'assembly').rglob('inputs.json'))


@pytest.mark.parametrize('missing', [True, False])
def test_missing_index_or_empty_building_index_is_not_ready(fixture, missing):
    value = fixture['value']
    if missing:
        value['cities']['bremen']['three_d_indexes'].pop('safety/buildings3d/bremen/index.json')
    else:
        path = fixture['data'] / 'safety/buildings3d/bremen/index.json'
        base.put(path, {'city': 'bremen', 'shards': []})
        value['cities']['bremen']['three_d_indexes'][path.relative_to(fixture['data']).as_posix()] = assembly.pin(path)
        base.put(fixture['inventory'], {'files': assembly.candidate.tree(fixture['data'])})
        value['cities']['bremen']['data']['inventory'] = assembly.pin(fixture['inventory'])
    base.put(fixture['catalog'], value)
    result = freeze(fixture)
    assert result['status'] == 'partial'
    assert result['cities']['bremen']['status'] == 'missing-or-incompatible-input'
    assert not (fixture['root'] / 'assembly/bremen/inputs.json').exists()


def test_overlay_options_stay_city_specific_and_do_not_hide_missing_inputs(fixture):
    overlay = fixture['root'] / 'explicit-missing-berlin-overlay'
    detail = fixture['root'] / 'explicit-missing-bremen-detail'
    value = assembly.catalog(fixture['run'], fixture['root'] / 'sources',
             fixture['root'] / 'environment.json', resources={'berlin': overlay},
             details={'bremen': detail})
    assert value['cities']['berlin']['resource_overlay']['manifest']['missing'] is True
    assert value['cities']['berlin']['profile']['path'] == str(overlay / 'profile.json')
    assert 'resource_overlay' not in value['cities']['hamburg']
    assert value['cities']['bremen']['building_detail']['manifest']['missing'] is True
    assert 'building_detail' not in value['cities']['hamburg']


def derived_bremen_run(fixture):
    """Tiny existing-site derivative; never copy a real city or produce geometry."""
    parent = fixture['run']
    base.put(fixture['data'] / 'city-data-profile.json', fixture['tables']['profile'])
    base.put(fixture['inventory'], {'files': assembly.candidate.tree(fixture['data'])})
    run = fixture['root'] / 'bremen-derived'
    site = run / 'sites/crimemaps-Bremen'
    shutil.copytree(fixture['data'], site)
    scenery = base.put(site / 'safety/buildings3d/scenery-focus.json', b'{"roads":278}')
    base.put(site / 'safety/buildings3d/scenery-index.json',
             {'city': 'bremen', 'data': {'path': '/safety/buildings3d/scenery-focus.json',
                                      **assembly.candidate.file_binding(scenery)}})
    base.put(run / 'receipts/bremen-site-inventory.json', {'files': assembly.candidate.tree(site)})
    base.put(run / 'DERIVATION.json', {'schema': 1, 'parent_run': str(parent),
             'parent_inventory_sha256': assembly.candidate.sha(fixture['inventory']),
             'scope': ['bremen'], 'all_fourteen_assembled': False})
    return run


def derived_catalog(fixture, run):
    return assembly.catalog(fixture['run'], fixture['root'] / 'sources',
                            fixture['root'] / 'environment.json', data_runs={'bremen': run})


def test_explicit_city_run_switches_site_profile_inventory_and_indexes_together(fixture):
    run = derived_bremen_run(fixture)
    value = derived_catalog(fixture, run)
    row = value['cities']['bremen']
    assert not (run / 'FINAL14-CAPACITY.json').exists()
    assert row['data']['root'] == str(run / 'sites/crimemaps-Bremen')
    assert row['profile']['path'] == str(run / 'sites/crimemaps-Bremen/city-data-profile.json')
    assert row['data']['inventory']['path'] == str(run / 'receipts/bremen-site-inventory.json')
    assert all(Path(item['path']).is_relative_to(run) for item in row['three_d_indexes'].values())
    assert row['data_source']['parent_inventory'] == assembly.pin(fixture['inventory'])
    assert value['cities']['hamburg']['data']['root'] == str(fixture['run'] / 'sites/crimemaps-Hamburg')
    assert 'data_source' not in value['cities']['hamburg']
    assert value['provenance']['FINAL14-CAPACITY.json']['path'] == str(fixture['run'] / 'FINAL14-CAPACITY.json')
    base.put(fixture['catalog'], value)
    result = freeze(fixture)
    assert result['status'] == 'inputs-pinned'
    entry = result['cities']['bremen']
    assert entry['data_source'] == row['data_source']
    spec = json.loads(Path(entry['inputs']['path']).read_text())
    _, _, _, _, _, root, mounts = assembly.candidate.inputs(spec)
    assert root == run / 'sites/crimemaps-Bremen'
    assert 'safety/buildings3d/scenery-focus.json' in mounts
    assert 'building_detail' not in spec


@pytest.mark.parametrize('change', ['parent', 'city', 'inventory'])
def test_selected_city_run_rejects_wrong_parent_city_or_inventory_without_fallback(fixture, change):
    run = derived_bremen_run(fixture)
    path = run / 'DERIVATION.json'
    value = json.loads(path.read_text())
    if change == 'parent':
        value['parent_run'] = str(fixture['root'] / 'unrelated-parent')
    elif change == 'city':
        value['scope'] = ['hamburg']
    else:
        value['parent_inventory_sha256'] = '0' * 64
    base.put(path, value)
    with pytest.raises(ValueError, match='parent/city|parent inventory mismatch'):
        derived_catalog(fixture, run)


@pytest.mark.parametrize('change', ['derivation', 'site', 'inventory', 'missing-profile'])
def test_selected_city_run_cannot_silently_revert_or_change_after_catalog(fixture, change):
    run = derived_bremen_run(fixture)
    value = derived_catalog(fixture, run)
    row = value['cities']['bremen']
    if change == 'derivation':
        path = run / 'DERIVATION.json'
        derivation = json.loads(path.read_text())
        derivation['new_unpinned_field'] = True
        base.put(path, derivation)
    elif change == 'site':
        row['data']['root'] = str(fixture['data'])
    elif change == 'inventory':
        row['data']['inventory'] = assembly.pin(fixture['inventory'])
    else:
        Path(row['profile']['path']).unlink()
    base.put(fixture['catalog'], value)
    result = freeze(fixture)
    entry = result['cities']['bremen']
    assert result['status'] == 'partial'
    assert entry['status'] == 'missing-or-incompatible-input'
    assert not (fixture['root'] / 'assembly/bremen/inputs.json').exists()


def test_metadata_reserve_and_existing_output_are_enforced(fixture, monkeypatch):
    monkeypatch.setattr(assembly.shutil, 'disk_usage', lambda path: SimpleNamespace(free=assembly.RESERVE))
    with pytest.raises(ValueError, match='32 GiB'):
        assembly.MetadataOutput().save(fixture['root'] / 'reserve.json', {'small': True})
    assert not (fixture['root'] / 'reserve.json').exists()


def test_existing_assembly_output_is_preserved(fixture):
    freeze(fixture)
    path = fixture['root'] / 'assembly/assembly.json'
    before = path.read_bytes()
    with pytest.raises(ValueError, match='Refusing existing assembly output'):
        freeze(fixture)
    assert path.read_bytes() == before


def city_detail_metadata(root, wrong_page=False):
    """Metadata-only validator fixture, not a fabricated candidate registration."""
    root.mkdir()
    resources, entries = [], []

    def asset(label, value):
        raw = value if isinstance(value, bytes) else assembly.candidate.canonical(value) + b'\n'
        sha = hashlib.sha256(raw).hexdigest()
        filename = f'{label}-{sha}.json'
        source = f'assets/{filename}'
        base.put(root / source, raw)
        descriptor = {'path': f'/safety/buildings3d/detail-variants/bremen/{filename}',
                      'sha256': sha, 'bytes': len(raw)}
        resources.append({**descriptor, 'source': source})
        return descriptor

    for i in range(2):
        demand = asset(f'demand-{i}', {'synthetic': 'demand', 'leaf': i})
        groups = asset(f'groups-{i}', {'synthetic': 'group authority', 'leaf': i})
        leaf_manifest = base.put(root / f'leaves/{i}/detail-variants.json', {'city': 'bremen', 'leaf': i})
        variants = []
        if i:
            asset('mid', b'opaque synthetic payload; never decoded')
            variants = [{'level': 'mid', 'geometrySHA256': '6' * 64,
                         'encoding': 'meshopt-lossless-f32-v1', 'decodedBytes': 72}]
        entries.append({'canonicalIndexSHA256': '1' * 64, 'canonicalLeafSHA256': str(i + 2) * 64,
                        'leafId': f'leaf-{i}-ä', 'demandIndex': demand, 'groupMetadata': groups,
                        'leafManifest': {'file': leaf_manifest.relative_to(root).as_posix(),
                                         **assembly.candidate.file_binding(leaf_manifest)},
                        'variants': variants, 'canonicalOnly': not variants})
    grouped = {}
    for entry in entries:
        identity = [entry[key] for key in ('canonicalIndexSHA256', 'canonicalLeafSHA256', 'leafId')]
        prefix = hashlib.sha256(json.dumps(identity, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()[:2]
        if wrong_page:
            prefix = '00' if prefix != '00' else '01'
        grouped.setdefault(prefix, []).append({key: entry[key] for key in
            ('canonicalIndexSHA256', 'canonicalLeafSHA256', 'leafId', 'demandIndex', 'groupMetadata')})
    pages = [{'prefix': prefix, 'asset': asset(f'catalog-page-{prefix}', {
        'schema': 'crimemaps-building-detail-catalog-page-v1', 'schemaVersion': 1, 'city': 'bremen',
        'prefix': prefix, 'entries': values})} for prefix, values in sorted(grouped.items())]
    catalog = asset('catalog', {'schema': 'crimemaps-building-detail-catalog-v2', 'schemaVersion': 2,
                                'city': 'bremen', 'pages': pages, 'entryCount': len(entries)})
    source_catalog = base.put(root / 'source-catalog.json', {'synthetic': 'approved input catalog pin'})
    manifest = {'schema': 'crimemaps-building-detail-city-v1', 'schemaVersion': 1, 'city': 'bremen',
                'status': 'partial', 'catalog': catalog, 'entries': entries, 'resources': resources,
                'summary': {'discoveredLeaves': 4, 'completedLeaves': 2, 'failedLeaves': 1,
                            'pendingLeaves': 1, 'distinctVariantLeaves': 1},
                'source': {'catalog': assembly.pin(source_catalog), 'producerSHA256': '7' * 64}}
    file = base.put(root / 'detail-variants.json', manifest)
    spec = {'city': 'bremen', 'building_detail': assembly.detail_pin(root, 'bremen')}
    core = {'building_detail': {'manifest': assembly.candidate.file_binding(file),
                               'catalog': {key: catalog[key] for key in ('sha256', 'bytes')}}}
    mounts = {value['path'][1:]: {'root': 'details', 'path': value['source'],
                                 **{key: value[key] for key in ('sha256', 'bytes')}} for value in resources}
    return {'root': root, 'manifest': manifest, 'file': file, 'spec': spec, 'core': core,
            'mounts': mounts, 'catalog': catalog, 'asset': asset}


def reseal_city_manifest(detail):
    base.put(detail['file'], detail['manifest'])
    binding = assembly.candidate.file_binding(detail['file'])
    detail['spec']['building_detail']['manifest'] = {'path': str(detail['file']), **binding}
    detail['core']['building_detail']['manifest'] = binding


def test_city_detail_pins_paged_catalog_and_preserves_partial_real_counts(fixture):
    detail = city_detail_metadata(fixture['root'] / 'city-detail')
    value = assembly.catalog(fixture['run'], fixture['root'] / 'sources',
                             fixture['root'] / 'environment.json', details={'bremen': detail['root']})
    selected = value['cities']['bremen']['building_detail']
    assert selected == detail['spec']['building_detail']
    assert 'building_detail' not in value['cities']['hamburg']
    assert Path(selected['catalog_binding']['path']).parent == detail['root'] / 'assets'
    assets = assembly.building_detail_inputs(detail['spec'], detail['core'], detail['mounts'])['assembly']
    assert assets['status'] == 'partial'
    assert assets['catalog_entries'] == assets['leaf_counts']['completedLeaves'] == 2
    assert assets['leaf_counts'] == detail['manifest']['summary']
    assert assets['canonical_only_leaves'] == assets['replacement_levels'] == 1
    assert assets['resources'] == len(detail['manifest']['resources'])
    assert assets['geometry_decoded'] is False


@pytest.mark.parametrize('damage,reason', [
    ('city', 'Wrong detail manifest city/schema'),
    ('counts', 'actual leaf counts mismatch'),
    ('status', 'status contradicts'),
    ('canonical-only', 'canonical-only/variant count mismatch'),
    ('unsafe-source', 'Unsafe relative path'),
    ('missing-mount', 'absent from the detail mounts'),
    ('catalog-pin', 'lacks its assembly pin'),
    ('core-catalog', 'did not bind the selected city detail catalog'),
    ('leaf-hash', 'File SHA mismatch'),
    ('resource-length', 'resource length changed'),
])
def test_city_detail_rejects_unbound_counts_resources_and_catalog(tmp_path, damage, reason):
    detail = city_detail_metadata(tmp_path / 'detail')
    manifest = detail['manifest']
    if damage == 'city':
        manifest['city'] = 'hamburg'
    elif damage == 'counts':
        manifest['summary']['completedLeaves'] = 3
    elif damage == 'status':
        manifest['status'] = 'complete'
    elif damage == 'canonical-only':
        manifest['entries'][1]['canonicalOnly'] = True
    elif damage == 'unsafe-source':
        manifest['resources'][0]['source'] = '../outside.json'
    elif damage == 'missing-mount':
        detail['mounts'].pop(manifest['resources'][0]['path'][1:])
    elif damage == 'catalog-pin':
        detail['spec']['building_detail'].pop('catalog_binding')
    elif damage == 'core-catalog':
        detail['core']['building_detail']['catalog']['sha256'] = '0' * 64
    elif damage == 'leaf-hash':
        leaf = manifest['entries'][0]['leafManifest']
        base.put(detail['root'] / leaf['file'], b'changed')
    elif damage == 'resource-length':
        base.put(detail['root'] / manifest['resources'][0]['source'], b'changed')
    reseal_city_manifest(detail)
    with pytest.raises(ValueError, match=reason):
        assembly.building_detail_inputs(detail['spec'], detail['core'], detail['mounts'])


def test_city_detail_page_partition_and_original_metadata_bound_are_required(tmp_path):
    detail = city_detail_metadata(tmp_path / 'wrong-page', wrong_page=True)
    with pytest.raises(ValueError, match='wrong page'):
        assembly.building_detail_inputs(detail['spec'], detail['core'], detail['mounts'])
    oversized = detail['asset']('oversized-catalog-page', b' ' * 100_001)
    resources = assembly.detail_resources(detail['root'], detail['manifest'])
    with pytest.raises(ValueError, match='exceeds metadata bound'):
        assembly.detail_file(resources, oversized, 'City detail catalog page', assembly.DETAIL_CATALOG_LIMIT)


def test_city_detail_still_requires_the_candidate_input_gate(fixture, monkeypatch):
    detail = city_detail_metadata(fixture['root'] / 'city-detail')
    fixture['value']['cities']['bremen']['building_detail'] = detail['spec']['building_detail']
    base.put(fixture['catalog'], fixture['value'])
    calls = []

    def incompatible(spec):
        calls.append(spec['building_detail'])
        raise ValueError('Candidate city detail schema is not supported by this source commit')

    monkeypatch.setattr(assembly.candidate, 'inputs', incompatible)
    result = freeze(fixture)
    assert calls == [detail['spec']['building_detail']]
    assert result['status'] == 'partial'
    assert result['cities']['bremen']['status'] == 'missing-or-incompatible-input'
    assert 'not supported' in result['cities']['bremen']['reason']
    assert not (fixture['root'] / 'assembly/bremen/inputs.json').exists()


def test_legacy_single_leaf_detail_keeps_the_candidate_registration(tmp_path):
    root = tmp_path / 'legacy'
    file = base.put(root / 'detail-variants.json', {
        'schema': 'crimemaps-building-detail-replacement-v1', 'schemaVersion': 1, 'city': 'bremen'})
    selected = assembly.detail_pin(root, 'bremen')
    bound = {'manifest': assembly.candidate.file_binding(file), 'catalog': {'legacy': True}}
    assert 'catalog_binding' not in selected
    assert assembly.building_detail_inputs({'city': 'bremen', 'building_detail': selected},
                                           {'building_detail': bound}, {}) is bound
