"""Deterministic focus-road append for decorative-schematic city scenery.

The historical generator (``prepare-city-scenery.py``) selected at most 256
roads per city from a sparse grid.  This tool never re-samples that subset.
It re-derives the generator's eligible rows with the same rules, proves the
published parent rows are reproduced byte-for-byte, and appends eligible rows
within a declared radius of declared focus centres, ordered by
(metric distance, row index).  The parent rows, their order and the file
header stay byte-identical; only the index fields ``data.path``,
``data.bytes`` and ``data.sha256`` change.

Sub-commands:

``generate``     write ``safety/buildings3d/scenery-index.json``, the new
                 content-addressed data file and ``proof.json`` into a new
                 ``--out`` directory.
``derive-site``  clone one parent site with APFS ``cp -c -R`` into a new run,
                 replace the index, add the data file, recompute the full site
                 inventory and write receipts.  The parent run is never edited.

Offline only: no network requests, no PBF re-scan, no publication.  Cars are a
schematic animation along a subset of OSM roads, not traffic observations.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import pyproj
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import transform

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from crimemapsberlin.poi_cities import POI_CITY_SPECS

LIBRARY_PINS = {"shapely": "2.1.2", "geos": "3.13.1", "pyproj": "3.8.0", "proj": "9.8.1"}
INDEX_RELATIVE = "safety/buildings3d/scenery-index.json"
DATA_PREFIX = "/safety/buildings3d/"
SITE_LIMIT_BYTES = 900_000_000
# MapLibre default vertical field of view and 512 px tiles, used only for the coverage assertion.
MAPLIBRE_FOV = 0.6435011087932844
TILE_SIZE = 512


class FocusError(Exception):
    """A refusal: inputs, invariants or limits do not hold. Nothing is written."""


def require(condition, message):
    if not condition:
        raise FocusError(message)


@dataclass(frozen=True)
class Limits:
    """Runtime parser limits (vehicle-scenery-data.ts / three-dimensional-scenery.ts)."""

    roads: int = 4096
    positions: int = 100_000
    bytes: int = 1024**2


RUNTIME_LIMITS = Limits()

# ---- generator rules, copied from prepare-city-scenery.py:14-22 (logic unchanged) ----
allowed = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street',
           'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
open_access = {'', 'yes', 'permissive', 'designated'}
inactive = {'construction', 'proposed', 'disused', 'abandoned', 'razed'}


def eligible(t):
    if t.get('highway') not in allowed or t.get('area') == 'yes': return False
    if any(t.get(k) not in [None, '', 'no', 'false', '0'] for k in ['bridge', 'tunnel', 'covered']): return False
    if t.get('layer') not in [None, '', '0'] or any(k in t for k in ['height', 'min_height', 'ele']): return False
    if any(t.get(k, '').strip().lower() not in open_access or k + ':conditional' in t
           for k in ['access', 'vehicle', 'motor_vehicle', 'motorcar']): return False
    if t.get('oneway') not in [None, '', 'yes', 'no', '1', '-1', 'true', 'false', '0']: return False
    return not (t.get('state') in inactive or any(t.get(x) not in [None, '', 'no', 'false', '0'] for x in inactive)
                or any(t.get(x + ':highway') not in [None, '', 'no', 'false', '0'] for x in inactive))


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def file_sha(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def dumps(value) -> bytes:
    """The generator's serialization: compact UTF-8 JSON, insertion order kept."""
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def library_versions() -> dict:
    return {"shapely": shapely.__version__, "geos": shapely.geos_version_string, "pyproj": pyproj.__version__,
            "proj": pyproj.proj_version_str}


def site_dir_name(city: str) -> str:
    return "crimemaps-" + city[:1].upper() + city[1:]


