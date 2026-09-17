# Merge Steward installation inventory

Audited 2026-09-17 from the trusted `main` branch and live GitHub API for
`githubnext/tsb`. This records the existing execution and approval boundaries;
the capabilities enabled by this installation are defined in
`merge-steward.yml` and `merge-steward.md`.

## Authoritative repository settings

- The default branch is `main`; auto-merge and squash merges are allowed.
- Classic protection requires `Test & Lint`, bound to GitHub Actions
  (`app_id: 15368`). Strict base freshness is off.
- No active repository rulesets or additional effective `main` rules were
  returned. No approvals or resolved review conversations are required.
- Administrator enforcement is off; force pushes and branch deletion are off.
- The accepted Steward policy additionally requires `Playground E2E
  (Playwright)`, `Build`, and `Validate Python Examples`. All four claims
  require successful current-head evidence. Steward is not a required check.
- Only PRs targeting `main` are within this installation's merge scope. The
  repository also has PRs targeting Autoloop branches; those are outside it.

## Conventional workflow jobs

All listed jobs use GitHub-hosted `ubuntu-latest`; there are no CI matrices or
reusable CI workers in the audited definitions. Durations are historical
samples, not service guarantees.

| Workflow / job | Role and freshness | Cost / duration | Execution and write boundaries |
|---|---|---|---|
| `ci.yml#test` — Test & Lint | Required; every head | Medium; 37 s | Runs PR code: Bun install, typecheck, lint, tests/coverage, golden snapshots and pandas cross-validation. `contents:read`, `checks:write`; internet; no named secrets. |
| `ci.yml#playground-e2e` — Playground E2E (Playwright) | Required; every head | High; 79 s | Runs PR code and Chromium; internet and Actions cache writes. Same workflow token permissions; no named secrets. |
| `ci.yml#build` — Build | Required; every head; needs `test` | Low; 8 s | Runs PR build and uploads `dist` artifact. Same workflow token permissions; no named secrets. |
| `ci.yml#validate-python-examples` — Validate Python Examples | Required; every head | Medium; 102 s | Executes PR Python validation and playground inputs; internet. Same workflow token permissions; no named secrets. |
| `ci.yml#benchmark` — OpenEvolve benchmark | Advisory; every head | High; no comparable successful sample | Executes an evaluator only on `autoloop/` branches containing `-evolve`; writes an artifact and a separate fitness check. `contents:read`, `checks:write`; no named secrets. |
| `copilot-setup-steps.yml#copilot-setup-steps` | Advisory setup; workflow changes/manual | Low; estimate 1 min | Checkout and install gh-aw; `contents:read`; internet; no named secrets. |
| `pages.yml#build` — Build Playground | Advisory; post-merge, current base | High; total Pages run 14–33 min in three samples | Runs trusted branch builds, benchmarks and Python examples; uploads Pages artifact and configures Pages. Inherits `contents:read`, `pages:write`, `id-token:write`; internet. |
| `pages.yml#deploy` — Deploy to Pages | Advisory deployment; post-merge; needs Pages build | Low; estimate 0.2 min | Deploys Pages artifact with the same token scopes and environment `github-pages`. Live environment rules contain a branch policy, with no required reviewers or wait timer. |
| `merge-steward-reconcile.yml#resolve` | Advisory deterministic PR resolver | Low; estimate 0.2 min | Reads trusted default-branch code and PR metadata to create the per-PR matrix; no PR code execution. |
| `merge-steward-reconcile.yml#reconcile` | Advisory deterministic coordinator | Low; estimate 0.2 min | Reads trusted default-branch code and policy; no PR code execution. `actions:write` dispatches only guarded diagnosis; content/PR permissions are read-only. No merge adapter is installed. |
| `wasm-verification.yml#verify` | Advisory to merge policy; current-head evidence for Wasm goals | High; budget 30 min | Path-filtered PR, main push, or manual source build, negative control, Rust and real-Wasm tests. Runs candidate code with `contents:read`, no secrets, no persisted checkout credentials; uploads evidence only. |
| `benchmark-verification.yml#verify` | Advisory to merge policy; current-head measured tranche | High; budget 25 min | Path-filtered PR or manual exact-name selection, maximum 16 pairs, serial measurements and strict failure accounting. Read-only token, no secrets; artifact only. No duplicate main-push measurement. |

CI starts naturally on PR changes targeting `main`, pushes to `main` or
`autoloop/**`, and explicit workflow dispatch. The build's existing `needs:test`
ordering remains in force. No selective worker adapter is installed; Steward
does not selectively dispatch these CI jobs, Pages, or Copilot setup.

