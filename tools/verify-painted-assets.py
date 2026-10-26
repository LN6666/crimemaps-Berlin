#!/usr/bin/env python3
"""Verify frozen appearance assets in original or lossless transport form."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

CHUNK = 1024 * 1024
MAX_TABLE = 64 * 1024**2
HASH = re.compile(r'[a-f0-9]{64}')
PREFIX = '/safety/buildings3d/'


def descriptor(value, *, table=False, transport=False):
    if not isinstance(value, dict):
        raise ValueError('Invalid asset descriptor')
    path, size, sha = (value.get(k) for k in ('path', 'bytes', 'sha256'))
    if (not isinstance(sha, str) or not HASH.fullmatch(sha)
            or not isinstance(size, int) or isinstance(size, bool)
            or not 0 < size <= (MAX_TABLE if table else 100_000_000)):
        raise ValueError('Invalid asset byte/SHA binding')
    directory = 'painted-tables' if table else 'painted-assets'
    suffix = r'\.json\.gz' if transport else r'\.json' if table else r'\.(?:json|png)'
    expected = PREFIX + directory + '/' + sha[:2] + '/' + sha
    if not isinstance(path, str) or not re.fullmatch(re.escape(expected) + suffix, path):
        raise ValueError('Asset path differs from SHA binding')
    if transport and (set(value) != {'path', 'bytes', 'sha256', 'encoding'} or value.get('encoding') != 'gzip'):
        raise ValueError('Invalid table transport descriptor')
    return {'path': path, 'bytes': size, 'sha256': sha}


def checked_file(root, row):
    target = root / row['path'].lstrip('/')
    if target.is_symlink() or not target.is_file() or target.stat().st_size != row['bytes']:
        raise ValueError('Asset file/byte count differs: ' + row['path'])
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Asset leaves accepted root')
    with target.open('rb') as stream:
        check_stream(stream, row)
    return target


def check_stream(stream, row):
    digest = hashlib.sha256()
    used = 0
    while chunk := stream.read(min(CHUNK, row['bytes'] - used + 1)):
        used += len(chunk)
        if used > row['bytes']:
            raise ValueError('Asset exceeds original byte bound: ' + row['path'])
        digest.update(chunk)
    if used != row['bytes'] or digest.hexdigest() != row['sha256']:
        raise ValueError('Asset byte/SHA mismatch: ' + row['path'])


def verify(asset_root, resolution, tables):
    if not isinstance(resolution, dict) or resolution.get('missing') != []:
        raise ValueError('Unresolved frozen assets')
    if not isinstance(tables, list) or not isinstance(resolution.get('found'), list):
        raise ValueError('Invalid frozen asset catalog')
    assets = {}
    for item in resolution['found']:
        row = descriptor({**item, 'path': item['resolvedPath']})
        if row['path'] in assets and assets[row['path']] != row:
            raise ValueError('Conflicting frozen asset binding')
        assets[row['path']] = row
    checked_tables = []
    seen = set()
    for item in tables:
        if not isinstance(item, dict) or set(item) not in ({'path', 'bytes', 'sha256'}, {'path', 'bytes', 'sha256', 'transport'}):
            raise ValueError('Invalid original table descriptor')
        original = descriptor(item, table=True)
        if original['path'] in seen:
            raise ValueError('Duplicate original table identity')
        seen.add(original['path'])
        physical = descriptor(item['transport'], table=True, transport=True) if 'transport' in item else original
        checked_tables.append((original, physical, 'transport' in item))
    physical_bytes = 0
    original_bytes = 0
    for row in assets.values():
        checked_file(asset_root, row)
        physical_bytes += row['bytes']
        original_bytes += row['bytes']
    for original, physical, compressed in checked_tables:
        target = checked_file(asset_root, physical)
        if compressed:
            # Physical length/SHA are checked before bounded streaming inflation.
            with target.open('rb') as source, gzip.GzipFile(fileobj=source) as decoded:
                check_stream(decoded, original)
        physical_bytes += physical['bytes']
        original_bytes += original['bytes']
    return {'verified_files': len(assets) + len(checked_tables),
            'verified_bytes': physical_bytes, 'missing': 0,
            'verified_original_bytes': original_bytes,
            'transport_tables': sum(compressed for _, _, compressed in checked_tables)}


def main():
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset_root', type=Path)
    parser.add_argument('--manifest', type=Path, default=repo / 'web/src/safety/frozen-paint-table-manifest.json')
    parser.add_argument('--asset-catalog', type=Path, default=repo / 'reports/building-textures/asset-resolution.json')
    args = parser.parse_args()
    try:
        result = verify(args.asset_root, json.loads(args.asset_catalog.read_text()), json.loads(args.manifest.read_text()))
    except (ValueError, OSError, KeyError, TypeError, EOFError) as error:
        parser.exit(1, f'Frozen asset verification rejected: {error}\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
