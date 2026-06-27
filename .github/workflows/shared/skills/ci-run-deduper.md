# Skill: ci-run-deduper

Collapse duplicate check runs into logical merge gates.

Group check runs by:
- PR head SHA
- workflow name
- job/check name
- conclusion and status

Treat duplicate `push` and `pull_request` runs for the same head as one logical gate unless their conclusions disagree. Ignore stale check runs from older SHAs. Return the logical gate list and the raw run IDs used as evidence.