# ---- re-derivation of eligible rows (prepare-city-scenery.py:30-50, file-input branch) ----
def derive_rows(city: str, road_source_raw: bytes, inventory: dict, boundary_raw: bytes):
    """Return (rows, to_m, held) exactly as the generator builds ``rows`` before sampling."""
    source = inventory['source']
    require(digest(boundary_raw) == inventory['source_boundary_sha256'], "boundary sha differs from source inventory")
    items = []
    for line in road_source_raw.decode().splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        require(item['city'] == city and item['source_pbf_sha256'] == source['sha256']
                and item['source_boundary_sha256'] == digest(boundary_raw), "road source row has another identity")
        items.append((int(item['source_id'].split('/')[-1]), item['source_tags'], item['geometry'], item['segment_id']))
    boundary = json.loads(boundary_raw)
    require(boundary['name'] == POI_CITY_SPECS[city].name and boundary['within_expected_area']
            and boundary['id'].startswith('osm/relation/'), "boundary is not the declared municipal relation")
    border = shape(boundary['geometry'])
    require(border.is_valid and not border.is_empty, "boundary geometry invalid")
    epsg = POI_CITY_SPECS[city].epsg
    to_m = Transformer.from_crs(4326, epsg, always_xy=True).transform
    from_m = Transformer.from_crs(epsg, 4326, always_xy=True).transform
    safe = transform(from_m, transform(to_m, border).buffer(-5))
    rows = []
    held = collections.Counter()
    nextpart = collections.Counter()
    for ident, tags, geometry, inputSegment in sorted(items, key=lambda x: (x[0], x[3] or '')):
        if not eligible(tags):
            held['not_eligible'] += 1
            continue
        g = shape(geometry)
        if g.geom_type not in ['LineString', 'MultiLineString']:
            held['not_native_line'] += 1
            continue
        clipped = g.intersection(safe)
        lines = ([clipped] if clipped.geom_type == 'LineString'
                 else list(clipped.geoms) if clipped.geom_type == 'MultiLineString' else [])
        for line in lines:
            if line.is_empty or line.length < .00015:
                continue
            require(border.covers(line), "clipped line not covered by boundary")
            part = nextpart[ident]
            nextpart[ident] += 1
            rows.append({'id': f'osm/way/{ident}/clip/{part}', 'source_way_id': ident,
                         'coordinates': list(map(list, line.coords)),
                         'direction': -1 if tags.get('oneway') == '-1' else 1, 'source_tags': tags,
                         'source_url': f'https://www.openstreetmap.org/way/{ident}',
                         **({'source_input_segment': inputSegment} if inputSegment else {})})
    return rows, to_m, held


# ---- MapLibre-equivalent ground footprint, coverage assertion only ----
def _merc_px(lon, lat, world):
    return ((lon + 180.0) / 360.0 * world,
            (1 - math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) / math.pi) / 2 * world)


def _unmerc_px(x, y, world):
    return x / world * 360.0 - 180.0, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / world))))


def _screen_to_lnglat(sx, sy, center, zoom, pitch_deg, bearing_deg, width, height):
    world = TILE_SIZE * 2 ** zoom
    cx, cy = _merc_px(center[0], center[1], world)
    f = 0.5 / math.tan(MAPLIBRE_FOV / 2) * height
    th = math.radians(pitch_deg)
    h = f * math.cos(th)
    xoff = sx - width / 2.0
    t = (height / 2.0 - sy) / f
    den = math.cos(th) - t * math.sin(th)
    require(den > 0, "focus camera footprint reaches the horizon; coverage assertion undefined")
    z = h / den
    fwd = z * (math.sin(th) + t * math.cos(th)) - f * math.sin(th)
    lateral = xoff / f * z
    b = math.radians(bearing_deg)
    gx = cx + fwd * math.sin(b) + lateral * math.cos(b)
    gy = cy + fwd * -math.cos(b) + lateral * math.sin(b)
    return _unmerc_px(gx, gy, world)


def camera_footprint(center, camera) -> list:
    width, height = camera['canvasCss']
    return [_screen_to_lnglat(x, y, center, camera['zoom'], camera['pitch'], camera['bearing'], width, height)
            for x, y in [(0, 0), (width, 0), (width, height), (0, height)]]


