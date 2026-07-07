# Evergreen Session Notes

## Session: Fix CI failures on PR #363 and PR #369

### Status: COMPLETE (both pushes succeeded)

### PR #363 (autoloop/build-tsb-pandas-typescript-migration)
Fixed commit pushed: "fix: repair CI failures for kalman types, acf_pacf Series ctor, scipy, orc E2E"

Fixes:
- src/stats/kalman.ts: MutMat[][] → MutMat[] (filtCovs, predCovs, innovCovs, smoothCovs, gains)
- tests/stats/kalman.test.ts: as [number][][] → as number[][] (8 occurrences)
- tests/stats/acf_pacf.test.ts: new Series([...]) → new Series({data:[...]}) (2 occurrences)
- .github/workflows/ci.yml: added scipy==1.14.1 to validate-python-examples pip install
- tests-e2e/playground-cells.test.ts: added "orc.html" to NON_PLAYGROUND_PAGES set

### PR #369 (goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions)
Fixed commit pushed: "fix: resolve noUncheckedIndexedAccess errors in radix sort (series.ts)"

Fixes in src/core/series.ts radix sort section:
- fvalsU32[fsi] / fvalsU32[fsi+1]: added ?? 0
- _rxHisto histogram accumulation (8 lines): (_rxHisto[idx] ?? 0) + 1
- _rxHisto prefix-sum read: ?? 0
- srcBuf[si+keyOff], _rxHisto[histoBase+bucket], dstBuf writes: ?? 0
- srcBuf[si/si+1/si+2] in all 4 output reconstruction loops: ?? 0
- finSlice[i] and nanBuf[i] in fallback output loops: ?? 0

### Key Lesson
push_to_pull_request_branch requires local branch name = remote branch name.
Create local branch with same name as the PR's remote branch before calling tool.
