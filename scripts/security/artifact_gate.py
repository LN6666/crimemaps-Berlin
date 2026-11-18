#!/usr/bin/env python3
"""Seal/verify an accepted static artifact. Receipt must remain outside the public site.

Checksums prove byte integrity against a trusted detached digest, not source truth or
protection from an attacker controlling both the trusted build and deployment.
"""
import argparse
import gzip
import hashlib
import json
import re
import zlib
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

CITIES = set("berlin hamburg munich cologne frankfurt dusseldorf stuttgart leipzig dortmund bremen essen dresden hannover nuremberg".split())
ALLOWED = set(".html .js .mjs .css .json .geojson .png .jpg .jpeg .webp .ico .svg .woff .woff2 .ttf .txt .xml".split())
KBO_MAP_IMAGES = {'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-alexanderplatz.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-kottbusser-tor.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-rigaer-strasse.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-hermannstrasse-bahnhof-neukoelln.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-goerlitzer-park-wrangelkiez.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-warschauer-bruecke.jpg', 'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/kbo-hermannplatz-donaukiez.jpg'}
PRIVATE = {"raw_html", "article_body", "source_body", "raw_body", "full_body", "full_text", "authorization", "api_key", "access_token", "private_key", "password", "secret"}
FORBIDDEN_PARTS = {".runtime", ".git", "node_modules", "src", "test_suite", "reviews", "review", "archives", "archive", "source-downloads"}
SECRET = re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b|\bAKIA[A-Z0-9]{16}\b")
SVG_TAGS = set("svg g path circle ellipse line polyline polygon rect text tspan title desc defs linearGradient radialGradient stop clipPath mask use".split())

# Only the existing city data transports are gzip. Executable/archive suffixes
# remain forbidden; decoded JSON receives the same content checks as raw JSON.
MAX_GZIP_FILE_BYTES = 64 * 1024**2
MAX_GZIP_TOTAL_BYTES = 4_000_000_000


REGIONAL_SCHEMAS = {
    "source-packed-ordinals": "B-source-packed-ordinals-v1",
    "cohort": "environment-ground-regional-cohort-v1",
    "page": "environment-ground-regional-page-v1",
    "held-page": "environment-ground-regional-held-page-v1",
    "provenance": "environment-ground-regional-provenance-v1",
    "source-partition-proof": "environment-ground-source-partition-proof-v1",
}

def regional_binding(relative, city):
    hard = re.fullmatch(rf"safety/environment/{city}/hard-surface-(catalog|display-mesh|membership-proof)-[a-f0-9]{{64}}\.json\.gz", relative)
    if hard:
        schemas = {"catalog": "environment-hard-surface-display-catalog-v1", "display-mesh": "environment-hard-surface-display-mesh-v1", "membership-proof": "environment-hard-surface-display-membership-proof-v1"}
        return city, schemas[hard[1]]
    match = re.fullmatch(rf"safety/environment/{city}/regional-(cohort|page|held-page|provenance|source-partition-proof|source-packed-ordinals)-[a-f0-9]{{64}}\.json\.gz", relative)
    return (city, REGIONAL_SCHEMAS[match[1]]) if match else None


