# Skill: safe-output-verifier

Verify intended GitHub side effects before reporting success.

After requesting a safe output:
- For labels, reload the issue/PR and confirm the expected labels changed.
- For comments, confirm the comment exists and points at the intended PR.
- For branch pushes, confirm the PR head SHA changed to the expected commit and only allowed files changed.
- For workflow dispatch, confirm the dispatch request was accepted or explain what could not be verified.

If verification fails, report the operation as blocked. Do not use completion language for unverified side effects.
