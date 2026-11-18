"""Verify the city data activation gate after ordinary release verification."""
import argparse
import gzip
import hashlib
import io
import json
import re
from pathlib import Path


SHA_PATTERN = r"[a-f0-9]{64}"
ASSET_PATTERN = r"/safety/buildings3d/painted-tables/[a-f0-9]{2}/[a-f0-9]{64}\.json(?:\.gz)?"
MAX_TABLE_BYTES = 64 * 1024 ** 2
CITY_IDS = {"berlin", "hamburg", "munich", "cologne", "frankfurt", "dusseldorf", "stuttgart",
            "leipzig", "dortmund", "bremen", "essen", "dresden", "hannover", "nuremberg"}


def expected_city_data_routes(dependencies, city, selector_version):
    if city not in CITY_IDS or selector_version not in ("city-data-v1", "city-data-v2", "city-data-v3"):
        raise ValueError("Unknown city data selector version/city")
    rules = [(provider, f"painted/{provider}/safety/progressive-{name}.ts", selector)
             for provider in ("city", "root500", "delegated500", "tier300")
             for name, selector in (("paint-admissions", "city-rows"), ("feature-cities", "city-key"))]
    rules += [(provider, f"painted/{provider}/safety/progressive-{name}-programs.ts", f"{name}-catalog")
              for provider in ("root500", "delegated500") for name in ("berlin", "hamburg")]
    extra = (["bremen"] if city == "bremen" else
             ["infill"] if city in ("frankfurt", "stuttgart", "essen") else [])
    if selector_version != "city-data-v1":
        rules += [(provider, f"painted/{provider}/safety/progressive-{name}.ts", selector)
                  for provider in extra
                  for name, selector in (("paint-admissions", "city-rows"), ("feature-cities", "city-key"))]
        if city == "bremen":
            rules.append(("bremen", "painted/bremen/safety/repairs-data.ts", "model-targets"))
    if selector_version == "city-data-v3" and city == "frankfurt":
        rules.append(("infill", "painted/infill/safety/infill-frankfurt-low-office-bulk70-data.ts", "group-targets"))
    result = {}
    for provider, file, selector in rules:
        matches = [(sha, refs[file]) for sha, refs in dependencies.get("initializers", {}).get(provider, {}).items()
                   if file in refs]
        if len(matches) != 1 or type(matches[0][1]) is not int or matches[0][1] != 1 or not valid_sha(matches[0][0]):
            raise ValueError("Ambiguous or missing city initializer binding: " + file)
        result[file] = {"file": file, "canonicalSHA256": matches[0][0], "occurrence": 0, "selector": selector}
    return result


def city_route_assets(route):
    return ([] if route.get("selector") in ("model-targets", "group-targets") else [route["descriptor"]]) + [
        part["descriptor"] for part in route.get("partition", {}).get("parts", [])]


