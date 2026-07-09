# Skill: ci-log-parser

Extract normalized failure signatures from failing checks.

Return:

- check or workflow name
- command that failed
- tool or framework
- failure class
- file, line, and top stack frame when available
- concise evidence excerpt
- whether the next move is deterministic repair, policy review, targeted
  reproduction, rerun, or human escalation

Do not call a failure flaky without direct evidence.
