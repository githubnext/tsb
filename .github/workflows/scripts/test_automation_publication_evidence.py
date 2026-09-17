"""Offline fixtures for the host-only exact-candidate evidence collector."""
import copy
import io
import json
import unittest
import urllib.error
import urllib.parse
from unittest.mock import Mock, patch

from automation_ci import REQUIRED_JOBS
from automation_publication_evidence import (
    GitHubReader, MAX_RESPONSE_BYTES, _NoRedirect, all_pages, candidate_evidence,
)


REPO = "githubnext/tsb"
SHA, TREE, BASE = "a" * 40, "b" * 40, "c" * 40
PREFIX = "/repos/" + REPO
PR_PATH = PREFIX + "/pulls/503"
RUN_PATH = PREFIX + "/actions/runs/1001"
BRANCH = "autoloop/perf-comparison"


def review(identity, state, reviewer=7):
    return {"id": identity, "user": {"id": reviewer}, "state": state,
            "submitted_at": None if state == "PENDING" else f"2026-09-17T00:00:{identity:02d}Z"}


class Fixture:
    def __init__(self):
        self.calls = []
        self.pr = {"id": 5003, "number": 503, "state": "open", "merged": False,
                   "head": {"ref": BRANCH, "sha": SHA, "repo": {"full_name": REPO}},
                   "base": {"ref": "main", "sha": BASE, "repo": {"full_name": REPO}}}
        self.run = {"id": 1001, "path": ".github/workflows/ci.yml", "head_sha": SHA,
                    "head_branch": BRANCH, "created_at": "2026-09-17T01:00:00Z",
                    "run_attempt": 2, "status": "completed", "conclusion": "success",
                    "repository": {"full_name": REPO}, "head_repository": {"full_name": REPO}}
        self.runs = [self.run]
        self.jobs = [{"id": index + 10, "run_id": 1001, "head_sha": SHA, "name": name,
                      "status": "completed", "conclusion": "success"}
                     for index, name in enumerate(sorted(REQUIRED_JOBS))]
        self.checks = [{"id": index + 20, "head_sha": SHA, "name": name,
                        "status": "completed", "conclusion": "success", "app": {"id": 15368}}
                       for index, name in enumerate(sorted(REQUIRED_JOBS))]
        self.statuses, self.reviews = [], []
        self.commit = {"sha": SHA, "tree": {"sha": TREE}}
        self.hook = None

    def get(self, path):
        self.calls.append(path)
        if self.hook:
            self.hook(path, self)
        parsed = urllib.parse.urlsplit(path)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path == PR_PATH:
            return copy.deepcopy(self.pr)
        if parsed.path == PREFIX + "/git/commits/" + SHA:
            return copy.deepcopy(self.commit)
        if parsed.path == RUN_PATH:
            return copy.deepcopy(self.run)
        if query.get("per_page") != ["100"]:
            raise AssertionError("Collector omitted truthful REST page size")
        page = int(query["page"][0])
        table = {
            PR_PATH + "/reviews": (None, self.reviews),
            PREFIX + "/actions/workflows/ci.yml/runs": ("workflow_runs", self.runs),
            RUN_PATH + "/attempts/2/jobs": ("jobs", self.jobs),
            PREFIX + "/commits/" + SHA + "/check-runs": ("check_runs", self.checks),
            PREFIX + "/commits/" + SHA + "/status": ("statuses", self.statuses),
        }
        key, rows = table[parsed.path]
        if key == "workflow_runs":
            assert query.get("head_sha") == [SHA]
        if key == "check_runs":
            assert query.get("filter") == ["latest"]
        batch = copy.deepcopy(rows[(page - 1) * 100:page * 100])
        if key is None:
            return batch
        result = {"total_count": len(rows), key: batch}
        if key == "statuses":
            result.update({"sha": SHA, "state": "success"})
        return result

    def collect(self):
        return candidate_evidence(REPO, 503, BRANCH, "main", SHA, TREE, self.get)


