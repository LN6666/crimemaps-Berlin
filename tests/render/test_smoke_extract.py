"""Execute the real read-only extractor with tiny native-shaped proof fixtures."""

import copy
import hashlib
import json
import subprocess
from pathlib import Path

import pytest

EXTRACTOR = Path(__file__).resolve().parents[2] / "scripts/render/smoke-extract.js"
PROVIDERS = ["root500", "delegated500", "tier300", "church", "city", "infill", "bremen"]
SYNCHRONOUS_PHASES = ["source-build", "source-description", "vertex-submit", "fragment-submit",
                      "link-submit", "completion-query", "link-status", "vertex-status",
                      "fragment-status", "upload", "cleanup"]
IDENTITY = "b" * 64
NODE = r"""
const fs=require('node:fs'),vm=require('node:vm');
const x=JSON.parse(fs.readFileSync(0,'utf8')),fetches=[],proofReads=[];
const context={
 location:{hostname:x.hostname,pathname:x.pathname,href:x.url},
 fetch:async(path,options)=>{fetches.push({path,options});return{
  ok:true,headers:{get:()=>x.header},json:async()=>({candidate_id:x.identity})};},
 document:{getElementById:id=>{proofReads.push(id);return id==='scene-render-proof'?{textContent:x.proof}:
  id==='map-detail-proof'&&x.detail!==null?{textContent:x.detail}:null;},hidden:false,
  createElement(){throw Error('extractor must not create DOM/GL state');}},
 performance:{now:()=>x.now,timeOrigin:x.timeOrigin},navigator:{userAgent:'synthetic',platform:'synthetic'},
 innerWidth:800,innerHeight:600,devicePixelRatio:1,
};
const expression='(async()=>{const binding='+JSON.stringify(x.binding)+';\n'+x.source+'\n})()';
vm.runInNewContext(expression,context,{timeout:2000})
 .then(value=>console.log(JSON.stringify({ok:true,value,fetches,proofReads})))
 .catch(error=>console.log(JSON.stringify({ok:false,error:String(error),fetches})));
"""


def scene():
    counts = {"triangles": 39643, "draws": 572, "complete": True}
    return {
        "schemaVersion": 1, "monotonicMs": 100, "sequence": 7,
        "mode": "3d", "wantedMode": "3d", "gpuUnavailable": False,
        "recovery": "idle", "recoveryRevision": 0,
        "scene": {"solarShadow": {
            "mode": "3d", "hidden": False, "suspended": False,
            "destroyed": False, "faulted": False,
            "core": {"status": "ready", "published": True,
                     "preparation": {"status": "ready", "pending": 0, "failed": 0},
                     "coverage": counts, "captureResult": copy.deepcopy(counts),
                     "captures": 1, "failures": 0},
        }},
    }


def run(scene_proof, detail_proof=None, **overrides):
    source = EXTRACTOR.read_text()
    binding = {"candidate_id": IDENTITY, "prefix": "/crimemaps-Bremen/",
               "extractor_sha256": hashlib.sha256(EXTRACTOR.read_bytes()).hexdigest()}
    payload = {"source": source, "binding": binding,
               "proof": json.dumps(scene_proof),
               "detail": json.dumps(detail_proof) if detail_proof is not None else None,
               "hostname": "127.0.0.1", "pathname": "/crimemaps-Bremen/map/",
               "url": "http://127.0.0.1:4297/crimemaps-Bremen/map/?view=3d",
               "header": IDENTITY, "identity": IDENTITY, "now": 150, "timeOrigin": 123000,
               **overrides}
    result = subprocess.run(["node", "-e", NODE], input=json.dumps(payload),
                            text=True, capture_output=True, timeout=10, check=False)
    assert result.returncode == 0, result.stderr[:1000]
    return json.loads(result.stdout)


def diagnostic(**overrides):
    return {"source": "painted/delegated500", "resource": "family:329",
            "epoch": 3, "status": "failed", "phase": "link-status",
            "reason": "fixture link failure",
            "vertex": {"characters": 100, "hash": "12345678"},
            "fragment": {"characters": 200, "hash": "abcdef01"}, **overrides}


