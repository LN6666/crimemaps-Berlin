"""Synthetic small repositories/files only; no real build, browser, GPU or site scan."""
import importlib.util
import gzip
import hashlib
import json
import os
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE = Path(__file__).resolve().parents[2] / 'scripts/render/candidate.py'
SPEC = importlib.util.spec_from_file_location('render_candidate', MODULE)
candidate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(candidate)


def put(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(value, bytes):
        path.write_bytes(value)
    else:
        path.write_text(json.dumps(value))
    return path


def pinned(path):
    return {'path': str(path), **candidate.file_binding(path)}


def tiny_profile_inputs():
    """The toy repository owns its exact twelve initializer bindings."""
    rows = [{'city': 'bremen', 'objectId': 'osm/way/1', 'partId': f'part/{part}', 'family': 7}
            for part in ('a', 'b')]
    rows.append({'city': 'bremen', 'objectId': 'osm/way/2', 'partId': 'part/c', 'family': 9})
    values = {'rows': [*rows, {'city': 'hamburg', 'objectId': 'osm/way/3', 'partId': 'foreign'}],
              'extra': {'bremen': 'vec3 original(){return vec3(.25);}', 'hamburg': 'foreign source'},
              'catalog': {'base': 'void main(){gl_FragDepth=.5;}', 'f7': 'original family source'}}
    canonical = {}
    for kind, value in values.items():
        raw = candidate.canonical(value)
        sha = hashlib.sha256(raw).hexdigest()
        canonical[kind] = {'value': value, 'raw': raw, 'descriptor': {
            'path': f'/safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json',
            'sha256': sha, 'bytes': len(raw)}}
    selected = {'city-rows': rows, 'city-key': {'bremen': values['extra']['bremen']},
                'berlin-catalog': {}, 'hamburg-catalog': values['catalog']}
    dependencies = {'schema_version': 1,
                    'providers': {provider: [] for provider in
                                  ('city', 'root500', 'delegated500', 'tier300', 'church', 'bremen', 'infill')},
                    'initializers': {provider: {} for provider in
                                     ('city', 'root500', 'delegated500', 'tier300', 'church', 'bremen', 'infill')}}
    rules = [(provider, name, selector, kind)
             for provider in ('city', 'root500', 'delegated500', 'tier300')
             for name, selector, kind in (('paint-admissions', 'city-rows', 'rows'),
                                          ('feature-cities', 'city-key', 'extra'))]
    rules += [(provider, name + '-programs', name + '-catalog', 'catalog')
              for provider in ('root500', 'delegated500') for name in ('berlin', 'hamburg')]
    routes = []
    for provider, name, selector, kind in rules:
        file = f'painted/{provider}/safety/progressive-{name}.ts'
        original = canonical[kind]['descriptor']
        if original['sha256'] not in dependencies['providers'][provider]:
            dependencies['providers'][provider].append(original['sha256'])
        dependencies['initializers'][provider].setdefault(original['sha256'], {})[file] = 1
        value = selected[selector]
        raw = candidate.canonical(value)
        sha = hashlib.sha256(raw).hexdigest()
        descriptor = {'path': f'/safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json',
                      'sha256': sha, 'bytes': len(raw)}
        keys = [[r['city'], r['objectId'], r['partId']] for r in value] if isinstance(value, list) else list(value)
        routes.append({'file': file, 'occurrence': 0, 'selector': selector,
                       'canonicalSHA256': original['sha256'], 'canonicalBytes': original['bytes'],
                       'canonicalCount': len(canonical[kind]['value']), 'retainedCount': len(value),
                       'orderedSelectionSHA256': candidate.digest(keys), 'descriptor': descriptor})
    return {'profile': {'schemaVersion': 1, 'city': 'bremen', 'selectorVersion': 'city-data-v1', 'routes': routes},
            'dependencies': dependencies, 'manifest': [entry['descriptor'] for entry in canonical.values()],
            'canonical': canonical, 'selected': selected}


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    # Fixtures never allocate a real build. Disk-pressure cases override this explicitly.
    monkeypatch.setattr(candidate.shutil, 'disk_usage', lambda path: SimpleNamespace(free=100 * candidate.GIB))
    repo = tmp_path / 'repo'
    repo.mkdir()
    put(repo / 'web/package-lock.json', {'lockfileVersion': 3, 'packages': {}})
    put(repo / 'web/package.json', {'scripts': {'build': 'never run in this test'}})
    tables = tiny_profile_inputs()
    put(repo / candidate.PROFILE_SOURCE_FILES['dependencies'], tables['dependencies'])
    put(repo / candidate.PROFILE_SOURCE_FILES['manifest'], tables['manifest'])
    subprocess.run(['git', 'init', '-q', str(repo)], check=True)
    subprocess.run(['git', '-C', str(repo), 'add', '.'], check=True)
    subprocess.run(['git', '-C', str(repo), '-c', 'user.name=Fixture', '-c',
                    'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                    'commit', '-qm', 'fixture'], check=True)
    commit = candidate.git(repo, 'rev-parse', 'HEAD').decode().strip()
    overrides = tmp_path / 'overrides'
    for name in candidate.CITY_FILES:
        put(overrides / name, {})
    put(overrides / 'city-config.json', {'city': 'bremen', 'base_path': '/crimemaps-Bremen/',
                                       'repository': 'crimemaps-Bremen'})
    profile = put(tmp_path / 'profile.json', tables['profile'])
    env = put(tmp_path / 'environment.json', {'bremen': {
        'VITE_DATED_STATISTICS_BINDING': '{"city":"bremen"}', 'VITE_FEATURE': 'bound',
        'NODE_OPTIONS': 'must not reach build'}})
    data = tmp_path / 'physical'
    put(data / 'safety/manifest.json', {'city': 'Bremen'})
    put(data / 'safety/tiny.json', {'body': 'synthetic'})
    put(data / 'painted-tables/tiny.json.gz', b'opaque fixture bytes')
    for entry in tables['canonical'].values():
        put(data / entry['descriptor']['path'][1:], entry['raw'])
    inventory = put(tmp_path / 'site-inventory.json', {'files': candidate.tree(data)})
    # The file exists physically but is deliberately outside the sealed mount.
    put(data / 'private-not-mounted.json', {'must_not_serve': True})
    dist = tmp_path / 'dist'
    put(dist / 'index.html', b'<script src="/crimemaps-Bremen/assets/main.js"></script>')
    put(dist / 'assets/main.js', b'console.log("synthetic")')
    put(dist / 'assets/main.css', b'body{color:black}')
    put(dist / 'city-data-build-receipt.json', {'schemaVersion': 1, 'city': 'bremen',
        'purpose': 'publication', 'profileEnabled': True, 'profileSHA256': candidate.sha(profile)})
    spec = {'schema_version': 1, 'city': 'bremen', 'repo': str(repo), 'commit': commit,
            'profile': pinned(profile), 'overrides': {'root': str(overrides),
                'files': {p: candidate.file_binding(overrides / p) for p in candidate.CITY_FILES}},
            'build_environment': pinned(env), 'data': {'root': str(data), 'inventory': pinned(inventory),
                'prefixes': ['safety/', 'painted-tables/'], 'files': []},
            'frontend_routes': ['', 'index.html', 'map', 'map/', 'map/index.html']}
    inputs = put(tmp_path / 'inputs.json', spec)
    return {'root': tmp_path, 'inputs': inputs, 'spec': spec, 'dist': dist, 'data': data,
            'profile': profile, 'repo': repo, 'overrides': overrides, 'tables': tables}


def create(fixture):
    out = fixture['root'] / 'candidate'
    result = candidate.create(fixture['inputs'], out, dist=fixture['dist'])
    return out, result


@contextmanager
def running(path):
    serving = candidate.server(path, 0)
    worker = threading.Thread(target=serving.serve_forever, kwargs={'poll_interval': .01}, daemon=True)
    worker.start()
    try:
        yield f'http://127.0.0.1:{serving.server_port}'
    finally:
        serving.shutdown()
        serving.server_close()
        worker.join(timeout=2)


def assert_no_pass(out):
    assert not (out / 'candidate.json').exists()
    assert candidate.load(out / 'stages/create.json')['status'] == 'fail'
    for path in (out / 'stages').glob('*.json'):
        assert candidate.load(path)['status'] != 'pass'


def resource_overlay(fixture):
    """Exact row, source and catalog selections share six tiny physical assets."""
    root = fixture['root'] / 'resource-overlay'
    assets, physical = [], {}
    originals = {entry['descriptor']['sha256']: entry['descriptor']
                 for entry in fixture['tables']['canonical'].values()}

    def table(rows, compressed):
        raw = candidate.canonical(rows)
        raw_sha = hashlib.sha256(raw).hexdigest()
        descriptor = {'path': f'/safety/buildings3d/painted-tables/{raw_sha[:2]}/{raw_sha}.json',
                      'sha256': raw_sha, 'bytes': len(raw)}
        if raw_sha in originals:
            descriptor = originals[raw_sha]
            compressed = False
        packed = gzip.compress(raw, mtime=0) if compressed else raw
        packed_sha = hashlib.sha256(packed).hexdigest()
        transport = {'path': f'/safety/buildings3d/painted-tables/{packed_sha[:2]}/{packed_sha}.json.gz',
                     'sha256': packed_sha, 'bytes': len(packed), 'encoding': 'gzip'}
        if compressed:
            descriptor['transport'] = transport
        bound = transport if compressed else descriptor
        asset = {key: bound[key] for key in ('path', 'sha256', 'bytes')}
        asset['source'] = 'assets' + asset['path']
        put(root / asset['source'], packed)
        assets.append(asset)
        physical[asset['path']] = packed
        return descriptor

    selected = fixture['tables']['selected']
    rows = selected['city-rows']
    whole, first, second = table(rows, True), table(rows[:2], True), table(rows[2:], False)
    partition = {'schemaVersion': 1, 'kind': 'object-rows', 'parts': [
        {'descriptor': first, 'keys': ['bremen|osm/way/1'], 'rowIndices': [0, 1]},
        {'descriptor': second, 'keys': ['bremen|osm/way/2'], 'rowIndices': [2]}]}
    source = table(selected['city-key'], True)
    empty_catalog = table(selected['berlin-catalog'], True)
    catalog = table(selected['hamburg-catalog'], False)
    descriptors = [whole, first, second, source, empty_catalog, catalog]
    by_selector = {'city-rows': whole, 'city-key': source,
                   'berlin-catalog': empty_catalog, 'hamburg-catalog': catalog}
    profile = candidate.load(fixture['profile'])
    for route in profile['routes']:
        route['descriptor'] = by_selector[route['selector']]
        if route['selector'] == 'city-rows':
            route['partition'] = partition
        elif route['selector'] in ('berlin-catalog', 'hamburg-catalog'):
            keys = list(selected[route['selector']])
            route['partition'] = {'schemaVersion': 1, 'kind': 'record-keys', 'parts': [
                {'descriptor': by_selector[route['selector']], 'keys': keys}] if keys else []}
    put(fixture['profile'], profile)
    fixture['spec']['profile'] = pinned(fixture['profile'])
    receipt_path = fixture['dist'] / 'city-data-build-receipt.json'
    receipt = candidate.load(receipt_path)
    receipt['profileSHA256'] = fixture['spec']['profile']['sha256']
    put(receipt_path, receipt)
    runtime_path = put(root / 'runtime-table-manifest.json', descriptors)
    manifest = {'schemaVersion': 1, 'city': 'bremen',
                'profileSHA256': fixture['spec']['profile']['sha256'],
                'runtimeTableManifestSHA256': candidate.sha(runtime_path), 'assets': assets,
                'activeProviders': ['city', 'root500', 'delegated500', 'tier300', 'church', 'bremen'],
                'removeCanonical': [fixture['tables']['canonical'][kind]['descriptor']
                                    for kind in ('rows', 'extra')]}
    manifest_path = put(root / 'asset-manifest.json', manifest)
    fixture['spec']['resource_overlay'] = {'root': str(root), 'manifest': pinned(manifest_path)}
    # The overlay replaces this one mounted route without modifying its source site.
    old_runtime = put(fixture['data'] / 'city-data-tables.json', [{'old': 'sealed site'}])
    inventory_path = Path(fixture['spec']['data']['inventory']['path'])
    inventory = candidate.load(inventory_path)
    inventory['files']['city-data-tables.json'] = candidate.file_binding(old_runtime)
    put(inventory_path, inventory)
    fixture['spec']['data']['inventory'] = pinned(inventory_path)
    fixture['spec']['data']['files'].append('city-data-tables.json')
    put(fixture['inputs'], fixture['spec'])
    return {'root': root, 'manifest': manifest, 'manifest_path': manifest_path,
            'runtime_path': runtime_path, 'descriptors': descriptors, 'physical': physical}


def bind_overlay_manifest(fixture, overlay):
    put(overlay['manifest_path'], overlay['manifest'])
    fixture['spec']['resource_overlay']['manifest'] = pinned(overlay['manifest_path'])
    put(fixture['inputs'], fixture['spec'])


@pytest.mark.parametrize('damage', ['file', 'canonical-sha', 'occurrence', 'selector', 'missing', 'extra'])
def test_profile_routes_require_the_toy_repositories_tracked_initializer_bindings(fixture, damage):
    profile = candidate.load(fixture['profile'])
    if damage == 'file':
        profile['routes'][0]['file'] = 'painted/bremen/safety/progressive-paint-admissions.ts'
    elif damage == 'canonical-sha':
        profile['routes'][0]['canonicalSHA256'] = profile['routes'][1]['canonicalSHA256']
    elif damage == 'occurrence':
        profile['routes'][0]['occurrence'] = 1
    elif damage == 'selector':
        profile['routes'][0]['selector'] = 'city-key'
    elif damage == 'missing':
        profile['routes'].pop()
    else:
        profile['routes'].append(dict(profile['routes'][0]))
    put(fixture['profile'], profile)
    fixture['spec']['profile'] = pinned(fixture['profile'])
    receipt_path = fixture['dist'] / 'city-data-build-receipt.json'
    receipt = candidate.load(receipt_path)
    receipt['profileSHA256'] = fixture['spec']['profile']['sha256']
    put(receipt_path, receipt)
    put(fixture['inputs'], fixture['spec'])
    with pytest.raises(ValueError, match='(?i)profile|binding|route|initializer'):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('damage', ['missing', 'duplicate', 'required-shared-catalog', 'wrong-sha'])
def test_resource_overlay_canonical_removals_match_the_exact_tracked_dependency_closure(fixture, damage):
    overlay = resource_overlay(fixture)
    removals = overlay['manifest']['removeCanonical']
    if damage == 'missing':
        removals.pop()
    elif damage == 'duplicate':
        removals.append(dict(removals[0]))
    elif damage == 'required-shared-catalog':
        removals.append(fixture['tables']['canonical']['catalog']['descriptor'])
    else:
        removals[0] = {**removals[0], 'sha256': '0' * 64}
    bind_overlay_manifest(fixture, overlay)
    with pytest.raises(ValueError, match='canonical removal'):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


def test_bound_dist_is_not_build_and_all_http_bytes_are_bound(fixture):
    out, result = create(fixture)
    legacy, mounts = candidate.read_candidate(out / 'candidate.json')
    assert legacy == result and 'resource_overlay' not in legacy['core']
    assert 'resources' not in legacy['locations']
    assert {item['root'] for item in mounts.values()} == {'candidate', 'data', 'dist'}
    assert result['core']['build']['status'] == 'bound-existing-dist-build-unverified'
    assert result['core']['build']['source_commit_binding'] == 'declared-not-proven-for-dist'
    assert result['core']['publication_ready'] is False
    assert not (out / 'source').exists()
    assert not (out / 'stages/build.json').exists()
    assert candidate.load(out / 'mounts.json')['city-data-profile.json']['root'] == 'candidate'
    with running(out / 'candidate.json') as origin:
        receipt = candidate.verify_http(out / 'candidate.json', origin, out / 'http.json',
                                        ['safety/tiny.json', 'painted-tables/tiny.json.gz'])
        assert receipt['candidate_id'] == result['candidate_id']
        assert {r['mount'] for r in receipt['verified']} == {'candidate', 'data', 'dist'}
        assert receipt['whole_data_mount_scanned'] is False
        assert candidate.fetch(origin + '/crimemaps-Bremen/painted-tables/tiny.json.gz', 100)[0] == b'opaque fixture bytes'
        for route in ('private-not-mounted.json', 'unknown', '%2e%2e/private-not-mounted.json',
                      '%252e%252e/private-not-mounted.json', 'assets/', '__render__/other.json'):
            with pytest.raises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(origin + '/crimemaps-Bremen/' + route)
            assert error.value.code == 404


def test_resource_overlay_seals_only_profile_payloads_and_preserves_original_site(fixture):
    overlay = resource_overlay(fixture)
    before_site = candidate.tree(fixture['data'])
    inventory_path = Path(fixture['spec']['data']['inventory']['path'])
    before_inventory = inventory_path.read_bytes()
    out, result = create(fixture)
    reopened, mounts = candidate.read_candidate(out / 'candidate.json')
    assert reopened == result
    assert result['locations']['resources'] == str(overlay['root'])
    bound = result['core']['resource_overlay']
    assert bound['asset_count'] == 6  # Exact twelve-route selections share these six descriptors.
    assert bound['asset_bytes'] == sum(len(value) for value in overlay['physical'].values())
    resource_mounts = {route: item for route, item in mounts.items() if item['root'] == 'resources'}
    assert set(resource_mounts) == {'city-data-tables.json',
                                   *(path[1:] for path in overlay['physical'])}
    assert candidate.digest(resource_mounts) == bound['mounts_sha256']
    assert resource_mounts['city-data-tables.json']['path'] == 'runtime-table-manifest.json'
    for asset in overlay['manifest']['assets']:
        assert resource_mounts[asset['path'][1:]] == {
            'root': 'resources', 'path': asset['source'],
            'sha256': asset['sha256'], 'bytes': asset['bytes']}
    assert (out / 'bindings/resource-asset-manifest.json').read_bytes() == overlay['manifest_path'].read_bytes()
    assert (out / 'bindings/resource-runtime-table-manifest.json').read_bytes() == overlay['runtime_path'].read_bytes()
    for kind in ('rows', 'extra'):
        assert fixture['tables']['canonical'][kind]['descriptor']['path'][1:] not in mounts
    catalog = fixture['tables']['canonical']['catalog']['descriptor']
    assert mounts[catalog['path'][1:]]['sha256'] == catalog['sha256'], 'the shared full catalog remains required'
    assert candidate.tree(fixture['data']) == before_site
    assert inventory_path.read_bytes() == before_inventory
    assert not (out / 'source').exists() and not (out / 'build.log').exists()


def test_resource_overlay_http_automatically_verifies_whole_table_and_every_part(fixture):
    overlay = resource_overlay(fixture)
    out, result = create(fixture)
    with running(out / 'candidate.json') as origin:
        receipt = candidate.verify_http(out / 'candidate.json', origin, out / 'http.json')
        verified = {entry['route']: entry for entry in receipt['verified'] if entry['mount'] == 'resources'}
        prefix = result['core']['prefix']
        assert set(verified) == {prefix + 'city-data-tables.json',
                                 *(prefix + path[1:] for path in overlay['physical'])}
        assert receipt['resource_overlay_assets_verified'] == 6
        assert receipt['whole_data_mount_scanned'] is False
        for asset in overlay['manifest']['assets']:
            entry = verified[prefix + asset['path'][1:]]
            assert {key: entry[key] for key in ('sha256', 'bytes')} == {
                key: asset[key] for key in ('sha256', 'bytes')}
        assert verified[prefix + 'city-data-tables.json']['sha256'] == overlay['manifest']['runtimeTableManifestSHA256']
        # Neither overlay metadata nor absent uncompressed fallbacks become mountable.
        for route in ('asset-manifest.json', 'runtime-table-manifest.json',
                      overlay['descriptors'][0]['path'][1:]):
            with pytest.raises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(origin + prefix + route)
            assert error.value.code == 404


@pytest.mark.parametrize('damage', ['manifest-sha', 'manifest-bytes', 'city', 'profile-sha',
                                  'runtime-sha', 'runtime-descriptor', 'asset-sha', 'asset-bytes'])
def test_resource_overlay_wrong_bindings_fail_before_candidate(fixture, damage):
    overlay = resource_overlay(fixture)
    if damage in ('manifest-sha', 'manifest-bytes'):
        binding = fixture['spec']['resource_overlay']['manifest']
        binding['sha256' if damage == 'manifest-sha' else 'bytes'] = (
            '0' * 64 if damage == 'manifest-sha' else binding['bytes'] + 1)
        put(fixture['inputs'], fixture['spec'])
    else:
        manifest = overlay['manifest']
        if damage == 'city':
            manifest['city'] = 'berlin'
        elif damage == 'profile-sha':
            manifest['profileSHA256'] = '0' * 64
        elif damage == 'runtime-sha':
            manifest['runtimeTableManifestSHA256'] = '0' * 64
        elif damage == 'runtime-descriptor':
            runtime = candidate.load(overlay['runtime_path']); runtime[0]['bytes'] += 1
            put(overlay['runtime_path'], runtime)
            manifest['runtimeTableManifestSHA256'] = candidate.sha(overlay['runtime_path'])
        elif damage == 'asset-sha':
            manifest['assets'][0]['sha256'] = '0' * 64
        else:
            manifest['assets'][0]['bytes'] += 1
        bind_overlay_manifest(fixture, overlay)
    with pytest.raises(ValueError):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('damage', ['missing-asset', 'extra-asset', 'duplicate-asset', 'missing-file'])
def test_resource_overlay_requires_exact_physical_payload_closure(fixture, damage):
    overlay = resource_overlay(fixture)
    assets = overlay['manifest']['assets']
    if damage == 'missing-asset':
        assets.pop()
    elif damage == 'duplicate-asset':
        assets.append(dict(assets[0]))
    elif damage == 'extra-asset':
        body = b'{"unused":true}'
        sha = hashlib.sha256(body).hexdigest()
        path = f'/safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json'
        assets.append({'path': path, 'sha256': sha, 'bytes': len(body), 'source': 'assets' + path})
        put(overlay['root'] / assets[-1]['source'], body)
    else:
        (overlay['root'] / assets[0]['source']).unlink()
    bind_overlay_manifest(fixture, overlay)
    with pytest.raises(ValueError):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('damage', ['source-parent', 'source-absolute', 'asset-parent', 'manifest-path'])
def test_resource_overlay_rejects_unsafe_paths(fixture, damage):
    overlay = resource_overlay(fixture)
    asset = overlay['manifest']['assets'][0]
    if damage == 'manifest-path':
        fixture['spec']['resource_overlay']['manifest']['path'] = str(overlay['root'] / '../asset-manifest.json')
        put(fixture['inputs'], fixture['spec'])
    else:
        if damage == 'source-parent':
            asset['source'] = 'assets/../outside.json'
        elif damage == 'source-absolute':
            asset['source'] = str(fixture['root'] / 'outside.json')
        else:
            asset['path'] = '/safety/buildings3d/painted-tables/../outside.json'
        bind_overlay_manifest(fixture, overlay)
    with pytest.raises(ValueError):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('target', ['asset', 'manifest', 'runtime'])
def test_resource_overlay_rejects_symlinked_members(fixture, target):
    overlay = resource_overlay(fixture)
    path = (overlay['root'] / overlay['manifest']['assets'][0]['source'] if target == 'asset'
            else overlay['manifest_path'] if target == 'manifest' else overlay['runtime_path'])
    outside = put(fixture['root'] / f'outside-{target}', path.read_bytes())
    path.unlink(); path.symlink_to(outside)
    with pytest.raises(ValueError, match='Symlink'):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('target', ['manifest', 'runtime', 'assets'])
def test_resource_overlay_32_mib_prelimit_avoids_large_reads(fixture, monkeypatch, target):
    assert candidate.RESOURCE_OVERLAY_LIMIT == 32 * 1024 ** 2
    overlay = resource_overlay(fixture)
    if target == 'assets':
        overlay['manifest']['assets'][0]['bytes'] = candidate.RESOURCE_OVERLAY_LIMIT
        bind_overlay_manifest(fixture, overlay)
        unread = overlay['root'] / overlay['manifest']['assets'][0]['source']
    else:
        unread = overlay['manifest_path'] if target == 'manifest' else overlay['runtime_path']
        # A sparse size declaration proves admission happens before hashing or parsing.
        with unread.open('ab') as stream:
            stream.truncate(candidate.RESOURCE_OVERLAY_LIMIT + 1)
    original_sha = candidate.sha

    def bounded_sha(path):
        assert Path(path).resolve() != unread.resolve(), 'oversized overlay input must not be hashed'
        return original_sha(path)

    monkeypatch.setattr(candidate, 'sha', bounded_sha)
    with pytest.raises(ValueError, match='32 MiB'):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('target', ['source-manifest', 'source-runtime', 'snapshot-manifest', 'snapshot-runtime'])
def test_resource_overlay_metadata_tamper_after_create_is_rejected(fixture, target):
    overlay = resource_overlay(fixture)
    out, _ = create(fixture)
    path = {'source-manifest': overlay['manifest_path'], 'source-runtime': overlay['runtime_path'],
            'snapshot-manifest': out / 'bindings/resource-asset-manifest.json',
            'snapshot-runtime': out / 'bindings/resource-runtime-table-manifest.json'}[target]
    put(path, b'changed overlay metadata')
    with pytest.raises(ValueError, match='SHA mismatch'):
        candidate.read_candidate(out / 'candidate.json')


def test_resource_overlay_mount_digest_remains_bound_after_outer_mount_rebinding(fixture):
    overlay = resource_overlay(fixture)
    out, result = create(fixture)
    mounts = candidate.load(out / 'mounts.json')
    mounts[overlay['manifest']['assets'][0]['path'][1:]]['path'] = overlay['manifest']['assets'][1]['source']
    put(out / 'mounts.json', mounts)
    result['core']['mounts_sha256'] = candidate.sha(out / 'mounts.json')
    result['candidate_id'] = candidate.digest(result['core'])
    put(out / 'candidate.json', result)
    with pytest.raises(ValueError, match='Resource overlay mount binding changed'):
        candidate.read_candidate(out / 'candidate.json')


def test_resource_overlay_mutated_gzip_part_fails_automatic_http_verification_with_409(fixture):
    overlay = resource_overlay(fixture)
    out, result = create(fixture)
    asset = overlay['manifest']['assets'][1]
    assert asset['path'].endswith('.json.gz')
    path = overlay['root'] / asset['source']; original = path.read_bytes()
    put(path, bytes([original[0] ^ 1]) + original[1:])
    with running(out / 'candidate.json') as origin:
        with pytest.raises(urllib.error.HTTPError) as error:
            candidate.verify_http(out / 'candidate.json', origin, out / 'http.json')
        assert error.value.code == 409
        assert error.value.url == origin + result['core']['prefix'] + asset['path'][1:]
    assert candidate.load(out / 'http.json')['status'] == 'fail'


def seal_building_detail(fixture, detail, rewrite_demand=True):
    """Re-sign only this synthetic registration's metadata after a deliberate edit."""
    if rewrite_demand:
        raw = candidate.canonical(detail['demand']) + b'\n'
        sha = hashlib.sha256(raw).hexdigest()
        descriptor = {'path': f'/safety/buildings3d/detail-variants/fixture/demand-{sha}.json',
                      'sha256': sha, 'bytes': len(raw)}
        detail['demand_path'] = put(detail['root'] / f'demand-{sha}.json', raw)
        detail['sidecar']['demandIndex'] = descriptor
    put(detail['sidecar_path'], detail['sidecar'])
    fixture['spec']['building_detail'] = {'root': str(detail['root']),
                                        'manifest': pinned(detail['sidecar_path'])}
    demand = detail['demand']
    catalog = {'schema': 'crimemaps-building-detail-catalog-v1', 'schemaVersion': 1, 'city': 'bremen',
               'entries': [{'canonicalIndexSHA256': demand['canonicalIndex']['sha256'],
                            'canonicalLeafSHA256': demand['canonicalLeaf']['sha256'],
                            'leafId': demand['canonicalLeaf']['id'],
                            'demandIndex': detail['sidecar']['demandIndex']}]}
    detail['catalog_bytes'] = candidate.canonical(catalog) + b'\n'
    receipt_path = fixture['dist'] / 'city-data-build-receipt.json'
    receipt = candidate.load(receipt_path)
    receipt['buildingDetailCatalogSHA256'] = hashlib.sha256(detail['catalog_bytes']).hexdigest()
    put(receipt_path, receipt)
    put(fixture['inputs'], fixture['spec'])


def building_detail(fixture):
    """Tiny registration metadata and payloads, without generating real geometry."""
    source_name = 'web/src/safety/synthetic-detail-producer.ts'
    source = put(fixture['repo'] / source_name, b'export const source = "synthetic registration";\n')
    candidate.git(fixture['repo'], 'add', source_name)
    candidate.git(fixture['repo'], '-c', 'user.name=Fixture', '-c',
                  'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                  'commit', '-qm', 'tiny detail source binding')
    fixture['spec']['commit'] = candidate.git(fixture['repo'], 'rev-parse', 'HEAD').decode().strip()
    source_binding = {'path': source_name, **candidate.file_binding(source)}

    def canonical_asset(name, value):
        raw = candidate.canonical(value)
        path = f'/safety/buildings3d/bremen/{name}.json'
        put(fixture['data'] / path[1:], raw)
        return {'path': path, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}

    leaf = canonical_asset('synthetic-leaf', {'schema_version': 1, 'city': 'bremen', 'components': []})
    leaf = {**leaf, 'id': 'synthetic-leaf'}
    index = canonical_asset('synthetic-index', {'schema_version': 3, 'city': 'bremen', 'leaves': [leaf]})
    inventory_path = Path(fixture['spec']['data']['inventory']['path'])
    put(inventory_path, {'files': candidate.tree(fixture['data'])})
    fixture['spec']['data']['inventory'] = pinned(inventory_path)
    root = fixture['root'] / 'building-detail'
    packed = gzip.compress(candidate.canonical({'city': 'bremen', 'synthetic': 'replacement payload'}), mtime=0)
    packed_sha = hashlib.sha256(packed).hexdigest()
    raw = gzip.decompress(packed)
    variant_asset = {'path': f'/safety/buildings3d/detail-variants/fixture/mid-{packed_sha}.json.gz',
                     'sha256': packed_sha, 'bytes': len(packed), 'compression': 'gzip',
                     'uncompressed_sha256': hashlib.sha256(raw).hexdigest(), 'uncompressed_bytes': len(raw)}
    variant_path = put(root / f'mid-{packed_sha}.json.gz', packed)
    bindings = {'sourcePBFSHA256': '1' * 64, 'boundarySHA256': '2' * 64,
                'compilerSHA256': source_binding['sha256'], 'sourceSnapshot': 'synthetic',
                'materialSHA256': '3' * 64, 'producerSHA256': source_binding['sha256'],
                'protectionSHA256': '4' * 64, 'sourceEquivalenceSHA256': '5' * 64}
    geometry_sha = hashlib.sha256(b'synthetic replacement geometry identity').hexdigest()
    variant = {'level': 'mid', 'asset': variant_asset, 'geometrySHA256': geometry_sha}
    demand = {'schema': 'crimemaps-building-detail-demand-v1', 'schemaVersion': 1, 'city': 'bremen',
              'canonicalIndex': index, 'canonicalLeaf': leaf, 'bindings': bindings,
              'near': {'level': 'near', 'asset': {k: v for k, v in leaf.items() if k != 'id'}},
              'variants': [variant]}
    admission = next(route for route in fixture['tables']['profile']['routes']
                     if route['file'] == 'painted/city/safety/progressive-paint-admissions.ts')
    sidecar = {'schema': 'crimemaps-building-detail-replacement-v1', 'schemaVersion': 1, 'city': 'bremen',
               'provenance': {'canonicalIndex': index}, 'canonicalLeaf': leaf, 'bindings': bindings,
               'variants': [{**variant, 'status': 'complete-replacement'}],
               'producer': {'files': [source_binding]},
               'protection': {'coverage': {'city': 'bremen', 'completeForCity': True,
                   'canonicalSHA256': admission['canonicalSHA256'],
                   'selectedSHA256': admission['descriptor']['sha256'],
                   'retainedCount': admission['retainedCount']}, 'evidence': []}}
    detail = {'root': root, 'demand': demand, 'sidecar': sidecar,
              'sidecar_path': root / 'detail-variants.json', 'variant_path': variant_path}
    seal_building_detail(fixture, detail)
    return detail


def test_building_detail_optional_cli_registration_seals_catalog_and_http_asset_closure(fixture):
    detail = building_detail(fixture)
    output = fixture['root'] / 'detail-inputs.json'
    args = SimpleNamespace(repo=fixture['repo'], commit=fixture['spec']['commit'], city='bremen',
                           profile=fixture['profile'], overrides_root=fixture['overrides'],
                           build_environment=Path(fixture['spec']['build_environment']['path']),
                           data_root=fixture['data'],
                           data_inventory=Path(fixture['spec']['data']['inventory']['path']),
                           data_inventory_sha256=fixture['spec']['data']['inventory']['sha256'],
                           data_prefix=['safety/', 'painted-tables/'], data_file=[], frontend_route=[],
                           resource_overlay_root=None, building_detail_root=detail['root'], out=output)
    # Exercise the real optional CLI parser as well as its pinned-input path.
    command = [sys.executable, '-B', str(MODULE), 'inputs']
    for name in ('repo', 'commit', 'city', 'profile', 'overrides_root', 'build_environment',
                 'data_root', 'data_inventory', 'data_inventory_sha256', 'building_detail_root', 'out'):
        command += ['--' + name.replace('_', '-'), str(getattr(args, name))]
    command += ['--data-prefix', 'safety/', '--data-prefix', 'painted-tables/']
    subprocess.run(command, check=True, capture_output=True)
    assert candidate.load(output)['building_detail'] == fixture['spec']['building_detail']
    fixture['inputs'] = output
    out, result = create(fixture)
    reopened, mounts = candidate.read_candidate(out / 'candidate.json')
    assert reopened == result
    bound = result['core']['building_detail']
    assert bound['asset_count'] == 2
    assert result['locations']['details'] == str(detail['root'])
    assert (out / 'bindings/building-detail-catalog.json').read_bytes() == detail['catalog_bytes']
    assert bound['catalog'] == candidate.file_binding(out / 'bindings/building-detail-catalog.json')
    assert bound['source_files'] == {row['path']: {key: row[key] for key in ('sha256', 'bytes')}
                                     for row in detail['sidecar']['producer']['files']}
    detail_routes = {name for name, row in mounts.items() if row['root'] == 'details'}
    assert detail_routes == {detail['sidecar']['demandIndex']['path'][1:], detail['demand']['variants'][0]['asset']['path'][1:]}
    with running(out / 'candidate.json') as origin:
        receipt = candidate.verify_http(out / 'candidate.json', origin, out / 'http-detail.json')
    verified = {row['route'].removeprefix(result['core']['prefix']) for row in receipt['verified']}
    assert detail_routes | set(bound['canonical_assets']) <= verified
    assert receipt['building_detail_assets_verified'] == 2
    assert receipt['whole_data_mount_scanned'] is False
    assert result['core']['build']['status'] == 'bound-existing-dist-build-unverified'
    assert not (out / 'source').exists() and not (out / 'build.log').exists()


@pytest.mark.parametrize('damage,reason', [
    ('sidecar-city', 'Wrong detail sidecar city/schema'),
    ('demand-city', 'Wrong detail demand city/schema'),
    ('duplicate-variant', 'variant closure mismatch'),
    ('demand-budget', 'filename/metadata bound'),
    ('overlay-budget', 'exceeds 32 MiB'),
    ('sidecar-sha', 'File SHA mismatch'), ('demand-sha', 'File SHA mismatch'),
    ('variant-sha', 'File SHA mismatch'), ('missing-variant', 'Missing ordinary file'),
    ('demand-source', 'demand/source binding mismatch'),
    ('variant-binding', 'replacement binding mismatch'),
    ('canonical-source', 'differs from producer source'),
    ('canonical-mount', 'absent from the original sealed data mount'),
    ('source-commit', 'differs from candidate source commit'),
    ('receipt-catalog', 'Frontend build receipt/detail catalog mismatch'),
])
def test_building_detail_rejects_unbound_metadata_payloads_and_source_closure(fixture, monkeypatch, damage, reason):
    detail = building_detail(fixture)
    if damage == 'sidecar-city':
        detail['sidecar']['city'] = 'hamburg'; seal_building_detail(fixture, detail)
    elif damage == 'demand-city':
        detail['demand']['city'] = 'hamburg'; seal_building_detail(fixture, detail)
    elif damage == 'duplicate-variant':
        detail['sidecar']['variants'].append(dict(detail['sidecar']['variants'][0])); seal_building_detail(fixture, detail)
    elif damage == 'demand-budget':
        detail['sidecar']['demandIndex']['bytes'] = 500001; seal_building_detail(fixture, detail, rewrite_demand=False)
    elif damage == 'overlay-budget':
        monkeypatch.setattr(candidate, 'RESOURCE_OVERLAY_LIMIT', 1)
    elif damage in ('sidecar-sha', 'demand-sha', 'variant-sha'):
        path = detail[{'sidecar-sha': 'sidecar_path', 'demand-sha': 'demand_path', 'variant-sha': 'variant_path'}[damage]]
        raw = path.read_bytes(); put(path, bytes([raw[0] ^ 1]) + raw[1:])
    elif damage == 'missing-variant':
        detail['variant_path'].unlink()
    elif damage == 'demand-source':
        detail['demand']['bindings'] = {**detail['demand']['bindings'], 'sourcePBFSHA256': 'f' * 64}
        seal_building_detail(fixture, detail)
    elif damage == 'variant-binding':
        detail['sidecar']['variants'][0]['geometrySHA256'] = 'f' * 64; seal_building_detail(fixture, detail)
    elif damage == 'canonical-source':
        detail['demand']['canonicalIndex'] = {**detail['demand']['canonicalIndex'], 'sha256': 'f' * 64}
        seal_building_detail(fixture, detail)
    elif damage == 'canonical-mount':
        inventory_path = Path(fixture['spec']['data']['inventory']['path'])
        inventory = candidate.load(inventory_path)
        del inventory['files'][detail['demand']['canonicalLeaf']['path'][1:]]
        put(inventory_path, inventory); fixture['spec']['data']['inventory'] = pinned(inventory_path)
        put(fixture['inputs'], fixture['spec'])
    elif damage == 'source-commit':
        detail['sidecar']['producer']['files'][0]['sha256'] = 'f' * 64; seal_building_detail(fixture, detail)
    elif damage == 'receipt-catalog':
        path = fixture['dist'] / 'city-data-build-receipt.json'
        receipt = candidate.load(path); receipt['buildingDetailCatalogSHA256'] = 'f' * 64; put(path, receipt)
    else:
        raise AssertionError(damage)
    with pytest.raises(ValueError, match=reason):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


def test_building_detail_http_rejects_changed_replacement_bytes_with_409(fixture):
    detail = building_detail(fixture)
    out, result = create(fixture)
    raw = detail['variant_path'].read_bytes()
    put(detail['variant_path'], bytes([raw[0] ^ 1]) + raw[1:])
    with running(out / 'candidate.json') as origin:
        with pytest.raises(urllib.error.HTTPError) as error:
            candidate.verify_http(out / 'candidate.json', origin, out / 'http-detail-failed.json')
        assert error.value.code == 409
        assert error.value.url == origin + result['core']['prefix'] + detail['demand']['variants'][0]['asset']['path'][1:]
    assert candidate.load(out / 'http-detail-failed.json')['status'] == 'fail'


@pytest.mark.parametrize('where', ['profile', 'config', 'environment', 'manifest'])
def test_wrong_city_fails_without_candidate(fixture, where):
    spec = fixture['spec']
    if where == 'profile':
        value = candidate.load(fixture['profile']); value['city'] = 'berlin'
        put(fixture['profile'], value); spec['profile'] = pinned(fixture['profile'])
    elif where == 'config':
        path = fixture['overrides'] / 'city-config.json'
        value = candidate.load(path); value['city'] = 'berlin'; put(path, value)
        spec['overrides']['files']['city-config.json'] = candidate.file_binding(path)
    elif where == 'environment':
        path = Path(spec['build_environment']['path'])
        put(path, {'VITE_DATED_STATISTICS_BINDING': '{"city":"berlin"}'})
        spec['build_environment'] = pinned(path)
    else:
        put(fixture['data'] / 'safety/manifest.json', {'city': 'Berlin'})
        path = Path(spec['data']['inventory']['path'])
        put(path, {'files': candidate.tree(fixture['data'])}); spec['data']['inventory'] = pinned(path)
    put(fixture['inputs'], spec)
    with pytest.raises(ValueError, match='City profile route closure mismatch' if where == 'profile' else '[Ww]rong'):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


@pytest.mark.parametrize('damage', ['input-sha', 'receipt', 'city-base', 'data-collision', 'reserved-endpoint'])
def test_damaged_or_ambiguous_inputs_do_not_pass(fixture, damage):
    if damage == 'input-sha':
        fixture['spec']['profile']['sha256'] = '0' * 64
        put(fixture['inputs'], fixture['spec'])
    elif damage == 'receipt':
        path = fixture['dist'] / 'city-data-build-receipt.json'
        value = candidate.load(path); value['profileSHA256'] = '0' * 64; put(path, value)
    elif damage == 'city-base':
        put(fixture['dist'] / 'index.html', b'<script src="/crimemaps-Berlin/assets/main.js"></script>')
    elif damage == 'data-collision':
        put(fixture['dist'] / 'safety/manifest.json', {'city': 'Bremen'})
    else:
        put(fixture['dist'] / '__render__/identity.json', {})
    with pytest.raises(ValueError):
        create(fixture)
    assert_no_pass(fixture['root'] / 'candidate')


def test_refuse_output_overwrite(fixture):
    out = fixture['root'] / 'candidate'; out.mkdir()
    sentinel = put(out / 'sentinel', b'preserve')
    with pytest.raises(FileExistsError):
        create(fixture)
    assert list(out.iterdir()) == [sentinel]
    assert sentinel.read_bytes() == b'preserve'


@pytest.mark.parametrize('free_gib', [49, 50.5])
def test_low_disk_refuses_before_archive_or_build(fixture, monkeypatch, free_gib):
    monkeypatch.setattr(candidate.shutil, 'disk_usage',
                        lambda path: SimpleNamespace(free=int(free_gib * candidate.GIB)))
    out = fixture['root'] / 'candidate'
    with pytest.raises(ValueError, match='No archive or build started'):
        candidate.create(fixture['inputs'], out, node_modules=fixture['root'] / 'unused-deps')
    assert candidate.load(out / 'storage-budget.json')['status'] == 'insufficient-space'
    assert not (out / 'source').exists()
    assert not (out / 'source.tar.gz').exists()
    assert not (out / 'build.log').exists()
    assert_no_pass(out)


def test_existing_dist_can_be_bound_without_large_build_reserve(fixture, monkeypatch):
    monkeypatch.setattr(candidate.shutil, 'disk_usage',
                        lambda path: SimpleNamespace(free=candidate.GIB))
    out, _ = create(fixture)
    assert candidate.load(out / 'storage-budget.json')['status'] == 'within-budget'
    assert not (out / 'source').exists()


def test_compressed_source_archive_preserves_tracked_bytes(fixture):
    out = fixture['root'] / 'archive-only'; out.mkdir()
    source, binding = candidate.archive(fixture['repo'], fixture['spec']['commit'], out)
    assert binding['path'] == 'source.tar.gz' and binding['format'] == 'tar.gz'
    candidate.check_binding(out / binding['path'], binding)
    assert not (out / 'source.tar').exists()
    for name in ('web/package.json', 'web/package-lock.json'):
        assert (source / name).read_bytes() == (fixture['repo'] / name).read_bytes()


def test_bounded_build_admission_is_explicit_and_preserves_reserve(fixture, monkeypatch):
    out = fixture['root'] / 'budget'; out.mkdir()
    monkeypatch.setattr(candidate.shutil, 'disk_usage', lambda path: SimpleNamespace(free=37 * candidate.GIB))
    with pytest.raises(ValueError, match='No archive or build started'):
        candidate.storage_preflight(out, fixture['repo'], fixture['spec']['commit'], True)
    out = fixture['root'] / 'bounded-budget'; out.mkdir()
    candidate.storage_preflight(out, fixture['repo'], fixture['spec']['commit'], True, True)
    budget = candidate.load(out / 'storage-budget.json')
    assert budget['reserve_bytes'] == 32 * candidate.GIB
    assert budget['candidate_limit_bytes'] == 2 * candidate.GIB
    monkeypatch.setattr(candidate.shutil, 'disk_usage', lambda path: SimpleNamespace(free=32 * candidate.GIB))
    out = fixture['root'] / 'too-low-budget'; out.mkdir()
    with pytest.raises(ValueError, match='No archive or build started'):
        candidate.storage_preflight(out, fixture['repo'], fixture['spec']['commit'], True, True)


def test_bounded_build_rejects_large_estimate_and_dist_binding(fixture, monkeypatch):
    out = fixture['root'] / 'budget'; out.mkdir()
    monkeypatch.setattr(candidate, 'BOUNDED_BUILD_LIMIT', candidate.GIB)
    with pytest.raises(ValueError, match='No archive or build started'):
        candidate.storage_preflight(out, fixture['repo'], fixture['spec']['commit'], True, True)
    with pytest.raises(ValueError, match='requires a real build'):
        candidate.storage_preflight(out, fixture['repo'], fixture['spec']['commit'], False, True)


def test_live_storage_guard_excludes_dependency_links_and_detects_own_growth(fixture, monkeypatch):
    out = fixture['root'] / 'monitor'; out.mkdir()
    dependency = put(fixture['root'] / 'dependency/large', b'x' * 65536).parent
    (out / 'node_modules').symlink_to(dependency, target_is_directory=True)
    monkeypatch.setattr(candidate, 'BOUNDED_BUILD_LIMIT', 32768)
    candidate.check_build_storage(out)
    assert candidate.load(out / 'storage-monitor.json')['candidate_allocated_bytes'] < 32768
    put(out / 'growth', b'x' * 65536)
    with pytest.raises(ValueError, match='storage limit reached'):
        candidate.check_build_storage(out)
    assert candidate.load(out / 'storage-monitor.json')['status'] == 'insufficient-space'


@pytest.mark.skipif(os.name != 'posix', reason='process-group guard requires POSIX')
def test_bounded_build_stops_spawned_children_when_disk_pressure_appears(fixture, monkeypatch):
    out = fixture['root'] / 'monitor'; out.mkdir()
    pidfile = out / 'child.pid'
    original = candidate.check_build_storage

    def pressure(path):
        if pidfile.exists():
            monkeypatch.setattr(candidate.shutil, 'disk_usage', lambda _: SimpleNamespace(free=31 * candidate.GIB))
        original(path)

    monkeypatch.setattr(candidate, 'check_build_storage', pressure)
    code = ('import subprocess,sys,time; from pathlib import Path; '
            'p=subprocess.Popen([sys.executable,"-c","import time; time.sleep(60)"]); '
            f'Path({str(pidfile)!r}).write_text(str(p.pid)); time.sleep(60)')
    with pytest.raises(ValueError, match='storage limit reached'):
        candidate.bounded_build([sys.executable, '-c', code], out, 10)
    child = int(pidfile.read_text())
    state = subprocess.run(['ps', '-o', 'stat=', '-p', str(child)], capture_output=True, text=True, check=False).stdout.strip()
    assert not state or state.startswith('Z'), state


@pytest.mark.skipif(os.name != 'posix', reason='process-group guard requires POSIX')
def test_bounded_build_preserves_exit_failure_timeout_and_success(fixture):
    out = fixture['root'] / 'monitor'; out.mkdir()
    with pytest.raises(subprocess.CalledProcessError) as error:
        candidate.bounded_build([sys.executable, '-c', 'raise SystemExit(7)'], out, 5)
    assert error.value.returncode == 7
    with pytest.raises(subprocess.TimeoutExpired):
        candidate.bounded_build([sys.executable, '-c', 'import time; time.sleep(60)'], out, .05)
    candidate.bounded_build([sys.executable, '-c', 'pass'], out, 5)
    assert candidate.load(out / 'storage-monitor.json')['status'] == 'within-budget'


def test_bounded_create_binds_final_monitor_and_cannot_rewrite_sealed_receipt(fixture, monkeypatch):
    deps = fixture['root'] / 'deps/node_modules'; deps.mkdir(parents=True)
    put(deps.parent / 'package-lock.json', (fixture['repo'] / 'web/package-lock.json').read_bytes())
    put(deps / '.package-lock.json', {})

    def synthetic_build(command, out, timeout, **kwargs):
        candidate.check_build_storage(out)
        candidate.shutil.copytree(fixture['dist'], out / 'dist')
        kwargs['stdout'].write(b'synthetic fixture, no npm build\n')

    monkeypatch.setattr(candidate, 'bounded_build', synthetic_build)
    out = fixture['root'] / 'candidate'
    result = candidate.create(fixture['inputs'], out, node_modules=deps, bounded=True)
    build = result['core']['build']
    candidate.check_binding(out / 'storage-budget.json', build['storage_budget'])
    candidate.check_binding(out / 'storage-monitor.json', build['storage_monitor'])
    before = (out / 'storage-monitor.json').read_bytes()
    with pytest.raises(ValueError, match='sealed candidate'):
        candidate.check_build_storage(out)
    assert (out / 'storage-monitor.json').read_bytes() == before


@pytest.mark.parametrize('damage', ['changed-data', 'symlink-data', 'changed-dist'])
def test_post_seal_changes_fail_http_without_fallback(fixture, damage):
    out, _ = create(fixture)
    if damage == 'changed-data':
        put(fixture['data'] / 'safety/tiny.json', b'corrupt')
    elif damage == 'symlink-data':
        path = fixture['data'] / 'safety/tiny.json'; path.unlink()
        path.symlink_to(put(fixture['root'] / 'outside.json', b'outside'))
    else:
        put(fixture['dist'] / 'assets/main.js', b'corrupt')
    with running(out / 'candidate.json') as origin:
        with pytest.raises(urllib.error.HTTPError) as error:
            candidate.verify_http(out / 'candidate.json', origin, out / 'http.json', ['safety/tiny.json'])
        assert error.value.code == 409
    assert candidate.load(out / 'http.json')['status'] == 'fail'


def test_mount_manifest_tamper_is_rejected(fixture):
    out, _ = create(fixture)
    put(out / 'mounts.json', {})
    with pytest.raises(ValueError, match='SHA mismatch'):
        candidate.read_candidate(out / 'candidate.json')


def test_build_failure_archives_once_and_has_clean_environment(fixture, monkeypatch):
    deps = fixture['root'] / 'deps/node_modules'; deps.mkdir(parents=True)
    lock = (fixture['repo'] / 'web/package-lock.json').read_bytes()
    put(deps.parent / 'package-lock.json', lock); put(deps / '.package-lock.json', {})
    original = subprocess.run
    archive_calls = []
    observed = {}

    def fake_run(command, **kwargs):
        if command[0] == 'npm':
            observed.update(kwargs['env'])
            kwargs['stdout'].write(b'synthetic controlled failure\n')
            raise subprocess.CalledProcessError(23, command)
        if 'archive' in command:
            archive_calls.append(command)
        return original(command, **kwargs)

    monkeypatch.setattr(subprocess, 'run', fake_run)
    monkeypatch.setenv('VITE_ACCIDENTAL', 'must not inherit')
    monkeypatch.setenv('CRIMEMAPS_ACCIDENTAL', 'must not inherit')
    monkeypatch.setenv('NODE_OPTIONS', 'must not inherit')
    out = fixture['root'] / 'candidate'
    with pytest.raises(subprocess.CalledProcessError):
        candidate.create(fixture['inputs'], out, node_modules=deps)
    assert len(archive_calls) == 1
    assert_no_pass(out)
    assert not any(k in observed for k in ('NODE_OPTIONS', 'VITE_ACCIDENTAL', 'CRIMEMAPS_ACCIDENTAL'))
    assert observed['VITE_FEATURE'] == 'bound'
    assert observed['CRIMEMAPS_BUILD_PURPOSE'] == 'publication'
    assert Path(observed['CRIMEMAPS_CITY_PROFILE']) == out / 'bindings/city-data-profile.json'
    for name in candidate.CITY_FILES:
        assert (out / 'source' / name).read_bytes() == (fixture['overrides'] / name).read_bytes()


def observation(ident, origin):
    value = {'schema_version': 1, 'proof_schema_version': 1, 'candidate_id': ident,
             'server_candidate_id': ident, 'url': origin + '/crimemaps-Bremen/map/',
             'extractor_sha256': candidate.sha(MODULE.parent / 'smoke-extract.js'),
             'document_hidden': False, 'proof_age_ms': 40, 'mode': '3d', 'wanted_mode': '3d',
             'gpu_unavailable': False, 'recovery': 'idle', 'browser': {'user_agent': 'synthetic fixture, not real Chrome'},
             'solar': {'mode': '3d', 'hidden': False, 'suspended': False, 'destroyed': False, 'faulted': False,
                       'core': {'status': 'ready', 'published': True, 'captures': 1,
                                'preparation': {'status': 'ready', 'ready': 1, 'pending': 0, 'failed': 0},
                                'coverage': {'complete': True, 'triangles': 100, 'draws': 2},
                                'captureResult': {'complete': True, 'triangles': 100, 'draws': 2}}}}
    return value


@pytest.mark.parametrize('defect', [None, 'scene-section', 'incomplete', 'over-budget', 'unpublished', 'coverage',
                                  'pending', 'wrong-candidate', 'stale', 'proof-schema', 'omitted-row', 'no-capture', 'recovery',
                                  'diagnostic-section'])
def test_external_smoke_contract_rejects_false_ready(fixture, defect):
    out, result = create(fixture)
    with running(out / 'candidate.json') as origin:
        candidate.verify_http(out / 'candidate.json', origin, out / 'http.json')
    value = observation(result['candidate_id'], origin)
    core = value['solar']['core']
    if defect == 'incomplete':
        core['captureResult'].update(complete=False, reason='mask-unavailable')
    elif defect == 'over-budget':
        core['captureResult']['triangles'] = 101
    elif defect == 'omitted-row':
        core['captureResult']['triangles'] = 99
    elif defect == 'no-capture':
        core['captures'] = 0
    elif defect == 'unpublished':
        core['published'] = False
    elif defect == 'coverage':
        core['coverage']['complete'] = False
    elif defect == 'pending':
        core['preparation']['pending'] = 1
    elif defect == 'wrong-candidate':
        value['candidate_id'] = '0' * 64
    elif defect == 'stale':
        value['proof_age_ms'] = 5001
    elif defect == 'recovery':
        value['recovery'] = 'timed-out'
    elif defect == 'proof-schema':
        value.pop('proof_schema_version')
    elif defect == 'diagnostic-section':
        value['extraction_section'] = 'programs'
    elif defect == 'scene-section':
        value['extraction_section'] = 'scene'
    saved = put(out / 'observation.json', value)
    if defect not in (None, 'scene-section'):
        with pytest.raises(ValueError):
            candidate.smoke(out / 'candidate.json', saved, out / 'http.json', out / 'smoke.json')
        assert candidate.load(out / 'smoke.json')['status'] == 'fail'
    else:
        receipt = candidate.smoke(out / 'candidate.json', saved, out / 'http.json', out / 'smoke.json')
        assert receipt['status'] == 'pass'
        assert receipt['publication_ready'] is False and receipt['owner_approved'] is False
        assert 'not hardware/visual/performance acceptance' in receipt['scope']
    expression = candidate.extraction(out / 'candidate.json')
    assert result['candidate_id'] in expression
    assert candidate.sha(MODULE.parent / 'smoke-extract.js') in expression
    assert 'proof.schemaVersion !== 1' in expression


def test_freeze_cli_pins_existing_inventory_without_site_scan(fixture):
    output = fixture['root'] / 'frozen-inputs.json'
    subprocess.run([sys.executable, '-B', str(MODULE), 'inputs', '--repo', str(fixture['repo']),
                    '--commit', fixture['spec']['commit'], '--city', 'bremen',
                    '--profile', str(fixture['profile']), '--overrides-root', str(fixture['overrides']),
                    '--build-environment', fixture['spec']['build_environment']['path'],
                    '--data-root', str(fixture['data']),
                    '--data-inventory', fixture['spec']['data']['inventory']['path'],
                    '--data-inventory-sha256', fixture['spec']['data']['inventory']['sha256'],
                    '--data-prefix', 'safety/', '--data-prefix', 'painted-tables/', '--out', str(output)],
                   check=True, capture_output=True)
    frozen = candidate.load(output)
    assert frozen['overrides'] == fixture['spec']['overrides']
    assert frozen['profile'] == fixture['spec']['profile']
    assert frozen['frontend_routes'] == fixture['spec']['frontend_routes']
    assert frozen['data']['inventory']['sha256'] == fixture['spec']['data']['inventory']['sha256']


def test_success_exit_with_bad_dist_never_writes_build_pass(fixture, monkeypatch):
    deps = fixture['root'] / 'deps/node_modules'; deps.mkdir(parents=True)
    put(deps.parent / 'package-lock.json', (fixture['repo'] / 'web/package-lock.json').read_bytes())
    put(deps / '.package-lock.json', {})
    original_run, original_check = subprocess.run, subprocess.check_output

    def fake_run(command, **kwargs):
        if command[0] == 'npm':
            target = Path(command[command.index('--outDir') + 1])
            put(target / 'index.html', b'broken synthetic output')
            return subprocess.CompletedProcess(command, 0)
        return original_run(command, **kwargs)

    def fake_check(command, **kwargs):
        if command[0] in ('npm', 'node'):
            return 'synthetic test version'
        return original_check(command, **kwargs)

    monkeypatch.setattr(subprocess, 'run', fake_run)
    monkeypatch.setattr(subprocess, 'check_output', fake_check)
    out = fixture['root'] / 'candidate'
    with pytest.raises(ValueError, match='Incomplete frontend dist'):
        candidate.create(fixture['inputs'], out, node_modules=deps)
    assert_no_pass(out)
    assert candidate.load(out / 'stages/build.json')['status'] == 'fail'


@pytest.mark.parametrize('version', [1, 0])
@pytest.mark.parametrize('section,provider', [('full', None), ('scene', None), ('inputs', None),
                                            ('programs', 'bremen'), ('readiness', 'bremen'),
                                            ('programs', 'root500'), ('readiness', 'root500')])
def test_actual_js_extractor_with_tiny_mocked_dom_not_a_browser(fixture, version, section, provider):
    out, result = create(fixture)
    expected = observation(result['candidate_id'], 'http://127.0.0.1:1234')
    proof = {'schemaVersion': version, 'monotonicMs': 100, 'sequence': 2, 'mode': '3d',
             'wantedMode': '3d', 'gpuUnavailable': False, 'recovery': 'idle', 'recoveryRevision': 0,
             'scene': {'solarShadow': expected['solar']},
             'frozenTableInputs': {'reads': 2, 'parses': 2,
                                  'resolvedInputs': {'resolvedJSONBytes': 1234,
                                                     'performanceTimeOriginMs': 100000}},
             'frozenDataResources': {'active': 0, 'queued': 0, 'waiters': 0, 'leases': 2,
                                     'valueCells': 1, 'logicalBytesWithLiveLease': 432000},
             'programPreparation': [{'provider': 'bremen', 'pending': 2, 'failed': 0, 'ready': 0},
                                    {'provider': 'city', 'pending': 1, 'failed': 0, 'ready': 0}]}
    detail = {'threeDimensional': {'paintProviders': {
        'bremen': {'drawReadiness': {'phase': 'timeout', 'ticket': 1, 'inspections': 3}},
        'city': {'drawReadiness': {'phase': 'ready', 'ticket': 1, 'inspections': 1}}}}}
    payload = {'expression': candidate.extraction(out / 'candidate.json', section, provider), 'proof': proof,
               'detail': detail,
               'identity': {'candidate_id': result['candidate_id']}}
    script = r'''
const vm=require('node:vm'), fs=require('node:fs');
const x=JSON.parse(fs.readFileSync(0,'utf8'));
const context={location:{hostname:'127.0.0.1',pathname:'/crimemaps-Bremen/map/',
href:'http://127.0.0.1:1234/crimemaps-Bremen/map/'},
fetch:async()=>({ok:true,headers:{get:()=>x.identity.candidate_id},json:async()=>x.identity}),
document:{getElementById:id=>({textContent:JSON.stringify(id==='map-detail-proof'?x.detail:x.proof)}),hidden:false},
performance:{now:()=>150},navigator:{userAgent:'mock',platform:'synthetic'},
innerWidth:800,innerHeight:600,devicePixelRatio:1};
vm.runInNewContext(x.expression,context).then(value=>console.log(JSON.stringify(value)))
.catch(error=>{console.error(String(error));process.exitCode=1});
'''
    run = subprocess.run(['node', '-e', script], input=json.dumps(payload), text=True,
                         capture_output=True, check=False)
    if version == 1:
        assert run.returncode == 0, run.stderr
        actual = json.loads(run.stdout)
        assert actual['candidate_id'] == result['candidate_id']
        assert actual['extractor_sha256'] == expected['extractor_sha256']
        assert actual['proof_age_ms'] == 50
        assert actual['recovery'] == 'idle' and actual['recovery_revision'] == 0
        assert actual['sequence'] == 2 and actual['captured_at']
        diagnostics = {'frozen_table_inputs', 'frozen_data_resources', 'program_preparation', 'manager_draw_readiness'}
        if section in ('full', 'scene'):
            assert actual['solar']['core']['captureResult'] == expected['solar']['core']['captureResult']
            assert (set(actual) & diagnostics) == (diagnostics if section == 'full' else set())
        else:
            assert 'solar' not in actual
            key = {'inputs': 'frozen_table_inputs', 'programs': 'program_preparation',
                   'readiness': 'manager_draw_readiness'}[section]
            assert set(actual) & diagnostics == ({key, 'frozen_data_resources'} if section == 'inputs' else {key})
            if section == 'inputs':
                assert actual['frozen_data_resources']['leases'] == 2
                assert actual['frozen_data_resources']['logicalBytesWithLiveLease'] == 432000
                assert actual[key]['resolvedInputs']['resolvedJSONBytes'] == 1234
                assert actual[key]['resolvedInputs']['performanceTimeOriginMs'] == 100000
            if provider:
                diagnostic = actual[key]
                assert diagnostic['selected_provider'] == provider
                if provider == 'bremen':
                    assert diagnostic['available'] is True and list(diagnostic['providers']) == [provider]
                    if section == 'programs':
                        assert diagnostic['providers'][provider]['pending'] == 2
                    else:
                        assert diagnostic['providers'][provider]['phase'] == 'timeout'
                else:
                    assert diagnostic['available'] is False and 'providers' not in diagnostic
                    assert diagnostic['unavailable_reason'] == 'selected-provider-unavailable'
        if section != 'full':
            assert actual['extraction_section'] == section and actual['section_schema_version'] == 1
        else:
            assert 'extraction_section' not in actual
    else:
        assert run.returncode == 1 and 'Unsupported scene proof schema' in run.stderr


@pytest.mark.parametrize('section,provider', [('unknown', None), ('full', 'bremen'), ('scene', 'bremen'),
                                            ('inputs', 'bremen'), ('programs', None), ('readiness', None),
                                            ('programs', 'unknown')])
def test_extraction_sections_reject_ambiguous_or_unbounded_provider_selection(section, provider):
    with pytest.raises(ValueError):
        candidate.extraction(Path('must-not-be-opened.json'), section, provider)


def test_http_default_checks_entry_assets_but_lazy_chunk_is_explicit(fixture):
    html = (b'<script type="module" src="/crimemaps-Bremen/assets/main.js"></script>'
            b'<link rel="stylesheet" href="/crimemaps-Bremen/assets/main.css">')
    put(fixture['dist'] / 'index.html', html)
    put(fixture['dist'] / 'assets/lazy.js', b'not a startup asset')
    out, _ = create(fixture)
    put(fixture['dist'] / 'assets/lazy.js', b'changed after sealing')
    with running(out / 'candidate.json') as origin:
        result = candidate.verify_http(out / 'candidate.json', origin, out / 'startup.json')
        routes = {entry['route'] for entry in result['verified']}
        assert '/crimemaps-Bremen/assets/main.js' in routes
        assert '/crimemaps-Bremen/assets/main.css' in routes
        assert '/crimemaps-Bremen/assets/lazy.js' not in routes
        with pytest.raises(urllib.error.HTTPError) as error:
            candidate.verify_http(out / 'candidate.json', origin, out / 'lazy.json', ['assets/lazy.js'])
        assert error.value.code == 409
        assert candidate.load(out / 'lazy.json')['status'] == 'fail'


def test_unbound_entry_reference_fails_http(fixture):
    put(fixture['dist'] / 'index.html', b'<script src="/crimemaps-Bremen/assets/missing.js"></script>')
    out, _ = create(fixture)
    with running(out / 'candidate.json') as origin, pytest.raises(ValueError, match='Required entry asset'):
        candidate.verify_http(out / 'candidate.json', origin, out / 'http.json')
    assert candidate.load(out / 'http.json')['status'] == 'fail'


def test_candidate_http_keeps_one_connection_for_successive_asset_reads(fixture):
    import http.client
    out, _ = create(fixture)
    with running(out / 'candidate.json') as origin:
        connection = http.client.HTTPConnection(origin.removeprefix('http://'))
        try:
            connection.request('GET', '/crimemaps-Bremen/map/')
            response = connection.getresponse()
            assert response.status == 200 and response.version == 11
            response.read()
            socket = connection.sock
            connection.request('GET', '/crimemaps-Bremen/city-data-profile.json')
            response = connection.getresponse()
            assert response.status == 200 and response.version == 11
            response.read()
            assert connection.sock is socket
        finally:
            connection.close()