## Independent agentic workflows and generated jobs

Autoloop runs on its scheduled/manual/conversational triggers; Goal runs on its
own goal/conversational triggers and schedule. Evergreen has a fifteen-minute
schedule and manual dispatch, with its own opt-in preflight. CI Doctor reacts to
completed `main` CI. These automations are neither merge evidence nor
Steward-dispatchable workers. Diagnosis is an explicit exception-only dispatch.

The table separates independently meaningful generated execution units. Source
files are the corresponding `.md` workflows; exact compiled permissions are in
their `.lock.yml` files. `read-all` means the generated job receives GitHub read
scopes. Named tokens may have permissions beyond the workflow token scopes.

| Workflows / generated job | Role, runner and cost | Existing privileges and external effects |
|---|---|---|
| Autoloop, Goal / `pre_activation` | Deterministic scheduler/filter; ubuntu-slim; low | Built-in token; no declared job write permissions. |
| Goal / `preflight` | Deterministic nonempty-work check; ubuntu-latest; low | Reads trusted scheduling code and open goal issues; `contents:read`, `issues:read`; no model, secrets, or writes. |
| Autoloop, Goal / `activation` | Trusted activation; ubuntu-slim; low | Reads Actions/content; writes discussions, issues and PRs for activation bookkeeping. Verifies engine and GitHub tokens. |
| Autoloop, Goal / `agent` | Independent implementation agent; ubuntu-latest; scarce | `read-all`; runs repository code; Copilot and GitHub tokens; privileged network; proposes changes and safe outputs. |
| Autoloop, Goal / `detection` | Output threat detection; ubuntu-latest; scarce | `contents:read` plus Copilot token; separate model cost. |
| Autoloop, Goal / `push_repo_memory` | Deterministic memory publisher; ubuntu-slim; low | `contents:write` to repository memory. |
| Autoloop, Goal / `safe_outputs` | Advisory deterministic proposed-write handler; ubuntu-slim; low (37–47 s in the live trials; budget estimate 1 min) | No PR code or model execution. `contents:write`, `issues:write`, `pull-requests:write`; writes branches, draft PRs, issues/comments, labels and result artifacts per source allowlists. GitHub/MCP token fallbacks, optional CI-trigger token and inherited optional telemetry headers; details below. |
| Autoloop, Goal / `conclusion` | Reporting/cleanup; ubuntu-slim; low | `actions:read`, `contents:write`, `issues:write`, `pull-requests:write`; reports and bookkeeping. |
| Evergreen / `preflight` | Opt-in deterministic repair coordinator; ubuntu-latest; low | Actions/content/issues/PR write scopes plus check/status reads; labels, retries and `GH_AW_CI_TRIGGER_TOKEN`. |
| Evergreen / `activation` | Trusted activation; ubuntu-slim; low | Actions/content reads and engine/token verification. |
| Evergreen / `agent` | Opt-in repair agent; ubuntu-latest; scarce | Actions/check/content/issue/PR/status reads; runs PR code with Copilot/GitHub tokens and privileged network. |
| Evergreen / `detection` | Output threat detection; ubuntu-latest; scarce | `contents:read` plus Copilot token. |
| Evergreen / `safe_outputs` | Constrained repair publisher; ubuntu-slim; low | Content/issues/PR writes: PR-branch patches, labels, reviews and PR updates; CI trigger token. |
| Evergreen / `conclusion` | Reporting/cleanup; ubuntu-slim; low | Actions read and content/issues/PR writes. |
| CI Doctor / `pre_activation`, `activation` | Trusted failure filter and activation; ubuntu-slim; low | Built-in token; activation has Actions/content reads and engine/token verification. |
| CI Doctor / `agent` | Main-CI diagnosis; ubuntu-latest; scarce | `read-all`, Copilot/GitHub tokens; no PR checkout required by source. |
| CI Doctor / `detection` | Output threat detection; ubuntu-latest; scarce | `contents:read` plus Copilot token. |
| CI Doctor / `safe_outputs` | Diagnostic reporting; ubuntu-slim; low | Issues/PR writes for configured issues/comments. |
| CI Doctor / `update_cache_memory` | Memory update; ubuntu-slim; low | `actions:write` for cache memory. |
| CI Doctor / `conclusion` | Reporting/cleanup; ubuntu-slim; low | Actions read and issues/PR writes. |
| Merge Steward Diagnosis / `preflight` | Current exception validation; ubuntu-latest; low | Reads candidate and trusted policy before model activation. |
| Merge Steward Diagnosis / `activation` | Trusted activation; ubuntu-slim; low | Actions/content reads and engine/token verification. |
| Merge Steward Diagnosis / `agent` | Exception-only investigator; ubuntu-latest; scarce | Read permissions for Actions, checks, content, issues and PRs; Copilot/GitHub tokens; no PR code execution. |
| Merge Steward Diagnosis / `detection` | Output threat detection; ubuntu-latest; scarce | `contents:read` plus Copilot token. |
| Merge Steward Diagnosis / `safe_outputs` | Staged output processing; ubuntu-slim; low | Empty workflow permissions; proposed comments and labels are staged, not published. |
| Merge Steward Diagnosis / `conclusion` | Usage bookkeeping and reporting; ubuntu-slim; low | `actions:write` for usage cache/artifacts. Automatic failure, missing-tool and incomplete-work issues are disabled; no content/issues/PR write scope. |