def test_actual_native_paths_and_original_capture_binding():
    proof = scene()
    resolved = {"scope": "cumulative-logical-json-input-not-retained-heap",
                "performanceTimeOriginMs": 123000, "resolvedJSONBytes": 759850329,
                "firstResolveMs": 12.5, "lastResolveMs": 82.25, "maxDecodeParseMs": 17.5,
                "byProvider": {"bremen": {"initializers": 3, "logicalJSONBytes": 444}},
                "largest": [{"file": "painted/bremen/safety/tiny.ts", "sha256": "a" * 64,
                             "bytes": 444, "occurrence": 0, "sessionEpoch": 2,
                             "decodeParseStartMs": 12, "resolvedAtMs": 12.5,
                             "decodeParseElapsedMs": 0.5}], "limit": 8}
    proof["frozenTableInputs"] = {"retainedBytes": 0, "parses": 3,
                                  "sessionActive": True, "resolvedInputs": resolved}
    program = {"schemaVersion": 1, "revision": 5, "pending": 2, "failed": 1,
               "ready": 0, "failures": [diagnostic()], "last": diagnostic(),
               "context": {"epoch": 3, "pending": 2, "inFlight": 1, "maxInFlight": 1}}
    detail = {"threeDimensional": {"paintProviders": {
        "delegated500": {"renderer": {"programPreparation": program}}}}}
    result = run(proof, detail)
    assert result["ok"]
    value = result["value"]
    assert value["candidate_id"] == value["server_candidate_id"] == IDENTITY
    assert value["extractor_sha256"] == hashlib.sha256(EXTRACTOR.read_bytes()).hexdigest()
    assert value["proof_age_ms"] == 50
    assert value["solar"]["core"] == proof["scene"]["solarShadow"]["core"]
    actual = value["frozen_table_inputs"]["resolvedInputs"]
    assert actual["resolvedJSONBytes"] == 759850329
    assert actual["byProvider"] == resolved["byProvider"]
    assert actual["largest"] == resolved["largest"]
    assert actual["performanceTimeOriginMs"] == 123000
    assert actual["measurement"] == "cumulative-logical-json-input-not-retained-heap"
    prep = value["program_preparation"]
    assert prep["available"] is True and prep["snapshot"] == "independent-idle"
    assert "not-reported" in prep["freshness"]
    assert prep["providers"]["delegated500"]["pending"] == 2
    assert prep["providers"]["delegated500"]["failures"] == [diagnostic()]
    assert prep["providers"]["delegated500"]["last"]["phase"] == "link-status"
    assert len(result["fetches"]) == 1
    assert result["fetches"][0]["path"] == "/crimemaps-Bremen/__render__/identity.json"
    assert result["fetches"][0]["options"] == {"cache": "no-store", "redirect": "error"}


def test_absent_and_invalid_fields_do_not_become_zero_or_ready():
    proof = {"schemaVersion": 1, "monotonicMs": 100, "scene": {}}
    value = run(proof)["value"]
    assert "solar" not in value and "frozen_table_inputs" not in value
    assert value["program_preparation"]["available"] is False
    assert "providers" not in value["program_preparation"]
    proof["frozenTableInputs"] = {"resolvedInputs": {"resolvedJSONBytes": "unknown"}}
    detail = {"threeDimensional": {"paintProviders": {"city": {"renderer": {
        "programPreparation": {"schemaVersion": 1, "pending": False, "failed": {},
                               "ready": None}}}}}}
    value = run(proof, detail)["value"]
    assert "resolvedJSONBytes" not in value["frozen_table_inputs"]["resolvedInputs"]
    assert "byProvider" not in value["frozen_table_inputs"]["resolvedInputs"]
    assert "largest" not in value["frozen_table_inputs"]["resolvedInputs"]
    prep = value["program_preparation"]["providers"]["city"]
    assert not {"pending", "failed", "ready", "last", "failures"} & prep.keys()


def test_live_program_snapshot_is_authoritative_and_matches_render_timing():
    proof = scene()
    proof["programPreparation"] = [{"provider": "city", "schemaVersion": 1,
                                    "pending": 2, "failed": 1, "ready": 0,
                                    "failures": [diagnostic(resource="live-family")]}]
    stale = {"pending": 0, "failed": 0, "ready": 999}
    detail = {"threeDimensional": {"paintProviders": {
        p: {"renderer": {"programPreparation": stale}} for p in PROVIDERS}}}
    value = run(proof, detail)["value"]
    prep = value["program_preparation"]
    assert prep["snapshot"] == "native-render" and prep["freshness"] == "same-render-proof"
    assert prep["source"] == "scene-render-proof.programPreparation"
    assert prep["proof_sequence"] == proof["sequence"]
    assert prep["proof_monotonic_ms"] == proof["monotonicMs"]
    assert set(prep["providers"]) == {"city"}
    assert prep["providers"]["city"]["pending"] == 2
    assert prep["providers"]["city"]["failures"][0]["resource"] == "live-family"


@pytest.mark.parametrize("live", [[], None, {}], ids=["empty", "null", "object"])
def test_empty_or_invalid_live_data_is_not_replaced_by_idle(live):
    proof = scene()
    proof["programPreparation"] = live
    detail = {"threeDimensional": {"paintProviders": {"city": {"renderer": {
        "programPreparation": {"pending": 0, "failed": 0, "ready": 1}}}}}}
    prep = run(proof, detail)["value"]["program_preparation"]
    assert prep["source"] == "scene-render-proof.programPreparation"
    assert prep["available"] is False and "providers" not in prep


