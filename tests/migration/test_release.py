import hashlib
import gzip
import importlib.util
import io
import json
from datetime import datetime, timezone
from pathlib import Path
import tarfile

import pytest

PATH = Path(__file__).resolve().parents[2] / "scripts/migration/verify_release.py"
SPEC = importlib.util.spec_from_file_location("release", PATH)
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


def write_acceptance(tmp_path, **changes):
    value = {"schema_version": 1, "city": "essen", "repository": "LN6666/crimemaps-Essen",
             "code_commit": "a" * 40, "release_status": "accepted_for_publication",
             "languages": ["de", "en", "zh"], "artifact_receipt_sha256": "b" * 64,
             "prelaunch_refresh": {"status": "passed", "city": "essen", "repository": "LN6666/crimemaps-Essen",
                 "last_successful_source_check": datetime.now(timezone.utc).isoformat(),
                 "checked_candidate_receipt_sha256": "b" * 64, "evidence_sha256": "f" * 64},
             "checks": {k: {"status": "passed", "evidence_sha256": "c" * 64} for k in release.CHECKS},
             "input_bindings": {k: "d" * 64 for k in release.BINDINGS}}
    value.update(changes)
    path = tmp_path / "acceptance.json"
    path.write_text(json.dumps(value))
    return path, hashlib.sha256(path.read_bytes()).hexdigest()


def test_detached_acceptance_rejects_stale_commit_and_cross_city(tmp_path):
    path, digest = write_acceptance(tmp_path)
    release.acceptance(path, digest, "essen", "LN6666/crimemaps-Essen", "a" * 40)
    with pytest.raises(ValueError, match="stale"):
        release.acceptance(path, digest, "essen", "LN6666/crimemaps-Essen", "e" * 40)
    with pytest.raises(ValueError, match="stale"):
        release.acceptance(path, digest, "berlin", "LN6666/crimemaps-Berlin", "a" * 40)


def test_detached_acceptance_rejects_mutation_and_unconfigured_services(tmp_path):
    path, digest = write_acceptance(tmp_path)
    value = json.loads(path.read_text())
    value["checks"]["feedback"]["status"] = "implemented_service_unconfigured"
    path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match="trusted"):
        release.acceptance(path, digest, "essen", "LN6666/crimemaps-Essen", "a" * 40)
    with pytest.raises(ValueError, match="Unpassed"):
        release.acceptance(path, release.sha(path), "essen", "LN6666/crimemaps-Essen", "a" * 40)


@pytest.mark.parametrize("change", [
    {"status": "pending"}, {"city": "berlin"}, {"repository": "LN6666/crimemaps-Berlin"},
    {"checked_candidate_receipt_sha256": "e" * 64}, {"evidence_sha256": None},
    {"last_successful_source_check": "2026-10-03T00:00:00"},
    {"last_successful_source_check": "2026-09-29T23:59:59Z"},
    {"last_successful_source_check": "2026-10-03T00:00:01Z"},
    {"last_successful_source_check": "invalid"}, {"last_successful_source_check": None},
])
def test_prelaunch_refresh_blocks_invalid_unfinished_stale_and_foreign_receipts(tmp_path, change):
    refresh = {"status": "passed", "city": "essen", "repository": "LN6666/crimemaps-Essen",
               "last_successful_source_check": "2026-10-03T00:00:00Z",
               "checked_candidate_receipt_sha256": "b" * 64, "evidence_sha256": "f" * 64}
    refresh.update(change)
    path, digest = write_acceptance(tmp_path, prelaunch_refresh=refresh)
    with pytest.raises(ValueError):
        release.acceptance(path, digest, "essen", "LN6666/crimemaps-Essen", "a" * 40,
                           now=datetime(2026, 10, 3, tzinfo=timezone.utc))


def test_prelaunch_refresh_exact_72_hours_and_offset_are_accepted(tmp_path):
    path, digest = write_acceptance(tmp_path)
    value = json.loads(path.read_text())
    value['prelaunch_refresh']['last_successful_source_check'] = '2026-09-30T02:00:00+02:00'
    path.write_text(json.dumps(value))
    release.acceptance(path, release.sha(path), "essen", "LN6666/crimemaps-Essen", "a" * 40,
                       now=datetime(2026, 10, 3, tzinfo=timezone.utc))
    value.pop('prelaunch_refresh')
    path.write_text(json.dumps(value))
    with pytest.raises(ValueError, match='prelaunch'):
        release.acceptance(path, release.sha(path), "essen", "LN6666/crimemaps-Essen", "a" * 40)


