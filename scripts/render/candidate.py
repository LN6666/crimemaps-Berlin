#!/usr/bin/env python3
"""One private render candidate: create/build, sealed mounts, HTTP and smoke binding.

Stdlib only. No browser is launched and no publication approval is generated.
"""
from __future__ import annotations

import argparse
import hashlib
import http.server
import importlib.util
import json
import mimetypes
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import ChainMap
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath

VERSION = 1
CITIES = {'berlin', 'hamburg', 'munich', 'cologne', 'frankfurt', 'dusseldorf', 'stuttgart',
          'leipzig', 'dortmund', 'bremen', 'essen', 'dresden', 'hannover', 'nuremberg'}
CITY_FILES = ['city-config.json', 'web/src/safety/cached-city-briefs.ts',
              *[f'web/src/safety/statistics-locales/city-briefs.{lang}.json' for lang in ('de', 'en', 'zh')]]
SHA = re.compile(r'[a-f0-9]{64}')
HERE = Path(__file__).resolve().parent
GIB = 1024 ** 3
BUILD_FREE_RESERVE = 50 * GIB
BOUNDED_BUILD_RESERVE = 32 * GIB
BOUNDED_BUILD_LIMIT = 2 * GIB
RESOURCE_OVERLAY_LIMIT = 32 * 1024 ** 2
DETAIL_CITY_LIMIT = 512 * 1024 ** 2
DETAIL_PRIVATE_PROOF_LIMIT = 2 * GIB
DETAIL_MANIFEST_LIMIT = 20_000_000
PAINT_TABLE_PATH = re.compile(r'/safety/buildings3d/painted-tables/[a-f0-9]{2}/([a-f0-9]{64})\.json(?:\.gz)?')
PROFILE_SOURCE_FILES = {'dependencies': 'web/src/safety/frozen-paint-table-dependencies.json',
                        'manifest': 'web/src/safety/frozen-paint-table-manifest.json'}
PROFILE_CONTRACT_TOOL = HERE.parent / 'migration/verify_city_data_profile.py'
DETAIL_PATH = re.compile(r'/safety/buildings3d/detail-variants/[A-Za-z0-9_./-]+')


def require(value, message):
    if not value:
        raise ValueError(message)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def load(path, limit=20_000_000):
    path = Path(path)
    require(path.stat().st_size <= limit, f'Metadata exceeds bound: {path.name}')
    return json.loads(path.read_text())


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as stream:
        stream.write(canonical(value) + b'\n')


def relative(value, directory=False):
    require(isinstance(value, str) and value and not any(c in value for c in ('\\', '%', '?', '#')) and
            not any(ord(c) < 32 or ord(c) == 127 for c in value),
            'Invalid relative path')
    name = value[:-1] if directory and value.endswith('/') else value
    require(not name.startswith('/') and all(p not in ('', '.', '..') for p in name.split('/')),
            'Unsafe relative path')
    require(PurePosixPath(name).as_posix() == name, 'Noncanonical path')
    return name


def checked_path(root, name):
    root = Path(root)
    require(root.is_absolute() and root.resolve() == root and not root.is_symlink(), 'Mount root changed')
    name = relative(name)
    path = root
    for part in PurePosixPath(name).parts:
        path = path / part
        require(not path.is_symlink(), f'Symlink is not an allowed mount: {name}')
    require(path.resolve().is_relative_to(root) and path.is_file(), f'Missing ordinary file: {name}')
    return path


def file_binding(path):
    path = Path(path)
    require(path.is_file() and not path.is_symlink(), f'Expected ordinary file: {path}')
    return {'sha256': sha(path), 'bytes': path.stat().st_size}


def check_binding(path, expected):
    require(isinstance(expected, dict) and SHA.fullmatch(expected.get('sha256', '')),
            'Missing SHA-256 binding')
    actual = file_binding(path)
    require(actual['sha256'] == expected['sha256'], f'File SHA mismatch: {Path(path).name}')
    if 'bytes' in expected:
        require(actual['bytes'] == expected['bytes'], f'File length mismatch: {Path(path).name}')
    return actual


def tree(root):
    root = Path(root).resolve()
    return {p.relative_to(root).as_posix(): file_binding(checked_path(root, p.relative_to(root).as_posix()))
            for p in sorted(root.rglob('*')) if p.is_file() or p.is_symlink()}


def stage(out, name, status, **extra):
    save(Path(out) / 'stages' / f'{name}.json', {'schema_version': VERSION, 'stage': name,
         'status': status, 'recorded_at': datetime.now(UTC).isoformat(), **extra})


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])


def profile_resource_contract(profile, dependencies, manifest, city):
    spec = importlib.util.spec_from_file_location('_render_city_profile_contract', PROFILE_CONTRACT_TOOL)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.profile_resource_contract(profile, dependencies, manifest, city)


def source_profile_bindings(repo, commit):
    raw = {name: git(repo, 'show', f'{commit}:{file}') for name, file in PROFILE_SOURCE_FILES.items()}
    bindings = {name: {'sha256': hashlib.sha256(value).hexdigest(), 'bytes': len(value)}
                for name, value in raw.items()}
    return {name: json.loads(value) for name, value in raw.items()}, bindings


def city_route_assets(route):
    return ([] if route.get('selector') in ('model-targets', 'group-targets') else [route['descriptor']]) + [
        part['descriptor'] for part in route.get('partition', {}).get('parts', [])]


def bind_resource_overlay(spec, city, profile, profile_binding, mounts, contract, verify_asset_bytes=True):
    """Bind one small city-table overlay; the original sealed data site stays read-only."""
    root = Path(spec['root']).resolve()
    manifest_path = checked_path(root, 'asset-manifest.json')
    require(manifest_path.stat().st_size <= RESOURCE_OVERLAY_LIMIT, 'Resource overlay metadata exceeds 32 MiB')
    require(Path(spec['manifest']['path']).absolute() == manifest_path,
            'Resource overlay manifest must be root/asset-manifest.json')
    manifest_binding = check_binding(manifest_path, spec['manifest'])
    manifest = load(manifest_path)
    require(manifest.get('schemaVersion') == 1 and manifest.get('city') == city and
            manifest.get('profileSHA256') == profile_binding['sha256'],
            'Resource overlay city/profile mismatch')
    runtime_path = checked_path(root, 'runtime-table-manifest.json')
    require(runtime_path.stat().st_size <= RESOURCE_OVERLAY_LIMIT, 'Resource overlay metadata exceeds 32 MiB')
    require(runtime_path.stat().st_size <= 500_000, 'City runtime table manifest exceeds 500000-byte publication limit')
    runtime_binding = check_binding(runtime_path, {'sha256': manifest.get('runtimeTableManifestSHA256')})
    assets = manifest.get('assets')
    require(isinstance(assets, list) and all(isinstance(a, dict) and type(a.get('bytes')) is int and
                                           a['bytes'] > 0 for a in assets),
            'Invalid resource overlay asset list')
    total_bytes = sum(a['bytes'] for a in assets)
    require(total_bytes + manifest_binding['bytes'] + runtime_binding['bytes'] <= RESOURCE_OVERLAY_LIMIT,
            'Resource overlay exceeds 32 MiB')
    runtime = load(runtime_path)
    require(isinstance(runtime, list) and all(isinstance(d, dict) for d in runtime),
            'Invalid resource overlay runtime manifest')
    runtime_by_sha = {d.get('sha256'): d for d in runtime}
    require(len(runtime_by_sha) == len(runtime), 'Duplicate resource overlay runtime descriptor')
    require(runtime_by_sha == contract['runtime'], 'Resource overlay active initializer closure mismatch')
    required = {}
    for route in profile['routes']:
        for descriptor in city_route_assets(route):
            require(runtime_by_sha.get(descriptor['sha256']) == descriptor,
                    'Resource overlay runtime/profile descriptor mismatch')
            physical = descriptor.get('transport', descriptor)
            prior = required.setdefault(physical['path'], physical)
            require(prior == physical, 'Conflicting resource overlay physical descriptor')
    resource_mounts = {}
    for asset in assets:
        name = asset.get('path')
        match = PAINT_TABLE_PATH.fullmatch(name) if isinstance(name, str) else None
        require(match and match.group(1) == asset.get('sha256'), 'Unsafe resource overlay asset path')
        route = relative(name[1:])
        source = relative(asset.get('source'))
        require(source == 'assets/' + route, 'Unsafe resource overlay asset source')
        require(route not in resource_mounts and name in required and
                all(asset.get(k) == required[name][k] for k in ('sha256', 'bytes')),
                'Resource overlay asset/profile identity mismatch')
        binding = {key: asset[key] for key in ('sha256', 'bytes')}
        if verify_asset_bytes:
            asset_path = checked_path(root, source)
            require(asset_path.stat().st_size == asset['bytes'], 'Resource overlay asset length mismatch')
            check_binding(asset_path, binding)
        if route in mounts:
            require(all(mounts[route][k] == binding[k] for k in ('sha256', 'bytes')),
                    'Resource overlay conflicts with an existing content-addressed asset')
        resource_mounts[route] = {'root': 'resources', 'path': source, **binding}
    require({'/' + n for n in resource_mounts} == required.keys(),
            'Resource overlay payload closure mismatch')
    resource_mounts['city-data-tables.json'] = {
        'root': 'resources', 'path': 'runtime-table-manifest.json', **runtime_binding}
    removals = manifest.get('removeCanonical')
    require(isinstance(removals, list) and all(isinstance(row, dict) and isinstance(row.get('path'), str)
                                             for row in removals), 'Invalid resource overlay canonical removals')
    require(len({row['path'] for row in removals}) == len(removals) and
            {row['path']: row for row in removals} == contract['removeCanonical'],
            'Resource overlay canonical removal dependency closure mismatch')
    removed_mounts = {}
    for row in removals:
        match = PAINT_TABLE_PATH.fullmatch(row['path'])
        require(match and match.group(1) == row['sha256'], 'Unsafe resource overlay canonical removal')
        name = relative(row['path'][1:])
        require(name not in resource_mounts, 'Resource overlay removes a required selected asset')
        previous = mounts.get(name)
        if previous is not None:
            require(previous['root'] == 'data' and all(previous[k] == row[k] for k in ('sha256', 'bytes')),
                    'Canonical removal differs from original sealed data inventory')
            removed_mounts[name] = previous
    for name in removed_mounts:
        del mounts[name]
    mounts.update(resource_mounts)
    return {'manifest': manifest_binding, 'runtime_table_manifest': runtime_binding,
            'asset_count': len(assets), 'asset_bytes': total_bytes,
            'mounts_sha256': digest(resource_mounts), 'removed_mounts': removed_mounts}