@pytest.mark.parametrize("snapshot", ["live", "idle"])
def test_long_diagnostics_are_bounded_and_non_scalar_payloads_are_omitted(snapshot):
    long = "x" * 1500
    proof = scene()
    proof["frozenTableInputs"] = {"resolvedInputs": {
        "scope": long, "resolvedJSONBytes": 123,
        "byProvider": {p: {"initializers": 1, "logicalJSONBytes": 123,
                           "geometry": "GEOMETRY_NEVER"} for p in PROVIDERS + ["unknown"]},
        "largest": [{"file": long, "sha256": long, "bytes": 123,
                     "resolvedAtMs": 55, "source": "SOURCE_NEVER"}] * 40}}
    failure = diagnostic(source=long, resource=long, phase=long, reason=long,
                         vertex={"characters": 100, "hash": long, "body": "SHADER_NEVER"})
    stats = {"pending": 10, "failed": 12, "failures": [failure] * 12,
             "last": failure, "geometry": "GEOMETRY_NEVER"}
    detail = {"threeDimensional": {"paintProviders": {
        p: {"renderer": {"programPreparation": stats}} for p in PROVIDERS + ["unknown"]}}}
    if snapshot == "live":
        proof["programPreparation"] = [{"provider": p, **stats} for p in PROVIDERS + ["unknown"]]
    proof["scene"]["solarShadow"]["core"]["preparation"]["source"] = "SOURCE_NEVER"
    result = run(proof, detail)
    assert result["ok"]
    value = result["value"]
    frozen = value["frozen_table_inputs"]["resolvedInputs"]
    assert set(frozen["byProvider"]) == set(PROVIDERS)
    assert len(frozen["largest"]) == 8 and frozen["largestTruncated"] is True
    assert len(frozen["scope"]) == 96
    assert all(len(row["file"]) == 256 and len(row["sha256"]) == 64
               for row in frozen["largest"])
    programs = value["program_preparation"]["providers"]
    assert set(programs) == set(PROVIDERS)
    assert sum(len(v["failures"]) for v in programs.values()) <= 8
    for program in programs.values():
        assert len(program["failures"]) <= 4 and program["failuresTruncated"] is True
        for row in [program["last"], *program["failures"]]:
            assert len(row["source"]) == 128 and len(row["resource"]) == 256
            assert len(row["phase"]) == 64 and len(row["reason"]) == 512
            assert len(row["vertex"]["hash"]) == 64
    encoded = json.dumps(value)
    assert len(encoded) < 32768
    assert not any(secret in encoded for secret in ["SHADER_NEVER", "SOURCE_NEVER", "GEOMETRY_NEVER"])


@pytest.mark.parametrize(("kind", "reason"), [
    ("missing", "missing-idle-proof"), ("malformed", "invalid-idle-proof"),
    ("oversized", "oversized-idle-proof"),
])
def test_optional_idle_diagnostics_cannot_override_scene_capture(kind, reason):
    detail = {"missing": None, "malformed": "{broken", "oversized": "x" * 1000001}[kind]
    result = run(scene(), detail=detail)
    assert result["ok"]
    value = result["value"]
    assert value["program_preparation"]["available"] is False
    assert value["program_preparation"]["unavailable_reason"] == reason
    assert value["manager_draw_readiness"]["available"] is False
    assert value["manager_draw_readiness"]["unavailable_reason"] == reason
    assert value["solar"]["core"]["captureResult"]["complete"] is True


@pytest.mark.parametrize(("defect", "message"), [
    ("hostname", "Not the declared local candidate"),
    ("pathname", "Not the declared local candidate"),
    ("header", "Candidate server binding failed"),
    ("identity", "Wrong candidate identity"),
    ("schema", "Unsupported scene proof schema"),
    ("oversized", "Missing or oversized scene proof"),
])
def test_identity_and_required_proof_rejections_remain(defect, message):
    overrides = {"hostname": {"hostname": "elsewhere.invalid"},
                 "pathname": {"pathname": "/wrong/"}, "header": {"header": "a" * 64},
                 "identity": {"identity": "a" * 64}, "schema": {"proof": '{"schemaVersion":2}'},
                 "oversized": {"proof": "x" * 1000001}}[defect]
    result = run(scene(), **overrides)
    assert result["ok"] is False and message in result["error"]


@pytest.mark.parametrize("snapshot", ["live", "idle"])
@pytest.mark.parametrize("defect", ["pending", "coverage", "execution", "publication"])
def test_diagnostics_never_promote_incomplete_solar_to_ready(defect, snapshot):
    proof = scene()
    core = proof["scene"]["solarShadow"]["core"]
    if defect == "pending":
        core["preparation"] = {"status": "pending", "pending": 1, "failed": 0}
    elif defect == "coverage":
        core["coverage"]["complete"] = False
    elif defect == "execution":
        core["captureResult"] = {"triangles": 39089, "draws": 503, "complete": False,
                                 "reason": "source[1]:mask-unavailable:0+69"}
    else:
        core["published"] = False
    # A ready-looking idle diagnostic cannot promote the current failed render.
    detail = {"threeDimensional": {"paintProviders": {"city": {"renderer": {
        "programPreparation": {"schemaVersion": 1, "pending": 0, "failed": 0,
                               "ready": 1, "last": diagnostic(status="ready", phase="linked")}
    }}}}}
    if snapshot == "live":
        proof["programPreparation"] = [{"provider": "city", **detail["threeDimensional"]["paintProviders"]
                                        ["city"]["renderer"]["programPreparation"]}]
    value = run(proof, detail)["value"]
    assert value["program_preparation"]["available"] is True
    assert value["solar"]["core"] == core


def cached_readiness():
    return {"ticket": 3, "inspections": 17, "phase": "timeout",
            "snapshot": {"pageVisible": False, "mapMoving": None,
                         "rendererPresent": True, "pickReady": None,
                         "pickReadyEvaluated": False},
            "renderer": {"enabled": True, "hasMatrix": False, "partitionPending": True,
                         "geometryUploadPending": False, "generation": 2, "viewRevision": 4,
                         "partition": {"enabled": True, "pending": True, "cached": 1,
                                       "required": 2, "missing": 1, "renderCount": 6,
                                       "lastRenderAt": "2026-10-29T11:20:40.000Z",
                                       "lastCompile": {"key": "colour:46352", "state": "started",
                                                       "startedAt": "2026-10-29T11:20:39.000Z"}}}}


