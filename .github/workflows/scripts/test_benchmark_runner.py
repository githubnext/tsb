"""Exercise benchmark accounting cheaply using fake TS/Python executables."""
import json
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


RUNNER = Path(__file__).resolve().parents[3] / "benchmarks" / "runner.py"


class BenchmarkRunnerTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for directory in ("tsb", "pandas"):
            (self.root / "benchmarks" / directory).mkdir(parents=True)
        self.stub = self.root / "runtime"
        self.stub.write_text(f"#!{sys.executable}\n" + """import hashlib,json,os,pathlib,sys,time
if sys.argv[1] == '--version':
    print('test-runtime-1')
elif sys.argv[1] == '-c':
    print(json.dumps({'python':'test-python','pandas':'test-pandas','numpy':'test-numpy'}))
else:
    script = pathlib.Path(sys.argv[1])
    behavior = script.read_text().strip()
    if behavior.startswith('wasm_'):
        backend = os.environ.get('TSB_BENCHMARK_BACKEND', 'pandas')
        if behavior == 'wasm_failure' and backend == 'rust-wasm':
            print('cannot load Wasm module', file=sys.stderr)
            sys.exit(1)
        if behavior == 'wasm_timeout' and backend == 'rust-wasm':
            time.sleep(2)
        result = {'function':script.stem[6:], 'backend':backend, 'mean_ms':1, 'iterations':2, 'total_ms':2,
                  'scope':'kernel', 'fixture':'fixture-v1', 'warmup':3,
                  'verification':{'schema_version':1,'outputs':{'sum_f64':[1,2.5,None,'file10']}}}
        if behavior == 'wasm_wrong_output' and backend == 'rust-wasm':
            result['verification']['outputs']['sum_f64'][0] = 3
        if behavior == 'wasm_wrong_shape' and backend == 'typescript':
            result['verification']['outputs']['sum_f64'].append(None)
        if behavior == 'wasm_no_outputs':
            result.pop('verification')
        if behavior == 'wasm_unrelated_outputs':
            result['verification']['outputs'] = {'unrelated': []}
        if behavior == 'wasm_wrong_name':
            result['function'] = 'not_the_selected_workload'
        if behavior == 'wasm_bad_iterations':
            result['iterations'] = True
        if behavior == 'wasm_huge_iterations':
            result['iterations'] = 10**400
        if behavior == 'wasm_huge_timing':
            result.update(mean_ms=10**308, total_ms=10**308)
        if behavior == 'wasm_bad_total':
            result['total_ms'] = 999
        if behavior == 'wasm_wrong_fixture' and backend == 'rust-wasm':
            result['fixture'] = 'easier-fixture'
        if behavior == 'wasm_wrong_warmup' and backend == 'typescript':
            result['warmup'] = 100
        if behavior == 'wasm_zero_total':
            result.update(mean_ms=1e-9, total_ms=0)
        if behavior == 'wasm_negative_total':
            result.update(mean_ms=1e-9, total_ms=-1e-9)
        if backend == 'rust-wasm':
            binary = script.parents[2] / 'rust/pkg/tsb_wasm_bg.wasm'
            result['wasm'] = {'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(), 'kernel_calls':{'sum_f64':2}}
            if behavior == 'wasm_fallback': result['backend'] = 'typescript'
            if behavior == 'wasm_no_receipt': result.pop('wasm')
            if behavior == 'wasm_wrong_hash': result['wasm']['binary_sha256'] = 'f' * 64
            if behavior == 'wasm_no_calls': result['wasm']['kernel_calls'] = {}
            if behavior == 'wasm_wrong_calls': result['wasm']['kernel_calls'] = {'other_f64':2}
            if behavior == 'wasm_warmup_only': result['wasm']['kernel_calls'] = {'sum_f64':3}
            if behavior == 'wasm_boolean_calls': result['wasm']['kernel_calls'] = {'sum_f64':True}
            if behavior == 'wasm_receipt_override': result['wasm'].update(mean_ms=0.000001, iterations=999, status='faked')
            if behavior == 'wasm_mutated_binary': binary.write_bytes(b'changed after measurement')
        if behavior == 'wasm_ts_contaminated' and backend == 'typescript':
            result['wasm'] = {'kernel_calls': {'sum_f64':2}}
        print(json.dumps(result))
        sys.exit(0)
    if behavior == 'fail':
        print('deliberate fixture failure', file=sys.stderr)
        sys.exit(7)
    if behavior == 'timeout':
        time.sleep(2)
    elif behavior == 'malformed':
        print('not JSON')
    elif behavior == 'nan':
        print('{"mean_ms": NaN}')
    elif behavior == 'infinity':
        print('{"mean_ms": 1, "total_ms": Infinity}')
    elif behavior == 'zero':
        print('{"mean_ms": 0}')
    elif behavior == 'boolean':
        print('{"mean_ms": true}')
    elif behavior == 'huge':
        print('{"mean_ms": 1e308}')
    elif behavior == 'tiny':
        print('{"mean_ms": 1e-308}')
    elif behavior == 'near_zero':
        print('{"mean_ms": 0.0002}')
    else:
        print(json.dumps({'function':script.stem[6:],'mean_ms':1 if script.suffix=='.ts' else 2,'iterations':2,'total_ms':4}))
""")
        self.stub.chmod(0o755)
        self.environment = {key: value for key, value in os.environ.items() if not key.startswith("BENCHMARK_")}

    def pair(self, name, ts="ok", pandas="ok"):
        (self.root / "benchmarks" / "tsb" / f"bench_{name}.ts").write_text(ts)
        (self.root / "benchmarks" / "pandas" / f"bench_{name}.py").write_text(pandas)

    def register(self, name="kernel", behavior="wasm_ok"):
        self.pair(name, behavior, "wasm_ok")
        path = self.root / "benchmarks/wasm-support.json"
        manifest = json.loads(path.read_text()) if path.exists() else {"schema_version": 1, "benchmarks": {}}
        manifest["benchmarks"][name] = {"scope": "kernel", "kernels": ["sum_f64"]}
        path.write_text(json.dumps(manifest))
        binary = self.root / "rust/pkg/tsb_wasm_bg.wasm"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.write_bytes(b'fixture wasm binary')

    def run_report(self, *extra, environment=None):
        result = subprocess.run([
            sys.executable, str(RUNNER), "--repo-root", str(self.root),
            "--ts-runner", str(self.stub), "--python-runner", str(self.stub),
            "--workers", "2", "--timeout", "0.3", *extra,
        ], capture_output=True, text=True, env=environment or self.environment)
        output = self.root / "benchmarks" / "results.json"
        return result, json.loads(output.read_text()) if output.exists() else None

    def test_success_preserves_legacy_array_and_records_provenance(self):
        self.pair("join")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["status"], "complete")
        self.assertEqual(report["summary"], {"total": 1, "completed": 1, "failed": 0, "failure_counts": {}})
        self.assertEqual(report["benchmarks"][0]["ratio"], 0.5)
        self.assertEqual(set(report["benchmarks"][0]), {"function", "tsb", "pandas", "ratio"})
        self.assertEqual(report["provenance"]["python_libraries"]["pandas"], "test-pandas")
        self.assertEqual(report["provenance"]["typescript_version"], "test-runtime-1")
        self.assertIn("candidate_sha", report["provenance"])
        self.assertEqual(report["provenance"]["workers"], 2)
        self.assertEqual(report["schema_version"], 3)
        self.assertEqual(report["comparisons"][0]["rust_wasm"]["status"], "unsupported")
        self.assertEqual(report["backend_summary"]["rust_wasm"]["unsupported"], 1)

    def test_three_backends_require_real_receipt_and_compare_full_outputs(self):
        self.register()
        result, report = self.run_report("--strict", environment={**self.environment, "TSB_BENCHMARK_BACKEND": "rust-wasm"})
        self.assertEqual(result.returncode, 0, result.stderr)
        comparison = report["comparisons"][0]
        self.assertEqual(comparison["scope"], "kernel")
        self.assertEqual(comparison["output_verification"]["status"], "matched")
        self.assertEqual(comparison["tsb"]["mean_ms"], 1)
        self.assertEqual(comparison["rust_wasm"]["status"], "success")
        self.assertEqual(comparison["rust_wasm"]["kernel_calls"], {"sum_f64": 2})
        self.assertEqual(comparison["rust_wasm"]["binary_sha256"], hashlib.sha256(b'fixture wasm binary').hexdigest())
        self.assertNotIn("verification", report["benchmarks"][0]["tsb"])
        self.assertEqual(report["backend_summary"]["rust_wasm"]["success"], 1)

    def test_failed_or_unverified_rust_preserves_python_and_typescript(self):
        for behavior in ("wasm_failure", "wasm_timeout", "wasm_fallback", "wasm_no_receipt", "wasm_wrong_hash",
                         "wasm_no_calls", "wasm_wrong_calls", "wasm_warmup_only", "wasm_boolean_calls", "wasm_mutated_binary"):
            with self.subTest(behavior=behavior):
                self.register(behavior=behavior)
                result, report = self.run_report("--strict")
                self.assertEqual(result.returncode, 1, result.stderr)
                row = report["comparisons"][0]
                self.assertEqual(row["pandas"]["status"], "success")
                self.assertEqual(row["tsb"]["status"], "success")
                self.assertNotEqual(row["rust_wasm"]["status"], "success")
                self.assertNotIn("mean_ms", row["rust_wasm"])
                self.assertEqual(report["summary"]["failed"], 1)
                self.assertEqual(len(report["benchmarks"]), 1)

    def test_receipt_cannot_override_validated_timing_or_status(self):
        self.register(behavior="wasm_receipt_override")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        wasm = report["comparisons"][0]["rust_wasm"]
        self.assertEqual(wasm["mean_ms"], 1)
        self.assertEqual(wasm["iterations"], 2)
        self.assertEqual(wasm["status"], "success")
        self.assertEqual(set(report["benchmarks"][0]["tsb"]), {"function", "backend", "mean_ms", "iterations", "total_ms", "scope", "fixture", "warmup"})

    def test_huge_iteration_count_is_a_reported_failure_not_collector_crash(self):
        for behavior in ("wasm_huge_iterations", "wasm_huge_timing"):
            self.register(behavior=behavior)
            result, report = self.run_report("--strict")
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertIsNotNone(report)
            self.assertEqual(report["summary"]["failed"], 1)

    def test_incorrect_output_or_ts_contamination_cannot_be_a_timing_win(self):
        for behavior in ("wasm_wrong_output", "wasm_wrong_shape", "wasm_ts_contaminated", "wasm_no_outputs",
                         "wasm_wrong_name", "wasm_bad_iterations", "wasm_bad_total", "wasm_zero_total", "wasm_negative_total",
                         "wasm_wrong_fixture", "wasm_wrong_warmup"):
            with self.subTest(behavior=behavior):
                self.register(behavior=behavior)
                result, report = self.run_report("--strict")
                self.assertEqual(result.returncode, 1, result.stderr)
                row = report["comparisons"][0]
                self.assertEqual(row["output_verification"]["status"], "incomplete")
                self.assertTrue(any(row[side]["status"] in ("incorrect", "unverified") for side in ("tsb", "rust_wasm")))

    def test_missing_binary_is_failure_not_unsupported(self):
        self.register()
        (self.root / "rust/pkg/tsb_wasm_bg.wasm").unlink()
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["comparisons"][0]["rust_wasm"]["status"], "error")
        self.assertIsNone(report["provenance"]["wasm"]["binary_sha256"])

    def test_missing_reference_prevents_unverified_comparison_timings(self):
        self.register()
        (self.root / "benchmarks/pandas/bench_kernel.py").write_text("fail")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 1)
        row = report["comparisons"][0]
        self.assertEqual(row["pandas"]["status"], "error")
        for side in ("tsb", "rust_wasm"):
            self.assertEqual(row[side]["status"], "unverified")
            self.assertNotIn("mean_ms", row[side])
            self.assertIn("reference", row[side]["reason"])

    def test_matching_unrelated_outputs_cannot_certify_registered_kernels(self):
        self.register(behavior="wasm_unrelated_outputs")
        (self.root / "benchmarks/pandas/bench_kernel.py").write_text("wasm_unrelated_outputs")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 1)
        row = report["comparisons"][0]
        self.assertEqual(row["output_verification"]["status"], "incomplete")
        for side in ("tsb", "pandas", "rust_wasm"):
            self.assertEqual(row[side]["status"], "unverified")
            self.assertNotIn("mean_ms", row[side])

    def test_unselected_registered_backend_is_not_executed(self):
        self.register(behavior="wasm_failure")
        self.pair("join")
        result, report = self.run_report("--filter", "join", "--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["comparisons"][1]["rust_wasm"]["status"], "not_selected")
        self.assertEqual(report["backend_summary"]["rust_wasm"], {"success": 0, "failed": 0, "unsupported": 1, "not_selected": 1})

    def test_invalid_manifest_fails_closed(self):
        self.pair("kernel")
        for entry in ({"scope": "api", "kernels": ["sum_f64"]}, {"scope": "kernel", "kernels": []},
                      {"scope": "kernel", "kernels": ["sum_f64", "sum_f64"]}, {"scope": "kernel", "kernels": [False]}):
            (self.root / "benchmarks/wasm-support.json").write_text(json.dumps({"schema_version": 1, "benchmarks": {"kernel": entry}}))
            result, report = self.run_report()
            self.assertEqual(result.returncode, 2)
            self.assertIsNone(report)
        (self.root / "benchmarks/wasm-support.json").write_text('not json')
        result, report = self.run_report()
        self.assertEqual(result.returncode, 2)
        self.assertIsNone(report)

    def test_output_comparison_keeps_shapes_identities_and_order(self):
        spec = importlib.util.spec_from_file_location("three_backend_runner", RUNNER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        compare = module.output_difference
        self.assertIsNone(compare({"data": [1.1, None, "file1"]}, {"data": [1.10000000001, None, "file1"]}))
        self.assertIsNotNone(compare({"argsort_f64": [0, 1]}, {"argsort_f64": [1e-10, 1.00000000001]}))
        for expected, actual in (([1, 2], [2, 1]), ([1], [1, None]), (True, 1), ({"x": 1}, {"y": 1}),
                                 ("1", 1), (None, 0), ([1.2], [1.21])):
            self.assertIsNotNone(compare(expected, actual))

    def test_every_failure_is_reported_and_default_publish_is_incomplete(self):
        for name, behavior in (("good", "ok"), ("broken", "fail"), ("slow", "timeout"), ("bad_json", "malformed"), ("nan", "nan"), ("infinite", "infinity")):
            self.pair(name, behavior)
        self.pair("zero_denominator", pandas="zero")
        self.pair("boolean_mean", ts="boolean")
        result, report = self.run_report()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("WARNING", result.stderr)
        self.assertEqual(report["status"], "incomplete")
        self.assertEqual(report["summary"]["total"], 8)
        self.assertEqual(report["summary"]["completed"], 1)
        self.assertEqual(report["summary"]["failed"], 7)
        outcomes = {item["function"]: item for item in report["outcomes"]}
        self.assertEqual(len(outcomes), 8)
        self.assertEqual(outcomes["broken"]["tsb"]["exit_code"], 7)
        self.assertEqual(outcomes["slow"]["status"], "timeout")
        self.assertEqual(outcomes["bad_json"]["status"], "malformed")
        self.assertEqual(outcomes["nan"]["status"], "non_finite")
        self.assertEqual(outcomes["infinite"]["status"], "non_finite")
        self.assertEqual(outcomes["zero_denominator"]["failed_sides"], ["pandas"])

    def test_strict_environment_fails_but_preserves_failure_report(self):
        self.pair("broken", "fail")
        result, report = self.run_report(environment={**self.environment, "BENCHMARK_STRICT": "1"})
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["summary"]["failed"], 1)

    def test_filter_runs_only_requested_pairs_and_records_universe(self):
        self.pair("join")
        self.pair("slow", "timeout")
        result, report = self.run_report("--filter", "join", "--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["scope"]["kind"], "filtered")
        self.assertEqual(report["scope"]["discovered_pairs"], 2)
        self.assertEqual(report["scope"]["selected_pairs"], ["join"])
        self.assertEqual(report["scope"]["unselected_pairs"], 1)
        self.assertEqual(report["outcomes"][1], {"function": "slow", "status": "not_selected"})

    def test_unknown_selection_or_empty_universe_is_error_not_complete(self):
        result, report = self.run_report()
        self.assertEqual(result.returncode, 2)
        self.assertIsNone(report)
        self.pair("join")
        result, report = self.run_report("--filter", "unknown")
        self.assertEqual(result.returncode, 2)
        self.assertIsNone(report)

    def test_invalid_execution_limits_do_not_run(self):
        self.pair("join")
        for arguments in (("--workers", "0"), ("--timeout", "nan"), ("--timeout", "0")):
            result, report = self.run_report(*arguments)
            self.assertEqual(result.returncode, 2)
            self.assertIsNone(report)

    def test_finite_inputs_with_overflowing_ratio_are_rejected(self):
        self.pair("overflow", "huge", "tiny")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["outcomes"][0]["status"], "non_finite")
        self.assertEqual(report["benchmarks"], [])

    def test_small_positive_ratio_preserves_precision(self):
        self.pair("precise", "near_zero")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report["benchmarks"][0]["ratio"], 0.0001)

    def test_zero_timing_and_underflow_are_not_unlimited_wins(self):
        self.pair("zero_timing", "zero")
        self.pair("underflow", "tiny", "huge")
        result, report = self.run_report("--strict")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["benchmarks"], [])
        self.assertEqual(report["summary"]["failed"], 2)
        self.assertTrue(all(outcome["status"] == "unresolvable" for outcome in report["outcomes"]))

    def test_shell_entrypoint_honors_filter_and_strict_environment(self):
        self.pair("join")
        self.pair("broken", "fail")
        (self.root / "benchmarks" / "pandas" / "bench_join.py").write_text('print(\'{"mean_ms": 2}\')\n')
        (self.root / "benchmarks" / "run_benchmarks.sh").write_text((RUNNER.parent / "run_benchmarks.sh").read_text())
        (self.root / "benchmarks" / "runner.py").symlink_to(RUNNER)
        (self.root / "bun").symlink_to(self.stub)
        python = self.root / "python3"
        python.write_text(f"#!{sys.executable}\nimport os,sys\n"
                          "if sys.argv[1:] == ['-c', 'import pandas']: sys.exit(0)\n"
                          f"os.execv({sys.executable!r}, [{sys.executable!r}, *sys.argv[1:]])\n")
        python.chmod(0o755)
        environment = {**self.environment, "PATH": f"{self.root}:{os.environ['PATH']}",
                       "BENCHMARK_FILTER": "join", "BENCHMARK_STRICT": "1"}
        result = subprocess.run(["bash", str(self.root / "benchmarks" / "run_benchmarks.sh")],
                                capture_output=True, text=True, env=environment)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((self.root / "benchmarks" / "results.json").read_text())
        self.assertEqual(report["scope"]["selected_pairs"], ["join"])
        self.assertEqual(report["summary"]["completed"], 1)


if __name__ == "__main__":
    unittest.main()
