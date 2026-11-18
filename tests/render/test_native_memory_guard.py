"""Synthetic identities, samples and time only; never query or signal native processes."""

import copy
import datetime as dt
import importlib.util
import json
import signal
import sys
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE = Path(__file__).resolve().parents[2] / "scripts/render/native_memory_guard.py"
SPEC = importlib.util.spec_from_file_location("fixture_native_memory_guard", MODULE)
guard_module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = guard_module
SPEC.loader.exec_module(guard_module)

UID = 501
EXECUTABLE = "/fixture/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
FRAMEWORKS = "/fixture/Google Chrome for Testing.app/Contents/Frameworks/"
RENDERER = FRAMEWORKS + "Google Chrome for Testing Helper (Renderer).app/Contents/MacOS/Google Chrome for Testing Helper (Renderer)"
GPU = FRAMEWORKS + "Google Chrome for Testing Helper (GPU).app/Contents/MacOS/Google Chrome for Testing Helper (GPU)"


class FakeClock:
    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        assert 0 < seconds <= 0.05
        assert len(self.sleeps) < 80, "fixture wait must remain bounded"
        self.sleeps.append(seconds)
        self.now += seconds

    def utc(self):
        base = dt.datetime(2026, 10, 30, tzinfo=dt.UTC)
        return (base + dt.timedelta(seconds=self.now)).isoformat()


class FakeProbe:
    def __init__(self, binding, clock, events):
        self.binding, self.clock, self.events = binding, clock, events
        self.identities = {
            binding.browser.pid: binding.browser,
            binding.map_pid: guard_module.Identity(binding.map_pid, binding.map_start, RENDERER),
            103: guard_module.Identity(103, 1003, GPU),
        }
        self.parents = {
            binding.browser.pid: (1, UID),
            binding.map_pid: (binding.browser.pid, UID),
            103: (binding.browser.pid, UID),
        }
        self.signals = []
        self.exit_on_term = True

    def inspect(self, pid):
        return self.identities.get(pid)

    def topology(self):
        return dict(self.parents)

    def send(self, pid, sig):
        self.signals.append((pid, int(sig), self.clock.monotonic()))
        self.events.append(("signal", pid, int(sig)))
        if sig == signal.SIGTERM and self.exit_on_term:
            self.identities.clear()
        elif sig == signal.SIGKILL:
            self.identities.pop(pid, None)


@pytest.mark.parametrize("exit_after", [0, 1, 5])
def test_native_path_exit_transition_requires_explicit_esrch(monkeypatch, exit_after):
    probe = object.__new__(guard_module.MacProbe)
    live = {"processStartAbsoluteTime": 1001}
    readings = iter([live] + [live] * exit_after + [{"error": 3}])
    probe.usage = lambda pid: next(readings)
    probe.lib = SimpleNamespace(proc_pidpath=lambda *args: 0)
    waits = []
    monkeypatch.setattr(guard_module.time, "sleep", waits.append)
    assert probe.inspect(101) is None
    assert waits == [0.02] * exit_after


@pytest.mark.parametrize("last,expected_waits", [
    ({"processStartAbsoluteTime": 1001}, 5),
    ({"processStartAbsoluteTime": 1002}, 0),
    ({"error": 1}, 0),
])
def test_native_path_failure_never_admits_live_reused_or_unreadable_pid(monkeypatch, last, expected_waits):
    probe = object.__new__(guard_module.MacProbe)
    readings = iter([{"processStartAbsoluteTime": 1001}] + [last] * 6)
    probe.usage = lambda pid: next(readings)
    probe.lib = SimpleNamespace(proc_pidpath=lambda *args: 0)
    waits = []
    monkeypatch.setattr(guard_module.time, "sleep", waits.append)
    with pytest.raises(guard_module.GuardFailure):
        probe.inspect(101)
    assert waits == [0.02] * expected_waits


def sample(binding, peak, *, gpu_peak=None):
    return {
        "utc": "2026-10-30T00:00:00Z",
        "processes": [
            {"pid": binding.browser.pid, "role": "browser",
             "processStartAbsoluteTime": binding.browser.start},
            {"pid": binding.map_pid, "role": "renderer",
             "processStartAbsoluteTime": binding.map_start,
             "lifetimePeakPhysicalFootprintBytes": peak},
            {"pid": 103, "role": "gpu", "processStartAbsoluteTime": 1003,
             "lifetimePeakPhysicalFootprintBytes": gpu_peak or 100},
        ],
    }


