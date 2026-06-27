# Evergreen Repo Policy

## Merge Gates

Evergreen may report `evergreen-ready` only when the target PR currently has the `evergreen` label and all installed gates are satisfied.

Required gates inferred for this repository:
- PR is open and not draft.
- PR is conflict-free and mergeable.
- Current PR head SHA has passing CI gates:
  - `Test & Lint`
  - `Playground E2E (Playwright)`
  - `Validate Python Examples`
  - `Build`
- `OpenEvolve benchmark` is required only for `autoloop/*-evolve` branches or when that check is present and non-skipped for the current head.
- Requested-changes reviews, unresolved review threads, and explicit maintainer blocker comments prevent ready status.

Repository settings observed during install:
- Default branch: `main`.
- No branch protection or rulesets were configured on `main`.
- GitHub auto-merge is enabled. Evergreen must never directly merge PRs, but making a PR green can indirectly allow a PR with auto-merge enabled to merge.

## Branch Updates

Prefer merging `main` into the PR branch when the branch is behind and freshness is needed. Do not force-push, rebase, squash, or amend. If a fork or permission boundary prevents branch updates, comment and apply `evergreen-human-needed`.

## CI/CD Activation

Use `GITHUB_TOKEN` where possible. The repository already has `GH_AW_CI_TRIGGER_TOKEN`; use it only when token-authored pushes or workflow dispatch are needed to trigger CI. Scheduled observation alone must not rerun green checks.

Prefer actions in this order:
- Wait for current pending checks.
- Dispatch `CI` when checks are missing or stale.
- Push a verified repair commit when a failure is understood.
- Use an empty trigger commit only as a last resort, and do not count it as a semantic repair attempt.

## Repair Policy

Allowed repair areas:
- `src/**`
- `tests/**`
- `tests-e2e/**`
- `playground/**`
- `golden/**`
- `scripts/**`
- `benchmarks/**`
- `docs/**`

Forbidden or human-confirmation areas:
- Never edit `README.md`.
- Never edit `.autoloop/programs/**`.
- Do not edit workflow, agentic workflow, or skill files at runtime unless the PR is explicitly about those files and a human has confirmed the workflow-change path.
- Treat `package.json`, `bun.lock`, `tsconfig.json`, `biome.json`, and `bunfig.toml` as protected high-risk files.

Strict TypeScript rules:
- No `any`.
- No `as` casts.
- No `@ts-ignore` or equivalent escape hatches.
- Keep zero core dependencies.

## Review Policy

Evergreen must not mark draft PRs ready for review, request reviewers, approve PRs, or resolve review threads. If a reviewer or maintainer decision is needed, label `evergreen-human-needed` and explain the decision needed.

## Quotas

Quota unit: one continuous application of the `evergreen` label.

Defaults:
- Maximum 10 Evergreen runs per PR label application.
- Maximum 3 semantic repair attempts per failure signature.
- Maximum 100K AI credits per PR label application.
- Maximum 6 hours wall-clock per run.

When quota is exhausted, remove `evergreen`, add `evergreen-exhausted`, and leave a concise blocker comment.

## Discovered Repo Context

This is a Bun/TypeScript package named `tsb`, a TypeScript port of pandas. CI runs typecheck, lint, unit tests with coverage, pandas golden snapshot validation, cross-validation tests, Playwright playground e2e, Python example validation, and browser build. Recent merged PRs consistently passed the main CI gates. Autoloop PRs commonly have duplicate push and pull_request check runs.
