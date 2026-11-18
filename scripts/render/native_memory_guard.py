#!/usr/bin/env python3
"""Observe one dedicated CfT run against the existing sampler's map lifetime cap.

No browser is launched. Memory decisions use the original JSONL only. The frozen
sampler's usage() is reused for live start-ID checks, not a new memory metric.
"""

import argparse
import ctypes
import datetime as dt
import importlib.util
import json
import os
import re
import signal
import stat
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

# The current run's explicit user limit. Sealed earlier attempts retain their
# own original guard/sampler receipts and are never reclassified by this value.
CAP_BYTES = 2_300_000_000
MAX_OWNED = 32
MAX_LINE = 65_536
MAX_INPUT = 16 * 1024 * 1024
MAX_RECEIPT = 65_536
API = "libproc.proc_pid_rusage RUSAGE_INFO_V4"
APP_TAIL = "/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"


class GuardFailure(RuntimeError):
    pass


@dataclass(frozen=True)
class Identity:
    pid: int
    start: int
    executable: str


@dataclass(frozen=True)
class Binding:
    run_id: str
    browser: Identity
    map_pid: int
    map_start: int


class Clock:
    monotonic = staticmethod(time.monotonic)
    sleep = staticmethod(time.sleep)

    @staticmethod
    def utc():
        return dt.datetime.now(dt.UTC).isoformat()


def positive(value):
    return type(value) is int and value > 0


def bundle_path(executable):
    if not executable.startswith("/") or not executable.endswith(APP_TAIL) or len(executable) > 1024:
        raise GuardFailure("browser executable must be the exact dedicated CfT executable")
    return str(Path(executable).parents[2])


def helper_path(executable, browser_executable):
    bundle = bundle_path(browser_executable)
    return (len(executable) <= 1024 and executable.startswith(bundle + "/Contents/Frameworks/")
            and ".app/Contents/MacOS/" in executable
            and Path(executable).name.startswith("Google Chrome for Testing Helper"))


def sample_peak(row, binding):
    """Reject error/missing/reused identities; never substitute a GPU or current value."""
    if not isinstance(row, dict) or not isinstance(row.get("processes"), list):
        raise GuardFailure("invalid sampler row")
    processes = row["processes"]
    if len(processes) > MAX_OWNED:
        raise GuardFailure("sampler process bound exceeded")
    by_pid = {}
    for item in processes:
        if not isinstance(item, dict) or not positive(item.get("pid")) or item["pid"] in by_pid:
            raise GuardFailure("invalid or duplicate sampled PID")
        by_pid[item["pid"]] = item
    for pid, start, role in ((binding.browser.pid, binding.browser.start, "browser"),
                             (binding.map_pid, binding.map_start, "renderer")):
        item = by_pid.get(pid)
        if (item is None or "error" in item or not positive(item.get("processStartAbsoluteTime"))
                or item.get("processStartAbsoluteTime") != start
                or item.get("role") != role):
            raise GuardFailure(f"missing/error/reused sampled {role} identity")
    peak = by_pid[binding.map_pid].get("lifetimePeakPhysicalFootprintBytes")
    if type(peak) is not int or peak < 0:
        raise GuardFailure("invalid map lifetime footprint")
    utc = row.get("utc")
    if not isinstance(utc, str) or len(utc) > 64:
        raise GuardFailure("missing sampler UTC")
    return peak


