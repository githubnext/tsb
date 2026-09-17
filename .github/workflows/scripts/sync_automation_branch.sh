#!/usr/bin/env bash
# Prepare an automation branch locally. Publication belongs to gh-aw safe outputs.
set -euo pipefail

sync_automation_branch() {
  local branch="${1:?automation branch required}"
  local base="${2:?base branch required}"
  local selection="${3:?trusted scheduler selection required}"
  local verify_only="${4:-}" mode helper_dir decision expected_head expected_base actual

  if [ "$#" -gt 4 ] || { [ -n "$verify_only" ] && [ "$verify_only" != --verify-only ]; }; then
    echo "Only the optional --verify-only mode is supported" >&2; return 1
  fi

  case "$branch" in
    autoloop/*|goal/*) ;;
    *) echo "Expected an autoloop/ or goal/ branch" >&2; return 1 ;;
  esac
  git check-ref-format --branch "$branch" >/dev/null
  git check-ref-format --branch "$base" >/dev/null
  [ "$branch" != "$base" ] || return 1
  if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted files (including trusted PR-context config overlays) must be preserved; rerun the explicit issue via workflow_dispatch or issue context" >&2
    return 1
  fi

  helper_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  decision="$(python3 -I "$helper_dir/automation_branch_state.py" --selection "$selection" \
    --branch "$branch" --base "$base" --repo "${GITHUB_REPOSITORY:?repository identity required}")"
  read -r mode expected_head expected_base <<< "$decision"
  case "$mode" in
    resume|refresh-base) ;;
    *) echo "Invalid branch preparation decision" >&2; return 1 ;;
  esac

  # All objects and remote-tracking refs were fetched by authenticated host
  # setup. No GitHub API, Git transport, or credentials are used in the sandbox.
  if [ "$mode" = refresh-base ]; then
    actual="$(git rev-parse --verify "refs/remotes/origin/$base")"
    if [ "$actual" != "$expected_base" ]; then
      echo "Base ref differs from the bound host snapshot" >&2; return 1
    fi
  fi
  if [ "$expected_head" = absent ]; then
    if [ "$mode" = resume ]; then
      echo "Active PR branch is missing; refusing to recreate it from the base" >&2
      return 1
    fi
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      echo "Local branch exists without a bound remote head; refusing to discard it" >&2; return 1
    fi
  else
    actual="$(git rev-parse --verify "refs/remotes/origin/$branch")"
    if [ "$actual" != "$expected_head" ]; then
      echo "Canonical ref differs from the bound host snapshot" >&2; return 1
    fi
    if git show-ref --verify --quiet "refs/heads/$branch" &&
      ! git merge-base --is-ancestor "refs/heads/$branch" "refs/remotes/origin/$branch"; then
      echo "Local branch has unpublished or divergent commits; refusing to discard them" >&2
      return 1
    fi
  fi

  if [ "$verify_only" = --verify-only ]; then
    echo "Verified fresh host evidence, bound refs and clean history; startup checkout unchanged"
    return
  fi
  if [ "$expected_head" = absent ]; then
    git checkout -b "$branch" "refs/remotes/origin/$base"
    return
  fi
  git checkout -B "$branch" "refs/remotes/origin/$branch"
  if [ "$mode" = resume ]; then
    # Publishing compares the remote PR head with our candidate. Incorporating
    # main here would make unrelated protected files part of that task delta.
    echo "Resuming active PR at its exact remote head; no base merge"
    return
  fi

  if ! git merge --no-edit "refs/remotes/origin/$base"; then
    git merge --abort
    echo "Base merge conflicts require a focused repair before the next iteration" >&2
    return 1
  fi
  # Between PRs, retain the old remote tip even after a squash merge so reuse
  # can publish without force. A new PR's task delta is measured against base.
  git merge-base --is-ancestor "refs/remotes/origin/$branch" HEAD
  git merge-base --is-ancestor "refs/remotes/origin/$base" HEAD
}

sync_automation_branch "$@"
