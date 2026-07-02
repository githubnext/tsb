---
description: Decide whether the PR is ready, blocked, or needs another loop.
---

## skill: `merge-gate-reporter`

Evaluate draft state, CI on the current head SHA, merge conflicts, required
reviews, unresolved threads, required/blocker labels, and any docs/release
requirements.

Produce a concise gate table and a single final state: ready, blocked,
human-needed, or continue. Base the state on evidence, never on intention.
