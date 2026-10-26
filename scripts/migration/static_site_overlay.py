"""Strict provenance for static discovery applied to an accepted deployed runtime.

Schema 2 never claims that the retained runtime was built by deployment_commit.
Only deterministic discovery output can differ from the historical inventory.
"""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
from datetime import datetime
from pathlib import Path

from site_discovery import build
from verify_site_discovery import verify as verify_discovery

KIND = "static_discovery_overlay"
PROFILE_FILES = {
    "city-data-profile.json",
    "city-data-build-receipt.json",
    "city-data-profile-receipt.json",
    "city-data-tables.json",
}


def text_digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def timestamp(value):
    result = datetime.fromisoformat(value)
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("Overlay provenance timestamps need a timezone")
    return result


def accepted_overlay(
    value, city, repository, commit, *, now, historical_validator, product_validator, freshness_validator
):
    if (
        value.get("schema_version") != 2
        or value.get("kind") != KIND
        or value.get("city") != city
        or value.get("repository") != repository
        or value.get("deployment_commit") != commit
        or "code_commit" in value
        or value.get("static_tool_commit") != commit
        or value.get("release_status") != "accepted_for_publication"
    ):
        raise ValueError("Invalid static overlay deployment provenance")
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("Current time needs a timezone")
    runtime = value.get("runtime_code_commit", "")
    if not re.fullmatch(r"[a-f0-9]{40}", runtime) or runtime == commit:
        raise ValueError("Historical runtime must have its own explicit commit")
    base_text = value.get("base_acceptance_json")
    if (
        not isinstance(base_text, str)
        or len(base_text.encode()) > 100_000
        or text_digest(base_text) != value.get("base_acceptance_sha256")
    ):
        raise ValueError("Historical acceptance digest mismatch")
    base = json.loads(base_text)
    if base.get("schema_version") != 1 or base.get("code_commit") != runtime:
        raise ValueError("Overlay requires an original runtime acceptance")
    publication = value.get("base_publication", {})
    published = timestamp(publication.get("published_at", ""))
    if (
        publication.get("repository") != repository
        or publication.get("commit") != runtime
        or publication.get("acceptance_sha256") != value["base_acceptance_sha256"]
        or publication.get("status") != "success"
        or type(publication.get("deployment_id")) is not int
        or publication["deployment_id"] <= 0
        or type(publication.get("workflow_run_id")) is not int
        or publication["workflow_run_id"] <= 0
        or published > now
    ):
        raise ValueError("Successful historical deployment provenance is required")
    # Revalidate the historical acceptance at its actual publication time. Its
    # old source timestamp is NOT promoted to a current source check.
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / "base-acceptance.json"
        path.write_text(base_text)
        historical_validator(path, value["base_acceptance_sha256"], city, repository, runtime, now=published)
    if value.get("runtime_base_integrity_sha256") != base.get("artifact_receipt_sha256") or value.get(
        "input_bindings"
    ) != base.get("input_bindings"):
        raise ValueError("Original scientific and runtime bindings must be preserved")
    product_validator(value)
    for key in ["artifact_receipt_sha256", "catalog_sha256"]:
        if not re.fullmatch(r"[a-f0-9]{64}", value.get(key, "")):
            raise ValueError("Overlay integrity/catalog digest missing")
    freshness_validator(value, city, repository, value["artifact_receipt_sha256"], now)
    return value


