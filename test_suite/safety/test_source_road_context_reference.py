"""Source area and two-road labels retain native references, never event points."""
import pytest
from shapely.geometry import box

from crimemapsberlin.geometry_decisions import _derived_geometry
from crimemapsberlin.map_decisions import _count_point


def inputs(junction):
    objects = {
        "osm/way/1": {"id": "osm/way/1", "roles": ["road", "named_object"],
                      "names": ["Schaumainkai"], "tags": {"name": "Schaumainkai"},
                      "geometry": {"type": "LineString", "coordinates": [[8.68,50.1],[8.681,50.1],[8.682,50.1]]}},
        "osm/way/2": {"id": "osm/way/2", "roles": ["road", "named_object"],
                      "names": ["Querstraße"], "tags": {"name": "Querstraße"},
                      "geometry": {"type": "LineString", "coordinates": [[8.681,50.099],[8.681,50.1],[8.681,50.101]]}},
    }
    request = {"precision": "street" if junction else "area", "coordinates": None,
               "geometry_task": "checked_road_geometry_required" if junction else "checked_area_geometry_required",
               "label": "Schaumainkai/Querstraße" if junction else "Bereich des Schaumainkais",
               "evidence_quotes": []}
    decision = {"verdict": "resolved", "method": "osm_junction_reference" if junction else "osm_stationary_road_reference",
                "osm_object_groups": [["osm/way/1"], ["osm/way/2"]] if junction else [["osm/way/1"]]}
    return decision, request, objects


@pytest.mark.parametrize("junction", [False, True])
def test_source_named_context_preserves_native_reference_and_unknown_position(junction):
    d, r, objects = inputs(junction)
    g = _derived_geometry(d, r, objects, box(8.6,50,8.8,50.2), "frankfurt")
    assert g["geometry_usage"].endswith("reference_only")
    assert _count_point({"decision": d, "derived_geometry": g}) is None
    assert "count_point" not in g
    assert g["actual_event_position_known"] is False
    if junction:
        assert list(g["geometry"]["coordinates"]) == [8.681,50.1]
    else:
        assert [list(p) for p in g["geometry"]["coordinates"]] == objects["osm/way/1"]["geometry"]["coordinates"]
        assert g["actual_event_extent_known"] is False


@pytest.mark.parametrize("junction", [False, True])
@pytest.mark.parametrize("change", ["unmentioned", "partial_name", "unnamed", "moving", "coordinate", "wrong_task"])
def test_incompatible_source_contexts_remain_rejected(junction, change):
    d, r, objects = inputs(junction)
    if change == "unmentioned": r["label"] = "elsewhere"
    elif change == "partial_name": r["label"] = "Schaumainkaistraße/Querstraße"
    elif change == "unnamed": objects["osm/way/1"].update(names=[], tags={})
    elif change == "moving": r["transit_route"] = {"mode":"tram","line":"U9"}
    elif change == "coordinate": r["coordinates"] = [8.681,50.1]
    elif change == "wrong_task": r["geometry_task"] = "checked_district_geometry_required"
    with pytest.raises(ValueError):
        _derived_geometry(d, r, objects, box(8.6,50,8.8,50.2), "frankfurt")


def test_street_junction_rejects_a_planar_crossing_without_native_shared_vertex():
    d, r, objects = inputs(True)
    objects["osm/way/2"]["geometry"]["coordinates"] = [[8.681,50.099],[8.681,50.101]]
    with pytest.raises(ValueError, match="original shared road vertices"):
        _derived_geometry(d, r, objects, box(8.6,50,8.8,50.2), "frankfurt")


def test_area_road_reference_rejects_mixed_road_identities():
    d, r, objects = inputs(False)
    r["label"] = "Schaumainkai/Querstraße"
    d["osm_object_groups"][0].append("osm/way/2")
    with pytest.raises(ValueError, match="one source-supported road identity"):
        _derived_geometry(d, r, objects, box(8.6,50,8.8,50.2), "frankfurt")