def test_native_manager_readiness_survives_oversized_idle_without_reading_it():
    proof = scene()
    cache = cached_readiness()
    proof.update(programPreparation=[], managerDrawReadiness=[{"provider": "bremen", "record": cache}])
    result = run(proof, detail="x" * 1000001)
    cached = result["value"]["manager_draw_readiness"]
    assert cached["available"] is True
    assert cached["source"] == "scene-render-proof.managerDrawReadiness"
    assert cached["snapshot"] == "manager-cached-via-native-render"
    actual = cached["providers"]["bremen"]
    assert {key: actual[key] for key in cache} == cache
    assert actual["cache_recorded_at"] is None and actual["cache_age_ms"] is None
    assert "idle_publication" not in cached
    assert result["proofReads"] == ["scene-render-proof"]
    assert result["value"]["solar"]["core"] == proof["scene"]["solarShadow"]["core"]


@pytest.mark.parametrize("native", [[], None, {}, "invalid", [None],
                                    [{"provider": "bremen", "record": {"phase": "invented"}}]])
def test_present_empty_or_invalid_native_manager_cache_never_uses_old_idle(native):
    proof = scene()
    proof.update(programPreparation=[], managerDrawReadiness=native)
    detail = {"threeDimensional": {"paintProviders": {"bremen": {"drawReadiness": cached_readiness()}}}}
    result = run(proof, detail)
    cached = result["value"]["manager_draw_readiness"]
    assert cached["source"] == "scene-render-proof.managerDrawReadiness"
    assert cached["available"] is False and "providers" not in cached
    assert cached["unavailable_reason"] == ("no-live-manager-draw-readiness-records"
                                            if isinstance(native, list)
                                            else "invalid-live-manager-draw-readiness")
    assert "idle_publication" not in cached
    assert result["proofReads"] == ["scene-render-proof"]


def test_native_cache_recording_and_render_publication_clocks_stay_separate():
    proof = scene()
    cache = cached_readiness()
    cache.update(recordedAtMs=40, performanceTimeOriginMs=123000)
    cache["renderer"]["programPreparation"] = {"observedAtMs": 12, "performanceTimeOriginMs": 999}
    proof.update(programPreparation=[], managerDrawReadiness=[{"provider": "bremen", "record": cache}])
    first = run(proof)["value"]["manager_draw_readiness"]
    actual = first["providers"]["bremen"]
    assert actual["recordedAtMs"] == 40 and actual["performanceTimeOriginMs"] == 123000
    assert actual["cache_recorded_at"] == "1970-01-01T00:02:03.040Z"
    assert actual["cache_age_ms"] == 110
    assert actual["renderer"]["programPreparation"]["observedAtMs"] == 12
    assert actual["renderer"]["programPreparation"]["performanceTimeOriginMs"] == 999
    assert first["render_publication"] == {"sequence": 7, "monotonicMs": 100}
    assert first["observation"] == {"performanceTimeOriginMs": 123000, "monotonicMs": 150}
    # Republishing the same manager cache must not replace its recording time.
    proof.update(sequence=8, monotonicMs=130)
    second = run(proof, now=180)["value"]["manager_draw_readiness"]
    assert second["providers"]["bremen"]["cache_age_ms"] == 140
    assert second["providers"]["bremen"]["cache_recorded_at"] == actual["cache_recorded_at"]
    assert second["render_publication"] == {"sequence": 8, "monotonicMs": 130}


@pytest.mark.parametrize("clock", [{}, {"recordedAtMs": None, "performanceTimeOriginMs": 123000},
                                     {"recordedAtMs": True, "performanceTimeOriginMs": 123000},
                                     {"recordedAtMs": 40},
                                     {"recordedAtMs": 40, "performanceTimeOriginMs": "123000"},
                                     {"recordedAtMs": 40, "performanceTimeOriginMs": 999},
                                     {"recordedAtMs": -1, "performanceTimeOriginMs": 123000},
                                     {"recordedAtMs": 120, "performanceTimeOriginMs": 123000},
                                     {"recordedAtMs": 160, "performanceTimeOriginMs": 123000}])
def test_invalid_or_unmatched_native_cache_clock_stays_unknown(clock):
    proof = scene()
    cache = {**cached_readiness(), **clock}
    proof.update(programPreparation=[], managerDrawReadiness=[{"provider": "bremen", "record": cache}])
    actual = run(proof)["value"]["manager_draw_readiness"]["providers"]["bremen"]
    assert actual["cache_age_ms"] is None and actual["cache_recorded_at"] is None
    assert actual["ticket"] == cache["ticket"] and actual["phase"] == "timeout"
    if isinstance(clock.get("recordedAtMs"), bool):
        assert "recordedAtMs" not in actual


def test_native_zero_recording_time_is_valid_but_missing_document_origin_is_unknown():
    proof = scene()
    cache = {**cached_readiness(), "recordedAtMs": 0, "performanceTimeOriginMs": 123000}
    proof.update(programPreparation=[], managerDrawReadiness=[{"provider": "bremen", "record": cache}])
    actual = run(proof)["value"]["manager_draw_readiness"]["providers"]["bremen"]
    assert actual["recordedAtMs"] == 0 and actual["cache_age_ms"] == 150
    assert actual["cache_recorded_at"] == "1970-01-01T00:02:03.000Z"
    unknown = run(proof, timeOrigin=None)["value"]["manager_draw_readiness"]["providers"]["bremen"]
    assert unknown["recordedAtMs"] == 0 and unknown["cache_age_ms"] is None
    assert unknown["cache_recorded_at"] is None


