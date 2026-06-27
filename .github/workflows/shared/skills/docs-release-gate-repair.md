# Skill: docs-release-gate-repair

Use this when docs, examples, golden snapshots, or generated documentation block mergeability.

Respect repository rules:
- Do not edit `README.md` unless the PR explicitly requires it and a human confirms.
- Keep docs changes tied to a failing gate or explicit blocker.
- For playground examples, validate Python snippets with `python scripts/validate-python-examples.py playground/`.
