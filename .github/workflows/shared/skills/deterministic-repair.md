# Skill: deterministic-repair

Prefer repo-native deterministic work before agentic edits.

Use the installed repo policy and discovered scripts. For this repository, prefer:
- `bun run typecheck`
- `bun run lint`
- `bun test ./tests/`
- `bun run test:e2e`
- `bun run build`
- `python scripts/validate-python-examples.py playground/`
- `python golden/generate.py` followed by `git diff --exit-code -- golden/snapshots`

Run targeted commands first when a failure points to a specific area. Apply the smallest patch that can make the gate pass.