def test_native_manager_provider_and_renderer_projection_keep_existing_limits():
    proof = scene()
    cache = cached_readiness()
    stats = {"pending": 20, "failures": [diagnostic(reason="x" * 2000)] * 12,
             "pendingResources": [diagnostic(status="pending")] * 20}
    cache["renderer"].update(programPreparation=stats, matrix="MATRIX_NEVER", fullStats="STATS_NEVER")
    rows = [{"provider": p, "record": cache} for p in PROVIDERS]
    proof.update(programPreparation=[], managerDrawReadiness=rows + [
        {"provider": "unknown", "record": cache}, {"provider": "bremen", "record": {"phase": "ready"}}])
    cached = run(proof)["value"]["manager_draw_readiness"]
    assert set(cached["providers"]) == set(PROVIDERS) and cached["providersTruncated"] is True
    assert all(row["phase"] == "timeout" for row in cached["providers"].values())
    programs = [row["renderer"]["programPreparation"] for row in cached["providers"].values()]
    assert all(len(stats["pendingResources"]) == 8 and stats["pendingResourcesTruncated"] for stats in programs)
    assert sum(len(stats["failures"]) for stats in programs) == 8
    assert all(len(failure["reason"]) == 512 for stats in programs for failure in stats["failures"])
    assert not any(token in json.dumps(cached) for token in ["MATRIX_NEVER", "STATS_NEVER"])


def test_cached_timeout_remains_separate_from_post_cleanup_live_proof():
    proof = scene()
    proof.update(mode="2d", wantedMode="2d", programPreparation=[])
    proof["scene"]["solarShadow"] = {"mode": "2d"}
    cache = cached_readiness()
    idle = {"sequence": 4, "idleSequence": 2, "monotonicMs": 25,
            "utc": "2026-10-29T11:20:45.000Z", "documentHidden": False}
    detail = {"idleCapture": idle, "threeDimensional": {"paintProviders": {
        "bremen": {"mode": "2d", "drawReadiness": cache, "renderer": {
            "programPreparation": {"pending": 0, "failed": 0, "ready": 0}}}}}}
    value = run(proof, detail)["value"]
    cached = value["manager_draw_readiness"]
    assert cached["available"] is True
    assert cached["source"] == "map-detail-proof.threeDimensional.paintProviders.*.drawReadiness"
    assert cached["snapshot"] == "manager-cached-via-independent-idle"
    assert cached["freshness"] == "cache-recording-time-not-reported; may be stale"
    assert cached["cache_recorded_at"] is None and cached["cache_age_ms"] is None
    assert cached["idle_publication"] == idle
    assert cached["providers"] == {"bremen": cache}
    assert "proof_sequence" not in cached and "proof_monotonic_ms" not in cached
    assert value["proof_age_ms"] == 50 and value["mode"] == "2d"
    assert value["solar"] == {"mode": "2d"}
    assert value["program_preparation"]["available"] is False
    assert value["program_preparation"]["source"] == "scene-render-proof.programPreparation"


@pytest.mark.parametrize("kind", ["missing", "malformed", "oversized"])
def test_cached_optional_proof_failure_does_not_replace_live_programs(kind):
    proof = scene()
    proof["programPreparation"] = [{"provider": "city", "pending": 2, "failed": 0, "ready": 0}]
    detail = {"missing": None, "malformed": "{broken", "oversized": "x" * 1000001}[kind]
    value = run(proof, detail=detail)["value"]
    assert value["program_preparation"]["providers"]["city"]["pending"] == 2
    assert value["program_preparation"]["snapshot"] == "native-render"
    assert value["solar"]["core"] == proof["scene"]["solarShadow"]["core"]
    cached = value["manager_draw_readiness"]
    assert cached["available"] is False and "providers" not in cached
    assert cached["unavailable_reason"] == {
        "missing": "missing-idle-proof", "malformed": "invalid-idle-proof",
        "oversized": "oversized-idle-proof"}[kind]


@pytest.mark.parametrize("defect", ["null", "array", "empty", "invalid-phase"])
def test_invalid_cached_readiness_is_not_invented_or_given_live_age(defect):
    cache = {"null": None, "array": ["timeout"], "empty": {},
             "invalid-phase": {"phase": "not-native"}}[defect]
    detail = {"threeDimensional": {"paintProviders": {"bremen": {"drawReadiness": cache}}}}
    cached = run(scene(), detail)["value"]["manager_draw_readiness"]
    assert cached["available"] is False and "providers" not in cached
    assert cached["cache_age_ms"] is None
    assert "idle_publication" not in cached


