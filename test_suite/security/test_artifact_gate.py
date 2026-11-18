import copy
import gzip
import hashlib
from unittest import mock
import importlib.util
import html
import json
from pathlib import Path
import re
import tempfile
import unittest

HERE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('gate', HERE/'scripts/security/artifact_gate.py')
gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)
spec = importlib.util.spec_from_file_location('csp', HERE/'scripts/security/csp.py')
csp = importlib.util.module_from_spec(spec); spec.loader.exec_module(csp)
COMMIT = 'a'*40

# Exact public strings from the frozen owner-profile inventory; these are data,
# including the quoted request, and do not grant permission to this test or gate.
OWNER_PROVENANCE_VALUES = (
    "scope/delegated-full500-repair-authorization-evidence.json",
    "Delegatedfull500 originalsource-backedmissingcomponentrepair; no sourcefootprintexpansion.",
    "User: 修复这种缺陷建筑，把它还原回来。",
)


def owner_provenance_fixture(value=OWNER_PROVENANCE_VALUES[0], metadata=None):
    patch = {"authorization": value}
    if metadata is not None:
        patch.update(metadata)
    return {"components": [{"sourceFeature": {"properties": {"owner_shape_patch": patch}}}]}


def owner_provenance_cases():
    return [(f"value-{i}", owner_provenance_fixture(value))
            for i, value in enumerate(OWNER_PROVENANCE_VALUES)]


PALETTE_TABLE_SHA256 = "bf6c0c7678fb129cb3fbf9946a3ca9a491370a8489022e5c492ce7e8fd60f651"
PALETTE_PROVENANCE = {
    "beigeYellowPierMapping": "Direct owner 浅米色和米黄色 +root source-photo review and requested native buttress mapping",
    "wallOwnerColorCorrection": "User explicitly requested 浅米色和米黄色, delivered by root task message",
}


def palette_provenance_fixture(row=88):
    # Synthetic shape only. Unit calls explicitly supply the reviewed digest;
    # production scan must compute it from bytes (tested separately below).
    return [{} for _ in range(row)] + [{
        "city": "frankfurt", "objectId": "osm/way/174531611",
        "partId": "osm/way/174531611/component/35632db3b084b70af282",
        "evidence": {key: {"authorization": value}
                     for key, value in PALETTE_PROVENANCE.items()},
    }]


