# Merge Steward policy

This policy was accepted on 2026-09-03 from the workflows and repository rules on
the trusted `main` branch.

## Readiness

A pull request is ready when it is not a draft and fresh evidence for its exact
head SHA has succeeded for:

- `Test & Lint`
- `Playground E2E (Playwright)`
- `Build`
- `Validate Python Examples`

The repository currently requires neither approvals nor resolved review threads,
and has no branch protection or rulesets. Merge Steward records the four checks
as policy requirements without adding a synthetic required status check.

## Boundaries

- Operation starts in `observe` mode. The reconciler writes plans only to its
  workflow summary.
- Existing CI remains authoritative and continues to run on every PR change.
  No selective workflow adapter is installed.
- OpenEvolve is advisory and branch-conditional. Copilot setup is advisory.
- Pages build and deployment are post-merge only and never Steward-dispatched.
- Autoloop, Goal, Evergreen, and CI Doctor remain independent automation.
  Steward never dispatches them. Evergreen keeps its existing opt-in behavior.
- Diagnosis is limited to exhausted deterministic handling, unknown blocking
  failures, and maintainer-asserted policy ambiguity for the current head. Its
  safe outputs are staged and its agent job is read-only.
- Routine green, waiting, stale, duplicate, and already-reported states never
  invoke a model or post a comment.

## Native auto-merge

Native GitHub auto-merge with squash is accepted as the eventual handoff after
all readiness evidence is fresh. It is not live during observation. Before any
future handoff, the deterministic reconciler must reload policy from the default
branch, recheck the PR head and readiness, and rely on GitHub's native policy
enforcement. It never force-pushes or lets the diagnosis agent merge.

The machine-readable source of truth is `.github/merge-steward.yml`.