def model_envelope_index(route):
    """The full canonical descriptor is logical; every model/group has a physical part."""
    row_field = "groups" if route["selector"] == "group-targets" else "models"
    kind = "group-envelope" if route["selector"] == "group-targets" else "model-envelope"
    partition = route.get("partition")
    if (route["descriptor"].get("sha256") != route["canonicalSHA256"]
            or not safe_integer(route.get("canonicalCount"))
            or route.get("retainedCount") != route["canonicalCount"]
            or not isinstance(partition, dict) or partition.get("schemaVersion") != 1
            or partition.get("kind") != kind or not isinstance(partition.get("parts"), list)
            or not isinstance(partition.get("envelope"), dict) or row_field in partition["envelope"]):
        raise ValueError("Model target route requires a complete canonical partition")
    layout = partition.get("sourceLayout")
    if (not isinstance(layout, dict) or not isinstance(layout.get("prefix"), str)
            or not isinstance(layout.get("suffix"), str) or not isinstance(layout.get("separators"), list)
            or len(layout["separators"]) != max(0, route["retainedCount"] - 1)
            or any(not isinstance(separator, str) or re.fullmatch(r"\s*,\s*", separator) is None
                   for separator in layout["separators"])):
        raise ValueError("Invalid model envelope source layout")
    empty = strict_json(layout["prefix"] + layout["suffix"])
    if empty != {**partition["envelope"], row_field: []}:
        raise ValueError("Model envelope/source layout mismatch")
    seen_keys, seen_indices = set(), set()
    for part in partition["parts"]:
        keys, indices = part.get("keys"), part.get("rowIndices")
        if (not isinstance(keys, list) or not keys or any(not isinstance(key, str) or not key for key in keys)
                or len(set(keys)) != len(keys) or seen_keys.intersection(keys)
                or not isinstance(indices, list) or len(indices) != len(keys)
                or any(not safe_integer(index) or index >= route["retainedCount"] for index in indices)
                or indices != sorted(set(indices)) or seen_indices.intersection(indices)
                or ("oversizedAtomic" in part and (part["oversizedAtomic"] is not True or len(keys) != 1))
                or (part["descriptor"]["bytes"] > 256 * 1024 and part.get("oversizedAtomic") is not True)):
            raise ValueError("Invalid model envelope partition index")
        seen_keys.update(keys)
        seen_indices.update(indices)
    if len(seen_indices) != route["retainedCount"]:
        raise ValueError("Incomplete model envelope partition index")


def profile_resource_contract(profile, dependencies, canonical_manifest, city):
    """One exact source/profile/runtime closure, shared with private candidates."""
    expected = expected_city_data_routes(dependencies, city, profile.get("selectorVersion"))
    if (profile.get("schemaVersion") != 1 or profile.get("city") != city
            or not isinstance(profile.get("routes"), list) or len(profile["routes"]) != len(expected)):
        raise ValueError("City profile route closure mismatch")
    canonical = {d["sha256"]: d for d in canonical_manifest}
    descriptors, routes, seen = dict(canonical), {}, set()
    for route in profile["routes"]:
        if not isinstance(route, dict) or route.get("file") not in expected or route["file"] in seen:
            raise ValueError("Duplicate or extra city profile route")
        binding = expected[route["file"]]
        original = canonical.get(route.get("canonicalSHA256"))
        if (any(route.get(key) != binding[key] for key in ("file", "canonicalSHA256", "occurrence", "selector"))
                or original is None or route.get("canonicalBytes") != original["bytes"]):
            raise ValueError("City profile route/source binding mismatch")
        seen.add(route["file"])
        if route["selector"] in ("model-targets", "group-targets"):
            model_envelope_index(route)
        routes[(route["file"], route["canonicalSHA256"], route["occurrence"])] = route
        for descriptor in [route["descriptor"], *[p["descriptor"] for p in route.get("partition", {}).get("parts", [])]]:
            prior = descriptors.setdefault(descriptor["sha256"], descriptor)
            if prior != descriptor:
                raise ValueError("Conflicting city profile descriptor")
    if seen != set(expected):
        raise ValueError("Incomplete city profile route closure")
    active = ["city", "root500", "delegated500", "tier300", "church"]
    active += ["bremen"] if city == "bremen" else ["infill"] if city in ("frankfurt", "stuttgart", "essen") else []
    needed, physical_needed = set(), set()
    for provider in active:
        for sha, refs in dependencies.get("initializers", {}).get(provider, {}).items():
            for file, count in refs.items():
                if type(count) is not int or count < 1:
                    raise ValueError("Invalid active city initializer count")
                for occurrence in range(count):
                    route = routes.get((file, sha, occurrence))
                    needed.add(route["descriptor"]["sha256"] if route else sha)
                    if route:
                        physical_needed.update(d["sha256"] for d in city_route_assets(route))
                    else:
                        physical_needed.add(sha)
    for route in profile["routes"]:
        if route["descriptor"]["sha256"] in needed:
            needed.update(p["descriptor"]["sha256"] for p in route.get("partition", {}).get("parts", []))
    if not needed <= descriptors.keys():
        raise ValueError("Missing active city runtime descriptor")
    runtime = {sha: descriptors[sha] for sha in needed}
    required_paths = {(descriptors[sha].get("transport") or descriptors[sha])["path"] for sha in physical_needed}
    removals = {}
    for route in profile["routes"]:
        if route["canonicalSHA256"] in physical_needed:
            continue
        descriptor = canonical[route["canonicalSHA256"]]
        physical = descriptor.get("transport", descriptor)
        if physical["path"] not in required_paths:
            removals[physical["path"]] = {key: physical[key] for key in ("path", "sha256", "bytes")}
    return {"routes": expected, "runtime": runtime, "removeCanonical": removals}


