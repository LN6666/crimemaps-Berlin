import json
from pathlib import Path
from crimemapsberlin.reviewed_city_map import _zones_for_city

def test_berlin_keeps_the_checked_police_reference_places():
    root = Path(__file__).resolve().parents[2]
    expected = json.loads((root / "data/safety/berlin_kbo.json").read_text())
    assert _zones_for_city("berlin") == expected
    assert len(expected["places"]) == 7
    assert expected["geometry_status"] != "not_applicable"
    assert all(p["center_status"] == "approximate_navigation_only_not_legal_boundary" for p in expected["places"])

def test_other_city_does_not_acquire_berlin_police_zones():
    assert _zones_for_city("hamburg") == {"places": [], "features": [], "geometry_status": "not_applicable"}