class EvidenceTests(unittest.TestCase):
    def test_success_binds_head_tree_current_attempt_and_fresh_reads(self):
        fixture = Fixture()
        result = fixture.collect()
        self.assertEqual((result["head_sha"], result["tree_sha"], result["run_id"], result["run_attempt"]),
                         (SHA, TREE, 1001, 2))
        self.assertEqual(result["ci"], "success")
        self.assertEqual(fixture.calls.count(PR_PATH), 2)
        self.assertEqual(fixture.calls.count(RUN_PATH), 2)
        self.assertTrue(any("/attempts/2/jobs?" in path for path in fixture.calls))

    def test_wrong_head_tree_repo_branch_base_and_closed_pr_fail(self):
        mutations = [lambda f: f.pr["head"].update(sha="d" * 40),
                     lambda f: f.commit["tree"].update(sha="d" * 40),
                     lambda f: f.commit.update(sha="d" * 40),
                     lambda f: f.pr["head"]["repo"].update(full_name="other/fork"),
                     lambda f: f.pr["base"]["repo"].update(full_name="other/fork"),
                     lambda f: f.pr["head"].update(ref="other"),
                     lambda f: f.pr["base"].update(ref="other"),
                     lambda f: f.pr["head"]["repo"].update(full_name=123),
                     lambda f: f.pr.update(state="closed"),
                     lambda f: f.pr.update(merged=True),
                     lambda f: f.pr.update(number=True)]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                fixture = Fixture()
                mutate(fixture)
                with self.assertRaises(ValueError):
                    fixture.collect()

    def test_missing_failed_skipped_or_pending_required_job_fails(self):
        for change in ("missing", "failure", "skipped", "pending"):
            fixture = Fixture()
            if change == "missing":
                fixture.jobs.pop()
            elif change == "pending":
                fixture.jobs[0].update(status="in_progress", conclusion=None)
            else:
                fixture.jobs[0]["conclusion"] = change
            with self.subTest(change=change), self.assertRaises(ValueError):
                fixture.collect()

    def test_rollup_is_fetched_independently_and_all_required_rows_must_pass(self):
        for change in ("missing", "failure", "duplicate_failure", "classic_failure"):
            fixture = Fixture()
            if change == "missing":
                fixture.checks.pop()
            elif change == "failure":
                fixture.checks[0]["conclusion"] = "failure"
            elif change == "duplicate_failure":
                fixture.checks.append({**fixture.checks[0], "id": 200, "conclusion": "failure"})
            else:
                fixture.statuses = [{"id": 300, "context": fixture.jobs[0]["name"], "state": "failure"}]
            with self.subTest(change=change), self.assertRaises(ValueError):
                fixture.collect()

    def test_wrong_job_run_or_check_head_fails(self):
        for target, field, value in (("jobs", "run_id", 1002), ("jobs", "head_sha", "d" * 40),
                                     ("checks", "head_sha", "d" * 40)):
            fixture = Fixture()
            getattr(fixture, target)[0][field] = value
            with self.subTest(target=target, field=field), self.assertRaises(ValueError):
                fixture.collect()

    def test_required_checks_must_be_native_github_actions_not_classic_substitutes(self):
        for kind in ("foreign_app", "missing_app", "classic_substitute", "foreign_duplicate"):
            fixture = Fixture()
            if kind == "foreign_app":
                fixture.checks[0]["app"] = {"id": 999}
            elif kind == "missing_app":
                del fixture.checks[0]["app"]
            elif kind == "classic_substitute":
                check = fixture.checks.pop()
                fixture.statuses = [{"id": 300, "context": check["name"], "state": "success"}]
            else:
                fixture.checks.append({**fixture.checks[0], "id": 300, "app": {"id": 999}})
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                fixture.collect()

    def test_wrong_ci_workflow_repo_or_head_fails(self):
        mutations = [lambda f: f.run.update(path=".github/workflows/unrelated.yml"),
                     lambda f: f.run.update(head_sha="d" * 40),
                     lambda f: f.run.update(head_branch="other"),
                     lambda f: f.run["repository"].update(full_name="other/repo"),
                     lambda f: f.run["head_repository"].update(full_name="other/repo"),
                     lambda f: f.run["head_repository"].update(full_name=None),
                     lambda f: f.run.update(run_attempt=True)]
        for mutate in mutations:
            fixture = Fixture()
            mutate(fixture)
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                fixture.collect()

    def test_absent_ci_run_fails(self):
        fixture = Fixture()
        fixture.runs = []
        with self.assertRaises(ValueError):
            fixture.collect()

    def test_latest_run_selected_not_older_success(self):
        fixture = Fixture()
        fixture.runs.append({**fixture.run, "id": 1002, "created_at": "2026-09-17T02:00:00Z",
                             "status": "in_progress", "conclusion": None})
        with self.assertRaises(ValueError):
            fixture.collect()

    def test_latest_decisive_review_per_reviewer(self):
        for rows, succeeds in (
                ([review(1, "CHANGES_REQUESTED")], False),
                ([review(1, "CHANGES_REQUESTED"), review(2, "COMMENTED")], False),
                ([review(1, "CHANGES_REQUESTED"), review(2, "PENDING")], False),
                ([review(1, "CHANGES_REQUESTED"), review(2, "APPROVED")], True),
                ([review(1, "CHANGES_REQUESTED"), review(2, "DISMISSED")], False),
                ([review(1, "DISMISSED")], True),
                ([review(1, "APPROVED"), review(2, "CHANGES_REQUESTED")], False),
                ([review(1, "CHANGES_REQUESTED"), review(2, "APPROVED", reviewer=8)], False)):
            fixture = Fixture()
            fixture.reviews = rows
            with self.subTest(rows=rows):
                if succeeds:
                    self.assertEqual(fixture.collect()["ci"], "success")
                else:
                    with self.assertRaises(ValueError):
                        fixture.collect()

    def test_dismissing_the_actual_objection_clears_it(self):
        fixture = Fixture()
        fixture.reviews = [review(1, "CHANGES_REQUESTED"), review(2, "COMMENTED")]
        with self.assertRaises(ValueError):
            fixture.collect()
        fixture.reviews[0]["state"] = "DISMISSED"
        self.assertEqual(fixture.collect()["ci"], "success")

    def test_malformed_review_fails(self):
        for row in ({**review(1, "APPROVED"), "state": "UNKNOWN"},
                    {**review(1, "APPROVED"), "submitted_at": None},
                    {**review(1, "APPROVED"), "user": None}):
            fixture = Fixture()
            fixture.reviews = [row]
            with self.subTest(row=row), self.assertRaises(ValueError):
                fixture.collect()

    def test_final_head_base_and_review_changes_fail(self):
        for kind in ("head", "base", "review", "comment"):
            fixture = Fixture()
            def hook(path, current):
                if kind in ("head", "base") and path == PR_PATH and current.calls.count(path) == 2:
                    current.pr[kind]["sha"] = "d" * 40
                if kind in ("review", "comment") and "/reviews?" in path and current.calls.count(path) == 2:
                    current.reviews = [review(1, "CHANGES_REQUESTED" if kind == "review" else "COMMENTED")]
            fixture.hook = hook
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                fixture.collect()

    def test_final_new_run_or_new_attempt_fails(self):
        for kind in ("run", "attempt"):
            fixture = Fixture()
            def hook(path, current):
                if "/workflows/ci.yml/runs?" in path and current.calls.count(path) == 2:
                    if kind == "run":
                        current.runs.append({**current.run, "id": 1002, "created_at": "2026-09-17T02:00:00Z"})
                    else:
                        current.run["run_attempt"] = 3
            fixture.hook = hook
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                fixture.collect()

    def test_final_rollup_or_classic_status_change_fails(self):
        for kind in ("checks", "statuses"):
            fixture = Fixture()
            def hook(path, current):
                marker = "/check-runs?" if kind == "checks" else "/status?"
                if marker in path and current.calls.count(path) == 2:
                    if kind == "checks":
                        current.checks[0].update(status="queued", conclusion=None)
                    else:
                        current.statuses = [{"id": 300, "context": current.jobs[0]["name"], "state": "pending"}]
            fixture.hook = hook
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                fixture.collect()

    def test_multiple_pages_collected_for_jobs_checks_and_reviews(self):
        fixture = Fixture()
        fixture.jobs += [{**fixture.jobs[0], "id": 100 + index, "name": "Extra " + str(index)} for index in range(101)]
        fixture.checks += [{**fixture.checks[0], "id": 300 + index, "name": "Extra " + str(index)} for index in range(101)]
        fixture.reviews = [{**review(1, "COMMENTED"), "id": 500 + index} for index in range(101)]
        self.assertEqual(fixture.collect()["ci"], "success")
        self.assertGreaterEqual(sum("page=2" in path for path in fixture.calls), 4)

    def test_api_errors_and_scalar_payloads_fail_without_error_detail(self):
        def fail(_path):
            raise RuntimeError("secret-token-untrusted-error")
        for get in (fail, lambda path: None, lambda path: "agent prose"):
            with self.subTest(get=get), self.assertRaises(ValueError) as caught:
                candidate_evidence(REPO, 503, BRANCH, "main", SHA, TREE, get)
            self.assertNotIn("secret-token", str(caught.exception))

    def test_invalid_inputs_do_not_request(self):
        for args in (("https://evil.test/repo", 503, BRANCH, "main", SHA, TREE),
                     (REPO, True, BRANCH, "main", SHA, TREE),
                     (REPO, 503, "../other", "main", SHA, TREE),
                     (REPO, 503, BRANCH, "main", "short", TREE)):
            request = Mock()
            with self.assertRaises(ValueError):
                candidate_evidence(*args, request)
            request.assert_not_called()


