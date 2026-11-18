"""Project local provenance strings without rewriting any other JSON token.

The returned logical bytes are suitable for a NEW content-addressed descriptor.
Source archives retain their original bytes and identities.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path, PurePosixPath

# Consume a complete JSON string value, never an absolute-looking substring of
# a public HTTPS URL, script text, geometry expression, or object member name.
VALUE = re.compile(rb'(?P<prefix>"(?:[^"\\]|\\.)+"\s*:\s*)"(?P<value>(?:/(?:Users|home)/|[A-Za-z]:\\{2}(?:Users|Documents and Settings)\\{2})(?:[^"\\]|\\.)*)"')
CHECK = re.compile(rb'(?P<separator>["\s])(?:/(?:Users|home)/[^\s"\\/]+/|[A-Za-z]:\\{2}(?:Users|Documents and Settings)\\{2}[^"\\]+\\{2})', re.I)


def evidence_label(locator):
    normalized = locator.replace('\\', '/')
    route = '/safety/buildings3d/'
    if route in normalized:
        root, tail = normalized.split(route, 1)
        public_tail = route + tail
    else:
        root, name = normalized.rsplit('/', 1)
        if not name:
            raise ValueError('Missing evidence filename')
        public_tail = '/' + name
    if '..' in PurePosixPath(public_tail).parts:
        raise ValueError('Invalid evidence route')
    origin = hashlib.sha256(root.encode('utf-8')).hexdigest()[:20]
    return 'source-evidence/' + origin + public_tail


def public_table_bytes(raw):
    if not CHECK.search(raw):
        return raw, []
    spans = []
    chunks = []
    consumed = written = 0
    for match in VALUE.finditer(raw):
        encoded = match['value']
        locator = json.loads(b'"' + encoded + b'"')
        if not CHECK.match(b'"' + encoded):
            raise ValueError('Unexpected local provenance value')
        public = json.dumps(evidence_label(locator), ensure_ascii=False).encode('utf-8')[1:-1]
        start, stop = match.span('value')
        prefix = raw[consumed:start]
        chunks.extend((prefix, public))
        written += len(prefix)
        spans.append((written, len(public), encoded))
        written += len(public)
        consumed = stop
    chunks.append(raw[consumed:])
    published = b''.join(chunks)
    if not spans or CHECK.search(published):
        raise ValueError('Unclassified private locator in painted table')
    return published, spans


def checked_relative(descriptor, compressed=False):
    digest = descriptor['sha256']
    if not re.fullmatch(r'[0-9a-f]{64}', digest) or not 0 < descriptor['bytes'] <= 64 * 1024**2:
        raise ValueError('Invalid table identity or size')
    suffix = '.json.gz' if compressed else '.json'
    expected = f'/safety/buildings3d/painted-tables/{digest[:2]}/{digest}{suffix}'
    if descriptor['path'] != expected:
        raise ValueError('Invalid table address')
    return expected[1:]


def verify_bytes(data, descriptor):
    if len(data) != descriptor['bytes'] or hashlib.sha256(data).hexdigest() != descriptor['sha256']:
        raise ValueError('Table length or digest differs: ' + descriptor['sha256'])


def materialize(source_manifest, public_manifest, aliases, input_roots, output):
    """Migrate verified archive bytes into a fresh, portable table directory."""
    sources = json.loads(source_manifest.read_bytes())
    public = {d['sha256']: d for d in json.loads(public_manifest.read_bytes())}
    mapping = json.loads(aliases.read_bytes())
    if len(public) != len(sources) or set(mapping) - {d['sha256'] for d in sources}:
        raise ValueError('Incomplete canonical source bindings')
    destination = output / 'safety/buildings3d/painted-tables'
    if destination.exists():
        raise ValueError('Output must have a fresh painted-table directory')
    destination.parent.mkdir(parents=True, exist_ok=True)
    seen = set()
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        stage = Path(temporary) / 'tables'
        for original in sources:
            alias = mapping.get(original['sha256'])
            target = public[alias['sha256'] if alias else original['sha256']]
            checked_relative(target)
            if target['sha256'] in seen or alias and alias['sourceBytes'] != original['bytes']:
                raise ValueError('Conflicting canonical source identity')
            seen.add(target['sha256'])
            locations = [(original, False)]
            if original.get('transport'):
                locations.insert(0, (original['transport'], True))
            src = None
            for descriptor, compressed in locations:
                relative = checked_relative(descriptor, compressed)
                src = next((root / relative for root in input_roots if (root / relative).is_file()), None)
                if src is not None:
                    break
            if src is None:
                raise ValueError('Missing bound source table: ' + original['sha256'])
            if src.stat().st_size != descriptor['bytes']:
                raise ValueError('Original transport length differs')
            packed = src.read_bytes()
            verify_bytes(packed, descriptor)
            if compressed:
                with gzip.open(src, 'rb') as decoded:
                    raw = decoded.read(original['bytes'] + 1)
            else:
                raw = packed
            verify_bytes(raw, original)
            clean, changes = public_table_bytes(raw)
            verify_bytes(clean, target)
            if bool(alias) != bool(changes):
                raise ValueError('Canonical privacy projection differs from its binding')
            physical = target.get('transport', target)
            relative = Path(checked_relative(physical, 'transport' in target)).relative_to('safety/buildings3d/painted-tables')
            if 'transport' not in target:
                result = clean
            elif not changes and compressed and original['transport'] == physical:
                result = packed
            elif changes:
                result = gzip.compress(clean, compresslevel=6, mtime=0)
            else:
                result = gzip.compress(clean, compresslevel=9, mtime=0)
            if 'transport' in target and hashlib.sha256(result).hexdigest() != physical['sha256']:
                # CPython/zlib versions can select a different gzip OS header.
                # Only accept a byte sequence matching the pre-existing pin.
                candidates = (result[:9] + bytes([os_tag]) + result[10:] for os_tag in (3, 255))
                result = next((data for data in candidates if hashlib.sha256(data).hexdigest() == physical['sha256']), result)
            verify_bytes(result, physical)
            path = stage / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(result)
        if seen != public.keys():
            raise ValueError('Missing public canonical table')
        os.rename(stage, destination)
    return len(seen)


if __name__ == '__main__':
    repo = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-manifest', required=True, type=Path)
    parser.add_argument('--input-root', required=True, action='append', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--public-manifest', type=Path, default=repo / 'web/src/safety/frozen-paint-table-manifest.json')
    parser.add_argument('--aliases', type=Path, default=repo / 'web/src/safety/frozen-paint-source-aliases.json')
    args = parser.parse_args()
    count = materialize(args.source_manifest, args.public_manifest, args.aliases, args.input_root, args.output)
    print(json.dumps({'verifiedPublicCanonicalTables': count}))
