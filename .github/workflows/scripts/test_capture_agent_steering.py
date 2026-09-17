"""Authenticated, bounded steering capture cannot confuse first pages with all feedback."""
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error

import capture_agent_steering as steering


NOW = 1_800_000_000
REPO = "example/repo"
HEAD = "b" * 40
SELECTION = {"selected": {"number": 42, "branch": "goal/42-goal", "existing_pr": 50,
                          "state_file": "42-goal.md"}}
TOKEN = "test-only-host-credential"


def snapshot(selection=SELECTION):
    return {"schema_version": 1, "status": "ready", "repository": REPO,
            "branch": steering.state.selection_branch(selection), "base": "main", "head_sha": HEAD,
            "base_sha": "a" * 40, "existing_pr": 50, "mode": "resume", "run_id": "123", "run_attempt": "1",
            "selection_digest": steering.state.selection_digest(selection), "captured_at": NOW}


def comment(identity=1, bot=False, body="Human correction", **extra):
    return {"id": identity, "user": {"login": "helper[bot]" if bot else "maintainer", "type": "Bot" if bot else "User"},
            "html_url": f"https://github.com/{REPO}/issues/42#issuecomment-{identity}",
            "body": body, "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
            "author_association": "MEMBER", **extra}


class Reader:
    api = "https://api.github.com"

    def __init__(self, selection=SELECTION):
        branch = steering.state.selection_branch(selection)
        self.routes = {
            f"/repos/{REPO}": {"id": 1234, "full_name": REPO},
            f"/repos/{REPO}/issues/42": {"number": 42, "state": "open", "comments": 1, "updated_at": "2026-01-01T00:00:00Z"},
            f"/repos/{REPO}/issues/42/comments?per_page=100&page=1": [comment()],
            f"/repos/{REPO}/pulls/50": {"number": 50, "state": "open", "comments": 0, "review_comments": 1,
                "updated_at": "2026-01-01T00:00:00Z", "head": {"ref": branch, "sha": HEAD, "repo": {"full_name": REPO}},
                "base": {"ref": "main", "repo": {"full_name": REPO}}},
            f"/repos/{REPO}/issues/50/comments?per_page=100&page=1": [],
            f"/repos/{REPO}/pulls/50/reviews?per_page=100&page=1": [comment(2, state="CHANGES_REQUESTED", submitted_at="2026-01-01T00:00:00Z", commit_id=HEAD)],
            f"/repos/{REPO}/pulls/50/comments?per_page=100&page=1": [comment(3, pull_request_review_id=2, path="tests/example.ts", line=5)],
            "/graphql": {"data": {"repository": {"nameWithOwner": REPO, "pullRequest": {
                "number": 50, "state": "OPEN", "headRefOid": HEAD, "headRefName": branch, "baseRefName": "main",
                "baseRepository": {"nameWithOwner": REPO}, "reviewDecision": "CHANGES_REQUESTED",
                "latestOpinionatedReviews": {"totalCount": 1, "nodes": [{"databaseId": 2, "state": "CHANGES_REQUESTED"}],
                    "pageInfo": {"hasNextPage": False, "endCursor": "one"}}}}}},
        }
        self.links = {}
        self.calls = []

    def request(self, route, payload=None):
        self.calls.append((route, payload))
        value = self.routes[route]
        if isinstance(value, Exception):
            raise value
        return copy.deepcopy(value), self.links.get(route, "")

    def connection(self):
        return self.routes["/graphql"]["data"]["repository"]["pullRequest"]["latestOpinionatedReviews"]


class CaptureTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.memory = Path(self.directory.name)
        self.reader = Reader()

    def capture(self, selection=SELECTION, evidence=None):
        return steering.capture(selection, evidence or snapshot(selection), self.memory, self.reader, REPO, "123", "1", now=NOW)

    def test_complete_selection_bound_untrusted_envelope(self):
        result = self.capture()
        self.assertTrue(result["complete"])
        self.assertEqual(result["active_changes_requested_review_ids"], [2])
        self.assertEqual(result["review_decision"], "CHANGES_REQUESTED")
        self.assertEqual(result["retained_items"], 3)
        self.assertEqual(result["head_sha"], HEAD)
        self.assertEqual(result["selection_digest"], steering.state.selection_digest(SELECTION))
        self.assertTrue(all(x["content_trust"] == "untrusted_repository_discussion" for x in result["items"]))
        self.assertIn("UNTRUSTED", result["notice"])
        self.assertNotIn(TOKEN, json.dumps(result))
        self.assertEqual(len(result["evidence_digest"]), 64)
        self.assertTrue(all(x["complete"] for x in result["collections"]))

    def test_334_comments_keeps_human_page_four_despite_advanced_last_run(self):
        route = f"/repos/{REPO}/issues/42/comments"
        self.reader.routes[f"/repos/{REPO}/issues/42"]["comments"] = 334
        for page in range(1, 5):
            start, end = (page - 1) * 100, min(page * 100, 334)
            key = route + f"?per_page=100&page={page}"
            self.reader.routes[key] = [comment(1000 + i, bot=i < 332) for i in range(start, end)]
            if page < 4:
                self.reader.links[key] = f'<https://api.github.com{route}?page={page + 1}&per_page=100>; rel="next"'
        (self.memory / "42-goal.md").write_text("## Machine State\n| Last Run | 2026-09-17T18:44Z (run 35259997105) |\n")
        result = self.capture()
        self.assertEqual([x["id"] for x in result["items"] if x["kind"] == "issue_comment"], [1332, 1333])
        self.assertFalse(result["memory"]["last_run_is_cutoff"])
        self.assertNotIn("since=", str(self.reader.calls))
        self.assertEqual(result["collections"][0]["raw_count"], 334)
        self.assertEqual(result["collections"][0]["pages"], 4)

    def test_bound_issue_and_pr_metadata_are_preserved_and_digest_covered(self):
        result = self.capture()
        expected = [
            {"route": f"/repos/{REPO}/issues/42", "number": 42, "state": "open",
             "updated_at": "2026-01-01T00:00:00Z", "comments": 1, "review_comments": None},
            {"route": f"/repos/{REPO}/pulls/50", "number": 50, "state": "open",
             "updated_at": "2026-01-01T00:00:00Z", "comments": 0, "review_comments": 1,
             "head_sha": HEAD},
        ]
        self.assertEqual(result["metadata_snapshots"], expected)
        digest = result.pop("evidence_digest")
        def encoded_digest(value):
            return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        self.assertEqual(encoded_digest(result), digest)
        result["metadata_snapshots"][0]["comments"] += 1
        self.assertNotEqual(encoded_digest(result), digest)

    def test_missing_or_invalid_metadata_timestamp_is_not_a_freshness_receipt(self):
        for value in (None, "yesterday", "2026-01-01T00:00:00"):
            self.reader.routes[f"/repos/{REPO}/issues/42"]["updated_at"] = value
            with self.subTest(value=value), self.assertRaises(steering.CaptureError):
                self.capture()

    def test_autoloop_selected_issue_and_emoji_machine_state(self):
        selection = {"selected": "perf-comparison", "selected_issue": 42,
                     "head_branch": "autoloop/perf-comparison", "existing_pr": 50}
        self.reader = Reader(selection)
        (self.memory / "perf-comparison.md").write_text("## ⚙️ Machine State\n| Last Run | 2026-09-17T18:00:00Z |\n")
        result = self.capture(selection)
        self.assertEqual(result["issue_number"], 42)
        self.assertEqual(result["memory"]["last_run"], "2026-09-17T18:00:00Z")
        self.assertNotIn("/issues/1", str(self.reader.calls))

    def test_explicit_first_run_without_issue_does_not_invent_one(self):
        selection = {"selected": "new", "selected_issue": None, "head_branch": "autoloop/new", "existing_pr": 50}
        self.reader = Reader(selection)
        self.assertIsNone(self.capture(selection)["issue_number"])
        self.assertEqual([row["route"] for row in self.capture(selection)["metadata_snapshots"]],
                         [f"/repos/{REPO}/pulls/50"])
        self.assertFalse(any("/issues/42" in url for url, _ in self.reader.calls))

    def test_unknown_author_is_preserved_not_misclassified_as_bot(self):
        self.reader.routes[f"/repos/{REPO}/issues/42/comments?per_page=100&page=1"][0]["user"] = None
        self.assertEqual(self.capture()["items"][0]["author_type"], "unknown")

    def test_bot_chatter_dropped_but_active_bot_change_request_preserved(self):
        self.reader.routes[f"/repos/{REPO}/pulls/50/reviews?per_page=100&page=1"][0]["user"] = {"type": "Bot", "login": "review[bot]"}
        result = self.capture()
        active = next(x for x in result["items"] if x["id"] == 2)
        self.assertEqual(active["author_type"], "Bot")
        self.assertTrue(active["active_changes_requested"])

    def test_no_truncation_or_silent_omission_at_body_item_or_output_bound(self):
        for constant, value in (("MAX_BODY_BYTES", 1), ("MAX_ITEMS", 1), ("MAX_OUTPUT_BYTES", 1)):
            with self.subTest(constant=constant), patch.object(steering, constant, value):
                with self.assertRaises(steering.CaptureOverflow):
                    self.capture()

    def test_comment_count_mismatch_missing_count_and_bad_body_fail(self):
        for value in (2, None, True):
            with self.subTest(value=value):
                self.reader.routes[f"/repos/{REPO}/issues/42"]["comments"] = value
                with self.assertRaises(steering.CaptureError):
                    self.capture()
        self.reader = Reader()
        self.reader.routes[f"/repos/{REPO}/issues/42/comments?per_page=100&page=1"][0]["body"] = None
        with self.assertRaises(steering.CaptureError):
            self.capture()

    def test_graphql_errors_null_head_mismatch_and_incomplete_reviews_fail(self):
        original = copy.deepcopy(self.reader.routes["/graphql"])
        for value in ({"errors": [{"message": "partial"}], **original}, {"data": None}):
            self.reader.routes["/graphql"] = value
            with self.assertRaises(steering.CaptureError):
                self.capture()
        self.reader.routes["/graphql"] = original
        self.reader.connection()["totalCount"] = 2
        with self.assertRaises(steering.CaptureError):
            self.capture()
        self.reader = Reader()
        self.reader.routes["/graphql"]["data"]["repository"]["pullRequest"]["headRefOid"] = "c" * 40
        with self.assertRaises(steering.CaptureError):
            self.capture()

    def test_missing_active_review_body_never_becomes_clear(self):
        self.reader.routes[f"/repos/{REPO}/pulls/50/reviews?per_page=100&page=1"] = []
        with self.assertRaises(steering.CaptureError):
            self.capture()

    def test_api_failure_mid_capture_and_stale_snapshot_fail(self):
        self.reader.routes[f"/repos/{REPO}/pulls/50/comments?per_page=100&page=1"] = steering.CaptureError("HTTP 403")
        with self.assertRaises(steering.CaptureError):
            self.capture()
        evidence = snapshot()
        evidence["captured_at"] = NOW - 301
        self.reader = Reader()
        with self.assertRaises(ValueError):
            self.capture(evidence=evidence)
        self.assertEqual(self.reader.calls, [])

    def test_changed_final_metadata_stops_capture(self):
        original = self.reader.request
        calls = 0
        def request(route, payload=None):
            nonlocal calls
            value, link = original(route, payload)
            if route == f"/repos/{REPO}/issues/42":
                calls += 1
                if calls == 2:
                    value["updated_at"] = "2026-01-02T00:00:00Z"
            return value, link
        self.reader.request = request
        with self.assertRaises(steering.CaptureError):
            self.capture()

    def test_memory_escape_and_oversize_rejected(self):
        selection = copy.deepcopy(SELECTION)
        selection["selected"]["state_file"] = "../escape.md"
        with self.assertRaises(steering.CaptureError):
            self.capture(selection)
        (self.memory / "42-goal.md").write_text("x" * (steering.MAX_STATE_BYTES + 1))
        with self.assertRaises(steering.CaptureOverflow):
            self.capture()


