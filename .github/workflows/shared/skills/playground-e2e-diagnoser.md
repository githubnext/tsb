# Skill: playground-e2e-diagnoser

Use this when Playwright, browser, playground, or visual behavior blocks mergeability.

Collect:
- failing test name and trace/artifact links
- browser console errors
- network failures
- screenshots when available
- whether the failure reproduces with `bun run test:e2e`

Do not call a failure flaky without evidence from a rerun or a known memory signature.