@pytest.fixture
def fixture(monkeypatch):
    def native_forbidden(*args, **kwargs):
        raise AssertionError("MacProbe must never be constructed by fixture tests")

    monkeypatch.setattr(guard_module, "MacProbe", native_forbidden)
    binding = guard_module.Binding("fixture-run", guard_module.Identity(101, 1001, EXECUTABLE),
                                   102, 1002)
    clock, events, receipts = FakeClock(), [], []
    probe = FakeProbe(binding, clock, events)

    def sink(report):
        receipts.append(copy.deepcopy(report))
        events.append(("receipt", report["status"]))

    guard = guard_module.Guard(binding, probe, clock=clock, sink=sink, uid=UID)
    return binding, probe, clock, guard, receipts, events


def test_first_map_crossing_triggers_once_and_persists_before_signal(fixture):
    binding, probe, _, guard, receipts, events = fixture
    assert guard_module.CAP_BYTES == 2_300_000_000
    guard.arm(sample(binding, guard_module.CAP_BYTES))
    first = sample(binding, guard_module.CAP_BYTES + 1)
    report = guard.observe(first)
    sent = list(probe.signals)
    assert report["status"] == "stopped" and guard.done
    assert report["capBytes"] == 2_300_000_000
    assert report["trigger"]["lifetimePeakPhysicalFootprintBytes"] == guard_module.CAP_BYTES + 1
    assert sent == [(binding.browser.pid, int(signal.SIGTERM), 0.0)]
    assert events.index(("receipt", "triggered")) < next(
        i for i, event in enumerate(events) if event[0] == "signal")
    assert next(r for r in receipts if r["status"] == "triggered")["signals"] == []
    assert next(r for r in receipts if r["status"] == "triggered")["capBytes"] == 2_300_000_000
    assert guard.observe(sample(binding, guard_module.CAP_BYTES + 999)) is report
    assert guard.stop("repeat stop") is report
    assert probe.signals == sent
    assert report["trigger"]["lifetimePeakPhysicalFootprintBytes"] == guard_module.CAP_BYTES + 1


def test_equal_cap_does_not_trigger_or_aggregate_gpu(fixture):
    binding, probe, _, guard, _, _ = fixture
    row = sample(binding, guard_module.CAP_BYTES, gpu_peak=guard_module.CAP_BYTES * 10)
    assert guard_module.sample_peak(row, binding) == guard_module.CAP_BYTES
    guard.arm(row)
    report = guard.observe(row)
    assert report["status"] == "armed" and report["trigger"] is None
    assert not guard.done and not probe.signals


@pytest.mark.parametrize("inventory_still_lists_child", [False, True])
def test_auxiliary_child_exit_during_query_does_not_stop_memory_observation(fixture, inventory_still_lists_child):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    probe.identities[104] = guard_module.Identity(104, 1004, RENDERER)
    probe.parents[104] = (binding.browser.pid, UID)
    original = probe.topology
    calls = 0

    def topology():
        nonlocal calls
        calls += 1
        result = original()
        if calls == 2:
            probe.identities.pop(104)
            probe.parents.pop(104)
            if not inventory_still_lists_child:
                result.pop(104)
        return result

    probe.topology = topology
    report = guard.observe(sample(binding, guard_module.CAP_BYTES + 1))
    assert report["status"] == "observing-over-cap"
    assert report["exitedChildrenDuringQuery"] == 1
    assert 104 not in guard.owned
    assert not guard.done and not probe.signals
    probe.topology = original
    guard.observe(sample(binding, guard_module.CAP_BYTES + 2))
    assert report["samplesObserved"] == 2
    assert report["maxObservedLifetimePeakPhysicalFootprintBytes"] == guard_module.CAP_BYTES + 2


