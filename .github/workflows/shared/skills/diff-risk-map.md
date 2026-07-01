---
description: Route a PR to the right specialist skills based on changed files.
---

## skill: `diff-risk-map`

Classify changed files by risk: tests only, docs only, frontend, backend, public
API, data migration, auth/security, dependency, CI/infrastructure,
agent/workflow, or architecture.

Recommend the conditional skills the evidence calls for and explain the trigger
for each recommendation. Return `not_applicable` if there is no diff to classify.
