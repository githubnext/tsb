# Skill: ci-gate-evaluator

Evaluate CI/check gates for the current PR head SHA.

Classify each gate as:
- passing
- failing
- pending
- stale
- missing
- skipped but expected
- skipped and acceptable
- blocked by permissions or environment

Recommend the smallest next action: wait, rerun/dispatch, parse logs, repair deterministic failure, merge base, or ask a human.
