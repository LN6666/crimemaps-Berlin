"""Verify the city data activation gate after ordinary release verification."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def verify(site: Path, city: str) -> dict:
    def read(name, max_bytes=100_000):
        path = site / name
        if path.is_symlink() or path.stat().st_size > max_bytes:
            raise ValueError("Invalid city profile receipt file")
        data = path.read_bytes()
        return json.loads(data), hashlib.sha256(data).hexdigest()

    profile, profile_sha = read("city-data-profile.json")
    build, _ = read("city-data-build-receipt.json")
    receipt, _ = read("city-data-profile-receipt.json")
    runtime_tables, runtime_tables_sha = read("city-data-tables.json", 500_000)
    if not isinstance(runtime_tables, list) or receipt.get("runtimeTableManifestSHA256") != runtime_tables_sha:
        raise ValueError("City runtime table manifest mismatch")
    if (profile.get("schemaVersion") != 1 or profile.get("city") != city
            or profile.get("selectorVersion") != "city-data-v1"
            or len(profile.get("routes", [])) != 12
            or build.get("schemaVersion") != 1 or build.get("purpose") != "publication"
            or any(row.get("city") != city or row.get("profileSHA256") != profile_sha
                   or row.get("profileEnabled") is not True for row in [build, receipt])):
        raise ValueError("City profile activation mismatch")
    selected = {row["path"]: row for row in receipt["selectedAssets"]}
    required = {}
    for route in profile["routes"]:
        descriptor = route["descriptor"]
        physical = descriptor.get("transport", descriptor)
        required[physical["path"]] = physical
    if set(selected) != set(required):
        raise ValueError("City payload closure mismatch")
    asset_pattern = r"/safety/buildings3d/painted-tables/[a-f0-9]{2}/[a-f0-9]{64}\.json(?:\.gz)?"
    for name, row in required.items():
        if not re.fullmatch(asset_pattern, name):
            raise ValueError("Unsafe selected asset path")
        if any(selected[name][key] != row[key] for key in ["sha256", "bytes"]):
            raise ValueError("Selected asset identity mismatch")
        asset = site / name.lstrip("/")
        if asset.is_symlink() or asset.stat().st_size != row["bytes"]:
            raise ValueError("Selected city asset missing or changed")
        if hashlib.sha256(asset.read_bytes()).hexdigest() != row["sha256"]:
            raise ValueError("Selected city asset hash mismatch")
    for row in receipt["excludedCanonicalInputs"]:
        if not re.fullmatch(asset_pattern, row["path"]):
            raise ValueError("Unsafe excluded canonical path")
        if (site / row["path"].lstrip("/")).exists():
            raise ValueError("Unselected canonical input retained in city publication")
    return {"city": city, "profileSHA256": profile_sha, "selectedAssets": len(required), "runtimeTableManifestSHA256": runtime_tables_sha, "verified": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--city", required=True)
    args = parser.parse_args()
    print(json.dumps(verify(args.site, args.city), sort_keys=True))
