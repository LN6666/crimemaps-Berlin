"""Small real-file proofs: packaging cannot skip validation of omitted leaves."""
import hashlib
import importlib.util
import json
from pathlib import Path

import pytest

SPEC = importlib.util.spec_from_file_location(
    'detail_candidate', Path(__file__).resolve().parents[2] / 'scripts/render/candidate.py')
candidate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(candidate)


@pytest.fixture
def city(tmp_path):
    city_id = 'berlin'
    root = tmp_path / 'proof'
    root.mkdir()
    resources, entries, mounts = [], [], {}
    index = {'path': '/safety/buildings3d/berlin/index.json', 'sha256': '1' * 64, 'bytes': 10}
    mounts[index['path'][1:]] = {'root': 'data', 'path': index['path'][1:], **{k: index[k] for k in ('sha256', 'bytes')}}
    producer = [{'path': 'scripts/render/synthetic-producer.mjs', 'sha256': '2' * 64, 'bytes': 10}]
    admission = {'file': 'painted/city/safety/progressive-paint-admissions.ts',
                 'canonicalSHA256': '3' * 64, 'descriptor': {'sha256': '4' * 64}, 'retainedCount': 1}

    def write(relative, data):
        file = root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data if isinstance(data, bytes) else candidate.canonical(data) + b'\n')
        return file

    def asset(directory, prefix, data, suffix='.json'):
        raw = data if isinstance(data, bytes) else candidate.canonical(data) + b'\n'
        sha = hashlib.sha256(raw).hexdigest()
        name = f'{prefix}-{sha}{suffix}'
        file = write(f'{directory}/{name}', raw)
        descriptor = {'path': f'/safety/buildings3d/detail-variants/{city_id}/{directory}/{name}',
                      'sha256': sha, 'bytes': len(raw)}
        resources.append({**descriptor, 'source': file.relative_to(root).as_posix()})
        return descriptor

    for n in range(2):
        directory = f'leaves/{n}'
        leaf = {'id': f'leaf-{n}', 'path': f'/safety/buildings3d/berlin/leaf-{n}.json',
                'sha256': str(n + 5) * 64, 'bytes': 10}
        mounts[leaf['path'][1:]] = {'root': 'data', 'path': leaf['path'][1:], **{k: leaf[k] for k in ('sha256', 'bytes')}}
        groups = asset(directory, 'groups', {'synthetic': 'x' * (5000 if n == 0 else 10)})
        variants = []
        if n:
            replacement = asset(directory, 'mid', b'opaque synthetic transport', '.json.gz')
            replacement.update(compression='gzip', uncompressed_sha256='7' * 64, uncompressed_bytes=100)
            variants.append({'level': 'mid', 'asset': replacement, 'geometrySHA256': '8' * 64,
                             'encoding': 'meshopt-lossless-f32-v1', 'decodedBytes': 72})
        demand = asset(directory, 'demand', {'schema': 'crimemaps-building-detail-demand-v1',
            'schemaVersion': 1, 'city': city_id, 'bindings': {}, 'canonicalIndex': index,
            'canonicalLeaf': leaf, 'near': {'asset': leaf}, 'groupMetadata': groups, 'variants': variants})
        sidecar = write(f'{directory}/detail-variants.json', {
            'schema': 'crimemaps-building-detail-replacement-v1', 'schemaVersion': 1, 'city': city_id,
            'bindings': {}, 'demandIndex': demand, 'groupMetadata': groups, 'canonicalLeaf': leaf,
            'provenance': {'canonicalIndex': index}, 'producer': {'files': producer},
            'protection': {'coverage': {'city': city_id, 'completeForCity': True,
                'canonicalSHA256': admission['canonicalSHA256'], 'selectedSHA256': admission['descriptor']['sha256'],
                'retainedCount': 1}, 'evidence': []},
            'variants': [{**v, 'status': 'complete-replacement'} for v in variants]})
        entries.append({'canonicalIndexSHA256': index['sha256'], 'canonicalLeafSHA256': leaf['sha256'],
            'leafId': leaf['id'], 'demandIndex': demand, 'groupMetadata': groups,
            'leafManifest': {'file': sidecar.relative_to(root).as_posix(), **candidate.file_binding(sidecar)},
            'variants': [{k: v[k] for k in ('level', 'geometrySHA256', 'encoding', 'decodedBytes')} for v in variants],
            'canonicalOnly': not variants})
    buckets = {}
    for entry in entries:
        key = [entry[k] for k in ('canonicalIndexSHA256', 'canonicalLeafSHA256', 'leafId')]
        prefix = hashlib.sha256(json.dumps(key, separators=(',', ':')).encode()).hexdigest()[:2]
        buckets.setdefault(prefix, []).append({k: entry[k] for k in
            ('canonicalIndexSHA256', 'canonicalLeafSHA256', 'leafId', 'demandIndex', 'groupMetadata')})
    pages = [{'prefix': prefix, 'asset': asset('catalog', 'catalog', {
        'schema': 'crimemaps-building-detail-catalog-page-v1', 'schemaVersion': 1,
        'city': city_id, 'prefix': prefix, 'entries': rows})} for prefix, rows in buckets.items()]
    catalog = asset('catalog', 'catalog', {'schema': 'crimemaps-building-detail-catalog-v2',
        'schemaVersion': 2, 'city': city_id, 'entryCount': 2, 'pages': pages})
    libraries = [{'path': path, 'sha256': '9' * 64, 'bytes': 10, 'package': 'meshoptimizer', 'version': '1.3.0'}
                 for path in ('meshopt_simplifier.js', 'meshopt_encoder.js', 'meshopt_decoder.mjs')]
    manifest = write('detail-variants.json', {'schema': 'crimemaps-building-detail-city-v1',
        'schemaVersion': 1, 'city': city_id, 'status': 'complete', 'resources': resources,
        'catalog': catalog, 'entries': entries,
        'source': {'producerFiles': producer, 'libraries': libraries,
            'producerSHA256': candidate.digest({'files': producer, 'libraries': libraries}),
            'sourceContextSHA256': 'a' * 64, 'catalog': {'sha256': 'b' * 64, 'bytes': 10},
            'canonicalIndex': index},
        'summary': {'completedLeaves': 2, 'discoveredLeaves': 2, 'failedLeaves': 0,
            'pendingLeaves': 0, 'distinctVariantLeaves': 1, 'canonicalOnlyLeaves': 1}})
    return {'spec': {'root': str(root), 'manifest': {'path': str(manifest), **candidate.file_binding(manifest)}},
            'root': root, 'profile': {'routes': [admission]}, 'mounts': mounts, 'entries': entries}


