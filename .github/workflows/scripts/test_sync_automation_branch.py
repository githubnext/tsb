"""Exercise automation branch synchronization against real, local Git remotes."""
import os
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


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
        gh.write_text('#!/bin/sh\nif [ "$BRANCH_API_FAIL" = "1" ]; then exit 1; fi\ncat "$BRANCH_API_RESPONSE"\n')
        gh.chmod(0o755)
        self.response = self.root / "pulls.json"
        self.response.write_text("[]")
        self.selection = self.root / "selection.json"
        self.existing_pr = None
        self.env = {
            **os.environ,
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "GITHUB_REPOSITORY": "example/repo",
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

    def sync(self, success=True, selection=True):
        if selection:
            if self.branch.startswith("goal/"):
                data = {"selected": {"branch": self.branch, "existing_pr": self.existing_pr}}
            else:
                data = {"selected": "test-program", "head_branch": self.branch, "existing_pr": self.existing_pr}
            self.selection.write_text(json.dumps(data))
        remote_before = self.git("ls-remote", "origin")
        result = subprocess.run(
            ["bash", str(self.actions / SCRIPT.name), self.branch, "main", str(self.selection)],
            cwd=self.repo, env=self.env, text=True, capture_output=True,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(self.git("branch", "--show-current"), self.branch)
        else:
            self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git("ls-remote", "origin"), remote_before)
        return result

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


if __name__ == "__main__":
    unittest.main()
