"""The static route cannot admit a new runtime or bypass old publication checks."""

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/migration"))
sys.path.insert(0, str(ROOT / "scripts/security"))
import verify_release as release
from artifact_gate import scan
from site_discovery import build
from static_site_overlay import verify_overlay


def dump(path, value):
    path.write_text(json.dumps(value, sort_keys=True, indent=2) + "\n")
    return release.sha(path)


@pytest.fixture
def candidate(tmp_path):
    now = datetime.now(UTC)
    published = now - timedelta(days=10)
    site = tmp_path / "site"
    site.mkdir()
    html = '<!doctype html><html lang="de"><head><title>Original</title><meta http-equiv="Content-Security-Policy" content="script-src &#39;self&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;"></head><body><div id="app"></div><script src="runtime.js"></script></body></html>'
    (site / "index.html").write_text(html)
    (site / "runtime.js").write_text('console.log("original");')
    base_inventory = scan(site, "essen", "a" * 40)
    base_path = tmp_path / "base-inventory.json"
    base_hash = dump(base_path, base_inventory)
    checks = {k: {"status": "passed", "evidence_sha256": "c" * 64} for k in release.CHECKS}
    bindings = {k: "d" * 64 for k in release.BINDINGS}
    base = {
        "schema_version": 1,
        "city": "essen",
        "repository": "LN6666/crimemaps-Essen",
        "code_commit": "a" * 40,
        "release_status": "accepted_for_publication",
        "languages": ["de", "en", "zh"],
        "artifact_receipt_sha256": base_hash,
        "checks": checks,
        "input_bindings": bindings,
        "prelaunch_refresh": {
            "status": "passed",
            "city": "essen",
            "repository": "LN6666/crimemaps-Essen",
            "last_successful_source_check": published.isoformat(),
            "checked_candidate_receipt_sha256": base_hash,
            "evidence_sha256": "e" * 64,
        },
    }
    base_acceptance = tmp_path / "base-acceptance.json"
    base_acceptance_hash = dump(base_acceptance, base)
    build(site, "essen", ROOT / "portal/cities.json")
    actual = scan(site, "essen", "a" * 40)
    inventory = {
        "schema_version": 2,
        "kind": "static_discovery_overlay",
        "city": "essen",
        "deployment_commit": "b" * 40,
        "runtime_code_commit": "a" * 40,
        "runtime_base_integrity_sha256": base_hash,
        "runtime_base_integrity_json": base_path.read_text(),
        "entrypoints_before": {"index.html": html},
        "files": actual["files"],
        "total_bytes": actual["total_bytes"],
    }
    receipt = tmp_path / "inventory.json"
    inventory_hash = dump(receipt, inventory)
    value = {
        "schema_version": 2,
        "kind": "static_discovery_overlay",
        "city": "essen",
        "repository": "LN6666/crimemaps-Essen",
        "deployment_commit": "b" * 40,
        "static_tool_commit": "b" * 40,
        "runtime_code_commit": "a" * 40,
        "release_status": "accepted_for_publication",
        "languages": ["de", "en", "zh"],
        "base_acceptance_json": base_acceptance.read_text(),
        "base_acceptance_sha256": base_acceptance_hash,
        "runtime_base_integrity_sha256": base_hash,
        "artifact_receipt_sha256": inventory_hash,
        "catalog_sha256": release.sha(ROOT / "portal/cities.json"),
        "checks": checks,
        "input_bindings": bindings,
        "base_publication": {
            "repository": "LN6666/crimemaps-Essen",
            "commit": "a" * 40,
            "status": "success",
            "deployment_id": 1,
            "workflow_run_id": 2,
            "published_at": published.isoformat(),
            "acceptance_sha256": base_acceptance_hash,
        },
        "prelaunch_refresh": {
            "status": "passed",
            "city": "essen",
            "repository": "LN6666/crimemaps-Essen",
            "last_successful_source_check": now.isoformat(),
            "checked_candidate_receipt_sha256": inventory_hash,
            "evidence_sha256": "f" * 64,
        },
    }
    acceptance = tmp_path / "acceptance.json"
    dump(acceptance, value)
    return site, receipt, acceptance, value, inventory, now


def accepted(c):
    _site, _receipt, path, value, _inventory, now = c
    dump(path, value)
    return release.acceptance(path, release.sha(path), "essen", "LN6666/crimemaps-Essen", "b" * 40, now=now)


def test_accepts_only_static_overlay_with_truthful_historical_runtime(candidate):
    value = accepted(candidate)
    site, receipt = candidate[:2]
    result = verify_overlay(site, receipt, value, "essen", "b" * 40)
    assert result["runtime_code_commit"] == "a" * 40
    assert result["deployment_commit"] == "b" * 40
    assert result["profile_contract"] == "accepted_pre_profile_runtime_inventory_preserved"
    assert result["protected_runtime_files"] == 1


