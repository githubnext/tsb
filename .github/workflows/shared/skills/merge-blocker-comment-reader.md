---
description: Read human comments only for merge-blocking signals.
---

## skill: `merge-blocker-comment-reader`

Read requested changes, unresolved review threads, and recent PR discussion only
to identify actual merge blockers or configured gates.

Ignore non-blocking suggestions and general code-review commentary. Return the
list of concrete merge blockers with the comment IDs that establish them, or
`not_applicable` if there are none.
