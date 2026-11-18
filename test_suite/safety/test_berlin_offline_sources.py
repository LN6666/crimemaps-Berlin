import hashlib
import json
import sqlite3
from datetime import datetime

import pytest

from crimemapsberlin.berlin_offline_sources import AUDIT_STATUS, REVISION_BASIS, import_reviewed_sources
from crimemapsberlin.collector import SCHEMA, connect
from crimemapsberlin.source_review_pack import read_checkpoint

CAPTURED = "2020-01-02T12:00:00+00:00"
CAPTURE_TS = datetime.fromisoformat(CAPTURED).timestamp()
IMPORTED = CAPTURE_TS + 86400
BODY = "A synthetic official narrative with enough text.\n\nSecond paragraph.  Two spaces remain.\n"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def candidate(ident):
    url = f"https://www.berlin.de/polizei/polizeimeldungen/2020/pressemitteilung.{ident}.php"
    digest = sha(BODY.encode())
    return {
        "schema": "crimemaps.private-official-source-body-candidate.v1",
        "record_state": "private_source_body_candidate_not_canonical",
        "city": "berlin", "source_id": ident, "source_url": url,
        "title": "Synthetic source", "published": "2020-01-02", "body": BODY,
        "sha256": digest, "revision": "saved-response:" + "a" * 64,
        "revision_basis": REVISION_BASIS, "original_language": "de",
        "canonical_source_sha256": None, "canonical_adopted": False, "publication_ready": False,
        "normalization": {
            "candidate_normalized_body_sha256": digest,
            "raw_http_response_sha256": "a" * 64,
            "raw_http_response_gzip_sha256": "b" * 64, "visible_text_sha256": "c" * 64,
            "raw_http_response_path": "synthetic.html.gz", "visible_text_path": "synthetic.txt",
            "method_id": "Synthetic reviewed block extraction", "fetch_status": 200,
            "requested_url": url, "effective_url": url, "etag": None,
            "last_modified": "Thu, 02 Jan 2020 12:00:00 GMT", "captured_at_utc": CAPTURED,
        },
        "saved_review": {"path": "synthetic-review.jsonl", "sha256": "d" * 64,
                         "status": "reviewed_saved_official_body"},
    }


def inputs(tmp_path, rows=None, mutate_audit=None, mutate_receipt=None):
    """All approval-looking data here is synthetic fixture data, never a real receipt."""
    rows = rows if rows is not None else [candidate("101"), candidate("102")]
    raw = ("\n".join(json.dumps(row) for row in rows) + "\n").encode()
    candidate_path = tmp_path / "synthetic-candidates.jsonl"
    candidate_path.write_bytes(raw)
    receipt = {
        "schema": "crimemaps.private-official-source-body-candidate-receipt.v1",
        "output_jsonl_sha256": sha(raw), "all_current_intake_keys_match": True,
        "canonical_source_adopted": False, "publication_ready": False,
        "source_groups_by_city": {"berlin": len(rows)},
    }
    for name in ("records", "source_groups", "response_status_200_hash_validated",
                 "decompressed_official_responses_reverified",
                 "normalized_german_body_sha256_matches_translation_and_source_record",
                 "visible_text_and_review_references_bound"):
        receipt[name] = len(rows)
    if mutate_receipt:
        mutate_receipt(receipt)
    receipt_raw = json.dumps(receipt).encode()
    receipt_path = tmp_path / "synthetic-source-receipt.json"
    receipt_path.write_bytes(receipt_raw)
    audit = {
        "schema": "crimemaps.private-intake-acceptance-audit.v1", "status": AUDIT_STATUS,
        "canonical_adopted": False, "publication_ready": False,
        "source_and_translation_candidate": {
            "official_source_candidates_sha256": sha(raw),
            "official_source_receipt_sha256": sha(receipt_raw), "records": len(rows),
        },
        "scene_review": {"quote_mismatches": 0, "city_groups": {"berlin": len(rows)}},
    }
    if mutate_audit:
        mutate_audit(audit)
    audit_raw = json.dumps(audit).encode()
    audit_path = tmp_path / "synthetic-acceptance.json"
    audit_path.write_bytes(audit_raw)
    db_path = tmp_path / "private-copy.sqlite"
    if not db_path.exists():
        connect(db_path).close()
    return {"db_path": db_path, "candidate_path": candidate_path, "candidate_sha256": sha(raw),
            "acceptance_path": audit_path, "acceptance_sha256": sha(audit_raw),
            "source_receipt_path": receipt_path, "source_receipt_sha256": sha(receipt_raw),
            "accepted_source_ids": ["101", "102"], "imported_at": IMPORTED}


