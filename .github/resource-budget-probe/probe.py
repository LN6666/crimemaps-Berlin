"""Bounded diagnosis of the FIRST partition of the real resource budget npm suite."""
import argparse
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import time

TOOLS = Path(__file__).resolve().parent


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def records(path):
    if not path.exists():
        return []
    result = []
    for line in path.read_text(errors="replace").splitlines():
        try:
            result.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return result


def stop_group(process):
    if process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait(timeout=2)
    except ProcessLookupError:
        pass


def low_memory():
    info = Path("/proc/meminfo")
    if not info.is_file():
        return False
    mem = {line.split(":")[0]: int(line.split()[1]) for line in info.read_text().splitlines() if ":" in line}
    return mem["MemAvailable"] < max(512 * 1024, mem["MemTotal"] // 10)


def run_file(web, name, out, seconds):
    target = out / Path(name).stem
    target.mkdir()
    events, worker = target / "events.jsonl", target / "worker.jsonl"
    # Use the checked-in launcher. Its Node flags, isolation and real test
    # remain exactly those of the normal npm script. The two reporters expose
    # normal TAP and the lower-level queue for this diagnostic only.
    options = ["--trace-sigint", "--import=" + (TOOLS / "worker.mjs").as_uri(),
               "--test-reporter=tap", "--test-reporter=" + (TOOLS / "events.mjs").as_uri(),
               "--test-reporter-destination=stdout", "--test-reporter-destination=" + str(events)]
    env = {**os.environ, "NODE_OPTIONS": shlex.join(options), "CRIMEMAPS_PROBE_PROCESS_LOG": str(worker)}
    env.pop("GITHUB_STEP_SUMMARY", None)
    start = time.monotonic()
    result = {"file": name, "startedUTC": utc(), "diagnosticLimitSeconds": seconds}
    with (target / "run.tap").open("wb") as log:
        process = subprocess.Popen(["node", "tests/support/run-resource-budget.mjs", name, "--timings"],
            cwd=web, stdout=log, stderr=subprocess.STDOUT, env=env, start_new_session=True)
        reason = None
        try:
            while process.poll() is None:
                if low_memory():
                    reason = "diagnostic-host-memory-reserve"
                elif time.monotonic() - start >= seconds:
                    reason = "diagnostic-file-time-bound"
                if reason:
                    # Interrupt the specific test worker first, so V8 can print
                    # the JS stack that was running. Raw environment is never exported.
                    rows = records(worker)
                    if rows:
                        try:
                            os.kill(rows[-1]["pid"], signal.SIGINT)
                        except ProcessLookupError:
                            pass
                    try:
                        process.wait(timeout=0.8)
                    except subprocess.TimeoutExpired:
                        pass
                    break
                time.sleep(.15)
        finally:
            stop_group(process)
    rows = records(events)
    failures = [r for r in rows if r["type"] == "test:fail"]
    started = [r for r in rows if r["type"] in ("test:dequeue", "test:start")]
    result.update(exitCode=process.returncode, elapsedSeconds=round(time.monotonic()-start, 3), endedUTC=utc(),
        outcome=reason or ("passed" if process.returncode == 0 else "failed"),
        lastStarted=started[-1] if started else None,
        lastCompleted=next((r for r in reversed(rows) if r["type"] in ("test:pass","test:fail")), None),
        failures=failures[:8], workerSamples=records(worker)[-2:])
    (target / "result.json").write_text(json.dumps(result, indent=2) + "\n")
    print(result["outcome"], name, result["elapsedSeconds"], flush=True)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--web", type=Path, default=Path("web"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--count", type=int, required=True)
    parser.add_argument("--seconds", type=float, default=30)
    opt = parser.parse_args()
    web = opt.web.resolve()
    out = opt.out.resolve()
    out.mkdir(parents=True)
    command = shlex.split(json.loads((web / "package.json").read_text())["scripts"]["test:resource-budget"])
    if command[:2] != ["node", "tests/support/run-resource-budget.mjs"]:
        raise ValueError("Unexpected npm suite command")
    files = sorted(command[2:])
    if len(files) != 123 or len(set(files)) != 123 or not all((web/f).is_file() for f in files):
        raise ValueError("Expected all 123 registered test files")
    if not 0 <= opt.start < opt.start + opt.count <= len(files)//4:
        raise ValueError("Choose files within the first official budget partition")
    selected = files[opt.start:opt.start + opt.count]
    (out / "manifest.json").write_text(json.dumps({"started": utc(), "selected": selected,
        "diagnosticOnly": True, "maxWorkers": 2}, indent=2) + "\n")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda name: run_file(web, name, out, opt.seconds), selected))
    (out / "summary.json").write_text(json.dumps(results, indent=2) + "\n")
    return int(any(row["outcome"] != "passed" for row in results))


if __name__ == "__main__":
    raise SystemExit(main())
