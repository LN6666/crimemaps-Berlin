"""Import reviewed, hash-bound Berlin bodies into an existing private checkpoint.

Unlike the online collector, this boundary preserves the reviewed body bytes.
It never fetches a source, grants publication approval, or imports decisions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path

AUDIT_STATUS = (
    "private_source_bound_candidates_hash_and_semantic_quote_checks_passed"
    "_not_canonical_not_publication_ready"
)
REVISION_BASIS = (
    "local immutable candidate revision derived from the exact saved HTTP response digest; "
    "not asserted as an upstream publisher revision"
)
REPORT_TYPES = {
    **dict.fromkeys(("id", "url", "title", "published", "district", "body", "sha256",
                    "etag", "modified", "error"), "TEXT"),
    **dict.fromkeys(("checked", "retry_after", "first_seen"), "REAL"),
    **dict.fromkeys(("failures", "revision", "http_status"), "INTEGER"),
}
IDENTITY_COLUMNS = ("url", "title", "published", "district", "body", "sha256", "etag", "modified")


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _digest(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None


def _bound_file(path: Path, expected: str) -> bytes:
    _require(_digest(expected), "An explicit SHA-256 binding is required")
    with Path(path).open("rb") as stream:
        raw = stream.read(4 * 1024 * 1024 + 1)
    _require(len(raw) <= 4 * 1024 * 1024, "Bound input exceeds 4 MiB")
    _require(_sha(raw) == expected, f"Input SHA-256 mismatch: {path}")
    return raw


def _private(value: dict) -> None:
    _require(
        value.get("canonical_adopted") is False and value.get("publication_ready") is False,
        "Input must retain its private candidate boundaries",
    )


def _timestamp(value: object, label: str) -> float:
    _require(isinstance(value, str), f"{label} must be a timezone-aware timestamp")
    parsed = datetime.fromisoformat(value)
    _require(parsed.tzinfo is not None and parsed.utcoffset() is not None,
             f"{label} must include a timezone")
    result = parsed.timestamp()
    _require(math.isfinite(result) and result >= 0, f"Invalid {label}")
    return result


def _prepare(row: dict, imported_at: float) -> dict:
    ident = row.get("source_id")
    label = f"Berlin source {ident}"
    _require(isinstance(ident, str) and re.fullmatch(r"[0-9]+", ident) is not None,
             "Berlin source_id must be the exact numeric string")
    _require(row.get("schema") == "crimemaps.private-official-source-body-candidate.v1"
             and row.get("record_state") == "private_source_body_candidate_not_canonical"
             and row.get("original_language") == "de"
             and row.get("canonical_source_sha256") is None, f"Unsupported {label} candidate")
    _private(row)
    url = row.get("source_url")
    _require(isinstance(url, str) and re.fullmatch(
        rf"https://www\.berlin\.de/polizei/polizeimeldungen/(?:[0-9]{{4}}/)?"
        rf"pressemitteilung\.{re.escape(ident)}\.php", url,
    ) is not None, f"Invalid official URL for {label}")
    body, digest = row.get("body"), row.get("sha256")
    _require(isinstance(body, str) and len(body.strip()) >= 30 and _digest(digest)
             and _sha(body.encode("utf-8")) == digest, f"Body SHA-256 mismatch for {label}")
    _require(isinstance(row.get("title"), str) and bool(row["title"].strip()),
             f"Missing title for {label}")
    published = row.get("published")
    _require(isinstance(published, str) and bool(published), f"Missing published for {label}")
    datetime.fromisoformat(published)  # Validate without adding an invented time or timezone.
    district = row.get("district", "")
    _require(isinstance(district, str), f"Invalid district for {label}")
    norm, review = row.get("normalization"), row.get("saved_review")
    _require(isinstance(norm, dict) and isinstance(review, dict), f"Unbound review for {label}")
    _require(review.get("status") == "reviewed_saved_official_body"
             and isinstance(review.get("path"), str) and bool(review["path"])
             and _digest(review.get("sha256")), f"Unreviewed source: {ident}")
    _require(norm.get("fetch_status") == 200 and type(norm.get("fetch_status")) is int
             and norm.get("requested_url") == url and norm.get("effective_url") == url
             and norm.get("candidate_normalized_body_sha256") == digest,
             f"Response identity mismatch for {label}")
    for name in ("raw_http_response_sha256", "raw_http_response_gzip_sha256", "visible_text_sha256"):
        _require(_digest(norm.get(name)), f"Missing {name} for {label}")
    for name in ("raw_http_response_path", "visible_text_path", "method_id"):
        _require(isinstance(norm.get(name), str) and bool(norm[name]), f"Missing {name} for {label}")
    for name in ("etag", "last_modified"):
        _require(name in norm and (norm[name] is None or isinstance(norm[name], str)),
                 f"Invalid {name} for {label}")
    _require(row.get("revision") == "saved-response:" + norm["raw_http_response_sha256"]
             and row.get("revision_basis") == REVISION_BASIS, f"Invalid saved revision for {label}")
    captured = _timestamp(norm.get("captured_at_utc"), "captured_at_utc")
    _require(captured <= imported_at, f"Future capture time for {label}")
    return {
        "id": ident, "url": url, "title": row["title"], "published": published,
        "district": district, "body": body, "sha256": digest,
        "etag": norm["etag"], "modified": norm["last_modified"], "captured": captured,
        "record_sha256": _sha(_json(row).encode()),
        "provenance_json": _json({key: value for key, value in row.items() if key != "body"}),
    }


def _inputs(candidate_path, candidate_sha256, acceptance_path, acceptance_sha256,
            source_receipt_path, source_receipt_sha256, accepted_source_ids, imported_at):
    _require(isinstance(accepted_source_ids, (list, tuple)) and bool(accepted_source_ids)
             and all(isinstance(x, str) and re.fullmatch(r"[0-9]+", x) for x in accepted_source_ids)
             and len(set(accepted_source_ids)) == len(accepted_source_ids),
             "An explicit, unique accepted source ID list is required")
    audit = json.loads(_bound_file(acceptance_path, acceptance_sha256))
    receipt = json.loads(_bound_file(source_receipt_path, source_receipt_sha256))
    raw = _bound_file(candidate_path, candidate_sha256)
    rows = [json.loads(line) for line in raw.splitlines() if line.strip()]
    _require(isinstance(audit, dict) and isinstance(receipt, dict)
             and rows and all(isinstance(row, dict) for row in rows), "Invalid input envelopes")
    _require(audit.get("schema") == "crimemaps.private-intake-acceptance-audit.v1"
             and audit.get("status") == AUDIT_STATUS, "No accepted private source audit")
    _private(audit)
    binding = audit.get("source_and_translation_candidate", {})
    _require(binding.get("official_source_candidates_sha256") == candidate_sha256
             and binding.get("official_source_receipt_sha256") == source_receipt_sha256
             and binding.get("records") == len(rows), "Acceptance input binding mismatch")
    scene = audit.get("scene_review", {})
    _require(scene.get("quote_mismatches") == 0
             and scene.get("city_groups", {}).get("berlin") == len(accepted_source_ids),
             "Acceptance does not cover the exact Berlin source count")
    _require(receipt.get("schema") == "crimemaps.private-official-source-body-candidate-receipt.v1"
             and receipt.get("output_jsonl_sha256") == candidate_sha256
             and receipt.get("all_current_intake_keys_match") is True
             and receipt.get("canonical_source_adopted") is False
             and receipt.get("publication_ready") is False
             and receipt.get("source_groups_by_city", {}).get("berlin") == len(accepted_source_ids),
             "Source receipt is not bound to this private batch")
    for name in ("records", "source_groups", "response_status_200_hash_validated",
                 "decompressed_official_responses_reverified",
                 "normalized_german_body_sha256_matches_translation_and_source_record",
                 "visible_text_and_review_references_bound"):
        _require(type(receipt.get(name)) is int and receipt[name] == len(rows),
                 f"Incomplete source receipt: {name}")
    selected = [row for row in rows if row.get("city") == "berlin"]
    _require(len(selected) == len(accepted_source_ids)
             and {row.get("source_id") for row in selected} == set(accepted_source_ids),
             "Candidate Berlin IDs differ from the explicit accepted ID set")
    return [_prepare(row, imported_at) for row in sorted(selected, key=lambda row: row["source_id"])]


def _schema(db: sqlite3.Connection) -> None:
    reports = {row["name"]: row for row in db.execute("PRAGMA table_info(reports)")}
    revisions = {row["name"]: row for row in db.execute("PRAGMA table_info(revisions)")}
    revision_types = {"id": "TEXT", "revision": "INTEGER", "sha256": "TEXT", "observed": "REAL"}
    _require(all(name in reports and reports[name]["type"].upper() == kind
                 for name, kind in REPORT_TYPES.items()) and reports["id"]["pk"] == 1
             and all(name in revisions and revisions[name]["type"].upper() == kind
                     for name, kind in revision_types.items())
             and revisions["id"]["pk"] == 1 and revisions["revision"]["pk"] == 2,
             "Destination is not a formal Berlin collector checkpoint")


def import_reviewed_sources(*, db_path: Path, candidate_path: Path, candidate_sha256: str,
                            acceptance_path: Path, acceptance_sha256: str,
                            source_receipt_path: Path, source_receipt_sha256: str,
                            accepted_source_ids: list[str], imported_at: float | None = None) -> dict:
    """Prevalidate a whole bound batch, then atomically insert exact saved bodies.

    Supply an independently prepared private collector checkpoint: a fresh empty
    checkpoint for a delta, or a consistent copy of an approved full baseline.
    An empty delta checkpoint must never be represented as a complete baseline.
    Hash arguments and accepted IDs are caller-reviewed pins, not discovered approval.
    """
    wall_now = time.time()
    now = wall_now if imported_at is None else imported_at
    _require(type(now) in {int, float} and math.isfinite(now) and 0 <= now <= wall_now,
             "Invalid or future imported_at")
    prepared = _inputs(candidate_path, candidate_sha256, acceptance_path, acceptance_sha256,
                       source_receipt_path, source_receipt_sha256, accepted_source_ids, now)
    path = Path(db_path).resolve()
    _require(path.is_file(), "Destination checkpoint must already exist")
    db = sqlite3.connect(path.as_uri() + "?mode=rw", uri=True)
    db.row_factory = sqlite3.Row
    inserted = unchanged = provenance_added = 0
    try:
        db.execute("BEGIN IMMEDIATE")
        _schema(db)
        db.execute("""CREATE TABLE IF NOT EXISTS berlin_offline_source_imports (
            source_id TEXT PRIMARY KEY, source_url TEXT NOT NULL, source_sha256 TEXT NOT NULL,
            revision INTEGER NOT NULL, captured_at REAL NOT NULL, imported_at REAL NOT NULL,
            candidate_sha256 TEXT NOT NULL, acceptance_sha256 TEXT NOT NULL,
            source_receipt_sha256 TEXT NOT NULL, record_sha256 TEXT NOT NULL,
            provenance_json TEXT NOT NULL)""")
        actions = []
        for record in prepared:
            ident = record["id"]
            old = db.execute("SELECT * FROM reports WHERE id=?", (ident,)).fetchone()
            revision = 1
            if old is not None:
                _require(all(old[key] == record[key] for key in IDENTITY_COLUMNS)
                         and old["error"] is None and old["http_status"] == 200
                         and old["failures"] == 0 and old["retry_after"] == 0,
                         f"Existing source identity or metadata conflict: {ident}")
                revision = old["revision"]
                _require(type(revision) is int and revision >= 1,
                         f"Invalid existing integer revision: {ident}")
                history = db.execute("SELECT sha256 FROM revisions WHERE id=? AND revision=?",
                                     (ident, revision)).fetchone()
                _require(history is not None and history["sha256"] == record["sha256"],
                         f"Existing revision history conflict: {ident}")
            provenance = {
                "source_id": ident, "source_url": record["url"], "source_sha256": record["sha256"],
                "revision": revision, "captured_at": record["captured"],
                "candidate_sha256": candidate_sha256, "acceptance_sha256": acceptance_sha256,
                "source_receipt_sha256": source_receipt_sha256,
                "record_sha256": record["record_sha256"], "provenance_json": record["provenance_json"],
            }
            prior = db.execute("SELECT * FROM berlin_offline_source_imports WHERE source_id=?",
                               (ident,)).fetchone()
            _require(prior is None or (old is not None and all(prior[k] == v for k, v in provenance.items())),
                     f"Existing offline provenance conflict: {ident}")
            actions.append((record, old is None, provenance, prior is None))
        for record, is_new, provenance, add_provenance in actions:
            if is_new:
                db.execute("""INSERT INTO reports
                    (id,url,title,published,district,body,sha256,etag,modified,checked,
                     first_seen,revision,http_status,error,failures,retry_after)
                    VALUES(:id,:url,:title,:published,:district,:body,:sha256,:etag,:modified,
                           :captured,:captured,1,200,NULL,0,0)""", record)
                db.execute("INSERT INTO revisions(id,revision,sha256,observed) VALUES(?,1,?,?)",
                           (record["id"], record["sha256"], record["captured"]))
                inserted += 1
            else:
                unchanged += 1
            if add_provenance:
                db.execute("""INSERT INTO berlin_offline_source_imports
                    (source_id,source_url,source_sha256,revision,captured_at,imported_at,
                     candidate_sha256,acceptance_sha256,source_receipt_sha256,record_sha256,
                     provenance_json) VALUES
                    (:source_id,:source_url,:source_sha256,:revision,:captured_at,:imported_at,
                     :candidate_sha256,:acceptance_sha256,:source_receipt_sha256,:record_sha256,
                     :provenance_json)""", {**provenance, "imported_at": now})
                provenance_added += 1
        # Also reject silent SQLite affinity/trigger changes before committing.
        for record, is_new, provenance, add_provenance in actions:
            stored = db.execute("SELECT * FROM reports WHERE id=?", (record["id"],)).fetchone()
            saved = db.execute("SELECT * FROM berlin_offline_source_imports WHERE source_id=?",
                               (record["id"],)).fetchone()
            _require(stored is not None and stored["id"] == record["id"]
                     and all(stored[key] == record[key] for key in IDENTITY_COLUMNS),
                     f"Source readback differs from reviewed bytes: {record['id']}")
            _require(saved is not None and all(saved[key] == value for key, value in provenance.items())
                     and (not add_provenance or saved["imported_at"] == now),
                     f"Offline provenance readback mismatch: {record['id']}")
            if is_new:
                history = db.execute("SELECT * FROM revisions WHERE id=? AND revision=1",
                                     (record["id"],)).fetchone()
                _require(stored["revision"] == 1 and stored["checked"] == stored["first_seen"]
                         == record["captured"] and history is not None
                         and history["sha256"] == record["sha256"]
                         and history["observed"] == record["captured"],
                         f"New source revision/time readback mismatch: {record['id']}")
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return {"city": "berlin", "validated": len(prepared), "inserted": inserted,
            "unchanged": unchanged, "provenance_added": provenance_added,
            "source_ids": sorted(accepted_source_ids), "candidate_sha256": candidate_sha256,
            "acceptance_sha256": acceptance_sha256, "source_receipt_sha256": source_receipt_sha256,
            "canonical_adopted": False, "publication_ready": False,
            "scope": "Independent private checkpoint only; review_decisions not imported"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--candidate-sha256", required=True)
    parser.add_argument("--acceptance", type=Path, required=True)
    parser.add_argument("--acceptance-sha256", required=True)
    parser.add_argument("--source-receipt", type=Path, required=True)
    parser.add_argument("--source-receipt-sha256", required=True)
    parser.add_argument("--accepted-source-id", action="append", required=True)
    args = parser.parse_args()
    result = import_reviewed_sources(
        db_path=args.db, candidate_path=args.candidate, candidate_sha256=args.candidate_sha256,
        acceptance_path=args.acceptance, acceptance_sha256=args.acceptance_sha256,
        source_receipt_path=args.source_receipt, source_receipt_sha256=args.source_receipt_sha256,
        accepted_source_ids=args.accepted_source_id,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
