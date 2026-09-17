"""Prevent absent, stale, duplicate, or skipped CI evidence from passing."""
import copy
import io
import json
import unittest
from unittest.mock import patch

from automation_ci import (REQUIRED_JOBS, ci_status, latest_run_id, main,
                           mcp_pull_request_checks, mcp_runs, pr_ci_status, rest_pull_request_checks,
                           rest_run_with_jobs, rest_runs)


class AutomationCITest(unittest.TestCase):
    def passing_run(self):
        return {
            "headSha": "current",
            "status": "completed",
            "conclusion": "success",
            "jobs": [
                {"name": name, "status": "completed", "conclusion": "success"}
                for name in REQUIRED_JOBS
            ],
        }

    def test_no_runs_has_no_candidate(self):
        self.assertIsNone(latest_run_id([], "current"))

    def test_stale_sha_is_never_selected(self):
        self.assertIsNone(latest_run_id([{"headSha": "old"}], "current"))

    def test_latest_run_selected_by_time_then_id_not_response_order(self):
        runs = [
            {"headSha": "current", "createdAt": "2026-09-17T02:00:00Z", "databaseId": 3},
            {"headSha": "current", "createdAt": "2026-09-17T01:00:00Z", "databaseId": 1},
            {"headSha": "current", "createdAt": "2026-09-17T02:00:00Z", "databaseId": 2},
            {"headSha": "old", "createdAt": "2026-09-17T03:00:00Z", "databaseId": 4},
        ]
        self.assertEqual(latest_run_id(runs, "current"), 3)

    def test_all_four_current_gates_are_required(self):
        self.assertEqual(ci_status(self.passing_run(), "current"), "success")
        run = self.passing_run()
        run["jobs"].pop()
        self.assertEqual(ci_status(run, "current"), "pending")

    def test_empty_jobs_do_not_pass(self):
        run = self.passing_run()
        run["jobs"] = []
        self.assertEqual(ci_status(run, "current"), "pending")

    def test_old_head_success_is_pending(self):
        self.assertEqual(ci_status(self.passing_run(), "new-head"), "pending")

    def test_nonterminal_run_and_jobs_are_pending(self):
        for state in ("queued", "in_progress", "waiting"):
            with self.subTest(state=state):
                run = self.passing_run()
                run["status"] = state
                self.assertEqual(ci_status(run, "current"), "pending")
                run = self.passing_run()
                run["jobs"][0]["status"] = state
                self.assertEqual(ci_status(run, "current"), "pending")

    def test_failed_and_skipped_gates_do_not_pass(self):
        for conclusion in ("failure", "cancelled", "skipped", "neutral", "timed_out", ""):
            with self.subTest(conclusion=conclusion):
                run = self.passing_run()
                run["jobs"][0]["conclusion"] = conclusion
                self.assertEqual(ci_status(run, "current"), "failure")
                run = self.passing_run()
                run["conclusion"] = conclusion
                self.assertEqual(ci_status(run, "current"), "failure")

    def test_duplicate_failed_gate_cannot_hide_behind_success(self):
        run = self.passing_run()
        run["jobs"].append({
            "name": "Build", "status": "completed", "conclusion": "failure",
        })
        self.assertEqual(ci_status(run, "current"), "failure")

    def test_green_run_cannot_mask_failing_or_pending_pr_gates(self):
        self.assertEqual(ci_status(self.passing_run(), "current"), "success")
        for status, conclusion in (("COMPLETED", "FAILURE"), ("IN_PROGRESS", "")):
            with self.subTest(status=status):
                pull = {
                    "headRefOid": "current",
                    "statusCheckRollup": self.passing_run()["jobs"] + [{
                        "name": "Build", "status": status, "conclusion": conclusion,
                    }],
                }
                self.assertNotEqual(pr_ci_status(pull, "current"), "success")

    def test_pr_checks_require_all_gates_for_the_current_head(self):
        pull = {"headRefOid": "current", "statusCheckRollup": self.passing_run()["jobs"]}
        self.assertEqual(pr_ci_status(pull, "current"), "success")
        self.assertEqual(pr_ci_status(pull, "new-head"), "pending")
        pull["statusCheckRollup"].pop()
        self.assertEqual(pr_ci_status(pull, "current"), "pending")

    def test_classic_status_contexts_are_checked(self):
        pull = {
            "headRefOid": "current",
            "statusCheckRollup": [{"context": name, "state": "SUCCESS"} for name in REQUIRED_JOBS],
        }
        self.assertEqual(pr_ci_status(pull, "current"), "success")
        for state in ("PENDING", "ERROR", "FAILURE"):
            pull["statusCheckRollup"][0]["state"] = state
            self.assertNotEqual(pr_ci_status(pull, "current"), "success")


