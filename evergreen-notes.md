# Evergreen Session Notes

## Session: Fix CI failures on PR #363 (2026-07-09)

### Status: COMPLETE (push succeeded)

### PR #363 (autoloop/build-tsb-pandas-typescript-migration)
Fixed commit pushed: "fix: resolve CI failures — kalman/ets types, acf_pacf Series ctor, scipy, orc E2E"
Commit: 224c37c

Fixes applied:
- src/stats/kalman.ts: MutMat[][] → MutMat[] (filtCovs, predCovs, innovCovs, smoothCovs, gains); ci[j] = (ci[j] ?? 0) + ... (noUncheckedIndexedAccess at line 83)
- src/stats/ets.ts: import type {Series} → import {Series}; Array.isArray → instanceof Series in toArr() (Array.prototype.values ambiguity)
- tests/stats/acf_pacf.test.ts: new Series([...]) → new Series({data:[...]}) (lines 71, 318)
- tests/stats/kalman.test.ts: removed 8 'as [number][][]' casts
- .github/workflows/ci.yml: added scipy==1.14.1 to validate-python-examples pip install
- tests-e2e/playground-cells.test.ts: added orc.html to NON_PLAYGROUND_PAGES

### Root causes
1. Test & Lint/tsc: kalman.ts had MutMat[][] (4D) where MutMat[] (3D) was needed; ci[j] noUncheckedIndexedAccess; ets.ts toArr() returned Array.prototype.values (method) instead of Series.values (getter) in false branch of Array.isArray; acf_pacf test + kalman test had invalid type casts
2. Validate Python Examples: scipy not installed; signal.html/filters.html use scipy.signal
3. Playground E2E: orc.html uses onclick buttons (not .playground-run) → waitForFunction timeout

### PR #361 (autoloop/perf-comparison)
- All CI gates passing, mergeable_state: clean
- Added evergreen-ready label

### Key Lesson
Always get full tsc error log (not just tail 100 lines). Use 300+ lines to see all errors including early-file errors (ets.ts comes before kalman.ts alphabetically).