class PaginationTests(unittest.TestCase):
    def test_original_total_preserved(self):
        rows = [{"id": value} for value in range(1, 102)]
        def get(path):
            page = int(urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)["page"][0])
            return {"total_count": 101, "jobs": rows[(page - 1) * 100:page * 100], "marker": "actual"}
        result = all_pages(PREFIX + "/jobs", "jobs", get)
        self.assertEqual(result, {"total_count": 101, "jobs": rows, "marker": "actual"})

    def test_truncated_changed_total_duplicate_and_malformed_pages_fail(self):
        page = {"total_count": 101, "jobs": [{"id": i} for i in range(1, 101)]}
        cases = [[{"total_count": 101, "jobs": [{"id": 1}]}],
                 [page, {"total_count": 102, "jobs": [{"id": 101}, {"id": 102}]}],
                 [page, {"total_count": 101, "jobs": [{"id": 1}]}],
                 [{"total_count": True, "jobs": []}],
                 [{"total_count": 1001, "jobs": []}],
                 [{"total_count": 1, "jobs": [None]}],
                 [{"total_count": 1, "jobs": [{"id": True}]}],
                 [{"total_count": 1, "jobs": []}]]
        for pages in cases:
            responses = iter(pages)
            with self.subTest(pages=pages), self.assertRaises(ValueError):
                all_pages(PREFIX + "/jobs", "jobs", lambda path: next(responses))

    def test_array_requires_terminal_page_and_bounded_total(self):
        calls = []
        def get(path):
            calls.append(path)
            return [{"id": i} for i in range(1, 101)] if len(calls) == 1 else []
        self.assertEqual(len(all_pages(PR_PATH + "/reviews", None, get)), 100)
        self.assertEqual(len(calls), 2)
        def endless(path):
            page = int(urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)["page"][0])
            return [{"id": page * 100 + i} for i in range(100)]
        with self.assertRaises(ValueError):
            all_pages(PR_PATH + "/reviews", None, endless)

    def test_callers_cannot_supply_page_metadata_or_external_urls(self):
        for path in (PREFIX + "/jobs?page=2", PREFIX + "/jobs?per_page=30",
                     "https://evil.test/repos/x/y", "//evil.test/repos/x/y", PREFIX + "/../other"):
            request = Mock()
            with self.subTest(path=path), self.assertRaises(ValueError):
                all_pages(path, "jobs", request)
            request.assert_not_called()


