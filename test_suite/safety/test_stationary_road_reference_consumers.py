"""A stationary source-named road reference never supplies an event count point.

These are downstream consumer tests for the compiled-row contract. Native
geometry derivation and its source/membership gates are tested separately; no
replacement geometry compiler or semantic decision is implemented here.
"""
import copy
import hashlib
import json

import pytest

from crimemapsberlin.map_decisions import _count_point
from crimemapsberlin.reviewed_city_map import _scene


@pytest.fixture(params=["LineString", "MultiLineString"])
def stationary_reference(request):
    first = [[8.01, 50.01], [8.02, 50.015], [8.03, 50.02]]
    second = [[8.03, 50.02], [8.04, 50.025]]
    geometry = {
        "type": request.param,
        "coordinates": first if request.param == "LineString" else [first, second],
    }
    object_ids = ["osm/way/101"]
    if request.param == "MultiLineString":
        object_ids.append("osm/way/102")
    geometry_sha = hashlib.sha256(
        json.dumps(geometry, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    location = {
        "location_id": "source-1:location:1",
        "label": "Musterstraße",
        "role": "incident",
        "precision": "street",
        "city_scope": "in_city",
        "coordinates": None,
        "evidence_quotes": ["In einem nicht näher bezeichneten Geschäft an der Musterstraße."],
        "event_time": {
            "display": "Zeit nicht übernommen",
            "date": None,
            "precision": "unknown",
            "evidence_quote": "In einem nicht näher bezeichneten Geschäft an der Musterstraße.",
        },
        "details": "Named road reference only; the particular premises and event extent remain unknown.",
    }
    row = {
        "decision": {
            "verdict": "resolved",
            "method": "osm_stationary_road_reference",
            "osm_object_groups": [object_ids],
            "review_note": "Original native road members are source context, not the actual event extent.",
        },
        "derived_geometry": {
            "type": geometry["type"],
            "geometry": geometry,
            "geometry_sha256": geometry_sha,
            "source_object_ids": object_ids,
            "source_object_groups": [object_ids],
            "geometry_usage": "source_road_reference_only",
            "actual_event_position_known": False,
            "actual_event_extent_known": False,
            "actual_non_transit_extent_known": False,
        },
    }
    return location, row


def test_stationary_road_reference_has_no_count_point_without_disabling_legacy_osm_line(stationary_reference):
    _, row = stationary_reference
    original = copy.deepcopy(row)

    assert _count_point(row) is None
    assert "count_point" not in row["derived_geometry"]
    assert "count_point_method" not in row["derived_geometry"]
    assert row == original

    # A legacy non-reference row with its explicit count point keeps its current
    # eligibility. The reference gate must not reject every native line globally.
    legacy = copy.deepcopy(row)
    legacy["decision"]["method"] = "osm_line"
    legacy["derived_geometry"].pop("geometry_usage")
    for key in (
        "actual_event_position_known", "actual_event_extent_known", "actual_non_transit_extent_known"
    ):
        legacy["derived_geometry"].pop(key)
    legacy["derived_geometry"]["count_point"] = {"type": "Point", "coordinates": [8.02, 50.015]}
    assert _count_point(legacy) == [8.02, 50.015]


def test_stationary_road_reference_rejects_forced_primary_even_with_injected_count_point(stationary_reference):
    location, row = stationary_reference
    row["derived_geometry"]["count_point"] = {"type": "Point", "coordinates": [8.02, 50.015]}
    row["derived_geometry"]["count_point_method"] = "injected_representative_point"
    original = copy.deepcopy((location, row))

    assert _count_point(row) is None
    with pytest.raises(ValueError, match="road reference cannot be a primary count scene"):
        _scene(location, row, {}, {}, location["location_id"])
    assert (location, row) == original


def test_stationary_road_reference_scene_preserves_native_identity_and_unknown_event_extent(stationary_reference):
    location, row = stationary_reference
    incidents = {
        "source-1:incident:1": {
            "formal_location_ids": [location["location_id"]],
            "details": "One source-described event, with an unknown precise premises.",
            "event_time": location["event_time"],
        }
    }
    categories = {"source-1:incident:1": "eigentum"}
    original = copy.deepcopy((location, row, incidents, categories))

    scene = _scene(location, row, incidents, categories, None)

    native = row["derived_geometry"]
    assert scene["geocode_method"] == "osm_stationary_road_reference"
    assert scene["geometry_review"] == {
        "verdict": "resolved", "method": "osm_stationary_road_reference",
        "review_note": row["decision"]["review_note"],
    }
    assert scene["geometry"] == native["geometry"]
    assert scene["geometry_sha256"] == native["geometry_sha256"]
    assert scene["location_object_ids"] == native["source_object_ids"]
    assert scene["source_object_groups"] == native["source_object_groups"]
    assert scene["geometry_usage"] == "source_road_reference_only"
    assert scene["coordinates"] is None
    assert scene["primary_for_count"] is False
    assert scene["actual_event_position_known"] is False
    assert scene["actual_event_extent_known"] is False
    assert scene["actual_non_transit_extent_known"] is False
    assert scene["location_precision"] == "street"
    assert scene["role"] == "incident"
    assert scene["event_time"] == location["event_time"]
    assert scene["details"] == location["details"]
    assert scene["incident_ids"] == ["source-1:incident:1"]
    assert scene["incident_categories"] == ["eigentum"]
    assert scene["incidents"][0]["event_time"] == location["event_time"]
    assert "count_point" not in scene
    assert "count_point_method" not in scene
    assert "transit_route" not in scene
    assert "complete_transit_line" not in scene
    assert (location, row, incidents, categories) == original
