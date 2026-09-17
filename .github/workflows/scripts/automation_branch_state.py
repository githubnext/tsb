#!/usr/bin/env python3
"""Validate a token-free host snapshot before offline automation branch preparation."""

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time


MAX_SNAPSHOT_AGE = 300


def selection_digest(selection):
    return hashlib.sha256(json.dumps(selection, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def selection_branch(selection):
    if not isinstance(selection, dict):
        raise ValueError("Invalid scheduler selection")
    selected = selection.get("selected")
    return selected.get("branch") if isinstance(selected, dict) else selection.get("head_branch")


def commit_sha(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value) is not None


def positive_integer(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def selected_pr(selection, branch):
    if not isinstance(selection, dict) or selection.get("error"):
        raise ValueError("Branch preparation requires successful scheduler evidence")
    selected = selection.get("selected")
    if isinstance(selected, dict):
        selected_branch, record = selected.get("branch"), selected
    elif isinstance(selected, str) and selected:
        selected_branch, record = selection.get("head_branch"), selection
    else:
        raise ValueError("Branch preparation requires selected work")
    if selected_branch != branch or "existing_pr" not in record:
        raise ValueError("Selection must identify this exact branch and its PR state")
    number = record["existing_pr"]
    if number is not None and not positive_integer(number):
        raise ValueError("Selected PR must be a positive integer or explicit null")
    return number


def branch_mode(selection, branch, base, repository, fetch_open_prs):
    number = selected_pr(selection, branch)
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("A valid repository identity is required")
    pull_requests = fetch_open_prs(repository, branch)
    if not isinstance(pull_requests, list) or len(pull_requests) > 1:
        raise ValueError("Expected an unambiguous open-PR list for this branch")
    for pull_request in pull_requests:
        if not isinstance(pull_request, dict):
            raise ValueError("Invalid open-PR evidence")
        head = pull_request.get("head")
        target = pull_request.get("base")
        if (not positive_integer(pull_request.get("number")) or
                pull_request.get("state") != "open" or not isinstance(head, dict) or
                head.get("ref") != branch or not isinstance(head.get("repo"), dict) or
                head["repo"].get("full_name") != repository or not isinstance(target, dict) or
                target.get("ref") != base or not isinstance(target.get("repo"), dict) or
                target["repo"].get("full_name") != repository):
            raise ValueError("Open-PR evidence does not match the canonical repository branch")
    live_number = pull_requests[0]["number"] if pull_requests else None
    if live_number != number:
        raise ValueError("Scheduler PR selection is stale; stop and select again on a later run")
    return "resume" if live_number is not None else "refresh-base"


def validate_snapshot(selection, snapshot, branch, base, repository, run_id, run_attempt, now=None):
    number = selected_pr(selection, branch)
    if not isinstance(snapshot, dict) or type(snapshot.get("schema_version")) is not int or snapshot["schema_version"] != 1:
        raise ValueError("A successful trusted host branch snapshot is required")
    expected = {"status": "ready", "repository": repository, "branch": branch, "base": base,
                "run_id": run_id, "run_attempt": run_attempt, "existing_pr": number,
                "selection_digest": selection_digest(selection),
                "mode": "resume" if number is not None else "refresh-base"}
    if (not expected.keys() <= snapshot.keys() or
            not re.fullmatch(r"[1-9][0-9]*", run_id) or not re.fullmatch(r"[1-9][0-9]*", run_attempt) or
            any(snapshot.get(key) != value for key, value in expected.items())):
        raise ValueError("Host branch snapshot does not match this run and selection")
    if snapshot["existing_pr"] is not None and not positive_integer(snapshot["existing_pr"]):
        raise ValueError("Host snapshot PR identity must be an integer")
    captured_at = snapshot.get("captured_at")
    if not isinstance(captured_at, (int, float)) or isinstance(captured_at, bool) or not math.isfinite(captured_at):
        raise ValueError("Host branch snapshot has no valid capture time")
    age = (time.time() if now is None else now) - captured_at
    if age < 0 or age > MAX_SNAPSHOT_AGE:
        raise ValueError("Host branch snapshot expired or is future-dated; rerun for fresh evidence")
    if not commit_sha(snapshot.get("base_sha")) or "head_sha" not in snapshot:
        raise ValueError("Host branch snapshot lacks bound ref identities")
    if snapshot["head_sha"] is not None and not commit_sha(snapshot["head_sha"]):
        raise ValueError("Host branch snapshot has an invalid canonical head")
    if snapshot["mode"] == "resume" and snapshot["head_sha"] is None:
        raise ValueError("An active PR requires a bound canonical head")
    return snapshot


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--base", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--evidence", type=Path, default=Path(__file__).with_name("tsb_agent_branch_state.json"))
    args = parser.parse_args(argv)
    try:
        selection = json.loads(args.selection.read_text())
        snapshot = validate_snapshot(selection, json.loads(args.evidence.read_text()), args.branch,
                                     args.base, args.repo, os.environ.get("GITHUB_RUN_ID", ""),
                                     os.environ.get("GITHUB_RUN_ATTEMPT", ""))
        print(snapshot["mode"], snapshot["head_sha"] or "absent", snapshot["base_sha"])
        return 0
    except (OSError, ValueError) as error:
        print(f"Branch preparation blocked: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
