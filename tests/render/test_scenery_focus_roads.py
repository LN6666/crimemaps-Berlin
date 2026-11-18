"""Synthetic fixtures only: invented square boundary and invented road lines; no OSM-derived data."""

import hashlib
import importlib.util
import json
import shutil
import sys
from pathlib import Path

import pytest

MODULE = Path(__file__).resolve().parents[2] / "scripts/safety/scenery_focus_roads.py"
SPEC = importlib.util.spec_from_file_location("fixture_scenery_focus_roads", MODULE)
tool = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = tool
SPEC.loader.exec_module(tool)

CENTER = [8.81, 53.075]
PBF = "a" * 64
INDEX = "safety/buildings3d/scenery-index.json"
PINS = tool.library_versions()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def line(*points):
    return {"type": "LineString", "coordinates": [list(p) for p in points]}


# (way id, tags, geometry). Offsets: 0.0003 deg lon ~ 20 m, 0.00018 deg lat ~ 20 m at this latitude.
ROADS = [
    (101, {"highway": "residential"}, line((8.795, 53.068), (8.797, 53.068))),  # far; parent
    (102, {"highway": "residential"}, line((8.809, 53.07518), (8.811, 53.07518))),  # ~20 m north
    (103, {"highway": "unclassified"}, line((8.809, 53.07446), (8.811, 53.07446))),  # ~60 m south
    (104, {"highway": "service"}, line((8.8095, 53.0751), (8.8105, 53.0751))),
    (105, {"highway": "pedestrian"}, line((8.8095, 53.0749), (8.8105, 53.0749))),
    (106, {"highway": "residential", "access": "no"}, line((8.8096, 53.07505), (8.8104, 53.07505))),
    (107, {"highway": "residential", "vehicle:conditional": "no @ (Mo-Fr)"}, line((8.8096, 53.07495), (8.8104, 53.07495))),
    (108, {"highway": "residential"}, line((8.8098, 53.0747), (8.8098, 53.0753))),  # ~13 m west; parent
    (109, {"highway": "residential", "oneway": "-1"}, line((8.8115, 53.0745), (8.8115, 53.0755))),  # ~100 m east
    (110, {"highway": "residential"}, line((8.813, 53.0735), (8.814, 53.0735))),  # ~200 m; outside radius
]
PARENT_WAYS = [101, 108]


