"""Assemble a reviewed bulletin delta on the exact, previously sealed site."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from zipfile import ZipFile

from verify_biweekly_locations import verify as verify_locations
from artifact_gate import scan
from pack_release import pack
from verify_release import unpack
from verify_city_data_profile import verify as verify_profile


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser()
    for key in ("city", "repository", "commit", "trusted-base", "delta-sha"):
        parser.add_argument("--" + key, required=True)
    args = parser.parse_args()
    base = Path("incoming")
    prior = base / "site-acceptance.json"
    if digest(prior) != args.trusted_base:
        raise ValueError("Previous release acceptance mismatch")
    approved = json.loads(prior.read_bytes())
    inventory = base / "site-integrity.json"
    if (approved["repository"] != args.repository or approved["city"] != args.city
            or approved["artifact_receipt_sha256"] != digest(inventory)):
        raise ValueError("Previous release belongs to another city or inventory")
    delta = base / "bulletin-delta.zip"
    if digest(delta) != args.delta_sha:
        raise ValueError("Reviewed delta hash mismatch")
    site = Path("candidate-site")
    unpack(base / "site.tar.gz", site, receipt=inventory,
           receipt_sha256=digest(inventory), city=args.city)
    updates = site / "updates"
    previous = {p.parent.name: {c["card_id"] for c in json.loads(p.read_bytes())}
                for p in updates.glob("????-??-??/bulletins.json")}
    with ZipFile(delta) as archive:
        entries = archive.infolist()
        if len(entries) > 1200 or sum(item.file_size for item in entries) > 100_000_000:
            raise ValueError("Bulletin delta exceeds limits")
        names = set()
        for item in entries:
            name = item.filename
            if (name in names or not re.fullmatch(
                r"(?:index\.html|map/index\.html|safety/(?:manifest\.json|lossless/(?:index\.json|registry-[a-f0-9]{64}\.json|[a-f0-9]{64}\.json\.gz))"
                r"|assets/[\w-]+\.js|updates/[0-9]{4}-[0-9]{2}-[0-9]{2}/(?:index\.html|(?:de|en|zh)\.html|bulletins\.json|windows\.json|briefs\.json|style\.css))", name)):
                raise ValueError("Duplicate or out-of-scope bulletin path")
            names.add(name)
            target = site / name
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(item) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
    batches = {p.parent.name for p in updates.glob("????-??-??/bulletins.json")}
    if not batches:
        raise ValueError("No reviewed bulletin batch")
    touched = {name.split("/")[1] for name in names if name.startswith("updates/")}
    for batch in sorted(touched | {max(batches)}):
        cards = json.loads((updates / batch / "bulletins.json").read_bytes())
        if not previous.get(batch, set()) <= {c["card_id"] for c in cards}:
            raise ValueError("Previously accepted card missing from bulletin batch")
        verify_locations(site, args.city, batch)
    verify_profile(site, args.city)
    record = scan(site, args.city, args.commit)
    out = Path("prepared")
    out.mkdir()
    receipt = out / "site-integrity.json"
    receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    pack(site, out / "site.tar.gz", receipt, digest(receipt), args.city)


if __name__ == "__main__":
    main()
