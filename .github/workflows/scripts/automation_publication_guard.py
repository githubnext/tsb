"""Read-only publication approval; candidate files are data, never executable code.

The report binds a proposal to an observed remote-memory baseline. It is not a
compare-and-swap guarantee: gh-aw's publisher can retry a concurrent memory push.
Run this file and its siblings only from an immutable, trusted host checkout.
"""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
from urllib.parse import quote

# -I excludes the script directory. Only this trusted checkout supplies siblings.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from automation_publication_evidence import GitHubReader, candidate_evidence
from autoloop_policy import parse_machine_state as autoloop_state
from goal_scheduler import parse_machine_state as goal_state


MAX_FILES = 100
MAX_BYTES = {"goal": 40960, "autoloop": 30720}
EMPTY = {"", "-", "—", "–", "null", "none"}
SHA = re.compile(r"[0-9a-f]{40}")
REPOSITORY = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")


def _object(value):
    if not isinstance(value, dict):
        raise ValueError("Expected an object")
    return value


def strict_json(text):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate publication JSON field")
            result[key] = value
        return result

    def invalid(_value):
        raise ValueError("Non-finite publication JSON number")

    return json.loads(text, object_pairs_hook=unique, parse_constant=invalid)


def _sha(value):
    if not isinstance(value, str) or not SHA.fullmatch(value):
        raise ValueError("Expected a full immutable SHA")
    return value


def _path(value):
    if (not isinstance(value, str) or not value or "\\" in value or any(ord(char) < 32 for char in value) or
            PurePosixPath(value).is_absolute() or
            any(part in {".", "..", ".git", ""} for part in value.split("/")) or
            not value.endswith(".md")):
        raise ValueError("Invalid memory path")
    return value