The explicit `jobs.safe_outputs` overrides in `autoloop.md` and `goal.md` are
classified separately in policy. They require successful agent execution and
successful threat detection before publication. Pinned framework handlers
process proposed JSON and patches; they do not execute checked-out PR scripts,
tests or installers. These are independent publication jobs, not merge evidence
or Steward-dispatchable workers; their `post-merge` policy phase excludes them
from PR-readiness scheduling, not from their own scheduled/manual triggers.

For these two publishers, the built-in token has only content, issue and PR
write scopes. `GH_AW_GITHUB_TOKEN` falls back to `GITHUB_TOKEN` for checkout,
persisted git credentials and API writes; additional ref fetching prefers
`GH_AW_GITHUB_MCP_SERVER_TOKEN`. `GH_AW_CI_TRIGGER_TOKEN` may use a configured
PAT or GitHub App credential to trigger normal CI with an extra empty commit;
it does not add a workflow-dispatch or merge handler. `GH_AW_DEFAULT_OTLP_HEADERS` is
inherited for optional telemetry. Custom-token scopes cannot be inferred from
these job permissions. Neither publisher receives `COPILOT_GITHUB_TOKEN`.
These declarations record existing privileges; they grant no new capability.
New or unclassified source jobs still require maintainer review.

Source timeout budgets are 45 minutes for Autoloop, 60 minutes for Goal and
Evergreen, and 10 minutes for CI Doctor and Steward Diagnosis. Actual duration
and separate detection cost vary. Shared named secrets
include `COPILOT_GITHUB_TOKEN`, `GH_AW_GITHUB_MCP_SERVER_TOKEN`, and
`GH_AW_GITHUB_TOKEN`. Generated workflows also reference optional
`GH_AW_DEFAULT_OTLP_HEADERS` for configured telemetry. Secret names identify
capabilities only; values were not read during this audit. No protected human
approval environment is declared for the agent jobs.

## Evidence and activation observations

- PR #461 had both PR and push CI runs for the same head. The PR run was
  `34519615075`, path `.github/workflows/ci.yml`; its `head_sha` matched the PR
  head and its pull-request association included the head and `main` base.
  Its synthetic merge commit was a different SHA. Check names alone cannot
  establish which workflow, candidate or run produced evidence.
- PR #363 had failed test/browser jobs and a skipped dependent build. A skipped
  or neutral required job is not successful evidence for these four claims.
- PR #461 was a draft; PR #482 targeted an Autoloop branch. Both must remain
  ineligible regardless of historical check success.
- CI workflow definitions are contributor-editable on PRs. Workflow identity,
  trusted definition provenance, current head association and job conclusions
  all matter before a privileged merge handoff.
- GitHub's current `EnablePullRequestAutoMergeInput` supports `expectedHeadOid`.
  The native CLI's `--auto --match-head-commit` passes the head guard; for an
  immediately mergeable PR it performs GitHub's guarded merge operation.
  Native repository rules remain authoritative; no bypass or branch-protection
  change is part of this inventory.

Sources: live repository settings, main branch protection/effective rules,
`github-pages` environment API, run `34519615075` jobs, Pages runs
`35192489621`, `33716442496`, `32743956327`, and current workflow source/lock
files. API behavior was checked against live GraphQL schema introspection and
the [GitHub CLI merge implementation](https://github.com/cli/cli/tree/trunk/pkg/cmd/pr/merge).
