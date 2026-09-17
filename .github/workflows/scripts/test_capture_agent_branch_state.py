"""Host authentication stays outside the token-free branch preparation snapshot."""

import base64
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch
import urllib.error
import urllib.parse

import capture_agent_branch_state as host


REPOSITORY = "example/repo"
BRANCH = "goal/42-goal"
BASE = "main"
BASE_SHA = "a" * 40
HEAD_SHA = "b" * 40
OTHER_SHA = "c" * 40
TOKEN = "test-only-host-read-credential"
NOW = 1_800_000_000
SELECTION = {"selected": {"branch": BRANCH, "existing_pr": 42}}
NO_PR = {"selected": {"branch": BRANCH, "existing_pr": None}}
PR = {"number": 42, "state": "open",
      "head": {"ref": BRANCH, "sha": HEAD_SHA, "repo": {"full_name": REPOSITORY}},
      "base": {"ref": BASE, "sha": BASE_SHA, "repo": {"full_name": REPOSITORY}}}
HOST_ENV = {"GITHUB_TOKEN": TOKEN, "GITHUB_REPOSITORY": REPOSITORY,
            "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "2"}


def ref(branch, sha):
    return {"ref": "refs/heads/" + branch, "object": {"type": "commit", "sha": sha}}


def evidence_reader(head=HEAD_SHA, pull_requests=None):
    records = {
        f"repos/{REPOSITORY}/git/ref/heads/{BASE}": ref(BASE, BASE_SHA),
        f"repos/{REPOSITORY}/git/ref/heads/{urllib.parse.quote(BRANCH, safe='')}":
            ref(BRANCH, head) if head is not None else None,
    }
    query = urllib.parse.urlencode({"state": "open", "head": "example:" + BRANCH,
                                   "per_page": 100})
    records[f"repos/{REPOSITORY}/pulls?{query}"] = [PR] if pull_requests is None else pull_requests
    return Mock(side_effect=lambda route, missing_ok=False: copy.deepcopy(records[route]))


def capture(selection=SELECTION, read=None, **kwargs):
    return host.capture(selection, BRANCH, BASE, REPOSITORY, "123", "2",
                        read=evidence_reader() if read is None else read, now=NOW, **kwargs)


class AuthenticatedHostReadTest(unittest.TestCase):
    def test_api_read_uses_only_explicit_host_token_and_https_get(self):
        with patch.dict(os.environ, HOST_ENV, clear=True), \
                patch.object(host.urllib.request, "urlopen") as request:
            request.return_value.__enter__.return_value.read.return_value = b'{"ok": true}'
            self.assertEqual(host.read_json("repos/example/repo"), {"ok": True})
        sent = request.call_args.args[0]
        self.assertEqual(sent.full_url, "https://api.github.com/repos/example/repo")
        self.assertEqual(sent.get_method(), "GET")
        self.assertEqual(sent.get_header("Authorization"), "Bearer " + TOKEN)
        self.assertEqual(sent.get_header("Accept"), "application/vnd.github+json")
        self.assertEqual(request.call_args.kwargs, {"timeout": 30})
        self.assertNotIn(TOKEN, sent.full_url)

    def test_missing_host_token_or_non_https_endpoint_never_sends_request(self):
        for environment in ({}, {"GH_TOKEN": TOKEN}, {"GH_AW_GITHUB_TOKEN": TOKEN},
                            {**HOST_ENV, "GITHUB_API_URL": "http://api.github.com"}):
            with self.subTest(environment=list(environment)), \
                    patch.dict(os.environ, environment, clear=True), \
                    patch.object(host.urllib.request, "urlopen") as request:
                with self.assertRaisesRegex(ValueError, "Authenticated host"):
                    host.read_json("repos/example/repo")
                request.assert_not_called()

    def test_only_explicitly_permitted_404_means_absence(self):
        for code in (401, 403, 404, 409, 422, 429, 500, 503):
            for missing_ok in (False, True):
                error = urllib.error.HTTPError("https://api.github.com/ref", code,
                                               "request failed", {}, None)
                with self.subTest(code=code, missing_ok=missing_ok), \
                        patch.dict(os.environ, HOST_ENV, clear=True), \
                        patch.object(host.urllib.request, "urlopen", side_effect=error):
                    if code == 404 and missing_ok:
                        self.assertIsNone(host.read_json("ref", missing_ok=True))
                    else:
                        with self.assertRaisesRegex(ValueError, f"HTTP {code}"):
                            host.read_json("ref", missing_ok=missing_ok)

    def test_invalid_json_and_transport_errors_never_become_absence(self):
        with patch.dict(os.environ, HOST_ENV, clear=True), \
                patch.object(host.urllib.request, "urlopen") as request:
            request.return_value.__enter__.return_value.read.return_value = b"not JSON"
            with self.assertRaises(json.JSONDecodeError):
                host.read_json("ref", missing_ok=True)
        for error in (urllib.error.URLError("network unavailable"), TimeoutError("timeout")):
            with self.subTest(error=type(error).__name__), \
                    patch.dict(os.environ, HOST_ENV, clear=True), \
                    patch.object(host.urllib.request, "urlopen", side_effect=error):
                with self.assertRaises(type(error)):
                    host.read_json("ref", missing_ok=True)

    def test_successful_null_response_cannot_impersonate_an_absent_ref(self):
        with patch.dict(os.environ, HOST_ENV, clear=True), \
                patch.object(host.urllib.request, "urlopen") as request:
            request.return_value.__enter__.return_value.read.return_value = b"null"
            with self.assertRaises(ValueError):
                host.ref_sha(REPOSITORY, BRANCH, missing_ok=True)

    def test_ref_reader_requires_exact_commit_ref_and_encodes_branch(self):
        read = Mock(return_value=ref(BRANCH, HEAD_SHA))
        self.assertEqual(host.ref_sha(REPOSITORY, BRANCH, read, missing_ok=True), HEAD_SHA)
        read.assert_called_once_with("repos/example/repo/git/ref/heads/goal%2F42-goal", True)
        with self.assertRaises(ValueError):
            host.ref_sha(REPOSITORY, BRANCH, Mock(return_value=None))
        self.assertIsNone(host.ref_sha(REPOSITORY, BRANCH, Mock(return_value=None), missing_ok=True))
        invalid = [None, [], [ref(BRANCH, HEAD_SHA)], {}, "invalid",
                   ref("goal/42-goal-extra", HEAD_SHA),
                   {**ref(BRANCH, HEAD_SHA), "object": {"type": "tag", "sha": HEAD_SHA}},
                   {**ref(BRANCH, HEAD_SHA), "object": None}]
        invalid.extend(ref(BRANCH, sha) for sha in (None, True, 42, "b" * 39, "b" * 41, "B" * 40))
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                host.ref_sha(REPOSITORY, BRANCH, Mock(return_value=value))


class CaptureBranchEvidenceTest(unittest.TestCase):
    def test_successful_snapshot_binds_selection_refs_run_and_time_without_credentials(self):
        read = evidence_reader()
        with patch.dict(os.environ, HOST_ENV, clear=True):
            snapshot = capture(read=read)
        digest = hashlib.sha256(json.dumps(SELECTION, sort_keys=True,
                                           separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(snapshot, {
            "schema_version": 1, "status": "ready", "repository": REPOSITORY,
            "branch": BRANCH, "base": BASE, "mode": "resume", "head_sha": HEAD_SHA,
            "base_sha": BASE_SHA, "existing_pr": 42, "run_id": "123", "run_attempt": "2",
            "selection_digest": digest, "captured_at": NOW})
        self.assertNotIn(TOKEN, json.dumps(snapshot))
        self.assertEqual(read.call_count, 3)
        self.assertEqual(read.call_args_list[0].args, ("repos/example/repo/git/ref/heads/main", False))
        self.assertEqual(read.call_args_list[1].args,
                         ("repos/example/repo/git/ref/heads/goal%2F42-goal", True))
        self.assertIn("state=open&head=example%3Agoal%2F42-goal&per_page=100",
                      read.call_args_list[2].args[0])
        host.state.validate_snapshot(SELECTION, snapshot, BRANCH, BASE, REPOSITORY,
                                     "123", "2", now=NOW + host.state.MAX_SNAPSHOT_AGE)
        for now in (NOW - 1, NOW + host.state.MAX_SNAPSHOT_AGE + 1):
            with self.subTest(now=now), self.assertRaises(ValueError):
                host.state.validate_snapshot(SELECTION, snapshot, BRANCH, BASE, REPOSITORY,
                                             "123", "2", now=now)

    def test_autoloop_selection_has_the_same_exact_snapshot_contract(self):
        selection = {"selected": "program", "head_branch": BRANCH, "existing_pr": 42}
        snapshot = capture(selection)
        self.assertEqual(snapshot["mode"], "resume")
        self.assertEqual(snapshot["selection_digest"], host.state.selection_digest(selection))

    def test_explicit_no_pr_allows_retained_or_missing_branch(self):
        for head in (HEAD_SHA, None):
            with self.subTest(head=head):
                snapshot = capture(NO_PR, evidence_reader(head, []))
                self.assertEqual(snapshot["mode"], "refresh-base")
                self.assertEqual(snapshot["head_sha"], head)
                self.assertEqual(snapshot["base_sha"], BASE_SHA)
                self.assertIsNone(snapshot["existing_pr"])

    def test_malformed_ambiguous_wrong_or_stale_pr_evidence_is_rejected(self):
        invalid = [None, {}, "invalid", [None], [PR, PR], [],
                   [{**PR, "number": 43}], [{**PR, "number": True}],
                   [{**PR, "state": "closed"}]]
        for field in ("head", "base"):
            for replacement in (None, {}, {**PR[field], "ref": "other"},
                                {**PR[field], "repo": {"full_name": "fork/repo"}}):
                changed = copy.deepcopy(PR)
                changed[field] = replacement
                invalid.append([changed])
        for records in invalid:
            read = evidence_reader()
            original = read.side_effect
            read.side_effect = lambda route, missing_ok=False: (
                records if "/pulls?" in route else original(route, missing_ok))
            with self.subTest(records=records), self.assertRaises(ValueError):
                capture(read=read)
        with self.assertRaisesRegex(ValueError, "stale"):
            capture(NO_PR, evidence_reader())

    def test_active_pr_requires_exact_head_but_ignores_base_only_drift(self):
        for sha in (None, OTHER_SHA):
            changed = copy.deepcopy(PR)
            changed["head"]["sha"] = sha
            with self.subTest(head=sha), self.assertRaisesRegex(ValueError, "refs moved"):
                capture(read=evidence_reader(pull_requests=[changed]))
        with self.assertRaisesRegex(ValueError, "refs moved"):
            capture(read=evidence_reader(head=None))
        changed = copy.deepcopy(PR)
        changed["base"]["sha"] = OTHER_SHA
        snapshot = capture(read=evidence_reader(pull_requests=[changed]))
        self.assertEqual(snapshot["mode"], "resume")
        self.assertEqual(snapshot["base_sha"], BASE_SHA)
        self.assertEqual(snapshot["head_sha"], HEAD_SHA)

    def test_snapshot_cannot_be_reused_with_another_run_or_selection(self):
        snapshot = capture()
        for key, value in (("run_id", "124"), ("run_attempt", "3"),
                           ("selection_digest", "0" * 64)):
            changed = {**snapshot, key: value}
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "run and selection"):
                host.state.validate_snapshot(SELECTION, changed, BRANCH, BASE, REPOSITORY,
                                             "123", "2", now=NOW)

    def test_invalid_selection_or_repository_does_not_read_github(self):
        for selection, repository in (({}, REPOSITORY), ({"selected": None}, REPOSITORY),
                                      ({"error": "failed", **SELECTION}, REPOSITORY),
                                      (SELECTION, "../other/repo")):
            read = Mock()
            with self.subTest(selection=selection, repository=repository), self.assertRaises(ValueError):
                host.capture(selection, BRANCH, BASE, repository, "123", "2", read=read, now=NOW)
            read.assert_not_called()

    def test_api_failures_propagate_without_a_snapshot(self):
        for failing_index in range(3):
            responses = [ref(BASE, BASE_SHA), ref(BRANCH, HEAD_SHA), [PR]]
            responses[failing_index] = ValueError("API lookup failed")
            read = Mock(side_effect=responses)
            with self.subTest(failing_index=failing_index), self.assertRaisesRegex(ValueError, "API"):
                capture(read=read)
            self.assertEqual(read.call_count, failing_index + 1)


class FetchBoundRefsTest(unittest.TestCase):
    def fake_git(self, *, remote="https://github.com/example/repo.git", base=BASE_SHA,
                 head=HEAD_SHA, absent=""):
        def run(args, **kwargs):
            if args == ["git", "remote", "get-url", "origin"]:
                value = remote
            elif args[:3] == ["git", "fetch", "--no-tags"]:
                value = ""
            elif args == ["git", "rev-parse", "refs/remotes/origin/" + BASE]:
                value = base
            elif args == ["git", "rev-parse", "refs/remotes/origin/" + BRANCH]:
                value = head
            elif args == ["git", "ls-remote", "--heads", "origin", "refs/heads/" + BRANCH]:
                value = absent
            else:
                self.fail(f"Unexpected Git operation: {args}")
            return subprocess.CompletedProcess(args, 0, stdout=value + "\n", stderr="")
        return Mock(side_effect=run)

    def test_fetch_uses_child_only_auth_environment_not_arguments_or_snapshot(self):
        snapshot = capture()
        original = copy.deepcopy(snapshot)
        git = self.fake_git()
        with patch.dict(os.environ, HOST_ENV, clear=True), patch.object(host.subprocess, "run", git):
            host.fetch_bound_refs(snapshot, Path("/workspace"))
            self.assertNotIn("GIT_CONFIG_VALUE_0", os.environ)
            self.assertNotIn("GIT_CONFIG_COUNT", os.environ)
        encoded = base64.b64encode(("x-access-token:" + TOKEN).encode()).decode()
        fetch = git.call_args_list[1]
        self.assertEqual(fetch.args[0], ["git", "fetch", "--no-tags", "origin",
            "+refs/heads/goal/42-goal:refs/remotes/origin/goal/42-goal"])
        env = fetch.kwargs["env"]
        self.assertEqual(env["GIT_CONFIG_COUNT"], "1")
        self.assertEqual(env["GIT_CONFIG_KEY_0"], "http.https://github.com/.extraheader")
        self.assertEqual(env["GIT_CONFIG_VALUE_0"], "AUTHORIZATION: basic " + encoded)
        self.assertEqual(env["GIT_TERMINAL_PROMPT"], "0")
        self.assertEqual(fetch.kwargs["timeout"], 60)
        for call in git.call_args_list:
            self.assertTrue(call.kwargs["check"])
            self.assertTrue(call.kwargs["capture_output"])
            self.assertEqual(call.kwargs["cwd"], Path("/workspace"))
            self.assertNotIn(TOKEN, repr(call.args))
            self.assertNotIn(encoded, repr(call.args))
            self.assertNotIn("config", call.args[0][1:])
        self.assertEqual(snapshot, original)
        self.assertNotIn(TOKEN, json.dumps(snapshot))
        self.assertNotIn(encoded, json.dumps(snapshot))

    def test_wrong_or_credential_bearing_origin_is_rejected_before_fetch(self):
        for remote in ("git@github.com:example/repo.git", "http://github.com/example/repo.git",
                       "https://x-access-token:secret@github.com/example/repo.git",
                       "https://github.com/other/repo.git", "https://evil.test/example/repo.git",
                       "https://github.com/example/repo.git/extra", "https://github.com/example/repo2"):
            git = self.fake_git(remote=remote)
            with self.subTest(remote=remote), patch.dict(os.environ, HOST_ENV, clear=True), \
                    patch.object(host.subprocess, "run", git), self.assertRaisesRegex(ValueError, "Origin"):
                host.fetch_bound_refs(capture(), Path("/workspace"))
            self.assertEqual(git.call_count, 1)

    def test_missing_token_stops_before_fetch(self):
        git = self.fake_git()
        with patch.dict(os.environ, {}, clear=True), patch.object(host.subprocess, "run", git), \
                self.assertRaisesRegex(ValueError, "read token"):
            host.fetch_bound_refs(capture(), Path("/workspace"))
        self.assertEqual(git.call_count, 1)

    def test_active_head_drift_and_either_refresh_ref_drift_are_rejected(self):
        for selection, field in ((SELECTION, "head"), (NO_PR, "base"), (NO_PR, "head")):
            snapshot = capture(selection, evidence_reader(pull_requests=[] if selection == NO_PR else [PR]))
            git = self.fake_git(**{field: OTHER_SHA})
            with self.subTest(selection=selection, field=field), patch.dict(os.environ, HOST_ENV, clear=True), \
                    patch.object(host.subprocess, "run", git), self.assertRaisesRegex(ValueError, "differs"):
                host.fetch_bound_refs(snapshot, Path("/workspace"))

    def test_resume_does_not_fetch_or_verify_irrelevant_base_drift(self):
        git = self.fake_git(base=OTHER_SHA)
        with patch.dict(os.environ, HOST_ENV, clear=True), patch.object(host.subprocess, "run", git):
            host.fetch_bound_refs(capture(), Path("/workspace"))
        self.assertEqual(git.call_args_list[1].args[0], ["git", "fetch", "--no-tags", "origin",
            "+refs/heads/goal/42-goal:refs/remotes/origin/goal/42-goal"])
        self.assertFalse(any(call.args[0] == ["git", "rev-parse", "refs/remotes/origin/main"]
                             for call in git.call_args_list))

    def test_absence_is_reconfirmed_remotely_and_new_branch_is_rejected(self):
        snapshot = capture(NO_PR, evidence_reader(None, []))
        for absent in ("", HEAD_SHA + "\trefs/heads/" + BRANCH):
            git = self.fake_git(absent=absent)
            with self.subTest(appeared=bool(absent)), patch.dict(os.environ, HOST_ENV, clear=True), \
                    patch.object(host.subprocess, "run", git):
                if absent:
                    with self.assertRaisesRegex(ValueError, "appeared"):
                        host.fetch_bound_refs(snapshot, Path("/workspace"))
                else:
                    host.fetch_bound_refs(snapshot, Path("/workspace"))
            fetch, check = git.call_args_list[1], git.call_args_list[-1]
            self.assertEqual(fetch.args[0], ["git", "fetch", "--no-tags", "origin",
                                           "+refs/heads/main:refs/remotes/origin/main"])
            self.assertEqual(check.args[0], ["git", "ls-remote", "--heads", "origin", "refs/heads/" + BRANCH])
            self.assertIn("GIT_CONFIG_VALUE_0", check.kwargs["env"])
            self.assertFalse(any(call.args[0] == ["git", "rev-parse", "refs/remotes/origin/" + BRANCH]
                                 for call in git.call_args_list))

    def test_fetch_and_absence_read_errors_propagate(self):
        for failing_command in ("fetch", "ls-remote"):
            for error in (subprocess.TimeoutExpired("git", 30), subprocess.CalledProcessError(1, "git")):
                git = self.fake_git()
                valid = git.side_effect
                def run(args, **kwargs):
                    if args[1] == failing_command:
                        raise error
                    return valid(args, **kwargs)
                git.side_effect = run
                with self.subTest(command=failing_command, error=type(error).__name__), \
                        patch.dict(os.environ, HOST_ENV, clear=True), \
                        patch.object(host.subprocess, "run", git), self.assertRaises(type(error)):
                    host.fetch_bound_refs(capture(NO_PR, evidence_reader(None, [])), Path("/workspace"))


class CaptureCommandTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.selection = self.root / "selection.json"
        self.output = self.root / "snapshot.json"
        self.selection.write_text(json.dumps(SELECTION))
        self.output.write_text(json.dumps({"status": "ready", "stale": True}))
        self.args = ["--selection", str(self.selection), "--output", str(self.output),
                     "--repo-root", str(self.root), "--base", BASE]

    def test_no_selected_work_needs_no_token_api_or_git(self):
        self.selection.write_text(json.dumps({"selected": None}))
        with patch.dict(os.environ, {}, clear=True), patch.object(host, "capture") as read, \
                patch.object(host, "fetch_bound_refs") as fetch, \
                patch.object(host.subprocess, "run") as git, patch("sys.stdout", new_callable=io.StringIO):
            self.assertEqual(host.main(self.args), 0)
        read.assert_not_called()
        fetch.assert_not_called()
        git.assert_not_called()
        self.assertEqual(json.loads(self.output.read_text()), {"schema_version": 1, "status": "skipped"})

    def test_success_stages_only_valid_snapshot_after_fetch(self):
        snapshot = capture()
        def fetch(evidence, root):
            self.assertEqual(evidence, snapshot)
            self.assertEqual(root, self.root)
            self.assertTrue(json.loads(self.output.read_text())["stale"])
        with patch.dict(os.environ, HOST_ENV, clear=True), \
                patch.object(host, "capture", return_value=snapshot) as read, \
                patch.object(host, "fetch_bound_refs", side_effect=fetch), \
                patch.object(host.subprocess, "run") as git, patch("sys.stdout", new_callable=io.StringIO) as log:
            self.assertEqual(host.main(self.args), 0)
        read.assert_called_once_with(SELECTION, BRANCH, BASE, REPOSITORY, "123", "2")
        self.assertEqual([call.args[0] for call in git.call_args_list], [
            ["git", "check-ref-format", "--branch", BRANCH],
            ["git", "check-ref-format", "--branch", BASE]])
        self.assertEqual(json.loads(self.output.read_text()), snapshot)
        self.assertNotIn(TOKEN, self.output.read_text() + log.getvalue())

    def test_errors_remove_stale_ready_snapshot_without_logging_credentials(self):
        for stage in ("capture", "fetch"):
            for error in (ValueError(TOKEN), subprocess.CalledProcessError(1, ["git", TOKEN], stderr=TOKEN),
                          urllib.error.URLError(TOKEN)):
                with self.subTest(stage=stage, error=type(error).__name__), \
                        patch.dict(os.environ, HOST_ENV, clear=True), \
                        patch.object(host.subprocess, "run"), \
                        patch.object(host, "capture", side_effect=error if stage == "capture" else None,
                                     return_value=capture()), \
                        patch.object(host, "fetch_bound_refs", side_effect=error if stage == "fetch" else None), \
                        patch("sys.stderr", new_callable=io.StringIO) as log:
                    self.assertEqual(host.main(self.args), 1)
                self.assertEqual(json.loads(self.output.read_text()), {"schema_version": 1, "status": "error"})
                self.assertNotIn(TOKEN, self.output.read_text() + log.getvalue())

    def test_invalid_selection_or_ref_never_reaches_capture(self):
        for selection in ([], {}, {"selected": None, "error": "failed"},
                          {"selected": {"branch": "other/branch", "existing_pr": None}}):
            self.selection.write_text(json.dumps(selection))
            with self.subTest(selection=selection), patch.object(host, "capture") as read, \
                    patch.object(host, "fetch_bound_refs") as fetch, \
                    patch("sys.stderr", new_callable=io.StringIO):
                self.assertEqual(host.main(self.args), 1)
            read.assert_not_called()
            fetch.assert_not_called()
        self.selection.write_text(json.dumps({"selected": {"branch": "goal/bad..ref", "existing_pr": None}}))
        with patch.object(host.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "git")), \
                patch.object(host, "capture") as read, patch("sys.stderr", new_callable=io.StringIO):
            self.assertEqual(host.main(self.args), 1)
        read.assert_not_called()


if __name__ == "__main__":
    unittest.main()
