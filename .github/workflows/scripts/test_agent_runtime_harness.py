"""Real subprocess checks for trusted sandbox startup, without inference/network."""
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import unittest

import provision_agent_runtime as runtime


SCRIPTS = Path(__file__).resolve().parent
VERSIONS = {"python": "3.12.8", "pandas": "2.2.3", "numpy": "2.1.3", "bun": "1.4.2"}


class AgentRuntimeHarnessTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name).resolve()
        self.actions = self.root / "trusted actions"
        self.workspace = self.root / "candidate"
        self.python_bin = self.root / "pinned python/bin"
        self.bun_bin = self.root / "pinned bun/bin"
        self.shadow = self.root / "shadow tools"
        for directory in (self.actions, self.workspace, self.python_bin, self.bun_bin, self.shadow):
            directory.mkdir(parents=True)
        self.python = self.python_bin / "python3"
        self.bun = self.bun_bin / "bun"
        self.calls = self.root / "python-calls.log"
        self.started = self.root / "copilot-started.json"
        self.shadow_called = self.root / "shadow-called"
        self.manifest = self.actions / "tsb_agent_runtime_manifest.json"
        self.branch_evidence = self.actions / "tsb_agent_branch_state.json"
        self.branch_evidence.write_text('{"branch":"goal/42-goal","base":"main"}')
        self.branch_verified = self.root / "branch-verified"
        shutil.copy2(SCRIPTS / "tsb_runtime_harness.cjs", self.actions)
        (self.actions / "tsb_provision_agent_runtime.py").write_text("# controlled checker fixture\n")
        (self.actions / "tsb_agent_runtime_selection.json").write_text('{"selected":"local"}')
        self.executable(self.actions / "sync_automation_branch.sh",
                        '[ "$4" = --verify-only ] || exit 1\n' +
                        "printf verified > " + shlex.quote(str(self.branch_verified)) + "\n")
        report = {"schema_version": 1, "status": "ready", "python_executable": str(self.python),
                  "bun_executable": str(self.bun), "versions": VERSIONS}
        self.manifest.write_text(json.dumps(report))
        (self.actions / "tsb_agent_runtime_env.sh").write_text(runtime.environment_exports(report))
        self.write_python()
        (self.python_bin / "python").symlink_to(self.python)
        self.executable(self.bun, "printf '%s\\n' '1.4.2'\n")
        for name in ("python", "python3", "bun", "pip3"):
            self.executable(self.shadow / name, "printf 'used' > " + shlex.quote(str(self.shadow_called)) + "\nexit 73\n")
        # This fixture takes the place of the existing standard gh-aw harness,
        # not the wrapper under test. Starting it stands for starting Copilot.
        (self.actions / "copilot_harness.cjs").write_text("""
const fs = require('node:fs');
const cp = require('node:child_process');
const result = {args: process.argv.slice(2), path: process.env.PATH,
  noUserSite: process.env.PYTHONNOUSERSITE, marker: process.env.UNRELATED_TEST_MARKER};
if (process.env.TEST_PROBE_CHILD === '1') {
  result.python = JSON.parse(cp.spawnSync('python3', ['-c', 'probe'], {encoding:'utf8'}).stdout);
  result.bun = cp.spawnSync('bun', ['--version'], {encoding:'utf8'}).stdout.trim();
}
if (process.env.TEST_PROBE_LOGIN === '1') {
  result.login = cp.spawnSync('/bin/bash', ['-lc', 'python -c probe && python3 -c probe'],
    {encoding:'utf8'});
}
fs.writeFileSync(process.env.TEST_STARTED_FILE, JSON.stringify(result));
process.exitCode = Number(process.env.TEST_HARNESS_EXIT || '0');
""")
        self.env = {**os.environ, "PATH": str(self.shadow) + os.pathsep + "/usr/bin:/bin",
                    "GITHUB_WORKSPACE": str(self.workspace), "PYTHONNOUSERSITE": "0",
                    "TEST_STARTED_FILE": str(self.started), "UNRELATED_TEST_MARKER": "preserved"}
        self.node = shutil.which("node")
        self.assertIsNotNone(self.node, "Node is required to exercise the actual Copilot startup wrapper")

    def executable(self, path, body):
        path.write_text("#!/bin/sh\n" + body)
        path.chmod(0o700)

    def write_python(self, versions=None, setup_exit=0, check_exit=0, executable=None):
        versions = versions or VERSIONS
        probe = {key: value for key, value in versions.items() if key != "bun"}
        probe["executable"] = str(executable or self.python)
        self.executable(self.python,
            "printf '%s\\n' \"$@\" >> " + shlex.quote(str(self.calls)) + "\n" +
            "if [ \"$1\" = '-I' ]; then shift; fi\n" +
            "if [ \"$1\" = '-c' ]; then\n  printf '%s\\n' " + shlex.quote(json.dumps(probe)) + "\n" +
            "elif [ \"$2\" = '--selection' ]; then\n  printf 'controlled refresh\\n'\n  exit " + str(setup_exit) + "\n" +
            "else\n  printf 'controlled check\\n'\n  exit " + str(check_exit) + "\nfi\n")

    def run_wrapper(self, args=None, env=None):
        return subprocess.run([self.node, str(self.actions / "tsb_runtime_harness.cjs"), *(args or [])],
                              cwd=self.workspace, env={**self.env, **(env or {})}, capture_output=True,
                              text=True, timeout=15)

    def assert_not_started(self, result):
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("Startup failed", result.stderr)
        self.assertFalse(self.started.exists(), "Failed startup must not start the Copilot harness")

    def test_shadowed_path_is_corrected_and_inherited_by_standard_harness(self):
        args = ["/trusted/copilot", "--prompt-file", "/a path/prompt.txt", "literal;$(not-a-command)"]
        result = self.run_wrapper(args=args, env={"TEST_PROBE_CHILD": "1"})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        child = json.loads(self.started.read_text())
        self.assertEqual(child["args"], args)
        self.assertEqual(child["noUserSite"], "1")
        self.assertEqual(child["marker"], "preserved")
        self.assertEqual(child["python"]["executable"], str(self.python))
        self.assertEqual(child["bun"], "1.4.2")
        self.assertEqual(child["path"].split(os.pathsep)[:2], [str(self.bun_bin), str(self.python_bin)])
        self.assertFalse(self.shadow_called.exists())
        calls = self.calls.read_text().splitlines()
        self.assertEqual(calls.count("--selection"), 1)
        self.assertEqual(calls.count("--check-only"), 1)
        self.assertIn(str(self.actions / "tsb_agent_runtime_selection.json"), calls)
        self.assertIn(str(self.actions / "tsb_provision_agent_runtime.py"), calls)
        self.assertFalse((self.workspace / ".github").exists())
        self.assertTrue(self.branch_verified.exists())

    def test_missing_or_bad_branch_evidence_never_starts_copilot(self):
        for evidence in ("{}", "null", "{"):
            self.branch_evidence.write_text(evidence)
            self.assert_not_started(self.run_wrapper())
        self.branch_evidence.unlink()
        self.assert_not_started(self.run_wrapper())
        self.assertFalse(self.branch_verified.exists())

    def test_failed_branch_preflight_prevents_dependency_refresh_and_inference(self):
        self.executable(self.actions / "sync_automation_branch.sh",
                        "echo 'stale attestation or dirty trusted overlay' >&2\nexit 1\n")
        self.assert_not_started(self.run_wrapper())
        self.assertNotIn("--selection", self.calls.read_text())

    def test_snapshot_expiring_during_refresh_fails_before_inference(self):
        self.executable(self.actions / "sync_automation_branch.sh",
                        '[ "$4" = --verify-only ] || exit 1\n' +
                        "if [ -f " + shlex.quote(str(self.branch_verified)) + " ]; then\n" +
                        "  echo 'Original host snapshot expired during refresh' >&2\n  exit 1\nfi\n" +
                        "printf verified > " + shlex.quote(str(self.branch_verified)) + "\n")
        result = self.run_wrapper()
        self.assert_not_started(result)
        self.assertIn("snapshot expired", result.stderr)
        self.assertIn("--check-only", self.calls.read_text())

    def test_real_offline_helper_preserves_dirty_overlay_before_inference(self):
        self.env["GITHUB_REPOSITORY"] = "example/repo"
        self.env["GITHUB_RUN_ID"] = "123"
        self.env["GITHUB_RUN_ATTEMPT"] = "1"
        actual_git = shutil.which("git")
        for name in ("sync_automation_branch.sh", "automation_branch_state.py"):
            shutil.copy2(SCRIPTS / name, self.actions / name)
        # Git runs for real; the Python version probe remains a controlled
        # fixture so this test needs no installed pandas/Bun or GitHub login.
        self.executable(self.shadow / "git", "exec " + shlex.quote(actual_git) + ' "$@"\n')
        setup_env = {**os.environ, "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "test@example.invalid",
                     "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "test@example.invalid"}
        subprocess.run([actual_git, "init", "-b", "main"], cwd=self.workspace, env=setup_env,
                       check=True, capture_output=True)
        (self.workspace / "AGENTS.md").write_text("original\n")
        subprocess.run([actual_git, "add", "AGENTS.md"], cwd=self.workspace, env=setup_env, check=True)
        subprocess.run([actual_git, "commit", "-m", "initial"], cwd=self.workspace, env=setup_env,
                       check=True, capture_output=True)
        (self.workspace / "AGENTS.md").write_text("trusted restored overlay\n")
        result = self.run_wrapper()
        self.assert_not_started(result)
        self.assertIn("workflow_dispatch or issue context", result.stderr)
        self.assertEqual((self.workspace / "AGENTS.md").read_text(), "trusted restored overlay\n")

    def test_actual_version_mismatch_stops_before_refresh_or_inference(self):
        for key, value in (("python", "3.13.0"), ("python", "3.12.9"),
                           ("pandas", "3.0.0"), ("numpy", "2.2.0")):
            with self.subTest(key=key, value=value):
                self.write_python({**VERSIONS, key: value})
                self.assert_not_started(self.run_wrapper())
        self.write_python()
        self.executable(self.bun, "printf '%s\\n' '1.3.0'\n")
        self.assert_not_started(self.run_wrapper())
        self.assertNotIn("--selection", self.calls.read_text())

    def test_python_alias_shadowing_is_not_silently_accepted(self):
        (self.python_bin / "python").unlink()
        self.assert_not_started(self.run_wrapper())
        self.assertFalse(self.calls.exists())
        self.assertFalse(self.shadow_called.exists())

    def test_later_login_shells_reapply_read_only_pinned_environment(self):
        result = self.run_wrapper(env={"TEST_PROBE_LOGIN": "1"})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        child = json.loads(self.started.read_text())
        self.assertEqual(child["login"]["status"], 0, child["login"])
        observations = [json.loads(line) for line in child["login"]["stdout"].splitlines()]
        self.assertEqual(len(observations), 2)
        self.assertTrue(all(item["executable"] == str(self.python) for item in observations))
        self.assertFalse(self.shadow_called.exists())

    def test_import_failure_and_wrong_executable_identity_do_not_start_copilot(self):
        self.executable(self.python, "echo 'ModuleNotFoundError: numpy' >&2\nexit 1\n")
        self.assert_not_started(self.run_wrapper())
        self.write_python(executable=self.shadow / "python3")
        self.assert_not_started(self.run_wrapper())

    def test_refresh_failure_is_one_attempt_and_never_starts_copilot(self):
        self.write_python(setup_exit=1)
        self.assert_not_started(self.run_wrapper())
        calls = self.calls.read_text().splitlines()
        self.assertEqual(calls.count("--selection"), 1)
        self.assertNotIn("--check-only", calls)

    def test_check_failure_never_starts_copilot(self):
        self.write_python(check_exit=1)
        self.assert_not_started(self.run_wrapper())

    def test_missing_or_invalid_trusted_manifest_fails_closed(self):
        for manifest in ({}, {"schema_version": 1, "status": "setup_error"}, []):
            with self.subTest(manifest=manifest):
                self.manifest.write_text(json.dumps(manifest))
                self.assert_not_started(self.run_wrapper())
        self.manifest.unlink()
        self.assert_not_started(self.run_wrapper())
        self.assertFalse(self.calls.exists())

    def test_agent_writable_environment_is_never_sourced(self):
        hostile = self.workspace / "agent-runtime.env"
        hostile.write_text("touch " + shlex.quote(str(self.shadow_called)) + "\nexit 1\n")
        result = self.run_wrapper()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.shadow_called.exists())

    def test_no_selection_preserves_command_handling_without_runtime_setup(self):
        self.manifest.write_text('{"schema_version":1,"status":"skipped"}')
        result = self.run_wrapper(args=["/trusted/copilot"])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertTrue(self.started.exists())
        self.assertFalse(self.calls.exists())
        self.assertFalse(self.shadow_called.exists())

    def test_standard_harness_failure_is_not_converted_to_success(self):
        result = self.run_wrapper(env={"TEST_HARNESS_EXIT": "7"})
        self.assertEqual(result.returncode, 7)
        self.assertTrue(self.started.exists())


if __name__ == "__main__":
    unittest.main()