def bind_building_detail(spec, city, profile, mounts, verify_asset_bytes=True, *, _allow_canonical_only=False,
                         variant_leaves_only=None):
    """Bind either a single leaf or an explicitly inventoried city resource tree."""
    if variant_leaves_only is None:
        variant_leaves_only = spec.get('variant_leaves_only', False)
    require(type(variant_leaves_only) is bool and ('variant_leaves_only' not in spec or
            spec['variant_leaves_only'] is variant_leaves_only), 'Conflicting/invalid detail deployment mode')
    root = Path(spec['root']).resolve()
    sidecar_path = checked_path(root, 'detail-variants.json')
    require(Path(spec['manifest']['path']).absolute() == sidecar_path, 'Detail sidecar must be root/detail-variants.json')
    sidecar_binding = check_binding(sidecar_path, spec['manifest'])
    sidecar = load(sidecar_path, DETAIL_MANIFEST_LIMIT)
    if sidecar.get('schema') == 'crimemaps-building-detail-city-v1':
        require(not _allow_canonical_only, 'A city manifest cannot be nested as a leaf')
        return bind_building_detail_city(root, sidecar, sidecar_binding, city, profile, mounts, verify_asset_bytes,
                                        variant_leaves_only=variant_leaves_only)
    require(not variant_leaves_only, 'Variant-only deployment requires a full city proof')
    require(sidecar_binding['bytes'] <= 500_000, 'Detail leaf metadata exceeds 500000 bytes')
    require(sidecar.get('schema') == 'crimemaps-building-detail-replacement-v1' and
            sidecar.get('schemaVersion') == 1 and sidecar.get('city') == city, 'Wrong detail sidecar city/schema')

    def descriptor(value, label, detail=False):
        require(isinstance(value, dict) and isinstance(value.get('path'), str) and
                SHA.fullmatch(value.get('sha256', '')) and type(value.get('bytes')) is int and value['bytes'] > 0,
                f'Invalid {label} descriptor')
        name = relative(value['path'].removeprefix('/'))
        require(value['path'].startswith('/safety/buildings3d/') and
                (not detail or DETAIL_PATH.fullmatch(value['path'])), f'Unsafe {label} path')
        return name

    demand_descriptor = sidecar.get('demandIndex')
    demand_name = descriptor(demand_descriptor, 'detail demand', True)
    require(Path(demand_name).name == f"demand-{demand_descriptor['sha256']}.json" and
            demand_descriptor['bytes'] <= 500_000, 'Invalid detail demand filename/metadata bound')
    demand_file = checked_path(root, Path(demand_name).name)
    check_binding(demand_file, demand_descriptor)
    demand = load(demand_file, 500_000)
    require(demand.get('schema') == 'crimemaps-building-detail-demand-v1' and
            demand.get('schemaVersion') == 1 and demand.get('city') == city, 'Wrong detail demand city/schema')
    require(demand.get('bindings') == sidecar.get('bindings'), 'Detail demand/source binding mismatch')
    canonical_assets = {}
    for field, expected in [('canonicalIndex', sidecar['provenance']['canonicalIndex']),
                            ('canonicalLeaf', sidecar['canonicalLeaf'])]:
        value = demand[field]
        name = descriptor(value, field)
        require(all(value.get(key) == expected.get(key) for key in ('path', 'sha256', 'bytes')),
                f'Detail {field} differs from producer source')
        original = mounts.get(name)
        require(original is not None and original['root'] == 'data' and
                all(original[key] == value[key] for key in ('sha256', 'bytes')),
                f'Detail {field} is absent from the original sealed data mount')
        canonical_assets[name] = {key: value[key] for key in ('sha256', 'bytes')}
    leaf = demand['canonicalLeaf']
    require(isinstance(leaf.get('id'), str) and leaf['id'] == sidecar['canonicalLeaf'].get('id'),
            'Detail canonical leaf identity mismatch')
    require(all(demand['near']['asset'].get(key) == leaf.get(key) for key in ('path', 'sha256', 'bytes')),
            'Near detail must reference the unchanged canonical leaf')
    variants = demand.get('variants')
    require(isinstance(variants, list) and len(variants) <= 2 and (variants or _allow_canonical_only),
            'Detail candidate has no complete replacement')
    complete = [row for row in sidecar['variants'] if row.get('status') == 'complete-replacement']
    declared = {row['level']: row for row in complete}
    require(len(complete) == len(declared) == len(variants) and len({row['level'] for row in variants}) == len(variants),
            'Detail sidecar/demand variant closure mismatch')
    detail_mounts = {demand_name: {'root': 'details', 'path': demand_file.name,
                                 'sha256': demand_descriptor['sha256'], 'bytes': demand_descriptor['bytes']}}
    group_metadata = demand.get('groupMetadata')
    require(group_metadata == sidecar.get('groupMetadata'), 'Detail packing group binding mismatch')
    require(not _allow_canonical_only or group_metadata is not None, 'City leaf lacks packing group authority')
    if group_metadata is not None:
        group_name = descriptor(group_metadata, 'detail packing groups', True)
        compressed = group_metadata.get('compression') == 'gzip'
        require(group_metadata.get('compression') in (None, 'gzip') and
                Path(group_name).name == f"groups-{group_metadata['sha256']}.json" + ('.gz' if compressed else '') and
                group_metadata['bytes'] <= 500_000, 'Invalid detail packing group filename/metadata bound')
        if compressed:
            require(type(group_metadata.get('uncompressed_bytes')) is int and 0 < group_metadata['uncompressed_bytes'] <= 8 * 1024 ** 2 and
                    isinstance(group_metadata.get('uncompressed_sha256'), str) and SHA.fullmatch(group_metadata['uncompressed_sha256']),
                    'Invalid bounded compressed packing group metadata')
        else:
            require('uncompressed_bytes' not in group_metadata and 'uncompressed_sha256' not in group_metadata,
                    'Uncompressed packing groups have unexpected inflate metadata')
        group_file = checked_path(root, Path(group_name).name)
        check_binding(group_file, group_metadata)
        require(group_name not in detail_mounts, 'Duplicate detail group route')
        detail_mounts[group_name] = {'root': 'details', 'path': group_file.name,
                                    'sha256': group_metadata['sha256'], 'bytes': group_metadata['bytes']}
    for row in variants:
        level, asset = row['level'], row['asset']
        require(level in ('mid', 'coarse') and level in declared and asset == declared[level]['asset'] and
                row['geometrySHA256'] == declared[level]['geometrySHA256'], 'Detail replacement binding mismatch')
        name = descriptor(asset, 'detail replacement', True)
        require(Path(name).name == f"{level}-{asset['sha256']}.json.gz" and asset.get('compression') == 'gzip' and
                SHA.fullmatch(asset.get('uncompressed_sha256', '')) and type(asset.get('uncompressed_bytes')) is int and
                0 < asset['uncompressed_bytes'] <= 64 * 1024 ** 2, 'Invalid detail replacement transport')
        require(name not in detail_mounts, 'Duplicate detail asset route')
        file = checked_path(root, Path(name).name)
        if verify_asset_bytes:
            check_binding(file, asset)
        detail_mounts[name] = {'root': 'details', 'path': file.name, 'sha256': asset['sha256'], 'bytes': asset['bytes']}
    require(sum(row['bytes'] for row in detail_mounts.values()) + sidecar_binding['bytes'] <= RESOURCE_OVERLAY_LIMIT,
            'Detail asset overlay exceeds 32 MiB')
    require(not (detail_mounts.keys() & mounts.keys()), 'Detail asset conflicts with an existing sealed route')
    coverage = sidecar['protection']['coverage']
    admissions = [row for row in profile['routes'] if row['file'] == 'painted/city/safety/progressive-paint-admissions.ts']
    require(len(admissions) == 1 and coverage.get('completeForCity') is True and coverage.get('city') == city and
            coverage.get('canonicalSHA256') == admissions[0]['canonicalSHA256'] and
            coverage.get('selectedSHA256') == admissions[0]['descriptor']['sha256'] and
            coverage.get('retainedCount') == admissions[0]['retainedCount'], 'Detail protection admission binding changed')
    source_files = {}
    evidence = [*sidecar['producer']['files'], *sidecar['protection']['evidence']]
    for row in evidence:
        name = row.get('path', '')
        if name.startswith(('web/src/', 'scripts/render/')):
            relative(name)
            require(SHA.fullmatch(row.get('sha256', '')), 'Invalid detail source evidence')
            binding = {key: row[key] for key in ('sha256', 'bytes') if key in row}
            require(name not in source_files or source_files[name] == binding, 'Conflicting detail source evidence')
            source_files[name] = binding
        else:
            require(name == 'city-data-profile.json' or name.startswith('/safety/buildings3d/painted-tables/'),
                    'Unexpected detail protection evidence source')
    require(source_files and sidecar['producer']['files'], 'Missing detail producer/source evidence')
    catalog = {'schema': 'crimemaps-building-detail-catalog-v1', 'schemaVersion': 1, 'city': city,
               'entries': [{'canonicalIndexSHA256': demand['canonicalIndex']['sha256'],
                            'canonicalLeafSHA256': leaf['sha256'], 'leafId': leaf['id'],
                            'demandIndex': {key: demand_descriptor[key] for key in ('path', 'sha256', 'bytes')}}]}
    if group_metadata is not None:
        catalog['entries'][0]['groupMetadata'] = group_metadata
    catalog_bytes = canonical(catalog) + b'\n'
    require(len(catalog_bytes) <= 100_000, 'Building detail catalog exceeds 100000 bytes')
    mounts.update(detail_mounts)
    return {'manifest': sidecar_binding, 'catalog': {'sha256': hashlib.sha256(catalog_bytes).hexdigest(), 'bytes': len(catalog_bytes)},
            'source_files': source_files, 'canonical_assets': canonical_assets, 'asset_count': len(detail_mounts),
            'asset_bytes': sum(row['bytes'] for row in detail_mounts.values()), 'mounts_sha256': digest(detail_mounts)}, catalog_bytes


