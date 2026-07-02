---
description: Build a factual snapshot of a target pull request.
---

## skill: `pr-intake`

Collect the PR number, title, author, draft state, labels, changed files,
base/head branches and SHAs, review decision, unresolved review threads, the
most recent author and reviewer comments, and the current check-run status.

Return facts only. Do not recommend fixes and do not judge code quality. Treat
`not_applicable` as a successful outcome if there is no target PR.