class TransportTests(unittest.TestCase):
    def reader(self, payload=b'{"ok":true}', status=200):
        reader = GitHubReader("host-only-secret")
        response = io.BytesIO(payload)
        response.status = status
        reader._opener = Mock()
        reader._opener.open.return_value = response
        return reader

    def test_host_token_is_only_in_https_get_header(self):
        reader = self.reader()
        self.assertEqual(reader.get(PREFIX + "/pulls/503"), {"ok": True})
        args, kwargs = reader._opener.open.call_args
        request = args[0]
        self.assertEqual(request.full_url, "https://api.github.com" + PR_PATH)
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.get_header("Authorization"), "Bearer host-only-secret")
        self.assertNotIn("host-only-secret", request.full_url)
        self.assertEqual(kwargs, {"timeout": 30})

    def test_external_path_and_missing_token_fail_before_transport(self):
        for token in (None, "", "bad\nheader", "with space"):
            with self.assertRaises(ValueError):
                GitHubReader(token)
        reader = self.reader()
        for path in ("https://evil.test/", "//evil.test/", "/repos/x/y#fragment", "/repos/x/y\n"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                reader.get(path)
        reader._opener.open.assert_not_called()

    def test_malformed_null_nonfinite_duplicate_oversized_non200_fail(self):
        for payload, status in ((b"no json", 200), (b"null", 200), (b'{"x":NaN}', 200),
                                (b'{"x":1,"x":2}', 200), (b"[]", 404),
                                (b" " * (MAX_RESPONSE_BYTES + 1), 200)):
            with self.subTest(status=status, size=len(payload)), self.assertRaises(ValueError):
                self.reader(payload, status).get(PR_PATH)

    def test_404_and_network_errors_are_never_absence_or_leaked(self):
        for error in (urllib.error.HTTPError(PR_PATH, 404, "host-only-secret", {}, None),
                      urllib.error.URLError("host-only-secret"), TimeoutError("host-only-secret")):
            reader = self.reader()
            reader._opener.open.side_effect = error
            with self.subTest(error=type(error)), self.assertRaises(ValueError) as caught:
                reader.get(PR_PATH)
            self.assertNotIn("host-only-secret", str(caught.exception))

    def test_redirect_handler_never_forwards_authorization(self):
        self.assertIsNone(_NoRedirect().redirect_request(None, None, 302, "", {}, "https://evil.test"))

    def test_reader_all_pages_uses_its_get(self):
        reader = self.reader(json.dumps({"total_count": 1, "jobs": [{"id": 1}]}).encode())
        self.assertEqual(reader.all_pages(PREFIX + "/jobs", "jobs"), {"total_count": 1, "jobs": [{"id": 1}]})

    def test_shared_deadline_stops_later_requests_and_caps_timeout(self):
        with patch("automation_publication_evidence.time.monotonic", return_value=100):
            reader = self.reader()
        with patch("automation_publication_evidence.time.monotonic", return_value=275):
            self.assertEqual(reader.get(PR_PATH), {"ok": True})
        self.assertEqual(reader._opener.open.call_args.kwargs["timeout"], 5)
        reader._opener.open.reset_mock()
        with patch("automation_publication_evidence.time.monotonic", return_value=280):
            with self.assertRaises(ValueError):
                reader.get(PR_PATH)
        reader._opener.open.assert_not_called()

    def test_response_arriving_after_shared_deadline_is_rejected(self):
        with patch("automation_publication_evidence.time.monotonic", return_value=100):
            reader = self.reader()
        with patch("automation_publication_evidence.time.monotonic", side_effect=[279, 281]):
            with self.assertRaises(ValueError):
                reader.get(PR_PATH)


if __name__ == "__main__":
    unittest.main()
