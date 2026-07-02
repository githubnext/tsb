---
description: Load and summarize durable repository knowledge for this PR pass.
---

## skill: `repo-memory-reader`

Read available repo-memory files for merge gates, label meanings, CI failure
signatures, known flaky checks, accepted prior fixes, review patterns, and
velocity metrics. Return only the memory relevant to the current PR, with the
source filename for each fact.

Ignore stale or contradictory memory when current GitHub state disagrees; prefer
live GitHub state. Return `not_applicable` if no memory exists yet.