def bind(city, compact=True):
    return candidate.bind_building_detail({**city['spec'], 'variant_leaves_only': compact},
        'berlin', city['profile'], dict(city['mounts']))


def test_compact_deployment_preserves_full_proof_and_exact_replacement(city):
    full, _ = bind(city, False)
    compact, raw = bind(city)
    catalog = json.loads(raw)
    assert compact['leaf_counts'] == full['leaf_counts']
    assert compact['canonical_assets'] == full['canonical_assets']
    assert compact['source_files'] == full['source_files']
    assert compact['replacement_levels'] == full['replacement_levels'] == 1
    assert [row['leafId'] for row in catalog['entries']] == ['leaf-1']
    assert catalog['entries'][0]['groupMetadata'] == city['entries'][1]['groupMetadata']
    assert compact['asset_count'] == 3
    assert compact['asset_bytes'] < full['asset_bytes']


def test_omitted_canonical_only_group_must_still_have_valid_bytes(city):
    name = Path(city['entries'][0]['groupMetadata']['path']).name
    path = city['root'] / 'leaves/0' / name
    raw = path.read_bytes()
    path.write_bytes(b'!' + raw[1:])
    with pytest.raises(ValueError, match='SHA'):
        bind(city)


def test_public_limit_is_not_raised_by_compaction(city, monkeypatch):
    compact, raw = bind(city)
    monkeypatch.setattr(candidate, 'DETAIL_CITY_LIMIT', compact['asset_bytes'] + len(raw) - 1)
    with pytest.raises(ValueError, match='deployed overlay exceeds'):
        bind(city)
    with pytest.raises(ValueError, match='overlay exceeds'):
        bind(city, False)


def test_private_proof_is_bounded_and_flag_is_not_coerced(city, monkeypatch):
    monkeypatch.setattr(candidate, 'DETAIL_PRIVATE_PROOF_LIMIT', 1)
    with pytest.raises(ValueError, match='private proof exceeds'):
        bind(city)
    with pytest.raises(ValueError, match='invalid detail deployment mode'):
        bind(city, 'true')
