"""Read-only, fail-closed GitHub evidence for an exact publication candidate.

This does not evaluate the program's objective or grant merge permission. The
caller must separately authorize the exact candidate and its evaluator. No
candidate files, evaluation commands, or agent-generated receipts are executed.
"""
import datetime
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from automation_ci import (
    REQUIRED_JOBS,
    ci_status,
    latest_run_id,
    pr_ci_status,
    rest_pull_request_checks,
    rest_run_with_jobs,
    rest_runs,
)


PAGE_SIZE = 100
MAX_PAGES = 10
MAX_RESPONSE_BYTES = 4 * 1024 * 1024
REQUEST_BUDGET_SECONDS = 180
GITHUB_ACTIONS_APP_ID = 15368
API_ROOT = "https://api.github.com"


def _object(value):
    if not isinstance(value, dict):
        raise ValueError("Expected a GitHub evidence object")
    return value


def _positive(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Expected a positive GitHub evidence ID")
    return value


def _sha(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value):
        raise ValueError("Expected a full GitHub evidence SHA")
    return value


def _repository(value):
    if not isinstance(value, str) or not re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*", value):
        raise ValueError("Expected a GitHub repository identity")
    return value


def _same_repository(value, repository):
    return _repository(_object(value).get("full_name")).lower() == repository.lower()


def _branch(value):
    if (not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_./-]*", value)
            or ".." in value or "//" in value or value.endswith(("/", ".", ".lock"))
            or any(part.startswith(".") for part in value.split("/"))):
        raise ValueError("Expected a canonical Git branch name")
    return value


def _api_path(path):
    if not isinstance(path, str) or any(ord(char) < 33 for char in path):
        raise ValueError("Expected a relative GitHub API path")
    parsed = urllib.parse.urlsplit(path)
    if (parsed.scheme or parsed.netloc or parsed.fragment or not parsed.path.startswith("/repos/")
            or "\\" in path or any(part in (".", "..") for part in parsed.path.split("/"))):
        raise ValueError("Expected a relative GitHub repository API path")
    return parsed


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON evidence field")
        result[key] = value
    return result


def _invalid_constant(_value):
    raise ValueError("Non-finite JSON evidence number")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the host-only Authorization header to a redirect target.
        return None


class GitHubReader:
    """Authenticated host-only GET transport; tokens never enter returned data."""

    def __init__(self, token):
        if not isinstance(token, str) or not token or any(char.isspace() for char in token):
            raise ValueError("A host GitHub read token is required")
        self._token = token
        self._opener = urllib.request.build_opener(_NoRedirect())
        self._deadline = time.monotonic() + REQUEST_BUDGET_SECONDS

    def get(self, path):
        _api_path(path)
        remaining = self._deadline - time.monotonic()
        if remaining <= 0:
            raise ValueError("GitHub evidence collection exceeded its time budget")
        request = urllib.request.Request(
            API_ROOT + path,
            headers={"Authorization": "Bearer " + self._token,
                     "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28",
                     "User-Agent": "tsb-publication-evidence"},
            method="GET",
        )
        try:
            with self._opener.open(request, timeout=min(30, remaining)) as response:
                if response.status != 200:
                    raise ValueError("GitHub evidence request did not succeed")
                raw = response.read(MAX_RESPONSE_BYTES + 1)
            if time.monotonic() >= self._deadline:
                raise ValueError("GitHub evidence collection exceeded its time budget")
            if len(raw) > MAX_RESPONSE_BYTES:
                raise ValueError("GitHub evidence response exceeds its size limit")
            result = json.loads(raw, object_pairs_hook=_unique_object,
                                parse_constant=_invalid_constant)
            if not isinstance(result, (dict, list)):
                raise ValueError("GitHub evidence response has the wrong shape")
            return result
        except Exception:
            # HTTP errors and malformed bodies may contain credentials or untrusted text.
            raise ValueError("GitHub evidence request failed or returned invalid data") from None

    def all_pages(self, path, key=None):
        return all_pages(path, key, self.get)


def _request(request_json, path):
    try:
        result = request_json(path)
    except Exception:
        raise ValueError("GitHub evidence request failed") from None
    if not isinstance(result, (dict, list)):
        raise ValueError("GitHub evidence response has the wrong shape")
    return result


