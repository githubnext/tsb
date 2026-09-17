#!/usr/bin/env python3
"""Host-only authenticated PR/ref snapshot and object fetch; never stage credentials."""

import argparse
import base64
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


spec = importlib.util.spec_from_file_location("branch_state", Path(__file__).with_name("automation_branch_state.py"))
state = importlib.util.module_from_spec(spec)
spec.loader.exec_module(state)


def read_json(route, missing_ok=False):
    token = os.environ.get("GITHUB_TOKEN")
    api_url = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
    if not token or not api_url.startswith("https://"):
        raise ValueError("Authenticated host GitHub reads are required")
    request = urllib.request.Request(api_url + "/" + route, headers={
        "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            value = json.loads(response.read())
            if value is None:
                raise ValueError("GitHub returned null instead of object/list evidence")
            return value
    except urllib.error.HTTPError as error:
        if missing_ok and error.code == 404:
            return None
        raise ValueError(f"Host GitHub read failed with HTTP {error.code}") from error


def ref_sha(repository, branch, read=read_json, missing_ok=False):
    value = read(f"repos/{repository}/git/ref/heads/{urllib.parse.quote(branch, safe='')}", missing_ok)
    if value is None and missing_ok:
        return None
    if (not isinstance(value, dict) or value.get("ref") != "refs/heads/" + branch or
            not isinstance(value.get("object"), dict) or value["object"].get("type") != "commit" or
            not state.commit_sha(value["object"].get("sha"))):
        raise ValueError("GitHub returned invalid exact-ref evidence")
    return value["object"]["sha"]


def capture(selection, branch, base, repository, run_id, run_attempt, read=read_json, now=None):
    state.selected_pr(selection, branch)
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("A valid repository identity is required")
    base_sha = ref_sha(repository, base, read)
    head_sha = ref_sha(repository, branch, read, missing_ok=True)
    query = urllib.parse.urlencode({"state": "open", "head": repository.split('/')[0] + ":" + branch,
                                   "per_page": 100})
    pull_requests = read(f"repos/{repository}/pulls?{query}")
    mode = state.branch_mode(selection, branch, base, repository, lambda *_: pull_requests)
    if mode == "resume" and (pull_requests[0]["head"].get("sha") != head_sha or head_sha is None):
        raise ValueError("PR refs moved during snapshot capture; retry with fresh evidence")
    snapshot = {"schema_version": 1, "status": "ready", "repository": repository,
                "branch": branch, "base": base, "mode": mode,
                "head_sha": head_sha, "base_sha": base_sha,
                "existing_pr": state.selected_pr(selection, branch), "run_id": run_id,
                "run_attempt": run_attempt, "selection_digest": state.selection_digest(selection),
                "captured_at": time.time() if now is None else now}
    state.validate_snapshot(selection, snapshot, branch, base, repository, run_id, run_attempt,
                            now=snapshot["captured_at"])
    return snapshot


def fetch_bound_refs(snapshot, root):
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    expected_url = server + "/" + snapshot["repository"]
    remote = subprocess.run(["git", "remote", "get-url", "origin"], cwd=root, check=True,
                            capture_output=True, text=True, timeout=30).stdout.strip()
    if not server.startswith("https://") or remote not in (expected_url, expected_url + ".git"):
        raise ValueError("Origin must be the exact credential-free repository HTTPS URL")
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError("Host ref fetching requires the existing read token")
    header = "AUTHORIZATION: basic " + base64.b64encode(("x-access-token:" + token).encode()).decode()
    env = {**os.environ, "GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": f"http.{server}/.extraheader",
           "GIT_CONFIG_VALUE_0": header, "GIT_TERMINAL_PROMPT": "0"}
    branches = ([snapshot["base"]] if snapshot["mode"] == "refresh-base" else [])
    branches += [snapshot["branch"]] if snapshot["head_sha"] else []
    subprocess.run(["git", "fetch", "--no-tags", "origin",
                    *[f"+refs/heads/{branch}:refs/remotes/origin/{branch}" for branch in branches]],
                   cwd=root, env=env, check=True, capture_output=True, text=True, timeout=60)
    for branch, sha in ((snapshot["base"], snapshot["base_sha"]), (snapshot["branch"], snapshot["head_sha"])):
        if branch == snapshot["base"] and snapshot["mode"] == "resume":
            continue
        if sha is None:
            # Reconfirm absence with this authenticated read, never from a stale
            # local tracking ref. Old objects may legitimately remain locally.
            absent = subprocess.run(["git", "ls-remote", "--heads", "origin", "refs/heads/" + branch],
                                    cwd=root, env=env, check=True, capture_output=True, text=True, timeout=30)
            if absent.stdout.strip():
                raise ValueError("Canonical branch appeared during snapshot fetch")
        else:
            actual = subprocess.run(["git", "rev-parse", "refs/remotes/origin/" + branch], cwd=root,
                                    check=True, capture_output=True, text=True, timeout=30).stdout.strip()
            if actual != sha:
                raise ValueError("Fetched ref differs from authenticated snapshot")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--base", required=True)
    args = parser.parse_args(argv)
    try:
        selection = json.loads(args.selection.read_text())
        if not isinstance(selection, dict) or "selected" not in selection or selection.get("error"):
            raise ValueError("Successful scheduler selection is required")
        if selection["selected"] is None:
            args.output.write_text(json.dumps({"schema_version": 1, "status": "skipped"}) + "\n")
            print("No selected work; branch evidence capture skipped")
            return 0
        branch = state.selection_branch(selection)
        if not isinstance(branch, str) or not branch.startswith(("autoloop/", "goal/")) or branch == args.base:
            raise ValueError("A distinct canonical automation branch is required")
        for ref in (branch, args.base):
            subprocess.run(["git", "check-ref-format", "--branch", ref], check=True, capture_output=True, timeout=30)
        snapshot = capture(selection, branch, args.base, os.environ.get("GITHUB_REPOSITORY", ""),
                           os.environ.get("GITHUB_RUN_ID", ""), os.environ.get("GITHUB_RUN_ATTEMPT", ""))
        fetch_bound_refs(snapshot, args.repo_root)
        args.output.write_text(json.dumps(snapshot, sort_keys=True, indent=2) + "\n")
        print("Captured token-free branch snapshot and fetched its exact refs")
        return 0
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        # Do not leave stale evidence behind and do not render child env/token.
        args.output.write_text(json.dumps({"schema_version": 1, "status": "error"}) + "\n")
        print(f"Host branch preparation failed: {type(error).__name__}; no agent may start", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
