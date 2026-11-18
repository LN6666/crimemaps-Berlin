"""Pack sealed city files as deterministic USTAR without changing their public URLs."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import tarfile
import tempfile

from city_artifact import NAMES

MAX_RECEIPT_BYTES = 20_000_000
MAX_ARCHIVE_BYTES = 450_000_000
MAX_SITE_BYTES = 900_000_000
MAX_FILE_BYTES = 100_000_000
MAX_MEMBERS = 100_000
ALIAS_DIRECTORY = ".crimemaps-ustar-v1"
SHA256 = re.compile(r"[a-f0-9]{64}")
LONG_CITY_FILE = re.compile(
    r"safety/environment/(?P<city>[a-z]+)/"
    r"(?:regional-source-packed-ordinals|regional-source-partition-proof|hard-surface-membership-proof)"
    r"-(?P<sha>[a-f0-9]{64})\.json\.gz"
)
LONG_SHARED_FILE = re.compile(r"safety/environment/shared-display-source-binding-proof-(?P<sha>[a-f0-9]{64})\.json")


def transport_name(relative: str, content_sha: str, city: str) -> str:
    path = PurePosixPath(relative)
    if (not path.parts or path.is_absolute() or relative != path.as_posix() or ".." in path.parts
            or "\\" in relative or "\0" in relative or path.parts[0] == ALIAS_DIRECTORY):
        raise ValueError("Unsafe or reserved public inventory path")
    if len(path.name.encode("utf-8")) <= 100:
        return relative
    match = LONG_CITY_FILE.fullmatch(relative)
    if match is None:
        match = LONG_SHARED_FILE.fullmatch(relative)
    elif match["city"] != city:
        raise ValueError("Long environment path belongs to another city")
    if match is None or match["sha"] != content_sha:
        raise ValueError("Unsupported long path or filename differs from its sealed content digest")
    # Hash the entire public route: two different routes may contain identical bytes.
    return f"{ALIAS_DIRECTORY}/{hashlib.sha256(relative.encode('ascii')).hexdigest()}"


def trusted_inventory(receipt: Path, expected_sha: str, city: str) -> tuple[dict, dict[str, str]]:
    if not SHA256.fullmatch(expected_sha) or receipt.stat().st_size > MAX_RECEIPT_BYTES:
        raise ValueError("Invalid detached receipt digest or size")
    with receipt.open("rb") as stream:
        raw = stream.read(MAX_RECEIPT_BYTES + 1)
    if len(raw) > MAX_RECEIPT_BYTES or hashlib.sha256(raw).hexdigest() != expected_sha:
        raise ValueError("Detached receipt does not match trusted digest")
    inventory = json.loads(raw)
    if (not isinstance(inventory, dict) or type(inventory.get("schema_version")) is not int
            or inventory["schema_version"] not in (1, 2) or city not in NAMES or inventory.get("city") != city):
        raise ValueError("Detached receipt schema or city mismatch")
    files = inventory.get("files")
    if not isinstance(files, dict) or not files or len(files) > MAX_MEMBERS:
        raise ValueError("Invalid detached file inventory")
    aliases = {}
    total = 0
    for relative, record in files.items():
        if (not isinstance(record, dict) or type(record.get("bytes")) is not int
                or not 0 <= record["bytes"] <= MAX_FILE_BYTES or not isinstance(record.get("sha256"), str)
                or not SHA256.fullmatch(record["sha256"])):
            raise ValueError("Invalid file size or digest in detached inventory")
        name = transport_name(relative, record["sha256"], city)
        if name != relative:
            if name in aliases:
                raise ValueError("Duplicate transport alias")
            aliases[name] = relative
        total += record["bytes"]
    if type(inventory.get("total_bytes")) is not int or total != inventory["total_bytes"] or total > MAX_SITE_BYTES:
        raise ValueError("Detached inventory size mismatch")
    return files, aliases


class _HashingReader:
    def __init__(self, source):
        self.source = source
        self.digest = hashlib.sha256()

    def read(self, size):
        chunk = self.source.read(size)
        self.digest.update(chunk)
        return chunk


def pack(site: Path, archive: Path, receipt: Path, expected_sha: str, city: str) -> None:
    if (site.is_symlink() or not site.is_dir() or archive.exists() or archive.is_symlink()
            or archive.resolve().is_relative_to(site.resolve())):
        raise ValueError("Require a real site directory and a new archive outside that site")
    files, aliases = trusted_inventory(receipt, expected_sha, city)
    names = {relative: name for name, relative in aliases.items()}
    temp = None
    try:
        with tempfile.NamedTemporaryFile(dir=archive.parent, delete=False) as dest:
            temp = Path(dest.name)
            with gzip.GzipFile(filename="", fileobj=dest, mode="wb", mtime=0, compresslevel=6) as compressed, \
                    tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as tar:
                if len(files) < MAX_MEMBERS:  # Otherwise the site prefix is implicit.
                    root = tarfile.TarInfo("site")
                    root.type, root.mode = tarfile.DIRTYPE, 0o755
                    tar.addfile(root)
                seen = set()
                for path in sorted(site.rglob("*")):
                    if path.is_symlink():
                        raise ValueError("Site symlinks are forbidden")
                    if path.is_dir():
                        continue
                    relative = path.relative_to(site).as_posix()
                    record = files.get(relative)
                    if record is None or not path.is_file():
                        raise ValueError("Site contains an unsealed or special file")
                    info = tarfile.TarInfo("site/" + names.get(relative, relative))
                    info.size, info.mode = record["bytes"], 0o644
                    with path.open("rb") as source:
                        if os.fstat(source.fileno()).st_size != info.size:
                            raise ValueError("File size differs from detached inventory")
                        reader = _HashingReader(source)
                        tar.addfile(info, reader)
                        if source.read(1) or reader.digest.hexdigest() != record["sha256"]:
                            raise ValueError("File content differs from detached inventory")
                    seen.add(relative)
                if seen != files.keys():
                    raise ValueError("Site is missing sealed files")
        if temp.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError("Archive exceeds transfer budget")
        os.link(temp, archive)  # Publish only the completed archive; never replace another file.
    finally:
        if temp is not None:
            temp.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("site", "archive", "receipt"):
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--receipt-sha256", required=True)
    parser.add_argument("--city", required=True)
    args = parser.parse_args()
    pack(args.site, args.archive, args.receipt, args.receipt_sha256, args.city)


if __name__ == "__main__":
    main()