def all_pages(path, key, request_json):
    """Collect bounded genuine pages; never replace an API total with len(rows)."""
    parsed = _api_path(path)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    if any(name in ("page", "per_page") for name, _ in query):
        raise ValueError("Pagination is owned by the evidence collector")
    rows, seen, first, total = [], set(), None, None
    for page in range(1, MAX_PAGES + 1):
        parameters = urllib.parse.urlencode([*query, ("per_page", PAGE_SIZE), ("page", page)])
        payload = _request(request_json, parsed.path + "?" + parameters)
        if key is None:
            batch = payload
        else:
            payload = _object(payload)
            count = payload.get("total_count")
            if type(count) is not int or count < 0 or count > PAGE_SIZE * MAX_PAGES:
                raise ValueError("Invalid or excessive paginated evidence total")
            if first is None:
                first, total = payload, count
            elif count != total or any(payload.get(name) != value for name, value in first.items()
                                       if name not in (key, "total_count")):
                raise ValueError("GitHub evidence changed while paging")
            batch = payload.get(key)
        if not isinstance(batch, list) or len(batch) > PAGE_SIZE:
            raise ValueError("Invalid GitHub evidence page")
        for row in batch:
            row = _object(row)
            identity = _positive(row.get("id"))
            if identity in seen:
                raise ValueError("Duplicate identity in paginated evidence")
            seen.add(identity)
        rows.extend(batch)
        if key is None:
            if len(batch) < PAGE_SIZE:
                return rows
        else:
            remaining = total - (page - 1) * PAGE_SIZE
            if len(batch) != min(PAGE_SIZE, max(remaining, 0)):
                raise ValueError("Truncated or inconsistent GitHub evidence page")
            if len(rows) == total:
                return {**first, key: rows}
    raise ValueError("GitHub evidence pagination exceeded its bound")


def _pr_identity(value, repository, pr_number, branch, base, sha):
    value = _object(value)
    if (value.get("number") != pr_number or type(value.get("number")) is not int
            or value.get("state") != "open" or value.get("merged") is not False):
        raise ValueError("Candidate PR is not the expected open pull request")
    head, target = _object(value.get("head")), _object(value.get("base"))
    for ref, name in ((head, branch), (target, base)):
        if ref.get("ref") != name or not _same_repository(ref.get("repo"), repository):
            raise ValueError("Candidate PR has the wrong canonical repository or branch")
    if _sha(head.get("sha")) != sha:
        raise ValueError("Candidate PR head changed")
    return {"id": _positive(value.get("id")), "head": sha,
            "base": _sha(target.get("sha"))}


def _run_identity(value, repository, branch, sha):
    value = _object(value)
    rest_runs({"total_count": 1, "workflow_runs": [value]})
    if value.get("head_sha") != sha or value.get("head_branch") != branch:
        raise ValueError("CI run has the wrong candidate head or branch")
    for field in ("repository", "head_repository"):
        if not _same_repository(value.get(field), repository):
            raise ValueError("CI run has the wrong repository")
    return (_positive(value.get("id")), _positive(value.get("run_attempt")),
            value.get("status"), value.get("conclusion"))


