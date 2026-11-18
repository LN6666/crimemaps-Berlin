import importlib.util
import json
import hashlib
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location("public_body_provenance", Path(__file__).parents[2] / "scripts/safety/public_body_provenance.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PublicBodyProvenanceTest(unittest.TestCase):
    def bundle(self):
        text = "Original text mentioning /Users/example must remain unchanged."
        sha = hashlib.sha256(text.encode()).hexdigest()
        source = "/Users/private/review.json"
        shard = "report-bodies/berlin/2026-01/bodies-old.json"
        record = {"locale": "en", "body": text, "body_sha256": sha, "candidate_source": source}
        index = {"records": [{"locales": {"en": {"body_shard": "/" + shard, "body_sha256": sha, "candidate_source": source}}}]}
        return {"report-bodies/berlin/2026-01.json": module.encode(index), shard: module.encode({"records": [record]})}

    def test_index_and_shard_change_together_without_changing_text(self):
        original = self.bundle()
        result = module.compile_public_bodies(original)
        old = "report-bodies/berlin/2026-01/bodies-old.json"
        new = result["replacements"][old]
        self.assertNotIn(old, result["routes"])
        self.assertIn(old, original)
        shard = json.loads(result["routes"][new])["records"][0]
        index = json.loads(result["routes"]["report-bodies/berlin/2026-01.json"])["records"][0]["locales"]["en"]
        self.assertEqual(index["body_shard"], "/" + new)
        self.assertEqual(index["candidate_source"], shard["candidate_source"])
        self.assertEqual(shard["body"], json.loads(original[old])["records"][0]["body"])
        self.assertEqual(index["body_sha256"], hashlib.sha256(shard["body"].encode()).hexdigest())
        self.assertEqual(result["private_crosswalk"][shard["candidate_source"]], "/Users/private/review.json")
        self.assertEqual(module.compile_public_bodies(result["routes"])["routes"], result["routes"])

    def test_missing_shard_is_rejected(self):
        routes = self.bundle()
        routes.pop("report-bodies/berlin/2026-01/bodies-old.json")
        with self.assertRaisesRegex(ValueError, "Missing report-body shard"):
            module.compile_public_bodies(routes)

    def test_production_relative_shard_reference(self):
        routes = self.bundle()
        key = "report-bodies/berlin/2026-01.json"
        index = json.loads(routes[key])
        index["records"][0]["locales"]["en"]["body_shard"] = "berlin/2026-01/bodies-old.json"
        routes[key] = module.encode(index)
        result = module.compile_public_bodies(routes)
        reference = json.loads(result["routes"][key])["records"][0]["locales"]["en"]["body_shard"]
        self.assertTrue(reference.startswith("berlin/2026-01/bodies-"))
        self.assertRegex(reference, r"^berlin/2026-01/bodies-[a-f0-9]{20}\.json$")
        self.assertIn("report-bodies/" + reference, result["routes"])

    def test_local_path_forms_and_public_reference(self):
        for source in ["/tmp/review", "~/review", "C:\\private\\review", "\\\\host\\private", "file:///private/review"]:
            self.assertTrue(module.LOCAL_PATH.match(source))
        self.assertFalse(module.LOCAL_PATH.match("review-ref:sha256:123"))


if __name__ == "__main__":
    unittest.main()
