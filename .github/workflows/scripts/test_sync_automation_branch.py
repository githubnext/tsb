"""Exercise automation branch synchronization against real, local Git remotes."""
import os
import json
import shlex
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest

import automation_branch_state as state


SCRIPT = Path(__file__).with_name("sync_automation_branch.sh").resolve()


class SyncAutomationBranchTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.remote = self.root / "remote.git"
        self.repo = self.root / "repo"
        self.actions = self.root / "trusted-actions"
        self.actions.mkdir()
        for name in ("sync_automation_branch.sh", "automation_branch_state.py"):
            shutil.copy2(SCRIPT.with_name(name), self.actions / name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        (self.bin / "python3").symlink_to(sys.executable)
        gh = self.bin / "gh"
        self.network_called = self.root / "network-called"
        gh.write_text('#!/bin/sh\nprintf called > "$TEST_NETWORK_CALLED"\nexit 4\n')
        gh.chmod(0o755)
        git = self.bin / "git"
        git.write_text('#!/bin/sh\nif [ "$TEST_OFFLINE" = 1 ]; then\ncase "$1" in fetch|ls-remote) '
                       'printf called > "$TEST_NETWORK_CALLED"; exit 4;; esac\nfi\nexec ' +
                       shlex.quote(shutil.which("git")) + ' "$@"\n')
        git.chmod(0o755)
        self.response = self.root / "pulls.json"
        self.response.write_text("[]")
        self.selection = self.root / "selection.json"
        self.evidence = self.actions / "tsb_agent_branch_state.json"
        self.existing_pr = None
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "GITHUB_REPOSITORY": "example/repo",
            "GITHUB_RUN_ID": "123",
            "GITHUB_RUN_ATTEMPT": "1",
            "TEST_NETWORK_CALLED": str(self.network_called),
            "BRANCH_API_RESPONSE": str(self.response),
            "GIT_AUTHOR_NAME": "Workflow Test",
            "GIT_AUTHOR_EMAIL": "workflow-test@example.invalid",
            "GIT_COMMITTER_NAME": "Workflow Test",
            "GIT_COMMITTER_EMAIL": "workflow-test@example.invalid",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
        }
        self.git("init", "--bare", str(self.remote), cwd=self.root)
        self.git("init", "-b", "main", str(self.repo), cwd=self.root)
        self.git("remote", "add", "origin", str(self.remote))
        self.commit("common.txt", "initial\n")
        self.git("push", "origin", "main")
        self.initial = self.git("rev-parse", "HEAD")
        self.branch = "autoloop/test-program"

    def git(self, *args, cwd=None):
        return subprocess.run(
            ["git", *args], cwd=cwd or self.repo, env=self.env,
            check=True, text=True, capture_output=True,
        ).stdout.strip()

    def commit(self, file, content):
        (self.repo / file).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / file).write_text(content)
        self.git("add", file)
        self.git("commit", "-m", f"Update {file}")

    def publish_branch(self, unique=False):
        self.git("checkout", "-b", self.branch)
        if unique:
            self.commit("branch.txt", "branch work\n")
        self.git("push", "origin", self.branch)
        self.original_tip = self.git("rev-parse", "HEAD")
        self.git("checkout", "main")

    def advance_main(self):
        self.commit("base.txt", "upstream work\n")
        self.git("push", "origin", "main")

    def write_snapshot(self):
        # Stand in for the separately tested authenticated host capture. The
        # sandbox itself has no API login and is forbidden to fetch anything.
        try:
            selected = json.loads(self.selection.read_text())
            if self.env.get("BRANCH_API_FAIL"):
                raise ValueError("simulated host read error")
            mode = state.branch_mode(selected, self.branch, "main", "example/repo",
                                     lambda *_: json.loads(self.response.read_text()))
            remote = self.git("ls-remote", "--heads", "origin", "refs/heads/" + self.branch)
            snapshot = {"schema_version": 1, "status": "ready", "repository": "example/repo",
                        "branch": self.branch, "base": "main", "existing_pr": self.existing_pr,
                        "head_sha": remote.split()[0] if remote else None,
                        "base_sha": self.git("rev-parse", "origin/main"), "mode": mode,
                        "run_id": "123", "run_attempt": "1", "captured_at": time.time(),
                        "selection_digest": state.selection_digest(selected)}
        except (ValueError, OSError):
            snapshot = {"schema_version": 1, "status": "error"}
        self.evidence.write_text(json.dumps(snapshot))

    def sync(self, success=True, selection=True, snapshot=True, verify_only=False):
        if selection:
            if self.branch.startswith("goal/"):
                data = {"selected": {"branch": self.branch, "existing_pr": self.existing_pr}}
            else:
                data = {"selected": "test-program", "head_branch": self.branch, "existing_pr": self.existing_pr}
            self.selection.write_text(json.dumps(data))
        if snapshot:
            self.write_snapshot()
        remote_before = self.git("ls-remote", "origin")
        before = self.checkout_state() if verify_only else None
        result = subprocess.run(
            ["bash", str(self.actions / SCRIPT.name), self.branch, "main", str(self.selection),
             *(["--verify-only"] if verify_only else [])],
            cwd=self.repo, env={**self.env, "TEST_OFFLINE": "1"}, text=True, capture_output=True,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            if not verify_only:
                self.assertEqual(self.git("branch", "--show-current"), self.branch)
        else:
            self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git("ls-remote", "origin"), remote_before)
        self.assertFalse(self.network_called.exists(), "Sandbox preparation must be fully offline")
        if verify_only:
            self.assertEqual(self.checkout_state(), before, "Startup verification must not alter the checkout")
        return result

    def checkout_state(self):
        return tuple(self.git(*args) for args in (("rev-parse", "HEAD"), ("branch", "--show-current"),
            ("write-tree",), ("status", "--porcelain"), ("show-ref",)))

    def active_pr(self):
        self.existing_pr = 42
        self.response.write_text(json.dumps([{
            "number": 42, "state": "open",
            "head": {"ref": self.branch, "repo": {"full_name": "example/repo"}},
            "base": {"ref": "main", "repo": {"full_name": "example/repo"}},
        }]))

    def assert_publishable(self):
        self.git("merge-base", "--is-ancestor", self.original_tip, "HEAD")
        self.git("merge-base", "--is-ancestor", "origin/main", "HEAD")
        # This is the exact non-force operation used by the safe-output handler.
        self.git("push", "origin", self.branch)

    def test_missing_branch_starts_at_main_without_publishing(self):
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)

    def test_verify_only_does_not_create_a_new_branch(self):
        self.sync(verify_only=True)
        self.assertEqual(self.git("branch", "--show-current"), "main")
        self.assertNotIn("refs/heads/" + self.branch, self.git("show-ref"))

    def test_verify_only_preserves_trusted_startup_instructions_until_explicit_preparation(self):
        self.commit("AGENTS.md", "old published instructions\n")
        self.publish_branch(unique=True)
        self.active_pr()
        self.commit("AGENTS.md", "trusted startup instructions\n")
        self.git("push", "origin", "main")
        self.sync(verify_only=True)
        self.assertEqual((self.repo / "AGENTS.md").read_text(), "trusted startup instructions\n")
        self.sync(selection=False, snapshot=False)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)

    def test_verify_only_refuses_unpublished_local_commits(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.git("checkout", self.branch)
        self.commit("unpublished.txt", "keep my local work\n")
        unpublished = self.git("rev-parse", "HEAD")
        self.sync(success=False, verify_only=True)
        self.assertEqual(self.git("rev-parse", "HEAD"), unpublished)

    def test_verify_only_refuses_local_branch_when_remote_is_absent(self):
        self.git("branch", self.branch)
        self.sync(success=False, verify_only=True)

    def test_delayed_preparation_does_not_extend_verified_snapshot(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.sync(verify_only=True)
        evidence = json.loads(self.evidence.read_text())
        evidence["captured_at"] -= 301
        self.evidence.write_text(json.dumps(evidence))
        before = self.checkout_state()
        result = self.sync(success=False, selection=False, snapshot=False)
        self.assertIn("expired", result.stderr)
        self.assertEqual(self.checkout_state(), before)
        self.assertEqual(json.loads(self.evidence.read_text()), evidence)

    def test_equal_branch_is_unchanged(self):
        self.publish_branch()
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)
        self.assert_publishable()

    def test_branch_only_ahead_keeps_its_commits(self):
        self.publish_branch(unique=True)
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)
        self.assert_publishable()

    def test_branch_only_behind_fast_forwards(self):
        self.publish_branch()
        self.advance_main()
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.git("rev-parse", "main"))
        self.assert_publishable()

    def test_divergent_branch_merges_without_rewriting(self):
        self.publish_branch(unique=True)
        self.advance_main()
        self.sync()
        self.assertEqual(len(self.git("show", "-s", "--format=%P").split()), 2)
        self.assertEqual((self.repo / "branch.txt").read_text(), "branch work\n")
        self.assertEqual((self.repo / "base.txt").read_text(), "upstream work\n")
        self.assert_publishable()

    def test_conflicting_merge_aborts_without_losing_branch_work(self):
        self.publish_branch()
        self.git("checkout", self.branch)
        self.commit("common.txt", "branch version\n")
        self.git("push", "origin", self.branch)
        self.original_tip = self.git("rev-parse", "HEAD")
        self.git("checkout", "main")
        self.commit("common.txt", "main version\n")
        self.git("push", "origin", "main")
        self.sync(success=False)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_dirty_checkout_is_preserved(self):
        (self.repo / "common.txt").write_text("uncommitted\n")
        self.sync(success=False)
        self.assertEqual((self.repo / "common.txt").read_text(), "uncommitted\n")

    def test_non_automation_branch_is_rejected(self):
        self.branch = "main"
        self.sync(success=False)

    def test_goal_branch_uses_the_same_history_contract(self):
        self.branch = "goal/123-test-goal"
        self.publish_branch(unique=True)
        self.advance_main()
        self.sync()
        self.assert_publishable()

    def test_active_diverged_pr_does_not_incorporate_protected_base_changes(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.commit(".github/workflows/runtime.yml", "trusted base update\n")
        self.git("push", "origin", "main")
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)
        self.assertFalse((self.repo / ".github/workflows/runtime.yml").exists())
        self.commit("repair.txt", "focused repair\n")
        self.assertEqual(self.git("diff", "--name-only", f"{self.original_tip}..HEAD"), "repair.txt")
        self.git("push", "origin", self.branch)

    def test_active_behind_pr_does_not_fast_forward_to_base(self):
        self.publish_branch()
        self.active_pr()
        self.advance_main()
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)

    def test_closed_squash_merged_branch_reuse_preserves_history_and_clean_new_pr_delta(self):
        self.publish_branch(unique=True)
        self.git("merge", "--squash", self.branch)
        self.git("commit", "-m", "Squash previous PR")
        self.commit(".github/workflows/runtime.yml", "new trusted workflow\n")
        self.git("push", "origin", "main")
        self.sync()
        self.assertEqual(self.git("diff", "--name-only", "origin/main..HEAD"), "")
        self.commit("next.txt", "next checkpoint\n")
        self.assertEqual(self.git("diff", "--name-only", "origin/main..HEAD"), "next.txt")
        self.assert_publishable()

    def test_old_branch_owned_helpers_cannot_replace_trusted_preparation(self):
        self.commit(".github/workflows/scripts/sync_automation_branch.sh", "exit 99\n")
        self.commit(".github/workflows/scripts/automation_branch_state.py", "raise RuntimeError('old branch')\n")
        self.git("push", "origin", "main")
        self.publish_branch(unique=True)
        self.active_pr()
        self.advance_main()
        self.sync()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.original_tip)

    def test_missing_selection_fails_before_switching(self):
        self.publish_branch(unique=True)
        self.sync(success=False, selection=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_malformed_selection_fails_before_switching(self):
        self.publish_branch(unique=True)
        self.selection.write_text("{")
        self.sync(success=False, selection=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_api_error_or_malformed_evidence_never_refreshes_base(self):
        self.publish_branch(unique=True)
        self.advance_main()
        for response in ("{", "{}", "null", '[{"number":42}]'):
            with self.subTest(response=response):
                self.response.write_text(response)
                self.sync(success=False)
                self.assertEqual(self.git("branch", "--show-current"), "main")
        self.response.write_text("[]")
        self.env["BRANCH_API_FAIL"] = "1"
        self.sync(success=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_closed_selected_pr_does_not_authorize_a_base_refresh(self):
        self.publish_branch(unique=True)
        self.existing_pr = 42
        self.advance_main()
        self.sync(success=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_missing_active_branch_is_not_recreated(self):
        self.active_pr()
        self.sync(success=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_unpublished_clean_local_commits_are_preserved(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.git("checkout", self.branch)
        self.commit("unpublished.txt", "do not discard\n")
        unpublished = self.git("rev-parse", "HEAD")
        self.git("checkout", "main")
        self.sync(success=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")
        self.assertEqual(self.git("rev-parse", self.branch), unpublished)

    def test_bound_head_drift_fails_before_checkout(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.sync()
        self.git("checkout", "main")
        self.git("update-ref", "refs/remotes/origin/" + self.branch, self.initial)
        self.sync(success=False, selection=False, snapshot=False)
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_base_drift_is_irrelevant_for_resume_but_blocks_refresh(self):
        for active in (True, False):
            with self.subTest(active=active):
                self.existing_pr = None
                self.response.write_text("[]")
                if active:
                    self.active_pr()
                self.selection.write_text(json.dumps({"selected": "test-program", "head_branch": self.branch,
                                                      "existing_pr": self.existing_pr}))
                # Publish exactly the base tip as this iteration's remote head.
                if not self.git("ls-remote", "--heads", "origin", "refs/heads/" + self.branch):
                    self.publish_branch()
                self.write_snapshot()
                self.commit("base.txt", f"main drift {active}\n")
                self.git("push", "origin", "main")
                self.sync(success=active, selection=False, snapshot=False)
                self.git("checkout", "main")

    def test_dirty_trusted_config_overlay_is_preserved(self):
        self.publish_branch(unique=True)
        self.active_pr()
        overlay = self.repo / ".github/workflows/goal.md"
        overlay.parent.mkdir(parents=True)
        overlay.write_text("trusted framework overlay\n")
        result = self.sync(success=False)
        self.assertIn("workflow_dispatch or issue context", result.stderr)
        self.assertEqual(overlay.read_text(), "trusted framework overlay\n")
        self.assertEqual(self.git("branch", "--show-current"), "main")

    def test_missing_expired_and_wrong_run_evidence_fail_before_checkout(self):
        self.publish_branch(unique=True)
        self.active_pr()
        self.selection.write_text(json.dumps({"selected": "test-program", "head_branch": self.branch,
                                              "existing_pr": self.existing_pr}))
        self.sync(success=False, selection=False, snapshot=False)
        self.write_snapshot()
        original = json.loads(self.evidence.read_text())
        for changes in ({"captured_at": time.time() - 301}, {"run_id": "456"},
                        {"selection_digest": "wrong"}):
            self.evidence.write_text(json.dumps({**original, **changes}))
            self.sync(success=False, selection=False, snapshot=False)
            self.assertEqual(self.git("branch", "--show-current"), "main")


if __name__ == "__main__":
    unittest.main()
