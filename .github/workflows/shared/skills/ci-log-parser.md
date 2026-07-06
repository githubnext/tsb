---
description: Extract normalized failure signatures from check logs.
---

## skill: `ci-log-parser`

Read failing check logs and return structured signatures: check name, tool,
failure class, file, line, top stack frame, and the failing command.

For each signature, state whether the next move is deterministic repair, policy
review, targeted test reproduction, rerun, or human escalation. Return
`not_applicable` if there are no failing logs to parse.
