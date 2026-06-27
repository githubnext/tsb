# Skill: ci-log-parser

Extract normalized failure signatures from failing CI logs.

For each failing check, capture:
- check name and workflow name
- failing command or step
- failure class: typecheck, lint, unit test, cross-validation, golden snapshot, e2e, build, dependency install, infrastructure, timeout, or unknown
- relevant file, line, test name, or stack frame when present
- whether the next move is deterministic repair, targeted reproduction, rerun, or human escalation

Keep signatures compact enough to store in `ci-signatures.jsonl`.
