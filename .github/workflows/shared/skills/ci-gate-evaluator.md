---
description: Explain failing, pending, stale, skipped, or missing CI gates.
---

## skill: `ci-gate-evaluator`

Inspect check runs and workflow runs for the current head SHA. Distinguish
deterministic failures from flakes, environment failures, missing CI caused by
bot-authored commits, and failures caused by the PR itself.

Recommend the smallest next action for each gate. Never recommend rerunning a
green check. Return `not_applicable` if there are no checks to evaluate.