class RestAutomationCITest(unittest.TestCase):
    SHA = "a" * 40
    OLD = "b" * 40

    def run_payload(self):
        return {"id": 42, "path": ".github/workflows/ci.yml", "head_sha": self.SHA,
                "created_at": "2026-09-17T17:31:09Z", "status": "completed",
                "conclusion": "success"}

    def jobs(self):
        return [{"id": index, "run_id": 42, "head_sha": self.SHA, "name": name,
                 "status": "completed", "conclusion": "success"}
                for index, name in enumerate(sorted(REQUIRED_JOBS), 1)]

    def run_and_jobs(self):
        return {"run": self.run_payload(), "jobs": {"total_count": 4, "jobs": self.jobs()}}

    def pull_checks(self):
        return {"pull_request": {"head": {"sha": self.SHA}},
                "check_runs": {"total_count": 4, "check_runs": self.jobs()},
                "status": {"sha": self.SHA, "total_count": 0, "statuses": []}}

    def test_actual_rest_field_names_are_normalized(self):
        runs = rest_runs({"total_count": 1, "workflow_runs": [self.run_payload()]})
        self.assertEqual(latest_run_id(runs, self.SHA), 42)
        self.assertIsNone(latest_run_id(runs, self.OLD))
        self.assertEqual(ci_status(rest_run_with_jobs(self.run_and_jobs()), self.SHA), "success")
        self.assertEqual(pr_ci_status(rest_pull_request_checks(self.pull_checks()), self.SHA), "success")

    def test_missing_malformed_or_incomplete_lists_are_not_evidence(self):
        for payload in (None, {}, {"workflow_runs": []},
                        {"total_count": 1, "workflow_runs": []},
                        {"total_count": False, "workflow_runs": []},
                        {"total_count": 1, "workflow_runs": [None]}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                rest_runs(payload)
        for key, rows in (("jobs", "jobs"), ("check_runs", "check_runs"), ("status", "statuses")):
            payload = self.run_and_jobs() if key == "jobs" else self.pull_checks()
            payload[key]["total_count"] += 1
            adapter = rest_run_with_jobs if key == "jobs" else rest_pull_request_checks
            with self.subTest(key=key), self.assertRaises(ValueError):
                adapter(payload)

    def test_wrong_workflow_or_invalid_run_identity_is_rejected(self):
        for field, value in (("path", ".github/workflows/goal.lock.yml"), ("id", True),
                             ("id", 0), ("head_sha", "short"), ("created_at", "today")):
            payload = self.run_and_jobs()
            payload["run"][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                rest_run_with_jobs(payload)

    def test_jobs_cannot_be_borrowed_from_a_green_different_run(self):
        for field, value in (("run_id", 43), ("head_sha", self.OLD)):
            payload = self.run_and_jobs()
            payload["jobs"]["jobs"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                rest_run_with_jobs(payload)

    def test_checks_and_classic_statuses_must_match_pr_head(self):
        payload = self.pull_checks()
        payload["check_runs"]["check_runs"][0]["head_sha"] = self.OLD
        with self.assertRaises(ValueError):
            rest_pull_request_checks(payload)
        payload = self.pull_checks()
        payload["status"]["sha"] = self.OLD
        with self.assertRaises(ValueError):
            rest_pull_request_checks(payload)
        payload = self.pull_checks()
        del payload["check_runs"]["check_runs"][0]["conclusion"]
        with self.assertRaises(ValueError):
            rest_pull_request_checks(payload)

    def test_duplicate_failed_check_and_classic_status_still_block(self):
        payload = self.pull_checks()
        failed = {**payload["check_runs"]["check_runs"][0], "conclusion": "failure"}
        payload["check_runs"]["check_runs"].append(failed)
        payload["check_runs"]["total_count"] += 1
        self.assertEqual(pr_ci_status(rest_pull_request_checks(payload), self.SHA), "failure")
        payload = self.pull_checks()
        payload["status"].update(total_count=1, statuses=[{"context": "Build", "state": "pending"}])
        self.assertEqual(pr_ci_status(rest_pull_request_checks(payload), self.SHA), "pending")

    def test_empty_complete_evidence_is_pending_not_success(self):
        self.assertEqual(rest_runs({"total_count": 0, "workflow_runs": []}), [])
        payload = self.run_and_jobs()
        payload["jobs"] = {"total_count": 0, "jobs": []}
        self.assertEqual(ci_status(rest_run_with_jobs(payload), self.SHA), "pending")
        payload = self.pull_checks()
        payload["check_runs"] = {"total_count": 0, "check_runs": []}
        self.assertEqual(pr_ci_status(rest_pull_request_checks(payload), self.SHA), "pending")

    def test_rest_cli_modes_do_not_require_auth_or_subprocesses(self):
        cases = [("rest-select", {"total_count": 1, "workflow_runs": [self.run_payload()]}, "42"),
                 ("rest-status", self.run_and_jobs(), "success"),
                 ("rest-pr-status", self.pull_checks(), "success")]
        for mode, payload, expected in cases:
            before = copy.deepcopy(payload)
            with self.subTest(mode=mode), patch("sys.stdin", io.StringIO(json.dumps(payload))), \
                    patch("sys.stdout", new_callable=io.StringIO) as output:
                self.assertEqual(main([mode, self.SHA]), 0)
                self.assertEqual(output.getvalue().strip(), expected)
            self.assertEqual(payload, before)


class McpAutomationCITest(unittest.TestCase):
    SHA = RestAutomationCITest.SHA
    OLD = RestAutomationCITest.OLD
    run_payload = RestAutomationCITest.run_payload
    jobs = RestAutomationCITest.jobs
    pull_checks = RestAutomationCITest.pull_checks

    def mcp_checks(self):
        payload = self.pull_checks()
        payload["pull_request"]["base"] = {"repo": {"full_name": "githubnext/tsb"}}
        for check in payload["check_runs"]["check_runs"]:
            check["html_url"] = f"https://github.com/githubnext/tsb/actions/runs/42/job/{check['id']}"
        payload["job_receipts"] = [
            {**check, "check_run_url": f"https://api.github.com/repos/githubnext/tsb/check-runs/{check['id']}"}
            for check in payload["check_runs"]["check_runs"]]
        for check in payload["check_runs"]["check_runs"]:
            del check["head_sha"]
            del check["run_id"]
        return payload

    def first_page(self, count=1, total=None):
        return {"page": 1, "per_page": 100, "runs": {
            "total_count": count if total is None else total,
            "workflow_runs": [{**self.run_payload(), "id": 1000 - index}
                              for index in range(count)]}}

    def test_truthful_bounded_first_page_does_not_require_all_history(self):
        payload = self.first_page(100, 900)
        self.assertEqual(latest_run_id(mcp_runs(payload), self.SHA), 1000)
        self.assertEqual(payload["runs"]["total_count"], 900)
        self.assertIsNone(latest_run_id(mcp_runs(payload), self.OLD))
        self.assertEqual(mcp_runs(self.first_page(0)), [])

    def test_first_page_rejects_missing_rows_wrong_page_and_order(self):
        for field, value in (("page", 2), ("page", True), ("per_page", 30)):
            payload = self.first_page()
            payload[field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                mcp_runs(payload)
        for payload in (self.first_page(99, 900), self.first_page(1, True), self.first_page(1, -1)):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                mcp_runs(payload)
        payload = self.first_page(2)
        payload["runs"]["workflow_runs"].reverse()
        with self.assertRaises(ValueError):
            mcp_runs(payload)
        payload["runs"]["workflow_runs"][0] = payload["runs"]["workflow_runs"][1]
        with self.assertRaises(ValueError):
            mcp_runs(payload)

    def test_minimized_checks_are_bound_without_inventing_head_sha(self):
        payload = self.mcp_checks()
        before = copy.deepcopy(payload)
        self.assertEqual(pr_ci_status(mcp_pull_request_checks(payload), self.SHA), "success")
        self.assertEqual(payload, before)
        with self.assertRaises(ValueError):
            rest_pull_request_checks(payload)

    def test_absent_minimized_or_stale_receipt_fails_closed(self):
        for field, value in (("head_sha", self.OLD), ("head_sha", None),
                             ("check_run_url", None), ("run_id", True),
                             ("check_run_url", "https://api.github.com/repos/other/repo/check-runs/1")):
            payload = self.mcp_checks()
            payload["job_receipts"][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                mcp_pull_request_checks(payload)
        payload = self.mcp_checks()
        payload["job_receipts"].pop()
        with self.assertRaises(ValueError):
            mcp_pull_request_checks(payload)

    def test_receipt_must_agree_with_each_required_check(self):
        for field, value in (("name", "another job"), ("status", "queued"),
                             ("conclusion", "failure"), ("html_url", "https://example.com")):
            payload = self.mcp_checks()
            payload["job_receipts"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                mcp_pull_request_checks(payload)
        payload = self.mcp_checks()
        payload["job_receipts"][0]["conclusion"] = {"success": True}
        payload["check_runs"]["check_runs"][0]["conclusion"] = {"success": True}
        with self.assertRaises(ValueError):
            mcp_pull_request_checks(payload)

    def test_duplicate_required_names_across_runs_cannot_hide_failure(self):
        for conclusion in ("success", "failure"):
            payload = self.mcp_checks()
            check = {**payload["check_runs"]["check_runs"][0], "id": 900,
                     "conclusion": conclusion, "html_url": "https://github.com/githubnext/tsb/actions/runs/43/job/900"}
            payload["check_runs"]["check_runs"].append(check)
            payload["check_runs"]["total_count"] += 1
            payload["job_receipts"].append({**check, "run_id": 43, "head_sha": self.SHA,
                                          "check_run_url": "https://api.github.com/repos/githubnext/tsb/check-runs/900"})
            self.assertEqual(pr_ci_status(mcp_pull_request_checks(payload), self.SHA), conclusion)

    def test_incomplete_payload_or_duplicate_identity_is_unavailable(self):
        for key in ("check_runs", "status"):
            payload = self.mcp_checks()
            payload[key]["total_count"] += 1
            with self.subTest(key=key), self.assertRaises(ValueError):
                mcp_pull_request_checks(payload)
        for key, rows in (("job_receipts", None), ("check_runs", "check_runs")):
            payload = self.mcp_checks()
            collection = payload[key] if rows is None else payload[key][rows]
            collection.append(copy.deepcopy(collection[0]))
            if rows:
                payload[key]["total_count"] += 1
            with self.subTest(key=key), self.assertRaises(ValueError):
                mcp_pull_request_checks(payload)

    def test_classic_statuses_and_no_checks_remain_strict(self):
        payload = self.mcp_checks()
        payload["status"].update(total_count=1, statuses=[{"context": "Build", "state": "pending"}])
        self.assertEqual(pr_ci_status(mcp_pull_request_checks(payload), self.SHA), "pending")
        payload["status"]["sha"] = self.OLD
        with self.assertRaises(ValueError):
            mcp_pull_request_checks(payload)
        payload = self.mcp_checks()
        payload["check_runs"] = {"total_count": 0, "check_runs": []}
        payload["job_receipts"] = []
        self.assertEqual(pr_ci_status(mcp_pull_request_checks(payload), self.SHA), "pending")

    def test_mcp_cli_modes_are_offline_and_preserve_original_payload(self):
        for mode, payload, expected in (("mcp-select", self.first_page(), "1000"),
                                        ("mcp-pr-status", self.mcp_checks(), "success")):
            before = copy.deepcopy(payload)
            with self.subTest(mode=mode), patch("sys.stdin", io.StringIO(json.dumps(payload))), \
                    patch("sys.stdout", new_callable=io.StringIO) as output:
                self.assertEqual(main([mode, self.SHA]), 0)
                self.assertEqual(output.getvalue().strip(), expected)
            self.assertEqual(payload, before)


if __name__ == "__main__":
    unittest.main()