def _reviews(rows):
    """Latest decisive review per reviewer; comments do not erase objections."""
    latest, snapshot = {}, []
    for review in rows:
        reviewer = _positive(_object(review.get("user")).get("id"))
        identity = _positive(review.get("id"))
        state = review.get("state")
        if state not in ("APPROVED", "CHANGES_REQUESTED", "DISMISSED", "COMMENTED", "PENDING"):
            raise ValueError("Unknown GitHub review state")
        submitted = review.get("submitted_at")
        if state != "PENDING":
            if not isinstance(submitted, str) or not re.fullmatch(
                    r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", submitted):
                raise ValueError("Missing review submission timestamp")
        elif submitted is not None:
            raise ValueError("Invalid pending review timestamp")
        record = {"id": identity, "reviewer_id": reviewer, "state": state,
                  "submitted_at": submitted}
        snapshot.append(record)
        # Dismissal changes the original row's state. A different, newer
        # dismissed review must not erase an earlier active objection.
        if state in ("APPROVED", "CHANGES_REQUESTED"):
            previous = latest.get(reviewer)
            if previous is None or (submitted, identity) > (previous["submitted_at"], previous["id"]):
                latest[reviewer] = record
    if any(review["state"] == "CHANGES_REQUESTED" for review in latest.values()):
        raise ValueError("Candidate has an unresolved changes-requested review")
    return sorted(snapshot, key=lambda review: review["id"])


def _native_rollup(pr, checks, statuses):
    required = [check for check in checks["check_runs"] if check.get("name") in REQUIRED_JOBS]
    if {check["name"] for check in required} != REQUIRED_JOBS:
        raise ValueError("Candidate lacks required native GitHub Actions checks")
    if any(_positive(_object(check.get("app")).get("id")) != GITHUB_ACTIONS_APP_ID
           for check in required):
        raise ValueError("Candidate required check has the wrong GitHub App provenance")
    return rest_pull_request_checks({"pull_request": pr, "check_runs": checks, "status": statuses})


def candidate_evidence(repository, pr_number, branch, base, expected_sha, expected_tree, request_json):
    """Require fresh complete CI and clear reviews for one exact candidate.

    Reads are not an atomic GitHub transaction. Final rereads fail closed on
    observed PR, review, run, or rerun changes; the caller must not cache this
    result as permission for a different candidate or a later publication.
    """
    repository, pr_number = _repository(repository), _positive(pr_number)
    branch, base = _branch(branch), _branch(base)
    expected_sha, expected_tree = _sha(expected_sha), _sha(expected_tree)
    prefix = "/repos/" + repository
    pr_path = f"{prefix}/pulls/{pr_number}"
    pr = _request(request_json, pr_path)
    identity = _pr_identity(pr, repository, pr_number, branch, base, expected_sha)
    commit = _object(_request(request_json, f"{prefix}/git/commits/{expected_sha}"))
    if (_sha(commit.get("sha")) != expected_sha or
            _sha(_object(commit.get("tree")).get("sha")) != expected_tree):
        raise ValueError("Candidate commit has the wrong exact tree")
    reviews_path = pr_path + "/reviews"
    reviews = _reviews(all_pages(reviews_path, None, request_json))
    runs_path = f"{prefix}/actions/workflows/ci.yml/runs?head_sha={expected_sha}"
    runs = all_pages(runs_path, "workflow_runs", request_json)
    for run in runs["workflow_runs"]:
        _run_identity(run, repository, branch, expected_sha)
    run_id = latest_run_id(rest_runs(runs), expected_sha)
    if run_id is None:
        raise ValueError("Candidate has no exact-head CI run")
    listed = next(run for run in runs["workflow_runs"] if run["id"] == run_id)
    run_path = f"{prefix}/actions/runs/{run_id}"
    run = _object(_request(request_json, run_path))
    run_identity = _run_identity(run, repository, branch, expected_sha)
    if run_identity != _run_identity(listed, repository, branch, expected_sha):
        raise ValueError("Candidate CI run changed during collection")
    jobs = all_pages(f"{run_path}/attempts/{run_identity[1]}/jobs", "jobs", request_json)
    if ci_status(rest_run_with_jobs({"run": run, "jobs": jobs}), expected_sha) != "success":
        raise ValueError("Candidate current-attempt CI gates are not successful")
    checks_path = f"{prefix}/commits/{expected_sha}/check-runs?filter=latest"
    statuses_path = f"{prefix}/commits/{expected_sha}/status"
    checks = all_pages(checks_path, "check_runs", request_json)
    statuses = all_pages(statuses_path, "statuses", request_json)
    rollup = _native_rollup(pr, checks, statuses)
    if pr_ci_status(rollup, expected_sha) != "success":
        raise ValueError("Candidate PR check rollup is not successful")
    # Do not let a new run/rerun, changed head/base, or new review silently reuse evidence.
    final_runs = all_pages(runs_path, "workflow_runs", request_json)
    for final_run in final_runs["workflow_runs"]:
        _run_identity(final_run, repository, branch, expected_sha)
    if latest_run_id(rest_runs(final_runs), expected_sha) != run_id:
        raise ValueError("Candidate latest CI run changed")
    final_listed = next(item for item in final_runs["workflow_runs"] if item["id"] == run_id)
    if (_run_identity(final_listed, repository, branch, expected_sha) != run_identity or
            _run_identity(_request(request_json, run_path), repository, branch, expected_sha) != run_identity):
        raise ValueError("Candidate CI run or attempt changed")
    final_rollup = _native_rollup(
        pr, all_pages(checks_path, "check_runs", request_json),
        all_pages(statuses_path, "statuses", request_json),
    )
    if pr_ci_status(final_rollup, expected_sha) != "success":
        raise ValueError("Candidate PR check rollup changed or is no longer successful")
    if _reviews(all_pages(reviews_path, None, request_json)) != reviews:
        raise ValueError("Candidate reviews changed during collection")
    if _pr_identity(_request(request_json, pr_path), repository, pr_number, branch, base, expected_sha) != identity:
        raise ValueError("Candidate PR identity changed during collection")
    return {"repository": repository, "pr_number": pr_number, "branch": branch, "base": base,
            "head_sha": expected_sha, "tree_sha": expected_tree, "run_id": run_id,
            "run_attempt": run_identity[1], "ci": "success", "reviews": reviews,
            "required_jobs": sorted(REQUIRED_JOBS),
            "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
