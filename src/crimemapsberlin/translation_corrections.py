"""Apply reviewed field patches to exact private source revisions, without publication."""

from __future__ import annotations

import hashlib
from typing import Any


def apply_correction(record: dict[str, Any], correction: dict[str, Any]) -> dict[str, Any]:
    """Return a corrected field record; reject stale source or translated text.

    Records carry candidate_key, field, locale, source_url, source_text_sha256,
    source_response_sha256 and text. Reapplying an accepted patch is idempotent.
    """
    for key in (
        "candidate_key",
        "field",
        "locale",
        "source_url",
        "source_text_sha256",
        "source_response_sha256",
    ):
        if not correction.get(key) or record.get(key) != correction[key]:
            raise ValueError(f"Translation correction identity mismatch: {key}")
    value = record["text"]
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    if digest == correction["to_sha256"]:
        return dict(record)
    if digest != correction["from_sha256"]:
        raise ValueError("Translation correction input hash mismatch")
    if "replace_once" in correction:
        replacement = correction["replace_once"]
        if value.count(replacement["from"]) != 1:
            raise ValueError("Translation correction sentence is not unique")
        value = value.replace(replacement["from"], replacement["to"], 1)
    else:
        value = correction["to"]
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    if digest != correction["to_sha256"]:
        raise ValueError("Translation correction output hash mismatch")
    return {**record, "text": value, "text_sha256": digest}