def test_cached_readiness_is_bounded_and_omits_matrices_keys_and_full_stats():
    long = "x" * 2000
    cache = cached_readiness()
    cache["snapshot"].update(pageVisible="false", pickReady=1, matrix="MATRIX_NEVER")
    renderer = cache["renderer"]
    renderer.update(geometryUploadFailure=long, mainGeometryProgramFailure=long,
                    contextRecoveryFailure=long, hasGL="true", vertices=True,
                    matrix="MATRIX_NEVER", fullStats="STATS_NEVER")
    renderer["partition"].update(cachedKeys=["KEYS_NEVER"] * 100,
                                 requiredKeys=["KEYS_NEVER"], missingKeys=["KEYS_NEVER"],
                                 lastRenderAt=long, lastCompile={"key": long, "startedAt": long,
                                                               "state": long, "elapsedMs": 1.5,
                                                               "error": long, "source": "SOURCE_NEVER"})
    renderer["projection"] = {
        "lastMatrixInvalidation": {"reason": long, "generation": 2, "viewRevision": 4,
                                   "at": long, "matrix": "MATRIX_NEVER"},
        "lastRenderedProjection": {"generation": 2, "viewRevision": 3, "at": long,
                                   "partitionPending": True, "anchor": "ANCHOR_NEVER"}}
    detail = {"threeDimensional": {"paintProviders": {
        p: {"drawReadiness": cache, "stats": "STATS_NEVER"} for p in PROVIDERS + ["unknown"]}}}
    value = run(scene(), detail)["value"]
    cached = value["manager_draw_readiness"]
    assert set(cached["providers"]) == set(PROVIDERS)
    assert cached["cache_age_ms"] is None and "idle_publication" not in cached
    for row in cached["providers"].values():
        assert "pageVisible" not in row["snapshot"] and "pickReady" not in row["snapshot"]
        actual = row["renderer"]
        assert "hasGL" not in actual and "vertices" not in actual
        for key in ["geometryUploadFailure", "mainGeometryProgramFailure", "contextRecoveryFailure"]:
            assert len(actual[key]) == 512
        assert len(actual["partition"]["lastRenderAt"]) == 40
        compile_call = actual["partition"]["lastCompile"]
        assert len(compile_call["key"]) == 256 and len(compile_call["startedAt"]) == 40
        assert len(compile_call["state"]) == 32 and len(compile_call["error"]) == 512
        assert compile_call["elapsedMs"] == 1.5
        assert len(actual["projection"]["lastMatrixInvalidation"]["reason"]) == 128
        assert len(actual["projection"]["lastRenderedProjection"]["at"]) == 40
    encoded = json.dumps(value)
    assert len(encoded) < 32768
    assert not any(secret in encoded for secret in ["MATRIX_NEVER", "KEYS_NEVER", "STATS_NEVER",
                                                   "SOURCE_NEVER", "ANCHOR_NEVER"])


def native_timing():
    return {"queuedAtMs": 10, "startedAtMs": 15, "queueWaitMs": 5, "wallMs": 90,
            "synchronousMs": 8, "khrCompletionWaitMs": 70, "khrCompletionQueries": 4,
            "lastSynchronousPhase": {"phase": "completion-query", "startedAtMs": 99,
                                     "endedAtMs": 99.25, "durationMs": 0.25},
            "longestSynchronousPhase": {"phase": "source-build", "startedAtMs": 15,
                                        "endedAtMs": 20, "durationMs": 5}}


def timed_program():
    pending = diagnostic(provider="bremen", source="bremen bremen", resource="colour:46740",
                         priority="visible", status="pending", phase="link-completion",
                         timing=native_timing(), schedulingState="active")
    terminal_identity = {"provider": "bremen", "source": "bremen bremen",
                         "resource": "colour:46740", "epoch": 2,
                         "priority": "capture", "status": "cancelled"}
    return {"schemaVersion": 1, "revision": 5, "performanceTimeOriginMs": 1793274580119.7,
            "observedAtMs": 100, "timingScope": "owner-lifetime",
            "pending": 1, "failed": 1, "ready": 0,
            "pendingResources": [pending], "pendingResourcesTruncated": False,
            "phaseTimings": {"source-build": {"calls": 1, "totalMs": 5, "maxMs": 5},
                             "completion-query": {"calls": 4, "totalMs": 1, "maxMs": 0.25}},
            "terminalPhases": {"cancelled": {
                "lastSettledAtMs": 80,
                "longestSynchronousPhase": {**terminal_identity,
                                             **native_timing()["longestSynchronousPhase"]},
                "longestKHRCompletionWait": {**terminal_identity, "startedAtMs": 20,
                                              "endedAtMs": 80, "durationMs": 60}}},
            "last": diagnostic(timing=native_timing()),
            "failures": [diagnostic(timing=native_timing())],
            "context": {"epoch": 3, "pending": 1, "inFlight": 1, "maxInFlight": 1,
                        "scheduled": True, "visibleStarts": 4}}


@pytest.mark.parametrize("snapshot", ["live", "idle"])
def test_native_program_clocks_pending_and_terminal_timing_are_preserved(snapshot):
    proof, stats = scene(), timed_program()
    detail = {"threeDimensional": {"paintProviders": {"bremen": {"renderer": {
        "programPreparation": stats}}}}}
    if snapshot == "live":
        proof["programPreparation"] = [{"provider": "bremen", **stats}]
    value = run(proof, detail)["value"]
    prep = value["program_preparation"]
    actual = prep["providers"]["bremen"]
    assert actual["performanceTimeOriginMs"] == stats["performanceTimeOriginMs"]
    assert actual["observedAtMs"] == 100 and actual["timingScope"] == "owner-lifetime"
    assert actual["pendingResources"] == stats["pendingResources"]
    assert actual["pendingResourcesTruncated"] is False
    assert actual["phaseTimings"] == stats["phaseTimings"]
    assert actual["terminalPhases"] == stats["terminalPhases"]
    assert actual["terminalPhases"]["cancelled"]["longestSynchronousPhase"]["epoch"] == 2
    assert actual["context"]["epoch"] == 3 and actual["context"]["scheduled"] is True
    assert actual["last"]["timing"] == actual["failures"][0]["timing"] == native_timing()
    # KHR wait and query CPU time stay native and separate; no computed GPU duration.
    assert actual["pendingResources"][0]["phase"] == "link-completion"
    assert "not GPU compile time" in prep["timing_limitation"]
    assert value["proof_age_ms"] == 50 and value["solar"]["core"] == proof["scene"]["solarShadow"]["core"]


