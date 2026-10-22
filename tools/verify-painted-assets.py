#!/usr/bin/env python3
"""Verify the separate frozen appearance asset package without changing it."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('asset_root', type=Path)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
resolution = json.loads((repo / 'reports/building-textures/asset-resolution.json').read_text())
tables = json.loads((repo / 'web/src/safety/frozen-paint-table-manifest.json').read_text())
assert not resolution['missing'], 'Unresolved frozen assets'
rows = [{**r, 'path': r['resolvedPath']} for r in resolution['found']] + tables
unique = {r['path']: r for r in rows}
total = 0
for path, row in unique.items():
    target = args.asset_root / path.lstrip('/')
    body = target.read_bytes()
    assert len(body) == row['bytes'], f'Byte count differs: {path}'
    assert hashlib.sha256(body).hexdigest() == row['sha256'], f'Hash differs: {path}'
    total += len(body)
print(json.dumps({'verified_files': len(unique), 'verified_bytes': total, 'missing': 0}))
