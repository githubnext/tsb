# Skill: repo-memory-reader

Load durable repository knowledge before making a repair plan.

Read relevant files under `/tmp/gh-aw/repo-memory/evergreen/` if they exist:
- `gates.json`
- `labels.json`
- `ci-signatures.jsonl`
- `review-patterns.jsonl`
- `skill-outcomes.jsonl`
- `velocity.jsonl`

Summarize only knowledge that applies to the current PR. Treat current GitHub state and the installed repo policy as more authoritative than memory when they disagree. Do not copy large memory files into comments.
