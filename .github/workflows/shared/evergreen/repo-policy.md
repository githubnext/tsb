# Evergreen Repo Policy

Confirmed install-time decisions for `githubnext/tsessebe`. The deterministic
readiness controller and the agentic orchestrator must both respect this file.

## Merge Gates

- Required checks: none are enforced by branch protection (`main` is not
  protected). The following CI checks are treated as configured merge gates:
  - `Test & Lint`
  - `Playground E2E (Playwright)`
  - `Build`
  - `Validate Python Examples`
- Non-required checks treated as gates: the four checks above.
- Not a gate: `OpenEvolve benchmark` — it runs only on `autoloop/*-evolve` PRs,
  reports `neutral` when there is no fitness, and is not a mergeability blocker.
- Review requirements: none required (no branch protection, no required reviews).
- CODEOWNERS requirements: none.
- Unresolved thread policy: not a merge gate. Do not chase review threads.
- Draft PR policy: work on labeled draft PRs, including agent-created draft
  PRs, when the trust model allows branch repair. Do not mark drafts ready for
  review automatically.
- Required labels: `evergreen` opts a PR into the work loop.
- Active lease label: `evergreen_active` is controller-owned. The preflight
  selector applies it before dispatching the agent, other selectors skip PRs
  with this label, and cleanup removes it when the run finishes.
- Blocker labels: `evergreen-blocked`, `evergreen-human-needed`.
- Deployment/environment gates: none.
- Auto-merge behavior: GitHub auto-merge is ENABLED on the repository. Evergreen
  never merges directly, but by making the configured gates pass it can
  indirectly cause a PR with auto-merge armed to merge. This is accepted by the
  repository owner.

## Readiness Controller

- Ready label: `evergreen-ready`.
- Controller owns ready label: yes.
- Add ready label only when: all four configured gate checks report success for
  the current PR head SHA, there are no pending/failing checks, and the merge
  state is not dirty/conflicted.
- Remove ready label when: the controller state is anything other than `ready`
  (new head SHA, pending, failing, missing check, conflict, out of scope).
- Current-head SHA policy: readiness is evaluated only against the current PR
  head SHA. A new push invalidates prior readiness.
- Pending check policy: `waiting` — do not repair pending or in-progress checks.
- Missing/stale check policy: `needs_ci` — reactivate the latest `CI` run for the
  head SHA once (see CI/CD Activation). Never rerun green checks.
- Branch freshness ready criterion: not required to be up to date with `main`;
  freshness is only enforced when the branch is conflicted (`DIRTY`/`UNKNOWN`).
- Additional deterministic ready criteria: PR open, has `evergreen`, not
  `evergreen-exhausted`, allowed by the trust model.

## Branch Updates

- Base branch: `main`.
- Freshness requirement: not a standalone gate; only merge `main` when the branch
  is behind and conflicted or CI requires a fresh merge.
- Merge-main policy: allowed. Prefer ordinary merge commits from `main`.
- Rebase or force-push policy: force-push is DISABLED. No rebasing history.
- Fork PR behavior: do not merge `main` into or push to fork branches unless a
  trusted maintainer has approved the current head (see Trust Model).

## Trust Model

- Repository visibility: public.
- Fork PR policy: fork PRs are accepted.
- Are PR branch pushers trusted: not for fork PRs.
- Default trust level:
  - Same-repo branches (e.g. `autoloop/*`, maintainer branches): `trusted-branch`.
  - Fork PRs: `metadata-only` until a trusted maintainer approves the current
    head SHA.
- Current-head approval policy: for fork PRs, run PR code / push repairs only
  after a trusted maintainer approves via `workflow_dispatch` bound to the
  current head SHA. A new head SHA returns the PR to metadata-only monitoring.
- Authorized `/evergreen` users: slash commands are not wired in v1. Trusted
  activation for fork PRs is via manual `workflow_dispatch`.
- What invalidates approval: any new commit / head SHA change on the PR branch.

## Event Fast Paths

- `pull_request` activity types: not wired in the gh-aw Evergreen workflow.
  PR activity is covered by schedule/manual reconciliation to avoid gh-aw
  confused-deputy activation on bot-authored PRs.
- Default-branch `push` policy: not wired in v1; the schedule covers `main`
  changes that can make labeled PRs stale or conflicted. Use manual dispatch
  for urgent reconciliation.
- `workflow_run` policy: not wired in v1; the schedule covers CI state changes.
- Review event policy: not wired (reviews are not merge gates here).
- Deployment event policy: not wired (no deployment gates).
- Slash-command policy: not wired in v1.
- Schedule interval: every 15 minutes (reconciliation and fork-PR fallback).

## CI/CD Activation

- Workflows/checks Evergreen may rerun: the `CI` workflow run for the current
  head SHA (via `gh run rerun --failed`, falling back to a full rerun).
- Workflows/checks Evergreen may dispatch: none by name in v1; activation is
  rerun-based only.
- Stale check policy: reactivate the latest `CI` run for the head SHA once per
  head; never rerun green checks; never re-trigger an already in-progress run.
- Missing check policy: if no `CI` run exists for the head SHA, wait for the
  normal `pull_request`/schedule CI to start rather than forcing activation.
