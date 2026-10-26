"""Stream a verified frozen asset archive into lossless per-table gzip transport.

Raw descriptor identity is retained. Only transport bytes and a separate digest
are added. No raw numeric table is extracted to disk or uploaded by this tool.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

MAX_TABLE = 64 * 1024**2
MAX_EXPANDED = 1_200_000_000
CHUNK = 1024 * 1024
TABLE_PREFIX = '/safety/buildings3d/painted-tables/'


def file_sha(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def valid_sha(value) -> bool:
    return isinstance(value, str) and bool(re.fullmatch('[a-f0-9]{64}', value))


def pack(archive: Path, archive_sha256: str, manifest_path: Path, asset_catalog: Path,
         output: Path, output_manifest: Path, receipt: Path) -> dict:
    if (not valid_sha(archive_sha256) or archive.is_symlink() or not archive.is_file()
            or archive.stat().st_size > 450_000_000 or file_sha(archive) != archive_sha256):
        raise ValueError('Archive differs from the accepted release binding')
    if output.exists() or output_manifest.exists() or receipt.exists():
        raise ValueError('Output exists; preserve previous checked transport')
    descriptors = json.loads(manifest_path.read_text())
    if not isinstance(descriptors, list) or not descriptors:
        raise ValueError('Expected a frozen table descriptor array')
    required = {}
    by_raw_sha = {}
    for row in descriptors:
        if (set(row) != {'path', 'bytes', 'sha256'} or not valid_sha(row['sha256'])
                or not isinstance(row['bytes'], int) or isinstance(row['bytes'], bool)
                or not 0 < row['bytes'] <= MAX_TABLE
                or row['path'] != TABLE_PREFIX + row['sha256'][:2] + '/' + row['sha256'] + '.json'
                or row['sha256'] in by_raw_sha):
            raise ValueError('Invalid or duplicate raw table identity')
        required[row['path'][1:]] = dict(row, kind='table')
        by_raw_sha[row['sha256']] = row
    asset_rows = json.loads(asset_catalog.read_text())['found']
    for row in asset_rows:
        path = row['resolvedPath']
        if (not valid_sha(row['sha256']) or not isinstance(row['bytes'], int)
                or not 0 < row['bytes'] <= 100_000_000
                or not re.fullmatch(r'/safety/buildings3d/painted-assets/[a-f0-9]{2}/[a-f0-9]{64}\.(?:json|png)', path)
                or path.split('/')[-2] != row['sha256'][:2]
                or not path.split('/')[-1].startswith(row['sha256'] + '.')):
            raise ValueError('Invalid accepted asset identity')
        bound = {'path': path, 'bytes': row['bytes'], 'sha256': row['sha256'], 'kind': 'asset'}
        key = path[1:]
        if key in required and required[key] != bound:
            raise ValueError('Conflicting accepted asset binding')
        required[key] = bound
    expected_total = sum(row['bytes'] for row in required.values())
    if expected_total > MAX_EXPANDED:
        raise ValueError('Accepted raw package exceeds decompression budget')
    output.mkdir(parents=True)
    staging = output / '.pack-staging'
    staging.mkdir()
    seen = set()
    transports = {}
    files = {}
    expanded = 0
    metadata_bytes = 0
    with tarfile.open(archive, 'r|gz') as stream:
        for member in stream:
            path = PurePosixPath(member.name)
            if (path.is_absolute() or '\\' in member.name or any(part in {'..', '.'} for part in path.parts)
                    or not (member.isdir() or member.isfile())):
                raise ValueError('Unsafe archive member')
            if member.isdir():
                continue
            expanded += member.size
            if member.size < 0 or expanded > MAX_EXPANDED:
                raise ValueError('Archive decompression exceeds bound')
            if any(part.startswith('._') for part in path.parts):
                if member.size > 4096:
                    raise ValueError('Unexpected large AppleDouble metadata')
                metadata_bytes += member.size
                continue
            key = path.as_posix()
            if key not in required or key in seen:
                raise ValueError('Unexpected or duplicate archive payload: ' + key)
            bound = required[key]
            if member.size != bound['bytes']:
                raise ValueError('Archive member size differs from accepted binding')
            seen.add(key)
            source = stream.extractfile(member)
            if source is None:
                raise ValueError('Unreadable archive member')
            raw_hash = hashlib.sha256()
            length = 0
            if bound['kind'] == 'table':
                temporary = staging / (bound['sha256'] + '.gz')
                destination = temporary.open('xb')
                writer = gzip.GzipFile(filename='', fileobj=destination, mode='wb', compresslevel=9, mtime=0)
            else:
                temporary = output / key
                temporary.parent.mkdir(parents=True, exist_ok=True)
                destination = temporary.open('xb')
                writer = destination
            try:
                with source:
                    while chunk := source.read(CHUNK):
                        length += len(chunk)
                        if length > bound['bytes']:
                            raise ValueError('Archive member exceeds exact bound')
                        raw_hash.update(chunk)
                        writer.write(chunk)
            finally:
                writer.close()
                destination.close()
            if length != bound['bytes'] or raw_hash.hexdigest() != bound['sha256']:
                raise ValueError('Raw asset differs from the accepted SHA-256')
            if bound['kind'] == 'table':
                physical_sha = file_sha(temporary)
                physical_path = TABLE_PREFIX + physical_sha[:2] + '/' + physical_sha + '.json.gz'
                target = output / physical_path[1:]
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary.replace(target)
                transport = {'path': physical_path, 'bytes': target.stat().st_size,
                             'sha256': physical_sha, 'encoding': 'gzip'}
                transports[bound['sha256']] = transport
                files[physical_path[1:]] = {'bytes': transport['bytes'], 'sha256': physical_sha}
            else:
                files[key] = {'bytes': bound['bytes'], 'sha256': bound['sha256']}
    if seen != set(required):
        raise ValueError('Accepted archive payload is incomplete')
    staging.rmdir()
    enhanced = [dict(row, transport=transports[row['sha256']]) for row in descriptors]
    output_manifest.parent.mkdir(parents=True, exist_ok=True)
    output_manifest.write_text(json.dumps(enhanced, ensure_ascii=False, indent=2) + '\n')
    table_raw_bytes = sum(row['bytes'] for row in descriptors)
    table_transport_bytes = sum(row['bytes'] for row in transports.values())
    total = sum(row['bytes'] for row in files.values())
    result = {'archive_sha256': archive_sha256, 'input_manifest_sha256': file_sha(manifest_path),
              'asset_catalog_sha256': file_sha(asset_catalog),
              'transport_manifest_sha256': file_sha(output_manifest),
              'asset_root': str(output.resolve()), 'raw_table_count': len(descriptors),
              'raw_table_bytes': table_raw_bytes, 'table_transport_bytes': table_transport_bytes,
              'non_table_asset_count': len(files) - len(descriptors),
              'non_table_asset_bytes': total - table_transport_bytes,
              'total_published_asset_bytes': total, 'omitted_appledouble_bytes': metadata_bytes,
              'raw_tables_materialized': False, 'raw_table_descriptor_fields_unchanged': True,
              'gzip': {'mtime': 0, 'filename': '', 'compression_level': 9}, 'files': files}
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('archive', 'manifest', 'asset-catalog', 'output', 'output-manifest', 'receipt'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--expected-archive-sha256', required=True)
    args = parser.parse_args()
    result = pack(args.archive, args.expected_archive_sha256, args.manifest, args.asset_catalog,
                  args.output, args.output_manifest, args.receipt)
    print(json.dumps({key: result[key] for key in ['raw_table_count', 'raw_table_bytes',
          'table_transport_bytes', 'non_table_asset_count', 'total_published_asset_bytes', 'asset_root']}))


if __name__ == '__main__':
    main()
