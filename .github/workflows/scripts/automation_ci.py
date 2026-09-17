"""Select and validate current-head CI evidence for deferred automation writes."""
import json
import re
import sys


REQUIRED_JOBS = {
    "Test & Lint",
    "Playground E2E (Playwright)",
    "Build",
    "Validate Python Examples",
}

CI_PATH = ".github/workflows/ci.yml"


def _object(value):
    if not isinstance(value, dict):
        raise ValueError("Expected a GitHub response object")
    return value


def _text(value):
    if not isinstance(value, str) or not value:
        raise ValueError("Missing GitHub evidence field")
    return value


def _sha(value):
    if not re.fullmatch(r"[0-9a-f]{40}", _text(value)):
        raise ValueError("Expected a complete GitHub commit SHA")
    return value


def _positive_id(value):
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ValueError("Expected a positive GitHub ID")
    return value


def _complete_rows(payload, key):
    payload = _object(payload)
    rows, total = payload.get(key), payload.get("total_count")
    if (not isinstance(rows, list) or not isinstance(total, int) or
            isinstance(total, bool) or total != len(rows)):
        raise ValueError(f"Incomplete {key} evidence; collect all pages, preserving total_count")
    for row in rows:
        _object(row)
    return rows


def _rest_run(run):
    run = _object(run)
    if run.get("path") != CI_PATH:
        raise ValueError("Run evidence must identify the CI workflow path")
    created = _text(run.get("created_at"))
    if not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", created):
        raise ValueError("Expected GitHub's UTC run creation timestamp")
    conclusion = run.get("conclusion")
    if conclusion is not None and not isinstance(conclusion, str):
        raise ValueError("Invalid run conclusion")
    return {"databaseId": _positive_id(run.get("id")),
            "headSha": _sha(run.get("head_sha")), "createdAt": created,
            "status": _text(run.get("status")), "conclusion": conclusion}


def rest_runs(payload):
    """Consume complete, head-filtered CI REST results, never tool prose."""
    return [_rest_run(run) for run in _complete_rows(payload, "workflow_runs")]


def mcp_runs(payload):
    """Validate a bounded first page; the pinned MCP ignores head_sha filters."""
    payload = _object(payload)
    if (type(payload.get("page")) is not int or payload["page"] != 1 or
            type(payload.get("per_page")) is not int or payload["per_page"] != 100):
        raise ValueError("MCP run selection requires the requested first page of 100")
    response = _object(payload.get("runs"))
    rows, total = response.get("workflow_runs"), response.get("total_count")
    if (not isinstance(rows, list) or type(total) is not int or total < 0 or
            len(rows) != min(total, 100)):
        raise ValueError("Incomplete first-page run evidence; preserve the original count")
    runs = [_rest_run(run) for run in rows]
    order = [(run["createdAt"], run["databaseId"]) for run in runs]
    if len({run["databaseId"] for run in runs}) != len(runs) or order != sorted(order, reverse=True):
        raise ValueError("MCP runs must be unique and newest first")
    return runs


def rest_run_with_jobs(payload):
    payload = _object(payload)
    run = _rest_run(payload.get("run"))
    jobs = _complete_rows(payload.get("jobs"), "jobs")
    for job in jobs:
        if (_positive_id(job.get("run_id")) != run["databaseId"] or
                _sha(job.get("head_sha")) != run["headSha"]):
            raise ValueError("Job evidence belongs to another run or commit")
        _text(job.get("name"))
        _text(job.get("status"))
    return {**run, "jobs": jobs}


def rest_pull_request_checks(payload):
    payload = _object(payload)
    pull_request = _object(payload.get("pull_request"))
    head = _sha(_object(pull_request.get("head")).get("sha"))
    checks = _complete_rows(payload.get("check_runs"), "check_runs")
    status = _object(payload.get("status"))
    if _sha(status.get("sha")) != head:
        raise ValueError("Combined status belongs to another commit")
    statuses = _complete_rows(status, "statuses")
    for check in checks:
        if _sha(check.get("head_sha")) != head:
            raise ValueError("Check evidence belongs to another commit")
        _text(check.get("name"))
        _text(check.get("status"))
        # Keep a missing conclusion from being interpreted as a classic status.
        if "conclusion" not in check:
            raise ValueError("Check evidence is missing its conclusion field")
        if check["conclusion"] is not None and not isinstance(check["conclusion"], str):
            raise ValueError("Invalid check conclusion")
    for context in statuses:
        _text(context.get("context"))
        _text(context.get("state"))
    return {"headRefOid": head, "statusCheckRollup": [*checks, *statuses]}