- Empty commit policy: empty trigger commits are a last resort only, requested
  through safe outputs by the agent (never from preflight) and labeled
  `evergreen: trigger CI`; they do not count as semantic repair attempts.
- Token policy: `GITHUB_TOKEN` for reads and control-plane label writes.
  `GH_AW_CI_TRIGGER_TOKEN` (existing PAT) is used only for CI reruns and
  safe-output pushes so default-token limitations do not block CI.

## Repair Policy

- Allowed edits: source, tests, playground, config, and workflow files needed to
  clear a configured gate. Keep changes targeted to the failing gate, but a
  single Evergreen run may edit multiple files and fix multiple diagnostics when
  they come from the same failing command.
- Protected files: `README.md` and `.autoloop/programs/**` must not be modified
  unless explicitly requested. `.autoloop/**` and `memory/autoloop` branch state
  are Autoloop-owned. Issue #1 (program definition) must not be modified.
- High-risk file policy: dependency manifests and lockfiles (`package.json`,
  `bun.lock`, `bunfig.toml`) may be edited only when the failing gate requires
  it; prefer deterministic tooling.
- Safe-output patch budget: `10240` bytes, the current gh-aw maximum. This is
  intentionally large enough for one coherent lint/typecheck gate-clearing patch
  instead of tiny symptom commits.
- Deterministic commands (repo-native, run before agentic edits):
  - Install: `bun install`
  - Typecheck: `bun run typecheck`
  - Lint: `bun run lint`
  - Test: `bun test`
  - Cross-validation: `bun test ./tests/xval/`
  - E2E: `bun run test:e2e`
  - Golden snapshots: `python golden/generate.py`
  - Workflow compile: `gh aw compile` (and `apm compile` when APM sources change)
- CI/lint diagnosis policy: when a CI gate fails, fetch the exact failing job
  logs and run the targeted repo command locally before editing. For lint
  failures, `bun run lint` is the source of truth; do not guess from truncated
  GitHub summaries. For lint and typecheck gates, iterate locally until the
  current command passes, only non-mechanical blockers remain, or a stop rule
  applies. Prioritize structural blockers, such as large complexity or
  control-flow issues, before warning churn that cannot make the gate pass.
- Generated file policy: recompile committed lockfiles/snapshots when their
  sources change. After editing any `.github/workflows/*.md` workflow, recompile
  and commit the generated `.lock.yml`.
- Signed commit policy: signed commits are not required. Use the token's natural
  identity; add Evergreen context in the commit body.

## Review Policy

- Reviewer request policy: do not request or re-request reviewers.
- Review thread policy: do not resolve threads. Comment only when a thread maps
  to a configured merge gate.
- Human-needed cases: protected-file edits, credential/permission needs, fork-PR
  code execution before approval, and disallowed operations.
- Comment style: terse. Comment only for meaningful work, blockers, human-needed
  decisions, or quota exhaustion. Do not comment on unchanged state.

## Skills

- Vendored generic skills: all files under
  `.github/workflows/shared/skills/`.
- Existing repo skills to reuse: none dedicated to mergeability were found;
  respect `AGENTS.md`/`CLAUDE.md` conventions.
- Conditional skills enabled: `playground-e2e-diagnoser` (Playwright E2E gate),
  `autoloop-coordinator` (Autoloop branches), `lint-policy-review`,
  `docs-release-gate-repair`, `dependency-gate-repair`, and other conditional
  skills when evidence identifies the matching gate.
- Skills not to use: none disabled.

## Quotas

- Per-PR AIC/token/cost budget: 50000 AI credits per continuous application of
  the `evergreen` label.
- Max runs: bounded by the per-PR budget; cheap deterministic monitoring should
  consume little or no quota.
- Max repeated attempts per failure signature: do not retry the same failure
  signature indefinitely; record it in memory and stop.
- Wall-clock limit: none beyond the per-PR budget and schedule cadence.
- Exhaustion behavior: remove `evergreen`, add `evergreen-exhausted`, leave one
  terse comment. A human may reapply `evergreen` for a fresh quota.

## Discovered Repo Context

- Agent guidance: `AGENTS.md` and `CLAUDE.md` — Bun + strict TypeScript, zero
  core deps, 100% coverage, one feature per commit, never modify `README.md` or
  `.autoloop/programs/**`, recompile gh-aw/apm after workflow edits.
- Existing workflow conventions: gh-aw workflows (`autoloop`, `goal`,
  `ci-doctor`, `agentics-maintenance`) use `engine: copilot` with
  `COPILOT_GITHUB_TOKEN`; `GH_AW_CI_TRIGGER_TOKEN` PAT is used for CI-triggering
  pushes. CI workflow name is `CI`.
- Last 50 closed PR process scan: PRs merge without auto-merge requests or
  required reviews; many are Autoloop/goal automation PRs labeled
  `automation`/`autoloop`. No CODEOWNERS or required-review process observed.
- Uncertainties: `main` has no branch protection, so gate enforcement relies on
  this policy's configured checks rather than platform-required checks. If branch
  protection is added later, sync `REQUIRED_CHECKS_JSON` in `evergreen.md`.