class PaginationTest(unittest.TestCase):
    def test_canonical_repository_id_link_is_bound_not_followed(self):
        route = "/repos/example/repo/issues/42/comments"
        reader = Reader()
        reader.repository_identity = (REPO, 1234)
        reader.routes[route + "?per_page=100&page=1"] = [comment(i + 1) for i in range(100)]
        reader.routes[route + "?per_page=100&page=2"] = [comment(101)]
        key = route + "?per_page=100&page=1"
        reader.links[key] = '<https://api.github.com/repositories/1234/issues/42/comments?per_page=100&page=2>; rel="next"'
        self.assertEqual(len(steering.pages(reader, route)[0]), 101)
        self.assertTrue(all(url.startswith("/repos/example/repo/") for url, _ in reader.calls))
        reader.links[key] = reader.links[key].replace("1234", "9999")
        with self.assertRaises(steering.CaptureError):
            steering.pages(reader, route)

    def test_full_review_connection_follows_cursor(self):
        reader = Reader()
        first = copy.deepcopy(reader.routes["/graphql"])
        second = copy.deepcopy(first)
        first_conn = first["data"]["repository"]["pullRequest"]["latestOpinionatedReviews"]
        second_conn = second["data"]["repository"]["pullRequest"]["latestOpinionatedReviews"]
        first_conn.update(totalCount=2, pageInfo={"hasNextPage": True, "endCursor": "cursor-1"})
        second_conn.update(totalCount=2, nodes=[{"databaseId": 3, "state": "APPROVED"}])
        reader.request = Mock(side_effect=[(first, ""), (second, "")])
        active, decision, pages = steering.active_reviews(reader, REPO, 50, snapshot())
        self.assertEqual(active, {2})
        self.assertEqual(pages, 2)
        self.assertEqual(reader.request.call_args_list[1].args[1]["variables"]["after"], "cursor-1")

    def test_link_escape_malformed_duplicate_and_limit_fail(self):
        route = "/repos/example/repo/issues/42/comments"
        for link in ('<https://evil.invalid/comments?page=2&per_page=100>; rel="next"',
                     '<https://api.github.com/repos/example/repo/issues/43/comments?page=2&per_page=100>; rel="next"',
                     '<https://api.github.com' + route + '?page=3&per_page=100>; rel="next"', "garbage"):
            reader = Reader()
            reader.routes[route + "?per_page=100&page=1"] = [comment(i + 1) for i in range(100)]
            reader.links[route + "?per_page=100&page=1"] = link
            with self.subTest(link=link), self.assertRaises(steering.CaptureError):
                steering.pages(reader, route)
        reader.links[route + "?per_page=100&page=1"] = '<https://api.github.com' + route + '?page=2&per_page=100>; rel="next"'
        with patch.object(steering, "MAX_PAGES", 1), self.assertRaises(steering.CaptureOverflow):
            steering.pages(reader, route)
        reader.routes[route + "?per_page=100&page=2"] = [comment(1)]
        with self.assertRaises(steering.CaptureError):
            steering.pages(reader, route)


