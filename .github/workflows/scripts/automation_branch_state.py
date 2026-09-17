#!/usr/bin/env python3
"""Choose resume versus base refresh from trusted selection and live PR evidence."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys


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


def github_open_prs(repository, branch):
    result = subprocess.run(
        ["gh", "api", "--method", "GET", f"repos/{repository}/pulls",
         "-f", "state=open", "-f", f"head={repository.split('/')[0]}:{branch}",
         "-F", "per_page=100"],
        check=True, capture_output=True, text=True, timeout=30,
    )
    return json.loads(result.stdout)


def branch_mode(selection, branch, base, repository, fetch_open_prs=github_open_prs):
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


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--base", required=True)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args(argv)
    try:
        selection = json.loads(args.selection.read_text())
        print(branch_mode(selection, args.branch, args.base, args.repo))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"Branch preparation blocked: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