class ArtifactTests(unittest.TestCase):
    def test_translation_provenance_rejects_local_paths_at_any_depth(self):
        for value in ['/Users/fixture/review.ndjson', '/tmp/review.json', '~/review.json',
                      r'C:\private\review.json', r'\\host\share\review.json',
                      'file:///private/review.json', ' FILE:///private/review.json']:
            with self.subTest(value=value):
                row = {'candidate_source': value}
                for _ in range(8):
                    row = {'nested': [row]}
                with self.assertRaisesRegex(ValueError, 'Local filesystem provenance'):
                    gate.check_json(row)

    def test_translation_provenance_keeps_public_identity_and_body_text(self):
        for value in ['review-provenance-sha256:' + 'a' * 64,
                      'approved-review-v1', 'https://example.invalid/review']:
            gate.check_json({'candidate_source': value})
        gate.check_json({'body': '/Users/quoted/path is part of unchanged source text'})

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)/'site'; self.root.mkdir()
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy()+'"><script type="module" src="/assets/main.js"></script>')
    def tearDown(self): self.temp.cleanup()

    def test_compiled_frontend_rejects_workstation_home_paths(self):
        cases = {
            'bundle.js': b'export const source="/Users/builduser/project/mesh.json";',
            'bundle.mjs': br'export const source="C:\\Users\\builduser\\mesh.json";',
            'theme.css': b'body{background:url(file://localhost/home/builduser/texture.png)}',
            'portal.html': self.root.joinpath('index.html').read_bytes() + b'<p>/home/builduser/project</p>',
        }
        for name, raw in cases.items():
            with self.subTest(name=name):
                target = self.root / name
                target.write_bytes(raw)
                try:
                    with self.assertRaisesRegex(ValueError, 'Workstation home path'):
                        gate.scan(self.root, 'berlin', COMMIT)
                finally:
                    target.unlink()

    def test_compiled_frontend_keeps_public_urls_and_evidence_labels(self):
        (self.root / 'bundle.mjs').write_bytes(
            b'export const references=["https://example.org/Users/public/tiles",'
            b'"https://example.org/home/places/map","source-evidence/7310a/mesh.json"];'
        )
        gate.scan(self.root, 'berlin', COMMIT)

    def test_new_public_transports_bind_schema_city_and_private_content(self):
        schemas = {
            'regional-source-packed-ordinals': 'B-source-packed-ordinals-v1',
            'hard-surface-catalog': 'environment-hard-surface-display-catalog-v1',
            'hard-surface-display-mesh': 'environment-hard-surface-display-mesh-v1',
            'hard-surface-membership-proof': 'environment-hard-surface-display-membership-proof-v1',
        }
        for kind, schema in schemas.items():
            for change in ({}, {'city':'bremen'}, {'schema':'wrong'}, {'api_key':'fixture'}):
                document = {'city':'berlin', 'schema':schema, **change}
                encoded = gzip.compress(json.dumps(document).encode(), mtime=0)
                target = self.root / f"safety/environment/berlin/{kind}-{hashlib.sha256(encoded).hexdigest()}.json.gz"
                target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(encoded)
                try:
                    if change:
                        with self.assertRaises(ValueError): gate.scan(self.root, 'berlin', COMMIT)
                    else: gate.scan(self.root, 'berlin', COMMIT)
                finally: target.unlink()
        base = {'city':'berlin', 'locale':'en', 'schema_version':1, 'month':'2026-10',
                'source_generation':'0123456789abcdef-20261106T000000', 'fields':[], 'texts':{}}
        for change in ({}, {'city':'bremen'}, {'locale':'de'}, {'schema_version':2}, {'month':'2026-99'}, {'full_body':'fixture'}):
            encoded = gzip.compress(json.dumps({**base, **change}).encode(), mtime=0)
            target = self.root / f"safety/lossless/english3-{hashlib.sha256(encoded).hexdigest()}.json.gz"
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(encoded)
            try:
                if change:
                    with self.assertRaises(ValueError): gate.scan(self.root, 'berlin', COMMIT)
                else: gate.scan(self.root, 'berlin', COMMIT)
            finally: target.unlink()

    def test_detail_gzip_paths_require_city_leaf_and_physical_digest(self):
        raw = b'{"components":[]}'
        encoded = gzip.compress(raw, mtime=0)
        sha = hashlib.sha256(encoded).hexdigest()
        for city in sorted(gate.CITIES):
            for level in ('groups', 'mid', 'coarse'):
                relative = f"safety/buildings3d/detail-variants/{city}/{'b'*64}/{level}-{sha}.json.gz"
                target = self.root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(encoded)
                try:
                    with self.subTest(city=city, level=level):
                        receipt = gate.scan(self.root, city, COMMIT)
                        self.assertEqual(receipt['files'][relative]['decoded_sha256'], hashlib.sha256(raw).hexdigest())
                        foreign = 'bremen' if city == 'berlin' else 'berlin'
                        with self.assertRaisesRegex(ValueError, 'Unsupported compressed artifact path'):
                            gate.scan(self.root, foreign, COMMIT)
                        target.write_bytes(gzip.compress(b'{}', mtime=0))
                        with self.assertRaisesRegex(ValueError, 'filename SHA differs'):
                            gate.scan(self.root, city, COMMIT)
                finally:
                    target.unlink()
        for suffix in (f"{'b'*63}/mid-{sha}.json.gz", f"{'b'*64}/near-{sha}.json.gz",
                       f"{'b'*64}/groups-{sha}.js.gz", f"../{'b'*64}/mid-{sha}.json.gz"):
            with self.subTest(suffix=suffix), self.assertRaisesRegex(ValueError, 'Unsupported compressed artifact path'):
                gate.compressed_json_path('safety/buildings3d/detail-variants/berlin/' + suffix, 'berlin')

    def test_focus_leaf_gzip_is_bound_to_city_index_and_physical_digest(self):
        raw = b'{"schema":"crimemaps-building-focus-leaf-v2","components":[]}'
        encoded = gzip.compress(raw, mtime=0)
        sha = hashlib.sha256(encoded).hexdigest()
        relative = f"safety/buildings3d/focus/frankfurt/{'c'*64}/{sha}.json.gz"
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(encoded)
        try:
            receipt = gate.scan(self.root, 'frankfurt', COMMIT)
            self.assertEqual(receipt['files'][relative]['decoded_sha256'], hashlib.sha256(raw).hexdigest())
            with self.assertRaisesRegex(ValueError, 'Unsupported compressed artifact path'):
                gate.scan(self.root, 'berlin', COMMIT)
            target.write_bytes(gzip.compress(b'{}', mtime=0))
            with self.assertRaisesRegex(ValueError, 'filename SHA differs'):
                gate.scan(self.root, 'frankfurt', COMMIT)
            target.write_bytes(gzip.compress(b'{"full_body":"private"}', mtime=0))
            renamed = target.with_name(hashlib.sha256(target.read_bytes()).hexdigest() + '.json.gz')
            target.rename(renamed); target = renamed
            with self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.scan(self.root, 'frankfurt', COMMIT)
        finally:
            target.unlink()
        for suffix in (f"{'c'*63}/{sha}.json.gz", f"{'c'*64}/x-{sha}.json.gz", f"{'c'*64}/{sha}.js.gz", f"../{'c'*64}/{sha}.json.gz", f"{'c'*64}/sub/{sha}.json.gz"):
            with self.subTest(suffix=suffix), self.assertRaisesRegex(ValueError, 'Unsupported compressed artifact path'):
                gate.compressed_json_path('safety/buildings3d/focus/frankfurt/' + suffix, 'frankfurt')

    def test_detail_gzip_keeps_private_content_and_decode_limits(self):
        for raw in (b'{"full_body":"private"}', b'{"note":"-----BEGIN PRIVATE KEY-----"}'):
            encoded = gzip.compress(raw, mtime=0)
            target = self.root / f"safety/buildings3d/detail-variants/berlin/{'b'*64}/mid-{hashlib.sha256(encoded).hexdigest()}.json.gz"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            try:
                with self.subTest(raw=raw), self.assertRaisesRegex(ValueError, 'Private JSON field|Credential signature'):
                    gate.scan(self.root, 'berlin', COMMIT)
                with self.assertRaisesRegex(ValueError, 'decoded artifact budget'):
                    gate.check_gzip_json(target, len(raw)-1)
            finally:
                target.unlink()

    def test_regional_assets_bind_city_schema_hash_and_budget(self):
        for family, schema in gate.REGIONAL_SCHEMAS.items():
            document = {"city": "berlin", "schema": schema}
            for patch, error in [({}, None), ({"city": "bremen"}, "city/schema"),
                                 ({"schema": "unknown"}, "city/schema"),
                                 ({"full_body": "private"}, "Private JSON"),
                                 ({"padding": "x" * 1024**2}, "decoded artifact budget")]:
                raw = json.dumps({**document, **patch}).encode()
                encoded = gzip.compress(raw, mtime=0)
                relative = f"safety/environment/berlin/regional-{family}-{hashlib.sha256(encoded).hexdigest()}.json.gz"
                target = self.root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(encoded)
                try:
                    with self.subTest(family=family, error=error):
                        if error:
                            with self.assertRaisesRegex(ValueError, error):
                                gate.scan(self.root, 'berlin', COMMIT)
                        else:
                            self.assertIn(relative, gate.scan(self.root, 'berlin', COMMIT)['files'])
                            with self.assertRaisesRegex(ValueError, 'Unsupported compressed'):
                                gate.scan(self.root, 'bremen', COMMIT)
                            target.write_bytes(gzip.compress(b'{}', mtime=0))
                            with self.assertRaisesRegex(ValueError, 'filename SHA'):
                                gate.scan(self.root, 'berlin', COMMIT)
                finally:
                    target.unlink()
        with self.assertRaisesRegex(ValueError, 'Unsupported compressed'):
            gate.compressed_json_path('safety/environment/berlin/regional-arbitrary-' + 'a'*64 + '.json.gz', 'berlin')

    def test_ground_overview_gzip_is_bound_to_city_and_physical_digest(self):
        raw = b'{"type":"FeatureCollection","features":[]}'
        encoded = gzip.compress(raw, mtime=0)
        sha = hashlib.sha256(encoded).hexdigest()
        for city in sorted(gate.CITIES):
            relative = f"safety/environment/{city}/ground-overview-{sha}.json.gz"
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            try:
                with self.subTest(city=city):
                    receipt = gate.scan(self.root, city, COMMIT)
                    self.assertEqual(receipt['files'][relative]['decoded_sha256'], hashlib.sha256(raw).hexdigest())
                    foreign = 'bremen' if city == 'berlin' else 'berlin'
                    with self.assertRaisesRegex(ValueError, 'Unsupported compressed artifact path'):
                        gate.scan(self.root, foreign, COMMIT)
                    target.write_bytes(gzip.compress(b'{}', mtime=0))
                    with self.assertRaisesRegex(ValueError, 'filename SHA differs'):
                        gate.scan(self.root, city, COMMIT)
            finally:
                target.unlink()

    def test_ground_overview_keeps_private_json_and_decoded_budget_checks(self):
        for raw in (b'{"full_body":"private"}', b'{"notes":"-----BEGIN PRIVATE KEY-----"}'):
            encoded = gzip.compress(raw, mtime=0)
            target = self.root / f"safety/environment/berlin/ground-overview-{hashlib.sha256(encoded).hexdigest()}.json.gz"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            try:
                with self.subTest(raw=raw), self.assertRaisesRegex(ValueError, 'Private JSON field|Credential signature'):
                    gate.scan(self.root, 'berlin', COMMIT)
                with self.assertRaisesRegex(ValueError, 'decoded artifact budget'):
                    gate.check_gzip_json(target, len(raw) - 1)
            finally:
                target.unlink()

    def test_seal_then_trusted_verify_and_tamper(self):
        receipt = gate.scan(self.root,'berlin',COMMIT)
        expected = Path(self.temp.name)/'receipt.json'; expected.write_text(json.dumps(receipt))
        sha = gate.digest(expected)
        self.assertEqual(gate.verify(self.root,expected,sha,'berlin',COMMIT),receipt)
        self.root.joinpath('extra.txt').write_text('added')
        with self.assertRaises(ValueError): gate.verify(self.root,expected,sha,'berlin',COMMIT)
    def test_detached_digest_and_wrong_city_commit(self):
        expected = Path(self.temp.name)/'receipt.json';expected.write_text(json.dumps(gate.scan(self.root,'berlin',COMMIT)))
        for sha,city,commit in [('b'*64,'berlin',COMMIT),(gate.digest(expected),'essen',COMMIT),(gate.digest(expected),'berlin','b'*40)]:
            with self.assertRaises(ValueError): gate.verify(self.root,expected,sha,city,commit)
    def test_sensitive_files_and_fields(self):
        for name,body in [('police.sqlite',b'x'),('source-review.json',b'{}'),('data.json',b'{"events":[{"article_body":"private"}]}'),('data.txt',b'-----BEGIN PRIVATE KEY-----'),('app.js.map',b'{}')]:
            path=self.root/name;path.write_bytes(body)
            with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
            path.unlink()
    def test_symlink_not_followed(self):
        self.root.joinpath('data.json').symlink_to(self.root/'index.html')
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
    def test_current_generation_only(self):
        for gen in ['a'*16+'-20261003T000000','b'*16+'-20261003T000000']:
            p=self.root/'safety'/gen/'search.json';p.parent.mkdir(parents=True);p.write_text('[]')
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
    def test_svg_rejects_executable_external_and_entities(self):
        for svg in ['<svg><script>alert(1)</script></svg>','<svg onload="x()"/>','<svg><foreignObject/></svg>','<svg><use href="https://evil/x"/></svg>','<svg><path fill="url(https://evil/x)"/></svg>','<!DOCTYPE svg [<!ENTITY x "x">]><svg/>']:
            with self.assertRaises(ValueError):gate.check_svg(svg.encode())
        gate.check_svg(b'<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><path fill="url(#g)"/><use href="#g"/></svg>')
    def test_missing_csp_and_inline_script(self):
        for page in ['<html/>','<meta http-equiv="Content-Security-Policy" content="script-src *"><script src="https://evil/x.js"></script>','<meta http-equiv="Content-Security-Policy" content="'+csp.policy()+'"><script>alert(1)</script>']:
            self.root.joinpath('index.html').write_text(page)
            with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
    def test_script_free_report_requires_explicit_strict_script_object_and_base_policy(self):
        policy = "default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; style-src 'unsafe-inline'"
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+policy+'"><p>Saved report</p>')
        gate.scan(self.root,'berlin',COMMIT)
        for unsafe in ["default-src 'none'; object-src 'none'; base-uri 'none'",
                       "script-src 'none'; object-src *; base-uri 'none'",
                       "script-src 'none'; object-src 'none'; base-uri *"]:
            self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+unsafe+'"><p>Saved report</p>')
            with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+policy+'"><p onclick="alert(1)">Saved report</p>')
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
    def test_wasm_decode_permission_does_not_allow_javascript_eval_or_remote_code(self):
        for counter in (False, True):
            policy = csp.policy(goatcounter=counter)
            scripts = dict((p.strip().split(None, 1) + [""])[:2] for p in policy.split(";") if p.strip())["script-src"].split()
            self.assertIn("'wasm-unsafe-eval'", scripts)
            self.assertNotIn("'unsafe-eval'", scripts)
            self.assertNotIn("'unsafe-inline'", scripts)
            page = '<meta http-equiv="Content-Security-Policy" content="' + policy + '">'
            parser = gate.StaticHTML()
            parser.feed(page)
            self.assertTrue(parser.csp)
            self.assertEqual(parser.goatcounter, counter)
            for extra in ("'unsafe-eval'", "'unsafe-inline'", "https://unreviewed.example", "blob:", "data:"):
                with self.assertRaises(ValueError):
                    gate.StaticHTML().feed(page.replace("'wasm-unsafe-eval'", "'wasm-unsafe-eval' " + extra))

    def test_csp_only_reviewed_maps_and_selected_goatcounter(self):
        for origin in ['https://*.workers.dev','http://worker.example','https://user@worker.example','https://worker.example/path','https://worker.example:8443','https://worker.example/']:
            with self.assertRaises(ValueError):csp.policy([origin])
        out=csp.policy(goatcounter=True)
        self.assertIn("script-src 'self' https://gc.zgo.at",out)
        self.assertIn('https://ryoushunnei.goatcounter.com/count',out)
        self.assertNotIn('cloudflare',out)
        self.assertIn("frame-src 'none'",out)
        self.assertNotIn("'unsafe-eval'",out.split())
        self.assertIn('https://vector.openstreetmap.org',csp.policy(['https://vector.openstreetmap.org']))
        with self.assertRaises(ValueError):csp.policy(['https://unreviewed.example'])
        csp.apply(self.root/'index.html',goatcounter=True)
        gate.scan(self.root,'berlin',COMMIT)
    def test_kbo_images_match_reviewed_data_without_broadening_image_permissions(self):
        places = json.loads((HERE/'data/safety/berlin_kbo.json').read_text())['places']
        images = {place['official_map_url'] for place in places}
        self.assertEqual(len(images), 7)
        self.assertEqual(images, gate.KBO_MAP_IMAGES)
        def directives(policy):
            return dict(part.strip().split(None, 1) for part in policy.split(';'))
        for maps in [(), ('https://demotiles.maplibre.org', 'https://vector.openstreetmap.org')]:
            for counter in [False, True]:
                policy = csp.policy(maps, goatcounter=counter)
                allowed = set(directives(policy)['img-src'].split())
                self.assertEqual(allowed, {"'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org',
                                           'https://gdi.berlin.de', *maps, *images})
                parser = gate.StaticHTML()
                parser.feed('<meta http-equiv="Content-Security-Policy" content="'+policy+'">')
                self.assertTrue(parser.csp)
        template = (HERE/'web/index.html').read_text()
        embedded = html.unescape(re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', template)[1])
        self.assertEqual(directives(embedded), directives(csp.policy(maps)))
        for unreviewed in ['https://www.berlin.de',
                           'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/',
                           'https://www.berlin.de/polizei/_assets/dienststellen/anlagen-landespolizeidirektion/unreviewed.jpg']:
            with self.assertRaisesRegex(ValueError, 'Unapproved image permission'):
                gate.StaticHTML().feed('<meta http-equiv="Content-Security-Policy" content="'+
                                       csp.policy().replace('img-src', 'img-src '+unreviewed)+'">')
    def test_cancelled_challenge_and_unapproved_counter_are_rejected(self):
        for src in ['https://challenges.cloudflare.com/turnstile/v0/api.js','https://gc.zgo.at/count.js','https://gc.zgo.at/count.v5.js?query=1','https://evil.example/count.js']:
            self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy(goatcounter=True)+'"><script src="'+src+'"></script>')
            with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
        script='<script src="https://gc.zgo.at/count.v5.js" integrity="sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ" crossorigin="anonymous" data-goatcounter="https://ryoushunnei.goatcounter.com/count"></script>'
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy()+'">'+script)
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy(goatcounter=True)+'">'+script.replace('https://ryoushunnei.goatcounter.com/count','https://other.goatcounter.com/count'))
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy(goatcounter=True)+'">'+script)
        gate.scan(self.root,'berlin',COMMIT)
        for policy in [csp.policy(goatcounter=True).replace('/count',''),csp.policy(goatcounter=True).replace('connect-src', 'connect-src https://unreviewed.goatcounter.com'),csp.policy(goatcounter=True).replace('img-src', 'img-src https://ryoushunnei.goatcounter.com/count')]:
            self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+policy+'">'+script)
            with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)
        self.root.joinpath('index.html').write_text('<meta http-equiv="Content-Security-Policy" content="'+csp.policy(goatcounter=True)+'">'+script.replace('sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ','sha384-invalid'))
        with self.assertRaises(ValueError):gate.scan(self.root,'berlin',COMMIT)

    def test_reviewed_owner_provenance_raw_preserves_source_attributes(self):
        for label, value in owner_provenance_cases():
            with self.subTest(case=label):
                # A real nonzero list index is valid; string dict keys are not.
                value["components"].insert(0, {"sourceFeature": {"properties": {"name": "other"}}})
                original = copy.deepcopy(value)
                gate.check_json(value)
                self.root.joinpath("data.json").write_text(json.dumps(value, ensure_ascii=False))
                self.assertIn("data.json", gate.scan(self.root, "berlin", COMMIT)["files"])
                self.assertEqual(value, original, "classification must not strip or rename attributes")

    def test_reviewed_owner_provenance_gzip_keeps_integrity_checks(self):
        for label, value in owner_provenance_cases():
            with self.subTest(case=label):
                raw = json.dumps(value, ensure_ascii=False).encode()
                encoded = gzip.compress(raw, mtime=0)
                relative = "safety/lossless/" + hashlib.sha256(encoded).hexdigest() + ".json.gz"
                target = self.root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(encoded)
                try:
                    row = gate.scan(self.root, "berlin", COMMIT)["files"][relative]
                    self.assertEqual(row["decoded_sha256"], hashlib.sha256(raw).hexdigest())
                    self.assertEqual(row["decoded_bytes"], len(raw))
                    target.write_bytes(encoded + b"tampered")
                    with self.assertRaisesRegex(ValueError, "filename SHA differs"):
                        gate.scan(self.root, "berlin", COMMIT)
                finally:
                    target.unlink()

    def test_owner_provenance_wrong_structure_is_private(self):
        for label, value in owner_provenance_cases():
            component = value["components"][0]
            patch = component["sourceFeature"]["properties"]["owner_shape_patch"]
            cases = [patch, {"payload": value}, [value],
                     {"components": {"0": component}}, {"components": {0: component}},
                     {"components": [[component]]}, {"Components": [component]},
                     {"features": [component]},
                     {"components": [{"SourceFeature": {"properties": {"owner_shape_patch": patch}}}]},
                     {"components": [{"sourceFeature": {"Properties": {"owner_shape_patch": patch}}}]},
                     {"components": [{"properties": {"owner_shape_patch": patch}}]},
                     {"components": [{"sourceFeature": {"properties": {"nested": {"owner_shape_patch": patch}}}}]},
                     {"components": [{"sourceFeature": {"properties": {"Owner_shape_patch": patch}}}]}]
            for wrong in cases:
                with self.subTest(case=label, structure=repr(wrong)[:90]), self.assertRaisesRegex(ValueError, "Private JSON field"):
                    gate.check_json(wrong)

    def test_owner_provenance_unknown_altered_case_and_typed_values_are_private(self):
        replacements = ["Bearer synthetic-fixture-token", "scope/another-authorization-evidence.json",
                        "/" + OWNER_PROVENANCE_VALUES[0], OWNER_PROVENANCE_VALUES[0].replace("scope/", "scope/../"),
                        None, True, False, 1, 0, [], {}, {"path": OWNER_PROVENANCE_VALUES[0]}]
        for text in OWNER_PROVENANCE_VALUES:
            replacements.extend([text + " ", " " + text, text.upper(), text.lower(), text + " amended"])
        replacements = [value for value in replacements if value not in OWNER_PROVENANCE_VALUES]
        for replacement in replacements:
            value = owner_provenance_fixture(replacement)
            with self.subTest(value=replacement), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(value)
            # Valid-looking modelling flags cannot turn unknown text into public provenance.
            value = owner_provenance_fixture(replacement, {
                "geometryRole": "owner-authorized-reconstruction", "allDimensionsNotSurveyed": True,
                "notNative": True, "photoApprox": True, "formalParentClaim": False,
            })
            with self.subTest(value=replacement, modelling_flags=True), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(value)

    def test_public_provenance_privacy_is_independent_of_modelling_metadata(self):
        # Source geometry admission/accuracy remains validated elsewhere. These
        # legacy/absent/mismatched flags do not change the fixed public text.
        metadata_cases = [
            {},
            {"geometryRole": "owner-authorized-reconstruction"},
            {"geometryRole": "source-native", "allDimensionsNotSurveyed": False},
            {"geometryRole": None, "allDimensionsNotSurveyed": None,
             "notNative": False, "photoApprox": False, "formalParentClaim": True},
            {"geometryRole": "Owner-authorized-reconstruction", "allDimensionsNotSurveyed": 1,
             "notNative": "true", "photoApprox": 0, "formalParentClaim": "false"},
        ]
        for text in OWNER_PROVENANCE_VALUES:
            for metadata in metadata_cases:
                value = owner_provenance_fixture(text, metadata)
                original = copy.deepcopy(value)
                with self.subTest(value=text, metadata=metadata):
                    gate.check_json(value)
                    self.assertEqual(value, original, "privacy classification does not rewrite geometry metadata")

    def test_owner_provenance_keeps_every_adjacent_descendant_and_case_private_key(self):
        for label, original in owner_provenance_cases():
            for forbidden in sorted(gate.PRIVATE):
                for location in ["same-object", "sibling", "descendant"]:
                    value = copy.deepcopy(original)
                    properties = value["components"][0]["sourceFeature"]["properties"]
                    patch = properties["owner_shape_patch"]
                    if location == "same-object":
                        # Uppercase AUTHORIZATION cannot piggyback on its allowed sibling.
                        patch[forbidden.upper()] = "synthetic-private-value"
                    else:
                        target = properties if location == "sibling" else patch
                        target["extra"] = [{forbidden: "synthetic-private-value"}]
                    with self.subTest(case=label, key=forbidden, location=location), self.assertRaisesRegex(ValueError, "Private JSON field"):
                        gate.check_json(value)
            value = copy.deepcopy(original)
            patch = value["components"][0]["sourceFeature"]["properties"]["owner_shape_patch"]
            patch["Authorization"] = patch.pop("authorization")
            with self.subTest(case=label, case_only=True), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(value)
            value = copy.deepcopy(original)
            patch = value["components"][0]["sourceFeature"]["properties"]["owner_shape_patch"]
            patch["nested"] = {"authorization": OWNER_PROVENANCE_VALUES[0],
                               "geometryRole": "owner-authorized-reconstruction", "allDimensionsNotSurveyed": True}
            with self.subTest(case=label, nested_valid_markers=True), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(value)

    def test_owner_provenance_keeps_raw_and_gzip_secret_byte_checks(self):
        for label, value in owner_provenance_cases():
            value["components"][0]["sourceFeature"]["properties"]["owner_shape_patch"]["description"] = "ghp_" + "A" * 36
            raw = json.dumps(value).encode()
            for compressed in [False, True]:
                encoded = gzip.compress(raw, mtime=0) if compressed else raw
                relative = ("safety/lossless/" + hashlib.sha256(encoded).hexdigest() + ".json.gz") if compressed else "data.json"
                target = self.root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(encoded)
                with self.subTest(case=label, compressed=compressed), self.assertRaisesRegex(ValueError, "Credential signature found"):
                    gate.scan(self.root, "berlin", COMMIT)
                target.unlink()

    def test_gzip_unknown_provenance_still_rejected_after_decode(self):
        raw = json.dumps(owner_provenance_fixture("unreviewed plain modelling prose")).encode()
        encoded = gzip.compress(raw, mtime=0)
        target = self.root / ("safety/lossless/" + hashlib.sha256(encoded).hexdigest() + ".json.gz")
        target.parent.mkdir(parents=True)
        target.write_bytes(encoded)
        with self.assertRaisesRegex(ValueError, "Private JSON field"):
            gate.scan(self.root, "berlin", COMMIT)

    def test_exact_palette_provenance_preserves_both_fixed_fields(self):
        value = palette_provenance_fixture()
        original = copy.deepcopy(value)
        gate.check_json(value, painted_table_sha256=PALETTE_TABLE_SHA256)
        self.assertEqual(value, original)
        for digest in [None, "a" * 64, PALETTE_TABLE_SHA256.upper()]:
            with self.subTest(digest=digest), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(value, painted_table_sha256=digest)

    def test_current_frozen_palette_variant_retains_exact_provenance_scope(self):
        sha = "d94bfab58ea8a0cecba91b0180cc362dc4f3e963c00b5a03dba0a56326afbe83"
        manifest = json.loads((HERE / 'web/src/safety/frozen-paint-table-manifest.json').read_text())
        rows = [entry for entry in manifest if entry['sha256'] == sha]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['bytes'], 13411281)
        self.assertEqual(rows[0]['transport']['sha256'],
                         '80a327fcee8085f0d59d67f35b477edc2adf3bf8c81161317e677ee88739a873')
        value = palette_provenance_fixture()
        original = copy.deepcopy(value)
        gate.check_json(value, painted_table_sha256=sha)
        self.assertEqual(value, original)
        for changed in ['identity', 'literal', 'adjacent-private', 'row-position']:
            wrong = copy.deepcopy(original)
            if changed == 'identity':
                wrong[88]['partId'] += '-other'
            elif changed == 'literal':
                wrong[88]['evidence']['beigeYellowPierMapping']['authorization'] += ' '
            elif changed == 'adjacent-private':
                wrong[88]['evidence']['beigeYellowPierMapping']['access_token'] = 'synthetic-private-value'
            else:
                wrong.insert(0, {})
            with self.subTest(changed=changed), self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.check_json(wrong, painted_table_sha256=sha)

    def test_frankfurt_profile_palette_digest_binds_its_own_row(self):
        for sha in [
            "c636dac655350b26d5e46e924821a6b968b00836f211039ef5e54dc072812e01",
            "e1eb4b39b1fc0f821147d4cf112734e8fc36be3332fa5f3fd9832b36587a6578",
            "ee6cf6a408e7098f6112ef1cfca3cad7115e3c7014ca0d0cbeada693a64d0f77",
            "f7e3b4b8e23ef7a3145a84180aae9ffb2bc115b3d68fefeb3c7b0e084a452a0b",
            "cfc11cd9c71facd52bce2504d1a5f077a4787311c07170c63c9ba960bb4c41db",
            "7ff08cb8b054694b1e31bf0d243ffb5cd9eebb27f0e2f03159314d05f8ba105a",
            "0d0fef767520d12c46dc01f4e647e78c02494ae485128947b59da3d1e3b246eb",
            "4568938b48880e52bd690758d8d44df2e9bff4ded295fa5c0009584be17b8b02",
        ]:
            value = palette_provenance_fixture(row=2)
            gate.check_json(value, painted_table_sha256=sha)
            # Neither master digest can authorize row 2, and the subset cannot
            # authorize the master's row 88. Unknown digests remain rejected.
            for digest in [PALETTE_TABLE_SHA256,
                           'd94bfab58ea8a0cecba91b0180cc362dc4f3e963c00b5a03dba0a56326afbe83',
                           'a' * 64]:
                with self.subTest(digest=digest), self.assertRaisesRegex(ValueError, 'Private JSON field'):
                    gate.check_json(value, painted_table_sha256=digest)
            with self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.check_json(palette_provenance_fixture(), painted_table_sha256=sha)
            wrong = copy.deepcopy(value)
            wrong[2]['partId'] += '-other'
            with self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.check_json(wrong, painted_table_sha256=sha)
            wrong = copy.deepcopy(value)
            wrong[2]['evidence']['beigeYellowPierMapping']['authorization'] += ' '
            with self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.check_json(wrong, painted_table_sha256=sha)
            wrong = copy.deepcopy(value)
            wrong[2]['evidence']['beigeYellowPierMapping']['password'] = 'synthetic-private-value'
            with self.assertRaisesRegex(ValueError, 'Private JSON field'):
                gate.check_json(wrong, painted_table_sha256=sha)

    def test_palette_provenance_wrong_identity_position_or_path_is_private(self):
        value = palette_provenance_fixture()
        cases = []
        for key in ["city", "objectId", "partId"]:
            wrong = copy.deepcopy(value)
            wrong[88][key] += "-other"
            cases.append((key, wrong))
        cases.extend([("row-87", value[1:]), ("wrapped", {"table": value}),
                      ("string-row", {str(i): row for i, row in enumerate(value)})])
        for key in PALETTE_PROVENANCE:
            wrong = copy.deepcopy(value)
            wrong[88]["evidence"][key + "Other"] = wrong[88]["evidence"].pop(key)
            cases.append((key + "-wrong-path", wrong))
            wrong = copy.deepcopy(value)
            wrong[88]["evidence"][key] = {"nested": wrong[88]["evidence"][key]}
            cases.append((key + "-nested", wrong))
            wrong = copy.deepcopy(value)
            wrong[88]["evidence"][key]["Authorization"] = wrong[88]["evidence"][key].pop("authorization")
            cases.append((key + "-case", wrong))
            wrong = copy.deepcopy(value)
            wrong.append(copy.deepcopy(wrong[88]))
            cases.append((key + "-other-record", wrong))
        for label, wrong in cases:
            with self.subTest(case=label), self.assertRaisesRegex(ValueError, "Private JSON field"):
                gate.check_json(wrong, painted_table_sha256=PALETTE_TABLE_SHA256)

    def test_palette_provenance_changed_literals_types_and_other_private_fields_reject(self):
        for key, literal in PALETTE_PROVENANCE.items():
            for replacement in [literal + " ", " " + literal, literal.lower(), literal.upper(),
                                "Bearer synthetic-fixture-token", None, True, 1, [], {},
                                {"path": literal}, PALETTE_PROVENANCE[next(k for k in PALETTE_PROVENANCE if k != key)]]:
                wrong = palette_provenance_fixture()
                wrong[88]["evidence"][key]["authorization"] = replacement
                with self.subTest(key=key, replacement=replacement), self.assertRaisesRegex(ValueError, "Private JSON field"):
                    gate.check_json(wrong, painted_table_sha256=PALETTE_TABLE_SHA256)
            for private in sorted(gate.PRIVATE):
                for location in ["same-object", "sibling", "descendant"]:
                    wrong = palette_provenance_fixture()
                    evidence = wrong[88]["evidence"]
                    if location == "same-object":
                        evidence[key][private.upper()] = "synthetic-private-value"
                    elif location == "sibling":
                        evidence["other"] = {private: "synthetic-private-value"}
                    else:
                        evidence[key]["other"] = [{private: "synthetic-private-value"}]
                    with self.subTest(key=key, private=private, location=location), self.assertRaisesRegex(ValueError, "Private JSON field"):
                        gate.check_json(wrong, painted_table_sha256=PALETTE_TABLE_SHA256)

    def test_palette_namespace_and_actual_raw_digest_cannot_be_claimed_by_json(self):
        sha = PALETTE_TABLE_SHA256
        relative = f"safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json"
        self.assertTrue(gate.painted_table_path(relative, sha))
        self.assertTrue(gate.painted_table_path(relative + ".gz"))
        for path, digest in [(relative, "a" * 64), (relative, None),
                             (relative.replace("/bf/", "/ab/"), sha),
                             ("other/" + relative, sha),
                             (relative.replace("painted-tables", "painted-assets"), sha),
                             (relative.replace(".json", ".geojson"), sha)]:
            with self.subTest(path=path, digest=digest):
                self.assertFalse(gate.painted_table_path(path, digest))
        value = palette_provenance_fixture()
        value[88]["claimedRawSHA256"] = sha
        raw = json.dumps(value, ensure_ascii=False).encode()
        actual_sha = hashlib.sha256(raw).hexdigest()
        self.assertNotEqual(actual_sha, sha)
        for compressed in [False, True]:
            encoded = gzip.compress(raw, mtime=0) if compressed else raw
            physical_sha = hashlib.sha256(encoded).hexdigest()
            path = (f"safety/buildings3d/painted-tables/{physical_sha[:2]}/{physical_sha}.json.gz"
                    if compressed else relative)
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            try:
                with self.subTest(compressed=compressed), mock.patch.object(gate, "check_json", wraps=gate.check_json) as checked:
                    with self.assertRaisesRegex(ValueError, "Private JSON field"):
                        gate.scan(self.root, "berlin", COMMIT)
                    supplied = checked.call_args.kwargs["painted_table_sha256"]
                    self.assertEqual(supplied, actual_sha if compressed else None)
            finally:
                target.unlink()

    def test_palette_keeps_secret_bytes_in_raw_and_gzip_rejected(self):
        value = palette_provenance_fixture()
        value[88]["description"] = "ghp_" + "A" * 36
        raw = json.dumps(value, ensure_ascii=False).encode()
        for compressed in [False, True]:
            encoded = gzip.compress(raw, mtime=0) if compressed else raw
            sha = hashlib.sha256(encoded).hexdigest()
            relative = f"safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json" + (".gz" if compressed else "")
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded)
            try:
                with self.subTest(compressed=compressed), self.assertRaisesRegex(ValueError, "Credential signature found"):
                    gate.scan(self.root, "berlin", COMMIT)
            finally:
                target.unlink()

    def test_palette_transport_keeps_expansion_and_physical_sha_checks(self):
        raw = json.dumps(palette_provenance_fixture(), ensure_ascii=False).encode()
        encoded = gzip.compress(raw, mtime=0)
        sha = hashlib.sha256(encoded).hexdigest()
        target = self.root / f"safety/buildings3d/painted-tables/{sha[:2]}/{sha}.json.gz"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(encoded)
        with self.assertRaisesRegex(ValueError, "decoded artifact budget"):
            gate.check_gzip_json(target, len(raw) - 1, painted_table=True)
        target.write_bytes(encoded + b"tampered")
        with self.assertRaisesRegex(ValueError, "filename SHA differs"):
            gate.scan(self.root, "berlin", COMMIT)


if __name__=='__main__': unittest.main()
