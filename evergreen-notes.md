# Evergreen Session Notes

## Session: Fix CI failures on PR #363 (2026-07-08)

### Status: COMPLETE (push succeeded)

### PR #363 (autoloop/build-tsb-pandas-typescript-migration)
Fixed commit pushed: "fix: repair CI failures — kalman MutMat types, acf_pacf Series ctor, scipy, orc E2E"

Fixes:
- src/stats/kalman.ts: MutMat[][] → MutMat[] (filtCovs, predCovs, innovCovs, smoothCovs, gains)
- tests/stats/kalman.test.ts: removed `as [number][][]` casts (8 occurrences) — plain `number[][]` inference
- tests/stats/acf_pacf.test.ts: new Series([...]) → new Series({data:[...]}) (2 occurrences)
- .github/workflows/ci.yml: added scipy==1.14.1 to validate-python-examples pip install
- tests-e2e/playground-cells.test.ts: added "orc.html" to NON_PLAYGROUND_PAGES set

### Root causes
1. Test & Lint: kalman.ts had MutMat[][] (4D) where MutMat[] (3D) was expected; test had invalid as-casts
2. Validate Python Examples: signal.html/filters.html use scipy.signal but scipy wasn't installed
3. Playground E2E: orc.html has no .playground-run buttons → waitForFunction timeout

### Key Lesson
push_to_pull_request_branch requires local branch name = remote branch name.
Create local branch with same name as the PR's remote branch before calling tool.