def verify_overlay(root, receipt, accepted, city, commit):
    from artifact_gate import digest, scan

    if receipt.stat().st_size > 20_000_000 or digest(receipt) != accepted["artifact_receipt_sha256"]:
        raise ValueError("Static overlay inventory differs from trusted acceptance")
    inventory = json.loads(receipt.read_text())
    runtime = accepted["runtime_code_commit"]
    if (
        any(
            inventory.get(k) != v
            for k, v in {
                "schema_version": 2,
                "kind": KIND,
                "city": city,
                "deployment_commit": commit,
                "runtime_code_commit": runtime,
                "runtime_base_integrity_sha256": accepted["runtime_base_integrity_sha256"],
            }.items()
        )
        or "code_commit" in inventory
    ):
        raise ValueError("Overlay inventory provenance mismatch")
    base_text = inventory.get("runtime_base_integrity_json")
    if not isinstance(base_text, str) or text_digest(base_text) != accepted["runtime_base_integrity_sha256"]:
        raise ValueError("Original runtime inventory digest mismatch")
    base = json.loads(base_text)
    if base.get("schema_version") != 1 or base.get("city") != city or base.get("code_commit") != runtime:
        raise ValueError("Original runtime inventory identity mismatch")
    catalog = Path(__file__).resolve().parents[2] / "config/discovery-cities.json"
    if digest(catalog) != accepted["catalog_sha256"]:
        raise ValueError("Discovery catalog differs from accepted source")
    entries = ["index.html"] + (["map/index.html"] if city == "berlin" else [])
    originals = inventory.get("entrypoints_before", {})
    if set(originals) != set(entries):
        raise ValueError("Exact original entrypoint bytes are required")
    with tempfile.TemporaryDirectory() as folder:
        generated = Path(folder)
        for name in entries:
            text = originals[name]
            if (
                not isinstance(text, str)
                or len(text.encode()) > 1_000_000
                or text_digest(text) != base["files"][name]["sha256"]
                or len(text.encode()) != base["files"][name]["bytes"]
            ):
                raise ValueError("Original HTML does not match published inventory")
            target = generated / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
        expected = build(generated, city, catalog)
        changed = set(expected["changed_files"])
        for name in changed:
            if (root / name).read_bytes() != (generated / name).read_bytes():
                raise ValueError("Static change differs from deterministic discovery output")
    actual = scan(root, city, runtime)
    if actual["files"] != inventory.get("files") or actual["total_bytes"] != inventory.get("total_bytes"):
        raise ValueError("Static overlay artifact differs from sealed inventory")
    if set(actual["files"]) != set(base["files"]) | changed:
        raise ValueError("Only discovery paths may be added; no runtime file may be removed")
    for name, old in base["files"].items():
        if name not in changed and any(actual["files"][name][k] != old[k] for k in ["sha256", "bytes"]):
            raise ValueError("Original runtime/data asset changed")
    original_profiles = PROFILE_FILES & set(base["files"])
    if original_profiles and original_profiles != PROFILE_FILES:
        raise ValueError("Historical profile contract is incomplete")
    profile = (
        "unchanged_publication_profile"
        if original_profiles
        else "accepted_pre_profile_runtime_inventory_preserved"
    )
    discovery = verify_discovery(root, city)
    return {
        **actual,
        "runtime_code_commit": runtime,
        "deployment_commit": commit,
        "profile_contract": profile,
        "discovery": discovery,
        "protected_runtime_files": len(set(base["files"]) - changed),
    }


def verify_base_publication_online(value, reader=None):
    """Pin the inherited acceptance to a real successful Pages workflow/log.

    The new trusted digest binds this declaration, but the mandatory deployment
    CLI also checks GitHub's historical deployment and original trusted digest.
    """
    if reader is None:
        import subprocess

        def reader(arguments):
            return subprocess.check_output(arguments, text=True)

    repository = value["repository"]
    publication = value["base_publication"]
    deployment_id = publication["deployment_id"]
    run_id = publication["workflow_run_id"]
    prefix = "repos/" + repository
    deployment = json.loads(reader(["gh", "api", prefix + "/deployments/" + str(deployment_id)]))
    statuses = json.loads(
        reader(["gh", "api", prefix + "/deployments/" + str(deployment_id) + "/statuses?per_page=100"])
    )
    run = json.loads(reader(["gh", "api", prefix + "/actions/runs/" + str(run_id)]))
    if (
        deployment.get("sha") != value["runtime_code_commit"]
        or deployment.get("environment") != "github-pages"
        or run.get("head_sha") != value["runtime_code_commit"]
        or run.get("path") != ".github/workflows/pages.yml"
        or run.get("event") != "workflow_dispatch"
        or run.get("conclusion") != "success"
        or not any(
            s.get("state") == "success"
            and s.get("created_at") == publication["published_at"]
            and "/actions/runs/" + str(run_id) + "/" in s.get("log_url", "")
            for s in statuses
        )
    ):
        raise ValueError("Historical publication is not confirmed by GitHub")
    logs = reader(["gh", "run", "view", str(run_id), "--repo", repository, "--log"])
    trusted = set(re.findall(r"EXPECTED_SHA256:\s*([a-f0-9]{64})", logs))
    if trusted != {value["base_acceptance_sha256"]}:
        raise ValueError("Historical workflow trusted a different acceptance")
