import hashlib

import pytest

from crimemapsberlin.translation_corrections import apply_correction


def fixture():
    record = {
        "candidate_key": "city:1",
        "field": "body",
        "locale": "en",
        "source_url": "https://example.test/1",
        "source_text_sha256": "source",
        "source_response_sha256": "response",
        "text": "Before. Unchanged.",
    }
    patch = {k: v for k, v in record.items() if k != "text"}
    patch.update(
        from_sha256=hashlib.sha256(record["text"].encode()).hexdigest(),
        to_sha256=hashlib.sha256(b"After. Unchanged.").hexdigest(),
        replace_once={"from": "Before.", "to": "After."},
    )
    return record, patch


def test_sentence_patch_preserves_other_text_and_is_idempotent():
    record, patch = fixture()
    result = apply_correction(record, patch)
    assert result["text"] == "After. Unchanged."
    assert apply_correction(result, patch) == result
    assert record["text"] == "Before. Unchanged."


@pytest.mark.parametrize(
    "field", ["source_url", "source_text_sha256", "source_response_sha256", "candidate_key", "locale"]
)
def test_rejects_wrong_source_or_identity(field):
    record, patch = fixture()
    record[field] = "other"
    with pytest.raises(ValueError):
        apply_correction(record, patch)


def test_rejects_stale_text_and_tampered_output():
    record, patch = fixture()
    with pytest.raises(ValueError):
        apply_correction({**record, "text": "stale"}, patch)
    patch["to_sha256"] = "invalid"
    with pytest.raises(ValueError):
        apply_correction(record, patch)
