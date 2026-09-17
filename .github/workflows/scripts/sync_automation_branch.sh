#!/usr/bin/env bash
# Prepare an automation branch locally. Publication belongs to gh-aw safe outputs.
set -euo pipefail

sync_automation_branch() {
  local branch="${1:?automation branch required}"
  local base="${2:?base branch required}"
  local selection="${3:?trusted scheduler selection required}"
  local remote_head mode helper_dir

  case "$branch" in
    autoloop/*|goal/*) ;;
    *) echo "Expected an autoloop/ or goal/ branch" >&2; return 1 ;;
  esac
  git check-ref-format --branch "$branch" >/dev/null
  git check-ref-format --branch "$base" >/dev/null
  [ "$branch" != "$base" ] || return 1
  if [ -n "$(git status --porcelain)" ]; then
    echo "Refusing to switch branches with uncommitted changes" >&2
    return 1
  fi

  helper_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  mode="$(python3 -I "$helper_dir/automation_branch_state.py" --selection "$selection" \
    --branch "$branch" --base "$base" --repo "${GITHUB_REPOSITORY:?repository identity required}")"
  case "$mode" in
    resume|refresh-base) ;;
    *) echo "Invalid branch preparation decision" >&2; return 1 ;;
  esac

  # An empty successful response means the branch is absent. Network and
  # permission failures must stop instead of being mistaken for a first run.
  remote_head="$(git ls-remote --heads origin "refs/heads/$branch")"
  if [ -z "$remote_head" ]; then
    if [ "$mode" = resume ]; then
      echo "Active PR branch is missing; refusing to recreate it from the base" >&2
      return 1
    fi
    git fetch origin "+refs/heads/$base:refs/remotes/origin/$base"
    git checkout -b "$branch" "refs/remotes/origin/$base"
    return
  fi

  git fetch origin "+refs/heads/$branch:refs/remotes/origin/$branch"
  if git show-ref --verify --quiet "refs/heads/$branch" &&
    ! git merge-base --is-ancestor "refs/heads/$branch" "refs/remotes/origin/$branch"; then
    echo "Local branch has unpublished or divergent commits; refusing to discard them" >&2
    return 1
  fi
  git checkout -B "$branch" "refs/remotes/origin/$branch"
  if [ "$mode" = resume ]; then
    # Publishing compares the remote PR head with our candidate. Incorporating
    # main here would make unrelated protected files part of that task delta.
    echo "Resuming active PR at its exact remote head; no base merge"
    return
  fi

  git fetch origin "+refs/heads/$base:refs/remotes/origin/$base"
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