# ---- selection ----
def select_focus_rows(rows, to_m, focus_list, parent_ids):
    """Rows within each focus radius not in the parent, by (distance, row index); foci merged in order."""
    metric = [transform(to_m, LineString(row['coordinates'])) for row in rows]
    chosen = []
    chosen_set = set()
    report = []
    for focus in focus_list:
        center = Point(*to_m(*focus['center']))
        radius = float(focus['radiusMetres'])
        require(radius > 0, "focus radius must be positive")
        ranked = sorted((center.distance(line), i) for i, line in enumerate(metric))
        picked = [(d, i) for d, i in ranked
                  if d <= radius and rows[i]['id'] not in parent_ids and i not in chosen_set]
        for _, i in picked:
            chosen.append(i)
            chosen_set.add(i)
        coverage = None
        if focus.get('camera'):
            corners = camera_footprint(focus['center'], focus['camera'])
            footprint = transform(to_m, Polygon(corners))
            in_view = [i for i, line in enumerate(metric) if line.intersects(footprint)]
            missing = [rows[i]['id'] for i in in_view if rows[i]['id'] not in parent_ids and i not in chosen_set]
            require(not missing, f"focus {focus['id']}: eligible rows in the camera footprint not selected: {missing}")
            coverage = {'eligibleRowsInFootprint': len(in_view),
                        'eligibleRowIdsInFootprint': [rows[i]['id'] for i in in_view],
                        'footprintFarthestCornerMetres': max(center.distance(Point(*to_m(*c))) for c in corners),
                        'allSelected': True}
        report.append({'id': focus['id'], 'center': focus['center'], 'radiusMetres': radius,
                       'appended': [{'id': rows[i]['id'], 'rowIndex': i, 'distanceMetres': d,
                                     'lengthMetres': metric[i].length, 'positions': len(rows[i]['coordinates'])}
                                    for d, i in picked],
                       'cameraCoverage': coverage})
    return chosen, report


# ---- generate ----
def _load_json_bytes(path: Path):
    raw = path.read_bytes()
    return raw, json.loads(raw)


def _check_pin(label, actual, pins, key):
    expected = pins.get(key)
    require(expected is not None, f"focus declaration lacks pin {key}")
    require(actual == expected, f"{label} sha256 {actual} differs from pinned {expected}")


