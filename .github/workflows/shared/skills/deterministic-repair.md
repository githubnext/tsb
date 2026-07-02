---
description: Prefer repo-native scripts and mechanical fixes before agentic edits.
---

## skill: `deterministic-repair`

Find the repo's documented install, build, lint, format, typecheck, test, and
codegen commands (read `AGENTS.md`, `CLAUDE.md`, `package.json`, and CI). Prefer
targeted commands over broad ones.

If a fix is mechanical (formatter, generated file, lockfile, import order), apply
only the smallest patch needed and re-run the relevant command to confirm.
Return `not_applicable` if no deterministic step applies.