class MacProbe:
    """Actual executable identity via libproc; reuse the supplied frozen usage()."""

    def __init__(self, sampler_script):
        if sys.platform != "darwin":
            raise GuardFailure("native guard requires macOS")
        spec = importlib.util.spec_from_file_location("guard_frozen_sampler", sampler_script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.usage = module.usage
        self.lib = module.lib
        self.lib.proc_pidpath.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_uint32]
        self.lib.proc_pidpath.restype = ctypes.c_int

    def inspect(self, pid):
        first = self.usage(pid)
        if first.get("error") == 3:  # ESRCH only; EPERM is not absence.
            return None
        if "error" in first or not positive(first.get("processStartAbsoluteTime")):
            raise GuardFailure(f"cannot verify start identity for PID {pid}")
        buffer = ctypes.create_string_buffer(4096)
        size = self.lib.proc_pidpath(pid, buffer, len(buffer))
        if size <= 0 or size >= len(buffer):
            # During child exit, pidpath can disappear before rusage reports
            # ESRCH. Allow that short transition without admitting an unverified
            # live identity. Permission errors and PID reuse still fail closed.
            for attempt in range(6):
                last = self.usage(pid)
                if last.get("error") == 3:
                    return None
                if ("error" in last or last.get("processStartAbsoluteTime")
                        != first["processStartAbsoluteTime"]):
                    raise GuardFailure(f"identity changed during path failure for PID {pid}")
                if size >= len(buffer) or attempt == 5:
                    break
                time.sleep(0.02)
            raise GuardFailure(f"cannot verify executable for PID {pid}")
        executable = os.path.realpath(os.fsdecode(buffer.value))
        last = self.usage(pid)
        if last.get("error") == 3:
            return None
        if ("error" in last or last.get("processStartAbsoluteTime")
                != first["processStartAbsoluteTime"]):
            raise GuardFailure(f"identity changed during query for PID {pid}")
        return Identity(pid, first["processStartAbsoluteTime"], executable)

    def topology(self):
        result = subprocess.run(["ps", "-axo", "pid=,ppid=,uid="], check=True,
                                capture_output=True, timeout=0.5)
        if len(result.stdout) > 2 * 1024 * 1024:
            raise GuardFailure("process inventory bound exceeded")
        return {int(p): (int(parent), int(uid)) for p, parent, uid in
                (line.split() for line in result.stdout.decode().splitlines())}

    @staticmethod
    def send(pid, sig):
        os.kill(pid, sig)  # Last identity inspection is immediately before this call.