def bind_building_detail_city(root, manifest, manifest_binding, city, profile, mounts, verify_asset_bytes,
                              *, variant_leaves_only=False):
    """Keep per-leaf provenance gates and mount only the city catalog's closure.

    Source files are relative to this city root, independently of public routes.
    Only bounded metadata is decoded; model payload validation stays in the
    existing leaf binding and the ordinary sealed-asset access path.
    """
    require(manifest.get('schemaVersion') == 1 and manifest.get('city') == city,
            'Wrong detail city manifest identity')
    require(type(variant_leaves_only) is bool, 'Variant-only deployment flag must be boolean')
    # All leaves still pass the original provenance/resource checks. In the
    # economy runtime, canonical-only leaves already return to the native path;
    # their unused LOD metadata remains private proof, not a public asset.
    proof_limit = DETAIL_PRIVATE_PROOF_LIMIT if variant_leaves_only else DETAIL_CITY_LIMIT
    rows = manifest.get('resources')
    require(isinstance(rows, list) and 0 < len(rows) <= 100_000, 'Invalid city detail resource inventory')
    inventory, paths = {}, set()
    total_bytes = manifest_binding['bytes']
    route_prefix = f'/safety/buildings3d/detail-variants/{city}/'

    def descriptor(value, label):
        require(isinstance(value, dict) and isinstance(value.get('path'), str) and
                value['path'].startswith(route_prefix) and DETAIL_PATH.fullmatch(value['path']) and
                isinstance(value.get('sha256'), str) and SHA.fullmatch(value['sha256']) and
                type(value.get('bytes')) is int and value['bytes'] > 0, f'Invalid {label} descriptor')
        return relative(value['path'][1:])

    for row in rows:
        name = descriptor(row, 'city detail inventory')
        source = relative(row.get('source'))
        require(name not in inventory and source not in paths, 'Duplicate city detail resource route/source')
        file = checked_path(root, source)
        require(file.stat().st_size == row['bytes'], 'City detail resource length changed')
        inventory[name] = {'root': 'details', 'path': source, 'sha256': row['sha256'], 'bytes': row['bytes']}
        paths.add(source)
        total_bytes += row['bytes']
    require(total_bytes <= proof_limit, 'City detail overlay exceeds 512 MiB' if not variant_leaves_only
            else 'City detail private proof exceeds 2 GiB')
    require(not (inventory.keys() & mounts.keys()), 'City detail route conflicts with sealed data')
    used = set()

    def metadata(value, label, prefix, limit):
        name = descriptor(value, label)
        mounted = inventory.get(name)
        require(mounted is not None and all(mounted[key] == value[key] for key in ('sha256', 'bytes')) and
                value['bytes'] <= limit and Path(name).name == f"{prefix}-{value['sha256']}.json",
                f'{label} is not a bounded inventoried resource')
        file = checked_path(root, mounted['path'])
        check_binding(file, value)
        used.add(name)
        return file, load(file, limit)

    catalog_file, catalog = metadata(manifest.get('catalog'), 'City detail catalog', 'catalog', 100_000)
    require(catalog.get('schema') == 'crimemaps-building-detail-catalog-v2' and
            catalog.get('schemaVersion') == 2 and catalog.get('city') == city,
            'Wrong city detail catalog identity')
    pages = catalog.get('pages')
    require(isinstance(pages, list) and len(pages) <= 256, 'Invalid city detail catalog pages')
    catalog_entries, prefixes = {}, set()

    def identity(entry):
        require(isinstance(entry, dict) and isinstance(entry.get('leafId'), str) and 0 < len(entry['leafId']) <= 512 and
                all(isinstance(entry.get(key), str) and SHA.fullmatch(entry[key])
                    for key in ('canonicalIndexSHA256', 'canonicalLeafSHA256')), 'Invalid city detail leaf identity')
        return (entry['canonicalIndexSHA256'], entry['canonicalLeafSHA256'], entry['leafId'])

    for page in pages:
        require(isinstance(page, dict) and isinstance(page.get('prefix'), str) and
                re.fullmatch(r'[a-f0-9]{2}', page['prefix']) and page['prefix'] not in prefixes,
                'Invalid or repeated detail catalog prefix')
        prefixes.add(page['prefix'])
        _, value = metadata(page.get('asset'), 'City detail page', 'catalog', 100_000)
        require(value.get('schema') == 'crimemaps-building-detail-catalog-page-v1' and
                value.get('schemaVersion') == 1 and value.get('city') == city and
                value.get('prefix') == page['prefix'] and isinstance(value.get('entries'), list) and value['entries'],
                'Wrong city detail catalog page identity')
        for entry in value['entries']:
            key = identity(entry)
            encoded_key = json.dumps(key, separators=(',', ':'), ensure_ascii=False).encode()
            require(key not in catalog_entries and hashlib.sha256(encoded_key).hexdigest()[:2] == page['prefix'],
                    'Duplicated or incorrectly bucketed city detail leaf')
            catalog_entries[key] = entry
    entries = manifest.get('entries')
    require(isinstance(entries, list) and len(entries) <= 100_000 and
            type(catalog.get('entryCount')) is int and catalog['entryCount'] == len(catalog_entries) == len(entries),
            'City detail manifest/catalog entry count mismatch')
    source = manifest.get('source')
    require(isinstance(source, dict) and isinstance(source.get('producerFiles'), list) and source['producerFiles'] and
            isinstance(source.get('libraries'), list) and
            digest({'files': source['producerFiles'], 'libraries': source['libraries']}) == source.get('producerSHA256') and
            isinstance(source.get('sourceContextSHA256'), str) and SHA.fullmatch(source['sourceContextSHA256']),
            'Missing city detail producer/context binding')
    source_catalog = source.get('catalog')
    require(isinstance(source_catalog, dict) and isinstance(source_catalog.get('sha256'), str) and
            SHA.fullmatch(source_catalog['sha256']) and type(source_catalog.get('bytes')) is int and source_catalog['bytes'] > 0,
            'Invalid city detail source catalog binding')
    canonical_index = source.get('canonicalIndex')
    require(isinstance(canonical_index, dict), 'Missing city detail canonical index')
    index_name = relative(canonical_index.get('path', '').removeprefix('/'))
    original_index = mounts.get(index_name)
    require(original_index is not None and original_index['root'] == 'data' and
            all(original_index[key] == canonical_index.get(key) for key in ('sha256', 'bytes')),
            'City detail canonical index differs from sealed data')
    source_files, canonical_assets, identities = {}, {}, set()

    def merge(target, values, label):
        for name, value in values.items():
            previous = target.get(name, {})
            require(all(key not in previous or previous[key] == binding for key, binding in value.items()),
                    f'Conflicting city detail {label}: {name}')
            target[name] = {**previous, **value}

    for row in source['producerFiles']:
        name = relative(row.get('path'))
        require(isinstance(row.get('sha256'), str) and SHA.fullmatch(row['sha256']) and
                type(row.get('bytes')) is int and row['bytes'] > 0, 'Invalid city producer source binding')
        require(name.startswith(('web/src/', 'scripts/render/')), 'Unexpected city producer source path')
        merge(source_files, {name: {key: row[key] for key in ('sha256', 'bytes')}}, 'producer source')
    library_paths = set()
    for row in source['libraries']:
        require(isinstance(row, dict) and isinstance(row.get('sha256'), str) and SHA.fullmatch(row['sha256']) and
                type(row.get('bytes')) is int and row['bytes'] > 0 and row.get('path') not in library_paths and
                row.get('package') == 'meshoptimizer' and row.get('version') == '1.3.0',
                'Invalid city producer library binding')
        library_paths.add(row['path'])
    require(library_paths == {'meshopt_simplifier.js', 'meshopt_encoder.js', 'meshopt_decoder.mjs'},
            'Incomplete city producer library bindings')
    variant_leaves, variant_count = 0, 0
    runtime_entries, runtime_names = [], set()
    for entry in entries:
        key = identity(entry)
        require(key not in identities and key in catalog_entries and key[0] == canonical_index['sha256'],
                'City completed leaf is duplicated, unlisted or from another canonical index')
        identities.add(key)
        catalog_entry = catalog_entries[key]
        require(all(entry.get(field) == catalog_entry.get(field) for field in ('demandIndex', 'groupMetadata')),
                'City detail manifest/catalog resource binding mismatch')
        leaf_descriptor = entry.get('leafManifest')
        require(isinstance(leaf_descriptor, dict) and type(leaf_descriptor.get('bytes')) is int and
                0 < leaf_descriptor['bytes'] <= 500_000, 'Invalid city detail leaf manifest bound')
        leaf_file = checked_path(root, relative(leaf_descriptor.get('file')))
        require(leaf_file.name == 'detail-variants.json' and leaf_file.parent != root and
                leaf_descriptor['file'] not in paths, 'Invalid or duplicated city leaf manifest path')
        paths.add(leaf_descriptor['file'])
        total_bytes += leaf_descriptor['bytes']
        require(total_bytes <= proof_limit, 'City detail assets and leaf manifests exceed 512 MiB'
                if not variant_leaves_only else 'City detail private proof exceeds 2 GiB')
        # Reuse the original source, protection, near-canonical and complete
        # replacement checks. Each iteration only adds this leaf's mounts.
        leaf_mounts = ChainMap({}, mounts)
        leaf_core, leaf_catalog_bytes = bind_building_detail(
            {'root': str(leaf_file.parent), 'manifest': {'path': str(leaf_file), **leaf_descriptor}},
            city, profile, leaf_mounts, verify_asset_bytes, _allow_canonical_only=True)
        leaf_entry = json.loads(leaf_catalog_bytes)['entries'][0]
        require(identity(leaf_entry) == key and all(leaf_entry.get(field) == entry.get(field)
                for field in ('demandIndex', 'groupMetadata')), 'City leaf sidecar/catalog authority mismatch')
        for name, mounted in leaf_mounts.maps[0].items():
            relative_source = (leaf_file.parent / mounted['path']).relative_to(root).as_posix()
            expected = {**mounted, 'path': relative_source}
            require(inventory.get(name) == expected, 'City leaf resource differs from explicit city inventory')
            used.add(name)
        merge(source_files, leaf_core['source_files'], 'source evidence')
        merge(canonical_assets, leaf_core['canonical_assets'], 'canonical authority')
        demand_path = checked_path(root, inventory[relative(entry['demandIndex']['path'][1:])]['path'])
        demand = load(demand_path, 500_000)
        variants = [{field: variant.get(field) for field in ('level', 'geometrySHA256', 'encoding', 'decodedBytes')}
                    for variant in demand['variants']]
        require(entry.get('variants') == variants and type(entry.get('canonicalOnly')) is bool and
                entry['canonicalOnly'] == (not variants), 'City leaf actual variants/canonical-only mismatch')
        variant_leaves += bool(variants)
        variant_count += len(variants)
        if variants:
            runtime_entries.append(leaf_entry)
            runtime_names.update(leaf_mounts.maps[0])
    require(identities == catalog_entries.keys() and used == inventory.keys(), 'City detail resource closure mismatch')
    summary = manifest.get('summary')
    count_fields = ('discoveredLeaves', 'completedLeaves', 'failedLeaves', 'pendingLeaves',
                    'distinctVariantLeaves', 'canonicalOnlyLeaves')
    require(isinstance(summary, dict) and all(type(summary.get(key)) is int and summary[key] >= 0 for key in count_fields) and
            summary['completedLeaves'] == len(entries) and summary['distinctVariantLeaves'] == variant_leaves and
            summary['canonicalOnlyLeaves'] == len(entries) - variant_leaves and
            summary['discoveredLeaves'] == sum(summary[key] for key in ('completedLeaves', 'failedLeaves', 'pendingLeaves')),
            'City detail coverage counts contradict actual resources')
    require(manifest.get('status') == ('partial' if summary['failedLeaves'] or summary['pendingLeaves'] else 'complete'),
            'City detail coverage status contradicts remaining leaves')
    catalog_bytes = catalog_file.read_bytes()
    deployed = inventory
    deployment = {}
    if variant_leaves_only:
        # Reuse the existing bounded v1 runtime format. No source model, demand
        # index, replacement payload or original production receipt is changed.
        runtime_entries.sort(key=lambda row: identity(row))
        catalog_bytes = canonical({'schema': 'crimemaps-building-detail-catalog-v1',
            'schemaVersion': 1, 'city': city, 'entries': runtime_entries}) + b'\n'
        require(len(catalog_bytes) <= 100_000, 'Variant-only runtime catalog exceeds 100000 bytes')
        deployed = {name: inventory[name] for name in sorted(runtime_names)}
        require(sum(row['bytes'] for row in deployed.values()) + len(catalog_bytes) <= DETAIL_CITY_LIMIT,
                'City detail deployed overlay exceeds 512 MiB')
        deployment = {'deployment': {'mode': 'variant-leaves-only',
            'runtime_entries': len(runtime_entries), 'validated_leaves': len(entries),
            'private_proof_bytes': total_bytes, 'private_proof_resources': len(inventory),
            'omitted_unused_resources': len(inventory) - len(deployed),
            'original_catalog': manifest['catalog'], 'canonical_only_uses_native_path': True}}
    mounts.update(deployed)
    return {'manifest': manifest_binding, 'catalog': {'sha256': hashlib.sha256(catalog_bytes).hexdigest(),
                                                    'bytes': len(catalog_bytes)},
            'source_files': source_files, 'canonical_assets': canonical_assets, 'asset_count': len(deployed),
            'asset_bytes': sum(row['bytes'] for row in deployed.values()), 'mounts_sha256': digest(deployed),
            'manifest_schema': manifest['schema'], 'status': manifest['status'], 'leaf_counts': {key: summary[key] for key in count_fields},
            'replacement_levels': variant_count, **deployment}, catalog_bytes