def archive(tmp_path, members):
    path = tmp_path / "site.tar.gz"
    with tarfile.open(path, "w:gz") as stream:
        for name, kind in members:
            item = tarfile.TarInfo(name)
            if kind == "link":
                item.type = tarfile.SYMTYPE
                item.linkname = "/etc/passwd"
                stream.addfile(item)
            else:
                item.size = 4
                stream.addfile(item, io.BytesIO(b"test"))
    return path


@pytest.mark.parametrize("members", [
    [("site/../escape.txt", "file")],
    [("/site/escape.txt", "file")],
    [("site/data.json", "link")],
    [("site/data.json", "file"), ("site/data.json", "file")],
])
def test_untrusted_archive_rejected_before_output(tmp_path, members):
    path = archive(tmp_path, members)
    with pytest.raises(ValueError):
        release.unpack(path, tmp_path / "output")
    assert not (tmp_path / "output").exists()


def transport_fixture(tmp_path, schema=1):
    from pack_release import ALIAS_DIRECTORY, transport_name

    site = tmp_path / "source"
    payload = b"checked environment bytes"
    content_sha = hashlib.sha256(payload).hexdigest()
    paths = [
        f"safety/environment/essen/{kind}-{content_sha}.json.gz"
        for kind in ("regional-source-packed-ordinals", "regional-source-partition-proof", "hard-surface-membership-proof")
    ]
    paths.append(f"safety/environment/shared-display-source-binding-proof-{content_sha}.json")
    paths.append("index.html")
    for name in paths:
        target = site / name
        target.parent.mkdir(exist_ok=True, parents=True)
        target.write_bytes(payload)
    receipt = tmp_path / "receipt.json"
    receipt.write_text(json.dumps({"schema_version": schema, "city": "essen", "total_bytes": len(paths) * len(payload),
                                   "files": {name: {"bytes": len(payload), "sha256": content_sha} for name in paths}}))
    aliases = [transport_name(name, content_sha, "essen") for name in paths[:-1]]
    assert len(set(aliases)) == 4 and all(alias.startswith(ALIAS_DIRECTORY + "/") for alias in aliases)
    return site, receipt, paths, aliases, payload


@pytest.mark.parametrize("schema", [1, 2])
def test_ustar_roundtrip_uses_only_regular_files_and_restores_sealed_paths(tmp_path, schema):
    from pack_release import pack

    site, receipt, paths, aliases, payload = transport_fixture(tmp_path, schema)
    archive_path = tmp_path / "site.tar.gz"
    pack(site, archive_path, receipt, release.sha(receipt), "essen")
    with tarfile.open(archive_path, "r:gz") as stream:
        assert set(stream.getnames()) == {"site", "site/index.html", *("site/" + key for key in aliases)}
        assert all(member.isdir() or member.isfile() and not member.pax_headers for member in stream)
    second = tmp_path / "again.tar.gz"
    pack(site, second, receipt, release.sha(receipt), "essen")
    assert second.read_bytes() == archive_path.read_bytes()
    output = tmp_path / "unpacked"
    release.unpack(archive_path, output, receipt=receipt, receipt_sha256=release.sha(receipt), city="essen")
    assert {p.relative_to(output).as_posix(): p.read_bytes() for p in output.rglob("*") if p.is_file()} == {
        name: payload for name in paths}


def test_ustar_alias_requires_the_trusted_receipt_and_checks_bytes_before_extraction(tmp_path):
    from pack_release import pack

    site, receipt, paths, aliases, payload = transport_fixture(tmp_path)
    archive_path = tmp_path / "site.tar.gz"
    pack(site, archive_path, receipt, release.sha(receipt), "essen")
    output = tmp_path / "output"
    with pytest.raises(ValueError, match="Unknown or non-file USTAR alias"):
        release.unpack(archive_path, output)
    with pytest.raises(ValueError, match="trusted digest"):
        release.unpack(archive_path, output, receipt=receipt, receipt_sha256="a" * 64, city="essen")
    with pytest.raises(ValueError, match="city mismatch"):
        release.unpack(archive_path, output, receipt=receipt, receipt_sha256=release.sha(receipt), city="berlin")
    assert not output.exists()

    # Same-size content under the right alias still has to match the signed digest.
    with tarfile.open(archive_path, "w:gz", format=tarfile.USTAR_FORMAT) as stream:
        for wire in [*aliases, paths[-1]]:
            member = tarfile.TarInfo("site/" + wire)
            member.size = len(payload)
            stream.addfile(member, io.BytesIO(b"!" * len(payload) if wire == aliases[0] else payload))
    with pytest.raises(ValueError, match="alias content"):
        release.unpack(archive_path, output, receipt=receipt, receipt_sha256=release.sha(receipt), city="essen")
    assert not output.exists()


