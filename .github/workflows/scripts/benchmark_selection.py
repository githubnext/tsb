"""Select exact changed benchmark pairs without turning a PR into a full sweep."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys


SMOKE_PAIRS = ("join", "rolling_mean", "groupby_mean", "series_sum_mean")
MAX_PAIRS = 16
NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]*")
SHA = re.compile(r"[0-9a-f]{40}")
PAIR_PATH = re.compile(r"benchmarks/(?:tsb/bench_([A-Za-z0-9][A-Za-z0-9_-]*)\.ts|pandas/bench_([A-Za-z0-9][A-Za-z0-9_-]*)\.py)")
SMOKE_PATHS = {
    "benchmarks/runner.py", "benchmarks/run_benchmarks.sh",
    ".github/workflows/benchmark-verification.yml",
    ".github/workflows/scripts/benchmark_selection.py",
    ".github/workflows/scripts/test_benchmark_selection.py",
}
WASM_MANIFEST = "benchmarks/wasm-support.json"
WASM_PATHS = SMOKE_PATHS | {WASM_MANIFEST, "benchmarks/backend.ts", "benchmarks/kernel-workloads.ts",
                          "benchmarks/pandas/wasm_helpers.py"}
WASM_PREFIXES = ("benchmarks/helpers/", "rust/", "src/wasm/")


class IncompletePairError(ValueError):
    def __init__(self, names):
        self.names = sorted(names)
        super().__init__("changed benchmark pairs have only one implementation: " + ", ".join(self.names))


def benchmark_names(root: Path) -> tuple[set[str], set[str]]:
    ts = {path.stem[6:] for path in (root / "benchmarks/tsb").glob("bench_*.ts") if path.is_file()}
    py = {path.stem[6:] for path in (root / "benchmarks/pandas").glob("bench_*.py") if path.is_file()}
    return ({name for name in ts if NAME.fullmatch(name)}, {name for name in py if NAME.fullmatch(name)})


def paired_names(root: Path) -> set[str]:
    ts, py = benchmark_names(root)
    return ts & py


def registered_wasm_names(root: Path, available: set[str]) -> set[str]:
    """Require the explicit kernel registry instead of inferring support by name."""
    manifest = json.loads((root / WASM_MANIFEST).read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 1:
        raise ValueError("Wasm support manifest must use schema_version 1")
    entries = manifest.get("benchmarks")
    if not isinstance(entries, dict) or not entries:
        raise ValueError("Wasm support manifest must register at least one kernel benchmark")
    for name, entry in entries.items():
        if not NAME.fullmatch(name) or not isinstance(entry, dict) or entry.get("scope") != "kernel":
            raise ValueError("Wasm support manifest entries must be named kernel benchmarks")
        kernels = entry.get("kernels")
        if not isinstance(kernels, list) or not kernels or any(
            not isinstance(kernel, str) or not NAME.fullmatch(kernel) for kernel in kernels
        ):
            raise ValueError(f"Wasm benchmark {name} must identify its kernels")
    missing = entries.keys() - available
    if missing:
        raise ValueError("registered Wasm benchmarks do not have matched pairs: " + ", ".join(sorted(missing)))
    return set(entries)


def select_pairs(event: str, available: set[str], changed: list[str], requested: str,
                 present_names: set[str] | None = None, wasm_names: set[str] | None = None):
    registered = wasm_names or set()
    if event == "workflow_dispatch":
        names = requested.split(",")
        selected = {name.strip() for name in names}
        if any(not NAME.fullmatch(name) for name in selected):
            raise ValueError("pairs must be nonempty exact names separated by commas")
        reason, unmatched = "explicit_request", []
    elif event == "pull_request":
        changed_names = set()
        for path in changed:
            match = PAIR_PATH.fullmatch(path)
            if match:
                changed_names.add(match.group(1) or match.group(2))
        unmatched = sorted(changed_names - available)
        incomplete = set(unmatched) & (present_names if present_names is not None else available)
        if incomplete:
            raise IncompletePairError(incomplete)
        if SMOKE_PATHS.intersection(changed):
            # Smoke checks cover the runner contract without hiding any
            # individually changed pair in the same PR.
            selected = set(SMOKE_PAIRS) | (changed_names & available)
            reason = "runner_or_worker_smoke_and_changed_pairs"
        else:
            selected, reason = changed_names & available, "changed_matched_pairs"
        if WASM_PATHS.intersection(changed) or any(path.startswith(WASM_PREFIXES) for path in changed):
            selected |= registered
            if registered:
                reason += "_and_registered_wasm"
    else:
        raise ValueError("only pull_request or workflow_dispatch is supported")
    missing = selected - available
    if missing:
        raise ValueError("requested benchmark pairs do not exist on this candidate: " + ", ".join(sorted(missing)))
    if len(selected) > MAX_PAIRS:
        raise ValueError(f"{len(selected)} pairs exceed the {MAX_PAIRS}-pair tranche limit; split the PR or dispatch named tranches")
    wasm_pairs = sorted(selected & registered)
    return {"pairs": sorted(selected), "reason": reason, "removed_pairs": unmatched,
            "wasm_pairs": wasm_pairs, "needs_wasm": bool(wasm_pairs)}


def changed_paths(root: Path, base: str, head: str) -> list[str]:
    if not SHA.fullmatch(base) or not SHA.fullmatch(head):
        raise ValueError("PR base and head must be exact commit SHAs")
    result = subprocess.run(
        ["git", "diff", "--name-only", "-z", "--no-renames", f"{base}...{head}", "--"],
        cwd=root, check=True, capture_output=True, timeout=30,
    )
    # NUL-delimited paths preserve spaces/newlines; no path enters a shell.
    return [path.decode("utf-8") for path in result.stdout.split(b"\0") if path]


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    event = os.environ.get("EVENT_NAME", "")
    expected_head = os.environ.get("EXPECTED_HEAD_SHA", "")
    base = os.environ.get("BASE_SHA", "")
    report = {"event": event, "expected_head_sha": expected_head, "base_sha": base or None, "max_pairs": MAX_PAIRS}
    try:
        root = args.repo_root.resolve()
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, check=True,
                              capture_output=True, text=True, timeout=10).stdout.strip()
        if not SHA.fullmatch(expected_head) or head != expected_head:
            raise ValueError("checkout does not match the exact requested candidate SHA")
        report["head_sha"] = head
        paths = changed_paths(root, base, head) if event == "pull_request" else []
        ts, py = benchmark_names(root)
        registered = registered_wasm_names(root, ts & py)
        selection = select_pairs(event, ts & py, paths, os.environ.get("INPUT_PAIRS", ""), ts | py, registered)
        report.update(selection, head_sha=head, status="selected" if selection["pairs"] else "no_matched_changes")
        exit_code = 0
        print(f"{report['status']}: {','.join(selection['pairs']) or '(none)'} ({selection['reason']})")
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        report.update(status="selection_error", error=str(error), pairs=[], wasm_pairs=[], needs_wasm=False)
        if isinstance(error, IncompletePairError):
            report["incomplete_pairs"] = error.names
        exit_code = 1
        print("Benchmark selection failed: " + str(error), file=sys.stderr)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write("should_run=" + str(exit_code == 0 and bool(report["pairs"])).lower() + "\n")
            handle.write("pairs=" + ",".join(report["pairs"]) + "\n")
            handle.write("needs_wasm=" + str(exit_code == 0 and report["needs_wasm"]).lower() + "\n")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
