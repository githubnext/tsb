"""Branch freshness is selected from explicit scheduler and exact live PR evidence."""

import copy
import json
import subprocess
import unittest
from unittest.mock import patch

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
            with self.subTest(selection=selection), patch.object(state, "github_open_prs") as api:
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

    def test_api_call_is_read_only_and_exact_branch_scoped(self):
        with patch.object(state.subprocess, "run") as command:
            command.return_value.stdout = json.dumps([PR])
            self.assertEqual(state.github_open_prs(REPOSITORY, BRANCH), [PR])
        self.assertEqual(command.call_args.args[0], [
            "gh", "api", "--method", "GET", "repos/example/repo/pulls", "-f", "state=open",
            "-f", "head=example:goal/42-goal", "-F", "per_page=100"])
        self.assertTrue(command.call_args.kwargs["check"])
        self.assertEqual(command.call_args.kwargs["timeout"], 30)

    def test_invalid_repository_is_rejected_without_an_api_call(self):
        with self.assertRaises(ValueError):
            state.branch_mode(SELECTION, BRANCH, BASE, "../other/repo", lambda *_: self.fail())


if __name__ == "__main__":
    unittest.main()
