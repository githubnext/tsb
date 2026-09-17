"""Branch freshness is selected from explicit scheduler and exact live PR evidence."""

import copy
import json
import subprocess
import unittest
from unittest.mock import Mock

import automation_branch_state as state


REPOSITORY = "example/repo"
BRANCH = "goal/42-goal"
BASE = "main"
SELECTION = {"selected": {"branch": BRANCH, "existing_pr": 42}}
PR = {"number": 42, "state": "open",
      "head": {"ref": BRANCH, "repo": {"full_name": REPOSITORY}},
      "base": {"ref": BASE, "repo": {"full_name": REPOSITORY}}}


class AutomationBranchStateTest(unittest.TestCase):
    def mode(self, selection=SELECTION, evidence=None):
        return state.branch_mode(selection, BRANCH, BASE, REPOSITORY,
                                 lambda repo, branch: [PR] if evidence is None else evidence)

    def test_goal_and_autoloop_active_pr_resume(self):
        self.assertEqual(self.mode(), "resume")
        self.assertEqual(self.mode({"selected": "program", "head_branch": BRANCH,
                                    "existing_pr": 42}), "resume")

    def test_explicit_no_pr_and_empty_success_allow_base_refresh(self):
        self.assertEqual(self.mode({"selected": {"branch": BRANCH, "existing_pr": None}}, []),
                         "refresh-base")

    def test_invalid_selection_never_queries_github(self):
        for selection in (None, [], {}, {"selected": None}, {"selected": "program"},
                          {"selected": {"branch": BRANCH}},
                          {"selected": {"branch": "goal/other", "existing_pr": 42}},
                          {"error": "lookup failed", **SELECTION},
                          *({"selected": {"branch": BRANCH, "existing_pr": number}}
                            for number in (0, -1, True, "42", 1.5))):
            with self.subTest(selection=selection):
                api = Mock()
                with self.assertRaises(ValueError):
                    state.branch_mode(selection, BRANCH, BASE, REPOSITORY, api)
                api.assert_not_called()

    def test_stale_selection_never_refreshes_or_targets_another_pr(self):
        for selection, evidence in ((SELECTION, []),
                                    (SELECTION, [{**PR, "number": 43}]),
                                    ({"selected": {"branch": BRANCH, "existing_pr": None}}, [PR])):
            with self.subTest(evidence=evidence), self.assertRaisesRegex(ValueError, "stale"):
                self.mode(selection, evidence)

    def test_wrong_or_ambiguous_api_records_fail_closed(self):
        records = [None, {}, "invalid", [None], [PR, PR], [{"number": 42}],
                   [{**PR, "number": True}], [{**PR, "state": "closed"}]]
        for field in ("head", "base"):
            for replacement in (None, {}, {"ref": "different", "repo": {"full_name": REPOSITORY}},
                                {"ref": PR[field]["ref"], "repo": {"full_name": "fork/repo"}}):
                altered = copy.deepcopy(PR)
                altered[field] = replacement
                records.append([altered])
        for evidence in records:
            with self.subTest(evidence=evidence), self.assertRaises(ValueError):
                state.branch_mode(SELECTION, BRANCH, BASE, REPOSITORY, lambda *_: evidence)

    def test_api_errors_propagate_instead_of_becoming_no_open_prs(self):
        for error in (OSError("network"), subprocess.TimeoutExpired("gh", 30),
                      subprocess.CalledProcessError(1, "gh"), ValueError("invalid JSON")):
            with self.subTest(error=error):
                def fail(*_):
                    raise error
                with self.assertRaises(type(error)):
                    state.branch_mode(SELECTION, BRANCH, BASE, REPOSITORY, fail)

    def snapshot(self):
        return {"schema_version": 1, "status": "ready", "repository": REPOSITORY,
                "branch": BRANCH, "base": BASE, "existing_pr": 42, "mode": "resume",
                "run_id": "123", "run_attempt": "1", "captured_at": 1000,
                "head_sha": "a" * 40, "base_sha": "b" * 40,
                "selection_digest": state.selection_digest(SELECTION)}

    def validate(self, snapshot):
        return state.validate_snapshot(SELECTION, snapshot, BRANCH, BASE, REPOSITORY, "123", "1", now=1001)

    def test_snapshot_requires_exact_run_selection_and_ref_identity(self):
        original = self.snapshot()
        self.assertEqual(self.validate(original), original)
        for key, replacement in (("schema_version", True), ("status", "error"), ("repository", "fork/repo"),
                                 ("branch", "goal/other"), ("base", "other"), ("existing_pr", 43),
                                 ("existing_pr", 42.0), ("mode", "refresh-base"), ("run_id", "124"),
                                 ("run_attempt", "2"), ("selection_digest", "wrong"),
                                 ("head_sha", None), ("head_sha", "bad"), ("base_sha", "bad")):
            with self.subTest(key=key, replacement=replacement), self.assertRaises(ValueError):
                self.validate({**original, key: replacement})
        for key in original:
            with self.subTest(missing=key), self.assertRaises(ValueError):
                self.validate({name: value for name, value in original.items() if name != key})

    def test_expired_future_or_invalid_capture_times_fail_closed(self):
        for captured_at in (700, 1002, True, None, "1000", float("nan"), float("inf")):
            with self.subTest(captured_at=captured_at), self.assertRaises(ValueError):
                self.validate({**self.snapshot(), "captured_at": captured_at})

    def test_only_explicit_no_pr_allows_a_bound_absent_branch(self):
        selection = {"selected": {"branch": BRANCH, "existing_pr": None}}
        snapshot = {**self.snapshot(), "existing_pr": None, "head_sha": None,
                    "mode": "refresh-base", "selection_digest": state.selection_digest(selection)}
        self.assertEqual(state.validate_snapshot(selection, snapshot, BRANCH, BASE, REPOSITORY,
                                               "123", "1", now=1001), snapshot)

    def test_invalid_repository_is_rejected_without_an_api_call(self):
        with self.assertRaises(ValueError):
            state.branch_mode(SELECTION, BRANCH, BASE, "../other/repo", lambda *_: self.fail())


if __name__ == "__main__":
    unittest.main()