class Guard:
    def __init__(self, binding, probe, *, clock=None, sink=None, uid=None, policy="terminate"):
        if policy not in ("terminate", "report-only"):
            raise GuardFailure("unknown memory policy")
        self.policy = policy
        self.binding, self.probe = binding, probe
        self.clock = clock or Clock()
        self.sink = sink or (lambda value: None)
        self.uid = os.getuid() if uid is None else uid
        self.owned = {}
        self.sent = set()
        self.done = False
        self.armed = False
        self.sample_gap_started = None
        self.report = {"schema_version": 1, "run_id": binding.run_id, "status": "initializing",
                       "capBytes": CAP_BYTES, "api": API, "signals": [], "refused": [],
                       "browser": vars(binding.browser),
                       "map": {"pid": binding.map_pid, "start": binding.map_start},
                       "trigger": None,
                       "policy": policy, "overCap": False, "completed": False,
                       "completionScope": "memory-observation-only; not functional acceptance",
                       "maxObservedLifetimePeakPhysicalFootprintBytes": None,
                       "lastSampleUTC": None, "samplesObserved": 0,
                       "exitedChildrenDuringQuery": 0,
                       "retiredExitedHelpers": 0,
                       "browserExitsDuringQuery": 0,
                       "inventoryTimeouts": 0, "inventoryIncomplete": False,
                       "lastInventoryTimeout": None,
                       "sampleGapCount": 0, "sampleGapOpen": False,
                       "sampleGapObservedSeconds": 0.0, "lastSampleGap": None,
                       "identitySignalAtomic": False}

    def write(self):
        bundle = bundle_path(self.binding.browser.executable) if self.owned else ""
        self.report["owned"] = [
            {"pid": x.pid, "start": x.start,
             "executable": x.executable if x.pid == self.binding.browser.pid
             else x.executable.removeprefix(bundle + "/")}
            for x in self.owned.values()]
        self.sink(self.report)

    def check_report_only_continuity(self, row, seconds_without_progress):
        """Report observation gaps without stopping an operator-owned browser.

        Duration measures the observed gap, not an inferred missing sample count.
        Malformed/future timestamps remain invalid evidence in either policy.
        """
        if self.policy != "report-only":
            raise GuardFailure("continuity reporting requires report-only policy")
        stamp = dt.datetime.fromisoformat(row["utc"])
        now_utc = self.clock.utc()
        if stamp.tzinfo is None:
            raise GuardFailure("sampler timestamp lacks timezone")
        age = (dt.datetime.fromisoformat(now_utc) - stamp).total_seconds()
        if age < -1:
            raise GuardFailure("sampler timestamp is in the future")
        gap = seconds_without_progress > 2 or age > 2
        now = self.clock.monotonic()
        if gap and self.sample_gap_started is None:
            self.sample_gap_started = now
            self.report["sampleGapCount"] += 1
            self.report["sampleGapOpen"] = True
            self.report["lastSampleGap"] = {"observedStartUTC": now_utc,
                "lastCompleteSampleUTC": row["utc"], "recoveredUTC": None}
            self.write()
        elif not gap and self.sample_gap_started is not None:
            self.report["sampleGapObservedSeconds"] += max(0, now - self.sample_gap_started)
            self.sample_gap_started = None
            self.report["sampleGapOpen"] = False
            self.report["lastSampleGap"]["recoveredUTC"] = now_utc
            self.write()

    def matching(self, expected):
        actual = self.probe.inspect(expected.pid)
        if actual is not None and actual != expected:
            raise GuardFailure(f"refused reused/path-changed PID {expected.pid}")
        return actual

    def collect(self):
        root = self.binding.browser
        if self.matching(root) is None:
            return
        topology = self.probe.topology()
        if topology.get(root.pid, (None, None))[1] != self.uid:
            raise GuardFailure("browser UID is not this operator")
        # Bound live ownership, not all helpers ever seen during a long run.
        # Missing topology alone is insufficient: a live reparented helper
        # remains owned, and PID reuse/path changes still fail verification.
        # Keep the explicitly bound browser/map even if either exits.
        for pid, expected in list(self.owned.items()):
            if pid in (root.pid, self.binding.map_pid):
                continue
            if self.matching(expected) is None:
                del self.owned[pid]
                self.report["retiredExitedHelpers"] += 1
        candidates = []
        for pid, (parent, uid) in topology.items():
            if parent != root.pid:
                continue
            actual = self.probe.inspect(pid)
            if actual is None:
                continue
            if uid != self.uid or not helper_path(actual.executable, root.executable):
                raise GuardFailure(f"unverified direct child {pid}; not admitted to owned set")
            candidates.append(actual)
        # Do not admit a PID whose parent/UID or start/path changed after ps.
        after = self.probe.topology()
        for actual in candidates:
            pid = actual.pid
            current = self.probe.inspect(pid)
            # Auxiliary tabs/helpers can exit between the two inventory reads.
            # An absent child is never newly owned or signalled. The bound map,
            # live PID reuse and changed parent/UID/path still fail verification.
            if current is None and pid != self.binding.map_pid:
                self.report["exitedChildrenDuringQuery"] += 1
                continue
            if after.get(pid) != (root.pid, self.uid) or current != actual:
                raise GuardFailure(f"child identity/topology changed during query: {pid}")
            previous = self.owned.get(pid)
            if previous is not None and previous != actual:
                raise GuardFailure(f"owned PID reused: {pid}")
            if pid not in self.owned and len(self.owned) >= MAX_OWNED:
                raise GuardFailure("owned process bound exceeded")
            self.owned[pid] = actual
        if self.matching(root) is None:
            if self.policy == "report-only":
                # The observation loop handles browser exit independently of
                # sampling. A normal quit can occur between inventory reads;
                # retain remaining identities for cleanup, without claiming
                # every child exited or treating the race as a probe failure.
                self.report["browserExitsDuringQuery"] += 1
                return
            raise GuardFailure("browser exited during ownership query")

    def arm(self, row):
        b = self.binding
        bundle_path(b.browser.executable)
        if (not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", b.run_id)
                or not all(positive(x) for x in (b.browser.pid, b.browser.start, b.map_pid, b.map_start))
                or max(b.browser.pid, b.map_pid) > 2**31 - 1
                or max(b.browser.start, b.map_start) > 2**64 - 1
                or b.map_pid == b.browser.pid):
            raise GuardFailure("invalid explicit run binding")
        root = self.matching(b.browser)
        target = self.probe.inspect(b.map_pid)
        if root is None and target is None:
            self.done = True
            self.report.update(status="completed", reason="bound processes already exited",
                               completed=True, finishedUTC=self.clock.utc())
            self.write()
            return
        if (root is None or target is None or target.start != b.map_start
                or not helper_path(target.executable, b.browser.executable)
                or "Renderer" not in Path(target.executable).name):
            raise GuardFailure("map/browser live binding not verified")
        topology = self.probe.topology()
        if topology.get(b.map_pid) != (b.browser.pid, self.uid):
            raise GuardFailure("bound map is not a direct child of this browser/operator")
        sample_peak(row, b)
        self.owned = {root.pid: root, target.pid: target}
        self.collect()
        self.armed = True
        self.report.update(status="armed", armedUTC=self.clock.utc())
        self.write()

    def observe(self, row, *, discover=True):
        if self.done:
            return self.report
        if not self.armed:
            raise GuardFailure("guard is not armed")
        peak = sample_peak(row, self.binding)
        previous = self.report["maxObservedLifetimePeakPhysicalFootprintBytes"]
        self.report.update(maxObservedLifetimePeakPhysicalFootprintBytes=max(peak, previous or 0),
                           lastSampleUTC=row["utc"], samplesObserved=self.report["samplesObserved"] + 1)
        if peak > CAP_BYTES:
            self.report["overCap"] = True
            first_crossing = self.report["trigger"] is None
            if first_crossing:
                self.report["trigger"] = {"sampleUTC": row["utc"], "observedUTC": self.clock.utc(),
                                          "pid": self.binding.map_pid, "start": self.binding.map_start,
                                          "lifetimePeakPhysicalFootprintBytes": peak}
            self.report["status"] = "observing-over-cap" if self.policy == "report-only" else "triggered"
            if first_crossing:
                self.write()  # Durable first trigger precedes termination or continued observation.
            if self.policy == "terminate":
                return self.stop("map lifetime cap exceeded")
        if discover:
            try:
                self.collect()
            except subprocess.TimeoutExpired as error:
                # Inventory discovery is auxiliary in report-only mode. Keep
                # the verified sample and retry on the next observation; never
                # treat a missing inventory as proof of process exit/ownership.
                if self.policy != "report-only":
                    raise
                self.report["inventoryTimeouts"] += 1
                self.report["inventoryIncomplete"] = True
                self.report["lastInventoryTimeout"] = {
                    "observedUTC": self.clock.utc(), "sampleUTC": row["utc"],
                    "timeoutSeconds": error.timeout,
                }
            else:
                self.report["inventoryIncomplete"] = False
        if self.policy == "report-only":
            self.write()
        return self.report

    def remaining(self):
        remaining = []
        refused = {x["pid"] for x in self.report["refused"]}
        for item in self.owned.values():
            if item.pid in refused:
                continue
            try:
                if self.matching(item) is not None:
                    remaining.append(item)
            except Exception as error:  # noqa: BLE001 - an unverified probe must never be signalled.
                self.report["refused"].append({"pid": item.pid, "reason": str(error)[:200]})
        return remaining

    def send(self, item, sig):
        if self.policy == "report-only":
            raise GuardFailure("report-only policy forbids process signals")
        key = (item.pid, item.start, int(sig))
        if key in self.sent:
            return
        self.sent.add(key)
        try:
            if self.matching(item) is None:
                return
            self.probe.send(item.pid, sig)
            self.report["signals"].append({"pid": item.pid, "start": item.start,
                                           "signal": int(sig), "utc": self.clock.utc()})
        except ProcessLookupError:
            return
        except Exception as error:  # noqa: BLE001 - contain signal/probe failures in the stop receipt.
            self.report["refused"].append({"pid": item.pid, "reason": str(error)[:200]})

    def wait(self, seconds):
        deadline = self.clock.monotonic() + seconds
        while self.clock.monotonic() < deadline:
            if not self.remaining():
                return
            self.clock.sleep(min(0.05, max(0, deadline - self.clock.monotonic())))

    def stop(self, reason, *, failed=False):
        if self.done:
            return self.report
        if self.policy == "report-only":
            remaining = self.remaining()
            failed = failed or bool(self.report["refused"])
            self.done = True
            self.report.update(status="failed" if failed else "completed-over-cap" if self.report["overCap"] else "completed",
                               completed=not failed, reason=reason, finishedUTC=self.clock.utc(),
                               remainingPIDs=[x.pid for x in remaining])
            self.write()
            return self.report
        # Discover only while the original browser identity is still verified.
        try:
            self.collect()
        except Exception as error:  # noqa: BLE001 - still clean only the previously verified set.
            self.report["discoveryFailure"] = str(error)[:300]
            failed = True
        self.send(self.binding.browser, signal.SIGTERM)
        self.wait(0.75)
        for item in self.remaining():
            if item.pid != self.binding.browser.pid:
                self.send(item, signal.SIGTERM)
        self.wait(0.5)
        for item in self.remaining():
            self.send(item, signal.SIGKILL)
        self.wait(0.5)
        remaining = self.remaining()
        self.done = True
        self.report.update(status="failed" if failed or remaining or self.report["refused"]
                           else "stopped" if self.report["trigger"] else "completed",
                           completed=not (failed or remaining or self.report["refused"] or self.report["trigger"]),
                           reason=reason, finishedUTC=self.clock.utc(),
                           remainingPIDs=[x.pid for x in remaining])
        self.write()
        return self.report

    def fail(self, error):
        if self.armed and not self.done:
            return self.stop("guard failure: " + str(error)[:300], failed=True)
        self.done = True
        self.report.update(status="failed", reason=str(error)[:300], finishedUTC=self.clock.utc())
        self.write()
        return self.report


