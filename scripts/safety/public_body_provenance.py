"""Build public report-body successors without exposing local review paths.

The returned crosswalk is PRIVATE audit material and must never be mounted.
Input routes must include every month index and shard in the selected bundle.
Source text, source identity and body hashes are preserved exactly.
"""

import copy
import hashlib
import json
import re
from pathlib import PurePosixPath


LOCAL_PATH = re.compile(r"^(?:/|~[/\\]|[A-Za-z]:[/\\]|\\\\|file:)", re.I)


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def public_reference(value):
    return "review-ref:sha256:" + hashlib.sha256(value.encode()).hexdigest()


def compile_public_bodies(routes):
    """Return successor route bytes, removed routes, and a private crosswalk.

    Unchanged files retain their original bytes. Changed shards get a new
    content-addressed name so a cached old shard cannot satisfy a new index.
    Missing shard references fail closed before any caller writes output.
    """
    documents = {route: json.loads(raw) for route, raw in routes.items()}
    changed = set()
    crosswalk = {}

    def scrub(value, route):
        if isinstance(value, dict):
            source = value.get("candidate_source")
            if isinstance(source, str) and LOCAL_PATH.match(source.strip()):
                reference = public_reference(source)
                crosswalk[reference] = source
                value["candidate_source"] = reference
                changed.add(route)
            for child in value.values():
                if isinstance(child, (dict, list)):
                    scrub(child, route)
        elif isinstance(value, list):
            for child in value:
                scrub(child, route)

    documents = copy.deepcopy(documents)
    for route, doc in documents.items():
        if not route.startswith("report-bodies/") or ".." in PurePosixPath(route).parts:
            raise ValueError("Expected a report-bodies route")
        scrub(doc, route)

    replacements = {}
    output = dict(routes)
    for route in sorted(changed):
        if PurePosixPath(route).name.startswith("bodies-"):
            raw = encode(documents[route])
            # Match the production loader's 20-hex content-address contract.
            name = "bodies-" + hashlib.sha256(raw).hexdigest()[:20] + ".json"
            successor = str(PurePosixPath(route).with_name(name))
            if successor in output and output[successor] != raw:
                raise ValueError("Report-body successor route collision")
            replacements[route] = successor
            output.pop(route)
            output[successor] = raw

    for route, doc in documents.items():
        if PurePosixPath(route).name.startswith("bodies-"):
            continue
        for row in doc.get("records", []):
            for locale in row.get("locales", {}).values():
                shard = locale.get("body_shard")
                if not shard:
                    continue
                key = shard.lstrip("/")
                relative_to_body_root = not key.startswith("report-bodies/")
                if relative_to_body_root:
                    key = "report-bodies/" + key
                if key not in documents:
                    raise ValueError("Missing report-body shard: " + key)
                if key in replacements:
                    target = replacements[key]
                    if relative_to_body_root:
                        target = target.removeprefix("report-bodies/")
                    locale["body_shard"] = ("/" if shard.startswith("/") else "") + target
                    changed.add(route)
        if route in changed:
            output[route] = encode(doc)

    return {"routes": output, "removed": sorted(replacements),
            "replacements": replacements, "private_crosswalk": crosswalk}