class TransportAndMainTest(unittest.TestCase):
    def reader(self):
        with patch.dict(os.environ, {"GITHUB_TOKEN": TOKEN}, clear=True):
            return steering.GitHubReader()

    def test_token_stays_in_host_header_and_route_cannot_redirect(self):
        reader = self.reader()
        response = Mock()
        response.read.return_value = b'[]'
        response.headers = {}
        reader.opener = Mock()
        reader.opener.open.return_value.__enter__ = Mock(return_value=response)
        reader.opener.open.return_value.__exit__ = Mock(return_value=False)
        reader.request("/repos/example/repo/issues/42/comments")
        request = reader.opener.open.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer " + TOKEN)
        self.assertNotIn(TOKEN, request.full_url)
        with self.assertRaises(steering.CaptureError):
            steering.NoRedirect().redirect_request(request, None, 302, "", {}, "https://evil.invalid")

    def test_missing_token_http_api_null_oversize_and_request_limit_fail(self):
        for env in ({}, {"GITHUB_TOKEN": TOKEN, "GITHUB_API_URL": "http://api.github.com"}):
            with patch.dict(os.environ, env, clear=True), self.assertRaises(steering.CaptureError):
                steering.GitHubReader()
        for body in (b"null", b"x" * (steering.MAX_RESPONSE_BYTES + 1)):
            reader = self.reader()
            response = Mock()
            response.read.return_value = body
            response.headers = {}
            reader.opener = Mock()
            reader.opener.open.return_value.__enter__ = Mock(return_value=response)
            reader.opener.open.return_value.__exit__ = Mock(return_value=False)
            with self.assertRaises(steering.CaptureError):
                reader.request("/repos/example/repo")
        reader = self.reader()
        reader.calls = steering.MAX_REQUESTS
        with self.assertRaises(steering.CaptureOverflow):
            reader.request("/repos/example/repo")

    def test_main_overwrites_stale_success_on_failure_without_bodies_or_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            selection, evidence, output = (root / name for name in ("selection.json", "branch.json", "steering.json"))
            selection.write_text(json.dumps(SELECTION))
            evidence.write_text(json.dumps(snapshot()))
            output.write_text('{"status":"ready"}')
            with patch.object(steering, "GitHubReader", side_effect=steering.CaptureOverflow(TOKEN)), \
                    patch("sys.stderr", new_callable=io.StringIO) as stderr:
                result = steering.main(["--selection", str(selection), "--branch-evidence", str(evidence), "--output", str(output)])
            self.assertEqual(result, 1)
            self.assertEqual(json.loads(output.read_text())["status"], "overflow")
            self.assertFalse(json.loads(output.read_text())["complete"])
            self.assertNotIn(TOKEN, output.read_text() + stderr.getvalue())
            selection.write_text('{"selected":null}')
            with patch.object(steering, "GitHubReader") as reader:
                self.assertEqual(steering.main(["--selection", str(selection), "--branch-evidence", str(evidence), "--output", str(output)]), 0)
                reader.assert_not_called()


if __name__ == "__main__":
    unittest.main()