def db_rows(path, table):
    with sqlite3.connect(path) as db:
        db.row_factory = sqlite3.Row
        return [dict(row) for row in db.execute(f"SELECT * FROM {table} ORDER BY 1")]


def test_exact_body_history_and_saved_observation_time(tmp_path):
    args = inputs(tmp_path)
    result = import_reviewed_sources(**args)
    assert result["inserted"] == result["provenance_added"] == 2
    assert result["canonical_adopted"] is result["publication_ready"] is False
    reports = db_rows(args["db_path"], "reports")
    for row in reports:
        assert row["body"].encode() == BODY.encode()
        assert row["sha256"] == sha(BODY.encode())
        assert row["revision"] == 1 and type(row["revision"]) is int
        assert row["checked"] == row["first_seen"] == CAPTURE_TS
        assert row["district"] == "" and row["published"] == "2020-01-02"
    assert all(row["observed"] == CAPTURE_TS for row in db_rows(args["db_path"], "revisions"))
    for row in db_rows(args["db_path"], "berlin_offline_source_imports"):
        assert row["captured_at"] == CAPTURE_TS and row["imported_at"] == IMPORTED
        assert json.loads(row["provenance_json"])["revision"] == "saved-response:" + "a" * 64
    normalized, coverage = read_checkpoint(args["db_path"])
    assert len(normalized) == coverage["bodies_in_pack"] == 2
    assert normalized[0]["source_body"] == BODY


def test_idempotence_keeps_all_observation_and_import_times(tmp_path):
    args = inputs(tmp_path)
    import_reviewed_sources(**args)
    tables = ("reports", "revisions", "berlin_offline_source_imports")
    before = {table: db_rows(args["db_path"], table) for table in tables}
    result = import_reviewed_sources(**{**args, "imported_at": IMPORTED + 86400})
    assert result["inserted"] == result["provenance_added"] == 0 and result["unchanged"] == 2
    assert {table: db_rows(args["db_path"], table) for table in tables} == before


@pytest.mark.parametrize("column,value", [("url", "https://example.invalid/"), ("sha256", "e" * 64),
                                         ("title", "Changed"), ("published", "2020-01-01"),
                                         ("district", "Different"), ("modified", "Different")])
def test_existing_conflict_fails_without_changing_any_row(tmp_path, column, value):
    args = inputs(tmp_path)
    import_reviewed_sources(**args)
    with sqlite3.connect(args["db_path"]) as db:
        db.execute(f"UPDATE reports SET {column}=? WHERE id='102'", (value,))
    before = db_rows(args["db_path"], "reports")
    with pytest.raises(ValueError, match="conflict"):
        import_reviewed_sources(**args)
    assert db_rows(args["db_path"], "reports") == before


def test_late_write_failure_rolls_back_sources_history_and_provenance_table(tmp_path):
    args = inputs(tmp_path)
    with sqlite3.connect(args["db_path"]) as db:
        db.execute("""CREATE TRIGGER reject_second_revision BEFORE INSERT ON revisions
                   WHEN NEW.id='102' BEGIN SELECT RAISE(ABORT,'synthetic late failure'); END""")
    with pytest.raises(sqlite3.IntegrityError, match="synthetic late failure"):
        import_reviewed_sources(**args)
    assert db_rows(args["db_path"], "reports") == db_rows(args["db_path"], "revisions") == []
    with sqlite3.connect(args["db_path"]) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE name='berlin_offline_source_imports'").fetchone() is None


@pytest.mark.parametrize("name", ["candidate_sha256", "acceptance_sha256", "source_receipt_sha256"])
def test_each_explicit_input_hash_is_required(tmp_path, name):
    args = inputs(tmp_path)
    args[name] = "0" * 64
    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        import_reviewed_sources(**args)
    assert db_rows(args["db_path"], "reports") == []


@pytest.mark.parametrize("ids", [[], ["101"], ["101", "103"], ["101", "102", "103"],
                                 ["101", "101"], [101, "102"]])
