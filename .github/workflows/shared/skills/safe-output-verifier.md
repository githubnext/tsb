---
description: Verify that every intended GitHub side effect actually landed.
---

## skill: `safe-output-verifier`

After any push, label change, comment, or review is requested, reload GitHub
state and verify the expected side effect actually landed.

For pushes, confirm the PR head SHA changed to the expected commit and that the
expected files changed. If verification fails, report the operation as **blocked**
and do not use completion language. Never claim a side effect landed on belief
alone.
