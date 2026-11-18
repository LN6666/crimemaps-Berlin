#!/usr/bin/env python3
"""Bind existing independent city inputs to one explicit, committed runtime.

Metadata only: no build, source checkout, asset copy, browser or publication.
The candidate module remains the owner of profile validation and mount rules.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('_city_assembly_candidate', HERE / 'candidate.py')
candidate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(candidate)
VERSION = 1
RESERVE = 32 * 1024 ** 3
OUTPUT_LIMIT = 8 * 1024 ** 2
DETAIL_CATALOG_LIMIT = 100_000
DETAIL_MANIFEST_LIMIT = 20_000_000
SOURCE_TOOLS = {
    'scripts/render/city_assembly.py': Path(__file__).resolve(),
    'scripts/render/candidate.py': HERE / 'candidate.py',
    'scripts/migration/verify_city_data_profile.py': candidate.PROFILE_CONTRACT_TOOL,
}
NATIVE_NAMES = {'munich': 'münchen', 'cologne': 'köln', 'dusseldorf': 'düsseldorf',
                'nuremberg': 'nürnberg'}
NOT_RUN = ['production-tsc', 'vite-build', 'candidate-http', 'native-browser',
           'V1-V5-acceptance', 'physical-memory', 'controlled-recovery', 'publication']


class MetadataOutput:
    def __init__(self):
        self.bytes = 0

    def save(self, path, value):
        size = len(candidate.canonical(value)) + 1
        candidate.require(self.bytes + size <= OUTPUT_LIMIT, 'Assembly metadata exceeds 8 MiB')
        parent = Path(path).parent
        while not parent.exists():
            parent = parent.parent
        candidate.require(shutil.disk_usage(parent).free - size >= RESERVE,
                          'Assembly needs a 32 GiB free-space reserve')
        candidate.save(path, value)
        self.bytes += size


def pin(path):
    path = Path(path).absolute()
    if not path.is_file() or path.is_symlink():
        return {'path': str(path), 'missing': True}
    return {'path': str(path), **candidate.file_binding(path)}


def city_mapping(values):
    result = {}
    for value in values:
        city, separator, path = value.partition('=')
        candidate.require(separator and city in candidate.CITIES and path and city not in result,
                          'Expected one explicit city=/absolute/path per option')
        candidate.require(Path(path).is_absolute(), 'City input path must be absolute')
        result[city] = Path(path)
    return result


def detail_descriptor(value, label):
    candidate.require(isinstance(value, dict) and isinstance(value.get('path'), str) and
                      isinstance(value.get('sha256'), str) and
                      candidate.SHA.fullmatch(value.get('sha256', '')) and
                      type(value.get('bytes')) is int and value['bytes'] > 0,
                      f'Invalid {label} descriptor')
    name = candidate.relative(value['path'].removeprefix('/'))
    candidate.require(candidate.DETAIL_PATH.fullmatch(value['path']) and
                      value['sha256'] in Path(name).name, f'Unsafe or unhashed {label} route')
    return name


def detail_resources(root, manifest):
    """Resolve explicit routes, never infer a source from an asset basename."""
    values = manifest.get('resources')
    candidate.require(isinstance(values, list) and len(values) <= 100_000,
                      'Invalid city detail resource inventory')
    resources = {}
    for value in values:
        name = detail_descriptor(value, 'city detail resource')
        candidate.require(name not in resources, 'Duplicate city detail resource route')
        source = candidate.relative(value.get('source'))
        file = candidate.checked_path(root, source)
        candidate.require(file.stat().st_size == value['bytes'],
                          f'City detail resource length changed: {name}')
        resources[name] = (value, file)
    return resources


def detail_file(resources, descriptor, label, metadata_limit=None):
    name = detail_descriptor(descriptor, label)
    resource = resources.get(name)
    candidate.require(resource is not None and
                      all(resource[0][key] == descriptor[key] for key in ('sha256', 'bytes')),
                      f'{label} is absent from the city detail resource inventory')
    if metadata_limit is not None:
        candidate.require(descriptor['bytes'] <= metadata_limit, f'{label} exceeds metadata bound')
        candidate.check_binding(resource[1], descriptor)
    return resource[1]


def detail_pin(root, city):
    """Pin the separately served catalog as well as its producing city manifest."""
    result = {'root': str(root), 'manifest': pin(root / 'detail-variants.json')}
    if not result['manifest'].get('missing'):
        value = candidate.load(result['manifest']['path'], DETAIL_MANIFEST_LIMIT)
        candidate.require(isinstance(value, dict), 'Invalid detail manifest object')
        if value.get('schema') == 'crimemaps-building-detail-city-v1':
            candidate.require(value.get('schemaVersion') == 1 and value.get('city') == city,
                              'Wrong city detail manifest city/schema')
            resources = detail_resources(root, value)
            file = detail_file(resources, value.get('catalog'), 'City detail catalog', DETAIL_CATALOG_LIMIT)
            result['catalog_binding'] = pin(file)
    return result


def derived_data_source(run_root, city, selected_run):
    """Bind one explicit derived city run to its unchanged fourteen-city parent."""
    selected_run = Path(selected_run).resolve()
    derivation = pin(selected_run / 'DERIVATION.json')
    candidate.require(not derivation.get('missing'), 'Selected city run lacks its derivation')
    value = candidate.load(derivation['path'], 100_000)
    scope = value.get('scope')
    candidate.require(isinstance(value.get('parent_run'), str) and
                      Path(value['parent_run']).is_absolute() and
                      Path(value['parent_run']).resolve() == run_root and
                      isinstance(scope, list) and scope and all(isinstance(c, str) for c in scope) and
                      city in scope and len(scope) == len(set(scope)) and set(scope) <= candidate.CITIES,
                      'Selected city run does not derive from this parent/city')
    parent_inventory = pin(run_root / 'receipts' / f'{city}-site-inventory.json')
    candidate.require(not parent_inventory.get('missing') and
                      value.get('parent_inventory_sha256') == parent_inventory['sha256'],
                      'Selected city run parent inventory mismatch')
    return {'run_root': str(selected_run), 'derivation': derivation,
            'parent_inventory': parent_inventory}


def catalog(run_root, overrides_root, environment, profiles=None, resources=None, details=None,
            data_runs=None):
    """Pin small metadata from the selected frozen run, without adopting new data."""
    run_root = Path(run_root).resolve()
    overrides_root = Path(overrides_root).resolve()
    profiles, resources, details = profiles or {}, resources or {}, details or {}
    data_runs = data_runs or {}
    candidate.require(set(data_runs) <= candidate.CITIES, 'Unknown city data run')
    derivation = candidate.load(run_root / 'DERIVATION.json')
    capacity = candidate.load(run_root / 'FINAL14-CAPACITY.json')
    data_commit = derivation.get('local_source_commit')
    candidate.require(re.fullmatch(r'[a-f0-9]{40}', data_commit or '') and
                      capacity.get('local_source_commit') == data_commit and
                      capacity.get('all_fourteen_assembled') is True,
                      'Selected data run lacks its matching fourteen-city provenance')
    result = {'schema_version': VERSION, 'kind': 'city-assembly-input-catalog',
              'data_source_commit': data_commit,
              'provenance': {name: pin(run_root / name)
                             for name in ('DERIVATION.json', 'FINAL14-CAPACITY.json')},
              'build_environment': pin(environment), 'cities': {},
              'status': 'existing-inputs-only', 'builds_performed': False,
              'publication_performed': False}
    for city in sorted(candidate.CITIES):
        data_source = (derived_data_source(run_root, city, data_runs[city])
                       if city in data_runs else None)
        city_run = Path(data_source['run_root']) if data_source else run_root
        site = city_run / 'sites' / ('crimemaps-' + city.capitalize())
        overrides = overrides_root / city
        profile = profiles.get(city, resources[city] / 'profile.json' if city in resources
                               else site / 'city-data-profile.json')
        prefixes = ['safety/', 'statistics/', 'report-bodies/', 'about/', 'assets/3d-materials/']
        files = ['city-data-tables.json', 'discovery.css', 'sitemap.xml']
        routes = ['map', 'map/', 'map/index.html']
        if city == 'berlin':
            prefixes.append('portal-assets/')
            files.extend(['index.html', 'portal.css', 'portal.js', 'portal-cities.js',
                          'goatcounter-client.mjs', 'portal-time.mjs', 'portal-appearance.mjs',
                          'portal-locales.js', 'contract.mjs'])
        else:
            routes = ['', 'index.html', *routes]
        row = {'profile': pin(profile),
               'overrides': {'root': str(overrides), 'files': {}},
               'data': {'root': str(site),
                        'inventory': pin(city_run / 'receipts' / f'{city}-site-inventory.json'),
                        'prefixes': prefixes, 'files': files},
               'frontend_routes': routes,
               'three_d_indexes': {name: pin(site / name) for name in (
                   'safety/buildings3d/index.json', f'safety/buildings3d/{city}/index.json',
                   'safety/buildings3d/scenery-index.json')}}
        if data_source:
            row['data_source'] = data_source
        for name in candidate.CITY_FILES:
            binding = pin(overrides / name)
            row['overrides']['files'][name] = {k: v for k, v in binding.items() if k != 'path'}
        for key, roots, manifest in [('resource_overlay', resources, 'asset-manifest.json'),
                                     ('building_detail', details, 'detail-variants.json')]:
            if city in roots:
                root = roots[city].resolve()
                row[key] = detail_pin(root, city) if key == 'building_detail' else {
                    'root': str(root), 'manifest': pin(root / manifest)}
        result['cities'][city] = row
    return result


def source_binding(repo, commit):
    candidate.require(re.fullmatch(r'[a-f0-9]{40}', commit or ''),
                      'Use an explicit full source commit, never HEAD or a working tree')
    candidate.require(candidate.git(repo, 'rev-parse', f'{commit}^{{commit}}').decode().strip() == commit,
                      'Source commit is unavailable')
    bindings = {}
    for name, path in SOURCE_TOOLS.items():
        raw = candidate.git(repo, 'show', f'{commit}:{name}')
        binding = candidate.file_binding(path)
        candidate.require(hashlib.sha256(raw).hexdigest() == binding['sha256'],
                          f'Assembly tool differs from the selected source commit: {name}')
        bindings[name] = binding
    return bindings


def mounted_file(mounts, roots, descriptor):
    name = candidate.relative(descriptor['path'].removeprefix('/'))
    item = mounts.get(name)
    candidate.require(item is not None and all(item[k] == descriptor[k] for k in ('sha256', 'bytes')),
                      f'Required 3D resource is absent from the exact mounts: {name}')
    path = candidate.checked_path(roots[item['root']], item['path'])
    candidate.require(path.stat().st_size == item['bytes'], f'3D resource length changed: {name}')
    return path


def descriptor_references(value):
    if isinstance(value, dict):
        if (isinstance(value.get('path'), str) and value['path'].startswith('/safety/')
                and 'sha256' in value and 'bytes' in value):
            yield value
        for item in value.values():
            yield from descriptor_references(item)
    elif isinstance(value, list):
        for item in value:
            yield from descriptor_references(item)


def detail_entry_identity(value):
    candidate.require(isinstance(value, dict) and
                      all(isinstance(value.get(key), str) and candidate.SHA.fullmatch(value[key])
                          for key in ('canonicalIndexSHA256', 'canonicalLeafSHA256')) and
                      isinstance(value.get('leafId'), str) and 0 < len(value['leafId']) <= 1024 and
                      not any(ord(c) < 32 or ord(c) == 127 for c in value['leafId']),
                      'Invalid city detail leaf identity')
    return tuple(value[key] for key in ('canonicalIndexSHA256', 'canonicalLeafSHA256', 'leafId'))


def building_detail_inputs(spec, core, mounts):
    """Describe only registrations already accepted by candidate.inputs.

    This metadata check does not replace canonical/protection/source validation
    in candidate.bind_building_detail, or decode any geometry payload.
    """
    if 'building_detail' not in spec:
        return None
    selected, city = spec['building_detail'], spec['city']
    root = Path(selected['root']).resolve()
    file = candidate.checked_path(root, 'detail-variants.json')
    candidate.require(Path(selected['manifest']['path']).absolute() == file,
                      'Detail manifest must be root/detail-variants.json')
    manifest_binding = candidate.check_binding(file, selected['manifest'])
    manifest = candidate.load(file, DETAIL_MANIFEST_LIMIT)
    candidate.require(isinstance(manifest, dict), 'Invalid detail manifest object')
    bound = core.get('building_detail')
    candidate.require(isinstance(bound, dict) and bound.get('manifest') == manifest_binding,
                      'Candidate input gate did not bind the selected detail manifest')
    candidate.require(manifest.get('city') == city and manifest.get('schemaVersion') == 1,
                      'Wrong detail manifest city/schema')
    if manifest.get('schema') == 'crimemaps-building-detail-replacement-v1':
        return bound
    candidate.require(manifest.get('schema') == 'crimemaps-building-detail-city-v1',
                      'Unsupported detail manifest schema')
    resources = detail_resources(root, manifest)
    for name, (descriptor, source) in resources.items():
        candidate.require(mounts.get(name, {}).get('root') == 'details',
                          f'City detail resource is absent from the detail mounts: {name}')
        mounted = mounted_file(mounts, {'details': root}, descriptor)
        candidate.require(mounted == source,
                          f'City detail resource mount source differs: {name}')
    descriptor = manifest.get('catalog')
    catalog_file = detail_file(resources, descriptor, 'City detail catalog', DETAIL_CATALOG_LIMIT)
    catalog_binding = selected.get('catalog_binding')
    candidate.require(isinstance(catalog_binding, dict) and
                      Path(catalog_binding.get('path', '')).absolute() == catalog_file,
                      'City detail catalog lacks its assembly pin')
    candidate.check_binding(catalog_file, catalog_binding)
    candidate.require(isinstance(bound.get('catalog'), dict) and
                      all(bound['catalog'].get(key) == descriptor[key] for key in ('sha256', 'bytes')),
                      'Candidate input gate did not bind the selected city detail catalog')
    catalog_value = candidate.load(catalog_file, DETAIL_CATALOG_LIMIT)
    candidate.require(isinstance(catalog_value, dict) and
                      catalog_value.get('schema') == 'crimemaps-building-detail-catalog-v2' and
                      catalog_value.get('schemaVersion') == 2 and catalog_value.get('city') == city,
                      'Wrong city detail catalog city/schema')
    pages = catalog_value.get('pages')
    candidate.require(isinstance(pages, list) and len(pages) <= 256,
                      'Invalid city detail catalog pages')
    catalog_entries, prefixes = {}, set()
    for page in pages:
        candidate.require(isinstance(page, dict) and isinstance(page.get('prefix'), str) and
                          re.fullmatch(r'[a-f0-9]{2}', page['prefix']) and page['prefix'] not in prefixes,
                          'Invalid or duplicate city detail catalog page prefix')
        prefixes.add(page['prefix'])
        page_file = detail_file(resources, page.get('asset'), 'City detail catalog page', DETAIL_CATALOG_LIMIT)
        value = candidate.load(page_file, DETAIL_CATALOG_LIMIT)
        candidate.require(isinstance(value, dict) and
                          value.get('schema') == 'crimemaps-building-detail-catalog-page-v1' and
                          value.get('schemaVersion') == 1 and value.get('city') == city and
                          value.get('prefix') == page['prefix'] and
                          isinstance(value.get('entries'), list) and value['entries'],
                          'Wrong city detail catalog page city/schema/prefix')
        for entry in value['entries']:
            identity = detail_entry_identity(entry)
            key = json.dumps(identity, ensure_ascii=False, separators=(',', ':')).encode()
            candidate.require(hashlib.sha256(key).hexdigest()[:2] == page['prefix'] and
                              identity not in catalog_entries, 'City detail catalog leaf is duplicated or in the wrong page')
            detail_file(resources, entry.get('demandIndex'), 'Catalog demand index')
            if 'groupMetadata' in entry:
                detail_file(resources, entry['groupMetadata'], 'Catalog group metadata')
            catalog_entries[identity] = entry
    candidate.require(type(catalog_value.get('entryCount')) is int and
                      catalog_value['entryCount'] == len(catalog_entries),
                      'City detail catalog entry count mismatch')
    entries = manifest.get('entries')
    candidate.require(isinstance(entries, list) and len(entries) <= 100_000,
                      'Invalid city detail completed entries')
    identities, variant_leaves, variant_count = set(), 0, 0
    for entry in entries:
        identity = detail_entry_identity(entry)
        candidate.require(identity not in identities, 'Duplicate city detail completed leaf')
        identities.add(identity)
        catalog_entry = catalog_entries.get(identity)
        candidate.require(catalog_entry is not None and catalog_entry.get('demandIndex') == entry.get('demandIndex') and
                          ('groupMetadata' not in catalog_entry or catalog_entry['groupMetadata'] == entry.get('groupMetadata')),
                          'City detail manifest/catalog leaf binding mismatch')
        for field in ('demandIndex', 'groupMetadata'):
            detail_file(resources, entry.get(field), f'City detail {field}')
        leaf_manifest = entry.get('leafManifest')
        candidate.require(isinstance(leaf_manifest, dict) and type(leaf_manifest.get('bytes')) is int and
                          0 < leaf_manifest['bytes'] <= 500_000 and
                          isinstance(leaf_manifest.get('sha256'), str) and
                          candidate.SHA.fullmatch(leaf_manifest['sha256']), 'Invalid detail leaf manifest binding')
        leaf_file = candidate.checked_path(root, candidate.relative(leaf_manifest.get('file')))
        candidate.check_binding(leaf_file, leaf_manifest)
        variants = entry.get('variants')
        candidate.require(isinstance(variants, list) and len(variants) <= 2 and
                          type(entry.get('canonicalOnly')) is bool and entry['canonicalOnly'] == (not variants),
                          'City detail canonical-only/variant count mismatch')
        levels = set()
        for variant in variants:
            candidate.require(isinstance(variant, dict) and variant.get('level') in ('mid', 'coarse') and
                              variant['level'] not in levels and
                              isinstance(variant.get('geometrySHA256'), str) and candidate.SHA.fullmatch(variant['geometrySHA256']) and
                              variant.get('encoding') in ('json', 'meshopt-lossless-f32-v1', 'meshopt-lossless-f32-dictionary-v1') and
                              type(variant.get('decodedBytes')) is int and variant['decodedBytes'] > 0,
                              'Invalid city detail completed variant metadata')
            levels.add(variant['level'])
        variant_leaves += bool(variants)
        variant_count += len(variants)
    candidate.require(identities == catalog_entries.keys(), 'City detail manifest/catalog entry closure mismatch')
    summary = manifest.get('summary')
    fields = ('discoveredLeaves', 'completedLeaves', 'failedLeaves', 'pendingLeaves', 'distinctVariantLeaves')
    candidate.require(isinstance(summary, dict) and
                      all(type(summary.get(key)) is int and summary[key] >= 0 for key in fields) and
                      summary['completedLeaves'] == len(entries) and
                      summary['distinctVariantLeaves'] == variant_leaves and
                      summary['discoveredLeaves'] == sum(summary[key] for key in
                          ('completedLeaves', 'failedLeaves', 'pendingLeaves')),
                      'City detail manifest actual leaf counts mismatch')
    incomplete = bool(summary['failedLeaves'] or summary['pendingLeaves'])
    candidate.require(manifest.get('status') == ('partial' if incomplete else 'complete'),
                      'City detail manifest status contradicts its leaf counts')
    source = manifest.get('source')
    candidate.require(isinstance(source, dict) and isinstance(source.get('catalog'), dict) and
                      isinstance(source.get('producerSHA256'), str) and candidate.SHA.fullmatch(source['producerSHA256']) and
                      isinstance(source['catalog'].get('sha256'), str) and candidate.SHA.fullmatch(source['catalog']['sha256']) and
                      type(source['catalog'].get('bytes')) is int and source['catalog']['bytes'] > 0,
                      'Missing city detail source catalog/producer binding')
    return {**bound, 'assembly': {'manifest_schema': manifest['schema'], 'status': manifest['status'],
            'catalog_binding': catalog_binding, 'catalog_pages': len(pages), 'catalog_entries': len(entries),
            'leaf_counts': {key: summary[key] for key in fields}, 'canonical_only_leaves': len(entries) - variant_leaves,
            'replacement_levels': variant_count, 'resources': len(resources),
            'resource_bytes': sum(value['bytes'] for value, _ in resources.values()),
            'source_catalog': source['catalog'], 'geometry_decoded': False}}


def three_d_inputs(spec, row, core, mounts, source_profile):
    roots = {'data': Path(spec['data']['root'])}
    for key, kind in [('resource_overlay', 'resources'), ('building_detail', 'details')]:
        if key in spec:
            roots[kind] = Path(spec[key]['root'])
    city = spec['city']
    references, indexes = {}, {}
    expected_indexes = {'safety/buildings3d/index.json', f'safety/buildings3d/{city}/index.json',
                        'safety/buildings3d/scenery-index.json'}
    candidate.require(set(row['three_d_indexes']) == expected_indexes,
                      'Exactly the original three city 3D indexes are required')
    for name, binding in row['three_d_indexes'].items():
        candidate.require(not binding.get('missing') and 'sha256' in binding and 'bytes' in binding,
                          f'Missing frozen 3D index: {name}')
        path = mounted_file(mounts, roots, {'path': '/' + name,
                                          **{key: binding[key] for key in ('sha256', 'bytes')}})
        candidate.check_binding(path, binding)
        value = candidate.load(path)
        candidate.require(str(value.get('city', '')).lower() in {city, NATIVE_NAMES.get(city, city)},
                          f'3D index belongs to another city: {name}')
        if name != 'safety/buildings3d/scenery-index.json':
            leaves = value.get('shards') or value.get('partitions')
            candidate.require(isinstance(leaves, list) and leaves,
                              f'Original city building index has no geometry inputs: {name}')
        indexes[name] = {'sha256': binding['sha256'], 'bytes': binding['bytes'],
                         'actual_geometry_lod': value.get('actual_geometry_lod'),
                         'partial': value.get('partial')}
        for descriptor in descriptor_references(value):
            physical = descriptor.get('transport', descriptor)
            prior = references.setdefault(physical['path'], physical)
            candidate.require(prior == physical, 'Conflicting 3D index resource descriptors')
    profile = candidate.load(spec['profile']['path'], 100_000)
    contract = candidate.profile_resource_contract(profile, source_profile['dependencies'],
                                                   source_profile['manifest'], city)
    logical_models = {r['descriptor']['sha256'] for r in profile['routes']
                      if r['selector'] in ('model-targets', 'group-targets')}
    for sha, descriptor in contract['runtime'].items():
        if sha not in logical_models:
            physical = descriptor.get('transport', descriptor)
            prior = references.setdefault(physical['path'], physical)
            candidate.require(prior == physical, 'Conflicting active provider resource descriptors')
    for descriptor in references.values():
        mounted_file(mounts, roots, descriptor)
    detail = building_detail_inputs(spec, core, mounts)
    return {'indexes': indexes, 'direct_index_and_provider_resources': len(references),
            'logical_model_descriptors': len(logical_models),
            'resource_validation': 'sealed-inventory SHA and ordinary-file length; payload SHA on access',
            'mounted_3d_files': sum(name.startswith('safety/buildings3d/') for name in mounts),
            'profile_selector': profile['selectorVersion'],
            'profile_routes': len(profile['routes']),
            'building_detail': detail,
            'far_detail_scope': ('bound-city-manifest-only' if detail and 'assembly' in detail else
                                 'bound-sidecar-only' if detail else 'no-detail-sidecar'),
            'functional_acceptance': 'not-run'}


def freeze(catalog_path, repo, commit, cities, out):
    repo, out = Path(repo).resolve(), Path(out).absolute()
    candidate.require(cities and len(cities) == len(set(cities)) and set(cities) <= candidate.CITIES,
                      'Select known, unique independent cities')
    tools = source_binding(repo, commit)
    value = candidate.load(catalog_path, OUTPUT_LIMIT)
    candidate.require(value.get('schema_version') == VERSION and
                      value.get('kind') == 'city-assembly-input-catalog', 'Invalid assembly catalog')
    for binding in value['provenance'].values():
        candidate.check_binding(binding['path'], binding)
    environment = value['build_environment']
    candidate.check_binding(environment['path'], environment)
    envs = candidate.load(environment['path'])
    source_profile, _ = candidate.source_profile_bindings(repo, commit)
    writer = MetadataOutput()
    candidate.require(not out.exists(), 'Refusing existing assembly output')
    result = {'schema_version': VERSION, 'kind': 'current-source-city-assembly',
              'source_commit': commit, 'working_tree_used': False, 'source_tools': tools,
              'catalog': {'path': str(Path(catalog_path).resolve()), **candidate.file_binding(catalog_path)},
              'data_source_commit': value['data_source_commit'], 'cities': {},
              'not_run': NOT_RUN, 'builds_performed': False, 'publication_performed': False}
    for city in cities:
        destination = out / city
        try:
            row = value['cities'][city]
            if 'data_source' in row:
                source = row['data_source']
                parent_run = Path(value['provenance']['DERIVATION.json']['path']).parent.resolve()
                candidate.require(source == derived_data_source(parent_run, city, source['run_root']),
                                  'Selected city run provenance changed')
                city_run = Path(source['run_root'])
                candidate.require(Path(row['data']['root']) == city_run / 'sites' /
                                  ('crimemaps-' + city.capitalize()) and
                                  Path(row['data']['inventory']['path']) == city_run / 'receipts' /
                                  f'{city}-site-inventory.json',
                                  'Selected city run site/inventory mismatch')
            original_env = envs[city]
            selected_env = {k: v for k, v in original_env.items() if k.startswith('VITE_')}
            candidate.require(all(isinstance(v, str) for v in selected_env.values()),
                              'City build environment must contain string VITE values')
            selected_env['VITE_CRIMEMAPS_CITY'] = city
            env_path = destination / 'environment.json'
            writer.save(env_path, selected_env)
            spec = {key: row[key] for key in ('profile', 'overrides', 'data', 'frontend_routes')}
            spec.update(schema_version=VERSION, repo=str(repo), commit=commit, city=city,
                        build_environment=pin(env_path))
            for key in ('resource_overlay', 'building_detail'):
                if key in row:
                    spec[key] = row[key]
            # Reuse the candidate owner's public input gate and exact mount selection.
            core, _, _, _, _, _, mounts = candidate.inputs(spec)
            assets = three_d_inputs(spec, row, core, mounts, source_profile)
            path = destination / 'inputs.json'
            writer.save(path, spec)
            entry = {'status': 'inputs-pinned', 'inputs': pin(path),
                     'entry': '/crimemaps-' + city.capitalize() + ('/map/' if city == 'berlin' else '/'),
                     'three_d_entry': '/crimemaps-' + city.capitalize() + '/map/?view=3d',
                     'three_d': assets, 'environment_source': environment,
                     'candidate_built': False, 'functional_acceptance': 'not-run'}
            if 'data_source' in row:
                entry['data_source'] = row['data_source']
        except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
            entry = {'status': 'missing-or-incompatible-input', 'reason': str(exc)[:2000],
                     'candidate_built': False, 'functional_acceptance': 'not-run'}
        result['cities'][city] = entry
    result['status'] = ('inputs-pinned' if all(r['status'] == 'inputs-pinned'
                                            for r in result['cities'].values()) else 'partial')
    writer.save(out / 'assembly.json', result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('catalog')
    for key in ('run-root', 'overrides-root', 'build-environment', 'out'):
        p.add_argument('--' + key, type=Path, required=True)
    for key in ('profile', 'resource-overlay', 'building-detail', 'data-run'):
        p.add_argument('--' + key, action='append', default=[], metavar='city=/absolute/path')
    p = commands.add_parser('freeze')
    for key in ('catalog', 'repo', 'out'):
        p.add_argument('--' + key, type=Path, required=True)
    p.add_argument('--commit', required=True)
    selection = p.add_mutually_exclusive_group(required=True)
    selection.add_argument('--city', action='append', choices=sorted(candidate.CITIES))
    selection.add_argument('--all', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'catalog':
            value = catalog(args.run_root, args.overrides_root, args.build_environment,
                            city_mapping(args.profile), city_mapping(args.resource_overlay),
                            city_mapping(args.building_detail), city_mapping(args.data_run))
            MetadataOutput().save(args.out, value)
            print(json.dumps({'status': value['status'], 'cities': len(value['cities']),
                              'catalog': str(args.out), 'builds_performed': False}))
            return 0
        value = freeze(args.catalog, args.repo, args.commit,
                       sorted(candidate.CITIES) if args.all else args.city, args.out)
        print(json.dumps({'status': value['status'], 'source_commit': value['source_commit'],
                          'cities': {c: r['status'] for c, r in value['cities'].items()},
                          'assembly': str(args.out / 'assembly.json'), 'builds_performed': False}))
        return 0 if value['status'] == 'inputs-pinned' else 1
    except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        print(json.dumps({'status': 'error', 'reason': str(exc)[:2000]}), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
