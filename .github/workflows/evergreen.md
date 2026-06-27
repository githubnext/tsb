---
description: |
  Evergreen keeps opt-in pull requests green and merge-ready. A persistent
  `evergreen` label grants permission to diagnose merge blockers, repair CI
  failures, update the PR branch, manage Evergreen state labels, and report
  readiness without directly merging.

on:
  workflow_call:
    inputs:
      pr_number:
        required: true
        type: string
      head_sha:
        required: false
        type: string
  schedule: every 15m
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Run Evergreen on a specific PR number"
        required: false
        type: string

permissions:
  contents: read
  pull-requests: read
  issues: read
  actions: read
  checks: read
  statuses: read

timeout-minutes: 360
max-daily-ai-credits: 200K

network:
  allowed:
    - defaults
    - github
    - node
    - python
    - playwright

checkout:
  fetch: ["*"]
  fetch-depth: 0

concurrency:
  group: evergreen-${{ inputs.pr_number || github.event.inputs.pr_number || 'schedule' }}
  queue: max

tools:
  github:
    mode: gh-proxy
    toolsets: [repos, pull_requests, issues, actions]
  bash: true
  repo-memory:
    branch-name: memory/evergreen
    file-glob: ["*.json", "*.jsonl", "*.md"]
    max-file-size: 40960

safe-outputs:
  max-patch-size: 10240
  max-patch-files: 200
  add-comment:
    max: 2
    target: "*"
    required-labels: [evergreen]
    hide-older-comments: false
  add-labels:
    allowed:
      - evergreen-ready
      - evergreen-blocked
      - evergreen-human-needed
      - evergreen-exhausted
    target: "*"
    max: 4
  remove-labels:
    allowed:
      - evergreen
      - evergreen-ready
      - evergreen-blocked
      - evergreen-human-needed
      - evergreen-exhausted
    target: "*"
    max: 5
  dispatch-workflow:
    workflows: [CI]
    max: 1
  push-to-pull-request-branch:
    target: "*"
    required-labels: [evergreen]
    signed-commits: false
    github-token-for-extra-empty-commit: ${{ secrets.GH_AW_CI_TRIGGER_TOKEN }}
    allowed-files:
      - "src/**"
      - "tests/**"
      - "tests-e2e/**"
      - "playground/**"
      - "golden/**"
      - "scripts/**"
      - "benchmarks/**"
      - "docs/**"
    excluded-files:
      - "README.md"
      - ".autoloop/programs/**"
      - ".github/workflows/**"
      - ".github/aw/**"
      - "package.json"
      - "bun.lock"
      - "tsconfig.json"
      - "biome.json"
      - "bunfig.toml"
    protected-files:
      policy: fallback-to-issue
      exclude:
        - "README.md"
        - ".autoloop/programs/**"
        - ".github/workflows/**"
        - ".github/aw/**"
        - "package.json"
        - "bun.lock"
        - "tsconfig.json"
        - "biome.json"
        - "bunfig.toml"
    max: 2

imports:
  - shared/skills/pr-intake.md
  - shared/skills/repo-memory-reader.md
  - shared/skills/diff-risk-map.md
  - shared/skills/ci-run-deduper.md
  - shared/skills/ci-gate-evaluator.md
  - shared/skills/ci-log-parser.md
  - shared/skills/merge-blocker-comment-reader.md
  - shared/skills/deterministic-repair.md
  - shared/skills/safe-output-verifier.md
  - shared/skills/attempt-memory-writer.md
  - shared/skills/merge-gate-reporter.md
  - shared/skills/infra-ci-repair.md
  - shared/skills/playground-e2e-diagnoser.md
  - shared/skills/autoloop-coordinator.md
  - shared/skills/docs-release-gate-repair.md
  - shared/skills/dependency-gate-repair.md
  - shared/skills/lint-policy-review.md
  - shared/evergreen/repo-policy.md
  - shared/evergreen/state-labels.md
  - shared/evergreen/safe-output-policy.md
  - shared/evergreen/report-template.md