class SampleTail:
    def __init__(self, path):
        self.path = path
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
        self.file = os.fdopen(fd, "rb")
        info = os.fstat(self.file.fileno())
        if not stat.S_ISREG(info.st_mode):
            self.file.close()
            raise GuardFailure("sampler input is not a regular file")
        self.identity = (info.st_dev, info.st_ino)
        self.buffer = b""

    def poll(self):
        info = self.path.stat()
        if ((info.st_dev, info.st_ino) != self.identity or info.st_size < self.file.tell()
                or info.st_size > MAX_INPUT):
            raise GuardFailure("sampler input replaced/truncated/oversized")
        while chunk := self.file.read(MAX_LINE):
            self.buffer += chunk
            while b"\n" in self.buffer:
                line, self.buffer = self.buffer.split(b"\n", 1)
                if len(line) > MAX_LINE:
                    raise GuardFailure("sampler line bound exceeded")
                yield json.loads(line)
            if len(self.buffer) > MAX_LINE:
                raise GuardFailure("sampler partial line bound exceeded")


class Receipt:
    def __init__(self, path):
        self.path = path
        with path.open("x") as output:
            output.write('{"status":"initializing"}\n')

    def __call__(self, report):
        data = (json.dumps(report, separators=(",", ":")) + "\n").encode()
        if len(data) > MAX_RECEIPT:
            raise GuardFailure("receipt size bound exceeded")
        fd, name = tempfile.mkstemp(prefix=self.path.name + ".", suffix=".tmp", dir=self.path.parent)
        temporary = Path(name)
        try:
            with os.fdopen(fd, "wb") as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, self.path)
        finally:
            temporary.unlink(missing_ok=True)


