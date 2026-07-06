---
description: Store semantic attempt state and failure signatures for future passes.
---

## skill: `attempt-memory-writer`

Write structured, source-aware, non-sensitive memory for the PR pass: semantic
head key, raw head SHA, failure signatures, selected skills, deterministic
commands run, side-effect verification status, comment IDs, and the next action.

Ignore empty CI-trigger commits when updating semantic attempt counters. Store
only facts that influence future behavior, not a log of the past.