def test_cached_renderer_program_clock_is_not_replaced_by_idle_or_live_timing():
    proof = scene()
    live, old = timed_program(), timed_program()
    live.update(performanceTimeOriginMs=2000, observedAtMs=95, pendingResources=[], pending=0)
    old.update(performanceTimeOriginMs=1000, observedAtMs=40)
    proof["programPreparation"] = [{"provider": "bremen", **live}]
    cache = cached_readiness()
    cache["renderer"]["programPreparation"] = old
    idle = {"sequence": 6, "idleSequence": 4, "monotonicMs": 80,
            "utc": "2026-10-29T11:49:57.456Z", "documentHidden": False}
    detail = {"idleCapture": idle, "threeDimensional": {"paintProviders": {
        "bremen": {"drawReadiness": cache}}}}
    value = run(proof, detail)["value"]
    current = value["program_preparation"]["providers"]["bremen"]
    cached = value["manager_draw_readiness"]
    old_stats = cached["providers"]["bremen"]["renderer"]["programPreparation"]
    assert current["performanceTimeOriginMs"] == 2000 and current["observedAtMs"] == 95
    assert current["pending"] == 0 and current["pendingResources"] == []
    assert old_stats["performanceTimeOriginMs"] == 1000 and old_stats["observedAtMs"] == 40
    assert old_stats["pending"] == 1 and old_stats["pendingResources"][0]["timing"] == native_timing()
    assert cached["idle_publication"] == idle and cached["cache_age_ms"] is None
    assert cached["cache_recorded_at"] is None and cached["snapshot"] == "manager-cached-via-independent-idle"
    assert value["program_preparation"]["proof_monotonic_ms"] == 100


@pytest.mark.parametrize("native_truncated", [False, True])
def test_pending_resource_cap_preserves_full_count_and_native_truncation(native_truncated):
    stats = timed_program()
    stats.update(pending=37, pendingResourcesTruncated=native_truncated)
    stats["pendingResources"] *= 8 if native_truncated else 12
    proof = scene()
    proof["programPreparation"] = [{"provider": "bremen", **stats}]
    actual = run(proof)["value"]["program_preparation"]["providers"]["bremen"]
    assert actual["pending"] == 37 and len(actual["pendingResources"]) == 8
    assert actual["pendingResourcesTruncated"] is True


def test_invalid_new_timing_fields_are_not_filled_from_render_clock():
    stats = timed_program()
    stats.update(performanceTimeOriginMs="unknown", observedAtMs=None)
    stats.pop("pendingResourcesTruncated")
    stats["context"]["scheduled"] = 1
    row = stats["pendingResources"][0]
    row["timing"] = {"queuedAtMs": True, "startedAtMs": "later",
                     "synchronousMs": None, "khrCompletionWaitMs": 0,
                     "lastSynchronousPhase": {"phase": "source", "durationMs": 3}}
    stats["pendingResources"].append(diagnostic(status="ready"))
    stats["phaseTimings"] = {"source": {"calls": 9}, "upload": {"calls": False}}
    proof = scene()
    proof["programPreparation"] = [{"provider": "bremen", **stats}]
    actual = run(proof)["value"]["program_preparation"]["providers"]["bremen"]
    assert not {"performanceTimeOriginMs", "observedAtMs", "pendingResourcesTruncated"} & actual.keys()
    assert "scheduled" not in actual["context"]
    assert len(actual["pendingResources"]) == 1
    assert actual["pendingResources"][0]["timing"] == {"khrCompletionWaitMs": 0}
    assert actual["phaseTimings"] == {"upload": {}}