def inputs(spec):
    require(spec.get('schema_version') == VERSION and spec.get('city') in CITIES, 'Invalid city/schema')
    city = spec['city']; prefix = '/crimemaps-' + city.capitalize() + '/'
    commit = spec['commit']; repo = Path(spec['repo']).resolve()
    require(re.fullmatch(r'[a-f0-9]{40}', commit), 'An explicit full commit is required')
    require(git(repo, 'rev-parse', f'{commit}^{{commit}}').decode().strip() == commit, 'Commit unavailable')
    profile = Path(spec['profile']['path']).resolve()
    profile_binding = check_binding(profile, spec['profile'])
    value = load(profile, 100_000)
    source_profile, profile_source_bindings = source_profile_bindings(repo, commit)
    contract = profile_resource_contract(value, source_profile['dependencies'], source_profile['manifest'], city)
    overrides = spec['overrides']; root = Path(overrides['root']).resolve()
    require(set(overrides['files']) == set(CITY_FILES), 'Exactly five city override files are required')
    bindings = {name: check_binding(checked_path(root, name), overrides['files'][name]) for name in CITY_FILES}
    config = load(root / 'city-config.json')
    require(config.get('city') == city and config.get('base_path') == prefix and
            config.get('repository') == prefix.strip('/'), 'Wrong city override config')
    env_path = Path(spec['build_environment']['path']).resolve()
    env_binding = check_binding(env_path, spec['build_environment'])
    envs = load(env_path); envs = envs.get(city, envs)
    env = {k: v for k, v in envs.items() if k.startswith('VITE_')}
    require(all(isinstance(v, str) and '\0' not in v for v in env.values()), 'Invalid build environment')
    require(json.loads(env.get('VITE_DATED_STATISTICS_BINDING', '{}')).get('city') == city,
            'Wrong statistics city environment')
    env.update(VITE_BASE_PATH=prefix, CRIMEMAPS_BUILD_PURPOSE='publication',
               CRIMEMAPS_CITY_PROFILE=str(profile))
    data = spec['data']; data_root = Path(data['root']).resolve()
    inventory_path = Path(data['inventory']['path']).resolve()
    inventory_binding = check_binding(inventory_path, data['inventory'])
    inventory = load(inventory_path)['files']
    require(isinstance(inventory, dict) and len(inventory) <= 100_000, 'Invalid data inventory')
    for name, item in inventory.items():
        relative(name)
        require(isinstance(item, dict) and SHA.fullmatch(item.get('sha256', '')) and
                type(item.get('bytes')) is int and item['bytes'] >= 0, 'Invalid inventory descriptor')
    prefixes = [relative(p, directory=True) + '/' for p in data['prefixes']]
    exact = {relative(p) for p in data.get('files', [])}
    require(prefixes and len(set(prefixes)) == len(prefixes) and
            all(not p.startswith('__render__/') for p in prefixes), 'Invalid data mount prefix')
    require(all(any(n.startswith(p) for n in inventory) for p in prefixes), 'Empty data mount prefix')
    require(exact <= inventory.keys(), 'Declared exact data file is absent from inventory')
    selected = {n: {'root': 'data', 'path': n, 'sha256': v['sha256'], 'bytes': v['bytes']}
                for n, v in inventory.items() if n in exact or any(n.startswith(p) for p in prefixes)}
    require('safety/manifest.json' in selected, 'Safety manifest must be mounted')
    manifest_path = checked_path(data_root, 'safety/manifest.json')
    check_binding(manifest_path, selected['safety/manifest.json'])
    native = {'munich': 'München', 'cologne': 'Köln', 'dusseldorf': 'Düsseldorf', 'nuremberg': 'Nürnberg'}
    require(load(manifest_path).get('city', '').lower() in {city, native.get(city, city).lower()},
            'Wrong data manifest city')
    overlay = bind_resource_overlay(spec['resource_overlay'], city, value, profile_binding, selected, contract) \
        if 'resource_overlay' in spec else None
    if overlay is None and value['selectorVersion'] == 'city-data-v2':
        require('city-data-tables.json' in selected, 'V2 city runtime manifest must be explicitly mounted')
        runtime_file = checked_path(data_root, selected['city-data-tables.json']['path'])
        check_binding(runtime_file, selected['city-data-tables.json'])
        runtime = load(runtime_file, 500_000)
        require(isinstance(runtime, list) and len({d['sha256'] for d in runtime}) == len(runtime) and
                {d['sha256']: d for d in runtime} == contract['runtime'],
                'V2 mounted runtime active initializer closure mismatch')
        for route in value['routes']:
            for descriptor in city_route_assets(route):
                physical = descriptor.get('transport', descriptor)
                mount = selected.get(physical['path'][1:])
                require(mount is not None and all(mount[key] == physical[key] for key in ('sha256', 'bytes')),
                        'V2 profile resource missing from sealed data inventory')
        require(all(name.lstrip('/') not in selected for name in contract['removeCanonical']),
                'V2 sealed data inventory still serves an excluded canonical resource')
    data_mounts_sha256 = digest(selected)
    detail = None
    if 'building_detail' in spec:
        detail, _ = bind_building_detail(spec['building_detail'], city, value, selected)
        for name, binding in detail['source_files'].items():
            source = git(repo, 'show', f'{commit}:{name}')
            require(hashlib.sha256(source).hexdigest() == binding['sha256'] and
                    ('bytes' not in binding or len(source) == binding['bytes']),
                    f'Detail evidence differs from candidate source commit: {name}')
    routes = spec['frontend_routes']
    require(isinstance(routes, list) and routes and len(set(routes)) == len(routes) and
            set(routes) <= {'', 'index.html', 'map', 'map/', 'map/index.html'}, 'Invalid frontend routes')
    if city == 'berlin':
        require('' not in routes and 'index.html' not in routes and 'index.html' in selected,
                'Berlin portal must be explicitly mounted from its sealed data site')
    core = {'schema_version': VERSION, 'city': city, 'prefix': prefix, 'commit': commit,
            'profile': profile_binding, 'overrides': bindings, 'environment_input': env_binding,
            'environment': {k: v for k, v in env.items() if k != 'CRIMEMAPS_CITY_PROFILE'},
            'data_inventory': inventory_binding, 'data_prefixes': prefixes, 'data_files': sorted(exact),
            'frontend_routes': routes, 'tool_sha256': sha(Path(__file__)),
            'profile_source': profile_source_bindings, 'profile_contract_tool_sha256': sha(PROFILE_CONTRACT_TOOL)}
    if overlay is not None:
        core['resource_overlay'] = overlay
        core['data_mounts_sha256'] = data_mounts_sha256
    if detail is not None:
        core['building_detail'] = detail
    return core, repo, root, profile, env, data_root, selected


