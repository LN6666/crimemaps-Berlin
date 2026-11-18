"""Named place markers retain reference semantics through the map consumer."""
import pytest
from shapely.geometry import box

from crimemapsberlin.geometry_decisions import METHODS, _derived_geometry
from crimemapsberlin.map_decisions import _count_point
from crimemapsberlin.reviewed_city_map import _scene


def inputs():
    node = {"id": "osm/node/1", "roles": ["named_object"],
            "names": ["Federal Police Precinct"], "tags": {"amenity": "police"},
            "geometry": {"type": "Point", "coordinates": [10.0, 53.55]}}
    decision = {"verdict": "resolved", "method": "osm_place_point_reference",
                "osm_object_groups": [[node["id"]]]}
    request = {"geometry_task": "checked_point_geocode_required", "precision": "place",
               "coordinates": None, "role": "operation", "city_scope": "in_city",
               "location_id": "source:location:1", "label": "Federal Police Precinct",
               "evidence_quotes": ["transferred to the Federal Police Precinct"]}
    return decision, request, {node["id"]: node}


def test_native_reference_survives_without_an_event_or_count_coordinate():
    d, r, objects = inputs()
    assert d["method"] in METHODS
    derived = _derived_geometry(d, r, objects, box(9.9, 53.5, 10.1, 53.6), "hamburg")
    assert derived["type"] == "Point"
    assert list(derived["geometry"]["coordinates"]) == [10.0, 53.55]
    assert derived["source_object_ids"] == ["osm/node/1"]
    assert derived["geometry_usage"] == "source_native_collection_reference_only"
    assert derived["actual_event_position_known"] is False
    assert derived["actual_event_extent_known"] is False
    assert "count_point" not in derived
    row = {"decision": d, "derived_geometry": derived}
    assert _count_point(row) is None
    scene = _scene(r, row, {}, {}, None)
    assert scene["geometry"] == derived["geometry"]
    assert scene["coordinates"] is None and not scene["primary_for_count"]
    with pytest.raises(ValueError, match="cannot be a primary"):
        _scene(r, row, {}, {}, r["location_id"])
    derived["count_point"] = {"type": "Point", "coordinates": [10.0, 53.55]}
    assert _count_point(row) is None


@pytest.mark.parametrize("change", ["two_nodes", "duplicate", "area", "moving", "coordinate",
                                    "unnamed", "administrative", "not_named", "polygon",
                                    "non_node", "outside", "vertex"])
def test_incompatible_contexts_and_objects_are_rejected(change):
    d, r, objects = inputs()
    node = objects["osm/node/1"]
    if change == "two_nodes":
        objects["osm/node/2"] = {**node, "id": "osm/node/2"}
        d["osm_object_groups"][0].append("osm/node/2")
    elif change == "duplicate": d["osm_object_groups"][0].append("osm/node/1")
    elif change == "area": r.update(precision="area", geometry_task="checked_area_geometry_required")
    elif change == "moving": r["transit_route"] = {"mode": "train", "line": "S1"}
    elif change == "coordinate": r["coordinates"] = [10.0, 53.55]
    elif change == "unnamed": node["names"] = []
    elif change == "administrative": node["roles"].append("administrative_boundary")
    elif change == "not_named": node["roles"] = []
    elif change == "polygon": node["geometry"] = {"type": "Polygon", "coordinates": [[[10,53.55],[10.01,53.55],[10,53.56],[10,53.55]]]}
    elif change == "non_node": node["id"] = "osm/way/1"
    elif change == "outside": node["geometry"]["coordinates"] = [11, 53.55]
    elif change == "vertex": node["native_road_vertex_source_proof"] = {}
    with pytest.raises(ValueError):
        _derived_geometry(d, r, objects, box(9.9, 53.5, 10.1, 53.6), "hamburg")
