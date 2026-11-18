"""Stationary source-road references must not change legacy osm_line semantics."""

import copy
import hashlib
import json

import pytest

from crimemapsberlin.geometry_decisions import compile_geometry_decisions
from test_geometry_decisions import _inputs


REFERENCE_FLAGS = {
    "geometry_usage": "source_road_reference_only",
    "actual_non_transit_extent_known": False,
    "actual_event_position_known": False,
    "actual_event_extent_known": False,
}
LEGACY_KEYS = {
    "type",
    "geometry",
    "geometry_sha256",
    "source_object_ids",
    "source_object_groups",
}


def _compile(inventory, index, decisions, border, method):
    envelope = copy.deepcopy(decisions)
    envelope["decisions"][0]["method"] = method
    return compile_geometry_decisions(
        inventory=inventory,
        geometry_index=index,
        decision_envelope=envelope,
        border=border,
        include_footprint_count_points=False,
    )["decisions"][0]


def test_stationary_road_reference_preserves_legacy_geometry_hash_ids_and_groups():
    inventory, index, decisions, border = _inputs()
    # Exercise the real merge of two selected native roads, not just a method label.
    groups = [["osm/way/1", "osm/way/3"]]
    decisions["decisions"][0]["osm_object_groups"] = copy.deepcopy(groups)
    before = copy.deepcopy((inventory, index, decisions))

    legacy = _compile(inventory, index, decisions, border, "osm_line")
    reference = _compile(
        inventory, index, decisions, border, "osm_stationary_road_reference"
    )
    old_geometry = legacy["derived_geometry"]
    new_geometry = reference["derived_geometry"]

    assert set(old_geometry) == LEGACY_KEYS
    assert not REFERENCE_FLAGS.keys() & old_geometry.keys()
    for field in LEGACY_KEYS:
        assert new_geometry[field] == old_geometry[field]
    assert new_geometry == {**old_geometry, **REFERENCE_FLAGS}
    assert new_geometry["type"] in {"LineString", "MultiLineString"}
    assert new_geometry["source_object_ids"] == ["osm/way/1", "osm/way/3"]
    assert new_geometry["source_object_groups"] == groups
    assert legacy["decision"]["osm_object_groups"] == groups
    assert reference["decision"]["osm_object_groups"] == groups
    assert legacy["request"] == reference["request"] == inventory["geometry_requests"][0]
    assert "count_point" not in new_geometry
    assert "count_point_sha256" not in new_geometry
    assert "count_point_method" not in new_geometry
    assert (inventory, index, decisions) == before


@pytest.mark.parametrize(
    ("incompatible", "reason"),
    [
        ("area_without_road_name", "source road reference needs named original road members"),
        ("platform", "checked road objects"),
        ("route", "stationary road reference needs a reviewed street/area"),
        ("transit_route", "stationary road reference needs a reviewed street/area"),
        ("source_coordinates", "stationary road reference needs a reviewed street/area"),
    ],
)
def test_stationary_road_reference_rejects_incompatible_requests(incompatible, reason):
    inventory, index, decisions, border = _inputs()
    request = inventory["geometry_requests"][0]
    if incompatible == "area_without_road_name":
        request.update(precision="area", geometry_task="checked_area_geometry_required")
    elif incompatible == "platform":
        # A platform line is valid for legacy point/place requests, not this street.
        index["objects"][0].update(
            roles=["named_object"], tags={"public_transport": "platform"}
        )
    elif incompatible == "route":
        request.update(
            precision="route",
            geometry_task="checked_non_transit_route_geometry_required",
            transit_review={"status": "reviewed_non_transit_route"},
        )
    elif incompatible == "transit_route":
        # Keep the street task valid so the explicit transit-context gate is tested.
        request["transit_route"] = {"mode": "bus"}
    else:
        # Source coordinates are not to be silently converted into a road reference.
        request["coordinates"] = [6.77, 51.23]

    with pytest.raises(ValueError, match=reason):
        _compile(inventory, index, decisions, border, "osm_stationary_road_reference")


@pytest.mark.parametrize(
    ("precision", "platform_tags"),
    [
        ("point", {"public_transport": "platform"}),
        ("place", {"railway": "platform_edge"}),
    ],
)
def test_legacy_osm_line_keeps_point_place_platform_geometry_without_reference_flags(
    precision, platform_tags
):
    inventory, index, decisions, border = _inputs()
    inventory["geometry_requests"][0].update(
        precision=precision,
        geometry_task="checked_point_geocode_required",
    )
    platform = index["objects"][0]
    platform.update(roles=["named_object"], tags=copy.deepcopy(platform_tags))
    before = copy.deepcopy((inventory, index, decisions))

    derived = _compile(inventory, index, decisions, border, "osm_line")[
        "derived_geometry"
    ]
    expected_hash = hashlib.sha256(
        json.dumps(
            platform["geometry"], ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
    ).hexdigest()
    assert derived == {
        "type": "LineString",
        "geometry": platform["geometry"],
        "geometry_sha256": expected_hash,
        "source_object_ids": ["osm/way/1"],
        "source_object_groups": [["osm/way/1"]],
    }
    assert set(derived) == LEGACY_KEYS
    assert not REFERENCE_FLAGS.keys() & derived.keys()
    # The same valid legacy platform request must not inherit the new road method.
    with pytest.raises(ValueError, match="stationary road reference needs a reviewed street"):
        _compile(inventory, index, decisions, border, "osm_stationary_road_reference")
    assert (inventory, index, decisions) == before