def generate(*, city, focus_path, road_source, source_inventory, boundary, parent_site, parent_inventory, out,
             limits: Limits = RUNTIME_LIMITS, library_pins=LIBRARY_PINS) -> dict:
    out = Path(out)
    require(not out.exists(), f"output directory already exists: {out}")
    versions = library_versions()
    require(versions == library_pins, f"library versions {versions} differ from pins {library_pins}")
    require(city in POI_CITY_SPECS, f"unknown city {city}")

    focus_raw, declaration = _load_json_bytes(Path(focus_path))
    require(declaration.get('schema') == 1 and declaration.get('city') == city, "focus declaration city/schema")
    focus_list = declaration['focus']
    require(focus_list and len({f['id'] for f in focus_list}) == len(focus_list), "focus ids empty or duplicated")
    pins = declaration['pins']

    road_raw = Path(road_source).read_bytes()
    inventory_raw, inventory = _load_json_bytes(Path(source_inventory))
    boundary_raw = Path(boundary).read_bytes()
    _check_pin('road source', digest(road_raw), pins, 'roadSourceSHA256')
    _check_pin('source inventory', digest(inventory_raw), pins, 'sourceInventorySHA256')
    _check_pin('boundary', digest(boundary_raw), pins, 'boundarySHA256')
    require(inventory.get('city') == city, "source inventory city")
    _check_pin('source pbf', inventory['source']['sha256'], pins, 'sourcePbfSHA256')

    parent_site = Path(parent_site)
    index_raw, index = _load_json_bytes(parent_site / INDEX_RELATIVE)
    _check_pin('parent index', digest(index_raw), pins, 'parentIndexSHA256')
    require(dumps(index) == index_raw, "parent index is not reproducible by the generator serialization")
    data_path = index['data']['path']
    require(data_path.startswith(DATA_PREFIX) and '/' not in data_path[len(DATA_PREFIX):], "parent data path shape")
    parent_raw = (parent_site / data_path.lstrip('/')).read_bytes()
    parent_sha = digest(parent_raw)
    _check_pin('parent data', parent_sha, pins, 'parentDataSHA256')
    require(index['data']['bytes'] == len(parent_raw) and index['data']['sha256'] == parent_sha
            and data_path == f'{DATA_PREFIX}scenery-{parent_sha}.json', "parent index does not describe parent data")
    parent_inventory_raw, parent_inventory_doc = _load_json_bytes(Path(parent_inventory))
    _check_pin('parent inventory', digest(parent_inventory_raw), pins, 'parentInventorySHA256')
    parent_files = parent_inventory_doc['files']
    require(parent_files.get(INDEX_RELATIVE) == {'bytes': len(index_raw), 'sha256': digest(index_raw)},
            "parent inventory entry for the index differs")
    require(parent_files.get(data_path.lstrip('/')) == {'bytes': len(parent_raw), 'sha256': parent_sha},
            "parent inventory entry for the data differs")

    parent = json.loads(parent_raw)
    require(dumps(parent) == parent_raw, "parent data is not reproducible by the generator serialization")
    require(list(parent)[-1] == 'roads', "parent roads must be the last key for the prefix property")
    source = inventory['source']
    require(parent['schema_version'] == 1 and parent['city'] == city and parent['role'] == 'decorative-schematic'
            and parent['partial'] is True and parent['source_pbf_sha256'] == source['sha256']
            and parent['source_snapshot'] == source['pbf_timestamp'] and parent['source_url'] == source['url']
            and parent['city_boundary_sha256'] == digest(boundary_raw), "parent data header identity")
    require(index['city'] == city and index['source_pbf_sha256'] == source['sha256']
            and index['snapshot'] == source['pbf_timestamp'], "parent index header identity")

    rows, to_m, held = derive_rows(city, road_raw, inventory, boundary_raw)
    by_id = {row['id']: i for i, row in enumerate(rows)}
    require(len(by_id) == len(rows), "re-derived row ids are not unique")
    parent_ids = set()
    for road in parent['roads']:
        i = by_id.get(road['id'])
        require(i is not None, f"parent road {road['id']} is not a re-derived eligible row")
        require(dumps(rows[i]) == dumps(road), f"parent road {road['id']} differs from its re-derived row")
        require(road['id'] not in parent_ids, f"parent road {road['id']} duplicated")
        parent_ids.add(road['id'])

    chosen, focus_report = select_focus_rows(rows, to_m, focus_list, parent_ids)
    appended = [rows[i] for i in chosen]
    for row in appended:
        tags = row['source_tags']
        require(eligible(tags) and row['direction'] == (-1 if tags.get('oneway') == '-1' else 1),
                f"appended row {row['id']} fails eligibility or direction")

    data = dict(parent)
    data['roads'] = parent['roads'] + appended
    raw = dumps(data)
    positions = sum(len(row['coordinates']) for row in data['roads'])
    require(len(data['roads']) <= limits.roads, f"{len(data['roads'])} roads exceed limit {limits.roads}")
    require(positions <= limits.positions, f"{positions} positions exceed limit {limits.positions}")
    require(len(raw) <= limits.bytes, f"{len(raw)} bytes exceed limit {limits.bytes}")
    prefix = parent_raw[:-2]
    require(parent_raw.endswith(b']}') and raw[:len(prefix)] == prefix
            and (not appended or raw[len(prefix):len(prefix) + 1] == b','), "prefix property violated")
    sha = digest(raw)
    name = f'scenery-{sha}.json'

    new_index = json.loads(index_raw)
    new_index['data'] = dict(index['data'], path=DATA_PREFIX + name, bytes=len(raw), sha256=sha)
    require({k: v for k, v in new_index.items() if k != 'data'} == {k: v for k, v in index.items() if k != 'data'}
            and list(new_index['data']) == list(index['data'])
            and {k: v for k, v in new_index['data'].items() if k not in ('path', 'bytes', 'sha256')}
            == {k: v for k, v in index['data'].items() if k not in ('path', 'bytes', 'sha256')},
            "index changed beyond data.path/bytes/sha256")
    index_out = dumps(new_index)

    tool_raw = Path(__file__).read_bytes()
    parent_positions = sum(len(row['coordinates']) for row in parent['roads'])
    proof = {
        'schema': 1,
        'city': city,
        'tool': {'path': 'scripts/safety/scenery_focus_roads.py', 'sha256': digest(tool_raw)},
        'focusDeclaration': {'path': str(Path(focus_path).resolve()), 'sha256': digest(focus_raw)},
        'interpreter': {'python': sys.version.split()[0], **versions},
        'inputs': {
            'roadSource': {'path': str(Path(road_source).resolve()), 'sha256': digest(road_raw), 'bytes': len(road_raw)},
            'sourceInventory': {'path': str(Path(source_inventory).resolve()), 'sha256': digest(inventory_raw)},
            'boundary': {'path': str(Path(boundary).resolve()), 'sha256': digest(boundary_raw)},
            'sourcePbfSHA256': source['sha256'],
            'parentSite': str(parent_site.resolve()),
            'parentIndex': {'sha256': digest(index_raw), 'bytes': len(index_raw)},
            'parentData': {'path': data_path, 'sha256': parent_sha, 'bytes': len(parent_raw)},
            'parentInventory': {'path': str(Path(parent_inventory).resolve()), 'sha256': digest(parent_inventory_raw)},
        },
        'rederivedEligibleRows': len(rows),
        'heldCounts': dict(sorted(held.items())),
        'bufferEPSG': POI_CITY_SPECS[city].epsg,
        'bodyMarginMetres': 5,
        'parentRoads': len(parent['roads']),
        'parentRoadsByteIdentical': True,
        'parentPositions': parent_positions,
        'focus': focus_report,
        'appendedRoads': len(appended),
        'outputRoads': len(data['roads']),
        'outputPositions': positions,
        'output': {
            'data': {'path': DATA_PREFIX + name, 'bytes': len(raw), 'sha256': sha},
            'index': {'path': '/' + INDEX_RELATIVE, 'bytes': len(index_out), 'sha256': digest(index_out)},
        },
        'limits': {'roads': limits.roads, 'positions': limits.positions, 'bytes': limits.bytes},
        'ordering': '(metric distance to focus centre, re-derived row index); foci merged in declaration order',
        'prefixProperty': True,
        'indexFieldsChanged': ['data.path', 'data.bytes', 'data.sha256'],
        'network_requests': 0,
        'pbf_rescans': 0,
        'partial': True,
        'first_parent_roads_byte_identical': True,
        'publication_performed': False,
    }
    target = out / 'safety/buildings3d'
    target.mkdir(parents=True)
    with (target / name).open('xb') as handle:
        handle.write(raw)
    with (out / INDEX_RELATIVE).open('xb') as handle:
        handle.write(index_out)
    with (out / 'proof.json').open('x') as handle:
        handle.write(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    return proof


# ---- derive-site ----
def site_inventory(root: Path) -> dict:
    result = {}
    for path in sorted(root.rglob('*')):
        require(not path.is_symlink(), f"unexpected symlink {path}")
        if path.is_file():
            result[path.relative_to(root).as_posix()] = {'bytes': path.stat().st_size, 'sha256': file_sha(path)}
        else:
            require(path.is_dir(), f"unexpected non-regular path {path}")
    return result


def data_identity(files: dict) -> dict:
    entries = {p: v for p, v in files.items()
               if any(p.startswith(k + '/') for k in ['safety', 'report-bodies', 'statistics', 'assets/3d-materials'])}
    raw = json.dumps(entries, sort_keys=True, separators=(',', ':')).encode()
    return {'sha256': hashlib.sha256(raw).hexdigest(), 'files': len(entries),
            'bytes': sum(v['bytes'] for v in entries.values())}


def _save_new(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')


def apfs_clone(source: Path, destination: Path):
    """Copy-on-write directory clone (macOS APFS); data blocks are shared until written."""
    subprocess.run(['cp', '-c', '-R', str(source), str(destination)], check=True)


def derive_site(*, city, generated, parent_run, out_run, min_free_bytes, clone=apfs_clone) -> dict:
    generated = Path(generated)
    parent_run = Path(parent_run)
    out_run = Path(out_run)
    require(not out_run.exists(), f"derived run already exists: {out_run}")
    proof_raw, proof = _load_json_bytes(generated / 'proof.json')
    require(proof['city'] == city, "generated proof city")
    site = site_dir_name(city)
    parent_site = parent_run / 'sites' / site
    require(Path(proof['inputs']['parentSite']) == parent_site.resolve(), "generated output has another parent site")
    parent_inventory_path = parent_run / f'receipts/{city}-site-inventory.json'
    require(file_sha(parent_inventory_path) == proof['inputs']['parentInventory']['sha256'],
            "parent inventory differs from the generated proof")
    parent_index_sha = proof['inputs']['parentIndex']['sha256']
    require(file_sha(parent_site / INDEX_RELATIVE) == parent_index_sha, "parent index changed since generation")
    new_index_raw = (generated / INDEX_RELATIVE).read_bytes()
    data_rel = proof['output']['data']['path'].lstrip('/')
    new_data_raw = (generated / data_rel).read_bytes()
    require(digest(new_index_raw) == proof['output']['index']['sha256']
            and digest(new_data_raw) == proof['output']['data']['sha256'], "generated files differ from proof")
    free = shutil.disk_usage(out_run.parent).free
    require(free >= min_free_bytes, f"free disk {free} B below floor {min_free_bytes} B")

    before = json.loads(parent_inventory_path.read_text())['files']
    require(data_rel not in before, "new data path already in parent inventory")
    parent_success = json.loads((parent_run / f'receipts/{city}-SUCCESS.json').read_text())
    old_capacity = parent_success['capacity']
    require(sum(v['bytes'] for v in before.values()) == old_capacity['expanded_site_bytes']
            and len(before) == old_capacity['file_count'], "parent capacity row differs from parent inventory")

    out_run.mkdir()
    (out_run / 'sites').mkdir()
    destination = out_run / 'sites' / site
    clone(parent_site, destination)
    target_index = destination / INDEX_RELATIVE
    require(not os.path.samefile(parent_site / INDEX_RELATIVE, target_index)
            and file_sha(target_index) == parent_index_sha, "clone did not produce an independent index copy")
    target_index.unlink()
    with target_index.open('xb') as handle:
        handle.write(new_index_raw)
    with (destination / data_rel).open('xb') as handle:
        handle.write(new_data_raw)
    require(file_sha(parent_site / INDEX_RELATIVE) == parent_index_sha, "parent index changed during derivation")

    expected = dict(before)
    expected[INDEX_RELATIVE] = {'bytes': len(new_index_raw), 'sha256': digest(new_index_raw)}
    expected[data_rel] = {'bytes': len(new_data_raw), 'sha256': digest(new_data_raw)}
    actual = site_inventory(destination)
    require(actual == expected, "derived site differs beyond the scenery index and new data file")
    changed = sorted(p for p in actual if before.get(p) != actual[p])
    require(changed == sorted([INDEX_RELATIVE, data_rel]), f"unexpected changed paths {changed}")
    total = sum(v['bytes'] for v in actual.values())
    require(total < SITE_LIMIT_BYTES, f"site {total} B not below {SITE_LIMIT_BYTES} B")
    parent_data_rel = proof['inputs']['parentData']['path'].lstrip('/')
    require(actual[parent_data_rel] == before[parent_data_rel], "parent data file must stay in the derived site")
    require(file_sha(parent_inventory_path) == proof['inputs']['parentInventory']['sha256'],
            "parent inventory changed during derivation")

    receipts = out_run / 'receipts'
    inventory_path = receipts / f'{city}-site-inventory.json'
    _save_new(inventory_path, {'files': actual, 'physical_file_bytes': total})
    capacity = {**old_capacity, 'expanded_site_bytes': total, 'remaining_bytes_under_900mb': SITE_LIMIT_BYTES - total,
                'file_count': len(actual),
                'measurement': 'Actual complete site after the deterministic scenery focus-road append; '
                               'all other file paths and bytes equal the parent inventory.'}
    overlay = {'city': city, 'parent_run': str(parent_run.resolve()),
               'parent_inventory_sha256': proof['inputs']['parentInventory']['sha256'],
               'changed_paths': changed,
               'before': {INDEX_RELATIVE: before[INDEX_RELATIVE], data_rel: None},
               'after': {INDEX_RELATIVE: actual[INDEX_RELATIVE], data_rel: actual[data_rel]},
               'retained_unreferenced_scenery': sorted(p for p in actual if p.startswith('safety/buildings3d/scenery-')
                                                       and p not in (INDEX_RELATIVE, data_rel)),
               'before_data_identity': data_identity(before), 'after_data_identity': data_identity(actual),
               'generation_proof_sha256': digest(proof_raw), 'tool_sha256': file_sha(Path(__file__)),
               'source_scientific_records_changed': False, 'publication_performed': False}
    _save_new(receipts / f'{city}-scenery-overlay.json', overlay)
    _save_new(receipts / f'{city}-SUCCESS.json',
              {'city': city, 'status': 'local-scenery-focus-append-verified',
               'local_source_commit': parent_success.get('local_source_commit'), 'parent_run': str(parent_run.resolve()),
               'capacity': capacity, 'publication_ready': False, 'publication_performed': False})
    derivation = {'schema': 1, 'parent_run': str(parent_run.resolve()),
                  'parent_inventory_sha256': proof['inputs']['parentInventory']['sha256'], 'scope': [city],
                  'transform_script_sha256': file_sha(Path(__file__)), 'generation_proof_sha256': digest(proof_raw),
                  'changed_paths': changed, 'all_fourteen_assembled': False, 'publication_performed': False}
    _save_new(out_run / 'DERIVATION.json', derivation)
    return {'inventory_sha256': file_sha(inventory_path), 'files': len(actual), 'bytes': total, 'changed': changed}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    sub = parser.add_subparsers(dest='command', required=True)
    gen = sub.add_parser('generate')
    gen.add_argument('--city', required=True)
    gen.add_argument('--focus', required=True)
    gen.add_argument('--road-source', required=True)
    gen.add_argument('--source-inventory', required=True)
    gen.add_argument('--boundary', required=True)
    gen.add_argument('--parent-site', required=True)
    gen.add_argument('--parent-inventory', required=True)
    gen.add_argument('--out', required=True)
    der = sub.add_parser('derive-site')
    der.add_argument('--city', required=True)
    der.add_argument('--generated', required=True)
    der.add_argument('--parent-run', required=True)
    der.add_argument('--out-run', required=True)
    der.add_argument('--min-free-gib', type=float, default=32.3)
    args = parser.parse_args(argv)
    try:
        if args.command == 'generate':
            proof = generate(city=args.city, focus_path=args.focus, road_source=args.road_source,
                             source_inventory=args.source_inventory, boundary=args.boundary,
                             parent_site=args.parent_site, parent_inventory=args.parent_inventory, out=args.out)
            print(json.dumps({'rows': proof['rederivedEligibleRows'], 'parentRoads': proof['parentRoads'],
                              'appended': proof['appendedRoads'], 'roads': proof['outputRoads'],
                              'positions': proof['outputPositions'], **proof['output']}))
        else:
            result = derive_site(city=args.city, generated=args.generated, parent_run=args.parent_run,
                                 out_run=args.out_run, min_free_bytes=int(args.min_free_gib * 1024**3))
            print(json.dumps(result))
    except FocusError as error:
        print(f'refused: {error}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
