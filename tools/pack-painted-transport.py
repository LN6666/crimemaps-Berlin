"""Package verified frozen tables and public building assets from a bound archive.

Numeric tables retain their raw identity and get deterministic gzip transport.
Mapped JSON assets retain their source identity in the input catalog and publish
only the verified public representation.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile
import tempfile

from painted_table_provenance import public_table_bytes

MAX_TABLE = 64 * 1024**2
MAX_EXPANDED = 1_200_000_000
CHUNK = 1024 * 1024
TABLE_PREFIX = '/safety/buildings3d/painted-tables/'


def file_sha(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def valid_sha(value) -> bool:
    return isinstance(value, str) and bool(re.fullmatch('[a-f0-9]{64}', value))


def asset_binding(path, size, digest):
    if (not valid_sha(digest) or type(size) is not int or not 0 < size <= 100_000_000
            or not isinstance(path, str) or path not in {
                f'/safety/buildings3d/painted-assets/{digest[:2]}/{digest}.json',
                f'/safety/buildings3d/painted-assets/{digest[:2]}/{digest}.png',
            }):
        raise ValueError('Invalid accepted asset identity')
    return {'path': path, 'bytes': size, 'sha256': digest}


def check_bytes(data, binding):
    if len(data) != binding['bytes'] or hashlib.sha256(data).hexdigest() != binding['sha256']:
        raise ValueError('Raw asset differs from the accepted size or SHA-256')


def archive_bindings(descriptors, asset_rows):
    required = {}
    inputs = {}
    for row in descriptors:
        if (set(row) != {'path', 'bytes', 'sha256'} or not valid_sha(row['sha256'])
                or type(row['bytes']) is not int or not 0 < row['bytes'] <= MAX_TABLE
                or row['path'] != TABLE_PREFIX + row['sha256'][:2] + '/' + row['sha256'] + '.json'
                or row['path'][1:] in required):
            raise ValueError('Invalid or duplicate raw table identity')
        key = row['path'][1:]
        required[key] = dict(row, kind='table')
        inputs[key] = key

    for row in asset_rows:
        public = asset_binding(row['resolvedPath'], row['bytes'], row['sha256'])
        key = public['path'][1:]
        bound = dict(public, kind='asset')
        routes = [key]
        if 'sourceAsset' in row:
            old = row['sourceAsset']
            if not isinstance(old, dict) or set(old) != {'path', 'bytes', 'sha256'}:
                raise ValueError('Invalid original asset descriptor')
            source = asset_binding(old['path'], old['bytes'], old['sha256'])
            if (not public['path'].endswith('.json') or not source['path'].endswith('.json')
                    or source['sha256'] == public['sha256']):
                raise ValueError('Invalid original JSON provenance binding')
            bound['sourceAsset'] = source
            routes.append(source['path'][1:])
        if key in required and required[key] != bound:
            raise ValueError('Conflicting accepted asset binding')
        required[key] = bound
        for route in routes:
            if route in inputs and inputs[route] != key:
                raise ValueError('Archive member matches multiple accepted assets')
            inputs[route] = key
    if sum(row['bytes'] for row in required.values()) > MAX_EXPANDED:
        raise ValueError('Accepted raw package exceeds decompression budget')
    return required, inputs


def write_archive(archive, root, staging, required, inputs):
    seen = set()
    transports = {}
    files = {}
    expanded = metadata_bytes = 0
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
            target = inputs.get(key)
            if target is None or target in seen:
                raise ValueError('Unexpected or duplicate archive payload: ' + key)
            bound = required[target]
            projecting = key != target
            incoming = bound['sourceAsset'] if projecting else bound
            if member.size != incoming['bytes']:
                raise ValueError('Archive member size differs from accepted binding')
            source = stream.extractfile(member)
            if source is None:
                raise ValueError('Unreadable archive member')
            with source:
                if bound['kind'] == 'asset' and target.endswith('.json'):
                    raw = source.read(incoming['bytes'] + 1)
                    check_bytes(raw, incoming)
                    clean, changes = public_table_bytes(raw)
                    if bool(changes) != projecting:
                        raise ValueError('JSON provenance differs from the accepted source/public binding')
                    check_bytes(clean, bound)
                    destination = root / target
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with destination.open('xb') as writer:
                        writer.write(clean)
                else:
                    temporary = staging / bound['sha256']
                    hasher = hashlib.sha256()
                    length = 0
                    with temporary.open('xb') as destination:
                        writer = (gzip.GzipFile(filename='', fileobj=destination, mode='wb', compresslevel=9, mtime=0)
                                  if bound['kind'] == 'table' else destination)
                        with writer:
                            while chunk := source.read(CHUNK):
                                length += len(chunk)
                                if length > incoming['bytes']:
                                    raise ValueError('Archive member exceeds exact bound')
                                hasher.update(chunk)
                                writer.write(chunk)
                    if length != incoming['bytes'] or hasher.hexdigest() != incoming['sha256']:
                        raise ValueError('Raw asset differs from the accepted SHA-256')
                    if bound['kind'] == 'table':
                        physical_sha = file_sha(temporary)
                        physical_path = TABLE_PREFIX + physical_sha[:2] + '/' + physical_sha + '.json.gz'
                        transport = {'path': physical_path, 'bytes': temporary.stat().st_size,
                                     'sha256': physical_sha, 'encoding': 'gzip'}
                        transports[bound['sha256']] = transport
                        target = physical_path[1:]
                    destination = root / target
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    temporary.rename(destination)
            seen.add(inputs[key])
            physical = transports[bound['sha256']] if bound['kind'] == 'table' else bound
            files[target] = {'bytes': physical['bytes'], 'sha256': physical['sha256']}
    if seen != set(required):
        raise ValueError('Accepted archive payload is incomplete')
    return transports, dict(sorted(files.items())), metadata_bytes


def pack(archive: Path, archive_sha256: str, manifest_path: Path, asset_catalog: Path,
         output: Path, output_manifest: Path, receipt: Path) -> dict:
    if (not valid_sha(archive_sha256) or archive.is_symlink() or not archive.is_file()
            or archive.stat().st_size > 450_000_000 or file_sha(archive) != archive_sha256):
        raise ValueError('Archive differs from the accepted release binding')
    if any(p.exists() or p.is_symlink() for p in (output, output_manifest, receipt)):
        raise ValueError('Output exists; preserve previous checked transport')
    descriptors = json.loads(manifest_path.read_text())
    if not isinstance(descriptors, list) or not descriptors:
        raise ValueError('Expected a frozen table descriptor array')
    required, inputs = archive_bindings(descriptors, json.loads(asset_catalog.read_text())['found'])
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as temporary:
        staging = Path(temporary)
        root = staging / 'published'
        root.mkdir()
        transports, files, metadata_bytes = write_archive(archive, root, staging, required, inputs)
        enhanced = [dict(row, transport=transports[row['sha256']]) for row in descriptors]
        manifest_bytes = (json.dumps(enhanced, ensure_ascii=False, indent=2) + '\n').encode()
        table_transport_bytes = sum(row['bytes'] for row in transports.values())
        total = sum(row['bytes'] for row in files.values())
        result = {'archive_sha256': archive_sha256, 'input_manifest_sha256': file_sha(manifest_path),
                  'asset_catalog_sha256': file_sha(asset_catalog),
                  'transport_manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(),
                  'asset_root': str(output.resolve()), 'raw_table_count': len(descriptors),
                  'raw_table_bytes': sum(row['bytes'] for row in descriptors),
                  'table_transport_bytes': table_transport_bytes, 'non_table_asset_count': len(files) - len(descriptors),
                  'non_table_asset_bytes': total - table_transport_bytes, 'total_published_asset_bytes': total,
                  'omitted_appledouble_bytes': metadata_bytes, 'raw_tables_materialized': False,
                  'raw_table_descriptor_fields_unchanged': True,
                  'gzip': {'mtime': 0, 'filename': '', 'compression_level': 9}, 'files': files}
        receipt_bytes = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
        external = []
        try:
            for path, data in ((output_manifest, manifest_bytes), (receipt, receipt_bytes)):
                absolute = path.resolve()
                inside = absolute.is_relative_to(output.resolve())
                target = root / absolute.relative_to(output.resolve()) if inside else path
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open('xb') as writer:
                    if not inside:
                        external.append(target)
                    writer.write(data)
            root.rename(output)
        except BaseException:
            for path in external:
                path.unlink()
            raise
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