def test_exact_explicit_accepted_id_boundary(tmp_path, ids):
    args = inputs(tmp_path)
    with pytest.raises(ValueError):
        import_reviewed_sources(**{**args, "accepted_source_ids": ids})
    assert db_rows(args["db_path"], "reports") == []


@pytest.mark.parametrize("bad", ["body_sha", "unreviewed", "future_capture", "url", "private_flag"])
def test_bound_but_invalid_record_is_rejected_before_any_writes(tmp_path, bad):
    rows = [candidate("101"), candidate("102")]
    row = rows[1]
    if bad == "body_sha":
        row["body"] += "Unbound change"
    elif bad == "unreviewed":
        row["saved_review"]["status"] = "pending"
    elif bad == "future_capture":
        row["normalization"]["captured_at_utc"] = "2999-01-01T00:00:00+00:00"
    elif bad == "url":
        row["source_url"] = row["normalization"]["effective_url"] = "https://example.invalid/102"
    else:
        row["canonical_adopted"] = True
    args = inputs(tmp_path, rows)
    with pytest.raises(ValueError):
        import_reviewed_sources(**args)
    assert db_rows(args["db_path"], "reports") == []


def test_rehashed_unaccepted_or_cross_bound_audit_is_rejected(tmp_path):
    for mutate in [lambda audit: audit.update(status="pending"),
                   lambda audit: audit["source_and_translation_candidate"].update(
                       official_source_candidates_sha256="e" * 64)]:
        args = inputs(tmp_path, mutate_audit=mutate)
        with pytest.raises(ValueError):
            import_reviewed_sources(**args)
        assert db_rows(args["db_path"], "reports") == []


def test_private_simplified_snapshot_is_not_a_formal_destination(tmp_path):
    args = inputs(tmp_path)
    other = tmp_path / "simplified.sqlite"
    with sqlite3.connect(other) as db:
        db.execute("CREATE TABLE reports(id TEXT PRIMARY KEY,body TEXT,sha256 TEXT,revision TEXT)")
    with pytest.raises(ValueError, match="formal Berlin collector"):
        import_reviewed_sources(**{**args, "db_path": other})


@pytest.mark.parametrize("old,new", [("id TEXT PRIMARY KEY", "id INTEGER PRIMARY KEY"),
                                   ("body TEXT", "body NUMERIC"), ("sha256 TEXT", "sha256 INTEGER")])
def test_wrong_column_affinity_is_not_a_formal_destination(tmp_path, old, new):
    args = inputs(tmp_path)
    other = tmp_path / "wrong-affinity.sqlite"
    with sqlite3.connect(other) as db:
        db.executescript(SCHEMA.replace(old, new, 1))
        db.execute("ALTER TABLE reports ADD COLUMN http_status INTEGER")
    with pytest.raises(ValueError, match="formal Berlin collector"):
        import_reviewed_sources(**{**args, "db_path": other})
    assert db_rows(other, "reports") == []


def test_silent_trigger_body_rewrite_is_rolled_back(tmp_path):
    args = inputs(tmp_path)
    with sqlite3.connect(args["db_path"]) as db:
        db.execute("""CREATE TRIGGER rewrite_body AFTER INSERT ON reports BEGIN
                   UPDATE reports SET body=body || 'changed' WHERE id=NEW.id; END""")
    with pytest.raises(ValueError, match="readback"):
        import_reviewed_sources(**args)
    assert db_rows(args["db_path"], "reports") == db_rows(args["db_path"], "revisions") == []


def test_existing_provenance_column_order_is_not_assumed(tmp_path):
    args = inputs(tmp_path)
    import_reviewed_sources(**args)
    before = db_rows(args["db_path"], "berlin_offline_source_imports")
    with sqlite3.connect(args["db_path"]) as db:
        columns = list(db.execute("PRAGMA table_info(berlin_offline_source_imports)"))
        db.execute("DROP TABLE berlin_offline_source_imports")
        definitions = ",".join(f"{row[1]} {row[2]}" for row in reversed(columns))
        db.execute(f"CREATE TABLE berlin_offline_source_imports ({definitions})")
    result = import_reviewed_sources(**args)
    assert result["inserted"] == 0 and result["provenance_added"] == 2
    after = db_rows(args["db_path"], "berlin_offline_source_imports")
    assert sorted(after, key=lambda row: row["source_id"]) == before