@pytest.mark.parametrize(
    "field,replacement",
    [
        ("deployment_commit", "x" * 40),
        ("runtime_code_commit", "b" * 40),
        ("static_tool_commit", "a" * 40),
        ("base_acceptance_sha256", "0" * 64),
        ("runtime_base_integrity_sha256", "0" * 64),
        ("code_commit", "b" * 40),
    ],
)
def test_rejects_misleading_or_unbound_provenance(candidate, field, replacement):
    candidate[3][field] = replacement
    with pytest.raises(ValueError):
        accepted(candidate)


@pytest.mark.parametrize("key", sorted(release.CHECKS))
def test_all_fifteen_checks_remain_required(candidate, key):
    candidate[3]["checks"][key]["status"] = "not_passed"
    with pytest.raises(ValueError):
        accepted(candidate)


@pytest.mark.parametrize("key", sorted(release.BINDINGS))
def test_original_five_bindings_cannot_change(candidate, key):
    candidate[3]["input_bindings"] = {**candidate[3]["input_bindings"], key: "1" * 64}
    with pytest.raises(ValueError):
        accepted(candidate)


def test_historical_timestamp_is_not_current_freshness(candidate):
    candidate[3]["prelaunch_refresh"]["last_successful_source_check"] = (
        candidate[5] - timedelta(days=10)
    ).isoformat()
    with pytest.raises(ValueError, match="72 hours"):
        accepted(candidate)


@pytest.mark.parametrize("name", ["runtime.js", "extra.js", "about/en/index.html", "index.html"])
def test_new_runtime_data_or_arbitrary_html_cannot_hide_in_a_resealed_inventory(candidate, name):
    site, receipt, _path, value, inventory, _now = candidate
    (site / name).write_text('console.log("changed");' if name.endswith(".js") else "<html>arbitrary</html>")
    # Even a caller authorized to reseal hashes cannot broaden the static scope.
    actual = scan(site, "essen", "a" * 40) if name.endswith(".js") else None
    if actual:
        inventory["files"] = actual["files"]
        inventory["total_bytes"] = actual["total_bytes"]
        value["artifact_receipt_sha256"] = dump(receipt, inventory)
        value["prelaunch_refresh"]["checked_candidate_receipt_sha256"] = value["artifact_receipt_sha256"]
    with pytest.raises(ValueError):
        verify_overlay(site, receipt, accepted(candidate), "essen", "b" * 40)


def test_cannot_invent_original_html_or_profile(candidate):
    site, receipt, _path, value, inventory, _now = candidate
    inventory["entrypoints_before"]["index.html"] += '<script src="runtime.js"></script>'
    value["artifact_receipt_sha256"] = dump(receipt, inventory)
    value["prelaunch_refresh"]["checked_candidate_receipt_sha256"] = value["artifact_receipt_sha256"]
    with pytest.raises(ValueError, match="Original HTML"):
        verify_overlay(site, receipt, accepted(candidate), "essen", "b" * 40)


def test_plain_missing_profile_still_rejected(candidate):
    from verify_city_data_profile import verify

    with pytest.raises((ValueError, OSError)):
        verify(candidate[0], "essen")


@pytest.mark.parametrize("change", [None, "deployment", "run", "status", "digest"])
def test_online_anchor_requires_original_success_and_trusted_digest(candidate, change):
    from static_site_overlay import verify_base_publication_online

    value = accepted(candidate)
    publication = value["base_publication"]
    records = {
        "deployment": {"sha": "a" * 40, "environment": "github-pages"},
        "run": {
            "head_sha": "a" * 40,
            "path": ".github/workflows/pages.yml",
            "event": "workflow_dispatch",
            "conclusion": "success",
        },
        "status": [
            {
                "state": "success",
                "created_at": publication["published_at"],
                "log_url": "https://github.com/LN6666/crimemaps-Essen/actions/runs/2/job/3",
            }
        ],
        "digest": "EXPECTED_SHA256: " + value["base_acceptance_sha256"],
    }
    if change == "deployment":
        records["deployment"]["sha"] = "b" * 40
    if change == "run":
        records["run"]["conclusion"] = "failure"
    if change == "status":
        records["status"][0]["state"] = "pending"
    if change == "digest":
        records["digest"] = "EXPECTED_SHA256: " + "0" * 64

    def reader(arguments):
        if arguments[1] == "run":
            return records["digest"]
        key = (
            "status"
            if "statuses" in arguments[-1]
            else "run"
            if "actions/runs" in arguments[-1]
            else "deployment"
        )
        return json.dumps(records[key])

    if change:
        with pytest.raises(ValueError):
            verify_base_publication_online(value, reader)
    else:
        verify_base_publication_online(value, reader)
