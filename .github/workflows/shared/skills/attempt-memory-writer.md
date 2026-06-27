# Skill: attempt-memory-writer

Store semantic attempt state without turning memory into a run log.

Write small structured entries under `/tmp/gh-aw/repo-memory/evergreen/`:
- `ci-signatures.jsonl` for reusable failure signatures and outcomes.
- `skill-outcomes.jsonl` for selected skills and whether they helped.
- `review-patterns.jsonl` for repeated merge-blocking human feedback.
- `velocity.jsonl` for label-to-action, label-to-green, and label-to-ready timing.

Do not count empty CI trigger commits as semantic repair attempts. Preserve enough source identifiers to audit the memory later.
