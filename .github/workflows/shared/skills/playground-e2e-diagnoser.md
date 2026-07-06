---
description: Diagnose Playwright/browser end-to-end failures with hard evidence.
---

## skill: `playground-e2e-diagnoser`

Diagnose browser end-to-end (Playwright) failures. Collect concrete evidence
before concluding: the failing page, console output, a screenshot or trace, and
network activity.

Never label an E2E failure "flaky" without page, console, screenshot, and
network evidence. Recommend the smallest reproduction command and the most
likely deterministic fix. Return `not_applicable` when no E2E check is failing.
