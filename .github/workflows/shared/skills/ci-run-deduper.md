---
description: Collapse duplicate check runs into logical merge gates.
---

## skill: `ci-run-deduper`

Group check runs by head SHA, workflow name, job name, and conclusion. Treat
duplicate `push` and `pull_request` runs for the same head SHA as a single
logical gate unless their conclusions disagree.

Return the logical gate list plus the raw run IDs used as evidence. Consider only
the current head SHA; ignore runs from older SHAs.