def compressed_json_path(relative, city):
    hashed = [
        rf"safety/environment/{city}/hard-surface-(?:catalog|display-mesh|membership-proof)-(?P<sha>[a-f0-9]{{64}})\.json\.gz",
        r"safety/lossless/english3-(?P<sha>[a-f0-9]{64})\.json\.gz",
        rf"safety/environment/{city}/regional-(?:cohort|page|held-page|provenance|source-partition-proof|source-packed-ordinals)-(?P<sha>[a-f0-9]{{64}})\.json\.gz",
        r"safety/lossless/(?P<sha>[a-f0-9]{64})\.json\.gz",
        r"safety/buildings3d/painted-tables/(?P<prefix>[a-f0-9]{2})/(?P<sha>[a-f0-9]{64})\.json\.gz",
        r"safety/buildings3d/capability-native-lod1-(?P<sha>[a-f0-9]{64})\.json\.gz",
        rf"safety/buildings3d/{city}/(?:partition|roof500|roof500-partition)-(?P<sha>[a-f0-9]{{64}})\.json\.gz",
        rf"safety/buildings3d/detail-variants/{city}/[a-f0-9]{{64}}/(?:groups|mid|coarse)-(?P<sha>[a-f0-9]{{64}})\.json\.gz",
        # Building-focus leaf metadata (v2): canonical index SHA directory, wire-SHA file name.
        rf"safety/buildings3d/focus/{city}/[a-f0-9]{{64}}/(?P<sha>[a-f0-9]{{64}})\.json\.gz",
        rf"safety/environment/{city}/(?:environment|partition|ground-overview)-(?P<sha>[a-f0-9]{{64}})\.json\.gz",
    ]
    for pattern in hashed:
        match = re.fullmatch(pattern, relative)
        if match:
            values = match.groupdict()
            if values.get("prefix", values["sha"][:2]) != values["sha"][:2]:
                raise ValueError("Compressed asset prefix differs from SHA")
            return values["sha"]
    if re.fullmatch(rf"safety/buildings3d/{city}/(?:flat|roof)-[0-9]{{5}}\.json\.gz", relative):
        return None
    if city == "berlin" and re.fullmatch(r"safety/buildings3d/berlin/appearance-reichstag-west(?:-aligned)?-[a-f0-9]{16}\.json\.gz", relative):
        return None
    raise ValueError("Unsupported compressed artifact path")


def painted_table_path(relative, raw_sha256=None):
    match = re.fullmatch(r"safety/buildings3d/painted-tables/([a-f0-9]{2})/([a-f0-9]{64})\.json(?:\.gz)?", relative)
    return bool(match and match[1] == match[2][:2]
                and (relative.endswith(".gz") or match[2] == raw_sha256))


def check_gzip_json(path, limit, *, painted_table=False, regional=None, translation_city=None):
    raw = bytearray()
    with path.open("rb") as compressed:
        if compressed.read(4) != b"\x1f\x8b\x08\x00":
            raise ValueError("Unsupported gzip metadata/header")
    with gzip.open(path, "rb") as stream:
        while chunk := stream.read(min(1024 * 1024, limit - len(raw) + 1)):
            if len(raw) + len(chunk) > limit:
                raise ValueError("Compressed JSON exceeds decoded artifact budget")
            raw.extend(chunk)
    if SECRET.search(raw):
        raise ValueError("Credential signature found; details suppressed")
    raw_sha256 = hashlib.sha256(raw).hexdigest()
    document = json.loads(raw)
    check_json(document, painted_table_sha256=raw_sha256 if painted_table else None)
    if regional is not None:
        if not isinstance(document, dict) or (document.get("city"), document.get("schema")) != regional:
            raise ValueError("Regional asset city/schema binding differs")
    if translation_city is not None:
        if (not isinstance(document, dict) or document.get("city") != translation_city or
                document.get("locale") != "en" or type(document.get("schema_version")) is not int or document["schema_version"] != 1 or
                not re.fullmatch(r"\d{4}-(?:0[1-9]|1[0-2])", str(document.get("month", ""))) or
                not re.fullmatch(r"[a-f0-9]{16}-\d{8}T\d{6}", str(document.get("source_generation", ""))) or
                not isinstance(document.get("fields"), list) or not isinstance(document.get("texts"), (dict, list))):
            raise ValueError("English translation transport binding differs")
    return {"encoding": "gzip", "decoded_bytes": len(raw),
            "decoded_sha256": raw_sha256}

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def owner_shape_provenance(item, path):
    """Exact public model-provenance text, not authority or geometry validation."""
    return (
        path is not None and len(path) == 5
        and path[0] == "components" and type(path[1]) is int
        and path[2:] == ("sourceFeature", "properties", "owner_shape_patch")
        and item.get("authorization") in (
            "scope/delegated-full500-repair-authorization-evidence.json",
            "Delegatedfull500 originalsource-backedmissingcomponentrepair; no sourcefootprintexpansion.",
            "User: 修复这种缺陷建筑，把它还原回来。",
        )
    )