def test_new_program_timing_is_bounded_and_never_exposes_recipe_inputs():
    long = "x" * 700
    stats = timed_program()
    row = stats["pendingResources"][0]
    row.update(provider=long, source=long, resource=long, priority=long,
               schedulingState=long, reason=long, inputs=["RECIPE_INPUT_NEVER"],
               build="JOB_NEVER", geometry="GEOMETRY_NEVER")
    row["vertex"] = {"characters": 500, "hash": long, "body": "SHADER_NEVER"}
    row["fragment"] = {"characters": 900, "hash": long, "body": "SHADER_NEVER"}
    row["timing"]["lastSynchronousPhase"]["history"] = ["HISTORY_NEVER"] * 30
    stats["pendingResources"] = [row] * 12
    stats["phaseTimings"] = {p: {"calls": 3, "totalMs": 4, "maxMs": 2,
                                 "history": ["HISTORY_NEVER"] * 30}
                              for p in SYNCHRONOUS_PHASES + ["invented-phase"]}
    slot = stats["terminalPhases"]["cancelled"]
    for name in ["longestSynchronousPhase", "longestKHRCompletionWait"]:
        slot[name].update(provider=long, source=long, resource=long, priority=long,
                          status=long, inputs=["RECIPE_INPUT_NEVER"], shader="SHADER_NEVER")
    stats["terminalPhases"] = {s: slot for s in ["ready", "failed", "cancelled", "lost", "invented"]}
    proof = scene()
    proof["programPreparation"] = [{"provider": "bremen", **stats}]
    cache = cached_readiness()
    cache["renderer"]["programPreparation"] = stats
    detail = {"threeDimensional": {"paintProviders": {"bremen": {"drawReadiness": cache}}}}
    value = run(proof, detail)["value"]
    cached = value["manager_draw_readiness"]["providers"]["bremen"]["renderer"]["programPreparation"]
    for actual in [value["program_preparation"]["providers"]["bremen"], cached]:
        assert len(actual["pendingResources"]) == 8 and actual["pendingResourcesTruncated"] is True
        assert set(actual["phaseTimings"]) == set(SYNCHRONOUS_PHASES)
        assert set(actual["terminalPhases"]) == {"ready", "failed", "cancelled", "lost"}
        for pending in actual["pendingResources"]:
            assert len(pending["provider"]) == 64 and len(pending["source"]) == 128
            assert len(pending["resource"]) == 256 and len(pending["priority"]) == 32
            assert len(pending["schedulingState"]) == 32 and len(pending["reason"]) == 512
            assert len(pending["vertex"]["hash"]) == len(pending["fragment"]["hash"]) == 64
        for terminal in actual["terminalPhases"].values():
            for event in [terminal["longestSynchronousPhase"], terminal["longestKHRCompletionWait"]]:
                assert len(event["provider"]) == 64 and len(event["source"]) == 128
                assert len(event["resource"]) == 256 and len(event["status"]) == 32
    encoded = json.dumps(value)
    assert len(encoded) < 65536
    assert not any(token in encoded for token in ["RECIPE_INPUT_NEVER", "JOB_NEVER", "GEOMETRY_NEVER",
                                                 "SHADER_NEVER", "HISTORY_NEVER", "invented-phase"])


def test_frozen_resource_scalars_use_same_native_proof_without_hiding_legacy_inputs():
    proof = scene()
    stats = {"active": 1, "queued": 2, "waiters": 3, "leases": 0, "valueCells": 1,
             "entries": 4, "peakConcurrency": 2, "reads": 5, "parses": 4,
             "releasedValues": 3, "acquisitions": 9, "logicalBytesWithLiveLease": 1234,
             "cumulativeLogicalJSONBytes": 2345,
             "clients": 6, "measurement": "resource-cells-and-logical-json-input-not-retained-heap"}
    proof["frozenDataResources"] = stats
    proof["frozenTableInputs"] = {"retainedBytes": 9999,
                                  "resolvedInputs": {"resolvedJSONBytes": 500000}}
    # An older independent idle publication must not replace this native snapshot.
    detail = {"threeDimensional": {"frozenDataResources": {"active": 99, "reads": 99}}}
    value = run(proof, detail)["value"]
    actual = value["frozen_data_resources"]
    assert {key: actual[key] for key in stats} == stats
    assert actual["leases"] == 0 and actual["logicalBytesWithLiveLease"] == 1234
    assert actual["source"] == "scene-render-proof.frozenDataResources"
    assert actual["snapshot"] == "native-render" and "legacy" in actual["scope"]
    assert "not whole heap or current physical footprint" in actual["limitation"]
    assert value["frozen_table_inputs"]["retainedBytes"] == 9999
    assert value["frozen_table_inputs"]["resolvedInputs"]["resolvedJSONBytes"] == 500000
    assert value["sequence"] == 7 and value["proof_age_ms"] == 50
    assert value["solar"]["core"] == proof["scene"]["solarShadow"]["core"]


@pytest.mark.parametrize("defect", ["missing", "null", "array", "string"])
def test_missing_or_invalid_frozen_resource_stats_are_not_filled_from_idle(defect):
    proof = scene()
    if defect != "missing":
        proof["frozenDataResources"] = {"null": None, "array": [], "string": "unknown"}[defect]
    detail = {"threeDimensional": {"frozenDataResources": {"active": 1, "leases": 1}}}
    assert "frozen_data_resources" not in run(proof, detail)["value"]


def test_frozen_resource_projection_is_scalar_bounded_and_does_not_invent_zero():
    proof = scene()
    proof["frozenDataResources"] = {
        "active": False, "queued": "unknown", "waiters": None, "leases": 0,
        "valueCells": [], "entries": {}, "clients": ["PRIVATE_CLIENT_NEVER"],
        "measurement": "x" * 1500, "logicalBytesWithLiveLease": 0,
        "inputs": ["RECIPE_INPUT_NEVER"], "geometry": "GEOMETRY_NEVER",
        "wholeHeap": "HEAP_NEVER", "legacyValues": "LEGACY_VALUE_NEVER"}
    actual = run(proof)["value"]["frozen_data_resources"]
    assert not {"active", "queued", "waiters", "valueCells", "entries", "clients"} & actual.keys()
    assert actual["leases"] == actual["logicalBytesWithLiveLease"] == 0
    assert len(actual["measurement"]) == 128
    encoded = json.dumps(actual)
    assert len(encoded) < 1024
    assert not any(token in encoded for token in ["PRIVATE_CLIENT_NEVER", "RECIPE_INPUT_NEVER",
                                                 "GEOMETRY_NEVER", "HEAP_NEVER", "LEGACY_VALUE_NEVER"])