def fresh(row):
    stamp = dt.datetime.fromisoformat(row["utc"])
    if stamp.tzinfo is None or not -1 <= (dt.datetime.now(dt.UTC) - stamp).total_seconds() <= 2:
        raise GuardFailure("sampler last complete row is stale/future")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--exclusive-browser", action="store_true", required=True,
                        help="operator attests this exact browser process is owned by this run only")
    parser.add_argument("--browser-pid", required=True, type=int)
    parser.add_argument("--browser-start", required=True, type=int)
    parser.add_argument("--browser-executable", required=True)
    parser.add_argument("--map-pid", required=True, type=int)
    parser.add_argument("--map-start", required=True, type=int)
    parser.add_argument("--sampler-script", required=True, type=Path)
    parser.add_argument("--samples", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    parser.add_argument("--duration", type=float, default=130, help="bounded watchdog lifetime, at most1800s")
    parser.add_argument("--policy", choices=("terminate", "report-only"), default="terminate",
                        help="terminate retains the original stop policy; report-only records cap failure without any process signals")
    args = parser.parse_args(argv)
    if not 0 < args.duration <= 1800:
        parser.error("duration must be in(0,1800]")
    try:
        receipt = Receipt(args.receipt)
    except OSError as error:
        print("guard refused receipt path: " + str(error)[:300], file=sys.stderr, flush=True)
        return 2
    binding = Binding(args.run_id, Identity(args.browser_pid, args.browser_start,
                                           os.path.realpath(args.browser_executable)),
                      args.map_pid, args.map_start)
    guard = None
    tail = None
    try:
        probe = MacProbe(args.sampler_script.resolve(strict=True))
        guard = Guard(binding, probe, sink=receipt, policy=args.policy)
        metadata_path = args.samples.with_suffix(".metadata.json")
        if metadata_path.stat().st_size > 8192:
            raise GuardFailure("sampler metadata size bound exceeded")
        metadata = json.loads(metadata_path.read_text())
        if (metadata.get("api") != API or metadata.get("browserPid") != binding.browser.pid
                or metadata.get("structureBytes") != 296):
            raise GuardFailure("original sampler metadata does not match binding/API")
        tail = SampleTail(args.samples)
        initial = list(tail.poll())
        if not initial:
            raise GuardFailure("no complete sampler baseline")
        if (probe.inspect(binding.browser.pid) is not None
                or probe.inspect(binding.map_pid) is not None):
            fresh(initial[-1])
        guard.arm(initial[-1])
        if not guard.done:
            print("native memory guard armed", flush=True)
            # Keep the first matching historical crossing too; lifetime is never reset.
            for row in initial:
                if any(x.get("pid") == binding.map_pid for x in row.get("processes", [])):
                    guard.observe(row, discover=False)
                    if guard.done:
                        break
        deadline = time.monotonic() + args.duration
        progress = time.monotonic()
        last_row = initial[-1]
        while not guard.done:
            saw_row = False
            for row in tail.poll():
                saw_row = True
                last_row = row
                # Natural menu quit is allowed; do not call missing rows belowcap.
                if not row.get("processes") and probe.inspect(binding.browser.pid) is None:
                    guard.stop("dedicated browser exited")
                else:
                    guard.observe(row)
                if guard.done:
                    break
                if args.policy != "report-only":
                    fresh(row)
            if saw_row:
                progress = time.monotonic()
            if not guard.done and guard.matching(binding.browser) is None:
                guard.stop("dedicated browser exited")
            if not guard.done:
                if args.policy == "report-only":
                    guard.check_report_only_continuity(last_row, time.monotonic() - progress)
                elif time.monotonic() - progress > 2:
                    raise GuardFailure("sampler stopped advancing or has an incomplete tail")
            if not guard.done and time.monotonic() >= deadline:
                if args.policy == "report-only":
                    guard.stop("bounded observation duration reached; browser remains operator-owned")
                else:
                    raise GuardFailure("watchdog deadline reached; cannot leave browser unguarded")
            if not guard.done:
                time.sleep(0.05)
    except Exception as error:  # noqa: BLE001 - unexpected watchdog errors must also stop its owned run.
        try:
            if guard is not None:
                guard.fail(error)
            else:
                receipt({"status": "failed", "run_id": args.run_id, "reason": str(error)[:300]})
        except Exception as receipt_error:  # noqa: BLE001 - report failed evidence storage without a traceback log.
            print("guard failure; receipt could not be saved: " + str(receipt_error)[:300],
                  file=sys.stderr, flush=True)
            return 2
    finally:
        if tail is not None:
            tail.file.close()
    status = guard.report["status"] if guard is not None else "failed"
    print("native memory guard: " + status, flush=True)
    return 1 if status in ("stopped", "completed-over-cap") else 0 if status == "completed" else 2


if __name__ == "__main__":
    raise SystemExit(main())