def strict_json(data):
    def object_pairs(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("Duplicate city data JSON key")
            value[key] = item
        return value

    def invalid_constant(_value):
        raise ValueError("Invalid city data JSON number")

    return json.loads(data, object_pairs_hook=object_pairs, parse_constant=invalid_constant)


def safe_integer(value, minimum=0):
    return type(value) is int and minimum <= value <= 2 ** 53 - 1


def valid_sha(value):
    return isinstance(value, str) and re.fullmatch(SHA_PATTERN, value) is not None


def js_object_keys(value):
    # Object.keys places array-index keys before other insertion-ordered keys.
    numeric = [key for key in value if re.fullmatch(r"0|[1-9][0-9]*", key)
               and int(key) < 2 ** 32 - 1]
    numeric.sort(key=int)
    numeric_keys = set(numeric)
    return numeric + [key for key in value if key not in numeric_keys]


def ordered_selection_sha(keys):
    text = json.dumps(keys, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    # JSON.stringify escapes unpaired UTF-16 surrogates, while leaving ordinary
    # non-ASCII identities intact. No float/model serialization is needed here.
    text = "".join(f"\\u{ord(char):04x}" if 0xD800 <= ord(char) <= 0xDFFF else char
                   for char in text)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def array_row_lexemes(raw):
    text = raw.decode("utf-8").strip()
    if not text.startswith("["):
        raise ValueError("Expected city partition row array")
    decoder = json.JSONDecoder()
    rows, offset = [], 1
    while True:
        while offset < len(text) and text[offset].isspace():
            offset += 1
        if offset < len(text) and text[offset] == "]" and not rows:
            offset += 1
            break
        start = offset
        _, offset = decoder.raw_decode(text, offset)
        rows.append(text[start:offset])
        while offset < len(text) and text[offset].isspace():
            offset += 1
        if offset < len(text) and text[offset] == "]":
            offset += 1
            break
        if offset >= len(text) or text[offset] != ",":
            raise ValueError("Invalid city partition row array")
        offset += 1
    if text[offset:].strip():
        raise ValueError("Trailing city partition row input")
    return rows


def object_member_lexemes(raw):
    text = raw.decode("utf-8").strip()
    if not text.startswith("{"):
        raise ValueError("Expected model envelope object")
    decoder, members, offset = json.JSONDecoder(), {}, 1
    while True:
        while offset < len(text) and text[offset].isspace():
            offset += 1
        if offset < len(text) and text[offset] == "}" and not members:
            offset += 1
            break
        key, offset = decoder.raw_decode(text, offset)
        if not isinstance(key, str) or key in members:
            raise ValueError("Invalid model envelope member")
        while offset < len(text) and text[offset].isspace():
            offset += 1
        if offset >= len(text) or text[offset] != ":":
            raise ValueError("Invalid model envelope member separator")
        offset += 1
        while offset < len(text) and text[offset].isspace():
            offset += 1
        start = offset
        _, offset = decoder.raw_decode(text, offset)
        members[key] = text[start:offset]
        while offset < len(text) and text[offset].isspace():
            offset += 1
        if offset < len(text) and text[offset] == "}":
            offset += 1
            break
        if offset >= len(text) or text[offset] != ",":
            raise ValueError("Invalid model envelope member ending")
        offset += 1
    if text[offset:].strip():
        raise ValueError("Trailing model envelope input")
    return members


def verify_model_envelope(route, payload):
    """Recover canonical bytes from parts; no full model file is published."""
    row_field = "groups" if route["selector"] == "group-targets" else "models"
    identity_field = "queueId" if route["selector"] == "group-targets" else "targetId"
    model_envelope_index(route)
    partition, count = route["partition"], route["retainedCount"]
    layout = partition["sourceLayout"]
    rows, targets, part_order = [None] * count, [None] * count, []
    for part in partition["parts"]:
        value, raw = payload(part["descriptor"])
        if (not isinstance(value, dict) or not isinstance(value.get(row_field), list)
                or {key: item for key, item in value.items() if key != row_field} != partition["envelope"]
                or len(value[row_field]) != len(part["rowIndices"])):
            raise ValueError("Model partition envelope/row mismatch")
        model_rows = array_row_lexemes(object_member_lexemes(raw)[row_field].encode("utf-8"))
        if raw != (layout["prefix"] + ",".join(model_rows) + layout["suffix"]).encode("utf-8"):
            raise ValueError("Model partition metadata lexeme mismatch")
        keys = []
        for offset, index in enumerate(part["rowIndices"]):
            model = value[row_field][offset]
            if not isinstance(model, dict) or not isinstance(model.get(identity_field), str) or not model[identity_field]:
                raise ValueError("Invalid model partition target")
            rows[index], targets[index] = model_rows[offset], model[identity_field]
            keys.append(model[identity_field])
        if keys != part["keys"]:
            raise ValueError("Model partition target/key mismatch")
        part_order.extend(keys)
    if (part_order != targets or ordered_selection_sha(targets) != route["orderedSelectionSHA256"]):
        raise ValueError("Model partition target order mismatch")
    body = "".join(row + (layout["separators"][index] if index < count - 1 else "")
                   for index, row in enumerate(rows))
    canonical = (layout["prefix"] + body + layout["suffix"]).encode("utf-8")
    if len(canonical) != route["canonicalBytes"] or hashlib.sha256(canonical).hexdigest() != route["canonicalSHA256"]:
        raise ValueError("Model partition canonical reconstruction mismatch")


def verify(site: Path, city: str, source_web: Path | None = None) -> dict:
    def read(name, max_bytes=100_000):
        path = site / name
        if path.is_symlink() or path.stat().st_size > max_bytes:
            raise ValueError("Invalid city profile receipt file")
        data = path.read_bytes()
        return strict_json(data), hashlib.sha256(data).hexdigest(), len(data)

    profile, profile_sha, profile_bytes = read("city-data-profile.json")
    source_web = source_web or Path(__file__).resolve().parents[2] / "web"
    dependencies = strict_json((source_web / "src/safety/frozen-paint-table-dependencies.json").read_bytes())
    canonical_manifest = strict_json((source_web / "src/safety/frozen-paint-table-manifest.json").read_bytes())
    canonical_by_sha = {d["sha256"]: d for d in canonical_manifest}
    contract = profile_resource_contract(profile, dependencies, canonical_manifest, city)
    expected_routes = contract["routes"]
    build, _, _ = read("city-data-build-receipt.json")
    receipt, _, _ = read("city-data-profile-receipt.json")
    runtime_tables, runtime_tables_sha, runtime_tables_bytes = read("city-data-tables.json", 500_000)
    if not isinstance(runtime_tables, list) or receipt.get("runtimeTableManifestSHA256") != runtime_tables_sha:
        raise ValueError("City runtime table manifest mismatch")
    if (profile.get("schemaVersion") != 1 or profile.get("city") != city
            or not isinstance(profile.get("routes"), list)
            or len(profile["routes"]) != len(expected_routes)
            or build.get("schemaVersion") != 1 or build.get("purpose") != "publication"
            or any(row.get("city") != city or row.get("profileSHA256") != profile_sha
                   or row.get("profileEnabled") is not True for row in [build, receipt])):
        raise ValueError("City profile activation mismatch")

    def checked_descriptor(descriptor):
        if (not isinstance(descriptor, dict)
                or not valid_sha(descriptor.get("sha256"))
                or not safe_integer(descriptor.get("bytes"), 1)
                or descriptor["bytes"] > MAX_TABLE_BYTES):
            raise ValueError("Invalid selected city descriptor")
        sha = descriptor["sha256"]
        expected = f"/safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json"
        if descriptor.get("path") != expected:
            raise ValueError("Unsafe selected asset path")
        transport = descriptor.get("transport")
        if transport is not None:
            if (not isinstance(transport, dict) or transport.get("encoding") != "gzip"
                    or not valid_sha(transport.get("sha256"))
                    or not safe_integer(transport.get("bytes"), 1)
                    or transport["bytes"] > MAX_TABLE_BYTES):
                raise ValueError("Invalid selected city transport")
            sha = transport["sha256"]
            if transport.get("path") != f"/safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json.gz":
                raise ValueError("Unsafe selected asset path")
        return descriptor

    runtime_by_sha = {}
    for row in runtime_tables:
        checked_descriptor(row)
        if row["sha256"] in runtime_by_sha:
            raise ValueError("Duplicate city runtime table descriptor")
        runtime_by_sha[row["sha256"]] = row
    if runtime_by_sha != contract["runtime"]:
        raise ValueError("City runtime active initializer closure mismatch")
    selected = {}
    for row in receipt["selectedAssets"]:
        if not isinstance(row, dict) or not isinstance(row.get("path"), str) or row["path"] in selected:
            raise ValueError("Duplicate or invalid selected city asset")
        selected[row["path"]] = row
    required, required_raw = {}, {}

    def require_descriptor(descriptor):
        checked_descriptor(descriptor)
        sha = descriptor["sha256"]
        if sha in required_raw and required_raw[sha] != descriptor:
            raise ValueError("Conflicting selected city descriptor")
        if runtime_by_sha.get(sha) != descriptor:
            raise ValueError("City partition runtime descriptor closure mismatch")
        required_raw[sha] = descriptor
        physical = descriptor.get("transport", descriptor)
        if physical["path"] in required and required[physical["path"]] != physical:
            raise ValueError("Conflicting selected city physical asset")
        required[physical["path"]] = physical

    expected_files = set(expected_routes)
    identities, files = set(), set()
    for route in profile["routes"]:
        if (not isinstance(route, dict)
                or not isinstance(route.get("file"), str)
                or route["file"] not in expected_files
                or not valid_sha(route.get("canonicalSHA256"))
                or not safe_integer(route.get("canonicalBytes"), 1)
                or not safe_integer(route.get("canonicalCount"))
                or not safe_integer(route.get("retainedCount"))
                or route["retainedCount"] > route["canonicalCount"]
                or not safe_integer(route.get("occurrence")) or route["occurrence"] != 0
                or not valid_sha(route.get("orderedSelectionSHA256"))):
            raise ValueError("Invalid city partition route identity/count")
        expected = expected_routes[route["file"]]
        original = canonical_by_sha.get(route["canonicalSHA256"])
        if (any(route.get(key) != expected[key] for key in ("file", "canonicalSHA256", "occurrence", "selector"))
                or original is None or route["canonicalBytes"] != original["bytes"]):
            raise ValueError("City partition route/source binding mismatch")
        identity = (route["file"], route["canonicalSHA256"], route["occurrence"])
        if identity in identities or route["file"] in files:
            raise ValueError("Duplicate city partition route")
        identities.add(identity)
        files.add(route["file"])
        validation = route.get("canonicalValidation")
        if validation is not None and (not isinstance(validation, dict)
                or not safe_integer(validation.get("fullMapSize"))
                or validation.get("fullMapSize") != route["canonicalCount"]
                or not valid_sha(validation.get("sourceSHA256"))):
            raise ValueError("Canonical city admission count mismatch")
        if route["selector"] in ("model-targets", "group-targets"):
            checked_descriptor(route["descriptor"])
            if runtime_by_sha.get(route["descriptor"]["sha256"]) != route["descriptor"]:
                raise ValueError("Logical model runtime descriptor mismatch")
        else:
            require_descriptor(route["descriptor"])
        partition = route.get("partition")
        if partition is not None:
            kind = {"city-rows": "object-rows", "model-targets": "model-envelope", "group-targets": "group-envelope", "berlin-catalog": "record-keys",
                    "hamburg-catalog": "record-keys"}.get(route.get("selector"))
            if (not isinstance(partition, dict) or kind is None
                    or partition.get("schemaVersion") != 1 or partition.get("kind") != kind
                    or not isinstance(partition.get("parts"), list)):
                raise ValueError("Invalid city partition index")
            for part in partition["parts"]:
                if not isinstance(part, dict):
                    raise ValueError("Invalid city partition part")
                require_descriptor(part["descriptor"])
                if part["descriptor"]["bytes"] > 256 * 1024 and part.get("oversizedAtomic") is not True:
                    raise ValueError("City partition exceeds 256 KiB without an atomic identity")
    if files != expected_files:
        raise ValueError("Incomplete city partition route closure")
    if set(selected) != set(required):
        raise ValueError("City payload closure mismatch")
    for name, row in required.items():
        if not re.fullmatch(ASSET_PATTERN, name):
            raise ValueError("Unsafe selected asset path")
        if any(selected[name][key] != row[key] for key in ["sha256", "bytes"]):
            raise ValueError("Selected asset identity mismatch")

    def payload(descriptor):
        row = descriptor.get("transport", descriptor)
        name = row["path"]
        asset = site / name.lstrip("/")
        if asset.is_symlink() or asset.stat().st_size != row["bytes"]:
            raise ValueError("Selected city asset missing or changed")
        physical = asset.read_bytes()
        if hashlib.sha256(physical).hexdigest() != row["sha256"]:
            raise ValueError("Selected city asset hash mismatch")
        if descriptor.get("transport") is not None:
            with gzip.GzipFile(fileobj=io.BytesIO(physical)) as stream:
                raw = stream.read(descriptor["bytes"] + 1)
        else:
            raw = physical
        if len(raw) != descriptor["bytes"] or hashlib.sha256(raw).hexdigest() != descriptor["sha256"]:
            raise ValueError("Selected city raw hash mismatch")
        return strict_json(raw), raw

    partitioned_routes = partition_parts = 0
    for route in profile["routes"]:
        if route["selector"] in ("model-targets", "group-targets"):
            verify_model_envelope(route, payload)
            partitioned_routes += 1
            partition_parts += len(route["partition"]["parts"])
            continue
        value, raw = payload(route["descriptor"])
        if route["descriptor"]["sha256"] == route["canonicalSHA256"] and len(raw) != route["canonicalBytes"]:
            raise ValueError("Selected canonical city byte count mismatch")
        if route["selector"] == "city-rows":
            if not isinstance(value, list) or any(not isinstance(row, dict)
                    or row.get("city") != city
                    or not isinstance(row.get("objectId"), str) or not row["objectId"]
                    or not isinstance(row.get("partId"), str) or not row["partId"] for row in value):
                raise ValueError("Invalid or foreign selected city row")
            ordered_keys = [[row["city"], row["objectId"], row["partId"]] for row in value]
            if len({tuple(key) for key in ordered_keys}) != len(ordered_keys):
                raise ValueError("Duplicate selected city admission row")
        else:
            if not isinstance(value, dict) or any(not isinstance(source, str) for source in value.values()):
                raise ValueError("Invalid selected city program catalog")
            ordered_keys = js_object_keys(value)
            if route["selector"] == "city-key" and ordered_keys != [city]:
                raise ValueError("Selected city program key mismatch")
            if route["selector"] not in ("city-key", "berlin-catalog", "hamburg-catalog"):
                raise ValueError("Unknown city selector")
        if (len(ordered_keys) != route["retainedCount"]
                or ordered_selection_sha(ordered_keys) != route["orderedSelectionSHA256"]):
            raise ValueError("Selected city order/count receipt mismatch")
        partition = route.get("partition")
        if partition is None:
            continue
        partitioned_routes += 1
        partition_parts += len(partition["parts"])
        whole_rows = array_row_lexemes(raw) if partition["kind"] == "object-rows" else None
        seen_keys, seen_indices, part_key_order = set(), set(), []
        for part in partition["parts"]:
            keys = part.get("keys")
            if (not isinstance(keys, list) or not keys
                    or any(not isinstance(key, str) or not key for key in keys)
                    or len(set(keys)) != len(keys) or seen_keys.intersection(keys)):
                raise ValueError("Duplicate or invalid city partition keys")
            if "oversizedAtomic" in part and (part["oversizedAtomic"] is not True or len(keys) != 1):
                raise ValueError("Invalid atomic city partition")
            seen_keys.update(keys)
            part_key_order.extend(keys)
            part_value, part_raw = payload(part["descriptor"])
            if partition["kind"] == "object-rows":
                indices = part.get("rowIndices")
                if (not isinstance(part_value, list) or not part_value
                        or not isinstance(indices, list) or len(indices) != len(part_value)
                        or any(not safe_integer(index) or index >= len(value) for index in indices)
                        or indices != sorted(set(indices)) or seen_indices.intersection(indices)):
                    raise ValueError("Duplicate or invalid city partition row order")
                part_rows = array_row_lexemes(part_raw)
                if any(part_rows[offset] != whole_rows[index] for offset, index in enumerate(indices)):
                    raise ValueError("City partition row lexeme mismatch")
                actual_keys = list(dict.fromkeys(value[index]["city"] + "|" + value[index]["objectId"] for index in indices))
                if keys != actual_keys:
                    raise ValueError("City partition object cohort mismatch")
                seen_indices.update(indices)
            else:
                if "rowIndices" in part or not isinstance(part_value, dict) or js_object_keys(part_value) != keys:
                    raise ValueError("City partition catalog key mismatch")
                if any(key not in value or part_value[key] != value[key] for key in keys):
                    raise ValueError("City partition program source mismatch")
        expected_keys = (list(dict.fromkeys(row["city"] + "|" + row["objectId"] for row in value))
                         if whole_rows is not None else ordered_keys)
        if part_key_order != expected_keys or (whole_rows is not None and len(seen_indices) != len(value)):
            raise ValueError("Incomplete city partition row/key closure")
    excluded = receipt["excludedCanonicalInputs"]
    if (not isinstance(excluded, list) or len({row["path"] for row in excluded}) != len(excluded)
            or {row["path"]: row for row in excluded} != contract["removeCanonical"]):
        raise ValueError("City canonical removal dependency closure mismatch")
    for row in excluded:
        if not re.fullmatch(ASSET_PATTERN, row["path"]):
            raise ValueError("Unsafe excluded canonical path")
        if (site / row["path"].lstrip("/")).exists():
            raise ValueError("Unselected canonical input retained in city publication")
    return {"city": city, "profileSHA256": profile_sha, "selectedAssets": len(required),
            "runtimeTableManifestSHA256": runtime_tables_sha, "profileIndexBytes": profile_bytes,
            "runtimeTableManifestBytes": runtime_tables_bytes, "partitionedRoutes": partitioned_routes,
            "partitionParts": partition_parts, "verified": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--city", required=True)
    parser.add_argument("--source-web", type=Path,
                        help="Authoritative source web directory; defaults to this repository's web")
    parser.add_argument("--acceptance", type=Path)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--integrity", type=Path)
    parser.add_argument("--commit")
    args = parser.parse_args()
    if args.acceptance and json.loads(args.acceptance.read_text()).get("schema_version") == 2:
        from verify_release import acceptance
        from static_site_overlay import verify_overlay
        accepted = acceptance(args.acceptance, args.expected_sha256, args.city,
                              "LN6666/crimemaps-" + args.city.capitalize(), args.commit)
        result = verify_overlay(args.site, args.integrity, accepted, args.city, args.commit)
        if result["profile_contract"] == "accepted_pre_profile_runtime_inventory_preserved":
            print(json.dumps({"city": args.city, "profile_contract": result["profile_contract"],
                              "protected_runtime_files": result["protected_runtime_files"], "verified": True}))
            raise SystemExit(0)
    print(json.dumps(verify(args.site, args.city, args.source_web), sort_keys=True))