def test_only_reviewed_long_routes_and_regular_sealed_files_can_use_aliases(tmp_path):
    from pack_release import ALIAS_DIRECTORY, pack, transport_name

    site, receipt, paths, aliases, payload = transport_fixture(tmp_path)
    sha = hashlib.sha256(payload).hexdigest()
    with pytest.raises(ValueError, match="another city"):
        transport_name(paths[0], sha, "berlin")
    with pytest.raises(ValueError, match="Unsupported long path"):
        transport_name(paths[0].replace("regional-source-packed-ordinals", "not-an-approved-environment-type"), sha, "essen")
    with pytest.raises(ValueError, match="sealed content digest"):
        transport_name(paths[0], "b" * 64, "essen")
    with pytest.raises(ValueError, match="reserved"):
        transport_name(f"{ALIAS_DIRECTORY}/index.html", sha, "essen")
    archive_path = tmp_path / "site.tar.gz"
    (site / paths[0]).write_bytes(b"!" * len(payload))
    with pytest.raises(ValueError, match="content differs"):
        pack(site, archive_path, receipt, release.sha(receipt), "essen")
    assert not archive_path.exists()
    member = tarfile.TarInfo("site/" + ALIAS_DIRECTORY + "/unexpected")
    member.type = tarfile.DIRTYPE
    with tarfile.open(archive_path, "w:gz", format=tarfile.USTAR_FORMAT) as stream:
        stream.addfile(member)
    with pytest.raises(ValueError, match="Unknown or non-file USTAR alias"):
        release.unpack(archive_path, tmp_path / "output", receipt=receipt, receipt_sha256=release.sha(receipt), city="essen")
    assert not (tmp_path / "output").exists()

    with tarfile.open(archive_path, "w:gz", format=tarfile.USTAR_FORMAT) as stream:
        member = tarfile.TarInfo("site/unlisted-directory")
        member.type = tarfile.DIRTYPE
        stream.addfile(member)
    with pytest.raises(ValueError, match="outside the detached inventory"):
        release.unpack(archive_path, tmp_path / "output", receipt=receipt, receipt_sha256=release.sha(receipt), city="essen")
    assert not (tmp_path / "output").exists()


def test_safe_unpack_preserves_bytes_and_previous_output(tmp_path):
    path = archive(tmp_path, [("site/assets/main.js", "file")])
    output = tmp_path / "output"
    release.unpack(path, output)
    assert (output / "assets/main.js").read_bytes() == b"test"
    with pytest.raises(ValueError, match="Output exists"):
        release.unpack(path, output)


def test_extended_metadata_rejected_before_tarfile_parses_it(tmp_path):
    path = tmp_path / "pax.tar.gz"
    with tarfile.open(path, "w:gz", format=tarfile.PAX_FORMAT) as stream:
        member = tarfile.TarInfo("site/index.html")
        member.size = 4
        member.pax_headers = {"comment": "x" * (2 * 1024 * 1024)}
        stream.addfile(member, io.BytesIO(b"test"))
    with pytest.raises(ValueError, match="Extended metadata"):
        release.unpack(path, tmp_path / "output")
    assert not (tmp_path / "output").exists()


def test_actual_decompression_stream_is_bounded(tmp_path, monkeypatch):
    path = archive(tmp_path, [("site/index.html", "file")])
    monkeypatch.setattr(release, "MAX_TAR_STREAM_BYTES", 1024)
    with pytest.raises(ValueError, match="stream exceeds"):
        release.unpack(path, tmp_path / "output")
    assert not (tmp_path / "output").exists()


def test_nonzero_directory_cannot_hide_pax_from_header_precheck(tmp_path):
    nested = io.BytesIO()
    with tarfile.open(fileobj=nested, mode="w", format=tarfile.PAX_FORMAT) as stream:
        member = tarfile.TarInfo("site/index.html")
        member.size = 4
        member.pax_headers = {"comment": "x" * (2 * 1024 * 1024)}
        stream.addfile(member, io.BytesIO(b"test"))
    directory = tarfile.TarInfo("site")
    directory.type = tarfile.DIRTYPE
    directory.size = len(nested.getvalue())
    path = tmp_path / "hidden-pax.tar.gz"
    path.write_bytes(gzip.compress(directory.tobuf(format=tarfile.USTAR_FORMAT) + nested.getvalue()))
    with pytest.raises(ValueError, match="Directory TAR member"):
        release.unpack(path, tmp_path / "output")
    assert not (tmp_path / "output").exists()
