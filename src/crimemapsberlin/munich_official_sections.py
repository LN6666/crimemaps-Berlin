"""Receive source-bound Munich official sections without creating provider events.

The owner-accepted POLIZEIKARTE lane remains separate. This additive ledger
preserves official announcement sections, phases and unknown geometry; it does
not assign an incident count, create map coordinates or authorize publication.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

from .source_review_pack import read_checkpoint_connection

SCHEMA = "crimemaps.private-provisional-munich-scene-review.v1"


def _digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _quote(value: object, body: str, digest: object = None) -> None:
    if not isinstance(value, str) or not value.strip() or " ".join(value.split()) not in body:
        raise ValueError("Official section evidence is missing from the current body")
    if digest is not None and _digest(value) != digest:
        raise ValueError("Official section quote hash mismatch")


def validate_sections(candidate: dict, source: dict) -> dict:
    """Validate evidence/identity, retaining the reviewer's section interpretation."""
    if candidate.get("schema") != SCHEMA or candidate.get("city") != "munich":
        raise ValueError("Unsupported Munich official-section schema or city")
    ident = candidate.get("identity", {})
    source_id = source["source_id"]
    source_sha = source["source_sha256"]
    if (candidate.get("source_id") != source_id or candidate.get("source_url") != source["source_url"]
            or ident.get("source_id") != source_id or ident.get("city") != "munich"
            or ident.get("source_url") != source["source_url"]
            or ident.get("source_candidate_narrative_body_sha256") != source_sha):
        raise ValueError("Official-section source identity or body version mismatch")
    if candidate.get("canonical_adopted") is not False or candidate.get("publication_ready") is not False:
        raise ValueError("Evidence intake cannot claim canonical adoption or publication")
    if candidate.get("incident_count") is not None or candidate.get("incident_count_status") != "not_asserted":
        raise ValueError("Section intake requires an explicitly unasserted incident count")
    if (candidate.get("scenes_complete_for_saved_narrative") is not True
            or candidate.get("formal_locations_complete_for_saved_narrative") is not True):
        raise ValueError("Reviewer must explicitly declare saved-narrative coverage")
    body = " ".join(source["source_body"].split())
    scenes = candidate.get("scenes")
    locations = candidate.get("formal_locations")
    if not isinstance(scenes, list) or not scenes or not isinstance(locations, list):
        raise ValueError("Official sections and locations must be explicit lists")
    scene_ids = [s.get("incident_id") for s in scenes]
    location_ids = [loc.get("location_id") for loc in locations]
    if (any(not isinstance(x, str) or not x for x in scene_ids + location_ids)
            or len(set(scene_ids)) != len(scene_ids) or len(set(location_ids)) != len(location_ids)
            or candidate.get("scene_section_count") != len(scenes)):
        raise ValueError("Invalid or duplicate official section/location IDs")
    phases = 0
    for location in locations:
        if location.get("coordinates") is not None or "unresolved" not in str(location.get("geometry_decision")):
            raise ValueError("Official section intake only accepts explicit unresolved geometry")
        if not set(location.get("scene_ids", [])) <= set(scene_ids):
            raise ValueError("Unknown official section reference")
        _quote(location.get("place_wording_de"), body)
        quotes = location.get("evidence_quotes", [])
        hashes = location.get("evidence_quote_sha256", [])
        if not quotes or len(quotes) != len(hashes):
            raise ValueError("Location evidence and hash lists must match")
        for quote, digest in zip(quotes, hashes, strict=True):
            _quote(quote, body, digest)
    for scene in scenes:
        if (scene.get("source_id") != source_id or scene.get("city") != "munich"
                or scene.get("source_url") != source["source_url"]
                or scene.get("source_candidate_narrative_body_sha256") != source_sha
                or scene.get("source_sha256") is not None or scene.get("event_time") is not None):
            raise ValueError("Section source identity or unnormalized time changed")
        _quote(scene.get("original_section_heading"), body)
        if not set(scene.get("formal_location_ids", [])) <= set(location_ids):
            raise ValueError("Unknown formal location reference")
        for quote in scene.get("evidence_quotes", []):
            _quote(quote, body)
        for time in scene.get("source_stated_time", []):
            _quote(time, body)
        if not isinstance(scene.get("phases"), list) or not scene["phases"]:
            raise ValueError("Each official section needs its reviewed phases")
        for phase in scene["phases"]:
            phases += 1
            if not isinstance(phase.get("quote_sha256"), str):
                raise TypeError("Phase quote hash is required")
            _quote(phase.get("quote_de"), body, phase["quote_sha256"])
            if not set(phase.get("formal_location_ids", [])) <= set(location_ids):
                raise ValueError("Unknown phase location reference")
            if phase.get("time_de") is not None:
                _quote(phase["time_de"], body)
    overview = candidate.get("article_overview", {})
    if not isinstance(overview.get("quote_sha256"), str):
        raise TypeError("Overview quote hash is required")
    _quote(overview.get("quote_de"), body, overview["quote_sha256"])
    if not set(overview.get("referenced_scene_ids", [])) <= set(scene_ids):
        raise ValueError("Unknown overview section reference")
    return {"source_id": source_id, "source_sha256": source_sha, "sections": len(scenes),
            "phases": phases, "locations": len(locations), "incident_count": None}


def import_sections(*, db_path: Path, candidate_path: Path) -> dict:
    """Atomically receive a reviewed official candidate in an additive ledger."""
    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    with sqlite3.connect(db_path.resolve().as_uri() + "?mode=rw", uri=True) as db:
        db.execute("BEGIN IMMEDIATE")
        rows, _ = read_checkpoint_connection(db)
        matches = [r for r in rows if r["source_id"] == candidate.get("source_id")]
        if len(matches) != 1:
            raise ValueError("Official section source does not exist in checkpoint")
        result = validate_sections(candidate, matches[0])
        payload = json.dumps(candidate, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        candidate_sha = _digest(payload)
        db.execute("""CREATE TABLE IF NOT EXISTS munich_official_section_reviews (
            source_id TEXT NOT NULL, source_sha256 TEXT NOT NULL,
            candidate_sha256 TEXT NOT NULL, candidate_json TEXT NOT NULL,
            PRIMARY KEY (source_id, source_sha256, candidate_sha256))""")
        before = db.total_changes
        db.execute("INSERT OR IGNORE INTO munich_official_section_reviews VALUES (?,?,?,?)",
                   (result["source_id"], result["source_sha256"], candidate_sha, payload))
        inserted = db.total_changes - before
    return {**result, "candidate_sha256": candidate_sha, "inserted": inserted,
            "source_binding_accepted": True, "canonical_event_adopted": False,
            "owner_approved": False, "publication_ready": False}