@pytest.mark.parametrize("change", ["reused-child", "reparented-child", "bound-map-exit"])
def test_query_exit_tolerance_does_not_admit_changed_live_identity_or_bound_map(fixture, change):
    binding, probe, _, guard, _, _ = fixture
    guard.arm(sample(binding, 100))
    original = probe.topology
    calls = 0

    def topology():
        nonlocal calls
        calls += 1
        if calls == 2:
            if change == "reused-child":
                probe.identities[103] = replace(probe.identities[103], start=9999)
            elif change == "reparented-child":
                probe.parents[103] = (1, UID)
            else:
                probe.identities.pop(binding.map_pid)
                probe.parents.pop(binding.map_pid)
        return original()

    probe.topology = topology
    with pytest.raises(guard_module.GuardFailure, match="child identity/topology changed"):
        guard.collect()
    assert not probe.signals


@pytest.mark.parametrize("defect", ["error", "sample-start", "live-start", "missing-peak", "boolean-peak"])
def test_invalid_or_reused_map_is_rejected_before_arming_without_signal(fixture, defect):
    binding, probe, _, guard, _, _ = fixture
    row = sample(binding, guard_module.CAP_BYTES + 1, gpu_peak=guard_module.CAP_BYTES * 10)
    target = row["processes"][1]
    if defect == "error":
        target["error"] = 3
    elif defect == "sample-start":
        target["processStartAbsoluteTime"] += 1
    elif defect == "live-start":
        probe.identities[binding.map_pid] = replace(probe.identities[binding.map_pid], start=9999)
    elif defect == "missing-peak":
        target.pop("lifetimePeakPhysicalFootprintBytes")
        target["physicalFootprintBytes"] = 1
    else:
        target["lifetimePeakPhysicalFootprintBytes"] = True
    with pytest.raises(guard_module.GuardFailure) as error:
        guard.arm(row)
    assert not guard.armed and not probe.signals
    assert guard.fail(error.value)["status"] == "failed"
    assert not probe.signals