def freeze_inputs(args):
    """Pin explicitly selected local inputs; does not scan or adopt the data site."""
    require(not args.out.exists(), 'Refusing existing input descriptor')
    inventory = {'path': str(args.data_inventory.resolve()), 'sha256': args.data_inventory_sha256}
    check_binding(args.data_inventory, inventory)
    routes = args.frontend_route
    if not routes:
        routes = ['map', 'map/', 'map/index.html']
        if args.city != 'berlin':
            routes = ['', 'index.html', *routes]
    spec = {'schema_version': VERSION, 'repo': str(args.repo.resolve()), 'commit': args.commit,
            'city': args.city, 'profile': {'path': str(args.profile.resolve()), **file_binding(args.profile)},
            'overrides': {'root': str(args.overrides_root.resolve()),
                          'files': {p: file_binding(checked_path(args.overrides_root, p)) for p in CITY_FILES}},
            'build_environment': {'path': str(args.build_environment.resolve()),
                                  **file_binding(args.build_environment)},
            'data': {'root': str(args.data_root.resolve()), 'inventory': inventory,
                     'prefixes': args.data_prefix, 'files': args.data_file}, 'frontend_routes': routes}
    if getattr(args, 'resource_overlay_root', None) is not None:
        resource_root = args.resource_overlay_root.resolve()
        manifest = checked_path(resource_root, 'asset-manifest.json')
        spec['resource_overlay'] = {'root': str(resource_root),
                                    'manifest': {'path': str(manifest), **file_binding(manifest)}}
    if getattr(args, 'building_detail_root', None) is not None:
        detail_root = args.building_detail_root.resolve()
        manifest = checked_path(detail_root, 'detail-variants.json')
        spec['building_detail'] = {'root': str(detail_root),
                                   'manifest': {'path': str(manifest), **file_binding(manifest)}}
    inputs(spec)
    save(args.out, spec)
    return {'stage': 'inputs', 'status': 'pinned', 'input_descriptor': file_binding(args.out)}