def palette_provenance(item, path, root, table_sha256):
    """Two reviewed colour-provenance literals in exact frozen table variants.

    The digest is computed from actual raw bytes by scan/decode, never read from
    a JSON claim. The stored request is data, not publication authorization.
    """
    # Frozen master variants and exact Frankfurt profile tables retain
    # the same reviewed record. Bind its position separately for each digest.
    row = {
        "bf6c0c7678fb129cb3fbf9946a3ca9a491370a8489022e5c492ce7e8fd60f651": 88,
        "d94bfab58ea8a0cecba91b0180cc362dc4f3e963c00b5a03dba0a56326afbe83": 88,
        "c636dac655350b26d5e46e924821a6b968b00836f211039ef5e54dc072812e01": 2,
        "e1eb4b39b1fc0f821147d4cf112734e8fc36be3332fa5f3fd9832b36587a6578": 2,
        "ee6cf6a408e7098f6112ef1cfca3cad7115e3c7014ca0d0cbeada693a64d0f77": 2,
        "f7e3b4b8e23ef7a3145a84180aae9ffb2bc115b3d68fefeb3c7b0e084a452a0b": 2,
        "cfc11cd9c71facd52bce2504d1a5f077a4787311c07170c63c9ba960bb4c41db": 2,
        "7ff08cb8b054694b1e31bf0d243ffb5cd9eebb27f0e2f03159314d05f8ba105a": 2,
        "0d0fef767520d12c46dc01f4e647e78c02494ae485128947b59da3d1e3b246eb": 2,
        "4568938b48880e52bd690758d8d44df2e9bff4ded295fa5c0009584be17b8b02": 2,
    }.get(table_sha256)
    if (row is None or not isinstance(root, list) or len(root) <= row
            or path is None or len(path) != 3
            or type(path[0]) is not int or path[:2] != (row, "evidence")):
        return False
    record = root[row]
    if (not isinstance(record, dict)
            or record.get("city") != "frankfurt"
            or record.get("objectId") != "osm/way/174531611"
            or record.get("partId") != "osm/way/174531611/component/35632db3b084b70af282"):
        return False
    expected = {
        "beigeYellowPierMapping": "Direct owner 浅米色和米黄色 +root source-photo review and requested native buttress mapping",
        "wallOwnerColorCorrection": "User explicitly requested 浅米色和米黄色, delivered by root task message",
    }.get(path[2])
    return expected is not None and item.get("authorization") == expected


def check_json(value, *, painted_table_sha256=None):
    stack = [(value, ())]
    while stack:
        item, path = stack.pop()
        if isinstance(item, dict):
            provenance = (owner_shape_provenance(item, path)
                          or palette_provenance(item, path, value, painted_table_sha256))
            for key in item:
                if str(key).lower() in PRIVATE and not (key == "authorization" and provenance):
                    raise ValueError("Private JSON field in public artifact")
                # Public translation provenance must identify an approved review,
                # not expose the producer's local filesystem. Do not scan body
                # text here: quoted source content is not a provenance field.
                if str(key).lower() == "candidate_source" and isinstance(item[key], str):
                    if re.match(r"^(?:/|~[/\\]|[A-Za-z]:[/\\]|\\\\|file:)", item[key].strip(), re.I):
                        raise ValueError("Local filesystem provenance in public artifact")
            # Only the exact five-level context matters; deeper paths cannot qualify.
            stack.extend((child, path + (str(key),) if path is not None and len(path) < 5 else None)
                         for key, child in item.items() if isinstance(child, (dict, list)))
        elif isinstance(item, list):
            stack.extend((child, path + (index,) if path is not None and len(path) < 5 else None)
                         for index, child in enumerate(item) if isinstance(child, (dict, list)))

def check_svg(raw):
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("SVG entities/DOCTYPE forbidden")
    root = ET.fromstring(raw)
    if root.tag.split("}")[-1] != "svg":
        raise ValueError("Not SVG")
    for element in root.iter():
        if element.tag.split("}")[-1] not in SVG_TAGS:
            raise ValueError("Active/unsupported SVG element")
        for key, value in element.attrib.items():
            key = key.split("}")[-1].lower()
            if key.startswith("on") or key in {"src", "base"}:
                raise ValueError("Active SVG attribute")
            if key == "href" and not re.fullmatch(r"#[A-Za-z_][A-Za-z0-9_.:-]*", value):
                raise ValueError("External SVG reference")
            if re.search(r"@import|expression\s*\(|javascript\s*:|data\s*:|https?\s*:|//", value, re.I):
                raise ValueError("External/active SVG value")
            for reference in re.findall(r"url\s*\((.*?)\)", value, re.I):
                if not re.fullmatch(r"['\"]?#[A-Za-z_][A-Za-z0-9_.:-]*['\"]?", reference.strip()):
                    raise ValueError("Unsafe SVG CSS reference")

class StaticHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.csp = False
        self.script = False
        self.goatcounter = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if any(k.lower().startswith("on") for k in attrs):
            raise ValueError("HTML event handler forbidden")
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "content-security-policy":
            policy = attrs.get("content", "")
            directives = dict((p.strip().split(None, 1) + [""])[:2] for p in policy.split(";") if p.strip())
            if directives.get("script-src") not in {"'none'", "'self'", "'self' https://gc.zgo.at", "'self' 'wasm-unsafe-eval'", "'self' https://gc.zgo.at 'wasm-unsafe-eval'"} or directives.get("object-src") != "'none'" or directives.get("base-uri") != "'none'":
                raise ValueError("Missing restrictive executable-content CSP")
            if "cloudflare" in policy.lower() or directives.get("frame-src") not in {None, "'none'"}:
                raise ValueError("Cancelled challenge or external frame permission")
            self.goatcounter = "https://gc.zgo.at" in directives.get("script-src", "").split()
            maps = {"https://tile.openstreetmap.org", "https://gdi.berlin.de", "https://vector.openstreetmap.org", "https://demotiles.maplibre.org", "https://tiles.openfreemap.org"}
            connect = set(directives.get("connect-src", "").split())
            images = set(directives.get("img-src", "").split())
            approved_count = "https://ryoushunnei.goatcounter.com/count"
            if not connect <= {"'none'", "'self'", *maps, *({approved_count} if self.goatcounter else set())}:
                raise ValueError("Unapproved connect permission")
            if not images <= {"'none'", "'self'", "data:", "blob:", *maps, *KBO_MAP_IMAGES}:
                raise ValueError("Unapproved image permission")
            if self.goatcounter and approved_count not in connect:
                raise ValueError("GoatCounter needs the exact approved count path")
            self.csp = True
        if tag == "script":
            src = attrs.get("src", "")
            goatcounter = src == "https://gc.zgo.at/count.v5.js" and self.goatcounter
            if goatcounter and (attrs.get("integrity") != "sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ" or attrs.get("crossorigin") != "anonymous"):
                raise ValueError("GoatCounter needs the reviewed script integrity")
            if goatcounter and attrs.get("data-goatcounter") not in {None, "https://ryoushunnei.goatcounter.com/count"}:
                raise ValueError("Unapproved GoatCounter account")
            if not goatcounter and (not src or src.startswith("//") or re.search(r"[\\:%\s]", src) or ".." in src.split("/")):
                raise ValueError("Inline/external script forbidden")
            self.script = True
    def handle_endtag(self, tag):
        if tag == "script":
            self.script = False
    def handle_data(self, data):
        if self.script and data.strip():
            raise ValueError("Inline script body forbidden")