def digest_files(files):
    serialized = json.dumps(files, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(serialized.encode()).hexdigest()


def read_proposal(directory, max_bytes=30720):
    root = Path(directory)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Missing regular repo-memory proposal directory")
    result = {}
    for base, directories, files in os.walk(root, followlinks=False):
        for name in directories:
            if Path(base, name).is_symlink():
                raise ValueError("Symlink in repo-memory proposal")
        for name in files:
            path = Path(base, name)
            metadata = path.lstat()
            relative = _path(path.relative_to(root).as_posix())
            if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > max_bytes:
                raise ValueError("Unsafe or oversized repo-memory file")
            result[relative] = path.read_text(encoding="utf-8")
            if len(result) > MAX_FILES:
                raise ValueError("Too many repo-memory files")
    return result


def remote_memory(repository, branch, request_json):
    if not REPOSITORY.fullmatch(repository) or branch not in {"memory/goal", "memory/autoloop"}:
        raise ValueError("Invalid repository or memory branch")
    prefix = f"/repos/{repository}"
    max_bytes = MAX_BYTES[branch.removeprefix("memory/")]
    reference = _object(request_json(f"{prefix}/git/ref/heads/{quote(branch, safe='/')}"))
    if reference.get("ref") != f"refs/heads/{branch}":
        raise ValueError("Memory ref identity mismatch")
    target = _object(reference.get("object"))
    if target.get("type") != "commit":
        raise ValueError("Memory ref is not a commit")
    commit_sha = _sha(target.get("sha"))
    commit = _object(request_json(f"{prefix}/git/commits/{commit_sha}"))
    if commit.get("sha") != commit_sha:
        raise ValueError("Memory commit identity mismatch")
    tree_sha = _sha(_object(commit.get("tree")).get("sha"))
    tree = _object(request_json(f"{prefix}/git/trees/{tree_sha}?recursive=1"))
    if tree.get("sha") != tree_sha or tree.get("truncated") is not False or not isinstance(tree.get("tree"), list):
        raise ValueError("Incomplete memory tree")
    files = {}
    for entry in tree["tree"]:
        entry = _object(entry)
        if entry.get("type") == "tree":
            continue
        path = _path(entry.get("path"))
        size = entry.get("size")
        if (entry.get("type") != "blob" or entry.get("mode") not in {"100644", "100755"} or
                type(size) is not int or size < 0 or size > max_bytes or path in files):
            raise ValueError("Unsafe memory tree entry")
        blob_sha = _sha(entry.get("sha"))
        blob = _object(request_json(f"{prefix}/git/blobs/{blob_sha}"))
        if blob.get("sha") != blob_sha or blob.get("encoding") != "base64" or blob.get("size") != size:
            raise ValueError("Invalid memory blob")
        content = blob.get("content")
        if not isinstance(content, str):
            raise ValueError("Missing memory blob content")
        raw = base64.b64decode("".join(content.splitlines()), validate=True)
        if len(raw) != size or hashlib.sha1(f"blob {size}\0".encode() + raw).hexdigest() != blob_sha:
            raise ValueError("Memory blob content does not match its Git identity")
        files[path] = raw.decode("utf-8")
        if len(files) > MAX_FILES:
            raise ValueError("Too many remote memory files")
    return {"commit_sha": commit_sha, "tree_sha": tree_sha, "digest": digest_files(files), "files": files}


def machine_state(content, workflow="autoloop"):
    fields = {}
    in_state = False
    found = False
    heading = "## ⚙️ Machine State" if workflow == "autoloop" else "## Machine State"
    for line in content.splitlines():
        if "machine state" in line.lower() and "##" in line:
            if line != heading:
                raise ValueError("Noncanonical Machine State heading")
        if line.startswith("## "):
            if line == heading:
                if found:
                    raise ValueError("Duplicate Machine State section")
                found = in_state = True
            else:
                in_state = False
            continue
        if not in_state or "|" not in line:
            continue
        if not line.startswith("|") or not line.endswith("|"):
            raise ValueError("Noncanonical pipe-bearing Machine State row")
        parts = line.split("|")
        if len(parts) != 4:
            raise ValueError("Ambiguous Machine State table row")
        key, value = parts[1].strip(), parts[2].strip()
        if key.lower() == "field" or re.fullmatch(r":?-+:?", key):
            continue
        normalized = key.lower().replace(" ", "_")
        if not normalized or normalized in fields:
            raise ValueError("Duplicate or empty Machine State field")
        fields[normalized] = value.strip("`") if normalized in {"branch", "issue", "pr"} else value
    if not found or not fields:
        raise ValueError("Missing Machine State table")
    for key in ("paused", "completed", "blocked"):
        if key in fields and fields[key] not in {"true", "false"}:
            raise ValueError(f"Ambiguous {key} boolean; use exactly true or false")
    if "status" in fields and fields["status"] not in {
            "active", "blocked", "completed", "needs-action", "needs_action", "pending", "pending-ci", "error", "paused"}:
        raise ValueError("Unknown or ambiguous workflow status")
    if "recent_statuses" in fields and not _empty(fields["recent_statuses"]):
        valid = {"accepted", "rejected", "quality-rejected", "error", "ci-fix-exhausted", "pending-ci", "pending", "blocked"}
        if any(item.strip() not in valid for item in fields["recent_statuses"].split(",")):
            raise ValueError("Unknown or ambiguous recent status")
    consumed = autoloop_state(content) if workflow == "autoloop" else goal_state(content)
    for key in ("paused", "completed", "blocked", "status", "iteration_count", "run_count",
                "consecutive_errors", "best_metric", "target_metric", "pending_metric",
                "pending_tree", "verified_head", "verified_tree", "recent_statuses"):
        if key not in fields:
            if key in consumed and key != "recent_statuses":
                raise ValueError("Scheduler sees an unvalidated control field")
            continue
        value = fields[key]
        if key in {"iteration_count", "run_count", "consecutive_errors"}:
            if not re.fullmatch(r"0|[1-9][0-9]*", value):
                raise ValueError("Noncanonical scheduler count")
            integer_fields = {"iteration_count", "consecutive_errors"} if workflow == "autoloop" else {"run_count"}
            expected = int(value) if key in integer_fields else value
        elif key in ({"paused", "completed"} if workflow == "autoloop" else {"completed", "blocked"}):
            expected = value == "true"
        elif key == "recent_statuses" and workflow == "autoloop":
            expected = [] if _empty(value) else [item.strip() for item in value.split(",")]
        else:
            if key in {"best_metric", "target_metric", "pending_metric"} and "`" in value:
                raise ValueError("Noncanonical scheduler metric")
            placeholders = {"—", "-", ""} if workflow == "autoloop" else {"-", "--", ""}
            expected = None if value in placeholders else value
        if consumed.get(key) != expected:
            raise ValueError("Guard and scheduler disagree on control state")
    return fields


def _empty(value):
    return value is None or value.lower() in EMPTY


def _number(value):
    if not isinstance(value, str) or not re.fullmatch(r"#?[1-9][0-9]*", value):
        raise ValueError("Missing positive issue/PR identity")
    return int(value.lstrip("#"))


def classify_change(before, after):
    reasons = []
    if before.get("paused") == "true" and after.get("paused") != "true":
        raise ValueError("An agent cannot remove an explicit pause")
    if before.get("completed") == "true" and after.get("completed") != "true":
        raise ValueError("An agent cannot reset completion")
    if before.get("status") == "completed" and after.get("status") != "completed":
        raise ValueError("An agent cannot reset completed status")
    for field in ("issue", "branch"):
        if not _empty(before.get(field)) and before.get(field) != after.get(field):
            raise ValueError(f"An agent cannot change memory {field} identity")
    if before.get("best_metric") != after.get("best_metric") and not (
            _empty(before.get("best_metric")) and _empty(after.get("best_metric"))):
        reasons.append("metric")
    if ((after.get("completed") == "true" and before.get("completed") != "true") or
            (after.get("status") == "completed" and before.get("status") != "completed")):
        reasons.append("completion")
    if any(before.get(field) != after.get(field) and not _empty(after.get(field))
           for field in ("verified_head", "verified_tree")):
        reasons.append("verified-evidence")
    statuses = [item.strip() for item in after.get("recent_statuses", "").split(",")]
    previous_statuses = [item.strip() for item in before.get("recent_statuses", "").split(",") if item.strip()]
    nonsuccess = (after.get("status") in {"blocked", "error"} or after.get("blocked") == "true" or
                  statuses[-1].strip() in {"rejected", "quality-rejected", "error", "blocked", "ci-fix-exhausted"})
    if not _empty(before.get("pending_tree")) and _empty(after.get("pending_tree")) and not nonsuccess:
        reasons.append("checkpoint-resolution")
    if (statuses[-1].strip() == "accepted" and
            (before.get("recent_statuses") != after.get("recent_statuses") or
             before.get("iteration_count") != after.get("iteration_count"))):
        reasons.append("acceptance")
    elif ("accepted" in statuses and statuses != previous_statuses and
          statuses != (previous_statuses + [statuses[-1]])[-10:]):
        reasons.append("acceptance")
    return reasons


def read_outputs(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 2_000_000:
        raise ValueError("Missing or unsafe queued safe outputs")
    values = [_object(strict_json(line)) for line in path.read_text().splitlines() if line.strip()]
    if len(values) > 100:
        raise ValueError("Too many queued safe outputs")
    return values


def canonical_labels(value):
    if not isinstance(value, list) or not all(isinstance(label, str) for label in value):
        raise ValueError("Malformed labels; require plain label names")
    # The publisher strips controls, HTML punctuation and Unicode decorations.
    # Refuse sanitizer-changing spelling instead of approximating that transform.
    if any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_ /:.-]*", label) or label != label.strip() for label in value):
        raise ValueError("Noncanonical or sanitizer-changing label name")
    return [label.casefold() for label in value]


def output_claims(outputs, workflow):
    """Require approved transitions for explicit completion actions, not prose.

    Comments neither prove CI nor authorize a state transition. This intentionally
    does not attempt to semantically classify arbitrary natural-language claims.
    """
    claims = []
    for output in outputs:
        kind = output.get("type")
        if kind in {"noop", "missing_data", "missing_tool"}:
            continue
        if kind in {"create_pull_request", "push_to_pull_request_branch"}:
            # Existing gh-aw protected-file and draft-publication controls remain.
            continue
        if kind in {"add_labels", "remove_labels"}:
            labels = canonical_labels(output.get("labels"))
            terminal = (any("completed" in label.lower() or "accepted" in label.lower() for label in labels)
                        if kind == "add_labels" else any(label in {"goal", "autoloop-program"} for label in labels))
            if terminal:
                claims.append(_number(str(output.get("item_number", output.get("issue_number", "")))))
            continue
        if kind not in {"add_comment", "update_issue", "create_issue"}:
            raise ValueError(f"Unreviewed safe-output type: {kind}")
        body = output.get("body", "")
        if not isinstance(body, str):
            raise ValueError("Malformed output body")
        terminal = output.get("status") == "closed" or output.get("state") == "closed"
        if kind == "update_issue" and "labels" in output:
            labels = canonical_labels(output["labels"])
            scheduler_label = "goal" if workflow == "goal" else "autoloop-program"
            terminal = terminal or scheduler_label not in labels or any(
                "completed" in label.lower() or "accepted" in label.lower() for label in labels)
        if terminal:
            claims.append(_number(str(output.get("item_number", output.get("issue_number", "")))))
    return claims


def approved_transition(policy, workflow, path, state, reasons):
    if policy.get("schema_version") != 1 or not isinstance(policy.get("approvals"), list):
        raise ValueError("Invalid trusted publication policy")
    matches = [entry for entry in policy["approvals"] if isinstance(entry, dict) and
               entry.get("workflow") == workflow and entry.get("state_path") == path]
    if len(matches) != 1:
        raise ValueError(f"No unique approved criterion/evaluator for {path}")
    entry = matches[0]
    for field in ("criterion", "evaluator"):
        if not isinstance(entry.get(field), str) or not entry[field].strip():
            raise ValueError("Approved criterion and evaluator identifiers are required")
    if (type(entry.get("issue")) is not int or type(entry.get("pr")) is not int or
            entry.get("issue") != _number(state.get("issue")) or entry.get("pr") != _number(state.get("pr"))):
        raise ValueError("Approval does not bind this issue/PR")
    if entry.get("branch") != state.get("branch") or not isinstance(entry.get("base"), str) or not entry["base"]:
        raise ValueError("Approval does not bind canonical branch/base")
    if "completion" in reasons and entry.get("allow_completion") is not True:
        raise ValueError("Criterion does not permit completion")
    if "metric" in reasons or "acceptance" in reasons:
        if _empty(state.get("best_metric")) or entry.get("metric") != state["best_metric"]:
            raise ValueError("No approved metric receipt for this exact checkpoint")
    _sha(entry.get("head_sha"))
    _sha(entry.get("tree_sha"))
    for field, identity in (("verified_head", "head_sha"), ("verified_tree", "tree_sha")):
        if not _empty(state.get(field)):
            match = re.match(r"([0-9a-f]{40})(?:\s|$)", state[field])
            if match is None or match.group(1) != entry[identity]:
                raise ValueError(f"Approval does not bind proposed {field}")
    return entry


def bind_selection(repository, workflow, selection, branch_state, run_id=None, run_attempt=None):
    selection, branch_state = _object(selection), _object(branch_state)
    if ("selected" not in selection or selection.get("error") or
            type(branch_state.get("schema_version")) is not int or branch_state["schema_version"] != 1):
        raise ValueError("Missing or failed host selection")
    selected = selection["selected"]
    if selected is None:
        if branch_state.get("status") != "skipped":
            raise ValueError("Null selection has inconsistent branch evidence")
        return None
    if workflow == "goal":
        selected = _object(selected)
        path = _path(selected.get("state_file"))
        issue, branch, pr = selected.get("number"), selected.get("branch"), selected.get("existing_pr")
    else:
        if not isinstance(selected, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", selected):
            raise ValueError("Invalid selected program name")
        path = _path(selected + ".md")
        issue, branch, pr = selection.get("selected_issue"), selection.get("head_branch"), selection.get("existing_pr")
    if issue is not None and (type(issue) is not int or issue <= 0):
        raise ValueError("Invalid selected issue")
    if pr is not None and (type(pr) is not int or pr <= 0):
        raise ValueError("Invalid selected PR")
    if not isinstance(branch, str) or not branch.startswith(workflow + "/"):
        raise ValueError("Invalid selected canonical branch")
    if (branch_state.get("status") != "ready" or branch_state.get("repository") != repository or
            branch_state.get("branch") != branch or branch_state.get("existing_pr") != pr):
        raise ValueError("Host selection and branch evidence disagree")
    digest = hashlib.sha256(json.dumps(selection, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if branch_state.get("selection_digest") != digest:
        raise ValueError("Host selection digest mismatch")
    if (run_id is not None and branch_state.get("run_id") != str(run_id)) or (
            run_attempt is not None and branch_state.get("run_attempt") != str(run_attempt)):
        raise ValueError("Publication context belongs to another run/attempt")
    return {"path": path, "issue": issue, "pr": pr, "branch": branch, "base": branch_state.get("base"),
            "head_sha": branch_state.get("head_sha")}


def bind_outputs(repository, context, outputs):
    for output in outputs:
        kind = output.get("type")
        if kind in {"noop", "missing_data", "missing_tool"}:
            continue
        if context is None:
            raise ValueError("Null selection cannot publish external changes")
        if output.get("repo", repository) != repository:
            raise ValueError("Safe output targets another repository")
        if kind == "create_issue":
            if context["issue"] is not None:
                raise ValueError("Selected work already has an issue")
            continue
        if kind in {"create_pull_request", "push_to_pull_request_branch"}:
            if output.get("branch") != context["branch"]:
                raise ValueError("Code output targets another branch")
            if kind == "create_pull_request" and context["pr"] is not None:
                raise ValueError("Selected work already has an active PR")
            if kind == "push_to_pull_request_branch" and (
                    context["pr"] is None or output.get("pull_request_number") != context["pr"]):
                raise ValueError("Code output targets another PR")
            continue
        target = output.get("item_number", output.get("issue_number"))
        if type(target) is not int or target not in {context["issue"], context["pr"]}:
            raise ValueError("Safe output targets unrelated work")


def check_steering(repository, selection, branch_state, steering, request_json):
    """Invalidate changed startup metadata; not a comment-body equivalence test."""
    steering = _object(steering)
    if type(steering.get("schema_version")) is not int or steering["schema_version"] != 1 or steering.get("complete") is not True:
        raise ValueError("Complete trusted startup steering is required")
    if selection.get("selected") is None:
        if steering.get("status") != "skipped":
            raise ValueError("Null selection has inconsistent steering")
        return {"status": "skipped"}
    if steering.get("status") != "ready":
        raise ValueError("Startup steering was not ready")
    for key in ("repository", "run_id", "run_attempt", "selection_digest", "branch", "head_sha"):
        if steering.get(key) != branch_state.get(key):
            raise ValueError("Startup steering belongs to another selection or run")
    unsigned = {key: value for key, value in steering.items() if key != "evidence_digest"}
    expected = hashlib.sha256(json.dumps(unsigned, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    if steering.get("evidence_digest") != expected:
        raise ValueError("Startup steering digest mismatch")
    selected = selection["selected"]
    issue = selected.get("number") if isinstance(selected, dict) else selection.get("selected_issue")
    pr = branch_state.get("existing_pr")
    routes = {}
    if issue is not None:
        routes[f"/repos/{repository}/issues/{issue}"] = issue
    if pr is not None:
        routes[f"/repos/{repository}/pulls/{pr}"] = pr
    snapshots = steering.get("metadata_snapshots")
    if not isinstance(snapshots, list) or len(snapshots) != len(routes):
        raise ValueError("Missing complete steering metadata snapshots")
    seen = set()
    for snapshot in snapshots:
        snapshot = _object(snapshot)
        route = snapshot.get("route")
        if route not in routes or route in seen:
            raise ValueError("Unbound or duplicate steering metadata route")
        seen.add(route)
        if type(snapshot.get("number")) is not int or snapshot["number"] != routes[route]:
            raise ValueError("Steering metadata identity mismatch")
        current = _object(request_json(route))
        if (type(current.get("number")) is not int or current.get("state") not in {"open", "closed"} or
                type(current.get("comments")) is not int or current["comments"] < 0 or
                not isinstance(current.get("updated_at"), str)):
            raise ValueError("Incomplete fresh steering metadata")
        for key in ("number", "state", "updated_at", "comments", "review_comments"):
            if snapshot.get(key) != current.get(key):
                raise ValueError("Steering metadata changed after startup; rerun with fresh feedback")
        if "/pulls/" in route and snapshot.get("head_sha") != _object(current.get("head")).get("sha"):
            raise ValueError("Steering PR head changed after startup")
    return {"evidence_digest": expected, "metadata_unchanged": True,
            "semantics": "Observed metadata invalidation, not complete post-startup comment-body equivalence"}


def check_memory_baseline(context, steering, baseline):
    if context is None:
        return
    memory = _object(_object(steering).get("memory"))
    if memory.get("file") != context["path"]:
        raise ValueError("Startup memory snapshot does not identify selected work")
    expected = memory.get("sha256")
    if expected is not None and (not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected)):
        raise ValueError("Invalid startup memory digest")
    content = baseline["files"].get(context["path"])
    actual = hashlib.sha256(content.encode()).hexdigest() if content is not None else None
    if expected != actual:
        raise ValueError("Selected memory changed after startup; preserve fresh human guidance and rerun")


def evaluate(repository, workflow, baseline, proposal, outputs, policy, verify_candidate,
             selection, branch_state, run_id=None, run_attempt=None):
    if workflow not in {"goal", "autoloop"}:
        raise ValueError("Unsupported workflow")
    prior = _object(baseline.get("files"))
    context = bind_selection(repository, workflow, selection, branch_state, run_id, run_attempt)
    bind_outputs(repository, context, outputs)
    changes = []
    completed_issues = set()
    for path, content in proposal.items():
        _path(path)
        if prior.get(path) == content:
            continue
        if context is None or path != context["path"]:
            raise ValueError("Proposed memory changes are outside the selected work")
        after = machine_state(content, workflow)
        if context["issue"] is not None and _number(after.get("issue")) != context["issue"]:
            raise ValueError("Proposed state targets another issue")
        if after.get("branch") != context["branch"]:
            raise ValueError("Proposed state targets another branch")
        if context["pr"] is not None and _number(after.get("pr")) != context["pr"]:
            raise ValueError("Proposed state targets another active PR")
        before = machine_state(prior[path], workflow) if path in prior else {}
        reasons = classify_change(before, after)
        record = {"path": path, "promotions": reasons}
        if reasons:
            approval = approved_transition(policy, workflow, path, after, reasons)
            if approval["base"] != context["base"] or approval["head_sha"] != context["head_sha"]:
                raise ValueError("Approval does not bind the host-selected checkpoint")
            record["evidence"] = verify_candidate(
                repository, approval["pr"], approval["branch"], approval["base"],
                approval["head_sha"], approval["tree_sha"])
            record["criterion"] = approval["criterion"]
            record["evaluator"] = approval["evaluator"]
            if "completion" in reasons and approval.get("allow_completion") is True:
                completed_issues.add(approval["issue"])
        changes.append(record)
    claims = output_claims(outputs, workflow)
    if any(issue not in completed_issues for issue in claims):
        raise ValueError("Terminal safe output lacks an independently approved memory transition")
    return {
        "schema_version": 1, "allowed": True, "workflow": workflow,
        "baseline": {key: baseline[key] for key in ("commit_sha", "tree_sha", "digest")},
        "proposal_digest": digest_files(proposal), "changes": changes,
        "semantics": "Fresh pre-publication snapshot; not compare-and-swap against concurrent memory writers",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"), required=False)
    parser.add_argument("--workflow", choices=("goal", "autoloop"), required=True)
    parser.add_argument("--proposal", required=True)
    parser.add_argument("--safeoutputs", required=True)
    parser.add_argument("--selection", required=True)
    parser.add_argument("--branch-state", required=True)
    parser.add_argument("--steering", required=True)
    parser.add_argument("--policy")
    parser.add_argument("--report", required=True)
    args = parser.parse_args(argv)
    report = {"schema_version": 1, "allowed": False}
    try:
        if not isinstance(args.repository, str) or not REPOSITORY.fullmatch(args.repository):
            raise ValueError("Missing repository identity")
        reader = GitHubReader(os.environ.get("GITHUB_TOKEN", ""))
        baseline = remote_memory(args.repository, f"memory/{args.workflow}", reader.get)
        proposal = read_proposal(args.proposal, MAX_BYTES[args.workflow])
        report.update({"workflow": args.workflow,
                       "baseline": {key: baseline[key] for key in ("commit_sha", "tree_sha", "digest")},
                       "proposal_digest": digest_files(proposal),
                       "semantics": "Fresh pre-publication snapshot; not compare-and-swap against concurrent memory writers"})
        outputs = read_outputs(args.safeoutputs)
        selection = _object(strict_json(Path(args.selection).read_text()))
        branch_state = _object(strict_json(Path(args.branch_state).read_text()))
        steering = _object(strict_json(Path(args.steering).read_text()))
        context = bind_selection(args.repository, args.workflow, selection, branch_state,
                                 os.environ.get("GITHUB_RUN_ID"), os.environ.get("GITHUB_RUN_ATTEMPT"))
        check_memory_baseline(context, steering, baseline)
        policy = {"schema_version": 1, "approvals": []}
        if args.policy:
            policy_path = Path(args.policy)
            if policy_path.is_symlink() or not policy_path.is_file():
                raise ValueError("Missing trusted publication policy")
            policy = _object(strict_json(policy_path.read_text()))
        report = evaluate(args.repository, args.workflow, baseline, proposal, outputs, policy,
                          lambda *values: candidate_evidence(*values, reader.get),
                          selection, branch_state, os.environ.get("GITHUB_RUN_ID"),
                          os.environ.get("GITHUB_RUN_ATTEMPT"))
        report["steering"] = check_steering(args.repository, selection, branch_state, steering, reader.get)
        # Detect ordinary concurrent memory updates during our read/evaluation.
        current = reader.get(f"/repos/{args.repository}/git/ref/heads/memory/{args.workflow}")
        if _object(_object(current).get("object")).get("sha") != baseline["commit_sha"]:
            raise ValueError("Remote memory changed during verification; rerun from fresh state")
    except (ValueError, OSError, UnicodeError) as error:
        report = {**report, "allowed": False, "reason": str(error)}
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"allowed={'true' if report['allowed'] else 'false'}\n")
    if not report["allowed"]:
        print(f"Publication blocked: {report.get('reason', 'unapproved evidence')}", file=sys.stderr)
        return 1
    print("Publication permitted by deterministic state and evidence checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
