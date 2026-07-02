# Evergreen Repo Policy

Repository: `githubnext/tsb`. This file records install-time decisions confirmed
by the maintainer. Evergreen must follow it for all repo-specific behavior.

## Merge Gates

- Required checks: `main` is **not** branch-protected, so GitHub enforces no
  required checks. By maintainer decision, Evergreen treats these CI jobs as
  merge gates on the current head SHA:
  - `Test & Lint`
  - `Playground E2E (Playwright)`
  - `Build`
  - `Validate Python Examples`
- Non-required checks treated as gates: none beyond the list above.
  `OpenEvolve benchmark` runs only on `autoloop/*-evolve` PRs and is **not** a
  merge gate.
- Review requirements: none enforced by branch protection.
- CODEOWNERS requirements: none.
- Unresolved thread policy: read only for merge-blocking signals; do not chase
  general review comments.
- Draft PR policy: do **not** mark draft PRs ready for review.
- Required labels: `evergreen` (opt-in gate).
- Blocker labels: `evergreen-blocked`, `evergreen-human-needed`.
- Deployment/environment gates: none.
- Auto-merge behavior: repo-level auto-merge is **enabled**. Satisfying gates on
  a PR with auto-merge on may cause it to merge. The maintainer accepts this.
  Evergreen never merges directly and takes no extra merge action.

## Branch Updates

- Base branch: `main`.
- Freshness requirement: yes — update PR branches that are behind `main`.
- Merge-main policy: merge `main` into the PR branch with a normal merge commit.
- Rebase or force-push policy: force-push is **disabled**.
- Fork PR behavior: pushes to fork branches may be restricted; if a push cannot
  land, report `human-needed`.

## CI/CD Activation

- Workflows/checks Evergreen may rerun: `CI` jobs (`Test & Lint`,
  `Playground E2E (Playwright)`, `Build`, `Validate Python Examples`) when
  failing, missing, stale, or blocked.
- Workflows/checks Evergreen may dispatch: `CI` (`workflow_dispatch` is enabled).
- Stale check policy: ignore results from older SHAs; only the current head SHA
  matters.
- Missing check policy: CI runs on `push` to `autoloop/**` and `pull_request` to
  `main`. Bot-authored pushes with the default token may not trigger required
  CI; prefer `EVERGREEN_GITHUB_TOKEN` for CI-triggering pushes.
- Empty commit policy: allowed only as a last resort to trigger CI, using commit
  subject `evergreen: trigger CI`. Never counts as a semantic repair attempt.
- Token policy: see below.

## Repair Policy

- Allowed edits: source, tests, playground, docs, and generated snapshots as
  needed to pass the gates.
- Protected files: `README.md` is excluded from pushes (see workflow
  `protected-files`). Do not modify `.autoloop/programs/**` or Evergreen's own
  workflow files during a PR run.
- High-risk file policy: `evergreen` permits high-risk edits; still prefer the
  smallest change.
- Deterministic commands (repo-native, verified from CI and `AGENTS.md`):
  - Install: `bun install`
  - Typecheck: `bun run typecheck`
  - Lint: `bun run lint`
  - Test: `bun test` (coverage: `bun test --coverage ./tests/`)
  - E2E: `bun run test:e2e`
  - Python examples: `python scripts/validate-python-examples.py playground/`
  - Golden snapshots: `python golden/generate.py`
  - Workflow compile: `gh aw compile`
- Generated file policy: regenerate golden snapshots with `python golden/generate.py`
  and commit them; CI verifies with `git diff --exit-code -- golden/snapshots`.
- Signed commit policy: not required.

## Review Policy

- Reviewer request policy: do not request or re-request reviewers in v1.
- Review thread policy: comment only; do not resolve threads.
- Human-needed cases: missing/insufficient token permission, protected-edit
  decisions, ambiguous merge intent, or blockers requiring a human decision.
- Comment style: short and terse; only for meaningful work, blockers,
  human-needed decisions, or quota exhaustion.

## Skills

- Vendored generic skills: `pr-intake`, `repo-memory-reader`, `diff-risk-map`,
  `ci-run-deduper`, `ci-gate-evaluator`, `ci-log-parser`,
  `merge-blocker-comment-reader`, `deterministic-repair`, `safe-output-verifier`,
  `attempt-memory-writer`, `merge-gate-reporter`, `playground-e2e-diagnoser`.
- Existing repo skills to reuse: `.github/skills/agentic-workflows`,
  `.github/skills/agentic-workflow-designer` (only if a workflow-file gate needs
  them).
- Conditional skills enabled: `playground-e2e-diagnoser` for the Playwright gate.
- Skills not to use: none configured.

## Quotas

- Per-PR AI-credit budget: **500** AI credits per continuous application of the
  `evergreen` label.
- Max runs: bounded by the budget; scheduled monitoring should use little quota.
- Max repeated attempts per failure signature: stop repeating a path already
  recorded as failing in memory.
- Wall-clock limit: 30 minutes per run (`timeout-minutes`).
- Exhaustion behavior: remove `evergreen`, add `evergreen-exhausted`, leave one
  terse comment. Reapplying `evergreen` starts a fresh quota.

## Token And Engine

- Action token: `EVERGREEN_GITHUB_TOKEN` (maintainer choice, since default-token
  pushes may not trigger required CI). Falls back to `GITHUB_TOKEN` in the
  deterministic trigger when the secret is absent.
- Engine token: `COPILOT_GITHUB_TOKEN` (already configured) for the Copilot
  engine.
- Engine: `copilot`.

## Discovered Repo Context

- Agent guidance: `AGENTS.md` (tsb = TypeScript pandas port, Bun, strict TS,
  100% coverage, one feature per commit, never modify `README.md` or
  `.autoloop/programs/**`), `CLAUDE.md` (Biome formatting, JSDoc, bun commands).
- Existing workflow conventions: gh-aw workflows (`autoloop`, `goal`,
  `ci-doctor`) use `engine: copilot`, repo-memory on `memory/*` branches, and
  `shared/*.md` imports. Compiled `*.lock.yml` committed alongside `*.md`.
- Last 50 closed PR process scan: PRs merged via GitHub (auto-merge enabled, no
  branch protection). Autoloop PRs carry `automation,autoloop` labels. CI is the
  de-facto gate. Prior default-token push issues were fixed via a PAT-style
  CI-trigger token (`GH_AW_CI_TRIGGER_TOKEN` exists).
- Uncertainties: `EVERGREEN_GITHUB_TOKEN` secret is not yet set — must be added
  manually before Evergreen can push CI-triggering commits.