steps:
  - name: Select Evergreen target PR
    id: select-pr
    env:
      GH_TOKEN: ${{ github.token }}
      GITHUB_REPOSITORY: ${{ github.repository }}
      EVENT_NAME: ${{ github.event_name }}
      EVENT_PATH: ${{ github.event_path }}
      INPUT_PR: ${{ inputs.pr_number || github.event.inputs.pr_number }}
      INPUT_HEAD_SHA: ${{ inputs.head_sha }}
    run: |
      python3 - << 'PYEOF'
      import json
      import os
      import urllib.error
      import urllib.parse
      import urllib.request

      token = os.environ["GH_TOKEN"]
      repo = os.environ["GITHUB_REPOSITORY"]
      event_name = os.environ.get("EVENT_NAME", "")
      input_pr = (os.environ.get("INPUT_PR") or "").strip()
      input_head_sha = (os.environ.get("INPUT_HEAD_SHA") or "").strip()
      event_path = os.environ.get("EVENT_PATH", "")
      out_dir = "/tmp/gh-aw/evergreen"
      os.makedirs(out_dir, exist_ok=True)

      def api(path):
          req = urllib.request.Request(
              f"https://api.github.com/repos/{repo}{path}",
              headers={
                  "Authorization": f"Bearer {token}",
                  "Accept": "application/vnd.github+json",
                  "X-GitHub-Api-Version": "2022-11-28",
              },
          )
          with urllib.request.urlopen(req, timeout=30) as resp:
              return json.loads(resp.read().decode())

      def pr_labels(pr):
          return [label["name"] for label in pr.get("labels", [])]

      def load_event():
          if not event_path or not os.path.exists(event_path):
              return {}
          with open(event_path, encoding="utf-8") as f:
              return json.load(f)

      target = None
      reason = ""
      event = load_event()

      try:
          if input_pr:
              pr = api(f"/pulls/{int(input_pr)}")
              labels = pr_labels(pr)
              head_sha = pr.get("head", {}).get("sha")
              if input_head_sha and head_sha != input_head_sha:
                  reason = f"PR head changed from {input_head_sha} to {head_sha}; skipping stale event"
              elif pr.get("state") == "open" and "evergreen" in labels:
                  target = pr
                  reason = "workflow call" if event_name == "workflow_call" else "manual dispatch"
              else:
                  reason = "target PR is not open with evergreen label"
          else:
              params = urllib.parse.urlencode({
                  "state": "open",
                  "labels": "evergreen",
                  "per_page": "50",
                  "sort": "updated",
                  "direction": "asc",
              })
              issues = api(f"/issues?{params}")
              candidates = [issue for issue in issues if "pull_request" in issue]
              for issue in candidates:
                  labels = [label["name"] for label in issue.get("labels", [])]
                  if "evergreen-exhausted" not in labels:
                      target = api(f"/pulls/{issue['number']}")
                      reason = "scheduled oldest labeled PR"
                      break
              if target is None:
                  reason = "no open non-exhausted PR has evergreen label"
      except (ValueError, urllib.error.HTTPError, urllib.error.URLError) as exc:
          reason = f"target selection failed: {exc}"

      payload = {
          "selected": target is not None,
          "reason": reason,
          "event_name": event_name,
          "requested_head_sha": input_head_sha or None,
          "target_pr_number": target["number"] if target else None,
          "target_head_sha": target.get("head", {}).get("sha") if target else None,
          "target_head_ref": target.get("head", {}).get("ref") if target else None,
          "target_base_ref": target.get("base", {}).get("ref") if target else None,
      }
      with open(f"{out_dir}/target.json", "w", encoding="utf-8") as f:
          json.dump(payload, f, indent=2)

      gh_output = os.environ.get("GITHUB_OUTPUT")
      if gh_output:
          with open(gh_output, "a", encoding="utf-8") as f:
              f.write(f"selected={payload['target_pr_number'] or ''}\n")
      print(json.dumps(payload, indent=2))
      PYEOF

source: githubnext/evergreen
engine: copilot
---

# Evergreen

You are Evergreen, a mergeability repair orchestrator for opt-in pull requests.

## Start Here

Read `/tmp/gh-aw/evergreen/target.json` first.

If `selected` is false or `target_pr_number` is null, call `noop` with the reason from that file and stop. Do not inspect unrelated PRs.

If a target PR exists, work only that PR. Confirm the PR still has the `evergreen` label before any repair, comment, label, dispatch, or branch push.

## Operating Loop

1. Run `pr-intake`.
2. Run `repo-memory-reader`.
3. Run `diff-risk-map`.
4. Run `ci-run-deduper`, `ci-gate-evaluator`, and `merge-blocker-comment-reader`.
5. If a CI gate fails, run `ci-log-parser` before editing.
6. Run `deterministic-repair` before agentic edits.
7. Invoke conditional skills only when the evidence calls for them.
8. Re-run targeted verification commands after edits.
9. Use safe outputs only for comments, Evergreen labels, CI dispatch, and PR branch pushes.
10. Run `safe-output-verifier`.
11. Run `attempt-memory-writer`.
12. Run `merge-gate-reporter` and stop as ready, blocked, human-needed, exhausted, continuing, or noop.

## Required Behavior

- Never directly merge a pull request.
- Never remove `evergreen` unless quota is exhausted.
- Never claim a push, label, comment, or dispatch succeeded until verified.
- Use `dispatch-workflow` for `CI` only when checks are missing, stale, or blocked.
- Use `push-to-pull-request-branch` only for a labeled PR and only after local verification.
- If all configured gates pass, add `evergreen-ready` and remove stale `evergreen-blocked` or `evergreen-human-needed` labels.
- If a merge blocker exists but Evergreen can keep monitoring, add `evergreen-blocked` and comment with the blocker.
- If a human decision or protected edit is required, add `evergreen-human-needed` and comment with the exact decision needed.
- If quota is exhausted, add `evergreen-exhausted`, remove `evergreen`, and comment tersely.
- If no visible action is needed, call `noop` with a short evidence-backed reason.