def write(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return path


def make_source(root):
    boundary = {"id": "osm/relation/1", "name": "Bremen", "within_expected_area": True,
                "geometry": {"type": "Polygon", "coordinates": [[[8.79, 53.065], [8.83, 53.065], [8.83, 53.085],
                                                                 [8.79, 53.085], [8.79, 53.065]]]}}
    braw = json.dumps(boundary).encode()
    inventory = {"city": "bremen", "source": {"sha256": PBF, "pbf_timestamp": "2000-01-01T00:00:00Z",
                                              "url": "https://example.invalid/synthetic.pbf"},
                 "source_boundary_sha256": sha(braw)}
    lines = [json.dumps({"city": "bremen", "geometry": geometry, "segment_id": f"osm/way/{ident}/city-clip/0",
                         "source_boundary_sha256": sha(braw), "source_id": f"osm/way/{ident}",
                         "source_pbf_sha256": PBF, "source_tags": tags})
             for ident, tags, geometry in ROADS]
    return {"road_source": write(root / "src/roads.jsonl", ("\n".join(lines) + "\n").encode()),
            "source_inventory": write(root / "src/inventory.json", json.dumps(inventory).encode()),
            "boundary": write(root / "src/boundary.json", braw)}


def make_site(root, data, index_extra=None):
    raw = tool.dumps(data)
    name = f"scenery-{sha(raw)}.json"
    index = {"schema_version": 1, "city": "bremen", "role": "decorative-schematic", "partial": True,
             "snapshot": "2000-01-01T00:00:00Z", "source_pbf_sha256": PBF,
             "data": {"path": "/safety/buildings3d/" + name, "bytes": len(raw), "sha256": sha(raw)},
             "note": {"en": "synthetic"}, **(index_extra or {})}
    iraw = tool.dumps(index)
    write(root / "site" / INDEX, iraw)
    write(root / "site/safety/buildings3d" / name, raw)
    files = {INDEX: {"bytes": len(iraw), "sha256": sha(iraw)},
             "safety/buildings3d/" + name: {"bytes": len(raw), "sha256": sha(raw)}}
    inventory = write(root / "receipts/bremen-site-inventory.json",
                      json.dumps({"files": files, "physical_file_bytes": len(raw) + len(iraw)}, indent=2).encode())
    return {"parent_site": root / "site", "parent_inventory": inventory, "index_raw": iraw, "data_raw": raw}


def make_declaration(root, source, site, radius=150):
    declaration = {"schema": 1, "city": "bremen",
                   "focus": [{"id": "synthetic-focus", "center": CENTER, "radiusMetres": radius,
                              "camera": {"zoom": 18, "pitch": 45, "bearing": -25, "canvasCss": [866, 401]}}],
                   "pins": {"roadSourceSHA256": sha(source["road_source"].read_bytes()),
                            "sourceInventorySHA256": sha(source["source_inventory"].read_bytes()),
                            "boundarySHA256": sha(source["boundary"].read_bytes()), "sourcePbfSHA256": PBF,
                            "parentIndexSHA256": sha(site["index_raw"]), "parentDataSHA256": sha(site["data_raw"]),
                            "parentInventorySHA256": sha(site["parent_inventory"].read_bytes())}}
    return write(root / "focus.json", json.dumps(declaration).encode())


def parent_data(source, ways=PARENT_WAYS):
    rows, _, _ = tool.derive_rows("bremen", source["road_source"].read_bytes(),
                                  json.loads(source["source_inventory"].read_bytes()), source["boundary"].read_bytes())
    by_way = {row["source_way_id"]: row for row in rows}
    return {"schema_version": 1, "city": "bremen", "source_snapshot": "2000-01-01T00:00:00Z", "source_pbf_sha256": PBF,
            "source_url": "https://example.invalid/synthetic.pbf",
            "city_boundary_sha256": sha(source["boundary"].read_bytes()), "role": "decorative-schematic",
            "partial": True, "roads": [by_way[w] for w in ways]}


@pytest.fixture
def world(tmp_path):
    source = make_source(tmp_path)
    site = make_site(tmp_path / "parent", parent_data(source))
    focus = make_declaration(tmp_path, source, site)
    return {"root": tmp_path, "source": source, "site": site, "focus": focus}


def run(world, out, focus=None, site=None, **extra):
    site = site or world["site"]
    return tool.generate(city="bremen", focus_path=focus or world["focus"], **world["source"],
                         parent_site=site["parent_site"], parent_inventory=site["parent_inventory"], out=out,
                         **{"library_pins": PINS, **extra})


def outputs(out):
    index_raw = (out / INDEX).read_bytes()
    index = json.loads(index_raw)
    data_raw = (out / index["data"]["path"].lstrip("/")).read_bytes()
    return index_raw, index, data_raw, json.loads(data_raw)


def test_parent_prefix_is_byte_identical_and_only_focus_rows_are_appended(world):
    out = world["root"] / "gen"
    proof = run(world, out)
    index_raw, index, data_raw, data = outputs(out)
    parent_raw = world["site"]["data_raw"]
    assert data_raw[:len(parent_raw) - 2] == parent_raw[:-2] and data_raw[len(parent_raw) - 2:len(parent_raw) - 1] == b","
    parent = json.loads(parent_raw)
    assert data["roads"][:len(parent["roads"])] == parent["roads"]
    assert {k: v for k, v in data.items() if k != "roads"} == {k: v for k, v in parent.items() if k != "roads"}
    appended = [r["source_way_id"] for r in data["roads"][len(parent["roads"]):]]
    assert appended == [102, 103, 109]
    assert data["roads"][-1]["direction"] == -1 and all(r["direction"] == 1 for r in data["roads"][:-1])
    old_index = json.loads(world["site"]["index_raw"])
    assert {k: v for k, v in index.items() if k != "data"} == {k: v for k, v in old_index.items() if k != "data"}
    assert index["data"] == {"path": f"/safety/buildings3d/scenery-{sha(data_raw)}.json", "bytes": len(data_raw),
                             "sha256": sha(data_raw)}
    assert index_raw == tool.dumps(index)
    assert proof["parentRoadsByteIdentical"] and proof["prefixProperty"] and proof["appendedRoads"] == 3
    assert proof["network_requests"] == 0 and proof["pbf_rescans"] == 0 and proof["partial"] is True
    distances = [row["distanceMetres"] for row in proof["focus"][0]["appended"]]
    assert distances == sorted(distances) and distances[-1] <= 150
    assert proof["focus"][0]["cameraCoverage"]["allSelected"] is True


def test_non_vehicle_and_restricted_roads_are_never_appended(world):
    for tags in ({"highway": "service"}, {"highway": "pedestrian"}, {"highway": "residential", "access": "no"},
                 {"highway": "residential", "vehicle:conditional": "no @ (Mo-Fr)"}):
        assert tool.eligible(tags) is False
    out = world["root"] / "gen"
    run(world, out)
    ways = {r["source_way_id"] for r in outputs(out)[3]["roads"]}
    assert ways.isdisjoint({104, 105, 106, 107}) and 110 not in ways


def identity(x, y, z=None):
    return x, y


def test_ordering_is_distance_then_row_index(world):
    rows = [{"id": f"r{i}", "coordinates": coords} for i, coords in
            enumerate([[[10, 0], [10, 5]], [[-10, 0], [-10, 5]], [[3, -1], [3, 1]], [[0, 10], [5, 10]]])]
    focus = [{"id": "f", "center": [0, 0], "radiusMetres": 50}]
    chosen, report = tool.select_focus_rows(rows, identity, focus, parent_ids={"r3"})
    assert chosen == [2, 0, 1]
    assert [a["distanceMetres"] for a in report[0]["appended"]] == [3.0, 10.0, 10.0]
    two = [{"id": "f1", "center": [0, 0], "radiusMetres": 5}, {"id": "f2", "center": [0, 0], "radiusMetres": 50}]
    chosen, report = tool.select_focus_rows(rows, identity, two, parent_ids=set())
    assert chosen == [2, 0, 1, 3] and [a["id"] for a in report[1]["appended"]] == ["r0", "r1", "r3"]


def test_generation_is_idempotent_and_reapplying_appends_nothing(world):
    first, second = world["root"] / "gen-1", world["root"] / "gen-2"
    run(world, first)
    run(world, second)
    names = sorted(p.relative_to(first).as_posix() for p in first.rglob("*") if p.is_file())
    assert names == sorted(p.relative_to(second).as_posix() for p in second.rglob("*") if p.is_file())
    assert all((first / n).read_bytes() == (second / n).read_bytes() for n in names)
    _, _, data_raw, data = outputs(first)
    again = make_site(world["root"] / "again", data)
    focus = make_declaration(world["root"] / "again", world["source"], again)
    proof = run(world, world["root"] / "gen-3", focus=focus, site=again)
    assert proof["appendedRoads"] == 0 and proof["output"]["data"]["sha256"] == sha(data_raw)


def test_refuses_parent_sha_mismatch_existing_output_and_limits(world):
    declaration = json.loads(world["focus"].read_bytes())
    declaration["pins"]["parentDataSHA256"] = "0" * 64
    bad = write(world["root"] / "bad-focus.json", json.dumps(declaration).encode())
    with pytest.raises(tool.FocusError, match="parent data"):
        run(world, world["root"] / "never-1", focus=bad)
    assert not (world["root"] / "never-1").exists()

    existing = world["root"] / "existing"
    existing.mkdir()
    with pytest.raises(tool.FocusError, match="already exists"):
        run(world, existing)
    assert list(existing.iterdir()) == []

    for limits in (tool.Limits(roads=4), tool.Limits(positions=9), tool.Limits(bytes=len(world["site"]["data_raw"]))):
        with pytest.raises(tool.FocusError, match="exceed limit"):
            run(world, world["root"] / "never-2", limits=limits)
        assert not (world["root"] / "never-2").exists()

    with pytest.raises(tool.FocusError, match="library versions"):
        run(world, world["root"] / "never-3", library_pins={**PINS, "geos": "0.0.0"})


def test_refuses_parent_road_that_is_not_reproduced(world):
    data = parent_data(world["source"])
    data["roads"][0] = {**data["roads"][0], "direction": -1}
    site = make_site(world["root"] / "tampered", data)
    focus = make_declaration(world["root"] / "tampered", world["source"], site)
    with pytest.raises(tool.FocusError, match="differs from its re-derived row"):
        run(world, world["root"] / "never", focus=focus, site=site)


def test_refuses_when_camera_footprint_rows_fall_outside_the_radius(world):
    focus = make_declaration(world["root"] / "narrow", world["source"], world["site"], radius=5)
    with pytest.raises(tool.FocusError, match="camera footprint"):
        run(world, world["root"] / "never", focus=focus)


def test_cli_reports_refusal_with_exit_code_two(world, capsys):
    existing = world["root"] / "existing"
    existing.mkdir()
    code = tool.main(["generate", "--city", "bremen", "--focus", str(world["focus"]),
                      "--road-source", str(world["source"]["road_source"]),
                      "--source-inventory", str(world["source"]["source_inventory"]),
                      "--boundary", str(world["source"]["boundary"]),
                      "--parent-site", str(world["site"]["parent_site"]),
                      "--parent-inventory", str(world["site"]["parent_inventory"]), "--out", str(existing)])
    assert code == 2 and "refused" in capsys.readouterr().err


def make_run(world):
    """A parent run with sites/crimemaps-Bremen, its sealed inventory and SUCCESS receipt."""
    run_root = world["root"] / "runs/parent"
    shutil.copytree(world["site"]["parent_site"], run_root / "sites/crimemaps-Bremen")
    write(run_root / "sites/crimemaps-Bremen/index.html", b"<!doctype html>synthetic")
    files = tool.site_inventory(run_root / "sites/crimemaps-Bremen")
    total = sum(v["bytes"] for v in files.values())
    write(run_root / "receipts/bremen-site-inventory.json",
          json.dumps({"files": files, "physical_file_bytes": total}, indent=2).encode())
    write(run_root / "receipts/bremen-SUCCESS.json", json.dumps(
        {"city": "bremen", "local_source_commit": "synthetic",
         "capacity": {"city": "bremen", "expanded_site_bytes": total, "file_count": len(files)}}).encode())
    site = {"parent_site": run_root / "sites/crimemaps-Bremen",
            "parent_inventory": run_root / "receipts/bremen-site-inventory.json",
            "index_raw": world["site"]["index_raw"], "data_raw": world["site"]["data_raw"]}
    focus = make_declaration(run_root, world["source"], site)
    return run_root, site, focus


def test_derive_site_changes_only_index_and_new_data(world):
    run_root, site, focus = make_run(world)
    gen = world["root"] / "gen"
    proof = run(world, gen, focus=focus, site=site)
    parent_before = {p.relative_to(run_root).as_posix(): p.read_bytes() for p in run_root.rglob("*") if p.is_file()}
    out_run = world["root"] / "runs/derived"
    with pytest.raises(tool.FocusError, match="free disk"):
        tool.derive_site(city="bremen", generated=gen, parent_run=run_root, out_run=out_run,
                         min_free_bytes=2**62, clone=shutil.copytree)
    assert not out_run.exists()
    result = tool.derive_site(city="bremen", generated=gen, parent_run=run_root, out_run=out_run, min_free_bytes=0,
                              clone=shutil.copytree)
    new_data = proof["output"]["data"]["path"].lstrip("/")
    assert result["changed"] == sorted([INDEX, new_data])
    derived = json.loads((out_run / "receipts/bremen-site-inventory.json").read_bytes())["files"]
    parent_files = json.loads(site["parent_inventory"].read_bytes())["files"]
    assert {k: v for k, v in derived.items() if k not in (INDEX, new_data)} == {
        k: v for k, v in parent_files.items() if k != INDEX}
    assert (out_run / "sites/crimemaps-Bremen" / INDEX).read_bytes() == (gen / INDEX).read_bytes()
    derivation = json.loads((out_run / "DERIVATION.json").read_bytes())
    assert derivation["scope"] == ["bremen"] and derivation["publication_performed"] is False
    assert not (out_run / "FINAL14-CAPACITY.json").exists()
    assert {p.relative_to(run_root).as_posix(): p.read_bytes() for p in run_root.rglob("*") if p.is_file()} == parent_before
    with pytest.raises(tool.FocusError, match="already exists"):
        tool.derive_site(city="bremen", generated=gen, parent_run=run_root, out_run=out_run, min_free_bytes=0,
                         clone=shutil.copytree)
