"""A benchmark change must select bounded, exact pairs on the actual PR head."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import benchmark_selection as selection


class BenchmarkSelectionTest(unittest.TestCase):
    def test_exact_changed_pairs_are_deduplicated_not_the_whole_corpus(self):
        result = selection.select_pairs("pull_request", {"join", "join_outer", "rolling_mean"}, [
            "benchmarks/tsb/bench_join.ts", "benchmarks/pandas/bench_join.py", "src/join.ts",
        ], "")
        self.assertEqual(result["pairs"], ["join"])

    def test_lookalike_and_injected_paths_are_not_pair_names(self):
        result = selection.select_pairs("pull_request", {"join"}, [
            "nested/benchmarks/tsb/bench_join.ts", "benchmarks/tsb/bench_join.ts\nother",
            "benchmarks/tsb/../bench_join.ts", "benchmarks/tsb/bench_join.ts; echo unsafe",
            "benchmarks/tsb/bench_join.ts.bak",
        ], "")
        self.assertEqual(result["pairs"], [])

    def test_runner_or_worker_edits_include_smoke_and_every_changed_pair(self):
        available = set(selection.SMOKE_PAIRS) | {"other", "unchanged"}
        for path in selection.SMOKE_PATHS:
            with self.subTest(path=path):
                result = selection.select_pairs("pull_request", available, [path, "benchmarks/tsb/bench_other.ts"], "")
                self.assertEqual(result["pairs"], sorted(set(selection.SMOKE_PAIRS) | {"other"}))
                self.assertEqual(result["reason"], "runner_or_worker_smoke_and_changed_pairs")

    def test_runner_only_edits_still_select_just_fixed_smoke(self):
        available = set(selection.SMOKE_PAIRS) | {"unchanged"}
        result = selection.select_pairs("pull_request", available, ["benchmarks/runner.py"], "")
        self.assertEqual(result["pairs"], sorted(selection.SMOKE_PAIRS))

    def test_shared_inputs_include_every_registered_wasm_kernel(self):
        registered = {"wasm_sum", "wasm_rolling"}
        available = set(selection.SMOKE_PAIRS) | registered | {"unrelated"}
        paths = selection.WASM_PATHS | {
            "rust/src/lib.rs", "rust/Cargo.lock", "src/wasm/loader.ts", "benchmarks/helpers/input.ts",
        }
        for path in paths:
            with self.subTest(path=path):
                result = selection.select_pairs("pull_request", available, [path], "", wasm_names=registered)
                expected = registered | (set(selection.SMOKE_PAIRS) if path in selection.SMOKE_PATHS else set())
                self.assertEqual(result["pairs"], sorted(expected))
                self.assertEqual(result["wasm_pairs"], sorted(registered))
                self.assertTrue(result["needs_wasm"])

    def test_only_selected_registered_kernels_require_a_build(self):
        available = {"join", "wasm_sum", "wasm_named_but_unsupported"}
        for name in available:
            for event in ("workflow_dispatch", "pull_request"):
                with self.subTest(name=name, event=event):
                    result = selection.select_pairs(event, available, [f"benchmarks/tsb/bench_{name}.ts"], name,
                                                    wasm_names={"wasm_sum"})
                    self.assertEqual(result["pairs"], [name])
                    self.assertEqual(result["needs_wasm"], name == "wasm_sum")
        result = selection.select_pairs("pull_request", available, ["nested/rust/src/lib.rs", "rusty/file.ts"], "",
                                        wasm_names={"wasm_sum"})
        self.assertFalse(result["needs_wasm"])

    def test_registered_kernel_union_stays_bounded_without_sampling(self):
        registered = {f"wasm_{index}" for index in range(selection.MAX_PAIRS - len(selection.SMOKE_PAIRS))}
        available = registered | set(selection.SMOKE_PAIRS) | {"extra"}
        result = selection.select_pairs("pull_request", available, ["benchmarks/runner.py"], "", wasm_names=registered)
        self.assertEqual(len(result["pairs"]), selection.MAX_PAIRS)
        with self.assertRaisesRegex(ValueError, "tranche limit"):
            selection.select_pairs("pull_request", available,
                                   ["benchmarks/runner.py", "benchmarks/tsb/bench_extra.ts"], "", wasm_names=registered)

    def test_registry_is_explicit_validated_and_requires_matched_pairs(self):
        valid = {"schema_version": 1, "benchmarks": {"wasm_sum": {"scope": "kernel", "kernels": ["sum"]}}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / selection.WASM_MANIFEST
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps(valid))
            self.assertEqual(selection.registered_wasm_names(root, {"wasm_sum"}), {"wasm_sum"})
            with self.assertRaisesRegex(ValueError, "matched pairs"):
                selection.registered_wasm_names(root, set())
            invalid = [[], {"schema_version": True}, {"schema_version": 2},
                       {"schema_version": 1, "benchmarks": {}},
                       {"schema_version": 1, "benchmarks": {"wasm_sum": []}},
                       {"schema_version": 1, "benchmarks": {"../sum": {"scope": "kernel", "kernels": ["sum"]}}},
                       {"schema_version": 1, "benchmarks": {"wasm_sum": {"scope": "api", "kernels": ["sum"]}}}]
            invalid += [{"schema_version": 1, "benchmarks": {"wasm_sum": {"scope": "kernel", "kernels": kernels}}}
                        for kernels in (None, [], "sum", [0], ["../sum"])]
            for value in invalid:
                with self.subTest(value=value), self.assertRaises(ValueError):
                    manifest.write_text(json.dumps(value))
                    selection.registered_wasm_names(root, {"wasm_sum"})

    def test_smoke_and_changed_pair_union_remains_bounded(self):
        changed = {f"pair{index}" for index in range(selection.MAX_PAIRS - len(selection.SMOKE_PAIRS) + 1)}
        available = set(selection.SMOKE_PAIRS) | changed
        paths = ["benchmarks/runner.py"] + [f"benchmarks/tsb/bench_{name}.ts" for name in changed]
        with self.assertRaisesRegex(ValueError, "tranche limit"):
            selection.select_pairs("pull_request", available, paths, "")

    def test_both_deleted_sides_are_explicit_not_fabricated_results(self):
        result = selection.select_pairs("pull_request", {"join"}, ["benchmarks/tsb/bench_removed.ts"], "")
        self.assertEqual(result["pairs"], [])
        self.assertEqual(result["removed_pairs"], ["removed"])

    def test_one_remaining_side_fails_for_additions_deletions_and_mixed_smoke(self):
        for changed in (
            ["benchmarks/tsb/bench_incomplete.ts"],
            ["benchmarks/pandas/bench_incomplete.py"],
            ["benchmarks/runner.py", "benchmarks/tsb/bench_incomplete.ts"],
        ):
            with self.subTest(changed=changed), self.assertRaises(selection.IncompletePairError) as caught:
                selection.select_pairs("pull_request", set(selection.SMOKE_PAIRS), changed, "",
                                       set(selection.SMOKE_PAIRS) | {"incomplete"})
            self.assertEqual(caught.exception.names, ["incomplete"])

    def test_manual_input_validates_names_and_deduplicates(self):
        result = selection.select_pairs("workflow_dispatch", {"join", "rolling_mean"}, [], " join,rolling_mean,join ")
        self.assertEqual(result["pairs"], ["join", "rolling_mean"])
        for value in ("", "join,", "join,missing", "join; echo unsafe", "$(secret)", "../join", "join\nother"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                selection.select_pairs("workflow_dispatch", {"join"}, [], value)

    def test_large_change_or_manual_request_fails_without_silent_sampling(self):
        names = {f"pair{index}" for index in range(selection.MAX_PAIRS + 1)}
        with self.assertRaisesRegex(ValueError, "tranche limit"):
            selection.select_pairs("pull_request", names, [f"benchmarks/tsb/bench_{name}.ts" for name in names], "")
        with self.assertRaisesRegex(ValueError, "tranche limit"):
            selection.select_pairs("workflow_dispatch", names, [], ",".join(names))

    def test_missing_smoke_pair_fails_visibly(self):
        with self.assertRaisesRegex(ValueError, "do not exist"):
            selection.select_pairs("pull_request", {"join"}, ["benchmarks/runner.py"], "")

    def test_diff_is_nul_delimited_and_passes_validated_shas_as_arguments(self):
        with patch.object(selection.subprocess, "run", return_value=subprocess.CompletedProcess(
            [], 0, stdout=b"benchmarks/tsb/bench_join.ts\0a path with\na newline\0"
        )) as run:
            paths = selection.changed_paths(Path("."), "a" * 40, "b" * 40)
        self.assertEqual(paths, ["benchmarks/tsb/bench_join.ts", "a path with\na newline"])
        self.assertEqual(run.call_args.args[0], ["git", "diff", "--name-only", "-z", "--no-renames", "a" * 40 + "..." + "b" * 40, "--"])
        with self.assertRaises(ValueError):
            selection.changed_paths(Path("."), "--output=unsafe", "b" * 40)

    def test_pair_discovery_requires_both_sides(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path in ("tsb/bench_join.ts", "pandas/bench_join.py", "tsb/bench_unpaired.ts"):
                target = root / "benchmarks" / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.touch()
            self.assertEqual(selection.paired_names(root), {"join"})

    def test_wrong_checkout_fails_and_preserves_error_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "selection.json"
            with patch.dict(selection.os.environ, {"EVENT_NAME": "workflow_dispatch", "EXPECTED_HEAD_SHA": "a" * 40}), \
                    patch.object(selection.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, stdout="b" * 40)):
                self.assertEqual(selection.main(["--output", str(output)]), 1)
            report = json.loads(output.read_text())
            self.assertEqual(report["status"], "selection_error")
            self.assertEqual(report["expected_head_sha"], "a" * 40)

    def test_incomplete_pair_failure_preserves_names_and_actual_sha(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "selection.json"
            with patch.dict(selection.os.environ, {"EVENT_NAME": "pull_request", "EXPECTED_HEAD_SHA": "a" * 40}), \
                    patch.object(selection.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, stdout="a" * 40)), \
                    patch.object(selection, "changed_paths", return_value=["benchmarks/tsb/bench_incomplete.ts"]), \
                    patch.object(selection, "benchmark_names", return_value=({"incomplete"}, set())), \
                    patch.object(selection, "registered_wasm_names", return_value=set()):
                self.assertEqual(selection.main(["--output", str(output)]), 1)
            report = json.loads(output.read_text())
            self.assertEqual(report["status"], "selection_error")
            self.assertEqual(report["incomplete_pairs"], ["incomplete"])
            self.assertEqual(report["head_sha"], "a" * 40)

    def test_selection_outputs_build_flag_for_the_exact_selected_tranche(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / selection.WASM_MANIFEST
            manifest.parent.mkdir(parents=True)
            manifest.write_text(json.dumps({"schema_version": 1, "benchmarks": {
                "wasm_sum": {"scope": "kernel", "kernels": ["sum"]},
            }}))
            for name in ("join", "wasm_sum"):
                for language, extension in (("tsb", "ts"), ("pandas", "py")):
                    target = root / "benchmarks" / language / f"bench_{name}.{extension}"
                    target.parent.mkdir(exist_ok=True)
                    target.touch()
            for pair, needs_wasm in (("join", False), ("wasm_sum", True), ("unknown", False)):
                with self.subTest(pair=pair):
                    output, github_output = root / f"{pair}.json", root / f"{pair}.txt"
                    env = {"EVENT_NAME": "workflow_dispatch", "EXPECTED_HEAD_SHA": "a" * 40,
                           "INPUT_PAIRS": pair, "GITHUB_OUTPUT": str(github_output)}
                    with patch.dict(selection.os.environ, env), patch.object(selection.subprocess, "run",
                            return_value=subprocess.CompletedProcess([], 0, stdout="a" * 40)):
                        code = selection.main(["--repo-root", str(root), "--output", str(output)])
                    self.assertEqual(code, int(pair == "unknown"))
                    self.assertEqual(json.loads(output.read_text())["needs_wasm"], needs_wasm)
                    self.assertIn("needs_wasm=" + str(needs_wasm).lower() + "\n", github_output.read_text())

    def test_workflow_is_read_only_strict_serial_and_keeps_failure_artifacts(self):
        source = (Path(__file__).resolve().parents[1] / "benchmark-verification.yml").read_text()
        self.assertNotIn("pull_request_target", source)
        self.assertNotIn("\n  push:", source)
        self.assertNotIn("secrets.", source)
        self.assertNotIn(": write", source)
        for required in ("contents: read", "persist-credentials: false", "github.event.pull_request.head.sha || github.sha",
                         "BENCHMARK_WORKERS: '1'", "BENCHMARK_STRICT: '1'", "bun-version: '1.4.2'",
                         "python-version: '3.12'", "pandas==2.2.3 numpy==2.1.3", "if: always()"):
            with self.subTest(required=required):
                self.assertIn(required, source)

    def test_verification_build_is_conditional_and_pages_build_is_always_fresh(self):
        workflows = Path(__file__).resolve().parents[1]
        verification = (workflows / "benchmark-verification.yml").read_text()
        for name in ("Setup Rust for selected Wasm kernels", "Install pinned Wasm build tooling",
                     "Build selected Wasm kernels from source"):
            block = verification.split("- name: " + name + "\n", 1)[1].split("\n      - ", 1)[0]
            self.assertIn("if: steps.select.outputs.needs_wasm == 'true'", block)
        for path in ("benchmarks/backend.ts", "benchmarks/kernel-workloads.ts", "benchmarks/pandas/wasm_helpers.py",
                     "benchmarks/helpers/**", "benchmarks/wasm-support.json", "rust/**", "src/wasm/**"):
            self.assertIn("      - " + path + "\n", verification)
        pages = (workflows / "pages.yml").read_text()
        for source in (verification, pages):
            for required in ("dtolnay/rust-toolchain@stable", "targets: wasm32-unknown-unknown", "wasm-pack@0.15.0",
                             "mv rust/pkg", "wasm-pack build --target nodejs --out-dir pkg rust/ -- --locked",
                             "test -s rust/pkg/tsb_wasm_bg.wasm", "sha256sum rust/pkg/tsb_wasm_bg.wasm"):
                self.assertIn(required, source)
            self.assertLess(source.index("mv rust/pkg"), source.index("wasm-pack build"))
        self.assertIn("BENCHMARK_WORKERS: '8'", pages)
        self.assertNotIn("needs_wasm", pages)


if __name__ == "__main__":
    unittest.main()