def mcp_pull_request_checks(payload):
    """Bind minimized MCP checks to full authenticated Actions job receipts.

    get_check_runs omits head_sha and list_workflow_jobs omits check_run_url.
    Only get_workflow_job supplies both; do not invent the missing API fields.
    """
    payload = _object(payload)
    pull_request = _object(payload.get("pull_request"))
    head = _sha(_object(pull_request.get("head")).get("sha"))
    repository = _text(_object(_object(pull_request.get("base")).get("repo")).get("full_name"))
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Expected the PR base repository identity")
    checks = _complete_rows(payload.get("check_runs"), "check_runs")
    status = _object(payload.get("status"))
    if _sha(status.get("sha")) != head:
        raise ValueError("Combined status belongs to another commit")
    statuses = _complete_rows(status, "statuses")
    for context in statuses:
        _text(context.get("context"))
        _text(context.get("state"))

    receipts = payload.get("job_receipts")
    if not isinstance(receipts, list):
        raise ValueError("Full authenticated job receipts are required for MCP checks")
    by_check = {}
    for receipt in receipts:
        receipt = _object(receipt)
        check_url = _text(receipt.get("check_run_url"))
        match = re.fullmatch(re.escape(f"https://api.github.com/repos/{repository}/check-runs/") +
                             r"([1-9][0-9]*)", check_url)
        if match is None or check_url in by_check:
            raise ValueError("Ambiguous or wrong-repository job receipt")
        _positive_id(receipt.get("id"))
        _positive_id(receipt.get("run_id"))
        if _sha(receipt.get("head_sha")) != head:
            raise ValueError("Job receipt belongs to another commit")
        by_check[check_url] = receipt

    bound_checks = []
    seen = set()
    for check in checks:
        check_id = _positive_id(check.get("id"))
        if check_id in seen:
            raise ValueError("Duplicate check identity in paginated evidence")
        seen.add(check_id)
        if _text(check.get("name")) not in REQUIRED_JOBS:
            continue
        check_url = f"https://api.github.com/repos/{repository}/check-runs/{check_id}"
        receipt = by_check.get(check_url)
        if receipt is None:
            raise ValueError("A required check lacks its full job receipt")
        for field in ("name", "status", "conclusion", "html_url"):
            if field not in check or field not in receipt or check[field] != receipt[field]:
                raise ValueError("Check and job receipt disagree; reread current evidence")
        _text(check.get("status"))
        _text(check.get("html_url"))
        if check["conclusion"] is not None and not isinstance(check["conclusion"], str):
            raise ValueError("Invalid check conclusion")
        # Retain every required-name row, even when two CI runs share this SHA.
        bound_checks.append(check)
    return {"headRefOid": head, "statusCheckRollup": [*bound_checks, *statuses]}


def latest_run_id(runs, head_sha):
    matching = [run for run in runs if run.get("headSha") == head_sha]
    if not matching:
        return None
    latest = max(matching, key=lambda run: (run["createdAt"], run["databaseId"]))
    return latest["databaseId"]


def ci_status(run, head_sha):
    if run.get("headSha") != head_sha:
        return "pending"
    if run.get("status") != "completed":
        return "pending"
    if run.get("conclusion") != "success":
        return "failure"
    jobs = [job for job in run.get("jobs", []) if job.get("name") in REQUIRED_JOBS]
    if {job["name"] for job in jobs} != REQUIRED_JOBS:
        return "pending"
    if any(job.get("status") != "completed" for job in jobs):
        return "pending"
    # Check every matching row, so duplicate failed/skipped gates cannot be
    # hidden by a successful row with the same name.
    if any(job.get("conclusion") != "success" for job in jobs):
        return "failure"
    return "success"


def pr_ci_status(pull_request, head_sha):
    if pull_request.get("headRefOid") != head_sha:
        return "pending"
    checks = [check for check in pull_request.get("statusCheckRollup", [])
              if check.get("name", check.get("context")) in REQUIRED_JOBS]
    if {check.get("name", check.get("context")) for check in checks} != REQUIRED_JOBS:
        return "pending"
    for check in checks:
        if "conclusion" in check:
            if (check.get("status") or "").lower() != "completed":
                return "pending"
            if (check.get("conclusion") or "").lower() != "success":
                return "failure"
        elif (check.get("state") or "").lower() != "success":
            return "pending" if (check.get("state") or "").lower() == "pending" else "failure"
    return "success"


def main(argv=None):
    mode, sha = sys.argv[1:] if argv is None else argv
    data = json.load(sys.stdin)
    adapters = {"rest-select": rest_runs, "rest-status": rest_run_with_jobs,
                "rest-pr-status": rest_pull_request_checks, "mcp-select": mcp_runs,
                "mcp-pr-status": mcp_pull_request_checks}
    if mode in adapters:
        _sha(sha)
        data = adapters[mode](data)
        mode = mode.removeprefix("rest-").removeprefix("mcp-")
    if mode == "select":
        run_id = latest_run_id(data, sha)
        if run_id is None:
            return 3
        print(run_id)
    elif mode == "status":
        print(ci_status(data, sha))
    elif mode == "pr-status":
        print(pr_ci_status(data, sha))
    else:
        raise ValueError("Expected select/status/pr-status, rest- modes, or mcp-select/mcp-pr-status")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, KeyError, TypeError) as error:
        print(f"CI evidence unavailable: {error}", file=sys.stderr)
        sys.exit(2)