@pytest.mark.parametrize("defect", ["normal-chrome", "changed-browser-path", "wrong-helper-path", "wrong-parent"])
def test_only_exact_dedicated_browser_and_its_map_child_can_arm(fixture, defect):
    binding, probe, clock, guard, _, _ = fixture
    if defect == "normal-chrome":
        browser = replace(binding.browser, executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        binding = replace(binding, browser=browser)
        probe.identities[browser.pid] = browser
        guard = guard_module.Guard(binding, probe, clock=clock, uid=UID)
    elif defect == "changed-browser-path":
        probe.identities[binding.browser.pid] = replace(binding.browser, executable="/other" + EXECUTABLE)
    elif defect == "wrong-helper-path":
        probe.identities[binding.map_pid] = replace(probe.identities[binding.map_pid], executable=
            "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper (Renderer).app/Contents/MacOS/Google Chrome Helper (Renderer)")
    else:
        probe.parents[binding.map_pid] = (999, UID)
    with pytest.raises(guard_module.GuardFailure):
        guard.arm(sample(binding, 1))
    assert not guard.armed and not probe.signals


def test_armed_pid_reuse_is_rechecked_before_signal_and_never_signals_replacement(fixture):
    binding, probe, _, guard, _, _ = fixture
    guard.arm(sample(binding, 1))
    original = probe.identities[binding.map_pid]
    replacement = replace(original, start=original.start + 1)
    probe.identities[binding.map_pid] = replacement
    guard.send(original, signal.SIGTERM)
    assert not probe.signals
    assert any(row["pid"] == original.pid and "reused" in row["reason"]
               for row in guard.report["refused"])
    report = guard.observe(sample(binding, guard_module.CAP_BYTES + 1))
    assert report["status"] == "failed"
    assert all(pid != binding.map_pid for pid, _, _ in probe.signals)


@pytest.mark.parametrize("already_exited", [True, False])
def test_exited_processes_complete_idempotently_without_signal(fixture, already_exited):
    binding, probe, _, guard, _, _ = fixture
    if not already_exited:
        guard.arm(sample(binding, 1))
    probe.identities.clear()
    if already_exited:
        guard.arm(sample(binding, 1))
    report = guard.stop("already exited")
    assert report["status"] == "completed" and guard.done
    assert guard.stop("repeat") is report
    assert guard.observe({}) is report
    assert not probe.signals


def test_kill_is_only_after_ineffective_term_and_fake_wait_is_finite(fixture):
    binding, probe, clock, guard, _, _ = fixture
    probe.exit_on_term = False
    guard.arm(sample(binding, 1))
    report = guard.observe(sample(binding, guard_module.CAP_BYTES + 1))
    assert report["status"] == "stopped" and not report["remainingPIDs"]
    assert len(probe.signals) == 6
    for pid in (binding.browser.pid, binding.map_pid, 103):
        signals = [(sig, at) for target, sig, at in probe.signals if target == pid]
        assert [sig for sig, _ in signals] == [int(signal.SIGTERM), int(signal.SIGKILL)]
        assert signals[1][1] >= 1.25 and signals[1][1] > signals[0][1]
    assert clock.now == pytest.approx(1.25)
    assert len(clock.sleeps) <= 40
    sent = list(probe.signals)
    guard.stop("repeat")
    assert probe.signals == sent


def test_tail_waits_for_newline_then_complete_crossing_triggers_once(tmp_path, fixture):
    binding, probe, _, guard, _, _ = fixture
    guard.arm(sample(binding, 1))
    path = tmp_path / "samples.jsonl"
    raw = json.dumps(sample(binding, guard_module.CAP_BYTES + 1)).encode()
    path.write_bytes(raw[:len(raw) // 2])
    tail = guard_module.SampleTail(path)
    try:
        assert list(tail.poll()) == [] and not probe.signals
        with path.open("ab") as stream:
            stream.write(raw[len(raw) // 2:])
        assert list(tail.poll()) == [] and not probe.signals
        with path.open("ab") as stream:
            stream.write(b"\n")
        rows = list(tail.poll())
        assert len(rows) == 1
        assert guard.observe(rows[0])["status"] == "stopped"
        assert list(tail.poll()) == []
        assert len(probe.signals) == 1
    finally:
        tail.file.close()


@pytest.mark.parametrize("payload,error", [(b"{broken\n", json.JSONDecodeError),
                                          (b"x" * (guard_module.MAX_LINE + 1), guard_module.GuardFailure)])
def test_malformed_or_oversized_partial_tail_is_error_not_below_cap(tmp_path, fixture, payload, error):
    binding, probe, _, guard, _, _ = fixture
    guard.arm(sample(binding, 1))
    path = tmp_path / "samples.jsonl"
    path.write_bytes(payload)
    tail = guard_module.SampleTail(path)
    try:
        with pytest.raises(error) as failure:
            list(tail.poll())
        assert not probe.signals
        report = guard.fail(failure.value)
        assert report["status"] == "failed" and report["trigger"] is None
        assert probe.signals == [(binding.browser.pid, int(signal.SIGTERM), 0.0)]
    finally:
        tail.file.close()


def test_independent_main_consumes_new_sampler_row_without_browser_or_cua(tmp_path, fixture, monkeypatch):
    binding, probe, clock, _, _, _ = fixture
    samples = tmp_path / "footprint.jsonl"
    row = sample(binding, guard_module.CAP_BYTES)
    row["utc"] = dt.datetime.now(dt.UTC).isoformat()
    samples.write_text(json.dumps(row) + "\n")
    samples.with_suffix(".metadata.json").write_text(json.dumps({
        "api": guard_module.API, "browserPid": binding.browser.pid, "structureBytes": 296,
    }))
    sampler = tmp_path / "frozen_sampler.py"
    sampler.write_text("not imported: native probe is replaced by the fixture\n")
    receipt = tmp_path / "guard.json"
    appended = False

    def idle(seconds):
        nonlocal appended
        clock.sleep(seconds)
        if not appended:
            appended = True
            crossing = sample(binding, guard_module.CAP_BYTES + 1)
            crossing["utc"] = dt.datetime.now(dt.UTC).isoformat()
            with samples.open("a") as output:
                output.write(json.dumps(crossing) + "\n")

    monkeypatch.setattr(guard_module, "MacProbe", lambda script: probe)
    monkeypatch.setattr(guard_module, "Clock", lambda: clock)
    monkeypatch.setattr(guard_module, "time", SimpleNamespace(monotonic=clock.monotonic, sleep=idle))
    result = guard_module.main([
        "--run-id", binding.run_id, "--exclusive-browser",
        "--browser-pid", str(binding.browser.pid), "--browser-start", str(binding.browser.start),
        "--browser-executable", binding.browser.executable,
        "--map-pid", str(binding.map_pid), "--map-start", str(binding.map_start),
        "--sampler-script", str(sampler), "--samples", str(samples),
        "--receipt", str(receipt), "--duration", "1",
    ])
    final = json.loads(receipt.read_text())
    assert appended and result == 1 and final["status"] == "stopped"
    assert final["trigger"]["lifetimePeakPhysicalFootprintBytes"] == guard_module.CAP_BYTES + 1
    assert probe.signals == [(binding.browser.pid, int(signal.SIGTERM), 0.05)]
    assert not list(tmp_path.glob("guard.json.*.tmp"))


def report_only(fixture):
    binding, probe, clock, _, receipts, _ = fixture
    guard = guard_module.Guard(binding, probe, clock=clock, uid=UID, policy="report-only",
                               sink=lambda value: receipts.append(copy.deepcopy(value)))
    return binding, probe, clock, guard, receipts


def test_report_only_first_crossing_persists_and_later_peaks_continue_without_signals(fixture):
    binding, probe, _, guard, receipts = report_only(fixture)
    guard.arm(sample(binding, guard_module.CAP_BYTES))
    assert guard.observe(sample(binding, guard_module.CAP_BYTES, gpu_peak=10**12))["overCap"] is False
    first = sample(binding, guard_module.CAP_BYTES + 1)
    first["utc"] = "2026-10-30T00:00:01Z"
    guard.observe(first)
    trigger = copy.deepcopy(guard.report["trigger"])
    assert receipts[-1]["overCap"] and not receipts[-1]["completed"]
    assert guard.report["status"] == "observing-over-cap" and not guard.done
    later = sample(binding, guard_module.CAP_BYTES + 900)
    later["utc"] = "2026-10-30T00:00:02Z"
    guard.observe(later)
    assert guard.report["trigger"] == trigger
    assert receipts[-1]["maxObservedLifetimePeakPhysicalFootprintBytes"] == guard_module.CAP_BYTES + 900
    assert receipts[-1]["lastSampleUTC"] == later["utc"]
    assert not probe.signals and not guard.report["signals"]
    report = guard.stop("operator completed observation")
    assert report["status"] == "completed-over-cap" and report["completed"] and report["overCap"]
    assert report["remainingPIDs"] and not probe.signals
    assert guard.stop("idempotent") is report
    with pytest.raises(guard_module.GuardFailure, match="forbids process signals"):
        guard.send(binding.browser, signal.SIGTERM)
    assert not probe.signals


@pytest.mark.parametrize("defect", ["sample-start", "missing-map"])
def test_report_only_invalid_sample_fails_without_signalling_or_accepting_replacement(fixture, defect):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    row = sample(binding, guard_module.CAP_BYTES + 1)
    if defect == "sample-start":
        row["processes"][1]["processStartAbsoluteTime"] += 1
    else:
        row["processes"].pop(1)
    with pytest.raises(guard_module.GuardFailure) as error:
        guard.observe(row)
    report = guard.fail(error.value)
    assert report["status"] == "failed" and not report["completed"]
    assert report["overCap"] is False and report["trigger"] is None
    assert not probe.signals


@pytest.mark.parametrize("ending,over_cap", [("natural", True), ("duration", True), ("duration", False)])
def test_report_only_cli_keeps_sampling_to_natural_exit_or_duration(tmp_path, fixture, monkeypatch, ending, over_cap):
    binding, probe, clock, _, _, _ = fixture
    wall_start = dt.datetime.now(dt.UTC)
    clock.utc = lambda: (wall_start + dt.timedelta(seconds=clock.now)).isoformat()
    samples, receipt = tmp_path / "footprint.jsonl", tmp_path / "guard.json"
    def row(peak):
        value = sample(binding, peak)
        value["utc"] = clock.utc()
        return value
    samples.write_text(json.dumps(row(100)) + "\n")
    samples.with_suffix(".metadata.json").write_text(json.dumps({
        "api": guard_module.API, "browserPid": binding.browser.pid, "structureBytes": 296,
    }))
    sampler = tmp_path / "frozen_sampler.py"
    sampler.write_text("fixture replaces MacProbe; never imported\n")
    turns = 0
    def idle(seconds):
        nonlocal turns
        turns += 1
        clock.sleep(seconds)
        value = None
        if turns <= 2:
            value = row(guard_module.CAP_BYTES + turns if over_cap else 100 + turns)
        elif turns == 3 and ending == "natural":
            probe.identities.clear()
            value = {"utc": clock.utc(), "processes": []}
        if value:
            with samples.open("a") as output:
                output.write(json.dumps(value) + "\n")
    monkeypatch.setattr(guard_module, "MacProbe", lambda script: probe)
    monkeypatch.setattr(guard_module, "Clock", lambda: clock)
    monkeypatch.setattr(guard_module, "time", SimpleNamespace(monotonic=clock.monotonic, sleep=idle))
    result = guard_module.main([
        "--run-id", binding.run_id, "--exclusive-browser", "--policy", "report-only",
        "--browser-pid", str(binding.browser.pid), "--browser-start", str(binding.browser.start),
        "--browser-executable", binding.browser.executable,
        "--map-pid", str(binding.map_pid), "--map-start", str(binding.map_start),
        "--sampler-script", str(sampler), "--samples", str(samples),
        "--receipt", str(receipt), "--duration", "1",
    ])
    final = json.loads(receipt.read_text())
    assert result == (1 if over_cap else 0)
    assert final["policy"] == "report-only" and final["completed"]
    assert final["overCap"] is over_cap
    assert final["status"] == ("completed-over-cap" if over_cap else "completed")
    assert final["samplesObserved"] == 3
    assert final["maxObservedLifetimePeakPhysicalFootprintBytes"] == (guard_module.CAP_BYTES + 2 if over_cap else 102)
    assert not probe.signals and not final["signals"]
    assert bool(final["remainingPIDs"]) is (ending == "duration")


def test_report_only_unknown_policy_is_rejected_before_native_operations(fixture):
    binding, probe, _, _, _, _ = fixture
    with pytest.raises(guard_module.GuardFailure, match="unknown memory policy"):
        guard_module.Guard(binding, probe, policy="silently-accept")
    assert not probe.signals


def test_report_only_inventory_timeout_records_gap_and_recovers_next_sample(fixture):
    binding, probe, _, guard, receipts = report_only(fixture)
    guard.arm(sample(binding, guard_module.CAP_BYTES))
    original = probe.topology
    owned = dict(guard.owned)
    def timeout():
        raise guard_module.subprocess.TimeoutExpired(['ps'], 0.5)
    probe.topology = timeout
    for _ in range(2):
        guard.observe(sample(binding, guard_module.CAP_BYTES + 1))
    assert not guard.done and not probe.signals
    assert guard.owned == owned
    assert receipts[-1]['inventoryTimeouts'] == 2
    assert receipts[-1]['inventoryIncomplete'] is True
    assert receipts[-1]['samplesObserved'] == 2
    probe.topology = original
    guard.observe(sample(binding, guard_module.CAP_BYTES + 7))
    assert receipts[-1]['inventoryIncomplete'] is False
    assert receipts[-1]['inventoryTimeouts'] == 2
    assert receipts[-1]['lastInventoryTimeout']['timeoutSeconds'] == 0.5
    assert receipts[-1]['maxObservedLifetimePeakPhysicalFootprintBytes'] == guard_module.CAP_BYTES + 7
    assert not probe.signals


def test_report_only_inventory_identity_error_still_fails(fixture):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, guard_module.CAP_BYTES))
    probe.parents[binding.browser.pid] = (1, UID + 1)
    with pytest.raises(guard_module.GuardFailure, match='UID'):
        guard.observe(sample(binding, guard_module.CAP_BYTES))
    assert not probe.signals


def test_terminate_policy_inventory_timeout_is_not_suppressed(fixture):
    binding, probe, _, guard, _, _ = fixture
    guard.arm(sample(binding, guard_module.CAP_BYTES))
    def timeout():
        raise guard_module.subprocess.TimeoutExpired(['ps'], 0.5)
    probe.topology = timeout
    with pytest.raises(guard_module.subprocess.TimeoutExpired):
        guard.observe(sample(binding, guard_module.CAP_BYTES))


def test_report_only_helper_churn_does_not_exhaust_live_ownership(fixture):
    binding, probe, _, guard, receipts = report_only(fixture)
    guard.arm(sample(binding, 100))
    for index in range(guard_module.MAX_OWNED * 3):
        pid = 200 + index
        probe.identities[pid] = guard_module.Identity(pid, 2000 + index, RENDERER)
        probe.parents[pid] = (binding.browser.pid, UID)
        guard.observe(sample(binding, guard_module.CAP_BYTES + index + 1))
        assert pid in guard.owned
        assert len(guard.owned) == 4
        probe.identities.pop(pid)
        # Stale inventory must not defeat a conclusive native exit check.
    guard.observe(sample(binding, guard_module.CAP_BYTES + 100))
    assert receipts[-1]['retiredExitedHelpers'] == guard_module.MAX_OWNED * 3
    assert len(guard.owned) == 3
    assert not guard.done and not probe.signals


def test_simultaneously_live_helpers_still_hit_ownership_bound(fixture):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    for pid in range(200, 200 + guard_module.MAX_OWNED):
        probe.identities[pid] = guard_module.Identity(pid, pid + 1000, RENDERER)
        probe.parents[pid] = (binding.browser.pid, UID)
    with pytest.raises(guard_module.GuardFailure, match='owned process bound exceeded'):
        guard.collect()
    assert len(guard.owned) == guard_module.MAX_OWNED
    assert not probe.signals


def test_live_reparented_helper_is_not_retired_and_reuse_is_refused(fixture):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    original = probe.identities[103]
    probe.parents[103] = (1, UID)
    guard.collect()
    assert guard.owned[103] == original
    probe.identities[103] = replace(original, start=9999)
    with pytest.raises(guard_module.GuardFailure, match='reused/path-changed PID'):
        guard.collect()
    assert guard.owned[103] == original
    assert guard.report['retiredExitedHelpers'] == 0
    assert not probe.signals


def test_exited_bound_map_is_not_retired(fixture):
    binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    probe.identities.pop(binding.map_pid)
    probe.parents.pop(binding.map_pid)
    guard.collect()
    assert binding.map_pid in guard.owned
    assert guard.report['retiredExitedHelpers'] == 0
    assert not probe.signals


@pytest.mark.parametrize('policy', ['report-only', 'terminate'])
def test_browser_exit_at_inventory_end_is_observation_end_only_in_report_mode(fixture, policy):
    binding, probe, _, guard, _, _ = fixture
    if policy == 'report-only':
        binding, probe, _, guard, _ = report_only(fixture)
    guard.arm(sample(binding, 100))
    original = probe.topology
    calls = 0
    def topology():
        nonlocal calls
        calls += 1
        if calls == 2:
            probe.identities.pop(binding.browser.pid)
            probe.parents.pop(binding.browser.pid)
        return original()
    probe.topology = topology
    if policy == 'terminate':
        with pytest.raises(guard_module.GuardFailure, match='browser exited during ownership query'):
            guard.collect()
    else:
        guard.observe(sample(binding, 101))
        assert guard.report['browserExitsDuringQuery'] == 1
        assert guard.report['samplesObserved'] == 1
        assert binding.map_pid in guard.owned
        assert binding.map_pid in [item.pid for item in guard.remaining()]
        guard.stop('dedicated browser exited')
        assert guard.report['status'] == 'completed'
        assert binding.map_pid in guard.report['remainingPIDs']
    assert not probe.signals


def test_report_only_sample_gap_recovers_without_losing_peak_or_signalling(fixture):
    binding, probe, clock, guard, receipts = report_only(fixture)
    row = sample(binding, guard_module.CAP_BYTES + 100)
    guard.arm(row)
    guard.observe(row)
    clock.now = 3
    guard.check_report_only_continuity(row, 3)
    assert guard.report['sampleGapOpen'] and guard.report['sampleGapCount'] == 1
    count = len(receipts)
    clock.now = 4
    guard.check_report_only_continuity(row, 4)
    assert len(receipts) == count, 'one bounded receipt per gap edge, not per polling turn'
    assert not guard.done and not probe.signals
    clock.now = 6
    resumed = sample(binding, guard_module.CAP_BYTES + 200)
    resumed['utc'] = clock.utc()
    guard.observe(resumed)
    guard.check_report_only_continuity(resumed, 0)
    assert not guard.report['sampleGapOpen']
    assert guard.report['sampleGapObservedSeconds'] == 3
    assert guard.report['lastSampleGap']['recoveredUTC'] == clock.utc()
    assert guard.report['maxObservedLifetimePeakPhysicalFootprintBytes'] == guard_module.CAP_BYTES + 200
    assert not guard.done and not probe.signals


def test_report_only_old_complete_row_still_records_a_gap_when_tail_advances(fixture):
    binding, probe, clock, guard, _ = report_only(fixture)
    row = sample(binding, 100)
    guard.arm(row)
    clock.now = 10
    guard.check_report_only_continuity(row, 0)
    assert guard.report['sampleGapOpen'] and not guard.done
    assert not probe.signals


@pytest.mark.parametrize('stamp', ['2026-10-30T00:00:10Z', '2026-10-30T00:00:00'])
def test_report_only_continuity_rejects_future_or_timezone_less_evidence(fixture, stamp):
    binding, probe, _, guard, _ = report_only(fixture)
    row = sample(binding, 100)
    guard.arm(row)
    row['utc'] = stamp
    with pytest.raises(guard_module.GuardFailure):
        guard.check_report_only_continuity(row, 0)
    assert not probe.signals


@pytest.mark.parametrize('recover', [False, True])
def test_report_only_cli_survives_stalled_tail_and_keeps_bounded_deadline(tmp_path, fixture, monkeypatch, recover):
    binding, probe, clock, _, _, _ = fixture
    wall_start = dt.datetime.now(dt.UTC)
    clock.utc = lambda: (wall_start + dt.timedelta(seconds=clock.now)).isoformat()
    samples, receipt = tmp_path / 'footprint.jsonl', tmp_path / 'guard.json'
    baseline = sample(binding, 100)
    baseline['utc'] = clock.utc()
    samples.write_text(json.dumps(baseline) + '\n')
    samples.with_suffix('.metadata.json').write_text(json.dumps({
        'api': guard_module.API, 'browserPid': binding.browser.pid, 'structureBytes': 296,
    }))
    sampler = tmp_path / 'sampler.py'
    sampler.write_text('# native probe replaced by fixture\n')
    appended = False

    def idle(seconds):
        nonlocal appended
        clock.sleep(seconds)
        if recover and not appended and clock.now >= 2.6:
            appended = True
            row = sample(binding, guard_module.CAP_BYTES + 42)
            row['utc'] = clock.utc()
            with samples.open('a') as output:
                output.write(json.dumps(row) + '\n')

    monkeypatch.setattr(guard_module, 'MacProbe', lambda script: probe)
    monkeypatch.setattr(guard_module, 'Clock', lambda: clock)
    monkeypatch.setattr(guard_module, 'time', SimpleNamespace(monotonic=clock.monotonic, sleep=idle))
    result = guard_module.main([
        '--run-id', binding.run_id, '--exclusive-browser', '--policy', 'report-only',
        '--browser-pid', str(binding.browser.pid), '--browser-start', str(binding.browser.start),
        '--browser-executable', binding.browser.executable,
        '--map-pid', str(binding.map_pid), '--map-start', str(binding.map_start),
        '--sampler-script', str(sampler), '--samples', str(samples),
        '--receipt', str(receipt), '--duration', '3',
    ])
    report = json.loads(receipt.read_text())
    assert clock.now >= 3 and result == int(recover)
    assert report['sampleGapCount'] == 1 and report['sampleGapOpen'] is (not recover)
    assert bool(report['lastSampleGap']['recoveredUTC']) is recover
    assert report['reason'].startswith('bounded observation duration')
    assert not report['signals'] and not probe.signals
    assert report['maxObservedLifetimePeakPhysicalFootprintBytes'] == (guard_module.CAP_BYTES + 42 if recover else 100)
