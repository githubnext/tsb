#!/usr/bin/env python3
"""Three-backend benchmark collection with explicit support and execution evidence."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import hashlib
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time


SIDES = ("tsb", "pandas", "rust_wasm")
NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]*")
OUTPUT_RTOL = 1e-9
OUTPUT_ATOL = 1e-8
EXACT_OUTPUT_KERNELS = {"searchsorted_f64", "searchsorted_str", "searchsorted_many_f64", "searchsorted_many_str",
                        "argsort_f64", "argsort_str", "nat_compare", "nat_argsort"}


def wasm_support(root, universe):
    """Only explicitly registered workloads may claim Rust/Wasm measurements."""
    path = root / "benchmarks" / "wasm-support.json"
    if not path.exists():
        return {}
    try:
        manifest = json.loads(path.read_text())
    except (OSError, ValueError) as error:
        raise ValueError(f"invalid Wasm support manifest: {error}") from error
    entries = manifest.get("benchmarks") if isinstance(manifest, dict) else None
    if not isinstance(entries, dict) or type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 1:
        raise ValueError("Wasm support manifest must use schema_version 1 and a benchmarks object")
    for name, entry in entries.items():
        if not NAME.fullmatch(name) or name not in universe or not isinstance(entry, dict):
            raise ValueError(f"unknown or invalid Wasm benchmark registration: {name}")
        kernels = entry.get("kernels")
        if (entry.get("scope") != "kernel" or not isinstance(kernels, list) or not kernels
                or any(not isinstance(kernel, str) or not NAME.fullmatch(kernel) for kernel in kernels)
                or len(kernels) != len(set(kernels))):
            raise ValueError(f"Wasm benchmark {name} must declare kernel scope and unique required kernels")
    return entries


def binary_digest(root):
    try:
        return hashlib.sha256((root / "rust" / "pkg" / "tsb_wasm_bg.wasm").read_bytes()).hexdigest()
    except OSError:
        return None


def command_output(command, cwd):
    try:
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=10)
        return result.stdout.strip() if result.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired, UnicodeError):
        return None


def provenance(root, ts_runner, python_runner, workers, timeout):
    sha = command_output(["git", "rev-parse", "HEAD"], root)
    sha_source = "git"
    if not sha or not re.fullmatch(r"[0-9a-f]{40,64}", sha):
        sha, sha_source = os.environ.get("GITHUB_SHA"), "GITHUB_SHA"
        if not sha or not re.fullmatch(r"[0-9a-f]{40,64}", sha):
            sha = None
    dirty = command_output(["git", "status", "--porcelain"], root)
    versions = command_output([
        python_runner, "-c",
        "import json,platform,pandas,numpy; print(json.dumps({'python':platform.python_version(),"
        "'pandas':pandas.__version__,'numpy':numpy.__version__}))",
    ], root)
    try:
        python_versions = json.loads(versions) if versions else None
    except (ValueError, TypeError):
        python_versions = None
    return {
        "candidate_sha": sha,
        "sha_source": sha_source if sha else None,
        "working_tree_dirty": bool(dirty) if dirty is not None else None,
        "typescript_runner": ts_runner,
        "typescript_version": command_output([ts_runner, "--version"], root),
        "python_runner": python_runner,
        "python_libraries": python_versions,
        "workers": workers,
        "timeout_seconds": timeout,
    }


def contains_non_finite(value):
    if isinstance(value, (int, float)):
        try:
            return not math.isfinite(value)
        except OverflowError:
            return True
    if isinstance(value, dict):
        return any(contains_non_finite(item) for item in value.values())
    if isinstance(value, list):
        return any(contains_non_finite(item) for item in value)
    return False


def run_side(command, root, timeout, backend=None):
    start = time.monotonic()
    try:
        environment = dict(os.environ)
        # Never let a caller's ambient backend choice turn the TS baseline into Wasm.
        environment.pop("TSB_BENCHMARK_BACKEND", None)
        if backend is not None:
            environment["TSB_BENCHMARK_BACKEND"] = backend
        process = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=timeout, env=environment)
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "reason": f"exceeded {timeout:g}s"}, None
    except OSError as error:
        return {"status": "error", "reason": str(error)[:1000]}, None
    except UnicodeError:
        return {"status": "malformed", "reason": "output is not valid text"}, None
    outcome = {"exit_code": process.returncode, "elapsed_ms": round((time.monotonic() - start) * 1000, 3)}
    if process.returncode:
        return {**outcome, "status": "error", "reason": process.stderr.strip()[-1000:] or "non-zero exit"}, None
    try:
        result = json.loads(process.stdout)
    except (ValueError, TypeError, RecursionError):
        return {**outcome, "status": "malformed", "reason": "stdout is not one JSON result"}, None
    if contains_non_finite(result):
        return {**outcome, "status": "non_finite", "reason": "result contains NaN or infinity"}, None
    mean = result.get("mean_ms") if isinstance(result, dict) else None
    if isinstance(mean, bool) or not isinstance(mean, (int, float)) or mean < 0:
        return {**outcome, "status": "malformed", "reason": "mean_ms must be a positive number"}, None
    if mean == 0:
        return {**outcome, "status": "unresolvable", "reason": "zero mean_ms is below timer resolution, not a speedup"}, None
    return {**outcome, "status": "success"}, result


def validate_execution(name, side, outcome, result, registration, digest):
    """Reject loaded-only/fallback receipts and retain no unverified timing."""
    if outcome["status"] != "success" or registration is None:
        return outcome, result
    expected_backend = "rust-wasm" if side == "rust_wasm" else "typescript"
    reason = None
    if result.get("function") != name:
        reason = "result does not identify the registered workload"
    elif (result.get("scope") != "kernel" or not isinstance(result.get("fixture"), str)
          or not 0 < len(result["fixture"]) <= 500 or type(result.get("warmup")) is not int
          or not 0 <= result["warmup"] <= 1_000_000):
        reason = "registered benchmark omitted its kernel fixture or warm-up contract"
    elif (isinstance(result.get("iterations"), bool) or not isinstance(result.get("iterations"), int)
          or not 0 < result["iterations"] <= 1_000_000):
        reason = "registered benchmark must report a bounded positive measured iteration count"
    elif (isinstance(result.get("total_ms"), bool) or not isinstance(result.get("total_ms"), (int, float))
          or result["total_ms"] <= 0
          or not math.isclose(float(result["mean_ms"]) * result["iterations"], result["total_ms"], rel_tol=1e-6, abs_tol=1e-6)):
        reason = "registered benchmark mean/iterations/total timings are inconsistent"
    elif side != "pandas" and result.get("backend") != expected_backend:
        reason = f"benchmark did not execute the required {expected_backend} backend"
    elif side == "rust_wasm":
        receipt = result.get("wasm")
        calls = receipt.get("kernel_calls") if isinstance(receipt, dict) else None
        if (not digest or not isinstance(receipt, dict) or receipt.get("binary_sha256") != digest):
            reason = "Wasm receipt does not match the measured binary"
        elif (not isinstance(calls, dict) or set(calls) != set(registration["kernels"])
              or any(isinstance(count, bool) or not isinstance(count, int) or count != result["iterations"] for count in calls.values())):
            reason = "required Wasm kernels were not all observed executing"
    elif side == "tsb" and result.get("wasm") is not None:
        reason = "TypeScript baseline must not report Wasm execution"
    if reason:
        return {**outcome, "status": "unverified", "reason": reason}, None
    if side == "rust_wasm":
        result = {**result, "wasm": {key: result["wasm"][key] for key in ("binary_sha256", "kernel_calls")}}
    return outcome, result


def output_difference(expected, actual, path="outputs", depth=0, exact_numbers=False):
    """Compare bounded numeric kernel fixtures; identities/order/shape stay exact."""
    if depth > 32:
        return f"{path}: output nesting exceeds the verification limit"
    if isinstance(expected, dict) and isinstance(actual, dict):
        if expected.keys() != actual.keys():
            return f"{path}: output keys differ"
        for key in expected:
            error = output_difference(expected[key], actual[key], f"{path}.{key}", depth + 1,
                                      exact_numbers or (depth == 0 and key in EXACT_OUTPUT_KERNELS))
            if error:
                return error
        return None
    if isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            return f"{path}: output lengths differ"
        for index, (left, right) in enumerate(zip(expected, actual)):
            error = output_difference(left, right, f"{path}[{index}]", depth + 1, exact_numbers)
            if error:
                return error
        return None
    if isinstance(expected, bool) or isinstance(actual, bool):
        equal = type(expected) is type(actual) and expected == actual
    elif isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        equal = expected == actual if exact_numbers or (isinstance(expected, int) and isinstance(actual, int)) else math.isclose(
            expected, actual, rel_tol=OUTPUT_RTOL, abs_tol=OUTPUT_ATOL,
        )
    else:
        equal = type(expected) is type(actual) and expected == actual
    return None if equal else f"{path}: output values differ"


def validate_outputs(outcomes, values, registration):
    """Do not let a timing win hide wrong outputs on the measured fixture."""
    for side in SIDES:
        if values[side] is None:
            continue
        proof = values[side].get("verification")
        if (not isinstance(proof, dict) or type(proof.get("schema_version")) is not int or proof["schema_version"] != 1
                or not isinstance(proof.get("outputs"), dict) or set(proof["outputs"]) != set(registration["kernels"])):
            outcomes[side] = {**outcomes[side], "status": "unverified", "reason": "registered workload omitted fixture output verification"}
            values[side] = None
    if values["pandas"] is not None:
        reference = values["pandas"]["verification"]["outputs"]
        for side in ("tsb", "rust_wasm"):
            if values[side] is None:
                continue
            if any(values[side].get(key) != values["pandas"].get(key) for key in ("fixture", "warmup", "iterations")):
                outcomes[side] = {**outcomes[side], "status": "unverified", "reason": "fixture, warm-up or measured iteration counts differ from the Python reference"}
                values[side] = None
                continue
            difference = output_difference(reference, values[side]["verification"]["outputs"])
            if difference:
                outcomes[side] = {**outcomes[side], "status": "incorrect", "reason": difference[:1000]}
                values[side] = None
    else:
        for side in ("tsb", "rust_wasm"):
            if values[side] is not None:
                outcomes[side] = {**outcomes[side], "status": "unverified", "reason": "Python reference outputs are unavailable; the comparison cannot be verified"}
                values[side] = None
    complete = all(values[side] is not None for side in SIDES)
    for side in SIDES:
        if values[side] is not None:
            # Full outputs are an evaluation input, not a large published timing payload.
            values[side] = {key: value for key, value in values[side].items() if key != "verification"}
    return {"status": "matched" if complete else "incomplete", "reference": "pandas",
            "relative_tolerance": OUTPUT_RTOL, "absolute_tolerance": OUTPUT_ATOL,
            "scope": "Measured fixture only; not general API parity."}


def run_pair(name, root, ts_runner, python_runner, timeout, registration=None, digest=None):
    outcomes, values = {}, {}
    for side, runner, directory, extension in (
        ("tsb", ts_runner, "tsb", "ts"), ("pandas", python_runner, "pandas", "py"),
    ):
        outcomes[side], values[side] = run_side(
            [runner, str(root / "benchmarks" / directory / f"bench_{name}.{extension}")],
            root, timeout, "typescript" if side == "tsb" else None,
        )
        outcomes[side], values[side] = validate_execution(name, side, outcomes[side], values[side], registration, digest)
    if registration is None:
        outcomes["rust_wasm"], values["rust_wasm"] = {
            "status": "unsupported", "reason": "No Rust/Wasm benchmark implementation is registered for this workload.",
        }, None
    else:
        outcomes["rust_wasm"], values["rust_wasm"] = run_side(
            [ts_runner, str(root / "benchmarks" / "tsb" / f"bench_{name}.ts")], root, timeout, "rust-wasm",
        )
        outcomes["rust_wasm"], values["rust_wasm"] = validate_execution(
            name, "rust_wasm", outcomes["rust_wasm"], values["rust_wasm"], registration, digest,
        )
        if outcomes["rust_wasm"]["status"] == "success" and binary_digest(root) != digest:
            outcomes["rust_wasm"], values["rust_wasm"] = {
                **outcomes["rust_wasm"], "status": "unverified", "reason": "Wasm binary changed during measurement",
            }, None
    verification = validate_outputs(outcomes, values, registration) if registration else {"status": "not_available"}
    comparison = {"function": name, "scope": "kernel" if registration else "api", "output_verification": verification}
    if registration and values["pandas"] is not None:
        comparison["fixture"] = values["pandas"]["fixture"]
        comparison["warmup"] = values["pandas"]["warmup"]
    for side in SIDES:
        comparison[side] = dict(outcomes[side])
        if values[side] is not None:
            comparison[side].update({key: values[side][key] for key in ("mean_ms", "iterations", "total_ms") if key in values[side]})
            if side == "rust_wasm":
                comparison[side].update({key: values[side]["wasm"][key] for key in ("binary_sha256", "kernel_calls")})
    legacy = None
    ratio_error = None
    if values["tsb"] is not None and values["pandas"] is not None:
        try:
            ratio = values["tsb"]["mean_ms"] / values["pandas"]["mean_ms"]
            finite = math.isfinite(ratio)
        except OverflowError:
            finite = False
        if not finite:
            ratio_error = {"status": "non_finite", "reason": "timing ratio is not finite"}
        elif ratio == 0:
            ratio_error = {"status": "unresolvable", "reason": "timing ratio underflowed to zero"}
        else:
            legacy = {"function": name, "tsb": values["tsb"], "pandas": values["pandas"], "ratio": ratio}
    failed = [side for side in SIDES if outcomes[side]["status"] not in ("success", "unsupported")]
    outcome = {"function": name, "status": outcomes[failed[0]]["status"] if failed else "success", **outcomes}
    if failed:
        outcome["failed_sides"] = failed
    if ratio_error:
        outcome.update(ratio_error)
    return outcome, legacy, comparison


def collect(root, ts_runner, python_runner, workers, timeout, selected_names):
    ts_names = {path.stem[6:] for path in (root / "benchmarks" / "tsb").glob("bench_*.ts")}
    py_names = {path.stem[6:] for path in (root / "benchmarks" / "pandas").glob("bench_*.py")}
    universe = sorted(ts_names & py_names)
    if not universe:
        raise ValueError("no matched benchmark pairs discovered")
    requested = {name.strip() for name in selected_names.split(",")} if selected_names else set(universe)
    if "" in requested or requested - set(universe):
        raise ValueError(f"unknown or empty BENCHMARK_FILTER selections: {sorted(requested - set(universe))}")
    selected = sorted(requested)
    support = wasm_support(root, universe)
    digest = binary_digest(root) if requested.intersection(support) else None
    metadata = provenance(root, ts_runner, python_runner, workers, timeout)
    metadata["wasm"] = {
        "host": "Bun/Node", "binary_sha256": digest,
        "rustc_version": command_output(["rustc", "--version"], root) if digest else None,
        "wasm_pack_version": command_output(["wasm-pack", "--version"], root) if digest else None,
        "measurement_boundary": "Explicit kernel wrappers, including input/output conversion; module loading is outside timing.",
    }
    with ThreadPoolExecutor(max_workers=workers) as pool:
        pairs = list(pool.map(lambda name: run_pair(name, root, ts_runner, python_runner, timeout, support.get(name), digest), selected))
    by_name = {outcome["function"]: outcome for outcome, _, _ in pairs}
    outcomes = [by_name.get(name, {"function": name, "status": "not_selected"}) for name in universe]
    by_comparison = {comparison["function"]: comparison for _, _, comparison in pairs}
    comparisons = [by_comparison.get(name, {
        "function": name, "scope": "kernel" if name in support else "api",
        **{side: {"status": "not_selected"} for side in SIDES},
    }) for name in universe]
    backend_summary = {side: {"success": 0, "failed": 0, "unsupported": 0, "not_selected": 0} for side in SIDES}
    for comparison in comparisons:
        for side in SIDES:
            status = comparison[side]["status"]
            backend_summary[side][status if status in ("success", "unsupported", "not_selected") else "failed"] += 1
    benchmarks = [result for _, result, _ in pairs if result is not None]
    failures = [outcome for outcome, _, _ in pairs if outcome["status"] != "success"]
    counts = {}
    for outcome in failures:
        counts[outcome["status"]] = counts.get(outcome["status"], 0) + 1
    return {
        "schema_version": 3,
        "benchmarks": benchmarks,
        "comparisons": comparisons,
        "backend_summary": backend_summary,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "incomplete" if failures else "complete",
        "scope": {
            "kind": "filtered" if selected_names else "all",
            "discovered_pairs": len(universe), "selected_pairs": selected,
            "unselected_pairs": len(universe) - len(selected),
            "unpaired_typescript": sorted(ts_names - py_names), "unpaired_pandas": sorted(py_names - ts_names),
        },
        "summary": {"total": len(selected), "completed": len(selected) - len(failures), "failed": len(failures), "failure_counts": counts},
        "provenance": metadata,
        "outcomes": outcomes,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--ts-runner", required=True)
    parser.add_argument("--python-runner", default=sys.executable)
    parser.add_argument("--workers", type=int, default=os.environ.get("BENCHMARK_WORKERS", "8"))
    parser.add_argument("--timeout", type=float, default=os.environ.get("BENCHMARK_TIMEOUT", "30"))
    parser.add_argument("--filter", default=os.environ.get("BENCHMARK_FILTER", ""))
    parser.add_argument("--strict", action="store_true", default=os.environ.get("BENCHMARK_STRICT", "").lower() in ("1", "true", "yes"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    if args.workers < 1 or not math.isfinite(args.timeout) or args.timeout <= 0:
        parser.error("workers and timeout must be positive finite values")
    try:
        report = collect(args.repo_root.resolve(), args.ts_runner, args.python_runner, args.workers, args.timeout, args.filter)
    except ValueError as error:
        parser.error(str(error))
    output = args.output or args.repo_root / "benchmarks" / "results.json"
    with tempfile.NamedTemporaryFile(mode="w", dir=output.parent, delete=False) as temporary:
        json.dump(report, temporary, indent=2, allow_nan=False)
        temporary.write("\n")
    os.replace(temporary.name, output)
    summary = report["summary"]
    message = f"{report['status'].upper()}: {summary['completed']}/{summary['total']} selected pairs completed; {summary['failed']} failed ({report['scope']['kind']} scope)."
    print(message)
    print(f"Report: {output}")
    if report["status"] == "incomplete":
        print("WARNING: failed, timed-out, or invalid benchmarks remain; this is not a complete performance result.", file=sys.stderr)
        return 1 if args.strict else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