def scan(root, city, commit):
    if city not in CITIES or not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("City or code commit invalid")
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Artifact root must be a real directory")
    files = {}
    total = 0
    generations = set()
    decoded_total = 0
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        parts = path.relative_to(root).parts
        if path.is_symlink():
            raise ValueError("Artifact symlink forbidden")
        if path.is_dir():
            continue
        if not path.is_file() or any(part in FORBIDDEN_PARTS for part in parts):
            raise ValueError("Private/unsupported artifact path")
        if any(part.startswith(".") for part in parts) and relative not in {".nojekyll", ".well-known/security.txt"}:
            raise ValueError("Hidden artifact path forbidden")
        compressed = path.suffix.lower() == ".gz"
        named_sha = compressed_json_path(relative, city) if compressed else None
        if path.suffix.lower() not in ALLOWED and relative != ".nojekyll" and not compressed:
            raise ValueError("Unsupported artifact extension")
        if re.search(r"(?i)(?:sqlite|credentials|source[-_]review|review[-_]decisions|scope[-_]decisions|scene[-_]decisions|geometry[-_]decisions|map[-_]decisions|source[-_]packet|owner[-_]review)", relative):
            raise ValueError("Private audit/credential file forbidden")
        size = path.stat().st_size
        total += size
        if total > 900_000_000 or size > 100_000_000 or len(files) >= 100_000:
            raise ValueError("Artifact exceeds bounded Pages budget")
        suffix = path.suffix.lower()
        physical_sha = digest(path)
        decoded = {}
        if compressed:
            if named_sha is not None and physical_sha != named_sha:
                raise ValueError("Compressed asset filename SHA differs")
            regional = regional_binding(relative, city)
            if regional is not None and size > 1024**2:
                raise ValueError("Regional asset exceeds transport budget")
            decoded = check_gzip_json(path, min(1024**2 if regional else MAX_GZIP_FILE_BYTES, MAX_GZIP_TOTAL_BYTES - decoded_total),
                                      painted_table=painted_table_path(relative), regional=regional,
                                      translation_city=city if re.fullmatch(r"safety/lossless/english3-[a-f0-9]{64}\.json\.gz", relative) else None)
            decoded_total += decoded["decoded_bytes"]
        if suffix in {".html", ".js", ".mjs", ".css", ".json", ".geojson", ".txt", ".xml", ".svg"}:
            raw = path.read_bytes()
            if SECRET.search(raw):
                raise ValueError("Credential signature found; details suppressed")
            if suffix in {".json", ".geojson"}:
                raw_sha256 = hashlib.sha256(raw).hexdigest()
                check_json(json.loads(raw), painted_table_sha256=(
                    raw_sha256 if painted_table_path(relative, raw_sha256) else None))
            if suffix == ".svg":
                check_svg(raw)
            # Google's ownership response is plain text with an .html suffix.
            # Exempt only this exact city/path/content; executable HTML still
            # requires the ordinary restrictive CSP checks below.
            ownership_response = (
                city == "berlin"
                and relative == "google73948d3ce3a710e9.html"
                and raw == b"google-site-verification: google73948d3ce3a710e9.html"
            )
            if suffix == ".html" and not ownership_response:
                parser = StaticHTML()
                parser.feed(raw.decode("utf-8"))
                if not parser.csp:
                    raise ValueError("Public HTML missing CSP")
        for part in parts:
            if re.fullmatch(r"[a-f0-9]{16}-\d{8}T\d{6}", part):
                generations.add(part)
        files[relative] = {"sha256": physical_sha, "bytes": size, **decoded}
    if "index.html" not in files or len(generations) > 1:
        raise ValueError("Missing entrance or multiple data generations")
    return {"schema_version": 1, "city": city, "code_commit": commit, "total_bytes": total, "files": files}

def verify(root, expected, expected_sha256, city, commit):
    if not re.fullmatch(r"[a-f0-9]{64}", expected_sha256) or digest(expected) != expected_sha256:
        raise ValueError("Detached receipt does not match trusted digest")
    actual = scan(root, city, commit)
    if json.loads(expected.read_text()) != actual:
        raise ValueError("Artifact differs from accepted receipt")
    return actual

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["seal", "verify"])
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--city", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--expected", type=Path)
    parser.add_argument("--expected-sha256")
    args = parser.parse_args()
    try:
        if args.mode == "seal":
            if not args.out or args.artifact.resolve() == args.out.resolve() or args.artifact.resolve() in args.out.resolve().parents:
                raise ValueError("Receipt must be outside artifact")
            result = scan(args.artifact, args.city, args.commit)
            args.out.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n")
            receipt_hash = digest(args.out)
        else:
            if not args.expected or not args.expected_sha256:
                raise ValueError("Expected receipt and trusted digest required")
            result = verify(args.artifact, args.expected, args.expected_sha256, args.city, args.commit)
            receipt_hash = args.expected_sha256
        print(json.dumps({"ok": True, "city": args.city, "files": len(result["files"]), "bytes": result["total_bytes"], "receipt_sha256": receipt_hash}))
    except (ValueError, OSError, ET.ParseError, UnicodeError, zlib.error) as error:
        parser.exit(1, f"Artifact gate rejected: {error}\n")

if __name__ == "__main__":
    main()