def storage_preflight(out, repo, commit, building, bounded=False):
    """Budget new candidate writes without copying or scanning the data mount."""
    if building:
        records = git(repo, 'ls-tree', '-r', '-l', '-z', commit).split(b'\0')
        sizes = [int(row.split(b'\t', 1)[0].split()[3]) for row in records
                 if row and row.split(b'\t', 1)[0].split()[1] == b'blob']
        # Budget archive + extracted source conservatively, plus dist/build scratch.
        estimated = 2 * sum((size + 4095) // 4096 * 4096 for size in sizes) + GIB
        reserve = BOUNDED_BUILD_RESERVE if bounded else BUILD_FREE_RESERVE
    else:
        # Binding an existing dist writes only bounded manifests; no source/data copy.
        estimated, reserve = 64 * 1024 ** 2, 256 * 1024 ** 2
    free = shutil.disk_usage(out).free
    require(not bounded or building, 'Bounded build mode requires a real build')
    passed = free >= reserve + estimated and (not bounded or estimated <= BOUNDED_BUILD_LIMIT)
    save(out / 'storage-budget.json', {'schema_version': VERSION,
         'status': 'within-budget' if passed else 'insufficient-space',
         'free_bytes': free, 'reserve_bytes': reserve, 'estimated_growth_bytes': estimated,
         'mode': 'bounded-diagnostic-build' if bounded else 'default',
         'candidate_limit_bytes': BOUNDED_BUILD_LIMIT if bounded else None,
         'estimate_is_not_a_filesystem_reservation': True})
    require(passed, f'Insufficient disk space: {free / GIB:.2f} GiB free; '
            f'need {reserve / GIB:.2f} GiB reserve + {estimated / GIB:.2f} GiB estimated growth. '
            'No archive or build started; reuse an existing candidate or reclaim verified redundant files.')


def check_build_storage(out):
    """Count only this candidate, never follow dependency/data links."""
    require(not (out / 'candidate.json').exists(), 'Cannot monitor a sealed candidate')
    allocated = 0
    for root, dirs, files in os.walk(out, followlinks=False):
        for name in [*dirs, *files]:
            path = Path(root) / name
            try:
                if not path.is_symlink():
                    allocated += path.stat().st_blocks * 512
            except FileNotFoundError:  # A build may replace its own temporary file.
                continue
    free = shutil.disk_usage(out).free
    passed = free >= BOUNDED_BUILD_RESERVE and allocated <= BOUNDED_BUILD_LIMIT
    result = {'schema_version': VERSION,
         'status': 'within-budget' if passed else 'insufficient-space',
         'free_bytes': free, 'candidate_allocated_bytes': allocated,
         'reserve_bytes': BOUNDED_BUILD_RESERVE, 'candidate_limit_bytes': BOUNDED_BUILD_LIMIT,
         'poll_interval_seconds': 2, 'atomic_filesystem_quota': False}
    # The sole live receipt is replaced until the candidate is sealed; retain no
    # unbounded time series. Other stage receipts continue to be write-once.
    temporary = out / '.storage-monitor.tmp'
    temporary.write_bytes(canonical(result) + b'\n')
    temporary.replace(out / 'storage-monitor.json')
    require(passed, 'Bounded build storage limit reached; build process group stopped')


def bounded_build(command, out, timeout, **kwargs):
    check_build_storage(out)
    started = time.monotonic()
    process = subprocess.Popen(command, start_new_session=True, **kwargs)
    try:
        while process.poll() is None:
            check_build_storage(out)
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                raise subprocess.TimeoutExpired(command, timeout)
            try:
                process.wait(timeout=min(2, remaining))
            except subprocess.TimeoutExpired:
                pass
        if process.returncode:
            raise subprocess.CalledProcessError(process.returncode, command)
        check_build_storage(out)
    except BaseException:
        # npm launches children; stopping only npm can leave Vite writing to disk.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        raise


def archive(repo, commit, out):
    archive_path = out / 'source.tar.gz'
    with archive_path.open('xb') as stream:
        subprocess.run(['git', '-C', str(repo), 'archive', '--format=tar.gz', commit],
                       stdout=stream, check=True)
    source = out / 'source'; source.mkdir()
    with tarfile.open(archive_path) as tar:
        members = tar.getmembers()
        for member in members:
            relative(member.name.rstrip('/'))
            require(member.isfile() or member.isdir(), 'Archive links/special files are forbidden')
        tar.extractall(source, members=members, filter='data')
    return source, {'path': archive_path.name, 'format': 'tar.gz', **file_binding(archive_path)}


def create(spec_path, out, dist=None, node_modules=None, timeout=900, bounded=False):
    out = Path(out).absolute()
    out.mkdir(parents=True, exist_ok=False)
    try:
        spec = load(spec_path); core, repo, overrides, profile, env, data_root, mounts = inputs(spec)
        storage_preflight(out, repo, core['commit'], dist is None, bounded)
        recipe = {'core': core, 'recipe_id': digest(core), 'input_descriptor': file_binding(spec_path)}
        save(out / 'recipe.json', recipe)
        snapshot = out / 'bindings/city-data-profile.json'
        snapshot.parent.mkdir()
        shutil.copyfile(profile, snapshot)
        check_binding(snapshot, core['profile'])
        for name, file in PROFILE_SOURCE_FILES.items():
            target = out / 'bindings' / f'profile-source-{name}.json'
            with target.open('xb') as stream:
                stream.write(git(repo, 'show', f"{core['commit']}:{file}"))
            check_binding(target, core['profile_source'][name])
        resource_root = None
        if 'resource_overlay' in core:
            resource_root = Path(spec['resource_overlay']['root']).resolve()
            for source_name, snapshot_name, binding_name in (
                    ('asset-manifest.json', 'resource-asset-manifest.json', 'manifest'),
                    ('runtime-table-manifest.json', 'resource-runtime-table-manifest.json', 'runtime_table_manifest')):
                target = out / 'bindings' / snapshot_name
                shutil.copyfile(checked_path(resource_root, source_name), target)
                check_binding(target, core['resource_overlay'][binding_name])
        detail_root = None
        if 'building_detail' in core:
            detail_root = Path(spec['building_detail']['root']).resolve()
            detail_mount_base = {name: item for name, item in mounts.items() if item['root'] != 'details'}
            rebound, catalog = bind_building_detail(spec['building_detail'], core['city'], load(snapshot, 100_000),
                                                   detail_mount_base, verify_asset_bytes=False)
            require(rebound == core['building_detail'], 'Detail inputs changed before snapshot')
            detail_snapshot = out / 'bindings/building-detail-catalog.json'
            detail_snapshot.write_bytes(catalog)
            check_binding(detail_snapshot, core['building_detail']['catalog'])
            sidecar_snapshot = out / 'bindings/building-detail-sidecar.json'
            shutil.copyfile(checked_path(detail_root, 'detail-variants.json'), sidecar_snapshot)
            check_binding(sidecar_snapshot, core['building_detail']['manifest'])
            env['CRIMEMAPS_BUILDING_DETAIL_CATALOG'] = str(detail_snapshot)
        env['CRIMEMAPS_CITY_PROFILE'] = str(snapshot)
        require('city-data-profile.json' not in mounts, 'Profile has two mount owners')
        mounts['city-data-profile.json'] = {'root': 'candidate', 'path': 'bindings/city-data-profile.json',
                                          **core['profile']}
        build_status = 'bound-existing-dist-build-unverified'
        build_evidence = {'status': build_status, 'source_commit_binding': 'declared-not-proven-for-dist'}
        if dist is None:
            require(node_modules is not None, 'Build requires explicit existing node_modules')
            source, archive_binding = archive(repo, core['commit'], out)
            for name in CITY_FILES:
                target = source / name; target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(checked_path(overrides, name), target)
                check_binding(target, core['overrides'][name])
            source_manifest = tree(source)
            dependencies = Path(node_modules).resolve()
            require(dependencies.is_dir(), 'Dependency install missing')
            lock = source / 'web/package-lock.json'
            require(sha(dependencies.parent / 'package-lock.json') == sha(lock), 'Dependency lock differs')
            install_lock = file_binding(dependencies / '.package-lock.json')
            (source / 'web/node_modules').symlink_to(dependencies, target_is_directory=True)
            dist = out / 'dist'
            clean = {k: v for k, v in os.environ.items() if k in ('PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL')}
            clean.update(env)
            command = ['npm', 'run', 'build', '--', '--outDir', str(dist), '--emptyOutDir']
            try:
                with (out / 'build.log').open('xb') as log:
                    kwargs = {'cwd': source / 'web', 'env': clean, 'stdout': log,
                              'stderr': subprocess.STDOUT}
                    if bounded:
                        bounded_build(command, out, timeout, **kwargs)
                    else:
                        subprocess.run(command, **kwargs, timeout=timeout, check=True)
            except Exception as exc:
                stage(out, 'build', 'fail', reason=str(exc)[:2000], log=file_binding(out / 'build.log'))
                raise
            build_status = 'built'
            build_evidence = {'status': build_status, 'archive': archive_binding,
                              'effective_source_manifest_sha256': digest(source_manifest),
                              'lockfile': file_binding(lock), 'dependency_install_lock': install_lock,
                              'dependency_provenance': 'explicit-existing-install; not a fresh npm-ci claim',
                              'host': {'system': platform.system(), 'release': platform.release(),
                                       'machine': platform.machine(), 'python': platform.python_version()},
                              'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                              'npm': subprocess.check_output(['npm', '--version'], text=True).strip(),
                              'log': file_binding(out / 'build.log')}
            if bounded:
                build_evidence['storage_budget'] = file_binding(out / 'storage-budget.json')
                build_evidence['storage_monitor'] = file_binding(out / 'storage-monitor.json')
            save(out / 'source-files.json', source_manifest)
        dist = Path(dist).resolve()
        front = tree(dist)
        require('index.html' in front and 'city-data-build-receipt.json' in front, 'Incomplete frontend dist')
        receipt = load(dist / 'city-data-build-receipt.json')
        require(receipt.get('schemaVersion') == 1 and receipt.get('city') == core['city'] and
                receipt.get('purpose') == 'publication' and
                receipt.get('profileEnabled') is True and receipt.get('profileSHA256') == core['profile']['sha256'],
                'Frontend build receipt/profile mismatch')
        require(receipt.get('buildingDetailCatalogSHA256') == core.get('building_detail', {}).get('catalog', {}).get('sha256'),
                'Frontend build receipt/detail catalog mismatch')
        if 'city-data-profile.json' in front:
            check_binding(dist / 'city-data-profile.json', core['profile'])
        html = (dist / 'index.html').read_text()
        require(core['prefix'] + 'assets/' in html, 'Frontend uses another city base path')
        for name, item in front.items():
            require(not name.startswith('__render__/'), 'Reserved candidate endpoint')
            require(not name.startswith(('safety/', 'report-bodies/', 'statistics/')),
                    'Dist must not silently replace the declared data mount')
            if name not in ('index.html', 'city-data-profile.json'):
                require(name not in mounts, f'Ambiguous dist/data route: {name}')
                mounts[name] = {'root': 'dist', 'path': name, **item}
        for route in core['frontend_routes']:
            require(route not in mounts, f'Ambiguous frontend alias: {route}')
            mounts[route] = {'root': 'dist', 'path': 'index.html', **front['index.html']}
        if core['city'] == 'berlin':
            mounts[''] = mounts['index.html']
        save(out / 'mounts.json', mounts)
        if bounded:
            check_build_storage(out)
            build_evidence['storage_monitor'] = file_binding(out / 'storage-monitor.json')
        identity = {'schema_version': VERSION, 'kind': 'sealed-virtual-render-candidate',
                    'recipe_id': recipe['recipe_id'], 'city': core['city'], 'prefix': core['prefix'],
                    'commit': core['commit'], 'build': build_evidence, 'profile': core['profile'],
                    'mounts_sha256': file_binding(out / 'mounts.json')['sha256'],
                    'frontend_manifest_sha256': digest(front), 'data_inventory': core['data_inventory'],
                    'profile_source': core['profile_source'],
                    'profile_contract_tool_sha256': core['profile_contract_tool_sha256'],
                    'owner_approved': False, 'publication_ready': False,
                    'data_mount_validation': 'sealed inventory; individual bytes verified on access, no full scan'}
        if 'resource_overlay' in core:
            identity['resource_overlay'] = core['resource_overlay']
            identity['data_mounts_sha256'] = core['data_mounts_sha256']
        if 'building_detail' in core:
            identity['building_detail'] = core['building_detail']
        candidate = {'core': identity, 'candidate_id': digest(identity),
                     'locations': {'dist': str(dist), 'data': str(data_root), 'candidate': str(out),
                                   'data_inventory': str(Path(spec['data']['inventory']['path']).resolve())}}
        if resource_root is not None:
            candidate['locations']['resources'] = str(resource_root)
        if detail_root is not None:
            candidate['locations']['details'] = str(detail_root)
        save(out / 'candidate.json', candidate)
        if build_status == 'built':
            stage(out, 'build', 'pass', candidate_id=candidate['candidate_id'], build=build_evidence)
        stage(out, 'create', 'pass', candidate_id=candidate['candidate_id'], build_status=build_status)
        return candidate
    except Exception as exc:
        if (out / 'build.log').exists() and not (out / 'stages/build.json').exists():
            stage(out, 'build', 'fail', reason=str(exc)[:2000], log=file_binding(out / 'build.log'))
        if not (out / 'stages/create.json').exists():
            stage(out, 'create', 'fail', reason=str(exc)[:2000])
        raise


def read_candidate(path):
    path = Path(path); candidate = load(path)
    require(candidate['candidate_id'] == digest(candidate['core']), 'Candidate identity changed')
    check_binding(path.parent / 'mounts.json', {'sha256': candidate['core']['mounts_sha256']})
    mounts = load(path.parent / 'mounts.json')
    overlay = candidate['core'].get('resource_overlay')
    allowed_roots = {'data', 'dist', 'candidate'}
    contract = None
    if 'profile_source' in candidate['core']:
        source_profile = {}
        for name in PROFILE_SOURCE_FILES:
            file = checked_path(path.parent.resolve(), f'bindings/profile-source-{name}.json')
            check_binding(file, candidate['core']['profile_source'][name])
            source_profile[name] = load(file)
        profile_file = checked_path(path.parent.resolve(), 'bindings/city-data-profile.json')
        check_binding(profile_file, candidate['core']['profile'])
        profile = load(profile_file, 100_000)
        contract = profile_resource_contract(profile, source_profile['dependencies'], source_profile['manifest'],
                                             candidate['core']['city'])
    if overlay is not None:
        resource_root = Path(candidate['locations']['resources'])
        for source_name, snapshot_name, binding_name in (
                ('asset-manifest.json', 'resource-asset-manifest.json', 'manifest'),
                ('runtime-table-manifest.json', 'resource-runtime-table-manifest.json', 'runtime_table_manifest')):
            check_binding(checked_path(path.parent.resolve(), 'bindings/' + snapshot_name), overlay[binding_name])
            check_binding(checked_path(resource_root, source_name), overlay[binding_name])
        require(digest({n: item for n, item in mounts.items() if item['root'] == 'resources'}) ==
                overlay['mounts_sha256'], 'Resource overlay mount binding changed')
        if contract is not None:
            recipe = load(path.parent / 'recipe.json')
            require(recipe['recipe_id'] == candidate['core']['recipe_id'] == digest(recipe['core']),
                    'Candidate recipe binding changed')
            original = recipe['core']
            inventory_path = Path(candidate['locations']['data_inventory'])
            check_binding(inventory_path, candidate['core']['data_inventory'])
            inventory = load(inventory_path)['files']
            prefixes, exact = original['data_prefixes'], set(original['data_files'])
            original_mounts = {name: {'root': 'data', 'path': name, 'sha256': item['sha256'], 'bytes': item['bytes']}
                               for name, item in inventory.items()
                               if name in exact or any(name.startswith(prefix) for prefix in prefixes)}
            rebound = bind_resource_overlay(
                {'root': str(resource_root), 'manifest': {'path': str(resource_root / 'asset-manifest.json'),
                                                        **overlay['manifest']}},
                candidate['core']['city'], profile, candidate['core']['profile'], original_mounts, contract,
                verify_asset_bytes=False)
            require(rebound == overlay and digest(original_mounts) == candidate['core']['data_mounts_sha256'],
                    'Candidate resource dependency projection changed')
            # Berlin's empty portal alias is added after the original data projection.
            actual_data = {name: item for name, item in mounts.items()
                           if name and item['root'] in ('data', 'resources')}
            require(actual_data == original_mounts, 'Candidate projected data mounts changed')
        allowed_roots.add('resources')
    detail = candidate['core'].get('building_detail')
    if detail is not None:
        require(contract is not None, 'Detail candidate lacks source/profile bindings')
        detail_root = Path(candidate['locations']['details'])
        check_binding(checked_path(path.parent.resolve(), 'bindings/building-detail-catalog.json'), detail['catalog'])
        check_binding(checked_path(path.parent.resolve(), 'bindings/building-detail-sidecar.json'), detail['manifest'])
        base_mounts = {name: item for name, item in mounts.items() if item['root'] in ('data', 'resources') and name}
        rebound, catalog = bind_building_detail(
            {'root': str(detail_root), 'manifest': {'path': str(detail_root / 'detail-variants.json'), **detail['manifest']}},
            candidate['core']['city'], profile, base_mounts, verify_asset_bytes=False,
            variant_leaves_only=detail.get('deployment', {}).get('mode') == 'variant-leaves-only')
        require(rebound == detail and hashlib.sha256(catalog).hexdigest() == detail['catalog']['sha256'] and
                digest({name: item for name, item in mounts.items() if item['root'] == 'details'}) == detail['mounts_sha256'],
                'Candidate building detail asset/catalog closure changed')
        allowed_roots.add('details')
    for route, item in mounts.items():
        if route:
            relative(route, directory=True)
        require(not route.startswith('__render__/'), 'Reserved candidate endpoint')
        require(item['root'] in allowed_roots, 'Unknown mount root')
        relative(item['path'])
        require(item['root'] != 'candidate' or item['path'] == 'bindings/city-data-profile.json',
                'Unknown candidate mount')
        if item['root'] == 'resources':
            require(item['path'] == 'runtime-table-manifest.json' if route == 'city-data-tables.json' else
                    PAINT_TABLE_PATH.fullmatch('/' + route) and item['path'] == 'assets/' + route,
                    'Unknown resource overlay mount')
        if item['root'] == 'details':
            require(detail is not None and DETAIL_PATH.fullmatch('/' + route) and base_mounts.get(route) == item,
                    'Unknown detail asset mount')
    return candidate, mounts


def handler(candidate, mounts):
    prefix = candidate['core']['prefix']; ident = candidate['candidate_id']

    class Handler(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            raw = urllib.parse.urlsplit(self.path).path
            route = urllib.parse.unquote(raw)
            if not route.startswith(prefix):
                self.send_error(404); return
            name = route[len(prefix):]
            try:
                if name:
                    relative(name, directory=True)
                if name == '__render__/identity.json':
                    body = canonical({'schema_version': VERSION, 'candidate_id': ident,
                                      'city': candidate['core']['city'], 'prefix': prefix})
                    self.send_response(200); self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(len(body)))
                    self.send_header('X-Render-Candidate', ident); self.end_headers(); self.wfile.write(body)
                    return
                require(name in mounts, 'Undeclared route')
                item = mounts[name]; file = checked_path(candidate['locations'][item['root']], item['path'])
                # Validate on the opened inode; no directory listing or fallback routing.
                with file.open('rb') as stream:
                    require(os.fstat(stream.fileno()).st_size == item['bytes'], 'Mounted length changed')
                    require(hashlib.file_digest(stream, 'sha256').hexdigest() == item['sha256'], 'Mounted SHA changed')
                    stream.seek(0)
                    self.send_response(200)
                    self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
                    self.send_header('Content-Length', str(item['bytes']))
                    self.send_header('X-Render-Candidate', ident)
                    self.send_header('Cache-Control', 'no-store'); self.end_headers()
                    shutil.copyfileobj(stream, self.wfile, 64 * 1024)
            except (ValueError, OSError, KeyError):
                self.send_error(404 if name not in mounts else 409, 'Unbound or changed candidate resource')

        def log_message(self, fmt, *args):
            sys.stderr.write((fmt % args)[:500] + '\n')

    return Handler


def server(path, port):
    candidate, mounts = read_candidate(path)
    require(0 <= port <= 65535, 'Invalid port')
    class Server(http.server.ThreadingHTTPServer):
        request_queue_size = 128
        daemon_threads = True

    return Server(('127.0.0.1', port), handler(candidate, mounts))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Candidate HTTP redirect rejected')


def fetch(url, limit):
    with urllib.request.build_opener(NoRedirect).open(url, timeout=15) as response:
        body = response.read(limit + 1)
        require(len(body) <= limit, 'HTTP response exceeds expected bound')
        return body, response.headers.get('X-Render-Candidate')


def entry_assets(html, page_url, origin, prefix):
    """Only assets directly referenced by the entry HTML, never all lazy chunks."""
    references = []

    class Assets(HTMLParser):
        def handle_starttag(self, tag, attributes):
            attrs = dict(attributes)
            if tag == 'script' and attrs.get('src'):
                references.append(attrs['src'])
            if tag == 'link' and attrs.get('href') and (
                    set(attrs.get('rel', '').lower().split()) & {'stylesheet', 'modulepreload'} or
                    attrs.get('as') in ('script', 'style')):
                references.append(attrs['href'])

    Assets().feed(html)
    result = set()
    for reference in references:
        url = urllib.parse.urlsplit(urllib.parse.urljoin(page_url, reference))
        require(f'{url.scheme}://{url.netloc}' == origin and url.path.startswith(prefix),
                'Entry asset is outside the bound candidate')
        name = urllib.parse.unquote(url.path[len(prefix):])
        relative(name)
        require(name.endswith(('.js', '.css')), 'Unsupported entry script/style path')
        result.add(name)
    require(any(n.endswith('.js') for n in result), 'Entry HTML has no bound script')
    return result


def verify_http(path, origin, output, routes=()):
    candidate, mounts = read_candidate(path); core = candidate['core']; ident = candidate['candidate_id']
    parsed = urllib.parse.urlsplit(origin)
    require(parsed.scheme == 'http' and parsed.hostname == '127.0.0.1' and parsed.port and
            parsed.path in ('', '/') and not parsed.query and not parsed.fragment and not parsed.username,
            'Use an explicit local candidate origin')
    require(not Path(output).exists(), 'Refusing existing HTTP receipt')
    verified = []
    try:
        base = origin.rstrip('/') + core['prefix']
        raw, header = fetch(base + '__render__/identity.json', 1024)
        require(json.loads(raw)['candidate_id'] == ident and header == ident, 'Wrong HTTP candidate')
        required = set(routes) | {'safety/manifest.json', 'city-data-profile.json', 'city-data-build-receipt.json'}
        required |= {n for n, item in mounts.items() if item['root'] == 'dist' and item['path'] == 'index.html'}
        required |= {n for n, item in mounts.items() if item['root'] == 'resources'}
        required |= {n for n, item in mounts.items() if item['root'] == 'details'}
        if 'building_detail' in core:
            required |= set(core['building_detail']['canonical_assets'])
        if 'profile_source' in core:
            profile = load(Path(path).parent / 'bindings/city-data-profile.json', 100_000)
            if profile['selectorVersion'] == 'city-data-v2':
                required.add('city-data-tables.json')
                for route in profile['routes']:
                    for descriptor in city_route_assets(route):
                        required.add(descriptor.get('transport', descriptor)['path'][1:])
        if 'safety/lossless/index.json' in mounts:
            required.add('safety/lossless/index.json')
        checked = set()
        while required - checked:
            name = min(required - checked)
            require(name in mounts, f'HTTP check route is undeclared: {name}')
            item = mounts[name]; body, header = fetch(base + urllib.parse.quote(name, safe='/'), item['bytes'])
            require(header == ident and len(body) == item['bytes'] and
                    hashlib.sha256(body).hexdigest() == item['sha256'], f'HTTP byte mismatch: {name}')
            verified.append({'route': core['prefix'] + name, 'mount': item['root'],
                             'sha256': item['sha256'], 'bytes': item['bytes']})
            checked.add(name)
            if item['root'] == 'dist' and item['path'] == 'index.html':
                assets = entry_assets(body.decode('utf-8'), base + name, origin.rstrip('/'), core['prefix'])
                require(all(n in mounts and mounts[n]['root'] == 'dist' for n in assets),
                        'Required entry asset is absent from the frontend mount')
                required |= assets
        result = {'schema_version': VERSION, 'stage': 'http', 'status': 'pass', 'candidate_id': ident,
                  'origin': origin.rstrip('/'), 'verified': verified, 'whole_data_mount_scanned': False,
                  'publication_ready': False}
        if 'resource_overlay' in core:
            result['resource_overlay_assets_verified'] = core['resource_overlay']['asset_count']
        if 'building_detail' in core:
            result['building_detail_assets_verified'] = core['building_detail']['asset_count']
    except Exception as exc:
        save(output, {'schema_version': VERSION, 'stage': 'http', 'status': 'fail', 'candidate_id': ident,
                      'verified': verified, 'reason': str(exc)[:2000]})
        raise
    save(output, result); return result


EXTRACTION_SECTIONS = ('full', 'scene', 'inputs', 'programs', 'readiness')
EXTRACTION_PROVIDERS = ('root500', 'delegated500', 'tier300', 'church', 'city', 'infill', 'bremen')


def extraction(path, section='full', provider=None):
    require(section in EXTRACTION_SECTIONS, 'Unsupported extraction section')
    require(provider is None or provider in EXTRACTION_PROVIDERS, 'Unsupported extraction provider')
    require((provider is not None) == (section in ('programs', 'readiness')),
            'Program/readiness sections require one provider; other sections do not accept a provider')
    candidate, _ = read_candidate(path)
    config = {'candidate_id': candidate['candidate_id'], 'prefix': candidate['core']['prefix'],
              'extractor_sha256': sha(HERE / 'smoke-extract.js')}
    expression = '(async()=>{const binding=' + canonical(config).decode() + ';\n' + (HERE / 'smoke-extract.js').read_text() + '\n})()'
    if section == 'full':
        return expression
    # Project one actual observation, never join separately sampled sections.
    # A scene retains all smoke gates, while diagnostics cannot be passed as smoke.
    selection = canonical({'section': section, 'provider': provider}).decode()
    return expression + '.then(value=>{const selection=' + selection + r''';
const {solar,frozen_table_inputs,frozen_data_resources,program_preparation,manager_draw_readiness,...identity}=value;
const output={...identity,extraction_section:selection.section,section_schema_version:1};
if(selection.section==='scene')output.solar=solar;
else if(selection.section==='inputs'){output.frozen_table_inputs=frozen_table_inputs;output.frozen_data_resources=frozen_data_resources;}
else {
  const key=selection.section==='programs'?'program_preparation':'manager_draw_readiness';
  const diagnostic=selection.section==='programs'?program_preparation:manager_draw_readiness;
  const row=diagnostic?.providers?.[selection.provider];
  output[key]={...diagnostic,available:row!==undefined,selected_provider:selection.provider,
    providers:row===undefined?undefined:{[selection.provider]:row},
    unavailable_reason:row===undefined?(diagnostic?.unavailable_reason??'selected-provider-unavailable'):undefined};
}
return output;
})'''


def smoke(path, observation, http_receipt, output):
    candidate, mounts = read_candidate(path); ident = candidate['candidate_id']
    require(not Path(output).exists(), 'Refusing existing smoke receipt')
    try:
        value = load(observation, 64_000); http = load(http_receipt, 2_000_000)
        require(http.get('status') == 'pass' and http.get('candidate_id') == ident, 'No matching HTTP pass')
        require(value.get('schema_version') == VERSION and value.get('candidate_id') == ident and
                value.get('server_candidate_id') == ident, 'Wrong smoke candidate')
        require(value.get('extraction_section') in (None, 'full', 'scene'),
                'Diagnostic section is not a complete scene observation')
        require(value.get('proof_schema_version') == 1, 'Unsupported scene proof schema')
        url = urllib.parse.urlsplit(value['url'])
        require(f'{url.scheme}://{url.netloc}' == http['origin'] and
                url.path.startswith(candidate['core']['prefix']), 'Smoke URL differs from bound server')
        relative_route = url.path[len(candidate['core']['prefix']):]
        require(relative_route in mounts and mounts[relative_route]['root'] == 'dist' and
                mounts[relative_route]['path'] == 'index.html', 'Smoke is not on a candidate frontend route')
        require(value.get('extractor_sha256') == sha(HERE / 'smoke-extract.js'), 'Wrong extractor version')
        require(value.get('document_hidden') is False and value.get('proof_age_ms', -1) >= 0 and
                value['proof_age_ms'] <= 5000, 'Hidden or stale render observation')
        require(value.get('mode') == '3d' and value.get('wanted_mode') == '3d' and
                value.get('gpu_unavailable') is False, '3D/GPU not ready')
        require(value.get('recovery') in ('idle', 'ready'), 'Recovery is not ready')
        solar = value['solar']; core = solar['core']
        require(solar.get('mode') == '3d' and all(solar.get(k) is False for k in
                ('hidden', 'suspended', 'destroyed', 'faulted')), 'Solar layer unavailable')
        require(core.get('status') == 'ready' and core.get('published') is True, 'Solar capture not published')
        require(type(core.get('captures')) is int and core['captures'] > 0, 'No completed solar capture')
        preparation = core.get('preparation')
        require(isinstance(preparation, dict) and preparation.get('status') == 'ready' and
                preparation.get('pending') == 0 and preparation.get('failed') == 0, 'Solar preparation incomplete')
        coverage = core['coverage']; captured = core['captureResult']
        require(coverage.get('complete') is True and captured.get('complete') is True,
                'Solar ready is insufficient: coverage/capture incomplete')
        for key in ('triangles', 'draws'):
            require(type(captured.get(key)) is int and type(coverage.get(key)) is int and
                    0 < captured[key] == coverage[key], f'Solar {key} differs from complete plan')
        result = {'schema_version': VERSION, 'stage': 'smoke', 'status': 'pass', 'candidate_id': ident,
                  'observation': file_binding(observation), 'http_receipt': file_binding(http_receipt),
                  'browser': value['browser'], 'capture': captured,
                  'scope': 'external-browser reported runtime readiness; not hardware/visual/performance acceptance',
                  'owner_approved': False, 'publication_ready': False}
    except Exception as exc:
        save(output, {'schema_version': VERSION, 'stage': 'smoke', 'status': 'fail',
                      'candidate_id': ident, 'reason': str(exc)[:2000]})
        raise
    save(output, result); return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('inputs')
    for key in ('repo', 'profile', 'overrides-root', 'build-environment', 'data-root', 'data-inventory', 'out'):
        p.add_argument('--' + key, type=Path, required=True)
    p.add_argument('--commit', required=True); p.add_argument('--city', choices=sorted(CITIES), required=True)
    p.add_argument('--data-inventory-sha256', required=True)
    p.add_argument('--resource-overlay-root', type=Path,
                   help='Optional bounded city-table overlay with asset-manifest.json')
    p.add_argument('--building-detail-root', type=Path,
                   help='Optional existing detail-variants.json and its complete replacement assets')
    p.add_argument('--data-prefix', action='append', required=True)
    p.add_argument('--data-file', action='append', default=[])
    p.add_argument('--frontend-route', action='append', default=[])
    p = commands.add_parser('create'); p.add_argument('--inputs', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True); mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dist', type=Path); mode.add_argument('--node-modules', type=Path)
    p.add_argument('--timeout', type=int, default=900)
    p.add_argument('--bounded-build', action='store_true',
                   help='Diagnostic build: 32 GiB reserve, 2 GiB candidate limit, live process-group guard')
    p = commands.add_parser('serve'); p.add_argument('--candidate', type=Path, required=True)
    p.add_argument('--port', type=int, required=True)
    p = commands.add_parser('verify-http'); p.add_argument('--candidate', type=Path, required=True)
    p.add_argument('--origin', required=True); p.add_argument('--out', type=Path, required=True)
    p.add_argument('--route', action='append', default=[])
    p = commands.add_parser('extract-js'); p.add_argument('--candidate', type=Path, required=True)
    p.add_argument('--section', choices=EXTRACTION_SECTIONS, default='full',
                   help='Separate scene acceptance from bounded diagnostics; each invocation is a new observation')
    p.add_argument('--provider', choices=EXTRACTION_PROVIDERS,
                   help='Required only for programs/readiness, to limit output to one provider')
    p = commands.add_parser('smoke'); p.add_argument('--candidate', type=Path, required=True)
    p.add_argument('--observation', type=Path, required=True); p.add_argument('--http-receipt', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'inputs':
        result = freeze_inputs(args)
    elif args.command == 'create':
        result = create(args.inputs, args.out, args.dist, args.node_modules, args.timeout, args.bounded_build)
    elif args.command == 'serve':
        with server(args.candidate, args.port) as serving:
            print(json.dumps({'listening': serving.server_address, 'candidate': str(args.candidate)}), flush=True)
            serving.serve_forever()
        return
    elif args.command == 'verify-http':
        result = verify_http(args.candidate, args.origin, args.out, args.route)
    elif args.command == 'extract-js':
        print(extraction(args.candidate, args.section, args.provider)); return
    else:
        result = smoke(args.candidate, args.observation, args.http_receipt, args.out)
    print(json.dumps({k: v for k, v in result.items() if k in ('candidate_id', 'status', 'stage')}))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print(f'render candidate: {error}', file=sys.stderr)
        sys.exit(1)
